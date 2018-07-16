const config = require('./../../../config')
const githubAuth = require('./../../../controllers/githubAuth')
const helpers = require('./../../helpers')
const nock = require('nock')
const Staticman = require('./../../../lib/Staticman')

Staticman.prototype.getSiteConfig = function () {
  return Promise.resolve(helpers.getConfig())
}

let req
let res

const mockSiteConfig = helpers.getConfig()

// const mockConfig = helpers.getConfig()
//   .replace('@githubAuthClientId@', helpers.encrypt('testClient'))
//   .replace('@githubAuthClientSecret@', helpers.enrypt('superSecret'))

beforeEach(() => {
  //jest.resetModules()
  //jest.unmock('github')

  req = helpers.getMockRequest()
  res = helpers.getMockResponse()  
})

describe('GitHub Auth controller', () => {
  test('authenticates with the given code and returns the authenticated user', () => {
    const mockAccessToken = 'qwertyuiop'
    const mockCode = '1q2w3e4r'
    const mockUser = {
      login: 'johndoe'
    }

    nock(/github\.com/)
      .post('/login/oauth/access_token')
      .query({
        client_id: 'testClient',
        client_secret: 'superSecret',
        code: mockCode
      })
      .reply(200, {
        access_token: mockAccessToken
      })

    nock(/github\.com/).get('/user')
      .query({
        access_token: mockAccessToken
      })
      .reply(200, mockUser)

    const reqWithQuery = Object.assign({}, req, {
      query: {
        code: mockCode
      }
    })

    return githubAuth(reqWithQuery, res).then(result => {
      expect(res.send).toHaveBeenCalledTimes(1)
      expect(helpers.decrypt(res.send.mock.calls[0][0].accessToken)).toBe(mockAccessToken)
      expect(res.send.mock.calls[0][0].user.login).toBe(mockUser.login)
    })
  })
})
