'use strict'

const path = require('path')
const GitHub = require(path.join(__dirname, '/../lib/GitHub'))
const RSA = require('../lib/RSA')
const Staticman = require('../lib/Staticman')

module.exports = (req, res) => {
  const github = new GitHub()
  const staticman = new Staticman(req.params)

  staticman.authenticate()
  staticman.setConfigPath()

  return staticman.getSiteConfig().then(siteConfig => {
    return github.authenticateWithCode({
      code: req.query.code,
      clientId: siteConfig.get('githubAuth.clientId'),
      clientSecret: siteConfig.get('githubAuth.clientSecret')
    })
  }).then(accessToken => {
    return github.api.users.get({}).then(user => {
      res.send({
        accessToken: RSA.encrypt(accessToken),
        user
      })
    })
  }).catch(err => {
    console.log('ERR:', err)
    res.send(err)
  })
}
