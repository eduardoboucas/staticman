'use strict'

const config = require(__dirname + '/../config')
const GitHub = require('./GitHub')
const markdownTable = require('markdown-table')
const md5 = require('md5')
const NodeRSA = require('node-rsa')
const Notification = require('./Notification')
const objectPath = require('object-path')
const SiteConfig = require(__dirname + '/../siteConfig')
const SubscriptionsManager = require('./SubscriptionsManager')
const uuid = require('node-uuid')
const yaml = require('js-yaml')

const Staticman = function (options, localConfig) {
  this.options = options
  this.localConfig = localConfig

  // Initialise GitHub API
  this.github = new GitHub({
    username: this.options.username,
    repository: this.options.repository,
    branch: this.options.branch
  })

  // Generate unique id
  this.uid = uuid.v1()

  // Initialise RSA
  this.rsa = new NodeRSA()
  this.rsa.importKey(config.get('rsaPrivateKey'))
}

Staticman.prototype._applyInternalFields = function (data) {
  let internalFields = {
    _id: this.uid
  }

  // Inject parent, if present
  if (this.options.parent) {
    internalFields._parent = this.options.parent
  }

  return Object.assign(internalFields, data)
}

Staticman.prototype._applyGeneratedFields = function (data) {
  const generatedFields = this.siteConfig.get('generatedFields')

  if (!generatedFields) return data

  Object.keys(generatedFields).forEach(field => {
    const generatedField = generatedFields[field]

    if ((typeof generatedField === 'object') && (!(generatedField instanceof Array))) {
      const options = generatedField.options || {}

      switch (generatedField.type) {
        case 'date':
          data[field] = this._createDate(options)

          break
      }
    } else {
      data[field] = generatedField
    }
  })

  return data
}

Staticman.prototype._applyTransforms = function (data) {
  const transforms = this.siteConfig.get('transforms')

  if (!transforms) return Promise.resolve(data)

  // This doesn't serve any purpose for now, but we might want to have
  // asynchronous transforms in the future.
  let queue = []

  Object.keys(transforms).forEach(field => {
    if (!data[field]) return

    if (transforms[field] === 'md5') {
      data[field] = md5(data[field])
    }
  })

  return Promise.all(queue).then((results) => {
    return data
  })
}

Staticman.prototype._checkForSpam = function (fields) {
  if (!this.siteConfig.get('akismet.enabled')) return Promise.resolve(fields)

  return new Promise((resolve, reject) => {
    const akismet = require('akismet').client({
      blog: config.get('akismet.site'),
      apiKey: config.get('akismet.apiKey')
    })

    akismet.checkSpam({
      user_ip: this.ip,
      comment_author: fields[this.siteConfig.get('akismet.author')],
      comment_content: fields[this.siteConfig.get('akismet.content')]
    }, (err, isSpam) => {
      if (err) return reject(err)
      
      if (isSpam) return reject('IS_SPAM')

      return resolve(fields)
    })    
  })
}

Staticman.prototype._createDate = function (options) {
  const date = new Date()

  switch (options.format) {
    case 'timestamp':
      return date.getTime()

    case 'timestamp-seconds':
      return Math.floor(date.getTime() / 1000)

    case 'iso8601':
    default:
      return date.toISOString()
  }
}

Staticman.prototype._createFile = function (fields) {
  return new Promise((resolve, reject) => {
    switch (this.siteConfig.get('format').toLowerCase()) {
      case 'json':
        return resolve(JSON.stringify(fields))

      case 'yaml':
      case 'yml':
        try {
          const output = yaml.safeDump(fields)

          return resolve(output)
        } catch (err) {
          return reject(err)
        }

        break

      case 'frontmatter':
        const transforms = this.siteConfig.get('transforms')

        const contentField = transforms && Object.keys(transforms).find(field => {
          return transforms[field] === 'frontmatterContent'
        })

        if (!contentField) {
          return reject('NO_FRONTMATTER_CONTENT_TRANSFORM')
        }

        const content = fields[contentField]

        delete fields[contentField]

        try {
          const output = `---\n${yaml.safeDump(fields)}---\n${content}\n`

          return resolve(output)
        } catch (err) {
          return reject(err)
        }

        break

      default:
        return reject('INVALID_FORMAT')
    }
  })
}

Staticman.prototype._generatePRBody = function (fields) {
  let table = [
    ['Field', 'Content']
  ]

  Object.keys(fields).forEach(field => {
    table.push([field, fields[field]])
  })

  const message = this.siteConfig.get('pullRequestBody') + markdownTable(table)

  return message
}

Staticman.prototype._getConfig = function (force) {
  if (this.siteConfig && !force) return Promise.resolve(this.siteConfig)

  if (!this.options.config) return Promise.reject('NO_CONFIG_PATH')

  return this.github.readFile(this.options.config.file).then(data => {
    const config = objectPath.get(data, this.options.config.path)
    const validationErrors = this._validateConfig(config)

    if (validationErrors) {
      return Promise.reject(validationErrors)
    }

    if (config.branch !== this.options.branch) {
      return Promise.reject('BRANCH_MISMATCH')
    }
  })
}

