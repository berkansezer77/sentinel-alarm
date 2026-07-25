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

## What is it?

Sentinel Alarm turns Home Assistant into a proper alarm panel. You define everything
in a dedicated sidebar panel — zones, modes, actions, schedules — and Home Assistant
runs it. The philosophy is simple: **the panel is where things are defined, Home
Assistant is the engine that runs them.**

It gives you a real `alarm_control_panel` entity, a Lovelace card, and a settings UI
that covers everything from entry delays to holiday light simulation.

## Features

### Zones & sensors
- Assign any binary sensor, lock, cover or door/window contact to a zone
- Sensors are grouped **by room**, using Home Assistant's own areas (with a manual override per sensor — never guessed from the entity name)
- **Presence confirmation**: require a presence sensor to stay active for *N* seconds **and** be confirmed by motion in the same room before it counts as an intrusion — kills false alarms from flaky mmWave sensors
- Per-sensor rules: instant, entry-delayed, or ignored per mode

### Modes
- `Home`, `Away`, `Sleep`, `Vacation` — each with its own sensor set, entry/exit delays and action list
- Copy an entire action list from one mode to another in one click

### Actions
A visual step editor for what happens on **trigger**, during **arming**, on **entry
delay**, on **arm** and on **disarm** — separately for each mode.

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

### Night lights (Sleep mode)
A draggable timeline that keeps chosen lights on overnight at a set brightness and
colour, from sunset to sunrise, then restores them to full brightness on disarm.

### Vacation simulation
A human-looking light schedule generated between sunset and sunrise — draggable on a
timeline, with per-block duplicate and delete, so it never looks like a timer.

### Activity log
"What actually ran" — a timeline of every armed / triggered / disarmed event with
every action step underneath it, and why each one ran or was skipped.

### Backup
Export your whole configuration to a file and import it back.

### Lovelace card
A two-faced card: a calm everyday face, and an alarm face when something trips.
The card resource registers itself — nothing to add manually.

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

## Adding the card

The card is registered as a Lovelace resource automatically. Add it to a dashboard:

```yaml
type: custom:sentinel-alarm-card
entity: alarm_control_panel.sentinel
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
