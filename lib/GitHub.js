'use strict'

const config = require('../config')
const errorHandler = require('./ErrorHandler')
const githubApi = require('@octokit/rest')
const GitService = require('./GitService')
const request = require('request-promise')

const normalizeResponse = ({data}) => data

class GitHub extends GitService {
  constructor (options = {}) {
    super(options.username, options.repository, options.branch)

    this.api = githubApi({
      debug: config.get('env') === 'development',
      baseUrl: 'https://api.github.com',
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

  static requestOAuthAccessToken (code, clientId, clientSecret) {
    return request({
      headers: {
        'Accept': 'application/json'
      },
      json: true,
      method: 'POST',
      uri: `https://github.com/login/oauth/access_token?client_id=${clientId}&client_secret=${clientSecret}&code=${code}`
    })
      .then(res => res.access_token)
      .catch(err => Promise.reject(errorHandler('GITHUB_AUTH_FAILED'))) // eslint-disable-line handle-callback-err
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
      ref: 'refs/heads/' + branch,
      sha
    })
      .then(normalizeResponse)
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

  readFile (filePath, getFullResponse) {
    return super.readFile(filePath, getFullResponse)
      .catch(err => Promise.reject(errorHandler('GITHUB_READING_FILE', {err})))
  }

  writeFileAndSendReview (filePath, data, branch, commitTitle, reviewBody) {
    return super.writeFileAndSendReview(filePath, data, branch, commitTitle, reviewBody)
      .catch(err => Promise.reject(errorHandler('GITHUB_CREATING_PR', {err})))
  }
}

module.exports = GitHub
