'use strict'

const config = require(__dirname + '/../config')
const SparkPost = require('sparkpost')

const Notification = function () {
  this.sparkpost = new SparkPost(config.get('email.sparkpostApiKey'))
}

Notification.prototype._buildMessage = function (fields, options, siteConfig) {
  return `
  <html>
    <body>
      Hello,<br>
      <br>
      Someone replied to a comment you subscribed to${siteConfig.get('name') ? ` on <strong>${siteConfig.get('name')}</strong>` : ''}.
      ${options.origin ? `<a href="${options.origin}">Click here</a> to see it.` : ''}<br>
      <br>
      Your friend,<br>
      -- <a href="https://staticman.net">Staticman</a>
    </body>
  </html>
  `
}

Notification.prototype.send = function (recipients, fields, options, siteConfig) {
  const subject = siteConfig.get('name') ? `New reply on "${siteConfig.get('name')}"` : 'New reply'

  this.sparkpost.transmissions.send({
    transmissionBody: {
      content: {
        from: `Staticman <${config.get('email.fromAddress')}>`,
        subject: subject,
        html: this._buildMessage(fields, options, siteConfig)
      },
      recipients: recipients.map(recipient => {
        return {
          address: recipient
        }
      })
    }
  }, (err, res) => {
    if (err) {
      console.log(err.stack || err)
    }
  })
}

module.exports = Notification
