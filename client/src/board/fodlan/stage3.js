// ============================================================
//  ภาพของด่าน III "ชายฝั่งเดอร์ดริว" (area 42 · GRID_PLAN §8.5) — สัญญาดูหัวไฟล์ ./index.js · กติกา server/fodlan/stage3.js
//   อารมณ์ตามฉาก 3D client/src/fodlan/dioramas/war.js: สมรภูมิริมหาดตอนพลบค่ำ ฟ้าส้มอมม่วง ทะเลเขียวหม่น ควันไฟ หญ้าไหม้เกรียม
//   ธีม: back = ฟ้าพลบค่ำ + ดวงอาทิตย์ตกทะเล + เสาควันไกล · base = พื้นสนามไหม้เกรียม + หาดทรายฝั่งทะเล (หมุนตามกระดาน)
//        side = กระโจม/รั้วไม้แหลม/ธงทัพ 3 สีสองข้าง · animBack = ควันลอย + ไฟไกลวูบ · ambient = ประกายไฟลอยขึ้น
//   สิ่งกีดขวาง: fd_sea (ทะเล คลื่นวิ่ง + ฟองริมหาด) · fd_barricade (รั้วซุงแหลม ต่อกันตามแนว) · fd_bonfire (กองไฟ เปลวไหว)
//               fd_catapult (เครื่องยิงหิน แขนเหวี่ยงตอนยิง · พร้อมยิง = ลูกไฟในกระบุง)
//   ช่องพิเศษ: fd_grass (หญ้าแห้ง) · fd_flag (แท่นธง — ตัวธงโบกอยู่ใน items ย้อมสีคนยึด) · fd_fire (ไฟลุก) · fd_ash (เถ้า)
//   ฉาก (fd.fx): catapult ลูกไฟโค้ง + ระเบิด · arrows ห่าธนูตก · dragonWarn/dragon แถบไฟมังกรกวาด · waveWarn/wave กำแพงคลื่นซึนามิ
//                ignite/spread ไฟติดหญ้า · takefire หยิบไฟ · flag ยึดธง
//  ต้องเบา: ของทุกเฟรมใช้สีทึบ/โปร่ง ไม่สร้าง gradient · gradient/glow อยู่แค่ในชั้นอบ (back/base/side) · lowQ = ตัดอนุภาค
// ============================================================
import { LW, OX, P, PA, PS, depthOf, faceVisible, gEllipse, gPoly, glow, quad, rng, sceneSize, viewAxes } from "../boardGeo";
import { fxActive, fxOnce, fxT } from "./index";
import { fodlanAudio } from "../../fodlan/fodlanAudio";

const TAU = Math.PI * 2;
const hash = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const TEAM_COLORS = { A: "#22d3ee", B: "#f97316", C: "#a3e635" }; // ตรงกับ screens/Game.jsx

export const kinds = ["fd_sea", "fd_barricade", "fd_bonfire", "fd_catapult", "fd_grass", "fd_flag", "fd_fire", "fd_ash"];
export const tall = ["fd_catapult"];
// ความยาวฉาก (ms) — ต้องพอดีกับ SECS ใน server/fodlan/stage3.js
export const fx = {
  catapult: 1900, arrows: 1600, dragonWarn: 3200, dragon: 2800, waveWarn: 3000, wave: 3200,
  ignite: 1000, spread: 900, takefire: 800, flag: 1300,
};

// ของล่าสุดจาก ground() — drawObstacle/animSpecial ไม่ได้รับ fd (เครื่องยิงหินเหวี่ยงแขน · คูลดาวน์)
let CUR = { fd: null, rows: 14, cols: 14, lowQ: false };

// =================================================================== palettes
const PAL = {
  day: {
    ground1: "#6b5636", ground2: "#2e2014", tile: "rgba(60,25,10,.05)", tile2: "rgba(60,25,10,.15)",
    grid: "rgba(60,28,12,.2)", border: "rgba(255,196,140,.7)", spawn: "rgba(255,214,170,.5)",
    light: ["rgba(255,160,80,.2)", "rgba(40,10,30,.24)"], nightTint: null, shadow: "rgba(30,12,6,.32)",
    sky: ["#24152a", "#6a2a3c", "#d9663a", "#f2a35c"], sun: "#ffd08a", horizon: "#a5502e", hill: ["#4a2a2c", "#3a2024"],
    sea: "#2c4b56", sea2: "#22404a", seaHi: "rgba(255,190,130,.55)", foam: "#ffe0bc", seaFar: "#5a5a62",
    field: "#6e6038", field2: "#58492a", scorch: "rgba(30,18,10,.35)", sand: "#cfa86e", sand2: "#b48d58", wetSand: "#8f7450",
    grass: "#9c8338", grass2: "#c2a552", grass3: "#6e5a26", ash: "#5c5650", ash2: "#3c3834",
    wood: "#7a5232", wood2: "#583a22", woodHi: "#a8784a", rope: "#c9b48a", stone: "#77706a", stone2: "#4f4944",
    tent: ["#b0302c", "#2f4fa8", "#c9a02c"], smoke: "rgba(46,28,24,.5)", ember: "#ffb35c", accent: "#ff8a30", leaf: "#2a1a14", foreAcc: "#5a2a1a",
    dots: ["#d8b070", "#8a6a3a", "#3a2a1a"],
  },
  night: {
    ground1: "#2c2026", ground2: "#0e0a10", tile: "rgba(255,200,170,.04)", tile2: "rgba(255,200,170,.1)",
    grid: "rgba(255,190,150,.12)", border: "rgba(255,170,110,.45)", spawn: "rgba(255,200,170,.38)",
    light: ["rgba(255,120,60,.08)", "rgba(0,0,20,.32)"], nightTint: "rgba(14,8,30,.22)", shadow: "rgba(0,0,0,.42)",
    sky: ["#04030a", "#140a1e", "#3a1a26", "#6a2a22"], sun: "#ffb070", horizon: "#3a1a1c", hill: ["#1c1018", "#140c12"],
    sea: "#13252e", sea2: "#0e1d25", seaHi: "rgba(255,150,90,.35)", foam: "#c9b8a8", seaFar: "#20202a",
    field: "#30281e", field2: "#241d16", scorch: "rgba(0,0,0,.35)", sand: "#6e5c48", sand2: "#5c4c3a", wetSand: "#3e3428",
    grass: "#5a4a26", grass2: "#76623a", grass3: "#3a2e18", ash: "#3a3634", ash2: "#262322",
    wood: "#4e3624", wood2: "#36261a", woodHi: "#6e5036", rope: "#7a6c58", stone: "#4a4542", stone2: "#2e2b29",
    tent: ["#6e2220", "#22346a", "#7c6420"], smoke: "rgba(20,14,16,.55)", ember: "#ff9a40", accent: "#ff7a20", leaf: "#140c0e", foreAcc: "#3a160e",
    dots: ["#8a6a48", "#4a3a28", "#1a120c"],
  },
};

// =================================================================== helpers
// กล่องตั้งบนพื้น (หน่วยช่อง) — แบบ schoolTheme.box
function box(g, x0, y0, x1, y1, z0, z1, col) {
  const fd = viewAxes();
  const sides = [
    [-1, 0, x0, (y0 + y1) / 2, [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]]],
    [1, 0, x1, (y0 + y1) / 2, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]],
    [0, -1, (x0 + x1) / 2, y0, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]]],
    [0, 1, (x0 + x1) / 2, y1, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]],
  ];
  for (const [nx, ny, px, py, pts] of sides) {
    if (!faceVisible(nx, ny, px, py)) continue;
    gPoly(g, pts); g.fillStyle = Math.abs(nx * fd.fx + ny * fd.fy) > 0.7 ? col.front : col.side; g.fill();
  }
  gPoly(g, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]); g.fillStyle = col.top; g.fill();
}
// ไม้ท่อนจากจุด a → b (พิกัดกระดาน + สูง) — เส้นหนาสองชั้น
function log(g, a, b, w, dark, lite) {
  const p = P(a[0], a[1], a[2]), q = P(b[0], b[1], b[2]);
  g.lineCap = "round";
  g.strokeStyle = dark; g.lineWidth = Math.max(2, p[2] * w); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke();
  g.strokeStyle = lite; g.lineWidth = Math.max(1, p[2] * w * 0.45); g.beginPath(); g.moveTo(p[0] - 0.5, p[1] - 0.5); g.lineTo(q[0] - 0.5, q[1] - 0.5); g.stroke();
  g.lineCap = "butt";
}
// เปลวไฟ (จุดจอ) สีทึบ 3 ชั้น — ไม่มี gradient
function flame(g, x, y, h, w, sway, a) {
  if (a <= 0.02 || h <= 0.8) return;
  const layer = (k, col) => {
    const hh = h * (0.45 + 0.55 * k), ww = w * k, tipX = x + sway * hh * 0.5, tipY = y - hh, midX = x + sway * hh * 0.15;
    g.fillStyle = col; g.beginPath(); g.moveTo(x - ww, y);
    g.bezierCurveTo(x - ww * 1.25, y - hh * 0.35, midX - ww * 0.6, y - hh * 0.7, tipX, tipY);
    g.bezierCurveTo(midX + ww * 0.6, y - hh * 0.65, x + ww * 1.25, y - hh * 0.3, x + ww, y);
    g.quadraticCurveTo(x, y + ww * 0.5, x - ww, y); g.fill();
  };
  const ga = g.globalAlpha;
  g.globalAlpha = ga * a * 0.85; layer(1, "#d8401a");
  g.globalAlpha = ga * a * 0.9; layer(0.66, "#ff9a2e");
  g.globalAlpha = ga * a; layer(0.33, "#fff0b8");
  g.globalAlpha = ga;
}
// ลูกธนู (จุดจอ) — ปลายอยู่ที่ (x, y) ชี้ตามมุม ang
function arrowShape(g, x, y, L, ang, a) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  g.globalAlpha = a;
  g.strokeStyle = "#2a1a10"; g.lineWidth = Math.max(1, L * 0.06); g.beginPath(); g.moveTo(x, y); g.lineTo(x - dx * L, y - dy * L); g.stroke();
  g.strokeStyle = "#e8dccb"; g.lineWidth = Math.max(1, L * 0.08);
  g.beginPath(); g.moveTo(x - dx * L * 0.85, y - dy * L * 0.85); g.lineTo(x - dx * L, y - dy * L); g.stroke();
  g.globalAlpha = 1;
}
const unitPos = (u) => ({ x: (u.rx ?? u.x) + (u.ox || 0), y: (u.ry ?? u.y) + (u.oy || 0), s: Math.max(1, u.size | 0) });
const flagColor = (f) => (f && f.holder ? (f.team && TEAM_COLORS[f.team]) || f.color || "#e0e0e0" : null);

