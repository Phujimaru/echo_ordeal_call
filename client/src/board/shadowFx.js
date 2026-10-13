// ============================================================
//  เอฟเฟกต์บนกระดานของเคท & เอมิลิโกะ (Shadows House · .claude/plans/kate-emiliko-contract.md)
//  เคท = เงาดำในชุดแดง คุมเขม่า (ควันดำ ประกายแดงเข้ม) · เอมิลิโกะ = ตุ๊กตาผมทอง อุปกรณ์ทำความสะอาด (น้ำ ฟอง ประกาย ฝุ่น)
//  socket "shadowFx" → shadowEventFx(ev, ctx) แปลงเป็น fx ของ BoardCanvas (ใช้ร่วมกับหน้า ?board=1&ke=1)
//    keWings      ปีกเขม่า: ปีกงอก → ทะยานขึ้น (เงาบนพื้น) → บินข้ามทุกอย่าง ขนนกเขม่าปลิว → ลงพื้น ปีกสลาย · carry = หิ้วเอมิลิโกะไปด้วย
//    keWhip       แส้เขม่า: pull = ฟาดพันเอมิลิโกะแล้วกระชากมา · dash = เคทพุ่งแล้วฟาดเป้าที่ hitAt
//    keMirror     กระจกเงา (สลับตัวที่คุม): กระจกขึ้นที่ตัวเดิม → แสงสะท้อนวิ่งไปอีกตัว → กระจกแตกเป็นเศษ
//    keRevive     ตื่นขึ้นอีกครั้ง: เขม่าวนเข้ากลางช่อง + เสาแสง → ตัวค่อยๆ ปรากฏ
//    keWeapon     เปลี่ยนอาวุธ: ฟอง/ประกายป๊อป + ไอคอนอาวุธลอยเหนือหัว
//    keSwordPass  ดาบเขม่า: ลอยหมุนจากมือเดิมไปมือใหม่ (ไม่มีมือเดิม = ก่อตัวจากเขม่า) + ประกายวาบ
//    keMasked     มองไม่ออก: ควันขาวฟุ้งคลุมเป้า
//    keCheer      ร่าเริงสุดๆ (ท่าไม้ตายเอมิลิโกะ) บนพื้นที่ 4×3 ตามอาวุธ — ดาเมจลงที่ CHEER_HIT (server skillBeat 1.1 วิ)
//    keCheerDash  ไม้ถูพื้นพุ่งตาม: คลื่นน้ำตามทาง + น้ำกระจายปลายทาง (ตัวเลื่อนตามเหตุการณ์ slide ของ iceFx)
//    keTick       ม่านแดงต้นเทิร์น: หนามเขม่าแดงแทงขึ้นจากพื้นใต้ตัวที่โดน
//  iceFx (เหตุการณ์ของระบบน้ำแข็ง): keWet น้ำกระเซ็นเป็นพื้นเปียก · keDry ไม้ถูเช็ดแห้ง · keMopHit ไม้ถูไถลชน · keWetTrail ไถลบนน้ำ
//  ตีปกติ (state.attack byStyle): keMop keVase keVacuum keSword keKate — รวมเข้า STYLE_MS / STYLE_HIT_P ใน boardDraw.js
//  ตัวที่ถูกย้ายโดยฉาก (บิน/ถูกดึง/พุ่ง/ฟื้น): shadowPose → BoardCanvas วาดหมากตามท่าของฉากแทนตำแหน่งจริง
//  ปีกค้าง: หมาก u.wings (เคทยืนในม่านแดงของตัวเอง — players[].shadow.inStorm) = กางปีกตลอด หายใจช้าๆ ขนนกร่วง · ออกจากม่าน = หุบสลาย
//   (idleWingsDepth + drawIdleWings — สถานะกาง/หุบจำไว้ในไฟล์นี้ต่อ id) · บินแล้วลงในม่าน = ปีกของฉากบินไม่สลาย ส่งต่อให้ปีกค้าง
//  ปีก: shadowBackDepth → boardDraw วาดชั้นหลังตัว (ปีก + เงาบนพื้น) เรียงความลึกเดียวกับหมาก · ที่เหลือวาดทับหลังตัวละคร
//  วาดด้วย canvas ล้วน · lowQ = ตัดอนุภาค/ขอบซ้อน · ลดการเคลื่อนไหว = ไม่กระพือ/ไม่ส่าย (ยังเคลื่อนที่ตามเส้นทาง)
// ============================================================
import { P, depthOf, gEllipse, glow, quad, viewAxes } from "./boardGeo";

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;
const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const seg = (t, a, b) => clamp01((t - a) / Math.max(1e-6, b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const easeIn2 = (t) => t * t;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOutBack = (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
function rngOf(seed) { let s = Math.abs(seed | 0) % 2147483646 || 1; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; }
const okT = (t) => !!t && Number.isFinite(t.x) && Number.isFinite(t.y);
const ptOf = (t) => ({ x: t.x, y: t.y });

const SOOT = "14,6,10", EMBER = "205,26,44", WATER = "110,190,250", WATER_HI = "222,244,255", GOLD = "255,224,150", DUST = "150,132,116";

// ---------------------------------------------------------------- จังหวะ (ms)
export const SH_MS = { keMop: 1050, keVase: 1150, keVacuum: 1200, keSword: 950, keKate: 1000 };
export const SH_HIT_P = { keMop: 0.5, keVase: 0.48, keVacuum: 0.55, keSword: 0.45, keKate: 0.45 };
const WG = { sprout: 300, lift: 240, flyBase: 260, flyPer: 105, land: 230, fade: 360 }; // ปีก: งอก · ทะยาน · บิน (ฐาน + ต่อช่อง) · ลง · สลาย
const WP = { reach: 300, coil: 110, yank: 420, back: 300 };  // แส้ดึง: ฟาดถึง · พัน · กระชาก · เก็บแส้
const WD = { gather: 150, zip: 280, lash: 290, tail: 430 };   // แส้พุ่ง: รวมเขม่า · พุ่ง · ฟาด (ปะทะตอนจบช่วงนี้) · เก็บแส้
const MR = { rise: 260, travel: 380, out: 460 };              // กระจก: ขึ้น · แสงวิ่ง · แตก
const RV = { appear: 650, settle: 1150 };                     // ฟื้น: ตัวเริ่มปรากฏ · ลงพื้น
export const CHEER_HIT = 1100;                                // ร่าเริงสุดๆ: ดาเมจ/ผลักลง (server skillBeat 1.1 วิ)
export const SH_FX_DUR = {
  ...SH_MS,
  keWings: 1800, keWhip: WP.reach + WP.coil + WP.yank + WP.back, keMirror: MR.rise + MR.travel + MR.out, keRevive: 1500,
  keWeapon: 950, keSwordPass: 1050, keMasked: 1100, keCheer: 1650, keCheerDash: 900, keTick: 760,
  keWet: 760, keDry: 700, keMopHit: 760, keWetTrail: 1200,
};
export const isShadowFx = (kind) => typeof kind === "string" && Object.prototype.hasOwnProperty.call(SH_FX_DUR, kind);

// ---------------------------------------------------------------- ตำแหน่งบนจอ
// หมาก 1×1 ที่ช่อง (x, y) ลอย hz ช่อง — ตรงกับ drawUnit (boardDraw.js): กลางหกเหลี่ยม = พื้น − 0.86 ช่อง − hz × 0.85
function hexAt(x, y, hz = 0) {
  const [bx, by, s] = P(x + 0.5, y + 0.5);
  return { x: bx, y: by - s * 0.86 - hz * s * 0.85, s, gy: by, r: s * 0.4 };
}
// ตัวผู้ตี/เป้า (ตัวใหญ่ = กลางตัวสูงครึ่งตัว)
function bodyAt(x, y, n) {
  n = Math.max(1, n | 0);
  if (n <= 1) return hexAt(x, y);
  const [bx, by, s] = P(x + n / 2, y + n / 2), top = P(x + n / 2, y + n / 2, 0.55 * n);
  return { x: bx, y: top[1], s, gy: by, r: s * 0.32 * n };
}
const centroid = (tiles) => {
  const n = Math.max(1, tiles.length);
  return { x: tiles.reduce((a, t) => a + t.x + 0.5, 0) / n, y: tiles.reduce((a, t) => a + t.y + 0.5, 0) / n };
};

// ---------------------------------------------------------------- อนุภาค
function soot(g, x, y, r, a) { if (a > 0.01 && r > 0.5) glow(g, x, y, r, SOOT, Math.min(1, a)); }
function dot(g, x, y, r, rgb, a) {
  if (a <= 0.01) return;
  g.fillStyle = `rgba(${rgb},${Math.min(1, a)})`;
  g.beginPath(); g.arc(x, y, Math.max(0.6, r), 0, TAU); g.fill();
}
// ประกาย 4 แฉก
function star4(g, x, y, r, rgb, a) {
  if (a <= 0.01 || r < 0.5) return;
  g.fillStyle = `rgba(${rgb},${Math.min(1, a)})`;
  g.beginPath(); g.moveTo(x, y - r);
  g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r);
  g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r);
  g.fill();
}
function bubble(g, x, y, r, a) {
  if (a <= 0.01 || r < 0.6) return;
  g.strokeStyle = `rgba(235,250,255,${Math.min(1, a)})`; g.lineWidth = Math.max(1, r * 0.22);
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
  dot(g, x - r * 0.35, y - r * 0.35, r * 0.22, "255,255,255", a);
}
// ควันเขม่าแตกออกจากจุด (cx, cy หน่วยช่อง) + ถ่านแดงกระเด็น · k = 0..1
function sootBurst(g, cx, cy, z0, k, n, spread, seed, lowQ) {
  if (k <= 0 || k >= 1) return;
  const R = rngOf(seed), cnt = lowQ ? Math.ceil(n / 2) : n;
  for (let i = 0; i < cnt; i++) {
    const a = R() * TAU, d = spread * (0.35 + R() * 0.65) * easeOut3(k), rise = (0.15 + R() * 0.5) * k, sz = 0.7 + R() * 0.6;
    const [x, y, s] = P(cx + Math.cos(a) * d, cy + Math.sin(a) * d, z0 + rise);
    soot(g, x, y, s * (0.16 + 0.22 * k) * sz, 0.6 * (1 - k));
  }
  if (lowQ) return;
  for (let i = 0; i < cnt; i++) {
    const a = R() * TAU, d = spread * 1.1 * easeOut3(k) * (0.5 + R() * 0.5), z = z0 + (0.3 + R() * 0.8) * k - 0.7 * k * k;
    if (z < 0) continue;
    const [x, y, s] = P(cx + Math.cos(a) * d, cy + Math.sin(a) * d, z);
    dot(g, x, y, s * 0.026, i % 3 ? EMBER : "255,120,110", 1 - k);
  }
}
// น้ำกระเซ็น: วงน้ำบนพื้น + หยดน้ำพุ่งโค้งออกรอบจุด
function splash(g, cx, cy, k, size, seed, lowQ, z0 = 0.05) {
  if (k <= 0 || k >= 1) return;
  const R = rngOf(seed), n = lowQ ? 6 : 12, q = easeOut3(k);
  g.save();
  g.strokeStyle = `rgba(${WATER_HI},${0.9 * (1 - k)})`; g.lineWidth = 3 * (1 - k) + 1;
  gEllipse(g, cx, cy, size * (0.18 + 0.6 * q), 0.02, 28); g.stroke();
  if (!lowQ) { g.strokeStyle = `rgba(${WATER},${0.7 * (1 - k)})`; g.lineWidth = 2; gEllipse(g, cx, cy, size * (0.1 + 0.4 * q), 0.02, 24); g.stroke(); }
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + R() * 0.5, d = size * (0.12 + (0.35 + R() * 0.35) * q), h = size * (0.5 + R() * 0.6);
    const [x, y, s] = P(cx + Math.cos(a) * d, cy + Math.sin(a) * d, z0 + h * 4 * k * (1 - k));
    dot(g, x, y, s * (0.03 + R() * 0.025) * (1 - 0.4 * k), i % 3 ? WATER_HI : WATER, 1 - k * k);
  }
  g.restore();
}
// แส้ปะทะ: แสงวาบขาว-แดง + ประกาย (จุดจอ)
function crack(g, x, y, r, k, lowQ) {
  if (k <= 0 || k >= 1) return;
  g.save(); g.globalCompositeOperation = "lighter";
  glow(g, x, y, r * (0.6 + k), EMBER, 0.7 * (1 - k));
  star4(g, x, y, r * 0.9 * (1 - k), "255,240,240", 1 - k);
  g.globalCompositeOperation = "source-over";
  g.strokeStyle = `rgba(${EMBER},${1 - k})`; g.lineWidth = 2.5 * (1 - k) + 1;
  g.beginPath(); g.ellipse(x, y, r * (0.3 + 0.8 * easeOut3(k)), r * (0.2 + 0.5 * easeOut3(k)), 0, 0, TAU); g.stroke();
  if (!lowQ) {
    const R = rngOf(Math.round(x * 3 + y * 7));
    for (let i = 0; i < 9; i++) {
      const a = R() * TAU, d = r * (0.3 + R() * 1.1) * easeOut3(k);
      dot(g, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7 + k * k * r * 0.6, 1.4 + R() * 1.6, i % 2 ? "255,90,90" : "255,220,210", 1 - k);
    }
  }
  g.restore();
}

