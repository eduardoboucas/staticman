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
    return Promise.reject(errorHandler('GITHUB_READING_FILE', {err}))
  })
}

GitHub.prototype.writeFile = function (filePath, data, branch, commitTitle) {
  branch = branch || this.options.branch
  commitTitle = commitTitle || 'Add Staticman file'

  return this.api.repos.createFile({
    user: this.options.username,
    repo: this.options.repository,
    path: filePath,
    content: Buffer.from(data).toString('base64'),
    message: commitTitle,
    branch: branch
  }).catch(err => {
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
