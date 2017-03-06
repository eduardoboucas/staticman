'use strict'

const config = require(__dirname + '/../config')
const errorHandler = require('../lib/ErrorHandler')
const reCaptcha = require('express-recaptcha')
const Staticman = require('../lib/Staticman')

function checkRecaptcha(staticman, req) {
  return new Promise((resolve, reject) => {
    staticman.getSiteConfig().then(siteConfig => {
      if (!siteConfig.get('reCaptcha.enabled')) {
        return resolve(false)
      }

      const reCaptchaOptions = req.body.options && req.body.options.reCaptcha

      if (!reCaptchaOptions || !reCaptchaOptions.siteKey || !reCaptchaOptions.secret) {
        return reject('Missing reCAPTCHA API credentials')
      }

      let decryptedSecret

      try {
        decryptedSecret = staticman.decrypt(reCaptchaOptions.secret)
      } catch (err) {
        return reject('Could not decrypt reCAPTCHA secret')
      }

      if ((reCaptchaOptions.siteKey) !== siteConfig.get('reCaptcha.siteKey') ||
          (decryptedSecret !== siteConfig.get('reCaptcha.secret'))) {
        return reject('reCAPTCHA options do not match Staticman config')
      }

      reCaptcha.init(reCaptchaOptions.siteKey, decryptedSecret)
      reCaptcha.verify(req, err => {
        if (err) {
          return reject(getErrorMessage(err))
        }

        return resolve(true)
      })
    }).catch(err => reject(err))
  })
}

function createConfigObject(apiVersion, property) {
  let remoteConfig = {}

  if (apiVersion === '1') {
    remoteConfig.file = '_config.yml'
    remoteConfig.path = 'staticman'
  } else {
    remoteConfig.file = 'staticman.yml'
    remoteConfig.path = property || ''
  }

  return remoteConfig
}

function process(staticman, req, res) {
  const ua = config.get('analytics.uaTrackingId') ? require('universal-analytics')(config.get('analytics.uaTrackingId')) : null
  const fields = req.query.fields || req.body.fields
  const options = req.query.options || req.body.options || {}

  return staticman.processEntry(fields, options).then(data => {
    sendResponse(res, {
      redirect: data.redirect,
      fields: data.fields
    })

    if (ua) {
      ua.event('Entries', 'New entry').send()
    }
  }).catch(err => {
    sendResponse(res, Object.assign({}, errorHandler('UNKNOWN_ERROR', {err}), {
      redirectError: req.body.options.redirectError
    }))

    if (ua) {
      ua.event('Entries', 'New entry error').send()
    }
  })
}

function sendResponse(res, data) {
  const statusCode = data._smErrorCode ? 500 : 200

  if (!data._smErrorCode && data.redirect) {
    return res.redirect(data.redirect)
  }

  if (data._smErrorCode && data.redirectError) {
    return res.redirect(data.redirectError)
  }

  let payload = {
    success: !data._smErrorCode
  }

  if (data._smErrorCode) {
    const errorCode = errorHandler.getInstance().getErrorCode(data._smErrorCode)
    const errorMessage = errorHandler.getInstance().getMessage(data._smErrorCode)

    if (errorMessage) {
      payload.message = errorMessage
    }

    payload.errorCode = errorCode
  } else {
    payload.fields = data.fields
  }

  res.status(statusCode).send(payload)
}

module.exports = (req, res, next) => {
  const staticman = new Staticman(req.params)

  staticman.setConfigPath(createConfigObject(req.params.version, req.params.property))
  staticman.setIp(req.headers['x-forwarded-for'] || req.connection.remoteAddress)
  staticman.setUserAgent(req.headers['user-agent'])

  return checkRecaptcha(staticman, req).then(usedRecaptcha => {
    return process(staticman, req, res)
  }).catch(err => {
    return sendResponse(res, {
      error: err,
      redirect: req.body.options.redirect,
      redirectError: req.body.options.redirectError
    })
  })
}
