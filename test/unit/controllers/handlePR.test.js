const helpers = require('./../../helpers')
const sampleData = require('./../../helpers/sampleData')
const Review = require('../../../lib/models/Review')

let mockSetConfigPathFn
let mockProcessMergeFn
let req

// Mock Staticman module
jest.mock('../../../lib/Staticman', () => {
  return jest.fn().mockImplementation(() => {
    return {
      setConfigPath: mockSetConfigPathFn,
      processMerge: mockProcessMergeFn
    }
  })
})

beforeEach(() => {
  mockSetConfigPathFn = jest.fn()
  mockProcessMergeFn = jest.fn()
  req = helpers.getMockRequest()
  res = helpers.getMockResponse()

  jest.resetAllMocks()
  jest.resetModules()
})

describe('HandlePR controller', () => {
  test('ignores pull requests from branches not prefixed with `staticman_`', async () => {
    const pr = {
      number: 123,
      title: 'Some random PR',
      body: 'Unrelated review body',
      head: {
        ref: 'some-other-branch'
      },
      base: {
        ref: 'master'
      },
      merged: false,
      repository: {
        name: req.params.repository,
        owner: {
          login: req.params.username
        }
      },
      state: 'open'
    }

    const mockReview = new Review(pr.title, pr.body, 'false', pr.head.ref, pr.base.ref)
    const mockGetReview = jest.fn().mockResolvedValue(mockReview)

    jest.mock('../../../lib/GitHub', () => {
      return jest.fn().mockImplementation(() => {
        return {
          getReview: mockGetReview
        }
      })
    })

    const handlePR = require('./../../../controllers/handlePR')

    let response = await handlePR(req.params.repository, pr)
    expect(mockGetReview).toHaveBeenCalledTimes(1)
    expect(response).toBe(null)
  })

  describe('processes notifications if the pull request has been merged', () => {
    test('do nothing if PR body doesn\'t match template', async () => {
      const pr = {
        number: 123,
        title: 'Add Staticman data',
        body: sampleData.prBody2,
        head: {
          ref: 'staticman_1234567'
        },
        base: {
          ref: 'master'
        },
        merged: true,
        repository: {
          name: req.params.repository,
          owner: {
            login: req.params.username
          }
        },
        state: 'open'
      }
      
      const mockReview = new Review(pr.title, pr.body, 'false', pr.head.ref, pr.base.ref)
      const mockGetReview = jest.fn().mockResolvedValue(mockReview)
      const mockDeleteBranch = jest.fn()

      jest.mock('../../../lib/GitHub', () => {
        return jest.fn().mockImplementation(() => {
          return {
            getReview: mockGetReview,
            deleteBranch: mockDeleteBranch
          }
        })
      })

      const handlePR = require('./../../../controllers/handlePR')

      await handlePR(req.params.repository, pr)
      expect(mockGetReview).toHaveBeenCalledTimes(1)
      expect(mockDeleteBranch).not.toHaveBeenCalled()
    })

    test('abort and return an error if `processMerge` fails', async () => {
      const pr = {
        number: 123,
        title: 'Add Staticman data',
        body: sampleData.prBody1,
        head: {
          ref: 'staticman_1234567'
        },
        base: {
          ref: 'master'
        },
        merged: true,
        repository: {
          name: req.params.repository,
          owner: {
            login: req.params.username
          }
        },
        state: 'closed'
      }
      
      const mockReview = new Review(pr.title, pr.body, 'merged', pr.head.ref, pr.base.ref)
      const mockGetReview = jest.fn().mockResolvedValue(mockReview)
      const mockDeleteBranch = jest.fn()

      jest.mock('../../../lib/GitHub', () => {
        return jest.fn().mockImplementation(() => {
          return {
            getReview: mockGetReview,
            deleteBranch: mockDeleteBranch
          }
        })
      })

      const errorMessage = 'some error'

      mockProcessMergeFn = jest.fn(() => {
        throw errorMessage
      })

      const handlePR = require('./../../../controllers/handlePR')

      expect.assertions(4)
      try {
        await handlePR(req.params.repository, pr)
      } catch (e) {
        expect(e).toBe(errorMessage)
        expect(mockGetReview).toHaveBeenCalledTimes(1)
        // expect(mockSetConfigPathFn.mock.calls.length).toBe(1)
        // expect(mockProcessMergeFn.mock.calls.length).toBe(1)
        expect(mockSetConfigPathFn).toHaveBeenCalledTimes(1)
        expect(mockProcessMergeFn).toHaveBeenCalledTimes(1)
      }
    })

    test('delete the branch if the pull request is closed', async () => {
      const pr = {
        number: 123,
        title: 'Add Staticman data',
        body: sampleData.prBody1,
        head: {
          ref: 'staticman_1234567'
        },
        base: {
          ref: 'master'
        },
        merged: true,
        repository: {
          name: req.params.repository,
          owner: {
            login: req.params.username
          }
        },
        state: 'closed'
      }

      const mockReview = new Review(pr.title, pr.body, 'merged', pr.head.ref, pr.base.ref)
      const mockDeleteBranch = jest.fn()
      const mockGetReview = jest.fn().mockResolvedValue(mockReview)

      jest.mock('../../../lib/GitHub', () => {
        return jest.fn().mockImplementation(() => {
          return {
            deleteBranch: mockDeleteBranch,
            getReview: mockGetReview
          }
        })
      })

      const handlePR = require('./../../../controllers/handlePR')

      await handlePR(req.params.repository, pr)
      expect(mockGetReview).toHaveBeenCalledTimes(1)
      expect(mockGetReview.mock.calls[0][0]).toEqual(123)
      expect(mockDeleteBranch).toHaveBeenCalledTimes(1)
      expect(mockSetConfigPathFn.mock.calls.length).toBe(1)
      expect(mockProcessMergeFn.mock.calls.length).toBe(1)
    })
  })
})
