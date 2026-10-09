// ============================================================
//  ตัววาดกระดานเดินได้ (ระบบใหม่แบบ Fire Emblem — ดู GRID_PLAN.md §11)
//  พอร์ตจากต้นแบบ .claude/plans/region1-board.html (หน้าตาฉาก) + grid-prototype.html (คณิตกล้อง/เลือกช่อง)
//
//  แนวคิด
//   - วาดในพิกัด "ตรรกะ" 1280 × 720 แบบต้นแบบเสมอ แล้วย่อ/ขยายลงแคนวาสจริงด้วย view (computeView)
//     จอกว้าง/สูงกว่า 16:9 = เห็นพื้น/ท้องฟ้า/ฉากรอบนอกเพิ่ม กระดานไม่ถูกตัด
//   - ชั้นอบ 2 ชั้น
//      scene = ฟ้า ฉากหลัง ลายพื้น ของสองข้าง (ไม่หมุนตามกระดาน) — อบต่อ ภูมิภาค/ขนาด/กลางคืน/แนวกระดาน (ตั้ง/นอน)
//      board = ฐานกระดาน ช่อง ช่องพิเศษ จุดฟื้นฟู เส้นตาราง แสงแดด/ความมืด — อบต่อ แผนที่/ขนาด/กลางคืน/มุมหมุน
//     ระหว่างหมุนกระดาน (≈250ms) ชั้น board วาดสดทุกเฟรม · ชั้น scene ค่อยๆ เปลี่ยน (crossfade)
//   - ชั้นเคลื่อนไหว (ไฮไลต์ สิ่งกีดขวาง ตัวละคร ร้าน เอฟเฟกต์) วาดใหม่ทุกเฟรม เรียงตามความลึกของมุมมอง
//   - ธีมรายภูมิภาค (ฉาก/สี/อนุภาค) อยู่ที่ regionThemes.js · สิ่งกีดขวาง/ช่องพิเศษ/จุดฟื้นฟูอยู่ที่ boardProps.js
//   - lowQ = ข้ามอนุภาค ใบไม้หน้ากล้อง แอนิเมชันช่องพิเศษ และหมุนกระดานทันที
//   - มุมใกล้ (ซูม) = ขยายภาพ 2 มิติทั้งเฟรม (computeView ใส่ cam) · ชั้นอบยังอบด้วยเฟรมปกติ (base view) แต่ละเอียดขึ้น
//     (res = dpr × ZOOM_K ไม่เกิน 2) แล้ววาดขยายลงจอ · กล้องเลื่อนได้แค่ในเฟรมปกติ (clampCam) ชั้นอบจึงครอบคลุมเสมอ
//
//  พิกัดช่อง: x = คอลัมน์ 0..cols-1 (ซ้าย→ขวา) · y = แถว 0..rows-1 (ไกล→ใกล้กล้อง ที่มุม 0) · key = "x,y"
//  map.special["x,y"] = ช่องพิเศษ (flowers forest thorns shallow whirl quicksand ice lava power) · map.flow["x,y"] = up/down/left/right (น้ำวน)
// ============================================================
import {
  F_TH, F_UI, LH, LW, NEAR_Y, P, PA, computeView, depthOf, gEllipse, glow, hexA, hexPath, key, normColor, parseKey, project,
  quad, rgbOf, setBoardSize, setViewTurn, shadeHex, toLogical, toView, unproject, viewAxes, viewTurn,
} from "./boardGeo";
import { TALL_KINDS, animHeal, animSpecial, bakeHeal, bakeSpecial, drawObstacle, healClusters } from "./boardProps";
import { themeOf, worldRange } from "./regionThemes";

export { LW, LH, key, parseKey, project, unproject, computeView, toLogical };

// ผู้เล่นตั้ง "ลดการเคลื่อนไหว" ในระบบ — เอฟเฟกต์กระพริบ/วิ่งหยุดนิ่ง (ลำแสง Beam Magnum ขึ้นเต็มทันที · ตัวที่ซ่อนอยู่ไม่มีแถบแสง)
const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
export const reducedMotion = () => REDUCED;

// สีไฮไลต์ [พื้น, ขอบ]
const OV = {
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
//  — ป้ายที่ต้องเกาะช่องจึงวาดในแคนวาสแทน เช่น shopLabel) · rotation (0..3) ไม่ใส่ = ใช้มุมที่กำลังแสดงอยู่ (รวมระหว่างหมุน)
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
// จุดกลางของส่วนที่มองเห็นเหนือ HUD ↔ จุดกลางกล้อง (ใช้หมุนรอบจุดกลางจอ / เลื่อนไปหาตัวละคร)
export const camEyeY = (base, z, cy) => cy - hudOf(base, z) / 2;
export const camFromEye = (base, z, sx, sy) => ({ cx: sx, cy: sy + hudOf(base, z) / 2 });
// จุดตรรกะ (sx, sy) อยู่ในส่วนที่มองเห็น (หักขอบ/แถบบน/HUD) ไหม — ใช้ตัดสินว่าต้องเลื่อนกล้องตามไหม
export function inCamView(base, cam, sx, sy) {
  const z = cam.z, hw = (base.x1 - base.x0) / (2 * z), hh = (base.y1 - base.y0) / (2 * z);
  return sx >= cam.cx - hw + 60 / z && sx <= cam.cx + hw - 60 / z
    && sy >= cam.cy - hh + (TOP_UI + 70) / z && sy <= cam.cy + hh - hudOf(base, z) - 12 / z;
}

// ---------- รูปตัวละคร (แคชทั้งแอป) ----------
const imgCache = new Map();
function getImg(url) {
  if (!url) return null;
  let e = imgCache.get(url);
  if (!e) {
    const img = new Image();
    e = { img, ok: false, failed: false };
    const entry = e;
    img.decoding = "async";
    img.onload = () => { entry.ok = img.naturalWidth > 0; entry.failed = !entry.ok; };
    img.onerror = () => { entry.failed = true; };
    img.src = url;
    imgCache.set(url, e);
  }
  return e;
}
function cover(g, img, x, y, w, h, fy = 0.12) {
  const iw = img.naturalWidth, ih = img.naturalHeight, ir = iw / ih, r = w / h;
  let sw, sh, sx, sy;
  if (ir > r) { sh = ih; sw = sh * r; sx = (iw - sw) / 2; sy = 0; } else { sw = iw; sh = sw / r; sx = 0; sy = (ih - sh) * fy; }
  g.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}


// =================================================================== map info
function normPt(p) {
  if (Array.isArray(p)) return { x: +p[0], y: +p[1] };
  if (typeof p === "string") { const [x, y] = parseKey(p); return { x, y }; }
  if (p && typeof p === "object") return { x: +p.x, y: +p.y };
  return null;
}
function ptList(list) {
  if (!list) return [];
  const arr = list instanceof Set ? [...list] : Array.isArray(list) ? list : [];
  return arr.map(normPt).filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y));
}
// ลายเซ็นของแผนที่ — ใช้ตัดสินว่าต้องอบชั้นนิ่งใหม่ไหม (state จาก server เป็นอ็อบเจกต์ใหม่ทุกครั้ง)
export function mapSignature(map) {
  if (!map) return "none";
  return JSON.stringify([map.area, map.cols, map.rows, map.terrain || {}, ptList(map.heal), ptList(map.spawns), map.special || {}, map.flow || {}]);
}
// แปลง map (รูปแบบ state.board) เป็นข้อมูลพร้อมวาด
export function prepareMap(map) {
  const cols = (map && map.cols) || 16, rows = (map && map.rows) || 12;
  setBoardSize(cols, rows);
  const area = (map && +map.area) || 1;
  const tMap = (map && map.terrain) || {};
  const terrain = [];
  for (const [k, kind] of Object.entries(tMap)) {
    const [x, y] = parseKey(k);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const same = (dx, dy) => String(tMap[key(x + dx, y + dy)]) === String(kind);
    terrain.push({ x, y, kind: String(kind), conn: { l: same(-1, 0), r: same(1, 0), u: same(0, -1), d: same(0, 1) } });
  }
  const flow = (map && map.flow) || {};
  const special = [];
  for (const [k, kind] of Object.entries((map && map.special) || {})) {
    const [x, y] = parseKey(k);
    if (Number.isFinite(x) && Number.isFinite(y) && kind) special.push({ x, y, kind: String(kind), flow: flow[k] ? String(flow[k]) : null });
  }
  const heal = ptList(map && map.heal);
  let plaza = null;
  // ด่าน I: จุดฟื้นฟูวาดเป็นวงเวทใหญ่ (ด่านอื่นดู boardProps.bakeHeal)
  if (heal.length && area === 1) {
    const cx = heal.reduce((s, p) => s + p.x, 0) / heal.length + 0.5;
    const cy = heal.reduce((s, p) => s + p.y, 0) / heal.length + 0.5;
    const sc = Math.sqrt(heal.length / 4);
    plaza = { x: cx, y: cy, r1: 3.45 * sc, r2: 2.25 * sc, sc };
  }
  return {
    cols, rows, area, terrain, heal, plaza, spawns: ptList(map && map.spawns), special,
    healClusters: healClusters(heal), lavaTiles: special.filter((s) => s.kind === "lava"),
  };
}

