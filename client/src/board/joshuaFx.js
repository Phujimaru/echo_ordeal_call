// เอฟเฟกต์บนกระดานของโจชัว รอสฟิลด์ (characters/joshua_rosfield.js · GRID_PLAN §7.41)
//  อ้างอิงต้นฉบับ (Final Fantasy XVI — Dominant แห่งนกเพลิง): ไฟสีแดงเข้มอมทอง · ขนนกเพลิง · Rising Flames (ปีกไฟกวาด) · Flames of Rebirth (เสาไฟคืนชีพ)
//  เหตุการณ์จาก server (socket "joshuaFx" → useCharSocketFx):
//   joshuaCone     เพื่อปกป้องทุกคน: ไฟรวมที่มือ → ตรงจังหวะ JOSHUA_T.cone ปีกเพลิงกวาดกรวย + เปลวไฟลุกทุกช่องจากใกล้ไปไกล
//   joshuaHeal     พรของนกเพลิง: เสาไฟคืนชีพอ่อนๆ บนตัวผู้รับ + ขนนกเพลิงหมุนขึ้น
//   joshuaPhoenix  สวมร่างนกเพลิง (หลังคลิป): หางนกเพลิงสะบัดออก + วงไฟแผ่ถึงระยะเดิน
//   joshuaSinge    ศัตรูโจมตีร่างนกเพลิง: ไฟลุกใส่ผู้โจมตี
//  ออร่าค้าง (drawUnit — units[].aura "joshuaPhoenix"): ขนหางนกเพลิง (แกน + ขนฝอย) พลิ้วหลังหมาก (ตามคลิป joshua_skill3) + ไฟที่เท้า + สะเก็ดไฟหน้าหมาก
import { P } from "./boardGeo";

const TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const rgba = (rgb, a) => `rgba(${rgb},${clamp01(a)})`;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const hash = (a) => { const v = Math.sin(a * 127.1 + 31.7) * 43758.5453; return v - Math.floor(v); };
const REDUCED = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// สี: แกนขาวทอง → ทอง → แดงเพลิง → แดงเข้มนกเพลิง
const CORE = "255,248,226", GOLD = "255,196,92", FLAME = "255,104,40", CRIMSON = "214,24,48", DEEP = "120,8,36";

// จังหวะ (ms) — server characters/joshua_rosfield.js T ต้องตรงกัน (วินาที)
export const JOSHUA_T = { cone: 550 };
export const JOSHUA_FX_DUR = { joshuaCone: 2100, joshuaHeal: 1700, joshuaPhoenix: 2200, joshuaSinge: 800 };
export const isJoshuaFx = (kind) => typeof kind === "string" && kind in JOSHUA_FX_DUR;
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

