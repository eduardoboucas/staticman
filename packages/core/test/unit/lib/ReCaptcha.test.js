import * as mockHelpers from '../../helpers';

let mockSiteConfig;
let req;

beforeEach(() => {
  jest.resetModules();

  mockSiteConfig = mockHelpers.getConfig();

  req = mockHelpers.getMockRequest();
});

describe('ReCaptcha service', () => {
  describe('checkRecaptcha', () => {
    test('does nothing if reCaptcha is not enabled in config', () => {
      mockSiteConfig.set('reCaptcha.enabled', false);

      jest.mock('../../../source/lib/Staticman', () => {
        return jest.fn((parameters) => ({
          getSiteConfig: () => Promise.resolve(mockSiteConfig),
        }));
      });

      const { default: checkRecaptcha } = require('../../../source/lib/ReCaptcha');
      const Staticman = require('../../../source/lib/Staticman');
      const staticman = new Staticman(req.params);

      return checkRecaptcha(staticman, req).then((response) => {
        expect(response).toBe(false);
      });
    });

    test('throws an error if reCaptcha block is not in the request body', () => {
      jest.mock('../../../source/lib/Staticman', () => {
        return jest.fn((parameters) => ({
          getSiteConfig: () => Promise.resolve(mockSiteConfig),
        }));
      });

      const { default: checkRecaptcha } = require('../../../source/lib/ReCaptcha');
      const Staticman = require('../../../source/lib/Staticman');
      const staticman = new Staticman(req.params);

      mockSiteConfig.set('reCaptcha.enabled', true);

      req.body = {
        options: {},
      };

      return checkRecaptcha(staticman, req).catch((err) => {
        expect(err._smErrorCode).toBe('RECAPTCHA_MISSING_CREDENTIALS');
      });
    });

    test('throws an error if reCaptcha site key is not in the request body', () => {
      jest.mock('../../../source/lib/Staticman', () => {
        return jest.fn((parameters) => ({
          getSiteConfig: () => Promise.resolve(mockSiteConfig),
        }));
      });

      const { default: checkRecaptcha } = require('../../../source/lib/ReCaptcha');
      const Staticman = require('../../../source/lib/Staticman');
      const staticman = new Staticman(req.params);

      req.body = {
        options: {
          reCaptcha: {
            secret: '1q2w3e4r',
          },
        },
      };

      return checkRecaptcha(staticman, req).catch((err) => {
        expect(err._smErrorCode).toBe('RECAPTCHA_MISSING_CREDENTIALS');
      });
    });

    test('throws an error if reCaptcha secret is not in the request body', () => {
      jest.mock('../../../source/lib/Staticman', () => {
        return jest.fn((parameters) => ({
          getSiteConfig: () => Promise.resolve(mockSiteConfig),
        }));
      });

      const { default: checkRecaptcha } = require('../../../source/lib/ReCaptcha');
      const Staticman = require('../../../source/lib/Staticman');
      const staticman = new Staticman(req.params);

      req.body = {
        options: {
          reCaptcha: {
            siteKey: '123456789',
          },
        },
      };

      return checkRecaptcha(staticman, req).catch((err) => {
        expect(err._smErrorCode).toBe('RECAPTCHA_MISSING_CREDENTIALS');
      });
    });

    test('throws an error if the reCatpcha secret fails to decrypt', () => {
      jest.mock('../../../source/lib/Staticman', () => {
        return jest.fn((parameters) => ({
          decrypt: () => {
            throw Error('someError');
          },
          getSiteConfig: () => Promise.resolve(mockSiteConfig),
        }));
      });

      const { default: checkRecaptcha } = require('../../../source/lib/ReCaptcha');
      const Staticman = require('../../../source/lib/Staticman');
      const staticman = new Staticman(req.params);

      req.body = {
        options: {
          reCaptcha: {
            siteKey: '123456789',
            secret: '1q2w3e4r',
          },
        },
      };

      return checkRecaptcha(staticman, req).catch((err) => {
        expect(err._smErrorCode).toBe('RECAPTCHA_CONFIG_MISMATCH');
      });
    });

    test('throws an error if the reCatpcha siteKey provided does not match the one in config', () => {
      jest.mock('../../../source/lib/Staticman', () => {
        return jest.fn((parameters) => ({
          getSiteConfig: () => Promise.resolve(mockSiteConfig),
        }));
      });

      const { default: checkRecaptcha } = require('../../../source/lib/ReCaptcha');
      const Staticman = require('../../../source/lib/Staticman');
      const staticman = new Staticman(req.params);

      req.body = {
        options: {
          reCaptcha: {
            siteKey: '987654321',
            secret: mockSiteConfig.getRaw('reCaptcha.secret'),
          },
        },
      };

      return checkRecaptcha(staticman, req).catch((err) => {
        expect(err._smErrorCode).toBe('RECAPTCHA_CONFIG_MISMATCH');
      });
    });

    test('throws an error if the reCatpcha secret provided does not match the one in config', () => {
      jest.mock('../../../source/lib/Staticman', () => {
        return jest.fn((parameters) => ({
          getSiteConfig: () => Promise.resolve(mockSiteConfig),
        }));
      });

      const { default: checkRecaptcha } = require('../../../source/lib/ReCaptcha');
      const Staticman = require('../../../source/lib/Staticman');
      const staticman = new Staticman(req.params);

      req.body = {
        options: {
          reCaptcha: {
            siteKey: mockSiteConfig.get('reCaptcha.siteKey'),
            secret: mockHelpers.encrypt('some other secret'),
          },
        },
      };

      return checkRecaptcha(staticman, req).catch((err) => {
        expect(err._smErrorCode).toBe('RECAPTCHA_CONFIG_MISMATCH');
      });
    });

    test('initialises and triggers a verification from the reCaptcha module', () => {
      const mockInitFn = jest.fn();
      const mockVerifyFn = jest.fn((mockReq, reCaptchaCallback) => {
        reCaptchaCallback(false);
      });

      jest.mock('express-recaptcha', () => {
        return {
          init: mockInitFn,
          verify: mockVerifyFn,
        };
      });

      jest.mock('../../../source/lib/Staticman', () => {
        return jest.fn((parameters) => ({
          decrypt: mockHelpers.decrypt,
          getSiteConfig: () => Promise.resolve(mockSiteConfig),
        }));
      });

      const { default: checkRecaptcha } = require('../../../source/lib/ReCaptcha');
      const Staticman = require('../../../source/lib/Staticman');
      const staticman = new Staticman(req.params);

      req.body = {
        options: {
          reCaptcha: {
            siteKey: mockSiteConfig.get('reCaptcha.siteKey'),
            secret: mockSiteConfig.getRaw('reCaptcha.secret'),
          },
        },
      };

      return checkRecaptcha(staticman, req).then((response) => {
        expect(response).toBe(true);
        expect(mockInitFn.mock.calls).toHaveLength(1);
        expect(mockInitFn.mock.calls[0][0]).toBe(mockSiteConfig.get('reCaptcha.siteKey'));
        expect(mockInitFn.mock.calls[0][1]).toBe(mockSiteConfig.get('reCaptcha.secret'));
        expect(mockVerifyFn.mock.calls[0][0]).toBe(req);
      });
    });

    test('displays an error if the reCaptcha verification fails', () => {
      const reCaptchaError = new Error('someError');
      const mockInitFn = jest.fn();
      const mockVerifyFn = jest.fn((verifyReq, reCaptchaCallback) => {
        reCaptchaCallback(reCaptchaError);
      });

      jest.mock('express-recaptcha', () => {
        return {
          init: mockInitFn,
          verify: mockVerifyFn,
        };
      });

      jest.mock('../../../source/lib/Staticman', () => {
        return jest.fn((parameters) => ({
          decrypt: mockHelpers.decrypt,
          getSiteConfig: () => Promise.resolve(mockSiteConfig),
        }));
      });

      const { default: checkRecaptcha } = require('../../../source/lib/ReCaptcha');
      const Staticman = require('../../../source/lib/Staticman');
      const staticman = new Staticman(req.params);

      req.body = {
        options: {
          reCaptcha: {
            siteKey: mockSiteConfig.get('reCaptcha.siteKey'),
            secret: mockSiteConfig.getRaw('reCaptcha.secret'),
          },
        },
      };

      return checkRecaptcha(staticman, req).catch((err) => {
        expect(err).toEqual({
          _smErrorCode: reCaptchaError,
        });
      });
    });
  });
});
