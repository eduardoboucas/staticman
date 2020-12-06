import reCaptcha from 'express-recaptcha';

import errorHandler from './ErrorHandler';

export default function checkRecaptcha(staticman, req) {
  return new Promise((resolve, reject) => {
    staticman
      .getSiteConfig()
      .then((siteConfig) => {
        if (!siteConfig.get('reCaptcha.enabled')) {
          return resolve(false);
        }

        const reCaptchaOptions = req?.body?.options?.reCaptcha;

        if (!reCaptchaOptions || !reCaptchaOptions.siteKey || !reCaptchaOptions.secret) {
          return reject(errorHandler('RECAPTCHA_MISSING_CREDENTIALS'));
        }

        let decryptedSecret;

        try {
          decryptedSecret = staticman.decrypt(reCaptchaOptions.secret);
        } catch (err) {
          return reject(errorHandler('RECAPTCHA_CONFIG_MISMATCH'));
        }

        if (
          reCaptchaOptions.siteKey !== siteConfig.get('reCaptcha.siteKey') ||
          decryptedSecret !== siteConfig.get('reCaptcha.secret')
        ) {
          return reject(errorHandler('RECAPTCHA_CONFIG_MISMATCH'));
        }

        reCaptcha.init(reCaptchaOptions.siteKey, decryptedSecret);
        reCaptcha.verify(req, () =>
          req?.recaptcha?.error ? reject(errorHandler(req.reCaptcha.error)) : resolve(true)
        );
        return resolve(true);
      })
      .catch((err) => reject(err));
  });
}
