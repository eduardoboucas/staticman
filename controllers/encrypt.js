'use strict'

const path = require('path')
const config = require(path.join(__dirname, '/../config'))
const NodeRSA = require('node-rsa')
const key = new NodeRSA()

key.importKey(config.get('rsaPrivateKey'))

module.exports = (req, res) => {
  try {
    const encryptedText = key.encrypt(req.params.text, 'base64')

    res.send(encryptedText)
  } catch (err) {
    res.status(500).send('Could not encrypt text')
  }
}
