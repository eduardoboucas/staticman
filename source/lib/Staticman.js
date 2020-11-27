import akismetApi from 'akismet';
import Mailgun from 'mailgun-js';
import markdownTable from 'markdown-table';
import moment from 'moment';
import NodeRSA from 'node-rsa';
import objectPath from 'object-path';
import slugify from 'slug';
import uuidv1 from 'uuid/v1';
import yaml from 'js-yaml';

import config from '../config';
import errorHandler from './ErrorHandler';
import gitFactory from './GitServiceFactory';
import * as RSA from './RSA';
import SiteConfig from '../siteConfig';
import SubscriptionsManager from './SubscriptionsManager';
import * as Transforms from './Transforms';

export default class Staticman {
  constructor(parameters) {
    return (async () => {
      this.parameters = parameters;

      const { branch, repository, service, username, version } = parameters;

      // Initialise the Git service API
      this.git = await gitFactory(service, {
        branch,
        repository,
        username,
        version,
      });

      // Generate unique id
      this.uid = uuidv1();

      this.rsa = new NodeRSA();
      this.rsa.importKey(config.get('rsaPrivateKey'), 'private');

      return this;
    })();
  }

  _applyInternalFields(data) {
    const internalFields = {
      _id: this.uid,
    };

    // Inject parent, if present
    if (this.options.parent) {
      internalFields._parent = this.options.parent;
    }

    return Object.assign(internalFields, data);
  }

  _applyGeneratedFields(data) {
    const siteConfigFields = data;
    const generatedFields = this.siteConfig.get('generatedFields');

    if (!generatedFields) return siteConfigFields;

    Object.keys(generatedFields).forEach((field) => {
      const generatedField = generatedFields[field];

      if (typeof generatedField === 'object' && !(generatedField instanceof Array)) {
        const options = generatedField.options || {};

        switch (generatedField.type) {
          case 'date':
            siteConfigFields[field] = Staticman._createDate(options);

            break;

          // TODO: Remove 'github' when v2 API is no longer supported
          case 'github':
          case 'user':
            if (this.gitUser && typeof options.property === 'string') {
              siteConfigFields[field] = objectPath.get(this.gitUser, options.property);
            }

            break;

          case 'slugify':
            if (
              typeof options.field === 'string' &&
              typeof siteConfigFields[options.field] === 'string'
            ) {
              siteConfigFields[field] = slugify(siteConfigFields[options.field]).toLowerCase();
            }

            break;

          default:
            console.log('No match for generated field');
        }
      } else {
        siteConfigFields[field] = generatedField;
      }
    });

    return siteConfigFields;
  }

  _applyTransforms(fields) {
    const transformedFields = fields;
    const transforms = this.siteConfig.get('transforms');

    if (!transforms) return Promise.resolve(fields);

    // This doesn't serve any purpose for now, but we might want to have
    // asynchronous transforms in the future.
    const queue = [];

    Object.keys(transforms).forEach((field) => {
      if (!fields[field]) return;

      const transformNames = [].concat(transforms[field]);

      transformNames.forEach((transformName) => {
        const transformFn = Transforms[transformName];

        if (transformFn) {
          transformedFields[field] = transformFn(transformedFields[field]);
        }
      });
    });

    return Promise.all(queue).then(() => {
      return transformedFields;
    });
  }

  _checkForSpam(fields) {
    if (!this.siteConfig.get('akismet.enabled')) return Promise.resolve(fields);

    return new Promise((resolve, reject) => {
      const akismet = akismetApi.client({
        apiKey: config.get('akismet.apiKey'),
        blog: config.get('akismet.site'),
      });

      akismet.checkSpam(
        {
          user_ip: this.ip,
          user_agent: this.userAgent,
          comment_type: this.siteConfig.get('akismet.type'),
          comment_author: fields[this.siteConfig.get('akismet.author')],
          comment_author_email: fields[this.siteConfig.get('akismet.authorEmail')],
          comment_author_url: fields[this.siteConfig.get('akismet.authorUrl')],
          comment_content: fields[this.siteConfig.get('akismet.content')],
        },
        (err, isSpam) => {
          if (err) return reject(err);

          if (isSpam) return reject(errorHandler('IS_SPAM'));

          return resolve(fields);
        }
      );
    });
  }

