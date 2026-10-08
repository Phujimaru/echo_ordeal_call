// ============================================================
//  ตัววาดกระดานเดินได้ (ระบบใหม่แบบ Fire Emblem — ดู GRID_PLAN.md §11)
//  พอร์ตจากต้นแบบ .claude/plans/region1-board.html (หน้าตาฉาก) + grid-prototype.html (คณิตกล้อง/เลือกช่อง)
//
//  แนวคิด
//   - วาดในพิกัด "ตรรกะ" 1280 × 720 แบบต้นแบบเสมอ แล้วย่อ/ขยายลงแคนวาสจริงด้วย view (computeView)
//     จอกว้าง/สูงกว่า 16:9 = เห็นพื้นหญ้า/ท้องฟ้า/ต้นไม้รอบนอกเพิ่ม กระดานไม่ถูกตัด
//   - ชั้นนิ่ง (พื้น ท้องฟ้า ปราสาท ช่อง วงเวท ต้นไม้นอกกระดาน ใบไม้หน้ากล้อง) อบครั้งเดียวต่อ แผนที่/ขนาด/กลางคืน
//   - ชั้นเคลื่อนไหว (ไฮไลต์ สิ่งกีดขวาง ตัวละคร ร้าน เอฟเฟกต์) วาดใหม่ทุกเฟรม เรียงตามความลึก
//   - lowQ = ข้ามอนุภาค (ประกายวงเวท หิ่งห้อย) และใบไม้หน้ากล้อง
//
//  พิกัดช่อง: x = คอลัมน์ 0..cols-1 (ซ้าย→ขวา) · y = แถว 0..rows-1 (ไกล→ใกล้กล้อง) · key = "x,y"
// ============================================================

export const LW = 1280;
export const LH = 720;

const F_UI = '"Chakra Petch","Kanit",sans-serif';
const F_TH = '"Kanit","Chakra Petch",sans-serif';

export const key = (x, y) => x + "," + y;
export const parseKey = (k) => String(k).split(",").map(Number);

// ---------- สีฉาก กลางวัน/กลางคืน (ตามต้นแบบ) ----------
const PAL = {
  day: {
    grass1: "#bfd8a8", grass2: "#9fc28a", clump: "#8fb878", plaza: "#f3f4f1", plaza2: "#e9ebe6", rim: "#d8d1bf", rim2: "#b4aa92",
    path: "#ebe7dc", line: "rgba(61,139,217,.75)", gold: "#d9a93f", tile: "rgba(28,63,110,.05)", tile2: "rgba(28,63,110,.16)",
    dots: ["#f6d36b", "#ffffff", "#eaa6c2"], c1: "#8fb878", c2: "#7aa765", c3: "#b4d69b", trunk: "#8b7355", shadow: "rgba(28,46,40,.22)",
    sky: ["#bcd8f2", "#e6f0fa"], hill: ["#cfe0ef", "#b8d1e6"], leaf: "#6f9e58", spark: "#7fb8e6", crystal: 0.35,
  },
  night: {
    grass1: "#2f4f5a", grass2: "#22394a", clump: "#1d3242", plaza: "#5d7697", plaza2: "#526b8c", rim: "#465e7e", rim2: "#33475f",
    path: "#55708f", line: "rgba(170,215,255,.85)", gold: "#f0c868", tile: "rgba(200,225,255,.06)", tile2: "rgba(200,225,255,.16)",
    dots: ["#fff3b0", "#cfe8ff", "#fff3b0"], c1: "#2c5a55", c2: "#244b48", c3: "#3d7068", trunk: "#4a3d33", shadow: "rgba(0,8,24,.45)",
    sky: ["#0b1830", "#183056"], hill: ["#22355a", "#1a2b4a"], leaf: "#13283a", spark: "#cfe8ff", crystal: 0.9,
  },
};

// สีไฮไลต์ [พื้น, ขอบ]
const OV = {
  move: ["rgba(61,139,217,.45)", "rgba(170,210,250,.85)"],
  attack: ["rgba(224,86,79,.38)", "rgba(255,160,150,.75)"],
  skill: ["rgba(139,92,246,.36)", "rgba(200,170,255,.85)"],
  aoe: ["rgba(240,180,60,.32)", "#ffd27a"],
  danger: ["rgba(206,58,122,.2)", "rgba(255,128,182,.9)"],
};

