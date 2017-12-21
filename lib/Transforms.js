const md5 = require('md5')

exports.md5 = function md5Transform (value) {
  return md5(value)
}
