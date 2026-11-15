// ============================================================
//  เอฟเฟกต์บนกระดานของ Master (characters/master.js · GRID_PLAN §7.34) — "อลังการ ทุกท่า" (ผู้ใช้ 2026-11-15)
//  หน้าตาอิงคลิปที่ผู้ใช้อัดจากเกม: เกราะดำขอบเรืองนีออนเขียว · ออร่าเขียวลุกรอบตัว · ดาบคู่ยาวแบบเข็ม
//   Twin Sword Slam = กอหนามคริสตัลผุดจากพื้นไล่เป็นคลื่น · Knockdown Slash = ใบดาบพลังงานโปร่งแสงกวาดระนาบกว้าง
//   ตอนลง = ดาวตกเขียว → โดมพองออก + วงแหวนขาวทั้งสนาม + ประกายสายฟ้า · เฟส 2 (Holy) = ทองขาว + รัศมี + ปีกแสง
//
//  ตัวบนกระดาน (drawMasterUnit — แทนหมาก): ภาพตัวเต็ม หายใจ/ลอยเบาๆ · ท่าตามเหตุการณ์ล่าสุด (POSE) · ออร่าหลังตัว
//   ตัวอัญเชิญใช้ตัววาดเดียวกัน (เล็กกว่า · ออร่าตามชนิด)
//  เหตุการณ์ socket "masterFx" → useCharSocketFx → pushFx({ kind: masterLand | masterRevive | … })
//  ท่าตีปกติ (ฮุค attackStyle): masterSlash / masterSlash2 / master_undead / master_raider / master_blessed / master_crusader
//  หมอกพิษ/หลุมดำที่ค้างบนกระดาน: drawElemFields (state.board.elemFields)
// ============================================================
import { P, gEllipse } from "./boardGeo";

const TAU = Math.PI * 2;
const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const rgba = (rgb, a) => `rgba(${rgb},${clamp01(a)})`;
const easeOut = (t) => 1 - Math.pow(1 - clamp01(t), 3);
const easeIn = (t) => Math.pow(clamp01(t), 2.2);
const env = (p, a, b, c, d) => (p < a || p > d ? 0 : p < b ? (p - a) / (b - a || 1) : p <= c ? 1 : 1 - (p - c) / (d - c || 1));
const hash = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// สีประจำเฟส: neon = ขอบเรือง · core = แกนขาว · deep = ออร่าเข้ม
const PAL = {
  1: { neon: "120,255,140", core: "235,255,235", deep: "20,150,70", spark: "190,250,255", crystal: "130,255,160" },
  2: { neon: "255,224,130", core: "255,252,235", deep: "210,150,40", spark: "255,255,220", crystal: "255,240,180" },
};
const VIOLET = "150,80,255", VOID = "20,8,36", WHITE = "255,255,255", DARKC = "20,70,35";
const palOf = (ph) => PAL[ph === 2 ? 2 : 1];

// จังหวะ (ms) — server characters/master.js T (วินาที) ต้องตรงกัน
export const MASTER_T = { slam: 1250, knock: 1000, knock2: 850, smite: 1500, smite2: 1100, land: 2400, revive: 3200, summon: 1600 };
// ท่าตีปกติ (STYLE_MS / STYLE_HIT_P — boardFxBasic.js)
export const MASTER_MS = { masterSlash: 900, masterSlash2: 900, master_undead: 700, master_blessed: 800, master_raider: 650, master_crusader: 650 };
export const MASTER_HIT_P = { masterSlash: 0.42, masterSlash2: 0.42, master_undead: 0.45, master_blessed: 0.5, master_raider: 0.55, master_crusader: 0.55 };
export const MASTER_FX_DUR = {
  ...MASTER_MS,
  masterLand: MASTER_T.land + 900, masterRevive: MASTER_T.revive + 600, masterDown: 1600, masterDeath: 2600,
  masterSummon: MASTER_T.summon + 900, masterSlam: MASTER_T.slam + 1700, masterKnock: MASTER_T.knock + 700,
  masterSmite: MASTER_T.smite + 900, masterRise: 1400,
};
export const isMasterFx = (kind) => typeof kind === "string" && kind in MASTER_FX_DUR;

// ---------- พื้นฐานการวาด ----------
function glow(g, x, y, r, rgb, a, core) {
  if (!(a > 0) || !(r > 0)) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(core || rgb, a));
  gr.addColorStop(0.35, rgba(rgb, a * 0.7));
  gr.addColorStop(1, rgba(rgb, 0));
  g.fillStyle = gr;
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}
const add = (g, fn) => { const o = g.globalCompositeOperation; g.globalCompositeOperation = "lighter"; fn(); g.globalCompositeOperation = o; };
function ring(g, wx, wy, r, z, rgb, a, w) {
  if (!(a > 0) || !(r > 0)) return;
  gEllipse(g, wx, wy, r, z, 48); g.strokeStyle = rgba(rgb, a); g.lineWidth = Math.max(1, w); g.stroke();
}
// สายฟ้าซิกแซก (จอ) — แกนขาว + ขอบสี
function bolt(g, x0, y0, x1, y1, seed, jit, w, a, rgb) {
  if (!(a > 0)) return;
  const n = 9, dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const pts = [[x0, y0]];
  for (let i = 1; i < n; i++) {
    const u = i / n, off = (hash(seed + i * 3.7) - 0.5) * 2 * jit * Math.sin(u * Math.PI);
    pts.push([x0 + dx * u + nx * off, y0 + dy * u + ny * off]);
  }
  pts.push([x1, y1]);
  g.save(); g.lineJoin = "round"; g.lineCap = "round";
  add(g, () => {
    for (const [col, ww, aa] of [[rgb, w * 3.4, 0.3], [rgb, w * 1.7, 0.75], [WHITE, w * 0.65, 1]]) {
      g.strokeStyle = rgba(col, a * aa); g.lineWidth = Math.max(1, ww);
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.stroke();
    }
  });
  g.restore();
}
// กอหนามคริสตัล: ผลึกแหลม 4–6 แท่งเฉียงออกจากจุดบนพื้น (สูง h ช่อง)
function crystalCluster(g, wx, wy, h, rgb, a, seed, big) {
  if (!(a > 0) || !(h > 0.02)) return;
  const n = big ? 8 : 6;
  // ฐานเรืองใต้กอ (ให้เห็นชัดบนพื้นสว่าง)
  { const [gx0, gy0, gs0] = P(wx, wy, 0.05); add(g, () => glow(g, gx0, gy0, gs0 * (big ? 0.85 : 0.65), rgb, a * 0.65, WHITE)); }
  for (let i = 0; i < n; i++) {
    const r1 = hash(seed + i * 1.7), r2 = hash(seed + i * 4.1);
    const lean = (r1 - 0.5) * 0.9, hh = h * (0.55 + r2 * 0.6) * (i === 0 ? 1.25 : 1);
    const bx = wx + (r2 - 0.5) * 0.45, by = wy + (r1 - 0.5) * 0.35;
    const [ax, ay, s] = P(bx, by, 0);
    const [tx, ty] = P(bx + lean * 0.35, by, hh);
    const wd = s * (big ? 0.2 : 0.16) * (0.7 + r1 * 0.6);
    // ผลึก: สองหน้า (สว่าง/มืด) + ขอบเรือง
    g.fillStyle = rgba(rgb === PAL[2].crystal ? "130,95,30" : DARKC, a * 0.75);
    g.beginPath(); g.moveTo(ax - wd, ay); g.lineTo(tx, ty); g.lineTo(ax, ay + wd * 0.35); g.closePath(); g.fill();
    g.fillStyle = rgba(rgb, a * 0.9);
    g.beginPath(); g.moveTo(ax + wd, ay); g.lineTo(tx, ty); g.lineTo(ax, ay + wd * 0.35); g.closePath(); g.fill();
    g.strokeStyle = rgba(WHITE, a); g.lineWidth = 2;
    g.beginPath(); g.moveTo(ax - wd, ay); g.lineTo(tx, ty); g.lineTo(ax + wd, ay); g.stroke();
  }
  const [gx, gy, gs] = P(wx, wy, h * 0.3);
  add(g, () => glow(g, gx, gy, gs * (big ? 0.9 : 0.65), rgb, a * 0.5, WHITE));
}
// เศษกระจาย (สะเก็ดผลึก/หิน) จากจุด
function shards(g, wx, wy, q, rgb, a, seed, n, spread) {
  for (let i = 0; i < n; i++) {
    const h = hash(seed + i), an = h * TAU, d = q * spread * (0.4 + hash(seed + i * 9) * 0.8);
    const z = Math.max(0, Math.sin(q * Math.PI) * (0.6 + h * 1.4));
    const [x, y, s] = P(wx + Math.cos(an) * d, wy + Math.sin(an) * d * 0.8, z);
    g.fillStyle = rgba(i % 3 ? rgb : WHITE, a * (1 - q));
    g.save(); g.translate(x, y); g.rotate(an + q * 8); g.fillRect(-s * 0.035, -s * 0.012, s * 0.07, s * 0.024); g.restore();
  }
}
const center = (e) => { const n = Math.max(1, e.size | 0); return [e.x + n / 2, e.y + n / 2, n]; };

