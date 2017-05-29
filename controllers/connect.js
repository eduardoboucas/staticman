'use strict'

const config = require(__dirname + '/../config')
const GitHubApi = require('github')

module.exports = ((req, res) => {
    console.log("1")
  const ua = config.get('analytics.uaTrackingId') ? require('universal-analytics')(config.get('analytics.uaTrackingId')) : null

  const github = new GitHubApi({
    debug: true,
    protocol: 'https',
    host: 'api.github.com',
    pathPrefix: '',
    headers: {
      'user-agent': 'Staticman agent',
      'Accept': 'application/vnd.github.swamp-thing-preview+json'
    },
    timeout: 5000,
    Promise: Promise
  })

  github.authenticate({
    type: 'oauth',
    token: config.get('githubToken')
  })
    console.log("2")
    
  github.users.getRepoInvites({}).then(response => {
      console.log("3")

      let invitationId

    const invitation = response.some(invitation => {
      if (invitation.repository.full_name === (req.params.username + '/' + req.params.repository)) {
        invitationId = invitation.id

        return true
      }
    })

      if (invitation) {
	  console.log("4")
      return github.users.acceptRepoInvite({
        id: invitationId
      })
      } else {
	  console.log("4a")
      return Promise.reject()
    }
  }).then(response => {
    res.send('OK!')

    if (ua) {
      ua.event('Repositories', 'Connect').send()
    }
  }).catch(err => {
    console.log(err.stack || err)

    res.status(500).send('Error')

    if (ua) {
      ua.event('Repositories', 'Connect error').send()
    }
  })
})
