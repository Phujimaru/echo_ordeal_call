// ============================================================
//  ข้อมูลแผนที่ + ชั้นอบ (แยกจาก boardDraw.js) — prepareMap/mapSignature · bakeScene/bakeBoard/bakeLayers
//  พื้นแบบพื้นผิว (groundTexture/drawGroundWarp/prewarmGround + แคช) · วงเวทด่าน I · ป้าย/แผงร้าน
// ============================================================
import {
  F_UI, P, PA, gEllipse, key, parseKey, quad, setBoardSize, setViewTurn, viewAxes, viewTurn, viewCenter, PV, setCustomProjection, customProjection,
  setCullView, onScreen, groundMatrix,
} from "./boardGeo";
import { drawGroundGL, groundGLHas, groundGLReady } from "./groundGL";
import { MAPS as RULE_MAPS } from "./boardRules";
import { eosFast, setEosFast } from "./fodlan/stage6";
import { bakeHeal, bakeSpecial, healClusters } from "./boardProps";
import { themeOf, worldRange } from "./regionThemes";
import { isRtArea, rtState } from "./roadtrip/theme";
import { normRot, setCamera } from "./boardCamera";

export const EOS_HEAL_AREA = 45; // สนาม Eos (boardRules EOS_AREA = FODLAN_AREA + FODLAN_STAGES)

// =================================================================== map info
export function normPt(p) {
  if (Array.isArray(p)) return { x: +p[0], y: +p[1] };
  if (typeof p === "string") { const [x, y] = parseKey(p); return { x, y }; }
  if (p && typeof p === "object") return { x: +p.x, y: +p.y };
  return null;
}
export function ptList(list) {
  if (!list) return [];
  const arr = list instanceof Set ? [...list] : Array.isArray(list) ? list : [];
  return arr.map(normPt).filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y));
}
// ลายเซ็นของแผนที่ — ใช้ตัดสินว่าต้องอบชั้นนิ่งใหม่ไหม (state จาก server เป็นอ็อบเจกต์ใหม่ทุกครั้ง)
export function mapSignature(map) {
  if (!map) return "none";
  // Road Trip: พื้น/ฟ้าขึ้นกับภูมิภาค (ชั้นกระดานอบใหม่เมื่อภูมิภาคเปลี่ยน — board/roadtrip/theme.js)
  const rt = isRtArea(map.area) ? `|${map.rtRegion || rtState().region}` : "";
  return JSON.stringify([map.area, map.cols, map.rows, map.terrain || {}, ptList(map.heal), ptList(map.spawns), map.special || {}, map.flow || {}]) + rt;
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
    cols, rows, area, terrain, terrainKind: tMap, heal, plaza, spawns: ptList(map && map.spawns), special,
    healClusters: healClusters(heal), lavaTiles: special.filter((s) => s.kind === "lava"),
    rtProps: (map && Array.isArray(map.rtProps) && map.rtProps) || null, rtRegion: (map && map.rtRegion) || null, // Road Trip (ไม่ส่ง = ใช้ผังใน roadtrip/maps.gen.js)
  };
}

