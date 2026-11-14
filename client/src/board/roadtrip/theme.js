// ============================================================
//  ธีมกระดานโหมด Road Trip (GRID_PLAN §8.8 · .claude/plans/roadtrip-contract.md) — area 70–75
//  ภูมิภาค 5 แบบ (plains ทุ่งหญ้า · desert ทะเลทราย · forest ป่า · snow หิมะ · ghost เมืองร้าง) × กลางวัน/กลางคืน
//  ทุกอย่างที่ขึ้นกับภูมิภาควาดใน base (ชั้นกระดาน — กุญแจอบรวม mapSignature ที่ต่อท้ายภูมิภาคแล้ว: boardDraw.mapSignature)
//   ชั้นฉาก (bakeScene — กุญแจไม่รู้ภูมิภาค) จึงเหลือแค่สีพื้นเรียบ แล้ว base ทาฟ้า/ขอบฟ้า/พื้นรอบนอก/ถนนต่อออกนอกกระดาน/ของข้างทางทับทั้งจอ
//  deco = เส้นถนน/ช่องจอดทาสี (ทับเส้นตาราง) · ambient = หิมะ ฝุ่น หิ่งห้อย ดวงไฟผี (ทุกเฟรม · lowQ ข้าม)
//  ภูมิภาค/กลางคืน/เหตุการณ์ อ่านจาก setRoadtripState(state.roadtrip) (เรียกจากหน้าที่มี state) หรือ map.rtRegion
// ============================================================
import { P, customProjection, gEllipse, glow, quad, rng, viewAxes } from "../boardGeo";
import { cactusShape, deadTreeShape, drawTree, pineShape, SNOW_PINE } from "../boardProps";
import { RT_DEFS } from "./maps.gen";

const TAU = Math.PI * 2;
export const RT_AREA0 = 70, RT_AREA1 = 75;
export const isRtArea = (area) => Number(area) >= RT_AREA0 && Number(area) <= RT_AREA1;
export const REGIONS = ["plains", "desert", "forest", "snow", "ghost"];

// ---------------------------------------------------------------- สถานะกลาง (state.roadtrip ล่าสุด)
const RT = { region: "plains", night: false, fx: [], acts: {}, phase: null, van: null };
export function setRoadtripState(rt) {
  if (!rt) return;
  const id = rt.region && (rt.region.id || rt.region);
  if (REGIONS.includes(id)) RT.region = id;
  RT.night = !!rt.night;
  RT.fx = Array.isArray(rt.fx) ? rt.fx : [];
  RT.acts = (rt.stop && rt.stop.acts) || {};
  RT.phase = rt.phase || null;
  RT.van = rt.van || null;
}
export const rtState = () => RT;
export function rtRegionOf(info) {
  const r = info && info.rtRegion;
  return REGIONS.includes(r) ? r : RT.region;
}
export const rtDefOf = (area) => RT_DEFS[area] || null;

