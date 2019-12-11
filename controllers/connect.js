'use strict'

const path = require('path')
const config = require(path.join(__dirname, '/../config'))
const GitHub = require(path.join(__dirname, '/../lib/GitHub'))

module.exports = async (req, res) => {
  const ua = config.get('analytics.uaTrackingId')
    ? require('universal-analytics')(config.get('analytics.uaTrackingId'))
    : null

  const github = await new GitHub({
    username: req.params.username,
    repository: req.params.repository,
    branch: req.params.branch,
    token: config.get('githubToken'),
    version: req.params.version
  })

  const isAppAuth = config.get('githubAppID') && config.get('githubPrivateKey')

  if (isAppAuth) {
    return res.send('OK!')
  }

  return github.api.repos.listInvitationsForAuthenticatedUser({}).then(({ data }) => {
    let invitationId = null

    const invitation = Array.isArray(data) && data.some(invitation => {
      if (invitation.repository.full_name === (req.params.username + '/' + req.params.repository)) {
        invitationId = invitation.id

        return true
      }
    })

    if (!invitation) {
      return res.status(404).send('Invitation not found')
    }

    return github.api.repos.acceptInvitation({
      invitation_id: invitationId
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
  })
}
