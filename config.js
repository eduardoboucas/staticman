'use strict'

const convict = require('convict')
const path = require('path')

const schema = {
  akismet: {
    site: {
      doc: 'URL of an Akismet account used for spam checking.',
      docExample: 'http://yourdomain.com',
      format: String,
      default: null,
      env: 'AKISMET_SITE'
    },
    apiKey: {
      doc: 'API key to be used with Akismet.',
      format: String,
      default: null,
      env: 'AKISMET_API_KEY'
    }
  },
  analytics: {
    uaTrackingId: {
      doc: 'Universal Analytics account ID.',
      docExample: 'uaTrackingId: "UA-XXXX-XX"',
      format: String,
      default: null,
      env: 'UA_TRACKING_ID'
    }
  },
  email: {
    apiKey: {
      doc: 'Mailgun API key to be used for email notifications. Will be overridden by a `notifications.apiKey` parameter in the site config, if one is set.',
      format: String,
      default: null,
      env: 'EMAIL_API_KEY'
    },
    domain: {
      doc: 'Domain to be used with Mailgun for email notifications. Will be overridden by a `notifications.domain` parameter in the site config, if one is set.',
      format: String,
      default: 'staticman.net',
      env: 'EMAIL_DOMAIN'
    },
    fromAddress: {
      doc: 'Email address to send notifications from. Will be overridden by a `notifications.fromAddress` parameter in the site config, if one is set.',
      format: String,
      default: 'noreply@staticman.net',
      env: 'EMAIL_FROM'
    }
  },
  env: {
    doc: 'The applicaton environment.',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV'
  },
  githubAccessTokenUri: {
    doc: 'URI for the GitHub authentication provider.',
    format: String,
    default: 'https://github.com/login/oauth/access_token',
    env: 'GITHUB_ACCESS_TOKEN_URI'
  },
  githubAppID: {
    doc: 'ID of the GitHub App.',
    format: String,
    default: null,
    env: 'GITHUB_APP_ID'
  },
  githubBaseUrl: {
    doc: 'Base URL for the GitHub API.',
    format: String,
    default: 'https://api.github.com',
    env: 'GITHUB_BASE_URL'
  },
  githubPrivateKey: {
    doc: 'Private key for the GitHub App.',
    format: String,
    default: null,
    env: 'GITHUB_PRIVATE_KEY'
  },
  githubToken: {
    doc: 'Access token to the GitHub account (legacy)',
    format: String,
    default: null,
    env: 'GITHUB_TOKEN'
  },
  gitlabAccessTokenUri: {
    doc: 'URI for the GitLab authentication provider.',
    format: String,
    default: 'https://gitlab.com/oauth/token',
    env: 'GITLAB_ACCESS_TOKEN_URI'
  },
  gitlabBaseUrl: {
    doc: 'Base URL for the GitLab API.',
    format: String,
    default: 'https://gitlab.com',
    env: 'GITLAB_BASE_URL'
  },
  gitlabToken: {
    doc: 'Access token to the GitLab account being used to push files with.',
    format: String,
    default: null,
    env: 'GITLAB_TOKEN'
  },
  port: {
    doc: 'The port to bind the application to.',
    format: 'port',
    default: 0,
    env: 'PORT'
  },
  rsaPrivateKey: {
    doc: 'RSA private key to encrypt sensitive configuration parameters with.',
    docExample: 'rsaPrivateKey: "-----BEGIN RSA PRIVATE KEY-----\\nkey\\n-----END RSA PRIVATE KEY-----"',
    format: String,
    default: null,
    env: 'RSA_PRIVATE_KEY'
  },
  logging: {
    slackWebhook: {
      doc: 'Slack webhook URL to pipe log output to',
      format: String,
      default: null,
      env: 'SLACK_WEBHOOK'
    }
  }
}

let config

try {
  config = convict(schema)

  const fileName = 'config.' + config.get('env') + '.json'

  config.loadFile(path.join(__dirname, fileName))
  config.validate()

  console.log('(*) Local config file loaded')
} catch (e) {

}

module.exports = config
module.exports.schema = schema
