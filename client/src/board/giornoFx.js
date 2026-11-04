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
//    awake      ตื่นร่าง Requiem: เสาไฟทองพุ่ง + วงแหวน + ลิ้นไฟรอบเสา
//    bullet     กระสุนชีวิต { tiles, dir }: ลำทอง-เขียววิ่งตามช่อง แตกเป็นใบไม้ทุกช่อง
//    slam       พุ่งชนกระแทก { to }: เส้นความเร็ว + กำปั้น → ปะทะ เศษทองแตกกระเด็น
//    rewind     Return to Zero { attacker, from, back, gioAt, seconds } — ทั้งแผนที่ ดูหัวข้อ Return to Zero · gioPose ถอยหมากจริง ·
//               gioRewindLayer ครอบกระดาน (ทับตัวหมาก) · gioRewind ภาพติดตา/เลือดย้อน (ชั้นบนสุด)
//    loopRevive / loopDie  ไปสู่ภพภูมิที่ดี: วงลูกศรม่วงคล้ำวนซ้ำ ฟื้น/ตาย
//  ตัวหมาก (u.giorno = { tree, reflect, muda, requiem, arrowWait, loop }): requiem = เปลวทองรอบหมาก (หน้า/หลัง + ประกาย) ·
//    arrowWait = รอผลธนู: ลำแสงทองเส้นตรงแผ่รอบรูป เสาแสงแคบ ธนูปักตัว เต้นเป็นจังหวะ · loop = วงมืดจางใต้หมาก · ลอยบนต้นไม้ = ต้นไม้ใต้หมาก หมากยกสูง (GIO_TREE_Z) ·
//    ต้นตอแห่งชีวิต = วงเต่าทองทองหมุนใต้ตัว · Muda = ออร่าทองเต้นใต้ตัว
//  lowQ = ตัดประกาย/ใบไม้ครึ่งหนึ่ง · ลดการเคลื่อนไหว = ไม่หมุน ไม่เต้น
// ============================================================
import { P, gEllipse, glow } from "./boardGeo";

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export const GIO_MS = { gioPunch: 820, gioRush: 1700 };
export const GIO_HIT_P = { gioPunch: 0.45, gioRush: 0.22 }; // ปะทะแรก (ตัวเลขดาเมจขึ้น) — หมัดรัวต่อจนจบท่า
export const GIO_FX_DUR = { ...GIO_MS, gioLife: 1300, gioReflect: 1200, gioReflectHit: 900, gioTree: 1400, gioRoot: 1300, gioDodge: 800, gioBurst: 1200, gioMuda: 1400, gioHeal: 1100, gioAwake: 1700, gioBullet: 900, gioSlam: 1000, gioRewind: 2600, gioLoopRevive: 1400, gioLoopDie: 1300 };
export const GIO_EVENT_FX = {
  life: "gioLife", reflect: "gioReflect", reflectHit: "gioReflectHit", tree: "gioTree", root: "gioRoot",
  dodge: "gioDodge", burst: "gioBurst", muda: "gioMuda", heal: "gioHeal",
  awake: "gioAwake", bullet: "gioBullet", slam: "gioSlam", rewind: "gioRewind", loopRevive: "gioLoopRevive", loopDie: "gioLoopDie",
};
export const GIO_REWIND_HIT = 0.2; // สัดส่วนเวลาที่คลื่นถึงตัวผู้โจมตี (จอสั่น — BoardStage)
export const GIO_SLAM_HIT = 0.3;
export const isGioFx = (kind) => typeof kind === "string" && (kind in GIO_FX_DUR);
export const GIO_TREE_Z = 0.55; // ลอยบนต้นไม้: หมากยกขึ้น (หน่วยช่อง — BoardCanvas บวกเข้า hz)
export const gioLifted = (u) => !!(u && u.giorno && u.giorno.tree);

const GOLD = "255,200,60", GOLD_HI = "255,244,190", LEAF = "90,200,90", LEAF_HI = "190,255,170", BARK = "120,80,40", WHITE = "255,255,255";
const VIOLET = "150,80,255", VIOLET_HI = "215,175,255", VIOLET_DK = "34,10,62", GLOW_MAX = 240;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const hash01 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const center = (e) => [e.x + (e.size || 1) / 2, e.y + (e.size || 1) / 2];
const prog = (e, now) => (now - e.t0) / (e.dur || GIO_FX_DUR[e.kind] || 1000);

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

// ---------- ร่าง Gold Experience Requiem ----------
// glow ที่จำกัดขนาดบนจอ: ตอนซูมกล้องสเกลโตมาก ห้ามแสงโตตามจนจอขาว
const glowCap = (g, x, y, r, rgb, a) => glow(g, x, y, Math.min(r, GLOW_MAX), rgb, a);
const lerp = (a, b, k) => a + (b - a) * k;
const capS = (s) => Math.min(s, 130); // สเกลสำหรับเส้น/ชิ้นเล็ก: ซูมแล้วไม่หนาตาม

