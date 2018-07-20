'use strict'

const request = require('request-promise')
const errorHandler = require('./ErrorHandler')

const requestGitHubAccessToken = (code, clientId, clientSecret, redirectUri) => {
  return request({
    headers: {
      'Accept': 'application/json'
    },
    json: true,
    method: 'POST',
    uri: `https://github.com/login/oauth/access_token`,
    qs: {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri
    }
  })
    .then(res => res.access_token)
    .catch(err => Promise.reject(errorHandler('GITHUB_AUTH_FAILED', {err}))) // eslint-disable-line handle-callback-err
}

const requestGitLabAccessToken = (code, clientId, clientSecret, redirectUri) => {
  return request({
    headers: {
      'Accept': 'application/json'
    },
    json: true,
    method: 'POST',
    uri: 'https://gitlab.com/oauth/token',
    qs: {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    }
  })
    .then(res => res.access_token)
    .catch(err => Promise.reject(errorHandler('GITLAB_AUTH_FAILED', {err}))) // eslint-disable-line handle-callback-err
}

module.exports = {
  requestGitHubAccessToken,
  requestGitLabAccessToken
}
