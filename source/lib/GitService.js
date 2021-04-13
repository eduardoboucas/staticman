import yaml from 'js-yaml';

import errorHandler from './ErrorHandler';

export default class GitService {
  constructor(username, repository, branch) {
    this.username = username;
    this.repository = repository;
    this.branch = branch;
  }

  // eslint-disable-next-line class-methods-use-this, no-unused-vars
  _pullFile(_filePath, _branch) {
    throw new Error('Abstract method `_pullFile` should be implemented');
  }

  // eslint-disable-next-line class-methods-use-this, no-unused-vars
  _commitFile(_filePath, _contents, _commitTitle, _branch) {
    throw new Error('Abstract method `_commitFile` should be implemented');
  }

  // eslint-disable-next-line class-methods-use-this, no-unused-vars
  getBranchHeadCommit(_branch) {
    throw new Error('Abstract method `getBranchHeadCommit` should be implemented');
  }

  // eslint-disable-next-line class-methods-use-this, no-unused-vars
  createBranch(_branch, _sha) {
    throw new Error('Abstract method `createBranch` should be implemented');
  }

  // eslint-disable-next-line class-methods-use-this, no-unused-vars
  deleteBranch(_branch) {
    throw new Error('Abstract method `deleteBranch` should be implemented');
  }

  // eslint-disable-next-line class-methods-use-this, no-unused-vars
  createReview(_commitTitle, _branch, _reviewBody) {
    throw new Error('Abstract method `createReview` should be implemented');
  }

  // eslint-disable-next-line class-methods-use-this, no-unused-vars
  getReview(_reviewId) {
    throw new Error('Abstract method `getReview` should be implemented');
  }

  // eslint-disable-next-line class-methods-use-this, no-unused-vars
  getCurrentUser() {
    throw new Error('Abstract method `getCurrentUser` should be implemented');
  }

  async readFile(path, getFullResponse) {
    const extension = path.split('.').pop();
    const res = await this._pullFile(path, this.branch);

    let content;
    try {
      content = Buffer.from(res.content, 'base64').toString();
    } catch (err) {
      throw errorHandler('GITHUB_READING_FILE', { err });
    }

    try {
      switch (extension) {
        case 'yml':
        case 'yaml':
          content = yaml.safeLoad(content, 'utf8');
          break;

        case 'json':
          content = JSON.parse(content);
          break;

        default:
          break;
      }

      if (getFullResponse) {
        return {
          content,
          file: {
            content: res.content,
          },
        };
      }

      return content;
    } catch (err) {
      const errorData = { err };

      if (err.message) {
        errorData.data = err.message;
      }

      throw errorHandler('PARSING_ERROR', errorData);
    }
  }

  writeFile(filePath, data, branch = this.branch, commitTitle = 'Add Staticman file') {
    return this._commitFile(filePath, Buffer.from(data).toString('base64'), commitTitle, branch);
  }

  writeFileAndSendReview(
    filePath,
    data,
    branch,
    commitTitle = 'Add Staticman file',
    reviewBody = ''
  ) {
    return this.getBranchHeadCommit(this.branch)
      .then(async (sha) => {
        await this.createBranch(branch, sha)
        await this.writeFile(filePath, data, branch, commitTitle)
        return this.createReview(commitTitle, branch, reviewBody)
        
      })
  }
}
