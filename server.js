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
      process: require('./controllers/process'),
      webhook: require('./controllers/webhook')
    }

    this.server = express()
    this.server.use(bodyParser.json())
    this.server.use(bodyParser.urlencoded({
      extended: true
      // type: '*'
    }))

    this.initialiseGitHubWebhookHandler()
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

    this.server.post(
      '/v:version/webhook/:service/',
      this.bruteforce.prevent,
      this.requireApiVersion([3]),
      this.requireService(['gitlab']),
      this.controllers.webhook
    )

    // Route: root
    this.server.get(
      '/',
      this.controllers.home
    )
  }

  initialiseGitHubWebhookHandler () {
    /*
     * The express-github-webhook module is frustrating, as it only allows for a simplistic match
     * for equality against one path. No string patterns (e.g., /v1?3?/webhook(/github)?). No
     * regular expressions (e.g., /\/v[13]\/webhook(?:\/github)?/). As such, create one instance
     * of the module per supported path. This won't scale well as Staticman API versions are added.
     */
    for (const onePath of ['/v1/webhook', '/v3/webhook/github']) {
      const webhookHandler = GithubWebHook({
        path: onePath,
        secret: config.get('githubWebhookSecret')
      })

      /*
       * Wrap the handlePR callback so that we can catch any errors thrown and log them. This
       * also has the benefit of eliminating noisy UnhandledPromiseRejectionWarning messages.
       *
       * Frustratingly, the express-github-webhook module only passes along body.data (and the
       * repository name) to the callback, not the whole request.
       */
      const handlePrWrapper = function (repo, data) {
        this.controllers.handlePR(repo, data).catch((error) => {
          /*
           * Unfortunately, the express-github-webhook module returns a 200 (success) regardless
           * of any errors raised in the downstream handler. So, all we can do is log errors.
           */
          console.error(error)
        })
      }.bind(this)

      webhookHandler.on('pull_request', handlePrWrapper)

      /*
       * Explicit handler for errors raised inside the express-github-webhook module that mimmicks
       * the system/express error handler. But, allows for customization and debugging.
       */
      webhookHandler.on('error', (error) => console.error(error.stack || error))

      this.server.use(webhookHandler)
    }
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
