'use strict'

const pkg = require('./../package.json')

module.exports = (req, res) => {
  res.send(`Hello from Staticman version ${pkg.version}!`)
}
