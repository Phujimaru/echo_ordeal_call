// เอฟเฟกต์บนกระดานของโจชัว รอสฟิลด์ (characters/joshua_rosfield.js · GRID_PLAN §7.41)
//  อ้างอิงต้นฉบับ (Final Fantasy XVI — Dominant แห่งนกเพลิง): ไฟสีแดงเข้มอมทอง · ขนนกเพลิง · Rising Flames (ปีกไฟกวาด) · Flames of Rebirth (เสาไฟคืนชีพ)
//  เหตุการณ์จาก server (socket "joshuaFx" → useCharSocketFx):
//   joshuaCone     เพื่อปกป้องทุกคน: ไฟรวมที่มือ → ตรงจังหวะ JOSHUA_T.cone ปีกเพลิงกวาดกรวย + เปลวไฟลุกทุกช่องจากใกล้ไปไกล
//   joshuaHeal     พรของนกเพลิง: เสาไฟคืนชีพอ่อนๆ บนตัวผู้รับ + ขนนกเพลิงหมุนขึ้น
//   joshuaPhoenix  สวมร่างนกเพลิง (หลังคลิป): หางนกเพลิงสะบัดออก + วงไฟแผ่ถึงระยะเดิน
//   joshuaSinge    ศัตรูโจมตีร่างนกเพลิง: ไฟลุกใส่ผู้โจมตี
//  ออร่าค้าง (drawUnit — units[].aura "joshuaPhoenix"): ขนหางนกเพลิงไม่สมมาตร (กลุ่มยาวลากไปซ้าย-หลังแล้วห้อยลง) หลังหมาก (ตามคลิป joshua_skill3) + ไฟที่เท้า + สะเก็ดไฟหน้าหมาก
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
export const JOSHUA_T = { cone: 550, ignite: 2200 };
// ท่าตีปกติร่างนก (ฮุค attackStyle → STYLE_MS/STYLE_HIT ใน boardFxBasic.js): ปีกเงื้อ → ตีลง (ปะทะที่ 42%) → คลื่นเพลิงกวาดกรวย
export const JOSHUA_MS = { joshuaBirdStrike: 1700 };
export const JOSHUA_HIT_P = { joshuaBirdStrike: 0.42 };
export const JOSHUA_FX_DUR = { joshuaCone: 2100, joshuaHeal: 1700, joshuaPhoenix: 2200, joshuaSinge: 800, joshuaIgnite: 2600, joshuaBirdRise: 5200, joshuaHellsong: 4200, ...JOSHUA_MS };
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