// ============================================================
//  ท่าของตัว (ใช้ตอนวาดตัว) — เหตุการณ์ล่าสุดของแต่ละ id
// ============================================================
const POSE = new Map();
export function masterPose(id, kind, dir, ms) {
  if (!id) return;
  if (POSE.size > 40) POSE.clear();
  POSE.set(id, { kind, dir: DIRS[dir] || null, t0: performance.now(), ms: ms || 1200 });
}
function poseOf(id, now) {
  const p = POSE.get(id);
  if (!p) return null;
  const q = (typeof window !== "undefined" && window.__mfxAt != null ? window.__mfxAt : now - p.t0) / p.ms;
  if (q < 0 || q > 1) return null;
  return { ...p, q };
}

const imgs = {};
function imgOf(url) {
  if (!url) return null;
  if (!imgs[url] && typeof Image === "function") { const im = new Image(); im.decoding = "async"; im.src = url; imgs[url] = im; }
  const im = imgs[url];
  return im && im.complete && im.naturalWidth > 0 ? im : null;
}
export const preloadMaster = (urls) => { for (const u of urls || []) imgOf(u); };

const track = new Map();
function faceOf(u, sx, now) {
  let tr = track.get(u.id);
  if (!tr) { if (track.size > 40) track.clear(); tr = { sx, face: -1, moveT: -1e9, frame: now }; track.set(u.id, tr); }
  if (tr.frame !== now) {
    if (Math.abs(sx - tr.sx) > 0.3) { tr.face = sx > tr.sx ? 1 : -1; tr.moveT = now; }
    tr.sx = sx; tr.frame = now;
  }
  return tr;
}

// ออร่าหลังตัว (ก่อนวาดภาพ): เปลวเขียว/ทองลุกขึ้นรอบตัว + วงพื้นเรือง + ประกายสายฟ้า (เฟส 1) / รัศมี + ละอองแสง (เฟส 2)
function auraBack(g, wx, wy, n, H, ph, now, lowQ, scale, down) {
  const C = palOf(ph), t = REDUCED ? 0 : now;
  const pulse = 0.75 + 0.25 * Math.sin(t / 260);
  const R = 0.62 * n * scale;
  // วงพื้นเรือง
  g.save();
  gEllipse(g, wx, wy, R * 1.05, 0.01, 40); g.fillStyle = rgba(C.neon, (down ? 0.08 : 0.2) * pulse); g.fill();
  ring(g, wx, wy, R * (1 + 0.06 * Math.sin(t / 180)), 0.02, C.neon, 0.7 * pulse * (down ? 0.3 : 1), 2);
  if (down) { g.restore(); return; }
  const [bx, by, s] = P(wx, wy, 0);
  add(g, () => {
    glow(g, bx, by - H * 0.45, H * 0.62, C.deep, 0.45 * pulse, C.neon);
    // เปลวลุก: ลิ้นไฟสูงต่ำรอบขอบตัว
    const tongues = lowQ ? 7 : 14;
    for (let i = 0; i < tongues; i++) {
      const h = hash(i * 7.3 + n), ph2 = (t / (700 + h * 500) + h) % 1;
      const xo = (h - 0.5) * H * 0.85, base = by - H * (0.05 + hash(i + 3) * 0.55);
      const len = H * (0.18 + 0.22 * Math.sin(ph2 * Math.PI)), w = s * 0.09 * scale * (0.6 + h);
      const tx = bx + xo + Math.sin(t / 300 + i) * w, ty = base - len;
      const gr = g.createLinearGradient(0, base, 0, ty);
      gr.addColorStop(0, rgba(C.neon, 0.55 * (1 - ph2 * 0.5))); gr.addColorStop(1, rgba(C.neon, 0));
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(bx + xo - w, base); g.quadraticCurveTo(bx + xo - w * 0.4, base - len * 0.5, tx, ty); g.quadraticCurveTo(bx + xo + w * 0.4, base - len * 0.5, bx + xo + w, base); g.closePath(); g.fill();
    }
    if (ph === 2) {
      // รัศมี (halo) เหนือหัว + ละอองแสงลอยขึ้น
      const hy = by - H * 1.02;
      g.strokeStyle = rgba(C.neon, 0.85 * pulse); g.lineWidth = Math.max(2, s * 0.03);
      g.beginPath(); g.ellipse(bx, hy, H * 0.16, H * 0.05, 0, 0, TAU); g.stroke();
      glow(g, bx, hy, H * 0.22, C.neon, 0.35 * pulse, WHITE);
      for (let i = 0; i < (lowQ ? 6 : 14); i++) {
        const h = hash(i * 3.1 + 9), q = (t / 2200 + h) % 1;
        glow(g, bx + (h - 0.5) * H * 0.9, by - q * H * 1.2, s * 0.05, C.neon, 0.8 * (1 - q), WHITE);
      }
    }
  });
  // ประกายสายฟ้าฟ้าขาวรอบตัว (แบบภาพตัว) — เฟส 1 เป็นช่วงๆ
  if (ph === 1 && !lowQ && !REDUCED) {
    for (let i = 0; i < 3; i++) {
      if (((t / 110 + i * 5) | 0) % 7 !== 0) continue;
      const a0 = hash(((t / 110) | 0) + i) * TAU, r0 = H * 0.42;
      bolt(g, bx + Math.cos(a0) * r0, by - H * 0.5 + Math.sin(a0) * r0 * 0.9, bx + Math.cos(a0 + 0.7) * r0 * 1.05, by - H * 0.5 + Math.sin(a0 + 0.7) * r0, (t / 110) | 0, s * 0.08, 1.4, 0.8, C.spark);
    }
  }
  g.restore();
}

