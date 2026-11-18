// เอฟเฟกต์บนกระดานของแม็กน่า สวิง (characters/magna.js · GRID_PLAN §7.35)
//  อ้างอิงคลิป/รูปของผู้ใช้ (Black Clover): เวทไฟ = เปลวส้มแกนขาวเหลือง ประกายไฟลอย · ไม้เบสบอลมีไฟพันเป็นวง ·
//   Soul Chain Deathmatch = โซ่ข้อใหญ่ลุกเป็นไฟส้ม ม้วนเป็นวงบนพื้น · Soul Chain Finisher = ระเบิดไฟ แล้วโซ่กลายเป็นสีฟ้าเรือง (มานาย้อนกลับ)
//  ท่าตีปกติ (ฮุค attackStyle):
//   magnaSwing     ฟาดไม้เบสบอลไฟ: วงไฟโค้งจากตัว → ระเบิดไฟที่เป้า
//   magnaKnuckle   ระหว่าง Fire Knuckle: หมัดไฟพุ่ง + เปลวพ่นที่เป้า
//  เหตุการณ์จาก server (socket "magnaFx" → useCharSocketFx):
//   magnaBall     บอลไฟก่อตัว (เกลียวไฟเข้าศูนย์)        magnaBat     ตีบอลไฟ n ลูกพุ่งตามแนว (ฟาดไม้ก่อน)
//   magnaBatHit   บอลไฟระเบิดที่เป้า                       magnaThrow   ปาบอลไฟ + โซ่ไฟตามหลัง (miss = เลยไปจางหาย)
//   magnaLink     โซ่ไฟรัดแน่น วงไฟบนพื้นทั้งสองฝั่ง       magnaUnlink  โซ่แตกเป็นประกายไฟ
//   magnaArm      โซ่เปลี่ยนเป็นสีฟ้าเรือง                  magnaPull    โซ่ฟ้ากระชากเป้าเข้ามา
//   magnaFinHit   ระเบิดฟ้า-ไฟที่เป้า                      magnaKnuckleOn / magnaBoost  เปลวไฟพุ่งรอบตัว
//  ค้างบนตัว (boardUnits — u.magna): บอลไฟวนรอบตัว (จำนวนลูก) · เปลวรอบมือ (Fire Knuckle) · เปลวพ่นใต้เท้า (Fire Boost)
//  โซ่ค้าง (magnaChains — u.chain): ระหว่างเจ้าของโซ่กับคู่โซ่ ส้ม = ปกติ · ฟ้า = Finisher รอทำงาน
import { P } from "./boardGeo";

const TAU = Math.PI * 2;
const REDUCED = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const rgba = (rgb, a) => `rgba(${rgb},${clamp01(a)})`;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const hash = (a) => { const v = Math.sin(a * 127.1) * 43758.5453; return v - Math.floor(v); };
// สี: แกนไฟ (ขาวเหลือง) · ส้ม · แดงเข้ม · ฟ้าเรือง (Finisher) · ขาวฟ้า
const CORE = "255,246,210", GOLD = "255,200,80", ORANGE = "255,128,30", RED = "205,45,15", BLUE = "70,170,255", ICE = "205,240,255";

// จังหวะ (ms) — server characters/magna.js T (วินาที) ต้องตรงกัน
export const MAGNA_T = { bat: 550, throw: 600, pull: 550, finHit: 500 };
export const MAGNA_MS = { magnaSwing: 800, magnaKnuckle: 850 };
export const MAGNA_HIT_P = { magnaSwing: 0.36, magnaKnuckle: 0.32 };
export const MAGNA_FX_DUR = {
  ...MAGNA_MS, magnaBall: 900, magnaBat: 1300, magnaBatHit: 900, magnaThrow: 1100, magnaLink: 1200, magnaUnlink: 1100,
  magnaArm: 1100, magnaPull: 900, magnaFinHit: 1300, magnaKnuckleOn: 900, magnaBoost: 1000, magnaHeat: 600,
};
export const isMagnaFx = (kind) => typeof kind === "string" && kind in MAGNA_FX_DUR;