function bodyAt(x, y, n = 1) {
  n = Math.max(1, n | 0);
  const K = 1 + (n - 1) * 0.6, cx = x + n / 2, cy = y + n / 2;
  const [bx, by, s] = P(cx, cy);
  return { bx, by, s, hy: by - s * 0.5 * K, K };
}
function glow(g, x, y, r, rgb, a, core = CORE) {
  if (a <= 0 || r <= 0) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(core, a));
  gr.addColorStop(0.3, rgba(rgb, a * 0.75));
  gr.addColorStop(1, rgba(rgb, 0));
  g.fillStyle = gr;
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}
// เปลวไฟหยดน้ำกลับหัว (ฐานกลม ปลายแหลมพลิ้ว) — ยืนบนจุด x,y สูง h
function flame(g, x, y, w, h, sway, a) {
  if (a <= 0 || h <= 0) return;
  const tipX = x + sway * w * 0.9;
  const gr = g.createLinearGradient(x, y, x, y - h);
  gr.addColorStop(0, rgba(CORE, a));
  gr.addColorStop(0.25, rgba(GOLD, a * 0.95));
  gr.addColorStop(0.6, rgba(FLAME, a * 0.8));
  gr.addColorStop(1, rgba(CRIMSON, 0));
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(x - w, y);
  g.bezierCurveTo(x - w * 1.1, y - h * 0.45, tipX - w * 0.35, y - h * 0.7, tipX, y - h);
  g.bezierCurveTo(tipX + w * 0.35, y - h * 0.7, x + w * 1.1, y - h * 0.45, x + w, y);
  g.quadraticCurveTo(x, y + w * 0.55, x - w, y);
  g.fill();
}
// ขนนกเพลิง 1 เส้น: จากโคน (x,y) ไปทางมุม ang ยาว L กว้าง w · โค้งงอ bend
function feather(g, x, y, ang, L, w, bend, a, hot = 1) {
  if (a <= 0 || L <= 0) return;
  const ca = Math.cos(ang), sa = Math.sin(ang), nx = -sa, ny = ca;
  const tx = x + ca * L + nx * bend * L, ty = y + sa * L + ny * bend * L;
  const mx = x + ca * L * 0.5 + nx * bend * L * 0.7, my = y + sa * L * 0.5 + ny * bend * L * 0.7;
  const gr = g.createLinearGradient(x, y, tx, ty);
  gr.addColorStop(0, rgba(hot > 0.5 ? GOLD : FLAME, a));
  gr.addColorStop(0.45, rgba(CRIMSON, a * 0.95));
  gr.addColorStop(1, rgba(DEEP, 0));
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(x + nx * w * 0.3, y + ny * w * 0.3);
  g.quadraticCurveTo(mx + nx * w, my + ny * w, tx, ty);
  g.quadraticCurveTo(mx - nx * w * 0.6, my - ny * w * 0.6, x - nx * w * 0.3, y - ny * w * 0.3);
  g.closePath(); g.fill();
  // แกนขน (เส้นสว่าง)
  g.strokeStyle = rgba(CORE, a * 0.55 * hot); g.lineWidth = Math.max(1, w * 0.12);
  g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(mx, my, x + (tx - x) * 0.85, y + (ty - y) * 0.85); g.stroke();
}
// สะเก็ดไฟลอยขึ้น
function embers(g, x, y, r, k, t, a, seed, rise = 1) {
  if (a <= 0) return;
  for (let i = 0; i < k; i++) {
    const h1 = hash(seed + i * 2.1), h2 = hash(seed + i * 5.3), h3 = hash(seed + i * 7.7);
    const life = 700 + 700 * h3, age = (t + h1 * life) % life, q = age / life;
    const px = x + (h2 - 0.5) * 2 * r + Math.sin(q * 6 + i) * r * 0.12;
    const py = y - q * r * 1.6 * rise;
    const sz = Math.max(1, r * (0.035 + 0.03 * h1) * (1 - q));
    g.fillStyle = rgba(q < 0.4 ? GOLD : FLAME, a * (1 - q));
    g.beginPath(); g.arc(px, py, sz, 0, TAU); g.fill();
  }
}

