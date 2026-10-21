// ============================================================
//  เอฟเฟกต์บนกระดานขององค์หญิงดอกไม้ เซลิน (characters/celine.js · GRID_PLAN §7.15 · สัญญา .claude/plans/celine-contract.md)
//  ธีมเจ้าหญิงดอกไม้: ทอง #f3c94b · เขียวใบไม้ #b5d86a/#7fae3b · ชมพูดอกไม้ #f59ab8 · ส้มผีเสื้อ #f39a4b · ขาวครีม #fff6dc
//   กลีบดอกไม้ ผีเสื้อ มงกุฎ ประกายทอง วงเวทลายเถาวัลย์ (vineSigil)
//
//  ตีปกติ (attackStyle — STYLE_MS / STYLE_HIT_P ใน boardDraw) · fx { x, y (ช่องผู้ตี), size, to, toSize, color }
//   celineDagger  ดาบเล็ก: เงาพุ่งชมพู → ฟันคู่ไขว้ (ชมพู/ขาว) + กลีบดอกแตก
//   celineDragon  ดาบมังกรแดง: มังกรแดงเลื้อยโค้งขึ้นฟ้าแล้วดิ่งงับเป้า → พระจันทร์เสี้ยวแดง + กลีบกุหลาบแดง → ร่างมังกรสลายเป็นกลีบ
//   celineGreat   ดาบใหญ่: ดาบทองยักษ์ทิ้งดิ่งจากฟ้า → เสี้ยวทองกว้าง + คลื่นกระแทกบนพื้น + วงดอกไม้บานออก + ลำแสงพุ่ง
//   celineFire    เวทย์ไฟ: วงเวทใต้เท้า → ลูกไฟโค้งหางกลีบไฟ → ระเบิดบานเป็นดอกไฟ 2 ชั้น + ถ่านลอย
//   celineWind    เวทย์ลม: พายุเกลียวใบไม้/กลีบดอกวิ่งตามทาง → ทอร์นาโดเล็กที่เป้า ใบไม้ปลิวออก
//   celineThunder เวทย์ไฟฟ้า: วงเวทเถาวัลย์กลางฟ้าเหนือเป้า + สายไฟจากมือ → สายฟ้าทองผ่าลง + ประกายรูปดอกไม้
//   celineCrit    (BoardStage ใส่ตอนปะทะเมื่อติดคริ) ดอกทอง 8 กลีบ + มงกุฎเล็กเด้งเหนือเป้า
//  เหตุการณ์ (socket "celineFx" → celineEventFx → { fx, look, shake, busy, later }):
//   heal (ไม้เท้ารวมแสง → สายกลีบดอกไปหาเป้า → วงเวท + เสาแสง + ดอกไม้บานรอบตัว · คริ = ทอง/ใหญ่ขึ้น)
//   wall (วงน้ำแข็งลายเกล็ดหิมะ + เศษผลึกพุ่ง — ตัวกำแพงงอกขึ้นจาก celineWallRise) · wallBreak (hit = แตกกระจาย · expire = ละลายเป็นกลีบ)
//   swap (ตัวที่สลับลอยขึ้นในเกลียวกลีบ บินโค้งข้ามกัน แล้วบานลงพื้น — celinePose ย้ายหมาก) · bloom (วงเวท + พุ่มงอก + ผีเสื้อบิน)
//   trail (พุ่มงอกใต้เท้าทีละช่องตามจังหวะเดิน CELINE_STEP_MS) · weapon (สัญลักษณ์อาวุธ 6 แบบลอยขึ้นเหนือหัว)
//   ult (วงเวทยักษ์ + สวนดอกไม้บานเป็นเกลียว + มงกุฎลงสวม + ผีเสื้อฝูง) · tea (ถ้วยชา + ไอน้ำรูปดอกไม้)
//   burn (ดอกไฟลุก) · shock (วงไฟฟ้าทอง + ประกายดอกไม้) · gust (ใบไม้พัดผ่าน) · collide (ชนสิ่งกีดขวาง: ดาวแตก + กลีบ)
//  ของค้างบนกระดาน (prop celine ของ BoardCanvas → drawFrame):
//   flora (พุ่มดอกไม้ — made = พุ่มใหญ่ดอกหลากสี/วงทอง · รอยเท้า = พุ่มเล็กชมพูครีม · left 1 = เหี่ยว กลีบร่วง)
//    drawCelineGround = พรมกลีบใต้พุ่ม · celineItems = พุ่มเรียงความลึกกับตัวละคร (ครึ่งหลัง/ครึ่งหน้า)
//   กำแพงน้ำแข็ง terrain "icewall" → drawCelineWall (ผนังผลึกใส ลายดอกน้ำแข็ง ยอดคริสตัล — ไม่ใช่หนาม Ice Spike)
//   kings (บัฟราชาดอกไม้) → วงเถาวัลย์ทองใต้ตัว + drawCelineAir (มงกุฎลอย กลีบโคจร ผีเสื้อ)
//  อนุภาคไม่มีสถานะ (คำนวณจาก hash ของลำดับ — ไม่จองหน่วยความจำต่อเฟรม) · lowQ = ตัดอนุภาค/ชั้นเรืองครึ่งหนึ่ง
//  ลดการเคลื่อนไหว = ของที่วนตลอด (พุ่มไหว มงกุฎลอย กลีบโคจร) หยุดนิ่ง · เอฟเฟกต์ครั้งเดียวยังเล่น
// ============================================================
import { P, depthOf, faceVisible, gEllipse, glow } from "./boardGeo";

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;

// ---------- สี (r,g,b) ----------
const GOLD = "243,201,75", GOLD_D = "184,128,32", CREAM = "255,246,220", WHITE = "255,255,255";
const LEAF = "181,216,106", LEAF_D = "127,174,59", LEAF_DD = "58,104,38";
const PINK = "245,154,184", PINK_D = "222,96,146", ORANGE = "243,154,75";
const CRIMSON = "214,38,62", CRIMSON_D = "96,10,28", EMBER = "255,196,96";
const ICE = "214,244,255", ICE_M = "150,208,242", ICE_D = "86,152,214", FROST_PINK = "255,214,232";
const BOLT = "255,236,140";
const FLOWER_COLS = [PINK, GOLD, CREAM, ORANGE];

// ---------- จังหวะ ----------
export const CELINE_MS = { celineDagger: 760, celineDragon: 1050, celineGreat: 1350, celineFire: 1150, celineWind: 1150, celineThunder: 1050 };
export const CELINE_HIT_P = { celineDagger: 0.32, celineDragon: 0.45, celineGreat: 0.5, celineFire: 0.5, celineWind: 0.5, celineThunder: 0.45 };
export const CELINE_STEP_MS = 120; // พุ่มงอกใต้เท้า: เท่าจังหวะเดิน 1 ช่องของ BoardCanvas
const SPROUT_MS = 420;
export const CELINE_SWAP = { rise: 260, fly: 620, land: 300 };
const SWAP_MS = CELINE_SWAP.rise + CELINE_SWAP.fly + CELINE_SWAP.land;
export const CELINE_ULT = { crown: 1250, total: 2700 };
export const CELINE_FX_DUR = {
  ...CELINE_MS, celineCrit: 950,
  celineHeal: 2000, celineWall: 1300, celineWallBreak: 1150, celineSwap: SWAP_MS + 60, celineBloom: 1500, celineTrail: 1500,
  celineWeapon: 1300, celineUlt: CELINE_ULT.total, celineTea: 1500, celineBurn: 950, celineShock: 850, celineGust: 850, celineCollide: 750,
};
export const isCelineFx = (kind) => typeof kind === "string" && (kind in CELINE_FX_DUR);
// เสียงของแต่ละเหตุการณ์ — เกมจริง server ส่งเอง (contract §5) · ตารางนี้ใช้แค่หน้า dev (CelineFxDev)
export const CELINE_EVENT_SFX = {
  heal: "celine_heal", wall: "celine_wall", wallBreak: "celine_wall_break", swap: "celine_swap", bloom: "celine_bloom", trail: "celine_trail",
  ult: "celine_ult", tea: "celine_tea", burn: "celine_fire_hit", shock: "celine_thunder_hit", gust: "celine_wind_hit", collide: "celine_collide",
};
export const CELINE_WEAPONS = ["dagger", "dragon", "great", "fire", "wind", "thunder"];
export const CELINE_SWORD = { dagger: true, dragon: true, great: true };
// สีประจำอาวุธ [หลัก, รอง]
const WCOL = { dagger: [PINK, WHITE], dragon: [CRIMSON, GOLD], great: [GOLD, CREAM], fire: [ORANGE, PINK], wind: [LEAF, WHITE], thunder: [BOLT, GOLD] };

// ---------- คณิต ----------
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const easeIn2 = (t) => t * t;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1, u = t - 1; return 1 + c3 * u * u * u + c1 * u * u; };
const hash01 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const rgba = (rgb, a) => `rgba(${rgb},${Math.max(0, Math.min(1, a))})`;
// วงจร 0..1 → ขึ้น/ค้าง/ลง
const env = (t, a, b, c, d) => (t <= a || t >= d ? 0 : t < b ? (t - a) / (b - a) : t <= c ? 1 : (d - t) / (d - c));
const okT = (p) => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
const ptOf = (p) => ({ x: p.x, y: p.y });

// จุดบนจอของตัวละครบนช่อง (x, y) ขนาด n — { bx, by (พื้นกลางตัว), s, top (กลางหมาก), head (เหนือหัว) } (เหมือน boardDraw bodyOf)
function bodyOf(x, y, n = 1) {
  n = Math.max(1, n | 0);
  const [bx, by, s] = P(x + n / 2, y + n / 2);
  if (n <= 1) return { bx, by, s, n, top: [bx, by - s * 0.86], head: [bx, by - s * 1.32], h: s * 0.8 };
  const h = n * s * 1.32, foot = by + s * n * 0.28;
  return { bx, by, s, n, top: [bx, foot - h * 0.6], head: [bx, foot - h * 1.02], h };
}

// =================================================================== รูปทรงพื้นฐาน (จอ)
// กลีบ: โคน (x, y) ชี้ไปทาง ang ยาว len กว้าง wid
function petalPath(g, x, y, len, wid, ang) {
  const c = Math.cos(ang), s = Math.sin(ang), px = -s, py = c, tx = x + c * len, ty = y + s * len;
  g.moveTo(x, y);
  g.bezierCurveTo(x + c * len * 0.3 + px * wid, y + s * len * 0.3 + py * wid, tx - c * len * 0.22 + px * wid * 0.62, ty - s * len * 0.22 + py * wid * 0.62, tx, ty);
  g.bezierCurveTo(tx - c * len * 0.22 - px * wid * 0.62, ty - s * len * 0.22 - py * wid * 0.62, x + c * len * 0.3 - px * wid, y + s * len * 0.3 - py * wid, x, y);
}
// กลีบเดี่ยวลอย (กลางกลีบอยู่ที่ x, y)
function petal(g, x, y, r, ang, rgb, a) {
  if (a <= 0.01 || r <= 0.2) return;
  g.beginPath(); petalPath(g, x - Math.cos(ang) * r * 0.5, y - Math.sin(ang) * r * 0.5, r, r * 0.52, ang);
  g.fillStyle = rgba(rgb, a); g.fill();
}
// ดอกไม้ n กลีบ (sq = บีบแนวตั้ง — ดอกที่นอนบนพื้น) · inner = กลีบชั้นใน (สีอ่อน)
function flower(g, x, y, r, rot, n, rgb, center, a, sq = 1, inner = CREAM) {
  if (a <= 0.01 || r <= 0.4) return;
  g.save(); g.translate(x, y); if (sq !== 1) g.scale(1, sq);
  g.beginPath();
  for (let i = 0; i < n; i++) petalPath(g, 0, 0, r, r * 0.5, rot + i * TAU / n);
  g.fillStyle = rgba(rgb, a); g.fill();
  if (r > 3 && inner) {
    g.beginPath();
    for (let i = 0; i < n; i++) petalPath(g, 0, 0, r * 0.55, r * 0.3, rot + (i + 0.5) * TAU / n);
    g.fillStyle = rgba(inner, a * 0.75); g.fill();
  }
  g.beginPath(); g.arc(0, 0, Math.max(0.6, r * 0.22), 0, TAU); g.fillStyle = rgba(center, a); g.fill();
  g.restore();
}
// ประกาย 4 แฉก
function sparkle(g, x, y, r, a, rgb = WHITE) {
  if (a <= 0.01 || r <= 0.3) return;
  const q = r * 0.2;
  g.beginPath();
  g.moveTo(x, y - r); g.quadraticCurveTo(x + q, y - q, x + r, y); g.quadraticCurveTo(x + q, y + q, x, y + r);
  g.quadraticCurveTo(x - q, y + q, x - r, y); g.quadraticCurveTo(x - q, y - q, x, y - r);
  g.fillStyle = rgba(rgb, a); g.fill();
}
// วงรีหมุนได้ (ไม่ลากเส้นต่อจากจุดเดิม)
function ell(g, x, y, rx, ry, rot) { g.moveTo(x + Math.cos(rot) * rx, y + Math.sin(rot) * rx); g.ellipse(x, y, rx, ry, rot, 0, TAU); }
// ผีเสื้อ: flap = มุมกระพือ · ang = มุมลำตัว
function butterfly(g, x, y, s, flap, ang, rgb, a) {
  if (a <= 0.01 || s <= 0.5) return;
  const k = 0.2 + 0.8 * Math.abs(Math.cos(flap));
  g.save(); g.translate(x, y); g.rotate(ang);
  g.beginPath(); ell(g, -s * 0.42 * k, -s * 0.16, s * 0.48 * k, s * 0.34, -0.45); ell(g, s * 0.42 * k, -s * 0.16, s * 0.48 * k, s * 0.34, 0.45);
  g.fillStyle = rgba(rgb, a); g.fill();
  g.beginPath(); ell(g, -s * 0.3 * k, s * 0.2, s * 0.3 * k, s * 0.22, 0.5); ell(g, s * 0.3 * k, s * 0.2, s * 0.3 * k, s * 0.22, -0.5);
  g.fillStyle = rgba(CREAM, a * 0.9); g.fill();
  g.strokeStyle = rgba("70,40,30", a * 0.8); g.lineWidth = Math.max(0.8, s * 0.08); g.lineCap = "round";
  g.beginPath(); g.moveTo(0, -s * 0.35); g.lineTo(0, s * 0.4); g.stroke();
  g.restore();
}
// มงกุฎ: (x, y) = กลางฐาน · w = ความกว้าง px
function crown(g, x, y, w, a) {
  if (a <= 0.01 || w <= 1) return;
  const h = w * 0.62, pts = [[-0.5, 0], [0.5, 0], [0.54, 0.95], [0.27, 0.48], [0, 1.1], [-0.27, 0.48], [-0.54, 0.95]];
  g.save(); g.globalAlpha *= a;
  g.beginPath();
  pts.forEach(([u, v], i) => { const px = x + u * w, py = y - v * h; if (i) g.lineTo(px, py); else g.moveTo(px, py); });
  g.closePath();
  const gr = g.createLinearGradient(x, y - h, x, y);
  gr.addColorStop(0, "#fff6dc"); gr.addColorStop(0.45, "#f3c94b"); gr.addColorStop(1, "#b88020");
  g.fillStyle = gr; g.fill();
  g.strokeStyle = "rgba(120,72,10,.9)"; g.lineWidth = Math.max(1, w * 0.04); g.lineJoin = "round"; g.stroke();
  // แถบฐาน + อัญมณี
  g.fillStyle = "rgba(255,246,220,.85)"; g.fillRect(x - w * 0.5, y - h * 0.2, w, Math.max(1, h * 0.08));
  const gem = (px, py, r, c) => { g.beginPath(); g.arc(px, py, r, 0, TAU); g.fillStyle = c; g.fill(); };
  gem(x, y - h * 1.1, w * 0.07, "#f59ab8"); gem(x + w * 0.54, y - h * 0.95, w * 0.055, "#b5d86a"); gem(x - w * 0.54, y - h * 0.95, w * 0.055, "#b5d86a");
  gem(x, y - h * 0.1, w * 0.06, "#f59ab8"); gem(x - w * 0.28, y - h * 0.1, w * 0.045, "#f39a4b"); gem(x + w * 0.28, y - h * 0.1, w * 0.045, "#f39a4b");
  g.restore();
}
// เกล็ดหิมะ/ดอกน้ำแข็ง 6 แฉก
function frostFlake(g, x, y, r, a, rgb = WHITE) {
  if (a <= 0.01 || r <= 0.5) return;
  g.strokeStyle = rgba(rgb, a); g.lineWidth = Math.max(0.7, r * 0.14); g.lineCap = "round";
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const an = i * TAU / 6, c = Math.cos(an), s = Math.sin(an);
    g.moveTo(x, y); g.lineTo(x + c * r, y + s * r * 0.9);
    const mx = x + c * r * 0.55, my = y + s * r * 0.5, b = r * 0.28;
    g.moveTo(mx, my); g.lineTo(mx + Math.cos(an + 0.7) * b, my + Math.sin(an + 0.7) * b * 0.9);
    g.moveTo(mx, my); g.lineTo(mx + Math.cos(an - 0.7) * b, my + Math.sin(an - 0.7) * b * 0.9);
  }
  g.stroke();
}
// เส้นพระจันทร์เสี้ยวเรียวหัวท้าย (วงรี rx/ry รอบ c จากมุม a0 ยาว head ส่วนของ a0→a1) · layers = [[ตัวคูณความกว้าง, rgb, alpha]]
function crescent(g, cx, cy, rx, ry, a0, a1, head, W, layers, k = 1, tilt = 0) {
  if (head <= 0 || k <= 0.01) return;
  const N = 18, ct = Math.cos(tilt), st = Math.sin(tilt);
  const pt = (a) => { const ex = Math.cos(a) * rx, ey = Math.sin(a) * ry; return [cx + ex * ct - ey * st, cy + ex * st + ey * ct]; };
  g.lineCap = "round";
  const op = g.globalCompositeOperation;
  for (const [m, rgb, al, light] of layers) {
    if (light != null) g.globalCompositeOperation = light ? "lighter" : "source-over";
    g.strokeStyle = rgba(rgb, al * k);
    for (let i = 0; i < N; i++) {
      const u0 = i / N, u1 = (i + 1) / N, w = W * m * Math.sin(Math.PI * Math.min(1, (u0 + u1) / 2 * 1.05));
      if (w <= 0.2) continue;
      const p0 = pt(a0 + (a1 - a0) * head * u0), p1 = pt(a0 + (a1 - a0) * head * u1);
      g.lineWidth = w; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
    }
  }
  g.globalCompositeOperation = op;
}
// เสาแสงจากพื้น (x, y) สูง h ช่อง กว้าง r ช่อง
function pillar(g, x, y, r, h, rgb, a) {
  if (a <= 0.01) return;
  const p0 = P(x, y, 0), p1 = P(x, y, h), w = p0[2] * r;
  const gr = g.createLinearGradient(p0[0], p0[1], p1[0], p1[1]);
  gr.addColorStop(0, rgba(rgb, a)); gr.addColorStop(0.6, rgba(rgb, a * 0.35)); gr.addColorStop(1, rgba(rgb, 0));
  g.fillStyle = gr; g.fillRect(p0[0] - w, p1[1], w * 2, p0[1] - p1[1]);
  const gc = g.createLinearGradient(p0[0], p0[1], p1[0], p1[1]);
  gc.addColorStop(0, rgba(WHITE, a)); gc.addColorStop(1, rgba(WHITE, 0));
  g.fillStyle = gc; g.fillRect(p0[0] - w * 0.3, p1[1], w * 0.6, p0[1] - p1[1]);
}

