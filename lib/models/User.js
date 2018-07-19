class User {
  constructor (type, username, name, avatarUrl = '', bio = '', siteUrl = '', organisation = '') {
    if (typeof type !== 'string') {
      throw new TypeError('Parameter `type` should be a string')
    }
    if (typeof username !== 'string') {
      throw new TypeError('Parameter `username` should be a string')
    }
    if (typeof name !== 'string') {
      throw new TypeError('Parameter `name` should be a string')
    }

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
