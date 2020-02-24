const path = require('path')
const config = require(path.join(__dirname, '/../config'))
const NodeRSA = require('node-rsa')
const key = new NodeRSA()

key.importKey(config.get('rsaPrivateKey'), 'private')

module.exports.encrypt = text => {
  try {
    const encryptedText = key.encrypt(text, 'base64')

    return encryptedText
  } catch (err) {
    return null
  }
}

module.exports.decrypt = text => {
  try {
    return key.decrypt(text, 'utf8')
  } catch (err) {
    return null
  }
}
