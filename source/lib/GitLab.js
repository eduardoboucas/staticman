import config from '../config';
import errorHandler from './ErrorHandler';
import GitService from './GitService';
import Review from './models/Review';
import User from './models/User';

// TODO: Replace this. Import is ugly and dependency is deprecated.
const GitLabApi = require('gitlab/dist/es5').default;

export default class GitLab extends GitService {
  constructor(options = {}) {
    super(options.username, options.repository, options.branch);

    const token = config.get('gitlabToken');

    if (options.oauthToken) {
      this.api = new GitLabApi({
        url: config.get('gitlabBaseUrl'),
        oauthToken: options.oauthToken,
      });
    } else if (token) {
      this.api = new GitLabApi({
        url: config.get('gitlabBaseUrl'),
        token,
      });
    } else {
      throw new Error('Require an `oauthToken` or `token` option');
    }
  }

  get repositoryId() {
    return this.username && this.repository ? `${this.username}/${this.repository}` : '';
  }

  async _pullFile(path, branch) {
    try {
      return this.api.RepositoryFiles.show(this.repositoryId, path, branch);
    } catch (err) {
      throw errorHandler('GITLAB_READING_FILE', { err });
    }
  }

  async _commitFile(filePath, content, commitMessage, branch) {
    return this.api.RepositoryFiles.create(this.repositoryId, filePath, branch, {
      content,
      commit_message: commitMessage,
      encoding: 'base64',
    });
  }

  async getBranchHeadCommit(branch) {
    const result = await this.api.Branches.show(this.repositoryId, branch);
    return result.commit.id;
  }

  async createBranch(branch, sha) {
    return this.api.Branches.create(this.repositoryId, branch, sha);
  }

  async deleteBranch(branch) {
    return this.api.Branches.remove(this.repositoryId, branch);
  }

  async createReview(reviewTitle, branch, reviewBody) {
    return this.api.MergeRequests.create(this.repositoryId, branch, this.branch, reviewTitle, {
      description: reviewBody,
      remove_source_branch: true,
    });
  }

  async getReview(reviewId) {
    const {
      description: body,
      source_branch: sourceBranch,
      target_branch: targetBranch,
      state,
      title,
    } = this.api.MergeRequests.show(this.repositoryId, reviewId);

    return new Review(title, body, state, sourceBranch, targetBranch);
  }

  async readFile(filePath, getFullResponse) {
    try {
      return await super.readFile(filePath, getFullResponse);
    } catch (err) {
      throw errorHandler('GITLAB_READING_FILE', { err });
    }
  }

  async writeFile(filePath, data, targetBranch, commitTitle) {
    try {
      return await super.writeFile(filePath, data, targetBranch, commitTitle);
    } catch (err) {
      if (err?.error?.message === 'A file with this name already exists') {
        throw errorHandler('GITLAB_FILE_ALREADY_EXISTS', { err });
      }

      throw errorHandler('GITLAB_WRITING_FILE', { err });
    }
  }

  async writeFileAndSendReview(filePath, data, branch, commitTitle, reviewBody) {
    try {
      return await super.writeFileAndSendReview(filePath, data, branch, commitTitle, reviewBody);
    } catch (err) {
      throw errorHandler('GITLAB_CREATING_PR', { err });
    }
  }

  async getCurrentUser() {
    try {
      const {
        username,
        email,
        name,
        avatar_url: avatarUrl,
        bio,
        website_url: websiteUrl,
        organisation,
      } = await this.api.Users.current();

      return new User('gitlab', username, email, name, avatarUrl, bio, websiteUrl, organisation);
    } catch (err) {
      throw errorHandler('GITLAB_GET_USER', { err });
    }
  }
}