// ---------- หางนกเพลิง (ตามคลิป joshua_skill3 + ภาพนกเพลิงที่ผู้ใช้ส่ง) ----------
//  ผู้ใช้ 2026-11-23: ริบบิ้น = หนวดปลาหมึก · พัดขนนกสมมาตร = ไม่สวย → ศึกษาภาพ/คลิปใหม่:
//   หางไม่สมมาตร — ขนยาวกลุ่มหลักลากไปทางเดียว (หลัง-ซ้าย) แล้วห้อยลงแบบผ้าตามแรงโน้มถ่วง ยาวไม่เท่ากัน บางเส้นโค้งตัว S
//   ขอบขนหยักแตกเป็นริ้ว · ปลายแตกเป็นสะเก็ดไฟชมพูส้ม · แดงเข้มอมม่วงแดง มีประกายทอง · อีกฝั่งมีแค่ขนสั้นไม่กี่เส้น
//  แต่ละเส้น: [มุมเริ่ม (rad บนจอ · 0 = ขวา), ความยาว (×ช่อง), ครึ่งความกว้าง (×ช่อง), โค้ง (rad ตลอดเส้น · บวก = ตามเข็ม), ตัว S, เฟส]
const TAILS = [
  // กลุ่มหลัก: แผ่เป็นพัดไปทางซ้าย-หลัง (บน → ล่าง) แล้วโค้งห้อยลง
  [Math.PI + 0.95, 2.3, 0.11, -0.75, 0.35, 0.0],
  [Math.PI + 0.55, 2.8, 0.12, -0.85, 0.4, 1.3],
  [Math.PI + 0.2, 2.55, 0.12, -0.7, 0.3, 2.6],
  [Math.PI - 0.15, 2.1, 0.11, -0.55, 0.25, 3.9],
  [Math.PI - 0.5, 1.6, 0.1, -0.4, 0.2, 5.1],
  // อีกฝั่ง: ขนสั้น 3 เส้น
  [-0.75, 1.15, 0.09, 0.6, 0.25, 2.1],
  [-0.3, 0.95, 0.085, 0.55, 0.2, 4.4],
  [0.15, 0.75, 0.08, 0.5, 0.2, 3.2],
]
const MAGENTA = "232,40,96", ROSE = "255,128,150";
// ขนหาง 1 เส้น: เส้นกลางโค้ง + ห้อยลง · ขอบหยักเป็นริ้ว · ปลายแตกเป็นสะเก็ดไฟ
function plume(g, x0, y0, ang, len, w, curl, sCurve, grow, sway, wave, t, ph, a, lowQ) {
  if (a <= 0 || grow <= 0) return;
  const N = lowQ ? 12 : 26, L = len * grow, step = L / N;
  const pts = [{ x: x0, y: y0 }];
  for (let i = 1; i <= N; i++) {
    const u = i / N;
    // มุม: โค้งสะสม + ตัว S (กลับทิศกลางเส้น) + พลิ้วที่ปลาย
    const aa = ang + curl * u + sCurve * Math.sin(u * Math.PI * 1.6) * (curl < 0 ? -1 : 1) + sway * u * u;
    const p = pts[i - 1];
    pts.push({ x: p.x + Math.cos(aa) * step, y: p.y + Math.sin(aa) * step + u * u * step * 0.55 }); // ห้อยลงแรงขึ้นที่ปลาย
  }
  // พลิ้วแบบคลื่นวิ่งไปตามเส้น (ผู้ใช้ชอบการพลิ้วของแบบริบบิ้นเดิม) — แรงขึ้นที่ปลาย · โคนนิ่ง
  if (!REDUCED) {
    const base = pts.map((q) => ({ ...q }));
    for (let i = 1; i <= N; i++) {
      const u = i / N;
      const p0 = base[i - 1], p1 = base[Math.min(N, i + 1)];
      const dx = p1.x - p0.x, dy = p1.y - p0.y, l = Math.hypot(dx, dy) || 1;
      const off = Math.sin(u * 5.2 - wave) * w * 1.6 * u;
      pts[i] = { x: base[i].x - (dy / l) * off, y: base[i].y + (dx / l) * off };
    }
  }
  const tan = (i) => {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(N, i + 1)];
    const dx = p1.x - p0.x, dy = p1.y - p0.y, l = Math.hypot(dx, dy) || 1;
    return [dx / l, dy / l];
  };
  // ความกว้าง: โคนเล็ก → พองช่วง 30–60% → เรียวยาว · ขอบหยัก (ริ้วขน) ด้วย hash สลับข้าง
  const hw = (u) => w * Math.pow(Math.sin(Math.PI * Math.min(1, 0.06 + u * 0.92)), 0.7) * (u < 0.1 ? 0.35 + u * 6.5 : 1);
  const jag = (i, side) => 1 + 0.55 * (hash(i * 7.3 + side * 3.1 + ph * 11) - 0.35) * (i % 2 ? 1 : -0.6);
  const lft = [], rgt = [];
  for (let i = 0; i <= N; i++) {
    const [tx, ty] = tan(i), h = hw(i / N);
    const hl = h * jag(i, 1), hr = h * jag(i, -1);
    lft.push([pts[i].x - ty * hl, pts[i].y + tx * hl]);
    rgt.push([pts[i].x + ty * hr, pts[i].y - tx * hr]);
  }
  const end = pts[N];
  const gr = g.createLinearGradient(x0, y0, end.x, end.y);
  gr.addColorStop(0, rgba(FLAME, a));
  gr.addColorStop(0.12, rgba(CRIMSON, a));
  gr.addColorStop(0.6, rgba("196,16,52", a * 0.97));
  gr.addColorStop(0.88, rgba(MAGENTA, a * 0.7));
  gr.addColorStop(1, rgba(ROSE, 0));
  g.fillStyle = gr;
  g.beginPath();
  lft.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y)));
  for (let k = rgt.length - 1; k >= 0; k--) g.lineTo(rgt[k][0], rgt[k][1]);
  g.closePath(); g.fill();
  // ขอบเข้ม — แยกขนแต่ละเส้นออกจากกัน
  g.strokeStyle = rgba(DEEP, a * 0.75); g.lineWidth = Math.max(0.7, w * 0.09); g.lineJoin = "round";
  g.stroke();
  if (lowQ) return;
  // ริ้วขน: เส้นบางสีชมพูอ่อนตามความยาวเฉียงออกขอบ (ลายเส้นแบบภาพวาด) + เส้นกลางสว่างช่วงโคน
  g.lineCap = "round";
  g.strokeStyle = rgba(ROSE, a * 0.45); g.lineWidth = Math.max(0.6, w * 0.07);
  g.beginPath();
  for (let i = 2; i < N - 2; i += 2) {
    const [tx, ty] = tan(i), h = hw(i / N);
    for (const side of [-1, 1]) {
      const k = 0.35 + 0.5 * hash(i * 3.3 + side + ph);
      g.moveTo(pts[i].x - ty * h * 0.15 * side, pts[i].y + tx * h * 0.15 * side);
      g.lineTo(pts[i].x + tx * step * 2.2 - ty * h * k * side, pts[i].y + ty * step * 2.2 + tx * h * k * side);
    }
  }
  g.stroke();
  g.strokeStyle = rgba("255,215,190", a * 0.55); g.lineWidth = Math.max(0.7, w * 0.08);
  g.beginPath(); for (let k = 0; k <= Math.floor(N * 0.55); k++) (k ? g.lineTo(pts[k].x, pts[k].y) : g.moveTo(pts[k].x, pts[k].y)); g.stroke();
  // ปลายแตกเป็นสะเก็ดไฟ (หลุดออกจากปลาย ลอยไปตามทิศหาง + ขึ้นเล็กน้อย)
  const prevOp = g.globalCompositeOperation;
  g.globalCompositeOperation = "lighter";
  const [ex, ey] = tan(N);
  for (let k = 0; k < 5; k++) {
    const q = (t / 1100 + k / 5 + ph * 0.37) % 1;
    const sz = Math.max(0.8, w * (0.22 - 0.16 * q));
    const px = end.x + ex * w * 3.2 * q + (hash(k * 5.1 + ph) - 0.5) * w * 1.6;
    const py = end.y + ey * w * 3.2 * q - q * w * 2.2;
    g.fillStyle = rgba(k % 2 ? ROSE : GOLD, a * (1 - q) * 0.85);
    g.beginPath(); g.ellipse(px, py, sz * 1.6, sz * 0.7, Math.atan2(ey, ex), 0, TAU); g.fill();
  }
  glow(g, pts[Math.floor(N * 0.2)].x, pts[Math.floor(N * 0.2)].y, w * 1.2, FLAME, a * 0.25, GOLD);
  g.globalCompositeOperation = prevOp;
}
// หางทั้งชุด รอบจุดเอว (x, y) · s = ขนาดช่อง (px) · grow 0..1 · t = เวลา (ms)
//  ขนหางวาดแบบทึบ (source-over) ให้แดงเข้มแบบในคลิปแม้บนพื้นสว่าง · เรืองแสงปลายขนเท่านั้นที่ lighter
function tails(g, x, y, s, grow, t, a, lowQ, K = 1) {
  const prev = g.globalCompositeOperation;
  g.globalCompositeOperation = "source-over";
  // วาดฝั่งขนสั้นก่อน แล้วกลุ่มหลักจากสั้นไปยาว (เส้นยาวอยู่บนสุด)
  for (let k = TAILS.length - 1; k >= 0; k--) {
    if (lowQ && k % 2) continue;
    const [ang, len, w, curl, sC, ph] = TAILS[k];
    const sway = REDUCED ? 0 : Math.sin(t / 700 + ph) * 0.1; // ทั้งเส้นแกว่งช้าๆ
    plume(g, x, y, ang, s * len * K, s * w * K, curl, sC, grow, sway, t / 260 + ph, t, ph, a, lowQ);
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

// ---------- นกเพลิงอมตะ: ระเบิดเพลิงก่อนคลิปกำเนิดนกไฟ (ผู้ใช้ 2026-11-23) ----------
//  จอมืดลงทั้งจอ → เปลวไฟรวมตัวที่ร่าง → ระเบิดเพลิงรุนแรง (เสาไฟ + เปลวลุกรอบวง + คลื่นไฟบนพื้น) โหมหนักขึ้นเรื่อยๆ
//  → ท้ายฉากแสงขาวร้อนจ้าแล้วตัดเข้าวีดีโอ (JOSHUA_T.ignite) · ภาพอย่างเดียว ไม่มีเสียง (กฎผู้ใช้: ห้ามเสียงตัดหน้าวีดีโอ)
function igniteFx(g, e, t, dur, seed, lowQ) {
  const A = bodyAt(e.x, e.y, e.size || 1);
  const beat = JOSHUA_T.ignite;
  const q = clamp01(t / beat);
  // 1) จอมืด (ทั้งจอ — วาดนอกพิกัดกล้อง)
  const dark = Math.min(0.78, easeOut(clamp01(t / 700)) * 0.78) * (t > beat ? 1 - clamp01((t - beat) / 350) : 1);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = `rgba(8,2,4,${dark})`; g.fillRect(0, 0, g.canvas.width, g.canvas.height);
  g.restore();
  g.globalCompositeOperation = "lighter";
  // 2) เปลวไฟรวมตัว (0–40%) → ระเบิด (40%+) ใหญ่ขึ้นเรื่อยๆ
  const burst = clamp01((q - 0.35) / 0.65);
  const R = A.s * (0.6 + 3.2 * easeOut(burst));
  glow(g, A.bx, A.hy, A.s * (0.5 + 1.6 * q), CRIMSON, 0.85, GOLD);
  glow(g, A.bx, A.by, R * 1.1, FLAME, 0.55 * (0.4 + burst), GOLD);
  // วงไฟบนพื้นแผ่ออก (หลายชั้น)
  for (let k = 0; k < 3; k++) {
    const rr = R * (0.55 + 0.25 * k) * (0.9 + 0.1 * Math.sin(t / 90 + k));
    g.strokeStyle = rgba(k ? FLAME : GOLD, (0.7 - 0.18 * k) * (0.3 + burst)); g.lineWidth = Math.max(1, A.s * (0.12 - 0.03 * k));
    g.beginPath(); g.ellipse(A.bx, A.by, rr, rr * 0.5, 0, 0, TAU); g.stroke();
  }
  // เสาไฟพุ่งขึ้นจากร่าง
  const colH = A.s * (1 + 5.5 * easeOut(burst));
  const cg = g.createLinearGradient(A.bx, A.by, A.bx, A.by - colH);
  cg.addColorStop(0, rgba(CORE, 0.9)); cg.addColorStop(0.3, rgba(GOLD, 0.8)); cg.addColorStop(0.7, rgba(FLAME, 0.45)); cg.addColorStop(1, rgba(CRIMSON, 0));
  g.fillStyle = cg;
  const cw = A.s * (0.35 + 0.5 * burst);
  g.beginPath(); g.ellipse(A.bx, A.by - colH / 2, cw, colH / 2, 0, 0, TAU); g.fill();
  // เปลวไฟลุกโหมรอบวง (ทึบ ให้เห็นชัดบนพื้นสว่างด้วย)
  g.globalCompositeOperation = "source-over";
  const nF = lowQ ? 10 : 26;
  for (let i = 0; i < nF; i++) {
    const h = hash(seed + i * 3.7), ang = (i / nF) * TAU + h;
    const rr = R * (0.25 + 0.75 * hash(seed + i * 9.1));
    const fx0 = A.bx + Math.cos(ang) * rr, fy0 = A.by + Math.sin(ang) * rr * 0.5;
    const grow = clamp01((q - 0.15 - h * 0.3) / 0.35);
    flame(g, fx0, fy0, A.s * (0.14 + 0.12 * h) * (1 + burst), A.s * (0.6 + 1.4 * h) * grow * (0.85 + 0.15 * Math.sin(t / 70 + i)), Math.sin(t / 110 + i) * 0.4, 0.95 * grow);
  }
  g.globalCompositeOperation = "lighter";
  if (!lowQ) embers(g, A.bx, A.by, R, 40, t, 0.95, seed, 1.6);
  // 3) ท้ายฉาก: แสงขาวร้อนจ้า → ตัดเข้าวีดีโอ
  const white = clamp01((t - beat * 0.82) / (beat * 0.18)) * (t > beat ? 1 - clamp01((t - beat) / 350) : 1);
  if (white > 0) {
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = `rgba(255,236,200,${white * 0.85})`; g.fillRect(0, 0, g.canvas.width, g.canvas.height);
    g.restore();
  }
  g.globalCompositeOperation = "source-over";
}

// ---------- นกฟีนิกซ์ปรากฏตัว (หลังคลิปกำเนิดนกไฟ · ผู้ใช้ 2026-11-23: ร้อน ไฟลุก อึดอัด มืดลง ละอองไฟ) ----------
//  ทั้งจอ: มืดลงโทนแดงเข้ม → ขอบจอวงไฟแดงส้มเต้นบีบเข้ามา · ไอร้อนพลิ้วลอยขึ้น · ละอองไฟลอยทั่วจอ · ค้าง ~4 วิแล้วจาง
//  ที่ตัวนก: แสงวาบ + วงไฟแผ่ · เสียงมาจาก server หลังคลิป (joshua_phoenix) — ฉากนี้ภาพอย่างเดียว
function birdRiseFx(g, e, t, dur, seed, lowQ) {
  const A = bodyAt(e.x, e.y, e.size || 1);
  const inA = easeOut(clamp01(t / 500)), outA = 1 - clamp01((t - (dur - 1200)) / 1200), k = inA * outA;
  const pulse = REDUCED ? 0.5 : 0.5 + 0.5 * Math.sin(t / 260);
  const W = g.canvas.width, H = g.canvas.height;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  // 1) มืดลง โทนแดงเข้มร้อน
  g.fillStyle = `rgba(28,3,4,${0.55 * k})`; g.fillRect(0, 0, W, H);
  // 2) ขอบจอวงไฟบีบเข้ามา (อึดอัด) — เต้นตามความร้อน
  const R0 = Math.min(W, H) * (0.32 - 0.05 * pulse), R1 = Math.hypot(W, H) * 0.62;
  const vg = g.createRadialGradient(W / 2, H / 2, R0, W / 2, H / 2, R1);
  vg.addColorStop(0, "rgba(120,10,8,0)");
  vg.addColorStop(0.55, `rgba(150,22,10,${0.35 * k})`);
  vg.addColorStop(0.85, `rgba(210,60,14,${(0.5 + 0.15 * pulse) * k})`);
  vg.addColorStop(1, `rgba(255,120,30,${(0.62 + 0.2 * pulse) * k})`);
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = "lighter";
  // 3) ไอร้อนพลิ้วลอยขึ้น (เส้นคลื่นจางๆ ทั่วจอ)
  if (!lowQ && !REDUCED) {
    g.lineWidth = Math.max(1, H * 0.004);
    for (let i = 0; i < 14; i++) {
      const h1 = hash(seed + i * 4.3), x0 = h1 * W, life = 2200 + 1400 * hash(seed + i * 7.9);
      const q = ((t + h1 * life) % life) / life, y0 = H * (1.05 - q * 1.2);
      g.strokeStyle = `rgba(255,140,60,${0.18 * k * Math.sin(Math.PI * q)})`;
      g.beginPath();
      for (let j = 0; j <= 12; j++) { const yy = y0 - j * H * 0.02, xx = x0 + Math.sin(j * 0.9 + t / 300 + i) * W * 0.012; j ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }
      g.stroke();
    }
  }
  // 4) ละอองไฟลอยทั่วจอ
  const nE = lowQ ? 40 : 110;
  for (let i = 0; i < nE; i++) {
    const h1 = hash(seed + i * 1.7), h2 = hash(seed + i * 3.1), h3 = hash(seed + i * 5.9);
    const life = 1800 + 2600 * h3, q = ((t + h1 * life) % life) / life;
    const x = h2 * W + Math.sin(q * 7 + i) * W * 0.02, y = H * (1.02 - q * 1.1);
    const r = Math.max(1, H * (0.002 + 0.004 * h1) * (1 - q * 0.6));
    g.fillStyle = `rgba(${q < 0.5 ? GOLD : FLAME},${0.9 * k * Math.sin(Math.PI * q)})`;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  g.restore();
  // 5) ที่ตัวนก: แสงวาบ + วงไฟแผ่
  g.globalCompositeOperation = "lighter";
  const fl = 1 - clamp01(t / 900);
  glow(g, A.bx, A.hy, A.s * (1 + 3 * (1 - fl)), CRIMSON, 0.9 * fl + 0.25 * k, GOLD);
  const rr = A.s * (0.5 + 4.5 * easeOut(clamp01(t / 1300)));
  g.strokeStyle = rgba(FLAME, 0.8 * (1 - clamp01(t / 1500))); g.lineWidth = Math.max(1, A.s * 0.1);
  g.beginPath(); g.ellipse(A.bx, A.by, rr, rr * 0.5, 0, 0, TAU); g.stroke();
  g.globalCompositeOperation = "source-over";
}

// ---------- ตีปกติร่างนก: ปีกตีลงส่งคลื่นเพลิงกวาดกรวย 3 ----------
//  e.x/y = มุมตัวนก (3×3) · e.to = เป้า · e.lane = ช่องในกรวย (server laneVictims) · ปะทะ = JOSHUA_HIT_P
function birdStrikeFx(g, e, t, dur, seed, lowQ) {
  const n = Math.max(1, e.size | 0);
  const cx = e.x + n / 2, cy = e.y + n / 2;
  const tiles = Array.isArray(e.lane) && e.lane.length ? e.lane : e.to ? [e.to] : [];
  const hitT = dur * JOSHUA_HIT_P.joshuaBirdStrike;
  const [bx, by0, s] = P(cx, cy);
  const by = by0 - s * 2.4; // ระดับตัวนก (ลอยสูง — drawPhoenixBird)
  if (e.to && e.by) birdFace.set(e.by, (P(e.to.x + 0.5, e.to.y + 0.5)[0] >= bx) ? 1 : -1); // หันหน้าไปทางเป้า
  let mx = 0, my = 0;
  for (const c of tiles) { mx += c.x + 0.5; my += c.y + 0.5; }
  if (tiles.length) { mx /= tiles.length; my /= tiles.length; }
  const [tx, ty] = P(mx, my);
  const dirA = Math.atan2(ty - by, tx - bx);
  g.globalCompositeOperation = "lighter";
  // 1) เงื้อปีก: ไฟรวมที่อกนก + ประกายไฟหมุนเข้า
  if (t < hitT + 120) {
    const c = clamp01(t / hitT);
    glow(g, bx, by, s * (0.8 + 1.4 * c), CRIMSON, 0.9 * c, GOLD);
    if (!lowQ) for (let i = 0; i < 12; i++) {
      const ang = hash(seed + i) * TAU + t / 140, r = s * 2 * (1 - c) + s * 0.2;
      g.fillStyle = rgba(GOLD, 0.85 * c);
      g.beginPath(); g.arc(bx + Math.cos(ang) * r, by + Math.sin(ang) * r * 0.7, Math.max(1, s * 0.05), 0, TAU); g.fill();
    }
  }
  const wt = t - hitT;
  if (wt < 0) { g.globalCompositeOperation = "source-over"; return; }
  const after = dur - hitT, fade = 1 - clamp01((wt - after * 0.5) / (after * 0.5));
  // 2) แสงวาบตอนตีลง + พัดขนนกเพลิงขนาดใหญ่กวาดไปตามทิศ
  glow(g, bx, by, s * 3.2 * (1 - clamp01(wt / 300)), GOLD, 0.9 * (1 - clamp01(wt / 300)), CORE);
  const reach = Math.hypot(tx - bx, ty - by) * 1.35 * easeOut(clamp01(wt / 380));
  g.globalCompositeOperation = "source-over";
  if (!REDUCED) {
    const nW = lowQ ? 9 : 17, wa = (1 - clamp01((wt - 280) / 500)) * 0.95;
    for (let i = 0; i < nW; i++) {
      const u = i / (nW - 1) - 0.5;
      feather(g, bx, by, dirA + u * 1.15, reach * (0.78 + 0.22 * Math.cos(u * Math.PI)), s * 0.32, u * 0.3, wa, 1 - Math.abs(u));
    }
  }
  // 3) คลื่นเพลิงลุกทุกช่องในกรวย ไล่จากใกล้ไปไกล
  tiles.forEach((c, i) => {
    const d = Math.hypot(c.x + 0.5 - cx, c.y + 0.5 - cy);
    const lt = wt - d * 70;
    if (lt < 0) return;
    const [px, py, ss] = P(c.x + 0.5, c.y + 0.5);
    const rise = easeOut(clamp01(lt / 220));
    g.globalCompositeOperation = "lighter";
    glow(g, px, py, ss * 0.8 * rise, CRIMSON, 0.7 * fade, GOLD);
    g.globalCompositeOperation = "source-over";
    for (let k = 0; k < (lowQ ? 2 : 5); k++) {
      const h = hash(seed + i * 7 + k * 3);
      flame(g, px + (h - 0.5) * ss * 0.7, py + ss * 0.1, ss * (0.15 + 0.08 * h), ss * (0.8 + 0.9 * h) * rise * (0.85 + 0.15 * Math.sin(wt / 60 + k)), Math.sin(wt / 80 + h * 9) * 0.4, fade);
    }
    if (!lowQ) { g.globalCompositeOperation = "lighter"; embers(g, px, py - ss * 0.3, ss * 0.6, 5, lt, fade, seed + i, 1.3); }
  });
  g.globalCompositeOperation = "source-over";
}

// ---------- เพลิงนรก (หลังคลิป): ระเบิดเพลิงทั้งกระดาน ----------
//  จอมืดแดง → นกเรืองจ้า → ลูกไฟร่วงจากฟ้าทั่วกระดาน → คลื่นเพลิงแผ่จากนกจนสุดกระดาน (ทุกช่องลุก) → เสาไฟพุ่งจากทุกคนที่โดน
function hellsongFx(g, e, t, dur, seed, lowQ) {
  const n = Math.max(1, e.size | 0), cx = e.x + n / 2, cy = e.y + n / 2;
  const cols = e.cols || 14, rows = e.rows || 14, minRow = e.minRow | 0;
  const W = g.canvas.width, H = g.canvas.height;
  const fade = 1 - clamp01((t - (dur - 900)) / 900);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = `rgba(30,3,4,${0.6 * easeOut(clamp01(t / 400)) * fade})`; g.fillRect(0, 0, W, H);
  g.restore();
  const [bx, by0, s] = P(cx, cy), by = by0 - s * 2.4;
  g.globalCompositeOperation = "lighter";
  glow(g, bx, by, s * (2 + 2 * Math.sin(Math.min(1, t / 700) * Math.PI)), CRIMSON, 0.9 * fade, GOLD);
  // ลูกไฟร่วงจากฟ้า (0.15–1.4 วิ) → ระเบิดที่พื้น
  const nM = lowQ ? 8 : 22;
  for (let i = 0; i < nM; i++) {
    const h1 = hash(seed + i * 2.7), h2 = hash(seed + i * 6.1), h3 = hash(seed + i * 9.3);
    const gx = h1 * cols, gy = minRow + h2 * (rows - minRow), t0 = 150 + h3 * 1250, fall = 420;
    const lt = t - t0;
    if (lt < 0) continue;
    const [px, py, ss] = P(gx, gy);
    if (lt < fall) {
      const q = lt / fall, sy = py - ss * 9 * (1 - q), sx = px - ss * 3 * (1 - q);
      g.strokeStyle = rgba(FLAME, 0.7); g.lineWidth = Math.max(1, ss * 0.18);
      g.beginPath(); g.moveTo(sx - ss * 1.2, sy - ss * 3.2); g.lineTo(sx, sy); g.stroke();
      glow(g, sx, sy, ss * 0.5, FLAME, 0.95, CORE);
    } else {
      const q = clamp01((lt - fall) / 700);
      glow(g, px, py, ss * (0.6 + 1.6 * easeOut(q)), CRIMSON, (1 - q) * 0.9 * fade, GOLD);
    }
  }
  // คลื่นเพลิงแผ่จากนกจนสุดกระดาน (1.0–2.6 วิ): ทุกช่องในวงลุกเป็นไฟ
  const wave = clamp01((t - 1000) / 1600), maxR = Math.hypot(cols, rows - minRow);
  const R = maxR * easeOut(wave);
  if (wave > 0) {
    g.strokeStyle = rgba(GOLD, 0.8 * (1 - wave) * fade); g.lineWidth = Math.max(2, s * 0.35);
    g.beginPath(); g.ellipse(bx, by0, R * s, R * s * 0.5, 0, 0, TAU); g.stroke();
    g.globalCompositeOperation = "source-over";
    const step = lowQ ? 2 : 1;
    for (let y = minRow; y < rows; y += step) for (let x = 0; x < cols; x += step) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d > R) continue;
      const lt = (R - d) / Math.max(1, maxR) * 1600;
      const [px, py, ss] = P(x + 0.5, y + 0.5);
      const h = hash(seed + x * 13.1 + y * 7.7);
      const rise = easeOut(clamp01(lt / 260));
      flame(g, px + (h - 0.5) * ss * 0.4, py + ss * 0.1, ss * (0.16 + 0.08 * h), ss * (0.5 + 0.8 * h) * rise * (0.85 + 0.15 * Math.sin(t / 70 + h * 20)), Math.sin(t / 100 + h * 9) * 0.4, 0.85 * fade);
    }
    g.globalCompositeOperation = "lighter";
  }
  // เสาไฟพุ่งจากทุกคนที่โดน (ตอนคลื่นมาถึง)
  for (const hu of Array.isArray(e.hits) ? e.hits : []) {
    const hn = Math.max(1, hu.size | 0), hx = hu.x + hn / 2, hy = hu.y + hn / 2;
    const d = Math.hypot(hx - cx, hy - cy), at = 1000 + 1600 * Math.min(1, d / Math.max(1, maxR));
    const lt = t - at;
    if (lt < 0) continue;
    const [px, py, ss] = P(hx, hy);
    const q = clamp01(lt / 900), H2 = ss * 5 * easeOut(Math.min(1, lt / 250));
    const gr = g.createLinearGradient(px, py, px, py - H2);
    gr.addColorStop(0, rgba(CORE, 0.95 * (1 - q))); gr.addColorStop(0.35, rgba(GOLD, 0.8 * (1 - q))); gr.addColorStop(1, rgba(CRIMSON, 0));
    g.fillStyle = gr; g.beginPath(); g.ellipse(px, py - H2 / 2, ss * 0.45, H2 / 2, 0, 0, TAU); g.fill();
  }
  // แสงวาบตอนคลื่นแผ่สุด
  const flash = clamp01(1 - Math.abs(t - 2600) / 350);
  if (flash > 0) {
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = `rgba(255,200,140,${0.45 * flash})`; g.fillRect(0, 0, W, H);
    g.restore();
  }
  g.globalCompositeOperation = "source-over";
}

// ---------- บรรยากาศระหว่างร่างนกฟีนิกซ์ (ผู้ใช้: จอออกแดง มืดนิดหน่อย ยังมองเห็นได้ + ละอองไฟ) ----------
//  วาดครั้งเดียวต่อเฟรม (ก่อนตัวนก — drawPhoenixBird) · เบาพอให้เห็นกระดานชัด
let ambientFrame = -1;
function phoenixAmbient(g, now, lowQ) {
  if (ambientFrame === now) return;
  ambientFrame = now;
  const W = g.canvas.width, H = g.canvas.height;
  const pulse = REDUCED ? 0.5 : 0.5 + 0.5 * Math.sin(now / 1400);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = "rgba(60,6,4,0.16)"; g.fillRect(0, 0, W, H);
  const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.hypot(W, H) * 0.62);
  vg.addColorStop(0, "rgba(160,20,10,0)");
  vg.addColorStop(1, `rgba(190,40,12,${0.22 + 0.06 * pulse})`);
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = "lighter";
  const nE = lowQ ? 14 : 40;
  for (let i = 0; i < nE; i++) {
    const h1 = hash(i * 1.37 + 0.5), h2 = hash(i * 3.11 + 0.2), h3 = hash(i * 5.93 + 0.7);
    const life = 4000 + 4000 * h3, q = ((now + h1 * life) % life) / life;
    const x = h2 * W + Math.sin(q * 6 + i) * W * 0.02, y = H * (1.02 - q * 1.08);
    const r = Math.max(1, H * (0.0018 + 0.003 * h1));
    g.fillStyle = `rgba(${h1 > 0.5 ? GOLD : FLAME},${0.7 * Math.sin(Math.PI * q)})`;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  g.restore();
}

// ทิศหันของนก (1 = ขวา · −1 = ซ้าย — ภาพต้นฉบับหันขวา): ตามทิศที่บินบนจอ · ตอนตีหันไปทางเป้า (ผู้ใช้ 2026-11-23)
const birdFace = new Map();
const birdTrack = new Map();
function faceOfBird(id, sx, now) {
  let tr = birdTrack.get(id);
  if (!tr) { if (birdTrack.size > 16) birdTrack.clear(); tr = { sx, frame: now }; birdTrack.set(id, tr); }
  if (tr.frame !== now) {
    if (Math.abs(sx - tr.sx) > 0.3) birdFace.set(id, sx > tr.sx ? 1 : -1);
    tr.sx = sx; tr.frame = now;
  }
  return birdFace.get(id) || 1;
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
  else if (e.kind === "joshuaIgnite") igniteFx(g, e, t, dur, seed, lowQ);
  else if (e.kind === "joshuaBirdRise") birdRiseFx(g, e, t, dur, seed, lowQ);
  else if (e.kind === "joshuaBirdStrike") birdStrikeFx(g, e, t, dur, seed, lowQ);
  else if (e.kind === "joshuaHellsong") hellsongFx(g, e, t, dur, seed, lowQ);
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

// ---------- ร่างนกฟีนิกซ์ (นกเพลิงอมตะ): ภาพนกเพลิงกระพือปีก ลอยเหนือกระดาน 3×3 ----------
//  ภาพ phoenix.webp (ภาพนกเพลิงที่ผู้ใช้ส่ง ลบพื้นหลังแล้ว) วาดเป็นตาราง 36×12 ช่อง แล้วดัดแต่ละช่อง (mesh warp)
//   ปีก = หมุนรอบไหล่ (ช่องที่ห่างลำตัวยกขึ้น/ลงมากกว่า) · ปีกยุบเข้าหาลำตัวตอนยก (มุมมอง) · หาง/ขนห้อยด้านล่างขวาขยับน้อย
//   จังหวะกระพือ: ตีลงเร็ว ยกขึ้นช้า (แบบนกใหญ่) รอบละ ~1.1 วิ — ตรงกับเสียงปีก joshua_bird_loop (~1 ครั้ง/วิ)
//  ลอยสูงจากพื้น (บินสูงกว่าหมาก) + เงาบนพื้น + แสงเรือง + สะเก็ดไฟ
const BIRD_IMG = "/characters/joshua_rosfield/phoenix.webp";
const birdImgs = {};
function birdImg() {
  if (!birdImgs.img && typeof Image === "function") { const im = new Image(); im.decoding = "async"; im.src = BIRD_IMG; birdImgs.img = im; }
  const im = birdImgs.img;
  return im && im.complete && im.naturalWidth > 0 ? im : null;
}
export const preloadPhoenixBird = () => { birdImg(); };
// จุดหมุน (สัดส่วนของภาพ) — ลำตัว/ไหล่ของนกในภาพ
const BODY = { x: 0.56, y: 0.36 };
const FLAP_MS = 1100;
// มุมกระพือ: −1 (ปีกยกสูงสุด) … 1 (ตีลงสุด) · ตีลงใช้ 38% ของรอบ
function flapAt(t) {
  const q = ((t % FLAP_MS) + FLAP_MS) % FLAP_MS / FLAP_MS;
  return q < 0.38 ? -1 + 2 * easeOut(q / 0.38) : 1 - 2 * (0.5 - 0.5 * Math.cos(Math.PI * (q - 0.38) / 0.62));
}
// น้ำหนักการขยับของจุด (fx, fy) ในภาพ: ฝั่งซ้าย = ปีกใหญ่ทั้งแผง · ฝั่งขวาบน = ปีกขวา · ขวาล่าง = หาง (ขยับน้อย)
function wingWeight(fx, fy) {
  const dx = fx - BODY.x;
  const near = Math.min(1, Math.abs(dx) / 0.07); // ใกล้ลำตัวนิ่ง
  if (dx < 0) return near;
  const tail = Math.min(1, Math.max(0, (fy - 0.42) / 0.18));
  return near * (1 - 0.85 * tail);
}
// วาดนก: กลางตัว (bx, by) บนจอ · W = ความกว้างภาพ (px) · flap −1..1
//  แถบแนวตั้งแถบเดียวต่อคอลัมน์ ชิดกันพอดี (ขอบปัดเป็นพิกเซลเต็ม · ไม่ซ้อนกัน) — แบบตาราง 36×12 เดิมเห็นเป็นเส้นตาราง
//  เพราะขอบที่ซ้อนกันของพิกเซลโปร่งแสงเข้มขึ้น (ผู้ใช้แจ้ง 2026-11-23)
//  แต่ละแถบ: บนสุดยก/กดตามมุมปีก · ล่างสุดอยู่ที่เดิม (ขนปีก/หางห้อยลง) = ยืดแนวตั้งเชิงเส้น 1 ครั้ง
function drawWarped(g, im, bx, by, W, flap) {
  const iw = im.naturalWidth, ih = im.naturalHeight, H = W * ih / iw;
  const C = Math.max(24, Math.min(140, Math.round(W / 4)));
  // กลางภาพ (ไม่ใช่ลำตัว) ตรงกลางกล่อง 3×3 — ปีกซ้ายในภาพใหญ่กว่า ใช้ลำตัวเป็นจุดวางแล้วตัวนกเลยกล่องไปทางขวา (ผู้ใช้แจ้ง)
  const ox = bx - W * 0.5, oy = by - H * 0.5;
  const lift = -flap; // บวก = ปีกยกขึ้น
  // ตำแหน่ง x บนจอของขอบคอลัมน์ (เรียงตามเดิมเสมอ) — ปีกหดเข้าหาลำตัวเล็กน้อยตอนยก/ตีลงสุด
  const xs = [];
  for (let i = 0; i <= C; i++) {
    const fx = i / C, dx = fx - BODY.x, w = wingWeight(fx, 0.2);
    const span = 1 - 0.14 * Math.abs(flap) * w;
    xs.push(Math.round(ox + (BODY.x + dx * span) * W));
  }
  for (let i = 0; i < C; i++) {
    const x0 = xs[i], x1 = xs[i + 1];
    if (x1 <= x0) continue;
    const fx = (i + 0.5) / C, dx = Math.abs(fx - BODY.x);
    const w = wingWeight(fx, 0.25); // แผงบนของคอลัมน์ (ปีก) — หางด้านล่างอยู่กับที่เพราะขอบล่างไม่ขยับ
    const L = lift * 0.55 * w * dx * 1.6 * H; // บวก = ขอบบนยกขึ้น
    g.drawImage(im, (i / C) * iw, 0, iw / C, ih, x0, Math.round(oy - L), x1 - x0, Math.round(H + L));
  }
  // top = เหนือหัวนกเล็กน้อย (ป้ายชื่อ/หลอดเลือดวางต่อจากตรงนี้) — ขอบบนของรูป (ปลายปีก) สูงจนป้ายชนปุ่มมุมบนของจอ (ผู้ใช้แจ้ง)
  return { left: ox, right: ox + W, top: by - H * 0.3, bottom: oy + H };
}
// u = หน่วยจาก drawUnit (u.size = 3) · wx, wy = กลางช่องมุมบนซ้าย · liftZ = ลอยเพิ่ม (กระโดด/เดิน)
export function drawPhoenixBird(g, u, now, wx, wy, liftZ = 0) {
  const im = birdImg();
  if (!im) return undefined;
  const n = Math.max(1, u.size | 0);
  // วางนกเหนือฐานหมาก (วงฐานอยู่ช่องมุมของกล่อง 3×3) — กลางกล่องทำให้ตัวนกหลุดไปขวาบนของฐาน (ผู้ใช้แจ้ง 2026-11-23)
  const t = REDUCED ? 0 : now;
  const flap = REDUCED ? 0 : flapAt(t + (u.id ? (u.id.length * 97) % FLAP_MS : 0));
  const down = !!(u.jbird && u.jbird.down);
  // ลอยสูงจากพื้นชัดเจน (ผู้ใช้: ตัวใหญ่ ลอยอยู่ ไม่ติดพื้น) · โคลงขึ้นลงช้าๆ · ตีปีกลง = ตัวยกขึ้นนิดๆ
  const hover = (down ? 0.6 : 3.4) + Math.max(0, liftZ) + (REDUCED ? 0 : -flap * 0.12 + Math.sin(t / 900) * 0.18);
  phoenixAmbient(g, now, u.lowQ);
  const [gx, gy, s] = P(wx, wy);
  const [bx, by] = P(wx, wy, hover);
  const face = faceOfBird(u.id, gx, now);
  const W = s * n * 2.5;
  g.save();
  // เงาบนพื้น (เล็กลงเมื่อยกสูง) + วงไฟใต้ตัว
  g.globalAlpha = 0.28; g.fillStyle = "#1a0306";
  g.beginPath(); g.ellipse(gx, gy, s * n * 0.42, s * n * 0.17, 0, 0, TAU); g.fill();
  g.globalAlpha = 1;
  g.globalCompositeOperation = "lighter";
  glow(g, gx, gy, s * n * 0.5, CRIMSON, 0.35, FLAME);
  glow(g, bx, by, W * 0.42, CRIMSON, down ? 0.25 : 0.42, GOLD);
  g.globalCompositeOperation = "source-over";
  if (u.isActor) { g.shadowColor = "rgba(255,190,120,.85)"; g.shadowBlur = 18; }
  if (down) g.globalAlpha = 0.7;
  if (face < 0) { g.translate(bx, 0); g.scale(-1, 1); g.translate(-bx, 0); } // หันซ้าย = พลิกภาพรอบกลางตัว
  const box = drawWarped(g, im, bx, by, W, flap);
  if (face < 0) { g.translate(bx, 0); g.scale(-1, 1); g.translate(-bx, 0); }
  g.shadowBlur = 0; g.globalAlpha = 1;
  // สะเก็ดไฟร่วงจากปีก/หาง
  g.globalCompositeOperation = "lighter";
  if (!u.lowQ) embers(g, bx, by + W * 0.25, W * 0.45, 16, t, 0.9, 3.7, -0.6);
  g.restore();
  return { cx: bx, top: box.top, bottom: gy, left: box.left, right: box.right };
}
