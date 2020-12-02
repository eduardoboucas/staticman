/* eslint-disable max-classes-per-file, no-shadow */

import { Gitlab as GitLabApi } from 'gitlab';
import yaml from 'js-yaml';

import config from '../../../source/config';
import GitLab from '../../../source/lib/GitLab';
import * as mockHelpers from '../../helpers';
import * as sampleData from '../../helpers/sampleData';
import User from '../../../source/lib/models/User';

jest.mock('gitlab');

let req;

const btoa = (contents) => Buffer.from(contents).toString('base64');

beforeEach(() => {
  jest.resetModules();
  jest.restoreAllMocks();

  req = mockHelpers.getMockRequest();
  req.params.token = 'test-token';
});

afterEach(() => jest.clearAllMocks());

describe('GitLab interface', () => {
  test('initialises the GitLab API wrapper', () => {
    const gitlab = new GitLab(req.params);

    expect(gitlab).toBeDefined();
    expect(GitLabApi).toHaveBeenCalled();
  });

  test('authenticates with the GitLab API using a personal access token', () => {
    const gitlab = new GitLab(req.params);

    expect(gitlab).toBeDefined();
    expect(GitLabApi).toHaveBeenCalledWith({
      url: 'https://gitlab.com',
      token: 'r4e3w2q1',
    });
  });

  test('authenticates with the GitLab API using an OAuth token', () => {
    const oauthToken = 'test-oauth-token';
    const gitlab = new GitLab({ ...req.params, oauthToken });

    expect(gitlab).toBeDefined();
    expect(GitLabApi).toHaveBeenCalledWith({
      url: 'https://gitlab.com',
      oauthToken,
    });
  });

  test('throws error if no personal access token or OAuth token is provided', () => {
    jest.spyOn(config, 'get').mockImplementation(() => null);

    expect(() => new GitLab({})).toThrow('Require an `oauthToken` or `token` option');
  });

  describe('readFile', () => {
    test('reads a file and returns its contents', async () => {
      const fileContents = 'This is a text file!';
      const filePath = 'path/to/file.txt';
      const mockRepoShowFile = jest.fn().mockResolvedValue({
        content: btoa(fileContents),
      });

      GitLabApi.mockImplementation(() => ({
        RepositoryFiles: {
          show: mockRepoShowFile,
        },
      }));

      const gitlab = new GitLab(req.params);

      expect.assertions(1);

      await gitlab.readFile(filePath);
      expect(mockRepoShowFile).toHaveBeenCalledWith(
        `${req.params.username}/${req.params.repository}`,
        filePath,
        req.params.branch
      );
    });

    test('returns an error if GitLab API call errors', async () => {
      const filePath = 'path/to/file.yml';
      const mockShowRepoFile = jest.fn().mockRejectedValue();

      GitLabApi.mockImplementation(() => ({
        RepositoryFiles: {
          show: mockShowRepoFile,
        },
      }));

      const gitlab = new GitLab(req.params);

      expect.assertions(2);

      try {
        await gitlab.readFile(filePath);
      } catch (err) {
        expect(mockShowRepoFile).toHaveBeenCalledWith(
          `${req.params.username}/${req.params.repository}`,
          filePath,
          req.params.branch
        );

        expect(err).toEqual({
          _smErrorCode: 'GITLAB_READING_FILE',
        });
      }
    });

    test('returns an error if parsing fails for the given file', async () => {
      const fileContents = `
        foo: "bar"
        baz
      `;
      const filePath = 'path/to/file.yml';
      const mockShowRepoFile = jest.fn().mockResolvedValue({
        content: btoa(fileContents),
      });

      GitLabApi.mockImplementation(() => ({
        RepositoryFiles: {
          show: mockShowRepoFile,
        },
      }));

      const gitlab = new GitLab(req.params);

      expect.assertions(3);

      try {
        await gitlab.readFile(filePath);
      } catch (err) {
        expect(mockShowRepoFile).toHaveBeenCalledWith(
          `${req.params.username}/${req.params.repository}`,
          filePath,
          req.params.branch
        );
        expect(err._smErrorCode).toBe('PARSING_ERROR');
        expect(err.message).toBeDefined();
      }
    });

    test('reads a YAML file and returns its parsed contents', async () => {
      const filePath = 'path/to/file.yml';
      const parsedConfig = yaml.safeLoad(sampleData.config1, 'utf8');
      const mockShowRepoFile = jest.fn().mockResolvedValue({
        content: btoa(sampleData.config1),
      });

      GitLabApi.mockImplementation(() => ({
        RepositoryFiles: {
          show: mockShowRepoFile,
        },
      }));

      const gitlab = new GitLab(req.params);

      expect.assertions(2);

      const contents = await gitlab.readFile(filePath);
      expect(mockShowRepoFile).toHaveBeenCalledWith(
        `${req.params.username}/${req.params.repository}`,
        filePath,
        req.params.branch
      );
      expect(contents).toEqual(parsedConfig);
    });

    test('reads a YAML file and returns its parsed and raw contents if `getFullResponse` is `true`', async () => {
      const parsedConfig = yaml.safeLoad(sampleData.config1, 'utf8');
      const fileContents = {
        content: btoa(sampleData.config1),
      };
      const filePath = 'path/to/file.yml';
      const mockShowRepoFile = jest.fn().mockResolvedValue(fileContents);

      GitLabApi.mockImplementation(() => ({
        RepositoryFiles: {
          show: mockShowRepoFile,
        },
      }));

      const gitlab = new GitLab(req.params);

      expect.assertions(2);

      const response = await gitlab.readFile(filePath, true);
      expect(response.content).toEqual(parsedConfig);
      expect(response.file).toEqual(fileContents);
    });

    test('reads a JSON file and returns its parsed contents', async () => {
      const filePath = 'path/to/file.json';
      const parsedConfig = yaml.safeLoad(sampleData.config2, 'utf8');
      const mockShowRepoFile = jest.fn().mockResolvedValue({
        content: btoa(sampleData.config2),
      });

      GitLabApi.mockImplementation(() => ({
        RepositoryFiles: {
          show: mockShowRepoFile,
        },
      }));

      const gitlab = new GitLab(req.params);

      expect.assertions(1);

      const contents = await gitlab.readFile(filePath);

      expect(contents).toEqual(parsedConfig);
    });

    test('reads a JSON file and returns its parsed and raw contents if `getFullResponse` is `true`', async () => {
      const fileContents = {
        content: btoa(sampleData.config2),
      };
      const filePath = 'path/to/file.json';
      const parsedConfig = yaml.safeLoad(sampleData.config2, 'utf8');
      const mockShowRepoFile = jest.fn().mockResolvedValue(fileContents);

      GitLabApi.mockImplementation(() => ({
        RepositoryFiles: {
          show: mockShowRepoFile,
        },
      }));

      const gitlab = new GitLab(req.params);

      expect.assertions(2);

      const response = await gitlab.readFile(filePath, true);

      expect(response.content).toEqual(parsedConfig);
      expect(response.file).toEqual(fileContents);
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
      const mockCreateRepoFile = jest.fn().mockResolvedValue(null);

      GitLabApi.mockImplementation(() => ({
        RepositoryFiles: {
          create: mockCreateRepoFile,
        },
      }));

      const gitlab = new GitLab(req.params);

      expect.assertions(2);

      await gitlab.writeFile(options.path, options.content, options.branch, options.commitTitle);

      expect(mockCreateRepoFile).toHaveBeenCalledTimes(1);
      expect(mockCreateRepoFile).toHaveBeenCalledWith(
        `${req.params.username}/${req.params.repository}`,
        options.path,
        options.branch,
        expect.objectContaining({
          content: btoa(options.content),
          commit_message: options.commitTitle,
          encoding: 'base64',
        })
      );
    });

    test('creates a file using the branch present in the request, if one is not provided to the method, and the default commit title', async () => {
      const mockCreateRepoFile = jest.fn().mockResolvedValue(null);

      GitLabApi.mockImplementation(() => ({
        RepositoryFiles: {
          create: mockCreateRepoFile,
        },
      }));

      const gitlab = new GitLab(req.params);
      const options = {
        content: 'This is a new file',
        commitTitle: 'Add Staticman file',
        path: 'path/to/file.txt',
      };

      expect.assertions(1);

      await gitlab.writeFile(options.path, options.content);

      expect(mockCreateRepoFile).toHaveBeenCalledWith(
        `${req.params.username}/${req.params.repository}`,
        options.path,
        req.params.branch,
        expect.objectContaining({
          content: btoa(options.content),
          commit_message: options.commitTitle,
          encoding: 'base64',
        })
      );
    });

    test('returns an error object if the save operation fails', async () => {
      GitLabApi.mockImplementation(() => ({
        RepositoryFiles: {
          create: jest.fn().mockRejectedValue(new Error()),
        },
      }));

      const gitlab = new GitLab(req.params);
      const options = {
        branch: 'master',
        commitTitle: 'Adds a new file',
        content: 'This is a new file',
        path: 'path/to/file.txt',
      };

      expect.assertions(1);

      try {
        await gitlab.writeFile(options.path, options.content, options.branch, options.commitTitle);
      } catch (err) {
        expect(err._smErrorCode).toBe('GITLAB_WRITING_FILE');
      }
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
      const mockCreateMergeRequest = jest.fn().mockResolvedValue({ number: 123 });
      const mockCreateBranch = jest.fn().mockResolvedValue({
        ref: `refs/heads/${options.newBranch}`,
      });
      const mockShowBranch = jest.fn().mockResolvedValue({
        commit: {
          id: options.sha,
        },
      });

      GitLabApi.mockImplementation(() => ({
        Branches: {
          create: mockCreateBranch,
          show: mockShowBranch,
        },
        MergeRequests: {
          create: mockCreateMergeRequest,
        },
        RepositoryFiles: {
          create: jest.fn().mockResolvedValue(null),
        },
      }));

      const gitlab = new GitLab(req.params);

      expect.assertions(3);

      await gitlab.writeFileAndSendReview(
        options.path,
        options.content,
        options.newBranch,
        options.commitTitle,
        options.commitBody
      );

      expect(mockCreateMergeRequest).toHaveBeenCalledWith(
        `${req.params.username}/${req.params.repository}`,
        options.newBranch,
        req.params.branch,
        options.commitTitle,
        expect.objectContaining({
          description: options.commitBody,
          remove_source_branch: true,
        })
      );

      expect(mockCreateBranch).toHaveBeenCalledWith(
        `${req.params.username}/${req.params.repository}`,
        options.newBranch,
        options.sha
      );

      expect(mockShowBranch).toHaveBeenCalledWith(
        `${req.params.username}/${req.params.repository}`,
        req.params.branch
      );
    });

    test('returns an error if any of the API calls fail', async () => {
      GitLabApi.mockImplementation(() => ({
        Branches: {
          create: jest.fn().mockResolvedValue(),
          show: jest.fn().mockRejectedValue(new Error()),
        },
        RepositoryFiles: {
          create: jest.fn().mockRejectedValue(new Error()),
        },
      }));

      const gitlab = new GitLab(req.params);
      const options = {
        commitBody: '',
        commitTitle: 'Add Staticman file',
        content: 'This is a new file',
        name: 'file.txt',
        newBranch: 'staticman_123456789',
        path: 'path/to/file.txt',
        sha: '7fd1a60b01f91b314f59955a4e4d4e80d8edf11d',
      };

      expect.assertions(1);

      try {
        await gitlab.writeFileAndSendReview(
          options.path,
          options.content,
          options.newBranch,
          options.commitTitle,
          options.commitBody
        );
      } catch (err) {
        expect(err._smErrorCode).toBe('GITLAB_CREATING_PR');
      }
    });
  });

  describe('getCurrentUser', () => {
    test('returns the current authenticated user', async () => {
      const mockUser = {
        username: 'johndoe',
        email: 'johndoe@test.com',
        name: 'John Doe',
      };

      GitLabApi.mockImplementation(() => ({
        Users: {
          current: jest.fn().mockResolvedValue(mockUser),
        },
      }));

      const gitlab = new GitLab(req.params);

      expect.assertions(1);

      const user = await gitlab.getCurrentUser();
      expect(user).toEqual(new User('gitlab', 'johndoe', 'johndoe@test.com', 'John Doe'));
    });

    test('throws an error if unable to retrieve the current unauthenticated user', async () => {
      GitLabApi.mockImplementation(() => ({
        Users: {
          current: jest.fn().mockRejectedValue(new Error()),
        },
      }));

      const gitlab = new GitLab(req.params);

      expect.assertions(1);

      try {
        await gitlab.getCurrentUser();
      } catch (err) {
        expect(err._smErrorCode).toBe('GITLAB_GET_USER');
      }
    });
  });
});
