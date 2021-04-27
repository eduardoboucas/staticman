import nock from 'nock';
import querystring from 'querystring';

import config from '../../source/config';
import * as helpers from '../helpers';
import * as sampleData from '../helpers/sampleData';
import StaticmanAPI from '../../source/server';

const githubToken = config.get('githubToken');
const request = helpers.wrappedRequest;

const btoa = (contents) => Buffer.from(contents).toString('base64');

let server;

beforeAll((done) => {
  server = new StaticmanAPI();

  server.start(() => {});

  done();
});

afterAll((done) => {
  server.close();

  done();
});

describe('Connect endpoint', () => {
  test('accepts the invitation if one is found and replies with "Staticman connected!"', async (done) => {
    const invitationId = 123;

    const reqListInvititations = nock('https://api.github.com', {
      reqheaders: {
        authorization: `token ${githubToken}`,
      },
    })
      .get('/user/repository_invitations')
      .reply(200, [
        {
          id: invitationId,
          repository: {
            full_name: `johndoe/foobar`,
          },
        },
      ]);

    const reqAcceptInvitation = nock('https://api.github.com', {
      reqheaders: {
        authorization: `token ${githubToken}`,
      },
    })
      .patch(`/user/repository_invitations/${invitationId}`)
      .reply(204);

    const response = await request('/v2/connect/johndoe/foobar');
    expect(reqListInvititations.isDone()).toBe(true);
    expect(reqAcceptInvitation.isDone()).toBe(true);
    expect(response).toBe('Staticman connected!');
    done()
  });

  test('returns a 404 and an error message if a matching invitation is not found', async (done) => {
    const invitationId = 123;
    const reqListInvititations = nock('https://api.github.com', {
      reqheaders: {
        authorization: `token ${githubToken}`,
      },
    })
      .get('/user/repository_invitations')
      .reply(200, [
        {
          id: invitationId,
          repository: {
            full_name: `johndoe/anotherrepo`,
          },
        },
      ]);

    const reqAcceptInvitation = nock('https://api.github.com', {
      reqheaders: {
        authorization: `token ${githubToken}`,
      },
    })
      .patch(`/user/repository_invitations/${invitationId}`)
      .reply(204);

    // expect.assertions(4);

    try {
      await request('/v2/connect/johndoe/foobar');
    } catch (err) {
      expect(reqListInvititations.isDone()).toBe(true);
      expect(reqAcceptInvitation.isDone()).toBe(false);
      expect(err.response.body).toBe('Invitation not found');
      expect(err.statusCode).toBe(404);
      done()
    }
  });
});

describe('Entry endpoint', () => {
  test('outputs a RECAPTCHA_CONFIG_MISMATCH error if reCaptcha options do not match (wrong site key)', async (done) => {
    const data = {
      ...helpers.getParameters(),
      path: 'staticman.yml',
    };
    const reCaptchaSecret = helpers.encrypt('Some little secret');
    const mockConfig = sampleData.config1.replace('@reCaptchaSecret@', reCaptchaSecret);

    nock('https://api.github.com', {
      reqheaders: {
        Authorization: `token ${githubToken}`,
      },
    })
      .get(`/repos/${data.username}/${data.repository}/contents/${data.path}?ref=${data.branch}`)
      .reply(200, {
        type: 'file',
        encoding: 'base64',
        size: 5362,
        name: 'staticman.yml',
        path: 'staticman.yml',
        content: btoa(mockConfig),
        sha: '3d21ec53a331a6f037a91c368710b99387d012c1',
        url: 'https://api.github.com/repos/octokit/octokit.rb/contents/staticman.yml',
        git_url:
          'https://api.github.com/repos/octokit/octokit.rb/git/blobs/3d21ec53a331a6f037a91c368710b99387d012c1',
        html_url: 'https://github.com/octokit/octokit.rb/blob/master/staticman.yml',
        download_url: 'https://raw.githubusercontent.com/octokit/octokit.rb/master/staticman.yml',
        _links: {
          git:
            'https://api.github.com/repos/octokit/octokit.rb/git/blobs/3d21ec53a331a6f037a91c368710b99387d012c1',
          self: 'https://api.github.com/repos/octokit/octokit.rb/contents/staticman.yml',
          html: 'https://github.com/octokit/octokit.rb/blob/master/staticman.yml',
        },
      });

    const form = {
      'fields[name]': 'Eduardo Boucas',
    };
    const formData = querystring.stringify(form);

    expect.assertions(3);

    try {
      await request({
        body: formData,
        method: 'POST',
        uri: `/v2/entry/${data.username}/${data.repository}/${data.branch}/${data.property}`,
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
      });
    } catch (response) {
      const error = JSON.parse(response.error);

      expect(error.success).toBe(false);
      expect(error.errorCode).toBe('RECAPTCHA_TOKEN_MISSING');
      expect(error.message).toBe('reCAPTCHA token from form no\'t found in body[g-recaptcha-response] or body[h-captcha-response]');
      done()
    }
  });

  test('outputs a PARSING_ERROR error if the site config is malformed', async (done) => {
    const data = {
      ...helpers.getParameters(),
      path: 'staticman.yml',
    };

    const mockGetConfig = nock('https://api.github.com', {
      reqheaders: {
        Authorization: `token ${githubToken}`,
      },
    })
      .get(`/repos/${data.username}/${data.repository}/contents/${data.path}?ref=${data.branch}`)
      .reply(200, {
        type: 'file',
        encoding: 'base64',
        size: 5362,
        name: 'staticman.yml',
        path: 'staticman.yml',
        content: btoa(sampleData.config3),
        sha: '3d21ec53a331a6f037a91c368710b99387d012c1',
        url: 'https://api.github.com/repos/octokit/octokit.rb/contents/staticman.yml',
        git_url:
          'https://api.github.com/repos/octokit/octokit.rb/git/blobs/3d21ec53a331a6f037a91c368710b99387d012c1',
        html_url: 'https://github.com/octokit/octokit.rb/blob/master/staticman.yml',
        download_url: 'https://raw.githubusercontent.com/octokit/octokit.rb/master/staticman.yml',
        _links: {
          git:
            'https://api.github.com/repos/octokit/octokit.rb/git/blobs/3d21ec53a331a6f037a91c368710b99387d012c1',
          self: 'https://api.github.com/repos/octokit/octokit.rb/contents/staticman.yml',
          html: 'https://github.com/octokit/octokit.rb/blob/master/staticman.yml',
        },
      });

    const form = {
      'fields[name]': 'Eduardo Boucas',
    };
    const formData = querystring.stringify(form);

    // expect.assertions(5);

    try {
      await request({
        body: formData,
        method: 'POST',
        uri: '/v2/entry/johndoe/foobar/master/comments',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
      });
    } catch (response) {
      console.log(response.error)
      const error = JSON.parse(response.error);

      expect(error.success).toBe(false);
      expect(error.errorCode).toBe('PARSING_ERROR');
      expect(error.message).toBe('Error whilst parsing config file');
      expect(error.rawError).toBeDefined();
      expect(mockGetConfig.isDone()).toBe(true);
      done();
    }
  });
});
