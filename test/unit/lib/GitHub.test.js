const mockHelpers = require('./../../helpers')
const sampleData = require('./../../helpers/sampleData')
const User = require('../../../lib/models/User')
const yaml = require('js-yaml')
const GitHub = require('./../../../lib/GitHub')
const nock = require('nock')

let req

const btoa = contents => Buffer.from(contents).toString('base64')

beforeEach(() => {
  jest.resetModules()

  req = mockHelpers.getMockRequest()
})

describe('GitHub interface', () => {
  test('initialises the GitHub API wrapper', () => {
    const githubInstance = new GitHub(req.params)
    expect(githubInstance.api).toBeDefined()
  })

  test('authenticates with the GitHub API using a personal access token', async () => {
    const scope = nock((/api\.github\.com/), {
      reqheaders: {
        authorization: 'token '.concat('1q2w3e4r')
      }
    })
      .get('/user/repository_invitations')
      .reply(200)

    const githubInstance = new GitHub(req.params)
    await githubInstance.api.repos.listInvitationsForAuthenticatedUser();
    expect(scope.isDone()).toBe(true)
  })

  test('authenticates with the GitHub API using an OAuth token', async () => {
    const scope = nock((/api\.github\.com/), {
      reqheaders: {
        authorization: 'token '.concat('test-oauth-token')
      }
    })
      .get('/user/repository_invitations')
      .reply(200)

    const githubInstance = new GitHub({
      ...req.params,
      oauthToken: 'test-oauth-token'
    })
    await githubInstance.api.repos.listInvitationsForAuthenticatedUser();
    expect(scope.isDone()).toBe(true)
  })

  test('throws error if no personal access token or OAuth token is provided', () => {
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
    test('creates a file on the given branch using the commit title provided', async () => {
      const options = {
        branch: 'master',
        commitTitle: 'Adds a new file',
        content: 'This is a new file',
        path: 'path/to/file.txt'
      }

      const scope = nock((/api\.github\.com/), {
        reqheaders: {
          authorization: 'token '.concat('1q2w3e4r')
        }
      })
        .put('/repos/johndoe/foobar/contents/path/to/file.txt')
        .reply(200, {
          number: 123
        })

      const githubInstance = new GitHub(req.params)

      await githubInstance.writeFile(
        options.path,
        options.content,
        options.branch,
        options.commitTitle
      )

      expect(scope.isDone()).toBe(true)
    })

    test('creates a file using the branch present in the request, if one is not provided to the method, and the default commit title', async () => {
      const options = {
        content: 'This is a new file',
        commitTitle: 'Add Staticman file',
        path: 'path/to/file.txt'
      }

      const scope = nock((/api\.github\.com/), {
        reqheaders: {
          authorization: 'token '.concat('1q2w3e4r')
        }
      })
        .put('/repos/johndoe/foobar/contents/path/to/file.txt')
        .reply(200, {
          number: 123
        })

      const githubInstance = new GitHub(req.params)

      await githubInstance.writeFile(
        options.path,
        options.content
      )

      expect(scope.isDone()).toBe(true)
    })

    test('returns an error object if the save operation fails', async () => {
      const options = {
        branch: 'master',
        commitTitle: 'Adds a new file',
        content: 'This is a new file',
        path: 'path/to/file.txt'
      }

      const scope = nock((/api\.github\.com/), {
        reqheaders: {
          authorization: 'token '.concat('1q2w3e4r')
        }
      })
        .put('/repos/johndoe/foobar/contents/path/to/file.txt')
        .reply(200, {
          number: 123
        })

      const githubInstance = new GitHub(req.params)

      try {
        await githubInstance.writeFile(
        options.path,
        options.content,
        options.branch,
        options.commitTitle
      )
        } catch (err) {
          expect(err).toEqual({
            _smErrorCode: 'GITHUB_WRITING_FILE'
          })
        }

      expect(scope.isDone()).toBe(true)
    })
  })

  describe('writeFileAndSendReview', () => {
    test('writes a file to a new branch and sends a PR to the base branch provided, using the given title and body for the commit/PR', async () => {
      const options = {
        commitBody: 'This is a very cool file indeed...',
        commitTitle: 'Adds a new file',
        content: 'This is a new file',
        name: 'file.txt',
        newBranch: 'staticman_123456789',
        path: 'path/to/file.txt',
        sha: '7fd1a60b01f91b314f59955a4e4d4e80d8edf11d'
      }

      const branchScope = nock((/api\.github\.com/), {
        reqheaders: {
          authorization: 'token '.concat('1q2w3e4r')
        }
      })
        .get('/repos/johndoe/foobar/branches/master')
        .reply(200, {
          commit: {
            sha: options.sha
          }
        })

      const refsScope = nock((/api\.github\.com/), {
        reqheaders: {
          authorization: 'token '.concat('1q2w3e4r')
        }
      })
        .post('/repos/johndoe/foobar/git/refs')
        .reply(200, {
          ref: `refs/heads/${options.newBranch}`
        })

      const fileScope = nock((/api\.github\.com/), {
        reqheaders: {
          authorization: 'token '.concat('1q2w3e4r')
        }
      })
        .put('/repos/johndoe/foobar/contents/path/to/file.txt')
        .reply(200, {
          number: 123
        })

      const pullScope = nock((/api\.github\.com/), {
        reqheaders: {
          authorization: 'token '.concat('1q2w3e4r')
        }
      })
        .post('/repos/johndoe/foobar/pulls')
        .reply(200, {
          id: 1
        })

      const githubInstance = new GitHub(req.params)

      await githubInstance.writeFileAndSendReview(
        options.path,
        options.content,
        options.newBranch,
        options.commitTitle,
        options.commitBody
      )

      // TODO: revaluate this
      expect(branchScope.isDone()).toBe(true)
      expect(refsScope.isDone()).toBe(true)
      expect(fileScope.isDone()).toBe(true)
      expect(pullScope.isDone()).toBe(true)
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
