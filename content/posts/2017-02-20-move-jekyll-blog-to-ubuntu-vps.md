---
title: "Move Jekyll blog to Ubuntu VPS"
date: "2017-02-20T00:00:00"
year: "2017"
summary: "How to write blog with Jekyll + git, on a Ubuntu VPS?"
tags: ['blog', 'jekyll', 'vps', 'ubuntu']
categories: ["Workflow"]
lastmod: 2020-01-03
draft: false
---

(Tested on: Linode with Ubuntu 16.04 LTS)



# Install Jekyll on Ubuntu VPS



```sh



sudo apt update &amp;&amp; apt -y upgrade



sudo apt install ruby ruby-dev ruby-bundler zlib1g-dev build-essential make gcc git jekyll bundler



```



# Automated deployment with Git



On VPS,



```sh



mkdir ~/blog.git # the site source



mkdir -p ~/www/blog # the built site



```



Setup git hook to automatically build the site whenever after site source is updated:



```sh



cd ~/blog.git



git init --bare



cp hooks/post-update.sample hooks/post-receive



```



&gt; `--bare` means that our folder will have no source files, just the version control.



Edit `hooks/post-receive`:



```sh



#!/bin/sh



GIT_REPO=$HOME/blog.git



TMP_GIT_CLONE=$HOME/tmp/blog



PUBLIC_WWW=$HOME/www/blog



git clone $GIT_REPO $TMP_GIT_CLONE



jekyll build -s $TMP_GIT_CLONE -d $PUBLIC_WWW



rm -Rf $TMP_GIT_CLONE



exit



```



# Serve static site with Nginx



Install nginx:



```sh



sudo apt install nginx



```



Add a configuration:



```sh



sudo nano /etc/nginx/conf.d/blog.conf



```



with content:



```



server {



# listen on http (port 80)



# remove the "default_server" if you are running multiple sites off the same VPS



listen 80 default_server;



# the IP address of your VPS



server_name herrkaefer.com;



# see http://nginx.org/en/docs/http/server_names.html for options



# to use your own domain, point a DNS A record at this IP address



# and set the server name to (eg.) "blog.example.com"



# the path you deployed to. this should match whatever was in your



# Capistrano deploy file, with "/current" appended to the end



# (Capistrano symlinks to this to your current site)



root /home/herrkaefer/www/blog;



index index.html



# how long should static files be cached for, see http://nginx.org/en/docs/http/ngx_http_headers_module.html for options.



expires 1d;



}



```



Then remove default config file and restart Nginx:



```



sudo rm /etc/nginx/sites-enabled/default



sudo systemctl restart nginx



```



Remember to allow Nginx port if the firewall is enabled.



# Local machine setup



On local machine, in Jekyll repo folder, add remote repository:



```sh



cd [jekyll_blog_folder]



```



Show remotes:



```sh



git remote -v



```



Add remote named `web`:



```sh



git remote add web username@[host]:~/blog.git



```



If you need to specify other SSH port, you should do:



```sh



git remote add web ssh://username@[host]:[port][absolutePathTo]/blog.git



```



note that `ssh://` can not be omitted.



# Write and publish



After writing,



```



git commit -am "blog updated"



git push web master



```



# Troubleshoot



## Nginx 403 Forbidden



[nginx 403 Forbidden 排错记录 - 简书](https://www.jianshu.com/p/e0dadb871894)