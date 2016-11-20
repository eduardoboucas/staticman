'use strict'

const config = require(__dirname + '/../config')
const GitHubApi = require('github')
const Staticman = require('../lib/Staticman')

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
      if (response.head.ref.indexOf('staticman_')) {
        return null
      }

      if (response.merged) {
        const bodyMatch = response.body.match(/(?:.*?)<!--staticman_notification:(.+?)-->(?:.*?)/i)

        if (bodyMatch.length === 2) {
          try {
            const parsedBody = JSON.parse(bodyMatch[1])
            const staticman = new Staticman(parsedBody.parameters)

            staticman.setConfigPath(parsedBody.configPath)
            staticman.processMerge(parsedBody.fields, parsedBody.options).catch(err => {
              return Promise.reject(err)
            })
          } catch (err) {
            return Promise.reject(err)
          }
        }
      }

      if (response.state === 'closed') {
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