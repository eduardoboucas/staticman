'use strict'

const { assertString } = require('../TypeUtils')

class Review {
  /**
   * @param {string} title
   * @param {string} body
   * @param {string} state
   * @param {string} sourceBranch
   * @param {string} targetBranch
   */
  constructor (title, body, state, sourceBranch, targetBranch) {
    assertString(title)
    assertString(body)
    assertString(state)
    assertString(sourceBranch)
    assertString(targetBranch)

    this.title = title
    this.body = body
    this.state = state
    this.sourceBranch = sourceBranch
    this.targetBranch = targetBranch
  }
}

module.exports = Review
