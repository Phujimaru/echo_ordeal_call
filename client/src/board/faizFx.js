// เอฟเฟกต์บนกระดานของอินุอิ ทาคุมิ (characters/inui_takumi.js · GRID_PLAN §7.27) — ธีม Photon Blood: แดงสด แกนขาว + ตรา Φ
//  ท่าตีปกติ (ฮุค attackStyle):
//   faizFist     ต่อยมือเปล่า: พุ่งเข้า (anim "lunge") เส้นแดงแตกรอบจุดปะทะ
//   faizKnuckle  Faiz_nuckle: รวมแสงแดงที่กำปั้น พุ่งเข้า ปะทะเป็นวงช็อก + ตรา Φ
//   faizPoint    Faiz_pointer: ลำเล็งแดงจากตัว → กรวยแดงหมุนจ่อเป้า → พุ่งเข้ากรวย แตกเป็นตรา Φ + ประกายฟ้า
//   faizShot     103 Single Mode: กระสุนโฟตอนนัดเดียว
//   faizBurst    106 Burst Mode: กระสุนโฟตอน 3 นัดรัว
//  ภาพค้างตอนเร่งความเร็ว (Start Up): จดตำแหน่งย้อนหลังต่อหมาก แล้วให้ drawUnit วาดหมากซ้ำแบบจางตามไป
import { P } from "./boardGeo";

const TAU = Math.PI * 2;
const RED = "255,36,51", HOT = "255,214,214", BLUE = "120,200,255";
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const rgba = (rgb, a) => `rgba(${rgb},${clamp01(a)})`;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export const FAIZ_MS = { faizFist: 620, faizKnuckle: 820, faizPoint: 1150, faizShot: 620, faizBurst: 900 };
// ท่าพุ่งปะทะที่ ~385 ms ตรงกับ anim "lunge" ของ BoardCanvas
export const FAIZ_HIT_P = { faizFist: 0.62, faizKnuckle: 0.47, faizPoint: 0.62, faizShot: 0.4, faizBurst: 0.55 };
export const FAIZ_FX_DUR = { ...FAIZ_MS };
export const isFaizFx = (kind) => typeof kind === "string" && kind in FAIZ_MS;

// จุดบนจอของหมาก (ตรงกับ boardDraw drawUnit)
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
// ตรา Φ ของ Faiz
function phi(g, x, y, r, a, width = 3) {
  if (a <= 0) return;
  g.save();
  g.translate(x, y);
  g.rotate(0.3);
  g.strokeStyle = rgba(RED, a);
  g.lineWidth = width;
  g.shadowColor = rgba(RED, a);
  g.shadowBlur = width * 3;
  g.beginPath(); g.ellipse(0, 0, r * 0.62, r * 0.8, 0, 0, TAU); g.stroke();
  g.beginPath(); g.moveTo(0, -r * 1.25); g.lineTo(0, r * 1.25); g.stroke();
  g.restore();
}
function rays(g, x, y, r0, r1, n, seed, rgb, a, width) {
  g.strokeStyle = rgba(rgb, a);
  g.lineWidth = width;
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU + seed, k = 0.7 + 0.3 * Math.sin(seed * 9 + i * 2.3);
    g.moveTo(x + Math.cos(t) * r0, y + Math.sin(t) * r0 * 0.8);
    g.lineTo(x + Math.cos(t) * r1 * k, y + Math.sin(t) * r1 * k * 0.8);
  }
  g.stroke();
}
function ring(g, x, y, r, rgb, a, width) {
  if (a <= 0) return;
  g.strokeStyle = rgba(rgb, a);
  g.lineWidth = width;
  g.beginPath(); g.ellipse(x, y, r, r * 0.8, 0, 0, TAU); g.stroke();
}
// กระสุนโฟตอน: หัวขาว หางแดงเรียว
function bolt(g, a, b, p, s) {
  const x = a.bx + (b.bx - a.bx) * p, y = a.hy + (b.hy - a.hy) * p;
  const L = Math.hypot(b.bx - a.bx, b.hy - a.hy) || 1, ux = (b.bx - a.bx) / L, uy = (b.hy - a.hy) / L;
  const len = s * 0.75, nx = -uy, ny = ux, w = s * 0.07;
  g.fillStyle = rgba(RED, 0.9);
  g.beginPath();
  g.moveTo(x + nx * w, y + ny * w);
  g.lineTo(x - ux * len, y - uy * len);
  g.lineTo(x - nx * w, y - ny * w);
  g.closePath(); g.fill();
  g.strokeStyle = rgba("255,255,255", 0.95);
  g.lineWidth = Math.max(1.5, s * 0.03);
  g.beginPath(); g.moveTo(x, y); g.lineTo(x - ux * len * 0.5, y - uy * len * 0.5); g.stroke();
  halo(g, x, y, s * 0.22, RED, 0.9);
}
function muzzle(g, A, B, a) {
  if (a <= 0) return;
  const L = Math.hypot(B.bx - A.bx, B.hy - A.hy) || 1;
  const x = A.bx + ((B.bx - A.bx) / L) * A.r, y = A.hy + ((B.hy - A.hy) / L) * A.r;
  halo(g, x, y, A.s * 0.42, RED, a);
}
function spark(g, B, q, seed, big) {
  const r = B.r * (big ? 1.5 : 1.1);
  halo(g, B.bx, B.hy, r * (0.6 + q), RED, (1 - q) * 0.9);
  rays(g, B.bx, B.hy, r * (0.35 + q * 0.6), r * (0.8 + q * 1.1), big ? 10 : 7, seed, HOT, 1 - q, big ? 2.4 : 1.8);
}

