const config = require('./../../../config')
const mockHelpers = require('./../../helpers')
const nock = require('nock')
const sampleData = require('./../../helpers/sampleData')
const yaml = require('js-yaml')

let req, res

beforeEach(() => {
  jest.resetModules()

  req = mockHelpers.getMockRequest()
  res = mockHelpers.getMockResponse()
})

describe('GitHub interface', () => {
  test('initialises the GitHub API wrapper', () => {
    const GitHub = require('./../../../lib/GitHub')
    const githubInstance = new GitHub(req.params)

    expect(githubInstance.api).toBeDefined()
  })

  test('authenticates with the GitHub API using a personal access token', () => {
    const token = config.get('githubToken')
    const GitHub = require('./../../../lib/GitHub')
    const githubInstance = new GitHub(req.params)
    const spy = jest.spyOn(githubInstance.api, 'authenticate')

    githubInstance.authenticateWithToken(token)

    expect(spy.mock.calls[0][0]).toEqual({
      type: 'oauth',
      token
    })
  })

  test('authenticates with the GitHub API using a temporary access code', () => {
    const accessToken = 'asdfghjkl'
    const clientId = '123456789'
    const clientSecret = '1q2w3e4r5t6y7u8i9o'
    const code = 'abcdefghijklmnopqrst'

    nock(/github\.com/)
      .post('/login/oauth/access_token')
      .query({
        client_id: clientId,
        client_secret: clientSecret,
        code
      })
      .reply(200, {
        access_token: accessToken
      })

    const GitHub = require('./../../../lib/GitHub')
    const githubInstance = new GitHub(req.params)
    const spy = jest.spyOn(githubInstance.api, 'authenticate')

    return githubInstance.authenticateWithCode(
      code,
      clientId,
      clientSecret
    ).then(() => {
      expect(spy.mock.calls[0][0]).toEqual({
        type: 'token',
        token: accessToken
      })
    })
  })

  describe('readFile', () => {
    test('reads a file and returns its contents', () => {
      const fileContents = 'This is a text file!'
      const filePath = 'path/to/file.txt'
      const mockReposGetContent = jest.fn(() => Promise.resolve({
        content: btoa(fileContents)
      }))

      jest.mock('github', () => {
        const GithubApi = function () {}

        GithubApi.prototype.authenticate = jest.fn()
        GithubApi.prototype.repos = {
          getContent: mockReposGetContent
        }

        return GithubApi
      })

      const GitHub = require('./../../../lib/GitHub')
      const githubInstance = new GitHub(req.params)
      
      return githubInstance.readFile(filePath).then(contents => {
        expect(mockReposGetContent.mock.calls[0][0]).toEqual({
          user: req.params.username,
          repo: req.params.repository,
          path: filePath,
          ref: req.params.branch
        })
      })
    })

    test('returns an error if GitHub API call errors', () => {
      const filePath = 'path/to/file.yml'
      const mockReposGetContent = jest.fn(() => Promise.reject())

      jest.mock('github', () => {
        const GithubApi = function () {}

        GithubApi.prototype.authenticate = jest.fn()
        GithubApi.prototype.repos = {
          getContent: mockReposGetContent
        }

        return GithubApi
      })

      const GitHub = require('./../../../lib/GitHub')
      const githubInstance = new GitHub(req.params)

      return githubInstance.readFile(filePath).catch(err => {
        expect(mockReposGetContent.mock.calls[0][0]).toEqual({
          user: req.params.username,
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
      const mockReposGetContent = jest.fn(() => Promise.resolve({
        content: btoa(fileContents)
      }))

      jest.mock('github', () => {
        const GithubApi = function () {}

        GithubApi.prototype.authenticate = jest.fn()
        GithubApi.prototype.repos = {
          getContent: mockReposGetContent
        }

        return GithubApi
      })

      const GitHub = require('./../../../lib/GitHub')
      const githubInstance = new GitHub(req.params)

      return githubInstance.readFile(filePath).catch(err => {
        expect(mockReposGetContent.mock.calls[0][0]).toEqual({
          user: req.params.username,
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
      const mockReposGetContent = jest.fn(() => Promise.resolve({
        content: btoa(sampleData.config1)
      }))

      jest.mock('github', () => {
        const GithubApi = function () {}

        GithubApi.prototype.authenticate = jest.fn()
        GithubApi.prototype.repos = {
          getContent: mockReposGetContent
        }

        return GithubApi
      })

      const GitHub = require('./../../../lib/GitHub')
      const githubInstance = new GitHub(req.params)

      return githubInstance.readFile(filePath).then(contents => {
        expect(mockReposGetContent.mock.calls[0][0]).toEqual({
          user: req.params.username,
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
      const mockReposGetContent = jest.fn(() => Promise.resolve(fileContents))

      jest.mock('github', () => {
        const GithubApi = function () {}

        GithubApi.prototype.authenticate = jest.fn()
        GithubApi.prototype.repos = {
          getContent: mockReposGetContent
        }

        return GithubApi
      })

      const GitHub = require('./../../../lib/GitHub')
      const githubInstance = new GitHub(req.params)

      return githubInstance.readFile(filePath, true).then(response => {
        expect(mockReposGetContent.mock.calls[0][0]).toEqual({
          user: req.params.username,
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
      const mockReposGetContent = jest.fn(() => Promise.resolve({
        content: btoa(sampleData.config2)
      }))

      jest.mock('github', () => {
        const GithubApi = function () {}

        GithubApi.prototype.authenticate = jest.fn()
        GithubApi.prototype.repos = {
          getContent: mockReposGetContent
        }

        return GithubApi
      })

      const GitHub = require('./../../../lib/GitHub')
      const githubInstance = new GitHub(req.params)
      
      return githubInstance.readFile(filePath).then(contents => {
        expect(mockReposGetContent.mock.calls[0][0]).toEqual({
          user: req.params.username,
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
      const mockReposGetContent = jest.fn(() => Promise.resolve(fileContents))

      jest.mock('github', () => {
        const GithubApi = function () {}

        GithubApi.prototype.authenticate = jest.fn()
        GithubApi.prototype.repos = {
          getContent: mockReposGetContent
        }

        return GithubApi
      })

      const GitHub = require('./../../../lib/GitHub')
      const githubInstance = new GitHub(req.params)

      return githubInstance.readFile(filePath, true).then(response => {
        expect(mockReposGetContent.mock.calls[0][0]).toEqual({
          user: req.params.username,
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
      const mockReposCreateFile = jest.fn(() => Promise.resolve())

      jest.mock('github', () => {
        const GithubApi = function () {}

        GithubApi.prototype.authenticate = jest.fn()
        GithubApi.prototype.repos = {
          createFile: mockReposCreateFile
        }

        return GithubApi
      })

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
          user: req.params.username,
          repo: req.params.repository,
          path: options.path,
          content: new Buffer(options.content).toString('base64'),
          message: options.commitTitle,
          branch: options.branch
        })
      })
    })

    test('creates a file using the branch present in the request, if one is not provided to the method, and the default commit title', () => {
      const mockReposCreateFile = jest.fn(() => Promise.resolve())

      jest.mock('github', () => {
        const GithubApi = function () {}

        GithubApi.prototype.authenticate = jest.fn()
        GithubApi.prototype.repos = {
          createFile: mockReposCreateFile
        }

        return GithubApi
      })

      const GitHub = require('./../../../lib/GitHub')
      const githubInstance = new GitHub(req.params)
      const options = {
        content: 'This is a new file',
        commitTitle: 'New Staticman data',
        path: 'path/to/file.txt'
      }

      return githubInstance.writeFile(
        options.path,
        options.content,
        options.branch,
        options.commitTitle
      ).then(response => {
        expect(mockReposCreateFile.mock.calls[0][0]).toEqual({
          user: req.params.username,
          repo: req.params.repository,
          path: options.path,
          content: new Buffer(options.content).toString('base64'),
          message: options.commitTitle,
          branch: req.params.branch
        })
      })
    })

    test('returns an error object if the save operation fails', () => {
      jest.mock('github', () => {
        const GithubApi = function () {}

        GithubApi.prototype.authenticate = jest.fn()
        GithubApi.prototype.repos = {
          createFile: () => Promise.reject()
        }

        return GithubApi
      })

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
        number: 123
      }))
      const mockCreateReference = jest.fn(() => Promise.resolve({
        ref: `refs/heads/${options.newBranch}`
      }))
      const mockGetBranch = jest.fn(() => Promise.resolve({
        commit: {
          sha: options.sha
        }
      }))

      jest.mock('github', () => {
        const GithubApi = function () {}

        GithubApi.prototype.authenticate = jest.fn()
        GithubApi.prototype.gitdata = {
          createReference: mockCreateReference
        }
        GithubApi.prototype.pullRequests = {
          create: mockCreatePullRequest
        }
        GithubApi.prototype.repos = {
          createFile: () => Promise.resolve(),
          getBranch: mockGetBranch
        }

        return GithubApi
      })

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
          user: req.params.username,
          repo: req.params.repository,
          title: options.commitTitle,
          head: options.newBranch,
          base: req.params.branch,
          body: options.commitBody
        })
        expect(mockCreateReference.mock.calls[0][0]).toEqual({
          user: req.params.username,
          repo: req.params.repository,
          ref: `refs/heads/${options.newBranch}`,
          sha: options.sha
        })
        expect(mockGetBranch.mock.calls[0][0]).toEqual({
          user: req.params.username,
          repo: req.params.repository,
          branch: req.params.branch
        })
      })
    })

    test('returns an error if any of the API calls fail', () => {
      jest.mock('github', () => {
        const GithubApi = function () {}

        GithubApi.prototype.authenticate = jest.fn()
        GithubApi.prototype.repos = {
          createFile: () => Promise.resolve(),
          getBranch: () => Promise.reject()
        }

        return GithubApi
      })

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
})
