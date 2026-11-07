// เอฟเฟกต์บนกระดานของไรเดอร์ ZECT (characters/_zect.js · GRID_PLAN §7.28) — อ้างอิงอาวุธ/สัญลักษณ์ของแต่ละร่างใน Kamen Rider Kabuto
//  ท่าตีปกติ (ฮุค attackStyle):
//   zDrake     Drake Zecter (ปืนแมลงปอ): กระสุนพลังงานฟ้าน้ำทะเล 2 นัด + ปีกแมลงปอวาบที่ปากกระบอก
//   zBee       TheBee Zecter (เหล็กไนข้อมือ): พุ่งแทง (lunge) เข็มเหลือง + รังผึ้งหกเหลี่ยมแตก
//   zGatack    Gatack Double Calibur (ดาบคู่ด้วงคีม): พุ่งฟันไขว้ X สีน้ำเงินคมทอง
//   zSasword   Sasword Yaiber (ดาบแมงป่อง): พุ่งฟันเฉียงหนักสีม่วง + หยดพิษกระเด็น
//   zDrakeUlt  Rider Shooting ระหว่าง Clock Up (ตีปกติ): ลูกพลังงานรวมที่ปืนแล้วยิงระยะประชิด
//   zKick      Rider Kick ของ Gatack (ตีปกติครั้งที่ชาร์จครบ): สายฟ้าน้ำเงินลงจากฟ้า + เสี้ยวเตะ
//  ท่าไม้ตายที่เป็นสกิล (engine.boardFx "zectFx" หลังคลิปจบ):
//   zUltShoot  Rider Shooting: ลูกพลังงานยักษ์ → ลำแสงหนาไปเป้า → ระเบิด
//   zUltSting  Rider Sting: สายฟ้าเหลืองรอบเข็ม → เข็มยักษ์แทง → รังผึ้งระเบิด
//   zUltSlash  Rider Slash: ฟันไขว้พิษม่วง 2 จังหวะ (first / final)
import { P } from "./boardGeo";

