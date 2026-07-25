/* Sentinel Alarm — Lovelace kartı.
 * alarm_control_panel.sentinel_alarm entity'sini iki yüzle gösterir:
 *   gündelik  -> durum + oda aktivitesi + açık uyarısı + mod düğmeleri
 *   alarm     -> kırmızı, tetikleyen + kamera + siren geri sayımı + olay akışı
 * Vanilla web component (Lit yok), entegrasyonla birlikte gelir.
 */
const CARD_MODES = [
  { key: "home",     svc: "alarm_arm_home",     tr: "Evde",     en: "Home",     icon: "mdi:home-outline",  col: "#b58cff" },
  { key: "away",     svc: "alarm_arm_away",     tr: "Dışarıda", en: "Away",     icon: "mdi:car-outline",   col: "#ff8fb3" },
  { key: "night",    svc: "alarm_arm_night",    tr: "Uyku",     en: "Night",    icon: "mdi:weather-night", col: "#9d8cff" },
  { key: "vacation", svc: "alarm_arm_vacation", tr: "Tatil",    en: "Vacation", icon: "mdi:palm-tree",     col: "#ffb86b" },
];

const CARD_STATE = {
  disarmed:       { tr: "Kapalı",         en: "Disarmed",      icon: "mdi:shield-off-outline", col: "#5fe39a" },
  armed_home:     { tr: "Evde Kurulu",    en: "Armed · Home",  icon: "mdi:shield-home",        col: "#b58cff" },
  armed_away:     { tr: "Dışarıda Kurulu",en: "Armed · Away",  icon: "mdi:shield-lock",        col: "#ff8fb3" },
  armed_night:    { tr: "Uyku Kurulu",    en: "Armed · Night", icon: "mdi:shield-moon",        col: "#9d8cff" },
  armed_vacation: { tr: "Tatil Kurulu",   en: "Armed · Away",  icon: "mdi:shield-airplane",    col: "#ffb86b" },
  arming:         { tr: "Kuruluyor",      en: "Arming",        icon: "mdi:shield-sync",        col: "#ffb86b" },
  pending:        { tr: "Giriş — kapat",  en: "Entry — disarm",icon: "mdi:shield-alert",       col: "#ff8fb3" },
  triggered:      { tr: "Tetiklendi",     en: "Triggered",     icon: "mdi:bell-ring",          col: "#ff5c7a" },
};

const EV_ICON = {
  armed: "mdi:shield-check", disarmed: "mdi:shield-off-outline", triggered: "mdi:bell-ring",
  blocked: "mdi:alert-outline", entry: "mdi:door-open", unavailable: "mdi:access-point-network-off",
  restore: "mdi:restore", unconfirmed: "mdi:shield-half-full",
};

function ce(tag, cls, txt) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt != null) e.textContent = txt;
  return e;
}
function hicon(name) {
  const i = document.createElement("ha-icon");
  i.setAttribute("icon", name);
  return i;
}