// =================================================================== วงเวทลายเถาวัลย์ (บนระนาบนอนที่ความสูง z)
//  r = รัศมี (ช่อง) · rot = มุมหมุน · k = ความสว่าง 0..1 · o.rings 2 = วงนอกมีขีด + ประกาย · o.ice = โทนน้ำแข็ง
function vineSigil(g, cx, cy, z, r, rot, k, lowQ, o = {}) {
  if (k <= 0.01 || r <= 0.02) return;
  const ice = !!o.ice, sc = P(cx, cy, z)[2], lw = Math.max(1, sc * 0.02);
  const C1 = ice ? ICE : GOLD, C2 = ice ? ICE_M : LEAF, C3 = ice ? WHITE : LEAF, FL = ice ? FROST_PINK : PINK;
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  // เงาเข้มรองใต้ (ให้เห็นบนพื้นสว่าง)
  if (!lowQ) {
    g.globalCompositeOperation = "source-over";
    gEllipse(g, cx, cy, r, z, 48); g.strokeStyle = rgba(ice ? "40,80,130" : LEAF_DD, 0.32 * k); g.lineWidth = lw * 4.5; g.stroke();
  }
  g.globalCompositeOperation = "lighter";
  gEllipse(g, cx, cy, r, z, 56); g.strokeStyle = rgba(C1, 0.9 * k); g.lineWidth = lw * 1.6; g.stroke();
  gEllipse(g, cx, cy, r * 0.78, z, 48); g.strokeStyle = rgba(C2, 0.8 * k); g.lineWidth = lw; g.stroke();
  // เถาวัลย์คดเคี้ยวระหว่างวง
  const N = lowQ ? 64 : 110, wav = (a) => r * (0.89 + 0.075 * Math.sin(a * 10 + rot * 2.2));
  g.beginPath();
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * TAU, rr = wav(a), p = P(cx + Math.cos(a + rot * 0.3) * rr, cy + Math.sin(a + rot * 0.3) * rr, z);
    if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
  }
  g.strokeStyle = rgba(C3, 0.85 * k); g.lineWidth = lw * 1.1; g.stroke();
  // ใบไม้ตามยอดคลื่น
  if (!lowQ) {
    for (let i = 0; i < 10; i++) {
      const a = (i + 0.25) / 10 * TAU, rr = wav(a), a1 = a + rot * 0.3;
      const p = P(cx + Math.cos(a1) * rr, cy + Math.sin(a1) * rr, z), q = P(cx + Math.cos(a1 + 0.05) * rr, cy + Math.sin(a1 + 0.05) * rr, z);
      petal(g, p[0], p[1], p[2] * 0.09 * r, Math.atan2(q[1] - p[1], q[0] - p[0]) + (i % 2 ? 0.9 : -0.9), C2, 0.85 * k);
    }
  }
  // ดอกไม้ 5 ดอกบนวง
  for (let i = 0; i < 5; i++) {
    const a = rot + i * TAU / 5, p = P(cx + Math.cos(a) * r * 0.89, cy + Math.sin(a) * r * 0.89, z);
    flower(g, p[0], p[1], p[2] * 0.075 * Math.max(0.6, r), a * 2, 5, FL, C1, 0.9 * k, 0.6, null);
  }
  // ดอกกลาง (polar rose 6 กลีบ)
  g.beginPath();
  const RN = lowQ ? 72 : 120;
  for (let i = 0; i <= RN; i++) {
    const th = (i / RN) * TAU, rr = r * 0.52 * Math.abs(Math.cos(3 * th)), p = P(cx + Math.cos(th - rot) * rr, cy + Math.sin(th - rot) * rr, z);
    if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
  }
  g.strokeStyle = rgba(C1, 0.75 * k); g.lineWidth = lw * 0.9; g.stroke();
  gEllipse(g, cx, cy, r * 0.16, z, 24); g.strokeStyle = rgba(WHITE, 0.8 * k); g.lineWidth = lw * 0.8; g.stroke();
  if (o.rings >= 2) {
    const r2 = r * 1.16;
    gEllipse(g, cx, cy, r2, z, 64); g.strokeStyle = rgba(C1, 0.7 * k); g.lineWidth = lw; g.stroke();
    g.beginPath();
    const T = lowQ ? 18 : 32;
    for (let i = 0; i < T; i++) {
      const a = -rot * 0.7 + (i / T) * TAU, p0 = P(cx + Math.cos(a) * r * 1.03, cy + Math.sin(a) * r * 1.03, z), p1 = P(cx + Math.cos(a) * (i % 4 ? r * 1.1 : r2), cy + Math.sin(a) * (i % 4 ? r * 1.1 : r2), z);
      g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]);
    }
    g.strokeStyle = rgba(CREAM, 0.6 * k); g.lineWidth = lw * 0.8; g.stroke();
    for (let i = 0; i < 6; i++) {
      const a = rot * 0.8 + (i / 6) * TAU, p = P(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2, z);
      sparkle(g, p[0], p[1], Math.max(2, p[2] * 0.07), 0.95 * k, CREAM);
    }
  }
  g.restore();
}

// ประกายแตก + กลีบกระจาย (จอ) รอบจุด (cx, cy) · age 0..1 · cols = สีกลีบ
function petalBurst(g, cx, cy, s, age, seed, n, size, cols, lowQ, grav = 0.6) {
  if (age <= 0 || age >= 1) return;
  const N = lowQ ? Math.ceil(n / 2) : n, k = 1 - age;
  for (let i = 0; i < N; i++) {
    const a = hash01(seed + i) * TAU, sp = 0.55 + hash01(seed + i * 3.1) * 0.7, d = s * size * easeOut3(age) * sp;
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.75 + s * grav * age * age;
    petal(g, x, y, s * (0.07 + 0.05 * hash01(seed + i * 7.7)) * (0.6 + 0.4 * k), a + age * 6 * (i % 2 ? 1 : -1), cols[i % cols.length], k);
  }
}
function sparkRing(g, cx, cy, s, age, seed, n, size, rgb, lowQ) {
  if (age <= 0 || age >= 1) return;
  const N = lowQ ? Math.ceil(n / 2) : n, k = 1 - age;
  for (let i = 0; i < N; i++) {
    const a = hash01(seed + i * 1.3) * TAU, d = s * size * easeOut3(age) * (0.6 + 0.5 * hash01(seed + i * 5.3));
    sparkle(g, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, s * 0.09 * k * (0.6 + 0.6 * hash01(seed + i)), k, i % 3 ? rgb : WHITE);
  }
}

