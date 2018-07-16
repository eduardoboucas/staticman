'use strict'

const config = require('../config')
const GitHub = require('../lib/GitHub')
const Staticman = require('../lib/Staticman')

module.exports = (repo, data) => {
  const ua = config.get('analytics.uaTrackingId')
    ? require('universal-analytics')(config.get('analytics.uaTrackingId'))
    : null

  if (!data.number) {
    return
  }

  const github = new GitHub({
    token: config.get('githubToken')
  })

  return github.api.pullRequests.get({
    owner: data.repository.owner.login,
    repo: data.repository.name,
    number: data.number
  }).then(({data}) => {
    if (data.head.ref.indexOf('staticman_')) {
      return null
    }

    if (data.merged) {
      const bodyMatch = data.body.match(/(?:.*?)<!--staticman_notification:(.+?)-->(?:.*?)/i)

      if (bodyMatch && (bodyMatch.length === 2)) {
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

    if (data.state === 'closed') {
      return github.api.gitdata.deleteReference({
        owner: data.repository.owner.login,
        repo: data.repository.name,
        ref: 'heads/' + data.head.ref
      })
    }
  }).then(response => {
    if (ua) {
      ua.event('Hooks', 'Delete branch').send()
    }

    return response
  }).catch(err => {
    console.log(err.stack || err)

    if (ua) {
      ua.event('Hooks', 'Delete branch error').send()
    }

    return Promise.reject(err)
  })
}
