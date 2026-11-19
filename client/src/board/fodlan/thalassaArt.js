// ============================================================
//  ทาลัสซา (GRID_PLAN §8.9) — ภาพ + เอฟเฟกต์ + เสียงบนกระดานจริง · ตรรกะอยู่ที่ server/fodlan/thalassa.js
//  ย้ายมาจากต้นแบบ .claude/plans/thalassa.html (ผู้ใช้ดู/สั่งแก้แล้ว): ว่ายเป็นคลื่น · เลี้ยวผ่านภาพหลายมุม (ห้ามพลิกภาพแบน)
//   ข่มขวัญ (เงาใต้กระดาน → ตัวมหึมาว่ายผ่านหน้ากล้อง) · 6 ท่า · โดนตี · ตาย + หัวใจของท้องทะเล · เสียงว่ายตามจังหวะหาง
//  ชั้น 7–11 เรียก: drawThalassaGround (ใต้ตัวละคร — เงา/วังน้ำวน/พื้นไฟฟ้า) · drawThalassaAir (ทับตัวละคร — ตัวปลา/ท่า/ฉากจอ)
//  fd.whale = server thalassa.publicInfo · fd.fx = เหตุการณ์ whale_* (seq ของตัวคุมกลาง)
// ============================================================
import { P, pitchOf } from "../boardGeo";
import { fxT, fxOnce } from "./index";
import { playSfx, registerSounds } from "../../audio";

const MEDIA = "/nautilus/";
const SIZE = 2.1; // ภาพเทียบลำตัว 5 ช่อง (ผู้ใช้ขยาย 2 รอบ)
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const rnd = (a, b) => a + Math.random() * (b - a);

// ความยาวฉาก (ms) ของเหตุการณ์ฝั่ง server
export const WHALE_FX = {
  whale_flyby: 8200, whale_appear: 2400, whale_leave: 2000, whale_warn: 1400, whale_hit: 500, whale_death: 7600, whale_shove: 600,
  whale_ram: 1200, whale_bite: 1300,
  whale_tentacle: 1900, whale_charge: 2400, whale_whirl: 2400, whale_zap: 1500, whale_song: 3200, whale_swallow: 3400,
};

// ---------- เสียง (client/public/nautilus/sfx — .claude/plans/nautilus-sfx.sh) ----------
const SFX_KEYS = ["ping", "whoosh", "whip", "slap", "squish", "rush", "roar", "blue", "call", "moo", "whup", "song", "song2", "swirl", "zap", "blast",
  "echarge", "crackle", "gulp", "splash", "spit", "rumble", "boom", "impact", "deepimpact", "bubbles", "swim", "swim2", "tailslap"];
let SOUNDS_READY = false;
export function registerThalassaSounds() {
  if (SOUNDS_READY) return;
  SOUNDS_READY = true;
  registerSounds(Object.fromEntries(SFX_KEYS.map((k) => [`nt_${k}`, `${MEDIA}sfx/${k}.mp3`])));
}
function snd(k, { gain = 1, rate = 1, delay = 0 } = {}) {
  registerThalassaSounds();
  const go = () => { const a = playSfx(`nt_${k}`, { gain: gain * 1.6 }); /* ดังขึ้น 2026-11-19 */ if (a && rate !== 1) { a.preservesPitch = false; a.playbackRate = rate; } };
  if (delay > 0) setTimeout(go, delay); else go();
}
const SND = {
  call(o = {}) { snd(Math.random() < 0.5 ? "moo" : "whup", { gain: o.gain ?? 1, rate: (o.rate ?? 1) * 0.95, delay: o.delay }); snd("call", { gain: (o.gain ?? 1) * 0.3, rate: o.rate ?? 1, delay: (o.delay || 0) + 100 }); },
  roar(o = {}) { snd("blue", { gain: o.gain ?? 0.9, rate: (o.rate ?? 1) * 0.9, delay: o.delay }); snd("roar", { gain: (o.gain ?? 0.9) * 0.55, rate: o.rate ?? 1, delay: (o.delay || 0) + 50 }); },
  boom(o = {}) { snd(Math.random() < 0.5 ? "impact" : "deepimpact", { gain: o.gain ?? 1, delay: o.delay }); },
  whoosh(o = {}) { snd("whoosh", o); snd("whip", { ...o, gain: (o.gain ?? 1) * 0.8, delay: (o.delay || 0) + 50 }); },
  slap(o = {}) { snd("slap", o); snd("squish", { ...o, gain: (o.gain ?? 1) * 0.7 }); },
};

// ---------- สไปรต์หลายมุม ----------
const IMG = {};
let SPR = null, LOADING = false;
function mk(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return { c, g: c.getContext("2d", { willReadFrequently: true }) }; }
function makeSprite(img, SZ, ax, ay, mul, amp) {
  const PAD = Math.round(SZ * 0.1);
  const b = mk(SZ, SZ), s = Math.min(SZ / img.width, SZ / img.height), dw = img.width * s, dh = img.height * s, dx = (SZ - dw) / 2, dy = (SZ - dh) / 2;
  b.g.drawImage(img, dx, dy, dw, dh);
  const d = b.g.getImageData(0, 0, SZ, SZ), m = mk(SZ, SZ), o = m.g.createImageData(SZ, SZ);
  for (let i = 0; i < d.data.length; i += 4) {
    const r = d.data[i], gg = d.data[i + 1], bb = d.data[i + 2], a = d.data[i + 3], c = (gg + bb) / 2 - r;
    if (a > 40 && gg > 120 && bb > 120 && c > 30) { o.data[i] = 70; o.data[i + 1] = 215; o.data[i + 2] = 240; o.data[i + 3] = Math.min(255, (c - 30) * 5) * (a / 255); }
  }
  m.g.putImageData(o, 0, 0);
  const gl = mk(SZ, SZ);
  gl.g.filter = `blur(${Math.max(3, Math.round(SZ / 90))}px)`; gl.g.drawImage(m.c, 0, 0); gl.g.filter = "none";
  gl.g.globalCompositeOperation = "lighter"; gl.g.drawImage(m.c, 0, 0);
  const wm = mk(SZ, SZ); wm.g.drawImage(b.c, 0, 0); wm.g.globalCompositeOperation = "source-in"; wm.g.fillStyle = "#e8ffff"; wm.g.fillRect(0, 0, SZ, SZ);
  return { base: b.c, glow: gl.c, white: wm.c, SZ, PAD, ax: (dx + ax * dw) / SZ, ay: (dy + ay * dh) / SZ, mul, amp, o1: mk(SZ, SZ + PAD * 2), o2: mk(SZ, SZ + PAD * 2), om: mk(SZ, SZ + PAD * 2) };
}
function loadSprites() {
  if (SPR || LOADING || typeof document === "undefined") return;
  LOADING = true;
  const names = ["whale_side", "whale_side_34", "whale_front", "whale_top_tail"];
  Promise.all(names.map((n) => new Promise((res) => { const i = new Image(); i.onload = () => { IMG[n] = i; res(); }; i.onerror = () => res(); i.src = `${MEDIA}${n}.webp`; })))
    .then(() => {
      if (!IMG.whale_side) return;
      const side = makeSprite(IMG.whale_side, 640, 0.62, 0.57, 1, 1);
      const q = IMG.whale_side_34 ? makeSprite(IMG.whale_side_34, 640, 0.70, 0.64, 1, 0.55) : side;
      const front = IMG.whale_front ? makeSprite(IMG.whale_front, 320, 0.5, 0.52, 0.6, 0.2) : q;
      // มุมบน (ผู้ใช้ 2026-11-19: "มุมบนทำไมไม่มี ฉันให้ไป 7 ภาพ") — whale_top_tail หางอยู่บน หัว+หนวดอยู่ล่าง
      const top = IMG.whale_top_tail ? makeSprite(IMG.whale_top_tail, 640, 0.5, 0.5, 1, 0) : null;
      SPR = { side, q, front, top };
    });
}
function undulate(spr, src, dst, t, amp, speed) {
  const SZ = spr.SZ, n = 72, sw = SZ / n;
  dst.g.clearRect(0, 0, dst.c.width, dst.c.height);
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, k = Math.pow(Math.max(0, 1 - u / 0.97), 1.5);
    const dy = amp * k * Math.sin(t * speed - u * 7.5) + amp * 0.25 * Math.sin(t * speed * 0.5 + u * 3);
    dst.g.drawImage(src, i * sw, 0, sw + 0.8, SZ, i * sw, spr.PAD + dy, sw + 0.8, SZ);
  }
}

