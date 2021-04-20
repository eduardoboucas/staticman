import request from 'request-promise'
// request-promise is deprecated maybe use node-fetch 
import CaptchaService from './CaptchaService'
import errorHandler from './ErrorHandler';

export default class ReCaptcha extends CaptchaService {

  constructor(siteConfig) {
    const domainURL = siteConfig.get('captcha.ReCaptcha.domainURL');
    const secretKey = siteConfig.get('captcha.ReCaptcha.secret');
    super(secretKey, domainURL);
    this.version = siteConfig.get('captcha.ReCaptcha.version');
    this.score = siteConfig.get('captcha.ReCaptcha.score');
  }

  // eslint-disable-next-line class-methods-use-this
  getKeyForToken() {
    return 'g-recaptcha-response'
  }

  verifyConfig() {
    if (this.secretKey === undefined || this.secretKey === "") {
      throw errorHandler("RECAPTCHA_CONFIG_MISSING")
    }
  }

  // {
  //   "success": true|false,      // whether this request was a valid reCAPTCHA token for your site
  //   "score": number             // the score for this request (0.0 - 1.0)
  //   "action": string            // the action name for this request (important to verify)
  //   "challenge_ts": timestamp,  // timestamp of the challenge load (ISO format yyyy-MM-dd'T'HH:mm:ssZZ)
  //   "hostname": string,         // the hostname of the site where the reCAPTCHA was solved
  //   "error-codes": [...]        // optional
  // }
  
  async verify(token) {
    if (!token) {
      throw errorHandler('RECAPTCHA_TOKEN_MISSING')
    }

    try {
      const res = await request({
        json: true,
        method: 'POST',
        uri: `${this.domainURL}/recaptcha/api/siteverify`,
        form: {
          secret:this.secretKey,
          response:token,
        },
      })
      if (res?.success !== true) {
        throw errorHandler(res["error-codes"][0]);
      }
      if (this.version === "V3") {
        if (typeof res?.score === 'number' && res?.score > this.score) {
          throw errorHandler('RECAPTCHA_V3_SCORE_HIGH')
        }
      }
      return true
    } catch (err) {
      throw errorHandler(err["error-codes"], { err });
    }
  }
}
