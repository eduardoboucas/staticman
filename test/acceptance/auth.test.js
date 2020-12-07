import nock from 'nock';
import request from 'supertest';

import * as GitHubMocks from '../helpers/githubApiMocks';
import * as GitHubMockResponses from '../helpers/githubApiMockResponses';
import * as helpers from '../helpers';
import * as sampleData from '../helpers/sampleData';
import StaticmanAPI from '../../source/server';
import User from '../../source/lib/models/User';

const staticman = new StaticmanAPI().server;
const supportedApiVersions = [['v2'], ['v3']];

let mockQueryParams;
let mockConfigInfo;
let mockSiteConfig;
let mockAccessToken;
let mockTokenResponse;

afterAll(() => {
  nock.restore();
});

beforeEach(() => {
  mockQueryParams = {
    ...helpers.parameters,
    service: 'github',
  };
  mockSiteConfig = helpers.getConfig();
  mockConfigInfo = {
    ...mockQueryParams,
    contents: sampleData.config1,
  };
  mockAccessToken = 'qwertyuiop';
  mockTokenResponse = GitHubMockResponses.oauth(mockAccessToken);
});

afterEach(() => {
  nock.cleanAll();
});

describe.each(supportedApiVersions)('API %s - Auth endpoint', (version) => {
  beforeEach(() => {
    mockSiteConfig.version = version.charAt(1);
  });
  it('authenticates with git service using given code and returns the user', async () => {
    const mockUser = {
      login: 'johndoe',
      name: 'John Doe',
      email: 'johndoe@test.com',
    };

    const configMock = GitHubMocks.fetchConfigFile(mockConfigInfo);
    const tokenMock = GitHubMocks.fetchOauthToken(mockSiteConfig, 200, mockTokenResponse);
    const userMock = GitHubMocks.fetchUser(200, mockUser);

    expect.assertions(5);

    await request(staticman)
      .get(
        `/${version}/auth/${mockQueryParams.service}/${mockQueryParams.username}/${mockQueryParams.repository}/${mockQueryParams.branch}/${mockQueryParams.property}`
      )
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
    const configMock = GitHubMocks.fetchConfigFile(mockConfigInfo);
    const tokenMock = GitHubMocks.fetchOauthToken(mockSiteConfig, 401);

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
    const configMock = GitHubMocks.fetchConfigFile(mockConfigInfo);
    const tokenMock = GitHubMocks.fetchOauthToken(mockSiteConfig, 200, mockTokenResponse);
    const userMock = GitHubMocks.fetchUser(401);

    expect.assertions(3);

    await request(staticman)
      .get(
        `/${version}/auth/${mockQueryParams.service}/${mockQueryParams.username}/${mockQueryParams.repository}/${mockQueryParams.branch}/${mockQueryParams.property}`
      )
      .query({ code: '123' })
      .expect(401);
    expect(configMock.isDone()).toBe(true);
    expect(tokenMock.isDone()).toBe(true);
    expect(userMock.isDone()).toBe(true);
  });
});
