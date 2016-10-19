'use strict'

const SUBSCRIPTIONS_PATH = '.staticman/subscriptions'

const SubscriptionsManager = function (dataStore, rsa) {
  this.dataStore = dataStore
  this.rsa = rsa

  this.subscriptions = {}
  this.subscriptionsDecrypted = {}
}

SubscriptionsManager.prototype.get = function (id) {
  const fullPath = `${SUBSCRIPTIONS_PATH}/${id}.json`

  return this.dataStore.readFile(fullPath).then(content => {
    this.subscriptions[id] = content
    this.subscriptionsDecrypted[id] = content.map(encryptedEmail => {
      return this.rsa.decrypt(encryptedEmail, 'utf8')
    })

    return this.subscriptionsDecrypted[id]
  }).catch(err => {
    if (err.code === 404) {
      return null
    }

    return Promise.reject(err)
  })
}

SubscriptionsManager.prototype.set = function (id, email) {
  const fullPath = `${SUBSCRIPTIONS_PATH}/${id}.json`
  const encryptedEmail = this.rsa.encrypt(email, 'base64')

  if (this.subscriptions[id]) {
    if (this.subscriptionsDecrypted[id].indexOf(email) !== -1) {
      return Promise.resolve(true)
    }

    this.subscriptions[id].push(encryptedEmail)
    this.subscriptionsDecrypted[id].push(email)

    const payload = JSON.stringify(this.subscriptions[id])

    return this.dataStore.updateFile(fullPath, payload)
  } else {
    this.subscriptions[id] = [encryptedEmail]
    this.subscriptionsDecrypted[id] = [email]

    const payload = JSON.stringify(this.subscriptions[id])

    return this.dataStore.writeFile(fullPath, payload)
  }
}

module.exports = SubscriptionsManager
