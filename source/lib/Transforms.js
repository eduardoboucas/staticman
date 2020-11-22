const md5 = require('md5')

const upcase = (value) => {
  return String(value).toUpperCase()
}

const downcase = (value) => {
  return String(value).toLowerCase()
}

module.exports = {
  md5,
  upcase,
  downcase
}
