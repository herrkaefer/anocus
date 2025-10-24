---
title: "Use Home Assistant to Motivate My Kid to Brush Teeth"
date: 2025-10-22
summary: "A simple yet delightful Home Assistant automation that helps kids build the brushing habit — with Spotify music, voice encouragement, and streak tracking."
tags: ["home assistant", "automation", "smart home", "parenting", "iot"]
categories: ["projects"]
draft: false
---

I hope you're not in the same boat, but getting my kids to brush their teeth consistently can be a daily struggle. After an unpleasant incident this morning, I decided to add some fun to the routine using Home Assistant, hoping my daughter would stay motivated (at least for a while😆).

With this setup, I wanted the teeth brushing events to be automatically detected, announced by the Google speaker, accompanied by a two-minute song playing, and recorded in Home Assistant.


## Plan

As she is using a plain electric tooth brush without bluetooth or app connection, there's no direct way to get the teeth brushing data. I was thinking to put a NFC stick on the brush or somewhere, but it doesn't sound good because it relies on a phone touch to trigger.

So I removed a Zigbee button from the frontdoor (which was set to press before leaving home but rearly used) and stick it on the mirror in the bathroom. The kid can press it to start the brushing automation.

Here's a random [link](https://www.aliexpress.us/item/3256807114382706.html?src=google&pdp_npi=4%40dis%21USD%213.77%211.80%21%21%21%21%21%40%2112000040119318979%21ppc%21%21%21&snps=y&snpsid=1&retailTag=FullHosting&traffic_server_nav=true&src=google&albch=shopping&acnt=742-864-1166&isdl=y&slnk=&plac=&mtctp=&albbt=Google_7_shopping&aff_platform=google&aff_short_key=_oDeeeiG&gclsrc=aw.ds&albagn=888888&ds_e_adid=&ds_e_matchtype=&ds_e_device=c&ds_e_network=x&ds_e_product_group_id=&ds_e_product_id=en3256807114382706&ds_e_product_merchant_id=5551326180&ds_e_product_country=US&ds_e_product_language=en&ds_e_product_channel=online&ds_e_product_store_id=&ds_url_v=2&albcp=22443129574&albag=&isSmbAutoCall=false&needSmbHouyi=false&gad_source=1&gad_campaignid=22443130765&gbraid=0AAAAA99aYpftxnhsLS2pTK4hLOZGvTVVp&gclid=CjwKCAjwpOfHBhAxEiwAm1SwEtC6H4IjjDXT70tgqs2g1zohu5so1e_Rkv-3MO4OuYV4EDTEXdxtOxoC8psQAvD_BwE&gatewayAdapt=glo2usa) of the button on AliExpress.

Components that are needed for this flow:

- A working Home Assistant
- A Aqara Zigbee Button
- Google Speaker (or any speaker that can be controled by home assistant) for voice & music
- `Spotify` and `Spotcast` integrations for 2-minute brushing songs


## Helpers

Create a few helper entities in Home Assistant:

  - `input_datetime.teeth_brushing_start` and `end` (single brushing recording)
  - `counter.teeth_brushing_counter` (daily count)
  - `counter.teeth_brush_streak` (streak days)

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

