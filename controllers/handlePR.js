'use strict'

const config = require(__dirname + '/../config')
const GitHubApi = require('github')

module.exports = (repo, data) => {
  const ua = config.get('analytics.uaTrackingId') ? require('universal-analytics')(config.get('analytics.uaTrackingId')) : null

  if (data.number) {
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

    github.pullRequests.get({
      user: data.repository.owner.login,
      repo: data.repository.name,
      number: data.number
    }).then(response => {
      console.log('** PR:', response)

      if ((response.state === 'closed') && (response.head.ref.indexOf('staticman_') === 0)) {
        return github.gitdata.deleteReference({
          user: data.repository.owner.login,
          repo: data.repository.name,
          ref: 'heads/' + response.head.ref
        })
      }
    }).then(response => {
      if (ua) {
        ua.event('Hooks', 'Delete branch').send()
      }
    }).catch(err => {
      console.log(err.stack || err)

      if (ua) {
        ua.event('Hooks', 'Delete branch error').send()
      }
    })
  }
}