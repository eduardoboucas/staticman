import requestPromise from 'request-promise'

import CaptchaService from './CaptchaService'
import errorHandler from './ErrorHandler';

export default class HCaptcha extends CaptchaService {
  
  constructor(siteConfig) {
    const secretKey = siteConfig.get('captcha.HCaptcha.secret');
    const domainURL = siteConfig.get('captcha.HCaptcha.domainURL');
    super(secretKey, domainURL);
  }

  verifyConfig() {
    if (this.secretKey === undefined || this.secretKey === "") {
      throw errorHandler("HCAPTCHA_CONFIG_MISSING")
    }
  }

  // eslint-disable-next-line class-methods-use-this
  getKeyForToken() {
    return 'h-captcha-response'
  }

  async verify(token) {
    if (!token) {
      throw errorHandler('RECAPTCHA_TOKEN_MISSING')
    }
    try {
      const res = await requestPromise({
        method: 'post',
        url: `${this.domainURL}/siteverify`,
        form: {
          secret: this.secretKey,
          response: token,
        },
        json: true,
      })
      if (res?.success !== true) {
        throw errorHandler(res["error-codes"][0]);
      }
      return true
    } catch (err) {
      throw errorHandler(err["error-codes"], { err });
    }
  }
}