// ---------- แขนที่ขยับได้ (ตัดจากภาพตอนวาด — ท่า Twin Sword Slam ฟาดดาบคู่ลงพื้นจริง) ----------
//  พิกัดในภาพต้นฉบับ (px) · poly = ส่วนแขน+ดาบ · pivot = ไหล่ · up = มุมเงื้อ (เรเดียน · บวก = ตามเข็ม) · down = มุมฟาดลงพื้น
//  ภาพเฟส 1 = master.webp (1058×651 ต้นฉบับ) · เฟส 2 = master2.webp (1244×668) — ไฟล์ที่ใช้ย่อเป็นสูง 720 สัดส่วนเดิม
const ARMS = {
  1: { iw: 1058, ih: 651, parts: [
    { poly: [[480, 232], [602, 232], [602, 382], [562, 402], [500, 442], [380, 442], [60, 472], [0, 497], [0, 470], [350, 372], [468, 322]], pivot: [548, 250], up: 1.75, down: -0.55 },
    { poly: [[848, 248], [1002, 248], [1008, 322], [962, 472], [898, 478], [758, 422], [698, 398], [718, 368], [848, 330]], pivot: [905, 272], up: -1.95, down: 0.55 },
  ] },
  2: { iw: 1244, ih: 668, parts: [
    { poly: [[352, 248], [472, 248], [472, 442], [400, 448], [330, 422], [60, 482], [0, 499], [0, 484], [300, 400], [358, 368]], pivot: [420, 292], up: 1.75, down: -0.55 },
    { poly: [[788, 228], [884, 228], [884, 332], [832, 472], [762, 562], [640, 562], [618, 540], [728, 420], [758, 330]], pivot: [832, 262], up: -1.95, down: 0.55 },
  ] },
};
// มุมแขนตามจังหวะท่า slam (q ของ pose · ต้องตรงกับ twinSwords / slamFx): เงื้อ 0–0.62 · ฟาด 0.62–0.78 · ค้าง → คืน 0.9–1
function armAngle(q, part) {
  if (q < 0.62) return part.up * easeOut(q / 0.62);
  if (q < 0.78) return part.up + (part.down - part.up) * easeIn((q - 0.62) / 0.16);
  if (q < 0.9) return part.down;
  return part.down * (1 - clamp01((q - 0.9) / 0.1));
}
// วาดภาพแบบแยกชิ้น: ลำตัว (ตัดส่วนแขนออก) แล้วแขนแต่ละข้างหมุนรอบไหล่ · ox/oy/W/H = กรอบภาพบนจอ (ในพิกัดที่หมุน/กลับด้านแล้ว)
function drawCutImage(g, im, ox, oy, W, H, arms, q) {
  const sx = W / arms.iw, sy = H / arms.ih;
  const pathOf = (poly) => { g.beginPath(); poly.forEach(([x, y], i) => (i ? g.lineTo(ox + x * sx, oy + y * sy) : g.moveTo(ox + x * sx, oy + y * sy))); g.closePath(); };
  // ลำตัว: ทั้งภาพลบส่วนแขน (evenodd)
  g.save();
  g.beginPath(); g.rect(ox - 2, oy - 2, W + 4, H + 4);
  for (const part of arms.parts) part.poly.forEach(([x, y], i) => (i ? g.lineTo(ox + x * sx, oy + y * sy) : g.moveTo(ox + x * sx, oy + y * sy)));
  g.clip("evenodd");
  g.drawImage(im, ox, oy, W, H);
  g.restore();
  // แขน: หมุนรอบไหล่
  for (const part of arms.parts) {
    const a = armAngle(q, part), px = ox + part.pivot[0] * sx, py = oy + part.pivot[1] * sy;
    g.save();
    g.translate(px, py); g.rotate(a); g.translate(-px, -py);
    pathOf(part.poly); g.clip();
    g.drawImage(im, ox, oy, W, H);
    g.restore();
  }
}

// วาดตัวแทนหมาก → { cx, top, bottom, left, right } (ภาพยังไม่โหลด = undefined → drawUnit วาดหกเหลี่ยมชั่วคราว)
//  u.master = { phase, down, summon } · u.standee = url
export function drawMasterUnit(g, u, now, wx, wy, liftZ = 0) {
  const m = u.master || {};
  const im = imgOf(u.standee);
  if (!im) return undefined;
  const n = Math.max(1, u.size | 0);
  // wx/wy ที่ drawUnit ส่งมา = กลางช่องมุมบนซ้าย → ย้ายไปกลางกล่อง n×n (ตัว 2×2 ยืนกลาง 4 ช่องพอดี)
  wx += (n - 1) / 2; wy += (n - 1) / 2;
  const boss = !m.summon;
  const ph = boss ? (m.phase === 2 ? 2 : 1) : (m.summon === "blessed" || m.summon === "crusader" ? 2 : 1);
  const t = REDUCED ? 0 : now;
  let z = Math.max(0, liftZ), dx = 0, dy = 0, rot = 0, sq = 1, flash = 0, lean = 0;
  const pose = poseOf(u.id, now);
  if (pose) {
    const q = pose.q, d = pose.dir || [0, 0];
    if (pose.kind === "lunge") { const k = q < 0.25 ? -q / 0.25 * 0.15 : q < 0.45 ? -0.15 + (q - 0.25) / 0.2 * 0.6 : 0.45 * (1 - (q - 0.45) / 0.55); dx = d[0] * k; dy = d[1] * k; }
    else if (pose.kind === "slam") {
      // กระโดดสูง (เอนหลังเงื้อดาบ) → พุ่งลงพร้อมโน้มตัวไปข้างหน้าฟาดดาบ → ยุบตัวตอนกระแทก
      const up = q < 0.62 ? Math.sin(clamp01(q / 0.62) * Math.PI * 0.5) * 1.6 : Math.max(0, 1.6 * (1 - easeIn((q - 0.62) / 0.16)));
      z += up;
      lean = q < 0.62 ? -0.18 * Math.sin(clamp01(q / 0.62) * Math.PI * 0.5) : q < 0.78 ? -0.18 + 0.46 * easeIn((q - 0.62) / 0.16) : 0.28 * (1 - clamp01((q - 0.86) / 0.14));
      if (q > 0.78 && q < 0.92) sq = 1 - 0.2 * Math.sin((q - 0.78) / 0.14 * Math.PI);
      flash = 0.55 * env(q, 0.76, 0.79, 0.84, 0.95);
    }
    else if (pose.kind === "raise") { z += Math.sin(Math.min(1, q * 1.6) * Math.PI * 0.5) * 0.45 * (q < 0.85 ? 1 : (1 - q) / 0.15); flash = env(q, 0.2, 0.35, 0.7, 0.9) * 0.6; }
    else if (pose.kind === "roar") { dx = (hash(t / 30) - 0.5) * 0.06; sq = 1 + 0.06 * Math.sin(q * Math.PI); flash = env(q, 0, 0.1, 0.5, 0.8) * 0.5; }
    else if (pose.kind === "land") { z += q < 0.42 ? (1 - easeIn(q / 0.42)) * 14 : 0; if (q >= 0.42 && q < 0.55) sq = 1 - 0.22 * Math.sin((q - 0.42) / 0.13 * Math.PI); flash = env(q, 0.4, 0.43, 0.5, 0.65); }
    else if (pose.kind === "revive") { z += Math.sin(Math.min(1, q * 1.3) * Math.PI * 0.5) * 0.5 * (1 - easeIn((q - 0.7) / 0.3)); flash = env(q, 0.3, 0.45, 0.6, 0.9); }
    else if (pose.kind === "hurt") { dx = (hash(t / 20) - 0.5) * 0.08; }
  }
  const [bx, by, s] = P(wx + dx, wy + dy, z);
  const tr = faceOf(u, P(wx, wy)[0], now);
  if (pose && pose.dir && pose.dir[0]) tr.face = pose.dir[0]; // หันตามทิศที่ปล่อยท่า (ค้างไว้จนเดิน)
  const H = s * (boss ? 1.5 + n * 0.62 : 1.3) * (u.k || 1) * sq, W = (H * im.naturalWidth) / im.naturalHeight / sq;
  const breathe = REDUCED ? 0 : Math.sin(t / 520 + n) * 0.018;
  const scale = boss ? 1 : 0.6;
  // เงาใต้ตัว (เล็กลงตามความสูง)
  if (liftZ <= 0.05) { const k = 1 / (1 + z * 0.35); gEllipse(g, wx + dx + 0.04, wy + dy + 0.05, 0.45 * n * scale * k, 0, 28); g.fillStyle = `rgba(0,0,0,${0.35 * k})`; g.fill(); }
  // dev: window.__mfxFoot = true → กรอบช่องที่ตัวยืน (ตรวจว่ายืนตรงช่อง)
  if (typeof window !== "undefined" && window.__mfxFoot) {
    const x0 = wx - n / 2, y0 = wy - n / 2, c = [P(x0, y0), P(x0 + n, y0), P(x0 + n, y0 + n), P(x0, y0 + n)];
    g.save(); g.strokeStyle = "#ff2fd0"; g.lineWidth = 3; g.beginPath(); c.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke(); g.restore();
  }
  auraBack(g, wx + dx, wy + dy, n, H, ph, now, u.lowQ, scale, !!m.down);
  g.save();
  const foot = by; // เท้ายืนกลางกล่อง n×n
  g.translate(bx, foot);
  if (m.down) rot = -0.5;
  rot += lean * (tr.face > 0 ? 1 : -1); // โน้มไปทางที่หัน (ภาพเดิมหันซ้าย)
  g.rotate(rot);
  // ภาพต้นฉบับหันซ้าย (ดาบชี้ซ้าย) — เดินไปทางขวา = กลับด้าน
  g.scale(tr.face > 0 ? -1 : 1, 1 + breathe);
  if (!u.lowQ) { g.shadowColor = rgba(palOf(ph).neon, m.down ? 0.2 : 0.85); g.shadowBlur = boss ? 18 : 10; }
  if (m.down) g.filter = "grayscale(0.85) brightness(0.55)";
  // ภาพ Master มีออร่าใต้เท้า ~9% ของความสูง — เลื่อนลงให้เท้าจริงอยู่ที่จุดยืน
  const pad = boss ? H * 0.09 : 0;
  // ลำตัวไม่อยู่กลางภาพ (ดาบยื่นซ้าย · เฟส 2 มีปีกขวา) — จุดยึด = กลางขาในภาพ (สัดส่วนความกว้าง)
  const ax = boss ? (ph === 2 ? 0.47 : 0.67) : 0.5;
  const slamQ = pose && pose.kind === "slam" && boss ? pose.q : null;
  if (slamQ != null && ARMS[ph]) drawCutImage(g, im, -W * ax, -H + pad, W, H, ARMS[ph], slamQ); // ฟาดดาบคู่: แขนหมุนจริง
  else g.drawImage(im, -W * ax, -H + pad, W, H);
  g.filter = "none"; g.shadowBlur = 0;
  if (flash > 0) { add(g, () => glow(g, 0, -H * 0.45, H * 0.75, palOf(ph).neon, flash, WHITE)); }
  g.restore();
  return { cx: bx, top: foot - H + (boss ? H * 0.09 : 0), bottom: foot, left: bx - W * 0.5, right: bx + W * 0.5 };
}

