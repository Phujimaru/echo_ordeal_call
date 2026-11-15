// ============================================================
//  เอฟเฟกต์ครั้งเดียวพื้นฐาน (แยกจาก boardDraw.js) — สิ่งกีดขวางแตก · Echo/ผม/หิน (STYLE_MS/STYLE_HIT)
//  ระเบิดตอนตาย (deathBoomFx) · ตัวเลขลอย · ฟัน · แตกกระจาย
// ============================================================
import { F_TH, F_UI, P, gEllipse, normColor, rgbOf } from "./boardGeo";
import { HK_HIT_P, HK_MS } from "./hikaruFx";
import { KIRA_HIT_P, KIRA_MS } from "./kiraFx";
import { OT_HIT_P, OT_MS } from "./optimusFx";
import { DIO_HIT_P, DIO_MS } from "./dioFx";
import { GIO_HIT_P, GIO_MS } from "./giornoFx";
import { ARJ_HIT_P, ARJ_MS } from "./arjunaBoardFx";
import { SH_HIT_P, SH_MS } from "./shadowFx";
import { YUNA_HIT_P, YUNA_MS } from "./yunaFx";
import { GRAY_HIT_P, GRAY_MS } from "./grayFx";
import { GIL_HIT_P, GIL_MS } from "./gilFx";
import { VAL_HIT_P, VAL_MS } from "./valentineFx";
import { FERN_HIT_P, FERN_MS } from "./fernFx";
import { CELINE_HIT_P, CELINE_MS } from "./celineFx";
import { RYOUGI_HIT_P, RYOUGI_MS } from "./ryougiFx";
import { EMIYA_HIT_P, EMIYA_MS } from "./emiyaFx";
import { FAIZ_HIT_P, FAIZ_MS } from "./faizFx";
import { ZECT_HIT_P, ZECT_MS } from "./zectFx";
import { KIRI_HIT_P, KIRI_MS } from "./kiriFx";
import { SHINRA_HIT_P, SHINRA_MS } from "./shinraFx";
import { MIDORIYA_HIT_P, MIDORIYA_MS } from "./midoriyaFx";
import { MASTER_HIT_P, MASTER_MS } from "./masterFx";
import { KAZUMA_HIT_P, KAZUMA_MS } from "./kazumaFx";
import { HAKUNO_HIT_P, HAKUNO_MS } from "./moonFx";
import { LAW_HIT_P, LAW_MS } from "./lawFx";
import { REDUCED } from "./boardCamera";
import { clamp01, easeOutBack, unitHex } from "./boardUnits";

// สิ่งกีดขวางแตก (Echo เดิน/ขยายตัวพัง) — e.tiles = [{ x, y, kind, step }] · ไล่ตามลำดับก้าว (SMASH_STEP ms ต่อก้าว)
export const SMASH_STEP = 110, SMASH_MS = 900;
export const smashDur = (tiles) => SMASH_MS + Math.max(0, ...(tiles || []).map((t) => t.step | 0)) * SMASH_STEP;
const WOODY = /tree|pine|stump|deadtree|windmill|fence|hedge|banner|cactus/;
export function smashFx(g, e, now) {
  for (const t of e.tiles || []) {
    const k = (now - e.t0 - (t.step | 0) * SMASH_STEP) / SMASH_MS;
    if (k <= 0 || k >= 1) continue;
    const wood = WOODY.test(String(t.kind || "")), base = wood ? [122, 86, 52] : [138, 140, 150];
    const [gx, gy, s] = P(t.x + 0.5, t.y + 0.5);
    g.save();
    g.globalAlpha = (1 - k) * 0.6; g.fillStyle = "rgba(210,200,185,1)";
    g.beginPath(); g.ellipse(gx, gy, s * (0.3 + k * 0.7), s * (0.18 + k * 0.4), 0, 0, 7); g.fill();
    for (let i = 0; i < 8; i++) {
      const ang = i / 8 * Math.PI * 2 + t.x * 0.7, sp = 0.35 + (i % 3) * 0.2;
      const px = t.x + 0.5 + Math.cos(ang) * sp * k * 1.3, py = t.y + 0.5 + Math.sin(ang) * sp * k * 1.3;
      const z = 1.6 * k * (1 - k) * (1 + (i % 2)) + 0.1;
      const [sx, sy, ss] = P(px, py, z);
      const sh = 0.75 + (i % 3) * 0.12;
      g.globalAlpha = clamp01(1.2 - k);
      g.fillStyle = `rgb(${base.map((v) => Math.round(v * sh)).join(",")})`;
      g.save(); g.translate(sx, sy); g.rotate(k * 8 + i);
      g.fillRect(-ss * 0.07, -ss * 0.05, ss * 0.14, ss * 0.1);
      g.restore();
    }
    g.restore();
  }
}