// ---------------------------------------------------------------- ขนนก / ปีกเขม่า
// ขนนก 1 เส้นในพิกัดท้องถิ่น (โคน x, y · มุม ang · ยาว L · กว้าง W) — ต่อเข้า path เดิม (ไม่ fill เอง)
function feather(g, x, y, ang, L, W) {
  const c = Math.cos(ang), sn = Math.sin(ang), nx = -sn, ny = c;
  g.moveTo(x + nx * W * 0.5, y + ny * W * 0.5);
  g.quadraticCurveTo(x + c * L * 0.55 + nx * W, y + sn * L * 0.55 + ny * W, x + c * L, y + sn * L);
  g.quadraticCurveTo(x + c * L * 0.55 - nx * W * 0.7, y + sn * L * 0.55 - ny * W * 0.7, x - nx * W * 0.5, y - ny * W * 0.5);
  g.closePath();
}
// ขนนกปลิว (จุดจอ)
function looseFeather(g, x, y, ang, L, a) {
  if (a <= 0.01 || L < 1) return;
  g.save(); g.translate(x, y); g.rotate(ang); g.globalAlpha = Math.min(1, a);
  g.beginPath(); g.moveTo(0, -L * 0.5); g.quadraticCurveTo(L * 0.24, 0, 0, L * 0.5); g.quadraticCurveTo(-L * 0.16, 0, 0, -L * 0.5);
  g.fillStyle = "#0b0508"; g.fill();
  g.strokeStyle = "rgba(190,25,40,.75)"; g.lineWidth = 1; g.stroke();
  g.restore();
}
// ปีก 1 ข้าง: โคนที่จุดจอ (sx, sy) · L = ความยาวช่วงแขนปีก (px) · flap = มุมยก (เรเดียน + = ยกขึ้น) · side = −1 ซ้าย / 1 ขวา
//  ขนปลายปีกยาวแผ่เป็นนิ้ว (อีกา) · ขนกลางห้อยลง · แขนปีกโค้ง + ขนคลุม · ขอบหน้าเรืองแดงเข้ม · peel = ขนหลุด (ช่วงสลาย)
function wing(g, sx, sy, L, flap, side, alpha, now, lowQ, peel) {
  if (L < 2 || alpha <= 0.01) return;
  g.save();
  g.translate(sx, sy); g.scale(side, 1); g.rotate(-flap);
  g.scale(0.8 + 0.2 * Math.cos(flap * 1.2), 1); // ปีกยก/ลงสุด = สั้นลงนิดๆ (มุมลึก)
  g.globalAlpha = alpha;
  g.lineJoin = "round"; g.lineCap = "round";
  const n = lowQ ? 6 : 10;
  const gr = g.createLinearGradient(0, -L * 0.2, L * 1.2, L * 0.6);
  gr.addColorStop(0, "#1e0b13"); gr.addColorStop(1, "#040103");
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const fx = L * (0.94 - 0.74 * u), fy = L * (0.02 - 0.06 * Math.sin(u * Math.PI));
    const ang = lerp(-0.25, 1.5, Math.pow(u, 0.8)) + (REDUCED ? 0 : 0.05 * Math.sin(now / 170 + i * 1.3));
    const len = L * (u < 0.3 ? lerp(0.66, 0.54, u / 0.3) : lerp(0.54, 0.36, (u - 0.3) / 0.7)) * (peel ? 1 - peel * (i % 3 === 0 ? 0.8 : 0.35) : 1);
    feather(g, fx, fy, ang, len, len * 0.19);
  }
  g.fillStyle = gr; g.fill();
  if (!lowQ) { g.strokeStyle = "rgba(160,18,34,.55)"; g.lineWidth = 1.1; g.stroke(); }
  // แขนปีก + ขนคลุม
  g.beginPath();
  g.moveTo(-L * 0.06, L * 0.08);
  g.quadraticCurveTo(L * 0.34, -L * 0.24, L * 1.0, -L * 0.03);
  g.quadraticCurveTo(L * 0.62, L * 0.16, L * 0.3, L * 0.36);
  g.quadraticCurveTo(L * 0.08, L * 0.36, -L * 0.06, L * 0.08);
  g.closePath();
  g.fillStyle = "#0e0509"; g.fill();
  if (!lowQ) {
    g.beginPath();
    for (let i = 0; i < 5; i++) { const u = i / 4; feather(g, L * lerp(0.82, 0.12, u), L * lerp(0.06, 0.28, u), lerp(0.5, 1.35, u), L * lerp(0.26, 0.2, u), L * 0.06); }
    g.fillStyle = "#160910"; g.fill();
    g.strokeStyle = "rgba(130,12,28,.5)"; g.lineWidth = 1; g.stroke();
  }
  g.beginPath(); g.moveTo(-L * 0.06, L * 0.06); g.quadraticCurveTo(L * 0.34, -L * 0.26, L * 1.0, -L * 0.04);
  g.strokeStyle = "rgba(205,30,48,.9)"; g.lineWidth = Math.max(1.5, L * 0.03); g.stroke();
  g.restore();
}

// ---------------------------------------------------------------- ปีกเขม่า: แผนเวลา + ท่า
const FLY_Z = 1.55, CARRY_DROP = 0.62, FLAP_MS = 330, WING_L = 1.4; // WING_L = แขนปีก (ช่อง) — ปลายขนยื่นออกไปอีก ~0.6 เท่า
function wingsPlan(e) {
  const d = Math.min(6, Math.hypot(e.to.x - e.from.x, e.to.y - e.from.y));
  const t1 = WG.sprout, t2 = t1 + WG.lift, t3 = t2 + WG.flyBase + WG.flyPer * d, t4 = t3 + WG.land;
  return { t1, t2, t3, t4, t5: t4 + WG.fade };
}
export const wingsDur = (from, to) => wingsPlan({ from, to }).t5;
function katePose(e, t, pl) {
  const A = e.from, B = e.to;
  if (t < pl.t1) return { x: A.x, y: A.y, hz: 0, sq: 0.1 * Math.sin(seg(t, pl.t1 * 0.45, pl.t1) * Math.PI) };
  if (t < pl.t2) { const k = easeOut3(seg(t, pl.t1, pl.t2)); return { x: A.x, y: A.y, hz: FLY_Z * k, sq: -0.06 * (1 - k) }; }
  if (t < pl.t3) {
    const u = easeInOut(seg(t, pl.t2, pl.t3)), arc = Math.sin(u * Math.PI);
    return { x: lerp(A.x, B.x, u), y: lerp(A.y, B.y, u), hz: FLY_Z + arc * (0.3 + (REDUCED ? 0 : 0.06 * Math.sin((t - pl.t2) / 95))) };
  }
  if (t < pl.t4) return { x: B.x, y: B.y, hz: FLY_Z * (1 - easeIn2(seg(t, pl.t3, pl.t4))) };
  const k = seg(t, pl.t4, pl.t4 + 180);
  return { x: B.x, y: B.y, hz: 0, sq: k < 1 ? 0.13 * Math.sin(k * Math.PI) : 0 };
}
// เอมิลิโกะถูกหิ้ว: ลอยเข้าหาใต้ตัวเคท (เยื้องเข้าหากล้อง) → ห้อยแกว่งตามไป → ลงช่องของตัวเอง
function carryPose(e, t, pl) {
  const c = e.carry, kp = katePose(e, t, pl), ax = viewAxes();
  const hold = { x: kp.x + ax.fx * 0.3 + ax.rx * 0.14, y: kp.y + ax.fy * 0.3 + ax.ry * 0.14 }, hz = Math.max(0, kp.hz - CARRY_DROP);
  if (t < pl.t1) return { x: c.from.x, y: c.from.y, hz: 0 };
  if (t < pl.t2) { const k = easeInOut(seg(t, pl.t1, pl.t2)); return { x: lerp(c.from.x, hold.x, k), y: lerp(c.from.y, hold.y, k), hz: hz * k }; }
  if (t < pl.t3) {
    const sw = REDUCED ? 0 : 0.06 * Math.sin((t - pl.t2) / 150) * Math.sin(seg(t, pl.t2, pl.t3) * Math.PI);
    return { x: hold.x + ax.rx * sw, y: hold.y + ax.ry * sw, hz };
  }
  if (t < pl.t4) { const k = easeInOut(seg(t, pl.t3, pl.t4)); return { x: lerp(hold.x, c.to.x, k), y: lerp(hold.y, c.to.y, k), hz }; }
  return { x: c.to.x, y: c.to.y, hz: 0 };
}
// มุมกระพือ/ขนาด/ความทึบของปีก ตามช่วงเวลา
function wingState(t, pl) {
  const flyFlap = (tt) => (REDUCED ? 0.3 : 0.25 + 0.6 * Math.cos(((tt - pl.t2) / FLAP_MS) * TAU + Math.PI));
  if (t < pl.t1) { const k = seg(t, 30, pl.t1); return { spread: Math.max(0, easeOutBack(k)), flap: lerp(1.35, 0.95, easeOut3(k)), alpha: 1, peel: 0 }; }
  if (t < pl.t2) return { spread: 1, flap: lerp(0.95, -0.5, easeIn2(seg(t, pl.t1, pl.t2))), alpha: 1, peel: 0 };
  if (t < pl.t3) return { spread: 1, flap: flyFlap(t), alpha: 1, peel: 0 };
  if (t < pl.t4) {
    const k = seg(t, pl.t3, pl.t4);
    return { spread: 1, flap: lerp(flyFlap(pl.t3), 0.75, easeOut3(k)) + (REDUCED ? 0 : 0.1 * Math.sin(t / 40) * (1 - k)), alpha: 1, peel: 0 };
  }
  const k = seg(t, pl.t4, pl.t5);
  return { spread: 1 - 0.25 * k, flap: lerp(0.75, 0.45, k), alpha: 1 - easeIn2(k), peel: k };
}
// ชั้นหลังตัว: เงาบนพื้น (ตัว + ปีกกาง) + ปีกสองข้าง
function wingsBack(g, e, t, now, lowQ) {
  const pl = wingsPlan(e);
  if (t > pl.t5 || (e.keep && t >= pl.t4)) return; // keep = ลงในม่านแดง → ปีกค้าง (drawIdleWings) รับช่วงต่อ ไม่สลาย
  const kp = katePose(e, t, pl), H = hexAt(kp.x, kp.y, kp.hz), ws = wingState(t, pl);
  if (kp.hz > 0.03) {
    const lift = Math.min(1, kp.hz / FLY_Z), cx = kp.x + 0.5, cy = kp.y + 0.5, ax = viewAxes();
    g.save();
    gEllipse(g, cx, cy, 0.3 + 0.12 * lift, 0, 24); g.fillStyle = `rgba(6,0,4,${0.3 - 0.1 * lift})`; g.fill();
    const span = 1.15 * ws.spread * ws.alpha * (0.85 + 0.15 * Math.cos(ws.flap));
    if (span > 0.05) {
      g.beginPath();
      for (let j = 0; j <= 24; j++) {
        const a = (j / 24) * TAU, c = Math.cos(a) * span, s = Math.sin(a) * 0.2;
        const p = P(cx + ax.rx * c + ax.fx * s, cy + ax.ry * c + ax.fy * s);
        if (j) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
      }
      g.closePath(); g.fillStyle = `rgba(6,0,4,${0.17 * (1 - 0.4 * lift)})`; g.fill();
    }
    g.restore();
  }
  if (!lowQ && t < pl.t4) glow(g, H.x, H.y, H.r * 2.4, "70,0,14", 0.28 * ws.alpha * Math.min(1, ws.spread));
  const L = H.s * WING_L * ws.spread, sy = H.y - H.r * 0.3;
  wing(g, H.x - H.r * 0.3, sy, L, ws.flap, -1, ws.alpha, now, lowQ, ws.peel);
  wing(g, H.x + H.r * 0.3, sy, L, ws.flap, 1, ws.alpha, now, lowQ, ws.peel);
}
// ชั้นหน้า: เขม่างอกปีก · ลมตอนทะยาน · ควัน/ขนนกตามทาง · มือเขม่าหิ้วเอมิลิโกะ · ลงพื้น · ปีกสลาย
function wingsFront(g, e, t, now, lowQ) {
  const pl = wingsPlan(e);
  if (t > pl.t5 + 900) return;
  const kp = katePose(e, Math.min(t, pl.t5), pl), H = hexAt(kp.x, kp.y, kp.hz);
  g.save();
  // 1) งอก: เขม่าหมุนวนรวมที่หลัง + ถ่านแดง
  if (t < pl.t1 + 140) {
    const k = seg(t, 0, pl.t1 + 140), n = lowQ ? 4 : 10;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + k * 3.4, r = H.s * (0.95 * (1 - easeOut3(k)) + 0.18);
      soot(g, H.x + Math.cos(a) * r, H.y - H.r * 0.3 + Math.sin(a) * r * 0.55, H.r * (0.55 - 0.25 * k), 0.55 * (1 - k * 0.7));
      if (!lowQ) dot(g, H.x + Math.cos(a + 0.4) * r * 0.8, H.y - H.r * 0.3 + Math.sin(a + 0.4) * r * 0.45, 1.6, EMBER, 1 - k);
    }
  }
  // 2) ทะยาน: วงลมบนพื้น + ฝุ่นเขม่า
  const kt = seg(t, pl.t1, pl.t1 + 460);
  if (kt > 0 && kt < 1) {
    const cx = e.from.x + 0.5, cy = e.from.y + 0.5;
    g.strokeStyle = `rgba(${EMBER},${0.6 * (1 - kt)})`; g.lineWidth = 3 * (1 - kt) + 1;
    gEllipse(g, cx, cy, 0.3 + 0.95 * easeOut3(kt), 0.02, 30); g.stroke();
    g.strokeStyle = `rgba(20,6,12,${0.5 * (1 - kt)})`; g.lineWidth = 5 * (1 - kt) + 1;
    gEllipse(g, cx, cy, 0.2 + 0.7 * easeOut3(kt), 0.02, 30); g.stroke();
    sootBurst(g, cx, cy, 0.05, kt, 9, 1.0, 17, lowQ);
  }
  // 3) ควันเขม่าตามทาง + ขนนกร่วง
  if (!lowQ) {
    for (let j = 0; j < 10; j++) {
      const ts = pl.t2 + ((j + 0.5) / 10) * (pl.t3 - pl.t2), age = t - ts;
      if (age < 0 || age > 620) continue;
      const p = katePose(e, ts, pl), [x, y, s] = P(p.x + 0.5, p.y + 0.5, p.hz * 0.85 + 0.75), q = age / 620;
      soot(g, x, y, s * (0.22 + 0.3 * q), 0.42 * (1 - q));
    }
  }
  const nF = lowQ ? 4 : 13;
  for (let j = 0; j < nF; j++) {
    const ts = pl.t1 + ((j + 0.5) / nF) * (pl.t3 - pl.t1 + 160), age = t - ts;
    if (age < 0 || age > 1150) continue;
    const R = rngOf(j * 31 + 7), p = katePose(e, Math.min(ts, pl.t5), pl), q = age / 1150;
    const ox = (R() - 0.5) * 0.9, oy = (R() - 0.5) * 0.5, fall = age / 1000;
    const z = Math.max(0.02, p.hz * 0.85 + 0.85 - fall * (0.9 + R() * 0.4));
    const sway = REDUCED ? 0 : Math.sin(age / 160 + j) * 0.12;
    const [x, y, s] = P(p.x + 0.5 + ox + sway, p.y + 0.5 + oy, z);
    looseFeather(g, x, y, (REDUCED ? 0.6 : age / 260) + j, s * (0.14 + R() * 0.06), q < 0.75 ? 0.95 : (1 - q) * 3.8);
  }
  // 4) มือเขม่าหิ้วเอมิลิโกะ
  if (e.carry && t > pl.t1 && t < pl.t4 + 80) {
    const cp = carryPose(e, t, pl), C = hexAt(cp.x, cp.y, cp.hz), a = seg(t, pl.t1, pl.t1 + 140) * (1 - seg(t, pl.t4 - 40, pl.t4 + 80));
    if (a > 0.01) {
      const A = [H.x, H.y + H.r * 0.75], B = [C.x, C.y - C.r * 0.85], mx = (A[0] + B[0]) / 2 + (REDUCED ? 0 : Math.sin(now / 120) * H.r * 0.15), my = (A[1] + B[1]) / 2;
      g.lineCap = "round";
      g.strokeStyle = `rgba(10,3,7,${0.9 * a})`; g.lineWidth = Math.max(2, H.s * 0.07);
      g.beginPath(); g.moveTo(A[0], A[1]); g.quadraticCurveTo(mx, my, B[0], B[1]); g.stroke();
      if (!lowQ) { g.strokeStyle = `rgba(${EMBER},${0.7 * a})`; g.lineWidth = Math.max(1, H.s * 0.018); g.stroke(); }
      soot(g, B[0], B[1], C.r * 0.55, 0.5 * a);
    }
  }
  // 5) ลงพื้น: ควันเขม่าแตก + วงกระแทก
  const kl = seg(t, pl.t4 - 60, pl.t4 + 560);
  if (kl > 0 && kl < 1) {
    const cx = e.to.x + 0.5, cy = e.to.y + 0.5;
    g.strokeStyle = `rgba(${EMBER},${0.75 * (1 - kl)})`; g.lineWidth = 3.5 * (1 - kl) + 1;
    gEllipse(g, cx, cy, 0.25 + 1.0 * easeOut3(kl), 0.02, 32); g.stroke();
    sootBurst(g, cx, cy, 0.08, kl, 12, 1.1, 29, lowQ);
  }
  // 6) ปีกสลาย: ขนหลุดปลิวออกจากแนวปีก + ควัน
  const kd = e.keep ? 0 : seg(t, pl.t4, pl.t5 + 500);
  if (kd > 0 && kd < 1) {
    const n = lowQ ? 4 : 12, R = rngOf(53), L = H.s * WING_L;
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1, u = 0.25 + R() * 1.1, q = easeOut3(kd);
      const x = H.x + side * (H.r * 0.3 + L * u * (0.8 + q * 0.5)), y = H.y - H.r * 0.3 - L * u * 0.35 - q * H.s * (0.3 + R() * 0.5) + kd * kd * H.s * 0.8;
      looseFeather(g, x, y, (REDUCED ? 0.4 : kd * 6 * side) + i, H.s * (0.13 + R() * 0.06), 1 - kd);
      if (!lowQ && i % 3 === 0) soot(g, x, y, H.r * 0.6, 0.35 * (1 - kd));
    }
  }
  g.restore();
}

