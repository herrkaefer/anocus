---
title: "Linode Notes - Basic Setup"
date: "2016-10-05T00:00:00"
summary: "How to get started on a Linode server?"
tags: ['vps', 'linode', 'ubuntu']
categories: ["Webapp"]
lastmod: 2016-12-12
comments: true
draft: false
---

## Buy a Linode plan

For location, Tokyo is not available now, and I choose Newark based on [speed test](https://www.linode.com/speedtest) (rather than Fremont).

## Getting started

Ref: [Getting Started with Linode](https://www.linode.com/docs/getting-started)

### Deploy an image

- At [Linode manager](https://manager.linode.com/), enter the dashboard of linode plan.
- Select "Deploy an Image". Choose Ubuntu Long Term Support (LTS) release, e.g. Ubuntu 16.04 LTS.
- Set a password for root user (at least 6 characters long).
- Click "Deploy" button.
- When job finished, click "Boot" to power on.

### Connect to the server

```sh
ssh root@[IP]
```
The IP address can be find in the "Remote Access" panel. Enter the password to log in.

### Basic settings

Upgrade packages

```sh
sudo apt-get update &amp;&amp; apt-get upgrade
```

Set hostname

```sh
echo "hostname" &gt; /etc/hostname

# Set hostname from file
hostname -F /etc/hostname

# Verify hostname
hostname
```

Edit hosts file

```sh
nano /etc/hosts
```

and add a line:

```
[IP address] [Fully Qualified Domain Name (FQDN)] hostname
```

&gt;The value you assign as your system’s FQDN should have an “A” record in DNS pointing to your Linode’s IPv4 address. 

(Save and close file after editing with nano: `CTRL-X`, then `Y`, then `ENTER`.)

Set timezone:

```sh
dpkg-reconfigure tzdata

# Check time
date
```

## Securing Your Server

Ref: [Securing Your Server](https://www.linode.com/docs/security/securing-your-server#use-fail2ban-for-ssh-login-protection)

### Add a Limited User Account

Create user:

```sh
adduser example_user
```

Add user to sudo group:

```sh
adduser example_user sudo
```

Switch to example_user:

```sh
exit
ssh example_user@[IP]
```

### Authentication by SSH key pair

On local machine, 

```sh
ssh-keygen -b 4096
```
Press Enter three times to use default filenames and empty passphrase.

Two files `id_rsa` and `id_rsa.pub` are generated in `/home/your_username/.ssh`.

On Linode,

```sh
mkdir -p ~/.ssh &amp;&amp; sudo chmod -R 700 ~/.ssh/
```

Upload public key to server:

```sh
scp ~/.ssh/id_rsa.pub example_user@[IP]:~/.ssh/authorized_keys
```

Exit and log into Linode again. No password is needed now.

### Adjust SSH settings

Edit `/etc/ssh/sshd_config`

```
# Disable SSH password authentication
PasswordAuthentication no

# Disable PAM authentication
UsePAM no

# Disallow root logins over SSH
PermitRootLogin no
```

Apply new ssh configurations:

```sh
sudo systemctl restart sshd
```

### Use Fail2Ban for SSH Login Protection

```sh
sudo apt-get install fail2ban
```

### Remove Unused Network-Facing Services

To see your Linode’s running network services:

```
sudo netstat -tulpn
```

And remove unused services accordingly.

### Enable the Firewall

Refs:

- [https://www.linode.com/docs/security/firewalls/configure-firewall-with-ufw](https://www.linode.com/docs/security/firewalls/configure-firewall-with-ufw)
- [UFW Essentials: Common Firewall Rules and Commands](https://www.digitalocean.com/community/tutorials/ufw-essentials-common-firewall-rules-and-commands)

## Tools

### zsh

Ref: [Getting oh-my-zsh to work in Ubuntu](https://gist.github.com/tsabat/1498393)

Prereq:

```sh
sudo apt-get install zsh
sudo apt-get install git-core
```

Getting zsh to work in ubuntu is weird, since sh does not understand the `source` command. So, you do this to install zsh

```sh
wget https://github.com/robbyrussell/oh-my-zsh/raw/master/tools/install.sh -O - | zsh
```

and then you change your shell to zsh

```sh
chsh -s `which zsh`
```

and then reboot

```sh
sudo shutdown -r 0
```

Because the default theme does not show hostname, we may want to change a theme ([zsh themes](https://github.com/robbyrussell/oh-my-zsh/wiki/Themes)).

Edit `~/.zshrc` file

```
ZSH_THEME="alanpeabody"
```

### Cyberduck for File transfer

Use [Cyberduck](https://cyberduck.io/): [Transfer Files with Cyberduck on Mac OS X](https://www.linode.com/docs/tools-reference/file-transfer/transfer-files-with-cyberduck-on-mac-os-x)

### Install desktop

Ref: [Install VNC on Ubuntu 16.04](https://www.linode.com/docs/applications/remote-desktop/install-vnc-on-ubuntu-16-04)

Install full desktop:

```sh
sudo apt-get install ubuntu-desktop gnome-panel gnome-settings-daemon metacity nautilus gnome-terminal
```

Or, install desktop environments without full packages (no tools like office and browser, small size, however there exists coding problem for Chinese font):

```sh
sudo apt-get install --no-install-recommends ubuntu-desktop gnome-panel gnome-settings-daemon metacity nautilus gnome-terminal
```

During the install process, you will be asked whether or not to change a system file to the new version. Type **y** then **enter** to use the updated version.

Install VNC server:

```sh
sudo apt-get install vnc4server
```

Exit and reconnect with command: 

```sh
ssh -L 5901:127.0.0.1:5901 user@[IP]
```

start vnc server (for first time, set a password after prompt):

```sh
vncserver :1
```

Then connect with [VNC viewer](https://www.realvnc.com/download/viewer/).

Ignore the "unencrypted connection" message. And a gray screen showed.

Close VNC server:

```sh
vncserver -kill :1
```

And edit `~/.vnc/xstartup` file to add a few lines to the end:

```
gnome-panel &amp;
gnome-settings-daemon &amp;
metacity &amp;
nautilus &amp;
```

Start VNC server again and connect from client. Desktop should show.

In case that VNC viewer shows connection error: "Too many Security Failures", restart the server:

```sh
vncserver -kill :1
vncserver :1
```

#### Install Chrome

[How To Install Chrome Browser In Linux Or Ubuntu VPS](http://www.earngurus.com/install-chrome-browser-in-linux-or-ubuntu-vps/)

## Troubleshooting

### Perl locale warning

like this:

```sh
perl: warning: Setting locale failed.
perl: warning: Please check that your locale settings:
    LANGUAGE = (unset),
    LC_ALL = (unset),
    LANG = "en_US.UTF-8"
are supported and installed on your system.
perl: warning: Falling back to the standard locale ("C").
```

Solution: comment out line from `/etc/ssh/sshd_config`:

```
AcceptEnv LANG LC_*
```

Ref: [link](http://stackoverflow.com/questions/2499794/how-can-i-fix-a-locale-warning-from-perl)