Staticman.prototype._getNewFilePath = function (data) {
  const configFilename = this.siteConfig.get('filename')
  const filename = configFilename ? this._resolvePlaceholders(configFilename, {
    fields: data,
    options: this.options
  }) : this.uid

  const path = this._resolvePlaceholders(this.siteConfig.get('path'), {
    fields: data,
    options: this.options
  })

  const extension = this._getExtensionForFormat(this.siteConfig.get('format'))

  return `${path}/${filename}.${extension}`
}

Staticman.prototype._getExtensionForFormat = function (format) {
  switch (format.toLowerCase()) {
    case 'json':
      return 'json'

    case 'yaml':
    case 'yml':
      return 'yml'

    case 'frontmatter':
      return 'md'
  }
}

Staticman.prototype._processSubscriptions = function (fields, options) {
  // Initialise SubscriptionsManager
  const subscriptions = new SubscriptionsManager(this.github, this.rsa)

  // If there isn't a parent or if notifications are not enabled, there's
  // nothing to do here
  if (!options.parent || !this.siteConfig.get('notifications.enabled')) {
    return Promise.resolve(true)
  }

  // Process existing subscriptions
  return subscriptions.get(options.parent).then(subscription => {
    if (subscription) {
      const notifications = new Notification()

      notifications.send(subscription, fields, options, this.siteConfig)
    }

    if (options.subscribe && fields[options.subscribe]) {
      return subscriptions.set(options.parent, fields[options.subscribe])
    }
  }).catch(err => {
    console.log(err.stack || err)
  })
}

Staticman.prototype._resolvePlaceholders = function (subject, baseObject) {
  const matches = subject.match(/{(.*?)}/g)

  if (!matches) return subject

  matches.forEach((match) => {
    const escapedMatch = match.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    const property = match.slice(1, -1)

    let newText

    switch (property) {
      case '@timestamp':
        newText = new Date().getTime()

        break

      case '@id':
        newText = this.uid

        break

      default:
        newText = objectPath.get(baseObject, property) || ''
    }

    subject = subject.replace(new RegExp(escapedMatch, 'g'), newText)
  })

  return subject
}

Staticman.prototype._validateConfig = function (config) {
  if (!config) {
    return {
      code: 'MISSING_CONFIG_BLOCK'
    }
  }

  const requiredFields = [
    'allowedFields',
    'branch',
    'format',
    'path'
  ]

  let missingFields = []

  // Checking for missing required fields
  requiredFields.forEach((requiredField) => {
    if (objectPath.get(config, requiredField) === undefined) {
      missingFields.push(requiredField)
    }
  })

  if (missingFields.length) {
    return {
      code: 'MISSING_CONFIG_FIELDS',
      data: missingFields
    }
  }

  // Check origin
  if (config.allowedOrigins) {
    if (this.options.origin) {
      const url = require('url').parse(this.options.origin)

      const validOrigin = config.allowedOrigins.some(origin => {
        return origin === url.hostname
      })

      if (!validOrigin) {
        return {
          code: 'INVALID_ORIGIN',
          data: null
        }
      }
    }
  }

  this.siteConfig = SiteConfig(config, this.rsa)

  return null
}

Staticman.prototype._validateFields = function (fields) {
  let errors = []
  let missingRequiredFields = []
  let invalidFields = []

  Object.keys(fields).forEach(field => {
    // Check for any invalid fields
    if ((this.siteConfig.get('allowedFields').indexOf(field) === -1) && (fields[field] !== '')) {
      invalidFields.push(field)
    }

    // Trim fields
    if (typeof fields[field] === 'string') {
      fields[field] = fields[field].trim()
    }
  })

  // Check for missing required fields
  this.siteConfig.get('requiredFields').forEach(field => {
    if ((fields[field] === undefined) || (fields[field] === '')) {
      missingRequiredFields.push(field)
    }
  })

  if (missingRequiredFields.length) {
    errors.push({
      code: 'MISSING_REQUIRED_FIELDS',
      data: missingRequiredFields
    })
  }

  if (invalidFields.length) {
    errors.push({
      code: 'INVALID_FIELDS',
      data: invalidFields
    })
  }

  if (errors.length) return errors

  return null
}

Staticman.prototype.process = function (fields, options) {
  return this._getConfig().then(res => {
    return this._checkForSpam(fields)
  }).then(fields => {
    // Validate fields
    const fieldErrors = this._validateFields(fields)

    if (fieldErrors) return Promise.reject(fieldErrors)

    // Add generated fields
    fields = this._applyGeneratedFields(fields)

    // Apply transforms
    return this._applyTransforms(fields)
  }).then(fields => {
    return this._applyInternalFields(fields)
  }).then(fields => {
    // Create file
    return this._createFile(fields)
  }).then(data => {
    if (this.siteConfig.get('moderation')) {
      const filePath = this._getNewFilePath(data)
      const newBranch = 'staticman_' + this.uid

      return this.github.writeFileAndSendPR(filePath, data, newBranch, this.siteConfig.get('commitMessage'), this._generatePRBody(fields))
    }

    const filePath = this._getNewFilePath(data)

    return this.github.writeFile(filePath, data, branch, this.siteConfig.get('commitMessage'))
  }).then(result => {
    //this._processSubscriptions(fields, options)

    return {
      fields: fields,
      redirect: options.redirect ? options.redirect : false
    }
  })
}

Staticman.prototype.setConfig = function (config) {
  this.options.config = config
}

Staticman.prototype.setIp = function (ip) {
  this.ip = ip
}

module.exports = Staticman
