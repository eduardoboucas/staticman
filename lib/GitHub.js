'use strict'

const config = require('../config')
const errorHandler = require('./ErrorHandler')
const githubApi = require('@octokit/rest')
const GitService = require('./GitService')
const Review = require('./models/Review')
const User = require('./models/User')

const normalizeResponse = ({data}) => data

class GitHub extends GitService {
  constructor (options = {}) {
    super(options.username, options.repository, options.branch)

    this.api = githubApi({
      debug: config.get('env') === 'development',
      baseUrl: config.get('githubBaseUrl'),
      headers: {
        'user-agent': 'Staticman agent'
      },
      timeout: 5000
    })

    if (options.oauthToken) {
      this.api.authenticate({
        type: 'oauth',
        token: options.oauthToken
      })
    } else if (options.token) {
      this.api.authenticate({
        type: 'token',
        token: options.token
      })
    } else {
      throw new Error('Require an `oauthToken` or `token` option')
    }
  }

  _pullFile (filePath, branch) {
    return this.api.repos.getContent({
      owner: this.username,
      repo: this.repository,
      path: filePath,
      ref: branch
    })
      .then(normalizeResponse)
      .catch(err => Promise.reject(errorHandler('GITHUB_READING_FILE', {err})))
  }

  _commitFile (filePath, content, commitMessage, branch) {
    return this.api.repos.createFile({
      owner: this.username,
      repo: this.repository,
      path: filePath,
      message: commitMessage,
      content,
      branch
    })
      .then(normalizeResponse)
  }

  writeFile (filePath, data, targetBranch, commitTitle) {
    return super.writeFile(filePath, data, targetBranch, commitTitle)
      .catch(err => {
        try {
          const message = err && err.message

          if (message) {
            const parsedError = JSON.parse(message)

            if (
              parsedError &&
              parsedError.message &&
              parsedError.message.includes('"sha" wasn\'t supplied')
            ) {
              return Promise.reject(errorHandler('GITHUB_FILE_ALREADY_EXISTS', {err}))
            }
          }
        } catch (err) {} // eslint-disable-line no-empty

        return Promise.reject(errorHandler('GITHUB_WRITING_FILE', {err}))
      })
  }

  getBranchHeadCommit (branch) {
    return this.api.repos.getBranch({
      owner: this.username,
      repo: this.repository,
      branch
    })
      .then(res => res.data.commit.sha)
  }

  createBranch (branch, sha) {
    return this.api.gitdata.createReference({
      owner: this.username,
      repo: this.repository,
      ref: `refs/heads/${branch}`,
      sha
    })
      .then(normalizeResponse)
  }

  deleteBranch (branch) {
    return this.api.gitdata.deleteReference({
      owner: this.username,
      repo: this.repository,
      ref: `heads/${branch}`
    })
  }

  createReview (reviewTitle, branch, reviewBody) {
    return this.api.pullRequests.create({
      owner: this.username,
      repo: this.repository,
      title: reviewTitle,
      head: branch,
      base: this.branch,
      body: reviewBody
    })
      .then(normalizeResponse)
  }

  getReview (reviewId) {
    return this.api.pullRequests.get({
      owner: this.username,
      repo: this.repository,
      number: reviewId
    })
      .then(normalizeResponse)
      .then(({base, body, head, merged, state, title}) =>
        new Review(
          title,
          body,
          (merged && state === 'closed') ? 'merged' : state,
          head.ref,
          base.ref
        )
      )
  }

  readFile (filePath, getFullResponse) {
    return super.readFile(filePath, getFullResponse)
      .catch(err => Promise.reject(errorHandler('GITHUB_READING_FILE', {err})))
  }

  writeFileAndSendReview (filePath, data, branch, commitTitle, reviewBody) {
    return super.writeFileAndSendReview(filePath, data, branch, commitTitle, reviewBody)
      .catch(err => Promise.reject(errorHandler('GITHUB_CREATING_PR', {err})))
  }

  getCurrentUser () {
    return this.api.users.get({})
      .then(normalizeResponse)
      .then(({login, email, avatar_url, name, bio, company, blog}) =>
        new User('github', login, email, name, avatar_url, bio, blog, company)
      )
      .catch(err => Promise.reject(errorHandler('GITHUB_GET_USER', {err})))
  }
}

module.exports = GitHub
