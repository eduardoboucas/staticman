<a href="http://include-media.com">!['At' sign](http://include-media.com/assets/images/logo.png)</a>

# include-media — Columns plugin

> Get **include-media** [here](https://github.com/eduardoboucas/include-media).

### Introduction

This plugin generates classes for a grid system using [Harry Roberts' BEMIT naming convention](http://csswizardry.com/2015/08/bemit-taking-the-bem-naming-convention-a-step-further/), based on a number of subdivisions specified by the user, and taking into account all the breakpoints defined by **include-media**.

*Example:*

```scss
@import 'include-media';
@import 'include-media-columns';

$breakpoints: (
    'medium': 768px,
    'large': 1024px
);

// Dividing the layout in halves and thirds
@include im-columns(2, 3);
```

*Generates:*

```css
@media (min-width: 768px) {
  .col--1-2\@medium {
    width: 50%;
  }
  .col--2-2\@medium {
    width: 100%;
  }
  .col--1-3\@medium {
    width: 33.33333%;
  }
  .col--2-3\@medium {
    width: 66.66667%;
  }
  .col--3-3\@medium {
    width: 100%;
  }
}

@media (min-width: 1024px) {
  .col--1-2\@large {
    width: 50%;
  }
  .col--2-2\@large {
    width: 100%;
  }
  .col--1-3\@large {
    width: 33.33333%;
  }
  .col--2-3\@large {
    width: 66.66667%;
  }
  .col--3-3\@large {
    width: 100%;
  }
}

.col--1-2 {
  width: 50%;
}

.col--2-2 {
  width: 100%;
}

.col--1-3 {
  width: 33.33333%;
}

.col--2-3 {
  width: 66.66667%;
}

.col--3-3 {
  width: 100%;
}
```

### Installation

- **Manually:** Download [this file](https://raw.githubusercontent.com/eduardoboucas/include-media-columns/master/_include-media-columns.scss) and import it into your Sass project
- **Bower:** Run `bower install include-media-columns`


### Usage examples

To create a grid where four elements in a row are displayed on the *large* view, two elements on the *medium* view and just one element on the *small* view, one can simply define the items as follows:

```scss
@include im-columns(1, 2, 4);

.col {
    float: left;
}
```

```html
<article class="col col--1-4@large col--1-2@medium col--1-1@small"></article>
```
