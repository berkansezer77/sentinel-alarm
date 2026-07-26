"""Sentinel Alarm — shared runtime: config, event log, notifications, TTS, presence simulation.

The panel is where things are *defined*; this module is what actually *runs*.
No cloud dependency: everything happens inside Home Assistant. The optional AI
token is only used to render nicer TTS phrasing and is never required.
"""
from __future__ import annotations

import aiohttp
import asyncio
import base64
import copy
import functools
import hashlib
import io
import logging
import os
import random
import secrets
import struct
import wave
from datetime import datetime, timedelta

from homeassistant.core import Context, HomeAssistant, callback
from homeassistant.helpers import aiohttp_client
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import (
    async_call_later,
    async_track_state_change_event,
    async_track_time_interval,
)
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util
from homeassistant.util import slugify

from .const import (
    ACTION_DISARM,
    ACTION_IGNORE,
    DEFAULT_CONFIG,
    DOMAIN,
    MAX_EVENTS,
    MODES,
    SIGNAL_EVENT,
    STORE_VERSION,
)

_LOGGER = logging.getLogger(__name__)

EVENTS_STORE_KEY = "sentinel_alarm_events"
BACKUPS_STORE_KEY = "sentinel_alarm_backups"

# Every save parks the previous configuration here, so a bad edit — or a bad
# script — can always be undone.
MAX_BACKUPS = 20
MAX_RUNS = 25          # eylem günlüğünde kaç çalışma tutulur
MAX_SNAPSHOTS = 30     # www/sentinel'de tutulan kamera fotoğrafı sayısı

# How long one `flash: long` blinks for. Zigbee/Hue "long alert" is ~15 s, and
# it snaps the light back to its pre-alert colour when it ends.
ALERT_SECONDS = 15.0

# Bilingual message templates. {n} is filled with a device name / list.
MSG = {
    "blocked": {
        "en": "Alarm could not be armed. {n} open.",
        "tr": "Alarm kurulamadı. {n} açık.",
    },
    "exit_fault": {
        "en": "Alarm NOT armed — {n} still open when the exit delay ran out.",
        "tr": "Alarm KURULMADI — çıkış süresi bittiğinde {n} hâlâ açıktı.",
    },
    "triggered": {
        "en": "Alarm triggered! {n}",
        "tr": "Alarm tetiklendi! {n}",
    },
    "unavailable": {
        "en": "Warning: sensor {n} is unavailable while the alarm is armed.",
        "tr": "Uyarı: alarm kuruluyken {n} sensörü erişilemez durumda.",
    },
    "armed": {"en": "Alarm armed: {n}", "tr": "Alarm kuruldu: {n}"},
    "disarmed": {"en": "Alarm disarmed.", "tr": "Alarm devre dışı bırakıldı."},
    "entry": {
        "en": "Entry detected. Disarm within {n} seconds.",
        "tr": "Giriş algılandı. {n} saniye içinde alarmı kapatın.",
    },
    "unconfirmed": {
        "en": "{n} tripped but was not confirmed — ignored.",
        "tr": "{n} algıladı ama doğrulanmadı — yok sayıldı.",
    },
    "auto_sched": {"en": "Armed automatically (schedule).",
                   "tr": "Otomatik kuruldu (saat programı)."},
    "auto_leave": {"en": "Everyone left — armed automatically.",
                   "tr": "Herkes evden çıktı — otomatik kuruldu."},
    "auto_arrive": {"en": "Somebody came home — disarmed automatically.",
                    "tr": "Biri eve geldi — otomatik kapatıldı."},
    "auto_push": {"en": "Disarmed from the notification.",
                  "tr": "Bildirimden kapatıldı."},
    "auto_entity": {"en": "{d} changed — alarm set automatically.",
                    "tr": "{d} değişti — alarm otomatik ayarlandı."},
    "lights_swept": {"en": "{n} lights switched off on arming.",
                     "tr": "Kurulurken {n} ışık kapatıldı."},
    "light_off": {
        "en": "{n} was switched on while armed and has been turned off.",
        "tr": "Alarm kuruluyken {n} açıldı ve kapatıldı.",
    },
    "wrong_code": {
        "en": "Wrong disarm code entered {n} times.",
        "tr": "Alarm kodu {n} kez yanlış girildi.",
    },
}

MODE_NAME = {
    "home": {"en": "Home", "tr": "Evde"},
    "away": {"en": "Away", "tr": "Dışarıda"},
    "night": {"en": "Sleep", "tr": "Uyku"},
    "vacation": {"en": "Vacation", "tr": "Tatil"},
}