const TAU = Math.PI * 2;
const C = {
  drake: "57,198,255", drakeHot: "205,245,255",
  bee: "255,205,40", beeDark: "40,30,10", beeHot: "255,250,200",
  gatack: "45,110,255", gold: "255,196,60", gatackHot: "210,230,255",
  sas: "176,70,255", sasHot: "240,210,255", poison: "120,255,90",
};
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const rgba = (rgb, a) => `rgba(${rgb},${clamp01(a)})`;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export const ZECT_MS = { zDrake: 700, zBee: 720, zGatack: 760, zSasword: 820, zDrakeUlt: 1100, zKick: 1300 };
// ท่าพุ่ง (lunge) ปะทะที่ ~385 ms ของ BoardCanvas · ปืนยิงจากที่ยืน
export const ZECT_HIT_P = { zDrake: 0.42, zBee: 0.53, zGatack: 0.51, zSasword: 0.47, zDrakeUlt: 0.6, zKick: 0.55 };
export const ZECT_LUNGE = new Set(["zBee", "zGatack", "zSasword"]);
const ULT_MS = { zUltShoot: 1500, zUltSting: 1300, zUltSlash: 1100 };
export const ZECT_FX_DUR = { ...ZECT_MS, ...ULT_MS };
export const isZectFx = (kind) => typeof kind === "string" && kind in ZECT_FX_DUR;

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
  g.strokeStyle = rgba(rgb, a); g.lineWidth = w;
  g.beginPath(); g.ellipse(x, y, r, r * 0.8, 0, 0, TAU); g.stroke();
}
function rays(g, x, y, r0, r1, n, seed, rgb, a, w) {
  if (a <= 0) return;
  g.strokeStyle = rgba(rgb, a); g.lineWidth = w;
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU + seed, k = 0.7 + 0.3 * Math.sin(seed * 9 + i * 2.3);
    g.moveTo(x + Math.cos(t) * r0, y + Math.sin(t) * r0 * 0.8);
    g.lineTo(x + Math.cos(t) * r1 * k, y + Math.sin(t) * r1 * k * 0.8);
  }
  g.stroke();
}
const dirOf = (A, B) => { const L = Math.hypot(B.bx - A.bx, B.hy - A.hy) || 1; return { ux: (B.bx - A.bx) / L, uy: (B.hy - A.hy) / L, L }; };
// สายฟ้าหยัก
function bolt(g, x0, y0, x1, y1, seed, rgb, a, w, seg = 7) {
  if (a <= 0) return;
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  g.strokeStyle = rgba(rgb, a); g.lineWidth = w; g.shadowColor = rgba(rgb, a); g.shadowBlur = w * 4;
  g.beginPath(); g.moveTo(x0, y0);
  for (let i = 1; i < seg; i++) {
    const t = i / seg, j = Math.sin(seed * 13 + i * 4.1) * L * 0.08;
    g.lineTo(x0 + dx * t + nx * j, y0 + dy * t + ny * j);
  }
  g.lineTo(x1, y1); g.stroke(); g.shadowBlur = 0;
}
// หกเหลี่ยมรังผึ้ง
function hex(g, x, y, r, rgb, a, w, fill) {
  if (a <= 0) return;
  g.beginPath();
  for (let i = 0; i < 6; i++) { const t = (i / 6) * TAU + Math.PI / 6; g[i ? "lineTo" : "moveTo"](x + Math.cos(t) * r, y + Math.sin(t) * r * 0.85); }
  g.closePath();
  if (fill) { g.fillStyle = rgba(rgb, a * 0.35); g.fill(); }
  g.strokeStyle = rgba(rgb, a); g.lineWidth = w; g.stroke();
}
// รอยฟัน: เส้นโค้งเรียวหัวท้าย
function slash(g, x, y, r, ang, p, rgb, hot, a, w) {
  if (a <= 0) return;
  const k = easeOut(clamp01(p)), half = r * k;
  const cx = Math.cos(ang), cy = Math.sin(ang), nx = -cy, ny = cx;
  g.fillStyle = rgba(rgb, a);
  g.beginPath();
  g.moveTo(x - cx * half, y - cy * half);
  g.quadraticCurveTo(x + nx * w * 2, y + ny * w * 2, x + cx * half, y + cy * half);
  g.quadraticCurveTo(x + nx * w * 0.6, y + ny * w * 0.6, x - cx * half, y - cy * half);
  g.fill();
  g.strokeStyle = rgba(hot, a); g.lineWidth = Math.max(1.2, w * 0.25);
  g.beginPath(); g.moveTo(x - cx * half * 0.8, y - cy * half * 0.8); g.quadraticCurveTo(x + nx * w * 1.4, y + ny * w * 1.4, x + cx * half * 0.8, y + cy * half * 0.8); g.stroke();
}
// กระสุนพลังงาน
function shot(g, A, B, p, rgb, hot, size) {
  const { ux, uy } = dirOf(A, B);
  const x = A.bx + (B.bx - A.bx) * p, y = A.hy + (B.hy - A.hy) * p, len = A.s * 0.6 * size, w = A.s * 0.06 * size;
  g.fillStyle = rgba(rgb, 0.85);
  g.beginPath(); g.moveTo(x - uy * w, y + ux * w); g.lineTo(x - ux * len, y - uy * len); g.lineTo(x + uy * w, y - ux * w); g.closePath(); g.fill();
  halo(g, x, y, A.s * 0.18 * size, rgb, 0.95);
  halo(g, x, y, A.s * 0.08 * size, hot, 1);
}
// ปีกแมลงปอ 4 ใบวาบ (ปากกระบอก Drake)
function wings(g, x, y, r, ang, a) {
  if (a <= 0) return;
  g.save(); g.translate(x, y); g.rotate(ang);
  for (const [sx, sy] of [[1, 1], [1, -1], [-0.7, 1], [-0.7, -1]]) {
    g.fillStyle = rgba(C.drake, a * 0.45); g.strokeStyle = rgba(C.drakeHot, a); g.lineWidth = 1.2;
    g.beginPath(); g.ellipse(sx * r * 0.55, sy * r * 0.35, r * 0.55, r * 0.16, sy * sx * 0.5, 0, TAU); g.fill(); g.stroke();
  }
  g.restore();
}
function droplets(g, B, q, seed, n, rgb) {
  g.fillStyle = rgba(rgb, 1 - q);
  for (let i = 0; i < n; i++) {
    const t = seed + i * 2.399, d = B.r * (0.5 + q * (1.2 + (i % 3) * 0.4));
    const x = B.bx + Math.cos(t) * d, y = B.hy + Math.sin(t) * d * 0.6 + B.s * q * q * 0.6;
    g.beginPath(); g.arc(x, y, Math.max(1.5, B.s * 0.035 * (1 - q * 0.5)), 0, TAU); g.fill();
  }
}