// ---------- เพื่อปกป้องทุกคน (กรวยไฟ) ----------
function coneFx(g, e, t, dur, seed, lowQ) {
  const v = DIRS[e.dir] || [1, 0];
  const A = bodyAt(e.x, e.y, e.size || 1);
  const beat = JOSHUA_T.cone;
  const hand = { x: A.bx + (P(e.x + 0.5 + v[0], e.y + 0.5 + v[1])[0] - A.bx) * 0.35, y: A.hy };
  const big = e.phoenix ? 1.25 : 1;
  g.globalCompositeOperation = "lighter";
  // 1) ไฟรวมที่มือ (วงสะเก็ดหมุนเข้า)
  if (t < beat + 150) {
    const c = clamp01(t / beat);
    glow(g, hand.x, hand.y, A.s * (0.25 + 0.3 * c) * big, FLAME, 0.85 * (t < beat ? 1 : 1 - (t - beat) / 150));
    if (!lowQ) for (let i = 0; i < 10; i++) {
      const ang = hash(seed + i) * TAU + t / 160, r = A.s * 0.6 * (1 - c) + A.s * 0.08;
      g.fillStyle = rgba(GOLD, 0.8 * c);
      g.beginPath(); g.arc(hand.x + Math.cos(ang) * r, hand.y + Math.sin(ang) * r * 0.7, Math.max(1, A.s * 0.025), 0, TAU); g.fill();
    }
  }
  const wt = t - beat;
  if (wt < 0) { g.globalCompositeOperation = "source-over"; return; }
  const after = dur - beat;
  const fade = 1 - clamp01((wt - after * 0.55) / (after * 0.45));
  // 2) ปีกเพลิงกวาด (Rising Flames) — เสี้ยวขนนกพุ่งตามทิศ กางออกเป็นรูปกรวย
  const tiles = Array.isArray(e.tiles) && e.tiles.length ? e.tiles : [];
  const len = tiles.length ? Math.max(...tiles.map((c) => (c.x - e.x) * v[0] + (c.y - e.y) * v[1])) : 4;
  const sweep = easeOut(clamp01(wt / 420));
  const [tx, ty] = P(e.x + 0.5 + v[0] * (len + 0.4) * sweep, e.y + 0.5 + v[1] * (len + 0.4) * sweep);
  const dirA = Math.atan2(ty - A.hy, tx - A.bx);
  const reach = Math.hypot(tx - A.bx, ty - A.hy);
  g.globalCompositeOperation = "source-over"; // ปีก/เปลวไฟทึบ (เห็นชัดทั้งพื้นสว่างและมืด) · เรืองแสงเท่านั้นที่ lighter
  if (!REDUCED && wt < 700) {
    const wa = (1 - clamp01((wt - 300) / 400)) * 0.9;
    const n = lowQ ? 7 : 13;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1) - 0.5; // −0.5..0.5 ข้ามกรวย
      feather(g, hand.x, hand.y, dirA + u * 0.95, reach * (0.75 + 0.25 * Math.cos(u * Math.PI)), A.s * 0.16 * big, u * 0.25, wa, 1 - Math.abs(u));
    }
  }
  // 3) เปลวไฟลุกทุกช่องจากใกล้ไปไกล
  for (let i = 0; i < tiles.length; i++) {
    const c = tiles[i];
    const along = (c.x - e.x) * v[0] + (c.y - e.y) * v[1];
    const lt = wt - along * 70;
    if (lt < 0) continue;
    const [px, py, s] = P(c.x + 0.5, c.y + 0.5);
    const rise = easeOut(clamp01(lt / 260));
    const a = fade * (0.9 - 0.1 * along / Math.max(1, len));
    g.globalCompositeOperation = "lighter";
    glow(g, px, py, s * 0.6 * rise, CRIMSON, a * 0.55, GOLD);
    g.globalCompositeOperation = "source-over";
    const nF = lowQ ? 2 : 4;
    for (let k = 0; k < nF; k++) {
      const h = hash(seed + i * 7 + k * 3);
      const fx = px + (h - 0.5) * s * 0.6, sway = Math.sin(wt / 90 + h * 9) * 0.35;
      flame(g, fx, py + s * 0.1, s * (0.12 + 0.06 * h) * big, s * (0.55 + 0.5 * h) * rise * big * (0.85 + 0.15 * Math.sin(wt / 70 + k)), sway, a);
    }
    if (!lowQ) embers(g, px, py - s * 0.2, s * 0.5, 4, lt, a * 0.9, seed + i);
  }
  g.globalCompositeOperation = "source-over";
}

