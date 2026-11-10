// ============================================================
//  เสียงบรรยากาศ + เสียงเอฟเฟกต์ของสนาม Eos (GRID_PLAN §8.6) — Web Audio API (ทางเดินเสียงแบบเดียวกับ fodlan/fodlanAudio.js)
//  ไฟล์: /eos/sfx/<key>.mp3 (Mixkit — รายการต้นทาง Downloads/eos/sfx/manifest.csv · ตัด/ปรับความดังแล้ว) · ไม่มีไฟล์ = ข้ามเงียบๆ
//
//  const ea = eosAudio();
//  ea.setBeds({ amb_forest_day: 1, wx_rain_loop: 0.8 }, { fade })   // ลูปพื้นตามโซน/กลางคืน/สภาพอากาศ (App.jsx)
//  ea.sfx(key, { gain, delay, dur })   ea.thunder(on)   — dur (วินาที) = ตัดเสียงยาวให้จบพร้อมฉาก (จางออก 0.25 วิท้าย)   ea.stop(fade)   ea.duck(k, ms)
//  ea.setMusic(key, { fade })      // เพลงของสนาม (day/night/battle_day/battle_night/tension/hunt) ครอสเฟด ~1.8 วิ · null = จางออก
//  เพลง: /eos/music/<key>.mp3 (ไฟล์ผู้ใช้ Downloads/eos/sound · ตัดช่วงเงียบหัวท้าย + loudnorm −11.3 LUFS 192k แบบเพลงด่าน Fodlan)
//   เล่นผ่าน <audio> + MediaElementSource (สตรีม ไม่ถอดรหัสทั้งเพลงเข้าหน่วยความจำ) · เพลงหลักของเกม (audioPolicy) เงียบระหว่างอยู่ Eos
//   เลือกเพลงจาก state ด้วย eosMusicPicker() ท้ายไฟล์ (App.jsx)
// ============================================================
import { masterGain, channelGain, onVolumeChange, isMusicSuspended, onMusicSuspend } from "../audio";
import { sameSide } from "../duo";

const BED_BASE = 0.5;    // ไฟล์เสียงพื้น −22 LUFS (−6 dB ≈ −28) · เพลงด่าน −11.3 × MUSIC_BASE 0.75 ≈ −13.8 → เพลงดังกว่าเสียงพื้นชัดเจน ~14 dB (ซ้อนฝน/ลมอีกชั้นยังห่าง ~11 dB)
//  ผู้ใช้ลองแล้ว (2026-10-27): ที่ 1.4 "แทบไม่ได้ยินเพลง เสียงฉากดังกว่า" — ฝน/ลมเป็นเสียงกว้างทั้งย่าน ฟังดังกว่าตัวเลข LUFS
const SFX_BASE = 0.8;    // เสียงครั้งเดียวของด่าน (ฟ้าผ่า ธนู มังกร …) — ไม่ให้กลบเพลง
const THUNDER_GAIN = 0.6;
const HOLD_OUT = 0.12, HOLD_IN = 0.8; // วินาที: เงียบเร็วตอนวีดีโอเริ่ม · ค่อยๆ กลับหลังวีดีโอจบ
const url = (key) => `/eos/sfx/${key}.mp3`;
const MUSIC_BASE = 0.75;     // เท่ากับ MUSIC_BASE ของ audio.js (เพลงด่าน −11.3 × 0.75 ≈ −13.8)
const MUSIC_FADE = 1.8;      // วินาที ครอสเฟดระหว่างเพลง
const MUSIC_RESTART = new Set(["battle_day", "battle_night", "hunt", "tension", "boss", "mech"]); // เพลงเหตุการณ์: ปิดไปนานแล้วกลับมา = เริ่มต้นเพลง
const MUSIC_RESTART_MS = 20000;
const musicUrl = (key) => `/eos/music/${key}.mp3`;

let instance = null;

