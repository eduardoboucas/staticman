const nock = require('nock')
const oauth = require('../../../lib/OAuth')

describe('OAuth access tokens', () => {
  test('requests OAuth access token from GitHub', () => {
    const accessToken = 'asdfghjkl'
    const clientId = '123456789'
    const clientSecret = '1q2w3e4r5t6y7u8i9o'
    const code = 'abcdefghijklmnopqrst'
    const redirectUri = 'http://my-test-site.com'

    nock(/github\.com/)
      .post('/login/oauth/access_token')
      .query({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri
      })
      .reply(200, {
        access_token: accessToken
      })

    oauth.requestGitHubAccessToken(code, clientId, clientSecret, redirectUri)
      .then(token => expect(token).toEqual(accessToken))
  })

  test('requests OAuth access token from GitLab', () => {
    const accessToken = 'asdfghjkl'
    const clientId = '123456789'
    const clientSecret = '1q2w3e4r5t6y7u8i9o'
    const code = 'abcdefghijklmnopqrst'
    const redirectUri = 'http://my-test-site.com'

    nock(/gitlab\.com/)
      .post('/oauth/token')
      .query({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
      .reply(200, {
        access_token: accessToken
      })

    oauth.requestGitLabAccessToken(code, clientId, clientSecret, redirectUri)
      .then(token => expect(token).toEqual(accessToken))
  })
})
