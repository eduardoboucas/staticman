export default class CaptchaService {
  constructor(secretKey, domainURL) {
    this.secretKey = secretKey;
    this.domainURL = domainURL;
  }

  // eslint-disable-next-line class-methods-use-this, no-unused-vars
  async verify() {
    throw new Error('Abstract method `verify` should be implemented');
  }

  // eslint-disable-next-line class-methods-use-this, no-unused-vars
  async getKeyForToken() {
    throw new Error('Abstract method `getKeyForToken` should be implemented');
  }

  // eslint-disable-next-line class-methods-use-this, no-unused-vars
  verifyConfig() {
    throw new Error('Abstract method `verifyConfig` should be implemented');
  }
}
