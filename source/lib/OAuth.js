import { createOAuthAppAuth } from '@octokit/auth-oauth-app';
import request from 'request-promise';

import config from '../config';
import errorHandler from './ErrorHandler';

/**
 * Exchange temporary code for GitHub auth token
 * @param {string} code - code received in step 1 of oauth flow
 * @param {string} clientId - client ID received from GitHub when registering a GitHub App
 * @param {string} clientSecret - client secret received from GitHub when registering a GitHub App
 * @param {string} redirectUrl - URL where users are sent after authorization
 * @param {string} state - Unguessable random string used to stop cross-site request forgery
 */
export async function requestGitHubAccessToken(code, clientId, clientSecret, redirectUrl, state) {
  const auth = createOAuthAppAuth({
    code,
    clientId,
    clientSecret,
    redirectUrl,
  });

  try {
    const tokenAuth = await auth({
      type: 'token',
      code,
      redirectUrl,
      state,
    });
    return tokenAuth.token;
  } catch (err) {
    throw errorHandler('GITHUB_AUTH_FAILED', { err });
  }
}

/**
 * Exchange temporary code for GitLab auth token
 * @param {string} code - code received in step 1 of oauth flow
 * @param {string} clientId - client ID received from GitLab when registering a GitLab App
 * @param {string} clientSecret - client secret received from GitLab when registering a GitLab App
 * @param {string} redirectUri - URL where users are sent after authorization
 */
export async function requestGitLabAccessToken(code, clientId, clientSecret, redirectUri) {
  try {
    const result = await request({
      headers: {
        Accept: 'application/json',
      },
      json: true,
      method: 'POST',
      uri: config.get('gitlabAccessTokenUri'),
      qs: {
        code,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      },
    });

    return result.access_token;
  } catch (err) {
    throw errorHandler('GITLAB_AUTH_FAILED', { err });
  }
}