// ---------------------------------------------------------------- แส้เขม่า
// จุดตามแส้จาก A → B (จอ) ยาว k ของทั้งเส้น · lift = โค้งขึ้น (px) · amp = คลื่นเดิน (px)
function whipPts(A, B, k, lift, amp, phase, n = 22) {
  const out = [], vx = B[0] - A[0], vy = B[1] - A[1], L = Math.hypot(vx, vy) || 1, nx = -vy / L, ny = vx / L;
  const m = Math.max(1, Math.round(n * clamp01(k)));
  for (let i = 0; i <= m; i++) {
    const u = i / n, w = amp * Math.sin(u * Math.PI * 3 - phase) * Math.sin(u * Math.PI);
    out.push([A[0] + vx * u + nx * w, A[1] + vy * u - lift * 4 * u * (1 - u) + ny * w]);
  }
  return out;
}
// แส้เรียว: ดำ + เส้นแดงเข้มบนสัน
function drawWhip(g, pts, w0, w1, a, lowQ) {
  if (pts.length < 2 || a <= 0.01) return;
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  const n = pts.length - 1;
  g.strokeStyle = `rgba(10,3,7,${a})`;
  for (let i = 1; i <= n; i++) {
    g.lineWidth = Math.max(1, lerp(w0, w1, i / n));
    g.beginPath(); g.moveTo(pts[i - 1][0], pts[i - 1][1]); g.lineTo(pts[i][0], pts[i][1]); g.stroke();
  }
  if (!lowQ) {
    g.strokeStyle = `rgba(215,36,52,${0.75 * a})`;
    for (let i = 1; i <= n; i++) {
      const w = lerp(w0, w1, i / n);
      g.lineWidth = Math.max(0.8, w * 0.28);
      g.beginPath(); g.moveTo(pts[i - 1][0], pts[i - 1][1] - w * 0.28); g.lineTo(pts[i][0], pts[i][1] - w * 0.28); g.stroke();
    }
  }
  g.restore();
}
function pullPose(e, t) {
  const a = WP.reach + WP.coil, b = a + WP.yank;
  if (t < a) return { x: e.from.x, y: e.from.y, hz: 0 };
  if (t < b) { const k = easeInOut(seg(t, a, b)); return { x: lerp(e.from.x, e.to.x, k), y: lerp(e.from.y, e.to.y, k), hz: 0.45 * Math.sin(k * Math.PI) }; }
  return { x: e.to.x, y: e.to.y, hz: 0 };
}
function dashPose(e, t) {
  const a = WD.gather, b = a + WD.zip;
  if (t < a) return { x: e.from.x, y: e.from.y, hz: 0, sq: 0.08 * Math.sin(seg(t, 0, a) * Math.PI) };
  if (t < b) { const k = easeInOut(seg(t, a, b)); return { x: lerp(e.from.x, e.to.x, k), y: lerp(e.from.y, e.to.y, k), hz: 0.18 * Math.sin(k * Math.PI) }; }
  return { x: e.to.x, y: e.to.y, hz: 0 };
}
const whipDashDur = (hit) => WD.gather + WD.zip + (hit ? WD.lash + WD.tail : 300);
function whipPullFx(g, e, t, now, lowQ) {
  const t1 = WP.reach, t2 = t1 + WP.coil, t3 = t2 + WP.yank, t4 = t3 + WP.back;
  if (t >= t4) return;
  const src = e.src || e.to, K = hexAt(src.x, src.y), mp = pullPose(e, t), M = hexAt(mp.x, mp.y, mp.hz);
  const side = M.x >= K.x ? 1 : -1, hand = [K.x + side * K.r * 0.75, K.y + K.r * 0.15], tgt = [M.x, M.y + M.r * 0.1];
  let k = 1, lift = K.s * 0.55, amp = K.s * 0.12;
  if (t < t1) { k = easeOut3(t / t1); amp = K.s * 0.18; }
  else if (t < t2) amp = K.s * 0.06;
  else if (t < t3) { amp = K.s * 0.03; lift = K.s * 0.25 * (1 - seg(t, t2, t3)); }
  else { k = 1 - easeIn2(seg(t, t3, t4)); amp = K.s * 0.1; }
  // รอยลากบนพื้นตอนกระชาก
  if (t >= t2 && t < t3 + 220) {
    const a = 0.4 * (1 - seg(t, t3, t3 + 220)), A = P(e.from.x + 0.5, e.from.y + 0.5, 0.02), B = P(mp.x + 0.5, mp.y + 0.5, 0.02);
    g.save(); g.lineCap = "round"; g.strokeStyle = `rgba(20,6,10,${a})`; g.lineWidth = A[2] * 0.16;
    g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke(); g.restore();
  }
  drawWhip(g, whipPts(hand, tgt, k, lift, amp, REDUCED ? 0 : now / 55), K.s * 0.11, K.s * 0.035, 1, lowQ);
  // แส้พันรอบตัว
  if (t >= t1 && t < t3 + 60) {
    const c = seg(t, t1, t2), a = 1 - seg(t, t3, t3 + 60);
    g.save();
    for (let j = 0; j < 2; j++) {
      const y = M.y + (j - 0.5) * M.r * 0.55;
      g.strokeStyle = `rgba(10,3,7,${a})`; g.lineWidth = Math.max(2, M.s * 0.05);
      g.beginPath(); g.ellipse(M.x, y, M.r * (1.05 - 0.12 * c), M.r * 0.3, 0, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0.05, c)); g.stroke();
      if (!lowQ) { g.strokeStyle = `rgba(${EMBER},${0.7 * a})`; g.lineWidth = 1.2; g.stroke(); }
    }
    g.restore();
  }
  crack(g, tgt[0], tgt[1], K.s * 0.5, seg(t, t1 - 20, t1 + 240), lowQ);
  if (t >= t3 - 60) sootBurst(g, e.to.x + 0.5, e.to.y + 0.5, 0.1, seg(t, t3 - 60, t4), 7, 0.5, 71, lowQ);
}
function whipDashFx(g, e, t, now, lowQ) {
  const ta = WD.gather, tb = ta + WD.zip, tc = tb + WD.lash, td = tc + WD.tail;
  if (t >= whipDashDur(!!e.hitAt)) return;
  const kp = dashPose(e, t), K = hexAt(kp.x, kp.y, kp.hz);
  // รวมเขม่าก่อนพุ่ง
  if (t < ta + 80) {
    const k = seg(t, 0, ta + 80), n = lowQ ? 3 : 7;
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU + k * 2.5, r = K.r * (2.2 * (1 - k) + 0.4); soot(g, K.x + Math.cos(a) * r, K.y + Math.sin(a) * r * 0.6, K.r * 0.6, 0.5 * (1 - k * 0.5)); }
  }
  // พุ่ง: แถบเขม่าตามทาง + เงาค้าง
  if (t >= ta && t < tb + 260) {
    const k = seg(t, ta, tb), fade = 1 - seg(t, tb, tb + 260), A = hexAt(e.from.x, e.from.y, 0.1);
    g.save(); g.lineCap = "round";
    g.strokeStyle = `rgba(14,4,9,${0.3 * fade})`; g.lineWidth = K.r * 1.2; g.beginPath(); g.moveTo(A.x, A.y); g.lineTo(K.x, K.y); g.stroke();
    g.strokeStyle = `rgba(14,4,9,${0.55 * fade})`; g.lineWidth = K.r * 0.5; g.stroke();
    if (!lowQ) { g.strokeStyle = `rgba(${EMBER},${0.7 * fade})`; g.lineWidth = 1.5; g.stroke(); }
    g.restore();
    if (!lowQ) for (let j = 0; j < 3; j++) {
      const u = easeInOut(clamp01(k - (j + 1) * 0.14)), X = hexAt(lerp(e.from.x, e.to.x, u), lerp(e.from.y, e.to.y, u), 0.1);
      soot(g, X.x, X.y, X.r * 1.2, 0.4 * fade * (1 - j * 0.25));
    }
  }
  // ฟาด
  if (e.hitAt && t >= tb) {
    const T0 = hexAt(e.hitAt.x, e.hitAt.y), side = T0.x >= K.x ? 1 : -1, hand = [K.x + side * K.r * 0.7, K.y - K.r * 0.3];
    let k, lift, amp;
    if (t < tc) { const q = seg(t, tb, tc); k = easeOut3(q); lift = K.s * (1.15 - 1.1 * easeIn2(q)); amp = K.s * 0.14 * (1 - q); }
    else { const q = seg(t, tc, td); k = 1 - easeIn2(q); lift = K.s * 0.15; amp = K.s * 0.08; }
    drawWhip(g, whipPts(hand, [T0.x, T0.y], k, lift, amp, REDUCED ? 0 : now / 50), K.s * 0.11, K.s * 0.035, 1, lowQ);
    if (t >= tc) {
      const q = seg(t, tc, tc + 440);
      if (!e.dodge) { crack(g, T0.x, T0.y, T0.s * 0.9, q, lowQ); sootBurst(g, e.hitAt.x + 0.5, e.hitAt.y + 0.5, 0.4, q, 9, 0.7, 13, lowQ); }
      else if (q < 1) soot(g, T0.x, T0.y, T0.r * (1 + q), 0.4 * (1 - q));
    }
  }
}

// ---------------------------------------------------------------- อุปกรณ์ (ไอคอนวาด) — r = รัศมีกล่อง (px)
function rrect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h - r);
  g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r);
  g.quadraticCurveTo(x, y, x + r, y); g.closePath();
}
function drawTool(g, kind, x, y, r, rot = 0) {
  g.save(); g.translate(x, y); if (rot) g.rotate(rot);
  g.lineCap = "round"; g.lineJoin = "round";
  if (kind === "vase") {
    g.beginPath();
    g.moveTo(-r * 0.2, -r * 0.78); g.lineTo(r * 0.2, -r * 0.78);
    g.quadraticCurveTo(r * 0.12, -r * 0.52, r * 0.24, -r * 0.42);
    g.bezierCurveTo(r * 0.78, -r * 0.15, r * 0.62, r * 0.6, r * 0.26, r * 0.8);
    g.lineTo(-r * 0.26, r * 0.8);
    g.bezierCurveTo(-r * 0.62, r * 0.6, -r * 0.78, -r * 0.15, -r * 0.24, -r * 0.42);
    g.quadraticCurveTo(-r * 0.12, -r * 0.52, -r * 0.2, -r * 0.78);
    g.closePath();
    g.fillStyle = "#f3f6fb"; g.fill(); g.strokeStyle = "#2d5aa0"; g.lineWidth = Math.max(1.2, r * 0.08); g.stroke();
    g.strokeStyle = "#3b73c4"; g.lineWidth = Math.max(1, r * 0.1);
    g.beginPath(); g.moveTo(-r * 0.56, r * 0.08); g.quadraticCurveTo(0, r * 0.24, r * 0.56, r * 0.08); g.stroke();
    g.fillStyle = "#5fb4f5"; g.beginPath(); g.moveTo(r * 0.42, -r * 1.02); g.quadraticCurveTo(r * 0.58, -r * 0.78, r * 0.42, -r * 0.72); g.quadraticCurveTo(r * 0.26, -r * 0.78, r * 0.42, -r * 1.02); g.fill();
  } else if (kind === "vacuum") {
    g.strokeStyle = "#3b3f46"; g.lineWidth = Math.max(1.5, r * 0.13);
    g.beginPath(); g.moveTo(-r * 0.05, r * 0.2); g.bezierCurveTo(r * 0.55, r * 0.45, r * 0.15, -r * 0.4, r * 0.55, -r * 0.68); g.stroke();
    g.strokeStyle = "#a7b0ba"; g.lineWidth = Math.max(2, r * 0.18);
    g.beginPath(); g.moveTo(r * 0.55, -r * 0.68); g.lineTo(r * 0.82, -r * 0.46); g.stroke();
    rrect(g, -r * 0.85, r * 0.02, r * 0.9, r * 0.6, r * 0.18);
    g.fillStyle = "#8c2232"; g.fill(); g.strokeStyle = "#3a0b12"; g.lineWidth = Math.max(1, r * 0.07); g.stroke();
    g.fillStyle = "#e9d7a8"; g.fillRect(-r * 0.68, r * 0.14, r * 0.5, r * 0.08);
    g.fillStyle = "#2a2a30";
    for (const wx of [-r * 0.66, -r * 0.14]) { g.beginPath(); g.arc(wx, r * 0.66, r * 0.11, 0, TAU); g.fill(); }
  } else if (kind === "sword") {
    g.strokeStyle = "#07040a"; g.lineWidth = Math.max(2, r * 0.17);
    g.beginPath(); g.moveTo(-r * 0.4, r * 0.4); g.lineTo(r * 0.8, -r * 0.8); g.stroke();
    g.strokeStyle = "rgba(215,36,52,.9)"; g.lineWidth = Math.max(0.8, r * 0.04);
    g.beginPath(); g.moveTo(-r * 0.34, r * 0.3); g.lineTo(r * 0.76, -r * 0.8); g.stroke();
    g.strokeStyle = "#07040a"; g.lineWidth = Math.max(1.5, r * 0.1);
    g.beginPath(); g.moveTo(-r * 0.62, r * 0.24); g.lineTo(-r * 0.26, r * 0.6); g.stroke();
    g.lineWidth = Math.max(1.5, r * 0.12);
    g.beginPath(); g.moveTo(-r * 0.44, r * 0.44); g.lineTo(-r * 0.72, r * 0.72); g.stroke();
    g.fillStyle = "#07040a"; g.beginPath(); g.arc(-r * 0.8, r * 0.8, r * 0.1, 0, TAU); g.fill();
  } else {
    // ไม้ถูพื้น: ด้ามไม้ + ปลอกโลหะ + พู่ผ้าขาว
    g.strokeStyle = "#7b4a22"; g.lineWidth = Math.max(1.5, r * 0.13);
    g.beginPath(); g.moveTo(r * 0.75, -r * 0.85); g.lineTo(-r * 0.18, r * 0.2); g.stroke();
    for (const [col, w] of [["#8fa3b8", 0.15], ["#eef3f8", 0.09]]) {
      g.strokeStyle = col; g.lineWidth = Math.max(1, r * w);
      for (let i = 0; i < 7; i++) {
        const o = (i - 3) / 3;
        g.beginPath(); g.moveTo(-r * 0.2 + o * r * 0.12, r * 0.24 - o * r * 0.06); g.quadraticCurveTo(-r * 0.3 + o * r * 0.2, r * 0.55, -r * 0.42 + o * r * 0.3, r * 0.86); g.stroke();
      }
    }
    g.fillStyle = "#b9c3cf"; g.beginPath(); g.arc(-r * 0.18, r * 0.2, r * 0.12, 0, TAU); g.fill();
  }
  g.restore();
}
const TOOL_RGB = { mop: "120,200,255", vase: "70,130,220", vacuum: "190,60,80", sword: "200,30,45" };

