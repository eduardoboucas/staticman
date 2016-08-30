---
layout: docs
title: Configuration file
permalink: /docs/configuration
weight: 1
---
The configuration file for Staticman should be in the root of the repository and named `staticman.yml` (if you're using a `v1` endpoint, it should be `_config.yml` instead). The following parameters are accepted.

<h2 id="allowedFields">allowedFields</h2>

**required**

An array with the names of the allowed fields. If any of the fields sent is not part of this list, the insert operation will be aborted and an error will be thrown.

*Example:*

```yml
allowedFields: ['name', 'email', 'comment']
```

<h2 id="branch">branch</h2>

**required**

The name of the branch to upload files to. If it doesn't match the branch sent as `options[branch]` in the request, the insert operation will be aborted and an error will be thrown.

*Example:*

```yml
branch: 'gh-pages'
```

<h2 id="filename">filename</h2>

The name of the file, within `path`, where the data will be saved. Defaults to a hash computed with the name of the repo and the current timestamp.

It supports placeholders, allowing you to use any of the elements sent in `options` or `fields` in the request to build the path, as well as:

- `{@timestamp}`: Gets replaced by the current Unix timestamp

*Example:*

```yml
filename: entry{@timestamp}

# The resolved path will be _data/posts/entry1470750784949.json
```

<h2 id="format">format</h2>

**required**

The format of the output data files. Currently `json` and `yaml` are supported.

*Example:*

```yml
format: 'json'
```

<h2 id="generatedFields">generatedFields</h2>

A list of fields to be populated by Staticman and included in the generated data files. At the moment, only `date` is supported as a generated field type, allowing you to include the date/time of a submission in the generated file.

*Example:*

```yml
generatedFields:
  myField:
    type: date
    options:
      format: timestamp
```

The above will generated a field called `myField` with the current date and time. The following formats are supported:

- `iso8601` (default): ISO-8601 date and time format
- `timestamp`: A numeric Unix timestamp (milliseconds)
- `timestamp-seconds`: A numeric Unix timestamp (seconds)


<h2 id="moderation">moderation</h2>

**required**

Whether comments need to be approved before being uploaded to `branch`. If set to `true`, Staticman will create a separate branch and send a pull request to `branch`, allowing you to approve the comment by merging the pull request, or discard it by closing the pull request.

*Example:*

```yml
moderation: true
````

<h2 id="path">path</h2>

**required**

The path within the repository where data files should be stored. 

It supports placeholders, allowing you to use any of the elements sent in `options` or `fields` in the request to build the path, as well as:

- `{@timestamp}`: Gets replaced by the current Unix timestamp

*Example:*

```html
<input type="hidden" name="options[post-slug]" value="this-is-a-post">
```

```yml
path: _data/posts/{options.post-slug}

# The resolved path will be _data/posts/this-is-a-post
```

<h2 id="requiredFields">requiredFields</h2>

An array with the names of fields that must exist in a request. If any of these is not present, the insert operation is aborted and an error will be thrown.

*Example:*

```yml
requiredFields: ['name', 'comment']
```

<h2 id="transforms">transforms</h2>

Transforms allow you to run server-side logic to modify the content of certain fields.

*Example:*

You could use a transform to encode the `email` field using MD5 in order to use [Gravatar](https://en.gravatar.com/site/implement/hash/).

```yml
transforms:
  email: 'md5'
```