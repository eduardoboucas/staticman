import nock from 'nock';

import * as oauth from '../../../source/lib/OAuth';

describe('OAuth access tokens', () => {
  test('requests OAuth access token from GitHub', async () => {
    const accessToken = 'asdfghjkl';
    const clientId = '123456789';
    const clientSecret = '1q2w3e4r5t6y7u8i9o';
    const code = 'abcdefghijklmnopqrst';
    const redirectUri = 'http://my-test-site.com';

    nock(/github\.com/)
      .post('/login/oauth/access_token')
      .query({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      })
      .reply(200, {
        access_token: accessToken,
      });

    expect.assertions(1);

    const token = await oauth.requestGitHubAccessToken(code, clientId, clientSecret, redirectUri);
    expect(token).toEqual(accessToken);
  });

  test('requests OAuth access token from GitLab', async () => {
    const accessToken = 'asdfghjkl';
    const clientId = '123456789';
    const clientSecret = '1q2w3e4r5t6y7u8i9o';
    const code = 'abcdefghijklmnopqrst';
    const redirectUri = 'http://my-test-site.com';

    nock(/gitlab\.com/)
      .post('/oauth/token')
      .query({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      })
      .reply(200, {
        access_token: accessToken,
      });

    const token = await oauth.requestGitLabAccessToken(code, clientId, clientSecret, redirectUri);
    expect(token).toEqual(accessToken);
  });
});
