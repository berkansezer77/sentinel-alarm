<p align="center">
  <img src="brand/icon.png" width="120" alt="Sentinel Alarm">
</p>

<h1 align="center">Sentinel Alarm</h1>

<p align="center">
  A full alarm system for Home Assistant — with its own panel.<br>
  No YAML, no helper juggling, no automation spaghetti.
</p>

<p align="center">
  <a href="https://github.com/hacs/integration"><img src="https://img.shields.io/badge/HACS-Custom-41BDF5.svg" alt="HACS"></a>
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/Home%20Assistant-2024.11%2B-41BDF5.svg" alt="HA version">
</p>

---

<p align="center">
  <img src="https://raw.githubusercontent.com/berkansezer77/sentinel-alarm/main/docs/images/card.gif" alt="The Sentinel card" width="880">
</p>

<p align="center">
  <sub>The card: room movement over the last six hours, the alarm's own history along the bottom,<br>
  and a glow that travels the edge — green while disarmed, red while armed.</sub>
</p>

## What is it?

Sentinel Alarm turns Home Assistant into a proper alarm panel. You define everything
in a dedicated sidebar panel — zones, modes, actions, schedules — and Home Assistant
runs it. The philosophy is simple: **the panel is where things are defined, Home
Assistant is the engine that runs them.**

It gives you a real `alarm_control_panel` entity, a Lovelace card, and a settings UI
that covers everything from entry delays to holiday light simulation.

<p align="center">
  <img src="https://raw.githubusercontent.com/berkansezer77/sentinel-alarm/main/docs/images/status.png" alt="Sentinel status page">
</p>

## Features

### Zones & sensors
- Assign any binary sensor, lock, cover or door/window contact to a zone
- Sensors are grouped **by room**, using Home Assistant's own areas (with a manual override per sensor — never guessed from the entity name)
- **Presence confirmation**: require a presence sensor to stay active for *N* seconds **and** be confirmed by motion in the same room before it counts as an intrusion — kills false alarms from flaky mmWave sensors
- Per-sensor rules: instant, entry-delayed, or ignored per mode

<img src="https://raw.githubusercontent.com/berkansezer77/sentinel-alarm/main/docs/images/zones.png" alt="Alarm zones, grouped by room">

Each sensor then gets its own tuning — how long it must stay active before it counts,
whether a second sensor has to agree, whether it starts the entry delay:

<img src="https://raw.githubusercontent.com/berkansezer77/sentinel-alarm/main/docs/images/sensors.png" alt="Per-sensor tuning">

### Modes
- `Home`, `Away`, `Sleep`, `Vacation` — each with its own sensor set, entry/exit delays and action list
- Copy an entire action list from one mode to another in one click

<img src="https://raw.githubusercontent.com/berkansezer77/sentinel-alarm/main/docs/images/modes.png" alt="Modes">

### Actions
A visual step editor for what happens on **trigger**, during **arming**, on **entry
delay**, on **arm** and on **disarm** — separately for each mode.

<img src="https://raw.githubusercontent.com/berkansezer77/sentinel-alarm/main/docs/images/actions.png" alt="Action step editor">

Steps run in order, or side by side — each one shows how long it takes, and the list
tells you the total. Run any single step, or the whole chain, without arming anything.

Available step types:
- **Notification** — Home Assistant Companion or Telegram, with explicit bot/chat selection, camera snapshot attachment, and Disarm / Silence buttons inside the push
- **Announcement (TTS)** — any TTS engine, any speaker, with per-step volume boost and restore, and an optional time window (e.g. only between 08:00 and 23:00)
- **Beep** — built-in arming countdown and disarm chime sounds
- **Siren**
- **Lights** — flash, set colour, dim, with configurable delay between lights
- **Device on/off** — climate, media players, anything, without writing a script
- **Script / scene / service call**
- **Wait**

### Own AI voice (bring your own key)
Optional OpenAI and Gemini TTS, registered as **real Home Assistant TTS entities**.
You enter your own API key in the panel — no dependency on any other integration
being installed. Voice selection dropdowns everywhere a voice can be chosen.