// ---------- เส้นทาง (สำเนาของ server/fodlan/thalassa.js PATH — แก้คู่กัน) ----------
const PATH = [[0.1, 0.24], [0.33, 0.2], [0.66, 0.22], [0.92, 0.34], [0.94, 0.66], [0.78, 0.88], [0.52, 0.8], [0.3, 0.58], [0.52, 0.42], [0.74, 0.56], [0.6, 0.9], [0.24, 0.88], [0.06, 0.6]]; // อยู่ในกระดานเกือบตลอด · ไม่ผ่านท่าจอดเรือ (แถวบน) — แก้คู่ client/server
let PC = null;
function pathPts(cols, rows) {
  if (PC && PC.cols === cols && PC.rows === rows) return PC;
  const wp = PATH.map(([u, v]) => [u * cols, v * rows]), pts = [], n = wp.length;
  for (let i = 0; i < n; i++) {
    const p0 = wp[(i - 1 + n) % n], p1 = wp[i], p2 = wp[(i + 1) % n], p3 = wp[(i + 2) % n];
    for (let j = 0; j < 24; j++) {
      const t = j / 24, t2 = t * t, t3 = t2 * t;
      pts.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  const cum = [0];
  for (let i = 1; i <= pts.length; i++) { const a = pts[i - 1], b = pts[i % pts.length]; cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  PC = { cols, rows, pts, cum, len: cum[pts.length] };
  return PC;
}
function pathAt(s, cols, rows) {
  const { pts, cum, len } = pathPts(cols, rows);
  s = ((s % len) + len) % len;
  let lo = 0, hi = pts.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid - 1; }
  const a = pts[lo], b = pts[(lo + 1) % pts.length], f = (s - cum[lo]) / (cum[lo + 1] - cum[lo] || 1);
  return [lerp(a[0], b[0], f), lerp(a[1], b[1], f)];
}

// ---------- สถานะภาพ (client ล้วน) ----------
const V = { s: null, face: 1, turn: null, rot: 0, ph: 0, strokes: 0, last: 0, glow: 0, flash: 0, rear: 0, alpha: 0, z: 1.2, scale: 1, amp: 1, x: 0, y: 0, ghost: [], seen: new Set() };
const PARTS = [];
const TURN_MS = 1300;

function whaleCs(x, y) { return Math.max(4, P(x, y)[2] || 30); }
function screenOf(x, y, z = 0) { const p = P(x, y, z); return [p[0], p[1]]; }

// ---------- อนุภาค (พิกัดจอ) ----------
function part(o) { PARTS.push(Object.assign({ t: 0, vx: 0, vy: 0, ay: 0, drag: 0, life: 1, r: 2, col: "255,255,255", type: "glow" }, o)); }
function bubbles(sx, sy, n, spread) { for (let i = 0; i < n; i++) part({ type: "bub", x: sx + rnd(-spread, spread), y: sy + rnd(-spread * 0.4, spread * 0.4), vy: -rnd(40, 140), vx: rnd(-10, 10), r: rnd(1.5, 5), life: rnd(0.9, 2.2), w: rnd(0, TAU) }); }
function sand(sx, sy, n, power) { for (let i = 0; i < n; i++) { const a = rnd(-Math.PI * 0.95, -Math.PI * 0.05), v = rnd(0.3, 1) * power; part({ type: "sand", x: sx + rnd(-power * 0.1, power * 0.1), y: sy, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.8, ay: power * 1.6, drag: 1.8, r: rnd(1.5, 4), life: rnd(0.8, 1.8), col: `${rnd(90, 140) | 0},${rnd(110, 150) | 0},${rnd(130, 170) | 0}` }); } }
function sparks(sx, sy, n, power, col = "180,250,255") { for (let i = 0; i < n; i++) { const a = rnd(0, TAU), v = rnd(0.3, 1) * power; part({ type: "spark", x: sx, y: sy, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7, drag: 4, life: rnd(0.25, 0.6), r: rnd(1, 2.4), col }); } }
function spray(sx, sy, n, power) { for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + rnd(-0.7, 0.7), v = rnd(0.4, 1) * power; part({ type: "drop", x: sx + rnd(-power * 0.08, power * 0.08), y: sy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, ay: power * 2.2, drag: 0.6, r: rnd(1.5, 4), life: rnd(0.6, 1.3), col: "210,250,255" }); } }
function drawParts(g, dt) {
  for (let i = PARTS.length - 1; i >= 0; i--) {
    const p = PARTS[i]; p.t += dt; if (p.t > p.life) { PARTS.splice(i, 1); continue; }
    const a = 1 - p.t / p.life;
    p.vx += 0; p.vy += p.ay * dt; p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.type === "bub") { p.w += dt * 6; g.strokeStyle = `rgba(200,250,255,${0.7 * a})`; g.lineWidth = 1.2; g.beginPath(); g.arc(p.x + Math.sin(p.w) * 3, p.y, p.r, 0, TAU); g.stroke(); }
    else if (p.type === "sand" || p.type === "drop") { g.fillStyle = `rgba(${p.col},${0.8 * a})`; g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill(); }
    else if (p.type === "spark") { g.globalCompositeOperation = "lighter"; g.strokeStyle = `rgba(${p.col},${a})`; g.lineWidth = p.r; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); g.stroke(); g.globalCompositeOperation = "source-over"; }
  }
  if (PARTS.length > 900) PARTS.splice(0, PARTS.length - 900);
}