// =================================================================== ตีปกติ
function styleT(e, now) { return (now - e.t0) / CELINE_MS[e.kind]; }
function ends(e) {
  const n0 = Math.max(1, e.size | 0), tn = Math.max(1, e.toSize | 0), to = okT(e.to) ? e.to : { x: e.x, y: e.y - 1 };
  return { A: bodyOf(e.x, e.y, n0), B: bodyOf(to.x, to.y, tn), WA: [e.x + n0 / 2, e.y + n0 / 2], WB: [to.x + tn / 2, to.y + tn / 2], n0, tn };
}
const PINK_SLASH = [[2.4, PINK_D, 0.55, 0], [1.4, PINK, 0.9, 0], [0.45, WHITE, 1, 1]];
// ดาบเล็ก: เงาพุ่ง → ฟันคู่ไขว้
function daggerFx(g, e, now, lowQ) {
  const t = styleT(e, now);
  if (t <= 0 || t >= 1) return;
  const { A, B } = ends(e), HIT = CELINE_HIT_P.celineDagger, s = B.s, [hx, hy] = B.top;
  g.save(); g.globalCompositeOperation = "lighter";
  // เงาพุ่งชมพู (afterimage) จากตัวผู้ตีไปหาเป้า
  if (t < HIT + 0.08) {
    const u = clamp01(t / HIT), k = t < HIT ? 1 : 1 - (t - HIT) / 0.08;
    const [ax, ay] = A.top, x1 = lerp(ax, hx, easeIn2(u)), y1 = lerp(ay, hy, easeIn2(u)), x0 = lerp(ax, hx, Math.max(0, easeIn2(u) - 0.45)), y0 = lerp(ay, hy, Math.max(0, easeIn2(u) - 0.45));
    g.lineCap = "round";
    for (const [w, c, al] of [[0.26, PINK_D, 0.25], [0.14, PINK, 0.55], [0.05, WHITE, 0.9]]) {
      g.strokeStyle = rgba(c, al * k); g.lineWidth = Math.max(1, s * w); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    }
    if (!lowQ) for (let i = 0; i < 5; i++) {
      const q = clamp01(u - i * 0.12);
      if (q <= 0) continue;
      petal(g, lerp(ax, hx, easeIn2(q)) + Math.sin(i * 2.1) * s * 0.12, lerp(ay, hy, easeIn2(q)) - Math.cos(i * 1.7) * s * 0.1, s * 0.07, i + t * 9, i % 2 ? PINK : CREAM, 0.8 * k);
    }
  }
  // ฟันที่ 1 (ทแยงซ้ายบน → ขวาล่าง) · ฟันที่ 2 ไขว้
  const sl = (t0, a0, a1, seed) => {
    if (t < t0) return;
    const h = clamp01((t - t0) / 0.1), k = clamp01(1 - (t - t0 - 0.12) / 0.3);
    crescent(g, hx, hy, s * 0.66, s * 0.5, a0, a1, easeOut3(h), s * 0.085, PINK_SLASH, k);
    if (h >= 1 || t - t0 > 0.05) {
      const age = clamp01((t - t0) / 0.5);
      glow(g, hx, hy, s * 0.6 * (1 - age), PINK, 0.5 * (1 - age));
      g.globalCompositeOperation = "source-over";
      petalBurst(g, hx, hy, s, age, seed, 12, 1.1, [PINK, CREAM, PINK_D, GOLD], lowQ);
      g.globalCompositeOperation = "lighter";
      sparkRing(g, hx, hy, s, age, seed + 50, 8, 0.9, CREAM, lowQ);
    }
  };
  sl(HIT - 0.04, -2.5, -0.2, 11);
  sl(HIT + 0.12, -0.7, 2.1, 37);
  g.restore();
}
// ดาบมังกรแดง: มังกรเลื้อยโค้ง → ดิ่งงับ → เสี้ยวแดง + กลีบกุหลาบ → ร่างสลายเป็นกลีบ
function dragonPath(WA, WB, u) {
  const fx = WB[0] - WA[0], fy = WB[1] - WA[1], L = Math.hypot(fx, fy) || 1, px = -fy / L, py = fx / L;
  const lat = Math.sin(u * Math.PI * 2) * 0.75 * (1 - u * 0.45);
  return [WA[0] + fx * u + px * lat, WA[1] + fy * u + py * lat, 0.8 + Math.sin(u * Math.PI) * 1.35 - u * 0.25];
}
function dragonFx(g, e, now, lowQ) {
  const t = styleT(e, now);
  if (t <= 0 || t >= 1) return;
  const { B, WA, WB } = ends(e), HIT = CELINE_HIT_P.celineDragon, s = B.s, [hx, hy] = B.top;
  const hp = t < HIT ? easeInOut(t / HIT) : 1;
  const fade = t < HIT ? 1 : clamp01(1 - (t - HIT) / (1 - HIT) * 1.4);
  const tail = t < HIT ? Math.max(0, hp - 0.85) : Math.min(1, 0.15 + (t - HIT) / (1 - HIT) * 1.6);
  g.save();
  // ร่างมังกร (เส้นหนาเรียวไปหาง · 3 ชั้นสี)
  if (fade > 0.01 && hp > tail) {
    const N = lowQ ? 14 : 26, pts = [];
    for (let i = 0; i <= N; i++) { const u = lerp(tail, hp, i / N), w = dragonPath(WA, WB, u); pts.push(P(w[0], w[1], w[2])); }
    g.lineCap = "round"; g.lineJoin = "round";
    for (const [m, c, al, light] of [[1.5, CRIMSON_D, 0.55, 0], [1, CRIMSON, 0.85, 0], [0.42, EMBER, 0.8, 1]]) {
      g.globalCompositeOperation = light ? "lighter" : "source-over";
      g.strokeStyle = rgba(c, al * fade);
      for (let i = 0; i < N; i++) {
        const w = s * 0.27 * m * (0.25 + 0.75 * (i / N));
        g.lineWidth = Math.max(1, w); g.beginPath(); g.moveTo(pts[i][0], pts[i][1]); g.lineTo(pts[i + 1][0], pts[i + 1][1]); g.stroke();
      }
    }
    // เกล็ดทอง
    if (!lowQ) {
      g.globalCompositeOperation = "lighter"; g.strokeStyle = rgba(GOLD, 0.7 * fade); g.lineWidth = Math.max(1, s * 0.02);
      for (let i = 3; i < N - 1; i += 3) {
        const p = pts[i], r = s * 0.06 * (0.4 + 0.6 * i / N);
        g.beginPath(); g.arc(p[0], p[1], r, Math.PI * 0.1, Math.PI * 0.9); g.stroke();
      }
    }
    // หัวมังกร
    if (t < HIT + 0.12) {
      const hd = pts[N], pv = pts[N - 1], ang = Math.atan2(hd[1] - pv[1], hd[0] - pv[0]), hs = s * 0.34, open = t < HIT ? 0.25 + 0.35 * Math.sin(t * 30) * 0.5 + 0.2 : 0.7;
      g.save(); g.translate(hd[0], hd[1]); g.rotate(ang);
      g.globalCompositeOperation = "source-over";
      // แผงคอไฟ (กลีบไฟชี้ไปข้างหลัง)
      g.beginPath();
      for (let i = 0; i < 5; i++) petalPath(g, -hs * 0.2, 0, hs * (0.9 + 0.2 * Math.sin(now / 50 + i)), hs * 0.22, Math.PI + (i - 2) * 0.32);
      g.fillStyle = rgba(ORANGE, 0.8 * fade); g.fill();
      // ขากรรไกรบน/ล่าง
      g.fillStyle = rgba(CRIMSON, fade);
      g.beginPath(); g.moveTo(-hs * 0.3, -hs * 0.05); g.lineTo(hs * 0.95, -hs * 0.12 - open * hs * 0.35); g.lineTo(hs * 0.2, -hs * 0.42); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(-hs * 0.3, hs * 0.05); g.lineTo(hs * 0.85, hs * 0.1 + open * hs * 0.32); g.lineTo(hs * 0.15, hs * 0.32); g.closePath(); g.fill();
      // เขา
      g.strokeStyle = rgba(GOLD, fade); g.lineWidth = Math.max(1, hs * 0.08); g.lineCap = "round";
      g.beginPath(); g.moveTo(0, -hs * 0.35); g.quadraticCurveTo(-hs * 0.4, -hs * 0.8, -hs * 0.75, -hs * 0.7); g.stroke();
      // ตา
      g.globalCompositeOperation = "lighter";
      glow(g, hs * 0.25, -hs * 0.2, hs * 0.3, GOLD, 0.8 * fade);
      g.fillStyle = rgba(WHITE, fade); g.beginPath(); g.arc(hs * 0.25, -hs * 0.2, Math.max(1, hs * 0.07), 0, TAU); g.fill();
      g.restore();
    }
    // ประกายไฟตามตัว
    if (!lowQ) {
      g.globalCompositeOperation = "lighter";
      for (let i = 0; i < 8; i++) {
        const u = lerp(tail, hp, hash01(i + 3)), w = dragonPath(WA, WB, u), p = P(w[0], w[1], w[2] + 0.1 + 0.25 * ((now / 700 + hash01(i)) % 1));
        sparkle(g, p[0], p[1], s * 0.05, 0.8 * fade, EMBER);
      }
    }
    // ร่างสลายเป็นกลีบกุหลาบแดง
    if (t > HIT) {
      g.globalCompositeOperation = "source-over";
      const age = clamp01((t - HIT) / (1 - HIT)), M = lowQ ? 8 : 18;
      for (let i = 0; i < M; i++) {
        const u = hash01(i * 2.3 + 1), w = dragonPath(WA, WB, u), dz = age * (0.4 + hash01(i) * 0.6), dx = Math.sin(i * 1.7 + age * 4) * 0.2 * age;
        const p = P(w[0] + dx, w[1], Math.max(0.05, w[2] - dz * 1.2 + 0.2 * Math.sin(age * 6 + i)));
        petal(g, p[0], p[1], s * 0.08, i + age * 7, i % 3 ? CRIMSON : PINK_D, (1 - age) * (u < tail + 0.1 ? 1 : 0.6));
      }
    }
  }
  // ปะทะ: เสี้ยวแดงใหญ่ + กุหลาบแตก + ประกายทอง
  if (t >= HIT) {
    const age = clamp01((t - HIT) / 0.5);
    g.globalCompositeOperation = "lighter";
    glow(g, hx, hy, s * (0.9 + 0.6 * age), CRIMSON, 0.7 * (1 - age));
    crescent(g, hx, hy, s * 0.82, s * 0.44, -2.9, 0.3, easeOut3(clamp01(age * 4)), s * 0.13, [[2.4, CRIMSON_D, 0.5, 0], [1.5, CRIMSON, 0.85, 0], [0.6, EMBER, 0.9, 1], [0.25, WHITE, 1, 1]], 1 - age, -0.35);
    g.globalCompositeOperation = "source-over";
    petalBurst(g, hx, hy, s, age, 71, 16, 1.3, [CRIMSON, PINK_D, CRIMSON, GOLD], lowQ);
    g.globalCompositeOperation = "lighter";
    sparkRing(g, hx, hy, s, age, 91, 10, 1.1, GOLD, lowQ);
  }
  g.restore();
}
// ดาบใหญ่: ดาบทองยักษ์ทิ้งดิ่ง → เสี้ยวทอง + คลื่นกระแทก + วงดอกไม้บาน + ลำแสง
function bigSword(g, x, y, L, W, a, rgbBlade = GOLD) {
  // (x, y) = ปลายดาบ (ชี้ลง) · L = ความยาวใบ px
  if (a <= 0.01) return;
  g.save(); g.globalAlpha *= a;
  const tip = [x, y], base = [x, y - L];
  g.beginPath(); g.moveTo(tip[0], tip[1]); g.lineTo(base[0] + W / 2, base[1] + L * 0.18); g.lineTo(base[0] + W / 2, base[1]); g.lineTo(base[0] - W / 2, base[1]); g.lineTo(base[0] - W / 2, base[1] + L * 0.18); g.closePath();
  const gr = g.createLinearGradient(x - W / 2, 0, x + W / 2, 0);
  gr.addColorStop(0, rgba(GOLD_D, 1)); gr.addColorStop(0.45, rgba(CREAM, 1)); gr.addColorStop(0.55, rgba(WHITE, 1)); gr.addColorStop(1, rgba(rgbBlade, 1));
  g.fillStyle = gr; g.fill(); g.strokeStyle = "rgba(120,72,10,.85)"; g.lineWidth = Math.max(1, W * 0.06); g.stroke();
  // เส้นกลางใบ
  g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = Math.max(1, W * 0.05); g.beginPath(); g.moveTo(x, base[1] + 2); g.lineTo(x, y - L * 0.08); g.stroke();
  // โกร่ง + ด้าม + ดอกไม้กลางโกร่ง
  g.fillStyle = "#f3c94b"; g.strokeStyle = "rgba(120,72,10,.9)";
  g.beginPath(); g.moveTo(x - W * 1.4, base[1]); g.quadraticCurveTo(x, base[1] - W * 0.6, x + W * 1.4, base[1]); g.quadraticCurveTo(x, base[1] - W * 0.15, x - W * 1.4, base[1]); g.fill(); g.stroke();
  g.fillStyle = "#7a4a18"; g.fillRect(x - W * 0.16, base[1] - L * 0.3, W * 0.32, L * 0.3);
  g.beginPath(); g.arc(x, base[1] - L * 0.32, W * 0.24, 0, TAU); g.fillStyle = "#f3c94b"; g.fill();
  flower(g, x, base[1] - W * 0.12, W * 0.36, 0, 5, PINK, GOLD, 1, 1, CREAM);
  g.restore();
}
function greatFx(g, e, now, lowQ) {
  const t = styleT(e, now);
  if (t <= 0 || t >= 1) return;
  const { B, WB, tn } = ends(e), HIT = CELINE_HIT_P.celineGreat, s = B.s, [hx, hy] = B.top;
  g.save();
  // ดาบทองยักษ์ลอยเหนือเป้าแล้วทิ้งดิ่ง
  const L = s * 1.6, W = s * 0.34;
  if (t < HIT + 0.22) {
    const u = clamp01(t / HIT), fall = u < 0.45 ? 0 : easeIn2((u - 0.45) / 0.55), appear = clamp01(t / 0.12);
    const tipY = lerp(hy - s * 2.6, hy + s * 0.15, fall), k = t < HIT ? appear : clamp01(1 - (t - HIT) / 0.22);
    g.globalCompositeOperation = "lighter";
    glow(g, hx, tipY - L * 0.5, s * (0.9 + 0.3 * Math.sin(now / 90)), GOLD, 0.45 * k);
    // หางความเร็วตอนดิ่ง
    if (fall > 0 && t < HIT) {
      const gr = g.createLinearGradient(hx, tipY - L * 2.2, hx, tipY);
      gr.addColorStop(0, rgba(GOLD, 0)); gr.addColorStop(1, rgba(CREAM, 0.6 * fall));
      g.fillStyle = gr; g.fillRect(hx - W * 0.7, tipY - L * 2.2, W * 1.4, L * 2.2);
    }
    g.globalCompositeOperation = "source-over";
    bigSword(g, hx, tipY, L, W, k);
    if (t < HIT * 0.5) sparkRing(g, hx, hy - s * 2.4, s, clamp01(t / (HIT * 0.5)), 5, 8, 0.9, GOLD, lowQ);
  }
  if (t >= HIT) {
    const age = clamp01((t - HIT) / (1 - HIT)), q = easeOut3(age);
    g.globalCompositeOperation = "lighter";
    // แฟลช + เสี้ยวทองกว้าง (ฟันลงพื้น)
    glow(g, hx, hy, s * (1.2 + age), GOLD, 0.8 * (1 - age));
    glow(g, B.bx, B.by, s * 0.8, WHITE, 0.7 * clamp01(1 - age * 3));
    crescent(g, hx, hy + s * 0.2, s * 1.1, s * 0.55, -3.0, 0.15, easeOut3(clamp01(age * 5)), s * 0.15, [[2.2, GOLD_D, 0.5, 0], [1.4, GOLD, 0.9, 0], [0.6, CREAM, 0.95, 1], [0.22, WHITE, 1, 1]], clamp01(1 - age * 1.5), 0.15);
    // คลื่นกระแทกบนพื้น 3 วง
    for (let j = 0; j < 3; j++) {
      const a = clamp01((age - j * 0.08) / 0.6);
      if (a <= 0 || a >= 1) continue;
      gEllipse(g, WB[0], WB[1], (0.3 + 1.6 * easeOut3(a)) * tn, 0.02, 56);
      g.strokeStyle = rgba(j === 1 ? CREAM : GOLD, 0.9 * (1 - a)); g.lineWidth = Math.max(1, 5 * (1 - a) + 1); g.stroke();
    }
    // ลำแสงพุ่งขึ้นรอบวง
    if (!lowQ && age < 0.6) {
      const k = 1 - age / 0.6;
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * TAU + 0.3, r = (0.5 + 0.6 * q) * tn, x = WB[0] + Math.cos(a) * r, y = WB[1] + Math.sin(a) * r;
        pillar(g, x, y, 0.05, 0.8 + hash01(i) * 0.9, GOLD, 0.6 * k);
      }
    }
    // รอยแตกรูปดอกไม้บนพื้น
    g.globalCompositeOperation = "source-over";
    if (age < 0.85) {
      g.strokeStyle = rgba("120,72,10", 0.5 * (1 - age / 0.85)); g.lineWidth = Math.max(1, s * 0.025);
      g.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU + 0.2, p0 = P(WB[0], WB[1], 0.01), p1 = P(WB[0] + Math.cos(a) * 0.55 * tn, WB[1] + Math.sin(a) * 0.55 * tn, 0.01), p2 = P(WB[0] + Math.cos(a + 0.25) * 0.75 * tn, WB[1] + Math.sin(a + 0.25) * 0.75 * tn, 0.01);
        g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]);
      }
      g.stroke();
    }
    // วงดอกไม้บานออก
    const NF = lowQ ? 6 : 10;
    for (let i = 0; i < NF; i++) {
      const a = i / NF * TAU, pop = easeOutBack(clamp01((age - 0.04 - i * 0.012) / 0.25)), r = (0.45 + 0.85 * q) * tn;
      const p = P(WB[0] + Math.cos(a) * r, WB[1] + Math.sin(a) * r, 0.04);
      flower(g, p[0], p[1], p[2] * 0.16 * pop, a, 5, FLOWER_COLS[i % 4], i % 4 === 1 ? ORANGE : GOLD, clamp01(1.4 - age * 1.4), 0.6);
    }
    // กลีบ/ฝุ่นทองปลิวขึ้น
    petalBurst(g, hx, hy, s, clamp01(age * 1.4), 113, 16, 1.7, [GOLD, PINK, CREAM, LEAF], lowQ, 0.9);
    g.globalCompositeOperation = "lighter";
    sparkRing(g, hx, hy, s, clamp01(age * 1.3), 131, 12, 1.6, GOLD, lowQ);
  }
  g.restore();
}
// เวทย์ไฟ: วงเวท → ลูกไฟโค้ง หางกลีบไฟ → ดอกไฟบาน
function arcPoint(WA, WB, za, zb, lift, u) { return [lerp(WA[0], WB[0], u), lerp(WA[1], WB[1], u), lerp(za, zb, u) + Math.sin(Math.PI * u) * lift]; }
function fireFx(g, e, now, lowQ) {
  const t = styleT(e, now);
  if (t <= 0 || t >= 1) return;
  const { A, B, WA, WB, n0 } = ends(e), HIT = CELINE_HIT_P.celineFire, s = B.s, [hx, hy] = B.top, CAST = 0.15;
  const rot = (REDUCED ? 0 : now / 300) + e.t0 * 0.001;
  g.save();
  // วงเวทใต้เท้าผู้ร่าย + แสงที่มือ
  if (t < HIT + 0.1) {
    const k = t < CAST ? t / CAST : clamp01(1 - (t - CAST) / (HIT + 0.1 - CAST));
    vineSigil(g, WA[0], WA[1], 0.02, 0.5 * n0, rot, k, lowQ);
    g.globalCompositeOperation = "lighter";
    const [ax, ay] = A.top;
    glow(g, ax, ay, A.s * 0.5, ORANGE, 0.6 * k);
  }
  const u = clamp01((t - CAST) / (HIT - CAST));
  const at = (q) => { const w = arcPoint(WA, WB, 0.85, 0.65, 0.7, easeIn2(q) * 0.4 + q * 0.6); return P(w[0], w[1], w[2]); };
  if (t >= CAST && t < HIT) {
    g.globalCompositeOperation = "lighter";
    // หางกลีบไฟ
    const TR = lowQ ? 6 : 12;
    for (let k = TR; k >= 1; k--) {
      const q = u - k * 0.045;
      if (q <= 0) continue;
      const p = at(q), f = 1 - k / (TR + 1), jit = Math.sin(k * 2.7 + now / 60) * s * 0.06;
      petal(g, p[0] + jit, p[1] - jit * 0.5, s * 0.11 * f + 1, k * 1.3 + now / 120, k % 3 === 0 ? PINK : k % 3 === 1 ? ORANGE : EMBER, 0.85 * f);
    }
    const p = at(u), p0 = at(Math.max(0, u - 0.05)), ang = Math.atan2(p0[1] - p[1], p0[0] - p[0]);
    glow(g, p[0], p[1], s * 1.0, ORANGE, 0.6);
    glow(g, p[0], p[1], s * 0.5, PINK, 0.55);
    // ลิ้นไฟชี้ไปข้างหลัง
    g.beginPath();
    for (let i = 0; i < 5; i++) petalPath(g, p[0], p[1], s * (0.32 + 0.1 * Math.sin(now / 40 + i * 1.9)), s * 0.1, ang + (i - 2) * 0.3);
    g.fillStyle = rgba(ORANGE, 0.75); g.fill();
    glow(g, p[0], p[1], s * 0.2, WHITE, 0.95);
    flower(g, p[0], p[1], s * 0.16, now / 80, 5, EMBER, WHITE, 0.9, 1, CREAM);
  }
  // ระเบิดบานเป็นดอกไฟ
  if (t >= HIT) {
    const age = clamp01((t - HIT) / (1 - HIT)), q = easeOut3(clamp01(age * 1.6)), k = clamp01(1 - (age - 0.25) / 0.75);
    g.globalCompositeOperation = "lighter";
    glow(g, hx, hy, s * (1 + age * 0.8), ORANGE, 0.75 * (1 - age));
    glow(g, hx, hy, s * 0.45, WHITE, 0.9 * clamp01(1 - age * 4));
    const sp = (REDUCED ? 0 : age * 0.8);
    g.globalCompositeOperation = "source-over";
    g.beginPath();
    for (let i = 0; i < 8; i++) petalPath(g, hx, hy, s * (0.35 + 0.65 * q), s * 0.26 * (0.5 + 0.5 * q), sp + i * TAU / 8);
    g.fillStyle = rgba(ORANGE, 0.55 * k); g.fill();
    g.beginPath();
    for (let i = 0; i < 8; i++) petalPath(g, hx, hy, s * (0.25 + 0.42 * q), s * 0.18 * (0.5 + 0.5 * q), -sp + (i + 0.5) * TAU / 8);
    g.fillStyle = rgba(PINK, 0.6 * k); g.fill();
    g.globalCompositeOperation = "lighter";
    flower(g, hx, hy, s * 0.22 * (0.6 + 0.4 * q), sp * 2, 6, CREAM, EMBER, 0.85 * k, 1, null);
    gEllipse(g, WB[0], WB[1], 0.3 + 1.1 * q, 0.03, 40);
    g.strokeStyle = rgba(ORANGE, 0.8 * (1 - age)); g.lineWidth = Math.max(1, 4 * (1 - age)); g.stroke();
    // ถ่านลอยขึ้น
    const NE = lowQ ? 7 : 16;
    for (let i = 0; i < NE; i++) {
      const a = hash01(i + 9) * TAU, r = s * (0.2 + 0.6 * hash01(i * 3)) * q, rise = s * (0.3 + hash01(i * 7) * 1.1) * age;
      petal(g, hx + Math.cos(a) * r, hy + Math.sin(a) * r * 0.6 - rise, s * 0.05 * (1 - age) + 0.5, a + age * 5, i % 2 ? EMBER : PINK, 1 - age);
    }
    // รอยไหม้รูปดอกไม้บนพื้น
    g.globalCompositeOperation = "source-over";
    const pg = P(WB[0], WB[1], 0.01);
    flower(g, pg[0], pg[1], pg[2] * 0.42, 0.4, 6, "150,60,30", "90,30,10", 0.32 * (1 - age), 0.55, null);
  }
  g.restore();
}
// เวทย์ลม: เกลียวพายุ → ทอร์นาโดที่เป้า
function windFx(g, e, now, lowQ) {
  const t = styleT(e, now);
  if (t <= 0 || t >= 1) return;
  const { A, B, WA, WB, n0, tn } = ends(e), HIT = CELINE_HIT_P.celineWind, s = B.s, [hx, hy] = B.top, CAST = 0.1;
  const fx = WB[0] - WA[0], fy = WB[1] - WA[1], L = Math.hypot(fx, fy) || 1, px = -fy / L, py = fx / L;
  const rot = (REDUCED ? 0 : now / 360) + e.t0 * 0.001;
  g.save();
  if (t < HIT) {
    const k = t < CAST ? t / CAST : 1 - (t - CAST) / (HIT - CAST) * 0.6;
    vineSigil(g, WA[0], WA[1], 0.02, 0.48 * n0, rot, k, lowQ);
    g.globalCompositeOperation = "lighter";
    glow(g, A.top[0], A.top[1], A.s * 0.45, LEAF, 0.5 * k);
  }
  const u = clamp01((t - CAST) / (HIT - CAST)), headU = easeInOut(u) * 0.55 + u * 0.45;
  const pos = (q, ph, rr) => P(WA[0] + fx * q + px * Math.cos(ph) * rr, WA[1] + fy * q + py * Math.cos(ph) * rr, 0.75 - 0.1 * q + Math.sin(ph) * rr);
  if (t >= CAST && t < HIT + 0.12) {
    const k = t < HIT ? 1 : 1 - (t - HIT) / 0.12, tail = Math.max(0, headU - 0.7), N = lowQ ? 22 : 40;
    g.globalCompositeOperation = "lighter"; g.lineCap = "round";
    for (let j = 0; j < (lowQ ? 2 : 3); j++) {
      g.beginPath();
      for (let i = 0; i <= N; i++) {
        const q = lerp(tail, headU, i / N), grow = (i / N), ph = q * 22 + j * TAU / 3 - now / 45;
        const p = pos(q, ph, 0.08 + 0.22 * grow);
        if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
      }
      g.strokeStyle = rgba(j === 0 ? WHITE : j === 1 ? LEAF : CREAM, 0.7 * k); g.lineWidth = Math.max(1, s * (j === 0 ? 0.035 : 0.05)); g.stroke();
    }
    // ใบไม้/กลีบโคจรรอบหัวพายุ
    const NL = lowQ ? 4 : 8;
    for (let i = 0; i < NL; i++) {
      const ph = now / 70 + i * TAU / NL, p = pos(headU - 0.03 * (i % 3), ph, 0.32);
      petal(g, p[0], p[1], s * 0.09, ph * 1.3, i % 3 === 2 ? PINK : i % 2 ? LEAF : LEAF_D, 0.9 * k);
    }
    const hp = pos(headU, 0, 0);
    glow(g, hp[0], hp[1], s * 0.5, LEAF, 0.45 * k);
  }
  if (t >= HIT) {
    const age = clamp01((t - HIT) / (1 - HIT)), k = clamp01(1 - (age - 0.3) / 0.7), spin = REDUCED ? 0 : now / 80;
    g.globalCompositeOperation = "lighter";
    glow(g, hx, hy, s * 0.8, LEAF, 0.5 * (1 - age));
    // ทอร์นาโด: วงซ้อนสูงขึ้น
    const R = lowQ ? 5 : 8;
    for (let i = 0; i < R; i++) {
      const z = 0.05 + i * 0.22 * (0.5 + 0.5 * easeOut3(clamp01(age * 3))), r = (0.18 + i * 0.07) * tn * (0.6 + 0.4 * k);
      const off = Math.sin(spin * 0.5 + i * 0.8) * 0.06;
      gEllipse(g, WB[0] + off, WB[1], r, z * tn, 28);
      g.strokeStyle = rgba(i % 2 ? WHITE : LEAF, 0.65 * k); g.lineWidth = Math.max(1, s * 0.025); g.stroke();
    }
    // ใบไม้ปลิวออกเป็นเกลียว
    const NL = lowQ ? 8 : 16;
    for (let i = 0; i < NL; i++) {
      const a = hash01(i + 41) * TAU + age * 5, r = (0.2 + 1.1 * easeOut3(age) * (0.5 + hash01(i * 2) * 0.6)) * tn, z = (0.2 + hash01(i * 5) * 1.2 + age * 0.6) * tn;
      const p = P(WB[0] + Math.cos(a) * r, WB[1] + Math.sin(a) * r, z);
      petal(g, p[0], p[1], s * 0.1, a * 2 + spin * 0.2, i % 4 === 3 ? PINK : i % 2 ? LEAF : LEAF_D, 1 - age);
    }
    gEllipse(g, WB[0], WB[1], 0.4 + 1.2 * easeOut3(age), 0.02, 40);
    g.strokeStyle = rgba(LEAF, 0.7 * (1 - age)); g.lineWidth = Math.max(1, 3 * (1 - age)); g.stroke();
  }
  g.restore();
}
// สายฟ้าซิกแซก (จอ) จาก a → b · seed เปลี่ยนทุก ~45 ms = กระพริบ
function boltPath(g, a, b, seed, jit, segs = 8) {
  g.beginPath(); g.moveTo(a[0], a[1]);
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  for (let i = 1; i < segs; i++) {
    const u = i / segs, o = (hash01(seed * 13 + i) - 0.5) * 2 * jit * Math.sin(Math.PI * u);
    g.lineTo(a[0] + dx * u + nx * o, a[1] + dy * u + ny * o);
  }
  g.lineTo(b[0], b[1]);
}
function strokeBolt(g, a, b, seed, jit, s, k, segs) {
  for (const [w, c, al] of [[0.16, GOLD, 0.35], [0.07, BOLT, 0.8], [0.025, WHITE, 1]]) {
    boltPath(g, a, b, seed, jit, segs); g.strokeStyle = rgba(c, al * k); g.lineWidth = Math.max(1, s * w); g.stroke();
  }
}
// ประกายรูปดอกไม้ (เส้นกลีบ 5 กลีบ)
function sparkFlower(g, x, y, r, rot, a, rgb = BOLT) {
  if (a <= 0.01 || r <= 0.5) return;
  g.beginPath();
  for (let i = 0; i < 5; i++) petalPath(g, x, y, r, r * 0.42, rot + i * TAU / 5);
  g.strokeStyle = rgba(rgb, a); g.lineWidth = Math.max(0.8, r * 0.12); g.stroke();
  g.fillStyle = rgba(WHITE, a); g.beginPath(); g.arc(x, y, Math.max(0.8, r * 0.16), 0, TAU); g.fill();
}
const SKY_Z = 2.9;
function thunderFx(g, e, now, lowQ) {
  const t = styleT(e, now);
  if (t <= 0 || t >= 1) return;
  const { A, B, WB, tn } = ends(e), HIT = CELINE_HIT_P.celineThunder, s = B.s, [hx, hy] = B.top;
  const rot = (REDUCED ? 0 : now / (t < HIT ? 260 - 160 * t / HIT : 200)) + e.t0 * 0.001;
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  // วงเวทกลางฟ้าเหนือเป้า
  const sk = t < HIT ? easeOut3(t / HIT) : clamp01(1 - (t - HIT) / 0.4);
  vineSigil(g, WB[0], WB[1], SKY_Z * tn, 0.75 * tn * (0.5 + 0.5 * sk), rot, sk, lowQ, { rings: 2 });
  g.globalCompositeOperation = "lighter";
  const sky = P(WB[0], WB[1], SKY_Z * tn);
  // สายไฟจากมือผู้ร่ายขึ้นหาวงเวท (ระหว่างชาร์จ)
  if (t > 0.05 && t < HIT) {
    const k = clamp01((t - 0.05) / 0.1) * (0.6 + 0.4 * Math.sin(now / 30));
    strokeBolt(g, A.top, [sky[0], sky[1]], Math.floor(now / 45), s * 0.25, A.s * 0.6, k * 0.8, 7);
    glow(g, A.top[0], A.top[1], A.s * 0.4, BOLT, 0.5 * k);
    // ละอองทองไหลเข้ากลางวง
    if (!lowQ) for (let i = 0; i < 10; i++) {
      const q = ((now / 600) + hash01(i)) % 1, a = hash01(i * 3) * TAU, r = 0.9 * (1 - q) * tn;
      const p = P(WB[0] + Math.cos(a) * r, WB[1] + Math.sin(a) * r, SKY_Z * tn);
      sparkle(g, p[0], p[1], s * 0.05, Math.sin(Math.PI * q), BOLT);
    }
  }
  if (t >= HIT) {
    const age = clamp01((t - HIT) / (1 - HIT)), seed = Math.floor(now / 45), k = age < 0.45 ? 1 : clamp01(1 - (age - 0.45) / 0.35);
    // สายฟ้าหลัก + กิ่ง
    if (k > 0.01) {
      const ground = [B.bx, B.by - s * 0.1];
      strokeBolt(g, [sky[0], sky[1]], ground, seed, s * 0.35, s * 1.1, k, 10);
      if (!lowQ) for (let j = 0; j < 2; j++) {
        const u = 0.35 + j * 0.25, bx = lerp(sky[0], ground[0], u), by = lerp(sky[1], ground[1], u);
        strokeBolt(g, [bx, by], [bx + (j ? 1 : -1) * s * (0.6 + 0.3 * hash01(seed + j)), by + s * 0.5], seed + 7 + j, s * 0.15, s * 0.5, k * 0.8, 5);
      }
    }
    glow(g, hx, hy, s * (1.1 + age), BOLT, 0.8 * (1 - age));
    glow(g, B.bx, B.by, s * 0.7, WHITE, 0.8 * clamp01(1 - age * 4));
    // ประกายรูปดอกไม้รอบเป้า
    const NF = lowQ ? 4 : 7;
    for (let i = 0; i < NF; i++) {
      const st = i * 0.035, a = clamp01((age - st) / 0.45);
      if (a <= 0 || a >= 1) continue;
      const an = hash01(i + 17) * TAU, r = s * (0.35 + 0.55 * hash01(i * 3.3)) * (0.6 + 0.4 * easeOut3(a));
      sparkFlower(g, hx + Math.cos(an) * r, hy + Math.sin(an) * r * 0.8, s * 0.13 * easeOutBack(clamp01(a * 2.5)), an + a * 3, 1 - a);
    }
    gEllipse(g, WB[0], WB[1], 0.3 + 1.3 * easeOut3(age), 0.02, 40);
    g.strokeStyle = rgba(BOLT, 0.85 * (1 - age)); g.lineWidth = Math.max(1, 4 * (1 - age)); g.stroke();
    // ไฟฟ้าตกค้างไต่รอบตัว
    if (!lowQ && age > 0.2 && age < 0.9) {
      const kk = 1 - (age - 0.2) / 0.7, a0 = hash01(seed) * TAU, r = s * 0.5;
      strokeBolt(g, [hx + Math.cos(a0) * r, hy + Math.sin(a0) * r * 0.8], [hx + Math.cos(a0 + 1.6) * r, hy + Math.sin(a0 + 1.6) * r * 0.8], seed + 3, s * 0.12, s * 0.35, kk, 5);
    }
  }
  g.restore();
}
// คริติคอล: ดอกทอง 8 กลีบแผ่ + วงประกาย + มงกุฎเล็กเด้งเหนือเป้า
function critFx(g, e, t, lowQ) {
  const n = Math.max(1, e.size | 0), B = bodyOf(e.x, e.y, n), s = B.s, [hx, hy] = B.top, u = t / CELINE_FX_DUR.celineCrit;
  g.globalCompositeOperation = "lighter";
  const q = easeOut3(clamp01(u * 2.2)), k = clamp01(1 - (u - 0.3) / 0.7);
  g.beginPath();
  for (let i = 0; i < 8; i++) petalPath(g, hx, hy, s * (0.3 + 0.75 * q), s * 0.2, i * TAU / 8 + u * 1.2);
  g.fillStyle = rgba(GOLD, 0.5 * k); g.fill();
  g.strokeStyle = rgba(CREAM, 0.8 * k); g.lineWidth = Math.max(1, s * 0.02); g.stroke();
  glow(g, hx, hy, s * 0.9, GOLD, 0.6 * k);
  sparkRing(g, hx, hy, s, clamp01(u * 1.3), 211, 12, 1.4, GOLD, lowQ);
  g.globalCompositeOperation = "source-over";
  const pop = easeOutBack(clamp01(u * 3.5));
  crown(g, hx, B.head[1] - s * 0.1 - s * 0.25 * u, s * 0.4 * pop, k);
}

