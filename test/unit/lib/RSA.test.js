import { decrypt, encrypt } from '../../../source/lib/RSA';

describe('RSA library', () => {
  describe('encrypt', () => {
    it('returns a string which does not contain the original', () => {
      const inputString = 'someString';
      expect(encrypt(inputString)).not.toContain(inputString);
    });

    it('can handle special characters', () => {
      const inputString = 'someStringWith$pec!@lChars*{}()';
      expect(encrypt(inputString)).not.toContain(inputString);
    });
  });

  describe('decrypt', () => {
    it('decrypts a string which was previously encrypted with the RSA private key', () => {
      const inputString = 'someString';
      const encrypted = encrypt(inputString);
      expect(decrypt(encrypted)).toBe(inputString);
    });

    it('can handle special characters', () => {
      const inputString = 'someStringWith$pec!@lChars*{}()';
      const encrypted = encrypt(inputString);
      expect(decrypt(encrypted)).toBe(inputString);
    });
  });
});
