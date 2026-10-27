// ============================================================
//  ภาพของด่าน IV เทือกเขาฟาร์กัส (Fodlan · GRID_PLAN §8.5) — สัญญาดูหัวไฟล์ ./index.js · กติกา server/fodlan/stage4.js
//   แนวภาพ (ผู้ใช้สั่ง 2026-10-27): ต้องดราม่าเท่าฉาก 3D client/src/fodlan/dioramas/snow.js — ไม่สว่างเรียบแบบภูมิภาคเดิม
//    ภูเขาหินมืดสูงตระหง่าน หิมะปลิวตามลม เงาน้ำเงินเทาลึก น้ำแข็งเกาะทุกอย่าง กองไฟ = เกาะแสงอุ่นกลางความหนาว
//    พายุหิมะ = ขาวโพลนแทบมองไม่เห็น + ขอบจอมืด
//   theme   ฟ้าครึ้ม + ยอดเขามืด 3 ชั้น (หิมะเป็นร่องตามไหล่เขา · หิมะปลิวจากยอด · เมฆต่ำ) (อบ) · พื้นหิมะเงาลึก + ริ้วลม (อบ)
//    · สนมืดหิมะเกาะ/หินสองข้าง (อบ) · กิ่งสน + เกล็ดน้ำแข็งเบลอหน้ากล้อง
//   สิ่งกีดขวาง fd_snowcliff หน้าผาหิน (ต่อกันทั้งแถว) · fd_snowrock หินหิมะ · fd_frostrock หินน้ำแข็งกลางแอ่ง · fd_snowpine สน · fd_deadwood ต้นไม้แห้ง
//    fd_snowpile กองหิมะ · fd_campfire กองไฟลุก · fd_campfire_small กองไฟเล็ก · fd_campfire_out กองไฟดับ (ควันจาง)
//   ground  วงความอบอุ่นของกองไฟที่ลุก (ไล่สีส้มจางตามช่องที่อุ่น + ขอบเส้น) — fd.fires[].tiles จาก server
//   air     หิมะตก (พายุหิมะ = หนา + มืด + ลมแรง) · ฉาก: น้ำแข็งกัด · หิมะถล่ม · ตัดไม้ · จุดไฟ · ไฟดับ (+ เสียง fodlanAudio)
//  ต้องเบา: แสงไฟใช้สไปรต์แคช (ไม่สร้าง gradient ทุกเฟรม) · วงความอบอุ่นแคช Path2D ตามมุมกล้อง · lowQ = ไม่มีอนุภาค
// ============================================================
import { LW, OX, P, PA, PS, faceVisible, gPoly, glow, rng, sceneSize, viewAxes, viewTurn, pitchOf } from "../boardGeo";
import { deadTreeShape, pineShape, prism, SNOW_PINE } from "../boardProps";
import { fxActive, fxOnce, fxT } from "./index";
import { fodlanAudio } from "../../fodlan/fodlanAudio";

const TAU = Math.PI * 2;
const hash = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };

export const kinds = ["fd_snowcliff", "fd_snowrock", "fd_frostrock", "fd_snowpine", "fd_deadwood", "fd_snowpile", "fd_campfire", "fd_campfire_small", "fd_campfire_out"];
export const tall = ["fd_snowcliff", "fd_snowpine", "fd_deadwood"];
export const fx = { frostbite: 1100, avalanche: 1900, chop: 700, ignite: 900, fireout: 1300 };
const SFX = { frostbite: "frostbite", avalanche: "avalanche", chop: "wood_chop", ignite: "torch_place", fireout: "torch_out" };

// =================================================================== จานสี
const PAL = {
  day: {
    grid: "rgba(20,40,80,.2)", border: "rgba(225,236,250,.75)", spawn: "rgba(20,40,80,.38)", nightTint: null,
    light: ["rgba(210,228,255,.10)", "rgba(8,18,42,.38)"],
    ground1: "#b9c7d8", ground2: "#4f6079", clump: "#7e92ad", dots: ["#f4f8ff", "#c6dcf5", "#e2eefc"],
    tile: "rgba(20,40,80,.07)", tile2: "rgba(20,40,80,.15)", shadow: "rgba(10,22,48,.4)", accent: "#ff9a50",
    sky: ["#1d2738", "#3f4f67", "#7d8fa7"], cloud: "rgba(60,72,92,.55)", far: "#46546b", farSh: "#323e52", mid: "#2b3546", midSh: "#1f2735",
    near: "#1a212d", nearSh: "#121821", snow: "#dfe8f2", snowSh: "#9fb0c6", horizon: "#8a9bb2",
    rock: "#465061", rock2: "#323a48", rockHi: "#5d6879", leaf: "#14262a", foreAcc: "#d9e6f4", frost: "rgba(220,236,255,.85)",
    pine: { green: "#1f3b38", dark: "#142a29", snow: "#dbe6f2", trunk: "#3a2c24" },
  },
  night: {
    grid: "rgba(170,200,255,.12)", border: "rgba(170,200,255,.35)", spawn: "rgba(170,200,255,.32)", nightTint: "rgba(2,8,24,.32)",
    light: ["rgba(90,130,220,.05)", "rgba(0,4,16,.5)"],
    ground1: "#53647f", ground2: "#141c2b", clump: "#34435c", dots: ["#c9dbf5", "#7fa6d8", "#a9c2e6"],
    tile: "rgba(200,220,255,.05)", tile2: "rgba(200,220,255,.11)", shadow: "rgba(0,4,16,.55)", accent: "#ffb070",
    sky: ["#01040b", "#081226", "#1a2842"], cloud: "rgba(18,26,42,.7)", far: "#1d2840", farSh: "#151e33", mid: "#131b2c", midSh: "#0d1322",
    near: "#0b111c", nearSh: "#070b13", snow: "#a9bcd8", snowSh: "#6c80a2", horizon: "#22314d",
    rock: "#2a3242", rock2: "#1d2431", rockHi: "#3a4558", leaf: "#08141a", foreAcc: "#8aa2c4", frost: "rgba(170,200,240,.7)",
    pine: { green: "#11231f", dark: "#0b1816", snow: "#9fb3d1", trunk: "#20180f" },
  },
};

