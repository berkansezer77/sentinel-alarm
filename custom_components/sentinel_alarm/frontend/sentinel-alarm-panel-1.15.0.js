/* Nobetci Alarm Paneli — Dial Tap tasarim dili.
   Sol ray: Genel (alarm bolgeleri) + Alarm sayfalari + Odalar.
   Odadaki HER cihaz listelenir; surukleyip alarm bolgesine birakirsin.
   Panel = tanim yeri, Home Assistant = calistiran motor. */

const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};
const icon = (mdi, cls) => {
  const i = document.createElement("ha-icon");
  i.setAttribute("icon", mdi);
  if (cls) i.className = cls;
  return i;
};
const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const uid = () => Math.random().toString(36).slice(2, 9);
/* Turkce arama: "isik" ile "Işık" eslesir (JS'te "I".toLowerCase() === "i"). */
const norm = (s) => String(s || "")
  .replace(/[İIı]/g, "i").replace(/[Şş]/g, "s").replace(/[Ğğ]/g, "g")
  .replace(/[Üü]/g, "u").replace(/[Öö]/g, "o").replace(/[Çç]/g, "c")
  .toLowerCase();

/* ------------------------------------------------------------------ diller */
const I18N = {
  brand:        { en: "SENTINEL", tr: "NÖBETÇİ" },
  hero_l:       { en: "SMART HOME · SENTINEL", tr: "AKILLI EV · NÖBETÇİ" },
  hero_h:       { en: "Alarm Centre", tr: "Alarm Merkezi" },
  hero_s:       { en: "Your alarm lives here. Pick a room on the left, then drag its devices into an alarm zone — Home, Away, Sleep or Vacation. Everything you build runs inside Home Assistant, with the panel closed too. No cloud, no helpers to create.",
                  tr: "Alarmın burada yaşar. Soldan odanı seç, cihazlarını sürükleyip bir alarm bölgesine bırak — Evde, Dışarıda, Uyku ya da Tatil. Kurduğun her şey Home Assistant içinde çalışır, panel kapalıyken de. Bulut yok, yardımcı (helper) kurmana gerek yok." },

  nav_general:  { en: "General", tr: "Genel" },
  nav_alarm:    { en: "ALARM", tr: "ALARM" },
  nav_rooms:    { en: "ROOMS", tr: "ODALAR" },
  nav_status:   { en: "Status", tr: "Durum" },
  nav_sensors:  { en: "Sensors", tr: "Sensörler" },
  nav_modes:    { en: "Modes", tr: "Modlar" },
  settings:     { en: "Settings", tr: "Ayarlar" },

  zones_h:      { en: "Alarm Zones", tr: "Alarm Bölgeleri" },
  clear_zone:   { en: "empty", tr: "boşalt" },
  clear_q:      { en: "Empty this zone?", tr: "Bu bölge boşaltılsın mı?" },
  clear_b:      { en: "{n} device(s) will be removed from {z}. Their tuning is kept for other zones.",
                  tr: "{z} bölgesinden {n} cihaz çıkarılacak. Diğer bölgelerdeki ayarları korunur." },
  bulk_q:       { en: "Add the whole room?", tr: "Odanın tümü eklensin mi?" },
  bulk_b:       { en: "{n} device(s) from {r} will be added to {z}. Nothing else changes.",
                  tr: "{r} odasındaki {n} cihaz {z} bölgesine eklenecek. Başka bir şey değişmez." },
  bulk_none:    { en: "Nothing to add — every device here is already in that zone.",
                  tr: "Eklenecek bir şey yok — buradaki cihazlar zaten o bölgede." },
  yes_add:      { en: "Add", tr: "Ekle" },
  yes_clear:    { en: "Empty it", tr: "Boşalt" },
  cancel:       { en: "Cancel", tr: "Vazgeç" },
  zones_m:      { en: "drag devices in from any room",  tr: "cihazları odalardan sürükleyip bırak" },
  zones_empty:  { en: "Empty — open a room on the left and drag a device onto this zone.",
                  tr: "Boş — soldan bir oda aç ve cihazı bu bölgeye sürükle." },
  devices:      { en: "devices", tr: "cihaz" },
  in_zones:     { en: "in zones", tr: "bölgelerde" },
  drag_hint:    { en: "Drag a device onto a zone above. One device can sit in several zones.",
                  tr: "Cihazı yukarıdaki bir bölgeye sürükle. Bir cihaz birden çok bölgede olabilir." },
  room_meta:    { en: "device", tr: "cihaz" },
  room_empty:   { en: "No devices in this room.", tr: "Bu odada cihaz yok." },
  no_rooms:     { en: "No rooms found. Assign areas to your devices in Home Assistant first.",
                  tr: "Oda bulunamadı. Önce Home Assistant'ta cihazlara alan ata." },
  add_room_all: { en: "add the whole room", tr: "odanın tümünü ekle" },

  m_home:       { en: "HOME", tr: "EVDE" },
  m_away:       { en: "AWAY", tr: "DIŞARIDA" },
  m_night:      { en: "SLEEP", tr: "UYKU" },
  m_vac:        { en: "VACATION", tr: "TATİL" },
  m_home_s:     { en: "armed while you are inside", tr: "sen evdeyken kurulu" },
  m_away_s:     { en: "armed when nobody is home", tr: "evde kimse yokken kurulu" },
  m_night_s:    { en: "armed at night — leave the bedroom out", tr: "gece kurulu — yatak odasını dışarıda bırak" },
  m_vac_s:      { en: "away + bypass list + presence act", tr: "dışarıda + bypass listesi + insan var taklidi" },

  st_disarmed:  { en: "Disarmed", tr: "Devre Dışı" },
  st_armed_home:{ en: "Armed — Home", tr: "Kurulu — Evde" },
  st_armed_away:{ en: "Armed — Away", tr: "Kurulu — Dışarıda" },
  st_armed_night:{ en: "Armed — Sleep", tr: "Kurulu — Uyku" },
  st_armed_vacation:{ en: "Armed — Vacation", tr: "Kurulu — Tatil" },
  st_arming:    { en: "Arming…", tr: "Kuruluyor…" },
  st_pending:   { en: "Entry delay", tr: "Giriş süresi" },
  st_triggered: { en: "ALARM!", tr: "ALARM!" },
  st_unknown:   { en: "Not ready", tr: "Hazır değil" },
  status_h:     { en: "Status", tr: "Durum" },
  disarm:       { en: "Disarm", tr: "Devre dışı bırak" },
  code_prompt:  { en: "Alarm code", tr: "Alarm kodu" },
  arm_as:       { en: "Arm as", tr: "Şu modda kur" },
  watched:      { en: "watched", tr: "izlenen" },
  open_now:     { en: "open", tr: "açık" },
  unavail:      { en: "unavailable", tr: "erişilemez" },
  since:        { en: "since", tr: "" },
  blocked_t:    { en: "Cannot arm", tr: "Kurulamaz" },
  blocked_s:    { en: "is open. Arming now fires a spoken warning and a notification.",
                  tr: "açık. Şimdi kurarsan sesli uyarı ve bildirim gider." },
  bypass_arm:   { en: "Arm anyway", tr: "Yine de kur" },
  events:       { en: "Recent events", tr: "Son olaylar" },
  no_events:    { en: "Nothing has happened yet.", tr: "Henüz bir şey olmadı." },
  zone_health:  { en: "Zone health", tr: "Bölge sağlığı" },
  z_clean:      { en: "clear", tr: "temiz" },
  z_open:       { en: "open", tr: "açık" },
  z_unavail:    { en: "unavailable", tr: "erişilemez" },

  sens_h:       { en: "Sensor tuning", tr: "Sensör ayarı" },
  sens_m:       { en: "validity delay, entry point, watchdog", tr: "geçerlilik süresi, giriş noktası, bekçi" },
  sens_none:    { en: "No devices in any zone yet. Open Genel and drag some in.",
                  tr: "Henüz hiçbir bölgede cihaz yok. Genel'i aç ve sürükle." },
  c_delay:      { en: "VALIDITY DELAY", tr: "GEÇERLİLİK SÜRESİ" },
  c_delay_s:    { en: "must stay active this long before it counts — the cure for flaky presence sensors",
                  tr: "tetiklemek için bu kadar sürekli algılamalı — hatalı presence sensörlerinin ilacı" },
  c_entry:      { en: "ENTRY POINT", tr: "GİRİŞ NOKTASI" },
  c_entry_s:    { en: "starts the entry delay instead of firing at once", tr: "hemen çalmaz, giriş süresini başlatır" },
  c_unavail:    { en: "WATCHDOG", tr: "BEKÇİ" },
  c_unavail_s:  { en: "notify me if this drops off while armed", tr: "kuruluyken düşerse bana bildir" },
  instant:      { en: "instant", tr: "anında" },

  c_confirm:    { en: "CONFIRMATION", tr: "DOĞRULAMA" },
  c_confirm_s:  { en: "only counts if a second sensor agrees within the window — kills false alarms from a single flaky sensor",
                  tr: "ancak süre içinde ikinci bir sensör de onaylarsa sayılır — tek hatalı sensörün yanlış alarmını keser" },
  confirm_none: { en: "No confirmation (fires alone)", tr: "Doğrulama yok (tek başına çalar)" },
  confirm_room: { en: "Any motion in the same room", tr: "Aynı odada herhangi bir hareket" },
  c_window:     { en: "CONFIRM WINDOW", tr: "DOĞRULAMA SÜRESİ" },
  c_window_s:   { en: "the backup must fire within this long, before or after",
                  tr: "yedek sensör bu süre içinde (önce ya da sonra) algılamalı" },
  needs_lbl:    { en: "needs", tr: "gerekli" },
  needs_room:   { en: "same-room motion", tr: "odada hareket" },
  tap_rules:    { en: "tap a sensor for its rules", tr: "kuralları için sensöre dokun" },
  show_ids:     { en: "entity IDs", tr: "entity ID" },
  c_room:       { en: "ROOM", tr: "ODA" },
  c_room_s:     { en: "no room set in Home Assistant — pick one so alerts and cameras know where it is",
                  tr: "Home Assistant'ta odası yok — bildirim ve kamera bilsin diye buradan seç" },
  room_none:    { en: "Unassigned (Other)", tr: "Atanmadı (Diğer)" },
  assign_h:     { en: "Add to which zones?", tr: "Hangi bölgelere eklensin?" },
  assign_s:     { en: "tap to add or remove — no dragging needed", tr: "dokunarak ekle/çıkar — sürüklemeye gerek yok" },
  tap_assign:   { en: "tap a device to add it to a zone", tr: "bir cihazı bölgeye eklemek için dokun" },
  kind_motion:  { en: "Motion", tr: "Hareket" },
  kind_presence:{ en: "Presence", tr: "Varlık" },
  kind_camera:  { en: "Cameras", tr: "Kameralar" },
  kind_contact: { en: "Doors & windows", tr: "Kapı & Pencere" },
  kind_other:   { en: "Other", tr: "Diğer" },

  lights_h:     { en: "Light guard", tr: "Işık kontrolü" },
  lights_s:     { en: "while armed, these lights are switched back off if anything turns them on",
                  tr: "alarm kuruluyken bu ışıklar açılırsa geri kapatılır" },
  add_light:    { en: "add light", tr: "ışık ekle" },
  lights_vac:   { en: "Lights used by the vacation presence act are exempt automatically.",
                  tr: "Tatil taklidinde kullanılan ışıklar bu kontrolden otomatik muaf tutulur." },

  modes_h:      { en: "Modes & timings", tr: "Modlar ve süreler" },
  modes_m:      { en: "every delay is a slider", tr: "bütün süreler slider" },
  exit_delay:   { en: "Exit delay", tr: "Çıkış gecikmesi" },
  exit_s:       { en: "time to leave after arming", tr: "kurduktan sonra çıkma süren" },
  entry_delay:  { en: "Entry delay", tr: "Giriş gecikmesi" },
  entry_s:      { en: "time to disarm after you walk in", tr: "girdikten sonra kapatma süren" },
  trigger_time: { en: "Trigger time", tr: "Alarm süresi" },
  trigger_s:    { en: "how long the siren sounds", tr: "siren ne kadar çalar" },

  auto_h:       { en: "Automatic", tr: "Otomatik" },
  auto_m:       { en: "let the alarm arm itself — by the clock or by who is home",
                  tr: "alarm kendi kendine kurulsun — saate göre ya da kim evde olduğuna göre" },
  au_sched:     { en: "BY THE CLOCK", tr: "SAATE GÖRE" },
  au_sched_s:   { en: "arm (or disarm) at a set time on the chosen days",
                  tr: "seçtiğin günlerde belirlediğin saatte kur (ya da kapat)" },
  au_add:       { en: "add a time", tr: "saat ekle" },
  au_none:      { en: "No schedule yet.", tr: "Henüz program yok." },
  au_every:     { en: "every day", tr: "her gün" },
  au_leave:     { en: "WHEN EVERYONE LEAVES", tr: "HERKES EVDEN ÇIKINCA" },
  au_leave_s:   { en: "arm once the last of these people is away",
                  tr: "bu kişilerin sonuncusu da evden ayrılınca kur" },
  au_arrive:    { en: "WHEN SOMEBODY COMES HOME", tr: "BİRİ EVE GELİNCE" },
  au_arrive_s:  { en: "disarm as soon as one of these people gets home",
                  tr: "bu kişilerden biri eve gelir gelmez alarmı kapat" },
  au_people:    { en: "People", tr: "Kişiler" },
  au_people_s:  { en: "tap a photo to include or exclude that person",
                  tr: "kişiyi eklemek/çıkarmak için fotoğrafına dokun" },
  au_delay:     { en: "Wait before arming", tr: "Kurmadan önce bekle" },
  au_delay_s:   { en: "grace period in case somebody turns back",
                  tr: "biri geri dönerse diye tanınan süre" },
  au_mode:      { en: "Arm as", tr: "Hangi mod" },
  au_nopers:    { en: "No person entities in Home Assistant.", tr: "Home Assistant'ta kişi (person) yok." },
  au_home:      { en: "home", tr: "evde" },
  au_away:      { en: "away", tr: "dışarıda" },
  au_disarm_m:  { en: "Disarm", tr: "Alarmı kapat" },
  au_trig:      { en: "BY A DEVICE", tr: "CİHAZA GÖRE" },
  au_trig_s:    { en: "when an entity turns on or off — e.g. a switch disarms, a door lock arms",
                  tr: "bir cihaz açılınca ya da kapanınca — ör. anahtar açılınca kapat, kilit kapanınca kur" },
  au_trig_none: { en: "No device trigger yet.", tr: "Henüz cihaz tetikleyici yok." },
  au_trig_add:  { en: "add a device", tr: "cihaz ekle" },
  au_becomes:   { en: "becomes", tr: "şu olunca" },
  au_manual:    { en: "type it myself…", tr: "kendim yazayım…" },
  au_manual_ph: { en: "e.g. Berna", tr: "ör. Berna" },
  au_trig_tip:  { en: "The list is read from the device. For “who opened the lock”, pick the lock's user sensor and type the name.",
                  tr: "Liste cihazdan okunur. “Kilidi kim açtı” için kilidin kullanıcı sensörünü seçip adı yaz." },
  beep_fast:    { en: "Speed up in the last", tr: "Son saniyelerde hızlan" },
  beep_fast_s:  { en: "beeps twice as fast near the end", tr: "sona yaklaşınca iki kat hızlı bip" },
  a_power:      { en: "Devices on/off", tr: "Cihazları aç/kapat" },
  a_power_s:    { en: "any device — climate, media players, fans, plugs, lights",
                  tr: "her tür cihaz — klima, medya oynatıcı, fan, priz, ışık" },
  a_beep:       { en: "Beeps", tr: "Bip sesi" },
  a_beep_s:     { en: "a repeating countdown beep", tr: "tekrarlayan geri sayım bipi" },
  f_beep_sound: { en: "Beep sound", tr: "Bip sesi" },
  f_beep_secs:  { en: "How long", tr: "Ne kadar sürsün" },
  f_beep_secs_s:{ en: "the step lasts this long, beeping", tr: "adım bu süre boyunca bip çalar" },
  f_beep_iv:    { en: "Beep every", tr: "Bip aralığı" },
  f_beep_iv_s:  { en: "gap between two beeps", tr: "iki bip arasındaki süre" },
  beep_nospk:   { en: "Pick a speaker first", tr: "Önce bir hoparlör seç" },
  beep_test:    { en: "test", tr: "dene" },
  push_act:     { en: "Disarm from the notification", tr: "Bildirimden kapatma" },
  push_act_s:   { en: "the alarm push gets Disarm / Silence buttons — no need to open the app",
                  tr: "alarm bildirimine Kapat / Sesi kes düğmeleri eklenir — uygulamayı açmana gerek kalmaz" },
  vac_h:        { en: "Vacation extras", tr: "Tatil ekstraları" },
  vac_h2:       { en: "Vacation", tr: "Tatil" },
  vac_page_m:   { en: "make the house look lived-in while you're away",
                  tr: "sen yokken ev doluymuş gibi görünsün" },
  vac_toggle:   { en: "PRESENCE SIMULATION", tr: "İNSAN VAR SİMÜLASYONU" },
  vac_toggle_s: { en: "from sunset to sunrise the chosen lights play a human-like routine; daytime nothing happens",
                  tr: "gün batımından doğumuna kadar seçtiğin ışıklar insansı bir rutin oynar; gündüz hiçbir şey olmaz" },
  vac_lights:   { en: "LIGHTS IT MAY USE", tr: "KULLANABİLECEĞİ IŞIKLAR" },
  vac_lights_s: { en: "pick lights from different rooms — the plan spreads them across the night by room",
                  tr: "farklı odalardan ışık seç — plan onları odaya göre geceye yayar" },
  vac_add_light:{ en: "add light", tr: "ışık ekle" },
  vac_tl_h:     { en: "Tonight's routine", tr: "Bu gecenin rutini" },
  vac_tl_s:     { en: "a sample of what the house will do — each night varies slightly",
                  tr: "evin yapacaklarından bir örnek — her gece biraz değişir" },
  vac_reroll:   { en: "another sample", tr: "başka örnek" },
  vac_pick_first:{ en: "Turn on the simulation and add a few lights to see the routine.",
                  tr: "Rutini görmek için simülasyonu aç ve birkaç ışık ekle." },
  vac_sunset:   { en: "sunset", tr: "gün batımı" },
  vac_sunrise:  { en: "sunrise", tr: "gün doğumu" },
  vac_edit_hint:{ en: "drag a block to move it, drag its edges to lengthen · + adds a copy, − removes one — no dark gaps",
                  tr: "bloğu tutup taşı, kenarlarından çekip uzat · + kopya ekler, − siler — arada karanlık boşluk kalmasın" },
  vac_add_blk:  { en: "add a copy", tr: "kopya ekle" },
  vac_del_blk:  { en: "remove one", tr: "birini sil" },
  bypass_t:     { en: "BYPASSED", tr: "BYPASS" },
  bypass_s:     { en: "ignored while on vacation", tr: "tatildeyken yok sayılır" },
  add_bypass:   { en: "add entity", tr: "entity ekle" },
  sim_t:        { en: "PRESENCE ACT", tr: "İNSAN VAR TAKLİDİ" },
  sim_s:        { en: "each evening with a random shift, so it never reads as a timer",
                  tr: "her akşam rastgele sapmayla — zamanlayıcı gibi durmasın" },
  sim_add:      { en: "add light + time range", tr: "ışık + saat aralığı ekle" },
  jitter:       { en: "shift", tr: "sapma" },

  act_h:        { en: "Actions", tr: "Eylemler" },
  act_steps:    { en: "steps", tr: "adım" },
  act_hint:     { en: "Steps run in order, top to bottom. Disarming stops a running sequence immediately.",
                  tr: "Adımlar yukarıdan aşağı sırayla çalışır. Alarmı kapatmak çalışan zinciri anında durdurur." },
  act_s:        { en: "what should happen, step by step. The siren and the notification run anyway — this is everything else.",
                  tr: "adım adım ne olsun. Siren ve bildirim zaten çalışır — burası onun dışındaki her şey." },
  ev_trigger:   { en: "WHEN THE ALARM FIRES", tr: "ALARM ÇALINCA" },
  ev_arming:    { en: "WHILE ARMING", tr: "KURULURKEN" },
  ev_arming_s:  { en: "during the exit delay — e.g. a countdown beep",
                  tr: "çıkış gecikmesi boyunca — ör. geri sayım sesi" },
  nl_h:         { en: "Night lights", tr: "Gece Işıkları" },
  nl_m:         { en: "lights that stay on through the night while the alarm is armed",
                  tr: "alarm kuruluyken gece boyunca açık kalacak ışıklar" },
  nl_on:        { en: "NIGHT LIGHTS", tr: "GECE IŞIKLARI" },
  nl_on_s:      { en: "they come on when you arm and go off at sunrise",
                  tr: "alarmı kurunca yanar, gün doğunca söner" },
  nl_modes:     { en: "IN WHICH MODES", tr: "HANGİ MODLARDA" },
  nl_modes_s:   { en: "tap a mode to include it", tr: "eklemek için moda dokun" },
  nl_lights:    { en: "LIGHTS", tr: "IŞIKLAR" },
  nl_lights_s:  { en: "which lights stay on — keep them dim", tr: "hangi ışıklar açık kalsın — kısık tutmakta fayda var" },
  nl_br_s:      { en: "a night light is usually 10–20%", tr: "gece lambası genelde %10–20" },
  nl_when:      { en: "WHEN EACH ONE IS ON", tr: "HANGİSİ NE ZAMAN AÇIK" },
  nl_when_s:    { en: "drag the blocks — a light is on while the alarm is armed and its block is running",
                  tr: "blokları sürükle — alarm kuruluyken bloğu süren ışık açık kalır" },
  nl_pick_first:{ en: "Add a light above to draw its schedule.",
                  tr: "Programını çizmek için yukarıdan ışık ekle." },
  nl_auto:      { en: "fill it for me", tr: "otomatik doldur" },
  nl_auto_done: { en: "Every light set to the whole night", tr: "Her ışık tüm geceye ayarlandı" },
  nl_edit_hint: { en: "drag a block to move it, drag its edges to lengthen · + adds a block, − removes one",
                  tr: "bloğu tutup taşı, kenarlarından çekip uzat · + blok ekler, − siler" },
  nl_hint:      { en: "A light comes on the moment you arm if its block covers that time. Disarming switches them off, and the “turn all lights off” sweep never touches these.",
                  tr: "Alarmı kurduğun an bloğu o saati kapsıyorsa ışık hemen yanar. Alarmı kapatınca sönerler; “tüm ışıkları kapat” süpürmesi bunlara asla dokunmaz." },
  lo_h:         { en: "TURN ALL LIGHTS OFF WHEN ARMED", tr: "KURULUNCA TÜM IŞIKLARI KAPAT" },
  lo_s:         { en: "sweeps every light in the house — no need to list them",
                  tr: "evdeki bütün ışıkları süpürür — tek tek yazmana gerek yok" },
  lo_modes:     { en: "IN WHICH MODES", tr: "HANGİ MODLARDA" },
  lo_except:    { en: "Leave these alone", tr: "Bunlara dokunma" },
  lo_except_s:  { en: " — lights the sweep should skip", tr: " — süpürmenin atlayacağı ışıklar" },
  lo_nl_note:   { en: "Your night lights are skipped automatically.",
                  tr: "Gece ışıkların otomatik olarak atlanır." },
  log_h2:       { en: "Activity", tr: "Günlük" },
  log_runs:     { en: "runs", tr: "çalışma" },
  log_h:        { en: "WHAT ACTUALLY RAN", tr: "NELER ÇALIŞTI" },
  log_s:        { en: "each run, step by step — newest first",
                  tr: "her çalışma, adım adım — en yenisi üstte" },
  log_none:     { en: "Nothing has run yet.", tr: "Henüz hiçbir şey çalışmadı." },
  log_skipped:  { en: "skipped (outside its hours)", tr: "atlandı (saat dışı)" },
  run_stopped_s:{ en: "stopped", tr: "durduruldu" },
  act_all:      { en: "All modes", tr: "Tüm modlar" },
  act_copy:     { en: "copy", tr: "kopyala" },
  act_copy_to:  { en: "Copy these steps to…", tr: "Bu adımları şuraya kopyala…" },
  act_copy_have:{ en: "already has {n} steps — the copies are added on top",
                  tr: "zaten {n} adım var — kopyalar üstüne eklenir" },
  act_copy_empty:{ en: "empty", tr: "boş" },
  act_copy_q:   { en: "Copy the steps?", tr: "Adımlar kopyalansın mı?" },
  act_copy_b:   { en: "{n} steps will be copied from “{a}” to “{b}”. Nothing is deleted.",
                  tr: "“{a}” listesinden “{b}” listesine {n} adım kopyalanacak. Hiçbir şey silinmez." },
  act_copy_ok:  { en: "Yes, copy", tr: "Evet, kopyala" },
  act_copied:   { en: "{n} steps copied", tr: "{n} adım kopyalandı" },
  act_mode_note:{ en: "These steps run only in this mode — on top of the “All modes” list.",
                  tr: "Bu adımlar yalnızca bu modda çalışır — “Tüm modlar” listesinin üstüne eklenir." },
  ev_entry:     { en: "ON ENTRY", tr: "GİRİŞ SÜRESİ" },
  ev_entry_s:   { en: "somebody walked in — the countdown to disarm has started",
                  tr: "biri içeri girdi — alarmı kapatma sayacı başladı" },
  link_seq:     { en: "then", tr: "sonra" },
  link_par:     { en: "at the same time", tr: "aynı anda" },
  link_hint:    { en: "click to link/unlink", tr: "bağlamak/ayırmak için tıkla" },
  f_delay:      { en: "Wait before this step", tr: "Bu adımdan önce bekle" },
  f_delay_s:    { en: "starts this much later", tr: "bu kadar sonra başlar" },
  f_nodelay:    { en: "straight away", tr: "hemen" },
  f_window:     { en: "Only at certain hours", tr: "Sadece belirli saatler arası" },
  f_window_s:   { en: "skip this step outside the window — e.g. no announcement at 3am",
                  tr: "pencere dışında bu adım atlanır — ör. gece 3'te anons olmasın" },
  f_window_h:   { en: "Between", tr: "Saat aralığı" },
  f_window_h_s: { en: "from → to (can cross midnight)", tr: "başlangıç → bitiş (gece yarısını geçebilir)" },
  after_n:      { en: "after {n}s", tr: "{n} sn sonra" },
  ev_arm:       { en: "WHEN ARMED", tr: "ALARM KURULUNCA" },
  ev_disarm:    { en: "WHEN DISARMED", tr: "ALARM KAPANINCA" },
  ev_trigger_s: { en: "lights, announcements, anything you like", tr: "ışık, anons, ne istersen" },
  ev_arm_s:     { en: "e.g. close the covers, lock the door", tr: "ör. perdeleri kapat, kapıyı kilitle" },
  ev_disarm_s:  { en: "e.g. put the lights back to normal", tr: "ör. ışıkları normale döndür" },
  act_add:      { en: "add step", tr: "adım ekle" },
  act_none:     { en: "No steps yet.", tr: "Henüz adım yok." },
  act_test:     { en: "run it now", tr: "şimdi çalıştır" },
  run_now:      { en: "running · {n}s", tr: "çalışıyor · {n} sn" },
  run_step:     { en: "running", tr: "çalışıyor" },
  run_last:     { en: "last run took {n}s", tr: "son çalışmada {n} sn sürdü" },
  run_stopped:  { en: "stopped after {n}s", tr: "{n} sn sonra durduruldu" },
  took:         { en: "took {n}s", tr: "{n} sn sürdü" },
  act_stop:     { en: "stop", tr: "durdur" },
  act_up:       { en: "move up", tr: "yukarı" },
  act_down:     { en: "move down", tr: "aşağı" },
  act_edit:     { en: "Edit step", tr: "Adımı düzenle" },
  act_new:      { en: "New step", tr: "Yeni adım" },
  act_pick:     { en: "What should this step do?", tr: "Bu adım ne yapsın?" },
  save:         { en: "Save", tr: "Kaydet" },
  del:          { en: "Delete", tr: "Sil" },

  a_light:      { en: "Lights", tr: "Işıklar" },
  a_light_s:    { en: "turn on/off, set colour and brightness", tr: "aç/kapat, renk ve parlaklık ver" },
  a_wait:       { en: "Wait", tr: "Bekle" },
  a_wait_s:     { en: "pause before the next step", tr: "sonraki adımdan önce beklet" },
  a_tts:        { en: "Announcement", tr: "Anons" },
  a_tts_s:      { en: "speak a message through the TTS speaker", tr: "TTS cihazından konuş" },
  a_media:      { en: "Play media", tr: "Medya çal" },
  a_media_s:    { en: "play a sound on a media player", tr: "bir oynatıcıda ses çal" },
  a_switch:     { en: "Switches", tr: "Priz & anahtar" },
  a_switch_s:   { en: "turn plugs and switches on or off", tr: "priz/anahtar aç kapat" },
  a_cover:      { en: "Covers", tr: "Perde & panjur" },
  a_cover_s:    { en: "open or close covers", tr: "perdeleri aç veya kapat" },
  a_lock:       { en: "Locks", tr: "Kilitler" },
  a_lock_s:     { en: "lock or unlock", tr: "kilitle veya aç" },
  a_scene:      { en: "Scene", tr: "Sahne" },
  a_scene_s:    { en: "activate a scene", tr: "bir sahne çalıştır" },
  a_script:     { en: "Script", tr: "Script" },
  a_script_s:   { en: "run a Home Assistant script", tr: "bir HA scripti çalıştır" },
  a_notify:     { en: "Notification", tr: "Bildirim" },
  a_notify_s:   { en: "an extra push on top of the automatic one", tr: "otomatik olanın üstüne ek bildirim" },

  f_targets:    { en: "Devices", tr: "Cihazlar" },
  f_add_dev:    { en: "device", tr: "cihaz" },
  f_add_room:   { en: "room", tr: "oda" },
  grp_tag:      { en: "group", tr: "grup" },
  grp_note:     { en: "{n} of these are already inside a group you picked, so they would get every command twice: {l}",
                  tr: "Bunlardan {n} tanesi seçtiğin bir grubun zaten içinde, yani her komutu iki kez alır: {l}" },
  grp_fix:      { en: "remove the duplicates", tr: "tekrarları çıkar" },
  pick_room:    { en: "Which room?", tr: "Hangi oda?" },
  pick_in_room: { en: "Pick what you want — or take the whole room.",
                  tr: "İstediklerini seç — ya da odanın tümünü al." },
  select_all:   { en: "Whole room", tr: "Odanın tümü" },
  add_n:        { en: "Add {n}", tr: "{n} tanesini ekle" },
  add_none:     { en: "Nothing selected", tr: "Seçim yok" },
  f_state:      { en: "Do what", tr: "Ne yapsın" },
  f_on:         { en: "Turn on", tr: "Aç" },
  f_off:        { en: "Turn off", tr: "Kapat" },
  f_open:       { en: "Open", tr: "Aç" },
  f_close:      { en: "Close", tr: "Kapat" },
  f_lock2:      { en: "Lock", tr: "Kilitle" },
  f_unlock:     { en: "Unlock", tr: "Kilidi aç" },
  f_colour:     { en: "Colour", tr: "Renk" },
  f_nocolour:   { en: "leave as is", tr: "dokunma" },
  f_bright:     { en: "Brightness", tr: "Parlaklık" },
  f_stagger:    { en: "Delay between lights", tr: "Işıklar arası gecikme" },
  f_stagger2:   { en: "Delay between devices", tr: "Cihazlar arası gecikme" },
  f_stagger2_s: { en: "they switch one after another instead of all at once",
                  tr: "hepsi birden değil, sırayla değişirler" },
  f_stagger_s:  { en: "they come on one after another instead of all at once",
                  tr: "hepsi birden değil, sırayla yansın" },
  f_together:   { en: "all together", tr: "hepsi birden" },
  f_steady:     { en: "Steady lights", tr: "Sabit ışıklar" },
  f_steady_s:   { en: "just come on in the colour", tr: "seçilen renkte açılır, kalır" },
  f_flashers:   { en: "Flashing lights", tr: "Flash ışıkları" },
  f_flashers_s: { en: "drag lights here to make them flash", tr: "flash yapmasını istediğin ışıkları buraya sürükle" },
  f_bucket_drop:{ en: "drop lights here", tr: "ışıkları buraya bırak" },
  cap_native:   { en: "flashes itself", tr: "kendi yanıp söner" },
  cap_dim:      { en: "dimming only", tr: "karartmayla" },
  cap_none:     { en: "cannot flash", tr: "flash yapamaz" },
  auto_find:    { en: "auto find", tr: "otomatik bul" },
  auto_from:    { en: "the ones from Steady that can flash ({n})",
                  tr: "Sabit'tekilerden flash yapabilenler ({n})" },
  auto_house:   { en: "every light in the house that can flash ({n})",
                  tr: "evdeki flash yapabilen tüm ışıklar ({n})" },
  auto_move:    { en: "move the ones that cannot flash to Steady ({n})",
                  tr: "flash yapamayanları Sabit'e taşı ({n})" },
  auto_title:   { en: "Auto find", tr: "Otomatik bul" },
  auto_none:    { en: "Nothing to do — everything here can already flash.",
                  tr: "Yapacak bir şey yok — buradakilerin hepsi flash yapabiliyor." },
  cap_sum:      { en: "{a} flash themselves · {b} by dimming · {c} cannot",
                  tr: "{a} kendi yanıp söner · {b} karartmayla · {c} yapamaz" },
  dim_only_note:{ en: "Speed only affects the {n} light(s) that flash by dimming; the rest blink at their own pace.",
                  tr: "Hız sadece karartmayla yanan {n} ışığı etkiler; diğerleri kendi temposunda yanıp söner." },
  f_flash:      { en: "Flash time", tr: "Flash süresi" },
  f_flash_s2:   { en: "how long they keep flashing", tr: "ne kadar süre yanıp sönsünler" },
  f_flash_off:  { en: "no flash", tr: "flash yok" },
  f_flash_iv:   { en: "Flash speed", tr: "Flash hızı" },
  f_flash_iv_s: { en: "drag right for faster", tr: "sağa çektikçe hızlanır" },
  spd_fast:     { en: "very fast", tr: "çok hızlı" },
  spd_quick:    { en: "fast", tr: "hızlı" },
  spd_normal:   { en: "normal", tr: "normal" },
  spd_slow:     { en: "slow", tr: "yavaş" },
  bulbs_warn:   { en: "These expand to about {n} bulbs. Each flash sends them all a command — the Hue bridge falls behind, the flash drags and going back to the old colour arrives late. Fewer lights, or a slower speed.",
                  tr: "Bunlar yaklaşık {n} ampule genişliyor. Her yanıp sönüşte hepsine komut gider — Hue köprüsü yetişemez, flash ağırlaşır ve eski renge dönüş geç gelir. Ya ışığı azalt ya hızı düşür." },

  par_t:        { en: "Start with the previous step", tr: "Bir öncekiyle aynı anda başlasın" },
  par_s:        { en: "run both at the same time instead of waiting for it to finish",
                  tr: "öncekinin bitmesini bekleme, ikisi birlikte çalışsın" },
  par_tag:      { en: "together", tr: "birlikte" },
  dur_about:    { en: "~{n}s", tr: "~{n} sn" },
  dur_total:    { en: "about {n}s in total", tr: "toplam yaklaşık {n} sn" },
  f_after:      { en: "When the flash ends", tr: "Flash bitince" },
  f_after_scene:{ en: "Apply a scene", tr: "Bir sahne uygula" },
  f_after_off:  { en: "Turn everything off", tr: "Hepsini kapat" },
  f_after_keep: { en: "Stay in the colour", tr: "Renkte kalsın" },
  f_scene:      { en: "Which scene", tr: "Hangi sahne" },
  f_scene_s:    { en: "your own Home Assistant scene — this is what the room goes back to",
                  tr: "kendi Home Assistant sahnen — oda buna döner" },
  f_flash_blk:  { en: "self-flashing lights work in 15-second blocks, so the time snaps to those",
                  tr: "kendi yanıp sönen ışıklar 15 saniyelik bloklarla çalışır, süre ona göre yuvarlanır" },
  f_colour_note:{ en: "Only colour-capable lights change colour; the rest just turn on.",
                  tr: "Sadece renk destekleyen ışıklar renge döner; diğerleri düz yanar." },
  f_flash_safe: { en: "Flashing dims the lights instead of switching them off — cutting power over and over can throw cheap bulbs and relays into pairing mode.",
                  tr: "Flash, ışığı kapatmak yerine karartarak yapılır — elektriği sürekli kesmek ucuz ampulleri ve röleleri eşleşme moduna sokabilir." },
  f_flash_skip: { en: "{n} of these cannot dim, so they stay simply on: {l}",
                  tr: "Bunlardan {n} tanesi karartılamıyor, düz açık kalacak: {l}" },

  f_players:    { en: "Speakers", tr: "Hoparlörler" },
  f_players_s:  { en: "which speakers this step plays on", tr: "bu adım hangi hoparlörlerde çalsın" },
  f_engine:     { en: "Voice", tr: "Ses motoru" },
  f_engine_s:   { en: "AI voices sound natural; Google Translate is free",
                  tr: "AI sesler doğal; Google Translate ücretsiz" },
  f_engine_def: { en: "— pick a voice —", tr: "— bir ses seç —" },
  f_say:        { en: "Announcement first", tr: "Önce anons" },
  f_say_s:      { en: "spoken before the sound plays — the siren waits for it",
                  tr: "ses çalmadan önce konuşur — siren onu bekler" },
  f_wait:       { en: "Wait until it finishes", tr: "Bitmesini bekle" },
  f_wait_s:     { en: "hold the next step until playback ends", tr: "çalması bitene kadar sonraki adımı bekletir" },
  f_drop:       { en: "Drop an audio file here, or", tr: "Ses dosyasını buraya bırak, ya da" },
  f_browse:     { en: "pick from the library", tr: "kütüphaneden seç" },
  f_dropping:   { en: "Release to upload", tr: "Yüklemek için bırak" },
  f_uploading:  { en: "Uploading…", tr: "Yükleniyor…" },
  f_upload_ok:  { en: "Uploaded", tr: "Yüklendi" },
  f_upload_err: { en: "Upload failed", tr: "Yüklenemedi" },
  f_library:    { en: "Sound library", tr: "Ses kütüphanesi" },
  f_lib_empty:  { en: "No audio files in your www folder yet.", tr: "www klasöründe henüz ses dosyası yok." },
  f_only_audio: { en: "Only audio files (mp3, wav, ogg…)", tr: "Sadece ses dosyası (mp3, wav, ogg…)" },
  f_seconds:    { en: "Seconds", tr: "Saniye" },
  f_message:    { en: "Message", tr: "Mesaj" },
  f_media_url:  { en: "Media URL", tr: "Medya adresi" },
  f_default_pl: { en: "alarm speaker", tr: "alarm hoparlörü" },
  pick_some:    { en: "Pick at least one device.", tr: "En az bir cihaz seç." },

  common_h:     { en: "House rules", tr: "Ev kuralları" },
  restore_t:    { en: "Survive a restart", tr: "Restart'tan sağ çık" },
  restore_s:    { en: "the last mode comes back when Home Assistant restarts",
                  tr: "Home Assistant yeniden başlayınca son mod geri gelir" },
  warn_t:       { en: "Warn when arming is blocked", tr: "Kurulamayınca uyar" },
  warn_s:       { en: "spoken warning + notification when something is left open",
                  tr: "bir şey açık kalmışsa sesli uyarı + bildirim" },
  guard_t:      { en: "Unavailable watchdog", tr: "Unavailable bekçisi" },
  guard_s:      { en: "notify if a device drops off while armed",
                  tr: "kuruluyken bir cihaz düşerse bildirim gönder" },
  lguard_t:     { en: "Light guard", tr: "Işık kontrolü" },
  lguard_s:     { en: "turn lights back off while armed", tr: "kuruluyken açılan ışıkları kapat" },

  set_sound:    { en: "ANNOUNCEMENTS", tr: "ANONSLAR" },
  set_sound_s:  { en: "every sound is a step under Actions — each step picks its own voice and speakers. This one setting applies to all of them.",
                  tr: "her ses Eylemler altında bir adımdır — her adım kendi sesini ve hoparlörünü seçer. Buradaki tek ayar hepsi için geçerlidir." },
  f_ttsvol:     { en: "Announcement volume", tr: "Anons ses seviyesi" },
  f_ttsvol_s:   { en: "the speaker is raised to this before an announcement and put back after — a muted tablet swallows the alarm",
                  tr: "anons öncesi hoparlör bu seviyeye çıkar, sonra eski haline döner — sessizdeki tablet alarmı yutar" },
  f_ttsvol_off: { en: "leave as is", tr: "dokunma" },
  f_svol:       { en: "Volume for this announcement", tr: "Bu anonsun ses seviyesi" },
  f_svol_s:     { en: "the speaker is set to this while it speaks", tr: "konuşurken hoparlör bu seviyeye ayarlanır" },
  f_svol_def:   { en: "use Settings", tr: "Ayarlar'daki" },
  f_svol_after: { en: "Volume afterwards", tr: "Anonstan sonraki ses" },
  f_svol_after_s:{ en: "where to leave the speaker once it has finished",
                  tr: "anons bitince hoparlör bu seviyede bırakılır" },
  f_svol_back:  { en: "put it back", tr: "eski haline dön" },
  test:         { en: "test", tr: "test" },
  stop:         { en: "stop", tr: "durdur" },
  set_notif:    { en: "NOTIFICATIONS", tr: "BİLDİRİMLER" },
  f_cams:       { en: "Snapshot cameras", tr: "Snapshot kameraları" },
  f_cams_s:     { en: "a still from each is attached when the alarm fires",
                  tr: "alarm çalınca her birinden bir kare eklenir" },
  add_cam:      { en: "add camera", tr: "kamera ekle" },
  f_crit:       { en: "Critical notification", tr: "Kritik bildirim" },
  f_crit_s:     { en: "rings even on silent", tr: "sessizdeyken bile çalar" },
  f_tgchat:     { en: "Telegram group/chat ID", tr: "Telegram grup/chat ID" },
  f_tgchat_s:   { en: "photos and texts go here; empty = the bot's default chat. Group ids are negative (e.g. -700720774)",
                  tr: "fotoğraf ve metinler buraya gider; boşsa botun varsayılan sohbeti. Grup ID'leri eksi ile başlar (ör. -700720774)" },
  fmt_short:    { en: "Short", tr: "Kısa" },
  fmt_alert:    { en: "Alarming", tr: "Uyarıcı" },
  fmt_calm:     { en: "Calm", tr: "Sakin" },
  fmt_custom:   { en: "Custom", tr: "Kendi metnim" },
  nb_inc:       { en: "Include in the message", tr: "Bildirime ekle" },
  inc_room:     { en: "Which room", tr: "Hangi oda" },
  inc_sensor:   { en: "Which sensor", tr: "Hangi sensör" },
  inc_time:     { en: "Time", tr: "Saat" },
  inc_mode:     { en: "Which mode", tr: "Hangi mod" },
  inc_open:     { en: "What's still open", tr: "Açık kalanlar" },
  nb_cam:       { en: "Camera from the triggering room", tr: "Tetiklenen odanın kamerası" },
  nb_cam_s:     { en: "if that room has a camera; otherwise the list below",
                  tr: "o odada kamera varsa; yoksa aşağıdaki liste" },
  ns_src:       { en: "Message", tr: "Metin" },
  ns_ready:     { en: "Ready format", tr: "Hazır kalıp" },
  ns_own:       { en: "My own text", tr: "Kendi metnim" },
  ns_cam:       { en: "Camera", tr: "Kamera" },
  cam_none:     { en: "None", tr: "Yok" },
  cam_room:     { en: "The triggering room", tr: "Tetiklenen oda" },
  cam_pick:     { en: "Pick", tr: "Seç" },
  cam_pick_s:   { en: "attach these cameras", tr: "bu kameraları ekle" },
  ns_to:        { en: "Send to", tr: "Kime gönder" },
  ns_to_s:      { en: "leave empty to use the devices in Settings",
                  tr: "boş bırakırsan Ayarlar'daki cihazlar kullanılır" },
  ns_add_to:    { en: "add device", tr: "cihaz ekle" },
  stop_dis:     { en: "Stop actions when disarmed", tr: "Kapatınca eylemler dursun" },
  stop_dis_s:   { en: "on: the running chain stops at once and the alarm lights go back to normal · off: it plays to the end (its own last steps clean up)",
                  tr: "açık: çalışan zincir hemen durur, alarm ışıkları normale döner · kapalı: zincir sonuna kadar oynar (son adımları temizliği yapar)" },
  ns_crit:      { en: "Critical alert", tr: "Kritik bildirim" },
  ns_crit_s:    { en: "rings even on silent — keep it on for the alarm, off for “armed / disarmed” notices",
                  tr: "sessizdeyken bile çalar — alarm için açık, “kuruldu / kapatıldı” için kapalı bırak" },
  ns_tg:        { en: "Also send to Telegram", tr: "Telegram'a da gönder" },
  ns_tg_s:      { en: "photo + text straight to a Telegram target via the bot",
                  tr: "fotoğraf + metin bot ile doğrudan bir Telegram hedefine" },
  ns_tg_id:     { en: "Bot / target", tr: "Bot / hedef" },
  ns_tg_id_s:   { en: "pick a Telegram target — each is a bot + chat",
                  tr: "bir Telegram hedefi seç — her biri bir bot + sohbet" },
  ns_tg_settings:{ en: "Group from Settings", tr: "Ayarlar'daki grup" },
  ns_tg_manual: { en: "Enter chat id manually", tr: "Elle chat id gir" },
  ns_tg_note:   { en: "goes to:", tr: "gider:" },
  set_sec:      { en: "SECURITY", tr: "GÜVENLİK" },
  f_code:       { en: "Disarm code", tr: "Alarm kodu" },
  f_code_s:     { en: "typed on the alarm card, not here", tr: "alarm kartından girilir, buradan değil" },
  f_attempts:   { en: "Wrong code limit", tr: "Yanlış kod limiti" },
  attempts_u:   { en: "tries", tr: "deneme" },
  set_lang:     { en: "LANGUAGE", tr: "DİL" },
  set_ai:       { en: "AI VOICES", tr: "AI SESLER" },
  ai_note2:     { en: "Your own OpenAI / Gemini key — the AI voices show up in every voice dropdown. No HA integration needed. Keys stay in Home Assistant.",
                  tr: "Kendi OpenAI / Gemini anahtarın — AI sesler her ses menüsünde çıkar. HA entegrasyonu gerekmez. Anahtarlar HA'dan çıkmaz." },
  ai_openai_s:  { en: "for OpenAI voices (alloy, nova, onyx…)", tr: "OpenAI sesleri için (alloy, nova, onyx…)" },
  ai_gemini_s:  { en: "for Gemini voices (Kore, Puck, Charon…)", tr: "Gemini sesleri için (Kore, Puck, Charon…)" },
  ai_ready:     { en: "AI voices are now available in the voice dropdowns", tr: "AI sesler artık ses menülerinde seçilebilir" },
  f_lang:       { en: "Panel language", tr: "Panel dili" },
  set_card:     { en: "CARD", tr: "KART" },
  f_cardbg:     { en: "Card background", tr: "Kart arka planı" },
  f_cardbg_s:   { en: " — drop an image here, or paste a /local/… path", tr: " — buraya bir resim bırak, ya da /local/… yolu yaz" },
  bg_drop:      { en: "Drop an image here", tr: "Resmi buraya bırak" },
  bg_clear:     { en: "Remove", tr: "Kaldır" },
  bg_upload:    { en: "Uploading…", tr: "Yükleniyor…" },
  bg_bad:       { en: "Only image files", tr: "Sadece resim dosyası" },
  close:        { en: "Close", tr: "Kapat" },

  set_file:     { en: "BACKUP FILE", tr: "YEDEK DOSYASI" },
  file_s:       { en: "keep a copy of everything on your computer — zones, sensors, actions, schedules, keys",
                  tr: "her şeyin bir kopyasını bilgisayarında sakla — bölgeler, sensörler, eylemler, programlar, anahtarlar" },
  file_save:    { en: "save to a file", tr: "dosyaya kaydet" },
  file_load:    { en: "load from a file", tr: "dosyadan yükle" },
  file_saved:   { en: "Saved: {n}", tr: "Kaydedildi: {n}" },
  file_bad:     { en: "That is not a Sentinel backup file", tr: "Bu bir Sentinel yedek dosyası değil" },
  file_load_q:  { en: "Restore from this file?", tr: "Bu dosyadan geri yüklensin mi?" },
  file_load_b:  { en: "“{f}” — {z} devices in zones, {s} action steps. Your current settings are kept in the version history, so you can undo this.",
                  tr: "“{f}” — bölgelerde {z} cihaz, {s} eylem adımı. Şu anki ayarların sürüm geçmişine kaydedilir, geri alabilirsin." },
  file_load_ok: { en: "Yes, restore", tr: "Evet, geri yükle" },
  file_loaded:  { en: "Settings restored", tr: "Ayarlar geri yüklendi" },
  set_undo:     { en: "VERSION HISTORY", tr: "SÜRÜM GEÇMİŞİ" },
  undo_s:       { en: "every change is kept — go back to any earlier version",
                  tr: "her değişiklik saklanır — istediğin eski sürüme dön" },
  undo_none:    { en: "No earlier versions yet.", tr: "Henüz eski sürüm yok." },
  undo_zones:   { en: "in zones", tr: "bölgede" },
  undo_steps:   { en: "steps", tr: "adım" },
  undo_do:      { en: "Restore", tr: "Geri yükle" },
  undo_q:       { en: "Go back to this version?", tr: "Bu sürüme dönülsün mü?" },
  undo_b:       { en: "The current settings are saved first, so you can come back.",
                  tr: "Şu anki ayarlar da kaydedilir, geri dönebilirsin." },
  undo_ok:      { en: "Restored", tr: "Geri yüklendi" },
  step_test:    { en: "try it", tr: "dene" },

  saved:        { en: "Saved", tr: "Kaydedildi" },
  save_err:     { en: "Could not save", tr: "Kaydedilemedi" },
  pick:         { en: "Pick an entity", tr: "Entity seç" },
  search:       { en: "Search…", tr: "Ara…" },
  none_found:   { en: "Nothing found.", tr: "Sonuç yok." },
  sec_u:        { en: "s", tr: "sn" },
  min_u:        { en: "min", tr: "dk" },
};