// ---------- พรของนกเพลิง (เสาไฟคืนชีพ) ----------
function healFx(g, e, t, dur, seed, lowQ) {
  const A = bodyAt(e.x, e.y, e.size || 1);
  const q = t / dur, a = Math.sin(Math.PI * clamp01(q)) * 1.05;
  g.globalCompositeOperation = "lighter";
  // วงไฟบนพื้น
  const rr = A.s * (0.35 + 0.25 * easeOut(clamp01(q * 2)));
  g.strokeStyle = rgba(GOLD, a * 0.7); g.lineWidth = Math.max(1, A.s * 0.04);
  g.beginPath(); g.ellipse(A.bx, A.by, rr, rr * 0.5, 0, 0, TAU); g.stroke();
  // เสาไฟอ่อน
  const H = A.s * 1.5 * easeOut(clamp01(q * 2.2));
  const gr = g.createLinearGradient(A.bx, A.by, A.bx, A.by - H);
  gr.addColorStop(0, rgba(GOLD, a * 0.55)); gr.addColorStop(0.5, rgba(FLAME, a * 0.3)); gr.addColorStop(1, rgba(CRIMSON, 0));
  g.fillStyle = gr;
  g.beginPath(); g.ellipse(A.bx, A.by - H / 2, A.s * 0.28, H / 2, 0, 0, TAU); g.fill();
  // ขนนกเพลิงหมุนขึ้นรอบตัว
  const nF = lowQ ? 4 : 8;
  for (let i = 0; i < nF; i++) {
    const h = hash(seed + i * 4.1), ph = (q * 1.4 + h) % 1;
    const ang = h * TAU + q * 5.5, r = A.s * (0.3 + 0.12 * Math.sin(ph * 6));
    const fx = A.bx + Math.cos(ang) * r, fy = A.by - ph * A.s * 1.5 + Math.sin(ang) * r * 0.4;
    feather(g, fx, fy, -Math.PI / 2 + Math.cos(ang) * 0.6, A.s * 0.22, A.s * 0.05, 0.2, a * (1 - ph) * 0.95, 1);
  }
  glow(g, A.bx, A.hy, A.s * 0.5, FLAME, a * 0.35, GOLD);
  if (!lowQ) embers(g, A.bx, A.by, A.s * 0.45, 10, t, a, seed);
  g.globalCompositeOperation = "source-over";
}