  async _checkAuth() {
    // TODO: Remove when v2 API is no longer supported
    if (this.parameters.version === '2') {
      return this._checkAuthV2();
    }

    if (!this.siteConfig.get('auth.required')) {
      return Promise.resolve(false);
    }

    if (!this.options['auth-token']) {
      return Promise.reject(errorHandler('AUTH_TOKEN_MISSING'));
    }

    const oauthToken = RSA.decrypt(this.options['auth-token']);

    if (!oauthToken) {
      return Promise.reject(errorHandler('AUTH_TOKEN_INVALID'));
    }

    const git = await gitFactory(this.options['auth-type'], {
      oauthToken,
      version: this.parameters.version,
    });

    return git.getCurrentUser().then((user) => {
      this.gitUser = user;

      return true;
    });
  }

  async _checkAuthV2() {
    if (!this.siteConfig.get('githubAuth.required')) {
      return Promise.resolve(false);
    }

    if (!this.options['github-token']) {
      return Promise.reject(errorHandler('GITHUB_AUTH_TOKEN_MISSING'));
    }

    const oauthToken = RSA.decrypt(this.options['github-token']);

    if (!oauthToken) {
      return Promise.reject(errorHandler('GITHUB_AUTH_TOKEN_INVALID'));
    }

    const git = await gitFactory('github', {
      oauthToken,
      version: this.parameters.version,
    });

    return git.api.users.getAuthenticated({}).then(({ data }) => {
      this.gitUser = data;

      return true;
    });
  }

  static _createDate(dateOptions) {
    const date = new Date();

    switch (dateOptions?.format) {
      case 'timestamp':
        return date.getTime();

      case 'timestamp-seconds':
        return Math.floor(date.getTime() / 1000);

      case 'iso8601':
      default:
        return date.toISOString();
    }
  }

  _createFile(fields) {
    return new Promise((resolve, reject) => {
      switch (this.siteConfig.get('format').toLowerCase()) {
        case 'json':
          return resolve(JSON.stringify(fields));

        case 'yaml':
        case 'yml':
          try {
            const output = yaml.safeDump(fields);

            return resolve(output);
          } catch (err) {
            return reject(err);
          }

        case 'frontmatter':
          try {
            const output = this._generateFrontmatterOutput(fields);
            return resolve(output);
          } catch (err) {
            return reject(err);
          }

        default:
          return reject(errorHandler('INVALID_FORMAT'));
      }
    });
  }

  _generateFrontmatterOutput(fields) {
    const transforms = this.siteConfig.get('transforms');

    const contentField =
      transforms &&
      Object.keys(transforms).find((field) => {
        return transforms[field] === 'frontmatterContent';
      });

    if (!contentField) {
      throw errorHandler('NO_FRONTMATTER_CONTENT_TRANSFORM');
    }

    const content = fields[contentField];
    const attributeFields = { ...fields };

    delete attributeFields[contentField];

    return `---\n${yaml.safeDump(attributeFields)}---\n${content}\n`;
  }

  _generateReviewBody(fields) {
    const table = [['Field', 'Content']];

    Object.keys(fields).forEach((field) => {
      table.push([field, fields[field]]);
    });

    let message = this.siteConfig.get('pullRequestBody') + markdownTable(table);

    if (this.siteConfig.get('notifications.enabled')) {
      const notificationsPayload = {
        configPath: this.configPath,
        fields,
        options: this.options,
        parameters: this.parameters,
      };

      message += `\n\n<!--staticman_notification:${JSON.stringify(notificationsPayload)}-->`;
    }

    return message;
  }

