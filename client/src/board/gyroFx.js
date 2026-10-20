// ============================================================
//  เอฟเฟกต์บนกระดานของไจโร เซปเปลี่ (gyro_zeppeli · GRID_PLAN §7.11) — ลูกเหล็กหมุน · ม้าวาลคิรี · การหมุนทองคำ
//
//  ลูกเหล็ก (drawBall): ทรงกลมเขียวลายหกเหลี่ยม (gyro_skill1) หมุนตลอด · เส้นหมุนแดงอมชมพูพันรอบลูก (gyro_skill2)
//   · คลื่นวงแหวนแผ่ออกเป็นจังหวะ (อนิเมะวาดการหมุนเป็นคลื่นรอบวัตถุ) · หางแสงเขียวตอนบิน · ระหว่างเสริมพลัง = เปลือกทองห่อเขียว
//  เหตุการณ์ (socket "gyroFx" → gyroEventFx · จังหวะตาม GYRO_FX ซึ่ง server รอผ่าน engine.skillBeat):
//   throw   gyroThrow   ลูกหมุนในมือ → บินโค้งหาเป้า → ตีโดน = แสงเขียวแตก + คลื่นวง · หลบ = ลูกตกพื้น → เด้งไปค้างหมุนที่ช่อง land
//   recall  gyroRecall  ลูกลอยจากพื้น → พุ่งกลับตามเส้น (ทแยงได้) · ผ่านใคร = แฟลชที่คนนั้น → เข้ามือ
//   secret  gyroSecret  วิชาลับ: ลูกหมุนเร็วขึ้น → พุ่งสุดแนว (คลื่นวงแหวนตั้งฉากแนว · หางเขียว · พื้นสว่างตาม) → ค้างหมุนที่ปลาย
//                       → วกกลับ ลากศัตรูตามมาเป็นเส้นลม (หมากถูกลากไปพร้อมลูก — gyroPose) → เข้ามือ
//   golden  gyroGolden  การหมุนที่สมบูรณ์แบบ (ชาร์จ): ออร่าเหลืองทอง + เกลียวทองคำ (สี่เหลี่ยมทองคำ) หมุนใต้ตัว + อนุภาคทองวนแขน
//                       · ลูกในมือกลายเป็นทองห่อเขียว → ระเบิดแสงทอง
//   breaker gyroBreaker ตีเสริมโดน: ระเบิดเขียวใหญ่ที่เป้า → เป้ากระเด็นตามเส้นพร้อมเกลียวทองคู่ · เด้งลอยข้ามสิ่งกีดขวาง (jumps)
//                       · ของที่พังแตกกระจาย (smashed) · คนที่ถูกดันออกข้างกระเด็น (shoves) · ลงพื้น = ฝุ่น + รอยเกลียวทอง
//   horse   gyroHorse   ขึ้นม้า = ฝุ่น + ประกาย (ม้าค่อยๆ ปรากฏ) · ลงม้า = ม้าถอยออกแล้วจาง · ม้าตาย = ม้าแวบขาวแล้วสลายเป็นละออง
//   goldenTick gyroTick ได้สัดส่วนทองคำ = ประกายทองเล็กๆ ที่กีบม้า
//  ภาพค้างจาก state players[].gyro (BoardStage → BoardCanvas):
//   gyroBalls = ลูกบนพื้น [{ owner, color, x, y, seq }] หมุนตลอด + วงสีเจ้าของใต้ลูก (ไจโรหลายคน = แยกสีตามเจ้าของ) — gyroBallItems
//   u.gyro = { mounted, empowered, horseHp } — ม้า valkyrie.png ใต้หมาก (หันตามทางเดิน · ควบ = ฝุ่นกีบ) · empowered = ออร่าทอง
//    + เกลียวทองหมุนใต้ตัว + อนุภาคทองวนแขน + ลูกทองในมือ (gyroUnitBack / gyroHorse / gyroUnitFront — boardDraw drawUnit)
//  หมากที่ฉากย้าย (ถูกดึง/กระเด็น/ดันออกข้าง): gyroPose → BoardCanvas วาดตามฉาก แล้วค้างที่ปลายทางจน state มาถึง (HOLD)
//  ไม่เล่นเสียง (server เล่นเอง) · lowQ = ตัดอนุภาค/ชั้นเรือง · ลดการเคลื่อนไหว = ของที่วนตลอด (หมุน/คลื่น/เปลว) หยุดนิ่ง เอฟเฟกต์ครั้งเดียวยังเล่น
// ============================================================
import { P, depthOf, gEllipse, glow, normColor, quad, rgbOf, viewAxes } from "./boardGeo";

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;

// ---------- จังหวะ (ms) — สัญญากับ server (GRID_PLAN §7.11) ----------
export const GYRO_FX = { throw: 650, recall: 550, secret: 1600, secretOut: 750, secretBack: 850, golden: 1400, breaker: 300, breakerStep: 110 };
export const gyroBreakerMs = (dist) => GYRO_FX.breaker + GYRO_FX.breakerStep * Math.max(0, Number(dist) || 0);
const HOLD = 2400; // หมากที่ฉากย้าย/ลูกที่ตก ค้างที่ปลายทางจน state มาถึง (ถ้า server อัปเดตหลังจบฉาก)
const TH = { release: 110, hit: 430, bounce: 560 }; // ขว้าง: ปล่อยมือ · ถึงเป้า · ลูกตกถึงช่อง land
const RC = { lift: 90, arrive: 470 };                // เรียกคืน: ลอยจากพื้น · ถึงมือ
const SC = { spin: 140, out: 700, hover: 880, back: 1480 }; // วิชาลับ: หมุนในมือ · ถึงปลายแนว · เริ่มวกกลับ · ถึงมือ (ขาไป 750 · กลับ+ดึง 850)
const GC = { burst: 1100 };                          // ท่าไม้ตาย: ชาร์จ → ระเบิดแสงทอง
const BK = { tail: 760 };                            // ตีเสริม: ฝุ่น/รอยเกลียวค้างหลังลงพื้น
const HORSE_MS = 900, TICK_MS = 700, PING_MS = 120;
export const GYRO_FX_DUR = {
  gyroThrow: GYRO_FX.throw + HOLD, gyroRecall: GYRO_FX.recall + HOLD, gyroSecret: GYRO_FX.secret + HOLD,
  gyroGolden: GYRO_FX.golden, gyroBreaker: gyroBreakerMs(6) + BK.tail + HOLD, gyroHorse: HORSE_MS, gyroTick: TICK_MS, gyroPing: PING_MS,
};
export const isGyroFx = (kind) => typeof kind === "string" && (kind in GYRO_FX_DUR);
export const GYRO_RIDE_Z = 0.55; // ขี่ม้า: หมากลอยขึ้นนั่งบนหลังม้า (หน่วยช่อง — BoardCanvas บวกเข้า hz)

// ---------- สี (r,g,b) ----------
const GREEN = "120,230,70", GREEN_HI = "205,255,160", PINK = "255,92,138", PINK_HI = "255,176,206";
const GOLD = "255,212,90", GOLD_HI = "255,243,190", DUST = "196,172,132";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut2 = (t) => 1 - (1 - t) * (1 - t);
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const easeIn2 = (t) => t * t;
const hash01 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const okT = (p) => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
const ptOf = (p) => ({ x: p.x, y: p.y });
const samePt = (a, b) => okT(a) && okT(b) && a.x === b.x && a.y === b.y;
const cen = (p, n = 1) => [p.x + n / 2, p.y + n / 2];
const rgbStr = (c) => rgbOf(normColor(c || "#7fd36a")).join(",");
const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
function dirVec(d) {
  if (typeof d === "string") return DIRV[d] || null;
  if (d && Number.isFinite(d.x) && Number.isFinite(d.y) && (d.x || d.y)) { const l = Math.hypot(d.x, d.y); return [d.x / l, d.y / l]; }
  return null;
}
const BALL_R = 0.17; // รัศมีลูก (หน่วยช่อง)
const HORSE_H = 1.42; // ความสูงรูปม้า (หน่วยช่อง)

// ---------- รูปม้า ----------
const HORSE_URL = "/characters/gyro_zeppeli/valkyrie.png";
let horseImg = null;
function horse() {
  if (!horseImg && typeof Image === "function") { const img = new Image(); img.decoding = "async"; img.src = HORSE_URL; horseImg = img; }
  return horseImg && horseImg.complete && horseImg.naturalWidth > 0 ? horseImg : null;
}
export const preloadGyroArt = () => { horse(); };

