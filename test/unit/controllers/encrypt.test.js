const config = require('./../../../config')
const helpers = require('./../../helpers')

let encrypt
let mockEncryptFn
let mockImportKeyFn
let req
let res

beforeEach(() => {
  req = helpers.getMockRequest()
  res = helpers.getMockResponse()

  mockEncryptFn = jest.fn(() => 'Encrypted text')
  mockImportKeyFn = jest.fn()

  jest.mock('node-rsa', () => {
    return jest.fn(() => ({
      encrypt: mockEncryptFn,
      importKey: mockImportKeyFn
    }))
  })

  encrypt = require('./../../../controllers/encrypt')
})

describe('Encrypt controller', () => {
  test('returns an encrypted version of the given text', () => {
    req.params.text = 'This is the text to encrypt'

    encrypt(req, res)

    expect(mockEncryptFn.mock.calls[0][0]).toBe(req.params.text)
    expect(res.send.mock.calls[0][0]).toBe('Encrypted text')
  })
})
