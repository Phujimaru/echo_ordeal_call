// ============================================================
//  เอฟเฟกต์บนกระดานของโจรุโน่ โจวาน่า (characters/giorno_giovanna.js) — โทนทองของ Gold Experience + ชีวิตสีเขียว
//
//  ตีปกติ (fx.kind = attackStyle) — fx { x, y (ช่องผู้ตี), size, to: { x, y } }
//    gioPunch  ตีปกติ: กำปั้นทองของ Gold Experience ง้าง → ต่อยหนัก 1 หมัด (เส้นความเร็ว) → ปะทะ วงคลื่นบนพื้น + เส้นแตกรัศมี + ประกาย + ใบไม้
//    gioRush   ติดคริ (client เลือกเมื่อ card.crit — BoardStage): หมัดรัวจากหลายมุม (กำปั้น + เงาหมัดซ้อน) ฮิตละแวบ → หมัดสุดท้ายใหญ่ วงคลื่นคู่
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

export const GIO_MS = { gioPunch: 820, gioRush: 1700 };
export const GIO_HIT_P = { gioPunch: 0.45, gioRush: 0.22 }; // ปะทะแรก (ตัวเลขดาเมจขึ้น) — หมัดรัวต่อจนจบท่า
export const GIO_FX_DUR = { ...GIO_MS, gioLife: 1300, gioReflect: 1200, gioReflectHit: 900, gioTree: 1400, gioRoot: 1300, gioDodge: 800, gioBurst: 1200, gioMuda: 1400, gioHeal: 1100 };
export const GIO_EVENT_FX = {
  life: "gioLife", reflect: "gioReflect", reflectHit: "gioReflectHit", tree: "gioTree", root: "gioRoot",
  dodge: "gioDodge", burst: "gioBurst", muda: "gioMuda", heal: "gioHeal",
};
export const isGioFx = (kind) => typeof kind === "string" && (kind in GIO_FX_DUR);
export const GIO_TREE_Z = 0.55; // ลอยบนต้นไม้: หมากยกขึ้น (หน่วยช่อง — BoardCanvas บวกเข้า hz)
export const gioLifted = (u) => !!(u && u.giorno && u.giorno.tree);