// ============================================================
//  เหตุการณ์ครั้งเดียว
// ============================================================
export function masterFx(g, e, now, lowQ) {
  const dur = e.dur || MASTER_FX_DUR[e.kind];
  // dev (MasterFxDev): window.__mfxAt = ms → ค้างเฟรมที่เวลานั้นของทุกเหตุการณ์ (ตรวจภาพ)
  const ms = typeof window !== "undefined" && window.__mfxAt != null ? window.__mfxAt : now - e.t0, p = ms / dur;
  if (p < 0 || p > 1) return;
  const seed = ((e.t0 | 0) % 977) / 7;
  g.save();
  switch (e.kind) {
    case "masterLand": landFx(g, e, ms, seed, lowQ); break;
    case "masterRevive": reviveFx(g, e, ms, seed, lowQ); break;
    case "masterDown": downFx(g, e, p, seed); break;
    case "masterDeath": deathFx(g, e, p, seed, lowQ); break;
    case "masterSummon": summonFx(g, e, ms, seed, lowQ); break;
    case "masterSlam": slamFx(g, e, ms, seed, lowQ); break;
    case "masterKnock": knockFx(g, e, ms, seed, lowQ); break;
    case "masterSmite": smiteFx(g, e, ms, seed, lowQ); break;
    case "masterRise": riseFx(g, e, p, seed); break;
    default:
      if (e.kind in MASTER_MS) {
        // ตัวผู้ตีพุ่งแทง (ท่าของตัว) — ตั้งครั้งเดียวต่อเหตุการณ์
        if (e.by && !e._posed && e.to) {
          e._posed = true;
          const ddx = e.to.x - e.x, ddy = e.to.y - e.y;
          masterPose(e.by, "lunge", Math.abs(ddx) >= Math.abs(ddy) ? (ddx >= 0 ? "right" : "left") : (ddy >= 0 ? "down" : "up"), dur);
        }
        strikeFx(g, e, p, seed, lowQ);
      }
  }
  g.restore();
}

