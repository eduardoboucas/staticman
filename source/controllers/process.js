import checkRecaptcha from '../lib/ReCaptcha';
import { getInstance } from '../lib/ErrorHandler';
import Staticman from '../lib/Staticman';

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
  const fields = req.query.fields || req.body.fields;
  const options = req.query.options || req.body.options;
  const data = await staticman.processEntry(fields, options);

  sendResponse(res, {
    redirect: data.redirect,
    fields: data.fields,
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
  const staticman = await new Staticman(req.params, {
    ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
  });

  try {
    await checkRecaptcha(staticman, req);

    processEntry(staticman, req, res);
  } catch (err) {
    sendResponse(res, {
      err,
      redirect: req?.body?.options?.redirect,
      redirectError: req?.body?.options?.redirectError,
    });
  }
};