// ---------------------------------------------------------------- พาเลต
//  ground1/2 = พื้นรอบนอก · grass/grass2 = ข้างทาง · tuft = กอหญ้า · asphalt/asphalt2 = ถนน · paint/paintY = เส้นขาว/เหลือง
//  gravel = ไหล่ทาง · lot/lot2 = ลานคอนกรีต · joint = รอยต่อพื้น · curb = ขอบทางเท้า · sky = ฟ้าบน→ล่าง · far/mid = ภูเขา/ฉากไกล
const BASE_DAY = { tile: "rgba(40,40,30,.03)", tile2: "rgba(40,40,30,.075)", grid: "rgba(40,36,30,.13)", border: "rgba(255,255,255,.55)", spawn: "rgba(255,255,255,.55)", light: ["rgba(255,248,225,.10)", "rgba(30,30,50,.10)"], nightTint: null, shadow: "rgba(30,40,30,.22)", paint: "#f4f1e6", paintY: "#f2c84b" };
const BASE_NIGHT = { tile: "rgba(200,220,255,.03)", tile2: "rgba(200,220,255,.07)", grid: "rgba(190,210,255,.12)", border: "rgba(190,210,255,.4)", spawn: "rgba(200,220,255,.45)", light: ["rgba(120,150,255,.05)", "rgba(0,4,20,.30)"], nightTint: "rgba(8,14,40,.18)", shadow: "rgba(0,6,24,.42)", paint: "#c9cfdc", paintY: "#c9a64a" };
const PAL = {
  plains: {
    day: { ground1: "#b3d391", ground2: "#97bf78", grass: "#a6cb86", grass2: "#94bd74", tuft: "#7aa75c", flower: ["#ffffff", "#ffd84d", "#f58fb8"], asphalt: "#5b6068", asphalt2: "#51565d", gravel: "#b9b3a3", lot: "#dedbd2", lot2: "#d2cec4", joint: "rgba(90,80,60,.16)", curb: "#eeebe3", sky: ["#8fc7f0", "#cfe7f8", "#eef6f7"], far: "#a9c8d8", mid: "#8fb87a", near: "#7ea86a", stain: "rgba(40,40,45,.10)" },
    night: { ground1: "#2c4a3c", ground2: "#1f362d", grass: "#2b4a3a", grass2: "#25402f", tuft: "#1d3428", flower: ["#cfd8e8", "#d8c88a", "#c8a0b8"], asphalt: "#2b2f37", asphalt2: "#262a31", gravel: "#4a4d55", lot: "#5f636c", lot2: "#575b64", joint: "rgba(0,0,10,.25)", curb: "#6c717b", sky: ["#081530", "#142a52", "#27406a"], far: "#1d2f4c", mid: "#1b3530", near: "#16302a", stain: "rgba(0,0,0,.18)" },
  },
  desert: {
    day: { ground1: "#ecd3a0", ground2: "#ddbd86", grass: "#e9cf9c", grass2: "#dfc28c", tuft: "#b9a05e", flower: ["#e66b4a", "#f2c84b", "#ffffff"], asphalt: "#6b6762", asphalt2: "#625e59", gravel: "#cdb48c", lot: "#e8dccb", lot2: "#ddd0bc", joint: "rgba(120,90,50,.16)", curb: "#f1e8da", sky: ["#6fb4e6", "#bfe0f3", "#fbe8c4"], far: "#e0a679", mid: "#cd8a5c", near: "#b8754a", stain: "rgba(70,50,30,.12)" },
    night: { ground1: "#4a4256", ground2: "#352f42", grass: "#4a425a", grass2: "#433b52", tuft: "#3a3346", flower: ["#b07a7a", "#c0a868", "#cfd0e0"], asphalt: "#2e2c33", asphalt2: "#28262d", gravel: "#5a5262", lot: "#67606e", lot2: "#5e5866", joint: "rgba(0,0,10,.25)", curb: "#746d7c", sky: ["#0d0f2c", "#2a2650", "#5a4a6e"], far: "#3d3456", mid: "#352c48", near: "#2c243c", stain: "rgba(0,0,0,.2)" },
  },
  forest: {
    day: { ground1: "#8fb874", ground2: "#749d5c", grass: "#87b06a", grass2: "#79a35d", tuft: "#5d8a45", flower: ["#ffffff", "#e8d36a", "#c99be8"], asphalt: "#50555d", asphalt2: "#484d54", gravel: "#a69f8d", lot: "#d3d0c6", lot2: "#c8c4b9", joint: "rgba(70,70,50,.16)", curb: "#e4e1d8", sky: ["#94c9e0", "#cde6ea", "#e8f2e6"], far: "#87a99c", mid: "#4f7d55", near: "#3f6b45", stain: "rgba(30,40,30,.12)", leaf: ["#c98a3c", "#a8b84a", "#d6a24a"] },
    night: { ground1: "#203a30", ground2: "#162a22", grass: "#1f3a2c", grass2: "#1a3326", tuft: "#132a1e", flower: ["#c8d0e0", "#c8bb7a", "#a890c0"], asphalt: "#262a30", asphalt2: "#21252b", gravel: "#43473f", lot: "#565a5a", lot2: "#4f5353", joint: "rgba(0,0,10,.25)", curb: "#62676a", sky: ["#061224", "#102440", "#1d3a4a"], far: "#17293a", mid: "#12261e", near: "#0e1f18", stain: "rgba(0,0,0,.2)", leaf: ["#5a4a2c", "#4a5530", "#5c4a30"] },
  },
  snow: {
    day: { ground1: "#eef3f8", ground2: "#d9e3ee", grass: "#f2f6fa", grass2: "#e4ebf3", tuft: "#c7d4e2", flower: ["#ffffff", "#d8e8ff", "#b8d0ea"], asphalt: "#5f6772", asphalt2: "#58606a", gravel: "#c3ccd6", lot: "#e6eaef", lot2: "#dbe0e7", joint: "rgba(80,100,130,.16)", curb: "#f7f9fb", sky: ["#9ec0de", "#d4e3ef", "#f1f5f8"], far: "#c9d8e8", mid: "#a9bfd6", near: "#8fa8c2", stain: "rgba(60,70,90,.10)" },
    night: { ground1: "#4a5a74", ground2: "#38475e", grass: "#56678a", grass2: "#4c5c7c", tuft: "#3f4d68", flower: ["#dce8ff", "#b8c8e8", "#ffffff"], asphalt: "#2c323d", asphalt2: "#272c36", gravel: "#4f5a6c", lot: "#6a7488", lot2: "#626c80", joint: "rgba(0,0,20,.22)", curb: "#7a849a", sky: ["#0a1430", "#1c2c55", "#3a4f78"], far: "#3c4c70", mid: "#33425f", near: "#2a3850", stain: "rgba(0,0,20,.18)" },
  },
  ghost: {
    day: { ground1: "#a39e8c", ground2: "#8a8676", grass: "#9c977f", grass2: "#8f8a74", tuft: "#77725f", flower: ["#d8d0c0", "#a89aa8", "#8f8070"], asphalt: "#4d4c53", asphalt2: "#45444b", gravel: "#8c8780", lot: "#bcb8af", lot2: "#b0aca3", joint: "rgba(50,40,40,.22)", curb: "#cbc7bf", sky: ["#8a83a6", "#b8aec2", "#dcd0cf"], far: "#8f88a2", mid: "#6e6880", near: "#5a5468", stain: "rgba(40,30,40,.16)" },
    night: { ground1: "#2e2a3a", ground2: "#221f2c", grass: "#332f40", grass2: "#2c2938", tuft: "#24212e", flower: ["#8a80a8", "#6f6890", "#a8a0c0"], asphalt: "#1f1e26", asphalt2: "#1b1a21", gravel: "#3a3744", lot: "#4a4756", lot2: "#43404e", joint: "rgba(0,0,0,.3)", curb: "#555262", sky: ["#08061a", "#1c1636", "#3a2c4e"], far: "#2a2240", mid: "#211a34", near: "#1a1428", stain: "rgba(0,0,0,.25)" },
  },
};
for (const r of REGIONS) { PAL[r].day = { ...BASE_DAY, ...PAL[r].day }; PAL[r].night = { ...BASE_NIGHT, ...PAL[r].night }; }
export const rtPal = (region, night) => (PAL[region] || PAL.plains)[night ? "night" : "day"];

// สีกลางคืนของวัตถุ: ผสมเข้าหาน้ำเงินเข้ม (แคชต่อสี)
const NC = new Map();
export function nightColor(hex, night, k = 0.5) {
  if (!night || typeof hex !== "string" || hex[0] !== "#") return hex;
  const id = hex + k;
  let c = NC.get(id);
  if (!c) {
    const n = parseInt(hex.length === 4 ? hex.slice(1).split("").map((h) => h + h).join("") : hex.slice(1), 16);
    const r = n >> 16, g = (n >> 8) & 255, b = n & 255, t = [34, 44, 78];
    c = `rgb(${Math.round(r * (1 - k) * 0.82 + t[0] * k)},${Math.round(g * (1 - k) * 0.82 + t[1] * k)},${Math.round(b * (1 - k) * 0.9 + t[2] * k)})`;
    NC.set(id, c);
  }
  return c;
}

