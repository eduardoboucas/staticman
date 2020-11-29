import nock from 'nock';
import request from 'supertest';

import * as helpers from '../helpers';
import * as GitHubMocks from '../helpers/githubApiMocks';
import * as sampleData from '../helpers/sampleData';
import StaticmanAPI from '../../source/server';

const staticman = new StaticmanAPI().server;
const supportedApiVersions = [['v1'], ['v2'], ['v3']];

afterEach(() => {
  nock.cleanAll();
});

const repoData = {
  ...helpers.getParameters(),
  path: 'staticman.yml',
};

describe.each(supportedApiVersions)('API %s - Entry endpoints', (version) => {
  it('returns a RECAPTCHA_CONFIG_MISMATCH error if reCaptcha options contain the wrong site key', async () => {
    const reCaptchaSecret = helpers.encrypt('Some little secret');
    const mockConfig = sampleData.config1.replace('@reCaptchaSecret@', reCaptchaSecret);

    const mockConfigInfo = {
      contents: mockConfig,
      version,
      username: repoData.username,
      repository: repoData.repository,
      branch: repoData.branch,
    };

    const configMock = GitHubMocks.fetchConfigFile(mockConfigInfo);

    expect.assertions(2);

    await request(staticman)
      .post(_constructEntryEndpoint(version))
      .send({
        fields: {
          name: 'Eduardo Boucas',
        },
        options: {
          reCaptcha: {
            siteKey: 'wrongSiteKey',
            secret: reCaptchaSecret,
          },
        },
      })
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
    const mockConfig = sampleData.config1.replace(
      '@reCaptchaSecret@',
      helpers.encrypt(reCaptchaSecret)
    );

    const mockConfigInfo = {
      contents: mockConfig,
      version,
      username: repoData.username,
      repository: repoData.repository,
      branch: repoData.branch,
    };

    const configMock = GitHubMocks.fetchConfigFile(mockConfigInfo);

    expect.assertions(2);

    await request(staticman)
      .post(_constructEntryEndpoint(version))
      .send({
        fields: {
          name: 'Eduardo Boucas',
        },
        options: {
          reCaptcha: {
            siteKey: '123456789',
            secret: 'foo',
          },
        },
      })
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
      contents: sampleData.config3,
      version,
      username: repoData.username,
      repository: repoData.repository,
      branch: repoData.branch,
    };

    const configMock = GitHubMocks.fetchConfigFile(mockConfigInfo);

    expect.assertions(3);

    await request(staticman)
      .post(_constructEntryEndpoint(version))
      .send({
        fields: {
          name: 'Eduardo Boucas',
        },
      })
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
      return `/${version}/entry/${repoData.username}/${repoData.repository}/${repoData.branch}`;

    case 'v2':
      return `/${version}/entry/${repoData.username}/${repoData.repository}/${repoData.branch}/${repoData.property}`;

    case 'v3':
    default:
      return `/${version}/entry/${gitService}/${repoData.username}/${repoData.repository}/${repoData.branch}/${repoData.property}`;
  }
}
