'use strict'

const config = require(__dirname + '/../config')
const Staticman = require('../lib/Staticman')
const reCaptcha = require('express-recaptcha')

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
          return reject(getRecaptchaError(err))
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
    if (data.redirect) {
      res.redirect(data.redirect)
    } else {
      res.send({
        success: true,
        fields: data.fields
      })
    }

    if (ua) {
      ua.event('Entries', 'New entry').send()
    }
  }).catch(err => {
    console.log('** ERR:', err.stack || err, options, fields, req.params)

    res.status(500).send(err)

    if (ua) {
      ua.event('Entries', 'New entry error').send()
    }
  })
}

function getRecaptchaError(errorCode) {
  switch (errorCode) {
    case 'missing-input-secret':
      return 'reCAPTCHA: The secret parameter is missing'

    case 'invalid-input-secret':
      return 'reCAPTCHA: The secret parameter is invalid or malformed'

    case 'missing-input-response':
      return 'reCAPTCHA: The response parameter is missing'

    case 'invalid-input-response':
      return 'reCAPTCHA: The response parameter is invalid or malformed'
  }

  return errorCode
}

module.exports = (req, res, next) => {
  const staticman = new Staticman(req.params)

  staticman.setConfigPath(createConfigObject(req.params.version, req.params.property))
  staticman.setIp(req.headers['x-forwarded-for'] || req.connection.remoteAddress)
  staticman.setUserAgent(req.headers['user-agent'])

  return checkRecaptcha(staticman, req).then(usedRecaptcha => {
    return process(staticman, req, res)
  }).catch(err => {
    return res.status(500).send({
      success: false,
      errorCode: 'RECAPTCHA_ERROR',
      data: err
    })
  })
}