### Automatic
- **Clock schedules** — arm/disarm at fixed times
- **Person-based** — arm when everyone leaves, disarm when someone arrives, with photo cards for each person
- **Entity triggers** — arm or disarm from any entity's state (states are read from Home Assistant automatically, and can be typed manually)
- **Lights off when armed** — sweep the house dark on arming, automatically skipping the night lights

<img src="https://raw.githubusercontent.com/berkansezer77/sentinel-alarm/main/docs/images/automatic.png" alt="Automatic arming">

### Night lights (Sleep mode)
A draggable timeline that keeps chosen lights on overnight at a set brightness and
colour, from sunset to sunrise, then restores them to full brightness on disarm.

<img src="https://raw.githubusercontent.com/berkansezer77/sentinel-alarm/main/docs/images/night-lights.png" alt="Night lights">

### Vacation simulation
A human-looking light schedule generated between sunset and sunrise — draggable on a
timeline, with per-block duplicate and delete, so it never looks like a timer.

<img src="https://raw.githubusercontent.com/berkansezer77/sentinel-alarm/main/docs/images/vacation.png" alt="Vacation simulation">

### Activity log
"What actually ran" — a timeline of every armed / triggered / disarmed event with
every action step underneath it, and why each one ran or was skipped.

### Backup
Export your whole configuration to a file and import it back.

### Lovelace card
- **Room movement timeline** — one lane per room over the last six hours, a tick per
  movement; the rooms that are active right now are picked out
- **Twelve-hour strip** — when the alarm was armed, and when it went off
- **Hold to arm** — nothing arms on a stray tap; with a code set, holding to disarm
  opens a keypad
- **Collapsible** — folds down to a single strip, and remembers your choice
- **A glow that travels the edge** — green while disarmed, red while armed, faster
  while the alarm is going off
- **Your own background image** — drop one on the panel's settings

The card registers itself as a Lovelace resource — nothing to add by hand.

## Installation

### HACS (recommended)

1. HACS → **Integrations** → ⋮ → **Custom repositories**
2. Add `https://github.com/berkansezer77/sentinel-alarm` as category **Integration**
3. Install **Sentinel Alarm**
4. Restart Home Assistant
5. **Settings → Devices & Services → Add Integration → Sentinel Alarm**

### Manual

1. Copy `custom_components/sentinel_alarm` into your Home Assistant `config/custom_components/` folder
2. Restart Home Assistant
3. **Settings → Devices & Services → Add Integration → Sentinel Alarm**

After setup, **Sentinel** appears in the sidebar. Everything is configured there.

## Documentation

Full user guide in the **[wiki](https://github.com/berkansezer77/sentinel-alarm/wiki)** —
every page of the panel explained, with worked examples:

[Installation](https://github.com/berkansezer77/sentinel-alarm/wiki/Installation) ·
[Zones and Sensors](https://github.com/berkansezer77/sentinel-alarm/wiki/Zones-and-Sensors) ·
[Modes](https://github.com/berkansezer77/sentinel-alarm/wiki/Modes) ·
[Actions](https://github.com/berkansezer77/sentinel-alarm/wiki/Actions) ·
[Automatic](https://github.com/berkansezer77/sentinel-alarm/wiki/Automatic) ·
[Night Lights](https://github.com/berkansezer77/sentinel-alarm/wiki/Night-Lights) ·
[Vacation](https://github.com/berkansezer77/sentinel-alarm/wiki/Vacation-Simulation) ·
[Recipes](https://github.com/berkansezer77/sentinel-alarm/wiki/Recipes) ·
[Troubleshooting](https://github.com/berkansezer77/sentinel-alarm/wiki/Troubleshooting)

## Adding the card

The card is registered as a Lovelace resource automatically. Add it to a dashboard:

```yaml
type: custom:sentinel-alarm-card
entity: alarm_control_panel.sentinel_alarm
```

## Requirements

- Home Assistant 2024.11 or newer
- No cloud account, no external service — everything runs locally
  (except the optional OpenAI / Gemini voices, which use your own key)

## Contributing

Issues and pull requests are welcome at
[github.com/berkansezer77/sentinel-alarm/issues](https://github.com/berkansezer77/sentinel-alarm/issues).

## License

[MIT](LICENSE) © Berkan Sezer
