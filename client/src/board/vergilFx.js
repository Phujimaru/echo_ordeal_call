// ============================================================
//  เอฟเฟกต์บนกระดานของเวอจิล (Devil May Cry · characters/vergil.js · GRID_PLAN §7.40)
//  โทนยามาโตะ: ฟ้าอมขาว (ใบดาบ/รอยฟันมิติ) · ม่วง (Doppelganger) · ขาวบาด (จังหวะปะทะ)
//
//  เหตุการณ์ (socket "vergilFx" → vergilEventFx · จังหวะตาม FX_MS ใน characters/vergil.js):
//   rapid   vgRapid   พุ่งเข้าหาเป้า (เงาตามหลัง) → ฟันโค้ง 3 ครั้งไขว้กัน + ประกาย + จอสั่นทีละจังหวะ → ถอยกลับที่เดิม
//                     เป้าลอย = ฟันกลางอากาศแล้วตบลงพื้น (คลื่นกระแทก)
//   upper   vgUpper   ย่อตัว → รอยฟันพุ่งขึ้นฟ้า (เสาแสง) → เป้าลอยขึ้น
//   shadow  vgShadow  ร่างเงาม่วงโผล่อีกฝั่งของเป้า ฟันไขว้ตาม
//   whiff   vgWhiff   ฟันวืด (ถูกหลบ) — เป้าเบี่ยงตัว
//   doppel  vgDoppel  ระเบิดออร่าม่วง + ร่างเงาแยกออกจากตัว
//   sheathe vgSheathe เก็บดาบ: ประกายแวบที่ตัว + วงฟ้าบาง
//   break   vgBreak   คอมโบหลุด: เศษแสงฟ้าแตกร่วง
//   land    vgLand    จบตาขณะลอย: ดิ่งฟันจากฟ้าตบเป้าลงพื้น (วงกระแทก)
//  กลางอากาศ: ev.vair = เวอจิลลอยอยู่ก่อนท่า · ev.air = เป้าลอย — ฟันรัวค้างบนฟ้า ไม่ลงพื้นจนจบตา
//  ตัวหมาก: u.vg = { air, doppel } — ลอยกลางอากาศ (ยกหมาก + วงแสงใต้ตัว) · ออร่าม่วง Doppelganger
//  เสียง: เล่นตามจังหวะปะทะของแต่ละครั้ง (VG_SFX) · mute = ครั้งที่เปิด Judgment Cut End (ห้ามเสียงตัดหน้าคลิป)
//  lowQ = ตัดอนุภาค/เงาครึ่งหนึ่ง · ลดการเคลื่อนไหว = ไม่สั่น ไม่เต้น
// ============================================================
import { P, gEllipse, glow } from "./boardGeo";

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;
const CYAN = "120,220,255", ICE = "205,245,255", WHITE = "255,255,255", DEEP = "40,120,255", VIOLET = "168,110,255", VIOLET_HI = "222,200,255";

// ---------- จังหวะ (ms) — สัญญากับ server (FX_MS ใน characters/vergil.js ต้องไม่สั้นกว่านี้) ----------
export const VG_T = {
  rapid: 640, rapidDash: 90, rapidHits: [150, 260, 370], rapidBack: 500,
  upper: 620, upperDash: 90, upperHit: 230,
  shadow: 520, shadowHit: 200,
  whiff: 520, whiffHit: 170,
  doppel: 1100, sheathe: 700, brk: 650,
  land: 560, landHit: 230,
};
export const VG_FX_DUR = {
  vgRapid: VG_T.rapid, vgUpper: VG_T.upper, vgShadow: VG_T.shadow, vgWhiff: VG_T.whiff,
  vgDoppel: VG_T.doppel, vgSheathe: VG_T.sheathe, vgBreak: VG_T.brk, vgLand: VG_T.land,
};
export const isVergilFx = (kind) => typeof kind === "string" && (kind in VG_FX_DUR);
// เสียงต่อจังหวะ (คีย์ใน client/src/audio.js) — สลับไฟล์ให้ไม่ซ้ำซาก
export const VG_SFX = { rapid: ["vergil_slash1", "vergil_slash2", "vergil_slash3"], slam: "vergil_slam", upper: "vergil_upper", shadow: "vergil_shadow", whiff: "vergil_whiff", doppel: "vergil_doppel", sheathe: "vergil_sheathe" };
export const VG_AIR_Z = 0.85;

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut3 = (q) => 1 - (1 - q) ** 3;
const easeIn2 = (q) => q * q;
const hash01 = (i) => { const s = Math.sin(i * 127.1 + 11.7) * 43758.5453; return s - Math.floor(s); };
const okT = (t) => !!t && Number.isFinite(t.x) && Number.isFinite(t.y);
const ctr = (t, n = 1) => ({ x: t.x + n / 2, y: t.y + n / 2 });

