---
title: "给Live Space备个份"
date: "2008-06-25T00:00:00"
summary: "Migrated from my old blog"
draft: false
---

虽然对盖茨捐出580亿做慈善实在钦佩的无话可说，但对微软的东西从来都没什么太大信心。对于MSN和space经常出问题和不好用基本上都习以为常了。但有没有可能微软服务器被黑掉或者自己密码被改掉的事情发生？![Post Image 1](/assets/images/placeholder.svg "Original image from WordPress") 所以，让我们未雨绸缪高瞻远瞩，先把日志备份一下。 
网上找到个中国人做的小软件live spave mover(其实是个Python脚本程序)，可以把space日志备份成xml格式（WordPress博客程序所支持的格式，可以直接导入），可作为从live space到WordPress博客的搬移工具，另外，其实可以用来备份日志到本地——很多人同时把日志发表在几个地方做备份只用，其实放在硬盘上虽然不是最安全的，却是最让心里踏实的。虽然live space并不支持把备份的xml日志再行导入，但一旦你需要这么做的时候，想必你也不会再用live space了。 
使用前需按作者建议修改live space的设置，不必复述。此处记下一点经验：Python运行环境安装后似乎并不会自动把python程序加入路径，所以我图省事，把所有程序都拷到python安装目录下运行。