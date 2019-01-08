'use strict'

const path = require('path')
const config = require(path.join(__dirname, '/../config'))

const Notification = function (mailAgent) {
  this.mailAgent = mailAgent
}

Notification.prototype._buildReplyMessage = function (fields, options, data) {
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

Notification.prototype._buildAcceptedMessage = function (fields, options, data) {
  return `
  <html>
    <body>
      Dear human,<br>
      <br>
      Your comment has been accepted${data.siteName ? ` on <strong>${data.siteName}</strong>` : ''}.<br>
      <br>
      ${options.origin ? `<a href="${options.origin}">Click here</a> to see it.` : ''}<br>
      <br>
      #ftw,<br>
      -- <a href="https://staticman.net">Staticman</a>
    </body>
  </html>
  `
}

Notification.prototype.send = function (to, fields, options, data, template) {
  let subject = null
  let html = null

  switch (template) {
    case 'reply':
      subject = data.siteName ? `New reply on "${data.siteName}"` : 'New reply'
      html = this._buildReplyMessage(fields, options, data)
      break
    case 'accepted':
      subject = data.siteName ? `Comment accepted on "${data.siteName}"` : 'Comment accepted'
      html = this._buildAcceptedMessage(fields, options, data)
      break
    default:
      return Promise.reject(new Error(`Unknown template: ${template}`))
  }

  return new Promise((resolve, reject) => {
    this.mailAgent.messages().send({
      from: `Staticman <${config.get('email.fromAddress')}>`,
      to,
      subject,
      html
    }, (err, res) => {
      if (err) {
        return reject(err)
      }

      return resolve(res)
    })
  })
}

module.exports = Notification
