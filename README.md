<img src="logo.png" width="300">

# Staticman

> Static sites with superpowers

## Table of contents

1. [Introduction](#introduction)
1. [Prerequisites](#prerequisites)
1. [Running on Docker](#running-on-docker)
1. [Adding an entry](#adding-an-entry)
1. [API configuration](#api-configuration)
1. [Jekyll configuration](#jekyll-configuration)
1. [Sites using Staticman](#sites-using-staticman)

---

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

## Running on Docker

With Docker, it's easy to run Staticman on any environment without downloading, configuring or installing anything manually on your host other than Docker and Docker Compose.

First, you need to install [Docker](https://docs.docker.com/engine/installation/) and [Docker Compose](https://docs.docker.com/compose/install/).

### Production

In production mode, the project source is imported and dependencies installed to the container.

To start the service:  

```shell
docker-compose up
```

### Development

In development mode, the source code is mounted from the host. You can see any changes you made in the sources by simply restarting the container.

To start the service: 

```shell 
docker-compose -f docker-compose.development.yml up
```

### Usage

Use your IP address or `localhost` as the Staticman API address.

## Adding an entry

Entries are added via `POST` to the `entry` endpoint. An entry is made up of two objects:

- `fields` The data fields to be created
- `options`: Various parameters to configure the request (optional)

A simple data file with `name`, `email` and `comment` could be created using the following HTML markup:

```html
<form method="POST" action="http://your-staticman-url/v1/entry/eduardoboucas/my-site-repo/gh-pages">
  <label><input name="fields[name]" type="text">Name</label>
  <label><input name="fields[email]" type="email">E-mail</label>
  <label><textarea name="fields[comment]"></textarea>Comment</label>
  
  <button type="submit">Send</button>
</form>
```

## API configuration

These parameters configure the Staticman Node.js API. They can be supplied as part of a local config file (`config.json`) or environment variables.

| Config file key | Environment variable | Description | Required |
|-----------------|----------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|----------|
| `port` | `PORT` | The port used by the server | **yes** |
| `githubToken` | `GITHUB_TOKEN` | [Personal access token](https://help.github.com/articles/creating-an-access-token-for-command-line-use/) for the GitHub account being used by the bot | **yes** |
| `akismetSite` | `AKISMET_SITE` | URL of the site to be used with Akismet | no |
| `akismetApiKey` | `AKISMET_API_KEY` | API key to be used with Akismet | no |

## Jekyll configuration

Parameters used to configure Jekyll can be found [here](https://staticman.net/docs/configuration).

## Sites using Staticman

- [Popcorn](http://popcorn.staticman.net) — [Source](https://github.com/eduardoboucas/popcorn)
- [eduardoboucas.com](https://eduardoboucas.com) — [Source](https://github.com/eduardoboucas/eduardoboucas.github.io)
- [Made Mistakes](https://mademistakes.com/) — [Source](https://github.com/mmistakes/made-mistakes-jekyll)
- [Minimal Mistakes theme](https://mmistakes.github.io/minimal-mistakes/) — [Source](https://github.com/mmistakes/minimal-mistakes)

