// เอฟเฟกต์บนกระดานของไอเซ็น มาโคโตะ (characters/aizen_makoto.js · GRID_PLAN §7.44)
//  เหตุการณ์จาก server (socket "aizenFx" → useCharSocketFx · เสียงเล่นฝั่ง client ตามจังหวะภาพ · ไม่มีเสียงตอนคลิปเพิ่งเล่น — กฎผู้ใช้)
//   aizenArrive    ไคจูปรากฏ: ประตูมิติสีม่วงบนพื้น → สายฟ้าดำแดงฟาดลง → คลื่นกระแทก + ฝุ่นตลบ (จอสั่น)
//   aizenPossess   เริ่มบทเรียน: ดวงวิญญาณสีม่วงพุ่งเป็นโค้งจากไอเซ็นเข้าตัวไคจู → วงตาแดงวาบ
//   aizenDismount  ลงจากร่าง: วงพลังม่วงแตกออก
//   aizenOrbArrive แปลงร่างออร์บ ดาร์ก (ไม่มีคลิป): เสาแสงมืด-แดงพุ่งจากฟ้า + วงแหวนกระแทก 3 ชั้น
//   aizenOrbLeave  คืนร่าง: เศษแสงมืดสลาย
//   aizenCalibur   Orb Calibur: วงธาตุหมุนรอบตัว (มืด/ไฟ/หิน) + ประกายดาบ
//   aizenWave      Dark Slash / Inferno / Rock Calibur: คลื่นดาบรูปเสี้ยววิ่งตามพื้นที่ 6×3 ตามสีธาตุ + พื้นสว่างไล่ช่อง
//   aizenRay       Dark Origium Ray: ชาร์จหน้าตัว → ลำแสง 7×3 (แกนขาว · ขอบมืด→แสง→ไฟ) สั่นวาบ → ปลายระเบิด
//   aizenBump      ถูกผลักชน: ดาวกระแทก + เศษหิน
import { P, gEllipse } from "./boardGeo";

const TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const rgba = (rgb, a) => `rgba(${rgb},${clamp01(a)})`;
const easeOut = (t) => 1 - Math.pow(1 - clamp01(t), 3);
const easeIn = (t) => clamp01(t) * clamp01(t);
const hash = (a) => { const v = Math.sin(a * 127.1 + 31.7) * 43758.5453; return v - Math.floor(v); };
const env = (p, a, b, c, d) => (p < a || p > d ? 0 : p < b ? (p - a) / (b - a) : p < c ? 1 : (d - p) / (d - c));
// สี
const WHITE = "255,255,255", VIOLET = "150,70,255", DEEP = "60,10,90", BLOOD = "220,30,60", EYE = "255,40,40";
export const AIZEN_EL_RGB = { dark: ["40,0,70", "170,80,255"], fire: ["200,40,0", "255,170,60"], rock: ["110,70,30", "230,190,120"], light: ["200,170,60", "255,240,170"] };

export const AIZEN_FX_DUR = {
  aizenArrive: 2000, aizenPossess: 1400, aizenDismount: 1000, aizenOrbArrive: 2400, aizenOrbLeave: 1300,
  aizenCalibur: 1100, aizenWave: 1250, aizenRay: 2000, aizenBump: 650,
};
// จังหวะเสียง/จอสั่น (ms หลังเริ่ม)
export const AIZEN_T = { arriveStrike: 520, possessHit: 820, orbPillar: 300, waveGo: 120, rayFire: 520 };
export const isAizenFx = (kind) => typeof kind === "string" && kind in AIZEN_FX_DUR;
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

function glow(g, x, y, r, rgb, a, core = WHITE) {
  if (a <= 0 || r <= 0) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(core, a));
  gr.addColorStop(0.35, rgba(rgb, a * 0.7));
  gr.addColorStop(1, rgba(rgb, 0));
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}
const centre = (e) => { const n = Math.max(1, e.size | 0); return [e.x + n / 2, e.y + n / 2, n]; };
// สายฟ้าหยักจาก (x1,y1) ถึง (x2,y2) บนจอ
function bolt(g, x1, y1, x2, y2, seed, rgb, a, w) {
  const segs = 9;
  g.beginPath(); g.moveTo(x1, y1);
  for (let i = 1; i < segs; i++) {
    const t = i / segs, j = (hash(seed + i) - 0.5) * 26 * Math.sin(t * Math.PI);
    g.lineTo(x1 + (x2 - x1) * t + j, y1 + (y2 - y1) * t);
  }
  g.lineTo(x2, y2);
  g.strokeStyle = rgba(rgb, a); g.lineWidth = w; g.stroke();
  g.strokeStyle = rgba(WHITE, a * 0.9); g.lineWidth = Math.max(1, w * 0.35); g.stroke();
}
// ช่องของพื้นที่แนวหน้าตัว (len × กว้างเท่าตัว) — ตรงกับ area line ของ server
function lineTiles(e, len) {
  const [fx, fy] = DIRS[e.dir] || DIRS.up;
  const n = Math.max(1, e.size | 0), out = [];
  for (let d = 1; d <= len; d++) for (let w = 0; w < n; w++) {
    const tx = fx > 0 ? e.x + n - 1 + d : fx < 0 ? e.x - d : e.x + w;
    const ty = fy > 0 ? e.y + n - 1 + d : fy < 0 ? e.y - d : e.y + w;
    out.push({ x: tx, y: ty, d });
  }
  return out;
}

