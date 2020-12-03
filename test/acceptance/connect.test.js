import nock from 'nock';
import request from 'supertest';

import * as GitHubMocks from '../helpers/githubApiMocks';
import * as GitHubMockResponses from '../helpers/githubApiMockResponses';
import { parameters } from '../helpers';
import StaticmanAPI from '../../source/server';

const staticman = new StaticmanAPI().server;
const supportedApiVersions = [['v1'], ['v2'], ['v3']];

let mockParameters;

beforeEach(() => {
  mockParameters = parameters;
});

afterEach(() => {
  nock.cleanAll();
});

describe.each(supportedApiVersions)('API %s - Connect endpoint', (version) => {
  it('accepts the collaboration invitation and replies with "Staticman connected!"', async () => {
    const expectedInvite = GitHubMockResponses.invitation();
    const reqListInvititations = GitHubMocks.fetchCollaboratorInvitations();
    const reqAcceptInvitation = GitHubMocks.acceptCollaboratorInvitation(expectedInvite.id);

    expect.assertions(2);

    await request(staticman)
      .get(`/${version}/connect/${mockParameters.username}/${mockParameters.repository}`)
      .expect(200)
      .expect('Staticman connected!');
    expect(reqListInvititations.isDone()).toBe(true);
    expect(reqAcceptInvitation.isDone()).toBe(true);
  });

  it('returns a 404 and an error message when collaboration invitation is not found', async () => {
    const expectedInvite = GitHubMockResponses.invitation();
    const reqListInvititations = GitHubMocks.fetchCollaboratorInvitations();
    const reqAcceptInvitation = GitHubMocks.acceptCollaboratorInvitation(expectedInvite.id);

    expect.assertions(2);

    await request(staticman)
      .get(`/${version}/connect/${mockParameters.username}/anotherrepo`)
      .expect(404)
      .expect('Invitation not found');
    expect(reqListInvititations.isDone()).toBe(true);
    expect(reqAcceptInvitation.isDone()).toBe(false);
  });
});