const GOLD = "255,200,60", GOLD_HI = "255,244,190", LEAF = "90,200,90", LEAF_HI = "190,255,170", BARK = "120,80,40", WHITE = "255,255,255";
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
// กำปั้นของ Gold Experience ที่จุดจอ (x, y) ขนาด s หันมุม a — หลังมือทอง ข้อนิ้ว 4 นิ้ว นิ้วโป้ง ข้อมือม่วงแถบทอง
function fist(g, x, y, s, a, alpha, lowQ) {
  if (!(alpha > 0) || !(s > 0)) return;
  g.save(); g.translate(x, y); g.rotate(a); g.globalAlpha *= Math.min(1, alpha);
  g.lineWidth = Math.max(1, s * 0.06);
  // แขน/ข้อมือ
  g.fillStyle = "rgb(120,60,170)"; g.strokeStyle = "rgb(60,25,80)";
  g.beginPath(); g.rect(-s * 1.15, -s * 0.24, s * 0.62, s * 0.48); g.fill(); g.stroke();
  g.fillStyle = "rgb(250,200,70)"; g.fillRect(-s * 0.62, -s * 0.26, s * 0.1, s * 0.52);
  // หลังมือ
  const grd = g.createLinearGradient(0, -s * 0.4, 0, s * 0.4);
  grd.addColorStop(0, "rgb(255,236,150)"); grd.addColorStop(0.55, "rgb(240,185,50)"); grd.addColorStop(1, "rgb(190,130,25)");
  g.fillStyle = grd; g.strokeStyle = "rgb(110,65,10)";
  g.beginPath();
  if (g.roundRect) g.roundRect(-s * 0.52, -s * 0.38, s * 0.78, s * 0.76, s * 0.18); else g.rect(-s * 0.52, -s * 0.38, s * 0.78, s * 0.76);
  g.fill(); g.stroke();
  // ข้อนิ้ว 4 นิ้ว (ด้านหน้ากำปั้น)
  g.fillStyle = "rgb(250,210,90)";
  for (let i = 0; i < 4; i++) {
    g.beginPath(); g.ellipse(s * 0.28, -s * 0.28 + i * s * 0.187, s * 0.13, s * 0.095, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  }
  // นิ้วโป้ง
  g.fillStyle = "rgb(235,175,45)";
  g.beginPath(); g.ellipse(-s * 0.05, s * 0.4, s * 0.24, s * 0.1, 0.15, 0, Math.PI * 2); g.fill(); g.stroke();
  // จุดม่วงบนหลังมือ + ไฮไลต์
  if (!lowQ) { g.fillStyle = "rgba(130,70,190,.85)"; g.beginPath(); g.arc(-s * 0.18, -s * 0.05, s * 0.09, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = Math.max(1, s * 0.04);
  g.beginPath(); g.moveTo(-s * 0.4, -s * 0.28); g.lineTo(s * 0.05, -s * 0.3); g.stroke();
  g.restore();
}
// เส้นความเร็วหลังกำปั้น จาก (x0, y0) ถึง (x1, y1) จอ · w = ความกว้างพุ่ม · n เส้น
function speedLines(g, x0, y0, x1, y1, w, k, n, seed) {
  if (k <= 0) return;
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const off = (hash01(seed + i) - 0.5) * w, st = 0.15 + hash01(seed + i + 9) * 0.35;
    g.strokeStyle = `rgba(${i % 3 ? GOLD : WHITE},${0.55 * k})`; g.lineWidth = Math.max(1, w * 0.06);
    g.beginPath(); g.moveTo(x0 + dx * st + nx * off, y0 + dy * st + ny * off); g.lineTo(x1 - dx * 0.08 + nx * off * 0.6, y1 - dy * 0.08 + ny * off * 0.6); g.stroke();
  }
  g.restore();
}
// วงคลื่นปะทะบนพื้นรอบช่อง (cx, cy) + เส้นแตกรัศมี · q 0..1 · big = หมัดสุดท้ายของหมัดรัว
function impactRing(g, cx, cy, q, big, seed, lowQ) {
  if (q < 0 || q > 1) return;
  const k = 1 - q, r = 0.25 + easeOut3(q) * (big ? 0.85 : 0.55);
  gEllipse(g, cx, cy, r, 0.02, 40); g.strokeStyle = `rgba(${GOLD_HI},${0.9 * k})`; g.lineWidth = big ? 4 : 3; g.stroke();
  if (big) { gEllipse(g, cx, cy, r * 0.7, 0.02, 40); g.strokeStyle = `rgba(${GOLD},${0.7 * k})`; g.lineWidth = 2; g.stroke(); }
  const [sx, sy, sc] = P(cx, cy, 0.42);
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
  const m = lowQ ? 6 : 12;
  for (let i = 0; i < m; i++) {
    const th = (i / m) * Math.PI * 2 + hash01(seed + i) * 0.4, d0 = sc * (0.12 + q * 0.2), d1 = sc * (0.3 + easeOut3(q) * (big ? 0.75 : 0.5));
    g.strokeStyle = `rgba(${i % 2 ? GOLD_HI : WHITE},${k})`; g.lineWidth = 1 + sc * 0.025 * k;
    g.beginPath(); g.moveTo(sx + Math.cos(th) * d0, sy + Math.sin(th) * d0 * 0.7); g.lineTo(sx + Math.cos(th) * d1, sy + Math.sin(th) * d1 * 0.7); g.stroke();
  }
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
  const [ax, ay] = P(ox, oy, 0.45), [sx, sy, sc] = P(tx, ty, 0.45);
  const ang = Math.atan2(sy - ay, sx - ax);
  g.save();
  // ง้าง (ถอยนิด) → พุ่งเข้าเป้า → ค้างที่เป้าแล้วจาง
  const W = HIT * 0.45, drive = clamp01((t - W) / (HIT - W));
  const u = t < W ? -0.15 * Math.sin((t / W) * Math.PI / 2) : -0.15 + 0.97 * easeOut3(drive);
  const fx = ax + (sx - ax) * u, fy = ay + (sy - ay) * u;
  const fade = t < HIT ? 1 : 1 - clamp01((t - HIT) / 0.35);
  if (t > W && t < HIT + 0.1) speedLines(g, ax, ay, fx, fy, sc * 0.7, t < HIT ? 1 : 1 - (t - HIT) / 0.1, lowQ ? 4 : 8, e.to.x * 3 + e.to.y);
  if (!lowQ && t > W) glow(g, fx, fy, sc * 0.6, GOLD, 0.5 * fade);
  fist(g, fx, fy, sc * 0.9 * (t < HIT ? 1 : 1 + (t - HIT) * 0.5), ang, fade, lowQ);
  if (t >= HIT) {
    const q = (t - HIT) / (1 - HIT);
    if (q < 0.22) glow(g, sx, sy, sc * (0.7 + q * 1.8), WHITE, 0.95 * (1 - q / 0.22));
    impactRing(g, tx, ty, q, true, e.to.x * 11 + e.to.y, lowQ);
    sparks(g, sx, sy, sc * 1.3, q, GOLD_HI, 14, e.to.x * 7 + e.to.y, lowQ);
    risingLeaves(g, tx, ty, q, 5, e.to.x * 13 + e.to.y, lowQ);
  }
  g.restore();
}

// ---------- ติดคริ: หมัดรัว ----------
//  หมัด 16 หมัด (lowQ 8) พุ่งจากด้านผู้ตีเยื้องมุมเข้าจุดสุ่มรอบเป้า (เงาหมัดซ้อน 2 ชั้น · ปะทะแวบขาว) → หมัดสุดท้ายใหญ่กลางเป้า วงคลื่นคู่
const RUSH_END = 0.72;
function gioRush(g, e, now, lowQ) {
  const t = (now - e.t0) / GIO_MS.gioRush;
  if (t <= 0 || t >= 1) return;
  const [ox, oy] = center(e), tx = e.to.x + 0.5, ty = e.to.y + 0.5;
  const [ax, ay] = P(ox, oy, 0.45), [sx, sy, sc] = P(tx, ty, 0.45);
  const base = Math.atan2(sy - ay, sx - ax), n = lowQ ? 8 : 16, span = RUSH_END - GIO_HIT_P.gioRush;
  g.save();
  if (t < RUSH_END + 0.1) glow(g, ax, ay, sc * 0.55, GOLD, 0.35 * (1 - Math.max(0, t - RUSH_END) / 0.1));
  for (let i = 0; i < n; i++) {
    const t0 = GIO_HIT_P.gioRush + (i / n) * span - 0.06, u = (t - t0) / 0.06;
    if (u < 0 || u > 2.2) continue;
    const a = base + (hash01(i * 3 + 1) - 0.5) * 0.6;
    const hx = sx + (hash01(i * 7 + 2) - 0.5) * sc * 0.7, hy = sy + (hash01(i * 5 + 3) - 0.5) * sc * 0.6;
    const k = u <= 1 ? easeOut3(u) : 1, back = sc * 0.9 * (1 - k);
    const fx = hx - Math.cos(a) * back, fy = hy - Math.sin(a) * back;
    if (!lowQ && u <= 1) for (let j = 1; j <= 2; j++) fist(g, fx - Math.cos(a) * sc * 0.13 * j, fy - Math.sin(a) * sc * 0.13 * j, sc * 0.52, a, 0.28 / j, true);
    fist(g, fx, fy, sc * 0.52, a, u <= 1 ? 1 : 1 - (u - 1) / 1.2, lowQ);
    if (u >= 1 && u < 1.4) glow(g, hx + Math.cos(a) * sc * 0.08, hy + Math.sin(a) * sc * 0.08, sc * 0.2, WHITE, 0.85 * (1 - (u - 1) / 0.4));
  }
  const finHit = RUSH_END + 0.08;
  if (t >= RUSH_END) {
    const u = clamp01((t - RUSH_END) / (finHit - RUSH_END)), q = clamp01((t - finHit) / (1 - finHit));
    const fx = sx - Math.cos(base) * sc * (1 - easeOut3(u)), fy = sy - Math.sin(base) * sc * (1 - easeOut3(u));
    if (u < 1) speedLines(g, ax, ay, fx, fy, sc * 0.55, 1, lowQ ? 5 : 10, 77);
    fist(g, fx, fy, sc * 1.1 * (1 + q * 0.3), base, 1 - q, lowQ);
    if (t >= finHit) {
      if (q < 0.2) glow(g, sx, sy, sc * (0.7 + q * 2), WHITE, 0.95 * (1 - q / 0.2));
      impactRing(g, tx, ty, q, true, 91, lowQ);
      sparks(g, sx, sy, sc * 1.4, q, GOLD_HI, 18, 93, lowQ);
      risingLeaves(g, tx, ty, q, 8, 95, lowQ);
    }
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
    fist(g, x, y, s * 0.2, th + Math.PI, 1 - u * 0.5, lowQ);
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
  if (t < 0.35) { const k = t / 0.35; fist(g, sx - sc * 0.4 * (1 - k), sy, sc * 0.22, 0, 1 - k * 0.6, lowQ); }
  glow(g, sx, sy, sc * 0.5, LEAF_HI, 0.45 * (1 - t));
  risingLeaves(g, cx, cy, clamp01((t - 0.2) / 0.8), 7, 97, lowQ);
  sparks(g, sx, sy, sc, clamp01((t - 0.25) / 0.6), GOLD_HI, 8, 101, lowQ);
  g.restore();
}

const DRAW = { gioPunch, gioRush, gioLife, gioReflect, gioReflectHit, gioTree, gioRoot, gioDodge, gioBurst, gioMuda, gioHeal };
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
