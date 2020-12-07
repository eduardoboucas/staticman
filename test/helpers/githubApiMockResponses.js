import { btoa, fields, parameters } from './index';

export function fileContent(filename, contents) {
  return {
    type: 'file',
    encoding: 'base64',
    size: 5362,
    name: `${filename}`,
    path: `${filename}`,
    content: btoa(contents),
    sha: '3d21ec53a331a6f037a91c368710b99387d012c1',
    url: `https://api.github.com/repos/octokit/octokit.rb/contents/${filename}`,
    git_url:
      'https://api.github.com/repos/octokit/octokit.rb/git/blobs/3d21ec53a331a6f037a91c368710b99387d012c1',
    html_url: `https://github.com/octokit/octokit.rb/blob/master/${filename}`,
    download_url: `https://raw.githubusercontent.com/octokit/octokit.rb/master/${filename}`,
    _links: {
      git:
        'https://api.github.com/repos/octokit/octokit.rb/git/blobs/3d21ec53a331a6f037a91c368710b99387d012c1',
      self: `https://api.github.com/repos/octokit/octokit.rb/contents/${filename}`,
      html: `https://github.com/octokit/octokit.rb/blob/master/${filename}`,
    },
  };
}

export function invitation() {
  return {
    id: 123,
    repository: {
      full_name: `${parameters.username}/${parameters.repository}`,
    },
  };
}

export function oauth(token) {
  return {
    access_token: token,
    scope: 'repos',
    token_type: 'bearer',
  };
}

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