// ---------------------------------------------------------------- กระจกเงา / ฟื้น / อาวุธ / ดาบ / มองไม่ออก
function pane(g, x, yb, w, h, a, shine) {
  if (a <= 0.01 || h < 2) return;
  const path = () => { g.beginPath(); g.moveTo(x - w / 2, yb); g.lineTo(x - w / 2, yb - h + w / 2); g.arc(x, yb - h + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w / 2, yb); g.closePath(); };
  g.save();
  path();
  const gr = g.createLinearGradient(x - w / 2, yb - h, x + w / 2, yb);
  gr.addColorStop(0, `rgba(235,245,255,${0.6 * a})`); gr.addColorStop(0.5, `rgba(150,180,225,${0.35 * a})`); gr.addColorStop(1, `rgba(210,230,255,${0.55 * a})`);
  g.fillStyle = gr; g.fill();
  g.strokeStyle = `rgba(40,16,26,${0.85 * a})`; g.lineWidth = 5; g.stroke();
  g.strokeStyle = `rgba(250,252,255,${0.95 * a})`; g.lineWidth = 2; g.stroke();
  g.clip();
  const sx = x - w + shine * w * 2.2;
  g.strokeStyle = `rgba(255,255,255,${0.7 * a})`; g.lineWidth = w * 0.18;
  g.beginPath(); g.moveTo(sx, yb); g.lineTo(sx + w * 0.6, yb - h); g.stroke();
  g.restore();
}
function shards(g, x, y, s, k, seed, lowQ) {
  if (k <= 0 || k >= 1) return;
  const R = rngOf(seed), n = lowQ ? 5 : 12;
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < n; i++) {
    const a = R() * TAU, sp = s * (0.4 + R() * 0.9), d = sp * easeOut3(k), r = s * (0.06 + R() * 0.07) * (1 - k * 0.4);
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.7 + k * k * s * 0.9;
    g.save(); g.translate(px, py); g.rotate(a + k * (3 + R() * 5));
    g.fillStyle = i % 2 ? `rgba(220,238,255,${1 - k})` : `rgba(160,195,240,${1 - k})`;
    g.beginPath(); g.moveTo(0, -r); g.lineTo(r * 0.6, r * 0.5); g.lineTo(-r * 0.5, r * 0.3); g.closePath(); g.fill();
    g.restore();
  }
  g.restore();
}
function mirrorFx(g, e, t, now, lowQ) {
  const t1 = MR.rise, t2 = t1 + MR.travel, T = t2 + MR.out;
  if (t >= T) return;
  const A = hexAt(e.from.x, e.from.y), B = hexAt(e.to.x, e.to.y), w = A.r * 1.9, h = A.r * 3.0;
  // กระจกขึ้นที่ตัวเดิม (เงาสะท้อนวิ่งออกไป)
  if (t < t2 + 120) {
    const k = easeOutBack(seg(t, 0, t1)), a = 1 - seg(t, t2 - 60, t2 + 120);
    pane(g, A.x, A.gy + A.s * 0.12, w, h * Math.max(0, k), a, REDUCED ? 0.5 : seg(t, 60, t2));
  }
  // แสงสะท้อนวิ่งจากกระจกเดิม → อีกตัว
  if (t >= t1 - 40 && t < t2 + 160) {
    const q = easeInOut(seg(t, t1 - 40, t2)), a = 1 - seg(t, t2, t2 + 160);
    const hx = lerp(A.x, B.x, q), hy = lerp(A.y, B.y, q) - Math.sin(q * Math.PI) * A.s * 0.5;
    g.save(); g.globalCompositeOperation = "lighter";
    g.strokeStyle = `rgba(200,225,255,${0.5 * a})`; g.lineWidth = A.r * 0.35; g.lineCap = "round";
    g.beginPath(); g.moveTo(A.x, A.y);
    g.quadraticCurveTo((A.x + hx) / 2, Math.min(A.y, hy) - A.s * 0.3, hx, hy); g.stroke();
    g.strokeStyle = `rgba(255,255,255,${0.9 * a})`; g.lineWidth = Math.max(1.5, A.r * 0.1); g.stroke();
    glow(g, hx, hy, A.r * 1.4, "210,230,255", 0.8 * a);
    star4(g, hx, hy, A.r * 0.8, "255,255,255", a);
    if (!lowQ) {
      const R = rngOf(41);
      for (let i = 0; i < 8; i++) { const u = clamp01(q - R() * 0.35); star4(g, lerp(A.x, B.x, u) + (R() - 0.5) * A.r, lerp(A.y, B.y, u) - Math.sin(u * Math.PI) * A.s * 0.5 + (R() - 0.5) * A.r, A.r * 0.22, "230,240,255", a * (1 - (q - u) * 2)); }
    }
    g.restore();
  }
  // กระจกที่ตัวใหม่: วาบ แล้วแตกเป็นเศษ
  if (t >= t2 - 40) {
    const k = seg(t, t2 - 40, T);
    if (k < 0.25) pane(g, B.x, B.gy + B.s * 0.12, w, h, 1 - k / 0.25, 0.6);
    g.save(); g.globalCompositeOperation = "lighter";
    glow(g, B.x, B.y, B.r * (1.2 + k * 1.5), "220,235,255", 0.9 * (1 - k));
    g.restore();
    shards(g, B.x, B.y - B.r * 0.3, B.s, k, 97, lowQ);
  }
}
function revivePose(e, t) { return { x: e.x, y: e.y, hz: Math.max(-0.04, 0.45 * (1 - easeOutBack(seg(t, RV.appear, RV.settle)))), alpha: seg(t, RV.appear, RV.appear + 420) }; }
function reviveFx(g, e, t, now, lowQ) {
  const T = e.dur || SH_FX_DUR.keRevive;
  if (t >= T) return;
  const cx = e.x + 0.5, cy = e.y + 0.5, H = hexAt(e.x, e.y), ga = Math.sin(seg(t, 0, T) * Math.PI);
  g.save();
  // วงเวทบนพื้น
  g.strokeStyle = `rgba(${EMBER},${0.75 * ga})`; g.lineWidth = 2; gEllipse(g, cx, cy, 0.46, 0.02, 32); g.stroke();
  if (!lowQ) {
    g.setLineDash([5, 6]); g.lineDashOffset = REDUCED ? 0 : -now / 50;
    g.strokeStyle = `rgba(${GOLD},${0.6 * ga})`; gEllipse(g, cx, cy, 0.36, 0.02, 28); g.stroke(); g.setLineDash([]);
  }
  // เขม่าวนเข้ากลางช่อง
  const R = rngOf(e.x * 13 + e.y * 7 + 3), n = lowQ ? 6 : 14;
  for (let i = 0; i < n; i++) {
    const st = R() * 220, a0 = R() * TAU, zr = R(), k = seg(t, st, 800 + st * 0.5);
    if (k <= 0 || k >= 1) continue;
    const a = a0 + k * 3.2, r = 1.25 * (1 - easeIn2(k)) + 0.05, [x, y, s] = P(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.15 + zr * 0.9 * k);
    soot(g, x, y, s * 0.2 * (1 - k * 0.5), 0.6 * Math.min(1, (1 - k) * 6));
    if (!lowQ) dot(g, x, y, s * 0.022, EMBER, 1 - k);
  }
  // เสาแสง
  const lc = seg(t, 450, 800) * (1 - seg(t, 1050, T));
  if (lc > 0) {
    const G = P(cx, cy, 0), Tp = P(cx, cy, 2.6), w = G[2] * 0.5 * (0.6 + 0.4 * lc);
    g.globalCompositeOperation = "lighter";
    const gr = g.createLinearGradient(G[0], G[1], Tp[0], Tp[1]);
    gr.addColorStop(0, `rgba(${GOLD},${0.75 * lc})`); gr.addColorStop(1, `rgba(${GOLD},0)`);
    g.fillStyle = gr; g.fillRect(G[0] - w / 2, Tp[1], w, G[1] - Tp[1]);
    glow(g, H.x, H.y, H.r * 2.2, GOLD, 0.6 * lc);
    g.globalCompositeOperation = "source-over";
  }
  // ปรากฏ: วงทอง + ประกายลอยขึ้น
  const kb = seg(t, RV.appear + 150, T);
  if (kb > 0 && kb < 1) {
    g.strokeStyle = `rgba(${GOLD},${0.9 * (1 - kb)})`; g.lineWidth = 3 * (1 - kb) + 1; gEllipse(g, cx, cy, 0.3 + 0.8 * easeOut3(kb), 0.02, 30); g.stroke();
    if (!lowQ) {
      const RS = rngOf(e.x * 5 + e.y * 3 + 9);
      for (let i = 0; i < 9; i++) {
        const a = RS() * TAU, d = 0.15 + RS() * 0.35, [x, y, s] = P(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 0.3 + kb * (0.8 + RS() * 0.9));
        star4(g, x, y, s * 0.08 * (1 - kb * 0.5), i % 2 ? "255,255,255" : GOLD, 1 - kb);
      }
    }
  }
  g.restore();
}
function weaponFx(g, e, t, now, lowQ) {
  const T = e.dur || SH_FX_DUR.keWeapon;
  if (t >= T) return;
  const H = hexAt(e.x, e.y), rgb = TOOL_RGB[e.weapon] || "255,255,255";
  g.save();
  const k = seg(t, 0, 520);
  if (k < 1) {
    const q = easeOut3(k);
    g.strokeStyle = `rgba(${rgb},${0.8 * (1 - k)})`; g.lineWidth = 3 * (1 - k) + 1;
    g.beginPath(); g.ellipse(H.x, H.y, H.r * (0.8 + 1.1 * q), H.r * (0.6 + 0.8 * q), 0, 0, TAU); g.stroke();
    const R = rngOf(e.x * 7 + e.y * 11 + 1), n = lowQ ? 5 : 12;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + R() * 0.4, d = H.r * (0.6 + 1.3 * q * (0.6 + R() * 0.5));
      const x = H.x + Math.cos(a) * d, y = H.y + Math.sin(a) * d * 0.8 - k * H.r * 0.5;
      if (i % 3 === 0) bubble(g, x, y, H.r * 0.13 * (1 - k * 0.5), 1 - k);
      else star4(g, x, y, H.r * 0.17 * (1 - k), i % 2 ? "255,255,255" : "255,236,170", 1 - k);
    }
  }
  const pop = easeOutBack(seg(t, 40, 300)), up = seg(t, T - 320, T), r = H.r * 0.78 * Math.max(0, pop);
  if (r > 1) {
    const bx = H.x, by = H.y - H.r * 2.1 - up * H.r * 0.8;
    g.globalAlpha = 1 - up;
    glow(g, bx, by, r * 1.8, rgb, 0.35);
    g.fillStyle = "rgba(255,251,244,.97)"; g.beginPath(); g.arc(bx, by, r, 0, TAU); g.fill();
    g.strokeStyle = `rgb(${rgb})`; g.lineWidth = Math.max(2, r * 0.12); g.stroke();
    drawTool(g, e.weapon, bx, by, r * 0.72, 0);
  }
  g.restore();
}
function swordPassFx(g, e, t, now, lowQ) {
  const T = e.dur || SH_FX_DUR.keSwordPass, FLY = 560;
  if (t >= T) return;
  const H = hexAt(e.x, e.y), top = [H.x + H.r * 0.95, H.y - H.r * 1.05], sr = H.r * 1.05;
  g.save();
  if (e.from && t < FLY) {
    const A = hexAt(e.from.x, e.from.y), u = easeInOut(seg(t, 0, FLY));
    const at = (v) => [lerp(A.x + A.r * 0.95, top[0], v), lerp(A.y - A.r * 1.05, top[1], v) - Math.sin(v * Math.PI) * A.s * 1.1];
    for (let j = 1; j <= (lowQ ? 2 : 5); j++) {
      const [x, y] = at(Math.max(0, u - j * 0.06));
      soot(g, x, y, A.r * (0.6 - j * 0.07), 0.45 - j * 0.06);
      if (!lowQ) dot(g, x, y, 1.5, EMBER, 0.8 - j * 0.12);
    }
    const [x, y] = at(u);
    drawTool(g, "sword", x, y, sr, REDUCED ? 0 : u * TAU * 1.5);
  } else if (!e.from && t < FLY) {
    const k = seg(t, 0, FLY), n = lowQ ? 5 : 10;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + k * 4, r = H.r * (2 * (1 - easeOut3(k)) + 0.2);
      soot(g, top[0] + Math.cos(a) * r, top[1] + Math.sin(a) * r * 0.7, H.r * 0.5, 0.5 * (1 - k * 0.3));
      if (!lowQ) dot(g, top[0] + Math.cos(a + 0.3) * r, top[1] + Math.sin(a + 0.3) * r * 0.7, 1.5, EMBER, 1 - k);
    }
    g.globalAlpha = easeIn2(k); drawTool(g, "sword", top[0], top[1] + (1 - k) * H.r * 0.6, sr, 0); g.globalAlpha = 1;
  }
  if (t >= FLY) {
    const k = seg(t, FLY, T), gl = Math.sin(seg(t, FLY, FLY + 320) * Math.PI);
    g.globalAlpha = 1 - easeIn2(k); drawTool(g, "sword", top[0], top[1], sr, 0); g.globalAlpha = 1;
    g.globalCompositeOperation = "lighter";
    glow(g, top[0], top[1], H.r * 1.3, "220,40,60", 0.5 * gl);
    star4(g, top[0] + sr * 0.55, top[1] - sr * 0.55, H.r * 0.9 * gl, "255,255,255", gl);
    g.globalCompositeOperation = "source-over";
    g.strokeStyle = `rgba(${EMBER},${0.8 * (1 - k)})`; g.lineWidth = 2.5 * (1 - k) + 1;
    g.beginPath(); g.ellipse(H.x, H.y, H.r * (1 + k), H.r * (0.7 + 0.7 * k), 0, 0, TAU); g.stroke();
  }
  g.restore();
}
function maskedFx(g, e, t, now, lowQ) {
  const T = e.dur || SH_FX_DUR.keMasked;
  if (t >= T) return;
  const H = hexAt(e.x, e.y), R = rngOf(e.x * 17 + e.y * 29 + 3), n = lowQ ? 5 : 11;
  if (t < 260) glow(g, H.x, H.y, H.r * (1.2 + t / 260), "255,255,255", 0.9 * (1 - t / 260));
  const fade = 1 - seg(t, T * 0.35, T);
  for (let i = 0; i < n; i++) {
    const a = R() * TAU, sp = 0.6 + R() * 0.6, rise = R(), q = easeOut3(seg(t, i * 18, T * 0.75));
    const d = H.r * (0.2 + 1.3 * q * sp);
    glow(g, H.x + Math.cos(a) * d, H.y + Math.sin(a) * d * 0.75 - q * H.r * 0.5 * rise, H.r * (0.55 + 0.65 * q), "250,250,252", 0.85 * fade);
  }
  glow(g, H.x, H.y, H.r * 1.5, "255,255,255", 0.8 * (1 - seg(t, 450, T)));
  if (!lowQ && !REDUCED) {
    for (let i = 0; i < 8; i++) {
      const ph = ((t / 900) + i / 8) % 1, x = H.x + Math.sin(i * 2.3 + t / 300) * H.r * 1.2, y = H.y + H.r * 0.6 - ph * H.r * 2.4;
      dot(g, x, y, 1.6, "255,255,255", Math.sin(ph * Math.PI) * fade);
    }
  }
}
function tickFx(g, e, t, lowQ) {
  const T = SH_FX_DUR.keTick;
  if (t >= T) return;
  const cx = e.x + 0.5, cy = e.y + 0.5, R = rngOf(e.x * 37 + e.y * 11 + 5), p = t / T;
  g.save();
  gEllipse(g, cx, cy, 0.38, 0.01, 24); g.fillStyle = `rgba(60,0,10,${0.4 * Math.sin(p * Math.PI)})`; g.fill();
  const up = easeOut3(seg(t, 0, 180)) * (1 - easeIn2(seg(t, 380, T)));
  for (let i = 0; i < (lowQ ? 3 : 5); i++) {
    const a = R() * TAU, d = 0.1 + R() * 0.24, h = (0.5 + R() * 0.45) * up, bx = cx + Math.cos(a) * d, by = cy + Math.sin(a) * d;
    if (h < 0.02) continue;
    const B = P(bx, by, 0), Tp = P(bx + Math.cos(a) * 0.08, by + Math.sin(a) * 0.08, h), w = B[2] * 0.05;
    g.beginPath(); g.moveTo(B[0] - w, B[1]); g.lineTo(Tp[0], Tp[1]); g.lineTo(B[0] + w, B[1]); g.closePath();
    g.fillStyle = "rgba(22,4,9,.95)"; g.fill();
    g.strokeStyle = `rgba(${EMBER},.9)`; g.lineWidth = 1; g.stroke();
  }
  const H = P(cx, cy, 0.5);
  if (t < 220) { g.globalCompositeOperation = "lighter"; glow(g, H[0], H[1], H[2] * 0.7, EMBER, 0.6 * (1 - t / 220)); g.globalCompositeOperation = "source-over"; }
  g.restore();
  sootBurst(g, cx, cy, 0.25, seg(t, 60, T), 8, 0.6, e.x * 7 + e.y * 3 + 1, lowQ);
}

