"""Sentinel Alarm — kendi AI seslerini gerçek HA TTS entity'si olarak sunar.

Neden: sesi dosyaya yazıp `media_player.play_media` ile çalmak kırılgan —
Amazon Echo yerel `/local/...` adresini çekemez, Fully Kiosk kimi formatları
oynatmaz. HA'nın TTS katmanına bağlanınca `tts.speak` her oynatıcıda çalışır
(HA sesi kendi proxy adresinden servis eder) ve önbelleği de HA yönetir.
"""
from __future__ import annotations

from homeassistant.components.tts import TextToSpeechEntity, Voice
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .engine import GEMINI_VOICES, OPENAI_VOICES, SentinelEngine

# Sağlayıcılar dili kendileri algılar; listeyi geniş tutuyoruz ki HA engel olmasın.
LANGUAGES = ["tr", "en", "de", "fr", "es", "it", "nl", "pt", "ru", "ar", "az"]

PROVIDERS = {
    "openai": ("Sentinel OpenAI", OPENAI_VOICES, "alloy"),
    "gemini": ("Sentinel Gemini", GEMINI_VOICES, "Kore"),
}


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    engine: SentinelEngine = hass.data[DOMAIN]["engine"]
    async_add_entities(
        [SentinelTTSEntity(engine, provider) for provider in PROVIDERS]
    )


class SentinelTTSEntity(TextToSpeechEntity):
    """Bir AI sağlayıcısı (OpenAI / Gemini) — sesler `voice` seçeneğiyle."""

    _attr_has_entity_name = False

    def __init__(self, engine: SentinelEngine, provider: str) -> None:
        self._engine = engine
        self._provider = provider
        name, voices, default = PROVIDERS[provider]
        self._voices = voices
        self._default_voice = default
        self._attr_name = name
        self._attr_unique_id = f"{DOMAIN}_tts_{provider}"

    @property
    def device_info(self):
        return {
            "identifiers": {(DOMAIN, "panel")},
            "name": "Sentinel Alarm",
            "manufacturer": "Sentinel",
            "model": "Alarm Panel",
        }

    @property
    def default_language(self) -> str:
        return "tr" if self._engine.lang == "tr" else "en"

    @property
    def supported_languages(self) -> list[str]:
        return LANGUAGES

    @property
    def supported_options(self) -> list[str]:
        return ["voice"]

    @property
    def default_options(self) -> dict:
        return {"voice": self._default_voice}

    @callback
    def async_get_supported_voices(self, language: str) -> list[Voice]:
        return [Voice(v, v) for v in self._voices]

    async def async_get_tts_audio(self, message, language, options=None):
        """HA sesi buradan ister; (uzantı, bayt) döneriz. Anahtar yoksa None."""
        voice = (options or {}).get("voice") or self._default_voice
        key = (self._engine.config.get("ai", {}).get(self._provider) or "").strip()
        if not key:
            return None, None
        try:
            if self._provider == "openai":
                audio, ext = await self._engine._openai_tts(message, voice, key)
            else:
                audio, ext = await self._engine._gemini_tts(message, voice, key)
        except Exception:  # noqa: BLE001
            return None, None
        if not audio:
            return None, None
        return ext, audio
