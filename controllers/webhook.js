'use strict'

const handlePR = require('./handlePR')

module.exports = async (req, res, next) => {
  switch (req.params.service) {
    case 'gitlab':
      handlePR(req.params.repository, req.body)

      res.status(200).send({
        success: true
      })

      break
    default:
      res.status(500).send({
        error: 'Unexpected service found.'
      })
  }
}
