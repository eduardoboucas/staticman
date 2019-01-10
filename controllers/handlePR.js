'use strict'

const config = require('../config')
const GitHub = require('../lib/GitHub')
const Staticman = require('../lib/Staticman')

module.exports = async (repo, data) => {
  const ua = config.get('analytics.uaTrackingId')
    ? require('universal-analytics')(config.get('analytics.uaTrackingId'))
    : null

  if (!data.number) {
    return
  }

  const github = await new GitHub({
    username: data.repository.owner.login,
    repository: data.repository.name,
    version: '1'
  })

  try {
    let review = await github.getReview(data.number)
    if (review.sourceBranch.indexOf('staticman_')) {
      return null
    }

    if (review.state !== 'merged' && review.state !== 'closed') {
      return null
    }

    const bodyMatch = review.body.match(/(?:.*?)<!--staticman_notification:(.+?)-->(?:.*?)/i)

    if (bodyMatch && (bodyMatch.length === 2)) {
      try {
        const parsedBody = JSON.parse(bodyMatch[1])
        const staticman = await new Staticman(parsedBody.parameters)

        staticman.setConfigPath(parsedBody.configPath)
        let queue = []
        if (review.state === 'merged') {
          queue.push(staticman.processMerge(parsedBody.fields, parsedBody.options, review.sourceBranch))
        }
        Promise.all(queue).then(() => staticman.processClose(parsedBody.fields, parsedBody.options, review.sourceBranch))
      } catch (err) {
        return Promise.reject(err)
      }
    }

    if (ua) {
      ua.event('Hooks', 'Delete branch').send()
    }
    
    return github.deleteBranch(review.sourceBranch)
  } catch (e) {
    console.log(e.stack || e)

    if (ua) {
      ua.event('Hooks', 'Delete branch error').send()
    }

    return Promise.reject(e)
  }
}
