// ============================================================
//  เอฟเฟกต์บนกระดานของเกรย์ (characters/gray.js) — Add (กล่องพูดได้) แปลงร่างเป็นอาวุธ · รองโกมิเนียต (เงาหอกศักดิ์สิทธิ์)
//
//  ท่าตีปกติ (attackStyle — STYLE_MS ใน boardDraw) · fx { x, y (ช่องผู้ตี), size, to: { x, y }, toSize }
//   grayScythe = เคียว: กล่อง Add วาบทอง → เคียวเหล็กกล้าขอบเงินกวาดเป็นวงต่ำผ่านเป้า หางผีฟ้าซีด (#BFE6FF→#6C8CA8) + ประกายปะทะ
//   grayHammer = ค้อน: ง้างขึ้นเหนือหัว → ทุบลงเป้า คลื่นกระแทกบนพื้น รอยร้าว เศษหิน
//   grayBow    = ธนู (ระยะ 2 · มีเฉพาะช่วงจงบ้าคลั่ง = ตีติดตรึงเสมอ): คันธนูเงิน → ลูกศรแสงผีพุ่งโค้งเข้าเป้า → โซ่ตรึง
//   *Grave     = ท่าเดียวกันระหว่างจงบ้าคลั่ง: วงเวทหลุมศพใต้เป้า → ตีลง = โซ่วิญญาณ (#7FA8B8 บนแสง #3E5560) พุ่งขึ้นพันเป้า + มือผี
//  เหตุการณ์ (socket "grayFx" → GRAY_EVENT_FX): keeper (หมอกผ้าคลุม + เงาซ้อน + ละอองฟื้นฟูสีเขียว) · grave (วงเวท + โซ่พันตัว)
//   reap (ดวงวิญญาณจากศพลอยโค้งเข้าตัว + Add วาบทอง) · beam (รองโกมิเนียต — ดูด้านล่าง)
//  รองโกมิเนียต (grayBeam · GRAY_BEAM): server ลงดาเมจที่ 1.6 วิ แล้วรออีก 2.2 วิ
//   0–1.6 วิ = หอกลดระดับเล็งตามแนว · วงเวทหมุนเร็วขึ้น · แสงพุ่งเข้าปลายหอก · เสาแสงทอง · รอยร้าวทองไล่ไปตามแนว · สนามมืดลง
//   1.6 วิ = ลำแสงขาวทองยักษ์ (แกน #FFF8E1 · ทอง #F6E7A6 · ขอบฟ้าซีด #9FD8FF) ระเบิดถึงขอบกระดาน กว้างเต็มแนว + แฟลชทั้งจอ + รัศมีแสง
//   ค้าง = เกลียวทองหมุน วงคลื่นวิ่งตามลำ ก้อนพลังไหล ประกายลอย พื้นไหม้ทอง → 3.0–3.8 วิ ลำแสงหดเรียวแล้วจางหาย
//  ระหว่างชาร์จ (p.gray.charge → prop grays ของ BoardCanvas):
//   drawGrayGround (ก่อนตัวละคร) = สนามมืดลง + แนวลำแสงที่จะยิงเป็นสีทองให้ทุกคนเห็น (ขอบแนวเรือง + แสงวิ่งตามทิศ)
//   drawGrayAir (หลังตัวละคร) = หอกทองทรงกรวยลอยเหนือหัว ใหญ่/สว่างขึ้นตามเทิร์นที่เหลือ (left 2 → 1 → 0) + โตช้าๆ ตามเวลา
//    · วงเวทหมุนรอบหอก · ละอองทองลอยจากพื้นทั่วสนามวนเข้าหาหอก
//  lowQ = ตัดอนุภาค/ชั้นเรืองครึ่งหนึ่งขึ้นไป · ลดการเคลื่อนไหว = ของที่วนตลอด (ละออง/วง/เกลียว) หยุดนิ่ง เอฟเฟกต์ครั้งเดียวยังเล่น
// ============================================================
import { P, gEllipse, glow, quad } from "./boardGeo";

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;

// ---------- จังหวะ ----------
const W_MS = { scythe: 1000, hammer: 1150, bow: 1300 };
const W_HIT = { scythe: 500, hammer: 630, bow: 700 }; // ms ที่อาวุธถึงเป้า
const GRAVE_TAIL = 300; // จงบ้าคลั่ง: โซ่พันเป้าต่ออีกเล็กน้อย
const weaponOf = (kind) => (kind.startsWith("grayHammer") ? "hammer" : kind.startsWith("grayBow") ? "bow" : "scythe");
export const GRAY_MS = {
  grayScythe: W_MS.scythe, grayHammer: W_MS.hammer, grayBow: W_MS.bow,
  grayScytheGrave: W_MS.scythe + GRAVE_TAIL, grayHammerGrave: W_MS.hammer + GRAVE_TAIL,
};
export const GRAY_HIT_P = Object.fromEntries(Object.keys(GRAY_MS).map((k) => [k, W_HIT[weaponOf(k)] / GRAY_MS[k]]));
// รองโกมิเนียต — ต้องตรงกับ characters/gray.js (BEAM_HIT_SECONDS 1.6 + BEAM_TAIL_SECONDS 2.2)
export const GRAY_BEAM = { hit: 1600, extend: 170, fade0: 3000, total: 3800 };
export const GRAY_FX_DUR = { ...GRAY_MS, grayKeeper: 1700, grayGrave: 1600, grayReap: 1600, grayBeam: GRAY_BEAM.total };
export const isGrayFx = (kind) => typeof kind === "string" && (kind in GRAY_FX_DUR);
export const GRAY_EVENT_FX = { keeper: "grayKeeper", grave: "grayGrave", reap: "grayReap", beam: "grayBeam" };
// ท่าตีที่ติดตรึง (เสียงโซ่ซ้อน — BoardStage)
export const grayChains = (style) => style === "grayBow" || style === "grayScytheGrave" || style === "grayHammerGrave";

// ---------- สี (r,g,b) ----------
const GHOST = "191,230,255", GHOST_D = "108,140,168", STEEL = "52,58,68", STEEL_HI = "232,240,247";
const CHAIN = "127,168,184", GRAVE = "62,85,96", SOUL = "200,240,255", ADD = "232,210,122", REGEN = "159,224,180";
const CORE = "255,248,225", GOLD = "246,231,166", RIM = "159,216,255", GOLD_D = "214,170,70";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const easeIn2 = (t) => t * t;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const hash01 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// ---------- เวกเตอร์ 3 มิติ (x, y = กระดาน · z = ความสูง หน่วยช่อง) ----------
const add3 = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const norm3 = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const P3 = (v) => P(v[0], v[1], v[2]);
// แกนตั้งฉาก 2 แกนของทิศ d (e1 แนวนอน · e2 ชี้ขึ้นเท่าที่ทำได้)
function basis(d) {
  let e1 = cross3(d, [0, 0, 1]);
  if (Math.hypot(e1[0], e1[1], e1[2]) < 1e-4) e1 = [1, 0, 0];
  e1 = norm3(e1);
  return [e1, norm3(cross3(e1, d))];
}
// วงกลมในอากาศ: จุด = c + A·cos·r + B·sin·r
function ring3(g, c, r, A, B, n = 36) {
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU, p = P3(add3(add3(c, A, Math.cos(a) * r), B, Math.sin(a) * r));
    if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
  }
  g.closePath();
}
function seg(g, a, b) { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }
function poly(g, pts, close) {
  g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  if (close) g.closePath();
}
// แถบตามจุดจอ pts ([sx, sy, สเกล]) กว้าง w(i) px (ครึ่งความกว้าง) — คืน path ปิด
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
// เปลือกนูน (monotone chain) ของจุดจอ
function hull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