// =================================================================== ฉากหลัง (อบ)
function skyFill(c, stops) {
  const { g, VX0, VY0, VW, bY } = c, gr = g.createLinearGradient(0, VY0, 0, bY);
  stops.forEach((col, i) => gr.addColorStop(i / (stops.length - 1), col));
  g.fillStyle = gr; g.fillRect(VX0, VY0, VW, bY - 18 - VY0);
}
// ยอดเขาหินขรุขระ (สันเขาหยัก) · ด้านสว่าง/ด้านเงาแบ่งที่สันกลาง · หิมะเป็นร่อง (couloir) ไหลลงตามไหล่เขา ไม่ใช่หมวกเรียบ
function jaggedPeak(g, R, x, base, h, hw, lit, sh, snow, snowSh) {
  const L = [], Rt = [];
  const n = 5;
  for (let i = 1; i < n; i++) {
    const f = i / n;
    L.push([x - hw * f + (R() - 0.5) * hw * 0.12, base - h * (1 - f) + (R() - 0.3) * h * 0.1]);
    Rt.push([x + hw * f + (R() - 0.5) * hw * 0.12, base - h * (1 - f) + (R() - 0.3) * h * 0.1]);
  }
  const top = [x + (R() - 0.5) * hw * 0.1, base - h];
  g.fillStyle = lit; g.beginPath(); g.moveTo(x - hw, base);
  for (let i = L.length - 1; i >= 0; i--) g.lineTo(L[i][0], L[i][1]);
  g.lineTo(top[0], top[1]); g.lineTo(x + hw * 0.08, base); g.closePath(); g.fill();
  g.fillStyle = sh; g.beginPath(); g.moveTo(top[0], top[1]);
  for (const p of Rt) g.lineTo(p[0], p[1]);
  g.lineTo(x + hw, base); g.lineTo(x + hw * 0.08, base); g.closePath(); g.fill();
  // หิมะปิดยอด (หยักแหลม) + ร่องหิมะไหลลงไหล่เขา
  const k = 0.22 + R() * 0.1, [tx, ty] = top;
  g.fillStyle = snow; g.beginPath(); g.moveTo(tx, ty);
  g.lineTo(tx - hw * k, ty + h * k * 1.1); g.lineTo(tx - hw * k * 0.55, ty + h * k * 0.8); g.lineTo(tx - hw * k * 0.3, ty + h * k * 1.25);
  g.lineTo(tx, ty + h * k * 0.7); g.closePath(); g.fill();
  g.fillStyle = snowSh; g.beginPath(); g.moveTo(tx, ty);
  g.lineTo(tx, ty + h * k * 0.7); g.lineTo(tx + hw * k * 0.35, ty + h * k * 1.3); g.lineTo(tx + hw * k * 0.6, ty + h * k * 0.85); g.lineTo(tx + hw * k, ty + h * k * 1.05);
  g.closePath(); g.fill();
  g.globalAlpha = 0.75;
  for (let i = 0; i < 4; i++) {
    const side = i % 2 ? 1 : -1, f0 = 0.15 + R() * 0.2, f1 = f0 + 0.25 + R() * 0.35;
    const x0 = tx + side * hw * f0, y0 = base - h * (1 - f0), x1 = tx + side * hw * f1, y1 = base - h * (1 - f1) + h * 0.05;
    g.fillStyle = side < 0 ? snow : snowSh;
    g.beginPath(); g.moveTo(x0 - 2, y0); g.lineTo(x0 + 3, y0); g.lineTo(x1 + 1, y1); g.closePath(); g.fill();
  }
  g.globalAlpha = 1;
  return top;
}
// หิมะปลิวจากยอดเขา (spindrift — ลมพัดไปทางขวา)
function spindrift(g, x, y, len, a) {
  for (let i = 0; i < 5; i++) {
    g.fillStyle = `rgba(235,242,252,${(a * (1 - i / 5)).toFixed(3)})`;
    g.beginPath(); g.ellipse(x + len * (0.15 + i * 0.2), y + i * 3 - 2, len * (0.12 + i * 0.05), 3 + i * 1.6, -0.12, 0, TAU); g.fill();
  }
}
// ฉากสองข้างกระดาน (เรียงไกล→ใกล้) — แบบ regionThemes sideRow
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
function snowRockShape(g, bx, by, s, C, seed) {
  const R = rng(seed);
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(bx, by + s * 0.03, s * 0.46, s * 0.15, 0, 0, TAU); g.fill();
  const w = s * (0.34 + R() * 0.08), h = s * (0.36 + R() * 0.12);
  g.fillStyle = C.rock2; g.beginPath();
  g.moveTo(bx - w, by); g.lineTo(bx - w * 0.85, by - h * 0.55); g.lineTo(bx - w * 0.3, by - h); g.lineTo(bx + w * 0.4, by - h * 0.9); g.lineTo(bx + w, by - h * 0.35); g.lineTo(bx + w * 0.95, by);
  g.closePath(); g.fill();
  g.fillStyle = C.rock; g.beginPath();
  g.moveTo(bx - w, by); g.lineTo(bx - w * 0.85, by - h * 0.55); g.lineTo(bx - w * 0.3, by - h); g.lineTo(bx + w * 0.05, by - h * 0.55); g.lineTo(bx - w * 0.1, by);
  g.closePath(); g.fill();
  // หิมะบนหัวหิน
  g.fillStyle = C.snow; g.beginPath();
  g.moveTo(bx - w * 0.82, by - h * 0.58); g.lineTo(bx - w * 0.3, by - h * 1.02); g.lineTo(bx + w * 0.42, by - h * 0.92); g.lineTo(bx + w * 0.8, by - h * 0.5);
  g.quadraticCurveTo(bx + w * 0.3, by - h * 0.62, bx + w * 0.05, by - h * 0.55); g.quadraticCurveTo(bx - w * 0.4, by - h * 0.7, bx - w * 0.82, by - h * 0.58);
  g.closePath(); g.fill();
}

