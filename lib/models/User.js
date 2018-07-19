const {assertString} = require('../TypeUtils')

class User {
  /**
   * @param {string} type
   * @param {string} username
   * @param {string} name
   * @param {string=""} avatarUrl
   * @param {string=""} bio
   * @param {string=""} siteUrl
   * @param {string=""} organisation
   */
  constructor (type, username, name, avatarUrl = '', bio = '', siteUrl = '', organisation = '') {
    assertString(type)
    assertString(username)
    assertString(name)
    assertString(avatarUrl)
    assertString(bio)
    assertString(siteUrl)
    assertString(organisation)

    this.type = type
    this.username = username
    this.name = name
    this.avatarUrl = avatarUrl
    this.bio = bio
    this.siteUrl = siteUrl
    this.organisation = organisation
  }
}

module.exports = User
