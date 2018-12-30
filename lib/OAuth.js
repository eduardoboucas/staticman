'use strict'

const config = require('../config')
const request = require('request-promise')
const errorHandler = require('./ErrorHandler')

/**
 * Helper for getting API access tokens
 * @param {github|gitlab} type type of token to get
 * @param {*} code
 * @param {*} clientId
 * @param {*} clientSecret
 * @param {*} redirectUri
 */
const _requestAccessToken = async (type, code, clientId, clientSecret, redirectUri) => {
  try {
    const res = await request({
      headers: {
        'Accept': 'application/json'
      },
      json: true,
      method: 'POST',
      uri: config.get(`${type}AccessTokenUri`),
      qs: {
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: type === 'gitlab' ? 'authorization_code' : undefined
      }
    })

    return res.access_token
  } catch (err) {
    throw errorHandler(`${type.toUpperCase()}_AUTH_FAILED`, { err })
  }
}

const requestGitHubAccessToken = (code, clientId, clientSecret, redirectUri) => {
  return _requestAccessToken('github', code, clientId, clientSecret, redirectUri)
}

const requestGitLabAccessToken = (code, clientId, clientSecret, redirectUri) => {
  return _requestAccessToken('gitlab', code, clientId, clientSecret, redirectUri)
}

module.exports = {
  requestGitHubAccessToken,
  requestGitLabAccessToken
}
