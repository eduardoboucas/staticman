<img src="logo.png" width="300">

# Staticman

> Static sites with superpowers

## Introduction

Staticman is a Node.js application that receives user-generated content and uploads it as data files to a GitHub repository. In practice, this allows you to have dynamic content (e.g. blog post comments) as part of a fully static Jekyll site running on GitHub Pages.

It consists of a small web server that handles the `POST` requests from your forms, runs various forms of validation and then pushes them to your repository as data files. You can choose to enable moderation, which means files will be pushed to a separate branch and a pull request will be created for your approval, or disable it completely, meaning that files will be pushed to the main branch automatically.

**NOTE:** Sections [Prerequisites](#prerequisites) and [Middleman configuration](#middleman-configuration) are only relevant if you wish to host your own instance of Staticman. If not, there is an instance you can use for free. Please see  https://staticman.net/get-started for more details.

## Prerequisites

Staticman runs as a GitHub bot, so it needs a GitHub account and a [personal access token](https://help.github.com/articles/creating-an-access-token-for-command-line-use/).

The bot needs push permission on the repositories it works with, so you'll need to add him as a collaborator. In order for him to accept the invitation, fire a `GET` request to:

```
http://your-staticman-url/v1/connect/{GitHub username}/{GitHub repository}
```

## Adding an entry

Entries are added via `POST` to the `entry` endpoint. An entry is made up of two objects:

- `fields` The data fields to be created
- `options`: Various parameters to configure the request (optional)

A simple data file with `name`, `email` and `comment` could be created using the following HTML markup:

```html
<form method="POST" action="http://your-staticman-url/v1/entry/eduardoboucas/my-site-repo/gh-pages">
  <input name="fields[name]" type="text">
  <input name="fields[email]" type="email">
  <textarea name="fields[comment]"></textarea>
  
  <button type="submit">Send</button>
</form>
```

## Middleman configuration

These parameters configure the Staticman Node.js application. They can be supplied as part of a local config file (`config.json`) or environment variables.

| Config file key | Environment variable | Description | Required |
|-----------------|----------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|----------|
| `port` | `PORT` | The port used by the server | **yes** |
| `githubToken` | `GITHUB_TOKEN` | [Personal access token](https://help.github.com/articles/creating-an-access-token-for-command-line-use/) for the GitHub account being used by the bot | **yes** |
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

### `filename`

The name of the file, within `path`, where the data will be saved. Defaults to a hash computed with the name of the repo and the current timestamp.

It supports placeholders, allowing you to use any of the elements sent in `options` or `fields` in the request to build the path, as well as:

- `{@timestamp}: Gets replaced by the current Unix timestamp

*Example:*

```yml
filename: entry{@timestamp}

# The resolved path will be _data/posts/entry1470750784949.json
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

It supports placeholders, allowing you to use any of the elements sent in `options` or `fields` in the request to build the path, as well as:

- `{@timestamp}: Gets replaced by the current Unix timestamp

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