const THEME = {
  back(c) {
    const { g, C, night, bY, VX0, VX1, VW, VY0, R } = c;
    skyFill(c, C.sky);
    if (night) {
      const S = rng(43);
      for (let i = 0, n = Math.round(70 * VW / LW); i < n; i++) { g.fillStyle = `rgba(200,220,255,${0.15 + S() * 0.45})`; g.fillRect(VX0 + S() * VW, VY0 + S() * (bY - 160 - VY0), 1.3, 1.3); }
    } else {
      // แสงทึมหลังเมฆ (ไม่มีดวงอาทิตย์)
      glow(g, OX + 300, Math.max(VY0 + 40, bY - 330), 240, "200,215,235", 0.22);
    }
    const M = rng(404);
    // ชั้นไกล: ยอดเขาสูงตระหง่านเกือบชนขอบบนของฉาก
    const tall = Math.max(240, bY - VY0 - 40);
    for (let x = VX0 - 90; x < VX1 + 120; x += 110 + M() * 90) {
      const top = jaggedPeak(g, M, x, bY - 40, tall * (0.62 + M() * 0.4), 120 + M() * 70, C.far, C.farSh, C.snow, C.snowSh);
      if (M() < 0.6) spindrift(g, top[0], top[1] + 6, 60 + M() * 60, night ? 0.18 : 0.32);
    }
    // เมฆต่ำพาดเทือกเขา
    g.fillStyle = C.cloud;
    for (let i = 0; i < 9; i++) {
      const x = VX0 + (i / 8) * VW + (M() - 0.5) * 100, y = bY - 120 - M() * 70, w = 120 + M() * 120;
      g.beginPath(); g.ellipse(x, y, w, 14 + M() * 10, 0, 0, TAU); g.fill();
    }
    // ชั้นกลาง + ชั้นใกล้ (มืดลงเรื่อยๆ) — ช่องเขาตรงกลาง
    for (let x = VX0 - 60; x < VX1 + 80; x += 85 + M() * 60) {
      const mid = Math.abs(x - OX) < 150 ? 0.6 : 1;
      jaggedPeak(g, M, x, bY - 22, (120 + M() * 110) * mid, 80 + M() * 50, C.mid, C.midSh, C.snow, C.snowSh);
    }
    for (let x = VX0 - 40; x < VX1 + 60; x += 70 + M() * 50) {
      const mid = Math.abs(x - OX) < 220 ? 0.45 : 1;
      jaggedPeak(g, M, x, bY - 8, (60 + M() * 80) * mid, 60 + M() * 40, C.near, C.nearSh, C.snowSh, C.snowSh);
    }
    // หมอกหิมะเย็นตีนเขา
    const gr = g.createLinearGradient(0, bY - 70, 0, bY + 10);
    gr.addColorStop(0, "rgba(160,180,210,0)"); gr.addColorStop(0.6, night ? "rgba(40,55,85,.6)" : "rgba(150,168,192,.65)"); gr.addColorStop(1, C.ground1);
    g.fillStyle = gr; g.fillRect(VX0, bY - 70, VW, 80);
    // แนวสนมืดหลังกระดาน
    const cnt = Math.round(32 * VW / LW);
    for (let i = 0; i < cnt; i++) {
      const x = VX0 + (i / Math.max(1, cnt - 1)) * VW + (R() - 0.5) * 30, sz = 26 + R() * 22;
      pineShape(g, x, bY - 6 + R() * 8, sz * 0.85, C.pine);
    }
  },
  ground(c) {
    const { g, C, R, night, VX0, VX1, bY, wx0, wx1, wy1 } = c;
    const area = (wx1 - wx0) * (wy1 + 1);
    // แอ่งเงาน้ำเงินเทาลึกบนหิมะ
    g.globalAlpha = 0.4; g.fillStyle = C.clump;
    for (let i = 0, n = Math.min(700, Math.round(area * 0.5)); i < n; i++) {
      const [sx, sy, s] = PS(wx0 + R() * (wx1 - wx0), -1 + R() * (wy1 + 1));
      if (sy < bY) continue;
      g.beginPath(); g.ellipse(sx, sy, s * (0.3 + R() * 0.6), s * (0.08 + R() * 0.12), 0, 0, TAU); g.fill();
    }
    // ประกายหิมะ
    g.globalAlpha = night ? 0.45 : 0.7;
    for (let i = 0, n = Math.min(2000, Math.round(area * 1.0)); i < n; i++) {
      const [sx, sy, s] = PS(wx0 + R() * (wx1 - wx0), -0.5 + R() * (wy1 + 0.5));
      if (sy < bY || sx < VX0 - 4 || sx > VX1 + 4) continue;
      g.fillStyle = C.dots[i % C.dots.length]; g.beginPath(); g.arc(sx, sy, Math.max(0.8, s * (0.02 + R() * 0.025)), 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    // ริ้วลมบนหิมะ (sastrugi — ลมพัดทางเดียวกัน) · ขอบสว่างคู่เงาเข้ม
    for (let i = 0; i < 220; i++) {
      const [sx, sy, s] = PS(wx0 + R() * (wx1 - wx0), -0.5 + R() * (wy1 + 0.5));
      if (sy < bY || sx < VX0 - 40 || sx > VX1 + 40) continue;
      const L = s * (0.4 + R() * 0.7);
      g.lineWidth = Math.max(1, s * 0.03);
      g.strokeStyle = night ? "rgba(5,12,30,.35)" : "rgba(30,55,95,.3)";
      g.beginPath(); g.moveTo(sx - L, sy + s * 0.02); g.quadraticCurveTo(sx, sy - s * 0.05, sx + L, sy + s * 0.03); g.stroke();
      g.strokeStyle = night ? "rgba(170,200,240,.25)" : "rgba(240,246,255,.55)";
      g.beginPath(); g.moveTo(sx - L * 0.8, sy - s * 0.02); g.quadraticCurveTo(sx, sy - s * 0.08, sx + L * 0.8, sy); g.stroke();
    }
    // หินโผล่จากหิมะ
    g.fillStyle = C.rock2;
    for (let i = 0; i < 40; i++) {
      const [sx, sy, s] = PS(wx0 + R() * (wx1 - wx0), -0.5 + R() * (wy1 + 0.5));
      if (sy < bY) continue;
      g.beginPath(); g.ellipse(sx, sy, s * 0.07, s * 0.035, 0, 0, TAU); g.fill();
    }
  },
  side(c) {
    sideRow(c, 9, 1.15, (sx, sy, s, r) => {
      const g = c.g;
      if (r < 0.75) {
        g.fillStyle = c.C.shadow; g.beginPath(); g.ellipse(sx, sy, s * 0.4, s * 0.12, 0, 0, TAU); g.fill();
        pineShape(g, sx, sy, s * (1.1 + r * 0.8), c.C.pine);
      } else snowRockShape(g, sx, sy, s * (0.9 + r * 0.6), c.C, Math.round(r * 1000));
    });
  },
  // กิ่งสนมืดหิมะเกาะ + เกล็ดน้ำแข็งที่มุมจอ (เบลอหน้ากล้อง)
  fore(f, c) {
    const { VX0, VY0, VX1, VY1 } = c, C = c.C;
    for (const [cx, cy] of [[VX1 - 30, VY0 + 40], [VX1 - 110, VY0 - 10], [VX0 - 20, 300]]) {
      f.globalAlpha = 0.92; f.fillStyle = C.leaf;
      f.beginPath(); f.ellipse(cx, cy, 130, 72, 0.3, 0, TAU); f.fill();
      f.beginPath(); f.ellipse(cx - 60, cy + 42, 95, 55, -0.2, 0, TAU); f.fill();
      f.globalAlpha = 0.85; f.fillStyle = C.foreAcc;
      f.beginPath(); f.ellipse(cx - 20, cy - 32, 85, 24, 0.3, 0, TAU); f.fill();
      f.beginPath(); f.ellipse(cx - 72, cy + 16, 52, 14, -0.2, 0, TAU); f.fill();
    }
    // น้ำแข็งเกาะขอบเลนส์ (มุมล่าง)
    f.fillStyle = C.frost;
    f.globalAlpha = 0.5;
    for (const [cx, cy, rx, ry] of [[VX0 - 30, VY1 + 10, 200, 90], [VX1 + 20, VY1 + 20, 240, 100]]) {
      f.beginPath(); f.ellipse(cx, cy, rx, ry, 0, 0, TAU); f.fill();
    }
    f.globalAlpha = 1;
  },
};
THEME.pal = PAL;
export const theme = THEME;

// =================================================================== สไปรต์แสงไฟ (สร้างครั้งเดียว)
let GLOW = null;
function glowSprite() {
  if (GLOW !== null) return GLOW;
  if (typeof document === "undefined") return (GLOW = false);
  const cv = document.createElement("canvas");
  cv.width = cv.height = 128;
  const c = cv.getContext("2d");
  const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,176,90,1)"); gr.addColorStop(0.35, "rgba(255,140,60,.5)"); gr.addColorStop(1, "rgba(255,110,40,0)");
  c.fillStyle = gr; c.fillRect(0, 0, 128, 128);
  return (GLOW = cv);
}
function warmGlow(g, x, y, rx, ry, a) {
  const s = glowSprite();
  if (!s || !(a > 0)) return;
  const pa = g.globalAlpha;
  g.globalAlpha = pa * Math.min(1, a);
  g.drawImage(s, x - rx, y - ry, rx * 2, ry * 2);
  g.globalAlpha = pa;
}

// =================================================================== สิ่งกีดขวาง
function shadow(g, bx, by, rx, ry, C) { g.fillStyle = C.shadow; g.beginPath(); g.ellipse(bx, by, rx, ry, 0, 0, TAU); g.fill(); }
// ความสูงยอดหน้าผาที่มุมช่อง (ช่องติดกันใช้มุมเดียวกัน → ยอดต่อกันเนียน)
const cliffH = (cx, cy) => 1.9 + 0.7 * hash(cx * 1.7 + 3, cy * 3.1 + 11);
function drawCliff(g, t, ctx) {
  const { x, y } = t, conn = t.conn || {}, { night } = ctx;
  const rock = night ? "#1f2735" : "#3b4556", rockS = night ? "#161c28" : "#2b3342", rockD = night ? "#0d121b" : "#1e2531";
  const snow = night ? "#a9bcd8" : "#e3ecf6", snowS = night ? "#7487a8" : "#aab9cd";
  const hh = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]].map(([cx, cy]) => cliffH(cx, cy));
  const fd = viewAxes();
  // ด้าน: [ชื่อ, nx, ny, มุม a, มุม b]
  const sides = [["u", 0, -1, 0, 1], ["r", 1, 0, 1, 2], ["d", 0, 1, 2, 3], ["l", -1, 0, 3, 0]];
  const C4 = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
  for (const [k, nx, ny, a, b] of sides) {
    if (conn[k]) continue;
    const mx = (C4[a][0] + C4[b][0]) / 2, my = (C4[a][1] + C4[b][1]) / 2;
    if (!faceVisible(nx, ny, mx, my)) continue;
    const front = Math.abs(nx * fd.fx + ny * fd.fy) > 0.7;
    // ยืดปลายด้านละนิด (ช่องหน้าผาติดกันซ้อนกัน — ไม่เห็นรอยต่อเป็นเส้น)
    const ex = (C4[b][0] - C4[a][0]) * 0.02, ey = (C4[b][1] - C4[a][1]) * 0.02;
    const A0 = [C4[a][0] - ex, C4[a][1] - ey], B0 = [C4[b][0] + ex, C4[b][1] + ey];
    gPoly(g, [[...A0, 0], [...B0, 0], [...B0, hh[b]], [...A0, hh[a]]]);
    g.fillStyle = front ? rock : rockS; g.fill();
    // ชั้นหิน
    g.strokeStyle = rockD; g.lineWidth = 1;
    for (const f of [0.22, 0.45, 0.68]) {
      gPoly(g, [[...C4[a], hh[a] * f + 0.04 * hash(C4[a][0], f)], [mx, my, (hh[a] + hh[b]) / 2 * f - 0.05], [...C4[b], hh[b] * f + 0.04 * hash(C4[b][0], f)]], false);
      g.stroke();
    }
    // หิมะย้อยจากยอด
    const ha = hh[a], hb = hh[b];
    gPoly(g, [[...C4[a], ha], [...C4[b], hb], [...C4[b], hb - 0.16], [mx + (C4[b][0] - mx) * 0.4, my + (C4[b][1] - my) * 0.4, (ha + hb) / 2 - 0.3], [mx, my, (ha + hb) / 2 - 0.12], [mx + (C4[a][0] - mx) * 0.5, my + (C4[a][1] - my) * 0.5, (ha + hb) / 2 - 0.26], [...C4[a], ha - 0.14]]);
    g.fillStyle = front ? snow : snowS; g.fill();
    // หยาดน้ำแข็งย้อยใต้หิมะ
    g.fillStyle = night ? "rgba(150,185,230,.75)" : "rgba(200,228,255,.85)";
    for (let i = 0; i < 3; i++) {
      const u = 0.18 + i * 0.3 + hash(x * 3 + i, y) * 0.1, len = 0.18 + hash(x + i, y * 7) * 0.3;
      const px = C4[a][0] + (C4[b][0] - C4[a][0]) * u, py = C4[a][1] + (C4[b][1] - C4[a][1]) * u, z = ha + (hb - ha) * u - 0.2;
      const p0 = P(px - 0.035, py, z), p1 = P(px + 0.035, py, z), p2 = P(px, py, z - len);
      g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.closePath(); g.fill();
    }
  }
  gPoly(g, C4.map(([cx, cy], i) => [cx, cy, hh[i]]));
  g.fillStyle = snow; g.fill();
}
function drawSnowPile(g, t, ctx, now) {
  const { x, y } = t, { C, night } = ctx;
  const [bx, by, s] = PA(x, y, 0.05);
  shadow(g, bx, by + s * 0.02, s * 0.48, s * 0.16, C);
  const sh = night ? "#56698c" : "#8ea3bf", mid = night ? "#7d91b3" : "#c3d2e4", top = night ? "#a9bcd8" : "#eef4fb";
  g.fillStyle = sh; g.beginPath(); g.ellipse(bx, by - s * 0.1, s * 0.46, s * 0.2, 0, 0, TAU); g.fill();
  g.fillStyle = mid; g.beginPath(); g.ellipse(bx - s * 0.04, by - s * 0.2, s * 0.42, s * 0.22, 0, 0, TAU); g.fill();
  g.fillStyle = top;
  g.beginPath(); g.ellipse(bx - s * 0.14, by - s * 0.36, s * 0.26, s * 0.2, 0, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(bx + s * 0.14, by - s * 0.32, s * 0.22, s * 0.17, 0, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(bx, by - s * 0.5, s * 0.17, s * 0.14, 0, 0, TAU); g.fill();
  // รอยร้าวบนกองหิมะ (พร้อมถล่ม) + เศษหิมะร่วงเบาๆ
  g.strokeStyle = night ? "rgba(70,95,140,.55)" : "rgba(110,150,200,.6)"; g.lineWidth = Math.max(1, s * 0.02);
  g.beginPath(); g.moveTo(bx - s * 0.2, by - s * 0.42); g.lineTo(bx - s * 0.06, by - s * 0.34); g.lineTo(bx + s * 0.02, by - s * 0.4); g.lineTo(bx + s * 0.16, by - s * 0.3); g.stroke();
  const ph = (now / 1800 + hash(x, y)) % 1;
  g.fillStyle = top; g.globalAlpha = 1 - ph;
  g.beginPath(); g.arc(bx + s * 0.3, by - s * (0.36 - ph * 0.3), Math.max(1, s * 0.025), 0, TAU); g.fill();
  g.globalAlpha = 1;
}
function drawIceRock(g, t, ctx) {
  const { x, y } = t, { C, night } = ctx;
  const [bx, by, s] = PA(x, y, 0.05);
  shadow(g, bx, by, s * 0.44, s * 0.14, C);
  const A = night ? "#bcd6f0" : "#eaf8ff", B = night ? "#7fa6d2" : "#a8d6f0";
  prism(g, bx, by, -s * 0.18, s * 0.45, s * 0.2, -0.35, A, B);
  prism(g, bx, by, s * 0.2, s * 0.38, s * 0.18, 0.4, A, B);
  prism(g, bx, by, 0, s * 0.7, s * 0.26, -0.05, A, B);
}
// กองไฟ: ก้อนหินล้อม · ฟืนไขว้ · เปลวไฟ (ลุก) / ถ่านดำ + ควัน (ดับ)
function stonesAndLogs(g, x, y, k, lit, night) {
  const cx = x + 0.5, cy = y + 0.5, r = 0.3 * k;
  g.fillStyle = night ? "#4a5263" : "#7a828f";
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU, p = P(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.03);
    g.beginPath(); g.ellipse(p[0], p[1], p[2] * 0.07 * k, p[2] * 0.045 * k, 0, 0, TAU); g.fill();
  }
  const log = lit ? (night ? "#4a2c18" : "#6b4026") : (night ? "#211c1a" : "#2e2724");
  const a = P(cx - 0.22 * k, cy - 0.1 * k, 0.06), b = P(cx + 0.22 * k, cy + 0.1 * k, 0.12);
  const c = P(cx - 0.18 * k, cy + 0.16 * k, 0.12), d = P(cx + 0.16 * k, cy - 0.18 * k, 0.06);
  g.strokeStyle = log; g.lineCap = "round"; g.lineWidth = Math.max(2, a[2] * 0.08 * k);
  g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.moveTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.stroke();
  g.lineCap = "butt";
}
function teardrop(g, x, y, w, h, sway) {
  g.beginPath(); g.moveTo(x - w, y);
  g.quadraticCurveTo(x - w, y - h * 0.55, x + sway, y - h);
  g.quadraticCurveTo(x + w, y - h * 0.55, x + w, y);
  g.quadraticCurveTo(x, y + w * 0.5, x - w, y); g.fill();
}
const TONGUES = [[-0.12, 0.42, 0], [0.12, 0.38, 1.7], [0, 0.62, 3.1], [-0.04, 0.3, 4.4]];
function flames(g, bx, by, s, now, seed) {
  warmGlow(g, bx, by - s * 0.25, s * 1.2, s * 0.85, 0.6 + 0.15 * Math.sin(now / 90 + seed));
  for (const [ox, h, ph] of TONGUES) {
    const fl = 0.85 + 0.15 * Math.sin(now / 70 + ph + seed) + 0.08 * Math.sin(now / 37 + ph * 2);
    const hh = s * h * fl, w = s * 0.12, sway = Math.sin(now / 120 + ph) * s * 0.05;
    g.fillStyle = "#ff6a14"; teardrop(g, bx + ox * s, by, w, hh, sway);
    g.fillStyle = "#ffbe3a"; teardrop(g, bx + ox * s, by, w * 0.6, hh * 0.66, sway * 0.7);
  }
  g.fillStyle = "#fff3b8"; teardrop(g, bx, by, s * 0.055, s * 0.2, 0);
  // ประกายไฟลอย
  g.fillStyle = "#ffd27a";
  for (let i = 0; i < 4; i++) {
    const ph = (now / (900 + i * 170) + hash(seed, i)) % 1;
    g.globalAlpha = 1 - ph;
    g.beginPath(); g.arc(bx + Math.sin(now / 300 + i * 2) * s * 0.12, by - s * (0.3 + ph * 0.8), Math.max(0.8, s * 0.018), 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
}
function smoke(g, bx, by, s, now, seed, n = 3, col = "rgba(120,128,140,") {
  for (let i = 0; i < n; i++) {
    const ph = (now / 2600 + i / n + hash(seed, i)) % 1;
    g.fillStyle = `${col}${(0.4 * Math.sin(ph * Math.PI)).toFixed(3)})`;
    g.beginPath(); g.arc(bx + Math.sin(ph * 4 + i) * s * 0.1, by - s * (0.15 + ph * 0.9), s * (0.06 + ph * 0.14), 0, TAU); g.fill();
  }
}
function drawFire(g, t, ctx, now) {
  const { x, y, kind } = t, { C, night } = ctx;
  const small = kind === "fd_campfire_small", lit = kind !== "fd_campfire_out", k = small ? 0.72 : 1;
  const [bx, by, s] = PA(x, y, 0);
  shadow(g, bx, by + s * 0.02, s * 0.4 * k, s * 0.13 * k, C);
  stonesAndLogs(g, x, y, k, lit, night);
  if (lit) flames(g, bx, by - s * 0.04, s * k, now, x * 7 + y);
  else {
    // ถ่านมีหิมะเกาะ + ควันจาง
    g.fillStyle = night ? "rgba(214,227,246,.8)" : "rgba(255,255,255,.85)";
    g.beginPath(); g.ellipse(bx - s * 0.06, by - s * 0.06, s * 0.1, s * 0.035, 0, 0, TAU); g.fill();
    smoke(g, bx, by, s, now, x * 7 + y, 3);
  }
}

export function drawObstacle(g, t, ctx, now) {
  const { x, y, kind } = t, { C, night } = ctx;
  switch (kind) {
    case "fd_snowcliff": drawCliff(g, t, ctx); return;
    case "fd_snowpile": drawSnowPile(g, t, ctx, now); return;
    case "fd_frostrock": drawIceRock(g, t, ctx); return;
    case "fd_campfire": case "fd_campfire_small": case "fd_campfire_out": drawFire(g, t, ctx, now); return;
    case "fd_snowpine": {
      const [bx, by, s] = PA(x, y, 0.1);
      shadow(g, bx, by, s * 0.42, s * 0.14, C);
      pineShape(g, bx, by, s * 1.1, C.pine || SNOW_PINE[night ? "night" : "day"]);
      return;
    }
    case "fd_deadwood": {
      const [bx, by, s] = PA(x, y, 0.12);
      shadow(g, bx, by, s * 0.44, s * 0.14, C);
      deadTreeShape(g, bx, by, s, x * 53 + y * 17 + 3, night, now, null);
      // น้ำแข็งเกาะลำต้นด้านรับลม + หิมะกองโคนต้น
      g.strokeStyle = C.frost; g.lineWidth = Math.max(1, s * 0.025); g.lineCap = "round";
      g.beginPath(); g.moveTo(bx - s * 0.11, by - s * 0.08); g.quadraticCurveTo(bx - s * 0.05, by - s * 0.5, bx - s * 0.06, by - s * 0.95); g.stroke();
      g.lineCap = "butt";
      g.fillStyle = C.snow;
      g.beginPath(); g.ellipse(bx, by - s * 0.02, s * 0.3, s * 0.08, 0, 0, TAU); g.fill();
      return;
    }
    default: { const [bx, by, s] = PA(x, y, 0.05); snowRockShape(g, bx, by, s * 1.05, C, x * 31 + y * 7); }
  }
}

// =================================================================== วงความอบอุ่น (บนพื้น ใต้ไฮไลต์)
//  แคช Path2D ต่อกองไฟ ตามมุมกล้อง (P เปลี่ยนเมื่อหมุน/เปลี่ยนมุมก้ม — ซูม/เลื่อนเป็น transform ไม่กระทบ)
const RING_CACHE = new Map();
function ringPaths(f) {
  const a = P(0, 0), b = P(14, 14);
  const k = `${f.x},${f.y}|${f.tiles.length}|${f.tiles[0] || ""}|${viewTurn()}|${pitchOf()}|${Math.round(a[0])},${Math.round(a[1])},${Math.round(b[0])},${Math.round(b[1])}`;
  const hit = RING_CACHE.get(f.id);
  if (hit && hit.k === k) return hit;
  if (typeof Path2D === "undefined") return null;
  const set = new Set(f.tiles), fill = new Path2D(), edge = new Path2D();
  const pt = (x, y) => { const p = P(x, y); return [p[0], p[1]]; };
  for (const t of f.tiles) {
    const [x, y] = t.split(",").map(Number);
    const c = [pt(x, y), pt(x + 1, y), pt(x + 1, y + 1), pt(x, y + 1)];
    fill.moveTo(...c[0]); fill.lineTo(...c[1]); fill.lineTo(...c[2]); fill.lineTo(...c[3]); fill.closePath();
    const sides = [[0, -1, 0, 1], [1, 0, 1, 2], [0, 1, 2, 3], [-1, 0, 3, 0]];
    for (const [dx, dy, i, j] of sides) {
      if (set.has(`${x + dx},${y + dy}`) || (x + dx === f.x && y + dy === f.y)) continue;
      edge.moveTo(...c[i]); edge.lineTo(...c[j]);
    }
  }
  const out = { k, fill, edge };
  RING_CACHE.set(f.id, out);
  if (RING_CACHE.size > 24) RING_CACHE.delete(RING_CACHE.keys().next().value);
  return out;
}
export function ground(g, fd, info, now) {
  const fires = Array.isArray(fd.fires) ? fd.fires : [];
  for (const f of fires) {
    if (!f.lit || !Array.isArray(f.tiles) || !f.tiles.length) continue;
    const r = ringPaths(f);
    if (!r) continue;
    const pulse = 0.5 + 0.5 * Math.sin(now / 700 + f.id);
    g.fillStyle = `rgba(255,150,70,${(0.09 + 0.04 * pulse).toFixed(3)})`; g.fill(r.fill);
    g.strokeStyle = `rgba(255,160,90,${(0.45 + 0.2 * pulse).toFixed(3)})`; g.lineWidth = 1.6; g.stroke(r.edge);
    // แสงอุ่นบนหิมะรอบกองไฟ (บวกแสง — เกาะแสงอุ่นกลางหิมะมืด)
    const [bx, by, s] = PA(f.x, f.y, 0);
    const op = g.globalCompositeOperation;
    g.globalCompositeOperation = "lighter";
    warmGlow(g, bx, by, s * (f.small ? 2.2 : 3.4), s * (f.small ? 1.25 : 1.9), 0.5 + 0.12 * pulse);
    g.globalCompositeOperation = op;
  }
}

// =================================================================== อากาศ + ฉาก (ทับตัวละคร)
// สไปรต์ขอบจอมืด (สร้างครั้งเดียว — วาดยืดเต็มจอทุกเฟรม)
let VIG = null;
function vignetteSprite() {
  if (VIG !== null) return VIG;
  if (typeof document === "undefined") return (VIG = false);
  const cv = document.createElement("canvas");
  cv.width = cv.height = 256;
  const c = cv.getContext("2d");
  const gr = c.createRadialGradient(128, 128, 60, 128, 128, 182);
  gr.addColorStop(0, "rgba(6,12,28,0)"); gr.addColorStop(0.6, "rgba(6,12,28,.35)"); gr.addColorStop(1, "rgba(4,8,20,1)");
  c.fillStyle = gr; c.fillRect(0, 0, 256, 256);
  return (VIG = cv);
}
// หิมะปลิวตามลม (ลมพัดไปทางขวา) · ธารหิมะไหลเลียดพื้น · พายุหิมะ = ริ้วหนาแน่นเร็ว + ลมหอบเป็นแถบ
function snowfall(g, view, now, storm) {
  const W = view.x1 - view.x0, H = view.y1 - view.y0;
  if (storm) {
    g.strokeStyle = "rgba(248,251,255,.8)"; g.lineWidth = 1.5; g.beginPath();
    for (let i = 0; i < 320; i++) {
      const ph = (now / (700 + (i % 9) * 90) + hash(i, 3)) % 1;
      const x = view.x0 + ((hash(i, 4) + ph * 1.1) % 1.25 - 0.12) * W, y = view.y0 + (hash(i, 5) * 0.6 + ph * 0.55) % 1 * H, L = 14 + (i % 5) * 6;
      g.moveTo(x, y); g.lineTo(x - L, y - L * 0.22);
    }
    g.stroke();
    for (let i = 0; i < 5; i++) {
      const ph = (now / (3800 + i * 700) + i * 0.29) % 1, y = view.y0 + (0.12 + i * 0.2) * H + Math.sin(now / 1100 + i) * 30;
      g.fillStyle = "rgba(238,244,250,.16)";
      g.beginPath(); g.ellipse(view.x0 + (1.35 - ph * 1.7) * W, y, W * 0.4, 52, -0.1, 0, TAU); g.fill();
    }
    return;
  }
  // เกล็ดหิมะเฉียงตามลม
  g.fillStyle = "rgba(240,246,255,.9)"; g.beginPath();
  for (let i = 0; i < 110; i++) {
    const ph = (now / (4200 + (i % 7) * 600) + hash(i, 13)) % 1;
    const x = view.x0 + ((hash(i, 14) + ph * 0.55) % 1.1 - 0.05) * W + Math.sin(now / 700 + i) * 6, y = view.y0 + ph * H, r = 0.9 + (i % 4) * 0.5;
    g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU);
  }
  g.fill();
  // ธารหิมะเลียดพื้น (ครึ่งล่างของจอ)
  g.strokeStyle = "rgba(235,242,252,.22)"; g.lineWidth = 2; g.beginPath();
  for (let i = 0; i < 26; i++) {
    const ph = (now / (2600 + (i % 5) * 400) + hash(i, 21)) % 1;
    const x = view.x0 + (ph * 1.4 - 0.2) * W, y = view.y0 + (0.45 + hash(i, 22) * 0.55) * H, L = 40 + hash(i, 23) * 70;
    g.moveTo(x - L, y + 3); g.quadraticCurveTo(x - L * 0.4, y - 4, x, y);
  }
  g.stroke();
}
// น้ำแข็งกัด: แสงฟ้าวาบ + เกล็ดน้ำแข็งแตกกระจายรอบตัว
function frostFx(g, e, t) {
  const n = Math.max(1, e.size | 0), [bx, by, s] = P(e.x + n / 2, e.y + n / 2, 0.5);
  const S = s * n;
  g.fillStyle = `rgba(170,220,255,${(0.5 * (1 - t)).toFixed(3)})`;
  g.beginPath(); g.ellipse(bx, by, S * (0.4 + t * 0.3), S * (0.55 + t * 0.4), 0, 0, TAU); g.fill();
  g.strokeStyle = `rgba(235,248,255,${(1 - t).toFixed(3)})`; g.lineWidth = Math.max(1, s * 0.03);
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU + 0.3, r0 = S * (0.15 + t * 0.3), r1 = S * (0.3 + t * 0.55);
    g.moveTo(bx + Math.cos(a) * r0, by + Math.sin(a) * r0 * 0.8); g.lineTo(bx + Math.cos(a) * r1, by + Math.sin(a) * r1 * 0.8);
  }
  g.stroke();
  if (e.stun) { // ตัวแข็ง: ผลึกน้ำแข็งคลุมเท้า
    const A = "rgba(234,248,255,.9)", B = "rgba(150,205,240,.9)", [fx0, fy0] = P(e.x + n / 2, e.y + n / 2, 0);
    g.globalAlpha = Math.min(1, t * 3) * (1 - Math.max(0, t - 0.7) / 0.3);
    prism(g, fx0, fy0, -S * 0.16, S * 0.32, S * 0.14, -0.3, A, B);
    prism(g, fx0, fy0, S * 0.16, S * 0.28, S * 0.12, 0.35, A, B);
    g.globalAlpha = 1;
  }
}
// หิมะถล่ม: ก้อนหิมะม้วนตัวพุ่งตามแนว + ฝุ่นหิมะค้างทางที่ผ่าน
function avalancheFx(g, e, t, lowQ) {
  const len = Math.max(1, e.len || 1), head = Math.min(1, t / 0.7) * len;
  const fade = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
  const at = (d, z = 0) => P(e.x + 0.5 + e.dx * d, e.y + 0.5 + e.dy * d, z);
  const steps = lowQ ? 6 : 14;
  for (let i = 0; i <= steps; i++) {
    const d = 0.4 + (head - 0.4) * (i / steps);
    if (d < 0.4) continue;
    const [sx, sy, s] = at(d, 0.25), w = 0.5 + 0.4 * (i / steps);
    g.fillStyle = `rgba(${i === steps ? "255,255,255" : "232,240,250"},${(0.75 * fade * (0.5 + 0.5 * i / steps)).toFixed(3)})`;
    g.beginPath(); g.ellipse(sx + Math.sin(i * 2.1 + t * 9) * s * 0.06, sy - s * 0.1, s * w * 0.55, s * w * 0.4, 0, 0, TAU); g.fill();
  }
  // หัวคลื่นหิมะ
  const [hx, hy, hs] = at(head, 0.35);
  g.fillStyle = `rgba(255,255,255,${(0.95 * fade).toFixed(3)})`;
  for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(hx + (hash(k, 1) - 0.5) * hs * 0.6, hy - hs * (0.15 + hash(k, 2) * 0.35), hs * (0.22 + hash(k, 3) * 0.18), 0, TAU); g.fill(); }
  if (!lowQ) {
    g.fillStyle = `rgba(255,255,255,${(0.8 * fade).toFixed(3)})`;
    for (let k = 0; k < 12; k++) {
      const ph = (t * 3 + hash(k, 5)) % 1, [px, py, ps] = at(Math.max(0.4, head - ph * 1.2), 0.3 + ph * 0.8);
      g.beginPath(); g.arc(px + (hash(k, 6) - 0.5) * ps * 0.8, py, Math.max(1, ps * 0.03), 0, TAU); g.fill();
    }
  }
}
function chopFx(g, e, t, lowQ) {
  const [bx, by, s] = PA(e.x, e.y, 0, 0.45);
  g.strokeStyle = `rgba(255,255,255,${(0.8 * (1 - t)).toFixed(3)})`; g.lineWidth = Math.max(1.5, s * 0.04);
  g.beginPath(); g.arc(bx, by, s * (0.15 + t * 0.3), -0.8, 0.8); g.stroke();
  if (lowQ) return;
  g.fillStyle = "#c79a62";
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (hash(i, e.seq) - 0.5) * 2.4, v = s * (0.4 + hash(i, 2) * 0.4);
    g.globalAlpha = 1 - t;
    g.fillRect(bx + Math.cos(a) * v * t, by + Math.sin(a) * v * t + s * 0.8 * t * t, Math.max(1.5, s * 0.04), Math.max(1, s * 0.025));
  }
  g.globalAlpha = 1;
}
function igniteFx(g, e, t) {
  const [bx, by, s] = PA(e.x, e.y, 0, 0.2);
  warmGlow(g, bx, by, s * (0.6 + t * 1.8), s * (0.5 + t * 1.2), 1 - t);
  g.strokeStyle = `rgba(255,200,120,${(0.8 * (1 - t)).toFixed(3)})`; g.lineWidth = 2;
  g.beginPath(); g.ellipse(bx, by + s * 0.15, s * (0.2 + t * 0.9), s * (0.08 + t * 0.35), 0, 0, TAU); g.stroke();
}
function fireoutFx(g, e, t, now) {
  const [bx, by, s] = PA(e.x, e.y, 0);
  g.globalAlpha = 1 - t;
  smoke(g, bx, by - s * t * 0.4, s * (1 + t), now, e.seq, 5, "rgba(150,158,170,");
  g.globalAlpha = 1;
}