// ---------- ลูกเหล็ก ----------
// 12 จุดยอดทรงยี่สิบหน้า = กลางแผ่นหกเหลี่ยมบนลูก (เว้นร่องระหว่างแผ่นแบบภาพ gyro_skill1)
const nrm3 = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const crs3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const PHI = (1 + Math.sqrt(5)) / 2, PANEL_R = 0.5;
const PANELS = [[-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0], [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI], [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1]].map((v) => {
  const n = nrm3(v), t1 = nrm3(crs3(n, Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), t2 = crs3(n, t1);
  const c = Math.cos(PANEL_R), s = Math.sin(PANEL_R), verts = [];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU, ca = Math.cos(a) * s, sa = Math.sin(a) * s;
    verts.push([n[0] * c + t1[0] * ca + t2[0] * sa, n[1] * c + t1[1] * ca + t2[1] * sa, n[2] * c + t1[2] * ca + t2[2] * sa]);
  }
  return { n, verts };
});
// หมุนรอบแกนตั้งของลูก (spin) → เอียงเข้าหากล้อง → หมุนแกนบนจอ (axis) · คืน [x, y (จอ), z (เข้าหากล้อง)]
function rotV(v, R) {
  const x = v[0] * R[0] + v[2] * R[1], z = -v[0] * R[1] + v[2] * R[0], y = v[1];
  const y2 = y * R[2] - z * R[3], z2 = y * R[3] + z * R[2];
  return [x * R[4] - y2 * R[5], x * R[5] + y2 * R[4], z2];
}
// เส้นหมุนแดงอมชมพูพันรอบลูก (แนวตั้งฉากแกนหมุน) — ขีดวิ่งรอบลูกตามมุม ph
function spinLines(g, sx, sy, r, ph, axis, a, lowQ) {
  if (a <= 0.01) return;
  const n = lowQ ? 3 : 5, ax = -Math.sin(axis), ay = Math.cos(axis);
  g.save(); g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const l = -0.72 + (1.44 * i) / (n - 1), cx = sx + ax * l * r, cy = sy + ay * l * r;
    const rx = r * (1.24 - 0.3 * l * l), ry = rx * 0.3, s0 = ((ph * (1 + 0.12 * i)) + i * 1.7) % TAU;
    if (!lowQ) {
      g.globalCompositeOperation = "lighter";
      g.strokeStyle = `rgba(${PINK_HI},${0.32 * a})`; g.lineWidth = Math.max(2, r * 0.26);
      g.beginPath(); g.ellipse(cx, cy, rx, ry, axis, s0, s0 + 2.3); g.stroke();
    }
    g.globalCompositeOperation = "source-over";
    g.strokeStyle = `rgba(${PINK},${0.92 * a})`; g.lineWidth = Math.max(1, r * 0.09);
    g.beginPath(); g.ellipse(cx, cy, rx, ry, axis, s0, s0 + 2.3); g.stroke();
  }
  g.restore();
}
// คลื่นวงแหวนแผ่ออกรอบลูก (บนจอ) — period = ms ต่อวง
function airWaves(g, sx, sy, r, t, period, a, n = 3, rgb = GREEN_HI) {
  if (a <= 0.01) return;
  g.save(); g.globalCompositeOperation = "lighter";
  for (let k = 0; k < n; k++) {
    const age = REDUCED ? (k + 0.5) / n : ((t / period) + k / n) % 1, rr = r * (1.3 + 2.5 * age);
    g.strokeStyle = `rgba(${rgb},${0.6 * (1 - age) * a})`; g.lineWidth = Math.max(1, r * 0.13 * (1 - age) + 0.5);
    g.beginPath(); g.ellipse(sx, sy, rr, rr * 0.84, 0, 0, TAU); g.stroke();
  }
  g.restore();
}
// ลูก 1 ลูกที่จุดจอ (sx, sy) รัศมี r px · spin = มุมหมุน · axis = มุมแกนบนจอ
//  o = { alpha, gold 0..1 (เปลือกทองห่อเขียว), lines 0..1 (เส้นหมุนชมพู), glow 0..1, lowQ }
function drawBall(g, sx, sy, r, spin, axis, o = {}) {
  const a = o.alpha == null ? 1 : o.alpha, gold = clamp01(o.gold || 0), lowQ = !!o.lowQ;
  if (a <= 0.01 || r <= 0.5) return;
  const R = [Math.cos(spin), Math.sin(spin), Math.cos(0.5), Math.sin(0.5), Math.cos(axis), Math.sin(axis)];
  g.save();
  if (!lowQ) {
    g.globalCompositeOperation = "lighter";
    glow(g, sx, sy, r * (2.3 + 1.2 * gold), gold > 0.35 ? GOLD : GREEN, (0.26 + 0.34 * gold) * a * (o.glow == null ? 1 : o.glow));
  }
  g.globalCompositeOperation = "source-over";
  g.globalAlpha *= a;
  const gr = g.createRadialGradient(sx - r * 0.35, sy - r * 0.42, r * 0.08, sx, sy, r);
  gr.addColorStop(0, "#e4ffab"); gr.addColorStop(0.3, "#8ddf43"); gr.addColorStop(0.72, "#2f8f1e"); gr.addColorStop(1, "#0d3a0a");
  g.fillStyle = gr; g.beginPath(); g.arc(sx, sy, r, 0, TAU); g.fill();
  if (r > 3.5) {
    g.lineJoin = "round";
    for (const p of PANELS) {
      const c = rotV(p.n, R);
      if (c[2] < -0.12) continue;
      const k = clamp01(c[2] * 1.4 + 0.2);
      g.beginPath();
      p.verts.forEach((v, i) => { const q = rotV(v, R), X = sx + q[0] * r, Y = sy + q[1] * r; if (i) g.lineTo(X, Y); else g.moveTo(X, Y); });
      g.closePath();
      g.fillStyle = `rgba(206,252,128,${0.22 * k})`; g.fill();
      g.strokeStyle = `rgba(14,58,10,${0.85 * k})`; g.lineWidth = Math.max(0.7, r * 0.075); g.stroke();
    }
  }
  const rim = g.createRadialGradient(sx, sy, r * 0.55, sx, sy, r);
  rim.addColorStop(0, "rgba(4,24,4,0)"); rim.addColorStop(1, "rgba(4,24,4,0.6)");
  g.fillStyle = rim; g.beginPath(); g.arc(sx, sy, r, 0, TAU); g.fill();
  if (gold > 0) {
    // เปลือกพลังหมุนทองคำห่อลูกเขียว
    const sh = g.createRadialGradient(sx - r * 0.3, sy - r * 0.35, r * 0.1, sx, sy, r * 1.12);
    sh.addColorStop(0, `rgba(255,248,206,${0.6 * gold})`); sh.addColorStop(0.55, `rgba(255,206,72,${0.3 * gold})`); sh.addColorStop(1, `rgba(176,112,12,${0.75 * gold})`);
    g.fillStyle = sh; g.beginPath(); g.arc(sx, sy, r * 1.12, 0, TAU); g.fill();
    g.strokeStyle = `rgba(${GOLD_HI},${0.9 * gold})`; g.lineWidth = Math.max(1, r * 0.08);
    for (let j = 0; j < 2; j++) {
      const ph = spin * 0.5 + j * Math.PI / 2;
      g.beginPath(); g.ellipse(sx, sy, r * 1.1, r * 1.1 * Math.max(0.08, Math.abs(Math.cos(ph))), axis + j * 1.15, 0, TAU); g.stroke();
    }
  }
  g.fillStyle = "rgba(255,255,255,0.82)"; g.beginPath(); g.ellipse(sx - r * 0.38, sy - r * 0.44, r * 0.25, r * 0.13, -0.6, 0, TAU); g.fill();
  g.fillStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.ellipse(sx + r * 0.3, sy + r * 0.42, r * 0.16, r * 0.07, -0.6, 0, TAU); g.fill();
  g.restore();
  if (o.lines > 0) spinLines(g, sx, sy, r, spin * 1.7, axis, o.lines * a, lowQ);
}
// แถบตามจุดจอ pts ([sx, sy, สเกล]) ครึ่งกว้าง w(i) px
function ribbonPath(g, pts, w) {
  const L = [], R = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let nx = -(b[1] - a[1]), ny = b[0] - a[0];
    const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const hw = w(i);
    L.push([pts[i][0] + nx * hw, pts[i][1] + ny * hw]); R.push([pts[i][0] - nx * hw, pts[i][1] - ny * hw]);
  }
  g.beginPath();
  L.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  for (let i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
  g.closePath();
}
// หางแสงตามลูก (pts เก่า → ใหม่) · gold = หางทอง
function ballTrail(g, pts, a, gold, lowQ) {
  if (pts.length < 2 || a <= 0.01) return;
  const n = pts.length - 1;
  g.save();
  ribbonPath(g, pts, (i) => pts[i][2] * BALL_R * 0.95 * Math.pow(i / n, 0.8));
  g.fillStyle = `rgba(${gold ? "214,150,20" : "52,160,36"},${0.45 * a})`; g.fill();
  g.globalCompositeOperation = "lighter";
  ribbonPath(g, pts, (i) => pts[i][2] * BALL_R * 1.15 * Math.pow(i / n, 0.8));
  g.fillStyle = `rgba(${gold ? GOLD : GREEN},${0.42 * a})`; g.fill();
  if (!lowQ) {
    ribbonPath(g, pts, (i) => pts[i][2] * BALL_R * 0.42 * (i / n));
    g.fillStyle = `rgba(${gold ? GOLD_HI : GREEN_HI},${0.75 * a})`; g.fill();
  }
  g.restore();
}
// แสงเขียวแตก (กระทบ) ที่จุดจอ — size = เท่าของช่อง
function greenBurst(g, sx, sy, s, age, dur, size, lowQ, seed, gold) {
  if (age < 0 || age > dur) return;
  const q = age / dur, a = 1 - q;
  g.save();
  g.strokeStyle = `rgba(40,140,28,${0.6 * a})`; g.lineWidth = Math.max(1.5, 4 * a);
  g.beginPath(); const r0 = s * size * (0.25 + 0.75 * easeOut3(q)); g.ellipse(sx, sy, r0, r0 * 0.86, 0, 0, TAU); g.stroke();
  g.globalCompositeOperation = "lighter";
  glow(g, sx, sy, s * size * (0.35 + 0.8 * easeOut3(q)), GREEN, 0.85 * a);
  if (gold) glow(g, sx, sy, s * size * (0.25 + 0.6 * easeOut3(q)), GOLD, 0.6 * a);
  if (age < 100) glow(g, sx, sy, s * size * 0.3, "255,255,255", 0.95 * (1 - age / 100));
  const n = lowQ ? 6 : 12;
  for (let i = 0; i < n; i++) {
    const th = hash01(seed + i) * TAU, r0 = s * size * 0.12, r1 = s * size * (0.3 + 0.6 * easeOut3(q)) * (0.6 + 0.7 * hash01(seed + i + 40));
    g.strokeStyle = `rgba(${i % 3 ? GREEN_HI : gold ? GOLD_HI : "255,255,255"},${a})`; g.lineWidth = Math.max(1, s * 0.03 * a + 0.5);
    g.beginPath(); g.moveTo(sx + Math.cos(th) * r0, sy + Math.sin(th) * r0 * 0.8); g.lineTo(sx + Math.cos(th) * r1, sy + Math.sin(th) * r1 * 0.8); g.stroke();
  }
  for (let k = 0; k < (lowQ ? 1 : 2); k++) {
    const qq = clamp01(q * 1.3 - k * 0.2);
    if (qq <= 0 || qq >= 1) continue;
    const rr = s * size * (0.2 + 0.7 * easeOut3(qq));
    g.strokeStyle = `rgba(${GREEN_HI},${0.8 * (1 - qq)})`; g.lineWidth = Math.max(1, 3 * (1 - qq));
    g.beginPath(); g.ellipse(sx, sy, rr, rr * 0.86, 0, 0, TAU); g.stroke();
  }
  g.restore();
}
// คลื่นวงบนพื้น (หน่วยช่อง)
function groundRing(g, cx, cy, r, a, rgb, w = 2) {
  if (a <= 0.01) return;
  gEllipse(g, cx, cy, r, 0.012, 40);
  g.strokeStyle = `rgba(${rgb},${a})`; g.lineWidth = w; g.stroke();
}
// ฝุ่นพื้น (กลุ่มควันน้ำตาลอ่อน)
function dustPuff(g, cx, cy, q, n, spread, a, seed) {
  if (q <= 0 || q >= 1) return;
  for (let i = 0; i < n; i++) {
    const th = (i / n) * TAU + hash01(seed + i) * 0.5, d = spread * (0.3 + 0.7 * easeOut2(q)) * (0.6 + 0.6 * hash01(seed + i + 7));
    const [px, py, ps] = P(cx + Math.cos(th) * d, cy + Math.sin(th) * d, 0.06 + q * 0.35 * hash01(seed + i + 3));
    const rr = ps * (0.07 + 0.13 * q);
    const gr = g.createRadialGradient(px, py, 0, px, py, rr);
    gr.addColorStop(0, `rgba(${DUST},${0.55 * a * (1 - q)})`); gr.addColorStop(1, `rgba(${DUST},0)`);
    g.fillStyle = gr; g.fillRect(px - rr, py - rr, rr * 2, rr * 2);
  }
}