// ---------- หางนกเพลิง (ตามคลิป joshua_skill3): ขนหางนกยาว (แกนขน + ขนฝอยละเอียดแผ่สองข้าง) สีแดงเข้ม ออกจากหลัง/เอว แผ่ไปสองข้าง ----------
//  ผู้ใช้ 2026-11-23: แบบริบบิ้นส่ายดูเหมือนหนวดปลาหมึก → เปลี่ยนเป็นขนนกจริง พลิ้วเบาๆ ช้าๆ ปลายขนแตกเป็นฝอย + ไฟ
//  แต่ละเส้น: [มุมบนจอ (rad · 0 = ขวา), ความยาว (×ช่อง), ครึ่งความกว้างขน (×ช่อง), เฟส]
const TAILS = [
  [Math.PI + 0.14, 2.0, 0.2, 0.0], [-0.14, 2.0, 0.2, 1.7],        // คู่ยาวแผ่ซ้าย/ขวา
  [Math.PI - 0.3, 1.6, 0.17, 2.9], [0.3, 1.6, 0.17, 4.1],         // คู่เฉียงลง
  [Math.PI + 0.55, 1.3, 0.15, 5.3], [-0.55, 1.3, 0.15, 0.8],      // คู่เฉียงขึ้น
  [Math.PI - 0.62, 1.05, 0.13, 3.3], [0.62, 1.05, 0.13, 2.2],     // คู่สั้นล่าง
];
// ขนหาง 1 เส้น จาก (x0, y0) · ang/len/w ในหน่วยพิกเซล · grow 0..1 = ยาวออก · sway = มุมพลิ้ว (rad) · t = เวลา (ms)
function plume(g, x0, y0, ang, len, w, grow, sway, t, ph, a, lowQ) {
  if (a <= 0 || grow <= 0) return;
  const N = lowQ ? 10 : 20, L = len * grow;
  // แกนขน: โค้งนุ่ม (งอทางเดียว + ปลายตก) — พลิ้วทั้งเส้นด้วยมุมเล็กๆ ไม่ส่ายเป็นคลื่น
  const bend = 0.22 + sway;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, aa = ang + bend * u * (Math.cos(ang) < 0 ? -1 : 1);
    const prev = pts[i - 1];
    const step = L / N;
    const x = prev ? prev.x + Math.cos(aa) * step : x0, y = prev ? prev.y + Math.sin(aa) * step + u * step * 0.18 : y0;
    pts.push({ x, y });
  }
  const tan = (i) => {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(N, i + 1)];
    const dx = p1.x - p0.x, dy = p1.y - p0.y, l = Math.hypot(dx, dy) || 1;
    return [dx / l, dy / l];
  };
  // ความกว้างขน: แคบที่โคน → กว้างสุดราว 65% → เรียวที่ปลาย
  const hw = (u) => w * Math.sin(Math.PI * Math.min(1, u * 0.78 + 0.08)) ** 0.8 * (u < 0.12 ? u / 0.12 : 1);
  // 1) เนื้อขน (โปร่ง) — ให้รูปทรงขนนก
  const lft = [], rgt = [];
  for (let i = 0; i <= N; i++) {
    const [tx, ty] = tan(i), h = hw(i / N);
    lft.push([pts[i].x - ty * h, pts[i].y + tx * h]); rgt.push([pts[i].x + ty * h, pts[i].y - tx * h]);
  }
  const end = pts[N];
  const gr = g.createLinearGradient(x0, y0, end.x, end.y);
  gr.addColorStop(0, rgba(FLAME, a * 0.75));
  gr.addColorStop(0.3, rgba(CRIMSON, a * 0.6));
  gr.addColorStop(0.85, rgba(DEEP, a * 0.35));
  gr.addColorStop(1, rgba(DEEP, 0));
  g.fillStyle = gr;
  g.beginPath();
  lft.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y)));
  for (let k = rgt.length - 1; k >= 0; k--) g.lineTo(rgt[k][0], rgt[k][1]);
  g.closePath(); g.fill();
  // 2) ขนฝอย: เส้นเฉียงไปทางปลายขน ทั้งสองข้างของแกน · ปลายฝอยสีอ่อน · ขนฝอยพลิ้วตามเวลาเล็กน้อย
  const barbs = lowQ ? 2 : 4; // ต่อ 1 ช่วงแกน ต่อข้าง
  const th = 0.62; // มุมขนฝอยจากแกน
  g.lineCap = "round";
  for (const [col, lw, aa, k0] of [[CRIMSON, 0.09, 0.9, 0], ["255,120,110", 0.05, 0.55, 0.5]]) {
    g.strokeStyle = rgba(col, a * aa); g.lineWidth = Math.max(0.6, w * lw);
    g.beginPath();
    for (let i = 1; i < N; i++) {
      const [tx, ty] = tan(i);
      for (let b = 0; b < barbs; b++) {
        const f = (b + k0) / barbs, u = (i + f) / N;
        const bx = pts[i].x + (pts[i + 1].x - pts[i].x) * f, by = pts[i].y + (pts[i + 1].y - pts[i].y) * f;
        const h = hw(u) * (0.9 + 0.25 * hash(i * 13.1 + b * 3.7 + ph));
        const flick = REDUCED ? 0 : Math.sin(t / 240 + i * 0.7 + b + ph) * 0.12;
        for (const side of [-1, 1]) {
          const c = Math.cos(th + flick * side), sn = Math.sin(th + flick * side) * side;
          const dx = tx * c - ty * sn, dy = ty * c + tx * sn;
          const ex = bx + dx * h * 1.25, ey = by + dy * h * 1.25;
          g.moveTo(bx, by);
          g.quadraticCurveTo(bx + dx * h * 0.7 + tx * h * 0.15, by + dy * h * 0.7 + ty * h * 0.15, ex, ey);
        }
      }
    }
    g.stroke();
  }
  // 3) แกนขน: เส้นสว่างบาง
  g.strokeStyle = rgba("255,200,170", a * 0.7); g.lineWidth = Math.max(0.8, w * 0.07);
  g.beginPath(); pts.forEach((q, k) => (k ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y))); g.stroke();
  // 4) ปลายขน: เปลวไฟเล็กๆ + ประกาย (เรืองแสง)
  if (!lowQ) {
    const prevOp = g.globalCompositeOperation;
    g.globalCompositeOperation = "lighter";
    glow(g, end.x, end.y, w * 0.9, FLAME, a * 0.35, GOLD);
    for (let k = 0; k < 3; k++) {
      const q = ((t / 900 + k / 3 + ph) % 1);
      const [tx, ty] = tan(N);
      g.fillStyle = rgba(GOLD, a * (1 - q) * 0.9);
      g.beginPath(); g.arc(end.x + tx * w * 2 * q + (hash(k + ph) - 0.5) * w, end.y + ty * w * 2 * q - q * w * 1.5, Math.max(0.8, w * 0.1 * (1 - q)), 0, TAU); g.fill();
    }
    g.globalCompositeOperation = prevOp;
  }
}
// หางทั้งชุด รอบจุดเอว (x, y) · s = ขนาดช่อง (px) · grow 0..1 · t = เวลา (ms)
//  ขนหางวาดแบบทึบ (source-over) ให้แดงเข้มแบบในคลิปแม้บนพื้นสว่าง · เรืองแสงปลายขนเท่านั้นที่ lighter
function tails(g, x, y, s, grow, t, a, lowQ, K = 1) {
  const prev = g.globalCompositeOperation;
  g.globalCompositeOperation = "source-over";
  // วาดคู่สั้น/หลังก่อน แล้วคู่ยาวทับ (ซ้อนชั้นแบบขนหางจริง)
  for (let k = TAILS.length - 1; k >= 0; k--) {
    if (lowQ && k >= 4) continue;
    const [ang, len, w, ph] = TAILS[k];
    const sway = REDUCED ? 0 : Math.sin(t / 1100 + ph) * 0.07; // พลิ้วช้าๆ ทั้งเส้น
    plume(g, x, y, ang, s * len * K, s * w * K, grow, sway, t, ph, a, lowQ);
  }
  g.globalCompositeOperation = prev;
}