// ---------- Add: กล่องลูกบาศก์ทอง (โครงลวดหมุน · พิกัดจอ) ----------
const CUBE_E = [[0, 1], [1, 3], [3, 2], [2, 0], [4, 5], [5, 7], [7, 6], [6, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
function addCube(g, x, y, s, rot, a) {
  if (a <= 0 || s <= 0) return;
  const c = Math.cos(rot), sn = Math.sin(rot), tl = 0.55, ct = Math.cos(tl), st = Math.sin(tl);
  const pts = [];
  for (let i = 0; i < 8; i++) {
    const X = i & 1 ? 1 : -1, Y = i & 2 ? 1 : -1, Z = i & 4 ? 1 : -1;
    const x1 = X * c - Z * sn, z1 = X * sn + Z * c;
    pts.push([x + x1 * s, y + (Y * ct - z1 * st) * s]);
  }
  g.strokeStyle = `rgba(${ADD},${a})`; g.lineWidth = Math.max(1, s * 0.16);
  g.beginPath();
  for (const [i, j] of CUBE_E) { g.moveTo(pts[i][0], pts[i][1]); g.lineTo(pts[j][0], pts[j][1]); }
  g.stroke();
}
// กล่อง Add วาบทองแล้วแปลงเป็นอาวุธ (ช่วงต้นของทุกท่าตี)
function addSummon(g, G, t, lowQ) {
  if (t > 320) return;
  const q = t / 320, [sx, sy, sc] = P(G.ox + G.fx * 0.3, G.oy + G.fy * 0.3, 1.05);
  const a = q < 0.6 ? clamp01(q / 0.15) : clamp01(1 - (q - 0.6) / 0.4);
  g.globalCompositeOperation = "lighter";
  if (!lowQ) glow(g, sx, sy, sc * (0.25 + 0.4 * q), ADD, 0.55 * a);
  g.globalCompositeOperation = "source-over";
  addCube(g, sx, sy, sc * 0.09 * (1 + q * 0.8), t / 90, a);
  if (q > 0.55) { // แตกเป็นวงทอง = แปลงร่าง
    const k = (q - 0.55) / 0.45;
    g.strokeStyle = `rgba(${ADD},${0.9 * (1 - k)})`; g.lineWidth = Math.max(1, sc * 0.02);
    g.beginPath(); g.ellipse(sx, sy, sc * (0.1 + 0.35 * k), sc * (0.07 + 0.25 * k), 0, 0, TAU); g.stroke();
  }
}

// ---------- ท่าตีปกติ ----------
function strikeGeo(e) {
  const n = Math.max(1, e.size | 0), ts = Math.max(1, e.toSize | 0);
  const ox = e.x + n / 2, oy = e.y + n / 2, tx = e.to.x + ts / 2, ty = e.to.y + ts / 2;
  let fx = tx - ox, fy = ty - oy;
  const R = Math.hypot(fx, fy) || 1; fx /= R; fy /= R;
  return { ox, oy, tx, ty, fx, fy, R, ts };
}
// ประกายปะทะ (เส้นเงิน/ฟ้า แตกออกจากเป้า) + แสงวาบ + วงบนพื้น
function impactSparks(g, G, age, lowQ, seed, n = 10) {
  if (age < 0 || age > 320) return;
  const q = age / 320, a = 1 - q, [sx, sy, sc] = P(G.tx, G.ty, 0.55);
  g.globalCompositeOperation = "lighter";
  glow(g, sx, sy, sc * (0.35 + 0.5 * q) * G.ts, GHOST, 0.8 * a);
  if (age < 90) glow(g, sx, sy, sc * 0.25, "255,255,255", 0.9 * (1 - age / 90));
  g.globalCompositeOperation = "source-over";
  gEllipse(g, G.tx, G.ty, (0.2 + 0.6 * easeOut3(q)) * G.ts, 0.02, 32);
  g.strokeStyle = `rgba(${GHOST},${0.75 * a})`; g.lineWidth = Math.max(1, 2.4 * a); g.stroke();
  const m = lowQ ? Math.ceil(n / 2) : n;
  for (let i = 0; i < m; i++) {
    const th = hash01(seed + i) * TAU, r0 = sc * 0.1, r1 = sc * (0.25 + 0.55 * easeOut3(q)) * (0.6 + 0.6 * hash01(seed + i + 40));
    const cx = Math.cos(th), cy = Math.sin(th) * 0.7;
    g.strokeStyle = `rgba(${i % 2 ? STEEL_HI : GHOST},${a})`; g.lineWidth = Math.max(1, sc * 0.018 * a + 0.6);
    seg(g, [sx + cx * r0, sy + cy * r0], [sx + cx * r1, sy + cy * r1]); g.stroke();
  }
}

// เคียว: หมุนรอบตัวผู้ตี ใบเคียวกวาดผ่านกลางเป้าที่จังหวะปะทะ
function scythe(g, G, t, hit, lowQ) {
  const t0 = hit * 0.5, t2 = hit + 170, side = 1;
  const base = Math.atan2(G.fy, G.fx), A0 = base - 1.35 * side, A1 = base + 1.3 * side;
  let head;
  if (t < t0) head = A0 - 0.22 * side * easeOut3(t / t0);
  else if (t < hit) head = lerp(A0 - 0.22 * side, base, easeIn2((t - t0) / (hit - t0)));
  else if (t < t2) head = lerp(base, A1, easeOut3((t - hit) / (t2 - hit)));
  else head = A1;
  const vis = t < t2 ? clamp01((t - 60) / 120) : clamp01(1 - (t - t2) / 200);
  const R = G.R + (G.ts - 1) * 0.15, Z = 0.6;
  const at = (ang, r, z = Z) => P(G.ox + Math.cos(ang) * r, G.oy + Math.sin(ang) * r, z);
  // หางผีฟ้าซีด (ช่วงกวาด → จางหลังกวาด)
  if (t > t0) {
    const tail = Math.max(A0 - 0.22 * side, head - side * 2.0), trailK = t < t2 ? 1 : clamp01(1 - (t - t2) / 330);
    const N = lowQ ? 12 : 22;
    g.globalCompositeOperation = "source-over";
    for (let i = 0; i < N; i++) {
      const u0 = i / N, u1 = (i + 1) / N, a0 = lerp(tail, head, u0), a1 = lerp(tail, head, u1);
      const k = Math.pow(u1, 1.4) * trailK;
      const c = u1 > 0.7 ? GHOST : GHOST_D;
      g.beginPath();
      const p0 = at(a0, R * 0.4), p1 = at(a0, R * 1.32), p2 = at(a1, R * 1.32), p3 = at(a1, R * 0.4);
      g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.lineTo(p3[0], p3[1]); g.closePath();
      g.fillStyle = `rgba(${c},${0.6 * k})`; g.fill();
    }
    const edge = [];
    for (let i = 0; i <= 18; i++) edge.push(at(lerp(tail, head, i / 18), R * 1.32));
    ribbonPath(g, edge, (i) => Math.max(0.6, edge[i][2] * 0.035 * (i / 18)));
    g.fillStyle = `rgba(${GHOST},${0.9 * trailK})`; g.fill();
  }
  if (vis <= 0) return;
  // เงาใบเคียวซ้อน (ช่วงเร็ว)
  const blade = (ang, a) => {
    const heel = R * 1.12, spine = [], edge = [];
    for (let i = 0; i <= 14; i++) {
      const s = i / 14, an = ang + side * s * 1.0, r = heel - 0.42 * Math.pow(s, 1.5), w = 0.26 * Math.pow(1 - s, 0.7) + 0.01;
      spine.push(at(an, r + w * 0.5)); edge.push(at(an, r - w * 0.5));
    }
    g.globalCompositeOperation = "source-over";
    poly(g, [...spine, ...edge.slice().reverse()], true);
    g.fillStyle = `rgba(${STEEL},${0.96 * a})`; g.fill();
    g.strokeStyle = `rgba(20,24,30,${0.8 * a})`; g.lineWidth = 1; g.stroke();
    poly(g, edge, false);
    if (!lowQ) { g.strokeStyle = `rgba(${GHOST},${0.5 * a})`; g.lineWidth = Math.max(2, edge[0][2] * 0.08); g.stroke(); }
    g.strokeStyle = `rgba(${STEEL_HI},${a})`; g.lineWidth = Math.max(1.4, edge[0][2] * 0.03); g.stroke();
    // ด้าม: จากมือผู้ตี (สูง) ถึงโคนใบ
    const hand = at(ang, 0.15, 1.05), root = at(ang, heel, Z);
    g.strokeStyle = `rgba(30,34,40,${a})`; g.lineWidth = Math.max(2, root[2] * 0.065); seg(g, hand, root); g.stroke();
    g.strokeStyle = `rgba(150,160,175,${0.6 * a})`; g.lineWidth = Math.max(1, root[2] * 0.015); g.stroke();
  };
  if (!lowQ && t > t0 && t < t2) for (let j = 2; j >= 1; j--) blade(head - side * 0.2 * j, 0.22 * vis / j);
  blade(head, vis);
  impactSparks(g, G, t - hit, lowQ, 11);
}

// ค้อน: แกว่งในระนาบตั้ง (ทิศเป้า) ง้างไปหลังหัวแล้วทุบลง
function hammer(g, G, t, hit, lowQ) {
  const up = hit * 0.45, O = [G.ox, G.oy, 0.95], L = G.R * 0.92 + 0.08, deg = Math.PI / 180;
  const thAt = (tt) => (tt < up ? lerp(30, 118, easeOut3(clamp01(tt / up))) : tt < hit ? lerp(118, -28, easeIn2((tt - up) / (hit - up))) : -28 + 7 * Math.exp(-(tt - hit) / 90) * Math.sin((tt - hit) / 30)) * deg;
  const headAt = (th) => [O[0] + G.fx * L * Math.cos(th), O[1] + G.fy * L * Math.cos(th), O[2] + L * Math.sin(th)];
  const vis = t < hit + 260 ? clamp01((t - 60) / 110) : clamp01(1 - (t - hit - 260) / 200);
  // หางผีตามทางหัวค้อน (ช่วงทุบ)
  if (t > up && t < hit + 200) {
    const k = t < hit ? 1 : 1 - (t - hit) / 200, pts = [];
    const th1 = thAt(Math.min(t, hit)), th0 = Math.min(118 * deg, th1 + 1.6);
    for (let i = 0; i <= 16; i++) pts.push(P3(headAt(lerp(th0, th1, i / 16))));
    g.globalCompositeOperation = "source-over";
    ribbonPath(g, pts, (i) => pts[i][2] * 0.2 * (i / 16));
    g.fillStyle = `rgba(${GHOST_D},${0.32 * k})`; g.fill();
    ribbonPath(g, pts, (i) => pts[i][2] * 0.07 * (i / 16));
    g.fillStyle = `rgba(${GHOST},${0.6 * k})`; g.fill();
  }
  // ปะทะ: คลื่นกระแทก 2 ชั้น · รอยร้าว · เศษหิน · ฝุ่น
  const age = t - hit;
  if (age >= 0 && age < 520) {
    const q = age / 520, a = 1 - q;
    g.globalCompositeOperation = "source-over";
    for (let j = 0; j < (lowQ ? 1 : 2); j++) {
      const qq = clamp01(q * 1.3 - j * 0.18);
      if (qq <= 0) continue;
      gEllipse(g, G.tx, G.ty, (0.25 + 1.5 * easeOut3(qq)) * G.ts, 0.02, 40);
      g.strokeStyle = `rgba(${j ? GHOST_D : GHOST},${0.85 * (1 - qq)})`; g.lineWidth = Math.max(1, 4 * (1 - qq)); g.stroke();
    }
    const n = lowQ ? 4 : 7;
    for (let i = 0; i < n; i++) {
      const th = (i / n) * TAU + hash01(i + 3) * 0.6, len = (0.35 + 0.45 * hash01(i + 9)) * G.ts * Math.min(1, age / 140);
      const mid = 0.5 + (hash01(i + 21) - 0.5) * 0.4;
      const a0 = P(G.tx, G.ty, 0.01), a1 = P(G.tx + Math.cos(th) * len * mid, G.ty + Math.sin(th) * len * mid + 0.05, 0.01), a2 = P(G.tx + Math.cos(th + 0.25) * len, G.ty + Math.sin(th + 0.25) * len, 0.01);
      g.strokeStyle = `rgba(30,36,46,${0.8 * a})`; g.lineWidth = 2.2; poly(g, [a0, a1, a2]); g.stroke();
      g.strokeStyle = `rgba(${GHOST},${0.7 * a})`; g.lineWidth = 1; g.stroke();
    }
    if (!lowQ) {
      for (let i = 0; i < 12; i++) {
        const th = hash01(i + 50) * TAU, sp = 0.6 + hash01(i + 60) * 0.9, tt = age / 1000;
        const z = 0.05 + sp * 2.4 * tt - 6 * tt * tt;
        if (z < 0) continue;
        const [px, py, ps] = P(G.tx + Math.cos(th) * sp * tt * 2.2, G.ty + Math.sin(th) * sp * tt * 2.2, z);
        g.fillStyle = `rgba(${i % 3 ? "70,74,82" : STEEL_HI},${a})`; g.fillRect(px - ps * 0.02, py - ps * 0.02, ps * 0.04, ps * 0.04);
      }
      for (let i = 0; i < 5; i++) {
        const th = (i / 5) * TAU, [px, py, ps] = P(G.tx + Math.cos(th) * 0.5 * q * G.ts, G.ty + Math.sin(th) * 0.5 * q * G.ts, 0.15 + q * 0.3);
        glow(g, px, py, ps * (0.2 + 0.3 * q), "150,156,166", 0.4 * a);
      }
    }
    if (age < 120) { const [sx, sy, sc] = P(G.tx, G.ty, 0.4); g.globalCompositeOperation = "lighter"; glow(g, sx, sy, sc * 0.7, GHOST, 0.9 * (1 - age / 120)); }
  }
  if (vis <= 0) return;
  const th = thAt(t), H = headAt(th);
  const a = norm3([H[0] - O[0], H[1] - O[1], H[2] - O[2]]), s = [-G.fy, G.fx, 0], c = cross3(a, s);
  g.globalCompositeOperation = "source-over";
  // ด้าม
  const hp = P3(add3(O, a, 0.12)), hh = P3(H);
  g.strokeStyle = `rgba(30,34,40,${vis})`; g.lineWidth = Math.max(2, hh[2] * 0.05); seg(g, hp, hh); g.stroke();
  // หัวค้อน (กล่อง) — เปลือกนูน + เส้นขอบเงิน
  const corners = [];
  for (let i = 0; i < 8; i++) corners.push(P3(add3(add3(add3(H, s, (i & 1 ? 1 : -1) * 0.27), a, (i & 2 ? 1 : -1) * 0.13), c, (i & 4 ? 1 : -1) * 0.15)));
  poly(g, hull(corners), true);
  g.fillStyle = `rgba(${STEEL},${0.97 * vis})`; g.fill();
  g.strokeStyle = `rgba(${GHOST},${0.75 * vis})`; g.lineWidth = 1.2; // ตะเข็บเงินฟ้า
  g.beginPath();
  for (const [i, j] of CUBE_E) { g.moveTo(corners[i][0], corners[i][1]); g.lineTo(corners[j][0], corners[j][1]); }
  g.stroke();
  if (!lowQ) { g.globalCompositeOperation = "lighter"; glow(g, hh[0], hh[1], hh[2] * 0.3, GHOST, 0.3 * vis); }
}

// ธนู: คันธนูเงินตั้งตรงหน้าตัว → ง้าง → ลูกศรแสงพุ่งโค้งถึงเป้า
function bow(g, G, t, hit, lowQ) {
  const loose = hit - 200, Bc = [G.ox + G.fx * 0.38, G.oy + G.fy * 0.38, 0.95], up = [0, 0, 1], f = [G.fx, G.fy, 0];
  const vis = t < loose + 250 ? clamp01((t - 100) / 120) : clamp01(1 - (t - loose - 250) / 220);
  const pull = t < loose ? easeOut3(clamp01((t - 160) / (loose - 160))) : Math.max(0, 1 - (t - loose) / 60);
  if (vis > 0) {
    const limb = [];
    for (let i = 0; i <= 16; i++) { const u = -1 + (i / 16) * 2; limb.push(P3(add3(add3(Bc, up, u * 0.5), f, -0.2 * u * u))); }
    g.globalCompositeOperation = "source-over";
    ribbonPath(g, limb, (i) => limb[i][2] * (0.03 * (1 - Math.abs(-1 + (i / 16) * 2) * 0.6)));
    g.fillStyle = `rgba(${STEEL},${vis})`; g.fill();
    poly(g, limb); g.strokeStyle = `rgba(${GHOST},${0.9 * vis})`; g.lineWidth = 1.4; g.stroke();
    const nock = P3(add3(Bc, f, -0.2 - 0.32 * pull)), tA = limb[0], tB = limb[16];
    poly(g, [tA, nock, tB]); g.strokeStyle = `rgba(${GHOST},${0.9 * vis})`; g.lineWidth = 1; g.stroke();
    if (t < loose) { // ลูกศรพาดสาย + แสงชาร์จ
      const tip = P3(add3(Bc, f, 0.42 - 0.32 * pull));
      g.globalCompositeOperation = "lighter";
      if (!lowQ) glow(g, tip[0], tip[1], tip[2] * (0.12 + 0.2 * pull), GHOST, 0.7 * vis);
      g.strokeStyle = `rgba(${GHOST},${vis})`; g.lineWidth = Math.max(1.5, tip[2] * 0.03); seg(g, nock, tip); g.stroke();
    }
  }
  // ลูกศรบิน
  if (t >= loose && t < hit + 40) {
    const arc = (u) => [lerp(Bc[0], G.tx, u), lerp(Bc[1], G.ty, u), lerp(0.95, 0.6, u) + Math.sin(Math.PI * u) * 0.35];
    const u = clamp01((t - loose) / (hit - loose)), pts = [];
    for (let i = 0; i <= 10; i++) pts.push(P3(arc(Math.max(0, u - 0.35 + 0.035 * i))));
    g.globalCompositeOperation = "lighter";
    ribbonPath(g, pts, (i) => pts[i][2] * 0.035 * (i / 10));
    g.fillStyle = `rgba(${GHOST},0.75)`; g.fill();
    const hd = pts[10];
    glow(g, hd[0], hd[1], hd[2] * 0.22, GHOST, 0.9);
    g.fillStyle = "rgba(255,255,255,0.95)"; g.beginPath(); g.arc(hd[0], hd[1], Math.max(1.5, hd[2] * 0.03), 0, TAU); g.fill();
  }
  impactSparks(g, G, t - hit, lowQ, 31, 8);
}

// วงเวทหลุมศพบนพื้น (ใต้เป้า/ใต้ตัว)
function graveSigil(g, cx, cy, r, a, rot, lowQ) {
  if (a <= 0) return;
  g.globalCompositeOperation = "source-over";
  gEllipse(g, cx, cy, r, 0.01, 44); g.fillStyle = `rgba(${GRAVE},${0.45 * a})`; g.fill();
  g.strokeStyle = `rgba(${CHAIN},${0.9 * a})`; g.lineWidth = 1.6; g.stroke();
  gEllipse(g, cx, cy, r * 0.74, 0.01, 40); g.lineWidth = 1; g.stroke();
  // ขีดอักษรรอบวง
  g.beginPath();
  const n = lowQ ? 8 : 16;
  for (let i = 0; i < n; i++) {
    const th = rot + (i / n) * TAU, p0 = P(cx + Math.cos(th) * r * 0.78, cy + Math.sin(th) * r * 0.78, 0.01), p1 = P(cx + Math.cos(th) * r * (i % 2 ? 0.9 : 0.96), cy + Math.sin(th) * r * (i % 2 ? 0.9 : 0.96), 0.01);
    g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]);
  }
  g.stroke();
  // ป้ายหลุมศพ (กากบาทยาว) ตรงกลาง
  const k = r * 0.42;
  const v0 = P(cx, cy - k, 0.01), v1 = P(cx, cy + k * 0.9, 0.01), h0 = P(cx - k * 0.5, cy - k * 0.35, 0.01), h1 = P(cx + k * 0.5, cy - k * 0.35, 0.01);
  g.lineWidth = 2; g.beginPath(); g.moveTo(v0[0], v0[1]); g.lineTo(v1[0], v1[1]); g.moveTo(h0[0], h0[1]); g.lineTo(h1[0], h1[1]); g.stroke();
  if (!lowQ) { const [sx, sy, sc] = P(cx, cy, 0.05); glow(g, sx, sy, sc * r * 1.1, CHAIN, 0.22 * a); }
}
// โซ่วิญญาณพันรอบจุด (cx, cy): สายเกลียวจากพื้นขึ้นถึงสูง h · u = ความยาวที่พุ่งขึ้นแล้ว (0..1) · tight = รัดแน่น
function chainCoil(g, cx, cy, r0, h, u, tight, a, k, nCh, lowQ) {
  if (a <= 0 || u <= 0) return;
  for (let c = 0; c < nCh; c++) {
    const pts = [], base = (c / nCh) * TAU + k * 0.9, steps = 30;
    for (let i = 0; i <= steps * u; i++) {
      const s = i / steps, th = base + s * 4.4 * (c % 2 ? -1 : 1), r = r0 * lerp(1, 0.62 - 0.12 * tight, Math.min(1, s * 1.6));
      pts.push(P(cx + Math.cos(th) * r, cy + Math.sin(th) * r, 0.02 + s * h));
    }
    if (pts.length < 2) continue;
    g.globalCompositeOperation = "source-over";
    if (!lowQ) { poly(g, pts); g.strokeStyle = `rgba(${GRAVE},${0.55 * a})`; g.lineWidth = Math.max(3, pts[0][2] * 0.09); g.stroke(); }
    // ห่วงโซ่สลับแบน/ตั้ง
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i], q = pts[i + 1], ang = Math.atan2(q[1] - p[1], q[0] - p[0]), L = Math.max(2, p[2] * 0.06);
      g.strokeStyle = `rgba(${CHAIN},${a})`; g.lineWidth = Math.max(1, p[2] * 0.016);
      if (i % 2 === 0) { g.beginPath(); g.ellipse((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, L, L * 0.48, ang, 0, TAU); g.stroke(); }
      else { seg(g, p, q); g.lineWidth = Math.max(1.4, p[2] * 0.022); g.stroke(); }
    }
    // หัวโซ่เรืองตอนกำลังพุ่ง
    if (u < 1) { const hd = pts[pts.length - 1]; g.globalCompositeOperation = "lighter"; glow(g, hd[0], hd[1], hd[2] * 0.14, CHAIN, 0.8 * a); }
  }
}
// มือผี (ปลายนิ้วโค้ง) โผล่จากวงเวท
function ghostHand(g, x, y, z, s, lean, a) {
  if (a <= 0) return;
  const [bx, by, sc] = P(x, y, z), S = sc * s;
  g.strokeStyle = `rgba(${CHAIN},${a})`; g.lineWidth = Math.max(1, S * 0.07); g.lineCap = "round";
  for (let i = -2; i <= 2; i++) {
    g.beginPath(); g.moveTo(bx + i * S * 0.08, by);
    g.quadraticCurveTo(bx + i * S * 0.13 + lean * S * 0.1, by - S * 0.35, bx + i * S * 0.1 + lean * S * 0.25, by - S * (0.5 - Math.abs(i) * 0.06));
    g.stroke();
  }
  g.fillStyle = `rgba(${GRAVE},${0.6 * a})`; g.beginPath(); g.ellipse(bx, by + S * 0.04, S * 0.2, S * 0.08, 0, 0, TAU); g.fill();
}
// จงบ้าคลั่ง/ธนู: วงเวทใต้เป้า → ตีลง = โซ่พุ่งขึ้นพันเป้า · ground = วาดเฉพาะวงเวท (ก่อนอาวุธ)
function graveBind(g, G, t, hit, dur, bowShot, lowQ, ground) {
  const s0 = bowShot ? hit - 90 : hit * 0.35;
  if (t < s0) return;
  const out = clamp01((dur - t) / 220), a = Math.min(clamp01((t - s0) / 140), out), r = 0.62 * G.ts;
  const rot = REDUCED ? 0 : t / 700;
  if (ground) { graveSigil(g, G.tx, G.ty, r * (0.6 + 0.4 * clamp01((t - s0) / 200)), a, rot, lowQ); return; }
  if (t < hit) return;
  const u = easeOut3(clamp01((t - hit) / 260)), tight = clamp01((t - hit - 200) / 200);
  chainCoil(g, G.tx, G.ty, r * 0.95, 1.15 * Math.min(1.5, G.ts), u, tight, a, t / 1000, lowQ ? 2 : 4, lowQ);
  if (!lowQ) {
    const hu = clamp01((t - hit) / 200);
    for (let i = 0; i < 2; i++) {
      const th = Math.atan2(G.fy, G.fx) + Math.PI + (i ? 0.9 : -0.9);
      ghostHand(g, G.tx + Math.cos(th) * r * 0.75, G.ty + Math.sin(th) * r * 0.75, 0.02 + 0.25 * hu, 0.55, i ? 1 : -1, a * hu * 0.85);
    }
  }
  if (tight > 0 && tight < 1) { const [sx, sy, sc] = P(G.tx, G.ty, 0.6); g.globalCompositeOperation = "lighter"; glow(g, sx, sy, sc * 0.6, CHAIN, 0.5 * Math.sin(Math.PI * tight)); }
}
function grayStrike(g, e, now, lowQ) {
  if (!e.to) return;
  const t = now - e.t0, dur = GRAY_MS[e.kind];
  if (t < 0 || t >= dur) return;
  const w = weaponOf(e.kind), G = strikeGeo(e), hit = W_HIT[w];
  const bind = grayChains(e.kind);
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  if (bind) graveBind(g, G, t, hit, dur, w === "bow", lowQ, true);
  addSummon(g, G, t, lowQ);
  if (w === "scythe") scythe(g, G, t, hit, lowQ);
  else if (w === "hammer") hammer(g, G, t, hit, lowQ);
  else bow(g, G, t, hit, lowQ);
  if (bind) graveBind(g, G, t, hit, dur, w === "bow", lowQ, false);
  g.restore();
}