// ---------- เกลียวทองคำ (สี่เหลี่ยมทองคำ + เกลียวฟีโบนัชชี — gyro_skill3) ----------
//  สร้างครั้งเดียวในหน่วย "ด้านสั้น = 1" · eye = จุดที่เกลียวม้วนเข้า (หมุนรอบจุดนี้)
const GS = (() => {
  let x = -PHI / 2, y = -0.5, w = PHI, h = 1;
  const rects = [[x, y, w, h]], squares = [], arcs = [];
  for (let i = 0; i < 9; i++) {
    switch (i % 4) {
      case 0: squares.push([x, y, h]); arcs.push([x + h, y + h, h, Math.PI, 1.5 * Math.PI]); x += h; w -= h; break;
      case 1: squares.push([x, y, w]); arcs.push([x, y + w, w, 1.5 * Math.PI, 2 * Math.PI]); y += w; h -= w; break;
      case 2: squares.push([x + w - h, y, h]); arcs.push([x + w - h, y, h, 0, 0.5 * Math.PI]); w -= h; break;
      default: squares.push([x, y + h - w, w]); arcs.push([x + w, y + h - w, w, 0.5 * Math.PI, Math.PI]); h -= w; break;
    }
  }
  const eye = [x + w / 2, y + h / 2], spiral = [];
  for (const [cx, cy, r, a0, a1] of arcs) for (let k = 0; k <= 10; k++) { const a = lerp(a0, a1, k / 10); spiral.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return { rects, squares, eye, spiral };
})();
// วาดบนพื้นรอบ (cx, cy) · size = ด้านสั้นของกรอบ (ช่อง) · rot = มุมหมุน · reveal 0..1 = เกลียวค่อยๆ ม้วนเข้า
function goldenSpiral(g, cx, cy, size, rot, a, reveal, lowQ, z = 0.014) {
  if (a <= 0.01 || size <= 0) return;
  const cr = Math.cos(rot), sr = Math.sin(rot);
  const M = (lx, ly) => { const x = (lx - GS.eye[0]) * size, y = (ly - GS.eye[1]) * size; return P(cx + x * cr - y * sr, cy + x * sr + y * cr, z); };
  const box = (x, y, w, h) => { const p = [M(x, y), M(x + w, y), M(x + w, y + h), M(x, y + h)]; g.moveTo(p[0][0], p[0][1]); for (let i = 1; i < 4; i++) g.lineTo(p[i][0], p[i][1]); g.closePath(); };
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  const nSq = Math.ceil(GS.squares.length * clamp01(reveal * 1.3));
  g.beginPath(); box(...GS.rects[0]);
  for (let i = 0; i < nSq; i++) { const [x, y, s] = GS.squares[i]; box(x, y, s, s); }
  g.strokeStyle = `rgba(176,116,18,${0.6 * a})`; g.lineWidth = 1.2; g.stroke();
  if (!lowQ) {
    g.beginPath();
    for (let i = 0; i < Math.min(nSq, 5); i++) {
      const [x, y, s] = GS.squares[i];
      for (let k = 0; k <= 24; k++) { const an = (k / 24) * TAU, p = M(x + s / 2 + Math.cos(an) * s / 2, y + s / 2 + Math.sin(an) * s / 2); if (k) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
    }
    g.strokeStyle = `rgba(176,116,18,${0.35 * a})`; g.lineWidth = 0.8; g.stroke();
  }
  const n = Math.max(2, Math.floor(GS.spiral.length * clamp01(reveal)));
  const pts = GS.spiral.slice(0, n).map(([x, y]) => M(x, y));
  g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  // เส้นทองเข้ม (เห็นบนพื้นสว่าง) → เรืองทอง (บวกแสง)
  g.strokeStyle = `rgba(184,118,10,${0.9 * a})`; g.lineWidth = 3.4; g.stroke();
  g.globalCompositeOperation = "lighter";
  if (!lowQ) { g.strokeStyle = `rgba(${GOLD},${0.4 * a})`; g.lineWidth = 7; g.stroke(); }
  g.strokeStyle = `rgba(${GOLD_HI},${0.95 * a})`; g.lineWidth = 1.6; g.stroke();
  if (reveal < 1 && pts.length) { const hd = pts[pts.length - 1]; glow(g, hd[0], hd[1], hd[2] * 0.22, GOLD_HI, 0.9 * a); }
  g.restore();
}
// เปลวออร่าเหลืองทองรอบตัว (part: "back" = ครึ่งหลัง · "front" = ครึ่งหน้า · อื่น = ทั้งวง) · k = ความแรง
function auraFlames(g, cx, cy, now, k, part, lowQ, rad = 0.38, h = 1.55) {
  if (k <= 0.01) return;
  const ax = viewAxes(), n = lowQ ? 7 : 14;
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * TAU + hash01(i) * 0.4, ca = Math.cos(ang), sa = Math.sin(ang), front = ca * ax.fx + sa * ax.fy > 0;
    if ((part === "back" && front) || (part === "front" && !front)) continue;
    const ph = REDUCED ? hash01(i + 3) : ((now / (520 + hash01(i + 5) * 380)) + hash01(i + 9)) % 1;
    const hh = h * (0.4 + 0.6 * Math.sin(Math.PI * ph)) * k * (0.7 + 0.5 * hash01(i + 11));
    const bx = cx + ca * rad, by = cy + sa * rad, sway = REDUCED ? 0 : Math.sin(now / 170 + i * 1.7) * 0.1;
    const b0 = P(bx - sa * 0.13, by + ca * 0.13, 0.02), b1 = P(bx + sa * 0.13, by - ca * 0.13, 0.02);
    const tip = P(bx + ca * 0.14 + sway * sa, by + sa * 0.14 - sway * ca, hh), mid = P(bx + ca * 0.06, by + sa * 0.06, hh * 0.45);
    const wx = (b1[0] - b0[0]) * 1.5, kk = Math.min(1, k);
    const flame = () => { g.beginPath(); g.moveTo(b0[0], b0[1]); g.quadraticCurveTo(mid[0] - wx, mid[1], tip[0], tip[1]); g.quadraticCurveTo(mid[0] + wx, mid[1], b1[0], b1[1]); g.closePath(); };
    // ชั้นส้มทอง (ทับปกติ — เห็นบนพื้นสว่าง) → ชั้นเรืองทอง (บวกแสง)
    const go = g.createLinearGradient(mid[0], (b0[1] + b1[1]) / 2, tip[0], tip[1]);
    go.addColorStop(0, `rgba(255,176,30,${0.32 * kk})`); go.addColorStop(1, "rgba(255,176,30,0)");
    g.globalCompositeOperation = "source-over"; g.fillStyle = go; flame(); g.fill();
    const gr = g.createLinearGradient(mid[0], (b0[1] + b1[1]) / 2, tip[0], tip[1]);
    gr.addColorStop(0, `rgba(${GOLD},${0.6 * kk})`); gr.addColorStop(0.6, `rgba(255,186,50,${0.28 * kk})`); gr.addColorStop(1, "rgba(255,170,40,0)");
    g.globalCompositeOperation = "lighter"; g.fillStyle = gr; flame(); g.fill();
  }
  g.restore();
}
// อนุภาคทองวนรอบแขน (จุดจอ hx, hy = มือ) — วงรีเอียงหมุน + หางสั้น
function armMotes(g, hx, hy, R, now, k, lowQ, n) {
  if (k <= 0.01) return;
  const N = n || (lowQ ? 6 : 16);
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < N; i++) {
    const sp = 1 + hash01(i + 2) * 0.8, ph = REDUCED ? hash01(i) * TAU : now / (260 / sp) + hash01(i + 5) * TAU;
    const rr = R * (0.55 + 0.6 * hash01(i + 9)), tilt = -0.5 + hash01(i + 13) * 0.3, lift = (hash01(i + 17) - 0.5) * R * 1.2;
    const at = (p) => [hx + Math.cos(p) * rr, hy + lift + Math.sin(p) * rr * 0.35 + Math.cos(p) * rr * tilt * 0.4];
    const [px, py] = at(ph), a = k * (0.55 + 0.45 * Math.sin(ph * 2 + i));
    if (!lowQ) { const [qx, qy] = at(ph - 0.35); g.strokeStyle = `rgba(${GOLD},${0.45 * a})`; g.lineWidth = Math.max(1, R * 0.06); g.beginPath(); g.moveTo(qx, qy); g.lineTo(px, py); g.stroke(); }
    g.fillStyle = `rgba(${GOLD_HI},${a})`; g.beginPath(); g.arc(px, py, Math.max(1.2, R * 0.05), 0, TAU); g.fill();
  }
  g.restore();
}

// ---------- ขว้าง ----------
function throwGeo(e) {
  if (e._g) return e._g;
  const n = Math.max(1, e.toSize | 0), A0 = cen(e.from), B = cen(e.to, n), L = cen(okT(e.land) ? e.land : e.to);
  let ux = B[0] - A0[0], uy = B[1] - A0[1];
  const D = Math.hypot(ux, uy) || 1; ux /= D; uy /= D;
  e._g = { A: [A0[0] + ux * 0.25, A0[1] + uy * 0.25], B, L, D, n };
  return e._g;
}
const throwArc = (G, u) => [lerp(G.A[0], G.B[0], u), lerp(G.A[1], G.B[1], u), lerp(1.05, 0.62, u) + Math.sin(Math.PI * u) * (0.2 + 0.07 * G.D)];
// ตำแหน่งลูก (x, y, z) ที่เวลา t
function throwBall(e, G, t) {
  if (t < TH.release) { const k = Math.sin((t / TH.release) * Math.PI) * 0.12; return [G.A[0] - (G.B[0] - G.A[0]) / G.D * k, G.A[1] - (G.B[1] - G.A[1]) / G.D * k, 1.05 + k * 0.4]; }
  if (t < TH.hit) return throwArc(G, 1 - Math.pow(1 - (t - TH.release) / (TH.hit - TH.release), 1.5));
  if (t < TH.bounce) { const q = (t - TH.hit) / (TH.bounce - TH.hit); return [lerp(G.B[0], G.L[0], q), lerp(G.B[1], G.L[1], q), lerp(0.62, BALL_R, q) + Math.sin(Math.PI * q) * (e.hit ? 0.42 : 0.12)]; }
  const q = clamp01((t - TH.bounce) / (GYRO_FX.throw - TH.bounce));
  return [G.L[0], G.L[1], BALL_R + Math.abs(Math.sin(q * Math.PI * 2)) * 0.1 * (1 - q)];
}
function throwFx(g, e, t, now, lowQ) {
  if (!okT(e.from) || !okT(e.to) || t >= GYRO_FX.throw) return;
  const G = throwGeo(e), gold = e.empowered ? 1 : 0, own = rgbStr(e.color);
  const S0 = P(G.A[0], G.A[1], 1.05), S1 = P(G.B[0], G.B[1], 0.62), axis = Math.atan2(S1[1] - S0[1], S1[0] - S0[0]) + Math.PI / 2;
  const spin = REDUCED ? 0.6 : t * (t < TH.bounce ? 0.05 : 0.03);
  // หมุนในมือ: คลื่นวงถี่ + แสงรวม
  if (t < TH.release + 60) {
    const k = clamp01(t / TH.release);
    g.save(); g.globalCompositeOperation = "lighter";
    glow(g, S0[0], S0[1], S0[2] * (0.25 + 0.3 * k), gold ? GOLD : GREEN, 0.6 * k);
    g.restore();
    airWaves(g, S0[0], S0[1], S0[2] * BALL_R, t, 120, k, lowQ ? 2 : 3, gold ? GOLD_HI : GREEN_HI);
  }
  // หาง
  if (t > TH.release && t < TH.bounce + 80) {
    const pts = [];
    for (let k = 10; k >= 0; k--) { const tt = Math.max(TH.release, t - k * 16); pts.push(P(...throwBall(e, G, Math.min(tt, TH.bounce)))); }
    ballTrail(g, pts, clamp01((TH.bounce + 80 - t) / 120), gold, lowQ);
  }
  // กระทบ / หลบ
  if (e.hit) {
    const [bx, by, bs] = P(G.B[0], G.B[1], 0.62);
    greenBurst(g, bx, by, bs, t - TH.hit, 380, 1 + 0.25 * (G.n - 1), lowQ, 17, gold);
    const age = t - TH.hit;
    if (age >= 0 && age < 420) for (let k = 0; k < (lowQ ? 1 : 2); k++) groundRing(g, G.B[0], G.B[1], (0.2 + 0.9 * easeOut3(clamp01(age / 420 - k * 0.2))) * G.n, 0.7 * (1 - age / 420), GREEN_HI, 2.4);
  }
  const land = t - TH.bounce;
  if (land >= 0) {
    dustPuff(g, G.L[0], G.L[1], land / 260, lowQ ? 4 : 7, 0.4, 0.8, 5);
    groundRing(g, G.L[0], G.L[1], 0.2 * easeOut3(clamp01(land / 90)), 0.95, own, 2.2);
    groundRing(g, G.L[0], G.L[1], 0.2 + 0.4 * clamp01(land / 260), 0.6 * (1 - clamp01(land / 260)), GREEN_HI, 2);
  }
  // ลูก
  const [x, y, z] = throwBall(e, G, t), [sx, sy, ss] = P(x, y, z);
  if (t >= TH.bounce) { gEllipse(g, x + 0.02, y + 0.03, 0.14, 0, 20); g.fillStyle = "rgba(0,0,0,.28)"; g.fill(); }
  drawBall(g, sx, sy, ss * BALL_R, spin, axis, { gold, lines: t < TH.bounce ? 1 : 0.7, lowQ });
  if (t > TH.release && t < TH.hit) airWaves(g, sx, sy, ss * BALL_R, now, 140, 0.8, lowQ ? 1 : 2, gold ? GOLD_HI : GREEN_HI);
}

