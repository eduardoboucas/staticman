import config from '../config';
import GitHub from '../lib/GitHub';
import Staticman from '../lib/Staticman';

export default async (repo, data) => {
  const ua = config.get('analytics.uaTrackingId')
    ? require('universal-analytics')(config.get('analytics.uaTrackingId'))
    : null;

  if (!data.number) {
    return;
  }

  const github = await new GitHub({
    username: data.repository.owner.login,
    repository: data.repository.name,
    version: '1',
  });

  try {
    const review = await github.getReview(data.number);
    if (review.sourceBranch.indexOf('staticman_')) {
      return;
    }

    if (review.state !== 'merged' && review.state !== 'closed') {
      return;
    }

    if (review.state === 'merged') {
      const bodyMatch = review.body.match(/(?:.*?)<!--staticman_notification:(.+?)-->(?:.*?)/i);

      if (bodyMatch?.length === 2) {
        try {
          const parsedBody = JSON.parse(bodyMatch[1]);
          const staticman = await new Staticman(parsedBody.parameters);

          staticman.setConfigPath(parsedBody.configPath);
          staticman.processMerge(parsedBody.fields, parsedBody.options);
        } catch (err) {
          console.log(err);

          if (ua) {
            ua.event('Hooks', 'Process merge error').send();
          }
        }
      }
    }

    if (ua) {
      ua.event('Hooks', 'Delete branch').send();
    }
    github.deleteBranch(review.sourceBranch);
  } catch (err) {
    console.log(err);

    if (ua) {
      ua.event('Hooks', 'Delete branch error').send();
    }
  }
};
