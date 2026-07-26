"""Sentinel Alarm — the alarm_control_panel entity and its state machine.

Flow:  disarmed -> (exit delay) arming -> armed_x
       armed_x  -> sensor qualifies -> (entry delay) pending -> triggered
       triggered -> trigger time elapsed -> back to armed_x
"""
from __future__ import annotations

import logging
import time
from datetime import timedelta

from homeassistant.components.alarm_control_panel import (
    AlarmControlPanelEntity,
    AlarmControlPanelEntityFeature,
)

try:  # HA 2024.11+ exposes these from the component root
    from homeassistant.components.alarm_control_panel import (
        AlarmControlPanelState,
        CodeFormat,
    )
except ImportError:  # pragma: no cover - older cores keep them in .const
    from homeassistant.components.alarm_control_panel.const import (  # type: ignore
        AlarmControlPanelState,
        CodeFormat,
    )
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.event import async_call_later, async_track_state_change_event
from homeassistant.helpers.restore_state import RestoreEntity
from homeassistant.util import dt as dt_util

from .const import DOMAIN, SIGNAL_CONFIG
from .engine import SentinelEngine

_LOGGER = logging.getLogger(__name__)

# Kod yanlış girilmeye devam ederse beklemeyi uzat. Sıfırlanmaz: her tur bir
# sonrakine geçer, doğru kod girilince başa döner. (Home Assistant yeniden
# başlarsa sıfırlanır — o da yönetici yetkisi ister.)
LOCKOUT_STEPS = (30, 120, 300, 900)

ARMED_STATE = {
    "home": AlarmControlPanelState.ARMED_HOME,
    "away": AlarmControlPanelState.ARMED_AWAY,
    "night": AlarmControlPanelState.ARMED_NIGHT,
    "vacation": AlarmControlPanelState.ARMED_VACATION,
}
STATE_MODE = {v: k for k, v in ARMED_STATE.items()}


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    engine: SentinelEngine = hass.data[DOMAIN]["engine"]
    panel = SentinelAlarmPanel(engine, entry)
    engine.entity = panel
    async_add_entities([panel])


