import nock from 'nock';

import auth from '../../../source/controllers/auth';
import * as helpers from '../../helpers';
import Staticman from '../../../source/lib/Staticman';
import User from '../../../source/lib/models/User';

Staticman.prototype.getSiteConfig = function getMockSiteConfig() {
  return Promise.resolve(helpers.getConfig());
};

let req;
let res;

beforeEach(() => {
  req = helpers.getMockRequest();
  res = helpers.getMockResponse();
});

describe('Auth controller', () => {
  describe('GitHub', () => {
    test('authenticates to GitHub with the given code and returns the authenticated user', async () => {
      const mockAccessToken = 'qwertyuiop';
      const mockCode = '1q2w3e4r';
      const mockUser = {
        login: 'johndoe',
        name: 'John Doe',
        email: 'johndoe@test.com',
      };

      const siteConfig = helpers.getConfig();

      nock(/github\.com/)
        .post('/login/oauth/access_token')
        .query({
          client_id: siteConfig.get('githubAuth.clientId'),
          client_secret: siteConfig.get('githubAuth.clientSecret'),
          code: mockCode,
          redirect_uri: siteConfig.get('githubAuth.redirectUri'),
        })
        .reply(200, {
          access_token: mockAccessToken,
        });

      nock(/github\.com/, {
        reqheaders: {
          authorization: `token ${mockAccessToken}`,
        },
      })
        .get('/user')
        .reply(200, mockUser);

      const reqWithQuery = {
        ...req,
        query: {
          code: mockCode,
        },
      };

      expect.assertions(3);

      await auth(reqWithQuery, res);
      expect(res.send).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith({
        accessToken: expect.any(String),
        user: new User('github', mockUser.login, mockUser.email, mockUser.name),
      });
      expect(helpers.decrypt(res.send.mock.calls[0][0].accessToken)).toBe(mockAccessToken);
    });

    test('authenticates to GitHub with the given code and returns the original GitHub user when using v2 API', async () => {
      const mockAccessToken = 'qwertyuiop';
      const mockCode = '1q2w3e4r';
      const mockUser = {
        login: 'johndoe',
      };

      const siteConfig = helpers.getConfig();

      nock(/github\.com/)
        .post('/login/oauth/access_token')
        .query({
          client_id: siteConfig.get('githubAuth.clientId'),
          client_secret: siteConfig.get('githubAuth.clientSecret'),
          code: mockCode,
          redirect_uri: siteConfig.get('githubAuth.redirectUri'),
        })
        .reply(200, {
          access_token: mockAccessToken,
        });

      nock(/github\.com/, {
        reqheaders: {
          authorization: `token ${mockAccessToken}`,
        },
      })
        .get('/user')
        .reply(200, mockUser);

      const reqWithQuery = {
        ...req,
        params: {
          service: 'github',
          version: '2',
        },
        query: {
          code: mockCode,
        },
      };

      expect.assertions(3);

      await auth(reqWithQuery, res);
      expect(res.send).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith({
        accessToken: expect.any(String),
        user: mockUser,
      });
      expect(helpers.decrypt(res.send.mock.calls[0][0].accessToken)).toBe(mockAccessToken);
    });

    test('returns a 401 response when unable to get an access token from GitHub', async () => {
      const mockCode = '1q2w3e4r';
      const siteConfig = helpers.getConfig();

      nock(/github\.com/)
        .post('/login/oauth/access_token')
        .query({
          client_id: siteConfig.get('githubAuth.clientId'),
          client_secret: siteConfig.get('githubAuth.clientSecret'),
          code: mockCode,
          redirect_uri: siteConfig.get('githubAuth.redirectUri'),
        })
        .reply(401, {
          error: 'invalid_code',
        });

      const reqWithQuery = {
        ...req,
        params: {
          service: 'github',
          version: '2',
        },
        query: {
          code: mockCode,
        },
      };

      expect.assertions(2);

      await auth(reqWithQuery, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        statusCode: 401,
        message: expect.stringContaining('invalid_code'),
      });
    });

    test('returns a 401 response when an incorrect access token is used for the GitHub API', async () => {
      const mockAccessToken = 'qwertyuiop';
      const mockCode = '1q2w3e4r';

      const siteConfig = helpers.getConfig();

      nock(/github\.com/)
        .post('/login/oauth/access_token')
        .query({
          client_id: siteConfig.get('githubAuth.clientId'),
          client_secret: siteConfig.get('githubAuth.clientSecret'),
          code: mockCode,
          redirect_uri: siteConfig.get('githubAuth.redirectUri'),
        })
        .reply(200, {
          access_token: mockAccessToken,
        });

      nock(/github\.com/, {
        reqheaders: {
          authorization: `token ${mockAccessToken}`,
        },
      })
        .get('/user')
        .reply(401, {
          message: 'Unauthorized',
        });

      const reqWithQuery = {
        ...req,
        params: {
          service: 'github',
          version: '2',
        },
        query: {
          code: mockCode,
        },
      };

      expect.assertions(2);

      await auth(reqWithQuery, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        statusCode: 401,
        message: 'Unauthorized',
      });
    });
  });

  describe('GitLab', () => {
    test('authenticates to GitLab with the given code and returns the authenticated user', async () => {
      const mockAccessToken = 'qwertyuiop';
      const mockCode = '1q2w3e4r';
      const mockUser = {
        username: 'johndoe',
        name: 'John Doe',
        email: 'johndoe@test.com',
      };

      const siteConfig = helpers.getConfig();

      nock(/gitlab\.com/)
        .post('/oauth/token')
        .query({
          client_id: siteConfig.get('gitlabAuth.clientId'),
          client_secret: siteConfig.get('gitlabAuth.clientSecret'),
          code: mockCode,
          grant_type: 'authorization_code',
          redirect_uri: siteConfig.get('gitlabAuth.redirectUri'),
        })
        .reply(200, {
          access_token: mockAccessToken,
        });

      nock(/gitlab\.com/, {
        reqheaders: {
          authorization: `Bearer ${mockAccessToken}`,
        },
      })
        .get('/api/v4/https://gitlab.com/user')
        .reply(200, mockUser);

      const reqWithQuery = {
        ...req,
        params: {
          service: 'gitlab',
        },
        query: {
          code: mockCode,
        },
      };

      expect.assertions(3);

      await auth(reqWithQuery, res);
      expect(res.send).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith({
        accessToken: expect.any(String),
        user: new User('gitlab', mockUser.username, mockUser.email, mockUser.name),
      });
      expect(helpers.decrypt(res.send.mock.calls[0][0].accessToken)).toBe(mockAccessToken);
    });

    test('returns a 401 response when unable to get an access token from GitLab', async () => {
      const mockCode = '1q2w3e4r';
      const siteConfig = helpers.getConfig();

      nock(/gitlab\.com/)
        .post('/oauth/token')
        .query({
          client_id: siteConfig.get('gitlabAuth.clientId'),
          client_secret: siteConfig.get('gitlabAuth.clientSecret'),
          code: mockCode,
          grant_type: 'authorization_code',
          redirect_uri: siteConfig.get('gitlabAuth.redirectUri'),
        })
        .reply(401, {
          error: 'invalid_code',
        });

      const reqWithQuery = {
        ...req,
        params: {
          service: 'gitlab',
        },
        query: {
          code: mockCode,
        },
      };

      await auth(reqWithQuery, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        statusCode: 401,
        message: expect.stringContaining('invalid_code'),
      });
    });

    test('returns a 401 response when an incorrect access token is used for the GitLab API', async () => {
      const mockAccessToken = 'qwertyuiop';
      const mockCode = '1q2w3e4r';

      const siteConfig = helpers.getConfig();

      nock(/gitlab\.com/)
        .post('/oauth/token')
        .query({
          client_id: siteConfig.get('gitlabAuth.clientId'),
          client_secret: siteConfig.get('gitlabAuth.clientSecret'),
          code: mockCode,
          grant_type: 'authorization_code',
          redirect_uri: siteConfig.get('gitlabAuth.redirectUri'),
        })
        .reply(200, {
          access_token: mockAccessToken,
        });

      nock(/gitlab\.com/, {
        reqheaders: {
          authorization: `Bearer ${mockAccessToken}`,
        },
      })
        .get('/api/v4/https://gitlab.com/user')
        .reply(401, {
          message: '401 Unauthorized',
        });

      const reqWithQuery = {
        ...req,
        params: {
          service: 'gitlab',
        },
        query: {
          code: mockCode,
        },
      };

      await auth(reqWithQuery, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        statusCode: 401,
        message: expect.stringContaining('Unauthorized'),
      });
    });
  });
});
