import akismet from 'akismet';
import frontMatter from 'front-matter';
import MockDate from 'mockdate';
import moment from 'moment';
import slugify from 'slug';
import yaml from 'js-yaml';

import config from '../../../source/config';
import errorHandler from '../../../source/lib/ErrorHandler';
import GitHub from '../../../source/lib/GitHub';
import GitLab from '../../../source/lib/GitLab';
import * as mockHelpers from '../../helpers';
import Staticman from '../../../source/lib/Staticman';
import SubscriptionsManager from '../../../source/lib/SubscriptionsManager';
import User from '../../../source/lib/models/User';

jest.mock('akismet');

jest.mock('../../../source/lib/GitHub');
jest.mock('../../../source/lib/GitLab');
jest.mock('../../../source/lib/SubscriptionsManager');

let mockConfig;
let mockParameters;

beforeEach(() => {
  mockConfig = mockHelpers.getConfig();
  mockParameters = mockHelpers.getParameters();
});

afterEach(() => jest.clearAllMocks());

describe('Staticman interface', () => {
  describe('initialisation', () => {
    test('creates an instance of the github module', async () => {
      const staticman = new Staticman(mockParameters);

      expect.assertions(1);

      await staticman.init();

      const expectedParameters = mockParameters;
      delete expectedParameters.property;

      expect(GitHub).toHaveBeenCalledWith(expectedParameters);
    });

    test('creates an instance of the GitLab module', async () => {
      const staticman = new Staticman({
        ...mockParameters,
        service: 'gitlab',
      });

      expect.assertions(1);

      await staticman.init();

      const expectedParameters = mockParameters;
      delete expectedParameters.property;
      delete expectedParameters.service;

      expect(GitLab).toHaveBeenCalledWith(expectedParameters);
    });

    test('generates a new unique ID', async () => {
      expect.assertions(3);

      const staticman1 = new Staticman(mockParameters);
      await staticman1.init();
      const staticman2 = new Staticman(mockParameters);
      await staticman2.init();

      expect(staticman1.uid.length).toBeGreaterThan(0);
      expect(staticman2.uid.length).toBeGreaterThan(0);
      expect(staticman1.uid).not.toBe(staticman2.uid);
    });

    test('saves an internal reference to the parameters provided', async () => {
      const staticman = new Staticman(mockParameters);

      expect.assertions(1);

      await staticman.init();

      expect(staticman.parameters).toEqual(mockParameters);
    });

    test('exposes the parameters via the `getParameters()` method', async () => {
      const staticman = new Staticman(mockParameters);

      expect.assertions(1);

      await staticman.init();

      expect(staticman.getParameters()).toEqual(staticman.parameters);
    });

    test('sets the config path via the `setConfigPath()` method', async () => {
      const staticman = new Staticman(mockParameters);
      const configObject = mockHelpers.getConfigObject();
      await staticman.init();

      staticman.setConfigPath(configObject);

      expect(staticman.configPath).toEqual(configObject);
    });

    test('sets the request IP via the `setIp()` method', async () => {
      const staticman = new Staticman(mockParameters);
      const ip = '123.456.78.9';
      await staticman.init();

      staticman.setIp(ip);

      expect(staticman.ip).toEqual(ip);
    });

    test('sets the request User Agent via the `setUserAgent()` method', async () => {
      const staticman = new Staticman(mockParameters);
      await staticman.init();
      const userAgent = mockHelpers.getUserAgent();

      staticman.setUserAgent(userAgent);

      expect(staticman.userAgent).toEqual(userAgent);
    });
  });

  describe('internal fields', () => {
    test('adds an _id field to the data object', async () => {
      const staticman = new Staticman(mockParameters);
      await staticman.init();

      staticman.options = {};

      const data = mockHelpers.getFields();
      const extendedData = staticman._applyInternalFields(data);

      expect(extendedData).toEqual({
        ...data,
        _id: staticman.uid,
      });
    });

    test('adds an _parent field if the parent option is defined', async () => {
      const staticman1 = await new Staticman(mockParameters);
      await staticman1.init();
      const staticman2 = await new Staticman(mockParameters);
      await staticman2.init();

      staticman1.options = {
        parent: '123456789',
      };

      staticman2.options = {};

      const data = mockHelpers.getFields();
      const extendedData1 = staticman1._applyInternalFields(data);
      const extendedData2 = staticman2._applyInternalFields(data);

      expect(extendedData1).toEqual({
        ...data,
        _id: staticman1.uid,
        _parent: staticman1.options.parent,
      });

      expect(extendedData2).toEqual({
        ...data,
        _id: staticman2.uid,
      });
    });
  });

  describe('generated fields', () => {
    test('returns the data object unchanged if the `generatedFields` property is not in the site config', async () => {
      const staticman = new Staticman(mockParameters);
      await staticman.init();

      mockConfig.set('generatedFields', undefined);
      staticman.siteConfig = mockConfig;

      const extendedData = staticman._applyGeneratedFields(mockHelpers.getFields());

      expect(extendedData).toEqual(mockHelpers.getFields());
    });

    test('adds the generated fields to the data object', async () => {
      const staticman = new Staticman(mockParameters);
      await staticman.init();

      const spy = jest.spyOn(Staticman, '_createDate').mockImplementation(() => 'generatedDate');

      mockConfig.set('generatedFields', {
        date: {
          options: {
            format: 'timestamp-seconds',
          },
          type: 'date',
        },
        slug: {
          options: {
            field: 'name',
          },
          type: 'slugify',
        },
      });
      staticman.siteConfig = mockConfig;

      const data = mockHelpers.getFields();
      const extendedData = staticman._applyGeneratedFields(data);

      expect(Staticman._createDate).toHaveBeenCalledTimes(1);
      expect(extendedData).toEqual({
        ...data,
        date: 'generatedDate',
        slug: slugify(data.name).toLowerCase(),
      });

      spy.mockRestore();
    });

    test('adds the `user` generated fields to the data object', async () => {
      const staticman = new Staticman(mockParameters);
      await staticman.init();

      mockConfig.set('generatedFields', {
        username: {
          options: {
            property: 'username',
          },
          type: 'user',
        },
        name: {
          options: {
            property: 'name',
          },
          type: 'user',
        },
      });
      staticman.siteConfig = mockConfig;

      staticman.gitUser = new User('github', 'johndoe', 'johndoe@test.com', 'John Doe');

      const data = mockHelpers.getFields();
      const extendedData = staticman._applyGeneratedFields(data);

      expect(extendedData).toEqual({
        ...data,
        name: 'John Doe',
        username: 'johndoe',
      });
    });

    test('adds the `github` generated fields to the data object in the v2 API', async () => {
      const staticman = new Staticman(mockParameters);
      await staticman.init();

      mockConfig.set('generatedFields', {
        username: {
          options: {
            property: 'login',
          },
          type: 'github',
        },
        name: {
          options: {
            property: 'name',
          },
          type: 'github',
        },
      });
      staticman.siteConfig = mockConfig;

      staticman.gitUser = {
        login: 'johndoe',
        name: 'John Doe',
      };

      const data = mockHelpers.getFields();
      const extendedData = staticman._applyGeneratedFields(data);

      expect(extendedData).toEqual({
        ...data,
        name: 'John Doe',
        username: 'johndoe',
      });
    });
  });

  describe('field transforms', () => {
    test('returns the data object unchanged if the `transforms` property is not in the site config', async () => {
      const staticman = new Staticman(mockParameters);
      await staticman.init();

      mockConfig.set('transforms', undefined);
      staticman.siteConfig = mockConfig;

      const data = mockHelpers.getFields();

      expect.assertions(1);

      const extendedData = await staticman._applyTransforms(data);
      expect(extendedData).toEqual(data);
    });

    test('transforms the fields defined in the `transforms` property', async () => {
      const staticman = new Staticman(mockParameters);
      await staticman.init();

      mockConfig.set('transforms', {
        name: 'md5',
        email: 'upcase',
      });
      staticman.siteConfig = mockConfig;

      const data = mockHelpers.getFields();
      const extendedData = {
        ...data,
        name: 'f710ffc7114e4dfe5239ce411c160a70',
        email: 'MAIL@EDUARDOBOUCAS.COM',
      };

      expect.assertions(1);

      const transformedData = await staticman._applyTransforms(data);
      expect(transformedData).toEqual(extendedData);
    });

    test('handles multiple transforms per field', async () => {
      const staticman = new Staticman(mockParameters);
      await staticman.init();

      mockConfig.set('transforms', {
        email: ['md5', 'upcase'],
      });
      staticman.siteConfig = mockConfig;

      const data = mockHelpers.getFields();
      const extendedData = {
        ...data,
        email: '4F8072E22FAE3CD98B876DF304886BED',
      };

      expect.assertions(1);

      const transformedData = await staticman._applyTransforms(data);
      expect(transformedData).toEqual(extendedData);
    });
  });

  describe('spam detection', () => {
    test('returns the data object unchanged if Akismet is not enabled in config', async () => {
      const fields = mockHelpers.getFields();
      const staticman = new Staticman(mockParameters);
      await staticman.init();

      mockConfig.set('akismet.enabled', false);
      staticman.siteConfig = mockConfig;

      expect.assertions(1);

      const response = await staticman._checkForSpam(fields);
      expect(response).toEqual(fields);
    });

    test('makes a request to the Akismet API sending the correct data', async () => {
      const fields = mockHelpers.getFields();
      const mockCheckSpamFn = jest.fn((_options, callback) => {
        callback(null, false);
      });
      const mockClientFn = jest.fn(() => ({
        checkSpam: mockCheckSpamFn,
      }));

      akismet.client.mockImplementation(mockClientFn);

      const staticman = new Staticman(mockParameters);
      await staticman.init();

      mockConfig.set('akismet.enabled', true);
      mockConfig.set('akismet.author', 'name');
      mockConfig.set('akismet.authorEmail', 'email');
      mockConfig.set('akismet.authorUrl', 'url');
      mockConfig.set('akismet.content', 'message');
      staticman.siteConfig = mockConfig;

      expect.assertions(5);

      const response = await staticman._checkForSpam(fields);
      expect(response).toEqual(fields);

      expect(mockClientFn).toHaveBeenCalledTimes(1);
      expect(mockClientFn).toHaveBeenCalledWith({
        apiKey: config.get('akismet.apiKey'),
        blog: config.get('akismet.site'),
      });

      expect(mockCheckSpamFn).toHaveBeenCalledTimes(1);
      expect(mockCheckSpamFn).toHaveBeenCalledWith(
        {
          comment_type: 'comment',
          comment_author: fields.name,
          comment_author_email: fields.email,
          comment_author_url: fields.url,
          comment_content: fields.message,
        },
        expect.any(Function)
      );
    });

    test('throws an error if the Akismet API call fails', async () => {
      const akismetError = new Error('Akismet error');
      const fields = mockHelpers.getFields();
      const mockCheckSpamFn = jest.fn((_options, callback) => {
        callback(akismetError);
      });
      const mockClientFn = jest.fn(() => ({
        checkSpam: mockCheckSpamFn,
      }));

      akismet.client.mockImplementation(mockClientFn);

      const staticman = new Staticman(mockParameters);
      await staticman.init();

      mockConfig.set('akismet.enabled', true);
      mockConfig.set('akismet.author', 'name');
      mockConfig.set('akismet.authorEmail', 'email');
      mockConfig.set('akismet.authorUrl', 'url');
      mockConfig.set('akismet.content', 'message');
      staticman.siteConfig = mockConfig;

      return staticman._checkForSpam(fields).catch((err) => {
        expect(err).toEqual(akismetError);
      });
    });

    test('throws an error if the content is flagged as spam', async () => {
      const fields = mockHelpers.getFields();
      const mockCheckSpamFn = jest.fn((_options, callback) => {
        callback(null, true);
      });
      const mockClientFn = jest.fn(() => ({
        checkSpam: mockCheckSpamFn,
      }));

      akismet.client.mockImplementation(mockClientFn);

      const staticman = new Staticman(mockParameters);
      await staticman.init();

      mockConfig.set('akismet.enabled', true);
      mockConfig.set('akismet.author', 'name');
      mockConfig.set('akismet.authorEmail', 'email');
      mockConfig.set('akismet.authorUrl', 'url');
      mockConfig.set('akismet.content', 'message');
      staticman.siteConfig = mockConfig;

      return staticman._checkForSpam(fields).catch((err) => {
        expect(err).toEqual({
          _smErrorCode: 'IS_SPAM',
        });
      });
    });
  });

  describe('authentication ', () => {
    beforeEach(() => {
      mockConfig.set('auth.required', true);
    });

    test('returns false if `auth.required` config is false', async () => {
      mockConfig.set('auth.required', false);

      const fields = mockHelpers.getFields();
      const options = {};

      const staticman = new Staticman(mockParameters);
      await staticman.init();

      staticman.fields = fields;
      staticman.options = options;
      staticman.siteConfig = mockConfig;

      expect.assertions(1);

      const result = await staticman._checkAuth();
      expect(result).toBeFalsy();
    });

    test('throws an error if `auth-token` field is missing', async () => {
      const fields = mockHelpers.getFields();
      const options = {};
      mockParameters = {
        ...mockParameters,
        version: '3',
      };

      const staticman = new Staticman(mockParameters);
      await staticman.init();

      staticman.fields = fields;
      staticman.options = options;
      staticman.siteConfig = mockConfig;

      expect.assertions(1);

      try {
        await staticman._checkAuth();
      } catch (err) {
        expect(err).toEqual({
          _smErrorCode: 'AUTH_TOKEN_MISSING',
        });
      }
    });

    test('throws an error if unable to decrypt the `auth-token` option', async () => {
      const fields = mockHelpers.getFields();
      const options = {
        'auth-token': 'invalid token',
        'auth-type': 'github',
      };

      const staticman = new Staticman(mockParameters);
      await staticman.init();

      staticman.fields = fields;
      staticman.options = options;
      staticman.siteConfig = mockConfig;

      return staticman._checkAuth().catch((err) => {
        expect(err).toEqual({
          _smErrorCode: 'AUTH_TOKEN_INVALID',
        });
      });
    });

    test('authenticates with GitHub by default using the OAuth access token', async () => {
      const mockUser = new User('github', 'johndoe', 'johndoe@test.com', 'John Doe');

      GitHub.mockImplementation(() => ({
        getCurrentUser: jest.fn().mockResolvedValue(mockUser),
        init: jest.fn(),
      }));

      const fields = mockHelpers.getFields();
      const options = {
        'auth-token': mockHelpers.encrypt('test-token'),
      };

      const staticman = new Staticman(mockParameters);
      await staticman.init();

      staticman.fields = fields;
      staticman.options = options;
      staticman.siteConfig = mockConfig;
      staticman.parameters.version = '3';

      await staticman._checkAuth();
      expect(GitHub).toHaveBeenCalledWith({
        oauthToken: 'test-token',
        version: '3',
      });
    });

    test('authenticates with GitLab (using `auth-type` option) using OAuth access token', async () => {
      const mockUser = new User('gitlab', 'johndoe', 'johndoe@test.com', 'John Doe');

      GitLab.mockImplementation(() => ({
        getCurrentUser: jest.fn().mockResolvedValue(mockUser),
      }));

      const fields = mockHelpers.getFields();
      const options = {
        'auth-token': mockHelpers.encrypt('test-token'),
        'auth-type': 'gitlab',
      };

      const staticman = new Staticman(mockParameters);
      await staticman.init();

      staticman.fields = fields;
      staticman.options = options;
      staticman.siteConfig = mockConfig;
      staticman.parameters.version = '3';

      await staticman._checkAuth();
      expect(GitLab).toHaveBeenCalledWith({
        oauthToken: 'test-token',
        version: '3',
      });
    });

    test('sets the `gitUser` property to the authenticated User and returns true for GitHub authentication', async () => {
      const mockUser = new User('github', 'johndoe', 'johndoe@test.com', 'John Doe');
      const mockGetCurrentUser = jest.fn().mockResolvedValue(mockUser);

      GitHub.mockImplementation(() => ({
        getCurrentUser: mockGetCurrentUser,
        init: jest.fn(),
      }));

      const fields = mockHelpers.getFields();
      const options = {
        'auth-token': mockHelpers.encrypt('test-token'),
      };

      const staticman = new Staticman(mockParameters);
      await staticman.init();

      staticman.fields = fields;
      staticman.options = options;
      staticman.siteConfig = mockConfig;
      staticman.parameters.version = '3';

      const result = await staticman._checkAuth();
      expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);
      expect(staticman.gitUser).toEqual(mockUser);
      expect(result).toBeTruthy();
    });

    test('sets the `gitUser` property to the authenticated User and returns true for GitLab authentication', async () => {
      const mockUser = new User('github', 'johndoe', 'johndoe@test.com', 'John Doe');
      const mockGetCurrentUser = jest.fn().mockResolvedValue(mockUser);

      GitLab.mockImplementation(() => ({
        getCurrentUser: mockGetCurrentUser,
      }));

      const fields = mockHelpers.getFields();
      const options = {
        'auth-token': mockHelpers.encrypt('test-token'),
        'auth-type': 'gitlab',
      };

      const staticman = new Staticman(mockParameters);
      await staticman.init();

      staticman.fields = fields;
      staticman.options = options;
      staticman.siteConfig = mockConfig;
      staticman.parameters.version = '3';

      const result = await staticman._checkAuth();
      expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);
      expect(staticman.gitUser).toEqual(mockUser);
      expect(result).toBeTruthy();
    });
  });

  describe('authentication v2', () => {
    beforeEach(() => {
      mockConfig.set('githubAuth.required', true);
    });

    test('returns false if `githubAuth.required` config is false', async () => {
      mockConfig.set('githubAuth.required', false);

      const fields = mockHelpers.getFields();
      const options = {};

      mockParameters.version = '2';

      const staticman = new Staticman(mockParameters);
      await staticman.init();

      staticman.fields = fields;
      staticman.options = options;
      staticman.siteConfig = mockConfig;

      expect.assertions(1);

      const result = await staticman._checkAuth();
      expect(result).toBeFalsy();
    });

    test('throws an error if `github-token` field is missing in v2 API', async () => {
      const fields = mockHelpers.getFields();
      const options = {};

      mockParameters.version = '2';

      const staticman = new Staticman(mockParameters);
      await staticman.init();

      staticman.fields = fields;
      staticman.options = options;
      staticman.siteConfig = mockConfig;

      expect.assertions(1);

      try {
        await staticman._checkAuth();
      } catch (err) {
        expect(err).toEqual({
          _smErrorCode: 'GITHUB_AUTH_TOKEN_MISSING',
        });
      }
    });

    test('throws an error if unable to decrypt the `github-token` option in the v2 API', async () => {
      const fields = mockHelpers.getFields();
      const options = {
        'github-token': 'invalid token',
      };

      mockParameters.version = '2';

      const staticman = new Staticman(mockParameters);
      await staticman.init();

      staticman.fields = fields;
      staticman.options = options;
      staticman.siteConfig = mockConfig;

      return staticman._checkAuth().catch((err) => {
        expect(err).toEqual({
          _smErrorCode: 'GITHUB_AUTH_TOKEN_INVALID',
        });
      });
    });

    test('sets the `gitUser` property to the GitHub user in the v2 API', async () => {
      const mockUser = {
        login: 'johndoe',
        name: 'John Doe',
      };
      const mockGetCurrentUser = jest.fn().mockResolvedValue({ data: mockUser });

      GitHub.mockImplementation(() => ({
        api: {
          users: {
            getAuthenticated: mockGetCurrentUser,
          },
        },
        getCurrentUser: jest.fn().mockResolvedValue(mockUser),
        init: jest.fn(),
      }));

      const fields = mockHelpers.getFields();
      const options = {
        'github-token': mockHelpers.encrypt('test-token'),
      };

      mockParameters.version = '2';

      const staticman = new Staticman(mockParameters);
      await staticman.init();

      staticman.fields = fields;
      staticman.options = options;
      staticman.siteConfig = mockConfig;

      const result = await staticman._checkAuth();
      expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);
      expect(staticman.gitUser).toEqual(mockUser);
      expect(result).toBeTruthy();
    });
  });

  describe('date creator', () => {
    let expectedTime;

    beforeAll(() => {
      MockDate.set(589028400);
      expectedTime = new Date().getTime();
    });

    afterAll(() => {
      MockDate.reset();
    });

    test('creates a timestamp in milliseconds if the format is set to `timestamp`', async () => {
      const date = Staticman._createDate({
        format: 'timestamp',
      });

      expect(date).toBe(expectedTime);
    });

    test('creates a timestamp in seconds if the format is set to `timestamp-seconds`', async () => {
      const date = Staticman._createDate({
        format: 'timestamp-seconds',
      });

      expect(date).toBe(Math.floor(expectedTime / 1000));
    });

    test('creates a ISO-8601 representation of the date if the format is set to `iso8601`, absent, or set to none of the other supported formats', async () => {
      const date1 = Staticman._createDate({
        format: 'iso8601',
      });
      const date2 = Staticman._createDate({
        format: 'somethingNotValid',
      });
      const date3 = Staticman._createDate();

      const expectedDate = new Date().toISOString();

      expect(date1).toBe(expectedDate);
      expect(date2).toBe(expectedDate);
      expect(date3).toBe(expectedDate);
    });
  });

  describe('file formatting', () => {
    test('formats the given fields as JSON if `format` is set to `json`', async () => {
      const fields = mockHelpers.getFields();
      const staticman = new Staticman(mockParameters);
      await staticman.init();

      mockConfig.set('format', 'json');
      staticman.siteConfig = mockConfig;

      expect.assertions(1);

      const file = await staticman._createFile(fields);
      expect(file).toBe(JSON.stringify(fields));
    });

    test('formats the given fields as YAML if `format` is set to `yaml` or `yml`', async () => {
      const fields = mockHelpers.getFields();
      const staticman1 = await new Staticman(mockParameters);
      await staticman1.init();
      const staticman2 = await new Staticman(mockParameters);
      await staticman2.init();
      const config1 = mockHelpers.getConfig();
      const config2 = mockHelpers.getConfig();

      config1.set('format', 'yaml');
      config2.set('format', 'yaml');

      staticman1.siteConfig = config1;
      staticman2.siteConfig = config2;

      expect.assertions(2);

      const file1 = await staticman1._createFile(fields);
      const file2 = await staticman2._createFile(fields);
      expect(file1).toBe(yaml.safeDump(fields));
      expect(file2).toBe(yaml.safeDump(fields));
    });

    test('formats the given fields as YAML/Frontmatter if `format` is set to `frontmatter`', async () => {
      const fields = mockHelpers.getFields();
      const staticman = new Staticman(mockParameters);
      await staticman.init();

      mockConfig.set('format', 'frontmatter');
      mockConfig.set('transforms', {
        message: 'frontmatterContent',
      });
      staticman.siteConfig = mockConfig;

      const attributeFields = { ...fields };
      delete attributeFields.message;

      expect.assertions(2);

      const file = await staticman._createFile(fields);
      const parsedFile = frontMatter(file);

      expect(parsedFile.attributes).toEqual(attributeFields);
      expect(parsedFile.body.trim()).toBe(fields.message.trim());
    });

    test('throws an error if `format` is set to `frontmatter` but there is no `frontmatterContent` transform defined', async () => {
      const fields = mockHelpers.getFields();
      const staticman = new Staticman(mockParameters);
      await staticman.init();

      mockConfig.set('format', 'frontmatter');
      mockConfig.set('transforms', undefined);
      staticman.siteConfig = mockConfig;

      expect.assertions(1);

      try {
        await staticman._createFile(fields);
      } catch (err) {
        expect(err).toEqual({
          _smErrorCode: 'NO_FRONTMATTER_CONTENT_TRANSFORM',
        });
      }
    });

    test('throws an error if `format` contains an invalid format', async () => {
      const fields = mockHelpers.getFields();
      const staticman = new Staticman(mockParameters);
      await staticman.init();

      mockConfig.set('format', 'someWeirdFormat');
      staticman.siteConfig = mockConfig;

      return staticman._createFile(fields).catch((err) => {
        expect(err).toEqual({
          _smErrorCode: 'INVALID_FORMAT',
        });
      });
    });
  });

  describe('generating a message for the pull request body', () => {
    test('generates a PR body with the message set in config and a table listing fields and their values', async () => {
      const fields = mockHelpers.getFields();
      const fieldsTable = mockHelpers.getFieldsTable();
      const staticman = new Staticman(mockParameters);
      await staticman.init();

      mockConfig.set('notifications.enabled', false);
      staticman.siteConfig = mockConfig;

      const pullRequestBody = staticman._generateReviewBody(fields);

      expect(pullRequestBody).toBe(mockConfig.get('pullRequestBody') + fieldsTable);
    });

    test('adds an HTML comment containing notification settings if `notifications.enabled` is set to `true`', async () => {
      const req = mockHelpers.getMockRequest();
      const configObject = {
        file: 'staticman.yml',
        path: req.params.property,
      };
      const fields = mockHelpers.getFields();
      const fieldsTable = mockHelpers.getFieldsTable();
      const staticman = new Staticman(mockParameters);
      await staticman.init();

      mockConfig.set('notifications.enabled', true);
      staticman.siteConfig = mockConfig;
      staticman.setConfigPath(configObject);
      staticman.setIp(req.headers['x-forwarded-for'] || req.connection.remoteAddress);
      staticman.setUserAgent(req.headers['user-agent']);

      const notificationsData = {
        configPath: staticman.configPath,
        fields,
        parameters: req.params,
      };
      const notificationsComment = `\n\n<!--staticman_notification:${JSON.stringify(
        notificationsData
      )}-->`;
      const pullRequestBody = staticman._generateReviewBody(fields);

      expect(pullRequestBody).toBe(
        mockConfig.get('pullRequestBody') + fieldsTable + notificationsComment
      );
    });
  });

  describe('computes the full path and extension for new files', () => {
    test('uses UID as the default file name and extension if `filename` and `extension` are not set in config', async () => {
      const fields = mockHelpers.getFields();
      const directory = 'some/directory';
      const staticman = new Staticman(mockParameters);
      await staticman.init();

      mockConfig.set('filename', '');
      mockConfig.set('format', 'json');
      mockConfig.set('path', directory);
      staticman.siteConfig = mockConfig;

      const filePath = staticman._getNewFilePath(fields);

      expect(filePath).toBe(`${directory}/${staticman.uid}.json`);
    });

    test('uses the config value of `filename`, if defined, as the file name', async () => {
      const fields = mockHelpers.getFields();
      const directory = 'some/directory';
      const name = 'my-file';
      const staticman = new Staticman(mockParameters);
      await staticman.init();

      mockConfig.set('filename', name);
      mockConfig.set('format', 'json');
      mockConfig.set('path', directory);
      staticman.siteConfig = mockConfig;

      const filePath = staticman._getNewFilePath(fields);

      expect(filePath).toBe(`${directory}/${name}.json`);
    });

    test('uses the config value of `extension`, if defined, as the file extension', async () => {
      const fields = mockHelpers.getFields();
      const directory = 'some/directory';
      const name = 'my-file';
      const staticman = new Staticman(mockParameters);
      await staticman.init();

      mockConfig.set('extension', 'html');
      mockConfig.set('filename', name);
      mockConfig.set('format', 'json');
      mockConfig.set('path', directory);
      staticman.siteConfig = mockConfig;

      const filePath = staticman._getNewFilePath(fields);

      expect(filePath).toBe(`${directory}/${name}.html`);
    });

    test('removes a trailing slash from `path` if it exists', async () => {
      const fields = mockHelpers.getFields();
      const staticman1 = await new Staticman(mockParameters);
      await staticman1.init();
      const staticman2 = await new Staticman(mockParameters);
      await staticman2.init();
      const config1 = mockHelpers.getConfig();
      const config2 = mockHelpers.getConfig();

      config1.set('filename', 'my-file');
      config1.set('format', 'json');
      config1.set('path', 'some/directory');
      config2.set('filename', 'my-file');
      config2.set('format', 'json');
      config2.set('path', 'some/directory/');
      staticman1.siteConfig = config1;
      staticman2.siteConfig = config2;

      const filePath1 = staticman1._getNewFilePath(fields);
      const filePath2 = staticman2._getNewFilePath(fields);

      expect(filePath1).toBe(filePath2);
    });

    test('resolves placeholders in the filename and path', async () => {
      const data = {
        fields: {
          group: 50,
        },
        options: {
          slug: 'some-slug',
        },
      };
      const directory = 'groups/{fields.group}';
      const name = 'file-{options.slug}';
      const staticman = new Staticman(mockParameters);
      await staticman.init();

      mockConfig.set('filename', name);
      mockConfig.set('format', 'json');
      mockConfig.set('path', directory);

      staticman.options = data.options;
      staticman.siteConfig = mockConfig;

      const filePath = staticman._getNewFilePath(data.fields);
      const processedDirectory = directory.replace('{fields.group}', data.fields.group);
      const processedName = name.replace('{options.slug}', data.options.slug);

      expect(filePath).toBe(`${processedDirectory}/${processedName}.json`);
    });

    test('gets the correct extension for each supported format', async () => {
      const extension1 = Staticman._getExtensionForFormat('json');
      const extension2 = Staticman._getExtensionForFormat('yaml');
      const extension3 = Staticman._getExtensionForFormat('yml');
      const extension4 = Staticman._getExtensionForFormat('frontmatter');

      expect(extension1).toBe('json');
      expect(extension2).toBe('yml');
      expect(extension3).toBe('yml');
      expect(extension4).toBe('md');
    });
  });

  describe('placeholders (`_resolvePlaceholders`)', () => {
    beforeAll(() => {
      MockDate.set(new Date(589028400));
    });

    afterAll(() => {
      MockDate.reset();
    });

    test('returns the given string unchanged if it does not contain placeholders', async () => {
      const staticman = new Staticman(mockParameters);
      await staticman.init();

      const subject = 'This is a normal string, nothing to replace here.';
      const data = mockHelpers.getParameters();

      expect(staticman._resolvePlaceholders(subject, data)).toBe(subject);
    });

    test('returns the given string with placeholders replaced with data from the data object provided', async () => {
      const staticman = new Staticman(mockParameters);
      await staticman.init();

      const subject = 'My name is {name} and I come from {location.city}, {location.country}';
      const data = {
        name: 'Eduardo',
        location: {
          city: 'London',
          country: 'United Kingdom',
        },
      };
      const subjectReplaced = subject
        .replace('{name}', data.name)
        .replace('{location.city}', data.location.city)
        .replace('{location.country}', data.location.country);

      expect(staticman._resolvePlaceholders(subject, data)).toBe(subjectReplaced);
    });

    test('returns the given string with special placeholders replaced', async () => {
      const staticman = new Staticman(mockParameters);
      await staticman.init();

      const data = {
        name: 'Eduardo',
      };
      const subject = 'Hi {name}, the time is {@timestamp} and my ID is {@id}';
      const subjectReplaced = subject
        .replace('{name}', data.name)
        .replace('{@timestamp}', new Date().getTime())
        .replace('{@id}', staticman.uid);

      expect(staticman._resolvePlaceholders(subject, data)).toBe(subjectReplaced);
    });

    test('returns the given string with `date:` placeholders replaced', async () => {
      const staticman = new Staticman(mockParameters);
      await staticman.init();

      const data = {
        title: 'this-is-a-title',
      };
      const subject = '{@date:YYYY-MM-DD}-{title}';
      const subjectReplaced = subject
        .replace('{title}', data.title)
        .replace('{@date:YYYY-MM-DD}', moment().format('YYYY-MM-DD'));

      expect(staticman._resolvePlaceholders(subject, data)).toBe(subjectReplaced);
    });
  });

  describe('`_validateConfig`', () => {
    test('throws an error if no config is provided', async () => {
      const staticman = new Staticman(mockParameters);
      await staticman.init();

      expect(staticman._validateConfig(null)).toEqual({
        _smErrorCode: 'MISSING_CONFIG_BLOCK',
      });
    });

    test('throws an error if the config provided is missing any of the required fields', async () => {
      const staticman = new Staticman(mockParameters);
      await staticman.init();
      const expectedSiteConfig = {
        allowedFields: ['name', 'email'],
        format: 'json',
      };

      expect(staticman._validateConfig(expectedSiteConfig)).toEqual({
        _smErrorCode: 'MISSING_CONFIG_FIELDS',
        data: ['branch', 'path'],
      });
    });

    test('creates a SiteConfig object and assigns it to the Staticman instance', async () => {
      const staticman = new Staticman(mockParameters);
      await staticman.init();
      const expectedSiteConfig = {
        allowedFields: ['name', 'email'],
        branch: 'master',
        format: 'json',
        path: 'some/path',
      };

      staticman._validateConfig(expectedSiteConfig);

      expect(staticman.siteConfig.get('allowedFields')).toEqual(expectedSiteConfig.allowedFields);
      expect(staticman.siteConfig.get('branch')).toEqual(expectedSiteConfig.branch);
      expect(staticman.siteConfig.get('format')).toEqual(expectedSiteConfig.format);
      expect(staticman.siteConfig.get('path')).toEqual(expectedSiteConfig.path);
    });
  });

  describe('`_validateFields`', () => {
    test('throws an error if the payload contains a field that is not allowed', async () => {
      const staticman = new Staticman(mockParameters);
      await staticman.init();
      const payload = mockHelpers.getFields();

      mockConfig.set('allowedFields', ['streetName', 'country']);

      staticman.siteConfig = mockConfig;

      const validationResult = staticman._validateFields(payload);

      expect(validationResult._smErrorCode).toBe('INVALID_FIELDS');
      expect(validationResult.data).toEqual(Object.keys(payload));
    });

    test('returns a copy of the fields provided with all strings trimmed', async () => {
      const staticman = new Staticman(mockParameters);
      await staticman.init();
      const payload = mockHelpers.getFields();
      const paddedPayload = { ...payload };

      paddedPayload.name = `   ${payload.name}`;
      paddedPayload.email = `${payload.email} `;
      paddedPayload.url = `  ${payload.url}   `;
      paddedPayload.message = `\n\n${payload.message}`;

      mockConfig.set('allowedFields', Object.keys(payload));

      staticman.siteConfig = mockConfig;

      staticman._validateFields(paddedPayload);

      expect(paddedPayload).toEqual(payload);
    });

    test('throws an error if the payload is missing a required field', async () => {
      const staticman = new Staticman(mockParameters);
      await staticman.init();
      const payload = mockHelpers.getFields();

      payload.someField1 = '  ';

      const requiredFields = ['name', 'someField1', 'someField2'];

      mockConfig.set('allowedFields', Object.keys(payload));
      mockConfig.set('requiredFields', requiredFields);

      staticman.siteConfig = mockConfig;

      expect(staticman._validateFields(payload)).toEqual({
        _smErrorCode: 'MISSING_REQUIRED_FIELDS',
        data: ['someField1', 'someField2'],
      });
    });
  });

  describe('`getSiteConfig()`', () => {
    test('returns the existing site config if `force` is falsy', async () => {
      const staticman = new Staticman(mockParameters);
      await staticman.init();

      staticman.siteConfig = mockConfig;

      const siteConfig = await staticman.getSiteConfig();
      expect(siteConfig).toEqual(mockConfig);
    });

    test('throws an error if the config path has not been set', async () => {
      const staticman = new Staticman(mockParameters);
      await staticman.init();

      expect.assertions(1);

      try {
        await staticman.getSiteConfig();
      } catch (err) {
        expect(err).toEqual({
          _smErrorCode: 'NO_CONFIG_PATH',
        });
      }
    });

    test('fetches the site config from the repository, even if there is one already defined, if `force` is truthy', async () => {
      const staticman = new Staticman(mockParameters);
      await staticman.init();
      const configObject = mockHelpers.getConfigObject();

      staticman.setConfigPath(configObject);
      staticman.siteConfig = mockConfig;
      staticman.git = {
        readFile: jest.fn().mockResolvedValue(mockHelpers.getParsedConfig()),
      };

      expect.assertions(2);

      await staticman.getSiteConfig(true);
      expect(staticman.git.readFile).toHaveBeenCalledTimes(1);
      expect(staticman.git.readFile).toHaveBeenCalledWith(configObject.file);
    });

    test('fetches the site config from the repository and throws an error if it fails validation', async () => {
      const staticman = new Staticman(mockParameters);
      await staticman.init();
      const configObject = mockHelpers.getConfigObject();
      const validationErrors = {
        _smErrorCode: 'MISSING_CONFIG_FIELDS',
        data: ['branch', 'path'],
      };

      const invalidConfig = {
        missingFields: true,
      };

      staticman.setConfigPath(configObject);
      staticman.git = {
        readFile: jest.fn().mockResolvedValue({
          [configObject.path]: invalidConfig,
        }),
      };
      staticman._validateConfig = jest.fn(() => validationErrors);

      return staticman.getSiteConfig().catch((err) => {
        expect(err).toEqual(validationErrors);
        expect(staticman._validateConfig).toHaveBeenCalledWith(invalidConfig);
      });
    });

    test('fetches the site config from the repository and throws an error if there is a branch mismatch', async () => {
      const staticman = new Staticman(mockParameters);
      await staticman.init();
      const configObject = mockHelpers.getConfigObject();
      const mockRemoteConfig = { ...mockConfig.getProperties() };

      mockRemoteConfig.branch = 'some-other-branch';

      staticman.setConfigPath(configObject);
      staticman.git = {
        readFile: jest.fn().mockResolvedValue({
          [configObject.path]: mockRemoteConfig,
        }),
      };
      staticman._validateConfig = jest.fn(() => null);

      return staticman.getSiteConfig().catch((err) => {
        expect(err).toEqual({
          _smErrorCode: 'BRANCH_MISMATCH',
        });
      });
    });

    test('fetches the site config from the repository and returns the new site config object', async () => {
      const staticman = new Staticman(mockParameters);
      await staticman.init();
      const configObject = mockHelpers.getConfigObject();

      staticman.setConfigPath(configObject);
      staticman.git = {
        readFile: jest.fn().mockResolvedValue(mockHelpers.getParsedConfig()),
      };

      const siteConfig = await staticman.getSiteConfig();
      expect(siteConfig.getProperties()).toEqual(mockConfig.getProperties());
    });
  });

  describe('`processEntry()`', () => {
    beforeAll(() => {
      MockDate.set(1420099200000);
    });

    afterAll(() => MockDate.reset());

    test('gets site config and checks for spam, throwing an error if found', async () => {
      const staticman = new Staticman(mockParameters);
      await staticman.init();

      staticman.getSiteConfig = jest.fn(() => {
        staticman.siteConfig = mockConfig;

        return Promise.resolve(mockConfig);
      });

      staticman._checkForSpam = jest.fn().mockRejectedValue(errorHandler('IS_SPAM'));

      return staticman.processEntry(mockHelpers.getFields(), {}).catch((err) => {
        expect(err).toEqual({
          _smErrorCode: 'IS_SPAM',
        });
      });
    });

    test('validates fields, throwing an error if validation fails', async () => {
      const staticman = new Staticman(mockParameters);
      await staticman.init();
      const fields = mockHelpers.getFields();

      mockConfig.set('allowedFields', Object.keys(fields));

      fields.someField1 = 'Some value';

      staticman._checkForSpam = jest.fn().mockResolvedValue(fields);
      staticman.siteConfig = mockConfig;

      return staticman.processEntry(mockHelpers.getFields(), {}).catch((err) => {
        expect(err).toEqual({
          _smErrorCode: 'INVALID_FIELDS',
          data: ['someField1'],
        });
      });
    });

    test('creates a file after applying generated fields, transforms and internal fields, throwing an error if file creation fails', async () => {
      const staticman = new Staticman(mockParameters);
      await staticman.init();
      const fields = mockHelpers.getFields();

      mockConfig.set('allowedFields', Object.keys(fields));

      staticman.siteConfig = mockConfig;
      staticman._checkForSpam = jest.fn().mockResolvedValue(fields);

      const spyApplyGeneratedFields = jest.spyOn(staticman, '_applyGeneratedFields');
      const spyApplyTransforms = jest.spyOn(staticman, '_applyTransforms');
      const spyApplyInternalFields = jest.spyOn(staticman, '_applyInternalFields');

      staticman._createFile = jest.fn(() => {
        throw errorHandler('INVALID_FORMAT');
      });

      return staticman.processEntry(mockHelpers.getFields(), {}).catch((err) => {
        expect(spyApplyGeneratedFields).toHaveBeenCalled();
        expect(spyApplyTransforms).toHaveBeenCalled();
        expect(spyApplyInternalFields).toHaveBeenCalled();
        expect(err).toEqual({
          _smErrorCode: 'INVALID_FORMAT',
        });
      });
    });

    test('authenticates user before creating file', async () => {
      const mockUser = new User('github', 'johndoe', 'johndoe@test.com', 'John Doe');
      const mockGetCurrentUser = jest.fn().mockResolvedValue(mockUser);

      GitHub.mockImplementation(() => ({
        getCurrentUser: mockGetCurrentUser,
        init: jest.fn(),
      }));

      const staticman = new Staticman(mockParameters);
      await staticman.init();
      const fields = mockHelpers.getFields();
      const options = {
        'auth-token': mockHelpers.encrypt('test-token'),
      };

      mockConfig.set('auth.required', true);

      staticman.siteConfig = mockConfig;
      staticman.parameters.version = '3';
      staticman._checkForSpam = jest.fn().mockResolvedValue(fields);
      staticman.git.writeFile = jest.fn();

      const spyCheckAuth = jest.spyOn(staticman, '_checkAuth');

      await staticman.processEntry(fields, options);
      expect(spyCheckAuth).toHaveBeenCalledTimes(1);
      expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);
      expect(staticman.gitUser).toEqual(mockUser);
    });

    test('authenticates user before creating file, throwing an error if unable to authenticate', async () => {
      const staticman = new Staticman(mockParameters);
      await staticman.init();
      const fields = mockHelpers.getFields();
      const options = {
        'auth-token': 'invalid token',
      };

      mockConfig.set('auth.required', true);

      staticman.siteConfig = mockConfig;
      staticman._checkForSpam = jest.fn().mockResolvedValue(fields);
      staticman.git.writeFile = jest.fn();

      return staticman.processEntry(fields, options).catch((err) => {
        expect(err._smErrorCode).toEqual('AUTH_TOKEN_INVALID');
      });
    });

    test('subscribes the user to notifications', async () => {
      const mockSubscriptionSet = jest.fn().mockResolvedValue(true);

      SubscriptionsManager.mockImplementation(() => ({
        send: jest.fn(),
        set: mockSubscriptionSet,
      }));

      const staticman = new Staticman(mockParameters);
      await staticman.init();
      const fields = mockHelpers.getFields();
      const options = {
        parent: '1a2b3c4d5e6f',
        subscribe: 'email',
      };

      mockConfig.set('allowedFields', Object.keys(fields));
      mockConfig.set('moderation', false);
      mockConfig.set('notifications.enabled', true);

      staticman.siteConfig = mockConfig;
      staticman._checkForSpam = jest.fn().mockResolvedValue(fields);
      staticman.git.writeFile = jest.fn();

      expect.assertions(1);

      await staticman.processEntry(fields, options);
      expect(mockSubscriptionSet).toHaveBeenCalledWith(
        options.parent,
        mockHelpers.getFields().email
      );
    });

    test('creates a pull request with the generated file if moderation is enabled', async () => {
      const staticman = new Staticman(mockParameters);
      await staticman.init();
      const fields = mockHelpers.getFields();

      mockConfig.set('allowedFields', Object.keys(fields));
      mockConfig.set('moderation', true);
      mockConfig.set('notifications.enabled', false);

      staticman.siteConfig = mockConfig;
      staticman._checkForSpam = jest.fn().mockResolvedValue(fields);
      staticman.git.writeFileAndSendReview = jest.fn().mockResolvedValue();

      expect.assertions(1);

      await staticman.processEntry(fields, {});
      const expectedFile = await staticman._createFile(staticman._applyInternalFields(fields));
      const expectedCommitMessage = staticman._resolvePlaceholders(
        mockConfig.get('commitMessage'),
        {
          fields,
          options: {},
        }
      );

      expect(staticman.git.writeFileAndSendReview).toHaveBeenCalledWith(
        staticman._getNewFilePath(fields),
        expectedFile,
        `staticman_${staticman.uid}`,
        expectedCommitMessage,
        staticman._generateReviewBody(fields)
      );
    });

    test('commits the generated file directly if moderation is disabled', async () => {
      const mockSubscriptionSend = jest.fn();

      SubscriptionsManager.mockImplementation(() => ({
        send: mockSubscriptionSend,
        set: jest.fn().mockResolvedValue(true),
      }));

      const staticman = new Staticman(mockParameters);
      await staticman.init();
      const fields = mockHelpers.getFields();
      const options = {
        parent: '1a2b3c4d5e6f',
        subscribe: 'email',
      };

      mockConfig.set('allowedFields', Object.keys(fields));
      mockConfig.set('moderation', false);
      mockConfig.set('notifications.enabled', true);

      staticman.siteConfig = mockConfig;
      staticman._checkForSpam = jest.fn().mockResolvedValue(fields);
      staticman.git.writeFile = jest.fn();

      await staticman.processEntry(fields, options);
      const expectedFile = await staticman._createFile(staticman._applyInternalFields(fields));
      const expectedCommitMessage = staticman._resolvePlaceholders(
        mockConfig.get('commitMessage'),
        {
          fields,
          options: {},
        }
      );

      expect(mockSubscriptionSend).toHaveBeenCalledWith(
        options.parent,
        expect.objectContaining(fields),
        expect.anything(),
        expect.anything()
      );
      expect(staticman.git.writeFile).toHaveBeenCalledWith(
        staticman._getNewFilePath(fields),
        expectedFile,
        mockParameters.branch,
        expectedCommitMessage
      );
    });

    describe('`processMerge()`', () => {
      test('subscribes the user to notifications', async () => {
        const mockSubscriptionSend = jest.fn();

        SubscriptionsManager.mockImplementation(() => ({
          send: mockSubscriptionSend,
        }));

        const staticman = new Staticman(mockParameters);
        await staticman.init();
        const fields = mockHelpers.getFields();
        const options = {
          parent: '1a2b3c4d5e6f',
          subscribe: 'email',
        };

        mockConfig.set('notifications.enabled', true);

        staticman.siteConfig = mockConfig;

        expect.assertions(1);

        await staticman.processMerge(fields, options);

        expect(mockSubscriptionSend).toHaveBeenCalledWith(
          options.parent,
          fields,
          options,
          mockConfig
        );
      });
    });
  });
});
