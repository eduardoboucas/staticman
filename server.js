const bodyParser = require('body-parser')
const config = require('./config')
const express = require('express')
const expressJSDocSwagger = require('express-jsdoc-swagger')
const ExpressBrute = require('express-brute')
const GithubWebHook = require('express-github-webhook')
const objectPath = require('object-path')
const pkg = require('./package.json')

class StaticmanAPI {
  constructor () {
    const swaggerOptions = {
      info: {
        title: pkg.name,
        description: 'For use by static websites to allow submission dynamically generated content, such as comments.',
        version: pkg.version,
        license: {
          name: pkg.license
        }
      },
      filesPattern: __filename,
      baseDir: __dirname
    }

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

    expressJSDocSwagger(this.server)(swaggerOptions)
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
    /**
     * GET /v{version}/connect/{username}/{repository}
     * @summary Used when running Staticman on a bot account to accept GitHub repo collaboration invites.
     * @tags Bot Connection
     * @param {number} version.path - Staticman API version - enum:1,2,3
     * @param {string} username.path - Github username
     * @param {string} repository.path - Github repository name
     * @return {string} 200 - Success - text/html
     * @example response - 200 - Example success response
     * OK!
     * @return {string} 404 - Invitation not found - text/html
     * @example response - 404 - Example invitation not found response
     * Invitation not found
     * @return {string} 500 - Staticman server error - text/html
     * @example response - 500 - Example Staticman server error response
     * Error
     */
    this.server.get(
      '/v:version/connect/:username/:repository',
      this.bruteforce.prevent,
      this.requireApiVersion([1, 2, 3]),
      this.controllers.connect
    )

    /**
     * POST /v{version}/entry/{username}/{repository}/{branch}
     * @summary Used to submit a comment to a website connected to Staticman.
     * @deprecated
     * @tags Entry Submission
     * @param {number} version.path - Staticman API version - enum:1,2
     * @param {string} username.path - Github username
     * @param {string} repository.path - Github repository name
     * @param {string} branch.path - Repository branch
     * @return {string} 200 - Success
     * @return {string} 500 - Staticman server error
     */
    this.server.post(
      '/v:version/entry/:username/:repository/:branch',
      this.bruteforce.prevent,
      this.requireApiVersion([1, 2]),
      this.requireParams(['fields']),
      this.controllers.process
    )

    /**
     * POST /v{version}/entry/{username}/{repository}/{branch}/{property}
     * @summary Used to submit a comment to a website connected to Staticman.
     * @deprecated
     * @tags Entry Submission
     * @param {number} version.path - Staticman API version - enum:2
     * @param {string} username.path - Github username
     * @param {string} repository.path - Github repository name
     * @param {string} branch.path - Repository branch
     * @param {string} property.path - Name of the top level key in the Staticman config
     * @return {string} 200 - Success
     * @return {string} 500 - Staticman server error
     */
    this.server.post(
      '/v:version/entry/:username/:repository/:branch/:property',
      this.bruteforce.prevent,
      this.requireApiVersion([2]),
      this.requireParams(['fields']),
      this.controllers.process
    )

    /**
     * POST /v{version}/entry/{service}/{username}/{repository}/{branch}/{property}
     * @summary Used to submit a comment to a website connected to Staticman.
     * @tags Entry Submission
     * @param {number} version.path - Staticman API version - enum:3
     * @param {string} service.path - Git service - enum:github,gitlab
     * @param {string} username.path - Github username
     * @param {string} repository.path - Github repository name
     * @param {string} branch.path - Repository branch
     * @param {string} property.path - Name of the top level key in the Staticman config
     * @return {string} 200 - Success
     * @return {string} 500 - Staticman server error
     */
    this.server.post(
      '/v:version/entry/:service/:username/:repository/:branch/:property',
      this.bruteforce.prevent,
      this.requireApiVersion([3]),
      this.requireService(['github', 'gitlab']),
      this.requireParams(['fields']),
      this.controllers.process
    )

    /**
     * GET /v{version}/encrypt/{text}
     * @summary Encrypt a string
     * @tags Security
     * @param {number} version.path - Staticman API version - enum:2,3
     * @param {string} text.path - Text to encrypt
     * @return {string} 200 - Success
     * @return {string} 500 - Could not encrypt text
     */
    this.server.get(
      '/v:version/encrypt/:text',
      this.bruteforce.prevent,
      this.requireApiVersion([2, 3]),
      this.controllers.encrypt
    )

    /**
     * GET /v{version}/auth/{service}/{username}/{repository}/{branch}/{property}
     * @summary Authenticate with the git service using oauth
     * @tags Authentication
     * @param {number} version.path - Staticman API version - enum:3
     * @param {string} service.path - Git service - enum:github,gitlab
     * @param {string} username.path - Github username
     * @param {string} repository.path - Github repository name
     * @param {string} branch.path - Repository branch
     * @param {string} property.path - Name of the top level key in the Staticman config
     * @return {string} 200 - Success
     * @return {string} 401 - Authentication error
     */
    this.server.get(
      '/v:version/auth/:service/:username/:repository/:branch/:property',
      this.bruteforce.prevent,
      this.requireApiVersion([2, 3]),
      this.requireService(['github', 'gitlab']),
      this.controllers.auth
    )

    /**
     * GET /
     * @summary Staticman API home message
     * @tags Misc
     * @return {string} 200 - Success - text/html
     * @example response - 200 - Example success response
     * Hello from Staticman version 3.0.0!
     */
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
