const config = require('./../../../config')
const errorHandler = require('./../../../lib/ErrorHandler')
const frontMatter = require('front-matter')
const moment = require('moment')
const mockHelpers = require('./../../helpers')
const slugify = require('slug')
const yaml = require('js-yaml')
const User = require('../../../lib/models/User')

let mockConfig
let mockParameters

beforeEach(() => {
  mockConfig = mockHelpers.getConfig()
  mockParameters = mockHelpers.getParameters()

  jest.resetModules()
  jest.unmock('./../../../lib/SubscriptionsManager')
  jest.unmock('node-rsa')
})

describe('Staticman interface', () => {
  describe('initialisation', () => {
    test('creates an instance of the GitHub module', async () => {
      const GitHub = require('../../../lib/GitHub')
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      expect(staticman.git).toBeInstanceOf(GitHub)
      expect(staticman.git.username).toBe(mockParameters.username)
      expect(staticman.git.repository).toBe(mockParameters.repository)
      expect(staticman.git.branch).toBe(mockParameters.branch)
    })

    test('creates an instance of the GitLab module', async () => {
      const GitLab = require('../../../lib/GitLab')
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(Object.assign({}, mockParameters, {service: 'gitlab'}))

      expect(staticman.git).toBeInstanceOf(GitLab)
      expect(staticman.git.username).toBe(mockParameters.username)
      expect(staticman.git.repository).toBe(mockParameters.repository)
      expect(staticman.git.branch).toBe(mockParameters.branch)
    })

    test('generates a new unique ID', async () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman1 = await new Staticman(mockParameters)
      const staticman2 = await new Staticman(mockParameters)

      expect(staticman1.uid.length).toBeGreaterThan(0)
      expect(staticman2.uid.length).toBeGreaterThan(0)
      expect(staticman1.uid).not.toBe(staticman2.uid)
    })

    test('creates an instance of the NodeRSA module and import the private key', async () => {
      const mockImportKeyFn = jest.fn()

      jest.mock('node-rsa', () => {
        return jest.fn(() => ({
          importKey: mockImportKeyFn
        }))
      })

      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      expect(staticman.rsa).toBeDefined()
      expect(mockImportKeyFn).toHaveBeenCalled()
      expect(mockImportKeyFn.mock.calls[0][0]).toBe(config.get('rsaPrivateKey'))
    })

    test('saves an internal reference to the parameters provided', async () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      expect(staticman.parameters).toEqual(mockParameters)
    })

    test('exposes the parameters via the `getParameters()` method', async () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      expect(staticman.getParameters()).toEqual(staticman.parameters)
    })

    test('sets the config path via the `setConfigPath()` method', async () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)
      const configObject = mockHelpers.getConfigObject()

      staticman.setConfigPath(configObject)

      expect(staticman.configPath).toEqual(configObject)
    })

    test('sets the request IP via the `setIp()` method', async () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)
      const ip = '123.456.78.9'

      staticman.setIp(ip)

      expect(staticman.ip).toEqual(ip)
    })

    test('sets the request User Agent via the `setUserAgent()` method', async () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)
      const userAgent = mockHelpers.getUserAgent()

      staticman.setUserAgent(userAgent)

      expect(staticman.userAgent).toEqual(userAgent)
    })
  })

  describe('internal fields', () => {
    test('adds an _id field to the data object', async () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      staticman.options = {}

      const data = mockHelpers.getFields()
      const extendedData = staticman._applyInternalFields(data)

      expect(extendedData).toEqual(Object.assign({}, data, {
        _id: staticman.uid
      }))
    })

    test('adds an _parent field if the parent option is defined', async () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman1 = await new Staticman(mockParameters)
      const staticman2 = await new Staticman(mockParameters)

      staticman1.options = {
        parent: '123456789'
      }

      staticman2.options = {}

      const data = mockHelpers.getFields()
      const extendedData1 = staticman1._applyInternalFields(data)
      const extendedData2 = staticman2._applyInternalFields(data)

      expect(extendedData1).toEqual(Object.assign({}, data, {
        _id: staticman1.uid,
        _parent: staticman1.options.parent
      }))

      expect(extendedData2).toEqual(Object.assign({}, data, {
        _id: staticman2.uid
      }))
    })
  })

  describe('generated fields', () => {
    test('returns the data object unchanged if the `generatedFields` property is not in the site config', async () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      mockConfig.set('generatedFields', undefined)
      staticman.siteConfig = mockConfig

      const extendedData = staticman._applyGeneratedFields(mockHelpers.getFields())

      expect(extendedData).toEqual(mockHelpers.getFields())
    })

    test('adds the generated fields to the data object', async () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      staticman._createDate = jest.fn(() => 'generatedDate')

      mockConfig.set('generatedFields', {
        date: {
          options: {
            format: 'timestamp-seconds'
          },
          type: 'date'
        },
        slug: {
          options: {
            field: 'name'
          },
          type: 'slugify'
        }
      })
      staticman.siteConfig = mockConfig

      const data = mockHelpers.getFields()
      const extendedData = staticman._applyGeneratedFields(data)

      expect(staticman._createDate).toHaveBeenCalledTimes(1)
      expect(extendedData).toEqual(Object.assign({}, data, {
        date: 'generatedDate',
        slug: slugify(data.name).toLowerCase()
      }))
    })

    test('adds the `user` generated fields to the data object', async () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      mockConfig.set('generatedFields', {
        username: {
          options: {
            property: 'username'
          },
          type: 'user'
        },
        name: {
          options: {
            property: 'name'
          },
          type: 'user'
        }
      })
      staticman.siteConfig = mockConfig

      staticman.gitUser = new User('github', 'johndoe', 'johndoe@test.com', 'John Doe')

      const data = mockHelpers.getFields()
      const extendedData = staticman._applyGeneratedFields(data)

      expect(extendedData).toEqual(Object.assign({}, data, {
        name: 'John Doe',
        username: 'johndoe'
      }))
    })

    test('adds the `github` generated fields to the data object in the v2 API', async () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      mockConfig.set('generatedFields', {
        username: {
          options: {
            property: 'login'
          },
          type: 'github'
        },
        name: {
          options: {
            property: 'name'
          },
          type: 'github'
        }
      })
      staticman.siteConfig = mockConfig

      staticman.gitUser = {
        login: 'johndoe',
        name: 'John Doe'
      }

      const data = mockHelpers.getFields()
      const extendedData = staticman._applyGeneratedFields(data)

      expect(extendedData).toEqual(Object.assign({}, data, {
        name: 'John Doe',
        username: 'johndoe'
      }))
    })
  })

  describe('field transforms', () => {
    test('returns the data object unchanged if the `transforms` property is not in the site config', async () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      mockConfig.set('transforms', undefined)
      staticman.siteConfig = mockConfig

      const data = mockHelpers.getFields()

      return staticman._applyTransforms(data).then(extendedData => {
        expect(extendedData).toEqual(data)
      })
    })

    test('transforms the fields defined in the `transforms` property', async () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      mockConfig.set('transforms', {
        name: 'md5',
        email: 'upcase'
      })
      staticman.siteConfig = mockConfig

      const data = mockHelpers.getFields()
      const extendedData = Object.assign({}, data, {
        name: 'f710ffc7114e4dfe5239ce411c160a70',
        email: 'MAIL@EDUARDOBOUCAS.COM'
      })

      return staticman._applyTransforms(data).then(transformedData => {
        expect(transformedData).toEqual(extendedData)
      })
    })

    test('handles multiple transforms per field', async () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      mockConfig.set('transforms', {
        email: ['md5', 'upcase']
      })
      staticman.siteConfig = mockConfig

      const data = mockHelpers.getFields()
      const extendedData = Object.assign({}, data, {
        email: '4F8072E22FAE3CD98B876DF304886BED'
      })

      return staticman._applyTransforms(data).then(transformedData => {
        expect(transformedData).toEqual(extendedData)
      })
    })
  })

  describe('spam detection', () => {
    test('returns the data object unchanged if Akismet is not enabled in config', async () => {
      const fields = mockHelpers.getFields()
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      mockConfig.set('akismet.enabled', false)
      staticman.siteConfig = mockConfig

      const catchAllMockRequest = mockHelpers.getCatchAllApiMock()

      return staticman._checkForSpam(fields).then(response => {
        expect(response).toEqual(fields)
        expect(catchAllMockRequest.hasIntercepted()).toBe(false)
      })
    })

    test('makes a request to the Akismet API sending the correct data', async () => {
      const fields = mockHelpers.getFields()
      const mockCheckSpamFn = jest.fn((options, callback) => {
        callback(null, false)
      })
      const mockClientFn = jest.fn(options => ({
        checkSpam: mockCheckSpamFn
      }))

      jest.mock('akismet', () => ({
        client: mockClientFn
      }))

      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      mockConfig.set('akismet.enabled', true)
      mockConfig.set('akismet.author', 'name')
      mockConfig.set('akismet.authorEmail', 'email')
      mockConfig.set('akismet.authorUrl', 'url')
      mockConfig.set('akismet.content', 'message')
      staticman.siteConfig = mockConfig

      return staticman._checkForSpam(fields).then(response => {
        expect(response).toEqual(fields)

        expect(mockClientFn).toHaveBeenCalledTimes(1)
        expect(mockClientFn.mock.calls[0][0]).toEqual({
          apiKey: config.get('akismet.apiKey'),
          blog: config.get('akismet.site')
        })

        expect(mockCheckSpamFn).toHaveBeenCalledTimes(1)
        expect(mockCheckSpamFn.mock.calls[0][0]).toEqual({
          comment_type: 'comment',
          comment_author: fields.name,
          comment_author_email: fields.email,
          comment_author_url: fields.url,
          comment_content: fields.message
        })
        expect(mockCheckSpamFn.mock.calls[0][1]).toBeInstanceOf(Function)
      })
    })

    test('throws an error if the Akismet API call fails', async () => {
      const akismetError = new Error('Akismet error')
      const fields = mockHelpers.getFields()
      const mockCheckSpamFn = jest.fn((options, callback) => {
        callback(akismetError)
      })
      const mockClientFn = jest.fn(options => ({
        checkSpam: mockCheckSpamFn
      }))

      jest.mock('akismet', () => ({
        client: mockClientFn
      }))

      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      mockConfig.set('akismet.enabled', true)
      mockConfig.set('akismet.author', 'name')
      mockConfig.set('akismet.authorEmail', 'email')
      mockConfig.set('akismet.authorUrl', 'url')
      mockConfig.set('akismet.content', 'message')
      staticman.siteConfig = mockConfig

      return staticman._checkForSpam(fields).catch(err => {
        expect(err).toEqual(akismetError)
      })
    })

    test('throws an error if the content is flagged as spam', async () => {
      const fields = mockHelpers.getFields()
      const mockCheckSpamFn = jest.fn((options, callback) => {
        callback(null, true)
      })
      const mockClientFn = jest.fn(options => ({
        checkSpam: mockCheckSpamFn
      }))

      jest.mock('akismet', () => ({
        client: mockClientFn
      }))

      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      mockConfig.set('akismet.enabled', true)
      mockConfig.set('akismet.author', 'name')
      mockConfig.set('akismet.authorEmail', 'email')
      mockConfig.set('akismet.authorUrl', 'url')
      mockConfig.set('akismet.content', 'message')
      staticman.siteConfig = mockConfig

      return staticman._checkForSpam(fields).catch(err => {
        expect(err).toEqual({
          _smErrorCode: 'IS_SPAM'
        })
      })
    })
  })

  describe('authentication ', () => {
    beforeEach(() => {
      mockConfig.set('auth.required', true)
    })

    test('returns false if `auth.required` config is false', async () => {
      mockConfig.set('auth.required', false)

      const fields = mockHelpers.getFields()
      const options = {}

      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      staticman.fields = fields
      staticman.options = options
      staticman.siteConfig = mockConfig

      return staticman._checkAuth().then(result => expect(result).toBeFalsy())
    })

    test('throws an error if `auth-token` field is missing', async () => {
      const fields = mockHelpers.getFields()
      const options = {}

      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      staticman.fields = fields
      staticman.options = options
      staticman.siteConfig = mockConfig

      return staticman._checkAuth().catch(err => {
        expect(err).toEqual({
          _smErrorCode: 'AUTH_TOKEN_MISSING'
        })
      })
    })

    test('throws an error if unable to decrypt the `auth-token` option', async () => {
      const fields = mockHelpers.getFields()
      const options = {
        'auth-token': 'invalid token',
        'auth-type': 'github'
      }

      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      staticman.fields = fields
      staticman.options = options
      staticman.siteConfig = mockConfig

      return staticman._checkAuth().catch(err => {
        expect(err).toEqual({
          _smErrorCode: 'AUTH_TOKEN_INVALID'
        })
      })
    })

    test('authenticates with GitHub by default using the OAuth access token', async () => {
      const mockConstructor = jest.fn()
      const mockUser = new User('github', 'johndoe', 'johndoe@test.com', 'John Doe')

      jest.mock('../../../lib/GitHub', () => {
        return mockConstructor.mockImplementation(() => {
          return {
            getCurrentUser: () => Promise.resolve(mockUser)
          }
        })
      })

      const fields = mockHelpers.getFields()
      const options = {
        'auth-token': mockHelpers.encrypt('test-token'),
      }

      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      staticman.fields = fields
      staticman.options = options
      staticman.siteConfig = mockConfig
      staticman.parameters.version = '3'

      await staticman._checkAuth()
      expect(mockConstructor.mock.calls[1][0]).toEqual({
        oauthToken: 'test-token',
        version: '3'
      })
    })

    test('authenticates with GitLab (using `auth-type` option) using OAuth access token', async () => {
      const mockConstructor = jest.fn()
      const mockUser = new User('gitlab', 'johndoe', 'johndoe@test.com', 'John Doe')

      jest.mock('../../../lib/GitLab', () => {
        return mockConstructor.mockImplementation(() => {
          return {
            getCurrentUser: () => Promise.resolve(mockUser)
          }
        })
      })

      const fields = mockHelpers.getFields()
      const options = {
        'auth-token': mockHelpers.encrypt('test-token'),
        'auth-type': 'gitlab'
      }

      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      staticman.fields = fields
      staticman.options = options
      staticman.siteConfig = mockConfig
      staticman.parameters.version = '3'

      await staticman._checkAuth()
      expect(mockConstructor.mock.calls[0][0]).toEqual({
        oauthToken: 'test-token',
        version: '3'
      })
    })

    test('sets the `gitUser` property to the authenticated User and returns true for GitHub authentication', async () => {
      const mockGetCurrentUser = jest.fn(() => Promise.resolve(mockUser))

      jest.mock('../../../lib/GitHub', () => {
        return function () {
          return {
            getCurrentUser: mockGetCurrentUser
          }
        }
      })

      const fields = mockHelpers.getFields()
      const options = {
        'auth-token': mockHelpers.encrypt('test-token')
      }

      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      staticman.fields = fields
      staticman.options = options
      staticman.siteConfig = mockConfig
      staticman.parameters.version = '3'

      const mockUser = new User('github', 'johndoe', 'johndoe@test.com', 'John Doe')

      let result = await staticman._checkAuth()
      expect(mockGetCurrentUser).toHaveBeenCalledTimes(1)
      expect(staticman.gitUser).toEqual(mockUser)
      expect(result).toBeTruthy()
    })

    test('sets the `gitUser` property to the authenticated User and returns true for GitLab authentication', async () => {
      const mockGetCurrentUser = jest.fn(() => Promise.resolve(mockUser))

      jest.mock('../../../lib/GitLab', () => {
        return function () {
          return {
            getCurrentUser: mockGetCurrentUser
          }
        }
      })

      const fields = mockHelpers.getFields()
      const options = {
        'auth-token': mockHelpers.encrypt('test-token'),
        'auth-type': 'gitlab'
      }

      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      staticman.fields = fields
      staticman.options = options
      staticman.siteConfig = mockConfig
      staticman.parameters.version = '3'

      const mockUser = new User('github', 'johndoe', 'johndoe@test.com', 'John Doe')

      let result = await staticman._checkAuth()
      expect(mockGetCurrentUser).toHaveBeenCalledTimes(1)
      expect(staticman.gitUser).toEqual(mockUser)
      expect(result).toBeTruthy()
    })
  })

  describe('authentication v2', async () => {
    beforeEach(() => {
      mockConfig.set('githubAuth.required', true)
    })

    test('returns false if `githubAuth.required` config is false', async () => {
      mockConfig.set('githubAuth.required', false)

      const fields = mockHelpers.getFields()
      const options = {}

      mockParameters.version = '2'

      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      staticman.fields = fields
      staticman.options = options
      staticman.siteConfig = mockConfig

      return staticman._checkAuth().then(result => expect(result).toBeFalsy())
    })

    test('throws an error if `github-token` field is missing in v2 API', async () => {
      const fields = mockHelpers.getFields()
      const options = {}

      mockParameters.version = '2'

      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      staticman.fields = fields
      staticman.options = options
      staticman.siteConfig = mockConfig

      return staticman._checkAuth().catch(err => {
        expect(err).toEqual({
          _smErrorCode: 'GITHUB_AUTH_TOKEN_MISSING'
        })
      })
    })

    test('throws an error if unable to decrypt the `github-token` option in the v2 API', async () => {
      const fields = mockHelpers.getFields()
      const options = {
        'github-token': 'invalid token'
      }

      mockParameters.version = '2'

      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      staticman.fields = fields
      staticman.options = options
      staticman.siteConfig = mockConfig

      return staticman._checkAuth().catch(err => {
        expect(err).toEqual({
          _smErrorCode: 'GITHUB_AUTH_TOKEN_INVALID'
        })
      })
    })

    test('sets the `gitUser` property to the GitHub user in the v2 API', async () => {
      const mockUser = {
        login: 'johndoe',
        name: 'John Doe'
      }
      const mockGetCurrentUser = jest.fn(() => Promise.resolve({
        data: mockUser
      }))

      jest.mock('../../../lib/GitHub', () => {
        return function () {
          return {
            api: {
              users: {
                getAuthenticated: mockGetCurrentUser
              }
            }
          }
        }
      })

      const fields = mockHelpers.getFields()
      const options = {
        'github-token': mockHelpers.encrypt('test-token')
      }

      mockParameters.version = '2'

      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      staticman.fields = fields
      staticman.options = options
      staticman.siteConfig = mockConfig

      return staticman._checkAuth().then((result) => {
        expect(mockGetCurrentUser).toHaveBeenCalledTimes(1)
        expect(staticman.gitUser).toEqual(mockUser)
        expect(result).toBeTruthy()
      })
    })
  })

  describe('date creator', () => {
    const mockDate = new Date('1988-08-31T11:00:00')

    // eslint-disable-next-line no-global-assign
    Date = class extends Date {
      constructor () {
        return mockDate
      }
    }

    test('creates a timestamp in milliseconds if the format is set to `timestamp`', async () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      const date = staticman._createDate({
        format: 'timestamp'
      })

      expect(date).toBe(mockDate.getTime())
    })

    test('creates a timestamp in seconds if the format is set to `timestamp-seconds`', async () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      const date = staticman._createDate({
        format: 'timestamp-seconds'
      })

      expect(date).toBe(Math.floor(mockDate.getTime() / 1000))
    })

    test(
      'creates a ISO-8601 representation of the date if the format is set to `iso8601`, absent, or set to none of the other supported formats',
      async () => {
        const Staticman = require('./../../../lib/Staticman')
        const staticman = await new Staticman(mockParameters)

        const date1 = staticman._createDate({
          format: 'iso8601'
        })
        const date2 = staticman._createDate({
          format: 'somethingNotValid'
        })
        const date3 = staticman._createDate()

        expect(date1).toBe(mockDate.toISOString())
        expect(date2).toBe(mockDate.toISOString())
        expect(date3).toBe(mockDate.toISOString())
      }
    )
  })

  describe('file formatting', () => {
    test('formats the given fields as JSON if `format` is set to `json`', async () => {
      const fields = mockHelpers.getFields()
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      mockConfig.set('format', 'json')
      staticman.siteConfig = mockConfig

      return staticman._createFile(fields).then(file => {
        expect(file).toBe(JSON.stringify(fields))
      })
    })

    test('formats the given fields as YAML if `format` is set to `yaml` or `yml`', async () => {
      const fields = mockHelpers.getFields()
      const Staticman = require('./../../../lib/Staticman')
      const staticman1 = await new Staticman(mockParameters)
      const staticman2 = await new Staticman(mockParameters)
      const config1 = mockHelpers.getConfig()
      const config2 = mockHelpers.getConfig()

      config1.set('format', 'yaml')
      config2.set('format', 'yaml')

      staticman1.siteConfig = config1
      staticman2.siteConfig = config2

      return staticman1._createFile(fields).then(file1 => {
        return staticman2._createFile(fields).then(file2 => {
          expect(file1).toBe(yaml.safeDump(fields))
          expect(file2).toBe(yaml.safeDump(fields))
        })
      })
    })

    test('formats the given fields as YAML/Frontmatter if `format` is set to `frontmatter`', async () => {
      const fields = mockHelpers.getFields()
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      mockConfig.set('format', 'frontmatter')
      mockConfig.set('transforms', {
        message: 'frontmatterContent'
      })
      staticman.siteConfig = mockConfig

      let attributeFields = Object.assign({}, fields)
      delete attributeFields.message

      return staticman._createFile(fields).then(file => {
        const parsedFile = frontMatter(file)

        expect(parsedFile.attributes).toEqual(attributeFields)
        expect(parsedFile.body.trim()).toBe(fields.message.trim())
      })
    })

    test(
      'throws an error if `format` is set to `frontmatter` but there is no `frontmatterContent` transform defined',
      async () => {
        const fields = mockHelpers.getFields()
        const Staticman = require('./../../../lib/Staticman')
        const staticman = await new Staticman(mockParameters)

        mockConfig.set('format', 'frontmatter')
        mockConfig.set('transforms', undefined)
        staticman.siteConfig = mockConfig

        return staticman._createFile(fields).catch(err => {
          expect(err).toEqual({
            _smErrorCode: 'NO_FRONTMATTER_CONTENT_TRANSFORM'
          })
        })
      }
    )

    test('throws an error if `format` contains an invalid format', async () => {
      const fields = mockHelpers.getFields()
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      mockConfig.set('format', 'someWeirdFormat')
      staticman.siteConfig = mockConfig

      return staticman._createFile(fields).catch(err => {
        expect(err).toEqual({
          _smErrorCode: 'INVALID_FORMAT'
        })
      })
    })
  })

  describe('generating a message for the pull request body', () => {
    test('generates a PR body with the message set in config and a table listing fields and their values', async () => {
      const fields = mockHelpers.getFields()
      const fieldsTable = mockHelpers.getFieldsTable()
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      mockConfig.set('notifications.enabled', false)
      staticman.siteConfig = mockConfig

      const pullRequestBody = staticman._generateReviewBody(fields)

      expect(pullRequestBody).toBe(mockConfig.get('pullRequestBody') + fieldsTable)
    })

    test('adds an HTML comment containing notification settings if `notifications.enabled` is set to `true`', async () => {
      const req = mockHelpers.getMockRequest()
      const configObject = {
        file: 'staticman.yml',
        path: req.params.property
      }
      const fields = mockHelpers.getFields()
      const fieldsTable = mockHelpers.getFieldsTable()
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      mockConfig.set('notifications.enabled', true)
      staticman.siteConfig = mockConfig
      staticman.setConfigPath(configObject)
      staticman.setIp(req.headers['x-forwarded-for'] || req.connection.remoteAddress)
      staticman.setUserAgent(req.headers['user-agent'])

      const notificationsData = {
        configPath: staticman.configPath,
        fields: fields,
        parameters: req.params
      }
      const notificationsComment = `\n\n<!--staticman_notification:${JSON.stringify(notificationsData)}-->`
      const pullRequestBody = staticman._generateReviewBody(fields)

      expect(pullRequestBody).toBe(
        mockConfig.get('pullRequestBody') +
        fieldsTable +
        notificationsComment
      )
    })
  })

  describe('computes the full path and extension for new files', () => {
    test('uses UID as the default file name and extension if `filename` and `extension` are not set in config', async () => {
      const fields = mockHelpers.getFields()
      const directory = 'some/directory'
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      mockConfig.set('filename', '')
      mockConfig.set('format', 'json')
      mockConfig.set('path', directory)
      staticman.siteConfig = mockConfig

      const filePath = staticman._getNewFilePath(fields)

      expect(filePath).toBe(`${directory}/${staticman.uid}.json`)
    })

    test('uses the config value of `filename`, if defined, as the file name', async () => {
      const fields = mockHelpers.getFields()
      const directory = 'some/directory'
      const name = 'my-file'
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      mockConfig.set('filename', name)
      mockConfig.set('format', 'json')
      mockConfig.set('path', directory)
      staticman.siteConfig = mockConfig

      const filePath = staticman._getNewFilePath(fields)

      expect(filePath).toBe(`${directory}/${name}.json`)
    })

    test('uses the config value of `extension`, if defined, as the file extension', async () => {
      const fields = mockHelpers.getFields()
      const directory = 'some/directory'
      const name = 'my-file'
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      mockConfig.set('extension', 'html')
      mockConfig.set('filename', name)
      mockConfig.set('format', 'json')
      mockConfig.set('path', directory)
      staticman.siteConfig = mockConfig

      const filePath = staticman._getNewFilePath(fields)

      expect(filePath).toBe(`${directory}/${name}.html`)
    })

    test('removes a trailing slash from `path` if it exists', async () => {
      const fields = mockHelpers.getFields()
      const Staticman = require('./../../../lib/Staticman')
      const staticman1 = await new Staticman(mockParameters)
      const staticman2 = await new Staticman(mockParameters)
      const config1 = mockHelpers.getConfig()
      const config2 = mockHelpers.getConfig()

      config1.set('filename', 'my-file')
      config1.set('format', 'json')
      config1.set('path', 'some/directory')
      config2.set('filename', 'my-file')
      config2.set('format', 'json')
      config2.set('path', 'some/directory/')
      staticman1.siteConfig = config1
      staticman2.siteConfig = config2

      const filePath1 = staticman1._getNewFilePath(fields)
      const filePath2 = staticman2._getNewFilePath(fields)

      expect(filePath1).toBe(filePath2)
    })

    test('resolves placeholders in the filename and path', async () => {
      const data = {
        fields: {
          group: 50
        },
        options: {
          slug: 'some-slug'
        }
      }
      const directory = 'groups/{fields.group}'
      const name = 'file-{options.slug}'
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      mockConfig.set('filename', name)
      mockConfig.set('format', 'json')
      mockConfig.set('path', directory)

      staticman.options = data.options
      staticman.siteConfig = mockConfig

      const filePath = staticman._getNewFilePath(data.fields)
      const processedDirectory = directory.replace('{fields.group}', data.fields.group)
      const processedName = name.replace('{options.slug}', data.options.slug)

      expect(filePath).toBe(`${processedDirectory}/${processedName}.json`)
    })

    test('gets the correct extension for each supported format', async () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      const extension1 = staticman._getExtensionForFormat('json')
      const extension2 = staticman._getExtensionForFormat('yaml')
      const extension3 = staticman._getExtensionForFormat('yml')
      const extension4 = staticman._getExtensionForFormat('frontmatter')

      expect(extension1).toBe('json')
      expect(extension2).toBe('yml')
      expect(extension3).toBe('yml')
      expect(extension4).toBe('md')
    })
  })

  describe('placeholders (`_resolvePlaceholders`)', () => {
    test('returns the given string unchanged if it does not contain placeholders', async () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      const subject = 'This is a normal string, nothing to replace here.'
      const data = mockHelpers.getParameters()

      expect(staticman._resolvePlaceholders(subject, data)).toBe(subject)
    })

    test('returns the given string with placeholders replaced with data from the data object provided', async () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      const subject = 'My name is {name} and I come from {location.city}, {location.country}'
      const data = {
        name: 'Eduardo',
        location: {
          city: 'London',
          country: 'United Kingdom'
        }
      }
      const subjectReplaced = subject
        .replace('{name}', data.name)
        .replace('{location.city}', data.location.city)
        .replace('{location.country}', data.location.country)

      expect(staticman._resolvePlaceholders(subject, data)).toBe(subjectReplaced)
    })

    test('returns the given string with special placeholders replaced', async () => {
      const mockDate = new Date('1988-08-31T11:00:00')

      // eslint-disable-next-line no-global-assign
      Date = class extends Date {
        constructor () {
          return mockDate
        }
      }

      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      const data = {
        name: 'Eduardo'
      }
      const subject = 'Hi {name}, the time is {@timestamp} and my ID is {@id}'
      const subjectReplaced = subject
        .replace('{name}', data.name)
        .replace('{@timestamp}', mockDate.getTime())
        .replace('{@id}', staticman.uid)

      expect(staticman._resolvePlaceholders(subject, data)).toBe(subjectReplaced)
    })

    test('returns the given string with `date:` placeholders replaced', async () => {
      const mockDate = new Date('1988-08-31T11:00:00')

      // eslint-disable-next-line no-global-assign
      Date = class extends Date {
        constructor () {
          return mockDate
        }
      }

      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      const data = {
        title: 'this-is-a-title'
      }
      const subject = '{@date:YYYY-MM-DD}-{title}'
      const subjectReplaced = subject
        .replace('{title}', data.title)
        .replace('{@date:YYYY-MM-DD}', moment().format('YYYY-MM-DD'))

      expect(staticman._resolvePlaceholders(subject, data)).toBe(subjectReplaced)
    })
  })

  describe('`_validateConfig`', () => {
    test('throws an error if no config is provided', async () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      expect(staticman._validateConfig(null)).toEqual({
        _smErrorCode: 'MISSING_CONFIG_BLOCK'
      })
    })

    test('throws an error if the config provided is missing any of the required fields', async () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)
      const config = {
        allowedFields: ['name', 'email'],
        format: 'json'
      }

      expect(staticman._validateConfig(config)).toEqual({
        _smErrorCode: 'MISSING_CONFIG_FIELDS',
        data: ['branch', 'path']
      })
    })

    test('creates a SiteConfig object and assigns it to the Staticman instance', async () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)
      const config = {
        allowedFields: ['name', 'email'],
        branch: 'master',
        format: 'json',
        path: 'some/path'
      }

      staticman._validateConfig(config)

      expect(staticman.siteConfig.get('allowedFields')).toEqual(config.allowedFields)
      expect(staticman.siteConfig.get('branch')).toEqual(config.branch)
      expect(staticman.siteConfig.get('format')).toEqual(config.format)
      expect(staticman.siteConfig.get('path')).toEqual(config.path)
    })
  })

  describe('`_validateFields`', () => {
    test('throws an error if the payload contains a field that is not allowed', async () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)
      const payload = mockHelpers.getFields()

      mockConfig.set('allowedFields', ['streetName', 'country'])

      staticman.siteConfig = mockConfig

      const validationResult = staticman._validateFields(payload)

      expect(validationResult._smErrorCode).toBe('INVALID_FIELDS')
      expect(validationResult.data).toEqual(Object.keys(payload))
    })

    test('returns a copy of the fields provided with all strings trimmed', async () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)
      const payload = mockHelpers.getFields()
      const paddedPayload = Object.assign({}, payload)

      paddedPayload.name = '   ' + payload.name
      paddedPayload.email = payload.email + ' '
      paddedPayload.url = '  ' + payload.url + '   '
      paddedPayload.message = '\n\n' + payload.message

      mockConfig.set('allowedFields', Object.keys(payload))

      staticman.siteConfig = mockConfig

      staticman._validateFields(paddedPayload)

      expect(paddedPayload).toEqual(payload)
    })

    test('throws an error if the payload is missing a required field', async () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)
      const payload = mockHelpers.getFields()

      payload.someField1 = '  '

      const requiredFields = [
        'name',
        'someField1',
        'someField2'
      ]

      mockConfig.set('allowedFields', Object.keys(payload))
      mockConfig.set('requiredFields', requiredFields)

      staticman.siteConfig = mockConfig

      expect(staticman._validateFields(payload)).toEqual({
        _smErrorCode: 'MISSING_REQUIRED_FIELDS',
        data: ['someField1', 'someField2']
      })
    })
  })

  describe('`getSiteConfig()`', () => {
    test('returns the existing site config if `force` is falsy', async () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      staticman.siteConfig = mockConfig

      return staticman.getSiteConfig().then(config => {
        expect(config).toEqual(mockConfig)
      })
    })

    test('throws an error if the config path has not been set', async () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      return staticman.getSiteConfig().catch(err => {
        expect(err).toEqual({
          _smErrorCode: 'NO_CONFIG_PATH'
        })
      })
    })

    test(
      'fetches the site config from the repository, even if there is one already defined, if `force` is truthy',
      async () => {
        const Staticman = require('./../../../lib/Staticman')
        const staticman = await new Staticman(mockParameters)
        const configObject = mockHelpers.getConfigObject()

        staticman.setConfigPath(configObject)
        staticman.siteConfig = mockConfig
        staticman.git = {
          readFile: jest.fn(() => {
            const config = mockHelpers.getParsedConfig()

            return Promise.resolve(config)
          })
        }

        return staticman.getSiteConfig(true).then(config => {
          expect(staticman.git.readFile).toHaveBeenCalledTimes(1)
          expect(staticman.git.readFile.mock.calls[0][0]).toBe(configObject.file)
        })
      }
    )

    test('fetches the site config from the repository and throws an error if it fails validation', async () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)
      const configObject = mockHelpers.getConfigObject()
      const validationErrors = {
        _smErrorCode: 'MISSING_CONFIG_FIELDS',
        data: ['branch', 'path']
      }

      const invalidConfig = {
        missingFields: true
      }

      staticman.setConfigPath(configObject)
      staticman.git = {
        readFile: jest.fn(() => {
          return Promise.resolve({
            [configObject.path]: invalidConfig
          })
        })
      }
      staticman._validateConfig = jest.fn(() => validationErrors)

      return staticman.getSiteConfig().catch(err => {
        expect(err).toEqual(validationErrors)
        expect(staticman._validateConfig.mock.calls[0][0]).toEqual(invalidConfig)
      })
    })

    test('fetches the site config from the repository and throws an error if there is a branch mismatch', async () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)
      const configObject = mockHelpers.getConfigObject()
      const mockRemoteConfig = Object.assign({}, mockConfig.getProperties())

      mockRemoteConfig.branch = 'some-other-branch'

      staticman.setConfigPath(configObject)
      staticman.git = {
        readFile: jest.fn(() => {
          return Promise.resolve({
            [configObject.path]: mockRemoteConfig
          })
        })
      }
      staticman._validateConfig = jest.fn(() => null)

      return staticman.getSiteConfig().catch(err => {
        expect(err).toEqual({
          _smErrorCode: 'BRANCH_MISMATCH'
        })
      })
    })

    test('fetches the site config from the repository and returns the new site config object', async () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)
      const configObject = mockHelpers.getConfigObject()

      staticman.setConfigPath(configObject)
      staticman.git = {
        readFile: jest.fn(() => {
          const mockRemoteConfig = mockHelpers.getParsedConfig()

          return Promise.resolve(mockRemoteConfig)
        })
      }

      return staticman.getSiteConfig().then(config => {
        expect(config.getProperties()).toEqual(mockConfig.getProperties())
      })
    })
  })

  describe('`processEntry()`', () => {
    test('gets site config and checks for spam, throwing an error if found', async () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)

      staticman.getSiteConfig = jest.fn(() => {
        staticman.siteConfig = mockConfig

        return Promise.resolve(mockConfig)
      })

      staticman._checkForSpam = jest.fn(fields => {
        return Promise.reject(errorHandler('IS_SPAM'))
      })

      return staticman.processEntry(
        mockHelpers.getFields(),
        {}
      ).catch(err => {
        expect(err).toEqual({
          _smErrorCode: 'IS_SPAM'
        })
      })
    })

    test('validates fields, throwing an error if validation fails', async () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)
      const fields = mockHelpers.getFields()

      mockConfig.set('allowedFields', Object.keys(fields))

      fields.someField1 = 'Some value'

      staticman._checkForSpam = () => Promise.resolve(fields)
      staticman.siteConfig = mockConfig

      return staticman.processEntry(
        mockHelpers.getFields(),
        {}
      ).catch(err => {
        expect(err).toEqual({
          _smErrorCode: 'INVALID_FIELDS',
          data: ['someField1']
        })
      })
    })

    test(
      'creates a file after applying generated fields, transforms and internal fields, throwing an error if file creation fails',
      async () => {
        const Staticman = require('./../../../lib/Staticman')
        const staticman = await new Staticman(mockParameters)
        const fields = mockHelpers.getFields()

        mockConfig.set('allowedFields', Object.keys(fields))

        staticman.siteConfig = mockConfig
        staticman._checkForSpam = () => Promise.resolve(fields)

        const spyApplyGeneratedFields = jest.spyOn(staticman, '_applyGeneratedFields')
        const spyApplyTransforms = jest.spyOn(staticman, '_applyTransforms')
        const spyApplyInternalFields = jest.spyOn(staticman, '_applyInternalFields')

        staticman._createFile = jest.fn(() => {
          return Promise.reject(errorHandler('INVALID_FORMAT'))
        })

        return staticman.processEntry(
          mockHelpers.getFields(),
          {}
        ).catch(err => {
          expect(spyApplyGeneratedFields).toHaveBeenCalled()
          expect(spyApplyTransforms).toHaveBeenCalled()
          expect(spyApplyInternalFields).toHaveBeenCalled()
          expect(err).toEqual({
            _smErrorCode: 'INVALID_FORMAT'
          })
        })
      }
    )

    test('authenticates user before creating file', async () => {
      const mockUser = new User('github', 'johndoe', 'johndoe@test.com', 'John Doe')
      const mockGetCurrentUser = jest.fn(() => Promise.resolve(mockUser))

      jest.mock('../../../lib/GitHub', () => {
        return function () {
          return {
            getCurrentUser: mockGetCurrentUser
          }
        }
      })

      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)
      const fields = mockHelpers.getFields()
      const options = {
        'auth-token': mockHelpers.encrypt('test-token')
      }

      mockConfig.set('auth.required', true)

      staticman.siteConfig = mockConfig
      staticman.parameters.version = '3'
      staticman._checkForSpam = () => Promise.resolve(fields)
      staticman.git.writeFile = jest.fn(() => Promise.resolve())

      const spyCheckAuth = jest.spyOn(staticman, '_checkAuth')

      await staticman.processEntry(fields, options)
      expect(spyCheckAuth).toHaveBeenCalledTimes(1)
      expect(mockGetCurrentUser).toHaveBeenCalledTimes(1)
      expect(staticman.gitUser).toEqual(mockUser)
    })

    test('authenticates user before creating file, throwing an error if unable to authenticate', async () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)
      const fields = mockHelpers.getFields()
      const options = {
        'auth-token': 'invalid token'
      }

      mockConfig.set('auth.required', true)

      staticman.siteConfig = mockConfig
      staticman._checkForSpam = () => Promise.resolve(fields)
      staticman.git.writeFile = jest.fn(() => Promise.resolve())

      return staticman.processEntry(fields, options).catch(err => {
        err._smErrorCode = 'AUTH_TOKEN_INVALID'
      })
    })

    test('subscribes the user to notifications', async () => {
      const mockSubscriptionSet = jest.fn(() => Promise.resolve(true))

      jest.mock('./../../../lib/SubscriptionsManager', () => {
        return jest.fn(() => ({
          send: jest.fn(),
          set: mockSubscriptionSet
        }))
      })

      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)
      const fields = mockHelpers.getFields()
      const options = {
        parent: '1a2b3c4d5e6f',
        subscribe: 'email'
      }

      mockConfig.set('allowedFields', Object.keys(fields))
      mockConfig.set('moderation', false)
      mockConfig.set('notifications.enabled', true)

      staticman.siteConfig = mockConfig
      staticman._checkForSpam = () => Promise.resolve(fields)
      staticman.git.writeFile = jest.fn(() => {
        return Promise.resolve()
      })

      return staticman.processEntry(
        fields,
        options
      ).then(response => {
        expect(mockSubscriptionSet.mock.calls[0][0]).toBe(options.parent)
        expect(mockSubscriptionSet.mock.calls[0][1]).toBe(mockHelpers.getFields().email)
      })
    })

    test('creates a pull request with the generated file if moderation is enabled', async () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)
      const fields = mockHelpers.getFields()

      mockConfig.set('allowedFields', Object.keys(fields))
      mockConfig.set('moderation', true)
      mockConfig.set('notifications.enabled', false)

      staticman.siteConfig = mockConfig
      staticman._checkForSpam = () => Promise.resolve(fields)
      staticman.git.writeFileAndSendReview = jest.fn(() => {
        return Promise.resolve()
      })

      return staticman.processEntry(
        fields,
        {}
      ).then(response => {
        return staticman._createFile(staticman._applyInternalFields(fields))
      }).then(expectedFile => {
        const expectedCommitMessage = staticman._resolvePlaceholders(
          mockConfig.get('commitMessage'), {
            fields,
            options: {}
          }
        )

        expect(staticman.git.writeFileAndSendReview.mock.calls[0][0])
          .toBe(staticman._getNewFilePath(fields))
        expect(staticman.git.writeFileAndSendReview.mock.calls[0][1])
          .toBe(expectedFile)
        expect(staticman.git.writeFileAndSendReview.mock.calls[0][2])
          .toBe(`staticman_${staticman.uid}`)
        expect(staticman.git.writeFileAndSendReview.mock.calls[0][3])
          .toBe(expectedCommitMessage)
        expect(staticman.git.writeFileAndSendReview.mock.calls[0][4])
          .toBe(staticman._generateReviewBody(fields))
      })
    })

    test('commits the generated file directly if moderation is disabled', async () => {
      const mockSubscriptionSend = jest.fn()

      jest.mock('./../../../lib/SubscriptionsManager', () => {
        return jest.fn(() => ({
          send: mockSubscriptionSend,
          set: () => Promise.resolve(true)
        }))
      })

      const Staticman = require('./../../../lib/Staticman')
      const staticman = await new Staticman(mockParameters)
      const fields = mockHelpers.getFields()
      const options = {
        parent: '1a2b3c4d5e6f',
        subscribe: 'email'
      }

      mockConfig.set('allowedFields', Object.keys(fields))
      mockConfig.set('moderation', false)
      mockConfig.set('notifications.enabled', true)

      staticman.siteConfig = mockConfig
      staticman._checkForSpam = () => Promise.resolve(fields)
      staticman.git.writeFile = jest.fn(() => {
        return Promise.resolve()
      })

      return staticman.processEntry(
        fields,
        options
      ).then(response => {
        return staticman._createFile(staticman._applyInternalFields(fields))
      }).then(expectedFile => {
        const expectedCommitMessage = staticman._resolvePlaceholders(
          mockConfig.get('commitMessage'), {
            fields,
            options: {}
          }
        )

        expect(mockSubscriptionSend.mock.calls[0][0]).toBe(options.parent)
        expect(mockSubscriptionSend.mock.calls[0][1]).toEqual(fields)
        expect(staticman.git.writeFile.mock.calls[0][0])
          .toBe(staticman._getNewFilePath(fields))
        expect(staticman.git.writeFile.mock.calls[0][1])
          .toBe(expectedFile)
        expect(staticman.git.writeFile.mock.calls[0][2])
          .toBe(mockParameters.branch)
        expect(staticman.git.writeFile.mock.calls[0][3])
          .toBe(expectedCommitMessage)
      })
    })

    describe('`processMerge()`', () => {
      test('subscribes the user to notifications', async () => {
        const mockSubscriptionSend = jest.fn()

        jest.mock('./../../../lib/SubscriptionsManager', () => {
          return jest.fn(() => ({
            send: mockSubscriptionSend
          }))
        })

        const Staticman = require('./../../../lib/Staticman')
        const staticman = await new Staticman(mockParameters)
        const fields = mockHelpers.getFields()
        const options = {
          parent: '1a2b3c4d5e6f',
          subscribe: 'email'
        }

        mockConfig.set('notifications.enabled', true)

        staticman.siteConfig = mockConfig

        return staticman.processMerge(
          fields,
          options
        ).then(response => {
          expect(mockSubscriptionSend.mock.calls[0][0]).toBe(options.parent)
          expect(mockSubscriptionSend.mock.calls[0][1]).toEqual(fields)
          expect(mockSubscriptionSend.mock.calls[0][2]).toEqual(options)
          expect(mockSubscriptionSend.mock.calls[0][3]).toEqual(mockConfig)
        })
      })
    })
  })
})
