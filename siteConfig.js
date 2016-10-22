const convict = require('convict')

const schema = convict({
  allowedFields: {
    doc: 'Allowed fields',
    format: Array,
    default: []
  },
  allowedOrigins: {
    doc: 'Domains to be allowed as origins',
    format: Array,
    default: null
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
    content: {
      doc: 'Name of the field to be used as the comment body',
      format: String,
      default: ""
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
    default: null
  },
  moderation: {
    doc: 'Whether entries need to be approved before being submitted to the main branch',
    format: Boolean,
    default: false
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
    default: ':tada:'
  },
  requiredFields: {
    doc: 'Fields that must be supplied with every entry',
    format: Array,
    default: []
  },
  transforms: {
    doc: 'Transformations to be applied to fields',
    format: Object,
    default: null
  }
})

module.exports = data => {
  try {
    schema.load(data)
    schema.validate()

    return schema
  } catch (e) {
    throw e
  }
}