// =================================================================== projection
//  กล้องเอียง 38° แบบต้นแบบด่าน I — ขอบใกล้ของกระดานอยู่ที่ y ตรรกะ 528 (เว้นที่ล่างให้ HUD)
const PITCH = 38 * Math.PI / 180, SN = Math.sin(PITCH), CS = Math.cos(PITCH);
const CAM_D = 22, FOC = 66.25 * (CAM_D - 6 * CS), OX = 640, OY = 528 - 6 * SN * 66.25;
// จุดกึ่งกลางกระดาน — กล้องจูนไว้สำหรับ 16 × 12 (ทุกภูมิภาคใช้ขนาดนี้ — GRID_PLAN §3)
let HC = 8, HR = 6;

// โลก (x, y, สูง z) → [sx, sy, สเกล] ในพิกัดตรรกะ
export function project(x, y, z = 0) {
  const X = x - HC, Y = y - HR, depth = CAM_D - Y * CS - z * SN, s = FOC / depth;
  return [OX + X * s, OY + (Y * SN - z * CS) * s, s];
}
const P = project;
// จุดบนจอ (ตรรกะ) → จุดบนพื้น (z = 0) · เหนือเส้นขอบฟ้า = null
export function unproject(sx, sy) {
  const v = (sy - OY) / FOC, den = SN + v * CS;
  if (den <= 1e-6) return null;
  const Y = v * CAM_D / den, depth = CAM_D - Y * CS;
  if (depth <= 0.5) return null;
  const s = FOC / depth;
  return { x: (sx - OX) / s + HC, y: Y + HR };
}
// ขนาดแคนวาสจริง (CSS px) → ตัวแปลงพิกัด ตรรกะ ↔ CSS · ย่อให้เห็นเฟรม 1280×720 ครบ แล้วต่อฉากรอบนอกให้เต็มจอ
export function computeView(w, h) {
  const k = Math.min(w / LW, h / LH) || 1;
  const ox = (w - LW * k) / 2, oy = (h - LH * k) / 2;
  return { w, h, k, ox, oy, x0: -ox / k, y0: -oy / k, x1: (w - ox) / k, y1: (h - oy) / k };
}
export function toLogical(view, cx, cy) {
  return [(cx - view.ox) / view.k, (cy - view.oy) / view.k];
}
// จุดบนจอ (ตรรกะ) → ช่อง {x, y} หรือ null ถ้านอกกระดาน
export function pickTile(info, lx, ly) {
  const g = unproject(lx, ly);
  if (!g) return null;
  const x = Math.floor(g.x), y = Math.floor(g.y);
  return x >= 0 && y >= 0 && x < info.cols && y < info.rows ? { x, y } : null;
}
// ช่อง → จุดกลางช่องบนจอ (ตรรกะ) — เผื่อ Game.jsx อยากวาง DOM ทับตำแหน่งตัวละคร
export function tileCenter(x, y, z = 0) {
  const p = P(x + 0.5, y + 0.5, z);
  return [p[0], p[1]];
}

function quad(g, x, y, inset = 0) {
  const a = P(x + inset, y + inset), b = P(x + 1 - inset, y + inset), c = P(x + 1 - inset, y + 1 - inset), d = P(x + inset, y + 1 - inset);
  g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath();
}
function gEllipse(g, cx, cy, r, z = 0, n = 40) {
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = i / n * Math.PI * 2, p = P(cx + Math.cos(a) * r, cy + Math.sin(a) * r, z);
    if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
  }
  g.closePath();
}
function hexPath(g, cx, cy, r, ry) {
  ry = ry || r * 0.866; g.beginPath();
  g.moveTo(cx - r, cy); g.lineTo(cx - r / 2, cy - ry); g.lineTo(cx + r / 2, cy - ry); g.lineTo(cx + r, cy); g.lineTo(cx + r / 2, cy + ry); g.lineTo(cx - r / 2, cy + ry); g.closePath();
}
function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }

