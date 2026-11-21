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
  route: 740, routeHits: [120, 260, 400], // ท่าคอมโบ (FX_MS.route 0.75 วิ) — จังหวะปะทะของดาบเทพ/ฟันเพิ่ม
};
export const VG_FX_DUR = {
  vgRapid: VG_T.rapid, vgUpper: VG_T.upper, vgShadow: VG_T.shadow, vgWhiff: VG_T.whiff,
  vgDoppel: VG_T.doppel, vgSheathe: VG_T.sheathe, vgBreak: VG_T.brk, vgLand: VG_T.land, vgRoute: VG_T.route,
};
// เสียงของท่าคอมโบแต่ละท่า: [ms, คีย์] (จุดปะทะในไฟล์ ~55 ms)
const ROUTE_SFX = {
  rising: [[60, "vergil_upper"]],
  helm: [[110, "vergil_slam"]],
  flow: [[0, "vergil_sheathe"]],
  lunar: [[0, "vergil_shadow"]],
  stinger: [[60, "vergil_slash1"], [205, "vergil_slash3"]],
  swords: [[40, "vergil_shadow"], [70, "vergil_slash1"], [210, "vergil_slash2"], [350, "vergil_slash3"]],
  jcut: [[40, "vergil_slash2"], [180, "vergil_slash3"], [300, "vergil_slam"]],
  starfall: [[150, "vergil_slam"]],
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
  for (const [lw, al, col] of [[22 * w, 0.2, DEEP], [12 * w, 0.55, rgb], [4.5 * w, 1, WHITE]]) {
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


// ---------- ชิ้นส่วนอลังการ (ผู้ใช้สั่ง 2026-11-21 "ทำให้แต่ละท่าอลังการกว่านี้") ----------
function viewRect(view) {
  const x0 = (view && Number.isFinite(view.x0) ? view.x0 : 0) - 60, y0 = (view && Number.isFinite(view.y0) ? view.y0 : 0) - 60;
  const x1 = (view && Number.isFinite(view.x1) ? view.x1 : 1600) + 60, y1 = (view && Number.isFinite(view.y1) ? view.y1 : 1000) + 60;
  return [x0, y0, x1 - x0, y1 - y0];
}
// สีทับทั้งจอ: op "lighter" = แสงวาบ · "source-over" = มืดลง
function screenTint(g, view, rgb, a, op = "lighter") {
  if (!(a > 0)) return;
  g.save(); g.globalCompositeOperation = op; g.fillStyle = `rgba(${rgb},${Math.min(1, a)})`; g.fillRect(...viewRect(view)); g.restore();
}
// มืดลงรอบเป้า เหลือแสงตรงกลาง (spotlight)
function spotlight(g, view, cx, cy, a) {
  if (!(a > 0)) return;
  const [x, y, s] = P(cx, cy, 0.4);
  const [rx, ry, rw, rh] = viewRect(view);
  g.save();
  const gr = g.createRadialGradient(x, y, s * 0.9, x, y, s * 6);
  gr.addColorStop(0, "rgba(4,10,26,0)"); gr.addColorStop(1, `rgba(4,10,26,${Math.min(0.75, a)})`);
  g.fillStyle = gr; g.fillRect(rx, ry, rw, rh);
  g.restore();
}
// เส้นความเร็วพุ่งออกจากจุดปะทะ (มังงะ)
function speedLines(g, cx, cy, z, q, n, seed, rgb = WHITE, reach = 2.2) {
  if (q <= 0 || q >= 1) return;
  const [x, y, s] = P(cx, cy, z);
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const an = hash01(seed + i * 7) * TAU, r0 = s * (0.5 + 0.6 * easeOut3(q)), len = s * reach * (0.4 + 0.6 * hash01(seed + i * 3));
    g.strokeStyle = `rgba(${rgb},${0.85 * (1 - q)})`; g.lineWidth = Math.max(1, s * (0.015 + 0.02 * hash01(seed + i)));
    g.beginPath(); g.moveTo(x + Math.cos(an) * r0, y + Math.sin(an) * r0 * 0.6);
    g.lineTo(x + Math.cos(an) * (r0 + len), y + Math.sin(an) * (r0 + len) * 0.6); g.stroke();
  }
  g.restore();
}
// พื้นแตกเป็นรอยร้าวเรืองแสงรอบจุด
function cracks(g, cx, cy, q, seed, reach = 1.4) {
  if (q <= 0 || q >= 1) return;
  const grow = easeOut3(clamp01(q * 2.5)), a = 1 - clamp01((q - 0.5) / 0.5);
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round"; g.lineJoin = "round";
  for (let i = 0; i < 7; i++) {
    let an = hash01(seed + i * 11) * TAU, x = cx, y = cy;
    const pts = [P(x, y, 0.01)];
    const steps = 4, seg = (reach * (0.6 + 0.4 * hash01(seed + i * 5)) * grow) / steps;
    for (let k = 0; k < steps; k++) {
      an += (hash01(seed + i * 13 + k) - 0.5) * 0.9;
      x += Math.cos(an) * seg; y += Math.sin(an) * seg;
      pts.push(P(x, y, 0.01));
    }
    for (const [lw, col, al] of [[5, DEEP, 0.5], [2, ICE, 0.95]]) {
      g.strokeStyle = `rgba(${col},${al * a})`; g.lineWidth = lw;
      g.beginPath(); pts.forEach(([px, py], j) => { if (j) g.lineTo(px, py); else g.moveTo(px, py); }); g.stroke();
    }
  }
  g.restore();
}
// คลื่นกระแทกหลายชั้น
function shockwave(g, cx, cy, q, big = 1, rgb = ICE) {
  if (q <= 0 || q >= 1) return;
  for (let i = 0; i < 3; i++) {
    const k = clamp01(q * 1.25 - i * 0.12);
    if (k <= 0 || k >= 1) continue;
    ring(g, cx, cy, (0.3 + 1.6 * big) * easeOut3(k), 0.9 * (1 - k), i ? rgb : WHITE, (5 - i * 1.5) * (1 - k) + 0.5);
  }
}

// ---------- ท่า ----------
// ---------- วาร์ปรอบเป้า (ฟันโหมกระหน่ำ) ----------
//  จุดยืนรอบเป้า: หน้าเป้า (ฝั่งเวอจิล) → อ้อมหลังซ้าย → อ้อมหลังขวา · หายตัวก่อนฟันแต่ละครั้ง BLINK_LEAD ms แล้วโผล่จุดใหม่
const BLINK_R = 0.55, BLINK_ANG = [0, 2.25, -2.25], BLINK_LEAD = 50;
const blinkTimes = (hits) => [VG_T.rapidHits[1] - BLINK_LEAD, VG_T.rapidHits[2] - BLINK_LEAD].slice(0, Math.max(0, hits - 1));
function blinkSpots(from, to) {
  const base = Math.atan2(from.y - to.y, from.x - to.x);
  return BLINK_ANG.map((a) => ({ x: to.x + Math.cos(base + a) * BLINK_R, y: to.y + Math.sin(base + a) * BLINK_R }));
}
// ตำแหน่งหมากเวอจิล (พิกัดหมาก) ตามเวลา — null = ไม่ได้อยู่ในช่วงวาร์ป
function blinkSpot(e, t, home) {
  const hits = Math.max(0, Math.min(3, e.hits | 0));
  const spots = blinkSpots(home, e.to);
  if (t < VG_T.rapidDash) { const k = easeOut3(t / VG_T.rapidDash); return { x: home.x + (spots[0].x - home.x) * k, y: home.y + (spots[0].y - home.y) * k }; }
  if (t >= VG_T.rapidBack) return null; // วาร์ปกลับช่องตัวเอง
  let i = 0;
  for (const bt of blinkTimes(hits)) if (t >= bt) i++;
  return spots[i];
}
// แสงแวบตอนหาย/โผล่: รอยแยกแนวตั้ง + วงแสง + ร่างจางค้างที่จุดเดิม
function blinkFlash(g, x, y, z, q, ghost) {
  if (q < 0 || q >= 1) return;
  const [bx, by, s] = P(x, y, z), [tx, ty] = P(x, y, z + 1.1 * (1 - q));
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
  g.strokeStyle = `rgba(${WHITE},${0.95 * (1 - q)})`; g.lineWidth = Math.max(1.5, s * 0.05 * (1 - q));
  g.beginPath(); g.moveTo(bx, by + s * 0.1); g.lineTo(tx, ty); g.stroke();
  glow(g, (bx + tx) / 2, (by + ty) / 2, s * (0.3 + 0.4 * q), CYAN, 0.55 * (1 - q));
  g.restore();
  ring(g, x, y, 0.15 + 0.45 * easeOut3(q), 0.8 * (1 - q), ICE, 2, z);
  if (ghost) phantom(g, x, y, 0.8 * (1 - q), CYAN);
}

function rapidFx(g, e, t, lowQ, view) {
  const n = Math.max(1, e.size | 0), from = ctr(e.from, n), to = ctr(e.to, Math.max(1, e.tsize | 0));
  const z = e.air ? VG_AIR_Z + 0.45 : 0.5;
  const hits = Math.max(0, Math.min(3, e.hits | 0));
  const spots = blinkSpots(from, to);
  if (t < VG_T.rapidDash + 80) afterimages(g, from, spots[0], clamp01(t / VG_T.rapidDash) * 0.85, CYAN, lowQ ? 3 : 8);
  // วาร์ป: จุดเดิมทิ้งร่างจาง + แสงแวบ · จุดใหม่แสงแวบ · สุดท้ายวาร์ปกลับช่องตัวเอง
  const bz = e.vair || e.air ? VG_AIR_Z : 0;
  const bts = blinkTimes(hits);
  bts.forEach((bt, i) => {
    const q = (t - bt) / 200;
    blinkFlash(g, spots[i].x, spots[i].y, bz, q, !lowQ);
    blinkFlash(g, spots[i + 1].x, spots[i + 1].y, bz, (t - bt) / 160, false);
    if (!lowQ && q >= 0 && q < 0.5) afterimages(g, spots[i], spots[i + 1], clamp01(q * 3), ICE, 4);
  });
  if (hits) {
    const last = spots[Math.min(bts.length, 2)];
    blinkFlash(g, last.x, last.y, bz, (t - VG_T.rapidBack) / 200, !lowQ);
    blinkFlash(g, from.x, from.y, bz, (t - VG_T.rapidBack) / 160, false);
  }
  VG_T.rapidHits.forEach((h, i) => {
    if (i >= hits) return;
    const q = (t - h) / 260;
    if (q < 0 || q >= 1) return;
    const ang = [-0.6, 0.75, 0.05][i] + (hash01(e.seed + i) - 0.5) * 0.3, last = i === hits - 1, big = last ? 1.6 : 1.15;
    crescent(g, to.x, to.y, z, ang, 1.9 * big, q, 1, CYAN, big, e.seed + i);
    if (last) crescent(g, to.x, to.y, z, ang + 1.4, 1.5 * big, clamp01(q - 0.05), 0.8, ICE, 0.9, e.seed + 40);
    hitFlash(g, to.x, to.y, z, q * 2.2, big);
    if (!lowQ) sparks(g, to.x, to.y, z, q, last ? 22 : 12, e.seed * 7 + i * 13, ICE, 1.3 * big);
    if (last) {
      if (!lowQ) speedLines(g, to.x, to.y, z, q, 18, e.seed * 3 + 1, WHITE, 2.4);
      if (q < 0.2) screenTint(g, view, "200,235,255", 0.22 * (1 - q / 0.2));
      shockwave(g, to.x, to.y, q, 0.7);
    }
  });
}
function upperFx(g, e, t, lowQ, view) {
  const n = Math.max(1, e.size | 0), from = ctr(e.from, n), to = ctr(e.to, Math.max(1, e.tsize | 0));
  if (t < VG_T.upperDash + 60) afterimages(g, from, to, clamp01(t / VG_T.upperDash) * 0.7, CYAN, lowQ ? 2 : 4);
  const q = (t - VG_T.upperHit) / (VG_T.upper - VG_T.upperHit);
  if (q < 0 || q >= 1) return;
  // รอยฟันแนวตั้งพุ่งจากพื้นขึ้นฟ้า
  const [bx, by, s] = P(to.x, to.y, 0), [tx, ty] = P(to.x, to.y, 0.2 + 4.2 * easeOut3(clamp01(q * 1.6)));
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
  const fade = 1 - clamp01((q - 0.3) / 0.7);
  for (const [lw, al, col] of [[30, 0.22, DEEP], [14, 0.6, CYAN], [5, 1, WHITE]]) {
    g.strokeStyle = `rgba(${col},${al * fade})`; g.lineWidth = lw * s / 60;
    g.beginPath(); g.moveTo(bx - s * 0.18, by + s * 0.05); g.quadraticCurveTo(bx + s * 0.22, (by + ty) / 2, tx, ty); g.stroke();
  }
  glow(g, bx, by, s * 0.7, CYAN, 0.45 * fade);
  g.restore();
  crescent(g, to.x, to.y, 0.8, -1.35, 1.8, q, 0.9, ICE, 1.2, e.seed);
  hitFlash(g, to.x, to.y, 0.6, q * 2, 1.2);
  if (!e.air) { cracks(g, to.x, to.y, q, e.seed * 5 + 3, 1.2); shockwave(g, to.x, to.y, q, 0.6); }
  if (!lowQ) sparks(g, to.x, to.y, 0.5, q, 18, e.seed * 5 + 7, ICE, 1.5);
  if (q < 0.15) screenTint(g, view, "180,230,255", 0.16 * (1 - q / 0.15));
}
function shadowFx(g, e, t, lowQ) {
  const to = ctr(e.to, Math.max(1, e.tsize | 0)), from = okT(e.from) ? ctr(e.from, Math.max(1, e.size | 0)) : to;
  const dx = to.x - from.x, dy = to.y - from.y, d = Math.hypot(dx, dy) || 1;
  const gx = to.x + (dx / d) * 0.7, gy = to.y + (dy / d) * 0.7; // อีกฝั่งของเป้า
  const appear = clamp01(t / 120), gone = 1 - clamp01((t - 380) / 140);
  if (t < 160) afterimages(g, { x: gx + (dx / d) * 1.2, y: gy + (dy / d) * 1.2 }, { x: gx, y: gy }, clamp01(t / 120), VIOLET, lowQ ? 2 : 5);
  phantom(g, gx, gy, appear * gone, VIOLET, -Math.sign(dx));
  const q = (t - VG_T.shadowHit) / 300;
  if (q >= 0 && q < 1) {
    crescent(g, to.x, to.y, 0.55, 0.9, 1.9, q, 1, VIOLET, 1.3, e.seed + 5);
    crescent(g, to.x, to.y, 0.55, -0.7, 1.9, clamp01(q - 0.08), 0.95, VIOLET_HI, 1.1, e.seed + 9);
    if (!lowQ) speedLines(g, to.x, to.y, 0.55, q, 12, e.seed * 9, VIOLET_HI, 1.8);
    if (!lowQ) sparks(g, to.x, to.y, 0.5, q, 8, e.seed * 11, VIOLET_HI, 1);
  }
}
function whiffFx(g, e, t) {
  const to = ctr(e.to, Math.max(1, e.tsize | 0));
  const q = (t - VG_T.whiffHit) / 320;
  if (q >= 0 && q < 1) crescent(g, to.x + 0.25, to.y - 0.2, 0.55, -0.3, 1.2, q, 0.55, CYAN, 0.8, e.seed);
}
// ดิ่งลงจากฟ้า: รอยฟันแนวดิ่งจากบนลงเป้า → ตบลงพื้น วงกระแทก 2 ชั้น + ประกาย
function landFx(g, e, t, lowQ, view) {
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
    hitFlash(g, to.x, to.y, 0.1, q * 1.6, 1.6);
    cracks(g, to.x, to.y, q, e.seed * 3 + 7, 1.7);
    shockwave(g, to.x, to.y, q, 1.1);
    if (!lowQ) ring(g, to.x, to.y, 0.2 + 0.8 * easeOut3(q), 0.75 * (1 - q), DEEP, 9 * (1 - q) + 0.5);
    if (!lowQ) sparks(g, to.x, to.y, 0.05, q, 24, e.seed * 3 + 99, CYAN, 1.9);
    if (!lowQ) speedLines(g, to.x, to.y, 0.1, q, 16, e.seed * 5, ICE, 2.2);
    if (q < 0.18) screenTint(g, view, "220,240,255", 0.3 * (1 - q / 0.18));
  }
}
function doppelFx(g, e, t, lowQ, view) {
  const at = ctr(e.at, Math.max(1, e.size | 0)), q = t / VG_T.doppel;
  spotlight(g, view, at.x, at.y, 0.55 * Math.sin(Math.PI * clamp01(q)));
  if (q < 0.12) screenTint(g, view, "150,100,255", 0.25 * (1 - q / 0.12));
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

// ดาบเทพ (ใบดาบแสงฟ้า) พุ่งจาก (fx, fy, fz) เข้าหา (tx, ty, tz) · q 0..1
function spectralSword(g, fx, fy, fz, tx, ty, tz, q, a = 1) {
  if (q <= 0 || q > 1.15) return;
  const k = easeIn2(clamp01(q));
  const [x0, y0, s] = P(fx + (tx - fx) * Math.max(0, k - 0.18), fy + (ty - fy) * Math.max(0, k - 0.18), fz + (tz - fz) * Math.max(0, k - 0.18));
  const [x1, y1] = P(fx + (tx - fx) * k, fy + (ty - fy) * k, fz + (tz - fz) * k);
  const fade = q > 1 ? 1 - (q - 1) / 0.15 : 1;
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
  for (const [lw, al, col] of [[10, 0.3, DEEP], [5, 0.7, CYAN], [2, 1, WHITE]]) {
    g.strokeStyle = `rgba(${col},${al * a * fade})`; g.lineWidth = lw * s / 60;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  }
  glow(g, x1, y1, s * 0.16, ICE, 0.8 * a * fade);
  g.restore();
}
// ท่าคอมโบ: ฉากตาม route (rising/helm/flow/lunar/stinger/swords/jcut/starfall)
function routeFx(g, e, t, lowQ, view) {
  const n = Math.max(1, e.size | 0), me = ctr(e.from, n), to = ctr(e.to, Math.max(1, e.tsize | 0));
  const q = t / VG_T.route, fade = 1 - clamp01((q - 0.7) / 0.3);
  // ทุกท่าคอมโบ: ฉากรอบตัวมืดลง (spotlight ที่เป้า) · แสงวาบทั้งจอตอนปะทะแรง (BIG_AT)
  spotlight(g, view, to.x, to.y, 0.6 * clamp01(t / 120) * fade);
  const bigAt = { rising: 60, helm: 230, stinger: 160, swords: 400, jcut: 300, starfall: 270 }[e.route];
  if (bigAt != null && t >= bigAt && t < bigAt + 140) screenTint(g, view, "215,240,255", 0.35 * (1 - (t - bigAt) / 140));
  const hitAt = (ms, i, big = 1, rgb = CYAN) => {
    const k = (t - ms) / 280;
    if (k < 0 || k >= 1) return;
    crescent(g, to.x, to.y, 0.55, -0.9 + i * 1.1 + (hash01(e.seed + i) - 0.5) * 0.4, 1.5 * big, k, 1, rgb, big, e.seed + i * 3);
    hitFlash(g, to.x, to.y, 0.55, k * 2, big);
    if (!lowQ) sparks(g, to.x, to.y, 0.5, k, 10, e.seed * 7 + i * 5, ICE, 1.1 * big);
  };
  switch (e.route) {
    case "rising": { // เสาแสงพุ่งขึ้นฟ้าสูงกว่าฟันขึ้นปกติ + วงแสงรอบเป้า
      const [bx, by, s] = P(to.x, to.y, 0), [tx, ty] = P(to.x, to.y, 0.4 + 3.6 * easeOut3(clamp01(q * 2)));
      g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
      for (const [lw, al, col] of [[26, 0.25, DEEP], [12, 0.6, CYAN], [4, 1, WHITE]]) {
        g.strokeStyle = `rgba(${col},${al * fade})`; g.lineWidth = lw * s / 60;
        g.beginPath(); g.moveTo(bx, by); g.lineTo(tx, ty); g.stroke();
      }
      g.restore();
      ring(g, to.x, to.y, 0.3 + 1.1 * easeOut3(q), 0.9 * fade, ICE, 3 * fade + 0.5);
      cracks(g, to.x, to.y, q, e.seed + 21, 1.5);
      shockwave(g, to.x, to.y, q, 1);
      hitAt(60, 0, 1.6, ICE);
      if (!lowQ) speedLines(g, to.x, to.y, 1.2, clamp01(q * 1.5), 20, e.seed + 5, WHITE, 2.6);
      break;
    }
    case "helm": { // ดิ่งฟันจากฟ้า (ใช้ฉากตบลงพื้น)
      landFx(g, { ...e, to: e.to }, Math.min(t * (VG_T.land / VG_T.route), VG_T.land - 1), lowQ, view);
      if (t > 230) crescent(g, to.x, to.y, 0.4, 0.1, 2.4, clamp01((t - 230) / 320), 1, WHITE, 1.4, e.seed + 77); // แนวฟันแยกพื้น
      break;
    }
    case "flow": case "lunar": { // ประกายดาบหมุนรอบตัว (flow ฟ้า · lunar จันทร์เสี้ยวม่วง)
      const rgb = e.route === "lunar" ? VIOLET_HI : ICE;
      for (let i = 0; i < 3; i++) {
        const an = q * TAU * 1.5 + (i * TAU) / 3;
        crescent(g, me.x + Math.cos(an) * 0.35, me.y + Math.sin(an) * 0.35, 0.6, an + Math.PI / 2, 0.9, clamp01(q * 1.4), fade, rgb, 0.8, e.seed + i);
      }
      if (e.route === "lunar") ring(g, me.x, me.y, 0.4 + 0.6 * easeOut3(q), 0.8 * fade, VIOLET, 2.5);
      break;
    }
    case "stinger": { // แทงพุ่งทะลุ: เส้นแสงยาวผ่านเป้า + ฟัน 2 ครั้ง
      const dx = to.x - me.x, dy = to.y - me.y, d = Math.hypot(dx, dy) || 1;
      const k = easeOut3(clamp01(q * 3));
      const [x0, y0, s] = P(me.x, me.y, 0.5), [x1, y1] = P(me.x + (dx / d) * (d + 1.4) * k, me.y + (dy / d) * (d + 1.4) * k, 0.5);
      g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
      for (const [lw, al, col] of [[18, 0.25, DEEP], [8, 0.65, CYAN], [3, 1, WHITE]]) {
        g.strokeStyle = `rgba(${col},${al * fade})`; g.lineWidth = lw * s / 60;
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      }
      g.restore();
      for (let i = 0; i < Math.min(2, e.hits | 0); i++) hitAt(VG_T.routeHits[i], i, i ? 1.6 : 1.2);
      if (!lowQ) speedLines(g, to.x, to.y, 0.5, clamp01((t - 120) / 400), 22, e.seed + 9, WHITE, 2.8);
      shockwave(g, to.x, to.y, clamp01((t - 260) / 420), 0.8);
      break;
    }
    case "swords": { // ดาบเทพ 3 เล่มลอยเหนือเวอจิลแล้วพุ่งใส่เป้าทีละเล่ม
      for (let i = 0; i < 3; i++) {
        const sx = me.x + (i - 1) * 0.45, sy = me.y - 0.2, launch = VG_T.routeHits[i] - 110;
        const appear = clamp01(t / 90);
        if (t < launch) { spectralSword(g, sx, sy, 1.4, sx, sy, 1.55, 0.99, appear); continue; }
        spectralSword(g, sx, sy, 1.5, to.x, to.y, 0.55, (t - launch) / 110, 1);
        if (i < (e.hits | 0)) hitAt(VG_T.routeHits[i], i, 1.1, ICE);
      }
      // ดาบเล่มสุดท้าย: ระเบิดแสง + คลื่น
      shockwave(g, to.x, to.y, clamp01((t - 400) / 340), 0.9);
      if (!lowQ) speedLines(g, to.x, to.y, 0.55, clamp01((t - 400) / 300), 16, e.seed + 3, ICE, 2.2);
      break;
    }
    case "jcut": { // ฟันมิติเป็นทรงกลมคลุมกรอบ 3×3 รอบเป้า
      const k = clamp01(q * 1.3);
      g.save(); g.globalCompositeOperation = "lighter";
      const [bx, by, s] = P(to.x, to.y, 0.6);
      glow(g, bx, by, s * (1.1 + 0.6 * easeOut3(k)), DEEP, 0.45 * fade);
      g.restore();
      for (let i = 0; i < (lowQ ? 7 : 14); i++) {
        const delay = (i / 14) * 0.45, kk = clamp01((k - delay) / 0.5);
        if (kk <= 0) continue;
        const an = hash01(e.seed + i * 7) * TAU, r = 0.2 + 0.9 * hash01(e.seed + i * 3);
        crescent(g, to.x + Math.cos(an) * r, to.y + Math.sin(an) * r, 0.3 + hash01(i) * 1.1, hash01(i * 5) * TAU, 1.2 + hash01(i * 9) * 0.8, kk, fade, i % 3 ? CYAN : WHITE, 0.8, e.seed + i);
      }
      ring(g, to.x, to.y, 1.5 * easeOut3(k), 0.85 * fade, ICE, 3 * fade + 0.5);
      // โดมฟันมิติ: วงแนวตั้งหมุน 3 วงรอบเป้า
      for (let r = 0; r < 3; r++) {
        const [dx, dy, ds] = P(to.x, to.y, 0.9);
        g.save(); g.globalCompositeOperation = "lighter";
        g.strokeStyle = `rgba(${r ? CYAN : WHITE},${0.7 * fade * clamp01(k * 2)})`; g.lineWidth = Math.max(1, ds * 0.03);
        g.beginPath(); g.ellipse(dx, dy, ds * 1.5 * easeOut3(k), ds * 1.5 * easeOut3(k) * Math.abs(Math.cos(t / 220 + r * 1.05)), r * 1.05, 0, TAU); g.stroke();
        g.restore();
      }
      cracks(g, to.x, to.y, clamp01((t - 250) / 450), e.seed + 33, 2);
      shockwave(g, to.x, to.y, clamp01((t - 300) / 440), 1.4);
      if (!lowQ) sparks(g, to.x, to.y, 0.5, k, 28, e.seed * 13, ICE, 2.2);
      break;
    }
    case "starfall": { // ดิ่งจากฟ้าพร้อมดาวตก + ดาวหมุนเหนือหัวเป้า (สตั้น)
      landFx(g, e, Math.min(t * (VG_T.land / VG_T.route) * 1.2, VG_T.land - 1), lowQ, view);
      // ดาวตกพุ่งลงรอบเป้า
      if (!lowQ) for (let i = 0; i < 6; i++) {
        const k2 = clamp01((t - i * 30) / 260);
        if (k2 <= 0 || k2 >= 1) continue;
        const ox = (hash01(e.seed + i) - 0.5) * 1.6, oy = (hash01(e.seed + i * 3) - 0.5) * 1.6;
        spectralSword(g, to.x + ox + 0.6, to.y + oy - 0.6, 3.2, to.x + ox * 0.3, to.y + oy * 0.3, 0.05, k2, 0.8);
      }
      if (q > 0.35) for (let i = 0; i < 5; i++) {
        const an = (t / 300) + (i * TAU) / 5;
        const [x, y, s] = P(to.x + Math.cos(an) * 0.3, to.y + Math.sin(an) * 0.3, 1.25);
        g.save(); g.globalCompositeOperation = "lighter"; glow(g, x, y, s * 0.07, "255,240,160", 0.9 * fade); g.restore();
      }
      break;
    }
    default:
  }
}

export function vergilFx(g, e, now, lowQ, view) {
  const t = e.holdT != null ? e.holdT : now - e.t0;
  if (t < 0) return;
  g.save();
  switch (e.kind) {
    case "vgRapid": if (okT(e.from) && okT(e.to)) rapidFx(g, e, t, lowQ, view); break;
    case "vgUpper": if (okT(e.from) && okT(e.to)) upperFx(g, e, t, lowQ, view); break;
    case "vgShadow": if (okT(e.to)) shadowFx(g, e, t, lowQ); break;
    case "vgWhiff": if (okT(e.to)) whiffFx(g, e, t); break;
    case "vgDoppel": if (okT(e.at)) doppelFx(g, e, t, lowQ, view); break;
    case "vgSheathe": if (okT(e.at)) sheatheFx(g, e, t); break;
    case "vgBreak": if (okT(e.at)) breakFx(g, e, t, lowQ); break;
    case "vgLand": if (okT(e.to)) landFx(g, e, t, lowQ, view); break;
    case "vgRoute": if (okT(e.from) && okT(e.to)) routeFx(g, e, t, lowQ, view); break;
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
    if (!e || (e.kind !== "vgRapid" && e.kind !== "vgUpper" && e.kind !== "vgWhiff" && e.kind !== "vgLand" && e.kind !== "vgRoute")) continue;
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
  if (e.kind === "vgRoute") return routeAttackerPose(e, t, home, dx, dy, d);
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
  // ฟันโหมกระหน่ำ: วาร์ปแวบไปรอบเป้า ฟันจากคนละมุมทุกครั้ง แล้ววาร์ปกลับช่องตัวเอง (ผู้ใช้สั่ง 2026-11-21 "แวปไปแวปมาเหมือนในคลิป")
  if (e.kind === "vgRapid" && (e.hits | 0) > 0) {
    const bp = blinkSpot(e, t, home);
    if (bp) { x = bp.x; y = bp.y; }
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
// ท่าคอมโบ: Deep Stinger พุ่งทะลุไปอีกฝั่งแล้วกลับ · Rising Sun กระโดดสูงแล้วค้างกลางอากาศ ·
//  Helm Breaker / Starfall ขึ้นสูงแล้วดิ่ง · Judgment Cut ถอยครึ่งก้าวเก็บดาบ · ที่เหลือกระโดดเบาๆ
function routeAttackerPose(e, t, home, dx, dy, d) {
  const T = VG_T.route, ux = dx / d, uy = dy / d, base = e.vair ? VG_AIR_Z : 0;
  const at = (k) => ({ x: home.x + ux * k, y: home.y + uy * k });
  switch (e.route) {
    case "stinger": {
      const far = d + 1.0;
      const k = t < 160 ? easeOut3(t / 160) * far : t < T - 220 ? far : far * (1 - easeIn2(clamp01((t - (T - 220)) / 220)));
      return { ...at(k), hz: base, sq: 0 };
    }
    case "rising": {
      const up = t < 260 ? easeOut3(t / 260) * 1.9 : 1.9 - (1.9 - VG_AIR_Z) * easeIn2(clamp01((t - 260) / (T - 260)));
      return { ...at(Math.max(0, d - 0.4) * Math.min(1, t / 90)), hz: up, sq: 0 };
    }
    case "helm": case "starfall": {
      const hit = e.route === "helm" ? 230 : 270;
      let hz;
      if (t < hit * 0.55) hz = base + (2.2 - base) * easeOut3(t / (hit * 0.55));
      else if (t < hit) hz = 2.2 * (1 - easeIn2((t - hit * 0.55) / (hit * 0.45)));
      else hz = 0;
      const k = Math.max(0, d - 0.4) * (t < hit ? easeOut3(t / hit) : 1 - easeIn2(clamp01((t - hit - 150) / (T - hit - 150))));
      return { ...at(k), hz, sq: 0 };
    }
    case "jcut": {
      const k = -0.25 * Math.sin(Math.PI * clamp01(t / T));
      return { ...at(k), hz: base, sq: 0 };
    }
    default:
      return { ...at(0), hz: base + 0.3 * Math.sin(Math.PI * clamp01(t / (T * 0.6))), sq: 0 };
  }
}
function targetPose(e, t, u) {
  const x0 = Number.isFinite(u.rx) ? u.rx : e.to.x, y0 = Number.isFinite(u.ry) ? u.ry : e.to.y;
  const dx = e.to.x - e.from.x, dy = e.to.y - e.from.y, d = Math.hypot(dx, dy) || 1;
  if (e.kind === "vgRoute") {
    // สะท้านตามจังหวะปะทะ · Rising Sun ลอยสูงแล้วค้าง · Helm Breaker/Starfall ถูกตบลงพื้น
    let shake = 0;
    for (const h of [...VG_T.routeHits, 230, 300]) { const q = (t - h) / 120; if (q >= 0 && q < 1) shake = Math.max(shake, 1 - q); }
    const push = REDUCED ? 0 : shake * 0.12;
    let hz = 0;
    if (e.route === "rising") hz = VG_AIR_Z + 0.9 * Math.sin(Math.PI * clamp01((t - 60) / 520)) * (t > 60 ? 1 : 0);
    else if (e.route === "helm" || e.route === "starfall") hz = t < 230 ? (e.air ? VG_AIR_Z : 0) : 0;
    else if (e.air) hz = VG_AIR_Z + shake * 0.15;
    return { x: x0 + (dx / d) * push, y: y0 + (dy / d) * push, hz, sq: 0 };
  }
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
    case "route": { // ท่าคอมโบ — เล่นต่อจากฉากท่าหลัก (ev.after ms) · playOut ต้องมี fx ทันที = ประกายเล็กที่ตัว
      if (!okT(ev.from) || !okT(ev.to)) break;
      const after = Math.max(0, ev.after | 0);
      out.fx.push({ ...base, kind: "vgSheathe", at: pt(ev.from), dur: 1 });
      out.later.push([after, [{ ...base, kind: "vgRoute", route: ev.route, hits: ev.hits | 0, from: pt(ev.from), to: pt(ev.to), dur: VG_T.route }]]);
      for (const [ms, k] of ROUTE_SFX[ev.route] || []) snd(after + ms, k);
      if (ev.route === "jcut" || ev.route === "helm" || ev.route === "starfall") out.shake.push(after + 260, after + 380);
      else if (ev.hits) for (const ms of VG_T.routeHits.slice(0, ev.hits | 0)) out.shake.push(after + ms);
      break;
    }
    default:
  }
  return out;
}
