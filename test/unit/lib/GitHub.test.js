const mockHelpers = require('./../../helpers')
const sampleData = require('./../../helpers/sampleData')
const User = require('../../../lib/models/User')
const yaml = require('js-yaml')

let req

const btoa = contents => Buffer.from(contents).toString('base64')

beforeEach(() => {
  jest.resetModules()

  req = mockHelpers.getMockRequest()
  req.params.token = 'test-token'
})

describe('GitHub interface', () => {
  test('initialises the GitHub API wrapper', () => {
    const GitHub = require('./../../../lib/GitHub')
    const githubInstance = new GitHub(req.params)

    expect(githubInstance.api).toBeDefined()
  })

  test('authenticates with the GitHub API using a personal access token', () => {
    jest.mock('@octokit/rest', () =>
      _ => ({
        authenticate: jest.fn()
      })
    )

    const GitHub = require('./../../../lib/GitHub')
    const githubInstance = new GitHub(req.params)

    expect(githubInstance.api.authenticate.mock.calls[0][0]).toEqual({
      type: 'token',
      token: req.params.token
    })
  })

  test('authenticates with the GitHub API using an OAuth token', () => {
    jest.mock('@octokit/rest', () =>
      _ => ({
        authenticate: jest.fn()
      })
    )

    const GitHub = require('./../../../lib/GitHub')

    const oauthToken = 'test-oauth-token'
    const githubInstance = new GitHub(Object.assign({}, req.params, {oauthToken}))

    expect(githubInstance.api.authenticate.mock.calls[0][0]).toEqual({
      type: 'oauth',
      token: oauthToken
    })
  })

  test('throws error if no personal access token or OAuth token is provided', () => {
    const GitHub = require('./../../../lib/GitHub')

    expect(() => new GitHub({})).toThrowError('Require an `oauthToken` or `token` option')
  })

  describe('readFile', () => {
    test('reads a file and returns its contents', () => {
      const fileContents = 'This is a text file!'
      const filePath = 'path/to/file.txt'
      const mockReposGetContents = jest.fn(() => Promise.resolve({
        data: {
          content: btoa(fileContents)
        }
      }))

      jest.mock('@octokit/rest', () =>
        _ => ({
          authenticate: jest.fn(),
          repos: {
            getContents: mockReposGetContents
          }
        })
      )

      const GitHub = require('./../../../lib/GitHub')
      const githubInstance = new GitHub(req.params)

      return githubInstance.readFile(filePath).then(contents => {
        expect(mockReposGetContents.mock.calls[0][0]).toEqual({
          owner: req.params.username,
          repo: req.params.repository,
          path: filePath,
          ref: req.params.branch
        })
      })
    })

    test('returns an error if GitHub API call errors', () => {
      const filePath = 'path/to/file.yml'
      const mockReposGetContents = jest.fn(() => Promise.reject()) // eslint-disable-line prefer-promise-reject-errors

      jest.mock('@octokit/rest', () =>
        _ => ({
          authenticate: jest.fn(),
          repos: {
            getContents: mockReposGetContents
          }
        })
      )

      const GitHub = require('./../../../lib/GitHub')
      const githubInstance = new GitHub(req.params)

      return githubInstance.readFile(filePath).catch(err => {
        expect(mockReposGetContents.mock.calls[0][0]).toEqual({
          owner: req.params.username,
          repo: req.params.repository,
          path: filePath,
          ref: req.params.branch
        })
        expect(err).toEqual({
          _smErrorCode: 'GITHUB_READING_FILE'
        })
      })
    })

    test('returns an error if parsing fails for the given file', () => {
      const fileContents = `
        foo: "bar"
        baz
      `
      const filePath = 'path/to/file.yml'
      const mockReposGetContents = jest.fn(() => Promise.resolve({
        data: {
          content: btoa(fileContents)
        }
      }))

      jest.mock('@octokit/rest', () =>
        _ => ({
          authenticate: jest.fn(),
          repos: {
            getContents: mockReposGetContents
          }
        })
      )

      const GitHub = require('./../../../lib/GitHub')
      const githubInstance = new GitHub(req.params)

      return githubInstance.readFile(filePath).catch(err => {
        expect(mockReposGetContents.mock.calls[0][0]).toEqual({
          owner: req.params.username,
          repo: req.params.repository,
          path: filePath,
          ref: req.params.branch
        })
        expect(err._smErrorCode).toBe('PARSING_ERROR')
        expect(err.message).toBeDefined()
      })
    })

    test('reads a YAML file and returns its parsed contents', () => {
      const filePath = 'path/to/file.yml'
      const parsedConfig = yaml.safeLoad(sampleData.config1, 'utf8')
      const mockReposGetContents = jest.fn(() => Promise.resolve({
        data: {
          content: btoa(sampleData.config1)
        }
      }))

      jest.mock('@octokit/rest', () =>
        _ => ({
          authenticate: jest.fn(),
          repos: {
            getContents: mockReposGetContents
          }
        })
      )

      const GitHub = require('./../../../lib/GitHub')
      const githubInstance = new GitHub(req.params)

      return githubInstance.readFile(filePath).then(contents => {
        expect(mockReposGetContents.mock.calls[0][0]).toEqual({
          owner: req.params.username,
          repo: req.params.repository,
          path: filePath,
          ref: req.params.branch
        })
        expect(contents).toEqual(parsedConfig)
      })
    })

    test('reads a YAML file and returns its parsed and raw contents if `getFullResponse` is `true`', () => {
      const parsedConfig = yaml.safeLoad(sampleData.config1, 'utf8')
      const fileContents = {
        content: btoa(sampleData.config1)
      }
      const filePath = 'path/to/file.yml'
      const mockReposGetContents = jest.fn(() => Promise.resolve({
        data: fileContents
      }))

      jest.mock('@octokit/rest', () =>
        _ => ({
          authenticate: jest.fn(),
          repos: {
            getContents: mockReposGetContents
          }
        })
      )

      const GitHub = require('./../../../lib/GitHub')
      const githubInstance = new GitHub(req.params)

      return githubInstance.readFile(filePath, true).then(response => {
        expect(mockReposGetContents.mock.calls[0][0]).toEqual({
          owner: req.params.username,
          repo: req.params.repository,
          path: filePath,
          ref: req.params.branch
        })
        expect(response.content).toEqual(parsedConfig)
        expect(response.file).toEqual(fileContents)
      })
    })

    test('reads a JSON file and returns its parsed contents', () => {
      const filePath = 'path/to/file.json'
      const parsedConfig = yaml.safeLoad(sampleData.config2, 'utf8')
      const mockReposGetContents = jest.fn(() => Promise.resolve({
        data: {
          content: btoa(sampleData.config2)
        }
      }))

      jest.mock('@octokit/rest', () =>
        _ => ({
          authenticate: jest.fn(),
          repos: {
            getContents: mockReposGetContents
          }
        })
      )

      const GitHub = require('./../../../lib/GitHub')
      const githubInstance = new GitHub(req.params)

      return githubInstance.readFile(filePath).then(contents => {
        expect(mockReposGetContents.mock.calls[0][0]).toEqual({
          owner: req.params.username,
          repo: req.params.repository,
          path: filePath,
          ref: req.params.branch
        })
        expect(contents).toEqual(parsedConfig)
      })
    })

    test('reads a JSON file and returns its parsed and raw contents if `getFullResponse` is `true`', () => {
      const fileContents = {
        content: btoa(sampleData.config2)
      }
      const filePath = 'path/to/file.json'
      const parsedConfig = yaml.safeLoad(sampleData.config2, 'utf8')
      const mockReposGetContents = jest.fn(() => Promise.resolve({
        data: fileContents
      }))

      jest.mock('@octokit/rest', () =>
        _ => ({
          authenticate: jest.fn(),
          repos: {
            getContents: mockReposGetContents
          }
        })
      )

      const GitHub = require('./../../../lib/GitHub')
      const githubInstance = new GitHub(req.params)

      return githubInstance.readFile(filePath, true).then(response => {
        expect(mockReposGetContents.mock.calls[0][0]).toEqual({
          owner: req.params.username,
          repo: req.params.repository,
          path: filePath,
          ref: req.params.branch
        })
        expect(response.content).toEqual(parsedConfig)
        expect(response.file).toEqual(fileContents)
      })
    })
  })

  describe('writeFile', () => {
    test('creates a file on the given branch using the commit title provided', () => {
      const options = {
        branch: 'master',
        commitTitle: 'Adds a new file',
        content: 'This is a new file',
        path: 'path/to/file.txt'
      }
      const mockReposCreateFile = jest.fn(() => Promise.resolve({
        data: null
      }))

      jest.mock('@octokit/rest', () =>
        _ => ({
          authenticate: jest.fn(),
          repos: {
            createFile: mockReposCreateFile
          }
        })
      )

      const GitHub = require('./../../../lib/GitHub')
      const githubInstance = new GitHub(req.params)

      return githubInstance.writeFile(
        options.path,
        options.content,
        options.branch,
        options.commitTitle
      ).then(response => {
        expect(mockReposCreateFile).toHaveBeenCalledTimes(1)
        expect(mockReposCreateFile.mock.calls[0][0]).toEqual({
          owner: req.params.username,
          repo: req.params.repository,
          path: options.path,
          content: btoa(options.content),
          message: options.commitTitle,
          branch: options.branch
        })
      })
    })

    test('creates a file using the branch present in the request, if one is not provided to the method, and the default commit title', () => {
      const mockReposCreateFile = jest.fn(() => Promise.resolve({
        data: null
      }))

      jest.mock('@octokit/rest', () =>
        _ => ({
          authenticate: jest.fn(),
          repos: {
            createFile: mockReposCreateFile
          }
        })
      )

      const GitHub = require('./../../../lib/GitHub')
      const githubInstance = new GitHub(req.params)
      const options = {
        content: 'This is a new file',
        commitTitle: 'Add Staticman file',
        path: 'path/to/file.txt'
      }

      return githubInstance.writeFile(
        options.path,
        options.content
      ).then(response => {
        expect(mockReposCreateFile.mock.calls[0][0]).toEqual({
          owner: req.params.username,
          repo: req.params.repository,
          path: options.path,
          content: btoa(options.content),
          message: options.commitTitle,
          branch: req.params.branch
        })
      })
    })

    test('returns an error object if the save operation fails', () => {
      jest.mock('@octokit/rest', () =>
        _ => ({
          authenticate: jest.fn(),
          repos: {
            createFile: () => Promise.reject()
          }
        })
      )

      const GitHub = require('./../../../lib/GitHub')
      const githubInstance = new GitHub(req.params)
      const options = {
        branch: 'master',
        commitTitle: 'Adds a new file',
        content: 'This is a new file',
        path: 'path/to/file.txt'
      }

      return githubInstance.writeFile(
        options.path,
        options.content,
        options.branch,
        options.commitTitle
      ).catch(err => {
        expect(err).toEqual({
          _smErrorCode: 'GITHUB_WRITING_FILE'
        })
      })
    })
  })

  describe('writeFileAndSendReview', () => {
    test('writes a file to a new branch and sends a PR to the base branch provided, using the given title and body for the commit/PR', () => {
      const options = {
        commitBody: 'This is a very cool file indeed...',
        commitTitle: 'Adds a new file',
        content: 'This is a new file',
        name: 'file.txt',
        newBranch: 'staticman_123456789',
        path: 'path/to/file.txt',
        sha: '7fd1a60b01f91b314f59955a4e4d4e80d8edf11d'
      }
      const mockCreatePullRequest = jest.fn(() => Promise.resolve({
        data: {
          number: 123
        }
      }))
      const mockCreateReference = jest.fn(() => Promise.resolve({
        data: {
          ref: `refs/heads/${options.newBranch}`
        }
      }))
      const mockGetBranch = jest.fn(() => Promise.resolve({
        data: {
          commit: {
            sha: options.sha
          }
        }
      }))

      jest.mock('@octokit/rest', () =>
        _ => ({
          authenticate: jest.fn(),
          gitdata: {
            createReference: mockCreateReference
          },
          repos: {
            createFile: () => Promise.resolve({
              data: null
            }),
            getBranch: mockGetBranch
          },
          pullRequests: {
            create: mockCreatePullRequest
          }
        })
      )

      const GitHub = require('./../../../lib/GitHub')
      const githubInstance = new GitHub(req.params)

      return githubInstance.writeFileAndSendReview(
        options.path,
        options.content,
        options.newBranch,
        options.commitTitle,
        options.commitBody
      ).then(response => {
        expect(mockCreatePullRequest.mock.calls[0][0]).toEqual({
          owner: req.params.username,
          repo: req.params.repository,
          title: options.commitTitle,
          head: options.newBranch,
          base: req.params.branch,
          body: options.commitBody
        })
        expect(mockCreateReference.mock.calls[0][0]).toEqual({
          owner: req.params.username,
          repo: req.params.repository,
          ref: `refs/heads/${options.newBranch}`,
          sha: options.sha
        })
        expect(mockGetBranch.mock.calls[0][0]).toEqual({
          owner: req.params.username,
          repo: req.params.repository,
          branch: req.params.branch
        })
      })
    })

    test('returns an error if any of the API calls fail', () => {
      jest.mock('@octokit/rest', () =>
        _ => ({
          authenticate: jest.fn(),
          repos: {
            createFile: () => Promise.resolve(),
            getBranch: () => Promise.reject()
          }
        })
      )

      const GitHub = require('./../../../lib/GitHub')
      const githubInstance = new GitHub(req.params)
      const options = {
        commitBody: '',
        commitTitle: 'Add Staticman file',
        content: 'This is a new file',
        name: 'file.txt',
        newBranch: 'staticman_123456789',
        path: 'path/to/file.txt',
        sha: '7fd1a60b01f91b314f59955a4e4d4e80d8edf11d'
      }

      return githubInstance.writeFileAndSendReview(
        options.path,
        options.content,
        options.newBranch,
        options.commitTitle,
        options.commitBody
      ).catch(err => {
        expect(err).toEqual({
          _smErrorCode: 'GITHUB_CREATING_PR'
        })
      })
    })
  })

  describe('getCurrentUser', () => {
    test('returns the current authenticated user', () => {
      const mockUser = {
        login: 'johndoe',
        email: 'johndoe@test.com',
        name: 'John Doe'
      }

      jest.mock('@octokit/rest', () =>
        _ => ({
          authenticate: jest.fn(),
          users: {
            getAuthenticated: () => Promise.resolve({data: mockUser})
          }
        })
      )

      const GitHub = require('./../../../lib/GitHub')
      const githubInstance = new GitHub(req.params)

      return githubInstance.getCurrentUser().then((user) => {
        expect(user).toEqual(new User('github', 'johndoe', 'johndoe@test.com', 'John Doe'))
      })
    })

    test('throws an error if unable to retrieve the current unauthenticated user', () => {
      jest.mock('@octokit/rest', () =>
        _ => ({
          authenticate: jest.fn(),
          users: {
            getAuthenticated: () => Promise.reject()
          }
        })
      )

      const GitHub = require('./../../../lib/GitHub')
      const githubInstance = new GitHub(req.params)

      return githubInstance.getCurrentUser().catch((err) => {
        expect(err).toEqual({
          _smErrorCode: 'GITHUB_GET_USER'
        })
      })
    })
  })
})
