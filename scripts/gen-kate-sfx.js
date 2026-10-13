// สร้างเสียงเอฟเฟกต์ของ เคท & เอมิลิโกะ (ke_*) ด้วยการสังเคราะห์ล้วน — ไม่มีไฟล์ต้นฉบับ ไม่ดาวน์โหลดอะไร
//  รัน: node scripts/gen-kate-sfx.js [--wav] [ชื่อเสียง ...]
//  ผลลัพธ์: client/public/characters/kate_emiliko/sfx/ke_*.mp3 (mono 44.1 kHz · ต้องมี ffmpeg บน PATH)
//   --wav หรือไม่มี ffmpeg = เขียน .wav แทน (ต้องแก้ path ใน client/src/audio.js ให้ตรงด้วย)
//  ผลลัพธ์เหมือนเดิมทุกครั้ง (สุ่มด้วย seed จากชื่อเสียง) · ความดัง: RMS ช่วงที่มีเสียง ≈ -16 dBFS, peak ≤ -2 dBFS
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const SR = 44100;
const OUT_DIR = path.join(__dirname, "..", "client", "public", "characters", "kate_emiliko", "sfx");
const TAU = Math.PI * 2;

// ---------- พื้นฐาน ----------
function rng(seed) { // mulberry32
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
const buf = (sec) => new Float32Array(Math.max(1, Math.ceil(sec * SR)));
const lerp = (a, b, x) => a + (b - a) * x;
const expGlide = (f0, f1, x) => f0 * Math.pow(f1 / f0, Math.min(1, Math.max(0, x)));
const rr = (r, a, b) => a + (b - a) * r();

function mix(dst, src, at = 0, gain = 1) {
  const o = Math.round(at * SR);
  for (let i = 0; i < src.length && o + i < dst.length; i++) if (o + i >= 0) dst[o + i] += src[i] * gain;
  return dst;
}
function applyEnv(b, f) { for (let i = 0; i < b.length; i++) b[i] *= f(i / SR); return b; }
// เส้นโค้งระฆัง: ขึ้นถึงยอดที่ p (0..1) แล้วลง
function bell(x, p = 0.5, up = 2, down = 1.5) {
  if (x <= 0 || x >= 1) return 0;
  return x < p ? Math.pow(x / p, up) : Math.pow((1 - x) / (1 - p), down);
}
// envelope แบบจุด [[t, v], ...] เส้นตรง
function pts(list) {
  return (t) => {
    if (t <= list[0][0]) return list[0][1];
    for (let i = 1; i < list.length; i++) {
      if (t <= list[i][0]) { const [t0, v0] = list[i - 1]; const [t1, v1] = list[i]; return lerp(v0, v1, (t - t0) / (t1 - t0)); }
    }
    return list[list.length - 1][1];
  };
}
// LFO นุ่ม ๆ แบบสุ่ม (ผลรวมไซน์) ค่า -1..1 โดยประมาณ
function smoothRand(r, rate) {
  const parts = [0, 1, 2].map((k) => ({ f: rate * rr(r, 0.6, 1.4) * (1 + k * 0.73), p: r() * TAU, a: 1 / (k + 1) }));
  const norm = parts.reduce((s, p) => s + p.a, 0);
  return (t) => parts.reduce((s, p) => s + p.a * Math.sin(TAU * p.f * t + p.p), 0) / norm;
}

// ---------- ตัวกำเนิดเสียง ----------
function noise(r, sec) { const b = buf(sec); for (let i = 0; i < b.length; i++) b[i] = r() * 2 - 1; return b; }
function brown(r, sec) {
  const b = buf(sec); let y = 0;
  for (let i = 0; i < b.length; i++) { y = y * 0.995 + (r() * 2 - 1) * 0.1; b[i] = y; }
  return b;
}
// ออสซิลเลเตอร์ความถี่แปรได้ — f = ตัวเลข หรือฟังก์ชันของเวลา
function osc(sec, f, type = "sine", phase = 0) {
  const b = buf(sec); let ph = phase;
  const ff = typeof f === "function" ? f : () => f;
  for (let i = 0; i < b.length; i++) {
    const x = ph - Math.floor(ph);
    switch (type) {
      case "saw": b[i] = 2 * x - 1; break;
      case "tri": b[i] = 1 - 4 * Math.abs(x - 0.5); break;
      case "square": b[i] = x < 0.5 ? 1 : -1; break;
      default: b[i] = Math.sin(TAU * x);
    }
    ph += ff(i / SR) / SR;
  }
  return b;
}
// biquad (RBJ) — type lp/hp/bp · f = ตัวเลขหรือฟังก์ชันของเวลา (คำนวณสัมประสิทธิ์ใหม่ทุก 16 ตัวอย่าง)
function filt(b, type, f, Q = 0.707) {
  const ff = typeof f === "function" ? f : () => f;
  let b0, b1, b2, a1, a2, x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const coef = (fc) => {
    fc = Math.min(SR * 0.45, Math.max(20, fc));
    const w = TAU * fc / SR, c = Math.cos(w), al = Math.sin(w) / (2 * Q), a0 = 1 + al;
    if (type === "lp") { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
    else if (type === "hp") { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
    else { b0 = al; b1 = 0; b2 = -al; }
    b0 /= a0; b1 /= a0; b2 /= a0; a1 = (-2 * c) / a0; a2 = (1 - al) / a0;
  };
  for (let i = 0; i < b.length; i++) {
    if ((i & 15) === 0) coef(ff(i / SR));
    const x = b[i];
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y; b[i] = y;
  }
  return b;
}
// ระฆัง/โลหะ/แก้ว: ผลรวมไซน์ที่จางคนละเร็ว
function ping(freqs, taus, amps, sec) {
  const len = sec || Math.max(...taus) * 6;
  const b = buf(len);
  freqs.forEach((f, k) => {
    const tau = taus[k] ?? taus[0], a = amps?.[k] ?? 1 / (k + 1);
    for (let i = 0; i < b.length; i++) {
      const t = i / SR;
      b[i] += a * Math.sin(TAU * f * t) * Math.exp(-t / tau) * Math.min(1, t / 0.0015);
    }
  });
  return b;
}
// ตุ้บ: ไซน์ที่ความถี่ตกลง
function thump(f0, f1, glide, tau) {
  const b = osc(Math.max(glide, tau * 6), (t) => expGlide(f0, f1, t / glide));
  return applyEnv(b, (t) => Math.exp(-t / tau) * Math.min(1, t / 0.002));
}
// หยดน้ำ: ไซน์ที่ความถี่ไต่ขึ้นเร็ว ๆ แล้วหายไป
function droplet(f0, dur = 0.05) {
  const b = osc(dur * 1.5, (t) => f0 * Math.exp((Math.log(2.4) * t) / dur));
  return applyEnv(b, (t) => Math.min(1, t / 0.001) * Math.exp(-t / (dur / 3)));
}
// เสียงลมพัดผ่าน: noise ผ่าน bandpass ที่ความถี่กวาด
function whoosh(r, dur, fA, fB, { Q = 1, peak = 0.5, fC = null, up = 2, down = 1.5 } = {}) {
  const b = noise(r, dur);
  const f = fC == null
    ? (t) => expGlide(fA, fB, t / dur)
    : (t) => (t / dur < peak ? expGlide(fA, fB, t / dur / peak) : expGlide(fB, fC, (t / dur - peak) / (1 - peak)));
  filt(b, "bp", f, Q);
  filt(b, "bp", f, Q * 0.7);
  return applyEnv(b, (t) => bell(t / dur, peak, up, down));
}
// ประกายเขม่า/ไฟแตก: แรงกระตุ้นสั้น ๆ สุ่มตำแหน่ง
function crackle(r, sec, rate, { f = 2500, Q = 0.8, amp = (t) => 1 } = {}) {
  const b = buf(sec);
  let t = 0;
  while (true) {
    t += -Math.log(1 - r()) / rate;
    if (t >= sec) break;
    const len = Math.floor(rr(r, 0.0015, 0.006) * SR), o = Math.floor(t * SR), a = rr(r, 0.3, 1) * amp(t);
    for (let i = 0; i < len && o + i < b.length; i++) b[o + i] += (r() * 2 - 1) * a * Math.exp(-i / (len / 3));
  }
  return filt(b, "bp", f, Q);
}
// เปลี่ยนค่าแบบขั้นบันไดสุ่ม (ทำเสียงหยาบ/ขนนก)
function sampleHold(r, sec, rate) {
  const b = buf(sec), step = Math.max(1, Math.floor(SR / rate));
  let v = 0;
  for (let i = 0; i < b.length; i++) { if (i % step === 0) v = r(); b[i] = v; }
  return b;
}
function mul(a, b) { for (let i = 0; i < a.length && i < b.length; i++) a[i] *= b[i]; return a; }

// ---------- reverb (Freeverb mono) ----------
function reverb(b, { wet = 0.3, room = 0.84, damp = 0.3, tail = 0.8, predelay = 0.012 } = {}) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((n) => ({ d: new Float32Array(n), i: 0, s: 0 }));
  const aps = [556, 441, 341, 225].map((n) => ({ d: new Float32Array(n), i: 0 }));
  const pd = Math.max(1, Math.floor(predelay * SR));
  const out = new Float32Array(b.length + Math.floor(tail * SR));
  for (let i = 0; i < out.length; i++) {
    const x = (i - pd >= 0 && i - pd < b.length ? b[i - pd] : 0) * 0.015;
    let s = 0;
    for (const c of combs) {
      const y = c.d[c.i];
      c.s = y * (1 - damp) + c.s * damp;
      c.d[c.i] = x + c.s * room;
      c.i = (c.i + 1) % c.d.length;
      s += y;
    }
    for (const a of aps) {
      const y = a.d[a.i];
      a.d[a.i] = s + y * 0.5;
      a.i = (a.i + 1) % a.d.length;
      s = y - s;
    }
    out[i] = (i < b.length ? b[i] : 0) + s * wet * 3;
  }
  return out;
}

// ---------- ปิดงาน: ตัด DC/หางเงียบ เฟด ปรับความดัง จำกัด peak ----------
function finish(b, { rmsDb = -16, peak = 0.79, maxSec = 3.4 } = {}) {
  filt(b, "hp", 30, 0.707);
  let end = Math.min(b.length, Math.floor(maxSec * SR));
  let mx = 0; for (let i = 0; i < end; i++) mx = Math.max(mx, Math.abs(b[i]));
  const floor = mx * 0.005; // -46 dB จากยอด (หางรีเวิร์บที่เบากว่านี้ตัดทิ้ง)
  while (end > 1 && Math.abs(b[end - 1]) < floor) end--;
  end = Math.min(b.length, end + Math.floor(0.02 * SR));
  const o = b.slice(0, end);
  const fade = Math.min(Math.floor(0.08 * SR), o.length);
  for (let i = 0; i < fade; i++) o[o.length - 1 - i] *= i / fade;
  // RMS เฉพาะบล็อก 20 ms ที่ดังกว่า -40 dB จากยอด
  const blk = Math.floor(0.02 * SR); let sum = 0, n = 0;
  for (let s = 0; s < o.length; s += blk) {
    let e = 0; const m = Math.min(o.length, s + blk);
    for (let i = s; i < m; i++) e += o[i] * o[i];
    const rms = Math.sqrt(e / (m - s));
    if (rms > mx * 0.01) { sum += e; n += m - s; }
  }
  const rms = Math.sqrt(sum / Math.max(1, n));
  let pk = 0; for (const v of o) pk = Math.max(pk, Math.abs(v));
  const g = Math.min(Math.pow(10, rmsDb / 20) / rms, (peak * 1.8) / pk); // ยอมบีบยอดได้ไม่เกิน ~5 dB
  const knee = peak * 0.75, room = peak - knee;
  for (let i = 0; i < o.length; i++) {
    const v = o[i] * g, a = Math.abs(v);
    o[i] = a <= knee ? v : Math.sign(v) * (knee + room * Math.tanh((a - knee) / room));
  }
  return o;
}

function writeWav(file, b) {
  const data = Buffer.alloc(b.length * 2);
  for (let i = 0; i < b.length; i++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, b[i])) * 32767), i * 2);
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + data.length, 4); h.write("WAVE", 8);
  h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write("data", 36); h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, data]));
}

