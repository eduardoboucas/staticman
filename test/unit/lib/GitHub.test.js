const mockHelpers = require('./../../helpers')
const sampleData = require('./../../helpers/sampleData')
const User = require('../../../lib/models/User')
const yaml = require('js-yaml')
const GitHub = require('./../../../lib/GitHub')
const fetchMock = require('fetch-mock')
const config = require('../../../config')

let req

const btoa = contents => Buffer.from(contents).toString('base64')

beforeEach(() => {
  jest.resetModules()
  jest.restoreAllMocks()
  fetchMock.reset()

  req = mockHelpers.getMockRequest()
})

describe('GitHub interface', () => {
  test('initialises the GitHub API wrapper', async () => {
    const githubInstance = await new GitHub(req.params)
    expect(githubInstance.api).toBeDefined()
  })

  test('authenticates with the GitHub API using a personal access token', async () => {
    fetchMock.get({
      url: /api\.github\.com\/user\/repository_invitations/, 
      headers: {
        authorization: 'token '.concat('1q2w3e4r')
      }
    },
    {
      status: 200
    })

    const githubInstance = await new GitHub(req.params)
    await githubInstance.api.repos.listInvitationsForAuthenticatedUser();
    expect(fetchMock.done()).toBe(true)
  })

  test('authenticates with the GitHub API using an OAuth token', async () => {
    fetchMock.get({
      url: /api\.github\.com\/user\/repository_invitations/, 
      headers: {
        authorization: 'token '.concat('test-oauth-token')
      }
    },
    {
      status: 200
    })

    const githubInstance = await new GitHub({
      ...req.params,
      oauthToken: 'test-oauth-token'
    })
    await githubInstance.api.repos.listInvitationsForAuthenticatedUser();
    expect(fetchMock.done()).toBe(true)
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
      const parsedConfig = yaml.load(sampleData.config1, 'utf8')

      fetchMock.get({
        url: /api\.github\.com\/repos\/johndoe\/foobar\/contents\/path%2Fto%2Ffile\.yml/,
        query: {
          ref: 'master'
        },
        headers: {
          authorization: 'token '.concat('1q2w3e4r')
        }
      },
      {
        body: {
          content: btoa(sampleData.config1)
        },
        status: 200
      })

      const githubInstance = await new GitHub(req.params)

      const contents = await githubInstance.readFile(filePath)
      expect(contents).toEqual(parsedConfig)
      expect(fetchMock.done()).toBe(true)
    })

    test('returns an error if GitHub API call errors', async () => {
      const filePath = 'path/to/file.yml'
      const parsedConfig = yaml.load(sampleData.config1, 'utf8')

      fetchMock.get({
        url: /api\.github\.com\/repos\/johndoe\/foobar\/contents\/path%2Fto%2Ffile\.yml/,
        query: {
          ref: 'master'
        },
        headers: {
          authorization: 'token '.concat('1q2w3e4r')
        }
      },
      {
        body: 'Error encountered oh no',
        status: 500
      })

      const githubInstance = await new GitHub(req.params)

      expect.assertions(2)

      try {
        await githubInstance.readFile(filePath)
      } catch (err) {
        expect(err._smErrorCode).toEqual('GITHUB_READING_FILE')
      }

      expect(fetchMock.done()).toBe(true)
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
      fetchMock.get({
        url: /api\.github\.com\/repos\/johndoe\/foobar\/contents\/path%2Fto%2Ffile\.yml/,
        query: {
          ref: 'master'
        },
        headers: {
          authorization: 'token '.concat('1q2w3e4r')
        }
      },
      {
        body: {
          content: btoa(sampleData.configInvalidYML)
        },
        status: 200
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

        expect(fetchMock.done()).toBe(true)
      })

    test('reads a YAML file and returns its parsed contents', async () => {
      const filePath = 'path/to/file.yml'
      const parsedConfig = yaml.load(sampleData.config1, 'utf8')

      fetchMock.get({
        url: /api\.github\.com\/repos\/johndoe\/foobar\/contents\/path%2Fto%2Ffile\.yml/,
        query: {
          ref: 'master'
        },
        headers: {
          authorization: 'token '.concat('1q2w3e4r')
        }
      },
      {
        body: {
          content: btoa(sampleData.config1)
        },
        status: 200
      })

      const githubInstance = await new GitHub(req.params)

      const contents = await githubInstance.readFile(filePath)
      expect(contents).toEqual(parsedConfig)
      expect(fetchMock.done()).toBe(true)
    })

    test('reads a YAML file and returns its parsed and raw contents if `getFullResponse` is `true`', async () => {
      const parsedConfig = yaml.load(sampleData.config1, 'utf8')
      const filePath = 'path/to/file.yml'

      fetchMock.get({
        url: /api\.github\.com\/repos\/johndoe\/foobar\/contents\/path%2Fto%2Ffile\.yml/,
        query: {
          ref: 'master'
        },
        headers: {
          authorization: 'token '.concat('1q2w3e4r')
        }
      },
      {
        body: {
          content: btoa(sampleData.config1)
        },
        status: 200
      })

      const githubInstance = await new GitHub(req.params)

      const response = await githubInstance.readFile(filePath, true)

      expect(response.content).toEqual(parsedConfig)
      expect(fetchMock.done()).toBe(true)
    })

    test('reads a JSON file and returns its parsed contents', async () => {
      const filePath = 'path/to/file.json'
      const parsedConfig = yaml.load(sampleData.config2, 'utf8')

      fetchMock.get({
        url: /api\.github\.com\/repos\/johndoe\/foobar\/contents\/path%2Fto%2Ffile\.json/,
        query: {
          ref: 'master'
        },
        headers: {
          authorization: 'token '.concat('1q2w3e4r')
        }
      },
      {
        body: {
          content: btoa(sampleData.config2)
        },
        status: 200
      })

      const githubInstance = await new GitHub(req.params)

      const contents = await githubInstance.readFile(filePath)

      expect(contents).toEqual(parsedConfig)
      expect(fetchMock.done()).toBe(true)
    })

    test('reads a JSON file and returns its parsed and raw contents if `getFullResponse` is `true`', async () => {
      const fileContents = {
        content: btoa(sampleData.config2)
      }
      const filePath = 'path/to/file.json'
      const parsedConfig = yaml.load(sampleData.config2, 'utf8')

      fetchMock.get({
        url: /api\.github\.com\/repos\/johndoe\/foobar\/contents\/path%2Fto%2Ffile\.json/,
        query: {
          ref: 'master'
        },
        headers: {
          authorization: 'token '.concat('1q2w3e4r')
        }
      },
      {
        body: {
          content: btoa(sampleData.config2)
        },
        status: 200
      })

      const githubInstance = await new GitHub(req.params)

      const response = await githubInstance.readFile(filePath, true)
      expect(response.content).toEqual(parsedConfig)
      expect(response.file).toEqual(fileContents)
      expect(fetchMock.done()).toBe(true)
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

      fetchMock.put({
        url: /api\.github\.com\/repos\/johndoe\/foobar\/contents\/path%2Fto%2Ffile\.txt/,
        headers: {
          authorization: 'token '.concat('1q2w3e4r')
        }
      },
      {
        body: {
          number: 123
        },
        status: 200
      })

      const githubInstance = await new GitHub(req.params)

      await githubInstance.writeFile(
        options.path,
        options.content,
        options.branch,
        options.commitTitle
      )

      expect(fetchMock.done()).toBe(true)
    })

    test('creates a file using the branch present in the request, if one is not provided to the method, and the default commit title', async () => {
      const options = {
        content: 'This is a new file',
        commitTitle: 'Add Staticman file',
        path: 'path/to/file.txt'
      }

      fetchMock.put({
        url: /api\.github\.com\/repos\/johndoe\/foobar\/contents\/path%2Fto%2Ffile\.txt/,
        headers: {
          authorization: 'token '.concat('1q2w3e4r')
        }
      },
      {
        body: {
          number: 123
        },
        status: 200
      })

      const githubInstance = await new GitHub(req.params)

      await githubInstance.writeFile(
        options.path,
        options.content
      )

      expect(fetchMock.done()).toBe(true)
    })

    test('returns an error object if the save operation fails', async () => {
      const options = {
        branch: 'master',
        commitTitle: 'Adds a new file',
        content: 'This is a new file',
        path: 'path/to/file.txt'
      }

      fetchMock.put({
        url: /api\.github\.com\/repos\/johndoe\/foobar\/contents\/path%2Fto%2Ffile\.txt/,
        headers: {
          authorization: 'token '.concat('1q2w3e4r')
        }
      },
      {
        body: 'An error',
        status: 500
      })

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

      expect(fetchMock.done()).toBe(true)
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

      fetchMock.get({
        url: /api\.github\.com\/repos\/johndoe\/foobar\/branches\/master/,
        headers: {
          authorization: 'token '.concat('1q2w3e4r')
        }
      },
      {
        body: {
          commit: {
            sha: options.sha
          }
        },
        status: 200
      })
      .post({
        url: /api\.github\.com\/repos\/johndoe\/foobar\/git\/refs/,
        headers: {
          authorization: 'token '.concat('1q2w3e4r')
        }
      },
      {
        body: {
          ref: `refs/heads/${options.newBranch}`
        },
        status: 200
      })
      .put({
        url: /api\.github\.com\/repos\/johndoe\/foobar\/contents\/path%2Fto%2Ffile\.txt/,
        headers: {
          authorization: 'token '.concat('1q2w3e4r')
        }
      },
      {
        body: {
          number: 123
        },
        status: 200
      })
      .post({
        url: /api\.github\.com\/repos\/johndoe\/foobar\/pulls/,
        headers: {
          authorization: 'token '.concat('1q2w3e4r')
        }
      },
      {
        body: {
          id: 1
        },
        status: 200
      })

      expect.assertions(2)

      const githubInstance = await new GitHub(req.params)

      const data = await githubInstance.writeFileAndSendReview(
        options.path,
        options.content,
        options.newBranch,
        options.commitTitle,
        options.commitBody
      )

      expect(data).toEqual({"id": 1})

      expect(fetchMock.done()).toBe(true)
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

      fetchMock.get({
        url: /api\.github\.com\/repos\/johndoe\/foobar\/branches\/master/,
        headers: {
          authorization: 'token '.concat('1q2w3e4r')
        }
      },
      {
        body: 'An error, oh no.',
        status: 500
      })

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
      expect(fetchMock.done()).toBe(true)
    })
  })

  describe('getCurrentUser', () => {
    test('returns the current authenticated user', async () => {
      fetchMock.get({
        url: /api\.github\.com\/user/,
        headers: {
          authorization: 'token '.concat('1q2w3e4r')
        }
      },
      {
        body: {
          login: 'johndoe',
          email: 'johndoe@test.com',
          name: 'John Doe'
        },
        status: 200
      })

      const githubInstance = await new GitHub(req.params)

      const user = await githubInstance.getCurrentUser()
      expect(user).toEqual(new User('github', 'johndoe', 'johndoe@test.com', 'John Doe'))
      expect(fetchMock.done()).toBe(true)
    })

    test('throws an error if unable to retrieve the current unauthenticated user', async () => {
      fetchMock.get({
        url: /api\.github\.com\/user/,
        headers: {
          authorization: 'token '.concat('1q2w3e4r')
        }
      },
      {
        body: 'Oops, an error',
        status: 500
      })

      const githubInstance = await new GitHub(req.params)

      expect.assertions(2)

      try {
        await githubInstance.getCurrentUser()
      } catch (err) {
        expect(err._smErrorCode).toEqual('GITHUB_GET_USER')
      }
      expect(fetchMock.done()).toBe(true)
    })
  })
})
