const config = require('./../../../config')
const errorHandler = require('./../../../lib/ErrorHandler').getInstance()
const githubToken = config.get('githubToken')
const mockHelpers = require('./../../helpers')
const sampleData = require('./../../helpers/sampleData')

let mockSiteConfig
let req

beforeEach(() => {
  jest.resetModules()

  mockSiteConfig = mockHelpers.getConfig()

  req = mockHelpers.getMockRequest()
})

describe('Process controller', () => {
  describe('checkRecaptcha', () => {
    test('does nothing if reCaptcha is not enabled in config', () => {
      mockSiteConfig.set('reCaptcha.enabled', false)

      jest.mock('./../../../lib/Staticman', () => {
        return jest.fn(parameters => ({
          getSiteConfig: () => Promise.resolve(mockSiteConfig)
        }))
      })

      const checkRecaptcha = require('./../../../controllers/process').checkRecaptcha
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(req.params)

      return checkRecaptcha(staticman, req).then(response => {
        expect(response).toBe(false)
      })
    })

    test('throws an error if reCaptcha block is not in the request body', () => {
      jest.mock('./../../../lib/Staticman', () => {
        return jest.fn(parameters => ({
          getSiteConfig: () => Promise.resolve(mockSiteConfig)
        }))
      })

      const checkRecaptcha = require('./../../../controllers/process').checkRecaptcha
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(req.params)

      mockSiteConfig.set('reCaptcha.enabled', true)

      req.body = {
        options: {}
      }

      return checkRecaptcha(staticman, req).catch(err => {
        expect(err._smErrorCode).toBe('RECAPTCHA_MISSING_CREDENTIALS')
      })
    })

    test('throws an error if reCaptcha site key is not in the request body', () => {
      jest.mock('./../../../lib/Staticman', () => {
        return jest.fn(parameters => ({
          getSiteConfig: () => Promise.resolve(mockSiteConfig)
        }))
      })

      const checkRecaptcha = require('./../../../controllers/process').checkRecaptcha
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(req.params)

      req.body = {
        options: {
          reCaptcha: {
            secret: '1q2w3e4r'
          }
        }
      }

      return checkRecaptcha(staticman, req).catch(err => {
        expect(err._smErrorCode).toBe('RECAPTCHA_MISSING_CREDENTIALS')
      })
    })

    test('throws an error if reCaptcha secret is not in the request body', () => {
      jest.mock('./../../../lib/Staticman', () => {
        return jest.fn(parameters => ({
          getSiteConfig: () => Promise.resolve(mockSiteConfig)
        }))
      })

      const checkRecaptcha = require('./../../../controllers/process').checkRecaptcha
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(req.params)

      req.body = {
        options: {
          reCaptcha: {
            siteKey: '123456789'
          }
        }
      }

      return checkRecaptcha(staticman, req).catch(err => {
        expect(err._smErrorCode).toBe('RECAPTCHA_MISSING_CREDENTIALS')
      })
    })

    test('throws an error if the reCatpcha secret fails to decrypt', () => {
      jest.mock('./../../../lib/Staticman', () => {
        return jest.fn(parameters => ({
          decrypt: () => {
            throw 'someError'
          },
          getSiteConfig: () => Promise.resolve(mockSiteConfig)
        }))
      })

      const checkRecaptcha = require('./../../../controllers/process').checkRecaptcha
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(req.params)

      req.body = {
        options: {
          reCaptcha: {
            siteKey: '123456789',
            secret: '1q2w3e4r'
          }
        }
      }

      return checkRecaptcha(staticman, req).catch(err => {
        expect(err._smErrorCode).toBe('RECAPTCHA_CONFIG_MISMATCH')
      })
    })

    test('throws an error if the reCatpcha siteKey provided does not match the one in config', () => {
      jest.mock('./../../../lib/Staticman', () => {
        return jest.fn(parameters => ({
          getSiteConfig: () => Promise.resolve(mockSiteConfig)
        }))
      })

      const checkRecaptcha = require('./../../../controllers/process').checkRecaptcha
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(req.params)

      req.body = {
        options: {
          reCaptcha: {
            siteKey: '987654321',
            secret: mockSiteConfig.getRaw('reCaptcha.secret')
          }
        }
      }

      return checkRecaptcha(staticman, req).catch(err => {
        expect(err._smErrorCode).toBe('RECAPTCHA_CONFIG_MISMATCH')
      })
    })

    test('throws an error if the reCatpcha secret provided does not match the one in config', () => {
      jest.mock('./../../../lib/Staticman', () => {
        return jest.fn(parameters => ({
          getSiteConfig: () => Promise.resolve(mockSiteConfig)
        }))
      })

      const checkRecaptcha = require('./../../../controllers/process').checkRecaptcha
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(req.params)

      req.body = {
        options: {
          reCaptcha: {
            siteKey: mockSiteConfig.get('reCaptcha.siteKey'),
            secret: mockHelpers.encrypt('some other secret')
          }
        }
      }

      return checkRecaptcha(staticman, req).catch(err => {
        expect(err._smErrorCode).toBe('RECAPTCHA_CONFIG_MISMATCH')
      })
    })

    test('initialises and triggers a verification from the reCaptcha module', () => {
      const mockInitFn = jest.fn()
      const mockVerifyFn = jest.fn((req, reCaptchaCallback) => {
        reCaptchaCallback(false)
      })

      jest.mock('express-recaptcha', () => {
        return {
          init: mockInitFn,
          verify: mockVerifyFn
        }
      })

      jest.mock('./../../../lib/Staticman', () => {
        return jest.fn(parameters => ({
          decrypt: mockHelpers.decrypt,
          getSiteConfig: () => Promise.resolve(mockSiteConfig)
        }))
      })    

      const checkRecaptcha = require('./../../../controllers/process').checkRecaptcha
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(req.params)

      req.body = {
        options: {
          reCaptcha: {
            siteKey: mockSiteConfig.get('reCaptcha.siteKey'),
            secret: mockSiteConfig.getRaw('reCaptcha.secret')
          }
        }
      }

      return checkRecaptcha(staticman, req).then(response => {
        expect(response).toBe(true)
        expect(mockInitFn.mock.calls.length).toBe(1)
        expect(mockInitFn.mock.calls[0][0]).toBe(mockSiteConfig.get('reCaptcha.siteKey'))
        expect(mockInitFn.mock.calls[0][1]).toBe(mockSiteConfig.get('reCaptcha.secret'))
        expect(mockVerifyFn.mock.calls[0][0]).toBe(req)
      })
    })

    test('displays an error if the reCaptcha verification fails', () => {
      const reCaptchaError = new Error('someError')
      const mockInitFn = jest.fn()
      const mockVerifyFn = jest.fn((req, reCaptchaCallback) => {
        reCaptchaCallback(reCaptchaError)
      })

      jest.mock('express-recaptcha', () => {
        return {
          init: mockInitFn,
          verify: mockVerifyFn
        }
      })

      jest.mock('./../../../lib/Staticman', () => {
        return jest.fn(parameters => ({
          decrypt: mockHelpers.decrypt,
          getSiteConfig: () => Promise.resolve(mockSiteConfig)
        }))
      })

      const checkRecaptcha = require('./../../../controllers/process').checkRecaptcha
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(req.params)

      req.body = {
        options: {
          reCaptcha: {
            siteKey: mockSiteConfig.get('reCaptcha.siteKey'),
            secret: mockSiteConfig.getRaw('reCaptcha.secret')
          }
        }
      }

      return checkRecaptcha(staticman, req).catch(err => {
        expect(err).toEqual({
          _smErrorCode: reCaptchaError
        })
      })
    })
  })

  describe('createConfigObject', () => {
    const createConfigObject = require('./../../../controllers/process').createConfigObject

    test('creates a config object for version 1 of API', () => {
      const configv1 = {
        file: '_config.yml',
        path: 'staticman'
      }

      const config1 = createConfigObject('1')
      const config2 = createConfigObject('1', 'someProperty')

      expect(config1).toEqual(configv1)
      expect(config2).toEqual(configv1)
    })

    test('creates a config object for version 2+ of API', () => {
      const configv2File = 'staticman.yml'

      const config3 = createConfigObject('2')
      const config4 = createConfigObject('2', 'someProperty')
      const config5 = createConfigObject()

      expect(config3).toEqual({
        file: configv2File,
        path: ''
      })
      expect(config4).toEqual({
        file: configv2File,
        path: 'someProperty'
      })
      expect(config5).toEqual({
        file: configv2File,
        path: ''
      })
    })
  })

  describe('process', () => {
    const processFn = require('./../../../controllers/process').process

    test('send a redirect to the URL provided, if the `redirect` option is provided, if `processEntry` succeeds', () => {
      const redirectUrl = 'https://eduardoboucas.com'
      const mockProcessEntry = jest.fn((fields, options) => Promise.resolve({
        fields: ['name', 'email'],
        redirect: redirectUrl
      }))

      jest.mock('./../../../lib/Staticman', () => {
        return jest.fn(parameters => ({
          processEntry: mockProcessEntry
        }))
      })

      const res = mockHelpers.getMockResponse()

      const checkRecaptcha = require('./../../../controllers/process').checkRecaptcha
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(req.params)

      req.body = {
        fields: {
          name: 'Eduardo Boucas',
          email: 'mail@eduardoboucas.com'
        },
        options: {
          reCaptcha: {
            siteKey: mockSiteConfig.get('reCaptcha.siteKey'),
            secret: mockSiteConfig.getRaw('reCaptcha.secret')
          },
          redirect: redirectUrl
        }
      }
      req.query = {}

      return processFn(staticman, req, res).then(response => {
        expect(res.redirect.mock.calls.length).toBe(1)
        expect(res.redirect.mock.calls[0][0]).toBe(redirectUrl)
      })
    })

    test('deliver an object with the processed fields if `processEntry` succeeds', () => {
      const fields = {
        name: 'Eduardo Boucas',
        email: 'mail@eduardoboucas.com'
      }
      const mockProcessEntry = jest.fn((fields, options) => Promise.resolve({
        fields: fields
      }))

      jest.mock('./../../../lib/Staticman', () => {
        return jest.fn(parameters => ({
          processEntry: mockProcessEntry
        }))
      })

      const res = mockHelpers.getMockResponse()

      const checkRecaptcha = require('./../../../controllers/process').checkRecaptcha
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(req.params)

      req.body = {
        fields: fields,
        options: {
          reCaptcha: {
            siteKey: mockSiteConfig.get('reCaptcha.siteKey'),
            secret: mockSiteConfig.getRaw('reCaptcha.secret')
          }
        }
      }
      req.query = {}

      return processFn(staticman, req, res).then(response => {
        expect(res.send.mock.calls.length).toBe(1)
        expect(res.send.mock.calls[0][0]).toEqual({
          fields: fields,
          success: true
        })
      })
    })

    test('reject if `processEntry` fails', () => {
      const processEntryError = new Error('someError')
      const mockProcessEntry = jest.fn((fields, options) => {
        return Promise.reject(processEntryError)
      })

      jest.mock('./../../../lib/Staticman', () => {
        return jest.fn(parameters => ({
          processEntry: mockProcessEntry
        }))
      })

      const res = mockHelpers.getMockResponse()

      const checkRecaptcha = require('./../../../controllers/process').checkRecaptcha
      const Staticman = require('./../../../lib/Staticman')
      const staticman = new Staticman(req.params)

      req.body = {
        fields: {
          name: 'Eduardo Boucas',
          email: 'mail@eduardoboucas.com'
        },
        options: {
          reCaptcha: {
            siteKey: mockSiteConfig.get('reCaptcha.siteKey'),
            secret: mockSiteConfig.getRaw('reCaptcha.secret')
          }
        }
      }
      req.query = {}

      return processFn(staticman, req, res).catch(err => {
        expect(err).toEqual(processEntryError)
      })
    })
  })

  describe('sendResponse', () => {
    const sendResponse = require('./../../../controllers/process').sendResponse

    test('redirects if there is a `redirect` option and no errors', () => {
      const data = {
        redirect: 'https://eduardoboucas.com'
      }

      const res = mockHelpers.getMockResponse()

      sendResponse(res, data)

      expect(res.redirect.mock.calls.length).toBe(1)
      expect(res.redirect.mock.calls[0][0]).toBe(data.redirect)
    })

    test('redirects if there is a `redirectError` option there is an error', () => {
      const data = {
        err: 'someError',
        redirect: 'https://eduardoboucas.com',
        redirectError: 'https://eduardoboucas.com/error'
      }

      const res = mockHelpers.getMockResponse()

      sendResponse(res, data)

      expect(res.redirect.mock.calls.length).toBe(1)
      expect(res.redirect.mock.calls[0][0]).toBe(data.redirectError)
    })

    test('sends a 200 with a fields object if there are no errors', () => {
      const data = {
        fields: {
          name: 'Eduardo Bouças',
          email: 'mail@eduardoboucas.com'
        }
      }

      const res = mockHelpers.getMockResponse()

      sendResponse(res, data)

      expect(res.send.mock.calls.length).toBe(1)
      expect(res.send.mock.calls[0][0]).toEqual({
        success: true,
        fields: data.fields
      })
      expect(res.status.mock.calls.length).toBe(1)
      expect(res.status.mock.calls[0][0]).toBe(200)
    })

    test('sends a 500 with an error object if there is an error', () => {
      const data = {
        err: {
          _smErrorCode: 'missing-input-secret'
        },
        redirect: 'https://eduardoboucas.com'
      }

      const res = mockHelpers.getMockResponse()

      sendResponse(res, data)

      expect(res.send.mock.calls.length).toBe(1)
      expect(res.send.mock.calls[0][0].success).toBe(false)
      expect(res.send.mock.calls[0][0].message).toBe(
        errorHandler.getMessage(data.err._smErrorCode)
      )
      expect(res.send.mock.calls[0][0].errorCode).toBe(
        errorHandler.getErrorCode(data.err._smErrorCode)
      )
      expect(res.status.mock.calls.length).toBe(1)
      expect(res.status.mock.calls[0][0]).toBe(500)
    })
  })
})
