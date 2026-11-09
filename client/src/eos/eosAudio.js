// ============================================================
//  เสียงบรรยากาศ + เสียงเอฟเฟกต์ของสนาม Eos (GRID_PLAN §8.6) — Web Audio API (ทางเดินเสียงแบบเดียวกับ fodlan/fodlanAudio.js)
//  ไฟล์: /eos/sfx/<key>.mp3 (Mixkit — รายการต้นทาง Downloads/eos/sfx/manifest.csv · ตัด/ปรับความดังแล้ว) · ไม่มีไฟล์ = ข้ามเงียบๆ
//
//  const ea = eosAudio();
//  ea.setBeds({ amb_forest_day: 1, wx_rain_loop: 0.8 }, { fade })   // ลูปพื้นตามโซน/กลางคืน/สภาพอากาศ (App.jsx)
//  ea.sfx(key, { gain, delay })   ea.thunder(on)   ea.stop(fade)   ea.duck(k, ms)
// ============================================================
import { masterGain, channelGain, onVolumeChange, isMusicSuspended, onMusicSuspend } from "../audio";

const BED_BASE = 0.5;    // ไฟล์เสียงพื้น −22 LUFS (−6 dB ≈ −28) · เพลงด่าน −11.3 × MUSIC_BASE 0.75 ≈ −13.8 → เพลงดังกว่าเสียงพื้นชัดเจน ~14 dB (ซ้อนฝน/ลมอีกชั้นยังห่าง ~11 dB)
//  ผู้ใช้ลองแล้ว (2026-10-27): ที่ 1.4 "แทบไม่ได้ยินเพลง เสียงฉากดังกว่า" — ฝน/ลมเป็นเสียงกว้างทั้งย่าน ฟังดังกว่าตัวเลข LUFS
const SFX_BASE = 0.8;    // เสียงครั้งเดียวของด่าน (ฟ้าผ่า ธนู มังกร …) — ไม่ให้กลบเพลง
const THUNDER_GAIN = 0.6;
const HOLD_OUT = 0.12, HOLD_IN = 0.8; // วินาที: เงียบเร็วตอนวีดีโอเริ่ม · ค่อยๆ กลับหลังวีดีโอจบ
const url = (key) => `/eos/sfx/${key}.mp3`;

let instance = null;

export function eosAudio() {
  if (instance) return instance;

  let ctx = null, master = null, hold = null, bedBus = null, sfxBus = null;
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
    onVolumeChange(() => { try { master.gain.setTargetAtTime(masterGain() * channelGain("music"), now(), 0.05); } catch { /* ไม่เป็นไร */ } });
    onMusicSuspend((on) => {
      try {
        const p = hold.gain;
        p.cancelScheduledValues(now());
        p.setValueAtTime(p.value, now());
        p.linearRampToValueAtTime(on ? 0 : 1, now() + (on ? HOLD_OUT : HOLD_IN));
      } catch { /* ไม่เป็นไร */ }
    });
    // เบราว์เซอร์ยังไม่ให้เล่นเสียงเอง → ปลุกตอนผู้เล่นแตะจอ/กดปุ่มครั้งแรก
    const resume = () => { if (ctx.state === "suspended") ctx.resume().catch(() => {}); };
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

  function sfx(key, { gain = 1, delay = 0 } = {}) {
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
          src.start(now() + Math.max(0, delay));
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
    } catch { /* ไม่เป็นไร */ }
  }

  function preload(keys) {
    try { return Promise.all((keys || []).map((k) => load(k))).then(() => undefined); } catch { return Promise.resolve(); }
  }

  instance = { preload, setBeds, sfx, thunder, stop, duck };
  return instance;
}

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
  if (dome && dome.rect) {
    const [x0, y0, x1, y1] = dome.rect;
    const inside = pos && pos.x >= x0 && pos.x <= x1 && pos.y >= y0 && pos.y <= y1;
    out.dome_hum = inside ? 0.7 : 0.3;
  }
  return out;
}