// =================================================================== เหตุการณ์ (socket "celineFx")
// ฟื้นฟู
function healFx(g, e, t, now, lowQ) {
  const D = e.dur || CELINE_FX_DUR.celineHeal, crit = !!e.crit, fn = Math.max(1, e.fromSize | 0), tn = Math.max(1, e.toSize | 0);
  const F = okT(e.from) ? [e.from.x + fn / 2, e.from.y + fn / 2] : null, T = [e.to.x + tn / 2, e.to.y + tn / 2];
  const rot = (REDUCED ? 0 : now / 1300) + e.t0 * 0.001;
  // ไม้เท้ารวมแสงที่ผู้ร่าย
  if (F && t < 1050) {
    const k = t < 200 ? t / 200 : clamp01(1 - (t - 650) / 400);
    vineSigil(g, F[0], F[1], 0.02, 0.55 * fn, rot, 0.9 * k, lowQ);
    const [hx, hy, hs] = P(F[0], F[1], 1.3 * fn);
    g.globalCompositeOperation = "lighter";
    glow(g, hx, hy, hs * 0.5, crit ? GOLD : LEAF, 0.6 * k); glow(g, hx, hy, hs * 0.18, WHITE, 0.85 * k);
    sparkle(g, hx, hy, hs * 0.24 * (0.75 + 0.25 * Math.sin(now / 55)), k, CREAM);
  }
  // สายกลีบดอกลอยไปหาเป้า
  const solo = !!e.self || !F || (F[0] === T[0] && F[1] === T[1]);
  if (!solo) {
    g.globalCompositeOperation = "lighter";
    const N = lowQ ? 6 : 12, dx = T[0] - F[0], dy = T[1] - F[1], L = Math.hypot(dx, dy) || 1, px = -dy / L, py = dx / L;
    for (let i = 0; i < N; i++) {
      const u = (t - 200 - i * 40) / 520;
      if (u <= 0 || u >= 1) continue;
      const ue = easeInOut(u), side = Math.sin(Math.PI * u) * 0.4 * (i % 2 ? 1 : -1) * (0.5 + hash01(i));
      const p = P(F[0] + dx * ue + px * side, F[1] + dy * ue + py * side, lerp(1.1 * fn, 0.9 * tn, ue) + Math.sin(Math.PI * ue) * 1.0);
      glow(g, p[0], p[1], p[2] * 0.16, crit ? GOLD : LEAF, 0.5);
      petal(g, p[0], p[1], p[2] * 0.1, u * 9 + i, [PINK, LEAF, GOLD, CREAM][i % 4], 0.95);
    }
  }
  // ที่เป้า: วงเวท + เสาแสง + ดอกไม้บาน + อนุภาคลอยขึ้น
  const t0 = solo ? 120 : 640, tt = t - t0;
  if (tt > 0) {
    const L = D - t0, u = tt / L, k = u < 0.12 ? u / 0.12 : clamp01((1 - u) / 0.45);
    vineSigil(g, T[0], T[1], 0.02, (crit ? 0.85 : 0.62) * tn * (0.6 + 0.4 * easeOut3(clamp01(u * 4))), -rot * 1.3, k, lowQ, { rings: crit ? 2 : 1 });
    g.globalCompositeOperation = "lighter";
    pillar(g, T[0], T[1], (crit ? 0.42 : 0.3) * tn, (crit ? 2.8 : 2.1) * tn, crit ? GOLD : LEAF, (crit ? 0.6 : 0.45) * k);
    const NF = crit ? 8 : 6;
    for (let i = 0; i < NF; i++) {
      const a = i / NF * TAU + rot * 0.5, pop = easeOutBack(clamp01((tt - i * 45) / 320)), p = P(T[0] + Math.cos(a) * 0.58 * tn, T[1] + Math.sin(a) * 0.58 * tn, 0.03);
      g.globalCompositeOperation = "source-over";
      flower(g, p[0], p[1], p[2] * 0.13 * pop, a, 5, crit && i % 2 ? GOLD : PINK, crit ? ORANGE : GOLD, k, 0.6);
    }
    g.globalCompositeOperation = "lighter";
    const NM = lowQ ? 8 : 18;
    for (let i = 0; i < NM; i++) {
      const age = clamp01((tt - hash01(i + 5) * L * 0.45) / 900);
      if (age <= 0 || age >= 1) continue;
      const a = hash01(i * 2.7) * TAU + age * 1.5, r = (0.18 + 0.38 * hash01(i * 4.1)) * tn, p = P(T[0] + Math.cos(a) * r, T[1] + Math.sin(a) * r, (0.1 + age * 1.9) * tn);
      const al = Math.sin(Math.PI * age) * k;
      if (i % 3 === 2) {
        // ไม้กางเขนเล็ก (+)
        const c = p[2] * 0.06;
        g.strokeStyle = rgba(crit ? GOLD : LEAF, al); g.lineWidth = Math.max(1, c * 0.5);
        g.beginPath(); g.moveTo(p[0] - c, p[1]); g.lineTo(p[0] + c, p[1]); g.moveTo(p[0], p[1] - c); g.lineTo(p[0], p[1] + c); g.stroke();
      } else petal(g, p[0], p[1], p[2] * 0.08, a * 3, i % 3 ? LEAF : PINK, al);
    }
    // คริ: ดอกทองแผ่ + ประกายมงกุฎ
    if (crit && tt < 700) {
      const B = bodyOf(e.to.x, e.to.y, tn), q = tt / 700;
      g.beginPath();
      for (let i = 0; i < 8; i++) petalPath(g, B.top[0], B.top[1], B.s * (0.3 + 0.7 * easeOut3(q)), B.s * 0.18, i * TAU / 8 + q);
      g.fillStyle = rgba(GOLD, 0.45 * (1 - q)); g.fill();
      sparkRing(g, B.top[0], B.top[1], B.s, q, 301, 10, 1.3, GOLD, lowQ);
    }
  }
  // ผู้ร่ายได้ฟื้นด้วย (ไม่ใช่เลือกตัวเอง)
  if (!solo && t > 700 && t < 1500) {
    const age = (t - 700) / 800, B = bodyOf(e.from.x, e.from.y, fn);
    g.globalCompositeOperation = "lighter";
    glow(g, B.top[0], B.top[1], B.s * 0.6, LEAF, 0.4 * (1 - age));
    sparkRing(g, B.top[0], B.top[1], B.s, age, 333, 8, 0.8, LEAF, lowQ);
  }
}
// กำแพงน้ำแข็งขึ้น (ตัวผนังงอกเองจาก celineWallRise)
function wallStagger(e, i) { const n = (e.tiles || []).length, mid = (n - 1) / 2; return Math.abs(i - mid) * 80; }
function wallFx(g, e, t, now, lowQ) {
  const tiles = e.tiles || [], rot = (REDUCED ? 0 : now / 900);
  tiles.forEach((tl, i) => {
    const tt = t - wallStagger(e, i);
    if (tt <= 0) return;
    const cx = tl.x + 0.5, cy = tl.y + 0.5, u = tt / 1100, k = u < 0.1 ? u / 0.1 : clamp01(1 - (u - 0.35) / 0.55);
    vineSigil(g, cx, cy, 0.02, 0.55, rot + i, k, lowQ, { ice: true });
    const [gx, gy, s] = P(cx, cy, 0.3);
    g.globalCompositeOperation = "lighter";
    glow(g, gx, gy, s * 0.8, ICE_M, 0.55 * clamp01(1 - u * 1.5));
    // เศษผลึกพุ่งขึ้นแล้วร่วง
    const N = lowQ ? 5 : 10, age = clamp01(tt / 900);
    for (let j = 0; j < N; j++) {
      const a = hash01(i * 31 + j) * TAU, sp = 0.25 + hash01(j * 7 + i) * 0.5, q = age;
      const z = Math.max(0, (1.4 + hash01(j) * 0.8) * q - 1.8 * q * q), p = P(cx + Math.cos(a) * sp * q, cy + Math.sin(a) * sp * q, z + 0.1);
      const r = p[2] * 0.045 * (1 - q * 0.5);
      g.save(); g.translate(p[0], p[1]); g.rotate(a + q * 8);
      g.beginPath(); g.moveTo(0, -r * 1.6); g.lineTo(r * 0.7, 0); g.lineTo(0, r * 1.6); g.lineTo(-r * 0.7, 0); g.closePath();
      g.fillStyle = rgba(j % 3 ? ICE : FROST_PINK, 0.95 * (1 - q)); g.fill();
      g.restore();
    }
    // ดอกน้ำแข็งลอยขึ้น
    if (!lowQ) for (let j = 0; j < 4; j++) {
      const q = clamp01((tt - j * 120) / 800);
      if (q <= 0 || q >= 1) continue;
      const a = hash01(i * 7 + j * 3) * TAU, p = P(cx + Math.cos(a) * 0.35, cy + Math.sin(a) * 0.3, 0.3 + q * 1.4);
      frostFlake(g, p[0], p[1], p[2] * 0.07, Math.sin(Math.PI * q), j % 2 ? WHITE : FROST_PINK);
    }
  });
}
// กำแพงแตก (hit = แตกกระจาย · expire = ละลายเป็นกลีบ/ประกายลอยขึ้น)
function wallBreakFx(g, e, t, now, lowQ) {
  const tiles = e.tiles || [], set = new Set(tiles.map((p) => `${p.x},${p.y}`)), melt = e.why === "expire", D = CELINE_FX_DUR.celineWallBreak;
  const has = (x, y) => set.has(`${x},${y}`);
  tiles.forEach((tl, i) => {
    const cx = tl.x + 0.5, cy = tl.y + 0.5, u = clamp01(t / D);
    const conn = { l: has(tl.x - 1, tl.y), r: has(tl.x + 1, tl.y), u: has(tl.x, tl.y - 1), d: has(tl.x, tl.y + 1) };
    if (melt) {
      // ผนังจมลง/จาง + กลีบน้ำแข็งลอยขึ้น
      g.globalCompositeOperation = "source-over";
      if (u < 0.7) drawCelineWall(g, tl.x, tl.y, conn, { rise: 1 - easeIn2(u / 0.7), alpha: 1 - u / 0.7, now, lowQ });
      g.globalCompositeOperation = "lighter";
      const N = lowQ ? 5 : 10;
      for (let j = 0; j < N; j++) {
        const q = clamp01((t - j * 40) / 800);
        if (q <= 0 || q >= 1) continue;
        const a = hash01(i * 13 + j) * TAU, p = P(cx + Math.cos(a) * 0.3 * (1 + q), cy + Math.sin(a) * 0.25, 0.2 + q * 1.5);
        if (j % 2) sparkle(g, p[0], p[1], p[2] * 0.06, Math.sin(Math.PI * q), ICE);
        else petal(g, p[0], p[1], p[2] * 0.07, a + q * 5, FROST_PINK, Math.sin(Math.PI * q));
      }
      return;
    }
    const [gx, gy, s] = P(cx, cy, 0.5);
    g.globalCompositeOperation = "lighter";
    if (t < 220) glow(g, gx, gy, s * 1.1, WHITE, 0.85 * (1 - t / 220));
    glow(g, gx, gy, s * 0.7, ICE_M, 0.5 * (1 - u));
    // วงน้ำแข็งแผ่บนพื้น
    gEllipse(g, cx, cy, 0.25 + 0.9 * easeOut3(u), 0.02, 32);
    g.strokeStyle = rgba(ICE, 0.8 * (1 - u)); g.lineWidth = Math.max(1, 3 * (1 - u)); g.stroke();
    // เศษผลึกกระจาย (กระเด้งพื้นครั้งเดียว)
    g.globalCompositeOperation = "source-over";
    const N = lowQ ? 7 : 14;
    for (let j = 0; j < N; j++) {
      const a = hash01(i * 17 + j * 1.3) * TAU, sp = 0.4 + hash01(j * 5.5 + i) * 0.9, z0 = 0.2 + hash01(j * 2.1) * 0.8, vz = 0.8 + hash01(j * 9) * 1.2;
      let z = z0 + vz * u - 2.6 * u * u;
      if (z < 0) z = Math.abs(z) * 0.3;
      const p = P(cx + Math.cos(a) * sp * easeOut3(u), cy + Math.sin(a) * sp * easeOut3(u), z), r = p[2] * (0.03 + hash01(j * 3) * 0.04);
      g.save(); g.translate(p[0], p[1]); g.rotate(a + u * 10 * (j % 2 ? 1 : -1));
      g.beginPath(); g.moveTo(0, -r * 1.5); g.lineTo(r, r * 0.6); g.lineTo(-r * 0.8, r * 0.8); g.closePath();
      g.fillStyle = rgba(j % 4 ? ICE : FROST_PINK, 0.95 * (1 - u)); g.fill();
      g.strokeStyle = rgba(WHITE, 0.9 * (1 - u)); g.lineWidth = 1; g.stroke();
      g.restore();
    }
    // กลีบน้ำแข็งร่วงช้าๆ
    if (!lowQ) for (let j = 0; j < 5; j++) {
      const q = clamp01((t - 120 - j * 60) / 900);
      if (q <= 0 || q >= 1) continue;
      const a = hash01(i * 3 + j * 11) * TAU, p = P(cx + Math.cos(a) * 0.5 + Math.sin(q * 6 + j) * 0.1, cy + Math.sin(a) * 0.4, 1.3 * (1 - q) + 0.05);
      petal(g, p[0], p[1], p[2] * 0.07, q * 7 + j, j % 2 ? FROST_PINK : ICE, 1 - q);
    }
  });
}
// สลับตำแหน่ง: ตำแหน่งของคนที่ถูกย้ายตามเวลา (ช่องมุมบนซ้าย + hz)
function swapAt(r, t) {
  const { rise, fly, land } = CELINE_SWAP;
  if (!r || !okT(r.from) || !okT(r.to)) return null;
  if (t < 0) return null;
  if (t < rise) return { x: r.from.x, y: r.from.y, hz: 0.35 * easeOut3(t / rise) };
  if (t < rise + fly) {
    const u = (t - rise) / fly, ue = easeInOut(u);
    return { x: lerp(r.from.x, r.to.x, ue), y: lerp(r.from.y, r.to.y, ue), hz: 0.35 * (1 - ue) + 1.5 * Math.sin(Math.PI * ue) };
  }
  if (t < rise + fly + land) { const u = (t - rise - fly) / land; return { x: r.to.x, y: r.to.y, hz: 0.14 * Math.sin(Math.PI * u) * (1 - u) }; }
  return null;
}
// หมากที่ฉากสลับตำแหน่งย้ายเอง — BoardCanvas เรียก (คืน { x, y, hz } | null)
export function celinePose(list, u, now) {
  if (!u || u.id == null || !Array.isArray(list)) return null;
  for (const e of list) {
    if (!e || e.kind !== "celineSwap") continue;
    const r = e.a && e.a.id === u.id ? e.a : e.b && e.b.id === u.id ? e.b : null;
    if (!r) continue;
    const p = swapAt(r, now - e.t0);
    if (p) return p;
  }
  return null;
}
function swapFx(g, e, t, now, lowQ) {
  const { rise, fly, land } = CELINE_SWAP, rot = (REDUCED ? 0 : now / 500);
  const roles = [e.a, e.b].filter((r) => r && okT(r.from) && okT(r.to));
  // ไม้เท้าเรืองแสงของผู้ร่าย (จับคู่ — เซลินยืนที่อื่น)
  if (okT(e.by) && t < rise + fly) {
    const n = Math.max(1, e.bySize | 0), B = bodyOf(e.by.x, e.by.y, n), k = env(t, 0, 150, rise + fly - 250, rise + fly);
    g.globalCompositeOperation = "lighter";
    glow(g, B.head[0], B.head[1], B.s * 0.6, GOLD, 0.6 * k);
    sparkle(g, B.head[0], B.head[1], B.s * 0.25, k, CREAM);
  }
  for (const [ri, r] of roles.entries()) {
    const n = Math.max(1, r.size | 0), h = n / 2;
    // วงเวทจุดออก (ตอนลอยขึ้น) / จุดลง (ตอนลง)
    vineSigil(g, r.from.x + h, r.from.y + h, 0.02, 0.55 * n, rot + ri, env(t, 0, 150, rise + 150, rise + 450), lowQ);
    vineSigil(g, r.to.x + h, r.to.y + h, 0.02, 0.55 * n, -rot + ri, env(t, rise + fly - 250, rise + fly, rise + fly + 80, rise + fly + land), lowQ, { rings: 2 });
    g.globalCompositeOperation = "lighter";
    // เกลียวกลีบรอบตัวตอนลอยขึ้น
    if (t < rise + 120) {
      const k = env(t, 0, 80, rise - 40, rise + 120), NP = lowQ ? 6 : 12;
      for (let i = 0; i < NP; i++) {
        const a = i / NP * TAU + t / 90, q = clamp01(t / rise), rr = (0.55 - 0.25 * q) * n;
        const p = P(r.from.x + h + Math.cos(a) * rr, r.from.y + h + Math.sin(a) * rr, (0.1 + q * 0.9 + (i % 3) * 0.15) * n);
        petal(g, p[0], p[1], p[2] * 0.09, a * 2, [PINK, GOLD, CREAM][i % 3], k);
      }
    }
    // ทางบินมีกลีบโปรยตาม
    if (t >= rise && t < rise + fly + 200) {
      const TR = lowQ ? 6 : 12;
      for (let j = 1; j <= TR; j++) {
        const pp = swapAt(r, Math.min(t, rise + fly - 1) - j * 32);
        if (!pp || t - j * 32 < rise) continue;
        const fade = (1 - j / (TR + 1)) * (t < rise + fly ? 1 : 1 - (t - rise - fly) / 200);
        const p = P(pp.x + h + Math.sin(j * 1.9) * 0.12, pp.y + h, (pp.hz + 0.6) * n * 0.85);
        petal(g, p[0], p[1], p[2] * 0.08 * fade + 0.5, j + t / 80, [PINK, GOLD, CREAM, LEAF][j % 4], fade);
        if (j % 3 === 0) sparkle(g, p[0], p[1], p[2] * 0.06, fade, CREAM);
      }
      const cur = swapAt(r, t);
      if (cur && t < rise + fly) { const p = P(cur.x + h, cur.y + h, (cur.hz + 0.6) * n * 0.85); glow(g, p[0], p[1], p[2] * 0.6, GOLD, 0.35); }
    }
    // ลงพื้น: ดอกไม้บานรอบตัว + ประกาย
    const tl = t - rise - fly;
    if (tl > -40 && tl < land + 200) {
      const age = clamp01((tl + 40) / (land + 240)), B = bodyOf(r.to.x, r.to.y, n);
      sparkRing(g, B.top[0], B.top[1], B.s, age, 401 + ri * 7, 10, 1.1, GOLD, lowQ);
      g.globalCompositeOperation = "source-over";
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU + ri, pop = easeOutBack(clamp01((tl - i * 25) / 220)), p = P(r.to.x + h + Math.cos(a) * 0.55 * n, r.to.y + h + Math.sin(a) * 0.55 * n, 0.03);
        flower(g, p[0], p[1], p[2] * 0.12 * pop, a, 5, FLOWER_COLS[(i + ri) % 4], GOLD, 1 - age, 0.6);
      }
    }
  }
  // จับคู่: ริบบิ้นทองเชื่อมสองคนระหว่างบิน
  if (e.mode === "pair" && roles.length === 2 && t >= rise && t < rise + fly) {
    const a = swapAt(roles[0], t), b = swapAt(roles[1], t);
    if (a && b) {
      const na = Math.max(1, roles[0].size | 0), nb = Math.max(1, roles[1].size | 0);
      const pa = P(a.x + na / 2, a.y + na / 2, (a.hz + 0.6) * 0.85), pb = P(b.x + nb / 2, b.y + nb / 2, (b.hz + 0.6) * 0.85), k = env(t, rise, rise + 100, rise + fly - 120, rise + fly);
      g.globalCompositeOperation = "lighter"; g.lineCap = "round";
      const mx = (pa[0] + pb[0]) / 2, my = (pa[1] + pb[1]) / 2 - pa[2] * 0.6 * Math.sin(now / 120);
      for (const [w, c, al] of [[0.09, GOLD, 0.35], [0.03, CREAM, 0.9]]) {
        g.strokeStyle = rgba(c, al * k); g.lineWidth = Math.max(1, pa[2] * w);
        g.beginPath(); g.moveTo(pa[0], pa[1]); g.quadraticCurveTo(mx, my, pb[0], pb[1]); g.stroke();
      }
    }
  }
}
// พุ่มดอกไม้งอก (คฑาแห่งการรังสรรค์)
function bloomFx(g, e, t, now, lowQ) {
  const tiles = e.tiles || [], rot = (REDUCED ? 0 : now / 700) + e.t0 * 0.001;
  tiles.forEach((tl, i) => {
    const cx = tl.x + 0.5, cy = tl.y + 0.5, u = t / CELINE_FX_DUR.celineBloom, k = u < 0.12 ? u / 0.12 : clamp01(1 - (u - 0.45) / 0.5);
    vineSigil(g, cx, cy, 0.02, 0.55 * (0.5 + 0.5 * easeOut3(clamp01(u * 4))), rot + i, k, lowQ, { rings: 2 });
    g.globalCompositeOperation = "lighter";
    pillar(g, cx, cy, 0.25, 1.6, GOLD, 0.4 * k);
    const [gx, gy, s] = P(cx, cy, 0.35);
    const pb = clamp01((t - 250) / 700);
    g.globalCompositeOperation = "source-over";
    petalBurst(g, gx, gy, s, pb, 501 + i * 9, 12, 1.0, [PINK, CREAM, GOLD, ORANGE], lowQ, -0.2);
    g.globalCompositeOperation = "lighter";
    sparkRing(g, gx, gy, s, clamp01((t - 150) / 900), 521 + i, 10, 1.0, GOLD, lowQ);
    // ผีเสื้อบินขึ้นเป็นเกลียว
    g.globalCompositeOperation = "source-over";
    const NB = lowQ ? 2 : 3;
    for (let j = 0; j < NB; j++) {
      const q = clamp01((t - 380 - j * 90) / 1050);
      if (q <= 0 || q >= 1) continue;
      const a = j * TAU / NB + q * 4, r = 0.2 + q * 0.6, p = P(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.3 + q * 1.9);
      butterfly(g, p[0], p[1], p[2] * 0.13, now / 55 + j, Math.sin(a) * 0.4, j % 2 ? ORANGE : PINK, Math.sin(Math.PI * q) * 1.2);
    }
  });
}
// พุ่มงอกใต้เท้า (เดิน): ช่องละพัฟกลีบเล็ก
function trailFx(g, e, t, lowQ) {
  const tiles = e.tiles || [], step = e.step || CELINE_STEP_MS;
  tiles.forEach((tl, i) => {
    const tt = t - i * step;
    if (tt <= 0 || tt > 700) return;
    const age = tt / 700, [gx, gy, s] = P(tl.x + 0.5, tl.y + 0.5, 0.12);
    g.globalCompositeOperation = "lighter";
    glow(g, gx, gy, s * 0.5, LEAF, 0.35 * (1 - age));
    g.globalCompositeOperation = "source-over";
    const N = lowQ ? 3 : 6;
    for (let j = 0; j < N; j++) {
      const a = j / N * TAU + i, d = s * 0.4 * easeOut3(age), p0 = gx + Math.cos(a) * d, p1 = gy + Math.sin(a) * d * 0.5 - s * 0.35 * Math.sin(Math.PI * age);
      petal(g, p0, p1, s * 0.07, a + age * 5, j % 2 ? PINK : CREAM, 1 - age);
    }
    if (!lowQ && i % 2 === 0) { g.globalCompositeOperation = "lighter"; sparkle(g, gx, gy - s * 0.4 * age, s * 0.08 * (1 - age), 1 - age, GOLD); }
  });
}
// สัญลักษณ์อาวุธ (จอ) — (x, y) = กลาง · S = ขนาด px
function drawEmblem(g, w, x, y, S, a) {
  if (a <= 0.01) return;
  g.save(); g.globalAlpha *= a; g.lineJoin = "round"; g.lineCap = "round";
  const sword = (len, wid, blade, edge, curve) => {
    const top = y - S * 0.5, guard = top + len;
    g.beginPath();
    g.moveTo(x, top);
    g.quadraticCurveTo(x + wid * 0.6 + curve, top + len * 0.45, x + wid / 2, guard);
    g.lineTo(x - wid / 2, guard);
    g.quadraticCurveTo(x - wid * 0.6 + curve, top + len * 0.45, x, top);
    const gr = g.createLinearGradient(x - wid, 0, x + wid, 0);
    gr.addColorStop(0, rgba(blade, 1)); gr.addColorStop(0.5, rgba(WHITE, 1)); gr.addColorStop(1, rgba(edge, 1));
    g.fillStyle = gr; g.fill(); g.strokeStyle = "rgba(80,40,20,.75)"; g.lineWidth = Math.max(1, S * 0.02); g.stroke();
    return guard;
  };
  const hilt = (gy, gw, gem) => {
    g.fillStyle = "#f3c94b"; g.strokeStyle = "rgba(120,72,10,.9)"; g.lineWidth = Math.max(1, S * 0.02);
    g.beginPath(); g.moveTo(x - gw, gy); g.quadraticCurveTo(x, gy + S * 0.08, x + gw, gy); g.quadraticCurveTo(x, gy - S * 0.04, x - gw, gy); g.fill(); g.stroke();
    g.fillStyle = "#7a4a18"; g.fillRect(x - S * 0.035, gy + S * 0.02, S * 0.07, S * 0.18);
    g.beginPath(); g.arc(x, gy + S * 0.22, S * 0.05, 0, TAU); g.fillStyle = "#f3c94b"; g.fill();
    g.beginPath(); g.arc(x, gy + S * 0.01, S * 0.04, 0, TAU); g.fillStyle = gem; g.fill();
  };
  const book = (cover, glyph) => {
    const bw = S * 0.42, bh = S * 0.3, by = y + S * 0.12;
    // ปก
    g.fillStyle = rgba(cover, 1); g.strokeStyle = "rgba(80,40,20,.8)"; g.lineWidth = Math.max(1, S * 0.02);
    g.beginPath(); g.moveTo(x, by + bh * 0.12); g.lineTo(x - bw - S * 0.03, by - bh * 0.05); g.lineTo(x - bw - S * 0.03, by + bh * 0.95); g.lineTo(x, by + bh * 1.1); g.lineTo(x + bw + S * 0.03, by + bh * 0.95); g.lineTo(x + bw + S * 0.03, by - bh * 0.05); g.closePath(); g.fill(); g.stroke();
    // หน้ากระดาษ
    g.fillStyle = "#fff6dc";
    for (const sd of [-1, 1]) {
      g.beginPath(); g.moveTo(x, by + bh * 0.05); g.quadraticCurveTo(x + sd * bw * 0.5, by - bh * 0.18, x + sd * bw, by - bh * 0.05); g.lineTo(x + sd * bw, by + bh * 0.85); g.quadraticCurveTo(x + sd * bw * 0.5, by + bh * 0.72, x, by + bh * 0.98); g.closePath(); g.fill();
      g.strokeStyle = "rgba(160,120,70,.6)"; g.lineWidth = 1;
      for (let i = 1; i <= 3; i++) { const ly = by + bh * (0.15 + i * 0.17); g.beginPath(); g.moveTo(x + sd * bw * 0.18, ly); g.lineTo(x + sd * bw * 0.82, ly - bh * 0.06); g.stroke(); }
    }
    // สัญลักษณ์เหนือเล่ม
    const gy = y - S * 0.22;
    if (glyph === "fire") {
      g.beginPath(); petalPath(g, x, gy + S * 0.2, S * 0.42, S * 0.17, -Math.PI / 2); g.fillStyle = rgba(ORANGE, 1); g.fill();
      g.beginPath(); petalPath(g, x, gy + S * 0.2, S * 0.25, S * 0.09, -Math.PI / 2); g.fillStyle = rgba(EMBER, 1); g.fill();
    } else if (glyph === "wind") {
      g.strokeStyle = rgba(LEAF_D, 1); g.lineWidth = Math.max(1.5, S * 0.05);
      g.beginPath();
      for (let i = 0; i <= 40; i++) { const th = i / 40 * TAU * 1.6, r = S * 0.03 + i / 40 * S * 0.2; const px = x + Math.cos(th) * r, py = gy + Math.sin(th) * r * 0.8; if (i) g.lineTo(px, py); else g.moveTo(px, py); }
      g.stroke();
      petal(g, x + S * 0.22, gy - S * 0.1, S * 0.12, -0.6, LEAF, 1);
    } else {
      g.beginPath(); g.moveTo(x + S * 0.05, gy - S * 0.22); g.lineTo(x - S * 0.12, gy + S * 0.02); g.lineTo(x + S * 0.01, gy + S * 0.02); g.lineTo(x - S * 0.06, gy + S * 0.24); g.lineTo(x + S * 0.14, gy - S * 0.04); g.lineTo(x + S * 0.01, gy - S * 0.04); g.closePath();
      g.fillStyle = rgba(BOLT, 1); g.fill(); g.strokeStyle = "rgba(150,100,10,.9)"; g.lineWidth = Math.max(1, S * 0.02); g.stroke();
    }
  };
  if (w === "dagger") { const gy = sword(S * 0.55, S * 0.11, "230,200,215", PINK, 0); hilt(gy, S * 0.14, "#f59ab8"); }
  else if (w === "dragon") {
    const gy = sword(S * 0.68, S * 0.15, CRIMSON_D, CRIMSON, S * 0.08);
    // ปีกมังกรที่โกร่ง
    g.fillStyle = rgba(CRIMSON, 1); g.strokeStyle = "rgba(90,10,20,.9)"; g.lineWidth = Math.max(1, S * 0.015);
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(x, gy); g.lineTo(x + sd * S * 0.3, gy - S * 0.16); g.lineTo(x + sd * S * 0.22, gy - S * 0.02); g.lineTo(x + sd * S * 0.34, gy + S * 0.02); g.closePath(); g.fill(); g.stroke(); }
    hilt(gy, S * 0.12, "#f3c94b");
  } else if (w === "great") { const gy = sword(S * 0.72, S * 0.26, GOLD_D, GOLD, 0); hilt(gy, S * 0.26, "#f59ab8"); }
  else book(w === "fire" ? "200,70,40" : w === "wind" ? "70,130,50" : "190,140,30", w);
  g.restore();
}
function weaponFx(g, e, t, now, lowQ) {
  const w = CELINE_WEAPONS.includes(e.weapon) ? e.weapon : "dagger", [C1, C2] = WCOL[w], n = Math.max(1, e.size | 0);
  if (!okT(e.at)) return;
  const B = bodyOf(e.at.x, e.at.y, n), s = B.s, D = CELINE_FX_DUR.celineWeapon, rot = (REDUCED ? 0 : now / 600);
  const ex = B.head[0], ey = B.head[1] - s * 0.55 + (REDUCED ? 0 : Math.sin(now / 200) * s * 0.04);
  const k = env(t, 0, 200, D - 350, D);
  vineSigil(g, e.at.x + n / 2, e.at.y + n / 2, 0.02, 0.58 * n, rot, k * 0.85, lowQ);
  g.globalCompositeOperation = "lighter";
  // กลีบสีอาวุธวนเข้าหาสัญลักษณ์
  const NP = lowQ ? 6 : 12;
  for (let i = 0; i < NP; i++) {
    const q = clamp01((t - i * 18) / 480);
    if (q <= 0 || q >= 1) continue;
    const a = i / NP * TAU + q * 3, r = s * 1.1 * (1 - easeOut3(q));
    petal(g, ex + Math.cos(a) * r, ey + Math.sin(a) * r * 0.7, s * 0.09, a + q * 4, i % 2 ? C1 : C2, Math.sin(Math.PI * q));
  }
  glow(g, ex, ey, s * 0.85, C1, 0.45 * k);
  if (t > 480 && t < 900) { const q = (t - 480) / 420; glow(g, ex, ey, s * 1.2, WHITE, 0.6 * (1 - q)); sparkRing(g, ex, ey, s, q, 601, 12, 1.3, C1, lowQ); }
  // สัญลักษณ์หมุนเข้าแล้วลอยนิ่ง
  const pop = easeOutBack(clamp01((t - 240) / 380)), spin = t < 620 ? Math.cos((1 - clamp01((t - 240) / 380)) * Math.PI * 2) : 1;
  g.globalCompositeOperation = "source-over";
  g.save(); g.translate(ex, ey); g.scale(Math.max(0.05, Math.abs(spin)), 1);
  drawEmblem(g, w, 0, 0, s * 1.1 * pop, k);
  g.restore();
  // ดาบ = ประกายพาดใบ · เวท = หน้ากระดาษปลิว
  if (CELINE_SWORD[w] && t > 650 && t < 1050) {
    const q = (t - 650) / 400;
    g.globalCompositeOperation = "lighter";
    sparkle(g, ex, ey - s * 0.55 + q * s * 0.75, s * 0.18, Math.sin(Math.PI * q), WHITE);
  } else if (!CELINE_SWORD[w] && !lowQ) {
    for (let i = 0; i < 4; i++) {
      const q = clamp01((t - 500 - i * 90) / 600);
      if (q <= 0 || q >= 1) continue;
      const px = ex + (i - 1.5) * s * 0.22 + Math.sin(q * 6 + i) * s * 0.1, py = ey - s * 0.1 - q * s * 0.8;
      g.save(); g.translate(px, py); g.rotate(Math.sin(q * 8 + i) * 0.6);
      g.fillStyle = rgba(CREAM, Math.sin(Math.PI * q)); g.fillRect(-s * 0.06, -s * 0.08, s * 0.12, s * 0.16);
      g.restore();
    }
  }
}
// ท่าไม้ตาย สวนดอกไม้ของฉัน
function ultFx(g, e, t, now, lowQ, view) {
  if (!okT(e.at)) return;
  const n = Math.max(1, e.size | 0), cx = e.at.x + n / 2, cy = e.at.y + n / 2, B = bodyOf(e.at.x, e.at.y, n), s = B.s, D = CELINE_ULT.total, CR = CELINE_ULT.crown;
  const rot = (REDUCED ? 0 : now / 900);
  const k = env(t, 0, 300, D - 600, D);
  // วงเวทยักษ์ 3 ชั้น
  const R = 2.4 * (0.25 + 0.75 * easeOut3(clamp01(t / 700)));
  vineSigil(g, cx, cy, 0.02, R, rot, k, lowQ, { rings: 2 });
  vineSigil(g, cx, cy, 0.02, R * 0.5, -rot * 1.6, k * 0.85, lowQ);
  // สวนดอกไม้บานเป็นเกลียวทองคำ
  const NF = lowQ ? 16 : 30;
  g.globalCompositeOperation = "source-over";
  for (let i = 0; i < NF; i++) {
    const st = 280 + i * 40, q = clamp01((t - st) / 380);
    if (q <= 0) continue;
    const a = i * 2.39996, r = 0.35 + 2.05 * Math.sqrt((i + 1) / NF), p = P(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.03);
    const sway = REDUCED ? 0 : Math.sin(now / 400 + i) * 0.2;
    flower(g, p[0], p[1], p[2] * (0.1 + 0.05 * hash01(i)) * easeOutBack(q), a + sway, i % 3 ? 5 : 6, FLOWER_COLS[i % 4], i % 4 === 1 ? ORANGE : GOLD, k, 0.6);
  }
  g.globalCompositeOperation = "lighter";
  // เสาแสงทอง + แฟลชตอนสวมมงกุฎ
  pillar(g, cx, cy, 0.55 * n, 4.2, GOLD, 0.45 * env(t, 300, 900, CR + 300, CR + 1100));
  if (t > CR && t < CR + 420) {
    const q = (t - CR) / 420;
    glow(g, B.top[0], B.top[1], s * (1.6 + q * 2), GOLD, 0.75 * (1 - q));
    glow(g, B.top[0], B.top[1], s * 0.9, WHITE, 0.9 * (1 - q));
    if (view && !lowQ) {
      const x0 = (Number.isFinite(view.x0) ? view.x0 : 0) - 60, y0 = (Number.isFinite(view.y0) ? view.y0 : 0) - 60;
      const x1 = (Number.isFinite(view.x1) ? view.x1 : 1280) + 60, y1 = (Number.isFinite(view.y1) ? view.y1 : 720) + 60;
      g.fillStyle = `rgba(255,236,190,${0.35 * (1 - q) * (1 - q)})`; g.fillRect(x0, y0, x1 - x0, y1 - y0);
    }
  }
  // พายุกลีบหมุนรอบวง
  const NP = lowQ ? 14 : 34;
  for (let i = 0; i < NP; i++) {
    const a = i / NP * TAU + t / 600 * (i % 2 ? 1 : 1.3), r = R * (0.5 + 0.55 * hash01(i)), z = 0.2 + hash01(i * 3) * 1.6 + Math.sin(t / 300 + i) * 0.2;
    const p = P(cx + Math.cos(a) * r, cy + Math.sin(a) * r, z);
    petal(g, p[0], p[1], p[2] * 0.08, a * 2 + t / 200, [PINK, GOLD, CREAM, ORANGE][i % 4], k * 0.9);
  }
  // มงกุฎลงสวม
  g.globalCompositeOperation = "source-over";
  if (t > 500) {
    const q = clamp01((t - 500) / (CR - 500)), crownY = lerp(B.head[1] - s * 2.6, B.head[1] - s * 0.05, easeInOut(q)), kc = t < D - 500 ? 1 : clamp01((D - t) / 500);
    g.globalCompositeOperation = "lighter";
    glow(g, B.head[0], crownY - s * 0.15, s * 0.7, GOLD, 0.55 * kc);
    sparkRing(g, B.head[0], crownY - s * 0.15, s, clamp01((t - 500) / 900), 701, 10, 0.9, CREAM, lowQ);
    g.globalCompositeOperation = "source-over";
    crown(g, B.head[0], crownY, s * 0.62, kc);
  }
  // ฝูงผีเสื้อบินเกลียวขึ้น
  const NB = lowQ ? 5 : 12;
  for (let i = 0; i < NB; i++) {
    const q = clamp01((t - 650 - i * 70) / 1700);
    if (q <= 0 || q >= 1) continue;
    const a = i / NB * TAU + q * 5, r = 0.4 + q * 2.0, p = P(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.4 + q * 2.6);
    butterfly(g, p[0], p[1], p[2] * 0.15, now / 50 + i * 1.3, Math.sin(a) * 0.5, i % 3 === 0 ? ORANGE : i % 3 === 1 ? PINK : GOLD, Math.sin(Math.PI * q) * 1.3);
  }
}
// เวลาน้ำชา: ถ้วยชาลอย + ไอน้ำรูปดอกไม้ + ประกายเขียวโปรยลง
function teacup(g, x, y, w, a) {
  if (a <= 0.01) return;
  g.save(); g.globalAlpha *= a;
  // จานรอง
  g.beginPath(); g.ellipse(x, y + w * 0.32, w * 0.72, w * 0.14, 0, 0, TAU); g.fillStyle = "#fffaf0"; g.fill(); g.strokeStyle = "rgba(200,150,60,.9)"; g.lineWidth = Math.max(1, w * 0.04); g.stroke();
  // ตัวถ้วย
  g.beginPath(); g.moveTo(x - w * 0.5, y - w * 0.15); g.quadraticCurveTo(x - w * 0.48, y + w * 0.32, x, y + w * 0.32); g.quadraticCurveTo(x + w * 0.48, y + w * 0.32, x + w * 0.5, y - w * 0.15); g.closePath();
  g.fillStyle = "#ffffff"; g.fill(); g.strokeStyle = "rgba(200,150,60,.9)"; g.stroke();
  // หูถ้วย
  g.beginPath(); g.arc(x + w * 0.55, y + w * 0.02, w * 0.14, -1.3, 1.5); g.lineWidth = Math.max(1.5, w * 0.06); g.stroke();
  // ปากถ้วย + น้ำชา
  g.beginPath(); g.ellipse(x, y - w * 0.15, w * 0.5, w * 0.1, 0, 0, TAU); g.fillStyle = "#c98a4a"; g.fill(); g.strokeStyle = "rgba(243,201,75,1)"; g.lineWidth = Math.max(1, w * 0.04); g.stroke();
  flower(g, x, y + w * 0.1, w * 0.12, 0.3, 5, PINK, GOLD, 1, 1, null);
  g.restore();
}
function teaFx(g, e, t, now, lowQ) {
  if (!okT(e.at)) return;
  const n = Math.max(1, e.size | 0), B = bodyOf(e.at.x, e.at.y, n), s = B.s, D = CELINE_FX_DUR.celineTea, k = env(t, 0, 250, D - 400, D);
  const cx = B.head[0] + s * 0.42, cy = B.head[1] - s * 0.15 + (REDUCED ? 0 : Math.sin(now / 260) * s * 0.04);
  g.globalCompositeOperation = "lighter";
  glow(g, cx, cy, s * 0.7, e.crit ? GOLD : LEAF, 0.4 * k);
  g.globalCompositeOperation = "source-over";
  teacup(g, cx, cy, s * 0.42, k);
  // ไอน้ำ 3 สาย ปลายเป็นดอกไม้เล็ก
  g.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    const q = ((t / 900) + i / 3) % 1, al = Math.sin(Math.PI * q) * k * 0.8;
    g.strokeStyle = rgba(WHITE, al); g.lineWidth = Math.max(1, s * 0.03);
    g.beginPath();
    for (let j = 0; j <= 10; j++) {
      const v = j / 10, py = cy - s * 0.12 - v * s * 0.55 * (0.5 + q), px = cx + (i - 1) * s * 0.12 + Math.sin(v * 5 + now / 200 + i) * s * 0.06;
      if (j) g.lineTo(px, py); else g.moveTo(px, py);
    }
    g.stroke();
    flower(g, cx + (i - 1) * s * 0.12 + Math.sin(5 + now / 200 + i) * s * 0.06, cy - s * 0.12 - s * 0.55 * (0.5 + q), s * 0.06 * (0.5 + q), q * 3, 5, i === 1 ? PINK : CREAM, GOLD, al, 1, null);
  }
  // ประกายเขียวโปรยลงหาตัว
  g.globalCompositeOperation = "lighter";
  const N = lowQ ? 6 : 12;
  for (let i = 0; i < N; i++) {
    const q = ((t / 1100) + hash01(i)) % 1, a = hash01(i * 3) * TAU, r = s * (0.2 + 0.4 * hash01(i * 7));
    sparkle(g, B.top[0] + Math.cos(a) * r, B.head[1] - s * 0.4 + q * s * 1.3, s * 0.06, Math.sin(Math.PI * q) * k, i % 3 ? LEAF : e.crit ? GOLD : CREAM);
  }
}
// ผลติดหลังตีปกติ
function burnFx(g, e, t, now, lowQ) {
  if (!okT(e.at)) return;
  const n = Math.max(1, e.size | 0), B = bodyOf(e.at.x, e.at.y, n), s = B.s, [hx, hy] = B.top, u = t / CELINE_FX_DUR.celineBurn, k = env(u, 0, 0.15, 0.55, 1);
  g.globalCompositeOperation = "lighter";
  glow(g, hx, hy + s * 0.2, s * 0.8, ORANGE, 0.55 * k);
  const pop = easeOutBack(clamp01(u * 4));
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.42, fl = 0.85 + 0.25 * Math.sin(now / 45 + i * 2.1);
    petalPath(g, hx, hy + s * 0.35, s * 0.62 * pop * fl * (i === 2 || i === 3 ? 1.15 : 0.85), s * 0.16, a);
  }
  g.fillStyle = rgba(ORANGE, 0.6 * k); g.fill();
  g.beginPath();
  for (let i = 0; i < 5; i++) petalPath(g, hx, hy + s * 0.35, s * 0.38 * pop * (0.9 + 0.2 * Math.sin(now / 38 + i)), s * 0.1, -Math.PI / 2 + (i - 2) * 0.38);
  g.fillStyle = rgba(PINK, 0.7 * k); g.fill();
  const NE = lowQ ? 5 : 10;
  for (let i = 0; i < NE; i++) {
    const q = clamp01((u - hash01(i) * 0.4) / 0.6);
    if (q <= 0 || q >= 1) continue;
    petal(g, hx + (hash01(i * 3) - 0.5) * s * 0.7, hy + s * 0.2 - q * s * 1.1, s * 0.05, q * 6 + i, i % 2 ? EMBER : PINK, 1 - q);
  }
}
function shockFx(g, e, t, now, lowQ) {
  if (!okT(e.at)) return;
  const n = Math.max(1, e.size | 0), B = bodyOf(e.at.x, e.at.y, n), s = B.s, [hx, hy] = B.top, u = t / CELINE_FX_DUR.celineShock, k = env(u, 0, 0.1, 0.6, 1), seed = Math.floor(now / 50);
  g.globalCompositeOperation = "lighter"; g.lineCap = "round"; g.lineJoin = "round";
  glow(g, hx, hy, s * 0.7, BOLT, 0.45 * k);
  for (let j = 0; j < 2; j++) {
    const R = s * (0.45 + j * 0.15);
    g.beginPath();
    for (let i = 0; i <= 16; i++) {
      const a = i / 16 * TAU, r = R * (0.85 + 0.3 * hash01(seed * 7 + i + j * 31));
      const px = hx + Math.cos(a) * r, py = hy + Math.sin(a) * r * 0.7;
      if (i) g.lineTo(px, py); else g.moveTo(px, py);
    }
    g.strokeStyle = rgba(j ? WHITE : BOLT, 0.8 * k); g.lineWidth = Math.max(1, s * (j ? 0.015 : 0.03)); g.stroke();
  }
  const NF = lowQ ? 3 : 5;
  for (let i = 0; i < NF; i++) {
    const q = clamp01((u - i * 0.1) / 0.5);
    if (q <= 0 || q >= 1) continue;
    const a = hash01(i + seed * 0.1) * TAU, r = s * 0.55;
    sparkFlower(g, hx + Math.cos(a) * r, hy + Math.sin(a) * r * 0.7, s * 0.12 * easeOutBack(clamp01(q * 3)), a, 1 - q);
  }
}
function gustFx(g, e, t, now, lowQ) {
  if (!okT(e.at)) return;
  const n = Math.max(1, e.size | 0), B = bodyOf(e.at.x, e.at.y, n), s = B.s, [hx, hy] = B.top, u = t / CELINE_FX_DUR.celineGust, k = env(u, 0, 0.1, 0.6, 1);
  g.globalCompositeOperation = "lighter"; g.lineCap = "round";
  const NL = lowQ ? 4 : 8;
  for (let i = 0; i < NL; i++) {
    const q = clamp01((u - i * 0.04) / 0.7);
    if (q <= 0 || q >= 1) continue;
    const yo = (hash01(i * 3) - 0.5) * s * 0.9, x0 = hx - s * 1.1 + q * s * 2.2, y0 = hy + yo + Math.sin(q * 6 + i) * s * 0.12;
    g.strokeStyle = rgba(i % 2 ? WHITE : LEAF, 0.6 * Math.sin(Math.PI * q) * k); g.lineWidth = Math.max(1, s * 0.025);
    g.beginPath(); g.moveTo(x0 - s * 0.5, y0 + s * 0.06); g.quadraticCurveTo(x0 - s * 0.2, y0 - s * 0.08, x0, y0); g.stroke();
    petal(g, x0, y0, s * 0.09, q * 9 + i, i % 3 === 2 ? PINK : LEAF, Math.sin(Math.PI * q));
  }
}
function collideFx(g, e, t, lowQ) {
  if (!okT(e.at)) return;
  const n = Math.max(1, e.size | 0), B = bodyOf(e.at.x, e.at.y, n), s = B.s, [hx, hy] = B.top, u = t / CELINE_FX_DUR.celineCollide;
  g.globalCompositeOperation = "lighter";
  glow(g, hx, hy, s * 0.9, WHITE, 0.8 * clamp01(1 - u * 2.5));
  // ดาวแตก 8 แฉก
  const q = easeOut3(clamp01(u * 3)), k = 1 - u;
  g.beginPath();
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, r = (i % 2 ? 0.25 : 0.75) * s * q; const px = hx + Math.cos(a) * r, py = hy + Math.sin(a) * r * 0.8; if (i) g.lineTo(px, py); else g.moveTo(px, py); }
  g.closePath(); g.fillStyle = rgba(GOLD, 0.6 * k); g.fill();
  g.globalCompositeOperation = "source-over";
  petalBurst(g, hx, hy, s, u, 811, 10, 1.1, [PINK, CREAM, GOLD], lowQ);
}