// ---------- ไคจูปรากฏ ----------
function arriveFx(g, e, t, dur, seed, lowQ) {
  const [cx, cy, n] = centre(e), p = t / dur;
  const portal = env(p, 0, 0.12, 0.45, 0.7);
  g.globalCompositeOperation = "lighter";
  // ประตูมิติหมุนบนพื้น
  for (let k = 0; k < 3; k++) {
    gEllipse(g, cx, cy, (0.55 + k * 0.28) * n * portal, 0.02, 48);
    g.strokeStyle = rgba(k === 1 ? BLOOD : VIOLET, 0.8 * portal); g.lineWidth = 4 - k; g.stroke();
  }
  const [bx, by, s] = P(cx, cy, 0.02);
  glow(g, bx, by, s * 1.4 * n * portal, VIOLET, 0.55 * portal, "200,140,255");
  // สายฟ้าดำแดงฟาดลง
  const strike = env(t, AIZEN_T.arriveStrike - 220, AIZEN_T.arriveStrike, AIZEN_T.arriveStrike + 120, AIZEN_T.arriveStrike + 520);
  if (strike > 0) {
    const [tx, ty] = P(cx, cy, 9);
    for (let i = 0; i < (lowQ ? 2 : 4); i++) bolt(g, tx + (hash(seed + i) - 0.5) * s * 2, ty, bx + (hash(seed + i * 3) - 0.5) * s * n * 0.6, by, seed + i * 11 + ((t / 60) | 0), i % 2 ? BLOOD : VIOLET, strike, 5);
    glow(g, bx, by - s * 0.6, s * 2.4 * n, BLOOD, 0.6 * strike);
  }
  // คลื่นกระแทก + ฝุ่น
  const shock = clamp01((t - AIZEN_T.arriveStrike) / 900);
  if (shock > 0 && shock < 1) {
    for (let k = 0; k < 2; k++) {
      const r = (0.6 + easeOut(clamp01(shock - k * 0.15)) * 2.6) * n * 0.6;
      gEllipse(g, cx, cy, r, 0.03, 56);
      g.strokeStyle = rgba("255,220,180", (1 - shock) * (k ? 0.5 : 0.9)); g.lineWidth = k ? 3 : 6; g.stroke();
    }
    g.globalCompositeOperation = "source-over";
    const N = lowQ ? 14 : 34;
    for (let i = 0; i < N; i++) {
      const h = hash(seed + i * 7.3), an = h * TAU, rr = (0.5 + shock * (1.3 + h)) * n * 0.6;
      const [px, py, ps] = P(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr, 0.15 + Math.sin(shock * Math.PI) * (0.5 + h));
      g.fillStyle = rgba("150,130,110", 0.55 * (1 - shock)); g.beginPath(); g.arc(px, py, ps * (0.08 + 0.1 * h) * (1 + shock), 0, TAU); g.fill();
    }
  }
}

// ---------- เริ่มบทเรียน ----------
function possessFx(g, e, t, dur, seed) {
  const [cx, cy, n] = centre(e), p = t / dur;
  const from = e.from ? [e.from.x + 0.5, e.from.y + 0.5] : [cx, cy];
  const fly = easeIn(clamp01(t / AIZEN_T.possessHit));
  g.globalCompositeOperation = "lighter";
  if (t < AIZEN_T.possessHit + 80) {
    // โค้งลอยขึ้นแล้วดิ่งเข้า
    for (let k = 0; k < 8; k++) {
      const q = clamp01(fly - k * 0.03);
      const x = from[0] + (cx - from[0]) * q, y = from[1] + (cy - from[1]) * q, z = 0.6 + Math.sin(q * Math.PI) * 2.6;
      const [px, py, ps] = P(x, y, z);
      glow(g, px, py, ps * (0.55 - k * 0.05), VIOLET, 0.85 - k * 0.09, "230,200,255");
    }
  }
  const hit = env(t, AIZEN_T.possessHit - 40, AIZEN_T.possessHit + 60, AIZEN_T.possessHit + 200, dur);
  if (hit > 0) {
    const [bx, by, s] = P(cx, cy, 1.3 * n * 0.6);
    glow(g, bx, by, s * 1.8 * n, VIOLET, 0.7 * hit);
    // ตาแดงวาบ
    for (const dx of [-0.18, 0.18]) glow(g, bx + dx * s * n, by - s * 0.5 * n, s * 0.35, EYE, hit, "255,220,220");
    const r = (0.6 + easeOut(clamp01((t - AIZEN_T.possessHit) / 500)) * 1.4) * n * 0.6;
    gEllipse(g, cx, cy, r, 0.04, 48);
    g.strokeStyle = rgba(VIOLET, 0.9 * hit); g.lineWidth = 4; g.stroke();
  }
  void p; void seed;
}