// ---------- ท่าตีปกติ ----------
function drakeFx(g, e, p, seed, ult) {
  const A = bodyAt(e.x, e.y, e.size || 1), B = bodyAt(e.to.x, e.to.y, e.toSize || 1);
  const { ux, uy } = dirOf(A, B), ang = Math.atan2(uy, ux);
  const mx = A.bx + ux * A.r, my = A.hy + uy * A.r;
  if (ult) {
    // รวมลูกพลังงานที่ปากกระบอก → ยิงประชิด
    const hit = ZECT_HIT_P.zDrakeUlt;
    if (p < hit) {
      const k = clamp01(p / (hit * 0.75));
      halo(g, mx, my, A.r * (0.3 + k * 1.1), C.drake, 0.9);
      rays(g, mx, my, A.r * (1.6 - k), A.r * (2.1 - k), 10, seed + p * 6, C.drakeHot, 0.8, 1.6);
      wings(g, mx, my, A.r * 0.9, ang, k);
      if (p > hit * 0.8) shot(g, { ...A, bx: mx, hy: my }, B, (p - hit * 0.8) / (hit * 0.2), C.drake, C.drakeHot, 2.2);
      return;
    }
    const q = clamp01((p - hit) / (1 - hit)), o = easeOut(q);
    halo(g, B.bx, B.hy, B.r * (1.2 + o * 2.2), C.drake, (1 - q));
    ring(g, B.bx, B.hy, B.r * (0.8 + o * 2.6), C.drakeHot, 1 - q, 4);
    rays(g, B.bx, B.hy, B.r * (0.6 + o), B.r * (1.4 + o * 2.2), 14, seed, C.drakeHot, 1 - q, 2.6);
    return;
  }
  const shots = [[0.04, 0.3], [0.16, 0.42]];
  for (const [s0, s1] of shots) {
    const fl = 1 - Math.abs(p - s0) / 0.08;
    if (fl > 0) { halo(g, mx, my, A.s * 0.32, C.drake, fl); wings(g, mx, my, A.r * 0.7, ang, fl); }
    if (p >= s0 && p < s1) shot(g, { ...A, bx: mx, hy: my }, B, (p - s0) / (s1 - s0), C.drake, C.drakeHot, 1);
    if (p >= s1 && p < s1 + 0.35) {
      const q = (p - s1) / 0.35;
      halo(g, B.bx, B.hy, B.r * (0.6 + q * 0.9), C.drake, (1 - q) * 0.9);
      rays(g, B.bx, B.hy, B.r * (0.3 + q * 0.6), B.r * (0.8 + q), 8, seed + s0 * 30, C.drakeHot, 1 - q, 1.8);
    }
  }
}
function beeFx(g, e, p, seed) {
  const A = bodyAt(e.x, e.y, e.size || 1), B = bodyAt(e.to.x, e.to.y, e.toSize || 1);
  const hit = ZECT_HIT_P.zBee, { ux, uy } = dirOf(A, B);
  if (p < hit) {
    // เข็มเหลืองที่ข้อมือ กระพือเป็นจังหวะปีกผึ้ง
    const k = clamp01(p / hit), x = A.bx + ux * A.r * 0.9, y = A.hy + uy * A.r * 0.9;
    halo(g, x, y, A.r * (0.35 + 0.15 * Math.sin(p * 80)), C.bee, 0.7 * k);
    return;
  }
  const q = clamp01((p - hit) / (1 - hit)), o = easeOut(q);
  // เข็มแทงทะลุ
  const len = B.r * (1.6 + o * 0.6), tx = B.bx + ux * B.r * 0.3, ty = B.hy + uy * B.r * 0.3;
  g.strokeStyle = rgba(C.beeHot, 1 - q); g.lineWidth = Math.max(2, B.s * 0.05);
  g.beginPath(); g.moveTo(tx - ux * len, ty - uy * len); g.lineTo(tx + ux * len * 0.5, ty + uy * len * 0.5); g.stroke();
  halo(g, B.bx, B.hy, B.r * (0.7 + o * 1.1), C.bee, (1 - q) * 0.95);
  for (let i = 0; i < 6; i++) {
    const t = seed + (i / 6) * TAU, d = B.r * (0.4 + o * 1.4);
    hex(g, B.bx + Math.cos(t) * d, B.hy + Math.sin(t) * d * 0.7, B.r * 0.28, i % 2 ? C.bee : C.beeDark, 1 - q, 2, true);
  }
  hex(g, B.bx, B.hy, B.r * (0.5 + o * 0.6), C.bee, 1 - q, 3, false);
}
function gatackFx(g, e, p, seed) {
  const B = bodyAt(e.to.x, e.to.y, e.toSize || 1);
  const hit = ZECT_HIT_P.zGatack;
  if (p < hit) return;
  const q = clamp01((p - hit) / (1 - hit)), a = 1 - Math.max(0, q - 0.4) / 0.6;
  const w = B.s * 0.09;
  // ดาบคู่ — สองรอยไขว้เป็น X ตามกันเร็ว
  slash(g, B.bx, B.hy, B.r * 2.2, -0.75, q / 0.35, C.gatack, C.gold, a, w);
  if (q > 0.12) slash(g, B.bx, B.hy, B.r * 2.2, 0.75, (q - 0.12) / 0.35, C.gatack, C.gold, a, w);
  halo(g, B.bx, B.hy, B.r * (0.6 + easeOut(q) * 1.2), C.gatack, (1 - q) * 0.85);
  rays(g, B.bx, B.hy, B.r * 0.5, B.r * (1 + q * 1.4), 10, seed, C.gatackHot, 1 - q, 2);
}
function sasFx(g, e, p, seed) {
  const B = bodyAt(e.to.x, e.to.y, e.toSize || 1);
  const hit = ZECT_HIT_P.zSasword;
  if (p < hit) return;
  const q = clamp01((p - hit) / (1 - hit)), a = 1 - Math.max(0, q - 0.35) / 0.65;
  slash(g, B.bx, B.hy, B.r * 2.6, -1.0, q / 0.3, C.sas, C.sasHot, a, B.s * 0.13);
  halo(g, B.bx, B.hy, B.r * (0.8 + easeOut(q) * 1.4), C.sas, (1 - q) * 0.9);
  droplets(g, B, q, seed, 9, C.poison);
}
function kickFx(g, e, p, seed) {
  const A = bodyAt(e.x, e.y, e.size || 1), B = bodyAt(e.to.x, e.to.y, e.toSize || 1);
  const hit = ZECT_HIT_P.zKick;
  if (p < hit) {
    // สายฟ้าน้ำเงินรวมที่ตัว (Rider Kick ชาร์จ)
    const k = clamp01(p / hit);
    for (let i = 0; i < 3; i++) bolt(g, A.bx + (i - 1) * A.r * 0.6, A.hy - A.s * 2.2, A.bx, A.hy, seed + i + p * 3, C.gatack, 0.8 * k, 2.5);
    halo(g, A.bx, A.hy, A.r * (0.6 + k), C.gatack, 0.85 * k);
    return;
  }
  const q = clamp01((p - hit) / (1 - hit)), o = easeOut(q);
  bolt(g, B.bx, B.hy - B.s * 3, B.bx, B.hy, seed * 3, C.gatackHot, 1 - q, 5, 9);
  slash(g, B.bx, B.hy, B.r * 2.8, 0.25, q / 0.3, C.gatack, C.gold, 1 - q, B.s * 0.15);
  halo(g, B.bx, B.hy, B.r * (1.1 + o * 2.4), C.gatack, 1 - q);
  ring(g, B.bx, B.hy, B.r * (0.8 + o * 3), C.gold, 1 - q, 4);
}

