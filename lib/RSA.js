const path = require('path')
const config = require(path.join(__dirname, '/../config'))
const NodeRSA = require('node-rsa')
const key = new NodeRSA()

let RSA_PRIVATE_KEY = config.get('rsaPrivateKey')
if (!RSA_PRIVATE_KEY) {
  if (process.env.STATICMAN_RSA_PRIVATE_KEY) {
    RSA_PRIVATE_KEY = Buffer.from(process.env.STATICMAN_RSA_PRIVATE_KEY, 'base64')
      .toString('ascii')
} else {
  console.log("Could not find RSA Private Key. Check staticman documentation.")
  process.exit()   
}
}
key.importKey(RSA_PRIVATE_KEY)

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
