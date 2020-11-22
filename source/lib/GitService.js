'use strict'

const errorHandler = require('./ErrorHandler')
const yaml = require('js-yaml')

class GitService {
  constructor (username, repository, branch) {
    this.username = username
    this.repository = repository
    this.branch = branch
  }

  _pullFile (filePath, branch) {
    throw new Error('Abstract method `_pullFile` should be implemented')
  }

  _commitFile (filePath, contents, commitTitle, branch) {
    throw new Error('Abstract method `_commitFile` should be implemented')
  }

  getBranchHeadCommit (branch) {
    throw new Error('Abstract method `getBranchHeadCommit` should be implemented')
  }

  createBranch (branch, sha) {
    throw new Error('Abstract method `createBranch` should be implemented')
  }

  deleteBranch (branch) {
    throw new Error('Abstract method `deleteBranch` should be implemented')
  }

  createReview (commitTitle, branch, reviewBody) {
    throw new Error('Abstract method `createReview` should be implemented')
  }

  getReview (reviewId) {
    throw new Error('Abstract method `getReview` should be implemented')
  }

  getCurrentUser () {
    throw new Error('Abstract method `getCurrentUser` should be implemented')
  }

  async readFile (path, getFullResponse) {
    const extension = path.split('.').pop()

    let res = await this._pullFile(path, this.branch)

    let content
    try {
      content = Buffer.from(res.content, 'base64').toString()
    } catch (err) {
      throw errorHandler('GITHUB_READING_FILE', {err})
    }

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

      if (getFullResponse) {
        return {
          content: content,
          file: {
            content: res.content
          }
        }
      }

      return content
    } catch (err) {
      let errorData = {err}

      if (err.message) {
        errorData.data = err.message
      }

      throw errorHandler('PARSING_ERROR', errorData)
    }
  }

  writeFile (filePath, data, branch = this.branch, commitTitle = 'Add Staticman file') {
    return this._commitFile(filePath, Buffer.from(data).toString('base64'), commitTitle, branch)
  }

  writeFileAndSendReview (filePath, data, branch, commitTitle = 'Add Staticman file', reviewBody = '') {
    return this.getBranchHeadCommit(this.branch)
      .then(sha => this.createBranch(branch, sha))
      .then(() => this.writeFile(filePath, data, branch, commitTitle))
      .then(() => this.createReview(commitTitle, branch, reviewBody))
  }
}

module.exports = GitService
