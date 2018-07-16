'use strict'

const GitHub = require('../lib/GitHub')
const RSA = require('../lib/RSA')
const Staticman = require('../lib/Staticman')

module.exports = (req, res) => {
  const staticman = new Staticman(req.params)
  staticman.setConfigPath()

  return staticman.getSiteConfig()
    .then(siteConfig =>
      GitHub.requestOAuthAccessToken(
        req.query.code,
        siteConfig.get('githubAuth.clientId'),
        siteConfig.get('githubAuth.clientSecret')
      )
    )
    .then((accessToken) => {
      const github = new GitHub({
        oauthToken: accessToken
      })
      return github.api.users.get({}).then(user =>
        res.send({
          accessToken: RSA.encrypt(accessToken),
          user
        })
      )
    })
    .catch(err => {
      console.log('ERR:', err)
      res.send(err)
    })
}