// ---------- ท่าไม้ตายที่เป็นสกิล ----------
function ultShoot(g, e, p, seed) {
  const A = bodyAt(e.x, e.y), B = bodyAt(e.to.x, e.to.y);
  const { ux, uy } = dirOf(A, B), mx = A.bx + ux * A.r, my = A.hy + uy * A.r;
  if (p < 0.4) {
    const k = clamp01(p / 0.4);
    halo(g, mx, my, A.r * (0.4 + k * 1.6), C.drake, 0.95);
    rays(g, mx, my, A.r * (2.6 - k * 1.4), A.r * (3.2 - k * 1.4), 14, seed + p * 9, C.drakeHot, 0.85, 2);
    wings(g, mx, my, A.r * (0.8 + k), Math.atan2(uy, ux), k);
    return;
  }
  const q = clamp01((p - 0.4) / 0.6);
  const beamA = q < 0.5 ? 1 : 1 - (q - 0.5) / 0.5, w = A.s * 0.22 * (1 - q * 0.5);
  g.strokeStyle = rgba(C.drake, beamA); g.lineWidth = w; g.lineCap = "round";
  g.beginPath(); g.moveTo(mx, my); g.lineTo(B.bx, B.hy); g.stroke();
  g.strokeStyle = rgba(C.drakeHot, beamA); g.lineWidth = w * 0.35;
  g.beginPath(); g.moveTo(mx, my); g.lineTo(B.bx, B.hy); g.stroke();
  const o = easeOut(q);
  halo(g, B.bx, B.hy, B.r * (1.2 + o * 3), C.drake, 1 - q);
  ring(g, B.bx, B.hy, B.r * (1 + o * 3.4), C.drakeHot, 1 - q, 5);
}
function ultSting(g, e, p, seed) {
  const A = bodyAt(e.x, e.y), B = bodyAt(e.to.x, e.to.y);
  if (p < 0.35) {
    const k = clamp01(p / 0.35);
    for (let i = 0; i < 5; i++) {
      const t = seed + i * 1.26 + p * 12;
      bolt(g, A.bx + Math.cos(t) * A.r * 2, A.hy + Math.sin(t) * A.r * 1.4, A.bx, A.hy, seed + i, C.bee, 0.9 * k, 2, 5);
    }
    halo(g, A.bx, A.hy, A.r * (0.6 + k * 0.8), C.bee, 0.9 * k);
    return;
  }
  const q = clamp01((p - 0.35) / 0.65), o = easeOut(q);
  const { ux, uy } = dirOf(A, B), len = B.s * 1.4;
  g.fillStyle = rgba(C.beeHot, 1 - q);
  g.beginPath(); g.moveTo(B.bx + ux * B.r * 0.4, B.hy + uy * B.r * 0.4); g.lineTo(B.bx - ux * len - uy * B.s * 0.12, B.hy - uy * len + ux * B.s * 0.12); g.lineTo(B.bx - ux * len + uy * B.s * 0.12, B.hy - uy * len - ux * B.s * 0.12); g.closePath(); g.fill();
  for (let ring2 = 1; ring2 <= 2; ring2++) {
    for (let i = 0; i < 6; i++) {
      const t = seed + (i / 6) * TAU + ring2 * 0.5, d = B.r * (0.5 + o * 1.4 * ring2);
      hex(g, B.bx + Math.cos(t) * d, B.hy + Math.sin(t) * d * 0.7, B.r * 0.32, (i + ring2) % 2 ? C.bee : C.beeDark, 1 - q, 2.4, true);
    }
  }
  halo(g, B.bx, B.hy, B.r * (1 + o * 2), C.bee, 1 - q);
  bolt(g, B.bx, B.hy - B.s * 1.6, B.bx, B.hy, seed * 2, C.beeHot, 1 - q, 3);
}
function ultSlash(g, e, p, seed) {
  const B = bodyAt(e.to.x, e.to.y);
  const a = 1 - Math.max(0, p - 0.45) / 0.55, w = B.s * 0.15;
  slash(g, B.bx, B.hy, B.r * 3, -0.9, p / 0.25, C.sas, C.sasHot, a, w);
  if (e.final) slash(g, B.bx, B.hy, B.r * 3, 0.9, (p - 0.1) / 0.25, C.sas, C.sasHot, a, w);
  halo(g, B.bx, B.hy, B.r * (1 + easeOut(p) * 2.2), C.sas, 1 - p);
  droplets(g, B, p, seed, e.final ? 16 : 10, C.poison);
}

export function zectFx(g, e, now, lowQ) {
  if (!e.to) return;
  const dur = ZECT_FX_DUR[e.kind];
  const p = (now - e.t0) / dur;
  if (p < 0 || p > 1) return;
  const seed = ((e.t0 | 0) % 977) / 97;
  g.save();
  if (e.kind === "zDrake") drakeFx(g, e, p, seed, false);
  else if (e.kind === "zDrakeUlt") drakeFx(g, e, p, seed, true);
  else if (e.kind === "zBee") beeFx(g, e, p, seed);
  else if (e.kind === "zGatack") gatackFx(g, e, p, seed);
  else if (e.kind === "zSasword") sasFx(g, e, p, seed);
  else if (e.kind === "zKick") kickFx(g, e, p, seed);
  else if (e.kind === "zUltShoot") ultShoot(g, e, p, seed);
  else if (e.kind === "zUltSting") ultSting(g, e, p, seed);
  else if (e.kind === "zUltSlash") ultSlash(g, e, p, seed);
  void lowQ;
  g.restore();
}