// ---------------------------------------------------------------- ร่าเริงสุดๆ (ท่าไม้ตายเอมิลิโกะ)
const CHEER_RGB = { mop: WATER, vase: WATER, vacuum: "200,190,180", sword: EMBER };
function cheerFx(g, e, t, now, lowQ) {
  const T = e.dur || SH_FX_DUR.keCheer, tiles = Array.isArray(e.tiles) ? e.tiles : [];
  if (t >= T || !tiles.length) return;
  const v = DIRV[e.dir] || [0, 1], fade = 1 - seg(t, T - 350, T), col = CHEER_RGB[e.weapon] || WATER;
  g.save();
  for (const tl of tiles) { quad(g, tl.x, tl.y, 0.05); g.fillStyle = `rgba(${col},${0.18 * fade * seg(t, 0, 260)})`; g.fill(); }
  g.restore();
  const src = e.src || { x: tiles[0].x - v[0], y: tiles[0].y - v[1] };
  if (e.weapon === "vase") cheerVase(g, e, t, now, lowQ, tiles, src, v, fade);
  else if (e.weapon === "vacuum") cheerVacuum(g, e, t, now, lowQ, tiles, src, v, fade);
  else if (e.weapon === "sword") cheerSword(g, e, t, now, lowQ, tiles, src, v, fade);
  else cheerMop(g, e, t, now, lowQ, tiles, src, v, fade);
}
// ไม้ถูพื้น: หมุนไม้ถู น้ำวนรอบตัว → คลื่นน้ำกวาดไปตามแนว (ช่องที่คลื่นผ่าน = น้ำกระเซ็น)
function cheerMop(g, e, t, now, lowQ, tiles, src, v, fade) {
  const H = hexAt(src.x, src.y), W0 = CHEER_HIT - 320, W1 = CHEER_HIT + 180;
  if (t < W1) {
    const k = seg(t, 0, 300), out = 1 - seg(t, W0, W1), n = lowQ ? 5 : 11;
    g.save();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + (REDUCED ? 0 : t / 160), r = H.r * 1.5 * k, x = H.x + Math.cos(a) * r, y = H.y + H.r * 0.5 + Math.sin(a) * r * 0.45 - (i % 3) * H.r * 0.25;
      dot(g, x, y, H.r * 0.09, i % 2 ? WATER_HI : WATER, out);
    }
    g.globalAlpha = out;
    drawTool(g, "mop", H.x, H.y - H.r * 1.7, H.r * 0.9, REDUCED ? 0 : t / 90);
    g.restore();
  }
  // คลื่นน้ำกวาดตามแนว
  const sx = src.x + 0.5, sy = src.y + 0.5, px = -v[1], py = v[0];
  const front = (tt) => 0.5 + 4 * easeOut3(seg(tt, W0, W1 + 120));
  if (t >= W0) {
    const f = front(t), a = 0.85 * fade;
    g.save();
    const corner = (d, o) => P(sx + v[0] * d + px * o, sy + v[1] * d + py * o, 0.04);
    const c1 = corner(0.5, -1.5), c2 = corner(f, -1.5), c3 = corner(f, 1.5), c4 = corner(0.5, 1.5);
    g.beginPath(); g.moveTo(c1[0], c1[1]); g.lineTo(c2[0], c2[1]); g.lineTo(c3[0], c3[1]); g.lineTo(c4[0], c4[1]); g.closePath();
    g.fillStyle = `rgba(${WATER},${0.3 * a})`; g.fill();
    // ยอดคลื่น
    for (const [z, w, rgb, al] of [[0.22, 0.2, WATER, 0.8], [0.3, 0.08, "255,255,255", 0.95]]) {
      g.beginPath();
      for (let j = 0; j <= 16; j++) {
        const o = -1.5 + (j / 16) * 3, wob = REDUCED ? 0 : Math.sin(j * 1.3 + t / 70) * 0.06, p = P(sx + v[0] * (f + wob) + px * o, sy + v[1] * (f + wob) + py * o, z);
        if (j) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
      }
      g.strokeStyle = `rgba(${rgb},${al * a})`; g.lineWidth = H.s * w; g.lineCap = "round"; g.stroke();
    }
    g.restore();
  }
  for (const tl of tiles) {
    const d = (tl.x + 0.5 - sx) * v[0] + (tl.y + 0.5 - sy) * v[1], q = 1 - Math.cbrt(1 - clamp01((d - 0.5) / 4));
    const tt = W0 + (W1 + 120 - W0) * q;
    splash(g, tl.x + 0.5, tl.y + 0.5, seg(t, tt, tt + 520), 0.75, tl.x * 13 + tl.y * 7, lowQ);
  }
}
// แจกัน: ยกแจกัน → สายน้ำโค้งพุ่งไปกลางพื้นที่ → น้ำพุระเบิด + คลื่นวงแผ่ + ฝนน้ำตก
function cheerVase(g, e, t, now, lowQ, tiles, src, v, fade) {
  const H = hexAt(src.x, src.y), C = centroid(tiles), J0 = 420, J1 = 760, G0 = CHEER_HIT - 300;
  g.save();
  if (t < J1 + 100) {
    const k = seg(t, 0, 350), a = 1 - seg(t, J1, J1 + 100);
    g.globalAlpha = a;
    glow(g, H.x, H.y - H.r * 1.8, H.r * 1.3 * k, WATER, 0.5);
    drawTool(g, "vase", H.x, H.y - H.r * 1.8 - k * H.r * 0.3, H.r * 0.85, (v[0] || v[1]) * 0.9 * seg(t, 250, J0));
    g.globalAlpha = 1;
  }
  if (t >= J0 && t < G0 + 200) {
    const u1 = easeOut3(seg(t, J0, J1)), u0 = easeIn2(seg(t, J1, G0 + 200));
    const at = (u) => P(lerp(src.x + 0.5, C.x, u), lerp(src.y + 0.5, C.y, u), 0.9 + 1.4 * Math.sin(u * Math.PI));
    for (const [w, rgb, al] of [[0.22, WATER, 0.65], [0.08, WATER_HI, 0.95]]) {
      g.beginPath();
      for (let j = 0; j <= 14; j++) { const p = at(lerp(u0, u1, j / 14)); if (j) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
      g.strokeStyle = `rgba(${rgb},${al})`; g.lineWidth = H.s * w; g.lineCap = "round"; g.stroke();
    }
  }
  // น้ำพุกลางพื้นที่
  const kg = seg(t, G0, G0 + 650);
  if (kg > 0 && kg < 1) {
    const hgt = 2.4 * easeOut3(seg(t, G0, G0 + 260)) * (1 - easeIn2(seg(t, G0 + 380, G0 + 650))), G = P(C.x, C.y, 0), Tp = P(C.x, C.y, Math.max(0.05, hgt)), w = G[2] * 0.7;
    const gr = g.createLinearGradient(G[0], G[1], Tp[0], Tp[1]);
    gr.addColorStop(0, `rgba(${WATER},0.75)`); gr.addColorStop(1, `rgba(${WATER_HI},0.15)`);
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(G[0] - w / 2, G[1]);
    g.quadraticCurveTo(G[0] - w * 0.3, (G[1] + Tp[1]) / 2, Tp[0] - w * 0.12, Tp[1]);
    g.lineTo(Tp[0] + w * 0.12, Tp[1]); g.quadraticCurveTo(G[0] + w * 0.3, (G[1] + Tp[1]) / 2, G[0] + w / 2, G[1]); g.closePath(); g.fill();
    glow(g, Tp[0], Tp[1], w * 0.8, WATER_HI, 0.7 * (1 - kg));
  }
  // คลื่นวงแผ่ทั่วพื้นที่
  const kw = seg(t, G0 + 80, G0 + 700);
  if (kw > 0 && kw < 1) {
    for (let i = 0; i < (lowQ ? 1 : 2); i++) {
      const q = clamp01(kw * 1.2 - i * 0.18);
      g.strokeStyle = `rgba(${i ? WATER : WATER_HI},${0.9 * (1 - q)})`; g.lineWidth = 4 * (1 - q) + 1;
      gEllipse(g, C.x, C.y, 0.3 + 2.4 * easeOut3(q), 0.03, 40); g.stroke();
    }
  }
  for (const tl of tiles) {
    const d = Math.hypot(tl.x + 0.5 - C.x, tl.y + 0.5 - C.y), tt = G0 + 80 + d * 140;
    splash(g, tl.x + 0.5, tl.y + 0.5, seg(t, tt, tt + 520), 0.8, tl.x * 17 + tl.y * 5, lowQ);
  }
  // ฝนน้ำตกกลับ
  if (!lowQ && t > G0 + 250) {
    const R = rngOf(77), xs = tiles.map((q) => q.x), ys = tiles.map((q) => q.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs) + 1, y0 = Math.min(...ys), y1 = Math.max(...ys) + 1;
    for (let i = 0; i < 18; i++) {
      const st = G0 + 250 + R() * 400, q = seg(t, st, st + 450), x = lerp(x0, x1, R()), y = lerp(y0, y1, R());
      if (q <= 0 || q >= 1) continue;
      const [px, py, s] = P(x, y, 2.2 * (1 - q * q));
      dot(g, px, py, s * 0.03, WATER_HI, 0.9 * fade);
    }
  }
  g.restore();
}
// เครื่องดูดฝุ่น: น้ำวนลมหน้าตัว + ลมดูดจากทุกช่องเข้าหา + ฝุ่นหมุนเข้า
function cheerVacuum(g, e, t, now, lowQ, tiles, src, v, fade) {
  const V = { x: src.x + 0.5 + v[0] * 0.75, y: src.y + 0.5 + v[1] * 0.75 }, on = seg(t, 80, 360) * fade, boost = 0.6 + 0.4 * seg(t, CHEER_HIT - 400, CHEER_HIT);
  if (on <= 0.01) return;
  const H = hexAt(src.x, src.y), spin = REDUCED ? 0 : t / 110;
  g.save(); g.lineCap = "round";
  g.globalAlpha = on; drawTool(g, "vacuum", H.x + v[0] * H.r * 0.8, H.y + H.r * 0.2, H.r * 0.75, 0); g.globalAlpha = 1;
  for (let arm = 0; arm < 3; arm++) {
    g.beginPath();
    for (let j = 0; j <= 22; j++) {
      const u = j / 22, r = 1.7 * (1 - u) * boost + 0.08, a = arm * TAU / 3 + u * 4.2 + spin, p = P(V.x + Math.cos(a) * r, V.y + Math.sin(a) * r, 0.3 + 0.25 * u);
      if (j) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
    }
    g.strokeStyle = `rgba(225,232,240,${0.55 * on})`; g.lineWidth = H.s * 0.05; g.stroke();
  }
  for (const tl of tiles) {
    const ph = REDUCED ? 0.5 : ((t / 520) + ((tl.x * 7 + tl.y * 13) % 10) / 10) % 1, c = [tl.x + 0.5, tl.y + 0.5];
    const A = P(lerp(c[0], V.x, ph), lerp(c[1], V.y, ph), 0.3), B = P(lerp(c[0], V.x, Math.min(1, ph + 0.18)), lerp(c[1], V.y, Math.min(1, ph + 0.18)), 0.3);
    g.strokeStyle = `rgba(210,215,225,${0.7 * on * (1 - ph)})`; g.lineWidth = 2;
    g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke();
  }
  if (!lowQ) {
    for (let i = 0; i < 26; i++) {
      const ph = REDUCED ? (i / 26) : ((t / 900) + i / 26) % 1, r = 2.3 * (1 - ph) + 0.05, a = i * 2.4 + ph * 5 + spin * 0.5;
      const [x, y, s] = P(V.x + Math.cos(a) * r, V.y + Math.sin(a) * r, 0.2 + 0.4 * ph);
      dot(g, x, y, s * 0.028, i % 4 ? DUST : "230,225,215", on * Math.sin(ph * Math.PI));
    }
  }
  const [vx, vy, vs] = P(V.x, V.y, 0.45);
  g.globalCompositeOperation = "lighter"; glow(g, vx, vy, vs * 0.5 * boost, "200,225,255", 0.5 * on); g.globalCompositeOperation = "source-over";
  g.restore();
}
// ดาบเขม่า: ดาบก่อตัวเหนือหัว → ฟันเสี้ยวจันทร์ดำขอบแดง 4 ครั้งกวาดทั่วพื้นที่
function cheerSword(g, e, t, now, lowQ, tiles, src, v, fade) {
  const H = hexAt(src.x, src.y), C = centroid(tiles), S0 = CHEER_HIT - 350;
  g.save();
  if (t < S0 + 120) {
    const k = seg(t, 0, S0), a = 1 - seg(t, S0, S0 + 120), n = lowQ ? 4 : 9;
    for (let i = 0; i < n; i++) { const an = (i / n) * TAU + k * 4, r = H.r * (2 * (1 - easeOut3(k)) + 0.3); soot(g, H.x + Math.cos(an) * r, H.y - H.r * 1.8 + Math.sin(an) * r * 0.6, H.r * 0.5, 0.5 * a); }
    g.globalAlpha = easeIn2(k) * a; drawTool(g, "sword", H.x, H.y - H.r * 1.8, H.r * 1.1, 0); g.globalAlpha = 1;
  }
  const base = Math.atan2(v[1], v[0]), O = { x: C.x - v[0] * 1.3, y: C.y - v[1] * 1.3 };
  for (let i = 0; i < 4; i++) {
    const t0 = S0 + i * 150, k = seg(t, t0, t0 + 380);
    if (k <= 0 || k >= 1) continue;
    const dirS = i % 2 ? -1 : 1, a0 = base - 1.1 * dirS, a1 = base + 1.1 * dirS, head = easeOut3(Math.min(1, k * 1.7)), tail = easeIn2(k);
    const R1 = 2.0 + i * 0.12, n = 18, outer = [], inner = [];
    for (let j = 0; j <= n; j++) {
      const u = lerp(tail, head, j / n), a = lerp(a0, a1, u), th = Math.sin((j / n) * Math.PI) * 0.4;
      outer.push(P(O.x + Math.cos(a) * (R1 + th * 0.4), O.y + Math.sin(a) * (R1 + th * 0.4), 0.45));
      inner.push(P(O.x + Math.cos(a) * (R1 - th), O.y + Math.sin(a) * (R1 - th), 0.45));
    }
    g.beginPath(); outer.forEach((p, j) => (j ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    for (let j = inner.length - 1; j >= 0; j--) g.lineTo(inner[j][0], inner[j][1]);
    g.closePath(); g.fillStyle = `rgba(10,3,7,${0.92 * (1 - k)})`; g.fill();
    g.beginPath(); outer.forEach((p, j) => (j ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.strokeStyle = `rgba(225,40,56,${1 - k})`; g.lineWidth = 2.5; g.stroke();
  }
  for (const tl of tiles) {
    const k = seg(t, S0 + 120, S0 + 900);
    if (k <= 0 || k >= 1) continue;
    quad(g, tl.x, tl.y, 0.08); g.fillStyle = `rgba(${EMBER},${0.3 * Math.sin(k * Math.PI * 4) ** 2 * (1 - k)})`; g.fill();
  }
  g.restore();
  sootBurst(g, C.x, C.y, 0.4, seg(t, CHEER_HIT - 80, CHEER_HIT + 600), 14, 1.6, 61, lowQ);
}
// ไม้ถูพื้นพุ่งตาม: คลื่นน้ำตามทาง + น้ำกระจายปลายทาง (ตัวเลื่อนเองตาม slide ของ iceFx)
function cheerDashFx(g, e, t, now, lowQ) {
  const T = e.dur || SH_FX_DUR.keCheerDash, RUN = 300;
  if (t >= T) return;
  const A = e.from, B = e.to, k = easeOut3(seg(t, 0, RUN)), fade = 1 - seg(t, RUN, T);
  const a0 = P(A.x + 0.5, A.y + 0.5, 0.03), a1 = P(lerp(A.x, B.x, k) + 0.5, lerp(A.y, B.y, k) + 0.5, 0.03);
  g.save(); g.lineCap = "round";
  g.strokeStyle = `rgba(${WATER},${0.45 * fade})`; g.lineWidth = a1[2] * 0.75; g.beginPath(); g.moveTo(a0[0], a0[1]); g.lineTo(a1[0], a1[1]); g.stroke();
  g.strokeStyle = `rgba(255,255,255,${0.7 * fade})`; g.lineWidth = a1[2] * 0.08; g.stroke();
  g.restore();
  const L = Math.max(1, Math.round(Math.hypot(B.x - A.x, B.y - A.y)));
  for (let i = 1; i <= L; i++) {
    const u = i / L, tt = RUN * (1 - Math.cbrt(1 - u));
    splash(g, lerp(A.x, B.x, u) + 0.5, lerp(A.y, B.y, u) + 0.5, seg(t, tt, tt + 480), i === L ? 1.1 : 0.6, i * 31 + 5, lowQ);
  }
}

// ---------------------------------------------------------------- เหตุการณ์ iceFx ของเอมิลิโกะ
function wetFx(g, e, t, lowQ) {
  const T = SH_FX_DUR.keWet;
  if (t < 0 || t >= T) return;
  const cx = e.x + 0.5, cy = e.y + 0.5, q = easeOut3(seg(t, 0, 420));
  g.save();
  gEllipse(g, cx, cy, 0.08 + 0.38 * q, 0.01, 26); g.fillStyle = `rgba(${WATER},${0.4 * (1 - seg(t, 300, T))})`; g.fill();
  g.restore();
  splash(g, cx, cy, seg(t, 0, 560), 0.7, e.x * 29 + e.y * 13 + 1, lowQ);
}
function dryFx(g, e, t, lowQ) {
  const T = SH_FX_DUR.keDry;
  if (t < 0 || t >= T) return;
  const cx = e.x + 0.5, cy = e.y + 0.5, k = easeOut3(seg(t, 0, 340)), a = 1 - seg(t, 260, 480);
  g.save(); g.lineCap = "round";
  if (a > 0) {
    g.beginPath();
    for (let j = 0; j <= 12; j++) { const u = (j / 12) * k, p = P(cx - 0.4 + 0.8 * u, cy + 0.18 - Math.sin(u * Math.PI) * 0.3, 0.03); if (j) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
    const p0 = P(cx, cy);
    g.strokeStyle = `rgba(235,245,255,${0.65 * a})`; g.lineWidth = p0[2] * 0.2; g.stroke();
    g.strokeStyle = `rgba(255,255,255,${0.9 * a})`; g.lineWidth = p0[2] * 0.05; g.stroke();
  }
  const R = rngOf(e.x * 11 + e.y * 19 + 3);
  for (let i = 0; i < (lowQ ? 2 : 5); i++) {
    const st = 220 + R() * 200, q = seg(t, st, st + 280), [x, y, s] = P(cx + (R() - 0.5) * 0.7, cy + (R() - 0.5) * 0.7, 0.1 + R() * 0.3);
    if (q > 0 && q < 1) star4(g, x, y, s * 0.11 * Math.sin(q * Math.PI), i % 2 ? "255,255,255" : "255,240,180", 1);
  }
  g.restore();
}
function mopHitFx(g, e, t, lowQ) {
  const T = SH_FX_DUR.keMopHit;
  if (t >= T) return;
  const dmg = Math.max(1, Math.min(4, e.dmg | 0 || 1)), cx = e.x + 0.5, cy = e.y + 0.5, [sx, sy, s] = P(cx, cy, 0.55), k = seg(t, 0, T);
  g.save();
  if (t < 200) { g.globalCompositeOperation = "lighter"; glow(g, sx, sy, s * (0.8 + 0.2 * dmg), WATER_HI, 0.9 * (1 - t / 200)); g.globalCompositeOperation = "source-over"; }
  if (!lowQ) {
    const R = rngOf(e.x * 23 + e.y * 41 + dmg);
    for (let i = 0; i < 6 + dmg; i++) {
      const a = R() * TAU, d = (0.2 + R() * 0.45) * easeOut3(k), [x, y, ss] = P(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 0.3 + k * (0.6 + R()));
      bubble(g, x, y, ss * (0.05 + R() * 0.04), 1 - k);
    }
  }
  g.restore();
  splash(g, cx, cy, k, 0.75 + dmg * 0.12, e.x * 3 + e.y * 5 + dmg, lowQ, 0.2);
}
function wetTrailFx(g, e, t, lowQ) {
  const pts = Array.isArray(e.path) ? e.path : [];
  if (pts.length < 2) return;
  const step = e.step || 62, run = (pts.length - 1) * step, head = Math.min(pts.length - 1, t / step), fade = t > run ? seg(t, run, run + 520) : 0;
  if (fade >= 1) return;
  const posAt = (f) => { const i = Math.max(0, Math.min(pts.length - 2, Math.floor(f))), k = clamp01(f - i); return [lerp(pts[i].x, pts[i + 1].x, k) + 0.5, lerp(pts[i].y, pts[i + 1].y, k) + 0.5]; };
  const [hx, hy] = posAt(head), [tx, ty] = posAt(Math.max(0, head - 2.5)), a0 = P(tx, ty, 0.02), a1 = P(hx, hy, 0.02);
  g.save(); g.lineCap = "round";
  const gr = g.createLinearGradient(a0[0], a0[1], a1[0], a1[1]);
  gr.addColorStop(0, `rgba(${WATER},0)`); gr.addColorStop(1, `rgba(${WATER},${0.6 * (1 - fade)})`);
  g.strokeStyle = gr; g.lineWidth = a1[2] * 0.4; g.beginPath(); g.moveTo(a0[0], a0[1]); g.lineTo(a1[0], a1[1]); g.stroke();
  g.strokeStyle = `rgba(255,255,255,${0.75 * (1 - fade)})`; g.lineWidth = a1[2] * 0.06; g.stroke();
  g.restore();
  for (let i = 1; i < pts.length; i++) {
    const at = i * step - step * 0.5;
    splash(g, pts[i].x + 0.5, pts[i].y + 0.5, seg(t, at, at + 460), 0.45, i * 97 + pts[i].x * 13 + pts[i].y, lowQ);
  }
}

// ---------------------------------------------------------------- ตีปกติ (byStyle) — t = 0..1 · e { x, y, size, to, toSize }
function atkGeo(e) {
  const A = bodyAt(e.x, e.y, e.size || 1), B = bodyAt(e.to.x, e.to.y, e.toSize || 1), n = Math.max(1, e.toSize | 0);
  const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1;
  return { A, B, ux: dx / L, uy: dy / L, L, tc: { x: e.to.x + n / 2, y: e.to.y + n / 2 }, n };
}
// ไม้ถูพื้น: เหวี่ยงไม้ถูโค้งข้ามหัวฟาดลงเป้า → น้ำกระเซ็น + ฟอง
function mopAtk(g, e, t, now, lowQ) {
  const HIT = SH_HIT_P.keMop, { A, B, tc, n } = atkGeo(e), side = B.x >= A.x ? 1 : -1;
  if (t < HIT + 0.14) {
    const u = easeIn2(seg(t, 0.08, HIT)), x = lerp(A.x, B.x, u), y = lerp(A.y - A.r * 1.2, B.y - B.r * 0.4, u) - Math.sin(u * Math.PI) * A.s * 0.9;
    const a = t > HIT ? 1 - seg(t, HIT, HIT + 0.14) : seg(t, 0, 0.08);
    if (!lowQ) for (let i = 1; i <= 5; i++) {
      const u2 = Math.max(0, u - i * 0.06), x2 = lerp(A.x, B.x, u2), y2 = lerp(A.y - A.r * 1.2, B.y - B.r * 0.4, u2) - Math.sin(u2 * Math.PI) * A.s * 0.9;
      dot(g, x2 - side * A.r * 0.4, y2 + A.r * 0.5, A.r * 0.07, WATER_HI, a * (1 - i * 0.16));
    }
    g.save(); g.globalAlpha = a; drawTool(g, "mop", x, y, A.r * 1.15, side * lerp(-1.2, 1.0, u)); g.restore();
  }
  if (t >= HIT) {
    const k = seg(t, HIT, 1);
    if (k < 0.3) { g.save(); g.globalCompositeOperation = "lighter"; glow(g, B.x, B.y, B.r * 1.6, WATER_HI, 0.8 * (1 - k / 0.3)); g.restore(); }
    splash(g, tc.x, tc.y, k, 0.9 * n, Math.round(tc.x * 7 + tc.y * 3), lowQ, 0.15);
    if (!lowQ) { const R = rngOf(19); for (let i = 0; i < 6; i++) bubble(g, B.x + (R() - 0.5) * B.r * 2, B.y + B.r * 0.4 - k * B.r * (1 + R() * 1.5), B.r * (0.12 + R() * 0.1), 1 - k); }
  }
}
// แจกัน: ยกแจกันเทน้ำ → สายน้ำพุ่งใส่เป้า → ระเบิดน้ำพุ่งไปข้างหน้า (รู้สึกถูกผลัก)
function vaseAtk(g, e, t, now, lowQ) {
  const HIT = SH_HIT_P.keVase, { A, B, ux, uy, tc, n } = atkGeo(e), side = ux >= 0 ? 1 : -1;
  const mouth = [A.x + ux * A.r * 0.6, A.y - A.r * 1.1];
  if (t < 0.4) {
    const k = seg(t, 0, 0.2), a = 1 - seg(t, 0.32, 0.4);
    g.save(); g.globalAlpha = a; drawTool(g, "vase", A.x + ux * A.r * 0.2, A.y - A.r * 1.3 - k * A.r * 0.3, A.r * 0.85, side * 1.1 * seg(t, 0.1, 0.3)); g.restore();
  }
  if (t >= 0.22 && t < HIT + 0.25) {
    const u1 = easeOut3(seg(t, 0.22, HIT)), u0 = easeIn2(seg(t, HIT, HIT + 0.25)), px = -uy, py = ux;
    const at = (u) => [lerp(mouth[0], B.x, u) + px * Math.sin(u * 9 - now / 40) * A.r * 0.08, lerp(mouth[1], B.y, u) + py * Math.sin(u * 9 - now / 40) * A.r * 0.08 - Math.sin(u * Math.PI) * A.s * 0.35];
    g.save(); g.lineCap = "round";
    for (const [w, rgb, al] of [[0.5, WATER, 0.55], [0.2, WATER_HI, 0.95]]) {
      g.beginPath();
      for (let j = 0; j <= 14; j++) { const p = at(lerp(u0, u1, j / 14)); if (j) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
      g.strokeStyle = `rgba(${rgb},${al})`; g.lineWidth = A.r * w; g.stroke();
    }
    g.restore();
  }
  if (t >= HIT) {
    const k = seg(t, HIT, 1), q = easeOut3(k), R = rngOf(37);
    g.save();
    if (k < 0.3) { g.globalCompositeOperation = "lighter"; glow(g, B.x, B.y, B.r * 1.8, WATER_HI, 0.85 * (1 - k / 0.3)); g.globalCompositeOperation = "source-over"; }
    g.strokeStyle = `rgba(${WATER_HI},${0.9 * (1 - k)})`; g.lineWidth = 4 * (1 - k) + 1;
    g.beginPath(); g.ellipse(B.x + ux * B.r * 0.9 * q, B.y + uy * B.r * 0.5 * q, B.r * (0.6 + 1.4 * q), B.r * (0.35 + 0.8 * q), Math.atan2(uy, ux), 0, TAU); g.stroke();
    const cnt = lowQ ? 8 : 20, ang = Math.atan2(uy, ux);
    for (let i = 0; i < cnt; i++) {
      const a = ang + (R() - 0.5) * 1.7, d = B.r * (0.5 + R() * 2.4) * q, x = B.x + Math.cos(a) * d, y = B.y + Math.sin(a) * d * 0.7 - Math.sin(k * Math.PI) * B.r * (0.4 + R()) + k * k * B.r;
      dot(g, x, y, B.r * (0.07 + R() * 0.06) * (1 - k * 0.4), i % 3 ? WATER_HI : WATER, 1 - k * k);
    }
    g.restore();
    splash(g, tc.x, tc.y, k, 1.0 * n, 211, lowQ, 0.1);
  }
}
// เครื่องดูดฝุ่น: กรวยลมดูดจากหัวดูดถึงเป้า · วงลมวิ่งเข้าหาตัว · ฝุ่นไหลเข้า → เป้าโดนดูด
function vacuumAtk(g, e, t, now, lowQ) {
  const HIT = SH_HIT_P.keVacuum, { A, B, ux, uy } = atkGeo(e), on = seg(t, 0.05, 0.22) * (1 - seg(t, 0.85, 1));
  if (on <= 0.01) return;
  const N = [A.x + ux * A.r * 0.9, A.y + uy * A.r * 0.5 + A.r * 0.15], px = -uy, py = ux;
  g.save();
  g.globalAlpha = on; drawTool(g, "vacuum", A.x - ux * A.r * 0.1, A.y + A.r * 0.2, A.r * 0.7, 0); g.globalAlpha = 1;
  const gr = g.createLinearGradient(N[0], N[1], B.x, B.y);
  gr.addColorStop(0, `rgba(210,222,236,${0.4 * on})`); gr.addColorStop(1, `rgba(210,222,236,${0.06 * on})`);
  g.beginPath();
  g.moveTo(N[0] + px * A.r * 0.15, N[1] + py * A.r * 0.15); g.lineTo(B.x + px * B.r * 1.0, B.y + py * B.r * 1.0);
  g.lineTo(B.x - px * B.r * 1.0, B.y - py * B.r * 1.0); g.lineTo(N[0] - px * A.r * 0.15, N[1] - py * A.r * 0.15); g.closePath();
  g.fillStyle = gr; g.fill();
  const rings = lowQ ? 2 : 4;
  for (let i = 0; i < rings; i++) {
    const ph = REDUCED ? (i + 0.5) / rings : ((t * 2.4) + i / rings) % 1, x = lerp(B.x, N[0], ph), y = lerp(B.y, N[1], ph), r = lerp(B.r * 0.95, A.r * 0.2, ph);
    g.strokeStyle = `rgba(235,242,255,${0.8 * on * Math.sin(ph * Math.PI)})`; g.lineWidth = 2;
    g.beginPath(); g.ellipse(x, y, Math.max(1, r * 0.35), Math.max(1, r), Math.atan2(uy, ux), 0, TAU); g.stroke();
  }
  if (!lowQ) {
    const R = rngOf(71);
    for (let i = 0; i < 16; i++) {
      const j0 = R(), jo = (R() - 0.5) * 2, ph = REDUCED ? j0 : ((t * 1.7) + j0) % 1, q = easeIn2(ph);
      dot(g, lerp(B.x + px * jo * B.r, N[0], q), lerp(B.y + py * jo * B.r, N[1], q), A.r * 0.06, i % 3 ? DUST : "235,230,220", on * Math.sin(ph * Math.PI));
    }
  }
  if (t >= HIT) {
    const k = seg(t, HIT, 1);
    g.globalCompositeOperation = "lighter"; glow(g, B.x, B.y, B.r * 1.5, "230,240,255", 0.8 * (1 - k)); g.globalCompositeOperation = "source-over";
    g.strokeStyle = `rgba(220,228,240,${0.9 * (1 - k)})`; g.lineWidth = 2.5;
    g.beginPath(); g.arc(B.x, B.y, B.r * (1.4 - 0.9 * k), (REDUCED ? 0 : t * 20), (REDUCED ? 0 : t * 20) + 4.2); g.stroke();
  }
  g.restore();
}
// ดาบเขม่า (เอมิลิโกะ): แสงคมดาบวิ่งไปหาเป้า → ฟันเสี้ยวจันทร์ดำขอบแดงไขว้ 2 ครั้ง + เขม่าแตก
function crescent(g, x, y, R, a0, a1, k, w) {
  const n = 16, outer = [], inner = [];
  for (let j = 0; j <= n; j++) {
    const u = j / n, a = lerp(a0, lerp(a0, a1, easeOut3(k)), u), th = Math.sin(u * Math.PI) * w;
    outer.push([x + Math.cos(a) * (R + th * 0.3), y + Math.sin(a) * (R + th * 0.3) * 0.7]);
    inner.push([x + Math.cos(a) * (R - th), y + Math.sin(a) * (R - th) * 0.7]);
  }
  g.beginPath(); outer.forEach((p, j) => (j ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  for (let j = n; j >= 0; j--) g.lineTo(inner[j][0], inner[j][1]);
  g.closePath();
  return outer;
}
function swordAtk(g, e, t, now, lowQ) {
  const HIT = SH_HIT_P.keSword, { A, B, tc, n } = atkGeo(e);
  g.save(); g.lineCap = "round";
  if (t < HIT) {
    const u = easeIn2(seg(t, 0.12, HIT)), k0 = seg(t, 0, 0.3);
    if (k0 < 1) for (let i = 0; i < (lowQ ? 3 : 6); i++) { const a = i / 6 * TAU + k0 * 3, r = A.r * (1.8 * (1 - k0) + 0.3); soot(g, A.x + Math.cos(a) * r, A.y + Math.sin(a) * r * 0.6, A.r * 0.5, 0.5 * (1 - k0)); }
    const x0 = lerp(A.x, B.x, Math.max(0, u - 0.25)), y0 = lerp(A.y, B.y, Math.max(0, u - 0.25)), x1 = lerp(A.x, B.x, u), y1 = lerp(A.y, B.y, u);
    g.strokeStyle = "rgba(8,2,6,.95)"; g.lineWidth = A.r * 0.22; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.strokeStyle = `rgba(${EMBER},.95)`; g.lineWidth = Math.max(1, A.r * 0.06); g.stroke();
    star4(g, x1, y1, A.r * 0.35, "255,230,230", seg(t, 0.12, 0.2));
  } else {
    for (let s = 0; s < 2; s++) {
      const k = seg(t, HIT + s * 0.1, HIT + s * 0.1 + 0.4);
      if (k <= 0 || k >= 1) continue;
      const a0 = s ? -0.4 : -2.6, a1 = s ? 2.0 : -0.2, fade = 1 - seg(k, 0.4, 1);
      crescent(g, B.x, B.y, B.r * 1.5, a0, a1, Math.min(1, k * 2), B.r * 0.4);
      g.fillStyle = `rgba(10,3,7,${0.95 * fade})`; g.fill();
      const outer = crescent(g, B.x, B.y, B.r * 1.5, a0, a1, Math.min(1, k * 2), B.r * 0.4);
      g.beginPath(); outer.forEach((p, j) => (j ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
      g.strokeStyle = `rgba(230,40,56,${fade})`; g.lineWidth = 2.5; g.stroke();
    }
  }
  g.restore();
  if (t >= HIT) sootBurst(g, tc.x, tc.y, 0.45 * n, seg(t, HIT, 1), 10, 0.8 * n, 83, lowQ);
}
// เคท: แขนเขม่ายืดไปหาเป้า กรงเล็บกาง → ข่วน 3 รอยดำแดง + เขม่าแตก → แขนหดกลับ
function kateAtk(g, e, t, now, lowQ) {
  const HIT = SH_HIT_P.keKate, { A, B, tc, n } = atkGeo(e), side = B.x >= A.x ? 1 : -1;
  const hand = [A.x + side * A.r * 0.7, A.y + A.r * 0.1];
  let k;
  if (t < HIT) k = easeOut3(seg(t, 0.06, HIT));
  else k = 1 - easeIn2(seg(t, HIT + 0.15, 1));
  if (k > 0.02) {
    const tip = [lerp(hand[0], B.x - side * B.r * 0.6, 1), B.y - B.r * 0.4];
    const pts = whipPts(hand, tip, k, A.s * 0.5, A.s * 0.1 * (1 - seg(t, HIT - 0.12, HIT)), REDUCED ? 0 : now / 70, 18);
    drawWhip(g, pts, A.s * 0.17, A.s * 0.1, 1, lowQ);
    // กรงเล็บที่ปลาย
    const p1 = pts[pts.length - 1], p0 = pts[Math.max(0, pts.length - 3)], ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), open = t < HIT ? 0.55 : 0.2;
    g.save(); g.lineCap = "round"; g.strokeStyle = "rgba(8,2,6,.95)"; g.lineWidth = Math.max(1.5, A.s * 0.04);
    for (let f = -1; f <= 1; f++) {
      const a = ang + f * open, L = A.s * 0.26;
      g.beginPath(); g.moveTo(p1[0], p1[1]); g.quadraticCurveTo(p1[0] + Math.cos(a) * L * 0.7, p1[1] + Math.sin(a) * L * 0.7, p1[0] + Math.cos(a + f * 0.3 + 0.35 * side) * L, p1[1] + Math.sin(a + f * 0.3 + 0.35 * side) * L); g.stroke();
    }
    g.restore();
  }
  if (t >= HIT) {
    const k2 = seg(t, HIT, HIT + 0.12), fade = 1 - seg(t, HIT + 0.2, 1);
    g.save(); g.lineCap = "round";
    for (let c = 0; c < 3; c++) {
      const off = (c - 1) * B.r * 0.45, x0 = B.x - side * B.r * 0.9 + off, y0 = B.y - B.r * 0.9, x1 = B.x + side * B.r * 0.8 + off, y1 = B.y + B.r * 0.8;
      const ex = lerp(x0, x1, easeOut3(k2)), ey = lerp(y0, y1, easeOut3(k2));
      for (const [w, col] of [[0.16, `rgba(8,2,6,${fade})`], [0.06, `rgba(230,40,56,${fade})`]]) {
        g.strokeStyle = col; g.lineWidth = Math.max(1, B.s * w);
        g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + ex) / 2 + side * B.r * 0.2, (y0 + ey) / 2 - B.r * 0.15, ex, ey); g.stroke();
      }
    }
    g.restore();
    sootBurst(g, tc.x, tc.y, 0.45 * n, seg(t, HIT, 1), 11, 0.8 * n, 47, lowQ);
  }
}

// ---------------------------------------------------------------- ปีกค้าง: เคทยืนในม่านแดงของตัวเอง (u.wings — players[].shadow.inStorm)
//  กางปีกตลอด (หายใจ/กระพือช้าๆ · ขนนกเขม่าร่วงทีละเส้น) วาดหลังหมาก ตามตัวไปทุกที่ · ออกจากม่าน/ม่านหมด = ปีกหุบสลาย
//  ระหว่างฉากบิน (keWings) ไม่วาดซ้ำ — ลงในม่านแดง = ปีกของฉากบินไม่สลาย ส่งต่อให้ปีกค้างเลย
const IDLE_OPEN = 420, IDLE_FOLD = 520;
const idleW = new Map(); // id → { on, t } (t = เวลาที่เปลี่ยนสถานะล่าสุด)
function idleState(u, now) {
  const on = !!u.wings;
  let s = idleW.get(u.id);
  if (!s) {
    if (idleW.size > 64) idleW.clear();
    s = { on, t: now - 1e5 }; // เห็นครั้งแรก (เข้าห้องกลางม่าน) = กางเต็มทันที
    idleW.set(u.id, s);
  } else if (s.on !== on) { s.on = on; s.t = now; }
  return s.on || now - s.t < IDLE_FOLD ? s : null;
}
function flyingNow(fx, id, now) {
  for (const e of fx) {
    if (!e || e.kind !== "keWings" || e.id !== id || !okT(e.from) || !okT(e.to)) continue;
    const t = now - e.t0, pl = wingsPlan(e);
    if (t >= 0 && t < (e.keep ? pl.t4 : pl.t5)) return true;
  }
  return false;
}
// ความลึกของชั้นปีกค้างของหมาก u (null = ไม่วาด) — เรียกทุกหมากทุกเฟรม (อัปเดตสถานะกาง/หุบด้วย)
export function idleWingsDepth(u, fx, now) {
  if (!u || u.id == null || !idleState(u, now)) return null;
  if (Array.isArray(fx) && flyingNow(fx, u.id, now)) return null;
  return depthOf(u.rx + 0.5 + (u.ox || 0), u.ry + 0.5 + (u.oy || 0)) - 0.004;
}
export function drawIdleWings(g, u, now, lowQ) {
  const s = idleW.get(u.id);
  if (!s) return;
  const k = s.on ? seg(now - s.t, 0, IDLE_OPEN) : 1, fold = s.on ? 0 : seg(now - s.t, 0, IDLE_FOLD);
  if (fold >= 1) return;
  const H = hexAt(u.rx + (u.ox || 0), u.ry + (u.oy || 0), u.hz || 0);
  const alpha = (u.alpha == null ? 1 : u.alpha) * (1 - easeIn2(fold));
  if (alpha <= 0.01) return;
  const breath = REDUCED ? 0 : Math.sin(now / 950), spread = s.on ? Math.max(0, easeOutBack(k)) : 1 - 0.35 * fold;
  const flap = lerp(1.3, 0.62, easeOut3(k)) + 0.1 * breath + 0.6 * easeIn2(fold);
  const L = H.s * WING_L * 0.92 * spread * (1 + 0.02 * breath), sy = H.y - H.r * 0.3;
  if (!lowQ) glow(g, H.x, H.y, H.r * 2.3, "70,0,14", 0.24 * alpha * Math.min(1, spread));
  wing(g, H.x - H.r * 0.3, sy, L, flap, -1, alpha, now, lowQ, fold);
  wing(g, H.x + H.r * 0.3, sy, L, flap, 1, alpha, now, lowQ, fold);
  if (lowQ || REDUCED) return;
  // ขนนกเขม่าร่วงจากปลายปีกทีละเส้น
  for (let i = 0; i < 3; i++) {
    const ph = ((now / 2600) + i / 3) % 1, side = i % 2 ? 1 : -1, u0 = 0.55 + 0.35 * ((i * 0.37) % 1);
    const x = H.x + side * (H.r * 0.3 + L * u0) + Math.sin(now / 400 + i) * H.r * 0.25, y = sy - L * 0.15 + ph * H.s * 1.3;
    looseFeather(g, x, y, now / 520 + i, H.s * 0.15, Math.sin(ph * Math.PI) * 0.85 * alpha);
  }
}

// ---------------------------------------------------------------- ทางเข้า (boardDraw / BoardCanvas)
// ชั้นหลังตัวละคร (ปีกเขม่า): ความลึกของชั้นนี้ (null = ไม่มี) — boardDraw ใส่เข้าคิวเรียงความลึกก่อนหมากของเคท
export function shadowBackDepth(e, now) {
  if (!e || e.kind !== "keWings" || !okT(e.from) || !okT(e.to)) return null;
  const t = now - e.t0, pl = wingsPlan(e);
  if (t < 0 || t > pl.t5) return null;
  const p = katePose(e, t, pl);
  return depthOf(p.x + 0.5, p.y + 0.5) - 0.004;
}
// วาดเอฟเฟกต์ 1 ชิ้น · back = ชั้นหลังตัวละคร (เฉพาะปีก · units = หมากที่วาด — เคทยังอยู่ในม่านแดง = ปีกไม่สลายตอนลง)
export function shadowFx(g, e, now, lowQ, back = false, units = null) {
  if (!e) return;
  const t = now - e.t0 - (e.delay | 0);
  if (t < 0) return;
  if (back) {
    if (e.kind !== "keWings" || !okT(e.from) || !okT(e.to)) return;
    if (Array.isArray(units)) e.keep = units.some((u) => u && u.id === e.id && u.wings);
    wingsBack(g, e, t, now, lowQ);
    return;
  }
  const ms = SH_MS[e.kind];
  if (ms) {
    if (!e.to) return;
    const p = t / ms;
    if (p >= 1) return;
    if (e.kind === "keMop") mopAtk(g, e, p, now, lowQ);
    else if (e.kind === "keVase") vaseAtk(g, e, p, now, lowQ);
    else if (e.kind === "keVacuum") vacuumAtk(g, e, p, now, lowQ);
    else if (e.kind === "keSword") swordAtk(g, e, p, now, lowQ);
    else if (e.kind === "keKate") kateAtk(g, e, p, now, lowQ);
    return;
  }
  switch (e.kind) {
    case "keWings": if (okT(e.from) && okT(e.to)) wingsFront(g, e, t, now, lowQ); break;
    case "keWhip":
      if (!okT(e.from) || !okT(e.to)) break;
      if (e.mode === "dash") whipDashFx(g, e, t, now, lowQ); else whipPullFx(g, e, t, now, lowQ);
      break;
    case "keMirror": if (okT(e.from) && okT(e.to)) mirrorFx(g, e, t, now, lowQ); break;
    case "keRevive": reviveFx(g, e, t, now, lowQ); break;
    case "keWeapon": weaponFx(g, e, t, now, lowQ); break;
    case "keSwordPass": swordPassFx(g, e, t, now, lowQ); break;
    case "keMasked": maskedFx(g, e, t, now, lowQ); break;
    case "keCheer": cheerFx(g, e, t, now, lowQ); break;
    case "keCheerDash": if (okT(e.from) && okT(e.to)) cheerDashFx(g, e, t, now, lowQ); break;
    case "keTick": tickFx(g, e, t, lowQ); break;
    case "keWet": wetFx(g, e, t, lowQ); break;
    case "keDry": dryFx(g, e, t, lowQ); break;
    case "keMopHit": mopHitFx(g, e, t, lowQ); break;
    case "keWetTrail": wetTrailFx(g, e, t, lowQ); break;
    default:
  }
}
// ท่าของหมากที่ฉากกำลังย้าย (บิน/ถูกดึง/พุ่ง/ฟื้น) — { x, y, hz, sq?, alpha?, fly? } | null · list = fx ที่กำลังเล่น (มี t0)
export function shadowPose(list, id, now) {
  if (id == null || !Array.isArray(list)) return null;
  for (const e of list) {
    if (!e || typeof e.kind !== "string" || !e.kind.startsWith("ke")) continue;
    const t = now - e.t0;
    if (t < 0 || t >= (e.dur || SH_FX_DUR[e.kind] || 0)) continue;
    if (e.kind === "keWings" && okT(e.from) && okT(e.to)) {
      const pl = wingsPlan(e);
      if (e.id === id) { const p = katePose(e, t, pl); return { ...p, fly: p.hz > 0.05 }; }
      if (e.carry && e.carry.id === id && okT(e.carry.from) && okT(e.carry.to)) { const p = carryPose(e, t, pl); return { ...p, fly: p.hz > 0.05 }; }
    } else if (e.kind === "keWhip" && okT(e.from) && okT(e.to)) {
      if (e.mode === "dash" && e.by === id) return dashPose(e, t);
      if (e.mode !== "dash" && e.mover === id) return pullPose(e, t);
    } else if (e.kind === "keRevive" && e.id === id) return revivePose(e, t);
  }
  return null;
}

// ---------------------------------------------------------------- socket "shadowFx" → fx
//  ctx = { posOf(id) → {x,y}|null (ตำแหน่งล่าสุดที่รู้), idsOn(tiles, ownerId) → [id ศัตรูบนช่อง] }
//  คืน { fx, sfx: [[คีย์เสียง, ms]], look: [[{x,y}, ms]], shake: [ms], busy: [{ id, ms }] (ตัวที่ฉากขยับเอง), later: [[ms, fx[]]] }
//  เสียงส่วนใหญ่ server เล่นเอง (skillSound / engine.sfx) — ที่นี่เล่นเฉพาะที่ server ไม่เล่น (ke_storm_tick)
//  "storm" (ฉากท่าไม้ตายเคท + ม่านแดง) ไม่อยู่ในไฟล์นี้
export function shadowEventFx(ev, ctx = {}) {
  const out = { fx: [], sfx: [], look: [], shake: [], busy: [], later: [] };
  if (!ev || typeof ev !== "object") return out;
  const posOf = (id) => { if (id == null || typeof ctx.posOf !== "function") return null; const p = ctx.posOf(id); return okT(p) ? ptOf(p) : null; };
  const idsOn = (tiles, owner) => (typeof ctx.idsOn === "function" ? ctx.idsOn(tiles, owner) || [] : []);
  const pts = (list) => (Array.isArray(list) ? list.filter(okT).map(ptOf) : []);
  switch (ev.kind) {
    case "wings": {
      if (!okT(ev.from) || !okT(ev.to)) break;
      const c = ev.carry && ev.carry.id != null && okT(ev.carry.from) && okT(ev.carry.to) ? { id: ev.carry.id, from: ptOf(ev.carry.from), to: ptOf(ev.carry.to) } : null;
      const e = { kind: "keWings", id: ev.id, from: ptOf(ev.from), to: ptOf(ev.to), dir: ev.dir || null, carry: c }, pl = wingsPlan(e);
      e.dur = pl.t5 + 900; // ขนนก/ควันปลิวต่อหลังปีกสลาย
      out.fx.push(e);
      out.look.push([e.from, 0], [e.to, pl.t2]);
      out.shake.push(pl.t4);
      out.busy.push({ id: ev.id, ms: pl.t5 });
      if (c) out.busy.push({ id: c.id, ms: pl.t5 });
      break;
    }
    case "whip": {
      if (!okT(ev.from) || !okT(ev.to)) break;
      const from = ptOf(ev.from), to = ptOf(ev.to);
      if (ev.mode === "dash") {
        const hitAt = okT(ev.hitAt) ? ptOf(ev.hitAt) : null, hitMs = WD.gather + WD.zip + WD.lash;
        const e = { kind: "keWhip", mode: "dash", by: ev.by, target: ev.target, from, to, hitAt, dodge: !!ev.dodge, dur: whipDashDur(!!hitAt) };
        if (hitAt && !ev.dodge && ev.target != null) { e.hitIds = [ev.target]; e.hitDelay = hitMs; }
        out.fx.push(e);
        out.look.push([hitAt || to, 0]);
        if (hitAt && !ev.dodge) out.shake.push(hitMs);
        if (hitAt && ev.dodge) out.later.push([hitMs, [{ kind: "float", x: hitAt.x, y: hitAt.y, text: "หลบ", size: 26 }]]);
        if (ev.by != null) out.busy.push({ id: ev.by, ms: e.dur });
      } else {
        const e = { kind: "keWhip", mode: "pull", by: ev.by, mover: ev.target, src: posOf(ev.by), from, to, dur: SH_FX_DUR.keWhip };
        out.fx.push(e);
        out.look.push([to, 0]);
        if (ev.target != null) out.busy.push({ id: ev.target, ms: e.dur });
      }
      break;
    }
    case "mirror": {
      const a = okT(ev.at) ? ptOf(ev.at) : posOf(ev.from), b = posOf(ev.to);
      if (!a || !b) break;
      out.fx.push({ kind: "keMirror", from: a, to: b, dur: SH_FX_DUR.keMirror });
      out.look.push([b, MR.rise]);
      break;
    }
    case "revive": {
      const at = okT(ev.at) ? ptOf(ev.at) : posOf(ev.id);
      if (!at) break;
      out.fx.push({ kind: "keRevive", id: ev.id, x: at.x, y: at.y, dur: SH_FX_DUR.keRevive });
      out.look.push([at, 0]);
      break;
    }
    case "weapon": {
      const at = posOf(ev.id);
      if (!at) break;
      out.fx.push({ kind: "keWeapon", x: at.x, y: at.y, weapon: ev.weapon || "mop", dur: SH_FX_DUR.keWeapon });
      break;
    }
    case "sword": {
      const holder = ev.holder != null ? ev.holder : ev.id, at = posOf(holder);
      if (!at) break;
      const from = ev.from != null && ev.from !== holder ? posOf(ev.from) : null;
      out.fx.push({ kind: "keSwordPass", x: at.x, y: at.y, from, dur: SH_FX_DUR.keSwordPass });
      break;
    }
    case "masked": {
      const at = posOf(ev.id);
      if (!at) break;
      out.fx.push({ kind: "keMasked", x: at.x, y: at.y, dur: SH_FX_DUR.keMasked });
      break;
    }
    case "cheer": {
      const tiles = pts(ev.tiles), src = posOf(ev.id);
      if (!tiles.length) break;
      const hit = idsOn(tiles, ev.id);
      out.fx.push({ kind: "keCheer", id: ev.id, weapon: ev.weapon || "mop", dir: ev.dir, tiles, src, dur: SH_FX_DUR.keCheer, ...(hit.length ? { hitIds: hit, hitDelay: CHEER_HIT } : {}) });
      const c = centroid(tiles);
      out.look.push([{ x: Math.floor(c.x), y: Math.floor(c.y) }, 0]);
      out.shake.push(CHEER_HIT);
      break;
    }
    case "cheerDash": {
      if (!okT(ev.from) || !okT(ev.to)) break;
      out.fx.push({ kind: "keCheerDash", from: ptOf(ev.from), to: ptOf(ev.to), dur: SH_FX_DUR.keCheerDash });
      break;
    }
    case "stormTick": {
      for (const h of Array.isArray(ev.hits) ? ev.hits : []) {
        const at = h && posOf(h.id);
        if (!at) continue;
        out.fx.push({ kind: "keTick", x: at.x, y: at.y, hitIds: [h.id], hitDelay: 120, dur: SH_FX_DUR.keTick });
        if (!out.look.length) out.look.push([at, 0]);
      }
      if (out.fx.length) { out.sfx.push(["ke_storm_tick", 0]); out.shake.push(120); }
      break;
    }
    default:
  }
  return out;
}
// เหตุการณ์ iceFx ของเอมิลิโกะ → fx (ช่องทยอยทีละนิด)
export const wetTileFx = (tiles) => tiles.map((t, i) => { const delay = Math.min(i * 45, 600); return { kind: "keWet", x: t.x, y: t.y, delay, dur: SH_FX_DUR.keWet + delay }; });
export const dryTileFx = (tiles) => tiles.map((t, i) => { const delay = Math.min(i * 55, 600); return { kind: "keDry", x: t.x, y: t.y, delay, dur: SH_FX_DUR.keDry + delay }; });