function dismountFx(g, e, t, dur, seed) {
  const [cx, cy, n] = centre(e), p = t / dur;
  g.globalCompositeOperation = "lighter";
  const a = 1 - p;
  for (let k = 0; k < 2; k++) {
    gEllipse(g, cx, cy, (0.4 + easeOut(p) * 1.4 + k * 0.2) * n * 0.6, 0.05, 40);
    g.strokeStyle = rgba(k ? BLOOD : VIOLET, a * 0.85); g.lineWidth = 4 - k * 2; g.stroke();
  }
  const [bx, by, s] = P(cx, cy, 0.8);
  glow(g, bx, by, s * 1.3, VIOLET, 0.6 * a);
  for (let i = 0; i < 14; i++) {
    const h = hash(seed + i), an = h * TAU, rr = easeOut(p) * (0.8 + h) * n * 0.6;
    const [px, py, ps] = P(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr, 0.5 + p * 1.5 * h);
    glow(g, px, py, ps * 0.14, VIOLET, a, "230,200,255");
  }
}

// ---------- ออร์บ ดาร์ก ----------
function orbArriveFx(g, e, t, dur, seed, lowQ) {
  const [cx, cy, n] = centre(e), p = t / dur;
  g.globalCompositeOperation = "lighter";
  const pillar = env(t, AIZEN_T.orbPillar - 200, AIZEN_T.orbPillar, 1300, 2100);
  const [bx, by, s] = P(cx, cy, 0);
  const [, ty] = P(cx, cy, 14);
  if (pillar > 0) {
    const w = s * n * 0.55 * (0.7 + 0.3 * Math.sin(t / 40));
    const gr = g.createLinearGradient(bx - w, 0, bx + w, 0);
    gr.addColorStop(0, rgba(DEEP, 0)); gr.addColorStop(0.25, rgba(VIOLET, 0.55 * pillar)); gr.addColorStop(0.5, rgba(WHITE, 0.9 * pillar));
    gr.addColorStop(0.75, rgba(BLOOD, 0.55 * pillar)); gr.addColorStop(1, rgba(DEEP, 0));
    g.fillStyle = gr; g.fillRect(bx - w, ty, w * 2, by - ty);
    glow(g, bx, by, s * 2.6 * n, VIOLET, 0.7 * pillar);
  }
  for (let k = 0; k < 3; k++) {
    const q = clamp01((t - AIZEN_T.orbPillar - k * 220) / 1100);
    if (q <= 0 || q >= 1) continue;
    gEllipse(g, cx, cy, (0.5 + easeOut(q) * 3.2) * n * 0.6, 0.03, 64);
    g.strokeStyle = rgba(k === 1 ? BLOOD : VIOLET, (1 - q) * 0.9); g.lineWidth = 6 - k * 1.5; g.stroke();
  }
  // อนุภาคมืดดูดเข้า
  const N = lowQ ? 12 : 30;
  for (let i = 0; i < N; i++) {
    const h = hash(seed + i * 1.7), q = clamp01(p * 1.6 - h * 0.5), rr = (1 - easeIn(q)) * (1.6 + h * 1.6) * n * 0.6, an = h * TAU + p * 3;
    if (q <= 0 || q >= 1) continue;
    const [px, py, ps] = P(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr, 0.3 + h * 3);
    glow(g, px, py, ps * 0.16, i % 3 ? VIOLET : BLOOD, 0.9 * Math.sin(q * Math.PI), "240,220,255");
  }
}
function orbLeaveFx(g, e, t, dur, seed) {
  const [cx, cy, n] = centre(e), p = t / dur;
  g.globalCompositeOperation = "lighter";
  for (let i = 0; i < 22; i++) {
    const h = hash(seed + i * 2.1), an = h * TAU;
    const [px, py, ps] = P(cx + Math.cos(an) * (0.3 + h) * n * 0.5, cy + Math.sin(an) * (0.3 + h) * n * 0.5, 0.4 + p * (2 + 2 * h));
    glow(g, px, py, ps * 0.15, i % 2 ? VIOLET : DEEP, 1 - p, "220,200,255");
  }
}
function caliburFx(g, e, t, dur, seed) {
  const [cx, cy, n] = centre(e), p = t / dur;
  const [dk, lt] = AIZEN_EL_RGB[e.el] || AIZEN_EL_RGB.dark;
  g.globalCompositeOperation = "lighter";
  const a = env(p, 0, 0.12, 0.7, 1);
  for (let k = 0; k < 3; k++) {
    g.beginPath();
    for (let i = 0; i <= 40; i++) {
      const an = (i / 40) * TAU * 0.7 + p * 9 + k * TAU / 3, r = (0.55 + 0.1 * k) * n * 0.6;
      const [px, py] = P(cx + Math.cos(an) * r, cy + Math.sin(an) * r, 0.4 + k * 0.5 + i * 0.01);
      if (i) g.lineTo(px, py); else g.moveTo(px, py);
    }
    g.strokeStyle = rgba(k === 1 ? dk : lt, a * 0.9); g.lineWidth = 5 - k; g.stroke();
  }
  // ประกายดาบ Orb Calibur
  const [sx, sy, s] = P(cx, cy, 1.6 * n * 0.6);
  const glint = env(p, 0.25, 0.4, 0.5, 0.75);
  if (glint > 0) {
    g.strokeStyle = rgba(WHITE, glint); g.lineWidth = 3;
    g.beginPath(); g.moveTo(sx - s * 0.9, sy); g.lineTo(sx + s * 0.9, sy); g.moveTo(sx, sy - s * 0.9); g.lineTo(sx, sy + s * 0.9); g.stroke();
    glow(g, sx, sy, s * 0.9, lt, glint);
  }
  void seed;
}