// ---------- เหตุการณ์ ----------
// เงาผู้คลุมผ้า (พิกัดจอ) — ร่างซ้อนของคนเฝ้าสุสาน
function hooded(g, x, y, h, a) {
  g.beginPath();
  g.moveTo(x, y - h * 0.5);
  g.quadraticCurveTo(x + h * 0.21, y - h * 0.5, x + h * 0.19, y - h * 0.24);
  g.lineTo(x + h * 0.36, y + h * 0.45);
  g.quadraticCurveTo(x, y + h * 0.53, x - h * 0.36, y + h * 0.45);
  g.lineTo(x - h * 0.19, y - h * 0.24);
  g.quadraticCurveTo(x - h * 0.21, y - h * 0.5, x, y - h * 0.5);
  g.closePath();
  g.fillStyle = `rgba(196,204,214,${a})`; g.fill();
  g.strokeStyle = `rgba(235,240,246,${a})`; g.lineWidth = 1; g.stroke();
}
function keeperFx(g, e, t, lowQ) {
  const q = t / GRAY_FX_DUR.grayKeeper, n = Math.max(1, e.size | 0), cx = e.at.x + n / 2, cy = e.at.y + n / 2;
  const env = Math.sin(Math.PI * clamp01(q));
  g.globalCompositeOperation = "source-over";
  gEllipse(g, cx, cy, 0.5 + 0.45 * easeOut3(q), 0.02, 40); g.strokeStyle = `rgba(180,190,200,${0.55 * (1 - q)})`; g.lineWidth = 2; g.stroke();
  // หมอกผ้าคลุมสีเทาหมุนวนรอบตัว
  const N = lowQ ? 8 : 16;
  for (let i = 0; i < N; i++) {
    const th = (i / N) * TAU + q * 2.8, r = 0.38 + 0.32 * q + 0.1 * hash01(i), z = 0.15 + hash01(i + 7) * 1.1 + q * 0.4;
    const [sx, sy, sc] = P(cx + Math.cos(th) * r, cy + Math.sin(th) * r, z), rad = sc * (0.18 + 0.12 * hash01(i + 3));
    const gr = g.createRadialGradient(sx, sy, 0, sx, sy, rad);
    gr.addColorStop(0, `rgba(158,166,178,${0.5 * env})`); gr.addColorStop(1, "rgba(158,166,178,0)");
    g.fillStyle = gr; g.fillRect(sx - rad, sy - rad, rad * 2, rad * 2);
  }
  // ร่างซ้อนจางๆ แยกออกซ้าย/ขวา
  const [bx, by, bs] = P(cx, cy, 0.75);
  for (const sd of [-1, 1]) hooded(g, bx + sd * bs * (0.18 + 0.55 * easeOut3(q)), by - bs * 0.05, bs * 0.95, 0.3 * (1 - q) * clamp01(q * 8));
  // ละอองฟื้นฟูสีเขียวลอยขึ้น
  const M = lowQ ? 6 : 14;
  for (let i = 0; i < M; i++) {
    const age = clamp01(q * 1.4 - hash01(i + 30) * 0.4), th = hash01(i + 11) * TAU, r = 0.15 + 0.4 * hash01(i + 17);
    if (age <= 0 || age >= 1) continue;
    const [px, py, ps] = P(cx + Math.cos(th) * r, cy + Math.sin(th) * r, 0.1 + age * 1.8), a = Math.sin(Math.PI * age);
    if (!lowQ) { g.globalCompositeOperation = "lighter"; glow(g, px, py, ps * 0.1, REGEN, 0.6 * a); g.globalCompositeOperation = "source-over"; }
    const k = Math.max(1.5, ps * 0.035);
    g.fillStyle = `rgba(${REGEN},${a})`;
    if (i % 3) { g.beginPath(); g.arc(px, py, k * 0.6, 0, TAU); g.fill(); }
    else { g.fillRect(px - k, py - k * 0.28, k * 2, k * 0.56); g.fillRect(px - k * 0.28, py - k, k * 0.56, k * 2); }
  }
}
function graveFx(g, e, t, lowQ) {
  const D = GRAY_FX_DUR.grayGrave, n = Math.max(1, e.size | 0), cx = e.at.x + n / 2, cy = e.at.y + n / 2;
  const a = Math.min(clamp01(t / 200), clamp01((D - t) / 320));
  graveSigil(g, cx, cy, (0.5 + 0.35 * easeOut3(clamp01(t / 300))) * n, a, REDUCED ? 0 : t / 800, lowQ);
  if (!lowQ) {
    const [sx, sy, sc] = P(cx, cy, 0.8);
    g.globalCompositeOperation = "lighter"; glow(g, sx, sy, sc * 0.9, GRAVE, 0.55 * a); g.globalCompositeOperation = "source-over";
  }
  chainCoil(g, cx, cy, 0.62 * n, 1.75, easeOut3(clamp01((t - 160) / 560)), clamp01((t - 700) / 300), a, t / 1000, lowQ ? 2 : 3, lowQ);
}
function reapFx(g, e, t, lowQ) {
  if (!e.from) return;
  const n = Math.max(1, e.size | 0), F = [e.from.x + 0.5, e.from.y + 0.5], A = [e.at.x + n / 2, e.at.y + n / 2];
  const T1 = 480, T2 = 1250, D = GRAY_FX_DUR.grayReap;
  g.globalCompositeOperation = "source-over";
  // เสาแสงผีที่ศพ
  if (t < T2) {
    const u = clamp01(t / T1), k = t < T1 ? 1 : 1 - (t - T1) / (T2 - T1);
    gEllipse(g, F[0], F[1], 0.42, 0.02, 32); g.fillStyle = `rgba(${GRAVE},${0.45 * k})`; g.fill();
    g.strokeStyle = `rgba(${SOUL},${0.7 * k})`; g.lineWidth = 1.4; g.stroke();
    const b = P(F[0], F[1], 0), top = P(F[0], F[1], 1.7 * easeOut3(u));
    const gr = g.createLinearGradient(b[0], b[1], top[0], top[1]);
    gr.addColorStop(0, `rgba(${SOUL},${0.45 * k})`); gr.addColorStop(1, `rgba(${SOUL},0)`);
    g.fillStyle = gr; g.globalCompositeOperation = "lighter";
    g.beginPath(); g.moveTo(b[0] - b[2] * 0.3, b[1]); g.lineTo(top[0] - top[2] * 0.12, top[1]); g.lineTo(top[0] + top[2] * 0.12, top[1]); g.lineTo(b[0] + b[2] * 0.3, b[1]); g.closePath(); g.fill();
  }
  // ดวงวิญญาณ: ลอยขึ้นจากศพ → โค้งเข้าหาเกรย์
  const mid = [(F[0] + A[0]) / 2, (F[1] + A[1]) / 2, 2.6];
  const pathAt = (s) => {
    const p0 = [F[0], F[1], 1.2], p2 = [A[0], A[1], 1.0], m = 1 - s;
    return [m * m * p0[0] + 2 * m * s * mid[0] + s * s * p2[0], m * m * p0[1] + 2 * m * s * mid[1] + s * s * p2[1], m * m * p0[2] + 2 * m * s * mid[2] + s * s * p2[2]];
  };
  let wisp = null, trail = [];
  if (t < T1) wisp = [F[0], F[1], 0.2 + 1.0 * easeOut3(t / T1)];
  else if (t < T2) {
    const s = easeInOut((t - T1) / (T2 - T1));
    wisp = pathAt(s);
    for (let j = 1; j <= (lowQ ? 4 : 10); j++) if (s - j * 0.035 > 0) trail.push(pathAt(s - j * 0.035));
  }
  g.globalCompositeOperation = "lighter";
  trail.forEach((p, j) => { const [x, y, sc] = P3(p); glow(g, x, y, sc * 0.24 * (1 - j / 11), SOUL, 0.6 * (1 - j / 11)); });
  if (wisp) {
    const [x, y, sc] = P3(wisp), fl = REDUCED ? 1 : 0.85 + 0.15 * Math.sin(t / 45);
    g.globalCompositeOperation = "source-over";
    glow(g, x, y, sc * 0.5 * fl, GHOST_D, 0.55);
    g.globalCompositeOperation = "lighter";
    glow(g, x, y, sc * 0.42 * fl, SOUL, 0.9);
    g.fillStyle = "rgba(255,255,255,0.95)"; g.beginPath(); g.arc(x, y, Math.max(2.5, sc * 0.1), 0, TAU); g.fill();
  }
  // ดูดเข้าตัว: วงหดเข้า + Add วาบทอง
  if (t >= T2 - 80) {
    const q = clamp01((t - T2 + 80) / (D - T2 + 80)), a = 1 - q;
    g.globalCompositeOperation = "source-over";
    gEllipse(g, A[0], A[1], 0.9 - 0.65 * easeOut3(q), 0.02, 36); g.strokeStyle = `rgba(${SOUL},${0.8 * a})`; g.lineWidth = 2; g.stroke();
    const [sx, sy, sc] = P(A[0], A[1], 1.25);
    g.globalCompositeOperation = "lighter";
    glow(g, sx, sy, sc * (0.5 + 0.6 * q), ADD, 0.9 * Math.sin(Math.PI * Math.min(1, q * 1.4)));
    g.globalCompositeOperation = "source-over";
    addCube(g, sx, sy, sc * 0.16, t / 120, Math.sin(Math.PI * Math.min(1, q * 1.2)));
  }
}