// =================================================================== ท่าตีปกติของ Echo (ผู้ใช้ตัดสิน 2026-10-10 · ต้นแบบ .claude/plans/echo-attack-fx.html)
//  fx { kind: "echo" | "hair" | "rock", x, y (มุมบนซ้ายผู้ตี), size, to: { x, y } (มุมบนซ้ายเป้า), toSize, color }
//  1×1 = คลื่นเสียง (วงเสียงวิ่งไปกระแทก แล้วสะท้อนกลับ) · 2×2–3×3 = ผมฟาด · 4×4–5×5 = ห่าง ≤ 2 ผมฟาด / ห่าง 3 ปาหิน
//  STYLE_HIT = ms จากเริ่มเอฟเฟกต์ถึงจังหวะปะทะ (BoardStage เล่นเสียง/ตัวเลข/จอสั่นตรงนั้น)
//  ไรโด ฮิคารุ: ท่าตีตามร่าง (hk*) อยู่ใน hikaruFx.js — รวมเข้าตารางเดียวกันให้ BoardStage ใช้จังหวะปะทะชุดเดียว
//  เคท & เอมิลิโกะ: ke* อยู่ใน shadowFx.js
//  ฟันนี่ วาเลนไทน์: valKnife / valGun อยู่ใน valentineFx.js
//  องค์หญิงดอกไม้ เซลิน: celine* (อาวุธ 6 แบบ) อยู่ใน celineFx.js
//  คิชินามิ ฮาคุโนะ (บอส Moon Cell): hakunoM / hakunoF อยู่ใน moonFx.js
export const STYLE_MS = { echo: 1100, hair: 1200, rock: 1400, ...HK_MS, ...SH_MS, ...KIRA_MS, ...YUNA_MS, ...GRAY_MS, ...VAL_MS, ...FERN_MS, ...CELINE_MS, ...RYOUGI_MS, ...EMIYA_MS, ...KAZUMA_MS, ...HAKUNO_MS, ...LAW_MS, ...OT_MS, ...GIO_MS, ...ARJ_MS, ...DIO_MS, ...FAIZ_MS, ...ZECT_MS, ...GIL_MS, ...KIRI_MS, ...SHINRA_MS, ...MIDORIYA_MS, ...MASTER_MS };
const STYLE_HIT_P = { echo: 0.45, hair: 0.5, rock: 0.55, ...HK_HIT_P, ...SH_HIT_P, ...KIRA_HIT_P, ...YUNA_HIT_P, ...GRAY_HIT_P, ...VAL_HIT_P, ...FERN_HIT_P, ...CELINE_HIT_P, ...RYOUGI_HIT_P, ...EMIYA_HIT_P, ...KAZUMA_HIT_P, ...HAKUNO_HIT_P, ...LAW_HIT_P, ...OT_HIT_P, ...GIO_HIT_P, ...ARJ_HIT_P, ...DIO_HIT_P, ...FAIZ_HIT_P, ...ZECT_HIT_P, ...GIL_HIT_P, ...KIRI_HIT_P, ...SHINRA_HIT_P, ...MIDORIYA_HIT_P, ...MASTER_HIT_P };
export const STYLE_HIT = Object.fromEntries(Object.keys(STYLE_MS).map((k) => [k, Math.round(STYLE_MS[k] * STYLE_HIT_P[k])]));
const SQY = 0.6; // วงรีบนพื้น (สัดส่วนแนวตั้ง)
const easeIn3 = (t) => t * t * t;
export const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const lerpN = (a, b, t) => a + (b - a) * t;
function rngOf(seed) { let s = Math.abs(seed | 0) % 2147483646 || 1; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; }
// จุดบนจอของผู้ตี/เป้า: { bx, by (พื้นกลางตัว), s (ช่องเป็น px), top (กลางรูป/หกเหลี่ยม), w, h (ขนาดรูปตัวใหญ่), foot }
function bodyOf(x, y, n) {
  const cx = x + n / 2, cy = y + n / 2, [bx, by, s] = P(cx, cy);
  if (n <= 1) return { bx, by, s, n, top: [bx, by - s * 0.86], h: s * 0.8, w: s * 0.8, foot: by };
  const h = n * s * 1.32, w = h * 0.72, foot = by + s * n * 0.28;
  return { bx, by, s, n, top: [bx, foot - h * 0.6], h, w, foot };
}
// คลื่นเสียง: วงเสียงโค้ง ")))" 5 วงวิ่งจากหัวไปหาเป้า → กระแทกเป็นวงซ้อน → วงเล็กสะท้อนกลับครึ่งทางแล้วจาง (เสียงสะท้อน = Echo)
export function echoFx(g, e, now) {
  const t = (now - e.t0) / STYLE_MS.echo;
  if (t <= 0 || t >= 1) return;
  const A = bodyOf(e.x, e.y, e.size || 1), B = bodyOf(e.to.x, e.to.y, e.toSize || 1);
  const [sx, sy] = A.top, [tx, ty] = B.top, s = A.s;
  const ang = Math.atan2(ty - sy, tx - sx), dist = Math.hypot(tx - sx, ty - sy);
  const rgb = rgbOf(normColor(e.color || "#9B4F96")).join(",");
  const HIT = STYLE_HIT_P.echo;
  g.save(); g.lineCap = "round";
  for (let i = 0; i < 5; i++) {
    const u = (t - i * 0.06) / (HIT - 0.24);
    if (u <= 0 || u >= 1) continue;
    const d = dist * easeOut3(u) * 0.98, r = s * (0.16 + u * 0.32);
    const x = sx + Math.cos(ang) * d, y = sy + Math.sin(ang) * d;
    g.globalAlpha = (1 - u * 0.5) * (i % 2 ? 0.8 : 1);
    g.strokeStyle = i % 2 ? "#ffffff" : `rgb(${rgb})`; g.lineWidth = Math.max(2, s * 0.07) * (1 - u * 0.4);
    g.beginPath(); g.arc(x - Math.cos(ang) * r, y - Math.sin(ang) * r, r, ang - 0.95, ang + 0.95); g.stroke();
  }
  if (t >= HIT) {
    const k = (t - HIT) / (1 - HIT);
    for (let i = 0; i < 3; i++) {
      const kk = Math.min(1, k * 1.6 - i * 0.18);
      if (kk <= 0 || kk >= 1) continue;
      g.globalAlpha = (1 - kk) * 0.9; g.strokeStyle = i === 1 ? "#ffffff" : `rgb(${rgb})`; g.lineWidth = 4 * (1 - kk) + 1;
      g.beginPath(); g.ellipse(tx, ty, s * (0.3 + kk * 0.9), s * (0.3 + kk * 0.9) * 0.8, 0, 0, 7); g.stroke();
    }
    // เสียงสะท้อน: วงเล็กกลับทางเดิมครึ่งทาง
    for (let i = 0; i < 3; i++) {
      const u = Math.min(1, k * 1.5 - i * 0.12);
      if (u <= 0 || u >= 1) continue;
      const d = dist * 0.5 * easeOut3(u), r = s * (0.12 + u * 0.16);
      const x = tx - Math.cos(ang) * d, y = ty - Math.sin(ang) * d;
      g.globalAlpha = (1 - u) * 0.7; g.strokeStyle = `rgb(${rgb})`; g.lineWidth = Math.max(1.5, s * 0.045);
      g.beginPath(); g.arc(x + Math.cos(ang) * r, y + Math.sin(ang) * r, r, ang + Math.PI - 0.9, ang + Math.PI + 0.9); g.stroke();
    }
  }
  g.restore();
}
// ช่อผมเรียว (ริบบิ้นไล่สีม่วง → น้ำเงินม่วง · ขอบม่วงเข้ม · เส้นผมกลางสีอ่อน)
function hairRibbon(g, path, w0, w1, alpha) {
  const L = [], R = [];
  for (let i = 0; i < path.length; i++) {
    const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)];
    let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const u = i / (path.length - 1), w = lerpN(w0, w1, u) * (1 - 0.15 * Math.sin(u * 9));
    L.push([path[i][0] + nx * w, path[i][1] + ny * w]); R.push([path[i][0] - nx * w, path[i][1] - ny * w]);
  }
  g.save(); g.globalAlpha = alpha;
  g.beginPath(); L.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  for (let i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
  g.closePath();
  const s0 = path[0], e0 = path[path.length - 1], gr = g.createLinearGradient(s0[0], s0[1], e0[0], e0[1]);
  gr.addColorStop(0, "#d79cf4"); gr.addColorStop(0.55, "#a68af0"); gr.addColorStop(1, "#6f6ae8");
  g.fillStyle = gr; g.fill(); g.strokeStyle = "#4a1f78"; g.lineWidth = 2; g.lineJoin = "round"; g.stroke();
  g.strokeStyle = "rgba(255,240,255,.45)"; g.lineWidth = 1.2;
  g.beginPath(); path.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
  g.restore();
}
// ผมฟาด: ช่อผมพุ่งจากข้างตัวเป็นคลื่น → ยกสูง → ฟาดลงเป้า (คลื่นกระแทกม่วง + พื้นแตก + ประกาย) → หดกลับ
//  1×1 = 1 ช่อ · 2–3 = 2 ช่อ · 4–5 = 3 ช่อ · หนา/สูงขึ้นตามร่าง · แต่ละช่อ = ผม 3 เส้นหยักคนละจังหวะ ปลายม้วน
export function hairFx(g, e, now) {
  const t = (now - e.t0) / STYLE_MS.hair;
  if (t <= 0 || t >= 1) return;
  const A = bodyOf(e.x, e.y, e.size || 1), B = bodyOf(e.to.x, e.to.y, e.toSize || 1);
  const n = A.n, T = A.s, count = n <= 1 ? 1 : n <= 3 ? 2 : 3;
  const tx = B.bx, ty = B.by - B.s * 0.3;
  const side = tx >= A.bx ? 1 : -1;
  const sx = A.bx + side * A.w * 0.3, sy = A.foot - A.h * 0.55;
  const OUT = 0.27, RISE = 0.38, SLAM = STYLE_HIT_P.hair, BACK = 0.78;
  let reach, lift, alpha = 1;
  if (t < OUT) { reach = easeOut3(t / OUT) * 0.85; lift = 0.6 * (t / OUT); }
  else if (t < RISE) { const k = (t - OUT) / (RISE - OUT); reach = 0.85 + 0.1 * k; lift = 0.6 + 0.6 * k; }
  else if (t < SLAM) { const k = easeIn3((t - RISE) / (SLAM - RISE)); reach = 0.95 + 0.05 * k; lift = 1.2 * (1 - k); }
  else if (t < BACK) { reach = 1; lift = 0; }
  else { const k = (t - BACK) / (1 - BACK); reach = 1 - easeOut3(k); lift = 0.3 * k; alpha = 1 - k * 0.4; }
  const amp = T * (0.14 + n * 0.03);
  for (let c = 0; c < count; c++) {
    const off = c - (count - 1) / 2;
    const ox = sx - side * off * T * 0.12 * n * 0.4, oy = sy + off * T * 0.35 * n * 0.35;
    const ex = tx + off * T * 0.3, ey = ty + off * T * 0.12 * SQY;
    const mx = lerpN(ox, ex, 0.45), my = Math.min(oy, ey) - T * (0.8 + n * 0.3) * (0.35 + lift) - off * T * 0.25;
    for (const b of [-1, 1, 0]) {
      const pts = [], N = 40, steps = Math.max(2, Math.round(N * reach));
      for (let i = 0; i <= steps; i++) {
        const u = i / N;
        const bx = (1 - u) * (1 - u) * ox + 2 * u * (1 - u) * (mx + b * T * 0.12) + u * u * ex;
        const by = (1 - u) * (1 - u) * oy + 2 * u * (1 - u) * (my + b * T * 0.08) + u * u * ey;
        const w = REDUCED ? 0 : Math.sin(u * 8.5 - now / 85 + c * 1.7 + b * 0.9) * amp * Math.sin(Math.min(1, u * 1.4) * Math.PI) * (b ? 0.8 : 1);
        pts.push([bx + w * 0.35, by + w]);
      }
      if (reach > 0.92 && pts.length > 3) {
        const [ax, ay] = pts[pts.length - 2], [lx, ly] = pts[pts.length - 1];
        const dir = Math.atan2(ly - ay, lx - ax), r0 = T * (0.16 + n * 0.03) * (b ? 0.7 : 1), sd = b < 0 ? -1 : 1;
        const ccx = lx + Math.cos(dir + sd * Math.PI / 2) * r0, ccy = ly + Math.sin(dir + sd * Math.PI / 2) * r0;
        for (let j = 1; j <= 12; j++) {
          const a = dir - sd * Math.PI / 2 + sd * j * 0.45, rr = r0 * (1 - j / 16);
          pts.push([ccx + Math.cos(a) * rr, ccy + Math.sin(a) * rr]);
        }
      }
      const base = T * (0.09 + n * 0.028) * (b ? 0.6 : 1);
      hairRibbon(g, pts, base, base * 0.18, alpha * (b ? 0.92 : 1));
    }
  }
  if (t >= SLAM && t < 0.95) impactFx(g, B.bx, B.by, T, n, (t - SLAM) / (0.95 - SLAM), "190,140,255", 42);
}
// พื้นแตกตรงจุดปะทะ: แฟลช + คลื่นกระแทก + รอยร้าว + ประกาย (rgb = สีคลื่น)
function impactFx(g, x, y, T, n, k, rgb, seed) {
  g.save();
  if (k < 0.2) { g.fillStyle = `rgba(255,255,255,${0.85 * (1 - k / 0.2)})`; g.beginPath(); g.ellipse(x, y, T * (0.4 + k * 3), T * (0.4 + k * 3) * SQY, 0, 0, 7); g.fill(); }
  g.strokeStyle = `rgba(${rgb},${0.8 * (1 - k)})`; g.lineWidth = 5 * (1 - k) + 1;
  g.beginPath(); g.ellipse(x, y, T * (0.3 + k * (1 + n * 0.25)), T * (0.3 + k * (1 + n * 0.25)) * SQY, 0, 0, 7); g.stroke();
  const R = rngOf(seed);
  g.strokeStyle = `rgba(60,30,80,${0.75 * (1 - k * 0.7)})`; g.lineWidth = 2;
  for (let i = 0; i < 4 + n; i++) {
    const a = i / (4 + n) * Math.PI * 2 + R(), L = T * (0.4 + R() * 0.3 + n * 0.1) * Math.min(1, k * 5);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L * 0.55, y + Math.sin(a) * L * 0.55 * SQY + 2); g.lineTo(x + Math.cos(a - 0.25) * L, y + Math.sin(a - 0.25) * L * SQY); g.stroke();
  }
  const RR = rngOf(seed + 11 + n);
  for (let i = 0; i < 10 + n * 3; i++) {
    const a = RR() * Math.PI * 2, d = T * (0.3 + RR() * (0.9 + n * 0.2)) * easeOut3(k);
    g.fillStyle = i % 3 ? `rgba(${rgb},${1 - k})` : `rgba(255,255,255,${1 - k})`;
    g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * SQY - k * T * 0.6 * RR(), 2 + RR() * 2.5, 0, 7); g.fill();
  }
  g.restore();
}
function rockShape(r, seed) { const R = rngOf(seed), pts = []; for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; pts.push([Math.cos(a) * r * (0.72 + R() * 0.38), Math.sin(a) * r * (0.72 + R() * 0.38)]); } return pts; }
function drawRock(g, x, y, r, rot, seed, alpha = 1) {
  const pts = rockShape(r, seed);
  g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha = alpha;
  g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.closePath();
  const gr = g.createLinearGradient(-r, -r, r, r); gr.addColorStop(0, "#b9b6c2"); gr.addColorStop(1, "#5d5a68");
  g.fillStyle = gr; g.fill(); g.strokeStyle = "#2d2240"; g.lineWidth = Math.max(1.5, r * 0.08); g.stroke();
  g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = Math.max(1, r * 0.06);
  g.beginPath(); g.moveTo(-r * 0.35, -r * 0.2); g.lineTo(r * 0.05, -r * 0.45); g.stroke();
  g.beginPath(); g.moveTo(r * 0.1, r * 0.15); g.lineTo(r * 0.4, r * 0.35); g.stroke();
  g.restore();
}
// ปาหิน: หินโผล่ที่มือแล้วยกขึ้น → ลอยโค้งหมุน (เงาบนพื้นใหญ่ขึ้นตอนใกล้ตก + ทางลม) → ตกแตก (แฟลช ฝุ่น รอยร้าว เศษกระเด็น)
export function rockFx(g, e, now) {
  const t = (now - e.t0) / STYLE_MS.rock;
  if (t <= 0 || t >= 1) return;
  const A = bodyOf(e.x, e.y, e.size || 1), B = bodyOf(e.to.x, e.to.y, e.toSize || 1);
  const n = A.n, T = A.s, r = T * (0.16 + n * 0.09), seed = 7 + n;
  const side = B.bx >= A.bx ? 1 : -1;
  const hx = A.bx + side * A.w * 0.22, hy = A.foot - A.h * 0.42;
  const tx = B.bx, ty = B.by, top = [tx, ty - B.s * 0.35];
  const LIFT = 0.18, HIT = STYLE_HIT_P.rock, H = T * (1.2 + n * 0.45);
  g.save();
  if (t < LIFT) {
    const k = easeOut3(t / LIFT);
    drawRock(g, hx, hy - k * T * 0.5, r * (0.5 + 0.5 * k), -k * 0.6, seed);
  } else if (t < HIT) {
    const k = (t - LIFT) / (HIT - LIFT), sx = hx, sy = hy - T * 0.5;
    const gx = lerpN(A.bx, tx, k), gy = lerpN(A.by, ty, k);
    g.fillStyle = `rgba(0,0,0,${0.12 + 0.22 * k})`; g.beginPath(); g.ellipse(gx, gy, r * (0.6 + 0.5 * k), r * (0.6 + 0.5 * k) * SQY, 0, 0, 7); g.fill();
    for (let i = 1; i <= 4; i++) {
      const k2 = Math.max(0, k - i * 0.05), x2 = lerpN(sx, top[0], k2), y2 = lerpN(sy, top[1], k2) - Math.sin(k2 * Math.PI) * H;
      g.fillStyle = `rgba(255,255,255,${0.28 - i * 0.06})`; g.beginPath(); g.arc(x2, y2, r * (0.55 - i * 0.08), 0, 7); g.fill();
    }
    drawRock(g, lerpN(sx, top[0], k), lerpN(sy, top[1], k) - Math.sin(k * Math.PI) * H, r, 1 + k * 7, seed);
  } else {
    const k = (t - HIT) / (1 - HIT);
    g.fillStyle = `rgba(214,200,180,${0.55 * (1 - k)})`; g.beginPath(); g.ellipse(tx, ty, T * (0.4 + k * (0.6 + n * 0.2)), T * (0.4 + k * (0.6 + n * 0.2)) * SQY, 0, 0, 7); g.fill();
    impactFx(g, tx, ty, T, n, k, "214,200,180", 99);
    const RR = rngOf(5 + n);
    for (let i = 0; i < 7 + n * 2; i++) {
      const a = RR() * Math.PI * 2, sp = (0.6 + RR() * 1.1) * T * (0.7 + n * 0.12), up = (0.8 + RR()) * T * (0.9 + n * 0.2);
      const gyy = ty + Math.sin(a) * sp * k * SQY;
      drawRock(g, tx + Math.cos(a) * sp * k, Math.min(gyy - (up * k - up * 1.6 * k * k), gyy), r * (0.18 + RR() * 0.2), k * 9 + i, 30 + i, Math.max(0, Math.min(1, 1.3 - k)));
    }
  }
  g.restore();
}