// ---------- ลงจากฟ้า: ดาวตก → กระแทก → โดม → วงแหวนทั้งสนาม ----------
function landFx(g, e, ms, seed, lowQ) {
  const [wx, wy, n] = center(e), C = palOf(1);
  const T = MASTER_T.land, hit = T * 0.42;
  // เครื่องหมายบนพื้นก่อนตก (วงแดงเขียวหดเข้า)
  if (ms < hit) {
    const q = ms / hit;
    ring(g, wx, wy, n * (1.6 - q * 0.9), 0.02, C.neon, 0.4 + 0.5 * q, 3);
    ring(g, wx, wy, n * 0.6, 0.02, WHITE, 0.3 * q, 2);
    // ดาวตก: หัวเรืองลงจากฟ้า + หางยาว
    const z = (1 - easeIn(q)) * 16;
    const [hx, hy, hs] = P(wx, wy, z), [tx, ty] = P(wx + 0.6, wy - 1.2, z + 5);
    add(g, () => {
      const gr = g.createLinearGradient(hx, hy, tx, ty);
      gr.addColorStop(0, rgba(C.core, 0.95)); gr.addColorStop(0.3, rgba(C.neon, 0.6)); gr.addColorStop(1, rgba(C.neon, 0));
      g.strokeStyle = gr; g.lineWidth = hs * 0.5 * n; g.lineCap = "round";
      g.beginPath(); g.moveTo(hx, hy); g.lineTo(tx, ty); g.stroke();
      glow(g, hx, hy, hs * 0.9 * n, C.neon, 0.95, WHITE);
    });
    return;
  }
  const q = (ms - hit) / (T * 1.4 - hit + 900);
  const [cx, cy, cs] = P(wx, wy, 0);
  // แฟลชกระแทก
  add(g, () => glow(g, cx, cy - cs * 0.4, cs * 5 * n * easeOut(q * 4), WHITE, env(q, 0, 0.02, 0.06, 0.2)));
  // โดมโปร่งแสงพองออก (ครึ่งทรงกลม: วงพื้น + ส่วนโค้งด้านบน)
  const dq = easeOut(q / 0.45), dr = n * (0.6 + dq * 2.4), da = env(q, 0, 0.03, 0.35, 0.6);
  if (da > 0) {
    const [ex, ey, es] = P(wx, wy, 0), top = P(wx, wy, dr * 0.9);
    const grd = g.createRadialGradient(ex, top[1] + (ey - top[1]) * 0.6, 0, ex, top[1] + (ey - top[1]) * 0.6, es * dr);
    grd.addColorStop(0, rgba(WHITE, 0.05 * da)); grd.addColorStop(0.85, rgba(C.spark, 0.25 * da)); grd.addColorStop(1, rgba(WHITE, 0.55 * da));
    g.fillStyle = grd;
    g.beginPath(); g.ellipse(ex, ey, es * dr, es * dr * 0.5, 0, 0, Math.PI, false); g.lineTo(ex - es * dr, ey);
    g.ellipse(ex, (ey + top[1]) / 2 + (ey - top[1]) * 0.1, es * dr, (ey - top[1]) * 0.95, 0, Math.PI, TAU, false); g.closePath(); g.fill();
    g.strokeStyle = rgba(WHITE, 0.7 * da); g.lineWidth = 2; g.stroke();
  }
  // วงแหวนขาวทั้งสนาม (ผลักทุกคน)
  for (let k = 0; k < 2; k++) {
    const rq = clamp01((q - 0.04 - k * 0.08) / 0.55);
    if (rq > 0 && rq < 1) { ring(g, wx, wy, n * 0.8 + easeOut(rq) * 14, 0.03, WHITE, (1 - rq) * 0.95, 5 - k * 2); ring(g, wx, wy, n * 0.8 + easeOut(rq) * 14 - 0.3, 0.03, C.neon, (1 - rq) * 0.5, 3); }
  }
  // รอยแตกบนพื้น + เศษหิน + ประกายสายฟ้า
  const ca = env(q, 0, 0.02, 0.6, 1);
  g.strokeStyle = rgba(C.neon, 0.8 * ca); g.lineWidth = 2.5;
  for (let i = 0; i < 9; i++) {
    const an = hash(seed + i) * TAU, L = n * (0.9 + hash(seed + i * 5) * 1.6);
    g.beginPath();
    for (let j = 0; j <= 5; j++) { const u = j / 5, [x, y] = P(wx + Math.cos(an + (hash(seed + i * 9 + j) - 0.5) * 0.4) * L * u, wy + Math.sin(an + (hash(seed + i * 9 + j) - 0.5) * 0.4) * L * u, 0.02); if (j) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke();
  }
  shards(g, wx, wy, clamp01(q / 0.5), "110,100,90", 0.95, seed, lowQ ? 14 : 30, n * 2.6);
  if (!lowQ) for (let i = 0; i < 6; i++) {
    if (q > 0.45) break;
    const a0 = hash(seed + i * 2) * TAU, r1 = n * (0.8 + hash(seed + i) * 1.5);
    const [x0, y0] = P(wx, wy, 0.6 + hash(seed + i * 3)), [x1, y1] = P(wx + Math.cos(a0) * r1, wy + Math.sin(a0) * r1, 0.1);
    bolt(g, x0, y0, x1, y1, seed + i + ((q * 20) | 0), cs * 0.25, 2, 0.9 * (1 - q / 0.45), C.spark);
  }
}

// ---------- ฟื้น: เสาแสงทอง → ปีกแสง + รัศมี → คลื่นกระแทก ----------
function reviveFx(g, e, ms, seed, lowQ) {
  const [wx, wy, n] = center(e), C = palOf(2), T = MASTER_T.revive, p = ms / (T + 600);
  const [bx, by, s] = P(wx, wy, 0), top = P(wx, wy, 22);
  // เสาแสงจากฟ้า
  const pa = env(p, 0, 0.12, 0.55, 0.75);
  add(g, () => {
    const w = s * n * (0.5 + 0.4 * Math.sin(p * 30));
    const gr = g.createLinearGradient(bx - w, 0, bx + w, 0);
    gr.addColorStop(0, rgba(C.neon, 0)); gr.addColorStop(0.5, rgba(C.core, 0.85 * pa)); gr.addColorStop(1, rgba(C.neon, 0));
    g.fillStyle = gr; g.fillRect(bx - w, top[1], w * 2, by - top[1]);
    glow(g, bx, by - s * n * 0.5, s * n * 2.2, C.neon, 0.6 * pa, WHITE);
  });
  // ปีกแสง: แฉกรังสีกางสองข้าง
  const wa = env(p, 0.25, 0.4, 0.8, 1), spread = easeOut((p - 0.25) / 0.3);
  if (wa > 0) add(g, () => {
    for (const side of [-1, 1]) for (let i = 0; i < 7; i++) {
      const an = -Math.PI / 2 + side * (0.35 + i * 0.16) * spread, L = s * n * (1.4 + i * 0.12) * spread;
      const x0 = bx + side * s * n * 0.15, y0 = by - s * n * 0.85;
      const gr = g.createLinearGradient(x0, y0, x0 + Math.cos(an) * L, y0 + Math.sin(an) * L);
      gr.addColorStop(0, rgba(C.core, 0.9 * wa)); gr.addColorStop(1, rgba(C.neon, 0));
      g.strokeStyle = gr; g.lineWidth = s * 0.12 * (1 - i * 0.08); g.lineCap = "round";
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + Math.cos(an) * L, y0 + Math.sin(an) * L); g.stroke();
    }
  });
  // ขนนกแสงร่วง
  if (!lowQ) for (let i = 0; i < 22; i++) {
    const h = hash(seed + i), q = (p * 1.4 + h) % 1;
    const [fx, fy, fs] = P(wx + (h - 0.5) * 3 * n, wy + (hash(seed + i * 3) - 0.5) * 2 * n, (1 - q) * 4);
    g.save(); g.translate(fx, fy); g.rotate(Math.sin(swayOf(q) + i) * 0.8); g.fillStyle = rgba(C.core, 0.8 * (1 - q) * pa + 0.2 * wa * (1 - q));
    g.beginPath(); g.ellipse(0, 0, fs * 0.08, fs * 0.025, 0, 0, TAU); g.fill(); g.restore();
  }
  // คลื่นกระแทก (ผลักทุกคน) ตอนฟื้นเต็ม
  const rq = clamp01((p - 0.45) / 0.45);
  if (rq > 0 && rq < 1) { ring(g, wx, wy, n * 0.8 + easeOut(rq) * 14, 0.03, C.core, (1 - rq) * 0.95, 5); ring(g, wx, wy, n * 0.6 + easeOut(rq) * 13.6, 0.03, C.neon, (1 - rq) * 0.6, 3); }
}
const swayOf = (q) => q * 9;

function downFx(g, e, p, seed) {
  const [wx, wy, n] = center(e), C = palOf(1);
  const [x, y, s] = P(wx, wy, 0.4);
  add(g, () => glow(g, x, y, s * n * 1.6 * easeOut(p * 2), C.deep, 0.7 * (1 - p)));
  for (let i = 0; i < 18; i++) {
    const h = hash(seed + i), q = clamp01(p * 1.2 - h * 0.2);
    const [px, py, ps] = P(wx + (h - 0.5) * n * 1.4, wy + (hash(seed + i * 2) - 0.5) * n, q * 2.4);
    g.fillStyle = rgba("40,60,45", 0.6 * (1 - q)); g.beginPath(); g.arc(px, py, ps * (0.15 + h * 0.15), 0, TAU); g.fill();
  }
}
function deathFx(g, e, p, seed, lowQ) {
  const [wx, wy, n] = center(e), C = palOf(2);
  const [x, y, s] = P(wx, wy, n * 0.8);
  // ยุบเข้า → ระเบิดแสง + เศษเกราะ
  const pre = clamp01(p / 0.35);
  add(g, () => glow(g, x, y, s * n * (2.4 - pre * 1.8), C.neon, 0.8 * pre * (p < 0.35 ? 1 : 0), WHITE));
  if (p >= 0.35) {
    const q = (p - 0.35) / 0.65;
    add(g, () => {
      glow(g, x, y, s * n * 4 * easeOut(q), WHITE, 0.95 * (1 - q), WHITE);
      for (let i = 0; i < 12; i++) { const an = (i / 12) * TAU + seed, L = s * n * 5 * easeOut(q); g.strokeStyle = rgba(C.neon, 0.7 * (1 - q)); g.lineWidth = s * 0.08; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(an) * L, y + Math.sin(an) * L * 0.6); g.stroke(); }
    });
    shards(g, wx, wy, q, "60,70,60", 1, seed, lowQ ? 16 : 36, n * 3);
  }
}

// ---------- อัญเชิญ: คำราม (วงคลื่นรอบตัว) + วงเวทที่ช่องเกิด + ร่างโผล่ ----------
function summonFx(g, e, ms, seed, lowQ) {
  const [wx, wy, n] = center(e), C = palOf(e.phase), T = MASTER_T.summon;
  for (let k = 0; k < 3; k++) {
    const q = clamp01((ms - k * 180) / 900);
    if (q > 0 && q < 1) ring(g, wx, wy, n * 0.7 + q * 3.2, 0.5 + k * 0.4, C.neon, (1 - q) * 0.8, 4);
  }
  for (const [i, u] of (e.units || []).entries()) {
    if (!u || !u.at) continue;
    const q = clamp01((ms - 200 - i * 140) / T);
    const ux = u.at.x + 0.5, uy = u.at.y + 0.5, a = env(q, 0, 0.15, 0.75, 1);
    const ph2 = u.kind === "blessed" || u.kind === "crusader";
    const rgb = ph2 ? PAL[2].neon : u.kind === "raider" ? "255,120,80" : PAL[1].neon;
    // วงเวท: 2 วง + ขีดอักขระหมุน
    ring(g, ux, uy, 0.5, 0.02, rgb, a, 2.5); ring(g, ux, uy, 0.36, 0.02, rgb, a * 0.8, 1.5);
    g.strokeStyle = rgba(rgb, a); g.lineWidth = 1.5;
    for (let j = 0; j < 8; j++) {
      const an = j / 8 * TAU + q * 4, [x0, y0] = P(ux + Math.cos(an) * 0.36, uy + Math.sin(an) * 0.36, 0.02), [x1, y1] = P(ux + Math.cos(an + 0.4) * 0.5, uy + Math.sin(an + 0.4) * 0.5, 0.02);
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    }
    const [px, py, ps] = P(ux, uy, 0);
    add(g, () => {
      const gr = g.createLinearGradient(0, py, 0, py - ps * 2.4);
      gr.addColorStop(0, rgba(rgb, 0.6 * a)); gr.addColorStop(1, rgba(rgb, 0));
      g.fillStyle = gr; g.fillRect(px - ps * 0.3, py - ps * 2.4, ps * 0.6, ps * 2.4);
    });
    if (!ph2 && !lowQ) shards(g, ux, uy, q, "90,70,55", a, seed + i * 11, 8, 0.8); // ดินแตก (ซอมบี้โผล่จากดิน)
  }
}