// ---------- เรียกคืน ----------
function polyGeo(list) {
  const pts = list.map((p) => [p[0], p[1]]), cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, total: cum[cum.length - 1] || 0 };
}
function polyAt(G, d) {
  const { pts, cum } = G;
  if (pts.length < 2 || d <= 0) return pts[0];
  for (let i = 1; i < pts.length; i++) {
    if (d <= cum[i]) { const k = (d - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]); return [lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)]; }
  }
  return pts[pts.length - 1];
}
// ระยะตามเส้นที่ใกล้จุด (x, y) ที่สุด
function polyNear(G, x, y) {
  let best = 0, bd = 1e9;
  for (let i = 1; i < G.pts.length; i++) {
    const [ax, ay] = G.pts[i - 1], [bx, by] = G.pts[i], vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy || 1e-6;
    const k = clamp01(((x - ax) * vx + (y - ay) * vy) / L2), px = ax + vx * k, py = ay + vy * k, d = Math.hypot(x - px, y - py);
    if (d < bd) { bd = d; best = G.cum[i - 1] + Math.sqrt(L2) * k; }
  }
  return best;
}
function recallGeo(e) {
  if (e._g) return e._g;
  const list = (Array.isArray(e.path) ? e.path.filter(okT) : []).map((p) => cen(p));
  if (okT(e.from) && (!list.length || !samePt(e.path[0], e.from))) list.unshift(cen(e.from));
  if (okT(e.to) && (!list.length || !samePt(e.path[e.path.length - 1], e.to))) list.push(cen(e.to));
  const G = polyGeo(list.length ? list : [[0.5, 0.5]]);
  G.at = (d) => polyAt(G, d);
  // ลูกถึงระยะ d (ช่อง) ที่เวลา (ms) — ความเร็วเร่งขึ้น (u = q^1.5)
  G.timeAt = (d) => RC.lift + (RC.arrive - RC.lift) * Math.pow(clamp01(d / Math.max(0.01, G.total)), 1 / 1.5);
  e._g = G;
  return G;
}
function recallBall(G, t) {
  if (t < RC.lift) { const p = G.pts[0]; return [p[0], p[1], lerp(BALL_R, 0.55, easeOut3(t / RC.lift))]; }
  const u = Math.pow(clamp01((t - RC.lift) / (RC.arrive - RC.lift)), 1.5), p = G.at(u * G.total);
  return [p[0], p[1], lerp(0.55, 1.0, u)];
}
function recallFx(g, e, t, now, lowQ) {
  if (t >= GYRO_FX.recall) return;
  const G = recallGeo(e), own = rgbStr(e.color);
  // เส้นทางบนพื้น: ไล่สว่างตามที่ลูกผ่าน
  const u = t < RC.lift ? 0 : Math.pow(clamp01((t - RC.lift) / (RC.arrive - RC.lift)), 1.5), dNow = u * G.total;
  const fade = clamp01((GYRO_FX.recall - t) / 160);
  if (G.pts.length > 1 && dNow > 0) {
    const pts = [P(G.pts[0][0], G.pts[0][1], 0.015)];
    for (let i = 1; i < G.pts.length && G.cum[i] < dNow; i++) pts.push(P(G.pts[i][0], G.pts[i][1], 0.015));
    const hd = G.at(dNow); pts.push(P(hd[0], hd[1], 0.015));
    g.save(); g.globalCompositeOperation = "lighter";
    g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    if (!lowQ) { g.strokeStyle = `rgba(${GREEN},${0.3 * fade})`; g.lineWidth = 7; g.stroke(); }
    g.strokeStyle = `rgba(${GREEN_HI},${0.75 * fade})`; g.lineWidth = 1.6; g.stroke();
    g.restore();
  }
  // วงสีเจ้าของที่ช่องเดิม หดหาย
  const p0 = G.pts[0];
  groundRing(g, p0[0], p0[1], 0.2 * (1 - clamp01(t / 200)), 0.9 * (1 - clamp01(t / 200)), own, 2.2);
  if (t < 260) dustPuff(g, p0[0], p0[1], t / 260, lowQ ? 3 : 6, 0.32, 0.7, 11);
  // คนบนเส้น: แฟลชตอนลูกผ่าน
  for (const h of e.hitsAt || []) {
    const [hx, hy, hs] = P(h.x + 0.5, h.y + 0.5, 0.55);
    greenBurst(g, hx, hy, hs, t - h.ms, 300, 0.9, lowQ, 29 + h.x * 7 + h.y);
  }
  // หาง + ลูก
  if (t > RC.lift) {
    const pts = [];
    for (let k = 9; k >= 0; k--) pts.push(P(...recallBall(G, Math.max(RC.lift, t - k * 15))));
    ballTrail(g, pts, fade, false, lowQ);
  }
  if (t < RC.arrive + 20) {
    const [x, y, z] = recallBall(G, Math.min(t, RC.arrive)), [sx, sy, ss] = P(x, y, z);
    const nx = recallBall(G, Math.min(RC.arrive, t + 16)), S2 = P(...nx), axis = Math.atan2(S2[1] - sy, S2[0] - sx) + Math.PI / 2;
    drawBall(g, sx, sy, ss * BALL_R, REDUCED ? 0.6 : t * 0.06, axis, { lines: 1, lowQ });
    airWaves(g, sx, sy, ss * BALL_R, now, 120, 0.85, lowQ ? 1 : 2);
  } else {
    // เข้ามือ: วงหดเข้า + แสงวาบ
    const q = (t - RC.arrive) / (GYRO_FX.recall - RC.arrive), end = G.pts[G.pts.length - 1], [hx, hy, hs] = P(end[0], end[1], 1.0);
    g.save(); g.globalCompositeOperation = "lighter";
    glow(g, hx, hy, hs * (0.35 - 0.2 * q), GREEN, 0.85 * (1 - q));
    g.strokeStyle = `rgba(${GREEN_HI},${0.9 * (1 - q)})`; g.lineWidth = 2;
    g.beginPath(); g.ellipse(hx, hy, hs * 0.4 * (1 - q * 0.7), hs * 0.32 * (1 - q * 0.7), 0, 0, TAU); g.stroke();
    g.restore();
  }
}

// ---------- วิชาลับไจโร ----------
function secretGeo(e) {
  if (e._g) return e._g;
  const A = cen(e.from), v = dirVec(e.dir) || [0, -1], tiles = Array.isArray(e.tiles) ? e.tiles.filter(okT) : [];
  const along = (x, y) => (x - A[0]) * v[0] + (y - A[1]) * v[1];
  let D = Math.max(1, Number(e.len) || 8);
  if (tiles.length) D = Math.max(1, ...tiles.map((t) => along(t.x + 0.5, t.y + 0.5)));
  const H = 0.25; // ระยะมือจากกลางตัว
  // เวลาที่ลูกผ่านระยะ d ขาไป / ขากลับ
  const outT = (d) => SC.spin + (SC.out - SC.spin) * (1 - Math.pow(1 - clamp01((d - H) / Math.max(0.01, D - H)), 1 / 2.2));
  const backT = (d) => SC.hover + (SC.back - SC.hover) * Math.pow(clamp01((D - d) / Math.max(0.01, D - H)), 1 / 1.7);
  const tl = tiles.map((t) => ({ x: t.x, y: t.y, d: along(t.x + 0.5, t.y + 0.5) }));
  const pulls = (Array.isArray(e.pulls) ? e.pulls : []).filter((p) => p && p.id != null && okT(p.from) && okT(p.to)).map((p) => {
    const d0 = along(p.from.x + 0.5, p.from.y + 0.5), d1 = along(p.to.x + 0.5, p.to.y + 0.5);
    return { id: p.id, from: ptOf(p.from), to: ptOf(p.to), d0, d1, t0: backT(d0), t1: backT(Math.min(d0, d1)) };
  });
  e._g = { A, v, D, H, outT, backT, tiles: tl, pulls };
  return e._g;
}
function secretD(G, t) {
  if (t < SC.spin) return G.H;
  if (t < SC.out) return lerp(G.H, G.D, 1 - Math.pow(1 - (t - SC.spin) / (SC.out - SC.spin), 2.2));
  if (t < SC.hover) return G.D;
  if (t < SC.back) return lerp(G.D, G.H, Math.pow((t - SC.hover) / (SC.back - SC.hover), 1.7));
  return G.H;
}
const SEC_Z = 0.8;
const secretAt = (G, d) => [G.A[0] + G.v[0] * d, G.A[1] + G.v[1] * d, d <= G.H + 0.01 ? 1.0 : SEC_Z + 0.2 * clamp01(1 - (d - G.H) / 1.2)];
// วงแหวนตั้งฉากแนวบิน (ในอากาศ) ที่ระยะ d รัศมี r
function lineRing(g, G, d, r, a, rgb, w) {
  if (a <= 0.01) return;
  const c = secretAt(G, d), e1 = [-G.v[1], G.v[0]];
  g.beginPath();
  for (let i = 0; i <= 26; i++) {
    const th = (i / 26) * TAU, p = P(c[0] + e1[0] * Math.cos(th) * r, c[1] + e1[1] * Math.cos(th) * r, c[2] + Math.sin(th) * r * 0.9);
    if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
  }
  g.save();
  g.strokeStyle = `rgba(48,150,34,${0.55 * a})`; g.lineWidth = w + 2; g.stroke();
  g.globalCompositeOperation = "lighter";
  g.strokeStyle = `rgba(${rgb},${a})`; g.lineWidth = w; g.stroke();
  g.restore();
}
function secretFx(g, e, t, now, lowQ) {
  if (!okT(e.from) || t >= GYRO_FX.secret) return;
  const G = secretGeo(e), d = secretD(G, t), [bx, by, bz] = secretAt(G, d), [sx, sy, ss] = P(bx, by, bz);
  const fadeAll = clamp01((GYRO_FX.secret - t) / 200);
  const H0 = P(...secretAt(G, G.H)), S1 = P(...secretAt(G, G.D)), axis = Math.atan2(S1[1] - H0[1], S1[0] - H0[0]) + Math.PI / 2;
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  // พื้นตามแนว: ช่องสว่างตอนลูกผ่าน (ขาไป) + เส้นรอยเขียวกลางแนว
  for (const tl of G.tiles) {
    const ta = G.outT(tl.d), tb = G.backT(tl.d);
    const k = Math.max(t >= ta ? Math.max(0, 1 - (t - ta) / 520) : 0, t >= tb ? Math.max(0, 1 - (t - tb) / 420) * 0.8 : 0);
    if (k <= 0.01) continue;
    g.globalCompositeOperation = "lighter";
    quad(g, tl.x, tl.y, 0.04, 0.01); g.fillStyle = `rgba(${GREEN},${0.32 * k})`; g.fill();
  }
  if (t > SC.spin) {
    const far = t < SC.out ? d : G.D, a = (t < SC.hover ? 1 : clamp01(1 - (t - SC.hover) / 500)) * fadeAll;
    const p0 = P(G.A[0] + G.v[0] * G.H, G.A[1] + G.v[1] * G.H, 0.015), p1 = P(G.A[0] + G.v[0] * far, G.A[1] + G.v[1] * far, 0.015);
    g.globalCompositeOperation = "source-over";
    g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]);
    g.strokeStyle = `rgba(40,130,28,${0.4 * a})`; g.lineWidth = 5; g.stroke();
    g.globalCompositeOperation = "lighter";
    if (!lowQ) { g.strokeStyle = `rgba(${GREEN},${0.28 * a})`; g.lineWidth = 9; g.stroke(); }
    g.strokeStyle = `rgba(${GREEN_HI},${0.7 * a})`; g.lineWidth = 1.8; g.stroke();
  }
  g.globalCompositeOperation = "source-over";
  // หมุนในมือ: ออร่าเขียว + คลื่นถี่ขึ้นเรื่อยๆ
  if (t < SC.spin + 80) {
    const k = clamp01(t / SC.spin);
    g.save(); g.globalCompositeOperation = "lighter"; glow(g, H0[0], H0[1], H0[2] * (0.3 + 0.4 * k), GREEN, 0.7 * k); g.restore();
    airWaves(g, H0[0], H0[1], H0[2] * BALL_R, t, 80, k, lowQ ? 2 : 4);
  }
  // คลื่นวงแหวนตั้งฉากแนว — ปล่อยทุก 50 ms ตามทางขาไป/ขากลับ
  const step = lowQ ? 100 : 50, life = 380;
  for (let te = SC.spin; te < Math.min(t, SC.back); te += step) {
    if (te >= SC.out && te < SC.hover) continue;
    const age = t - te;
    if (age > life) continue;
    const q = age / life;
    lineRing(g, G, secretD(G, te), 0.16 + 0.55 * easeOut2(q), 0.7 * (1 - q) * fadeAll, GREEN_HI, Math.max(1, 2.6 * (1 - q)));
  }
  // คนในแนว: แฟลชขาไป + ขากลับ
  for (const h of e.hitsAt || []) {
    const [hx, hy, hs] = P(h.x + 0.5, h.y + 0.5, 0.55);
    greenBurst(g, hx, hy, hs, t - h.ms, 300, 0.85, lowQ, 41 + h.x * 5 + h.y * 3);
  }
  // ถูกดึง: เส้นลมพัดตามหลัง + วงหมุนเขียวรัดตัว (ตอนกำลังถูกลาก)
  for (const p of G.pulls) {
    if (t < p.t0 - 40 || t > p.t1 + 260) continue;
    const pos = pullPos(p, G, t), k = t <= p.t1 ? 1 : 1 - (t - p.t1) / 260, back = [G.v[0], G.v[1]];
    const cx = pos.x + 0.5, cy = pos.y + 0.5;
    g.globalCompositeOperation = "lighter";
    const n = lowQ ? 3 : 7;
    for (let i = 0; i < n; i++) {
      const side = (hash01(i + 3) - 0.5) * 0.7, z = 0.2 + hash01(i + 7) * 0.9, len = 0.5 + 0.7 * hash01(i + 11);
      const off = REDUCED ? 0 : ((now / 160 + hash01(i)) % 1) * 0.4;
      const a0 = P(cx - back[1] * side + back[0] * (0.3 + off), cy + back[0] * side + back[1] * (0.3 + off), z);
      const a1 = P(cx - back[1] * side + back[0] * (0.3 + off + len), cy + back[0] * side + back[1] * (0.3 + off + len), z);
      g.strokeStyle = `rgba(${i % 2 ? "235,255,235" : GREEN_HI},${0.65 * k})`; g.lineWidth = Math.max(1, a0[2] * 0.018);
      g.beginPath(); g.moveTo(a0[0], a0[1]); g.lineTo(a1[0], a1[1]); g.stroke();
    }
    for (let j = 0; j < 2; j++) {
      const [ex, ey, es] = P(cx, cy, 0.35 + j * 0.45), rot = REDUCED ? 0 : now / 70 + j;
      g.strokeStyle = `rgba(${GREEN_HI},${0.7 * k})`; g.lineWidth = Math.max(1, es * 0.03);
      g.beginPath(); g.ellipse(ex, ey, es * 0.42, es * 0.14, 0, rot % TAU, (rot % TAU) + 4.2); g.stroke();
    }
    dustPuff(g, cx, cy, ((t - p.t0) % 300) / 300, lowQ ? 2 : 4, 0.3, 0.6 * k, 9 + p.d0);
  }
  g.globalCompositeOperation = "source-over";
  // ปลายแนว: ลูกค้างหมุน → คลื่นระเบิด 2 วง
  if (t >= SC.out - 30 && t < SC.hover + 260) {
    const age = t - SC.out, q = clamp01(age / 420);
    g.save(); g.globalCompositeOperation = "lighter";
    glow(g, S1[0], S1[1], S1[2] * (0.4 + 0.5 * q), GREEN, 0.75 * (1 - q * 0.8));
    g.restore();
    for (let k = 0; k < (lowQ ? 1 : 2); k++) {
      const qq = clamp01(age / 380 - k * 0.3);
      if (qq > 0 && qq < 1) lineRing(g, G, G.D, 0.25 + 0.9 * easeOut3(qq), 0.85 * (1 - qq), k ? PINK_HI : GREEN_HI, Math.max(1, 3 * (1 - qq)));
    }
    const far = secretAt(G, G.D);
    groundRing(g, far[0], far[1], 0.2 + 0.8 * easeOut3(q), 0.7 * (1 - q), GREEN_HI, 2.2);
  }
  // หาง + ลูก
  if (t > SC.spin && t < SC.back + 40) {
    const pts = [];
    for (let k = 11; k >= 0; k--) pts.push(P(...secretAt(G, secretD(G, Math.max(SC.spin, t - k * 13)))));
    ballTrail(g, pts, 1, false, lowQ);
  }
  if (t < SC.back + 10) {
    const r = ss * BALL_R * (t > SC.spin && t < SC.back ? 1.12 : 1);
    drawBall(g, sx, sy, r, REDUCED ? 0.6 : t * 0.09, axis, { lines: 1, lowQ, glow: 1.3 });
    airWaves(g, sx, sy, r, now, 90, 0.9, lowQ ? 1 : 3);
  } else {
    const q = (t - SC.back) / (GYRO_FX.secret - SC.back);
    g.save(); g.globalCompositeOperation = "lighter";
    glow(g, H0[0], H0[1], H0[2] * (0.45 - 0.25 * q), GREEN, 0.9 * (1 - q));
    g.strokeStyle = `rgba(${GREEN_HI},${0.9 * (1 - q)})`; g.lineWidth = 2.4;
    g.beginPath(); g.ellipse(H0[0], H0[1], H0[2] * (0.55 - 0.4 * q), H0[2] * (0.45 - 0.33 * q), 0, 0, TAU); g.stroke();
    g.restore();
  }
  g.restore();
}
// ตำแหน่งหมากที่ถูกดึง: ตามลูกขากลับระหว่างระยะ d0 → d1
function pullPos(p, G, t) {
  if (t <= p.t0) return p.from;
  if (t >= p.t1 || p.d0 <= p.d1 + 1e-6) return p.to;
  const d = secretD(G, t), k = clamp01((p.d0 - d) / (p.d0 - p.d1));
  return { x: lerp(p.from.x, p.to.x, k), y: lerp(p.from.y, p.to.y, k) };
}