// ---------- เสียงแต่ละตัว ----------
const SOUNDS = {
  // กระจกเงา: ประกายแก้ว + ลมวูบสลับทิศ
  ke_mirror(r) {
    const o = buf(1.1);
    const notes = [1568, 2093, 2349, 2637, 3136, 3520, 4186];
    for (let k = 0; k < 12; k++) {
      const f = notes[Math.floor(r() * notes.length)] * rr(r, 0.997, 1.003);
      mix(o, ping([f, f * 2.76, f * 5.4], [0.32, 0.12, 0.05], [1, 0.25, 0.08]), rr(r, 0, 0.55) * (k / 12) + 0.02, 0.12);
    }
    mix(o, whoosh(r, 0.32, 3200, 900, { Q: 1.6, peak: 0.7 }), 0, 0.9);
    mix(o, whoosh(r, 0.34, 900, 3600, { Q: 1.6, peak: 0.35 }), 0.3, 0.9);
    mix(o, ping([1047, 1568, 2093], [0.45, 0.35, 0.3], [0.6, 0.5, 0.4]), 0.3, 0.35);
    return reverb(o, { wet: 0.45, room: 0.88, tail: 0.9 });
  },
  // ตื่นขึ้นอีกครั้ง: เสียงต่ำไต่ขึ้น + ลมพุ่งขึ้น + คอร์ดระฆังเมเจอร์
  ke_revive(r) {
    const o = buf(1.6);
    const drone = osc(1.2, (t) => expGlide(110, 220, t / 1.0), "saw");
    filt(drone, "lp", (t) => expGlide(300, 1800, t / 1.0), 1.2);
    mix(o, applyEnv(drone, (t) => bell(t / 1.2, 0.8, 1.5, 2)), 0, 0.5);
    mix(o, applyEnv(osc(1.2, (t) => expGlide(220, 440, t / 1.0)), (t) => bell(t / 1.2, 0.8, 1.5, 2)), 0, 0.3);
    mix(o, whoosh(r, 1.0, 300, 4500, { Q: 1.4, peak: 0.9, up: 1.5, down: 3 }), 0, 0.8);
    mix(o, ping([880, 1109, 1319, 1760, 2637], [0.6, 0.55, 0.5, 0.45, 0.3], [1, 0.8, 0.8, 0.6, 0.3]), 0.92, 0.45);
    mix(o, thump(160, 70, 0.15, 0.08), 0.92, 0.5);
    return reverb(o, { wet: 0.4, room: 0.86, tail: 0.9 });
  },
  // เปลี่ยนเป็นไม้ถูพื้น: วูบ + ผ้าเปียกตบ
  ke_w_mop(r) {
    const o = buf(0.5);
    mix(o, whoosh(r, 0.18, 600, 2500, { Q: 1.2, peak: 0.6 }), 0, 0.8);
    mix(o, thump(260, 110, 0.12, 0.04), 0.15, 0.6);
    const sq = noise(r, 0.15); filt(sq, "lp", 1500, 0.9); filt(sq, "bp", 900, 1);
    mix(o, applyEnv(sq, (t) => Math.exp(-t / 0.04) * (0.6 + 0.4 * Math.sin(TAU * 32 * t))), 0.15, 1.3);
    mix(o, droplet(700, 0.04), 0.21, 0.3);
    mix(o, droplet(1000, 0.035), 0.28, 0.25);
    return reverb(o, { wet: 0.15, room: 0.7, tail: 0.3 });
  },
  // เปลี่ยนเป็นแจกันน้ำ: เซรามิกกริ๊ง + น้ำกระฉอก
  ke_w_vase(r) {
    const o = buf(0.55);
    mix(o, ping([1760, 2950, 4410, 6020], [0.18, 0.12, 0.08, 0.05], [1, 0.6, 0.4, 0.25]), 0, 0.5);
    const sl = noise(r, 0.38); filt(sl, "lp", 900, 1.2);
    mix(o, applyEnv(sl, (t) => bell(t / 0.38, 0.25) * (0.55 + 0.45 * Math.sin(TAU * 9 * t))), 0.04, 1.4);
    for (let k = 0; k < 3; k++) mix(o, droplet(rr(r, 600, 1300), rr(r, 0.03, 0.05)), rr(r, 0.1, 0.38), 0.22);
    return reverb(o, { wet: 0.2, room: 0.72, tail: 0.35 });
  },
  // เปลี่ยนเป็นเครื่องดูดฝุ่น: กดสวิตช์ + มอเตอร์หมุนขึ้น
  ke_w_vacuum(r) {
    const o = buf(0.75);
    const click = noise(r, 0.008); filt(click, "hp", 2000);
    mix(o, applyEnv(click, (t) => Math.exp(-t / 0.002)), 0, 0.8);
    const mf = (t) => expGlide(60, 190, t / 0.4);
    const motor = osc(0.7, mf, "saw"); filt(motor, "lp", 1200, 1.4);
    const env = (t) => Math.min(1, t / 0.05) * Math.min(1, (0.7 - t) / 0.15);
    mix(o, applyEnv(motor, env), 0.01, 0.6);
    mix(o, applyEnv(osc(0.7, (t) => mf(t) * 8), env), 0.01, 0.08);
    const air = noise(r, 0.7); filt(air, "bp", (t) => expGlide(500, 2500, t / 0.5), 0.8);
    mix(o, applyEnv(air, env), 0.01, 0.7);
    return reverb(o, { wet: 0.1, room: 0.6, tail: 0.25 });
  },
  // เปลี่ยนเป็นดาบเขม่า: เงาก่อตัว + เสียงโลหะชิ้ง
  ke_w_sword(r) {
    const o = buf(0.8);
    const low = brown(r, 0.5); filt(low, "lp", 220, 1);
    mix(o, applyEnv(low, (t) => bell(t / 0.5, 0.45)), 0, 1.4);
    mix(o, applyEnv(osc(0.5, 55), (t) => bell(t / 0.5, 0.45)), 0, 0.35);
    mix(o, crackle(r, 0.3, 60, { f: 2200 }), 0, 0.35);
    mix(o, ping([2400, 3770, 5230, 7110], [0.32, 0.24, 0.16, 0.1], [1, 0.7, 0.45, 0.3]), 0.2, 0.32);
    const sh = noise(r, 0.2); filt(sh, "hp", (t) => expGlide(2000, 8000, t / 0.15), 0.9);
    mix(o, applyEnv(sh, (t) => Math.exp(-t / 0.05)), 0.19, 0.5);
    return reverb(o, { wet: 0.3, room: 0.8, tail: 0.5 });
  },
  // ดาบเขม่าย้ายมือ: วูบมืด + ขูดฝัก + ดังกังวาน
  ke_sword(r) {
    const o = buf(1.0);
    mix(o, whoosh(r, 0.25, 250, 900, { Q: 1, peak: 0.6 }), 0, 0.6);
    const sc = noise(r, 0.35); filt(sc, "bp", (t) => expGlide(3000, 6500, t / 0.35), 4);
    const jit = sampleHold(r, 0.35, 180);
    mix(o, applyEnv(mul(sc, jit.map((v) => 0.6 + 0.4 * v)), (t) => bell(t / 0.35, 0.7, 1.5, 1)), 0.05, 1.3);
    mix(o, ping([1870, 2960, 4410, 6280], [0.55, 0.4, 0.28, 0.18], [1, 0.7, 0.45, 0.3]), 0.36, 0.35);
    return reverb(o, { wet: 0.35, room: 0.82, tail: 0.6 });
  },
  // แส้เขม่า: ลมสะบัด → แตกเปรี๊ยะ
  ke_whip(r) {
    const o = buf(0.7);
    mix(o, whoosh(r, 0.17, 300, 3500, { Q: 1, peak: 0.92, up: 2.5, down: 1 }), 0, 0.9);
    const snap = noise(r, 0.006); filt(snap, "bp", 2800, 0.6);
    mix(o, applyEnv(snap, (t) => Math.exp(-t / 0.0012)), 0.168, 3);
    const cr = noise(r, 0.05); filt(cr, "hp", 1500, 0.8);
    mix(o, applyEnv(cr, (t) => Math.exp(-t / 0.006)), 0.168, 1.2);
    mix(o, ping([3100, 4700], [0.02, 0.012], [1, 0.6]), 0.168, 0.4);
    mix(o, thump(180, 90, 0.05, 0.03), 0.168, 0.3);
    mix(o, crackle(r, 0.3, 45, { f: 3000, amp: (t) => Math.exp(-t / 0.12) }), 0.18, 0.35);
    return reverb(o, { wet: 0.3, room: 0.75, tail: 0.45 });
  },
  // กางปีก: ปีกกระพือหนัก 3 ครั้ง + ขนนกกรอบ + ลมพุ่งบิน
  ke_wings(r) {
    const o = buf(1.75);
    mix(o, whoosh(r, 0.14, 1500, 4500, { Q: 0.8, peak: 0.85 }), 0, 0.25); // ปีกคลี่
    const flap = (at, g, len) => {
      const n = noise(r, len); filt(n, "lp", (t) => expGlide(900, 280, t / len), 0.8);
      mix(o, applyEnv(n, (t) => Math.min(1, t / 0.04) * Math.exp(-Math.max(0, t - 0.04) / 0.11)), at, 2.2 * g);
      mix(o, thump(80, 42, 0.22, 0.09), at + 0.02, 0.9 * g);
      const fe = noise(r, len); filt(fe, "hp", 3200, 0.7);
      mul(fe, sampleHold(r, len, 260).map((v) => (v > 0.55 ? v : 0.1)));
      mix(o, applyEnv(fe, (t) => Math.min(1, t / 0.02) * Math.exp(-t / 0.09)), at + 0.01, 0.35 * g);
    };
    flap(0.1, 1, 0.4);
    flap(0.43, 0.85, 0.35);
    flap(0.72, 0.75, 0.33);
    mix(o, whoosh(r, 0.95, 250, 1400, { Q: 0.9, peak: 0.4, fC: 450 }), 0.75, 1.4);
    mix(o, whoosh(r, 0.95, 500, 2800, { Q: 0.9, peak: 0.4, fC: 900 }), 0.75, 0.5);
    const rum = brown(r, 0.9); filt(rum, "lp", 150, 0.9);
    mix(o, applyEnv(rum, (t) => bell(t / 0.9, 0.35)), 0.75, 1.2);
    return reverb(o, { wet: 0.3, room: 0.85, tail: 0.6 });
  },
  // ระบำเขม่า (ท่าไม้ตาย): ตูมต่ำ → พายุหวีดหอนพองตัว → เสียงต่ำหลอน + เขม่าแตก → ซาลง
  ke_storm(r) {
    const D = 3.0;
    const o = buf(D);
    const swell = pts([[0, 0.15], [0.25, 0.35], [1.4, 1], [2.2, 0.9], [D, 0]]);
    mix(o, thump(70, 30, 0.9, 0.38), 0, 1.6);
    const imp = noise(r, 0.5); filt(imp, "lp", 450, 0.8);
    mix(o, applyEnv(imp, (t) => Math.exp(-t / 0.1)), 0, 1.6);
    const rum = brown(r, D); filt(rum, "lp", 120, 0.9);
    mix(o, applyEnv(rum, swell), 0, 1.4);
    for (const [base, Q, g] of [[300, 7, 1], [520, 9, 0.8], [850, 10, 0.55], [1350, 12, 0.3]]) {
      const lfo = smoothRand(r, 0.5);
      const h = noise(r, D);
      filt(h, "bp", (t) => base * (1 + 0.6 * Math.min(1, t / 1.5)) * (1 + 0.3 * lfo(t)), Q);
      mix(o, applyEnv(h, swell), 0, g * 2.4);
    }
    const gl = smoothRand(r, 1.1);
    const gust = noise(r, D);
    filt(gust, "bp", (t) => (t < 1.4 ? expGlide(400, 1800, t / 1.4) : expGlide(1800, 600, (t - 1.4) / 1.6)), 0.7);
    mix(o, applyEnv(gust, (t) => swell(t) * (0.65 + 0.35 * gl(t))), 0, 0.9);
    for (const f of [55, 58.27, 82.41]) {
      const d = osc(D, f * rr(r, 0.998, 1.002), "saw");
      filt(d, "lp", (t) => 200 + 300 * bell(t / D, 0.5, 1, 1), 1.5);
      mix(o, applyEnv(d, swell), 0, 0.22);
    }
    mix(o, thump(95, 38, 0.6, 0.25), 1.35, 1.0);
    mix(o, crackle(r, D, 70, { f: 2600, amp: (t) => 0.3 + 0.7 * swell(t) }), 0, 0.5);
    return reverb(o, { wet: 0.35, room: 0.9, damp: 0.35, tail: 0.6 });
  },
  // พายุต้นเทิร์น: ลมกระโชกสั้น + เขม่าแตกกระทบ
  ke_storm_tick(r) {
    const o = buf(0.6);
    mix(o, whoosh(r, 0.35, 400, 1200, { Q: 1, peak: 0.45, fC: 500 }), 0, 1);
    mix(o, thump(120, 60, 0.12, 0.06), 0.14, 0.7);
    mix(o, crackle(r, 0.25, 50, { f: 2600, amp: (t) => Math.exp(-t / 0.1) }), 0.14, 0.6);
    return reverb(o, { wet: 0.22, room: 0.8, tail: 0.4 });
  },
  // มองไม่ออก: เสียงเลื่อนลงแบบหลอน ๆ สั่นไหว + เสียงกระซิบพองตัว
  ke_masked(r) {
    const o = buf(1.0);
    const trem = (t) => 0.7 + 0.3 * Math.sin(TAU * 7 * t);
    const env = (t) => Math.min(1, t / 0.1) * Math.exp(-Math.max(0, t - 0.1) / 0.35);
    mix(o, applyEnv(osc(0.9, (t) => expGlide(880, 440, t / 0.7)), (t) => env(t) * trem(t)), 0, 0.4);
    mix(o, applyEnv(osc(0.9, (t) => expGlide(932, 466, t / 0.7)), (t) => env(t) * trem(t)), 0, 0.3);
    for (const [f, g] of [[1200, 1], [2600, 0.6]]) {
      const w = noise(r, 0.55); filt(w, "bp", f, 3);
      mix(o, applyEnv(w, (t) => bell(t / 0.55, 0.9, 2, 0.5)), 0, g * 0.9);
    }
    mix(o, thump(110, 55, 0.2, 0.08), 0.5, 0.45);
    return reverb(o, { wet: 0.5, room: 0.88, tail: 0.8 });
  },
  // ตีด้วยไม้ถูพื้น: ผ้าเปียกตบ + น้ำกระเด็น
  ke_hit_mop(r) {
    const o = buf(0.45);
    const s1 = noise(r, 0.15); filt(s1, "bp", 1100, 0.8);
    mix(o, applyEnv(s1, (t) => Math.exp(-t / 0.03)), 0, 1.4);
    const s2 = noise(r, 0.05); filt(s2, "hp", 3000, 0.7);
    mix(o, applyEnv(s2, (t) => Math.exp(-t / 0.012)), 0, 0.8);
    mix(o, thump(180, 80, 0.1, 0.05), 0, 0.8);
    const sq = noise(r, 0.2); filt(sq, "lp", 1500, 1);
    mix(o, applyEnv(sq, (t) => Math.exp(-t / 0.08) * (0.5 + 0.5 * Math.sin(TAU * 30 * t))), 0.02, 0.9);
    for (let k = 0; k < 4; k++) mix(o, droplet(rr(r, 800, 1600), rr(r, 0.025, 0.045)), rr(r, 0.05, 0.27), 0.2);
    return reverb(o, { wet: 0.15, room: 0.7, tail: 0.3 });
  },
  // ตีด้วยแจกัน: กระแทก + เซรามิกแตก + น้ำสาด
  ke_hit_vase(r) {
    const o = buf(0.95);
    mix(o, thump(150, 70, 0.12, 0.06), 0, 0.9);
    const imp = noise(r, 0.1); filt(imp, "lp", 2000, 0.8);
    mix(o, applyEnv(imp, (t) => Math.exp(-t / 0.02)), 0, 1);
    for (let k = 0; k < 26; k++) {
      const f = rr(r, 2500, 7000);
      mix(o, ping([f, f * rr(r, 1.3, 1.7)], [rr(r, 0.03, 0.12), 0.03], [1, 0.5]), Math.pow(r(), 2) * 0.28, rr(r, 0.08, 0.2));
    }
    const sh = noise(r, 0.4); filt(sh, "hp", 2500, 0.7);
    mix(o, applyEnv(sh, (t) => Math.exp(-t / 0.08)), 0, 0.5);
    const sp = noise(r, 0.7); filt(sp, "lp", (t) => expGlide(5000, 800, t / 0.4), 0.8);
    mix(o, applyEnv(sp, (t) => Math.min(1, t / 0.01) * Math.exp(-t / 0.2)), 0.02, 0.9);
    for (let k = 0; k < 8; k++) mix(o, droplet(rr(r, 600, 1700), rr(r, 0.025, 0.05)), rr(r, 0.1, 0.6), 0.18);
    return reverb(o, { wet: 0.2, room: 0.72, tail: 0.4 });
  },
  // ตีด้วยเครื่องดูดฝุ่น: มอเตอร์เร่ง + ลมดูดไต่ขึ้น → ป๊อบ
  ke_hit_vacuum(r) {
    const o = buf(0.95);
    const mf = (t) => expGlide(120, 260, t / 0.7);
    const env = (t) => Math.min(1, t / 0.05) * Math.min(1, Math.max(0, (0.74 - t) / 0.04));
    const motor = osc(0.75, mf, "saw"); filt(motor, "lp", 1500, 1.3);
    mix(o, applyEnv(motor, env), 0, 0.5);
    mix(o, applyEnv(osc(0.75, (t) => mf(t) * 8), env), 0, 0.07);
    const air = noise(r, 0.75); filt(air, "bp", (t) => expGlide(400, 3000, t / 0.72), 1.5);
    mix(o, applyEnv(air, (t) => env(t) * (0.3 + 0.7 * t / 0.72)), 0, 1.3);
    mix(o, thump(300, 80, 0.08, 0.035), 0.73, 0.9);
    const pop = noise(r, 0.02); filt(pop, "bp", 1500, 1);
    mix(o, applyEnv(pop, (t) => Math.exp(-t / 0.004)), 0.73, 1);
    return reverb(o, { wet: 0.12, room: 0.65, tail: 0.3 });
  },
  // ตีด้วยดาบเขม่า: ฟาดวูบ + กระทบโลหะ
  ke_hit_sword(r) {
    const o = buf(0.55);
    mix(o, whoosh(r, 0.1, 500, 3000, { Q: 1, peak: 0.85 }), 0, 0.8);
    const im = noise(r, 0.08); filt(im, "hp", 1000, 0.7);
    mix(o, applyEnv(im, (t) => Math.exp(-t / 0.02)), 0.09, 1);
    mix(o, ping([1650, 2690, 3980, 5900], [0.22, 0.16, 0.1, 0.06], [1, 0.7, 0.45, 0.3]), 0.09, 0.3);
    mix(o, thump(140, 60, 0.1, 0.05), 0.09, 0.8);
    mix(o, crackle(r, 0.2, 40, { f: 2600, amp: (t) => Math.exp(-t / 0.08) }), 0.1, 0.3);
    return reverb(o, { wet: 0.25, room: 0.78, tail: 0.4 });
  },
  // เคทตี: กรงเล็บเขม่าข่วน 3 ครั้ง + กระแทกมืด + เสียงฟู่
  ke_hit_kate(r) {
    const o = buf(0.65);
    for (const [at, g] of [[0, 1], [0.07, 0.85], [0.14, 0.75]]) {
      const n = noise(r, 0.09); filt(n, "bp", (t) => expGlide(4500, 1200, t / 0.09), 2.5);
      mul(n, sampleHold(r, 0.09, 400).map((v) => 0.4 + 0.6 * v));
      mix(o, applyEnv(n, (t) => bell(t / 0.09, 0.25, 1, 1.2)), at, 1.3 * g);
    }
    mix(o, thump(100, 45, 0.15, 0.1), 0.16, 1);
    const lo = noise(r, 0.2); filt(lo, "lp", 300, 0.8);
    mix(o, applyEnv(lo, (t) => Math.exp(-t / 0.05)), 0.16, 1);
    const hs = noise(r, 0.4); filt(hs, "hp", 4000, 0.7);
    mix(o, applyEnv(hs, (t) => Math.min(1, t / 0.02) * Math.exp(-t / 0.15)), 0.17, 0.15);
    mix(o, crackle(r, 0.4, 50, { f: 2400, amp: (t) => Math.exp(-t / 0.15) }), 0.17, 0.4);
    return reverb(o, { wet: 0.3, room: 0.82, tail: 0.5 });
  },
  // ท่าไม้ตายเอมิลิโกะ: ป๊อบ + อาร์เปจโจเมเจอร์ไต่ขึ้น + ประกาย + คอร์ดบาน
  ke_cheer(r) {
    const o = buf(1.3);
    mix(o, thump(420, 150, 0.06, 0.03), 0, 0.6);
    const ck = noise(r, 0.01); filt(ck, "bp", 2500, 1);
    mix(o, applyEnv(ck, (t) => Math.exp(-t / 0.003)), 0, 0.6);
    mix(o, whoosh(r, 0.35, 400, 4000, { Q: 1, peak: 0.85 }), 0, 0.5);
    [1047, 1319, 1568, 2093, 2637].forEach((f, k) => {
      const n = osc(0.5, f, "tri");
      mix(o, applyEnv(n, (t) => Math.min(1, t / 0.004) * Math.exp(-t / 0.22)), k * 0.07, 0.22);
      mix(o, ping([f * 2], [0.15]), k * 0.07, 0.08);
    });
    mix(o, ping([1047, 1319, 1568, 2093], [0.6, 0.55, 0.5, 0.45], [1, 0.8, 0.8, 0.5]), 0.36, 0.25);
    for (let k = 0; k < 16; k++) {
      const f = rr(r, 3000, 8000);
      mix(o, ping([f], [rr(r, 0.04, 0.12)]), rr(r, 0.25, 0.9), rr(r, 0.04, 0.1));
    }
    return reverb(o, { wet: 0.35, room: 0.84, tail: 0.6 });
  },
  // น้ำสาด
  ke_splash(r) {
    const o = buf(0.75);
    const b = noise(r, 0.6); filt(b, "lp", (t) => expGlide(6000, 700, t / 0.35), 0.8);
    mix(o, applyEnv(b, (t) => Math.min(1, t / 0.005) * Math.exp(-t / 0.15)), 0, 1);
    const m = noise(r, 0.4); filt(m, "bp", 900, 0.7);
    mix(o, applyEnv(m, (t) => Math.min(1, t / 0.01) * Math.exp(-t / 0.1)), 0, 0.8);
    mix(o, thump(200, 90, 0.12, 0.05), 0, 0.6);
    for (let k = 0; k < 10; k++) mix(o, droplet(rr(r, 600, 1800), rr(r, 0.02, 0.05)), rr(r, 0.05, 0.6), rr(r, 0.12, 0.25));
    return reverb(o, { wet: 0.15, room: 0.7, tail: 0.3 });
  },
  // ไถลบนพื้นเปียก: เสียงเอี๊ยดยาง + เสียงลื่นฟู่
  ke_slide(r) {
    const o = buf(0.6);
    const D = 0.45;
    const fq = (t) => (t < 0.15 ? expGlide(900, 1500, t / 0.15) : expGlide(1500, 1150, (t - 0.15) / 0.3)) * (1 + 0.04 * Math.sin(TAU * 25 * t));
    const env = (t) => Math.min(1, t / 0.02) * Math.min(1, Math.max(0, (D - t) / 0.1)) * (0.7 + 0.3 * Math.abs(Math.sin(TAU * 22 * t)));
    const sq = osc(D, fq, "saw"); filt(sq, "bp", 1400, 3);
    mix(o, applyEnv(sq, env), 0, 0.9);
    mix(o, applyEnv(osc(D, fq), env), 0, 0.25);
    const sw = noise(r, D); filt(sw, "bp", 2000, 1);
    mix(o, applyEnv(sw, (t) => bell(t / D, 0.3)), 0, 0.5);
    mix(o, droplet(900, 0.035), 0.3, 0.2);
    mix(o, droplet(1300, 0.03), 0.4, 0.15);
    return reverb(o, { wet: 0.12, room: 0.65, tail: 0.25 });
  },
};

