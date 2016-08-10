var GitHubApi = require('github')

module.exports = (config) => {
  return (repo, data) => {
    if (data.number) {
      var github = new GitHubApi({
        debug: false,
        protocol: 'https',
        host: 'api.github.com',
        pathPrefix: '',
        headers: {
          'user-agent': 'Staticman agent'
        },
        timeout: 5000,
        Promise: Promise
      })

      github.authenticate({
        type: 'oauth',
        token: config.githubToken
      })

      github.pullRequests.get({
        user: data.repository.owner.login,
        repo: data.repository.name,
        number: data.number
      }).then((response) => {
        if ((response.state === 'closed') && (response.head.ref.indexOf('staticman_') === 0)) {
          return github.gitdata.deleteReference({
            user: data.repository.owner.login,
            repo: data.repository.name,
            ref: 'heads/' + response.head.ref
          })
        }
      }).catch((err) => {
        console.log(err.stack)
      })
    }
  }
}