// =================================================================== theme (อบ)
function skyFill(c, stops) {
  const { g, VX0, VY0, VW, bY } = c, gr = g.createLinearGradient(0, VY0, 0, bY);
  stops.forEach((col, i) => gr.addColorStop(i / (stops.length - 1), col));
  g.fillStyle = gr; g.fillRect(VX0, VY0, VW, bY - VY0);
}
function sideRow(c, seed, density, draw) {
  const { VX0, VX1, VW } = c, { cols: COLS, rows: ROWS } = sceneSize();
  const rs = rng(seed), band = 2.2 + Math.max(0, (VW - LW) / 60), nSide = Math.round(16 * density * band / 2.2);
  const list = [];
  for (let i = 0; i < nSide; i++) {
    list.push([-1.6 - rs() * band, rs() * (ROWS + 0.5), rs()]);
    list.push([COLS + 0.6 + rs() * band, rs() * (ROWS + 0.5), rs()]);
  }
  list.sort((a, b) => a[1] - b[1]).forEach(([x, y, r]) => {
    const [sx, sy, s] = PS(x, y);
    if (sx < VX0 - 80 || sx > VX1 + 80) return;
    draw(sx, sy, s, r, x, y);
  });
}
// กระโจมทัพ (จุดจอ) + ธงเล็กบนยอด
function tent(g, x, y, s, col, night) {
  g.fillStyle = night ? "rgba(0,0,0,.35)" : "rgba(30,12,6,.3)"; g.beginPath(); g.ellipse(x, y, s * 0.55, s * 0.13, 0, 0, TAU); g.fill();
  g.fillStyle = col; g.beginPath(); g.moveTo(x - s * 0.5, y); g.lineTo(x, y - s * 0.62); g.lineTo(x + s * 0.5, y); g.closePath(); g.fill();
  g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.moveTo(x, y - s * 0.62); g.lineTo(x + s * 0.5, y); g.lineTo(x + s * 0.12, y); g.closePath(); g.fill();
  g.fillStyle = night ? "#1a0e08" : "#2a1a10"; g.beginPath(); g.moveTo(x - s * 0.08, y); g.lineTo(x, y - s * 0.22); g.lineTo(x + s * 0.08, y); g.fill();
  g.strokeStyle = "#3a2a1a"; g.lineWidth = Math.max(1, s * 0.025); g.beginPath(); g.moveTo(x, y - s * 0.62); g.lineTo(x, y - s * 0.95); g.stroke();
  g.fillStyle = col; g.beginPath(); g.moveTo(x, y - s * 0.95); g.lineTo(x + s * 0.22, y - s * 0.88); g.lineTo(x, y - s * 0.81); g.fill();
}
// รั้วไม้แหลมเอียง (จุดจอ)
function stakeRow(g, x, y, s, n, C) {
  for (let i = 0; i < n; i++) {
    const px = x + (i - (n - 1) / 2) * s * 0.18, h = s * (0.5 + 0.1 * Math.sin(i * 2.7));
    g.strokeStyle = C.wood2; g.lineWidth = Math.max(1.5, s * 0.06); g.beginPath(); g.moveTo(px, y); g.lineTo(px - h * 0.35, y - h); g.stroke();
    g.strokeStyle = C.woodHi; g.lineWidth = Math.max(1, s * 0.025); g.beginPath(); g.moveTo(px - 1, y); g.lineTo(px - h * 0.35 - 1, y - h); g.stroke();
  }
}
// ---------- สงครามรอบกระดาน (ผู้ใช้สั่ง: ต้องมีทหารตัวเล็กๆ รบกัน ยิงธนู — ไม่อยู่บนช่องเล่น) ----------
// ทหาร (จุดจอ · s = สูง px) · face = หันขวา (1) / ซ้าย (−1) · kind 0 = ทวน · 1 = พลธนู · 2 = ดาบ+โล่ · ph = จังหวะท่า
function soldier(g, x, y, s, col, face, kind, ph, night) {
  const w = s * 0.3, lw = Math.max(1, s * 0.09), step = Math.sin(ph) * 0.25;
  g.lineCap = "round";
  g.strokeStyle = night ? "#0c0806" : "#1e140e"; g.lineWidth = lw;
  g.beginPath(); g.moveTo(x - w * 0.25 + step * w, y); g.lineTo(x, y - s * 0.36); g.lineTo(x + w * 0.25 - step * w, y); g.stroke();
  g.fillStyle = col; g.beginPath(); g.moveTo(x - w * 0.55, y - s * 0.34); g.lineTo(x + w * 0.55, y - s * 0.34); g.lineTo(x + w * 0.4, y - s * 0.74); g.lineTo(x - w * 0.4, y - s * 0.74); g.closePath(); g.fill();
  g.fillStyle = night ? "#5a5a62" : "#8a8a92"; g.beginPath(); g.arc(x, y - s * 0.85, s * 0.13, 0, TAU); g.fill();
  if (kind === 1) { // ธนูโค้ง + สายง้าง
    const bx = x + face * w * 0.7, by = y - s * 0.62, pull = 0.5 + 0.5 * Math.sin(ph), r = s * 0.3;
    g.strokeStyle = night ? "#5a3e24" : "#7a5232"; g.lineWidth = Math.max(1, lw * 0.7);
    g.beginPath(); if (face > 0) g.arc(bx, by, r, -1.1, 1.1); else g.arc(bx, by, r, Math.PI - 1.1, Math.PI + 1.1); g.stroke();
    const ex = bx + face * Math.cos(1.1) * r, ey = Math.sin(1.1) * r;
    g.strokeStyle = "rgba(230,220,200,.6)"; g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(ex, by - ey); g.lineTo(bx - face * r * 0.6 * pull, by); g.lineTo(ex, by + ey); g.stroke();
  } else if (kind === 2) { // ดาบฟัน + โล่
    const a = -0.9 + Math.sin(ph) * 1.1;
    g.strokeStyle = "#d8d4cc"; g.lineWidth = Math.max(1, lw * 0.6);
    g.beginPath(); g.moveTo(x + face * w * 0.5, y - s * 0.6); g.lineTo(x + face * (w * 0.5 + Math.cos(a) * s * 0.42), y - s * 0.6 + Math.sin(a) * s * 0.42); g.stroke();
    g.fillStyle = night ? "#3a2a1c" : "#6a4a2a"; g.beginPath(); g.arc(x - face * w * 0.15, y - s * 0.52, s * 0.17, 0, TAU); g.fill();
    g.strokeStyle = col; g.lineWidth = Math.max(1, lw * 0.6); g.stroke();
  } else { // ทวนเอียงไปข้างหน้า
    const a = -0.5 + Math.sin(ph) * 0.12;
    g.strokeStyle = night ? "#6a5a48" : "#9a8466"; g.lineWidth = Math.max(1, lw * 0.55);
    g.beginPath(); g.moveTo(x - face * w * 0.4, y - s * 0.4); g.lineTo(x + face * Math.cos(a) * s * 0.85, y - s * 0.55 + Math.sin(a) * s * 0.85); g.stroke();
  }
  g.lineCap = "butt";
}
// ธงทัพบนเสา (จุดจอ)
function warBanner(g, x, y, s, col, night) {
  g.strokeStyle = night ? "#1a120c" : "#3a2a1a"; g.lineWidth = Math.max(1, s * 0.04);
  g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - s * 1.5); g.stroke();
  g.fillStyle = col; g.fillRect(x, y - s * 1.5, s * 0.42, s * 0.3);
}
// เครื่องยิงหินไกลบนขอบฟ้า (เงาดำ) — d = ทิศยิง
function farCatapult(g, x, y, s, d, C) {
  g.fillStyle = C.hill[1];
  g.fillRect(x - s * 0.5, y - s * 0.2, s, s * 0.12);
  g.beginPath(); g.moveTo(x - s * 0.25, y - s * 0.1); g.lineTo(x, y - s * 0.55); g.lineTo(x + s * 0.25, y - s * 0.1); g.closePath(); g.fill();
  g.strokeStyle = C.hill[1]; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y - s * 0.5); g.lineTo(x - d * s * 0.6, y - s * 0.25); g.stroke();
}
// ทัพสองข้างกระดาน (พิกัดฉาก) — ข้างละ 2 ทัพหันหน้าเข้าหากัน · พลธนูแถวหลังสุด · แนวปะทะ (CLASH) ขยับใน animBack
//  ซ้าย: แดง ↔ เหลือง (ปะทะที่ x ≈ −3) · ขวา: น้ำเงิน ↔ แดง (ปะทะที่ x ≈ cols + 3)
const CLASH = [{ x: -3.0, a: 0, b: 2 }, { x: 3.0, a: 1, b: 0, right: true }];
function drawArmies(c) {
  const { g, C, night, VX0, VX1 } = c, { cols, rows } = sceneSize();
  const R = rng(512), list = [];
  const rank = (x0, x1, col, face, kind) => {
    for (let y = -0.8; y < rows + 1.2; y += 0.46) for (let x = x0; x <= x1 + 1e-6; x += 0.42) list.push([x + (R() - 0.5) * 0.18, y + (R() - 0.5) * 0.2, col, face, kind, R() * 6]);
  };
  const R0 = cols; // ฝั่งขวาเริ่มที่ขอบกระดาน
  rank(-7.2, -6.8, 0, 1, 1); rank(-6.3, -3.7, 0, 1, 0); rank(-2.3, -1.3, 2, -1, 2); rank(-1.0, -0.9, 2, -1, 1);
  rank(R0 + 0.9, R0 + 1.0, 1, 1, 1); rank(R0 + 1.3, R0 + 2.3, 1, 1, 2); rank(R0 + 3.7, R0 + 6.3, 0, -1, 0); rank(R0 + 6.8, R0 + 7.2, 0, -1, 1);
  list.sort((a, b) => a[1] - b[1]);
  for (const [x, y, col, face, kind, ph] of list) {
    const [sx, sy, s] = PS(x, y);
    if (sx < VX0 - 30 || sx > VX1 + 30) continue;
    g.fillStyle = C.shadow; g.beginPath(); g.ellipse(sx, sy, s * 0.14, s * 0.04, 0, 0, TAU); g.fill();
    soldier(g, sx, sy, s * 0.42, C.tent[col], face, kind, ph, night);
  }
  // ธงทัพเหนือแต่ละทัพ
  for (const [x, col] of [[-5, 0], [-1.7, 2], [R0 + 1.7, 1], [R0 + 5, 0]]) for (let y = 0.5; y < rows; y += 3.3) {
    const [sx, sy, s] = PS(x, y);
    if (sx > VX0 - 30 && sx < VX1 + 30) warBanner(g, sx, sy, s * 0.5, C.tent[col], night);
  }
}
// เรืองแสงกลม (แคชภาพครั้งเดียว — วาดทุกเฟรมด้วย drawImage ไม่สร้าง gradient ใหม่)
let GLOW = null;
function glowSprite() {
  if (GLOW || typeof document === "undefined") return GLOW;
  GLOW = document.createElement("canvas"); GLOW.width = GLOW.height = 128;
  const c = GLOW.getContext("2d"), gr = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,170,80,1)"); gr.addColorStop(0.4, "rgba(255,110,40,.45)"); gr.addColorStop(1, "rgba(255,80,20,0)");
  c.fillStyle = gr; c.fillRect(0, 0, 128, 128);
  return GLOW;
}
function glowAt(g, x, y, r, a) {
  const img = glowSprite();
  if (!img || a <= 0.01) return;
  const ga = g.globalAlpha; g.globalAlpha = ga * Math.min(1, a);
  g.drawImage(img, x - r, y - r, r * 2, r * 2); g.globalAlpha = ga;
}
// ทุกเฟรมหลังฉากหลัง (ใต้กระดาน): ทหารแนวปะทะฟันกัน · กองไฟข้างสนามวูบ · เครื่องยิงหินไกลยิงลูกไฟ · ไฟมังกรเรืองขอบฟ้า + เงาปีกโฉบไกล
function warBack(g, f, t) {
  const { night, lowQ, marks } = f, C = f.C, { cols, rows } = sceneSize();
  const v0 = f.view ? f.view.x0 : -1e9, v1 = f.view ? f.view.x1 : 1e9;
  // แนวปะทะ (ข้างละ 15 คู่ — lowQ = ครึ่งเดียว ท่านิ่ง)
  const step = lowQ ? 2 : 1;
  for (const cl of CLASH) {
    const x0 = cl.right ? cols + cl.x : cl.x;
    for (let i = 0; i < 15; i += step) {
      const y = -0.5 + i * ((rows + 1) / 14), ph = t / (170 + (i % 4) * 25) + i * 1.7;
      const lunge = Math.sin(ph * 0.5) * 0.12;
      const [ax, ay, s] = PS(x0 - 0.32 + lunge, y);
      const [bx, by] = PS(x0 + 0.32 + lunge, y + 0.08);
      if (Math.max(ax, bx) < v0 - 30 || Math.min(ax, bx) > v1 + 30) continue;
      soldier(g, ax, ay, s * 0.42, C.tent[cl.a], 1, 2, ph, night);
      soldier(g, bx, by, s * 0.42, C.tent[cl.b], -1, i % 3 ? 2 : 0, ph + 2.2, night);
      if (!lowQ && Math.sin(ph) > 0.93) { g.fillStyle = "#fff4d0"; g.fillRect((ax + bx) / 2 - 1.5, ay - s * 0.3, 3, 3); } // ประกายดาบกระทบ
    }
  }
  if (lowQ) return;
  // กองไฟข้างสนาม (ระหว่างทัพ)
  for (let i = 0; i < 8; i++) {
    const right = i % 2, x = right ? cols + 3 + hash(i, 21) * 0.8 : -3.4 - hash(i, 21) * 0.8, y = 1 + (i >> 1) * 3.4 + hash(i, 22);
    const [sx, sy, s] = PS(x, y);
    if (sx < v0 - 40 || sx > v1 + 40) continue;
    glowAt(g, sx, sy - s * 0.1, s * 0.6, night ? 0.55 : 0.35);
    flame(g, sx, sy, s * 0.36 * (0.85 + 0.15 * Math.sin(t / 110 + i)), s * 0.1, Math.sin(t / 300 + i) * 0.3, 0.95);
  }
  const bY = marks.bY;
  if (bY == null) return;
  // เครื่องยิงหินไกล: ยิงลูกไฟสลับกันทุก ~5 วิ
  const cats = marks.cats || [];
  for (let k = 0; k < cats.length; k++) {
    const [cx, cy, d] = cats[k], per = 5200, p = ((t + k * per / 2) % per) / per;
    if (p < 0.45) {
      const q = p / 0.45, x = cx + d * q * 260, y = cy - 20 - Math.sin(q * Math.PI) * 90;
      glowAt(g, x, y, 10, 0.9); g.fillStyle = "#ffd08a"; g.beginPath(); g.arc(x, y, 2.2, 0, TAU); g.fill();
    } else if (p < 0.62) {
      const q = (p - 0.45) / 0.17;
      glowAt(g, cx + d * 260, cy - 6, 18 + q * 30, 1 - q);
    }
  }
  // มังกร: ไฟเรืองขอบฟ้า (เตือนมังกร = แรงขึ้น) · ทุก ~13 วิ เงาปีกโฉบผ่านฟ้าไกล + ลำไฟลงขอบฟ้า
  const [dx, dy] = marks.dragon || [OX + 330, bY - 70];
  const warned = !!(CUR.fd && CUR.fd.dragon);
  glowAt(g, dx, dy + 40, warned ? 150 : 90, (warned ? 0.55 : 0.28) + 0.1 * Math.sin(t / 400));
  const per = 13000, p = (t % per) / per;
  if (p < 0.3) {
    const q = p / 0.3, wx = dx - 380 + q * 760, wy = dy - 60 - Math.sin(q * Math.PI) * 30, flap = Math.sin(t / 120) * 0.5;
    g.fillStyle = night ? "rgba(6,2,6,.85)" : "rgba(30,10,16,.7)";
    g.beginPath(); g.moveTo(wx - 8, wy); g.quadraticCurveTo(wx - 22, wy - 12 * flap - 6, wx - 34, wy - 2 + 10 * flap);
    g.quadraticCurveTo(wx - 18, wy + 2, wx, wy + 3); g.quadraticCurveTo(wx + 18, wy + 2, wx + 34, wy - 2 + 10 * flap);
    g.quadraticCurveTo(wx + 22, wy - 12 * flap - 6, wx + 8, wy); g.closePath(); g.fill();
    g.fillRect(wx - 2, wy - 2, 14, 4);
    if (q > 0.35 && q < 0.7) {
      const k = Math.sin((q - 0.35) / 0.35 * Math.PI);
      g.save(); g.globalCompositeOperation = "lighter";
      g.strokeStyle = `rgba(255,140,50,${0.7 * k})`; g.lineWidth = 6; g.beginPath(); g.moveTo(wx + 12, wy + 2); g.lineTo(wx + 40, bY - 26); g.stroke();
      g.strokeStyle = `rgba(255,236,170,${0.8 * k})`; g.lineWidth = 2; g.stroke();
      g.restore();
      glowAt(g, wx + 40, bY - 30, 60, 0.8 * k);
    }
  }
}
// ห่าธนูข้ามฟ้า (ทับตัวละคร · อยู่ใน ambient = lowQ ข้าม): ทุก ~1.8 วิ พลธนูฝั่งหนึ่งปล่อย 12 ดอกโค้งข้ามกระดานไปอีกฝั่ง (สลับฝั่ง)
function skyVolleys(g, t) {
  const { cols, rows } = sceneSize(), per = 3600, flight = 1700;
  g.lineWidth = 1.4; g.strokeStyle = "#1a100a";
  for (let v = 0; v < 2; v++) {
    const tt = t + v * per / 2, n = Math.floor(tt / per), p = tt % per;
    if (p > flight + 300) continue;
    const ltr = (n + v) % 2 === 0;
    for (let i = 0; i < 12; i++) {
      const k = (p - i * 25) / flight;
      if (k < 0 || k > 1) continue;
      const y0 = 1 + hash(n * 13 + i, v) * (rows - 2), y1 = y0 + (hash(n + i, 3) - 0.5) * 3;
      const xa = ltr ? -6.8 : cols + 6.8, xb = ltr ? cols + 4 + hash(i, n) * 2 : -4 - hash(i, n) * 2;
      const at = (q) => PS(xa + (xb - xa) * q, y0 + (y1 - y0) * q, 0.7 + Math.sin(q * Math.PI) * 7.5);
      const a = at(k), b = at(Math.max(0, k - 0.025));
      g.globalAlpha = Math.min(1, (1 - k) * 6, k * 10);
      g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(a[0], a[1]); g.stroke();
    }
  }
  g.globalAlpha = 1;
}