// =================================================================== baked layers
// pool = ชื่อแคนวาสที่ใช้ซ้ำ (วาดสดทุกเฟรม — กล้อง RTS ระหว่างเลื่อน) · ไม่ใส่ = สร้างใหม่ (ชั้นอบเก็บแคช)
const LAYER_POOL = new Map();
function layerCanvas(view, dpr, pool = null) {
  const pw = Math.max(1, Math.round(view.w * dpr)), ph = Math.max(1, Math.round(view.h * dpr));
  let cv = pool ? LAYER_POOL.get(pool) : null;
  if (!cv) { cv = document.createElement("canvas"); if (pool) LAYER_POOL.set(pool, cv); }
  if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
  const g = cv.getContext("2d");
  if (pool) { g.setTransform(1, 0, 0, 1, 0, 0); g.filter = "none"; g.clearRect(0, 0, pw, ph); }
  g.setTransform(dpr * view.k, 0, 0, dpr * view.k, dpr * view.ox, dpr * view.oy);
  return { cv, g };
}
// ชั้นฉาก (ไม่หมุนตามกระดาน) · turn = มุมที่ใช้คำนวณกล้อง (0 = กระดานนอน 16×12 · 1 = ตั้ง 12×16)
//  คืน { scene, fore, marks } · marks = ตำแหน่งของที่ animBack ต้องใช้ (ใบพัด ไฟประภาคาร ฯลฯ)
export function bakeScene(info, view, dpr, night, lowQ, turn = 0, live = false) {
  const prev = viewTurn();
  setCamera(info, turn);
  const T = themeOf(info.area), C = T.pal[night ? "night" : "day"];
  const { cv, g } = layerCanvas(view, dpr, live ? "scene" : null); // live = วาดสดลงแคนวาสเดิมทุกเฟรม (ไม่สร้างใหม่)
  const { x0: VX0, y0: VY0, x1: VX1, y1: VY1 } = view, VW = VX1 - VX0;
  // ขอบไกลของกระดานบนจอ (ฉากหลังวางอิงเส้นนี้)
  // กล้องหมุนรอบตัวเรา (สนาม Eos — viewCenter): เส้นขอบฟ้าอยู่ระยะคงที่จากตัวเราทุกทิศ (เกินมุมไกลสุดของกระดานเสมอ)
  //  เดิมวางที่ขอบไกลของกระดาน — ระยะจากตัวเราถึงขอบต่างกันแต่ละทิศ หันแล้วเส้นขอบฟ้าขึ้นลง ดูเหมือนมุมเอียง/ซูมเปลี่ยน (ผู้ใช้แจ้ง 2026-11-10)
  const bY = viewCenter() ? PV(0, -Math.hypot(info.cols, info.rows))[1] : Math.min(P(0, 0)[1], P(info.cols, 0)[1], P(0, info.rows)[1], P(info.cols, info.rows)[1]);
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
    const { cv: fc, g: f } = layerCanvas(view, dpr, live ? "fore" : null);
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
export function drawBoardLayer(g, info, view, night, noLight = false, flat = false) {
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
  } else if (info.heal.length && info.area !== EOS_HEAL_AREA) bakeHeal(g, info, { night, C, area: info.area }); // สนาม Eos: อ่างน้ำพุวาดเองใน fodlan/stage6
  // ช่องพิเศษ
  for (const sp of info.special) if (!flat || isStaticSp(info, sp)) bakeSpecial(g, sp, { night, C, area: info.area }); // flat (ภาพพื้นผิว) = เฉพาะช่องพิเศษของผัง · ที่เกิดระหว่างเกมวาดสดทับ
  // จุดเกิด
  for (const { x, y } of isRtArea(info.area) ? [] : info.spawns) { // Road Trip: ไม่มีวงจุดเกิด (ผู้ใช้สั่ง 2026-11-15 — วงกลมโล่งๆ ดูไม่สวยในแคมป์/จุดพัก)
    g.strokeStyle = C.spawn; g.lineWidth = 1.5;
    gEllipse(g, x + 0.5, y + 0.5, 0.36, 0, 24); g.stroke(); gEllipse(g, x + 0.5, y + 0.5, 0.2, 0, 24); g.stroke();
  }
  // เส้นตาราง + ขอบกระดาน
  // ธีมวาดเส้นตารางเองได้ (T.grid — สนาม Eos: ไม่ขีดทับน้ำ/ตึก · ทรายเส้นจางกว่า)
  if (T.grid && T.grid({ g, C, night, info })) { /* วาดแล้ว */ } else {
    g.strokeStyle = C.grid; g.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) { const a = P(x, 0), b = P(x, ROWS); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    for (let y = 0; y <= ROWS; y++) { const a = P(0, y), b = P(COLS, y); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  }
  g.strokeStyle = C.border; g.lineWidth = 2;
  g.beginPath(); g.moveTo(c0[0], c0[1]); g.lineTo(c1[0], c1[1]); g.lineTo(c2[0], c2[1]); g.lineTo(c3[0], c3[1]); g.closePath(); g.stroke();
  // ลายบนพื้นกระดานของธีม (ถ้ามี)
  if (T.deco) T.deco({ g, C, night, info, R: rngSeq(41), VX0, VY0, VX1, VY1, VW, flat });
  if (!noLight) boardLight(g, info, view, night);
}
// แสงแดด / ความมืด (ทับทั้งจอ รวมฉากหลัง) — แยกออกมาให้พื้นแบบพื้นผิว (groundWarp) วาดทับหลังบิดภาพได้
function boardLight(g, info, view, night) {
  const T = themeOf(info.area), C = T.pal[night ? "night" : "day"];
  const { x0: VX0, y0: VY0, x1: VX1, y1: VY1 } = view, VW = VX1 - VX0;
  const gr = g.createLinearGradient(VX0, VY0, VX1, VY1);
  gr.addColorStop(0, C.light[0]); gr.addColorStop(0.45, "rgba(255,255,255,0)"); gr.addColorStop(1, C.light[1]);
  g.fillStyle = gr; g.fillRect(VX0, VY0, VW, VY1 - VY0);
  if (C.nightTint) { g.fillStyle = C.nightTint; g.fillRect(VX0, VY0, VW, VY1 - VY0); }
}
// ---------- พื้นกระดานแบบพื้นผิว (ลื่นตอนกล้องขยับ — วัด 2026-11-10: วาดพื้นสดทุกเฟรม ~77ms/เฟรมตอนหมุน) ----------
//  อบพื้นทั้งกระดานครั้งเดียวเป็นภาพมองตรงลงมา (ช่องละ GT_S px) → ทุกเฟรมบิดภาพลงกระดานเอียงด้วยสามเหลี่ยมย่อย (affine ต่อชิ้น ≈ perspective)
//  ของสูงบนพื้น (เนิน/ซุ้มอุโมงค์ ฯลฯ) จะแบนชั่วคราวระหว่างกล้องขยับ — หยุดแล้วชั้นคมวาดของจริงกลับมา
const GT_S = 128; // px ต่อช่องของภาพพื้น (32 ช่อง = 4096px · อบ ~30–170ms ครั้งเดียวต่อพื้น) — ใช้ทั้งตอนนิ่งและขยับ (WebGL) จึงต้องคมพอซูมใกล้
// ภาพพื้นขึ้นกับ "พื้น" เท่านั้น (ช่องพิเศษ · จุดฟื้นฟู · จุดเกิด · กลางวัน/กลางคืน) — ไม่ใช่ตำแหน่งมอน/รถ/สิ่งกีดขวาง
//  (เดิมผูกกับ info ซึ่งเปลี่ยนทุกเทิร์นเพราะมอน/รถอยู่ในชั้นแผนที่ → อบใหม่ ~100ms ทุกครั้งที่กล้องขยับครั้งแรกของเทิร์น)
// ช่องพิเศษของผังเอง (ไม่เปลี่ยนทั้งเกม) อบลงภาพ · ช่องที่เกิดระหว่างเกม (น้ำแข็ง พื้นไฟ ดอกไม้ ฯลฯ) วาดสดทับ
//  ผู้ใช้แจ้ง 2026-11-10 กระตุก: เดิมทุกช่องพิเศษใหม่ = อบภาพพื้นทั้งแผ่นใหม่ (30–170ms) · ตอนนี้ภาพขึ้นกับ ผัง + กลางวัน/กลางคืน เท่านั้น
const STATIC_SP = new Map();
function isStaticSp(info, sp) {
  let set = STATIC_SP.get(info.area);
  if (!set) { const m = RULE_MAPS[info.area]; const sp0 = (m && m.special) || {}; set = new Set(Array.isArray(sp0) ? sp0.map((t) => `${t.x},${t.y},${t.kind}`) : Object.entries(sp0).map(([k, kind]) => `${k},${kind}`)); STATIC_SP.set(info.area, set); }
  return sp.kind !== "fd_eos_chocobo" && set.has(`${sp.x},${sp.y},${sp.kind}`); // โชโกโบะเดินไปมา = วาดสด
}
// ภาพพื้นแยกตามกลางวัน/กลางคืน — อบไว้ทั้งสองตั้งแต่เริ่มเกม (prewarmGround · เพื่อนผู้ใช้โอเคกับโหลดทีเดียวตอนเริ่ม) · WebGL = อัปขึ้นการ์ดจอแล้วคืนหน่วยความจำแคนวาส
const GROUND_TEX = new Map(); // key → cv (เฉพาะตอนไม่มี WebGL / ยังไม่อัป)
function groundKey(info, night) {
  if (info.__gk == null) {
    let h = 0;
    const add = (str) => { for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; };
    for (const sp of info.special) if (isStaticSp(info, sp)) add(`${sp.x},${sp.y},${sp.kind},${sp.flow || ""};`);
    for (const t of info.heal || []) add(`h${t.x},${t.y};`);
    for (const t of info.spawns || []) add(`s${t.x},${t.y};`);
    info.__gk = `${info.area}|${info.cols}x${info.rows}|${h}`;
  }
  return `${info.__gk}|${night ? 1 : 0}`;
}
function groundTexture(info, night) {
  const key = groundKey(info, night);
  const had = GROUND_TEX.get(key);
  if (had) return had;
  const W = info.cols * GT_S, H = info.rows * GT_S;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const g = cv.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  const prev = customProjection();
  setCustomProjection({ project: (x, y) => [x * GT_S, y * GT_S, GT_S], unproject: (sx, sy) => ({ x: sx / GT_S, y: sy / GT_S }), depth: (x, y) => y });
  // flat = ของตั้งขึ้น (ไม้พื้นล่าง/กระบองเพชร) ไม่อบลงภาพ — วาดสดทับ (theme.upright) · รายละเอียดครบเสมอ (เคยอบตอนกำลังขยับ = ขาดลายเล็กทั้งเกม)
  const fast = eosFast();
  setEosFast(false);
  try { drawBoardLayer(g, info, { x0: 0, y0: 0, x1: W, y1: H, w: W, h: H, k: 1, ox: 0, oy: 0 }, night, true, true); }
  finally { setCustomProjection(prev); setEosFast(fast); }
  for (const k of GROUND_TEX.keys()) if (!k.startsWith(info.__gk)) GROUND_TEX.delete(k); // ผังอื่น/พื้นเปลี่ยน = ทิ้ง
  GROUND_TEX.set(key, cv);
  return cv;
}
// อบภาพพื้นกลางวัน + กลางคืนล่วงหน้า (เรียกครั้งเดียวตอนเริ่มเกมในสนาม Eos) — สะดุดทีเดียวตอนเริ่ม แล้วไม่ต้องอบระหว่างเล่น
export function prewarmGround(info) {
  if (!info || typeof document === "undefined") return;
  const gl = groundGLReady();
  for (const night of [false, true]) {
    const key = groundKey(info, night);
    if (gl && groundGLHas(key)) continue;
    const cv = groundTexture(info, night);
    if (gl && drawGroundGL(null, cv, key, null, info.cols, info.rows, true)) { GROUND_TEX.delete(key); cv.width = 1; cv.height = 1; }
  }
}
// บิดภาพพื้นลงกระดานที่มุมกล้องปัจจุบัน (g อยู่ในพิกัดตรรกะแล้ว — L()) · N×N ชิ้น × 2 สามเหลี่ยม · ข้ามชิ้นที่อยู่นอกจอ/หลังกล้อง
export function drawGroundWarp(g, info, view, night, cullView = view) {
  const gkey = groundKey(info, night), onGpu = groundGLReady() && groundGLHas(gkey);
  const tex = onGpu ? null : groundTexture(info, night);
  // WebGL: ทั้งแผ่นในครั้งเดียว ไม่มีรอยต่อ (ผู้ใช้แจ้ง 2026-11-10 กระพริบ) — ใช้ไม่ได้ค่อยตัดเป็นสามเหลี่ยมแบบเดิม
  const T = themeOf(info.area), up = () => {
    const C = T.pal[night ? "night" : "day"];
    setCullView(cullView);
    try {
      for (const sp of info.special) if (!isStaticSp(info, sp) && onScreen(sp.x + 0.5, sp.y + 0.5, 0.5)) bakeSpecial(g, sp, { night, C, area: info.area }); // ช่องพิเศษที่เกิดระหว่างเกม
      if (T.upright) T.upright({ g, C, night, info });
    } finally { setCullView(null); }
  };
  if (drawGroundGL(g, tex, gkey, groundMatrix(), info.cols, info.rows)) {
    if (tex && GROUND_TEX.get(gkey) === tex) { GROUND_TEX.delete(gkey); tex.width = 1; tex.height = 1; } // อัปขึ้นการ์ดจอแล้ว = คืนหน่วยความจำ
    up(); boardLight(g, info, view, night); return;
  }
  if (!tex) return;
  const cols = info.cols, rows = info.rows, N = 16, sx = cols / N, sy = rows / N;
  const pts = [];
  for (let j = 0; j <= N; j++) { const row = []; for (let i = 0; i <= N; i++) { const q = P(i * sx, j * sy, 0); row.push(q); } pts.push(row); }
  const { x0: VX0, y0: VY0, x1: VX1, y1: VY1 } = view, pad = 40;
  const ok = (q) => q && Number.isFinite(q[0]) && Number.isFinite(q[1]) && q[2] > 0;
  const tri = (p0, p1, p2, u0, v0, u1, v1, u2, v2) => {
    // texture (u, v) → screen (x, y): แก้สมการ affine จาก 3 จุด
    const du1 = u1 - u0, dv1 = v1 - v0, du2 = u2 - u0, dv2 = v2 - v0, det = du1 * dv2 - du2 * dv1;
    if (!det) return;
    const ax = p1[0] - p0[0], ay = p1[1] - p0[1], bx = p2[0] - p0[0], by = p2[1] - p0[1];
    const a = (ax * dv2 - bx * dv1) / det, b = (ay * dv2 - by * dv1) / det, c = (bx * du1 - ax * du2) / det, d = (by * du1 - ay * du2) / det;
    const e = p0[0] - a * u0 - c * v0, f = p0[1] - b * u0 - d * v0;
    // ขยายสามเหลี่ยมออกเล็กน้อย (ครึ่งพิกเซล) กันรอยต่อขาวระหว่างชิ้น
    const cx = (p0[0] + p1[0] + p2[0]) / 3, cy = (p0[1] + p1[1] + p2[1]) / 3, grow = (q) => { const dx = q[0] - cx, dy = q[1] - cy, l = Math.hypot(dx, dy) || 1; return [q[0] + dx / l * 0.7, q[1] + dy / l * 0.7]; };
    const q0 = grow(p0), q1 = grow(p1), q2 = grow(p2);
    g.save();
    g.beginPath(); g.moveTo(q0[0], q0[1]); g.lineTo(q1[0], q1[1]); g.lineTo(q2[0], q2[1]); g.closePath(); g.clip();
    g.transform(a, b, c, d, e, f);
    g.drawImage(tex, 0, 0);
    g.restore();
  };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const A = pts[j][i], B = pts[j][i + 1], Cc = pts[j + 1][i + 1], D = pts[j + 1][i];
    if (!ok(A) || !ok(B) || !ok(Cc) || !ok(D)) continue;
    const minX = Math.min(A[0], B[0], Cc[0], D[0]), maxX = Math.max(A[0], B[0], Cc[0], D[0]), minY = Math.min(A[1], B[1], Cc[1], D[1]), maxY = Math.max(A[1], B[1], Cc[1], D[1]);
    if (maxX < VX0 - pad || minX > VX1 + pad || maxY < VY0 - pad || minY > VY1 + pad) continue;
    const u0 = i * sx * GT_S, v0 = j * sy * GT_S, u1 = (i + 1) * sx * GT_S, v1 = (j + 1) * sy * GT_S;
    tri(A, B, Cc, u0, v0, u1, v0, u1, v1);
    tri(A, Cc, D, u0, v0, u1, v1, u0, v1);
  }
  up();
  boardLight(g, info, view, night);
}
// อบชั้นกระดานที่มุม rotation (0..3)
export function bakeBoard(info, view, dpr, night, rotation = 0, exact = false) {
  const prev = viewTurn();
  setCamera(info, exact ? rotation : normRot(rotation)); // exact = มุมทศนิยม (กล้อง RTS หมุนอิสระ)
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

// ป้ายร้านค้าลอยเหนือแผง ("🏪 N" = เหลือ N เทิร์น) — วาดทับของบนกระดาน จึงตามซูม/เลื่อน/หมุนเอง · (x, y) = มุมบนซ้าย · n = ขนาดร้าน (กึ่งกลาง n×n)
// ป้ายนับเทิร์นของร้าน (ผู้ใช้สั่ง 2026-11-09 — เดิมเป็นกล่องเหลืองลอยเหนือร้าน): ป้ายไม้เล็กห้อยด้วยเชือกสองเส้นใต้ตราของร้าน
//  ขอบ/หัวเชือกสีประจำร้าน · นาฬิกาทราย + ตัวเลขเทิร์นที่เหลือ · z = ระดับตราของร้าน (SHOP_TOP_Z)
const SHOP_SIGN_ACCENT = { apoth: "#2fa58c", forge: "#c8662e", cara: "#8a5cc8", capsule: "#d9a531" };
export function drawShopLabel(g, x, y, turns, w = 1, h = 1, z = 2.1, kind = "apoth", night = false) {
  const [ax, ay, s] = P(x + w / 2, y + h / 2, z);
  const k = Math.max(0.55, Math.min(1.4, s / 64));
  const accent = SHOP_SIGN_ACCENT[kind] || SHOP_SIGN_ACCENT.apoth;
  const text = String(turns);
  g.save();
  g.font = `700 ${Math.round(13 * k)}px ${F_UI}`; g.textAlign = "left"; g.textBaseline = "middle";
  const iw = 9 * k, pad = 6 * k, tw = g.measureText(text).width;
  const bw = pad + iw + 4 * k + tw + pad, bh = 18 * k, drop = 9 * k, bx = ax - bw / 2, by = ay + drop, c = 4 * k;
  // เชือกสองเส้นจากตราลงมาที่มุมบนของป้าย
  g.strokeStyle = night ? "rgba(220,200,160,.8)" : "rgba(92,64,38,.85)"; g.lineWidth = Math.max(1, 1.2 * k);
  g.beginPath(); g.moveTo(ax - bw * 0.22, ay); g.lineTo(bx + bw * 0.18, by); g.moveTo(ax + bw * 0.22, ay); g.lineTo(bx + bw * 0.82, by); g.stroke();
  // แผ่นป้ายมุมตัด (ไม้อ่อน) + ขอบสีร้าน + แถบบนสีร้าน
  g.beginPath();
  g.moveTo(bx + c, by); g.lineTo(bx + bw, by); g.lineTo(bx + bw, by + bh - c); g.lineTo(bx + bw - c, by + bh); g.lineTo(bx, by + bh); g.lineTo(bx, by + c); g.closePath();
  g.shadowColor = "rgba(0,0,0,.28)"; g.shadowBlur = 4 * k; g.shadowOffsetY = 1.5 * k;
  g.fillStyle = night ? "#3a2c1c" : "#f6ecd6"; g.fill();
  g.shadowColor = "transparent";
  g.lineWidth = Math.max(1, 1.5 * k); g.strokeStyle = accent; g.stroke();
  g.fillStyle = accent; g.fillRect(bx + c, by, bw - c, 2.5 * k);
  // หมุดเชือก
  g.fillStyle = accent;
  for (const fx of [0.18, 0.82]) { g.beginPath(); g.arc(bx + bw * fx, by + 1.2 * k, 1.6 * k, 0, Math.PI * 2); g.fill(); }
  // นาฬิกาทราย
  const hx = bx + pad, hy = by + bh / 2 + 1 * k, hh = 10 * k;
  g.fillStyle = night ? "#f0d9a8" : "#5c4026";
  g.beginPath(); g.moveTo(hx, hy - hh / 2); g.lineTo(hx + iw, hy - hh / 2); g.lineTo(hx + iw / 2, hy); g.lineTo(hx + iw, hy + hh / 2); g.lineTo(hx, hy + hh / 2); g.lineTo(hx + iw / 2, hy); g.closePath(); g.fill();
  g.fillStyle = accent; g.beginPath(); g.moveTo(hx + iw * 0.2, hy + hh / 2 - 0.5 * k); g.lineTo(hx + iw * 0.8, hy + hh / 2 - 0.5 * k); g.lineTo(hx + iw / 2, hy + hh * 0.12); g.closePath(); g.fill();
  // ตัวเลข
  g.fillStyle = night ? "#fff3d6" : "#3a2410";
  g.fillText(text, hx + iw + 4 * k, by + bh / 2 + 1 * k);
  g.restore();
}
// แผงร้านค้ามายาแบบเดิม 1 ช่อง — ยังใช้ในฉากเรียวกิ (ryougiFx ctx.drawShop)
export function drawShop(g, x, y, C, now, night) {
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
