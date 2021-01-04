<img src="logo.png" width="300">

# Staticman [![coverage](https://img.shields.io/badge/coverage-81%25-yellow.svg?style=flat)](https://github.com/eduardoboucas/staticman) [![Build Status](https://travis-ci.org/eduardoboucas/staticman.svg?branch=master)](https://travis-ci.org/eduardoboucas/staticman) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-airbnb-brightgreen.svg)](https://github.com/airbnb/javascript)

> Static sites with superpowers

## Introduction

Staticman is a Node.js application that receives user-generated content and uploads it as data files to a GitHub and/or GitLab repository. In practice, this allows you to have dynamic content (e.g. blog post comments) as part of a fully static website, as long as your site automatically deploys on every push to GitHub and/or GitLab, as seen on [GitHub Pages](https://pages.github.com/), [GitLab Pages](https://about.gitlab.com/product/pages/), [Netlify](http://netlify.com/) and others.

It consists of a small web service that handles the `POST` requests from your forms, runs various forms of validation and manipulation defined by you and finally pushes them to your repository as data files. You can choose to enable moderation, which means files will be pushed to a separate branch and a pull request will be created for your approval, or disable it completely, meaning that files will be pushed to the main branch automatically.

You can download and run the Staticman API on your own infrastructure. The easiest way to get a personal Staticman API instance up and running is to use the free tier of Heroku. If deploying to Heroku you can simply click the button below and enter your config variables directly into Heroku as environment variables.

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

## Requirements

- Node.js 14.15.1+
- npm
- Static site with repo hosted on GitHub or GitLab
- An RSA key in PEM format

## Getting Started

For instructions on setting up your own Staticman instance and integrating with your static site, please refer to [the official documentation website](https://staticman.net/).

## Development

Check [this guide](docs/docker.md) if you're using Docker. Otherwise follow the below steps

- Clone the repository and install the dependencies via npm.

  ```bash
  git clone git@github.com:eduardoboucas/staticman.git
  cd staticman
  npm install
  ```

- Create a development config file from the sample file.

  ```bash
  cp config/sample.json config/development.json
  ```

  **Note:** Each environment, determined by the `NODE_ENV` environment variable, requires its own configuration file. When you're ready to push your Staticman API to production, use `config.production.json`.

- Edit the new development config file with your GitHub and/or GitLab credentials, RSA private key and the port to run the server. Click [here](https://staticman.net/docs/api) for the list of available configuration parameters.

- Start the server.

  ```bash
  npm start
  ```

## Contributing

Would you like to contribute to Staticman? That's great! Here's how:

1. Read the [contributing guidelines](CONTRIBUTING.md)
1. Pull the repository and start hacking
1. Run the dev server with `npm start-dev`
1. Generated API docs are accessible at the `/api-docs` endpoint
1. Make sure tests are passing by running `npm test`
1. Send a pull request and celebrate

## Useful links

- [Detailed Site and API Setup Guide](https://travisdowns.github.io/blog/2020/02/05/now-with-comments.html)
- [Improving Static Comments with Jekyll & Staticman](https://mademistakes.com/articles/improving-jekyll-static-comments/)
- [Hugo + Staticman: Nested Replies and E-mail Notifications](https://networkhobo.com/2017/12/30/hugo-staticman-nested-replies-and-e-mail-notifications/)
