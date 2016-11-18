'use strict'

const SubscriptionsManager = function (dataStore, mailAgent) {
  this.dataStore = dataStore
  this.mailAgent = mailAgent
}

SubscriptionsManager.prototype.get = function (entryId) {
  const listAddress = `${entryId}@${this.mailAgent.domain}`

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

SubscriptionsManager.prototype.set = function (entryId, email) {
  const listAddress = `${entryId}@${this.mailAgent.domain}`

  return new Promise((resolve, reject) => {
    let queue = []

    return this.get(entryId).then(list => {
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
