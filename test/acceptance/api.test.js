const config = require('../../config')
const githubToken = config.get('githubToken')
const helpers = require('../helpers')
const nock = require('nock')
const fetchMock = require('fetch-mock')
const querystring = require('querystring')
const request = helpers.wrappedRequest
const sampleData = require('../helpers/sampleData')
const StaticmanAPI = require('../../server')

const btoa = contents => Buffer.from(contents).toString('base64')

let server

beforeAll(done => {
  server = new StaticmanAPI('test-server')

  server.start(() => {})

  done()
})

beforeEach(() => {
  fetchMock.reset()
})

afterAll(done => {
  server.close()

  done()
})

describe('Connect endpoint', () => {
  test('accepts the invitation if one is found and replies with "OK!"', async () => {
    const invitationId = 123
    fetchMock.get({
      url: 'https://api.github.com/user/repository_invitations',
      headers: {
        authorization: `token ${githubToken}`
      }
    },
    {
      body: [
        {
          id: invitationId,
          repository: {
            full_name: `johndoe/foobar`
          }
        }
      ],
      status: 200
    })
    .patch({
      url: `https://api.github.com/user/repository_invitations/${invitationId}`,
      headers: {
        authorization: `token ${githubToken}`
      }
    },
    {
      status: 204
    })

    let response = await request('/v2/connect/johndoe/foobar')
    expect(fetchMock.done()).toBe(true)
    expect(response).toBe('OK!')
  })

  test('returns a 404 and an error message if a matching invitation is not found', async () => {
    const invitationId = 123
    const listInvititationsUrl = 'https://api.github.com/user/repository_invitations' 
    const acceptInvititationsUrl = `https://api.github.com/user/repository_invitations/${invitationId}`
    fetchMock.get({
      url: listInvititationsUrl,
      headers: {
        authorization: `token ${githubToken}`
      }
    },
    {
      body: [
        {
          id: invitationId,
          repository: {
            full_name: `johndoe/anotherrepo`
          }
        }
      ],
      status: 200
    })
    .patch({
      url: acceptInvititationsUrl,
      headers: {
        authorization: `token ${githubToken}`
      }
    },
    {
      status: 204
    })

    expect.assertions(4)

    try {
      await request('/v2/connect/johndoe/foobar')
    } catch (err) {
        expect(fetchMock.done(listInvititationsUrl)).toBe(true)
        expect(fetchMock.done(acceptInvititationsUrl)).toBe(false)
        expect(err.response.body).toBe('Invitation not found')
        expect(err.statusCode).toBe(404)
    }
  })
})

