const helpers = require('./../../helpers')

let req, res

beforeEach(() => {
  req = helpers.getMockRequest()
  res = helpers.getMockResponse()

  jest.resetModules()
  jest.unmock('@octokit/rest')
})

describe('Connect controller', () => {
  test('accepts the invitation if one is found and replies with "OK!"', () => {
    const invitationId = 123
    const mockAcceptRepoInvite = jest.fn(() => Promise.resolve())
    const mockGetRepoInvites = jest.fn(() => Promise.resolve({
      data: [
        {
          id: invitationId,
          repository: {
            full_name: `${req.params.username}/${req.params.repository}`
          }
        }
      ]
    }))

    jest.mock('@octokit/rest', () =>
      _ => ({
        authenticate: jest.fn(),
        repos: {
          acceptInvitation: mockAcceptRepoInvite,
          listInvitationsForAuthenticatedUser: mockGetRepoInvites
        }
      })
    )

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
    const mockGetRepoInvites = jest.fn(() => Promise.resolve({
      data: [
        {
          id: invitationId,
          repository: {
            full_name: `${req.params.username}/anotherrepo`
          }
        }
      ]
    }))

    jest.mock('@octokit/rest', () =>
      _ => ({
        authenticate: jest.fn(),
        repos: {
          acceptInvitation: mockAcceptRepoInvite,
          listInvitationsForAuthenticatedUser: mockGetRepoInvites
        }
      })
    )

    const connect = require('./../../../controllers/connect')

    return connect(req, res).then(response => {
      expect(mockGetRepoInvites).toHaveBeenCalledTimes(1)
      expect(mockAcceptRepoInvite).not.toHaveBeenCalled()
      expect(res.send.mock.calls[0][0]).toBe('Invitation not found')
      expect(res.status.mock.calls[0][0]).toBe(404)
    })
  })

  test('returns a 404 and an error message if the response from GitHub is invalid', () => {
    const mockAcceptRepoInvite = jest.fn(() => Promise.resolve())
    const mockGetRepoInvites = jest.fn(() => Promise.resolve({
      data: {
        invalidProperty: 'invalidValue'
      }
    }))

    jest.mock('@octokit/rest', () =>
      _ => ({
        authenticate: jest.fn(),
        repos: {
          acceptInvitation: mockAcceptRepoInvite,
          listInvitationsForAuthenticatedUser: mockGetRepoInvites
        }
      })
    )

    const connect = require('./../../../controllers/connect')

    return connect(req, res).then(response => {
      expect(mockGetRepoInvites).toHaveBeenCalledTimes(1)
      expect(mockAcceptRepoInvite).not.toHaveBeenCalled()
      expect(res.send.mock.calls[0][0]).toBe('Invitation not found')
      expect(res.status.mock.calls[0][0]).toBe(404)
    })
  })
})
