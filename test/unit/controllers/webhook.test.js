const config = require('./../../../config')
const helpers = require('./../../helpers')

let req
let res

let mockHandlePrFn = jest.fn()
// The handlePR module exposes one "naked" function.
jest.mock('../../../controllers/handlePR', () => {
  return mockHandlePrFn
});

const webhook = require('./../../../controllers/webhook')

beforeEach(() => {
  mockHandlePrFn.mockImplementation(() => Promise.resolve('success'))
  // mockHandlePrFn.mockImplementation(() => {
  //   return 'success'
  // })

  req = helpers.getMockRequest()
  res = helpers.getMockResponse()
})

afterEach(() => {
  // Clear any test-specific mock implementations.
  mockHandlePrFn.mockClear()
})

describe('Webhook controller', () => {
  test.each([
    ['github']
  ])('returns an error if GitHub specified', async (service) => {
    req.params.service = service

    expect.hasAssertions()
    return webhook(req, res).then(response => {
      expect(mockHandlePrFn).toHaveBeenCalledTimes(0)
      expect(res.send.mock.calls[0][0]).toEqual({ error: 'Unexpected service specified.' })
      expect(res.status.mock.calls[0][0]).toBe(400)
    })
  })

  test.each([
    ['gitlab']
  ])('abort and return an error if no event header found  - %s', async (service) => {
    req.params.service = service

    expect.hasAssertions()
    return webhook(req, res).then(response => {
      expect(mockHandlePrFn).toHaveBeenCalledTimes(0)
      expect(res.send.mock.calls[0][0]).toEqual({ error: 'No event found in the request' })
      expect(res.status.mock.calls[0][0]).toBe(400)
    })
  })

  test.each([
    ['gitlab']
  ])('abort and return success if not "Merge Request Hook" event - %s', async (service) => {
    req.params.service = service
    req.headers['x-gitlab-event'] = 'Some Other Hook'

    expect.hasAssertions()
    return webhook(req, res).then(response => {
      expect(mockHandlePrFn).toHaveBeenCalledTimes(0)
      expect(res.status.mock.calls[0][0]).toBe(200)
    })
  })

  test.each([
    ['gitlab']
  ])('abort and return an error if "handlePR" call fails  - %s', async (service) => {
    req.params.service = service
    req.headers['x-gitlab-event'] = 'Merge Request Hook'

    /*
     * Replace the mock implementation to throw an error. More info:
     *  https://blog.bguiz.com/2017/mocking-chained-apis-jest/
     */
    mockHandlePrFn.mockImplementation(() => Promise.reject( { message: 'Error calling handlePR.' } ))
    // mockHandlePrFn.mockImplementation(() => {
    //   throw { message: 'Error calling handlePR.' }
    // })

    // Suppress any calls to console.error - to keep test output clean.
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect.hasAssertions()
    return webhook(req, res).then(response => {
      expect(mockHandlePrFn).toHaveBeenCalledTimes(1)
      expect(res.send.mock.calls[0][0]).toEqual({ error: 'Error calling handlePR.' })
      expect(res.status.mock.calls[0][0]).toBe(400)

      // Restore console.error
      consoleSpy.mockRestore();
    })
  })

  test.each([
    ['gitlab']
  ])('return success if "handlePR" call succeeds  - %s', async (service) => {
    req.params.service = service
    req.headers['x-gitlab-event'] = 'Merge Request Hook'

    expect.hasAssertions()
    return webhook(req, res).then(response => {
      expect(mockHandlePrFn).toHaveBeenCalledTimes(1)
      expect(res.status.mock.calls[0][0]).toBe(200)
    })
  })

  test.each([
    ['gitlab']
  ])('abort and return an error if webhook secret not sent  - %s', async (service) => {
    req.params.service = service
    req.headers['x-gitlab-event'] = 'Merge Request Hook'

    // Inject a value for "gitlabWebhookSecret" into the JSON-sourced config.
    config.set('gitlabWebhookSecret', '2a-foobar-db72')

    expect.hasAssertions()
    return webhook(req, res).then(response => {
      expect(mockHandlePrFn).toHaveBeenCalledTimes(0)
      expect(res.send.mock.calls[0][0]).toEqual({ error: 'No secret found in the webhook request' })
      expect(res.status.mock.calls[0][0]).toBe(400)

      // Clean-up the modified JSON-sourced config.
      config.set('gitlabWebhookSecret', null)
    })
  })

  test.each([
    ['gitlab']
  ])('abort and return an error if unexpected webhook secret sent  - %s', async (service) => {
    req.params.service = service
    req.headers['x-gitlab-event'] = 'Merge Request Hook'
    req.headers['x-gitlab-token'] = '2a-different-db72'

    // Inject a value for "gitlabWebhookSecret" into the JSON-sourced config.
    config.set('gitlabWebhookSecret', '2a-foobar-db72')

    expect.hasAssertions()
    return webhook(req, res).then(response => {
      expect(mockHandlePrFn).toHaveBeenCalledTimes(0)
      expect(res.send.mock.calls[0][0]).toEqual({ error: 'Unable to verify authenticity of request' })
      expect(res.status.mock.calls[0][0]).toBe(400)

      // Clean-up the modified JSON-sourced config.
      config.set('gitlabWebhookSecret', null)
    })
  })

  test.each([
    ['gitlab']
  ])('return success if expected webhook secret sent  - %s', async (service) => {
    req.params.service = service
    req.headers['x-gitlab-event'] = 'Merge Request Hook'
    req.headers['x-gitlab-token'] = '2a-foobar-db72'

    // Inject a value for "gitlabWebhookSecret" into the JSON-sourced config.
    config.set('gitlabWebhookSecret', '2a-foobar-db72')

    expect.hasAssertions()
    return webhook(req, res).then(response => {
      expect(mockHandlePrFn).toHaveBeenCalledTimes(1)
      expect(res.status.mock.calls[0][0]).toBe(200)

      // Clean-up the modified JSON-sourced config.
      config.set('gitlabWebhookSecret', null)
    })
  })
})
