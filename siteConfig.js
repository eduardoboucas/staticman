const convict = require('convict')

module.exports = (data, rsa) => {
  convict.addFormat({
    name: 'EncryptedString',
    validate: val => true,
    coerce: val => {
      return rsa.decrypt(val, 'utf8')
    }
  })

  const schema = convict({
    allowedFields: {
      doc: 'Allowed fields',
      format: Array,
      default: []
    },
    allowedOrigins: {
      doc: 'Domains to be allowed as origins',
      format: Array,
      default: []
    },
    akismet: {
      enabled: {
        doc: 'Whether to use Akismet',
        format: Boolean,
        default: false
      },
      author: {
        doc: 'Name of the field to be used as the comment author',
        format: String,
        default: ""
      },
      authorEmail: {
        doc: 'Name of the field to be used as the comment author\'s email',
        format: String,
        default: ""
      },
      authorUrl: {
        doc: 'Name of the field to be used as the comment author\'s URL',
        format: String,
        default: ""
      },
      content: {
        doc: 'Name of the field to be used as the comment body',
        format: String,
        default: ""
      },
      type: {
        doc: 'Type of comment to be sent to Akismet',
        format: String,
        default: "comment"
      }
    },
    branch: {
      doc: 'Name of the main branch',
      format: String,
      default: 'master'
    },
    commitMessage: {
      doc: 'Commit message',
      format: String,
      default: 'Add Staticman data'
    },
    filename: {
      doc: 'Name of the entry files',
      format: String,
      default: '{@id}'
    },
    format: {
      doc: 'Format of the output files',
      format: ['yaml', 'yml', 'json', 'frontmatter'],
      default: 'yml'
    },
    generatedFields: {
      doc: 'List of fields to be appended to entries automatically',
      format: Object,
      default: {}
    },
    moderation: {
      doc: 'Whether entries need to be approved before being submitted to the main branch',
      format: Boolean,
      default: true
    },
    name: {
      doc: 'Human-friendly name for the site/property',
      format: String,
      default: ""
    },
    notifications: {
      enabled: {
        doc: 'Whether to enable reply notifications',
        format: Boolean,
        default: false
      },
      apiKey: {
        doc: 'Mailgun API key',
        format: 'EncryptedString',
        default: null
      },
      domain: {
        doc: 'Mailgun domain',
        format: 'EncryptedString',
        default: null
      }
    },
    path: {
      doc: 'Path to the entries directory',
      format: String,
      default: '_data/results/{@timestamp}'
    },
    pullRequestBody: {
      doc: 'Message to be used in the body of pull requests',
      format: String,
      default: 'Dear human,\n\nHere\'s a new entry for your approval. :tada:\n\nMerge the pull request to accept it, or close it to send it away.\n\n:heart: Your friend [Staticman](https://staticman.net) :muscle:\n\n---\n'
    },
    requiredFields: {
      doc: 'Fields that must be supplied with every entry',
      format: Array,
      default: []
    },
    transforms: {
      doc: 'Transformations to be applied to fields',
      format: Object,
      default: {}
    }
  }) 

  try {
    schema.load(data)
    schema.validate()

    return schema
  } catch (e) {
    throw e
  }
}
