// ============================================================
//  กล้องของกระดาน (แยกจาก boardDraw.js) — เลือกช่อง/จุดกลางช่อง · ตั้งกล้อง · ซูม/เลื่อนมุมใกล้ (clampCam)
//  กล้องแบบ RTS ของแผนที่ใหญ่ (สนาม Eos — rtsZoomRange/clampCamRts) · สีไฮไลต์ OV · ลดการเคลื่อนไหว (reducedMotion)
// ============================================================
import { NEAR_Y, P, setBoardSize, setViewTurn, unproject, viewAxes, viewTurn, viewCenter } from "./boardGeo";

// ผู้เล่นตั้ง "ลดการเคลื่อนไหว" ในระบบ — เอฟเฟกต์กระพริบ/วิ่งหยุดนิ่ง (ลำแสง Beam Magnum ขึ้นเต็มทันที · ตัวที่ซ่อนอยู่ไม่มีแถบแสง)
export const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
export const reducedMotion = () => REDUCED;

// สีไฮไลต์ [พื้น, ขอบ]
export const OV = {
  move: ["rgba(61,139,217,.45)", "rgba(170,210,250,.85)"],
  attack: ["rgba(224,86,79,.38)", "rgba(255,160,150,.75)"],
  skill: ["rgba(139,92,246,.36)", "rgba(200,170,255,.85)"],
  aoe: ["rgba(240,180,60,.32)", "#ffd27a"],
  danger: ["rgba(206,58,122,.2)", "rgba(255,128,182,.9)"],
};

// จุดบนจอ (ตรรกะ) → ช่อง {x, y} (พิกัดกระดาน — ย้อนการหมุนแล้ว) หรือ null ถ้านอกกระดาน
export function pickTile(info, lx, ly) {
  const g = unproject(lx, ly);
  if (!g) return null;
  const x = Math.floor(g.x), y = Math.floor(g.y);
  return x >= 0 && y >= 0 && x < info.cols && y < info.rows ? { x, y } : null;
}
// ช่อง → จุดกลางช่องบนจอ (ตรรกะของเฟรมปกติ) — แปลงเป็น CSS px ด้วย computeView(w, h, cam) (มุมใกล้ต้องรู้ cam ของ BoardCanvas
//  — ป้ายที่ต้องเกาะช่องจึงวาดในแคนวาสแทน เช่นป้ายร้าน) · rotation (0..3) ไม่ใส่ = ใช้มุมที่กำลังแสดงอยู่ (รวมระหว่างหมุน)
export function tileCenter(x, y, z = 0, rotation) {
  if (rotation == null) { const p = P(x + 0.5, y + 0.5, z); return [p[0], p[1]]; }
  const prev = viewTurn();
  setViewTurn(normRot(rotation));
  const p = P(x + 0.5, y + 0.5, z);
  setViewTurn(prev);
  return [p[0], p[1]];
}
export const normRot = (r) => ((Math.round(+r || 0) % 4) + 4) % 4;
// ตั้งกล้องตามกระดาน + มุมมอง (เรียกก่อนคำนวณพิกัดนอกลูปวาด เช่น ตอนคลิก)
export function setCamera(info, turn) {
  setBoardSize(info.cols, info.rows);
  setViewTurn(turn);
}

