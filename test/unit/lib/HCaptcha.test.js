import nock from 'nock';

import HCaptcha from '../../../source/lib/HCaptcha';
import CaptchaFactory from '../../../source/lib/CaptchaFactory';
import * as mockHelpers from '../../helpers';

let mockConfig;

beforeEach(() => {
  mockConfig = mockHelpers.getConfig();
  mockConfig.set('captcha.HCaptcha.secret', mockHelpers.encrypt('some other secret'))
  nock.cleanAll()
  jest.resetModules();
});

describe('HCaptcha', () => {
  describe('getKeyForToken', () => {
    test('Verifiy key for get token of HCaptcha', () => {
      const hCaptcha = new HCaptcha(mockConfig)
      expect(hCaptcha.getKeyForToken()).toEqual('h-captcha-response');
    });
  });

  describe('captchaFactory', () => {
    test('Verifiy key for get token of HCaptcha', () => {
      const captcha = CaptchaFactory("HCaptcha", mockConfig)
      expect(captcha.constructor.name === 'HCaptcha').toEqual(true);
    });
  });

  describe('verify', () => {
    test('throws an error if HCaptcha Token not set', async (done) => {
      const hCaptcha = new HCaptcha(mockConfig)
      try {
        await hCaptcha.verify()
        done.fail('should have error RECAPTCHA_TOKEN_MISSING')
      } catch (err) {
        expect(err._smErrorCode).toBe('RECAPTCHA_TOKEN_MISSING');
        done()
      }
    });

    test('HCaptcha Token set and responce succeeds', async (done) => {
      nock('https://hcaptcha.com')
      .post('/siteverify')
      .reply(200, { "success": true });

      const hCaptcha = new HCaptcha(mockConfig)
      try {
        const sucess = await hCaptcha.verify("super token")
        expect(sucess).toBe(true);
        done()
      } catch (err) {
        done.fail(err)
      }
    });

    test('throws an error if HCaptcha Token set but is bot', async (done) => {
      nock('https://hcaptcha.com')
      .post('/siteverify')
      .reply(200,   {
        success: false,
        'error-codes': [ 'missing-input-response', 'missing-input-secret' ]
      });
      const hCaptcha = new HCaptcha(mockConfig)
      try {
        await hCaptcha.verify("0x0000000000000000000000000000000000000000")
        done.fail("should have error")
      } catch (err) {
        expect(err._smErrorCode).toEqual("missing-input-response");
        done()
      }
    });

  });  
});
