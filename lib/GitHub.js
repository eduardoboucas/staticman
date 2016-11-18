'use strict'

const config = require(__dirname + '/../config')
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
      return Promise.reject(err)
    }
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
  })
}

GitHub.prototype.writeFile = function (filePath, data, branch, commitTitle) {
  branch = branch || this.options.branch
  commitTitle = commitTitle || 'Add Staticman file'

  return this.api.repos.createFile({
    user: this.options.username,
    repo: this.options.repository,
    path: filePath,
    content: new Buffer(data).toString('base64'),
    message: commitTitle,
    branch: branch
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
  })
}

module.exports = GitHub