// ---------- สวมร่างนกเพลิง (หลังคลิป): หางนกเพลิงสะบัดออก + วงไฟแผ่ไปถึงระยะเดิน ----------
function phoenixFx(g, e, t, dur, seed, lowQ) {
  const A = bodyAt(e.x, e.y, e.size || 1);
  const q = t / dur;
  const a = q < 0.7 ? 1 : 1 - (q - 0.7) / 0.3;
  g.globalCompositeOperation = "lighter";
  // วงไฟบนพื้นแผ่ออกถึงระยะเดิน 4 ช่อง
  const rr = A.s * (0.3 + 4 * easeOut(clamp01(t / 1000)));
  const ra = a * (1 - clamp01((t - 600) / 900));
  g.strokeStyle = rgba(FLAME, ra); g.lineWidth = Math.max(1, A.s * 0.09);
  g.beginPath(); g.ellipse(A.bx, A.by, rr, rr * 0.5, 0, 0, TAU); g.stroke();
  g.strokeStyle = rgba(GOLD, ra * 0.8); g.lineWidth = Math.max(1, A.s * 0.03);
  g.beginPath(); g.ellipse(A.bx, A.by, rr * 0.97, rr * 0.485, 0, 0, TAU); g.stroke();
  // หางสะบัดออก (ยาวเกินปกติแล้วหดเข้าขนาดออร่า)
  const grow = REDUCED ? 1 : easeOut(clamp01(t / 450)) * (1 + 0.35 * (1 - clamp01((t - 450) / 900)));
  tails(g, A.bx, A.by - A.s * 0.3 * A.K, A.s, grow, t, a, lowQ, A.K * 1.1);
  glow(g, A.bx, A.hy, A.s * (0.5 + 0.4 * (1 - clamp01(t / 500))), CRIMSON, a * 0.8, GOLD);
  if (!lowQ) embers(g, A.bx, A.by, A.s * 1.2, 22, t, a, seed, 1.2);
  g.globalCompositeOperation = "source-over";
}