// ---------- คลื่นดาบ 6×3 ----------
function waveFx(g, e, t, dur, seed, lowQ) {
  const len = e.len || 6;
  const tiles = lineTiles(e, len);
  const [dk, lt] = AIZEN_EL_RGB[e.el] || AIZEN_EL_RGB.dark;
  const travel = clamp01((t - AIZEN_T.waveGo) / (dur * 0.55));
  const head = travel * (len + 0.5);
  g.globalCompositeOperation = "lighter";
  // พื้นสว่างไล่ช่องตามหัวคลื่น
  for (const c of tiles) {
    const k = clamp01(1 - Math.abs(head - c.d) / 1.6) + (head > c.d ? 0.25 * (1 - t / dur) : 0);
    if (k <= 0) continue;
    const a = P(c.x, c.y, 0.01), b = P(c.x + 1, c.y, 0.01), cc = P(c.x + 1, c.y + 1, 0.01), d = P(c.x, c.y + 1, 0.01);
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(cc[0], cc[1]); g.lineTo(d[0], d[1]); g.closePath();
    g.fillStyle = rgba(lt, 0.4 * k); g.fill();
  }
  // เสี้ยวคลื่น
  if (travel > 0 && travel < 1) {
    const [fx, fy] = DIRS[e.dir] || DIRS.up;
    const n = Math.max(1, e.size | 0);
    const mx = e.x + n / 2 + fx * (n / 2 + head), my = e.y + n / 2 + fy * (n / 2 + head);
    const sx = -fy, sy = fx;
    for (let layer = 0; layer < 3; layer++) {
      g.beginPath();
      for (let i = 0; i <= 24; i++) {
        const u = i / 24 - 0.5, bend = (1 - 4 * u * u) * 0.7 - layer * 0.18;
        const [px, py] = P(mx + sx * u * (n + 0.6) + fx * bend, my + sy * u * (n + 0.6) + fy * bend, 0.5 + (1 - 4 * u * u) * 0.6);
        if (i) g.lineTo(px, py); else g.moveTo(px, py);
      }
      g.strokeStyle = rgba(layer === 0 ? WHITE : layer === 1 ? lt : dk, (1 - travel * 0.5) * (layer === 2 ? 0.8 : 1)); g.lineWidth = [5, 11, 18][layer]; g.stroke();
    }
    const [hx, hy, hs] = P(mx, my, 0.8);
    glow(g, hx, hy, hs * 1.6, lt, 0.7);
    // สะเก็ดตามธาตุ
    const N = lowQ ? 8 : 20;
    for (let i = 0; i < N; i++) {
      const h = hash(seed + i * 3.1 + ((t / 50) | 0));
      const [px, py, ps] = P(mx + sx * (h - 0.5) * n - fx * h * 1.5, my + sy * (h - 0.5) * n - fy * h * 1.5, 0.3 + h * 1.4);
      g.fillStyle = rgba(e.el === "rock" ? "200,160,100" : lt, 0.85 * (1 - travel));
      g.beginPath(); g.arc(px, py, ps * (e.el === "rock" ? 0.09 : 0.06), 0, TAU); g.fill();
    }
  }
}

