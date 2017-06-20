const config = require('./../../../config')
const connect = require('./../../../controllers/connect')
const helpers = require('./../../helpers')
const githubToken = config.get('githubToken')
const nock = require('nock')

let req, res

beforeEach(() => {
  req = helpers.getMockRequest()
  res = helpers.getMockResponse()
})

describe('Connect endpoint', () => {
  test('accepts the invitation if one is found and replies with "OK!"', () => {
    const invitationId = 123

    const reqListInvititations = nock(/api\.github\.com/)
      .get(`/user/repository_invitations?access_token=${githubToken}`)
      .reply(200, [
        {
          id: invitationId,
          repository: {
            full_name: `${req.params.username}/${req.params.repository}`
          }
        }
      ])

    const reqAcceptInvitation = nock(/api\.github\.com/)
      .patch(`/user/repository_invitations/${invitationId}?access_token=${githubToken}`)
      .reply(204)

    return connect(req, res).then(response => {
      expect(reqListInvititations.isDone()).toBe(true)
      expect(reqAcceptInvitation.isDone()).toBe(true)
      expect(res.send.mock.calls[0][0]).toBe('OK!')
    })
  })

  test('returns a 404 and an error message if a matching invitation is not found', () => {
    const invitationId = 123

    const reqListInvititations = nock(/api\.github\.com/)
      .get(`/user/repository_invitations?access_token=${githubToken}`)
      .reply(200, [
        {
          id: invitationId,
          repository: {
            full_name: `${req.params.username}/anotherrepo`
          }
        }
      ])

    const reqAcceptInvitation = nock(/api\.github\.com/)
      .patch(`/user/repository_invitations/${invitationId}?access_token=${githubToken}`)
      .reply(204)

    return connect(req, res).then(response => {
      expect(reqListInvititations.isDone()).toBe(true)
      expect(reqAcceptInvitation.isDone()).toBe(false)
      expect(res.send.mock.calls[0][0]).toBe('Invitation not found')
      expect(res.status.mock.calls[0][0]).toBe(404)
    })
  })

  test('returns a 500 and an error message if the response from GitHub is invalid', () => {
    const invitationId = 123

    const reqListInvititations = nock(/api\.github\.com/)
      .get(`/user/repository_invitations?access_token=${githubToken}`)
      .reply(200, {invalidProperty: 'invalidValue'})

    const reqAcceptInvitation = nock(/api\.github\.com/)
      .patch(`/user/repository_invitations/${invitationId}?access_token=${githubToken}`)
      .reply(204)

    return connect(req, res).then(response => {
      expect(reqListInvititations.isDone()).toBe(true)
      expect(reqAcceptInvitation.isDone()).toBe(false)
      expect(res.send.mock.calls[0][0]).toBe('Error')
      expect(res.status.mock.calls[0][0]).toBe(500)
    })
  })
})