// ---------- หอกรองโกมิเนียต ----------
// base = ปลายด้าม (จุดเริ่มกรวย) · d = ทิศปลายหอก (หน่วย) · len = ยาวกรวย · rad = รัศมีโคนกรวย · k = ความสว่าง
function drawSpear(g, base, d, len, rad, now, k, lowQ) {
  const [e1, e2] = basis(d), tip = add3(base, d, len), grip = add3(base, d, -len * 0.3);
  const B = P3(base), T = P3(tip), Gp = P3(grip), spin = REDUCED ? 0 : now / 650, a = clamp01(k);
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  if (!lowQ) { const M = P3(add3(base, d, len * 0.4)); g.globalCompositeOperation = "lighter"; glow(g, M[0], M[1], M[2] * (rad * 3 + len * 0.55), GOLD, 0.32 * k); }
  g.globalCompositeOperation = "source-over";
  // ด้ามจับ + ปุ่มท้าย
  g.strokeStyle = `rgba(120,86,30,${a})`; g.lineWidth = Math.max(1.5, B[2] * rad * 0.5); seg(g, Gp, B); g.stroke();
  g.strokeStyle = `rgba(255,230,160,${0.6 * a})`; g.lineWidth = Math.max(1, B[2] * rad * 0.14); g.stroke();
  g.fillStyle = `rgba(${GOLD_D},${a})`; g.beginPath(); g.arc(Gp[0], Gp[1], Math.max(1.5, Gp[2] * rad * 0.42), 0, TAU); g.fill();
  // กรวย: เงาข้าง (สามเหลี่ยมจากโคน) + จานโคน
  const vx = T[0] - B[0], vy = T[1] - B[1], L = Math.hypot(vx, vy) || 1, nx = -vy / L, ny = vx / L, w = B[2] * rad;
  const gr = g.createLinearGradient(B[0] + nx * w, B[1] + ny * w, B[0] - nx * w, B[1] - ny * w);
  gr.addColorStop(0, `rgba(150,104,30,${a})`); gr.addColorStop(0.42, `rgba(255,250,232,${a})`);
  gr.addColorStop(0.62, `rgba(${GOLD},${a})`); gr.addColorStop(1, `rgba(120,80,20,${a})`);
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(B[0] + nx * w, B[1] + ny * w); g.lineTo(T[0], T[1]); g.lineTo(B[0] - nx * w, B[1] - ny * w); g.closePath(); g.fill();
  ring3(g, base, rad, e1, e2, 28); g.fill();
  // ร่องเกลียวบนกรวย (เฉพาะด้านที่หันเข้ากล้อง)
  g.strokeStyle = `rgba(255,253,240,${0.85 * a})`;
  for (let c = 0; c < 3; c++) {
    let prev = null;
    for (let i = 0; i <= 26; i++) {
      const s = i / 26, ctr = add3(base, d, len * s), r = rad * (1 - s) * 1.02, th = s * 9.5 + (c / 3) * TAU + spin;
      const p = P3(add3(add3(ctr, e1, Math.cos(th) * r), e2, Math.sin(th) * r)), front = p[2] >= P3(ctr)[2];
      if (prev && front && prev.front) { g.lineWidth = Math.max(0.8, p[2] * 0.012); seg(g, prev.p, p); g.stroke(); }
      prev = { p, front };
    }
  }
  // การ์ดโคนหอก (วงทองหนา)
  ring3(g, base, rad * 1.28, e1, e2, 30);
  g.strokeStyle = `rgba(${GOLD_D},${a})`; g.lineWidth = Math.max(2, B[2] * rad * 0.28); g.stroke();
  g.strokeStyle = `rgba(255,244,205,${0.9 * a})`; g.lineWidth = Math.max(1, B[2] * rad * 0.08); g.stroke();
  // ปลายหอกเป็นประกายดาว
  g.globalCompositeOperation = "lighter";
  glow(g, T[0], T[1], T[2] * (0.1 + 0.25 * k), CORE, 0.9 * a);
  const sp = T[2] * (0.12 + 0.2 * k) * (REDUCED ? 1 : 0.85 + 0.15 * Math.sin(now / 90));
  g.strokeStyle = `rgba(255,255,255,${0.9 * a})`; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(T[0] - sp, T[1]); g.lineTo(T[0] + sp, T[1]); g.moveTo(T[0], T[1] - sp); g.lineTo(T[0], T[1] + sp); g.stroke();
  g.restore();
}
// วงเวทรอบหอก: วงอักษร 2 วง (หมุนสวนกัน) + วงไจโรเอียงหมุน · speed = ตัวคูณความเร็ว
function spearRings(g, base, d, len, rad, now, k, speed, lowQ) {
  const [e1, e2] = basis(d), t = REDUCED ? 0 : now * speed, a = clamp01(k);
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
  const runes = (c, r, rot, alpha, n) => {
    ring3(g, c, r, e1, e2, 40);
    g.strokeStyle = `rgba(${GOLD},${0.55 * alpha})`; g.lineWidth = 1.2; g.stroke();
    g.strokeStyle = `rgba(255,236,170,${alpha})`; g.lineWidth = 2;
    for (let i = 0; i < n; i++) {
      const a0 = rot + (i / n) * TAU, a1 = a0 + TAU / n * 0.45;
      const p0 = P3(add3(add3(c, e1, Math.cos(a0) * r * 1.08), e2, Math.sin(a0) * r * 1.08)), p1 = P3(add3(add3(c, e1, Math.cos(a1) * r * 1.08), e2, Math.sin(a1) * r * 1.08));
      seg(g, p0, p1); g.stroke();
    }
  };
  runes(add3(base, d, len * 0.62), rad * 2.3, t / 900, a, lowQ ? 6 : 10);
  runes(add3(base, d, len * 0.15), rad * 3.1, -t / 1300, a * 0.75, lowQ ? 8 : 14);
  if (!lowQ) {
    const ang = t / 1100, B2 = norm3(add3([e2[0] * Math.cos(ang), e2[1] * Math.cos(ang), e2[2] * Math.cos(ang)], d, Math.sin(ang)));
    ring3(g, add3(base, d, len * 0.62), rad * 2.9, e1, B2, 40);
    g.strokeStyle = `rgba(${RIM},${0.5 * a})`; g.lineWidth = 1.2; g.stroke();
  }
  g.restore();
}
// ละอองทองลอยจากพื้นทั่วสนามวนเข้าหาจุด target (หอก) · strength 0..1
function convergeMotes(g, target, cx, cy, now, strength, lowQ, n) {
  const N = n || (lowQ ? 16 : 54), T = target;
  g.save();
  for (let i = 0; i < N; i++) {
    const period = 2600 + hash01(i + 1) * 1800, age = REDUCED ? hash01(i + 2) : ((now / period) + hash01(i * 3.1)) % 1;
    const ang = hash01(i + 5) * TAU, r = 1.4 + hash01(i + 9) * 6.8, u = easeIn2(age);
    const th = ang + u * 1.5, rr = r * (1 - u);
    const pos = [T[0] + Math.cos(th) * rr, T[1] + Math.sin(th) * rr, 0.02 + (T[2] - 0.02) * Math.pow(u, 0.65) + Math.sin(Math.PI * u) * 0.5];
    const [px, py, ps] = P3(pos), a = Math.pow(Math.sin(Math.PI * age), 0.8) * strength;
    if (a <= 0.01) continue;
    if (!lowQ) {
      g.globalCompositeOperation = "lighter";
      glow(g, px, py, ps * 0.11, GOLD, 0.45 * a);
      const u2 = easeIn2(Math.max(0, age - 0.04)), th2 = ang + u2 * 1.5, r2 = r * (1 - u2);
      const pp = P(T[0] + Math.cos(th2) * r2, T[1] + Math.sin(th2) * r2, 0.02 + (T[2] - 0.02) * Math.pow(u2, 0.65) + Math.sin(Math.PI * u2) * 0.5);
      g.strokeStyle = `rgba(255,226,140,${0.5 * a})`; g.lineWidth = Math.max(1, ps * 0.02); seg(g, pp, [px, py]); g.stroke();
    }
    g.globalCompositeOperation = "source-over";
    g.fillStyle = `rgba(255,240,190,${a})`; g.beginPath(); g.arc(px, py, Math.max(1.1, ps * 0.028), 0, TAU); g.fill();
  }
  g.restore();
}