// ---------------------------------------------------------------- ตัวช่วยวาดบนพื้น (พิกัดกระดาน — หมุนตามกระดาน)
function rectG(g, x0, y0, x1, y1, z = 0) {
  const a = P(x0, y0, z), b = P(x1, y0, z), c = P(x1, y1, z), d = P(x0, y1, z);
  g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath();
}
// แถบยาวที่ต่อออกนอกกระดาน: ตัดเป็นท่อนละ 4 ช่อง · ท่อนที่มีมุมอยู่หลังกล้อง (หมุนมุมมองแล้วถนนพุ่งเข้าหากล้อง) = ข้าม
function fillRect(g, x0, y0, x1, y1, fill) {
  g.fillStyle = fill;
  const ok = (x, y) => P(x, y)[2] > 0.05;
  if (x1 - x0 <= 4.01) { if (ok(x0, y0) && ok(x1, y0) && ok(x1, y1) && ok(x0, y1)) { rectG(g, x0, y0, x1, y1); g.fill(); } return; }
  g.beginPath();
  for (let x = x0; x < x1; x += 4) {
    const xb = Math.min(x1, x + 4.02);
    if (!(ok(x, y0) && ok(xb, y0) && ok(xb, y1) && ok(x, y1))) continue;
    const a = P(x, y0), b = P(xb, y0), c = P(xb, y1), d = P(x, y1);
    g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath();
  }
  g.fill();
}
function lineG(g, x0, y0, x1, y1, col, w) {
  const a = P(x0, y0), b = P(x1, y1);
  g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
}
// เส้นประตามแกน x ที่แถว y (ขยับได้ด้วย off — ถนนบนรถตู้เลื่อน)
export function dashRow(g, x0, x1, y, col, w = 0.09, len = 0.9, gap = 0.7, off = 0) {
  g.fillStyle = col;
  const step = len + gap;
  for (let x = x0 - step + (((off % step) + step) % step); x < x1; x += step) {
    const a = Math.max(x0, x), b = Math.min(x1, x + len);
    if (b > a && P(a, y)[2] > 0.05 && P(b, y)[2] > 0.05) { rectG(g, a, y - w / 2, b, y + w / 2); g.fill(); }
  }
}

// ---------------------------------------------------------------- ฉากรอบนอก (ใน base)
function skyAndHorizon(c, region, C) {
  const { g, VX0, VY0, VX1, VY1, info, night } = c, VW = VX1 - VX0;
  const cs = [P(0, 0), P(info.cols, 0), P(info.cols, info.rows), P(0, info.rows)];
  const bY = Math.min(...cs.map((p) => p[1])) - 6;
  // พื้นรอบนอก
  const gr0 = g.createLinearGradient(0, bY, 0, VY1);
  gr0.addColorStop(0, C.ground2); gr0.addColorStop(1, C.ground1);
  g.fillStyle = gr0; g.fillRect(VX0, bY - 30, VW, VY1 - bY + 30);
  // ฟ้า
  const gr = g.createLinearGradient(0, VY0, 0, bY);
  C.sky.forEach((col, i) => gr.addColorStop(i / (C.sky.length - 1), col));
  g.fillStyle = gr; g.fillRect(VX0, VY0, VW, bY - VY0 + 1);
  const R = rng(region.length * 97 + 13);
  if (night) {
    for (let i = 0; i < 90; i++) { g.globalAlpha = 0.3 + R() * 0.6; g.fillStyle = "#fffbe8"; g.fillRect(VX0 + R() * VW, VY0 + R() * (bY - VY0) * 0.85, 1.6, 1.6); }
    g.globalAlpha = 1;
    const mx = VX0 + VW * 0.78, my = VY0 + (bY - VY0) * 0.3;
    glow(g, mx, my, 70, region === "ghost" ? "255,200,220" : "220,230,255", 0.35);
    g.fillStyle = region === "ghost" ? "#f4d8e0" : "#f6f3e4"; g.beginPath(); g.arc(mx, my, 16, 0, TAU); g.fill();
    g.fillStyle = C.sky[1]; g.beginPath(); g.arc(mx + 7, my - 4, 14, 0, TAU); g.fill();
  } else {
    const sx = VX0 + VW * (region === "desert" ? 0.7 : 0.18), sy = VY0 + (bY - VY0) * 0.32;
    glow(g, sx, sy, region === "desert" ? 130 : 90, "255,244,200", region === "desert" ? 0.7 : 0.45);
    // เมฆ
    for (let i = 0; i < (region === "desert" ? 2 : 5); i++) {
      const cx = VX0 + R() * VW, cy = VY0 + (bY - VY0) * (0.18 + R() * 0.45), w = 40 + R() * 60;
      g.fillStyle = region === "ghost" ? "rgba(225,215,225,.55)" : "rgba(255,255,255,.8)";
      for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(cx + (k - 1.5) * w * 0.3, cy - (k % 2) * 6, w * 0.32, 10 + (k % 2) * 5, 0, 0, TAU); g.fill(); }
    }
  }
  // ฉากไกลตามภูมิภาค (ภาพเงา 2 ชั้น)
  const ridge = (base, amp, col, seed, step, sharp) => {
    const r = rng(seed);
    g.fillStyle = col; g.beginPath(); g.moveTo(VX0 - 10, bY + 8);
    let y = base;
    for (let x = VX0 - 10; x <= VX1 + 40; x += step) {
      y = sharp ? base - r() * amp : base - amp * 0.5 - Math.sin(x / 140 + seed) * amp * 0.35 - r() * amp * 0.25;
      g.lineTo(x, y);
    }
    g.lineTo(VX1 + 40, bY + 8); g.closePath(); g.fill();
  };
  if (region === "plains") { ridge(bY - 4, 46, C.far, 3, 30, false); ridge(bY + 2, 22, C.mid, 7, 24, false); }
  else if (region === "desert") {
    ridge(bY + 2, 14, C.mid, 5, 40, false);
    // เมซา (ภูเขาหัวตัด)
    const r = rng(9);
    for (let i = 0; i < 6; i++) {
      const x = VX0 + r() * VW, w = 60 + r() * 120, h = 30 + r() * 50;
      g.fillStyle = i % 2 ? C.far : C.mid;
      g.beginPath(); g.moveTo(x - w / 2 - 14, bY + 4); g.lineTo(x - w / 2, bY - h); g.lineTo(x + w / 2, bY - h); g.lineTo(x + w / 2 + 14, bY + 4); g.closePath(); g.fill();
      g.fillStyle = "rgba(0,0,0,.1)"; g.fillRect(x + w * 0.15, bY - h, w * 0.35, h + 4);
    }
  } else if (region === "forest") {
    ridge(bY - 10, 50, C.far, 4, 50, false);
    const r = rng(17), pal = night ? { green: C.mid, dark: C.near, snow: null, trunk: C.near } : { green: C.mid, dark: C.near, snow: null, trunk: C.near };
    for (let x = VX0 - 20; x < VX1 + 20; x += 9 + r() * 10) pineShape(g, x, bY + 4 + r() * 4, 18 + r() * 20, pal);
  } else if (region === "snow") {
    const r = rng(23);
    for (let i = 0; i < 7; i++) {
      const x = VX0 + r() * VW, w = 140 + r() * 160, h = 50 + r() * 70;
      g.fillStyle = i % 2 ? C.far : C.mid;
      g.beginPath(); g.moveTo(x - w / 2, bY + 6); g.lineTo(x, bY - h); g.lineTo(x + w / 2, bY + 6); g.closePath(); g.fill();
      g.fillStyle = night ? "rgba(220,230,255,.55)" : "rgba(255,255,255,.92)";
      g.beginPath(); g.moveTo(x - w * 0.12, bY - h * 0.75); g.lineTo(x, bY - h); g.lineTo(x + w * 0.12, bY - h * 0.75); g.lineTo(x + w * 0.04, bY - h * 0.7); g.lineTo(x - w * 0.03, bY - h * 0.78); g.closePath(); g.fill();
    }
    const pal = { ...SNOW_PINE[night ? "night" : "day"] };
    for (let x = VX0 - 20; x < VX1 + 20; x += 14 + r() * 16) pineShape(g, x, bY + 6 + r() * 4, 16 + r() * 16, pal);
  } else {
    // เมืองร้าง: ตึกเงา หน้าต่างแตก เสาไฟเอียง
    const r = rng(31);
    ridge(bY - 2, 24, C.far, 6, 36, false);
    for (let x = VX0 - 30; x < VX1 + 30;) {
      const w = 24 + r() * 40, h = 24 + r() * 70;
      g.fillStyle = r() < 0.5 ? C.mid : C.near; g.fillRect(x, bY - h + 4, w, h);
      // หลังคาพัง
      g.beginPath(); g.moveTo(x, bY - h + 4); g.lineTo(x + w * 0.4, bY - h - 6 * r()); g.lineTo(x + w * 0.6, bY - h + 8); g.lineTo(x + w, bY - h + 2); g.lineTo(x + w, bY - h + 6); g.lineTo(x, bY - h + 6); g.fill();
      for (let k = 0; k < 4; k++) if (r() < 0.45) { g.fillStyle = night && r() < 0.35 ? "rgba(255,190,120,.8)" : "rgba(0,0,0,.25)"; g.fillRect(x + 4 + r() * (w - 10), bY - h + 10 + r() * (h - 20), 4, 5); }
      x += w + 6 + r() * 30;
    }
  }
  return bY;
}

