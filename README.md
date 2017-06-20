<img src="logo.png" width="300">

# Staticman [![coverage](https://img.shields.io/badge/coverage-76%25-yellow.svg?style=flat?style=flat-square)](https://github.com/eduardoboucas/staticman) [![Build Status](https://travis-ci.org/eduardoboucas/staticman.svg?branch=master)](https://travis-ci.org/eduardoboucas/staticman)

> Static sites with superpowers

## Table of contents

1. [Introduction](#introduction)
1. [Prerequisites](#prerequisites)
1. [Running on Docker](#running-on-docker)
1. [API configuration](#api-configuration)
1. [Site configuration](#site-configuration)
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

## API configuration

Staticman will look for a JSON configuration file named `config.{ENVIRONMENT}.json` in the root of the application, with `{ENVIRONMENT}` being replaced by the environment setting (e.g. `config.development.json`). Alternatively, each configuration parameter can be supplied using an environment variable.

[Click here](https://staticman.net/docs/api) to see a list of available configuration parameters.

## Site configuration

Parameters used to configure a site can be found [here](https://staticman.net/docs/configuration).

## Sites using Staticman

- [Popcorn](http://popcorn.staticman.net) ([Source](https://github.com/eduardoboucas/popcorn))
- [eduardoboucas.com](https://eduardoboucas.com) ([Source](https://github.com/eduardoboucas/eduardoboucas.github.io))
- [Made Mistakes](https://mademistakes.com/) ([Source](https://github.com/mmistakes/made-mistakes-jekyll))
- [Minimal Mistakes theme](https://mmistakes.github.io/minimal-mistakes/) ([Source](https://github.com/mmistakes/minimal-mistakes))
- [/wg/ Startpages](http://startpages.cf/) ([Source](https://github.com/twentytwoo/startpages.cf))
- [movw-0x16.cf](http://movw-0x16.cf/) ([Source](https://github.com/twentytwoo/movw-0x16))
- [Open Source Design Job Board](http://opensourcedesign.net/jobs/) ([Source](https://github.com/opensourcedesign/jobs/))
- [zongren.me](https://zongren.me/) ([Source](https://gitlab.com/zongren/zongren.gitlab.io/)) 


Are you using Staticman? [Let us know!](https://github.com/eduardoboucas/staticman/edit/master/README.md)
