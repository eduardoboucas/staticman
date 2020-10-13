'use strict'

const config = require('../config')
const gitFactory = require('../lib/GitServiceFactory')
const Staticman = require('../lib/Staticman')

module.exports = async (repo, data) => {
  const ua = config.get('analytics.uaTrackingId')
    ? require('universal-analytics')(config.get('analytics.uaTrackingId'))
    : null

  /*
   * Unfortunately, all we have available to us at this point is the request body (as opposed to
   * the full request). Meaning, we don't have the :service portion of the request URL available.
   * As such, switch between GitHub and GitLab using the repo URL. For example:
   *  "url": "https://api.github.com/repos/hispanic/staticman-test"
   *  "url": "git@gitlab.com:ihispanic/staticman-test.git"
   */
  const calcIsGitHub = function (data) {
    return data.repository.url.includes('github.com')
  }
  const calcIsGitLab = function (data) {
    return data.repository.url.includes('gitlab.com')
  }

  /*
   * Because we don't have the full request available to us here, we can't set the branch and
   * (Staticman) version options. Fortunately, they aren't critical.
   */
  const unknownBranch = 'UNKNOWN'
  const unknownVersion = ''

  let gitService = null
  let mergeReqNbr = null
  if (calcIsGitHub(data)) {
    gitService = await gitFactory.create('github', {
      branch: unknownBranch,
      repository: data.repository.name,
      username: data.repository.owner.login,
      version: unknownVersion
    })
    mergeReqNbr = data.number
  } else if (calcIsGitLab(data)) {
    gitService = await gitFactory.create('gitlab', {
      branch: unknownBranch,
      repository: data.repository.name,
      username: data.user.username,
      version: unknownVersion
    })
    mergeReqNbr = data.object_attributes.iid
  } else {
    return null
  }

  if (!mergeReqNbr) {
    return
  }

  try {
    let review = await gitService.getReview(mergeReqNbr)
    if (review.sourceBranch.indexOf('staticman_')) {
      return null
    }

    if (review.state !== 'merged' && review.state !== 'closed') {
      return null
    }

    if (review.state === 'merged') {
      /*
       * The "staticman_notification" comment section of the comment pull/merge request only
       * exists if notifications were enabled at the time the pull/merge request was created.
       */
      const bodyMatch = review.body.match(/(?:.*?)<!--staticman_notification:(.+?)-->(?:.*?)/i)

      if (bodyMatch && (bodyMatch.length === 2)) {
        try {
          const parsedBody = JSON.parse(bodyMatch[1])
          const staticman = await new Staticman(parsedBody.parameters)

          staticman.setConfigPath(parsedBody.configPath)
          staticman.processMerge(parsedBody.fields, parsedBody.options)
        } catch (err) {
          return Promise.reject(err)
        }
      }
    }

    if (ua) {
      ua.event('Hooks', 'Delete branch').send()
    }

    let result = null
    /*
     * Only necessary for GitHub, as GitLab automatically deletes the backing branch for the
     * pull/merge request. For GitHub, this will throw the following error if the branch has
     * already been deleted:
     *  "UnhandledPromiseRejectionWarning: HttpError: Reference does not exist" if branch already deleted.
     */
    if (calcIsGitHub(data)) {
      result = gitService.deleteBranch(review.sourceBranch)
    }
    return result
  } catch (e) {
    console.log(e.stack || e)

    if (ua) {
      ua.event('Hooks', 'Delete branch error').send()
    }

    return Promise.reject(e)
  }
}
