'use strict'

const RSA = require('../lib/RSA')

module.exports = (req, res) => {
  const encryptedText = RSA.encrypt(req.params.text)

  if (!encryptedText) {
    res.status(500).send('Could not encrypt text')
  }

  res.send(encryptedText)
}