// =================================================================== baked layers
function layerCanvas(view, dpr) {
  const pw = Math.max(1, Math.round(view.w * dpr)), ph = Math.max(1, Math.round(view.h * dpr));
  const cv = document.createElement("canvas"); cv.width = pw; cv.height = ph;
  const g = cv.getContext("2d");
  g.setTransform(dpr * view.k, 0, 0, dpr * view.k, dpr * view.ox, dpr * view.oy);
  return { cv, g };
}
// ชั้นฉาก (ไม่หมุนตามกระดาน) · turn = มุมที่ใช้คำนวณกล้อง (0 = กระดานนอน 16×12 · 1 = ตั้ง 12×16)
//  คืน { scene, fore, marks } · marks = ตำแหน่งของที่ animBack ต้องใช้ (ใบพัด ไฟประภาคาร ฯลฯ)
export function bakeScene(info, view, dpr, night, lowQ, turn = 0) {
  const prev = viewTurn();
  setCamera(info, turn);
  const T = themeOf(info.area), C = T.pal[night ? "night" : "day"];
  const { cv, g } = layerCanvas(view, dpr);
  const { x0: VX0, y0: VY0, x1: VX1, y1: VY1 } = view, VW = VX1 - VX0;
  // ขอบไกลของกระดานบนจอ (ฉากหลังวางอิงเส้นนี้)
  const bY = Math.min(P(0, 0)[1], P(info.cols, 0)[1], P(0, info.rows)[1], P(info.cols, info.rows)[1]);
  const c = { g, C, night, lowQ, info, R: rngSeq(21), VX0, VY0, VX1, VY1, VW, bY, ...worldRange(view), marks: {} };
  // พื้นทั้งจอ
  const gr = g.createRadialGradient(640, 360, 120, 640, 360, Math.max(820, VW * 0.65));
  gr.addColorStop(0, C.ground1); gr.addColorStop(1, C.ground2);
  g.fillStyle = gr; g.fillRect(VX0, VY0, VW, VY1 - VY0);
  T.back(c);
  T.ground(c);
  T.side(c);
  // ใบไม้/ของเบลอหน้ากล้อง (ชั้นแยก วาดทับตัวละคร) — ต้องมี ctx.filter · lowQ ข้าม
  let fore = null;
  if (!lowQ && T.fore) {
    const { cv: fc, g: f } = layerCanvas(view, dpr);
    if ("filter" in f) {
      f.filter = `blur(${Math.max(2, 9 * dpr * view.k) / (dpr * view.k)}px)`;
      T.fore(f, c);
      fore = fc;
    }
  }
  setViewTurn(prev);
  return { scene: cv, fore, marks: c.marks };
}
function rngSeq(seed) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }

// ชั้นกระดาน (หมุนตามกระดาน) — ใช้ทั้งตอนอบและวาดสดระหว่างหมุน · g ต้องตั้ง transform ตรรกะไว้แล้ว
function drawBoardLayer(g, info, view, night) {
  const T = themeOf(info.area), C = T.pal[night ? "night" : "day"];
  const { x0: VX0, y0: VY0, x1: VX1, y1: VY1 } = view, VW = VX1 - VX0;
  const COLS = info.cols, ROWS = info.rows;
  const c0 = P(0, 0), c1 = P(COLS, 0), c2 = P(COLS, ROWS), c3 = P(0, ROWS);
  if (T.base) T.base({ g, C, night, info, R: rngSeq(31), VX0, VY0, VX1, VY1, VW });
  else {
    // เงาจางใต้กระดาน (ขยายออกไปทางใกล้กล้องเล็กน้อย)
    const ax = viewAxes(), o = (x, y) => P(x + ax.fx * 0.15, y + ax.fy * 0.15);
    const e0 = o(-0.15, -0.1), e1 = o(COLS + 0.15, -0.1), e2 = o(COLS + 0.15, ROWS + 0.1), e3 = o(-0.15, ROWS + 0.1);
    g.fillStyle = night ? "rgba(0,0,0,.18)" : "rgba(60,80,50,.12)";
    g.beginPath(); g.moveTo(e0[0], e0[1]); g.lineTo(e1[0], e1[1]); g.lineTo(e2[0], e2[1]); g.lineTo(e3[0], e3[1]); g.closePath(); g.fill();
  }
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    quad(g, x, y); g.fillStyle = (x + y) % 2 ? C.tile2 : C.tile; g.fill();
  }
  const pz = info.plaza;
  // ด่าน I: ทางหินจากวงเวทไปทางปราสาท (ขอบไกลของมุมมอง)
  if (pz) {
    const ax = viewAxes(), fx = Math.round(ax.fx), fy = Math.round(ax.fy), rx = Math.round(ax.rx), ry = Math.round(ax.ry);
    const half = Math.abs(fx) * COLS / 2 + Math.abs(fy) * ROWS / 2;
    for (let k = Math.ceil(pz.r1 - 0.5); k <= Math.floor(half + 1.5); k++) for (const w of [-1, 0]) {
      const x = Math.floor(pz.x + rx * (w + 0.5) - fx * (k + 0.5)), y = Math.floor(pz.y + ry * (w + 0.5) - fy * (k + 0.5));
      quad(g, x, y, 0.04); g.fillStyle = C.path; g.fill(); g.strokeStyle = C.rim; g.lineWidth = 1.5; g.stroke();
    }
    drawPlazaStatic(g, pz, C, night);
    for (const { x, y } of info.heal) {
      quad(g, x, y, 0.06); g.strokeStyle = night ? "rgba(255,225,140,.55)" : "rgba(217,169,63,.55)"; g.lineWidth = 1.4; g.stroke();
    }
  } else if (info.heal.length) bakeHeal(g, info, { night, C, area: info.area });
  // ช่องพิเศษ
  for (const sp of info.special) bakeSpecial(g, sp, { night, C, area: info.area });
  // จุดเกิด
  for (const { x, y } of info.spawns) {
    g.strokeStyle = C.spawn; g.lineWidth = 1.5;
    gEllipse(g, x + 0.5, y + 0.5, 0.36, 0, 24); g.stroke(); gEllipse(g, x + 0.5, y + 0.5, 0.2, 0, 24); g.stroke();
  }
  // เส้นตาราง + ขอบกระดาน
  g.strokeStyle = C.grid; g.lineWidth = 1;
  for (let x = 0; x <= COLS; x++) { const a = P(x, 0), b = P(x, ROWS); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  for (let y = 0; y <= ROWS; y++) { const a = P(0, y), b = P(COLS, y); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  g.strokeStyle = C.border; g.lineWidth = 2;
  g.beginPath(); g.moveTo(c0[0], c0[1]); g.lineTo(c1[0], c1[1]); g.lineTo(c2[0], c2[1]); g.lineTo(c3[0], c3[1]); g.closePath(); g.stroke();
  // แสงแดด / ความมืด (ทับทั้งจอ รวมฉากหลัง)
  const gr = g.createLinearGradient(VX0, VY0, VX1, VY1);
  gr.addColorStop(0, C.light[0]); gr.addColorStop(0.45, "rgba(255,255,255,0)"); gr.addColorStop(1, C.light[1]);
  g.fillStyle = gr; g.fillRect(VX0, VY0, VW, VY1 - VY0);
  if (C.nightTint) { g.fillStyle = C.nightTint; g.fillRect(VX0, VY0, VW, VY1 - VY0); }
}
// อบชั้นกระดานที่มุม rotation (0..3)
export function bakeBoard(info, view, dpr, night, rotation = 0) {
  const prev = viewTurn();
  setCamera(info, normRot(rotation));
  const { cv, g } = layerCanvas(view, dpr);
  drawBoardLayer(g, info, view, night);
  setViewTurn(prev);
  return cv;
}
// ใช้กับโค้ดเดิม: อบครบทุกชั้นที่มุม 0 → { ground, fore }
export function bakeLayers(info, view, dpr, night, lowQ) {
  const s = bakeScene(info, view, dpr, night, lowQ, 0);
  const b = bakeBoard(info, view, dpr, night, 0);
  s.scene.getContext("2d").drawImage(b, 0, 0);
  return { ground: s.scene, fore: s.fore, marks: s.marks };
}

function drawPlazaStatic(g, pz, C, night) {
  const { x: px, y: py, r1, r2, sc } = pz;
  gEllipse(g, px, py + 0.08, r1 + 0.1); g.fillStyle = C.rim2; g.fill();
  gEllipse(g, px, py, r1 + 0.1); g.fillStyle = C.rim; g.fill();
  gEllipse(g, px, py, r1 - 0.02); g.fillStyle = C.plaza; g.fill();
  g.strokeStyle = night ? "rgba(200,225,255,.12)" : "rgba(28,63,110,.08)"; g.lineWidth = 1;
  for (let r = 0.5; r < r1; r += 0.42) { gEllipse(g, px, py, r); g.stroke(); }
  for (let a = 0; a < 24; a++) {
    const an = a / 24 * Math.PI * 2, p0 = P(px + Math.cos(an) * r2, py + Math.sin(an) * r2), p1 = P(px + Math.cos(an) * (r1 - 0.05), py + Math.sin(an) * (r1 - 0.05));
    g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
  }
  gEllipse(g, px, py + 0.1, r2 + 0.08); g.fillStyle = C.rim2; g.fill();
  gEllipse(g, px, py, r2 + 0.08); g.fillStyle = C.rim; g.fill();
  gEllipse(g, px, py, r2 - 0.04); g.fillStyle = C.plaza2; g.fill();
  g.strokeStyle = C.gold; g.lineWidth = 2; gEllipse(g, px, py, 2.0 * sc); g.stroke();
  g.strokeStyle = C.line; g.lineWidth = 1.6; gEllipse(g, px, py, 1.6 * sc); g.stroke(); gEllipse(g, px, py, 1.0 * sc); g.stroke();
  g.strokeStyle = C.gold; g.lineWidth = 1.4;
  for (const off of [0, Math.PI / 4]) {
    g.beginPath();
    for (let k = 0; k <= 4; k++) {
      const an = off + k * Math.PI / 2, p = P(px + Math.cos(an) * 1.95 * sc, py + Math.sin(an) * 1.95 * sc);
      if (k) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
    }
    g.stroke();
  }
}

// ป้ายร้านค้าลอยเหนือแผง ("🏪 N" = เหลือ N เทิร์น) — วาดทับของบนกระดาน จึงตามซูม/เลื่อน/หมุนเอง
function drawShopLabel(g, x, y, text) {
  const [lx, ly] = P(x + 0.5, y + 0.5, 2.1);
  g.save();
  g.font = `600 13px ${F_UI}`; g.textAlign = "center"; g.textBaseline = "middle";
  const tw = g.measureText(text).width + 16, th = 18;
  g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = 6; g.shadowOffsetY = 2;
  g.fillStyle = "#f0c868"; g.fillRect(lx - tw / 2, ly - th, tw, th);
  g.shadowColor = "transparent";
  g.fillStyle = "#12264a"; g.fillText(text, lx, ly - th / 2 + 0.5);
  g.restore();
}
// แผงร้านค้ามายา (กินช่อง 1 ช่อง — GRID_PLAN §8.1)
function drawShop(g, x, y, C, now, night) {
  const [bx, by, s] = PA(x, y, 0.05);
  gEllipse(g, x + 0.5, y + 0.5, 0.46, 0, 28);
  g.fillStyle = night ? "rgba(240,200,104,.22)" : "rgba(217,169,63,.2)"; g.fill();
  g.strokeStyle = night ? "rgba(255,225,140,.85)" : "rgba(217,169,63,.85)"; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(bx + s * 0.05, by, s * 0.48, s * 0.15, 0, 0, 7); g.fill();
  const w = s * 0.8, ch = s * 0.36, cTop = by - s * 0.08 - ch, aw = by - s * 1.12, ah = s * 0.26;
  // เสา
  g.fillStyle = "#6b4630";
  g.fillRect(bx - w / 2, aw, s * 0.06, by - s * 0.08 - aw); g.fillRect(bx + w / 2 - s * 0.06, aw, s * 0.06, by - s * 0.08 - aw);
  // ของบนเคาน์เตอร์ (ขวดยา)
  const goods = ["#ef5a6a", "#7fbef5", "#c99ad6"];
  goods.forEach((c, i) => {
    const gx = bx - w * 0.26 + i * w * 0.26, gy = cTop - s * 0.02;
    g.fillStyle = c; g.beginPath(); g.arc(gx, gy - s * 0.07, s * 0.07, 0, 7); g.fill();
    g.fillStyle = "#f6f4ee"; g.fillRect(gx - s * 0.02, gy - s * 0.2, s * 0.04, s * 0.07);
  });
  // เคาน์เตอร์
  g.fillStyle = night ? "#6e4a33" : "#8a5a3c"; g.fillRect(bx - w / 2, cTop, w, ch);
  g.fillStyle = night ? "#8d6345" : "#b07a4f"; g.fillRect(bx - w / 2 - s * 0.03, cTop - s * 0.05, w + s * 0.06, s * 0.06);
  g.fillStyle = "#d9a93f"; g.fillRect(bx - w / 2, cTop + ch * 0.45, w, s * 0.035);
  // หลังคาผ้าลาย ม่วง/ทอง + ขอบหยัก
  const n = 6, sw = (w + s * 0.16) / n, ax0 = bx - w / 2 - s * 0.08;
  for (let i = 0; i < n; i++) {
    g.fillStyle = i % 2 ? "#f0c868" : "#7b4ddb";
    g.fillRect(ax0 + i * sw, aw - ah, sw + 0.5, ah);
    g.beginPath(); g.arc(ax0 + i * sw + sw / 2, aw, sw / 2, 0, Math.PI); g.fill();
  }
  // ป้ายเหรียญลอย
  const cy = aw - ah - s * 0.32 + Math.sin(now / 600) * s * 0.04;
  g.fillStyle = "#e6b44c"; g.beginPath(); g.arc(bx, cy, s * 0.17, 0, 7); g.fill();
  g.strokeStyle = "#fff1b8"; g.lineWidth = 1.5; g.stroke();
  g.font = `700 ${Math.max(9, s * 0.2) | 0}px ${F_UI}`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = "#7a5a1a"; g.fillText("฿", bx, cy + 1); g.textBaseline = "alphabetic";
}


// =================================================================== units
function unitHex(g, u, cx, cy, r, alpha = 1) {
  g.save(); g.globalAlpha *= alpha;
  hexPath(g, cx, cy, r + 3); g.fillStyle = "#0d1c36"; g.fill();
  hexPath(g, cx, cy, r + 1.5); g.strokeStyle = u.color; g.lineWidth = 3; g.stroke();
  g.save(); hexPath(g, cx, cy, r - 1); g.clip();
  const e = getImg(u.img);
  if (e && e.ok) cover(g, e.img, cx - r, cy - r * 0.87, r * 2, r * 1.74, 0.08);
  else {
    // รูปโหลดไม่ขึ้น/ยังโหลดอยู่ → แผ่นสีประจำที่นั่ง + ตัวอักษรแรกของชื่อ
    const gr = g.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.1, cx, cy, r * 1.1);
    gr.addColorStop(0, shadeHex(u.color, 0.35)); gr.addColorStop(1, shadeHex(u.color, -0.35));
    g.fillStyle = gr; g.fillRect(cx - r, cy - r, r * 2, r * 2);
    const ch = (u.name || "?").trim().charAt(0) || "?";
    g.font = `700 ${Math.max(10, r * 0.9) | 0}px ${F_TH}`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "rgba(255,255,255,.92)"; g.fillText(ch, cx, cy + r * 0.04); g.textBaseline = "alphabetic";
  }
  g.restore();
  g.restore();
}
function normTag(tag) {
  if (tag == null || tag === "") return null;
  if (typeof tag === "object") return tag.text == null && !tag.backs ? null : { text: tag.text == null ? "" : String(tag.text), bust: !!tag.bust, backs: tag.backs | 0 };
  const text = String(tag);
  return { text, bust: text === "แตก", backs: 0 };
}
// ป้ายเหนือหัว: แต้ม (ตัวเลขทอง) · "พอ" · "แตก" (ป้ายแดง) · หรือ { backs: N } = หลังไพ่ N ใบ
function drawTag(g, x, y, tag) {
  if (tag.backs) {
    const n = Math.min(6, tag.backs);
    for (let i = 0; i < n; i++) {
      const cx = x - (n - 1) * 7 + i * 14;
      g.fillStyle = "#12264a"; g.fillRect(cx - 7, y - 10, 13, 18); g.strokeStyle = "#7fb8e6"; g.lineWidth = 1; g.strokeRect(cx - 6.5, y - 9.5, 12, 17);
    }
    if (tag.text) {
      g.font = `600 13px ${F_TH}`; g.textAlign = "center"; g.textBaseline = "middle";
      const tw = g.measureText(tag.text).width + 12; g.fillStyle = "#12264a"; g.fillRect(x - tw / 2, y - 31, tw, 18);
      g.fillStyle = "#fff"; g.fillText(tag.text, x, y - 22); g.textBaseline = "alphabetic";
    }
    return;
  }
  const isNum = /^[0-9+\-−]+$/.test(tag.text);
  g.font = isNum ? `700 16px ${F_UI}` : `600 13px ${F_TH}`; g.textAlign = "center"; g.textBaseline = "middle";
  const tw = Math.max(34, g.measureText(tag.text).width + 16), th = 22;
  g.fillStyle = tag.bust ? "#c94a44" : "#12264a";
  g.beginPath(); g.moveTo(x - tw / 2, y - th / 2); g.lineTo(x + tw / 2, y - th / 2); g.lineTo(x + tw / 2, y + th / 2 - 6); g.lineTo(x + tw / 2 - 6, y + th / 2); g.lineTo(x - tw / 2, y + th / 2); g.closePath(); g.fill();
  g.strokeStyle = tag.bust ? "#ff9b94" : "#e6c46a"; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = tag.bust ? "#fff" : isNum ? "#f0d070" : "#dbe8f7"; g.fillText(tag.text, x, y + 1);
  g.textBaseline = "alphabetic";
}
function drawReticle(g, x, y, r, kind, now) {
  const col = kind === "aoe" ? "#ffcf5a" : kind === "attack" ? "#ff8f84" : "#c9a2ff";
  const rot = now / 900, rr = r + 10 + Math.sin(now / 220) * 2;
  g.strokeStyle = col; g.lineWidth = 2.5;
  for (let k = 0; k < 4; k++) { const a = rot + k * Math.PI / 2; g.beginPath(); g.arc(x, y, rr, a, a + 0.9); g.stroke(); }
}
// ตัวที่ซ่อนจากศัตรู (cloak — เราเห็นเพราะเป็นตัวเอง/เพื่อนร่วมทีม): แถบแสงพาดผ่านรูปหกเหลี่ยมช้าๆ
function cloakShimmer(g, cx, cy, r, now) {
  const ph = (now / 1600) % 1, x = cx - r * 1.8 + ph * r * 3.6, w = r * 0.7;
  g.save(); hexPath(g, cx, cy, r); g.clip();
  const gr = g.createLinearGradient(x - w, cy - r, x + w, cy + r);
  gr.addColorStop(0, "rgba(220,240,255,0)"); gr.addColorStop(0.5, "rgba(220,240,255,.55)"); gr.addColorStop(1, "rgba(220,240,255,0)");
  g.fillStyle = gr; g.fillRect(cx - r, cy - r, r * 2, r * 2);
  g.restore();
}
// u = { id, rx, ry, ox, oy, color, img, name, hp, maxHp, armor, maxArmor, isMe, isActor, tag, alpha, reticle, hitT, hovered, cloak }
function drawUnit(g, u, now, boxes) {
  let jx = 0, jy = 0;
  const hitAge = u.hitT ? now - u.hitT : 1e9;
  if (hitAge >= 0 && hitAge < 300) { const k = 1 - hitAge / 300; jx = (Math.random() - 0.5) * 0.12 * k; jy = (Math.random() - 0.5) * 0.08 * k; }
  const wx = u.rx + 0.5 + (u.ox || 0) + jx, wy = u.ry + 0.5 + (u.oy || 0) + jy;
  const [bx, by, s] = P(wx, wy);
  const a = u.alpha == null ? 1 : u.alpha;
  g.save(); g.globalAlpha = a;
  // ฐานแบบที่นั่ง (ทรงกระบอก)
  gEllipse(g, wx + 0.05, wy + 0.07, 0.36, 0, 28); g.fillStyle = "rgba(0,0,0,.22)"; g.fill();
  const P1 = P(wx, wy, 0.12);
  gEllipse(g, wx, wy, 0.32, 0, 28); g.fillStyle = shadeHex(u.color, -0.25); g.fill();
  gEllipse(g, wx, wy, 0.32, 0.12, 28); g.fillStyle = u.color; g.fill();
  g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 2; g.stroke();
  if (u.isMe) {
    // ตัวเรา: วงทองคู่รอบฐาน
    g.strokeStyle = "#f0c868"; g.lineWidth = 2.5; gEllipse(g, wx, wy, 0.43, 0.02, 32); g.stroke();
    g.lineWidth = 1; gEllipse(g, wx, wy, 0.48, 0.02, 32); g.stroke();
  }
  if (u.isActor) {
    const p = (now / 1100) % 1;
    g.globalAlpha = a * (1 - p); gEllipse(g, wx, wy, 0.4 + p * 0.4, 0.12, 28); g.strokeStyle = "#fff"; g.lineWidth = 2; g.stroke(); g.globalAlpha = a;
  }
  // ลำแสงจากฐานขึ้นรูป
  const hexR = s * 0.4, hy = by - s * 0.86 + (u.isActor ? Math.sin(now / 280) * s * 0.04 : 0);
  const bm = g.createLinearGradient(0, hy, 0, P1[1]);
  bm.addColorStop(0, hexA(u.color, 0.2)); bm.addColorStop(1, hexA(u.color, 0.9));
  g.fillStyle = bm; g.fillRect(bx - 2.5, hy, 5, P1[1] - hy);
  if (u.isActor) {
    const gl = g.createRadialGradient(bx, hy, hexR * 0.6, bx, hy, hexR * 1.7);
    gl.addColorStop(0, "rgba(255,255,255,.35)"); gl.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gl; g.fillRect(bx - hexR * 1.8, hy - hexR * 1.8, hexR * 3.6, hexR * 3.6);
  }
  unitHex(g, u, bx, hy, hexR);
  if (u.isActor) { hexPath(g, bx, hy, hexR + 5); g.strokeStyle = "#ffffff"; g.lineWidth = 2; g.stroke(); }
  if (u.cloak && !REDUCED) cloakShimmer(g, bx, hy, hexR, now);
  if (hitAge >= 0 && hitAge < 150) { g.save(); hexPath(g, bx, hy, hexR); g.fillStyle = `rgba(255,255,255,${0.85 * (1 - hitAge / 150)})`; g.fill(); g.restore(); }
  // แผ่นเลือด/เกราะขนาดเล็ก
  const maxHp = Math.max(1, u.maxHp | 0 || 7), maxAr = Math.max(0, u.maxArmor == null ? 3 : u.maxArmor | 0);
  const nT = Math.min(16, maxHp + maxAr), hpN = Math.min(maxHp, nT), arN = nT - hpN;
  const pw = Math.max(54, s * 1.0, nT * 6), ph = 9, px = bx - pw / 2, py = hy + hexR * 0.87 + 3;
  g.fillStyle = "rgba(13,28,54,.92)"; g.fillRect(px, py, pw, ph);
  const gap = arN ? 4 : 0, tw = (pw - 6 - gap) / nT;
  for (let i = 0; i < nT; i++) {
    const arm = i >= hpN, on = arm ? i - hpN < (u.armor | 0) : i < (u.hp | 0);
    g.fillStyle = on ? (arm ? "#7fbef5" : "#ef5a6a") : "rgba(255,255,255,.12)";
    g.fillRect(px + 3 + i * tw + (arm ? gap : 0), py + 2, tw - 1.2, ph - 4);
  }
  // ชื่อ (ตอนชี้)
  if (u.hovered && u.name) {
    g.font = `600 13px ${F_TH}`; g.textAlign = "center"; g.textBaseline = "middle";
    const nw = g.measureText(u.name).width + 14;
    g.fillStyle = "rgba(13,28,54,.92)"; g.fillRect(bx - nw / 2, py + ph + 3, nw, 19);
    g.fillStyle = "#ffffff"; g.fillText(u.name, bx, py + ph + 13); g.textBaseline = "alphabetic";
  }
  // ป้าย "คุณ" มุมซ้ายบนของรูป
  if (u.isMe) {
    g.font = `600 11px ${F_TH}`; g.textAlign = "center"; g.textBaseline = "middle";
    const mw = g.measureText("คุณ").width + 10, mx = bx - hexR - 4, my = hy - hexR * 0.87 - 2;
    g.fillStyle = "#f0c868"; g.fillRect(mx - mw / 2, my - 8, mw, 16);
    g.fillStyle = "#3a2a08"; g.fillText("คุณ", mx, my + 0.5); g.textBaseline = "alphabetic";
  }
  const tag = normTag(u.tag);
  if (tag) drawTag(g, bx + hexR + (tag.backs ? 10 + Math.min(6, tag.backs) * 7 : 22), hy - hexR * 0.2, tag);
  if (u.isActor) {
    const ay = hy - hexR - 14 + Math.sin(now / 200) * 3;
    g.fillStyle = "#fff"; g.beginPath(); g.moveTo(bx - 8, ay - 9); g.lineTo(bx + 8, ay - 9); g.lineTo(bx, ay); g.closePath(); g.fill();
  }
  if (u.reticle) drawReticle(g, bx, hy, hexR, u.reticle, now);
  g.restore();
  if (boxes) boxes.push({ id: u.id, x: u.rx, y: u.ry, d: depthOf(wx, wy), x0: bx - hexR - 4, y0: hy - hexR - 4, x1: bx + hexR + 4, y1: by + s * 0.2 });
}


