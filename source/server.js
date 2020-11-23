const bodyParser = require('body-parser')
const config = require('./config')
const express = require('express')
const ExpressBrute = require('express-brute')
const GithubWebHook = require('express-github-webhook')
const objectPath = require('object-path')

class StaticmanAPI {
  constructor () {
    this.controllers = {
      connect: require('./controllers/connect'),
      encrypt: require('./controllers/encrypt'),
      auth: require('./controllers/auth'),
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

  initialiseBruteforceProtection () {
    const store = new ExpressBrute.MemoryStore()

    this.bruteforce = new ExpressBrute(store)
  }

  initialiseCORS () {
    this.server.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*')
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')

      next()
    })
  }

  initialiseRoutes () {
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
      this.requireApiVersion([2, 3]),
      this.controllers.encrypt
    )

    // Route: oauth
    this.server.get(
      '/v:version/auth/:service/:username/:repository/:branch/:property',
      this.bruteforce.prevent,
      this.requireApiVersion([2, 3]),
      this.requireService(['github', 'gitlab']),
      this.controllers.auth
    )

    // Route: root
    this.server.get(
      '/',
      this.controllers.home
    )
  }

  initialiseWebhookHandler () {
    const webhookHandler = GithubWebHook({
      path: '/v1/webhook'
    })

    webhookHandler.on('pull_request', this.controllers.handlePR)

    this.server.use(webhookHandler)
  }

  requireApiVersion (versions) {
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

  requireService (services) {
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

  requireParams (params) {
    return function (req, res, next) {
      const missingParams = []

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

  start (callback) {
    this.instance = this.server.listen(config.get('port'), () => {
      if (typeof callback === 'function') {
        callback(config.get('port'))
      }
    })
  }

  close () {
    this.instance.close()
  }
}

module.exports = StaticmanAPI
