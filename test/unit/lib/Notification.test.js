const config = require('./../../../config')
const mockHelpers = require('./../../helpers')
const Notification = require('./../../../lib/Notification')

const mockCreateFn = jest.fn(() => Promise.resolve("mocked success"))
const mockMessages = {
  create: mockCreateFn
}
const mockMailAgent = {
  messages: mockMessages
}
const mockDomain = 'mg.mydomain.com'

beforeEach(() => {
  mockCreateFn.mockClear()
})

describe('Notification interface', () => {
  const mockData = {
    data: {
      siteName: 'Eduardo\'s blog'
    },
    fields: {
      name: 'Eduardo Bouças',
      email: 'mail@eduardoboucas.com'
    },
    options: {
      origin: 'https://eduardoboucas.com'
    } 
  }

  test('builds an email message from the template, replacing the placeholders with the data provided', () => {
    const notification = new Notification(mockMailAgent, mockDomain)
    const message = notification._buildMessage(mockData.fields, mockData.options, mockData.data)

    expect(message.includes(mockData.data.siteName)).toBe(true)
    expect(message.includes(mockData.options.origin)).toBe(true)
  })

  test('sends an email through the mail agent', () => {
    const notification = new Notification(mockMailAgent, mockDomain)
    const message = notification._buildMessage(mockData.fields, mockData.options, mockData.data)
    const recipient = 'john.doe@foobar.com'
    
    notification.send(
      recipient,
      mockData.fields,
      mockData.options,
      mockData.data
    )

    expect(mockCreateFn.mock.calls.length).toBe(1)
    expect(mockCreateFn.mock.calls[0][0]).toEqual(mockDomain)
    expect(mockCreateFn.mock.calls[0][1]).toEqual({
      from: `Staticman <${config.get('email.fromAddress')}>`,
      to: recipient,
      subject: `New reply on "${mockData.data.siteName}"`,
      html: message
    })
  })
})