# Sentinel'in KENDİ AI TTS'i — HA entegrasyonuna gerek yok, kullanıcının
# Settings'e girdiği anahtarla doğrudan sağlayıcıya gider. Engine değeri
# "openai:<voice>" ya da "gemini:<voice>" olarak taşınır.
OPENAI_TTS_MODEL = "gpt-4o-mini-tts"
OPENAI_VOICES = ["alloy", "ash", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer"]
GEMINI_TTS_MODEL = "gemini-2.5-flash-preview-tts"
GEMINI_VOICES = ["Kore", "Puck", "Charon", "Zephyr", "Aoede", "Fenrir", "Leda", "Orus"]


def _deep_default(cfg: dict) -> dict:
    """Fill any missing key with its default so old configs keep working."""
    out = copy.deepcopy(DEFAULT_CONFIG)
    if not isinstance(cfg, dict):
        return out
    for key, val in cfg.items():
        if isinstance(val, dict) and isinstance(out.get(key), dict):
            merged = copy.deepcopy(out[key])
            merged.update(val)
            out[key] = merged
        else:
            out[key] = val
    for mode in MODES:
        out.setdefault("modes", {}).setdefault(mode, dict(DEFAULT_CONFIG["modes"][mode]))
        out.setdefault("assign", {}).setdefault(mode, [])
    return out


class SentinelEngine:
    """Holds configuration + shared services for the alarm panel entity."""

    def __init__(self, hass: HomeAssistant, store: Store) -> None:
        self.hass = hass
        self.store = store
        self.events_store = Store(hass, STORE_VERSION, EVENTS_STORE_KEY)
        self.backups_store = Store(hass, STORE_VERSION, BACKUPS_STORE_KEY)
        self.config: dict = copy.deepcopy(DEFAULT_CONFIG)
        self.events: list[dict] = []
        self.backups: list[dict] = []
        self.entity = None  # set by the alarm_control_panel platform
        self._sim_unsub = None
        self._sim_state: dict[str, bool] = {}
        self._sim_offsets: dict[str, int] = {}
        self._sim_day: str = ""
        self._action_task = None
        # Hangi ışıklar şu an flash'ta? Durdurulursa geri alabilmek için.
        self._flash_active: list[str] = []
        self._after_scene = ""
        self._action_eid = ""       # o an çalışan eylem zincirinin tetik bağlamı
        self._action_mode = ""
        self._trigger_flash_lights: list[str] = []
        self._trigger_flash_after = "keep"
        self._trigger_flash_scene = ""
        # Canlı ilerleme ve son çalışmanın gerçek süreleri (panel gösterir).
        self.progress: dict = {"running": False}
        self.last_run: dict = {}
        self.runs: list[dict] = []      # eylem günlüğü (son çalışmalar)
        # Panelden elle çalıştırılan zincirin sahibi — serbest `service`
        # adımı onun adına çağrılsın ki HA'nın izin kontrolü devreye girsin.
        self._step_ctx: Context | None = None
        # Otomatik kurulum + geri sayım bipleri
        self._auto_unsubs: list = []
        self._leave_timer = None
        self._beep_task = None
        self._beep_hold = 0          # >0 iken bipler susar (anons konuşuyor)
        self._night_unsub = None     # gece ışıkları döngüsü
        self._night_on = False
        self._sched_fired: set = set()

    # ------------------------------------------------------------------ config
    async def async_load(self) -> None:
        raw = await self.store.async_load()
        self.config = _deep_default(raw or {})
        stored = await self.events_store.async_load()
        if isinstance(stored, dict) and isinstance(stored.get("events"), list):
            self.events = stored["events"][:MAX_EVENTS]
        kept = await self.backups_store.async_load()
        if isinstance(kept, dict) and isinstance(kept.get("backups"), list):
            self.backups = kept["backups"][:MAX_BACKUPS]

    async def async_save(self, cfg: dict) -> None:
        new = _deep_default(cfg)
        if self.config and new != self.config:
            self.backups.insert(0, {
                "ts": dt_util.now().isoformat(timespec="seconds"),
                "config": copy.deepcopy(self.config),
            })
            del self.backups[MAX_BACKUPS:]
            await self.backups_store.async_save({"backups": self.backups})
        self.config = new
        await self.store.async_save(self.config)

    def backup_list(self) -> list[dict]:
        """Short description of each saved version, for the undo list."""
        out = []
        for i, b in enumerate(self.backups):
            cfg = b.get("config") or {}
            assign = cfg.get("assign") or {}
            actions = cfg.get("actions") or {}
            out.append({
                "index": i,
                "ts": b.get("ts", ""),
                "zones": sum(len(v or []) for v in assign.values()),
                "steps": sum(len(v or []) for v in actions.values()),
                "sensors": len(cfg.get("sensors") or {}),
            })
        return out

    async def async_restore_backup(self, index: int) -> bool:
        if index < 0 or index >= len(self.backups):
            return False
        wanted = copy.deepcopy(self.backups[index].get("config") or {})
        await self.async_save(wanted)   # current state is itself backed up first
        return True

    @property
    def lang(self) -> str:
        return "tr" if self.config.get("lang") == "tr" else "en"

    def msg(self, key: str, n: str = "") -> str:
        tpl = MSG.get(key, {}).get(self.lang, "")
        return tpl.replace("{n}", str(n))

    def mode_name(self, mode: str) -> str:
        return MODE_NAME.get(mode, {}).get(self.lang, mode)

    # ------------------------------------------------------------------- names
    def name_of(self, eid: str) -> str:
        st = self.hass.states.get(eid)
        if st and st.attributes.get("friendly_name"):
            return st.attributes["friendly_name"]
        return eid

    # ------------------------------------------------------------------ events
    @callback
    def log(self, kind: str, text: str, mode: str = "", eid: str = "") -> None:
        """Append an entry to the panel's event log."""
        self.events.insert(
            0,
            {
                "ts": dt_util.now().isoformat(timespec="seconds"),
                "kind": kind,
                "text": text,
                "mode": mode,
                "entity": eid,
            },
        )
        del self.events[MAX_EVENTS:]
        self.hass.async_create_task(
            self.events_store.async_save({"events": self.events})
        )
        async_dispatcher_send(self.hass, SIGNAL_EVENT)

    # ------------------------------------------------------------------ sensors
    def sensors_for(self, mode: str) -> list[str]:
        """Entities that guard the given mode (vacation reuses the away set)."""
        assign = self.config.get("assign", {})
        eids = list(assign.get(mode) or [])
        if mode == "vacation":
            if not eids:
                eids = list(assign.get("away") or [])
            bypass = set(self.config.get("vacation_cfg", {}).get("bypass") or [])
            eids = [e for e in eids if e not in bypass]
        # de-dupe, keep order
        seen, out = set(), []
        for eid in eids:
            if eid not in seen:
                seen.add(eid)
                out.append(eid)
        return out

    def sensor_cfg(self, eid: str) -> dict:
        cfg = self.config.get("sensors", {}).get(eid) or {}
        confirm = cfg.get("confirm") or ""
        # "room" is a convenience token meaning "any motion sensor in this
        # sensor's own area" — resolved lazily so it survives room renames.
        return {
            "delay": int(cfg.get("delay") or 0),
            "unavail": bool(cfg.get("unavail", True)),
            "entry": bool(cfg.get("entry", False)),
            "confirm": str(confirm),
            "confirm_window": int(cfg.get("confirm_window") or 15),
            # Panelde elle atanan oda (HA'da area yoksa). area_id tutar.
            "area": str(cfg.get("area") or ""),
        }

    def confirmers_for(self, eid: str) -> list[str]:
        """Entities that must agree before `eid` counts as a real trip.

        A concrete entity_id is used as-is. The token "room" expands to every
        motion sensor sharing this sensor's area (minus the sensor itself), so a
        presence sensor can be gated on "motion anywhere in my own room".
        """
        confirm = self.sensor_cfg(eid)["confirm"]
        if not confirm:
            return []
        if confirm != "room":
            return [confirm]
        area = self.area_of(eid)
        if not area:
            return []
        out = []
        for other in self.hass.states.async_entity_ids("binary_sensor"):
            if other == eid or self.area_of(other) != area:
                continue
            st = self.hass.states.get(other)
            if st and st.attributes.get("device_class") == "motion":
                out.append(other)
        return out

    def is_active(self, eid: str, state: str | None = None) -> bool:
        """Is this entity in the state the alarm treats as 'tripped'?

        Any entity can guard the alarm — a contact, a motion sensor, but also a
        cover, a lock or a plug. Each domain has its own idea of "open".
        """
        if state is None:
            st = self.hass.states.get(eid)
            if st is None:
                return False
            state = st.state
        domain = eid.split(".")[0]
        if domain == "cover":
            return state in ("open", "opening")
        if domain == "lock":
            return state in ("unlocked", "unlocking", "open")
        return state == "on"

    def supports_flash(self, eid: str) -> bool:
        """Can the light blink on its own?

        `LightEntityFeature.FLASH` (bit 8) is Home Assistant's own capability
        flag — Hue, LIFX, ZHA, Zigbee2MQTT and friends all report it. When a
        light has it we hand the blinking over: one command and the bulb (or its
        bridge) does the rest locally, instead of us pushing two commands per
        cycle and drowning the bridge.
        """
        st = self.hass.states.get(eid)
        if st is None:
            return False
        return bool((st.attributes.get("supported_features") or 0) & 8)

    def can_dim(self, eid: str) -> bool:
        """Can this light be dimmed instead of power-cycled?

        A light whose only colour mode is `onoff` is a relay or a plain switch
        behind a bulb — dimming is impossible, so it must never be strobed.
        """
        st = self.hass.states.get(eid)
        if st is None:
            return False
        modes = st.attributes.get("supported_color_modes") or []
        return any(m not in ("onoff", "unknown") for m in modes)

    def is_contact(self, eid: str) -> bool:
        """Does an open state here mean 'you cannot arm yet'?

        Motion or presence firing while you walk out is normal; a door, window,
        cover or unlocked lock left open is not.
        """
        domain = eid.split(".")[0]
        if domain in ("cover", "lock"):
            return True
        st = self.hass.states.get(eid)
        dc = st.attributes.get("device_class") if st else None
        return dc in ("door", "window", "opening", "garage_door")

    def blocked_sensors(self, mode: str) -> list[str]:
        """Contact-type entities that are currently open — these block arming."""
        return [
            eid
            for eid in self.sensors_for(mode)
            if self.is_contact(eid) and self.is_active(eid)
        ]

    def timings(self, mode: str) -> dict:
        base = dict(DEFAULT_CONFIG["modes"].get(mode, {"exit": 0, "entry": 45, "trigger": 180}))
        base.update(self.config.get("modes", {}).get(mode) or {})
        return {
            "exit": max(0, int(base.get("exit") or 0)),
            "entry": max(0, int(base.get("entry") or 0)),
            "trigger": max(5, int(base.get("trigger") or 180)),
        }

    # -------------------------------------------------------------------- rooms
    def area_of(self, eid: str) -> str | None:
        """Which area is this entity in? Panel override, then its own/device's,
        then a best-effort guess from the entity name."""
        # 1. Panelde elle atanmış oda (HA'da area yoksa buradan verilir).
        override = (self.config.get("sensors", {}).get(eid) or {}).get("area")
        if override:
            return override
        try:
            from homeassistant.helpers import (
                area_registry as ar,  # noqa: F401 (imported for side-effect clarity)
                device_registry as dr,
                entity_registry as er,
            )
        except Exception:  # noqa: BLE001
            return None
        reg = er.async_get(self.hass)
        ent = reg.async_get(eid)
        if ent is not None:
            if ent.area_id:
                return ent.area_id
            if ent.device_id:
                dev = dr.async_get(self.hass).async_get(ent.device_id)
                if dev and dev.area_id:
                    return dev.area_id
        # HA'da oda yoksa isimden TAHMİN ETME — kullanıcı panelden atar.
        return None

    def area_name(self, area_id: str | None) -> str:
        if not area_id:
            return ""
        try:
            from homeassistant.helpers import area_registry as ar
        except Exception:  # noqa: BLE001
            return ""
        area = ar.async_get(self.hass).async_get_area(area_id)
        return area.name if area else ""

    def cameras_in_area(self, area_id: str | None) -> list[str]:
        if not area_id:
            return []
        out = []
        for eid in self.hass.states.async_entity_ids("camera"):
            if self.area_of(eid) == area_id:
                out.append(eid)
        return out

    def room_sensors(self) -> dict:
        """Room name -> [entity_id, …] for every assigned sensor (all modes).
        Stable mapping (changes only on config edit); the Lovelace card reads it
        once and computes live activity from current states itself."""
        assigned = set()
        for m in MODES:
            for eid in self.config.get("assign", {}).get(m) or []:
                assigned.add(eid)
        other = "Diğer" if self.lang == "tr" else "Other"
        out: dict[str, list] = {}
        for eid in assigned:
            name = self.area_name(self.area_of(eid)) or other
            out.setdefault(name, []).append(eid)
        return dict(sorted(out.items(), key=lambda kv: kv[0].lower()))

    def recent_events(self, n: int = 4) -> list[dict]:
        """Last few log entries for the card's mini event feed (newest first)."""
        out = []
        for e in self.events[:n]:
            out.append({
                "kind": e.get("kind", ""),
                "text": e.get("text", ""),
                "ts": e.get("ts", ""),
            })
        return out

    def trigger_camera(self, eid: str | None) -> str:
        """A camera entity_id to show on the card when triggered (room first)."""
        cams = self.cameras_for_trigger(eid)
        return cams[0] if cams else ""

    def cameras_for_trigger(self, eid: str | None) -> list[str]:
        """Room camera if the triggering sensor's area has one; else the list."""
        cfg = self.config.get("notify_msg") or {}
        fallback = [c for c in (self.config.get("cameras") or []) if c]
        if not (eid and cfg.get("room_camera", True)):
            return fallback
        cams = self.cameras_in_area(self.area_of(eid))
        return cams or fallback

    def build_alert(self, eid: str | None, mode: str, cfg: dict | None = None) -> str:
        """Assemble a notification from the chosen pieces.

        `cfg` is a notify_msg-shaped dict (format/custom/include). When omitted
        the global settings are used; a notification step passes its own.
        """
        if cfg is None:
            cfg = self.config.get("notify_msg") or {}
        inc = cfg.get("include") or {}
        lang = self.lang
        room = self.area_name(self.area_of(eid)) if eid else ""
        sensor = self.name_of(eid) if eid else (self._trigger_or(""))
        now = dt_util.now().strftime("%H:%M")

        fmt = cfg.get("format") or "alert"
        if fmt == "custom" and (cfg.get("custom") or "").strip():
            return (cfg["custom"]
                    .replace("{room}", room or "—").replace("{oda}", room or "—")
                    .replace("{sensor}", sensor or "—")
                    .replace("{time}", now).replace("{saat}", now)
                    .replace("{mode}", self.mode_name(mode)))

        head = {
            "short": {"en": "🚨 Alarm!", "tr": "🚨 Alarm!"},
            "alert": {"en": "🚨 SECURITY BREACH", "tr": "🚨 GÜVENLİK İHLALİ"},
            "calm":  {"en": "Movement detected at home", "tr": "Evinde hareket algılandı"},
        }.get(fmt, {"en": "🚨 Alarm!", "tr": "🚨 Alarm!"})[lang]

        bits: list[str] = []
        if inc.get("room", True) and room:
            bits.append(room)
        if inc.get("sensor", True) and sensor:
            bits.append(sensor)
        if inc.get("time", True):
            bits.append(now)
        if inc.get("mode", False):
            bits.append(self.mode_name(mode))
        if inc.get("open", False):
            names = [self.name_of(e) for e in self.blocked_sensors(mode)]
            if names:
                lbl = "açık" if lang == "tr" else "open"
                bits.append(f"{', '.join(names[:3])} {lbl}")

        return f"{head} · {' · '.join(bits)}" if bits else head

    def _trigger_or(self, default: str) -> str:
        ent = self.entity
        src = getattr(ent, "_trigger_source", "") if ent else ""
        return src or default

    # ------------------------------------------------------------- notification
    async def async_notify(self, message: str, title: str | None = None,
                           with_camera: bool = False, critical: bool = False,
                           cameras: list[str] | None = None,
                           targets: list[str] | None = None,
                           tg_chat: str | None = None,
                           tg_entity: str | None = None) -> None:
        """Push a notification to every device.

        `cameras` overrides the snapshot source (the room's own camera).
        `targets` overrides which notify services receive it (a step's choice).
        The payload is shaped per service — Telegram wants a `photo` block,
        the companion app wants `image`/`attachment`; sending one to the other
        drops the picture, which is why Telegram showed no image.
        """
        shots = await self.async_snapshots(cameras) if with_camera else []

        # A configured Telegram chat is authoritative FOR THE DEFAULT ALERT only
        # (targets is None): send it via telegram_bot no matter how the Settings
        # notify services are named. But when a step explicitly picks who to
        # notify (targets set — e.g. notify.mobile_app_xxx), honour THAT and
        # fall through to the per-target loop; otherwise the phone push the user
        # chose would be hijacked to Telegram.
        chat = str(self.config.get("telegram_chat") or "").strip()
        if chat and targets is None:
            tg: dict = {"parse_mode": "plain_text"}
            try:
                # `chat_id`, not `target` — the `target` parameter is deprecated
                # and stops working in HA 2026.9.
                tg["chat_id"] = [int(chat)]
            except ValueError:
                _LOGGER.warning("Sentinel: telegram_chat '%s' is not a number", chat)
            if shots:
                for s in shots:
                    await self._call("telegram_bot", "send_photo",
                                     dict(tg, file=s["path"], caption=message))
            else:
                await self._call("telegram_bot", "send_message", dict(tg, message=message))
            return

        # Adım açıkça bir Telegram hedefi seçtiyse foto+metin telegram_bot ile
        # GARANTİ oraya gider — servis adından tahmin yok.
        #  - tg_entity: bir telegram_bot notify entity'si → botu + chat'i birlikte
        #    seçer (`entity_id`). Birden çok bot/chat varken doğru yol budur.
        #  - tg_chat: ham chat_id ("settings" → Ayarlar'daki telegram_chat).
        want_entity = str(tg_entity or "").strip()
        want_tg = str(tg_chat or "").strip()
        if want_tg == "settings":
            want_tg = chat
        if want_entity or want_tg:
            tg_extra: dict = {"parse_mode": "plain_text"}
            if want_entity:
                tg_extra["entity_id"] = want_entity
            else:
                try:
                    tg_extra["chat_id"] = [int(want_tg)]
                except ValueError:
                    _LOGGER.warning("Sentinel: telegram chat '%s' is not a number", want_tg)
            if shots:
                for s in shots:
                    await self._call("telegram_bot", "send_photo",
                                     dict(tg_extra, file=s["path"], caption=message))
            else:
                await self._call("telegram_bot", "send_message",
                                 dict(tg_extra, message=message))

        tgts = [t for t in (targets if targets is not None
                            else self.config.get("notify") or []) if t]
        if not tgts:
            return

        for target in tgts:
            domain, _, service = target.partition(".")
            if not service:
                domain, service = "notify", target
            is_tg = "telegram" in target.lower()
            payload: dict = {"message": message}
            data: dict = {}

            if is_tg:
                # Telegram parses captions as Markdown by default and chokes on a
                # lone `_`, `*`, `·` etc. ("Can't parse entities…"), silently
                # dropping the whole message. `parse_mode: plain_text` sends the
                # text verbatim so any alarm message is safe. Use the purpose-
                # built telegram_bot services (the legacy notify+data.photo path
                # is deprecated and unreliable in current HA). chat_id hedefi
                # doğru gruba sabitler; yoksa botun varsayılan sohbetine gider.
                tg_extra: dict = {"parse_mode": "plain_text"}
                if chat:
                    try:
                        tg_extra["chat_id"] = [int(chat)]
                    except ValueError:
                        pass
                if shots:
                    for s in shots:
                        await self._call("telegram_bot", "send_photo",
                                         dict(tg_extra, file=s["path"], caption=message))
                else:
                    await self._call("telegram_bot", "send_message",
                                     dict(tg_extra, message=message))
                continue
            else:
                payload["title"] = title or "Sentinel Alarm"
                if critical and self.config.get("critical", True):
                    data["push"] = {"sound": {"name": "default", "critical": 1, "volume": 1.0}}
                    data["priority"] = "high"
                    data["ttl"] = 0
                    data["channel"] = "alarm_stream"
                # Bildirimden tek dokunuşla kapat — uygulamayı açmaya gerek yok.
                if critical and self.config.get("notify_actions", True):
                    tr = self.lang == "tr"
                    data["actions"] = [
                        {"action": ACTION_DISARM,
                         "title": "Kapat" if tr else "Disarm",
                         "destructive": True},
                        {"action": ACTION_IGNORE,
                         "title": "Sesi kes" if tr else "Silence"},
                    ]
                if shots:
                    data["image"] = shots[0]["url"]
                    data["attachment"] = {"url": shots[0]["url"], "content-type": "jpeg"}
                    if len(shots) > 1:
                        data["images"] = [s["url"] for s in shots]
            if data:
                payload["data"] = data
            try:
                await self.hass.services.async_call(domain, service, payload, blocking=False)
            except Exception as err:  # noqa: BLE001 - a bad target must not kill the alarm
                _LOGGER.warning("Sentinel: notify %s failed: %s", target, err)

    @staticmethod
    def _prune_snapshots(folder: str, keep: int = MAX_SNAPSHOTS) -> None:
        """En yeni `keep` fotoğrafı bırak, gerisini sil (senkron — executor'da)."""
        try:
            shots = [
                os.path.join(folder, f) for f in os.listdir(folder)
                if f.lower().endswith(".jpg")
            ]
            if len(shots) <= keep:
                return
            shots.sort(key=os.path.getmtime, reverse=True)
            for path in shots[keep:]:
                try:
                    os.remove(path)
                except OSError:
                    pass
        except Exception as err:  # noqa: BLE001 - temizlik alarmı engellemesin
            _LOGGER.debug("Sentinel: snapshot temizliği: %s", err)

    async def async_snapshots(self, cameras: list[str] | None = None) -> list[dict]:
        """Grab a still from each camera. Returns {url, path} — the companion
        app needs the URL, Telegram needs the local file path."""
        source = cameras if cameras is not None else self.config.get("cameras")
        cams = [c for c in (source or []) if c]
        if not cams:
            return []
        folder = self.hass.config.path("www", "sentinel")
        try:
            # exist_ok=True: positional `True` would go to `mode` and makedirs
            # then raises FileExistsError on the existing folder — which is
            # exactly why snapshots silently returned nothing.
            await self.hass.async_add_executor_job(
                functools.partial(os.makedirs, folder, exist_ok=True)
            )
        except Exception as err:  # noqa: BLE001
            _LOGGER.warning("Sentinel: snapshot folder failed: %s", err)
            return []

        # Eski çekimleri buda — yoksa her tetiklenmede birikip diski doldurur.
        await self.hass.async_add_executor_job(self._prune_snapshots, folder)

        stamp = dt_util.now().strftime("%H%M%S")
        shots: list[dict] = []
        for cam in cams:
            # Dosyalar `www/` altında duruyor, yani `/local/...` adresinden
            # kimlik doğrulaması olmadan sunuluyorlar — Home Assistant'ın
            # kuralı bu. Kamera adı + saat tahmin edilebilir bir isim yapardı
            # (günde 86400 olasılık), o yüzden adın sonuna tahmin edilemez bir
            # belirteç ekliyoruz: adresi bilmeyen görüntüye ulaşamasın.
            fname = f"{slugify(cam)}_{stamp}_{secrets.token_urlsafe(12)}.jpg"
            path = os.path.join(folder, fname)
            try:
                await self.hass.services.async_call(
                    "camera", "snapshot",
                    {"entity_id": cam, "filename": path}, blocking=True,
                )
                shots.append({"url": f"/local/sentinel/{fname}", "path": path})
            except Exception as err:  # noqa: BLE001
                _LOGGER.warning("Sentinel: snapshot %s failed: %s", cam, err)
        return shots

    # ---------------------------------------------------------------------- TTS
    async def async_tts(self, message: str, engine: str | None = None,
                        targets: list[str] | None = None, wait: bool = True,
                        volume: int | None = None,
                        volume_after: int | None = None) -> None:
        """Speak a message. Engine and speakers fall back to the global settings.

        `wait` holds the sequence until the announcement has actually finished —
        without it the siren would start on top of the voice.
        """
        service = (engine or self.config.get("tts_service") or "").strip()
        players = [t for t in (targets or []) if t]
        if not players:
            single = (self.config.get("tts_target") or "").strip()
            players = [single] if single else []
        if not service or not message:
            return

        # Sessizde duran bir hoparlör alarm anonsunu yutar — önce sesi aç,
        # anons bitince eski seviyeye (ya da adımın seçtiği seviyeye) dön.
        # Anons konuşurken geri sayım bipleri sussun — aynı hoparlörde
        # çalışırlarsa bip her saniye anonsu kesiyor.
        prev_vol = await self._boost_volume(players, volume)
        self._beep_hold += 1
        try:
            await self._speak(message, service, players, wait)
        finally:
            self._beep_hold = max(0, self._beep_hold - 1)
            await self._restore_volume(prev_vol, players, volume_after)

    async def _boost_volume(self, players: list[str], want: int | None = None) -> dict:
        """Anons için sesi yükselt; eski seviyeleri döndür (geri almak için).

        `want` adımın kendi seçimi; yoksa Ayarlar'daki `tts_volume`.
        """
        if want is None:
            want = int(self.config.get("tts_volume") or 0)
        want = max(0, min(100, int(want)))
        if not want or not players:
            return {}
        prev: dict = {}
        for p in players:
            st = self.hass.states.get(p)
            if st is None:
                continue
            prev[p] = st.attributes.get("volume_level")
        if not prev:
            return {}
        try:
            await self.hass.services.async_call(
                "media_player", "volume_set",
                {"entity_id": list(prev), "volume_level": want / 100}, blocking=True,
            )
            # Kimi cihazlar (Fully Kiosk tabletler) sesi biraz gecikmeyle
            # uygular — hemen konuşursak anons kısık sesle başlıyor.
            await asyncio.sleep(0.7)
        except Exception as err:  # noqa: BLE001
            _LOGGER.debug("Sentinel: volume_set failed: %s", err)
            return {}
        return prev

    async def _restore_volume(self, prev: dict, players: list[str] | None = None,
                              after: int | None = None) -> None:
        """Anons bitti: adım bir 'sonra' seviyesi verdiyse ona ayarla, yoksa
        hoparlörleri bulduğumuz seviyeye geri koy."""
        if after is not None:
            level = max(0, min(100, int(after))) / 100
            targets = list(prev) or [p for p in (players or []) if p]
            if targets:
                try:
                    await self.hass.services.async_call(
                        "media_player", "volume_set",
                        {"entity_id": targets, "volume_level": level}, blocking=False,
                    )
                except Exception:  # noqa: BLE001
                    pass
            return
        for player, level in (prev or {}).items():
            if not isinstance(level, (int, float)):
                continue
            try:
                await self.hass.services.async_call(
                    "media_player", "volume_set",
                    {"entity_id": player, "volume_level": level}, blocking=False,
                )
            except Exception:  # noqa: BLE001
                pass

    async def _speak(self, message: str, service: str, players: list[str], wait: bool) -> None:
        # Sentinel'in kendi AI TTS'i (openai:/gemini:) — dosyayı üret/önbellekten
        # al ve hoparlörde çal.
        if service.startswith(("openai:", "gemini:")):
            await self._ai_tts(message, service, players, wait)
            return

        domain, _, name = service.partition(".")
        try:
            if domain == "tts" and name and name != "speak" and not name.endswith("_say"):
                # Modern TTS entity (Google AI, Google Translate, Cloud…).
                # cache:true → aynı metin+ses bir kez üretilir, sonra diskten
                # çalar; ücretli sağlayıcı (Google AI) her seferinde çağrılmaz.
                data: dict = {"entity_id": service, "message": message, "cache": True}
                if players:
                    data["media_player_entity_id"] = players
                await self.hass.services.async_call("tts", "speak", data, blocking=True)
            elif domain == "tts":
                await self.hass.services.async_call(
                    "tts", name, {"entity_id": players, "message": message, "cache": True},
                    blocking=True,
                )
            else:
                # notify.alexa_media & friends — announce on the Echo itself
                payload: dict = {"message": message}
                if players:
                    payload["target"] = players
                    payload["data"] = {"type": "announce"}
                await self.hass.services.async_call(domain, name, payload, blocking=True)
        except Exception as err:  # noqa: BLE001
            _LOGGER.warning("Sentinel: TTS via %s failed: %s", service, err)
            return

        if wait:
            await self.async_wait_players(players, spoken=message)

    # ------------------------------------------------------------- AI TTS (kendi)
    def ai_tts_entity(self, provider: str) -> str:
        """Sentinel'in kendi TTS entity'si (tts.py'de kurulur). Yoksa ''."""
        try:
            from homeassistant.helpers import entity_registry as er
            reg = er.async_get(self.hass)
            return reg.async_get_entity_id("tts", DOMAIN, f"{DOMAIN}_tts_{provider}") or ""
        except Exception:  # noqa: BLE001
            return ""

    async def _ai_tts(self, message: str, engine: str, players: list[str], wait: bool) -> None:
        """openai:/gemini: — HA'nın TTS katmanı üzerinden konuş.

        Dosyayı kendimiz çalmıyoruz: Echo yerel adresi çekemez, Fully Kiosk kimi
        formatları oynatmaz. `tts.speak` sesi HA'nın kendi adresinden servis eder,
        her oynatıcı bunu anlar; önbelleği de HA yönetir.
        """
        provider, _, voice = engine.partition(":")
        if not players:
            single = (self.config.get("tts_target") or "").strip()
            players = [single] if single else []
        entity = self.ai_tts_entity(provider)
        key = (self.config.get("ai", {}).get(provider) or "").strip()
        if not entity or not key or not players:
            if not key:
                _LOGGER.warning("Sentinel: %s API anahtarı ayarlarda boş", provider)
            elif not entity:
                _LOGGER.warning("Sentinel: Sentinel TTS entity yok (%s)", provider)
            else:
                _LOGGER.warning("Sentinel: AI TTS için hoparlör seçilmedi")
            fb = (self.config.get("tts_service") or "").strip()
            if fb and not fb.startswith(("openai:", "gemini:")):
                await self._speak(message, fb, players, wait)
            return
        data = {
            "entity_id": entity,
            "media_player_entity_id": players,
            "message": message,
            "cache": True,
        }
        if voice:
            data["options"] = {"voice": voice}
        try:
            await self.hass.services.async_call("tts", "speak", data, blocking=True)
        except Exception as err:  # noqa: BLE001
            _LOGGER.warning("Sentinel: AI TTS (%s) failed: %s", provider, err)
            return
        if wait:
            await self.async_wait_players(players, spoken=message)

    def _ffmpeg_bin(self) -> str:
        try:
            from homeassistant.components.ffmpeg import get_ffmpeg_manager
            return get_ffmpeg_manager(self.hass).binary or "ffmpeg"
        except Exception:  # noqa: BLE001
            return "ffmpeg"

    async def _pcm_to_mp3(self, raw: bytes, rate: int) -> bytes:
        """Ham 16-bit mono PCM → mp3 (ffmpeg). Oynatıcılar WAV'ı sevmiyor."""
        try:
            proc = await asyncio.create_subprocess_exec(
                self._ffmpeg_bin(), "-hide_banner", "-loglevel", "error",
                "-f", "s16le", "-ar", str(rate), "-ac", "1", "-i", "pipe:0",
                "-codec:a", "libmp3lame", "-b:a", "128k", "-f", "mp3", "pipe:1",
                stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.DEVNULL,
            )
            out, _ = await proc.communicate(input=raw)
            if proc.returncode == 0 and out:
                return out
        except Exception as err:  # noqa: BLE001
            _LOGGER.warning("Sentinel: ffmpeg pcm->mp3 failed: %s", err)
        return b""

    async def _openai_tts(self, message: str, voice: str, key: str):
        session = aiohttp_client.async_get_clientsession(self.hass)
        payload = {
            "model": OPENAI_TTS_MODEL,
            "voice": voice or "alloy",
            "input": message,
            "response_format": "mp3",
        }
        async with session.post(
            "https://api.openai.com/v1/audio/speech",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json=payload, timeout=aiohttp.ClientTimeout(total=30),
        ) as resp:
            if resp.status != 200:
                _LOGGER.warning("Sentinel: OpenAI TTS %s: %s",
                                resp.status, (await resp.text())[:200])
                return b"", "mp3"
            return await resp.read(), "mp3"

    async def _gemini_tts(self, message: str, voice: str, key: str):
        session = aiohttp_client.async_get_clientsession(self.hass)
        api = (f"https://generativelanguage.googleapis.com/v1beta/models/"
               f"{GEMINI_TTS_MODEL}:generateContent")
        payload = {
            "contents": [{"parts": [{"text": message}]}],
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {
                    "voiceConfig": {
                        "prebuiltVoiceConfig": {"voiceName": voice or "Kore"}
                    }
                },
            },
        }
        async with session.post(
            api, headers={"x-goog-api-key": key, "Content-Type": "application/json"},
            json=payload, timeout=aiohttp.ClientTimeout(total=45),
        ) as resp:
            if resp.status != 200:
                _LOGGER.warning("Sentinel: Gemini TTS %s: %s",
                                resp.status, (await resp.text())[:200])
                return b"", "mp3"
            data = await resp.json()
        try:
            part = data["candidates"][0]["content"]["parts"][0]["inlineData"]
            raw = base64.b64decode(part["data"])
            mime = part.get("mimeType", "")
        except Exception:  # noqa: BLE001
            _LOGGER.warning("Sentinel: Gemini TTS yanıtında ses yok")
            return b"", "mp3"
        # Gemini ham PCM döndürür (genelde 24kHz, 16-bit, mono).
        rate = 24000
        if "rate=" in mime:
            try:
                rate = int(mime.split("rate=")[1].split(";")[0])
            except Exception:  # noqa: BLE001
                pass
        # Önce mp3'e çevir (oynatıcılar WAV'ı çalmıyor); ffmpeg yoksa WAV'a düş.
        mp3 = await self._pcm_to_mp3(raw, rate)
        if mp3:
            return mp3, "mp3"
        buf = io.BytesIO()
        with wave.open(buf, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(rate)
            w.writeframes(raw)
        return buf.getvalue(), "wav"

    async def async_wait_players(self, players: list[str], spoken: str | None = None,
                                 timeout: float = 45.0) -> None:
        """Block until the speakers are done.

        Some players (Alexa announcements) never report `playing`, so we also
        hold for a length estimated from the text — whichever ends later wins.
        """
        estimate = 0.0
        if spoken:
            estimate = min(30.0, max(2.0, len(spoken) / 11.0 + 1.2))
        loop = asyncio.get_running_loop()
        start = loop.time()
        deadline = start + timeout
        await asyncio.sleep(min(0.8, timeout))
        while loop.time() < deadline:
            elapsed = loop.time() - start
            still_playing = any(
                (st := self.hass.states.get(p)) is not None and st.state == "playing"
                for p in players
            )
            if elapsed >= estimate and not still_playing:
                return
            await asyncio.sleep(0.4)

    # -------------------------------------------------------------------- siren
    async def async_siren(self, on: bool) -> None:
        """Start or stop the alarm sound on the configured media player."""
        player = (self.config.get("media_player") or "").strip()
        if not player:
            return
        try:
            if not on:
                await self.hass.services.async_call(
                    "media_player", "media_stop", {"entity_id": player}, blocking=False
                )
                return
            vol = max(0, min(100, int(self.config.get("volume") or 85))) / 100
            await self.hass.services.async_call(
                "media_player", "volume_set",
                {"entity_id": player, "volume_level": vol}, blocking=False,
            )
            sound = (self.config.get("alarm_sound") or "").strip()
            if sound:
                await self.hass.services.async_call(
                    "media_player", "play_media",
                    {
                        "entity_id": player,
                        "media_content_id": sound,
                        "media_content_type": self.config.get("sound_type") or "music",
                    },
                    blocking=False,
                )
        except Exception as err:  # noqa: BLE001
            _LOGGER.warning("Sentinel: siren on %s failed: %s", player, err)

    # ------------------------------------------------------------------ actions
    def action_steps(self, key: str, mode: str | None = None) -> list[dict]:
        """Bir olayın adımları.

        `actions[key]`   → her modda çalışan ortak adımlar ("Tümü")
        `actions[key_mode]` → sadece o modda çalışanlar (ör. "arm_night")
        Mod verilirse ikisi arka arkaya çalışır: önce ortak, sonra moda özel.
        """
        acts = self.config.get("actions") or {}
        base = acts.get(key)
        out = list(base) if isinstance(base, list) else []
        if mode:
            extra = acts.get(f"{key}_{mode}")
            if isinstance(extra, list):
                out += extra
        return out

    def covers(self, key: str, what: str, mode: str | None = None) -> bool:
        """Kullanıcının eylem zinciri şu işi zaten yapıyor mu?

        Yapıyorsa yerleşik olan susar — aynı anda iki bildirim/iki ses olmasın.
        Yapmıyorsa yerleşik devrede kalır (ışık adımı koyan biri bildirimsiz
        kalmasın diye tür tür bakılıyor, "hiç adım var mı" diye değil).
        """
        for s in self.action_steps(key, mode):
            t = str(s.get("type") or "")
            if what == "notify" and t == "notify":
                return True
            if what == "speak":
                if t == "tts" and str(s.get("message") or "").strip():
                    return True
                if t == "media" and str(s.get("say") or "").strip():
                    return True
            if what == "sound":
                if t == "beep":
                    return True
                if t == "media" and str(s.get("media") or "").strip():
                    return True
        return False

    @callback
    def cancel_actions(self, settle: bool = True) -> None:
        """Stop a running sequence — disarming must silence everything at once.

        A flash that is cut mid-cycle leaves the lights sitting at 1%, so the
        room goes dark instead of back to normal. Cancelling therefore also
        schedules a settle pass; it runs in its own task because the cancelled
        one cannot await anything any more.

        `settle=False` on disarm: `resolve_flash_for_disarm` decides the final
        state instead — running both races and can leave the lights on in the
        alarm colour.
        """
        task = self._action_task
        self._action_task = None
        if task and not task.done():
            task.cancel()
        if self._flash_active:
            entities = list(self._flash_active)
            scene = self._after_scene
            self._flash_active = []
            if settle:
                self.hass.async_create_task(self._settle_flash(entities, scene))

    async def _settle_flash(self, entities: list[str], scene: str) -> None:
        """Interrupted mid-flash: land somewhere defined instead of at 1%."""
        await asyncio.sleep(0.4)          # let the last queued command land
        if scene:
            await self._call("scene", "turn_on", {"entity_id": scene})
        else:
            await self._call("light", "turn_on",
                             {"entity_id": entities, "brightness_pct": 100})

    @callback
    def resolve_flash_for_disarm(self) -> None:
        """After disarm the lights must not be left sitting in the alarm colour.

        Whatever the flash step's own ending was, disarming means the alert is
        over: apply the chosen scene, or turn the flashed lights off. ('keep'
        makes sense during an alarm, never after you cancel it.) Any WHEN
        DISARMED actions run on top of this and can override it.
        """
        lights = list(self._trigger_flash_lights)
        after = self._trigger_flash_after
        scene = self._trigger_flash_scene
        self._trigger_flash_lights = []
        if not lights:
            return
        self.hass.async_create_task(self._do_resolve_disarm(lights, after, scene))

    async def _do_resolve_disarm(self, lights: list[str], after: str, scene: str) -> None:
        """Alarm ışıklarını normale döndür — ISRARLA.

        Flash saniyede birkaç komut gönderir; iptal etsek bile Hue/Zigbee
        köprüsünün kuyruğunda komutlar kalır ve bizim "kapat"ımızdan SONRA
        varıp ışığı yeniden kırmızı yakar. Bu yüzden birkaç kez tekrarlıyoruz:
        kuyruk boşaldıktan sonraki son söz bizim olsun.
        """
        for wait in (0.4, 1.5, 3.0, 5.0):
            await asyncio.sleep(wait)
            try:
                if after == "scene" and scene:
                    await self._call("scene", "turn_on", {"entity_id": scene})
                else:
                    await self._call("light", "turn_off", {"entity_id": lights})
            except Exception:  # noqa: BLE001 - biri tutmazsa diğeri tutar
                pass

    def sample_trigger_eid(self) -> str:
        """A representative sensor for previews/tests — prefer one whose room has
        a camera so the notification shows real room/sensor text and a picture."""
        assigned = []
        for m in MODES:
            for e in self.config.get("assign", {}).get(m, []):
                if e not in assigned:
                    assigned.append(e)
        for e in assigned:
            if self.cameras_in_area(self.area_of(e)):
                return e
        for e in assigned:
            if self.area_of(e):
                return e
        return assigned[0] if assigned else ""

    @callback
    def run_step_list(self, steps: list[dict], context: Context | None = None) -> None:
        """Run steps handed in directly — nothing is read from or written to the
        saved configuration. This is what the panel's per-step test uses.

        `context` is the caller's Home Assistant context. A free-form `service`
        step can call anything, so it is dispatched on behalf of the user who
        asked for it rather than anonymously.
        """
        if not steps:
            return
        # Testte gerçek tetik yok; temsili bir sensör ver ki oda/sensör dolsun.
        self._action_eid = self.sample_trigger_eid()
        self._action_mode = "away"
        self.cancel_actions()
        self._action_task = self.hass.async_create_task(
            self._run_steps_as(steps, "test", context)
        )

    async def _run_steps_as(self, steps: list[dict], key: str,
                            context: Context | None) -> None:
        """Run a chain with the caller's context attached to service steps."""
        self._step_ctx = context
        try:
            await self._run_steps(steps, key)
        finally:
            self._step_ctx = None

    @callback
    def run_actions(self, key: str, eid: str = "", mode: str = "") -> None:
        """Fire the step list for an event. Never blocks the state machine.

        `eid`/`mode` give the steps their context — a notification step can then
        name the triggering room/sensor and pull that room's camera.
        """
        steps = self.action_steps(key, mode)
        if not steps:
            return
        self._action_eid = eid
        self._action_mode = mode
        self.cancel_actions()
        self._action_task = self.hass.async_create_task(self._run_steps(steps, key))

    async def _run_steps(self, steps: list[dict], key: str) -> None:
        loop = asyncio.get_running_loop()
        began = loop.time()
        # Canlı ilerleme + gerçek süreler: panel "kaç dakika sürüyor"u buradan okur.
        self.progress = {"key": key, "running": True, "total": len(steps),
                         "index": 0, "started": began}
        timings: list[dict] = []
        try:
            # Steps marked `parallel` start together with the one before them,
            # so an announcement and the lights can fire at the same moment.
            i = 0
            while i < len(steps):
                batch = [steps[i]]
                j = i + 1
                while j < len(steps) and steps[j].get("parallel"):
                    batch.append(steps[j])
                    j += 1
                self.progress["index"] = i
                self.progress["batch"] = len(batch)
                self.progress["step_started"] = loop.time()
                t0 = loop.time()
                iw = key == "test"   # "şimdi çalıştır" testi saat penceresini yok sayar
                if len(batch) == 1:
                    await self._run_step(batch[0], ignore_window=iw)
                else:
                    await asyncio.gather(*(self._run_step(s, ignore_window=iw) for s in batch))
                took = round(loop.time() - t0, 1)
                for n, s in enumerate(batch):
                    timings.append({
                        "index": i + n, "type": s.get("type"), "seconds": took,
                        # Günlük timeline'ı için: adım neydi, kime uygulandı
                        "at": dt_util.now().strftime("%H:%M:%S"),
                        "targets": [self.name_of(e) for e in (s.get("entities") or []) if e][:3],
                        "skipped": not self._step_in_window(s) and key != "test",
                        "parallel": bool(n),
                    })
                i = j
        except asyncio.CancelledError:
            _LOGGER.debug("Sentinel: %s actions cancelled", key)
            self.last_run = {"key": key, "stopped": True,
                             "total": round(loop.time() - began, 1), "steps": timings}
            self._record_run(key, True, loop.time() - began, timings)
            self.progress = {"running": False}
            raise
        except Exception as err:  # noqa: BLE001 - one bad step must not kill the alarm
            _LOGGER.warning("Sentinel: %s action failed: %s", key, err)
        self.last_run = {"key": key, "stopped": False,
                         "total": round(loop.time() - began, 1), "steps": timings}
        self._record_run(key, False, loop.time() - began, timings)
        self.progress = {"running": False}

    def _record_run(self, key: str, stopped: bool, total: float, steps: list) -> None:
        """Günlük için: hangi olay, hangi modda, hangi adımlar çalıştı."""
        self.runs.insert(0, {
            "key": key,
            "mode": self._action_mode or "",
            "ts": dt_util.now().isoformat(timespec="seconds"),
            "stopped": stopped,
            "total": round(total, 1),
            "steps": [dict(s) for s in steps],
        })
        del self.runs[MAX_RUNS:]
        async_dispatcher_send(self.hass, SIGNAL_EVENT)

    def _step_in_window(self, step: dict) -> bool:
        """Adımın saat penceresi varsa şu an içinde miyiz? (yoksa hep True.)"""
        f = step.get("time_from")
        t = step.get("time_to")
        if not f or not t:
            return True
        fm = _hhmm(f)
        tm = _hhmm(t)
        if fm is None or tm is None or fm == tm:
            return True
        now = dt_util.now()
        cur = now.hour * 60 + now.minute
        if fm < tm:
            return fm <= cur < tm
        return cur >= fm or cur < tm   # gece yarısını geçen pencere

    async def _run_step(self, step: dict, ignore_window: bool = False) -> None:
        kind = str(step.get("type") or "")
        ents = [e for e in (step.get("entities") or []) if e]

        # Saat penceresi: pencere dışındaysa bu adımı sessizce atla.
        if not ignore_window and not self._step_in_window(step):
            return

        # Her adım kendi başlangıç gecikmesini taşıyabilir — araya ayrı bir
        # "bekle" adımı koymaya gerek kalmasın diye.
        delay = max(0.0, float(step.get("delay") or 0))
        if delay:
            await asyncio.sleep(delay)

        if kind == "wait":
            await asyncio.sleep(max(0.0, float(step.get("seconds") or 0)))
            return

        if kind == "light":
            flashers = [e for e in (step.get("flash_entities") or []) if e]
            if not ents and not flashers:
                return
            stagger = max(0.0, float(step.get("stagger") or 0))

            if step.get("state") == "off":
                await self._spread("light", "turn_off", ents + flashers, {}, stagger)
                return

            data: dict = {}
            if step.get("brightness") is not None:
                data["brightness_pct"] = max(1, min(100, int(step["brightness"])))
            color = step.get("color")
            if isinstance(color, (list, tuple)) and len(color) == 3:
                data["rgb_color"] = [int(c) for c in color]
            # NOTE: no `flash` service param on purpose. Hue treats it as an
            # "alert" that overrides the colour we just asked for, so the lights
            # came up plain white. We do the flashing ourselves below.

            # eski anahtarları da kabul et (strobe -> flash)
            duration = max(0.0, float(step.get("flash", step.get("strobe")) or 0))
            interval = max(0.2, float(
                step.get("flash_interval", step.get("strobe_interval")) or 0.6))
            after = str(step.get("after") or "keep")

            if ents:
                await self._spread("light", "turn_on", ents, data, stagger)

            if not flashers:
                return

            # Flashing by switching OFF and ON would cut power on every cycle.
            # Plenty of cheap bulbs and relays read a few rapid power cycles as
            # "factory reset / pairing", so we dim instead — the device never
            # loses power. Lights that cannot dim are simply left on.
            # Üç sınıf: kendi yanıp sönebilenler, sadece karartılabilenler,
            # ve hiçbiri (röle/anahtar — onlara sadece "yan" deriz).
            native = [e for e in flashers if self.supports_flash(e)]
            dimmable = [e for e in flashers if e not in native and self.can_dim(e)]
            plain = [e for e in flashers if e not in native and e not in dimmable]

            # Flash bitince ne olacak? Eskiden her ampulün önceki hâlini
            # fotoğraflayıp geri koyuyorduk; kırılgandı ve tam tutturamıyordu.
            # Artık kullanıcının seçtiği bir sahne uygulanıyor — ne olacağı belli.
            self._after_scene = str(step.get("after_scene") or "")

            if plain:
                await self._call("light", "turn_on", dict(data, entity_id=plain))

            if duration > 0 and (native or dimmable):
                # Durdurulursa ne uygulanacağını bilelim.
                self._flash_active = native + dimmable
            # Bu tetik boyunca flash'lanan TÜM ışıklar — disarm'da normale
            # döndürmek için (flash bitse bile hatırlanır, disarm'a kadar durur).
            # Sadece yanıp sönenler değil, bu adımın YAKTIĞI TÜM ışıklar —
            # sabit kırmızı yakılanlar da disarm'da normale dönmeli.
            self._trigger_flash_lights = ents + native + dimmable + plain
            self._trigger_flash_after = after
            self._trigger_flash_scene = self._after_scene

            jobs = []
            if native:
                if duration > 0:
                    jobs.append(self._flash_native(native, data, duration))
                else:
                    await self._call("light", "turn_on", dict(data, entity_id=native))
            if dimmable:
                if duration > 0:
                    jobs.append(self._flash_dimming(dimmable, data, duration, interval))
                else:
                    await self._call("light", "turn_on", dict(data, entity_id=dimmable))
            if jobs:
                await asyncio.gather(*jobs)

            self._flash_active = []      # normal bitiş
            if after == "scene" and self._after_scene:
                await self._call("scene", "turn_on", {"entity_id": self._after_scene})
            elif after == "off":
                await self._spread("light", "turn_off", ents + flashers, {}, stagger)
            # "keep" -> bırak, seçilen renkte kalsınlar
            return

        if kind == "power":
            # Her tür cihazı aç/kapat — klima, medya, fan, priz, ışık…
            # `homeassistant.turn_on/off` doğru servisi kendi seçer.
            if not ents:
                return
            service = "turn_off" if str(step.get("state") or "off") == "off" else "turn_on"
            await self._spread("homeassistant", service, ents, {},
                               max(0.0, float(step.get("stagger") or 0)))
            return

        if kind in ("switch", "cover", "lock"):
            if not ents:
                return
            state = str(step.get("state") or "on")
            service = {
                "switch": {"on": "turn_on", "off": "turn_off"},
                "cover": {"open": "open_cover", "close": "close_cover"},
                "lock": {"lock": "lock", "unlock": "unlock"},
            }[kind].get(state)
            if service:
                await self._spread(kind, service, ents, {},
                                   max(0.0, float(step.get("stagger") or 0)))
            return

        if kind in ("scene", "script"):
            if not ents:
                return
            await self._call(kind, "turn_on", {"entity_id": ents})
            return

        if kind == "beep":
            await self._run_beeps(step, ents)
            return

        if kind == "tts":
            message = str(step.get("message") or "")
            if message:
                vol = step.get("volume")
                vol_after = step.get("volume_after")
                await self.async_tts(
                    message,
                    engine=step.get("engine") or None,
                    targets=ents,
                    wait=step.get("wait", True) is not False,
                    volume=int(vol) if vol not in (None, "") else None,
                    volume_after=int(vol_after) if vol_after not in (None, "") else None,
                )
            return

        if kind == "media":
            players = ents or [step["entity"]] if step.get("entity") else ents
            if not players:
                single = (self.config.get("media_player") or "").strip()
                players = [single] if single else []
            if not players:
                return

            # An announcement in the same step is spoken FIRST, then the sound —
            # otherwise the siren drowns out the voice.
            speech = str(step.get("say") or "")
            if speech:
                await self.async_tts(speech, engine=step.get("engine") or None,
                                     targets=players, wait=True)

            if step.get("volume") is not None:
                await self._call("media_player", "volume_set", {
                    "entity_id": players,
                    "volume_level": max(0, min(100, int(step["volume"]))) / 100,
                })
            media = str(step.get("media") or "")
            if media:
                await self._call("media_player", "play_media", {
                    "entity_id": players,
                    "media_content_id": media,
                    "media_content_type": step.get("content_type") or "music",
                })
                if step.get("wait"):
                    await self.async_wait_players(players)
            return

        if kind == "notify":
            # Metin: ya hazır kalıp (oda/sensör/saat'i doldurur) ya da elle yazılan.
            fmt = step.get("msg_format") or "custom"
            if fmt != "custom":
                message = self.build_alert(
                    self._action_eid, self._action_mode,
                    {"format": fmt, "include": step.get("include") or {}},
                )
            else:
                message = str(step.get("message") or "")
            if not message:
                return

            # Kamera: yok / tetiklenen odanınki / bu adımda seçilenler.
            cam_mode = step.get("camera_mode")
            if cam_mode is None:                       # eski adımlar: camera bool
                cam_mode = "room" if step.get("camera") else "none"
            if cam_mode == "room":
                cams = self.cameras_for_trigger(self._action_eid)
            elif cam_mode == "pick":
                cams = [c for c in (step.get("cameras") or []) if c]
            else:
                cams = []
            step_targets = [t for t in (step.get("notify") or []) if t]
            # Kritik bildirim artık ADIM BAŞINA: "alarm kuruldu" normal gitsin,
            # "hırsız var" sessizdeyken bile çalsın. Eski adımlar kritik kalır.
            await self.async_notify(
                message, with_camera=bool(cams), cameras=cams,
                critical=step.get("critical") is not False,
                targets=step_targets or None,
                tg_chat=step.get("telegram_chat") or None,
                tg_entity=step.get("telegram_entity") or None,
            )
            return

        if kind == "service":
            domain, _, service = str(step.get("service") or "").partition(".")
            if domain and service:
                data = dict(step.get("data") or {})
                if ents:
                    data["entity_id"] = ents
                # Bu adım herhangi bir servisi çağırabilir. Panelden elle
                # çalıştırıldıysa isteği yapanın context'iyle git — böylece
                # çağrı HA'nın kendi izin kontrolünden geçer.
                await self._call(domain, service, data, context=self._step_ctx)
            return

    async def _flash_native(self, ents: list[str], data: dict, duration: float) -> None:
        """Hand the blinking to the lights themselves.

        One `flash: long` buys roughly fifteen seconds of blinking done locally
        by the bulb or its bridge, so a whole house costs a couple of commands
        instead of hundreds. The colour goes in its own call first — sending
        both together makes Hue's alert override it.
        """
        if data:
            await self._call("light", "turn_on", dict(data, entity_id=ents))
            await asyncio.sleep(0.4)

        loop = asyncio.get_running_loop()
        end = loop.time() + duration
        last = None
        while True:
            left = end - loop.time()
            # Check BEFORE sending: firing one more alert as we finish would
            # start a fresh 15-second blink that outlives the step.
            if left <= 0.5:
                break
            await self._call("light", "turn_on", {"entity_id": ents, "flash": "long"})
            last = loop.time()
            # Sleep a whole alert, so blocks line up end-to-end instead of
            # drifting and leaving a long tail to wait out afterwards.
            await asyncio.sleep(min(ALERT_SECONDS, left))

        # An alert snaps the light back to the colour it started on when it ends,
        # which would undo whatever we apply next. Wait out whatever is left of
        # the final block — with whole-block sleeps that is normally ~0.
        if last is not None:
            tail = ALERT_SECONDS + 1.0 - (loop.time() - last)
            if tail > 0:
                await asyncio.sleep(tail)

    async def _flash_dimming(self, ents: list[str], data: dict,
                             duration: float, interval: float) -> None:
        """Fallback for lights that cannot blink themselves: ride the dimmer.

        Never on/off — repeatedly cutting power can push cheap bulbs and relays
        into pairing mode.
        """
        # Colour once; the loop then only carries brightness. Re-sending the
        # colour every cycle is payload a bridge has to chew through.
        await self._call("light", "turn_on", dict(data, entity_id=ents, transition=0))
        top = data.get("brightness_pct", 100)
        # transition 0: without it Hue fades over ~400 ms, which at this cadence
        # turns a sharp flash into a soft pulse.
        bright = {"entity_id": ents, "transition": 0, "brightness_pct": top}
        dim = {"entity_id": ents, "transition": 0, "brightness_pct": 1}
        # A bridge digests roughly ten commands a second and each cycle costs two
        # per target; asking for more just builds a backlog we then have to wait
        # out when stopping.
        floor = len(ents) / 5.0
        if interval < floor:
            _LOGGER.debug("Sentinel: flash interval %.1fs -> %.1fs for %d targets",
                          interval, floor, len(ents))
            interval = floor

        loop = asyncio.get_running_loop()
        end = loop.time() + duration
        while loop.time() < end:
            await self._call("light", "turn_on", dim)
            await asyncio.sleep(interval / 2)
            await self._call("light", "turn_on", bright)
            await asyncio.sleep(interval / 2)

    async def _spread(self, domain: str, service: str, ents: list[str],
                      data: dict, gap: float) -> None:
        """Fire one service call per entity with `gap` seconds between them."""
        if gap <= 0:
            await self._call(domain, service, dict(data, entity_id=ents))
            return
        for i, eid in enumerate(ents):
            await self._call(domain, service, dict(data, entity_id=eid))
            if i < len(ents) - 1:
                await asyncio.sleep(gap)

    async def _call(self, domain: str, service: str, data: dict,
                    blocking: bool = False, context: Context | None = None) -> None:
        try:
            await self.hass.services.async_call(
                domain, service, data, blocking=blocking, context=context
            )
        except Exception as err:  # noqa: BLE001
            _LOGGER.warning("Sentinel: %s.%s failed: %s", domain, service, err)

    # ------------------------------------------------------- presence simulation
    # ------------------------------------------------------ otomatik kurulum
    @callback
    def setup_auto(self) -> None:
        """Saat programı + kişi takibi. Config değişince yeniden kurulur."""
        self.stop_auto()
        auto = self.config.get("auto") or {}
        if any(s.get("enabled", True) for s in (auto.get("schedules") or [])):
            self._auto_unsubs.append(
                async_track_time_interval(self.hass, self._auto_tick, timedelta(seconds=30))
            )
        persons = set()
        if (auto.get("leave") or {}).get("enabled"):
            persons.update((auto["leave"].get("persons") or []))
        if (auto.get("arrive") or {}).get("enabled"):
            persons.update((auto["arrive"].get("persons") or []))
        persons = [p for p in persons if p]
        if persons:
            self._auto_unsubs.append(
                async_track_state_change_event(self.hass, persons, self._person_event)
            )
        # Cihaz tetikleyicileri (bir entity açılınca/kapanınca kur ya da kapat)
        ents = [t.get("entity") for t in (auto.get("triggers") or [])
                if t.get("enabled", True) and t.get("entity")]
        if ents:
            self._auto_unsubs.append(
                async_track_state_change_event(self.hass, list(set(ents)), self._trigger_event)
            )

    @callback
    def stop_auto(self) -> None:
        for un in self._auto_unsubs:
            try:
                un()
            except Exception:  # noqa: BLE001
                pass
        self._auto_unsubs = []
        self._cancel_leave_timer()

    @callback
    def _cancel_leave_timer(self) -> None:
        if self._leave_timer:
            self._leave_timer()
            self._leave_timer = None

    def _mode_now(self) -> str:
        ent = self.entity
        return getattr(ent, "_mode", "") if ent else ""

    def _is_armed_now(self) -> bool:
        ent = self.entity
        return bool(ent and ent._is_armed())

    async def _arm_mode(self, mode: str, why: str) -> None:
        ent = self.entity
        if ent is None:
            return
        try:
            if mode == "disarm":
                await ent.async_alarm_disarm(self.config.get("code") or None)
            else:
                await ent.async_arm_mode(mode, bypass_open=False)
            self.log("auto", f"{why}", mode if mode != "disarm" else "")
        except Exception as err:  # noqa: BLE001
            _LOGGER.warning("Sentinel: otomatik %s başarısız: %s", mode, err)

    async def _auto_tick(self, now: datetime) -> None:
        """Saat programı: gün/saat eşleşince modu kur (dakikada bir kez)."""
        now = dt_util.as_local(now) if now else dt_util.now()
        stamp = now.strftime("%Y-%m-%d %H:%M")
        weekday = now.weekday()          # 0 = Pazartesi
        for s in (self.config.get("auto", {}).get("schedules") or []):
            if not s.get("enabled", True):
                continue
            days = s.get("days")
            if days and weekday not in days:
                continue
            if str(s.get("time") or "")[:5] != now.strftime("%H:%M"):
                continue
            key = f"{s.get('id')}|{stamp}"
            if key in self._sched_fired:
                continue
            self._sched_fired.add(key)
            if len(self._sched_fired) > 200:
                self._sched_fired.clear()
            mode = str(s.get("mode") or "away")
            if mode != "disarm" and self._mode_now() == mode:
                continue
            await self._arm_mode(mode, self.msg("auto_sched"))

    @callback
    def _trigger_event(self, event) -> None:
        """Bir cihaz istenen duruma GEÇTİĞİNDE modu kur / alarmı kapat."""
        new = event.data.get("new_state")
        old = event.data.get("old_state")
        if new is None or new.state in ("unavailable", "unknown"):
            return
        # Sadece geçiş anı sayılır (aynı durumda kalan tekrar tetiklemesin).
        if old is not None and old.state == new.state:
            return
        eid = event.data["entity_id"]
        for t in (self.config.get("auto", {}).get("triggers") or []):
            if not t.get("enabled", True) or t.get("entity") != eid:
                continue
            if new.state != str(t.get("state") or "on"):
                continue
            mode = str(t.get("mode") or "away")
            if mode != "disarm" and self._mode_now() == mode:
                continue
            delay = max(0, int(t.get("delay") or 0))
            why = self.msg("auto_entity").replace("{d}", self.name_of(eid))
            if delay:
                async_call_later(
                    self.hass, delay,
                    lambda _n, m=mode, w=why, e=eid, s=new.state:
                        self.hass.async_create_task(self._trigger_fire(m, w, e, s)),
                )
            else:
                self.hass.async_create_task(self._arm_mode(mode, why))

    async def _trigger_fire(self, mode: str, why: str, eid: str, want: str) -> None:
        # Gecikme sonunda cihaz hâlâ o durumda mı? Değilse vazgeç.
        st = self.hass.states.get(eid)
        if st is None or st.state != want:
            return
        await self._arm_mode(mode, why)

    @callback
    def _person_event(self, event) -> None:
        self.hass.async_create_task(self._person_changed(event))

    async def _person_changed(self, event) -> None:
        auto = self.config.get("auto") or {}
        leave = auto.get("leave") or {}
        arrive = auto.get("arrive") or {}
        new = event.data.get("new_state")
        old = event.data.get("old_state")
        if new is None:
            return
        came_home = new.state == "home" and (old is None or old.state != "home")

        # Biri geldi → alarmı kapat (kuruluysa).
        if arrive.get("enabled") and came_home and self._is_armed_now():
            if event.data["entity_id"] in (arrive.get("persons") or []):
                self._cancel_leave_timer()
                await self._arm_mode("disarm", self.msg("auto_arrive"))
                return

        if not leave.get("enabled"):
            return
        watched = [p for p in (leave.get("persons") or []) if p]
        if not watched:
            return
        anyone_home = any(
            (st := self.hass.states.get(p)) is not None and st.state == "home"
            for p in watched
        )
        if anyone_home:
            # Biri evde: bekleyen kurulum varsa iptal.
            self._cancel_leave_timer()
            return
        if self._is_armed_now() or self._leave_timer:
            return
        delay = max(0, int(leave.get("delay") or 0)) * 60
        mode = str(leave.get("mode") or "away")
        if delay <= 0:
            await self._arm_mode(mode, self.msg("auto_leave"))
            return
        self._leave_timer = async_call_later(
            self.hass, delay, lambda _n: self.hass.async_create_task(self._leave_elapsed(mode))
        )

    async def _leave_elapsed(self, mode: str) -> None:
        self._leave_timer = None
        auto = self.config.get("auto") or {}
        watched = [p for p in ((auto.get("leave") or {}).get("persons") or []) if p]
        if any((st := self.hass.states.get(p)) is not None and st.state == "home" for p in watched):
            return                      # bu arada biri döndü
        if self._is_armed_now():
            return
        await self._arm_mode(mode, self.msg("auto_leave"))

    # ------------------------------------------------------------------ bip adımı
    @callback
    def stop_beeps(self) -> None:
        """Kalan bir bip adımı varsa durdur (disarm/tetiklenme)."""
        if self._beep_task and not self._beep_task.done():
            self._beep_task.cancel()
        self._beep_task = None

    async def _run_beeps(self, step: dict, players: list[str]) -> None:
        """Bir 'bip' adımı: seçilen sesi süre boyunca tekrar çal.

        Ayarlar'da değil, EYLEM olarak kurulur — böylece anonstan sonra,
        istediğin hoparlörde, istediğin sürede çalar.
        """
        sound = str(step.get("sound") or "arm_beep_soft").strip()
        seconds = max(1, int(step.get("seconds") or 10))
        interval = max(0.2, float(step.get("interval") or 1.0))
        fast_last = max(0, int(step.get("fast_last") or 0))
        if not players:
            single = (self.config.get("media_player") or "").strip()
            players = [single] if single else []
        if not players:
            _LOGGER.warning("Sentinel: bip adımı için hoparlör seçilmedi")
            return
        target = players if len(players) > 1 else players[0]
        url = sound if sound.startswith(("/", "http")) else f"/local/sentinel/{sound}.mp3"
        vol = step.get("volume")
        prev = await self._boost_volume(players, int(vol) if vol not in (None, "") else None)
        left = float(seconds)
        try:
            while left > 0:
                gap = (interval / 2) if (fast_last and left <= fast_last) else interval
                await self._call("media_player", "play_media", {
                    "entity_id": target, "media_content_id": url,
                    "media_content_type": "music",
                })
                await asyncio.sleep(gap)
                left -= gap
        except asyncio.CancelledError:
            raise
        except Exception as err:  # noqa: BLE001
            _LOGGER.debug("Sentinel: bip adımı: %s", err)
        finally:
            after = step.get("volume_after")
            await self._restore_volume(
                prev, players, int(after) if after not in (None, "") else None
            )

    # ------------------------------------------- bildirim aksiyonu (Kapat/Yoksay)
    @callback
    def setup_notify_actions(self) -> None:
        """Companion app bildirimindeki düğmeye basılınca alarmı kapat."""
        @callback
        def _handler(event) -> None:
            action = str(event.data.get("action") or "")
            if action == ACTION_DISARM:
                self.hass.async_create_task(self._arm_mode("disarm", self.msg("auto_push")))
            elif action == ACTION_IGNORE:
                # Sesi kes: siren artık EYLEM adımı olduğu için çalışan zinciri
                # de durdur — yoksa bildirimdeki düğme sesi susturmaz.
                self.stop_beeps()
                self.cancel_actions()
                self.hass.async_create_task(self.async_siren(False))
        self.hass.bus.async_listen("mobile_app_notification_action", _handler)

    # ------------------------------------------------------- gece ışıkları
    def night_light_entities(self) -> list[str]:
        cfg = self.config.get("night_lights") or {}
        if not cfg.get("enabled"):
            return []
        return [e for e in (cfg.get("lights") or []) if e]

    @callback
    def start_night_lights(self) -> None:
        """Kurulunca yak, gün doğunca (ya da saatinde) söndür — 60 sn'de bir bak."""
        self.stop_night_lights(off=False)
        cfg = self.config.get("night_lights") or {}
        if not cfg.get("enabled") or not self.night_light_entities():
            return
        self._night_unsub = async_track_time_interval(
            self.hass, self._night_tick, timedelta(seconds=60)
        )
        self.hass.async_create_task(self._night_tick(dt_util.now()))

    @callback
    def stop_night_lights(self, off: bool = True) -> None:
        if getattr(self, "_night_unsub", None):
            self._night_unsub()
            self._night_unsub = None
        if off and getattr(self, "_night_on", False):
            lights = self.night_light_entities()
            self._night_on = False
            self._night_state = {}
            if lights:
                self.hass.async_create_task(
                    self._call("light", "turn_off", {"entity_id": lights})
                )

    def night_plan(self, night_min: int) -> list[dict]:
        """Gece programı: kullanıcı çizmediyse her ışık tüm gece açık."""
        cfg = self.config.get("night_lights") or {}
        lights = self.night_light_entities()
        plan = [b for b in (cfg.get("plan") or [])
                if b.get("eid") in lights]
        if plan:
            return plan
        return [{"eid": e, "start_min": 0, "end_min": night_min} for e in lights]

    async def _night_tick(self, now: datetime) -> None:
        """Her ışık kendi zaman bloğuna göre yanar/söner (gün batımı eksenli)."""
        now = dt_util.as_local(now) if now else dt_util.now()
        cfg = self.config.get("night_lights") or {}
        lights = self.night_light_entities()
        if not lights:
            return
        ent = self.entity
        mode = getattr(ent, "_mode", "") if ent else ""
        armed = bool(ent and ent._is_armed() and mode in (cfg.get("modes") or []))

        want = {e: False for e in lights}
        if armed:
            sunset, sunrise = self._sun_window(now)
            night = max(60, int((sunrise - sunset).total_seconds() // 60))
            mins = (now - sunset).total_seconds() / 60
            # Gündüz kurarsan (pencere dışı) hiçbir şey yanmaz.
            if 0 <= mins < night:
                for b in self.night_plan(night):
                    if b.get("eid") in want and b["start_min"] <= mins < b["end_min"]:
                        want[b["eid"]] = True

        state = getattr(self, "_night_state", None)
        if state is None:
            state = self._night_state = {}
        on_now, off_now = [], []
        for eid, w in want.items():
            if state.get(eid) == w:
                continue
            state[eid] = w
            (on_now if w else off_now).append(eid)
        self._night_on = any(state.values())
        if off_now:
            await self._call("light", "turn_off", {"entity_id": off_now})
        if on_now:
            data: dict = {"entity_id": on_now}
            br = cfg.get("brightness")
            if br is not None:
                data["brightness_pct"] = max(1, min(100, int(br)))
            col = cfg.get("color")
            if isinstance(col, (list, tuple)) and len(col) == 3:
                data["rgb_color"] = [int(c) for c in col]
            await self._call("light", "turn_on", data)

    # --------------------------------------------- kurulunca ışıkları süpür
    async def sweep_lights_off(self, mode: str) -> None:
        """Alarm kurulunca evdeki tüm ışıkları kapat — muaflar hariç."""
        cfg = (self.config.get("auto") or {}).get("lights_off") or {}
        if not cfg.get("enabled") or mode not in (cfg.get("modes") or []):
            return
        keep = {e for e in (cfg.get("except") or []) if e}
        # Gece ışıkları o modda yanacaksa onlara DOKUNMA.
        nl = self.config.get("night_lights") or {}
        if nl.get("enabled") and mode in (nl.get("modes") or []):
            keep.update(self.night_light_entities())
        # Tatil taklidindeki ışıklar da muaf.
        keep.update(self.sim_entities())
        targets = [e for e in self.hass.states.async_entity_ids("light") if e not in keep]
        if not targets:
            return
        await self._call("light", "turn_off", {"entity_id": targets})
        self.log("lights_off", self.msg("lights_swept", len(targets)), mode)

    def sim_entities(self) -> list[str]:
        vc = self.config.get("vacation_cfg", {})
        out = [s.get("entity") for s in (vc.get("sim") or []) if s.get("entity")]
        out += [e for e in (vc.get("sim_lights") or []) if e]
        return out

    @callback
    def start_simulation(self) -> None:
        """Fake somebody being home. New auto mode (sim_enabled + sim_lights)
        runs a sunset→sunrise human-like plan; else the legacy clock schedule."""
        self.stop_simulation()
        vc = self.config.get("vacation_cfg", {})
        if vc.get("sim_enabled") and vc.get("sim_lights"):
            self._sim_unsub = async_track_time_interval(
                self.hass, self._vac_tick, timedelta(seconds=60)
            )
            self.hass.async_create_task(self._vac_tick(dt_util.now()))
            return
        if vc.get("sim"):
            self._sim_unsub = async_track_time_interval(
                self.hass, self._sim_tick, timedelta(seconds=30)
            )
            self.hass.async_create_task(self._sim_tick(dt_util.now()))

    @callback
    def stop_simulation(self) -> None:
        if self._sim_unsub:
            self._sim_unsub()
            self._sim_unsub = None
        self._sim_state.clear()

    # ---------------------------------------------------- tatil simülasyonu (auto)
    def _room_role(self, area_name: str) -> str:
        """Oda adından bir 'yaşam rolü' çıkar — planı buna göre kurar."""
        n = (area_name or "").lower()
        pairs = [
            ("living",  ("salon", "oturma", "living")),
            ("kitchen", ("mutfak", "kitchen")),
            ("bedroom", ("yatak", "bedroom", "uyku")),
            ("office",  ("ofis", "office", "çalış", "calis", "büro", "buro")),
            ("bath",    ("banyo", "bath", "tuvalet", "lavabo")),
            ("hall",    ("koridor", "antre", "hol", "hall", "giriş", "giris")),
        ]
        for role, keys in pairs:
            if any(k in n for k in keys):
                return role
        return "other"

    def _sun_window(self, now: datetime):
        """Bu geceye ait (sunset, sunrise) yerel datetime çifti."""
        now = dt_util.as_local(now)
        sun = self.hass.states.get("sun.sun")
        rising = setting = None
        if sun:
            rising = dt_util.parse_datetime(sun.attributes.get("next_rising") or "")
            setting = dt_util.parse_datetime(sun.attributes.get("next_setting") or "")
        if rising and setting:
            rising = dt_util.as_local(rising)
            setting = dt_util.as_local(setting)
            if sun.state == "below_horizon":
                # Şu an gece: next_rising bu gecenin sonu; sunset ~ yarınki - 24s.
                return setting - timedelta(days=1), rising
            return setting, rising
        # sun entity yoksa: bugün 19:00 → yarın 06:00
        base = now.replace(hour=19, minute=0, second=0, microsecond=0)
        if now < base:
            base -= timedelta(days=1)
        return base, base + timedelta(hours=11)

    def vacation_plan(self, seed: int | None = None) -> dict:
        """Bu gece için insansı ışık programı — oda rollerine göre bloklar.
        Aynı seed → aynı plan (gece boyu kararlı; her gün seed = tarih)."""
        sunset, sunrise = self._sun_window(dt_util.now())
        night = max(300, min(840, int((sunrise - sunset).total_seconds() // 60)))
        lights = [e for e in (self.config.get("vacation_cfg", {}).get("sim_lights") or []) if e]
        roles: dict[str, list] = {}
        for e in lights:
            roles.setdefault(self._room_role(self.area_name(self.area_of(e))), []).append(e)
        if seed is None:
            seed = dt_util.now().date().toordinal()
        rng = random.Random(seed)

        def jit(m: int, j: int = 12) -> int:
            return max(0, min(night, int(m) + rng.randint(-j, j)))

        blocks: list[dict] = []

        def add(eids, start, end, room, label):
            s = jit(start)
            e2 = jit(end)
            if e2 <= s:
                e2 = min(night, s + 20)
            for eid in eids:
                blocks.append({"eid": eid, "name": self.name_of(eid), "room": room,
                               "label": label, "start_min": s, "end_min": e2})

        ev_end = int(night * 0.42)
        living = roles.get("living") or roles.get("other") or roles.get("hall")
        if living:
            add(living, 15, ev_end, "living", "akşam")
        if roles.get("kitchen"):
            add(roles["kitchen"], 45, 80, "kitchen", "yemek")
        if roles.get("bath"):
            b = int(night * 0.30)
            add(roles["bath"], b, b + 12, "bath", "banyo")
        if roles.get("bedroom"):
            b0 = ev_end - 15
            add(roles["bedroom"], b0, b0 + 40, "bedroom", "yatma")
        if roles.get("office") and rng.random() < 0.85:
            add(roles["office"], int(night * 0.55), int(night * 0.80), "office", "gece")
        if roles.get("bath"):
            d = int(night * 0.72)
            add(roles["bath"], d, d + 9, "bath", "gece")
        dawn = roles.get("kitchen") or roles.get("bedroom") or living
        if dawn:
            add(dawn, night - 55, night - 15, "dawn", "sabah")

        # Boşluk doldur: gece boyu KARANLIK an olmasın. Bir ışık kapanınca bir
        # sonraki açılana kadar açık kalsın; ilk blok gün batımında, son blok
        # gün doğumunda kapansın. Union [0, night] sürekli olur.
        if blocks:
            blocks.sort(key=lambda b: b["start_min"])
            blocks[0]["start_min"] = 0
            holder = blocks[0]
            for b in blocks[1:]:
                if b["start_min"] > holder["end_min"]:
                    holder["end_min"] = b["start_min"]   # boşluğu önceki ışık kapatır
                if b["end_min"] > holder["end_min"]:
                    holder = b
            holder["end_min"] = night

        blocks.sort(key=lambda b: (b["start_min"], b["eid"]))
        return {
            "sunset": sunset.isoformat(),
            "sunrise": sunrise.isoformat(),
            "night_min": night,
            "blocks": blocks,
        }

    def _vac_plan_today(self, now: datetime) -> dict:
        """Günlük önbellek — plan gece boyu kararlı kalsın, tarih değişince tazelensin."""
        day = dt_util.as_local(now).date().toordinal()
        if getattr(self, "_vac_plan_day", None) != day or not getattr(self, "_vac_plan", None):
            self._vac_plan = self.vacation_plan(seed=day)
            self._vac_plan_day = day
        return self._vac_plan

    async def _vac_tick(self, now: datetime) -> None:
        now = dt_util.as_local(now) if now else dt_util.now()
        vc = self.config.get("vacation_cfg", {})
        lights = [e for e in (vc.get("sim_lights") or []) if e]
        if not lights:
            return
        sunset, sunrise = self._sun_window(now)
        # Gündüz / pencere dışı → her şey kapalı (bir kez), hiçbir taklit yok.
        if not (sunset and sunrise and sunset <= now < sunrise):
            for eid in lights:
                if self._sim_state.get(eid):
                    self._sim_state[eid] = False
                    await self._sim_set(eid, False)
            return
        # Kullanıcı planı sabitlediyse onu kullan; yoksa bugünün otomatik planı.
        blocks = vc.get("sim_plan") or self._vac_plan_today(now)["blocks"]
        mins = (now - sunset).total_seconds() / 60
        want = {eid: False for eid in lights}
        for b in blocks:
            if b.get("eid") in want and b["start_min"] <= mins < b["end_min"]:
                want[b["eid"]] = True
        for eid, w in want.items():
            if self._sim_state.get(eid) != w:
                self._sim_state[eid] = w
                await self._sim_set(eid, w)

    async def _sim_set(self, eid: str, on: bool) -> None:
        try:
            await self.hass.services.async_call(
                "light" if eid.startswith("light.") else "homeassistant",
                "turn_on" if on else "turn_off",
                {"entity_id": eid}, blocking=False,
            )
        except Exception as err:  # noqa: BLE001
            _LOGGER.warning("Sentinel: vacation sim %s failed: %s", eid, err)

    async def _sim_tick(self, now: datetime) -> None:
        now = dt_util.as_local(now) if now else dt_util.now()
        day = now.strftime("%Y-%m-%d")
        sims = self.config.get("vacation_cfg", {}).get("sim") or []
        if day != self._sim_day:
            # A new day: pick a fresh random offset per light so the pattern
            # never looks like a timer.
            self._sim_day = day
            self._sim_offsets = {}
            for item in sims:
                jitter = int(item.get("jitter") or 15)
                key = f"{item.get('entity')}|{item.get('on')}"
                self._sim_offsets[key] = random.randint(-jitter, jitter)

        minutes_now = now.hour * 60 + now.minute
        for item in sims:
            eid = item.get("entity")
            if not eid:
                continue
            key = f"{eid}|{item.get('on')}"
            off_min = self._sim_offsets.get(key, 0)
            start = _hhmm(item.get("on"), off_min)
            end = _hhmm(item.get("off"), off_min)
            if start is None or end is None:
                continue
            if start <= end:
                want = start <= minutes_now < end
            else:  # crosses midnight
                want = minutes_now >= start or minutes_now < end
            if self._sim_state.get(eid) == want:
                continue
            self._sim_state[eid] = want
            try:
                await self.hass.services.async_call(
                    "light" if eid.startswith("light.") else "homeassistant",
                    "turn_on" if want else "turn_off",
                    {"entity_id": eid},
                    blocking=False,
                )
            except Exception as err:  # noqa: BLE001
                _LOGGER.warning("Sentinel: simulation %s failed: %s", eid, err)


def _hhmm(value: str | None, offset_min: int = 0) -> int | None:
    """'19:30' -> minutes since midnight, with an offset applied."""
    if not value or ":" not in str(value):
        return None
    try:
        hh, mm = str(value).split(":")[:2]
        total = int(hh) * 60 + int(mm) + offset_min
    except ValueError:
        return None
    return total % (24 * 60)
