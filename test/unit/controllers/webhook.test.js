let mockCreateHmacFn = jest.fn()

const helpers = require('./../../helpers')
const Review = require('../../../lib/models/Review')
const sampleData = require('./../../helpers/sampleData')

let req
let res
let mockReview

let mockGetReviewFn = jest.fn()
let mockDeleteBranchFn = jest.fn()
let mockCreateFn = jest.fn()
let mockSetConfigPathFn = jest.fn()
let mockGetSiteConfigFn = jest.fn()
let mockProcessMergeFn = jest.fn()

jest.mock('../../../lib/GitServiceFactory', () => {
  return {
    create: mockCreateFn
  }
})

const mockHmacDigest = 'mock Hmac digest'
/*
 * Mock the createHmac function within the native crypto module, but leave every other function.
 * This allows us to test logic that invokes GitHub's webhook request authentication, which
 * involves signing the webhook payload using the agreed-upon secret token.
 */
jest.mock('crypto', () => {
  const cryptoOrig = require.requireActual('crypto')
  return {
    ...cryptoOrig,
    createHmac: mockCreateHmacFn
  }
})

jest.mock('../../../lib/Staticman', () => {
  return jest.fn().mockImplementation(() => {
    return {
      setConfigPath: mockSetConfigPathFn,
      getSiteConfig: mockGetSiteConfigFn,
      processMerge: mockProcessMergeFn
    }
  })
})

// Instantiate the module being tested AFTER mocking dependendent modules above.
const webhook = require('./../../../controllers/webhook')

beforeEach(() => {
  req = helpers.getMockRequest()
  res = helpers.getMockResponse()

  mockCreateFn.mockImplementation((service, options) => {
    return {
      getReview: mockGetReviewFn,
      deleteBranch: mockDeleteBranchFn
    }
  })

  mockCreateHmacFn.mockImplementation((algo, data) => {
    return {
      update: data => {
        return {
          digest: encoding => {
            return mockHmacDigest
          }
        }
      }
    }
  })
})

afterEach(() => {
  mockGetReviewFn.mockClear()
  mockDeleteBranchFn.mockClear()
  mockCreateFn.mockClear()
  mockSetConfigPathFn.mockClear()
  mockGetSiteConfigFn.mockClear()
  mockProcessMergeFn.mockClear()
  mockCreateHmacFn.mockClear()
})