// ---------- การหมุนที่สมบูรณ์แบบ (ชาร์จ) ----------
function goldenFx(g, e, t, now, lowQ, view) {
  if (!okT(e.at) || t >= GYRO_FX.golden) return;
  const n = Math.max(1, e.size | 0), [cx, cy] = cen(e.at, n), q = clamp01(t / GC.burst), still = REDUCED;
  const out = t < GC.burst ? 1 : clamp01(1 - (t - GC.burst) / (GYRO_FX.golden - GC.burst));
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  // เกลียวทองคำใต้ตัว: ม้วนเข้า + หมุน + โตขึ้น
  goldenSpiral(g, cx, cy, (0.55 + 0.55 * easeOut3(q)) * n, still ? 0.3 : t / 700, out, easeOut2(q), lowQ);
  // คลื่นทองบนพื้น
  for (let k = 0; k < (lowQ ? 1 : 3); k++) {
    const age = still ? (k + 0.5) / 3 : ((t / 420) + k / 3) % 1;
    groundRing(g, cx, cy, (0.3 + 1.1 * age) * n, 0.55 * (1 - age) * q * out, GOLD, 2);
  }
  // ออร่าเหลืองทอง (ทั้งวง — ทับตัวด้วยบวกแสง) + เสาแสง
  auraFlames(g, cx, cy, now, (0.5 + 0.9 * q) * out, "all", lowQ, 0.42 * n, 1.9);
  if (!lowQ) {
    const b = P(cx, cy, 0), top = P(cx, cy, 3.2), wb = b[2] * 0.5 * n, wt = top[2] * 0.12;
    const gr = g.createLinearGradient(b[0], b[1], top[0], top[1]);
    gr.addColorStop(0, `rgba(${GOLD},${0.4 * q * out})`); gr.addColorStop(1, `rgba(${GOLD},0)`);
    g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = gr;
    g.beginPath(); g.moveTo(b[0] - wb, b[1]); g.lineTo(top[0] - wt, top[1]); g.lineTo(top[0] + wt, top[1]); g.lineTo(b[0] + wb, b[1]); g.closePath(); g.fill();
    g.restore();
  }
  // อนุภาคทองเกลียวขึ้นจากพื้นวนเข้ามือ
  const [hx0, hy0, hs] = P(cx, cy, 1.2), hx = hx0 + hs * 0.32, hy = hy0 + hs * 0.08;
  g.save(); g.globalCompositeOperation = "lighter";
  const N = lowQ ? 12 : 34;
  for (let i = 0; i < N && t < GC.burst + 60; i++) {
    const period = 700 + hash01(i + 1) * 500, age = still ? hash01(i + 2) : ((t / period) + hash01(i * 3.1)) % 1;
    const ang = hash01(i + 5) * TAU + age * 5, r = (0.9 + 0.5 * hash01(i + 9)) * (1 - easeIn2(age)) * n;
    const [px, py, ps] = P(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 0.05 + 1.15 * Math.pow(age, 0.7));
    const mx = lerp(px, hx, easeIn2(age)), my = lerp(py, hy, easeIn2(age)), a = Math.sin(Math.PI * age) * (0.35 + 0.65 * q);
    g.fillStyle = `rgba(${i % 4 ? GOLD_HI : "255,255,255"},${a})`; g.beginPath(); g.arc(mx, my, Math.max(1.1, ps * 0.026), 0, TAU); g.fill();
  }
  g.restore();
  armMotes(g, hx, hy, hs * 0.55, now, (0.4 + 0.6 * q) * out, lowQ, lowQ ? 8 : 22);
  // ลูกในมือ: เขียว → ทองห่อเขียว
  if (t < GC.burst + 200) {
    const a = t < GC.burst ? clamp01(t / 160) : 1 - (t - GC.burst) / 200;
    drawBall(g, hx, hy, hs * BALL_R * (1 + 0.25 * q), still ? 0.6 : t * (0.03 + 0.08 * q), -0.4, { gold: easeOut2(q), lines: 0.4 + 0.6 * q, lowQ, alpha: a, glow: 1 + q });
    airWaves(g, hx, hy, hs * BALL_R, t, 260 - 170 * q, 0.6 + 0.4 * q, lowQ ? 2 : 3, GOLD_HI);
  }
  // ระเบิดแสงทอง
  if (t >= GC.burst) {
    const age = t - GC.burst, k = age / (GYRO_FX.golden - GC.burst);
    g.save(); g.globalCompositeOperation = "lighter";
    glow(g, hx, hy, hs * (0.6 + 2.4 * easeOut3(k)), GOLD, 0.9 * (1 - k));
    if (age < 110) glow(g, hx, hy, hs * 0.8, "255,255,255", 0.95 * (1 - age / 110));
    if (!lowQ) {
      const nRay = 14, len = hs * (0.8 + 3.2 * easeOut3(k));
      g.fillStyle = `rgba(${GOLD_HI},${0.35 * (1 - k)})`;
      g.beginPath();
      for (let i = 0; i < nRay; i++) {
        const th = (i / nRay) * TAU + hash01(i) * 0.3, w = 0.04 + 0.03 * hash01(i + 5);
        g.moveTo(hx, hy); g.lineTo(hx + Math.cos(th - w) * len, hy + Math.sin(th - w) * len); g.lineTo(hx + Math.cos(th + w) * len, hy + Math.sin(th + w) * len); g.closePath();
      }
      g.fill();
    }
    g.restore();
    for (let j = 0; j < (lowQ ? 1 : 2); j++) groundRing(g, cx, cy, (0.4 + 2.4 * easeOut3(clamp01(k * 1.2 - j * 0.15))) * n, 0.85 * (1 - k), j ? GOLD_HI : GOLD, 3 * (1 - k) + 1);
    if (age < 200) flashView(g, view, GOLD_HI, 0.35 * (1 - age / 200));
  }
  g.restore();
}
function flashView(g, view, rgb, a) {
  if (a <= 0.01) return;
  const x0 = (view && Number.isFinite(view.x0) ? view.x0 : 0) - 60, y0 = (view && Number.isFinite(view.y0) ? view.y0 : 0) - 60;
  const x1 = (view && Number.isFinite(view.x1) ? view.x1 : 1280) + 60, y1 = (view && Number.isFinite(view.y1) ? view.y1 : 720) + 60;
  g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = `rgba(${rgb},${a})`; g.fillRect(x0, y0, x1 - x0, y1 - y0); g.restore();
}

