import nock from 'nock';

import config from '../../source/config';

const githubToken = config.get('githubToken');

export function fetchGitHubCollaboratorInvitations(inviteInfo) {
  return nock(/api\.github\.com/, {
    reqheaders: {
      authorization: `token ${githubToken}`,
    },
  })
    .get('/user/repository_invitations')
    .reply(200, [
      {
        id: inviteInfo.id,
        repository: {
          full_name: `${inviteInfo.username}/${inviteInfo.repository}`,
        },
      },
    ]);
}

export function acceptGitHubCollaboratorInvitation(inviteId) {
  return nock(/api\.github\.com/, {
    reqheaders: {
      authorization: `token ${githubToken}`,
    },
  })
    .patch(`/user/repository_invitations/${inviteId}`)
    .reply(204);
}

export function fetchConfigFile(configInfo) {
  const configName = configInfo.version === '1' ? '_config.yml' : 'staticman.yml';
  const mockConfig =
    configInfo.version === '1'
      ? configInfo.contents.replace('comments:', 'staticman:')
      : configInfo.contents;

  const endpoint = `/repos/${configInfo.username}/${configInfo.repository}/contents/${configName}?ref=${configInfo.branch}`;

  return nock(/api\.github\.com/, {
    reqheaders: {
      Authorization: `token ${githubToken}`,
    },
  })
    .get(endpoint)
    .reply(200, {
      type: 'file',
      encoding: 'base64',
      size: 5362,
      name: `${configName}`,
      path: `${configName}`,
      content: _btoa(mockConfig),
      sha: '3d21ec53a331a6f037a91c368710b99387d012c1',
      url: `https://api.github.com/repos/octokit/octokit.rb/contents/${configName}`,
      git_url:
        'https://api.github.com/repos/octokit/octokit.rb/git/blobs/3d21ec53a331a6f037a91c368710b99387d012c1',
      html_url: `https://github.com/octokit/octokit.rb/blob/master/${configName}`,
      download_url: `https://raw.githubusercontent.com/octokit/octokit.rb/master/${configName}`,
      _links: {
        git:
          'https://api.github.com/repos/octokit/octokit.rb/git/blobs/3d21ec53a331a6f037a91c368710b99387d012c1',
        self: `https://api.github.com/repos/octokit/octokit.rb/contents/${configName}`,
        html: `https://github.com/octokit/octokit.rb/blob/master/${configName}`,
      },
    });
}

function _btoa(contents) {
  return Buffer.from(contents).toString('base64');
}

export function fetchPullRequest(responsePrBody) {
  return nock(/api\.github\.com/, {
    reqheaders: {
      authorization: 'token '.concat('1q2w3e4r'),
    },
  })
    .get(
      `/repos/${responsePrBody.repository.owner.login}/${responsePrBody.repository.name}/pulls/${responsePrBody.number}`
    )
    .reply(200, responsePrBody);
}

export function deleteBranch(deleteInfo) {
  const endpoint = `/repos/${deleteInfo.username}/${
    deleteInfo.repository
  }/git/refs/heads%2F${encodeURI(deleteInfo.branch)}`;

  return nock(/api\.github\.com/, {
    reqheaders: {
      authorization: 'token '.concat('1q2w3e4r'),
    },
  })
    .delete(endpoint)
    .reply(204);
}