function bodyAt(x, y, n = 1) {
  n = Math.max(1, n | 0);
  const K = 1 + (n - 1) * 0.6, cx = x + n / 2, cy = y + n / 2;
  const [bx, by, s] = P(cx, cy);
  return { bx, by, s, hy: by - s * 0.55 * K, K };
}
function glow(g, x, y, r, rgb, a, core = CORE) {
  if (a <= 0 || r <= 0) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(core, a));
  gr.addColorStop(0.35, rgba(rgb, a * 0.8));
  gr.addColorStop(1, rgba(rgb, 0));
  g.fillStyle = gr;
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}
function ring(g, x, y, r, w, a, rgb) {
  if (a <= 0 || r <= 0) return;
  g.strokeStyle = rgba(rgb, a); g.lineWidth = Math.max(1, w);
  g.beginPath(); g.ellipse(x, y, r, r * 0.5, 0, 0, TAU); g.stroke();
}
// บอลไฟ: แกนขาว + เปลวส้มสั่นไหว + หางตามทิศ (ux, uy)
function fireball(g, x, y, r, a, t, ux = 0, uy = 0, blue = false) {
  if (a <= 0) return;
  const body = blue ? BLUE : ORANGE;
  if (ux || uy) {
    for (let i = 1; i <= 4; i++) glow(g, x - ux * r * i * 0.7, y - uy * r * i * 0.7, r * (1 - i * 0.16), blue ? BLUE : RED, a * (0.45 - i * 0.08), blue ? ICE : GOLD);
  }
  glow(g, x, y, r * 1.7, body, a * 0.55, GOLD);
  for (let i = 0; i < 5; i++) {
    const ang = t * 0.011 + i * TAU / 5, w = r * (0.55 + 0.25 * Math.sin(t * 0.02 + i));
    glow(g, x + Math.cos(ang) * r * 0.45, y + Math.sin(ang) * r * 0.45, w, blue ? BLUE : ORANGE, a * 0.6, blue ? ICE : GOLD);
  }
  glow(g, x, y, r * 0.7, body, a, blue ? ICE : CORE);
}
// ประกายไฟลอยขึ้น
function embers(g, x, y, s, k, seed, q, a, rgb = GOLD) {
  for (let i = 0; i < k; i++) {
    const h = hash(seed + i * 3.1), h2 = hash(seed + i * 7.7);
    const ang = h * TAU, d = s * (0.15 + 0.7 * q * (0.5 + h2));
    const px = x + Math.cos(ang) * d, py = y + Math.sin(ang) * d * 0.6 - s * 0.6 * q * h2;
    g.fillStyle = rgba(rgb, a * (1 - q) * (0.6 + 0.4 * h));
    g.beginPath(); g.arc(px, py, Math.max(1, s * 0.022 * (1 + h)), 0, TAU); g.fill();
  }
}
// ระเบิดไฟ (วงไฟบนพื้น + ลูกไฟ + ประกาย)
function burst(g, B, q, seed, lowQ, blue = false) {
  if (q < 0 || q > 1) return;
  const main = blue ? BLUE : ORANGE, hot = blue ? ICE : GOLD;
  g.save(); g.globalCompositeOperation = "lighter";
  if (q < 0.25) glow(g, B.bx, B.hy, B.s * (0.4 + 1.0 * q / 0.25), main, (1 - q / 0.25) * 0.9, hot);
  glow(g, B.bx, B.hy, B.s * (0.3 + 0.5 * easeOut(q)), blue ? BLUE : RED, (1 - q) * 0.6, hot);
  ring(g, B.bx, B.by - B.s * 0.03, B.s * (0.2 + 0.75 * easeOut(q)), B.s * 0.06, (1 - q) * 0.85, main);
  embers(g, B.bx, B.hy, B.s, lowQ ? 8 : 18, seed, q, 1, hot);
  g.restore();
}
// โซ่: ข้อวงรีสลับแนว เรืองไฟ/ฟ้า · upto = วาดถึงตรงไหน (0–1)
function chain(g, at, s, a, now, blue, lowQ, upto = 1, seed = 0) {
  if (a <= 0 || upto <= 0) return;
  const main = blue ? BLUE : ORANGE, hot = blue ? ICE : GOLD;
  const [x0, y0] = at(0), [x1, y1] = at(Math.min(1, upto));
  const L = Math.hypot(x1 - x0, y1 - y0) / Math.max(0.05, upto);
  const n = Math.max(3, Math.min(lowQ ? 14 : 28, Math.round(L / (s * 0.16))));
  g.save(); g.globalCompositeOperation = "lighter";
  // แสงเรืองตามแนว
  g.lineCap = "round";
  g.strokeStyle = rgba(main, a * 0.28); g.lineWidth = s * 0.16;
  g.beginPath();
  for (let i = 0; i <= 20; i++) { const t = (i / 20) * upto; const [x, y] = at(t); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
  g.stroke();
  // ข้อโซ่
  for (let i = 0; i < n; i++) {
    const t = ((i + 0.5) / n) * 1;
    if (t > upto) break;
    const [x, y] = at(t), [xa, ya] = at(Math.min(1, t + 0.01));
    const ang = Math.atan2(ya - y, xa - x);
    const flick = REDUCED ? 1 : 0.75 + 0.25 * Math.sin(now / 90 + i * 1.7 + seed);
    g.save(); g.translate(x, y); g.rotate(ang);
    const rw = s * 0.09, rh = i % 2 ? s * 0.032 : s * 0.06;
    g.strokeStyle = rgba(main, a * 0.9 * flick); g.lineWidth = Math.max(1.5, s * 0.03);
    g.beginPath(); g.ellipse(0, 0, rw, rh, 0, 0, TAU); g.stroke();
    g.strokeStyle = rgba(hot, a * 0.8 * flick); g.lineWidth = Math.max(1, s * 0.009);
    g.beginPath(); g.ellipse(0, 0, rw, rh, 0, 0, TAU); g.stroke();
    g.restore();
  }
  // เปลวเลียตามโซ่
  if (!lowQ) {
    for (let i = 0; i < 6; i++) {
      const t = REDUCED ? (i + 0.5) / 6 : ((now / 1400 + i / 6 + seed * 0.1) % 1);
      if (t > upto) continue;
      const [x, y] = at(t);
      glow(g, x, y - s * 0.05, s * 0.09, main, a * 0.5 * Math.sin(t * Math.PI), hot);
    }
  }
  g.restore();
}

// ---------- ตีปกติ ----------
function swingFx(g, e, p, seed, lowQ) {
  const A = bodyAt(e.x, e.y, e.size || 1), B = bodyAt(e.to.x, e.to.y, e.toSize || 1);
  const H = MAGNA_HIT_P.magnaSwing;
  const dx = B.bx - A.bx, dy = B.hy - A.hy, base = Math.atan2(dy, dx);
  g.save(); g.globalCompositeOperation = "lighter";
  // วงไม้ฟาด: เง้า (−) → ฟาดข้าม (+) ทิ้งรอยไฟโค้ง
  const sw = clamp01(p / H), r = A.s * 0.62;
  const a0 = base - 1.5, a1 = base - 1.5 + 2.4 * easeOut(sw);
  if (p < H + 0.25) {
    const fade = 1 - clamp01((p - H) / 0.25);
    g.lineCap = "round";
    for (const [w, col, al] of [[A.s * 0.16, RED, 0.35], [A.s * 0.09, ORANGE, 0.75], [A.s * 0.035, CORE, 0.95]]) {
      g.strokeStyle = rgba(col, al * fade); g.lineWidth = w;
      g.beginPath(); g.ellipse(A.bx, A.hy, r, r * 0.7, 0, Math.max(a0, a1 - 1.2), a1); g.stroke();
    }
    // หัวไม้ไฟ
    glow(g, A.bx + Math.cos(a1) * r, A.hy + Math.sin(a1) * r * 0.7, A.s * 0.17, ORANGE, fade, GOLD);
    if (!lowQ) embers(g, A.bx + Math.cos(a1) * r, A.hy + Math.sin(a1) * r * 0.7, A.s * 0.6, 6, seed, sw * 0.6, fade);
  }
  g.restore();
  burst(g, B, (p - H) / (1 - H), seed, lowQ);
}
function knuckleFx(g, e, p, seed, lowQ) {
  const A = bodyAt(e.x, e.y, e.size || 1), B = bodyAt(e.to.x, e.to.y, e.toSize || 1);
  const H = MAGNA_HIT_P.magnaKnuckle;
  const dx = B.bx - A.bx, dy = B.hy - A.hy, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  g.save(); g.globalCompositeOperation = "lighter";
  const sw = clamp01((p - H * 0.35) / (H * 0.65));
  if (p < H + 0.1) {
    const x = A.bx + dx * sw, y = A.hy + dy * sw;
    fireball(g, x, y, A.s * 0.16, 1 - clamp01((p - H) / 0.1), p * 900, ux, uy);
  } else if (!lowQ) {
    // เปลวพ่นทะลุหลังเป้า
    const q = (p - H) / (1 - H);
    for (let i = 0; i < 6; i++) {
      const d = B.s * (0.2 + 0.9 * easeOut(q) * (0.6 + 0.4 * hash(seed + i)));
      glow(g, B.bx + ux * d + (hash(seed + i * 2) - 0.5) * B.s * 0.3, B.hy + uy * d, B.s * 0.2 * (1 - q), ORANGE, (1 - q) * 0.7, GOLD);
    }
  }
  g.restore();
  burst(g, B, (p - H) / (1 - H), seed, lowQ);
}

// ---------- เหตุการณ์ ----------
function ballFx(g, e, now, p, seed, lowQ) {
  const A = bodyAt(e.x, e.y);
  g.save(); g.globalCompositeOperation = "lighter";
  const cx = A.bx + A.s * 0.32, cy = A.hy - A.s * 0.1;
  // เกลียวไฟวิ่งเข้าศูนย์
  const k = lowQ ? 5 : 10;
  for (let i = 0; i < k; i++) {
    const ang = i * TAU / k + p * 6, d = A.s * 0.6 * (1 - easeOut(clamp01(p / 0.6)));
    glow(g, cx + Math.cos(ang) * d, cy + Math.sin(ang) * d * 0.6, A.s * 0.06, ORANGE, 0.8 * (1 - p), GOLD);
  }
  const grow = easeOut(clamp01((p - 0.3) / 0.4));
  fireball(g, cx, cy, A.s * 0.13 * grow, 1 - clamp01((p - 0.8) / 0.2) * 0.4, now);
  g.restore();
}
function batFx(g, e, now, p, seed, lowQ) {
  const A = bodyAt(e.x, e.y), to = e.to || { x: e.x, y: e.y }, B = bodyAt(to.x, to.y);
  const H = MAGNA_T.bat / MAGNA_FX_DUR.magnaBat;
  const dx = B.bx - A.bx, dy = B.hy - A.hy, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  g.save(); g.globalCompositeOperation = "lighter";
  // ฟาดไม้ (สั้นๆ ก่อนบอลออก)
  const sw = clamp01(p / 0.22);
  if (p < 0.35) {
    const r = A.s * 0.55, base = Math.atan2(dy, dx), a1 = base - 1.4 + 2.2 * easeOut(sw);
    g.lineCap = "round";
    g.strokeStyle = rgba(ORANGE, 0.85 * (1 - p / 0.35)); g.lineWidth = A.s * 0.08;
    g.beginPath(); g.ellipse(A.bx, A.hy, r, r * 0.7, 0, a1 - 1.1, a1); g.stroke();
  }
  // บอลไฟ n ลูกพุ่ง (ลูกที่สองตามหลัง)
  const n = Math.max(1, e.n | 0);
  for (let i = 0; i < n; i++) {
    const q = clamp01((p - 0.18 - i * 0.08) / (H - 0.18));
    if (q <= 0 || q >= 1) continue;
    const off = (i - (n - 1) / 2) * A.s * 0.12;
    fireball(g, A.bx + dx * q - uy * off, A.hy + dy * q - Math.sin(q * Math.PI) * A.s * 0.25 + ux * off, A.s * 0.12, 1, now + i * 300, ux, uy);
  }
  g.restore();
  if (!e.target) burst(g, B, (p - H) / (1 - H) * 1.4, seed, lowQ); // ไม่โดนใคร = ไปแตกปลายแนว
}
function throwFx(g, e, now, p, seed, lowQ) {
  const A = bodyAt(e.x, e.y), to = e.to || { x: e.x, y: e.y }, B = bodyAt(to.x, to.y);
  const H = MAGNA_T.throw / MAGNA_FX_DUR.magnaThrow;
  const dx = B.bx - A.bx, dy = B.hy - A.hy, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  const q = clamp01(p / H) * (e.miss ? 1.35 : 1);
  const head = [A.bx + dx * q, A.hy + dy * q - Math.sin(Math.min(1, q) * Math.PI) * A.s * 0.35];
  const at = (t) => { const tt = t * q; return [A.bx + dx * tt, A.hy + dy * tt - Math.sin(Math.min(1, tt) * Math.PI) * A.s * 0.35]; };
  const fade = e.miss ? 1 - clamp01((p - H) / (1 - H)) : 1 - clamp01((p - 0.9) / 0.1);
  chain(g, at, A.s, fade, now, false, lowQ, 1, seed);
  g.save(); g.globalCompositeOperation = "lighter";
  if (p < H || e.miss) fireball(g, head[0], head[1], A.s * 0.14, fade, now, ux, uy);
  g.restore();
  if (!e.miss) burst(g, B, (p - H) / (1 - H), seed, lowQ);
}
function linkFx(g, e, now, p, seed, lowQ) {
  const A = bodyAt(e.x, e.y), to = e.to || { x: e.x, y: e.y }, B = bodyAt(to.x, to.y);
  g.save(); g.globalCompositeOperation = "lighter";
  // วงไฟม้วนบนพื้นรอบทั้งสองคน (แบบวงโซ่ในคลิป)
  for (const U of [A, B]) {
    const q = easeOut(clamp01(p / 0.5));
    ring(g, U.bx, U.by, U.s * (0.25 + 0.45 * q), U.s * 0.05, (1 - p) * 0.9, ORANGE);
    ring(g, U.bx, U.by, U.s * (0.15 + 0.35 * q), U.s * 0.02, (1 - p) * 0.9, GOLD);
    embers(g, U.bx, U.hy, U.s, lowQ ? 6 : 14, seed + U.bx, p, 1);
  }
  // โซ่ตึงแวบ
  if (p < 0.3) glow(g, (A.bx + B.bx) / 2, (A.hy + B.hy) / 2, A.s * 0.8, ORANGE, (1 - p / 0.3) * 0.6, GOLD);
  g.restore();
}
function unlinkFx(g, e, now, p, seed, lowQ) {
  const A = bodyAt(e.x, e.y), to = e.to || { x: e.x, y: e.y }, B = bodyAt(to.x, to.y);
  g.save(); g.globalCompositeOperation = "lighter";
  const k = lowQ ? 10 : 22;
  for (let i = 0; i < k; i++) {
    const t = (i + 0.5) / k;
    const x = A.bx + (B.bx - A.bx) * t, y = A.hy + (B.hy - A.hy) * t - Math.sin(t * Math.PI) * A.s * 0.3;
    const h = hash(seed + i);
    const fall = easeOut(p) * A.s * (0.3 + 0.5 * h);
    g.fillStyle = rgba(i % 3 ? GOLD : ORANGE, (1 - p) * 0.9);
    g.beginPath(); g.arc(x + (h - 0.5) * A.s * 0.4 * p, y + fall, Math.max(1, A.s * 0.03 * (1 - p * 0.6)), 0, TAU); g.fill();
  }
  g.restore();
}
function armFx(g, e, now, p, seed, lowQ) {
  const A = bodyAt(e.x, e.y), to = e.to || { x: e.x, y: e.y }, B = bodyAt(to.x, to.y);
  g.save(); g.globalCompositeOperation = "lighter";
  // คลื่นฟ้าวิ่งจากแม็กน่าไปตามโซ่
  const q = easeOut(clamp01(p / 0.6));
  const x = A.bx + (B.bx - A.bx) * q, y = A.hy + (B.hy - A.hy) * q - Math.sin(q * Math.PI) * A.s * 0.3;
  glow(g, x, y, A.s * 0.35, BLUE, 1 - p, ICE);
  glow(g, A.bx, A.hy, A.s * 0.7, BLUE, (1 - p) * 0.6, ICE);
  ring(g, A.bx, A.by, A.s * (0.3 + 0.6 * q), A.s * 0.04, (1 - p) * 0.8, BLUE);
  g.restore();
}
function pullFx(g, e, now, p, seed, lowQ) {
  const F = bodyAt(e.from.x, e.from.y), T = bodyAt(e.to.x, e.to.y), A = bodyAt(e.x, e.y);
  g.save(); g.globalCompositeOperation = "lighter";
  const q = easeOut(clamp01(p / 0.6));
  const x = F.bx + (T.bx - F.bx) * q, y = F.hy + (T.hy - F.hy) * q;
  chain(g, (t) => [A.bx + (x - A.bx) * t, A.hy + (y - A.hy) * t], A.s, 1 - clamp01((p - 0.7) / 0.3), now, true, lowQ, 1, seed);
  for (let i = 1; i <= (lowQ ? 2 : 5); i++) glow(g, x - (T.bx - F.bx) * 0.06 * i, y - (T.hy - F.hy) * 0.06 * i, A.s * 0.2, BLUE, (1 - p) * (0.5 - i * 0.08), ICE);
  g.restore();
}
function finHitFx(g, e, now, p, seed, lowQ) {
  const B = bodyAt(e.to.x, e.to.y);
  // ไฟก่อน แล้วฟ้าตาม (แบบคลิป: ระเบิดไฟ → มานาฟ้าแตกที่อก)
  burst(g, B, p / 0.6, seed, lowQ, false);
  burst(g, B, (p - 0.2) / 0.8, seed + 9, lowQ, true);
  if (!lowQ && p < 0.5) {
    g.save(); g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 10; i++) {
      const ang = i * TAU / 10 + seed, d = B.s * (0.2 + 0.8 * easeOut(p / 0.5));
      g.strokeStyle = rgba(ICE, (1 - p / 0.5) * 0.9); g.lineWidth = Math.max(1, B.s * 0.015);
      g.beginPath(); g.moveTo(B.bx + Math.cos(ang) * d * 0.4, B.hy + Math.sin(ang) * d * 0.4); g.lineTo(B.bx + Math.cos(ang) * d, B.hy + Math.sin(ang) * d); g.stroke();
    }
    g.restore();
  }
}
function flareFx(g, e, now, p, seed, lowQ, boost) {
  const A = bodyAt(e.x, e.y);
  g.save(); g.globalCompositeOperation = "lighter";
  const q = easeOut(p);
  glow(g, A.bx, A.hy, A.s * (0.4 + 0.6 * q), boost ? RED : ORANGE, (1 - p) * 0.8, GOLD);
  ring(g, A.bx, A.by, A.s * (0.2 + 0.7 * q), A.s * 0.05, (1 - p) * 0.9, ORANGE);
  const k = lowQ ? 6 : 12;
  for (let i = 0; i < k; i++) {
    const ang = i * TAU / k + seed, up = A.s * (0.2 + 0.9 * q) * (0.6 + 0.4 * hash(seed + i));
    glow(g, A.bx + Math.cos(ang) * A.s * 0.3, A.by - up, A.s * 0.1 * (1 - p), ORANGE, (1 - p) * 0.8, GOLD);
  }
  g.restore();
}
function heatFx(g, e, now, p) {
  const A = bodyAt(e.x, e.y);
  g.save(); g.globalCompositeOperation = "lighter";
  glow(g, A.bx, A.hy - A.s * 0.2 * p, A.s * 0.25, (e.heat || 0) >= 8 ? RED : ORANGE, (1 - p) * 0.6, GOLD);
  g.restore();
}

