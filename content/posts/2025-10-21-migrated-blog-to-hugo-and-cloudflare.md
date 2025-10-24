---
title: "Migrated Blog to Hugo and Cloudflare Pages"
date: "2025-10-21"
summary: "Make blogging great again!"
tags: ['blog', 'hugo', 'cloudflare']
categories: ['workflow']
draft: false
---

After running my blog on Jekyll (GitHub pages and then Wordpress) for several years, I decided it was time for a change. Why?

- Jekyll -> Hugo

Jekyll seems to be less popular and actively developed these days.

- Wordpress -> Cloudflare Pages

Wordpress is hard to use and manage to me. And Cloudflare Pages is free for a static site.

AI helped me with the migration. It wrote a scraper to fetch the posts from the Wordpress posts and convert them to Markdown format. And it even kept the original theme for me.

But later I modified the theme based on [this one](https://github.com/yihui/hugo-paged).

Most of the photos in the original posts are missing. I decided to drop them.

## Specify Hugo version in Cloudflare Pages

Hugo version caused some issues. I had to specify a newer version on Cloudflare Pages. But seems it can only be done by setting environment variables.

## Local preview

```sh
hugo server --buildDrafts --port 1313
```

*Make blogging great again!*
