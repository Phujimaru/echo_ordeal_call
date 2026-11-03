// ============================================================
//  เอฟเฟกต์บนกระดานของโจรุโน่ โจวาน่า (characters/giorno_giovanna.js) — โทนทองของ Gold Experience + ชีวิตสีเขียว
//
//  ตีปกติ (fx.kind = attackStyle) — fx { x, y (ช่องผู้ตี), size, to: { x, y } }
//    gioPunch  หมัดทองรัว: กำปั้นทองพุ่งจากผู้ตีไปเป้าหลายหมัด → ปะทะ ประกายทอง + ใบไม้เล็กปลิว
//  เหตุการณ์จาก server (socket "giornoFx" { kind, id, at, size, color, ... } → GIO_EVENT_FX)
//    life       ชีวิตทดแทน: ไอเทมแตกเป็นแสงทองแล้วกลายเป็นใบไม้เขียวลอยขึ้นรอบตัว
//    reflect    ต้นตอแห่งชีวิต: วงเต่าทองทองคำหมุนรอบตัวแล้วจางเข้าตัว
//    reflectHit สะท้อน: แสงทองจากเจ้าของพุ่งไปผู้โจมตี (toAt) → ปะทะ
//    tree       จงกำเนิดใหม่ (ตัวเอง/เพื่อน): ต้นไม้งอกจากพื้นใต้ตัว กิ่งแตก ใบผลิ
//    root       จงกำเนิดใหม่ (ศัตรู): รากไม้ทองแทงขึ้นรอบตัวแล้วรัด
//    dodge      หลบด้วยต้นไม้: ใบไม้ระเบิดออก
//    burst      Muda!!!!!!! เสริมหมัด: ออร่าทองพุ่งขึ้น + วงแตก
//    muda       Muda โดนเป้า: หมัดทองรัวรอบเป้า + ประกายฟื้นฟูเขียว
//    heal       ตีเพื่อน: กำปั้นทองแตะ → ประกายเขียวทองลอยขึ้น
//  ตัวหมาก (u.giorno = { tree, reflect, muda }): ลอยบนต้นไม้ = ต้นไม้ใต้หมาก หมากยกสูง (GIO_TREE_Z) ·
//    ต้นตอแห่งชีวิต = วงเต่าทองทองหมุนใต้ตัว · Muda = ออร่าทองเต้นใต้ตัว
//  lowQ = ตัดประกาย/ใบไม้ครึ่งหนึ่ง · ลดการเคลื่อนไหว = ไม่หมุน ไม่เต้น
// ============================================================
import { P, gEllipse, glow } from "./boardGeo";

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export const GIO_MS = { gioPunch: 900 };
export const GIO_HIT_P = { gioPunch: 0.55 };
export const GIO_FX_DUR = { ...GIO_MS, gioLife: 1300, gioReflect: 1200, gioReflectHit: 900, gioTree: 1400, gioRoot: 1300, gioDodge: 800, gioBurst: 1200, gioMuda: 1400, gioHeal: 1100 };
export const GIO_EVENT_FX = {
  life: "gioLife", reflect: "gioReflect", reflectHit: "gioReflectHit", tree: "gioTree", root: "gioRoot",
  dodge: "gioDodge", burst: "gioBurst", muda: "gioMuda", heal: "gioHeal",
};
export const isGioFx = (kind) => typeof kind === "string" && (kind in GIO_FX_DUR);
export const GIO_TREE_Z = 0.55; // ลอยบนต้นไม้: หมากยกขึ้น (หน่วยช่อง — BoardCanvas บวกเข้า hz)
export const gioLifted = (u) => !!(u && u.giorno && u.giorno.tree);

const GOLD = "255,200,60", GOLD_HI = "255,244,190", LEAF = "90,200,90", LEAF_HI = "190,255,170", BARK = "120,80,40", PURPLE = "150,80,200", WHITE = "255,255,255";
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const hash01 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const center = (e) => [e.x + (e.size || 1) / 2, e.y + (e.size || 1) / 2];
const prog = (e, now) => (now - e.t0) / (GIO_FX_DUR[e.kind] || 1000);

