"""The Sentinel Alarm integration.

A full alarm system for Home Assistant that is configured entirely from its own
sidebar panel: zones (drag & drop, straight out of the room map), per-sensor
validity delays, arm modes with sliders, notifications with camera snapshots,
TTS warnings, a light guard and a vacation presence simulation.

Panel = where you define things, Home Assistant = the engine that runs them.
"""
from __future__ import annotations

import logging
import os
import time

import voluptuous as vol

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import HomeAssistantView, StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.start import async_at_start
from homeassistant.helpers.storage import Store
from homeassistant.util import slugify

from .const import (
    CARD_VERSION,
    DOMAIN,
    FRONTEND_URL_BASE,
    FRONTEND_VERSION,
    MODES,
    PLATFORMS,
    SIGNAL_CONFIG,
    STORE_KEY,
    STORE_VERSION,
)
from .engine import SentinelEngine

_LOGGER = logging.getLogger(__name__)


def _is_admin(request) -> bool:
    """Yalnızca yönetici.

    Panel ayarları alarm kodunu ve TTS anahtarlarını taşır, `run_steps` ise
    serbest servis çağrısı yapabilir. `requires_auth` tek başına yetmez —
    o sadece "giriş yapmış biri" demek. Burada yöneticiyi şart koşuyoruz.
    """
    user = request.get("hass_user")
    return bool(user and user.is_admin)


class SentinelConfigView(HomeAssistantView):
    """Read/write the panel configuration (JSON, session required)."""

    url = "/api/sentinel_alarm/config"
    name = "api:sentinel_alarm:config"
    requires_auth = True

    def __init__(self, engine: SentinelEngine) -> None:
        self._engine = engine

    async def get(self, request):
        if not _is_admin(request):
            return self.json_message("Admin required", status_code=403)
        return self.json(self._engine.config)

    async def post(self, request):
        if not _is_admin(request):
            return self.json_message("Admin required", status_code=403)
        try:
            body = await request.json()
        except ValueError:
            return self.json_message("Invalid JSON", status_code=400)
        if not isinstance(body, dict):
            return self.json_message("Expected an object", status_code=400)
        await self._engine.async_save(body)
        # Saat programı / kişi listesi değişmiş olabilir — dinleyicileri yenile.
        self._engine.setup_auto()
        async_dispatcher_send(self._engine.hass, SIGNAL_CONFIG)
        return self.json({"ok": True})


class SentinelEventsView(HomeAssistantView):
    """The event log the panel shows on its dashboard tab."""

    url = "/api/sentinel_alarm/events"
    name = "api:sentinel_alarm:events"
    requires_auth = True

    def __init__(self, engine: SentinelEngine) -> None:
        self._engine = engine

    async def get(self, request):
        if not _is_admin(request):
            return self.json_message("Admin required", status_code=403)
        # Panel bunu düzenli okuyor; ilerlemeyi de buraya koyarsak ayrı istek
        # gerekmez. `elapsed` monotonik saatten hesaplanır.
        engine = self._engine
        prog = dict(engine.progress or {})
        if prog.get("running"):
            now = time.monotonic()
            if prog.get("started") is not None:
                prog["elapsed"] = round(now - prog["started"], 1)
            if prog.get("step_started") is not None:
                prog["step_elapsed"] = round(now - prog["step_started"], 1)
            prog.pop("started", None)
            prog.pop("step_started", None)
        return self.json({
            "events": engine.events,
            "progress": prog,
            "last_run": engine.last_run,
            "runs": engine.runs,
        })

    async def delete(self, request):
        if not _is_admin(request):
            return self.json_message("Admin required", status_code=403)
        self._engine.events.clear()
        await self._engine.events_store.async_save({"events": []})
        return self.json({"ok": True})


