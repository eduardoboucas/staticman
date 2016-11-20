'use strict'

const config = require(__dirname + '/../config')
const Staticman = require('../lib/Staticman')

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

module.exports = ((req, res) => {
  const ua = config.get('analytics.uaTrackingId') ? require('universal-analytics')(config.get('analytics.uaTrackingId')) : null
  const fields = req.query.fields || req.body.fields
  const options = req.query.options || req.body.options || {}

  const staticman = new Staticman(req.params)

  staticman.setConfigPath(createConfigObject(res.locals.apiVersion, req.params.property))
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
    console.log('** ERR:', err.stack || err)

    res.status(500).send(err)

    if (ua) {
      ua.event('Entries', 'New entry error').send()
    }
  })
})
