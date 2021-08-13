import got from 'got';
import config from '../config';
import GitService from './GitService';
import Review from './models/Review';
import User from './models/User';

export default class OneDev extends GitService {
  constructor(options = {}) {
    super(options.username, options.repository, options.branch);

    this.api = got.extend({
      prefixUrl: config.get('onedevBaseUrl'),
      username: config.get('onedevUsername'),
      password: config.get('onedevPassword'),
      responseType: 'json'
    });
  }

  async _pullFile(path, branch) {
    const res = await this.api.get(`repositories/${this.repository}/files/${branch}/${path}`);
    return {content: res.body.base64Content};
  }

  async _commitFile(path, content, commitMessage, branch) {
    await this.api.post(
      `repositories/${this.repository}/files/${branch}/${path}`, {
        json: {
          '@type': 'FileCreateOrUpdateRequest',
          commitMessage,
          base64Content: content
        }
      }
    );
  }

  async getBranchHeadCommit(branch) {
    const res = await this.api.get(`repositories/${this.repository}/branches/${branch}`);
    return res.body.commitHash;
  }

  async createBranch(branch, sha) {
    await this.api.post(
      `repositories/${this.repository}/branches`, {
        json: {
          branchName: branch,
          revision: sha
        }
      }
    );
  }

  async deleteBranch(branch) {
    await this.api.delete(`repositories/${this.repository}/branches/${branch}`);
  }

  async createReview(reviewTitle, branch, reviewBody) {
    await this.api.post(
      `pull-requests`, {
        json: {
          targetProjectId: this.repository,
          sourceProjectId: this.repository,
          targetBranch: this.branch,
          sourceBranch: branch,
          title: reviewTitle,
          description: reviewBody
        }
      }
    );
  }

  async getReview(reviewId) {
    const res = await this.api.get(`pull-requests/${reviewId}`);
    return new Review(res.body.title, res.body.description, '', res.body.sourceBranch, res.body.targetBranch);
  }

  async getCurrentUser() {
    const res = await this.api.get(`users/me`);
    return new User('onedev', res.body.name ?? '', res.body.email ?? '', res.body.fullName ?? '', '', '', '', '');
  }
}