// ลิ้นไฟ 1 ลิ้นลงใน path ปัจจุบัน: โคน (x, y) ครึ่งกว้าง w สูง h ปลายเอน lean px
function tongue(g, x, y, w, h, lean) {
  g.moveTo(x - w, y);
  g.bezierCurveTo(x - w * 0.95, y - h * 0.38, x + lean * 0.3 - w * 0.5, y - h * 0.62, x + lean, y - h);
  g.bezierCurveTo(x + lean * 0.3 + w * 0.65, y - h * 0.56, x + w * 0.95, y - h * 0.3, x + w, y);
  g.quadraticCurveTo(x, y + w * 0.55, x - w, y);
  g.closePath();
}
// เติมลิ้นไฟทั้งชุด (list = [x, y, w, h, lean]) 3 ชั้น: ขอบส้ม → ทอง → แกนขาวอมเหลือง · ไล่สีแนวตั้ง y0 → y1
function fillFlames(g, list, y0, y1, a, core = true) {
  const paint = (kw, kh, c0, c1, c2) => {
    const gr = g.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, c0); gr.addColorStop(0.5, c1); gr.addColorStop(1, c2);
    g.fillStyle = gr; g.beginPath();
    for (const f of list) tongue(g, f[0], f[1], f[2] * kw, f[3] * kh, f[4] * kh);
    g.fill();
  };
  paint(1, 1, `rgba(255,150,25,${0.75 * a})`, `rgba(255,130,20,${0.5 * a})`, "rgba(255,110,10,0)");
  paint(0.68, 0.8, `rgba(255,214,70,${0.95 * a})`, `rgba(255,190,50,${0.7 * a})`, "rgba(255,170,30,0)");
  if (core) paint(0.34, 0.55, `rgba(255,252,225,${a})`, `rgba(255,240,170,${0.75 * a})`, "rgba(255,230,140,0)");
}
const flick = (T, i, sp) => 0.5 + 0.25 * Math.sin(T / sp + i * 2.4) + 0.25 * Math.sin(T / (sp * 0.43) + i * 5.1);
// ประกายสี่แฉก
function star4(g, x, y, r, rgb, a) {
  g.fillStyle = `rgba(${rgb},${a})`; g.beginPath();
  g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r);
  g.fill();
}
// รูปวาดล่วงหน้าครั้งเดียว
const SPR = new Map();
function sprite(name, w, h, draw) {
  const key = `${name}${w}x${h}`;
  let c = SPR.get(key);
  if (!c) {
    c = document.createElement("canvas"); c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    SPR.set(key, c);
  }
  return c;
}
// ออร่าบนหมากทุกตัววาดล่วงหน้าเป็นรูป (วาดต่อเฟรมแค่ drawImage): กรอบอ้างอิง s = 100 → กล่อง 220 × 300 ฐานหมากอยู่ที่ (110, 250)
const AURA_W = 220, AURA_H = 300, AURA_BASE = 250, FLAME_N = 12;
const floop = (p, i) => 0.5 + 0.25 * Math.sin(p + i * 2.4) + 0.25 * Math.sin(2 * p + i * 5.1);
const auraRes = (lowQ) => (lowQ ? 0.8 : 1.5);
function flameBackFrame(x, f, lowQ) {
  const res = auraRes(lowQ), p = (f / FLAME_N) * Math.PI * 2, bx = 110, baseY = AURA_BASE, s = 100, hy = baseY - 86, hexR = 40;
  x.scale(res, res);
  const gl = x.createRadialGradient(bx, hy, 0, bx, hy, 92);
  gl.addColorStop(0, `rgba(${GOLD},.36)`); gl.addColorStop(1, `rgba(${GOLD},0)`);
  x.fillStyle = gl; x.fillRect(bx - 92, hy - 92, 184, 184);
  const n = lowQ ? 8 : 15, list = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, sn = Math.sin(a), k = floop(p, i), edge = Math.abs(Math.cos(a));
    if (sn > 0.25) continue; // ครึ่งหน้า = flameFrontFrame
    list.push([bx + Math.cos(a) * s * 0.44, baseY + sn * s * 0.17, s * (0.12 + edge * 0.07), s * (1.15 + 0.7 * k + edge * 0.5), Math.sin(p + i) * s * 0.14]);
  }
  fillFlames(x, list, baseY, hy - hexR * 1.5, 0.95);
  // ม่านเปลวรอบรูป: โคนรอบหกเหลี่ยม ปลายพุ่งเลยหัว (รูปบังตรงกลาง)
  const m = lowQ ? 6 : 11, top = [];
  for (let i = 0; i < m; i++) {
    const X = -1.28 + (i / (m - 1)) * 2.56, side = Math.abs(X);
    top.push([bx + X * hexR, hy + hexR * (0.72 - side * 0.32), hexR * 0.36, hexR * (2 + 1.1 * floop(p, i + 20) - side * 0.5), Math.sin(p + i * 1.7) * hexR * 0.32]);
  }
  fillFlames(x, top, hy + hexR, hy - hexR * 2.3, 1);
}
function flameFrontFrame(x, f, lowQ) {
  const res = auraRes(lowQ), p = (f / FLAME_N) * Math.PI * 2, bx = 110, baseY = 80, s = 100;
  x.scale(res, res);
  const n = lowQ ? 4 : 8, list = [];
  for (let i = 0; i < n; i++) {
    const a = 0.3 + (i / (n - 1)) * (Math.PI - 0.6);
    list.push([bx + Math.cos(a) * s * 0.42, baseY + Math.sin(a) * s * 0.17, s * 0.075, s * (0.26 + 0.34 * floop(p, i + 40)), Math.sin(p + i * 1.3) * s * 0.07]);
  }
  fillFlames(x, list, baseY + s * 0.15, baseY - s * 0.55, 0.9, !lowQ);
}
const flameIdx = (T, lowQ) => { const i = Math.floor(T / 65) % FLAME_N; return lowQ ? i & ~1 : i; };
// เปลวทองด้านหลังหมาก: วงพื้น + แสง + ลิ้นไฟรอบฐาน + ม่านเปลวรอบรูป (เฟรมวน)
function requiemBack(g, u, now, wx, wy) {
  const lowQ = !!u.lowQ, T = REDUCED ? 0 : now, [bx, by, s] = P(wx, wy), K = u.k || 1, baseY = by - (u.hz || 0) * s * 0.85, pulse = 0.82 + 0.18 * Math.sin(T / 260);
  gEllipse(g, wx, wy, 0.54 * K, (u.hz || 0) + 0.01, 32); g.fillStyle = `rgba(${GOLD},${0.2 * pulse})`; g.fill();
  g.strokeStyle = `rgba(${GOLD_HI},${0.75 * pulse})`; g.lineWidth = 1.6; g.stroke();
  const res = auraRes(lowQ), i = flameIdx(T, lowQ), k = (s * K) / 100;
  const f = sprite(`fb${i}`, Math.ceil(AURA_W * res), Math.ceil(AURA_H * res), (x) => flameBackFrame(x, i, lowQ));
  g.drawImage(f, bx - 110 * k, baseY - AURA_BASE * k, AURA_W * k, AURA_H * k);
}
// เปลวทองด้านหน้าหมาก: ลิ้นไฟเตี้ยที่ฐาน (ไม่บังรูป) + ประกายลอยขึ้น
function requiemFront(g, u, now, wx, wy) {
  const lowQ = !!u.lowQ, T = REDUCED ? 0 : now, [bx, by, s] = P(wx, wy), K = u.k || 1, baseY = by - (u.hz || 0) * s * 0.85;
  const res = auraRes(lowQ), i = flameIdx(T, lowQ), k = (s * K) / 100;
  const f = sprite(`ff${i}`, Math.ceil(AURA_W * res), Math.ceil(120 * res), (x) => flameFrontFrame(x, i, lowQ));
  g.drawImage(f, bx - 110 * k, baseY - 80 * k, AURA_W * k, 120 * k);
  const m = lowQ ? 5 : 14, z0 = u.hz || 0;
  g.save(); g.globalCompositeOperation = "lighter";
  for (let j = 0; j < m; j++) {
    const age = ((T / 1500) + j / m + hash01(j + 7) * 0.5) % 1, th = hash01(j + 90) * Math.PI * 2 + age * 1.6, r = (0.26 + 0.34 * hash01(j + 3)) * K;
    const [ex, ey, es] = P(wx + Math.cos(th) * r, wy + Math.sin(th) * r, z0 + 0.15 + age * 1.9);
    star4(g, ex, ey, Math.max(1.5, es * (j % 3 ? 0.028 : 0.05)), j % 3 ? GOLD_HI : WHITE, Math.sin(Math.PI * age) * 0.95);
  }
  g.restore();
}
// รอผลธนู (ธนูปักตัว — ไม่ใช่เปลวไฟ): ลำแสงเส้นตรงแผ่รอบรูป + เสาแสงแคบพุ่งขึ้น + วงพื้นเต้นตามจังหวะหัวใจ · รูปวาดล่วงหน้า หมุน/ย่อขยายตามจังหวะ
const arrowBeat = (T) => { const q = (T / 1100) % 1; return Math.max(Math.exp(-q * 7), q > 0.22 ? 0.75 * Math.exp(-(q - 0.22) * 8) : 0); };
function drawArrowRays(x, W) {
  const H = W / 2, R0 = H * 0.2, n = 16;
  x.translate(H, H);
  const gl = x.createRadialGradient(0, 0, 0, 0, 0, H * 0.62);
  gl.addColorStop(0, "rgba(255,220,110,.85)"); gl.addColorStop(1, "rgba(255,200,60,0)");
  x.fillStyle = gl; x.fillRect(-H, -H, W, W);
  const gr = x.createRadialGradient(0, 0, R0, 0, 0, H);
  gr.addColorStop(0, "rgba(255,246,190,1)"); gr.addColorStop(0.5, "rgba(255,200,55,.9)"); gr.addColorStop(1, "rgba(255,180,30,0)");
  x.fillStyle = gr; x.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, l = H * (0.68 + 0.32 * hash01(i + 601)) * (i % 2 ? 1 : 0.8), d = 0.13 + 0.09 * hash01(i + 611);
    x.moveTo(Math.cos(a - d) * R0, Math.sin(a - d) * R0); x.lineTo(Math.cos(a) * l, Math.sin(a) * l); x.lineTo(Math.cos(a + d) * R0, Math.sin(a + d) * R0); x.closePath();
  }
  x.fill();
}
function drawArrowColumn(x, W, H) {
  const col = x.createLinearGradient(0, H, 0, 0);
  col.addColorStop(0, "rgba(255,226,120,.95)"); col.addColorStop(0.55, "rgba(255,205,70,.65)"); col.addColorStop(1, "rgba(255,205,70,0)");
  x.fillStyle = col; x.beginPath(); x.moveTo(0, H); x.lineTo(W * 0.35, 0); x.lineTo(W * 0.65, 0); x.lineTo(W, H); x.closePath(); x.fill();
}
function arrowBack(g, u, now, wx, wy) {
  const lowQ = !!u.lowQ, T = REDUCED ? 0 : now, beat = REDUCED ? 0.5 : arrowBeat(T), [bx, by, s] = P(wx, wy), K = u.k || 1;
  const baseY = by - (u.hz || 0) * s * 0.85, hy = baseY - s * 0.86 * K, hexR = s * 0.4 * K, Hz = Math.min(3.4, 300 / s);
  for (let i = 0; i < (lowQ ? 1 : 2); i++) {
    const q = (T / 1100 + i * 0.5) % 1;
    gEllipse(g, wx, wy, 0.35 + q * 0.75, (u.hz || 0) + 0.01, 32); g.strokeStyle = `rgba(${GOLD_HI},${0.75 * (1 - q)})`; g.lineWidth = 2; g.stroke();
  }
  const w = hexR * (0.68 + 0.3 * beat), top = Hz * s * 0.85, a0 = g.globalAlpha;
  g.globalAlpha = a0 * (0.8 + 0.2 * beat);
  g.drawImage(sprite("arrowCol", 64, 256, drawArrowColumn), bx - w, baseY - top, w * 2, top);
  const L = hexR * (3 + 1.5 * beat), S = lowQ ? 256 : 512;
  g.save(); g.translate(bx, hy); g.rotate(T / 5200); g.drawImage(sprite("arrowRay", S, S, drawArrowRays), -L, -L, L * 2, L * 2); g.restore();
  g.globalAlpha = a0;
}
// หน้ารูปหมาก: ธนูทองปักตัว + วงแสงรอบรูปเต้น + ประกายพุ่งตรงขึ้น
function arrowFront(g, u, now, wx, wy) {
  const lowQ = !!u.lowQ, T = REDUCED ? 0 : now, beat = REDUCED ? 0.5 : arrowBeat(T), [bx, by, s] = P(wx, wy), K = u.k || 1;
  const baseY = by - (u.hz || 0) * s * 0.85, hy = baseY - s * 0.86 * K, hexR = s * 0.4 * K, z0 = u.hz || 0;
  g.save(); g.translate(bx + hexR * 0.32, hy - hexR * 0.3); g.rotate(-0.85); g.lineCap = "round";
  g.strokeStyle = "rgb(110,65,10)"; g.lineWidth = Math.max(2.5, hexR * 0.12); g.beginPath(); g.moveTo(0, 0); g.lineTo(hexR * 1.05, 0); g.stroke();
  g.strokeStyle = "rgb(255,214,90)"; g.lineWidth = Math.max(1.5, hexR * 0.07); g.stroke();
  g.fillStyle = "rgb(255,230,140)"; g.strokeStyle = "rgb(110,65,10)"; g.lineWidth = 1;
  g.beginPath(); g.moveTo(hexR * 0.82, 0); g.lineTo(hexR * 1.2, -hexR * 0.17); g.lineTo(hexR * 1.1, 0); g.lineTo(hexR * 1.2, hexR * 0.17); g.closePath(); g.fill(); g.stroke();
  g.restore();
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
  g.strokeStyle = `rgba(${GOLD_HI},${0.35 + 0.6 * beat})`; g.lineWidth = Math.max(1.5, hexR * (0.04 + 0.05 * beat));
  g.beginPath(); g.arc(bx, hy, hexR * (1.06 + 0.14 * beat), 0, Math.PI * 2); g.stroke();
  const m = lowQ ? 6 : 16;
  for (let i = 0; i < m; i++) {
    const age = ((T / 1000) + i / m + hash01(i + 621) * 0.5) % 1, th = hash01(i + 631) * Math.PI * 2, r = (0.12 + 0.42 * hash01(i + 641)) * K;
    const x0 = wx + Math.cos(th) * r, y0 = wy + Math.sin(th) * r, [ex, ey, es] = P(x0, y0, z0 + 0.1 + age * 2.4), [lx, ly] = P(x0, y0, z0 + 0.1 + Math.max(0, age - 0.12) * 2.4), a = Math.sin(Math.PI * age);
    g.strokeStyle = `rgba(${i % 3 ? GOLD_HI : WHITE},${a * 0.9})`; g.lineWidth = Math.max(1, es * 0.012); g.beginPath(); g.moveTo(lx, ly); g.lineTo(ex, ey); g.stroke();
    if (i % 4 === 0) star4(g, ex, ey, Math.max(2, es * 0.04), WHITE, a);
  }
  g.restore();
}
// วงวนซ้ำ (ลูกศร 3 เส้นไล่หางกัน) รอบ (cx, cy) รัศมี r ช่อง ที่ความสูง z
function loopRing(g, cx, cy, r, z, rot, rgb, a, w) {
  if (a <= 0) return;
  const n = 3;
  g.strokeStyle = `rgba(${rgb},${a})`; g.fillStyle = `rgba(${rgb},${a})`; g.lineWidth = w; g.lineCap = "round";
  for (let k = 0; k < n; k++) {
    const a0 = rot + (k / n) * Math.PI * 2, a1 = a0 + (Math.PI * 2 / n) * 0.72;
    g.beginPath();
    for (let i = 0; i <= 12; i++) { const th = lerp(a0, a1, i / 12), p = P(cx + Math.cos(th) * r, cy + Math.sin(th) * r, z); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
    g.stroke();
    const tip = P(cx + Math.cos(a1 + 0.24) * r, cy + Math.sin(a1 + 0.24) * r, z), l = P(cx + Math.cos(a1) * r * 0.88, cy + Math.sin(a1) * r * 0.88, z), o = P(cx + Math.cos(a1) * r * 1.12, cy + Math.sin(a1) * r * 1.12, z);
    g.beginPath(); g.moveTo(tip[0], tip[1]); g.lineTo(l[0], l[1]); g.lineTo(o[0], o[1]); g.closePath(); g.fill();
  }
}

// ---------- ตื่นร่าง ----------
function gioAwake(g, e, now, lowQ) {
  const t = prog(e, now);
  if (t <= 0 || t >= 1) return;
  const [cx, cy] = center(e), [bx, by, sc] = P(cx, cy, 0), env = t < 0.16 ? easeOut3(t / 0.16) : 1 - clamp01((t - 0.62) / 0.38);
  const Hz = Math.min(6, 520 / sc), [tx, ty] = P(cx, cy, Hz), w = Math.min(sc * 0.62, 130) * env, T = REDUCED ? 0 : now;
  g.save();
  impactRing(g, cx, cy, clamp01(t / 0.5), true, 201, lowQ);
  impactRing(g, cx, cy, clamp01((t - 0.14) / 0.55), true, 203, lowQ);
  gEllipse(g, cx, cy, 0.5 + easeOut3(clamp01(t / 0.3)) * 0.5, 0.01, 40); g.fillStyle = `rgba(${GOLD},${0.3 * env})`; g.fill();
  // เสาแสง: แผ่นไล่สีแนวนอน กว้างขึ้นด้านบน
  const gr = g.createLinearGradient(bx - w * 1.2, 0, bx + w * 1.2, 0);
  gr.addColorStop(0, "rgba(255,160,30,0)"); gr.addColorStop(0.28, `rgba(255,175,40,${0.62 * env})`); gr.addColorStop(0.5, `rgba(255,250,215,${0.96 * env})`); gr.addColorStop(0.72, `rgba(255,175,40,${0.62 * env})`); gr.addColorStop(1, "rgba(255,160,30,0)");
  g.fillStyle = gr; g.beginPath(); g.moveTo(bx - w * 0.75, by); g.lineTo(tx - w * 1.2, ty); g.lineTo(tx + w * 1.2, ty); g.lineTo(bx + w * 0.75, by); g.closePath(); g.fill();
  // ลิ้นไฟรอบเสา
  const n = lowQ ? 8 : 16, list = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, f = flick(T, i, 120);
    list.push([bx + Math.cos(a) * w * 0.95, by + Math.sin(a) * sc * 0.2, sc * 0.11 * env, sc * (1.2 + 1.6 * f) * env, Math.sin(T / 160 + i) * sc * 0.2]);
  }
  fillFlames(g, list, by, by - sc * 3, env);
  g.globalCompositeOperation = "lighter";
  const m = lowQ ? 10 : 24;
  for (let i = 0; i < m; i++) {
    const age = clamp01((t - hash01(i + 3) * 0.45) / 0.55), th = hash01(i + 11) * Math.PI * 2, r = 0.3 + hash01(i + 13) * 0.7;
    if (age <= 0 || age >= 1) continue;
    const [x, y, s] = P(cx + Math.cos(th) * r, cy + Math.sin(th) * r, 0.2 + easeOut3(age) * 3.2);
    star4(g, x, y, Math.max(2, s * 0.05), i % 3 ? GOLD_HI : WHITE, 1 - age);
  }
  if (t < 0.14) glowCap(g, bx, by - sc * 0.5, sc * 1.1, WHITE, 0.7 * (1 - t / 0.14));
  g.restore();
}

