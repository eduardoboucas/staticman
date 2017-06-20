const objectPath = require('object-path')
const yaml = require('js-yaml')

const Config = function (rawContent) {
  this.data = yaml.safeLoad(rawContent, 'utf8')
}

Config.prototype.get = function (key) {
  if (key) {
    return objectPath.get(this.data, key)  
  }
  
  return this.data
}

Config.prototype.set = function (key, value) {
  this.data = objectPath.set(this.data, key, value)

  return this.data
}

module.exports = Config