/* Uygulamayla gelen geri sayım bipleri (www/sentinel/*.mp3) */
const BEEP_SOUNDS = ["arm_beep_soft", "arm_beep_classic", "arm_beep_low",
  "arm_beep_double", "arm_beep_tick"];

/* Sentinel'in kendi AI TTS sesleri (engine değeri "openai:<v>" / "gemini:<v>") */
const OPENAI_VOICES = ["alloy", "ash", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer"];
const GEMINI_VOICES = ["Kore", "Puck", "Charon", "Zephyr", "Aoede", "Fenrir", "Leda", "Orus"];

/* ---- hangi domain'ler "cihaz" sayilir (Dial Tap ile ayni) ---- */
const DOM_META = {
  light:        { icon: "mdi:lightbulb-outline" },
  switch:       { icon: "mdi:power-socket-eu" },
  climate:      { icon: "mdi:snowflake" },
  fan:          { icon: "mdi:fan" },
  media_player: { icon: "mdi:television-classic" },
  cover:        { icon: "mdi:blinds-horizontal" },
  lock:         { icon: "mdi:lock-outline" },
  vacuum:       { icon: "mdi:robot-vacuum" },
  humidifier:   { icon: "mdi:air-humidifier" },
  camera:       { icon: "mdi:cctv" },
  binary_sensor:{ icon: "mdi:radar" },
  sensor:       { icon: "mdi:gauge" },
  input_boolean:{ icon: "mdi:toggle-switch-outline" },
  input_select: { icon: "mdi:form-dropdown" },
  scene:        { icon: "mdi:palette-outline" },
  script:       { icon: "mdi:script-text-outline" },
  automation:   { icon: "mdi:robot-outline" },
};
const GROUP_DEF = [
  { key: "guv",   name: { en: "Security", tr: "Güvenlik" },      icon: "mdi:shield-home-outline",  doms: ["binary_sensor", "lock", "camera"] },
  { key: "isik",  name: { en: "Lights", tr: "Işıklar" },         icon: "mdi:lightbulb-outline",    doms: ["light"] },
  /* Işık grupları (Hue oda/zone + HA ışık grubu) — tek tek ışıklardan AYRI
     listelenir. Bunlar "bölge" gibi çalışır: Çekim Alanı, Röportaj, Ark Zone… */
  { key: "isikgrup", name: { en: "Light groups", tr: "Işık Grupları" },
    icon: "mdi:lightbulb-group-outline", doms: ["light"] },
  { key: "priz",  name: { en: "Plugs & switches", tr: "Priz & Anahtar" }, icon: "mdi:power-socket-eu", doms: ["switch", "input_boolean"] },
  { key: "perde", name: { en: "Covers", tr: "Perde & Panjur" },   icon: "mdi:blinds-horizontal",    doms: ["cover"] },
  { key: "iklim", name: { en: "Climate", tr: "İklim" },           icon: "mdi:thermostat",           doms: ["climate", "fan", "humidifier"] },
  { key: "medya", name: { en: "Media", tr: "Medya" },             icon: "mdi:television-classic",   doms: ["media_player"] },
  { key: "temiz", name: { en: "Cleaning", tr: "Temizlik" },       icon: "mdi:robot-vacuum",         doms: ["vacuum"] },
  { key: "olcum", name: { en: "Readings", tr: "Ölçümler" },       icon: "mdi:gauge",                doms: ["sensor"] },
  { key: "sahne", name: { en: "Scenes & scripts", tr: "Sahne & Script" }, icon: "mdi:palette-outline", doms: ["scene", "script", "automation", "input_select"] },
];
/* Genel sayfasında bölge içi tür grupları — sıra önemli. */
const ZONE_KINDS = [
  { key: "motion",   tk: "kind_motion",   icon: "mdi:motion-sensor" },
  { key: "presence", tk: "kind_presence", icon: "mdi:account-check-outline" },
  { key: "camera",   tk: "kind_camera",   icon: "mdi:cctv" },
  { key: "contact",  tk: "kind_contact",  icon: "mdi:door" },
  { key: "other",    tk: "kind_other",    icon: "mdi:shape-outline" },
];
const BSENSOR_ICON = {
  motion: "mdi:motion-sensor", occupancy: "mdi:account-check-outline", presence: "mdi:account-check-outline",
  door: "mdi:door", window: "mdi:window-closed-variant", opening: "mdi:door-open",
  garage_door: "mdi:garage", moisture: "mdi:water-alert", smoke: "mdi:smoke-detector",
  gas: "mdi:gas-cylinder", vibration: "mdi:vibrate", tamper: "mdi:shield-alert-outline",
  safety: "mdi:alert-outline", sound: "mdi:ear-hearing", battery: "mdi:battery-alert",
};
const SENSOR_ICON = {
  temperature: "mdi:thermometer", humidity: "mdi:water-percent",
  illuminance: "mdi:brightness-5", power: "mdi:lightning-bolt",
  energy: "mdi:lightning-bolt-circle", carbon_dioxide: "mdi:molecule-co2", pm25: "mdi:blur",
};
/* alarm ancak bunlari izleyebilir — digerleri gri gorunur, surukletilmez */
const ARMABLE = ["binary_sensor", "lock", "cover", "light", "switch", "input_boolean", "media_player", "fan"];
const CONTACT_CLASSES = ["door", "window", "opening", "garage_door"];
const SEC_CLASSES = ["motion", "occupancy", "presence", "door", "window", "opening",
  "garage_door", "moisture", "smoke", "gas", "vibration", "tamper", "safety"];

const MODES = [
  { key: "home",     tk: "m_home",  sk: "m_home_s",  icon: "mdi:home-outline",   col: "#b58cff" },
  { key: "away",     tk: "m_away",  sk: "m_away_s",  icon: "mdi:car-outline",    col: "#ff8fb3" },
  { key: "night",    tk: "m_night", sk: "m_night_s", icon: "mdi:weather-night",  col: "#9d8cff" },
  { key: "vacation", tk: "m_vac",   sk: "m_vac_s",   icon: "mdi:palm-tree",      col: "#ffb86b" },
];

/* ---- alarm calinca calisacak adim turleri ---- */
const ACT_TYPES = [
  { key: "light",  tk: "a_light",  sk: "a_light_s",  icon: "mdi:lightbulb-on-outline", dom: "light" },
  { key: "wait",   tk: "a_wait",   sk: "a_wait_s",   icon: "mdi:timer-sand" },
  { key: "tts",    tk: "a_tts",    sk: "a_tts_s",    icon: "mdi:message-text-outline" },
  { key: "beep",   tk: "a_beep",   sk: "a_beep_s",   icon: "mdi:metronome" },
  { key: "media",  tk: "a_media",  sk: "a_media_s",  icon: "mdi:music-note" },
  { key: "power",  tk: "a_power",  sk: "a_power_s",  icon: "mdi:power", dom: "any" },
  { key: "switch", tk: "a_switch", sk: "a_switch_s", icon: "mdi:power-socket-eu", dom: "switch|input_boolean" },
  { key: "cover",  tk: "a_cover",  sk: "a_cover_s",  icon: "mdi:blinds-horizontal", dom: "cover" },
  { key: "lock",   tk: "a_lock",   sk: "a_lock_s",   icon: "mdi:lock-outline", dom: "lock" },
  { key: "scene",  tk: "a_scene",  sk: "a_scene_s",  icon: "mdi:palette-outline", dom: "scene" },
  { key: "script", tk: "a_script", sk: "a_script_s", icon: "mdi:script-text-outline", dom: "script" },
  { key: "notify", tk: "a_notify", sk: "a_notify_s", icon: "mdi:cellphone-message" },
];
const ACT_EVENTS = [
  { key: "trigger", tk: "ev_trigger", sk: "ev_trigger_s", icon: "mdi:bell-ring",           col: "#ff5c6f" },
  { key: "arming",  tk: "ev_arming",  sk: "ev_arming_s",  icon: "mdi:shield-sync-outline", col: "#ffb86b" },
  { key: "entry",   tk: "ev_entry",   sk: "ev_entry_s",   icon: "mdi:door-open",           col: "#ff8fb3" },
  { key: "arm",     tk: "ev_arm",     sk: "ev_arm_s",     icon: "mdi:shield-check",        col: "#b58cff" },
  { key: "disarm",  tk: "ev_disarm",  sk: "ev_disarm_s",  icon: "mdi:shield-off-outline",  col: "#5fe39a" },
];
const COLORS = [
  { name: "red",    rgb: [255, 0, 0] },
  { name: "orange", rgb: [255, 120, 0] },
  { name: "amber",  rgb: [255, 190, 60] },
  { name: "green",  rgb: [40, 220, 120] },
  { name: "cyan",   rgb: [0, 200, 220] },
  { name: "blue",   rgb: [40, 110, 255] },
  { name: "purple", rgb: [160, 70, 255] },
  { name: "pink",   rgb: [255, 70, 150] },
  { name: "white",  rgb: [255, 245, 230] },
];

function roomIcon(name) {
  const n = norm(name);
  const map = [
    [/salon|oturma|living/, "mdi:sofa"], [/yatak|bedroom/, "mdi:bed-king"],
    [/mutfak|kitchen/, "mdi:fridge-outline"], [/banyo|dus|bath/, "mdi:shower"],
    [/cocuk|bebek|kid|child/, "mdi:teddy-bear"], [/ofis|calisma|office/, "mdi:desk"],
    [/balkon|teras|balcon|terrace/, "mdi:balcony"], [/koridor|antre|hol|hall|corridor/, "mdi:door-open"],
    [/tuvalet|wc|toilet/, "mdi:toilet"], [/yemek|dining/, "mdi:silverware-fork-knife"],
    [/garaj|garage/, "mdi:garage"], [/bahce|garden|yard|sokak|street/, "mdi:tree"],
    [/camasir|laundry/, "mdi:washing-machine"], [/giris|entry|entrance/, "mdi:door"],
    [/giysi|dolap|closet|wardrobe/, "mdi:hanger"],
  ];
  for (const [re, ic] of map) if (re.test(n)) return ic;
  return "mdi:door";
}

class SentinelAlarmPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._cfg = null;
    this._events = [];
    this._built = false;
    this._loaded = false;
    // Yenilediğinde kaldığın yerde kal.
    this._page = this._readPage() || "genel";  // genel | status | sensors | modes | actions | room:<id>
    this._saveTimer = null;
  }

  _readPage() {
    try { return window.localStorage.getItem("sentinel_alarm_page") || ""; }
    catch (e) { return ""; }
  }

  _go(page) {
    this._page = page;
    try { window.localStorage.setItem("sentinel_alarm_page", page); } catch (e) { /* özel mod */ }
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._loaded) { this._loaded = true; this._load(); return; }
    if (this._page === "status") { this._renderStage(); return; }
    // Genel / oda / sensör sayfaları da cihazların canlı durumunu gösterir —
    // onları da tazele ama hafif ve gecikmeli, sürüklemeyi bozmadan.
    if (this._page === "genel" || this._page === "sensors"
        || this._page.startsWith("room:")) {
      this._liveThrottle();
    }
  }

  _liveThrottle() {
    if (this._liveTimer) return;
    this._liveTimer = setTimeout(() => {
      this._liveTimer = null;
      // Sürükleme sırasında ya da bir modal/seçici açıkken yeniden çizme —
      // yoksa tutulan cihaz elden kaçar ya da açık form kaybolur.
      if (this._dragging) return;
      if (this.shadowRoot.querySelector(".ov")) return;
      const ae = this.shadowRoot.activeElement;
      if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA")) return;
      this._renderStage();
    }, 1200);
  }

  connectedCallback() { if (this._cfg) this._render(); }
  disconnectedCallback() { clearInterval(this._poll); }

  async _load() {
    try { this._cfg = await this._hass.callApi("GET", "sentinel_alarm/config"); }
    catch (e) { this._cfg = {}; }
    if (!this._cfg || typeof this._cfg !== "object") this._cfg = {};
    this._normalize();
    await this._loadEvents();
    this._render();
    this._pulse();
  }

  async _loadEvents() {
    try {
      const r = await this._hass.callApi("GET", "sentinel_alarm/events");
      this._events = (r && r.events) || [];
      this._progress = (r && r.progress) || { running: false };
      this._lastRun = (r && r.last_run) || null;
      this._runs = (r && r.runs) || [];
    } catch (e) { this._events = []; }
  }

  /* Bir zincir çalışırken saniye saniye izle; bittiğinde yavaşla. */
  _pulse() {
    clearInterval(this._poll);
    const tick = async () => {
      const onLive = this._page === "status" || this._page === "actions";
      if (!onLive) return;
      await this._loadEvents();
      this._renderStage();
      const running = this._progress && this._progress.running;
      const want = running ? 1000 : 8000;
      if (want !== this._pollEvery) { this._pollEvery = want; this._pulse(); }
    };
    this._pollEvery = this._pollEvery || 8000;
    this._poll = setInterval(tick, this._pollEvery);
  }

  _normalize() {
    const c = this._cfg;
    if (c.lang !== "tr" && c.lang !== "en") c.lang = "en";
    const def = { home: [0, 45, 180], away: [60, 45, 300], night: [0, 45, 180], vacation: [60, 45, 300] };
    if (!c.modes || typeof c.modes !== "object") c.modes = {};
    if (!c.assign || typeof c.assign !== "object") c.assign = {};
    for (const m of Object.keys(def)) {
      const d = def[m];
      c.modes[m] = Object.assign({ exit: d[0], entry: d[1], trigger: d[2] }, c.modes[m] || {});
      if (!Array.isArray(c.assign[m])) c.assign[m] = [];
    }
    if (!c.sensors || typeof c.sensors !== "object") c.sensors = {};
    if (!Array.isArray(c.lights)) c.lights = [];
    if (!Array.isArray(c.notify)) c.notify = [];
    if (!Array.isArray(c.cameras)) c.cameras = [];
    if (!c.vacation_cfg || typeof c.vacation_cfg !== "object") c.vacation_cfg = {};
    if (!Array.isArray(c.vacation_cfg.bypass)) c.vacation_cfg.bypass = [];
    if (!Array.isArray(c.vacation_cfg.sim)) c.vacation_cfg.sim = [];
    if (!c.actions || typeof c.actions !== "object") c.actions = {};
    for (const ev of ACT_EVENTS) if (!Array.isArray(c.actions[ev.key])) c.actions[ev.key] = [];
    // ilk adımın "öncekiyle birlikte" bayrağı anlamsız
    for (const ev of ACT_EVENTS) if (c.actions[ev.key][0]) c.actions[ev.key][0].parallel = false;
    if (typeof c.telegram_chat !== "string") c.telegram_chat = "";
    if (!c.notify_msg || typeof c.notify_msg !== "object") c.notify_msg = {};
    const nm = c.notify_msg;
    if (!["short", "alert", "calm", "custom"].includes(nm.format)) nm.format = "alert";
    if (typeof nm.custom !== "string") nm.custom = "";
    if (nm.room_camera === undefined) nm.room_camera = true;
    if (!nm.include || typeof nm.include !== "object") nm.include = {};
    for (const [k, v] of [["room", true], ["sensor", true], ["time", true],
      ["mode", false], ["open", false]]) if (nm.include[k] === undefined) nm.include[k] = v;
    if (!c.ai || typeof c.ai !== "object") c.ai = { provider: "", token: "" };
    for (const [k, v] of [["critical", true], ["restore", true], ["warn_on_blocked", true],
      ["unavail_watch", true], ["light_guard", true], ["volume", 85], ["code_attempts", 3]])
      if (c[k] === undefined) c[k] = v;
  }

  _save() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      this._hass.callApi("POST", "sentinel_alarm/config", this._cfg)
        .then(() => this._flash(this.T("saved")))
        .catch(() => this._flash(this.T("save_err"), true));
    }, 400);
  }

  /* Kapatma. Kod tanimliysa sor — panel yonetici sayfasi olsa da saklanan
     kodu sessizce gecmek, kod korumasini bu uc icin sozde birakirdi. */
  _disarmAsk() {
    const st = this._hass && this._hass.states["alarm_control_panel.sentinel_alarm"];
    const needs = st && st.attributes && st.attributes.code_format;
    if (!needs) { this._action({ action: "disarm" }); return; }
    const code = window.prompt(this.T("code_prompt"));
    if (code === null || code === "") return;
    this._action({ action: "disarm", code });
  }

  async _action(body) {
    try {
      const r = await this._hass.callApi("POST", "sentinel_alarm/action", body);
      if (r && r.ok === false) this._flash(r.error || "error", true);
      await this._loadEvents();
      this._renderStage();
      return r;
    } catch (e) { this._flash(String(e), true); }
  }

  T(key) {
    const row = I18N[key];
    if (!row) return key;
    return row[this._lang()] || row.en || key;
  }
  _lang() { return this._cfg && this._cfg.lang === "tr" ? "tr" : "en"; }

  _flash(text, err) {
    const s = this.shadowRoot.getElementById("status");
    if (!s) return;
    s.textContent = "● " + text;
    s.style.color = err ? "#ff6b7d" : "#5fe39a";
    s.style.opacity = "1";
    clearTimeout(this._flashTimer);
    this._flashTimer = setTimeout(() => { s.style.opacity = "0"; }, 1800);
  }

  /* -------------------------------------------------------------- veri */
  get _alarm() {
    const st = this._hass && this._hass.states;
    if (!st) return null;
    for (const eid of Object.keys(st)) {
      if (!eid.startsWith("alarm_control_panel.")) continue;
      const a = st[eid].attributes || {};
      if (a.language !== undefined && a.watched !== undefined) return st[eid];
    }
    return st["alarm_control_panel.sentinel_alarm"] || null;
  }

  _name(eid) {
    const s = this._hass && this._hass.states[eid];
    return s ? (s.attributes.friendly_name || eid) : eid;
  }
  _dc(eid) {
    const s = this._hass && this._hass.states[eid];
    return (s && s.attributes && s.attributes.device_class) || "";
  }
  _entIcon(eid) {
    const dom = eid.split(".")[0];
    const dc = this._dc(eid);
    if (this._isLightGroup(eid)) return "mdi:lightbulb-group-outline";
    if (dom === "binary_sensor" && BSENSOR_ICON[dc]) return BSENSOR_ICON[dc];
    if (dom === "sensor" && SENSOR_ICON[dc]) return SENSOR_ICON[dc];
    return (DOM_META[dom] || {}).icon || "mdi:circle-medium";
  }

  /* Hue oda/zone ya da HA ışık grubu mu? İçinde üye listesi varsa gruptur. */
  _isLightGroup(eid) {
    if (!eid.startsWith("light.")) return false;
    const st = this._hass && this._hass.states[eid];
    const members = st && st.attributes ? st.attributes.entity_id : null;
    return Array.isArray(members) && members.length > 0;
  }
  _armable(eid) { return ARMABLE.includes(eid.split(".")[0]); }

  /* Işık flash'ı nasıl yapabilir? native (kendi) / dim (karartma) / none */
  _flashKind(eid) {
    const st = this._hass && this._hass.states[eid];
    if (!st) return "none";
    const sf = (st.attributes && st.attributes.supported_features) || 0;
    if (sf & 8) return "native";          // LightEntityFeature.FLASH
    return this._canDim(eid) ? "dim" : "none";
  }

  /* Karartılabiliyor mu? Sadece "onoff" ise röle/anahtar demektir; strobe edilemez. */
  _canDim(eid) {
    const st = this._hass && this._hass.states[eid];
    if (!st) return false;
    const modes = (st.attributes && st.attributes.supported_color_modes) || [];
    return modes.some((m) => m !== "onoff" && m !== "unknown");
  }

  _entOk(eid, ent) {
    if (ent && (ent.hidden || ent.hidden_by || ent.disabled_by || ent.entity_category)) return false;
    return !!DOM_META[eid.split(".")[0]];
  }

  /* area_id -> [eid] — odadaki HER cihaz */
  _byRoom() {
    const h = this._hass;
    const out = {};
    if (!h) return out;
    const push = (area, eid) => { (out[area || "__none"] = out[area || "__none"] || []).push(eid); };
    for (const [eid, ent] of Object.entries(h.entities || {})) {
      if (!this._entOk(eid, ent)) continue;
      let area = ent.area_id;
      if (!area && ent.device_id && h.devices && h.devices[ent.device_id])
        area = h.devices[ent.device_id].area_id;
      push(area, eid);
    }
    for (const eid of Object.keys(h.states || {})) {
      if (h.entities && h.entities[eid]) continue;
      if (!this._entOk(eid, null)) continue;
      push(null, eid);
    }
    for (const k of Object.keys(out))
      out[k].sort((a, b) => this._name(a).localeCompare(this._name(b), "tr"));
    return out;
  }

  _roomList() {
    const h = this._hass;
    const byRoom = this._byRoom();
    const rooms = [];
    const areas = h && h.areas ? Object.values(h.areas) : [];
    areas.sort((a, b) => (a.name || "").localeCompare(b.name || "", "tr"));
    for (const a of areas) {
      const ents = byRoom[a.area_id] || [];
      if (!ents.length) continue;
      rooms.push({ id: a.area_id, name: a.name, icon: a.icon || roomIcon(a.name), ents });
    }
    if (byRoom.__none && byRoom.__none.length) {
      rooms.push({ id: "__none", name: this._lang() === "tr" ? "Diğer" : "Other",
        icon: "mdi:shape-outline", ents: byRoom.__none });
    }
    return rooms;
  }

  _zonesOf(eid) {
    return MODES.filter((m) => (this._cfg.assign[m.key] || []).includes(eid));
  }

  _allAssigned() {
    const set = new Set();
    for (const m of MODES) for (const e of this._cfg.assign[m.key] || []) set.add(e);
    return Array.from(set).sort((a, b) => this._name(a).localeCompare(this._name(b), "tr"));
  }

  _sensorCfg(eid) {
    if (!this._cfg.sensors[eid]) this._cfg.sensors[eid] = { delay: 0, unavail: true, entry: false };
    const s = this._cfg.sensors[eid];
    if (s.delay === undefined) s.delay = 0;
    if (s.unavail === undefined) s.unavail = true;
    if (s.entry === undefined) s.entry = false;
    if (s.confirm === undefined) s.confirm = "";
    if (s.confirm_window === undefined) s.confirm_window = 15;
    if (s.area === undefined) s.area = "";
    return s;
  }

  /* Sensörü türüne göre sınıflandır — Genel sayfası bunları ayrı gruplar. */
  _sensorKind(eid) {
    const dom = eid.split(".")[0];
    if (dom === "camera") return "camera";
    const dc = this._dc(eid);
    if (dom === "binary_sensor") {
      if (dc === "motion" || dc === "vibration" || dc === "sound") return "motion";
      if (dc === "occupancy" || dc === "presence") return "presence";
      if (CONTACT_CLASSES.includes(dc)) return "contact";
    }
    if (dom === "lock" || dom === "cover") return "contact";
    return "other";
  }

  /* Entity hangi odada? Panel override → HA area. İsimden TAHMİN yok. */
  _areaName(eid) {
    const h = this._hass;
    if (!h) return "";
    // 1. panelde elle atanmış oda
    const ov = (this._cfg.sensors[eid] || {}).area;
    if (ov && h.areas && h.areas[ov]) return h.areas[ov].name;
    // 2. HA area (entity ya da cihazı) — odası yoksa boş, elle atanır
    const ent = h.entities && h.entities[eid];
    let area = ent && ent.area_id;
    if (!area && ent && ent.device_id && h.devices && h.devices[ent.device_id])
      area = h.devices[ent.device_id].area_id;
    if (area && h.areas && h.areas[area]) return h.areas[area].name;
    return "";
  }

  /* HA'da atanmış ham area_id (override/çıkarım hariç). Yoksa null. */
  _haArea(eid) {
    const h = this._hass;
    if (!h) return null;
    const ent = h.entities && h.entities[eid];
    let a = ent && ent.area_id;
    if (!a && ent && ent.device_id && h.devices && h.devices[ent.device_id])
      a = h.devices[ent.device_id].area_id;
    return a || null;
  }

  /* Doğrulayıcı olarak seçilebilecek sensörler — hareket/varlık binary_sensor'ler. */
  _confirmCandidates(eid) {
    const h = this._hass;
    if (!h) return [];
    const out = [];
    for (const [e, st] of Object.entries(h.states || {})) {
      if (e === eid || !e.startsWith("binary_sensor.")) continue;
      const dc = (st.attributes && st.attributes.device_class) || "";
      if (dc === "motion" || dc === "occupancy" || dc === "presence" || dc === "vibration")
        out.push(e);
    }
    out.sort((a, b) => this._name(a).localeCompare(this._name(b), "tr"));
    return out;
  }

  /* Doğrulayıcının okunur adı (rozet + kural ekranı için). */
  _confirmLabel(eid) {
    const c = this._sensorCfg(eid).confirm;
    if (!c) return "";
    if (c === "room") return this.T("needs_room");
    return this._name(c);
  }

  /* canli durum: {on, pulse, text} */
  _stateInfo(eid) {
    const st = this._hass.states[eid];
    const tr = this._lang() === "tr";
    if (!st || st.state === "unavailable" || st.state === "unknown")
      return { on: false, pulse: false, text: tr ? "yok" : "n/a", dead: true };
    const dom = eid.split(".")[0];
    const v = st.state;
    const a = st.attributes || {};
    if (["light", "switch", "fan", "humidifier", "input_boolean"].includes(dom))
      return { on: v === "on", pulse: false, text: v === "on" ? (tr ? "Açık" : "On") : (tr ? "Kapalı" : "Off") };
    if (dom === "cover") {
      const open = v === "open" || v === "opening";
      return { on: open, pulse: v === "opening" || v === "closing",
        text: open ? (tr ? "Açık" : "Open") : (tr ? "Kapalı" : "Closed") };
    }
    if (dom === "lock")
      return { on: v !== "locked", pulse: false, text: v === "locked" ? (tr ? "Kilitli" : "Locked") : (tr ? "Açık" : "Unlocked") };
    if (dom === "media_player")
      return { on: v !== "off", pulse: v === "playing", text: v === "playing" ? (tr ? "Oynatıyor" : "Playing") : (v === "off" ? (tr ? "Kapalı" : "Off") : (tr ? "Açık" : "On")) };
    if (dom === "climate") {
      const on = v !== "off";
      const t = a.current_temperature != null ? ` ${a.current_temperature}°` : "";
      return { on, pulse: false, text: (on ? v : (tr ? "Kapalı" : "Off")) + t };
    }
    if (dom === "binary_sensor") {
      const dc = a.device_class;
      const onTxt = { motion: tr ? "Hareket" : "Motion", occupancy: tr ? "Varlık" : "Present",
        presence: tr ? "Varlık" : "Present", door: tr ? "Açık" : "Open", window: tr ? "Açık" : "Open",
        opening: tr ? "Açık" : "Open", garage_door: tr ? "Açık" : "Open", moisture: tr ? "SU" : "WET",
        smoke: tr ? "DUMAN" : "SMOKE", gas: tr ? "GAZ" : "GAS", vibration: tr ? "Titreşim" : "Shake" };
      const offTxt = { motion: tr ? "Sakin" : "Clear", occupancy: tr ? "Boş" : "Empty",
        presence: tr ? "Boş" : "Empty", door: tr ? "Kapalı" : "Closed", window: tr ? "Kapalı" : "Closed",
        opening: tr ? "Kapalı" : "Closed", garage_door: tr ? "Kapalı" : "Closed" };
      const on = v === "on";
      return { on, pulse: on && ["motion", "occupancy", "presence", "moisture", "smoke", "gas"].includes(dc),
        text: on ? (onTxt[dc] || (tr ? "Aktif" : "Active")) : (offTxt[dc] || (tr ? "Sakin" : "Clear")) };
    }
    if (dom === "sensor") return { on: false, pulse: false, text: `${v}${a.unit_of_measurement || ""}` };
    if (dom === "camera") return { on: false, pulse: false, text: tr ? "Hazır" : "Ready" };
    if (["scene", "script", "automation"].includes(dom)) return { on: false, pulse: false, text: "" };
    return { on: v === "on", pulse: false, text: String(v) };
  }

  _fmtSecs(v) {
    v = Number(v) || 0;
    if (v <= 0) return this.T("instant");
    if (v < 60) return `${v} ${this.T("sec_u")}`;
    const m = Math.floor(v / 60), s = v % 60;
    return s ? `${m} ${this.T("min_u")} ${s}${this.T("sec_u")}` : `${m} ${this.T("min_u")}`;
  }

  /* ---------------------------------------------------------------- iskelet */
  _render() {
    if (!this._hass || !this._cfg) return;
    if (!this._built) this._build();
    this._renderHero();
    this._renderRail();
    this._renderStage();
  }

  _build() {
    this._built = true;
    this.shadowRoot.innerHTML = `
      <style>
        :host{display:block;min-height:100%;background:#0c0a10;color:#fff;
          font-family:'Inter','Segoe UI',system-ui,sans-serif;}
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
        button,.rr,.dev,.pick,.sec-act,.addsec,.tgl,.zchip{touch-action:manipulation;
          user-select:none;-webkit-user-select:none;}
        ha-icon{--mdc-icon-size:20px;display:inline-flex;vertical-align:middle;}

        .top{position:sticky;top:0;z-index:6;background:rgba(12,10,16,.85);backdrop-filter:blur(12px);
          border-bottom:1px solid rgba(255,255,255,.06);}
        .topwrap{max-width:1160px;margin:0 auto;display:flex;align-items:center;gap:12px;padding:14px 28px;}
        .brand{display:flex;align-items:center;gap:10px;font-weight:600;letter-spacing:2.5px;font-size:14px;}
        .brand .logo{width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,#ec4b88,#8b3dff);
          display:flex;align-items:center;justify-content:center;color:#fff;}
        .brand .logo ha-icon{--mdc-icon-size:18px;}
        .status{margin-left:auto;font-size:13px;opacity:0;transition:opacity .25s;color:#5fe39a;}
        .gear{margin-left:14px;width:38px;height:38px;border-radius:11px;border:1px solid rgba(255,255,255,.09);
          background:rgba(255,255,255,.04);color:#b9aeb8;cursor:pointer;display:flex;align-items:center;
          justify-content:center;transition:.15s;flex:0 0 auto;}
        .gear:hover{color:#ff9cc1;border-color:rgba(236,75,136,.5);background:rgba(236,75,136,.08);}

        .wrap{max-width:1160px;margin:0 auto;padding:34px 28px 90px;}
        .hero-l{font-size:12px;letter-spacing:3px;color:#6f6675;text-transform:uppercase;}
        .hero-h{font-family:Georgia,'Times New Roman',serif;font-size:36px;font-weight:500;margin:6px 0 4px;}
        .hero-s{font-size:14.5px;color:#9a90a0;margin-bottom:30px;max-width:660px;line-height:1.55;}

        .layout{display:flex;gap:34px;align-items:flex-start;}
        @media(max-width:860px){.layout{flex-direction:column;}.rail{width:100%!important;position:static!important;}}

        /* ---- ray ---- */
        .rail{width:236px;flex:0 0 auto;position:sticky;top:86px;}
        .rail-l{font-size:11px;letter-spacing:2.5px;color:#5d5464;text-transform:uppercase;padding:16px 14px 8px;}
        .rr{display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:12px;cursor:pointer;
          color:#93899b;position:relative;transition:.16s;}
        .rr:hover{color:#e8dfe8;background:rgba(255,255,255,.035);}
        .rr.on{color:#fff;background:linear-gradient(90deg,rgba(236,75,136,.15),rgba(139,61,255,.05) 70%,transparent);}
        .rr.on::before{content:"";position:absolute;left:-2px;top:9px;bottom:9px;width:3px;border-radius:3px;
          background:linear-gradient(#ec4b88,#8b3dff);box-shadow:0 0 14px rgba(236,75,136,.8);}
        .rr ha-icon{--mdc-icon-size:19px;opacity:.85;flex:0 0 auto;}
        .rr.on ha-icon{color:#ff8fb3;opacity:1;}
        .rr .n{flex:1;font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .rr .c{font-size:11px;color:#5d5464;font-variant-numeric:tabular-nums;}
        .rr.on .c{color:#b9a0c0;}
        .rr.raildrop{background:rgba(236,75,136,.22)!important;outline:2px dashed rgba(236,75,136,.7);outline-offset:-2px;}
        /* alarm bölgeleri — Genel'in altında girintili, sürükle-bırak hedefi */
        .rr.rzone{padding:8px 14px 8px 34px;gap:10px;}
        .rr.rzone .n{font-size:13px;letter-spacing:.3px;}
        .rr.rzone ha-icon{--mdc-icon-size:16px;opacity:1;}

        /* ---- sahne ---- */
        .stage{flex:1;min-width:0;position:relative;}
        .glow{position:absolute;top:-90px;left:-60px;width:420px;height:280px;border-radius:50%;
          background:radial-gradient(closest-side,rgba(236,75,136,.14),rgba(139,61,255,.06) 60%,transparent);
          pointer-events:none;filter:blur(6px);}
        .stage-h{position:relative;display:flex;align-items:flex-end;gap:18px;flex-wrap:wrap;
          padding:2px 0 6px;margin-bottom:6px;}
        .room-title{font-family:Georgia,serif;font-size:42px;font-weight:500;line-height:1.05;}
        .room-meta{font-size:13px;color:#8d8290;padding-bottom:9px;letter-spacing:.2px;}
        .room-meta b{color:#cfc4ce;font-weight:600;}
        .addsec{margin-left:auto;display:inline-flex;align-items:center;gap:7px;padding:9px 16px;
          border-radius:22px;border:1px dashed rgba(255,255,255,.2);background:none;color:#cfc4ce;
          cursor:pointer;font:inherit;font-size:13.5px;transition:.15s;margin-bottom:6px;}
        .addsec ha-icon{--mdc-icon-size:17px;}
        .addsec:hover{border-color:#ec4b88;color:#ff9cc1;background:rgba(236,75,136,.07);}

        .secwrap{margin-top:14px;}
        .sec{position:relative;padding:16px 0 12px 24px;margin-bottom:4px;transition:.14s;}
        .sec::before{content:"";position:absolute;left:0;top:24px;bottom:16px;width:2px;border-radius:2px;
          background:linear-gradient(rgba(236,75,136,.85),rgba(139,61,255,.35) 60%,transparent);}
        .sec.zone::before{background:linear-gradient(var(--zc,#b58cff),rgba(139,61,255,.25) 65%,transparent);}
        .sec-h{display:flex;align-items:center;gap:10px;margin-bottom:13px;min-height:26px;flex-wrap:wrap;}
        .sec-name{font-size:12px;letter-spacing:2.6px;text-transform:uppercase;color:#e2d7e0;font-weight:600;}
        .sec.zone .sec-name{color:var(--zc,#e2d7e0);}
        .sec-count{font-size:11px;color:#5d5464;font-variant-numeric:tabular-nums;letter-spacing:.5px;}
        .sec-sub{font-size:12px;color:#6f6675;margin-left:2px;}
        .sec-h ha-icon{--mdc-icon-size:16px;color:var(--zc,#8d8290);}
        .zclear{margin-left:auto;display:inline-flex;align-items:center;gap:6px;padding:5px 12px;
          border-radius:16px;border:1px solid rgba(255,255,255,.1);background:none;color:#6f6675;
          cursor:pointer;font:inherit;font-size:11.5px;transition:.15s;}
        .zclear ha-icon{--mdc-icon-size:14px;}
        .zclear:hover{border-color:rgba(255,130,150,.5);color:#ff8296;background:rgba(255,130,150,.08);}
        .sec.dropok{background:rgba(139,61,255,.07);border-radius:16px;}
        .sec.dropok::before{background:linear-gradient(#b58cff,#ec4b88);box-shadow:0 0 14px rgba(139,61,255,.8);}
        .sec.dropok .sec-name{color:#c9a8ff;}

        .devflow{display:flex;flex-wrap:wrap;gap:7px;}
        .dev{display:inline-flex;align-items:center;gap:7px;padding:5px 10px 5px 8px;border-radius:17px;
          background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.055);cursor:grab;
          transition:.16s;max-width:100%;}
        .dev:hover{border-color:rgba(236,75,136,.55);background:rgba(236,75,136,.08);transform:translateY(-1px);}
        .dev ha-icon{--mdc-icon-size:15px;color:#9a90a0;flex:0 0 auto;transition:.16s;}
        .dev.on ha-icon{color:#ffcf5c;}
        .dev.pulse ha-icon{color:#ff7eb0;}
        .dev .dn{font-size:12.5px;color:#e7dce6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:190px;}
        .dev .ds{font-size:11px;color:#6f6675;white-space:nowrap;font-variant-numeric:tabular-nums;}
        .dev.on .ds{color:#ffcf5c;}
        .dev.pulse .ds{color:#ff7eb0;}
        .dev .dot{width:6px;height:6px;border-radius:50%;background:#413b46;flex:0 0 auto;transition:.2s;}
        .dev.on .dot{background:#ffcf5c;box-shadow:0 0 9px rgba(255,207,92,.9);}
        .dev.pulse .dot{background:#ff5c9d;box-shadow:0 0 10px rgba(255,92,157,.95);animation:pp 1.1s ease-in-out infinite;}
        .dev.dead{opacity:.45;}
        .dev.dead .dot{background:#ff5c6f;box-shadow:0 0 8px rgba(255,92,111,.8);}
        @keyframes pp{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.55);opacity:.6}}
        .dev.drag{opacity:.35;}
        .dev.locked{cursor:default;opacity:.5;}
        .dev.locked:hover{border-color:rgba(255,255,255,.055);background:rgba(255,255,255,.045);transform:none;}
        .dev.inzone{border-color:rgba(157,92,255,.5);background:rgba(139,61,255,.13);}
        .dev .zmark{display:inline-flex;gap:3px;}
        .dev .zmark i{width:5px;height:5px;border-radius:50%;display:inline-block;}
        .dev-x{background:none;border:none;color:#4a444f;cursor:pointer;padding:2px;margin:-2px -4px -2px 0;
          border-radius:7px;display:inline-flex;transition:.15s;}
        .dev-x ha-icon{--mdc-icon-size:14px;color:inherit;}
        .dev:hover .dev-x{color:#8d8290;}
        .dev-x:hover{color:#ff8296 !important;background:rgba(255,130,150,.12);}

        .grp{margin:0 0 15px;}
        .grp:last-child{margin-bottom:0;}
        .grp-h{display:flex;align-items:center;gap:7px;margin:0 0 8px;}
        .grp-h ha-icon{--mdc-icon-size:13px;color:#7d7280;}
        .grp-h .gn{font-size:10.5px;letter-spacing:2px;text-transform:uppercase;color:#7d7280;font-weight:600;}
        .grp-h .gc{font-size:10px;color:#4a444f;font-variant-numeric:tabular-nums;}

        /* ---- bölge içi tür grupları (Genel) ---- */
        .kgrp{margin:0 0 12px;}
        .kgrp:last-child{margin-bottom:0;}
        .kgrp-h{display:flex;align-items:center;gap:6px;margin:0 0 7px;opacity:.9;}
        .kgrp-h ha-icon{--mdc-icon-size:13px;color:#9a7bd6;}
        .kgrp-h .kn{font-size:10px;letter-spacing:1.8px;text-transform:uppercase;color:#9a8fa8;font-weight:600;}
        .kgrp-h .kc{font-size:10px;color:#5d5464;font-variant-numeric:tabular-nums;}
        /* ---- bölge içi oda satırları (solda oda adı, sağda çipler) ---- */
        .rrow{display:flex;align-items:center;gap:12px;padding:9px 0;
          border-bottom:.5px solid rgba(255,255,255,.05);}
        .rrow:last-child{border-bottom:none;}
        .rlabel{flex:0 0 96px;display:flex;align-items:center;gap:7px;align-self:flex-start;padding-top:6px;}
        .rlabel .rbar{width:3px;height:13px;border-radius:2px;background:#ff3b5c;flex:0 0 auto;}
        .rlabel .rlname{font-size:10.5px;letter-spacing:1.3px;text-transform:uppercase;color:#c4b9d0;
          font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .rrow .devflow{flex:1;min-width:0;}
        @media(max-width:620px){.rrow{flex-direction:column;align-items:stretch;gap:6px;}
          .rlabel{flex:none;padding-top:0;}}

        /* ---- otomatik: kişi kartları ---- */
        .pgrid{display:flex;flex-wrap:wrap;gap:12px;margin:10px 0 16px;}
        .pcard{width:96px;cursor:pointer;text-align:center;}
        .pph{position:relative;width:96px;height:96px;border-radius:18px;overflow:hidden;
          background:rgba(255,255,255,.04);border:2px solid rgba(255,255,255,.08);
          display:flex;align-items:center;justify-content:center;transition:.16s;}
        .pph img{width:100%;height:100%;object-fit:cover;display:block;filter:grayscale(.5) brightness(.75);transition:.16s;}
        .pph ha-icon{--mdc-icon-size:40px;color:#5d5464;}
        .pcard:hover .pph{border-color:rgba(236,75,136,.5);}
        .pcard.on .pph{border-color:#ec4b88;box-shadow:0 0 0 3px rgba(236,75,136,.18);}
        .pcard.on .pph img{filter:none;}
        .pdot{position:absolute;left:7px;bottom:7px;width:10px;height:10px;border-radius:50%;
          background:#5d5464;border:2px solid #0c0a10;}
        .pdot.home{background:#5fe39a;box-shadow:0 0 8px rgba(93,228,154,.9);}
        .pchk{position:absolute;right:5px;top:5px;width:22px;height:22px;border-radius:50%;
          background:#ec4b88;display:flex;align-items:center;justify-content:center;}
        .pchk ha-icon{--mdc-icon-size:15px;color:#fff;}
        .pnm{font-size:12px;color:#cfc4ce;margin-top:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .pcard.on .pnm{color:#ff9cc1;}
        /* ---- otomatik: saat programı satırı ---- */
        .srow{display:flex;align-items:center;gap:9px;flex-wrap:wrap;padding:9px 0;
          border-bottom:.5px solid rgba(255,255,255,.05);}
        .srow:last-of-type{border-bottom:none;}
        .stime{background:rgba(255,255,255,.05);color:#e7dce6;border:1px solid rgba(255,255,255,.12);
          border-radius:10px;padding:7px 10px;font:inherit;font-size:13.5px;color-scheme:dark;}
        .days{display:flex;gap:3px;}
        .day{width:30px;padding:5px 0;border-radius:8px;border:.5px solid rgba(255,255,255,.1);
          background:none;color:#6f6675;font:inherit;font-size:10.5px;cursor:pointer;transition:.12s;}
        .day:hover{color:#cfc4ce;border-color:rgba(255,255,255,.25);}
        .day.on{background:rgba(181,140,255,.16);border-color:rgba(181,140,255,.55);color:#c9a8ff;}
        .spick{display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;}
        /* ---- eylem mod sekmeleri ---- */
        .mtabs{display:flex;gap:5px;flex-wrap:wrap;margin:0 0 12px;}
        .mtab{display:inline-flex;align-items:center;gap:6px;padding:6px 13px;border-radius:14px;
          border:.5px solid rgba(255,255,255,.1);background:none;color:#8d8290;font:inherit;
          font-size:12px;cursor:pointer;transition:.14s;}
        .mtab:hover{color:#cfc4ce;border-color:rgba(255,255,255,.25);}
        .mtab.on{background:rgba(255,255,255,.07);color:#fff;border-color:rgba(255,255,255,.3);}
        .mtab .mtc{font-size:10px;color:#6f6675;font-variant-numeric:tabular-nums;}
        .mtab.on .mtc{color:#b9aeb8;}
        /* ---- eylem günlüğü (timeline) ---- */
        .logrun{margin:0 0 14px;padding:0 0 12px;border-bottom:.5px solid rgba(255,255,255,.05);}
        .logrun:last-child{border-bottom:none;margin-bottom:0;}
        .lg-h{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;}
        .lg-h ha-icon{--mdc-icon-size:15px;}
        .lg-dot{width:7px;height:7px;border-radius:50%;flex:0 0 auto;}
        .lg-n{font-size:11px;letter-spacing:1.6px;text-transform:uppercase;font-weight:600;}
        .lg-mode{font-size:10px;padding:1px 8px;border-radius:9px;border:.5px solid rgba(255,255,255,.15);}
        .lg-t{font-size:11px;color:#6f6675;font-variant-numeric:tabular-nums;}
        .lg-steps{margin-left:15px;padding-left:14px;border-left:1px solid rgba(255,255,255,.08);}
        .lg-step{display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px;color:#cfc4ce;
          flex-wrap:wrap;position:relative;}
        .lg-step::before{content:"";position:absolute;left:-18px;top:11px;width:7px;height:1px;
          background:rgba(255,255,255,.14);}
        .lg-step ha-icon{--mdc-icon-size:14px;color:#9a90a0;}
        .lg-step.skip{opacity:.45;}
        .lg-time{font-size:10.5px;color:#6f6675;font-variant-numeric:tabular-nums;min-width:52px;}
        .lg-name{color:#e7dce6;}
        .lg-tg{font-size:11px;color:#8d8290;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:230px;}
        .lg-sec{font-size:10.5px;color:#5fd0e3;font-variant-numeric:tabular-nums;margin-left:auto;}
        .lg-sk{font-size:10.5px;color:#ffb86b;margin-left:auto;}
        .lg-par{font-size:11px;color:#9be6a0;}
        .dtag.bad{color:#ff8296;border-color:rgba(255,130,150,.4);}
        /* ---- gece ışıkları şeridi ---- */
        .nlstrip{display:flex;align-items:center;gap:10px;margin-top:14px;}
        .nlstrip .nls{font-size:11px;color:#b0a8e6;white-space:nowrap;}
        .nlstrip .nls.b{color:#ffcf9c;}
        .nlbar{flex:1;height:6px;border-radius:4px;
          background:linear-gradient(90deg,rgba(157,140,255,.55),rgba(255,207,92,.5));}

        /* ---- tatil timeline ---- */
        .vactl{margin-top:6px;}
        .vax{display:flex;justify-content:space-between;font-size:11px;color:#8d8290;margin:0 0 10px 132px;
          padding-bottom:6px;border-bottom:.5px solid rgba(255,255,255,.06);}
        .vax .vsun{letter-spacing:.3px;} .vax .vsun.r{color:#ffcf9c;} .vax .vsun:first-child{color:#b0a8e6;}
        .vlane{display:flex;align-items:center;gap:10px;margin-bottom:7px;}
        .vlbl{flex:0 0 122px;display:flex;align-items:center;gap:7px;min-width:0;}
        .vlbl ha-icon{--mdc-icon-size:14px;color:#9a90a0;flex:0 0 auto;}
        .vlbl span{font-size:12px;color:#cfc4ce;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .vtrack{position:relative;flex:1;height:26px;border-radius:8px;background:rgba(255,255,255,.03);
          border:.5px solid rgba(255,255,255,.05);overflow:hidden;}
        .vseg{position:absolute;top:3px;bottom:3px;border-radius:6px;border:.5px solid;display:flex;
          align-items:center;padding:0 6px;min-width:0;cursor:grab;touch-action:none;transition:filter .12s;}
        .vseg:hover{filter:brightness(1.3);}
        .vseg.drag{cursor:grabbing;filter:brightness(1.4);z-index:3;}
        .vseg .vh{position:absolute;top:0;bottom:0;width:12px;cursor:ew-resize;}
        .vseg .vh.l{left:-2px;} .vseg .vh.r{right:-2px;}
        .vcap{font-size:9.5px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;pointer-events:none;}
        .vlact{flex:0 0 auto;display:flex;gap:4px;opacity:.35;transition:.12s;}
        .vlane:hover .vlact{opacity:1;}
        .vbtn{width:21px;height:21px;border-radius:6px;border:.5px solid rgba(255,255,255,.14);
          background:rgba(255,255,255,.05);color:#b9aeb8;cursor:pointer;display:flex;align-items:center;
          justify-content:center;padding:0;transition:.12s;}
        .vbtn ha-icon{--mdc-icon-size:13px;}
        .vbtn.add:hover{color:#9be6a0;border-color:rgba(93,228,154,.5);background:rgba(93,228,154,.1);}
        .vbtn.del:hover{color:#ff8296;border-color:rgba(255,130,150,.5);background:rgba(255,130,150,.1);}
        @media(max-width:620px){.vax{margin-left:0;}.vlbl{flex:0 0 92px;}}
        .dev.tapedit{cursor:pointer;}
        .dev .deid{font-size:10px;color:#8d8290;font-family:'SFMono-Regular',Consolas,monospace;
          background:rgba(157,124,214,.1);border-radius:7px;padding:1px 6px;white-space:nowrap;
          max-width:230px;overflow:hidden;text-overflow:ellipsis;}
        .addsec.on{border-color:#ec4b88;color:#ff9cc1;background:rgba(236,75,136,.1);border-style:solid;}
        .dev .droom{font-size:10.5px;color:#8d8290;background:rgba(255,255,255,.05);
          border-radius:9px;padding:1px 7px;white-space:nowrap;}
        .dev .dlink{display:inline-flex;align-items:center;gap:2px;font-size:10.5px;color:#ff9cc1;
          background:rgba(236,75,136,.12);border:1px solid rgba(236,75,136,.3);border-radius:9px;padding:1px 7px 1px 3px;}
        .dev .dlink ha-icon{--mdc-icon-size:13px;color:#ff9cc1;}
        .nsel{appearance:none;-webkit-appearance:none;background:rgba(255,255,255,.05);color:#e7dce6;
          border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:9px 34px 9px 13px;font:inherit;
          font-size:13.5px;cursor:pointer;min-width:210px;max-width:100%;
          background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23b58cff' stroke-width='3'><path d='M6 9l6 6 6-6'/></svg>");
          background-repeat:no-repeat;background-position:right 12px center;}
        .nsel:focus{outline:none;border-color:rgba(139,61,255,.6);}
        .nsel option{background:#18141f;color:#e7dce6;}
        .twin{display:inline-flex;align-items:center;gap:10px;}
        .twin input[type=time]{background:rgba(255,255,255,.05);color:#e7dce6;border:1px solid rgba(255,255,255,.12);
          border-radius:10px;padding:7px 10px;font:inherit;font-size:13.5px;color-scheme:dark;}
        .twin input[type=time]:focus{outline:none;border-color:rgba(139,61,255,.6);}
        .twin .twsep{color:#8d8290;font-size:15px;}
        .tginfo{display:flex;align-items:center;gap:7px;margin:8px 0 2px;padding:7px 12px;border-radius:11px;
          background:rgba(93,208,227,.08);border:.5px solid rgba(93,208,227,.28);font-size:12px;color:#a9dbe6;}
        .tginfo ha-icon{--mdc-icon-size:15px;color:#5fd0e3;flex:0 0 auto;}
        .dtag.wtag{display:inline-flex;align-items:center;gap:4px;color:#ffcf9c;
          border-color:rgba(255,184,107,.4);}
        .dtag.wtag ha-icon{--mdc-icon-size:12px;}

        .empty{color:#6f6675;font-size:13.5px;padding:6px 0 6px 0;line-height:1.6;}
        .empty b{color:#b9aeb8;}
        .hint{font-size:12px;color:#6f6675;line-height:1.6;margin-top:14px;padding-left:24px;}
        .hint b{color:#b58cff;font-weight:500;}

        /* ---- durum ---- */
        .stbox{position:relative;border-radius:22px;padding:1px;margin-bottom:22px;
          background:linear-gradient(135deg,var(--sc,rgba(139,61,255,.55)),rgba(236,75,136,.35) 55%,rgba(255,255,255,.07));}
        .stin{background:#14111a;border-radius:21px;padding:24px 26px;display:flex;align-items:center;
          gap:22px;flex-wrap:wrap;}
        .stic{width:74px;height:74px;border-radius:24px;flex:0 0 auto;display:flex;align-items:center;
          justify-content:center;background:linear-gradient(140deg,var(--sg,rgba(139,61,255,.28)),rgba(255,255,255,.02));
          border:1px solid var(--sb,rgba(157,92,255,.45));position:relative;}
        .stic ha-icon{--mdc-icon-size:34px;color:var(--sc2,#c9a8ff);}
        .stic .rip{position:absolute;inset:-1px;border-radius:25px;border:1px solid var(--sb,rgba(157,92,255,.4));
          animation:rp 2.6s ease-out infinite;}
        .stic .rip.r2{animation-delay:1.3s;}
        @keyframes rp{0%{transform:scale(.86);opacity:.85}100%{transform:scale(1.3);opacity:0}}
        .stt{min-width:190px;}
        .stt .k{font-size:11px;letter-spacing:2.6px;text-transform:uppercase;color:var(--sc2,#c9a8ff);font-weight:600;}
        .stt .v{font-family:Georgia,serif;font-size:31px;margin:3px 0 4px;line-height:1.1;}
        .stt .s{font-size:12.5px;color:#8d8290;}
        .stnums{margin-left:auto;display:flex;gap:24px;}
        .stnum{text-align:right;}
        .stnum .n{font-size:22px;font-weight:600;font-variant-numeric:tabular-nums;}
        .stnum .l{font-size:10.5px;letter-spacing:1.6px;text-transform:uppercase;color:#6f6675;margin-top:2px;}
        .stnum.hi .n{color:#ffb86b;} .stnum.bad .n{color:#ff8296;}

        .picks{display:flex;flex-wrap:wrap;gap:8px;}
        .pick{display:inline-flex;align-items:center;gap:8px;padding:9px 16px 9px 12px;border-radius:20px;
          font-size:13px;color:#b9aeb8;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);
          cursor:pointer;transition:.14s;}
        .pick ha-icon{--mdc-icon-size:16px;color:#8d8290;}
        .pick:hover{border-color:rgba(236,75,136,.5);color:#fff;}
        .pick.on{color:#fff;background:rgba(236,75,136,.17);border-color:rgba(236,75,136,.65);}
        .pick.on ha-icon{color:#ff8fb3;}

        .warn{display:flex;align-items:center;gap:11px;margin:16px 0 4px;padding:12px 16px;border-radius:14px;
          background:rgba(255,184,107,.09);border:1px solid rgba(255,184,107,.32);font-size:13px;color:#ffd9a8;
          flex-wrap:wrap;}
        .warn ha-icon{--mdc-icon-size:18px;color:#ffb86b;}
        .warn b{color:#fff;font-weight:600;}
        .warn .go{margin-left:auto;padding:7px 14px;border-radius:16px;border:1px solid rgba(255,184,107,.5);
          background:none;color:#ffb86b;cursor:pointer;font:inherit;font-size:12px;}
        .warn .go:hover{background:rgba(255,184,107,.14);}

        .evt{display:flex;align-items:center;gap:13px;padding:11px 2px;border-bottom:1px solid rgba(255,255,255,.045);}
        .evt:last-child{border-bottom:none;}
        .evt .ic{width:34px;height:34px;border-radius:11px;flex:0 0 auto;display:flex;align-items:center;
          justify-content:center;background:rgba(139,61,255,.15);color:#b58cff;}
        .evt .ic ha-icon{--mdc-icon-size:17px;}
        .evt.fire .ic{background:rgba(255,92,111,.16);color:#ff8296;}
        .evt.good .ic{background:rgba(95,227,154,.13);color:#5fe39a;}
        .evt .b{flex:1;min-width:0;}
        .evt .n{font-size:13.5px;color:#e7dce6;line-height:1.45;}
        .evt .t{font-size:11.5px;color:#6f6675;font-variant-numeric:tabular-nums;flex:0 0 auto;}

        .zh{display:flex;align-items:center;gap:12px;padding:10px 2px;border-bottom:1px solid rgba(255,255,255,.045);}
        .zh:last-child{border-bottom:none;}
        .zh ha-icon{--mdc-icon-size:17px;color:#8d8290;}
        .zh .n{flex:1;font-size:13.5px;color:#e7dce6;}
        .tag{font-size:10.5px;padding:3px 10px;border-radius:14px;letter-spacing:.4px;}
        .tag.ok{background:rgba(95,227,154,.12);color:#5fe39a;}
        .tag.warn{background:rgba(255,184,107,.12);color:#ffb86b;}
        .tag.err{background:rgba(255,92,111,.13);color:#ff8296;}
        .tag.off{background:rgba(255,255,255,.045);color:#6f6675;}

        /* ---- satirlar / kontroller ---- */
        .row{display:flex;align-items:center;gap:14px;padding:12px 2px;
          border-bottom:1px solid rgba(255,255,255,.045);flex-wrap:wrap;}
        .row:last-child{border-bottom:none;}
        .row .rl{min-width:190px;flex:0 0 auto;}
        .row .rl b{display:block;font-size:13.5px;color:#f0e8f0;font-weight:600;}
        .row .rl small{font-size:11.5px;color:#7d7280;}
        .row .rr2{margin-left:auto;display:flex;align-items:center;gap:12px;}

        .sl{display:flex;align-items:center;gap:12px;min-width:210px;}
        .sl input[type=range]{flex:1;-webkit-appearance:none;appearance:none;height:4px;border-radius:99px;
          background:#2a2530;outline:none;min-width:110px;}
        .sl input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;
          background:#fff;cursor:pointer;box-shadow:0 1px 6px rgba(0,0,0,.6);}
        .sl input[type=range]::-moz-range-thumb{width:16px;height:16px;border:none;border-radius:50%;background:#fff;cursor:pointer;}
        .sl .v{font-size:12.5px;color:#e7dce6;font-weight:600;min-width:70px;text-align:right;
          font-variant-numeric:tabular-nums;}

        .tgl{width:42px;height:24px;border-radius:20px;background:#2a2530;position:relative;cursor:pointer;
          transition:.2s;flex:0 0 auto;}
        .tgl .k{position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:.2s;}
        .tgl.on{background:linear-gradient(90deg,#8b3dff,#ec4b88);}
        .tgl.on .k{left:21px;}

        .chips{display:flex;flex-wrap:wrap;gap:8px;}
        .chip{display:inline-flex;align-items:center;gap:8px;padding:7px 12px 7px 10px;border-radius:18px;
          font-size:12.5px;color:#d9c8ff;background:rgba(139,61,255,.14);border:1px solid rgba(157,92,255,.35);}
        .chip ha-icon{--mdc-icon-size:15px;color:#b58cff;}
        .chip .x{background:none;border:none;color:#8d8290;cursor:pointer;padding:0 0 0 2px;font:inherit;
          font-size:14px;line-height:1;}
        .chip .x:hover{color:#ff8296;}
        .chip.add{background:none;border:1px dashed rgba(255,255,255,.2);color:#8d8290;cursor:pointer;}
        .chip.add:hover{border-color:#ec4b88;color:#ff9cc1;}

        /* ---- eylem adimlari ---- */
        .step{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:14px;
          background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.06);margin-bottom:8px;}
        .step .sn{width:20px;flex:0 0 auto;text-align:center;font-size:11px;color:#5d5464;
          font-variant-numeric:tabular-nums;}
        .step .si{width:34px;height:34px;border-radius:11px;flex:0 0 auto;display:flex;align-items:center;
          justify-content:center;background:rgba(139,61,255,.15);color:#b58cff;}
        .step .si ha-icon{--mdc-icon-size:17px;color:inherit;}
        .step .sb{flex:1;min-width:0;}
        .step .st{font-size:13.5px;color:#f0e8f0;font-weight:600;display:flex;
          align-items:center;gap:8px;flex-wrap:wrap;}
        .step .ptag{font-size:9.5px;letter-spacing:1.1px;text-transform:uppercase;padding:2px 8px;
          border-radius:9px;background:rgba(95,227,154,.14);color:#5fe39a;font-weight:700;}

        /* adımlar arası bağ — node-red hissi */
        .link{display:flex;align-items:center;gap:0;margin:-2px 0 -2px 16px;padding:2px 0;
          cursor:pointer;position:relative;height:30px;}
        .link::before{content:"";position:absolute;left:0;top:0;bottom:0;width:2px;
          background:linear-gradient(rgba(255,255,255,.16),rgba(255,255,255,.16));border-radius:2px;}
        .link .lk{display:inline-flex;align-items:center;gap:6px;margin-left:12px;padding:3px 11px;
          border-radius:12px;font-size:10.5px;color:#7d7280;background:#14111a;
          border:1px solid rgba(255,255,255,.09);transition:.15s;}
        .link .lk ha-icon{--mdc-icon-size:13px;color:inherit;}
        .link:hover .lk{color:#e7dce6;border-color:rgba(236,75,136,.5);}
        .link.par::before{background:linear-gradient(#5fe39a,#2dd4a0);box-shadow:0 0 10px rgba(95,227,154,.5);}
        .link.par .lk{color:#5fe39a;border-color:rgba(95,227,154,.45);background:rgba(95,227,154,.1);}
        .step .dtag{font-size:10.5px;color:#6f6675;font-weight:400;font-variant-numeric:tabular-nums;}
        .dtag.ok{color:#5fe39a;}
        .ltag{font-size:10.5px;font-weight:700;color:#ff8fb3;font-variant-numeric:tabular-nums;}
        .step.live{border-color:rgba(236,75,136,.55);background:rgba(236,75,136,.09);}
        .step.live .si{background:rgba(236,75,136,.2);color:#ff8fb3;}
        .runfoot{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:4px;
          font-size:12px;color:#6f6675;}

        /* bildirim önizlemesi */
        .nprev{margin-top:8px;border:1px solid rgba(255,255,255,.1);border-radius:13px;
          background:rgba(255,255,255,.03);padding:13px 14px;}
        .nprev .np-msg{font-size:13.5px;color:#f0e8f0;line-height:1.5;}
        .nprev .np-foot{margin-top:9px;padding-top:9px;border-top:1px solid rgba(255,255,255,.06);
          display:flex;flex-direction:column;gap:4px;font-size:11.5px;color:#8d8290;}
        .nprev .np-foot b{color:#c9a8ff;font-weight:600;}
        .step .ss{font-size:12px;color:#7d7280;margin-top:2px;white-space:nowrap;overflow:hidden;
          text-overflow:ellipsis;}
        .step .sa{background:none;border:none;color:#5d5464;cursor:pointer;padding:5px;border-radius:8px;
          display:inline-flex;transition:.15s;flex:0 0 auto;}
        .step .sa ha-icon{--mdc-icon-size:17px;color:inherit;}
        .step .sa:hover{color:#ff9cc1;background:rgba(236,75,136,.1);}
        .step .sa[disabled]{opacity:.25;cursor:default;}

        .seg{display:inline-flex;gap:6px;margin-top:6px;}
        .sgo{padding:8px 18px;border-radius:18px;border:1px solid rgba(255,255,255,.1);background:none;
          color:#8d8290;cursor:pointer;font:inherit;font-size:13px;transition:.15s;}
        .sgo:hover{border-color:rgba(236,75,136,.5);color:#fff;}
        .sgo.on{background:rgba(236,75,136,.17);border-color:rgba(236,75,136,.65);color:#fff;}

        .cols{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;align-items:center;}
        .col{width:30px;height:30px;border-radius:50%;border:2px solid transparent;cursor:pointer;
          padding:0;transition:.15s;box-shadow:inset 0 0 0 1px rgba(0,0,0,.35);}
        .col:hover{transform:scale(1.1);}
        .col.on{border-color:#fff;box-shadow:0 0 12px rgba(255,255,255,.45);}
        .col.none{width:auto;height:30px;border-radius:15px;padding:0 14px;background:none;
          border:1px dashed rgba(255,255,255,.2);color:#8d8290;font:inherit;font-size:12px;box-shadow:none;}
        .col.none.on{border-style:solid;border-color:#fff;color:#fff;box-shadow:none;}

        textarea.ed-in{resize:vertical;line-height:1.5;font-family:inherit;}
        select.ed-in{cursor:pointer;}

        /* ışık kovaları — sabit / flash, aralarında sürükle-bırak */
        .bucket{margin-top:14px;border:1px solid rgba(255,255,255,.08);border-radius:15px;
          padding:13px 14px;transition:.15s;}
        .bucket.dropok{border-color:#b58cff;background:rgba(139,61,255,.09);
          box-shadow:0 0 0 1px rgba(157,92,255,.35);}
        .bk-h{display:flex;align-items:center;gap:9px;margin-bottom:10px;flex-wrap:wrap;}
        .bk-h b{font-size:13px;color:#e7dce6;font-weight:600;}
        .bk-c{font-size:11px;color:#5d5464;font-variant-numeric:tabular-nums;}
        .bk-h small{font-size:11.5px;color:#6f6675;}
        .bk-empty{font-size:12px;color:#5d5464;font-style:italic;align-self:center;padding:4px 2px;}
        .bucket .chip[draggable="true"]{cursor:grab;}
        .bucket .chip.dragging{opacity:.35;}

        /* sürüm geçmişi satırı */
        .verrow{display:flex;align-items:center;gap:12px;padding:10px 2px;
          border-bottom:1px solid rgba(255,255,255,.045);}
        .verrow:last-child{border-bottom:none;}
        .verrow .vi{flex:1;min-width:0;}
        .verrow .vt{font-size:13px;color:#e7dce6;font-variant-numeric:tabular-nums;}
        .verrow .vs{font-size:11.5px;color:#6f6675;margin-top:2px;}

        .safenote{display:flex;align-items:flex-start;gap:9px;margin-top:12px;padding:10px 12px;
          border-radius:12px;background:rgba(139,61,255,.09);border:1px solid rgba(157,92,255,.25);
          font-size:11.5px;color:#c9a8ff;line-height:1.5;}
        .safenote ha-icon{--mdc-icon-size:16px;color:#b58cff;flex:0 0 auto;margin-top:1px;}
        .safenote.warn{background:rgba(255,184,107,.09);border-color:rgba(255,184,107,.3);color:#ffd9a8;}
        .safenote.warn ha-icon{color:#ffb86b;}

        /* medya sürükle-bırak kutusu */
        .drop{margin-top:8px;display:flex;align-items:center;gap:9px;flex-wrap:wrap;
          border:1.5px dashed rgba(255,255,255,.16);border-radius:13px;padding:14px 16px;
          font-size:12.5px;color:#8d8290;transition:.15s;}
        .drop ha-icon{--mdc-icon-size:19px;color:#6f6675;}
        .drop.over{border-color:#ec4b88;background:rgba(236,75,136,.09);color:#ff9cc1;}
        .drop.over ha-icon{color:#ff8fb3;}
        .drop.busy{border-color:rgba(157,92,255,.6);color:#c9a8ff;}
        .drop.bad{border-color:rgba(255,92,111,.6);color:#ff8296;}
        .linkbtn{background:none;border:none;color:#b58cff;cursor:pointer;font:inherit;
          font-size:12.5px;text-decoration:underline;padding:0;}
        .linkbtn:hover{color:#d9c8ff;}

        .simrow{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:14px;
          background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.06);margin-bottom:8px;flex-wrap:wrap;}
        .simrow ha-icon{--mdc-icon-size:16px;color:#ffb86b;}
        .simrow .sn{flex:1;min-width:120px;font-size:13px;color:#e7dce6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .simrow input[type=time],.simrow input[type=number]{background:#1b1721;border:1px solid rgba(255,255,255,.1);
          border-radius:9px;color:#ffd9a8;padding:6px 8px;font:inherit;font-size:12px;outline:none;}
        .simrow input[type=number]{width:56px;color:#e7dce6;}
        .simrow .x{background:none;border:none;color:#6f6675;cursor:pointer;font-size:15px;line-height:1;}
        .simrow .x:hover{color:#ff8296;}

        /* ---- ayarlar / secici ---- */
        /* Katmanlar: ayarlar < adım editörü < seçici < onay.
           Her biri yalnızca kendi katmanını kapatır, altındakini yaşatır. */
        .ov{position:fixed;inset:0;z-index:50;background:rgba(8,6,12,.74);backdrop-filter:blur(9px);
          display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:40px 16px 60px;}
        .ov.editor{z-index:60;}
        .ov.picker{z-index:70;background:rgba(8,6,12,.6);}
        .ov.confirm{z-index:80;}
        .ed{width:100%;max-width:680px;background:#131017;border:1px solid rgba(255,255,255,.09);
          border-radius:22px;padding:26px 26px 22px;box-shadow:0 30px 80px rgba(0,0,0,.7);}
        .ed-t{font-family:Georgia,serif;font-size:24px;margin-bottom:2px;}
        .ed-s{font-size:13px;color:#8d8290;margin-bottom:22px;}
        .ed-l{font-size:11px;letter-spacing:2.4px;text-transform:uppercase;color:#b58cff;
          margin:24px 0 10px;display:flex;align-items:center;gap:8px;}
        .ed-l.first{margin-top:0;}
        .ed-l ha-icon{--mdc-icon-size:15px;}
        .ed-in{background:#1b1721;border:1px solid rgba(255,255,255,.1);border-radius:11px;color:#fff;
          padding:10px 13px;font:inherit;font-size:14px;outline:none;width:100%;}
        .ed-in:focus{border-color:#ec4b88;}
        .ed-lab{font-size:12.5px;color:#8d8290;margin:12px 0 5px;}
        .ed-lab b{color:#e7dce6;font-weight:600;display:block;font-size:13px;}
        .ed-foot{display:flex;gap:10px;margin-top:24px;}
        .btn{padding:10px 20px;border-radius:20px;border:none;cursor:pointer;font:inherit;font-size:13.5px;
          background:linear-gradient(90deg,#8b3dff,#ec4b88);color:#fff;transition:.15s;}
        .btn:hover{filter:brightness(1.2);}
        .btn.ghost{background:none;border:1px solid rgba(255,255,255,.16);color:#b9aeb8;}
        .btn.ghost:hover{border-color:#ec4b88;color:#ff9cc1;filter:none;}
        .pk{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:12px;cursor:pointer;font-size:13.5px;}
        .pk:hover{background:rgba(255,255,255,.05);}
        .pk ha-icon{--mdc-icon-size:17px;color:#8d8290;}
        .pk .n{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#e7dce6;}
        .pk .e{font-size:10.5px;color:#5d5464;font-family:monospace;}
        /* çoklu seçim (oda içinden cihaz seçme) */
        .pk .ck{width:21px;height:21px;border-radius:7px;flex:0 0 auto;display:flex;align-items:center;
          justify-content:center;border:1px solid rgba(255,255,255,.18);transition:.15s;}
        .pk .ck ha-icon{--mdc-icon-size:14px;color:#fff;opacity:0;transition:.15s;}
        .pk.on .ck{background:linear-gradient(135deg,#8b3dff,#ec4b88);border-color:transparent;}
        .pk.on .ck ha-icon{opacity:1;}
        .pk.on .n>div:first-child{color:#fff;}
        .pksep{height:1px;background:rgba(255,255,255,.07);margin:8px 4px;}
        /* flash yeteneği rozetleri */
        .captag{font-size:10px;padding:2px 7px;border-radius:8px;font-weight:700;margin-left:2px;}
        .captag.native{background:rgba(95,227,154,.16);color:#5fe39a;}
        .captag.dim{background:rgba(255,184,107,.16);color:#ffb86b;}
        .captag.none{background:rgba(255,92,111,.16);color:#ff8296;}
        .capsum{display:flex;align-items:center;gap:7px;margin-top:11px;flex-wrap:wrap;}
        .capnote{font-size:11.5px;color:#6f6675;}
        .chip.add.auto{border-color:rgba(157,92,255,.45);color:#c9a8ff;border-style:solid;
          background:rgba(139,61,255,.1);}
        .chip.add.auto:hover{background:rgba(139,61,255,.2);color:#e0ccff;}

        .gtag{margin-left:7px;font-size:9.5px;letter-spacing:1.2px;text-transform:uppercase;
          padding:2px 7px;border-radius:9px;background:rgba(139,61,255,.18);color:#c9a8ff;
          vertical-align:middle;}
        .dev .gtag{margin-left:4px;padding:1px 6px;font-size:9px;}
        .btn[disabled]{opacity:.4;cursor:default;filter:none;}
        .ovlist{max-height:52vh;overflow-y:auto;margin-top:10px;}
        .bgdrop{display:flex;align-items:center;gap:12px;border:1px dashed #2f2838;border-radius:12px;
  padding:10px 12px;cursor:pointer;transition:border-color .18s,background .18s;margin-bottom:8px}
.bgdrop:hover,.bgdrop.over{border-color:#ec4b88;background:#1a1220}
.bgprev{width:64px;height:40px;flex:0 0 64px;border-radius:8px;background:#191320 center/cover no-repeat;
  border:.5px solid #2b2436}
.bgprev.on{border-color:#ec4b8866}
.bgnote{font-size:11.5px;color:#8d8299;word-break:break-all;line-height:1.4}
.bgclear{display:inline-block;font-size:11px;color:#8d8299;cursor:pointer;padding:4px 0;
  text-decoration:underline;text-underline-offset:3px}
.bgclear:hover{color:#ff7d9c}
.lang2{display:flex;gap:10px;}
        .lang2 .lo{flex:1;border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:12px;
          text-align:center;font-size:13.5px;cursor:pointer;color:#8d8290;}
        .lang2 .lo.on{border-color:rgba(236,75,136,.65);background:rgba(236,75,136,.14);color:#fff;}
      </style>
      <div class="top"><div class="topwrap">
        <div class="brand"><span class="logo"></span><span id="brand"></span></div>
        <span class="status" id="status"></span>
        <button class="gear" id="gear"></button>
      </div></div>
      <div class="wrap">
        <div class="hero-l" id="heroL"></div>
        <div class="hero-h" id="heroH"></div>
        <div class="hero-s" id="heroS"></div>
        <div class="layout">
          <div class="rail" id="rail"></div>
          <div class="stage"><div class="glow"></div><div id="stage"></div></div>
        </div>
      </div>
    `;
    this.shadowRoot.querySelector(".logo").appendChild(icon("mdi:shield-home"));
    const g = this.shadowRoot.getElementById("gear");
    g.appendChild(icon("mdi:cog-outline"));
    g.onclick = () => this._openSettings();
    // Sürükleme sürerken canlı tazeleme cihazı elden kaçırmasın diye bayrak.
    this.shadowRoot.addEventListener("dragstart", () => { this._dragging = true; }, true);
    this.shadowRoot.addEventListener("dragend", () => { this._dragging = false; }, true);
  }

  _renderHero() {
    this.shadowRoot.getElementById("brand").textContent = this.T("brand");
    this.shadowRoot.getElementById("heroL").textContent = this.T("hero_l");
    this.shadowRoot.getElementById("heroH").textContent = this.T("hero_h");
    this.shadowRoot.getElementById("heroS").textContent = this.T("hero_s");
  }

  /* ------------------------------------------------------------------ ray */
  _renderRail() {
    const rail = this.shadowRoot.getElementById("rail");
    rail.textContent = "";

    const mkRow = (page, ic, name, count, extraCls) => {
      const r = el("div", "rr" + (this._page === page ? " on" : "") + (extraCls ? " " + extraCls : ""));
      r.appendChild(icon(ic));
      r.appendChild(el("span", "n", esc(name)));
      if (count !== undefined && count !== null) r.appendChild(el("span", "c", String(count)));
      r.onclick = () => this._go(page);
      return r;
    };

    const total = MODES.reduce((n, m) => n + (this._cfg.assign[m.key] || []).length, 0);
    rail.appendChild(mkRow("genel", "mdi:shield-home-outline", this.T("nav_general"), total));

    /* Alarm bolgeleri — Genel'in altinda, girintili. Odadan cihaz surukleyip
       dogrudan buraya birakabilirsin; oda listesi ekranda kalir. */
    for (const m of MODES) {
      const list = this._cfg.assign[m.key] || [];
      const row = el("div", "rr rzone");
      const ic = icon(m.icon);
      ic.style.color = m.col;
      row.appendChild(ic);
      row.appendChild(el("span", "n", esc(this.T(m.tk))));
      row.appendChild(el("span", "c", String(list.length)));
      row.onclick = () => this._go("genel");
      row.ondragover = (ev) => {
        ev.preventDefault();
        ev.dataTransfer.dropEffect = "copy";
        row.classList.add("raildrop");
      };
      row.ondragleave = (ev) => { if (!row.contains(ev.relatedTarget)) row.classList.remove("raildrop"); };
      row.ondrop = (ev) => {
        ev.preventDefault();
        row.classList.remove("raildrop");
        const eid = ev.dataTransfer.getData("text/plain");
        if (!eid || !this._armable(eid)) return;
        if (!this._cfg.assign[m.key].includes(eid)) {
          this._cfg.assign[m.key].push(eid);
          this._sensorCfg(eid);
          this._save();
          this._flash(`${this._name(eid)} → ${this.T(m.tk)}`);
        }
        this._render();
      };
      rail.appendChild(row);
    }

    rail.appendChild(el("div", "rail-l", esc(this.T("nav_alarm"))));
    rail.appendChild(mkRow("status", "mdi:gauge", this.T("nav_status")));
    rail.appendChild(mkRow("sensors", "mdi:radar", this.T("nav_sensors"), this._allAssigned().length));
    rail.appendChild(mkRow("modes", "mdi:tune-variant", this.T("nav_modes")));
    const actTotal = ACT_EVENTS.reduce((n, ev) => n + (this._cfg.actions[ev.key] || []).length, 0);
    rail.appendChild(mkRow("actions", "mdi:playlist-play", this.T("act_h"), actTotal));
    const au = this._cfg.auto || {};
    const autoCount = (au.schedules || []).filter((s) => s.enabled !== false).length
      + (au.triggers || []).filter((t) => t.enabled !== false && t.entity).length
      + (((au.leave || {}).enabled) ? 1 : 0) + (((au.arrive || {}).enabled) ? 1 : 0);
    rail.appendChild(mkRow("auto", "mdi:calendar-clock", this.T("auto_h"), autoCount || null));
    const vc = this._cfg.vacation_cfg || {};
    rail.appendChild(mkRow("vacation", "mdi:palm-tree", this.T("vac_h2"),
      vc.sim_enabled ? (vc.sim_lights || []).length : null));
    const nl = this._cfg.night_lights || {};
    rail.appendChild(mkRow("night", "mdi:lightbulb-night-outline", this.T("nl_h"),
      nl.enabled ? (nl.lights || []).length : null));
    rail.appendChild(mkRow("log", "mdi:timeline-text-outline", this.T("log_h2"),
      (this._runs || []).length || null));

    rail.appendChild(el("div", "rail-l", esc(this.T("nav_rooms"))));
    const rooms = this._roomList();
    for (const rm of rooms) {
      const row = mkRow("room:" + rm.id, rm.icon, rm.name, rm.ents.length);
      // Odanin uzerine cihaz birakilamaz; ama oda satiri surukleme hedefi degil.
      rail.appendChild(row);
    }
    if (!rooms.length) rail.appendChild(el("div", "empty", esc(this.T("no_rooms"))));
  }

  /* ---------------------------------------------------------------- sahne */
  _renderStage() {
    if (!this._built) return;
    const s = this.shadowRoot.getElementById("stage");
    s.textContent = "";
    if (this._page === "genel") this._pageZones(s);
    else if (this._page === "status") this._pageStatus(s);
    else if (this._page === "sensors") this._pageSensors(s);
    else if (this._page === "modes") this._pageModes(s);
    else if (this._page === "actions") this._pageActions(s);
    else if (this._page === "auto") this._pageAuto(s);
    else if (this._page === "vacation") this._pageVacation(s);
    else if (this._page === "night") this._pageNight(s);
    else if (this._page === "log") this._pageLog(s);
    else if (this._page.startsWith("room:")) this._pageRoom(s, this._page.slice(5));
  }

  _stageHead(root, title, meta) {
    const h = el("div", "stage-h");
    h.appendChild(el("div", "room-title", esc(title)));
    if (meta) h.appendChild(el("div", "room-meta", meta));
    root.appendChild(h);
    return h;
  }

  _sec(root, name, count, opts) {
    opts = opts || {};
    const sec = el("div", "sec" + (opts.zone ? " zone" : ""));
    if (opts.color) sec.style.setProperty("--zc", opts.color);
    const h = el("div", "sec-h");
    if (opts.icon) h.appendChild(icon(opts.icon));
    h.appendChild(el("span", "sec-name", esc(name)));
    if (count !== undefined && count !== null) h.appendChild(el("span", "sec-count", String(count)));
    if (opts.sub) h.appendChild(el("span", "sec-sub", esc(opts.sub)));
    sec.appendChild(h);
    root.appendChild(sec);
    return sec;
  }

  /* ============================================================ GENEL */
  _pageZones(root) {
    const total = MODES.reduce((n, m) => n + (this._cfg.assign[m.key] || []).length, 0);
    const head = this._stageHead(root, this.T("zones_h"),
      `<b>${total}</b> ${esc(this.T("devices"))} · ${esc(this.T("zones_m"))}`);

    // entity_id'leri göster/gizle — bölge çiplerinde de görünür.
    const idBtn = el("button", "addsec" + (this._showEntityIds ? " on" : ""));
    idBtn.appendChild(icon("mdi:identifier"));
    idBtn.appendChild(el("span", null, esc(this.T("show_ids"))));
    idBtn.onclick = () => { this._showEntityIds = !this._showEntityIds; this._renderStage(); };
    head.appendChild(idBtn);

    const wrap = el("div", "secwrap");
    for (const mode of MODES) {
      const list = this._cfg.assign[mode.key] || [];
      const sec = this._sec(wrap, this.T(mode.tk), list.length,
        { zone: true, color: mode.col, icon: mode.icon, sub: this.T(mode.sk) });

      if (list.length) {
        const clr = el("button", "zclear");
        clr.appendChild(icon("mdi:backspace-outline"));
        clr.appendChild(el("span", null, esc(this.T("clear_zone"))));
        clr.onclick = () => {
          const body = this.T("clear_b")
            .replace("{n}", list.length).replace("{z}", this.T(mode.tk));
          this._confirm(this.T("clear_q"), body, this.T("yes_clear"), () => {
            this._cfg.assign[mode.key] = [];
            this._save();
            this._render();
          });
        };
        sec.querySelector(".sec-h").appendChild(clr);
      }

      if (!list.length) {
        sec.appendChild(el("div", "empty", esc(this.T("zones_empty"))));
      } else {
        // Odaya göre grupla — her oda kendi başlığı + çizgisi altında.
        const kindRank = (e) => {
          const i = ZONE_KINDS.findIndex((k) => k.key === this._sensorKind(e));
          return i < 0 ? 99 : i;
        };
        const rooms = {};
        for (const eid of list) {
          const rn = this._areaName(eid) || this.T("kind_other");
          (rooms[rn] = rooms[rn] || []).push(eid);
        }
        const rnames = Object.keys(rooms).sort((a, b) => a.localeCompare(b, "tr"));
        for (const rn of rnames) {
          const ents = rooms[rn].sort((a, b) =>
            (kindRank(a) - kindRank(b)) || this._name(a).localeCompare(this._name(b), "tr"));
          // Tek satır: solda oda adı (kırmızı aksan), sağda o odanın çipleri.
          const row = el("div", "rrow");
          const label = el("div", "rlabel");
          label.appendChild(el("span", "rbar"));
          label.appendChild(el("span", "rlname", esc(rn)));
          row.appendChild(label);
          const flow = el("div", "devflow");
          for (const eid of ents) {
            flow.appendChild(this._devPill(eid, { removable: mode.key, draggable: true, zone: true }));
          }
          row.appendChild(flow);
          sec.appendChild(row);
        }
      }

      sec.ondragover = (ev) => { ev.preventDefault(); ev.dataTransfer.dropEffect = "copy"; sec.classList.add("dropok"); };
      sec.ondragleave = (ev) => { if (!sec.contains(ev.relatedTarget)) sec.classList.remove("dropok"); };
      sec.ondrop = (ev) => {
        ev.preventDefault();
        sec.classList.remove("dropok");
        const raw = ev.dataTransfer.getData("text/plain");
        if (!raw) return;
        const eids = raw.split(",").filter(Boolean);
        let added = 0;
        for (const eid of eids) {
          if (!this._armable(eid)) continue;
          if (!this._cfg.assign[mode.key].includes(eid)) {
            this._cfg.assign[mode.key].push(eid);
            this._sensorCfg(eid);
            added++;
          }
        }
        if (added) this._save();
        this._render();
      };
    }
    root.appendChild(wrap);
    root.appendChild(el("div", "hint", esc(this.T("drag_hint")) + " · " + esc(this.T("tap_rules"))));
  }

  /* ============================================================= ODA */
  _pageRoom(root, roomId) {
    const rooms = this._roomList();
    const room = rooms.find((r) => r.id === roomId);
    if (!room) { root.appendChild(el("div", "empty", esc(this.T("no_rooms")))); return; }

    const inZones = room.ents.filter((e) => this._zonesOf(e).length).length;
    const head = this._stageHead(root, room.name,
      `<b>${room.ents.length}</b> ${esc(this.T("room_meta"))} · <b>${inZones}</b> ${esc(this.T("in_zones"))}`);

    // odanin alarma uygun tum cihazlarini tek seferde bir bolgeye ekle
    const add = el("button", "addsec");
    add.appendChild(icon("mdi:plus"));
    add.appendChild(el("span", null, esc(this.T("add_room_all"))));
    add.onclick = () => this._pickZone((mode) => {
      const pending = room.ents.filter((e) =>
        this._armable(e) && !this._cfg.assign[mode].includes(e));
      const zoneName = this.T(MODES.find((m) => m.key === mode).tk);
      if (!pending.length) { this._flash(this.T("bulk_none")); return; }
      const body = this.T("bulk_b")
        .replace("{n}", pending.length).replace("{r}", room.name).replace("{z}", zoneName);
      this._confirm(this.T("bulk_q"), body, this.T("yes_add"), () => {
        for (const eid of pending) {
          this._cfg.assign[mode].push(eid);
          this._sensorCfg(eid);
        }
        this._save();
        this._render();
      });
    });
    head.appendChild(add);

    // entity_id'leri göster/gizle — cihazları kesin ayırt etmek için.
    const idBtn = el("button", "addsec" + (this._showEntityIds ? " on" : ""));
    idBtn.appendChild(icon("mdi:identifier"));
    idBtn.appendChild(el("span", null, esc(this.T("show_ids"))));
    idBtn.onclick = () => { this._showEntityIds = !this._showEntityIds; this._renderStage(); };
    head.appendChild(idBtn);

    const wrap = el("div", "secwrap");
    let any = false;
    for (const g of GROUP_DEF) {
      let ents = room.ents.filter((e) => g.doms.includes(e.split(".")[0]));
      // Işık grupları kendi bölümünde; tek tek ışıkların arasına karışmasınlar.
      if (g.key === "isik") ents = ents.filter((e) => !this._isLightGroup(e));
      else if (g.key === "isikgrup") ents = ents.filter((e) => this._isLightGroup(e));
      if (!ents.length) continue;
      any = true;
      const grp = el("div", "grp");
      const gh = el("div", "grp-h");
      gh.appendChild(icon(g.icon));
      gh.appendChild(el("span", "gn", esc(g.name[this._lang()] || g.name.en)));
      gh.appendChild(el("span", "gc", String(ents.length)));
      grp.appendChild(gh);
      const flow = el("div", "devflow");
      for (const eid of ents) flow.appendChild(this._devPill(eid, { draggable: true, showZones: true }));
      grp.appendChild(flow);
      wrap.appendChild(grp);
    }
    if (!any) wrap.appendChild(el("div", "empty", esc(this.T("room_empty"))));
    root.appendChild(wrap);
    root.appendChild(el("div", "hint", esc(this.T("tap_assign")) + " · " + esc(this.T("drag_hint"))));
  }

  _devPill(eid, opts) {
    opts = opts || {};
    const info = this._stateInfo(eid);
    const armable = this._armable(eid);
    let cls = "dev";
    if (info.on) cls += " on";
    if (info.pulse) cls += " pulse";
    if (info.dead) cls += " dead";
    if (!armable) cls += " locked";
    const zones = this._zonesOf(eid);
    if (opts.showZones && zones.length) cls += " inzone";

    const d = el("div", cls);
    d.appendChild(el("span", "dot"));
    d.appendChild(icon(this._entIcon(eid)));
    d.appendChild(el("span", "dn", esc(this._name(eid))));
    if (this._showEntityIds && (opts.zone || opts.showZones)) d.appendChild(el("span", "deid", esc(eid)));
    // Bölge içinde: doğrulama bağı görünür (node-red rozeti). Oda artık grup başlığında.
    if (opts.zone) {
      const conf = this._confirmLabel(eid);
      if (conf) {
        const b = el("span", "dlink");
        b.appendChild(icon("mdi:arrow-left-thin"));
        b.appendChild(el("span", null, esc(conf)));
        b.title = this.T("needs_lbl") + ": " + conf;
        d.appendChild(b);
      }
    }
    if (info.text) d.appendChild(el("span", "ds", esc(info.text)));

    if (opts.showZones && zones.length) {
      const zm = el("span", "zmark");
      for (const z of zones) {
        const i = el("i");
        i.style.background = z.col;
        i.title = this.T(z.tk);
        zm.appendChild(i);
      }
      d.appendChild(zm);
    }

    if (opts.removable) {
      const x = el("button", "dev-x");
      x.appendChild(icon("mdi:close"));
      x.title = "×";
      x.onclick = (ev) => {
        ev.stopPropagation();
        const arr = this._cfg.assign[opts.removable];
        const i = arr.indexOf(eid);
        if (i >= 0) arr.splice(i, 1);
        this._save();
        this._render();
      };
      d.appendChild(x);
    }

    // Bölge çipine dokun → o sensörün kural penceresi.
    if (opts.zone && armable) {
      d.classList.add("tapedit");
      d.onclick = (ev) => {
        if (ev.target.closest(".dev-x")) return;
        this._editSensor(eid);
      };
    }
    // Oda sayfasında çipe dokun → hangi bölgelere ekleyeceğini seç (drag'a gerek yok).
    else if (opts.showZones && armable) {
      d.classList.add("tapedit");
      d.onclick = () => this._assignZones(eid);
    }

    if (opts.draggable && armable) {
      d.draggable = true;
      d.ondragstart = (ev) => {
        ev.dataTransfer.setData("text/plain", eid);
        ev.dataTransfer.effectAllowed = "copy";
        d.classList.add("drag");
      };
      d.ondragend = () => d.classList.remove("drag");
    } else if (!armable) {
      d.title = this._lang() === "tr"
        ? "Bu tür cihaz alarmı tetikleyemez (bilgi amaçlı listelenir)"
        : "This device type cannot trigger the alarm (listed for reference)";
    }
    return d;
  }

  /* Oda sayfasında cihaza dokununca — hangi bölgelere ekleneceğini seç.
     Sürükle-bırak çalışmadığında (tablet/dokunmatik) tek yol budur. */
  _assignZones(eid) {
    const prev = this.shadowRoot.querySelector(".ov.editor");
    if (prev) prev.remove();
    const ov = el("div", "ov editor");
    const ed = el("div", "ed");
    ed.style.maxWidth = "440px";
    const th = el("div", "ed-t");
    th.style.display = "flex"; th.style.alignItems = "center"; th.style.gap = "9px";
    th.appendChild(icon(this._entIcon(eid)));
    th.appendChild(el("span", null, esc(this._name(eid))));
    ed.appendChild(th);
    ed.appendChild(el("div", "ed-s", esc(this.T("assign_h") + " · " + this.T("assign_s"))));
    const body = el("div");
    for (const m of MODES) {
      const inz = (this._cfg.assign[m.key] || []).includes(eid);
      const ctl = this._toggle(inz, (v) => {
        const arr = this._cfg.assign[m.key];
        const i = arr.indexOf(eid);
        if (v && i < 0) { arr.push(eid); this._sensorCfg(eid); }
        else if (!v && i >= 0) { arr.splice(i, 1); }
        this._save();
      });
      body.appendChild(this._row(this.T(m.tk), this.T(m.sk), ctl));
    }
    ed.appendChild(body);
    const foot = el("div", "ed-foot");
    const ok = el("button", "btn", esc(this.T("save")));
    ok.onclick = () => { ov.remove(); this._renderStage(); };
    foot.appendChild(ok);
    ed.appendChild(foot);
    ov.onclick = (ev) => { if (ev.target === ov) { ov.remove(); this._renderStage(); } };
    ov.appendChild(ed);
    this.shadowRoot.appendChild(ov);
  }

  /* Tek bir sensörün kuralları — Genel'de çipe dokununca açılır. */
  _editSensor(eid) {
    const prev = this.shadowRoot.querySelector(".ov.editor");
    if (prev) prev.remove();
    const cur = this._sensorCfg(eid);
    const draft = {
      delay: cur.delay, unavail: cur.unavail, entry: cur.entry,
      confirm: cur.confirm || "", confirm_window: cur.confirm_window || 15,
      area: cur.area || "",
    };
    const kind = this._sensorKind(eid);
    const room = this._areaName(eid);

    const ov = el("div", "ov editor");
    const ed = el("div", "ed");
    ed.style.maxWidth = "540px";
    const th = el("div", "ed-t");
    th.style.display = "flex"; th.style.alignItems = "center"; th.style.gap = "9px";
    th.appendChild(icon(this._entIcon(eid)));
    th.appendChild(el("span", null, esc(this._name(eid))));
    ed.appendChild(th);
    ed.appendChild(el("div", "ed-s", esc(room ? room + " · " + eid : eid)));
    const body = el("div");
    ed.appendChild(body);

    const paint = () => {
      body.textContent = "";
      body.appendChild(this._row(this.T("c_delay"), this.T("c_delay_s"),
        this._slider(draft.delay, 0, 300, 5, (v) => { draft.delay = v; },
          (v) => this._fmtSecs(v))));

      // Doğrulama — kapı/pencere için anlamsız, gizli tut.
      if (kind !== "contact") {
        const sel = document.createElement("select");
        sel.className = "nsel";
        const addOpt = (val, label) => {
          const o = document.createElement("option");
          o.value = val; o.textContent = label;
          if (draft.confirm === val) o.selected = true;
          sel.appendChild(o);
        };
        addOpt("", this.T("confirm_none"));
        addOpt("room", this.T("confirm_room"));
        for (const c of this._confirmCandidates(eid)) addOpt(c, this._name(c));
        sel.onchange = () => { draft.confirm = sel.value; paint(); };
        body.appendChild(this._row(this.T("c_confirm"), this.T("c_confirm_s"), sel));

        if (draft.confirm) {
          body.appendChild(this._row(this.T("c_window"), this.T("c_window_s"),
            this._slider(draft.confirm_window, 5, 120, 5, (v) => { draft.confirm_window = v; },
              (v) => this._fmtSecs(v))));
        }
      }

      // Oda — HA'da atanmamışsa buradan seç (bildirim/kamera bunu kullanır).
      if (!this._haArea(eid)) {
        const rs = document.createElement("select");
        rs.className = "nsel";
        const autoLbl = this.T("room_none");
        const addOpt = (val, label) => {
          const o = document.createElement("option");
          o.value = val; o.textContent = label;
          if (draft.area === val) o.selected = true;
          rs.appendChild(o);
        };
        addOpt("", autoLbl);
        const areas = Object.values(this._hass.areas || {})
          .sort((a, b) => (a.name || "").localeCompare(b.name || "", "tr"));
        for (const a of areas) addOpt(a.area_id, a.name);
        rs.onchange = () => { draft.area = rs.value; paint(); };
        body.appendChild(this._row(this.T("c_room"), this.T("c_room_s"), rs));
      }

      body.appendChild(this._row(this.T("c_entry"), this.T("c_entry_s"),
        this._toggle(draft.entry, (v) => { draft.entry = v; })));
      body.appendChild(this._row(this.T("c_unavail"), this.T("c_unavail_s"),
        this._toggle(draft.unavail, (v) => { draft.unavail = v; })));
    };
    paint();

    const foot = el("div", "ed-foot");
    const ok = el("button", "btn", esc(this.T("save")));
    ok.onclick = () => {
      Object.assign(this._sensorCfg(eid), draft);
      this._save();
      ov.remove();
      this._renderStage();
    };
    const no = el("button", "btn ghost", esc(this.T("cancel")));
    no.onclick = () => ov.remove();
    foot.appendChild(ok);
    foot.appendChild(no);
    ed.appendChild(foot);

    ov.onclick = (ev) => { if (ev.target === ov) ov.remove(); };
    ov.appendChild(ed);
    this.shadowRoot.appendChild(ov);
  }

  /* Geri alinamaz toplu islemler once sorar — tek tikla 40 cihaz eklenmesin. */
  _confirm(title, body, okLabel, onOk) {
    const prev = this.shadowRoot.querySelector(".ov.confirm");
    if (prev) prev.remove();
    const ov = el("div", "ov confirm");
    const ed = el("div", "ed");
    ed.style.maxWidth = "460px";
    ed.appendChild(el("div", "ed-t", esc(title)));
    ed.appendChild(el("div", "ed-s", esc(body)));
    const foot = el("div", "ed-foot");
    const ok = el("button", "btn", esc(okLabel));
    ok.onclick = () => { ov.remove(); onOk(); };
    const no = el("button", "btn ghost", esc(this.T("cancel")));
    no.onclick = () => ov.remove();
    foot.appendChild(ok);
    foot.appendChild(no);
    ed.appendChild(foot);
    ov.onclick = (ev) => { if (ev.target === ov) ov.remove(); };
    ov.appendChild(ed);
    this.shadowRoot.appendChild(ov);
  }

  _pickZone(onPick) {
    this._overlay(this.T("arm_as"), (list, q, close) => {
      list.textContent = "";
      for (const m of MODES) {
        const r = el("div", "pk");
        const ic = icon(m.icon); ic.style.color = m.col;
        r.appendChild(ic);
        const b = el("div", "n");
        b.appendChild(el("div", null, esc(this.T(m.tk))));
        b.appendChild(el("div", "e", esc(this.T(m.sk))));
        r.appendChild(b);
        r.onclick = () => { close(); onPick(m.key); };
        list.appendChild(r);
      }
    }, true);
  }

  /* =========================================================== DURUM */
  _pageStatus(root) {
    const st = this._alarm;
    const state = st ? st.state : "unknown";
    const attrs = (st && st.attributes) || {};
    const look = {
      disarmed:       { c: "#5fe39a", ic: "mdi:shield-outline",     rip: false },
      armed_home:     { c: "#b58cff", ic: "mdi:shield-home",        rip: true },
      armed_away:     { c: "#ff8fb3", ic: "mdi:shield-lock",        rip: true },
      armed_night:    { c: "#9d8cff", ic: "mdi:shield-moon",        rip: true },
      armed_vacation: { c: "#ffb86b", ic: "mdi:shield-airplane",    rip: true },
      arming:         { c: "#ffb86b", ic: "mdi:shield-sync",        rip: true },
      pending:        { c: "#ffb86b", ic: "mdi:shield-alert",       rip: true },
      triggered:      { c: "#ff5c6f", ic: "mdi:bell-ring",          rip: true },
    }[state] || { c: "#6f6675", ic: "mdi:shield-off-outline", rip: false };

    const rgba = (hex, a) => {
      const n = parseInt(hex.slice(1), 16);
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
    };

    this._stageHead(root, this.T("status_h"), "");

    const box = el("div", "stbox");
    box.style.setProperty("--sc", rgba(look.c, .55));
    const inn = el("div", "stin");
    const ic = el("div", "stic");
    ic.style.setProperty("--sb", rgba(look.c, .45));
    ic.style.setProperty("--sg", rgba(look.c, .28));
    ic.style.setProperty("--sc2", look.c);
    if (look.rip) { ic.appendChild(el("div", "rip")); ic.appendChild(el("div", "rip r2")); }
    ic.appendChild(icon(look.ic));
    inn.appendChild(ic);

    const t = el("div", "stt");
    const mode = attrs.mode || "";
    const kick = el("div", "k", esc(mode ? this.T("m_" + (mode === "vacation" ? "vac" : mode)) : this.T("brand")));
    kick.style.color = look.c;
    t.appendChild(kick);
    const label = this.T("st_" + state);
    t.appendChild(el("div", "v", esc(label === "st_" + state ? this.T("st_unknown") : label)));
    const bits = [];
    if (st && st.last_changed) {
      const d = new Date(st.last_changed);
      const hhmm = d.toLocaleTimeString(this._lang() === "tr" ? "tr-TR" : "en-GB",
        { hour: "2-digit", minute: "2-digit" });
      bits.push(this._lang() === "tr" ? `${hhmm}'den beri` : `since ${hhmm}`);
    }
    if (attrs.trigger_source) bits.push("⚡ " + attrs.trigger_source);
    t.appendChild(el("div", "s", esc(bits.join(" · "))));
    inn.appendChild(t);

    const watched = mode ? (this._cfg.assign[mode] || []) : [];
    const list = watched.length ? watched : (this._cfg.assign.away || []);
    let open = 0, dead = 0;
    for (const e of list) {
      const i = this._stateInfo(e);
      if (i.dead) dead++;
      else if (i.on && this._isContact(e)) open++;
    }
    const nums = el("div", "stnums");
    const mkNum = (n, l, cls) => {
      const b = el("div", "stnum" + (cls ? " " + cls : ""));
      b.appendChild(el("div", "n", String(n)));
      b.appendChild(el("div", "l", esc(l)));
      return b;
    };
    nums.appendChild(mkNum(list.length, this.T("watched")));
    nums.appendChild(mkNum(open, this.T("open_now"), open ? "hi" : ""));
    nums.appendChild(mkNum(dead, this.T("unavail"), dead ? "bad" : ""));
    inn.appendChild(nums);
    box.appendChild(inn);
    root.appendChild(box);

    /* mod dugmeleri */
    const picks = el("div", "picks");
    const dis = el("div", "pick" + (state === "disarmed" ? " on" : ""));
    dis.appendChild(icon("mdi:lock-open-variant-outline"));
    dis.appendChild(el("span", null, esc(this.T("disarm"))));
    dis.onclick = () => this._disarmAsk();
    picks.appendChild(dis);
    for (const m of MODES) {
      const p = el("div", "pick" + (mode === m.key && state !== "disarmed" ? " on" : ""));
      const i = icon(m.icon);
      if (mode === m.key && state !== "disarmed") i.style.color = m.col;
      p.appendChild(i);
      p.appendChild(el("span", null, esc(this.T(m.tk))));
      p.onclick = () => this._action({ action: "arm", mode: m.key });
      picks.appendChild(p);
    }
    root.appendChild(picks);

    const blocked = attrs.open_now || [];
    if (blocked.length) {
      const w = el("div", "warn");
      w.appendChild(icon("mdi:alert-outline"));
      w.appendChild(el("span", null,
        `<b>${esc(this.T("blocked_t"))}:</b> ${esc(blocked.join(", "))} ${esc(this.T("blocked_s"))}`));
      const go = el("button", "go", esc(this.T("bypass_arm")));
      go.onclick = () => this._action({ action: "arm", mode: mode || "away", bypass: true });
      w.appendChild(go);
      root.appendChild(w);
    }

    /* olaylar */
    const wrap = el("div", "secwrap");
    const evSec = this._sec(wrap, this.T("events"), this._events.length);
    if (!this._events.length) evSec.appendChild(el("div", "empty", esc(this.T("no_events"))));
    const EIC = {
      armed: "mdi:shield-check", disarmed: "mdi:shield-off-outline", triggered: "mdi:bell-ring",
      blocked: "mdi:alert-outline", entry: "mdi:door-open", light: "mdi:lightbulb-off-outline",
      unavailable: "mdi:access-point-network-off", code: "mdi:dialpad", restore: "mdi:restore",
    };
    for (const e of this._events.slice(0, 14)) {
      const r = el("div", "evt" + (e.kind === "triggered" || e.kind === "blocked" ? " fire" :
        (e.kind === "armed" || e.kind === "disarmed" ? " good" : "")));
      const box2 = el("div", "ic"); box2.appendChild(icon(EIC[e.kind] || "mdi:circle-small"));
      r.appendChild(box2);
      const b = el("div", "b");
      b.appendChild(el("div", "n", esc(e.text)));
      r.appendChild(b);
      r.appendChild(el("div", "t", esc((e.ts || "").split("T")[1] || "").slice(0, 5)));
      evSec.appendChild(r);
    }

    /* bolge sagligi */
    const zs = this._sec(wrap, this.T("zone_health"));
    const watchSet = new Set(list);
    const rooms = this._roomList();
    let shown = 0;
    for (const rm of rooms) {
      const mine = rm.ents.filter((e) => watchSet.has(e));
      if (!mine.length) continue;
      shown++;
      const r = el("div", "zh");
      r.appendChild(icon(rm.icon));
      r.appendChild(el("span", "n", esc(rm.name)));
      const bad = mine.filter((e) => this._stateInfo(e).dead);
      const opened = mine.filter((e) => this._isContact(e) && this._stateInfo(e).on);
      let tag;
      if (bad.length) tag = el("span", "tag err", `${bad.length} ${esc(this.T("z_unavail"))}`);
      else if (opened.length) tag = el("span", "tag warn", `${opened.length} ${esc(this.T("z_open"))}`);
      else tag = el("span", "tag ok", esc(this.T("z_clean")));
      r.appendChild(tag);
      zs.appendChild(r);
    }
    if (!shown) zs.appendChild(el("div", "empty", esc(this.T("zones_empty"))));
    root.appendChild(wrap);
  }

  _isContact(eid) {
    const dom = eid.split(".")[0];
    if (dom === "cover" || dom === "lock") return true;
    return CONTACT_CLASSES.includes(this._dc(eid));
  }

  /* ========================================================= SENSORLER */
  _pageSensors(root) {
    const list = this._allAssigned();
    this._stageHead(root, this.T("sens_h"),
      `<b>${list.length}</b> ${esc(this.T("devices"))} · ${esc(this.T("sens_m"))}`);

    const wrap = el("div", "secwrap");
    if (!list.length) {
      wrap.appendChild(el("div", "empty", esc(this.T("sens_none"))));
    }
    for (const eid of list) {
      const scfg = this._sensorCfg(eid);
      const zones = this._zonesOf(eid);
      const sec = this._sec(wrap, this._name(eid), null,
        { icon: this._entIcon(eid), sub: eid });

      // hangi bolgelerde
      const zrow = el("div", "chips");
      zrow.style.marginBottom = "12px";
      for (const z of zones) {
        const c = el("span", "chip");
        c.style.borderColor = z.col + "66";
        const i = icon(z.icon); i.style.color = z.col;
        c.appendChild(i);
        c.appendChild(el("span", null, esc(this.T(z.tk))));
        zrow.appendChild(c);
      }
      sec.appendChild(zrow);

      sec.appendChild(this._row(this.T("c_delay"), this.T("c_delay_s"),
        this._slider(scfg.delay, 0, 300, 5, (v) => { scfg.delay = v; this._save(); }, (v) => this._fmtSecs(v))));

      if (this._sensorKind(eid) !== "contact") {
        const sel = document.createElement("select");
        sel.className = "nsel";
        const addOpt = (val, label) => {
          const o = document.createElement("option");
          o.value = val; o.textContent = label;
          if (scfg.confirm === val) o.selected = true;
          sel.appendChild(o);
        };
        addOpt("", this.T("confirm_none"));
        addOpt("room", this.T("confirm_room"));
        for (const c of this._confirmCandidates(eid)) addOpt(c, this._name(c));
        sel.onchange = () => { scfg.confirm = sel.value; this._save(); this._renderStage(); };
        sec.appendChild(this._row(this.T("c_confirm"), this.T("c_confirm_s"), sel));
        if (scfg.confirm) {
          sec.appendChild(this._row(this.T("c_window"), this.T("c_window_s"),
            this._slider(scfg.confirm_window, 5, 120, 5, (v) => { scfg.confirm_window = v; this._save(); }, (v) => this._fmtSecs(v))));
        }
      }

      sec.appendChild(this._row(this.T("c_entry"), this.T("c_entry_s"),
        this._toggle(scfg.entry, (v) => { scfg.entry = v; this._save(); })));
      sec.appendChild(this._row(this.T("c_unavail"), this.T("c_unavail_s"),
        this._toggle(scfg.unavail, (v) => { scfg.unavail = v; this._save(); })));
    }

    /* isik kontrolu */
    const ls = this._sec(wrap, this.T("lights_h"), this._cfg.lights.length,
      { icon: "mdi:lightbulb-off-outline", sub: this.T("lights_s") });
    ls.appendChild(this._chipList(this._cfg.lights, "light", this.T("add_light"), "mdi:lightbulb-outline"));
    ls.appendChild(el("div", "empty", "⚠️ " + esc(this.T("lights_vac"))));
    root.appendChild(wrap);
  }

  /* =========================================================== EYLEMLER */
  /* Bir olayın seçili mod sekmesi ("" = Tümü) ve o sekmenin config anahtarı. */
  _actTab(evKey) {
    if (!this._actTabs) this._actTabs = {};
    return this._actTabs[evKey] || "";
  }
  _actKey(evKey) {
    const m = this._actTab(evKey);
    return m ? `${evKey}_${m}` : evKey;
  }
  _actList(evKey) {
    const k = this._actKey(evKey);
    if (!Array.isArray(this._cfg.actions[k])) this._cfg.actions[k] = [];
    return this._cfg.actions[k];
  }

  /* Seçili mod listesini başka bir moda kopyala (üstüne ekler, silmez). */
  _copyActions(evKey) {
    const fromMode = this._actTab(evKey);
    const steps = this._cfg.actions[this._actKey(evKey)] || [];
    if (!steps.length) return;
    const label = (m) => (m ? this.T(MODES.find((x) => x.key === m).tk) : this.T("act_all"));
    this._overlay(this.T("act_copy_to"), (list, q, close) => {
      list.textContent = "";
      const opts = [["", "mdi:shield-outline", "#b58cff"]];
      for (const m of MODES) opts.push([m.key, m.icon, m.col]);
      for (const [mk, ic, col] of opts) {
        if (mk === fromMode) continue;
        const targetKey = mk ? `${evKey}_${mk}` : evKey;
        const have = (this._cfg.actions[targetKey] || []).length;
        const r = el("div", "pk");
        const i = icon(ic); i.style.color = col;
        r.appendChild(i);
        const b = el("div", "n");
        b.appendChild(el("div", null, esc(label(mk))));
        b.appendChild(el("div", "e", esc(have
          ? this.T("act_copy_have").replace("{n}", have)
          : this.T("act_copy_empty"))));
        r.appendChild(b);
        r.onclick = () => {
          close();
          const body = this.T("act_copy_b")
            .replace("{n}", steps.length)
            .replace("{a}", label(fromMode))
            .replace("{b}", label(mk));
          this._confirm(this.T("act_copy_q"), body, this.T("act_copy_ok"), () => {
            if (!Array.isArray(this._cfg.actions[targetKey])) this._cfg.actions[targetKey] = [];
            for (const s of steps) {
              const copy = JSON.parse(JSON.stringify(s));
              copy.id = uid();
              this._cfg.actions[targetKey].push(copy);
            }
            this._save();
            if (!this._actTabs) this._actTabs = {};
            this._actTabs[evKey] = mk;      // kopyaladığın sekmeye geç
            this._renderStage();
            this._flash(this.T("act_copied").replace("{n}", steps.length));
          });
        };
        list.appendChild(r);
      }
    }, true);
  }

  _pageActions(root) {
    let total = 0;
    for (const k of Object.keys(this._cfg.actions || {})) {
      if (Array.isArray(this._cfg.actions[k])) total += this._cfg.actions[k].length;
    }
    this._stageHead(root, this.T("act_h"),
      `<b>${total}</b> ${esc(this.T("act_steps"))} · ${esc(this.T("act_s"))}`);

    const wrap = el("div", "secwrap");
    for (const ev of ACT_EVENTS) {
      const key = this._actKey(ev.key);
      const steps = this._actList(ev.key);
      const sec = this._sec(wrap, this.T(ev.tk), steps.length,
        { zone: true, color: ev.col, icon: ev.icon, sub: this.T(ev.sk) });

      if (steps.length) {
        const run = el("button", "zclear");
        run.appendChild(icon("mdi:play-outline"));
        run.appendChild(el("span", null, esc(this.T("act_test"))));
        run.onclick = () => this._action({ action: "run_actions", key: ev.key,
          mode: this._actTab(ev.key) || undefined });
        sec.querySelector(".sec-h").appendChild(run);
        const stop = el("button", "zclear");
        stop.style.marginLeft = "6px";
        stop.appendChild(icon("mdi:stop"));
        stop.appendChild(el("span", null, esc(this.T("act_stop"))));
        stop.onclick = () => this._action({ action: "stop_actions" });
        sec.querySelector(".sec-h").appendChild(stop);
        // Bu listeyi başka bir moda kopyala (HOME'da kurduğunu SLEEP'e taşı).
        const cp = el("button", "zclear");
        cp.style.marginLeft = "6px";
        cp.appendChild(icon("mdi:content-copy"));
        cp.appendChild(el("span", null, esc(this.T("act_copy"))));
        cp.onclick = () => this._copyActions(ev.key);
        sec.querySelector(".sec-h").appendChild(cp);
      }

      // Mod sekmeleri: Tümü + her mod ayrı liste
      const tabs = el("div", "mtabs");
      const mk = (m, label) => {
        const cnt = (this._cfg.actions[m ? `${ev.key}_${m}` : ev.key] || []).length;
        const b = el("button", "mtab" + (this._actTab(ev.key) === m ? " on" : ""));
        b.appendChild(el("span", null, esc(label)));
        if (cnt) b.appendChild(el("span", "mtc", String(cnt)));
        b.onclick = () => {
          if (!this._actTabs) this._actTabs = {};
          this._actTabs[ev.key] = m;
          this._renderStage();
        };
        if (m) {
          const mm = MODES.find((x) => x.key === m);
          if (mm && this._actTab(ev.key) === m) b.style.borderColor = mm.col + "88";
        }
        return b;
      };
      tabs.appendChild(mk("", this.T("act_all")));
      for (const m of MODES) tabs.appendChild(mk(m.key, this.T(m.tk)));
      sec.appendChild(tabs);
      if (this._actTab(ev.key)) {
        sec.appendChild(el("div", "empty", esc(this.T("act_mode_note"))));
      }

      if (!steps.length) sec.appendChild(el("div", "empty", esc(this.T("act_none"))));
      steps.forEach((step, i) => {
        // Adımlar arasındaki bağ: tıklayınca "aynı anda"ya geçer.
        if (i > 0) sec.appendChild(this._linkRow(key, steps, i));
        sec.appendChild(this._stepRow(key, step, i, steps.length));
      });

      // Toplam süre: paralel başlayanlar bloğun en uzunu kadar sayılır.
      if (steps.length) {
        let total = 0, batch = 0;
        steps.forEach((s, i) => {
          const d = this._stepSeconds(s);
          if (i > 0 && s.parallel) batch = Math.max(batch, d);
          else { total += batch; batch = d; }
        });
        total += batch;
        const foot = el("div", "runfoot");
        if (total > 0) {
          foot.appendChild(el("span", null,
            esc(this.T("dur_total").replace("{n}", Math.round(total)))));
        }
        const pr = this._progress || {};
        if (pr.running && pr.key === ev.key) {
          foot.appendChild(el("span", "ltag",
            "▶ " + esc(this.T("run_now").replace("{n}", pr.elapsed != null ? pr.elapsed : 0))));
        } else if (this._lastRun && this._lastRun.key === ev.key
                   && this._lastRun.total != null) {
          foot.appendChild(el("span", "dtag ok", esc(
            (this._lastRun.stopped ? this.T("run_stopped") : this.T("run_last"))
              .replace("{n}", this._lastRun.total))));
        }
        sec.appendChild(foot);
      }

      const addStep = el("button", "addsec");
      addStep.style.marginLeft = "0";
      addStep.style.marginTop = "10px";
      addStep.appendChild(icon("mdi:plus"));
      addStep.appendChild(el("span", null, esc(this.T("act_add"))));
      addStep.onclick = () => this._pickActionType((type) => {
        this._editStep(key, this._newStep(type), -1);
      });
      sec.appendChild(addStep);
    }
    root.appendChild(wrap);
    root.appendChild(el("div", "hint", esc(this.T("act_hint"))));
  }

  /* ===================================================== GECE IŞIKLARI */
  _pageNight(root) {
    if (!this._cfg.night_lights || typeof this._cfg.night_lights !== "object")
      this._cfg.night_lights = {};
    const n = this._cfg.night_lights;
    if (!Array.isArray(n.lights)) n.lights = [];
    if (!Array.isArray(n.modes)) n.modes = ["night"];
    const repaint = () => this._renderStage();

    this._stageHead(root, this.T("nl_h"),
      `<b>${n.lights.length}</b> ${esc(this.T("devices"))} · ${esc(this.T("nl_m"))}`);
    const wrap = el("div", "secwrap");

    /* 1) aç/kapa + hangi modlar */
    const on = this._sec(wrap, this.T("nl_on"), null,
      { zone: true, color: "#9d8cff", icon: "mdi:lightbulb-night-outline", sub: this.T("nl_on_s") });
    on.appendChild(this._row(this.T("nl_on"), this.T("nl_on_s"),
      this._toggle(!!n.enabled, (v) => { n.enabled = v; this._save(); repaint(); })));
    if (n.enabled) {
      on.appendChild(el("div", "grp-h", `<span class="gn">${esc(this.T("nl_modes"))}</span>`));
      on.appendChild(el("div", "empty", esc(this.T("nl_modes_s"))));
      const tabs = el("div", "mtabs");
      for (const m of MODES) {
        const sel = n.modes.includes(m.key);
        const b = el("button", "mtab" + (sel ? " on" : ""));
        b.appendChild(el("span", null, esc(this.T(m.tk))));
        if (sel) b.style.borderColor = m.col + "88";
        b.onclick = () => {
          const i = n.modes.indexOf(m.key);
          if (i >= 0) n.modes.splice(i, 1); else n.modes.push(m.key);
          this._save(); repaint();
        };
        tabs.appendChild(b);
      }
      on.appendChild(tabs);
    }

    if (!n.enabled) { root.appendChild(wrap); return; }

    /* 2) ışıklar + görünüm */
    const ls = this._sec(wrap, this.T("nl_lights"), n.lights.length,
      { icon: "mdi:lightbulb-outline", sub: this.T("nl_lights_s") });
    ls.appendChild(this._chipList(n.lights, "light", this.T("vac_add_light"),
      "mdi:lightbulb-outline", repaint));
    ls.appendChild(this._row(this.T("f_bright"), this.T("nl_br_s"),
      this._slider(n.brightness == null ? 15 : n.brightness, 1, 100, 1,
        (v) => { n.brightness = v; this._save(); }, (v) => `%${v}`)));
    ls.appendChild(el("div", "ed-lab", `<b>${esc(this.T("f_colour"))}</b>`));
    ls.appendChild(this._colorRow(n.color, (c) => { n.color = c; this._save(); repaint(); }));

    /* 3) zaman çizelgesi — Tatil'deki gibi sürüklenebilir */
    const wh = this._sec(wrap, this.T("nl_when"), null,
      { icon: "mdi:timeline-clock-outline", sub: this.T("nl_when_s") });
    if (n.lights.length) {
      // "Otomatik doldur": her ışığa tüm gece bloğu ver (sıfırla).
      const auto = el("button", "zclear");
      auto.appendChild(icon("mdi:auto-fix"));
      auto.appendChild(el("span", null, esc(this.T("nl_auto"))));
      const tl = el("div", "vactl");
      auto.onclick = () => {
        const night = (this._nightCtx && this._nightCtx.night) || 660;
        n.plan = n.lights.map((eid) => ({ eid, start_min: 0, end_min: night }));
        this._save();
        this._renderNightTimeline(tl);
        this._flash(this.T("nl_auto_done"));
      };
      wh.querySelector(".sec-h").appendChild(auto);
      wh.appendChild(tl);
      this._ensureNightPlan(tl);
    } else {
      wh.appendChild(el("div", "empty", esc(this.T("nl_pick_first"))));
    }

    root.appendChild(wrap);
    root.appendChild(el("div", "hint", esc(this.T("nl_hint"))));
  }

  /* ========================================================== GÜNLÜK */
  _pageLog(root) {
    const runs = this._runs || [];
    this._stageHead(root, this.T("log_h2"),
      `<b>${runs.length}</b> ${esc(this.T("log_runs"))} · ${esc(this.T("log_s"))}`);
    const wrap = el("div", "secwrap");
    if (!runs.length) {
      wrap.appendChild(el("div", "empty", esc(this.T("log_none"))));
      root.appendChild(wrap);
      return;
    }
    const sec = this._sec(wrap, this.T("log_h"), runs.length,
      { zone: true, color: "#5fd0e3", icon: "mdi:timeline-text-outline", sub: this.T("log_s") });
    const evMeta = (k) => ACT_EVENTS.find((e) => e.key === k);
    for (const run of runs) {
      const meta = evMeta(run.key);
      const line = el("div", "logrun");
      const head = el("div", "lg-h");
      const dot = el("span", "lg-dot");
      dot.style.background = meta ? meta.col : "#8d8290";
      head.appendChild(dot);
      const ic = icon(meta ? meta.icon : "mdi:play-outline");
      ic.style.color = meta ? meta.col : "#8d8290";
      head.appendChild(ic);
      const nm = el("span", "lg-n", esc(meta ? this.T(meta.tk) : run.key));
      if (meta) nm.style.color = meta.col;
      head.appendChild(nm);
      if (run.mode) {
        const mm = MODES.find((m) => m.key === run.mode);
        const mt = el("span", "lg-mode", esc(mm ? this.T(mm.tk) : run.mode));
        if (mm) { mt.style.color = mm.col; mt.style.borderColor = mm.col + "55"; }
        head.appendChild(mt);
      }
      head.appendChild(el("span", "lg-t", esc((run.ts || "").slice(11, 19))));
      if (run.stopped) head.appendChild(el("span", "dtag bad", esc(this.T("run_stopped_s"))));
      else head.appendChild(el("span", "dtag ok",
        esc(this.T("dur_total").replace("{n}", Math.round(run.total || 0)))));
      line.appendChild(head);

      const body = el("div", "lg-steps");
      for (const s of (run.steps || [])) {
        const t = this._actMeta(s.type);
        const r = el("div", "lg-step" + (s.skipped ? " skip" : ""));
        r.appendChild(el("span", "lg-time", esc(s.at || "")));
        const si = icon(t.icon); si.style.opacity = ".8";
        r.appendChild(si);
        r.appendChild(el("span", "lg-name", esc(this.T(t.tk))));
        if ((s.targets || []).length) {
          r.appendChild(el("span", "lg-tg", esc(s.targets.join(", "))));
        }
        if (s.parallel) r.appendChild(el("span", "lg-par", "∥"));
        if (s.skipped) r.appendChild(el("span", "lg-sk", esc(this.T("log_skipped"))));
        else if (s.seconds) r.appendChild(el("span", "lg-sec", `${s.seconds}${this.T("sec_u")}`));
        body.appendChild(r);
      }
      line.appendChild(body);
      sec.appendChild(line);
    }
    root.appendChild(wrap);
  }

  /* ========================================================== OTOMATİK */
  _personList() {
    const h = this._hass;
    if (!h) return [];
    const out = [];
    for (const [eid, st] of Object.entries(h.states || {})) {
      if (!eid.startsWith("person.")) continue;
      out.push({
        eid,
        name: (st.attributes && st.attributes.friendly_name) || eid,
        pic: (st.attributes && st.attributes.entity_picture) || "",
        home: st.state === "home",
      });
    }
    out.sort((a, b) => a.name.localeCompare(b.name, "tr"));
    return out;
  }

  /* Fotoğraflı kare kişi kartları — dokununca seçilir/çıkarılır. */
  _personPicker(arr, onChange) {
    const wrap = el("div", "pgrid");
    const people = this._personList();
    if (!people.length) {
      wrap.appendChild(el("div", "empty", esc(this.T("au_nopers"))));
      return wrap;
    }
    for (const p of people) {
      const on = arr.includes(p.eid);
      const c = el("div", "pcard" + (on ? " on" : ""));
      const ph = el("div", "pph");
      if (p.pic) {
        const img = document.createElement("img");
        img.src = p.pic; img.alt = p.name; img.loading = "lazy";
        ph.appendChild(img);
      } else {
        ph.appendChild(icon("mdi:account"));
      }
      const dot = el("span", "pdot" + (p.home ? " home" : ""));
      dot.title = p.home ? this.T("au_home") : this.T("au_away");
      ph.appendChild(dot);
      if (on) {
        const chk = el("span", "pchk");
        chk.appendChild(icon("mdi:check"));
        ph.appendChild(chk);
      }
      c.appendChild(ph);
      c.appendChild(el("div", "pnm", esc(p.name)));
      c.onclick = () => {
        const i = arr.indexOf(p.eid);
        if (i >= 0) arr.splice(i, 1); else arr.push(p.eid);
        this._save();
        onChange();
      };
      wrap.appendChild(c);
    }
    return wrap;
  }

  /* Bir entity'nin olası durumları — domain bilgisi + o anki durum + options. */
  _statesFor(eid) {
    if (!eid) return ["on", "off"];
    const dom = eid.split(".")[0];
    const st = this._hass && this._hass.states[eid];
    const a = (st && st.attributes) || {};
    const BY_DOM = {
      lock: ["locked", "unlocked", "open", "opening", "jammed"],
      cover: ["open", "closed", "opening", "closing"],
      binary_sensor: ["on", "off"],
      switch: ["on", "off"], light: ["on", "off"], fan: ["on", "off"],
      input_boolean: ["on", "off"], automation: ["on", "off"], siren: ["on", "off"],
      person: ["home", "not_home"], device_tracker: ["home", "not_home"],
      sun: ["above_horizon", "below_horizon"],
      media_player: ["playing", "paused", "idle", "off", "on", "standby"],
      vacuum: ["cleaning", "docked", "paused", "idle", "returning", "error"],
      alarm_control_panel: ["disarmed", "armed_home", "armed_away", "armed_night",
        "armed_vacation", "arming", "pending", "triggered"],
      climate: ["off", "heat", "cool", "auto", "dry", "fan_only", "heat_cool"],
      water_heater: ["off", "eco", "performance"],
      update: ["on", "off"], calendar: ["on", "off"],
    };
    const out = [];
    const push = (v) => { if (v && !out.includes(v)) out.push(String(v)); };
    // seçilebilir listeler (select / input_select / climate modları)
    for (const key of ["options", "hvac_modes", "preset_modes", "source_list"]) {
      if (Array.isArray(a[key])) a[key].forEach(push);
    }
    (BY_DOM[dom] || []).forEach(push);
    if (st && !["unknown", "unavailable"].includes(st.state)) push(st.state);
    if (!out.length) { push("on"); push("off"); }
    return out;
  }

  /* Durum seçici: otomatik liste + "kendim yazayım". */
  _statePick(eid, value, onChange) {
    const box = el("div", "spick");
    const opts = this._statesFor(eid);
    const known = opts.includes(value || "");
    const sel = document.createElement("select");
    sel.className = "nsel"; sel.style.minWidth = "132px";
    for (const o of opts) {
      const op = document.createElement("option");
      op.value = o; op.textContent = o;
      if (known && value === o) op.selected = true;
      sel.appendChild(op);
    }
    const man = document.createElement("option");
    man.value = "__manual__"; man.textContent = this.T("au_manual");
    if (!known) man.selected = true;
    sel.appendChild(man);
    const txt = document.createElement("input");
    txt.type = "text"; txt.className = "stime"; txt.style.width = "132px";
    txt.placeholder = this.T("au_manual_ph");
    txt.value = known ? "" : (value || "");
    txt.style.display = known ? "none" : "";
    txt.oninput = () => onChange(txt.value.trim());
    sel.onchange = () => {
      if (sel.value === "__manual__") {
        txt.style.display = ""; txt.focus();
        onChange(txt.value.trim());
      } else {
        txt.style.display = "none";
        onChange(sel.value);
      }
    };
    box.appendChild(sel);
    box.appendChild(txt);
    return box;
  }

  _pageAuto(root) {
    if (!this._cfg.auto || typeof this._cfg.auto !== "object") this._cfg.auto = {};
    const a = this._cfg.auto;
    if (!Array.isArray(a.schedules)) a.schedules = [];
    if (!a.leave || typeof a.leave !== "object") a.leave = { enabled: false, persons: [], mode: "away", delay: 5 };
    if (!a.arrive || typeof a.arrive !== "object") a.arrive = { enabled: false, persons: [] };
    if (!Array.isArray(a.leave.persons)) a.leave.persons = [];
    if (!Array.isArray(a.arrive.persons)) a.arrive.persons = [];
    if (!Array.isArray(a.triggers)) a.triggers = [];

    const active = a.schedules.filter((s) => s.enabled !== false).length
      + a.triggers.filter((t) => t.enabled !== false && t.entity).length
      + (a.leave.enabled ? 1 : 0) + (a.arrive.enabled ? 1 : 0);
    this._stageHead(root, this.T("auto_h"),
      `<b>${active}</b> ${esc(this.T("act_steps"))} · ${esc(this.T("auto_m"))}`);

    const wrap = el("div", "secwrap");
    const repaint = () => this._renderStage();

    /* 1) Saate göre */
    const sc = this._sec(wrap, this.T("au_sched"), a.schedules.length,
      { zone: true, color: "#b58cff", icon: "mdi:clock-outline", sub: this.T("au_sched_s") });
    if (!a.schedules.length) sc.appendChild(el("div", "empty", esc(this.T("au_none"))));
    const DAYS = this._lang() === "tr"
      ? ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"]
      : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    a.schedules.forEach((s, idx) => {
      if (!Array.isArray(s.days)) s.days = [];
      const row = el("div", "srow");
      const tin = document.createElement("input");
      tin.type = "time"; tin.className = "stime"; tin.value = s.time || "23:00";
      tin.onchange = () => { s.time = tin.value; this._save(); };
      row.appendChild(tin);
      const sel = document.createElement("select");
      sel.className = "nsel"; sel.style.minWidth = "128px";
      for (const m of MODES) {
        const o = document.createElement("option");
        o.value = m.key; o.textContent = this.T(m.tk);
        if ((s.mode || "away") === m.key) o.selected = true;
        sel.appendChild(o);
      }
      const od = document.createElement("option");
      od.value = "disarm"; od.textContent = this.T("au_disarm_m");
      if (s.mode === "disarm") od.selected = true;
      sel.appendChild(od);
      sel.onchange = () => { s.mode = sel.value; this._save(); };
      row.appendChild(sel);
      const dw = el("div", "days");
      DAYS.forEach((d, di) => {
        const b = el("button", "day" + (s.days.includes(di) ? " on" : ""), esc(d));
        b.onclick = () => {
          const i = s.days.indexOf(di);
          if (i >= 0) s.days.splice(i, 1); else s.days.push(di);
          this._save(); repaint();
        };
        dw.appendChild(b);
      });
      row.appendChild(dw);
      if (!s.days.length) row.appendChild(el("span", "dtag", esc(this.T("au_every"))));
      const tg = this._toggle(s.enabled !== false, (v) => { s.enabled = v; this._save(); });
      tg.style.marginLeft = "auto";
      row.appendChild(tg);
      const del = el("button", "vbtn del");
      del.appendChild(icon("mdi:trash-can-outline"));
      del.onclick = () => { a.schedules.splice(idx, 1); this._save(); repaint(); };
      row.appendChild(del);
      sc.appendChild(row);
    });
    const add = el("button", "addsec");
    add.style.marginLeft = "0"; add.style.marginTop = "10px";
    add.appendChild(icon("mdi:plus"));
    add.appendChild(el("span", null, esc(this.T("au_add"))));
    add.onclick = () => {
      a.schedules.push({ id: "s" + Math.random().toString(36).slice(2, 8),
        time: "23:00", mode: "night", days: [], enabled: true });
      this._save(); repaint();
    };
    sc.appendChild(add);

    /* 2) Herkes çıkınca */
    const lv = this._sec(wrap, this.T("au_leave"), a.leave.persons.length,
      { zone: true, color: "#ff8fb3", icon: "mdi:home-export-outline", sub: this.T("au_leave_s") });
    lv.appendChild(this._row(this.T("au_leave"), this.T("au_leave_s"),
      this._toggle(!!a.leave.enabled, (v) => { a.leave.enabled = v; this._save(); repaint(); })));
    if (a.leave.enabled) {
      lv.appendChild(el("div", "grp-h", `<span class="gn">${esc(this.T("au_people"))}</span>`));
      lv.appendChild(el("div", "empty", esc(this.T("au_people_s"))));
      lv.appendChild(this._personPicker(a.leave.persons, repaint));
      const ms = document.createElement("select");
      ms.className = "nsel";
      for (const m of MODES) {
        const o = document.createElement("option");
        o.value = m.key; o.textContent = this.T(m.tk);
        if ((a.leave.mode || "away") === m.key) o.selected = true;
        ms.appendChild(o);
      }
      ms.onchange = () => { a.leave.mode = ms.value; this._save(); };
      lv.appendChild(this._row(this.T("au_mode"), "", ms));
      lv.appendChild(this._row(this.T("au_delay"), this.T("au_delay_s"),
        this._slider(a.leave.delay == null ? 5 : a.leave.delay, 0, 60, 1,
          (v) => { a.leave.delay = v; this._save(); },
          (v) => (v === 0 ? this.T("instant") : `${v} ${this.T("min_u")}`))));
    }

    /* 3) Cihaz tetikleyicileri — bir entity açılınca/kapanınca */
    if (!Array.isArray(a.triggers)) a.triggers = [];
    const tg = this._sec(wrap, this.T("au_trig"), a.triggers.length,
      { zone: true, color: "#5fd0e3", icon: "mdi:toggle-switch-outline", sub: this.T("au_trig_s") });
    if (!a.triggers.length) tg.appendChild(el("div", "empty", esc(this.T("au_trig_none"))));
    a.triggers.forEach((t, idx) => {
      const row = el("div", "srow");
      const ep = this._entityPick(t.entity, "any", (v) => { t.entity = v; this._save(); repaint(); });
      ep.style.flex = "1 1 210px";
      row.appendChild(ep);
      row.appendChild(el("span", "twsep", esc(this.T("au_becomes"))));
      row.appendChild(this._statePick(t.entity, t.state, (v) => { t.state = v; this._save(); }));
      row.appendChild(el("span", "twsep", "→"));
      const ms = document.createElement("select");
      ms.className = "nsel"; ms.style.minWidth = "128px";
      for (const m of MODES) {
        const o = document.createElement("option");
        o.value = m.key; o.textContent = this.T(m.tk);
        if ((t.mode || "away") === m.key) o.selected = true;
        ms.appendChild(o);
      }
      const od = document.createElement("option");
      od.value = "disarm"; od.textContent = this.T("au_disarm_m");
      if (t.mode === "disarm") od.selected = true;
      ms.appendChild(od);
      ms.onchange = () => { t.mode = ms.value; this._save(); };
      row.appendChild(ms);
      // Gecikme alanı yok: çıkış/giriş süreleri zaten Modlar'dan geliyor.
      const tgl = this._toggle(t.enabled !== false, (v) => { t.enabled = v; this._save(); });
      tgl.style.marginLeft = "auto";
      row.appendChild(tgl);
      const del = el("button", "vbtn del");
      del.appendChild(icon("mdi:trash-can-outline"));
      del.onclick = () => { a.triggers.splice(idx, 1); this._save(); repaint(); };
      row.appendChild(del);
      tg.appendChild(row);
    });
    const addT = el("button", "addsec");
    addT.style.marginLeft = "0"; addT.style.marginTop = "10px";
    addT.appendChild(icon("mdi:plus"));
    addT.appendChild(el("span", null, esc(this.T("au_trig_add"))));
    addT.onclick = () => {
      a.triggers.push({ id: "t" + Math.random().toString(36).slice(2, 8),
        entity: "", state: "", mode: "disarm", delay: 0, enabled: true });
      this._save(); repaint();
    };
    tg.appendChild(addT);
    tg.appendChild(el("div", "hint", esc(this.T("au_trig_tip"))));

    /* 4) Kurulunca tüm ışıkları kapat */
    if (!a.lights_off || typeof a.lights_off !== "object")
      a.lights_off = { enabled: false, modes: [], except: [] };
    const lo = a.lights_off;
    if (!Array.isArray(lo.modes)) lo.modes = [];
    if (!Array.isArray(lo.except)) lo.except = [];
    const lf = this._sec(wrap, this.T("lo_h"), lo.modes.length,
      { zone: true, color: "#ffcf5c", icon: "mdi:lightbulb-off-outline", sub: this.T("lo_s") });
    lf.appendChild(this._row(this.T("lo_h"), this.T("lo_s"),
      this._toggle(!!lo.enabled, (v) => { lo.enabled = v; this._save(); repaint(); })));
    if (lo.enabled) {
      lf.appendChild(el("div", "grp-h", `<span class="gn">${esc(this.T("lo_modes"))}</span>`));
      const mt = el("div", "mtabs");
      for (const m of MODES) {
        const sel = lo.modes.includes(m.key);
        const b = el("button", "mtab" + (sel ? " on" : ""));
        b.appendChild(el("span", null, esc(this.T(m.tk))));
        if (sel) b.style.borderColor = m.col + "88";
        b.onclick = () => {
          const i = lo.modes.indexOf(m.key);
          if (i >= 0) lo.modes.splice(i, 1); else lo.modes.push(m.key);
          this._save(); repaint();
        };
        mt.appendChild(b);
      }
      lf.appendChild(mt);
      lf.appendChild(el("div", "ed-lab",
        `<b>${esc(this.T("lo_except"))}</b>${esc(this.T("lo_except_s"))}`));
      lf.appendChild(this._chipList(lo.except, "light", this.T("vac_add_light"), "mdi:lightbulb-outline"));
      const nlx = this._cfg.night_lights || {};
      if (nlx.enabled && (nlx.lights || []).length) {
        lf.appendChild(el("div", "tginfo",
          `<ha-icon icon="mdi:lightbulb-night-outline"></ha-icon><span>${esc(this.T("lo_nl_note"))}</span>`));
      }
    }

    /* 5) Biri gelince */
    const ar = this._sec(wrap, this.T("au_arrive"), a.arrive.persons.length,
      { zone: true, color: "#5fe39a", icon: "mdi:home-import-outline", sub: this.T("au_arrive_s") });
    ar.appendChild(this._row(this.T("au_arrive"), this.T("au_arrive_s"),
      this._toggle(!!a.arrive.enabled, (v) => { a.arrive.enabled = v; this._save(); repaint(); })));
    if (a.arrive.enabled) {
      ar.appendChild(el("div", "grp-h", `<span class="gn">${esc(this.T("au_people"))}</span>`));
      ar.appendChild(el("div", "empty", esc(this.T("au_people_s"))));
      ar.appendChild(this._personPicker(a.arrive.persons, repaint));
    }

    root.appendChild(wrap);
  }

  /* ============================================================ TATİL */
  _pageVacation(root) {
    if (!this._cfg.vacation_cfg) this._cfg.vacation_cfg = {};
    const vc = this._cfg.vacation_cfg;
    if (!Array.isArray(vc.sim_lights)) vc.sim_lights = [];
    this._stageHead(root, this.T("vac_h2"),
      `<b>${vc.sim_lights.length}</b> ${esc(this.T("devices"))} · ${esc(this.T("vac_page_m"))}`);

    const wrap = el("div", "secwrap");

    // 1) Aç/kapa
    const on = this._sec(wrap, this.T("vac_toggle"), null,
      { zone: true, color: "#ffb86b", icon: "mdi:palm-tree", sub: "" });
    on.appendChild(this._row(this.T("vac_toggle"), this.T("vac_toggle_s"),
      this._toggle(!!vc.sim_enabled, (v) => { vc.sim_enabled = v; this._save(); this._renderStage(); })));

    // 2) Işık seçimi
    const ls = this._sec(wrap, this.T("vac_lights"), vc.sim_lights.length,
      { icon: "mdi:lightbulb-group-outline", sub: this.T("vac_lights_s") });
    ls.appendChild(this._chipList(vc.sim_lights, "light", this.T("vac_add_light"), "mdi:lightbulb-outline"));

    // 3) Timeline (düzenlenebilir)
    const tl = this._sec(wrap, this.T("vac_tl_h"), null,
      { icon: "mdi:timeline-clock-outline", sub: this.T("vac_tl_s") });
    if (vc.sim_enabled && vc.sim_lights.length) {
      const reroll = el("button", "zclear");
      reroll.appendChild(icon("mdi:dice-5-outline"));
      reroll.appendChild(el("span", null, esc(this.T("vac_reroll"))));
      const tlBody = el("div", "vactl");
      reroll.onclick = () => this._regenVacPlan(tlBody, Math.floor(Math.random() * 1e6));
      tl.querySelector(".sec-h").appendChild(reroll);
      tl.appendChild(tlBody);
      this._ensureVacPlan(tlBody);
    } else {
      tl.appendChild(el("div", "empty", esc(this.T("vac_pick_first"))));
    }

    root.appendChild(wrap);
  }

  async _fetchVacPlan(seed) {
    const r = await this._hass.callApi("POST", "sentinel_alarm/action",
      { action: "vacation_plan", seed });
    return r && r.plan;
  }

  // Plan yoksa ya da ışık listesi değiştiyse otomatik üret + sabitle (sim_plan).
  async _ensureVacPlan(host) {
    host.textContent = ""; host.appendChild(el("div", "empty", "…"));
    const vc = this._cfg.vacation_cfg;
    let plan;
    try { plan = await this._fetchVacPlan(); }
    catch (e) { host.textContent = ""; host.appendChild(el("div", "empty", String(e))); return; }
    if (!plan) { host.textContent = ""; host.appendChild(el("div", "empty", esc(this.T("vac_pick_first")))); return; }
    this._vacCtx = { sunset: plan.sunset, sunrise: plan.sunrise, night: plan.night_min || 660 };
    const planEids = new Set((vc.sim_plan || []).map((b) => b.eid));
    const lightSet = new Set(vc.sim_lights);
    const mismatch = planEids.size !== lightSet.size ||
      [...lightSet].some((e) => !planEids.has(e));
    if (!vc.sim_plan || !vc.sim_plan.length || mismatch) {
      vc.sim_plan = (plan.blocks || []).map((b) => ({ ...b }));
      this._save();
    }
    this._renderVacTimeline(host);
  }

  async _regenVacPlan(host, seed) {
    host.textContent = ""; host.appendChild(el("div", "empty", "…"));
    let plan;
    try { plan = await this._fetchVacPlan(seed); }
    catch (e) { host.textContent = ""; host.appendChild(el("div", "empty", String(e))); return; }
    if (!plan) return;
    this._vacCtx = { sunset: plan.sunset, sunrise: plan.sunrise, night: plan.night_min || 660 };
    this._cfg.vacation_cfg.sim_plan = (plan.blocks || []).map((b) => ({ ...b }));
    this._save();
    this._renderVacTimeline(host);
  }

  _minClock(min, ctx) {
    const c = ctx || this._vacCtx;
    const base = c ? new Date(c.sunset).getTime() : Date.now();
    const d = new Date(base + min * 60000);
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  /* Gece ışıkları zaman çizelgesi — Tatil'dekiyle aynı sürükle/uzat mantığı. */
  _renderNightTimeline(host) {
    host.textContent = "";
    this._nightHost = host;
    const n = this._cfg.night_lights;
    const ctx = this._nightCtx || { night: 660 };
    const night = ctx.night || 660;
    const hhmm = (iso) => { const t = (iso || "").split("T")[1] || ""; return t.slice(0, 5); };
    const COL = "#9d8cff";

    const axis = el("div", "vax");
    axis.appendChild(el("span", "vsun", "☾ " + hhmm(ctx.sunset) + " " + this.T("vac_sunset")));
    axis.appendChild(el("span", "vsun r", hhmm(ctx.sunrise) + " " + this.T("vac_sunrise") + " ☀"));
    host.appendChild(axis);

    for (const eid of (n.lights || [])) {
      const mine = (n.plan || []).filter((b) => b.eid === eid);
      const lane = el("div", "vlane");
      const label = el("div", "vlbl");
      label.appendChild(icon(this._entIcon(eid)));
      label.appendChild(el("span", null, esc(this._name(eid))));
      lane.appendChild(label);
      const track = el("div", "vtrack");
      for (const b of mine) {
        const seg = el("div", "vseg");
        seg.style.left = (b.start_min / night * 100) + "%";
        seg.style.width = Math.max(1.2, (b.end_min - b.start_min) / night * 100) + "%";
        seg.style.background = COL + "33";
        seg.style.borderColor = COL + "88";
        const cap = el("span", "vcap", this._minClock(b.start_min, ctx));
        cap.style.color = COL;
        seg.appendChild(cap);
        seg.appendChild(el("span", "vh l"));
        seg.appendChild(el("span", "vh r"));
        this._segEdit(seg, cap, b, track, night, ctx);
        track.appendChild(seg);
      }
      lane.appendChild(track);
      const acts = el("div", "vlact");
      const add = el("button", "vbtn add"); add.appendChild(icon("mdi:plus"));
      add.title = this.T("vac_add_blk");
      add.onclick = () => {
        const last = mine[mine.length - 1];
        const dur = last ? Math.max(20, last.end_min - last.start_min) : Math.round(night * 0.3);
        let s = last ? last.end_min + 10 : 0;
        if (s + dur > night) s = Math.max(0, night - dur);
        n.plan = [...(n.plan || []),
          { eid, start_min: Math.round(s), end_min: Math.round(Math.min(night, s + dur)) }];
        this._save();
        this._renderNightTimeline(this._nightHost);
      };
      const del = el("button", "vbtn del"); del.appendChild(icon("mdi:minus"));
      del.title = this.T("vac_del_blk");
      del.onclick = () => {
        const plan = n.plan || [];
        let idx = -1;
        for (let i = 0; i < plan.length; i++) if (plan[i].eid === eid) idx = i;
        if (idx < 0) return;
        plan.splice(idx, 1);
        this._save();
        this._renderNightTimeline(this._nightHost);
      };
      acts.appendChild(add); acts.appendChild(del);
      lane.appendChild(acts);
      host.appendChild(lane);
    }
    host.appendChild(el("div", "hint", esc(this.T("nl_edit_hint"))));
  }

  /* Işık listesi değişince eksik blokları tamamla (varsayılan: tüm gece). */
  async _ensureNightPlan(host) {
    host.textContent = "";
    host.appendChild(el("div", "empty", "…"));
    const n = this._cfg.night_lights;
    if (!Array.isArray(n.plan)) n.plan = [];
    let plan;
    try {
      const r = await this._hass.callApi("POST", "sentinel_alarm/action", { action: "vacation_plan" });
      plan = r && r.plan;
    } catch (e) { host.textContent = ""; host.appendChild(el("div", "empty", String(e))); return; }
    const night = (plan && plan.night_min) || 660;
    this._nightCtx = { sunset: plan && plan.sunset, sunrise: plan && plan.sunrise, night };
    // Listeden çıkarılan ışıkların blokları gitsin, yeni eklenenler tüm gece.
    const have = new Set(n.lights);
    n.plan = n.plan.filter((b) => have.has(b.eid));
    let changed = false;
    for (const eid of n.lights) {
      if (!n.plan.some((b) => b.eid === eid)) {
        n.plan.push({ eid, start_min: 0, end_min: night });
        changed = true;
      }
    }
    if (changed) this._save();
    this._renderNightTimeline(host);
  }

  _renderVacTimeline(host) {
    host.textContent = "";
    this._vacHost = host;
    const ctx = this._vacCtx || { night: 660 };
    const night = ctx.night || 660;
    const blocks = this._cfg.vacation_cfg.sim_plan || [];
    const ROOM_COL = {
      living: "#ffb86b", kitchen: "#ff8fb3", bedroom: "#9d8cff",
      office: "#5fd0e3", bath: "#8fd6a0", hall: "#b58cff", dawn: "#ffd27a", other: "#b0a8e6",
    };
    const hhmm = (iso) => { const t = (iso || "").split("T")[1] || ""; return t.slice(0, 5); };

    const axis = el("div", "vax");
    axis.appendChild(el("span", "vsun", "☾ " + hhmm(ctx.sunset) + " " + this.T("vac_sunset")));
    axis.appendChild(el("span", "vsun r", hhmm(ctx.sunrise) + " " + this.T("vac_sunrise") + " ☀"));
    host.appendChild(axis);

    // ışık sırası sim_lights'a göre sabit kalsın
    const order = this._cfg.vacation_cfg.sim_lights || [];
    for (const eid of order) {
      const mine = blocks.filter((b) => b.eid === eid);
      const lane = el("div", "vlane");
      const label = el("div", "vlbl");
      label.appendChild(icon(this._entIcon(eid)));
      label.appendChild(el("span", null, esc(this._name(eid))));
      lane.appendChild(label);
      const track = el("div", "vtrack");
      for (const b of mine) {
        const col = ROOM_COL[b.room] || ROOM_COL.other;
        const seg = el("div", "vseg");
        seg.style.left = (b.start_min / night * 100) + "%";
        seg.style.width = Math.max(1.2, (b.end_min - b.start_min) / night * 100) + "%";
        seg.style.background = col + "33";
        seg.style.borderColor = col + "88";
        const cap = el("span", "vcap", this._minClock(b.start_min));
        cap.style.color = col;
        seg.appendChild(cap);
        seg.appendChild(el("span", "vh l"));
        seg.appendChild(el("span", "vh r"));
        this._segEdit(seg, cap, b, track, night);
        track.appendChild(seg);
      }
      lane.appendChild(track);
      // en sonda + / − : kopya ekle / son bloğu sil
      const acts = el("div", "vlact");
      const add = el("button", "vbtn add"); add.appendChild(icon("mdi:plus"));
      add.title = this.T("vac_add_blk");
      add.onclick = () => this._vacAddBlock(eid);
      const del = el("button", "vbtn del"); del.appendChild(icon("mdi:minus"));
      del.title = this.T("vac_del_blk");
      del.onclick = () => this._vacDelBlock(eid);
      acts.appendChild(add); acts.appendChild(del);
      lane.appendChild(acts);
      host.appendChild(lane);
    }
    host.appendChild(el("div", "hint", esc(this.T("vac_edit_hint"))));
  }

  _vacAddBlock(eid) {
    const vc = this._cfg.vacation_cfg;
    const night = (this._vacCtx && this._vacCtx.night) || 660;
    const mine = (vc.sim_plan || []).filter((b) => b.eid === eid);
    let nb;
    if (mine.length) {
      const last = mine[mine.length - 1];
      const dur = Math.max(20, last.end_min - last.start_min);
      let s = last.end_min + 10;
      if (s + dur > night) s = Math.max(0, Math.round(night * 0.3));
      nb = { eid, start_min: Math.round(s), end_min: Math.round(Math.min(night, s + dur)),
             room: last.room, label: last.label };
    } else {
      nb = { eid, start_min: Math.round(night * 0.3), end_min: Math.round(night * 0.5),
             room: "other", label: "ek" };
    }
    vc.sim_plan = [...(vc.sim_plan || []), nb];
    this._save();
    this._renderVacTimeline(this._vacHost);
  }

  _vacDelBlock(eid) {
    const vc = this._cfg.vacation_cfg;
    const plan = vc.sim_plan || [];
    let idx = -1;
    for (let i = 0; i < plan.length; i++) if (plan[i].eid === eid) idx = i;
    if (idx < 0) return;
    plan.splice(idx, 1);
    this._save();
    this._renderVacTimeline(this._vacHost);
  }

  // Blok sürükle (taşı) / kenar çek (uzat) — dokunmatik + fare.
  _segEdit(seg, cap, block, track, night, ctx) {
    const down = (e, mode) => {
      e.preventDefault(); e.stopPropagation();
      const perMin = track.getBoundingClientRect().width / night;
      const startX = e.clientX, s0 = block.start_min, e0 = block.end_min, dur = e0 - s0;
      seg.classList.add("drag");
      const move = (ev) => {
        const d = Math.round((ev.clientX - startX) / perMin);
        let s = s0, en = e0;
        if (mode === "move") { s = Math.max(0, Math.min(night - dur, s0 + d)); en = s + dur; }
        else if (mode === "l") { s = Math.max(0, Math.min(e0 - 5, s0 + d)); en = e0; }
        else { en = Math.max(s0 + 5, Math.min(night, e0 + d)); s = s0; }
        block.start_min = Math.round(s); block.end_min = Math.round(en);
        seg.style.left = (block.start_min / night * 100) + "%";
        seg.style.width = Math.max(1.2, (block.end_min - block.start_min) / night * 100) + "%";
        cap.textContent = this._minClock(block.start_min, ctx);
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        seg.classList.remove("drag");
        this._save();
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };
    seg.addEventListener("pointerdown", (e) => {
      if (!e.target.classList.contains("vh")) down(e, "move");
    });
    seg.querySelector(".vh.l").addEventListener("pointerdown", (e) => down(e, "l"));
    seg.querySelector(".vh.r").addEventListener("pointerdown", (e) => down(e, "r"));
  }

  /* ============================================================ MODLAR */
  _pageModes(root) {
    this._stageHead(root, this.T("modes_h"), esc(this.T("modes_m")));
    const wrap = el("div", "secwrap");

    for (const m of MODES) {
      const cfg = this._cfg.modes[m.key];
      const sec = this._sec(wrap, this.T(m.tk), (this._cfg.assign[m.key] || []).length,
        { zone: true, color: m.col, icon: m.icon, sub: this.T(m.sk) });
      sec.appendChild(this._row(this.T("exit_delay"), this.T("exit_s"),
        this._slider(cfg.exit, 0, 180, 5, (v) => { cfg.exit = v; this._save(); }, (v) => this._fmtSecs(v))));
      sec.appendChild(this._row(this.T("entry_delay"), this.T("entry_s"),
        this._slider(cfg.entry, 0, 180, 5, (v) => { cfg.entry = v; this._save(); }, (v) => this._fmtSecs(v))));
      sec.appendChild(this._row(this.T("trigger_time"), this.T("trigger_s"),
        this._slider(cfg.trigger, 30, 900, 15, (v) => { cfg.trigger = v; this._save(); }, (v) => this._fmtSecs(v))));
    }

    /* tatil ekstralari */
    const vs = this._sec(wrap, this.T("vac_h"), null, { zone: true, color: "#ffb86b", icon: "mdi:palm-tree" });
    vs.appendChild(el("div", "grp-h", `<span class="gn">${esc(this.T("bypass_t"))}</span>`));
    vs.appendChild(el("div", "empty", esc(this.T("bypass_s"))));
    vs.appendChild(this._chipList(this._cfg.vacation_cfg.bypass, "any", this.T("add_bypass"), "mdi:cancel"));

    const sh = el("div", "grp-h");
    sh.style.marginTop = "20px";
    sh.appendChild(el("span", "gn", esc(this.T("sim_t"))));
    vs.appendChild(sh);
    vs.appendChild(el("div", "empty", esc(this.T("sim_s"))));
    const simBox = el("div");
    simBox.style.marginTop = "10px";
    for (const item of this._cfg.vacation_cfg.sim) {
      const r = el("div", "simrow");
      r.appendChild(icon("mdi:lightbulb-on-outline"));
      r.appendChild(el("span", "sn", esc(this._name(item.entity))));
      const on = document.createElement("input"); on.type = "time"; on.value = item.on || "19:30";
      on.onchange = () => { item.on = on.value; this._save(); };
      const off = document.createElement("input"); off.type = "time"; off.value = item.off || "23:00";
      off.onchange = () => { item.off = off.value; this._save(); };
      r.appendChild(on);
      r.appendChild(el("span", null, "→"));
      r.appendChild(off);
      r.appendChild(el("span", null, `<span style="font-size:11px;color:#6f6675">± ${esc(this.T("jitter"))}</span>`));
      const j = document.createElement("input"); j.type = "number"; j.min = "0"; j.max = "60";
      j.value = item.jitter === undefined ? 15 : item.jitter;
      j.onchange = () => { item.jitter = Number(j.value) || 0; this._save(); };
      r.appendChild(j);
      const x = el("button", "x", "×");
      x.onclick = () => {
        this._cfg.vacation_cfg.sim = this._cfg.vacation_cfg.sim.filter((s) => s !== item);
        this._save(); this._renderStage();
      };
      r.appendChild(x);
      simBox.appendChild(r);
    }
    const add = el("button", "addsec");
    add.style.marginLeft = "0";
    add.appendChild(icon("mdi:plus"));
    add.appendChild(el("span", null, esc(this.T("sim_add"))));
    add.onclick = () => this._pickEntity("light", (eid) => {
      this._cfg.vacation_cfg.sim.push({ entity: eid, on: "19:30", off: "23:00", jitter: 15, id: uid() });
      this._save(); this._renderStage();
    });
    simBox.appendChild(add);
    vs.appendChild(simBox);

    /* ev kurallari */
    const cs = this._sec(wrap, this.T("common_h"), null, { icon: "mdi:sync" });
    for (const [key, tk, sk] of [
      ["restore", "restore_t", "restore_s"],
      ["warn_on_blocked", "warn_t", "warn_s"],
      ["unavail_watch", "guard_t", "guard_s"],
      ["light_guard", "lguard_t", "lguard_s"],
    ]) {
      cs.appendChild(this._row(this.T(tk), this.T(sk),
        this._toggle(this._cfg[key], (v) => { this._cfg[key] = v; this._save(); })));
    }
    root.appendChild(wrap);
  }

  /* ------------------------------------------------------------- eylemler */
  _newStep(type) {
    const base = { id: uid(), type };
    if (type === "light") return Object.assign(base, { entities: [], flash_entities: [],
      state: "on", brightness: 100, color: null, stagger: 0,
      flash: 0, flash_interval: 0.6, after: "keep", after_scene: "" });
    if (type === "wait") return Object.assign(base, { seconds: 3 });
    if (type === "tts") return Object.assign(base, { message: "", entities: [], engine: "", wait: true });
    if (type === "beep") return Object.assign(base, { sound: "arm_beep_soft", entities: [],
      seconds: 10, interval: 1, fast_last: 0, volume: null, volume_after: null });
    if (type === "media") return Object.assign(base, { entities: [], media: "", volume: null,
      say: "", engine: "", wait: false });
    if (type === "power") return Object.assign(base, { entities: [], state: "off", stagger: 0 });
    if (type === "switch") return Object.assign(base, { entities: [], state: "on" });
    if (type === "cover") return Object.assign(base, { entities: [], state: "close" });
    if (type === "lock") return Object.assign(base, { entities: [], state: "lock" });
    if (type === "scene" || type === "script") return Object.assign(base, { entities: [] });
    if (type === "notify") return Object.assign(base, {
      msg_format: "alert", message: "", camera_mode: "room", cameras: [], notify: [],
      critical: true,
      include: { room: true, sensor: true, time: true, mode: false, open: false },
    });
    return base;
  }

  _actMeta(type) { return ACT_TYPES.find((a) => a.key === type) || ACT_TYPES[0]; }

  _stepSummary(step) {
    const names = (step.entities || []).map((e) => this._name(e));
    const list = names.length > 2
      ? `${names.slice(0, 2).join(", ")} +${names.length - 2}`
      : names.join(", ");
    switch (step.type) {
      case "light": {
        const flashers = (step.flash_entities || []).length;
        const bits = [this.T(step.state === "off" ? "f_off" : "f_on")];
        if (step.state !== "off") {
          if (step.color) bits.push("■");
          if (step.brightness != null) bits.push(`%${step.brightness}`);
          if (flashers && step.flash > 0)
            bits.push(`⚡${flashers}×${step.flash}${this.T("sec_u")}`);
        }
        if (step.stagger > 0) bits.push(`+${step.stagger}${this.T("sec_u")}`);
        const total = names.length + flashers;
        const head = names.length ? list : `${total} ${this.T("devices")}`;
        return `${total ? head : "—"} · ${bits.join(" ")}`;
      }
      case "wait": return `${step.seconds || 0} ${this.T("sec_u")}`;
      case "beep": {
        const who = names.length ? ` → ${list}` : "";
        const snd = (step.sound || "").replace("arm_beep_", "");
        return `${snd} · ${step.seconds || 0}${this.T("sec_u")} / ${step.interval || 1}${this.T("sec_u")}${who}`;
      }
      case "tts": {
        const who = names.length ? ` → ${list}` : "";
        return (step.message ? `“${step.message}”` : "—") + who;
      }
      case "notify": {
        const fmt = step.msg_format || (step.message ? "custom" : "alert");
        const head = fmt === "custom"
          ? (step.message ? `“${step.message}”` : "—")
          : this.T("fmt_" + fmt);
        const camWord = { room: "📷 " + this.T("cam_room"), pick: "📷 " + (step.cameras || []).length,
          none: "" }[step.camera_mode || (step.camera ? "room" : "none")] || "";
        const bits = [head];
        if (camWord) bits.push(camWord);
        if (step.critical !== false) bits.push("🔔 " + this.T("ns_crit"));
        return bits.join(" · ");
      }
      case "media": {
        const who = names.length ? list : this.T("f_default_pl");
        const head = step.say ? `“${step.say}” + ` : "";
        return `${head}${step.media || "—"} → ${who}`;
      }
      case "power": return `${list || "—"} · ${this.T(step.state === "on" ? "f_on" : "f_off")}`;
      case "switch": return `${list || "—"} · ${this.T(step.state === "off" ? "f_off" : "f_on")}`;
      case "cover": return `${list || "—"} · ${this.T(step.state === "open" ? "f_open" : "f_close")}`;
      case "lock": return `${list || "—"} · ${this.T(step.state === "unlock" ? "f_unlock" : "f_lock2")}`;
      default: return list || "—";
    }
  }

  /* Bu adım kabaca kaç saniye sürer? Sıradaki adımın ne zaman başlayacağını
     görebilmek için — konuşma süresi metnin uzunluğundan tahmin edilir. */
  _stepSeconds(step) {
    const speech = (s) => Math.min(30, Math.max(2, (s || "").length / 11 + 1.2));
    const lead = Number(step.delay) || 0;
    return lead + this._stepBody(step, speech);
  }

  _stepBody(step, speech) {
    switch (step.type) {
      case "wait": return Number(step.seconds) || 0;
      case "beep": return Number(step.seconds) || 0;
      case "tts": return step.wait === false ? 0 : speech(step.message);
      case "media": {
        let t = (step.say || "").trim() ? speech(step.say) : 0;
        if (step.wait) t += 10;            // dosya süresi bilinmiyor, kaba pay
        return t;
      }
      case "light": {
        const n = (step.entities || []).length;
        const stag = (Number(step.stagger) || 0) * Math.max(0, n - 1);
        return stag + (Number(step.flash) || 0);
      }
      default: return 0;
    }
  }

  /* İki adım arasındaki bağ. Tıklayınca sıralı <-> aynı anda arasında geçer;
     sıralıysa üstünde bekleme süresi de yazar. */
  _linkRow(evKey, steps, index) {
    const step = steps[index];
    const par = !!step.parallel;
    const wrap = el("div", "link" + (par ? " par" : ""));
    wrap.title = this.T("link_hint");

    const badge = el("span", "lk");
    badge.appendChild(icon(par ? "mdi:link-variant" : "mdi:arrow-down"));
    const delay = Number(step.delay) || 0;
    const label = par
      ? this.T("link_par")
      : (delay > 0 ? this.T("after_n").replace("{n}", delay) : this.T("link_seq"));
    badge.appendChild(el("span", null, esc(label)));
    wrap.appendChild(badge);

    wrap.onclick = () => {
      step.parallel = !par;
      this._save();
      this._renderStage();
    };
    return wrap;
  }

  _stepRow(evKey, step, index, total) {
    const meta = this._actMeta(step.type);
    const r = el("div", "step");
    r.appendChild(el("span", "sn", String(index + 1)));
    const ic = el("div", "si");
    ic.appendChild(icon(meta.icon));
    if (step.type === "light" && step.color)
      ic.style.color = `rgb(${step.color.join(",")})`;
    r.appendChild(ic);
    const b = el("div", "sb");
    const title = el("div", "st");
    title.appendChild(el("span", null, esc(this.T(meta.tk))));
    if (index > 0 && step.parallel) {
      const tag = el("span", "ptag");
      tag.appendChild(el("span", null, "∥ " + esc(this.T("par_tag"))));
      title.appendChild(tag);
    }
    const secs = Math.round(this._stepSeconds(step));
    if (secs > 0) title.appendChild(el("span", "dtag",
      esc(this.T("dur_about").replace("{n}", secs))));
    if (step.time_from && step.time_to) {
      const wt = el("span", "dtag wtag");
      wt.appendChild(icon("mdi:clock-outline"));
      wt.appendChild(el("span", null, esc(step.time_from + "–" + step.time_to)));
      title.appendChild(wt);
    }

    // Şu an çalışıyor mu? Yoksa geçen sefer kaç sürmüştü?
    const pr = this._progress || {};
    const live = pr.running && pr.key === evKey &&
      index >= pr.index && index < pr.index + (pr.batch || 1);
    if (live) {
      r.classList.add("live");
      title.appendChild(el("span", "ltag",
        `▶ ${esc(this.T("run_step"))} ${pr.step_elapsed != null ? pr.step_elapsed + this.T("sec_u") : ""}`));
    } else if (this._lastRun && this._lastRun.key === evKey) {
      const hit = (this._lastRun.steps || []).find((s) => s.index === index);
      if (hit) title.appendChild(el("span", "dtag ok",
        esc(this.T("took").replace("{n}", hit.seconds))));
    }
    b.appendChild(title);
    b.appendChild(el("div", "ss", esc(this._stepSummary(step))));
    r.appendChild(b);

    const move = (dir) => {
      const arr = this._cfg.actions[evKey];
      const j = index + dir;
      if (j < 0 || j >= arr.length) return;
      arr.splice(j, 0, arr.splice(index, 1)[0]);
      this._save();
      this._renderStage();
    };
    const mk = (mdi, title, fn, disabled) => {
      const bt = el("button", "sa");
      bt.appendChild(icon(mdi));
      bt.title = title;
      if (disabled) bt.disabled = true;
      else bt.onclick = fn;
      return bt;
    };
    r.appendChild(mk("mdi:chevron-up", this.T("act_up"), () => move(-1), index === 0));
    r.appendChild(mk("mdi:chevron-down", this.T("act_down"), () => move(1), index === total - 1));
    r.appendChild(mk("mdi:play-outline", this.T("step_test"),
      () => this._action({ action: "run_steps", steps: [step] })));
    r.appendChild(mk("mdi:pencil-outline", this.T("act_edit"), () => this._editStep(evKey, step, index)));
    r.appendChild(mk("mdi:trash-can-outline", this.T("del"), () => {
      this._cfg.actions[evKey].splice(index, 1);
      this._save();
      this._renderStage();
    }));
    return r;
  }

  _pickActionType(onPick) {
    this._overlay(this.T("act_pick"), (list, q, close) => {
      list.textContent = "";
      for (const a of ACT_TYPES) {
        const r = el("div", "pk");
        r.appendChild(icon(a.icon));
        const b = el("div", "n");
        b.appendChild(el("div", null, esc(this.T(a.tk))));
        b.appendChild(el("div", "e", esc(this.T(a.sk))));
        r.appendChild(b);
        r.onclick = () => { close(); onPick(a.key); };
        list.appendChild(r);
      }
    }, true);
  }

  /* index < 0 -> yeni adim */
  _editStep(evKey, step, index) {
    const prev = this.shadowRoot.querySelector(".ov.editor");
    if (prev) prev.remove();
    const meta = this._actMeta(step.type);
    const draft = JSON.parse(JSON.stringify(step));

    const ov = el("div", "ov editor");
    const ed = el("div", "ed");
    ed.style.maxWidth = "560px";
    ed.appendChild(el("div", "ed-t", esc(index < 0 ? this.T("act_new") : this.T("act_edit"))));
    ed.appendChild(el("div", "ed-s", `${esc(this.T(meta.tk))} — ${esc(this.T(meta.sk))}`));
    const body = el("div");
    ed.appendChild(body);

    const lab = (t, s) => el("div", "ed-lab", `<b>${esc(t)}</b>${s ? esc(s) : ""}`);

    const paint = () => {
      body.textContent = "";

      if (draft.type === "light") {
        if (!Array.isArray(draft.flash_entities)) draft.flash_entities = [];
        // eski/geçersiz hızları kullanılabilir aralığa çek
        draft.flash_interval = Math.min(2, Math.max(0.2, Number(draft.flash_interval) || 0.6));
        // "eski haline dön" kaldırıldı; eski adımlar renkte kalsın olarak açılır
        if (!["scene", "off", "keep"].includes(draft.after)) draft.after = "keep";
        // flash süresi artık 15'in katları
        if (draft.flash) draft.flash = Math.min(90, Math.round(draft.flash / 15) * 15);
        body.appendChild(this._bucket(draft, "entities", "flash_entities",
          this.T("f_steady"), this.T("f_steady_s"), paint));
        body.appendChild(this._bucket(draft, "flash_entities", "entities",
          this.T("f_flashers"), this.T("f_flashers_s"), paint));
      } else if (meta.dom) {
        body.appendChild(lab(this.T("f_targets")));
        body.appendChild(this._chipsLocal(draft.entities, meta.dom, paint));
      }

      if (draft.type === "light") {
        body.appendChild(this._row(this.T("f_stagger"), this.T("f_stagger_s"),
          this._slider((draft.stagger || 0) * 10, 0, 50, 1,
            (v) => { draft.stagger = v / 10; },
            (v) => (v === 0 ? this.T("f_together") : `${(v / 10).toFixed(1)} ${this.T("sec_u")}`))));

        body.appendChild(lab(this.T("f_state")));
        body.appendChild(this._segment([
          ["on", this.T("f_on")], ["off", this.T("f_off")],
        ], draft.state, (v) => { draft.state = v; paint(); }));

        if (draft.state !== "off") {
          body.appendChild(lab(this.T("f_colour"), this.T("f_colour_note")));
          body.appendChild(this._colorRow(draft.color, (c) => { draft.color = c; paint(); }));
          body.appendChild(lab(this.T("f_bright")));
          body.appendChild(this._slider(draft.brightness == null ? 100 : draft.brightness, 1, 100, 1,
            (v) => { draft.brightness = v; }, (v) => `%${v}`));
          if (draft.flash_entities.length) {
            // 15 sn'lik adımlar: kendi yanıp sönen ışıklar zaten bloklar hâlinde
            // çalışıyor, arada kalan süre sonda bekleme olarak geri geliyordu.
            body.appendChild(this._row(this.T("f_flash"), this.T("f_flash_s2"),
              this._slider(draft.flash || 0, 0, 90, 15, (v) => { draft.flash = v; paint(); },
                (v) => (v === 0 ? this.T("f_flash_off") : `${v} ${this.T("sec_u")}`))));
            if (draft.flash > 0) {
              body.appendChild(el("div", "capnote", esc(this.T("f_flash_blk"))));
            }
          }
          const dimCount = draft.flash_entities.filter(
            (e) => this._flashKind(e) === "dim").length;
          if (draft.flash_entities.length && draft.flash > 0 && dimCount) {
            // Slider sağa gittikçe HIZLANSIN — saniye küçülür. Ters çevirmezsek
            // "daha çok" sanıp sağa çekiyorsun ve flash yavaşlıyor.
            const LO = 2, HI = 20;               // 0.2 sn ... 2.0 sn
            const toSlider = (sec) => LO + HI - Math.round(sec * 10);
            const toSec = (v) => (LO + HI - v) / 10;
            const speedWord = (sec) => sec <= 0.4 ? this.T("spd_fast")
              : sec <= 0.8 ? this.T("spd_quick")
              : sec <= 1.4 ? this.T("spd_normal") : this.T("spd_slow");
            body.appendChild(this._row(this.T("f_flash_iv"), this.T("f_flash_iv_s"),
              this._slider(toSlider(draft.flash_interval || 0.6), LO, HI, 1,
                (v) => { draft.flash_interval = toSec(v); },
                (v) => `${toSec(v).toFixed(1)}${this.T("sec_u")} · ${speedWord(toSec(v))}`)));
            body.appendChild(el("div", "capnote",
              esc(this.T("dim_only_note").replace("{n}", dimCount))));

            // Karartmayla yananlar köprüyü yorar; kendi yanıp sönenler yormaz.
            let bulbs = 0;
            for (const e of draft.flash_entities) {
              if (this._flashKind(e) !== "dim") continue;
              const st = this._hass.states[e];
              const m = st && st.attributes ? st.attributes.entity_id : null;
              bulbs += Array.isArray(m) && m.length ? m.length : 1;
            }
            if (bulbs > 12) {
              const bw = el("div", "safenote warn");
              bw.appendChild(icon("mdi:speedometer-slow"));
              bw.appendChild(el("span", null, esc(this.T("bulbs_warn").replace("{n}", bulbs))));
              body.appendChild(bw);
            }

            const note = el("div", "safenote");
            note.appendChild(icon("mdi:shield-check-outline"));
            note.appendChild(el("span", null, esc(this.T("f_flash_safe"))));
            body.appendChild(note);
          }

          // "Flash bitince" HER flash adımında sorulur — hızı yalnızca
          // karartmalı ışıklar için soruyoruz diye bunu da gizlemeyelim.
          if (draft.flash_entities.length && draft.flash > 0) {
            body.appendChild(lab(this.T("f_after")));
            body.appendChild(this._segment([
              ["scene", this.T("f_after_scene")],
              ["off", this.T("f_after_off")],
              ["keep", this.T("f_after_keep")],
            ], draft.after || "keep", (v) => { draft.after = v; paint(); }));
            if (draft.after === "scene") {
              body.appendChild(lab(this.T("f_scene"), this.T("f_scene_s")));
              body.appendChild(this._entityPick(draft.after_scene, "scene",
                (v) => { draft.after_scene = v; paint(); }));
            }

            // Hiç flash yapamayan ışık varsa söyle.
            const stuck = draft.flash_entities.filter(
              (e) => this._flashKind(e) === "none");
            if (stuck.length) {
              const names = stuck.map((e) => this._name(e));
              const shown = names.length > 4
                ? `${names.slice(0, 4).join(", ")} +${names.length - 4}`
                : names.join(", ");
              const warn = el("div", "safenote warn");
              warn.appendChild(icon("mdi:alert-outline"));
              warn.appendChild(el("span", null, esc(
                this.T("f_flash_skip").replace("{n}", stuck.length).replace("{l}", shown))));
              body.appendChild(warn);
            }
          }
        }
      } else if (draft.type === "power") {
        body.appendChild(lab(this.T("f_state")));
        body.appendChild(this._segment([["off", this.T("f_off")], ["on", this.T("f_on")]],
          draft.state || "off", (v) => { draft.state = v; }));
        body.appendChild(this._row(this.T("f_stagger2"), this.T("f_stagger2_s"),
          this._slider((draft.stagger || 0) * 10, 0, 50, 1,
            (v) => { draft.stagger = v / 10; },
            (v) => (v === 0 ? this.T("f_together") : `${(v / 10).toFixed(1)} ${this.T("sec_u")}`))));
      } else if (draft.type === "switch") {
        body.appendChild(lab(this.T("f_state")));
        body.appendChild(this._segment([["on", this.T("f_on")], ["off", this.T("f_off")]],
          draft.state, (v) => { draft.state = v; }));
      } else if (draft.type === "cover") {
        body.appendChild(lab(this.T("f_state")));
        body.appendChild(this._segment([["open", this.T("f_open")], ["close", this.T("f_close")]],
          draft.state, (v) => { draft.state = v; }));
      } else if (draft.type === "lock") {
        body.appendChild(lab(this.T("f_state")));
        body.appendChild(this._segment([["lock", this.T("f_lock2")], ["unlock", this.T("f_unlock")]],
          draft.state, (v) => { draft.state = v; }));
      } else if (draft.type === "wait") {
        body.appendChild(lab(this.T("f_seconds")));
        body.appendChild(this._slider(draft.seconds || 3, 1, 120, 1,
          (v) => { draft.seconds = v; }, (v) => `${v} ${this.T("sec_u")}`));
      } else if (draft.type === "notify") {
        this._notifyStepEditor(body, draft, lab, paint);
      } else if (draft.type === "tts") {
        body.appendChild(lab(this.T("f_message")));
        const ta = document.createElement("textarea");
        ta.className = "ed-in";
        ta.rows = 3;
        ta.value = draft.message || "";
        ta.oninput = () => { draft.message = ta.value; };
        body.appendChild(ta);
        {
          body.appendChild(lab(this.T("f_engine"), this.T("f_engine_s")));
          body.appendChild(this._enginePick(draft.engine, (v) => { draft.engine = v; }));
          body.appendChild(lab(this.T("f_players"), this.T("f_players_s")));
          body.appendChild(this._chipsLocal(draft.entities, "media_player", paint));
          // Bu adıma özel ses: anons sırasında ve anonstan sonra.
          body.appendChild(this._row(this.T("f_svol"), this.T("f_svol_s"),
            this._slider(draft.volume == null ? -1 : draft.volume, -1, 100, 1,
              (v) => { draft.volume = v < 0 ? null : v; },
              (v) => (v < 0 ? this.T("f_svol_def") : `%${v}`))));
          body.appendChild(this._row(this.T("f_svol_after"), this.T("f_svol_after_s"),
            this._slider(draft.volume_after == null ? -1 : draft.volume_after, -1, 100, 1,
              (v) => { draft.volume_after = v < 0 ? null : v; },
              (v) => (v < 0 ? this.T("f_svol_back") : `%${v}`))));
          body.appendChild(this._row(this.T("f_wait"), this.T("f_wait_s"),
            this._toggle(draft.wait !== false, (v) => { draft.wait = v; })));
        }
      } else if (draft.type === "beep") {
        body.appendChild(lab(this.T("f_beep_sound")));
        const bw = el("div", "chips");
        const bsel = document.createElement("select");
        bsel.className = "nsel";
        for (const b of BEEP_SOUNDS) {
          const o = document.createElement("option");
          o.value = b; o.textContent = b.replace("arm_beep_", "");
          if ((draft.sound || "arm_beep_soft") === b) o.selected = true;
          bsel.appendChild(o);
        }
        bsel.onchange = () => { draft.sound = bsel.value; };
        bw.appendChild(bsel);
        const bt = el("span", "chip add");
        bt.appendChild(icon("mdi:play")); bt.appendChild(el("span", null, esc(this.T("beep_test"))));
        bt.onclick = () => {
          const spk = (draft.entities || []).filter(Boolean);
          if (!spk.length) { this._flash(this.T("beep_nospk"), true); return; }
          this._action({ action: "run_steps", steps: [{ type: "media",
            entities: spk, media: `/local/sentinel/${bsel.value}.mp3` }] });
        };
        bw.appendChild(bt);
        body.appendChild(bw);
        body.appendChild(lab(this.T("f_players"), this.T("f_players_s")));
        body.appendChild(this._chipsLocal(draft.entities, "media_player", paint));
        body.appendChild(this._row(this.T("f_beep_secs"), this.T("f_beep_secs_s"),
          this._slider(draft.seconds || 10, 1, 180, 1, (v) => { draft.seconds = v; },
            (v) => `${v} ${this.T("sec_u")}`)));
        body.appendChild(this._row(this.T("f_beep_iv"), this.T("f_beep_iv_s"),
          this._slider(Math.round((draft.interval || 1) * 10), 2, 30, 1,
            (v) => { draft.interval = v / 10; },
            (v) => `${(v / 10).toFixed(1)} ${this.T("sec_u")}`)));
        body.appendChild(this._row(this.T("beep_fast"), this.T("beep_fast_s"),
          this._slider(draft.fast_last || 0, 0, 30, 1, (v) => { draft.fast_last = v; },
            (v) => (v === 0 ? this.T("f_ttsvol_off") : `${v} ${this.T("sec_u")}`))));
        body.appendChild(this._row(this.T("f_svol"), this.T("f_svol_s"),
          this._slider(draft.volume == null ? -1 : draft.volume, -1, 100, 1,
            (v) => { draft.volume = v < 0 ? null : v; },
            (v) => (v < 0 ? this.T("f_svol_def") : `%${v}`))));
        body.appendChild(this._row(this.T("f_svol_after"), this.T("f_svol_after_s"),
          this._slider(draft.volume_after == null ? -1 : draft.volume_after, -1, 100, 1,
            (v) => { draft.volume_after = v < 0 ? null : v; },
            (v) => (v < 0 ? this.T("f_svol_back") : `%${v}`))));
      } else if (draft.type === "media") {  // eslint-disable-line
        body.appendChild(lab(this.T("f_media_url")));
        body.appendChild(this._mediaDrop(draft, paint));
        body.appendChild(lab(this.T("f_players"), this.T("f_players_s")));
        body.appendChild(this._chipsLocal(draft.entities, "media_player", paint));
        body.appendChild(lab(this.T("f_say"), this.T("f_say_s")));
        const say = document.createElement("textarea");
        say.className = "ed-in";
        say.rows = 2;
        say.value = draft.say || "";
        say.oninput = () => { draft.say = say.value; };
        body.appendChild(say);
        if ((draft.say || "").trim()) {
          body.appendChild(lab(this.T("f_engine"), this.T("f_engine_s")));
          body.appendChild(this._enginePick(draft.engine, (v) => { draft.engine = v; }));
        }
        body.appendChild(this._row(this.T("f_wait"), this.T("f_wait_s"),
          this._toggle(!!draft.wait, (v) => { draft.wait = v; })));
      }

      // Her adım kendi gecikmesini taşıyabilir — sahne ya da ışık kapatmayı
      // birkaç saniye geciktirmek için ayrı "bekle" adımı gerekmesin.
      if (draft.type !== "wait") {
        body.appendChild(this._row(this.T("f_delay"), this.T("f_delay_s"),
          this._slider(draft.delay || 0, 0, 120, 1, (v) => { draft.delay = v; },
            (v) => (v === 0 ? this.T("f_nodelay") : `${v} ${this.T("sec_u")}`))));
      }

      // Saat penceresi — bu adım sadece belirli saatler arasında çalışsın.
      const hasWin = !!(draft.time_from && draft.time_to);
      body.appendChild(this._row(this.T("f_window"), this.T("f_window_s"),
        this._toggle(hasWin, (v) => {
          if (v) { draft.time_from = draft.time_from || "08:00"; draft.time_to = draft.time_to || "23:00"; }
          else { draft.time_from = ""; draft.time_to = ""; }
          paint();
        })));
      if (draft.time_from && draft.time_to) {
        const w = el("div", "twin");
        const mk = (val, on) => {
          const inp = document.createElement("input");
          inp.type = "time"; inp.value = val;
          inp.onchange = () => on(inp.value);
          return inp;
        };
        w.appendChild(mk(draft.time_from, (v) => { draft.time_from = v; }));
        w.appendChild(el("span", "twsep", "→"));
        w.appendChild(mk(draft.time_to, (v) => { draft.time_to = v; }));
        body.appendChild(this._row(this.T("f_window_h"), this.T("f_window_h_s"), w));
      }

      // İlk adım hariç: öncekiyle aynı anda mı başlasın?
      if (index !== 0) {
        body.appendChild(this._row(this.T("par_t"), this.T("par_s"),
          this._toggle(!!draft.parallel, (v) => { draft.parallel = v; })));
      }
    };
    paint();

    const foot = el("div", "ed-foot");
    const ok = el("button", "btn", esc(this.T("save")));
    ok.onclick = () => {
      const picked = (draft.entities || []).length +
        (draft.type === "light" ? (draft.flash_entities || []).length : 0);
      if (meta.dom && !picked) { this._flash(this.T("pick_some"), true); return; }
      const arr = this._cfg.actions[evKey];
      if (index < 0) arr.push(draft); else arr[index] = draft;
      this._save();
      ov.remove();
      this._renderStage();
    };
    const no = el("button", "btn ghost", esc(this.T("cancel")));
    no.onclick = () => ov.remove();
    foot.appendChild(ok);
    foot.appendChild(no);
    ed.appendChild(foot);

    ov.onclick = (ev) => { if (ev.target === ov) ov.remove(); };
    ov.appendChild(ed);
    this.shadowRoot.appendChild(ov);
  }

  /* Işık kovası: kendi listesi + diğer kovadan sürükleyip bırakabilirsin. */
  _bucket(draft, key, otherKey, title, sub, repaint) {
    const arr = draft[key];
    const other = draft[otherKey];
    const wrap = el("div", "bucket");
    const head = el("div", "bk-h");
    head.appendChild(el("b", null, esc(title)));
    head.appendChild(el("span", "bk-c", String(arr.length)));
    head.appendChild(el("small", null, esc(sub)));
    wrap.appendChild(head);

    const box = el("div", "chips");
    for (const eid of arr) {
      const c = el("span", "chip");
      c.draggable = true;
      c.ondragstart = (ev) => {
        ev.dataTransfer.setData("text/plain", `${key}|${eid}`);
        ev.dataTransfer.effectAllowed = "move";
        c.classList.add("dragging");
      };
      c.ondragend = () => c.classList.remove("dragging");
      c.appendChild(icon(this._entIcon(eid)));
      c.appendChild(el("span", null, esc(this._name(eid))));
      if (this._isLightGroup(eid)) c.appendChild(el("span", "gtag", esc(this.T("grp_tag"))));
      // Flash kutusunda her ışığın ne yapabildiği görünsün.
      if (key === "flash_entities") {
        const k = this._flashKind(eid);
        const cap = el("span", "captag " + k);
        cap.title = this.T("cap_" + k);
        cap.appendChild(el("span", null, k === "native" ? "⚡" : (k === "dim" ? "◐" : "✕")));
        c.appendChild(cap);
      }
      const x = el("button", "x", "×");
      x.onclick = () => { arr.splice(arr.indexOf(eid), 1); repaint(); };
      c.appendChild(x);
      box.appendChild(c);
    }
    if (!arr.length) box.appendChild(el("span", "bk-empty", esc(this.T("f_bucket_drop"))));

    const add = el("span", "chip add");
    add.appendChild(icon("mdi:plus"));
    add.appendChild(el("span", null, esc(this.T("f_add_dev"))));
    add.onclick = () => this._pickEntity("light", (eid) => {
      if (!arr.includes(eid)) arr.push(eid);
      const i = other.indexOf(eid);
      if (i >= 0) other.splice(i, 1);
      repaint();
    });
    box.appendChild(add);

    const addRoom = el("span", "chip add");
    addRoom.appendChild(icon("mdi:floor-plan"));
    addRoom.appendChild(el("span", null, esc(this.T("f_add_room"))));
    addRoom.onclick = () => this._pickFromRoom("light", (eids) => {
      for (const eid of eids) {
        if (!arr.includes(eid)) arr.push(eid);
        const i = other.indexOf(eid);
        if (i >= 0) other.splice(i, 1);
      }
      repaint();
    });
    // Flash kutusu: "otomatik bul" — yetenekleri HA'ya sordurup dağıtır.
    if (key === "flash_entities") {
      const auto = el("span", "chip add auto");
      auto.appendChild(icon("mdi:auto-fix"));
      auto.appendChild(el("span", null, esc(this.T("auto_find"))));
      auto.onclick = () => this._autoFind(draft, repaint);
      box.appendChild(auto);
    }

    box.appendChild(addRoom);
    wrap.appendChild(box);

    // Bu kutudakiler flash'ı nasıl yapacak? Tek bakışta özet.
    if (key === "flash_entities" && arr.length) {
      const c = { native: 0, dim: 0, none: 0 };
      for (const e of arr) c[this._flashKind(e)]++;
      const sum = el("div", "capsum");
      sum.appendChild(el("span", "captag native", "⚡ " + c.native));
      sum.appendChild(el("span", "captag dim", "◐ " + c.dim));
      sum.appendChild(el("span", "captag none", "✕ " + c.none));
      sum.appendChild(el("span", "capnote", esc(this.T("cap_sum")
        .replace("{a}", c.native).replace("{b}", c.dim).replace("{c}", c.none))));
      wrap.appendChild(sum);
    }

    // Yalnızca GERÇEK çakışma varsa uyar: seçilen bir grubun üyesi olan ışık
    // ayrıca tek tek de seçilmişse, o ışığa her komut iki kez gider.
    const covered = new Set();
    for (const g of arr) {
      if (!this._isLightGroup(g)) continue;
      const st = this._hass.states[g];
      for (const m of (st.attributes.entity_id || [])) covered.add(m);
    }
    const dupes = arr.filter((e) => !this._isLightGroup(e) && covered.has(e));
    if (dupes.length) {
      const names = dupes.map((e) => this._name(e));
      const shown = names.length > 3
        ? `${names.slice(0, 3).join(", ")} +${names.length - 3}`
        : names.join(", ");
      const n = el("div", "safenote");
      n.appendChild(icon("mdi:information-outline"));
      const txt = el("span");
      txt.appendChild(el("span", null, esc(
        this.T("grp_note").replace("{n}", dupes.length).replace("{l}", shown))));
      const fix = el("button", "linkbtn", esc(this.T("grp_fix")));
      fix.style.marginLeft = "8px";
      fix.onclick = () => {
        for (const e of dupes) {
          const i = arr.indexOf(e);
          if (i >= 0) arr.splice(i, 1);
        }
        repaint();
      };
      txt.appendChild(fix);
      n.appendChild(txt);
      wrap.appendChild(n);
    }

    wrap.ondragover = (ev) => { ev.preventDefault(); ev.dataTransfer.dropEffect = "move"; wrap.classList.add("dropok"); };
    wrap.ondragleave = (ev) => { if (!wrap.contains(ev.relatedTarget)) wrap.classList.remove("dropok"); };
    wrap.ondrop = (ev) => {
      ev.preventDefault();
      wrap.classList.remove("dropok");
      const raw = ev.dataTransfer.getData("text/plain") || "";
      const [from, eid] = raw.split("|");
      if (!eid || from === key) return;
      const src = draft[from];
      if (Array.isArray(src)) {
        const i = src.indexOf(eid);
        if (i >= 0) src.splice(i, 1);
      }
      if (!arr.includes(eid)) arr.push(eid);
      repaint();
    };
    return wrap;
  }

  /* "Otomatik bul": yetenekleri HA söylüyor, biz sadece dağıtıyoruz.
     Üç iş de isteğe bağlı — hiçbiri kendiliğinden olmaz. */
  _autoFind(draft, repaint) {
    const flash = draft.flash_entities;
    const steady = draft.entities;

    const fromSteady = steady.filter((e) => this._flashKind(e) === "native");
    const stuck = flash.filter((e) => this._flashKind(e) === "none");
    const house = [];
    for (const eid of Object.keys(this._hass.states || {})) {
      if (!eid.startsWith("light.")) continue;
      if (flash.includes(eid) || steady.includes(eid)) continue;
      if (this._flashKind(eid) === "native") house.push(eid);
    }

    const moveMany = (list, from, to) => {
      for (const e of list) {
        const i = from.indexOf(e);
        if (i >= 0) from.splice(i, 1);
        if (!to.includes(e)) to.push(e);
      }
      repaint();
    };

    this._overlay(this.T("auto_title"), (list, q, close) => {
      list.textContent = "";
      const opts = [
        ["mdi:flash", this.T("auto_from").replace("{n}", fromSteady.length),
         fromSteady.length, () => moveMany(fromSteady, steady, flash)],
        ["mdi:home-lightbulb-outline", this.T("auto_house").replace("{n}", house.length),
         house.length, () => moveMany(house, [], flash)],
        ["mdi:arrow-up-box", this.T("auto_move").replace("{n}", stuck.length),
         stuck.length, () => moveMany(stuck, flash, steady)],
      ];
      let shown = 0;
      for (const [ic, label, count, run] of opts) {
        if (!count) continue;
        shown++;
        const r = el("div", "pk");
        r.appendChild(icon(ic));
        r.appendChild(el("div", "n", esc(label)));
        r.onclick = () => { close(); run(); };
        list.appendChild(r);
      }
      if (!shown) list.appendChild(el("div", "empty", esc(this.T("auto_none"))));
    }, true);
  }

  /* modal icinde yasayan chip listesi — kaydetmez, sadece taslagi degistirir */
  _chipsLocal(arr, domain, onChange) {
    const box = el("div", "chips");
    box.style.marginTop = "6px";
    for (const eid of arr) {
      const c = el("span", "chip");
      c.appendChild(icon(this._entIcon(eid)));
      c.appendChild(el("span", null, esc(this._name(eid))));
      const x = el("button", "x", "×");
      x.onclick = () => { arr.splice(arr.indexOf(eid), 1); onChange(); };
      c.appendChild(x);
      box.appendChild(c);
    }
    const add = el("span", "chip add");
    add.appendChild(icon("mdi:plus"));
    add.appendChild(el("span", null, esc(this.T("f_add_dev"))));
    add.onclick = () => this._pickEntity(domain, (eid) => {
      if (!arr.includes(eid)) arr.push(eid);
      onChange();
    });
    box.appendChild(add);

    // Oda üzerinden seçim: tek tek ya da odanın tümü.
    const addRoom = el("span", "chip add");
    addRoom.appendChild(icon("mdi:floor-plan"));
    addRoom.appendChild(el("span", null, esc(this.T("f_add_room"))));
    addRoom.onclick = () => this._pickFromRoom(domain, (eids) => {
      for (const eid of eids) if (!arr.includes(eid)) arr.push(eid);
      onChange();
    });
    box.appendChild(addRoom);
    return box;
  }

  /* Oda seç -> o odadaki uygun cihazları tek tek ya da toptan al */
  _pickFromRoom(domain, onAdd) {
    const domains = domain === "any" ? null : String(domain).split("|");
    const rooms = this._roomList()
      .map((rm) => Object.assign({}, rm, {
        ents: rm.ents.filter((e) => !domains || domains.includes(e.split(".")[0])),
      }))
      .filter((rm) => rm.ents.length);

    this._overlay(this.T("pick_room"), (list, q, close) => {
      list.textContent = "";
      const shown = rooms.filter((rm) => !q || norm(rm.name).includes(q));
      if (!shown.length) { list.appendChild(el("div", "empty", esc(this.T("none_found")))); return; }
      for (const rm of shown) {
        const r = el("div", "pk");
        r.appendChild(icon(rm.icon));
        const b = el("div", "n");
        b.appendChild(el("div", null, esc(rm.name)));
        b.appendChild(el("div", "e", `${rm.ents.length} ${esc(this.T("devices"))}`));
        r.appendChild(b);
        r.appendChild(icon("mdi:chevron-right"));
        r.onclick = () => { close(); this._roomEntityPicker(rm, onAdd); };
        list.appendChild(r);
      }
    });
  }

  _roomEntityPicker(room, onAdd) {
    const prev = this.shadowRoot.querySelector(".ov.picker");
    if (prev) prev.remove();
    const chosen = new Set(room.ents);   // varsayılan: odanın tümü seçili

    const ov = el("div", "ov picker");
    const ed = el("div", "ed");
    ed.style.maxWidth = "520px";
    ed.appendChild(el("div", "ed-t", esc(room.name)));
    ed.appendChild(el("div", "ed-s", esc(this.T("pick_in_room"))));
    const list = el("div", "ovlist");
    ed.appendChild(list);
    const foot = el("div", "ed-foot");
    const ok = el("button", "btn");
    const no = el("button", "btn ghost", esc(this.T("cancel")));
    no.onclick = () => ov.remove();
    foot.appendChild(ok);
    foot.appendChild(no);
    ed.appendChild(foot);

    const paint = () => {
      list.textContent = "";

      const all = el("div", "pk" + (chosen.size === room.ents.length ? " on" : ""));
      const ck = el("div", "ck"); ck.appendChild(icon("mdi:check"));
      all.appendChild(ck);
      const ab = el("div", "n");
      ab.appendChild(el("div", null, esc(this.T("select_all"))));
      ab.appendChild(el("div", "e", `${room.ents.length} ${esc(this.T("devices"))}`));
      all.appendChild(ab);
      all.onclick = () => {
        if (chosen.size === room.ents.length) chosen.clear();
        else room.ents.forEach((e) => chosen.add(e));
        paint();
      };
      list.appendChild(all);
      list.appendChild(el("div", "pksep"));

      for (const eid of room.ents) {
        const r = el("div", "pk" + (chosen.has(eid) ? " on" : ""));
        const c = el("div", "ck"); c.appendChild(icon("mdi:check"));
        r.appendChild(c);
        r.appendChild(icon(this._entIcon(eid)));
        const b = el("div", "n");
        const nm = el("div");
        nm.appendChild(el("span", null, esc(this._name(eid))));
        if (this._isLightGroup(eid)) nm.appendChild(el("span", "gtag", esc(this.T("grp_tag"))));
        b.appendChild(nm);
        b.appendChild(el("div", "e", esc(eid)));
        r.appendChild(b);
        const info = this._stateInfo(eid);
        if (info.text) r.appendChild(el("div", "e", esc(info.text)));
        r.onclick = () => {
          if (chosen.has(eid)) chosen.delete(eid); else chosen.add(eid);
          paint();
        };
        list.appendChild(r);
      }

      ok.textContent = chosen.size
        ? this.T("add_n").replace("{n}", chosen.size)
        : this.T("add_none");
      ok.disabled = chosen.size === 0;
    };
    ok.onclick = () => {
      if (!chosen.size) return;
      ov.remove();
      onAdd(Array.from(chosen));
    };
    paint();

    ov.onclick = (ev) => { if (ev.target === ov) ov.remove(); };
    ov.appendChild(ed);
    this.shadowRoot.appendChild(ov);
  }

  /* Ses motoru: HA'daki tts.* entity'leri (Google AI, Google Translate, Cloud…) */
  _ttsEngines() {
    const out = [];
    for (const eid of Object.keys(this._hass.states || {})) {
      if (!eid.startsWith("tts.")) continue;
      const st = this._hass.states[eid];
      out.push({ id: eid, name: (st.attributes && st.attributes.friendly_name) || eid });
    }
    out.sort((a, b) => a.name.localeCompare(b.name, "tr"));
    return out;
  }

  _enginePick(value, onChange) {
    const sel = document.createElement("select");
    sel.className = "ed-in";
    const add = (parent, v, label) => {
      const o = document.createElement("option");
      o.value = v; o.textContent = label;
      if ((value || "") === v) o.selected = true;
      parent.appendChild(o);
    };
    const grp = (label) => {
      const g = document.createElement("optgroup"); g.label = label;
      sel.appendChild(g); return g;
    };
    add(sel, "", this.T("f_engine_def"));
    const ha = this._ttsEngines();
    if (ha.length) { const g = grp("Home Assistant"); for (const e of ha) add(g, e.id, e.name); }
    // Sentinel'in kendi AI sesleri — sadece anahtar girildiyse görünür.
    const ai = this._cfg.ai || {};
    if (ai.openai) { const g = grp("OpenAI"); for (const v of OPENAI_VOICES) add(g, "openai:" + v, "OpenAI · " + v); }
    if (ai.gemini) { const g = grp("Gemini"); for (const v of GEMINI_VOICES) add(g, "gemini:" + v, "Gemini · " + v); }
    sel.onchange = () => onChange(sel.value);
    return sel;
  }

  /* Medya adresi: yaz, dosya sürükle-bırak, ya da kütüphaneden seç */
  _mediaDrop(draft, repaint) {
    const box = el("div");
    const input = this._text(draft.media, "/local/sentinel/siren_classic.mp3",
      (v) => { draft.media = v; });
    box.appendChild(input);

    const zone = el("div", "drop");
    const msg = el("span", null, esc(this.T("f_drop")));
    zone.appendChild(icon("mdi:tray-arrow-down"));
    zone.appendChild(msg);
    const browse = el("button", "linkbtn", esc(this.T("f_browse")));
    browse.onclick = (ev) => { ev.preventDefault(); this._pickMedia((url) => {
      draft.media = url; repaint();
    }); };
    zone.appendChild(browse);

    const setMsg = (text, cls) => {
      msg.textContent = text;
      zone.className = "drop" + (cls ? " " + cls : "");
    };

    zone.ondragover = (ev) => { ev.preventDefault(); setMsg(this.T("f_dropping"), "over"); };
    zone.ondragleave = () => setMsg(this.T("f_drop"));
    zone.ondrop = async (ev) => {
      ev.preventDefault();
      const file = ev.dataTransfer.files && ev.dataTransfer.files[0];
      if (!file) { setMsg(this.T("f_drop")); return; }
      if (!/\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(file.name)) {
        setMsg(this.T("f_only_audio"), "bad");
        return;
      }
      setMsg(this.T("f_uploading"), "busy");
      try {
        const fd = new FormData();
        fd.append("file", file, file.name);
        const res = await this._hass.fetchWithAuth("/api/sentinel_alarm/media", {
          method: "POST", body: fd,
        });
        const out = await res.json();
        if (!res.ok || !out.url) throw new Error(out.message || "upload failed");
        draft.media = out.url;
        this._flash(this.T("f_upload_ok"));
        repaint();
      } catch (e) {
        setMsg(this.T("f_upload_err"), "bad");
        this._flash(String(e && e.message ? e.message : e), true);
      }
    };
    box.appendChild(zone);
    return box;
  }

  _pickMedia(onPick) {
    this._overlay(this.T("f_library"), async (list, q, close) => {
      list.textContent = "";
      let files = this._mediaCache;
      if (!files) {
        try {
          const r = await this._hass.callApi("GET", "sentinel_alarm/media");
          files = this._mediaCache = (r && r.files) || [];
        } catch (e) { files = []; }
      }
      const shown = files.filter((f) => !q || norm(f.name).includes(q));
      if (!shown.length) {
        list.appendChild(el("div", "empty", esc(this.T("f_lib_empty"))));
        return;
      }
      for (const f of shown.slice(0, 300)) {
        const r = el("div", "pk");
        r.appendChild(icon("mdi:music-note"));
        const b = el("div", "n");
        b.appendChild(el("div", null, esc(f.name)));
        b.appendChild(el("div", "e", esc(f.url)));
        r.appendChild(b);
        r.appendChild(el("div", "e", `${Math.round((f.size || 0) / 1024)} KB`));
        r.onclick = () => { close(); onPick(f.url); };
        list.appendChild(r);
      }
    });
  }

  _segment(options, value, onChange) {
    const w = el("div", "seg");
    for (const [v, label] of options) {
      const b = el("button", "sgo" + (value === v ? " on" : ""), esc(label));
      b.onclick = () => {
        w.querySelectorAll(".sgo").forEach((x) => x.classList.remove("on"));
        b.classList.add("on");
        onChange(v);
      };
      w.appendChild(b);
    }
    return w;
  }

  _colorRow(value, onChange) {
    const w = el("div", "cols");
    const none = el("button", "col none" + (value ? "" : " on"), esc(this.T("f_nocolour")));
    none.onclick = () => onChange(null);
    w.appendChild(none);
    for (const c of COLORS) {
      const b = el("button", "col" +
        (value && value.join(",") === c.rgb.join(",") ? " on" : ""));
      b.style.background = `rgb(${c.rgb.join(",")})`;
      b.title = c.name;
      b.onclick = () => onChange(c.rgb.slice());
      w.appendChild(b);
    }
    return w;
  }

  /* --------------------------------------------------------- bilesenler */
  _row(title, sub, control) {
    const r = el("div", "row");
    const l = el("div", "rl");
    l.appendChild(el("b", null, esc(title)));
    if (sub) l.appendChild(el("small", null, esc(sub)));
    r.appendChild(l);
    const right = el("div", "rr2");
    right.appendChild(control);
    r.appendChild(right);
    return r;
  }

  _slider(value, min, max, step, onChange, fmt) {
    const w = el("div", "sl");
    const inp = document.createElement("input");
    inp.type = "range";
    inp.min = String(min); inp.max = String(max); inp.step = String(step);
    inp.value = String(Math.min(max, Math.max(min, Number(value) || 0)));
    const out = el("span", "v", esc(fmt(Number(inp.value))));
    const paint = () => {
      const pct = ((Number(inp.value) - min) / (max - min)) * 100;
      inp.style.background = `linear-gradient(90deg,#8b3dff ${pct}%,#2a2530 ${pct}%)`;
    };
    paint();
    inp.oninput = () => { out.textContent = fmt(Number(inp.value)); paint(); };
    inp.onchange = () => onChange(Number(inp.value));
    w.appendChild(inp);
    w.appendChild(out);
    return w;
  }

  _toggle(value, onChange) {
    const t = el("div", "tgl" + (value ? " on" : ""));
    t.appendChild(el("span", "k"));
    t.onclick = () => {
      const next = !t.classList.contains("on");
      t.classList.toggle("on", next);
      onChange(next);
    };
    return t;
  }

  _chipList(arr, domain, addLabel, ic, onChange) {
    // Kendi içini yeniden çizer — ayarlar modalında da, sahne sayfasında da
    // çalışsın diye `_renderStage` yerine bu kutuyu tazeliyoruz. `onChange`
    // verilirse (ör. gece ışıkları) sayfanın tamamı yenilenir.
    const box = el("div", "chips");
    const after = () => { if (onChange) onChange(); else rebuild(); };
    const rebuild = () => {
      box.textContent = "";
      for (const eid of arr) {
        const c = el("span", "chip");
        c.appendChild(icon(ic || "mdi:circle-small"));
        c.appendChild(el("span", null, esc(this._name(eid))));
        const x = el("button", "x", "×");
        x.onclick = () => {
          const i = arr.indexOf(eid);
          if (i >= 0) arr.splice(i, 1);
          this._save();
          after();
        };
        c.appendChild(x);
        box.appendChild(c);
      }
      const add = el("span", "chip add");
      add.appendChild(icon("mdi:plus"));
      add.appendChild(el("span", null, esc(addLabel)));
      add.onclick = () => this._pickEntity(domain, (eid) => {
        if (!arr.includes(eid)) arr.push(eid);
        this._save();
        after();
      });
      box.appendChild(add);
    };
    rebuild();
    return box;
  }



  /* ------------------------------------------------------------ ayarlar */
  _openSettings(replace) {
    const prev = this.shadowRoot.querySelector(".ov");
    if (prev) prev.remove();
    const c = this._cfg;
    const ov = el("div", "ov");
    const ed = el("div", "ed");
    ed.appendChild(el("div", "ed-t", esc(this.T("settings"))));
    ed.appendChild(el("div", "ed-s", esc(this.T("brand") + " · " + this.T("hero_h"))));

    const label = (txt, ic, first) => {
      const l = el("div", "ed-l" + (first ? " first" : ""));
      if (ic) l.appendChild(icon(ic));
      l.appendChild(el("span", null, esc(txt)));
      return l;
    };
    const fieldLab = (t, s) => el("div", "ed-lab", `<b>${esc(t)}</b>${s ? esc(s) : ""}`);

    /* anons sesi — motor ve hoparlör her adımda kendi seçilir; burada
       yalnızca hoparlörü konuşmadan önce yükselten seviye var. */
    ed.appendChild(label(this.T("set_sound"), "mdi:volume-high", true));
    ed.appendChild(el("div", "ed-s", esc(this.T("set_sound_s"))));
    ed.appendChild(fieldLab(this.T("f_ttsvol"), this.T("f_ttsvol_s")));
    ed.appendChild(this._slider(c.tts_volume == null ? 80 : c.tts_volume, 0, 100, 5,
      (v) => { c.tts_volume = v; this._save(); },
      (v) => (v === 0 ? this.T("f_ttsvol_off") : `%${v}`)));

    /* bildirim */
    ed.appendChild(label(this.T("set_notif"), "mdi:cellphone-message"));
    ed.appendChild(fieldLab(this.T("f_cams"), this.T("f_cams_s")));
    ed.appendChild(this._chipList(c.cameras, "camera", this.T("add_cam"), "mdi:cctv"));
    if (!c.notify_msg || typeof c.notify_msg !== "object") c.notify_msg = {};
    ed.appendChild(this._row(this.T("nb_cam"), this.T("nb_cam_s"),
      this._toggle(c.notify_msg.room_camera !== false,
        (v) => { c.notify_msg.room_camera = v; this._save(); })));
    ed.appendChild(this._row(this.T("f_crit"), this.T("f_crit_s"),
      this._toggle(c.critical, (v) => { c.critical = v; this._save(); })));
    ed.appendChild(this._row(this.T("push_act"), this.T("push_act_s"),
      this._toggle(c.notify_actions !== false, (v) => { c.notify_actions = v; this._save(); })));
    ed.appendChild(this._row(this.T("stop_dis"), this.T("stop_dis_s"),
      this._toggle(c.stop_actions_on_disarm !== false,
        (v) => { c.stop_actions_on_disarm = v; this._save(); })));
    ed.appendChild(fieldLab(this.T("f_tgchat"), this.T("f_tgchat_s")));
    ed.appendChild(this._text(c.telegram_chat, "-700720774",
      (v) => { c.telegram_chat = v.replace(/[^\d-]/g, ""); this._save(); }));

    /* guvenlik */
    ed.appendChild(label(this.T("set_sec"), "mdi:lock-outline"));
    ed.appendChild(fieldLab(this.T("f_code"), this.T("f_code_s")));
    ed.appendChild(this._text(c.code, "1234", (v) => { c.code = v.replace(/\D/g, ""); this._save(); }, "password"));
    ed.appendChild(this._row(this.T("f_attempts"), "",
      this._slider(c.code_attempts, 1, 10, 1, (v) => { c.code_attempts = v; this._save(); },
        (v) => `${v} ${this.T("attempts_u")}`)));

    /* kart arka plani — surukle birak ya da elle yol */
    ed.appendChild(label(this.T("set_card"), "mdi:card-outline"));
    ed.appendChild(fieldLab(this.T("f_cardbg"), this.T("f_cardbg_s")));
    const bgWrap = el("div", "bgdrop");
    const bgNote = el("div", "bgnote", esc(this.T("bg_drop")));
    const bgPrev = el("div", "bgprev");
    const setPrev = () => {
      const u = (c.card_bg || "").trim();
      bgPrev.style.backgroundImage = u ? `url("${u}")` : "";
      bgPrev.classList.toggle("on", !!u);
      bgNote.textContent = u || this.T("bg_drop");
    };
    setPrev();
    bgWrap.appendChild(bgPrev);
    bgWrap.appendChild(bgNote);
    const upload = async (file) => {
      if (!file || !/^image\//.test(file.type)) { bgNote.textContent = this.T("bg_bad"); return; }
      bgNote.textContent = this.T("bg_upload");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "image");
      try {
        const r = await this._hass.fetchWithAuth("/api/sentinel_alarm/media",
          { method: "POST", body: fd });
        const j = await r.json();
        if (!j || !j.url) throw new Error("no url");
        c.card_bg = j.url;
        this._save();
        setPrev();
      } catch (e) {
        bgNote.textContent = this.T("bg_bad");
      }
    };
    bgWrap.ondragover = (e) => { e.preventDefault(); bgWrap.classList.add("over"); };
    bgWrap.ondragleave = () => bgWrap.classList.remove("over");
    bgWrap.ondrop = (e) => {
      e.preventDefault();
      bgWrap.classList.remove("over");
      upload(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
    };
    bgWrap.onclick = () => {
      const inp = document.createElement("input");
      inp.type = "file"; inp.accept = "image/*";
      inp.onchange = () => upload(inp.files && inp.files[0]);
      inp.click();
    };
    ed.appendChild(bgWrap);
    ed.appendChild(this._text(c.card_bg || "", "/local/sentinel/arka.jpg",
      (v) => { c.card_bg = v.trim(); this._save(); setPrev(); }));
    const bgClear = el("div", "bgclear", esc(this.T("bg_clear")));
    bgClear.onclick = () => { c.card_bg = ""; this._save(); setPrev(); this._openSettings(true); };
    ed.appendChild(bgClear);

    /* dil + ai */
    ed.appendChild(label(this.T("set_lang"), "mdi:translate"));
    ed.appendChild(fieldLab(this.T("f_lang")));
    const lw = el("div", "lang2");
    for (const [code, lbl] of [["en", "English"], ["tr", "Türkçe"]]) {
      const o = el("div", "lo" + (this._lang() === code ? " on" : ""), esc(lbl));
      o.onclick = () => { c.lang = code; this._save(); ov.remove(); this._render(); this._openSettings(); };
      lw.appendChild(o);
    }
    ed.appendChild(lw);
    ed.appendChild(label(this.T("set_ai"), "mdi:robot-happy-outline"));
    ed.appendChild(el("div", "ed-s", esc(this.T("ai_note2"))));
    if (!c.ai || typeof c.ai !== "object") c.ai = {};
    ed.appendChild(fieldLab("OpenAI API key", this.T("ai_openai_s")));
    const okBox = this._text(c.ai.openai, "sk-…", (v) => { c.ai.openai = v.trim(); this._save(); this._openSettings(true); }, "password");
    ed.appendChild(okBox);
    ed.appendChild(fieldLab("Gemini API key", this.T("ai_gemini_s")));
    const gkBox = this._text(c.ai.gemini, "AIza…", (v) => { c.ai.gemini = v.trim(); this._save(); this._openSettings(true); }, "password");
    ed.appendChild(gkBox);
    if (c.ai.openai || c.ai.gemini) {
      ed.appendChild(el("div", "tginfo",
        `<ha-icon icon="mdi:check-circle-outline"></ha-icon><span>${esc(this.T("ai_ready"))}</span>`));
    }

    /* dosyaya yedekle / dosyadan geri yükle */
    ed.appendChild(label(this.T("set_file"), "mdi:content-save-outline"));
    ed.appendChild(el("div", "ed-s", esc(this.T("file_s"))));
    const frow = el("div", "chips");
    frow.style.marginTop = "10px";
    const dl = el("span", "chip add");
    dl.appendChild(icon("mdi:download-outline"));
    dl.appendChild(el("span", null, esc(this.T("file_save"))));
    dl.onclick = () => this._exportConfig();
    const up = el("span", "chip add");
    up.appendChild(icon("mdi:upload-outline"));
    up.appendChild(el("span", null, esc(this.T("file_load"))));
    up.onclick = () => this._importConfig();
    frow.appendChild(dl); frow.appendChild(up);
    ed.appendChild(frow);

    /* sürüm geçmişi — yanlış giden bir değişikliği geri almak için */
    ed.appendChild(label(this.T("set_undo"), "mdi:history"));
    ed.appendChild(el("div", "ed-s", esc(this.T("undo_s"))));
    const undoBox = el("div");
    ed.appendChild(undoBox);
    this._hass.callApi("GET", "sentinel_alarm/backups")
      .then((r) => this._paintBackups(undoBox, (r && r.backups) || []))
      .catch(() => this._paintBackups(undoBox, []));

    const foot = el("div", "ed-foot");
    const close = el("button", "btn", esc(this.T("close")));
    close.onclick = () => ov.remove();
    foot.appendChild(close);
    ed.appendChild(foot);

    ov.onclick = (ev) => { if (ev.target === ov) ov.remove(); };
    ov.appendChild(ed);
    this.shadowRoot.appendChild(ov);
    if (replace) ed.scrollIntoView({ block: "start" });
  }

  /* Bütün ayarları tek bir .json dosyasına indir. */
  _exportConfig() {
    try {
      const data = JSON.stringify(this._cfg, null, 2);
      const d = new Date();
      const p = (n) => String(n).padStart(2, "0");
      const name = `sentinel-alarm-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
        + `-${p(d.getHours())}${p(d.getMinutes())}.json`;
      const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url; a.download = name;
      this.shadowRoot.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      this._flash(this.T("file_saved").replace("{n}", name));
    } catch (e) { this._flash(String(e), true); }
  }

  /* Dosyadan ayarları geri yükle — önce sorar, eskisi geçmişe kaydedilir. */
  _importConfig() {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "application/json,.json";
    inp.onchange = async () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      let cfg;
      try {
        cfg = JSON.parse(await f.text());
      } catch (e) { this._flash(this.T("file_bad"), true); return; }
      if (!cfg || typeof cfg !== "object" || !cfg.assign || !cfg.modes) {
        this._flash(this.T("file_bad"), true); return;
      }
      const zones = Object.values(cfg.assign || {})
        .reduce((n, v) => n + (Array.isArray(v) ? v.length : 0), 0);
      const steps = Object.values(cfg.actions || {})
        .reduce((n, v) => n + (Array.isArray(v) ? v.length : 0), 0);
      const body = this.T("file_load_b")
        .replace("{f}", f.name).replace("{z}", zones).replace("{s}", steps);
      this._confirm(this.T("file_load_q"), body, this.T("file_load_ok"), async () => {
        try {
          await this._hass.callApi("POST", "sentinel_alarm/config", cfg);
          this._cfg = cfg;
          this._flash(this.T("file_loaded"));
          this._render();
        } catch (e) { this._flash(String(e), true); }
      });
    };
    inp.click();
  }

  _paintBackups(box, list) {
    box.textContent = "";
    if (!list.length) { box.appendChild(el("div", "empty", esc(this.T("undo_none")))); return; }
    for (const b of list.slice(0, 12)) {
      const r = el("div", "verrow");
      const when = (b.ts || "").replace("T", " ").slice(5, 16);
      const info = el("div", "vi");
      info.appendChild(el("div", "vt", esc(when)));
      info.appendChild(el("div", "vs", esc(
        `${b.zones} ${this.T("undo_zones")} · ${b.steps} ${this.T("undo_steps")}`)));
      r.appendChild(info);
      const go = el("button", "zclear");
      go.appendChild(icon("mdi:restore"));
      go.appendChild(el("span", null, esc(this.T("undo_do"))));
      go.onclick = () => this._confirm(this.T("undo_q"), this.T("undo_b"), this.T("undo_do"), async () => {
        try {
          await this._hass.callApi("POST", "sentinel_alarm/backups", { index: b.index });
          this._flash(this.T("undo_ok"));
          this.shadowRoot.querySelectorAll(".ov").forEach((o) => o.remove());
          this._loaded = false;
          await this._load();
        } catch (e) { this._flash(String(e), true); }
      });
      r.appendChild(go);
      box.appendChild(r);
    }
  }

  /* Bildirim ADIMI editörü: her adım kendi kalıbını ve kamerasını seçer. */
  _notifyStepEditor(body, draft, lab, paint) {
    if (!draft.include || typeof draft.include !== "object")
      draft.include = { room: true, sensor: true, time: true, mode: false, open: false };
    if (draft.msg_format === undefined)
      draft.msg_format = (draft.message || "").trim() ? "custom" : "alert";
    if (draft.camera_mode === undefined)
      draft.camera_mode = draft.camera ? "room" : "none";

    // 1) Metin: hazır kalıp mı, kendi metnin mi?
    body.appendChild(lab(this.T("ns_src")));
    body.appendChild(this._segment([
      ["ready", this.T("ns_ready")],
      ["custom", this.T("ns_own")],
    ], draft.msg_format === "custom" ? "custom" : "ready", (v) => {
      draft.msg_format = v === "custom" ? "custom" : "alert";
      paint();
    }));

    if (draft.msg_format === "custom") {
      const ta = document.createElement("textarea");
      ta.className = "ed-in";
      ta.rows = 3;
      ta.style.marginTop = "8px";
      ta.value = draft.message || "";
      ta.oninput = () => { draft.message = ta.value; };
      body.appendChild(ta);
    } else {
      body.appendChild(this._segment([
        ["short", this.T("fmt_short")],
        ["alert", this.T("fmt_alert")],
        ["calm", this.T("fmt_calm")],
      ], draft.msg_format, (v) => { draft.msg_format = v; }));
      body.appendChild(lab(this.T("nb_inc")));
      for (const [key, tk] of [["room", "inc_room"], ["sensor", "inc_sensor"],
        ["time", "inc_time"], ["mode", "inc_mode"], ["open", "inc_open"]]) {
        body.appendChild(this._row(this.T(tk), "",
          this._toggle(draft.include[key], (v) => { draft.include[key] = v; })));
      }
    }

    // 2) Kamera: yok / tetiklenen oda / seç
    body.appendChild(lab(this.T("ns_cam")));
    body.appendChild(this._segment([
      ["none", this.T("cam_none")],
      ["room", this.T("cam_room")],
      ["pick", this.T("cam_pick")],
    ], draft.camera_mode, (v) => { draft.camera_mode = v; paint(); }));
    if (draft.camera_mode === "pick") {
      if (!Array.isArray(draft.cameras)) draft.cameras = [];
      body.appendChild(lab(this.T("cam_pick_s")));
      body.appendChild(this._chipsLocal(draft.cameras, "camera", paint));
    }

    // 3) Hedef cihazlar — boşsa Ayarlar'daki liste kullanılır
    if (!Array.isArray(draft.notify)) draft.notify = [];
    body.appendChild(lab(this.T("ns_to"), this.T("ns_to_s")));
    body.appendChild(this._serviceChipsLocal(draft.notify, "notify", paint));

    // 4) Kritik mi? "Alarm kuruldu" normal, "hırsız var" sessizde bile çalsın.
    body.appendChild(this._row(this.T("ns_crit"), this.T("ns_crit_s"),
      this._toggle(draft.critical !== false, (v) => { draft.critical = v; })));

    // 5) Telegram — bot/hedef SEÇ (tahmine gerek yok, foto garanti gider)
    const hasTg = !!(draft.telegram_chat || draft.telegram_entity);
    body.appendChild(this._row(this.T("ns_tg"), this.T("ns_tg_s"),
      this._toggle(hasTg, (v) => {
        if (v) { draft.telegram_chat = draft.telegram_chat || "settings"; }
        else { draft.telegram_chat = ""; draft.telegram_entity = ""; }
        paint();
      })));
    if (draft.telegram_chat || draft.telegram_entity) {
      const ents = this._telegramEntities();
      const sel = document.createElement("select");
      sel.className = "nsel";
      const addOpt = (val, label) => {
        const o = document.createElement("option");
        o.value = val; o.textContent = label;
        sel.appendChild(o);
      };
      addOpt("settings", this.T("ns_tg_settings"));
      for (const eid of ents) addOpt("e:" + eid, this._name(eid));
      addOpt("manual", this.T("ns_tg_manual"));
      let cur = "settings";
      if (draft.telegram_entity) cur = "e:" + draft.telegram_entity;
      else if (draft.telegram_chat && draft.telegram_chat !== "settings") cur = "manual";
      sel.value = cur;
      sel.onchange = () => {
        if (sel.value.startsWith("e:")) {
          draft.telegram_entity = sel.value.slice(2); draft.telegram_chat = "";
        } else if (sel.value === "manual") {
          draft.telegram_entity = "";
          draft.telegram_chat = (draft.telegram_chat && draft.telegram_chat !== "settings")
            ? draft.telegram_chat : "";
        } else {
          draft.telegram_entity = ""; draft.telegram_chat = "settings";
        }
        paint();
      };
      body.appendChild(this._row(this.T("ns_tg_id"), this.T("ns_tg_id_s"), sel));

      if (cur === "manual") {
        const inp = document.createElement("input");
        inp.type = "text"; inp.className = "nsel"; inp.style.minWidth = "180px";
        inp.placeholder = "-100xxxxxxxxxx";
        inp.value = draft.telegram_chat === "settings" ? "" : (draft.telegram_chat || "");
        inp.oninput = () => { draft.telegram_chat = inp.value.trim(); };
        body.appendChild(this._row(this.T("ns_tg_manual"), "", inp));
      }

      // Bilgi notu: gerçekte nereye/hangi bota gidiyor?
      let note;
      if (draft.telegram_entity) note = this._name(draft.telegram_entity);
      else if (cur === "manual") note = draft.telegram_chat || "—";
      else note = this.T("ns_tg_settings") +
        (this._cfg.telegram_chat ? " · " + this._cfg.telegram_chat : "");
      const info = el("div", "tginfo");
      info.appendChild(icon("mdi:send-circle-outline"));
      info.appendChild(el("span", null, this.T("ns_tg_note") + " " + note));
      body.appendChild(info);
    }
  }

  /* HA'daki telegram_bot notify entity'leri (her biri bir bot+chat hedefi). */
  _telegramEntities() {
    const h = this._hass;
    if (!h) return [];
    const out = [];
    for (const [eid, ent] of Object.entries(h.entities || {})) {
      if (eid.startsWith("notify.") && ent && ent.platform === "telegram_bot") out.push(eid);
    }
    out.sort((a, b) => this._name(a).localeCompare(this._name(b), "tr"));
    return out;
  }

  /* notify servisi chip listesi (modal içi, taslağa yazar) */
  _serviceChipsLocal(arr, domain, onChange) {
    const box = el("div", "chips");
    for (const svc of arr) {
      const c = el("span", "chip");
      c.appendChild(icon("mdi:cellphone"));
      c.appendChild(el("span", null, esc(svc)));
      const x = el("button", "x", "×");
      x.onclick = () => { arr.splice(arr.indexOf(svc), 1); onChange(); };
      c.appendChild(x);
      box.appendChild(c);
    }
    const add = el("span", "chip add");
    add.appendChild(icon("mdi:plus"));
    add.appendChild(el("span", null, esc(this.T("ns_add_to"))));
    add.onclick = () => this._pickService(domain, (svc) => {
      if (!arr.includes(svc)) arr.push(svc);
      onChange();
    });
    box.appendChild(add);
    return box;
  }

  _text(value, placeholder, onChange, type) {
    const i = document.createElement("input");
    i.className = "ed-in";
    i.type = type || "text";
    i.value = value || "";
    i.placeholder = placeholder || "";
    i.onchange = () => onChange(i.value.trim());
    return i;
  }

  _entityPick(value, domain, onChange) {
    const b = el("div", "pk");
    b.style.cssText = "border:1px solid rgba(255,255,255,.1);background:#1b1721;border-radius:11px;";
    b.appendChild(icon(value ? "mdi:check-circle-outline" : "mdi:cursor-default-click-outline"));
    const n = el("div", "n", esc(value ? this._name(value) : this.T("pick")));
    if (!value) n.style.color = "#6f6675";
    b.appendChild(n);
    if (value) {
      const x = el("button", "x", "×");
      x.style.cssText = "background:none;border:none;color:#6f6675;cursor:pointer;font-size:15px;";
      x.onclick = (ev) => { ev.stopPropagation(); onChange(""); };
      b.appendChild(x);
    }
    b.appendChild(icon("mdi:chevron-down"));
    b.onclick = () => this._pickEntity(domain, onChange);
    return b;
  }

  /* --------------------------------------------------------------- secici */
  _overlay(title, buildList, noSearch) {
    const prev = this.shadowRoot.querySelector(".ov.picker");
    if (prev) prev.remove();
    const ov = el("div", "ov picker");
    const ed = el("div", "ed");
    ed.style.maxWidth = "560px";
    ed.appendChild(el("div", "ed-t", esc(title)));
    let search = null;
    if (!noSearch) {
      search = document.createElement("input");
      search.className = "ed-in";
      search.style.marginTop = "14px";
      search.placeholder = this.T("search");
      ed.appendChild(search);
    }
    const list = el("div", "ovlist");
    ed.appendChild(list);
    const close = () => ov.remove();
    const paint = () => buildList(list, search ? norm(search.value) : "", close);
    if (search) search.oninput = paint;
    paint();
    ov.onclick = (ev) => { if (ev.target === ov) close(); };
    ov.appendChild(ed);
    this.shadowRoot.appendChild(ov);
    if (search) setTimeout(() => search.focus(), 60);
  }

  _pickEntity(domain, onPick) {
    const domains = domain === "any" ? null : String(domain).split("|");
    this._overlay(this.T("pick"), (list, q, close) => {
      list.textContent = "";
      const items = [];
      for (const eid of Object.keys(this._hass.states)) {
        const dom = eid.split(".")[0];
        if (domains && !domains.includes(dom)) continue;
        const name = this._name(eid);
        if (q && !norm(name).includes(q) && !norm(eid).includes(q)) continue;
        items.push([eid, name]);
      }
      items.sort((a, b) => a[1].localeCompare(b[1], "tr"));
      if (!items.length) { list.appendChild(el("div", "empty", esc(this.T("none_found")))); return; }
      for (const [eid, name] of items.slice(0, 300)) {
        const r = el("div", "pk");
        r.appendChild(icon(this._entIcon(eid)));
        const n = el("div", "n");
        const line = el("div");
        line.appendChild(el("span", null, esc(name)));
        if (this._isLightGroup(eid)) line.appendChild(el("span", "gtag", esc(this.T("grp_tag"))));
        n.appendChild(line);
        n.appendChild(el("div", "e", esc(eid)));
        r.appendChild(n);
        r.onclick = () => { close(); onPick(eid); };
        list.appendChild(r);
      }
    });
  }

  _pickService(domain, onPick) {
    this._overlay(this.T("pick"), (list, q, close) => {
      list.textContent = "";
      const svcs = (this._hass.services && this._hass.services[domain]) || {};
      // Arama hem çıplak adla (mobile_app_xxx) hem tam id ile (notify.xxx)
      // eşleşsin — kullanıcı "notify." önekiyle yazınca da bulunsun.
      const names = Object.keys(svcs)
        .filter((n) => !q || norm(n).includes(q) || norm(`${domain}.${n}`).includes(q))
        .sort();
      if (!names.length) { list.appendChild(el("div", "empty", esc(this.T("none_found")))); return; }
      for (const n of names) {
        const r = el("div", "pk");
        r.appendChild(icon("mdi:bell-outline"));
        const b = el("div", "n");
        b.appendChild(el("div", null, esc(n)));
        b.appendChild(el("div", "e", `${domain}.${n}`));
        r.appendChild(b);
        r.onclick = () => { close(); onPick(`${domain}.${n}`); };
        list.appendChild(r);
      }
    });
  }
}

// Guard: sürüm değişince eski modül aynı sekmede yüklü kalabilir; çift define
// "already been used with this registry" hatası verir. Bir kez tanımla.
if (!customElements.get("sentinel-alarm-panel")) {
  customElements.define("sentinel-alarm-panel", SentinelAlarmPanel);
}
