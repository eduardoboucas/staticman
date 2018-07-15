'use strict'

const config = require('../config')
const errorHandler = require('./ErrorHandler')
const GitHubApi = require('github')
const GitService = require('./GitService')
const request = require('request-promise-native')

class GitHub extends GitService {
  constructor (options = {}) {
    super(options.username, options.repository, options.branch)

    this.api = new GitHubApi({
      debug: config.get('env') === 'development',
      protocol: 'https',
      host: 'api.github.com',
      pathPrefix: '',
      headers: {
        'user-agent': 'Staticman agent'
      },
      timeout: 5000,
      Promise: Promise
    })
  }

  authenticateWithToken (token, type = 'oauth') {
    this.api.authenticate({
      type,
      token
    })
  }

  authenticateWithCode (code, clientId, clientSecret) {
    return request({
      headers: {
        'Accept': 'application/json'
      },
      json: true,
      method: 'POST',
      uri: `https://github.com/login/oauth/access_token?client_id=${clientId}&client_secret=${clientSecret}&code=${code}`
    })
      .then((res) => {
        this.authenticateWithToken(res.access_token, 'token')
        return res.access_token
      })
      .catch(err => Promise.reject(errorHandler('GITHUB_AUTH_FAILED'))) // eslint-disable-line handle-callback-err
  }

  _pullFile (filePath, branch) {
    return this.api.repos.getContent({
      user: this.username,
      repo: this.repository,
      path: filePath,
      ref: branch
    })
      .catch(err => Promise.reject(errorHandler('GITHUB_READING_FILE', {err})))
  }

  _commitFile (filePath, content, commitMessage, branch) {
    return this.api.repos.createFile({
      user: this.username,
      repo: this.repository,
      path: filePath,
      message: commitMessage,
      content,
      branch
    })
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
      user: this.username,
      repo: this.repository,
      branch
    })
      .then(res => res.commit.sha)
  }

  createBranch (branch, sha) {
    return this.api.gitdata.createReference({
      user: this.username,
      repo: this.repository,
      ref: 'refs/heads/' + branch,
      sha
    })
  }

  createReview (reviewTitle, branch, reviewBody) {
    return this.api.pullRequests.create({
      user: this.username,
      repo: this.repository,
      title: reviewTitle,
      head: branch,
      base: this.branch,
      body: reviewBody
    })
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
