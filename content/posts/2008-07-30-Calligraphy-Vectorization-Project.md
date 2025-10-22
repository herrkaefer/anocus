---
title: "Calligraphy Vectorization Project"
date: "2008-07-30T00:00:00"
summary: "Migrated from my old blog"
draft: false
---

有个著名ID的签名叫做“不做无聊之事，何以遣此有涯之生”，从今天开始，给自己找个了好玩的体力活做：把书法中的汉字转换成矢量格式，起了名字，就叫Calligraphy Vectorization (CV) Project。因为要调参数去噪点又要保证字的质量，其实也挺费事的，所以不求快，每天若有空做一字或数字即可。从兰亭集序开始吧，根据中文维基上的[冯承素摹本](http://upload.wikimedia.org/wikipedia/commons/f/f1/LantingXu.jpg)（即神龙本），这就一字一字地做将起来! 订几个规则： 1） 文件保存。保存为SVG格式矢量图文件。同时输出位图文件，贴上来。



2） 噪点判断。噪点即非笔画的墨迹的点，可能是纸面本来就有的，也可能是扫描引起的。可能不是墨迹，也可能是墨迹。除了去除明显背景噪点外，力求不做其它任何主观美化。对于难以区分是噪点还是笔画的点（特别是那些和笔画相连的点），做慎重的判断，不能断定的情况下，应保留疑似噪点为好。当然提取轮廓的阈值设定不可避免要掺入主观因素，要在噪点和笔画之间找到好的平衡，以尽量不伤害笔画为标准。 3） 位图预处理。对位图的预处理：判断和笔画相连的干扰点，把它们和笔画切断。这样的好处是在提取轮廓一步可以选取较高的阈值，不使输出的笔画太瘦（因为墨迹在纸上有晕染效果，轮廓截取到什么位置也很重要），同时噪点和笔画是相离的，容易去除。



* * * *



[*](http://byfiles.storage.live.com/y1plbA-Rrf0lhkimgaUrSiFlXlTTXi0j6j98G7iGYee_v6EL2RPEl0uT_2SkPwMm9qZrTYOn4Wq3ow)