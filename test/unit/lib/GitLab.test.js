/* eslint-disable max-classes-per-file, no-shadow */

import yaml from 'js-yaml';

import config from '../../../source/config';
import GitLab from '../../../source/lib/GitLab';
import * as mockHelpers from '../../helpers';
import * as sampleData from '../../helpers/sampleData';
import User from '../../../source/lib/models/User';

let req;

const btoa = (contents) => Buffer.from(contents).toString('base64');

beforeEach(() => {
  jest.resetModules();
  jest.restoreAllMocks();

  req = mockHelpers.getMockRequest();
  req.params.token = 'test-token';
});

describe('GitLab interface', () => {
  test('initialises the GitLab API wrapper', () => {
    const gitlab = new GitLab(req.params);

    expect(gitlab.api).toBeDefined();
  });

  test('authenticates with the GitLab API using a personal access token', () => {
    const mockConstructor = jest.fn();
    jest.mock('@gitbeaker/node', () => {
      return {
        Gitlab: class {
          constructor(params) {
            mockConstructor(params);
          }
        },
      };
    });

    const GitLabTest = require('../../../source/lib/GitLab').default;
    const gitlab = new GitLabTest(req.params); // eslint-disable-line no-unused-vars

    expect(mockConstructor.mock.calls[0][0]).toEqual({
      host: 'http://gitlab.com',
      token: 'r4e3w2q1',
    });
  });

  test('authenticates with the GitLab API using an OAuth token', () => {
    const mockConstructor = jest.fn();
    jest.mock('@gitbeaker/node', () => {
      return {
        Gitlab: class {
          constructor(params) {
            mockConstructor(params);
          }
        },
      };
    });

    const GitLab = require('../../../source/lib/GitLab').default;

    const oauthToken = 'test-oauth-token';
    // eslint-disable-next-line no-unused-vars
    const gitlab = new GitLab({ ...req.params, oauthToken });

    expect(mockConstructor.mock.calls[0][0]).toEqual({
      host: 'http://gitlab.com',
      oauthToken,
    });
  });

  test('throws error if no personal access token or OAuth token is provided', () => {
    jest.spyOn(config, 'get').mockImplementation(() => null);

    expect(() => new GitLab({})).toThrow('Require an `oauthToken` or `token` option');
  });

  describe('readFile', () => {
    test('reads a file and returns its contents', () => {
      const fileContents = 'This is a text file!';
      const filePath = 'path/to/file.txt';
      const mockRepoShowFile = jest.fn(() =>
        Promise.resolve({
          content: btoa(fileContents),
        })
      );
      const mockSearch = jest.fn(async () => [{ id: 1 }]);

      const mockConstructor = jest.fn();
      jest.mock('@gitbeaker/node', () => {
        return {
          Gitlab: class {
            constructor(params) {
              mockConstructor(params);
            }

            get Projects() { // eslint-disable-line class-methods-use-this
              return {
                search: mockSearch
              }
            }

            get RepositoryFiles() { // eslint-disable-line class-methods-use-this
              return {
                show: mockRepoShowFile
              }
            }
          }
        };
      });

      const GitLab = require('../../../source/lib/GitLab').default;
      const gitlab = new GitLab(req.params);

      return gitlab.readFile(filePath).then((contents) => {
        expect(mockRepoShowFile.mock.calls[0][0]).toBe(1);
        expect(mockRepoShowFile.mock.calls[0][1]).toBe(filePath);
        expect(mockRepoShowFile.mock.calls[0][2]).toBe(req.params.branch);
      });
    });

    test('returns an error if GitLab API call errors', () => {
      const filePath = 'path/to/file.yml';
      const mockShowRepoFile = jest.fn(() => Promise.reject()); // eslint-disable-line prefer-promise-reject-errors


      const mockSearch = jest.fn(async () => [{ id: 1 }]);

      const mockConstructor = jest.fn();
      jest.mock('@gitbeaker/node', () => {
        return {
          Gitlab: class {
            constructor(params) {
              mockConstructor(params);
            }

            get Projects() { // eslint-disable-line class-methods-use-this
              return {
                search: mockSearch
              }
            }

            get RepositoryFiles() { // eslint-disable-line class-methods-use-this
              return {
                show: mockShowRepoFile
              }
            }
          }
        };
      });

      const GitLab = require('../../../source/lib/GitLab').default;
      const gitlab = new GitLab(req.params);

      return gitlab.readFile(filePath).catch((err) => {
        expect(mockShowRepoFile.mock.calls[0][0]).toBe(1);
        expect(mockShowRepoFile.mock.calls[0][1]).toBe(filePath);
        expect(mockShowRepoFile.mock.calls[0][2]).toBe(req.params.branch);

        expect(err).toEqual({
          _smErrorCode: 'GITLAB_READING_FILE',
        });
      });
    });

    test('returns an error if parsing fails for the given file', () => {
      const fileContents = `
        foo: "bar"
        baz
      `;
      const filePath = 'path/to/file.yml';
      const mockShowRepoFile = jest.fn(() =>
        Promise.resolve({
          content: btoa(fileContents),
        })
      );

      const mockSearch = jest.fn(async () => [{ id: 1 }]);

      const mockConstructor = jest.fn();
      jest.mock('@gitbeaker/node', () => {
        return {
          Gitlab: class {
            constructor(params) {
              mockConstructor(params);
            }

            get Projects() { // eslint-disable-line class-methods-use-this
              return {
                search: mockSearch
              }
            }

            get RepositoryFiles() { // eslint-disable-line class-methods-use-this
              return {
                show: mockShowRepoFile
              }
            }
          }
        };
      });


      const GitLab = require('../../../source/lib/GitLab').default;
      const gitlab = new GitLab(req.params);

      return gitlab.readFile(filePath).catch((err) => {
        expect(mockShowRepoFile.mock.calls[0][0]).toBe(1);
        expect(mockShowRepoFile.mock.calls[0][1]).toBe(filePath);
        expect(mockShowRepoFile.mock.calls[0][2]).toBe(req.params.branch);
        expect(err._smErrorCode).toBe('PARSING_ERROR');
        expect(err.message).toBeDefined();
      });
    });

    test('reads a YAML file and returns its parsed contents', () => {
      const filePath = 'path/to/file.yml';
      const parsedConfig = yaml.safeLoad(sampleData.config1, 'utf8');
      const mockShowRepoFile = jest.fn(() =>
        Promise.resolve({
          content: btoa(sampleData.config1),
        })
      );

      const mockSearch = jest.fn(async () => [{ id: 1 }]);

      const mockConstructor = jest.fn();
      jest.mock('@gitbeaker/node', () => {
        return {
          Gitlab: class {
            constructor(params) {
              mockConstructor(params);
            }

            get Projects() { // eslint-disable-line class-methods-use-this
              return {
                search: mockSearch
              }
            }

            get RepositoryFiles() { // eslint-disable-line class-methods-use-this
              return {
                show: mockShowRepoFile
              }
            }
          }
        };
      });

      const GitLab = require('../../../source/lib/GitLab').default;
      const gitlab = new GitLab(req.params);

      return gitlab.readFile(filePath).then((contents) => {
        expect(mockShowRepoFile.mock.calls[0][0]).toBe(
          1
        );
        expect(mockShowRepoFile.mock.calls[0][1]).toBe(filePath);
        expect(mockShowRepoFile.mock.calls[0][2]).toBe(req.params.branch);
        expect(contents).toEqual(parsedConfig);
      });
    });

    test('reads a YAML file and returns its parsed and raw contents if `getFullResponse` is `true`', () => {
      const parsedConfig = yaml.safeLoad(sampleData.config1, 'utf8');
      const fileContents = {
        content: btoa(sampleData.config1),
      };
      const filePath = 'path/to/file.yml';
      const mockShowRepoFile = jest.fn(() => Promise.resolve(fileContents));

      const mockSearch = jest.fn(async () => [{ id: 1 }]);

      const mockConstructor = jest.fn();
      jest.mock('@gitbeaker/node', () => {
        return {
          Gitlab: class {
            constructor(params) {
              mockConstructor(params);
            }

            get Projects() { // eslint-disable-line class-methods-use-this
              return {
                search: mockSearch
              }
            }

            get RepositoryFiles() { // eslint-disable-line class-methods-use-this
              return {
                show: mockShowRepoFile
              }
            }
          }
        };
      });

      const GitLab = require('../../../source/lib/GitLab').default;
      const gitlab = new GitLab(req.params);

      return gitlab.readFile(filePath, true).then((response) => {
        expect(response.content).toEqual(parsedConfig);
        expect(response.file).toEqual(fileContents);
      });
    });

    test('reads a JSON file and returns its parsed contents', () => {
      const filePath = 'path/to/file.json';
      const parsedConfig = yaml.safeLoad(sampleData.config2, 'utf8');
      const mockShowRepoFile = jest.fn(() =>
        Promise.resolve({
          content: btoa(sampleData.config2),
        })
      );

      const mockSearch = jest.fn(async () => [{ id: 1 }]);

      const mockConstructor = jest.fn();
      jest.mock('@gitbeaker/node', () => {
        return {
          Gitlab: class {
            constructor(params) {
              mockConstructor(params);
            }

            get Projects() { // eslint-disable-line class-methods-use-this
              return {
                search: mockSearch
              }
            }

            get RepositoryFiles() { // eslint-disable-line class-methods-use-this
              return {
                show: mockShowRepoFile
              }
            }
          }
        };
      });

      const GitLab = require('../../../source/lib/GitLab').default;
      const gitlab = new GitLab(req.params);

      return gitlab.readFile(filePath).then((contents) => {
        expect(contents).toEqual(parsedConfig);
      });
    });

    test('reads a JSON file and returns its parsed and raw contents if `getFullResponse` is `true`', () => {
      const fileContents = {
        content: btoa(sampleData.config2),
      };
      const filePath = 'path/to/file.json';
      const parsedConfig = yaml.safeLoad(sampleData.config2, 'utf8');
      const mockShowRepoFile = jest.fn(() => Promise.resolve(fileContents));

      const mockSearch = jest.fn(async () => [{ id: 1 }]);

      const mockConstructor = jest.fn();
      jest.mock('@gitbeaker/node', () => {
        return {
          Gitlab: class {
            constructor(params) {
              mockConstructor(params);
            }

            get Projects() { // eslint-disable-line class-methods-use-this
              return {
                search: mockSearch
              }
            }

            get RepositoryFiles() { // eslint-disable-line class-methods-use-this
              return {
                show: mockShowRepoFile
              }
            }
          }
        };
      });

      const GitLab = require('../../../source/lib/GitLab').default;
      const gitlab = new GitLab(req.params);

      return gitlab.readFile(filePath, true).then((response) => {
        expect(response.content).toEqual(parsedConfig);
        expect(response.file).toEqual(fileContents);
      });
    });
  });

  describe('writeFile', () => {
    test('creates a file on the given branch using the commit title provided', () => {
      const options = {
        branch: 'master',
        commitTitle: 'Adds a new file',
        content: 'This is a new file',
        path: 'path/to/file.txt',
      };
      const mockCreateRepoFile = jest.fn(() => Promise.resolve(null));


      const mockSearch = jest.fn(async () => [{ id: 1 }]);

      const mockConstructor = jest.fn();
      jest.mock('@gitbeaker/node', () => {
        return {
          Gitlab: class {
            constructor(params) {
              mockConstructor(params);
            }

            get Projects() { // eslint-disable-line class-methods-use-this
              return {
                search: mockSearch
              }
            }

            get Commits() { // eslint-disable-line class-methods-use-this
              return {
                create: mockCreateRepoFile
              }
            }
          }
        };
      });

      const GitLab = require('../../../source/lib/GitLab').default;
      const gitlab = new GitLab(req.params);

      return gitlab
        .writeFile(options.path, options.content, options.branch, options.commitTitle)
        .then((response) => {
          expect(mockCreateRepoFile).toHaveBeenCalledTimes(1);

          expect(mockCreateRepoFile.mock.calls[0][0]).toBe(1);
          expect(mockCreateRepoFile.mock.calls[0][1]).toBe(req.params.branch);
          expect(mockCreateRepoFile.mock.calls[0][2]).toBe(options.commitTitle);
          expect(mockCreateRepoFile.mock.calls[0][3]).toEqual([{
            "action": "create",
            "file_path": options.path,
            "content": btoa(options.content),
            "encoding": "base64"
          }]);
        });
    });

    test('creates a file using the branch present in the request, if one is not provided to the method, and the default commit title', () => {
      const mockCreateRepoFile = jest.fn(() => Promise.resolve(null));

      const mockSearch = jest.fn(async () => [{ id: 1 }]);

      const mockConstructor = jest.fn();
      jest.mock('@gitbeaker/node', () => {
        return {
          Gitlab: class {
            constructor(params) {
              mockConstructor(params);
            }

            get Projects() { // eslint-disable-line class-methods-use-this
              return {
                search: mockSearch
              }
            }

            get Commits() { // eslint-disable-line class-methods-use-this
              return {
                create: mockCreateRepoFile
              }
            }
          }
        };
      });

      const GitLab = require('../../../source/lib/GitLab').default;
      const gitlab = new GitLab(req.params);
      const options = {
        content: 'This is a new file',
        commitTitle: 'Add Staticman file',
        path: 'path/to/file.txt',
      };

      return gitlab.writeFile(options.path, options.content).then((response) => {
        expect(mockCreateRepoFile.mock.calls[0][0]).toBe(1);
        expect(mockCreateRepoFile.mock.calls[0][1]).toBe(req.params.branch);
        expect(mockCreateRepoFile.mock.calls[0][2]).toBe(options.commitTitle);
        expect(mockCreateRepoFile.mock.calls[0][3]).toEqual([{
          "action": "create",
          "file_path": options.path,
          "content": btoa(options.content),
          "encoding": "base64"
        }]);
      });
    });

    test('returns an error object if the save operation fails', () => {
      const mockSearch = jest.fn(async () => [{ id: 1 }]);

      const mockConstructor = jest.fn();
      jest.mock('@gitbeaker/node', () => {
        return {
          Gitlab: class {
            constructor(params) {
              mockConstructor(params);
            }

            get Projects() { // eslint-disable-line class-methods-use-this
              return {
                search: mockSearch
              }
            }

            get Commits() { // eslint-disable-line class-methods-use-this
              return {
                create: () => Promise.reject(new Error()),
              }
            }
          }
        };
      });


      const GitLab = require('../../../source/lib/GitLab').default;
      const gitlab = new GitLab(req.params);
      const options = {
        branch: 'master',
        commitTitle: 'Adds a new file',
        content: 'This is a new file',
        path: 'path/to/file.txt',
      };

      return gitlab
        .writeFile(options.path, options.content, options.branch, options.commitTitle)
        .catch((err) => {
          expect(err._smErrorCode).toBe('GITLAB_WRITING_FILE');
        });
    });
  });

  describe('writeFileAndSendReview', () => {
    test('writes a file to a new branch and sends a PR to the base branch provided, using the given title and body for the commit/PR', () => {
      const options = {
        commitBody: 'This is a very cool file indeed...',
        commitTitle: 'Adds a new file',
        content: 'This is a new file',
        name: 'file.txt',
        newBranch: 'staticman_123456789',
        path: 'path/to/file.txt',
        sha: '7fd1a60b01f91b314f59955a4e4d4e80d8edf11d',
      };
      const mockCreateMergeRequest = jest.fn(() =>
        Promise.resolve({
          number: 123,
        })
      );
      const mockCreateBranch = jest.fn(() =>
        Promise.resolve({
          ref: `refs/heads/${options.newBranch}`,
        })
      );
      const mockShowBranch = jest.fn(() =>
        Promise.resolve({
          commit: {
            id: options.sha,
          },
        })
      );


      const mockSearch = jest.fn(async () => [{ id: 1 }]);

      const mockConstructor = jest.fn();
      jest.mock('@gitbeaker/node', () => {
        return {
          Gitlab: class {
            constructor(params) {
              mockConstructor(params);
            }

            get Projects() { // eslint-disable-line class-methods-use-this
              return {
                search: mockSearch
              }
            }

            get Branches() { // eslint-disable-line class-methods-use-this
              return {
                create: mockCreateBranch,
                show: mockShowBranch,
              }
            }

            get MergeRequests() { // eslint-disable-line class-methods-use-this
              return {
                create: mockCreateMergeRequest,
              }
            }

            get Commits() { // eslint-disable-line class-methods-use-this
              return {
                create: () => Promise.resolve(null),
              }
            }
          }
        };
      });

      const GitLab = require('../../../source/lib/GitLab').default;
      const gitlab = new GitLab(req.params);

      return gitlab
        .writeFileAndSendReview(
          options.path,
          options.content,
          options.newBranch,
          options.commitTitle,
          options.commitBody
        )
        .then((response) => {
          expect(mockCreateMergeRequest.mock.calls[0][0]).toBe(
            1
          );
          expect(mockCreateMergeRequest.mock.calls[0][1]).toBe(options.newBranch);
          expect(mockCreateMergeRequest.mock.calls[0][2]).toBe(req.params.branch);
          expect(mockCreateMergeRequest.mock.calls[0][3]).toBe(options.commitTitle);
          expect(mockCreateMergeRequest.mock.calls[0][4]).toEqual({
            description: options.commitBody,
            remove_source_branch: true,
          });

          expect(mockCreateBranch.mock.calls[0][0]).toBe(
            1
          );
          expect(mockCreateBranch.mock.calls[0][1]).toBe(options.newBranch);
          expect(mockCreateBranch.mock.calls[0][2]).toBe(options.sha);

          expect(mockShowBranch.mock.calls[0][0]).toBe(
            1
          );
          expect(mockShowBranch.mock.calls[0][1]).toBe(req.params.branch);
        });
    });

    test('returns an error if any of the API calls fail', () => {

      const mockSearch = jest.fn(async () => [{ id: 1 }]);

      const mockConstructor = jest.fn();
      jest.mock('@gitbeaker/node', () => {
        return {
          Gitlab: class {
            constructor(params) {
              mockConstructor(params);
            }

            get Projects() { // eslint-disable-line class-methods-use-this
              return {
                search: mockSearch
              }
            }

            get Branches() { // eslint-disable-line class-methods-use-this
              return {
                create: () => Promise.resolve(),
                show: () => Promise.reject(new Error()),
              }
            }


            get RepositoryFiles() { // eslint-disable-line class-methods-use-this
              return {
                create: () => Promise.resolve(null),
              }
            }
          }
        };
      });

      const GitLab = require('../../../source/lib/GitLab').default;
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

      return gitlab
        .writeFileAndSendReview(
          options.path,
          options.content,
          options.newBranch,
          options.commitTitle,
          options.commitBody
        )
        .catch((err) => {
          expect(err._smErrorCode).toBe('GITLAB_CREATING_PR');
        });
    });
  });

  describe('getCurrentUser', () => {
    test('returns the current authenticated user', () => {
      const mockUser = {
        username: 'johndoe',
        email: 'johndoe@test.com',
        name: 'John Doe',
      };

      const mockSearch = jest.fn(async () => [{ id: 1 }]);

      const mockConstructor = jest.fn();

      jest.mock('@gitbeaker/node', () => {
        return {
          Gitlab: class {
            constructor(params) {
              mockConstructor(params);
            }

            get Projects() { // eslint-disable-line class-methods-use-this
              return {
                search: mockSearch
              }
            }

            get Users() { // eslint-disable-line class-methods-use-this
              return {
                current: () => Promise.resolve(mockUser),
              }
            }
          }
        };
      });

      const GitLab = require('../../../source/lib/GitLab').default;
      const gitlab = new GitLab(req.params);

      return gitlab.getCurrentUser().then((user) => {
        expect(user).toEqual(new User('gitlab', 'johndoe', 'johndoe@test.com', 'John Doe'));
      });
    });

    test('throws an error if unable to retrieve the current unauthenticated user', () => {

      const mockSearch = jest.fn(async () => [{ id: 1 }]);

      const mockConstructor = jest.fn();

      jest.mock('@gitbeaker/node', () => {
        return {
          Gitlab: class {
            constructor(params) {
              mockConstructor(params);
            }

            get Projects() { // eslint-disable-line class-methods-use-this
              return {
                search: mockSearch
              }
            }

            get Users() { // eslint-disable-line class-methods-use-this
              return {
                current: () => Promise.reject(new Error()),
              }
            }
          }
        };
      });

      const GitLab = require('../../../source/lib/GitLab').default;
      const gitlab = new GitLab(req.params);

      return gitlab.getCurrentUser().catch((err) => {
        expect(err._smErrorCode).toBe('GITLAB_GET_USER');
      });
    });
  });
});