// ---------- ชิ้นส่วน ----------
// ใบไม้ (วงรีแหลม) ที่จุดจอ (x, y) ขนาด s มุม a
function leaf(g, x, y, s, a, rgb, alpha) {
  g.save(); g.translate(x, y); g.rotate(a);
  g.fillStyle = `rgba(${rgb},${alpha})`;
  g.beginPath(); g.moveTo(-s, 0); g.quadraticCurveTo(0, -s * 0.55, s, 0); g.quadraticCurveTo(0, s * 0.55, -s, 0); g.fill();
  g.strokeStyle = `rgba(30,90,30,${alpha * 0.6})`; g.lineWidth = Math.max(0.5, s * 0.08);
  g.beginPath(); g.moveTo(-s * 0.8, 0); g.lineTo(s * 0.8, 0); g.stroke();
  g.restore();
}
// กำปั้นทอง (สี่เหลี่ยมมนเล็ก + ข้อนิ้ว) ที่จุดจอ ขนาด s
function fist(g, x, y, s, a, alpha) {
  g.save(); g.translate(x, y); g.rotate(a);
  g.fillStyle = `rgba(${GOLD},${alpha})`; g.strokeStyle = `rgba(120,70,10,${alpha})`; g.lineWidth = Math.max(1, s * 0.08);
  g.beginPath(); g.roundRect ? g.roundRect(-s * 0.5, -s * 0.4, s, s * 0.8, s * 0.22) : g.rect(-s * 0.5, -s * 0.4, s, s * 0.8); g.fill(); g.stroke();
  g.strokeStyle = `rgba(${PURPLE},${alpha * 0.8})`;
  for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(s * 0.45, -s * 0.28 + i * s * 0.26); g.lineTo(s * 0.2, -s * 0.28 + i * s * 0.26); g.stroke(); }
  g.restore();
}
// ประกายแตก
function sparks(g, sx, sy, sc, q, rgb, n, seed, lowQ) {
  if (q < 0 || q > 1) return;
  const m = lowQ ? Math.ceil(n / 2) : n, k = 1 - q;
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
  for (let i = 0; i < m; i++) {
    const th = hash01(seed + i) * Math.PI * 2, sp = 0.4 + hash01(seed + i + 50) * 0.6;
    const d = sc * (0.12 + easeOut3(q) * 0.8 * sp), l = sc * 0.1 * k;
    const x = sx + Math.cos(th) * d, y = sy + Math.sin(th) * d * 0.75;
    g.strokeStyle = `rgba(${rgb},${k})`; g.lineWidth = Math.max(1, sc * 0.02);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x - Math.cos(th) * l, y - Math.sin(th) * l * 0.75); g.stroke();
  }
  g.restore();
}
// ใบไม้ลอยขึ้นรอบจุด (cx, cy ช่อง) · q 0..1
function risingLeaves(g, cx, cy, q, n, seed, lowQ, rgb = LEAF) {
  const m = lowQ ? Math.ceil(n / 2) : n;
  for (let i = 0; i < m; i++) {
    const th = hash01(seed + i) * Math.PI * 2, r = 0.2 + hash01(seed + i + 7) * 0.3, rise = q * (0.6 + hash01(seed + i + 3) * 0.6);
    const [x, y, s] = P(cx + Math.cos(th + q * 2) * r, cy + Math.sin(th + q * 2) * r, 0.15 + rise);
    leaf(g, x, y, s * 0.07, th + q * 6, i % 3 ? rgb : LEAF_HI, 0.9 * (1 - q));
  }
}
// ต้นไม้ใต้ตัว (cx, cy ช่อง) สูง h หน่วยช่อง · k = ขนาด/ความทึบ 0..1
//  ลำต้นหนา (รากแผ่บนพื้น) → พุ่มใบเป็นแท่นกลมที่ความสูง h (ตัวหมากนั่งบนแท่น) + ใบกลมรอบขอบ
function treeShape(g, cx, cy, h, k, sway, lowQ) {
  if (k <= 0) return;
  const base = P(cx, cy, 0), top = P(cx + sway, cy, h * 0.92), s = base[2];
  g.save();
  g.lineCap = "round";
  // ราก
  g.strokeStyle = `rgba(${BARK},${0.9 * k})`; g.lineWidth = Math.max(2, s * 0.05 * k);
  for (const a of [0.4, 2.2, 3.9, 5.4]) {
    const r = P(cx + Math.cos(a) * 0.3 * k, cy + Math.sin(a) * 0.3 * k, 0.01);
    g.beginPath(); g.moveTo(base[0], base[1]); g.quadraticCurveTo((base[0] + r[0]) / 2, base[1] - s * 0.04, r[0], r[1]); g.stroke();
  }
  // ลำต้น (ขอบเข้ม + เนื้อ)
  g.strokeStyle = `rgba(70,45,20,${k})`; g.lineWidth = Math.max(5, s * 0.2 * k);
  g.beginPath(); g.moveTo(base[0], base[1]); g.quadraticCurveTo(base[0] - s * 0.08, (base[1] + top[1]) / 2, top[0], top[1]); g.stroke();
  g.strokeStyle = `rgba(${BARK},${k})`; g.lineWidth = Math.max(3, s * 0.14 * k);
  g.beginPath(); g.moveTo(base[0], base[1]); g.quadraticCurveTo(base[0] - s * 0.08, (base[1] + top[1]) / 2, top[0], top[1]); g.stroke();
  // แท่นพุ่มใบ
  gEllipse(g, cx + sway, cy, 0.46 * k, h, 32); g.fillStyle = `rgba(50,140,55,${0.95 * k})`; g.fill();
  g.strokeStyle = `rgba(25,90,30,${k})`; g.lineWidth = 2; g.stroke();
  gEllipse(g, cx + sway, cy - 0.03, 0.36 * k, h + 0.02, 32); g.fillStyle = `rgba(${LEAF},${0.9 * k})`; g.fill();
  // ใบกลมรอบขอบ
  const blobs = lowQ ? 6 : 10;
  for (let i = 0; i < blobs; i++) {
    const ang = (i / blobs) * Math.PI * 2, [bx, by, bs] = P(cx + sway + Math.cos(ang) * 0.44 * k, cy + Math.sin(ang) * 0.44 * k, h);
    g.fillStyle = `rgba(${i % 2 ? LEAF : "70,170,70"},${k})`;
    g.beginPath(); g.ellipse(bx, by, bs * 0.1 * k, bs * 0.07 * k, ang, 0, Math.PI * 2); g.fill();
  }
  // ดอกทองเล็ก (Gold Experience)
  if (!lowQ) for (let i = 0; i < 3; i++) {
    const ang = i * 2.1 + 0.5, [fx, fy, fs] = P(cx + sway + Math.cos(ang) * 0.3 * k, cy + Math.sin(ang) * 0.3 * k, h + 0.02);
    g.fillStyle = `rgba(${GOLD},${k})`; g.beginPath(); g.arc(fx, fy, Math.max(1.5, fs * 0.03), 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

// ---------- ตีปกติ: หมัดทองรัว ----------
function gioPunch(g, e, now, lowQ) {
  const t = (now - e.t0) / GIO_MS.gioPunch;
  if (t <= 0 || t >= 1) return;
  const HIT = GIO_HIT_P.gioPunch, [ox, oy] = center(e), tx = e.to.x + 0.5, ty = e.to.y + 0.5;
  g.save();
  const n = lowQ ? 3 : 6;
  for (let i = 0; i < n; i++) {
    const t0 = (i / n) * HIT * 0.8, u = clamp01((t - t0) / (HIT * 0.35));
    if (u <= 0 || u >= 1 && t > HIT + 0.15) continue;
    const off = (hash01(i + e.to.x * 3) - 0.5) * 0.35, z = 0.35 + (hash01(i + 11) - 0.5) * 0.25;
    const px = ox + (tx - ox) * easeOut3(u) + off * (ty - oy !== 0 ? 1 : 0), py = oy + (ty - oy) * easeOut3(u) + off * (tx - ox !== 0 ? 1 : 0);
    const [x, y, s] = P(px, py, z);
    fist(g, x, y, s * 0.16, Math.atan2(ty - oy, tx - ox), 0.95 * (1 - Math.max(0, u - 0.8) * 5));
  }
  if (t >= HIT) {
    const q = (t - HIT) / (1 - HIT), [sx, sy, sc] = P(tx, ty, 0.4);
    if (q < 0.3) glow(g, sx, sy, sc * (0.45 + q), GOLD_HI, 0.8 * (1 - q / 0.3));
    sparks(g, sx, sy, sc, q, GOLD_HI, 12, e.to.x * 7 + e.to.y, lowQ);
    risingLeaves(g, tx, ty, q, 5, e.to.x * 13 + e.to.y, lowQ);
  }
  g.restore();
}

// ---------- เหตุการณ์ ----------
function gioLife(g, e, now, lowQ) {
  const t = prog(e, now);
  if (t <= 0 || t >= 1) return;
  const [cx, cy] = center(e), [sx, sy, sc] = P(cx, cy, 0.5);
  g.save();
  if (t < 0.35) { const k = t / 0.35; glow(g, sx, sy, sc * (0.2 + k * 0.5), GOLD_HI, 0.8 * (1 - k)); sparks(g, sx, sy, sc, k, GOLD, 10, 3, lowQ); }
  risingLeaves(g, cx, cy, clamp01((t - 0.15) / 0.85), 9, 17, lowQ);
  g.restore();
}
function gioReflect(g, e, now, lowQ) {
  const t = prog(e, now);
  if (t <= 0 || t >= 1) return;
  const [cx, cy] = center(e), k = t < 0.2 ? t / 0.2 : 1 - clamp01((t - 0.6) / 0.4), r = 0.62 - t * 0.2;
  g.save();
  gEllipse(g, cx, cy, r, 0.02, 40); g.strokeStyle = `rgba(${GOLD},${0.9 * k})`; g.lineWidth = 2.5; g.stroke();
  const n = lowQ ? 4 : 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (REDUCED ? 0 : t * 4), [x, y, s] = P(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.2 + t * 0.4);
    g.fillStyle = `rgba(${GOLD},${k})`; g.beginPath(); g.ellipse(x, y, s * 0.06, s * 0.045, a, 0, Math.PI * 2); g.fill();
    g.fillStyle = `rgba(60,30,0,${0.8 * k})`; g.beginPath(); g.arc(x, y, s * 0.012, 0, Math.PI * 2); g.fill();
  }
  const [sx, sy, sc] = P(cx, cy, 0.5);
  glow(g, sx, sy, sc * 0.5, GOLD, 0.35 * k);
  g.restore();
}
function gioReflectHit(g, e, now, lowQ) {
  const t = prog(e, now);
  if (t <= 0 || t >= 1 || !e.toAt) return;
  const [ox, oy] = center(e), tx = e.toAt.x + 0.5, ty = e.toAt.y + 0.5;
  const HIT = 0.45, u = easeOut3(clamp01(t / HIT));
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
  const a = P(ox, oy, 0.45), b = P(ox + (tx - ox) * u, oy + (ty - oy) * u, 0.45);
  const k = t < HIT ? 1 : 1 - (t - HIT) / (1 - HIT);
  g.strokeStyle = `rgba(${GOLD},${0.85 * k})`; g.lineWidth = Math.max(3, a[2] * 0.06);
  g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
  g.strokeStyle = `rgba(${WHITE},${k})`; g.lineWidth = Math.max(1, a[2] * 0.02);
  g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
  g.globalCompositeOperation = "source-over";
  if (t >= HIT) {
    const q = (t - HIT) / (1 - HIT), [sx, sy, sc] = P(tx, ty, 0.45);
    if (q < 0.3) glow(g, sx, sy, sc * (0.4 + q), GOLD_HI, 0.85 * (1 - q / 0.3));
    sparks(g, sx, sy, sc, q, GOLD, 12, 29, lowQ);
  }
  g.restore();
}
function gioTree(g, e, now, lowQ) {
  const t = prog(e, now);
  if (t <= 0 || t >= 1) return;
  const [cx, cy] = center(e), grow = easeOut3(clamp01(t / 0.6)), fade = 1 - clamp01((t - 0.75) / 0.25);
  g.save();
  treeShape(g, cx, cy + 0.02, GIO_TREE_Z * grow, grow * fade, 0, lowQ);
  const [sx, sy, sc] = P(cx, cy, 0.05);
  glow(g, sx, sy, sc * 0.5, GOLD, 0.4 * (1 - t));
  risingLeaves(g, cx, cy, clamp01((t - 0.3) / 0.7), 7, 41, lowQ);
  g.restore();
}
function gioRoot(g, e, now, lowQ) {
  const t = prog(e, now);
  if (t <= 0 || t >= 1) return;
  const [cx, cy] = center(e), k = 1 - clamp01((t - 0.7) / 0.3), grow = easeOut3(clamp01(t / 0.45));
  g.save(); g.lineCap = "round";
  const n = lowQ ? 4 : 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, r0 = 0.48, r1 = 0.2;
    const p0 = P(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, 0), p1 = P(cx + Math.cos(a + 0.6) * r1, cy + Math.sin(a + 0.6) * r1, 0.55 * grow);
    g.strokeStyle = `rgba(${BARK},${k})`; g.lineWidth = Math.max(2, p0[2] * 0.045);
    g.beginPath(); g.moveTo(p0[0], p0[1]); g.quadraticCurveTo(p0[0], p1[1], p1[0], p1[1]); g.stroke();
    g.strokeStyle = `rgba(${GOLD},${0.6 * k})`; g.lineWidth = Math.max(1, p0[2] * 0.012);
    g.beginPath(); g.moveTo(p0[0], p0[1]); g.quadraticCurveTo(p0[0], p1[1], p1[0], p1[1]); g.stroke();
  }
  g.restore();
}
function gioDodge(g, e, now, lowQ) {
  const t = prog(e, now);
  if (t <= 0 || t >= 1) return;
  const [cx, cy] = center(e), m = lowQ ? 6 : 12;
  g.save();
  for (let i = 0; i < m; i++) {
    const th = hash01(i + 61) * Math.PI * 2, d = easeOut3(t) * (0.4 + hash01(i + 5) * 0.4);
    const [x, y, s] = P(cx + Math.cos(th) * d, cy + Math.sin(th) * d, GIO_TREE_Z + 0.1 + t * 0.3);
    leaf(g, x, y, s * 0.06, th + t * 8, i % 2 ? LEAF : LEAF_HI, 1 - t);
  }
  g.restore();
}
function gioBurst(g, e, now, lowQ) {
  const t = prog(e, now);
  if (t <= 0 || t >= 1) return;
  const [cx, cy] = center(e), [sx, sy, sc] = P(cx, cy, 0.5), k = 1 - t;
  g.save();
  glow(g, sx, sy, sc * (0.5 + t * 0.6), GOLD, 0.7 * k);
  gEllipse(g, cx, cy, 0.3 + easeOut3(t) * 0.6, 0.02, 40); g.strokeStyle = `rgba(${GOLD_HI},${k})`; g.lineWidth = 3; g.stroke();
  if (!lowQ) {
    g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, [x0, y0] = P(cx + Math.cos(a) * 0.2, cy + Math.sin(a) * 0.2, 0.1), [x1, y1] = P(cx + Math.cos(a) * 0.25, cy + Math.sin(a) * 0.25, 0.6 + t * 0.6);
      g.strokeStyle = `rgba(${GOLD},${0.6 * k})`; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    }
  }
  g.restore();
}
function gioMuda(g, e, now, lowQ) {
  const t = prog(e, now);
  if (t <= 0 || t >= 1) return;
  const [cx, cy] = center(e), [sx, sy, sc] = P(cx, cy, 0.45);
  g.save();
  const n = lowQ ? 6 : 14;
  for (let i = 0; i < n; i++) {
    const t0 = (i / n) * 0.6, u = clamp01((t - t0) / 0.18);
    if (u <= 0 || u >= 1) continue;
    const th = hash01(i + 71) * Math.PI * 2, r = 0.55 * (1 - u);
    const [x, y, s] = P(cx + Math.cos(th) * r, cy + Math.sin(th) * r, 0.3 + hash01(i + 2) * 0.35);
    fist(g, x, y, s * 0.15, th + Math.PI, 1 - u * 0.5);
    if (u > 0.8) glow(g, x, y, s * 0.18, GOLD_HI, 0.7);
  }
  if (t > 0.5) { const q = (t - 0.5) / 0.5; risingLeaves(g, cx, cy, q, 8, 83, lowQ, LEAF); glow(g, sx, sy, sc * 0.5, LEAF, 0.35 * (1 - q)); }
  g.restore();
}
function gioHeal(g, e, now, lowQ) {
  const t = prog(e, now);
  if (t <= 0 || t >= 1) return;
  const [cx, cy] = center(e), [sx, sy, sc] = P(cx, cy, 0.45);
  g.save();
  if (t < 0.35) { const k = t / 0.35; fist(g, sx - sc * 0.4 * (1 - k), sy, sc * 0.16, 0, 1 - k * 0.6); }
  glow(g, sx, sy, sc * 0.5, LEAF_HI, 0.45 * (1 - t));
  risingLeaves(g, cx, cy, clamp01((t - 0.2) / 0.8), 7, 97, lowQ);
  sparks(g, sx, sy, sc, clamp01((t - 0.25) / 0.6), GOLD_HI, 8, 101, lowQ);
  g.restore();
}

