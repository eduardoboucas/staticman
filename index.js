'use strict'

const bodyParser = require('body-parser')
const config = require('./config')
const express = require('express')
const ExpressBrute = require('express-brute')
const GithubWebHook = require('express-github-webhook')
const objectPath = require('object-path')

// ------------------------------------
// Server
// ------------------------------------

const server = express()
server.use(bodyParser.json())
server.use(bodyParser.urlencoded({extended: true}))

// GitHub webhook middleware
const webhookHandler = GithubWebHook({
  path: '/v1/webhook'
})
server.use(webhookHandler)

// Brute force protection
const store = new ExpressBrute.MemoryStore()
const bruteforce = new ExpressBrute(store)

// Enable CORS
server.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  
  next()
})

const requireApiVersion = versions => {
  return (req, res, next) => {
    const versionMatch = versions.some(version => {
      return version.toString() === req.params.version
    })

    if (!versionMatch) {
      return res.status(500).send({
        success: false,
        errorCode: 'INVALID_VERSION'
      })
    }

    res.locals.apiVersion = req.params.version
    delete req.params.version

    return next()
  }
}

const requireParams = (params) => {
  return function (req, res, next) {
    let missingParams = []

    params.forEach(param => {
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
server.get('/v:version/connect/:username/:repository',
           bruteforce.prevent,
           requireApiVersion([1, 2]),
           require('./controllers/connect'))

// Route: process
server.post('/v:version/entry/:username/:repository/:branch',
            bruteforce.prevent,
            requireApiVersion([1, 2]),
            requireParams(['fields']),
            require('./controllers/process'))

server.post('/v:version/entry/:username/:repository/:branch/:property',
            bruteforce.prevent,
            requireApiVersion([2]),
            requireParams(['fields']),
            require('./controllers/process'))

// Route: encrypt
server.get('/v:version/encrypt/:text',
            bruteforce.prevent,
            requireApiVersion([2]),
            require('./controllers/encrypt'))

// GitHub webhook route
webhookHandler.on('pull_request', require('./controllers/handlePR'))

server.listen(config.get('port'), () => {
  console.log('[Staticman] Server listening on port', config.get('port'))
})
