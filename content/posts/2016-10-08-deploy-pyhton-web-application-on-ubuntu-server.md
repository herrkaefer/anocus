---
title: "Deploy Python web application on Ubuntu server"
summary: "How to do this step by step?"
lastmod: 2016-10-08
comments: true
draft: false
date: "2016-10-08T00:00:00"
---

Components used for this article:



- VPS: [Linode](https://www.linode.com/)



- OS: **Ubuntu 14.04 LTS**



- Web server: [Nginx](http://nginx.org/)



- WSGI server: [Gunicorn](http://gunicorn.org/)



- Application framework: [Pyramid](http://docs.pylonsproject.org/en/latest/docs/pyramid.html#pyramid-documentation)



- Relational database: [PostgreSQL](https://www.postgresql.org/)



- NoSQL data store: [Redis](http://redis.io/)



- Python version: 3.4



Suppose that we already installed an Ubuntu image on a Linode plan.



## Update packages



```sh



sudo apt-get update &amp;&amp; apt-get upgrade



```



## DNS resolution



Add a `A record` for the domain name of the application.



## Nginx



### Install Nginx



```sh



sudo apt-get install nginx



```



### Configure Ngnix



Create a cofiguration file under `/etc/nginx/conf.d/` with name `[app_name].conf`.



```sh



sudo nano /etc/nginx/conf.d/[app_name].conf



```



#### Configure without https



Template of `/etc/nginx/conf.d/[app_name].conf`:



```



upstream app_server_wsgiapp {



server localhost:8000 fail_timeout=0;



}



server {



listen 80;



# make sure to change the next line to your own domain name!



server_name appname.example.com;



access_log /var/log/nginx/appname.access.log;



error_log /var/log/nginx/appname.error.log info;



keepalive_timeout 5;



# nginx serve up static files and never send to the WSGI server



location /static {



autoindex on;



alias /home/username/appname/static;



}



location / {



proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;



proxy_set_header Host $http_host;



proxy_redirect off;



if (!-f $request_filename) {



proxy_pass http://app_server_wsgiapp;



break;



}



}



# this section allows Nginx to reverse proxy for websockets



location /socket.io {



proxy_pass http://app_server_wsgiapp/socket.io;



proxy_redirect off;



proxy_buffering off;



proxy_set_header Host $host;



proxy_set_header X-Real-IP $remote_addr;



proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;



proxy_http_version 1.1;



proxy_set_header Upgrade $http_upgrade;



proxy_set_header Connection "Upgrade";



}



}



```



#### Configure with https



(to add)



#### Restart nginx



Delete default website file:



```sh



sudo rm /etc/nginx/sites-enabled/default



```



Apply new configuration:



```sh



sudo service nginx restart



```



## PostgreSQL



Install PostgreSQL



```sh



sudo apt-get install postgresql libpq-dev postgresql-client-common postgresql-client



```



then create database and new user



```sh



# switch to postgres user



sudo su - postgres



# create database



createdb dbname



# create a non-root database user and set password



createuser --superuser username



psql



ALTER USER username WITH PASSWORD 'password';



```



(For me, it seems that the last line would take effect, but we can change the password later.)



Press `CTRL-D` to quit `psql`, and `CTRL-D` again to quit postgres user.



Now database `dbname` is created and user `username` is able to access the database.



```sh



# Connect to database



psql dbname



# Show tables



\dt



```



Change password of current user:



```sh



\password



```



## Redis



Install Redis



```sh



sudo apt-get install redis-server



```



Test using `redis-cli`.



## Python application



### Install pip, virtualenv



```sh



sudo apt-get install python3-pip



sudo apt-get install python3.4-venv



sudo python3 -m pip install virtualenv virtualenvwrapper



```



Note: `python3.4-venv` not `python3-venv`



### Make virtualenv



```sh



# set an environment variable to where you want your virtual environment



export VENV=~/env



# create the virtual environment



python3 -m venv $VENV



```



Upgrade packages in virtualenv



```sh



$VENV/bin/pip install --upgrade pip setuptools



```



"Why use `$VENV/bin/pip` instead of `source bin/activate`, then `pip`?" From Pyramid docs:



&gt;$VENV/bin/pip clearly specifies that pip is run from within the virtual environment and not at the system level.



&gt;



&gt;activate drops turds into the user's shell environment, leaving them vulnerable to executing commands in the wrong context. deactivate might not correctly restore previous shell environment variables.



&gt;



&gt;Although using source bin/activate, then pip, requires fewer key strokes to issue commands once invoked, there are other things to consider. Michael F. Lamb (datagrok) presents a summary in Virtualenv's bin/activate is Doing It Wrong.



&gt;Ultimately we prefer to keep things clear and simple, so we use $VENV/bin/pip.



### Pyramid



Install Pyramid



```sh



# install pyramid



$VENV/bin/pip install pyramid



# or for a specific released version



$VENV/bin/pip install "pyramid==1.7.3"



```



### Demo app



We create a demo app using scaffold provided by Pyramid.



```sh



$VENV/bin/pcreate -s starter demo



cd demo



$VENV/bin/pip install -e .



```



## WSGI server



Install Gunicorn



```sh



$VENV/bin/pip install gunicorn



```



Run the demo app:



```sh



cd ~/demo



$VENV/bin/gunicorn --paste development.ini -b :8000



```



`8000` is the port gunicorn listens from the nginx reverse proxy, which we set in `/etc/nginx/conf.d/demo.conf`.



Open a browser and visit the URL and the app should be running.



### Start gunicorn server with supervisor



Install supervisor



```sh



sudo apt-get install supervisor



```



Configure supervisor. Create a file `/etc/supervisor/conf.d/[app_name].conf`, and add lines: (e.g., for demo app, the file name should be `demo.conf`)



```



[program:demo]



environment=DEBUG=False



command=/home/[username]/venv/bin/gunicorn --paste [path/to/app/]development.ini -b :8000 --chdir [path/to/app]



directory=/home/[username]/demo



user=[username]



autostart=true



autorestart=true



redirect_stderr=True



```



Start supervisor service:



```sh



sudo service supervisor start



```



Visit the URL and the app should be running.