export function eosAudio() {
  if (instance) return instance;

  let ctx = null, master = null, hold = null, bedBus = null, sfxBus = null, musicBus = null;
  const tracks = new Map();    // เพลง key → { el, gain, stopTimer, offAt }
  let musicKey = null;         // เพลงที่ตั้งไว้ล่าสุด
  let suspended = false;
  const buffers = new Map();   // key → AudioBuffer | null (null = โหลดไม่ได้)
  const loading = new Map();   // key → Promise<AudioBuffer|null>
  const beds = new Map();      // key → { src, gain, target }
  let bedKey = null;           // ชุดลูปพื้นที่ตั้งไว้ล่าสุด
  let thunderTimer = 0;
  let duckK = 1;

  const now = () => ctx.currentTime;

  function ensure() {
    if (ctx) return ctx;
    const AC = typeof window !== "undefined" ? (window.AudioContext || window.webkitAudioContext) : null;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = masterGain() * channelGain("music");
    // ตัวกันพีค: เสียงพื้นถูกดันเกิน 1 + เสียงครั้งเดียวซ้อนกัน ห้ามแตกที่ลำโพง
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -3; limiter.knee.value = 0; limiter.ratio.value = 20;
    limiter.attack.value = 0.003; limiter.release.value = 0.25;
    hold = ctx.createGain();
    hold.gain.value = isMusicSuspended() ? 0 : 1;
    master.connect(hold);
    hold.connect(limiter);
    limiter.connect(ctx.destination);
    bedBus = ctx.createGain();
    bedBus.gain.value = BED_BASE;
    bedBus.connect(master);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = SFX_BASE;
    sfxBus.connect(master);
    musicBus = ctx.createGain();
    musicBus.gain.value = MUSIC_BASE;
    musicBus.connect(master);
    suspended = isMusicSuspended();
    onVolumeChange(() => { try { master.gain.setTargetAtTime(masterGain() * channelGain("music"), now(), 0.05); } catch { /* ไม่เป็นไร */ } });
    onMusicSuspend((on) => {
      try {
        const p = hold.gain;
        p.cancelScheduledValues(now());
        p.setValueAtTime(p.value, now());
        p.linearRampToValueAtTime(on ? 0 : 1, now() + (on ? HOLD_OUT : HOLD_IN));
      } catch { /* ไม่เป็นไร */ }
      // วีดีโอ/เพลงประจำฉาก: พักเพลงของสนามจริงๆ (ไม่ใช่แค่เงียบ) แล้วเล่นต่อจากจุดเดิมเมื่อปล่อย
      suspended = on;
      const t = musicKey && tracks.get(musicKey);
      if (t) { if (on) setTimeout(() => { if (suspended) t.el.pause(); }, HOLD_OUT * 1000 + 30); else playEl(t.el); }
    });
    // เบราว์เซอร์ยังไม่ให้เล่นเสียงเอง → ปลุกตอนผู้เล่นแตะจอ/กดปุ่มครั้งแรก
    const resume = () => {
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const t = musicKey && !suspended && tracks.get(musicKey);
      if (t && t.el.paused) playEl(t.el);
    };
    window.addEventListener("pointerdown", resume);
    window.addEventListener("keydown", resume);
    resume();
    return ctx;
  }

  function load(key) {
    if (!key) return Promise.resolve(null);
    if (buffers.has(key)) return Promise.resolve(buffers.get(key));
    if (loading.has(key)) return loading.get(key);
    if (!ensure()) return Promise.resolve(null);
    const p = fetch(url(key))
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .then((ab) => (ab ? ctx.decodeAudioData(ab) : null))
      .catch(() => null)
      .then((buf) => { buffers.set(key, buf || null); loading.delete(key); return buf || null; });
    loading.set(key, p);
    return p;
  }

  // ---------- ลูปพื้น ----------
  function startBed(key, target, fade) {
    const cur = beds.get(key);
    if (cur) { rampBed(cur, target, fade); return; }
    const entry = { src: null, gain: null, target, dead: false };
    beds.set(key, entry);
    load(key).then((buf) => {
      if (!buf || entry.dead || beds.get(key) !== entry) return;
      try {
        const g = ctx.createGain();
        g.gain.value = 0;
        g.connect(bedBus);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        src.connect(g);
        // เริ่มกลางลูปแบบสุ่ม — เข้าด่านเดิมซ้ำจะไม่ได้ยินท่อนเดิมทุกครั้ง
        src.start(0, Math.random() * buf.duration);
        entry.src = src; entry.gain = g;
        rampBed(entry, entry.target, fade);
      } catch { /* ข้ามลูปนี้ */ }
    });
  }
  function rampBed(entry, target, fade) {
    entry.target = target;
    if (!entry.gain) return;
    try {
      const p = entry.gain.gain;
      p.cancelScheduledValues(now());
      p.setValueAtTime(p.value, now());
      p.linearRampToValueAtTime(target, now() + Math.max(0.02, fade));
    } catch { /* ไม่เป็นไร */ }
  }
  function killBed(key, fade) {
    const entry = beds.get(key);
    if (!entry) return;
    beds.delete(key);
    entry.dead = true;
    if (!entry.src) return;
    rampBed(entry, 0, fade);
    try { entry.src.stop(now() + Math.max(0.02, fade) + 0.05); } catch { /* หยุดไปแล้ว */ }
    entry.src.onended = () => { try { entry.gain.disconnect(); } catch { /* ไม่เป็นไร */ } };
  }

  // ลูปพื้นที่ต้องการ { key: gain } — ตัวที่ไม่อยู่ในชุดจางออก · {} / null = จางออกหมด
  function setBeds(want, { fade = 2.5 } = {}) {
    try {
      const list = Object.entries(want || {}).filter(([k, g]) => k && g > 0).sort(([a], [b]) => (a < b ? -1 : 1));
      const k = list.map(([key, g]) => `${key}:${g}`).join("|");
      if (k === bedKey) return;
      bedKey = k;
      if (!ensure()) return;
      const m = new Map(list);
      for (const key of [...beds.keys()]) if (!m.has(key)) killBed(key, fade);
      for (const [key, g] of m) startBed(key, g, fade);
    } catch { /* เสียงพังห้ามทำให้ฉากพัง */ }
  }

  // ---------- เพลง ----------
  function playEl(el) {
    try { const p = el.play(); if (p && p.catch) p.catch(() => { /* ยังไม่ได้แตะจอ — resume() เล่นให้ทีหลัง */ }); } catch { /* ไม่เป็นไร */ }
  }
  function trackOf(key) {
    let t = tracks.get(key);
    if (t) return t;
    const el = new Audio(musicUrl(key));
    el.loop = true;
    el.preload = "auto";
    const gain = ctx.createGain();
    gain.gain.value = 0;
    ctx.createMediaElementSource(el).connect(gain);
    gain.connect(musicBus);
    t = { el, gain, stopTimer: 0, offAt: 0 };
    tracks.set(key, t);
    return t;
  }
  function rampTo(param, v, fade) {
    param.cancelScheduledValues(now());
    param.setValueAtTime(param.value, now());
    param.linearRampToValueAtTime(v, now() + Math.max(0.02, fade));
  }
  function setMusic(key, { fade = MUSIC_FADE } = {}) {
    try {
      key = key || null;
      if (key === musicKey) return;
      if (!ensure()) return;
      const prev = musicKey && tracks.get(musicKey);
      musicKey = key;
      if (prev) {
        rampTo(prev.gain.gain, 0, fade);
        clearTimeout(prev.stopTimer);
        prev.offAt = Date.now();
        prev.stopTimer = setTimeout(() => { if (tracks.get(musicKey) !== prev) prev.el.pause(); }, fade * 1000 + 80);
      }
      if (!key) return;
      const t = trackOf(key);
      clearTimeout(t.stopTimer);
      if (t.el.paused && MUSIC_RESTART.has(key) && Date.now() - t.offAt > MUSIC_RESTART_MS) { try { t.el.currentTime = 0; } catch { /* ยังไม่มี metadata */ } }
      rampTo(t.gain.gain, 1, fade);
      if (!suspended && t.el.paused) playEl(t.el);
    } catch { /* เสียงพังห้ามทำให้ฉากพัง */ }
  }

  function sfx(key, { gain = 1, delay = 0, dur = 0 } = {}) {
    try {
      if (!key || !ensure()) return;
      const play = (buf) => {
        if (!buf) return;
        try {
          const g = ctx.createGain();
          g.gain.value = gain;
          g.connect(sfxBus);
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.connect(g);
          src.onended = () => { try { g.disconnect(); } catch { /* ไม่เป็นไร */ } };
          const t0 = now() + Math.max(0, delay);
          src.start(t0);
          if (dur > 0 && dur < buf.duration) {
            const fade = Math.min(0.25, dur * 0.3);
            g.gain.setValueAtTime(gain, t0 + dur - fade);
            g.gain.linearRampToValueAtTime(0, t0 + dur);
            src.stop(t0 + dur + 0.02);
          }
        } catch { /* ข้าม */ }
      };
      const buf = buffers.get(key);
      if (buf !== undefined) play(buf);
      else load(key).then(play); // ยังไม่โหลด: เล่นทันทีที่พร้อม (ช้ากว่าจังหวะเล็กน้อยดีกว่าเงียบ)
    } catch { /* ไม่เป็นไร */ }
  }

  function thunder(on) {
    clearTimeout(thunderTimer);
    thunderTimer = 0;
    if (!on) return;
    load("wx_lightning_warn");
    const next = () => {
      thunderTimer = setTimeout(() => {
        sfx("wx_lightning_warn", { gain: THUNDER_GAIN });
        next();
      }, 7000 + Math.random() * 8000);
    };
    next();
  }

  function duck(k, ms = 400) {
    try {
      duckK = k;
      if (!ctx) return;
      const p = bedBus.gain;
      p.cancelScheduledValues(now());
      p.setValueAtTime(p.value, now());
      p.linearRampToValueAtTime(BED_BASE * duckK, now() + Math.max(0.02, ms / 1000));
    } catch { /* ไม่เป็นไร */ }
  }

  function stop(fade = 1.5) {
    try {
      thunder(false);
      bedKey = null;
      for (const key of [...beds.keys()]) killBed(key, fade);
      if (musicKey) setMusic(null, { fade });
    } catch { /* ไม่เป็นไร */ }
  }

  function preload(keys) {
    try { return Promise.all((keys || []).map((k) => load(k))).then(() => undefined); } catch { return Promise.resolve(); }
  }

  // ปิดทุกเสียงของตัวนี้ทันที (โมดูลถูกโหลดใหม่ระหว่างเล่น — dev/HMR · ไม่งั้นเพลงชุดเก่าเล่นซ้อนเพลงชุดใหม่: ผู้ใช้เจอ 2026-11-10)
  function destroy() {
    try {
      thunder(false);
      for (const t of tracks.values()) { clearTimeout(t.stopTimer); try { t.el.pause(); t.el.src = ""; } catch { /* ไม่เป็นไร */ } }
      tracks.clear();
      for (const key of [...beds.keys()]) killBed(key, 0.01);
      if (ctx && ctx.close) ctx.close().catch(() => {});
    } catch { /* ไม่เป็นไร */ }
  }

  instance = { preload, setBeds, setMusic, sfx, thunder, stop, duck, destroy };
  return instance;
}
if (import.meta.hot) import.meta.hot.dispose(() => { if (instance) instance.destroy(); instance = null; });

