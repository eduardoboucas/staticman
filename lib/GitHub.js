'use strict'

const config = require('../config')
const errorHandler = require('./ErrorHandler')
const githubApi = require('@octokit/rest')
const GitService = require('./GitService')
const jsonwebtoken = require('jsonwebtoken')
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

    const isAppAuth = config.get('githubAppID') &&
      config.get('githubPrivateKey')
    const isLegacyAuth = config.get('githubToken') &&
      ['1', '2'].includes(options.version)

    this.authentication = Promise.resolve()

    if (options.oauthToken) {
      this.api.authenticate({
        type: 'oauth',
        token: options.oauthToken
      })
    } else if (isLegacyAuth) {
      this.api.authenticate({
        type: 'token',
        token: config.get('githubToken')
      })
    } else if (isAppAuth) {
      this.authentication = this._authenticate(
        options.username,
        options.repository
      )
    } else {
      throw new Error('Require an `oauthToken` or `token` option')
    }
  }

  _authenticate (username, repository) {
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      iat: now,
      exp: now + 60,
      iss: config.get('githubAppID')
    }
    const bearer = jsonwebtoken.sign(payload, config.get('githubPrivateKey'), {
      algorithm: 'RS256'
    })

    this.api.authenticate({
      type: 'app',
      token: bearer
    })

    return this.api.apps.findRepoInstallation({
      owner: username,
      repo: repository
    }).then(({data}) => {
      return this.api.apps.createInstallationToken({
        installation_id: data.id
      })
    }).then(({data}) => {
      this.api.authenticate({
        type: 'token',
        token: data.token
      })
    })
  }

  _pullFile (filePath, branch) {
    return this.authentication.then(() => this.api.repos.getContents({
      owner: this.username,
      repo: this.repository,
      path: filePath,
      ref: branch
    }))
      .then(normalizeResponse)
      .catch(err => Promise.reject(errorHandler('GITHUB_READING_FILE', {err})))
  }

  _commitFile (filePath, content, commitMessage, branch) {
    return this.authentication.then(() => this.api.repos.createFile({
      owner: this.username,
      repo: this.repository,
      path: filePath,
      message: commitMessage,
      content,
      branch
    }))
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
    return this.authentication.then(() => this.api.repos.getBranch({
      owner: this.username,
      repo: this.repository,
      branch
    }))
      .then(res => res.data.commit.sha)
  }

  createBranch (branch, sha) {
    return this.authentication.then(() => this.api.git.createRef({
      owner: this.username,
      repo: this.repository,
      ref: `refs/heads/${branch}`,
      sha
    }))
      .then(normalizeResponse)
  }

  deleteBranch (branch) {
    return this.authentication.then(() => this.api.git.deleteRef({
      owner: this.username,
      repo: this.repository,
      ref: `heads/${branch}`
    }))
  }

  createReview (reviewTitle, branch, reviewBody) {
    return this.authentication.then(() => this.api.pullRequests.create({
      owner: this.username,
      repo: this.repository,
      title: reviewTitle,
      head: branch,
      base: this.branch,
      body: reviewBody
    }))
      .then(normalizeResponse)
  }

  getReview (reviewId) {
    return this.authentication.then(() => this.api.pullRequests.get({
      owner: this.username,
      repo: this.repository,
      number: reviewId
    }))
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
    return this.authentication.then(() => this.api.users.getAuthenticated({}))
      .then(normalizeResponse)
      .then(({login, email, avatar_url, name, bio, company, blog}) =>
        new User('github', login, email, name, avatar_url, bio, blog, company)
      )
      .catch(err => Promise.reject(errorHandler('GITHUB_GET_USER', {err})))
  }
}

module.exports = GitHub
