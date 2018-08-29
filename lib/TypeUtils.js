'use strict'

const assertString = (value, message = `${value} is not a string`) => {
  if (typeof value !== 'string') {
    throw new TypeError(message)
  }
}

module.exports = {
  assertString
}
