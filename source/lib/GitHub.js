import { App } from '@octokit/app';
import { Octokit as GithubApi } from '@octokit/rest';
import { request } from '@octokit/request';

import config from '../config';
import errorHandler from './ErrorHandler';
import GitService from './GitService';
import Review from './models/Review';
import User from './models/User';

export default class GitHub extends GitService {
  constructor(options = {}) {
    super(options.username, options.repository, options.branch);
    this.options = options;
  }

  async init() {
    const isAppAuth = config.get('githubAppID') && config.get('githubPrivateKey');
    const isLegacyAuth = config.get('githubToken');

    let authToken;

    if (this.options.oauthToken) {
      authToken = this.options.oauthToken;
    } else if (isAppAuth) {
      authToken = await GitHub._authenticateAsApp(this.options.username, this.options.repository);
    } else if (isLegacyAuth) {
      authToken = config.get('githubToken');
    } else {
      throw new Error('Require an `oauthToken` or `token` option');
    }

    this.api = new GithubApi({
      auth: `token ${authToken}`,
      userAgent: 'Staticman',
      baseUrl: config.get('githubBaseUrl'),
      request: {
        timeout: 5000,
      },
    });
  }

  static async _authenticateAsApp(username, repository) {
    const app = new App({
      id: config.get('githubAppID'),
      privateKey: config.get('githubPrivateKey'),
      baseUrl: config.get('githubBaseUrl'),
    });

    const jwt = app.getSignedJsonWebToken();

    const { data } = await request('GET /repos/:owner/:repo/installation', {
      owner: username,
      repo: repository,
      headers: {
        authorization: `Bearer ${jwt}`,
        accept: 'application/vnd.github.machine-man-preview+json',
      },
    });

    const installationId = data.id;

    const token = await app.getInstallationAccessToken({ installationId });

    return token;
  }

  async _pullFile(filePath, branch) {
    try {
      const { data } = await this.api.repos.getContent({
        owner: this.username,
        repo: this.repository,
        path: filePath,
        ref: branch,
      });

      return data;
    } catch (err) {
      throw new Error(errorHandler('GITHUB_READING_FILE', { err }));
    }
  }

  async _commitFile(filePath, content, commitMessage, branch) {
    const { data } = await this.api.repos.createOrUpdateFileContents({
      owner: this.username,
      repo: this.repository,
      path: filePath,
      message: commitMessage,
      content,
      committer: {
        name: 'Staticman',
        email: 'noreply@staticman.net',
      },
      author: {
        name: 'Staticman',
        email: 'noreply@staticman.net',
      },
      branch,
    });

    return data;
  }

  async writeFile(filePath, data, targetBranch, commitTitle) {
    try {
      return await super.writeFile(filePath, data, targetBranch, commitTitle);
    } catch (err) {
      try {
        const message = err?.message;

        if (message) {
          const parsedError = JSON.parse(message);

          if (parsedError?.message.includes('"sha" wasn\'t supplied')) {
            throw errorHandler('GITHUB_FILE_ALREADY_EXISTS', { err });
          }
        }
      } catch (errorParsingError) {
        console.log(errorParsingError);
      }

      throw errorHandler('GITHUB_WRITING_FILE');
    }
  }

  async getBranchHeadCommit(branch) {
    const result = await this.api.repos.getBranch({
      owner: this.username,
      repo: this.repository,
      branch,
    });

    return result.data.commit.sha;
  }

  async createBranch(branch, sha) {
    const { data } = await this.api.git.createRef({
      owner: this.username,
      repo: this.repository,
      ref: `refs/heads/${branch}`,
      sha,
    });

    return data;
  }

  async deleteBranch(branch) {
    return this.api.git.deleteRef({
      owner: this.username,
      repo: this.repository,
      ref: `heads/${branch}`,
    });
  }

  async createReview(reviewTitle, branch, reviewBody) {
    const { data } = await this.api.pulls.create({
      owner: this.username,
      repo: this.repository,
      title: reviewTitle,
      head: branch,
      base: this.branch,
      body: reviewBody,
    });

    return data;
  }

  async getReview(reviewId) {
    const { data } = await this.api.pulls.get({
      owner: this.username,
      repo: this.repository,
      pull_number: reviewId,
    });
    const { base, body, head, merged, state, title } = data;
    return new Review(
      title,
      body,
      merged && state === 'closed' ? 'merged' : state,
      head.ref,
      base.ref
    );
  }

  async readFile(filePath, getFullResponse) {
    try {
      return await super.readFile(filePath, getFullResponse);
    } catch (err) {
      throw errorHandler('GITHUB_READING_FILE', { err });
    }
  }

  async writeFileAndSendReview(filePath, data, branch, commitTitle, reviewBody) {
    try {
      return await super.writeFileAndSendReview(filePath, data, branch, commitTitle, reviewBody);
    } catch (err) {
      throw errorHandler('GITHUB_CREATING_PR', { err });
    }
  }

  async getCurrentUser() {
    try {
      const { data } = await this.api.users.getAuthenticated();
      const { login, email, avatar_url: avatarUrl, name, bio, company, blog } = data;
      return new User('github', login, email, name, avatarUrl, bio, blog, company);
    } catch (err) {
      throw errorHandler('GITHUB_GET_USER', { err });
    }
  }
}
