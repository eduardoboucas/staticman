# Jekyll Discuss

> A commenting system for Jekyll

## Introduction

[Jekyll](http://jekyllrb.com/) is a powerful blog-aware static site generator. Due to the nature of static sites, including dynamic content — in particular, user-generated content — on a page can be quite challenging. A typical example of that is a blog's commenting system. How to serve that content with an application that consists of pure static HTML files?

As I described in [this post](http://davidwalsh.name/introduction-static-site-generators) and, more in depth, in [this post](https://eduardoboucas.com/blog/2015/05/11/rethinking-the-commenting-system-for-my-jekyll-site.html), there are several options to address this limitation. Third-party commenting platforms like [Disqus](https://disqus.com/) are quite popular and easy to implement.

However, as explained by Tom Preston-Werner [in this talk](https://www.youtube.com/watch?v=BMve1OCKj6M), that comes with the huge caveat of not hosting the comments data, taking away one of the great selling points of Jekyll — the fact that the entire data is hosted together in a repository, not scattered through a myriad of databases and servers.

Other approaches include the actual comments with the rest of the data, but require either a manual build or a complex Continuous Integration process. That makes the integration with GitHub Pages much more difficult.

### So what is this?

**Jekyll Discuss** is a Node.js server-side middleman that handles comments as POST requests from a form, creates data files with its contents and pushes them to a GitHub repository. When using GitHub Pages, that will automatically trigger a build and the new data files will be part of the generated site.

![Jekyll Discuss diagram](https://eduardoboucas.com/assets/posts/2015-05-11-rethinking-the-commenting-system-for-my-jekyll-site/jekyll-discuss-diagram.png)

There was [a previous iteration of this project](https://github.com/eduardoboucas/jekyll-discuss-php) written in PHP, which I'll no longer maintain.

## Installation

1. Install via NPM
   
   ```
   npm install jekyll-discuss
   cd jekyll-discuss
   ```

1. Edit and rename template config file

   ```
   vi config.template
   mv config.template config
   ```
   
1. Start server

   ```
   node app.js
   ```

## Configuration

**Jekyll Discuss** consists essentially of an Express server that handles requests, and a Bash script that pushes files to GitHub. Both of these components read information from a shared config file, which contains the following entries.

| Key | Mandatory | Description |
|-----|-----------|-------------|
| `SERVER_HTTP_PORT` | **YES** | Port to be used by the HTTP version of the Express server |
| `SERVER_HTTPS_PORT` | No | Port to be used by the HTTPS version of the Express server |
| `SERVER_HTTPS_KEY` | No | Path to the certificate key to be used by the HTTPS server |
| `SERVER_HTTPS_CRT` | No | Path to the certificate file to be used by the HTTPS server |
| `SERVER_HTTPS_PASSPHRASE` | No | Passphrase to be used with the HTTPS certificate |
| `COMMENTS_DIR_FORMAT` | **YES** | Path and format of the comments directory (e.g. `_data/comments/@post-slug`) |
| `COMMENTS_FILE_FORMAT` | **YES** | Path and format of the comment files (e.g. `@timestamp-@hash.yml`) |
| `GIT_USERNAME` | **YES** | Username to use when pushing comments to GitHub |
| `GIT_TOKEN` | **YES** | GitHub personal access token ([info](https://help.github.com/articles/creating-an-access-token-for-command-line-use/)) |
| `GIT_USER` | **YES** | GitHub user name |
| `GIT_EMAIL` | **YES** | GitHub user email |
| `GIT_REPO` | **YES** | Path to the local copy of the repository |
| `GIT_REPO_REMOTE` | **YES** | Repository URL (.git) |
| `GIT_COMMIT_MESSAGE` | **YES** | Message to be used on commits |
| `SUBSCRIPTIONS_DATABASE` | No | Path to the file-based database used to manage subscriptions |
| `SUBSCRIPTIONS_NOTIFY_ALL` | No | Email address to where notifications for all posts are sent |
| `MAILGUN_DOMAIN` | No | [Mailgun](http://www.mailgun.com/) domain from where to send subscription notifications |
| `MAILGUN_KEY` | No | [Mailgun](http://www.mailgun.com/) key |
| `MAILGUN_FROM` | No | Sender name and email address for subscription notifications |

## Usage

### Submitting comments

**Jekyll Discuss** will be expecting POST requests containing the following fields:

| Field |  Description |
|-------|--------------|
| `name` | Commenter's name |
| `email` | Commenter's email address |
| `url` | Commenter's URL (optional) |
| `message` | Comment body |
| `company` | Honeypot field for basic spam detection ([info](https://solutionfactor.net/blog/2014/02/01/honeypot-technique-fast-easy-spam-prevention/)) |
| `subscribe` | Whether to notify the commenter of future comments by email (must equal `subscribe`) |
| `post-slug` | Post slug |
| `post-title` | Post title |
| `post-url` | Post URL |

### Displaying comments

On the Jekyll side, showing comments for a post can be done simply by iterating through a set of data files. 

*Example:*

```html
{% if site.data.comments[post_slug] %}
	{% assign comments = site.data.comments[post_slug] | sort %}
	
	{% for comment in comments %}
		<div class="comment">
		  <h3 class="comment__author"><a href="{{ comment[1].url }}">{{ comment[1].name }}</a></h3
		  <p class="comment__date">{{ comment[1].date }}</p>
		  <img class="comment__avatar" src="https://www.gravatar.com/avatar/{{ comment[1].hash }}?d=mm&s=180">
		  {{ comment[1].message }}
		</div>
	{% endfor %}
{% endif %}
```
