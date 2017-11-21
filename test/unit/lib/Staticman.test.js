const config = require('./../../../config')
const errorHandler = require('./../../../lib/ErrorHandler')
const frontMatter = require('front-matter')
const md5 = require('md5')
const moment = require('moment')
const mockHelpers = require('./../../helpers')
const querystring = require('querystring')
const slugify = require('slug')
const yaml = require('js-yaml')

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
    test('creates an instance of the GitHub module', () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)

      expect(staticman.github.options.username).toBe(mockParameters.username)
      expect(staticman.github.options.repository).toBe(mockParameters.repository)
      expect(staticman.github.options.branch).toBe(mockParameters.branch)
      expect(staticman.github.api).toBeDefined()
    })

    test('generates a new unique ID', () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman1 = new Staticman(mockParameters)
      const staticman2 = new Staticman(mockParameters)

      expect(staticman1.uid.length).toBeGreaterThan(0)
      expect(staticman2.uid.length).toBeGreaterThan(0)
      expect(staticman1.uid).not.toBe(staticman2.uid)
    })

    test('creates an instance of the NodeRSA module and import the private key', () => {
      const mockImportKeyFn = jest.fn()

      jest.mock('node-rsa', () => {
        return jest.fn(() => ({
          importKey: mockImportKeyFn
        }))
      })

      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)

      expect(staticman.rsa).toBeDefined()
      expect(mockImportKeyFn).toHaveBeenCalled()
      expect(mockImportKeyFn.mock.calls[0][0]).toBe(config.get('rsaPrivateKey'))
    })

    test('saves an internal reference to the parameters provided', () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)

      expect(staticman.parameters).toEqual(mockParameters)
    })

    test('exposes the parameters via the `getParameters()` method', () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)

      expect(staticman.getParameters()).toEqual(staticman.parameters)
    })

    test('sets the config path via the `setConfigPath()` method', () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)
      const configObject = mockHelpers.getConfigObject()

      staticman.setConfigPath(configObject)

      expect(staticman.configPath).toEqual(configObject)
    })

    test('sets the request IP via the `setIp()` method', () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)
      const ip = '123.456.78.9'

      staticman.setIp(ip)

      expect(staticman.ip).toEqual(ip)
    })

    test('sets the request User Agent via the `setUserAgent()` method', () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)
      const userAgent = mockHelpers.getUserAgent()

      staticman.setUserAgent(userAgent)

      expect(staticman.userAgent).toEqual(userAgent)
    })
  })

  describe('internal fields', () => {
    test('adds an _id field to the data object', () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)

      staticman.options = {}
      
      const data = mockHelpers.getFields()
      const extendedData = staticman._applyInternalFields(data)

      expect(extendedData).toEqual(Object.assign({}, data, {
        _id: staticman.uid
      }))
    })

    test('adds an _parent field if the parent option is defined', () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman1 = new Staticman(mockParameters)
      const staticman2 = new Staticman(mockParameters)

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
    test('returns the data object unchanged if the `generatedFields` property is not in the site config', () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)

      mockConfig.set('generatedFields', undefined)
      staticman.siteConfig = mockConfig

      const extendedData = staticman._applyGeneratedFields(mockHelpers.getFields())

      expect(extendedData).toEqual(mockHelpers.getFields())
    })

    test('adds the generated fields to the data object', () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)

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
  })

  describe('field transforms', () => {
    test('returns the data object unchanged if the `transforms` property is not in the site config', () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)

      mockConfig.set('transforms', undefined)
      staticman.siteConfig = mockConfig

      const data = mockHelpers.getFields()

      return staticman._applyTransforms(data).then(extendedData => {
        expect(extendedData).toEqual(data)
      })
    })

    test('transforms the fields defined in the `transforms` property', () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)

      mockConfig.set('transforms', {
        email: 'md5'
      })
      staticman.siteConfig = mockConfig

      const data = mockHelpers.getFields()
      const extendedData = Object.assign({}, data, {
        email: md5(data.email)
      })

      return staticman._applyTransforms(data).then(transformedData => {
        expect(transformedData).toEqual(extendedData)
      })
    })
  })

  describe('spam detection', () => {
    test('returns the data object unchanged if Akismet is not enabled in config', () => {
      const fields = mockHelpers.getFields()
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)

      mockConfig.set('akismet.enabled', false)
      staticman.siteConfig = mockConfig

      const catchAllMockRequest = mockHelpers.getCatchAllApiMock()

      return staticman._checkForSpam(fields).then(response => {
        expect(response).toEqual(fields)
        expect(catchAllMockRequest.hasIntercepted()).toBe(false)
      })
    })

    test('makes a request to the Akismet API sending the correct data', () => {
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
      const staticman = new Staticman(mockParameters)

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

    test('throws an error if the Akismet API call fails', () => {
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
      const staticman = new Staticman(mockParameters)

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

    test('throws an error if the content is flagged as spam', () => {
      const akismetError = new Error('Akismet error')
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
      const staticman = new Staticman(mockParameters)

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

  describe('date creator', () => {
    const mockDate = new Date('1988-08-31T11:00:00')

    Date = class extends Date {
      constructor() {
        return mockDate
      }
    }

    test('creates a timestamp in milliseconds if the format is set to `timestamp`', () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)

      const date = staticman._createDate({
        format: 'timestamp'
      })

      expect(date).toBe(mockDate.getTime())
    })

    test('creates a timestamp in seconds if the format is set to `timestamp-seconds`', () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)

      const date = staticman._createDate({
        format: 'timestamp-seconds'
      })

      expect(date).toBe(Math.floor(mockDate.getTime() / 1000))
    })

    test('creates a ISO-8601 representation of the date if the format is set to `iso8601`, absent, or set to none of the other supported formats', () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)

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
    })
  })

  describe('file formatting', () => {
    test('formats the given fields as JSON if `format` is set to `json`', () => {
      const fields = mockHelpers.getFields()
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)

      mockConfig.set('format', 'json')
      staticman.siteConfig = mockConfig

      return staticman._createFile(fields).then(file => {
        expect(file).toBe(JSON.stringify(fields))
      })
    })

    test('formats the given fields as YAML if `format` is set to `yaml` or `yml`', () => {
      const fields = mockHelpers.getFields()
      const Staticman = require('./../../../lib/Staticman')
      const staticman1 = new Staticman(mockParameters)
      const staticman2 = new Staticman(mockParameters)
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

    test('formats the given fields as YAML/Frontmatter if `format` is set to `frontmatter`', () => {
      const fields = mockHelpers.getFields()
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)

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

    test('throws an error if `format` is set to `frontmatter` but there is no `frontmatterContent` transform defined', () => {
      const fields = mockHelpers.getFields()
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)

      mockConfig.set('format', 'frontmatter')
      mockConfig.set('transforms', undefined)
      staticman.siteConfig = mockConfig

      return staticman._createFile(fields).catch(err => {
        expect(err).toEqual({
          _smErrorCode: 'NO_FRONTMATTER_CONTENT_TRANSFORM'
        })
      })
    })

    test('throws an error if `format` contains an invalid format', () => {
      const fields = mockHelpers.getFields()
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)

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
    test('generates a PR body with the message set in config and a table listing fields and their values', () => {
      const fields = mockHelpers.getFields()
      const fieldsTable = mockHelpers.getFieldsTable()
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)
      
      mockConfig.set('notifications.enabled', false)
      staticman.siteConfig = mockConfig

      const pullRequestBody = staticman._generatePRBody(fields)

      expect(pullRequestBody).toBe(mockConfig.get('pullRequestBody') + fieldsTable)
    })

    test('adds an HTML comment containing notification settings if `notifications.enabled` is set to `true`', () => {
      const req = mockHelpers.getMockRequest()
      const configObject = {
        file: 'staticman.yml',
        path: req.params.property
      }
      const fields = mockHelpers.getFields()
      const fieldsTable = mockHelpers.getFieldsTable()
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)

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
      const pullRequestBody = staticman._generatePRBody(fields)

      expect(pullRequestBody).toBe(
        mockConfig.get('pullRequestBody') +
        fieldsTable +
        notificationsComment
      )
    })
  })

  describe('computes the full path and extension for new files', () => {
    test('uses UID as the default file name and extension if `filename` and `extension` are not set in config', () => {
      const fields = mockHelpers.getFields()
      const directory = 'some/directory'
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)

      mockConfig.set('filename', '')
      mockConfig.set('format', 'json')
      mockConfig.set('path', directory)
      staticman.siteConfig = mockConfig

      const filePath = staticman._getNewFilePath(fields)

      expect(filePath).toBe(`${directory}/${staticman.uid}.json`)
    })

    test('uses the config value of `filename`, if defined, as the file name', () => {
      const fields = mockHelpers.getFields()
      const directory = 'some/directory'
      const name = 'my-file'
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)

      mockConfig.set('filename', name)
      mockConfig.set('format', 'json')
      mockConfig.set('path', directory)
      staticman.siteConfig = mockConfig

      const filePath = staticman._getNewFilePath(fields)

      expect(filePath).toBe(`${directory}/${name}.json`)
    })

    test('uses the config value of `extension`, if defined, as the file extension', () => {
      const fields = mockHelpers.getFields()
      const directory = 'some/directory'
      const name = 'my-file'
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)

      mockConfig.set('extension', 'html')
      mockConfig.set('filename', name)
      mockConfig.set('format', 'json')
      mockConfig.set('path', directory)
      staticman.siteConfig = mockConfig

      const filePath = staticman._getNewFilePath(fields)

      expect(filePath).toBe(`${directory}/${name}.html`)
    })

    test('removes a trailing slash from `path` if it exists', () => {
      const fields = mockHelpers.getFields()
      const Staticman = require('./../../../lib/Staticman')
      const staticman1 = new Staticman(mockParameters)
      const staticman2 = new Staticman(mockParameters)
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

    test('resolves placeholders in the filename and path', () => {
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
      const staticman = new Staticman(mockParameters)

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

    test('gets the correct extension for each supported format', () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)

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
    test('returns the given string unchanged if it does not contain placeholders', () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)
      
      const subject = 'This is a normal string, nothing to replace here.'
      const data = mockHelpers.getParameters()

      expect(staticman._resolvePlaceholders(subject, data)).toBe(subject)
    })

    test('returns the given string with placeholders replaced with data from the data object provided', () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)
      
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

    test('returns the given string with special placeholders replaced', () => {
      const mockDate = new Date('1988-08-31T11:00:00')

      Date = class extends Date {
        constructor() {
          return mockDate
        }
      }

      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)
      
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

    test('returns the given string with `date:` placeholders replaced', () => {
      const mockDate = new Date('1988-08-31T11:00:00')

      Date = class extends Date {
        constructor() {
          return mockDate
        }
      }

      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)

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
    test('throws an error if no config is provided', () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)

      expect(staticman._validateConfig(null)).toEqual({
        _smErrorCode: 'MISSING_CONFIG_BLOCK'
      })
    })

    test('throws an error if the config provided is missing any of the required fields', () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)
      const config = {
        allowedFields: ['name', 'email'],
        format: 'json'
      }

      expect(staticman._validateConfig(config)).toEqual({
        _smErrorCode: 'MISSING_CONFIG_FIELDS',
        data: ['branch', 'path']
      })
    })

    test('creates a SiteConfig object and assigns it to the Staticman instance', () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)
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
    test('throws an error if the payload contains a field that is not allowed', () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)
      const payload = mockHelpers.getFields()

      mockConfig.set('allowedFields', ['streetName', 'country'])

      staticman.siteConfig = mockConfig

      const validationResult = staticman._validateFields(payload)

      expect(validationResult._smErrorCode).toBe('INVALID_FIELDS')
      expect(validationResult.data).toEqual(Object.keys(payload))
    })

    test('returns a copy of the fields provided with all strings trimmed', () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)
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

    test('throws an error if the payload is missing a required field', () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)
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
    test('returns the existing site config if `force` is falsy', () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)

      staticman.siteConfig = mockConfig

      return staticman.getSiteConfig().then(config => {
        expect(config).toEqual(mockConfig)
      })
    })

    test('throws an error if the config path has not been set', () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)

      return staticman.getSiteConfig().catch(err => {
        expect(err).toEqual({
          _smErrorCode: 'NO_CONFIG_PATH'
        })
      })
    })

    test('fetches the site config from the repository, even if there is one already defined, if `force` is truthy', () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)
      const configObject = mockHelpers.getConfigObject()
      
      staticman.setConfigPath(configObject)
      staticman.siteConfig = mockConfig
      staticman.github = {
        readFile: jest.fn(() => {
          const config = Object.assign({}, mockConfig.getProperties())

          config.reCaptcha.secret = mockConfig.getRaw('reCaptcha.secret')

          return Promise.resolve({
            [configObject.path]: config
          })
        })
      }

      return staticman.getSiteConfig(true).then(config => {
        expect(staticman.github.readFile).toHaveBeenCalledTimes(1)
        expect(staticman.github.readFile.mock.calls[0][0]).toBe(configObject.file)
      })
    })

    test('fetches the site config from the repository and throws an error if it fails validation', () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)
      const configObject = mockHelpers.getConfigObject()
      const mockRemoteConfig = Object.assign({}, mockConfig.getProperties())
      const validationErrors = {
        _smErrorCode: 'MISSING_CONFIG_FIELDS',
        data: ['branch', 'path']
      }

      mockRemoteConfig.reCaptcha.secret = mockConfig.getRaw('reCaptcha.secret')
      
      staticman.setConfigPath(configObject)
      staticman.github = {
        readFile: jest.fn(() => {
          return Promise.resolve({
            [configObject.path]: mockRemoteConfig
          })
        })
      }
      staticman._validateConfig = jest.fn(() => validationErrors)

      return staticman.getSiteConfig().catch(err => {
        expect(err).toEqual(validationErrors)
        expect(staticman._validateConfig.mock.calls[0][0]).toEqual(mockRemoteConfig)
      })
    })

    test('fetches the site config from the repository and throws an error if it fails validation', () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)
      const configObject = mockHelpers.getConfigObject()
      const mockRemoteConfig = Object.assign({}, mockConfig.getProperties())

      mockRemoteConfig.branch = 'some-other-branch'
      mockRemoteConfig.reCaptcha.secret = mockConfig.getRaw('reCaptcha.secret')
      
      staticman.setConfigPath(configObject)
      staticman.github = {
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

    test('fetches the site config from the repository and returns the new site config object', () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)
      const configObject = mockHelpers.getConfigObject()
      const mockRemoteConfig = Object.assign({}, mockConfig.getProperties())

      mockRemoteConfig.reCaptcha.secret = mockConfig.getRaw('reCaptcha.secret')
      
      staticman.setConfigPath(configObject)
      staticman.github = {
        readFile: jest.fn(() => {
          return Promise.resolve({
            [configObject.path]: mockRemoteConfig
          })
        })
      }

      return staticman.getSiteConfig().then(config => {
        expect(config.getProperties()).toEqual(mockConfig.getProperties())
      })
    })
  })

  describe('`processEntry()`', () => {
    test.only('gets site config and checks for spam, throwing an error if found', () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)

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

    test('validates fields, throwing an error if validation fails', () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)
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

    test('creates a file after applying generated fields, transforms and internal fields, throwing an error if file creation fails', () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)
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
    })

    test('subscribes the user to notifications', () => {
      const mockSubscriptionSet = jest.fn(() => Promise.resolve(true))

      jest.mock('./../../../lib/SubscriptionsManager', () => {
        return jest.fn(() => ({
          send: jest.fn(),
          set: mockSubscriptionSet
        }))
      })

      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)
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
      staticman.github.writeFile = jest.fn(() => {
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

    test('creates a pull request with the generated file if moderation is enabled', () => {
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)
      const fields = mockHelpers.getFields()

      mockConfig.set('allowedFields', Object.keys(fields))
      mockConfig.set('moderation', true)
      mockConfig.set('notifications.enabled', false)

      staticman.siteConfig = mockConfig
      staticman._checkForSpam = () => Promise.resolve(fields)
      staticman.github.writeFileAndSendPR = jest.fn(() => {
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

        expect(staticman.github.writeFileAndSendPR.mock.calls[0][0])
          .toBe(staticman._getNewFilePath(fields))
        expect(staticman.github.writeFileAndSendPR.mock.calls[0][1])
          .toBe(expectedFile)
        expect(staticman.github.writeFileAndSendPR.mock.calls[0][2])
          .toBe(`staticman_${staticman.uid}`)
        expect(staticman.github.writeFileAndSendPR.mock.calls[0][3])
          .toBe(expectedCommitMessage)
        expect(staticman.github.writeFileAndSendPR.mock.calls[0][4])
          .toBe(staticman._generatePRBody(fields))
      })
    })

    test('commits the generated file directly if moderation is disabled', () => {
      const mockSubscriptionSend = jest.fn()

      jest.mock('./../../../lib/SubscriptionsManager', () => {
        return jest.fn(() => ({
          send: mockSubscriptionSend,
          set: () => Promise.resolve(true)
        }))
      })

      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)
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
      staticman.github.writeFile = jest.fn(() => {
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
        expect(staticman.github.writeFile.mock.calls[0][0])
          .toBe(staticman._getNewFilePath(fields))
        expect(staticman.github.writeFile.mock.calls[0][1])
          .toBe(expectedFile)
        expect(staticman.github.writeFile.mock.calls[0][2])
          .toBe(mockParameters.branch)
        expect(staticman.github.writeFile.mock.calls[0][3])
          .toBe(expectedCommitMessage)
      })
    })
  })

  describe('`processMerge()`', () => {
    test('subscribes the user to notifications', () => {
      const mockSubscriptionSend = jest.fn()

      jest.mock('./../../../lib/SubscriptionsManager', () => {
        return jest.fn(() => ({
          send: mockSubscriptionSend
        }))
      })

      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(mockParameters)
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