// ---------- ชิ้นส่วนวาด ----------
// รอยฟันโค้ง (จันทร์เสี้ยว) รอบจุด (cx, cy) บนพื้นที่สูง z · ang = มุมแนวฟัน · len = ความยาว (ช่อง) · q = ความคืบหน้า 0..1
function crescent(g, cx, cy, z, ang, len, q, a, rgb = CYAN, w = 1, seed = 0) {
  if (!(a > 0)) return;
  const grow = easeOut3(clamp01(q / 0.35)), fade = q < 0.35 ? 1 : 1 - clamp01((q - 0.35) / 0.65);
  const ca = Math.cos(ang), sa = Math.sin(ang), nx = -sa, ny = ca, bend = 0.32 + 0.12 * hash01(seed);
  const pts = [];
  const N = 14;
  for (let i = 0; i <= N; i++) {
    const s = (i / N - 0.5) * len * grow, k = 1 - (2 * i / N - 1) ** 2;
    pts.push(P(cx + ca * s + nx * bend * k * len * 0.5, cy + sa * s + ny * bend * k * len * 0.5, z + k * 0.12));
  }
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
  for (const [lw, al, col] of [[14 * w, 0.22, DEEP], [8 * w, 0.55, rgb], [3 * w, 0.95, WHITE]]) {
    g.beginPath();
    pts.forEach(([x, y], i) => { if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    g.strokeStyle = `rgba(${col},${al * a * fade})`;
    g.lineWidth = lw * (pts[0][2] / 60);
    g.stroke();
  }
  g.restore();
}
// ประกายกระเด็นจากจุดปะทะ
function sparks(g, cx, cy, z, q, n, seed, rgb = ICE, reach = 1) {
  if (q <= 0 || q >= 1) return;
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < n; i++) {
    const an = hash01(seed + i * 3) * TAU, sp = (0.35 + 0.65 * hash01(seed + i * 5)) * reach, d = sp * easeOut3(q);
    const [x0, y0, s] = P(cx + Math.cos(an) * d * 0.55, cy + Math.sin(an) * d * 0.55, z + d * 0.35 * hash01(seed + i));
    const [x1, y1] = P(cx + Math.cos(an) * d, cy + Math.sin(an) * d, z + d * 0.5 * hash01(seed + i));
    g.strokeStyle = `rgba(${rgb},${(1 - q) * 0.95})`; g.lineWidth = Math.max(1, s * 0.03);
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  }
  g.restore();
}
function ring(g, cx, cy, r, a, rgb, w = 2, z = 0.02) {
  if (!(a > 0) || !(r > 0)) return;
  gEllipse(g, cx, cy, r, z, 56);
  g.strokeStyle = `rgba(${rgb},${a})`; g.lineWidth = w; g.stroke();
}
// เงาตามหลังตอนพุ่ง (วงแสงจางเป็นทาง)
function afterimages(g, from, to, q, rgb, n) {
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < n; i++) {
    const k = clamp01(q - i * 0.12);
    if (k <= 0) continue;
    const x = from.x + (to.x - from.x) * k, y = from.y + (to.y - from.y) * k;
    const [bx, by, s] = P(x, y, 0.5);
    glow(g, bx, by, s * 0.42, rgb, 0.32 * (1 - i / n));
  }
  g.restore();
}
// ร่างเงา (ทรงคนจางๆ ยืนบนช่อง) — Doppelganger
function phantom(g, cx, cy, a, rgb = VIOLET, lean = 0) {
  if (!(a > 0)) return;
  const [bx, by, s] = P(cx, cy, 0), [hx, hy] = P(cx + lean * 0.12, cy, 0.95);
  g.save(); g.globalCompositeOperation = "lighter";
  glow(g, (bx + hx) / 2, (by + hy) / 2, s * 0.6, rgb, 0.55 * a);
  g.fillStyle = `rgba(${VIOLET_HI},${0.5 * a})`;
  g.beginPath(); g.ellipse(hx, hy, s * 0.09, s * 0.11, 0, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(hx - s * 0.13, hy + s * 0.1); g.lineTo(hx + s * 0.13, hy + s * 0.1); g.lineTo(bx + s * 0.17, by); g.lineTo(bx - s * 0.17, by); g.closePath();
  g.fillStyle = `rgba(${rgb},${0.45 * a})`; g.fill();
  g.restore();
}
function hitFlash(g, cx, cy, z, q, a = 1) {
  if (q < 0 || q > 1) return;
  const [x, y, s] = P(cx, cy, z);
  g.save(); g.globalCompositeOperation = "lighter";
  glow(g, x, y, s * (0.35 + 0.5 * q), WHITE, 0.9 * (1 - q) * a);
  glow(g, x, y, s * (0.6 + 0.8 * q), CYAN, 0.5 * (1 - q) * a);
  g.restore();
}

// ---------- ท่า ----------
function rapidFx(g, e, t, lowQ) {
  const n = Math.max(1, e.size | 0), from = ctr(e.from, n), to = ctr(e.to, Math.max(1, e.tsize | 0));
  const z = e.air ? VG_AIR_Z + 0.45 : 0.5;
  if (t < VG_T.rapidDash + 60) afterimages(g, from, to, clamp01(t / VG_T.rapidDash) * 0.75, CYAN, lowQ ? 2 : 5);
  const hits = Math.max(0, Math.min(3, e.hits | 0));
  VG_T.rapidHits.forEach((h, i) => {
    if (i >= hits) return;
    const q = (t - h) / 260;
    if (q < 0 || q >= 1) return;
    const ang = [-0.6, 0.75, 0.05][i] + (hash01(e.seed + i) - 0.5) * 0.3, big = i === hits - 1 ? 1.35 : 1;
    crescent(g, to.x, to.y, z, ang, 1.5 * big, q, 1, CYAN, big, e.seed + i);
    hitFlash(g, to.x, to.y, z, q * 2.2, big);
    if (!lowQ) sparks(g, to.x, to.y, z, q, 10, e.seed * 7 + i * 13, ICE, 1.1 * big);
  });
}
function upperFx(g, e, t, lowQ) {
  const n = Math.max(1, e.size | 0), from = ctr(e.from, n), to = ctr(e.to, Math.max(1, e.tsize | 0));
  if (t < VG_T.upperDash + 60) afterimages(g, from, to, clamp01(t / VG_T.upperDash) * 0.7, CYAN, lowQ ? 2 : 4);
  const q = (t - VG_T.upperHit) / (VG_T.upper - VG_T.upperHit);
  if (q < 0 || q >= 1) return;
  // รอยฟันแนวตั้งพุ่งจากพื้นขึ้นฟ้า
  const [bx, by, s] = P(to.x, to.y, 0), [tx, ty] = P(to.x, to.y, 0.2 + 2.6 * easeOut3(clamp01(q * 1.6)));
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
  const fade = 1 - clamp01((q - 0.3) / 0.7);
  for (const [lw, al, col] of [[18, 0.25, DEEP], [9, 0.6, CYAN], [3.5, 1, WHITE]]) {
    g.strokeStyle = `rgba(${col},${al * fade})`; g.lineWidth = lw * s / 60;
    g.beginPath(); g.moveTo(bx - s * 0.18, by + s * 0.05); g.quadraticCurveTo(bx + s * 0.22, (by + ty) / 2, tx, ty); g.stroke();
  }
  glow(g, bx, by, s * 0.7, CYAN, 0.45 * fade);
  g.restore();
  crescent(g, to.x, to.y, 0.8, -1.35, 1.3, q, 0.8, ICE, 1, e.seed);
  hitFlash(g, to.x, to.y, 0.6, q * 2);
  if (!lowQ) sparks(g, to.x, to.y, 0.5, q, 12, e.seed * 5 + 7, ICE, 1.2);
}
function shadowFx(g, e, t, lowQ) {
  const to = ctr(e.to, Math.max(1, e.tsize | 0)), from = okT(e.from) ? ctr(e.from, Math.max(1, e.size | 0)) : to;
  const dx = to.x - from.x, dy = to.y - from.y, d = Math.hypot(dx, dy) || 1;
  const gx = to.x + (dx / d) * 0.7, gy = to.y + (dy / d) * 0.7; // อีกฝั่งของเป้า
  const appear = clamp01(t / 120), gone = 1 - clamp01((t - 380) / 140);
  phantom(g, gx, gy, appear * gone, VIOLET, -Math.sign(dx));
  const q = (t - VG_T.shadowHit) / 300;
  if (q >= 0 && q < 1) {
    crescent(g, to.x, to.y, 0.55, 0.9, 1.4, q, 1, VIOLET, 1.1, e.seed + 5);
    crescent(g, to.x, to.y, 0.55, -0.7, 1.4, clamp01(q - 0.08), 0.9, VIOLET_HI, 0.9, e.seed + 9);
    if (!lowQ) sparks(g, to.x, to.y, 0.5, q, 8, e.seed * 11, VIOLET_HI, 1);
  }
}
function whiffFx(g, e, t) {
  const to = ctr(e.to, Math.max(1, e.tsize | 0));
  const q = (t - VG_T.whiffHit) / 320;
  if (q >= 0 && q < 1) crescent(g, to.x + 0.25, to.y - 0.2, 0.55, -0.3, 1.2, q, 0.55, CYAN, 0.8, e.seed);
}
// ดิ่งลงจากฟ้า: รอยฟันแนวดิ่งจากบนลงเป้า → ตบลงพื้น วงกระแทก 2 ชั้น + ประกาย
function landFx(g, e, t, lowQ) {
  const to = ctr(e.to, Math.max(1, e.tsize | 0));
  const dive = clamp01(t / VG_T.landHit);
  if (t < VG_T.landHit + 80) {
    const [tx, ty, s] = P(to.x, to.y, VG_AIR_Z + 1.6 * (1 - easeIn2(dive))), [bx, by] = P(to.x, to.y, 0.1);
    g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
    const a = t < VG_T.landHit ? 1 : 1 - (t - VG_T.landHit) / 80;
    for (const [lw, al, col] of [[16, 0.25, DEEP], [8, 0.6, CYAN], [3, 1, WHITE]]) {
      g.strokeStyle = `rgba(${col},${al * a})`; g.lineWidth = lw * s / 60;
      g.beginPath(); g.moveTo(tx + s * 0.12, ty - s * 0.4); g.lineTo(bx, by); g.stroke();
    }
    g.restore();
  }
  const q = (t - VG_T.landHit) / (VG_T.land - VG_T.landHit);
  if (q >= 0 && q < 1) {
    hitFlash(g, to.x, to.y, 0.1, q * 1.6, 1.3);
    ring(g, to.x, to.y, 0.3 + 1.3 * easeOut3(q), 0.95 * (1 - q), ICE, 4 * (1 - q) + 0.5);
    if (!lowQ) ring(g, to.x, to.y, 0.2 + 0.8 * easeOut3(q), 0.75 * (1 - q), DEEP, 7 * (1 - q) + 0.5);
    if (!lowQ) sparks(g, to.x, to.y, 0.05, q, 16, e.seed * 3 + 99, CYAN, 1.5);
  }
}
function doppelFx(g, e, t, lowQ) {
  const at = ctr(e.at, Math.max(1, e.size | 0)), q = t / VG_T.doppel;
  const [bx, by, s] = P(at.x, at.y, 0.5);
  g.save(); g.globalCompositeOperation = "lighter";
  glow(g, bx, by, s * (0.6 + 1.4 * easeOut3(q)), VIOLET, 0.7 * (1 - q));
  g.restore();
  ring(g, at.x, at.y, 0.3 + 1.6 * easeOut3(q), 0.85 * (1 - q), VIOLET_HI, 3 * (1 - q) + 0.5);
  if (!lowQ) ring(g, at.x, at.y, 0.2 + 1.0 * easeOut3(clamp01(q * 1.3)), 0.6 * (1 - q), VIOLET, 5 * (1 - q) + 0.5);
  // ร่างเงาแยกออกจากตัวแล้วยืนข้างหลัง
  const off = easeOut3(clamp01(q * 1.8)) * 0.55;
  phantom(g, at.x - off, at.y - off * 0.4, (1 - clamp01((q - 0.6) / 0.4)) * 0.9);
  if (!lowQ) sparks(g, at.x, at.y, 0.6, q, 16, 77, VIOLET_HI, 1.6);
}
function sheatheFx(g, e, t) {
  const at = ctr(e.at, Math.max(1, e.size | 0)), q = t / VG_T.sheathe;
  const [x, y, s] = P(at.x + 0.18, at.y, 0.55);
  g.save(); g.globalCompositeOperation = "lighter";
  const k = Math.sin(Math.PI * clamp01(q * 2.5));
  g.strokeStyle = `rgba(${WHITE},${0.95 * k})`; g.lineWidth = Math.max(1, s * 0.025);
  g.beginPath(); g.moveTo(x - s * 0.22 * k, y); g.lineTo(x + s * 0.22 * k, y); g.moveTo(x, y - s * 0.22 * k); g.lineTo(x, y + s * 0.22 * k); g.stroke();
  glow(g, x, y, s * 0.3, ICE, 0.6 * k);
  g.restore();
  ring(g, at.x, at.y, 0.45 + 0.5 * easeOut3(q), 0.6 * (1 - q), ICE, 1.5);
}
function breakFx(g, e, t, lowQ) {
  const at = ctr(e.at, Math.max(1, e.size | 0)), q = t / VG_T.brk;
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < (lowQ ? 8 : 16); i++) {
    const an = hash01(i * 3 + 1) * TAU, d = 0.2 + 0.6 * hash01(i * 7) * easeOut3(q);
    const [x, y, s] = P(at.x + Math.cos(an) * d, at.y + Math.sin(an) * d, Math.max(0, 1.2 - easeIn2(q) * 1.4 + hash01(i) * 0.4));
    g.fillStyle = `rgba(${CYAN},${0.9 * (1 - q)})`;
    g.save(); g.translate(x, y); g.rotate(an + q * 4); g.fillRect(-s * 0.03, -s * 0.012, s * 0.06, s * 0.024); g.restore();
  }
  g.restore();
}

