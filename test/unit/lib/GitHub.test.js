const mockHelpers = require('./../../helpers')
const sampleData = require('./../../helpers/sampleData')
const User = require('../../../lib/models/User')
const yaml = require('js-yaml')
const GitHub = require('./../../../lib/GitHub')
const nock = require('nock')
const config = require('../../../config')

let req

const btoa = contents => Buffer.from(contents).toString('base64')

beforeEach(() => {
  jest.resetModules()
  jest.restoreAllMocks()

  req = mockHelpers.getMockRequest()
})

describe('GitHub interface', () => {
  test('initialises the GitHub API wrapper', async () => {
    const githubInstance = await new GitHub(req.params)
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

    const githubInstance = await new GitHub(req.params)
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

    const githubInstance = await new GitHub({
      ...req.params,
      oauthToken: 'test-oauth-token'
    })
    await githubInstance.api.repos.listInvitationsForAuthenticatedUser();
    expect(scope.isDone()).toBe(true)
  })

  test('throws error if no personal access token or OAuth token is provided', async () => {
    jest.spyOn(config, 'get').mockImplementation(() => null)
    expect.assertions(1)
    try {
      await new GitHub({})
    } catch (e) {
      expect(e.message).toBe('Require an `oauthToken` or `token` option')
    }
  })

  describe('readFile', () => {
    test('reads a file and returns its contents', async () => {
      const filePath = 'path/to/file.yml'
      const parsedConfig = yaml.safeLoad(sampleData.config1, 'utf8')

      const scope = nock((/api\.github\.com/), {
        reqheaders: {
          authorization: 'token '.concat('1q2w3e4r')
        }
      })
        .get('/repos/johndoe/foobar/contents/path/to/file.yml?ref=master')
        .reply(200, {
          content: btoa(sampleData.config1)
        })

      const githubInstance = await new GitHub(req.params)

      const contents = await githubInstance.readFile(filePath)
      expect(contents).toEqual(parsedConfig)
      expect(scope.isDone()).toBe(true)
    })

    test('returns an error if GitHub API call errors', async () => {
      const filePath = 'path/to/file.yml'
      const parsedConfig = yaml.safeLoad(sampleData.config1, 'utf8')

      const scope = nock((/api\.github\.com/), {
        reqheaders: {
          authorization: 'token '.concat('1q2w3e4r')
        }
      })
        .get('/repos/johndoe/foobar/contents/path/to/file.yml?ref=master')
        .replyWithError('Error encountered oh no')

      const githubInstance = await new GitHub(req.params)

      expect.assertions(2)

      try {
        await githubInstance.readFile(filePath)
      } catch (err) {
        expect(err._smErrorCode).toEqual('GITHUB_READING_FILE')
      }

      expect(scope.isDone()).toBe(true)
    })

    test('returns an error if the config file cannot be read', async () => {
      const filePath = 'path/to/file.yml'
      const githubInstance = await new GitHub(req.params)

      expect.assertions(2)

      try {
        await githubInstance.readFile(filePath)
      } catch (err) {
        expect(err._smErrorCode).toEqual('GITHUB_READING_FILE')
        expect(err.message).toBeDefined()
      }
    })

    test('returns an error if the config file cannot be parsed', async () => {
        const scope = nock((/api\.github\.com/), {
          reqheaders: {
            authorization: 'token '.concat('1q2w3e4r')
          }
        })
          .get('/repos/johndoe/foobar/contents/path/to/file.yml?ref=master')
          .reply(200, {
            content: btoa(sampleData.configInvalidYML)
          })

        const filePath = 'path/to/file.yml'
        const githubInstance = await new GitHub(req.params)

        expect.assertions(3)

        try {
          await githubInstance.readFile(filePath)
        } catch (err) {
          expect(err._smErrorCode).toEqual('PARSING_ERROR')
          expect(err.message).toBeDefined()
        }

        expect(scope.isDone()).toBe(true)
      })

    test('reads a YAML file and returns its parsed contents', async () => {
      const filePath = 'path/to/file.yml'
      const parsedConfig = yaml.safeLoad(sampleData.config1, 'utf8')

      const scope = nock((/api\.github\.com/), {
        reqheaders: {
          authorization: 'token '.concat('1q2w3e4r')
        }
      })
        .get('/repos/johndoe/foobar/contents/path/to/file.yml?ref=master')
        .reply(200, {
          content: btoa(sampleData.config1)
        })

      const githubInstance = await new GitHub(req.params)

      const contents = await githubInstance.readFile(filePath)
      expect(contents).toEqual(parsedConfig)
      expect(scope.isDone()).toBe(true)
    })

    test('reads a YAML file and returns its parsed and raw contents if `getFullResponse` is `true`', async () => {
      const parsedConfig = yaml.safeLoad(sampleData.config1, 'utf8')
      const filePath = 'path/to/file.yml'

      const scope = nock((/api\.github\.com/), {
        reqheaders: {
          authorization: 'token '.concat('1q2w3e4r')
        }
      })
        .get('/repos/johndoe/foobar/contents/path/to/file.yml?ref=master')
        .reply(200, {
          content: btoa(sampleData.config1)
        })

      const githubInstance = await new GitHub(req.params)

      const response = await githubInstance.readFile(filePath, true)

      expect(response.content).toEqual(parsedConfig)
      expect(scope.isDone()).toBe(true)
    })

    test('reads a JSON file and returns its parsed contents', async () => {
      const filePath = 'path/to/file.json'
      const parsedConfig = yaml.safeLoad(sampleData.config2, 'utf8')

      const scope = nock((/api\.github\.com/), {
        reqheaders: {
          authorization: 'token '.concat('1q2w3e4r')
        }
      })
        .get('/repos/johndoe/foobar/contents/path/to/file.json?ref=master')
        .reply(200, {
          content: btoa(sampleData.config2)
        })

      const githubInstance = await new GitHub(req.params)

      const contents = await githubInstance.readFile(filePath)

      expect(contents).toEqual(parsedConfig)
      expect(scope.isDone()).toBe(true)
    })

    test('reads a JSON file and returns its parsed and raw contents if `getFullResponse` is `true`', async () => {
      const fileContents = {
        content: btoa(sampleData.config2)
      }
      const filePath = 'path/to/file.json'
      const parsedConfig = yaml.safeLoad(sampleData.config2, 'utf8')

      const scope = nock((/api\.github\.com/), {
        reqheaders: {
          authorization: 'token '.concat('1q2w3e4r')
        }
      })
        .get('/repos/johndoe/foobar/contents/path/to/file.json?ref=master')
        .reply(200, {
          content: btoa(sampleData.config2)
        })

      const githubInstance = await new GitHub(req.params)

      const response = await githubInstance.readFile(filePath, true)
      expect(response.content).toEqual(parsedConfig)
      expect(response.file).toEqual(fileContents)
      expect(scope.isDone()).toBe(true)
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

      const githubInstance = await new GitHub(req.params)

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

      const githubInstance = await new GitHub(req.params)

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
        .replyWithError('An error')

      const githubInstance = await new GitHub(req.params)

      expect.assertions(2)

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

      expect.assertions(5)

      const githubInstance = await new GitHub(req.params)

      const data = await githubInstance.writeFileAndSendReview(
        options.path,
        options.content,
        options.newBranch,
        options.commitTitle,
        options.commitBody
      )

      expect(data).toEqual({"id": 1})

      expect(branchScope.isDone()).toBe(true)
      expect(refsScope.isDone()).toBe(true)
      expect(fileScope.isDone()).toBe(true)
      expect(pullScope.isDone()).toBe(true)
    })

    // TODO: Figure out why this works with no mocks
    test('returns an error if any of the API calls fail', async () => {
      const options = {
        commitBody: '',
        commitTitle: 'Add Staticman file',
        content: 'This is a new file',
        name: 'file.txt',
        newBranch: 'staticman_123456789',
        path: 'path/to/file.txt',
        sha: '7fd1a60b01f91b314f59955a4e4d4e80d8edf11d'
      }

      const scope = nock((/api\.github\.com/), {
        reqheaders: {
          authorization: 'token '.concat('1q2w3e4r')
        }
      })
        .get('/repos/johndoe/foobar/branches/master')
        .replyWithError('An error, oh no.')

      const githubInstance = await new GitHub(req.params)

      expect.assertions(2)

      try {
        await githubInstance.writeFileAndSendReview(
          options.path,
          options.content,
          options.newBranch,
          options.commitTitle,
          options.commitBody
        )
      } catch (err) {
        expect(err._smErrorCode).toEqual('GITHUB_CREATING_PR')
      }
      expect(scope.isDone()).toBe(true)
    })
  })

  describe('getCurrentUser', () => {
    test('returns the current authenticated user', async () => {
      const scope = nock((/api\.github\.com/), {
        reqheaders: {
          authorization: 'token '.concat('1q2w3e4r')
        }
      })
        .get('/user')
        .reply(200, {
          login: 'johndoe',
          email: 'johndoe@test.com',
          name: 'John Doe'
        })

      const githubInstance = await new GitHub(req.params)

      const user = await githubInstance.getCurrentUser()
      expect(user).toEqual(new User('github', 'johndoe', 'johndoe@test.com', 'John Doe'))
      expect(scope.isDone()).toBe(true)
    })

    test('throws an error if unable to retrieve the current unauthenticated user', async () => {
      const scope = nock((/api\.github\.com/), {
        reqheaders: {
          authorization: 'token '.concat('1q2w3e4r')
        }
      })
        .get('/user')
        .replyWithError('Oops, an error')

      const githubInstance = await new GitHub(req.params)

      expect.assertions(2)

      try {
        await githubInstance.getCurrentUser()
      } catch (err) {
        expect(err._smErrorCode).toEqual('GITHUB_GET_USER')
      }
      expect(scope.isDone()).toBe(true)
    })
  })
})
