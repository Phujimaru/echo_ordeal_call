// เอฟเฟกต์บนกระดานของเค็นโซ ซุกะ (characters/kenzo_suga.js · GRID_PLAN §7.44) — ธีม Bake: ม่วงกัดกร่อน + ฟ้าเขี้ยวปืน
//  ท่าตีปกติ (ฮุค attackStyle):
//   bakeShot       ร่างมนุษย์: กระสุน Magnum นัดเดียว ประกายทอง
//   bakeShotRider  ร่างไรเดอร์: กระสุนกรดม่วงหยดเป็นทาง → ขากรรไกรงับที่เป้า + กรดกระเซ็น
//  เหตุการณ์ socket "bakeFx" (kind → fx):
//   corrode → bakeCorrode  ฟองกรดผุดรอบเป้า (n = หน่วยการกัดกิน) — ลงตอนปะทะ (boardFxAtHit)
//   decay   → bakeDecay    เศษสนิมร่วง — ลงตอนปะทะ
//   again   → bakeAgain    วงม่วงรอบเค็นโซ + บั้งชี้ขึ้น (ได้ยิงอีกครั้ง)
//   henshin → bakeHenshin  เสาแสงม่วง + เขี้ยวงับรอบตัว (แปลงร่างครั้งหลัง — ครั้งแรกเป็นคลิป)
//   revert  → bakeRevert   ประกายกระจายออก (คืนร่าง)
import { P } from "./boardGeo";

const TAU = Math.PI * 2;
const PURPLE = "176,64,255", ACID = "214,140,255", CYAN = "110,230,240", GOLD = "255,214,120", RUST = "150,82,40";
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const rgba = (rgb, a) => `rgba(${rgb},${clamp01(a)})`;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export const BAKE_MS = { bakeShot: 620, bakeShotRider: 820 };
export const BAKE_HIT_P = { bakeShot: 0.4, bakeShotRider: 0.42 };
export const BAKE_EVENT_FX = { corrode: "bakeCorrode", decay: "bakeDecay", again: "bakeAgain", henshin: "bakeHenshin", revert: "bakeRevert" };
export const BAKE_FX_DUR = { ...BAKE_MS, bakeCorrode: 1000, bakeDecay: 900, bakeAgain: 750, bakeHenshin: 1300, bakeRevert: 750 };
export const isBakeFx = (kind) => typeof kind === "string" && kind in BAKE_FX_DUR;