// ---------- ลูปพื้นตามโซนที่ตัวเรายืน (โซนเดียวกับ server/fodlan/map6.js ZONES) ----------
const ZONES = [
  { id: "insomnia", rect: [8, 0, 23, 8] },
  { id: "hammerhead", rect: [24, 24, 31, 31] },
  { id: "altissia", rect: [0, 24, 12, 31] },
  { id: "lake", rect: [0, 11, 12, 21] },
  { id: "duscae", rect: [13, 11, 27, 21] },
  { id: "forest", rect: [24, 0, 31, 9] },
  { id: "desert", rect: [13, 20, 31, 31] },
];
const TOWN = new Set(["insomnia", "hammerhead", "altissia"]);
export function eosZoneAt(x, y) {
  const z = ZONES.find((r) => x >= r.rect[0] && x <= r.rect[2] && y >= r.rect[1] && y <= r.rect[3]);
  return z ? z.id : "wild";
}
// เสียงพื้นเฉพาะจุด (ขั้น 4 — ตำแหน่งเดียวกับ server/fodlan/map6.js TUNNELS / CAMPS): ดังขึ้นเมื่อตัวเราเข้าใกล้ (ระยะ ≤ r ช่อง)
const NEAR_BEDS = [
  { key: "amb_tunnel", at: [[6, 4], [0, 18], [14, 12], [20, 31]], r: 3.5, gain: 0.85 },
  { key: "amb_campfire", at: [[1, 13], [29, 12], [15, 24]], r: 3.5, gain: 0.8, day: 0.6 },
];
// { key: gain } สำหรับ setBeds — pos = ตำแหน่งตัวเรา (null = กลางแผนที่) · night · weather kind
// dome = { rect } ตอนโดมกำแพงเวทของ Insomnia เปิด → เสียงหึ่ง (ดังเมื่อเราอยู่ในโดม/ใกล้)
export function eosBedsFor(pos, night, weather, dome = null) {
  const zone = pos ? eosZoneAt(pos.x, pos.y) : "wild";
  const out = {};
  const base = {
    insomnia: night ? "amb_insomnia_night" : "amb_insomnia_day",
    hammerhead: "amb_desert",
    desert: "amb_desert",
    altissia: "amb_altissia",
    lake: night ? "amb_lake_night" : "amb_lake_day",
    duscae: night ? "amb_forest_night" : "amb_forest_day",
    forest: night ? "amb_forest_night" : "amb_forest_day",
    wild: night ? "amb_forest_night" : "amb_forest_day",
  }[zone];
  out[base] = zone === "wild" ? 0.7 : 1;
  if (night && !TOWN.has(zone)) out.amb_night_daemon = 0.55;
  if (weather === "eos_storm") out.wx_rain_loop = 0.9;
  if (weather === "eos_fog") out.wx_fog_loop = 0.8;
  if (weather === "eos_snow") out.wx_fog_loop = 1;
  if (weather === "eos_magnet") out.wx_fog_loop = 0.6; // พายุแม่เหล็ก: ลมเบาๆ (ยังไม่มีเสียงเฉพาะ) // พายุหิมะ: ใช้ลูปลมของหมอก (ยังไม่มีเสียงพายุหิมะเฉพาะ)
  // พายุทราย (ขั้น 5): เฉพาะทะเลทราย — อยู่ในโซน = ดังเต็ม · ข้างนอกได้ยินแว่วๆ ตามระยะจากขอบโซน
  if (weather === "eos_sand") {
    const inside = zone === "desert" || zone === "hammerhead";
    const d = pos ? Math.max(0, 13 - pos.x, 20 - pos.y) : 10;
    out.wx_sandstorm_loop = inside ? 1 : Math.max(0, Math.round((0.5 - d * 0.06) * 10) / 10);
  }
  if (dome && dome.rect) {
    const [x0, y0, x1, y1] = dome.rect;
    const inside = pos && pos.x >= x0 && pos.x <= x1 && pos.y >= y0 && pos.y <= y1;
    out.dome_hum = inside ? 0.7 : 0.3;
  }
  if (pos) for (const b of NEAR_BEDS) {
    const d = Math.min(...b.at.map(([x, y]) => Math.hypot(pos.x - x, pos.y - y)));
    if (d >= b.r) continue;
    const g = Math.round(b.gain * (night || !b.day ? 1 : b.day) * (1 - d / (b.r + 0.5)) * 10) / 10; // ปัดทีละ 0.1 — ไม่ตั้งลูปใหม่ทุกก้าวเล็กๆ
    if (g > 0) out[b.key] = g;
  }
  return out;
}