  _getNewFilePath(data) {
    const configFilename = this.siteConfig.get('filename');
    const filename = configFilename?.length
      ? this._resolvePlaceholders(configFilename, {
          fields: data,
          options: this.options,
        })
      : this.uid;

    let path = this._resolvePlaceholders(this.siteConfig.get('path'), {
      fields: data,
      options: this.options,
    });

    // Remove trailing slash, if existing
    if (path.slice(-1) === '/') {
      path = path.slice(0, -1);
    }

    const extension = this.siteConfig.get('extension').length
      ? this.siteConfig.get('extension')
      : Staticman._getExtensionForFormat(this.siteConfig.get('format'));

    return `${path}/${filename}.${extension}`;
  }

  static _getExtensionForFormat(format) {
    switch (format.toLowerCase()) {
      case 'json':
        return 'json';

      case 'yaml':
      case 'yml':
        return 'yml';

      case 'frontmatter':
        return 'md';

      default:
        throw Error('File format could not be identified.');
    }
  }

  _initialiseSubscriptions() {
    if (!this.siteConfig.get('notifications.enabled')) return null;

    // Initialise Mailgun
    const mailgun = Mailgun({
      apiKey: this.siteConfig.get('notifications.apiKey') || config.get('email.apiKey'),
      domain: this.siteConfig.get('notifications.domain') || config.get('email.domain'),
    });

    // Initialise SubscriptionsManager
    const subscriptions = new SubscriptionsManager(this.parameters, this.git, mailgun);

    return subscriptions;
  }

  _resolvePlaceholders(subject, baseObject) {
    let completedSubject = subject;
    const matches = completedSubject.match(/{(.*?)}/g);

    if (!matches) return completedSubject;

    matches.forEach((match) => {
      const escapedMatch = match.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
      const property = match.slice(1, -1);
      const timeIdentifier = '@date:';

      let newText;

      switch (property) {
        case '@timestamp':
          newText = new Date().getTime();

          break;

        case '@id':
          newText = this.uid;

          break;

        default:
          if (property.indexOf(timeIdentifier) === 0) {
            const timePattern = property.slice(timeIdentifier.length);

            newText = moment().format(timePattern);
          } else {
            newText = objectPath.get(baseObject, property) || '';
          }
      }

      completedSubject = completedSubject.replace(new RegExp(escapedMatch, 'g'), newText);
    });

    return completedSubject;
  }

  _validateConfig(siteConfig) {
    if (!siteConfig) {
      return errorHandler('MISSING_CONFIG_BLOCK');
    }

    const requiredFields = ['allowedFields', 'branch', 'format', 'path'];

    const missingFields = [];

    // Checking for missing required fields
    requiredFields.forEach((requiredField) => {
      if (objectPath.get(siteConfig, requiredField) === undefined) {
        missingFields.push(requiredField);
      }
    });

    if (missingFields.length) {
      return errorHandler('MISSING_CONFIG_FIELDS', {
        data: missingFields,
      });
    }

    this.siteConfig = SiteConfig(siteConfig, this.rsa);

    return null;
  }

  _validateFields(fields) {
    const validatedConfigFields = fields;
    const missingRequiredFields = [];
    const invalidFields = [];

    Object.keys(validatedConfigFields).forEach((field) => {
      // Check for any invalid fields
      if (
        this.siteConfig.get('allowedFields').indexOf(field) === -1 &&
        validatedConfigFields[field] !== ''
      ) {
        invalidFields.push(field);
      }

      // Trim fields
      if (typeof validatedConfigFields[field] === 'string') {
        validatedConfigFields[field] = validatedConfigFields[field].trim();
      }
    });

    // Check for missing required fields
    this.siteConfig.get('requiredFields').forEach((field) => {
      if (!validatedConfigFields[field]) {
        missingRequiredFields.push(field);
      }
    });

    if (missingRequiredFields.length) {
      return errorHandler('MISSING_REQUIRED_FIELDS', {
        data: missingRequiredFields,
      });
    }

    if (invalidFields.length) {
      return errorHandler('INVALID_FIELDS', {
        data: invalidFields,
      });
    }

    return null;
  }

