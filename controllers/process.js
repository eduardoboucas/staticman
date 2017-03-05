'use strict'

const config = require(__dirname + '/../config')
const Staticman = require('../lib/Staticman')
const Captcha = require('../lib/Captcha')
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

  staticman.processEntry().then(data => {
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

function main(req, res, next) {
  staticman = new Staticman(req)
  staticman.setConfigPath(createConfigObject(req.params.version, req.params.property))
  staticman.setIp(req.headers['x-forwarded-for'] || req.connection.remoteAddress)
  staticman.setUserAgent(req.headers['user-agent'])

  const captcha = Captcha.create(staticman)

  captcha.validateRequest(req)
    .then(() => {
      return process(req, res)
    })
    .catch(reason => {
      return res.status(500).send({
        success: false,
        errorCode: 'PROCESSING_ERROR',
        data: reason
      })
    })
}

module.exports = main