---
layout: docs
title: Getting started
permalink: /docs/index.html
weight: 0
redirect_from:
  - /get-started
---
Welcome! These instructions show you how to integrate Staticman with your site.

These steps relate to the hosted version of the platform; if you wish to host it yourself on your infrastructure, check the [GitHub repository](https://github.com/eduardoboucas/staticman).

## Step 1. Add Staticman to your repository

I will need push access to the repositories you want me to commit the files to. In GitHub, go to your repository **Settings** page, navigate to the **Collaborators** tab and add the username **staticmanapp**.

![Step 1](/assets/images/get-started/step1.png)

At this point, the invitation will be pending. In order for me to accept it, you need to open:

`https://api.staticman.net/v1/connect/{your GitHub username}/{your repository name}`

If all goes well, you should receive a message saying **OK!** and we're good to go.

## Step 2. Add Staticman to your Jekyll config file

I will look for a `_config.yml` file in the root of the repository. Inside, I will read certain settings from a `staticman` object — things like whether to enable content moderation, spam protection, the format or the path of the data files.

[This list](https://github.com/eduardoboucas/staticman#jekyll-configuration) contains a list of all configurable parameters.

## Step 3. Hook up your forms

Forms should `POST` to:

`https://api.staticman.net/v1/entry/{your GitHub repository}/{your repository name}/{the name of the branch}`

All fields should be nested under a `fields` array. Optionally, a `options` array can be used to pass along additional information, such as the title of a post.

The following markup shows how the form for a simple commenting system would look like:

{% highlight html %}{% raw %}
<form method="POST" action="https://api.staticman.net/v1/entry/eduardoboucas/staticman/gh-pages">
  <!-- e.g. "2016-01-02-this-is-a-post" -->
  <input name="options[slug]" type="hidden" value="{{ page.slug }}">

  <input name="fields[name]" type="text">
  <input name="fields[email]" type="email">
  <textarea name="fields[message]"></textarea>

  <button type="submit">Go!</button>
</form>
{% endraw %}{% endhighlight %}

## Step 4. Approve entries (optional)

If you enable content moderation (by setting `moderation: true` in the config), I will send a pull request whenever a new entry is submitted. Merge the pull request to approve it, or close to discard.

![Step 2](/assets/images/get-started/step2.png)

Please note that this step will be skipped if you disable moderation, as entries will be pushed to the main branch immediately.