// ---------- ระหว่างชาร์จ ----------
//  grays = [{ id, x, y, size, dir, left, cast, fire, tiles }] (BoardStage จาก p.gray.charge)
const seen = new Map(); // `${id}|${left}` → เวลาที่เห็นครั้งแรก (โตช้าๆ ตามเวลาในแต่ละขั้น)
function chargeProg(c, now) {
  const left = Math.max(0, Math.min(2, Number(c.left) || 0)), k = `${c.id}|${left}`;
  let t0 = seen.get(k);
  if (t0 == null) { if (seen.size > 32) seen.clear(); t0 = now; seen.set(k, t0); }
  const tg = REDUCED ? 0.5 : 1 - Math.exp(-(now - t0) / 20000);
  return clamp01((2 - left + 0.35 * tg) / 2.2);
}
// ความมืดของสนามระหว่างลำแสง (ms นับจากเริ่ม)
function beamDark(t) {
  const { hit, fade0, total } = GRAY_BEAM;
  if (t < 0 || t > total) return 0;
  if (t < hit) return 0.2 + 0.45 * easeIn2(t / hit);
  if (t < fade0) return 0.55;
  return 0.55 * (1 - (t - fade0) / (total - fade0));
}
// พื้น (ก่อนไฮไลต์/ตัวละคร): สนามมืดลง + แนวลำแสงที่จะยิง
export function drawGrayGround(g, grays, fx, view, now, lowQ) {
  let dark = 0;
  const list = Array.isArray(grays) ? grays : [];
  for (const c of list) dark = Math.max(dark, 0.36 + 0.22 * chargeProg(c, now));
  for (const e of fx) if (e.kind === "grayBeam") dark = Math.max(dark, beamDark(now - e.t0));
  if (dark <= 0) return;
  g.save();
  g.globalCompositeOperation = "source-over";
  g.fillStyle = `rgba(6,8,20,${dark})`;
  const x0 = (view && Number.isFinite(view.x0) ? view.x0 : 0) - 60, y0 = (view && Number.isFinite(view.y0) ? view.y0 : 0) - 60;
  const x1 = (view && Number.isFinite(view.x1) ? view.x1 : 1280) + 60, y1 = (view && Number.isFinite(view.y1) ? view.y1 : 720) + 60;
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
  for (const c of list) telegraph(g, c, now, lowQ);
  g.restore();
}
function telegraph(g, c, now, lowQ) {
  const tiles = Array.isArray(c.tiles) ? c.tiles : [];
  const v = DIRS[c.dir] || [0, -1], n = Math.max(1, c.size | 0), cx = c.x + n / 2, cy = c.y + n / 2;
  const prog = chargeProg(c, now), k = 0.7 + 0.3 * prog, pulse = REDUCED ? 0.5 : 0.5 + 0.5 * Math.sin(now / 380);
  const set = new Set(tiles.map((t) => t.x + "," + t.y));
  for (const t of tiles) {
    const d = (t.x + 0.5 - cx) * v[0] + (t.y + 0.5 - cy) * v[1];
    const wave = REDUCED || lowQ ? 0 : Math.pow(Math.max(0, Math.sin(d * 0.8 - now / 240)), 6);
    quad(g, t.x, t.y, 0.03);
    g.fillStyle = `rgba(${GOLD},${(0.2 + 0.1 * pulse + 0.25 * wave) * k})`; g.fill();
  }
  // ขอบแนว (ขอบช่องที่ไม่ติดช่องในแนว)
  g.beginPath();
  for (const t of tiles) {
    const E = [[0, -1, 0, 0, 1, 0], [1, 0, 1, 0, 1, 1], [0, 1, 0, 1, 1, 1], [-1, 0, 0, 0, 0, 1]];
    for (const [dx, dy, ax, ay, bx, by] of E) {
      if (set.has((t.x + dx) + "," + (t.y + dy))) continue;
      const a = P(t.x + ax, t.y + ay, 0.01), b = P(t.x + bx, t.y + by, 0.01);
      g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]);
    }
  }
  if (!lowQ) { g.strokeStyle = `rgba(255,160,50,${0.35 * k})`; g.lineWidth = 6; g.stroke(); }
  g.strokeStyle = `rgba(255,222,130,${(0.75 + 0.25 * pulse) * k})`; g.lineWidth = 1.8; g.stroke();
  // วงเวททองใต้ตัวเกรย์
  const rot = REDUCED ? 0 : now / 2400;
  g.globalCompositeOperation = "lighter";
  gEllipse(g, cx, cy, 0.95 * n, 0.015, 44); g.strokeStyle = `rgba(${GOLD},${0.7 * k})`; g.lineWidth = 1.6; g.stroke();
  g.beginPath();
  for (let i = 0; i < 12; i++) {
    const th = rot + (i / 12) * TAU, p0 = P(cx + Math.cos(th) * 0.72 * n, cy + Math.sin(th) * 0.72 * n, 0.015), p1 = P(cx + Math.cos(th + 0.3) * 0.88 * n, cy + Math.sin(th + 0.3) * 0.88 * n, 0.015);
    g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]);
  }
  g.stroke();
  const [sx, sy, sc] = P(cx, cy, 0.05);
  glow(g, sx, sy, sc * 1.1 * n, GOLD, 0.22 + 0.2 * prog);
  g.globalCompositeOperation = "source-over";
}
// ทิศหอกตอนลอย: ชี้ตามแนวยิง เชิดขึ้นเล็กน้อย
const spearDir = (v, lift) => norm3([v[0], v[1], lift]);
const SPEAR_LEN = 2.1, SPEAR_RAD = 0.25, SPEAR_Z = 2.5;
// ในอากาศ (หลังตัวละคร): หอกทอง + วงเวท + ละอองทองวนเข้าหอก
export function drawGrayAir(g, grays, units, now, lowQ) {
  if (!Array.isArray(grays) || !grays.length) return;
  for (const c of grays) {
    const n = Math.max(1, c.size | 0), u = units.find((it) => it.id === c.id && !it.corpse);
    const wx = u ? u.rx + n / 2 + (u.ox || 0) : c.x + n / 2, wy = u ? u.ry + n / 2 + (u.oy || 0) : c.y + n / 2;
    const prog = chargeProg(c, now), s = 0.6 + 0.65 * prog, bob = REDUCED ? 0 : Math.sin(now / 620) * 0.07;
    const v = DIRS[c.dir] || [0, -1], d = spearDir(v, 0.16), len = SPEAR_LEN * s, rad = SPEAR_RAD * s;
    const mid = [wx, wy, SPEAR_Z + 0.3 * s + bob], base = add3(mid, d, -len * 0.45);
    convergeMotes(g, add3(base, d, len * 0.5), wx, wy, now, 0.4 + 0.6 * prog, lowQ);
    // เสาแสงจางจากหอกลงพื้น
    if (!lowQ) {
      const top = P3(mid), bot = P(wx, wy, 0);
      const gr = g.createLinearGradient(top[0], top[1], bot[0], bot[1]);
      gr.addColorStop(0, `rgba(${GOLD},${0.22 * prog + 0.06})`); gr.addColorStop(1, `rgba(${GOLD},0)`);
      g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = gr;
      g.beginPath(); g.moveTo(top[0] - top[2] * 0.12, top[1]); g.lineTo(bot[0] - bot[2] * 0.4, bot[1]); g.lineTo(bot[0] + bot[2] * 0.4, bot[1]); g.lineTo(top[0] + top[2] * 0.12, top[1]); g.closePath(); g.fill();
      g.restore();
    }
    spearRings(g, base, d, len, rad, now, 0.55 + 0.45 * prog, 1, lowQ);
    drawSpear(g, base, d, len, rad, now, 0.6 + 0.6 * prog, lowQ);
  }
}