const DRAW = { gioPunch, gioLife, gioReflect, gioReflectHit, gioTree, gioRoot, gioDodge, gioBurst, gioMuda, gioHeal };
export function giornoFx(g, e, now, lowQ) {
  const fn = DRAW[e.kind];
  if (fn) fn(g, e, now, lowQ);
}

// ---------- ตัวหมาก ----------
// ก่อนฐานหมาก: วงเต่าทอง (ต้นตอแห่งชีวิต) · ออร่าทอง (Muda) · ต้นไม้ใต้ตัว (ลอย — liftZ = ความสูงหมากที่ยก)
export function gioUnitBack(g, u, now, wx, wy) {
  const G = u.giorno;
  if (!G) return;
  const pulse = REDUCED ? 0.8 : 0.65 + 0.35 * Math.sin(now / 300);
  g.save();
  if (G.tree) treeShape(g, wx, wy + 0.02, GIO_TREE_Z, 1, REDUCED ? 0 : Math.sin(now / 900) * 0.02, !!u.lowQ);
  if (G.reflect) {
    const z = G.tree ? GIO_TREE_Z : 0.01;
    gEllipse(g, wx, wy, 0.5, z, 36); g.strokeStyle = `rgba(${GOLD},${0.85 * pulse})`; g.lineWidth = 2; g.stroke();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + (REDUCED ? 0 : now / 1400), [x, y, s] = P(wx + Math.cos(a) * 0.5, wy + Math.sin(a) * 0.5, z);
      g.fillStyle = `rgba(${GOLD},${pulse})`; g.beginPath(); g.ellipse(x, y, s * 0.045, s * 0.034, a, 0, Math.PI * 2); g.fill();
    }
  }
  if (G.muda) {
    const z = G.tree ? GIO_TREE_Z : 0.01;
    gEllipse(g, wx, wy, 0.44, z, 36); g.fillStyle = `rgba(${GOLD},${0.18 * pulse})`; g.fill();
    const [x, y, s] = P(wx, wy, z + 0.35);
    glow(g, x, y, s * 0.45, GOLD, 0.25 * pulse);
  }
  g.restore();
}
