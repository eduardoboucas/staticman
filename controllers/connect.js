'use strict'

const config = require(__dirname + '/../config')
const GitHubApi = require('github')

module.exports = ((req, res) => {
  const ua = config.get('analytics.uaTrackingId') ? require('universal-analytics')(config.get('analytics.uaTrackingId')) : null

  const github = new GitHubApi({
    debug: false,
    protocol: 'https',
    host: 'api.github.com',
    pathPrefix: '',
    headers: {
      'user-agent': 'Staticman agent'
    },
    timeout: 5000,
    Promise: Promise
  })

  github.authenticate({
    type: 'oauth',
    token: config.get('githubToken')
  })

  github.users.getRepoInvites({}).then((response) => {
    let invitationId

    const invitation = response.some((invitation) => {
      if (invitation.repository.full_name === (req.params.username + '/' + req.params.repository)) {
        invitationId = invitation.id

        return true
      }
    })

    if (invitation) {
      return github.users.acceptRepoInvite({
        id: invitationId
      })
    } else {
      return Promise.reject()
    }
  }).then((response) => {
    res.send('OK!')

    if (ua) {
      ua.event('Repositories', 'Connect').send()
    }
  }).catch((err) => {
    res.status(500).send('Error')

    if (ua) {
      ua.event('Repositories', 'Connect error').send()
    }
  })
})