export function air(g, fd, info, units, now, lowQ, view) {
  const storm = !!(fd.weather && fd.weather.kind === "blizzard");
  // แสงไฟอุ่นสาดทับตัวละครที่ยืนใกล้กองไฟ (บวกแสงจางๆ)
  const fires = Array.isArray(fd.fires) ? fd.fires : [];
  if (fires.length) {
    const op = g.globalCompositeOperation;
    g.globalCompositeOperation = "lighter";
    for (const f of fires) {
      if (!f.lit) continue;
      const [bx, by, s] = PA(f.x, f.y, 0, 0.4);
      warmGlow(g, bx, by, s * (f.small ? 1.4 : 2), s * (f.small ? 1 : 1.4), 0.16 + 0.04 * Math.sin(now / 110 + f.id));
    }
    g.globalCompositeOperation = op;
  }
  if (view) {
    const W = view.x1 - view.x0, H = view.y1 - view.y0;
    // พายุหิมะ = ขาวโพลน
    if (storm) { g.fillStyle = "rgba(214,224,236,.42)"; g.fillRect(view.x0, view.y0, W, H); }
    if (!lowQ) snowfall(g, view, now, storm);
    // ขอบจอมืดเย็น (พายุ = มืดกว่า)
    const v = vignetteSprite();
    if (v) { const pa = g.globalAlpha; g.globalAlpha = storm ? 0.85 : 0.5; g.drawImage(v, view.x0 - W * 0.05, view.y0 - H * 0.05, W * 1.1, H * 1.1); g.globalAlpha = pa; }
  }
  for (const e of fxActive(fd, now)) {
    if (fxOnce(e) && SFX[e.kind]) fodlanAudio().sfx(SFX[e.kind]);
    const t = fxT(e, now, fx[e.kind] || 1000);
    if (e.kind === "frostbite") frostFx(g, e, t);
    else if (e.kind === "avalanche") avalancheFx(g, e, t, lowQ);
    else if (e.kind === "chop") chopFx(g, e, t, lowQ);
    else if (e.kind === "ignite") igniteFx(g, e, t);
    else if (e.kind === "fireout") fireoutFx(g, e, t, now);
  }
}