// ---------- Ball Breaker: ตีเสริมโดน → กระเด็นถึงขอบ ----------
function breakerGeo(e) {
  if (e._g) return e._g;
  const n = Math.max(1, e.size | 0), raw = Array.isArray(e.path) ? e.path.filter(okT).map(ptOf) : [];
  const pts = okT(e.from) ? [ptOf(e.from)] : [];
  for (const p of raw) if (!pts.length || !samePt(pts[pts.length - 1], p)) pts.push(p);
  if (okT(e.to) && (!pts.length || !samePt(pts[pts.length - 1], e.to))) pts.push(ptOf(e.to));
  if (!pts.length) pts.push({ x: 0, y: 0 });
  const idx = (q) => { const i = pts.findIndex((p) => samePt(p, q)); return i >= 0 ? i : -1; };
  // ช่องบนเส้นที่ตัวเป้าครอบช่อง q (ตัวใหญ่: path = มุมบนซ้าย · jumps/smashed = ช่องจริง) — ไม่เจอ = ช่องที่ใกล้สุด
  const near = (q) => { let bi = 0, bd = 1e9; pts.forEach((p, i) => { const d = Math.abs(p.x + (n - 1) / 2 - q.x) + Math.abs(p.y + (n - 1) / 2 - q.y); if (d < bd) { bd = d; bi = i; } }); return bi; };
  const at = (q) => (idx(q) >= 0 ? idx(q) : near(q));
  // ช่องที่ตัวเป้าครอบตอนผ่าน (ไม่อยู่ใต้ตัวเลย = ข้าม · เช่น jumps ที่เลยปลายทาง เมื่อ server ถอยปลายกลับเพราะยืนไม่ได้)
  const onPath = (q) => pts.findIndex((p) => q.x >= p.x && q.x < p.x + n && q.y >= p.y && q.y < p.y + n);
  const jumps = [...new Set((Array.isArray(e.jumps) ? e.jumps.filter(okT) : []).map(onPath).filter((i) => i >= 0))];
  const smashed = (Array.isArray(e.smashed) ? e.smashed.filter(okT) : []).map((s) => ({ x: s.x, y: s.y, i: at(s) }));
  const steps = Math.max(0, pts.length - 1), len = GYRO_FX.breaker + GYRO_FX.breakerStep * steps;
  const shoves = (Array.isArray(e.shoves) ? e.shoves : []).filter((s) => s && s.id != null && okT(s.from) && okT(s.to)).map((s) => {
    const i = at(s.from);
    return { id: s.id, from: ptOf(s.from), to: ptOf(s.to), ms: GYRO_FX.breaker + GYRO_FX.breakerStep * Math.max(0, i - 0.6) };
  });
  e._g = { n, pts, steps, len, jumps, smashed, shoves };
  return e._g;
}
const SHOVE_MS = 190;
// ตำแหน่งเป้าที่กระเด็น (มุมบนซ้าย) ที่เวลา t · f = ตำแหน่งตามช่องบนเส้น (ทศนิยม)
function flyF(G, t) { return G.steps ? clamp01((t - GYRO_FX.breaker) / (G.len - GYRO_FX.breaker)) * G.steps : 0; }
function flyPose(G, t) {
  const f = flyF(G, t), i = Math.min(G.steps, Math.floor(f)), k = f - i, A = G.pts[i], B = G.pts[Math.min(G.steps, i + 1)];
  let hz = t < GYRO_FX.breaker ? 0.12 * Math.sin((t / GYRO_FX.breaker) * Math.PI) : 0.38 * Math.sqrt(Math.max(0, 1 - f / Math.max(1, G.steps))) * (G.steps ? 1 : 0);
  for (const j of G.jumps) { const dd = Math.abs(f - j); if (dd < 1.15) hz += 1.05 * Math.pow(Math.cos((dd / 1.15) * Math.PI / 2), 2); }
  const sq = REDUCED || t < GYRO_FX.breaker ? 0 : Math.sin(f * Math.PI * 2.2) * 0.12 * (1 - f / Math.max(1, G.steps));
  return { x: lerp(A.x, B.x, k), y: lerp(A.y, B.y, k), hz, sq, fly: hz > 0.3 };
}
function breakerFx(g, e, t, now, lowQ, view) {
  const G = breakerGeo(e), END = G.len + BK.tail;
  if (t >= END) return;
  const n = G.n, c = (p) => cen(p, n), E = c(G.pts[0]), last = c(G.pts[G.steps]);
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  // ระเบิดเขียวใหญ่ที่เป้า (ลูกทองห่อเขียวกระทบ)
  const ex = t / 560;
  if (ex < 1) {
    const [sx, sy, ss] = P(E[0], E[1], 0.6), a = 1 - ex;
    g.save(); g.globalCompositeOperation = "lighter";
    glow(g, sx, sy, ss * (0.6 + 2.6 * easeOut3(ex)) * n, GREEN, 0.95 * a);
    glow(g, sx, sy, ss * (0.4 + 1.4 * easeOut3(ex)) * n, GOLD, 0.55 * a);
    if (t < 140) glow(g, sx, sy, ss * 1.1 * n, "255,255,255", 0.95 * (1 - t / 140));
    // เปลือกทรงกลมพลังขยายออก
    const rr = ss * (0.3 + 1.6 * easeOut3(ex)) * n;
    g.strokeStyle = `rgba(${GREEN_HI},${0.9 * a})`; g.lineWidth = Math.max(1, 5 * a);
    g.beginPath(); g.arc(sx, sy, rr, 0, TAU); g.stroke();
    g.strokeStyle = `rgba(${GOLD_HI},${0.7 * a})`; g.lineWidth = Math.max(1, 2 * a);
    g.beginPath(); g.ellipse(sx, sy, rr * 1.15, rr * 0.4, -0.3, 0, TAU); g.stroke();
    // รัศมีหนามแสง
    const nRay = lowQ ? 10 : 22;
    for (let i = 0; i < nRay; i++) {
      const th = hash01(i + 70) * TAU, L0 = ss * 0.25 * n, L1 = ss * (0.9 + 2.6 * hash01(i + 90)) * easeOut3(Math.min(1, ex * 2.2)) * n;
      g.strokeStyle = `rgba(${i % 3 ? GREEN_HI : GOLD_HI},${a})`; g.lineWidth = Math.max(1, ss * 0.05 * a);
      g.beginPath(); g.moveTo(sx + Math.cos(th) * L0, sy + Math.sin(th) * L0 * 0.8); g.lineTo(sx + Math.cos(th) * L1, sy + Math.sin(th) * L1 * 0.8); g.stroke();
    }
    g.restore();
    for (let k = 0; k < (lowQ ? 1 : 3); k++) {
      const qq = clamp01(ex * 1.25 - k * 0.15);
      if (qq > 0 && qq < 1) groundRing(g, E[0], E[1], (0.3 + 2.8 * easeOut3(qq)) * n, 0.9 * (1 - qq), k === 1 ? GOLD : GREEN_HI, 4 * (1 - qq) + 1);
    }
    goldenSpiral(g, E[0], E[1], (0.6 + 1.2 * easeOut3(ex)) * n, REDUCED ? 0 : -t / 260, a, 1, lowQ);
    // เศษพลังเขียวกระเด็น
    if (!lowQ) for (let i = 0; i < 18; i++) {
      const th = hash01(i + 120) * TAU, sp = 1 + hash01(i + 130) * 1.6, tt = t / 1000, z = 0.6 + sp * 2.2 * tt - 7 * tt * tt;
      if (z < 0) continue;
      const [px, py, ps] = P(E[0] + Math.cos(th) * sp * tt * 2.4, E[1] + Math.sin(th) * sp * tt * 2.4, z);
      g.fillStyle = `rgba(${i % 3 ? GREEN_HI : GOLD_HI},${a})`; g.beginPath(); g.arc(px, py, Math.max(1.2, ps * 0.035), 0, TAU); g.fill();
    }
    if (t < 240) flashView(g, view, "150,255,120", 0.3 * (1 - t / 240));
  }
  // ทางกระเด็น: เส้นพลังเขียว + เกลียวทองคู่พันรอบ
  if (t > GYRO_FX.breaker - 20 && G.steps) {
    const fNow = Math.min(G.steps, flyF(G, t)), trailA = t < G.len ? 1 : clamp01(1 - (t - G.len) / BK.tail);
    const samples = Math.max(6, Math.ceil(fNow * 6)), axisPts = [];
    for (let i = 0; i <= samples; i++) {
      const f = (fNow * i) / samples, ii = Math.min(G.steps - 1, Math.floor(f)), kk = f - ii, A = c(G.pts[ii]), B = c(G.pts[ii + 1]);
      let hz = 0.45;
      for (const j of G.jumps) { const dd = Math.abs(f - j); if (dd < 1.15) hz += 1.05 * Math.pow(Math.cos((dd / 1.15) * Math.PI / 2), 2); }
      axisPts.push([lerp(A[0], B[0], kk), lerp(A[1], B[1], kk), hz, f]);
    }
    g.save(); g.globalCompositeOperation = "lighter";
    const core = axisPts.map((p) => P(p[0], p[1], p[2]));
    ribbonPath(g, core, (i) => core[i][2] * 0.12 * Math.pow(i / samples, 0.6) * n);
    g.fillStyle = `rgba(${GREEN},${0.32 * trailA})`; g.fill();
    if (!lowQ) { ribbonPath(g, core, (i) => core[i][2] * 0.035 * (i / samples) * n); g.fillStyle = `rgba(${GREEN_HI},${0.7 * trailA})`; g.fill(); }
    const spin = REDUCED ? 0 : now * 0.012;
    for (let s = 0; s < 2; s++) {
      const hp = [];
      for (let i = 0; i < axisPts.length; i++) {
        const [x, y, z, f] = axisPts[i], A = axisPts[Math.max(0, i - 1)], B = axisPts[Math.min(axisPts.length - 1, i + 1)];
        let vx = B[0] - A[0], vy = B[1] - A[1]; const l = Math.hypot(vx, vy) || 1; vx /= l; vy /= l;
        const th = f * 2.6 - spin + s * Math.PI, r = 0.32 * n * (0.35 + 0.65 * (i / axisPts.length));
        hp.push(P(x - vy * Math.cos(th) * r, y + vx * Math.cos(th) * r, z + Math.sin(th) * r));
      }
      ribbonPath(g, hp, (i) => Math.max(0.6, hp[i][2] * 0.03));
      g.fillStyle = `rgba(${GOLD},${0.75 * trailA})`; g.fill();
      if (!lowQ) { ribbonPath(g, hp, (i) => Math.max(0.4, hp[i][2] * 0.011)); g.fillStyle = `rgba(${GOLD_HI},${0.9 * trailA})`; g.fill(); }
    }
    // ประกายทองหลุดจากเกลียว
    if (!lowQ) for (let i = 0; i < 24; i++) {
      const f = hash01(i + 300) * fNow, ii = Math.min(G.steps - 1, Math.floor(f)), kk = f - ii, A = c(G.pts[ii]), B = c(G.pts[ii + 1]);
      const born = GYRO_FX.breaker + GYRO_FX.breakerStep * f, age = (t - born) / 600;
      if (age < 0 || age > 1) continue;
      const [px, py, ps] = P(lerp(A[0], B[0], kk) + (hash01(i + 9) - 0.5) * 0.5, lerp(A[1], B[1], kk) + (hash01(i + 19) - 0.5) * 0.5, 0.4 + age * 0.9);
      g.fillStyle = `rgba(${GOLD_HI},${(1 - age) * trailA})`; g.beginPath(); g.arc(px, py, Math.max(1, ps * 0.025), 0, TAU); g.fill();
    }
    g.restore();
  }
  // ของที่พัง: แสงเขียวแตก + เศษ (เศษชิ้นใหญ่ = fx "smash" ของ boardDraw ที่ BoardStage ส่งตามจังหวะ)
  for (const s of G.smashed) {
    const at = GYRO_FX.breaker + GYRO_FX.breakerStep * s.i, [px, py, ps] = P(s.x + 0.5, s.y + 0.5, 0.5);
    greenBurst(g, px, py, ps, t - at, 340, 1.1, lowQ, 61 + s.x * 3 + s.y, true);
  }
  // คนที่ถูกดันออกข้าง: แสงปะทะ + ฝุ่นที่ปลายทาง
  for (const s of G.shoves) {
    const [px, py, ps] = P(s.from.x + 0.5, s.from.y + 0.5, 0.55);
    greenBurst(g, px, py, ps, t - s.ms, 260, 0.75, lowQ, 81 + s.from.x);
    dustPuff(g, s.to.x + 0.5, s.to.y + 0.5, (t - s.ms - SHOVE_MS * 0.7) / 380, lowQ ? 3 : 6, 0.35, 0.8, 13 + s.to.y);
  }
  // ลงพื้น: ฝุ่น + คลื่นวง + รอยเกลียวทองบนพื้น
  const la = t - G.len;
  if (la >= 0 && G.steps) {
    const q = la / BK.tail;
    dustPuff(g, last[0], last[1], q * 1.4, lowQ ? 5 : 10, 0.7 * n, 1, 31);
    groundRing(g, last[0], last[1], (0.3 + 1.2 * easeOut3(q)) * n, 0.8 * (1 - q), GREEN_HI, 3 * (1 - q) + 1);
    goldenSpiral(g, last[0], last[1], 0.7 * n, 0.8, 0.8 * (1 - q), 1, lowQ);
  }
  g.restore();
}