// ---------- วาดตัวปลา ----------
function poseFrames(now) {
  if (!V.turn) return [[SPR.side, V.face, 1]];
  const from = -V.turn.to, to = V.turn.to;
  const seq = [[SPR.side, from], [SPR.q, from], [SPR.front, to], [SPR.q, to], [SPR.side, to]];
  const pos = ease(clamp((now - V.turn.t0) / TURN_MS, 0, 1)) * 4, i = Math.min(3, Math.floor(pos));
  const fr = pos - i, f = clamp((fr - 0.3) / 0.4, 0, 1), ff = f * f * (3 - 2 * f), out = [];
  if (ff < 1) out.push([seq[i][0], seq[i][1], 1 - ff]);
  if (ff > 0) out.push([seq[i + 1][0], seq[i + 1][1], ff]);
  return out;
}
function drawSprite(g, spr, st, face, alpha, t, spd, glow) {
  const cs = whaleCs(st.x, st.y), amp = 16 * V.amp * spr.amp * (spr.SZ / 640);
  undulate(spr, spr.base, spr.o1, t, amp, spd);
  undulate(spr, spr.glow, spr.o2, t, amp, spd);
  const [ax, ay] = screenOf(st.x, st.y, st.z + Math.sin(t * 1.3) * 0.08);
  const drawW = (5 * cs / 0.74) * SIZE * st.scale * spr.mul, k = drawW / spr.SZ;
  g.save();
  g.translate(ax, ay); g.rotate(st.rot - V.rear * 0.18 * face); g.scale(face, 1); g.scale(k * (1 + V.rear * 0.06), k * (1 + V.rear * 0.06));
  g.translate(-spr.ax * spr.SZ, -(spr.ay * spr.SZ + spr.PAD));
  const dim = st.z < 0.6 ? clamp(0.35 + st.z, 0.2, 1) : 1;
  g.globalAlpha = alpha;
  if (dim < 1) g.filter = `brightness(${dim}) blur(${(1 - dim) * 3}px)`;
  g.drawImage(spr.o1.c, 0, 0); g.filter = "none";
  g.globalCompositeOperation = "lighter";
  const gl = glow * alpha;
  g.globalAlpha = clamp(gl, 0, 1); g.drawImage(spr.o2.c, 0, 0);
  if (gl > 1) { g.globalAlpha = clamp(gl - 1, 0, 1); g.drawImage(spr.o2.c, 0, 0); }
  if (V.flash > 0) {
    undulate(spr, spr.white, spr.om, t, amp, spd);
    g.globalCompositeOperation = "source-over"; g.globalAlpha = V.flash * 0.8 * alpha; g.drawImage(spr.om.c, 0, 0);
  }
  g.restore();
}
function drawBody(g, now, fierce) {
  if (!SPR || V.alpha <= 0.01) return;
  const t = now / 1000, spd = 3.2 * (V.amp > 1.5 ? 2 : 1);
  const glow = 0.25 + 0.15 * Math.sin(t * 1.6) + V.glow + (fierce ? 0.35 : 0);
  // เงาบนพื้น
  const cs = whaleCs(V.x, V.y), [fx, fy] = screenOf(V.x, V.y);
  g.save(); g.translate(fx, fy); g.scale(cs * 2.8 * SIZE * V.scale, cs * 0.8 * SIZE * V.scale);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1); gr.addColorStop(0, `rgba(0,0,0,${0.55 * V.alpha * clamp(1 - Math.abs(V.z - 1.2) * 0.3, 0.2, 1)})`); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fill(); g.restore();
  // มุมสูง (bird's-eye) = ภาพมุมบนหมุนตามทิศว่าย · มุมกลาง = ไล่ความทึบระหว่างภาพข้างกับภาพบน
  const topMix = SPR.top ? clamp((pitchOf() - 52) / 26, 0, 1) : 0;
  if (topMix < 1) {
    for (const [i, st] of V.ghost.entries()) drawSprite(g, SPR.side, st, st.face, 0.1 * (i + 1) / V.ghost.length * (1 - topMix), t, spd, glow * 0.5);
    for (const [spr, face, a] of poseFrames(now)) drawSprite(g, spr, V, face, a * V.alpha * (1 - topMix), t, spd, glow);
  }
  if (topMix > 0) drawTop(g, V, V.alpha * topMix, t, glow);
}
function drawTop(g, st, alpha, t, glow) {
  const spr = SPR.top, cs = whaleCs(st.x, st.y);
  const [ax, ay] = screenOf(st.x, st.y, st.z * 0.3);
  const drawL = (5 * cs / 0.62) * SIZE * st.scale, k = drawL / spr.SZ;
  g.save();
  g.translate(ax, ay);
  g.rotate((V.ang ?? 0) - Math.PI / 2 + Math.sin(t * 1.6) * 0.05); // ภาพ: หัวชี้ลง (+y) → หมุนให้หัวชี้ทิศว่าย
  g.scale(k * (1 + V.rear * 0.06), k * (1 + V.rear * 0.06));
  g.translate(-spr.ax * spr.SZ, -spr.ay * spr.SZ);
  g.globalAlpha = alpha; g.drawImage(spr.base, 0, 0);
  g.globalCompositeOperation = "lighter";
  g.globalAlpha = clamp(glow * alpha, 0, 1); g.drawImage(spr.glow, 0, 0);
  if (V.flash > 0) { g.globalCompositeOperation = "source-over"; g.globalAlpha = V.flash * 0.8 * alpha; g.drawImage(spr.white, 0, 0); }
  g.restore();
}