export function vergilFx(g, e, now, lowQ) {
  const t = e.holdT != null ? e.holdT : now - e.t0;
  if (t < 0) return;
  g.save();
  switch (e.kind) {
    case "vgRapid": if (okT(e.from) && okT(e.to)) rapidFx(g, e, t, lowQ); break;
    case "vgUpper": if (okT(e.from) && okT(e.to)) upperFx(g, e, t, lowQ); break;
    case "vgShadow": if (okT(e.to)) shadowFx(g, e, t, lowQ); break;
    case "vgWhiff": if (okT(e.to)) whiffFx(g, e, t); break;
    case "vgDoppel": if (okT(e.at)) doppelFx(g, e, t, lowQ); break;
    case "vgSheathe": if (okT(e.at)) sheatheFx(g, e, t); break;
    case "vgBreak": if (okT(e.at)) breakFx(g, e, t, lowQ); break;
    case "vgLand": if (okT(e.to)) landFx(g, e, t, lowQ); break;
    default:
  }
  g.restore();
}

// ---------- ท่าทางหมาก (BoardCanvas) ----------
//  เวอจิล: พุ่งไปหยุดหน้าเป้า (เหลือ 0.38 ช่อง) สั่นตามจังหวะฟัน → ถอยกลับ · ฟันขึ้น = กระโดดตามขึ้นนิดหนึ่ง
//  เป้า: สะท้านทุกจังหวะปะทะ · ฟันขึ้น = ลอยขึ้น · ฟันเป้าลอย = ค้างกลางอากาศแล้วถูกตบลงพื้น
export function vergilPose(list, u, now) {
  if (!u || u.id == null || !Array.isArray(list)) return null;
  for (const e of list) {
    if (!e || (e.kind !== "vgRapid" && e.kind !== "vgUpper" && e.kind !== "vgWhiff" && e.kind !== "vgLand")) continue;
    const t = e.holdT != null ? e.holdT : now - e.t0;
    if (t < 0 || t >= (VG_FX_DUR[e.kind] || 0)) continue;
    if (!okT(e.from) || !okT(e.to)) continue;
    if (e.id === u.id) return attackerPose(e, t, u);
    if (e.targetId != null && e.targetId === u.id) return targetPose(e, t, u);
  }
  return null;
}
// ความสูงของเวอจิลหลังท่า: ลอยอยู่แล้ว (vair) · ท่านี้พาขึ้นฟ้า (ฟันขึ้นโดน / ฟันเป้าที่ลอย)
const airAfter = (e) => !!(e.vair || e.air || (e.kind === "vgUpper" && e.hits));
function attackerPose(e, t, u) {
  const home = { x: Number.isFinite(u.rx) ? u.rx : e.from.x, y: Number.isFinite(u.ry) ? u.ry : e.from.y };
  const dx = e.to.x - home.x, dy = e.to.y - home.y, d = Math.hypot(dx, dy) || 1;
  if (e.kind === "vgLand") {
    // ดิ่งลงไปข้างเป้าแล้วถอยกลับช่องตัวเอง
    const stop = Math.max(0, d - 0.42);
    const k = t < VG_T.landHit ? easeOut3(t / VG_T.landHit) : 1 - easeIn2(clamp01((t - VG_T.landHit - 120) / (VG_T.land - VG_T.landHit - 120)));
    const hz = t < VG_T.landHit ? VG_AIR_Z * (1 - easeIn2(t / VG_T.landHit)) + 0.35 * Math.sin(Math.PI * (t / VG_T.landHit)) : 0;
    return { x: home.x + (dx / d) * stop * k, y: home.y + (dy / d) * stop * k, hz, sq: 0 };
  }
  const stop = Math.max(0, d - 0.38), ex = home.x + (dx / d) * stop, ey = home.y + (dy / d) * stop;
  const dash = e.kind === "vgUpper" ? VG_T.upperDash : VG_T.rapidDash, end = VG_FX_DUR[e.kind], back = e.kind === "vgRapid" ? VG_T.rapidBack : end - 130;
  let k;
  if (t < dash) k = easeOut3(t / dash);
  else if (t < back) k = 1;
  else k = 1 - easeIn2(clamp01((t - back) / (end - back)));
  let x = home.x + (ex - home.x) * k, y = home.y + (ey - home.y) * k;
  if (!REDUCED && e.kind === "vgRapid" && t >= dash && t < back) {
    const j = Math.sin(t * 0.09) * 0.05; x += (dy / d) * j; y += (-dx / d) * j;
  }
  const h0 = e.vair ? VG_AIR_Z : 0, h1 = airAfter(e) ? VG_AIR_Z : 0;
  let hz;
  if (e.kind === "vgUpper" && e.hits && t >= VG_T.upperHit) {
    // ฟันขึ้นแล้วกระโดดตามเป้าขึ้นฟ้า (โค้งเกินแล้วลอยค้าง)
    const q = clamp01((t - VG_T.upperHit) / (end - VG_T.upperHit));
    hz = h0 + (h1 - h0) * easeOut3(q) + 0.45 * Math.sin(Math.PI * q);
  } else if (e.kind === "vgUpper") hz = h0;
  else hz = h0 + (h1 - h0) * clamp01(t / end);
  if (!REDUCED && hz > 0.3) hz += 0.05 * Math.sin(t * 0.03); // กลางอากาศ: ขยับขึ้นลงเบาๆ ระหว่างฟันรัว
  return { x, y, hz, sq: 0 };
}
function targetPose(e, t, u) {
  const x0 = Number.isFinite(u.rx) ? u.rx : e.to.x, y0 = Number.isFinite(u.ry) ? u.ry : e.to.y;
  const dx = e.to.x - e.from.x, dy = e.to.y - e.from.y, d = Math.hypot(dx, dy) || 1;
  if (e.kind === "vgLand") {
    let hz = VG_AIR_Z;
    if (t >= VG_T.landHit + 100) hz = t < VG_T.landHit + 260 ? 0.12 * Math.sin(Math.PI * (t - VG_T.landHit - 100) / 160) : 0;
    else if (t >= VG_T.landHit) hz = VG_AIR_Z * (1 - easeIn2((t - VG_T.landHit) / 100));
    return { x: x0, y: y0, hz, sq: 0 };
  }
  if (e.kind === "vgWhiff") {
    const k = Math.sin(Math.PI * clamp01((t - VG_T.whiffHit + 60) / 300)) * 0.28; // เบี่ยงตัวออกข้าง
    return { x: x0 + (dy / d) * k, y: y0 + (-dx / d) * k, hz: e.air ? VG_AIR_Z : 0, sq: 0 };
  }
  let shake = 0;
  const hits = e.kind === "vgRapid" ? VG_T.rapidHits.slice(0, Math.max(0, e.hits | 0)) : [VG_T.upperHit];
  for (const h of hits) { const q = (t - h) / 120; if (q >= 0 && q < 1) shake = Math.max(shake, 1 - q); }
  const push = REDUCED ? 0 : shake * 0.1;
  let hz = 0;
  if (e.kind === "vgUpper" && (e.hits | 0) > 0 && t >= VG_T.upperHit) {
    const q = clamp01((t - VG_T.upperHit) / 380), h0 = e.air ? VG_AIR_Z : 0;
    hz = h0 + (VG_AIR_Z - h0) * easeOut3(clamp01((t - VG_T.upperHit) / 260)) + (e.air ? 0.45 : 0.25) * Math.sin(Math.PI * q);
  } else if (e.air) hz = VG_AIR_Z + 0.1 + shake * 0.12; // ฟันกลางอากาศ: เด้งขึ้นทุกจังหวะ ค้างอยู่บนฟ้า
  return { x: x0 + (dx / d) * push, y: y0 + (dy / d) * push, hz, sq: 0 };
}