class SentinelAlarmPanel(AlarmControlPanelEntity, RestoreEntity):
    """A single alarm panel driven entirely by the Sentinel config."""

    _attr_has_entity_name = False
    _attr_name = "Sentinel Alarm"
    _attr_icon = "mdi:shield-home"
    _attr_should_poll = False
    _attr_code_arm_required = False
    _attr_supported_features = (
        AlarmControlPanelEntityFeature.ARM_HOME
        | AlarmControlPanelEntityFeature.ARM_AWAY
        | AlarmControlPanelEntityFeature.ARM_NIGHT
        | AlarmControlPanelEntityFeature.ARM_VACATION
    )

    def __init__(self, engine: SentinelEngine, entry: ConfigEntry) -> None:
        self._engine = engine
        self._entry = entry
        self._attr_unique_id = f"{DOMAIN}_panel"
        self._state = AlarmControlPanelState.DISARMED
        self._mode = ""           # target arm mode while arming/armed
        self._changed_by = ""
        self._bad_code = 0
        self._lock_until = 0.0    # monotonik: bu ana kadar kod kabul edilmez
        self._lock_round = 0      # kaçıncı kilit turu — bekleme buna göre uzar
        self._trigger_source = ""
        self._trigger_eid = ""
        # Kart için: o an hangi geçici fazdayız ve ne zaman biter (geri sayım).
        self._phase = ""          # "arming" | "pending" | "triggered" | ""
        self._ends_at = None      # datetime — faz bitiş anı
        self._phase_total = 0     # saniye — geri sayım çubuğu için toplam

        # timers / listeners
        self._t_exit = None
        self._t_entry = None
        self._t_trigger = None
        self._pending: dict[str, callable] = {}   # sensor -> cancel cb (validity delay)
        self._armed_set: set[str] = set()          # sensors that can actually trip
        self._awaiting: dict[str, tuple] = {}      # sensor -> (confirmers, cancel cb)
        self._last_on: dict[str, float] = {}       # entity -> loop time it last went active
        self._unsub_sensors = None
        self._unsub_lights = None
        self._unsub_cfg = None
        self._unavail_seen: set[str] = set()

    # --------------------------------------------------------------- HA plumbing
    @property
    def alarm_state(self) -> AlarmControlPanelState:
        return self._state

    @property
    def code_format(self) -> CodeFormat | None:
        return CodeFormat.NUMBER if self._engine.config.get("code") else None

    @property
    def changed_by(self) -> str | None:
        return self._changed_by or None

    @property
    def device_info(self):
        return {
            "identifiers": {(DOMAIN, "panel")},
            "name": "Sentinel Alarm",
            "manufacturer": "Sentinel",
            "model": "Alarm Panel",
        }

    @property
    def extra_state_attributes(self) -> dict:
        mode = self._mode or STATE_MODE.get(self._state, "")
        open_now = [self._engine.name_of(e) for e in self._engine.blocked_sensors(mode or "away")]
        return {
            "mode": mode,
            "watched": len(self._engine.sensors_for(mode)) if mode else 0,
            "open_now": open_now,
            "open_count": len(open_now),
            "trigger_source": self._trigger_source,
            "trigger_eid": self._trigger_eid,
            "trigger_camera": (
                self._engine.trigger_camera(self._trigger_eid)
                if self._state == AlarmControlPanelState.TRIGGERED else ""
            ),
            "changed_by": self._changed_by,
            # Kart için canlı ekstralar:
            "phase": self._phase,
            "ends_at": self._ends_at.isoformat() if self._ends_at else "",
            "phase_total": self._phase_total,
            "room_sensors": self._engine.room_sensors(),
            "events": self._engine.recent_events(4),
            "language": self._engine.lang,
        }

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()

        if self._engine.config.get("restore", True):
            last = await self.async_get_last_state()
            if last and last.state not in (STATE_UNAVAILABLE, STATE_UNKNOWN):
                try:
                    restored = AlarmControlPanelState(last.state)
                except ValueError:
                    restored = None
                # Never come back from a reboot mid-siren; settle on the armed
                # mode instead so the house stays protected but stays quiet.
                if restored in STATE_MODE:
                    self._state = restored
                    self._mode = STATE_MODE[restored]
                elif restored in (
                    AlarmControlPanelState.TRIGGERED,
                    AlarmControlPanelState.PENDING,
                    AlarmControlPanelState.ARMING,
                ):
                    mode = (last.attributes or {}).get("mode") or "away"
                    self._mode = mode
                    self._state = ARMED_STATE.get(mode, AlarmControlPanelState.ARMED_AWAY)
                if self._mode:
                    self._engine.log(
                        "restore",
                        self._engine.msg("armed", self._engine.mode_name(self._mode)),
                        self._mode,
                    )

        self._unsub_cfg = async_dispatcher_connect(
            self.hass, SIGNAL_CONFIG, self._on_config_changed
        )
        self._start_watching()
        if self._mode == "vacation":
            self._engine.start_simulation()
        if self._is_armed():
            self._engine.start_night_lights()

    async def async_will_remove_from_hass(self) -> None:
        self._cancel_all()
        self._stop_watching()
        if self._unsub_cfg:
            self._unsub_cfg()
        self._engine.stop_simulation()

    @callback
    def _on_config_changed(self) -> None:
        """Panel saved new settings — rebuild the listeners without dropping state."""
        if self._is_armed():
            self._start_watching()
            if self._mode == "vacation":
                self._engine.start_simulation()
        self.async_write_ha_state()

    # ------------------------------------------------------------------ helpers
    def _is_armed(self) -> bool:
        return self._state in (
            AlarmControlPanelState.ARMED_HOME,
            AlarmControlPanelState.ARMED_AWAY,
            AlarmControlPanelState.ARMED_NIGHT,
            AlarmControlPanelState.ARMED_VACATION,
            AlarmControlPanelState.PENDING,
            AlarmControlPanelState.TRIGGERED,
        )

    def _check_code(self, code: str | None) -> None:
        """Validate the disarm code, and make guessing expensive.

        Without a wait between rounds a four-digit code is only ten thousand
        tries — worth nothing. Each time the attempt limit is reached the panel
        stops accepting codes for a while, and the wait grows with every round.
        """
        want = str(self._engine.config.get("code") or "")
        if not want:
            return

        now = time.monotonic()
        if now < self._lock_until:
            left = int(self._lock_until - now) + 1
            raise HomeAssistantError(
                f"Too many wrong codes. Try again in {left}s"
            )

        if str(code or "") == want:
            self._bad_code = 0
            self._lock_round = 0
            return

        self._bad_code += 1
        limit = int(self._engine.config.get("code_attempts") or 3)
        if self._bad_code >= limit:
            wait = LOCKOUT_STEPS[min(self._lock_round, len(LOCKOUT_STEPS) - 1)]
            self._lock_until = now + wait
            self._lock_round += 1
            self._bad_code = 0
            text = self._engine.msg("wrong_code", limit)
            self._engine.log("code", text)
            self.hass.async_create_task(
                self._engine.async_notify(text, critical=True, with_camera=True)
            )
            raise HomeAssistantError(f"Too many wrong codes. Try again in {wait}s")
        raise HomeAssistantError("Invalid alarm code")

    def _cancel_all(self) -> None:
        for attr in ("_t_exit", "_t_entry", "_t_trigger"):
            cancel = getattr(self, attr)
            if cancel:
                cancel()
            setattr(self, attr, None)
        for cancel in self._pending.values():
            cancel()
        self._pending.clear()
        for _confs, cancel in self._awaiting.values():
            cancel()
        self._awaiting.clear()

    def _stop_watching(self) -> None:
        if self._unsub_sensors:
            self._unsub_sensors()
            self._unsub_sensors = None
        if self._unsub_lights:
            self._unsub_lights()
            self._unsub_lights = None
        self._unavail_seen.clear()
        self._last_on.clear()

    def _start_watching(self) -> None:
        """(Re)subscribe to the sensors and lights that matter for this mode."""
        self._stop_watching()
        if not self._mode:
            return
        sensors = self._engine.sensors_for(self._mode)
        self._armed_set = set(sensors)
        # Confirmers may live outside the armed set (e.g. an entrance motion that
        # backs a back-of-room presence) — we still need their state changes.
        watch = list(sensors)
        seen = set(watch)
        for eid in sensors:
            for conf in self._engine.confirmers_for(eid):
                if conf not in seen:
                    seen.add(conf)
                    watch.append(conf)
        if watch:
            self._unsub_sensors = async_track_state_change_event(
                self.hass, watch, self._sensor_event
            )
        if self._engine.config.get("light_guard", True):
            lights = [l for l in (self._engine.config.get("lights") or []) if l]
            if self._mode == "vacation":
                # Lights used for the "somebody is home" act must not fight
                # the light guard.
                sim = set(self._engine.sim_entities())
                lights = [l for l in lights if l not in sim]
            if lights:
                self._unsub_lights = async_track_state_change_event(
                    self.hass, lights, self._light_event
                )

    # ------------------------------------------------------------------ arming
    async def async_alarm_arm_home(self, code: str | None = None) -> None:
        await self._async_arm("home", code)

    async def async_alarm_arm_away(self, code: str | None = None) -> None:
        await self._async_arm("away", code)

    async def async_alarm_arm_night(self, code: str | None = None) -> None:
        await self._async_arm("night", code)

    async def async_alarm_arm_vacation(self, code: str | None = None) -> None:
        await self._async_arm("vacation", code)

    async def async_arm_mode(self, mode: str, bypass_open: bool = False,
                             code: str | None = None) -> None:
        """Entry point used by the panel / sentinel_alarm.arm service.

        `code` is whatever the caller supplied. It is passed through so the
        usual check applies; handing over the stored code here would make the
        code protection meaningless for anyone able to call the service.
        """
        if mode == "disarm":
            await self.async_alarm_disarm(code)
            return
        await self._async_arm(mode, code, bypass_open=bypass_open)

    async def _async_arm(self, mode: str, code: str | None, bypass_open: bool = False) -> None:
        if self._engine.config.get("code") and self.code_arm_required:
            self._check_code(code)

        blocked = self._engine.blocked_sensors(mode)
        if blocked and not bypass_open:
            names = ", ".join(self._engine.name_of(e) for e in blocked)
            text = self._engine.msg("blocked", names)
            self._engine.log("blocked", text, mode)
            if self._engine.config.get("warn_on_blocked", True):
                await self._engine.async_tts(text)
                await self._engine.async_notify(text)
            raise HomeAssistantError(text)

        self._cancel_all()
        self._mode = mode
        self._trigger_source = ""
        self._changed_by = "panel"
        self._bad_code = 0
        # Çıkış süresi bittiğinde tekrar bakacağız; kullanıcı burada bilerek
        # baypas ettiyse orada da baypas edelim, yoksa kendi isteğini geri almış
        # oluruz.
        self._bypass_open = bypass_open

        exit_delay = self._engine.timings(mode)["exit"]
        if exit_delay > 0:
            self._state = AlarmControlPanelState.ARMING
            self._phase = "arming"
            self._phase_total = exit_delay
            self._ends_at = dt_util.now() + timedelta(seconds=exit_delay)
            self.async_write_ha_state()
            # Çıkış gecikmesi başladı — "kurulurken" eylemleri şimdi çalışır.
            self._engine.run_actions("arming", mode=mode)
            self._t_exit = async_call_later(self.hass, exit_delay, self._finish_arming)
        else:
            self._finish_arming(None)

    @callback
    def _finish_arming(self, _now) -> None:
        self._t_exit = None
        self._phase = ""
        self._ends_at = None

        # Çıkışta bir kapı açık bırakıldıysa kurma. `_start_watching` yalnızca
        # bundan sonraki durum değişimlerine abone olur, o yüzden hâlihazırda
        # açık duran bir kapı hiç kapanıp açılmazsa alarmı tetiklemezdi: sistem
        # kurulu görünür ama o kapıyı korumazdı. Sessizce baypas etmektense
        # kurmayı bırakıp haber vermek daha dürüst.
        if not getattr(self, "_bypass_open", False):
            blocked = self._engine.blocked_sensors(self._mode)
            if blocked:
                names = ", ".join(self._engine.name_of(e) for e in blocked)
                text = self._engine.msg("exit_fault", names)
                mode = self._mode
                self._engine.log("blocked", text, mode)
                self._mode = ""
                self._state = AlarmControlPanelState.DISARMED
                self._engine.stop_beeps()
                self._engine.cancel_actions()
                if self._engine.config.get("warn_on_blocked", True):
                    self.hass.async_create_task(self._engine.async_tts(text))
                    self.hass.async_create_task(self._engine.async_notify(text))
                self.async_write_ha_state()
                return

        self._state = ARMED_STATE.get(self._mode, AlarmControlPanelState.ARMED_AWAY)
        self._start_watching()
        if self._mode == "vacation":
            self._engine.start_simulation()
        else:
            self._engine.stop_simulation()
        self._engine.log(
            "armed", self._engine.msg("armed", self._engine.mode_name(self._mode)), self._mode
        )
        # Önce evi süpür (tüm ışıkları kapat), sonra gece ışıklarını yak —
        # süpürme gece ışıklarına zaten dokunmuyor ama sıra da doğru olsun.
        self.hass.async_create_task(self._engine.sweep_lights_off(self._mode))
        self._engine.start_night_lights()
        self._engine.run_actions("arm", mode=self._mode)
        self.async_write_ha_state()

    # ----------------------------------------------------------------- disarming
    async def async_alarm_disarm(self, code: str | None = None) -> None:
        self._check_code(code)
        was_triggered = self._state == AlarmControlPanelState.TRIGGERED
        # Hangi moddan çıkıyoruz? Moda özel KAPANINCA adımları (disarm_sleep…)
        # bunu ister — aşağıda _mode temizlendiği için şimdi saklıyoruz.
        was_mode = self._mode or STATE_MODE.get(self._state, "")
        self._cancel_all()
        self._stop_watching()
        self._engine.stop_simulation()
        self._engine.stop_night_lights()
        # Zinciri durdur ve alarm ışıklarını normale döndür. Kullanıcı
        # "tamamlansın" derse zincir kendi temizlik adımlarıyla bitsin.
        if self._engine.config.get("stop_actions_on_disarm", True):
            # settle=False: resolve_flash_for_disarm alone decides the final light
            # state — otherwise _settle_flash races it and can leave lights red on.
            self._engine.cancel_actions(settle=False)
            self._engine.resolve_flash_for_disarm()
        if was_triggered:
            await self._engine.async_siren(False)
        self._state = AlarmControlPanelState.DISARMED
        self._mode = ""
        self._trigger_source = ""
        self._phase = ""
        self._ends_at = None
        self._changed_by = "panel"
        self._engine.log("disarmed", self._engine.msg("disarmed"))
        self._engine.run_actions("disarm", mode=was_mode)
        self.async_write_ha_state()

    # ------------------------------------------------------------ sensor events
    @callback
    def _sensor_event(self, event) -> None:
        if not self._is_armed():
            return
        eid = event.data["entity_id"]
        new = event.data.get("new_state")
        if new is None:
            return

        armed = eid in self._armed_set

        # --- sensor dropped off the network while armed
        if new.state == STATE_UNAVAILABLE:
            if armed and self._engine.config.get("unavail_watch", True) and self._engine.sensor_cfg(eid)["unavail"]:
                if eid not in self._unavail_seen:
                    self._unavail_seen.add(eid)
                    text = self._engine.msg("unavailable", self._engine.name_of(eid))
                    self._engine.log("unavailable", text, self._mode, eid)
                    self.hass.async_create_task(self._engine.async_notify(text))
            self._cancel_pending(eid)
            return
        self._unavail_seen.discard(eid)

        if not self._engine.is_active(eid, new.state):
            # Went quiet again — a presence sensor that only blipped never
            # reaches its validity delay, which is the whole point.
            self._cancel_pending(eid)
            return

        # This entity is active — remember when, so a confirmation can look back a
        # few seconds ("motion fired, then presence built up").
        self._last_on[eid] = self.hass.loop.time()
        # If someone is waiting on this entity as a confirmer, settle it now.
        self._resolve_confirmers(eid)

        if not armed:
            # A pure confirmer (not itself guarding this mode) never trips.
            return

        if self._state == AlarmControlPanelState.TRIGGERED:
            return

        delay = self._engine.sensor_cfg(eid)["delay"]
        if delay <= 0:
            self._qualified(eid)
            return
        if eid in self._pending:
            return
        self._pending[eid] = async_call_later(
            self.hass, delay, lambda _n, e=eid: self._delay_elapsed(e)
        )

    @callback
    def _cancel_pending(self, eid: str) -> None:
        cancel = self._pending.pop(eid, None)
        if cancel:
            cancel()

    @callback
    def _delay_elapsed(self, eid: str) -> None:
        self._pending.pop(eid, None)
        if self._engine.is_active(eid) and self._is_armed():
            self._qualified(eid)

    @callback
    def _confirmer_active(self, confirmers: list[str], window: float) -> bool:
        """Is at least one confirmer on now, or was it on within `window` secs?"""
        now = self.hass.loop.time()
        for conf in confirmers:
            if self._engine.is_active(conf):
                return True
            t = self._last_on.get(conf)
            if t is not None and (now - t) <= window:
                return True
        return False

    @callback
    def _resolve_confirmers(self, conf_eid: str) -> None:
        """`conf_eid` just went active — release any sensor waiting on it."""
        for waiter, (confirmers, cancel) in list(self._awaiting.items()):
            if conf_eid not in confirmers:
                continue
            # The waiting sensor must still be active — presence + motion have to
            # overlap, not merely take turns.
            if not self._engine.is_active(waiter):
                continue
            cancel()
            self._awaiting.pop(waiter, None)
            self._fire_qualified(waiter)

    @callback
    def _drop_await(self, eid: str) -> None:
        """Confirmation window expired with no backup — the trip is discarded."""
        entry = self._awaiting.pop(eid, None)
        if entry:
            self._engine.log(
                "unconfirmed",
                self._engine.msg("unconfirmed", self._engine.name_of(eid)),
                self._mode,
                eid,
            )

    @callback
    def _qualified(self, eid: str) -> None:
        """A sensor passed its validity delay — check confirmation, then arm the trip."""
        if self._state in (AlarmControlPanelState.PENDING, AlarmControlPanelState.TRIGGERED):
            return
        cfg = self._engine.sensor_cfg(eid)
        if cfg["confirm"]:
            confirmers = self._engine.confirmers_for(eid)
            window = cfg["confirm_window"]
            if confirmers and not self._confirmer_active(confirmers, window):
                # Hold the trip open for `window` secs; a confirmer firing in that
                # time releases it, otherwise _drop_await quietly discards it.
                if eid not in self._awaiting:
                    cancel = async_call_later(
                        self.hass, window, lambda _n, e=eid: self._drop_await(e)
                    )
                    self._awaiting[eid] = (confirmers, cancel)
                return
        self._fire_qualified(eid)

    @callback
    def _fire_qualified(self, eid: str) -> None:
        """Confirmation cleared — start the entry delay or fire now."""
        if self._state in (AlarmControlPanelState.PENDING, AlarmControlPanelState.TRIGGERED):
            return
        self._trigger_source = self._engine.name_of(eid)
        self._trigger_eid = eid
        entry_delay = self._engine.timings(self._mode)["entry"]
        if self._engine.sensor_cfg(eid)["entry"] and entry_delay > 0:
            self._state = AlarmControlPanelState.PENDING
            self._phase = "pending"
            self._phase_total = entry_delay
            self._ends_at = dt_util.now() + timedelta(seconds=entry_delay)
            self.async_write_ha_state()
            text = self._engine.msg("entry", entry_delay)
            self._engine.log("entry", text, self._mode, eid)
            # GİRİŞ SÜRESİ eylemleri varsa onlar çalışsın; zincir konuşmuyorsa
            # yerleşik anons yine devreye girer (iki kez konuşmasın diye).
            if self._engine.action_steps("entry", self._mode):
                self._engine.run_actions("entry", eid=eid, mode=self._mode)
            if not self._engine.covers("entry", "speak", self._mode):
                self.hass.async_create_task(self._engine.async_tts(text))
            self._t_entry = async_call_later(self.hass, entry_delay, self._fire)
        else:
            self._fire(None)

    @callback
    def _fire(self, _now) -> None:
        self._t_entry = None
        self.hass.async_create_task(self._async_fire())

    async def _async_fire(self) -> None:
        if self._state == AlarmControlPanelState.TRIGGERED or not self._is_armed():
            return
        self._state = AlarmControlPanelState.TRIGGERED
        secs = self._engine.timings(self._mode)["trigger"]
        self._phase = "triggered"
        self._phase_total = secs
        self._ends_at = dt_util.now() + timedelta(seconds=secs)
        self.async_write_ha_state()

        eid = getattr(self, "_trigger_eid", "")
        text = self._engine.build_alert(eid, self._mode)
        self._engine.log("triggered", text, self._mode)
        # Kendi eylem zincirin bu işi zaten yapıyorsa yerleşik olan susar —
        # yoksa iki bildirim / iki ses birden gider.
        if not self._engine.covers("trigger", "notify", self._mode):
            await self._engine.async_notify(
                text, with_camera=True, critical=True,
                cameras=self._engine.cameras_for_trigger(eid),
            )
        if not self._engine.covers("trigger", "speak", self._mode):
            # Speak first and wait for it, then let the siren rip — otherwise the
            # siren starts on top of the announcement and nobody hears a word.
            await self._engine.async_tts(text)
        if not self._engine.covers("trigger", "sound", self._mode):
            await self._engine.async_siren(True)
        self._engine.run_actions("trigger", eid=eid, mode=self._mode)

        self._t_trigger = async_call_later(self.hass, secs, self._trigger_done)

    @callback
    def _trigger_done(self, _now) -> None:
        self._t_trigger = None
        self.hass.async_create_task(self._async_trigger_done())

    async def _async_trigger_done(self) -> None:
        await self._engine.async_siren(False)
        if self._state != AlarmControlPanelState.TRIGGERED:
            return
        # Siren time is over but nobody disarmed: go back to watching.
        self._state = ARMED_STATE.get(self._mode, AlarmControlPanelState.ARMED_AWAY)
        self._trigger_source = ""
        self._phase = ""
        self._ends_at = None
        self.async_write_ha_state()

    # ------------------------------------------------------------- light guard
    @callback
    def _light_event(self, event) -> None:
        if not self._is_armed():
            return
        new = event.data.get("new_state")
        old = event.data.get("old_state")
        if not new or new.state != "on":
            return
        if old is not None and old.state == "on":
            return  # brightness change, not a switch-on
        eid = event.data["entity_id"]
        text = self._engine.msg("light_off", self._engine.name_of(eid))
        self._engine.log("light", text, self._mode, eid)
        self.hass.async_create_task(
            self.hass.services.async_call(
                "homeassistant", "turn_off", {"entity_id": eid}, blocking=False
            )
        )
