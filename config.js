const convict = require('convict')

const schema = convict({
  env: {
    doc: 'The applicaton environment',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV'
  },
  port: {
    doc: 'The port to bind',
    format: 'port',
    default: 0,
    env: 'PORT'
  },
  githubToken: {
    doc: 'GitHub access token',
    format: String,
    default: null,
    env: 'GITHUB_TOKEN'
  },
  akistmet: {
    site: {
      doc: 'Akismet site',
      format: String,
      default: null,
      env: 'AKISMET_SITE'
    },
    apiKey: {
      doc: 'Akismet API key',
      format: String,
      default: null,
      env: 'AKISMET_API_KEY'
    }
  },
  analytics: {
    uaTrackingId: {
      doc: 'Universal Analytics Analytics account ID',
      format: String,
      default: null,
      env: 'UA_TRACKING_ID'
    }
  },
  rsaPrivateKey: {
    doc: 'RSA private key',
    format: String,
    default: null,
    env: 'RSA_PRIVATE_KEY'
  },
  email: {
    sparkpostApiKey: {
      doc: 'SparkPost API key',
      format: String,
      default: null,
      env: 'SPARKPOST_API_KEY'
    },
    fromAddress: {
      doc: 'Email address to send notifications as',
      format: String,
      default: 'noreply@staticman.net',
      env: 'EMAIL_FROM'
    }
  }
})

try {
  const env = schema.get('env')

  schema.loadFile(__dirname + '/config.' + env + '.json')
  schema.validate()

  console.log('(*) Local config file loaded')
} catch (e) {
  
}

module.exports = schema
