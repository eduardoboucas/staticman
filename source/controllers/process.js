import reCaptcha from 'express-recaptcha';
import universalAnalytics from 'universal-analytics';

import config from '../config';
import errorHandler, { getInstance } from '../lib/ErrorHandler';
import Staticman from '../lib/Staticman';

export async function checkRecaptcha(staticman, req) {
  const siteConfig = await staticman.getSiteConfig();
  if (!siteConfig.get('reCaptcha.enabled')) {
    return false;
  }

  const reCaptchaOptions = req?.body?.options?.reCaptcha;

  if (!reCaptchaOptions || !reCaptchaOptions.siteKey || !reCaptchaOptions.secret) {
    throw errorHandler('RECAPTCHA_MISSING_CREDENTIALS');
  }

  let decryptedSecret;

  try {
    decryptedSecret = Staticman.decrypt(reCaptchaOptions.secret);
  } catch (err) {
    throw errorHandler('RECAPTCHA_CONFIG_MISMATCH');
  }

  if (
    reCaptchaOptions.siteKey !== siteConfig.get('reCaptcha.siteKey') ||
    decryptedSecret !== siteConfig.get('reCaptcha.secret')
  ) {
    throw errorHandler('RECAPTCHA_CONFIG_MISMATCH');
  }

  reCaptcha.init(reCaptchaOptions.siteKey, decryptedSecret);
  reCaptcha.verify(req, () => (req?.recaptcha?.error ? errorHandler(req.reCaptcha.error) : true));
  return true;
}

export function createConfigObject(apiVersion, property) {
  const remoteConfig = {};

  if (apiVersion === '1') {
    remoteConfig.file = '_config.yml';
    remoteConfig.path = 'staticman';
  } else {
    remoteConfig.file = 'staticman.yml';
    remoteConfig.path = property || '';
  }

  return remoteConfig;
}

export async function processEntry(staticman, req, res) {
  const ua = config.get('analytics.uaTrackingId')
    ? universalAnalytics(config.get('analytics.uaTrackingId'))
    : null;
  const fields = req.query.fields || req.body.fields;
  const options = req.query.options || req.body.options || {};

  const data = await staticman.processEntry(fields, options);
  sendResponse(res, {
    redirect: data.redirect,
    fields: data.fields,
  });

  if (ua) {
    ua.event('Entries', 'New entry').send();
  }
}

export function sendResponse(res, data) {
  const error = data?.err;
  const statusCode = error ? 500 : 200;

  if (!error && data.redirect) {
    return res.redirect(data.redirect);
  }

  if (error && data.redirectError) {
    return res.redirect(data.redirectError);
  }

  const payload = {
    success: !error,
  };

  if (error?._smErrorCode) {
    const errorCode = getInstance().getErrorCode(error._smErrorCode);
    const errorMessage = getInstance().getMessage(error._smErrorCode);

    if (errorMessage) {
      payload.message = errorMessage;
    }

    if (error.data) {
      payload.data = error.data;
    }

    if (error) {
      payload.rawError = error;
    }

    payload.errorCode = errorCode;
  } else if (error) {
    payload.rawError = data.err.toString();
  } else {
    payload.fields = data.fields;
  }

  return res.status(statusCode).send(payload);
}

export default async (req, res) => {
  const staticman = new Staticman(req.params);
  await staticman.init();

  staticman.setConfigPath();
  staticman.setIp(req.headers['x-forwarded-for'] || req.connection.remoteAddress);
  staticman.setUserAgent(req.headers['user-agent']);

  try {
    await checkRecaptcha(staticman, req);
    await processEntry(staticman, req, res);
  } catch (err) {
    sendResponse(res, {
      err,
      redirect: req?.body?.options?.redirect,
      redirectError: req?.body?.options?.redirectError,
    });
  }
};
