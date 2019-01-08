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
    username: data.repository.owner.login,
    repository: data.repository.name,
    token: config.get('githubToken')
  })

  return github.getReview(data.number).then((review) => {
    if (review.sourceBranch.indexOf('staticman_')) {
      return null
    }

    if (review.state !== 'merged' && review.state !== 'closed') {
      return null
    }

    if (review.state === 'merged') {
      const bodyMatch = review.body.match(/(?:.*?)<!--staticman_notification:(.+?)-->(?:.*?)/i)

      let queue = []
      if (bodyMatch && (bodyMatch.length === 2)) {
        try {
          const parsedBody = JSON.parse(bodyMatch[1])
          const staticman = new Staticman(parsedBody.parameters)

            staticman.setConfigPath(parsedBody.configPath)
            queue.push(staticman.processMerge(parsedBody.fields, parsedBody.options)
              .catch(err => Promise.reject(err)))
        } catch (err) {
          return Promise.reject(err)
        }
      }
    }
    Promise.all(queue).then(() => staticman.processClose(parsedBody.fields, parsedBody.options, review.sourceBranch))
    return github.deleteBranch(review.sourceBranch)
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
