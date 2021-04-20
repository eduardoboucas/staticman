import universalAnalytics from 'universal-analytics';
import config from '../config';
import CaptchaFactory from '../lib/CaptchaFactory';
import { getInstance } from '../lib/ErrorHandler';
import Staticman from '../lib/Staticman';

export const checkRecaptcha = async (staticman, req) => {
  const siteConfig = await staticman.getSiteConfig();
  // console.log(siteConfig)
  if (!siteConfig.get('captcha.enabled')) {
    return false;
  }
  const captcha = CaptchaFactory(siteConfig.get('captcha.service'), siteConfig)
  const result = await captcha.verify(req?.body[captcha.getKeyForToken()])
  return result 
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

export function processEntry(staticman, req, res) {
  const ua = config.get('analytics.uaTrackingId')
    ? universalAnalytics(config.get('analytics.uaTrackingId'))
    : null;
  const fields = req.query.fields || req.body.fields;
  const options = req.query.options || req.body.options || {};

  return staticman.processEntry(fields, options).then((data) => {
    sendResponse(res, {
      redirect: data.redirect,
      fields: data.fields,
    });

    if (ua) {
      ua.event('Entries', 'New entry').send();
    }
  });
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
  const staticman = await new Staticman(req.params);

  staticman.setConfigPath();
  staticman.setIp(req.headers['x-forwarded-for'] || req.connection.remoteAddress);
  staticman.setUserAgent(req.headers['user-agent']);

  return checkRecaptcha(staticman, req)
    .then(() => processEntry(staticman, req, res))
    .catch((err) =>
      sendResponse(res, {
        err,
        redirect: req?.body?.options?.redirect,
        redirectError: req?.body?.options?.redirectError,
      })
    );
};
