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
  mockProcessMergeFn = jest.fn().mockResolvedValue({ })
  req = helpers.getMockRequest()

  jest.resetAllMocks()
  jest.resetModules()
})

describe('HandlePR controller', () => {
  test.each([
    ['github'],
    ['gitlab'],
  ])('abort and return an error if unable to determine service  - %s', async (service) => {
    let pr = {
      title: 'Some random PR',
      body: 'Unrelated review body',
      head: {
        ref: 'some-other-branch'
      },
      pull_request: {
        base: {
          ref: 'master'
        }
      },
      merged: false,
      repository: {
        name: req.params.repository
      },
      state: 'open'
    }
    modifyPrDataForService(pr, service, req)
    pr.repository.url = pr.repository.url.replace(service, 'gitFoo')

    const mockDeleteBranch = jest.fn()

    const handlePR = require('./../../../controllers/handlePR')

    expect.hasAssertions()
    try {
      await handlePR(req.params.repository, pr)
    } catch (e) {
      expect(e.message).toBe('Unable to determine service.')
      expect(mockDeleteBranch).toHaveBeenCalledTimes(0)
      expect(mockProcessMergeFn).toHaveBeenCalledTimes(0)
    }
  })

  test.each([
    ['github'],
    ['gitlab'],
  ])('abort and return an error if no merge/pull request number found  - %s', async (service) => {
    let pr = {
      title: 'Some random PR',
      body: 'Unrelated review body',
      head: {
        ref: 'some-other-branch'
      },
      pull_request: {
        base: {
          ref: 'master'
        }
      },
      merged: false,
      repository: {
        name: req.params.repository
      },
      state: 'open'
    }
    modifyPrDataForService(pr, service, req)
    if (service === 'github') {
      pr.number = null
    } else if (service === 'gitlab') {
      pr.object_attributes.iid = null
    }

    const mockDeleteBranch = jest.fn()

    const handlePR = require('./../../../controllers/handlePR')

    expect.hasAssertions()
    try {
      await handlePR(req.params.repository, pr)
    } catch (e) {
      expect(e.message).toBe('No pull/merge request number found.')
      expect(mockDeleteBranch).toHaveBeenCalledTimes(0)
      expect(mockProcessMergeFn).toHaveBeenCalledTimes(0)
    }
  })

  test.each([
    ['github'],
    ['gitlab'],
  ])('abort and return an error if "getReview" call fails  - %s', async (service) => {
    let pr = {
      title: 'Some random PR',
      body: 'Unrelated review body',
      head: {
        ref: 'some-other-branch'
      },
      pull_request: {
        base: {
          ref: 'master'
        }
      },
      merged: false,
      repository: {
        name: req.params.repository
      },
      state: 'open'
    }
    modifyPrDataForService(pr, service, req)

    const mockGetReviewGitHub = jest.fn().mockRejectedValue('Error calling getReview.')
    const mockGetReviewGitLab = jest.fn().mockRejectedValue('Error calling getReview.')
    const mockDeleteBranch = jest.fn()

    mockGitModules(mockGetReviewGitHub, mockGetReviewGitLab, mockDeleteBranch)

    const handlePR = require('./../../../controllers/handlePR')

    expect.hasAssertions()
    try {
      await handlePR(req.params.repository, pr)
    } catch (e) {
      expect(e.message).toBe('Error calling getReview.')
      expect(mockDeleteBranch).toHaveBeenCalledTimes(0)
      expect(mockProcessMergeFn).toHaveBeenCalledTimes(0)
    }
  })

  test.each([
    ['github'],
    ['gitlab'],
  ])('ignores pull requests from branches not prefixed with `staticman_` - %s', async (service) => {
    let pr = {
      title: 'Some random PR',
      body: 'Unrelated review body',
      head: {
        ref: 'some-other-branch'
      },
      pull_request: {
        base: {
          ref: 'master'
        }
      },
      merged: false,
      repository: {
        name: req.params.repository
      },
      state: 'open'
    }
    modifyPrDataForService(pr, service, req)

    const mockReview = new Review(pr.title, pr.body, 'false', pr.head.ref, pr.pull_request.base.ref)
    const mockGetReviewGitHub = jest.fn().mockResolvedValue(mockReview)
    const mockGetReviewGitLab = jest.fn().mockResolvedValue(mockReview)

    mockGitModules(mockGetReviewGitHub, mockGetReviewGitLab)

    const handlePR = require('./../../../controllers/handlePR')

    let response = await handlePR(req.params.repository, pr)
    assertGetReviewCalls(service, mockGetReviewGitHub, mockGetReviewGitLab)
    expect(response).toBe(null)
  })

  describe('processes notifications if the pull request has been merged', () => {
    test.each([
      ['github'],
      ['gitlab'],
    ])('do nothing if PR body doesn\'t match template - %s', async (service) => {
      let pr = {
        number: 123,
        title: 'Add Staticman data',
        body: sampleData.prBody2,
        head: {
          ref: 'staticman_1234567'
        },
        pull_request: {
          base: {
            ref: 'master'
          }
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
      modifyPrDataForService(pr, service, req)
      
      const mockReview = new Review(pr.title, pr.body, 'false', pr.head.ref, pr.pull_request.base.ref)
      const mockGetReviewGitHub = jest.fn().mockResolvedValue(mockReview)
      const mockGetReviewGitLab = jest.fn().mockResolvedValue(mockReview)
      const mockDeleteBranch = jest.fn()

      mockGitModules(mockGetReviewGitHub, mockGetReviewGitLab, mockDeleteBranch)

      const handlePR = require('./../../../controllers/handlePR')

      await handlePR(req.params.repository, pr)
      assertGetReviewCalls(service, mockGetReviewGitHub, mockGetReviewGitLab)
      expect(mockDeleteBranch).not.toHaveBeenCalled()
    })

    test.each([
      ['github'],
      ['gitlab'],
    ])('abort and return an error if `processMerge` fails - %s', async (service) => {
      let pr = {
        number: 123,
        title: 'Add Staticman data',
        body: sampleData.prBody1,
        head: {
          ref: 'staticman_1234567'
        },
        pull_request: {
          base: {
            ref: 'master'
          }
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
      modifyPrDataForService(pr, service, req)
      
      const mockReview = new Review(pr.title, pr.body, 'merged', pr.head.ref, pr.pull_request.base.ref)
      const mockGetReviewGitHub = jest.fn().mockResolvedValue(mockReview)
      const mockGetReviewGitLab = jest.fn().mockResolvedValue(mockReview)
      const mockDeleteBranch = jest.fn()

      mockGitModules(mockGetReviewGitHub, mockGetReviewGitLab, mockDeleteBranch)

      const errorMessage = 'some error'

      mockProcessMergeFn = jest.fn(() => {
        throw errorMessage
      })

      const handlePR = require('./../../../controllers/handlePR')

      expect.assertions(5)
      try {
        await handlePR(req.params.repository, pr)
      } catch (e) {
        expect(e).toBe(errorMessage)
        assertGetReviewCalls(service, mockGetReviewGitHub, mockGetReviewGitLab)
        // expect(mockSetConfigPathFn.mock.calls.length).toBe(1)
        // expect(mockProcessMergeFn.mock.calls.length).toBe(1)
        expect(mockSetConfigPathFn).toHaveBeenCalledTimes(1)
        expect(mockProcessMergeFn).toHaveBeenCalledTimes(1)
      }
    })

    test.each([
      ['github'],
      ['gitlab'],
    ])('delete the branch if the pull request is closed - %s', async (service) => {
      let pr = {
        number: 123,
        title: 'Add Staticman data',
        body: sampleData.prBody1,
        head: {
          ref: 'staticman_1234567'
        },
        pull_request: {
          base: {
            ref: 'master'
          }
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
      modifyPrDataForService(pr, service, req)

      const mockReview = new Review(pr.title, pr.body, 'merged', pr.head.ref, pr.pull_request.base.ref)
      const mockDeleteBranch = jest.fn((sourceBranch) => new Promise((resolve, reject) => resolve({ })))
      const mockGetReviewGitHub = jest.fn().mockResolvedValue(mockReview)
      const mockGetReviewGitLab = jest.fn().mockResolvedValue(mockReview)

      mockGitModules(mockGetReviewGitHub, mockGetReviewGitLab, mockDeleteBranch)

      const handlePR = require('./../../../controllers/handlePR')

      await handlePR(req.params.repository, pr)
      assertGetReviewCalls(service, mockGetReviewGitHub, mockGetReviewGitLab)
      if (service === 'github') {
        expect(mockGetReviewGitHub.mock.calls[0][0]).toEqual(123)
        expect(mockDeleteBranch).toHaveBeenCalledTimes(1)
      } else if (service === 'gitlab') {
        expect(mockGetReviewGitLab.mock.calls[0][0]).toEqual(123)
        expect(mockDeleteBranch).toHaveBeenCalledTimes(0)
      }
      expect(mockSetConfigPathFn.mock.calls.length).toBe(1)
      expect(mockProcessMergeFn.mock.calls.length).toBe(1)
    })
  })
})

/**
 * Avoid code duplication in the above test cases.
 */
const modifyPrDataForService = function (prData, service, req) {
  if (service === 'github') {
    prData.number = 123
    prData.repository.url = 'https://api.github.com/repos/' + req.params.username + '/' + req.params.repository
    prData.repository.owner = {
      login: req.params.username
    }
  } else if (service === 'gitlab') {
    prData.object_attributes = {
      iid: 123
    }
    prData.repository.url = 'git@gitlab.com:' + req.params.username + '/' + req.params.repository + '.git'
    prData.user = {
      username: req.params.username
    }
  }
}

/**
 * Avoid code duplication in the above test cases.
 */
const mockGitModules = function (mockGetReviewGitHub, mockGetReviewGitLab, mockDeleteBranch) {
  jest.mock('../../../lib/GitHub', () => {
    return jest.fn().mockImplementation(() => {
      let result = {
        getReview: mockGetReviewGitHub
      }
      if (mockDeleteBranch) {
        result.deleteBranch = mockDeleteBranch
      }
      return result
    })
  })
  jest.mock('../../../lib/GitLab', () => {
    return jest.fn().mockImplementation(() => {
      let result = {
        getReview: mockGetReviewGitLab
      }
      if (mockDeleteBranch) {
        result.deleteBranch = mockDeleteBranch
      }
      return result
    })
  })
}

/**
 * Avoid code duplication in the above test cases.
 */
const assertGetReviewCalls = function (service, mockGetReviewGitHub, mockGetReviewGitLab) {
  if (service === 'github') {
    expect(mockGetReviewGitHub).toHaveBeenCalledTimes(1)
    expect(mockGetReviewGitLab).toHaveBeenCalledTimes(0)
  } else if (service === 'gitlab') {
    expect(mockGetReviewGitHub).toHaveBeenCalledTimes(0)
    expect(mockGetReviewGitLab).toHaveBeenCalledTimes(1)
  }
}