export function celineFx(g, e, now, lowQ, view) {
  if (e.kind in CELINE_MS) {
    if (e.kind === "celineDagger") daggerFx(g, e, now, lowQ);
    else if (e.kind === "celineDragon") dragonFx(g, e, now, lowQ);
    else if (e.kind === "celineGreat") greatFx(g, e, now, lowQ);
    else if (e.kind === "celineFire") fireFx(g, e, now, lowQ);
    else if (e.kind === "celineWind") windFx(g, e, now, lowQ);
    else if (e.kind === "celineThunder") thunderFx(g, e, now, lowQ);
    return;
  }
  const t = now - e.t0;
  if (t < 0 || t > (e.dur || CELINE_FX_DUR[e.kind] || 0)) return;
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  if (e.kind === "celineHeal") healFx(g, e, t, now, lowQ);
  else if (e.kind === "celineWall") wallFx(g, e, t, now, lowQ);
  else if (e.kind === "celineWallBreak") wallBreakFx(g, e, t, now, lowQ);
  else if (e.kind === "celineSwap") swapFx(g, e, t, now, lowQ);
  else if (e.kind === "celineBloom") bloomFx(g, e, t, now, lowQ);
  else if (e.kind === "celineTrail") trailFx(g, e, t, lowQ);
  else if (e.kind === "celineWeapon") weaponFx(g, e, t, now, lowQ);
  else if (e.kind === "celineUlt") ultFx(g, e, t, now, lowQ, view);
  else if (e.kind === "celineTea") teaFx(g, e, t, now, lowQ);
  else if (e.kind === "celineBurn") burnFx(g, e, t, now, lowQ);
  else if (e.kind === "celineShock") shockFx(g, e, t, now, lowQ);
  else if (e.kind === "celineGust") gustFx(g, e, t, now, lowQ);
  else if (e.kind === "celineCollide") collideFx(g, e, t, lowQ);
  else if (e.kind === "celineCrit") critFx(g, e, t, lowQ);
  g.restore();
}

