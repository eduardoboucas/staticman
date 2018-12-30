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

  const github = new GitHub({
    username: data.repository.owner.login,
    repository: data.repository.name,
    token: config.get('githubToken')
  })

  try {
    const review = await github.getReview(data.number)

    if (review.sourceBranch.indexOf('staticman_')) {
      return null
    }

    if (review.state !== 'merged' && review.state !== 'closed') {
      return null
    }

    if (review.state === 'merged') {
      const bodyMatch = review.body.match(/(?:.*?)<!--staticman_notification:(.+?)-->(?:.*?)/i)

      if (bodyMatch && (bodyMatch.length === 2)) {
        const parsedBody = JSON.parse(bodyMatch[1])
        const staticman = new Staticman(parsedBody.parameters)

        staticman.setConfigPath(parsedBody.configPath)
        await staticman.processMerge(parsedBody.fields, parsedBody.options)
      }
    }

    const response = github.deleteBranch(review.sourceBranch)

    if (ua) {
      ua.event('Hooks', 'Delete branch').send()
    }

    return response
  } catch (err) {
    console.log(err.stack || err)

    if (ua) {
      ua.event('Hooks', 'Delete branch error').send()
    }

    throw err
  }
}
