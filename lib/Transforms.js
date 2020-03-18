const md5 = require('md5')
const sanitizer = require('sanitizer')

const upcase = (value) => {
  return String(value).toUpperCase()
}

const downcase = (value) => {
  return String(value).toLowerCase()
}

const sanitize = (value) => {
  return sanitizer.sanitize(value)
}

const escape = (value) => {
  return sanitizer.escape(value)
}

module.exports = {
  md5,
  upcase,
  downcase,
  sanitize,
  escape
}
