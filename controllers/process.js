'use strict'

const config = require(__dirname + '/../config')
const Staticman = require('../lib/Staticman')
let staticman;
const NodeRSA = require('node-rsa')
const recaptcha = require('express-recaptcha');

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

function decrypt(encrypted) {
  // Initialise RSA
  const rsa = new NodeRSA();
  rsa.importKey(config.get('rsaPrivateKey'), 'private');

  return rsa.decrypt(encrypted, 'utf8');
}

function verifyCAPTCHA(req, res) {
  return new Promise((resolve, reject) => {

    if (!config.get('reCAPTCHA.enabled')) {
      return resolve();
    }

    // Init reCAPTCHA
    recaptcha.init(req.body.options.reCAPTCHA.siteKey, decrypt(req.body.options.reCAPTCHA.encryptedSecret));
    recaptcha.verify(req, function (err) {

      if (!err) {
        return resolve()
      } else {
        return reject(res.status(500).send({
          success: false,
          errorCode: 'RECAPTCHA_ERROR',
          data: err
        }))
      }
    });

  })
}

function process(req, res) {
  const ua = config.get('analytics.uaTrackingId') ? require('universal-analytics')(config.get('analytics.uaTrackingId')) : null
  const fields = req.query.fields || req.body.fields
  const options = req.query.options || req.body.options || {}

  staticman.setConfigPath(createConfigObject(req.params.version, req.params.property))
  staticman.setIp(req.headers['x-forwarded-for'] || req.connection.remoteAddress)
  staticman.setUserAgent(req.headers['user-agent'])

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

module.exports = (req, res, next) => {
  staticman = new Staticman(req.params)

  verifyCAPTCHA(req, res)
    .then(() => {
      return process(req, res)
    })
    .catch((res) => {
      return next(res)
    })
};