const THEME = {
  back(c) {
    const { g, C, night, bY, VX0, VX1, VW, VY0 } = c;
    skyFill(c, C.sky);
    if (night) {
      const R = rng(71);
      for (let i = 0, n = Math.round(60 * VW / LW); i < n; i++) { g.fillStyle = `rgba(255,230,220,${0.2 + R() * 0.5})`; g.fillRect(VX0 + R() * VW, VY0 + R() * (bY - 120 - VY0), 1.3, 1.3); }
    }
    // ดวงอาทิตย์ตกทะเล (กลางคืน = แสงไฟสนามรบเรืองขอบฟ้า)
    const sx = OX - 300, sy = bY - 40;
    glow(g, sx, sy, night ? 260 : 320, night ? "255,110,50" : "255,170,90", night ? 0.25 : 0.55);
    if (!night) { g.fillStyle = C.sun; g.beginPath(); g.arc(sx, sy, 30, Math.PI, TAU); g.fill(); }
    // ทะเลไกล + แสงสะท้อน
    const gr = g.createLinearGradient(0, bY - 42, 0, bY + 8);
    gr.addColorStop(0, C.seaFar); gr.addColorStop(1, C.sea2);
    g.fillStyle = gr; g.fillRect(VX0, bY - 42, VW, 50);
    for (let i = 0; i < 12; i++) { const y = bY - 38 + i * 4, w = 16 + i * 6; g.fillStyle = C.seaHi; g.globalAlpha = 0.8 - i * 0.055; g.fillRect(sx - w / 2 + Math.sin(i * 2.3) * 6, y, w, 1.6); }
    g.globalAlpha = 1;
    // แหลม/เนินไกลสองข้าง + เสาควันดำ
    for (const [x0, x1, h] of [[VX0 - 20, OX - 520, 46], [OX + 380, VX1 + 20, 60]]) {
      g.fillStyle = C.hill[0]; g.beginPath(); g.moveTo(x0, bY - 30);
      for (let x = x0; x <= x1; x += 8) g.lineTo(x, bY - 36 - Math.abs(Math.sin(x * 0.01)) * h * 0.6 - Math.sin(x * 0.031) * 6);
      g.lineTo(x1, bY - 30); g.closePath(); g.fill();
    }
    const R = rng(303);
    c.marks.smoke = [];
    for (let i = 0; i < 5; i++) {
      const x = VX0 + (0.12 + i * 0.19 + (R() - 0.5) * 0.06) * VW, base = bY - 34;
      c.marks.smoke.push([x, base]);
      for (let k = 0; k < 7; k++) { g.fillStyle = C.smoke; g.globalAlpha = 0.5 - k * 0.05; g.beginPath(); g.arc(x + k * 6 + Math.sin(k + i) * 5, base - k * 22, 10 + k * 5, 0, TAU); g.fill(); }
    }
    g.globalAlpha = 1;
    // แนวทัพไกล (กระโจม 3 สี) ริมขอบฟ้า
    const rt = rng(9);
    for (let i = 0, n = Math.round(18 * VW / LW); i < n; i++) {
      const x = VX0 + (i / Math.max(1, n - 1)) * VW + (rt() - 0.5) * 30;
      if (Math.abs(x - sx) < 160) continue;
      tent(g, x, bY - 28 + rt() * 4, 14 + rt() * 8, C.tent[i % 3], night);
    }
    // ทัพไกลริมขอบฟ้า (ตัวจิ๋ว 3 สี) + เครื่องยิงหินไกล 2 เครื่อง
    const rf = rng(77);
    for (let i = 0, n = Math.round(220 * VW / LW); i < n; i++) {
      const x = VX0 + rf() * VW, y = bY - 22 + rf() * 8, h = 7 + rf() * 3, col = C.tent[Math.floor(rf() * 3)], face = rf() < 0.5 ? 1 : -1, kind = rf() < 0.2 ? 1 : 0;
      if (Math.abs(x - sx) < 120) continue;
      soldier(g, x, y, h, col, face, kind, rf() * 6, night);
    }
    c.marks.cats = [[OX - 470, bY - 26, 1], [OX + 520, bY - 28, -1]];
    for (const [x, y, d] of c.marks.cats) farCatapult(g, x, y, 22, d, C);
    c.marks.dragon = [OX + 330, bY - 70];
    c.marks.bY = bY;
    c.marks.fires = [];
    for (let i = 0; i < 6; i++) c.marks.fires.push([VX0 + hash(i, 5) * VW, bY - 30 + hash(i, 6) * 6]);
  },
  ground(c) {
    const { g, C, R, night, bY, VX0, VX1, wx0, wx1, wy1 } = c;
    // หญ้าไหม้เกรียมเป็นหย่อม + รอยไหม้
    const area = (wx1 - wx0) * (wy1 + 1);
    for (let i = 0, n = Math.min(320, Math.round(area * 0.3)); i < n; i++) {
      const [sx, sy, s] = PS(wx0 + R() * (wx1 - wx0), -1 + R() * (wy1 + 1));
      if (sy < bY || sx < VX0 - 40 || sx > VX1 + 40) continue;
      g.fillStyle = i % 4 ? C.field2 : C.scorch; g.globalAlpha = 0.22;
      g.beginPath(); g.ellipse(sx, sy, s * (0.25 + R() * 0.45), s * (0.06 + R() * 0.09), 0, 0, TAU); g.fill();
    }
    g.globalAlpha = night ? 0.6 : 0.85;
    for (let i = 0, n = Math.min(1600, Math.round(area * 1.2)); i < n; i++) {
      const [sx, sy, s] = PS(wx0 + R() * (wx1 - wx0), -0.5 + R() * (wy1 + 0.5));
      if (sy < bY || sx < VX0 - 4 || sx > VX1 + 4) continue;
      const h = s * (0.04 + R() * 0.05);
      g.strokeStyle = C.dots[i % C.dots.length]; g.lineWidth = 1;
      g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + (R() - 0.5) * h, sy - h); g.stroke();
    }
    // ลูกธนูปักพื้น
    g.globalAlpha = 0.8;
    for (let i = 0, n = Math.min(160, Math.round(area * 0.12)); i < n; i++) {
      const [sx, sy, s] = PS(wx0 + R() * (wx1 - wx0), -0.5 + R() * (wy1 + 0.5));
      if (sy < bY || sx < VX0 - 4 || sx > VX1 + 4) continue;
      arrowShape(g, sx, sy, s * 0.22, -Math.PI / 2 - 0.5 + R() * 0.3, night ? 0.6 : 0.85);
    }
    g.globalAlpha = 1;
  },
  // พื้นใต้กระดาน (หมุนตามกระดาน): สนามไหม้เกรียม + หาดทรายฝั่งทะเล (y = 0) + ทะเลยื่นออกนอกขอบ
  base(c) {
    const { g, C, info } = c;
    const cols = info.cols, rows = info.rows, R = rng(4207);
    gPoly(g, [[-0.25, -1.2], [cols + 0.25, -1.2], [cols + 0.25, rows + 0.25], [-0.25, rows + 0.25]]); g.fillStyle = C.field; g.fill();
    g.globalAlpha = 0.45;
    for (let i = 0; i < 40; i++) {
      gEllipse(g, R() * cols, 3.5 + R() * (rows - 3.5), 0.3 + R() * 0.8, 0, 14, 0.2 + R() * 0.5); g.fillStyle = i % 3 ? C.field2 : C.scorch; g.fill();
    }
    g.globalAlpha = 1;
    // หาดทราย: แถว 0 → ~3.3 ขอบเป็นคลื่น
    const sand = (y0, amp, col, seed) => {
      const pts = [[-0.25, -1.2]];
      for (let x = -0.25; x <= cols + 0.25; x += 0.25) pts.push([x, y0 + Math.sin(x * 1.3 + seed) * amp + Math.sin(x * 3.1 + seed * 2) * amp * 0.4]);
      pts.push([cols + 0.25, -1.2]);
      gPoly(g, pts); g.fillStyle = col; g.fill();
    };
    sand(3.45, 0.18, C.sand2, 1);
    sand(3.3, 0.16, C.sand, 1.4);
    sand(1.6, 0.12, C.wetSand, 3);
    // ทะเลนอกขอบกระดาน (ฝั่ง y < 0)
    gPoly(g, [[-0.6, -1.4], [cols + 0.6, -1.4], [cols + 0.6, 0.02], [-0.6, 0.02]]); g.fillStyle = C.sea; g.fill();
    // กรวด/เปลือกหอยบนหาด
    for (let i = 0; i < 90; i++) {
      const p = P(R() * cols, 1 + R() * 2.4), k = R();
      g.fillStyle = k < 0.6 ? "rgba(120,90,50,.45)" : "rgba(255,240,220,.55)";
      g.beginPath(); g.ellipse(p[0], p[1], p[2] * 0.025, p[2] * 0.014, 0, 0, TAU); g.fill();
    }
  },
  // สองข้างกระดาน: ทัพ 3 สีตั้งแถวปะทะกัน (อบนิ่ง — คู่ที่ฟันกันตรงแนวปะทะขยับใน animBack) · ไกลออกไป = กระโจม/รั้วไม้แหลม
  side(c) {
    const { g, C, night } = c, cols = sceneSize().cols;
    sideRow(c, 31, 0.35, (sx, sy, s, r, x) => {
      if (x > -7.6 && x < cols + 7.6) return; // ใกล้กระดาน = ที่ของทัพ
      if (r < 0.5) tent(g, sx, sy, s * (0.9 + r), C.tent[Math.floor(r * 100) % 3], night);
      else stakeRow(g, sx, sy, s * 0.9, 5, C);
    });
    drawArmies(c);
  },
  fore(f, c) {
    const { VX0, VY0, VX1 } = c, C = c.C;
    for (const [cx, cy] of [[VX1 - 40, VY0 + 30], [VX0 - 10, 280], [VX0 + 80, VY0 - 20]]) {
      f.fillStyle = C.leaf; f.globalAlpha = 0.28;
      f.beginPath(); f.ellipse(cx, cy, 140, 80, 0.3, 0, TAU); f.fill();
      f.fillStyle = C.foreAcc; f.globalAlpha = 0.18; f.beginPath(); f.ellipse(cx - 50, cy + 30, 80, 50, -0.2, 0, TAU); f.fill();
    }
    f.globalAlpha = 1;
  },
  // ควันลอยจากเสาควันไกล + ไฟไกลวูบ
  animBack(g, f, t) {
    warBack(g, f, t);
    const sm = f.marks.smoke || [];
    for (let i = 0; i < sm.length; i++) {
      const [x, base] = sm[i];
      for (let k = 0; k < 4; k++) {
        const ph = (t / 5200 + k / 4 + i * 0.13) % 1;
        g.globalAlpha = 0.35 * Math.sin(ph * Math.PI);
        g.fillStyle = f.night ? "#140c10" : "#3a2420";
        g.beginPath(); g.arc(x + ph * 40 + Math.sin(t / 1400 + k) * 5, base - 150 - ph * 90, 22 + ph * 20, 0, TAU); g.fill();
      }
    }
    for (const [x, y] of f.marks.fires || []) {
      g.globalAlpha = 0.5 + 0.4 * Math.sin(t / 130 + x);
      g.fillStyle = "#ffa040"; g.beginPath(); g.arc(x, y, 2.2, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
  },
  // ประกายไฟลอยขึ้น + ขี้เถ้าปลิว
  ambient(g, f, t) {
    const { info, night } = f;
    skyVolleys(g, t);
    for (let i = 0; i < 34; i++) {
      const ph = (t / (2600 + (i % 7) * 320) + hash(i, 1)) % 1;
      const [x, y] = P(hash(i, 2) * (info.cols + 2) - 1 + Math.sin(t / 900 + i) * 0.3, hash(i, 3) * (info.rows + 1), ph * 2.6);
      g.globalAlpha = Math.sin(ph * Math.PI) * (night ? 0.95 : 0.7);
      g.fillStyle = i % 3 ? "#ffa04a" : "#ffe08a"; g.fillRect(x - 1, y - 1, 2.2, 2.2);
    }
    for (let i = 0; i < 16; i++) {
      const ph = (t / (7000 + i * 400) + hash(i, 7)) % 1;
      const [x, y] = P(hash(i, 8) * (info.cols + 4) - 2 + ph * 2, hash(i, 9) * info.rows, 3 - ph * 3);
      g.globalAlpha = 0.5 * Math.sin(ph * Math.PI); g.fillStyle = night ? "#8a8078" : "#4a403a"; g.fillRect(x, y, 2, 1.4);
    }
    g.globalAlpha = 1;
  },
};
THEME.pal = PAL;
export const theme = THEME;

// =================================================================== สิ่งกีดขวาง
export function drawObstacle(g, t, ctx, now) {
  const { C, night } = ctx;
  switch (t.kind) {
    case "fd_sea": drawSea(g, t, C, now); return;
    case "fd_barricade": drawBarricade(g, t, C); return;
    case "fd_bonfire": drawBonfire(g, t, C, night, now); return;
    case "fd_catapult": drawCatapult(g, t, C, night, now); return;
    default:
  }
}
// ทะเล: ช่องน้ำ + แนวคลื่นวิ่งเข้าฝั่ง + ฟองตามขอบที่ติดบก
function drawSea(g, t, C, now) {
  const { x, y } = t, conn = t.conn || {}, rows = CUR.rows, cols = CUR.cols;
  quad(g, x, y, 0, -0.02); g.fillStyle = (x + y) % 2 ? C.sea : C.sea2; g.fill();
  g.strokeStyle = C.seaHi; g.lineWidth = 1.2;
  for (let k = 0; k < 2; k++) {
    const v = (k / 2 + now / 3600 + x * 0.07) % 1;
    g.globalAlpha = Math.sin(v * Math.PI) * 0.8;
    g.beginPath();
    for (let i = 0; i <= 4; i++) { const u = i / 4, p = P(x + u, y + v + Math.sin(u * 6 + now / 700 + x) * 0.04, -0.02); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
    g.stroke();
  }
  g.globalAlpha = 1;
  // ฟองคลื่นซัดฝั่ง (ด้านที่ติดช่องบกในกระดาน)
  const surge = 0.06 + 0.05 * Math.sin(now / 600 + x * 0.8);
  g.strokeStyle = C.foam; g.lineWidth = 2;
  const edge = (a, b) => { const p = P(a[0], a[1], 0.01), q = P(b[0], b[1], 0.01); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke(); };
  g.globalAlpha = 0.75;
  if (!conn.d && y + 1 < rows) edge([x, y + 1 + surge], [x + 1, y + 1 + surge]);
  if (!conn.r && x + 1 < cols) edge([x + 1 + surge, y], [x + 1 + surge, y + 1]);
  if (!conn.l && x > 0) edge([x - surge, y], [x - surge, y + 1]);
  g.globalAlpha = 1;
}
// ที่กั้นไม้หนา: ซุงปลายแหลมเรียงแน่นตามแนว (ต่อกับช่องข้างๆ ชนิดเดียวกัน) + คานผูกเชือก
function drawBarricade(g, t, C) {
  const { x, y } = t, conn = t.conn || {};
  const vert = (conn.u || conn.d) && !(conn.l || conn.r);
  const [gx, gy, s] = PA(x, y, 0);
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(gx, gy + s * 0.05, s * 0.5, s * 0.14, 0, 0, TAU); g.fill();
  const H = 0.85, n = 5;
  const at = (u) => (vert ? [x + 0.5, y + u] : [x + u, y + 0.5]);
  const u0 = (vert ? conn.u : conn.l) ? 0 : 0.08, u1 = (vert ? conn.d : conn.r) ? 1 : 0.92;
  // คานล่างหลัง
  log(g, [...at(u0), 0.28], [...at(u1), 0.28], 0.07, C.wood2, C.wood);
  const lean = vert ? [-0.12, 0] : [0, -0.12]; // เอียงปลายแหลมไปทางทะเล
  const stakes = [];
  for (let i = 0; i < n; i++) stakes.push(u0 + (i + 0.5) / n * (u1 - u0));
  for (const u of stakes) {
    const [bx, by] = at(u), h = H * (0.86 + 0.14 * hash(x * 13 + y, u * 7));
    const a = P(bx, by, 0), b = P(bx + lean[0], by + lean[1], h), tip = P(bx + lean[0] * 1.2, by + lean[1] * 1.2, h + 0.16);
    const w = Math.max(3, a[2] * 0.13);
    g.lineCap = "butt";
    g.strokeStyle = C.wood2; g.lineWidth = w; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    g.strokeStyle = C.wood; g.lineWidth = w * 0.55; g.beginPath(); g.moveTo(a[0] - w * 0.12, a[1]); g.lineTo(b[0] - w * 0.12, b[1]); g.stroke();
    g.fillStyle = C.woodHi; g.beginPath(); g.moveTo(b[0] - w / 2, b[1]); g.lineTo(tip[0], tip[1]); g.lineTo(b[0] + w / 2, b[1]); g.closePath(); g.fill();
  }
  // คานหน้าผูกเชือก
  log(g, [...at(u0), 0.5], [...at(u1), 0.5], 0.06, C.wood2, C.woodHi);
  g.strokeStyle = C.rope; g.lineWidth = 1.4;
  for (const u of [stakes[1], stakes[3]]) { const [bx, by] = at(u), p = P(bx, by, 0.44), q = P(bx, by, 0.56); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke(); }
}
// กองไฟ: วงหิน + ฟืนไขว้ + เปลวไหว (สีทึบ) + แสงบนพื้น
function drawBonfire(g, t, C, night, now) {
  const { x, y } = t, cx = x + 0.5, cy = y + 0.5;
  g.save(); g.globalCompositeOperation = "lighter";
  gEllipse(g, cx, cy, 0.95, 0, 20); g.fillStyle = night ? "rgba(255,110,40,.16)" : "rgba(255,140,60,.1)"; g.fill();
  gEllipse(g, cx, cy, 0.6, 0, 16); g.fillStyle = night ? "rgba(255,130,50,.18)" : "rgba(255,150,70,.12)"; g.fill();
  g.restore();
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * TAU, p = P(cx + Math.cos(a) * 0.32, cy + Math.sin(a) * 0.3, 0.04);
    g.fillStyle = i % 2 ? C.stone : C.stone2; g.beginPath(); g.ellipse(p[0], p[1], p[2] * 0.07, p[2] * 0.045, 0, 0, TAU); g.fill();
  }
  log(g, [cx - 0.26, cy - 0.12, 0.05], [cx + 0.24, cy + 0.14, 0.12], 0.08, C.wood2, C.wood);
  log(g, [cx - 0.22, cy + 0.16, 0.05], [cx + 0.26, cy - 0.12, 0.12], 0.08, C.wood2, C.wood);
  const [bx, by, s] = P(cx, cy, 0.12);
  const k = 0.85 + 0.15 * Math.sin(now / 90 + x * 3) * Math.sin(now / 170 + y);
  flame(g, bx - s * 0.1, by, s * 0.55 * k, s * 0.12, Math.sin(now / 260 + x) * 0.25, 0.9);
  flame(g, bx + s * 0.1, by, s * 0.5 * (1.8 - k), s * 0.11, Math.sin(now / 230 + y) * 0.25, 0.9);
  flame(g, bx, by + 1, s * 0.75 * k, s * 0.15, Math.sin(now / 300 + x + y) * 0.2, 1);
  if (!CUR.lowQ) {
    for (let i = 0; i < 4; i++) {
      const ph = (now / 1100 + i / 4 + x * 0.3) % 1, p = P(cx + Math.sin(now / 500 + i * 2) * 0.12, cy, 0.4 + ph * 1.2);
      g.globalAlpha = 1 - ph; g.fillStyle = "#ffcf6a"; g.fillRect(p[0] - 1, p[1] - 1, 2, 2);
    }
    g.globalAlpha = 1;
  }
}
// เครื่องยิงหิน: ฐาน + ล้อ + โครงตั้ง + แขนเหวี่ยง (หันเข้ากลางกระดาน) · กำลังยิง = แขนเหวี่ยงขึ้น · พร้อมยิง = ลูกไฟในกระบุง
function drawCatapult(g, t, C, night, now) {
  const { x, y } = t, cx = x + 0.5, cy = y + 0.5, f = x < CUR.cols / 2 ? 1 : -1;
  const wood = { front: C.wood, side: C.wood2, top: C.woodHi };
  const [gx, gy, s] = P(cx, cy, 0);
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(gx, gy, s * 0.55, s * 0.16, 0, 0, TAU); g.fill();
  // ล้อ 4 ล้อ
  for (const [dx, dy] of [[-0.3, -0.32], [0.3, -0.32], [-0.3, 0.32], [0.3, 0.32]]) {
    const p = P(cx + dx, cy + dy, 0.13);
    g.fillStyle = C.wood2; g.beginPath(); g.ellipse(p[0], p[1], p[2] * 0.12, p[2] * 0.12, 0, 0, TAU); g.fill();
    g.strokeStyle = C.woodHi; g.lineWidth = 1; g.beginPath(); g.ellipse(p[0], p[1], p[2] * 0.07, p[2] * 0.07, 0, 0, TAU); g.stroke();
  }
  box(g, cx - 0.4, cy - 0.28, cx + 0.4, cy + 0.28, 0.14, 0.24, wood);
  // ตัวยิงที่กำลังเล่นอยู่ (fx catapult จากเครื่องนี้)
  const fd = CUR.fd;
  let swing = 0;
  if (fd) {
    for (const e of fxActive(fd, now)) {
      if (e.kind !== "catapult" || !e.from || e.from.x !== x || e.from.y !== y) continue;
      const p = fxT(e, now, fx.catapult);
      swing = p < 0.12 ? p / 0.12 : p < 0.4 ? 1 : Math.max(0, 1 - (p - 0.4) / 0.5);
    }
  }
  const info = fd && Array.isArray(fd.catapults) ? fd.catapults.find((c) => c.x === x && c.y === y) : null;
  const ready = !info || !(info.cd > 0);
  // โครงตั้ง A + เพลาหมุน
  const px = cx + f * 0.06, pz = 0.62;
  for (const dy of [-0.2, 0.2]) {
    log(g, [px - 0.22, cy + dy, 0.24], [px, cy + dy, pz], 0.07, C.wood2, C.wood);
    log(g, [px + 0.22, cy + dy, 0.24], [px, cy + dy, pz], 0.07, C.wood2, C.wood);
  }
  log(g, [px, cy - 0.24, pz], [px, cy + 0.24, pz], 0.06, C.wood2, C.woodHi);
  // แขน: มุมจากแนวนอนด้านหลัง (พัก = ต่ำด้านหลัง · ยิง = ตั้งเลยไปด้านหน้า)
  const ang = -0.35 + swing * 2.2, L = 0.62;
  const cup = [px - f * Math.cos(ang) * L, cy, pz + Math.sin(ang) * L], back = [px + f * Math.cos(ang) * 0.2, cy, pz - Math.sin(ang) * 0.2];
  log(g, back, cup, 0.07, C.wood2, C.woodHi);
  const cp = P(cup[0], cup[1], cup[2]);
  g.fillStyle = C.wood2; g.beginPath(); g.ellipse(cp[0], cp[1], cp[2] * 0.1, cp[2] * 0.06, 0, 0, TAU); g.fill();
  // ถ่วงน้ำหนัก
  const wp = P(back[0], back[1], back[2] - 0.08);
  g.fillStyle = C.stone2; g.fillRect(wp[0] - wp[2] * 0.08, wp[1] - wp[2] * 0.06, wp[2] * 0.16, wp[2] * 0.12);
  if (ready && swing === 0) {
    const k = 0.8 + 0.2 * Math.sin(now / 160 + x);
    g.save(); g.globalCompositeOperation = "lighter";
    g.fillStyle = night ? "rgba(255,120,40,.35)" : "rgba(255,140,60,.25)"; g.beginPath(); g.arc(cp[0], cp[1] - cp[2] * 0.06, cp[2] * 0.14, 0, TAU); g.fill();
    g.restore();
    g.fillStyle = "#ff8a2e"; g.beginPath(); g.arc(cp[0], cp[1] - cp[2] * 0.05, cp[2] * 0.07 * k, 0, TAU); g.fill();
    g.fillStyle = "#ffe08a"; g.beginPath(); g.arc(cp[0] - 1, cp[1] - cp[2] * 0.07, cp[2] * 0.035, 0, TAU); g.fill();
  }
}

// =================================================================== ช่องพิเศษ
export function bakeSpecial(g, sp, ctx) {
  const { x, y, kind } = sp, C = ctx.C || PAL[ctx.night ? "night" : "day"];
  const R = rng(x * 97 + y * 13 + 5);
  switch (kind) {
    case "fd_grass": {
      quad(g, x, y, 0.02); g.fillStyle = C.grass3; g.globalAlpha = 0.55; g.fill(); g.globalAlpha = 1;
      const pts = [];
      for (let i = 0; i < 26; i++) pts.push([x + 0.08 + R() * 0.84, y + 0.08 + R() * 0.84, R()]);
      pts.sort((a, b) => a[1] - b[1]);
      g.lineCap = "round";
      for (const [px, py, r] of pts) {
        const a = P(px, py, 0), h = 0.16 + r * 0.2;
        for (let k = -1; k <= 1; k++) {
          const b = P(px + k * 0.05 + (r - 0.5) * 0.05, py, h * (1 - Math.abs(k) * 0.25));
          g.strokeStyle = k ? C.grass : C.grass2; g.lineWidth = Math.max(1, a[2] * 0.018);
          g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(a[0] + k * 2, (a[1] + b[1]) / 2, b[0], b[1]); g.stroke();
        }
      }
      g.lineCap = "butt";
      return;
    }
    case "fd_flag": {
      gEllipse(g, x + 0.5, y + 0.5, 0.42, 0, 24); g.fillStyle = C.stone2; g.fill();
      gEllipse(g, x + 0.5, y + 0.5, 0.36, 0.02, 24); g.fillStyle = C.stone; g.fill();
      g.strokeStyle = "rgba(255,210,140,.55)"; g.lineWidth = 1.4; gEllipse(g, x + 0.5, y + 0.5, 0.28, 0.03, 24); g.stroke();
      return;
    }
    case "fd_fire": {
      quad(g, x, y, 0.01); g.fillStyle = "#1e120c"; g.fill();
      g.strokeStyle = "rgba(255,90,30,.55)"; g.lineWidth = 1.1;
      for (let i = 0; i < 5; i++) {
        let px = x + 0.15 + R() * 0.7, py = y + 0.15 + R() * 0.7;
        g.beginPath(); let p = P(px, py); g.moveTo(p[0], p[1]);
        for (let k = 0; k < 3; k++) { px += (R() - 0.5) * 0.3; py += (R() - 0.5) * 0.3; p = P(px, py); g.lineTo(p[0], p[1]); }
        g.stroke();
      }
      return;
    }
    case "fd_ash": {
      quad(g, x, y, 0.02); g.fillStyle = C.ash2; g.globalAlpha = 0.85; g.fill(); g.globalAlpha = 1;
      for (let i = 0; i < 10; i++) {
        gEllipse(g, x + 0.15 + R() * 0.7, y + 0.15 + R() * 0.7, 0.05 + R() * 0.1, 0.01, 10); g.fillStyle = i % 2 ? C.ash : "rgba(20,16,14,.6)"; g.fill();
      }
      return;
    }
    default:
  }
}
export function animSpecial(g, sp, ctx, t) {
  if (sp.kind !== "fd_fire") return;
  const { x, y } = sp, lowQ = ctx.lowQ;
  g.save(); g.globalCompositeOperation = "lighter";
  quad(g, x, y, 0.04); g.fillStyle = `rgba(255,90,30,${0.12 + 0.06 * Math.sin(t / 160 + x * 2 + y)})`; g.fill();
  g.restore();
  const n = lowQ ? 2 : 4;
  for (let i = 0; i < n; i++) {
    const px = x + 0.2 + hash(x * 7 + y, i) * 0.6, py = y + 0.2 + hash(x + y * 5, i + 3) * 0.6;
    const [bx, by, s] = P(px, py, 0);
    const k = 0.75 + 0.25 * Math.sin(t / (110 + i * 23) + i * 2 + x);
    flame(g, bx, by, s * (0.3 + (i % 3) * 0.04) * k, s * 0.08, Math.sin(t / 280 + i + y) * 0.3, 0.92);
  }
}

// =================================================================== ใต้ไฮไลต์: วงสีธงที่ยึด · รอยไหม้ลูกไฟ · พื้นลุกหลังหัวไฟมังกร
export function ground(g, fd, info, now, lowQ) {
  CUR = { fd, rows: info.rows || 14, cols: info.cols || 14, lowQ };
  const col = flagColor(fd.flag);
  if (col && fd.flag) {
    const p = 0.5 + 0.5 * Math.sin(now / 400);
    g.save(); g.globalAlpha = 0.35 + 0.25 * p; g.strokeStyle = col; g.lineWidth = 2.5;
    gEllipse(g, fd.flag.x + 0.5, fd.flag.y + 0.5, 0.46, 0.03, 28); g.stroke(); g.restore();
  }
  for (const e of fxActive(fd, now)) {
    if (e.kind === "catapult" && e.to) {
      const p = fxT(e, now, fx.catapult);
      if (p < 0.5) continue;
      const a = 1 - (p - 0.5) / 0.5;
      gEllipse(g, e.to.x + 0.5, e.to.y + 0.5, 1.3, 0.01, 28); g.fillStyle = `rgba(20,10,6,${0.45 * a})`; g.fill();
    }
    if (e.kind === "dragon") {
      const head = dragonHead(e, now, info);
      g.save(); g.globalCompositeOperation = "lighter";
      for (const t of bandTilesOf(e, info)) {
        const d = head.along(t);
        if (d < 0) continue;
        const k = Math.exp(-d / 7) * head.fade;
        quad(g, t.x, t.y, 0.02); g.fillStyle = `rgba(255,110,30,${0.35 * k})`; g.fill();
      }
      g.restore();
    }
  }
}

// =================================================================== เรียงความลึกกับตัวละคร: ธงทัพ
export function items(list, g, fd, info, units, now) {
  const f = fd.flag;
  if (!f || !Number.isFinite(f.x)) return;
  list.push({ d: depthOf(f.x + 0.5, f.y + 0.5), f: () => drawFlag(g, f, now) });
}
function drawFlag(g, f, now) {
  const cx = f.x + 0.5, cy = f.y + 0.5, H = 1.7;
  const col = flagColor(f) || "#d9d2c4";
  log(g, [cx, cy, 0.05], [cx, cy, H + 0.08], 0.05, "#2a1a10", "#6a4a2a");
  const top = P(cx, cy, H + 0.12);
  g.fillStyle = "#e0c070"; g.beginPath(); g.arc(top[0], top[1], Math.max(2, top[2] * 0.04), 0, TAU); g.fill();
  // ผ้าธงโบก (แนวแกน x ของกระดาน) — 8 ช่วง
  const N = 8, W = 0.75, Hc = 0.48, up = [], dn = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, wav = Math.sin(now / 260 - u * 5) * 0.09 * u, dz = Math.sin(now / 330 - u * 4) * 0.04 * u;
    up.push(P(cx + u * W, cy + wav, H - dz));
    dn.push(P(cx + u * W, cy + wav, H - Hc - dz - u * 0.05));
  }
  g.beginPath(); g.moveTo(up[0][0], up[0][1]);
  for (const p of up) g.lineTo(p[0], p[1]);
  for (let i = dn.length - 1; i >= 0; i--) g.lineTo(dn[i][0], dn[i][1]);
  g.closePath(); g.fillStyle = col; g.fill();
  g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 1; g.stroke();
  // ลายพับ (เงา) + ตราวงกลาง
  g.fillStyle = "rgba(0,0,0,.18)";
  for (let i = 1; i < N; i += 2) { g.beginPath(); g.moveTo(up[i][0], up[i][1]); g.lineTo(up[i + 1][0], up[i + 1][1]); g.lineTo(dn[i + 1][0], dn[i + 1][1]); g.lineTo(dn[i][0], dn[i][1]); g.closePath(); g.fill(); }
  const m = P(cx + W * 0.5, cy + Math.sin(now / 260 - 2.5) * 0.045, H - Hc / 2);
  g.strokeStyle = f.holder ? "rgba(255,255,255,.85)" : "rgba(80,60,40,.6)"; g.lineWidth = Math.max(1.2, m[2] * 0.02);
  g.beginPath(); g.arc(m[0], m[1], m[2] * 0.09, 0, TAU); g.stroke();
}

