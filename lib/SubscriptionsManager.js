'use strict'

const md5 = require('md5')
const Notification = require('./Notification')

class SubscriptionsManager {
  constructor (parameters, dataStore, mailAgent) {
    this.parameters = parameters
    this.dataStore = dataStore
    this.mailAgent = mailAgent
  }

  _getListAddress (entryId) {
    const compoundId = md5(`${this.parameters.username}-${this.parameters.repository}-${entryId}`)

    return `${compoundId}@${this.mailAgent.domain}`
  }

  _get (entryId) {
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

  async send (entryId, fields, options, siteConfig) {
    const list = await this._get(entryId)

    if (list) {
      const notifications = new Notification(this.mailAgent)

      return notifications.send(list, fields, options, {
        siteName: siteConfig.get('name')
      })
    }
  }

  async set (entryId, email) {
    const listAddress = this._getListAddress(entryId)
    const list = await this._get(entryId)

    if (!list) {
      await new Promise((resolve, reject) => {
        this.mailAgent.lists().create({
          address: listAddress
        }, (err, result) => {
          if (err) return reject(err)

          return resolve(result)
        })
      })
    }

    return new Promise((resolve, reject) => {
      this.mailAgent.lists(listAddress).members().create({
        address: email
      }, (err, result) => {
        // A 400 is fine-ish, means the address already exists
        if (err && (err.statusCode !== 400)) return reject(err)

        return resolve(result)
      })
    })
  }
}

module.exports = SubscriptionsManager
