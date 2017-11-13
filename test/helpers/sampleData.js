module.exports.config1 = `# Name of the property. You can have multiple properties with completely
# different config blocks for different sections of your site.
# For example, you can have one property to handle comment submission and
# another one to handle posts.
comments:
  # (*) REQUIRED
  #
  # Names of the fields the form is allowed to submit. If a field that is
  # not here is part of the request, an error will be thrown.
  allowedFields: ["name", "email", "url", "message"]

  # When allowedOrigins is defined, only requests sent from one of the domains
  # listed will be accepted.
  allowedOrigins: ["localhost", "eduardoboucas.com"]

  # (*) REQUIRED
  #
  # Name of the branch being used. Must match the one sent in the URL of the
  # request.
  branch: "master"

  # List of fields to be populated automatically by Staticman and included in
  # the data file. Keys are the name of the field. The value can be an object
  # with a \`type\` property, which configures the generated field, or any value
  # to be used directly (e.g. a string, number or array)
  generatedFields:
    date:
      type: date
      options:
        format: "timestamp-seconds"

  # The format of the generated data files. Accepted values are "json", "yaml"
  # or "frontmatter"
  format: "yaml"

  # Whether entries need to be appproved before they are published to the main
  # branch. If set to \`true\`, a pull request will be created for your approval.
  # Otherwise, entries will be published to the main branch automatically.
  moderation: false

  # Name of the site. Used in notification emails.
  name: "eduardoboucas.com"
  
  notifications:
    enabled: true

  # (*) REQUIRED
  #
  # Destination path (directory) for the data files. Accepts placeholders.
  path: "_data/comments/{options.slug}"

  # (*) REQUIRED
  #
  # Destination path (filename) for the data files. Accepts placeholders.
  filename: "entry{@timestamp}"

  # Names of required fields. If any of these isn't in the request or is empty,
  # an error will be thrown.
  requiredFields: ["name", "email", "message"]

  # List of transformations to apply to any of the fields supplied. Keys are
  # the name of the field and values are possible transformation types.
  transforms:
    email: md5

  reCaptcha:
    enabled: true
    siteKey: "123456789"
    secret: "@reCaptchaSecret@"`

module.exports.config2 = `{
  "comments": {
    "allowedFields": [
      "name",
      "email",
      "url",
      "message"
    ],
    "allowedOrigins": [
      "localhost",
      "eduardoboucas.com"
    ],
    "branch": "master",
    "generatedFields": {
      "date": {
        "type": "date",
        "options": {
          "format": "timestamp-seconds"
        }
      }
    },
    "format": "yaml",
    "moderation": false,
    "name": "eduardoboucas.com",
    "notifications": {
      "enabled": true
    },
    "path": "_data/comments/{options.slug}",
    "filename": "entry{@timestamp}",
    "requiredFields": [
      "name",
      "email",
      "message"
    ],
    "transforms": {
      "email": "md5"
    },
    "reCaptcha": {
      "enabled": true,
      "siteKey": "123456789",
      "secret": "ZguqL+tEc+XPFmWZdaFxWqqB1xtwe79o5SLWrjuAIA/45N5hPQk3HcKKfLBl0ZyqVff+JEY76xLBVFn+jn4Wc8egnKtA7HJfjMpbR4WdSFVm/Hcca3L3id9JNYmGPFRJmzOlG2qjSr2Z8y3Y1i02EjQrzUcfqCuCfeEbZxmCNp0="
    }
  }
}`

module.exports.config3 = `comments:
  allowedFields: ["name", "email", "url", "message"]
  allowedOrigins: ["localhost", "eduardoboucas.com"]
  branch: "master"
  generatedFields:
    date:
      type date
      options:
        format: "timestamp-seconds"
  format: "yaml"
  moderation: false
  name: "eduardoboucas.com"
  notifications:
    enabled: true
  path: "_data/comments/{options.slug}"
  filename: "entry{@timestamp}"
  requiredFields: ["name", "email", "message"]
  transforms:
    email: md5
  reCaptcha:
    enabled: true
    siteKey: "123456789"
    secret: "@reCaptchaSecret@"`

module.exports.prBody1 = `Dear human,

Here's a new entry for your approval. :tada:

Merge the pull request to accept it, or close it to send it away.

:heart: Your friend [Staticman](https://staticman.net) :muscle:

---
| Field   | Content                          |
| ------- | -------------------------------- |
| name    | John                             |
| email   | 017dab421e1e1cf6257bcadc0d289c62 |
| url     | http://johndoe.com               |
| address |                                  |
| message | This is a test entry             |
| date    | 1485597255                       |

<!--staticman_notification:{"configPath":{"file":"staticman.yml","path":"comments"},"fields":{"name":"John","email":"017dab421e1e1cf6257bcadc0d289c62","url":"http://johndoe.com","address":"","message":"This is a test entry","date":1485597255},"options":{"slug":"2015-05-11-rethinking-the-commenting-system-for-my-jekyll-site","parent":"2015-05-11-rethinking-the-commenting-system-for-my-jekyll-site","origin":"https://eduardoboucas.com/blog/2015/05/11/rethinking-the-commenting-system-for-my-jekyll-site.html","subscribe":"email"},"parameters":{"username":"eduardoboucas","repository":"eduardoboucas.github.io","branch":"master","property":"comments"}}-->`

module.exports.prBody2 = `Dear human,

Here's a new entry for your approval. :tada:

Merge the pull request to accept it, or close it to send it away.

:heart: Your friend [Staticman](https://staticman.net) :muscle:

---
| Field   | Content                          |
| ------- | -------------------------------- |
| name    | John                             |
| email   | 017dab421e1e1cf6257bcadc0d289c62 |
| url     | http://johndoe.com               |
| address |                                  |
| message | This is a test entry             |
| date    | 1485597255                       |`
