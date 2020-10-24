'use strict'

const path = require('path')
const config = require(path.join(__dirname, '/../config'))

const Notification = function (mailAgent) {
  this.mailAgent = mailAgent
}

Notification.prototype._buildMessage = function (fields, options, data) {
  return `
  <html>
    <body>
      Dear human,<br>
      <br>
      Someone replied to a comment you subscribed to${data.siteName ? ` on <strong>${data.siteName}</strong>` : ''}.<br>
      <br>
      ${options.origin ? `<a href="${options.origin}">Click here</a> to see it.` : ''} If you do not wish to receive any further notifications for this thread, <a href="%mailing_list_unsubscribe_url%">click here</a>.<br>
      <br>
      #ftw,<br>
      -- <a href="https://staticman.net">Staticman</a>
    </body>
  </html>
  `
}

Notification.prototype.send = function (to, fields, options, data) {
  const subject = data.siteName ? `New reply on "${data.siteName}"` : 'New reply'

  return new Promise((resolve, reject) => {
    let payload = {
      from: `Staticman <${config.get('email.fromAddress')}>`,
      to,
      subject,
      html: this._buildMessage(fields, options, data)
    }
    /*
     * If we set the "reply_preference" property on the Mailgun mailing list to "sender" (which
     * seems to be the safest and most appropriate option for a list meant to receive
     * notifications), the "reply-to" of every email sent via the mailing list will be
     * postmaster@[mailgun domain] instead of the "from" address set above. Defeat this by
     * explicitly setting the "h:Reply-To" header.
     */
    payload['h:Reply-To'] = payload.from

    this.mailAgent.messages().send(payload, (err, res) => {
      if (err) {
        return reject(err)
      }

      return resolve(res)
    })
  })
}

module.exports = Notification