// =================================================================== ทับตัวละคร: ฉากเหตุการณ์ + ไฟที่ถือ + คลื่นตั้งเค้า
function bandTilesOf(e, info) {
  const out = [], w = e.width || 4;
  for (let i = e.from; i < e.from + w; i++) {
    if (e.axis === "row") for (let x = 0; x < info.cols; x++) out.push({ x, y: i });
    else for (let y = 0; y < info.rows; y++) out.push({ x: i, y });
  }
  return out;
}
// หัวไฟมังกรวิ่งตามแนว: ไปทางไหนสุ่มจาก seq · along(t) = ระยะที่หัวไฟผ่านช่องนั้นไปแล้ว (< 0 = ยังไม่ถึง)
function dragonHead(e, now, info) {
  const p = fxT(e, now, fx.dragon), len = e.axis === "row" ? info.cols : info.rows, rev = e.seq % 2 === 1;
  const pos = -1.5 + clamp01(p / 0.6) * (len + 3);
  const fade = p < 0.75 ? 1 : Math.max(0, 1 - (p - 0.75) / 0.25);
  const coord = (t) => (e.axis === "row" ? t.x : t.y);
  return { p, pos, fade, rev, len, along: (t) => pos - (rev ? len - 1 - coord(t) : coord(t)) };
}
const viewRect = (view) => (view ? [view.x0, view.y0, view.x1 - view.x0, view.y1 - view.y0] : [0, 0, LW, 720]);