// =================================================================== overlays
function tileFill(g, x, y, fill, stroke, inset = 0.06) {
  quad(g, x, y, inset); g.fillStyle = fill; g.fill();
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1.5; g.stroke(); }
}
// เส้นขอบรอบนอกของกลุ่มช่อง (ใช้กับวงตีหมู่/ระยะอันตราย)
function outlineSet(g, set, color, width) {
  g.beginPath();
  for (const k of set) {
    const [x, y] = parseKey(k);
    const seg = (ax, ay, bx2, by2) => { const a = P(ax, ay), b = P(bx2, by2); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); };
    if (!set.has(key(x, y - 1))) seg(x, y, x + 1, y);
    if (!set.has(key(x, y + 1))) seg(x, y + 1, x + 1, y + 1);
    if (!set.has(key(x - 1, y))) seg(x, y, x, y + 1);
    if (!set.has(key(x + 1, y))) seg(x + 1, y, x + 1, y + 1);
  }
  g.strokeStyle = color; g.lineWidth = width; g.lineCap = "round"; g.stroke(); g.lineCap = "butt";
}
function arrowGround(g, x0, y0, x1, y1, color) {
  const a = P(x0 + 0.5, y0 + 0.5), b = P(x1 + 0.5, y1 + 0.5);
  g.strokeStyle = color; g.lineWidth = 5; g.lineCap = "round"; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.lineCap = "butt";
  const an = Math.atan2(b[1] - a[1], b[0] - a[0]);
  g.fillStyle = color; g.beginPath(); g.moveTo(b[0] + Math.cos(an) * 7, b[1] + Math.sin(an) * 7);
  g.lineTo(b[0] + Math.cos(an + 2.5) * 15, b[1] + Math.sin(an + 2.5) * 15); g.lineTo(b[0] + Math.cos(an - 2.5) * 15, b[1] + Math.sin(an - 2.5) * 15); g.closePath(); g.fill();
}
const inB = (info, x, y) => x >= 0 && y >= 0 && x < info.cols && y < info.rows;