function hasFfmpeg() {
  try { execFileSync("ffmpeg", ["-version"], { stdio: "ignore" }); return true; } catch { return false; }
}

function main() {
  const args = process.argv.slice(2);
  const wav = args.includes("--wav") || !hasFfmpeg();
  if (wav && !args.includes("--wav")) console.warn("ไม่พบ ffmpeg — เขียน .wav แทน (แก้ path ใน client/src/audio.js ด้วย)");
  const only = args.filter((a) => !a.startsWith("--"));
  const names = only.length ? only : Object.keys(SOUNDS);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ke-sfx-"));
  try {
    for (const name of names) {
      if (!SOUNDS[name]) throw new Error(`ไม่รู้จักเสียง ${name}`);
      const out = finish(SOUNDS[name](rng(hash(name))), { maxSec: name === "ke_storm" ? 3.2 : 1.5 });
      if (wav) {
        writeWav(path.join(OUT_DIR, `${name}.wav`), out);
      } else {
        const w = path.join(tmp, `${name}.wav`);
        writeWav(w, out);
        execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", w, "-ac", "1", "-codec:a", "libmp3lame", "-b:a", "96k", "-map_metadata", "-1", path.join(OUT_DIR, `${name}.mp3`)]);
      }
      console.log(`${name}  ${(out.length / SR).toFixed(2)} s`);
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

if (require.main === module) main();
module.exports = { SOUNDS };