// ใต้หมาก: วงแสงตอนลอย · ออร่าม่วงตอน Doppelganger (boardUnits drawUnit)
export function vergilUnitBack(g, u, now, wx, wy) {
  const v = u.vg;
  if (!v) return;
  const pulse = REDUCED ? 0.5 : 0.5 + 0.5 * Math.sin(now / 260);
  g.save(); g.globalCompositeOperation = "lighter";
  if (v.air) {
    const [bx, by, s] = P(wx, wy, 0.02);
    glow(g, bx, by, s * (0.42 + 0.08 * pulse), CYAN, 0.45);
  }
  if (v.doppel) {
    const [bx, by, s] = P(wx, wy, 0.6);
    glow(g, bx, by, s * (0.75 + 0.15 * pulse), VIOLET, 0.42);
    if (!REDUCED) for (let i = 0; i < 7; i++) {
      const ph = ((now / (800 + hash01(i) * 500)) + hash01(i + 2)) % 1, an = hash01(i + 4) * TAU;
      const [x, y, ps] = P(wx + Math.cos(an) * 0.36, wy + Math.sin(an) * 0.36, ph * 1.9);
      g.fillStyle = `rgba(${VIOLET_HI},${Math.sin(Math.PI * ph) * 0.8})`; g.fillRect(x, y, ps * 0.025, ps * 0.07);
    }
  }
  g.restore();
}

