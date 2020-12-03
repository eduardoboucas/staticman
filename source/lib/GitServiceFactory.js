import GitLab from './GitLab';
import GitHub from './GitHub';

export default async (service, options) => {
  switch (service) {
    case 'gitlab':
      return new GitLab(options);
    default:
      return new GitHub(options);
  }
};