export function magnaFx(g, e, now, lowQ) {
  const dur = e.dur || MAGNA_FX_DUR[e.kind];
  const p = (now - e.t0) / dur;
  if (p < 0 || p > 1) return;
  const seed = ((e.t0 | 0) % 977) / 97;
  g.save();
  if (e.kind === "magnaSwing") { if (e.to) swingFx(g, e, p, seed, lowQ); }
  else if (e.kind === "magnaKnuckle") { if (e.to) knuckleFx(g, e, p, seed, lowQ); }
  else if (e.kind === "magnaBall") ballFx(g, e, now, p, seed, lowQ);
  else if (e.kind === "magnaBat") batFx(g, e, now, p, seed, lowQ);
  else if (e.kind === "magnaBatHit") { if (e.to) burst(g, bodyAt(e.to.x, e.to.y), p, seed, lowQ); }
  else if (e.kind === "magnaThrow") throwFx(g, e, now, p, seed, lowQ);
  else if (e.kind === "magnaLink") linkFx(g, e, now, p, seed, lowQ);
  else if (e.kind === "magnaUnlink") unlinkFx(g, e, now, p, seed, lowQ);
  else if (e.kind === "magnaArm") armFx(g, e, now, p, seed, lowQ);
  else if (e.kind === "magnaPull") { if (e.from && e.to) pullFx(g, e, now, p, seed, lowQ); }
  else if (e.kind === "magnaFinHit") { if (e.to) finHitFx(g, e, now, p, seed, lowQ); }
  else if (e.kind === "magnaKnuckleOn" || e.kind === "magnaBoost") flareFx(g, e, now, p, seed, lowQ, e.kind === "magnaBoost");
  else if (e.kind === "magnaHeat") heatFx(g, e, now, p);
  g.restore();
}

