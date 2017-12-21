const Transforms = require('./../../../lib/Transforms')

describe('Transforms', () => {
  describe('md5', () => {
    test('returns an MD5 of the value', () => {
      expect(Transforms.md5('test-value')).toEqual('83b3c112b82dcca8376da029e8101bcc');
    })
  })
})
