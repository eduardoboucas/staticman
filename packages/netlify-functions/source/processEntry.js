import { checkRecaptcha, getErrorHandlerInstance, Staticman } from '@staticman/core';

function resolveArraySyntax(queryParameters) {
  const parsedQueryParameters = {};

  Object.entries(queryParameters).forEach(([key, value]) => {
    const arraySyntaxMatch = key.match(/^(.*)\[(.*)\]$/);

    if (arraySyntaxMatch) {
      const [, parentKey, childKey] = arraySyntaxMatch;

      parsedQueryParameters[parentKey] = parsedQueryParameters[parentKey] || {};
      parsedQueryParameters[parentKey][childKey] = value;
    } else {
      parsedQueryParameters[key] = value;
    }
  });

  return parsedQueryParameters;
}

function sendResponse(callback, data) {
  const error = data && data.err;
  const statusCode = error ? 500 : 200;

  if (!error && data.redirect) {
    return callback(null, {
      statusCode: 303,
      headers: {
        Location: data.redirect,
      },
    });
  }

  if (error && data.redirectError) {
    return callback(null, {
      statusCode: 303,
      headers: {
        Location: data.redirectError,
      },
    });
  }

  const payload = {
    success: !error,
  };

  if (error && error._smErrorCode) {
    const errorCode = getErrorHandlerInstance().getErrorCode(error._smErrorCode);
    const errorMessage = getErrorHandlerInstance().getMessage(error._smErrorCode);

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

  return callback(null, {
    statusCode,
    body: JSON.stringify(payload),
  });
}

export default async function processEntry(event, _, callback, configParameters) {
  const { body, headers, queryStringParameters } = event;
  const query = resolveArraySyntax(queryStringParameters);
  const parameters = {
    branch: query.branch,
    property: query.property,
    repository: query.repository,
    username: query.username,
    version: '2',
  };
  const requestCompatibleObject = {
    body,
    headers,
    params: {},
    query,
  };
  const staticman = await new Staticman(parameters, {
    ip: headers['x-forwarded-for'],
    userAgent: headers['user-agent'],
    ...configParameters,
  });
  const fields = query.fields || body.fields;
  const options = query.options || body.options;

  try {
    await checkRecaptcha(staticman, requestCompatibleObject);

    const data = await staticman.processEntry(fields, options);

    sendResponse(callback, {
      redirect: data.redirect,
      fields: data.fields,
    });
  } catch (err) {
    sendResponse(callback, {
      err,
      redirect: body && body.options && body.options.redirect,
      redirectError: body && body.options && body.options.redirectError,
    });
  }
}
