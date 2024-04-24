'use strict'

const path = require('path')
const config = require(path.join(__dirname, '/../config'))

const Notification = function (mailAgent, domain) {
  this.mailAgent = mailAgent
  this.domain = domain
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

  return this.mailAgent.messages.create(this.domain, {
    from: `Staticman <${config.get('email.fromAddress')}>`,
    to,
    subject,
    html: this._buildMessage(fields, options, data)
  })
  .then(msg => console.log(msg))
  .catch(err => console.error(err))
}

module.exports = Notification