// ---------- ค้างบนตัว ----------
// หลังตัว: แสงร้อนตาม OverHeat (5+ ส้ม · 8 แดง) · เปลวพ่นใต้เท้า (Fire Boost)
export function magnaAuraBack(g, x, y, now, lowQ, alpha, m) {
  if (!m) return;
  const [bx, by, s] = P(x, y);
  g.save(); g.globalAlpha *= alpha; g.globalCompositeOperation = "lighter";
  if (m.heat >= 5) glow(g, bx, by - s * 0.4, s * (0.45 + 0.04 * m.heat), m.heat >= 8 ? RED : ORANGE, 0.22 + 0.08 * Math.sin(now / 160), GOLD);
  if (m.boost > 0) {
    for (let i = 0; i < (lowQ ? 3 : 6); i++) {
      const t = REDUCED ? i / 6 : ((now / 500 + i / 6) % 1);
      glow(g, bx + Math.sin(i * 2.1) * s * 0.18, by - s * 0.05 - t * s * 0.4, s * 0.12 * (1 - t), ORANGE, 0.7 * (1 - t), GOLD);
    }
  }
  g.restore();
}
// หน้าตัว: บอลไฟวนรอบตัว · เปลวที่มือ (Fire Knuckle)
export function magnaAuraFront(g, x, y, now, lowQ, alpha, m) {
  if (!m) return;
  const [bx, by, s] = P(x, y);
  g.save(); g.globalAlpha *= alpha; g.globalCompositeOperation = "lighter";
  const n = Math.max(0, Math.min(3, m.balls | 0));
  for (let i = 0; i < n; i++) {
    const ang = (REDUCED ? 0 : now / 900) + i * TAU / 3;
    const px = bx + Math.cos(ang) * s * 0.42, py = by - s * 0.55 + Math.sin(ang) * s * 0.16;
    fireball(g, px, py, s * 0.09, 0.95, now + i * 200);
  }
  if (m.knuckle > 0) {
    const hx = bx + s * 0.22, hy = by - s * 0.45;
    glow(g, hx, hy, s * (0.13 + 0.02 * Math.sin(now / 80)), ORANGE, 0.85, GOLD);
    if (!lowQ) embers(g, hx, hy, s * 0.6, 5, Math.floor(now / 300), (now % 300) / 300, 0.9);
  }
  g.restore();
}
// โซ่ค้างระหว่างเจ้าของโซ่กับคู่โซ่ (units[].chain = { to, armed })
export function magnaChains(g, units, now, lowQ) {
  const byId = {};
  for (const u of units) byId[u.id] = u;
  for (const u of units) {
    if (!u.chain || !u.chain.to) continue;
    const b = byId[u.chain.to];
    if (!b) continue;
    const ax = u.rx + (u.size || 1) / 2 + (u.ox || 0), ay = u.ry + (u.size || 1) / 2 + (u.oy || 0);
    const cx = b.rx + (b.size || 1) / 2 + (b.ox || 0), cy = b.ry + (b.size || 1) / 2 + (b.oy || 0);
    const [x0, y0, s0] = P(ax, ay), [x1, y1, s1] = P(cx, cy);
    const A = { bx: x0, hy: y0 - s0 * 0.45 }, B = { bx: x1, hy: y1 - s1 * 0.45 };
    const s = (s0 + s1) / 2;
    const slack = Math.max(0.05, 1 - Math.hypot(cx - ax, cy - ay) / 4.2); // ใกล้กัน = โซ่หย่อน
    const at = (t) => { const x = A.bx + (B.bx - A.bx) * t, y = A.hy + (B.hy - A.hy) * t; return [x, y + Math.sin(t * Math.PI) * s * 0.35 * slack]; };
    const a = Math.min(u.alpha == null ? 1 : u.alpha, b.alpha == null ? 1 : b.alpha);
    chain(g, at, s, 0.9 * a, now, !!u.chain.armed, lowQ, 1, ax + ay);
  }
}
