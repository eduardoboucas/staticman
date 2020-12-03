import { fields, parameters } from './index';

export function pullRequest() {
  const basePrBody = pullRequestBody();

  return {
    number: 1,
    title: 'Some PR title',
    body: `<!--staticman_notification:${JSON.stringify(basePrBody)}-->`,
    head: {
      ref: parameters.branch,
    },
    base: {
      ref: 'master',
    },
    repository: {
      name: parameters.repository,
      owner: {
        login: parameters.username,
      },
    },
    state: 'merged',
    merged: true,
  };
}

export function pullRequestBody() {
  return {
    parameters,
    fields,
    options: {
      subscribe: 'email',
    },
  };
}
