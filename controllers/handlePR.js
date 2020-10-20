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
   *  "url": "https://api.github.com/repos/foo/staticman-test"
   *  "url": "git@gitlab.com:foo/staticman-test.git"
   */
  const calcIsGitHub = function (data) {
    return data.repository.url.includes('github.com')
  }
  const calcIsGitLab = function (data) {
    return data.repository.url.includes('gitlab.com')
  }

  /*
   * Because we don't have the full request available to us here, we can't set the (Staticman)
   * version option. Fortunately, it isn't critical.
   */
  const unknownVersion = ''

  let gitService = null
  let mergeReqNbr = null
  if (calcIsGitHub(data)) {
    gitService = await gitFactory.create('github', {
      branch: data.pull_request.base.ref,
      repository: data.repository.name,
      username: data.repository.owner.login,
      version: unknownVersion
    })
    mergeReqNbr = data.number
  } else if (calcIsGitLab(data)) {
    const repoUrl = data.repository.url
    const repoUsername = repoUrl.substring(repoUrl.indexOf(':') + 1, repoUrl.indexOf('/'))
    gitService = await gitFactory.create('gitlab', {
      branch: data.object_attributes.target_branch,
      repository: data.repository.name,
      username: repoUsername,
      version: unknownVersion
    })
    mergeReqNbr = data.object_attributes.iid
  } else {
    return Promise.reject(new Error('Unable to determine service.'))
  }

  if (!mergeReqNbr) {
    return Promise.reject(new Error('No pull/merge request number found.'))
  }

  let review = await gitService.getReview(mergeReqNbr).catch((error) => {
    return Promise.reject(new Error(error))
  })

  if (review.sourceBranch.indexOf('staticman_') < 0) {
    /*
     * Don't throw an error here, as we might receive "real" (non-bot) pull requests for files
     * other than Staticman-processed comments.
     */
    return null
  }

  if (review.state !== 'merged' && review.state !== 'closed') {
    /*
     * Don't throw an error here, as we'll regularly receive webhook calls whenever a pull/merge
     * request is opened, not just merged/closed.
     */
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

        await staticman.processMerge(parsedBody.fields, parsedBody.options)
        if (ua) {
          ua.event('Hooks', 'Create/notify mailing list').send()
        }
      } catch (err) {
        if (ua) {
          ua.event('Hooks', 'Create/notify mailing list error').send()
        }

        return Promise.reject(err)
      }
    }

    /*
     * Only necessary for GitHub, as GitLab automatically deletes the backing branch for the
     * pull/merge request. For GitHub, this will throw the following error if the branch has
     * already been deleted:
     *  HttpError: Reference does not exist"
     */
    if (calcIsGitHub(data)) {
      try {
        await gitService.deleteBranch(review.sourceBranch)
        if (ua) {
          ua.event('Hooks', 'Delete branch').send()
        }
      } catch (err) {
        if (ua) {
          ua.event('Hooks', 'Delete branch error').send()
        }

        return Promise.reject(err)
      }
    }
  }
}