// =================================================================== ของค้างบนกระดาน
// พุ่มงอก: 0..1 ตามเหตุการณ์ trail/bloom ที่กำลังเล่น (ไม่มี = 1 เต็ม)
export function celineSprout(fx, x, y, now) {
  let v = 1;
  if (!Array.isArray(fx)) return v;
  for (const e of fx) {
    if (!e || (e.kind !== "celineTrail" && e.kind !== "celineBloom")) continue;
    const tiles = e.tiles || [], i = tiles.findIndex((p) => p && p.x === x && p.y === y);
    if (i < 0) continue;
    const delay = e.kind === "celineTrail" ? i * (e.step || CELINE_STEP_MS) : 160, dt = now - e.t0 - delay;
    v = Math.min(v, dt <= 0 ? 0 : dt >= SPROUT_MS ? 1 : Math.max(0, easeOutBack(dt / SPROUT_MS)));
  }
  return v;
}
// กำแพงงอกขึ้น 0..1 (เหตุการณ์ wall ที่กำลังเล่น · ไม่มี = 1)
export function celineWallRise(fx, x, y, now) {
  if (!Array.isArray(fx)) return 1;
  for (const e of fx) {
    if (!e || e.kind !== "celineWall") continue;
    const i = (e.tiles || []).findIndex((p) => p && p.x === x && p.y === y);
    if (i < 0) continue;
    const dt = now - e.t0 - wallStagger(e, i);
    return dt <= 0 ? 0 : dt >= 380 ? 1 : Math.max(0, easeOutBack(dt / 380));
  }
  return 1;
}
// พรมกลีบใต้พุ่ม (ก่อนไฮไลต์)
function floraGround(g, f, gk, lowQ) {
  const { x, y } = f, seed = x * 131 + y * 17, wilt = f.left === 1, made = !!f.made, a = (wilt ? 0.6 : 1) * Math.min(1, gk * 1.4);
  if (a <= 0.01) return;
  gEllipse(g, x + 0.5, y + 0.5, 0.45 * Math.min(1, gk), 0.004, 24); g.fillStyle = rgba(wilt ? "92,96,46" : LEAF_DD, 0.42 * a); g.fill();
  gEllipse(g, x + 0.5, y + 0.5, 0.34 * Math.min(1, gk), 0.005, 20); g.fillStyle = rgba(wilt ? "140,140,70" : LEAF_D, 0.45 * a); g.fill();
  if (made) { gEllipse(g, x + 0.5, y + 0.5, 0.47, 0.006, 28); g.strokeStyle = rgba(GOLD, 0.6 * a); g.lineWidth = 1.4; g.stroke(); }
  const N = lowQ ? 3 : 7;
  for (let i = 0; i < N; i++) {
    const an = hash01(seed + i) * TAU, r = 0.18 + 0.26 * hash01(seed + i * 3.3), p = P(x + 0.5 + Math.cos(an) * r, y + 0.5 + Math.sin(an) * r, 0.006);
    g.save(); g.translate(p[0], p[1]); g.scale(1, 0.55);
    petal(g, 0, 0, p[2] * 0.07, an * 3, wilt ? "190,140,120" : i % 3 === 0 && made ? GOLD : i % 2 ? PINK : CREAM, 0.85 * a);
    g.restore();
  }
}
// พุ่ม (ครึ่งหลัง front = false / ครึ่งหน้า front = true)
function floraBush(g, f, gk, now, lowQ, front) {
  if (gk <= 0.01) return;
  const { x, y } = f, seed = x * 131 + y * 17, wilt = f.left === 1, made = !!f.made;
  const sway = lowQ || REDUCED ? 0 : Math.sin(now / 850 + seed) * 0.025;
  const hK = gk * (wilt ? 0.66 : 1) * (made ? 1.15 : 0.95), cD = depthOf(x + 0.5, y + 0.5);
  const NB = lowQ ? 7 : made ? 15 : 11;
  const blobs = [];
  for (let i = 0; i < NB; i++) {
    const an = hash01(seed + i * 1.7) * TAU, rad = (0.06 + 0.27 * hash01(seed + i * 2.9)) * Math.min(1.1, gk);
    const px = x + 0.5 + Math.cos(an) * rad, py = y + 0.5 + Math.sin(an) * rad * 0.9, z = (0.07 + 0.3 * hash01(seed + i * 4.3)) * hK;
    const isFront = depthOf(px, py) > cD;
    if (isFront !== front) continue;
    blobs.push({ px, py, z: front ? Math.min(z, 0.14 * hK) : z, r: (0.11 + 0.07 * hash01(seed + i * 5.1)) * gk, d: depthOf(px, py) - z * 0.01, i });
  }
  blobs.sort((a, b) => a.d - b.d);
  const shade = wilt ? ["98,104,52", "128,128,64", "156,150,80"] : ["62,112,42", LEAF_D, LEAF];
  for (const b of blobs) {
    const p = P(b.px + sway * b.z * 4, b.py, b.z), r = b.r * p[2];
    g.beginPath(); g.arc(p[0], p[1], r, 0, TAU); g.fillStyle = rgba(shade[b.z > 0.16 * hK ? 2 : b.z > 0.08 * hK ? 1 : 0], 1); g.fill();
    g.beginPath(); g.arc(p[0] - r * 0.28, p[1] - r * 0.3, r * 0.45, 0, TAU); g.fillStyle = rgba(wilt ? "176,170,100" : "205,232,140", 0.55); g.fill();
  }
  if (front) return;
  // ดอกไม้บนพุ่ม
  const NFl = lowQ ? (made ? 4 : 2) : made ? 7 : 4, cols = made ? [PINK, GOLD, CREAM, PINK, ORANGE, CREAM, PINK] : [PINK, CREAM, PINK, CREAM];
  for (let j = 0; j < NFl; j++) {
    const an = hash01(seed + 50 + j) * TAU, rad = (0.05 + 0.22 * hash01(seed + 60 + j * 2)) * gk, z = (0.28 + 0.14 * hash01(seed + 70 + j)) * hK + 0.02 - (wilt ? 0.06 : 0);
    const p = P(x + 0.5 + Math.cos(an) * rad + sway * z * 4, y + 0.5 + Math.sin(an) * rad * 0.9, z);
    flower(g, p[0], p[1], p[2] * (made ? 0.115 : 0.095) * Math.min(1.1, gk), an + sway * 3, 5, wilt ? "210,150,150" : cols[j % cols.length], wilt ? "200,170,90" : GOLD, wilt ? 0.7 : 1, 0.72);
  }
  // ประกายทองวิบวับ (พุ่มรังสรรค์)
  if (made && !lowQ && !REDUCED) {
    const tw = Math.sin(now / 420 + seed);
    if (tw > 0.6) {
      const p = P(x + 0.5 + Math.cos(seed) * 0.15, y + 0.5, 0.42 * hK);
      g.save(); g.globalCompositeOperation = "lighter"; sparkle(g, p[0], p[1], p[2] * 0.08 * (tw - 0.6) / 0.4, (tw - 0.6) / 0.4, CREAM); g.restore();
    }
  }
  // เหี่ยว: กลีบร่วงช้าๆ
  if (wilt && !lowQ && !REDUCED) {
    const q = (now / 2200 + hash01(seed)) % 1, an = hash01(seed + 9) * TAU;
    const p = P(x + 0.5 + Math.cos(an) * 0.2 + Math.sin(q * 6) * 0.06, y + 0.5 + Math.sin(an) * 0.18, 0.35 * (1 - q));
    petal(g, p[0], p[1], p[2] * 0.06, q * 8, "214,150,150", Math.sin(Math.PI * q) * 0.9);
  }
}
const floraOf = (cel) => (cel && Array.isArray(cel.flora) ? cel.flora.filter((f) => f && Number.isFinite(f.x) && Number.isFinite(f.y)) : []);
const kingsOf = (cel) => (cel && Array.isArray(cel.kings) ? cel.kings : []);

