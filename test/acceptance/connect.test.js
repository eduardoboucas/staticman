import nock from 'nock';
import request from 'supertest';

import config from '../../source/config';
import StaticmanAPI from '../../source/server';

const githubToken = config.get('githubToken');
const staticman = new StaticmanAPI().server;

afterEach(() => {
  nock.cleanAll();
});

const _mockFetchGitHubCollaboratorInvitations = (mockInviteList) =>
  nock('https://api.github.com', {
    reqheaders: {
      authorization: `token ${githubToken}`,
    },
  })
    .get('/user/repository_invitations')
    .reply(200, mockInviteList);

const _mockAcceptGitHubCollaboratorInvitation = (invitationId) =>
  nock('https://api.github.com', {
    reqheaders: {
      authorization: `token ${githubToken}`,
    },
  })
    .patch(`/user/repository_invitations/${invitationId}`)
    .reply(204);

describe('Connect endpoint', () => {
  test('accepts the invitation if one is found and replies with "Staticman connected!"', async () => {
    const mockInviteList = [
      {
        id: 123,
        repository: {
          full_name: `johndoe/foobar`,
        },
      },
    ];
    const reqListInvititations = _mockFetchGitHubCollaboratorInvitations(mockInviteList);
    const reqAcceptInvitation = _mockAcceptGitHubCollaboratorInvitation(mockInviteList[0].id);

    await request(staticman)
      .get('/v2/connect/johndoe/foobar')
      .expect(200)
      .expect('Staticman connected!');
    expect(reqListInvititations.isDone()).toBe(true);
    expect(reqAcceptInvitation.isDone()).toBe(true);
  });

  test('returns a 404 and an error message if a matching invitation is not found', async () => {
    const mockInviteList = [
      {
        id: 123,
        repository: {
          full_name: `johndoe/anotherrepo`,
        },
      },
    ];
    const reqListInvititations = _mockFetchGitHubCollaboratorInvitations(mockInviteList);
    const reqAcceptInvitation = _mockAcceptGitHubCollaboratorInvitation(mockInviteList[0].id);

    await request(staticman)
      .get('/v2/connect/johndoe/foobar')
      .expect(404)
      .expect('Invitation not found');
    expect(reqListInvititations.isDone()).toBe(true);
    expect(reqAcceptInvitation.isDone()).toBe(false);
  });
});
