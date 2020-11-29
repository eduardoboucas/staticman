import { getInstance } from '../../../source/lib/ErrorHandler';
import * as mockHelpers from '../../helpers';

const errorHandler = getInstance();

let mockSiteConfig;
let req;

beforeEach(() => {
  jest.resetModules();

  mockSiteConfig = mockHelpers.getConfig();

  req = mockHelpers.getMockRequest();
});

describe('Process controller', () => {
  describe('checkRecaptcha', () => {
    test('does nothing if reCaptcha is not enabled in config', async () => {
      mockSiteConfig.set('reCaptcha.enabled', false);

      jest.mock('../../../source/lib/Staticman', () => {
        return jest.fn((parameters) => ({
          init: () => Promise.resolve(),
          getSiteConfig: () => Promise.resolve(mockSiteConfig),
        }));
      });

      const { checkRecaptcha } = require('../../../source/controllers/process');
      const Staticman = require('../../../source/lib/Staticman');
      const staticman = new Staticman(req.params);
      await staticman.init();

      expect.assertions(1);

      const response = await checkRecaptcha(staticman, req);
      expect(response).toBe(false);
    });

    test('throws an error if reCaptcha block is not in the request body', async () => {
      jest.mock('../../../source/lib/Staticman', () => {
        return jest.fn((parameters) => ({
          init: () => Promise.resolve(),
          getSiteConfig: () => Promise.resolve(mockSiteConfig),
        }));
      });

      const { checkRecaptcha } = require('../../../source/controllers/process');
      const Staticman = require('../../../source/lib/Staticman');
      const staticman = new Staticman(req.params);
      await staticman.init();

      mockSiteConfig.set('reCaptcha.enabled', true);

      req.body = {
        options: {},
      };

      expect.assertions(1);

      try {
        await checkRecaptcha(staticman, req);
      } catch (err) {
        expect(err._smErrorCode).toBe('RECAPTCHA_MISSING_CREDENTIALS');
      }
    });

    test('throws an error if reCaptcha site key is not in the request body', async () => {
      jest.mock('../../../source/lib/Staticman', () => {
        return jest.fn((parameters) => ({
          init: () => Promise.resolve(),
          getSiteConfig: () => Promise.resolve(mockSiteConfig),
        }));
      });

      const { checkRecaptcha } = require('../../../source/controllers/process');
      const Staticman = require('../../../source/lib/Staticman');
      const staticman = new Staticman(req.params);
      await staticman.init();

      req.body = {
        options: {
          reCaptcha: {
            secret: '1q2w3e4r',
          },
        },
      };

      expect.assertions(1);

      try {
        await checkRecaptcha(staticman, req);
      } catch (err) {
        expect(err._smErrorCode).toBe('RECAPTCHA_MISSING_CREDENTIALS');
      }
    });

    test('throws an error if reCaptcha secret is not in the request body', async () => {
      jest.mock('../../../source/lib/Staticman', () => {
        return jest.fn((parameters) => ({
          init: () => Promise.resolve(),
          getSiteConfig: () => Promise.resolve(mockSiteConfig),
        }));
      });

      const { checkRecaptcha } = require('../../../source/controllers/process');
      const Staticman = require('../../../source/lib/Staticman');
      const staticman = new Staticman(req.params);
      await staticman.init();

      req.body = {
        options: {
          reCaptcha: {
            siteKey: '123456789',
          },
        },
      };

      expect.assertions(1);

      try {
        await checkRecaptcha(staticman, req);
      } catch (err) {
        expect(err._smErrorCode).toBe('RECAPTCHA_MISSING_CREDENTIALS');
      }
    });

    test('throws an error if the reCatpcha secret fails to decrypt', async () => {
      jest.mock('../../../source/lib/Staticman', () => {
        return jest.fn((parameters) => ({
          init: () => Promise.resolve(),
          decrypt: () => {
            throw Error('someError');
          },
          getSiteConfig: () => Promise.resolve(mockSiteConfig),
        }));
      });

      const { checkRecaptcha } = require('../../../source/controllers/process');
      const Staticman = require('../../../source/lib/Staticman');
      const staticman = new Staticman(req.params);
      await staticman.init();

      req.body = {
        options: {
          reCaptcha: {
            siteKey: '123456789',
            secret: '1q2w3e4r',
          },
        },
      };

      expect.assertions(1);

      try {
        await checkRecaptcha(staticman, req);
      } catch (err) {
        expect(err._smErrorCode).toBe('RECAPTCHA_CONFIG_MISMATCH');
      }
    });

    test('throws an error if the reCatpcha siteKey provided does not match the one in config', async () => {
      jest.mock('../../../source/lib/Staticman', () => {
        return jest.fn((parameters) => ({
          init: () => Promise.resolve(),
          getSiteConfig: () => Promise.resolve(mockSiteConfig),
        }));
      });

      const { checkRecaptcha } = require('../../../source/controllers/process');
      const Staticman = require('../../../source/lib/Staticman');
      const staticman = new Staticman(req.params);
      await staticman.init();

      req.body = {
        options: {
          reCaptcha: {
            siteKey: '987654321',
            secret: mockSiteConfig.getRaw('reCaptcha.secret'),
          },
        },
      };

      expect.assertions(1);

      try {
        await checkRecaptcha(staticman, req);
      } catch (err) {
        expect(err._smErrorCode).toBe('RECAPTCHA_CONFIG_MISMATCH');
      }
    });

    test('throws an error if the reCatpcha secret provided does not match the one in config', async () => {
      jest.mock('../../../source/lib/Staticman', () => {
        return jest.fn((parameters) => ({
          init: () => Promise.resolve(),
          getSiteConfig: () => Promise.resolve(mockSiteConfig),
        }));
      });

      const { checkRecaptcha } = require('../../../source/controllers/process');
      const Staticman = require('../../../source/lib/Staticman');
      const staticman = new Staticman(req.params);
      await staticman.init();

      req.body = {
        options: {
          reCaptcha: {
            siteKey: mockSiteConfig.get('reCaptcha.siteKey'),
            secret: mockHelpers.encrypt('some other secret'),
          },
        },
      };

      expect.assertions(1);

      try {
        await checkRecaptcha(staticman, req);
      } catch (err) {
        expect(err._smErrorCode).toBe('RECAPTCHA_CONFIG_MISMATCH');
      }
    });

    test('initialises and triggers a verification from the reCaptcha module', async () => {
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
          init: () => Promise.resolve(),
          decrypt: mockHelpers.decrypt,
          getSiteConfig: () => Promise.resolve(mockSiteConfig),
        }));
      });

      const { checkRecaptcha } = require('../../../source/controllers/process');
      const Staticman = require('../../../source/lib/Staticman');
      const staticman = new Staticman(req.params);
      await staticman.init();

      req.body = {
        options: {
          reCaptcha: {
            siteKey: mockSiteConfig.get('reCaptcha.siteKey'),
            secret: mockSiteConfig.getRaw('reCaptcha.secret'),
          },
        },
      };

      expect.assertions(5);

      const response = await checkRecaptcha(staticman, req);
      expect(response).toBe(true);
      expect(mockInitFn.mock.calls).toHaveLength(1);
      expect(mockInitFn.mock.calls[0][0]).toBe(mockSiteConfig.get('reCaptcha.siteKey'));
      expect(mockInitFn.mock.calls[0][1]).toBe(mockSiteConfig.get('reCaptcha.secret'));
      expect(mockVerifyFn.mock.calls[0][0]).toBe(req);
    });

    test('displays an error if the reCaptcha verification fails', async () => {
      const reCaptchaError = new Error('someError');
      const mockInitFn = jest.fn();
      // const mockVerifyFn = jest.fn((verifyReq, reCaptchaCallback) => {
      //   reCaptchaCallback(reCaptchaError);
      // });
      const mockVerifyFn = jest.fn().mockImplementation(() => {
        throw reCaptchaError;
      });

      jest.mock('express-recaptcha', () => {
        return {
          init: mockInitFn,
          verify: mockVerifyFn,
        };
      });

      jest.mock('../../../source/lib/Staticman', () => {
        return jest.fn((parameters) => ({
          init: () => Promise.resolve(),
          decrypt: mockHelpers.decrypt,
          getSiteConfig: () => Promise.resolve(mockSiteConfig),
        }));
      });

      const { checkRecaptcha } = require('../../../source/controllers/process');
      const Staticman = require('../../../source/lib/Staticman');
      const staticman = new Staticman(req.params);
      await staticman.init();

      req.body = {
        options: {
          reCaptcha: {
            siteKey: mockSiteConfig.get('reCaptcha.siteKey'),
            secret: mockSiteConfig.getRaw('reCaptcha.secret'),
          },
        },
      };

      expect.assertions(1);

      try {
        await checkRecaptcha(staticman, req);
      } catch (err) {
        expect(err).toEqual(reCaptchaError);
      }
    });
  });

  describe('createConfigObject', () => {
    const { createConfigObject } = require('../../../source/controllers/process');

    test('creates a config object for version 1 of API', () => {
      const configv1 = {
        file: '_config.yml',
        path: 'staticman',
      };

      const config1 = createConfigObject('1');
      const config2 = createConfigObject('1', 'someProperty');

      expect(config1).toEqual(configv1);
      expect(config2).toEqual(configv1);
    });

    test('creates a config object for version 2+ of API', () => {
      const configv2File = 'staticman.yml';

      const config3 = createConfigObject('2');
      const config4 = createConfigObject('2', 'someProperty');
      const config5 = createConfigObject();

      expect(config3).toEqual({
        file: configv2File,
        path: '',
      });
      expect(config4).toEqual({
        file: configv2File,
        path: 'someProperty',
      });
      expect(config5).toEqual({
        file: configv2File,
        path: '',
      });
    });
  });

  describe('process', () => {
    const processFn = require('../../../source/controllers/process').processEntry;

    test('send a redirect to the URL provided, if the `redirect` option is provided, if `processEntry` succeeds', async () => {
      const redirectUrl = 'https://eduardoboucas.com';
      const mockProcessEntry = jest.fn((fields, options) =>
        Promise.resolve({
          fields: ['name', 'email'],
          redirect: redirectUrl,
        })
      );

      jest.mock('../../../source/lib/Staticman', () => {
        return jest.fn((parameters) => ({
          init: () => Promise.resolve(),
          processEntry: mockProcessEntry,
        }));
      });

      const res = mockHelpers.getMockResponse();

      const Staticman = require('../../../source/lib/Staticman');
      const staticman = new Staticman(req.params);
      await staticman.init();

      req.body = {
        fields: {
          name: 'Eduardo Boucas',
          email: 'mail@eduardoboucas.com',
        },
        options: {
          reCaptcha: {
            siteKey: mockSiteConfig.get('reCaptcha.siteKey'),
            secret: mockSiteConfig.getRaw('reCaptcha.secret'),
          },
          redirect: redirectUrl,
        },
      };
      req.query = {};

      expect.assertions(2);

      await processFn(staticman, req, res);

      expect(res.redirect.mock.calls).toHaveLength(1);
      expect(res.redirect.mock.calls[0][0]).toBe(redirectUrl);
    });

    test('deliver an object with the processed fields if `processEntry` succeeds', async () => {
      const fields = {
        name: 'Eduardo Boucas',
        email: 'mail@eduardoboucas.com',
      };
      const mockProcessEntry = jest.fn((mockFields, options) =>
        Promise.resolve({
          fields,
        })
      );

      jest.mock('../../../source/lib/Staticman', () => {
        return jest.fn((parameters) => ({
          init: () => Promise.resolve(),
          processEntry: mockProcessEntry,
        }));
      });

      const res = mockHelpers.getMockResponse();

      const Staticman = require('../../../source/lib/Staticman');
      const staticman = new Staticman(req.params);
      await staticman.init();

      req.body = {
        fields,
        options: {
          reCaptcha: {
            siteKey: mockSiteConfig.get('reCaptcha.siteKey'),
            secret: mockSiteConfig.getRaw('reCaptcha.secret'),
          },
        },
      };
      req.query = {};

      expect.assertions(2);

      await processFn(staticman, req, res);

      expect(res.send.mock.calls).toHaveLength(1);
      expect(res.send.mock.calls[0][0]).toEqual({
        fields,
        success: true,
      });
    });

    test('reject if `processEntry` fails', async () => {
      const processEntryError = new Error('someError');
      const mockProcessEntry = jest.fn((fields, options) => {
        return Promise.reject(processEntryError);
      });

      jest.mock('../../../source/lib/Staticman', () => {
        return jest.fn((parameters) => ({
          init: () => Promise.resolve(),
          processEntry: mockProcessEntry,
        }));
      });

      const res = mockHelpers.getMockResponse();

      const Staticman = require('../../../source/lib/Staticman');
      const staticman = new Staticman(req.params);
      await staticman.init();

      req.body = {
        fields: {
          name: 'Eduardo Boucas',
          email: 'mail@eduardoboucas.com',
        },
        options: {
          reCaptcha: {
            siteKey: mockSiteConfig.get('reCaptcha.siteKey'),
            secret: mockSiteConfig.getRaw('reCaptcha.secret'),
          },
        },
      };
      req.query = {};

      expect.assertions(1);

      try {
        await processFn(staticman, req, res);
      } catch (err) {
        expect(err).toEqual(processEntryError);
      }
    });
  });

  describe('sendResponse', () => {
    const { sendResponse } = require('../../../source/controllers/process');

    test('redirects if there is a `redirect` option and no errors', () => {
      const data = {
        redirect: 'https://eduardoboucas.com',
      };

      const res = mockHelpers.getMockResponse();

      sendResponse(res, data);

      expect(res.redirect.mock.calls).toHaveLength(1);
      expect(res.redirect.mock.calls[0][0]).toBe(data.redirect);
    });

    test('redirects if there is a `redirectError` option there is an error', () => {
      const data = {
        err: 'someError',
        redirect: 'https://eduardoboucas.com',
        redirectError: 'https://eduardoboucas.com/error',
      };

      const res = mockHelpers.getMockResponse();

      sendResponse(res, data);

      expect(res.redirect.mock.calls).toHaveLength(1);
      expect(res.redirect.mock.calls[0][0]).toBe(data.redirectError);
    });

    test('sends a 200 with a fields object if there are no errors', () => {
      const data = {
        fields: {
          name: 'Eduardo Bouças',
          email: 'mail@eduardoboucas.com',
        },
      };

      const res = mockHelpers.getMockResponse();

      sendResponse(res, data);

      expect(res.send.mock.calls).toHaveLength(1);
      expect(res.send.mock.calls[0][0]).toEqual({
        success: true,
        fields: data.fields,
      });
      expect(res.status.mock.calls).toHaveLength(1);
      expect(res.status.mock.calls[0][0]).toBe(200);
    });

    test('sends a 500 with an error object if there is an error', () => {
      const data = {
        err: {
          _smErrorCode: 'missing-input-secret',
        },
        redirect: 'https://eduardoboucas.com',
      };

      const res = mockHelpers.getMockResponse();

      sendResponse(res, data);

      expect(res.send.mock.calls).toHaveLength(1);
      expect(res.send.mock.calls[0][0].success).toBe(false);
      expect(res.send.mock.calls[0][0].message).toBe(
        errorHandler.getMessage(data.err._smErrorCode)
      );
      expect(res.send.mock.calls[0][0].errorCode).toBe(
        errorHandler.getErrorCode(data.err._smErrorCode)
      );
      expect(res.status.mock.calls).toHaveLength(1);
      expect(res.status.mock.calls[0][0]).toBe(500);
    });
  });
});
