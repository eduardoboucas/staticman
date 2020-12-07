import nock from 'nock';
import request from 'supertest';

import * as GitHubMocks from '../helpers/githubApiMocks';
import * as helpers from '../helpers';
import * as sampleData from '../helpers/sampleData';
import StaticmanAPI from '../../source/server';
import User from '../../source/lib/models/User';

const staticman = new StaticmanAPI().server;
const supportedApiVersions = [['v2']];
// const supportedApiVersions = [['v2'], ['v3']];

let mockQueryParams;

afterAll(() => {
  nock.restore();
});

beforeEach(() => {
  mockQueryParams = {
    service: 'github',
    username: 'johndoe',
    repository: 'foobar',
    branch: 'master',
    property: 'comments',
  };
});

afterEach(() => {
  nock.cleanAll();
});

describe.each(supportedApiVersions)('API %s - Auth endpoint', (version) => {
  it('authenticates with git service using given code and returns the user', async () => {
    const mockConfigInfo = {
      contents: sampleData.config1,
      version: version.charAt(1),
      username: mockQueryParams.username,
      repository: mockQueryParams.repository,
      branch: mockQueryParams.branch,
    };
    const mockAccessToken = 'qwertyuiop';
    const mockUser = {
      login: 'johndoe',
      name: 'John Doe',
      email: 'johndoe@test.com',
    };

    const siteConfig = helpers.getConfig();

    const configMock = GitHubMocks.fetchConfigFile(mockConfigInfo);
    const tokenMock = nock(/github\.com/)
      .post('/login/oauth/access_token', {
        client_id: siteConfig.get('githubAuth.clientId'),
        client_secret: siteConfig.get('githubAuth.clientSecret'),
        code: '123',
        redirect_uri: siteConfig.get('githubAuth.redirectUri'),
      })
      .reply(200, {
        access_token: mockAccessToken,
        scope: 'repos',
        token_type: 'bearer',
      });

    const userMock = nock(/api\.github\.com/, {
      reqheaders: {
        authorization: `token ${mockAccessToken}`,
      },
    })
      .get('/user')
      .reply(200, mockUser);

    expect.assertions(5);

    const endpoint = `/${version}/auth/${mockQueryParams.service}/${mockQueryParams.username}/${mockQueryParams.repository}/${mockQueryParams.branch}/${mockQueryParams.property}`;
    await request(staticman)
      .get(endpoint)
      .query({ code: '123' })
      .expect(200)
      .expect((response) => {
        const body = JSON.parse(response.text);
        expect(body).toMatchObject({
          accessToken: expect.any(String),
          user: new User('github', mockUser.login, mockUser.email, mockUser.name),
        });
        expect(helpers.decrypt(body.accessToken)).toBe(mockAccessToken);
      });

    expect(configMock.isDone()).toBe(true);
    expect(tokenMock.isDone()).toBe(true);
    expect(userMock.isDone()).toBe(true);
  });

  it('returns a 401 when unable to get an access token from git service', async () => {
    const mockConfigInfo = {
      contents: sampleData.config1,
      version: version.charAt(1),
      username: mockQueryParams.username,
      repository: mockQueryParams.repository,
      branch: mockQueryParams.branch,
    };

    const siteConfig = helpers.getConfig();

    const configMock = GitHubMocks.fetchConfigFile(mockConfigInfo);
    const tokenMock = nock(/github\.com/)
      .post('/login/oauth/access_token', {
        client_id: siteConfig.get('githubAuth.clientId'),
        client_secret: siteConfig.get('githubAuth.clientSecret'),
        code: '123',
        redirect_uri: siteConfig.get('githubAuth.redirectUri'),
      })
      .reply(401);

    expect.assertions(2);

    await request(staticman)
      .get(
        `/${version}/auth/${mockQueryParams.service}/${mockQueryParams.username}/${mockQueryParams.repository}/${mockQueryParams.branch}/${mockQueryParams.property}`
      )
      .query({ code: '123' })
      .expect(401);

    expect(configMock.isDone()).toBe(true);
    expect(tokenMock.isDone()).toBe(true);
  });

  it('returns a 401 response when an incorrect access token is used', async () => {
    const mockConfigInfo = {
      contents: sampleData.config1,
      version: version.charAt(1),
      username: mockQueryParams.username,
      repository: mockQueryParams.repository,
      branch: mockQueryParams.branch,
    };
    const mockAccessToken = 'qwertyuiop';

    const siteConfig = helpers.getConfig();

    const configMock = GitHubMocks.fetchConfigFile(mockConfigInfo);
    const tokenMock = nock(/github\.com/)
      .post('/login/oauth/access_token', {
        client_id: siteConfig.get('githubAuth.clientId'),
        client_secret: siteConfig.get('githubAuth.clientSecret'),
        code: '123',
        redirect_uri: siteConfig.get('githubAuth.redirectUri'),
      })
      .reply(200, {
        access_token: mockAccessToken,
        scope: 'repos',
        token_type: 'bearer',
      });

    const userMock = nock(/api\.github\.com/, {
      reqheaders: {
        authorization: `token ${mockAccessToken}`,
      },
    })
      .get('/user')
      .reply(401);

    expect.assertions(3);

    const endpoint = `/${version}/auth/${mockQueryParams.service}/${mockQueryParams.username}/${mockQueryParams.repository}/${mockQueryParams.branch}/${mockQueryParams.property}`;

    await request(staticman).get(endpoint).query({ code: '123' }).expect(401);

    expect(configMock.isDone()).toBe(true);
    expect(tokenMock.isDone()).toBe(true);
    expect(userMock.isDone()).toBe(true);
  });
});