// ---------- ม้า (เหตุการณ์ขึ้น/ลง/ตาย) ----------
function horseFx(g, e, t, lowQ) {
  if (!okT(e.at) || t >= HORSE_MS) return;
  const [cx, cy] = cen(e.at), q = t / HORSE_MS;
  if (e.mode === "mount") {
    dustPuff(g, cx, cy, q * 1.3, lowQ ? 5 : 10, 0.6, 1, 3);
    groundRing(g, cx, cy, 0.3 + 0.8 * easeOut3(q), 0.8 * (1 - q), GOLD, 2);
    const [sx, sy, ss] = P(cx, cy, 0.7);
    g.save(); g.globalCompositeOperation = "lighter"; glow(g, sx, sy, ss * (0.4 + 0.6 * q), GOLD, 0.5 * (1 - q)); g.restore();
    return;
  }
  // รูปม้าที่ถอยออก/สลาย วาดในชั้นตัวละคร (gyroHorse — ใต้หมาก) · ที่นี่เหลือฝุ่น/ละออง
  if (e.mode === "dismount") { dustPuff(g, cx, cy, q * 1.2, lowQ ? 4 : 8, 0.55, 0.9, 7); return; }
  if (q < 0.3) { const [sx, sy, ss] = P(cx, cy, 0.7); g.save(); g.globalCompositeOperation = "lighter"; glow(g, sx, sy, ss * 0.9, "255,250,235", 0.7 * (1 - q / 0.3)); g.restore(); }
  g.save(); g.globalCompositeOperation = "lighter";
  const N = lowQ ? 10 : 30;
  for (let i = 0; i < N; i++) {
    const age = clamp01(q * 1.3 - hash01(i + 4) * 0.3);
    if (age <= 0 || age >= 1) continue;
    const [px, py, ps] = P(cx + (hash01(i + 1) - 0.5) * 1.1, cy + (hash01(i + 2) - 0.5) * 0.5, 0.2 + hash01(i + 3) * 0.8 + age * 1.4);
    g.fillStyle = `rgba(${i % 3 ? "255,236,214" : GOLD_HI},${Math.sin(Math.PI * age) * 0.9})`; g.beginPath(); g.arc(px, py, Math.max(1, ps * 0.03), 0, TAU); g.fill();
  }
  g.restore();
}
// ได้สัดส่วนทองคำ: ประกายทองเล็กๆ ที่กีบม้า
function tickFx(g, e, t, lowQ) {
  if (!okT(e.at) || t >= TICK_MS) return;
  const [cx, cy] = cen(e.at), q = t / TICK_MS, n = Math.min(lowQ ? 6 : 16, 4 + 2 * Math.max(1, e.gain | 0));
  groundRing(g, cx, cy, 0.25 + 0.35 * easeOut3(q), 0.6 * (1 - q), GOLD, 1.5);
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < n; i++) {
    const th = hash01(i + 40) * TAU, sp = 0.2 + 0.4 * hash01(i + 50), z = 0.05 + 0.9 * q * hash01(i + 60) - 0.6 * q * q;
    if (z < 0) continue;
    const [px, py, ps] = P(cx + Math.cos(th) * (0.18 + sp * q), cy + Math.sin(th) * (0.12 + sp * q), z), a = (1 - q) * 0.95, k = Math.max(1.2, ps * 0.03);
    g.fillStyle = `rgba(${GOLD_HI},${a})`;
    g.fillRect(px - k, py - k * 0.25, k * 2, k * 0.5); g.fillRect(px - k * 0.25, py - k, k * 0.5, k * 2);
  }
  g.restore();
}

// ---------- ทางเข้า: วาดเอฟเฟกต์ครั้งเดียว (boardDraw — หลังตัวละคร) ----------
export function gyroFx(g, e, now, lowQ, view) {
  const t = now - e.t0;
  if (t < 0) return;
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  switch (e.kind) {
    case "gyroThrow": throwFx(g, e, t, now, lowQ); break;
    case "gyroRecall": recallFx(g, e, t, now, lowQ); break;
    case "gyroSecret": secretFx(g, e, t, now, lowQ); break;
    case "gyroGolden": goldenFx(g, e, t, now, lowQ, view); break;
    case "gyroBreaker": breakerFx(g, e, t, now, lowQ, view); break;
    case "gyroHorse": horseFx(g, e, t, lowQ); break;
    case "gyroTick": tickFx(g, e, t, lowQ); break;
    default:
  }
  g.restore();
}

// ---------- หมากที่ฉากย้ายเอง (BoardCanvas) ----------
//  u = หมากจาก state ({ id, x, y }) · คืน { x, y, hz, sq, fly } | null
//  ฉากจบแล้วแต่ state ยังไม่ย้าย (ยังอยู่ช่องเดิม) = ค้างที่ปลายทางจนหมดเวลา HOLD
export function gyroPose(list, u, now) {
  if (!u || u.id == null || !Array.isArray(list)) return null;
  const id = u.id, atFrom = (from) => samePt(u, from);
  for (const e of list) {
    if (!e || (e.kind !== "gyroSecret" && e.kind !== "gyroBreaker")) continue;
    const t = now - e.t0;
    if (t < 0 || t >= (e.dur || 0)) continue;
    if (e.kind === "gyroSecret" && okT(e.from)) {
      const G = secretGeo(e), p = G.pulls.find((q) => q.id === id);
      if (!p) continue;
      if (t < GYRO_FX.secret) { const pos = pullPos(p, G, t); return { x: pos.x, y: pos.y, hz: t > p.t0 && t < p.t1 ? 0.12 : 0, sq: 0 }; }
      if (atFrom(p.from) && !samePt(p.from, p.to)) return { x: p.to.x, y: p.to.y, hz: 0, sq: 0 };
      continue;
    }
    const G = breakerGeo(e);
    if (e.targetId === id) {
      if (t < G.len) return flyPose(G, t);
      const end = G.pts[G.steps];
      if (atFrom(G.pts[0]) && G.steps) return { x: end.x, y: end.y, hz: 0, sq: 0 };
      continue;
    }
    const s = G.shoves.find((q) => q.id === id);
    if (s) {
      if (t < s.ms) return { x: s.from.x, y: s.from.y, hz: 0, sq: 0 };
      if (t < s.ms + SHOVE_MS) { const k = easeOut2((t - s.ms) / SHOVE_MS); return { x: lerp(s.from.x, s.to.x, k), y: lerp(s.from.y, s.to.y, k), hz: Math.sin(Math.PI * k) * 0.3, sq: 0 }; }
      if (atFrom(s.from)) return { x: s.to.x, y: s.to.y, hz: 0, sq: 0 };
    }
  }
  return null;
}

// ---------- ลูกบนพื้น (เรียงความลึกกับตัวละคร) ----------
//  balls = [{ owner, color, x, y, seq }] จาก state · ระหว่างลูกบิน/วิ่งกลับ ซ่อน/เติมลูกตามฉาก (ไม่ซ้อนสองลูก)
export function gyroBallItems(items, g, balls, fx, now, lowQ) {
  const list = Array.isArray(balls) ? balls.filter(okT).slice() : [];
  const take = (owner, at) => { const i = list.findIndex((b) => b.owner === owner && samePt(b, at)); if (i >= 0) list.splice(i, 1); return i >= 0; };
  for (const e of fx) {
    if (e.kind === "gyroThrow" && okT(e.land)) {
      const t = now - e.t0;
      if (t < 0) continue;
      if (t < GYRO_FX.throw) take(e.id, e.land);
      else if (!list.some((b) => b.owner === e.id && samePt(b, e.land))) list.push({ owner: e.id, color: e.color, x: e.land.x, y: e.land.y, seq: 0 });
    } else if (e.kind === "gyroRecall" && okT(e.from)) {
      const t = now - e.t0;
      if (t >= 0 && t < GYRO_FX.recall + 1200) take(e.id, e.from);
    }
  }
  if (!list.length) return;
  const tiles = new Map();
  for (const b of list) { const k = b.x + "," + b.y; if (!tiles.has(k)) tiles.set(k, []); tiles.get(k).push(b); }
  const ax = viewAxes();
  for (const group of tiles.values()) {
    group.sort((a, b) => String(a.owner).localeCompare(String(b.owner)) || (a.seq | 0) - (b.seq | 0));
    group.forEach((b, i) => {
      // ลูกเดียว = ค่อนมาหน้าซ้ายของช่อง (ไม่ทับหมากที่ยืนอยู่) · หลายลูก = เรียงวงรอบจุดนั้น
      const m = group.length, th = (i / m) * TAU + 0.6, rr = m > 1 ? 0.2 : 0;
      const ox = ax.fx * 0.2 - ax.rx * 0.18 + Math.cos(th) * rr, oy = ax.fy * 0.2 - ax.ry * 0.18 + Math.sin(th) * rr;
      const px = b.x + 0.5 + ox, py = b.y + 0.5 + oy;
      items.push({ d: depthOf(px, py), f: () => groundBall(g, b, px, py, now, lowQ) });
    });
  }
}
function groundBall(g, b, px, py, now, lowQ) {
  const own = rgbStr(b.color), seed = hash01((b.seq | 0) + b.x * 13 + b.y * 7) * 10;
  g.save();
  gEllipse(g, px, py, 0.21, 0.01, 28); g.fillStyle = `rgba(${own},0.24)`; g.fill();
  g.strokeStyle = `rgba(${own},0.95)`; g.lineWidth = 2.4; g.stroke();
  gEllipse(g, px, py, 0.25, 0.01, 28); g.strokeStyle = "rgba(255,255,255,0.55)"; g.lineWidth = 1; g.stroke();
  for (let k = 0; k < (lowQ ? 1 : 2); k++) {
    const age = REDUCED ? 0.5 : ((now / 1400) + k / 2 + seed) % 1;
    groundRing(g, px, py, 0.2 + 0.45 * age, 0.45 * (1 - age), GREEN_HI, 1.6);
  }
  gEllipse(g, px + 0.02, py + 0.03, 0.14, 0, 20); g.fillStyle = "rgba(0,0,0,.3)"; g.fill();
  const bob = REDUCED ? 0 : Math.sin(now / 380 + seed) * 0.012;
  const [sx, sy, ss] = P(px, py, BALL_R + 0.01 + bob);
  drawBall(g, sx, sy, ss * BALL_R, REDUCED ? seed : now * 0.02 + seed, 0.35, { lines: lowQ ? 0 : 0.55, lowQ, glow: 0.8 });
  if (!lowQ) airWaves(g, sx, sy, ss * BALL_R, now + seed * 300, 1000, 0.35, 2);
  g.restore();
}

