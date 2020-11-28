import config from '../config';
import GitHub from '../lib/GitHub';

export default async (req, res) => {
  const ua = config.get('analytics.uaTrackingId')
    ? require('universal-analytics')(config.get('analytics.uaTrackingId'))
    : null;

  const github = await new GitHub({
    username: req.params.username,
    repository: req.params.repository,
    branch: req.params.branch,
    token: config.get('githubToken'),
    version: req.params.version,
  });

  if (_isAppAuth()) {
    return res.send('Staticman connected!');
  }

  const { data: invitations } = await github.api.repos.listInvitationsForAuthenticatedUser({});
  const expectedRepoName = `${req.params.username}/${req.params.repository}`;

  const collaborationInvite = _findMatchingRepoInvitation(invitations, expectedRepoName);

  if (!collaborationInvite) {
    return res.status(404).send('Invitation not found');
  }

  try {
    await github.api.repos.acceptInvitation({ invitation_id: collaborationInvite.id });

    if (ua) {
      ua.event('Repositories', 'Connect').send();
    }

    return res.send('Staticman connected!');
  } catch {
    if (ua) {
      ua.event('Repositories', 'Connect error').send();
    }
    return res.status(500).send('Error');
  }
};

function _isAppAuth() {
  return config.get('githubAppID') && config.get('githubPrivateKey');
}

function _findMatchingRepoInvitation(invitationList, expectedRepoName) {
  return (
    Array.isArray(invitationList) &&
    invitationList.find((invitation) => invitation.repository.full_name === expectedRepoName)
  );
}