// ---------- เลือกเพลงจาก state (Claude ตั้งกติกาเอง 2026-11-09 · GRID_PLAN §8.6 · GAME_SYSTEM §51) ----------
//  PVE (ผู้ใช้สั่ง 2026-11-10): "ตึงเครียด" = เห็นมอนเตอร์ในระยะแต่ยังไม่เข้ามาตี · เพลงล่าไม่ใช้แล้ว
//  ลำดับ: ต่อสู้ > ตึงเครียด > สำรวจ (กลางวัน/กลางคืนตาม state.fodlan.board.night)
//  - ต่อสู้ (battle_day/battle_night): มีฉากตี (state.attack) ที่ผู้เล่นเป็นคนตีหรือโดนตี · หรือ HP ของเรา/เพื่อน/ศัตรูที่มองเห็นลดลง
//      → ค้างไว้ตลอดเทิร์นนั้น + เทิร์นถัดไป (roundNumber ≤ เทิร์นที่ปะทะ + 1) และอย่างน้อย 20 วิ
//  - ล่า (hunt): เห็นศัตรูที่เป็นฝ่ายนำแต้มเสาเดี่ยวๆ (board.scores อันดับ 1 แต้ม > 0 และมากกว่าอันดับ 2 — "ค่าหัว")
//      หรือเห็นศัตรูที่ HP ≤ ครึ่ง และน้อยกว่า HP เรา อยู่ห่าง (แมนฮัตตัน) ≤ ระยะเดินเรา + 1
//  - ตึงเครียด (tension): เห็นศัตรูอย่างน้อย 1 คน (server ส่ง pos เฉพาะคนในระยะมองเห็น = ระยะเดิน + 4)
//  - สำรวจ (day/night): อื่นๆ · ตัวเราล้มอยู่ (มองเห็นทั้งแผนที่) = ไม่นับ ล่า/ตึงเครียด
//  กันกระพริบ: อยู่โหมดเดิมอย่างน้อย 8 วิ ก่อนสลับ (ยกเว้นเข้าโหมดต่อสู้ = ทันที)
//  pick(state, nowMs) → { key, recheckMs } — recheckMs = เรียกใหม่หลังเวลานี้แม้ state ไม่เปลี่ยน (ครบเวลาค้าง)
const MUSIC_HOLD_MS = 8000;
const BATTLE_MIN_MS = 20000;
export function eosMusicPicker() {
  let mode = null, since = 0, hitRound = -99, hitAt = -1e12;
  let hp = new Map();
  return (state, nowMs) => {
    const board = (state && state.fodlan && state.fodlan.board) || {};
    const night = !!board.night;
    const players = (state && state.players) || [];
    const me = players.find((p) => p.id === state.youId) || null;
    const isMob = (p) => !!(p.summon && p.summon.kind === "eosMob");
    const ally = (p) => !!me && !isMob(p) && (p.id === me.id || sameSide(p, me) || !!board.pve || (!!me.teamId && p.teamId === me.teamId));
    const sight = me && me.pos ? (me.mov | 0) + 4 : 0; // ระยะมองเห็นเดิม = ระยะเดิน + 4
    const near = (p) => !!(me && me.pos && p.pos) && Math.abs(p.pos.x - me.pos.x) + Math.abs(p.pos.y - me.pos.y) <= sight;
    const seen = (p) => p.alive && !!p.pos && near(p);
    const round = state.roundNumber | 0;
    const ids = new Set(players.map((p) => p.id));

    // ปะทะ: HP ลด (เรา/เพื่อน หรือศัตรูที่เห็น) · ฉากตีที่มีผู้เล่นเกี่ยว
    // ปะทะ = เลือด+เกราะลด (เดิมดูแค่เลือด — สกิลผลัก/พุ่งชนที่โดนเกราะก่อนไม่เปลี่ยนเพลง: ผู้ใช้แจ้ง 2026-11-10)
    //  + ศัตรูที่เห็นถูกย้ายตำแหน่งระหว่างตาเดินของเรา (ผลัก/ดึง/กระเด็น — มอนเดินเองแค่ต้นเทิร์น)
    const myTurn = !!me && state.actorId === me.id;
    const next = new Map();
    for (const p of players) {
      if (typeof p.hp !== "number" || !((ally(p) && (p.id === me.id || near(p))) || seen(p))) continue; // PVE: เพื่อนไกลๆ โดนตี ไม่ใช่การต่อสู้ของเรา
      const was = hp.get(p.id), now = { v: (p.hp || 0) + (p.armor || 0), x: p.pos ? p.pos.x : null, y: p.pos ? p.pos.y : null };
      if (was != null && now.v < was.v) { hitRound = round; hitAt = nowMs; }
      if (was != null && myTurn && !ally(p) && (now.x !== was.x || now.y !== was.y)) { hitRound = round; hitAt = nowMs; }
      next.set(p.id, now);
    }
    hp = next;
    const a = state.attack;
    const byId = (id) => players.find((p) => p.id === id);
    if (a && [a.byId, a.targetId].some((id) => { const p = byId(id); return p && (ally(p) ? p.id === (me && me.id) || near(p) : seen(p)); })) { hitRound = round; hitAt = nowMs; }
    void ids;
    const sinceHit = nowMs - hitAt;
    const battle = round - hitRound <= 1 || sinceHit < BATTLE_MIN_MS;

    // เพลงที่ผู้ใช้ส่งมา 2026-11-10: ราชาปีศาจ/คืนสุดท้าย = Apocalypsis Noctis · หุ่นเกราะในระยะ = Veiled in Black ·
    //  มีค่าหัว = Hunt or Be Hunted · เดินเล่นในเมือง/ทะเลสาบ = เพลงประจำโซน
    const bossOn = !!(board.boss && (board.daemons || []).some((d) => d.id === board.boss && (!me || !me.pos || Math.abs(d.x - me.pos.x) + Math.abs(d.y - me.pos.y) <= sight + 4)));
    const mechNear = (board.mobs || []).some((m) => m.trait === "mech" && me && me.pos && Math.abs(m.x - me.pos.x) + Math.abs(m.y - me.pos.y) <= sight);
    const bounty = !!(me && me.fodlan && Array.isArray(me.fodlan.badges) && me.fodlan.badges.some((b) => b.key === "bounty"));
    let want = "explore";
    if (board.final || bossOn) want = "boss";
    else if (mechNear) want = "mech";
    else if (battle) want = "battle";
    else if (me && me.alive && me.pos) {
      if (players.some((p) => seen(p) && !ally(p))) want = bounty ? "hunt" : "tension";
      else if (bounty) want = "hunt";
    }

    const waits = [];
    if (mode == null || (want !== mode && (want === "battle" || nowMs - since >= MUSIC_HOLD_MS))) {
      if (want !== mode) { mode = want; since = nowMs; }
    } else if (want !== mode) waits.push(MUSIC_HOLD_MS - (nowMs - since));
    // ต่อสู้ที่ค้างด้วยเวลาขั้นต่ำ (เทิร์นผ่านไปแล้ว): เช็กใหม่ตอนครบ 20 วิ
    if (battle && round - hitRound > 1) waits.push(BATTLE_MIN_MS - sinceHit);

    const zone = me && me.pos ? eosZoneAt(me.pos.x, me.pos.y) : "wild";
    const ZONE_SONG = { altissia: "altissia", hammerhead: "hammerhead", insomnia: "lestallum" };
    const explore = ZONE_SONG[zone] || (zone === "lake" && !night ? "galdin" : night ? "night" : "day");
    const key = mode === "boss" ? "boss" : mode === "mech" ? "mech" : mode === "battle" ? (night ? "battle_night" : "battle_day") : mode === "hunt" ? "hunt" : mode === "tension" ? "tension" : explore;
    const w = waits.filter((v) => v > 0);
    return { key, recheckMs: w.length ? Math.ceil(Math.min(...w)) + 50 : 0 };
  };
}