// ตัวปลาวาฬห้ามทับตัวละคร (ผู้ใช้ 2026-11-19: "อย่าให้ภาพซ้อนกับปลา") — วาดลงแคนวาสแยก แล้วเจาะช่องโปร่งรอบตัวละครทุกตัว
//  (ตัวหมาก + ป้ายชื่อ/หลอดเลือดเหนือหัว) ก่อนวางทับกระดาน → ตัวละครโผล่ทะลุตัวปลาวาฬเสมอ
let BODY_CV = null;
function drawBodyClear(g, now, fierce, units) {
  if (!SPR || V.alpha <= 0.01) return;
  const live = (units || []).filter((u) => u && u.alive !== false && Number.isFinite(u.rx ?? u.x));
  if (!live.length || typeof document === "undefined" || !g.getTransform) { drawBody(g, now, fierce); return; }
  const W0 = g.canvas.width, H0 = g.canvas.height;
  if (!BODY_CV) BODY_CV = document.createElement("canvas");
  if (BODY_CV.width !== W0 || BODY_CV.height !== H0) { BODY_CV.width = W0; BODY_CV.height = H0; }
  const o = BODY_CV.getContext("2d");
  o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = "source-over"; o.globalAlpha = 1; o.clearRect(0, 0, W0, H0);
  o.setTransform(g.getTransform());
  drawBody(o, now, fierce);
  o.globalCompositeOperation = "destination-out";
  for (const u of live) {
    const h = Math.max(1, u.size | 0) / 2, x = (u.rx ?? u.x) + h, y = (u.ry ?? u.y) + h;
    const [bx, by, bs] = P(x, y, 0), [, ty] = P(x, y, 1.9 + h);
    const rx = bs * (0.55 + h * 0.5), cy = (by + ty) / 2, ry = Math.max(rx, (by - ty) / 2 + bs * 0.35);
    o.save(); o.translate(bx, cy); o.scale(rx, ry);
    const gr = o.createRadialGradient(0, 0, 0, 0, 0, 1); gr.addColorStop(0, "rgba(0,0,0,.9)"); gr.addColorStop(0.7, "rgba(0,0,0,.85)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    o.fillStyle = gr; o.beginPath(); o.arc(0, 0, 1, 0, TAU); o.fill(); o.restore();
  }
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; g.drawImage(BODY_CV, 0, 0); g.restore();
}

// ---------- การเคลื่อนไหวต่อเฟรม ----------
function step(fd, info, now, dt) {
  const w = fd.whale, cols = info.cols, rows = info.rows;
  if (w && w.on && Number.isFinite(w.s)) {
    // ว่ายไปข้างหน้าตามเส้นทางเท่านั้น (ผู้ใช้ทัก "ปลาว่ายกลับด้าน": เดิม ease หา s ที่น้อยกว่า = ไถลถอยหลังทั้งที่หันหน้าไปข้างหน้า)
    const len = pathPts(cols, rows).len;
    if (V.s == null || V.seen !== w.appearSeq) { V.s = w.s; V.seen = w.appearSeq; }
    let ahead = (((w.s - V.s) % len) + len) % len; // ระยะไปข้างหน้าถึงตำแหน่ง server
    if (ahead > len / 2) { if (len - ahead < 1) ahead = 0; else { V.s = w.s; ahead = 0; } } // เลยไปนิดเดียว (ไหลหน้า) = รอ · ห่างมาก = วางใหม่
    V.s += ahead * Math.min(1, dt * 1.2) + (ahead < 0.8 ? dt * 0.12 : 0); // ว่ายตามตำแหน่ง server + ไหลหน้าเบาๆ (ว่ายตลอด)
  } else if (!w || !w.on) V.s = V.s == null ? 0 : V.s;
  const [x, y] = pathAt(V.s || 0, cols, rows), q = pathAt((V.s || 0) + 0.4, cols, rows), b = pathAt((V.s || 0) - 0.4, cols, rows);
  if (!V.override) { V.x = x; V.y = y; }
  // ทิศบนจอ → หันซ้าย/ขวา + เอียง · เลี้ยวกลับด้าน = ไล่ภาพหลายมุม
  const p0 = screenOf(b[0], b[1]), p1 = screenOf(q[0], q[1]);
  const a = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), c = Math.cos(a);
  if (!V.override) {
    if (!V.turn) { if ((V.face > 0 && c < -0.2) || (V.face < 0 && c > 0.2)) V.turn = { t0: now, to: -V.face }; }
    else if (now - V.turn.t0 >= TURN_MS) { V.face = V.turn.to; V.turn = null; }
    let tr = V.face > 0 ? a : a > 0 ? a - Math.PI : a + Math.PI;
    tr = V.turn ? 0 : clamp(tr, -0.5, 0.5);
    V.rot += (tr - V.rot) * Math.min(1, dt * 3);
  }
  // ทิศว่ายบนจอ (มุมบน: หมุนภาพหัวไปทางนี้) — หมุนนุ่มทางสั้นสุด
  if (V.ang == null) V.ang = a;
  else { let d = a - V.ang; d = Math.atan2(Math.sin(d), Math.cos(d)); V.ang += d * Math.min(1, dt * 2.5); }
  V.glow = Math.max(0, V.glow - dt * 1.1); V.flash = Math.max(0, V.flash - dt * 3);
  // เสียงว่าย: ทุกรอบตวัดหาง
  if (V.alpha > 0.3) {
    V.ph += dt * 3.2 * (V.amp > 1.5 ? 2 : 1);
    if (V.ph >= TAU) {
      V.ph -= TAU; V.strokes++;
      snd(V.strokes % 2 ? "swim" : "swim2", { gain: 0.45 * V.alpha, rate: rnd(0.88, 1.05) });
      if (V.strokes % 4 === 0) snd("tailslap", { gain: 0.3 * V.alpha, delay: 250 });
      if (Math.random() < 0.1) SND.call({ gain: 0.22, rate: 0.8, delay: 600 });
    }
  }
}

// ---------- เหตุการณ์ ----------
const FXLIST = (fd) => (Array.isArray(fd.fx) ? fd.fx.filter((e) => e && typeof e.kind === "string" && (e.kind.startsWith("whale_") || e.kind === "nt_bait")) : []);
function sounds(e) {
  switch (e.kind) {
    case "whale_flyby": snd("rumble", { gain: 1 }); SND.call({ gain: 0.7, rate: 0.62, delay: 400 }); SND.roar({ gain: 1, rate: 0.7, delay: 3600 });
      for (let i = 0; i < 4; i++) setTimeout(() => { snd(i % 2 ? "swim2" : "swim", { gain: 1.2, rate: 0.7 }); if (i === 2) snd("tailslap", { gain: 0.9, rate: 0.7, delay: 300 }); }, 3900 + i * 1100);
      SND.whoosh({ gain: 1, rate: 0.55, delay: 4800 }); snd("rush", { delay: 5100 }); SND.call({ gain: 1, rate: 0.5, delay: 5600 }); break;
    case "whale_appear": snd("rumble"); snd("bubbles", { delay: 200 }); snd("splash", { gain: 0.8, rate: 0.7, delay: 1200 }); SND.call({ delay: 1000 }); break;
    case "whale_leave": SND.call({ gain: 0.7, rate: 0.9 }); snd("bubbles", { delay: 400 }); break;
    case "whale_warn": snd("ping"); break;
    case "whale_tentacle": SND.whoosh({ rate: 0.8 }); SND.slap({ delay: 380 }); SND.boom({ gain: 0.6, delay: 900 }); break;
    case "whale_charge": SND.roar({ gain: 1 }); snd("rush", { delay: 300 }); SND.boom({ gain: 0.8, delay: 800 }); break;
    case "whale_whirl": snd("swirl"); snd("rumble", { gain: 0.6, delay: 200 }); SND.boom({ gain: 0.9, delay: 1500 }); snd("splash", { rate: 0.75, delay: 1550 }); break;
    case "whale_zap": snd("echarge", { gain: 0.9 }); snd("blast", { delay: 600 }); snd("crackle", { gain: 0.5, delay: 700 }); break;
    case "whale_song": snd(Math.random() < 0.5 ? "song" : "song2", { rate: 0.9 }); snd("blue", { gain: 0.5, rate: 0.8, delay: 1800 }); break;
    case "whale_swallow": snd("rumble", { gain: 1 }); SND.boom({ delay: 1300 }); snd("splash", { rate: 0.8, delay: 1340 }); SND.roar({ gain: 0.8, rate: 1.2, delay: 1360 }); snd("gulp", { delay: 1700 }); if (e.spit) snd("spit", { delay: 2900 }); break;
    case "nt_bait": snd("whip", { gain: 0.7 }); snd("squish", { gain: 0.9, delay: 520 }); SND.call({ gain: 0.45, rate: 0.85, delay: 900 }); break;
    case "whale_hit": SND.slap({ gain: 0.8 }); SND.call({ gain: 0.4, rate: 1.2, delay: 80 }); break;
    // ว่ายชน / งับ (ความดุที่เพิ่ม 2026-11-19)
    case "whale_ram": SND.boom({ gain: 0.9 }); snd("rumble", { gain: 0.6, delay: 100 }); break;
    case "whale_bite": SND.roar({ gain: 0.6, rate: 1.25 }); snd("gulp", { gain: 0.9, delay: 420 }); if (e.hit) SND.slap({ gain: 0.8, delay: 450 }); break;
    case "whale_death": SND.roar({ gain: 1, rate: 0.8 }); snd("rumble", { delay: 400 }); SND.call({ gain: 0.8, rate: 0.7, delay: 1600 }); snd("bubbles", { delay: 1400 }); SND.call({ gain: 0.5, rate: 0.55, delay: 3200 }); break;
    default: break;
  }
}