// highlights (prop) → ข้อมูลพร้อมวาด — เรียกเมื่อ prop เปลี่ยน
export function prepareHighlights(h) {
  const toSet = (list) => new Set((Array.isArray(list) ? list : list instanceof Set ? [...list] : []).map((v) => {
    const p = normPt(v); return p ? key(p.x, p.y) : null;
  }).filter(Boolean));
  h = h || {};
  return {
    move: toSet(h.move), attack: toSet(h.attack), skill: toSet(h.skill), aoe: toSet(h.aoe), danger: toSet(h.danger),
    path: ptList(h.path),
    target: h.target ? normPt(h.target) : null,
    push: h.push && h.push.from && h.push.to ? { from: normPt(h.push.from), to: normPt(h.push.to), collide: !!h.push.collide } : null,
  };
}
function drawHighlights(g, info, hl, hover, now) {
  if (hl.danger.size) {
    for (const k of hl.danger) { const [x, y] = parseKey(k); if (inB(info, x, y)) tileFill(g, x, y, OV.danger[0], null, 0.02); }
    outlineSet(g, hl.danger, OV.danger[1], 2);
  }
  for (const k of hl.move) { const [x, y] = parseKey(k); if (inB(info, x, y)) tileFill(g, x, y, OV.move[0], OV.move[1]); }
  for (const k of hl.attack) { const [x, y] = parseKey(k); if (inB(info, x, y)) tileFill(g, x, y, OV.attack[0], OV.attack[1]); }
  for (const k of hl.skill) { const [x, y] = parseKey(k); if (inB(info, x, y)) tileFill(g, x, y, OV.skill[0], OV.skill[1]); }
  if (hl.aoe.size) {
    for (const k of hl.aoe) { const [x, y] = parseKey(k); if (inB(info, x, y)) tileFill(g, x, y, OV.aoe[0], null, 0.03); }
    g.save(); g.globalAlpha = 0.75 + 0.25 * Math.sin(now / 260); outlineSet(g, hl.aoe, OV.aoe[1], 3); g.restore();
  }
  if (hl.target && inB(info, hl.target.x, hl.target.y)) tileFill(g, hl.target.x, hl.target.y, "rgba(224,86,79,.55)", "#ffb0a8");
  if (hl.push) {
    const { from, to, collide } = hl.push;
    if (collide) {
      if (inB(info, to.x, to.y)) tileFill(g, to.x, to.y, "rgba(255,170,60,.35)", "rgba(255,200,120,.9)");
      const [cx, cy, s] = P(to.x + 0.5, to.y + 0.5, 0.3);
      g.strokeStyle = "#ffb347"; g.lineWidth = 4;
      g.beginPath(); g.moveTo(cx - s * 0.22, cy - s * 0.14); g.lineTo(cx + s * 0.22, cy + s * 0.14); g.moveTo(cx + s * 0.22, cy - s * 0.14); g.lineTo(cx - s * 0.22, cy + s * 0.14); g.stroke();
    } else {
      tileFill(g, to.x, to.y, "rgba(255,190,80,.32)", "rgba(255,210,130,.9)");
      arrowGround(g, from.x, from.y, to.x, to.y, "#ffb347");
    }
  }
  if (hl.path.length > 1) {
    g.save(); g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 4; g.lineCap = "round"; g.lineJoin = "round";
    g.beginPath();
    hl.path.forEach((p, i) => { const [sx, sy] = P(p.x + 0.5, p.y + 0.5); if (i) g.lineTo(sx, sy); else g.moveTo(sx, sy); });
    g.stroke(); g.restore();
  }
  hl.path.forEach((p, i) => {
    const [sx, sy, s] = P(p.x + 0.5, p.y + 0.5);
    g.fillStyle = "#fff"; g.beginPath(); g.ellipse(sx, sy, s * 0.09, s * 0.055, 0, 0, 7); g.fill();
    if (i === hl.path.length - 1 && i > 0) { g.strokeStyle = "#fff"; g.lineWidth = 2; gEllipse(g, p.x + 0.5, p.y + 0.5, 0.3, 0, 24); g.stroke(); }
  });
  if (hover && inB(info, hover.x, hover.y)) {
    quad(g, hover.x, hover.y, 0.03); g.fillStyle = "rgba(255,255,255,.12)"; g.fill();
    g.strokeStyle = "rgba(255,255,255,.95)"; g.lineWidth = 2; g.stroke();
  }
}
function floatText(g, x, y, text, color, p, size = 24, z0 = 2.4) {
  if (p <= 0 || p >= 1) return;
  const [sx, sy] = P(x + 0.5, y + 0.5, z0 + p * 0.7);
  g.save(); g.globalAlpha = p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25;
  g.font = `700 ${size}px ${/^[0-9+\-−\s]+$/.test(text) ? F_UI : F_TH}`; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineWidth = 5; g.strokeStyle = "rgba(10,20,40,.85)"; g.lineJoin = "round"; g.strokeText(text, sx, sy); g.fillStyle = color; g.fillText(text, sx, sy);
  g.restore();
}
function slashFx(g, x, y, p, rgb) {
  if (p <= 0 || p >= 1) return;
  const [cx, cy, s] = P(x + 0.5, y + 0.5, 1.05);
  g.strokeStyle = `rgba(255,255,255,${1 - p})`; g.lineWidth = 5 * (1 - p) + 1;
  g.beginPath(); g.moveTo(cx - s * 0.55, cy - s * 0.45 + p * 10); g.lineTo(cx + s * 0.55, cy + s * 0.35 + p * 10); g.stroke();
  g.strokeStyle = `rgba(${rgb},${1 - p})`; g.lineWidth = 3; g.beginPath(); g.ellipse(cx, cy, s * (0.2 + p * 0.8), s * (0.14 + p * 0.5), 0, 0, 7); g.stroke();
}
// แสงแตกตอนปะทะ (ฉากตีแบบใหม่): วงแหวนขยาย + ดาว 8 แฉก + รัศมี 14 เส้น — rgb = สีผู้ตี
function burstFx(g, x, y, p, rgb) {
  if (p <= 0 || p >= 1) return;
  const [cx, cy, s] = P(x + 0.5, y + 0.5, 1.1);
  const e = 1 - Math.pow(1 - p, 3), a = p < 0.35 ? 1 : 1 - (p - 0.35) / 0.65;
  g.save(); g.globalAlpha = a; g.lineCap = "round";
  g.strokeStyle = "#ffffff"; g.lineWidth = 6 * (1 - p) + 1;
  g.beginPath(); g.ellipse(cx, cy, s * (0.25 + e * 1.1), s * (0.18 + e * 0.75), 0, 0, 7); g.stroke();
  for (let i = 0; i < 14; i++) {
    const t = i / 14 * Math.PI * 2 + (i % 2) * 0.12, r0 = s * (0.2 + e * 0.35), r1 = s * (0.55 + e * (i % 2 ? 0.95 : 1.35));
    g.strokeStyle = i % 3 ? "rgba(255,255,255,1)" : `rgba(${rgb},1)`; g.lineWidth = (i % 2 ? 3 : 5) * (1 - p * 0.6);
    g.beginPath(); g.moveTo(cx + Math.cos(t) * r0, cy + Math.sin(t) * r0 * 0.75); g.lineTo(cx + Math.cos(t) * r1, cy + Math.sin(t) * r1 * 0.75); g.stroke();
  }
  const k = s * 0.42 * (1 - p * 0.6);
  g.fillStyle = "#ffffff"; g.beginPath();
  for (let i = 0; i < 16; i++) { const t = i / 16 * Math.PI * 2, r = i % 2 ? k * 0.32 : k; g.lineTo(cx + Math.cos(t) * r, cy + Math.sin(t) * r * 0.85); }
  g.closePath(); g.fill();
  g.restore();
}

