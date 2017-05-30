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

  console.log("Forking " + req.params.username + "::" + req.params.repository)
    
  return github.repos.fork({
    user: req.params.username,
    repo: req.params.repository
  }).then(response => {
    res.send('OK!')

    /* Tracking is untested */
    if (ua) {
      ua.event('Repositories', 'Fork').send()
    }
  }).catch(err => {
    console.log(err.stack || err)

    res.status(500).send('Error')

    if (ua) {
      ua.event('Repositories', 'Fork error').send()
    }
  })
})
