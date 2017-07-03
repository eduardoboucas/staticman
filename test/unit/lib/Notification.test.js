const config = require('./../../../config')
const mockHelpers = require('./../../helpers')
const Notification = require('./../../../lib/Notification')

const mockSendFn = jest.fn()
const mockMessagesFn = jest.fn(() => ({
  send: mockSendFn
}))
const mockMailAgent = {
  messages: mockMessagesFn
}

beforeEach(() => {
  mockSendFn.mockClear()
  mockMessagesFn.mockClear()
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
    const notification = new Notification(mockMailAgent)
    const message = notification._buildMessage(mockData.fields, mockData.options, mockData.data)

    expect(message.includes(mockData.data.siteName)).toBe(true)
    expect(message.includes(mockData.options.origin)).toBe(true)
  })

  test('sends an email through the mail agent', () => {
    const notification = new Notification(mockMailAgent)
    const message = notification._buildMessage(mockData.fields, mockData.options, mockData.data)
    const recipient = 'john.doe@foobar.com'
    
    notification.send(
      recipient,
      mockData.fields,
      mockData.options,
      mockData.data
    )

    expect(mockSendFn.mock.calls.length).toBe(1)
    expect(mockSendFn.mock.calls[0][0]).toEqual({
      from: `Staticman <${config.get('email.fromAddress')}>`,
      to: recipient,
      subject: `New reply on "${mockData.data.siteName}"`,
      html: message
    })
  })
})
