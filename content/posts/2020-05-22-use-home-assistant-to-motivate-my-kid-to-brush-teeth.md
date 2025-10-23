---
title: "Use Home Assistant to Motivate My Kid to Brush Teeth"
date: 2025-10-23
summary: "A simple yet delightful Home Assistant automation that helps kids build the brushing habit — with Spotify music, voice encouragement, and streak tracking."
tags: ["home assistant", "automation", "smart home", "parenting", "iot"]
categories: ["projects"]
draft: false
---

## Overview

Hope you are not, but getting my kids to brush their teeth consistently can be a daily struggle. After a unpleasure event this morning, I was thinking to add a small fun using Home Aasistant so that hopefully my daughter could be motivated (for a while or longer)

With this setup I wish the teeth brushing events are automatically detected, announced by Google speaker, accompanied by a two-minute Spotify playlist, and recorded in Home Assistant.


## Components Used

- **Home Assistant** core for automation logic
- **Aqara Zigbee Button** (used to start brushing sequence)
- **Google Speaker** for voice & music
- **Spotify Integration** for 2-minute brushing songs
- **Helpers:**
  - `input_datetime.teeth_brushing_start` and `end`
  - `counter.teeth_brushing_counter` (daily count)
  - `counter.teeth_brush_streak` (streak days)

<!-- ![placeholder – hardware overview](path/to/image_hardware_overview.jpg) -->


## Automations

### 1. Brushing Routine

The kid is expected to press the button and then start the brushing. The button triggers an automation:

1. Records brushing start time
2. Let the speaker announces start
3. Plays a song from a predefined Spotify playlist for 2 minutes
4. Announces completion and records the end time
5. Increments the daily brushing counter

```yaml
alias: Brush teeth
description: ""
triggers:
  - device_id: 24c653c21ef64657d22831f1194c63e1
    domain: zha
    type: remote_button_short_press
    subtype: remote_button_short_press
    trigger: device
conditions:
  - condition: time
    after: "06:00:00"
    before: "23:59:00"
actions:
  - action: input_datetime.set_datetime
    metadata: {}
    data:
      datetime: "{{now()}}"
    target:
      entity_id: input_datetime.teeth_brushing_start
  - action: media_player.volume_set
    metadata: {}
    data:
      volume_level: "{{ volume_level }}"
    target:
      entity_id: "{{ speaker }}"
  - action: tts.google_translate_say
    metadata: {}
    data:
      cache: true
      entity_id: "{{ speaker }}"
      message: Let's brush our teeth for two minutes!
  - delay: "00:00:05"
  - action: script.play_spotify_list
    metadata: {}
    data:
      entity: "{{ speaker }}"
      uri: "{{ playlist_uri }}"
      volume: "{{ (volume_level * 100) | int }}"
  - delay:
      hours: 0
      minutes: 1
      seconds: 50
      milliseconds: 0
  - action: tts.google_translate_say
    metadata: {}
    data:
      cache: true
      entity_id: "{{ speaker }}"
      message: Great job! You finished brushing your teeth!
  - action: input_datetime.set_datetime
    metadata: {}
    data:
      datetime: "{{now()}}"
    target:
      entity_id: input_datetime.teeth_brushing_end
  - action: counter.increment
    metadata: {}
    data: {}
    target:
      entity_id: counter.teeth_brushing_counter
variables:
  speaker: media_player.mira_room_speaker
  volume_level: 0.48
  playlist_uri: spotify:playlist:3lacrdXRalnL5FJrzb4UcS
mode: single
```


### 2. Midnight Streak Update

At midnight, another automation checks whether (>= 2) brushing happened that day:

```yaml
alias: Update Teeth Brush Streak at Midnight
description: Increment or reset streak depending on daily brushing
mode: single

variables:
  daily_counter: counter.teeth_brushing_counter
  streak_counter: counter.teeth_brush_streak

triggers:
  - at: "23:59:00"
    trigger: time

conditions: []

actions:
  - variables:
      brushed_today: "{{ states(daily_counter) | int > 1 }}"
  - choose:
      - conditions:
          - condition: template
            value_template: "{{ brushed_today }}"
        sequence:
          - target:
              entity_id: "{{ streak_counter }}"
            action: counter.increment
      - conditions:
          - condition: template
            value_template: "{{ not brushed_today }}"
        sequence:
          - target:
              entity_id: "{{ streak_counter }}"
            action: counter.reset
  - target:
      entity_id: "{{ daily_counter }}"
    action: counter.reset
```

## Dashboard Visualization

Daily Count + Streak Chip

A single Mushroom Template Chip shows both today’s brushing and the running streak.
The number of 🪥 icons corresponds to the daily brushing count, and the streak is visualized with fire emojis.

```yaml
type: custom:mushroom-chips-card
chips:
  - type: template
    entity: counter.teeth_brushing_counter
    icon: mdi:toothbrush-electric
    icon_color: >
      {% set count = states('counter.teeth_brushing_counter') | int %} {% if
      count == 0 %}
        red
      {% elif count == 1 %}
        amber
      {% else %}
        green
      {% endif %}
    content: >
      {% set count = states('counter.teeth_brushing_counter') | int %}  {% set
      streak = states('counter.teeth_brushing_streak') | int %}  {% set brushes
      = '🪥' * count if count > 0 else '🚨' %}  {% set fire = '☘️' * streak if
      streak > 0 else 0 %}  today:{{ brushes }} streak:{{ fire }}
    tap_action:
      action: more-info
```


## What are good to add

- Let brushing ends by manually pressing the button again, this way there's less chance of cheating.
- Add a small battery-powered display near the sink to show streaks. Physical visialization is powerful.
- Streak would be better to be updated in realtime, i.e. adding today after brushing in the evening instead of updating at midnight.
- Add milestone rewards based on streak, e.g., TTS “You reached 7 days!”

