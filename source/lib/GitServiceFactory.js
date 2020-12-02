import GitLab from './GitLab';
import GitHub from './GitHub';

export default async (service, options) => {
  let github;

  switch (service) {
    case 'gitlab':
      return new GitLab(options);
    default:
      github = new GitHub(options);
      await github.init();
      return github;
  }
};