// ของข้างทางนอกกระดาน (ต้นไม้/หิน/เสาไฟฟ้า) — ไม่วางบนแถวถนนที่ต่อออกไป
function sideDecor(c, region, C, def) {
  const { g, info, night, VX0, VX1 } = c;
  const R = rng(region.length * 31 + info.area * 7);
  const road = def && def.rt && def.rt.road, sh = def && def.rt && def.rt.shoulder;
  const lo = road ? Math.min(road[0], sh ? sh[0] : road[0]) - 0.6 : 99, hi = road ? Math.max(road[1], sh ? sh[1] : road[1]) + 1.6 : -99;
  const list = [];
  const W = info.cols, H = info.rows;
  for (let i = 0; i < 70; i++) {
    let x, y;
    const side = R();
    if (side < 0.38) { x = -2.1 - R() * 6.5; y = -3 + R() * (H + 6); }
    else if (side < 0.76) { x = W + 2.1 + R() * 6.5; y = -3 + R() * (H + 6); }
    else { x = -4 + R() * (W + 8); y = -2.1 - R() * 3.2; }
    if (y > lo && y < hi) continue;
    list.push([x, y, R(), R()]);
  }
  // เสาไฟฟ้าเรียงแนวถนน (ฝั่งไกล)
  if (road) for (let x = -10; x <= W + 10; x += 5) if (x < 0 || x > W) list.push([x + 0.3, lo - 0.3, -1, 0]);
  list.sort((a, b) => a[1] - b[1]);
  for (const [x, y, r, r2] of list) {
    const [sx, sy, s] = P(x, y);
    if (!(s > 0) || sx < VX0 - 60 || sx > VX1 + 60) continue;
    g.fillStyle = C.shadow; g.beginPath(); g.ellipse(sx, sy, s * 0.4, s * 0.12, 0, 0, TAU); g.fill();
    if (r === -1) { // เสาไฟฟ้า
      const top = sy - s * 2.6;
      g.fillStyle = night ? "#3a3530" : "#8a7258"; g.fillRect(sx - s * 0.04, top, s * 0.08, sy - top);
      g.fillRect(sx - s * 0.32, top + s * 0.12, s * 0.64, s * 0.05);
      continue;
    }
    if (region === "plains") {
      if (r < 0.55) drawTree(g, sx, sy, s * (0.9 + r2 * 0.6), { c1: C.mid, c2: C.near, c3: night ? "#2a4a3a" : "#b4d69b", trunk: night ? "#3a3028" : "#8b7355", shadow: C.shadow });
      else if (r < 0.8) { g.fillStyle = C.tuft; for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(sx + (k - 2) * s * 0.08, sy - s * 0.06, s * 0.05, s * 0.14, (k - 2) * 0.2, 0, TAU); g.fill(); } }
      else { g.fillStyle = night ? "#4a4f58" : "#a9a69c"; g.beginPath(); g.ellipse(sx, sy - s * 0.12, s * 0.3, s * 0.2, 0, 0, TAU); g.fill(); }
    } else if (region === "desert") {
      if (r < 0.5) cactusShape(g, sx, sy, s * (0.8 + r2 * 0.6), night);
      else if (r < 0.75) { g.fillStyle = night ? "#3a3346" : "#c99a68"; g.beginPath(); g.ellipse(sx, sy - s * 0.15, s * 0.36, s * 0.24, 0, 0, TAU); g.fill(); g.fillStyle = night ? "#463d54" : "#ddb27e"; g.beginPath(); g.ellipse(sx - s * 0.08, sy - s * 0.22, s * 0.2, s * 0.12, 0, 0, TAU); g.fill(); }
      else { // หัวกะโหลกวัว/ไม้แห้ง
        g.strokeStyle = night ? "#6a6070" : "#8b6a4a"; g.lineWidth = Math.max(1, s * 0.04); g.beginPath(); g.moveTo(sx - s * 0.3, sy); g.lineTo(sx + s * 0.1, sy - s * 0.4); g.moveTo(sx, sy - s * 0.2); g.lineTo(sx + s * 0.3, sy - s * 0.3); g.stroke();
      }
    } else if (region === "forest") {
      pineShape(g, sx, sy, s * (1.3 + r2 * 0.9), { green: night ? "#163024" : "#3a6b40", dark: night ? "#0f241a" : "#2c5532", snow: null, trunk: night ? "#21160f" : "#5a3e2a" });
    } else if (region === "snow") {
      if (r < 0.7) pineShape(g, sx, sy, s * (1.2 + r2 * 0.8), SNOW_PINE[night ? "night" : "day"]);
      else { g.fillStyle = night ? "#7f8ca8" : "#ffffff"; g.beginPath(); g.ellipse(sx, sy - s * 0.1, s * 0.42, s * 0.2, 0, Math.PI, TAU); g.fill(); }
    } else {
      if (r < 0.5) deadTreeShape(g, sx, sy, s * (0.9 + r2 * 0.6), Math.round(x * 13 + y * 7), night, 0, null);
      else if (r < 0.75) { // ป้ายหลุมศพ
        g.fillStyle = night ? "#4a4658" : "#9a958a"; g.beginPath(); g.moveTo(sx - s * 0.16, sy); g.lineTo(sx - s * 0.16, sy - s * 0.35); g.arc(sx, sy - s * 0.35, s * 0.16, Math.PI, TAU); g.lineTo(sx + s * 0.16, sy); g.fill();
      } else { g.fillStyle = night ? "#3a3644" : "#7d7868"; g.fillRect(sx - s * 0.3, sy - s * 0.3, s * 0.6, s * 0.3); g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(sx - s * 0.2, sy - s * 0.24, s * 0.12, s * 0.1); }
    }
  }
}