// ---------- Twin Sword Slam: กระโดดทุบ → กอหนามคริสตัลผุดไล่ตามแฉก (ใกล้ → ไกล) ----------
function slamFx(g, e, ms, seed, lowQ) {
  const [wx, wy, n] = center(e), C = palOf(e.phase), T = MASTER_T.slam;
  const hit = T * 0.8;
  const tiles = (e.tiles || []).filter((t) => t && Number.isFinite(t.x));
  const v = DIRS[e.dir] || [0, 0];
  // ดาบคู่: เงื้อเหนือหัวตอนกระโดด → ฟาดลงพื้นหน้าตัวตรงจังหวะกระแทก → ปักค้างแล้วจาง
  twinSwords(g, wx, wy, n, v, ms, hit, C, seed, lowQ);
  if (ms < hit) {
    const q = ms / hit;
    for (const t of tiles) { gEllipse(g, t.x + 0.5, t.y + 0.5, 0.42, 0.01, 18); g.fillStyle = rgba(C.neon, 0.12 * q); g.fill(); }
    return;
  }
  const after = ms - hit;
  const [cx, cy, cs] = P(wx, wy, 0);
  // แฟลชตอนทุบ + วงคลื่นพื้น + รอยแตกตามแฉก
  add(g, () => glow(g, cx, cy, cs * n * 1.2, C.neon, 0.75 * env(after, 0, 30, 70, 220), WHITE));
  ring(g, wx, wy, n * 0.7 + after / 300, 0.02, C.neon, Math.max(0, 1 - after / 600), 4);
  const dist = (t) => Math.abs(t.x + 0.5 - wx) + Math.abs(t.y + 0.5 - wy);
  for (const t of tiles) {
    const d = dist(t), delay = d * 85, q = (after - delay) / 900;
    if (q < 0) continue;
    const tx = t.x + 0.5, ty = t.y + 0.5;
    const grow = easeOut(q / 0.18), fade = env(q, 0, 0.05, 0.7, 1);
    // รอยแยกจากจุดทุบถึงช่อง
    if (q < 0.6) { const [ax, ay] = P(wx + v[0] * n * 0.5, wy + v[1] * n * 0.5, 0.02), [bx2, by2] = P(tx, ty, 0.02); g.strokeStyle = rgba(C.neon, 0.6 * (1 - q / 0.6)); g.lineWidth = 2; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx2, by2); g.stroke(); }
    gEllipse(g, tx, ty, 0.45, 0.01, 18); g.fillStyle = rgba(C.neon, 0.22 * fade); g.fill();
    crystalCluster(g, tx, ty, (e.big ? 2.3 : 1.7) * grow * (q > 0.75 ? 1 - (q - 0.75) / 0.25 : 1), C.crystal, fade, seed + t.x * 13 + t.y * 7, e.big);
    if (q > 0.72) shards(g, tx, ty, (q - 0.72) / 0.28, C.crystal, 1, seed + t.x + t.y * 3, lowQ ? 4 : 9, 0.9);
    // คลื่นใหญ่ (ครั้งที่ 3): สายฟ้าสตั้นแลบบนผลึก
    if (e.big && !lowQ && q < 0.7 && ((ms / 70) | 0) % 2 === 0) {
      const [x0, y0, s0] = P(tx, ty, 1.2), [x1, y1] = P(tx + (hash(seed + d) - 0.5), ty + (hash(seed + d * 2) - 0.5), 0.1);
      bolt(g, x0, y0, x1, y1, seed + d + ((ms / 70) | 0), s0 * 0.2, 1.8, 0.9, C.spark);
    }
  }
}

// ดาบพลังงาน 2 เล่ม (มือซ้าย/ขวา) — มุม th จากแนวตั้ง: −0.6 (เงื้อไปข้างหลัง) → 2.05 (ปลายจิกพื้นหน้าตัว)
//  ตำแหน่งตามเวลา: ms < hit·0.62 เงื้อขึ้นช้าๆ · hit·0.62 → hit ฟาดลงเร่ง (easeIn) · หลัง hit ปักค้าง 260ms แล้วจาง
//  ความสูงมือตามท่ากระโดดของตัว (masterPose slam — ต้องตรงกับ drawMasterUnit)
function twinSwords(g, wx, wy, n, v, ms, hit, C, seed, lowQ) {
  const T = hit / 0.78; // ความยาวท่าของตัว (pose ms)
  const q = ms / T;
  const up = q < 0.62 ? Math.sin(clamp01(q / 0.62) * Math.PI * 0.5) * 1.6 : Math.max(0, 1.6 * (1 - easeIn((q - 0.62) / 0.16)));
  const raise = hit * 0.62;
  const th = ms < raise ? -0.6 * easeOut(ms / raise) : ms < hit ? -0.6 + 2.65 * easeIn((ms - raise) / (hit - raise)) : 2.05;
  const fade = ms < hit ? Math.min(1, ms / 150) : 1 - clamp01((ms - hit - 260) / 380);
  if (fade <= 0) return;
  const L = 0.95 + n * 0.75, hz = up + 0.55 * n;
  const side = [-v[1], v[0]];
  const trail = ms > raise && ms < hit + 120;
  for (const k of [-1, 1]) {
    const px = wx + v[0] * n * 0.15 + side[0] * k * 0.42 * n, py = wy + v[1] * n * 0.15 + side[1] * k * 0.42 * n;
    const tipAt = (a) => {
      const fwd = Math.sin(a) * L, z = hz + Math.cos(a) * L;
      return [px + v[0] * fwd, py + v[1] * fwd, Math.max(0, z)];
    };
    const [hx, hy, hzz] = [px, py, hz];
    const [tx, ty, tz] = tipAt(th);
    const A = P(hx, hy, hzz), B = P(tx, ty, tz);
    if (ms < hit - 40) continue; // ก่อนกระแทก: แขนในภาพตัวเป็นคนเงื้อ/ฟาด (drawCutImage) — ไม่วาดดาบลอยแยก
    add(g, () => {
      // เงาการฟาด (ส่วนโค้งที่ปลายดาบกวาดผ่าน)
      if (trail) {
        g.beginPath();
        for (let i = 0; i <= 10; i++) { const a = th - 0.9 + (i / 10) * 0.9, [x, y, z2] = tipAt(a), [sx, sy] = P(x, y, z2); if (i) g.lineTo(sx, sy); else g.moveTo(sx, sy); }
        g.strokeStyle = rgba(C.neon, 0.45 * fade); g.lineWidth = A[2] * 0.35; g.lineCap = "round"; g.stroke();
      }
      if (ms >= hit - 40) glow(g, B[0], B[1], B[2] * (ms < hit + 200 ? 0.6 : 0.3), C.neon, 0.8 * fade, WHITE); // ปลายดาบกระแทกพื้น
    });
    if (!lowQ && ms >= hit && ms < hit + 500) shards(g, tx, ty, (ms - hit) / 500, "120,110,95", 1, seed + k * 17, 10, 1.0); // ดินกระเด็นตรงที่ดาบฟาด
  }
}

