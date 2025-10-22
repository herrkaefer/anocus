#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复文章段落格式脚本
确保所有文章的段落之间都有空行
"""

import os
import re
from pathlib import Path

def fix_paragraphs_in_file(file_path):
    """修复单个文件的段落格式"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # 检查是否包含front matter
        if content.startswith('---'):
            # 找到front matter的结束位置
            lines = content.split('\n')
            front_matter_end = 0
            for i, line in enumerate(lines):
                if line.strip() == '---' and i > 0:
                    front_matter_end = i + 1
                    break

            # 分离front matter和内容
            front_matter = '\n'.join(lines[:front_matter_end])
            body_content = '\n'.join(lines[front_matter_end:])
        else:
            front_matter = ''
            body_content = content

        # 处理正文内容
        if body_content.strip():
            # 按行分割
            lines = body_content.strip().split('\n')

            # 处理每一行，确保段落之间有空行
            processed_lines = []
            prev_line_empty = False

            for line in lines:
                line = line.strip()
                if line:  # 非空行
                    processed_lines.append(line)
                    prev_line_empty = False
                else:  # 空行
                    if not prev_line_empty:  # 如果前一行不是空行，添加一个空行
                        processed_lines.append('')
                    prev_line_empty = True

            # 用双换行连接段落
            fixed_body = '\n\n'.join(processed_lines)

            # 重新组合内容
            if front_matter:
                fixed_content = front_matter + '\n\n' + fixed_body
            else:
                fixed_content = fixed_body

            # 写回文件
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(fixed_content)

            return True
        else:
            return False

    except Exception as e:
        print(f"处理文件 {file_path} 时出错: {str(e)}")
        return False

def main():
    posts_dir = '/Users/herrk/dev-local/herrkaefer.com/content/posts'
    posts_path = Path(posts_dir)

    if not posts_path.exists():
        print(f"目录不存在: {posts_dir}")
        return

    # 获取所有markdown文件
    md_files = list(posts_path.glob('*.md'))
    print(f"找到 {len(md_files)} 个markdown文件")

    fixed_count = 0
    for md_file in md_files:
        if fix_paragraphs_in_file(md_file):
            print(f"修复: {md_file.name}")
            fixed_count += 1

    print(f"共修复了 {fixed_count} 个文件")

if __name__ == "__main__":
    main()
