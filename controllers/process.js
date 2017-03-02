'use strict'

const config = require(__dirname + '/../config')
const Staticman = require('../lib/Staticman')
const reCaptcha = require('express-recaptcha')
let staticman

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

function process(req, res) {
  const ua = config.get('analytics.uaTrackingId') ? require('universal-analytics')(config.get('analytics.uaTrackingId')) : null
  const fields = req.query.fields || req.body.fields
  const options = req.query.options || req.body.options || {}

  staticman.processEntry(fields, options).then(data => {
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

function verifyCaptcha(req, res) {
  return new Promise((resolve, reject) => {
    staticman.getSiteConfig()
      .then(siteConfig => {
        let captchaRequest;

        if (!siteConfig.get('reCaptcha.enabled')) {
          return resolve()
        }

        if(!req.body.options.reCaptcha  || !req.body.options.reCaptcha.siteKey  ||  !req.body.options.reCaptcha.encryptedSecret) {
          return reject('Missing reCAPTCHA API credential.')
        }
        try {
          captchaRequest = {
            siteKey: req.body.options.reCaptcha.siteKey,
            secret: staticman.decrypt(req.body.options.reCaptcha.encryptedSecret)
          }
        } catch(err) {
          return reject('Invalid encryptedSecret')
        }

        if(siteConfig.get('reCaptcha.siteKey') !== captchaRequest.siteKey  || siteConfig.get('reCaptcha.secret') !== captchaRequest.secret) {
          return reject('ReCAPTCHA API credential spoofing is not allowed.')
        }

        reCaptcha.init(captchaRequest.siteKey, captchaRequest.secret)

        reCaptcha.verify(req, (err) => {
          if (err) {
            return reject(err)
          }
          return resolve()
        })
      })
      .catch(err => {
        return reject(err)
      })
  })
}

function main(req, res, next) {
  staticman = new Staticman(req.params)
  staticman.setConfigPath(createConfigObject(req.params.version, req.params.property))
  staticman.setIp(req.headers['x-forwarded-for'] || req.connection.remoteAddress)
  staticman.setUserAgent(req.headers['user-agent'])

  verifyCaptcha(req, res)
    .then(() => {
      return process(req, res)
    })
    .catch(reason => {
      return res.status(500).send({
        success: false,
        errorCode: 'RECAPTCHA_ERROR',
        data: reason
      })
    })
}

module.exports = main