// ---------- ลำแสง Dark Origium Ray ----------
function rayFx(g, e, t, dur, seed, lowQ) {
  const len = e.len || 7;
  const n = Math.max(1, e.size | 0);
  const [fx, fy] = DIRS[e.dir] || DIRS.up;
  const sx = -fy, sy = fx;
  const ox = e.x + n / 2 + fx * n / 2, oy = e.y + n / 2 + fy * n / 2; // ขอบหน้าตัว
  g.globalCompositeOperation = "lighter";
  // ชาร์จ
  const charge = env(t, 0, AIZEN_T.rayFire - 40, AIZEN_T.rayFire, AIZEN_T.rayFire + 200);
  const [qx, qy, qs] = P(ox, oy, 1.2);
  if (charge > 0) {
    glow(g, qx, qy, qs * (0.4 + 1.4 * charge), VIOLET, 0.9 * charge);
    for (let i = 0; i < (lowQ ? 6 : 14); i++) {
      const h = hash(seed + i), an = h * TAU + t / 90, rr = (1 - charge) * 2 + 0.3;
      const [px, py, ps] = P(ox + Math.cos(an) * rr, oy + Math.sin(an) * rr, 1.2 + Math.sin(an) * 0.5);
      glow(g, px, py, ps * 0.12, i % 2 ? BLOOD : VIOLET, charge, "255,230,255");
    }
  }
  // ลำแสง
  const beam = env(t, AIZEN_T.rayFire, AIZEN_T.rayFire + 90, dur - 520, dur - 120);
  if (beam > 0) {
    const reach = easeOut(clamp01((t - AIZEN_T.rayFire) / 260)) * len;
    const flick = 0.85 + 0.15 * Math.sin(t / 22);
    const half = n / 2 + 0.15;
    const ends = (w) => {
      const a = P(ox + sx * w, oy + sy * w, 1.1), b = P(ox + fx * reach + sx * w, oy + fy * reach + sy * w, 1.1);
      return [a, b];
    };
    // ขอบสีตามลำดับธาตุ มืด → แสง → ไฟ (เวลา)
    const ph = clamp01((t - AIZEN_T.rayFire) / (dur - AIZEN_T.rayFire - 400));
    const edge = ph < 0.34 ? AIZEN_EL_RGB.dark[1] : ph < 0.67 ? AIZEN_EL_RGB.light[1] : AIZEN_EL_RGB.fire[1];
    for (const [w, rgb, lw] of [[1, edge, 26], [0.7, VIOLET, 18], [0.35, WHITE, 10]]) {
      for (const sgn of [-1, 1]) {
        const [a, b] = ends(sgn * half * w);
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]);
        g.strokeStyle = rgba(rgb, beam * flick * (rgb === WHITE ? 1 : 0.75)); g.lineWidth = lw * (0.6 + 0.4 * flick); g.stroke();
      }
    }
    const [c1, c2] = ends(0);
    g.beginPath(); g.moveTo(c1[0], c1[1]); g.lineTo(c2[0], c2[1]);
    g.strokeStyle = rgba(WHITE, beam); g.lineWidth = 34 * flick; g.stroke();
    // พื้นลุกตามแนว
    for (const c of lineTiles(e, Math.ceil(reach))) {
      const a = P(c.x, c.y, 0.01), b = P(c.x + 1, c.y, 0.01), cc = P(c.x + 1, c.y + 1, 0.01), d = P(c.x, c.y + 1, 0.01);
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(cc[0], cc[1]); g.lineTo(d[0], d[1]); g.closePath();
      g.fillStyle = rgba(edge, 0.35 * beam); g.fill();
    }
    // ระเบิดปลายทาง
    const [ex, ey, es] = P(ox + fx * reach, oy + fy * reach, 1.1);
    glow(g, ex, ey, es * (1.6 + 0.4 * flick) * n * 0.6, edge, 0.9 * beam);
    glow(g, qx, qy, qs * 1.4, WHITE, 0.8 * beam);
  }
}

// ---------- ถูกผลักชน ----------
function bumpFx(g, e, t, dur, seed) {
  const [cx, cy, n] = centre(e), p = t / dur;
  const [bx, by, s] = P(cx, cy, 0.5);
  g.globalCompositeOperation = "lighter";
  glow(g, bx, by, s * (0.6 + p) * n, "255,210,150", 1 - p);
  g.strokeStyle = rgba(WHITE, 1 - p); g.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const an = (i / 8) * TAU + hash(seed) , r1 = s * 0.25, r2 = s * (0.5 + p * 0.8);
    g.beginPath(); g.moveTo(bx + Math.cos(an) * r1, by + Math.sin(an) * r1 * 0.7); g.lineTo(bx + Math.cos(an) * r2, by + Math.sin(an) * r2 * 0.7); g.stroke();
  }
}

export function aizenFx(g, e, now, lowQ) {
  const dur = e.dur || AIZEN_FX_DUR[e.kind];
  const t = now - e.t0;
  if (t < 0 || t > dur) return;
  const seed = ((e.t0 | 0) % 977) / 97;
  g.save();
  if (e.kind === "aizenArrive") arriveFx(g, e, t, dur, seed, lowQ);
  else if (e.kind === "aizenPossess") possessFx(g, e, t, dur, seed, lowQ);
  else if (e.kind === "aizenDismount") dismountFx(g, e, t, dur, seed, lowQ);
  else if (e.kind === "aizenOrbArrive") orbArriveFx(g, e, t, dur, seed, lowQ);
  else if (e.kind === "aizenOrbLeave") orbLeaveFx(g, e, t, dur, seed, lowQ);
  else if (e.kind === "aizenCalibur") caliburFx(g, e, t, dur, seed, lowQ);
  else if (e.kind === "aizenWave") waveFx(g, e, t, dur, seed, lowQ);
  else if (e.kind === "aizenRay") rayFx(g, e, t, dur, seed, lowQ);
  else if (e.kind === "aizenBump") bumpFx(g, e, t, dur, seed, lowQ);
  else if (e.kind in AIZEN_MS) strikeFx(g, e, t, dur, seed, lowQ); // ท่าตีปกติของไคจู/ออร์บ ดาร์ก
  g.restore();
}

