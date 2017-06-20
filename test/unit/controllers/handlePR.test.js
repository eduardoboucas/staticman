const config = require('./../../../config')
const helpers = require('./../../helpers')
const githubToken = config.get('githubToken')
const nock = require('nock')
const sampleData = require('./../../helpers/sampleData')

let catchAllMock
let mockSetConfigPathFn
let mockProcessMergeFn
let req
let res

// Mock Staticman module
jest.mock('./../../../lib/Staticman', () => {
  return jest.fn(parameters => ({
    setConfigPath: mockSetConfigPathFn,
    processMerge: mockProcessMergeFn
  }))
})

// Require module after mock
const handlePR = require('./../../../controllers/handlePR')

beforeEach(() => {
  mockSetConfigPathFn = jest.fn()
  mockProcessMergeFn = jest.fn(() => Promise.resolve(true))
  req = helpers.getMockRequest()
  res = helpers.getMockResponse()
})

afterEach(() => {
  nock.cleanAll()
})

describe('HandlePR endpoint', () => {
  test('ignores pull requests from branches not prefixed with `staticman_`', () => {
    const pr = {
      number: 123,
      head: {
        ref: 'some-other-branch'
      },
      repository: {
        name: 'some-other-branch',
        owner: {
          login: req.params.username
        }
      }
    }

    const reqGetPullRequest = nock(/api\.github\.com/)
      .get(`/repos/${pr.repository.owner.login}/${pr.repository.name}/pulls/${pr.number}`)
      .query(true)
      .once()
      .reply(200, pr)

    catchAllMock = helpers.getCatchAllApiMock()

    return handlePR(req.params.repository, pr).then(response => {
      expect(catchAllMock.hasIntercepted()).toBe(false)
      expect(response).toBe(null)
    })
  })

  describe('processes notifications if the pull request has been merged', () => {
    test('do nothing if PR body doesn\'t match template', () => {
      const pr = {
        number: 123,
        body: sampleData.prBody2,
        head: {
          ref: 'staticman_1234567'
        },
        merged: true,
        repository: {
          name: 'staticman_1234567',
          owner: {
            login: req.params.username
          }
        },
        state: 'open'
      }

      const reqGetPullRequest = nock(/api\.github\.com/)
        .get(`/repos/${pr.repository.owner.login}/${pr.repository.name}/pulls/${pr.number}`)
        .query(true)
        .once()
        .reply(200, pr)

      catchAllMock = helpers.getCatchAllApiMock()

      return handlePR(req.params.repository, pr).then(response => {
        expect(reqGetPullRequest.isDone()).toBe(true)
        expect(catchAllMock.hasIntercepted()).toBe(false)
        expect(mockSetConfigPathFn.mock.calls.length).toBe(0)
        expect(mockProcessMergeFn.mock.calls.length).toBe(0)
      })
    })

    test('abort and return an error if `processMerge` fails', () => {
      const pr = {
        number: 123,
        body: sampleData.prBody1,
        head: {
          ref: 'staticman_1234567'
        },
        merged: true,
        repository: {
          name: 'staticman_1234567',
          owner: {
            login: req.params.username
          }
        },
        state: 'closed'
      }

      const reqGetPullRequest = nock(/api\.github\.com/)
        .get(`/repos/${pr.repository.owner.login}/${pr.repository.name}/pulls/${pr.number}`)
        .query(true)
        .once()
        .reply(200, pr)

      const errorMessage = 'some error'

      catchAllMock = helpers.getCatchAllApiMock()

      mockProcessMergeFn = jest.fn(() => {
        throw errorMessage
      })

      return handlePR(req.params.repository, pr).catch(err => {
        expect(err).toBe(errorMessage)
        expect(reqGetPullRequest.isDone()).toBe(true)
        expect(catchAllMock.hasIntercepted()).toBe(false)
        expect(mockSetConfigPathFn.mock.calls.length).toBe(1)
        expect(mockProcessMergeFn.mock.calls.length).toBe(1)
      })
    })

    test('delete the branch if the pull request is closed', () => {
      const pr = {
        number: 123,
        body: sampleData.prBody1,
        head: {
          ref: 'staticman_1234567'
        },
        merged: true,
        repository: {
          name: 'staticman_1234567',
          owner: {
            login: req.params.username
          }
        },
        state: 'closed'
      }

      const reqGetPullRequest = nock(/api\.github\.com/)
        .get(`/repos/${pr.repository.owner.login}/${pr.repository.name}/pulls/${pr.number}`)
        .query(true)
        .once()
        .reply(200, pr)

      const reqDeleteBranch = nock(/api\.github\.com/)
        .delete(`/repos/${req.params.username}/${pr.head.ref}/git/refs/heads%2F${pr.head.ref}`)
        .query(true)
        .once()
        .reply(200, pr)

      catchAllMock = helpers.getCatchAllApiMock()

      return handlePR(req.params.repository, pr).then(response => {
        expect(reqGetPullRequest.isDone()).toBe(true)
        expect(reqDeleteBranch.isDone()).toBe(true)
        expect(catchAllMock.hasIntercepted()).toBe(false)
        expect(mockSetConfigPathFn.mock.calls.length).toBe(1)
        expect(mockProcessMergeFn.mock.calls.length).toBe(1)
      })
    }) 
  })
})