// ---------- รองโกมิเนียต: ลำแสง ----------
const BEAM_ZC = 1.35;
function beamGeo(e) {
  if (e._geo) return e._geo;
  const n = Math.max(1, e.size | 0), v = DIRS[e.dir] || [0, -1], p = [-v[1], v[0]];
  const cx = e.at.x + n / 2, cy = e.at.y + n / 2;
  const raw = Array.isArray(e.tiles) ? e.tiles.filter((t) => t && Number.isFinite(t.x) && Number.isFinite(t.y)) : [];
  let reach = n / 2 + 4, lo = -3.5, hi = 3.5;
  const tiles = raw.map((t) => {
    const d = (t.x + 0.5 - cx) * v[0] + (t.y + 0.5 - cy) * v[1], s = (t.x + 0.5 - cx) * p[0] + (t.y + 0.5 - cy) * p[1];
    return { x: t.x, y: t.y, d, s, h: hash01(t.x * 31.7 + t.y * 17.3) };
  });
  if (tiles.length) {
    reach = Math.max(...tiles.map((t) => t.d)) + 0.5;
    lo = Math.min(...tiles.map((t) => t.s)) - 0.5; hi = Math.max(...tiles.map((t) => t.s)) + 0.5;
  }
  const mid = (lo + hi) / 2, hw = Math.max(0.6, (hi - lo) / 2), start = n / 2 + 0.05;
  // รอยแยกตามแนว: แถวละเส้น (ช่องที่ระยะข้างเท่ากัน) เรียงจากใกล้ไปไกล — จุดหักซิกแซกคงที่ต่อช่อง
  const rows = new Map();
  for (const t of tiles) { const k = Math.round(t.s); if (!rows.has(k)) rows.set(k, []); rows.get(k).push(t); }
  const cracks = [...rows.entries()].map(([k, list]) => list.sort((a, b) => a.d - b.d).map((t) => ({ x: t.x + 0.5 + p[0] * (t.h - 0.5) * 0.5, y: t.y + 0.5 + p[1] * (t.h - 0.5) * 0.5, d: t.d, k })));
  e._geo = { n, v, p, cx, cy, ax: cx + p[0] * mid, ay: cy + p[1] * mid, start, reach: Math.max(start + 1, reach), hw, tiles, cracks };
  return e._geo;
}
const axisAt = (G, d, z = BEAM_ZC) => [G.ax + G.v[0] * d, G.ay + G.v[1] * d, z];
// หน้าตัดลำแสง = วงรีแบน (กว้าง 1 ตามแนวราบ · สูง BEAM_FLAT — คูณด้วยรัศมีทีหลัง) · ขอบบนจอหาจากการฉายหน้าตัดจริงทุกช่วง (ถูกทุกทิศ/มุมกล้อง)
const BEAM_FLAT = 0.55, XS = 14;
// คืน [{ c: [sx, sy], n: [nx, ny], hi, lo }] ตามแกน d0 → d1 (hi/lo = ระยะขอบสองฝั่งตามแนวตั้งฉากบนจอ ที่รัศมี 1)
function beamSection(G, d0, d1, segs) {
  const out = [], P0 = [];
  for (let i = 0; i <= segs; i++) P0.push(P3(axisAt(G, d0 + (d1 - d0) * (i / segs))));
  for (let i = 0; i <= segs; i++) {
    const a = P0[Math.max(0, i - 1)], b = P0[Math.min(segs, i + 1)];
    let nx = -(b[1] - a[1]), ny = b[0] - a[0];
    const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const d = d0 + (d1 - d0) * (i / segs), c = P0[i];
    let hi = 0, lo = 0;
    for (let k = 0; k < XS; k++) {
      const th = (k / XS) * TAU, q = P(G.ax + G.v[0] * d + G.p[0] * Math.cos(th), G.ay + G.v[1] * d + G.p[1] * Math.cos(th), BEAM_ZC + Math.sin(th) * BEAM_FLAT);
      const s = (q[0] - c[0]) * nx + (q[1] - c[1]) * ny;
      hi = Math.max(hi, s); lo = Math.min(lo, s);
    }
    const f = 0.22 + 0.78 * easeOut3(clamp01((d - d0) / 2.4));
    out.push({ c, n: [nx, ny], hi: hi * f, lo: lo * f });
  }
  return out;
}
// ชั้นของตัวลำแสง [รัศมี (เท่าของครึ่งความกว้างแนว), สี, ความทึบ, บวกแสง?]
//  ปกติ = เรืองนุ่มด้วยเงาเบลอ (softBand) [รัศมี, สี, ความทึบ, บวกแสง?, ความเบลอ (เท่าของรัศมี)] + แกนคม
const BEAM_SOFT = [[1.05, RIM, 0.45, 0, 0.5], [0.85, "236,196,96", 0.6, 0, 0.45], [0.5, GOLD, 0.35, 1, 0.4], [0.26, CORE, 0.35, 1, 0.35]];
const BEAM_CRISP = [[0.13, CORE, 0.35], [0.055, "255,255,255", 0.85]];
// เติมแถบแบบเรืองนุ่มล้วน: วาดรูปไว้นอกจอแล้วให้เงาเบลอเลื่อนกลับมา (เห็นแต่เงา — ขอบนุ่มทุกทิศ/มุมกล้อง)
const SHADOW_SHIFT = 30000;
function softBand(g, sec, W, rgba, blurPx) {
  const m = g.getTransform(), k = Math.hypot(m.a, m.b) || 1;
  g.save();
  g.shadowColor = rgba; g.shadowBlur = Math.max(2, blurPx * k); g.shadowOffsetX = SHADOW_SHIFT; g.shadowOffsetY = 0;
  g.translate(-SHADOW_SHIFT / k, 0);
  beamBand(g, sec, W); g.fillStyle = "#000"; g.fill();
  g.restore();
}
const BEAM_LAYERS_LOW = [[1.15, RIM, 0.16, 0], [0.95, GOLD, 0.3, 0], [0.7, GOLD, 0.3, 0], [0.42, CORE, 0.35, 1], [0.16, "255,255,255", 0.7, 1]];
function beamBand(g, sec, W) {
  g.beginPath();
  sec.forEach((q, i) => { const x = q.c[0] + q.n[0] * q.hi * W, y = q.c[1] + q.n[1] * q.hi * W; if (i) g.lineTo(x, y); else g.moveTo(x, y); });
  for (let i = sec.length - 1; i >= 0; i--) { const q = sec[i]; g.lineTo(q.c[0] + q.n[0] * q.lo * W, q.c[1] + q.n[1] * q.lo * W); }
  g.closePath();
}
// เวลา (ms) ที่ปลายลำแสงถึงระยะ d
const beamReachT = (G, d) => GRAY_BEAM.hit + (REDUCED ? 0 : GRAY_BEAM.extend * (1 - Math.cbrt(1 - clamp01((d - G.start) / (G.reach - G.start)))));
function beamFx(g, e, now, lowQ, view) {
  const t = now - e.t0, { hit: H, extend: E, fade0: F0, total: END } = GRAY_BEAM;
  if (t < 0 || t > END || !e.at) return;
  const G = beamGeo(e), still = REDUCED;
  const R0 = G.hw, gp = clamp01(t / H);
  g.save(); g.lineCap = "round"; g.lineJoin = "round";

  // ---- พื้น: รอยร้าวทองไล่ตามแนว (ชาร์จ) → ไหม้ทอง (หลังลำแสงผ่าน)
  const crackFront = G.start + (G.reach - G.start) * easeOut3(clamp01(t / (H * 0.85)));
  const fadeK = t < F0 ? 1 : clamp01(1 - (t - F0) / (END - F0));
  for (const tl of G.tiles) {
    const hitT = beamReachT(G, tl.d), age = t - hitT;
    if (age >= 0) {
      g.globalCompositeOperation = "lighter";
      quad(g, tl.x, tl.y, 0.02);
      g.fillStyle = `rgba(${GOLD},${(0.28 + 0.5 * Math.max(0, 1 - age / 260)) * fadeK})`; g.fill();
      if (t > F0) { g.globalCompositeOperation = "source-over"; quad(g, tl.x, tl.y, 0.02); g.fillStyle = `rgba(60,44,12,${0.32 * (1 - fadeK) * clamp01((END - t) / 300)})`; g.fill(); }
    }
  }
  // รอยแยกทอง: แถวละเส้นไล่จากตัวเกรย์ออกไปถึงปลายแนว (lowQ = เว้นแถว)
  {
    const a = t < H ? 0.45 + 0.55 * gp : fadeK;
    for (const row of G.cracks) {
      if (!row.length || (lowQ && row[0].k % 2)) continue;
      const x0 = G.cx + G.p[0] * row[0].k * 0.9, y0 = G.cy + G.p[1] * row[0].k * 0.9;
      const pts = [P(x0, y0, 0.01)];
      for (let i = 0; i < row.length; i++) {
        const c = row[i];
        if (c.d > crackFront) {
          const prev = row[i - 1], f0 = prev ? prev.d : G.start, u = clamp01((crackFront - f0) / Math.max(0.01, c.d - f0));
          if (u > 0) pts.push(P(lerp(prev ? prev.x : x0, c.x, u), lerp(prev ? prev.y : y0, c.y, u), 0.01));
          break;
        }
        pts.push(P(c.x, c.y, 0.01));
      }
      if (pts.length < 2) continue;
      g.globalCompositeOperation = "source-over";
      poly(g, pts); g.strokeStyle = `rgba(40,26,6,${0.55 * a})`; g.lineWidth = 3.2; g.stroke();
      g.globalCompositeOperation = "lighter";
      if (!lowQ) { g.strokeStyle = `rgba(${GOLD_D},${0.35 * a})`; g.lineWidth = 6; g.stroke(); }
      g.strokeStyle = `rgba(255,206,110,${0.9 * a})`; g.lineWidth = 1.3; g.stroke();
    }
  }

  // ---- ชาร์จ: วงเวทใหญ่บนพื้น · เสาแสงทอง · หอกลดระดับเล็งตามแนว · แสงพุ่งเข้าปลายหอก
  const spearIn = easeInOut(clamp01(t / 700));
  const d = norm3([G.v[0], G.v[1], lerp(0.16, 0, spearIn)]), s = 1.25 + 0.15 * gp;
  const len = SPEAR_LEN * s, rad = SPEAR_RAD * s;
  const mid = [lerp(G.cx, G.cx + G.v[0] * 0.25, spearIn), lerp(G.cy, G.cy + G.v[1] * 0.25, spearIn), lerp(SPEAR_Z + 0.3 * 1.25, BEAM_ZC, spearIn)];
  const base = add3(mid, d, -len * 0.45), tip = add3(base, d, len), TIP = P3(tip);
  const emitK = t < H ? 1 : fadeK;
  if (t < H + 400) {
    const a = t < H ? clamp01(t / 250) : clamp01(1 - (t - H) / 400), rot = still ? 0 : (t / 1000) * (0.6 + 2.4 * gp);
    g.globalCompositeOperation = "lighter";
    for (const [r, n0, dir] of [[1.9, 16, 1], [1.45, 10, -1]]) {
      gEllipse(g, G.cx, G.cy, r * G.n, 0.015, 52); g.strokeStyle = `rgba(${GOLD},${0.75 * a})`; g.lineWidth = 1.8; g.stroke();
      g.beginPath();
      for (let i = 0; i < n0; i++) {
        const th = rot * dir + (i / n0) * TAU, p0 = P(G.cx + Math.cos(th) * r * 0.86 * G.n, G.cy + Math.sin(th) * r * 0.86 * G.n, 0.015), p1 = P(G.cx + Math.cos(th + 0.16) * r * 0.97 * G.n, G.cy + Math.sin(th + 0.16) * r * 0.97 * G.n, 0.015);
        g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]);
      }
      g.lineWidth = 2.4; g.stroke();
    }
    if (t < H) {
      // เสาแสงทองจากฟ้าลงที่ตัว
      const b = P(G.cx, G.cy, 0), top = P(G.cx, G.cy, 9), wb = b[2] * (0.25 + 0.55 * gp), wt = top[2] * (0.1 + 0.3 * gp);
      const gr = g.createLinearGradient(b[0], b[1], top[0], top[1]);
      gr.addColorStop(0, `rgba(${CORE},${0.55 * gp})`); gr.addColorStop(1, `rgba(${GOLD},0)`);
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(b[0] - wb, b[1]); g.lineTo(top[0] - wt, top[1]); g.lineTo(top[0] + wt, top[1]); g.lineTo(b[0] + wb, b[1]); g.closePath(); g.fill();
      // แสงพุ่งเข้าปลายหอก
      const N = lowQ ? 12 : 40;
      for (let i = 0; i < N; i++) {
        const u = still ? hash01(i + 70) : ((t / (420 + hash01(i + 3) * 300)) + hash01(i + 9)) % 1;
        const th = hash01(i + 13) * TAU, ph = (hash01(i + 17) - 0.5) * Math.PI;
        const dirv = [Math.cos(th) * Math.cos(ph), Math.sin(th) * Math.cos(ph), Math.sin(ph) * 0.8];
        const r1 = (0.3 + 3.8 * (1 - u)) * (0.6 + 0.6 * gp), r2 = Math.max(0.05, r1 - 0.5 - 0.6 * gp);
        const p1 = P3(add3(tip, dirv, r1)), p2 = P3(add3(tip, dirv, r2)), a2 = u * (0.3 + 0.7 * gp);
        g.strokeStyle = `rgba(${i % 3 ? GOLD : CORE},${a2})`; g.lineWidth = Math.max(1, p2[2] * 0.02); seg(g, p1, p2); g.stroke();
      }
      glow(g, TIP[0], TIP[1], TIP[2] * (0.3 + 1.3 * easeIn2(gp)), CORE, 0.5 + 0.5 * gp);
      if (!lowQ) glow(g, TIP[0], TIP[1], TIP[2] * (0.8 + 2.2 * gp), GOLD, 0.25 + 0.3 * gp);
    }
    g.globalCompositeOperation = "source-over";
  }
  if (t < H + 200) spearRings(g, base, d, len, rad, now, t < H ? 1 : 1 - (t - H) / 200, 1 + 4 * gp, lowQ);
  drawSpear(g, base, d, len, rad, now, (1.1 + 0.4 * gp) * emitK, lowQ);

  // ---- ลำแสง
  if (t >= H) {
    const tt = t - H, front = still ? 1 : easeOut3(clamp01(tt / E));
    const d0 = G.start, d1 = G.start + (G.reach + 0.6 - G.start) * front;
    const burst = tt < 260 ? 1 + 0.18 * Math.sin(Math.PI * (tt / 260)) : 1;
    const flick = still ? 1 : 1 + 0.035 * Math.sin(now / 37) + 0.02 * Math.sin(now / 13);
    const shrink = t < F0 ? 1 : Math.pow(1 - clamp01((t - F0) / (END - F0)), 1.6);
    const W = R0 * burst * flick * shrink, A = t < F0 ? 1 : clamp01(1 - Math.pow((t - F0) / (END - F0), 2));
    const sec = beamSection(G, d0, d1, lowQ ? 10 : 22);
    // ชั้นจากนอกเข้าใน: ขอบฟ้าซีด → ตัวทอง (ทับปกติ คงสี) → แกนทองขาว → แกนขาว (บวกแสง) — lowQ = ชั้นทึบไล่ระดับ ไม่มีเงาเบลอ
    if (lowQ) {
      for (const [k, col, a, add] of BEAM_LAYERS_LOW) {
        g.globalCompositeOperation = add ? "lighter" : "source-over";
        beamBand(g, sec, W * k); g.fillStyle = `rgba(${col},${a * A})`; g.fill();
      }
    } else {
      const sm = sec[Math.floor(sec.length / 2)], scl = Math.max(1, (sm.hi - sm.lo) / 2);
      for (const [k, col, a, add, b] of BEAM_SOFT) {
        g.globalCompositeOperation = add ? "lighter" : "source-over";
        softBand(g, sec, W * k, `rgba(${col},${a * A})`, scl * W * k * b);
      }
    }
    g.globalCompositeOperation = "lighter";
    for (const [k, col, a] of BEAM_CRISP) { beamBand(g, sec, W * k); g.fillStyle = `rgba(${col},${a * A})`; g.fill(); }
    // เกลียวทองพันรอบลำ
    const spin = still ? 0 : now * 0.011, nS = lowQ ? 1 : 2;
    for (let k = 0; k < nS; k++) {
      const pts = [], steps = Math.max(12, Math.ceil((d1 - d0) * 5));
      for (let i = 0; i <= steps; i++) {
        const dd = d0 + (d1 - d0) * (i / steps), th = dd * 0.9 - spin + (k / 3) * TAU, r = W * 0.88 * (0.22 + 0.78 * easeOut3(clamp01((dd - d0) / 2.4)));
        pts.push(P(G.ax + G.v[0] * dd + G.p[0] * Math.cos(th) * r, G.ay + G.v[1] * dd + G.p[1] * Math.cos(th) * r, BEAM_ZC + Math.sin(th) * r * BEAM_FLAT));
      }
      ribbonPath(g, pts, (i) => Math.max(0.8, pts[i][2] * 0.035));
      g.fillStyle = `rgba(${GOLD_D},${0.5 * A})`; g.fill();
      if (!lowQ) { ribbonPath(g, pts, (i) => Math.max(0.5, pts[i][2] * 0.012)); g.fillStyle = `rgba(255,240,190,${0.55 * A})`; g.fill(); }
    }
    // วงคลื่นวิ่งตามลำ
    const nR = lowQ ? 2 : 4, span = G.reach - G.start;
    for (let j = 0; j < nR; j++) {
      const ph = still ? j / nR : ((tt / 650) + j / nR) % 1, dd = G.start + span * ph;
      if (dd > d1) continue;
      const rr = W * (1.02 + 0.12 * ph) * (0.22 + 0.78 * easeOut3(clamp01((dd - d0) / 2.4)));
      ring3(g, axisAt(G, dd), rr, [G.p[0], G.p[1], 0], [0, 0, BEAM_FLAT], 36);
      g.strokeStyle = `rgba(${RIM},${0.65 * (1 - ph) * A})`; g.lineWidth = 2.5; g.stroke();
      g.strokeStyle = `rgba(${CORE},${0.5 * (1 - ph) * A})`; g.lineWidth = 1; g.stroke();
    }
    // ก้อนพลังไหลตามลำ
    if (!lowQ) for (let j = 0; j < 6; j++) {
      const ph = still ? j / 6 : ((tt / 520) + j / 6) % 1, dd = G.start + span * ph;
      if (dd > d1) continue;
      const c = P3(axisAt(G, dd)); glow(g, c[0], c[1], c[2] * W * 0.35, CORE, 0.14 * A);
    }
    // แสงปะทุที่ต้นลำ + ปลายลำ (ขอบกระดาน)
    const S0 = P3(axisAt(G, d0)), S1 = P3(axisAt(G, d1));
    glow(g, S0[0], S0[1], S0[2] * W * 0.5, CORE, 0.6 * A);
    if (!lowQ) glow(g, S1[0], S1[1], S1[2] * W * 1.1, GOLD, 0.45 * A);
    glow(g, S1[0], S1[1], S1[2] * W * 0.45, "255,255,255", 0.5 * A);
    // รัศมีแสงพุ่งรอบต้นลำตอนระเบิด
    if (!lowQ && tt < 750) {
      const q = tt / 750, a = Math.pow(1 - q, 1.5), nRay = 16, len0 = 900 * easeOut3(Math.min(1, q * 2.5));
      g.fillStyle = `rgba(${CORE},${0.22 * a})`;
      g.beginPath();
      for (let i = 0; i < nRay; i++) {
        const th = (i / nRay) * TAU + hash01(i) * 0.3 + (still ? 0 : tt / 2500), wv = 0.035 + 0.03 * hash01(i + 5);
        g.moveTo(S0[0], S0[1]);
        g.lineTo(S0[0] + Math.cos(th - wv) * len0, S0[1] + Math.sin(th - wv) * len0);
        g.lineTo(S0[0] + Math.cos(th + wv) * len0, S0[1] + Math.sin(th + wv) * len0);
        g.closePath();
      }
      g.fill();
    }
    // ประกายทองลอยขึ้นจากพื้นที่ไหม้
    if (!lowQ && G.tiles.length) {
      g.globalCompositeOperation = "lighter";
      for (let i = 0; i < 46; i++) {
        const tl = G.tiles[Math.floor(hash01(i + 101) * G.tiles.length)];
        const u = still ? hash01(i + 4) : ((tt / (900 + hash01(i + 7) * 700)) + hash01(i + 2)) % 1;
        const [px, py, ps] = P(tl.x + hash01(i + 11), tl.y + hash01(i + 13), 0.05 + u * 2.6), a = Math.sin(Math.PI * u) * A;
        g.fillStyle = `rgba(255,232,160,${a})`; g.beginPath(); g.arc(px, py, Math.max(1, ps * 0.025), 0, TAU); g.fill();
      }
    }
    g.globalCompositeOperation = "source-over";
    // แฟลชทั้งจอตอนระเบิด
    if (tt < 380) {
      const q = tt / 380;
      g.fillStyle = `rgba(${CORE},${0.7 * Math.pow(1 - q, 2)})`;
      const x0 = (view && Number.isFinite(view.x0) ? view.x0 : 0) - 60, y0 = (view && Number.isFinite(view.y0) ? view.y0 : 0) - 60;
      const x1 = (view && Number.isFinite(view.x1) ? view.x1 : 1280) + 60, y1 = (view && Number.isFinite(view.y1) ? view.y1 : 720) + 60;
      g.fillRect(x0, y0, x1 - x0, y1 - y0);
    }
  }
  g.restore();
}

export function grayFx(g, e, now, lowQ, view) {
  const t = now - e.t0;
  if (e.kind === "grayBeam") { beamFx(g, e, now, lowQ, view); return; }
  if (e.kind in GRAY_MS) { grayStrike(g, e, now, lowQ); return; }
  if (!e.at || t < 0 || t > (GRAY_FX_DUR[e.kind] || 0)) return;
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  if (e.kind === "grayKeeper") keeperFx(g, e, t, lowQ);
  else if (e.kind === "grayGrave") graveFx(g, e, t, lowQ);
  else if (e.kind === "grayReap") reapFx(g, e, t, lowQ);
  g.restore();
}
