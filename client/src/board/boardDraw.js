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
//
//  พิกัดช่อง: x = คอลัมน์ 0..cols-1 (ซ้าย→ขวา) · y = แถว 0..rows-1 (ไกล→ใกล้กล้อง ที่มุม 0) · key = "x,y"
//  map.special["x,y"] = ช่องพิเศษ (flowers forest thorns shallow whirl quicksand ice lava power) · map.flow["x,y"] = up/down/left/right (น้ำวน)
// ============================================================
import {
  F_TH, F_UI, LH, LW, P, PA, computeView, depthOf, gEllipse, hexA, hexPath, key, normColor, parseKey, project,
  quad, rgbOf, setBoardSize, setViewTurn, shadeHex, toLogical, toView, unproject, viewAxes, viewTurn,
} from "./boardGeo";
import { TALL_KINDS, animHeal, animSpecial, bakeHeal, bakeSpecial, drawObstacle, healClusters } from "./boardProps";
import { themeOf, worldRange } from "./regionThemes";

export { LW, LH, key, parseKey, project, unproject, computeView, toLogical };

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
// ช่อง → จุดกลางช่องบนจอ (ตรรกะ) — ใช้วาง DOM ทับตำแหน่งบนกระดาน
//  rotation (0..3) ไม่ใส่ = ใช้มุมที่กำลังแสดงอยู่ (รวมระหว่างหมุน)
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
// u = { id, rx, ry, ox, oy, color, img, name, hp, maxHp, armor, maxArmor, isMe, isActor, tag, alpha, reticle, hitT, hovered }
function drawUnit(g, u, now, boxes) {
  let jx = 0, jy = 0;
  const hitAge = u.hitT ? now - u.hitT : 1e9;
  if (hitAge < 300) { const k = 1 - hitAge / 300; jx = (Math.random() - 0.5) * 0.12 * k; jy = (Math.random() - 0.5) * 0.08 * k; }
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
  if (hitAge < 150) { g.save(); hexPath(g, bx, hy, hexR); g.fillStyle = `rgba(255,255,255,${0.85 * (1 - hitAge / 150)})`; g.fill(); g.restore(); }
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
function floatText(g, x, y, text, color, p, size = 24) {
  if (p <= 0 || p >= 1) return;
  const [sx, sy] = P(x + 0.5, y + 0.5, 2.4 + p * 0.7);
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
export const FX_DUR = { slash: 420, float: 1300 };


// =================================================================== frame
//  st = { info, view, dpr, bake, turn, night, lowQ, units (พร้อมวาด), hl, shopPos, hover, fx (กำลังเล่น) }
//   bake = { scene, sceneFrom?, mix?, board?, fore, marks } — board = null → วาดชั้นกระดานสด (ระหว่างหมุน)
//   turn = มุมมองตอนนี้ (หน่วย 90° ทศนิยมได้)
//  คืน boxes = กล่องคลิกของตัวละคร (พิกัดตรรกะ) เรียงหน้า→หลัง
export function drawFrame(g, st, now) {
  const { info, view, dpr, bake, night, lowQ, units, hl, shopPos, hover, fx } = st;
  setCamera(info, st.turn || 0);
  const T = themeOf(info.area), C = T.pal[night ? "night" : "day"];
  const L = () => g.setTransform(dpr * view.k, 0, 0, dpr * view.k, dpr * view.ox, dpr * view.oy);
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (bake && bake.scene) {
    if (bake.sceneFrom && bake.mix < 1) {
      g.drawImage(bake.sceneFrom, 0, 0);
      g.globalAlpha = Math.max(0, bake.mix); g.drawImage(bake.scene, 0, 0); g.globalAlpha = 1;
    } else g.drawImage(bake.scene, 0, 0);
  }
  L();
  const f = { info, C, night, lowQ, view, marks: (bake && bake.marks) || {} };
  if (T.animBack) T.animBack(g, f, lowQ ? 0 : now);
  if (bake && bake.board) { g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(bake.board, 0, 0); L(); }
  else drawBoardLayer(g, info, view, night);
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
    else if (e.kind === "float") floatText(g, e.x, e.y, String(e.text == null ? "" : e.text), e.color || "#ffffff", p, e.size || 24);
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (bake && bake.fore) g.drawImage(bake.fore, 0, 0);
  boxes.sort((a, b) => b.d - a.d);
  return boxes;
}

// สีประจำตัว → "r,g,b" (ใช้กับเอฟเฟกต์ฟัน)
export function rgbString(c) { return rgbOf(normColor(c)).join(","); }
export { normColor };
