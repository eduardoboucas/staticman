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

  const isAppAuth = config.get('githubAppID') && config.get('githubPrivateKey');

  if (isAppAuth) {
    return res.send('Staticman connected!');
  }

  return github.api.repos.listInvitationsForAuthenticatedUser({}).then(({ data }) => {
    const expectedRepoName = `${req.params.username}/${req.params.repository}`;

    const collaborationInvite =
      Array.isArray(data) &&
      data.find((invitation) => invitation.repository.full_name === expectedRepoName);

    if (!collaborationInvite) {
      return res.status(404).send('Invitation not found');
    }

    return github.api.repos
      .acceptInvitation({
        invitation_id: collaborationInvite.id,
      })
      .then(() => {
        res.send('Staticman connected!');

        if (ua) {
          ua.event('Repositories', 'Connect').send();
        }
      })
      .catch(() => {
        res.status(500).send('Error');

        if (ua) {
          ua.event('Repositories', 'Connect error').send();
        }
      });
  });
};