class SentinelBackupView(HomeAssistantView):
    """Previous versions of the configuration, so an edit can be undone."""

    url = "/api/sentinel_alarm/backups"
    name = "api:sentinel_alarm:backups"
    requires_auth = True

    def __init__(self, engine: SentinelEngine) -> None:
        self._engine = engine

    async def get(self, request):
        if not _is_admin(request):
            return self.json_message("Admin required", status_code=403)
        return self.json({"backups": self._engine.backup_list()})

    async def post(self, request):
        if not _is_admin(request):
            return self.json_message("Admin required", status_code=403)
        try:
            body = await request.json()
        except ValueError:
            return self.json_message("Invalid JSON", status_code=400)
        try:
            index = int(body.get("index"))
        except (TypeError, ValueError):
            return self.json_message("index required", status_code=400)
        if not await self._engine.async_restore_backup(index):
            return self.json_message("No such backup", status_code=404)
        async_dispatcher_send(self._engine.hass, SIGNAL_CONFIG)
        return self.json({"ok": True})


class SentinelActionView(HomeAssistantView):
    """Arm / disarm / test actions triggered from the panel."""

    url = "/api/sentinel_alarm/action"
    name = "api:sentinel_alarm:action"
    requires_auth = True

    def __init__(self, engine: SentinelEngine) -> None:
        self._engine = engine

    async def post(self, request):
        if not _is_admin(request):
            return self.json_message("Admin required", status_code=403)
        try:
            body = await request.json()
        except ValueError:
            return self.json_message("Invalid JSON", status_code=400)
        action = str(body.get("action") or "")
        entity = self._engine.entity
        if entity is None:
            return self.json_message("Alarm entity not ready", status_code=503)

        try:
            if action == "arm":
                mode = str(body.get("mode") or "away")
                if mode not in MODES:
                    return self.json_message("Unknown mode", status_code=400)
                await entity.async_arm_mode(mode, bool(body.get("bypass")))
            elif action == "disarm":
                # Kodu isteği yapan verir; doğrulamayı entity yapar. Bu uç artık
                # yönetici istiyor ve yönetici kodu ayarlarda zaten görebiliyor,
                # bu yüzden kod göndermediyse geçmesine izin veriyoruz. Kod
                # koruması ev halkı içindir ve kart üzerinden işler — kart
                # `alarm_control_panel.alarm_disarm` çağırır, kodu oraya yazar.
                await entity.async_alarm_disarm(
                    body.get("code") or self._engine.config.get("code") or None
                )
            elif action == "test_sound":
                await self._engine.async_siren(True)
            elif action == "stop_sound":
                await self._engine.async_siren(False)
            elif action == "test_tts":
                await self._engine.async_tts(
                    body.get("message") or self._engine.msg("blocked", "Test")
                )
            elif action == "run_actions":
                key = str(body.get("key") or "trigger")
                # Test butonu: gerçek tetik yok, temsili bir sensör ver.
                eid = self._engine.sample_trigger_eid() if key == "trigger" else ""
                # Panelde bir mod sekmesi seçiliyse o modun adımları da çalışsın.
                mode = str(body.get("mode") or "away")
                self._engine.run_actions(key, eid=eid, mode=mode)
            elif action == "run_steps":
                steps = body.get("steps")
                if not isinstance(steps, list):
                    return self.json_message("steps must be a list", status_code=400)
                # İsteği yapanın context'i: serbest `service` adımı onun adına
                # çağrılsın, anonim değil.
                self._engine.run_step_list(steps, context=self.context(request))
            elif action == "stop_actions":
                self._engine.cancel_actions()
            elif action == "test_notify":
                await self._engine.async_notify(
                    body.get("message") or "Sentinel Alarm test", with_camera=True
                )
            elif action == "preview_alert":
                # Panel'in canlı önizlemesi: seçilen bir sensöre göre metni kur.
                eid = body.get("eid") or self._engine.sample_trigger_eid()
                mode = str(body.get("mode") or "away")
                cams = self._engine.cameras_for_trigger(eid)
                return self.json({
                    "ok": True,
                    "message": self._engine.build_alert(eid, mode),
                    "cameras": [self._engine.name_of(c) for c in cams],
                })
            elif action == "vacation_plan":
                # Tatil sekmesi timeline'ı: bu gecenin (ya da örnek) planı.
                seed = body.get("seed")
                seed = int(seed) if seed is not None else None
                return self.json({"ok": True, "plan": self._engine.vacation_plan(seed)})
            else:
                return self.json_message("Unknown action", status_code=400)
        except Exception as err:  # noqa: BLE001 - report it to the panel, don't 500
            return self.json({"ok": False, "error": str(err)})
        return self.json({"ok": True})


