import nock from 'nock';
import request from 'supertest';

import * as GitHubMocks from '../helpers/githubApiMocks';
import StaticmanAPI from '../../source/server';

const staticman = new StaticmanAPI().server;
const supportedApiVersions = [['v1'], ['v2'], ['v3']];

afterEach(() => {
  nock.cleanAll();
});

describe.each(supportedApiVersions)('API %s - Connect endpoint', (version) => {
  it('accepts the collaboration invitation and replies with "Staticman connected!"', async () => {
    const mockInviteInfo = {
      username: 'johndoe',
      repository: 'foobar',
      id: 1,
    };
    const reqListInvititations = GitHubMocks.fetchGitHubCollaboratorInvitations(mockInviteInfo);
    const reqAcceptInvitation = GitHubMocks.acceptGitHubCollaboratorInvitation(mockInviteInfo.id);

    expect.assertions(2);

    await request(staticman)
      .get(`/${version}/connect/${mockInviteInfo.username}/${mockInviteInfo.repository}`)
      .expect(200)
      .expect('Staticman connected!');
    expect(reqListInvititations.isDone()).toBe(true);
    expect(reqAcceptInvitation.isDone()).toBe(true);
  });

  it('returns a 404 and an error message when collaboration invitation is not found', async () => {
    const mockInviteInfo = {
      username: 'johndoe',
      repository: 'foobar',
      id: 1,
    };
    const reqListInvititations = GitHubMocks.fetchGitHubCollaboratorInvitations(mockInviteInfo);
    const reqAcceptInvitation = GitHubMocks.acceptGitHubCollaboratorInvitation(mockInviteInfo.id);

    expect.assertions(2);

    await request(staticman)
      .get(`/${version}/connect/${mockInviteInfo.username}/anotherrepo`)
      .expect(404)
      .expect('Invitation not found');
    expect(reqListInvititations.isDone()).toBe(true);
    expect(reqAcceptInvitation.isDone()).toBe(false);
  });
});