function bodyAt(x, y, n = 1) {
  n = Math.max(1, n | 0);
  const K = 1 + (n - 1) * 0.6, cx = x + n / 2, cy = y + n / 2;
  const [bx, by, s] = P(cx, cy);
  return { bx, by, s, r: s * 0.4 * K, hy: by - s * 0.86 * K };
}
function halo(g, x, y, r, rgb, a) {
  if (a <= 0 || r <= 0) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba("255,255,255", a));
  gr.addColorStop(0.35, rgba(rgb, a * 0.8));
  gr.addColorStop(1, rgba(rgb, 0));
  g.fillStyle = gr;
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}
function ring(g, x, y, r, rgb, a, w) {
  if (a <= 0) return;
  g.strokeStyle = rgba(rgb, a);
  g.lineWidth = w;
  g.beginPath(); g.ellipse(x, y, r, r * 0.8, 0, 0, TAU); g.stroke();
}
// เขี้ยว 3 ซี่ (ฟ้า) บน/ล่าง หุบเข้าหากลาง k = 0 อ้า → 1 งับ
function jaws(g, x, y, r, k, a) {
  if (a <= 0) return;
  const gap = r * (1.1 - k * 0.95);
  g.fillStyle = rgba(CYAN, a);
  g.strokeStyle = rgba("255,255,255", a * 0.8);
  g.lineWidth = 1.2;
  for (const side of [-1, 1]) {
    for (let i = -1; i <= 1; i++) {
      const cx = x + i * r * 0.55, cy = y + side * gap;
      g.beginPath();
      g.moveTo(cx - r * 0.2, cy);
      g.lineTo(cx + r * 0.2, cy);
      g.lineTo(cx, cy - side * r * 0.42);
      g.closePath(); g.fill(); g.stroke();
    }
    g.fillStyle = rgba("120,20,30", a * 0.9); // เหงือกปืนแดงเข้ม
    g.fillRect(x - r * 0.85, y + side * gap + (side > 0 ? 0 : -r * 0.16), r * 1.7, r * 0.16);
    g.fillStyle = rgba(CYAN, a);
  }
}
function muzzle(g, A, B, a) {
  if (a <= 0) return;
  const L = Math.hypot(B.bx - A.bx, B.hy - A.hy) || 1;
  const x = A.bx + ((B.bx - A.bx) / L) * A.r * 0.9, y = A.hy + ((B.hy - A.hy) / L) * A.r * 0.9;
  halo(g, x, y, A.r * 0.9, PURPLE, a);
}
function bolt(g, A, B, q, rgb, w, trail) {
  const x = A.bx + (B.bx - A.bx) * q, y = A.hy + (B.hy - A.hy) * q;
  const tq = Math.max(0, q - 0.22), tx = A.bx + (B.bx - A.bx) * tq, ty = A.hy + (B.hy - A.hy) * tq;
  const gr = g.createLinearGradient(tx, ty, x, y);
  gr.addColorStop(0, rgba(rgb, 0));
  gr.addColorStop(1, rgba("255,255,255", 1));
  g.strokeStyle = gr;
  g.lineWidth = w;
  g.lineCap = "round";
  g.beginPath(); g.moveTo(tx, ty); g.lineTo(x, y); g.stroke();
  halo(g, x, y, w * 2.4, rgb, 0.9);
  if (trail) {
    // หยดกรดร่วงตามทาง
    for (let i = 1; i <= 4; i++) {
      const dq = Math.max(0, q - i * 0.07), dx = A.bx + (B.bx - A.bx) * dq, dy = A.hy + (B.hy - A.hy) * dq;
      g.fillStyle = rgba(ACID, 0.8 - i * 0.16);
      g.beginPath(); g.arc(dx, dy + i * i * 1.6, w * 0.5, 0, TAU); g.fill();
    }
  }
}
function splash(g, B, q, seed, rgb, n) {
  const o = easeOut(q);
  for (let i = 0; i < n; i++) {
    const a = seed + i * 2.399, d = B.r * (0.4 + o * (1 + (i % 3) * 0.35));
    const x = B.bx + Math.cos(a) * d, y = B.hy + Math.sin(a) * d * 0.6 + q * q * B.s * 0.5;
    g.fillStyle = rgba(rgb, 1 - q);
    g.beginPath(); g.arc(x, y, Math.max(1, B.r * 0.1 * (1 - q * 0.6)), 0, TAU); g.fill();
  }
}

function shotFx(g, e, p, seed, rider) {
  const hit = BAKE_HIT_P[e.kind];
  const A = bodyAt(e.x, e.y, e.size || 1), B = bodyAt(e.to.x, e.to.y, e.toSize || 1);
  if (rider) {
    // ขากรรไกรอ้ารอที่เป้าก่อนกระสุนถึง แล้วงับตอนปะทะ
    const pre = clamp01((p - 0.12) / (hit - 0.12));
    if (p < hit + 0.25) jaws(g, B.bx, B.hy, B.r * 1.1, p < hit ? 0 : clamp01((p - hit) / 0.1), p < hit ? pre * 0.85 : 1 - clamp01((p - hit - 0.12) / 0.13));
  }
  muzzle(g, A, B, 1 - Math.abs(p - 0.06) / 0.08);
  if (p >= 0.04 && p < hit) bolt(g, A, B, (p - 0.04) / (hit - 0.04), rider ? PURPLE : GOLD, A.s * (rider ? 0.07 : 0.05), rider);
  if (p < hit) return;
  const q = clamp01((p - hit) / (1 - hit)), o = easeOut(q);
  halo(g, B.bx, B.hy, B.r * (0.8 + o * (rider ? 1.4 : 0.9)), rider ? PURPLE : GOLD, (1 - q) * 0.95);
  ring(g, B.bx, B.hy, B.r * (0.5 + o * 1.6), rider ? ACID : "255,255,255", 1 - q, rider ? 3 : 2);
  splash(g, B, q, seed, rider ? ACID : GOLD, rider ? 14 : 7);
}

