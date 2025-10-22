#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
WordPress文章迁移脚本
从WordPress XML文件中提取缺失的文章并创建Hugo格式的Markdown文件
"""

import re
import os
from datetime import datetime
from pathlib import Path

def extract_articles_from_xml(xml_file_path):
    """从XML文件中提取文章信息"""
    articles = []

    with open(xml_file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 使用正则表达式提取文章信息
    item_pattern = r'<item>.*?</item>'
    items = re.findall(item_pattern, content, re.DOTALL)

    for item in items:
        # 提取标题
        title_match = re.search(r'<title><!\[CDATA\[(.*?)\]\]></title>', item)
        if not title_match:
            continue
        title = title_match.group(1)

        # 提取日期
        date_match = re.search(r'<wp:post_date><!\[CDATA\[(.*?)\]\]></wp:post_date>', item)
        if not date_match:
            continue
        post_date = date_match.group(1)

        # 提取内容
        content_match = re.search(r'<content:encoded><!\[CDATA\[(.*?)\]\]></content:encoded>', item, re.DOTALL)
        if not content_match:
            continue
        article_content = content_match.group(1)

        # 清理HTML标签
        clean_content = clean_html(article_content)

        articles.append({
            'title': title,
            'date': post_date,
            'content': clean_content
        })

    return articles

def clean_html(html_content):
    """清理HTML标签，保留基本格式"""
    # 先处理一些特殊的HTML标签
    clean = html_content

    # 保留段落标签，转换为换行
    clean = re.sub(r'</p>\s*<p[^>]*>', '\n\n', clean)
    clean = re.sub(r'<p[^>]*>', '', clean)
    clean = re.sub(r'</p>', '\n\n', clean)

    # 保留换行标签
    clean = re.sub(r'<br[^>]*>', '\n', clean)

    # 保留强调标签
    clean = re.sub(r'<strong[^>]*>', '**', clean)
    clean = re.sub(r'</strong>', '**', clean)
    clean = re.sub(r'<b[^>]*>', '**', clean)
    clean = re.sub(r'</b>', '**', clean)
    clean = re.sub(r'<em[^>]*>', '*', clean)
    clean = re.sub(r'</em>', '*', clean)
    clean = re.sub(r'<i[^>]*>', '*', clean)
    clean = re.sub(r'</i>', '*', clean)

    # 处理链接
    clean = re.sub(r'<a[^>]*href="([^"]*)"[^>]*>([^<]*)</a>', r'[\2](\1)', clean)

    # 处理图片 - 保留alt文本或链接
    clean = re.sub(r'<img[^>]*alt="([^"]*)"[^>]*>', r'![图片: \1]', clean)
    clean = re.sub(r'<img[^>]*src="([^"]*)"[^>]*>', r'![图片](\1)', clean)
    clean = re.sub(r'<img[^>]*>', '[图片]', clean)

    # 处理其他HTML标签
    clean = re.sub(r'<div[^>]*>', '', clean)
    clean = re.sub(r'</div>', '\n', clean)
    clean = re.sub(r'<span[^>]*>', '', clean)
    clean = re.sub(r'</span>', '', clean)

    # 移除剩余的HTML标签
    clean = re.sub(r'<[^>]+>', '', clean)

    # 清理HTML实体
    clean = clean.replace('&amp;', '&')
    clean = clean.replace('&lt;', '<')
    clean = clean.replace('&gt;', '>')
    clean = clean.replace('&quot;', '"')
    clean = clean.replace('&#8217;', "'")
    clean = clean.replace('&#8211;', '–')
    clean = clean.replace('&#8212;', '—')

    # 清理多余的空白字符
    clean = re.sub(r'\n\s*\n\s*\n', '\n\n', clean)  # 多个空行合并为两个
    clean = re.sub(r'[ \t]+', ' ', clean)  # 多个空格合并为一个
    clean = clean.strip()

    return clean

def create_hugo_article(article, output_dir):
    """创建Hugo格式的文章文件"""
    # 格式化日期
    date_obj = datetime.strptime(article['date'], '%Y-%m-%d %H:%M:%S')
    formatted_date = date_obj.strftime('%Y-%m-%dT00:00:00')

    # 创建文件名
    safe_title = re.sub(r'[^\w\s-]', '', article['title'])
    safe_title = re.sub(r'[-\s]+', '-', safe_title)
    filename = f"{date_obj.strftime('%Y-%m-%d')}-{safe_title}.md"

    # 创建文件内容
    frontmatter = f"""---
title: "{article['title']}"
date: "{formatted_date}"
summary: "Migrated from my old blog"
draft: false
---

{article['content']}
"""

    # 写入文件
    output_path = Path(output_dir) / filename
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(frontmatter)

    return output_path

def get_existing_articles(posts_dir):
    """获取已存在的文章列表"""
    existing_articles = set()
    posts_path = Path(posts_dir)

    if posts_path.exists():
        for file_path in posts_path.glob('*.md'):
            existing_articles.add(file_path.stem)

    return existing_articles

def main():
    # 配置路径
    xml_file = '/Users/herrk/dev-local/herrkaefer.com/WordPress.2025-10-22.xml'
    posts_dir = '/Users/herrk/dev-local/herrkaefer.com/content/posts'

    print("开始提取WordPress文章...")
    articles = extract_articles_from_xml(xml_file)
    print(f"从XML文件中提取了 {len(articles)} 篇文章")

    # 获取已存在的文章
    existing_articles = get_existing_articles(posts_dir)
    print(f"已存在 {len(existing_articles)} 篇文章")

    # 重新处理所有文章（强制重新创建）
    missing_articles = articles
    print(f"将重新处理所有 {len(missing_articles)} 篇文章")

    # 创建缺失的文章
    created_count = 0
    for article in missing_articles:
        try:
            output_path = create_hugo_article(article, posts_dir)
            print(f"创建文章: {output_path.name}")
            created_count += 1
        except Exception as e:
            print(f"创建文章失败: {article['title']} - {str(e)}")

    print(f"成功创建了 {created_count} 篇文章")

if __name__ == "__main__":
    main()
