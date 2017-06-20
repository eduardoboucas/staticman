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
  test('initialises the GitHub API wrapper and completes authentication', () => {
    const GitHub = require('./../../../lib/GitHub')
    const githubInstance = new GitHub(req.params)

    expect(githubInstance.api.auth.type).toBe('oauth')
    expect(githubInstance.api.auth.token).toBe(config.get('githubToken'))
  })

  describe('readFile', () => {
    test('reads a file and returns its contents', () => {
      const GitHub = require('./../../../lib/GitHub')
      const githubInstance = new GitHub(req.params)
      const fileContents = 'This is a text file!'

      const mockRequest = nock(/api\.github\.com/)
        .get(`/repos/${req.params.username}/${req.params.repository}/contents/path%2Fto%2Ffile.txt`)
        .query(true)
        .reply(200, {
          content: btoa(fileContents)
        })

      githubInstance.readFile('path/to/file.txt').then(contents => {
        expect(contents).toEqual(fileContents)
      })
    })

    test('returns an error if GitHub API call errors', () => {
      const GitHub = require('./../../../lib/GitHub')
      const githubInstance = new GitHub(req.params)

      const mockRequest = nock(/api\.github\.com/)
        .get(`/repos/${req.params.username}/${req.params.repository}/contents/path%2Fto%2Ffile.yml`)
        .query(true)
        .reply(404)

      return githubInstance.readFile('path/to/file.yml').catch(err => {
        expect(err).toEqual({
          _smErrorCode: 'GITHUB_READING_FILE'
        })
      })
    })

    test('returns an error if parsing fails for the given file', () => {
      const GitHub = require('./../../../lib/GitHub')
      const githubInstance = new GitHub(req.params)
      const fileContents = `
        foo: "bar"
        baz
      `

      const mockRequest = nock(/api\.github\.com/)
        .get(`/repos/${req.params.username}/${req.params.repository}/contents/path%2Fto%2Ffile.yml`)
        .query(true)
        .reply(200, {
          content: btoa(fileContents)
        })

      return githubInstance.readFile('path/to/file.yml').catch(err => {
        expect(err).toEqual({
          _smErrorCode: 'PARSING_ERROR'
        })
      })
    })

    test('reads a YAML file and returns its parsed contents', () => {
      const GitHub = require('./../../../lib/GitHub')
      const githubInstance = new GitHub(req.params)
      const parsedConfig = yaml.safeLoad(sampleData.config1, 'utf8')

      const mockRequest = nock(/api\.github\.com/)
        .get(`/repos/${req.params.username}/${req.params.repository}/contents/path%2Fto%2Ffile.yml`)
        .query(true)
        .reply(200, {
          content: btoa(sampleData.config1)
        })

      return githubInstance.readFile('path/to/file.yml').then(contents => {
        expect(contents).toEqual(parsedConfig)
      })
    })

    test('reads a YAML file and returns its parsed and raw contents if `getFullResponse` is `true`', () => {
      const GitHub = require('./../../../lib/GitHub')
      const githubInstance = new GitHub(req.params)
      const parsedConfig = yaml.safeLoad(sampleData.config1, 'utf8')
      const fileContents = {
        content: btoa(sampleData.config1)
      }

      const mockRequest = nock(/api\.github\.com/)
        .get(`/repos/${req.params.username}/${req.params.repository}/contents/path%2Fto%2Ffile.yml`)
        .query(true)
        .reply(200, fileContents)

      return githubInstance.readFile('path/to/file.yml', true).then(response => {
        expect(response.content).toEqual(parsedConfig)
        expect(response.file).toEqual(fileContents)
      })
    })  

    test('reads a JSON file and returns its parsed contents', () => {
      const GitHub = require('./../../../lib/GitHub')
      const githubInstance = new GitHub(req.params)
      const parsedConfig = yaml.safeLoad(sampleData.config2, 'utf8')

      const mockRequest = nock(/api\.github\.com/)
        .get(`/repos/${req.params.username}/${req.params.repository}/contents/path%2Fto%2Ffile.json`)
        .query(true)
        .reply(200, {
          content: btoa(sampleData.config2)
        })

      return githubInstance.readFile('path/to/file.json').then(contents => {
        expect(contents).toEqual(parsedConfig)
      })
    })

    test('reads a JSON file and returns its parsed and raw contents if `getFullResponse` is `true`', () => {
      const GitHub = require('./../../../lib/GitHub')
      const githubInstance = new GitHub(req.params)
      const parsedConfig = yaml.safeLoad(sampleData.config2, 'utf8')
      const fileContents = {
        content: btoa(sampleData.config2)
      }

      const mockRequest = nock(/api\.github\.com/)
        .get(`/repos/${req.params.username}/${req.params.repository}/contents/path%2Fto%2Ffile.json`)
        .query(true)
        .reply(200, fileContents)

      return githubInstance.readFile('path/to/file.json', true).then(response => {
        expect(response.content).toEqual(parsedConfig)
        expect(response.file).toEqual(fileContents)
      })
    })
  })

  describe('writeFile', () => {
    test('creates a file on the given branch using the commit title provided', () => {
      const GitHub = require('./../../../lib/GitHub')
      const githubInstance = new GitHub(req.params)
      const options = {
        branch: 'master',
        commitTitle: 'Adds a new file',
        content: 'This is a new file',
        path: 'path/to/file.txt'
      }

      const mockRequest = nock(/api\.github\.com/)
        .put(`/repos/${req.params.username}/${req.params.repository}/contents/${encodeURIComponent(options.path)}`, {
          branch: options.branch,
          content: btoa(options.content),
          message: options.commitTitle
        })
        .query(true)
        .reply(200)

      return githubInstance.writeFile(
        options.path,
        options.content,
        options.branch,
        options.commitTitle
      ).then(response => {
        expect(mockRequest.isDone()).toBe(true)
      })
    })

    test('creates a file using, if not provided, the branch present in the request and the default commit title', () => {
      const GitHub = require('./../../../lib/GitHub')
      const githubInstance = new GitHub(req.params)
      const options = {
        content: 'This is a new file',
        path: 'path/to/file.txt'
      }

      const mockRequest = nock(/api\.github\.com/)
        .put(`/repos/${req.params.username}/${req.params.repository}/contents/${encodeURIComponent(options.path)}`, {
          branch: req.params.branch,
          content: btoa(options.content),
          message: 'Add Staticman file'
        })
        .query(true)
        .reply(200)

      return githubInstance.writeFile(
        options.path,
        options.content,
        options.branch,
        options.commitTitle
      ).then(response => {
        expect(mockRequest.isDone()).toBe(true)
      })
    })

    test('returns an error object if the save operation fails', () => {
      const GitHub = require('./../../../lib/GitHub')
      const githubInstance = new GitHub(req.params)
      const options = {
        branch: 'master',
        commitTitle: 'Adds a new file',
        content: 'This is a new file',
        path: 'path/to/file.txt'
      }

      const mockRequest = nock(/api\.github\.com/)
        .put(`/repos/${req.params.username}/${req.params.repository}/contents/${encodeURIComponent(options.path)}`, {
          branch: options.branch,
          content: btoa(options.content),
          message: options.commitTitle
        })
        .query(true)
        .reply(500)

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

  describe('writeFileAndSendPR', () => {
    test('writes a file to a new branch and sends a PR to the base branch provided, using the given title and body for the commit/PR', () => {
      const GitHub = require('./../../../lib/GitHub')
      const githubInstance = new GitHub(req.params)
      const options = {
        commitBody: 'This is a very cool file indeed...',
        commitTitle: 'Adds a new file',
        content: 'This is a new file',
        name: 'file.txt',
        newBranch: 'staticman_123456789',
        path: 'path/to/file.txt',
        sha: '7fd1a60b01f91b314f59955a4e4d4e80d8edf11d'
      }

      const mockRequest1 = nock(/api\.github\.com/)
        .get(`/repos/${req.params.username}/${req.params.repository}/branches/${req.params.branch}`)
        .once()
        .query(true)
        .reply(200, {
          commit: {
            sha: options.sha
          }
        })

      const mockRequest2 = nock(/api\.github\.com/)
        .post(`/repos/${req.params.username}/${req.params.repository}/git/refs`, {
          ref: `refs/heads/${options.newBranch}`,
          sha: options.sha
        })
        .once()
        .query(true)
        .reply(200, {
          ref: `refs/heads/${options.newBranch}`
        })

      const mockRequest3 = nock(/api\.github\.com/)
        .put(`/repos/${req.params.username}/${req.params.repository}/contents/${encodeURIComponent(options.path)}`, {
          branch: options.newBranch,
          content: btoa(options.content),
          message: options.commitTitle
        })
        .once()
        .query(true)
        .reply(200, {
          content: {
            name: options.name,
            path: options.path
          }
        })

      const mockRequest4 = nock(/api\.github\.com/)
        .post(`/repos/${req.params.username}/${req.params.repository}/pulls`, {
          base: req.params.branch,
          body: options.commitBody,
          head: options.newBranch,
          title: options.commitTitle
        })
        .once()
        .query(true)
        .reply(201, {
          number: 123
        })

      return githubInstance.writeFileAndSendPR(
        options.path,
        options.content,
        options.newBranch,
        options.commitTitle,
        options.commitBody
      ).then(response => {
        expect(mockRequest1.isDone()).toBe(true)
        expect(mockRequest2.isDone()).toBe(true)
        expect(mockRequest3.isDone()).toBe(true)
        expect(mockRequest4.isDone()).toBe(true)
      })
    })

    test('writes a file to a new branch and sends a PR to the base branch provided, using the given title and body for the commit/PR', () => {
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

      const mockRequest1 = nock(/api\.github\.com/)
        .get(`/repos/${req.params.username}/${req.params.repository}/branches/${req.params.branch}`)
        .once()
        .query(true)
        .reply(200, {
          commit: {
            sha: options.sha
          }
        })

      const mockRequest2 = nock(/api\.github\.com/)
        .post(`/repos/${req.params.username}/${req.params.repository}/git/refs`, {
          ref: `refs/heads/${options.newBranch}`,
          sha: options.sha
        })
        .once()
        .query(true)
        .reply(200, {
          ref: `refs/heads/${options.newBranch}`
        })

      const mockRequest3 = nock(/api\.github\.com/)
        .put(`/repos/${req.params.username}/${req.params.repository}/contents/${encodeURIComponent(options.path)}`, {
          branch: options.newBranch,
          content: btoa(options.content),
          message: options.commitTitle
        })
        .once()
        .query(true)
        .reply(200, {
          content: {
            name: options.name,
            path: options.path
          }
        })

      const mockRequest4 = nock(/api\.github\.com/)
        .post(`/repos/${req.params.username}/${req.params.repository}/pulls`, {
          base: req.params.branch,
          body: options.commitBody,
          head: options.newBranch,
          title: options.commitTitle
        })
        .once()
        .query(true)
        .reply(201, {
          number: 123
        })

      return githubInstance.writeFileAndSendPR(
        options.path,
        options.content,
        options.newBranch
      ).then(response => {
        expect(mockRequest1.isDone()).toBe(true)
        expect(mockRequest2.isDone()).toBe(true)
        expect(mockRequest3.isDone()).toBe(true)
        expect(mockRequest4.isDone()).toBe(true)
      })
    })

    test('returns an error if any of the API calls fail', () => {
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

      const mockRequest1 = nock(/api\.github\.com/)
        .get(`/repos/${req.params.username}/${req.params.repository}/branches/${req.params.branch}`)
        .once()
        .query(true)
        .reply(500)

      return githubInstance.writeFileAndSendPR(
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