// ---------------------------------------------------------------- พื้นบนกระดาน
function groundTexture(g, R, x0, y0, x1, y1, region, C, n) {
  for (let i = 0; i < n; i++) {
    const x = x0 + R() * (x1 - x0), y = y0 + R() * (y1 - y0), [sx, sy, s] = P(x, y), r = R();
    if (!(s > 0)) continue;
    if (region === "desert") { g.strokeStyle = r < 0.5 ? "rgba(255,240,210,.35)" : "rgba(150,110,60,.18)"; g.lineWidth = 1; g.beginPath(); g.moveTo(sx - s * 0.2, sy); g.quadraticCurveTo(sx, sy - s * 0.05, sx + s * 0.2, sy); g.stroke(); }
    else if (region === "snow") { g.fillStyle = r < 0.5 ? "rgba(255,255,255,.7)" : "rgba(170,190,215,.25)"; g.beginPath(); g.ellipse(sx, sy, s * (0.08 + r * 0.14), s * 0.04, 0, 0, TAU); g.fill(); }
    else {
      g.fillStyle = r < 0.08 ? C.flower[(r * 37 | 0) % C.flower.length] : C.tuft;
      if (r < 0.08) { g.beginPath(); g.arc(sx, sy - s * 0.03, Math.max(1, s * 0.025), 0, TAU); g.fill(); }
      else { g.beginPath(); g.moveTo(sx - s * 0.04, sy); g.lineTo(sx - s * 0.01, sy - s * 0.1); g.lineTo(sx + s * 0.01, sy); g.lineTo(sx + s * 0.04, sy - s * 0.08); g.lineTo(sx + s * 0.05, sy); g.fill(); }
      if (region === "forest" && r > 0.9) { g.fillStyle = C.leaf[(r * 91 | 0) % 3]; g.beginPath(); g.ellipse(sx, sy, s * 0.04, s * 0.02, r * 6, 0, TAU); g.fill(); }
    }
  }
}
function asphalt(g, R, x0, y0, x1, y1, C, region, n) {
  fillRect(g, x0, y0, x1, y1, C.asphalt);
  for (let i = 0; i < n; i++) {
    const x = x0 + R() * (x1 - x0), y = y0 + R() * (y1 - y0), [sx, sy, s] = P(x, y);
    if (!(s > 0)) continue;
    const r = R();
    if (r < 0.75) { g.fillStyle = r < 0.4 ? C.asphalt2 : "rgba(255,255,255,.06)"; g.fillRect(sx, sy, Math.max(1, s * 0.03), Math.max(1, s * 0.02)); }
    else if (r < 0.85) { g.fillStyle = C.stain; g.beginPath(); g.ellipse(sx, sy, s * (0.2 + R() * 0.3), s * (0.06 + R() * 0.06), 0, 0, TAU); g.fill(); }
    else if (r < 0.92 || region === "ghost") { // รอยร้าว
      g.strokeStyle = "rgba(0,0,0,.22)"; g.lineWidth = 1; g.beginPath(); let px = x, py = y, p = P(px, py); g.moveTo(p[0], p[1]);
      for (let k = 0; k < 4; k++) { px += (R() - 0.5) * 0.5; py += (R() - 0.5) * 0.3; p = P(px, py); g.lineTo(p[0], p[1]); } g.stroke();
    }
  }
  if (region === "snow") for (let i = 0; i < n / 5; i++) { // หิมะเกาะขอบถนน
    const x = x0 + R() * (x1 - x0), y = R() < 0.5 ? y0 + R() * 0.35 : y1 - R() * 0.35, [sx, sy, s] = P(x, y);
    g.fillStyle = "rgba(240,246,252,.55)"; g.beginPath(); g.ellipse(sx, sy, s * (0.2 + R() * 0.4), s * 0.05, 0, 0, TAU); g.fill();
  }
  if (region === "desert") for (let i = 0; i < n / 6; i++) { // ทรายพัดเข้าถนน
    const x = x0 + R() * (x1 - x0), y = R() < 0.5 ? y0 + R() * 0.5 : y1 - R() * 0.5, [sx, sy, s] = P(x, y);
    g.fillStyle = "rgba(225,195,140,.35)"; g.beginPath(); g.ellipse(sx, sy, s * (0.3 + R() * 0.5), s * 0.06, 0, 0, TAU); g.fill();
  }
}
function concrete(g, R, x0, y0, x1, y1, C, region) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { quad(g, x, y); g.fillStyle = ((x >> 1) + (y >> 1)) % 2 ? C.lot2 : C.lot; g.fill(); }
  // รอยต่อแผ่นพื้นทุก 2 ช่อง
  g.strokeStyle = C.joint; g.lineWidth = 1.2;
  for (let x = x0; x <= x1; x += 2) { const a = P(x, y0), b = P(x, y1); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  for (let y = y0; y <= y1; y += 2) { const a = P(x0, y), b = P(x1, y); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  const n = (x1 - x0) * (y1 - y0);
  for (let i = 0; i < n * 0.35; i++) {
    const x = x0 + R() * (x1 - x0), y = y0 + R() * (y1 - y0), [sx, sy, s] = P(x, y), r = R();
    if (r < 0.25) { g.fillStyle = C.stain; g.beginPath(); g.ellipse(sx, sy, s * (0.12 + R() * 0.25), s * (0.05 + R() * 0.08), 0, 0, TAU); g.fill(); }
    else if (r < 0.4 || (region === "ghost" && r < 0.7)) {
      g.strokeStyle = "rgba(60,50,40,.2)"; g.lineWidth = 1; g.beginPath(); let px = x, py = y, p = P(px, py); g.moveTo(p[0], p[1]);
      for (let k = 0; k < 3; k++) { px += (R() - 0.5) * 0.6; py += (R() - 0.5) * 0.4; p = P(px, py); g.lineTo(p[0], p[1]); } g.stroke();
      if (region === "ghost") { g.fillStyle = C.tuft; g.fillRect(p[0], p[1] - 3, 2, 3); }
    } else if (region === "snow" && r < 0.6) { g.fillStyle = "rgba(255,255,255,.6)"; g.beginPath(); g.ellipse(sx, sy, s * (0.2 + R() * 0.3), s * 0.08, 0, 0, TAU); g.fill(); }
    else if (region === "desert" && r < 0.6) { g.fillStyle = "rgba(220,190,130,.35)"; g.beginPath(); g.ellipse(sx, sy, s * (0.2 + R() * 0.3), s * 0.06, 0, 0, TAU); g.fill(); }
    else if (region === "forest" && r < 0.55) { g.fillStyle = C.leaf[(r * 91 | 0) % 3]; g.beginPath(); g.ellipse(sx, sy, s * 0.04, s * 0.02, r * 6, 0, TAU); g.fill(); }
  }
}

// ขอบลานจุดพัก (นอกกระดาน — ไม่ใช่ด้านถนน): ขอบคันหิน + แนวหญ้า/ดอกไม้ + รั้วเตี้ย + เสาไฟ — ลานไม่เป็นสี่เหลี่ยมโล่ง
function lotBorder(g, C, region, info, rt, night) {
  const W = info.cols, H = info.rows, [lx0, ly0, lx1, ly1] = rt.lot, R = rng(info.area * 17 + 5);
  const edges = []; // [x0, y0, x1, y1, nx, ny] เส้นขอบ + ทิศออกนอกลาน
  if (lx0 === 0) edges.push([0, ly0, 0, ly1 + 1, -1, 0]);
  if (lx1 === W - 1) edges.push([W, ly0, W, ly1 + 1, 1, 0]);
  if (ly0 === 0) edges.push([0, 0, W, 0, 0, -1]);
  if (ly1 === H - 1) edges.push([0, H, W, H, 0, 1]);
  const fence = region === "ghost" ? (night ? "#4a4656" : "#8a8070") : region === "desert" ? (night ? "#5a4a50" : "#a77a4c") : (night ? "#9aa4b8" : "#f4f1ea");
  const verge = region === "snow" ? (night ? "#7f8ca8" : "#f4f8fc") : region === "desert" ? (night ? "#4e4558" : "#e2c38e") : C.grass;
  for (const [x0, y0, x1, y1, nx, ny] of edges) {
    const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L;
    const at = (t, o) => [x0 + ux * t + nx * o, y0 + uy * t + ny * o];
    const strip = (o0, o1, fill) => { const a = at(0, o0), b = at(L, o0), c = at(L, o1), d = at(0, o1); const pa = P(a[0], a[1]), pb = P(b[0], b[1]), pc = P(c[0], c[1]), pd = P(d[0], d[1]); if (![pa, pb, pc, pd].every((q) => q[2] > 0.05)) return; g.beginPath(); g.moveTo(pa[0], pa[1]); g.lineTo(pb[0], pb[1]); g.lineTo(pc[0], pc[1]); g.lineTo(pd[0], pd[1]); g.closePath(); g.fillStyle = fill; g.fill(); };
    strip(0, 1.7, verge);
    strip(0, 0.16, C.curb); strip(0.13, 0.17, "rgba(0,0,0,.18)");
    // ดอกไม้/หิน/กองหิมะในแนวขอบ
    for (let t = 0.3; t < L; t += 0.22 + R() * 0.25) {
      const [x, y] = at(t, 0.3 + R() * 1.1), [sx, sy, sc] = P(x, y);
      if (!(sc > 0)) continue;
      if (region === "snow") { g.fillStyle = "rgba(255,255,255,.75)"; g.beginPath(); g.ellipse(sx, sy, sc * 0.18, sc * 0.06, 0, 0, TAU); g.fill(); continue; }
      if (region === "desert") { if (R() < 0.3) { g.fillStyle = night ? "#3f3848" : "#b08a5a"; g.beginPath(); g.ellipse(sx, sy - sc * 0.03, sc * 0.08, sc * 0.05, 0, 0, TAU); g.fill(); } continue; }
      g.fillStyle = C.tuft; g.beginPath(); g.ellipse(sx, sy - sc * 0.04, sc * 0.1, sc * 0.06, 0, 0, TAU); g.fill();
      if (region !== "ghost" && R() < 0.55) { g.fillStyle = C.flower[(R() * C.flower.length) | 0]; g.beginPath(); g.arc(sx + sc * 0.03, sy - sc * 0.09, Math.max(1, sc * 0.035), 0, TAU); g.fill(); }
    }
    // รั้วเตี้ย (เสาทุกครึ่งช่อง + ราวสองเส้น) · เมืองร้าง = รั้วพังเว้นช่วง
    const fo = 1.3, top = region === "desert" ? 0.5 : 0.42;
    g.strokeStyle = fence; g.lineCap = "round";
    for (let t = 0; t <= L + 0.01; t += 0.5) {
      if (region === "ghost" && R() < 0.25) continue;
      const [x, y] = at(t, fo), a = P(x, y, 0), b = P(x, y, top);
      if (!(a[2] > 0.05)) continue;
      g.lineWidth = Math.max(1.5, a[2] * 0.06); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    }
    for (const z of [top * 0.45, top * 0.85]) {
      g.lineWidth = Math.max(1, P(...at(L / 2, fo), z)[2] * 0.035); g.beginPath(); let started = false;
      for (let t = 0; t <= L + 0.01; t += 0.5) { const [x, y] = at(t, fo), q = P(x, y, z); if (!(q[2] > 0.05)) { started = false; continue; } if (started) g.lineTo(q[0], q[1]); else { g.moveTo(q[0], q[1]); started = true; } }
      g.stroke();
    }
    g.lineCap = "butt";
    // เสาไฟลานจอด (ทุก ~6 ช่อง)
    const ax = viewAxes(), towardCam = nx * ax.fx + ny * ax.fy > 0.3; // ขอบฝั่งใกล้กล้อง: เสาสูงจะพาดทับลาน (ชั้นพื้นอยู่ใต้ตัวละคร) — ไม่ปัก
    for (let t = 2; t < L - 1 && !towardCam; t += 6) {
      const [x, y] = at(t, 0.6), a = P(x, y, 0), b = P(x, y, 3.0), hd = P(x - nx * 0.45, y - ny * 0.45, 2.95);
      if (!(a[2] > 0.05)) continue;
      g.fillStyle = night ? "#3c4250" : "#7c848c"; g.fillRect(a[0] - a[2] * 0.04, b[1], a[2] * 0.08, a[1] - b[1]);
      g.strokeStyle = g.fillStyle; g.lineWidth = Math.max(1.5, a[2] * 0.05); g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(hd[0], hd[1]); g.stroke();
      g.fillStyle = night ? "#fff6d8" : "#e9e6de"; g.beginPath(); g.ellipse(hd[0], hd[1] + a[2] * 0.03, a[2] * 0.12, a[2] * 0.05, 0, 0, TAU); g.fill();
      if (night) { glow(g, hd[0], hd[1] + a[2] * 0.4, a[2] * 1.2, "255,236,190", 0.25); const gp = P(x - nx * 0.45, y - ny * 0.45, 0); glow(g, gp[0], gp[1], gp[2] * 1.4, "255,236,190", 0.18); }
    }
  }
}
// ทางเท้าปูบล็อกหน้าอาคาร (แถวทางเดินหน้ามินิมาร์ท/อู่/ห้องน้ำ/โมเต็ล) + ท่อระบายน้ำ
function aprons(g, C, def, info, night) {
  const H = info.rows;
  for (const p of def.props || []) {
    if (!["mart", "garage", "wc", "motel"].includes(p.kind)) continue;
    const y = p.y1 + 1;
    if (y >= H) continue;
    const x0 = Math.max(0, p.x0), x1 = Math.min(info.cols, p.x1 + 1);
    fillRect(g, x0, y, x1, y + 0.85, night ? "#6e6a74" : "#e6dccd");
    for (let x = x0; x < x1; x += 0.5) { const a = P(x, y), b = P(x, y + 0.85); g.strokeStyle = night ? "rgba(0,0,0,.2)" : "rgba(120,100,80,.18)"; g.lineWidth = 1; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    for (const yy of [y + 0.42]) { const a = P(x0, yy), b = P(x1, yy); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    fillRect(g, x0, y + 0.85, x1, y + 0.93, C.curb);
  }
  // ฝาท่อ/ตะแกรงระบายน้ำ 2–3 จุด
  const R = rng(info.area * 3 + 1);
  for (let i = 0; i < 3; i++) {
    const x = 2 + R() * (info.cols - 4), y = 2 + R() * (H - 5);
    const [sx, sy, s] = P(x, y);
    g.fillStyle = night ? "#3a3d46" : "#8c8e90"; g.beginPath(); g.ellipse(sx, sy, s * 0.2, s * 0.2 * 0.53, 0, 0, TAU); g.fill();
    g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 1; for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(sx - s * 0.14, sy + k * s * 0.03); g.lineTo(sx + s * 0.14, sy + k * s * 0.03); g.stroke(); }
  }
}

// base: ฟ้า + ฉากไกล + พื้นรอบนอก + ของข้างทาง + พื้นบนกระดาน (ถนน/ไหล่ทาง/ข้างทาง/ลานคอนกรีต)
function base(c) {
  const { g, night, info } = c;
  const region = rtRegionOf(info), C = rtPal(region, night), def = rtDefOf(info.area), rt = (def && def.rt) || { kind: "road", road: [2, 7], shoulder: [1, 8] };
  const flat = !!customProjection(); // อบภาพพื้นผิว (มองตรงลงมา) — ไม่มีฟ้า/ฉากรอบนอก
  const R = rng(info.area * 131 + region.length * 17);
  const W = info.cols, H = info.rows, EX = 40;
  if (!flat) { skyAndHorizon(c, region, C); groundTexture(g, R, -EX, -6, W + EX, H + 10, region, C, 900); }
  // ข้างทางในกระดาน (ทุกแถวที่ไม่ใช่ถนน/ลาน)
  fillRect(g, flat ? 0 : -EX, 0, flat ? W : W + EX, H, C.grass);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x + y) % 2) { quad(g, x, y); g.fillStyle = C.grass2; g.fill(); }
  const xa = flat ? 0 : -EX, xb = flat ? W : W + EX;
  const [r0, r1] = rt.road;
  // ไหล่ทาง (กรวด)
  if (rt.shoulder) for (const sy of rt.shoulder) if (sy !== r0 - 1 || rt.kind !== "gas") fillRect(g, xa, sy, xb, sy + 1, C.gravel);
  asphalt(g, R, xa, r0, xb, r1 + 1, C, region, Math.round((xb - xa) * (r1 - r0 + 1) * 1.6));
  if (rt.lot) {
    const [lx0, ly0, lx1, ly1] = rt.lot;
    concrete(g, R, lx0, ly0, lx1 + 1, ly1 + 1, C, region);
    // ขอบทางเท้าระหว่างลานกับถนน
    const cy = r0 > ly1 ? ly1 + 1 : r1 + 1;
    fillRect(g, xa, cy - 0.07, xb, cy + 0.07, C.curb);
    if (!flat) lotBorder(g, C, region, info, rt, night);
    if (def) aprons(g, C, def, info, night);
  }
  if (!flat) groundTexture(g, R, 0, 0, W, H, region, C, rt.kind === "gas" || rt.kind === "motel" ? 0 : 160);
  if (!flat) sideDecor(c, region, C, def); // ของข้างทางวาดท้ายสุด (ไม่ให้แถบหญ้า/ถนนที่ต่อออกนอกกระดานทับต้นไม้)
}

