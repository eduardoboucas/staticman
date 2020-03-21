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

  auth:
    required: false

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
    secret: "DTK5WxH6117ez/piZpmkvyAtieYWlu60+SApt9hFRMfNs4WBC0mvRtsW9Jmhz4fJYDcIX18wKHV6KYh3PXYN3d/pozCskwwkuJq0qHJQHrTycjgrGS5mti4QgrMYP0rq2p5hMTgPL/UK0lwkxuRRcxnvxqRlkZHMv6o/CUkZOVnkJ8lGqWa8uJAEIv/9rd6Bm12+F1ezLJZ+LogebHEDpyJWz9kwum9bFBQqZbun+43rxzJBQmAGQEWZ4hshY2aLSAyBpr/pjSDUwRGtwoBh8Ee1qKNuMzY0XVUOn+dcHrkpQotmKL4TMFQN4slo/lVKmfXW5N6t9vdP/lGmIiVXdw=="

  githubAuth:
    clientId: "L4M3LIshioHbe3j+vMxEbGlCGDhyIcQF2jhmVOUp8DqC+RqNgvZSQp7qYYmjPPoyjFCVOsu5aHwcD1FkMlEaxLTqYOYUeq49Wb6uxePTBycmW14JI6fiM/PYTm6nqKH5fB/7wnohVgK+/1IVAF6DA7UAs0Ju+srlnqEbn30f84sySOeR+V6t9aF7OiF9DsGedsTfVrfj8opptwQe7nycsxQaTxvmwgQgP9FrDYH+PGy/3ThpQsPj+/Mnvbnn7PMJEJlZFtGZsMWWcE2anJlJ7fbHKNPNNg6l2qosh6/kMTrloCU6wA67ouai0OFiNR+gyQaqUiL3NMgN4k39nZuwOg=="
    clientSecret: "0anSY5FBW+YF8BuFRRYxKX0yjDGU8/HhdirQMh+xFOEIvBQ8n/PdYi3qv2p4ngpFo5gb3PY2W6oWvHYLGgbFFse3YvzP5cbKRG0BN90hanlpVwmtAsapC7UepvOOUmNCRKHJ/pYICYcleUX/xGRiTugl9rcVw1MLg7kxcCuEMWcsBc9qCA9YHRcN3ucP+rT9x/2hLMiUmv3glYYZNgyQ3x1iqpOuTAIMeIkxMQo83vxGR57fpAx4+Yn1+hALhSl3sGaesUZhY9Py/OEZDFVWiN9RvrM4ND0IcfqyaQ4DuRPu2g8Es5fbmgSQoqkNPOcHT2+40pDbz3FPgz6QJou+pQ=="
    redirectUri: "https://my-test-site.com"
    
  gitlabAuth:
    clientId: "Rr9d1XmVVMe8ogldH6rBtdGhf49c29ldwcBVsiMn6DLRAiYWmHY08eKC6xLnP6mXwMe/qCHJ6JMKURDODL8Yjm+nQf09zynkIRCr4J7tRHh4bPAYXPG+W1+TK7l8QD4gC+WXamxJiggwGCaDtNylI1QQhbKtevv7n/T+Iq98rBj8SLxxpi3qR0oZeN/zsoQsDYgzZ+HgvA3hY+5H897ijx1oBjoTsfI1Sfx8Qqix/QLZoXorOUJyEo+83WWvTEgo8X3OyFbXGZ758Kw6A7fcHxu8oVAjDvtFJFiwrDb4iBz9rffx7llZXjkcjzYzfwFcjG7mzZnfYgn9WcCwO7zlsA=="
    clientSecret: "1zzjCrOZQ9dVs1p/WLgT8Lvwez3EKd1tp3D+7P5uGlEdqP1RN7kQvcaqOmOpm5SIY6g+yKJQGZq9G/IqUoKdsZDhA2VGYGXVzETU6eB48AL0OXlFumhjzJoGAXpnqDWzfevglkVuAkivBv6o9S1r/FL1GydwlRwWcYU6NNJjjkB04A00B4s0J7FRR3VFRxpJqDznHgXgT32E2+F3s6enh9/aErqi9uqn+iVtw7gvbd9PN1ejlo95R3BVNKUxNi2Dn4BbsH3MjQG4DyuzX8BiS9Nb+Xt+CwLygTT/i4C5Aj+KkMjAEiYOyttFbk3jkvYVXJ1XtW+taloBVPYCHgDzmg=="
    redirectUri: "https://my-test-site-2.com"`

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

module.exports.configInvalidYML = `invalid:
- x
y
    foo
bar
`

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