export function air(g, fd, info, units, now, lowQ, view) {
  const audio = fodlanAudio();
  // ไฟที่ถืออยู่ (หยิบไฟ) — เปลวเล็กเหนือมือ
  const carry = new Set(fd.carry || []);
  if (carry.size) for (const u of units) {
    if (!carry.has(u.id)) continue;
    const q = unitPos(u), [bx, by, s] = P(q.x + q.s / 2 + 0.28, q.y + q.s / 2, 0.95);
    log(g, [q.x + q.s / 2 + 0.28, q.y + q.s / 2, 0.6], [q.x + q.s / 2 + 0.28, q.y + q.s / 2, 0.95], 0.04, "#2a1a10", "#6a4a2a");
    flame(g, bx, by, s * 0.32 * (0.85 + 0.15 * Math.sin(now / 90 + bx)), s * 0.08, Math.sin(now / 250) * 0.3, 1);
  }
  // คลื่นตั้งเค้า (ตลอดเทิร์นเตือน): สันคลื่นขาวยกตัวเหนือทะเล
  if (fd.wave) drawSwell(g, info, now, 0.5 + 0.5 * Math.sin(now / 500));
  for (const e of fxActive(fd, now)) {
    switch (e.kind) {
      case "catapult": {
        if (fxOnce(e)) { audio.sfx("catapult_fire"); audio.sfx("fireball_hit", { delay: 0.95 }); }
        drawFireball(g, e, now, lowQ, view);
        break;
      }
      case "arrows": {
        if (fxOnce(e)) { audio.sfx("arrow_volley"); audio.sfx("arrow_hit", { delay: 0.6 }); }
        drawArrows(g, e, now, lowQ);
        break;
      }
      case "dragonWarn": {
        if (fxOnce(e)) audio.sfx("dragon_roar");
        const p = fxT(e, now, fx.dragonWarn);
        const [x, y, w, h] = viewRect(view);
        g.save(); g.globalCompositeOperation = "lighter";
        g.fillStyle = `rgba(255,90,30,${0.1 * Math.sin(p * Math.PI)})`; g.fillRect(x, y, w, h);
        g.restore();
        break;
      }
      case "dragon": {
        if (fxOnce(e)) { audio.sfx("dragon_fire"); audio.sfx("dragon_roar", { gain: 0.6 }); }
        drawDragonFire(g, e, info, now, lowQ, view);
        break;
      }
      case "waveWarn": {
        if (fxOnce(e)) audio.sfx("wx_tsunami_warn");
        const p = fxT(e, now, fx.waveWarn);
        drawSwell(g, info, now, Math.sin(p * Math.PI) * 1.6);
        break;
      }
      case "wave": {
        if (fxOnce(e)) audio.sfx("wx_tsunami");
        drawWave(g, e, info, now, lowQ, view);
        break;
      }
      case "ignite": case "spread": {
        if (fxOnce(e)) audio.sfx("grass_fire", { gain: e.kind === "spread" ? 0.45 : 1 });
        const p = fxT(e, now, fx[e.kind]);
        for (const t of e.tiles || []) {
          const [bx, by, s] = P(t.x + 0.5, t.y + 0.5, 0);
          flame(g, bx, by, s * (0.3 + 0.7 * Math.sin(p * Math.PI)), s * 0.22, 0, 1 - p * 0.6);
        }
        break;
      }
      case "takefire": {
        const u = units.find((v) => v.id === e.id);
        if (!u || !e.at) break;
        const p = fxT(e, now, fx.takefire), q = unitPos(u);
        const a = P(e.at.x + 0.5, e.at.y + 0.5, 0.6), b = P(q.x + q.s / 2 + 0.28, q.y + q.s / 2, 0.95);
        const k = clamp01(p / 0.7), x = a[0] + (b[0] - a[0]) * k, y = a[1] + (b[1] - a[1]) * k - Math.sin(k * Math.PI) * 30;
        flame(g, x, y, a[2] * 0.3, a[2] * 0.08, 0, 1 - Math.max(0, p - 0.8) * 5);
        break;
      }
      case "flag": {
        const f = fd.flag;
        if (!f) break;
        const p = fxT(e, now, fx.flag), col = flagColor(f) || "#ffffff";
        g.save(); g.globalAlpha = 1 - p; g.strokeStyle = col; g.lineWidth = 3;
        gEllipse(g, f.x + 0.5, f.y + 0.5, 0.4 + p * 1.6, 0.05, 32); g.stroke(); g.restore();
        break;
      }
      default:
    }
  }
}