// ---------- Knockdown Slash: ใบดาบพลังงานโปร่งแสงกวาดเป็นระนาบไปตามแนว ----------
function knockFx(g, e, ms, seed, lowQ) {
  const [wx, wy, n] = center(e), C = palOf(e.phase);
  const T = e.wave ? MASTER_T.knock2 : MASTER_T.knock, go = T * 0.45;
  const v = DIRS[e.dir] || [1, 0], side = [-v[1], v[0]];
  const tiles = (e.tiles || []).filter((t) => t && Number.isFinite(t.x));
  const len = tiles.length ? Math.max(...tiles.map((t) => Math.abs((t.x + 0.5 - wx) * v[0] + (t.y + 0.5 - wy) * v[1]))) + 0.5 : 4;
  // ตั้งท่า: ดาบเรืองที่หน้าตัว
  if (ms < go) {
    const q = ms / go, [x, y, s] = P(wx + v[0] * n * 0.55, wy + v[1] * n * 0.55, 1.1);
    add(g, () => glow(g, x, y, s * (0.5 + q * 0.9), C.neon, 0.35 + q * 0.55, WHITE));
    return;
  }
  const q = (ms - go) / (T * 0.55 + 700), travel = easeOut(q / 0.55);
  const d = n * 0.5 + travel * len;
  const half = n * 0.5 + 0.3, a = env(q, 0, 0.04, 0.6, 0.9);
  // ใบดาบ: แผ่นโค้งตั้ง (crescent) สูง ~1.7 ช่อง กว้างเท่าแนว
  const cx0 = wx + v[0] * d, cy0 = wy + v[1] * d;
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const u = i / 12 * 2 - 1, bend = (1 - u * u) * 0.45;
    pts.push([cx0 + side[0] * u * half + v[0] * bend, cy0 + side[1] * u * half + v[1] * bend]);
  }
  add(g, () => {
    // หางใบดาบ (ระนาบโปร่งแสงตามแนว)
    const [tx0, ty0] = P(wx + v[0] * n * 0.5, wy + v[1] * n * 0.5, 0.05), [tx1, ty1] = P(cx0, cy0, 0.05);
    const gr = g.createLinearGradient(tx0, ty0, tx1, ty1);
    gr.addColorStop(0, rgba(C.neon, 0)); gr.addColorStop(1, rgba(C.neon, 0.35 * a));
    g.fillStyle = gr; g.beginPath();
    const s0 = P(wx + v[0] * n * 0.5 + side[0] * half, wy + v[1] * n * 0.5 + side[1] * half, 0.05), s1 = P(wx + v[0] * n * 0.5 - side[0] * half, wy + v[1] * n * 0.5 - side[1] * half, 0.05);
    const e0 = P(pts[12][0], pts[12][1], 0.05), e1 = P(pts[0][0], pts[0][1], 0.05);
    g.moveTo(s0[0], s0[1]); g.lineTo(e0[0], e0[1]); g.lineTo(e1[0], e1[1]); g.lineTo(s1[0], s1[1]); g.closePath(); g.fill();
    // แผ่นใบดาบ: ระนาบโปร่งแสงเต็มความสูง (ฐาน → ยอด)
    const zTop = (i) => 2.1 * Math.sin((i / 12) * Math.PI * 0.9 + 0.15);
    const base = pts.map(([x, y]) => P(x, y, 0.05)), topP = pts.map(([x, y], i) => P(x, y, zTop(i)));
    const [, shTop] = topP[6], [, shBase] = base[6];
    const sheet = g.createLinearGradient(0, shBase, 0, shTop);
    sheet.addColorStop(0, rgba(C.neon, 0.15 * a)); sheet.addColorStop(0.7, rgba(C.neon, 0.45 * a)); sheet.addColorStop(1, rgba(C.core, 0.8 * a));
    g.fillStyle = sheet; g.beginPath();
    base.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    for (let i = topP.length - 1; i >= 0; i--) g.lineTo(topP[i][0], topP[i][1]);
    g.closePath(); g.fill();
    // ตัวใบดาบ: ฐาน → ยอด
    for (const [zz, col, al, lw] of [[0.05, C.neon, 0.7, 6], [1.1, C.neon, 0.55, 12], [2.1, C.core, 0.95, 4]]) {
      g.strokeStyle = rgba(col, al * a); g.lineWidth = lw; g.lineCap = "round"; g.beginPath();
      pts.forEach(([x, y], i) => { const [sx, sy] = P(x, y, zz * Math.sin((i / 12) * Math.PI * 0.9 + 0.15)); if (i) g.lineTo(sx, sy); else g.moveTo(sx, sy); });
      g.stroke();
    }
    const [hx, hy, hs] = P(cx0, cy0, 0.8);
    glow(g, hx, hy, hs * half * 1.4, C.neon, 0.5 * a, WHITE);
  });
  // ประกายที่ช่องที่ใบดาบผ่าน
  if (!lowQ) for (const t of tiles) {
    const along = (t.x + 0.5 - wx) * v[0] + (t.y + 0.5 - wy) * v[1];
    const k = env(d - along, 0, 0.1, 0.5, 1.4);
    if (k <= 0) continue;
    const [x, y, s] = P(t.x + 0.5, t.y + 0.5, 0.3);
    add(g, () => glow(g, x, y, s * 0.6, C.spark, 0.7 * k, WHITE));
  }
}

// ---------- Smite: ท้องฟ้ามืด → สายฟ้าฟาดศัตรูทุกคน (เฟส 2 = ม่วงดำขอบทอง) ----------
function smiteFx(g, e, ms, seed, lowQ) {
  const T = e.bolt ? MASTER_T.smite2 : MASTER_T.smite, strike = T * 0.72;
  const dark = !!e.dark, col = dark ? VIOLET : "170,220,255", rim = dark ? PAL[2].neon : WHITE;
  // ท้องฟ้ามืดลง (ทั้งจอ) + ฟ้าแลบเป็นช่วงๆ
  const sky = env(ms, 0, strike * 0.6, strike + 200, T + 800) * (dark ? 0.55 : 0.4);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = dark ? `rgba(18,6,30,${sky})` : `rgba(10,16,30,${sky})`;
  g.fillRect(0, 0, g.canvas.width, g.canvas.height);
  if (!lowQ && ms < strike && ((ms / 90) | 0) % 6 === 0) { g.fillStyle = `rgba(${col},0.08)`; g.fillRect(0, 0, g.canvas.width, g.canvas.height); }
  g.restore();
  const targets = (e.targets || []).filter((t) => t && Number.isFinite(t.x));
  for (const [i, t] of targets.entries()) {
    const n = Math.max(1, t.size | 0), tx = t.x + n / 2, ty = t.y + n / 2;
    // เครื่องหมายเล็งบนพื้นก่อนผ่า
    if (ms < strike) { ring(g, tx, ty, 0.45 * n * (1.3 - ms / strike * 0.3), 0.02, col, 0.3 + 0.6 * ms / strike, 2.5); continue; }
    const q = (ms - strike - i * 25) / 900;
    if (q < 0 || q > 1) continue;
    const [gx, gy, gs] = P(tx, ty, 0.1), [sx, sy] = P(tx + (hash(seed + i) - 0.5) * 2, ty - 1, 26);
    const a = 1 - q;
    for (let k = 0; k < (lowQ ? 1 : 3); k++) bolt(g, sx + k * 6, sy, gx, gy, seed + i * 7 + k + ((ms / 60) | 0), gs * 0.6, k ? 2 : 4.5, a * (k ? 0.6 : 1), col);
    if (dark) bolt(g, sx, sy, gx, gy, seed + i * 3, gs * 0.4, 1.2, a * 0.8, rim);
    add(g, () => glow(g, gx, gy, gs * 1.8 * (0.6 + q), col, 0.9 * a, WHITE));
    ring(g, tx, ty, 0.3 + q * 1.3, 0.03, rim, a * 0.9, 3);
    if (!lowQ) shards(g, tx, ty, q, col, a, seed + i * 5, 10, 1.2);
  }
}
function riseFx(g, e, p, seed) {
  const [wx, wy] = center(e), C = palOf(1);
  for (let i = 0; i < 14; i++) {
    const h = hash(seed + i), q = clamp01(p * 1.3 - h * 0.3);
    const [x, y, s] = P(wx + (h - 0.5) * 0.7, wy + (hash(seed + i * 2) - 0.5) * 0.5, q * 1.6);
    g.fillStyle = rgba(C.neon, 0.5 * (1 - q)); g.beginPath(); g.arc(x, y, s * 0.1, 0, TAU); g.fill();
  }
}