// =================================================================== Beam Magnum (นักบินปริศนา)
//  fx { kind: "beam", x, y (ช่องคนยิง), dir: up|down|left|right, len, beam: prepareBeam(...) }
//  ลำแสงเกลียว ขาวผสมแดง (ผู้ใช้สั่ง — ไม่ใช้สีผู้เล่น): แกนขาวร้อน + เกลียวแดง 2 เส้นพันรอบแกน หมุนไหลไปข้างหน้า + เรืองแดงรอบนอก
//  ชาร์จที่ปากกระบอก → ลำแสงพุ่งไปสุดแนว (ease-out) → ค้าง → จาง (เกลียวคลายออก) · ช่องที่ลำแสงผ่าน = แฟลชบนพื้น
//  ทุกจุดคิดในพิกัดโลก (แกนลอยสูง BEAM_Z · เกลียวหมุนในระนาบตั้งฉากกับแนวยิง) แล้วฉายด้วยกล้อง — ถูกทุกมุมหมุน/ซูม/มุมบน
//   เกลียวช่วงที่อยู่หลังแกน (ไกลกล้องกว่า) วาดก่อนแกน · ช่วงหน้าแกนวาดทับ — เห็นเป็นเกลียวพันรอบจริง
//  lowQ = เกลียวเส้นเดียว ไม่มีชั้นเรือง · ลดการเคลื่อนไหว = เกลียวนิ่ง ลำแสงขึ้นเต็มทันที
export const BEAM_T = { charge: 160, extend: 150, hold: 400, fade: 300 };
const BEAM_Z = 0.62, MUZZLE = 0.3, IMPACT_MS = 280;
const BEAM_DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const HELIX = { r: 0.17, twist: 3.3, step: 0.06, spin: 0.02 }; // รัศมี (ช่อง) · rad ต่อช่อง · ระยะจุดตัวอย่าง · rad ต่อ ms
const RED = "235,28,48", RED_HI = "255,120,120", WHITE_RED = "255,215,215";
// ช่องที่ลำแสงผ่าน (เริ่มช่องติดคนยิง · ตัดที่ขอบกระดาน) + เวลาที่ปลายลำแสงถึงกลางแต่ละช่อง (ms นับจากเริ่ม fx)
//  f.to = ช่องเป้า (ตีปกติของนักบินปริศนา) → ยิงเฉียงตรงไปหาเป้าได้ ยาว len ช่อง แทนการเลือก 4 ทิศ
export function prepareBeam(f, cols, rows) {
  if (f && f.to) return prepareAimedBeam(f, cols, rows);
  const v = BEAM_DIRS[f && f.dir];
  if (!v || !Number.isFinite(f.x) || !Number.isFinite(f.y)) return null;
  const len = Math.max(1, Math.min(64, Math.floor(+f.len) || 6));
  const tiles = [];
  for (let i = 1; i <= len; i++) {
    const x = f.x + v[0] * i, y = f.y + v[1] * i;
    if (x < 0 || y < 0 || x >= cols || y >= rows) break;
    tiles.push({ x, y });
  }
  const reach = tiles.length + 0.5 - MUZZLE; // ปากกระบอก → ขอบไกลของช่องสุดท้าย (หน่วยช่อง)
  const { charge: C, extend: E } = BEAM_T;
  const hits = tiles.map((_, i) => {
    const q = Math.min(1, (i + 1 - MUZZLE) / reach); // ระยะถึงกลางช่อง (สัดส่วน) → เวลาจาก ease-out ย้อนกลับ
    return C + (REDUCED ? 0 : E * (1 - Math.cbrt(1 - q)));
  });
  return { v, tiles, hits, reach };
}
// ลำแสงเล็งเป้า: แนวจากกลางช่องคนยิง → กลางช่องเป้า ยาว len ช่อง (ถึงขอบไกล len + 0.5) · ตัดที่ขอบกระดาน
//  ช่องที่ผ่าน = ไล่จุดตามแนวทีละ 0.05 ช่อง · เวลาถึงแต่ละช่อง = ระยะฉายกลางช่องบนแนว
function prepareAimedBeam(f, cols, rows) {
  const { x, y, to } = f;
  if (![x, y, to.x, to.y].every(Number.isFinite)) return null;
  const dx = to.x - x, dy = to.y - y, L = Math.hypot(dx, dy);
  if (L < 0.5) return null;
  const v = [dx / L, dy / L];
  const len = Math.max(1, Math.min(64, Math.floor(+f.len) || 4));
  const cx = x + 0.5, cy = y + 0.5, seen = new Set(), tiles = [];
  let end = len + 0.5;
  for (let d = 0.05; d <= len + 0.5; d += 0.05) {
    const px = cx + v[0] * d, py = cy + v[1] * d;
    if (px < 0 || py < 0 || px >= cols || py >= rows) { end = d; break; }
    const tx = Math.floor(px), ty = Math.floor(py), k = tx + "," + ty;
    if ((tx === x && ty === y) || seen.has(k)) continue;
    seen.add(k); tiles.push({ x: tx, y: ty });
  }
  const reach = Math.max(0.2, end - MUZZLE);
  const { charge: C, extend: E } = BEAM_T;
  const hits = tiles.map((t) => {
    const d = (t.x + 0.5 - cx) * v[0] + (t.y + 0.5 - cy) * v[1];
    const q = Math.max(0, Math.min(1, (d - MUZZLE) / reach));
    return C + (REDUCED ? 0 : E * (1 - Math.cbrt(1 - q)));
  });
  return { v, tiles, hits, reach };
}
// สีลำแสง: ขาวผสมแดงเสมอ (ไม่ตามสีผู้เล่น) — คงรูปคืนค่าไว้ให้ BoardCanvas
export function beamColors() {
  return { rgb: RED, hot: WHITE_RED };
}
// แท่งเรียวปลายมน ระหว่างจุดจอ A, B ([sx, sy, สเกล]) · w = ความกว้างหน่วยช่อง
function taper(g, A, B, w, fill) {
  const vx = B[0] - A[0], vy = B[1] - A[1], L = Math.hypot(vx, vy), ha = A[2] * w / 2, hb = B[2] * w / 2;
  g.beginPath();
  if (L < 0.5) g.arc(A[0], A[1], Math.max(ha, hb), 0, Math.PI * 2);
  else {
    const nx = -vy / L, ny = vx / L, th = Math.atan2(vy, vx);
    g.moveTo(A[0] + nx * ha, A[1] + ny * ha);
    g.lineTo(B[0] + nx * hb, B[1] + ny * hb);
    g.arc(B[0], B[1], hb, th + Math.PI / 2, th - Math.PI / 2, true);
    g.lineTo(A[0] - nx * ha, A[1] - ny * ha);
    g.arc(A[0], A[1], ha, th - Math.PI / 2, th + Math.PI / 2, true);
  }
  g.closePath(); g.fillStyle = fill; g.fill();
}
// จุดบนจอของเกลียวเส้น k (0/1 = ห่างกันครึ่งรอบ) จากปากกระบอก (ax, ay) ไปถึงระยะ dist ช่อง
//  คืน [[sx, sy, สเกล, อยู่หน้าแกน?], …] — เกลียวค่อยๆ กางออกจากปากกระบอกในช่วง 0.45 ช่องแรก
function helixPts(ax, ay, dx, dy, dist, phase, k, rK) {
  const out = [], n = Math.max(2, Math.ceil(dist / HELIX.step));
  for (let i = 0; i <= n; i++) {
    const d = dist * i / n, r = HELIX.r * rK * Math.min(1, d / 0.45);
    const th = d * HELIX.twist - phase + k * Math.PI, c = Math.cos(th) * r;
    const cx = ax + dx * d, cy = ay + dy * d;
    const pt = P(cx - dy * c, cy + dx * c, BEAM_Z + Math.sin(th) * r);
    pt.push(pt[2] >= P(cx, cy, BEAM_Z)[2]);
    out.push(pt);
  }
  return out;
}
// วาดช่วงของเกลียวที่อยู่ด้านเดียวกับ front (หน้า/หลังแกน) · w = ความกว้างหน่วยช่อง
function strokeHelix(g, pts, front, w, color) {
  g.strokeStyle = color;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if ((a[3] && b[3]) !== front) continue; // ช่วงที่ข้ามแกนนับเป็นด้านหลัง
    g.lineWidth = Math.max(1, (a[2] + b[2]) / 2 * w);
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
  }
}
function beamFx(g, e, now, lowQ) {
  const B = e.beam;
  if (!B) return;
  const { charge: C, extend: E, hold: H, fade: F } = BEAM_T, t = now - e.t0;
  if (t < 0 || t > C + E + H + F) return;
  const [dx, dy] = B.v;
  const ax = e.x + 0.5 + dx * MUZZLE, ay = e.y + 0.5 + dy * MUZZLE;
  const A = P(ax, ay, BEAM_Z);
  const still = lowQ || REDUCED;
  const fadeK = t > C + E + H ? Math.max(0, 1 - (t - C - E - H) / F) : 1;
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  // ช่องที่ลำแสงผ่าน: พื้นแดงจาง + แฟลชขาวตอนปลายลำแสงถึง
  B.tiles.forEach((tl, i) => {
    const age = t - B.hits[i];
    if (age < 0) return;
    g.globalCompositeOperation = "source-over";
    quad(g, tl.x, tl.y, 0.1); g.fillStyle = `rgba(${RED},${0.22 * fadeK})`; g.fill();
    if (age < IMPACT_MS) {
      const q = age / IMPACT_MS, a = 1 - q;
      g.globalCompositeOperation = "lighter";
      gEllipse(g, tl.x + 0.5, tl.y + 0.5, 0.16 + q * 0.32, 0, 24); g.fillStyle = `rgba(255,255,255,${0.7 * a})`; g.fill();
      const [sx, sy, sc] = P(tl.x + 0.5, tl.y + 0.5, BEAM_Z);
      glow(g, sx, sy, sc * (0.35 + q * 0.4), WHITE_RED, 0.85 * a);
      if (!still) {
        g.globalCompositeOperation = "source-over";
        g.strokeStyle = `rgba(${RED_HI},${a})`; g.lineWidth = 2;
        for (let k = 0; k < 5; k++) {
          const th = (k / 5) * Math.PI * 2 + i * 1.7, r0 = sc * 0.12, r1 = sc * (0.2 + q * 0.45);
          g.beginPath(); g.moveTo(sx + Math.cos(th) * r0, sy + Math.sin(th) * r0 * 0.7); g.lineTo(sx + Math.cos(th) * r1, sy + Math.sin(th) * r1 * 0.7); g.stroke();
        }
      }
    }
  });
  // ชาร์จที่ปากกระบอก: วงแดงรวมตัว + จุดขาว → แฟลชตอนยิง
  if (t < C) {
    const p = t / C;
    g.globalCompositeOperation = "source-over";
    glow(g, A[0], A[1], A[2] * (0.25 + 0.55 * p), RED, 0.3 + 0.45 * p);
    g.globalCompositeOperation = "lighter";
    glow(g, A[0], A[1], A[2] * (0.08 + 0.22 * p), "255,255,255", 0.5 + 0.5 * p);
    if (!still) {
      g.globalCompositeOperation = "source-over";
      g.fillStyle = `rgba(${RED_HI},${0.4 + 0.6 * p})`;
      for (let k = 0; k < 8; k++) {
        const th = (k / 8) * Math.PI * 2 + now / 260, r = A[2] * 0.75 * (1 - p);
        g.beginPath(); g.arc(A[0] + Math.cos(th) * r, A[1] + Math.sin(th) * r * 0.75, 1.6 + p * 1.6, 0, Math.PI * 2); g.fill();
      }
    }
  } else if (t < C + 240) {
    const q = (t - C) / 240, a = 1 - q;
    g.globalCompositeOperation = "lighter";
    glow(g, A[0], A[1], A[2] * (0.6 + q * 0.6), "255,255,255", a);
    g.globalCompositeOperation = "source-over";
    g.strokeStyle = `rgba(${RED},${a})`; g.lineWidth = 3 * a + 1;
    g.beginPath(); g.ellipse(A[0], A[1], A[2] * (0.25 + q * 0.7), A[2] * (0.18 + q * 0.5), 0, 0, Math.PI * 2); g.stroke();
  }
  // ตัวลำแสง: เรืองแดงรอบนอก → เกลียวด้านหลัง → แกนขาว → เกลียวด้านหน้า
  if (t >= C && fadeK > 0) {
    const front = REDUCED ? 1 : 1 - Math.pow(1 - Math.min(1, (t - C) / E), 3);
    const dist = B.reach * front;
    const Bp = P(ax + dx * dist, ay + dy * dist, BEAM_Z);
    const wK = 0.3 + 0.7 * fadeK, rK = 1 + (1 - fadeK) * 0.7;
    const phase = REDUCED ? 0 : now * HELIX.spin;
    const strands = (lowQ ? [0] : [0, 1]).map((k) => helixPts(ax, ay, dx, dy, dist, phase, k, rK));
    const side = (isFront) => {
      for (const pts of strands) {
        if (!lowQ) strokeHelix(g, pts, isFront, 0.11, `rgba(${RED},${0.3 * fadeK})`);
        strokeHelix(g, pts, isFront, 0.045, `rgba(${RED},${0.95 * fadeK})`);
        if (!lowQ) strokeHelix(g, pts, isFront, 0.016, `rgba(${RED_HI},${0.9 * fadeK})`);
      }
    };
    g.globalCompositeOperation = "source-over";
    if (!lowQ) taper(g, A, Bp, 0.6 * wK * rK, `rgba(${RED},${0.16 * fadeK})`);
    side(false);
    g.globalCompositeOperation = "lighter";
    taper(g, A, Bp, 0.17 * wK, `rgba(${WHITE_RED},${0.55 * fadeK})`);
    taper(g, A, Bp, 0.075 * wK, `rgba(255,255,255,${fadeK})`);
    g.globalCompositeOperation = "source-over";
    side(true);
    g.globalCompositeOperation = "lighter";
    glow(g, Bp[0], Bp[1], Bp[2] * 0.42 * wK, WHITE_RED, 0.8 * fadeK);
    glow(g, A[0], A[1], A[2] * 0.4 * wK, "255,255,255", 0.7 * fadeK);
  }
  g.restore();
}
// =================================================================== คลื่นดาบถล่ม (มุยมิ)
//  fx { kind: "quake", x, y (ช่องมุยมิ), dir, len, width, quake: prepareQuake(...) }
//  ทุกช่องในแนว len×width: ดาบแสงร่วงจากฟ้าปักพื้น → พื้นระเบิด (แฟลช + คลื่นกระแทก + รอยแยกลาวา + เศษหินกระเด็น + ฝุ่นไฟ)
//  ไล่จากแถวใกล้ตัว → ไกล (ทีละแถว QUAKE_T.stagger) · ใบดาบค้างปักพื้นแล้วจางไป
//  lowQ = ไม่มีเศษหิน/รอยแยก/ฝุ่น · ลดการเคลื่อนไหว = ไม่มีดาบร่วง ระเบิดทันที
export const QUAKE_T = { fall: 230, stagger: 80, after: 820 };
const GOLD = "255,214,120", GOLD_HI = "255,246,215";
// เลขสุ่มคงที่ต่อช่อง (เอฟเฟกต์ไม่กระตุกเปลี่ยนทุกเฟรม)
function hash01(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
export function prepareQuake(f, cols, rows) {
  const v = BEAM_DIRS[f && f.dir];
  if (!v || !Number.isFinite(f.x) || !Number.isFinite(f.y)) return null;
  const len = Math.max(1, Math.min(16, Math.floor(+f.len) || 4)), half = Math.floor((Math.floor(+f.width) || 3) / 2);
  const [fx, fy] = v, sx = -fy, sy = fx, fall = REDUCED ? 0 : QUAKE_T.fall;
  const tiles = [];
  for (let i = 1; i <= len; i++) {
    for (let j = -half; j <= half; j++) {
      const x = f.x + fx * i + sx * j, y = f.y + fy * i + sy * j;
      if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
      const seed = i * 7.3 + j * 3.1;
      tiles.push({ x, y, seed, at: (i - 1) * QUAKE_T.stagger + Math.abs(j) * 25 + hash01(seed) * 30, lean: (hash01(seed + 9) - 0.5) * 0.5 });
    }
  }
  if (!tiles.length) return null;
  const hits = tiles.map((t) => t.at + fall);
  return { tiles, hits, fall, dur: Math.max(...hits) + QUAKE_T.after + 40 };
}
// ลูกไฟ (วาดทับแบบปกติ — เห็นชัดบนพื้นสว่าง ไม่ขาวโพลนแบบ lighter)
function fireball(g, x, y, r, a) {
  if (r <= 0 || a <= 0) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(255,250,225,${a})`);
  gr.addColorStop(0.25, `rgba(255,196,70,${a})`);
  gr.addColorStop(0.55, `rgba(240,92,24,${0.85 * a})`);
  gr.addColorStop(1, "rgba(150,30,10,0)");
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}
function quakeFx(g, e, now, lowQ) {
  const Q = e.quake;
  if (!Q) return;
  const t = now - e.t0;
  if (t < 0 || t > Q.dur) return;
  const still = lowQ || REDUCED, A = QUAKE_T.after;
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  // ชั้นพื้น (หลุมไหม้ + รอยแยก + คลื่นกระแทก) วาดก่อนทุกช่อง แล้วค่อยวาดของที่ลอย (ดาบ/ไฟ/เศษหิน)
  Q.tiles.forEach((tl, i) => {
    const age = t - Q.hits[i];
    if (age < 0 || age > A) return;
    const q = age / A, k = 1 - q, cx = tl.x + 0.5, cy = tl.y + 0.5;
    g.globalCompositeOperation = "source-over";
    quad(g, tl.x, tl.y, 0.03); g.fillStyle = `rgba(48,18,6,${0.55 * k})`; g.fill();
    gEllipse(g, cx, cy, 0.34, 0, 24); g.fillStyle = `rgba(20,6,2,${0.5 * k})`; g.fill();
    if (!still) {
      const s0 = P(cx, cy);
      g.lineWidth = Math.max(1.5, s0[2] * 0.045);
      g.strokeStyle = `rgba(255,${120 + 80 * k},40,${k})`;
      for (let c = 0; c < 6; c++) {
        const th = (c / 6) * Math.PI * 2 + hash01(tl.seed + c) * 0.8, r = Math.min(1, age / 140) * (0.36 + hash01(tl.seed + c + 20) * 0.14);
        const m = P(cx + Math.cos(th + 0.3) * r * 0.5, cy + Math.sin(th + 0.3) * r * 0.5), o = P(cx + Math.cos(th) * r, cy + Math.sin(th) * r);
        g.beginPath(); g.moveTo(s0[0], s0[1]); g.lineTo(m[0], m[1]); g.lineTo(o[0], o[1]); g.stroke();
      }
    }
    const ring = Math.min(1, age / 380);
    if (ring < 1) {
      const sc = P(cx, cy)[2];
      g.strokeStyle = `rgba(255,170,60,${0.95 * (1 - ring)})`; g.lineWidth = Math.max(1.5, sc * 0.08 * (1 - ring));
      gEllipse(g, cx, cy, 0.2 + ring * 0.85, 0, 28); g.stroke();
    }
  });
  Q.tiles.forEach((tl, i) => {
    const age = t - Q.hits[i]; // < 0 = ดาบกำลังร่วง · ≥ 0 = หลังปักพื้น
    const cx = tl.x + 0.5, cy = tl.y + 0.5;
    if (age < 0) {
      const f = 1 + age / Math.max(1, Q.fall); // 0 → 1 ตอนร่วง
      if (f < 0) return;
      const z = 7 * (1 - f * f);
      g.globalCompositeOperation = "source-over";
      gEllipse(g, cx, cy, 0.16 + 0.24 * f, 0, 20); g.fillStyle = `rgba(30,8,0,${0.2 + 0.4 * f})`; g.fill();
      // ดาบแสง (ปลายลง) + หางไฟยาวด้านบน
      const off = tl.lean * (1 - f);
      const tip = P(cx + off, cy, z), hilt = P(cx + off * 1.4, cy, z + 1.5), trail = P(cx + off * 2.6, cy, z + 4.2);
      if (!lowQ) taper(g, hilt, trail, 0.3, "rgba(240,110,30,0.35)");
      taper(g, tip, hilt, 0.22, "rgba(235,120,30,0.95)");
      taper(g, tip, hilt, 0.12, `rgba(${GOLD},1)`);
      taper(g, tip, hilt, 0.045, `rgba(${GOLD_HI},1)`);
      return;
    }
    if (age > A) return;
    const q = age / A, k = 1 - q;
    // ใบดาบปักพื้น จางลง
    if (!REDUCED && q < 0.7) {
      const a = 1 - q / 0.7, base = P(cx, cy, -0.1), top = P(cx + tl.lean * 0.2, cy, 1.05);
      g.globalCompositeOperation = "source-over";
      taper(g, base, top, 0.18, `rgba(220,110,30,${0.85 * a})`);
      taper(g, base, top, 0.08, `rgba(${GOLD_HI},${a})`);
    }
    // ระเบิด: ลูกไฟพองแล้วยุบ + เสาไฟพุ่ง + แฟลชขาวสั้นๆ
    const [sx0, sy0, sc] = P(cx, cy, 0.35);
    if (age < 420) {
      const p = age / 420, puff = Math.sin(Math.min(1, p * 1.6) * Math.PI / 2);
      g.globalCompositeOperation = "source-over";
      fireball(g, sx0, sy0, sc * (0.35 + 0.55 * puff), 1 - p * p);
      if (!lowQ && p < 0.6) taper(g, P(cx, cy, 0), P(cx, cy, 1.4 + p * 2.2), 0.5 * (1 - p / 0.6), `rgba(255,150,50,${0.75 * (1 - p / 0.6)})`);
      if (age < 120) { g.globalCompositeOperation = "lighter"; glow(g, sx0, sy0, sc * 0.6, GOLD_HI, 1 - age / 120); }
    }
    if (still) return;
    // เศษหิน + ประกายไฟกระเด็น (โค้งพาราโบลา)
    const s = age / 1000;
    for (let d = 0; d < 8; d++) {
      const r1 = hash01(tl.seed * 3 + d), r2 = hash01(tl.seed * 5 + d + 1);
      const th = r1 * Math.PI * 2, sp = 0.9 + r2 * 1.4, vz = 3 + r2 * 3.5;
      const z = vz * s - 9 * s * s;
      if (z < -0.05) continue;
      const [px, py, ps] = P(cx + Math.cos(th) * sp * s, cy + Math.sin(th) * sp * s, z);
      g.globalCompositeOperation = "source-over";
      g.fillStyle = d % 3 === 0 ? `rgba(255,190,80,${k})` : `rgba(62,40,26,${k})`;
      g.beginPath(); g.arc(px, py, Math.max(1.5, ps * (d % 3 === 0 ? 0.035 : 0.06)), 0, Math.PI * 2); g.fill();
    }
    // ควันฝุ่นลอยขึ้น
    if (age > 120) {
      const [dx0, dy0, ds] = P(cx, cy, 0.5 + q * 1.2);
      g.globalCompositeOperation = "source-over";
      glow(g, dx0, dy0, ds * (0.35 + q * 0.55), "92,74,62", 0.45 * k);
    }
  });
  g.restore();
}
export const FX_DUR = { slash: 420, float: 1300, burst: 560, beam: BEAM_T.charge + BEAM_T.extend + BEAM_T.hold + BEAM_T.fade + 40, quake: 2200 };


// =================================================================== frame
//  st = { info, view, dpr, bake, turn, night, lowQ, units (พร้อมวาด), hl, shopPos, shopLabel?, hover, fx (กำลังเล่น) }
//   view = มุมมองที่แสดงจริง (มีซูม/เลื่อนได้)
//   bake = { scene, sceneFrom?, mix?, board?, fore, marks, view?, res? } — board = null → วาดชั้นกระดานสด (ระหว่างหมุน)
//          view/res = เฟรมปกติ + ความละเอียดที่ใช้อบ (ไม่ใส่ = เท่ากับ view/dpr)
//   turn = มุมมองตอนนี้ (หน่วย 90° ทศนิยมได้)
//  คืน boxes = กล่องคลิกของตัวละคร (พิกัดตรรกะ) เรียงหน้า→หลัง
export function drawFrame(g, st, now) {
  const { info, view, dpr, bake, night, lowQ, units, hl, shopPos, hover, fx } = st;
  setCamera(info, st.turn || 0);
  const T = themeOf(info.area), C = T.pal[night ? "night" : "day"];
  const L = () => g.setTransform(dpr * view.k, 0, 0, dpr * view.k, dpr * view.ox, dpr * view.oy);
  // ชั้นอบ → จอ: เฟรมเดียวกัน = วางตรงพิกเซล · มุมใกล้/ความละเอียดต่าง = วาดตามพิกัดตรรกะ (ขยาย/เลื่อนตามกล้อง)
  const bv = (bake && bake.view) || view, bres = (bake && bake.res) || dpr;
  const exact = bres === dpr && bv.k === view.k && bv.ox === view.ox && bv.oy === view.oy;
  const blit = (cv) => {
    if (exact) { g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(cv, 0, 0); return; }
    L(); g.drawImage(cv, bv.x0, bv.y0, cv.width / (bres * bv.k), cv.height / (bres * bv.k));
  };
  if (bake && bake.scene) {
    if (bake.sceneFrom && bake.mix < 1) {
      blit(bake.sceneFrom);
      g.globalAlpha = Math.max(0, bake.mix); blit(bake.scene); g.globalAlpha = 1;
    } else blit(bake.scene);
  }
  L();
  const f = { info, C, night, lowQ, view, marks: (bake && bake.marks) || {} };
  if (T.animBack) T.animBack(g, f, lowQ ? 0 : now);
  if (bake && bake.board) { blit(bake.board); L(); }
  else drawBoardLayer(g, info, bv, night);
  // วงเวทเคลื่อนไหว (ด่าน I)
  const pz = info.plaza;
  if (pz) {
    const pulse = 0.5 + 0.5 * Math.sin(now / 800);
    g.save(); gEllipse(g, pz.x, pz.y, 1.55 * pz.sc); g.clip();
    const [cx, cy, s] = P(pz.x, pz.y);
    const gl = g.createRadialGradient(cx, cy, 0, cx, cy, s * 1.6 * pz.sc);
    gl.addColorStop(0, night ? `rgba(150,205,255,${0.35 + 0.25 * pulse})` : `rgba(127,184,230,${0.2 + 0.18 * pulse})`); gl.addColorStop(1, "rgba(127,184,230,0)");
    g.fillStyle = gl; g.fillRect(cx - s * 2 * pz.sc, cy - s * 2 * pz.sc, s * 4 * pz.sc, s * 4 * pz.sc); g.restore();
    g.save(); g.setLineDash([6, 7]); g.lineDashOffset = -now / 60; g.strokeStyle = C.line; g.lineWidth = 1.4; gEllipse(g, pz.x, pz.y, 1.8 * pz.sc, 0, 60); g.stroke(); g.restore();
  }
  // ช่องพิเศษ/จุดฟื้นฟูขยับเบาๆ (lowQ = หยุดนิ่ง)
  const tA = lowQ ? 0 : now;
  for (const sp of info.special) animSpecial(g, sp, { night, lowQ }, tA);
  if (info.heal.length && !pz) animHeal(g, info, { night, C, area: info.area }, tA);
  drawHighlights(g, info, hl, hover, now);
  // เรียงความลึก (ตามมุมมอง): สิ่งกีดขวาง + ร้าน + ตัวละคร
  const items = [];
  const uv = units.map((u) => toView(u.rx + 0.5 + (u.ox || 0), u.ry + 0.5 + (u.oy || 0)));
  const behind = (x, y) => {
    const [vx, vy] = toView(x + 0.5, y + 0.5);
    return uv.some(([ux, uy]) => Math.abs(ux - vx) < 0.9 && uy < vy && uy >= vy - 2.2);
  };
  const octx = { area: info.area, C, night, cols: info.cols };
  for (const t of info.terrain) {
    const fade = TALL_KINDS.has(t.kind) && behind(t.x, t.y);
    const f0 = () => drawObstacle(g, t, octx, now);
    items.push({ d: depthOf(t.x + 0.5, t.y + 0.5) + 0.05, f: fade ? () => { g.save(); g.globalAlpha = 0.38; f0(); g.restore(); } : f0 });
  }
  if (shopPos && Number.isFinite(shopPos.x) && Number.isFinite(shopPos.y)) {
    const { x, y } = shopPos, fade = behind(x, y);
    items.push({ d: depthOf(x + 0.5, y + 0.5) + 0.05, f: () => { if (fade) { g.save(); g.globalAlpha = 0.45; } drawShop(g, x, y, C, now, night); if (fade) g.restore(); } });
  }
  const boxes = [];
  units.forEach((u, i) => items.push({ d: uv[i][1] + (u.isActor ? 0.001 : 0), f: () => drawUnit(g, u, now, boxes) }));
  items.sort((a, b) => a.d - b.d);
  for (const it of items) it.f();
  if (shopPos && st.shopLabel != null && st.shopLabel !== "" && Number.isFinite(shopPos.x) && Number.isFinite(shopPos.y)) {
    drawShopLabel(g, shopPos.x, shopPos.y, `🏪 ${st.shopLabel}`);
  }
  // อนุภาค (ข้ามเมื่อ lowQ)
  if (!lowQ) {
    if (pz) {
      for (let i = 0; i < 18; i++) {
        const a = i * 2.4, r = (i % 6) / 6 * 1.6 * pz.sc, ph = (now / (2000 + i * 170) + i * 0.37) % 1;
        const [sx, sy] = P(pz.x + Math.cos(a) * r, pz.y + Math.sin(a) * r, 0.2 + ph * 1.8);
        g.globalAlpha = Math.sin(ph * Math.PI) * (night ? 0.95 : 0.7);
        g.fillStyle = C.spark; g.beginPath(); g.arc(sx, sy, night ? 2.6 : 2, 0, 7); g.fill();
      }
      if (night) {
        for (let i = 0; i < 26; i++) {
          const ph = (now / (5000 + i * 300) + i * 0.21) % 1, a = i * 1.7 + now / 4000;
          const [x, y] = P(pz.x + Math.cos(a) * (2 + (i % 5) * 0.9), pz.y + Math.sin(a * 1.3) * (2 + (i % 4)), 0.4 + Math.sin(ph * 6.28) * 0.4 + 1);
          g.globalAlpha = 0.5 + 0.5 * Math.sin(now / 300 + i); g.fillStyle = "#fff3b0"; g.beginPath(); g.arc(x, y, 2.2, 0, 7); g.fill();
        }
      }
      g.globalAlpha = 1;
    }
    if (T.ambient) { g.save(); T.ambient(g, f, now); g.restore(); }
  }
  // เอฟเฟกต์ครั้งเดียว
  for (const e of fx) {
    const p = (now - e.t0) / (FX_DUR[e.kind] || 1000);
    if (e.kind === "slash") slashFx(g, e.x, e.y, p, e.rgb || "255,255,255");
    else if (e.kind === "burst") burstFx(g, e.x, e.y, p, e.rgb || "255,211,106");
    else if (e.kind === "beam") beamFx(g, e, now, lowQ);
    else if (e.kind === "quake") quakeFx(g, e, now, lowQ);
    else if (e.kind === "float") floatText(g, e.x, e.y, String(e.text == null ? "" : e.text), e.color || "#ffffff", p, e.size || 24, e.z == null ? 2.4 : e.z);
  }
  if (bake && bake.fore) blit(bake.fore);
  g.setTransform(1, 0, 0, 1, 0, 0);
  boxes.sort((a, b) => b.d - a.d);
  return boxes;
}

// สีประจำตัว → "r,g,b" (ใช้กับเอฟเฟกต์ฟัน)
export function rgbString(c) { return rgbOf(normColor(c)).join(","); }
export { normColor };
