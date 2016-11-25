'use strict'

const config = require(__dirname + '/../config')
const privateKey = require('fs').readFileSync('staticman_key', 'utf8')
const NodeRSA = require('node-rsa')
const key = new NodeRSA()

key.importKey(privateKey)

module.exports = ((req, res) => {
  try {
    const encryptedText = key.encrypt(req.params.text, 'base64')
    
    res.send(encryptedText)  
  } catch (err) {
    res.status(500).send('Could not encrypt text')
  }
})