// ---------- ท่าตีปกติ ----------
//  masterSlash: เข็มดาบแทงรัว 4 เส้น เข้าแถวหน้าตัว (กว้าง 4) + รอยฟันโค้งตอนปะทะ · เฟส 2 = ทอง
//  ตัวอัญเชิญ: undead กัด (เขี้ยวเขียว) · blessed ฟาดเหนือหัว (โค้งทอง) · raider/crusader ยิงกระสุน (ส้ม/ทอง)
function strikeFx(g, e, p, seed, lowQ) {
  const from = { x: e.x, y: e.y, n: Math.max(1, e.size | 0) }, to = e.to ? { x: e.to.x, y: e.to.y, n: Math.max(1, e.toSize | 0) } : null;
  if (!to) return;
  const ax = from.x + from.n / 2, ay = from.y + from.n / 2, bx = to.x + to.n / 2, by = to.y + to.n / 2;
  const H = MASTER_HIT_P[e.kind] || 0.45;
  if (e.kind === "masterSlash" || e.kind === "masterSlash2") {
    const C = palOf(e.kind === "masterSlash2" ? 2 : 1);
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, sx = -uy, sy = ux;
    for (let i = 0; i < 4; i++) {
      const t0 = 0.12 + i * 0.07, q = (p - t0) / 0.22;
      if (q < 0 || q > 1) continue;
      const off = (i - 1.5) * 0.55, reach = Math.sin(q * Math.PI) * (L - 0.2);
      const [x0, y0] = P(ax + ux * from.n * 0.4 + sx * off * 0.5, ay + uy * from.n * 0.4 + sy * off * 0.5, 0.9);
      const [x1, y1] = P(ax + ux * (from.n * 0.4 + reach) + sx * off, ay + uy * (from.n * 0.4 + reach) + sy * off, 0.75);
      add(g, () => {
        g.strokeStyle = rgba(C.neon, 0.6); g.lineWidth = 5; g.lineCap = "round"; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
        g.strokeStyle = rgba(C.core, 0.95); g.lineWidth = 1.8; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
        glow(g, x1, y1, 10, C.neon, 0.8, WHITE);
      });
    }
    const hq = (p - H) / (1 - H);
    if (hq >= 0) {
      const [hx, hy, hs] = P(bx, by, 0.7), a = 1 - hq;
      add(g, () => {
        g.strokeStyle = rgba(C.neon, 0.9 * a); g.lineWidth = hs * 0.08; g.beginPath(); g.arc(hx, hy, hs * (0.5 + hq * 0.4), -2.2 + hq, -0.2 + hq); g.stroke();
        glow(g, hx, hy, hs * (0.6 + hq * 0.6), C.neon, 0.7 * a, WHITE);
      });
      if (!lowQ) shards(g, bx, by, hq, C.crystal, a, seed, 8, 0.7);
    }
    return;
  }
  const kind = e.kind.slice(7);
  const rgb = kind === "undead" ? PAL[1].neon : kind === "raider" ? "255,140,70" : PAL[2].neon;
  if (kind === "raider" || kind === "crusader") {
    const q = clamp01(p / H), [x0, y0] = P(ax, ay, 0.8), [x1, y1] = P(ax + (bx - ax) * q, ay + (by - ay) * q, 0.7);
    if (p < H) add(g, () => { g.strokeStyle = rgba(rgb, 0.9); g.lineWidth = 3; g.beginPath(); g.moveTo(x0 + (x1 - x0) * 0.6, y0 + (y1 - y0) * 0.6); g.lineTo(x1, y1); g.stroke(); glow(g, x1, y1, 8, rgb, 1, WHITE); glow(g, x0, y0, 14, rgb, 0.8 * (1 - q)); });
    else { const hq = (p - H) / (1 - H), [hx, hy, hs] = P(bx, by, 0.6); add(g, () => glow(g, hx, hy, hs * 0.6 * (0.5 + hq), rgb, 0.9 * (1 - hq), WHITE)); }
    return;
  }
  const hq = (p - H) / (1 - H);
  if (hq < 0) return;
  const [hx, hy, hs] = P(bx, by, 0.6), a = 1 - hq;
  add(g, () => {
    g.strokeStyle = rgba(rgb, 0.9 * a); g.lineWidth = hs * 0.06;
    if (kind === "undead") { for (const sgn of [-1, 1]) { g.beginPath(); g.arc(hx, hy + sgn * hs * 0.12, hs * 0.3, sgn > 0 ? Math.PI * 1.15 : Math.PI * 0.15, sgn > 0 ? Math.PI * 1.85 : Math.PI * 0.85); g.stroke(); } }
    else { g.beginPath(); g.arc(hx, hy - hs * 0.3, hs * 0.45, Math.PI * 0.1, Math.PI * 0.9); g.stroke(); }
    glow(g, hx, hy, hs * 0.5, rgb, 0.6 * a, WHITE);
  });
}

// ============================================================
//  หมอกพิษ / หลุมดำที่ค้างบนกระดาน (state.board.elemFields — server/element.js fieldsPub)
// ============================================================
export function drawElemFields(g, fields, now, lowQ) {
  if (!fields || !fields.length) return;
  const t = REDUCED ? 0 : now;
  for (const f of fields) {
    if (!f || !Number.isFinite(f.x)) continue;
    const cx = f.x + 0.5, cy = f.y + 0.5, r = (f.r | 0) || 1;
    g.save();
    if (f.kind === "fog") {
      // ก้อนหมอกเขียวม่วงลอยต่ำเต็มกรอบ 3×3 หมุนช้าๆ
      const n = lowQ ? 10 : 22;
      for (let i = 0; i < n; i++) {
        const h = hash(i * 3.3 + f.x * 7 + f.y), an = h * TAU + t / 4200 * (h > 0.5 ? 1 : -1);
        const rr = h * (r + 0.4), [x, y, s] = P(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr * 0.9, 0.25 + 0.3 * Math.sin(t / 900 + i));
        glow(g, x, y, s * (0.55 + hash(i) * 0.4), i % 3 ? "130,200,80" : "120,70,150", 0.32);
      }
      const k = 0.5 + 0.2 * Math.sin(t / 500);
      g.strokeStyle = `rgba(150,235,80,${k * 0.5})`; g.lineWidth = 1.5; g.setLineDash([6, 6]);
      const a = P(f.x - r, f.y - r), b = P(f.x + r + 1, f.y - r), c = P(f.x + r + 1, f.y + r + 1), d = P(f.x - r, f.y + r + 1);
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); g.stroke(); g.setLineDash([]);
    } else if (f.kind === "hole") {
      // หลุมดำ: จานสะสมมวลหมุน (ม่วง/ทอง) + ทรงกลมดำกลาง + เส้นดูดเข้าจากขอบกรอบ 5×5
      for (let j = 0; j < 4; j++) {
        gEllipse(g, cx, cy, 0.55 + j * 0.5, 0.25, 48);
        g.strokeStyle = j % 2 ? `rgba(255,224,130,${0.5 - j * 0.08})` : `rgba(150,80,255,${0.65 - j * 0.1})`; g.lineWidth = 3 - j * 0.4; g.stroke();
      }
      add(g, () => {
        for (let i = 0; i < (lowQ ? 8 : 18); i++) {
          const h = hash(i * 5.1 + f.x), q = (t / 1400 + h) % 1, an = h * TAU + q * 3;
          const rr = (r + 0.5) * (1 - q), [x, y] = P(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr, 0.25);
          glow(g, x, y, 6, i % 2 ? "150,80,255" : "255,224,130", 0.8 * q);
        }
      });
      const [x, y, s] = P(cx, cy, 0.55);
      add(g, () => glow(g, x, y, s * 1.1, "150,80,255", 0.55));
      g.fillStyle = `rgb(${VOID})`; g.beginPath(); g.arc(x, y, s * 0.32, 0, TAU); g.fill();
      g.strokeStyle = "rgba(255,240,200,.85)"; g.lineWidth = 2; g.beginPath(); g.arc(x, y, s * 0.34, 0, TAU); g.stroke();
    }
    g.restore();
  }
}
