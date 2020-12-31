'use strict'

const path = require('path')
const config = require(path.join(__dirname, '/../config'))
const handlePR = require('./handlePR')

module.exports = async (req, res, next) => {
  switch (req.params.service) {
    case 'gitlab':
      let errorMsg = null
      let event = req.headers['x-gitlab-event']

      if (!event) {
        errorMsg = 'No event found in the request'
      } else {
        if (event === 'Merge Request Hook') {
          const webhookSecretExpected = config.get('gitlabWebhookSecret')
          const webhookSecretSent = req.headers['x-gitlab-token']

          let reqAuthenticated = true
          if (webhookSecretExpected) {
            reqAuthenticated = false
            if (!webhookSecretSent) {
              errorMsg = 'No secret found in the webhook request'
            } else if (webhookSecretExpected === webhookSecretSent) {
              /*
               * Whereas GitHub uses the webhook secret to sign the request body, GitLab does not.
               * As such, just check that the received secret equals the expected value.
               */
              reqAuthenticated = true
            } else {
              errorMsg = 'Unable to verify authenticity of request'
            }
          }

          if (reqAuthenticated) {
            await handlePR(req.params.repository, req.body).catch((error) => {
              console.error(error.stack || error)
              errorMsg = error.message
            })
          }
        }
      }

      if (errorMsg !== null) {
        res.status(400).send({
          error: errorMsg
        })
      } else {
        res.status(200).send({
          success: true
        })
      }

      break
    default:
      res.status(400).send({
        /*
         * We are expecting GitHub webhooks to be handled by the express-github-webhook module.
         */
        error: 'Unexpected service specified.'
      })
  }
}
