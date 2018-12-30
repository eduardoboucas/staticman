'use strict'

const akismetApi = require('akismet')
const config = require('../config')
const errorHandler = require('./ErrorHandler')
const gitFactory = require('./GitServiceFactory')
const markdownTable = require('markdown-table')
const moment = require('moment')
const Mailgun = require('mailgun-js')
const NodeRSA = require('node-rsa')
const objectPath = require('object-path')
const RSA = require('./RSA')
const SiteConfig = require('../siteConfig')
const slugify = require('slug')
const SubscriptionsManager = require('./SubscriptionsManager')
const Transforms = require('./Transforms')
const uuidv1 = require('uuid/v1')
const yaml = require('js-yaml')

class Staticman {
  static get SUBJECT_REGEX () { return /{(.*?)}/g }
  static get ESCAPED_MATCH_REGEX () { return /[-[\]/{}()*+?.\\^$|]/g }
  static get requiredFields () {
    return [
      'allowedFields',
      'branch',
      'format',
      'path'
    ]
  }

  constructor (parameters) {
    this.parameters = parameters

    const token = parameters.service === 'gitlab'
      ? config.get('gitlabToken')
      : config.get('githubToken')

    // Initialise the Git service API
    this.git = gitFactory.create(parameters.service, {
      username: parameters.username,
      repository: parameters.repository,
      branch: parameters.branch,
      token
    })

    // Generate unique id
    this.uid = uuidv1()

    this.rsa = new NodeRSA()
    this.rsa.importKey(config.get('rsaPrivateKey'))

    this._transforms = Transforms
  }

  _applyInternalFields (data) {
    let internalFields = {
      _id: this.uid
    }

    // Inject parent, if present
    if (this.options.parent) {
      internalFields._parent = this.options.parent
    }

    return { ...internalFields, ...data }
  }

  _applyGeneratedFields (data) {
    const generatedFields = this.siteConfig.get('generatedFields')

    if (!generatedFields) return data

    Object.keys(generatedFields).forEach(field => {
      const generatedField = generatedFields[field]

      if ((typeof generatedField === 'object') && (!(generatedField instanceof Array))) {
        const options = generatedField.options || {}

        switch (generatedField.type) {
          case 'date':
            data[field] = this._createDate(options)

            break

          // TODO: Remove 'github' when v2 API is no longer supported
          case 'github':
          case 'user':
            if (this.gitUser && typeof options.property === 'string') {
              data[field] = objectPath.get(this.gitUser, options.property)
            }

            break

          case 'slugify':
            if (
              typeof options.field === 'string' &&
              typeof data[options.field] === 'string'
            ) {
              data[field] = slugify(data[options.field]).toLowerCase()
            }

            break
        }
      } else {
        data[field] = generatedField
      }
    })

    return data
  }

  async _applyTransforms (fields) {
    const transforms = this.siteConfig.get('transforms')

    if (!transforms) return fields

    // This doesn't serve any purpose for now, but we might want to have
    // asynchronous transforms in the future.
    let queue = []

    Object.keys(transforms).forEach(field => {
      if (!fields[field]) return

      let transformNames = [].concat(transforms[field])

      transformNames.forEach(transformName => {
        let transformFn = this._transforms[transformName]
        if (transformFn) {
          fields[field] = transformFn(fields[field])
        }
      })
    })

    return Promise.all(queue).then((results) => {
      return fields
    })
  }

  _checkForSpam (fields) {
    if (!this.siteConfig.get('akismet.enabled')) return Promise.resolve(fields)

    return new Promise((resolve, reject) => {
      const akismet = akismetApi.client({
        apiKey: config.get('akismet.apiKey'),
        blog: config.get('akismet.site')
      })

      akismet.checkSpam({
        user_ip: this.ip,
        user_agent: this.userAgent,
        comment_type: this.siteConfig.get('akismet.type'),
        comment_author: fields[this.siteConfig.get('akismet.author')],
        comment_author_email: fields[this.siteConfig.get('akismet.authorEmail')],
        comment_author_url: fields[this.siteConfig.get('akismet.authorUrl')],
        comment_content: fields[this.siteConfig.get('akismet.content')]
      }, (err, isSpam) => {
        if (err) return reject(err)

        if (isSpam) return reject(errorHandler('IS_SPAM'))

        return resolve(fields)
      })
    })
  }

  async _checkAuth () {
    // TODO: Remove when v2 API is no longer supported
    if (this.parameters.version === '2') {
      return this._checkAuthV2()
    }

    if (!this.siteConfig.get('auth.required')) {
      return false
    }

    if (!this.options['auth-token']) {
      throw errorHandler('AUTH_TOKEN_MISSING')
    }

    const oauthToken = RSA.decrypt(this.options['auth-token'])

    if (!oauthToken) {
      throw errorHandler('AUTH_TOKEN_INVALID')
    }

    const git = gitFactory.create(this.options['auth-type'], { oauthToken })

    this.gitUser = await git.getCurrentUser()
    return true
  }

