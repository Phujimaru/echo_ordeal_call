// ============================================================
//  เสียงบรรยากาศ + เสียงเอฟเฟกต์ของโหมด Fodlan (GRID_PLAN §8.5) — Web Audio API ล้วน (ลูปต่อกันไม่มีรอยต่อ)
//  ไฟล์: /fodlan/sfx/<key>.mp3 (ไฟล์ Mixkit — ดู .claude/plans/fodlan-sfx-sources.md) · ไม่มีไฟล์/404 = ข้ามเงียบๆ
//
//  const fa = fodlanAudio();               // ตัวเดียวทั้งหน้า
//  fa.preload(keys)                        // Promise — โหลด+ถอดรหัสไว้ก่อน
//  fa.setStage(id, { weather, fade })      // ค่อยๆ สลับเสียงพื้นไปของด่านนี้ (amb + wx ตอนมีสภาพอากาศ · ด่าน IV มีกองไฟเบาๆ) · null = จางออกหมด
//  fa.sfx(key, { gain, delay })            // เสียงครั้งเดียว
//  fa.thunder(on)                          // ฟ้าร้องสุ่มทุก 7–15 วิ (ด่าน I ฝนตก)
//  fa.stop(fade)                           // จางออกทั้งหมด + หยุดฟ้าร้อง
//  fa.duck(k, ms)                          // หรี่เสียงพื้น (คูณ k) ระหว่างเสียงใหญ่
//
//  ทางเดินเสียง: ลูปพื้น → gain ต่อลูป → bedBus (0.5) ┐
//                เสียงครั้งเดียว → sfxBus (0.8)                     ┴→ master (ตามหลอดเสียงของเกม) → hold → ลำโพง
//  hold = 0 ระหว่างเพลงถูกพัก (suspendMusic — วีดีโอท่า/เพลงประจำฉาก) แบบเดียวกับเพลงด่าน · คืนเสียงเมื่อปล่อย
//  ทุกอย่างห่อ try/catch — เสียงพังห้ามทำให้ฉากพัง
// ============================================================
import { masterGain, onVolumeChange, isMusicSuspended, onMusicSuspend } from "../audio";
import { FODLAN_STAGES } from "./stages";

const BED_BASE = 0.5;    // ไฟล์เสียงพื้น −22 LUFS (−6 dB ≈ −28) · เพลงด่าน −11.3 × MUSIC_BASE 0.75 ≈ −13.8 → เพลงดังกว่าเสียงพื้นชัดเจน ~14 dB (ซ้อนฝน/ลมอีกชั้นยังห่าง ~11 dB)
//  ผู้ใช้ลองแล้ว (2026-10-27): ที่ 1.4 "แทบไม่ได้ยินเพลง เสียงฉากดังกว่า" — ฝน/ลมเป็นเสียงกว้างทั้งย่าน ฟังดังกว่าตัวเลข LUFS
const SFX_BASE = 0.8;    // เสียงครั้งเดียวของด่าน (ฟ้าผ่า ธนู มังกร …) — ไม่ให้กลบเพลง
const CAMPFIRE_GAIN = 0.35;
const THUNDER_GAIN = 0.6;
const HOLD_OUT = 0.12, HOLD_IN = 0.8; // วินาที: เงียบเร็วตอนวีดีโอเริ่ม · ค่อยๆ กลับหลังวีดีโอจบ
const url = (key) => `/fodlan/sfx/${key}.mp3`;

let instance = null;

export function fodlanAudio() {
  if (instance) return instance;

  let ctx = null, master = null, hold = null, bedBus = null, sfxBus = null;
  const buffers = new Map();   // key → AudioBuffer | null (null = โหลดไม่ได้)
  const loading = new Map();   // key → Promise<AudioBuffer|null>
  const beds = new Map();      // key → { src, gain, target }
  let stageKey = null;         // "id|weather" ที่ตั้งไว้ล่าสุด
  let thunderTimer = 0;
  let duckK = 1;

  const now = () => ctx.currentTime;

  function ensure() {
    if (ctx) return ctx;
    const AC = typeof window !== "undefined" ? (window.AudioContext || window.webkitAudioContext) : null;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = masterGain();
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
    onVolumeChange(() => { try { master.gain.setTargetAtTime(masterGain(), now(), 0.05); } catch { /* ไม่เป็นไร */ } });
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

  function setStage(stageId, { weather = false, fade = 2.5 } = {}) {
    try {
      const k = stageId == null ? null : `${stageId}|${weather ? 1 : 0}`;
      if (k === stageKey) return;
      stageKey = k;
      if (!ensure()) return;
      const want = new Map();
      const st = stageId == null ? null : FODLAN_STAGES[stageId - 1];
      if (st) {
        if (st.amb) want.set(st.amb, 1);
        if (weather && st.wx) want.set(st.wx, 1);
        if (st.id === 4 && !weather) want.set("campfire", CAMPFIRE_GAIN);
      }
      for (const key of [...beds.keys()]) if (!want.has(key)) killBed(key, fade);
      for (const [key, g] of want) startBed(key, g, fade);
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
    load("wx_thunder"); load("wx_thunder2");
    const next = () => {
      thunderTimer = setTimeout(() => {
        sfx(Math.random() < 0.5 ? "wx_thunder" : "wx_thunder2", { gain: THUNDER_GAIN });
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
      stageKey = null;
      for (const key of [...beds.keys()]) killBed(key, fade);
    } catch { /* ไม่เป็นไร */ }
  }

  function preload(keys) {
    try { return Promise.all((keys || []).map((k) => load(k))).then(() => undefined); } catch { return Promise.resolve(); }
  }

  instance = { preload, setStage, sfx, thunder, stop, duck };
  return instance;
}