// ---------- วาดใต้ตัวละคร (พื้น) ----------
export function drawThalassaGround(g, fd, info, now) {
  if (!fd || !fd.whale || !fd.whale.enabled) return;
  for (const e of FXLIST(fd)) {
    const dur = WHALE_FX[e.kind] || 1500, k = fxT(e, now, dur);
    if (k >= 1) continue;
    if (e.kind === "whale_whirl") for (const c of e.centers || []) drawWhirl(g, c.x + 0.5, c.y + 0.5, k, now);
    else if (e.kind === "whale_zap") for (const c of e.chain || []) drawElectricFloor(g, c.x, c.y, k);
    else if (e.kind === "whale_swallow" && e.at) drawDeepShadow(g, e.at.x + 0.5, e.at.y + 0.5, clamp(k / 0.4, 0, 1));
    else if (e.kind === "whale_song") drawRings(g, k);
  }
}

// ---------- วาดทับตัวละคร ----------
export function drawThalassaAir(g, fd, info, units, now, lowQ, view) {
  const w = fd && fd.whale;
  if (!w || !w.enabled) return;
  loadSprites();
  const dt = Math.min(0.05, V.last ? (now - V.last) / 1000 : 0); V.last = now;
  const evs = FXLIST(fd);
  for (const e of evs) if (fxOnce(e)) sounds(e);
  // ความทึบ/ความสูงตามสถานะ + ฉากโผล่/จากไป/ตาย
  let target = w.on ? 1 : 0;
  V.override = null; V.amp = 1; V.scale = 1; V.z = 1.2; V.ghost = [];
  for (const e of evs) {
    const dur = WHALE_FX[e.kind] || 1500, k = fxT(e, now, dur);
    if (k >= 1 || k <= 0) continue;
    if (e.kind === "whale_appear") { target = 1; V.alpha = clamp(k * 1.6, 0, 1); V.z = lerp(-1, 1.2, easeOut(k)); V.scale = lerp(0.8, 1, easeOut(k)); if (k < 0.05) { const [sx, sy] = screenOf(e.x, e.y); bubbles(sx, sy, 6, 60); } }
    else if (e.kind === "whale_leave") { V.alpha = 1 - k; V.z = lerp(1.2, -0.8, ease(k)); }
    else if (e.kind === "whale_death") { V.alpha = k < 0.3 ? 1 : 1 - ease((k - 0.3) / 0.7); V.z = k < 0.3 ? 1.2 : lerp(1.2, -1.4, ease((k - 0.3) / 0.7)); V.amp = k < 0.3 ? 2.2 : 0.4; if (k < 0.3 && Math.random() < 0.2) V.flash = 0.8; }
    else if (e.kind === "whale_hit") V.flash = Math.max(V.flash, 1 - k);
    else if (e.kind === "whale_warn") V.glow = Math.max(V.glow, 1.2 * (1 - k)), (V.rear = k < 0.8 ? 1 : 0);
    else if (e.kind === "whale_charge") chargeOverride(e, k, info);
    else if (e.kind === "whale_swallow") { if (k < 0.25) V.alpha = Math.min(V.alpha, 1 - k / 0.25); else if (k < 0.85) V.alpha = 0; else V.alpha = (k - 0.85) / 0.15; }
    else if (e.kind === "whale_zap" || e.kind === "whale_song") V.glow = Math.max(V.glow, 2 * (1 - k));
  }
  if (!evs.some((e) => ["whale_appear", "whale_leave", "whale_death", "whale_swallow"].includes(e.kind) && fxT(e, now, WHALE_FX[e.kind]) < 1)) V.alpha += (target - V.alpha) * Math.min(1, dt * 3);
  step(fd, info, now, dt);
  // เงาข่มขวัญใต้กระดาน (ก่อนตัวปลา)
  for (const e of evs) if (e.kind === "whale_flyby") { const k = fxT(e, now, WHALE_FX.whale_flyby); if (k < 1) drawFlyby(g, k, now, view, true); }
  drawBodyClear(g, now, info && info.stage >= 11, units);
  for (const e of evs) {
    const k = fxT(e, now, WHALE_FX[e.kind] || 1500);
    if (k >= 1) continue;
    if (e.kind === "whale_tentacle") for (const [i, y] of (e.rows || []).entries()) drawTentacle(g, info, y, e.dir || 1, clamp((k - i * 0.1) / 0.8, 0, 1), now);
    else if (e.kind === "whale_zap") drawZap(g, e, k);
    else if (e.kind === "whale_whirl") for (const c of e.centers || []) if (k > 0.62 && k < 0.95) drawGeyser(g, c.x + 0.5, c.y + 0.5, (k - 0.62) / 0.33, 1, now);
    else if (e.kind === "whale_swallow" && e.at && k > 0.38 && k < 0.85) drawEmerge(g, e.at.x + 0.5, e.at.y + 0.5, (k - 0.38) / 0.47, now);
    else if (e.kind === "whale_swallow" && e.spit && k > 0.85) drawGeyser(g, e.spit.x + 0.5, e.spit.y + 0.5, (k - 0.85) / 0.15, 0.6, now);
    else if (e.kind === "whale_hit") { if (k < 0.1) { const [sx, sy] = screenOf(e.x + 0.5, e.y + 0.5, 1); sparks(sx, sy, 20, 260); } }
    else if (e.kind === "whale_bite" && Number.isFinite(e.x) && k < 0.8) drawEmerge(g, e.x + 0.5, e.y + 0.5, k / 0.8, now); // ขากรรไกรโผล่งับจากใต้น้ำที่ตัวเป้า
    else if (e.kind === "whale_ram" && k < 0.25) for (const id of e.hits || []) { const u = (units || []).find((q) => q.id === id); if (u) { const [sx, sy] = screenOf((u.rx ?? u.x) + 0.5, (u.ry ?? u.y) + 0.5, 0.6); sparks(sx, sy, 14, 220); } }
    else if (e.kind === "whale_death" && k > 0.35) drawHeart(g, e, (k - 0.35) / 0.65, now);
  }
  // เหยื่อล่อ: ปาโค้งไปติดตัวเป้า · คนที่ติดกลิ่นมีหมอกเลือดวนรอบตัวจนท่าถัดไป
  for (const e of evs) if (e.kind === "nt_bait") { const k = fxT(e, now, 900); if (k < 1 && e.from && e.to) drawBait(g, e, k); }
  if (w.bait) { const u = (units || []).find((q) => q.id === w.bait); if (u) bloodAura(g, (u.rx ?? u.x) + 0.5, (u.ry ?? u.y) + 0.5, now); }
  drawParts(g, dt);
  // ฉากจอ: ข่มขวัญ (ตัวมหึมาว่ายผ่านหน้ากล้อง) + จอมืด/แถบดำ
  for (const e of evs) if (e.kind === "whale_flyby") { const k = fxT(e, now, WHALE_FX.whale_flyby); if (k < 1) drawFlyby(g, k, now, view, false); }
  void units; void lowQ;
}