function fistFx(g, e, p, seed, heavy) {
  const hit = FAIZ_HIT_P[e.kind];
  const A = bodyAt(e.x, e.y, e.size || 1), B = bodyAt(e.to.x, e.to.y, e.toSize || 1);
  // รวมแสงที่กำปั้นก่อนพุ่ง
  if (heavy && p < hit) {
    const k = clamp01(p / (hit * 0.6));
    halo(g, A.bx, A.hy, A.r * (0.5 + k * 0.8), RED, 0.8 * (1 - Math.max(0, p / hit - 0.7) / 0.3));
    rays(g, A.bx, A.hy, A.r * (1.3 - k * 0.8), A.r * (1.7 - k * 0.8), 8, seed + k * 2, HOT, 0.8, 1.6);
  }
  if (p < hit) return;
  const q = clamp01((p - hit) / (1 - hit)), o = easeOut(q);
  if (heavy) {
    halo(g, B.bx, B.hy, B.r * (1 + o * 1.8), RED, (1 - q) * 0.95);
    ring(g, B.bx, B.hy, B.r * (0.8 + o * 2.2), RED, 1 - q, 4);
    ring(g, B.bx, B.hy, B.r * (0.5 + o * 1.5), "255,255,255", (1 - q) * 0.9, 2);
    rays(g, B.bx, B.hy, B.r * (0.6 + o), B.r * (1.2 + o * 1.9), 14, seed, HOT, 1 - q, 2.6);
    phi(g, B.bx, B.hy, B.r * 1.05, q < 0.55 ? 1 : (1 - q) / 0.45, 3.5);
  } else {
    halo(g, B.bx, B.hy, B.r * (0.7 + o), RED, (1 - q) * 0.9);
    ring(g, B.bx, B.hy, B.r * (0.5 + o * 1.3), HOT, 1 - q, 2.5);
    rays(g, B.bx, B.hy, B.r * (0.4 + o * 0.8), B.r * (0.9 + o * 1.3), 8, seed, RED, 1 - q, 2.2);
  }
}