class SentinelAlarmCard extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
    this._entity = this._config.entity || "alarm_control_panel.sentinel_alarm";
    this._built = false;
  }
  set hass(hass) {
    this._hass = hass;
    const st = hass.states[this._entity];
    if (st === this._lastSt) {
      // Alarm entity değişmedi — sadece canlı oda noktalarını tazele (ucuz).
      this._updateRooms();
      return;
    }
    this._lastSt = st;
    this._render();
  }

  _active(eid) {
    const s = this._hass && this._hass.states[eid];
    if (!s) return false;
    const dom = eid.split(".")[0];
    if (dom === "cover") return s.state === "open" || s.state === "opening";
    if (dom === "lock") return s.state !== "locked";
    return s.state === "on";
  }
  _updateRooms() {
    if (!this._roomEls) return;
    for (const r of this._roomEls) {
      const on = r.eids.some((e) => this._active(e));
      r.el.classList.toggle("act", on);
    }
  }
  getCardSize() { return 6; }
  static getStubConfig() { return { entity: "alarm_control_panel.sentinel_alarm" }; }

  connectedCallback() { this._startTick(); }
  disconnectedCallback() { this._stopTick(); }

  _startTick() {
    if (this._timer) return;
    this._timer = setInterval(() => this._tick(), 1000);
  }
  _stopTick() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  _tr() {
    const st = this._hass && this._hass.states[this._entity];
    return !st || (st.attributes.language || "en") === "tr";
  }
  _T(map) { return this._tr() ? map.tr : map.en; }

  _svc(service, data) {
    this._hass.callService("alarm_control_panel", service, {
      entity_id: this._entity, ...(data || {}),
    });
  }
  _openPanel() {
    history.pushState(null, "", "/sentinel-alarm");
    const e = new Event("location-changed", { composed: true });
    e.detail = { replace: false };
    window.dispatchEvent(e);
  }

  _ago(iso) {
    const tr = this._tr();
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return tr ? "az önce" : "just now";
    const m = Math.floor(s / 60);
    if (m < 60) return tr ? `${m} dk önce` : `${m} min ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return tr ? `${h} sa önce` : `${h} h ago`;
    const d = Math.floor(h / 24);
    return tr ? `${d} gün önce` : `${d} d ago`;
  }
  _hhmm(iso) {
    if (!iso) return "";
    const t = iso.split("T")[1] || "";
    return t.slice(0, 5);
  }
  _fmtLeft(sec) {
    sec = Math.max(0, Math.round(sec));
    if (sec < 60) return `${sec} sn`;
    const m = Math.floor(sec / 60), s = sec % 60;
    return s ? `${m} dk ${s} sn` : `${m} dk`;
  }

  _build() {
    this._built = true;
    this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      :host{display:block;}
      ha-card{background:#0c0a10;border-radius:18px;border:.5px solid #2a2530;overflow:hidden;
        color:#fff;font-family:'Inter','Segoe UI',system-ui,sans-serif;}
      .wrap{padding:16px 16px 14px;}
      ha-icon{--mdc-icon-size:18px;display:inline-flex;vertical-align:middle;}
      .hd{display:flex;align-items:center;gap:8px;margin-bottom:14px;}
      .logo{width:24px;height:24px;border-radius:7px;background:linear-gradient(135deg,#ec4b88,#8b3dff);
        display:flex;align-items:center;justify-content:center;}
      .logo ha-icon{--mdc-icon-size:14px;color:#fff;}
      .brand{font-size:10.5px;letter-spacing:2.2px;color:#8d8290;font-weight:600;}
      .live{margin-left:auto;font-size:11px;display:inline-flex;align-items:center;gap:6px;}
      .live i{width:6px;height:6px;border-radius:50%;display:inline-block;}
      .hero{display:flex;align-items:center;gap:14px;margin-bottom:14px;}
      .hbox{width:58px;height:58px;border-radius:18px;display:flex;align-items:center;justify-content:center;flex:0 0 auto;}
      .hbox ha-icon{--mdc-icon-size:28px;}
      .hname{font-family:Georgia,serif;font-size:25px;line-height:1.05;}
      .hsub{font-size:11.5px;color:#8d8290;margin-top:3px;}
      .rooms{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:13px;}
      .rc{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:11px;
        background:rgba(255,255,255,.04);border:.5px solid rgba(255,255,255,.08);font-size:11px;color:#b9aeb8;}
      .rc.act{background:rgba(255,207,92,.09);border-color:rgba(255,207,92,.3);color:#ffcf5c;}
      .rc i{width:5px;height:5px;border-radius:50%;background:#413b46;}
      .rc.act i{background:#ffcf5c;box-shadow:0 0 6px rgba(255,207,92,.9);}
      .warn{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:11px;
        background:rgba(255,184,107,.09);border:.5px solid rgba(255,184,107,.28);margin-bottom:13px;
        font-size:11.5px;color:#ffcf9c;}
      .warn ha-icon{--mdc-icon-size:15px;color:#ffb86b;flex:0 0 auto;}
      .modes{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px;}
      .mode{display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 4px;border-radius:12px;
        cursor:pointer;transition:.14s;font-size:10.5px;border:.5px solid transparent;}
      .mode ha-icon{--mdc-icon-size:17px;}
      .mode:hover{filter:brightness(1.25);}
      .mode.on{outline:1px solid currentColor;}
      .disarm{display:flex;align-items:center;justify-content:center;gap:7px;padding:11px;border-radius:12px;
        cursor:pointer;font-size:13px;transition:.14s;}
      .disarm.ghost{background:rgba(255,255,255,.04);border:.5px solid rgba(255,255,255,.09);color:#b9aeb8;}
      .disarm.solid{background:rgba(255,255,255,.94);color:#1a1218;font-weight:500;}
      .disarm.ghost:hover{background:rgba(255,255,255,.08);}
      .foot{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:11px;color:#6f6675;
        border-top:.5px solid rgba(255,255,255,.05);padding-top:11px;margin-top:12px;}
      .foot ha-icon{--mdc-icon-size:14px;}
      .sep{color:#3a3540;}
      .cd{margin-bottom:13px;}
      .cdbar{height:5px;border-radius:4px;background:rgba(255,255,255,.06);overflow:hidden;margin-bottom:5px;}
      .cdfill{height:100%;border-radius:4px;transition:width 1s linear;}
      .cdtx{font-size:11px;color:#8d8290;}
      .cam{border-radius:13px;overflow:hidden;border:.5px solid rgba(255,59,92,.35);margin-bottom:13px;
        position:relative;background:#1c1218;min-height:120px;display:flex;align-items:center;justify-content:center;}
      .cam img{width:100%;display:block;}
      .cam .ph ha-icon{--mdc-icon-size:30px;color:#5d4550;}
      .cam .tag{position:absolute;left:9px;top:8px;font-size:10px;letter-spacing:.5px;color:#ff9cb1;
        background:rgba(20,10,16,.8);padding:2px 8px;border-radius:8px;}
      .feed{font-size:10.5px;color:#6f6675;line-height:1.75;margin-top:4px;}
      .feed .t{font-variant-numeric:tabular-nums;}
      .feed .hot{color:#ff9cb1;}
      .row2{display:flex;gap:6px;margin-bottom:12px;}
    `;
    this._root = ce("div", "wrap");
    const card = document.createElement("ha-card");
    card.appendChild(this._root);
    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(card);
    this._card = card;
  }

  _render() {
    if (!this._hass) return;
    if (!this._built) this._build();
    const st = this._hass.states[this._entity];
    this._root.textContent = "";
    this._cd = null;
    this._roomEls = null;

    if (!st) {
      this._root.appendChild(ce("div", null, "alarm_control_panel.sentinel_alarm bulunamadı"));
      return;
    }
    const a = st.attributes || {};
    const state = st.state;
    const tr = this._tr();
    const triggered = state === "triggered";
    const meta = CARD_STATE[state] || CARD_STATE.disarmed;

    this._card.style.borderColor = triggered ? "rgba(255,59,92,.5)" : "#2a2530";
    this._card.querySelector(".wrap")?.remove?.();
    this._card.style.background = triggered ? "#140a10" : "#0c0a10";

    // header
    const hd = ce("div", "hd");
    const logo = ce("div", "logo"); logo.appendChild(hicon("mdi:shield-half-full"));
    hd.appendChild(logo);
    hd.appendChild(ce("span", "brand", "SENTINEL"));
    const live = ce("div", "live");
    const dot = ce("i"); dot.style.background = meta.col;
    live.appendChild(dot);
    live.style.color = meta.col;
    live.appendChild(ce("span", null, triggered ? "ALARM" : (state === "disarmed" ? (tr ? "hazır" : "ready") : (tr ? "kurulu" : "armed"))));
    hd.appendChild(live);
    this._root.appendChild(hd);

    // hero
    const hero = ce("div", "hero");
    const hbox = ce("div", "hbox");
    hbox.style.background = `${meta.col}22`;
    hbox.style.border = `1px solid ${meta.col}66`;
    const hi = hicon(meta.icon); hi.style.color = meta.col;
    hbox.appendChild(hi);
    hero.appendChild(hbox);
    const htxt = ce("div");
    htxt.appendChild(ce("div", "hname", this._T(meta)));
    let sub = this._ago(st.last_changed);
    if (triggered && a.trigger_source) {
      sub = `${a.trigger_source} · ${this._hhmm(st.last_changed)} · ${this._modeName(a.mode)}`;
    } else if (a.changed_by) {
      sub += ` · ${a.changed_by === "panel" ? (tr ? "panelden" : "panel") : a.changed_by}`;
    }
    const subEl = ce("div", "hsub", sub);
    if (triggered) subEl.style.color = "#ff9cb1";
    htxt.appendChild(subEl);
    hero.appendChild(htxt);
    this._root.appendChild(hero);

    // countdown (arming / pending / triggered)
    if (a.phase && a.ends_at) {
      this._root.appendChild(this._countdown(a, triggered));
    }

    if (triggered) {
      this._renderAlarm(a);
    } else {
      this._renderEveryday(a, state, tr);
    }
    this._tick();
  }

  _modeName(mode) {
    const m = CARD_MODES.find((x) => x.key === mode);
    return m ? this._T(m) : (mode || "");
  }

  _countdown(a, triggered) {
    const wrap = ce("div", "cd");
    const bar = ce("div", "cdbar");
    const fill = ce("div", "cdfill");
    fill.style.background = triggered
      ? "linear-gradient(90deg,#ff3b5c,#ff7a6b)"
      : "linear-gradient(90deg,#8b3dff,#ec4b88)";
    bar.appendChild(fill);
    wrap.appendChild(bar);
    const tx = ce("div", "cdtx");
    wrap.appendChild(tx);
    this._cd = {
      fill, tx,
      ends: new Date(a.ends_at).getTime(),
      total: Number(a.phase_total) || 0,
      phase: a.phase,
    };
    return wrap;
  }

  _tick() {
    if (!this._cd) return;
    const left = (this._cd.ends - Date.now()) / 1000;
    const total = this._cd.total || 1;
    const pct = Math.max(0, Math.min(100, (left / total) * 100));
    this._cd.fill.style.width = pct + "%";
    const tr = this._tr();
    let label = "";
    if (this._cd.phase === "arming") label = (tr ? "kuruluyor: " : "arming: ") + this._fmtLeft(left);
    else if (this._cd.phase === "pending") label = (tr ? "kapatmak için: " : "disarm in: ") + this._fmtLeft(left);
    else label = (tr ? "siren: " : "siren: ") + this._fmtLeft(left);
    this._cd.tx.textContent = label;
  }

  _renderEveryday(a, state, tr) {
    // oda aktivitesi — room_sensors eşlemesinden CANLI hesaplanır
    this._roomEls = [];
    const rs = a.room_sensors || {};
    const names = Object.keys(rs);
    if (names.length) {
      const rw = ce("div", "rooms");
      for (const name of names) {
        const eids = rs[name] || [];
        const on = eids.some((e) => this._active(e));
        const c = ce("span", "rc" + (on ? " act" : ""));
        c.appendChild(ce("span", null, name));
        c.appendChild(ce("i"));
        rw.appendChild(c);
        this._roomEls.push({ el: c, eids });
      }
      this._root.appendChild(rw);
    }

    // açık sensör uyarısı
    if (a.open_count) {
      const w = ce("div", "warn");
      w.appendChild(hicon("mdi:door-open"));
      w.appendChild(ce("span", null,
        `${a.open_count} ${tr ? "açık" : "open"} · ${(a.open_now || []).join(", ")}`));
      this._root.appendChild(w);
    }

    // mod düğmeleri
    const modes = ce("div", "modes");
    for (const m of CARD_MODES) {
      const on = a.mode === m.key && state !== "disarmed";
      const b = ce("div", "mode" + (on ? " on" : ""));
      b.style.background = `${m.col}1a`;
      b.style.borderColor = `${m.col}4d`;
      b.style.color = m.col;
      const bi = hicon(m.icon);
      b.appendChild(bi);
      b.appendChild(ce("span", null, this._T(m)));
      b.onclick = () => this._svc(m.svc);
      modes.appendChild(b);
    }
    this._root.appendChild(modes);

    // devre dışı bırak
    const dis = ce("div", "disarm ghost");
    dis.appendChild(hicon("mdi:lock-open-variant-outline"));
    dis.appendChild(ce("span", null, tr ? "Devre dışı bırak" : "Disarm"));
    dis.onclick = () => this._svc("alarm_disarm");
    this._root.appendChild(dis);

    // alt bilgi
    const foot = ce("div", "foot");
    const w1 = ce("span"); w1.style.display = "inline-flex"; w1.style.alignItems = "center"; w1.style.gap = "5px";
    const ri = hicon("mdi:radar"); ri.style.color = "#9a7bd6"; w1.appendChild(ri);
    w1.appendChild(ce("span", null, `${a.watched || 0} ${tr ? "sensör nöbette" : "watching"}`));
    foot.appendChild(w1);
    const ev = (a.events || [])[0];
    if (ev) {
      foot.appendChild(ce("span", "sep", "·"));
      foot.appendChild(ce("span", null, `${tr ? "Son" : "Last"}: ${ev.text ? ev.text.slice(0, 32) : ev.kind} ${this._hhmm(ev.ts)}`));
    }
    this._root.appendChild(foot);
  }

  _renderAlarm(a) {
    const tr = this._tr();
    // kamera
    const cam = ce("div", "cam");
    const camEid = a.trigger_camera;
    const camSt = camEid && this._hass.states[camEid];
    const pic = camSt && camSt.attributes && camSt.attributes.entity_picture;
    if (pic) {
      const img = document.createElement("img");
      img.src = pic;
      cam.appendChild(img);
    } else {
      const ph = ce("div", "ph"); ph.appendChild(hicon("mdi:cctv"));
      cam.appendChild(ph);
    }
    const tag = ce("div", "tag",
      (camSt ? (camSt.attributes.friendly_name || "") : (tr ? "kamera yok" : "no camera")).toUpperCase());
    cam.appendChild(tag);
    this._root.appendChild(cam);

    // kapat + panel
    const row = ce("div", "row2");
    const dis = ce("div", "disarm solid"); dis.style.flex = "1";
    dis.appendChild(hicon("mdi:lock-open-variant-outline"));
    dis.appendChild(ce("span", null, tr ? "Kapat" : "Disarm"));
    dis.onclick = () => this._svc("alarm_disarm");
    row.appendChild(dis);
    const panel = ce("div", "disarm ghost");
    panel.style.flex = "0 0 auto";
    panel.appendChild(hicon("mdi:arrow-expand"));
    panel.onclick = () => this._openPanel();
    row.appendChild(panel);
    this._root.appendChild(row);

    // olay akışı
    const feed = ce("div", "feed");
    for (const ev of (a.events || []).slice(0, 3)) {
      const line = ce("div");
      const hot = ev.kind === "triggered";
      const t = ce("span", "t" + (hot ? " hot" : ""), this._hhmm(ev.ts) + " ");
      line.appendChild(t);
      line.appendChild(ce("span", null, ev.text ? ev.text.slice(0, 40) : ev.kind));
      feed.appendChild(line);
    }
    this._root.appendChild(feed);
  }
}

if (!customElements.get("sentinel-alarm-card")) {
  customElements.define("sentinel-alarm-card", SentinelAlarmCard);
}
window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "sentinel-alarm-card")) {
  window.customCards.push({
    type: "sentinel-alarm-card",
    name: "Sentinel Alarm",
    description: "Sentinel alarm — durum, modlar, oda aktivitesi ve alarm anı",
    preview: true,
  });
}
