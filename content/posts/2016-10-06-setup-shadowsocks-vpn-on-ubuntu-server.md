---
title: "Setup Shadowsocks / VPN on Ubuntu Server"
date: "2016-10-06T00:00:00"
summary: "People in stupid country, you know what this is for."
tags: ['blog', 'vpn', 'shadowsocks', 'server', 'GFW', 'vps']
categories: ["Webapp"]
lastmod: 2017-12-04
comments: true
draft: false
---

![image]({{"/assets/images/giraffe.jpg" | absolute_url}})

(Environment: Ubuntu 16.04 LTS installed on VPS such as Linode)

## Install and run Shadowsocks on server

I put the following process into a shell script. Check this **"one-click" method**: [giraffe](https://github.com/herrkaefer/giraffe)

### Install Shadowsocks

Update packages:

```sh
sudo apt-get update &amp;&amp; apt-get upgrade
```

Install pip and m2crypto:

```sh
sudo apt-get install python-pip
sudo apt-get install python-m2crypto
```

Install shadowsocks:

```sh
pip install setuptools
pip install shadowsocks
```

If locale error happens:

```sh
export LC_ALL=C
```

### Configue Shadowsocks

Create a config file `/etc/shadowsocks.json` as:

For single user:

```json
{
"server": "my_server_ip",
"server_port": 8388,
"local_address": "127.0.0.1",
"local_port": 1080,
"password": "mypassword",
"timeout": 300,
"method": "aes-256-cfb",
"fast_open": false
}
```

For multiple users:

```json
{
"server": "0.0.0.0",
"port_password": {
    "8381": "ps1",
    "8382": "ps2",
    "8383": "ps3",
    "8384": "ps4"
},
"timeout": 300,
"method": "aes-256-cfb"
}
```

### Start Shadowsocks server

Run shadowsocks server as daemon:

```sh
ssserver -c /etc/shadowsocks.json -d start
```

Stop SS server:

```sh
ssserver -c /etc/shadowsocks.json -d stop
```

Restart: 

```sh
ssserver -c /etc/shadowsocks.json -d restart
```

### Auto start after system reboot

You can start SS server manually with the above command every time the system powers on, or find a way to let it auto started.

There is a method: add the above start command in `/etc/rc.local` before `exit 0` line. However it does not work for me and I don't know why.

Supervisor can do this job.

Install supervisor:

```sh
sudo apt-get install supervisor
```

Create a supervisor config file `/etc/supervisor/conf.d/shadowsocks.conf` with contents:

```
[program:shadowsocks]
command=ssserver -c /etc/shadowsocks.json -d start
autostart=true
autorestart=true
user=root
log_stderr=true
logfile=/var/log/shadowsocks.log
```

Then start (or restart) supervisor:

```sh
sudo service supervisor start
```

And the server part is done.

### Update kernel and install BBR acceleration (for kernel version &lt; 4.9)

ref: [一键安装最新内核并开启 BBR 脚本](https://teddysun.com/489.html)

Check kernal version

```sh
uname -r
```

```sh
wget --no-check-certificate https://github.com/teddysun/across/raw/master/bbr.sh
chmod +x bbr.sh
./bbr.sh
```

## Mac client

Download: [ShadowsocksX](https://github.com/shadowsocks/shadowsocks-iOS/releases)

### Automatically update pac file

(Problem: ShadowsocksX client update pac file from GFWList failed.)

Download a shell script from [here](https://gist.github.com/VincentSit/b5b112d273513f153caf23a9da112b3a) and name it `update_gfwlist.sh`.

```sh
chmod +x update_gfwlist.sh
mv update_gfwlist.sh /usr/local/bin
```

Then you can manually run `update_gfwlist.sh`, or schedule a daily job:

```sh
export EDITOR=nano
crontab -e
```

and add a line:

```sh
# Update GFWList PAC file for ShadowsocksX at 10:30 everyday
30 10 * * * sh /usr/local/bin/update_gfwlist.sh
```

This will automatically update the file `~/.ShadowsocksX/gfwlist.js` everyday at 10:30 am.

### iTerm

[Using Shadowsocks with Command Line Tools](https://github.com/shadowsocks/shadowsocks/wiki/Using-Shadowsocks-with-Command-Line-Tools)

## iOS client

### Wingy

Thanks to NEKit, there's perfect way for iOS user.

&gt; Wingy - Http(s),Socks5 Proxy Utility 作者是 SMART LIMITED
&gt;
&gt; App Store: [Wingy](https://itunes.apple.com/us/app/wingy-http-s-socks5-proxy-utility/id1178584911?mt=8)

### Share proxy from Mac within LAN

(**This approach is not recommended now**)

For iOS,  the following method is OK for home use if you have an idle or long-time working Mac.

**Step 1**: make Mac a http proxy with privoxy

```sh
brew install privoxy
```

Edit config file: `/usr/local/etc/privoxy/config`:

- line "forward-socks5t / …" -&gt; "forward-socks5t / 127.0.0.1:1080"
- line "listen-address 127.0.0.1:8118" -&gt; "listen-address 0.0.0.0:6666" (6666 is a custom unused port)

Start privoxy:

```sh
/usr/local/sbin/privoxy --no-daemon /usr/local/etc/privoxy/config &amp;
```

**Step 2**: make Mac a pac server

```sh
brew install nginx
```

Make a folder to be served by nginx and copy the pac file into it:

```sh
mkdir /usr/local/share/pac
cp ~/.ShadowsocksX/gfwlist.js /usr/local/share/pac/proxy.pac
```

Edit `proxy.pac`, change the line "var proxy = …" to:

```
var proxy = "PROXY [IP_of_Mac]:6666; DIRECT;";
```

Note that 6666 is the port you configured for privoxy.

Then add a nginx configuration file in `/usr/local/etc/nginx/servers`:

```sh
server {
listen       8000;
location / {
    root   /usr/local/share/pac;
    index  index.html index.htm;
}
}
```

Start nginx:

```sh
brew services start nginx
```

On iPhone, in WiFi's http proxy auto mode, add:

```
http://[IP_of_Mac]:8000/proxy.pac
```

We can also fix the IP of Mac by configuring the router.

## Install and running IPsec VPN server

[IPsec VPN 服务器一键安装脚本](https://github.com/hwdsl2/setup-ipsec-vpn/blob/master/README-zh.md)