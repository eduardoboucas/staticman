import { Octokit } from '@octokit/rest';

import connect from '../../../source/controllers/connect';
import * as helpers from '../../helpers';

jest.mock('@octokit/rest');

let req;
let res;

beforeEach(() => {
  req = helpers.getMockRequest();
  res = helpers.getMockResponse();
});

describe('Connect controller', () => {
  test('accepts the invitation if one is found and replies with "Staticman connected!"', async () => {
    const invitationId = 123;
    const mockAcceptRepoInvite = jest.fn().mockResolvedValue();
    const mockGetRepoInvites = jest.fn().mockResolvedValue({
      data: [
        {
          id: invitationId,
          repository: {
            full_name: `${req.params.username}/${req.params.repository}`,
          },
        },
      ],
    });

    Octokit.mockImplementation(() => ({
      repos: {
        listInvitationsForAuthenticatedUser: mockGetRepoInvites,
        acceptInvitation: mockAcceptRepoInvite,
      },
    }));

    expect.assertions(3);

    await connect(req, res);
    expect(mockGetRepoInvites).toHaveBeenCalledTimes(1);
    expect(mockAcceptRepoInvite).toHaveBeenCalledTimes(1);
    expect(res.send.mock.calls[0][0]).toBe('Staticman connected!');
  });

  test('returns a 404 and an error message if a matching invitation is not found', async () => {
    const invitationId = 123;
    const mockAcceptRepoInvite = jest.fn().mockResolvedValue();
    const mockGetRepoInvites = jest.fn().mockResolvedValue({
      data: [
        {
          id: invitationId,
          repository: {
            full_name: `${req.params.username}/anotherrepo`,
          },
        },
      ],
    });

    Octokit.mockImplementation(() => ({
      repos: {
        listInvitationsForAuthenticatedUser: mockGetRepoInvites,
        acceptInvitation: mockAcceptRepoInvite,
      },
    }));

    expect.assertions(4);

    await connect(req, res);
    expect(mockGetRepoInvites).toHaveBeenCalledTimes(1);
    expect(mockAcceptRepoInvite).not.toHaveBeenCalled();
    expect(res.send.mock.calls[0][0]).toBe('Invitation not found');
    expect(res.status.mock.calls[0][0]).toBe(404);
  });

  test('returns a 404 and an error message if the response from GitHub is invalid', async () => {
    const mockAcceptRepoInvite = jest.fn().mockResolvedValue();
    const mockGetRepoInvites = jest.fn().mockResolvedValue({
      data: {
        invalidProperty: 'invalidValue',
      },
    });

    Octokit.mockImplementation(() => ({
      repos: {
        listInvitationsForAuthenticatedUser: mockGetRepoInvites,
        acceptInvitation: mockAcceptRepoInvite,
      },
    }));

    expect.assertions(4);

    await connect(req, res);
    expect(mockGetRepoInvites).toHaveBeenCalledTimes(1);
    expect(mockAcceptRepoInvite).not.toHaveBeenCalled();
    expect(res.send.mock.calls[0][0]).toBe('Invitation not found');
    expect(res.status.mock.calls[0][0]).toBe(404);
  });
});