// ชั้นพื้น: พรมกลีบใต้พุ่ม + วงเถาวัลย์ทองใต้ราชาดอกไม้
export function drawCelineGround(g, cel, fx, now, lowQ, units) {
  const flora = floraOf(cel);
  if (flora.length) {
    g.save();
    for (const f of flora) floraGround(g, f, celineSprout(fx, f.x, f.y, now), lowQ);
    g.restore();
  }
  const kings = kingsOf(cel);
  if (kings.length) {
    for (const c of kings) {
      const n = Math.max(1, c.size | 0), u = Array.isArray(units) ? units.find((it) => it.id === c.id && !it.corpse) : null;
      const cx = u ? u.rx + n / 2 + (u.ox || 0) : c.x + n / 2, cy = u ? u.ry + n / 2 + (u.oy || 0) : c.y + n / 2;
      const rot = REDUCED ? 0 : now / 2400, pulse = REDUCED ? 0.5 : 0.5 + 0.5 * Math.sin(now / 520);
      vineSigil(g, cx, cy, 0.02, 0.62 * n, rot, 0.45 + 0.2 * pulse, lowQ);
    }
  }
}
// เรียงความลึกกับตัวละคร: พุ่ม (ครึ่งหลัง/หน้า) · กำแพงค้าง (แตกตอนปะทะ) · กำแพงพรีวิว (เลือกช่องวาง)
export function celineItems(items, g, cel, fx, now, lowQ) {
  for (const f of floraOf(cel)) {
    const d = depthOf(f.x + 0.5, f.y + 0.5);
    items.push({ d: d - 0.01, f: () => floraBush(g, f, celineSprout(fx, f.x, f.y, now), now, lowQ, false) });
    items.push({ d: d + 0.012, f: () => floraBush(g, f, celineSprout(fx, f.x, f.y, now), now, lowQ, true) });
  }
  const group = (list, o) => {
    const set = new Set(list.map((p) => `${p.x},${p.y}`)), has = (x, y) => set.has(`${x},${y}`) || !!(o.terrain && o.terrain[`${x},${y}`] === "icewall");
    for (const p of list) {
      const conn = { l: has(p.x - 1, p.y), r: has(p.x + 1, p.y), u: has(p.x, p.y - 1), d: has(p.x, p.y + 1) };
      if (o.orient === "h") { conn.u = false; conn.d = false; } else if (o.orient === "v") { conn.l = false; conn.r = false; }
      items.push({ d: depthOf(p.x + 0.5, p.y + 0.5) + 0.05, f: () => drawCelineWall(g, p.x, p.y, conn, { now, lowQ, alpha: o.alpha, bad: o.bad }) });
    }
  };
  if (cel && Array.isArray(cel.hold) && cel.hold.length) group(cel.hold.filter(okT), { terrain: cel.terrain });
  const pv = cel && cel.preview;
  if (pv && Array.isArray(pv.tiles) && pv.tiles.length) group(pv.tiles.filter(okT), { orient: pv.orient, alpha: pv.ok ? 0.5 : 0.32, bad: !pv.ok });
}

