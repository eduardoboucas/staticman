'use strict'

const bodyParser = require('body-parser')
const config = require('./config')
const express = require('express')
const ExpressBrute = require('express-brute')
const GithubWebHook = require('express-github-webhook')
const objectPath = require('object-path')

const StaticmanAPI = function () {
  this.controllers = {
    connect: require('./controllers/connect'),
    encrypt: require('./controllers/encrypt'),
    githubAuth: require('./controllers/githubAuth'),
    handlePR: require('./controllers/handlePR'),
    home: require('./controllers/home'),
    process: require('./controllers/process')
  }

  this.server = express()
  this.server.use(bodyParser.json())
  this.server.use(bodyParser.urlencoded({
    extended: true
    // type: '*'
  }))

  this.initialiseWebhookHandler()
  this.initialiseCORS()
  this.initialiseBruteforceProtection()
  this.initialiseRoutes()
}

StaticmanAPI.prototype.initialiseBruteforceProtection = function () {
  const store = new ExpressBrute.MemoryStore()

  this.bruteforce = new ExpressBrute(store)
}

StaticmanAPI.prototype.initialiseCORS = function () {
  this.server.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')

    next()
  })
}

StaticmanAPI.prototype.initialiseRoutes = function () {
  // Route: connect
  this.server.get(
    '/v:version/connect/:username/:repository',
    this.bruteforce.prevent,
    this.requireApiVersion([1, 2]),
    this.controllers.connect
  )

  // Route: process
  this.server.post(
    '/v:version/entry/:username/:repository/:branch',
    this.bruteforce.prevent,
    this.requireApiVersion([1, 2]),
    this.requireParams(['fields']),
    this.controllers.process
  )

  this.server.post(
    '/v:version/entry/:username/:repository/:branch/:property',
    this.bruteforce.prevent,
    this.requireApiVersion([2]),
    this.requireParams(['fields']),
    this.controllers.process
  )

  this.server.post(
    '/v:version/entry/:service/:username/:repository/:branch/:property',
    this.bruteforce.prevent,
    this.requireApiVersion([3]),
    this.requireService(['github', 'gitlab']),
    this.requireParams(['fields']),
    this.controllers.process
  )

  // Route: encrypt
  this.server.get(
    '/v:version/encrypt/:text',
    this.bruteforce.prevent,
    this.requireApiVersion([2]),
    this.controllers.encrypt
  )

  // Route: GitHub auth
  this.server.get(
    '/v:version/auth/github/:username/:repository/:branch/:property',
    this.bruteforce.prevent,
    this.requireApiVersion([2]),
    this.controllers.githubAuth
  )

  // Route: root
  this.server.get(
    '/',
    this.controllers.home
  )
}

StaticmanAPI.prototype.initialiseWebhookHandler = function () {
  const webhookHandler = GithubWebHook({
    path: '/v1/webhook'
  })

  webhookHandler.on('pull_request', this.controllers.handlePR)

  this.server.use(webhookHandler)
}

StaticmanAPI.prototype.requireApiVersion = function (versions) {
  return (req, res, next) => {
    const versionMatch = versions.some(version => {
      return version.toString() === req.params.version
    })

    if (!versionMatch) {
      return res.status(400).send({
        success: false,
        errorCode: 'INVALID_VERSION'
      })
    }

    return next()
  }
}

StaticmanAPI.prototype.requireService = function (services) {
  return (req, res, next) => {
    const serviceMatch = services.some(service => service === req.params.service)

    if (!serviceMatch) {
      return res.status(400).send({
        success: false,
        errorCode: 'INVALID_SERVICE'
      })
    }

    return next()
  }
}

StaticmanAPI.prototype.requireParams = function (params) {
  return function (req, res, next) {
    let missingParams = []

    params.forEach(param => {
      if (
        objectPath.get(req.query, param) === undefined &&
        objectPath.get(req.body, param) === undefined
      ) {
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

StaticmanAPI.prototype.start = function (callback) {
  const callbackFn = typeof callback === 'function'
    ? callback.call(this, config.get('port'))
    : null

  this.server.listen(config.get('port'), callbackFn)
}

module.exports = StaticmanAPI