// เหตุการณ์ socket "aizenFx" → { fx, sfx: [[ชื่อ, ms]], shake: [ms] } (useCharSocketFx)
const KIND = { arrive: "aizenArrive", possess: "aizenPossess", dismount: "aizenDismount", orbArrive: "aizenOrbArrive", orbLeave: "aizenOrbLeave", calibur: "aizenCalibur", wave: "aizenWave", ray: "aizenRay", bump: "aizenBump" };
const ROAR = { redking: "az_roar_redking", grigio: "az_roar_grigio", guebasser: "az_roar_guebasser" };
const WAVE_SFX = { dark: "az_calibur", fire: "az_inferno", rock: "az_hit_rock" };
export function aizenEventFx(ev) {
  const out = { fx: [], sfx: [], shake: [] };
  const at = ev && ev.at;
  const kind = ev && KIND[ev.kind];
  if (!kind || !at || !Number.isFinite(at.x) || !Number.isFinite(at.y)) return out;
  out.fx.push({ kind, id: ev.id, x: at.x, y: at.y, size: ev.size || 1, dir: ev.dir, len: ev.len, el: ev.el, from: ev.from || null, dur: AIZEN_FX_DUR[kind] });
  const snd = ev.sound !== false; // false = คลิปเพิ่งเล่น (กฎผู้ใช้: action ที่มีวีดีโอไม่มีเสียงเอฟเฟกต์)
  if (kind === "aizenArrive") {
    if (snd) { out.sfx.push(["az_arrive", AIZEN_T.arriveStrike - 60]); if (ROAR[ev.kaiju]) out.sfx.push([ROAR[ev.kaiju], AIZEN_T.arriveStrike + 250]); }
    out.shake.push(AIZEN_T.arriveStrike, AIZEN_T.arriveStrike + 160, AIZEN_T.arriveStrike + 380);
  } else if (kind === "aizenPossess") { out.sfx.push(["az_possess", 0]); out.shake.push(AIZEN_T.possessHit); if (ROAR[ev.kaiju]) out.sfx.push([ROAR[ev.kaiju], AIZEN_T.possessHit + 100]); }
  else if (kind === "aizenDismount") out.sfx.push(["az_dismount", 0]);
  else if (kind === "aizenOrbArrive") { if (snd) out.sfx.push(["az_orb_arrive", 0]); out.shake.push(AIZEN_T.orbPillar, AIZEN_T.orbPillar + 220, AIZEN_T.orbPillar + 440); }
  else if (kind === "aizenOrbLeave") out.sfx.push(["az_orb_leave", 0]);
  else if (kind === "aizenCalibur") out.sfx.push(["az_calibur", 0]);
  else if (kind === "aizenWave") { if (snd) out.sfx.push([WAVE_SFX[ev.el] || "az_calibur", 0]); out.shake.push(AIZEN_T.waveGo + 300); }
  else if (kind === "aizenRay") { out.shake.push(AIZEN_T.rayFire, AIZEN_T.rayFire + 200, AIZEN_T.rayFire + 450, AIZEN_T.rayFire + 750); }
  else if (kind === "aizenBump") { out.sfx.push(["az_bump", 0]); out.shake.push(0); }
  return out;
}

// ---------- ออร่าค้างร่างออร์บ ดาร์ก (units[].aura "aizenOrb" · สีตามธาตุร่าง units[].aizenEl) ----------
//  cx, cy = กลางตัว (หน่วยช่อง) · n = ขนาดตัว · วงพลังหมุนบนพื้น + เปลวพลังลอยขึ้นรอบตัว (หลังหมาก)
export function aizenAuraBack(g, cx, cy, n, el, now, lowQ, alpha = 1) {
  const [dk, lt] = AIZEN_EL_RGB[el] || AIZEN_EL_RGB.dark;
  const r = Math.max(1, n) * 0.62;
  g.save(); g.globalCompositeOperation = "lighter";
  const pulse = 0.75 + 0.25 * Math.sin(now / 260);
  gEllipse(g, cx, cy, r, 0.02, 56);
  g.strokeStyle = rgba(lt, 0.75 * alpha * pulse); g.lineWidth = 3; g.stroke();
  gEllipse(g, cx, cy, r * 0.82, 0.02, 48);
  g.strokeStyle = rgba(dk, 0.6 * alpha); g.lineWidth = 6; g.stroke();
  // ขีดวงเวทหมุน
  for (let i = 0; i < 6; i++) {
    const an = (i / 6) * TAU + now / 900;
    const [ax, ay] = P(cx + Math.cos(an) * r * 0.82, cy + Math.sin(an) * r * 0.82, 0.02);
    const [bx, by] = P(cx + Math.cos(an + 0.35) * r, cy + Math.sin(an + 0.35) * r, 0.02);
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.strokeStyle = rgba(lt, 0.6 * alpha); g.lineWidth = 2; g.stroke();
  }
  const [gx, gy, s] = P(cx, cy, 0.05);
  glow(g, gx, gy, s * r * 1.5, dk, 0.35 * alpha * pulse, lt);
  // เปลวพลังลอยขึ้น
  const N = lowQ ? 5 : 12;
  for (let i = 0; i < N; i++) {
    const h = hash(i * 7.7 + 3), life = ((now / 1400 + h) % 1), an = h * TAU + now / 2000;
    const [px, py, ps] = P(cx + Math.cos(an) * r * 0.9, cy + Math.sin(an) * r * 0.9, life * 2.6);
    glow(g, px, py, ps * 0.12, lt, alpha * Math.sin(life * Math.PI) * 0.9, "255,255,255");
  }
  g.restore();
}

