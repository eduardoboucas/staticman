const config = require(__dirname + '/../config')
const Raven = require('raven')

const ErrorHandler = function () {
  if (config.get('sentryDSN')) {
    this.raven = require('raven')
    this.raven.config(config.get('sentryDSN')).install()
  }

  this.ERROR_MESSAGES = {
    'missing-input-secret': 'reCAPTCHA: The secret parameter is missing',
    'invalid-input-secret': 'reCAPTCHA: The secret parameter is invalid or malformed',
    'missing-input-response': 'reCAPTCHA: The response parameter is missing',
    'invalid-input-response': 'reCAPTCHA: The response parameter is invalid or malformed'
  }

  this.ERROR_CODE_ALIASES = {
    'missing-input-secret': 'RECAPTCHA_MISSING_INPUT_SECRET',
    'invalid-input-secret': 'RECAPTCHA_INVALID_INPUT_SECRET',
    'missing-input-response': 'RECAPTCHA_MISSING_INPUT_RESPONSE',
    'invalid-input-response': 'RECAPTCHA_INVALID_INPUT_RESPONSE'
  }
}

ErrorHandler.prototype.getErrorCode = function (error) {
  return this.ERROR_CODE_ALIASES[error] || error
}

ErrorHandler.prototype.getMessage = function (error) {
  return this.ERROR_MESSAGES[error]
}

ErrorHandler.prototype.log = function (err, instance) {
  let parameters = {}
  let prefix = ''

  if (instance) {
    parameters = instance.getParameters()

    prefix += `${parameters.username}/${parameters.repository}`
  }

  if (this.raven) {
    this.raven.captureException(err, {
      extra: parameters
    })
  } else {
    console.log(`${prefix}`, err)
  }
}

ErrorHandler.prototype._save = function (errorCode, data) {
  data = data || {}

  if (data.err && !data.err._smErrorCode) {
    this.log(data.err, data.instance)
  }

  if (data.err && data.err._smErrorCode) {
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
