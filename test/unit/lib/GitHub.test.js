import yaml from 'js-yaml';
import nock from 'nock';

import config from '../../../source/config';
import GitHub from '../../../source/lib/GitHub';
import * as mockHelpers from '../../helpers';
import * as sampleData from '../../helpers/sampleData';
import User from '../../../source/lib/models/User';

let req;

beforeEach(() => {
  jest.resetModules();
  jest.restoreAllMocks();

  req = mockHelpers.getMockRequest();
});

describe('GitHub interface', () => {
  test('initialises the GitHub API wrapper', async () => {
    const githubInstance = new GitHub(req.params);
    await githubInstance.init();
    expect(githubInstance.api).toBeDefined();
  });

  test('authenticates with the GitHub API using a personal access token', async () => {
    const scope = nock(/api\.github\.com/, {
      reqheaders: {
        authorization: 'token '.concat('1q2w3e4r'),
      },
    })
      .get('/user/repository_invitations')
      .reply(200);

    expect.assertions(1);

    const githubInstance = new GitHub(req.params);
    await githubInstance.init();
    await githubInstance.api.repos.listInvitationsForAuthenticatedUser();
    expect(scope.isDone()).toBe(true);
  });

  test('authenticates with the GitHub API using an OAuth token', async () => {
    const scope = nock(/api\.github\.com/, {
      reqheaders: {
        authorization: 'token '.concat('test-oauth-token'),
      },
    })
      .get('/user/repository_invitations')
      .reply(200);

    expect.assertions(1);

    const githubInstance = new GitHub({
      ...req.params,
      oauthToken: 'test-oauth-token',
    });
    await githubInstance.init();
    await githubInstance.api.repos.listInvitationsForAuthenticatedUser();
    expect(scope.isDone()).toBe(true);
  });

  test('throws error if no personal access token or OAuth token is provided', async () => {
    jest.spyOn(config, 'get').mockImplementation(() => null);

    expect.assertions(1);

    const github = new GitHub({});
    await expect(github.init()).rejects.toThrow('Require an `oauthToken` or `token` option');
  });

  describe('readFile', () => {
    test('reads a file and returns its contents', async () => {
      const filePath = 'path/to/file.yml';
      const parsedConfig = yaml.safeLoad(sampleData.config1, 'utf8');

      const scope = nock(/api\.github\.com/, {
        reqheaders: {
          authorization: 'token '.concat('1q2w3e4r'),
        },
      })
        .get('/repos/johndoe/foobar/contents/path%2Fto%2Ffile.yml?ref=master')
        .reply(200, {
          content: mockHelpers.btoa(sampleData.config1),
        });

      expect.assertions(2);

      const githubInstance = new GitHub(req.params);
      await githubInstance.init();

      const contents = await githubInstance.readFile(filePath);
      expect(contents).toEqual(parsedConfig);
      expect(scope.isDone()).toBe(true);
    });

    test('returns an error if GitHub API call errors', async () => {
      const filePath = 'path/to/file.yml';

      const scope = nock(/api\.github\.com/, {
        reqheaders: {
          authorization: 'token '.concat('1q2w3e4r'),
        },
      })
        .get('/repos/johndoe/foobar/contents/path%2Fto%2Ffile.yml?ref=master')
        .replyWithError('Error encountered oh no');

      const githubInstance = new GitHub(req.params);
      await githubInstance.init();

      expect.assertions(2);

      await expect(githubInstance.readFile(filePath)).rejects.toMatchObject({
        _smErrorCode: 'GITHUB_READING_FILE',
      });

      expect(scope.isDone()).toBe(true);
    });

    test('returns an error if the config file cannot be read', async () => {
      const filePath = 'path/to/file.yml';
      const githubInstance = new GitHub(req.params);
      await githubInstance.init();

      expect.assertions(1);

      await expect(githubInstance.readFile(filePath)).rejects.toMatchObject({
        _smErrorCode: 'GITHUB_READING_FILE',
        message: expect.anything(),
      });
    });

    test('returns an error if the config file cannot be parsed', async () => {
      const scope = nock(/api\.github\.com/, {
        reqheaders: {
          authorization: 'token '.concat('1q2w3e4r'),
        },
      })
        .get('/repos/johndoe/foobar/contents/path%2Fto%2Ffile.yml?ref=master')
        .reply(200, {
          content: mockHelpers.btoa(sampleData.configInvalidYML),
        });

      const filePath = 'path/to/file.yml';
      const githubInstance = new GitHub(req.params);
      await githubInstance.init();

      expect.assertions(2);

      await expect(githubInstance.readFile(filePath)).rejects.toMatchObject({
        _smErrorCode: 'PARSING_ERROR',
        message: expect.anything(),
      });

      expect(scope.isDone()).toBe(true);
    });

    test('reads a YAML file and returns its parsed contents', async () => {
      const filePath = 'path/to/file.yml';
      const parsedConfig = yaml.safeLoad(sampleData.config1, 'utf8');

      const scope = nock(/api\.github\.com/, {
        reqheaders: {
          authorization: 'token '.concat('1q2w3e4r'),
        },
      })
        .get('/repos/johndoe/foobar/contents/path%2Fto%2Ffile.yml?ref=master')
        .reply(200, {
          content: mockHelpers.btoa(sampleData.config1),
        });

      expect.assertions(2);

      const githubInstance = new GitHub(req.params);
      await githubInstance.init();

      const contents = await githubInstance.readFile(filePath);
      expect(contents).toEqual(parsedConfig);
      expect(scope.isDone()).toBe(true);
    });

    test('reads a YAML file and returns its parsed and raw contents if `getFullResponse` is `true`', async () => {
      const parsedConfig = yaml.safeLoad(sampleData.config1, 'utf8');
      const filePath = 'path/to/file.yml';

      const scope = nock(/api\.github\.com/, {
        reqheaders: {
          authorization: 'token '.concat('1q2w3e4r'),
        },
      })
        .get('/repos/johndoe/foobar/contents/path%2Fto%2Ffile.yml?ref=master')
        .reply(200, {
          content: mockHelpers.btoa(sampleData.config1),
        });

      expect.assertions(2);

      const githubInstance = new GitHub(req.params);
      await githubInstance.init();

      const response = await githubInstance.readFile(filePath, true);

      expect(response.content).toEqual(parsedConfig);
      expect(scope.isDone()).toBe(true);
    });

    test('reads a JSON file and returns its parsed contents', async () => {
      const filePath = 'path/to/file.json';
      const parsedConfig = yaml.safeLoad(sampleData.config2, 'utf8');

      const scope = nock(/api\.github\.com/, {
        reqheaders: {
          authorization: 'token '.concat('1q2w3e4r'),
        },
      })
        .get('/repos/johndoe/foobar/contents/path%2Fto%2Ffile.json?ref=master')
        .reply(200, {
          content: mockHelpers.btoa(sampleData.config2),
        });

      expect.assertions(2);

      const githubInstance = new GitHub(req.params);
      await githubInstance.init();

      const contents = await githubInstance.readFile(filePath);

      expect(contents).toEqual(parsedConfig);
      expect(scope.isDone()).toBe(true);
    });

    test('reads a JSON file and returns its parsed and raw contents if `getFullResponse` is `true`', async () => {
      const fileContents = {
        content: mockHelpers.btoa(sampleData.config2),
      };
      const filePath = 'path/to/file.json';
      const parsedConfig = yaml.safeLoad(sampleData.config2, 'utf8');

      const scope = nock(/api\.github\.com/, {
        reqheaders: {
          authorization: 'token '.concat('1q2w3e4r'),
        },
      })
        .get('/repos/johndoe/foobar/contents/path%2Fto%2Ffile.json?ref=master')
        .reply(200, {
          content: mockHelpers.btoa(sampleData.config2),
        });

      expect.assertions(3);

      const githubInstance = new GitHub(req.params);
      await githubInstance.init();

      const response = await githubInstance.readFile(filePath, true);
      expect(response.content).toEqual(parsedConfig);
      expect(response.file).toEqual(fileContents);
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('writeFile', () => {
    test('creates a file on the given branch using the commit title provided', async () => {
      const options = {
        branch: 'master',
        commitTitle: 'Adds a new file',
        content: 'This is a new file',
        path: 'path/to/file.txt',
      };

      const scope = nock(/api\.github\.com/, {
        reqheaders: {
          authorization: 'token '.concat('1q2w3e4r'),
        },
      })
        .put('/repos/johndoe/foobar/contents/path%2Fto%2Ffile.txt')
        .reply(200, {
          number: 123,
        });

      expect.assertions(1);

      const githubInstance = new GitHub(req.params);
      await githubInstance.init();

      await githubInstance.writeFile(
        options.path,
        options.content,
        options.branch,
        options.commitTitle
      );

      expect(scope.isDone()).toBe(true);
    });

    test('creates a file using the branch present in the request, if one is not provided to the method, and the default commit title', async () => {
      const options = {
        content: 'This is a new file',
        commitTitle: 'Add Staticman file',
        path: 'path/to/file.txt',
      };

      const scope = nock(/api\.github\.com/, {
        reqheaders: {
          authorization: 'token '.concat('1q2w3e4r'),
        },
      })
        .put('/repos/johndoe/foobar/contents/path%2Fto%2Ffile.txt')
        .reply(200, {
          number: 123,
        });

      expect.assertions(1);

      const githubInstance = new GitHub(req.params);
      await githubInstance.init();

      await githubInstance.writeFile(options.path, options.content);

      expect(scope.isDone()).toBe(true);
    });

    test('returns an error object if the save operation fails', async () => {
      const options = {
        branch: 'master',
        commitTitle: 'Adds a new file',
        content: 'This is a new file',
        path: 'path/to/file.txt',
      };

      const scope = nock(/api\.github\.com/, {
        reqheaders: {
          authorization: 'token '.concat('1q2w3e4r'),
        },
      })
        .put('/repos/johndoe/foobar/contents/path%2Fto%2Ffile.txt')
        .replyWithError('An error');

      const githubInstance = new GitHub(req.params);
      await githubInstance.init();

      expect.assertions(2);

      await expect(
        githubInstance.writeFile(options.path, options.content, options.branch, options.commitTitle)
      ).rejects.toMatchObject({
        _smErrorCode: 'GITHUB_WRITING_FILE',
      });

      expect(scope.isDone()).toBe(true);
    });
  });

  describe('writeFileAndSendReview', () => {
    test('writes a file to a new branch and sends a PR to the base branch provided, using the given title and body for the commit/PR', async () => {
      const options = {
        commitBody: 'This is a very cool file indeed...',
        commitTitle: 'Adds a new file',
        content: 'This is a new file',
        name: 'file.txt',
        newBranch: 'staticman_123456789',
        path: 'path/to/file.txt',
        sha: '7fd1a60b01f91b314f59955a4e4d4e80d8edf11d',
      };

      const branchScope = nock(/api\.github\.com/, {
        reqheaders: {
          authorization: 'token '.concat('1q2w3e4r'),
        },
      })
        .get('/repos/johndoe/foobar/branches/master')
        .reply(200, {
          commit: {
            sha: options.sha,
          },
        });

      const refsScope = nock(/api\.github\.com/, {
        reqheaders: {
          authorization: 'token '.concat('1q2w3e4r'),
        },
      })
        .post('/repos/johndoe/foobar/git/refs')
        .reply(200, {
          ref: `refs/heads/${options.newBranch}`,
        });

      const fileScope = nock(/api\.github\.com/, {
        reqheaders: {
          authorization: 'token '.concat('1q2w3e4r'),
        },
      })
        .put('/repos/johndoe/foobar/contents/path%2Fto%2Ffile.txt')
        .reply(200, {
          number: 123,
        });

      const pullScope = nock(/api\.github\.com/, {
        reqheaders: {
          authorization: 'token '.concat('1q2w3e4r'),
        },
      })
        .post('/repos/johndoe/foobar/pulls')
        .reply(200, {
          id: 1,
        });

      expect.assertions(5);

      const githubInstance = new GitHub(req.params);
      await githubInstance.init();

      const data = await githubInstance.writeFileAndSendReview(
        options.path,
        options.content,
        options.newBranch,
        options.commitTitle,
        options.commitBody
      );

      expect(data).toEqual({ id: 1 });

      expect(branchScope.isDone()).toBe(true);
      expect(refsScope.isDone()).toBe(true);
      expect(fileScope.isDone()).toBe(true);
      expect(pullScope.isDone()).toBe(true);
    });

    // TODO: Figure out why this works with no mocks
    test('returns an error if any of the API calls fail', async () => {
      const options = {
        commitBody: '',
        commitTitle: 'Add Staticman file',
        content: 'This is a new file',
        name: 'file.txt',
        newBranch: 'staticman_123456789',
        path: 'path/to/file.txt',
        sha: '7fd1a60b01f91b314f59955a4e4d4e80d8edf11d',
      };

      const scope = nock(/api\.github\.com/, {
        reqheaders: {
          authorization: 'token '.concat('1q2w3e4r'),
        },
      })
        .get('/repos/johndoe/foobar/branches/master')
        .replyWithError('An error, oh no.');

      const githubInstance = new GitHub(req.params);
      await githubInstance.init();

      expect.assertions(2);

      await expect(
        githubInstance.writeFileAndSendReview(
          options.path,
          options.content,
          options.newBranch,
          options.commitTitle,
          options.commitBody
        )
      ).rejects.toMatchObject({
        _smErrorCode: 'GITHUB_CREATING_PR',
      });
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('getCurrentUser', () => {
    test('returns the current authenticated user', async () => {
      const scope = nock(/api\.github\.com/, {
        reqheaders: {
          authorization: 'token '.concat('1q2w3e4r'),
        },
      })
        .get('/user')
        .reply(200, {
          login: 'johndoe',
          email: 'johndoe@test.com',
          name: 'John Doe',
        });

      expect.assertions(2);

      const githubInstance = new GitHub(req.params);
      await githubInstance.init();

      const user = await githubInstance.getCurrentUser();
      expect(user).toEqual(new User('github', 'johndoe', 'johndoe@test.com', 'John Doe'));
      expect(scope.isDone()).toBe(true);
    });

    test('throws an error if unable to retrieve the current unauthenticated user', async () => {
      const scope = nock(/api\.github\.com/, {
        reqheaders: {
          authorization: 'token '.concat('1q2w3e4r'),
        },
      })
        .get('/user')
        .replyWithError('Oops, an error');

      const githubInstance = new GitHub(req.params);
      await githubInstance.init();

      expect.assertions(2);

      await expect(githubInstance.getCurrentUser()).rejects.toMatchObject({
        _smErrorCode: 'GITHUB_GET_USER',
      });

      expect(scope.isDone()).toBe(true);
    });
  });
});
