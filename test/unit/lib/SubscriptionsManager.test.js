

const SubscriptionsManager = require('./../../../lib/SubscriptionsManager')

let params = {
	username: 'foo-user',
	repository: 'foo-repo'
}
const dataStore = null

let mockListsInfoFunc = jest.fn()
let mockListsCreateFunc = jest.fn()
let mockListsMembersCreateFunc = jest.fn()
let mockMailAgent

let options
const emailAddr = 'foo@example.com'

beforeEach(() => {
  mockMailAgent = {
	lists: jest.fn().mockImplementation(listaddr => {
	  const result = {
		info: mockListsInfoFunc,
		create: mockListsCreateFunc,
		members: jest.fn().mockImplementation(() => {
		  const result = {
			create: mockListsMembersCreateFunc
		  }
		  return result
		})
	  }
	  return result
	}), 
	domain: 'example.com'
  }

  options = {
	parent: 'an-awesome-post-about-staticman'
  }
})

afterEach(() => {
  mockMailAgent.lists.mockClear()
  mockListsInfoFunc.mockClear()
  mockListsCreateFunc.mockClear()
  mockListsMembersCreateFunc.mockClear()
})

describe('SubscriptionsManager', () => {
  test('creates mailing list if it does not exist and adds subscriber', async () => {
    const subscriptionsMgr = new SubscriptionsManager(params, dataStore, mockMailAgent)

    // Mock that the list does not exist.
    mockListsInfoFunc.mockImplementation( (callback) => callback(null, null) )
    mockListsCreateFunc.mockImplementation( (createData, callback) => callback(null, 'success') )
    mockListsMembersCreateFunc.mockImplementation( (createData, callback) => callback(null, 'success'))

    expect.hasAssertions()
    await subscriptionsMgr.set(options, emailAddr).then(response => {
      expect(mockMailAgent.lists).toHaveBeenCalledTimes(3)
      expect(mockListsInfoFunc).toHaveBeenCalledTimes(1)
      expect(mockListsCreateFunc).toHaveBeenCalledTimes(1)
      expect(mockListsMembersCreateFunc).toHaveBeenCalledTimes(1)
      expect(mockMailAgent.lists.mock.calls[0][0]).toBe('26b053c67a70a1127b71783c3d39d355@example.com')
      expect(mockListsCreateFunc.mock.calls[0][0]['address']).toBe('26b053c67a70a1127b71783c3d39d355@example.com')
      expect(mockListsCreateFunc.mock.calls[0][0]['access_level']).toBe('readonly')
      expect(mockListsCreateFunc.mock.calls[0][0]['reply_preference']).toBe('sender')
      expect(mockListsMembersCreateFunc.mock.calls[0][0]).toEqual( { address: emailAddr } )
    })
  })

  test('creates mailing list (with name and description) if it does not exist and adds subscriber', async () => {
    const subscriptionsMgr = new SubscriptionsManager(params, dataStore, mockMailAgent)

    // Mock that the list does not exist.
    mockListsInfoFunc.mockImplementation( (callback) => callback(null, null) )
    mockListsCreateFunc.mockImplementation( (createData, callback) => callback(null, 'success') )
    mockListsMembersCreateFunc.mockImplementation( (createData, callback) => callback(null, 'success'))

    // Set the optional parent name.
    options.parentName = 'Post an-awesome-post-about-staticman'

    expect.hasAssertions()
    await subscriptionsMgr.set(options, emailAddr).then(response => {
      expect(mockMailAgent.lists).toHaveBeenCalledTimes(3)
      expect(mockListsInfoFunc).toHaveBeenCalledTimes(1)
      expect(mockListsCreateFunc).toHaveBeenCalledTimes(1)
      expect(mockListsMembersCreateFunc).toHaveBeenCalledTimes(1)
      expect(mockMailAgent.lists.mock.calls[0][0]).toBe('26b053c67a70a1127b71783c3d39d355@example.com')
      expect(mockListsCreateFunc.mock.calls[0][0]['address']).toBe('26b053c67a70a1127b71783c3d39d355@example.com')
      expect(mockListsCreateFunc.mock.calls[0][0]['access_level']).toBe('readonly')
      expect(mockListsCreateFunc.mock.calls[0][0]['reply_preference']).toBe('sender')
      // Assert that "name" and "description" are passed when parent name is supplied.
      expect(mockListsCreateFunc.mock.calls[0][0]['name']).toBe(options.parentName)
      expect(mockListsCreateFunc.mock.calls[0][0]['description']).toBe(
      	'Subscribers to: ' + options.parentName + ' (' + params.username + '/' + params.repository + ')')
      expect(mockListsMembersCreateFunc.mock.calls[0][0]).toEqual( { address: emailAddr } )
    })
  })

  test('does not create mailing list if it already exists and adds subscriber', async () => {
    const subscriptionsMgr = new SubscriptionsManager(params, dataStore, mockMailAgent)

    // Mock that the list exists.
    mockListsInfoFunc.mockImplementation( (callback) => callback(null, {list: {}}) )
    mockListsMembersCreateFunc.mockImplementation( (createData, callback) => callback(null, 'success'))

    expect.hasAssertions()
    await subscriptionsMgr.set(options, emailAddr).then(response => {
      expect(mockMailAgent.lists).toHaveBeenCalledTimes(2)
      expect(mockListsInfoFunc).toHaveBeenCalledTimes(1)
      // Assert that list not created.
      expect(mockListsCreateFunc).toHaveBeenCalledTimes(0)
      expect(mockListsMembersCreateFunc).toHaveBeenCalledTimes(1)
      expect(mockMailAgent.lists.mock.calls[0][0]).toBe('26b053c67a70a1127b71783c3d39d355@example.com')
      expect(mockListsMembersCreateFunc.mock.calls[0][0]).toEqual( { address: emailAddr } )
    })
  })

  test('list lookup error handled', async () => {
    const subscriptionsMgr = new SubscriptionsManager(params, dataStore, mockMailAgent)

    // Mock that the list lookup errors.
    mockListsInfoFunc.mockImplementation( (callback) => 
      callback({statusCode: 500, message: 'list lookup failure'}, null) )

    expect.hasAssertions()
    await subscriptionsMgr.set(options, emailAddr).catch(error => {
      expect(error.message).toBe('list lookup failure')
      expect(mockMailAgent.lists).toHaveBeenCalledTimes(1)
      expect(mockListsInfoFunc).toHaveBeenCalledTimes(1)
      expect(mockListsCreateFunc).toHaveBeenCalledTimes(0)
      expect(mockListsMembersCreateFunc).toHaveBeenCalledTimes(0)
    })
  })

  test('list create error handled', async () => {
    const subscriptionsMgr = new SubscriptionsManager(params, dataStore, mockMailAgent)

    mockListsInfoFunc.mockImplementation( (callback) => callback(null, null) )
    // Mock that the list create errors.
    mockListsCreateFunc.mockImplementation( (createData, callback) => 
      callback({statusCode: 500, message: 'list create failure'}, null) )

    expect.hasAssertions()
    await subscriptionsMgr.set(options, emailAddr).catch(error => {
      expect(error.message).toBe('list create failure')
      expect(mockMailAgent.lists).toHaveBeenCalledTimes(2)
      expect(mockListsInfoFunc).toHaveBeenCalledTimes(1)
      expect(mockListsCreateFunc).toHaveBeenCalledTimes(1)
      expect(mockListsMembersCreateFunc).toHaveBeenCalledTimes(0)
    })
  })

  test('list member create error handled', async () => {
    const subscriptionsMgr = new SubscriptionsManager(params, dataStore, mockMailAgent)

    mockListsInfoFunc.mockImplementation( (callback) => callback(null, null) )
    mockListsCreateFunc.mockImplementation( (createData, callback) => callback(null, 'success') )
    // Mock that the list member create errors.
    mockListsMembersCreateFunc.mockImplementation( (createData, callback) => 
      callback({statusCode: 500, message: 'member create failure'}, null) )

    expect.hasAssertions()
    await subscriptionsMgr.set(options, emailAddr).catch(error => {
      expect(error.message).toBe('member create failure')
      expect(mockMailAgent.lists).toHaveBeenCalledTimes(3)
      expect(mockListsInfoFunc).toHaveBeenCalledTimes(1)
      expect(mockListsCreateFunc).toHaveBeenCalledTimes(1)
      expect(mockListsMembersCreateFunc).toHaveBeenCalledTimes(1)
    })
  })
})