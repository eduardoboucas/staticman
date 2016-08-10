var bodyParser = require('body-parser')
var express = require('express')
var ExpressBrute = require('express-brute')
var GithubWebHook = require('express-github-webhook')
var objectPath = require('object-path')

// ------------------------------------
// Config
// ------------------------------------

var config = {}

try {
  config = require(__dirname + '/config.json')
} catch(e) {}

config.port = config.port || process.env.PORT
config.githubToken = config.githubToken || process.env.GITHUB_TOKEN
config.akismetSite = config.akismetSite || process.env.AKISMET_SITE
config.akismetApiKey = config.akismetApiKey || process.env.AKISMET_API_KEY

// ------------------------------------
// Server
// ------------------------------------

var server = express()
server.use(bodyParser.json())
server.use(bodyParser.urlencoded({extended: true}))

// GitHub webhook middleware
var webhookHandler = GithubWebHook({
  path: '/v1/webhook'
})
server.use(webhookHandler)

// Brute force protection
var store = new ExpressBrute.MemoryStore()
var bruteforce = new ExpressBrute(store)

// Enable CORS
server.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  
  next()
})

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

// Route: connect
server.get('/v1/connect/:username/:repository', bruteforce.prevent, require('./controllers/connect')(config))

// Route: process
server.post('/v1/entry/:username/:repository/:branch', bruteforce.prevent, requireParams(['fields']), require('./controllers/process')(config))

// GitHub webhook route
webhookHandler.on('pull_request', require('./controllers/handlePR')(config))

server.listen(config.port, function () {
  console.log('[Staticman] Server listening on port', config.port)
})
