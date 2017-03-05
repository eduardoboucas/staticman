'use strict'
const reCaptcha = require('express-recaptcha')

class Captcha {

  constructor(staticman, reCaptcha) {
    this.staticman = staticman
    this.reCaptcha = reCaptcha
  }

  static create(staticman) {
    return new Captcha(staticman, reCaptcha)
  }

  checkRecaptcha(req) {
    return new Promise((resolve, reject) => {
      this.staticman.getSiteConfig().then(siteConfig => {
        if (!siteConfig.get('reCaptcha.enabled')) {
          return resolve(false)
        }

        const reCaptchaOptions = req.body.options && req.body.options.reCaptcha

        if (!reCaptchaOptions || !reCaptchaOptions.siteKey || !reCaptchaOptions.secret) {
          return reject('Missing reCAPTCHA API credentials')
        }

        let decryptedSecret

        try {
          decryptedSecret = this.staticman.decrypt(reCaptchaOptions.secret)
        } catch (err) {
          return reject('Could not decrypt reCAPTCHA secret')
        }

        if ((reCaptchaOptions.siteKey) !== siteConfig.get('reCaptcha.siteKey') ||
          (decryptedSecret !== siteConfig.get('reCaptcha.secret'))) {
          return reject('reCAPTCHA options do not match Staticman config')
        }

        reCaptcha.init(reCaptchaOptions.siteKey, decryptedSecret)
        reCaptcha.verify(req, err => {
          if (err) {
            return reject(this.getRecaptchaError(err))
          }

          return resolve(true)
        })
      }).catch(err => reject(err))
    })
  }

  getRecaptchaError(errorCode) {
    switch (errorCode) {
      case 'missing-input-secret':
        return 'reCAPTCHA: The secret parameter is missing'

      case 'invalid-input-secret':
        return 'reCAPTCHA: The secret parameter is invalid or malformed'

      case 'missing-input-response':
        return 'reCAPTCHA: The response parameter is missing'

      case 'invalid-input-response':
        return 'reCAPTCHA: The response parameter is invalid or malformed'
    }

    return errorCode
  }

}

module.exports = Captcha