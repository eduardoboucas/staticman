'use strict'

const config = require(__dirname + '/../config')
const Staticman = require('../lib/Staticman')
const Captcha = require('../lib/Captcha')

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

  return staticman.processEntry().then(data => {
    sendResponse(res, {
      redirect: data.redirect,
      fields: data.fields
    })

    if (ua) {
      ua.event('Entries', 'New entry').send()
    }
  }).catch(err => {
    console.log('** ERR:', err.stack || err, options, fields, req.params)

    sendResponse(res, {
      error: err.stack,
      errorCode: 'ENTRY_ERROR',
      redirectError: req.body.options.redirectError
    })

    if (ua) {
      ua.event('Entries', 'New entry error').send()
    }
  })
}

function sendResponse(res, data) {
  const statusCode = data.error ? 500 : 200

  if (!data.error && data.redirect) {
    return res.redirect(data.redirect)
  }

  if (data.error && data.redirectError) {
    return res.redirect(data.redirectError)
  }

  const payload = {
    success: !data.error
  }

  if (data.error) {
    payload.data = data.error
    payload.errorCode = data.errorCode || 'UNKNOWN_ERROR'
  } else {
    payload.fields = data.fields
  }

  res.status(statusCode).send(payload)
}

module.exports = (req, res, next) => {
  const staticman = new Staticman(req)
  const captcha = Captcha.create(staticman)

  staticman.setConfigPath(createConfigObject(req.params.version, req.params.property))
  staticman.setIp(req.headers['x-forwarded-for'] || req.connection.remoteAddress)
  staticman.setUserAgent(req.headers['user-agent'])

  return captcha.checkRecaptcha(req).then(usedRecaptcha => {
    return process(staticman, req, res)
  }).catch(err => {
    return sendResponse(res, {
      error: err,
      errorCode: 'PROCESSING_ERROR',
      redirect: req.body.options.redirect,
      redirectError: req.body.options.redirectError
    })
  })
}
