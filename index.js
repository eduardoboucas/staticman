var bodyParser = require('body-parser')
var express = require('express')
var GitHubApi = require('github')
var objectPath = require('object-path')
var Staticman = require('./lib/Staticman')

// ------------------------------------
// Config
// ------------------------------------

var config = {}

try {
  config = require(__dirname + '/config.json')
} catch(e) {}

config.port = config.port || process.env.PORT
config.akismetSite = config.akismetSite || process.env.AKISMET_SITE
config.akismetApiKey = config.akismetApiKey || process.env.AKISMET_API_KEY

// ------------------------------------
// Server
// ------------------------------------

var server = express()
server.use(bodyParser.json())
server.use(bodyParser.urlencoded({extended: true}))

var requireParams = (params) => {
  return function (req, res, next) {
    var missingParams = []

    params.forEach((param) => {
      if ((objectPath.get(req.query, param) === undefined) && (objectPath.get(req.body, param) === undefined)) {
        missingParams.push(param)
      }
    })

    if (missingParams.length) {
      return res.status(500).send({
        success: false,
        errorCode: 'MISSING_PARAMS',
        data: missingParams
      })
    }

    return next()
  }
}

server.post('/v1/entry', requireParams([
  'fields',
  'options.username',
  'options.repo'
]), (req, res) => {
  var fields = req.query.fields || req.body.fields
  var options = req.query.options || req.body.options

  var staticman = new Staticman(options, config)

  staticman.setIp(req.headers['x-forwarded-for'] || req.connection.remoteAddress)

  staticman.process(fields, options).then((fields) => {
    res.send({
      success: true,
      fields: fields
    })
  }).catch((err) => {
    res.status(500).send(err)
  })
})

server.listen(config.port, function () {
  console.log('[Staticman] Server listening on port', config.port)
})
