---
title: "Open folder or file with Sublime Text from Finder toolbar"
date: "2020-01-19T00:00:00"
summary: "How to open folder in Sublime Text directly from Finder?"
tags: ['macOS', 'Finder', 'workflow', 'SublimeText']
categories: ["Workflow"]
draft: false
---

![](/assets/images/open-with-sublime.png)

## Solution

Make a light-weighted application with AppleScript.

### Step 1

Create a new AppleScript script, input:

```applescript
try
	tell application "Finder"
		set sel to selection
		set numElements to count sel
		if numElements is 1 then
			set itemPath to POSIX path of (sel as string)
		else
			set itemPath to POSIX path of ((folder of the front Finder window) as alias)
		end if
		tell application "Terminal"
			do shell script "/usr/local/bin/subl " &amp; quoted form of itemPath
		end tell
	end tell
on error
	log "Error: No selection"
end try
```

- Export it as an application. 
- Move it to "Application" folder. 
- Cmd + Drag it to Finder's toobar.

### Step 2:

Open System Preferences &gt; Security &amp; Privacy &gt; Privacy &gt; Accessibility, add your app to the list.