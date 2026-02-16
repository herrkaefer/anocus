---
title: "Use home assistant to motivate my kid to brush teeth"
date: "2025-10-22"
year: "2025"
summary: "A simple yet delightful Home Assistant automation that helps kids build the brushing habit — with Spotify music, voice encouragement, and streak tracking."
tags: ["home assistant", "automation", "smart home", "parenting", "iot"]
categories: ["projects"]
draft: false
---

I hope you're not in the same boat, but getting my kids to brush their teeth consistently can be a daily struggle. After an unpleasant incident this morning, I decided to add some fun to the routine using Home Assistant, hoping my daughter would stay motivated (at least for a while😆).

With this setup, I wanted the teeth brushing events to be automatically detected, announced by the Google speaker, accompanied by a two-minute song playing, and recorded in Home Assistant.


## Plan

As she is using a plain electric tooth brush without bluetooth or app connection, there's no direct way to get the teeth brushing data. I was thinking to put a NFC stick on the brush or somewhere, but it doesn't sound good because it relies on a phone touch to trigger.

![](/assets/images/aqara_zigbee_button.jpg)

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
  - choose:
      - conditions:
          - condition: template
            value_template: "{{ states('counter.teeth_brushing_counter') | int == 1 }}"
        sequence:
          - data:
              cache: false
              entity_id: "{{ speaker }}"
              message: >
                Great job starting your day with brushing! You’re on a {{
                states('counter.teeth_brushing_streak') | int }}-day streak.
                Keep it up, and you’ll make it even longer tonight!
            action: tts.google_translate_say
      - conditions:
          - condition: template
            value_template: "{{ states('counter.teeth_brushing_counter') | int == 2 }}"
        sequence:
          - target:
              entity_id: counter.teeth_brushing_streak
            action: counter.increment
          - data:
              cache: false
              entity_id: "{{ speaker }}"
              message: >
                Fantastic! You’ve brushed twice today and kept your streak
                going! That’s now {{ states('counter.teeth_brushing_streak') |
                int }} days in a row! Awesome job, keep shining!
            action: tts.google_translate_say
      - conditions:
          - condition: template
            value_template: "{{ states('counter.teeth_brushing_counter') | int > 2 }}"
        sequence:
          - data:
              cache: true
              entity_id: "{{ speaker }}"
              message: >
                Wow, you’re really into brushing today! Keep those teeth
                sparkling clean!
            action: tts.google_translate_say
variables:
  speaker: media_player.mira_room_speaker
  volume_level: |
    {% set now_time = now().strftime('%H:%M') %} {% if now_time < '21:15' %}
      0.47
    {% else %}
      0.12
    {% endif %}
  playlist_uri: spotify:playlist:3lacrdXRalnL5FJrzb4UcS
mode: single
```


### 2. Midnight Helpers Update

At midnight, another automation checks whether (>= 2) brushing happened that day, and update the counter and streak.

```yaml
alias: Update Teeth Brush Helpers at Midnight
description: Reset daily counter and streak
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
            value_template: "{{ not brushed_today }}"
        sequence:
          - target:
              entity_id: "{{ streak_counter }}"
            action: counter.reset
  - target:
      entity_id: "{{ daily_counter }}"
    action: counter.reset
mode: single
variables:
  daily_counter: counter.teeth_brushing_counter
  streak_counter: counter.teeth_brushing_streak

```

## Stream emoji evolution on dashboard!

![](/assets/images/ha_teeth_brushing_chip.gif)

🥚 → 🐣 → 🐥 → 🐓 → 🦅 → 🐦‍🔥 → 🐉

Make it a bit more fun by adding some emoji evolution on home assistant dashboard. Each emoji evolves every 7 days to another level. This little trick has been working very well for my daughter to keep her motivated. Actually this idea was suggested by my daughter herself, and she always wants to take a look at the dashboard to see how the emojis are evolving after brushing.

A single Mushroom Template Chip shows both today’s brushing and the running streak.
The number of 🪥 icons corresponds to the daily brushing count, and the streak is visualized with fire emojis.

```yaml
type: custom:mushroom-chips-card
chips:
  - type: template
    entity: counter.teeth_brushing_counter
    icon: mdi:toothbrush-electric
    icon_color: blue
    content: >
      {% set count = states('counter.teeth_brushing_counter') | int %} {% set
      streak = states('counter.teeth_brushing_streak') | int %} {% set brushes =
      '🪥' * count if count > 0 else '0' %}

      {% set stage = streak // 7 %} {% set rem = streak % 7 %}

      {% set evolutions = ['🐣', '🐥', '🐓', '🦅', '🐦‍🔥'] %}

      {% if stage == 0 %}
        {% set evo = '' %}
      {% elif stage <= evolutions | length %}
        {% set evo = evolutions[:stage] | reverse | join('') %}
      {% else %}
        {% set dragons = '🐉' * (stage - (evolutions | length)) %}
        {% set evo = dragons + (evolutions | reverse | join('')) %}
      {% endif %}

      {% set eggs = '🥚' * rem %} {% set final = evo + eggs if streak > 0 else
      '0' %}

      Today:{{ brushes }} Streak:{{ final }}
    tap_action:
      action: more-info
```

## What are good to add later

- Let brushing ends by manually pressing the button again, if cheating is noticed. -- So far not needed.
- Add a small battery-powered display near the sink to show streaks. Physical visialization would be more powerful feedback for the kid.