describe('Webhook controller', () => {
  test.each([
    ['gitfoo']
  ])('abort and return an error if unknown service specified - %s', async (service) => {
    req.params.service = service

    expect.hasAssertions()
    return webhook(req, res).then(response => {
      expect(mockCreateFn).toHaveBeenCalledTimes(0)
      expect(res.send.mock.calls[0][0]).toEqual({ errors: '[\"Unexpected service specified.\"]' })
      expect(res.status.mock.calls[0][0]).toBe(400)
    })
  })

  test.each([
    ['github'], ['gitlab']
  ])('abort and return an error if no event header found - %s', async (service) => {
    req.params.service = service

    expect.hasAssertions()
    return webhook(req, res).then(response => {
      expect(mockCreateFn).toHaveBeenCalledTimes(0)
      expect(res.send.mock.calls[0][0]).toEqual({ errors: '[\"No event found in the request\"]' })
      expect(res.status.mock.calls[0][0]).toBe(400)
    })
  })

  test.each([
    ['github'], ['gitlab']
  ])('abort and return success if not "Merge Request Hook" event - %s', async (service) => {
    req.params.service = service
    if (service === 'github') {
      req.headers['x-github-event'] = 'Some Other Hook'
    } else if (service === 'gitlab') {
      req.headers['x-gitlab-event'] = 'Some Other Hook'
    }

    expect.hasAssertions()
    return webhook(req, res).then(response => {
      expect(mockCreateFn).toHaveBeenCalledTimes(0)
      expect(res.status.mock.calls[0][0]).toBe(200)
    })
  })

  test.each([
    ['github'], ['gitlab']
  ])('abort and return an error if webhook secret expected, but not sent - %s', async (service) => {
    req.params.service = service
    if (service === 'github') {
      req.headers['x-github-event'] = 'pull_request'
    } else if (service === 'gitlab') {
      req.headers['x-gitlab-event'] = 'Merge Request Hook'
    }

    // Inject a value for the expected webhook secret into the site config.
    if (service === 'github') {
      mockGetSiteConfigFn.mockImplementation(() => new Promise((resolve, reject) => resolve(new Map([
          ['githubWebhookSecret', '2a-foobar-db72']
        ])))
      )
    } else if (service === 'gitlab') {
      mockGetSiteConfigFn.mockImplementation(() => new Promise((resolve, reject) => resolve(new Map([
          ['gitlabWebhookSecret', '2a-foobar-db72']
        ])))
      )
    }

    expect.hasAssertions()
    return webhook(req, res).then(response => {
      expect(mockCreateFn).toHaveBeenCalledTimes(0)
      expect(res.send.mock.calls[0][0]).toEqual({ errors: '[\"No secret found in the webhook request\"]' })
      expect(res.status.mock.calls[0][0]).toBe(400)
    })
  })

  test.each([
    ['github'], ['gitlab']
  ])('abort and return an error if unexpected webhook secret sent - %s', async (service) => {
    req.params.service = service
    if (service === 'github') {
      req.headers['x-github-event'] = 'pull_request'

      // Inject a value for the expected webhook secret into the site config.
      mockGetSiteConfigFn.mockImplementation(() => new Promise((resolve, reject) => resolve(new Map([
          ['githubWebhookSecret', 'sha1=' + mockHmacDigest]
        ])))
      )

      // Mock a signature from GitHub that does NOT match the expected signature.
      req.headers['x-hub-signature'] = 'sha1=' + 'foobar'
    } else if (service === 'gitlab') {
      req.headers['x-gitlab-event'] = 'Merge Request Hook'

      // Inject a value for the expected webhook secret into the site config.
      mockGetSiteConfigFn.mockImplementation(() => new Promise((resolve, reject) => resolve(new Map([
          ['gitlabWebhookSecret', '2a-foobar-db72']
        ])))
      )

      // Mock a token from GitLab that does NOT match the expected token.
      req.headers['x-gitlab-token'] = '2a-different-db72'
    }

    expect.hasAssertions()
    return webhook(req, res).then(response => {
      if (service === 'github') {
        expect(mockCreateHmacFn).toHaveBeenCalledTimes(1)
      }
      expect(mockCreateFn).toHaveBeenCalledTimes(0)
      expect(res.send.mock.calls[0][0]).toEqual({ errors: '[\"Unable to verify authenticity of request\"]' })
      expect(res.status.mock.calls[0][0]).toBe(400)
    })
  })

  test.each([
    ['github'], ['gitlab']
  ])('abort and return an error if no merge request number found in webhook payload - %s', async (service) => {
    req.params.service = service

    req.body = {
      object_attributes: {}
    }

    if (service === 'github') {
      req.headers['x-github-event'] = 'pull_request'

      // Inject a value for the expected webhook secret into the site config.
      mockGetSiteConfigFn.mockImplementation(() => new Promise((resolve, reject) => resolve(new Map([
          ['githubWebhookSecret', 'sha1=' + mockHmacDigest]
        ])))
      )

      // Mock a signature from GitHub that matches the expected signature.
      req.headers['x-hub-signature'] = 'sha1=' + mockHmacDigest
    } else if (service === 'gitlab') {
      req.headers['x-gitlab-event'] = 'Merge Request Hook'

      // Inject a value for the expected webhook secret into the site config.
      mockGetSiteConfigFn.mockImplementation(() => new Promise((resolve, reject) => resolve(new Map([
          ['gitlabWebhookSecret', '2a-foobar-db72']
        ])))
      )

      // Mock a token from GitLab that matches the expected token.
      req.headers['x-gitlab-token'] = '2a-foobar-db72'
    }

    expect.hasAssertions()
    return webhook(req, res).then(response => {
      if (service === 'github') {
        expect(mockCreateHmacFn).toHaveBeenCalledTimes(1)
      }
      expect(mockCreateFn).toHaveBeenCalledTimes(1)
      expect(mockCreateFn.mock.calls[0][0]).toBe(service)
      expect(res.send.mock.calls[0][0]).toEqual({ errors: '[\"No pull/merge request number found.\"]' })
      expect(res.status.mock.calls[0][0]).toBe(400)
    })
  })

  test.each([
    [null]
  ])('default to github if version equals 1 and no service specified in parameters - %s', async (service) => {
    req.params.version = '1'
    req.params.service = null
    req.params.username = null
    req.params.repository = null
    req.params.branch = null

    req.body = {
      pull_request: {
        base: {
          ref: 'master'
        }
      },
      repository: {
        name: req.params.repository,
        owner: {
          login: req.params.username
        }
      }
    }

    req.headers['x-github-event'] = 'pull_request'
    mockGetSiteConfigFn.mockImplementation(() => new Promise((resolve, reject) => resolve(new Map([
        ['githubWebhookSecret', 'sha1=' + mockHmacDigest]
      ])))
    )
    req.headers['x-hub-signature'] = 'sha1=' + mockHmacDigest

    expect.hasAssertions()
    return webhook(req, res).then(response => {
      /*
       * The necessary parameters to retrieve the site config and verify the webhook signature are
       * not passed in v1 of the webhook endpoint.
       */
      expect(mockGetSiteConfigFn).toHaveBeenCalledTimes(0)
      expect(mockCreateHmacFn).toHaveBeenCalledTimes(0)
      expect(mockCreateFn).toHaveBeenCalledTimes(1)
      expect(mockCreateFn.mock.calls[0][0]).toBe('github')
    })
  })

  test.each([
    ['github']
  ])('use values from webhook payload if no parameters specified - %s', async (service) => {
    req.params.version = '1'
    req.params.service = null
    req.params.username = null
    req.params.repository = null
    req.params.branch = null

    req.body = {
      pull_request: {
        base: {
          ref: 'master'
        }
      },
      repository: {
        name: 'foorepo',
        owner: {
          login: 'foouser'
        }
      }
    }

    req.headers['x-github-event'] = 'pull_request'
    mockGetSiteConfigFn.mockImplementation(() => new Promise((resolve, reject) => resolve(new Map([
        ['githubWebhookSecret', 'sha1=' + mockHmacDigest]
      ])))
    )
    req.headers['x-hub-signature'] = 'sha1=' + mockHmacDigest

    expect.hasAssertions()
    return webhook(req, res).then(response => {
      /*
       * The necessary parameters to retrieve the site config and verify the webhook signature are
       * not passed in v1 of the webhook endpoint.
       */
      expect(mockGetSiteConfigFn).toHaveBeenCalledTimes(0)
      expect(mockCreateHmacFn).toHaveBeenCalledTimes(0)
      expect(mockCreateFn).toHaveBeenCalledTimes(1)
      expect(mockCreateFn.mock.calls[0][0]).toBe('github')
      expect(mockCreateFn.mock.calls[0][1].username).toBe(req.body.repository.owner.login)
      expect(mockCreateFn.mock.calls[0][1].repository).toBe(req.body.repository.name)
      expect(mockCreateFn.mock.calls[0][1].branch).toBe(req.body.pull_request.base.ref)
    })
  })

  test.each([
    ['github'], ['gitlab']
  ])('abort and return an error if error retrieving merge request - %s', async (service) => {
    req.params.service = service

    req.body = {
      number: 123,
      object_attributes: {
        iid: 234
      }
    }

    if (service === 'github') {
      req.headers['x-github-event'] = 'pull_request'
      mockGetSiteConfigFn.mockImplementation(() => new Promise((resolve, reject) => resolve(new Map([
          ['githubWebhookSecret', 'sha1=' + mockHmacDigest]
        ])))
      )
      req.headers['x-hub-signature'] = 'sha1=' + mockHmacDigest
    } else if (service === 'gitlab') {
      req.headers['x-gitlab-event'] = 'Merge Request Hook'
      mockGetSiteConfigFn.mockImplementation(() => new Promise((resolve, reject) => resolve(new Map([
          ['gitlabWebhookSecret', '2a-foobar-db72']
        ])))
      )
      req.headers['x-gitlab-token'] = '2a-foobar-db72'
    }

    const rejectErrorMsg = 'get review error msg'
    mockGetReviewFn.mockImplementation((mergeReqNbr) => new Promise((resolve, reject) => reject(rejectErrorMsg)))

    // Suppress any calls to console.error - to keep test output clean.
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect.hasAssertions()
    return webhook(req, res).then(response => {
      if (service === 'github') {
        expect(mockCreateHmacFn).toHaveBeenCalledTimes(1)
      }
      expect(mockCreateFn).toHaveBeenCalledTimes(1)
      expect(mockGetReviewFn).toHaveBeenCalledTimes(1)
      if (service === 'github') {
        expect(mockGetReviewFn.mock.calls[0][0]).toBe(req.body.number)
        expect(res.send.mock.calls[0][0]).toEqual(
          { errors: '[\"Failed to retrieve merge request ' + req.body.number + ' - ' + rejectErrorMsg + '\"]' })
      } else if (service === 'gitlab') {
        expect(mockGetReviewFn.mock.calls[0][0]).toBe(req.body.object_attributes.iid)
        expect(res.send.mock.calls[0][0]).toEqual(
          { errors: '[\"Failed to retrieve merge request ' + req.body.object_attributes.iid + ' - ' + rejectErrorMsg + '\"]' })
      }
      expect(res.status.mock.calls[0][0]).toBe(400)

      // Restore console.error
      consoleSpy.mockRestore();
    })
  })

  test.each([
    ['github'], ['gitlab']
  ])('abort and return success if merge request source branch not created by Staticman - %s', async (service) => {
    req.params.service = service

    req.body = {
      number: 123,
      object_attributes: {
        iid: 234
      }
    }

    if (service === 'github') {
      req.headers['x-github-event'] = 'pull_request'
      mockGetSiteConfigFn.mockImplementation(() => new Promise((resolve, reject) => resolve(new Map([
          ['githubWebhookSecret', 'sha1=' + mockHmacDigest]
        ])))
      )
      req.headers['x-hub-signature'] = 'sha1=' + mockHmacDigest
    } else if (service === 'gitlab') {
      req.headers['x-gitlab-event'] = 'Merge Request Hook'
      mockGetSiteConfigFn.mockImplementation(() => new Promise((resolve, reject) => resolve(new Map([
          ['gitlabWebhookSecret', '2a-foobar-db72']
        ])))
      )
      req.headers['x-gitlab-token'] = '2a-foobar-db72'
    }

    mockReview = new Review('Some random PR', 'Review body', 'merged', 'some-other-branch', 'master')
    mockGetReviewFn.mockImplementation((mergeReqNbr) => new Promise((resolve, reject) => resolve(mockReview)))

    expect.hasAssertions()
    return webhook(req, res).then(response => {
      if (service === 'github') {
        expect(mockCreateHmacFn).toHaveBeenCalledTimes(1)
      }
      expect(mockCreateFn).toHaveBeenCalledTimes(1)
      expect(mockGetReviewFn).toHaveBeenCalledTimes(1)
      if (service === 'github') {
        expect(mockGetReviewFn.mock.calls[0][0]).toBe(req.body.number)
      } else if (service === 'gitlab') {
        expect(mockGetReviewFn.mock.calls[0][0]).toBe(req.body.object_attributes.iid)
      }
      expect(res.status.mock.calls[0][0]).toBe(200)
    })
  })

  test.each([
    ['github'], ['gitlab']
  ])('abort and return success if merge request state not merged or closed - %s', async (service) => {
    req.params.service = service

    req.body = {
      number: 123,
      object_attributes: {
        iid: 234
      }
    }

    if (service === 'github') {
      req.headers['x-github-event'] = 'pull_request'
      mockGetSiteConfigFn.mockImplementation(() => new Promise((resolve, reject) => resolve(new Map([
          ['githubWebhookSecret', 'sha1=' + mockHmacDigest]
        ])))
      )
      req.headers['x-hub-signature'] = 'sha1=' + mockHmacDigest
    } else if (service === 'gitlab') {
      req.headers['x-gitlab-event'] = 'Merge Request Hook'
      mockGetSiteConfigFn.mockImplementation(() => new Promise((resolve, reject) => resolve(new Map([
          ['gitlabWebhookSecret', '2a-foobar-db72']
        ])))
      )
      req.headers['x-gitlab-token'] = '2a-foobar-db72'
    }

    mockReview = new Review('Some random PR', 'Review body', 'not merged', 'staticman_1234567', 'master')
    mockGetReviewFn.mockImplementation((mergeReqNbr) => new Promise((resolve, reject) => resolve(mockReview)))

    expect.hasAssertions()
    return webhook(req, res).then(response => {
      if (service === 'github') {
        expect(mockCreateHmacFn).toHaveBeenCalledTimes(1)
      }
      expect(mockCreateFn).toHaveBeenCalledTimes(1)
      expect(mockGetReviewFn).toHaveBeenCalledTimes(1)
      if (service === 'github') {
        expect(mockGetReviewFn.mock.calls[0][0]).toBe(req.body.number)
      } else if (service === 'gitlab') {
        expect(mockGetReviewFn.mock.calls[0][0]).toBe(req.body.object_attributes.iid)
      }
      expect(res.status.mock.calls[0][0]).toBe(200)
    })
  })

  test.each([
    ['github'], ['gitlab']
  ])('return success if merge request body does not match template - %s', async (service) => {
    req.params.service = service

    req.body = {
      number: 123,
      object_attributes: {
        iid: 234
      }
    }

    if (service === 'github') {
      req.headers['x-github-event'] = 'pull_request'
      mockGetSiteConfigFn.mockImplementation(() => new Promise((resolve, reject) => resolve(new Map([
          ['githubWebhookSecret', 'sha1=' + mockHmacDigest]
        ])))
      )
      req.headers['x-hub-signature'] = 'sha1=' + mockHmacDigest
    } else if (service === 'gitlab') {
      req.headers['x-gitlab-event'] = 'Merge Request Hook'
      mockGetSiteConfigFn.mockImplementation(() => new Promise((resolve, reject) => resolve(new Map([
          ['gitlabWebhookSecret', '2a-foobar-db72']
        ])))
      )
      req.headers['x-gitlab-token'] = '2a-foobar-db72'
    }

    mockReview = new Review('Some random PR', 'Review body', 'merged', 'staticman_1234567', 'master')
    mockGetReviewFn.mockImplementation((mergeReqNbr) => new Promise((resolve, reject) => resolve(mockReview)))

    expect.hasAssertions()
    return webhook(req, res).then(response => {
      if (service === 'github') {
        expect(mockCreateHmacFn).toHaveBeenCalledTimes(1)
      }
      expect(mockCreateFn).toHaveBeenCalledTimes(1)
      expect(mockGetReviewFn).toHaveBeenCalledTimes(1)
      // No attempt should be made to send notification emails.
      expect(mockProcessMergeFn).toHaveBeenCalledTimes(0)
      if (service === 'github') {
        expect(mockDeleteBranchFn).toHaveBeenCalledTimes(1)
      } else if (service === 'gitlab') {
        expect(mockDeleteBranchFn).toHaveBeenCalledTimes(0)
      }
      expect(res.status.mock.calls[0][0]).toBe(200)
    })
  })

  test.each([
    ['github'], ['gitlab']
  ])('abort and return an error if error raised sending notification emails - %s', async (service) => {
    req.params.service = service

    req.body = {
      number: 123,
      object_attributes: {
        iid: 234
      }
    }

    if (service === 'github') {
      req.headers['x-github-event'] = 'pull_request'
      mockGetSiteConfigFn.mockImplementation(() => new Promise((resolve, reject) => resolve(new Map([
          ['githubWebhookSecret', 'sha1=' + mockHmacDigest]
        ])))
      )
      req.headers['x-hub-signature'] = 'sha1=' + mockHmacDigest
    } else if (service === 'gitlab') {
      req.headers['x-gitlab-event'] = 'Merge Request Hook'
      mockGetSiteConfigFn.mockImplementation(() => new Promise((resolve, reject) => resolve(new Map([
          ['gitlabWebhookSecret', '2a-foobar-db72']
        ])))
      )
      req.headers['x-gitlab-token'] = '2a-foobar-db72'
    }

    /*
     * Mock a review body that contains the "staticman_notification" comment section that triggers
     * notifications to be sent.
     */
    mockReview = new Review('Some random PR', sampleData.prBody1, 'merged', 'staticman_1234567', 'master')
    mockGetReviewFn.mockImplementation((mergeReqNbr) => new Promise((resolve, reject) => resolve(mockReview)))

    const errorMsg = 'process merge error msg'
    mockProcessMergeFn.mockImplementation((mergeReqNbr) => new Promise((resolve, reject) => reject(new Error(errorMsg))))

    expect.hasAssertions()
    return webhook(req, res).then(response => {
      if (service === 'github') {
        expect(mockCreateHmacFn).toHaveBeenCalledTimes(1)
      }
      expect(mockCreateFn).toHaveBeenCalledTimes(1)
      expect(mockGetReviewFn).toHaveBeenCalledTimes(1)
      expect(mockProcessMergeFn).toHaveBeenCalledTimes(1)
      // Shold still attempt to delete branch despite error sending notification emails.
      if (service === 'github') {
        expect(mockDeleteBranchFn).toHaveBeenCalledTimes(1)
      } else if (service === 'gitlab') {
        expect(mockDeleteBranchFn).toHaveBeenCalledTimes(0)
      }
      expect(res.send.mock.calls[0][0]).toEqual({ errors: '[\"' + errorMsg + '\"]' })
      expect(res.status.mock.calls[0][0]).toBe(400)
    })
  })

  test.each([
    ['github']
  ])('abort and return an error if delete branch fails - %s', async (service) => {
    req.params.service = service

    req.body = {
      number: 123,
      object_attributes: {
        iid: 234
      }
    }

    req.headers['x-github-event'] = 'pull_request'
    mockGetSiteConfigFn.mockImplementation(() => new Promise((resolve, reject) => resolve(new Map([
        ['githubWebhookSecret', 'sha1=' + mockHmacDigest]
      ])))
    )
    req.headers['x-hub-signature'] = 'sha1=' + mockHmacDigest

    mockReview = new Review('Some random PR', sampleData.prBody1, 'merged', 'staticman_1234567', 'master')
    mockGetReviewFn.mockImplementation((mergeReqNbr) => new Promise((resolve, reject) => resolve(mockReview)))
    mockProcessMergeFn.mockImplementation((mergeReqNbr) => new Promise((resolve, reject) => resolve(true)))

    const errorMsg = 'delete branch error msg'
    mockDeleteBranchFn.mockImplementation((sourceBranch) => new Promise((resolve, reject) => reject(errorMsg)))

    // Suppress any calls to console.error - to keep test output clean.
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect.hasAssertions()
    return webhook(req, res).then(response => {
      expect(mockCreateHmacFn).toHaveBeenCalledTimes(1)
      expect(mockCreateFn).toHaveBeenCalledTimes(1)
      expect(mockGetReviewFn).toHaveBeenCalledTimes(1)
      expect(mockProcessMergeFn).toHaveBeenCalledTimes(1)
      expect(mockDeleteBranchFn).toHaveBeenCalledTimes(1)
      expect(res.send.mock.calls[0][0]).toEqual(
        { errors: '[\"Failed to delete merge branch ' + mockReview.sourceBranch + ' - ' + errorMsg + '\"]' })
      expect(res.status.mock.calls[0][0]).toBe(400)

      // Restore console.error
      consoleSpy.mockRestore();
    })
  })

  test.each([
    ['github']
  ])('return success if delete branch succeeds - %s', async (service) => {
    req.params.service = service

    req.body = {
      number: 123,
      object_attributes: {
        iid: 234
      }
    }

    req.headers['x-github-event'] = 'pull_request'
    mockGetSiteConfigFn.mockImplementation(() => new Promise((resolve, reject) => resolve(new Map([
        ['githubWebhookSecret', 'sha1=' + mockHmacDigest]
      ])))
    )
    req.headers['x-hub-signature'] = 'sha1=' + mockHmacDigest

    mockReview = new Review('Some random PR', sampleData.prBody1, 'merged', 'staticman_1234567', 'master')
    mockGetReviewFn.mockImplementation((mergeReqNbr) => new Promise((resolve, reject) => resolve(mockReview)))
    mockProcessMergeFn.mockImplementation((mergeReqNbr) => new Promise((resolve, reject) => resolve(true)))
    mockDeleteBranchFn.mockImplementation((sourceBranch) => new Promise((resolve, reject) => resolve(true)))

    expect.hasAssertions()
    return webhook(req, res).then(response => {
      expect(mockCreateHmacFn).toHaveBeenCalledTimes(1)
      expect(mockCreateFn).toHaveBeenCalledTimes(1)
      expect(mockGetReviewFn).toHaveBeenCalledTimes(1)
      expect(mockProcessMergeFn).toHaveBeenCalledTimes(1)
      expect(mockDeleteBranchFn).toHaveBeenCalledTimes(1)
      expect(res.status.mock.calls[0][0]).toBe(200)
    })
  })

  test.each([
    ['gitlab']
  ])('no attempt to delete branch if gitlab - %s', async (service) => {
    req.params.service = service

    req.body = {
      number: 123,
      object_attributes: {
        iid: 234
      }
    }

    req.headers['x-gitlab-event'] = 'Merge Request Hook'
    mockGetSiteConfigFn.mockImplementation(() => new Promise((resolve, reject) => resolve(new Map([
        ['gitlabWebhookSecret', '2a-foobar-db72']
      ])))
    )
    req.headers['x-gitlab-token'] = '2a-foobar-db72'

    mockReview = new Review('Some random PR', sampleData.prBody1, 'merged', 'staticman_1234567', 'master')
    mockGetReviewFn.mockImplementation((mergeReqNbr) => new Promise((resolve, reject) => resolve(mockReview)))
    mockProcessMergeFn.mockImplementation((mergeReqNbr) => new Promise((resolve, reject) => resolve(true)))
    mockDeleteBranchFn.mockImplementation((sourceBranch) => new Promise((resolve, reject) => resolve(true)))

    expect.hasAssertions()
    return webhook(req, res).then(response => {
      expect(mockCreateFn).toHaveBeenCalledTimes(1)
      expect(mockGetReviewFn).toHaveBeenCalledTimes(1)
      expect(mockProcessMergeFn).toHaveBeenCalledTimes(1)
      expect(mockDeleteBranchFn).toHaveBeenCalledTimes(0)
      expect(res.status.mock.calls[0][0]).toBe(200)
    })
  })

  test.each([
    ['github']
  ])('abort and return multiple errors if BOTH sending notification emails and deleting the branch fails - %s', async (service) => {
    req.params.service = service

    req.body = {
      number: 123,
      object_attributes: {
        iid: 234
      }
    }

    req.headers['x-github-event'] = 'pull_request'
    mockGetSiteConfigFn.mockImplementation(() => new Promise((resolve, reject) => resolve(new Map([
        ['githubWebhookSecret', 'sha1=' + mockHmacDigest]
      ])))
    )
    req.headers['x-hub-signature'] = 'sha1=' + mockHmacDigest

    mockReview = new Review('Some random PR', sampleData.prBody1, 'merged', 'staticman_1234567', 'master')
    mockGetReviewFn.mockImplementation((mergeReqNbr) => new Promise((resolve, reject) => resolve(mockReview)))

    const processMergeErrorMsg = 'process merge error msg'
    mockProcessMergeFn.mockImplementation(
      (mergeReqNbr) => new Promise((resolve, reject) => reject(new Error(processMergeErrorMsg))))
    const deleteBranchErrorMsg = 'delete branch error msg'
    mockDeleteBranchFn.mockImplementation(
      (sourceBranch) => new Promise((resolve, reject) => reject(deleteBranchErrorMsg)))

    // Suppress any calls to console.error - to keep test output clean.
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect.hasAssertions()
    return webhook(req, res).then(response => {
      expect(mockCreateHmacFn).toHaveBeenCalledTimes(1)
      expect(mockCreateFn).toHaveBeenCalledTimes(1)
      expect(mockGetReviewFn).toHaveBeenCalledTimes(1)
      expect(mockProcessMergeFn).toHaveBeenCalledTimes(1)
      expect(mockDeleteBranchFn).toHaveBeenCalledTimes(1)
      expect(res.send.mock.calls[0][0]).toEqual(
        { errors: '[\"' + processMergeErrorMsg + '\",\"Failed to delete merge branch ' + mockReview.sourceBranch + ' - ' + deleteBranchErrorMsg + '\"]' })
      expect(res.status.mock.calls[0][0]).toBe(400)

      // Restore console.error
      consoleSpy.mockRestore();
    })
  })
})