AUDIO_EXT = (".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac")
# TTS caches live in www too and would bury the real sounds under hundreds of
# generated clips — keep them out of the picker.
SKIP_DIRS = {"alexa_tts", "tts", "tts_cache", "tts_ai", "community", "png"}
MAX_UPLOAD = 25 * 1024 * 1024  # 25 MB — a siren is never bigger than this


class SentinelMediaView(HomeAssistantView):
    """List and receive the sound files the panel can play."""

    url = "/api/sentinel_alarm/media"
    name = "api:sentinel_alarm:media"
    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass

    def _scan(self) -> list[dict]:
        root = self._hass.config.path("www")
        found: list[dict] = []
        if not os.path.isdir(root):
            return found
        for folder, dirs, files in os.walk(root):
            dirs[:] = [d for d in dirs if d.lower() not in SKIP_DIRS and not d.startswith(".")]
            rel_dir = os.path.relpath(folder, root)
            if rel_dir.startswith("."):
                continue
            for fname in files:
                if not fname.lower().endswith(AUDIO_EXT):
                    continue
                rel = fname if rel_dir == "." else f"{rel_dir}/{fname}"
                rel = rel.replace(os.sep, "/")
                try:
                    size = os.path.getsize(os.path.join(folder, fname))
                except OSError:
                    size = 0
                found.append({"name": rel, "url": f"/local/{rel}", "size": size})
            if len(found) > 400:
                break
        found.sort(key=lambda f: f["name"].lower())
        return found

    async def get(self, request):
        if not _is_admin(request):
            return self.json_message("Admin required", status_code=403)
        files = await self._hass.async_add_executor_job(self._scan)
        return self.json({"files": files})

    async def post(self, request):
        if not _is_admin(request):
            return self.json_message("Admin required", status_code=403)
        """Accept a dropped audio file and store it under www/sentinel."""
        try:
            data = await request.post()
        except Exception:  # noqa: BLE001
            return self.json_message("Bad upload", status_code=400)

        field = data.get("file")
        if field is None or not hasattr(field, "filename"):
            return self.json_message("No file", status_code=400)

        raw_name = os.path.basename(field.filename or "")
        stem, ext = os.path.splitext(raw_name)
        if ext.lower() not in AUDIO_EXT:
            return self.json_message("Only audio files are allowed", status_code=400)
        safe = f"{slugify(stem) or 'sound'}{ext.lower()}"

        payload = field.file.read(MAX_UPLOAD + 1)
        if len(payload) > MAX_UPLOAD:
            return self.json_message("File too large", status_code=413)

        folder = self._hass.config.path("www", "sentinel")

        def _save() -> str:
            os.makedirs(folder, exist_ok=True)
            target = os.path.join(folder, safe)
            base, dot_ext = os.path.splitext(target)
            n = 2
            while os.path.exists(target):
                target = f"{base}_{n}{dot_ext}"
                n += 1
            with open(target, "wb") as fh:
                fh.write(payload)
            return os.path.basename(target)

        try:
            stored = await self._hass.async_add_executor_job(_save)
        except OSError as err:
            return self.json_message(f"Could not save: {err}", status_code=500)

        return self.json({"ok": True, "url": f"/local/sentinel/{stored}", "name": stored})


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Sentinel Alarm from a config entry."""
    domain_data = hass.data.setdefault(DOMAIN, {})

    engine: SentinelEngine | None = domain_data.get("engine")
    if engine is None:
        store = Store(hass, STORE_VERSION, STORE_KEY)
        engine = SentinelEngine(hass, store)
        await engine.async_load()
        domain_data["engine"] = engine

    if not domain_data.get("frontend_registered"):
        frontend_dir = os.path.join(os.path.dirname(__file__), "frontend")
        await hass.http.async_register_static_paths(
            [StaticPathConfig(FRONTEND_URL_BASE, frontend_dir, False)]
        )
        hass.http.register_view(SentinelConfigView(engine))
        hass.http.register_view(SentinelEventsView(engine))
        hass.http.register_view(SentinelActionView(engine))
        hass.http.register_view(SentinelMediaView(hass))
        hass.http.register_view(SentinelBackupView(engine))

        # Lovelace kartını hem ekstra modül (kart seçici) hem de gerçek
        # RESOURCE olarak kaydet — böylece elle "kaynak ekle" yapmadan yüklenir.
        card_url = f"{FRONTEND_URL_BASE}/sentinel-alarm-card-{CARD_VERSION}.js"
        try:
            frontend.add_extra_js_url(hass, card_url)
        except Exception:  # noqa: BLE001
            pass

        async def _card_at_start(_hass: HomeAssistant) -> None:
            await _register_card_resource(hass, card_url)

        async_at_start(hass, _card_at_start)

        try:
            await panel_custom.async_register_panel(
                hass,
                frontend_url_path="sentinel-alarm",
                webcomponent_name="sentinel-alarm-panel",
                module_url=f"{FRONTEND_URL_BASE}/sentinel-alarm-panel-{FRONTEND_VERSION}.js",
                sidebar_title="Sentinel",
                sidebar_icon="mdi:shield-home",
                # Panel, alarm kodunu ve TTS anahtarlarını gösterir; yalnızca
                # yöneticiler görsün. Ev halkı alarmı karttan kurar/kapatır.
                require_admin=True,
            )
        except ValueError:
            pass  # already registered (entry reload)

        _register_services(hass, engine)
        engine.setup_notify_actions()
        domain_data["frontend_registered"] = True

    # Saat programı / kişi takibi — config değişiminde de yeniden kurulur.
    engine.setup_auto()

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def _register_card_resource(hass: HomeAssistant, url: str) -> None:
    """Register the Lovelace card as a resource so users don't add it by hand.

    Works in storage (UI) mode; YAML-managed resources are read-only and left
    alone (the extra-module-url fallback still exposes the card there).
    """
    lovelace = hass.data.get("lovelace")
    resources = getattr(lovelace, "resources", None)
    if resources is None and isinstance(lovelace, dict):
        resources = lovelace.get("resources")
    # YAML-mode resource stores have no create/update — skip silently.
    if resources is None or not hasattr(resources, "async_create_item"):
        return
    try:
        if not getattr(resources, "loaded", True):
            await resources.async_load()
            resources.loaded = True
        base = f"{FRONTEND_URL_BASE}/sentinel-alarm-card-"
        for item in resources.async_items():
            if base in (item.get("url") or ""):
                if item.get("url") != url:
                    await resources.async_update_item(
                        item["id"], {"res_type": "module", "url": url}
                    )
                return
        await resources.async_create_item({"res_type": "module", "url": url})
    except Exception as err:  # noqa: BLE001
        _LOGGER.warning("Sentinel: card resource not registered (%s)", err)


def _register_services(hass: HomeAssistant, engine: SentinelEngine) -> None:
    """sentinel_alarm.arm — arm a mode, optionally ignoring open contacts."""

    async def _arm(call: ServiceCall) -> None:
        entity = engine.entity
        if entity is None:
            raise RuntimeError("Sentinel Alarm entity is not ready yet")
        await entity.async_arm_mode(
            call.data["mode"],
            call.data.get("bypass_open", False),
            code=call.data.get("code"),
        )

    hass.services.async_register(
        DOMAIN,
        "arm",
        _arm,
        schema=vol.Schema(
            {
                vol.Required("mode"): vol.In(MODES + ["disarm"]),
                vol.Optional("bypass_open", default=False): cv.boolean,
                vol.Optional("code"): cv.string,
            }
        ),
    )


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry. The panel and static paths stay (harmless)."""
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
