'use strict'

const config = require('../config')
const errorHandler = require('./ErrorHandler')
const GitLabApi = require('gitlab/dist/es5').default
const GitService = require('./GitService')
const Review = require('./models/Review')
const User = require('./models/User')

class GitLab extends GitService {
  constructor (options = {}) {
    super(options.username, options.repository, options.branch)

    const token = config.get('gitlabToken')

    if (options.oauthToken) {
      this.api = new GitLabApi({
        url: config.get('gitlabBaseUrl'),
        oauthToken: options.oauthToken
      })
    } else if (token) {
      this.api = new GitLabApi({
        url: config.get('gitlabBaseUrl'),
        token
      })
    } else {
      throw new Error('Require an `oauthToken` or `token` option')
    }
  }

  get repositoryId () {
    if (this.username && this.repository) {
      return `${this.username}/${this.repository}`
    }

    return ''
  }

  _pullFile (path, branch) {
    return this.api.RepositoryFiles.show(this.repositoryId, path, branch)
      .catch(err => Promise.reject(errorHandler('GITLAB_READING_FILE', {err})))
  }

  _commitFile (filePath, content, commitMessage, branch) {
    return this.api.RepositoryFiles.create(this.repositoryId, filePath, branch, {
      content,
      commit_message: commitMessage,
      encoding: 'base64'
    })
  }

  getBranchHeadCommit (branch) {
    return this.api.Branches.show(this.repositoryId, branch)
      .then(res => res.commit.id)
  }

  createBranch (branch, sha) {
    return this.api.Branches.create(this.repositoryId, branch, sha)
  }

  deleteBranch (branch) {
    return this.api.Branches.remove(this.repositoryId, branch)
  }

  createReview (reviewTitle, branch, reviewBody) {
    return this.api.MergeRequests.create(this.repositoryId, branch, this.branch, reviewTitle, {
      description: reviewBody,
      remove_source_branch: true
    })
  }

  getReview (reviewId) {
    return this.api.MergeRequests.show(this.repositoryId, reviewId)
      .then(({
          description: body,
          source_branch: sourceBranch,
          target_branch: targetBranch,
          state,
          title
        }) => new Review(
          title,
          body,
          state,
          sourceBranch,
          targetBranch
        )
      )
  }

  readFile (filePath, getFullResponse) {
    return super.readFile(filePath, getFullResponse)
      .catch(err => Promise.reject(errorHandler('GITLAB_READING_FILE', {err})))
  }

  writeFile (filePath, data, targetBranch, commitTitle) {
    return super.writeFile(filePath, data, targetBranch, commitTitle)
      .catch(err => {
        if (err.error && err.error.message === 'A file with this name already exists') {
          return Promise.reject(errorHandler('GITLAB_FILE_ALREADY_EXISTS', {err}))
        }

        return Promise.reject(errorHandler('GITLAB_WRITING_FILE', {err}))
      })
  }

  writeFileAndSendReview (filePath, data, branch, commitTitle, reviewBody) {
    return super.writeFileAndSendReview(filePath, data, branch, commitTitle, reviewBody)
      .catch(err => Promise.reject(errorHandler('GITLAB_CREATING_PR', {err})))
  }

  getCurrentUser () {
    return this.api.Users.current()
      .then(({username, email, name, avatar_url, bio, website_url, organisation}) =>
        new User('gitlab', username, email, name, avatar_url, bio, website_url, organisation)
      )
      .catch(err => Promise.reject(errorHandler('GITLAB_GET_USER', {err})))
  }
}

module.exports = GitLab