// ---------- ลุกไหม้สวนกลับ ----------
function singeFx(g, e, t, dur, seed, lowQ) {
  const A = bodyAt(e.x, e.y, e.size || 1);
  const q = t / dur, a = 1 - q;
  g.globalCompositeOperation = "lighter";
  glow(g, A.bx, A.hy, A.s * 0.55 * easeOut(clamp01(q * 3)), CRIMSON, a * 0.8, GOLD);
  for (let k = 0; k < (lowQ ? 2 : 4); k++) {
    const h = hash(seed + k * 5);
    flame(g, A.bx + (h - 0.5) * A.s * 0.5, A.by, A.s * 0.1, A.s * (0.5 + 0.4 * h) * easeOut(clamp01(q * 4)), Math.sin(t / 80 + k) * 0.3, a);
  }
  g.globalCompositeOperation = "source-over";
}

export function joshuaFx(g, e, now, lowQ) {
  const dur = e.dur || JOSHUA_FX_DUR[e.kind];
  const t = now - e.t0;
  if (t < 0 || t > dur) return;
  const seed = ((e.t0 | 0) % 977) / 97;
  g.save();
  if (e.kind === "joshuaCone") coneFx(g, e, t, dur, seed, lowQ);
  else if (e.kind === "joshuaHeal") healFx(g, e, t, dur, seed, lowQ);
  else if (e.kind === "joshuaPhoenix") phoenixFx(g, e, t, dur, seed, lowQ);
  else if (e.kind === "joshuaSinge") singeFx(g, e, t, dur, seed, lowQ);
  g.restore();
}

// ---------- ออร่าค้าง: ร่างนกเพลิง ----------
//  x, y = กลางช่อง (หน่วยช่อง) · หลังหมาก = หางนกเพลิงพลิ้ว + ไฟลุกที่เท้า · หน้าหมาก = สะเก็ดไฟลอย
export function joshuaAuraBack(g, x, y, now, lowQ, alpha = 1) {
  const [bx, by, s] = P(x, y);
  g.save(); g.globalCompositeOperation = "lighter";
  glow(g, bx, by, s * 0.6, CRIMSON, 0.3 * alpha, FLAME);
  tails(g, bx, by - s * 0.42, s, 1, now, 0.92 * alpha, lowQ);
  for (let k = 0; k < (lowQ ? 2 : 4); k++) {
    const h = hash(k * 3.3 + 1.1);
    flame(g, bx + (h - 0.5) * s * 0.7, by + s * 0.08, s * 0.07, s * (0.22 + 0.12 * h) * (0.85 + 0.15 * Math.sin(now / 110 + k * 2)), Math.sin(now / 160 + k) * 0.3, 0.55 * alpha);
  }
  g.restore();
}
export function joshuaAuraFront(g, x, y, now, lowQ, alpha = 1) {
  if (lowQ) return;
  const [bx, by, s] = P(x, y);
  g.save(); g.globalCompositeOperation = "lighter";
  embers(g, bx, by, s * 0.5, 8, now, 0.85 * alpha, 9.1);
  g.restore();
}
