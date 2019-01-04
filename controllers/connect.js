'use strict'

const path = require('path')
const config = require(path.join(__dirname, '/../config'))
const GitHub = require(path.join(__dirname, '/../lib/GitHub'))

module.exports = async (req, res) => {
  const ua = config.get('analytics.uaTrackingId')
    ? require('universal-analytics')(config.get('analytics.uaTrackingId'))
    : null

  const github = new GitHub({
    username: req.params.username,
    repository: req.params.repository,
    branch: req.params.branch,
    token: config.get('githubToken')
  })

  try {
    const { data } = await github.api.repos.listInvitationsForAuthenticatedUser({})

    const invitation = Array.isArray(data) && data.find(({ repository }) => repository.full_name === req.params.username + '/' + req.params.repository)

    if (!invitation) {
      return res.status(404).send('Invitation not found')
    }

    await github.api.repos.acceptInvitation({
      invitation_id: invitation.id
    })
    res.send('OK!')

    if (ua) {
      ua.event('Repositories', 'Connect').send()
    }
  } catch (err) {
    res.status(500).send('Error')

    if (ua) {
      ua.event('Repositories', 'Connect error').send()
    }
  }
}
