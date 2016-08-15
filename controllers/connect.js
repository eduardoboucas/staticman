var GitHubApi = require('github')

module.exports = (config) => {
  return ((req, res) => {
    var ua = config.uaTrackingId ? require('universal-analytics')(config.uaTrackingId) : null

    var github = new GitHubApi({
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
      token: config.githubToken
    })

    github.users.getRepoInvites({}).then((response) => {
      var invitationId
      var invitation = response.some((invitation) => {
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
}