// กำแพงน้ำแข็ง 1 ช่อง: แผ่นผลึกใสตามแนวที่ต่อกัน (conn = { l, r, u, d } ช่องข้างเป็นกำแพงเหมือนกัน) · ยอดคริสตัล · ลายดอกน้ำแข็ง
//  o = { rise 0..1, alpha, now, lowQ, bad (พรีวิววางไม่ได้ = ขอบแดง) }
export function drawCelineWall(g, x, y, conn, o = {}) {
  const rise = o.rise == null ? 1 : o.rise;
  if (rise <= 0.01) return;
  const c0 = conn || {}, alpha = o.alpha == null ? 1 : o.alpha, now = o.now || 0, lowQ = !!o.lowQ;
  const hor = !!(c0.l || c0.r), ver = !!(c0.u || c0.d);
  let x0, x1, y0, y1;
  if (hor && !ver) { x0 = c0.l ? x : x + 0.1; x1 = c0.r ? x + 1 : x + 0.9; y0 = y + 0.3; y1 = y + 0.7; }
  else if (ver && !hor) { y0 = c0.u ? y : y + 0.1; y1 = c0.d ? y + 1 : y + 0.9; x0 = x + 0.3; x1 = x + 0.7; }
  else { x0 = x + 0.16; x1 = x + 0.84; y0 = y + 0.16; y1 = y + 0.84; }
  const H = 1.0 * rise, along = x1 - x0 >= y1 - y0, len = along ? x1 - x0 : y1 - y0, seed = x * 37 + y * 101;
  const cs = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const sides = [[0, 1, 0, -1, "u"], [1, 2, 1, 0, "r"], [2, 3, 0, 1, "d"], [3, 0, -1, 0, "l"]];
  g.save(); g.globalAlpha *= alpha; g.lineJoin = "round";
  // พื้นน้ำแข็งใต้ผนัง
  gEllipse(g, (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2 + 0.12, 0.004, 28, (y1 - y0) / 2 + 0.12);
  g.fillStyle = rgba(ICE, 0.35); g.fill();
  // ผนังด้านข้างที่หันเข้ากล้อง
  for (const [i, j, nx, ny, cn] of sides) {
    if (c0[cn] && ((cn === "l" || cn === "r") ? hor : ver)) continue; // ด้านที่ต่อกับช่องข้าง = ไม่วาด (ไม่มีรอยต่อ)
    const mx = (cs[i][0] + cs[j][0]) / 2, my = (cs[i][1] + cs[j][1]) / 2;
    if (!faceVisible(nx, ny, mx, my)) continue;
    const a0 = P(cs[i][0], cs[i][1], 0), a1 = P(cs[j][0], cs[j][1], 0), b1 = P(cs[j][0], cs[j][1], H), b0 = P(cs[i][0], cs[i][1], H);
    g.beginPath(); g.moveTo(a0[0], a0[1]); g.lineTo(a1[0], a1[1]); g.lineTo(b1[0], b1[1]); g.lineTo(b0[0], b0[1]); g.closePath();
    const gr = g.createLinearGradient(0, a0[1], 0, b0[1]);
    const lit = nx < 0 || ny < 0;
    gr.addColorStop(0, rgba(lit ? ICE_M : ICE_D, 0.82)); gr.addColorStop(1, rgba(lit ? ICE : ICE_M, 0.72));
    g.fillStyle = gr; g.fill();
    g.strokeStyle = o.bad ? "rgba(255,120,120,.9)" : "rgba(255,255,255,.75)"; g.lineWidth = 1.2; g.stroke();
    // ลายดอกน้ำแข็งบนผนัง
    const fl = Math.max(1, Math.round(Math.hypot(cs[j][0] - cs[i][0], cs[j][1] - cs[i][1]) * 2));
    for (let k = 0; k < fl; k++) {
      const u = (k + 0.5) / fl, v = 0.3 + 0.35 * hash01(seed + k * 3 + i);
      const p = P(lerp(cs[i][0], cs[j][0], u), lerp(cs[i][1], cs[j][1], u), H * v);
      frostFlake(g, p[0], p[1], p[2] * 0.075, 0.7, k % 2 ? WHITE : FROST_PINK);
    }
    // แถบเงาวิ่งผ่าน
    if (!lowQ && !REDUCED) {
      const b = ((now / 1700 + hash01(seed + i)) % 1.8) - 0.4;
      if (b > 0 && b < 1) {
        g.save(); g.beginPath(); g.moveTo(a0[0], a0[1]); g.lineTo(a1[0], a1[1]); g.lineTo(b1[0], b1[1]); g.lineTo(b0[0], b0[1]); g.closePath(); g.clip();
        const q0 = P(lerp(cs[i][0], cs[j][0], b), lerp(cs[i][1], cs[j][1], b), 0), q1 = P(lerp(cs[i][0], cs[j][0], Math.min(1, b + 0.25)), lerp(cs[i][1], cs[j][1], Math.min(1, b + 0.25)), H);
        g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = Math.max(2, q0[2] * 0.06); g.beginPath(); g.moveTo(q0[0], q0[1]); g.lineTo(q1[0], q1[1]); g.stroke();
        g.restore();
      }
    }
  }
  // หน้าบน
  g.beginPath(); cs.forEach(([cx, cy], k) => { const p = P(cx, cy, H); if (k) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.closePath();
  g.fillStyle = "rgba(236,250,255,.88)"; g.fill(); g.strokeStyle = o.bad ? "rgba(255,120,120,.9)" : "rgba(255,255,255,.95)"; g.lineWidth = 1.2; g.stroke();
  // ยอดคริสตัลตามแนวผนัง
  const NC = Math.max(2, Math.round(len * 3));
  for (let k = 0; k < NC; k++) {
    const u = (k + 0.5) / NC, h = (0.16 + 0.26 * hash01(seed + k * 7.3)) * rise, w = 0.07 + 0.05 * hash01(seed + k * 2.1);
    const cx = along ? lerp(x0, x1, u) : (x0 + x1) / 2 + (hash01(seed + k) - 0.5) * 0.12, cy = along ? (y0 + y1) / 2 + (hash01(seed + k) - 0.5) * 0.12 : lerp(y0, y1, u);
    const ax = along ? 1 : 0, ay = along ? 0 : 1;
    const bl = P(cx - ax * w, cy - ay * w, H), br = P(cx + ax * w, cy + ay * w, H), tp = P(cx + (hash01(seed + k * 5) - 0.5) * 0.06, cy, H + h);
    g.beginPath(); g.moveTo(bl[0], bl[1]); g.lineTo(tp[0], tp[1]); g.lineTo(br[0], br[1]); g.closePath();
    g.fillStyle = rgba(k % 3 === 1 ? FROST_PINK : ICE, 0.9); g.fill(); g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 1; g.stroke();
    g.beginPath(); g.moveTo(tp[0], tp[1]); g.lineTo((bl[0] + br[0]) / 2, (bl[1] + br[1]) / 2); g.strokeStyle = "rgba(255,255,255,.6)"; g.stroke();
  }
  // ประกายทองที่ยอด
  if (!lowQ && !REDUCED && !o.bad) {
    const tw = Math.sin(now / 380 + seed);
    if (tw > 0.55) {
      const p = P((x0 + x1) / 2, (y0 + y1) / 2, H + 0.3);
      g.globalCompositeOperation = "lighter"; sparkle(g, p[0], p[1], p[2] * 0.09 * (tw - 0.55) / 0.45, (tw - 0.55) / 0.45, CREAM);
    }
  }
  g.restore();
}

// ชั้นบนตัวละคร: ราชาดอกไม้ — มงกุฎลอยเหนือหัว + กลีบโคจร + ผีเสื้อ
export function drawCelineAir(g, cel, units, now, lowQ) {
  const kings = kingsOf(cel);
  if (!kings.length) return;
  for (const c of kings) {
    const n = Math.max(1, c.size | 0), u = Array.isArray(units) ? units.find((it) => it.id === c.id && !it.corpse) : null;
    const wx = u ? u.rx + (u.ox || 0) : c.x, wy = u ? u.ry + (u.oy || 0) : c.y, hz = u ? u.hz || 0 : 0;
    const B = bodyOf(wx, wy, n), s = B.s, lift = hz * s * 0.85, bob = REDUCED ? 0 : Math.sin(now / 420) * s * 0.05;
    const cx = B.head[0], cy = B.head[1] - lift + bob;
    g.save();
    g.globalCompositeOperation = "lighter";
    glow(g, cx, cy - s * 0.12, s * 0.5, GOLD, 0.45);
    // กลีบโคจรรอบตัว (หน้า = ใหญ่/ชัด หลัง = เล็ก/จาง)
    const NP = lowQ ? 4 : 7, tt = REDUCED ? 0 : now / 900;
    g.globalCompositeOperation = "source-over";
    for (let i = 0; i < NP; i++) {
      const a = tt + i * TAU / NP, depth = (Math.sin(a) + 1) / 2, rx = s * 0.62 * n, ry = s * 0.2 * n;
      petal(g, B.top[0] + Math.cos(a) * rx, B.top[1] - lift + Math.sin(a) * ry + Math.sin(tt * 3 + i) * s * 0.06, s * (0.06 + 0.04 * depth), a * 2, FLOWER_COLS[i % 4], 0.45 + 0.5 * depth);
    }
    crown(g, cx, cy, s * 0.42, 1);
    // ผีเสื้อ 2 ตัวบินวน
    if (!lowQ) for (let i = 0; i < 2; i++) {
      const a = (REDUCED ? 0 : now / 1300) * (i ? -1 : 1) + i * Math.PI;
      butterfly(g, B.top[0] + Math.cos(a) * s * 0.75, B.top[1] - lift - s * 0.35 + Math.sin(a * 2) * s * 0.18, s * 0.13, REDUCED ? 0 : now / 60 + i, Math.cos(a) * 0.4, i ? ORANGE : PINK, 0.95);
    }
    g.restore();
  }
}

// =================================================================== socket "celineFx" → เอฟเฟกต์
//  ctx = { posOf(id), sizeOf(id) } · คืน { fx, look: [[pos, ms]], shake: [ms], busy: [{ id, ms }], later: [[ms, fx[]]] }
export function celineEventFx(ev, ctx = {}) {
  const out = { fx: [], look: [], shake: [], busy: [], later: [] };
  if (!ev || typeof ev !== "object") return out;
  const posOf = (id) => { const p = id != null && typeof ctx.posOf === "function" ? ctx.posOf(id) : null; return okT(p) ? ptOf(p) : null; };
  const sizeOf = (id) => (id != null && typeof ctx.sizeOf === "function" ? Math.max(1, ctx.sizeOf(id) | 0) : 1);
  const tilesOf = (list) => (Array.isArray(list) ? list.filter(okT).map(ptOf) : []);
  const at = okT(ev.at) ? ptOf(ev.at) : null;
  switch (ev.kind) {
    case "heal": {
      const to = okT(ev.to) ? ptOf(ev.to) : posOf(ev.targetId);
      if (!to) break;
      const from = okT(ev.from) ? ptOf(ev.from) : posOf(ev.id);
      const dur = ev.crit ? 2000 : 1700;
      out.fx.push({ kind: "celineHeal", x: to.x, y: to.y, from, to, self: !!ev.self, crit: !!ev.crit, mult: ev.mult, fromSize: sizeOf(ev.id), toSize: sizeOf(ev.targetId), dur });
      out.look.push([to, 0]);
      if (ev.crit) out.later.push([640, [{ kind: "float", x: to.x, y: to.y - 0.6, text: "คริติคอล", color: "#ffd84a", size: 24 }]]);
      break;
    }
    case "wall": {
      const tiles = tilesOf(ev.tiles);
      if (!tiles.length) break;
      const mid = tiles[Math.floor(tiles.length / 2)];
      out.fx.push({ kind: "celineWall", x: mid.x, y: mid.y, tiles, orient: ev.orient === "v" ? "v" : "h" });
      out.look.push([mid, 0]);
      break;
    }
    case "wallBreak": {
      const tiles = tilesOf(ev.tiles);
      if (!tiles.length) break;
      out.fx.push({ kind: "celineWallBreak", x: tiles[0].x, y: tiles[0].y, tiles, why: ev.why === "expire" ? "expire" : "hit" });
      break;
    }
    case "swap": {
      const role = (r) => (r && r.id != null && okT(r.from) && okT(r.to) ? { id: r.id, from: ptOf(r.from), to: ptOf(r.to), size: sizeOf(r.id) } : null);
      const a = role(ev.a), b = role(ev.b);
      if (!a && !b) break;
      const by = posOf(ev.id);
      out.fx.push({ kind: "celineSwap", x: (a || b).to.x, y: (a || b).to.y, a, b, mode: ev.mode === "pair" ? "pair" : "swap", by, bySize: sizeOf(ev.id) });
      for (const r of [a, b]) if (r) out.busy.push({ id: r.id, ms: SWAP_MS + 120 });
      const m = a && b ? { x: Math.round((a.from.x + b.from.x) / 2), y: Math.round((a.from.y + b.from.y) / 2) } : (a || b).to;
      out.look.push([m, 0]);
      break;
    }
    case "bloom": {
      const tiles = tilesOf(ev.tiles);
      if (!tiles.length) break;
      out.fx.push({ kind: "celineBloom", x: tiles[0].x, y: tiles[0].y, tiles, made: ev.made !== false });
      out.look.push([tiles[0], 0]);
      break;
    }
    case "trail": {
      const tiles = tilesOf(ev.tiles);
      if (!tiles.length) break;
      out.fx.push({ kind: "celineTrail", x: tiles[0].x, y: tiles[0].y, tiles, step: CELINE_STEP_MS, dur: tiles.length * CELINE_STEP_MS + SPROUT_MS + 700 });
      break;
    }
    case "weapon": {
      const p = at || posOf(ev.id);
      if (!p) break;
      out.fx.push({ kind: "celineWeapon", x: p.x, y: p.y, at: p, weapon: ev.weapon, size: sizeOf(ev.id) });
      out.look.push([p, 0]);
      break;
    }
    case "ult": {
      const p = at || posOf(ev.id);
      if (!p) break;
      out.fx.push({ kind: "celineUlt", x: p.x, y: p.y, at: p, size: sizeOf(ev.id) });
      out.look.push([p, 0]);
      out.shake.push(CELINE_ULT.crown);
      break;
    }
    case "tea": {
      const p = at || posOf(ev.id);
      if (!p) break;
      out.fx.push({ kind: "celineTea", x: p.x, y: p.y, at: p, size: sizeOf(ev.id), crit: !!ev.crit });
      if (ev.crit) out.later.push([300, [{ kind: "float", x: p.x, y: p.y - 0.6, text: "คริติคอล", color: "#ffd84a", size: 22 }]]);
      break;
    }
    case "burn": case "shock": case "gust": case "collide": {
      const p = posOf(ev.targetId) || at;
      if (!p) break;
      const kind = { burn: "celineBurn", shock: "celineShock", gust: "celineGust", collide: "celineCollide" }[ev.kind];
      out.fx.push({ kind, x: p.x, y: p.y, at: p, size: sizeOf(ev.targetId), targetId: ev.targetId, ...(ev.kind === "collide" && ev.targetId != null ? { hitIds: [ev.targetId] } : {}) });
      if (ev.kind === "collide") out.shake.push(0);
      break;
    }
    default: break;
  }
  return out;
}