// =================================================================== ตกรอบ (ผู้ใช้สั่ง: ระเบิดให้ตลก)
//  fx { kind: "deathBoom", x, y (มุมบนซ้ายตัวที่ตาย), size, img, color, name }
//  แฟลช → ลูกไฟพองเป็นก้อนเมฆ + ดาวแฉกการ์ตูน + วงกระแทก → ควันลอย · รูปหกเหลี่ยมของคนตายหมุนคว้างปลิวขึ้นฟ้าแล้ววิ้งหายไป
export const DEATH_BOOM_MS = 1700;
export function deathBoomFx(g, e, now, lowQ) {
  const t = now - e.t0;
  if (t < 0 || t > DEATH_BOOM_MS) return;
  const n = Math.max(1, e.size | 0), cx = e.x + n / 2, cy = e.y + n / 2;
  const [bx, by, s] = P(cx, cy, 0.35 * n);
  const S = s * n;
  g.save();
  // วงกระแทกบนพื้น
  const kr = clamp01(t / 520);
  if (kr < 1) {
    g.strokeStyle = `rgba(255,190,90,${0.9 * (1 - kr)})`; g.lineWidth = 6 * (1 - kr) + 1;
    gEllipse(g, cx, cy, (0.4 + kr * 1.4) * n, 0.02, 36); g.stroke();
  }
  // ควันเทาลอยขึ้น (หลังลูกไฟ)
  if (!lowQ && t > 250) {
    const ks = clamp01((t - 250) / (DEATH_BOOM_MS - 250));
    for (let i = 0; i < 7; i++) {
      const a = i * 2.39, d = S * (0.25 + 0.35 * ks) * (0.6 + (i % 3) * 0.2);
      const x = bx + Math.cos(a) * d, y = by - S * (0.2 + ks * 0.9) + Math.sin(a) * d * 0.4;
      g.fillStyle = `rgba(${110 + i * 8},${105 + i * 8},${115 + i * 8},${0.55 * (1 - ks)})`;
      g.beginPath(); g.arc(x, y, S * (0.22 + ks * 0.25), 0, 7); g.fill();
    }
  }
  // ลูกไฟพองเป็นก้อนเมฆ (ส้ม → เหลือง → ขาว)
  const kf = clamp01(t / 900);
  if (kf < 1) {
    const grow = easeOutBack(clamp01(kf / 0.35)), fade = kf < 0.55 ? 1 : 1 - (kf - 0.55) / 0.45;
    for (let i = 0; i < 9; i++) {
      const a = i * 0.7 + 0.3, d = S * 0.32 * grow * (i ? 1 : 0);
      const r = S * (0.3 + (i % 3) * 0.06) * grow;
      const x = bx + Math.cos(a) * d, y = by - S * 0.15 + Math.sin(a) * d * 0.7;
      g.fillStyle = `rgba(${i % 2 ? "255,120,40" : "255,170,50"},${0.95 * fade})`;
      g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
    g.fillStyle = `rgba(255,236,140,${fade})`; g.beginPath(); g.arc(bx, by - S * 0.15, S * 0.32 * grow, 0, 7); g.fill();
    g.fillStyle = `rgba(255,255,240,${fade})`; g.beginPath(); g.arc(bx, by - S * 0.15, S * 0.16 * grow, 0, 7); g.fill();
  }
  // ดาวแฉกการ์ตูน (ป๊อปแล้วหด)
  if (t < 650) {
    const kp = t / 650, sc = kp < 0.25 ? easeOutBack(kp / 0.25) : 1 - (kp - 0.25) / 0.75 * 0.4, a = kp < 0.25 ? 1 : 1 - (kp - 0.25) / 0.75;
    const R1 = S * 0.95 * sc, R0 = R1 * 0.5, spikes = 11;
    g.beginPath();
    for (let i = 0; i <= spikes * 2; i++) {
      const ang = (i / (spikes * 2)) * Math.PI * 2 + 0.2, r = i % 2 ? R0 : R1 * (0.85 + 0.15 * ((i * 7) % 3) / 2);
      const x = bx + Math.cos(ang) * r, y = by - S * 0.15 + Math.sin(ang) * r * 0.85;
      if (i) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.closePath();
    g.globalAlpha = a; g.fillStyle = "#ffe14a"; g.fill(); g.strokeStyle = "#d8261c"; g.lineWidth = 4; g.stroke(); g.globalAlpha = 1;
  }
  // แฟลชขาว
  if (t < 140) { g.fillStyle = `rgba(255,255,255,${0.9 * (1 - t / 140)})`; g.beginPath(); g.arc(bx, by - S * 0.15, S * (0.5 + t / 140 * 0.8), 0, 7); g.fill(); }
  // เศษกระเด็น
  if (!lowQ && t < 900) {
    const kd = t / 900;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + 0.4, sp = S * (0.6 + (i % 4) * 0.25), up = S * (0.5 + (i % 3) * 0.3);
      const x = bx + Math.cos(a) * sp * kd, y = by - S * 0.1 + Math.sin(a) * sp * kd * 0.6 - (up * kd - up * 1.7 * kd * kd);
      g.fillStyle = i % 3 ? `rgba(255,${140 + (i % 4) * 25},40,${1 - kd})` : `rgba(80,70,70,${1 - kd})`;
      g.fillRect(x - 3, y - 3, 6, 6);
    }
  }
  // รูปคนตายหมุนคว้างปลิวขึ้นฟ้า แล้ววิ้ง!
  const FLY = 1250;
  if (t < FLY) {
    const kq = t / FLY, side = (Math.abs(e.x * 7 + e.y * 3) % 2) ? 1 : -1;
    const hx = bx + side * S * 1.6 * kq, hy = by - s * 0.9 - S * 3.2 * kq + S * 1.2 * kq * kq;
    const r = s * 0.4 * (1 - 0.6 * kq) * Math.min(1.6, 0.8 + n * 0.25);
    g.save(); g.translate(hx, hy); g.rotate(side * kq * Math.PI * 5);
    unitHex(g, { img: e.img, color: normColor(e.color), name: e.name }, 0, 0, r, 1 - Math.max(0, kq - 0.8) / 0.2);
    g.restore();
  } else {
    const kt = (t - FLY) / (DEATH_BOOM_MS - FLY), side = (Math.abs(e.x * 7 + e.y * 3) % 2) ? 1 : -1;
    const hx = bx + side * S * 1.6, hy = by - s * 0.9 - S * 2.0, R = s * 0.35 * Math.sin(kt * Math.PI);
    g.strokeStyle = `rgba(255,255,255,${1 - kt})`; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(hx - R, hy); g.lineTo(hx + R, hy); g.moveTo(hx, hy - R); g.lineTo(hx, hy + R);
    g.moveTo(hx - R * 0.5, hy - R * 0.5); g.lineTo(hx + R * 0.5, hy + R * 0.5); g.moveTo(hx + R * 0.5, hy - R * 0.5); g.lineTo(hx - R * 0.5, hy + R * 0.5); g.stroke();
  }
  g.restore();
}
export function floatText(g, x, y, text, color, p, size = 24, z0 = 2.4) {
  if (p <= 0 || p >= 1) return;
  const [sx, sy] = P(x + 0.5, y + 0.5, z0 + p * 0.7);
  g.save(); g.globalAlpha = p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25;
  g.font = `700 ${size}px ${/^[0-9+\-−\s]+$/.test(text) ? F_UI : F_TH}`; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineWidth = 5; g.strokeStyle = "rgba(10,20,40,.85)"; g.lineJoin = "round"; g.strokeText(text, sx, sy); g.fillStyle = color; g.fillText(text, sx, sy);
  g.restore();
}
export function slashFx(g, x, y, p, rgb) {
  if (p <= 0 || p >= 1) return;
  const [cx, cy, s] = P(x + 0.5, y + 0.5, 1.05);
  g.strokeStyle = `rgba(255,255,255,${1 - p})`; g.lineWidth = 5 * (1 - p) + 1;
  g.beginPath(); g.moveTo(cx - s * 0.55, cy - s * 0.45 + p * 10); g.lineTo(cx + s * 0.55, cy + s * 0.35 + p * 10); g.stroke();
  g.strokeStyle = `rgba(${rgb},${1 - p})`; g.lineWidth = 3; g.beginPath(); g.ellipse(cx, cy, s * (0.2 + p * 0.8), s * (0.14 + p * 0.5), 0, 0, 7); g.stroke();
}
// แสงแตกตอนปะทะ (ฉากตีแบบใหม่): วงแหวนขยาย + ดาว 8 แฉก + รัศมี 14 เส้น — rgb = สีผู้ตี
export function burstFx(g, x, y, p, rgb) {
  if (p <= 0 || p >= 1) return;
  const [cx, cy, s] = P(x + 0.5, y + 0.5, 1.1);
  const e = 1 - Math.pow(1 - p, 3), a = p < 0.35 ? 1 : 1 - (p - 0.35) / 0.65;
  g.save(); g.globalAlpha = a; g.lineCap = "round";
  g.strokeStyle = "#ffffff"; g.lineWidth = 6 * (1 - p) + 1;
  g.beginPath(); g.ellipse(cx, cy, s * (0.25 + e * 1.1), s * (0.18 + e * 0.75), 0, 0, 7); g.stroke();
  for (let i = 0; i < 14; i++) {
    const t = i / 14 * Math.PI * 2 + (i % 2) * 0.12, r0 = s * (0.2 + e * 0.35), r1 = s * (0.55 + e * (i % 2 ? 0.95 : 1.35));
    g.strokeStyle = i % 3 ? "rgba(255,255,255,1)" : `rgba(${rgb},1)`; g.lineWidth = (i % 2 ? 3 : 5) * (1 - p * 0.6);
    g.beginPath(); g.moveTo(cx + Math.cos(t) * r0, cy + Math.sin(t) * r0 * 0.75); g.lineTo(cx + Math.cos(t) * r1, cy + Math.sin(t) * r1 * 0.75); g.stroke();
  }
  const k = s * 0.42 * (1 - p * 0.6);
  g.fillStyle = "#ffffff"; g.beginPath();
  for (let i = 0; i < 16; i++) { const t = i / 16 * Math.PI * 2, r = i % 2 ? k * 0.32 : k; g.lineTo(cx + Math.cos(t) * r, cy + Math.sin(t) * r * 0.85); }
  g.closePath(); g.fill();
  g.restore();
}
