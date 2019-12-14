const mockHelpers = require('./../../helpers')
const sampleData = require('./../../helpers/sampleData')
const User = require('../../../lib/models/User')
const yaml = require('js-yaml')
const GitLab = require('../../../lib/GitLab')
const config = require('../../../config')

let req

const btoa = contents => Buffer.from(contents).toString('base64')

beforeEach(() => {
  jest.resetModules()
  jest.restoreAllMocks()

  req = mockHelpers.getMockRequest()
  req.params.token = 'test-token'
})

describe('GitLab interface', () => {
  test('initialises the GitLab API wrapper', () => {
    const gitlab = new GitLab(req.params)

    expect(gitlab.api).toBeDefined()
  })

  test('authenticates with the GitLab API using a personal access token', () => {
    const mockConstructor = jest.fn()
    jest.mock('gitlab/dist/es5', () => {
      return {
        default: class {
          constructor (params) {
            mockConstructor(params)
          }
        }
      }
    })
 
    const GitLab = require('./../../../lib/GitLab')
    const gitlab = new GitLab(req.params) // eslint-disable-line no-unused-vars

    expect(mockConstructor.mock.calls[0][0]).toEqual({
      url: 'https://gitlab.com',
      token: 'r4e3w2q1'
    })
  })

  test('authenticates with the GitLab API using an OAuth token', () => {
    const mockConstructor = jest.fn()
    jest.mock('gitlab/dist/es5', () => {
      return {
        default: class {
          constructor (params) {
            mockConstructor(params)
          }
        }
      }
    })

    const GitLab = require('./../../../lib/GitLab')

    const oauthToken = 'test-oauth-token'
    const gitlab = new GitLab(Object.assign({}, req.params, {oauthToken})) // eslint-disable-line no-unused-vars

    expect(mockConstructor.mock.calls[0][0]).toEqual({
      url: 'https://gitlab.com',
      oauthToken: oauthToken
    })
  })

  test('throws error if no personal access token or OAuth token is provided', () => {
    jest.spyOn(config, 'get').mockImplementation(() => null)

    expect(() => new GitLab({})).toThrowError('Require an `oauthToken` or `token` option')
  })

  describe('readFile', () => {
    test('reads a file and returns its contents', () => {
      const fileContents = 'This is a text file!'
      const filePath = 'path/to/file.txt'
      const mockRepoShowFile = jest.fn(() => Promise.resolve({
        content: btoa(fileContents)
      }))

      jest.mock('gitlab/dist/es5', () => {
        return {
          default: function () {
            return {
              RepositoryFiles: {
                show: mockRepoShowFile
              }
            }
          }
        }
      })

      const GitLab = require('./../../../lib/GitLab')
      const gitlab = new GitLab(req.params)

      return gitlab.readFile(filePath).then(contents => {
        expect(mockRepoShowFile.mock.calls[0][0]).toBe(`${req.params.username}/${req.params.repository}`)
        expect(mockRepoShowFile.mock.calls[0][1]).toBe(filePath)
        expect(mockRepoShowFile.mock.calls[0][2]).toBe(req.params.branch)
      })
    })

    test('returns an error if GitLab API call errors', () => {
      const filePath = 'path/to/file.yml'
      const mockShowRepoFile = jest.fn(() => Promise.reject()) // eslint-disable-line prefer-promise-reject-errors

      jest.mock('gitlab/dist/es5', () => {
        return {
          default: function () {
            return {
              RepositoryFiles: {
                show: mockShowRepoFile
              }
            }
          }
        }
      })

      const GitLab = require('./../../../lib/GitLab')
      const gitlab = new GitLab(req.params)

      return gitlab.readFile(filePath).catch(err => {
        expect(mockShowRepoFile.mock.calls[0][0]).toBe(`${req.params.username}/${req.params.repository}`)
        expect(mockShowRepoFile.mock.calls[0][1]).toBe(filePath)
        expect(mockShowRepoFile.mock.calls[0][2]).toBe(req.params.branch)

        expect(err).toEqual({
          _smErrorCode: 'GITLAB_READING_FILE'
        })
      })
    })

    test('returns an error if parsing fails for the given file', () => {
      const fileContents = `
        foo: "bar"
        baz
      `
      const filePath = 'path/to/file.yml'
      const mockShowRepoFile = jest.fn(() => Promise.resolve({
        content: btoa(fileContents)
      }))

      jest.mock('gitlab/dist/es5', () => {
        return {
          default: function () {
            return {
              RepositoryFiles: {
                show: mockShowRepoFile
              }
            }
          }
        }
      })

      const GitLab = require('./../../../lib/GitLab')
      const gitlab = new GitLab(req.params)

      return gitlab.readFile(filePath).catch(err => {
        expect(mockShowRepoFile.mock.calls[0][0]).toBe(`${req.params.username}/${req.params.repository}`)
        expect(mockShowRepoFile.mock.calls[0][1]).toBe(filePath)
        expect(mockShowRepoFile.mock.calls[0][2]).toBe(req.params.branch)
        expect(err._smErrorCode).toBe('PARSING_ERROR')
        expect(err.message).toBeDefined()
      })
    })

    test('reads a YAML file and returns its parsed contents', () => {
      const filePath = 'path/to/file.yml'
      const parsedConfig = yaml.safeLoad(sampleData.config1, 'utf8')
      const mockShowRepoFile = jest.fn(() => Promise.resolve({
        content: btoa(sampleData.config1)
      }))

      jest.mock('gitlab/dist/es5', () => {
        return {
          default: function () {
            return {
              RepositoryFiles: {
                show: mockShowRepoFile
              }
            }
          }
        }
      })

      const GitLab = require('./../../../lib/GitLab')
      const gitlab = new GitLab(req.params)

      return gitlab.readFile(filePath).then(contents => {
        expect(mockShowRepoFile.mock.calls[0][0]).toBe(`${req.params.username}/${req.params.repository}`)
        expect(mockShowRepoFile.mock.calls[0][1]).toBe(filePath)
        expect(mockShowRepoFile.mock.calls[0][2]).toBe(req.params.branch)
        expect(contents).toEqual(parsedConfig)
      })
    })

    test('reads a YAML file and returns its parsed and raw contents if `getFullResponse` is `true`', () => {
      const parsedConfig = yaml.safeLoad(sampleData.config1, 'utf8')
      const fileContents = {
        content: btoa(sampleData.config1)
      }
      const filePath = 'path/to/file.yml'
      const mockShowRepoFile = jest.fn(() => Promise.resolve(fileContents))

      jest.mock('gitlab/dist/es5', () => {
        return {
          default: function () {
            return {
              RepositoryFiles: {
                show: mockShowRepoFile
              }
            }
          }
        }
      })

      const GitLab = require('./../../../lib/GitLab')
      const gitlab = new GitLab(req.params)

      return gitlab.readFile(filePath, true).then(response => {
        expect(response.content).toEqual(parsedConfig)
        expect(response.file).toEqual(fileContents)
      })
    })

    test('reads a JSON file and returns its parsed contents', () => {
      const filePath = 'path/to/file.json'
      const parsedConfig = yaml.safeLoad(sampleData.config2, 'utf8')
      const mockShowRepoFile = jest.fn(() => Promise.resolve({
        content: btoa(sampleData.config2)
      }))

      jest.mock('gitlab/dist/es5', () => {
        return {
          default: function () {
            return {
              RepositoryFiles: {
                show: mockShowRepoFile
              }
            }
          }
        }
      })

      const GitLab = require('./../../../lib/GitLab')
      const gitlab = new GitLab(req.params)

      return gitlab.readFile(filePath).then(contents => {
        expect(contents).toEqual(parsedConfig)
      })
    })

    test('reads a JSON file and returns its parsed and raw contents if `getFullResponse` is `true`', () => {
      const fileContents = {
        content: btoa(sampleData.config2)
      }
      const filePath = 'path/to/file.json'
      const parsedConfig = yaml.safeLoad(sampleData.config2, 'utf8')
      const mockShowRepoFile = jest.fn(() => Promise.resolve(fileContents))

      jest.mock('gitlab/dist/es5', () => {
        return {
          default: function () {
            return {
              RepositoryFiles: {
                show: mockShowRepoFile
              }
            }
          }
        }
      })

      const GitLab = require('./../../../lib/GitLab')
      const gitlab = new GitLab(req.params)

      return gitlab.readFile(filePath, true).then(response => {
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
      const mockCreateRepoFile = jest.fn(() => Promise.resolve(null))

      jest.mock('gitlab/dist/es5', () => {
        return {
          default: function () {
            return {
              RepositoryFiles: {
                create: mockCreateRepoFile
              }
            }
          }
        }
      })

      const GitLab = require('./../../../lib/GitLab')
      const gitlab = new GitLab(req.params)

      return gitlab.writeFile(
        options.path,
        options.content,
        options.branch,
        options.commitTitle
      ).then(response => {
        expect(mockCreateRepoFile).toHaveBeenCalledTimes(1)
        expect(mockCreateRepoFile.mock.calls[0][0]).toBe(`${req.params.username}/${req.params.repository}`)
        expect(mockCreateRepoFile.mock.calls[0][1]).toBe(options.path)
        expect(mockCreateRepoFile.mock.calls[0][2]).toBe(options.branch)
        expect(mockCreateRepoFile.mock.calls[0][3]).toEqual({
          content: btoa(options.content),
          commit_message: options.commitTitle,
          encoding: 'base64'
        })
      })
    })

    test(
      'creates a file using the branch present in the request, if one is not provided to the method, and the default commit title',
      () => {
        const mockCreateRepoFile = jest.fn(() => Promise.resolve(null))

        jest.mock('gitlab/dist/es5', () => {
          return {
            default: function () {
              return {
                RepositoryFiles: {
                  create: mockCreateRepoFile
                }
              }
            }
          }
        })

        const GitLab = require('./../../../lib/GitLab')
        const gitlab = new GitLab(req.params)
        const options = {
          content: 'This is a new file',
          commitTitle: 'Add Staticman file',
          path: 'path/to/file.txt'
        }

        return gitlab.writeFile(
          options.path,
          options.content
        ).then(response => {
          expect(mockCreateRepoFile.mock.calls[0][0]).toBe(`${req.params.username}/${req.params.repository}`)
          expect(mockCreateRepoFile.mock.calls[0][1]).toBe(options.path)
          expect(mockCreateRepoFile.mock.calls[0][2]).toBe(req.params.branch)
          expect(mockCreateRepoFile.mock.calls[0][3]).toEqual({
            content: btoa(options.content),
            commit_message: options.commitTitle,
            encoding: 'base64'
          })
        })
      }
    )

    test('returns an error object if the save operation fails', () => {
      jest.mock('gitlab/dist/es5', () => {
        return {
          default: function () {
            return {
              RepositoryFiles: {
                create: () => Promise.reject(new Error())
              }
            }
          }
        }
      })

      const GitLab = require('./../../../lib/GitLab')
      const gitlab = new GitLab(req.params)
      const options = {
        branch: 'master',
        commitTitle: 'Adds a new file',
        content: 'This is a new file',
        path: 'path/to/file.txt'
      }

      return gitlab.writeFile(
        options.path,
        options.content,
        options.branch,
        options.commitTitle
      ).catch(err => {
        expect(err._smErrorCode).toBe('GITLAB_WRITING_FILE')
      })
    })
  })

  describe('writeFileAndSendReview', () => {
    test(
      'writes a file to a new branch and sends a PR to the base branch provided, using the given title and body for the commit/PR',
      () => {
        const options = {
          commitBody: 'This is a very cool file indeed...',
          commitTitle: 'Adds a new file',
          content: 'This is a new file',
          name: 'file.txt',
          newBranch: 'staticman_123456789',
          path: 'path/to/file.txt',
          sha: '7fd1a60b01f91b314f59955a4e4d4e80d8edf11d'
        }
        const mockCreateMergeRequest = jest.fn(() => Promise.resolve({
          number: 123
        }))
        const mockCreateBranch = jest.fn(() => Promise.resolve({
          ref: `refs/heads/${options.newBranch}`
        }))
        const mockShowBranch = jest.fn(() => Promise.resolve({
          commit: {
            id: options.sha
          }
        }))

        jest.mock('gitlab/dist/es5', () => {
          return {
            default: function () {
              return {
                Branches: {
                  create: mockCreateBranch,
                  show: mockShowBranch
                },
                MergeRequests: {
                  create: mockCreateMergeRequest
                },
                RepositoryFiles: {
                  create: () => Promise.resolve(null)
                }
              }
            }
          }
        })

        const GitLab = require('./../../../lib/GitLab')
        const gitlab = new GitLab(req.params)

        return gitlab.writeFileAndSendReview(
          options.path,
          options.content,
          options.newBranch,
          options.commitTitle,
          options.commitBody
        ).then(response => {
          expect(mockCreateMergeRequest.mock.calls[0][0]).toBe(`${req.params.username}/${req.params.repository}`)
          expect(mockCreateMergeRequest.mock.calls[0][1]).toBe(options.newBranch)
          expect(mockCreateMergeRequest.mock.calls[0][2]).toBe(req.params.branch)
          expect(mockCreateMergeRequest.mock.calls[0][3]).toBe(options.commitTitle)
          expect(mockCreateMergeRequest.mock.calls[0][4]).toEqual({
            description: options.commitBody,
            remove_source_branch: true
          })

          expect(mockCreateBranch.mock.calls[0][0]).toBe(`${req.params.username}/${req.params.repository}`)
          expect(mockCreateBranch.mock.calls[0][1]).toBe(options.newBranch)
          expect(mockCreateBranch.mock.calls[0][2]).toBe(options.sha)

          expect(mockShowBranch.mock.calls[0][0]).toBe(`${req.params.username}/${req.params.repository}`)
          expect(mockShowBranch.mock.calls[0][1]).toBe(req.params.branch)
        })
      }
    )

    test('returns an error if any of the API calls fail', () => {
      jest.mock('gitlab/dist/es5', () => {
        return {
          default: function () {
            return {
              Branches: {
                create: () => Promise.resolve(),
                show: () => Promise.reject(new Error())
              },
              RepositoryFiles: {
                create: () => Promise.reject(new Error())
              }
            }
          }
        }
      })

      const GitLab = require('./../../../lib/GitLab')
      const gitlab = new GitLab(req.params)
      const options = {
        commitBody: '',
        commitTitle: 'Add Staticman file',
        content: 'This is a new file',
        name: 'file.txt',
        newBranch: 'staticman_123456789',
        path: 'path/to/file.txt',
        sha: '7fd1a60b01f91b314f59955a4e4d4e80d8edf11d'
      }

      return gitlab.writeFileAndSendReview(
        options.path,
        options.content,
        options.newBranch,
        options.commitTitle,
        options.commitBody
      ).catch(err => {
        expect(err._smErrorCode).toBe('GITLAB_CREATING_PR')
      })
    })
  })

  describe('getCurrentUser', () => {
    test('returns the current authenticated user', () => {
      const mockUser = {
        username: 'johndoe',
        email: 'johndoe@test.com',
        name: 'John Doe'
      }

      jest.mock('gitlab/dist/es5', () => {
        return {
          default: function () {
            return {
              Users: {
                current: () => Promise.resolve(mockUser)
              }
            }
          }
        }
      })

      const GitLab = require('./../../../lib/GitLab')
      const gitlab = new GitLab(req.params)

      return gitlab.getCurrentUser().then((user) => {
        expect(user).toEqual(new User('gitlab', 'johndoe', 'johndoe@test.com', 'John Doe'))
      })
    })

    test('throws an error if unable to retrieve the current unauthenticated user', () => {
      jest.mock('gitlab/dist/es5', () => {
        return {
          default: function () {
            return {
              Users: {
                current: () => Promise.reject(new Error())
              }
            }
          }
        }
      })

      const GitLab = require('./../../../lib/GitLab')
      const gitlab = new GitLab(req.params)

      return gitlab.getCurrentUser().catch((err) => {
        expect(err._smErrorCode).toBe('GITLAB_GET_USER')
      })
    })
  })
})
