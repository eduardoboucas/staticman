'use strict'

const gitFactory = require('../lib/GitServiceFactory')
const oauth = require('../lib/OAuth')
const RSA = require('../lib/RSA')
const Staticman = require('../lib/Staticman')

module.exports = (req, res) => {
  const staticman = new Staticman(req.params)
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
    .then((accessToken) => {
      const git = gitFactory.create(req.params.service, {
        oauthToken: accessToken
      })

      return git.getCurrentUser()
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