// ---------- ไจโรบนกระดาน (boardDraw drawUnit) ----------
//  ติดตามต่อตัว: ทิศที่หัน (ตามทางเดินบนจอ) · กำลังควบ · ขึ้นม้า (ค่อยๆ ปรากฏ) · ม้าโดนตี (แวบ) · ฝุ่นกีบ
const track = new Map();
function trackOf(u, now, wx, wy) {
  let tr = track.get(u.id);
  const G = u.gyro || {}, [sx] = P(wx, wy);
  if (!tr) {
    if (track.size > 24) track.clear();
    tr = { wx, wy, sx, face: -1, moveT: -1e9, mounted: !!G.mounted, mT0: 0, offT: -1e9, offDie: false, hp: G.horseHp, hitT: -1e9, dust: [], dustT: 0, frame: now };
    track.set(u.id, tr);
  }
  if (tr.frame !== now) {
    const moved = Math.hypot(wx - tr.wx, wy - tr.wy) > 0.002;
    if (moved) {
      tr.moveT = now;
      if (Math.abs(sx - tr.sx) > 0.3) tr.face = sx > tr.sx ? 1 : -1;
      if (G.mounted && now - tr.dustT > (u.lowQ ? 110 : 55)) {
        tr.dustT = now;
        const vx = wx - tr.wx, vy = wy - tr.wy, l = Math.hypot(vx, vy) || 1;
        tr.dust.push({ x: wx - (vx / l) * 0.3 + (Math.random() - 0.5) * 0.25, y: wy - (vy / l) * 0.3 + (Math.random() - 0.5) * 0.25, t0: now, dx: -(vx / l) * 0.25, dy: -(vy / l) * 0.25 });
        if (tr.dust.length > 24) tr.dust.shift();
      }
    }
    if (!!G.mounted !== tr.mounted) {
      tr.mounted = !!G.mounted; tr.mT0 = tr.mounted ? now : 0;
      if (!tr.mounted) { tr.offT = now; tr.offDie = !(G.horseHp > 0); }
    }
    if (Number.isFinite(G.horseHp) && Number.isFinite(tr.hp) && G.horseHp < tr.hp) tr.hitT = now;
    tr.hp = G.horseHp;
    tr.wx = wx; tr.wy = wy; tr.sx = sx; tr.frame = now;
  }
  return tr;
}
// ก่อนฐานหมาก: ฝุ่นกีบ · เกลียวทองคำหมุนใต้ตัว + เปลวออร่าครึ่งหลัง (เสริมพลัง)
export function gyroUnitBack(g, u, now, wx, wy) {
  const G = u.gyro;
  if (!G) return;
  const tr = trackOf(u, now, wx, wy);
  tr.dust = tr.dust.filter((d) => now - d.t0 < 620);
  for (const d of tr.dust) {
    const q = (now - d.t0) / 620, [px, py, ps] = P(d.x + d.dx * q, d.y + d.dy * q, 0.04 + q * 0.28), rr = ps * (0.06 + 0.12 * q);
    const gr = g.createRadialGradient(px, py, 0, px, py, rr);
    gr.addColorStop(0, `rgba(${DUST},${0.5 * (1 - q)})`); gr.addColorStop(1, `rgba(${DUST},0)`);
    g.fillStyle = gr; g.fillRect(px - rr, py - rr, rr * 2, rr * 2);
  }
  if (G.empowered) {
    goldenSpiral(g, wx, wy, 0.95, REDUCED ? 0.3 : now / 2600, 0.85, 1, u.lowQ);
    const [sx, sy, ss] = P(wx, wy, 0.9), pulse = REDUCED ? 0 : 0.08 * Math.sin(now / 260);
    g.save(); g.globalCompositeOperation = "lighter"; glow(g, sx, sy, ss * 1.25, GOLD, 0.34 + pulse); g.restore();
    auraFlames(g, wx, wy, now, 1.15, "back", u.lowQ, 0.5, 2.0);
  }
}
// ม้าที่เพิ่งหายจากใต้หมาก (state mounted → false): ลงม้า = ถอยออกด้านหลังแล้วจาง · ม้าตาย (horseHp 0) = แวบขาว ลอยขึ้นแล้วจาง
const LEAVE_MS = 760;
function horseLeaving(g, tr, img, now, wx, wy) {
  const t = now - tr.offT;
  if (!(t >= 0 && t < LEAVE_MS)) return;
  const q = t / LEAVE_MS, [bx, by, s] = P(wx, wy), H = s * HORSE_H, W = (H * img.naturalWidth) / img.naturalHeight, f = tr.face > 0 ? -1 : 1;
  g.save();
  if (tr.offDie) {
    g.globalAlpha *= 1 - q;
    g.translate(bx, by + s * 0.2 - q * s * 0.35); g.scale(f, 1); g.rotate(-0.08 * q);
    g.drawImage(img, -W * 0.5, -H, W, H);
    if (q < 0.35) { g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.85 * (1 - q / 0.35); g.drawImage(img, -W * 0.5, -H, W, H); }
  } else {
    g.globalAlpha *= clamp01(1 - q * 1.1);
    g.translate(bx + f * s * 0.7 * easeOut2(q), by + s * 0.2); g.scale(f, 1);
    g.drawImage(img, -W * 0.5, -H, W, H);
  }
  g.restore();
}
// หลังเสาหมาก ก่อนหกเหลี่ยม: ม้าวาลคิรี (หันตามทาง · ควบ = เด้ง/เอน · โดนตี = แวบ · เพิ่งขึ้น = ค่อยๆ ปรากฏ)
export function gyroHorse(g, u, now, wx, wy, liftZ = 0) {
  const G = u.gyro;
  if (!G) return;
  const img = horse(), tr = trackOf(u, now, wx, wy);
  if (!img) return;
  if (!G.mounted) { horseLeaving(g, tr, img, now, wx, wy); return; }
  const fade = tr.mT0 ? clamp01((now - tr.mT0) / 320) : 1, moving = now - tr.moveT < 140;
  const [bx, by, s] = P(wx, wy, Math.max(0, liftZ));
  const bob = REDUCED ? 0 : moving ? Math.abs(Math.sin(now / 85)) * s * 0.055 : Math.sin(now / 760) * s * 0.008;
  const H = s * HORSE_H, W = (H * img.naturalWidth) / img.naturalHeight, f = tr.face > 0 ? -1 : 1;
  g.save(); g.globalAlpha *= fade;
  if (liftZ <= 0.05) { gEllipse(g, wx + 0.03, wy + 0.06, 0.5, 0, 28, 0.28); g.fillStyle = "rgba(0,0,0,.24)"; g.fill(); }
  g.translate(bx, by + s * 0.2 - bob - (1 - fade) * s * 0.15); g.scale(f, 1);
  if (moving && !REDUCED) g.rotate(Math.sin(now / 85) * 0.035);
  g.drawImage(img, -W * 0.5, -H, W, H);
  const hit = now - tr.hitT;
  if (hit >= 0 && hit < 260) { g.globalCompositeOperation = "lighter"; g.globalAlpha *= 0.85 * (1 - hit / 260); g.drawImage(img, -W * 0.5, -H, W, H); }
  g.restore();
}
// หลังหกเหลี่ยม: เสริมพลัง = เปลวออร่าครึ่งหน้า + อนุภาคทองวนแขน + ลูกทองห่อเขียวในมือ
export function gyroUnitFront(g, u, now, wx, wy, bx, hy, hexR) {
  const G = u.gyro;
  if (!G || !G.empowered) return;
  auraFlames(g, wx, wy, now, 1.15, "front", u.lowQ, 0.5, 2.0);
  const hx = bx + hexR * 1.05, hyy = hy + hexR * 0.35;
  armMotes(g, hx, hyy, hexR * 0.9, now, 1, u.lowQ);
  drawBall(g, hx, hyy, hexR * 0.3, REDUCED ? 0.6 : now * 0.035, -0.4, { gold: 1, lines: 0.8, lowQ: u.lowQ, glow: 1.2 });
}

// ---------- socket "gyroFx" → fx (BoardStage / หน้าทดสอบ) ----------
//  ctx = { posOf(id) → {x,y}|null · sizeOf(id) → ช่อง · terrainAt(x, y) → ชนิดสิ่งกีดขวาง|null · idAt({x,y}) → id|null }
//  คืน { fx, look: [[{x,y}, ms]], shake: [ms], busy: [{ id, ms }] (หมากที่ฉากย้ายเอง), later: [[ms, fx[]]] }
//  ไม่มีเสียง — server เล่นเอง (engine.sfx / เสียงพากย์)
export function gyroEventFx(ev, ctx = {}) {
  const out = { fx: [], look: [], shake: [], busy: [], later: [] };
  if (!ev || typeof ev !== "object") return out;
  const posOf = (id) => (id != null && typeof ctx.posOf === "function" ? ctx.posOf(id) : null);
  const sizeOf = (id) => (id != null && typeof ctx.sizeOf === "function" ? Math.max(1, ctx.sizeOf(id) | 0) : 1);
  const idAt = (p) => (okT(p) && typeof ctx.idAt === "function" ? ctx.idAt(p) : null);
  const ping = (id, ms, at) => { if (id != null) out.fx.push({ kind: "gyroPing", x: at ? at.x : 0, y: at ? at.y : 0, hitIds: [id], hitDelay: Math.max(0, Math.round(ms)), dur: Math.round(ms) + PING_MS }); };
  const base = { id: ev.id, color: ev.color || null };
  switch (ev.kind) {
    case "throw": {
      if (!okT(ev.from) || !okT(ev.to)) break;
      const tid = idAt(ev.to);
      out.fx.push({ ...base, kind: "gyroThrow", from: ptOf(ev.from), to: ptOf(ev.to), land: okT(ev.land) ? ptOf(ev.land) : ptOf(ev.to), toSize: sizeOf(tid), hit: !!ev.hit, counter: !!ev.counter, empowered: !!ev.empowered, dur: GYRO_FX_DUR.gyroThrow });
      out.look.push([ptOf(ev.to), 0]);
      if (ev.hit) { out.shake.push(TH.hit); ping(tid, TH.hit, ev.to); }
      break;
    }
    case "recall": {
      if (!okT(ev.from) || !okT(ev.to)) break;
      const e = { ...base, kind: "gyroRecall", from: ptOf(ev.from), to: ptOf(ev.to), path: Array.isArray(ev.path) ? ev.path.filter(okT).map(ptOf) : [], dur: GYRO_FX_DUR.gyroRecall };
      const G = recallGeo(e);
      e.hitsAt = (Array.isArray(ev.hits) ? ev.hits : []).map((id) => { const p = posOf(id); return okT(p) ? { id, x: p.x, y: p.y, ms: Math.round(G.timeAt(polyNear(G, p.x + 0.5, p.y + 0.5))) } : null; }).filter(Boolean);
      for (const h of e.hitsAt) ping(h.id, h.ms, h);
      out.fx.push(e);
      out.look.push([e.from, 0], [e.to, 300]);
      break;
    }
    case "secret": {
      if (!okT(ev.from)) break;
      const e = { ...base, kind: "gyroSecret", from: ptOf(ev.from), dir: ev.dir, len: ev.len, tiles: Array.isArray(ev.tiles) ? ev.tiles.filter(okT).map(ptOf) : [], pulls: Array.isArray(ev.pulls) ? ev.pulls : [], dur: GYRO_FX_DUR.gyroSecret };
      const G = secretGeo(e);
      e.hitsAt = [];
      for (const id of Array.isArray(ev.hits) ? ev.hits : []) {
        const p = posOf(id);
        if (!okT(p)) continue;
        const n = sizeOf(id), d = (p.x + n / 2 - G.A[0]) * G.v[0] + (p.y + n / 2 - G.A[1]) * G.v[1];
        const pl = G.pulls.find((q) => q.id === id), back = pl ? pl.from : p;
        e.hitsAt.push({ id, x: p.x, y: p.y, ms: Math.round(G.outT(d)) }, { id, x: back.x, y: back.y, ms: Math.round(G.backT(d)) });
      }
      for (const h of e.hitsAt) ping(h.id, h.ms, h);
      for (const p of G.pulls) out.busy.push({ id: p.id, ms: GYRO_FX.secret + HOLD });
      out.fx.push(e);
      const mid = Math.round(G.D / 2);
      out.look.push([{ x: Math.round(e.from.x + G.v[0] * mid), y: Math.round(e.from.y + G.v[1] * mid) }, 0], [e.from, SC.back - 200]);
      out.shake.push(SC.out);
      if (G.pulls.length) out.shake.push(SC.back);
      break;
    }
    case "golden": {
      if (!okT(ev.at)) break;
      out.fx.push({ ...base, kind: "gyroGolden", at: ptOf(ev.at), size: sizeOf(ev.id), dur: GYRO_FX_DUR.gyroGolden });
      out.look.push([ptOf(ev.at), 0]);
      out.shake.push(GC.burst);
      break;
    }
    case "breaker": {
      const tid = ev.targetId;
      const e = { ...base, kind: "gyroBreaker", targetId: tid, from: okT(ev.from) ? ptOf(ev.from) : posOf(tid), to: okT(ev.to) ? ptOf(ev.to) : null, path: Array.isArray(ev.path) ? ev.path : [], jumps: ev.jumps, smashed: ev.smashed, shoves: ev.shoves, dist: ev.dist, size: sizeOf(tid) };
      if (!okT(e.from)) break;
      const G = breakerGeo(e);
      e.dur = G.len + BK.tail + HOLD;
      out.fx.push(e);
      ping(tid, 0, e.from);
      if (tid != null) out.busy.push({ id: tid, ms: G.len + HOLD });
      for (const s of G.shoves) { out.busy.push({ id: s.id, ms: G.len + HOLD }); ping(s.id, s.ms, s.from); out.shake.push(s.ms); }
      out.look.push([e.from, 0]);
      if (G.steps) out.look.push([G.pts[G.steps], GYRO_FX.breaker + Math.round((G.len - GYRO_FX.breaker) * 0.4)]);
      out.shake.push(0);
      out.later.push([0, [{ kind: "iceShake", x: 0, y: 0, amp: 8, dur: 520 }]]);
      if (G.steps) { out.shake.push(G.len); out.later.push([G.len, [{ kind: "iceShake", x: 0, y: 0, amp: 5, dur: 380 }]]); }
      const sm = G.smashed.map((s) => ({ x: s.x, y: s.y, kind: (typeof ctx.terrainAt === "function" && ctx.terrainAt(s.x, s.y)) || "rock", step: s.i }));
      if (sm.length) out.later.push([GYRO_FX.breaker, [{ kind: "smash", tiles: sm }]]);
      break;
    }
    case "horse": {
      if (!okT(ev.at)) break;
      // ชนิดย่อยอยู่ที่ mode ("mount" | "dismount" | "die") — kind ของ payload คือ "horse" (§7.11)
      const mode = ev.mode || ev.action;
      if (mode !== "mount" && mode !== "dismount" && mode !== "die") break;
      out.fx.push({ ...base, kind: "gyroHorse", at: ptOf(ev.at), mode, dur: HORSE_MS });
      break;
    }
    case "goldenTick": {
      if (!okT(ev.at)) break;
      out.fx.push({ ...base, kind: "gyroTick", at: ptOf(ev.at), gain: Number(ev.gain) || 1, dur: TICK_MS });
      break;
    }
    default:
  }
  return out;
}
