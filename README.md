<img src="logo.png" width="300">

# Staticman

> Static sites with superpowers

## Middleman configuration

These parameters configure the Staticman Node.js application. They can be supplied as part of a local config file (`config.json`) or environment variables.

| Config file key | Environment variable | Description | Required |
|-----------------|----------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|----------|
| `port` | `PORT` | The port used by the server | **yes** |
| `githubToken` | `GITHUB_TOKEN` | [Personal access](https://help.github.com/articles/creating-an-access-token-for-command-line-use/) token for the GitHub account being used by the bot | **yes** |
| `akismetSite` | `AKISMET_SITE` | URL of the site to be used with Akismet | no |
| `akismetApiKey` | `AKISMET_API_KEY` | API key to be used with Akismet | no |

## Jekyll configuration

These parameters will be looked for in a `_config.yml` file in the repository. They all live inside a `staticman` property.

### `allowedFields` (required)

An array with the names of the allowed fields. If any of the fields sent is not part of this list, the insert operation will be aborted and an error will be thrown.

*Example:*

```yml
allowedFields: ['name', 'email', 'comment']
```

### `branch` (required)

The name of the branch to upload files to. If it doesn't match the branch sent as `options[branch]` in the request, the insert operation will be aborted and an error will be thrown.

*Example:*

```yml
branch: 'gh-pages'
```

### `format` (required)

The format of the output data files. Currently `json` and `yaml` are supported.

*Example:*

```yml
format: 'json'
```

### `moderation` (required)

Whether comments need to be approved before being uploaded to `branch`. If set to `true`, Staticman will create a separate branch and send a pull request to `branch`, allowing you to approve the comment by merging the pull request, or discard it by closing the pull request.

*Example:*

```yml
moderation: true
````

### `path` (required)

The path within the repository where data files should be stored. 

It supports placeholders, allowing you to use any of the elements sent in `options` or `fields` in the request to build the path.

*Example:*

```html
<input type="hidden" name="options[post-slug]" value="this-is-a-post">
```

```yml
path: _data/posts/{options.post-slug}

# The resolved path will be _data/posts/this-is-a-post
```

### `requiredFields`

An array with the names of fields that must exist in a request. If any of these is not present, the insert operation is aborted and an error will be thrown.

*Example:*

```yml
requiredFields: ['name', 'comment']
```

### `transforms`

Transforms allow you to run server-side logic to modify the content of certain fields.

*Example:*

You could use a transform to encode the `email` field using MD5 in order to use [Gravatar](https://en.gravatar.com/site/implement/hash/).

```yml
transforms:
  email: 'md5'
```

Currently, only `md5` is supported.
