---
title: "Create new text file from Finder toolbar"
date: "2018-03-14T00:00:00"
summary: "How to create a new file from Finder toolbar?"
tags: ['AppleScript', 'Finder', 'macOS']
categories: ["Workflow"]
lastmod: 2018-05-01
draft: false
---

![](/assets/images/new_file_app_toolbar.png)

## Problem

Under macOS, sometimes we want to make new text files directly in place while browsing some folders in Finder. Opening a text editor, creating a file, and saving it to the target path is not efficient in this situation. However there is no built-in context menu item to do this as in Windows.

## Solution

We can make an simple application from AppleScript, and place a shortcut in Finder's toolbar. When you click the icon, a default text file will be created in current folder, and it will be in the status of renaming so that you can change the filename conveniently.

### Step 1

Open `Script Editor`, and create a new script with the following contents:

```applescript
set file_name to "untitled"
set file_ext to ".md"
set is_desktop to false

-- get folder path and if we are in desktop (no folder opened)
try
  tell application "Finder"
    set this_folder to (folder of the front Finder window) as alias
  end tell
on error
  -- no open folder windows
  set this_folder to path to desktop folder as alias
  set is_desktop to true
end try

-- get the new file name (do not override an already existing file)
tell application "System Events"
  set file_list to get the name of every disk item of this_folder
end tell

set new_file to file_name & file_ext
set x to 1

repeat
  if new_file is in file_list then
    set new_file to file_name & " " & x & file_ext
    set x to x + 1
  else
    exit repeat
  end if
end repeat

-- create and select the new file
tell application "Finder"
  activate
  set the_file to make new file at folder this_folder with properties {name:new_file}

  if is_desktop is false then
    reveal the_file
  else
    select window of desktop
    set selection to the_file
  end if

  delay 0.4
end tell

-- press enter (rename)
tell application "System Events"
  tell process "Finder"
    keystroke return
  end tell
end tell
```



(Acknowledgement: The script is borrowed from [this post](https://zeldor.biz/2017/12/mac-os-x-finder-new-file/comment-page-1/#comment-3681121). I did a little modification by adding a delay line to avoid wrong keystroke.)



Note that you can change the default filename and suffix in the first two lines. Here I set it as Markdown file.



### Step 2



Export the script as an Application, e.g. "NewTxtFileInFinder.app", and put it in `Application` folder.



### Step 3



In `Application` folder, Drag the app to the Finder's toolbar while holding the `command` button.



### Step 4 (optional)



Turn off the annoying warning when changing the file suffix. This can be set in Finder's Preference -&gt; Advanced.



### Step 5 (optional)

Change app icon to a beautiful and meaningful one.

- Find or make a icon file with suffix `icns`.
- In Finder, select the app, `Cmd+i` to show the info panel.
- Drag the icns file to the top-left to replace the icon.

## Other solutions

An app [New File Menu](https://langui.net/new-file-menu/) can add a context menu to Finder and can be used to create different documents like in Windows. It supports many formats besides text file though requires more clicks to create a new file.
