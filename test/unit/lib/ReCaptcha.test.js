import nock from 'nock';

import ReCaptcha from '../../../source/lib/ReCaptcha';
import CaptchaFactory from '../../../source/lib/CaptchaFactory';
import * as mockHelpers from '../../helpers';

let mockConfig;

beforeEach(() => {
  mockConfig = mockHelpers.getConfig();
  mockConfig.set('captcha.ReCaptcha.secret', mockHelpers.encrypt('some other secret'))
  nock.cleanAll()
  jest.resetModules();
});

describe('ReCaptcha', () => {
  describe('getKeyForToken', () => {
    test('Verifiy key for get token of ReCaptcha', () => {
      const reCaptcha = new ReCaptcha(mockConfig)
      expect(reCaptcha.getKeyForToken()).toEqual('g-recaptcha-response');
    });
  });


  describe('captchaFactory', () => {
    test('Verifiy key for get token of ReCaptcha', () => {
      const captcha = CaptchaFactory("ReCaptcha", mockConfig)
      expect(captcha.constructor.name === 'ReCaptcha').toEqual(true);
    });
  });

  describe('verify', () => {
    test('throws an error if ReCaptcha Token not set', async (done) => {
      const reCaptcha = new ReCaptcha(mockConfig)
      try {
        await reCaptcha.verify()
        done.fail('should have error RECAPTCHA_TOKEN_MISSING')
      } catch (err) {
        expect(err._smErrorCode).toBe('RECAPTCHA_TOKEN_MISSING');
        done()
      }
    });

    test('ReCaptcha Token set and responce succeeds', async (done) => {
      nock(mockConfig.get('captcha.ReCaptcha.domainURL'))
      .post(/siteverify/)
      .reply(200, { "success": true });

      const reCaptcha = new ReCaptcha(mockConfig)
      try {
        const sucess = await reCaptcha.verify("super token")
        expect(sucess).toBe(true);
        done()
      } catch (err) {
        done.fail(err)
      }
    });

    test('throws an error if ReCaptcha Token set but is invalid-input-response', async (done) => {
      nock(mockConfig.get('captcha.ReCaptcha.domainURL'))
      .post(/siteverify/)
      .reply(200,   { success: false, 'error-codes': [ 'invalid-input-response' ] });
      const reCaptcha = new ReCaptcha(mockConfig)
      try {
        await reCaptcha.verify("0x0000000000000000000000000000000000000000")
        done.fail("should have error")
      } catch (err) {
        expect(err._smErrorCode).toEqual('invalid-input-response');
        done()

      }
    });

    test('throws an error if ReCaptcha Token set but is timeout-or-duplicate', async (done) => {
      nock(mockConfig.get('captcha.ReCaptcha.domainURL'))
      .post(/siteverify/)
      .reply(200,   { success: false, 'error-codes': [ 'timeout-or-duplicate' ] });
      const reCaptcha = new ReCaptcha(mockConfig)
      try {
        await reCaptcha.verify("0x0000000000000000000000000000000000000000")
        done.fail("should have error")
      } catch (err) {
        expect(err._smErrorCode).toEqual('timeout-or-duplicate');
        done()
      }
    });

    test('throws an error if ReCaptcha Token V3 with score to hight', async (done) => {
      nock(mockConfig.get('captcha.ReCaptcha.domainURL'))
      .post(/siteverify/)
      .reply(200,   { success: true, score: 0.51 });
      mockConfig.set('captcha.ReCaptcha.version', "V3");
      const reCaptcha = new ReCaptcha(mockConfig)
      try {
        await reCaptcha.verify("0x0000000000000000000000000000000000000000")
        done.fail("should have error")
      } catch (err) {
        expect(err._smErrorCode).toEqual('RECAPTCHA_V3_SCORE_HIGH');
        done()
      }
    });

    test('throws an error if ReCaptcha Token V3 succeeds', async (done) => {
      nock(mockConfig.get('captcha.ReCaptcha.domainURL'))
      .post(/siteverify/)
      .reply(200,   { success: true, score: 0.50 });
      mockConfig.set('captcha.ReCaptcha.version', "V3");
      const reCaptcha = new ReCaptcha(mockConfig)
      try {
        const sucess = await reCaptcha.verify("0x0000000000000000000000000000000000000000")
        expect(sucess).toBe(true);
        done()
      } catch (err) {
        done.fail(err)
      }
    });
  });  
});