// ลูกไฟจากเครื่องยิงหิน: โค้งขึ้นฟ้า (0–0.5) → ระเบิด 3×3 (0.5–1)
function drawFireball(g, e, now, lowQ, view) {
  if (!e.from || !e.to) return;
  const p = fxT(e, now, fx.catapult), T = 0.5;
  if (p < T) {
    const k = clamp01((p - 0.06) / (T - 0.06));
    if (k <= 0) return;
    const x = e.from.x + 0.5 + (e.to.x - e.from.x) * k, y = e.from.y + 0.5 + (e.to.y - e.from.y) * k;
    const dist = Math.abs(e.to.x - e.from.x) + Math.abs(e.to.y - e.from.y);
    const z = 1 + Math.sin(k * Math.PI) * (1.5 + dist * 0.35) - k * 0.9;
    const [sx, sy, s] = P(x, y, z);
    // หางไฟ
    if (!lowQ) for (let i = 1; i <= 6; i++) {
      const kk = Math.max(0, k - i * 0.025), tx = e.from.x + 0.5 + (e.to.x - e.from.x) * kk, ty = e.from.y + 0.5 + (e.to.y - e.from.y) * kk;
      const tz = 1 + Math.sin(kk * Math.PI) * (1.5 + dist * 0.35) - kk * 0.9, q = P(tx, ty, tz);
      g.globalAlpha = 0.5 - i * 0.07; g.fillStyle = i < 3 ? "#ffb050" : "#7a3a20"; g.beginPath(); g.arc(q[0], q[1], s * (0.12 - i * 0.012), 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    g.fillStyle = "#ff7a20"; g.beginPath(); g.arc(sx, sy, s * 0.15, 0, TAU); g.fill();
    g.fillStyle = "#ffe08a"; g.beginPath(); g.arc(sx - s * 0.03, sy - s * 0.03, s * 0.08, 0, TAU); g.fill();
    return;
  }
  const k = (p - T) / (1 - T), cx = e.to.x + 0.5, cy = e.to.y + 0.5;
  if (k < 0.2) {
    const [x, y, w, h] = viewRect(view);
    g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = `rgba(255,150,60,${0.25 * (1 - k / 0.2)})`; g.fillRect(x, y, w, h); g.restore();
  }
  g.save(); g.globalCompositeOperation = "lighter";
  g.globalAlpha = 1 - k;
  gEllipse(g, cx, cy, 0.4 + k * 1.3, 0.05, 28); g.fillStyle = "rgba(255,120,40,.55)"; g.fill();
  gEllipse(g, cx, cy, 0.2 + k * 0.8, 0.08, 24); g.fillStyle = "rgba(255,220,140,.6)"; g.fill();
  g.restore();
  for (const t of e.tiles || []) {
    const [bx, by, s] = P(t.x + 0.5, t.y + 0.5, 0);
    flame(g, bx, by, s * 0.7 * Math.sin(Math.min(1, k * 1.4) * Math.PI), s * 0.2, Math.sin(t.x + t.y) * 0.3, 1 - k);
  }
  if (!lowQ) for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU, q = P(cx + Math.cos(a) * k * 1.2, cy + Math.sin(a) * k * 1.2, 0.3 + k * 1.4);
    g.globalAlpha = 0.45 * (1 - k); g.fillStyle = "#2a1c18"; g.beginPath(); g.arc(q[0], q[1], q[2] * (0.1 + k * 0.15), 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
}
// ห่าธนู: ลูกธนูพุ่งเฉียงลงทุกช่องเป้า (ช่องละ 3 ดอก ปล่อยเหลื่อมกัน) แล้วปักค้างจางหาย
function drawArrows(g, e, now, lowQ) {
  const p = fxT(e, now, fx.arrows), n = lowQ ? 2 : 3;
  (e.tiles || []).forEach((t, ti) => {
    for (let i = 0; i < n; i++) {
      const delay = 0.08 * i + hash(ti, i) * 0.12, fall = 0.42;
      const k = (p - delay) / fall;
      const ox = 0.25 + hash(ti * 3 + i, 1) * 0.5, oy = 0.25 + hash(ti * 5 + i, 2) * 0.5;
      if (k < 0) continue;
      if (k < 1) {
        const x = t.x + ox - (1 - k) * 2.2, y = t.y + oy - (1 - k) * 0.6, z = (1 - k) * 5;
        const a = P(x, y, z), b = P(x - 0.35, y - 0.1, z + 0.8);
        arrowShape(g, a[0], a[1], Math.hypot(a[0] - b[0], a[1] - b[1]), Math.atan2(a[1] - b[1], a[0] - b[0]), 1);
      } else {
        const a = P(t.x + ox, t.y + oy, 0.02), fade = 1 - clamp01((p - delay - fall) / 0.45);
        arrowShape(g, a[0], a[1], a[2] * 0.26, -Math.PI / 2 + 0.55, fade);
      }
    }
  });
}
// ไฟมังกร: ลำไฟจากฟ้าลงหัวแนว (ไม่เห็นตัวมังกร) · หัวไฟกวาดสุดแผนที่ · ข้างหลังหัวลุกเป็นทะเลเพลิง
function drawDragonFire(g, e, info, now, lowQ, view) {
  const head = dragonHead(e, now, info);
  const tiles = bandTilesOf(e, info);
  // ทะเลเพลิงหลังหัวไฟ (เรียงไกล→ใกล้)
  const list = [];
  for (const t of tiles) {
    const d = head.along(t);
    if (d < -0.2) continue;
    const k = Math.exp(-Math.max(0, d) / 6) * head.fade;
    if (k < 0.04) continue;
    list.push([depthOf(t.x + 0.5, t.y + 0.5), t, k]);
  }
  list.sort((a, b) => a[0] - b[0]);
  const per = lowQ ? 1 : 2;
  for (const [, t, k] of list) {
    for (let i = 0; i < per; i++) {
      const [bx, by, s] = P(t.x + 0.3 + hash(t.x * 7 + t.y, i) * 0.4, t.y + 0.3 + hash(t.y * 7 + t.x, i + 2) * 0.4, 0);
      const fl = 0.8 + 0.2 * Math.sin(now / 80 + t.x * 1.7 + t.y + i);
      flame(g, bx, by, s * (0.7 + 0.5 * k) * fl, s * 0.24, Math.sin(now / 200 + t.x + i) * 0.35, Math.min(1, k * 1.4));
    }
  }
  // ลำไฟจากฟ้าลงหัวแนว
  if (head.p < 0.62) {
    const mid = (e.from + (e.width || 4) / 2);
    const along = (head.rev ? head.len - 1 - head.pos : head.pos) + 0.5;
    const hx = e.axis === "row" ? along : mid, hy = e.axis === "row" ? mid : along;
    const top = P(hx - 1.5, hy - 1.5, 9), bot = P(hx, hy, 0.1);
    g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
    g.strokeStyle = "rgba(255,110,30,.55)"; g.lineWidth = bot[2] * 2.2; g.beginPath(); g.moveTo(top[0], top[1]); g.lineTo(bot[0], bot[1]); g.stroke();
    g.strokeStyle = "rgba(255,190,80,.7)"; g.lineWidth = bot[2] * 1.1; g.beginPath(); g.moveTo(top[0], top[1]); g.lineTo(bot[0], bot[1]); g.stroke();
    g.strokeStyle = "rgba(255,250,210,.8)"; g.lineWidth = bot[2] * 0.4; g.beginPath(); g.moveTo(top[0], top[1]); g.lineTo(bot[0], bot[1]); g.stroke();
    gEllipse(g, hx, hy, 2.2, 0.05, 24); g.fillStyle = "rgba(255,140,50,.3)"; g.fill();
    g.restore(); g.lineCap = "butt";
  }
  // จอส้มวูบ
  const [x, y, w, h] = viewRect(view);
  g.save(); g.globalCompositeOperation = "lighter";
  g.fillStyle = `rgba(255,110,40,${0.16 * head.fade * (0.8 + 0.2 * Math.sin(now / 60))})`; g.fillRect(x, y, w, h);
  g.restore();
  // ประกายไฟปลิว
  if (!lowQ) for (let i = 0; i < 40; i++) {
    const t = tiles[(i * 7) % tiles.length], d = head.along(t);
    if (d < 0) continue;
    const ph = (now / 900 + hash(i, 4)) % 1, q = P(t.x + hash(i, 5), t.y + hash(i, 6), 0.3 + ph * 2.5);
    g.globalAlpha = (1 - ph) * head.fade; g.fillStyle = i % 2 ? "#ffcf6a" : "#ff8a30"; g.fillRect(q[0] - 1, q[1] - 1, 2.4, 2.4);
  }
  g.globalAlpha = 1;
}
// สันคลื่นเหนือทะเล (เตือนซึนามิ) — h = ความสูงสัมพัทธ์
function drawSwell(g, info, now, h) {
  if (h <= 0.02) return;
  const N = 28, cols = info.cols;
  const ridge = (v, z, col, w) => {
    g.strokeStyle = col; g.lineWidth = w; g.beginPath();
    for (let i = 0; i <= N; i++) { const u = i / N * cols, p = P(u, v + Math.sin(u * 0.9 + now / 400) * 0.08, z + Math.sin(u * 1.7 - now / 300) * 0.05 * h); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
    g.stroke();
  };
  g.save(); g.globalAlpha = 0.75; g.lineCap = "round";
  ridge(-0.4, 0.25 * h, "rgba(20,50,60,.8)", 5);
  ridge(-0.45, 0.3 * h, "rgba(255,236,210,.85)", 2);
  ridge(0.8, 0.12 * h, "rgba(255,236,210,.6)", 1.5);
  g.restore();
}
// คลื่นซึนามิ: กำแพงน้ำวิ่งจากทะเลข้ามกระดานจนสุดฝั่ง · ข้างหลังเป็นแผ่นน้ำไหลบ่า
function drawWave(g, e, info, now, lowQ, view) {
  const p = fxT(e, now, fx.wave), cols = info.cols, rows = info.rows;
  const dir = e.dir || { x: 0, y: 1 };
  const span = dir.y ? rows : cols, across = dir.y ? cols : rows;
  const pos = -1.2 + clamp01(p / 0.8) * (span + 2.4);
  const env = Math.min(1, p * 5, (1 - p) * 4);
  // พิกัด: u = ตามแนวหน้าคลื่น · v = ทิศที่คลื่นพัด (ทะเล = v น้อย)
  const at = (u, v, z) => (dir.y ? P(u, dir.y > 0 ? v : rows - v, z) : P(dir.x > 0 ? v : cols - v, u, z));
  const N = lowQ ? 16 : 32;
  // แผ่นน้ำหลังคลื่น
  g.beginPath();
  for (let i = 0; i <= N; i++) { const u = i / N * across, q = at(u, pos - 0.2, 0.05); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }
  for (let i = N; i >= 0; i--) { const u = i / N * across, q = at(u, Math.max(-1, pos - 4.5), 0.02); g.lineTo(q[0], q[1]); }
  g.closePath(); g.fillStyle = `rgba(40,96,112,${0.5 * env})`; g.fill();
  // กำแพงคลื่น: หน้าผาน้ำ + หลังคลื่น + สันม้วน
  const H = 2.2 * env;
  const crest = (u) => H + Math.sin(u * 1.3 + now / 180) * 0.18 * env;
  g.beginPath();
  for (let i = 0; i <= N; i++) { const u = i / N * across, q = at(u, pos, 0); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }
  for (let i = N; i >= 0; i--) { const u = i / N * across, q = at(u, pos - 0.35, crest(u)); g.lineTo(q[0], q[1]); }
  g.closePath(); g.fillStyle = `rgba(22,64,78,${0.88 * env})`; g.fill();
  g.beginPath();
  for (let i = 0; i <= N; i++) { const u = i / N * across, q = at(u, pos - 0.35, crest(u)); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }
  for (let i = N; i >= 0; i--) { const u = i / N * across, q = at(u, pos - 1.8, crest(u) * 0.55); g.lineTo(q[0], q[1]); }
  g.closePath(); g.fillStyle = `rgba(52,112,128,${0.85 * env})`; g.fill();
  // ฟองบนสัน
  g.lineCap = "round"; g.strokeStyle = `rgba(255,244,228,${0.9 * env})`; g.lineWidth = 3;
  g.beginPath();
  for (let i = 0; i <= N; i++) { const u = i / N * across, q = at(u, pos - 0.3, crest(u) + 0.05); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }
  g.stroke();
  g.strokeStyle = `rgba(255,244,228,${0.55 * env})`; g.lineWidth = 2;
  g.beginPath();
  for (let i = 0; i <= N; i++) { const u = i / N * across, q = at(u, pos + 0.05, 0.08 + Math.sin(u * 2 + now / 120) * 0.05); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }
  g.stroke(); g.lineCap = "butt";
  // ละอองน้ำ
  if (!lowQ) for (let i = 0; i < 40; i++) {
    const u = hash(i, 11) * across, ph = (now / 600 + hash(i, 12)) % 1, q = at(u, pos - 0.3 + ph * 0.5, crest(u) + ph * 0.9);
    g.globalAlpha = (1 - ph) * env; g.fillStyle = "#f4ece0"; g.fillRect(q[0] - 1.2, q[1] - 1.2, 2.6, 2.6);
  }
  g.globalAlpha = 1;
  // จอเขียวน้ำทะเลวูบตอนปะทะ
  if (p > 0.05 && p < 0.35) {
    const [x, y, w, h] = viewRect(view);
    g.fillStyle = `rgba(30,80,100,${0.12 * Math.sin((p - 0.05) / 0.3 * Math.PI)})`; g.fillRect(x, y, w, h);
  }
}
