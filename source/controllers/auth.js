import gitFactory from '../lib/GitServiceFactory';
import * as oauth from '../lib/OAuth';
import * as RSA from '../lib/RSA';
import Staticman from '../lib/Staticman';

export default async (req, res) => {
  const staticman = new Staticman(req.params);
  await staticman.init();
  staticman.setConfigPath();

  let requestAccessToken;

  switch (req.params.service) {
    case 'gitlab':
      requestAccessToken = (siteConfig) =>
        oauth.requestGitLabAccessToken(
          req.query.code,
          siteConfig.get('gitlabAuth.clientId'),
          siteConfig.get('gitlabAuth.clientSecret'),
          siteConfig.get('gitlabAuth.redirectUri')
        );
      break;
    default:
      requestAccessToken = (siteConfig) =>
        oauth.requestGitHubAccessToken(
          req.query.code,
          siteConfig.get('githubAuth.clientId'),
          siteConfig.get('githubAuth.clientSecret'),
          siteConfig.get('githubAuth.redirectUri')
        );
  }

  try {
    const siteConfig = await staticman.getSiteConfig();
    const accessToken = await requestAccessToken(siteConfig);
    const git = await gitFactory(req.params.service, {
      oauthToken: accessToken,
      version: req.params.version,
    });

    const user = await git.getCurrentUser();

    res.send({
      accessToken: RSA.encrypt(accessToken),
      user,
    });
  } catch (err) {
    const statusCode = err.statusCode || 401;

    res.status(statusCode).send({
      statusCode,
      message: err.message,
    });
  }
};
