"""Constants for the Sentinel Alarm integration."""

DOMAIN = "sentinel_alarm"

# Static path the frontend files are served from.
FRONTEND_URL_BASE = "/sentinel_alarm_frontend"

# Bump on every frontend change — the version lives in the FILE NAME (not ?v=)
# so service workers / browser caches are forced to fetch the fresh file.
FRONTEND_VERSION = "1.14.0"

# Lovelace custom card ships with the integration; version lives in the file
# name so browser caches fetch the fresh file after an update.
CARD_VERSION = "1.1.0"

STORE_VERSION = 1
STORE_KEY = "sentinel_alarm_config"

# Panel config changed -> engine + entity reload themselves.
SIGNAL_CONFIG = f"{DOMAIN}_config_updated"
# A new log entry was written -> panel refreshes.
SIGNAL_EVENT = f"{DOMAIN}_event"

PLATFORMS = ["alarm_control_panel", "tts"]

# Arming modes the panel offers. "night" is surfaced as a *category* in the UI
# ("Uyku" / "Sleep") but is a real HA arm mode underneath.
MODES = ["home", "away", "night", "vacation"]

# How many log entries we keep.
MAX_EVENTS = 120

DEFAULT_MODE_TIMINGS = {
    "home": {"exit": 0, "entry": 45, "trigger": 180},
    "away": {"exit": 60, "entry": 45, "trigger": 300},
    "night": {"exit": 0, "entry": 45, "trigger": 180},
    "vacation": {"exit": 60, "entry": 45, "trigger": 300},
}

DEFAULT_CONFIG = {
    "lang": "en",
    "code": "",
    "code_attempts": 3,
    "restore": True,
    "warn_on_blocked": True,
    "unavail_watch": True,
    "light_guard": True,
    "modes": DEFAULT_MODE_TIMINGS,
    # entity_id -> {"delay": seconds, "unavail": bool, "entry": bool}
    "sensors": {},
    # mode -> [entity_id, ...]
    "assign": {"home": [], "away": [], "night": [], "vacation": []},
    "lights": [],
    "media_player": "",
    "alarm_sound": "",
    "sound_type": "music",
    "volume": 85,
    "tts_service": "",
    "tts_target": "",
    # Anons öncesi hoparlörün sesi bu seviyeye çekilir, anons bitince eski
    # haline döner. 0 = dokunma (sessizde kalan tablet anonsu yutar).
    "tts_volume": 80,
    "notify": [],
    "cameras": [],
    # Optional Telegram chat/group id — when set, photos and texts go there
    # instead of the bot's default chat. Group ids are negative numbers.
    "telegram_chat": "",
    "notify_msg": {
        "format": "alert",           # short | alert | calm | custom
        "custom": "",
        "room_camera": True,         # snapshot the triggering room's camera
        "include": {
            "room": True,
            "sensor": True,
            "time": True,
            "mode": False,
            "open": False,
        },
    },
    "critical": True,
    # sim_enabled + sim_lights: yeni otomatik "insan var" simülasyonu
    # (güneş battıktan doğana kadar, oda rollerine göre insansı program).
    # "sim" eski manuel saat listesi — geriye uyumluluk için duruyor.
    # sim_plan: kullanıcının düzenlediği/sabitlediği gece programı (sunset'e
    # göre dakika blokları). Boşsa her gece otomatik üretilir.
    "vacation_cfg": {"bypass": [], "sim": [], "sim_enabled": False,
                     "sim_lights": [], "sim_plan": []},
    # What should happen, step by step, on each event. Empty by default —
    # the siren and the notification are separate and always run.
    "actions": {"trigger": [], "arming": [], "entry": [], "arm": [], "disarm": []},
    # Kendi AI TTS'in için API anahtarları (HA entegrasyonuna gerek kalmadan).
    # provider/token eski alanlar — geriye uyumluluk için tutulmaz, yenisi bu.
    "ai": {"openai": "", "gemini": ""},
    # Otomatik kurulum: saate göre program + kişiler evden ayrılınca/gelince.
    "auto": {
        # [{id, time:"23:30", mode:"night", days:[0..6], enabled:true}]
        "schedules": [],
        "leave": {"enabled": False, "persons": [], "mode": "away", "delay": 5},
        "arrive": {"enabled": False, "persons": []},
        # Bir cihaz açılınca/kapanınca kur ya da kapat:
        # [{id, entity, state:"on"|"off", mode:"away"|…|"disarm", delay, enabled}]
        "triggers": [],
        # Alarm kurulunca evdeki TÜM ışıkları kapat (gece ışıkları hariç).
        "lights_off": {"enabled": False, "modes": [], "except": []},
    },
    # Uyku gece ışıkları: kurulunca yanar, gün doğunca söner.
    "night_lights": {
        "enabled": False,
        "modes": ["night"],
        "lights": [],
        "brightness": 15,
        "color": None,
        # Gün batımına göre dakika blokları — Tatil'deki gibi sürüklenebilir.
        # [{eid, start_min, end_min}] ; boşsa ışıklar tüm gece açık sayılır.
        "plan": [],
    },
    # Bildirimde "Kapat" düğmesi (companion app aksiyonu).
    "notify_actions": True,
    # Alarm kapatılınca çalışan eylem zinciri dursun mu, tamamlansın mı?
    "stop_actions_on_disarm": True,
}

# Sensor device classes we consider "security relevant".
# Uygulamayla gelen bip sesleri (www/sentinel'e kurulumda kopyalanır).
BEEP_SOUNDS = [
    "arm_beep_soft", "arm_beep_classic", "arm_beep_low",
    "arm_beep_double", "arm_beep_tick",
]
DISARM_SOUNDS = ["disarm_chime", "disarm_ok", "disarm_blip", "disarm_tri"]

# Companion app bildirimindeki aksiyon kimlikleri.
ACTION_DISARM = "SENTINEL_DISARM"
ACTION_IGNORE = "SENTINEL_IGNORE"

SECURITY_CLASSES = [
    "motion", "occupancy", "presence", "door", "window", "opening",
    "garage_door", "moisture", "smoke", "gas", "vibration", "tamper", "safety",
]