function corrodeFx(g, e, p, seed, lowQ) {
  const B = bodyAt(e.x, e.y, e.size || 1);
  const n = lowQ ? 8 : 16, stack = Math.min(6, Math.max(1, e.n | 0));
  halo(g, B.bx, B.by - B.s * 0.2, B.r * (1.2 + stack * 0.12), PURPLE, 0.45 * (1 - p));
  for (let i = 0; i < n; i++) {
    const ph = (p * 1.6 + i / n) % 1, a = seed + i * 2.399;
    const x = B.bx + Math.cos(a) * B.r * (0.5 + (i % 4) * 0.2);
    const y = B.by - ph * B.s * 1.1;
    const r = B.r * (0.07 + ((i * 7) % 5) * 0.025) * (1 - ph * 0.4);
    g.strokeStyle = rgba(ACID, (1 - ph) * (1 - p) * 1.2);
    g.lineWidth = 1.4;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
  }
  // หยดไหลลงตัว
  for (let i = 0; i < 5; i++) {
    const x = B.bx + (i - 2) * B.r * 0.32, len = B.s * 0.35 * easeOut(clamp01(p * 1.8 - i * 0.1));
    g.strokeStyle = rgba(PURPLE, 0.8 * (1 - p));
    g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(x, B.hy); g.lineTo(x, B.hy + len); g.stroke();
  }
}
function decayFx(g, e, p, seed) {
  const B = bodyAt(e.x, e.y, e.size || 1);
  for (let i = 0; i < 10; i++) {
    const a = seed + i * 1.7, x = B.bx + Math.cos(a) * B.r * 0.8, y = B.hy + Math.sin(a) * B.r * 0.3 + p * p * B.s * 0.9;
    g.save();
    g.translate(x, y); g.rotate(a + p * 4);
    g.fillStyle = rgba(RUST, 1 - p);
    g.fillRect(-B.r * 0.08, -B.r * 0.05, B.r * 0.16, B.r * 0.1);
    g.restore();
  }
  ring(g, B.bx, B.hy, B.r * (0.9 + p * 0.4), RUST, (1 - p) * 0.8, 2);
}
function againFx(g, e, p) {
  const A = bodyAt(e.x, e.y, e.size || 1), o = easeOut(p);
  ring(g, A.bx, A.by, A.r * (0.6 + o * 1.4), PURPLE, 1 - p, 3);
  for (let i = 0; i < 2; i++) {
    const y = A.hy - A.s * (0.35 + o * 0.4) - i * A.r * 0.35, w = A.r * 0.45;
    g.strokeStyle = rgba(ACID, (1 - p) * (1 - i * 0.3));
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(A.bx - w, y + w * 0.5); g.lineTo(A.bx, y); g.lineTo(A.bx + w, y + w * 0.5); g.stroke();
  }
}
function henshinFx(g, e, p, seed, lowQ) {
  const A = bodyAt(e.x, e.y, e.size || 1);
  const up = easeOut(clamp01(p / 0.35)), fade = 1 - clamp01((p - 0.6) / 0.4);
  const w = A.r * 1.3, top = A.by - A.s * 2.6 * up;
  const gr = g.createLinearGradient(0, A.by, 0, top);
  gr.addColorStop(0, rgba(PURPLE, 0.85 * fade));
  gr.addColorStop(1, rgba(ACID, 0));
  g.fillStyle = gr;
  g.fillRect(A.bx - w, top, w * 2, A.by - top);
  jaws(g, A.bx, A.hy, A.r * 1.4, clamp01((p - 0.3) / 0.15), fade);
  if (p > 0.42) {
    const q = clamp01((p - 0.42) / 0.58);
    ring(g, A.bx, A.by, A.r * (1 + easeOut(q) * 2.4), ACID, 1 - q, 4);
    splash(g, A, q, seed, CYAN, lowQ ? 8 : 16);
  }
}
function revertFx(g, e, p, seed) {
  const A = bodyAt(e.x, e.y, e.size || 1);
  halo(g, A.bx, A.hy, A.r * (1 + p), PURPLE, (1 - p) * 0.6);
  splash(g, A, p, seed, ACID, 12);
}

export function bakeFx(g, e, now, lowQ) {
  const dur = e.dur || BAKE_FX_DUR[e.kind];
  const p = (now - e.t0) / dur;
  if (p < 0 || p > 1) return;
  const seed = ((e.t0 | 0) % 977) / 97;
  g.save();
  if (e.kind === "bakeShot" || e.kind === "bakeShotRider") { if (e.to) shotFx(g, e, p, seed, e.kind === "bakeShotRider"); }
  else if (e.kind === "bakeCorrode") corrodeFx(g, e, p, seed, lowQ);
  else if (e.kind === "bakeDecay") decayFx(g, e, p, seed);
  else if (e.kind === "bakeAgain") againFx(g, e, p);
  else if (e.kind === "bakeHenshin") henshinFx(g, e, p, seed, lowQ);
  else if (e.kind === "bakeRevert") revertFx(g, e, p, seed);
  g.restore();
}
