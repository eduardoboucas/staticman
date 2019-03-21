'use strict'

const GitLab = require('./GitLab')
const GitHub = require('./GitHub')

module.exports.create = (service, options) => {
  switch (service) {
    case 'gitlab':
      return new GitLab(options)
    default:
      return new GitHub(options)
  }
}
