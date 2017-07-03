const config = require('./../../../config')
const helpers = require('./../../helpers')
const githubToken = config.get('githubToken')
const nock = require('nock')

let req, res

beforeEach(() => {
  req = helpers.getMockRequest()
  res = helpers.getMockResponse()

  jest.resetModules()
  jest.unmock('github')
})

describe('Connect controller', () => {
  test('accepts the invitation if one is found and replies with "OK!"', () => {
    const invitationId = 123
    const mockAcceptRepoInvite = jest.fn(() => Promise.resolve())
    const mockGetRepoInvites = jest.fn(() => Promise.resolve([
      {
        id: invitationId,
        repository: {
          full_name: `${req.params.username}/${req.params.repository}`
        }
      }
    ]))

    jest.mock('github', () => {
      const GithubApi = function () {}

      GithubApi.prototype.authenticate = jest.fn()
      GithubApi.prototype.users = {
        acceptRepoInvite: mockAcceptRepoInvite,
        getRepoInvites: mockGetRepoInvites
      }

      return GithubApi
    })

    const connect = require('./../../../controllers/connect')

    return connect(req, res).then(response => {
      expect(mockGetRepoInvites).toHaveBeenCalledTimes(1)
      expect(mockAcceptRepoInvite).toHaveBeenCalledTimes(1)
      expect(res.send.mock.calls[0][0]).toBe('OK!')
    })
  })

  test('returns a 404 and an error message if a matching invitation is not found', () => {
    const invitationId = 123
    const mockAcceptRepoInvite = jest.fn(() => Promise.resolve())
    const mockGetRepoInvites = jest.fn(() => Promise.resolve([
      {
        id: invitationId,
        repository: {
          full_name: `${req.params.username}/anotherrepo`
        }
      }
    ]))

    jest.mock('github', () => {
      const GithubApi = function () {}

      GithubApi.prototype.authenticate = jest.fn()
      GithubApi.prototype.users = {
        acceptRepoInvite: mockAcceptRepoInvite,
        getRepoInvites: mockGetRepoInvites
      }

      return GithubApi
    })

    const connect = require('./../../../controllers/connect')

    return connect(req, res).then(response => {
      expect(mockGetRepoInvites).toHaveBeenCalledTimes(1)
      expect(mockAcceptRepoInvite).not.toHaveBeenCalled()
      expect(res.send.mock.calls[0][0]).toBe('Invitation not found')
      expect(res.status.mock.calls[0][0]).toBe(404)
    })
  })

  test('returns a 500 and an error message if the response from GitHub is invalid', () => {
    const invitationId = 123
    const mockAcceptRepoInvite = jest.fn(() => Promise.resolve())
    const mockGetRepoInvites = jest.fn(() => Promise.resolve({
      invalidProperty: 'invalidValue'
    }))

    jest.mock('github', () => {
      const GithubApi = function () {}

      GithubApi.prototype.authenticate = jest.fn()
      GithubApi.prototype.users = {
        acceptRepoInvite: mockAcceptRepoInvite,
        getRepoInvites: mockGetRepoInvites
      }

      return GithubApi
    })

    const connect = require('./../../../controllers/connect')

    return connect(req, res).then(response => {
      expect(mockGetRepoInvites).toHaveBeenCalledTimes(1)
      expect(mockAcceptRepoInvite).not.toHaveBeenCalled()
      expect(res.send.mock.calls[0][0]).toBe('Error')
      expect(res.status.mock.calls[0][0]).toBe(500)
    })
  })
})
