---
title: "Note taking without note taking app"
date: "2016-10-17T00:00:00"
summary: "Is it possible to take notes without any note taking apps and lose no convenience?"
tags: ['']
categories: ["workflow"]
lastmod: 2016-10-18
comments: true
draft: false
---

## Why I do not use a note app

Evernote, Quiver, Simplenote, ..., They are all good and I have used them a lot. But now I uninstalled them all. Why?

Some main reasons:

- I prefer to see the note files saved individually in a well used, open, and transparent format, rather than mysterious or private formats defined by the apps themselves.
- I prefer to use my favourite editor rather than the integrated editor reinvented by the apps.

In a word, IMHO, current note taking apps do too much for a note taking job. But could we manage to take notes without the apps and lose no convenience?

## Note format

I decide to use [multimarkdown](https://github.com/fletcher/MultiMarkdown/wiki/MultiMarkdown-Syntax-Guide) because it supports metadata included as part of the document and meanwhile not part of the real contents.

The metadata is a kind of front matter like in [Jekyll post](https://jekyllrb.com/docs/frontmatter/), which describes any infomation you want to add to the document.

Considering a note, the following four variables seems necessary:

```yaml
title: A Note
date: 2016-10-17
category: Cool
tags: workflow, app, mac
```

I restrict the `category` to be only one string, as it is equal to the subfolder name.

And more variables I'd like to add:

- last: last modification date
- comments: true or false
- summary: a brief summary of the note
- published: if published to Jekyll blog

## Manage notes

Finder + Dropbox.

Simply use Finder for note browsing, and Dropbox for syncing to the cloud.

Set a root folder in Dropbox for all notes, e.g. `"Dropbox/Notes"`. Let's call it `notesdir`. Drag it to stay at the side column for quick access.

Then add subfolders as categories. Add a `uncategorized` subfolder for uncategorized notes.

**Tips**: in finder, use list (`Cmd+2`) or column (`Cmd+3`) view to browse note files is (maybe) sufficiently convenient. I prefer the column view, but remember to use the this trick: `Option+drag` to resize the column width to show a lentgh file name, and to let Finder remember the size. Unfortunately the width of all columns must be the same, which is a little ugly, and, this width setting is globally on the mac.

## Edit note

Set in Finder to open and edit the note with your favourite Markdown editor. (I use [MacDown](http://macdown.uranusjr.com/) and [Typora](http://www.typora.io/).)

## Create note

I write a simple shell script to do this. It make a new note file and fill it with initial front matter. 

The script is [here](https://gist.github.com/herrkaefer/8c4b84b07e565d8e2ff5e649e55d8f95). Save it as `newnote.sh` and move it to a bash recognized path.

Usage:

```sh
newnote.sh title category
```

- `title` is required. Remember to quote it if spaces exist.
- If `category` is empty, it will be 'uncategorized`.

The note file `notesdir/category/title.md` will be created (if it does not exist) and opened for edit.


## Publish note as Jekyll post

Here I need another script to do the job:

- Copy the note to Jekyll project's `_posts` folder.
- Rename note file to Jekyll required format: `YEAR-MONTH-DAY-title.md`.
- Modify the front matter accordingly, e.g.
	- modify/add `layout` variable
	- modify/add `last` variable
- Sync with blog server
- Add and set `published` variable to true for the original note

`publishnote.sh`: (to add later)


## Do we need a new kind of note taking app, again?

How about writing a new kind of app which implements the above workflow with a minimal UI, and enhance the user experience much?

- Concentrated and user-friendly note browser
- Click buttons or press shortcuts to add, edit, delete, publish, ...

Essentially, the app should be a better replacement of Finder for note browsing, integrated with some common note operations. I think maybe it is worthwhile to implement such an UI. Consider doing it later :-)