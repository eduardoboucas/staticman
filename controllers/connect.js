'use strict'

const path = require('path')
const config = require(path.join(__dirname, '/../config'))
const GitHub = require(path.join(__dirname, '/../lib/GitHub'))

module.exports = (req, res) => {
  const ua = config.get('analytics.uaTrackingId')
    ? require('universal-analytics')(config.get('analytics.uaTrackingId'))
    : null

  const github = new GitHub({
    username: req.params.username,
    repository: req.params.repository,
    branch: req.params.branch,
    token: config.get('githubToken')
  })

  return github.api.users.getRepoInvites({}).then(response => {
    let invitationId

    const invitation = response.some(invitation => {
      if (invitation.repository.full_name === (req.params.username + '/' + req.params.repository)) {
        invitationId = invitation.id

        return true
      }
    })

    if (invitation) {
      return github.api.users.acceptRepoInvite({
        id: invitationId
      })
    } else {
      res.status(404).send('Invitation not found')
    }
  }).then(response => {
    res.send('OK!')

    if (ua) {
      ua.event('Repositories', 'Connect').send()
    }
  }).catch(err => { // eslint-disable-line handle-callback-err
    res.status(500).send('Error')

    if (ua) {
      ua.event('Repositories', 'Connect error').send()
    }
  })
}