  decrypt(encrypted) {
    return this.rsa.decrypt(encrypted, 'utf8');
  }

  getParameters() {
    return this.parameters;
  }

  getSiteConfig(force) {
    if (this.siteConfig && !force) return Promise.resolve(this.siteConfig);

    if (!this.configPath) return Promise.reject(errorHandler('NO_CONFIG_PATH'));

    return this.git.readFile(this.configPath.file).then((data) => {
      const siteConfig = objectPath.get(data, this.configPath.path);
      const validationErrors = this._validateConfig(siteConfig);

      if (validationErrors) {
        return Promise.reject(validationErrors);
      }

      if (siteConfig.branch !== this.parameters.branch) {
        return Promise.reject(errorHandler('BRANCH_MISMATCH'));
      }

      return this.siteConfig;
    });
  }

  processEntry(fields, options) {
    this.fields = { ...fields };
    this.options = { ...options };

    return this.getSiteConfig()
      .then(() => {
        return this._checkAuth();
      })
      .then(() => {
        return this._checkForSpam(fields);
      })
      .then((siteConfigFields) => {
        let transformedFields = siteConfigFields;
        // Validate fields
        const fieldErrors = this._validateFields(transformedFields);

        if (fieldErrors) return Promise.reject(fieldErrors);

        // Add generated fields
        transformedFields = this._applyGeneratedFields(transformedFields);

        // Apply transforms
        return this._applyTransforms(transformedFields);
      })
      .then((transformedFields) => {
        return this._applyInternalFields(transformedFields);
      })
      .then((extendedFields) => {
        // Create file
        return this._createFile(extendedFields);
      })
      .then((data) => {
        const filePath = this._getNewFilePath(fields);
        const subscriptions = this._initialiseSubscriptions();
        const commitMessage = this._resolvePlaceholders(this.siteConfig.get('commitMessage'), {
          fields,
          options,
        });

        // Subscribe user, if applicable
        if (
          subscriptions &&
          options.parent &&
          options.subscribe &&
          this.fields[options.subscribe]
        ) {
          subscriptions.set(options.parent, this.fields[options.subscribe]).catch((err) => {
            console.log(err.stack || err);
          });
        }

        if (this.siteConfig.get('moderation')) {
          const newBranch = `staticman_${this.uid}`;

          return this.git.writeFileAndSendReview(
            filePath,
            data,
            newBranch,
            commitMessage,
            this._generateReviewBody(fields)
          );
        }
        if (subscriptions && options.parent) {
          subscriptions.send(options.parent, fields, options, this.siteConfig);
        }

        return this.git.writeFile(filePath, data, this.parameters.branch, commitMessage);
      })
      .then(() => {
        return {
          fields,
          redirect: options.redirect ? options.redirect : false,
        };
      })
      .catch((err) => {
        return Promise.reject(
          errorHandler('ERROR_PROCESSING_ENTRY', {
            err,
            instance: this,
          })
        );
      });
  }

  processMerge(fields, options) {
    this.fields = { ...fields };
    this.options = { ...options };

    return this.getSiteConfig()
      .then(() => {
        const subscriptions = this._initialiseSubscriptions();

        return subscriptions.send(options.parent, fields, options, this.siteConfig);
      })
      .catch((err) => {
        return Promise.reject(
          errorHandler('ERROR_PROCESSING_MERGE', {
            err,
            instance: this,
          })
        );
      });
  }

  setConfigPath(configPath) {
    // Default config path
    if (!configPath) {
      if (this.parameters.version === '1') {
        this.configPath = {
          file: '_config.yml',
          path: 'staticman',
        };
      } else {
        this.configPath = {
          file: 'staticman.yml',
          path: this.parameters.property || '',
        };
      }

      return;
    }

    this.configPath = configPath;
  }

  setIp(ip) {
    this.ip = ip;
  }

  setUserAgent(userAgent) {
    this.userAgent = userAgent;
  }
}
