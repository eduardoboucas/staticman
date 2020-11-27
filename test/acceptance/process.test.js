import nock from 'nock';
import request from 'supertest';

import config from '../../source/config';
import * as helpers from '../helpers';
import * as sampleData from '../helpers/sampleData';
import StaticmanAPI from '../../source/server';

const btoa = (contents) => Buffer.from(contents).toString('base64');
const githubToken = config.get('githubToken');
const staticman = new StaticmanAPI().server;

afterEach(() => {
  nock.cleanAll();
});

describe('Entry endpoint', () => {
  test('outputs a RECAPTCHA_CONFIG_MISMATCH error if reCaptcha options do not match (wrong site key)', async () => {
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

    await request(staticman)
      .post(`/v2/entry/${data.username}/${data.repository}/${data.branch}/${data.property}`)
      .send({
        fields: {
          name: 'Eduardo Boucas',
        },
        options: {
          reCaptcha: {
            siteKey: 'wrongSiteKey',
            secret: reCaptchaSecret,
          },
        },
      })
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .expect(500)
      .expect('Content-Type', 'application/json; charset=utf-8')
      .expect((response) => {
        expect(JSON.parse(response.text)).toMatchObject({
          success: false,
          errorCode: 'RECAPTCHA_CONFIG_MISMATCH',
          message: 'reCAPTCHA options do not match Staticman config',
        });
      });
  });

  test('outputs a RECAPTCHA_CONFIG_MISMATCH error if reCaptcha options do not match (wrong secret)', async () => {
    const data = {
      ...helpers.getParameters(),
      path: 'staticman.yml',
    };
    const reCaptchaSecret = 'Some little secret';
    const mockConfig = sampleData.config1.replace(
      '@reCaptchaSecret@',
      helpers.encrypt(reCaptchaSecret)
    );

    nock('https://api.github.com', {
      reqHeaders: {
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

    await request(staticman)
      .post('/v2/entry/johndoe/foobar/master/comments')
      .send({
        fields: {
          name: 'Eduardo+Boucas',
        },
        options: {
          reCaptcha: {
            siteKey: '123456789',
            secret: 'foo',
          },
        },
      })
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .expect(500)
      .expect('Content-Type', 'application/json; charset=utf-8')
      .expect((response) => {
        expect(JSON.parse(response.text)).toMatchObject({
          success: false,
          errorCode: 'RECAPTCHA_CONFIG_MISMATCH',
          message: 'reCAPTCHA options do not match Staticman config',
        });
      });
  });

  test('outputs a PARSING_ERROR error if the site config is malformed', async () => {
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

    await request(staticman)
      .post('/v2/entry/johndoe/foobar/master/comments')
      .send({
        fields: {
          name: 'Eduardo+Boucas',
        },
      })
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .expect(500)
      .expect('Content-Type', 'application/json; charset=utf-8')
      .expect((response) => {
        const error = JSON.parse(response.text);
        expect(error).toHaveProperty('rawError');
        expect(error).toMatchObject({
          success: false,
          errorCode: 'PARSING_ERROR',
          message: 'Error whilst parsing config file',
        });
      });

    expect(mockGetConfig.isDone()).toBe(true);
  });
});
