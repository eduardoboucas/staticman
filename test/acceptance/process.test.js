import nock from 'nock';
import request from 'supertest';

import { encrypt, parameters } from '../helpers';
import * as GitHubMocks from '../helpers/githubApiMocks';
import * as sampleData from '../helpers/sampleData';
import StaticmanAPI from '../../source/server';

const staticman = new StaticmanAPI().server;
const supportedApiVersions = [['v1'], ['v2'], ['v3']];

let mockParameters;
let baseEntryBody;

beforeEach(() => {
  mockParameters = parameters;
  baseEntryBody = {
    fields: {
      name: 'Eduardo Boucas',
    },
    options: {
      reCaptcha: {
        siteKey: 'someSiteKey',
        secret: 'someSecret',
      },
    },
  };
});

afterEach(() => {
  nock.cleanAll();
});

describe.each(supportedApiVersions)('API %s - Entry endpoints', (version) => {
  it('returns a RECAPTCHA_CONFIG_MISMATCH error if reCaptcha options contain the wrong site key', async () => {
    const reCaptchaSecret = encrypt('Some little secret');
    baseEntryBody.options.reCaptcha.secret = reCaptchaSecret;
    const mockConfig = sampleData.config1.replace('@reCaptchaSecret@', reCaptchaSecret);

    const mockConfigInfo = {
      ...mockParameters,
      contents: mockConfig,
      version: version.charAt(1),
    };

    const configMock = GitHubMocks.fetchConfigFile(mockConfigInfo);

    expect.assertions(2);

    await request(staticman)
      .post(_constructEntryEndpoint(version))
      .send(baseEntryBody)
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .expect(500)
      .expect('Content-Type', 'application/json; charset=utf-8')
      .expect((response) => {
        expect(JSON.parse(response.text)).toMatchObject({
          success: false,
          errorCode: 'RECAPTCHA_CONFIG_MISMATCH',
          message: 'reCAPTCHA options do not match Staticman config',
        });
      });

    expect(configMock.isDone()).toBe(true);
  });

  it('returns a RECAPTCHA_CONFIG_MISMATCH error if reCaptcha secret does not match', async () => {
    const reCaptchaSecret = 'Some little secret';
    const mockConfig = sampleData.config1.replace('@reCaptchaSecret@', encrypt(reCaptchaSecret));

    const mockConfigInfo = {
      ...mockParameters,
      contents: mockConfig,
      version: version.charAt(1),
    };

    const configMock = GitHubMocks.fetchConfigFile(mockConfigInfo);

    expect.assertions(2);

    await request(staticman)
      .post(_constructEntryEndpoint(version))
      .send(baseEntryBody)
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .expect(500)
      .expect('Content-Type', 'application/json; charset=utf-8')
      .expect((response) => {
        expect(JSON.parse(response.text)).toMatchObject({
          success: false,
          errorCode: 'RECAPTCHA_CONFIG_MISMATCH',
          message: 'reCAPTCHA options do not match Staticman config',
        });
      });

    expect(configMock.isDone()).toBe(true);
  });

  it('outputs a PARSING_ERROR error if the site config is malformed', async () => {
    const mockConfigInfo = {
      ...mockParameters,
      contents: sampleData.config3,
      version: version.charAt(1),
    };

    delete baseEntryBody.options;

    const configMock = GitHubMocks.fetchConfigFile(mockConfigInfo);

    expect.assertions(3);

    await request(staticman)
      .post(_constructEntryEndpoint(version))
      .send(baseEntryBody)
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .expect(500)
      .expect('Content-Type', 'application/json; charset=utf-8')
      .expect((response) => {
        const error = JSON.parse(response.text);
        expect(error).toHaveProperty('rawError');
        expect(error).toMatchObject({
          success: false,
          errorCode: 'PARSING_ERROR',
          message: 'Error whilst parsing config file',
        });
      });

    expect(configMock.isDone()).toBe(true);
  });
});

function _constructEntryEndpoint(version, service) {
  const gitService = service ?? 'github';
  switch (version) {
    case 'v1':
      return `/${version}/entry/${mockParameters.username}/${mockParameters.repository}/${mockParameters.branch}`;

    case 'v2':
      return `/${version}/entry/${mockParameters.username}/${mockParameters.repository}/${mockParameters.branch}/${mockParameters.property}`;

    case 'v3':
    default:
      return `/${version}/entry/${gitService}/${mockParameters.username}/${mockParameters.repository}/${mockParameters.branch}/${mockParameters.property}`;
  }
}
