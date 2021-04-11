import config from '../config';
import errorHandler from './ErrorHandler';
import GitService from './GitService';
import Review from './models/Review';
import User from './models/User';
import { Gitlab } from '@gitbeaker/node'; 

export default class GitLab extends GitService {
  constructor(options = {}) {
    super(options.username, options.repository, options.branch);
    this.pojectId = [];
    const token = config.get('gitlabToken');
    if (options.oauthToken) {
      this.api = new Gitlab({
        host: config.get('gitlabBaseUrl'),
        oauthToken: options.oauthToken,
      });
    } else if (token) {
      this.api = new Gitlab({
        host: config.get('gitlabBaseUrl'),
        token,
      });
    } else {
      throw new Error('Require an `oauthToken` or `token` option');
    }
  }

  async repositoryId() {
    if (this.pojectId[this.repository] === undefined) {
      let projects = await this.api.Projects.search(this.repository)
      if (projects.length >= 1) {
        this.pojectId[this.repository] = projects[0].id;
      }
    }  
    return this.pojectId[this.repository];
  }

  async _pullFile(path, branch) {
    await this.repositoryId()
    return this.api.RepositoryFiles.show(this.pojectId[this.repository], path, branch).catch((err) =>
      Promise.reject(errorHandler('GITLAB_READING_FILE', { err }))
    );
  }

  async _commitFile(filePath, content, commitMessage, branch) {
    await this.repositoryId()
    let action = [{
      "action": "create",
      "file_path": filePath,
      "content": content,
      "encoding": "base64"
    }];

    return this.api.Commits.create(this.pojectId[this.repository], branch, commitMessage, action)
  }

  async getBranchHeadCommit(branch) {
    await this.repositoryId()
    return this.api.Branches.show(this.pojectId[this.repository], branch).then((res) => res.commit.id);
  }

  async createBranch(branch, sha) {
    await this.repositoryId()

    return this.api.Branches.create(this.pojectId[this.repository], branch, sha);
  }

  async deleteBranch(branch) {
    await this.repositoryId()

    return this.api.Branches.remove(this.pojectId[this.repository], branch);
  }

  async createReview(reviewTitle, branch, reviewBody) {
    await this.repositoryId()
    return this.api.MergeRequests.create(this.pojectId[this.repository], branch, this.branch, reviewTitle, {
      description: reviewBody,
      remove_source_branch: true,
    });
  }

  async getReview(reviewId) {
    await this.repositoryId()

    return this.api.MergeRequests.show(this.pojectId[this.repository], reviewId).then(
      ({
        description: body,
        source_branch: sourceBranch,
        target_branch: targetBranch,
        state,
        title,
      }) => new Review(title, body, state, sourceBranch, targetBranch)
    );
  }

  async readFile(filePath, getFullResponse) {
    await this.repositoryId()

    return super
      .readFile(filePath, getFullResponse)
      .catch((err) => Promise.reject(errorHandler('GITLAB_READING_FILE', { err })));
  }

  async writeFile(filePath, data, targetBranch, commitTitle) {
    await this.repositoryId()

    return super.writeFile(filePath, data, targetBranch, commitTitle).catch((err) => {
      if (err?.error?.message === 'A file with this name already exists') {
        return Promise.reject(errorHandler('GITLAB_FILE_ALREADY_EXISTS', { err }));
      }

      return Promise.reject(errorHandler('GITLAB_WRITING_FILE', { err }));
    });
  }

  async writeFileAndSendReview(filePath, data, branch, commitTitle, reviewBody) {
    await this.repositoryId()

    return super
      .writeFileAndSendReview(filePath, data, branch, commitTitle, reviewBody)
      .catch((err) => Promise.reject(errorHandler('GITLAB_CREATING_PR', { err })));
  }

  async getCurrentUser() {
    await this.repositoryId()

    return this.api.Users.current()
      .then(
        ({
          username,
          email,
          name,
          avatar_url: avatarUrl,
          bio,
          website_url: websiteUrl,
          organisation,
        }) => new User('gitlab', username, email, name, avatarUrl, bio, websiteUrl, organisation)
      )
      .catch((err) => Promise.reject(errorHandler('GITLAB_GET_USER', { err })));
  }
}
