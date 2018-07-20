const path = require('path')
const config = require(path.join(__dirname, '/../config'))

const ErrorHandler = function () {
  this.ERROR_MESSAGES = {
    'missing-input-secret': 'reCAPTCHA: The secret parameter is missing',
    'invalid-input-secret': 'reCAPTCHA: The secret parameter is invalid or malformed',
    'missing-input-response': 'reCAPTCHA: The response parameter is missing',
    'invalid-input-response': 'reCAPTCHA: The response parameter is invalid or malformed',
    'RECAPTCHA_MISSING_CREDENTIALS': 'Missing reCAPTCHA API credentials',
    'RECAPTCHA_FAILED_DECRYPT': 'Could not decrypt reCAPTCHA secret',
    'RECAPTCHA_CONFIG_MISMATCH': 'reCAPTCHA options do not match Staticman config',
    'PARSING_ERROR': 'Error whilst parsing config file',
    'GITHUB_AUTH_TOKEN_MISSING': 'The site requires a valid GitHub authentication token to be supplied in the `options[github-token]` field'
  }

  this.ERROR_CODE_ALIASES = {
    'missing-input-secret': 'RECAPTCHA_MISSING_INPUT_SECRET',
    'invalid-input-secret': 'RECAPTCHA_INVALID_INPUT_SECRET',
    'missing-input-response': 'RECAPTCHA_MISSING_INPUT_RESPONSE',
    'invalid-input-response': 'RECAPTCHA_INVALID_INPUT_RESPONSE'
  }

  this.HTTP_STATUS = {
    'missing-input-secret': 404,
    'invalid-input-secret': 400,
    'missing-input-response': 404,
    'invalid-input-response': 400,
    'RECAPTCHA_MISSING_CREDENTIALS': 404,
    'RECAPTCHA_FAILED_DECRYPT': 400,
    'RECAPTCHA_CONFIG_MISMATCH': 400,
    'PARSING_ERROR': 400,
    'GITHUB_AUTH_TOKEN_MISSING': 400,
    'MISSING_CONFIG_FIELDS': 400
  }
}

ErrorHandler.prototype.getErrorCode = function (error) {
  return this.ERROR_CODE_ALIASES[error] || error
}

ErrorHandler.prototype.getMessage = function (error) {
  return this.ERROR_MESSAGES[error]
}

ErrorHandler.prototype.getHttpStatus = function (error) {
  let statusCode = 200
  if (error && error.code && /^[2345]\d\d$/.error.code) {
    statusCode = parseInt(error.code)
  } else if (error && error._smErrorCode) {
    statusCode = this.HTTP_STATUS[error._smErrorCode]
  } else if (error) {
    statusCode = 500
  }
  return statusCode
}

ErrorHandler.prototype.log = function (err, instance) {
  let parameters = {}
  let prefix = ''

  if (instance) {
    parameters = instance.getParameters()

    prefix += `${parameters.username}/${parameters.repository}`
  }

  console.log(`${prefix}`, err)
}

ErrorHandler.prototype._save = function (errorCode, data) {
  data = data || {}

  if (data.err) {
    data.err._smErrorCode = data.err._smErrorCode || errorCode

    return data.err
  }

  let payload = {
    _smErrorCode: errorCode
  }

  if (data.data) {
    payload.data = data.data
  }

  return payload
}

const errorHandler = new ErrorHandler()

module.exports = function () {
  return errorHandler._save.apply(errorHandler, arguments)
}

module.exports.getInstance = function () {
  return errorHandler
}
