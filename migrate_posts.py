#!/usr/bin/env python3
import os
import re
from datetime import datetime

def convert_jekyll_to_hugo(jekyll_file, hugo_file):
    """Convert a Jekyll post to Hugo format"""
    with open(jekyll_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split front matter and content
    if content.startswith('---'):
        parts = content.split('---', 2)
        if len(parts) >= 3:
            front_matter = parts[1].strip()
            post_content = parts[2].strip()
        else:
            front_matter = ""
            post_content = content
    else:
        front_matter = ""
        post_content = content

    # Parse front matter
    front_matter_dict = {}
    if front_matter:
        for line in front_matter.split('\n'):
            if ':' in line:
                key, value = line.split(':', 1)
                key = key.strip()
                value = value.strip()
                if value.startswith('"') and value.endswith('"'):
                    value = value[1:-1]
                front_matter_dict[key] = value

    # Convert to Hugo format
    hugo_front_matter = "---\n"

    # Map Jekyll fields to Hugo fields
    if 'title' in front_matter_dict:
        hugo_front_matter += f"title: \"{front_matter_dict['title']}\"\n"

    if 'date' in front_matter_dict:
        # Convert date format if needed
        date_str = front_matter_dict['date']
        try:
            # Parse the date and reformat
            if len(date_str) == 10:  # YYYY-MM-DD format
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                hugo_front_matter += f"date: {date_obj.strftime('%Y-%m-%dT%H:%M:%S%z')}\n"
            else:
                hugo_front_matter += f"date: {date_str}\n"
        except:
            hugo_front_matter += f"date: {date_str}\n"

    if 'summary' in front_matter_dict:
        hugo_front_matter += f"summary: \"{front_matter_dict['summary']}\"\n"

    if 'tags' in front_matter_dict:
        tags = front_matter_dict['tags']
        if isinstance(tags, str):
            # Split comma-separated tags
            tag_list = [tag.strip() for tag in tags.split(',')]
            hugo_front_matter += f"tags: {tag_list}\n"
        else:
            hugo_front_matter += f"tags: {tags}\n"

    if 'category' in front_matter_dict:
        hugo_front_matter += f"categories: [\"{front_matter_dict['category']}\"]\n"

    if 'last' in front_matter_dict:
        hugo_front_matter += f"lastmod: {front_matter_dict['last']}\n"

    if 'comments' in front_matter_dict:
        hugo_front_matter += f"comments: {front_matter_dict['comments']}\n"

    # Add draft status
    if 'published' in front_matter_dict and front_matter_dict['published'] == 'false':
        hugo_front_matter += "draft: true\n"
    else:
        hugo_front_matter += "draft: false\n"

    hugo_front_matter += "---\n\n"

    # Write Hugo file
    with open(hugo_file, 'w', encoding='utf-8') as f:
        f.write(hugo_front_matter + post_content)

def main():
    jekyll_posts_dir = "/Users/herrk/dev-local/herrkaefer.com/_posts"
    hugo_posts_dir = "/Users/herrk/dev-local/herrkaefer-hugo/content/posts"

    # Create Hugo posts directory if it doesn't exist
    os.makedirs(hugo_posts_dir, exist_ok=True)

    # Convert each Jekyll post
    for filename in os.listdir(jekyll_posts_dir):
        if filename.endswith('.md'):
            jekyll_file = os.path.join(jekyll_posts_dir, filename)
            hugo_file = os.path.join(hugo_posts_dir, filename)

            print(f"Converting {filename}...")
            convert_jekyll_to_hugo(jekyll_file, hugo_file)

    print("Migration completed!")

if __name__ == "__main__":
    main()
