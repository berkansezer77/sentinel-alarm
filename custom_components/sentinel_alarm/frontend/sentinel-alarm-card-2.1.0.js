/* Sentinel Alarm — Lovelace kartı (Konsept A: kat planı).
 *
 *   üst      -> durum + mod rozeti, sağda mod sekmeleri
 *   sol      -> odalar bir kat planı ızgarasında; hareket olan oda yanar
 *   sağ      -> açık bölge / izlenen / süre + "basılı tut" düğmesi
 *   alt      -> son 12 saat şeridi (kurulu · tetik · kapalı)
 *   çerçeve  -> nefes alan glow: kuruluyken kırmızı, kapalıyken yeşil
 *
 * Vanilla web component (Lit yok), entegrasyonla birlikte gelir.
 */

const CARD_MODES = [
  { key: "home",     svc: "alarm_arm_home",     tr: "Evde",     en: "Home",     col: "#b58cff" },
  { key: "away",     svc: "alarm_arm_away",     tr: "Dışarıda", en: "Away",     col: "#ffb86b" },
  { key: "night",    svc: "alarm_arm_night",    tr: "Uyku",     en: "Night",    col: "#9d8cff" },
  { key: "vacation", svc: "alarm_arm_vacation", tr: "Tatil",    en: "Vacation", col: "#5fe39a" },
];

const CARD_STATE = {
  disarmed:       { tr: "Kapalı",          en: "Disarmed" },
  armed_home:     { tr: "Kurulu",          en: "Armed" },
  armed_away:     { tr: "Kurulu",          en: "Armed" },
  armed_night:    { tr: "Kurulu",          en: "Armed" },
  armed_vacation: { tr: "Kurulu",          en: "Armed" },
  arming:         { tr: "Kuruluyor",       en: "Arming" },
  pending:        { tr: "Giriş süresi",    en: "Entry delay" },
  triggered:      { tr: "ALARM",           en: "ALARM" },
  unavailable:    { tr: "Hazır değil",     en: "Not ready" },
};

const ARMED = ["armed_home", "armed_away", "armed_night", "armed_vacation"];
const SLOTS = 36;                 // alt serit: 12 saat / 36 = 20'ser dakika
const TL_HOURS = 6;               // oda cizelgesi: son kac saat
const TL_MERGE = 120000;          // bu araliktaki tetiklemeler tek hareket