// ---------- สี ----------
function normColor(c) {
  if (typeof c !== "string") return "#3d8bd9";
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  if (/^#[0-9a-f]{3}$/i.test(c)) return "#" + c.slice(1).split("").map((h) => h + h).join("");
  return "#3d8bd9";
}
function rgbOf(h) { return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); }
function shadeHex(h, k) { return `rgb(${rgbOf(h).map((v) => Math.max(0, Math.min(255, v + v * k)) | 0)})`; }
function hexA(h, a) { return `rgba(${rgbOf(h)},${a})`; }

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
  return JSON.stringify([map.area, map.cols, map.rows, map.terrain || {}, ptList(map.heal), ptList(map.spawns)]);
}
// แปลง map (รูปแบบ state.board) เป็นข้อมูลพร้อมวาด
export function prepareMap(map) {
  const cols = (map && map.cols) || 16, rows = (map && map.rows) || 12;
  HC = cols / 2; HR = rows / 2;
  const terrain = [];
  for (const [k, kind] of Object.entries((map && map.terrain) || {})) {
    const [x, y] = parseKey(k);
    if (Number.isFinite(x) && Number.isFinite(y)) terrain.push({ x, y, kind: String(kind) });
  }
  const heal = ptList(map && map.heal);
  let plaza = null;
  if (heal.length) {
    const cx = heal.reduce((s, p) => s + p.x, 0) / heal.length + 0.5;
    const cy = heal.reduce((s, p) => s + p.y, 0) / heal.length + 0.5;
    const sc = Math.sqrt(heal.length / 4);
    plaza = { x: cx, y: cy, r1: 3.45 * sc, r2: 2.25 * sc, sc };
  }
  return { cols, rows, area: (map && map.area) || 1, terrain, heal, plaza, spawns: ptList(map && map.spawns) };
}

