// ============================================================
//  ภาพของด่าน I แม่น้ำแอร์มิด (ป่า + แม่น้ำใหญ่) โหมด Fodlan — ดูสัญญาที่หัวไฟล์ ./index.js · กติกา server/fodlan/stage1.js · ผัง server/fodlan/map1.js
//   อารมณ์ (ผู้ใช้สั่ง 2026-10-27): ดุ มืด น่ากลัวนิดๆ ตามฉาก 3D client/src/fodlan/dioramas/river.js — ไม่สดใสแบบภูมิภาคเดิม
//    ป่าสนเขียวเข้มอมหัวเป็ด · ฟ้าครึ้มสลัว · แม่น้ำเย็นขุ่นไหลเชี่ยว มีฟองและน้ำวน · หมอกลอยเหนือน้ำ · ต้นไม้ตายบิดเบี้ยว/หิน
//    ไม่มีสภาพอากาศก็ยังตึงเครียด (ขอบจอมืด) · ฝนฟ้าผ่า = มืดลงมาก ฝนหนัก ฟ้าแลบ
//   ธีม (อบ): ฟ้าครึ้ม + เมฆหนา + แนวสนไกลในหมอก · พื้นมอส/กิ่งไม้แห้ง · แม่น้ำต่อออกนอกกระดานสองข้าง · ป่าสน/ต้นไม้ตาย/หินสองข้างกระดาน
//   deco (อบลงชั้นกระดาน): ผิวน้ำทุกช่องแม่น้ำ (ลึกกลาง ตื้นริมตลิ่ง + ขอบโคลน) · สะพานน้ำแข็ง (ธารน้ำแข็งบนแม่น้ำ)
//   สิ่งกีดขวาง: fd_river (ไม่วาด — น้ำอยู่ใน deco/ground) · fd_riverpine สนเข้ม · fd_riveroak ต้นไม้บิดเบี้ยวใบบาง · fd_lever คันโยก (ง้าง/ลงตามเรือ)
//   ground: สายน้ำเชี่ยว (ตะวันตก→ตะวันออก) + น้ำวน + หมอกเหนือน้ำ · ท่าเรือ · รอยไหม้ฟ้าผ่า · ตัวเรือ 2×3 (เลื่อนนุ่มเมื่อเรือย้าย) — ใต้ไฮไลต์ (ช่องเรือยังไฮไลต์ได้)
//   items: เสากระโดง/ใบเรือ/ตะเกียง (เรียงความลึกกับตัวละคร) · air: ฝน + ฟ้าแลบ + สายฟ้า + ตกปลา + เสียง
//  เบา: แสงเรือง = ภาพที่อบไว้ครั้งเดียวต่อสี (glowAt) · สายน้ำ/ฝนเป็น path เดียวต่อชั้น · lowQ = ตัดอนุภาค (สายน้ำ ฝน ระลอก)
//  ⚠️ ห้ามเรียกของจาก ./index / ../boardProps ตอนโหลดไฟล์ (วน) · ใช้ได้ในฟังก์ชันวาดเท่านั้น
// ============================================================
import { LW, OX, P, PS, depthOf, glow, quad, rng, sceneSize, unproject } from "../boardGeo";
import { deadTreeShape, pineShape } from "../boardProps";
import { FODLAN_AREA, MAPS } from "../boardRules";
import { fxActive, fxOnce, fxT } from "./index";
import { fodlanAudio } from "../../fodlan/fodlanAudio";

const TAU = Math.PI * 2;
const hash = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
const K = (x, y) => `${x},${y}`;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export const kinds = ["fd_river", "fd_riverpine", "fd_riveroak", "fd_lever", "fd_boat"];
export const tall = ["fd_riverpine", "fd_riveroak"];
// ความยาวฉากของเหตุการณ์ (ms) — server ctx.fx
export const fx = { lightning: 1600, fish: 1800, boat: 900, lever: 1300 };
const BOAT_MS = 900;   // เรือเลื่อนไปตำแหน่งใหม่
const DECK_Z = 0.14;   // ความสูงพื้นเรือเหนือผิวน้ำ (หน่วยช่อง)

// แม่น้ำบนผัง (คงที่) + ขอบตลิ่งของแต่ละช่อง
const RIVER = (() => {
  const m = MAPS[FODLAN_AREA], list = [], set = new Set();
  for (const [k, kind] of Object.entries((m && m.terrain) || {})) if (kind === "fd_river") { const [x, y] = k.split(",").map(Number); list.push({ x, y }); set.add(k); }
  for (const t of list) t.land = { u: !set.has(K(t.x, t.y - 1)) && t.y > 0, d: !set.has(K(t.x, t.y + 1)) && t.y < 13, l: !set.has(K(t.x - 1, t.y)) && t.x > 0, r: !set.has(K(t.x + 1, t.y)) && t.x < 13 };
  return { list, set };
})();

// =================================================================== palette
const PAL = {
  // "กลางวัน" = บ่ายครึ้มสลัว (ไม่มีแดด) — เขียวเข้มอมหัวเป็ด
  day: {
    ground1: "#34463e", ground2: "#1c2924", clump: "#283a32", tile: "rgba(200,230,220,.035)", tile2: "rgba(200,230,220,.09)",
    grid: "rgba(185,215,205,.12)", border: "rgba(195,222,212,.42)", spawn: "rgba(200,230,220,.34)",
    light: ["rgba(190,210,225,.07)", "rgba(2,8,10,.36)"], nightTint: null, shadow: "rgba(2,8,6,.48)",
    sky: ["#232c33", "#3b474b", "#5e5c52"], hill: ["#2e3b38", "#22302c"], horizon: "#2a3833", cloud: "48,58,64", fog: "170,190,188",
    c1: "#203a2c", c2: "#162a1f", c3: "#2b4a35", trunk: "#33251a", leaf: "#0b1511", foreAcc: "#1b2a24",
    dots: ["#3a5543", "#4f6046", "#5d5a48", "#2c4234"], accent: "#5fb0b8", spark: "#d8e6e0", gold: "#c99a3f", line: "rgba(190,220,210,.6)",
    path: "#4a564e", rim: "#3e4a44", rim2: "#2c3631", plaza: "#4a5650", plaza2: "#414c47", crystal: 0.35,
    deep: "#0d2529", shallow: "#24433f", foam: "rgba(210,228,222,.78)", mud: "#352d24", mud2: "#251f19",
    wood: "#4a3322", wood2: "#2c1d13", deck: "#5a4029", sail: "#9c9480", reed: "#33452c", rock: "#4c524c", rock2: "#363b37",
  },
  night: {
    ground1: "#16221d", ground2: "#070d0b", clump: "#122019", tile: "rgba(180,210,240,.035)", tile2: "rgba(180,210,240,.085)",
    grid: "rgba(170,200,235,.11)", border: "rgba(170,200,235,.36)", spawn: "rgba(180,210,240,.3)",
    light: ["rgba(110,140,220,.05)", "rgba(0,4,12,.42)"], nightTint: "rgba(4,8,22,.24)", shadow: "rgba(0,0,6,.55)",
    sky: ["#04070e", "#0c141d", "#18222a"], hill: ["#121c1c", "#0d1615"], horizon: "#111b19", cloud: "18,24,32", fog: "110,130,140",
    c1: "#11221b", c2: "#0b1712", c3: "#183025", trunk: "#1c140e", leaf: "#050a08", foreAcc: "#0f1814",
    dots: ["#1f3328", "#2c3a2e", "#3a382e", "#18261f"], accent: "#7fd8e0", spark: "#cfe0ff", gold: "#d9b25a", line: "rgba(170,200,235,.6)",
    path: "#26302c", rim: "#202a26", rim2: "#161e1b", plaza: "#2a3430", plaza2: "#242e2a", crystal: 0.9,
    deep: "#06161c", shallow: "#132c30", foam: "rgba(160,190,205,.55)", mud: "#211c17", mud2: "#16120f",
    wood: "#33241a", wood2: "#1d140d", deck: "#3f2e1f", sail: "#6c6f74", reed: "#1c2a1c", rock: "#2f3532", rock2: "#222724",
  },
};
const PINE = {
  day: { green: "#1d3628", dark: "#142a1e", snow: null, trunk: "#2e2016" },
  night: { green: "#0e1f17", dark: "#09160f", snow: null, trunk: "#160f0a" },
};
const FAR_PINE = [
  { day: { green: "#3d4c48", dark: "#36443f", snow: null, trunk: "#36443f" }, night: { green: "#121c1e", dark: "#0f181a", snow: null, trunk: "#0f181a" } },
  { day: { green: "#2b3c35", dark: "#24342e", snow: null, trunk: "#24342e" }, night: { green: "#0c1614", dark: "#091210", snow: null, trunk: "#091210" } },
];
// หมอกเหนือแม่น้ำ (สีตามกลางวัน/คืน)
const MIST = { day: "170,190,188", night: "100,120,135" };

