---
title: "PostgreSQL Notes"
summary: "As a novice of PostgreSQL, what if I can not remember the simple steps to construct a basic working environment?"
comments: true
draft: false
date: "2016-08-15T00:00:00"
---

[Official Documentation](https://www.postgresql.org/docs/9.5/static/index.html) and [Tutorial](https://www.postgresql.org/docs/9.5/static/tutorial.html)

## Install and run

### Mac

```sh
brew install postgresql
```

Make sure that brew service is installed

```sh
brew tap homebrew/services
```

Start PostgreSQL as a background service: (will start automatically at login)

```sh
brew services start postgresql
```

stop and restart:

```sh
brew services stop [restart] postgresql
```

### Linux

(to add)

## Tools

### Administrative front-ends

- command line tool: `psql`
- graphical tool: [`pgAdmin`](https://www.pgadmin.org/)

### GIS

- [QGIS](http://www.qgis.org/en/site/)

## psql

### Two basic modes

- Connect to a database and entering SQL Commands

```sh
psql mydb
```

then execute commands for the database.

- Use psql directly

    For example:

```sh
psql mydb -c "\l"
psql mydb -c "[command]"
```

### Basic meta-commands

- list databases: `\l`
- list tables: `\dt`
- show columns: `\d table`
- quit: `\q`

Full [doc](https://www.postgresql.org/docs/9.5/static/app-psql.html) here.