function ce(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

/* Kat planı ızgarası: odalara tekrarlanabilir ama düz olmayan yükseklikler
   ver, böylece gerçek bir plan gibi dursun. Oda sırası sabit olduğu için
   düzen her yüklemede aynı kalır. */
const SPANS = [4, 5, 7, 6, 8, 5, 6, 7, 4, 6];

class SentinelAlarmCard extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
    this._entity = this._config.entity || "alarm_control_panel.sentinel_alarm";
    this._built = false;
    this._pick = null;            // sekmede seçili mod (kurmadan önce)
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    const st = hass.states[this._entity];
    if (st === this._lastSt) { this._live(); return; }
    this._lastSt = st;
    this._render();
    if (first) { this._loadHistory(); this._loadTimeline(); }
  }

  connectedCallback() { this._startTick(); }
  disconnectedCallback() { this._stopTick(); }
  getCardSize() { return 9; }
  static getStubConfig() { return { entity: "alarm_control_panel.sentinel_alarm" }; }

  _tr() {
    const st = this._hass && this._hass.states[this._entity];
    return !st || (st.attributes.language || "en") === "tr";
  }
  _T(map) { return this._tr() ? map.tr : map.en; }

  _svc(service, data) {
    return this._hass.callService("alarm_control_panel", service, {
      entity_id: this._entity, ...(data || {}),
    });
  }

  _startTick() {
    if (this._timer) return;
    this._timer = setInterval(() => this._live(), 1000);
  }
  _stopTick() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  /* --------------------------------------------------------------- veri */

  _active(eid) {
    const s = this._hass && this._hass.states[eid];
    if (!s) return false;
    const dom = eid.split(".")[0];
    if (dom === "cover") return s.state === "open" || s.state === "opening";
    if (dom === "lock") return s.state !== "locked";
    return s.state === "on";
  }

  _mmss(sec) {
    sec = Math.max(0, Math.round(sec));
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  /* Süre kutusu: kuruluyor / giriş süresi / siren geri sayar; onun dışında
     mevcut durumun ne kadardır sürdüğünü gösterir. */
  _clock() {
    const st = this._hass && this._hass.states[this._entity];
    if (!st) return "--:--";
    const a = st.attributes;
    if (a.ends_at) {
      const left = (new Date(a.ends_at).getTime() - Date.now()) / 1000;
      if (left > 0) return this._mmss(left);
    }
    return this._mmss((Date.now() - new Date(st.last_changed).getTime()) / 1000);
  }

  /* Son 12 saat: history'den durum aralıklarını al, 20 dakikalık kutulara
     indir. Bir kutuda tetiklenme varsa o kazanır, sonra kurulu, sonra kapalı. */
  async _loadHistory() {
    if (!this._hass) return;
    const end = new Date();
    const start = new Date(end.getTime() - 12 * 3600 * 1000);
    let rows;
    try {
      const url = `history/period/${start.toISOString()}?filter_entity_id=${this._entity}`
        + `&minimal_response&no_attributes&end_time=${end.toISOString()}`;
      const res = await this._hass.callApi("GET", url);
      rows = (res && res[0]) || [];
    } catch (e) {
      this._hist = null;
      return;
    }
    const slots = new Array(SLOTS).fill("off");
    const span = (12 * 3600 * 1000) / SLOTS;
    for (let i = 0; i < rows.length; i++) {
      const s = rows[i].state;
      const from = new Date(rows[i].last_changed || rows[i].last_updated).getTime();
      const to = i + 1 < rows.length
        ? new Date(rows[i + 1].last_changed || rows[i + 1].last_updated).getTime()
        : end.getTime();
      const kind = s === "triggered" ? "hit" : (ARMED.includes(s) || s === "arming" ? "on" : "off");
      if (kind === "off") continue;
      let a = Math.floor((from - start.getTime()) / span);
      let b = Math.ceil((to - start.getTime()) / span);
      a = Math.max(0, a); b = Math.min(SLOTS, b);
      for (let k = a; k < b; k++) {
        if (kind === "hit" || slots[k] === "off") slots[k] = kind;
      }
    }
    this._hist = { slots, start, end };
    this._paintHistory();
  }

  /* Odaların son TL_HOURS saatlik hareketi. Tek history isteğinde bütün
     sensörleri alıp odalara dağıtıyoruz — sensör başına istek atmak on üç
     çağrı ederdi. Sadece "off -> on" anları çizgi olur; süre değil, olay
     gösteriyoruz. */
  async _loadTimeline() {
    if (!this._hass) return;
    const st = this._hass.states[this._entity];
    const rooms = (st && st.attributes.room_sensors) || {};
    const all = [];
    for (const list of Object.values(rooms)) for (const e of list) all.push(e);
    if (!all.length) { this._tl = null; return; }

    const end = new Date();
    const start = new Date(end.getTime() - TL_HOURS * 3600 * 1000);
    let res;
    try {
      const url = `history/period/${start.toISOString()}`
        + `?filter_entity_id=${all.join(",")}&minimal_response&no_attributes`
        + `&end_time=${end.toISOString()}`;
      res = await this._hass.callApi("GET", url);
    } catch (e) {
      this._tl = null;
      return;
    }

    const hits = {};                       // entity -> [zaman...]
    for (const series of res || []) {
      if (!series || !series.length) continue;
      const eid = series[0].entity_id;
      const out = [];
      let prev = null;
      for (const row of series) {
        const v = row.state;
        if (v === "on" && prev !== "on") {
          out.push(new Date(row.last_changed || row.last_updated).getTime());
        }
        prev = v;
      }
      hits[eid] = out;
    }

    const byRoom = {};
    let total = 0;
    for (const [nm, list] of Object.entries(rooms)) {
      const t = [];
      for (const e of list) for (const ts of hits[e] || []) t.push(ts);
      t.sort((x, y) => x - y);
      // Odada dolasan bir kisi sensoru arka arkaya onlarca kez tetikler; bunlar
      // tek bir hareket. Yoksa yogun bir oda tek bir turuncu blok olur.
      const merged = [];
      for (const ts of t) {
        if (!merged.length || ts - merged[merged.length - 1] > TL_MERGE) merged.push(ts);
      }
      byRoom[nm] = merged;
      total += merged.length;
    }

    // aynı istekten alarmın kurulu olduğu aralıklar da lazım (üstteki bantlar)
    let bands = [];
    try {
      const url2 = `history/period/${start.toISOString()}`
        + `?filter_entity_id=${this._entity}&minimal_response&no_attributes`
        + `&end_time=${end.toISOString()}`;
      const r2 = await this._hass.callApi("GET", url2);
      const rows = (r2 && r2[0]) || [];
      for (let i = 0; i < rows.length; i++) {
        const v = rows[i].state;
        if (!(ARMED.includes(v) || v === "arming" || v === "triggered")) continue;
        const from = new Date(rows[i].last_changed || rows[i].last_updated).getTime();
        const to = i + 1 < rows.length
          ? new Date(rows[i + 1].last_changed || rows[i + 1].last_updated).getTime()
          : end.getTime();
        bands.push([from, to]);
      }
    } catch (e) { /* bant olmasa da cizelge calisir */ }

    this._tl = { byRoom, bands, start, end, total };
    this._paintTimeline();
  }

  _paintTimeline() {
    if (!this._tl || !this._laneEls) return;
    const { byRoom, bands, start, end, total } = this._tl;
    const span = end.getTime() - start.getTime();
    const pct = (t) => ((t - start.getTime()) / span) * 100;

    for (const [nm, lane] of Object.entries(this._laneEls)) {
      lane.textContent = "";
      for (const ts of byRoom[nm] || []) {
        const i = ce("i");
        i.style.left = `${Math.min(99.7, Math.max(0, pct(ts)))}%`;
        lane.appendChild(i);
      }
    }
    if (this._armBar) {
      this._armBar.textContent = "";
      for (const [f, t] of bands || []) {
        const b = ce("i");
        const l = Math.max(0, pct(f));
        b.style.left = `${l}%`;
        b.style.width = `${Math.max(0.6, Math.min(100 - l, pct(t) - l))}%`;
        this._armBar.appendChild(b);
      }
    }
    if (this._tlAxis) {
      this._tlAxis.textContent = "";
      for (let i = 0; i <= TL_HOURS; i++) {
        const d = new Date(start.getTime() + (span * i) / TL_HOURS);
        this._tlAxis.appendChild(ce("span", null,
          `${String(d.getHours()).padStart(2, "0")}:00`));
      }
    }
    if (this._sub) {
      const tr = this._tr();
      this._sub.textContent = tr
        ? `Son ${TL_HOURS} saat · ${total} olay`
        : `Last ${TL_HOURS}h · ${total} events`;
    }
  }

  /* --------------------------------------------------------------- kurgu */

  _build() {
    this._built = true;
    this.attachShadow({ mode: "open" });
    const style = ce("style");
    style.textContent = `
      :host{display:block;}
      .glow{position:relative;border-radius:22px;}
      /* nefes alan cerceve — durum rengini --gl degiskeninden alir */
      .glow::before{content:"";position:absolute;inset:-3px;border-radius:24px;
        background:radial-gradient(60% 120% at 0% 0%, var(--gl) 0%, transparent 60%),
                   radial-gradient(60% 120% at 100% 0%, var(--gl) 0%, transparent 60%),
                   radial-gradient(70% 130% at 50% 100%, var(--gl) 0%, transparent 62%);
        filter:blur(15px);opacity:.85;z-index:0;
        animation:breathe 4.5s ease-in-out infinite;}
      @keyframes breathe{0%,100%{opacity:.5;filter:blur(13px);}50%{opacity:1;filter:blur(19px);}}
      .glow.hot::before{animation-duration:1.1s;}
      @media (prefers-reduced-motion: reduce){.glow::before{animation:none;opacity:.7;}}

      ha-card{position:relative;z-index:1;background:#0b0910;border-radius:22px;
        border:.5px solid #241f2c;overflow:hidden;color:#fff;
        font-family:'Inter','Segoe UI',system-ui,sans-serif;}
      .wrap{padding:20px 20px 16px;}

      .top{display:flex;align-items:center;gap:12px;margin-bottom:18px;flex-wrap:wrap;}
      .state{font-size:30px;font-weight:600;letter-spacing:-.6px;line-height:1;}
      .badge{font-size:10px;letter-spacing:1.4px;padding:4px 9px;border-radius:7px;
        text-transform:uppercase;font-weight:600;}
      .tabs{margin-left:auto;display:flex;background:#141019;border:.5px solid #262030;
        border-radius:11px;padding:3px;gap:2px;}
      .tab{font-size:12.5px;padding:6px 13px;border-radius:8px;color:#8b8296;cursor:pointer;
        user-select:none;touch-action:manipulation;-webkit-tap-highlight-color:transparent;
        white-space:nowrap;}
      .tab.on{background:#20192b;color:#fff;}

      .sub{font-size:10px;letter-spacing:1.5px;color:#6f6779;text-transform:uppercase;
        align-self:center;}

      /* --- oda hareket cizelgesi --- */
      .tl{border-top:.5px solid #1d1825;border-bottom:.5px solid #1d1825;
        padding:12px 0 8px;margin-bottom:14px;}
      .tlarm{height:6px;position:relative;margin:0 0 9px 78px;}
      .tlarm i{position:absolute;top:0;height:6px;border-radius:3px;background:#8a6a2e;}
      .row{display:flex;align-items:center;height:22px;}
      .row .nm{width:78px;flex:0 0 78px;font-size:11.5px;color:#6f6779;
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-right:8px;}
      .row.act .nm{color:#ffb86b;}
      .lane{flex:1;position:relative;height:22px;
        background:linear-gradient(to right,#16121d 1px,transparent 1px) repeat-x;
        background-size:calc(100% / var(--h, 6)) 100%;}
      .lane i{position:absolute;top:4px;width:2px;height:14px;border-radius:1px;
        background:#3d3648;}
      .row.act .lane i{background:#ffb86b;box-shadow:0 0 6px #ffb86b80;width:3px;}
      .tlaxis{display:flex;justify-content:space-between;margin:6px 0 0 78px;
        font-size:9.5px;color:#5d5668;font-variant-numeric:tabular-nums;}
      .tlempty{margin-left:78px;font-size:11.5px;color:#5d5668;padding:14px 0;}

      /* --- alt: istatistikler + basili tut --- */
      .foot{display:grid;grid-template-columns:repeat(3,1fr) 200px;gap:8px;align-items:stretch;}
      @media (max-width:620px){.foot{grid-template-columns:1fr 1fr;}}
      .stat{background:#0e0b13;border:.5px solid #211c29;border-radius:12px;
        padding:11px 13px;display:flex;align-items:center;justify-content:space-between;}
      .stat .k{font-size:10px;letter-spacing:1.2px;color:#7d7489;text-transform:uppercase;}
      .stat .v{font-size:15px;font-variant-numeric:tabular-nums;font-weight:600;}
      .stat .v.hi{color:#ffb86b;}
      .hold{border-radius:12px;border:.5px solid #2b2436;background:#141019;
        padding:11px 10px;text-align:center;font-size:13px;cursor:pointer;user-select:none;
        position:relative;overflow:hidden;display:flex;align-items:center;
        justify-content:center;touch-action:manipulation;
        -webkit-tap-highlight-color:transparent;}
      .hold .fill{position:absolute;left:0;top:0;bottom:0;width:0;background:#ffffff14;}
      .hold .lbl{position:relative;}

      .strip{margin-top:16px;padding-top:13px;border-top:.5px solid #1d1825;}
      .striphd{display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap;}
      .striphd .t{font-size:9.5px;letter-spacing:1.5px;color:#6f6779;text-transform:uppercase;}
      .leg{margin-left:auto;display:flex;gap:11px;font-size:9.5px;letter-spacing:1px;
        color:#6f6779;text-transform:uppercase;}
      .leg i{display:inline-block;width:11px;height:3px;border-radius:2px;margin-right:5px;
        vertical-align:middle;}
      .bars{display:flex;gap:3px;}
      .bars i{flex:1;height:17px;border-radius:3px;background:#1c1725;}
      .bars i.on{background:#5fe39a;}
      .bars i.hit{background:#ffb86b;}
      .axis{display:flex;justify-content:space-between;margin-top:6px;font-size:9.5px;
        color:#5d5668;font-variant-numeric:tabular-nums;}

      .note{margin-top:11px;font-size:11.5px;color:#8b8296;display:flex;gap:7px;
        align-items:flex-start;}
      .note.hot{color:#ff8fa5;}

      /* --- kod tus takimi --- */
      .pad{position:absolute;inset:0;background:rgba(8,6,11,.88);backdrop-filter:blur(6px);
        display:flex;align-items:center;justify-content:center;z-index:5;border-radius:22px;}
      .padbox{width:min(232px,86%);padding:16px 16px 12px;border-radius:16px;
        background:#120e17;border:.5px solid #2f2838;box-shadow:0 18px 40px rgba(0,0,0,.55);}
      .padbox.shake{animation:sh .3s;}
      @keyframes sh{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
      .padttl{font-size:11px;letter-spacing:.9px;text-transform:uppercase;color:#8d8299;text-align:center;}
      .dots{display:flex;gap:7px;justify-content:center;margin:11px 0 4px;min-height:11px;}
      .dots i{width:9px;height:9px;border-radius:50%;background:#2c2536;display:block;}
      .dots i.on{background:linear-gradient(135deg,#ec4b88,#8b3dff);}
      .paderr{min-height:13px;font-size:10.5px;color:#ff7d9c;text-align:center;margin-bottom:6px;}
      .keys{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;}
      .key{height:38px;border-radius:11px;background:#1a1522;border:.5px solid #2b2436;color:#e6dff0;
        font-size:16px;display:flex;align-items:center;justify-content:center;cursor:pointer;
        user-select:none;touch-action:manipulation;-webkit-tap-highlight-color:transparent;}
      .key:active{background:#241d30;}
      .key.ok{background:linear-gradient(135deg,#ec4b88,#8b3dff);border-color:transparent;color:#fff;}
      .padcancel{text-align:center;font-size:11px;color:#8d8299;margin-top:10px;cursor:pointer;
        touch-action:manipulation;-webkit-tap-highlight-color:transparent;}
    `;
    this._glow = ce("div", "glow");
    this._root = ce("div", "wrap");
    const card = document.createElement("ha-card");
    card.appendChild(this._root);
    this._glow.appendChild(card);
    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(this._glow);
    this._card = card;
  }

  /* ------------------------------------------------------------- cizim */

  _render() {
    if (!this._hass) return;
    if (!this._built) this._build();
    if (this._pad) { this._pad.remove(); this._pad = null; }
    this._root.textContent = "";
    if (this._root.parentNode !== this._card) this._card.appendChild(this._root);
    this._roomEls = null;

    const st = this._hass.states[this._entity];
    if (!st) {
      this._root.appendChild(ce("div", null, `${this._entity} —`));
      return;
    }
    const a = st.attributes || {};
    const state = st.state;
    const tr = this._tr();
    const armedNow = ARMED.includes(state) || state === "arming" || state === "pending";
    const hot = state === "triggered";

    // cerceve rengi
    this._glow.classList.toggle("hot", hot);
    this._glow.style.setProperty("--gl",
      hot ? "rgba(255,60,90,.95)" : armedNow ? "rgba(255,70,95,.55)" : "rgba(60,220,140,.42)");

    /* ust satir */
    const top = ce("div", "top");
    top.appendChild(ce("div", "state", this._T(CARD_STATE[state] || CARD_STATE.unavailable)));
    this._sub = ce("div", "sub", "");
    top.appendChild(this._sub);
    const modeKey = a.mode || (this._pick || "");
    const md = CARD_MODES.find((m) => m.key === (modeKey || this._pick || "away"));
    if (md) {
      const b = ce("div", "badge", this._T(md).toUpperCase());
      b.style.color = md.col;
      b.style.background = `${md.col}1f`;
      top.appendChild(b);
    }
    const tabs = ce("div", "tabs");
    for (const m of CARD_MODES) {
      const on = armedNow ? a.mode === m.key : (this._pick || "away") === m.key;
      const t = ce("div", "tab" + (on ? " on" : ""), this._T(m));
      if (on) t.style.color = m.col;
      t.onclick = () => {
        if (armedNow) return;              // kuruluyken mod degistirme
        this._pick = m.key;
        this._render();
      };
      tabs.appendChild(t);
    }
    top.appendChild(tabs);
    this._root.appendChild(top);

    /* oda hareket cizelgesi */
    const tl = ce("div", "tl");
    const rooms = a.room_sensors || {};
    const names = Object.keys(rooms);
    this._roomEls = [];
    this._laneEls = {};
    if (!names.length) {
      tl.appendChild(ce("div", "tlempty", tr ? "Henüz bölge yok" : "No zones yet"));
    } else {
      this._armBar = ce("div", "tlarm");
      tl.appendChild(this._armBar);
      for (const nm of names) {
        const row = ce("div", "row");
        row.appendChild(ce("div", "nm", nm));
        const lane = ce("div", "lane");
        lane.style.setProperty("--h", String(TL_HOURS));
        row.appendChild(lane);
        tl.appendChild(row);
        this._roomEls.push({ el: row, eids: rooms[nm] || [] });
        this._laneEls[nm] = lane;
      }
      this._tlAxis = ce("div", "tlaxis");
      tl.appendChild(this._tlAxis);
    }
    this._root.appendChild(tl);
    this._paintTimeline();

    /* alt: istatistikler + basili tut */
    const foot = ce("div", "foot");
    const mkStat = (k, v, hi) => {
      const s2 = ce("div", "stat");
      s2.appendChild(ce("div", "k", k));
      const val = ce("div", "v" + (hi ? " hi" : ""), v);
      s2.appendChild(val);
      return { box: s2, val };
    };
    const openS = mkStat(tr ? "Açık bölge" : "Open", String(a.open_count || 0), (a.open_count || 0) > 0);
    const watchS = mkStat(tr ? "İzlenen" : "Watched", String(a.watched || 0));
    const timeS = mkStat(tr ? "Süre" : "Time", this._clock());
    this._openV = openS.val; this._watchV = watchS.val; this._timeV = timeS.val;
    foot.appendChild(openS.box); foot.appendChild(watchS.box); foot.appendChild(timeS.box);

    const hold = ce("div", "hold");
    const fill = ce("div", "fill");
    const lbl = ce("div", "lbl",
      armedNow ? (tr ? "Basılı tut → Kapat" : "Hold → Disarm")
               : (tr ? "Basılı tut → Kur" : "Hold → Arm"));
    hold.appendChild(fill); hold.appendChild(lbl);
    this._wireHold(hold, fill, armedNow);
    foot.appendChild(hold);
    this._root.appendChild(foot);

    /* acik bolge notu */
    if ((a.open_now || []).length) {
      const n = ce("div", "note" + (armedNow ? " hot" : ""));
      n.appendChild(ce("span", null, "⚠"));
      n.appendChild(ce("span", null, (a.open_now || []).join(", ") + " — "
        + (tr ? "kurulumda bypass edilecek" : "will be bypassed on arming")));
      this._root.appendChild(n);
    }

    /* son 12 saat */
    const strip = ce("div", "strip");
    const shd = ce("div", "striphd");
    shd.appendChild(ce("div", "t", tr ? "Son 12 saat" : "Last 12 hours"));
    const leg = ce("div", "leg");
    const mkLeg = (col, txt) => {
      const s = ce("span");
      const i = ce("i"); i.style.background = col;
      s.appendChild(i); s.appendChild(ce("span", null, txt));
      return s;
    };
    leg.appendChild(mkLeg("#5fe39a", tr ? "Kurulu" : "Armed"));
    leg.appendChild(mkLeg("#ffb86b", tr ? "Tetik" : "Alarm"));
    leg.appendChild(mkLeg("#1c1725", tr ? "Kapalı" : "Off"));
    shd.appendChild(leg);
    strip.appendChild(shd);
    this._bars = ce("div", "bars");
    for (let i = 0; i < SLOTS; i++) this._bars.appendChild(ce("i"));
    strip.appendChild(this._bars);
    this._axis = ce("div", "axis");
    strip.appendChild(this._axis);
    this._root.appendChild(strip);
    this._paintHistory();

    this._live();
  }

  _paintHistory() {
    if (!this._bars || !this._hist) return;
    const cells = this._bars.children;
    this._hist.slots.forEach((k, i) => {
      if (cells[i]) cells[i].className = k === "off" ? "" : k;
    });
    if (this._axis) {
      this._axis.textContent = "";
      const t0 = this._hist.start.getTime(), t1 = this._hist.end.getTime();
      for (let i = 0; i < 5; i++) {
        const d = new Date(t0 + ((t1 - t0) * i) / 4);
        this._axis.appendChild(ce("span", null,
          `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`));
      }
    }
  }

  /* Saniyede bir: sadece degisenleri tazele — tum karti yeniden cizmek
     basili tut animasyonunu ve tus takimini bozardi. */
  _live() {
    if (!this._hass || !this._built) return;
    // Cizelgeyi dakikada bir tazele: yeni hareketler kendiliginden dussun.
    const now = Date.now();
    if (!this._tlAt || now - this._tlAt > 60000) {
      this._tlAt = now;
      this._loadTimeline();
    }
    const st = this._hass.states[this._entity];
    if (!st) return;
    const a = st.attributes || {};
    if (this._timeV) this._timeV.textContent = this._clock();
    if (this._openV) {
      this._openV.textContent = String(a.open_count || 0);
      this._openV.classList.toggle("hi", (a.open_count || 0) > 0);
    }
    if (this._watchV) this._watchV.textContent = String(a.watched || 0);
    for (const r of this._roomEls || []) {
      r.el.classList.toggle("act", r.eids.some((e) => this._active(e)));
    }
  }

  /* -------------------------------------------------------- etkilesim */

  /* Basili tut: yanlislikla kurmayi/kapatmayi onler. 900 ms dolunca calisir. */
  _wireHold(el, fill, armedNow) {
    let raf = null, t0 = 0;
    const DUR = 900;
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = null; fill.style.width = "0";
    };
    const step = () => {
      const p = Math.min(1, (performance.now() - t0) / DUR);
      fill.style.width = `${p * 100}%`;
      if (p >= 1) { stop(); this._fire(armedNow); return; }
      raf = requestAnimationFrame(step);
    };
    const start = (ev) => {
      ev.preventDefault();
      t0 = performance.now();
      raf = requestAnimationFrame(step);
    };
    el.onpointerdown = start;
    el.onpointerup = stop;
    el.onpointerleave = stop;
    el.onpointercancel = stop;
  }

  _fire(armedNow) {
    if (armedNow) { this._disarm(); return; }
    const m = CARD_MODES.find((x) => x.key === (this._pick || "away"));
    this._svc(m ? m.svc : "alarm_arm_away");
  }

  /* Kapatma. Entity `code_format` bildiriyorsa kod tanimlidir. */
  _disarm() {
    const st = this._hass && this._hass.states[this._entity];
    if (!st || !st.attributes.code_format) { this._svc("alarm_disarm"); return; }
    this._openPad();
  }

  _openPad() {
    if (this._pad) return;
    const tr = this._tr();
    let code = "";

    const pad = ce("div", "pad");
    const box = ce("div", "padbox");
    const ttl = ce("div", "padttl", tr ? "Alarm kodu" : "Alarm code");
    const dots = ce("div", "dots");
    const err = ce("div", "paderr");

    const paint = () => {
      dots.textContent = "";
      for (let i = 0; i < Math.max(4, code.length); i++) {
        dots.appendChild(ce("i", i < code.length ? "on" : null));
      }
    };
    const close = () => { pad.remove(); this._pad = null; };

    const submit = async () => {
      if (!code) return;
      err.textContent = "";
      try {
        await this._svc("alarm_disarm", { code });
        close();
      } catch (e) {
        code = ""; paint();
        const raw = (e && (e.message || (e.body && e.body.message))) || "";
        err.textContent = /try again/i.test(raw)
          ? raw.replace(/^.*?(Try again in \d+s).*$/i, "$1")
          : (tr ? "Kod hatalı" : "Wrong code");
        box.classList.remove("shake");
        void box.offsetWidth;
        box.classList.add("shake");
      }
    };

    const keys = ce("div", "keys");
    for (const k of ["1","2","3","4","5","6","7","8","9","del","0","ok"]) {
      const b = ce("div", "key" + (k === "ok" ? " ok" : ""));
      b.textContent = k === "del" ? "⌫" : k === "ok" ? "✓" : k;
      b.onclick = () => {
        if (k === "del") { code = code.slice(0, -1); paint(); return; }
        if (k === "ok") { submit(); return; }
        if (code.length >= 12) return;
        code += k; paint(); err.textContent = "";
      };
      keys.appendChild(b);
    }
    const cancel = ce("div", "padcancel", tr ? "Vazgeç" : "Cancel");
    cancel.onclick = close;

    box.appendChild(ttl); box.appendChild(dots); box.appendChild(err);
    box.appendChild(keys); box.appendChild(cancel);
    pad.appendChild(box);
    pad.onclick = (e) => { if (e.target === pad) close(); };
    paint();
    this._card.appendChild(pad);
    this._pad = pad;
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
    description: "Kat planı, bölge durumu, son 12 saat ve alarm anı",
    preview: true,
  });
}
