'use strict'

const md5 = require('md5')
const Notification = require('./Notification')

const SubscriptionsManager = function (parameters, dataStore, mailAgent) {
  this.parameters = parameters
  this.dataStore = dataStore
  this.mailAgent = mailAgent
}

SubscriptionsManager.prototype._getListAddress = function (entryId) {
  const compoundId = md5(`${this.parameters.username}-${this.parameters.repository}-${entryId}`)

  return `${compoundId}@${this.mailAgent.domain}`
}

SubscriptionsManager.prototype._get = function (entryId) {
  const listAddress = this._getListAddress(entryId)

  return new Promise((resolve, reject) => {
    this.mailAgent.lists(listAddress).info((err, value) => {
      if (err && (err.statusCode !== 404)) {
        return reject(err)
      }

      if (err || !value || !value.list) {
        return resolve(null)
      }

      return resolve(listAddress)
    })
  })
}

SubscriptionsManager.prototype.send = function (entryId, fields, options, siteConfig) {
  return this._get(entryId).then(list => {
    if (list) {
      const notifications = new Notification(this.mailAgent)

      return notifications.send(list, fields, options, {
        siteName: siteConfig.get('name')
      })
    }
  })
}

SubscriptionsManager.prototype.set = function (options, email) {
  const entryId = options.parent
  const listAddress = this._getListAddress(entryId)

  return new Promise((resolve, reject) => {
    let queue = []

    return this._get(entryId).then(list => {
      if (!list) {
        queue.push(new Promise((resolve, reject) => {
          let payload = {
            address: listAddress
          }
          /*
           * Only allow authenticated users to post to the list. This is the default, but let's
           * explicitly set it in case the default changes.
           */
          payload.access_level = 'readonly'

          /*
           * Restricting replies to "sender" (as opposed to all members of the list) would seem
           * to be the safest and most appropriate option for a list meant to receive
           * notifications.
           */
          payload.reply_preference = 'sender'

          const entryName = options.parentName
          if (typeof entryName !== 'undefined') {
            /*
             * Set a name and description on the created list to aid in identification and
             * troubleshooting, as the automatically-generated list address is an obfuscated
             * hash value.
             */
            payload.name = entryName
            payload.description = 'Subscribers to: ' + entryName +
              ' (' + this.parameters.username + '/' + this.parameters.repository + ')'
          }

          this.mailAgent.lists().create(payload, (err, result) => {
            if (err) return reject(err)

            return resolve(result)
          })
        }))
      }

      return Promise.all(queue).then(() => {
        this.mailAgent.lists(listAddress).members().create({
          address: email
        }, (err, result) => {
          // A 400 is fine-ish, means the address already exists
          if (err && (err.statusCode !== 400)) return reject(err)

          return resolve(result)
        })
      })
    }).catch(error => {
      reject(error)
    })
  })
}

module.exports = SubscriptionsManager