// ---------- ท่าตีปกติ (ฮุค attackStyle → STYLE_MS/STYLE_HIT_P ใน boardFxBasic.js) ----------
//  fx { x, y (มุมผู้ตี), size, to, toSize, lane (ช่องทั้งกรอบ/กรวย) } · ปะทะที่ AIZEN_HIT_P
//   aizenRedkingStrike    เร็ดคิง: ยกตัวทุบพื้น → คลื่นกระแทกวิ่งทั่วกรอบ 3×3 + หินแหลมงอก + ฝุ่นตลบ
//   aizenGrigioStrike     กริจิโอ โบน: รวมไฟที่ปาก → พ่นไฟเป็นกรวยไล่ช่องใกล้ → ไกล + ประกายไฟ
//   aizenGuebasserStrike  เกลบาสซ่า: กางปีก → ลมหมุนเป็นเกลียววิ่งตามกรอบ 4×3 + ขนนกปลิว
//   aizenOrbStrike        ออร์บ ดาร์ก: ฟันดาบ Orb Calibur กวาดแถวหน้าตัว
export const AIZEN_MS = { aizenRedkingStrike: 1400, aizenGrigioStrike: 1600, aizenGuebasserStrike: 1400, aizenOrbStrike: 1000 };
export const AIZEN_HIT_P = { aizenRedkingStrike: 0.42, aizenGrigioStrike: 0.38, aizenGuebasserStrike: 0.4, aizenOrbStrike: 0.45 };
Object.assign(AIZEN_FX_DUR, AIZEN_MS);
const laneOf = (e) => (Array.isArray(e.lane) && e.lane.length ? e.lane : e.to ? [e.to] : []);
const midOf = (tiles) => { let x = 0, y = 0; for (const c of tiles) { x += c.x + 0.5; y += c.y + 0.5; } return tiles.length ? [x / tiles.length, y / tiles.length] : [0, 0]; };
function tileFill(g, c, rgb, a) {
  if (a <= 0) return;
  const p1 = P(c.x, c.y, 0.01), p2 = P(c.x + 1, c.y, 0.01), p3 = P(c.x + 1, c.y + 1, 0.01), p4 = P(c.x, c.y + 1, 0.01);
  g.beginPath(); g.moveTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.lineTo(p3[0], p3[1]); g.lineTo(p4[0], p4[1]); g.closePath();
  g.fillStyle = rgba(rgb, a); g.fill();
}
function strikeFx(g, e, t, dur, seed, lowQ) {
  const n = Math.max(1, e.size | 0), cx = e.x + n / 2, cy = e.y + n / 2;
  const lane = laneOf(e), [mx, my] = midOf(lane);
  if (!lane.length) return;
  const hit = dur * AIZEN_HIT_P[e.kind];
  const pre = clamp01(t / hit), post = t >= hit ? clamp01((t - hit) / (dur - hit)) : 0;
  const near = (c) => Math.abs(c.x + 0.5 - cx) + Math.abs(c.y + 0.5 - cy);
  const dmax = lane.reduce((m, c) => Math.max(m, near(c)), 1);
  g.globalCompositeOperation = "lighter";
  if (e.kind === "aizenRedkingStrike") {
    const ROCK = AIZEN_EL_RGB.rock[1];
    if (t < hit) { gEllipse(g, cx, cy, n * 0.55 * (0.8 + 0.2 * pre), 0.02, 40); g.strokeStyle = rgba(ROCK, 0.5 * pre); g.lineWidth = 3; g.stroke(); }
    if (t >= hit) {
      for (const c of lane) { const k = clamp01(post * 2.4 - (near(c) - n / 2) / dmax); tileFill(g, c, ROCK, 0.5 * k * (1 - post)); }
      g.globalCompositeOperation = "source-over";
      for (let i = 0; i < lane.length; i++) {
        const c = lane[i], h = hash(seed + i * 3.7), grow = easeOut(clamp01(post * 3 - h * 0.6)) * (1 - easeIn(clamp01((post - 0.6) / 0.4)));
        if (grow <= 0) continue;
        const [bx, by, s] = P(c.x + 0.3 + h * 0.4, c.y + 0.3 + hash(seed + i) * 0.4, 0);
        const hgt = s * (0.4 + 0.6 * h) * grow, w = s * 0.16;
        g.fillStyle = rgba("150,110,70", 0.95); g.beginPath(); g.moveTo(bx - w, by); g.lineTo(bx + w * 0.3, by - hgt); g.lineTo(bx + w, by); g.closePath(); g.fill();
        g.fillStyle = rgba("230,200,150", 0.8); g.beginPath(); g.moveTo(bx - w * 0.2, by); g.lineTo(bx + w * 0.3, by - hgt); g.lineTo(bx + w * 0.5, by); g.closePath(); g.fill();
      }
      g.globalCompositeOperation = "lighter";
      const [hx, hy, hs] = P(mx, my, 0.4);
      glow(g, hx, hy, hs * 2.2 * (1 - post), ROCK, 0.8 * (1 - post), "255,240,210");
      for (let i = 0; i < (lowQ ? 10 : 26); i++) {
        const h = hash(seed + 50 + i), an = h * TAU, r = post * (0.8 + h * 1.6);
        const [px, py, ps] = P(mx + Math.cos(an) * r, my + Math.sin(an) * r, Math.sin(post * Math.PI) * (0.6 + h));
        g.fillStyle = rgba("170,140,110", 0.8 * (1 - post)); g.beginPath(); g.arc(px, py, ps * 0.07, 0, TAU); g.fill();
      }
    }
  } else if (e.kind === "aizenGrigioStrike") {
    const [dk, lt] = AIZEN_EL_RGB.fire;
    const [ox, oy, os] = P(cx + (mx - cx) * 0.25, cy + (my - cy) * 0.25, 1.6 * n * 0.5);
    if (t < hit) glow(g, ox, oy, os * (0.4 + 1.2 * pre), dk, 0.9 * pre, lt);
    if (t >= hit) {
      const reach = easeOut(clamp01(post * 2.2)), fade = 1 - easeIn(clamp01((post - 0.55) / 0.45));
      for (const c of lane) { const k = clamp01(reach * dmax - (near(c) - n / 2) + 1); tileFill(g, c, lt, 0.45 * k * fade); }
      const N = lowQ ? 18 : 46;
      for (let i = 0; i < N; i++) {
        const h = hash(seed + i * 1.9), life = ((t / 380 + h) % 1) * reach;
        const c = lane[Math.floor(hash(seed + i * 5.1) * lane.length)];
        const tx = cx + (c.x + 0.5 - cx) * life, ty = cy + (c.y + 0.5 - cy) * life;
        const [px, py, ps] = P(tx, ty, (1 - life) * 1.4 * n * 0.5 + 0.2);
        glow(g, px, py, ps * (0.12 + 0.25 * life), life < 0.5 ? lt : dk, 0.85 * fade, "255,250,220");
      }
    }
  } else if (e.kind === "aizenGuebasserStrike") {
    const WIND = "170,240,210";
    if (t < hit) {
      const [bx, by, s] = P(cx, cy, 1.2 * n * 0.5);
      for (const sg of [-1, 1]) { g.strokeStyle = rgba(WIND, 0.7 * pre); g.lineWidth = 3; g.beginPath(); g.arc(bx + sg * s * n * 0.4, by, s * 0.6 * pre, 0, TAU); g.stroke(); }
    }
    if (t >= hit) {
      const reach = easeOut(clamp01(post * 1.8)), fade = 1 - easeIn(clamp01((post - 0.6) / 0.4));
      for (const c of lane) { const k = clamp01(reach * dmax - (near(c) - n / 2) + 1); tileFill(g, c, WIND, 0.3 * k * fade); }
      for (let k = 0; k < 3; k++) {
        g.beginPath();
        for (let i = 0; i <= 30; i++) {
          const q = (i / 30) * reach, an = q * 14 + t / 60 + k * 2.1;
          const x = cx + (mx - cx) * q * 1.3 + Math.cos(an) * 0.35 * n * 0.5, y = cy + (my - cy) * q * 1.3 + Math.sin(an) * 0.35 * n * 0.5;
          const [px, py] = P(x, y, 0.6 + Math.sin(an) * 0.3);
          if (i) g.lineTo(px, py); else g.moveTo(px, py);
        }
        g.strokeStyle = rgba(k === 1 ? WHITE : WIND, 0.75 * fade); g.lineWidth = 3 - k * 0.6; g.stroke();
      }
      g.globalCompositeOperation = "source-over";
      for (let i = 0; i < (lowQ ? 6 : 16); i++) {
        const h = hash(seed + i * 2.3), q = clamp01(post * 1.5 - h * 0.3);
        const [px, py, ps] = P(cx + (mx - cx) * q * 1.4 + (h - 0.5) * 1.5, cy + (my - cy) * q * 1.4 + (hash(seed + i) - 0.5) * 1.5, 0.5 + h * 1.2);
        g.save(); g.translate(px, py); g.rotate(t / 120 + h * 6);
        g.fillStyle = rgba(i % 3 ? "250,245,240" : "220,60,70", 0.9 * fade); g.beginPath(); g.ellipse(0, 0, ps * 0.12, ps * 0.04, 0, 0, TAU); g.fill();
        g.restore();
      }
    }
  } else if (e.kind === "aizenOrbStrike") {
    const [dk, lt] = AIZEN_EL_RGB[e.el] || AIZEN_EL_RGB.dark;
    if (t < hit) { const [bx, by, s] = P(cx, cy, 1.8 * n * 0.5); glow(g, bx, by, s * pre * 1.2, dk, 0.8 * pre, lt); }
    if (t >= hit) {
      const sw = easeOut(clamp01(post * 2.5)), fade = 1 - easeIn(clamp01((post - 0.4) / 0.6));
      for (const c of lane) tileFill(g, c, lt, 0.4 * fade);
      const dx = Math.sign(Math.round(mx - cx)), dy = Math.sign(Math.round(my - cy));
      const sx = -dy, sy = dx;
      for (let layer = 0; layer < 3; layer++) {
        g.beginPath();
        for (let i = 0; i <= 26; i++) {
          const u = (i / 26 - 0.5) * sw, bend = (1 - 4 * u * u) * 0.5;
          const [px, py] = P(mx + sx * u * (n + 0.8) + dx * bend * 0.5, my + sy * u * (n + 0.8) + dy * bend * 0.5, 0.8 + bend);
          if (i) g.lineTo(px, py); else g.moveTo(px, py);
        }
        g.strokeStyle = rgba(layer === 0 ? WHITE : layer === 1 ? lt : dk, fade); g.lineWidth = [4, 10, 16][layer]; g.stroke();
      }
    }
  }
}
