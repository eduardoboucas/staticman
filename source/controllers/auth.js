'use strict'

const gitFactory = require('../lib/GitServiceFactory')
const oauth = require('../lib/OAuth')
const RSA = require('../lib/RSA')
const Staticman = require('../lib/Staticman')

module.exports = async (req, res) => {
  const staticman = await new Staticman(req.params)
  staticman.setConfigPath()

  let requestAccessToken

  switch (req.params.service) {
    case 'gitlab':
      requestAccessToken = siteConfig =>
        oauth.requestGitLabAccessToken(
          req.query.code,
          siteConfig.get('gitlabAuth.clientId'),
          siteConfig.get('gitlabAuth.clientSecret'),
          siteConfig.get('gitlabAuth.redirectUri')
        )
      break
    default:
      requestAccessToken = siteConfig =>
        oauth.requestGitHubAccessToken(
          req.query.code,
          siteConfig.get('githubAuth.clientId'),
          siteConfig.get('githubAuth.clientSecret'),
          siteConfig.get('githubAuth.redirectUri')
        )
  }

  return staticman.getSiteConfig()
    .then(requestAccessToken)
    .then(async (accessToken) => {
      const git = await gitFactory.create(req.params.service, {
        oauthToken: accessToken,
        version: req.params.version
      })

      // TODO: Simplify this when v2 support is dropped.
      const getUser = req.params.version === '2' && req.params.service === 'github'
        ? git.api.users.getAuthenticated({}).then(({ data }) => data)
        : git.getCurrentUser()

      return getUser
        .then((user) => {
          res.send({
            accessToken: RSA.encrypt(accessToken),
            user
          })
        })
    })
    .catch((err) => {
      console.log('ERR:', err)

      const statusCode = err.statusCode || 401

      res.status(statusCode).send({
        statusCode,
        message: err.message
      })
    })
}
