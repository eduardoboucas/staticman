'use strict'

const md5 = require('md5')
const Notification = require('./Notification')

const SubscriptionsManager = function (parameters, dataStore, mailAgent, domain) {
  this.parameters = parameters
  this.dataStore = dataStore
  this.mailAgent = mailAgent
  this.domain = domain
}

SubscriptionsManager.prototype._getListAddress = function (entryId) {
  const compoundId = md5(`${this.parameters.username}-${this.parameters.repository}-${entryId}`)

  return `${compoundId}@${this.domain}`
}

SubscriptionsManager.prototype._get = function (entryId) {
  const listAddress = this._getListAddress(entryId)

  return this.mailAgent.lists.get(listAddress)
    .then(data => { return data.address })
}

SubscriptionsManager.prototype.send = function (entryId, fields, options, siteConfig) {
  return this._get(entryId).then(list => {
    if (list) {
      const notifications = new Notification(this.mailAgent, this.domain)

      return notifications.send(list, fields, options, {
        siteName: siteConfig.get('name')
      })
    }
  })
}

SubscriptionsManager.prototype.set = async function (entryId, email) {
  const listAddress = this._getListAddress(entryId)

  const addressFound = await this._get(entryId)
  if (!addressFound) {
    await this.mailAgent.lists.create({
      address: listAddress
    })
  }

  await this.mailAgent.lists.members.createMember(listAddress, {
    address: email
  })
}

module.exports = SubscriptionsManager