// ---------- กระสุนชีวิต ----------
function gioBullet(g, e, now, lowQ) {
  const t = prog(e, now), tiles = Array.isArray(e.tiles) ? e.tiles.filter((c) => c && Number.isFinite(c.x) && Number.isFinite(c.y)) : [];
  if (t <= 0 || t >= 1 || !tiles.length) return;
  const [ox, oy] = center(e), last = tiles[tiles.length - 1], ex = last.x + 0.5, ey = last.y + 0.5, FLY = 0.55;
  const head = clamp01(t / FLY), tail = clamp01((t - 0.2) / FLY), k = 1 - clamp01((t - 0.72) / 0.28);
  const a = P(lerp(ox, ex, tail), lerp(oy, ey, tail), 0.5), b = P(lerp(ox, ex, head), lerp(oy, ey, head), 0.5), sc = capS(b[2]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  g.save(); g.lineCap = "round"; g.globalCompositeOperation = "lighter";
  if (head > tail) {
    const line = (rgb, w, al) => { g.strokeStyle = `rgba(${rgb},${al * k})`; g.lineWidth = Math.max(1.5, w); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); };
    line(LEAF, sc * 0.2, 0.5); line(GOLD, sc * 0.11, 0.9); line(WHITE, sc * 0.035, 1);
  }
  if (head < 1) {
    if (!lowQ) glowCap(g, b[0], b[1], sc * 0.42, GOLD, 0.7);
    g.save(); g.translate(b[0], b[1]); g.rotate(ang);
    g.fillStyle = `rgb(${GOLD_HI})`; g.beginPath(); g.ellipse(0, 0, sc * 0.2, sc * 0.075, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = `rgb(${WHITE})`; g.beginPath(); g.ellipse(sc * 0.05, 0, sc * 0.1, sc * 0.04, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  g.restore();
  tiles.forEach((c, i) => {
    const q = (t - ((i + 1) / tiles.length) * FLY) / 0.4;
    if (q < 0 || q > 1) return;
    const cx = c.x + 0.5, cy = c.y + 0.5, [sx, sy, ss] = P(cx, cy, 0.45);
    gEllipse(g, cx, cy, 0.18 + easeOut3(q) * 0.34, 0.02, 24); g.strokeStyle = `rgba(${GOLD_HI},${1 - q})`; g.lineWidth = 2; g.stroke();
    sparks(g, sx, sy, ss * 0.7, q, GOLD_HI, 8, 211 + i, lowQ);
    risingLeaves(g, cx, cy, q, 3, 221 + i, lowQ);
  });
}

// ---------- พุ่งชนกระแทก ----------
function gioSlam(g, e, now, lowQ) {
  const t = prog(e, now);
  if (t <= 0 || t >= 1 || !e.to) return;
  const [ox, oy] = center(e), tx = e.to.x + 0.5, ty = e.to.y + 0.5, HIT = GIO_SLAM_HIT;
  const a = P(ox, oy, 0.45), [sx, sy, sc] = P(tx, ty, 0.45), ang = Math.atan2(sy - a[1], sx - a[0]), far = Math.hypot(tx - ox, ty - oy) > 0.1;
  g.save();
  if (t < HIT + 0.12 && far) {
    const u = easeOut3(clamp01(t / HIT)), fx = lerp(a[0], sx, u), fy = lerp(a[1], sy, u), k = t < HIT ? 1 : 1 - (t - HIT) / 0.12;
    speedLines(g, a[0], a[1], fx, fy, capS(sc) * 0.9, k, lowQ ? 6 : 12, 231);
    g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
    g.strokeStyle = `rgba(${GOLD},${0.8 * k})`; g.lineWidth = Math.max(3, capS(sc) * 0.2); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(fx, fy); g.stroke();
    g.strokeStyle = `rgba(${WHITE},${k})`; g.lineWidth = Math.max(1, capS(sc) * 0.05); g.stroke();
    g.restore();
    if (t < HIT) fist(g, fx, fy, capS(sc) * 0.75, ang, 1, lowQ);
  }
  if (t >= HIT) {
    const q = (t - HIT) / (1 - HIT), m = lowQ ? 8 : 16;
    if (q < 0.16) glowCap(g, sx, sy, sc * (0.7 + q * 2), WHITE, 0.85 * (1 - q / 0.16));
    impactRing(g, tx, ty, q, true, 233, lowQ);
    impactRing(g, tx, ty, clamp01(q * 1.4 - 0.2), true, 235, lowQ);
    // เศษทองแตกกระเด็นโค้งตก
    for (let i = 0; i < m; i++) {
      const th = hash01(i + 241) * Math.PI * 2, sp = 0.5 + hash01(i + 251) * 0.8, d = easeOut3(q) * sp;
      const z = 0.1 + Math.sin(Math.PI * Math.min(1, q * 1.15)) * (0.7 + hash01(i + 261) * 0.8);
      const [x, y, s] = P(tx + Math.cos(th) * d, ty + Math.sin(th) * d, z), r = capS(s) * 0.05 * (1 - q * 0.5);
      g.save(); g.translate(x, y); g.rotate(th + q * 9);
      g.fillStyle = `rgba(${i % 3 ? GOLD : GOLD_HI},${1 - q * q})`; g.beginPath(); g.moveTo(0, -r); g.lineTo(r * 0.8, r * 0.7); g.lineTo(-r * 0.8, r * 0.7); g.closePath(); g.fill();
      g.restore();
    }
  }
  g.restore();
}

// ---------- วนตาย ----------
function gioLoopRevive(g, e, now, lowQ) {
  const t = prog(e, now);
  if (t <= 0 || t >= 1) return;
  const [cx, cy] = center(e), [sx, sy, sc] = P(cx, cy, 0.5), env = t < 0.2 ? t / 0.2 : 1 - clamp01((t - 0.65) / 0.35), rot = REDUCED ? 0 : -t * 7;
  g.save();
  gEllipse(g, cx, cy, 0.85, 0.01, 40); g.fillStyle = `rgba(${VIOLET_DK},${0.6 * env})`; g.fill();
  loopRing(g, cx, cy, 0.72, 0.02, rot, VIOLET, 0.95 * env, 3);
  loopRing(g, cx, cy, 0.48, 0.5 + t * 0.5, -rot * 0.7, VIOLET_HI, 0.7 * env, 2);
  glowCap(g, sx, sy, sc * 0.75, VIOLET, 0.45 * env);
  g.globalCompositeOperation = "lighter";
  const m = lowQ ? 7 : 16;
  for (let i = 0; i < m; i++) {
    const age = clamp01((t - hash01(i + 301) * 0.5) / 0.5), th = hash01(i + 311) * Math.PI * 2 + age * 3, r = 0.2 + hash01(i + 321) * 0.45;
    if (age <= 0 || age >= 1) continue;
    const [x, y, s] = P(cx + Math.cos(th) * r, cy + Math.sin(th) * r, 0.1 + age * 1.5);
    star4(g, x, y, Math.max(1.5, capS(s) * 0.035), i % 3 ? VIOLET_HI : WHITE, Math.sin(Math.PI * age));
  }
  g.restore();
}
function gioLoopDie(g, e, now, lowQ) {
  const t = prog(e, now);
  if (t <= 0 || t >= 1) return;
  const [cx, cy] = center(e), [sx, sy, sc] = P(cx, cy, 0.5), env = 1 - clamp01((t - 0.8) / 0.2), rot = REDUCED ? 0 : t * 9;
  g.save();
  gEllipse(g, cx, cy, 0.8, 0.01, 40); g.fillStyle = `rgba(${VIOLET_DK},${0.7 * env})`; g.fill();
  // วงหุบเข้าตัวซ้ำ 3 ครั้ง
  for (let i = 0; i < 3; i++) {
    const q = clamp01((t - i * 0.24) / 0.3);
    if (q <= 0 || q >= 1) continue;
    loopRing(g, cx, cy, 1 - easeOut3(q) * 0.85, 0.02, rot + i, i === 2 ? VIOLET_HI : VIOLET, Math.sin(Math.PI * q), 3);
  }
  if (t > 0.7) { const q = (t - 0.7) / 0.3; sparks(g, sx, sy, sc, q, VIOLET_HI, 14, 331, lowQ); glowCap(g, sx, sy, sc * 0.6, VIOLET_DK, 0.7 * (1 - q)); }
  g.restore();
}

// ---------- Return to Zero: ทุกอย่างเล่นย้อนกลับจนเป็นศูนย์ ----------
//  สัดส่วนเวลาของ e.dur: ขอบไฟฟ้าขาวแผ่จากโจรุโน่ไปสุดแผนที่ ทั้งฉากกลายเป็นอวกาศม่วง-น้ำเงิน ริ้วแสงไหลเร็ว เศษหินลอยจากพื้น (0..stop) →
//  ผู้โจมตีถอยแบบภาพย้อน ก้าวย้อน-ค้าง-ก้าวย้อน (gioPose) เลือด/เศษการโจมตีวิ่งย้อนกลับเข้าตัว ขอบไฟฟ้าหยักรอบโจรุโน่+ผู้โจมตี →
//  ค่อยจางคืนสู่ปกติเงียบๆ ไม่มีการปะทะ (fade0..1)
//  อวกาศ/ริ้ว/เศษหิน = รูปวาดล่วงหน้าครั้งเดียว ทุกเฟรมแค่เลื่อน + วางทับ
const REW = { stop: 0.2, back0: 0.3, back1: 0.82, fade0: 0.84 }, REW_STEPS = 4;
function rewindK(t) {
  const s = clamp01((t - REW.back0) / (REW.back1 - REW.back0)) * REW_STEPS, i = Math.min(REW_STEPS - 1, Math.floor(s)), m = clamp01((s - i) / 0.5);
  return (i + m * m * (3 - 2 * m)) / REW_STEPS;
}
const rewSize = (e) => (e.ghost && e.ghost.size) || 1;
const rewAt = (e, k) => {
  const h = rewSize(e) / 2;
  return [lerp(e.from.x, e.back.x, k) + h, lerp(e.from.y, e.back.y, k) + h];
};
// ผู้โจมตีที่ถูกย้อน: หมากจริงถอยจาก from ไป back ไม่ว่า state จะไปถึง back แล้วหรือยัง
export function gioPose(list, u, now) {
  if (!u || u.id == null || !Array.isArray(list)) return null;
  for (const e of list) {
    if (!e || e.kind !== "gioRewind" || e.attacker !== u.id || !e.from || !e.back) continue;
    const t = prog(e, now);
    if (t < 0 || t >= 1) continue;
    const k = rewindK(t);
    return { x: lerp(e.from.x, e.back.x, k), y: lerp(e.from.y, e.back.y, k), hz: 0 };
  }
  return null;
}
// อวกาศ: พื้นน้ำเงินเข้ม + กลุ่มหมอกม่วง/น้ำเงิน/ชมพู + ดาว
function drawSpace(x, W, H) {
  x.fillStyle = "rgb(6,8,34)"; x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = "lighter";
  const cols = ["100,30,200", "30,60,210", "150,40,190", "40,110,230", "70,20,150"];
  for (let i = 0; i < 26; i++) {
    const px = hash01(i + 801) * W, py = hash01(i + 811) * H, r = (0.12 + 0.26 * hash01(i + 821)) * W;
    const gr = x.createRadialGradient(px, py, 0, px, py, r);
    gr.addColorStop(0, `rgba(${cols[i % 5]},.3)`); gr.addColorStop(1, `rgba(${cols[i % 5]},0)`);
    x.fillStyle = gr; x.fillRect(px - r, py - r, r * 2, r * 2);
  }
  for (let i = 0; i < 900; i++) {
    const s = 0.6 + hash01(i + 833) * 1.5;
    x.fillStyle = `rgba(${i % 5 ? "230,235,255" : "190,170,255"},${0.25 + hash01(i + 847) * 0.75})`;
    x.fillRect(hash01(i + 859) * W, hash01(i + 863) * H, s, s);
  }
  for (let i = 0; i < 26; i++) star4(x, hash01(i + 877) * W, hash01(i + 881) * H, 3 + hash01(i + 883) * 7, WHITE, 0.9);
}
// ริ้วแสงแนวนอน วางต่อกันได้ไม่เห็นรอยต่อ (ปลายที่ล้นขอบวาดซ้ำอีกฝั่ง)
function drawStreaks(x, W, H) {
  x.globalCompositeOperation = "lighter"; x.lineCap = "round";
  const cols = ["255,255,255", "170,215,255", "190,150,255", "235,130,255", "110,150,255"];
  const line = (px, py, l, w, rgb, al) => {
    for (const ox of [0, -W]) {
      const gr = x.createLinearGradient(px + ox, 0, px + ox + l, 0);
      gr.addColorStop(0, `rgba(${rgb},0)`); gr.addColorStop(0.75, `rgba(${rgb},${al})`); gr.addColorStop(1, `rgba(${rgb},${al * 0.2})`);
      x.strokeStyle = gr; x.lineWidth = w; x.beginPath(); x.moveTo(px + ox, py); x.lineTo(px + ox + l, py); x.stroke();
    }
  };
  for (let i = 0; i < 26; i++) line(hash01(i + 901) * W, hash01(i + 907) * H, W * (0.2 + 0.3 * hash01(i + 911)), H * (0.02 + 0.05 * hash01(i + 919)), cols[2 + i % 3], 0.05);
  for (let i = 0; i < 240; i++) line(hash01(i + 929) * W, hash01(i + 937) * H, W * (0.03 + 0.2 * hash01(i + 941)), 0.8 + hash01(i + 947) * 1.8, cols[i % 5], 0.25 + 0.6 * hash01(i + 953) * hash01(i + 957));
}
// เศษหิน 6 ก้อน (ขอบขาว) เรียงในแถวเดียว ช่องละ c px
const ROCK_C = 56;
function drawRocks(x) {
  for (let i = 0; i < 6; i++) {
    const n = 5 + (i % 3), R = ROCK_C * 0.3;
    x.save(); x.translate(ROCK_C * (i + 0.5), ROCK_C / 2); x.beginPath();
    for (let j = 0; j < n; j++) { const a = (j / n) * Math.PI * 2, r = R * (0.65 + 0.45 * hash01(i * 13 + j + 961)), px = Math.cos(a) * r, py = Math.sin(a) * r; if (j) x.lineTo(px, py); else x.moveTo(px, py); }
    x.closePath();
    x.shadowColor = "rgba(225,215,255,1)"; x.shadowBlur = 9; x.lineWidth = 3.5; x.strokeStyle = "rgb(255,255,255)"; x.stroke();
    x.shadowBlur = 0; x.fillStyle = i % 2 ? "rgb(150,112,66)" : "rgb(118,88,70)"; x.fill();
    x.fillStyle = "rgba(235,205,150,.65)"; x.beginPath(); x.ellipse(-R * 0.2, -R * 0.2, R * 0.28, R * 0.16, -0.5, 0, Math.PI * 2); x.fill();
    x.restore();
  }
}
// อวกาศเต็มมุมมอง + ริ้วไหลเฉียงสองชั้น: ประกอบใน buffer ความละเอียดต่ำ แล้ววางทับครั้งเดียว
let SPACE_BUF = null;
function spaceLayer(g, rect, T, a, lowQ, light) {
  const bw = lowQ ? 480 : 800, bh = lowQ ? 270 : 450;
  if (!SPACE_BUF) SPACE_BUF = document.createElement("canvas");
  if (SPACE_BUF.width !== bw) { SPACE_BUF.width = bw; SPACE_BUF.height = bh; }
  const b = SPACE_BUF.getContext("2d"), D = Math.hypot(bw, bh) * 1.1;
  const space = lowQ ? sprite("space", 512, 288, drawSpace) : sprite("space", 1024, 576, drawSpace);
  const sk = lowQ ? sprite("streak", 512, 256, drawStreaks) : sprite("streak", 1024, 512, drawStreaks);
  b.globalCompositeOperation = "copy"; b.globalAlpha = 1; b.setTransform(1, 0, 0, 1, 0, 0);
  b.drawImage(space, bw * (T * 0.05 - 0.08), -bh * 0.08, bw * 1.16, bh * 1.16); // พื้นหลังเลื่อนช้า
  b.globalCompositeOperation = "lighter"; b.translate(bw / 2, bh / 2); b.rotate(-0.42);
  const strip = (speed, h, al) => {
    const W = D * 1.1, x = -((T * speed) % 1) * W - D / 2; // ไหลทิศเดียว เหมือนภาพกรอย้อน
    b.globalAlpha = al;
    b.drawImage(sk, x, -h / 2, W, h); b.drawImage(sk, x + W, -h / 2, W, h);
  };
  strip(3.4, D * 0.86, 0.85);
  if (!lowQ && !light) strip(2.1, D * 1.25, 0.42);
  g.save(); g.globalAlpha = a; g.drawImage(SPACE_BUF, rect[0], rect[1], rect[2], rect[3]); g.restore();
}
// เศษหินลอยจากพื้นทั่วกระดาน
function rocksLayer(g, info, t, a, now, lowQ) {
  const sheet = sprite("rock", ROCK_C * 6, ROCK_C, drawRocks), n = lowQ ? 14 : 42, T = REDUCED ? 0 : now;
  g.save(); g.globalAlpha = a;
  for (let i = 0; i < n; i++) {
    const age = clamp01((t - (0.06 + 0.3 * hash01(i + 971))) / 0.7);
    if (age <= 0) continue;
    const x = hash01(i + 977) * info.cols, y = hash01(i + 983) * info.rows, z = 0.04 + easeOut3(age) * (0.6 + 1.5 * hash01(i + 991)) + Math.sin(T / 420 + i) * 0.03;
    const [sx, sy, s] = P(x, y, z), d = capS(s) * (0.34 + 0.34 * hash01(i + 997)), c = i % 6;
    g.drawImage(sheet, c * ROCK_C, 0, ROCK_C, ROCK_C, sx - d / 2, sy - d / 2, d, d);
  }
  g.restore();
}
// วงกลมบนพื้นจุดน้อย สำหรับ clip (ขอบหยักวาดทับตรงนั้น)
function smoothCircle(g, cx, cy, r, info) {
  for (let i = 0; i < 24; i++) {
    const th = (i / 24) * Math.PI * 2, x = Math.max(-3, Math.min(info.cols + 3, cx + Math.cos(th) * r)), y = Math.max(-3, Math.min(info.rows + 3, cy + Math.sin(th) * r)), p = P(x, y, 0);
    if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
  }
  g.closePath();
}
// วงกลมบนพื้น ขอบหยักแบบไฟฟ้า ลงใน path ปัจจุบัน · จุดนอกกระดานถูกหนีบไว้
function jaggedCircle(g, cx, cy, r, info, seed) {
  for (let i = 0; i <= 56; i++) {
    const th = (i / 56) * Math.PI * 2, rr = r + hash01(seed + (i % 56)) * 0.7 - 0.35;
    const x = Math.max(-3, Math.min(info.cols + 3, cx + Math.cos(th) * rr)), y = Math.max(-3, Math.min(info.rows + 3, cy + Math.sin(th) * rr)), p = P(x, y, 0);
    if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
  }
  g.closePath();
}
// ขอบไฟฟ้าขาว-ม่วงหยักรอบรูปหมาก: เส้นตามหกเหลี่ยมที่กระชากออกเป็นหนาม สุ่มใหม่ทุก 70ms
function electricRim(g, bx, hy, R, seed, a, lowQ) {
  const n = lowQ ? 24 : 44, C30 = Math.cos(Math.PI / 6);
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const j = i % n, th = (j / n) * Math.PI * 2, sec = ((th % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3);
    const hex = (R * C30) / Math.cos(sec - Math.PI / 6), h = hash01(seed + j * 7), spike = h > 0.82 ? 0.55 * hash01(seed + j * 3 + 1) : 0;
    const r = hex * 1.1 + R * (h * 0.2 + spike), x = bx + Math.cos(th) * r, y = hy + Math.sin(th) * r;
    if (i) g.lineTo(x, y); else g.moveTo(x, y);
  }
  g.closePath();
  g.save(); g.globalCompositeOperation = "lighter"; g.lineJoin = "round";
  g.strokeStyle = `rgba(150,90,255,${0.9 * a})`; g.lineWidth = Math.max(4, R * 0.24); g.stroke();
  g.strokeStyle = `rgba(215,225,255,${0.95 * a})`; g.lineWidth = Math.max(2, R * 0.1); g.stroke();
  g.restore();
  g.strokeStyle = `rgba(255,255,255,${a})`; g.lineWidth = Math.max(1, R * 0.045); g.stroke();
}
// ความทึบของชั้นหน้าสุดที่อบไว้ (พุ่มไม้เบลอ) ระหว่างฉาก: อวกาศคลุมทั้งจอ ชั้นนั้นต้องหลบ
export function gioForeAlpha(fx, now) {
  const e = fx.find((f) => f.kind === "gioRewind");
  if (!e) return 1;
  const t = prog(e, now);
  return t <= 0 || t >= 1 ? 1 : Math.max(1 - clamp01(t / REW.stop), clamp01((t - REW.fade0) / (1 - REW.fade0)));
}
// ครอบทั้งแผนที่ (หลังวาดตัวหมาก ก่อนเอฟเฟกต์): o = { info, view, units, fx, now, lowQ, redraw(u) }
export function gioRewindLayer(g, o) {
  const { info, view, units, fx, now, lowQ, redraw } = o, e = fx.find((f) => f.kind === "gioRewind");
  if (!e || !e.from || !e.back) return;
  const t = prog(e, now);
  if (t <= 0 || t >= 1) return;
  const src = e.gioAt && Number.isFinite(e.gioAt.x) ? e.gioAt : e.from, cx = src.x + 0.5, cy = src.y + 0.5, T = REDUCED ? 0 : t;
  const maxR = Math.hypot(Math.max(cx, info.cols - cx), Math.max(cy, info.rows - cy)) + 3, rect = [view.x0, view.y0, view.x1 - view.x0, view.y1 - view.y0];
  const q0 = clamp01(t / REW.stop), q1 = clamp01((t - REW.fade0) / (1 - REW.fade0)), fade = 1 - q1 * q1 * (3 - 2 * q1), front = 0.3 + maxR * easeOut3(q0);
  const tick = REDUCED ? 3 : Math.floor(now / 70), main = (u) => u.id === e.attacker || u.id === e.id, spread = q0 < 1;
  g.save();
  g.save();
  if (spread) { g.beginPath(); smoothCircle(g, cx, cy, front, info); g.clip(); }
  spaceLayer(g, rect, T, 0.9 * fade, lowQ, spread);
  rocksLayer(g, info, t, fade, now, lowQ);
  // ตัวอื่นค้างอยู่ในเวลาที่หยุด จางในอวกาศ
  if (typeof redraw === "function" && !lowQ) for (const u of units) if (!main(u)) redraw({ ...u, alpha: (u.alpha == null ? 1 : u.alpha) * 0.55 * fade });
  g.restore();
  if (spread) {
    g.beginPath(); jaggedCircle(g, cx, cy, front, info, tick * 5);
    g.save(); g.globalCompositeOperation = "lighter"; g.lineJoin = "round"; g.strokeStyle = "rgba(150,90,255,.85)"; g.lineWidth = 9; g.stroke(); g.restore();
    g.strokeStyle = "rgba(255,255,255,.95)"; g.lineWidth = 2.4; g.stroke();
  }
  // โจรุโน่ + ผู้โจมตี: สีปกติ + ขอบไฟฟ้าหยักรอบตัว
  const rim = clamp01(t / 0.06) * (1 - clamp01((t - 0.8) / 0.12));
  units.forEach((u, i) => {
    if (!main(u)) return;
    if (typeof redraw === "function") redraw(u);
    if (rim <= 0) return;
    const sz = Math.max(1, u.size | 0), K = u.k || (sz > 1 ? 1 + (sz - 1) * 0.6 : 1), [bx, by, s] = P(u.rx + sz / 2 + (u.ox || 0), u.ry + sz / 2 + (u.oy || 0));
    electricRim(g, bx, by - s * 0.86 * K - (u.hz || 0) * s * 0.85, s * 0.4 * K, tick * 11 + i * 37, rim, lowQ);
  });
  g.restore();
}
// ชั้นบนสุด: ภาพติดตาตามทางถอย · เลือด/เศษการโจมตีวิ่งย้อนเข้าตัวผู้โจมตี
function gioRewind(g, e, now, lowQ, hex) {
  if (!e.from || !e.back) return;
  const t = prog(e, now);
  if (t <= REW.stop || t >= 1) return;
  const k = rewindK(t), [cx, cy] = rewAt(e, k), [fx, fy] = rewAt(e, 0), [bx, by] = rewAt(e, 1), late = 1 - clamp01((t - REW.fade0) / 0.1);
  const dx = fx - bx, dy = fy - by, L = Math.hypot(dx, dy), ux = L ? dx / L : 0.7, uy = L ? dy / L : 0.7, sz = rewSize(e), zk = sz > 1 ? 1 + (sz - 1) * 0.6 : 1;
  g.save();
  if (L > 0.05 && hex && e.ghost && t > REW.back0) {
    for (let i = 0; i <= REW_STEPS; i++) {
      const q = i / REW_STEPS;
      if (q >= k || k - q < 0.12) continue; // เงาค้างเฉพาะจุดที่ก้าวย้อนผ่านแล้ว ไม่ซ้อนตัวจริง
      const [x, y] = rewAt(e, q), [sx, sy, s] = P(x, y, 0);
      hex(e.ghost, sx, sy - s * 0.86 * zk, s * 0.4 * zk, (i ? 0.32 : 0.5) * late);
    }
  }
  // เลือด: หยดยาววิ่งย้อนเข้าตัว · เศษการโจมตี: เศษเทาขาวหมุนกลับเข้าตัว
  const m = lowQ ? 12 : 30, span = REW.back1 - REW.back0 + 0.04;
  for (let i = 0; i < m; i++) {
    const u = clamp01((t - (REW.back0 - 0.02 + hash01(i + 503) * span * 0.8)) / 0.16);
    if (u <= 0 || u >= 1) continue;
    const blood = i % 3 !== 0, th = (hash01(i + 511) - 0.5) * 2.4 + Math.atan2(uy, ux), r0 = 1.1 + hash01(i + 521) * 1.5, q = 1 - u * u, z0 = 0.2 + hash01(i + 531) * 0.9;
    const [x, y, s0] = P(cx + Math.cos(th) * r0 * q, cy + Math.sin(th) * r0 * q, 0.5 + (z0 - 0.5) * q), s = capS(s0), o = Math.sin(Math.PI * u) * late, [ax, ay] = P(cx, cy, 0.5);
    g.save(); g.translate(x, y); g.rotate(Math.atan2(ay - y, ax - x));
    if (blood) {
      g.fillStyle = `rgba(190,14,30,${o})`; g.beginPath(); g.ellipse(0, 0, s * (0.05 + 0.08 * u), s * 0.018, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = `rgba(255,150,150,${o})`; g.beginPath(); g.ellipse(s * 0.02, 0, s * 0.03, s * 0.006, 0, 0, Math.PI * 2); g.fill();
    } else {
      g.rotate(u * 9); g.fillStyle = `rgba(226,226,240,${o})`; g.beginPath(); g.moveTo(0, -s * 0.05); g.lineTo(s * 0.04, s * 0.04); g.lineTo(-s * 0.04, s * 0.02); g.closePath(); g.fill();
    }
    g.restore();
  }
  g.restore();
}

const DRAW = { gioPunch, gioRush, gioLife, gioReflect, gioReflectHit, gioTree, gioRoot, gioDodge, gioBurst, gioMuda, gioHeal, gioAwake, gioBullet, gioSlam, gioRewind, gioLoopRevive, gioLoopDie };
// hex(u, x, y, r, alpha) = วาดหกเหลี่ยมหมาก (boardDraw unitHex) ใช้กับภาพติดตา
export function giornoFx(g, e, now, lowQ, hex) {
  const fn = DRAW[e.kind];
  if (fn) fn(g, e, now, lowQ, hex);
}

// ---------- ตัวหมาก ----------
// ก่อนฐานหมาก: วงวนตาย · ต้นไม้ใต้ตัว (ลอย) · วงเต่าทอง (ต้นตอแห่งชีวิต) · ออร่าทอง (Muda) · แสงรอผลธนู · เปลวทองหลังหมาก (Requiem)
export function gioUnitBack(g, u, now, wx, wy) {
  const G = u.giorno;
  if (!G) return;
  const pulse = REDUCED ? 0.8 : 0.65 + 0.35 * Math.sin(now / 300);
  g.save();
  if (G.loop) {
    gEllipse(g, wx, wy, 0.56, 0.01, 32); g.fillStyle = `rgba(${VIOLET_DK},${0.42 * pulse})`; g.fill();
    loopRing(g, wx, wy, 0.5, 0.012, REDUCED ? 0 : -now / 1300, VIOLET, 0.6 * pulse, 1.6);
  }
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
    glowCap(g, x, y, s * 0.45, GOLD, 0.25 * pulse);
  }
  if (G.arrowWait) arrowBack(g, u, now, wx, wy);
  if (G.requiem) requiemBack(g, u, now, wx, wy);
  g.restore();
}
// หลังรูปหมาก: เปลวทองครึ่งหน้า + ประกาย (Requiem) · ธนูปักตัว + แสงพุ่ง (รอผลธนู)
export function gioUnitFront(g, u, now, wx, wy) {
  if (!u.giorno) return;
  if (u.giorno.requiem) requiemFront(g, u, now, wx, wy);
  if (u.giorno.arrowWait) arrowFront(g, u, now, wx, wy);
}
