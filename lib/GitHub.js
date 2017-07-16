'use strict'

const path = require('path')
const config = require(path.join(__dirname, '/../config'))
const errorHandler = require('./ErrorHandler')
const GitHubApi = require('github')
const yaml = require('js-yaml')

const GitHub = function (options) {
  this.options = options

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
    let content = Buffer.from(res.content, 'base64').toString()

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

      return getFullResponse ? {
        content: content,
        sha: res.sha,
        file: {
          content: res.content
        }
      } : content
    } catch (err) {
      let errorData = {
        err
      }

      if (err.message) {
        errorData.data = err.message
      }

      return Promise.reject(errorHandler('PARSING_ERROR', errorData))
    }
  }).catch(err => {
    return Promise.reject(errorHandler('GITHUB_READING_FILE', err))
  })
}

GitHub.prototype.writeFile = function (filePath, data, branch, commitTitle) {
  branch = branch || this.options.branch
  commitTitle = commitTitle || 'Add Staticman file'
  var content = Buffer.from(data).toString('base64')
  var requestData = {
    user: this.options.username,
    repo: this.options.repository,
    path: filePath,
    content: content,
    message: commitTitle,
    branch: branch
  }
  var readFileResponse = this.readFile(filePath, true)

  return readFileResponse.then(r => {
    // If the file exists, get its sha and send an update request.
    requestData['sha'] = r.sha

    return this.api.repos.updateFile(requestData).catch(err => {
      return Promise.reject(errorHandler('GITHUB_UPDATING_FILE', {err}))
    })
  }).catch(err => {
    // If new file doesn't previously exists, create it on the repository.
    return this.api.repos.createFile(requestData).catch(err => {
      return Promise.reject(errorHandler('GITHUB_WRITING_FILE', {err}))
    })
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
    return this.writeFile(filePath, data, branch, commitTitle)
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
    return Promise.reject(errorHandler('GITHUB_CREATING_PR', {err}))
  })
}

module.exports = GitHub
