import { getErrorHandlerInstance, Staticman } from '@staticman/core';
import * as mockHelpers from '../../helpers';

const errorHandler = getErrorHandlerInstance();

let mockSiteConfig;
let req;

beforeEach(() => {
  jest.resetModules();

  mockSiteConfig = mockHelpers.getConfig();

  req = mockHelpers.getMockRequest();
});

describe('Process controller', () => {
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

      const res = mockHelpers.getMockResponse();
      const { processEntry } = Staticman.prototype;
      const staticman = new Staticman(req.params);

      staticman.processEntry = mockProcessEntry;

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

      await processFn(staticman, req, res);

      staticman.processEntry = processEntry;

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
      const { processEntry } = Staticman.prototype;
      const res = mockHelpers.getMockResponse();
      const staticman = new Staticman(req.params);

      staticman.processEntry = mockProcessEntry;

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

      await processFn(staticman, req, res);

      staticman.processEntry = processEntry;

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
      const { processEntry } = Staticman.prototype;
      const res = mockHelpers.getMockResponse();
      const staticman = new Staticman(req.params);

      staticman.processEntry = mockProcessEntry;

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

      try {
        await processFn(staticman, req, res);
      } catch (err) {
        expect(err).toEqual(processEntryError);
      }

      staticman.processEntry = processEntry;
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