// ลำเล็ง → กรวยแดงหมุนจ่อเป้า → ทะลวง
function pointFx(g, e, p, seed, lowQ) {
  const hit = FAIZ_HIT_P.faizPoint;
  const A = bodyAt(e.x, e.y, e.size || 1), B = bodyAt(e.to.x, e.to.y, e.toSize || 1);
  const L = Math.hypot(B.bx - A.bx, B.hy - A.hy) || 1, ux = (B.bx - A.bx) / L, uy = (B.hy - A.hy) / L;
  if (p < hit) {
    const k = clamp01(p / 0.14);
    g.strokeStyle = rgba(RED, 0.85 * (1 - clamp01((p - 0.34) / 0.14)));
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(A.bx, A.hy); g.lineTo(A.bx + (B.bx - A.bx) * k, A.hy + (B.hy - A.hy) * k); g.stroke();
    const f = easeOut(clamp01((p - 0.14) / 0.22)), push = clamp01((p - 0.5) / (hit - 0.5));
    if (f > 0) {
      // ยอดกรวยจ่อเป้า ฐานหันมาทางผู้ตี
      const len = B.s * 1.5 * (1 - push * push), w = B.r * 1.25 * f, nx = -uy, ny = ux;
      const tx = B.bx, ty = B.hy, bx = tx - ux * len, by = ty - uy * len;
      g.fillStyle = rgba(RED, 0.8);
      g.beginPath(); g.moveTo(tx, ty); g.lineTo(bx + nx * w, by + ny * w); g.lineTo(bx - nx * w, by - ny * w); g.closePath(); g.fill();
      g.strokeStyle = rgba(HOT, 0.95);
      g.lineWidth = 1.6;
      g.stroke();
      const rings = lowQ ? 2 : 4;
      for (let i = 0; i < rings; i++) {
        const c = (i + 1 - (p * 9) % 1) / rings, x = tx - ux * len * c, y = ty - uy * len * c;
        g.strokeStyle = rgba("255,120,130", 0.8);
        g.beginPath(); g.moveTo(x + nx * w * c, y + ny * w * c); g.lineTo(x - nx * w * c, y - ny * w * c); g.stroke();
      }
      halo(g, tx, ty, B.r * 0.7, RED, 0.8 * f);
    }
    return;
  }
  const q = clamp01((p - hit) / (1 - hit)), o = easeOut(q);
  halo(g, B.bx, B.hy, B.r * (1 + o * 1.5), RED, (1 - q) * 0.95);
  ring(g, B.bx, B.hy, B.r * (0.7 + o * 1.9), RED, 1 - q, 3.5);
  phi(g, B.bx, B.hy, B.r * 1.15, q < 0.6 ? 1 : (1 - q) / 0.4, 4);
  const n = lowQ ? 6 : 12;
  g.fillStyle = rgba(BLUE, 1 - q);
  for (let i = 0; i < n; i++) {
    const a = seed + i * 2.399, d = B.r * (0.4 + (i % 4) * 0.25);
    g.fillRect(B.bx + Math.cos(a) * d, B.hy + Math.sin(a) * d * 0.5 - B.s * o * (0.3 + (i % 3) * 0.3), 2.5, 5);
  }
}

function shotFx(g, e, p, seed) {
  const A = bodyAt(e.x, e.y, e.size || 1), B = bodyAt(e.to.x, e.to.y, e.toSize || 1);
  const shots = e.kind === "faizBurst" ? [[0.06, 0.3], [0.2, 0.43], [0.32, 0.55]] : [[0.1, 0.4]];
  for (const [s0, s1] of shots) {
    muzzle(g, A, B, 1 - Math.abs(p - s0) / 0.07);
    if (p >= s0 && p < s1) bolt(g, A, B, (p - s0) / (s1 - s0), A.s);
    if (p >= s1 && p < s1 + 0.3) spark(g, B, (p - s1) / 0.3, seed + s0 * 40, s1 === shots[shots.length - 1][1]);
  }
}

export function faizFx(g, e, now, lowQ) {
  if (!e.to) return;
  const p = (now - e.t0) / FAIZ_MS[e.kind];
  if (p < 0 || p > 1) return;
  const seed = ((e.t0 | 0) % 977) / 97;
  g.save();
  if (e.kind === "faizFist") fistFx(g, e, p, seed, false);
  else if (e.kind === "faizKnuckle") fistFx(g, e, p, seed, true);
  else if (e.kind === "faizPoint") pointFx(g, e, p, seed, lowQ);
  else shotFx(g, e, p, seed);
  g.restore();
}

const LIFE = 420; // ms ที่ภาพค้างอยู่
const GAP = 34; // ms ระหว่างภาพ
const trails = new Map(); // id → [{ x, y, t }]

// คืนภาพค้างที่ต้องวาด (เก่าสุดก่อน) · a = ความทึบ
export function faizGhosts(id, now, x, y) {
  let list = trails.get(id);
  if (!list) { list = []; trails.set(id, list); }
  const head = list[list.length - 1];
  if (!head || (now - head.t >= GAP && (head.x !== x || head.y !== y))) list.push({ x, y, t: now });
  while (list.length && now - list[0].t > LIFE) list.shift();
  return list.slice(0, -1).map((p) => ({ x: p.x, y: p.y, a: 0.5 * (1 - (now - p.t) / LIFE) }));
}
export function faizTrailClear(id) { trails.delete(id); }