  // TODO: Remove when v2 API is no longer supported
  async _checkAuthV2 () {
    if (!this.siteConfig.get('githubAuth.required')) {
      return false
    }

    if (!this.options['github-token']) {
      throw errorHandler('GITHUB_AUTH_TOKEN_MISSING')
    }

    const oauthToken = RSA.decrypt(this.options['github-token'])

    if (!oauthToken) {
      throw errorHandler('GITHUB_AUTH_TOKEN_INVALID')
    }

    const git = gitFactory.create('github', {oauthToken})

    const { data } = await git.api.users.getAuthenticated({})
    this.gitUser = data
    return true
  }

  _createDate (options) {
    options = options || {}

    const date = new Date()

    switch (options.format) {
      case 'timestamp':
        return date.getTime()

      case 'timestamp-seconds':
        return Math.floor(date.getTime() / 1000)

      case 'iso8601':
      default:
        return date.toISOString()
    }
  }

  async _createFile (fields) {
    switch (this.siteConfig.get('format').toLowerCase()) {
      case 'json':
        return JSON.stringify(fields)

      case 'yaml':
      case 'yml': {
        const output = yaml.safeDump(fields)

        return output
      }
      case 'frontmatter': {
        const transforms = this.siteConfig.get('transforms')

        const contentField = transforms && Object.keys(transforms).find(field => {
          return transforms[field] === 'frontmatterContent'
        })

        if (!contentField) {
          throw errorHandler('NO_FRONTMATTER_CONTENT_TRANSFORM')
        }

        const content = fields[contentField]
        const attributeFields = Object.assign({}, fields)

        delete attributeFields[contentField]

        const output = `---\n${yaml.safeDump(attributeFields)}---\n${content}\n`

        return output
      }
      default:
        throw errorHandler('INVALID_FORMAT')
    }
  }

  _generateReviewBody (fields) {
    const table = [
      ['Field', 'Content'],
      ...Object.entries(fields)
    ]

    let message = this.siteConfig.get('pullRequestBody') + markdownTable(table)

    if (this.siteConfig.get('notifications.enabled')) {
      const notificationsPayload = {
        configPath: this.configPath,
        fields,
        options: this.options,
        parameters: this.parameters
      }

      message += `\n\n<!--staticman_notification:${JSON.stringify(notificationsPayload)}-->`
    }

    return message
  }

  _getNewFilePath (data) {
    const configFilename = this.siteConfig.get('filename')
    const filename = (configFilename && configFilename.length)
      ? this._resolvePlaceholders(configFilename, {
        fields: data,
        options: this.options
      })
      : this.uid

    let path = this._resolvePlaceholders(this.siteConfig.get('path'), {
      fields: data,
      options: this.options
    })

    // Remove trailing slash, if existing
    if (path.slice(-1) === '/') {
      path = path.slice(0, -1)
    }

    const extension = this.siteConfig.get('extension').length
      ? this.siteConfig.get('extension')
      : this._getExtensionForFormat(this.siteConfig.get('format'))

    return `${path}/${filename}.${extension}`
  }

  _getExtensionForFormat (format) {
    switch (format.toLowerCase()) {
      case 'json':
        return 'json'

      case 'yaml':
      case 'yml':
        return 'yml'

      case 'frontmatter':
        return 'md'
    }
  }

  _initialiseSubscriptions () {
    if (!this.siteConfig.get('notifications.enabled')) return null

    // Initialise Mailgun
    const mailgun = Mailgun({
      apiKey: this.siteConfig.get('notifications.apiKey') || config.get('email.apiKey'),
      domain: this.siteConfig.get('notifications.domain') || config.get('email.domain')
    })

    // Initialise SubscriptionsManager
    return new SubscriptionsManager(this.parameters, this.git, mailgun)
  }

  _resolvePlaceholders (subject, baseObject) {
    const matches = subject.match(Staticman.SUBJECT_REGEX)

    if (!matches) return subject

    matches.forEach((match) => {
      const escapedMatch = match.replace(Staticman.ESCAPED_MATCH_REGEX, '\\$&')
      const property = match.slice(1, -1)

      let newText

      switch (property) {
        case '@timestamp':
          newText = new Date().getTime()

          break

        case '@id':
          newText = this.uid

          break

        default:
          const timeIdentifier = '@date:'

          if (property.indexOf(timeIdentifier) === 0) {
            const timePattern = property.slice(timeIdentifier.length)

            newText = moment().format(timePattern)
          } else {
            newText = objectPath.get(baseObject, property) || ''
          }
      }

      subject = subject.replace(new RegExp(escapedMatch, 'g'), newText)
    })

    return subject
  }

