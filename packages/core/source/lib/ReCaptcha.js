import request from 'request-promise';

import errorHandler from './ErrorHandler';

export default async function checkRecaptcha(staticman, req) {
  const siteConfig = await staticman.getSiteConfig();

  if (!siteConfig.get('reCaptcha.enabled')) {
    return false;
  }

  const configRecaptchaSecret = siteConfig.get('reCaptcha.secret');
  const reCaptchaOptions = req?.body?.options?.reCaptcha;

  if (!configRecaptchaSecret && (!reCaptchaOptions?.siteKey || !reCaptchaOptions?.secret)) {
    throw errorHandler('RECAPTCHA_MISSING_CREDENTIALS');
  }

  let secret = configRecaptchaSecret;

  if (!secret) {
    try {
      secret = staticman.decrypt(reCaptchaOptions.secret);
    } catch (err) {
      throw errorHandler('RECAPTCHA_CONFIG_MISMATCH');
    }
  }

  const value =
    req?.body?.['g-recaptcha-response'] ||
    req?.query?.['g-recaptcha-response'] ||
    req?.params?.['g-recaptcha-response'];
  const response = await request({
    body: `secret=${secret}&response=${value}`,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
    },
    json: true,
    method: 'post',
    uri: 'https://www.google.com/recaptcha/api/siteverify',
  });
  if (response.success !== true) {
    throw errorHandler(response['error-codes'][0]);
  }

  return response.success === true;
}