// =================================================================== แสงเรือง (อบครั้งเดียวต่อสี)
const GLOW = new Map();
function glowImg(rgb) {
  let c = GLOW.get(rgb);
  if (!c && typeof document !== "undefined") {
    c = document.createElement("canvas");
    c.width = c.height = 64;
    const x = c.getContext("2d"), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.35, `rgba(${rgb},.45)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    GLOW.set(rgb, c);
  }
  return c;
}
function glowAt(g, x, y, r, rgb, a) {
  const img = a > 0 && r > 0 ? glowImg(rgb) : null;
  if (!img) return;
  const a0 = g.globalAlpha;
  g.globalAlpha = a0 * Math.min(1, a);
  g.drawImage(img, x - r, y - r, r * 2, r * 2);
  g.globalAlpha = a0;
}
// รูปหลายเหลี่ยมบนกระดาน (พิกัดช่อง + z)
function poly(g, pts) {
  g.beginPath();
  pts.forEach(([x, y, z = 0], i) => { const p = P(x, y, z); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); });
  g.closePath();
}

// =================================================================== ธีม (อบ)
function skyFill(c, stops) {
  const { g, VX0, VY0, VW, bY } = c, gr = g.createLinearGradient(0, VY0, 0, bY);
  stops.forEach((col, i) => gr.addColorStop(i / (stops.length - 1), col));
  g.fillStyle = gr; g.fillRect(VX0, VY0, VW, bY - 18 - VY0);
}
function pineRow(c, seed, base, size, pal, gap = 11) {
  const { g, VX0, VX1 } = c, R = rng(seed);
  for (let x = VX0 - 20; x <= VX1 + 20; x += gap + R() * gap) pineShape(g, x, base + R() * 6, size * (0.7 + R() * 0.6), pal);
}
function hills(c, color, base, amp, f, ph) {
  const { g, VX0, VX1, bY } = c;
  g.fillStyle = color; g.beginPath(); g.moveTo(VX0, bY + 2);
  for (let x = VX0; x <= VX1 + 6; x += 6) g.lineTo(x, base - Math.abs(Math.sin(x * f + ph)) * amp - Math.sin(x * f * 2.7) * amp * 0.35);
  g.lineTo(VX1, bY + 2); g.closePath(); g.fill();
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
    draw(sx, sy, s, r);
  });
}
// ต้นไม้บิดเบี้ยวใบบาง (พิกัดจอ) — ลำต้นตายแบบป่าต้องสาป + พุ่มใบเข้มเป็นหย่อม
function gnarledShape(g, x, y, s, C, night, seed = 1) {
  const R = rng(seed * 37 + 11);
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(x, y, s * 0.42, s * 0.13, 0, 0, TAU); g.fill();
  deadTreeShape(g, x, y, s, seed, night, 0, null);
  const blob = (dx, dy, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, TAU); g.fill(); };
  for (let i = 0; i < 4; i++) blob((R() - 0.5) * 0.7, -0.85 - R() * 0.4, 0.12 + R() * 0.1, i % 2 ? C.c2 : C.c1);
}
// ก้อนหินมอส (พิกัดจอ)
function rockShape(g, x, y, s, C) {
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(x, y, s * 0.34, s * 0.1, 0, 0, TAU); g.fill();
  g.fillStyle = C.rock2; g.beginPath(); g.moveTo(x - s * 0.3, y); g.lineTo(x - s * 0.22, y - s * 0.22); g.lineTo(x + s * 0.02, y - s * 0.32); g.lineTo(x + s * 0.26, y - s * 0.18); g.lineTo(x + s * 0.3, y); g.closePath(); g.fill();
  g.fillStyle = C.rock; g.beginPath(); g.moveTo(x - s * 0.22, y - s * 0.22); g.lineTo(x + s * 0.02, y - s * 0.32); g.lineTo(x + s * 0.06, y - s * 0.1); g.lineTo(x - s * 0.26, y - s * 0.05); g.closePath(); g.fill();
  g.fillStyle = C.c3; g.globalAlpha = 0.6; g.beginPath(); g.ellipse(x - s * 0.06, y - s * 0.27, s * 0.12, s * 0.04, -0.2, 0, TAU); g.fill(); g.globalAlpha = 1;
}
// แถบหมอก (พิกัดจอ · อบ)
function mistBand(c, y, h, a, seed) {
  const { g, C, VX0, VW } = c, R = rng(seed);
  for (let i = 0; i < 14; i++) {
    g.fillStyle = `rgba(${C.fog},${a * (0.6 + R() * 0.6)})`;
    g.beginPath(); g.ellipse(VX0 + R() * VW, y + (R() - 0.5) * h, 120 + R() * 160, h * (0.4 + R() * 0.4), 0, 0, TAU); g.fill();
  }
}
// เมฆหนาครึ้ม (พิกัดจอ · อบ)
function cloudBank(c, y, n, a, seed) {
  const { g, C, VX0, VW } = c, R = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = VX0 + R() * VW, w = 90 + R() * 160;
    g.fillStyle = `rgba(${C.cloud},${a * (0.7 + R() * 0.3)})`;
    for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(x + (k - 1.5) * w * 0.3, y + (R() - 0.5) * 20 - (k % 2) * 8, w * 0.36, 16 + R() * 14, 0, 0, TAU); g.fill(); }
  }
}
// แม่น้ำต่อออกนอกกระดาน (ซ้าย x < 0 · ขวา x > cols) — พิกัดกระดาน ตรงกับปากแม่น้ำที่ขอบ
function riverEdges() {
  let w0 = 99, w1 = -1, e0 = 99, e1 = -1;
  for (const t of RIVER.list) {
    if (t.x === 0) { w0 = Math.min(w0, t.y); w1 = Math.max(w1, t.y + 1); }
    if (t.x === 13) { e0 = Math.min(e0, t.y); e1 = Math.max(e1, t.y + 1); }
  }
  return { west: w1 > w0 ? [w0, w1] : null, east: e1 > e0 ? [e0, e1] : null };
}
function riverOutside(c) {
  const { g, C, info } = c, ed = riverEdges(), cols = info.cols;
  const band = (x0, x1, top, bot, dir) => {
    const pts = [], n = 24;
    const wob = (x, k) => { const d = Math.abs(dir < 0 ? x - x1 : x - x0) / Math.abs(x1 - x0); return d * (0.6 * Math.sin(x * 0.55 + k) + 0.25 * Math.sin(x * 1.3 + k * 2)); };
    for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n; pts.push([x, top + wob(x, 1)]); }
    for (let i = n; i >= 0; i--) { const x = x0 + (x1 - x0) * i / n; pts.push([x, bot + wob(x, 4)]); }
    poly(g, pts.map(([x, y]) => [x, y + 0.0])); g.fillStyle = C.mud; g.fill();
    poly(g, pts.map(([x, y], i) => [x, y + (i <= n ? 0.12 : -0.12)])); g.fillStyle = C.shallow; g.fill();
    poly(g, pts.map(([x, y], i) => [x, y + (i <= n ? 0.5 : -0.5)])); g.fillStyle = C.deep; g.fill();
    // ประกายผิวน้ำ
    const R = rng(Math.round(x0 * 13 + 7));
    g.strokeStyle = C.foam; g.lineWidth = 1; g.globalAlpha = 0.55;
    for (let i = 0; i < 26; i++) {
      const x = x0 + R() * (x1 - x0), y = top + 0.4 + R() * (bot - top - 0.8), a = P(x, y), b = P(x + 0.35, y);
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    }
    g.globalAlpha = 1;
    // กกริมตลิ่ง
    g.strokeStyle = C.reed; g.lineWidth = 1.2;
    for (let i = 0; i < 30; i++) {
      const x = x0 + R() * (x1 - x0), y = R() < 0.5 ? top + wob(x, 1) - 0.05 : bot + wob(x, 4) + 0.05, p0 = P(x, y), p1 = P(x + 0.05, y, 0.3 + R() * 0.25);
      g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
    }
  };
  if (ed.west) band(-10, 0, ed.west[0], ed.west[1], -1);
  if (ed.east) band(cols, cols + 10, ed.east[0], ed.east[1], 1);
}
// ช่องฉากข้างกระดานทับแม่น้ำที่ต่อออกไปไหม (ฉากข้างใช้พิกัดฉาก — แปลงกลับเป็นพิกัดกระดานของกล้องตอนอบ)
function onOutsideRiver(sx, sy, info) {
  const b = unproject(sx, sy);
  if (!b || (b.x >= 0 && b.x <= info.cols)) return false;
  const ed = riverEdges(), r = b.x < 0 ? ed.west : ed.east;
  return !!r && b.y > r[0] - 1.2 && b.y < r[1] + 1.2;
}

export const theme = {
  pal: PAL,
  back(c) {
    const { g, C, night, bY, VY0 } = c;
    skyFill(c, C.sky);
    // แสงสลัวหลังเมฆ (ไม่มีแดด) · กลางคืนไม่มีดาว — ฟ้าปิด
    glow(g, OX + 300, bY - 60, 240, night ? "120,140,170" : "190,165,120", night ? 0.1 : 0.2);
    cloudBank(c, Math.max(VY0 + 30, bY - 210), 10, 0.85, 3);
    cloudBank(c, bY - 120, 12, 0.7, 4);
    hills(c, C.hill[0], bY - 46, 26, 0.004, 0.6);
    pineRow(c, 31, bY - 30, 30, FAR_PINE[0][night ? "night" : "day"], 8);
    mistBand(c, bY - 30, 20, 0.12, 5);
    hills(c, C.hill[1], bY - 20, 12, 0.009, 2.1);
    pineRow(c, 32, bY - 8, 34, FAR_PINE[1][night ? "night" : "day"], 9);
    const gr = g.createLinearGradient(0, bY - 22, 0, bY + 12);
    gr.addColorStop(0, C.horizon); gr.addColorStop(1, C.ground1);
    g.fillStyle = gr; g.fillRect(c.VX0, bY - 22, c.VW, 34);
    pineRow(c, 33, bY + 2, 32, PINE[night ? "night" : "day"], 12);
    mistBand(c, bY - 2, 14, 0.14, 6);
  },
  ground(c) {
    const { g, C, night, R, VX0, VX1, bY, wx0, wx1, wy1 } = c;
    // มอสเป็นหย่อม + กิ่งไม้แห้ง (ไม่มีดอกไม้สดใส)
    const area = (wx1 - wx0) * (wy1 + 1);
    for (let i = 0, n = Math.min(700, Math.round(area * 0.55)); i < n; i++) {
      const [sx, sy, s] = PS(wx0 + R() * (wx1 - wx0), -1 + R() * (wy1 + 1));
      if (sy < bY) continue;
      g.fillStyle = C.dots[i % C.dots.length]; g.globalAlpha = 0.3 + R() * 0.3;
      g.beginPath(); g.ellipse(sx, sy, s * (0.22 + R() * 0.4), s * (0.07 + R() * 0.1), 0, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    g.strokeStyle = night ? "rgba(40,30,22,.7)" : "rgba(60,44,30,.65)"; g.lineWidth = 1.2;
    for (let i = 0; i < 200; i++) {
      const [sx, sy, s] = PS(wx0 + R() * (wx1 - wx0), -0.5 + R() * (wy1 + 0.5));
      if (sy < bY || sx < VX0 - 10 || sx > VX1 + 10) continue;
      const a = R() * TAU, L = s * (0.1 + R() * 0.14);
      g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + Math.cos(a) * L, sy + Math.sin(a) * L * 0.4); g.lineTo(sx + Math.cos(a + 0.5) * L * 1.3, sy + Math.sin(a + 0.5) * L * 0.5); g.stroke();
    }
    riverOutside(c);
  },
  side(c) {
    const pal = PINE[c.night ? "night" : "day"];
    sideRow(c, 41, 1.35, (sx, sy, s, r) => {
      if (onOutsideRiver(sx, sy, c.info)) return;
      if (r < 0.6) {
        c.g.fillStyle = c.C.shadow; c.g.beginPath(); c.g.ellipse(sx, sy, s * 0.42, s * 0.12, 0, 0, TAU); c.g.fill();
        pineShape(c.g, sx, sy, s * (1.35 + r * 0.9), pal);
      } else if (r < 0.85) gnarledShape(c.g, sx, sy, s * (1.0 + r * 0.5), c.C, c.night, Math.round(r * 1000));
      else rockShape(c.g, sx, sy, s * 0.9, c.C);
    });
    mistBand(c, c.bY + 40, 30, 0.07, 9);
  },
  // ผิวน้ำของแม่น้ำ (อบลงชั้นกระดาน — ทับเส้นตาราง) · สะพานน้ำแข็ง
  deco(c) {
    const { g, C, info } = c;
    if (info.area !== FODLAN_AREA) return;
    const sp = {};
    for (const s of info.special || []) sp[K(s.x, s.y)] = s.kind;
    for (const t of RIVER.list) {
      const L = t.land, edge = L.u || L.d || L.l || L.r;
      quad(g, t.x, t.y, -0.01); g.fillStyle = edge ? C.shallow : C.deep; g.fill();
      // ร่องน้ำลึกกลางช่องริมตลิ่ง (ไล่จากตลิ่งไปกลางแม่น้ำ)
      if (edge) {
        const x0 = t.x + (L.l ? 0.38 : 0), x1 = t.x + 1 - (L.r ? 0.38 : 0), y0 = t.y + (L.u ? 0.38 : 0), y1 = t.y + 1 - (L.d ? 0.38 : 0);
        poly(g, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]); g.fillStyle = C.deep; g.globalAlpha = 0.55; g.fill(); g.globalAlpha = 1;
      }
      // ขอบโคลน + ฟองริมตลิ่ง
      const lip = (side) => {
        const [a, b] = side === "u" ? [[t.x, t.y], [t.x + 1, t.y]] : side === "d" ? [[t.x, t.y + 1], [t.x + 1, t.y + 1]] : side === "l" ? [[t.x, t.y], [t.x, t.y + 1]] : [[t.x + 1, t.y], [t.x + 1, t.y + 1]];
        const n = side === "u" ? [0, 1] : side === "d" ? [0, -1] : side === "l" ? [1, 0] : [-1, 0];
        poly(g, [[a[0], a[1]], [b[0], b[1]], [b[0] + n[0] * 0.13, b[1] + n[1] * 0.13], [a[0] + n[0] * 0.13, a[1] + n[1] * 0.13]]);
        g.fillStyle = C.mud; g.fill();
        const f0 = P(a[0] + n[0] * 0.17, a[1] + n[1] * 0.17), f1 = P(b[0] + n[0] * 0.17, b[1] + n[1] * 0.17);
        g.strokeStyle = C.foam; g.lineWidth = 1; g.globalAlpha = 0.6; g.beginPath(); g.moveTo(f0[0], f0[1]); g.lineTo(f1[0], f1[1]); g.stroke(); g.globalAlpha = 1;
      };
      for (const side of ["u", "d", "l", "r"]) if (L[side]) lip(side);
      // สะพานน้ำแข็ง (ธารน้ำแข็งบนแม่น้ำ — ช่องที่ไม่ใช่เรือ)
      if (sp[K(t.x, t.y)] === "ice") {
        quad(g, t.x, t.y, 0.03, 0.03); g.fillStyle = "rgba(214,240,255,.94)"; g.fill();
        g.strokeStyle = "rgba(255,255,255,.95)"; g.lineWidth = 1.4; g.stroke();
        const R = rng(t.x * 31 + t.y * 7 + 3);
        g.strokeStyle = "rgba(120,180,220,.7)"; g.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          const a = P(t.x + 0.15 + R() * 0.7, t.y + 0.15 + R() * 0.7, 0.03), b = P(t.x + 0.15 + R() * 0.7, t.y + 0.15 + R() * 0.7, 0.03);
          g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
        }
      }
    }
  },
  fore(f, c) {
    const { VX0, VY0, VX1 } = c, C = c.C;
    for (const [cx, cy] of [[VX1 - 30, VY0 + 40], [VX1 - 100, VY0 - 10], [VX0 - 20, 300], [VX0 + 60, VY0 - 20]]) {
      f.globalAlpha = 0.9; f.fillStyle = C.leaf;
      for (let k = 0; k < 3; k++) { f.beginPath(); f.moveTo(cx - 140 + k * 40, cy + 70 - k * 20); f.lineTo(cx + k * 10, cy - 60 - k * 10); f.lineTo(cx + 120 - k * 30, cy + 80 - k * 15); f.closePath(); f.fill(); }
      f.fillStyle = C.foreAcc; f.globalAlpha = 0.55; f.beginPath(); f.ellipse(cx - 30, cy - 10, 60, 28, 0.3, 0, TAU); f.fill();
    }
    f.globalAlpha = 1;
  },
  // ใบไม้แห้งปลิว (ทั้งวันทั้งคืน) + กลางคืน: ดวงไฟเย็นจางๆ ลอยเหนือแม่น้ำ
  ambient(g, f, t) {
    const { night, view, lowQ } = f;
    if (lowQ) return;
    if (night) {
      for (let i = 0; i < 10; i++) {
        const tile = RIVER.list[(i * 7) % RIVER.list.length], a = t / (3600 + i * 300) + i * 2.1;
        const [x, y] = P(tile.x + 0.5 + Math.cos(a) * 0.9, tile.y + 0.5 + Math.sin(a * 0.8) * 0.7, 0.5 + Math.sin(a * 2) * 0.25);
        const k = 0.35 + 0.35 * Math.sin(t / 420 + i);
        glowAt(g, x, y, 8, "150,230,210", k * 0.7);
        g.globalAlpha = k; g.fillStyle = "#bff3e4"; g.beginPath(); g.arc(x, y, 1.5, 0, TAU); g.fill(); g.globalAlpha = 1;
      }
    }
    const W = view.x1 - view.x0, H = view.y1 - view.y0;
    for (let i = 0; i < 12; i++) {
      const ph = (t / (9000 + i * 600) + hash(i, 7)) % 1;
      const x = view.x0 + ((hash(i, 8) + ph * 0.45 + Math.sin(t / 1100 + i) * 0.03) % 1) * W, y = view.y0 + ph * H;
      g.save(); g.translate(x, y); g.rotate(t / 500 + i);
      g.fillStyle = i % 3 ? "rgba(52,64,40,.85)" : "rgba(92,70,40,.85)"; g.beginPath(); g.ellipse(0, 0, 4.5, 2, 0, 0, TAU); g.fill(); g.restore();
    }
  },
};

// =================================================================== สิ่งกีดขวาง
let LAST = null; // fd ล่าสุด (ground เก็บทุกเฟรม — คันโยกอ่านว่าเรือจอดท่าไหน)
// กลางวัน/คืน: ground/items/air ไม่ได้รับค่านี้ → drawObstacle (ได้ ctx.night ทุกเฟรม) เก็บไว้
let LAST_NIGHT = false;
function nightOf(info) { return info && typeof info.night === "boolean" ? info.night : LAST_NIGHT; }
function palOf(ctx) { return ctx && ctx.C && ctx.C.deep ? ctx.C : PAL[ctx && ctx.night ? "night" : "day"]; }
function drawLever(g, t, C, now) {
  const [bx, by, s] = P(t.x + 0.5, t.y + 0.55);
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(bx, by, s * 0.3, s * 0.1, 0, 0, TAU); g.fill();
  // ฐานหิน
  g.fillStyle = "#8a857a"; g.beginPath(); g.ellipse(bx, by - s * 0.04, s * 0.24, s * 0.09, 0, 0, TAU); g.fill();
  g.fillStyle = "#6e695f"; g.fillRect(bx - s * 0.24, by - s * 0.12, s * 0.48, s * 0.08);
  g.fillStyle = "#9d988c"; g.beginPath(); g.ellipse(bx, by - s * 0.13, s * 0.24, s * 0.08, 0, 0, TAU); g.fill();
  // เสาไม้ + วงล้อเชือก
  g.fillStyle = C.wood2; g.fillRect(bx - s * 0.06, by - s * 0.62, s * 0.12, s * 0.5);
  g.fillStyle = C.wood; g.fillRect(bx - s * 0.06, by - s * 0.62, s * 0.05, s * 0.5);
  const hub = [bx, by - s * 0.5];
  g.strokeStyle = "#c9b98f"; g.lineWidth = Math.max(1.5, s * 0.05); g.beginPath(); g.arc(hub[0], hub[1], s * 0.13, 0, TAU); g.stroke();
  g.fillStyle = "#4a4038"; g.beginPath(); g.arc(hub[0], hub[1], s * 0.05, 0, TAU); g.fill();
  // ด้ามคันโยก: เรือจอดท่านี้ = ลง · ไม่อยู่ = ง้างขึ้น · ฉากดึง = ค่อยๆ ลง
  const dock = LAST && Array.isArray(LAST.docks) ? LAST.docks.find((d) => d.lever && d.lever.x === t.x && d.lever.y === t.y) : null;
  let k = dock && dock.here ? 1 : 0;
  const pull = LAST && Array.isArray(LAST.fx) ? LAST.fx.find((e) => e.kind === "lever" && e.x === t.x && e.y === t.y && fxT(e, now, fx.lever) < 1) : null;
  if (pull) k = ease(Math.min(1, fxT(pull, now, fx.lever) * 1.8));
  const a = -2.2 + k * 1.6, L = s * 0.42;
  const tip = [hub[0] + Math.cos(a) * L, hub[1] + Math.sin(a) * L];
  g.strokeStyle = "#3a2c20"; g.lineWidth = Math.max(2, s * 0.06); g.lineCap = "round";
  g.beginPath(); g.moveTo(hub[0], hub[1]); g.lineTo(tip[0], tip[1]); g.stroke();
  g.fillStyle = "#b8452f"; g.beginPath(); g.arc(tip[0], tip[1], s * 0.06, 0, TAU); g.fill();
  g.lineCap = "butt";
}
export function drawObstacle(g, t, ctx, now) {
  LAST_NIGHT = !!(ctx && ctx.night);
  const C = palOf(ctx);
  if (t.kind === "fd_river") return; // ผิวน้ำวาดใน deco/ground
  if (t.kind === "fd_lever") { drawLever(g, t, C, now); return; }
  const [sx, sy, s] = P(t.x + 0.5, t.y + 0.6);
  if (t.kind === "fd_riverpine") {
    g.fillStyle = C.shadow; g.beginPath(); g.ellipse(sx, sy, s * 0.42, s * 0.14, 0, 0, TAU); g.fill();
    pineShape(g, sx, sy, s * 1.25, PINE[ctx && ctx.night ? "night" : "day"]);
    return;
  }
  if (t.kind === "fd_riveroak") gnarledShape(g, sx, sy, s * 1.25, C, !!(ctx && ctx.night), t.x * 13 + t.y * 7);
}
// ช่องเรือ: พื้นเรือวาดเองใน ground (เลื่อนตามเรือ) — ไม่อบอะไรลงพื้น
export function bakeSpecial() {}
export function animSpecial() {}

// =================================================================== เรือ (เลื่อนนุ่มเมื่อย้าย)
const BOAT = { x: null, y: null, fx: 0, fy: 0, tx: 0, ty: 0, t0: 0 };
function boatPos(b, now) {
  if (!b) return null;
  if (BOAT.x === null) { Object.assign(BOAT, { x: b.x, y: b.y, fx: b.x, fy: b.y, tx: b.x, ty: b.y, t0: -1e9 }); }
  if (b.x !== BOAT.tx || b.y !== BOAT.ty) {
    const cur = boatPos({ x: BOAT.tx, y: BOAT.ty }, now);
    Object.assign(BOAT, { fx: cur.x, fy: cur.y, tx: b.x, ty: b.y, t0: now });
  }
  const k = ease(Math.max(0, Math.min(1, (now - BOAT.t0) / BOAT_MS)));
  return { x: BOAT.fx + (BOAT.tx - BOAT.fx) * k, y: BOAT.fy + (BOAT.ty - BOAT.fy) * k, moving: k < 1 };
}
// เปลือกเรือ (รูปตามแนว x: หัวเรือแหลมทางตะวันตก ท้ายเรือตัดทางตะวันออก) · พิกัดสัมพันธ์มุมบนซ้าย ขนาด 3×2
const HULL = [[0.04, 1.0], [0.42, 0.2], [0.95, 0.1], [2.1, 0.1], [2.66, 0.16], [2.95, 0.42], [2.95, 1.58], [2.66, 1.84], [2.1, 1.9], [0.95, 1.9], [0.42, 1.8]];
function drawHull(g, bx, by, C, night, now, lowQ) {
  const bob = lowQ ? 0 : Math.sin(now / 900) * 0.015;
  const at = (z) => HULL.map(([x, y]) => [bx + x, by + y, z]);
  // ระลอกรอบลำเรือ
  poly(g, HULL.map(([x, y]) => [bx + 1.5 + (x - 1.5) * 1.06, by + 1 + (y - 1) * 1.12, 0]));
  g.fillStyle = night ? "rgba(150,190,230,.12)" : "rgba(255,250,230,.25)"; g.fill();
  const lo = at(-0.06), hi = at(DECK_Z + bob);
  poly(g, lo); g.fillStyle = C.wood2; g.fill();
  // ข้างลำเรือ (ด้านใกล้กล้องมองเห็น — พื้นเรือทับด้านไกล)
  for (let i = 0; i < HULL.length; i++) {
    const j = (i + 1) % HULL.length;
    poly(g, [lo[i], lo[j], hi[j], hi[i]]);
    g.fillStyle = i % 2 ? C.wood : C.wood2; g.fill();
  }
  // แถบกันน้ำ
  g.strokeStyle = night ? "rgba(20,14,8,.7)" : "rgba(40,24,10,.6)"; g.lineWidth = 1.2;
  poly(g, at(0.02)); g.stroke();
  // พื้นเรือ + แนวไม้กระดาน
  poly(g, hi); g.fillStyle = C.deck; g.fill();
  g.strokeStyle = night ? "rgba(0,0,0,.35)" : "rgba(70,44,20,.45)"; g.lineWidth = 1;
  for (const yy of [0.45, 0.8, 1.15, 1.5]) {
    const a = P(bx + 0.45, by + yy, DECK_Z + bob), b = P(bx + 2.8, by + yy, DECK_Z + bob);
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
  }
  // กราบเรือ
  g.strokeStyle = C.wood2; g.lineWidth = 2; poly(g, at(DECK_Z + 0.06 + bob)); g.stroke();
  g.strokeStyle = night ? "rgba(255,230,190,.18)" : "rgba(255,230,190,.45)"; g.lineWidth = 1; poly(g, at(DECK_Z + 0.07 + bob)); g.stroke();
}
// เชือกผูกท่าตอนจอด
function drawMooring(g, fd, bp, C) {
  const dock = (fd.docks || []).find((d) => d.here);
  if (!dock || bp.moving) return;
  const t = dock.tiles[1] || dock.tiles[0];
  const a = P(t.x + 0.5, t.y + 0.5, 0.25), cx = Math.max(bp.x + 0.4, Math.min(bp.x + 2.6, t.x + 0.5)), cy = t.y < bp.y ? bp.y + 0.2 : bp.y + 1.8;
  const b = P(cx, cy, DECK_Z + 0.08);
  g.strokeStyle = "#c9b98f"; g.lineWidth = 1.4; g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo((a[0] + b[0]) / 2, Math.max(a[1], b[1]) + 6, b[0], b[1]); g.stroke();
}
function drawDocks(g, fd, C) {
  for (const d of fd.docks || []) for (const t of d.tiles || []) {
    // พื้นไม้ท่าเรือ (สูงจากพื้นเล็กน้อย) + เสาไม้มุม
    quad(g, t.x, t.y, 0.02, 0.06); g.fillStyle = C.wood; g.fill();
    g.strokeStyle = C.wood2; g.lineWidth = 1; g.stroke();
    for (let i = 1; i < 4; i++) {
      const along = d.side === "n" || d.side === "s";
      const a = along ? P(t.x + i / 4, t.y + 0.04, 0.06) : P(t.x + 0.04, t.y + i / 4, 0.06), b = along ? P(t.x + i / 4, t.y + 0.96, 0.06) : P(t.x + 0.96, t.y + i / 4, 0.06);
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    }
    const ny = d.side === "n" ? t.y + 0.95 : t.y + 0.05;
    for (const px of [t.x + 0.1, t.x + 0.9]) {
      const p0 = P(px, ny, -0.12), p1 = P(px, ny, 0.22);
      g.strokeStyle = C.wood2; g.lineWidth = Math.max(2, p0[2] * 0.06); g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
    }
  }
}

// =================================================================== ground (ใต้ไฮไลต์ — ทุกเฟรม)
// น้ำวน: ช่องน้ำลึก (ไม่ติดตลิ่ง) บางช่อง — เลือกครั้งเดียว
const WHIRLS = RIVER.list.filter((t) => !(t.land.u || t.land.d || t.land.l || t.land.r)).filter((t, i) => i % 4 === 1);
export function ground(g, fd, info, now, lowQ) {
  LAST = fd;
  const night = nightOf(info), C = PAL[night ? "night" : "day"];
  const rain = !!(fd.weather && fd.weather.kind === "storm");
  const bp = boatPos(fd.boat, now);
  const terr = (info && info.terrainKind) || {};
  const water = (t) => terr[K(t.x, t.y)] === "fd_river";
  if (!lowQ) {
    // สายน้ำเชี่ยวตะวันตก→ตะวันออก (ช่องที่ยังเป็นน้ำ) — path เดียว
    g.strokeStyle = C.foam; g.lineWidth = 1.1; g.globalAlpha = rain ? 0.6 : 0.48;
    g.beginPath();
    RIVER.list.forEach((t, i) => {
      if (!water(t)) return;
      for (let j = 0; j < 3; j++) {
        const ph = (now / (rain ? 620 : 900) + hash(i, j + 1)) % 1, yy = t.y + 0.15 + 0.7 * hash(i, j + 5);
        const x0 = t.x + ph * 0.75, len = 0.14 + 0.22 * Math.sin(ph * Math.PI);
        const a = P(x0, yy), b = P(Math.min(t.x + 1, x0 + len), yy + 0.03 * Math.sin(now / 300 + i));
        g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]);
      }
    });
    g.stroke();
    // น้ำวน (เกลียวหมุน)
    g.lineWidth = 1.2; g.globalAlpha = 0.55;
    for (const [i, t] of WHIRLS.entries()) {
      if (!water(t)) continue;
      const rot = now / (700 + i * 90) * (i % 2 ? 1 : -1);
      g.beginPath();
      for (let k = 0; k <= 22; k++) {
        const a = rot + k * 0.55, r = 0.06 + k * 0.016, p = P(t.x + 0.5 + Math.cos(a) * r, t.y + 0.5 + Math.sin(a) * r * 0.8);
        if (k) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
      }
      g.stroke();
      const c = P(t.x + 0.5, t.y + 0.5);
      g.fillStyle = "rgba(0,10,12,.35)"; g.beginPath(); g.ellipse(c[0], c[1], c[2] * 0.07, c[2] * 0.03, 0, 0, TAU); g.fill();
    }
    // หมอกลอยเหนือแม่น้ำ (ภาพเรืองที่อบไว้)
    const mist = MIST[night ? "night" : "day"];
    for (let i = 0; i < 16; i++) {
      const t = RIVER.list[(i * 11 + 3) % RIVER.list.length], drift = ((now / (16000 + i * 900) + hash(i, 2)) % 1) * 3 - 1.5;
      const [x, y, s] = P(t.x + 0.5 + drift, t.y + 0.5, 0.25);
      glowAt(g, x, y, s * (0.9 + hash(i, 4) * 0.6), mist, (rain ? 0.16 : 0.24) * Math.sin(((now / (16000 + i * 900) + hash(i, 2)) % 1) * Math.PI));
    }
    // ระลอกฝนบนผิวน้ำ/พื้น
    if (rain) {
      g.strokeStyle = "rgba(200,220,235,.5)"; g.lineWidth = 1;
      for (let i = 0; i < 30; i++) {
        const ph = (now / 650 + hash(i, 3)) % 1, slot = Math.floor(now / 650 + hash(i, 3));
        const x = hash(i, slot % 97) * info.cols, y = hash(i + 50, slot % 89) * info.rows;
        const [px, py, s] = P(x, y);
        g.globalAlpha = 0.55 * (1 - ph);
        g.beginPath(); g.ellipse(px, py, s * 0.12 * ph + 1, s * 0.05 * ph + 0.5, 0, 0, TAU); g.stroke();
      }
    }
    g.globalAlpha = 1;
  }
  drawDocks(g, fd, C);
  // รอยไหม้ฟ้าผ่า (จางตามฉาก)
  for (const e of fxActive(fd, now)) {
    if (e.kind !== "lightning") continue;
    const p = fxT(e, now, fx.lightning);
    const [x, y, s] = P(e.x + 0.5, e.y + 0.5);
    g.fillStyle = `rgba(14,10,8,${0.6 * (1 - p)})`; g.beginPath(); g.ellipse(x, y, s * 0.38, s * 0.15, 0, 0, TAU); g.fill();
    glowAt(g, x, y, s * 0.6, "190,220,255", (1 - p) * 0.6);
  }
  if (bp) {
    drawMooring(g, fd, bp, C);
    drawHull(g, bp.x, bp.y, C, night, now, lowQ);
  }
}

// =================================================================== items (เรียงความลึกกับตัวละคร)
let RIDERS = null; // id ที่ยืนบนเรือเฟรมก่อน (เสียงขึ้นเรือ)
let RIDE_AT = "";
export function items(list, g, fd, info, units, now, lowQ) {
  const bp = boatPos(fd.boat, now);
  if (!bp) return;
  const C = PAL[nightOf(info) ? "night" : "day"];
  // เสียงขึ้นเรือ: มีคนใหม่ยืนบนเรือ (เรือไม่ได้ย้าย)
  const b = fd.boat, here = `${b.x},${b.y}`;
  const on = new Set((units || []).filter((u) => !u.corpse && u.x >= b.x && u.x < b.x + (b.w || 3) && u.y >= b.y && u.y < b.y + (b.h || 2)).map((u) => u.id));
  if (RIDERS && RIDE_AT === here && !bp.moving && [...on].some((id) => !RIDERS.has(id))) { try { fodlanAudio().sfx("boat_board", { gain: 0.8 }); } catch { /* ไม่มีเสียง */ } }
  RIDERS = on; RIDE_AT = here;
  // เสากระโดง: กลางลำบนเส้นแบ่งแถว (ไม่ทับกลางช่องที่คนยืน)
  const mx = bp.x + 1.5, my = bp.y + 1.0, bob = lowQ ? 0 : Math.sin(now / 900) * 0.015;
  list.push({
    d: depthOf(mx, my) + 0.02,
    f: () => {
      const base = P(mx, my, DECK_Z + bob), top = P(mx, my, 2.3 + bob), [, , s] = base;
      g.strokeStyle = C.wood2; g.lineWidth = Math.max(2, s * 0.07); g.beginPath(); g.moveTo(base[0], base[1]); g.lineTo(top[0], top[1]); g.stroke();
      // คานใบ + ใบเรือม้วน
      const y0 = P(mx - 0.95, my, 1.95 + bob), y1 = P(mx + 0.95, my, 1.95 + bob);
      g.lineWidth = Math.max(1.5, s * 0.04); g.beginPath(); g.moveTo(y0[0], y0[1]); g.lineTo(y1[0], y1[1]); g.stroke();
      g.strokeStyle = C.sail; g.lineWidth = Math.max(3, s * 0.1); g.lineCap = "round";
      const r0 = P(mx - 0.85, my, 1.86 + bob), r1 = P(mx + 0.85, my, 1.86 + bob);
      g.beginPath(); g.moveTo(r0[0], r0[1]); g.lineTo(r1[0], r1[1]); g.stroke(); g.lineCap = "butt";
      // ธงปลายเสา
      const wave = lowQ ? 0 : Math.sin(now / 260) * s * 0.03;
      g.fillStyle = "#c23b2a"; g.beginPath(); g.moveTo(top[0], top[1]); g.lineTo(top[0] + s * 0.28, top[1] + s * 0.05 + wave); g.lineTo(top[0], top[1] + s * 0.12); g.closePath(); g.fill();
      // ตะเกียงท้ายเรือ
      const lp = P(bp.x + 2.75, bp.y + 1.0, DECK_Z + 0.35 + bob);
      g.strokeStyle = C.wood2; g.lineWidth = 1.5; const lb = P(bp.x + 2.75, bp.y + 1.0, DECK_Z + bob); g.beginPath(); g.moveTo(lb[0], lb[1]); g.lineTo(lp[0], lp[1]); g.stroke();
      const fl = 0.8 + 0.2 * Math.sin(now / 130);
      glowAt(g, lp[0], lp[1], s * (nightOf(info) ? 0.9 : 0.4), "255,190,110", (nightOf(info) ? 0.65 : 0.35) * fl);
      g.fillStyle = "#ffd890"; g.beginPath(); g.arc(lp[0], lp[1], Math.max(1.5, s * 0.045), 0, TAU); g.fill();
    },
  });
}

// =================================================================== air (ทับตัวละคร)
let THUNDER_AT = 0;
// ขอบจอมืด (อบครั้งเดียว — ขยายตามกรอบจอ)
let VIGNETTE = null;
function vignetteImg() {
  if (VIGNETTE || typeof document === "undefined") return VIGNETTE;
  const c = document.createElement("canvas");
  c.width = 256; c.height = 144;
  const x = c.getContext("2d"), gr = x.createRadialGradient(128, 78, 40, 128, 72, 150);
  gr.addColorStop(0, "rgba(0,6,8,0)"); gr.addColorStop(0.6, "rgba(0,6,8,.18)"); gr.addColorStop(1, "rgba(0,4,6,.62)");
  x.fillStyle = gr; x.fillRect(0, 0, 256, 144);
  VIGNETTE = c;
  return c;
}
function sfx(key, opt) { try { fodlanAudio().sfx(key, opt); } catch { /* ไม่มีเสียง */ } }
function bolt(g, x0, y0, x1, y1, seed, w, a) {
  const R = rng(seed * 97 + 5), n = 9, pts = [[x0, y0]];
  for (let i = 1; i < n; i++) { const k = i / n; pts.push([x0 + (x1 - x0) * k + (R() - 0.5) * 34 * (1 - k * 0.5), y0 + (y1 - y0) * k]); }
  pts.push([x1, y1]);
  const path = () => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); };
  g.lineJoin = "round";
  path(); g.strokeStyle = `rgba(150,190,255,${0.45 * a})`; g.lineWidth = w * 3.2; g.stroke();
  path(); g.strokeStyle = `rgba(245,250,255,${a})`; g.lineWidth = w; g.stroke();
  // แขนง
  const j = 3 + Math.floor(R() * 3), [bx, by] = pts[j];
  g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + (R() - 0.5) * 50, by + 22 + R() * 20); g.lineTo(bx + (R() - 0.5) * 70, by + 40 + R() * 24);
  g.strokeStyle = `rgba(230,240,255,${0.7 * a})`; g.lineWidth = w * 0.5; g.stroke();
}
const REWARD_ICON = { hp: "❤️", sp: "🔷", gold: "🪙" };
function unitTop(units, id) {
  const u = (units || []).find((it) => it.id === id && !it.corpse);
  if (!u) return null;
  const n = Math.max(1, u.size | 0), x = (u.rx != null ? u.rx : u.x) + (u.ox || 0) + n / 2, y = (u.ry != null ? u.ry : u.y) + (u.oy || 0) + n / 2;
  return { x, y, n };
}
export function air(g, fd, info, units, now, lowQ, view) {
  const C = PAL[nightOf(info) ? "night" : "day"];
  // เสียงของเหตุการณ์ (ครั้งเดียวต่อเหตุการณ์)
  for (const e of fd.fx || []) {
    if (!fx[e.kind] || !fxOnce(e)) continue;
    if (e.kind === "lightning") {
      if (now - THUNDER_AT > 350) { THUNDER_AT = now; sfx(e.seq % 2 ? "wx_thunder" : "wx_thunder2", { gain: 0.9 }); }
    } else if (e.kind === "fish") {
      sfx("fish_cast");
      if (e.reward && e.reward !== "none") sfx("fish_catch", { delay: 0.85 });
    } else if (e.kind === "boat") sfx("boat_move");
    else if (e.kind === "lever") { sfx("lever"); sfx("boat_move", { delay: 0.35 }); }
  }
  const W = view ? view.x1 - view.x0 : LW, H = view ? view.y1 - view.y0 : 720, X0 = view ? view.x0 : 0, Y0 = view ? view.y0 : 0;
  const storm = !!(fd.weather && fd.weather.kind === "storm");
  let flash = 0;
  // ขอบจอมืด (ตึงเครียดแม้ไม่มีสภาพอากาศ) — ภาพที่อบไว้ครั้งเดียว
  const vg = vignetteImg();
  if (vg) { g.globalAlpha = storm ? 1 : 0.75; g.drawImage(vg, X0, Y0, W, H); g.globalAlpha = 1; }
  if (storm) {
    // พายุ: มืดลงมาก (เปียก เย็น)
    g.fillStyle = nightOf(info) ? "rgba(2,5,14,.42)" : "rgba(10,18,28,.4)"; g.fillRect(X0, Y0, W, H);
    // ฝนเฉียง — path เดียว
    if (!lowQ) {
      g.strokeStyle = "rgba(205,220,240,.42)"; g.lineWidth = 1;
      g.beginPath();
      for (let i = 0; i < 150; i++) {
        const sp = 0.85 + hash(i, 2) * 0.5, y = Y0 + ((hash(i, 1) * H + now * sp) % (H + 40)) - 20, x = X0 + ((hash(i, 3) * W - (now * sp) * 0.25) % W + W) % W;
        g.moveTo(x, y); g.lineTo(x - 5, y + 18);
      }
      g.stroke();
    }
    // ฟ้าแลบไกล (ไม่มีเสียง — เสียงฟ้าร้องสุ่มของ fodlanAudio)
    const slot = Math.floor(now / 7000), at = hash(slot, 9) * 5600, d = now - slot * 7000 - at;
    if (d >= 0 && d < 260) flash = Math.max(flash, (d < 70 || (d > 140 && d < 200) ? 0.22 : 0.06));
  }
  for (const e of fxActive(fd, now)) {
    const p = fxT(e, now, fx[e.kind] || 1500);
    if (e.kind === "lightning") {
      const [x, y, s] = P(e.x + 0.5, e.y + 0.5);
      if (p < 0.12) flash = Math.max(flash, 0.45 * (1 - p / 0.12));
      const a = p < 0.5 ? (Math.sin(p * 90) > -0.3 ? 1 : 0.35) : Math.max(0, 1 - (p - 0.5) * 2.4);
      if (a > 0) bolt(g, x + (hash(e.seq, 4) - 0.5) * 60, Y0 - 10, x, y, e.seq, Math.max(1.6, s * 0.05), a);
      glowAt(g, x, y, s * (0.7 + p * 0.8), "200,225,255", (1 - p) * 0.9);
      if (!lowQ) for (let i = 0; i < 8; i++) {
        const ang = hash(i, e.seq) * TAU, r = s * 0.6 * p;
        g.fillStyle = `rgba(230,240,255,${1 - p})`; g.beginPath(); g.arc(x + Math.cos(ang) * r, y + Math.sin(ang) * r * 0.5 - s * 0.4 * p, Math.max(1, s * 0.025), 0, TAU); g.fill();
      }
    } else if (e.kind === "fish") {
      const who = unitTop(units, e.id) || { x: e.from.x + 0.5, y: e.from.y + 0.5, n: 1 };
      const hand = P(who.x + 0.18, who.y, 0.95 * (1 + (who.n - 1) * 0.6)), [wx, wy, ws] = P(e.x + 0.5, e.y + 0.5);
      // หย่อนเบ็ด → ทุ่นลอย/สั่น → ดึงขึ้น
      let bx = wx, by = wy;
      if (p < 0.25) { const k = p / 0.25; bx = hand[0] + (wx - hand[0]) * k; by = hand[1] + (wy - hand[1]) * k - Math.sin(k * Math.PI) * ws * 0.9; }
      else if (p < 0.7) by = wy + Math.sin(now / (p > 0.55 ? 45 : 160)) * ws * 0.03;
      else { const k = (p - 0.7) / 0.3; bx = wx + (hand[0] - wx) * k; by = wy + (hand[1] - wy) * k - Math.sin(k * Math.PI) * ws * 0.7; }
      g.strokeStyle = "rgba(240,240,230,.85)"; g.lineWidth = 1;
      g.beginPath(); g.moveTo(hand[0], hand[1]); g.quadraticCurveTo((hand[0] + bx) / 2, Math.max(hand[1], by) + 4, bx, by); g.stroke();
      if (p >= 0.25 && p < 0.75) {
        const q = ((p - 0.25) / 0.5) % 1;
        for (const r of [q, (q + 0.5) % 1]) { g.strokeStyle = `rgba(255,255,255,${0.7 * (1 - r)})`; g.beginPath(); g.ellipse(wx, wy, ws * 0.3 * r + 1, ws * 0.12 * r + 0.5, 0, 0, TAU); g.stroke(); }
      }
      const got = e.reward && e.reward !== "none";
      if (p >= 0.7 && got) {
        // ปลาติดเบ็ด
        g.save(); g.translate(bx, by); g.rotate(Math.sin(now / 60) * 0.5);
        g.fillStyle = "#c9d6de"; g.beginPath(); g.ellipse(0, ws * 0.08, ws * 0.13, ws * 0.05, 0, 0, TAU); g.fill();
        g.beginPath(); g.moveTo(-ws * 0.12, ws * 0.08); g.lineTo(-ws * 0.2, ws * 0.02); g.lineTo(-ws * 0.2, ws * 0.14); g.closePath(); g.fill();
        g.restore();
      } else { g.fillStyle = "#e5482f"; g.beginPath(); g.arc(bx, by, Math.max(1.6, ws * 0.04), 0, TAU); g.fill(); }
      // ของที่ได้ลอยเหนือหัว (ไอคอน + ตัวเลข)
      if (p >= 0.78 && got && REWARD_ICON[e.reward]) {
        const k = (p - 0.78) / 0.22, [hx, hy, hs] = P(who.x, who.y, 1.3 * (1 + (who.n - 1) * 0.6) + k * 0.4);
        g.globalAlpha = Math.min(1, (1 - k) * 2.5);
        g.font = `bold ${Math.max(11, hs * 0.22) | 0}px "Chakra Petch","Kanit",sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
        g.lineWidth = 3; g.strokeStyle = "rgba(0,0,0,.6)";
        const txt = `${REWARD_ICON[e.reward]}+${e.amt || 0}`;
        g.strokeText(txt, hx, hy); g.fillStyle = "#fff"; g.fillText(txt, hx, hy);
        g.globalAlpha = 1;
      }
    } else if (e.kind === "boat" && !lowQ && e.to) {
      // ฟองท้ายเรือตอนแล่น
      const bp = boatPos(fd.boat, now);
      if (bp && bp.moving) for (let i = 0; i < 6; i++) {
        const [x, y, s] = P(bp.x + (e.to.x >= e.from.x ? -0.05 : 3.05), bp.y + 0.3 + i * 0.28, 0.02);
        g.fillStyle = `rgba(255,255,255,${0.5 * (1 - p)})`; g.beginPath(); g.arc(x, y, s * (0.05 + hash(i, e.seq) * 0.05), 0, TAU); g.fill();
      }
    }
  }
  if (flash > 0) { g.fillStyle = `rgba(232,240,255,${flash})`; g.fillRect(X0, Y0, W, H); }
  void C;
}