// ---------- socket "vergilFx" → รายการเอฟเฟกต์ (รูปแบบเดียวกับ dioEventFx) ----------
let seedN = 1;
export function vergilEventFx(ev, ctx = {}) {
  const out = { fx: [], look: [], shake: [], busy: [], later: [], defer: [], ghosts: [], sfx: [] };
  if (!ev || typeof ev !== "object") return out;
  const sizeOf = (id) => (id != null && typeof ctx.sizeOf === "function" ? Math.max(1, ctx.sizeOf(id) | 0) : 1);
  const pt = (t) => ({ x: t.x, y: t.y });
  const seed = (seedN = (seedN * 31 + 7) % 997);
  const base = { id: ev.id, targetId: ev.targetId, size: sizeOf(ev.id), tsize: sizeOf(ev.targetId), seed };
  const snd = (ms, key) => { if (!ev.mute && key) out.sfx.push([ms, key]); };
  switch (ev.kind) {
    case "rapid": {
      if (!okT(ev.from) || !okT(ev.to)) break;
      const hits = Math.max(0, Math.min(3, ev.hits | 0));
      out.fx.push({ ...base, kind: "vgRapid", from: pt(ev.from), to: pt(ev.to), hits, air: !!ev.air, vair: !!ev.vair, dur: VG_T.rapid });
      out.busy.push({ id: ev.id, ms: VG_T.rapid });
      VG_T.rapidHits.slice(0, hits).forEach((ms, i) => { out.shake.push(ms); snd(ms - 55, i === hits - 1 ? VG_SFX.rapid[2] : VG_SFX.rapid[i % 2]); }); // จุดปะทะในไฟล์ ~55 ms
      if (hits) out.defer.push({ id: ev.targetId, ms: VG_T.rapidHits[hits - 1] });
      break;
    }
    case "upper":
      if (!okT(ev.from) || !okT(ev.to)) break;
      out.fx.push({ ...base, kind: "vgUpper", from: pt(ev.from), to: pt(ev.to), hits: ev.hits ? 1 : 0, air: !!ev.air, vair: !!ev.vair, dur: VG_T.upper });
      out.busy.push({ id: ev.id, ms: VG_T.upper });
      out.shake.push(VG_T.upperHit);
      snd(VG_T.upperHit - 100, VG_SFX.upper);
      if (ev.hits) out.defer.push({ id: ev.targetId, ms: VG_T.upperHit });
      break;
    case "shadow":
      if (!okT(ev.to)) break;
      // ช้ากว่าดาบจริง (ev.delay ms) — playOut ไม่เล่นชุดที่ fx ว่าง จึงใส่ประกายเล็กไว้ทันที แล้วร่างเงาตามมาทีหลัง
      out.later.push([ev.delay || 0, [{ ...base, kind: "vgShadow", from: okT(ev.from) ? pt(ev.from) : null, to: pt(ev.to), dur: VG_T.shadow }]]);
      out.fx.push({ ...base, kind: "vgSheathe", at: pt(ev.to), dur: 1 });
      snd(Math.max(0, VG_T.shadowHit + (ev.delay || 0) - 260), VG_SFX.shadow);
      break;
    case "whiff":
      if (!okT(ev.from) || !okT(ev.to)) break;
      out.fx.push({ ...base, kind: "vgWhiff", from: pt(ev.from), to: pt(ev.to), air: !!ev.air, vair: !!ev.vair, dur: VG_T.whiff });
      out.busy.push({ id: ev.id, ms: VG_T.whiff });
      snd(VG_T.whiffHit - 150, VG_SFX.whiff);
      break;
    case "doppel":
      if (!okT(ev.at)) break;
      out.fx.push({ ...base, kind: "vgDoppel", at: pt(ev.at), dur: VG_T.doppel });
      out.look.push([pt(ev.at), 0]);
      snd(0, VG_SFX.doppel);
      break;
    case "sheathe":
      if (!okT(ev.at)) break;
      out.fx.push({ ...base, kind: "vgSheathe", at: pt(ev.at), dur: VG_T.sheathe });
      snd(0, VG_SFX.sheathe);
      break;
    case "land":
      if (!okT(ev.from) || !okT(ev.to)) break;
      out.fx.push({ ...base, kind: "vgLand", from: pt(ev.from), to: pt(ev.to), dur: VG_T.land });
      out.busy.push({ id: ev.id, ms: VG_T.land });
      out.shake.push(VG_T.landHit, VG_T.landHit + 120);
      snd(VG_T.landHit - 35, VG_SFX.slam);
      if (ev.targetId) out.defer.push({ id: ev.targetId, ms: VG_T.landHit });
      break;
    case "break":
      if (!okT(ev.at)) break;
      out.fx.push({ ...base, kind: "vgBreak", at: pt(ev.at), dur: VG_T.brk });
      break;
    default:
  }
  return out;
}
