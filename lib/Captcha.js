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

  validateRequest(req) {
    return new Promise((resolve, reject) => {
      this.staticman.getSiteConfig()
        .then(siteConfig => {
          let captchaRequest

          if (!siteConfig.get('reCaptcha.enabled')) {
            return resolve()
          }

          if(!req.body.options.reCaptcha  || !req.body.options.reCaptcha.siteKey  ||  !req.body.options.reCaptcha.encryptedSecret) {
            return reject('Missing reCAPTCHA API credential.')
          }

          try {
            captchaRequest = {
              siteKey: req.body.options.reCaptcha.siteKey,
              secret: this.staticman.decrypt(req.body.options.reCaptcha.encryptedSecret)
            }
          } catch(err) {
            return reject('Invalid encryptedSecret')
          }

          if(siteConfig.get('reCaptcha.siteKey') !== captchaRequest.siteKey  || siteConfig.get('reCaptcha.secret') !== captchaRequest.secret) {
            return reject('ReCAPTCHA API credential spoofing is not allowed.')
          }

          this.reCaptcha.init(captchaRequest.siteKey, captchaRequest.secret)

          this.reCaptcha.verify(req, (err) => {
            if (err) {
              return reject(err)
            }
            return resolve()
          })
        })
        .catch(err => {
          return reject(err)
        })
    })
  }
}

module.exports = Captcha