// deco: เส้นถนน · ช่องจอดทาสี · ลูกศร (ทับเส้นตาราง)
function deco(c) {
  const { g, night, info, flat } = c;
  const region = rtRegionOf(info), C = rtPal(region, night), def = rtDefOf(info.area);
  if (!def || !def.rt) return;
  const rt = def.rt, W = info.cols, xa = flat ? 0 : -40, xb = flat ? W : W + 40;
  const [r0, r1] = rt.road;
  const paint = region === "ghost" ? (night ? "rgba(200,205,220,.45)" : "rgba(240,236,226,.55)") : C.paint;
  g.globalAlpha = region === "snow" ? 0.7 : 1;
  if (rt.kind === "road" || rt.kind === "onvan") {
    fillRect(g, xa, r0 + 0.08, xb, r0 + 0.16, paint);
    fillRect(g, xa, r1 + 1 - 0.16, xb, r1 + 1 - 0.08, paint);
    // เส้นแบ่งเลน: ถนนจริง = ประสีขาว (บนรถตู้วาดสดให้เลื่อน — props.rtGround)
    if (rt.kind === "road") { const lw = (r1 - r0 + 1) / (rt.lanes || 3); for (let k = 1; k < (rt.lanes || 3); k++) dashRow(g, xa, xb, r0 + k * lw, paint, 0.09, 1.1, 0.9, 0.3); }
  } else {
    // ถนนสองเลนหน้าปั๊ม: เส้นกลางเหลืองประ · ขอบขาว
    fillRect(g, xa, r0 + 0.06, xb, r0 + 0.12, paint);
    fillRect(g, xa, r1 + 1 - 0.12, xb, r1 + 1 - 0.06, paint);
    if (r1 > r0) dashRow(g, xa, xb, r0 + (r1 - r0 + 1) / 2, C.paintY, 0.08, 1.0, 0.8, 0.2);
    // ช่องจอดทาสี (เส้นขาวรอบ + เส้นแบ่งช่องทุก 1 ช่อง)
    for (const [x0, y0, x1, y1] of rt.bays || []) {
      g.strokeStyle = paint; g.lineWidth = 2;
      rectG(g, x0 + 0.06, y0 + 0.06, x1 + 0.94, y1 + 0.94); g.stroke();
      const wide = x1 - x0 >= y1 - y0;
      if (wide) for (let x = x0 + 1; x <= x1; x++) lineG(g, x, y0 + 0.06, x, y1 + 0.94, paint, 2);
      else for (let y = y0 + 1; y <= y1; y++) lineG(g, x0 + 0.06, y, x1 + 0.94, y, paint, 2);
    }
    // ทางม้าลายจากลานลงถนน (กลางกระดาน)
    const cx = Math.floor(W / 2) - 1, lotEdge = rt.lot[1] > r1 ? r1 + 1 : r0;
    if (rt.kind === "gas") for (let k = 0; k < 5; k++) fillRect(g, cx - 1 + k * 0.6, lotEdge === r0 ? r0 + 0.25 : r1 + 1 - 0.95, cx - 1 + k * 0.6 + 0.32, lotEdge === r0 ? r0 + 0.95 : r1 + 1 - 0.25, paint);
  }
  g.globalAlpha = 1;
}

