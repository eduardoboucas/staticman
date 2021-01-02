import nock from 'nock';

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
        expect(err._smErrorCode).toBe('RECAPTCHA_INVALID_INPUT_RESPONSE');
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
        expect(err._smErrorCode).toBe('RECAPTCHA_INVALID_INPUT_RESPONSE');
      });
    });

    test('initialises and triggers a verification from the reCaptcha module', () => {
      const scope = nock(/www\.google\.com/)
        .post('/recaptcha/api/siteverify')
        .reply(200, { success: true });

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
        expect(scope.isDone()).toBe(true);
      });
    });

    test('displays an error if the reCaptcha verification fails', () => {
      const scope = nock(/www\.google\.com/)
        .post('/recaptcha/api/siteverify')
        .reply(200, { success: false, 'error-codes': ['invalid-input-response'] });

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
        expect(scope.isDone()).toBe(true);
        expect(err).toEqual({
          _smErrorCode: 'RECAPTCHA_INVALID_INPUT_RESPONSE',
        });
      });
    });
  });
});