// =================================================================== baked layers
//  คืน { ground, fore } เป็นแคนวาสขนาดพิกเซลจริง (w*dpr × h*dpr) วาดทับได้ตรงๆ ด้วย drawImage(…, 0, 0)
export function bakeLayers(info, view, dpr, night, lowQ) {
  const C = PAL[night ? "night" : "day"], R = rng(21);
  const pw = Math.max(1, Math.round(view.w * dpr)), ph = Math.max(1, Math.round(view.h * dpr));
  const cv = document.createElement("canvas"); cv.width = pw; cv.height = ph;
  const g = cv.getContext("2d");
  g.setTransform(dpr * view.k, 0, 0, dpr * view.k, dpr * view.ox, dpr * view.oy);
  const { x0: VX0, y0: VY0, x1: VX1, y1: VY1 } = view, VW = VX1 - VX0;
  const COLS = info.cols, ROWS = info.rows;

  // --- พื้นทั้งจอ
  let gr = g.createRadialGradient(640, 360, 120, 640, 360, Math.max(820, VW * 0.65));
  gr.addColorStop(0, C.grass1); gr.addColorStop(1, C.grass2);
  g.fillStyle = gr; g.fillRect(VX0, VY0, VW, VY1 - VY0);
  // --- ฟ้า + เนิน + ปราสาท (ฉากหลังขอบไกล)
  const backY = P(0, 0)[1];
  gr = g.createLinearGradient(0, VY0, 0, backY);
  gr.addColorStop(0, C.sky[0]); gr.addColorStop(1, C.sky[1]);
  g.fillStyle = gr; g.fillRect(VX0, VY0, VW, backY - 18 - VY0);
  if (night) {
    const nStars = Math.round(60 * VW / LW * Math.max(1, (backY - VY0) / backY));
    for (let i = 0; i < nStars; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + R() * 0.6})`; g.fillRect(VX0 + R() * VW, VY0 + R() * (backY - 40 - VY0), 1.4, 1.4); }
  }
  [[C.hill[0], backY - 46, 22, 0.004], [C.hill[1], backY - 30, 16, 0.009]].forEach(([c, base, amp, f], i) => {
    g.fillStyle = c; g.beginPath(); g.moveTo(VX0, backY);
    for (let x = VX0; x <= VX1 + 6; x += 6) g.lineTo(x, base - Math.abs(Math.sin(x * f + i * 2)) * amp - Math.sin(x * f * 2.7) * amp * 0.4);
    g.lineTo(VX1, backY); g.closePath(); g.fill();
  });
  gr = g.createLinearGradient(0, backY - 30, 0, backY + 8);
  gr.addColorStop(0, night ? "#1d3342" : "#a9c995"); gr.addColorStop(1, C.grass1);
  g.fillStyle = gr; g.fillRect(VX0, backY - 30, VW, 40);
  drawCastle(g, OX, backY - 14, night);
  // แนวต้นไม้หลังกระดาน (เว้นตรงปราสาท)
  const rt = rng(5), nBack = Math.round(26 * VW / LW);
  for (let i = 0; i < nBack; i++) {
    const x = VX0 + (i / Math.max(1, nBack - 1)) * VW + (rt() - 0.5) * 30;
    const sz = 26 + rt() * 14, yy = backY - 10 + rt() * 10;
    if (Math.abs(x - OX) < 300) continue;
    drawTree(g, x, yy, sz, C);
  }
  // --- ลายหญ้า (กอหญ้า + จุดดอกไม้) ครอบคลุมพื้นที่ที่มองเห็น
  const bl = unproject(VX0, VY1) || { x: -4, y: 14 }, br = unproject(VX1, VY1) || { x: 20, y: 14 };
  const wx0 = Math.min(-4, bl.x - 1), wx1 = Math.max(COLS + 4, br.x + 1), wy1 = Math.max(ROWS + 2, bl.y + 1);
  const area = (wx1 - wx0) * (wy1 + 1);
  const nClump = Math.min(900, Math.round(area * 0.68)), nDots = Math.min(2600, Math.round(area * 1.9));
  g.globalAlpha = 0.35; g.fillStyle = C.clump;
  for (let i = 0; i < nClump; i++) {
    const x = wx0 + R() * (wx1 - wx0), y = -1 + R() * (wy1 + 1), r = 0.25 + R() * 0.5;
    gEllipse(g, x, y, r, 0, 16); g.fill();
  }
  g.globalAlpha = night ? 0.75 : 0.9;
  for (let i = 0; i < nDots; i++) {
    const x = wx0 + R() * (wx1 - wx0), y = -0.5 + R() * (wy1 + 0.5), [sx, sy, s] = P(x, y), rr = R();
    if (sy < backY || sx < VX0 - 4 || sx > VX1 + 4) continue;
    g.fillStyle = C.dots[i % 3]; g.beginPath(); g.arc(sx, sy, Math.max(0.8, s * (0.025 + rr * 0.03)), 0, 7); g.fill();
  }
  g.globalAlpha = 1;
  // --- กระดาน: ขอบหิน + ช่องลายหมากรุก
  const c0 = P(0, 0), c1 = P(COLS, 0), c2 = P(COLS, ROWS), c3 = P(0, ROWS);
  g.fillStyle = night ? "rgba(0,0,0,.18)" : "rgba(60,80,50,.12)";
  g.beginPath(); g.moveTo(c0[0] - 8, c0[1] - 4); g.lineTo(c1[0] + 8, c1[1] - 4); g.lineTo(c2[0] + 12, c2[1] + 8); g.lineTo(c3[0] - 12, c3[1] + 8); g.closePath(); g.fill();
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    quad(g, x, y); g.fillStyle = (x + y) % 2 ? C.tile2 : C.tile; g.fill();
  }
  const pz = info.plaza;
  // ทางหินจากวงเวทไปประตูปราสาท
  if (pz) {
    const pc = Math.floor(pz.x) - 1, py1 = Math.floor(pz.y - pz.r1);
    for (let y = -2; y <= py1; y++) for (let x = pc; x <= pc + 1; x++) {
      quad(g, x, y, 0.04); g.fillStyle = C.path; g.fill(); g.strokeStyle = C.rim; g.lineWidth = 1.5; g.stroke();
    }
    drawPlazaStatic(g, pz, C, night);
  }
  // ช่องฟื้นฟู
  for (const { x, y } of info.heal) {
    quad(g, x, y, 0.06); g.strokeStyle = night ? "rgba(255,225,140,.55)" : "rgba(217,169,63,.55)"; g.lineWidth = 1.4; g.stroke();
  }
  // จุดเกิด
  for (const { x, y } of info.spawns) {
    g.strokeStyle = night ? "rgba(200,225,255,.35)" : "rgba(28,63,110,.22)"; g.lineWidth = 1.5;
    gEllipse(g, x + 0.5, y + 0.5, 0.36, 0, 24); g.stroke(); gEllipse(g, x + 0.5, y + 0.5, 0.2, 0, 24); g.stroke();
  }
  // เส้นตาราง + ขอบกระดาน
  g.strokeStyle = night ? "rgba(200,225,255,.13)" : "rgba(28,63,110,.13)"; g.lineWidth = 1;
  for (let x = 0; x <= COLS; x++) { const a = P(x, 0), b = P(x, ROWS); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  for (let y = 0; y <= ROWS; y++) { const a = P(0, y), b = P(COLS, y); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  g.strokeStyle = night ? "rgba(200,225,255,.4)" : "rgba(255,255,255,.75)"; g.lineWidth = 2;
  g.beginPath(); g.moveTo(c0[0], c0[1]); g.lineTo(c1[0], c1[1]); g.lineTo(c2[0], c2[1]); g.lineTo(c3[0], c3[1]); g.closePath(); g.stroke();
  // ต้นไม้นอกกระดานสองข้าง (เรียงไกล→ใกล้) — จอกว้างกว่า 16:9 ได้แนวต้นไม้หนาขึ้น
  const rs = rng(9), band = 2.2 + Math.max(0, (VW - LW) / 60), nSide = Math.round(16 * band / 2.2);
  const sideTrees = [];
  for (let i = 0; i < nSide; i++) {
    sideTrees.push([-1.6 - rs() * band, rs() * (ROWS + 0.5), rs()]);
    sideTrees.push([COLS + 0.6 + rs() * band, rs() * (ROWS + 0.5), rs()]);
  }
  sideTrees.sort((a, b) => a[1] - b[1]).forEach(([x, y, r]) => {
    const [sx, sy, s] = P(x, y);
    if (sx < VX0 - 80 || sx > VX1 + 80) return;
    drawTree(g, sx, sy, s * (1.1 + r * 0.5), C);
  });
  // แสงแดด / ความมืด
  gr = g.createLinearGradient(VX0, VY0, VX1, VY1);
  gr.addColorStop(0, night ? "rgba(120,160,255,.06)" : "rgba(255,250,225,.22)"); gr.addColorStop(0.45, "rgba(255,255,255,0)"); gr.addColorStop(1, night ? "rgba(0,8,24,.3)" : "rgba(10,30,60,.14)");
  g.fillStyle = gr; g.fillRect(VX0, VY0, VW, VY1 - VY0);
  if (night) { g.fillStyle = "rgba(8,18,40,.22)"; g.fillRect(VX0, VY0, VW, VY1 - VY0); }

  // --- ใบไม้หน้ากล้อง (ชั้นแยก วาดทับตัวละคร) — ต้องมี ctx.filter (เบลอ) · lowQ ข้าม
  let fore = null;
  if (!lowQ) {
    const fc = document.createElement("canvas"); fc.width = pw; fc.height = ph;
    const f = fc.getContext("2d");
    if ("filter" in f) {
      f.setTransform(dpr * view.k, 0, 0, dpr * view.k, dpr * view.ox, dpr * view.oy);
      f.filter = `blur(${Math.max(2, 9 * dpr * view.k) / (dpr * view.k)}px)`;
      for (const [cx, cy] of [[VX1 - 30, VY0 + 40], [VX1 - 90, VY0 - 10], [VX0 - 20, 300]]) {
        f.fillStyle = C.leaf; f.globalAlpha = 0.9;
        f.beginPath(); f.ellipse(cx, cy, 120, 80, 0.3, 0, 7); f.fill();
        f.beginPath(); f.ellipse(cx - 60, cy + 40, 90, 60, -0.2, 0, 7); f.fill();
        f.fillStyle = "rgba(255,255,255,.18)"; f.beginPath(); f.ellipse(cx - 30, cy - 20, 50, 26, 0.3, 0, 7); f.fill();
      }
      fore = fc;
    }
  }
  return { ground: cv, fore };
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
function drawTree(g, x, y, s, C) {
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(x, y, s * 0.42, s * 0.14, 0, 0, 7); g.fill();
  g.fillStyle = C.trunk; g.fillRect(x - s * 0.06, y - s * 0.55, s * 0.12, s * 0.55);
  const blob = (dx, dy, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, 7); g.fill(); };
  blob(-0.2, -0.75, 0.3, C.c2); blob(0.2, -0.72, 0.3, C.c2); blob(0, -0.98, 0.36, C.c1); blob(-0.08, -1.08, 0.16, C.c3);
}
function drawCastle(g, cx, base, night) {
  const wall = night ? "#c9d4e4" : "#f5f7fa", shade = night ? "#a8b6ca" : "#e2e9f1", roof = "#3d8bd9", roofS = "#2a64a8",
    win = night ? "#ffcf6e" : "#7fb8e6", gate = "#1c3f6e", gold = "#d9a93f";
  const tower = (x, w, h, coneH, pen) => {
    g.fillStyle = wall; g.fillRect(x - w / 2, base - h, w, h);
    g.fillStyle = shade; g.fillRect(x, base - h, w / 2, h);
    g.fillStyle = roof; g.beginPath(); g.moveTo(x - w / 2 - 4, base - h); g.lineTo(x, base - h - coneH); g.lineTo(x + w / 2 + 4, base - h); g.closePath(); g.fill();
    g.fillStyle = roofS; g.beginPath(); g.moveTo(x, base - h - coneH); g.lineTo(x + w / 2 + 4, base - h); g.lineTo(x, base - h); g.closePath(); g.fill();
    g.fillStyle = win; for (let k = 0; k < 2; k++) g.fillRect(x - 4, base - h + 14 + k * 22, 8, 12);
    if (pen) {
      g.strokeStyle = "#8a7a5a"; g.lineWidth = 2; g.beginPath(); g.moveTo(x, base - h - coneH); g.lineTo(x, base - h - coneH - 18); g.stroke();
      g.fillStyle = pen; g.beginPath(); g.moveTo(x, base - h - coneH - 18); g.lineTo(x + 18, base - h - coneH - 13); g.lineTo(x, base - h - coneH - 8); g.closePath(); g.fill();
    }
  };
  if (night) {
    const gl = g.createRadialGradient(cx, base - 60, 10, cx, base - 60, 260);
    gl.addColorStop(0, "rgba(255,210,120,.18)"); gl.addColorStop(1, "rgba(255,210,120,0)");
    g.fillStyle = gl; g.fillRect(cx - 280, base - 260, 560, 280);
  }
  tower(cx - 240, 46, 92, 46, "#9b4f96"); tower(cx + 240, 46, 92, 46, "#9b4f96");
  g.fillStyle = night ? "#bfcadc" : "#eef2f6"; g.fillRect(cx - 220, base - 62, 440, 62);
  for (let x = cx - 220; x < cx + 220; x += 16) g.fillRect(x, base - 70, 9, 8);
  g.fillStyle = gold; g.fillRect(cx - 220, base - 30, 440, 3);
  tower(cx - 120, 40, 108, 40); tower(cx + 120, 40, 108, 40);
  tower(cx, 70, 150, 70, gold);
  g.fillStyle = gate; g.beginPath(); g.moveTo(cx - 20, base); g.lineTo(cx - 20, base - 34); g.arc(cx, base - 34, 20, Math.PI, 0); g.lineTo(cx + 20, base); g.closePath(); g.fill();
  if (night) { g.fillStyle = "rgba(255,200,110,.35)"; g.fillRect(cx - 14, base - 30, 28, 30); }
}

// =================================================================== props (วาดทุกเฟรม เรียงความลึกกับตัวละคร)
function drawPillar(g, x, y, C, now) {
  const [bx, by, s] = P(x + 0.5, y + 0.55);
  const w = s * 0.36, h = s * 1.7;
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(bx + s * 0.1, by, s * 0.4, s * 0.13, 0, 0, 7); g.fill();
  g.fillStyle = "#cfc8b4"; g.fillRect(bx - w * 0.75, by - s * 0.14, w * 1.5, s * 0.14);
  g.fillStyle = "#f6f4ee"; g.fillRect(bx - w / 2, by - h, w, h - s * 0.12);
  g.fillStyle = "#dcd6c6"; g.fillRect(bx, by - h, w / 2, h - s * 0.12);
  g.fillStyle = "#d9a93f"; g.fillRect(bx - w / 2, by - h * 0.62, w, s * 0.05);
  g.fillStyle = "#e8e2d2"; g.fillRect(bx - w * 0.7, by - h - s * 0.08, w * 1.4, s * 0.1);
  const cy = by - h - s * 0.32 + Math.sin(now / 700 + x) * s * 0.03;
  const gl = g.createRadialGradient(bx, cy, 0, bx, cy, s * 0.55);
  gl.addColorStop(0, `rgba(160,215,255,${C.crystal})`); gl.addColorStop(1, "rgba(160,215,255,0)");
  g.fillStyle = gl; g.fillRect(bx - s * 0.6, cy - s * 0.6, s * 1.2, s * 1.2);
  g.fillStyle = "#bfe1fa"; g.beginPath(); g.moveTo(bx, cy - s * 0.2); g.lineTo(bx + s * 0.11, cy); g.lineTo(bx, cy + s * 0.2); g.lineTo(bx - s * 0.11, cy); g.closePath(); g.fill();
  g.fillStyle = "#7fb8e6"; g.beginPath(); g.moveTo(bx, cy - s * 0.2); g.lineTo(bx + s * 0.11, cy); g.lineTo(bx, cy + s * 0.2); g.closePath(); g.fill();
}
function drawBanner(g, x, y, color, C, now) {
  const [bx, by, s] = P(x + 0.5, y + 0.5);
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(bx, by, s * 0.3, s * 0.1, 0, 0, 7); g.fill();
  g.strokeStyle = "#8a7a5a"; g.lineWidth = Math.max(2, s * 0.06); g.beginPath(); g.moveTo(bx, by); g.lineTo(bx, by - s * 2.6); g.stroke();
  g.fillStyle = "#d9a93f"; g.beginPath(); g.arc(bx, by - s * 2.62, s * 0.07, 0, 7); g.fill();
  const top = by - s * 2.45, w = s * 0.62, h = s * 1.5, sway = Math.sin(now / 900 + x) * s * 0.04;
  g.fillStyle = color; g.beginPath(); g.moveTo(bx - w / 2, top); g.lineTo(bx + w / 2, top);
  g.lineTo(bx + w / 2 + sway, top + h); g.lineTo(bx + sway, top + h - s * 0.22); g.lineTo(bx - w / 2 + sway, top + h); g.closePath(); g.fill();
  g.fillStyle = "#f0c868"; g.fillRect(bx - w / 2, top, w, s * 0.1);
  g.fillStyle = "#d9a93f"; const dy = top + h * 0.45;
  g.beginPath(); g.moveTo(bx + sway * 0.5, dy - s * 0.15); g.lineTo(bx + s * 0.1 + sway * 0.5, dy); g.lineTo(bx + sway * 0.5, dy + s * 0.15); g.lineTo(bx - s * 0.1 + sway * 0.5, dy); g.closePath(); g.fill();
}
function drawHedge(g, x, y, C) {
  const [bx, by, s] = P(x + 0.5, y + 0.55);
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(bx, by, s * 0.5, s * 0.15, 0, 0, 7); g.fill();
  const blob = (dx, dy, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(bx + dx * s, by + dy * s, r * s, 0, 7); g.fill(); };
  blob(-0.22, -0.2, 0.26, C.c2); blob(0.22, -0.2, 0.26, C.c2); blob(0, -0.32, 0.3, C.c1); blob(-0.06, -0.42, 0.13, C.c3);
  const R = rng(x * 31 + y * 7 + 1);
  for (let i = 0; i < 6; i++) { g.fillStyle = C.dots[i % 3]; g.beginPath(); g.arc(bx + (R() - 0.5) * s * 0.7, by - s * (0.15 + R() * 0.35), s * 0.035, 0, 7); g.fill(); }
}
// ชนิดสิ่งกีดขวางที่ไม่รู้จัก → ก้อนหิน (จาก grid-prototype)
function drawRock(g, x, y, night) {
  const [cx, cy, s] = P(x + 0.5, y + 0.55);
  g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.ellipse(cx, cy + s * 0.04, s * 0.48, s * 0.2, 0, 0, 7); g.fill();
  const dl = night ? -16 : 0;
  const blob = (bx, by, rx, ry, l) => {
    const rg = g.createRadialGradient(bx - rx * 0.35, by - ry * 0.45, rx * 0.1, bx, by, rx * 1.1);
    rg.addColorStop(0, `hsl(210,8%,${l + 22 + dl}%)`); rg.addColorStop(0.6, `hsl(210,9%,${l + dl}%)`); rg.addColorStop(1, `hsl(215,12%,${l - 14 + dl}%)`);
    g.fillStyle = rg; g.beginPath(); g.ellipse(bx, by, rx, ry, 0, 0, 7); g.fill();
  };
  blob(cx + s * 0.14, cy - s * 0.16, s * 0.26, s * 0.22, 44);
  blob(cx - s * 0.08, cy - s * 0.26, s * 0.34, s * 0.32, 52);
  g.fillStyle = night ? "rgba(60,100,70,.6)" : "rgba(90,140,70,.6)"; g.beginPath(); g.ellipse(cx - s * 0.14, cy - s * 0.48, s * 0.12, s * 0.04, -0.3, 0, 7); g.fill();
}
// แผงร้านค้ามายา (กินช่อง 1 ช่อง — GRID_PLAN §8.1)
function drawShop(g, x, y, C, now, night) {
  const [bx, by, s] = P(x + 0.5, y + 0.55);
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
  if (boxes) boxes.push({ id: u.id, x: u.rx, y: u.ry, d: wy, x0: bx - hexR - 4, y0: hy - hexR - 4, x1: bx + hexR + 4, y1: by + s * 0.2 });
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
//  st = { info, view, dpr, bake, night, lowQ, units (พร้อมวาด), hl, shopPos, hover, fx (กำลังเล่น) }
//  คืน boxes = กล่องคลิกของตัวละคร (พิกัดตรรกะ) เรียงหน้า→หลัง
export function drawFrame(g, st, now) {
  const { info, view, dpr, bake, night, lowQ, units, hl, shopPos, hover, fx } = st;
  const C = PAL[night ? "night" : "day"];
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (bake) g.drawImage(bake.ground, 0, 0);
  g.setTransform(dpr * view.k, 0, 0, dpr * view.k, dpr * view.ox, dpr * view.oy);
  // วงเวทเคลื่อนไหว
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
  drawHighlights(g, info, hl, hover, now);
  // เรียงความลึก: สิ่งกีดขวาง + ร้าน + ตัวละคร
  const items = [];
  const behind = (x, y) => units.some((u) => Math.abs(u.rx - x) < 0.9 && u.ry < y && u.ry >= y - 2.2);
  for (const t of info.terrain) {
    const { x, y, kind } = t;
    const fade = kind !== "hedge" && kind !== "rock" && behind(x, y);
    let f0;
    if (kind === "tree") f0 = () => { const [sx, sy, s] = P(x + 0.5, y + 0.6); drawTree(g, sx, sy, s * 1.35, C); };
    else if (kind === "pillar") f0 = () => drawPillar(g, x, y, C, now);
    else if (kind === "hedge") f0 = () => drawHedge(g, x, y, C);
    else if (kind === "banner" || kind === "bannerP" || kind === "bannerB") {
      const col = kind === "bannerP" ? "#9b4f96" : kind === "bannerB" ? "#3d8bd9" : x < info.cols / 2 ? "#9b4f96" : "#3d8bd9";
      f0 = () => drawBanner(g, x, y, col, C, now);
    } else f0 = () => drawRock(g, x, y, night);
    items.push({ d: y + 0.55, f: fade ? () => { g.save(); g.globalAlpha = 0.38; f0(); g.restore(); } : f0 });
  }
  if (shopPos && Number.isFinite(shopPos.x) && Number.isFinite(shopPos.y)) {
    const { x, y } = shopPos, fade = behind(x, y);
    items.push({ d: y + 0.55, f: () => { if (fade) { g.save(); g.globalAlpha = 0.45; } drawShop(g, x, y, C, now, night); if (fade) g.restore(); } });
  }
  const boxes = [];
  for (const u of units) items.push({ d: u.ry + (u.oy || 0) + 0.5 + (u.isActor ? 0.001 : 0), f: () => drawUnit(g, u, now, boxes) });
  items.sort((a, b) => a.d - b.d);
  for (const it of items) it.f();
  // อนุภาค (ข้ามเมื่อ lowQ)
  if (pz && !lowQ) {
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
  // เอฟเฟกต์ครั้งเดียว
  for (const f of fx) {
    const p = (now - f.t0) / (FX_DUR[f.kind] || 1000);
    if (f.kind === "slash") slashFx(g, f.x, f.y, p, f.rgb || "255,255,255");
    else if (f.kind === "float") floatText(g, f.x, f.y, String(f.text == null ? "" : f.text), f.color || "#ffffff", p, f.size || 24);
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (bake && bake.fore) g.drawImage(bake.fore, 0, 0);
  boxes.sort((a, b) => b.d - a.d);
  return boxes;
}

// สีประจำตัว → "r,g,b" (ใช้กับเอฟเฟกต์ฟัน)
export function rgbString(c) { return rgbOf(normColor(c)).join(","); }
export { normColor };