  _validateConfig (config) {
    if (!config) {
      return errorHandler('MISSING_CONFIG_BLOCK')
    }

    const missingFields = Staticman.requiredFields.filter(requiredField =>
      objectPath.get(config, requiredField) === undefined)

    if (missingFields.length) {
      return errorHandler('MISSING_CONFIG_FIELDS', {
        data: missingFields
      })
    }

    this.siteConfig = SiteConfig(config, this.rsa)

    return null
  }

  _validateFields (fields) {
    Object.keys(fields).forEach(field => {
      // Trim fields
      if (typeof fields[field] === 'string') {
        fields[field] = fields[field].trim()
      }
    })

    const missingRequiredFields = this.siteConfig.get('requiredFields')
      .filter(field => fields[field] === undefined || fields[field] === '')

    const invalidFields = Object.keys(fields)
      .filter(field => this.siteConfig.get('allowedFields').indexOf(field) === -1 && fields[field] !== '')

    if (missingRequiredFields.length) {
      return errorHandler('MISSING_REQUIRED_FIELDS', {
        data: missingRequiredFields
      })
    }

    if (invalidFields.length) {
      return errorHandler('INVALID_FIELDS', {
        data: invalidFields
      })
    }

    return null
  }

  decrypt (encrypted) {
    return this.rsa.decrypt(encrypted, 'utf8')
  }

  getParameters () {
    return this.parameters
  }

  async getSiteConfig (force) {
    if (this.siteConfig && !force) return this.siteConfig

    if (!this.configPath) throw errorHandler('NO_CONFIG_PATH')

    const data = await this.git.readFile(this.configPath.file)

    const config = objectPath.get(data, this.configPath.path)
    const validationErrors = this._validateConfig(config)

    if (validationErrors) {
      throw validationErrors
    }

    if (config.branch !== this.parameters.branch) {
      throw errorHandler('BRANCH_MISMATCH')
    }

    return this.siteConfig
  }

  async processEntry (fields, options) {
    this.fields = { ...fields }
    this.options = { ...options }

    try {
      await this.getSiteConfig()
      await this._checkAuth()
      const checkedFields = await this._checkForSpam(fields)

      // Validate fields
      const fieldErrors = this._validateFields(fields)

      if (fieldErrors) throw fieldErrors

      // Add generated fields
      const generatedFields = this._applyGeneratedFields(checkedFields)

      // Apply transforms
      const transformedFields = await this._applyTransforms(generatedFields)
      const extendedFields = await this._applyInternalFields(transformedFields)

      // Create file
      const data = await this._createFile(extendedFields)

      const filePath = this._getNewFilePath(fields)
      const subscriptions = this._initialiseSubscriptions()
      const commitMessage = this._resolvePlaceholders(this.siteConfig.get('commitMessage'), {
        fields,
        options
      })

      // Subscribe user, if applicable
      if (subscriptions && options.parent && options.subscribe && this.fields[options.subscribe]) {
        try {
          await subscriptions.set(options.parent, this.fields[options.subscribe])
        } catch (err) {
          console.log(err.stack || err)
        }
      }

      if (this.siteConfig.get('moderation')) {
        const newBranch = 'staticman_' + this.uid

        await this.git.writeFileAndSendReview(
          filePath,
          data,
          newBranch,
          commitMessage,
          this._generateReviewBody(fields)
        )
      } else {
        if (subscriptions && options.parent) {
          subscriptions.send(options.parent, fields, options, this.siteConfig)
        }

        await this.git.writeFile(
          filePath,
          data,
          this.parameters.branch,
          commitMessage
        )
      }

      return {
        fields: fields,
        redirect: options.redirect ? options.redirect : false
      }
    } catch (err) {
      throw errorHandler('ERROR_PROCESSING_ENTRY', {
        err,
        instance: this
      })
    }
  }

  async processMerge (fields, options) {
    this.fields = { ...fields }
    this.options = { ...options }

    try {
      await this.getSiteConfig()
      const subscriptions = this._initialiseSubscriptions()

      return subscriptions.send(options.parent, fields, options, this.siteConfig)
    } catch (err) {
      throw errorHandler('ERROR_PROCESSING_MERGE', {
        err,
        instance: this
      })
    }
  }

  setConfigPath (configPath) {
    if (!configPath) {
      this.configPath = this.parameters.version === '1'
        ? { file: '_config.yml', path: 'staticman' }
        : { file: 'staticman.yml', path: this.parameters.property || '' }
      return
    }

    this.configPath = configPath
  }

  setIp (ip) {
    this.ip = ip
  }

  setUserAgent (userAgent) {
    this.userAgent = userAgent
  }
}

module.exports = Staticman
