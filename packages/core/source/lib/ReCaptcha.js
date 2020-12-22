import request from 'request-promise';

import errorHandler, { getInstance } from './ErrorHandler';

const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

export default async function checkRecaptcha(staticman, req) {
  const siteConfig = await staticman.getSiteConfig();

  if (!siteConfig.get('reCaptcha.enabled')) {
    return false;
  }

  const configSiteSecret = siteConfig.get('reCaptcha.secret');
  const requestOptions = req?.body?.options?.reCaptcha;

  let secret = configSiteSecret;

  if (!secret) {
    try {
      secret = staticman.decrypt(requestOptions.secret);
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
    uri: VERIFY_URL,
  });

  if (response.success !== true) {
    const errorCode = getInstance().getErrorCode(response['error-codes'][0]);

    throw errorHandler(errorCode);
  }

  return response.success === true;
}
