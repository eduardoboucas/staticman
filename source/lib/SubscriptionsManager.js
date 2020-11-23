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

SubscriptionsManager.prototype.set = function (entryId, email) {
  const listAddress = this._getListAddress(entryId)

  return new Promise((resolve, reject) => {
    const queue = []

    return this._get(entryId).then(list => {
      if (!list) {
        queue.push(new Promise((resolve, reject) => {
          this.mailAgent.lists().create({
            address: listAddress
          }, (err, result) => {
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
    })
  })
}

module.exports = SubscriptionsManager