// ---------------------------------------------------------------- อนุภาคอากาศ (ทุกเฟรม — T.ambient)
function ambient(g, f, t) {
  const { info, night, view } = f;
  const region = rtRegionOf(info);
  const W = info.cols, H = info.rows;
  if (region === "snow") {
    g.fillStyle = night ? "rgba(220,230,255,.8)" : "rgba(255,255,255,.92)";
    for (let i = 0; i < 46; i++) {
      const ph = ((t / (7000 + (i % 7) * 900)) + i * 0.137) % 1;
      const x = ((i * 7.31) % (W + 6)) - 3 + Math.sin(t / 900 + i) * 0.4, y = ((i * 3.17) % (H + 2)) - 1;
      const [sx, sy, s] = P(x, y, (1 - ph) * 4);
      g.beginPath(); g.arc(sx, sy, Math.max(1, s * 0.035), 0, TAU); g.fill();
    }
  } else if (region === "desert") {
    for (let i = 0; i < 18; i++) {
      const ph = ((t / 6000) + i * 0.173) % 1, x = -2 + ph * (W + 4), y = (i * 5.3) % H;
      const [sx, sy, s] = P(x, y, 0.3 + Math.sin(t / 500 + i) * 0.2);
      g.fillStyle = `rgba(230,200,150,${0.35 * Math.sin(ph * Math.PI)})`; g.beginPath(); g.ellipse(sx, sy, s * 0.3, s * 0.05, 0, 0, TAU); g.fill();
    }
  } else if (region === "ghost" || night) {
    // หิ่งห้อย (กลางคืน) / ดวงไฟผี (เมืองร้าง)
    const ghost = region === "ghost", n = ghost ? 16 : 12;
    for (let i = 0; i < n; i++) {
      const a = t / (3000 + i * 170) + i, x = ((i * 4.7) % W) + Math.sin(a) * 0.8, y = ((i * 2.9) % H) + Math.cos(a * 1.3) * 0.6;
      const [sx, sy, s] = P(x, y, 0.8 + Math.sin(a * 2) * 0.4);
      const al = 0.4 + 0.4 * Math.sin(t / 300 + i * 2);
      glow(g, sx, sy, s * 0.22, ghost ? "170,150,255" : "255,240,150", al * 0.6);
      g.fillStyle = ghost ? `rgba(220,210,255,${al})` : `rgba(255,248,190,${al})`; g.beginPath(); g.arc(sx, sy, Math.max(1, s * 0.03), 0, TAU); g.fill();
    }
  } else if (region === "forest") {
    for (let i = 0; i < 14; i++) {
      const ph = ((t / (5200 + i * 300)) + i * 0.21) % 1, x = ((i * 6.1) % W) + Math.sin(t / 700 + i) * 0.6, y = ((i * 3.3) % H);
      const [sx, sy, s] = P(x, y, (1 - ph) * 3.5);
      g.save(); g.translate(sx, sy); g.rotate(t / 400 + i);
      g.fillStyle = ["#d6a24a", "#c98a3c", "#a8b84a"][i % 3]; g.globalAlpha = Math.sin(ph * Math.PI); g.beginPath(); g.ellipse(0, 0, s * 0.06, s * 0.03, 0, 0, TAU); g.fill();
      g.restore();
    }
  }
  void view;
}

// ---------------------------------------------------------------- ธีมของ area 70–75
//  pal อ่านตามภูมิภาคปัจจุบัน (getter) · back/ground/side ว่าง (ชั้นฉากถูก base ทาทับทั้งจอ — ดูหัวไฟล์)
function makeTheme() {
  const pal = {};
  Object.defineProperty(pal, "day", { get: () => rtPal(RT.region, false), enumerable: true });
  Object.defineProperty(pal, "night", { get: () => rtPal(RT.region, true), enumerable: true });
  return { pal, back() {}, ground() {}, side() {}, base, deco, ambient };
}
export function roadtripThemes() {
  const out = {};
  for (let a = RT_AREA0; a <= RT_AREA1; a++) out[a] = makeTheme();
  return out;
}
export { rectG, fillRect, lineG };
void gEllipse;
