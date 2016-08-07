var bodyParser = require('body-parser')
var express = require('express')
var GitHubApi = require('github')
var objectPath = require('object-path')
var Staticman = require('./lib/Staticman')

// ------------------------------------
// Local config (optional)
// ------------------------------------

var config = {}

try {
  config = require(__dirname + '/config.json')
} catch(e) {}

// ------------------------------------
// Server
// ------------------------------------

var server = express()
server.use(bodyParser.json())
server.use(bodyParser.urlencoded({extended: true}))

var port = process.env.PORT || config.port
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

  var staticman = new Staticman(options, config.github.token)

  staticman.process(fields, options).then((res) => {
    res.send(res)
  }).catch((err) => {
    res.status(500).send(err)
  })
})

server.listen(port, function () {
  console.log('[Staticman] Server listening on port', port)
})