// =================================================================== กล้องมุมใกล้ (ซูม/เลื่อน)
//  cam = { z, cx, cy } — z = ขยายกี่เท่า · (cx, cy) = จุดตรรกะ (ของเฟรมปกติ) ที่อยู่กลางจอ · base = computeView(w, h) ไม่มี cam
export const ZOOM_K = 1.6;   // มุมใกล้ = ขยาย 1.6 เท่า
// ระดับซูม (ผู้ใช้สั่ง 2026-10-11 — ปรับทีละขั้น): ตัวคูณต่อระดับ 0..ZOOM_STEPS−1 · มุมบนขยายมากกว่า (ช่องเล็กกว่ามุมเอียง)
export const ZOOM_LEVELS = { tilt: [1, 1.3, ZOOM_K, 1.95, 2.4], top: [1, 1.6, 2.1, 2.6, 3.25] };
export const ZOOM_STEPS = 5;
export const clampZoom = (lv) => Math.max(0, Math.min(ZOOM_STEPS - 1, Math.round(Number(lv) || 0)));
const PAN_M = 30;            // เลื่อนเลยขอบกระดานได้เท่านี้ (ตรรกะ)
const TOP_UI = 130;          // แถบลำดับเดินด้านบน (ตรรกะที่ z = 1) — แถบหกเหลี่ยมแบบใหม่สูงกว่าเดิม
// กรอบของกระดานบนจอ (ตรรกะ · กล้องปัจจุบัน) รวมความสูงของของบนแถวไกล
export function boardBox(info) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of [[0, 0], [info.cols, 0], [0, info.rows], [info.cols, info.rows]]) {
    const a = P(x, y, 0), b = P(x, y, 1.3);
    x0 = Math.min(x0, a[0]); x1 = Math.max(x1, a[0]); y0 = Math.min(y0, b[1]); y1 = Math.max(y1, a[1]);
  }
  return { x0, x1, y0, y1 };
}
// HUD ล่างกินที่ใต้ขอบใกล้ของเฟรมปกติ · มุมใกล้ = สูงเท่าเดิมบนจอ → หาร z ในพิกัดตรรกะ
const hudOf = (base, z) => Math.max(0, base.y1 - NEAR_Y) / z;
// จำกัดจุดกลางกล้อง: ไม่ออกนอกเฟรมปกติ (ชั้นอบครอบคลุมแค่นั้น) และไม่เลยกระดาน (+PAN_M) · z = 1 → กลางเฟรมพอดี (= มุมปกติ)
//  ขอบล่างเผื่อ HUD — เลื่อนจนขอบใกล้ของกระดานโผล่เหนือ HUD ได้ · ต้องตั้งกล้อง (setCamera) ก่อนเรียก
export function clampCam(info, base, cam) {
  const z = Math.max(1, cam.z), hw = (base.x1 - base.x0) / (2 * z), hh = (base.y1 - base.y0) / (2 * z);
  const bb = boardBox(info);
  const fit = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
  let cx = fit(cam.cx, bb.x0 - PAN_M + hw, bb.x1 + PAN_M - hw);
  let cy = fit(cam.cy, bb.y0 - PAN_M - TOP_UI / z + hh, bb.y1 + PAN_M - hh + hudOf(base, z));
  cx = fit(cx, base.x0 + hw, base.x1 - hw);
  cy = fit(cy, base.y0 + hh, base.y1 - hh);
  return { z: cam.z, cx, cy };
}
// ---------- กล้องแบบ RTS ของแผนที่ใหญ่ (สนาม Eos — GRID_PLAN §8.6 · ผู้ใช้สั่ง 2026-11-09) ----------
//  จอต้องอยู่ "ในแผนที่" ตลอด — ไม่เห็นขอบกระดาน/พื้นที่ว่างด้านนอก: กรอบจอทั้ง 4 มุมต้องอยู่ในรูปสี่เหลี่ยมของกระดานบนจอ
//  ซูมออกได้สุดแค่ระดับที่จอยังอยู่ในแผนที่ (rtsZoomRange.min) · ซูมเข้าสุด = ช่องใหญ่เท่าแผนที่ปกติ 14×14 ที่ซูมสุด
//  ต้องตั้งกล้อง (setCamera) ก่อนเรียก
export const RTS_VIEW_TILES = { far: 24, near: 6 }; // จำนวนช่องที่เห็นตามแนวกว้างของจอ ตอนซูมออกสุด / เข้าสุด (ผู้ใช้สั่ง 2026-11-10: เดิม 14/9 แคบ ซูมได้น้อย)
function boardQuad(info) { return [P(0, 0), P(info.cols, 0), P(info.cols, info.rows), P(0, info.rows)].map((q) => [q[0], q[1]]); }
function inQuad(q, x, y) {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = q[i], [bx, by] = q[(i + 1) % 4];
    const c = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
    if (Math.abs(c) < 1e-9) continue;
    const sg = c > 0 ? 1 : -1;
    if (sign && sg !== sign) return false;
    sign = sg;
  }
  return true;
}
function rectIn(q, cx, cy, hw, hh) {
  return inQuad(q, cx - hw, cy - hh) && inQuad(q, cx + hw, cy - hh) && inQuad(q, cx + hw, cy + hh) && inQuad(q, cx - hw, cy + hh);
}
const halfOf = (base, z) => [(base.x1 - base.x0) / (2 * z), (base.y1 - base.y0) / (2 * z)];
const centerOf = (q) => [(q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4];
export function rtsZoomRange(info, base, top = false) {
  const q = boardQuad(info), [cx, cy] = centerOf(q);
  let lo = 1, hi = 40;
  if (rectIn(q, cx, cy, ...halfOf(base, lo))) hi = lo;
  else for (let i = 0; i < 26; i++) { const m = (lo + hi) / 2; if (rectIn(q, cx, cy, ...halfOf(base, m))) hi = m; else lo = m; }
  // กล้องอยู่ใกล้ตัวผู้เล่น (ผู้ใช้สั่ง 2026-11-09: "ไกลเกินไป ซูมจนเห็นทั้งแผนที่ ไม่ตื่นเต้น")
  //  เฟรมอบของ RTS เห็นราว ด้านยาว/0.62 ช่อง ตอน z = 1 → ซูมออกสุด ≈ 14 ช่อง · ซูมเข้าสุด ≈ 7 ช่อง (มุมบนช่องเล็กกว่า = คูณเพิ่ม)
  // วัดความกว้างช่องจริงที่กลางกระดาน (มุมมองลึก = แถวหน้ากว้างกว่าแถวกลาง) → z ที่จอกว้างเท่า N ช่อง
  // วัดที่จุดหมุน (ตัวเรา) ตามแนวนอนของจอ (viewAxes r) — วัดตามแกนกระดานแล้วความยาวบนจอเปลี่ยนตามมุมหมุน = ซูมเองตอนหัน (ผู้ใช้แจ้ง 2026-11-09)
  const vc = viewCenter(), ax = viewAxes(), mx = vc ? vc.x : info.cols / 2, my = vc ? vc.y : info.rows / 2;
  const a = P(mx - ax.rx * 0.5, my - ax.ry * 0.5), b = P(mx + ax.rx * 0.5, my + ax.ry * 0.5);
  const tw = Math.max(1e-3, Math.hypot(b[0] - a[0], b[1] - a[1])), W = base.x1 - base.x0;
  void top;
  // ไม่ผูกกับกรอบทั้งกระดาน (เปลี่ยนตามมุมหมุน/ตำแหน่งตัวเรา → ซูมกระโดดตอนหัน — ผู้ใช้แจ้ง 2026-11-09) · วัดจากขนาดช่องที่ตัวเราอย่างเดียว
  void hi;
  const min = Math.max(1, W / (RTS_VIEW_TILES.far * tw));
  const max = Math.max(min * 1.6, W / (RTS_VIEW_TILES.near * tw));
  return { min, max };
}
// ระดับซูมของปุ่ม +/− (5 ระดับ ไล่แบบเรขาคณิตจากต่ำสุดถึงสูงสุด)
export function rtsZoomOf(range, lv) { return range.min * Math.pow(range.max / range.min, clampZoom(lv) / (ZOOM_STEPS - 1)); }
//  ผู้ใช้สั่ง (2026-11-09 รอบสอง): ตัวเราต้องอยู่กลางจอเสมอ → จุดกลางกล้องไปได้ทุกจุดในกระดาน (นอกกระดานเป็นฉากต่อเนื่อง — ธีม side/ground)
//  แต่กรอบจอต้องไม่เลยชั้นที่อบไว้ (เฟรมปกติ — base) ไม่งั้นเห็นพื้นที่ว่างจริง
export function clampCamRts(info, base, cam, range) {
  const q = boardQuad(info), [ox, oy] = centerOf(q);
  const z = Math.max(range.min, Math.min(range.max, cam.z || range.min));
  const [hw, hh] = halfOf(base, z);
  let x = cam.cx, y = cam.cy;
  if (!inQuad(q, x, y)) {
    let lo = 0, hi = 1;
    for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (inQuad(q, ox + (x - ox) * m, oy + (y - oy) * m)) lo = m; else hi = m; }
    x = ox + (x - ox) * lo; y = oy + (y - oy) * lo;
  }
  const fit = (v, lo2, hi2) => (lo2 > hi2 ? (lo2 + hi2) / 2 : Math.min(hi2, Math.max(lo2, v)));
  x = fit(x, base.x0 + hw, base.x1 - hw);
  y = fit(y, base.y0 + hh, base.y1 - hh);
  return { z, cx: x, cy: y };
}
// จุดกลางของส่วนที่มองเห็นเหนือ HUD ↔ จุดกลางกล้อง (ใช้หมุนรอบจุดกลางจอ / เลื่อนไปหาตัวละคร)
export const camEyeY = (base, z, cy) => cy - hudOf(base, z) / 2;
export const camFromEye = (base, z, sx, sy) => ({ cx: sx, cy: sy + hudOf(base, z) / 2 });
// จุดตรรกะ (sx, sy) อยู่ในส่วนที่มองเห็น (หักขอบ/แถบบน/HUD) ไหม — ใช้ตัดสินว่าต้องเลื่อนกล้องตามไหม
export function inCamView(base, cam, sx, sy) {
  const z = cam.z, hw = (base.x1 - base.x0) / (2 * z), hh = (base.y1 - base.y0) / (2 * z);
  return sx >= cam.cx - hw + 60 / z && sx <= cam.cx + hw - 60 / z
    && sy >= cam.cy - hh + (TOP_UI + 70) / z && sy <= cam.cy + hh - hudOf(base, z) - 12 / z;
}