describe('Entry endpoint', () => {
  test('outputs a RECAPTCHA_CONFIG_MISMATCH error if reCaptcha options do not match (wrong site key)', async () => {
    const data = Object.assign({}, helpers.getParameters(), {
      path: 'staticman.yml'
    })
    const reCaptchaSecret = helpers.encrypt('Some little secret')
    const mockConfig = sampleData.config1
      .replace('@reCaptchaSecret@', reCaptchaSecret)

    fetchMock.get({
      url: `https://api.github.com/repos/${data.username}/${data.repository}/contents/${data.path}?ref=${data.branch}`,
      headers: {
        authorization: `token ${githubToken}`
      }
    },
    {
      body: {
        type: 'file',
        encoding: 'base64',
        size: 5362,
        name: 'staticman.yml',
        path: 'staticman.yml',
        content: btoa(mockConfig),
        sha: '3d21ec53a331a6f037a91c368710b99387d012c1',
        url: 'https://api.github.com/repos/octokit/octokit.rb/contents/staticman.yml',
        git_url: 'https://api.github.com/repos/octokit/octokit.rb/git/blobs/3d21ec53a331a6f037a91c368710b99387d012c1',
        html_url: 'https://github.com/octokit/octokit.rb/blob/master/staticman.yml',
        download_url: 'https://raw.githubusercontent.com/octokit/octokit.rb/master/staticman.yml',
        _links: {
          git: 'https://api.github.com/repos/octokit/octokit.rb/git/blobs/3d21ec53a331a6f037a91c368710b99387d012c1',
          self: 'https://api.github.com/repos/octokit/octokit.rb/contents/staticman.yml',
          html: 'https://github.com/octokit/octokit.rb/blob/master/staticman.yml'
        }
      },
      status: 200
    })

    const form = {
      'fields[name]': 'Eduardo Boucas',
      'options[reCaptcha][siteKey]': 'wrongSiteKey',
      'options[reCaptcha][secret]': reCaptchaSecret
    }
    const formData = querystring.stringify(form)

    expect.assertions(3)

    try {
      await request({
        body: formData,
        method: 'POST',
        uri: `/v2/entry/${data.username}/${data.repository}/${data.branch}/${data.property}`,
        headers: {
          'content-type': 'application/x-www-form-urlencoded'
        }
      })
    } catch(response) {
      const error = JSON.parse(response.error)

      expect(error.success).toBe(false)
      expect(error.errorCode).toBe('RECAPTCHA_CONFIG_MISMATCH')
      expect(error.message).toBe('reCAPTCHA options do not match Staticman config')
    }
  })

  test('outputs a RECAPTCHA_CONFIG_MISMATCH error if reCaptcha options do not match (wrong secret)', async () => {
    const data = Object.assign({}, helpers.getParameters(), {
      path: 'staticman.yml'
    })
    const reCaptchaSecret = 'Some little secret'
    const mockConfig = sampleData.config1
      .replace('@reCaptchaSecret@', helpers.encrypt(reCaptchaSecret))
    fetchMock.get({
      url: `https://api.github.com/repos/${data.username}/${data.repository}/contents/${data.path}?ref=${data.branch}`,
      headers: {
        authorization: `token ${githubToken}`
      }
    },
    {
      body: {
        type: 'file',
        encoding: 'base64',
        size: 5362,
        name: 'staticman.yml',
        path: 'staticman.yml',
        content: btoa(mockConfig),
        sha: '3d21ec53a331a6f037a91c368710b99387d012c1',
        url: 'https://api.github.com/repos/octokit/octokit.rb/contents/staticman.yml',
        git_url: 'https://api.github.com/repos/octokit/octokit.rb/git/blobs/3d21ec53a331a6f037a91c368710b99387d012c1',
        html_url: 'https://github.com/octokit/octokit.rb/blob/master/staticman.yml',
        download_url: 'https://raw.githubusercontent.com/octokit/octokit.rb/master/staticman.yml',
        _links: {
          git: 'https://api.github.com/repos/octokit/octokit.rb/git/blobs/3d21ec53a331a6f037a91c368710b99387d012c1',
          self: 'https://api.github.com/repos/octokit/octokit.rb/contents/staticman.yml',
          html: 'https://github.com/octokit/octokit.rb/blob/master/staticman.yml'
        }
      },
      status: 200
    })

    const form = {
      'fields[name]': 'Eduardo Boucas',
      'options[reCaptcha][siteKey]': '123456789',
      'options[reCaptcha][secret]': 'foo'
    }
    const formData = querystring.stringify(form)

    expect.assertions(3)

    try {
      await request({
        body: formData,
        method: 'POST',
        uri: '/v2/entry/johndoe/foobar/master/comments',
        headers: {
          'content-type': 'application/x-www-form-urlencoded'
        }
      })
    } catch (response) {
      const error = JSON.parse(response.error)

      expect(error.success).toBe(false)
      expect(error.errorCode).toBe('RECAPTCHA_CONFIG_MISMATCH')
      expect(error.message).toBe('reCAPTCHA options do not match Staticman config')
    }
  })

  test('outputs a PARSING_ERROR error if the site config is malformed', async () => {
    const data = Object.assign({}, helpers.getParameters(), {
      path: 'staticman.yml'
    })

    fetchMock.get({
      url: `https://api.github.com/repos/${data.username}/${data.repository}/contents/${data.path}?ref=${data.branch}`,
      headers: {
        authorization: `token ${githubToken}`
      }
    },
    {
      body: {
        type: 'file',
        encoding: 'base64',
        size: 5362,
        name: 'staticman.yml',
        path: 'staticman.yml',
        content: btoa(sampleData.config3),
        sha: '3d21ec53a331a6f037a91c368710b99387d012c1',
        url: 'https://api.github.com/repos/octokit/octokit.rb/contents/staticman.yml',
        git_url: 'https://api.github.com/repos/octokit/octokit.rb/git/blobs/3d21ec53a331a6f037a91c368710b99387d012c1',
        html_url: 'https://github.com/octokit/octokit.rb/blob/master/staticman.yml',
        download_url: 'https://raw.githubusercontent.com/octokit/octokit.rb/master/staticman.yml',
        _links: {
          git: 'https://api.github.com/repos/octokit/octokit.rb/git/blobs/3d21ec53a331a6f037a91c368710b99387d012c1',
          self: 'https://api.github.com/repos/octokit/octokit.rb/contents/staticman.yml',
          html: 'https://github.com/octokit/octokit.rb/blob/master/staticman.yml'
        }
      },
      status: 200
    })

    const form = {
      'fields[name]': 'Eduardo Boucas'
    }
    const formData = querystring.stringify(form)

    expect.assertions(4)

    try {
      await request({
        body: formData,
        method: 'POST',
        uri: '/v2/entry/johndoe/foobar/master/comments',
        headers: {
          'content-type': 'application/x-www-form-urlencoded'
        }
      })
    } catch (response) {
      const error = JSON.parse(response.error)

      expect(error.success).toBe(false)
      expect(error.errorCode).toBe('PARSING_ERROR')
      expect(error.message).toBe('Error whilst parsing config file')
      expect(error.rawError).toBeDefined()
    }
  })
})
