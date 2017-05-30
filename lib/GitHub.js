'use strict'

const config = require(__dirname + '/../config')
const errorHandler = require('./ErrorHandler')
const GitHubApi = require('github')
const yaml = require('js-yaml')

const GitHub = function (options) {
  this.options = options

  this.api = new GitHubApi({
    debug: false,
    protocol: 'https',
    host: 'api.github.com',
    pathPrefix: '',
    headers: {
      'user-agent': 'Staticman agent'
    },
    timeout: 5000,
    Promise: Promise
  })

  this.api.authenticate({
    type: 'oauth',
    token: config.get('githubToken')
  })
}

GitHub.prototype.readFile = function (path, getFullResponse) {
  const extension = path.split('.').pop()

  return this.api.repos.getContent({
    user: this.options.username,
    repo: this.options.repository,
    path,
    ref: this.options.branch
  }).then(res => {
    let content = new Buffer(res.content, 'base64').toString()

    try {
      switch (extension) {
        case 'yml':
        case 'yaml':
          content = yaml.safeLoad(content, 'utf8')

          break

        case 'json':
          content = JSON.parse(content)

          break
      }

      return getFullResponse ? {content: content, file: res} : content
    } catch (err) {
      errorHandler.log(err)

      return Promise.reject(errorHandler('UNKNOWN_FILE_EXTENSION', {err}))
    }
  }).catch(err => {
    errorHandler.log(err)

    return Promise.reject(errorHandler('GITHUB_READING_FILE', {err}))
  })
}

GitHub.prototype.updateFile = function (path, data, branch, commitTitle) {
  branch = branch || this.options.branch
  commitTitle = commitTitle || 'Update Staticman file'

  return this.readFile(path, true).then(res => {
    return this.api.repos.updateFile({
      user: this.options.username,
      repo: this.options.repository,
      branch: branch,
      path: path,
      sha: res.file.sha,
      content: new Buffer(data).toString('base64'),
      message: commitTitle
    })
  }).catch(err => {
    errorHandler.log(err)

    return Promise.reject(errorHandler('GITHUB_UPDATING_FILE', {err}))
  })
}

GitHub.prototype.writeFile = function (filePath, data, branch, commitTitle) {
  return this._writeFile(filePath, data, branch, commitTitle, this.options.username, this.options.repository)
}


GitHub.prototype._writeFile = function (filePath, data, branch, commitTitle, username, repository) {
  branch = branch || this.options.branch
  commitTitle = commitTitle || 'Add Staticman file'

  return this.api.repos.createFile({
    user: username,
    repo: repository,
    path: filePath,
    content: new Buffer(data).toString('base64'),
    message: commitTitle,
    branch: branch
  }).catch(err => {
    errorHandler.log(err)

    return Promise.reject(errorHandler('GITHUB_WRITING_FILE', {err}))
  })
}

GitHub.prototype.writeFileAndSendPR = function (filePath, data, branch, commitTitle, commitBody) {
  commitTitle = commitTitle || 'Add Staticman file'
  commitBody = commitBody || ''

  return this.api.repos.getBranch({
    user: this.options.username,
    repo: this.options.repository,
    branch: this.options.branch
  }).then(res => {
    return this.api.gitdata.createReference({
      user: this.options.username,
      repo: this.options.repository,
      ref: 'refs/heads/' + branch,
      sha: res.commit.sha
    })
  }).then(res => {
    return this._writeFile(filePath, data, branch, commitTitle, this.options.username, this.options.repository)
  }).then(res => {
    return this.api.pullRequests.create({
      user: this.options.username,
      repo: this.options.repository,
      title: commitTitle,
      head: branch,
      base: this.options.branch,
      body: commitBody
    })
  }).catch(err => {
    errorHandler.log(err)

    return Promise.reject(errorHandler('GITHUB_CREATING_PR', {err}))
  })
}

/* If repository is already forked by staticman, this will go to the existing fork.  If repository is not already forked, then this will fork the repository and fail, branch the fork, and fail.  I think that this failure is due to the GitHub API reporting a success for a fork prematurely, or something like that. */
GitHub.prototype.forkAndWriteFileAndSendPR = function (filePath, data, branch, commitTitle, commitBody) {
  commitTitle = commitTitle || 'Add Staticman file'
  commitBody = commitBody || ''

  var forkUser, forkRepo
    
  return this.api.repos.fork({
    user: this.options.username,
    repo: this.options.repository
  }).then(res => {

    forkUser = res.owner.login
    forkRepo = res.name
    
    return this.api.repos.getBranch({
      user: forkUser,
      repo: forkRepo,
      branch: this.options.branch
    })
  }).then(res => {
      return this.api.gitdata.createReference({
        user: forkUser,
        repo: forkRepo,
        ref: 'refs/heads/' + branch,
        sha: res.commit.sha
      })
  }).then(res => {
    return this._writeFile(filePath, data, branch, commitTitle, forkUser, forkRepo)
  }).then(res => {
    return this.api.pullRequests.create({
      user: this.options.username,
      repo: this.options.repository,
      title: commitTitle,
      head: forkUser + ':' + branch,
      base: this.options.branch,
      body: commitBody
    })
  }).catch(err => {
    errorHandler.log(err)

    return Promise.reject(errorHandler('GITHUB_CREATING_FORK_AND_PR', {err}))
  })
}

module.exports = GitHub
