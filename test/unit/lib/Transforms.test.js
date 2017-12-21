const Transforms = require('./../../../lib/Transforms')

describe('Transforms', () => {
  describe('md5', () => {
    test('returns an MD5 of the value', () => {
      expect(Transforms.md5('test-value')).toEqual('83b3c112b82dcca8376da029e8101bcc');
    })
  })

  describe('upcase', () => {
    test('returns an upcased value', () => {
      expect(Transforms.upcase('foobar')).toEqual('FOOBAR')
    })
  })

  describe('downcase', () => {
    test('returns an downcased value', () => {
      expect(Transforms.downcase('FOOBAR')).toEqual('foobar')
    })
  })
})