// ---------- ท่า ----------
function chargeOverride(e, k, info) {
  V.override = true;
  const band = e.band || [0, 1, 2], dir = e.dir || 1, yc = band[0] + 1.5;
  if (k < 0.3) { V.alpha = 1 - k / 0.3; }
  else if (k < 0.75) {
    const kk = ease((k - 0.3) / 0.45);
    V.x = dir > 0 ? lerp(-9, info.cols + 9, kk) : lerp(info.cols + 9, -9, kk); V.y = yc; V.z = 0.5; V.alpha = 1; V.face = dir; V.turn = null; V.rot = 0; V.amp = 2.4; V.scale = 1.3;
    for (let i = 1; i <= 5; i++) V.ghost.push({ x: V.x - dir * i * 0.7, y: yc, z: 0.5, rot: 0, scale: 1.3, face: dir });
    const [sx, sy] = screenOf(V.x - dir * 3, yc, 0.6); bubbles(sx, sy, 3, 30); spray(sx, sy, 2, 200);
  } else { V.alpha = (k - 0.75) / 0.25; V.override = null; }
}
function strokePath(g, pts, w0, w1, alpha) {
  const N = pts.length; if (N < 2) return;
  g.save(); g.lineCap = "round"; g.lineJoin = "round"; g.globalAlpha = alpha;
  for (let i = 1; i < N; i++) { const w = lerp(w0, w1, i / N); g.beginPath(); g.moveTo(...pts[i - 1]); g.lineTo(...pts[i]); g.strokeStyle = "rgba(0,0,0,0.35)"; g.lineWidth = w * 1.3; g.stroke(); }
  for (let i = 1; i < N; i++) { const w = lerp(w0, w1, i / N); g.beginPath(); g.moveTo(...pts[i - 1]); g.lineTo(...pts[i]); g.strokeStyle = i % 2 ? "#18284e" : "#1d3160"; g.lineWidth = w; g.stroke(); }
  g.globalCompositeOperation = "lighter";
  for (let i = 1; i < N; i++) { if (i % 4 === 0) continue; const w = lerp(w0, w1, i / N); g.beginPath(); g.moveTo(...pts[i - 1]); g.lineTo(...pts[i]); g.strokeStyle = `rgba(90,230,255,${0.75 - 0.4 * (i / N)})`; g.lineWidth = w * 0.22; g.stroke(); }
  g.restore();
}
function drawTentacle(g, info, row, dir, k, now) {
  if (k <= 0) return;
  const reach = easeOut(clamp(k / 0.45, 0, 1)), slam = k > 0.6 ? clamp((k - 0.6) / 0.12, 0, 1) : 0, fade = k > 0.85 ? 1 - (k - 0.85) / 0.15 : 1;
  const x0 = dir > 0 ? -0.6 : info.cols + 0.6, len = info.cols + 1.2, n = 50, pts = [];
  const cs = whaleCs(info.cols / 2, row + 0.5);
  for (let i = 0; i <= n; i++) {
    const u = i / n; if (u > Math.max(0.05, reach)) break;
    const x = x0 + dir * u * len, arch = Math.sin(clamp(u / Math.max(reach, 0.05), 0, 1) * Math.PI) * 2.4 * (1 - slam) * (1 - u * 0.5) + 0.15;
    const [sx, sy] = screenOf(x, row + 0.5, arch);
    pts.push([sx, sy + Math.sin(u * 16 - now / 40) * cs * 0.1]);
  }
  strokePath(g, pts, cs * 0.6, cs * 0.12, fade);
  if (k < 0.45 && pts.length) { const [fx, fy] = pts[pts.length - 1]; sand(fx, fy, 2, 160); }
  if (slam > 0 && slam < 0.2) for (let x = 0; x < info.cols; x += 2) { const [sx, sy] = screenOf(x + 0.5, row + 0.5); sand(sx, sy, 3, 200); }
}
function jag(x0, y0, x1, y1, n, amp) { const pts = [[x0, y0]]; for (let i = 1; i < n; i++) { const u = i / n; pts.push([lerp(x0, x1, u) + rnd(-amp, amp), lerp(y0, y1, u) + rnd(-amp, amp)]); } pts.push([x1, y1]); return pts; }
function line(g, pts, col, w) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p))); g.strokeStyle = col; g.lineWidth = w; g.stroke(); }
function drawZap(g, e, k) {
  const chain = e.chain || []; if (!chain.length) return;
  const per = 0.55 / Math.max(1, chain.length);
  g.save(); g.globalCompositeOperation = "lighter"; g.lineJoin = "round"; g.lineCap = "round";
  for (let i = 0; i < chain.length; i++) {
    const k0 = 0.35 + i * per, kk = (k - k0) / 0.3;
    if (kk < 0 || kk > 1) continue;
    const a = 1 - kk, main = i === 0, cs = whaleCs(chain[i].x, chain[i].y);
    const from = i === 0 ? screenOf(V.x, V.y, V.z) : screenOf(chain[i - 1].x + 0.5, chain[i - 1].y + 0.5, 0.5);
    const to = screenOf(chain[i].x + 0.5, chain[i].y + 0.5, 0.5), sc = main ? 1.8 : 1;
    const trunk = jag(from[0], from[1], to[0], to[1], 14, cs * 0.45 * sc);
    line(g, trunk, `rgba(40,170,255,${0.3 * a})`, cs * 0.5 * sc); line(g, trunk, `rgba(150,240,255,${0.9 * a})`, cs * 0.12 * sc); line(g, trunk, `rgba(255,255,255,${a})`, cs * 0.045 * sc);
    for (let b = 0; b < (main ? 5 : 2); b++) {
      const j = 2 + Math.floor(Math.random() * (trunk.length - 4)), [bx, by] = trunk[j], ang = Math.atan2(to[1] - from[1], to[0] - from[0]) + rnd(-1.2, 1.2), L = cs * rnd(0.8, 2) * sc;
      line(g, jag(bx, by, bx + Math.cos(ang) * L, by + Math.sin(ang) * L, 5, cs * 0.25), `rgba(160,245,255,${0.7 * a})`, cs * 0.05 * sc);
    }
    const R = cs * (main ? 2.4 : 1.2), gr = g.createRadialGradient(to[0], to[1], 0, to[0], to[1], R);
    gr.addColorStop(0, `rgba(220,255,255,${0.9 * a})`); gr.addColorStop(1, "rgba(0,120,255,0)"); g.fillStyle = gr; g.beginPath(); g.arc(to[0], to[1], R, 0, TAU); g.fill();
    if (kk < 0.1) sparks(to[0], to[1], main ? 40 : 16, main ? 420 : 240);
  }
  g.restore();
}
function ellipsePath(g, cx, cy, r, z = 0) { g.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, p = screenOf(cx + Math.cos(a) * r, cy + Math.sin(a) * r, z); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); } g.closePath(); }
function drawWhirl(g, cx, cy, k, now) {
  const grow = easeOut(clamp(k / 0.25, 0, 1)), imp = k > 0.6 ? clamp((k - 0.6) / 0.06, 0, 1) : 0;
  const R = 2.1 * grow * (1 - imp * 0.85), a = k > 0.63 ? Math.max(0, 1 - (k - 0.63) / 0.2) : 1;
  if (R < 0.05) return;
  g.save(); g.globalAlpha = a;
  const [sx, sy] = screenOf(cx, cy), cs = whaleCs(cx, cy), gr = g.createRadialGradient(sx, sy, 0, sx, sy, R * cs);
  gr.addColorStop(0, "rgba(0,0,0,0.95)"); gr.addColorStop(0.4, "rgba(2,20,40,0.8)"); gr.addColorStop(1, "rgba(40,140,180,0)");
  ellipsePath(g, cx, cy, R); g.fillStyle = gr; g.fill();
  const spin = now / 1000 * (5 + k * 6);
  for (let layer = 0; layer < 3; layer++) for (let arm = 0; arm < 6; arm++) {
    g.beginPath();
    for (let i = 0; i <= 36; i++) { const u = i / 36, r = lerp(R * 0.06, R * (1 - layer * 0.12), u), th = arm * TAU / 6 + spin * (1 + layer * 0.35) - u * (4.5 + layer); const p = screenOf(cx + Math.cos(th) * r, cy + Math.sin(th) * r); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }
    g.strokeStyle = `rgba(${layer === 1 ? "200,250,255" : "120,230,255"},${0.5 - layer * 0.12})`; g.lineWidth = cs * (0.09 - layer * 0.02); g.stroke();
  }
  g.restore();
}
function drawGeyser(g, x, y, k, size, now) {
  const [sx, sy] = screenOf(x, y), cs = whaleCs(x, y);
  const up = k < 0.25 ? easeOut(k / 0.25) : 1, a = k > 0.5 ? 1 - (k - 0.5) / 0.5 : 1, h = cs * 6 * size * up, w = cs * 1.1 * size * (1 + k * 0.4);
  g.save(); g.globalAlpha = a;
  const gr = g.createLinearGradient(0, sy - h, 0, sy); gr.addColorStop(0, "rgba(200,250,255,0)"); gr.addColorStop(0.25, "rgba(200,250,255,0.55)"); gr.addColorStop(1, "rgba(120,220,255,0.85)");
  g.fillStyle = gr; g.beginPath(); g.moveTo(sx - w * 0.5, sy);
  for (let i = 0; i <= 12; i++) { const u = i / 12; g.lineTo(sx - w * (0.5 - u * 0.15) + Math.sin(u * 9 + now / 60) * w * 0.08, sy - h * u); }
  for (let i = 12; i >= 0; i--) { const u = i / 12; g.lineTo(sx + w * (0.5 - u * 0.15) + Math.sin(u * 8 + now / 50) * w * 0.08, sy - h * u); }
  g.closePath(); g.fill(); g.restore();
  if (k < 0.08) { spray(sx, sy, 50, cs * 9); bubbles(sx, sy, 20, cs); }
}
function drawElectricFloor(g, x, y, k) {
  const a = 1 - k;
  g.save(); g.globalCompositeOperation = "lighter";
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    const aa = a * (dx || dy ? 0.5 : 1) * (Math.random() < 0.3 ? 0.4 : 1);
    const c = [screenOf(x + dx, y + dy), screenOf(x + dx + 1, y + dy), screenOf(x + dx + 1, y + dy + 1), screenOf(x + dx, y + dy + 1)];
    g.beginPath(); c.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p))); g.closePath();
    g.fillStyle = `rgba(60,180,255,${0.18 * aa})`; g.fill(); g.strokeStyle = `rgba(170,250,255,${0.8 * aa})`; g.lineWidth = 1.5; g.stroke();
  }
  g.restore();
}
function drawRings(g, k) {
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < 3; i++) {
    const kk = k * 1.4 - i * 0.2; if (kk <= 0 || kk >= 1) continue;
    const r = easeOut(kk) * 24;
    ellipsePath(g, V.x, V.y, r); g.strokeStyle = `rgba(170,140,255,${0.5 * (1 - kk)})`; g.lineWidth = 14 * (1 - kk) + 2; g.stroke();
    g.strokeStyle = `rgba(220,255,255,${0.7 * (1 - kk)})`; g.lineWidth = 2; g.stroke();
  }
  g.restore();
}
function drawDeepShadow(g, x, y, k) {
  const [sx, sy] = screenOf(x, y), cs = whaleCs(x, y), R = cs * lerp(0.5, 3, easeOut(k));
  g.save(); const gr = g.createRadialGradient(sx, sy, 0, sx, sy, R); gr.addColorStop(0, "rgba(0,0,0,0.9)"); gr.addColorStop(1, "rgba(0,0,0,0)");
  ellipsePath(g, x, y, R / cs); g.fillStyle = gr; g.fill(); g.restore();
  if (Math.random() < 0.4) bubbles(sx + rnd(-R, R) * 0.5, sy, 1, 4);
}
function drawEmerge(g, x, y, k) {
  const img = IMG.whale_front; if (!img) return;
  const [sx, sy] = screenOf(x, y), cs = whaleCs(x, y);
  const up = k < 0.25 ? easeOut(k / 0.25) : k < 0.55 ? 1 : 1 - ease((k - 0.55) / 0.45);
  const w = cs * 6.5 * lerp(0.55, 1, up), h = w * img.height / img.width;
  g.save(); g.globalAlpha = clamp(up * 1.5, 0, 1);
  g.beginPath(); g.rect(sx - w, sy - h * 3, w * 2, h * 3 + cs * 0.2); g.clip();
  g.drawImage(img, sx - w / 2, sy - h * up * 0.95 + cs * 0.25, w, h);
  g.restore();
  if (k < 0.05) { spray(sx, sy, 90, cs * 11); bubbles(sx, sy, 40, cs * 1.2); sand(sx, sy, 50, cs * 6); }
}
function drawHeart(g, e, k, now) {
  const [sx, sy0] = screenOf(e.x, e.y), cs = whaleCs(e.x, e.y), yy = sy0 - cs * (0.6 + 2.2 * easeOut(Math.min(1, k * 1.5))), r = cs * 0.45 * (1 + 0.12 * Math.sin(now / 120));
  g.save(); g.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1; g.globalCompositeOperation = "lighter";
  g.translate(sx, yy); g.rotate(now / 1500);
  for (let i = 0; i < 8; i++) { g.rotate(TAU / 8); const lg = g.createLinearGradient(0, 0, cs * 4, 0); lg.addColorStop(0, "rgba(150,240,255,0.35)"); lg.addColorStop(1, "rgba(150,240,255,0)"); g.fillStyle = lg; g.beginPath(); g.moveTo(0, 0); g.lineTo(cs * 4, -cs * 0.25); g.lineTo(cs * 4, cs * 0.25); g.fill(); }
  g.setTransform(g.getTransform().a, 0, 0, g.getTransform().d, 0, 0);
  g.restore();
  g.save(); g.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
  const gr = g.createRadialGradient(sx, yy, 0, sx, yy, r * 4); gr.addColorStop(0, "rgba(200,255,255,0.95)"); gr.addColorStop(0.3, "rgba(60,200,255,0.5)"); gr.addColorStop(1, "rgba(0,120,255,0)");
  g.globalCompositeOperation = "lighter"; g.fillStyle = gr; g.beginPath(); g.arc(sx, yy, r * 4, 0, TAU); g.fill();
  g.globalCompositeOperation = "source-over"; g.font = `${Math.round(r * 2)}px sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("💙", sx, yy);
  g.restore();
}
function drawBait(g, e, k) {
  const u = easeOut(Math.min(1, k / 0.6)), x = lerp(e.from.x, e.to.x, u) + 0.5, y = lerp(e.from.y, e.to.y, u) + 0.5, z = 0.6 + Math.sin(u * Math.PI) * 1.6;
  const [sx, sy, s] = screenOf(x, y, z);
  if (k < 0.6) { g.fillStyle = "#8a2a2a"; g.beginPath(); g.ellipse(sx, sy, s * 0.09, s * 0.06, now0(k), 0, TAU); g.fill(); g.fillStyle = "#e0d0b0"; g.fillRect(sx - s * 0.02, sy - s * 0.08, s * 0.04, s * 0.06); }
  else if (e.hit) { const q = (k - 0.6) / 0.4, [tx, ty, ts] = screenOf(e.to.x + 0.5, e.to.y + 0.5, 0.6); g.fillStyle = `rgba(150,20,20,${0.5 * (1 - q)})`; g.beginPath(); g.ellipse(tx, ty, ts * (0.2 + q * 0.8), ts * (0.1 + q * 0.4), 0, 0, TAU); g.fill(); }
}
const now0 = (k) => k * 12;
function bloodAura(g, x, y, now) {
  const t = now / 1000;
  for (let i = 0; i < 7; i++) {
    const a = t * 0.8 + i * 0.9, r = 0.35 + 0.12 * Math.sin(t * 2 + i), [sx, sy, s] = screenOf(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6, 0.5 + 0.2 * Math.sin(t + i));
    g.fillStyle = `rgba(170,25,30,${0.22 + 0.1 * Math.sin(t * 3 + i)})`; g.beginPath(); g.ellipse(sx, sy, s * 0.16, s * 0.1, a, 0, TAU); g.fill();
  }
}
// ข่มขวัญ: under = เงาใต้กระดาน (ขวา → ซ้าย · 0–44%) · ไม่ใช่ under = ตัวจริงผ่านหน้ากล้อง (ซ้าย → ขวา · 37–100%) + จอมืด/แถบดำ
function drawFlyby(g, k, now, view, under) {
  if (!SPR) return;
  const X0 = view ? view.x0 : 0, Y0 = view ? view.y0 : 0, Wd = view ? view.x1 - view.x0 : 1280, Hd = view ? view.y1 - view.y0 : 720, t = now / 1000, spr = SPR.side;
  const el = k * 8200;
  if (under) {
    const kk = el / 3600; if (kk > 1) return;
    undulate(spr, spr.base, spr.o1, t, 24, 1.6);
    const sc = Wd * 2.4 / spr.SZ, x = X0 + lerp(Wd * 1.9, -Wd * 0.9, kk), y = Y0 + Hd * 0.5;
    g.save(); g.translate(x, y); g.scale(-sc, sc * 0.55); g.translate(-spr.ax * spr.SZ, -(spr.ay * spr.SZ + spr.PAD));
    g.globalAlpha = Math.sin(Math.PI * kk) * 0.7; g.filter = "brightness(0) blur(14px)"; g.drawImage(spr.o1.c, 0, 0); g.filter = "none"; g.restore();
    return;
  }
  // จอมืด + แถบดำ (ทั้งฉาก)
  const dimA = k < 0.05 ? k / 0.05 : k > 0.95 ? (1 - k) / 0.05 : 1;
  g.save(); g.fillStyle = `rgba(0,3,10,${0.45 * dimA})`; g.fillRect(X0, Y0, Wd, Hd);
  const bh = Hd * 0.09 * ease(dimA); g.fillStyle = "#000"; g.fillRect(X0, Y0, Wd, bh); g.fillRect(X0, Y0 + Hd - bh, Wd, bh); g.restore();
  const kp = (el - 3000) / 5200; if (kp <= 0 || kp >= 1) return;
  undulate(spr, spr.base, spr.o1, t, 28, 1.3); undulate(spr, spr.glow, spr.o2, t, 28, 1.3);
  const sc = Wd * 3.2 / spr.SZ, kk = kp * kp * (3 - 2 * kp) * 0.35 + kp * 0.65;
  const x = X0 + lerp(-Wd * 1.5, Wd * 2.6, kk), y = Y0 + Hd * 0.52 - Math.sin(kp * Math.PI) * Hd * 0.05, a = clamp(Math.min(kp / 0.08, (1 - kp) / 0.08), 0, 1);
  g.save(); g.translate(x, y); g.rotate(-0.06 + kp * 0.08); g.scale(sc, sc); g.translate(-spr.ax * spr.SZ, -(spr.ay * spr.SZ + spr.PAD));
  g.globalAlpha = a; g.filter = "brightness(0.75) blur(3px)"; g.drawImage(spr.o1.c, 0, 0); g.filter = "none";
  g.globalCompositeOperation = "lighter"; g.globalAlpha = a * (0.55 + 0.35 * Math.sin(t * 2.2)); g.drawImage(spr.o2.c, 0, 0);
  g.restore();
}
