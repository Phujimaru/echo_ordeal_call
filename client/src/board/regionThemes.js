// ============================================================
//  ธีมภาพรายภูมิภาค (GRID_PLAN §3.1 / §13 ขั้น 7) — ใช้ map.area เลือก
//   I อาณาจักรแห่งจุดเริ่มต้น · II ทุ่งดอกไม้ · III ป่าไม้ต้องสาป · IV คลื่นวงวนน้ำ
//   V ทะเลทราย · VI อาณาจักรน้ำแข็ง · VII จุดสิ้นสุดของโลก
//
//  ธีมหนึ่ง = { pal: { day, night }, back, ground, base?, side, fore?, animBack?, ambient? }
//   back(c)    ฟ้า + ฉากหลังขอบไกล (อบ)          ground(c)  ลายพื้นทั้งจอ (อบ)
//   base(c)    ฐานใต้กระดาน เช่น หาดทราย/เกาะลอย (อบ · ไม่มี = เงาจางๆ แบบด่าน I)
//   side(c)    ฉากสองข้างกระดาน (อบ)              fore       สีใบไม้/ของเบลอหน้ากล้อง (อบ · lowQ ข้าม)
//   animBack(g, f, t)  ของขยับในฉากหลังทุกเฟรม (ใบพัดกังหัน ไฟประภาคาร คบเพลิง รอยแยกฟ้า)
//   ambient(g, f, t)   อนุภาคทุกเฟรม (กลีบดอกไม้ หิ่งห้อย ดวงไฟผี หิมะ ประกายไฟ) — lowQ ข้าม
//  c (ตอนอบ) = { g, C, night, lowQ, info, R, VX0, VY0, VX1, VY1, VW, bY, wx0, wx1, wy1 }
//  f (ทุกเฟรม) = { info, C, night, lowQ, view }
// ============================================================
import { LW, OX, P, PS, depthOf, gPoly, glow, rng, sceneSize, unprojectScene, viewAxes } from "./boardGeo";
import { cactusShape, deadTreeShape, drawTree, pineShape, prism, SNOW_PINE, windmillSails } from "./boardProps";

const TAU = Math.PI * 2;
// วงรีบนพื้นในพิกัดฉาก
function sEllipse(g, cx, cy, r, n = 16) {
  g.beginPath();
  for (let i = 0; i <= n; i++) { const a = i / n * TAU, p = PS(cx + Math.cos(a) * r, cy + Math.sin(a) * r); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
  g.closePath();
}

// =================================================================== palettes
//  ground1/2 = พื้นรอบนอก (ไล่จากกลางจอ) · tile/tile2 = ลายหมากรุกบนกระดาน · grid/border = เส้นตาราง/ขอบ
//  sky = ไล่สีฟ้าบน→ล่าง · hill = เนิน/ภูเขาไกล→ใกล้ · c1–c3/trunk = ต้นไม้ · accent = สีจุดฟื้นฟู
const PAL = {
  1: {
    day: {
      ground1: "#bfd8a8", ground2: "#9fc28a", clump: "#8fb878", plaza: "#f3f4f1", plaza2: "#e9ebe6", rim: "#d8d1bf", rim2: "#b4aa92",
      path: "#ebe7dc", line: "rgba(61,139,217,.75)", gold: "#d9a93f", tile: "rgba(28,63,110,.05)", tile2: "rgba(28,63,110,.16)",
      dots: ["#f6d36b", "#ffffff", "#eaa6c2"], c1: "#8fb878", c2: "#7aa765", c3: "#b4d69b", trunk: "#8b7355", shadow: "rgba(28,46,40,.22)",
      sky: ["#bcd8f2", "#e6f0fa"], hill: ["#cfe0ef", "#b8d1e6"], horizon: "#a9c995", leaf: "#6f9e58", spark: "#7fb8e6", crystal: 0.35,
    },
    night: {
      ground1: "#2f4f5a", ground2: "#22394a", clump: "#1d3242", plaza: "#5d7697", plaza2: "#526b8c", rim: "#465e7e", rim2: "#33475f",
      path: "#55708f", line: "rgba(170,215,255,.85)", gold: "#f0c868", tile: "rgba(200,225,255,.06)", tile2: "rgba(200,225,255,.16)",
      dots: ["#fff3b0", "#cfe8ff", "#fff3b0"], c1: "#2c5a55", c2: "#244b48", c3: "#3d7068", trunk: "#4a3d33", shadow: "rgba(0,8,24,.45)",
      sky: ["#0b1830", "#183056"], hill: ["#22355a", "#1a2b4a"], horizon: "#1d3342", leaf: "#13283a", spark: "#cfe8ff", crystal: 0.9,
    },
  },
  2: {
    day: {
      ground1: "#c4e0a4", ground2: "#9ccc7e", clump: "#86bd6c", dots: ["#f58fb8", "#ffe066", "#ffffff", "#c39af0", "#ffb070"],
      tile: "rgba(40,80,30,.05)", tile2: "rgba(40,80,30,.15)", sky: ["#9fd0f4", "#e6f5fc"], hill: ["#b9dcae", "#a6d18f"],
      field1: "#eeaccb", field2: "#f4dc72", horizon: "#a8d48c", shadow: "rgba(30,50,25,.22)",
      c1: "#8fc278", c2: "#79ad63", c3: "#b7dc9a", trunk: "#8b6a4a", leaf: "#6fa356", foreAcc: "#f3a6c6", accent: "#ff6fa8",
    },
    night: {
      ground1: "#2f5052", ground2: "#213a42", clump: "#1f3a3a", dots: ["#f0c4dc", "#fff1b0", "#e6eeff", "#d4c2f5", "#ffd2a8"],
      tile: "rgba(200,230,255,.05)", tile2: "rgba(200,230,255,.14)", sky: ["#0d1a36", "#22365c"], hill: ["#243a58", "#1e3448"],
      field1: "#4a3d62", field2: "#4b5560", horizon: "#1f3a40", shadow: "rgba(0,8,24,.45)",
      c1: "#2c5a50", c2: "#244b45", c3: "#3d7066", trunk: "#4a3d33", leaf: "#14303a", foreAcc: "#6a4a6a", accent: "#ffb3d4",
    },
  },
  3: {
    day: {
      ground1: "#7c8a6a", ground2: "#55614b", clump: "#4a5640", dots: ["#a77bd6", "#5fc8b8", "#a0743c", "#c9b48a"],
      tile: "rgba(30,20,40,.07)", tile2: "rgba(30,20,40,.18)", grid: "rgba(30,20,40,.2)", border: "rgba(230,220,240,.6)",
      sky: ["#7f7e98", "#c9c5d3"], hill: ["#666a7e", "#4f5366"], horizon: "#5d6658", fog: "225,222,238", shadow: "rgba(20,15,30,.3)",
      c1: "#4d5e45", c2: "#3e4f3a", c3: "#667a58", trunk: "#4a3f50", leaf: "#2e2a38", foreAcc: "#4a3a5a", accent: "#8ef07a",
      light: ["rgba(230,225,255,.12)", "rgba(20,10,40,.22)"],
    },
    night: {
      ground1: "#22302c", ground2: "#141c1d", clump: "#0f1716", dots: ["#b98cf0", "#6ff0dc", "#4a3d2a", "#6a5a80"],
      tile: "rgba(200,180,255,.05)", tile2: "rgba(200,180,255,.13)", grid: "rgba(200,180,255,.13)", border: "rgba(200,180,255,.38)",
      sky: ["#05040c", "#1b1430"], hill: ["#141226", "#1b1932"], horizon: "#151c1e", fog: "140,170,160", shadow: "rgba(0,0,10,.5)",
      c1: "#1d2b26", c2: "#16221e", c3: "#28392f", trunk: "#2b2434", leaf: "#0e0b14", foreAcc: "#2a2038", accent: "#b8ff8a",
    },
  },
  4: {
    day: {
      ground1: "#4bb3d3", ground2: "#2384b0", seaFar: "#86cfe2", sand: "#efdeb5", sandWet: "#cdb88c", dots: ["#ffffff", "#e6f6ff", "#fff2cf"],
      tile: "rgba(120,90,40,.05)", tile2: "rgba(120,90,40,.14)", grid: "rgba(110,80,40,.16)", border: "rgba(255,255,255,.85)",
      sky: ["#7cc6f0", "#d9f1fb"], hill: ["#7fa9b6", "#6a98a8"], shadow: "rgba(20,40,60,.25)", accent: "#25c6d8",
    },
    night: {
      ground1: "#13436a", ground2: "#0a2744", seaFar: "#22507e", sand: "#6f7792", sandWet: "#525a76", dots: ["#a8e6ff", "#7fd8ff", "#c8f0ff"],
      tile: "rgba(200,225,255,.05)", tile2: "rgba(200,225,255,.13)", sky: ["#050f26", "#163a63"], hill: ["#1c2f4c", "#18304a"],
      shadow: "rgba(0,8,24,.45)", accent: "#8ff0ff",
    },
  },
  5: {
    day: {
      ground1: "#f1d59c", ground2: "#d9b273", clump: "#e6c58a", dots: ["#c99a5a", "#fff1cf", "#b98a50"],
      tile: "rgba(120,70,20,.05)", tile2: "rgba(120,70,20,.14)", grid: "rgba(110,70,20,.16)", border: "rgba(255,250,235,.85)",
      sky: ["#86bde4", "#f8e6bb"], hill: ["#ebc98e", "#ddb474"], horizon: "#e2c084", shadow: "rgba(90,60,20,.25)", accent: "#25c6d8",
      light: ["rgba(255,240,200,.25)", "rgba(80,40,0,.12)"],
    },
    night: {
      ground1: "#5d5b7c", ground2: "#45425f", clump: "#524f70", dots: ["#3e3b58", "#8c88aa", "#36334f"],
      tile: "rgba(220,215,255,.05)", tile2: "rgba(220,215,255,.13)", sky: ["#070a22", "#2a2552"], hill: ["#3d3b62", "#34325a"],
      horizon: "#4a4768", shadow: "rgba(0,0,20,.45)", accent: "#7fe3f0",
    },
  },
  6: {
    day: {
      ground1: "#f1f6fb", ground2: "#d0e0ee", clump: "#bdd3e8", dots: ["#ffffff", "#a8dcff", "#e6f4ff"],
      tile: "rgba(40,80,140,.05)", tile2: "rgba(40,80,140,.13)", grid: "rgba(40,80,140,.15)", border: "rgba(255,255,255,.95)",
      sky: ["#9ccdf0", "#eef7fd"], hill: ["#c8dbee", "#dce8f4"], hillSh: ["#a9c2dc", "#bdd0e4"], horizon: "#dfe9f3",
      shadow: "rgba(40,70,110,.22)", leaf: "#2f5a55", foreAcc: "#ffffff", accent: "#20b8e0",
      light: ["rgba(255,255,255,.18)", "rgba(20,50,100,.12)"],
    },
    night: {
      ground1: "#5f7499", ground2: "#475b80", clump: "#536a91", dots: ["#e6f0ff", "#9fd8ff", "#c8dcff"],
      tile: "rgba(220,235,255,.06)", tile2: "rgba(220,235,255,.14)", sky: ["#030a1e", "#11305a"], hill: ["#2c4169", "#38527c"],
      hillSh: ["#22355a", "#2c4368"], horizon: "#3d5279", shadow: "rgba(0,8,30,.42)", leaf: "#132a33", foreAcc: "#9fb4d0", accent: "#8ff0ff",
    },
  },
  7: {
    day: {
      ground1: "#2c1538", ground2: "#0d0614", basalt: "#4a3f52", basalt2: "#3c3245", cliff: "#2a2131", clump: "#3a3046",
      dots: ["#c08bff", "#ff9a4a", "#6a5a7a"], tile: "rgba(255,220,255,.05)", tile2: "rgba(255,220,255,.12)",
      grid: "rgba(255,210,255,.15)", border: "rgba(255,190,140,.6)", spawn: "rgba(255,220,255,.4)",
      sky: ["#2a0e3e", "#8a2f68", "#f08a4b"], hill: ["#2a1630", "#1e1024"], shadow: "rgba(0,0,0,.35)",
      leaf: "#2a1440", foreAcc: "#c08bff", accent: "#ff8ad0", light: ["rgba(255,150,90,.12)", "rgba(20,0,30,.25)"],
    },
    night: {
      ground1: "#150a22", ground2: "#04020a", basalt: "#352c3e", basalt2: "#2a2232", cliff: "#1a1420", clump: "#2a2234",
      dots: ["#b07bff", "#ff8a3a", "#4a3d5a"], tile: "rgba(220,200,255,.05)", tile2: "rgba(220,200,255,.12)",
      sky: ["#030108", "#12082a", "#2a0f3e"], hill: ["#140a1c", "#0e0614"], shadow: "rgba(0,0,0,.45)",
      leaf: "#1a0a2a", foreAcc: "#7a4ab0", accent: "#ff9ad5",
    },
  },
};
// ค่าเริ่มต้นที่ใช้ร่วม (ทับได้ในแต่ละธีม)
const BASE_DAY = {
  grid: "rgba(28,63,110,.13)", border: "rgba(255,255,255,.75)", spawn: "rgba(28,63,110,.22)", dots: ["#ffffff"],
  light: ["rgba(255,250,225,.22)", "rgba(10,30,60,.14)"], nightTint: null,
};
const BASE_NIGHT = {
  grid: "rgba(200,225,255,.13)", border: "rgba(200,225,255,.4)", spawn: "rgba(200,225,255,.35)", dots: ["#ffffff"],
  light: ["rgba(120,160,255,.06)", "rgba(0,8,24,.3)"], nightTint: "rgba(8,18,40,.22)",
};
for (const a of Object.keys(PAL)) {
  PAL[a].day = { ...BASE_DAY, ...PAL[a].day };
  PAL[a].night = { ...BASE_NIGHT, ...PAL[a].night };
}

// =================================================================== helpers (อบ)
function skyFill(c, stops) {
  const { g, VX0, VY0, VW, bY } = c, gr = g.createLinearGradient(0, VY0, 0, bY);
  stops.forEach((col, i) => gr.addColorStop(i / (stops.length - 1), col));
  g.fillStyle = gr; g.fillRect(VX0, VY0, VW, bY - 18 - VY0);
}
function stars(c, n, alpha = 1, maxY = null) {
  const { g, R, VX0, VY0, VW, bY } = c, y1 = maxY == null ? bY - 40 : maxY;
  const cnt = Math.round(n * VW / LW * Math.max(1, (bY - VY0) / bY));
  for (let i = 0; i < cnt; i++) { g.fillStyle = `rgba(255,255,255,${(0.3 + R() * 0.6) * alpha})`; g.fillRect(VX0 + R() * VW, VY0 + R() * (y1 - VY0), 1.4, 1.4); }
}
function orb(g, x, y, r, col, rgb, glowR, glowA) {
  glow(g, x, y, glowR, rgb, glowA);
  g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}
function clouds(c, n, col) {
  const { g, VX0, VW } = c, R = rng(301);
  g.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const x = VX0 + (i + 0.5) / n * VW + (R() - 0.5) * 80, y = 18 + R() * 46, w = 40 + R() * 50;
    for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(x + (k - 1.5) * w * 0.32, y - (k % 2) * 6, w * 0.32, 9 + (k % 2) * 4, 0, 0, TAU); g.fill(); }
  }
}
// สันเขา/เนิน: style = round (เนินมน) · smooth (เนินทราย) · trees (แนวต้นสน) · flat
function ridgeY(style, x, base, amp, f, ph) {
  if (style === "smooth") return base - amp * (0.5 + 0.5 * Math.sin(x * f + ph)) - amp * 0.3 * Math.sin(x * f * 2.1 + ph * 1.3);
  if (style === "flat") return base;
  return base - Math.abs(Math.sin(x * f + ph)) * amp - Math.sin(x * f * 2.7) * amp * 0.4;
}
function ridge(c, color, base, amp, f, ph, style = "round") {
  const { g, VX0, VX1, bY } = c;
  g.fillStyle = color; g.beginPath(); g.moveTo(VX0, bY + 2);
  if (style === "trees") {
    const R = rng(Math.round(base * 7 + ph * 100));
    for (let x = VX0 - 10; x <= VX1 + 14; x += 9 + R() * 8) {
      const h = amp * (0.45 + R() * 0.55);
      g.lineTo(x, base - h * 0.35); g.lineTo(x + 5, base - h); g.lineTo(x + 10, base - h * 0.35);
    }
  } else {
    for (let x = VX0; x <= VX1 + 6; x += 6) g.lineTo(x, ridgeY(style, x, base, amp, f, ph));
  }
  g.lineTo(VX1, bY + 2); g.closePath(); g.fill();
}
function horizonBand(c, top, h = 40) {
  const { g, C, VX0, VW, bY } = c, gr = g.createLinearGradient(0, bY - 30, 0, bY - 30 + h);
  gr.addColorStop(0, top); gr.addColorStop(1, C.ground1);
  g.fillStyle = gr; g.fillRect(VX0, bY - 30, VW, h);
}
// แถวของประดับหลังกระดาน (เว้นช่วง skip(x) = true)
function backRow(c, seed, n, skip, draw) {
  const { VX0, VW, bY } = c, rt = rng(seed), cnt = Math.round(n * VW / LW);
  for (let i = 0; i < cnt; i++) {
    const x = VX0 + (i / Math.max(1, cnt - 1)) * VW + (rt() - 0.5) * 30;
    const sz = 26 + rt() * 14, yy = bY - 10 + rt() * 10, r = rt();
    if (skip(x)) continue;
    draw(x, yy, sz, r);
  }
}
// กอหญ้า + จุดสี ทั่วพื้นที่มองเห็น (แบบด่าน I)
function worldDots(c, clumpK = 1, dotK = 1, alpha = null) {
  const { g, C, R, night, VX0, VX1, bY, wx0, wx1, wy1 } = c;
  const area = (wx1 - wx0) * (wy1 + 1);
  const nClump = Math.min(900, Math.round(area * 0.68 * clumpK)), nDots = Math.min(3200, Math.round(area * 1.9 * dotK));
  g.globalAlpha = 0.35; g.fillStyle = C.clump;
  for (let i = 0; i < nClump; i++) {
    const x = wx0 + R() * (wx1 - wx0), y = -1 + R() * (wy1 + 1), r = 0.25 + R() * 0.5;
    sEllipse(g, x, y, r); g.fill();
  }
  g.globalAlpha = alpha == null ? (night ? 0.75 : 0.9) : alpha;
  const n = C.dots.length;
  for (let i = 0; i < nDots; i++) {
    const x = wx0 + R() * (wx1 - wx0), y = -0.5 + R() * (wy1 + 0.5), [sx, sy, s] = PS(x, y), rr = R();
    if (sy < bY || sx < VX0 - 4 || sx > VX1 + 4) continue;
    g.fillStyle = C.dots[i % n]; g.beginPath(); g.arc(sx, sy, Math.max(0.8, s * (0.025 + rr * 0.03)), 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
}
// ฉากสองข้างกระดาน (เรียงไกล→ใกล้) — จอกว้างกว่า 16:9 ได้แถบหนาขึ้น
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
// ขอบโค้งไม่เรียบรอบกระดาน (ใช้ทำหาดทราย/เกาะ) → [[x, y], …] หน่วยช่อง
function shoreline(info, m, noise, seed) {
  const R = rng(seed), C = info.cols, Rw = info.rows, pts = [], st = 0.5;
  const push = (x, y, nx, ny) => { const k = m + (R() - 0.5) * noise; pts.push([x + nx * k, y + ny * k]); };
  for (let x = 0; x < C; x += st) push(x, 0, 0, -1);
  push(C, 0, 0.7, -0.7);
  for (let y = st; y < Rw; y += st) push(C, y, 1, 0);
  push(C, Rw, 0.7, 0.7);
  for (let x = C - st; x > 0; x -= st) push(x, Rw, 0, 1);
  push(0, Rw, -0.7, 0.7);
  for (let y = Rw - st; y > 0; y -= st) push(0, y, -1, 0);
  push(0, 0, -0.7, -0.7);
  return pts;
}
// ใบไม้/ของเบลอหน้ากล้อง (มุมจอ)
function foreBlobs(f, c, main, acc) {
  const { VX0, VY0, VX1 } = c;
  for (const [cx, cy] of [[VX1 - 30, VY0 + 40], [VX1 - 90, VY0 - 10], [VX0 - 20, 300]]) {
    f.fillStyle = main; f.globalAlpha = 0.9;
    f.beginPath(); f.ellipse(cx, cy, 120, 80, 0.3, 0, TAU); f.fill();
    f.beginPath(); f.ellipse(cx - 60, cy + 40, 90, 60, -0.2, 0, TAU); f.fill();
    f.fillStyle = acc || "rgba(255,255,255,.18)"; f.globalAlpha = acc ? 0.55 : 1;
    f.beginPath(); f.ellipse(cx - 30, cy - 20, 50, 26, 0.3, 0, TAU); f.fill();
    if (acc) { f.beginPath(); f.ellipse(cx - 70, cy + 30, 30, 18, 0, 0, TAU); f.fill(); }
  }
  f.globalAlpha = 1;
}
// พิกัดสุ่มคงที่ต่อดัชนี (อนุภาค)
const hash = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };

// =================================================================== ภูมิภาค I · อาณาจักรแห่งจุดเริ่มต้น
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
  if (night) glow(g, cx, base - 60, 260, "255,210,120", 0.18);
  tower(cx - 240, 46, 92, 46, "#9b4f96"); tower(cx + 240, 46, 92, 46, "#9b4f96");
  g.fillStyle = night ? "#bfcadc" : "#eef2f6"; g.fillRect(cx - 220, base - 62, 440, 62);
  for (let x = cx - 220; x < cx + 220; x += 16) g.fillRect(x, base - 70, 9, 8);
  g.fillStyle = gold; g.fillRect(cx - 220, base - 30, 440, 3);
  tower(cx - 120, 40, 108, 40); tower(cx + 120, 40, 108, 40);
  tower(cx, 70, 150, 70, gold);
  g.fillStyle = gate; g.beginPath(); g.moveTo(cx - 20, base); g.lineTo(cx - 20, base - 34); g.arc(cx, base - 34, 20, Math.PI, 0); g.lineTo(cx + 20, base); g.closePath(); g.fill();
  if (night) { g.fillStyle = "rgba(255,200,110,.35)"; g.fillRect(cx - 14, base - 30, 28, 30); }
}
const T1 = {
  back(c) {
    const { g, C, night, bY } = c;
    skyFill(c, C.sky);
    if (night) stars(c, 60);
    ridge(c, C.hill[0], bY - 46, 22, 0.004, 0); ridge(c, C.hill[1], bY - 30, 16, 0.009, 2);
    horizonBand(c, C.horizon);
    drawCastle(g, OX, bY - 14, night);
    backRow(c, 5, 26, (x) => Math.abs(x - OX) < 300, (x, y, sz) => drawTree(g, x, y, sz, C));
  },
  ground(c) { worldDots(c); },
  side(c) { sideRow(c, 9, 1, (sx, sy, s, r) => drawTree(c.g, sx, sy, s * (1.1 + r * 0.5), c.C)); },
  fore: (f, c) => foreBlobs(f, c, c.C.leaf, null),
};

// =================================================================== ภูมิภาค II · ทุ่งดอกไม้
const BLOSSOM = {
  day: { c1: "#f6b8d1", c2: "#ea93b6", c3: "#ffe0ec", trunk: "#8b6a55" },
  night: { c1: "#7c5f86", c2: "#664e70", c3: "#9a7ca4", trunk: "#4a3d33" },
};
function farmhouse(g, fx, base, night) {
  const wall = night ? "#a9a6b8" : "#f6efe0", wallS = night ? "#8d8a9e" : "#e2d6bd", roof = night ? "#6b3a3a" : "#c4553d", roofS = night ? "#552e30" : "#9e4130";
  g.fillStyle = night ? "#5a4038" : "#8a5a3c"; g.fillRect(fx + 18, base - 66, 9, 20);
  g.fillStyle = wall; g.fillRect(fx - 39, base - 36, 78, 36);
  g.fillStyle = wallS; g.fillRect(fx + 14, base - 36, 25, 36);
  g.fillStyle = roof; g.beginPath(); g.moveTo(fx - 46, base - 34); g.lineTo(fx, base - 64); g.lineTo(fx + 46, base - 34); g.closePath(); g.fill();
  g.fillStyle = roofS; g.beginPath(); g.moveTo(fx, base - 64); g.lineTo(fx + 46, base - 34); g.lineTo(fx, base - 34); g.closePath(); g.fill();
  g.fillStyle = night ? "#3d2a22" : "#7a5232"; g.fillRect(fx - 6, base - 18, 12, 18);
  const win = night ? "#ffcf6e" : "#8fc3ea";
  for (const wx of [fx - 28, fx + 18]) {
    if (night) glow(g, wx + 5, base - 21, 26, "255,207,110", 0.35);
    g.fillStyle = win; g.fillRect(wx, base - 26, 10, 10);
    g.strokeStyle = night ? "#6b4a2a" : "#ffffff"; g.lineWidth = 1; g.strokeRect(wx, base - 26, 10, 10);
  }
}
function barn(g, bx, base, night) {
  const red = night ? "#5a2c34" : "#b8443a", redS = night ? "#48232b" : "#963630", roof = night ? "#3e2026" : "#7e2a26", trim = night ? "#b8b0c4" : "#ffffff";
  g.fillStyle = red; g.fillRect(bx - 32, base - 40, 64, 40);
  g.fillStyle = redS; g.fillRect(bx + 12, base - 40, 20, 40);
  g.fillStyle = roof; g.beginPath(); g.moveTo(bx - 37, base - 38); g.lineTo(bx - 28, base - 56); g.lineTo(bx, base - 68); g.lineTo(bx + 28, base - 56); g.lineTo(bx + 37, base - 38); g.closePath(); g.fill();
  g.strokeStyle = trim; g.lineWidth = 2; g.strokeRect(bx - 12, base - 26, 24, 26);
  g.beginPath(); g.moveTo(bx - 12, base - 26); g.lineTo(bx + 12, base); g.moveTo(bx + 12, base - 26); g.lineTo(bx - 12, base); g.stroke();
  if (night) glow(g, bx, base - 46, 22, "255,207,110", 0.4);
  g.fillStyle = night ? "#ffcf6e" : "#5a2a22"; g.fillRect(bx - 6, base - 52, 12, 9);
}
const T2 = {
  back(c) {
    const { g, C, night, bY, VX0, VX1 } = c;
    skyFill(c, C.sky);
    if (night) { stars(c, 70); orb(g, OX + 420, 42, 15, "#f6f1d0", "246,241,208", 70, 0.35); }
    else { orb(g, OX - 430, 36, 18, "#fff8dc", "255,245,200", 110, 0.55); clouds(c, 7, "rgba(255,255,255,.85)"); }
    ridge(c, C.hill[0], bY - 52, 22, 0.004, 0);
    ridge(c, C.field1, bY - 40, 12, 0.007, 1.3);
    // จุดดอกไม้บนทุ่งไกล
    const R = rng(55);
    for (let i = 0; i < 260; i++) {
      const x = VX0 + R() * (VX1 - VX0), y = ridgeY("round", x, bY - 40, 12, 0.007, 1.3) + 2 + R() * 12;
      g.fillStyle = night ? "rgba(240,200,230,.5)" : ["#ffffff", "#f27fae", "#ffd0e4"][i % 3]; g.fillRect(x, y, 1.6, 1.6);
    }
    ridge(c, C.hill[1], bY - 30, 14, 0.009, 2.1);
    ridge(c, C.field2, bY - 22, 6, 0.012, 0.4);
    horizonBand(c, C.horizon);
    // รั้วไกล
    g.strokeStyle = night ? "rgba(90,80,70,.7)" : "rgba(140,100,60,.7)"; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(VX0, bY - 9); g.lineTo(VX1, bY - 9); g.stroke();
    for (let x = VX0; x < VX1; x += 18) { g.beginPath(); g.moveTo(x, bY - 4); g.lineTo(x, bY - 13); g.stroke(); }
    farmhouse(g, OX - 200, bY - 12, night);
    barn(g, OX + 200, bY - 12, night);
    // หอกังหันลม (ใบพัดวาดทุกเฟรมใน animBack)
    const base = bY - 10, h = 76, wb = 46, wt = 26, top = base - h;
    g.fillStyle = night ? "#b5ae9f" : "#f3ead6"; g.beginPath(); g.moveTo(OX - wb / 2, base); g.lineTo(OX - wt / 2, top); g.lineTo(OX + wt / 2, top); g.lineTo(OX + wb / 2, base); g.closePath(); g.fill();
    g.fillStyle = night ? "#918a7c" : "#dccfb2"; g.beginPath(); g.moveTo(OX + 3, base); g.lineTo(OX + 2, top); g.lineTo(OX + wt / 2, top); g.lineTo(OX + wb / 2, base); g.closePath(); g.fill();
    g.fillStyle = "#b5523b"; g.beginPath(); g.moveTo(OX - wt / 2 - 4, top); g.lineTo(OX, top - 20); g.lineTo(OX + wt / 2 + 4, top); g.closePath(); g.fill();
    g.fillStyle = night ? "#3d2a22" : "#7a5232"; g.fillRect(OX - 6, base - 16, 12, 16);
    if (night) glow(g, OX, top + 30, 22, "255,207,110", 0.4);
    g.fillStyle = night ? "#ffcf6e" : "#7fb8e6"; g.fillRect(OX - 4, top + 24, 8, 10);
    c.marks.wm = top + 2; // ดุมใบพัด (animBack)
    const BP = BLOSSOM[night ? "night" : "day"];
    backRow(c, 5, 26, (x) => Math.abs(x - OX) < 270, (x, y, sz, r) => drawTree(g, x, y, sz, r < 0.45 ? { ...C, ...BP } : C));
  },
  ground(c) {
    worldDots(c, 0.9, 1.5);
  },
  side(c) {
    const BP = BLOSSOM[c.night ? "night" : "day"];
    sideRow(c, 9, 1, (sx, sy, s, r) => drawTree(c.g, sx, sy, s * (1.0 + r * 0.5), r < 0.4 ? { ...c.C, ...BP } : c.C));
  },
  fore: (f, c) => foreBlobs(f, c, c.C.leaf, c.C.foreAcc),
  animBack(g, f, t) { if (f.marks.wm != null) windmillSails(g, OX, f.marks.wm, 50, t / 2400, f.night, 2.2); },
  ambient(g, f, t) {
    const { view } = f, W = view.x1 - view.x0, H = view.y1 - view.y0;
    if (!f.night) {
      // กลีบดอกไม้ปลิว
      for (let i = 0; i < 22; i++) {
        const ph = (t / (11000 + i * 400) + hash(i, 1)) % 1;
        const x = view.x0 + ((hash(i, 2) + ph * 0.35) % 1) * W, y = view.y0 + ph * H, a = t / 600 + i;
        g.save(); g.translate(x, y + Math.sin(t / 900 + i) * 10); g.rotate(a);
        g.fillStyle = i % 3 ? "rgba(245,150,190,.85)" : "rgba(255,255,255,.9)"; g.beginPath(); g.ellipse(0, 0, 4, 2.2, 0, 0, TAU); g.fill(); g.restore();
      }
    } else fireflies(g, f, t, 34, "#fff3b0");
  },
};
// หิ่งห้อยรอบกระดาน
function fireflies(g, f, t, n, col, around = null) {
  const { info } = f;
  for (let i = 0; i < n; i++) {
    const ph = (t / (5000 + i * 300) + i * 0.21) % 1, a = i * 1.7 + t / 4000;
    let bx, by;
    if (around) { const c = around[i % around.length]; bx = c.cx + Math.cos(a) * (c.rx + 0.6 + (i % 3) * 0.4); by = c.cy + Math.sin(a * 1.3) * (c.ry + 0.5 + (i % 2) * 0.4); }
    else { bx = hash(i, 3) * (info.cols + 4) - 2 + Math.cos(a) * 0.8; by = hash(i, 4) * info.rows + Math.sin(a * 1.3) * 0.8; }
    const [x, y] = P(bx, by, 0.6 + Math.sin(ph * TAU) * 0.4 + (i % 4) * 0.2);
    g.globalAlpha = 0.5 + 0.5 * Math.sin(t / 300 + i); g.fillStyle = col; g.beginPath(); g.arc(x, y, 2.2, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
}

// =================================================================== ภูมิภาค III · ป่าไม้ต้องสาป
const DARK_PINE = {
  day: { green: "#3a4a42", dark: "#2c3a34", snow: null, trunk: "#3a2e2a" },
  night: { green: "#142420", dark: "#0e1a17", snow: null, trunk: "#1c1614" },
};
function giantTree(c) {
  const { g, night, bY } = c, R = rng(77);
  const bark = night ? "#120f18" : "#3d3442", hi = night ? "#1d1826" : "#54485a", tb = bY - 6, th = 62;
  g.lineCap = "round";
  // ราก
  g.strokeStyle = bark;
  for (const [d, len] of [[-1, 54], [1, 60], [-1, 30], [1, 34]]) { g.lineWidth = 9; g.beginPath(); g.moveTo(OX + d * 12, tb - 14); g.quadraticCurveTo(OX + d * len * 0.6, tb - 8, OX + d * len, tb + 2); g.stroke(); }
  g.fillStyle = bark; g.beginPath(); g.moveTo(OX - 30, tb); g.quadraticCurveTo(OX - 12, tb - th * 0.5, OX - 18, tb - th); g.lineTo(OX + 16, tb - th); g.quadraticCurveTo(OX + 12, tb - th * 0.5, OX + 32, tb); g.closePath(); g.fill();
  g.strokeStyle = hi; g.lineWidth = 2; g.beginPath(); g.moveTo(OX - 18, tb - 4); g.quadraticCurveTo(OX - 8, tb - th * 0.5, OX - 12, tb - th + 4); g.stroke();
  const branch = (x0, y0, ang, len, w, depth) => {
    const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
    g.strokeStyle = bark; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0);
    g.quadraticCurveTo((x0 + x1) / 2 + (R() - 0.5) * len * 0.5, (y0 + y1) / 2 + (R() - 0.5) * len * 0.4, x1, y1); g.stroke();
    if (depth > 0) {
      branch(x1, y1, ang - 0.4 - R() * 0.35, len * 0.7, w * 0.62, depth - 1);
      branch(x1, y1, ang + 0.35 + R() * 0.35, len * 0.66, w * 0.6, depth - 1);
    }
  };
  branch(OX - 10, tb - th + 4, -Math.PI / 2 - 0.75, 50, 15, 4);
  branch(OX + 10, tb - th + 4, -Math.PI / 2 + 0.8, 52, 15, 4);
  branch(OX, tb - th, -Math.PI / 2, 34, 11, 3);
  g.lineCap = "butt";
  // โพรงหน้าผี (ตาวาดใน animBack)
  g.fillStyle = night ? "#030205" : "#16111a";
  g.beginPath(); g.ellipse(OX + 1, tb - 34, 11, 15, 0, 0, TAU); g.fill();
  c.marks.eye = tb - 38;
}
function runePillar(g, x, base, night) {
  g.fillStyle = night ? "#221d2c" : "#5a5466"; g.fillRect(x - 9, base - 42, 18, 42);
  g.fillStyle = night ? "#191520" : "#48425a"; g.fillRect(x + 2, base - 42, 7, 42);
  g.fillStyle = night ? "#2a2434" : "#6c667a"; g.beginPath(); g.moveTo(x - 12, base - 42); g.lineTo(x - 4, base - 50); g.lineTo(x + 8, base - 46); g.lineTo(x + 12, base - 42); g.closePath(); g.fill();
  glow(g, x, base - 24, 22, "170,110,255", night ? 0.5 : 0.25);
  g.strokeStyle = night ? "#c8a0ff" : "#9a70d0"; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(x - 3, base - 32); g.lineTo(x + 3, base - 26); g.lineTo(x - 3, base - 20); g.moveTo(x, base - 34); g.lineTo(x, base - 16); g.stroke();
}
const T3 = {
  back(c) {
    const { g, C, night, bY, R, VX0, VW } = c;
    skyFill(c, C.sky);
    if (night) { stars(c, 40, 0.6); orb(g, OX - 390, 46, 17, "#d8f0a8", "200,240,150", 90, 0.35); }
    else glow(g, OX + 380, 40, 120, "255,250,235", 0.45);
    ridge(c, C.hill[0], bY - 34, 40, 0, 0.3, "trees");
    ridge(c, C.hill[1], bY - 18, 30, 0, 1.7, "trees");
    horizonBand(c, C.horizon, 34);
    // หมอกจางตามแนวขอบฟ้า
    for (let i = 0; i < 12; i++) {
      g.fillStyle = `rgba(${C.fog},${0.12 + R() * 0.12})`; g.beginPath();
      g.ellipse(VX0 + R() * VW, bY - 34 + R() * 30, 110 + R() * 120, 9 + R() * 8, 0, 0, TAU); g.fill();
    }
    giantTree(c);
    runePillar(g, OX - 170, bY - 8, night); runePillar(g, OX + 170, bY - 8, night);
    backRow(c, 5, 22, (x) => Math.abs(x - OX) < 230, (x, y, sz, r) => {
      if (r < 0.5) deadTreeShape(g, x, y, sz * 0.9, Math.round(x * 3), night, 0, null);
      else pineShape(g, x, y, sz * 0.75, DARK_PINE[night ? "night" : "day"]);
    });
  },
  ground(c) {
    const { g, night, R, wx0, wx1, wy1 } = c;
    worldDots(c, 1.2, 0.9);
    // ใบไม้ร่วงแห้ง
    for (let i = 0; i < 160; i++) {
      const p = PS(wx0 + R() * (wx1 - wx0), -0.5 + R() * (wy1 + 0.5));
      if (p[1] < c.bY) continue;
      g.fillStyle = night ? "rgba(70,55,40,.6)" : ["rgba(150,100,50,.7)", "rgba(120,80,60,.7)", "rgba(170,130,70,.6)"][i % 3];
      g.beginPath(); g.ellipse(p[0], p[1], p[2] * 0.05, p[2] * 0.025, R() * 3, 0, TAU); g.fill();
    }
  },
  side(c) {
    const DP = DARK_PINE[c.night ? "night" : "day"];
    sideRow(c, 9, 1, (sx, sy, s, r, x, y) => {
      if (r < 0.55) { c.g.fillStyle = c.C.shadow; c.g.beginPath(); c.g.ellipse(sx, sy, s * 0.4, s * 0.12, 0, 0, TAU); c.g.fill(); deadTreeShape(c.g, sx, sy, s * (1.0 + r * 0.6), Math.round(x * 31 + y * 17), c.night, 0, null); }
      else pineShape(c.g, sx, sy, s * (0.9 + r * 0.5), DP);
    });
  },
  fore: (f, c) => foreBlobs(f, c, c.C.leaf, c.C.foreAcc),
  animBack(g, f, t) {
    // ตาในโพรงต้นไม้ยักษ์ (กะพริบเป็นพักๆ)
    const ey = f.marks.eye;
    if (ey == null || (t / 1000) % 7 < 0.2) return;
    const p = 0.6 + 0.4 * Math.sin(t / 700);
    if (f.night) glow(g, OX, ey, 26, "190,255,110", 0.35 * p);
    g.fillStyle = f.night ? "#c6ff6a" : "rgba(255,180,80,.85)";
    for (const d of [-1, 1]) { g.beginPath(); g.ellipse(OX + d * 4.5 + 1, ey, 2.6, 1.6, d * 0.3, 0, TAU); g.fill(); }
  },
  ambient(g, f, t) {
    const { info, night, view } = f;
    if (night) {
      // ดวงไฟผีลอยวน
      for (let i = 0; i < 12; i++) {
        const a = t / (3000 + i * 400) + i * 2.3;
        const bx = hash(i, 5) * (info.cols + 2) - 1 + Math.cos(a) * 1.2, by = hash(i, 6) * info.rows + Math.sin(a * 0.8) * 0.9;
        const [x, y, s] = P(bx, by, 1.1 + Math.sin(a * 2) * 0.3), col = i % 3 ? "150,255,170" : "200,150,255";
        glow(g, x, y, s * 0.35, col, 0.45 + 0.2 * Math.sin(t / 250 + i));
        g.fillStyle = `rgb(${col})`; g.beginPath(); g.arc(x, y, 2.4, 0, TAU); g.fill();
      }
    } else {
      // ใบไม้แห้งร่วง
      const W = view.x1 - view.x0, H = view.y1 - view.y0;
      for (let i = 0; i < 14; i++) {
        const ph = (t / (13000 + i * 500) + hash(i, 7)) % 1;
        const x = view.x0 + ((hash(i, 8) + Math.sin(t / 1400 + i) * 0.03) % 1) * W, y = view.y0 + ph * H;
        g.save(); g.translate(x, y); g.rotate(t / 700 + i);
        g.fillStyle = i % 2 ? "rgba(140,95,50,.8)" : "rgba(110,85,70,.8)"; g.beginPath(); g.ellipse(0, 0, 4.5, 2.2, 0, 0, TAU); g.fill(); g.restore();
      }
    }
  },
};

// =================================================================== ภูมิภาค IV · คลื่นวงวนน้ำ
function seaWhirl(g, x, y, rx, ry, night) {
  g.fillStyle = night ? "rgba(2,15,35,.5)" : "rgba(10,60,100,.35)"; g.beginPath(); g.ellipse(x, y, rx * 0.35, ry * 0.35, 0, 0, TAU); g.fill();
  g.strokeStyle = night ? "rgba(170,220,255,.4)" : "rgba(255,255,255,.65)"; g.lineWidth = 1.5;
  for (let arm = 0; arm < 3; arm++) {
    g.beginPath();
    for (let i = 0; i <= 24; i++) { const r = 1 - i / 26, a = arm * TAU / 3 + i * 0.3; const px = x + Math.cos(a) * rx * r, py = y + Math.sin(a) * ry * r; if (i) g.lineTo(px, py); else g.moveTo(px, py); }
    g.stroke();
  }
}
function lighthouseIsland(c) {
  const { g, night, bY } = c;
  const rock = night ? "#3a4256" : "#8a8278", rockS = night ? "#2a3044" : "#6a6258", grass = night ? "#2a4a48" : "#7fb36a";
  const base = bY - 16;
  // หินฐานเกาะ
  [[-110, 0, 46, 14], [-50, -6, 60, 20], [20, -10, 64, 24], [90, -2, 50, 16]].forEach(([dx, dy, rx, ry], i) => {
    g.fillStyle = i % 2 ? rockS : rock; g.beginPath(); g.ellipse(OX + dx, base + dy, rx, ry, 0, Math.PI, TAU); g.fill();
  });
  g.fillStyle = grass; g.beginPath(); g.ellipse(OX + 0, base - 22, 70, 9, 0, Math.PI, TAU); g.fill();
  // บ้านผู้ดูแล
  const hx = OX - 46, hb = base - 22;
  g.fillStyle = night ? "#b8bccc" : "#fbfaf4"; g.fillRect(hx - 20, hb - 22, 40, 22);
  g.fillStyle = night ? "#2c4a78" : "#3d7ec4"; g.beginPath(); g.moveTo(hx - 24, hb - 20); g.lineTo(hx, hb - 36); g.lineTo(hx + 24, hb - 20); g.closePath(); g.fill();
  if (night) glow(g, hx - 8, hb - 12, 18, "255,207,110", 0.45);
  g.fillStyle = night ? "#ffcf6e" : "#8fc3ea"; g.fillRect(hx - 12, hb - 16, 8, 8);
  // ประภาคาร
  const lx = OX + 30, lb = base - 24, h = 84, wb = 28, wt = 19, top = lb - h;
  g.fillStyle = night ? "#c4c8d6" : "#ffffff"; g.beginPath(); g.moveTo(lx - wb / 2, lb); g.lineTo(lx - wt / 2, top); g.lineTo(lx + wt / 2, top); g.lineTo(lx + wb / 2, lb); g.closePath(); g.fill();
  g.fillStyle = night ? "#8a2e3a" : "#d6453f";
  for (const [a, b] of [[0.12, 0.3], [0.48, 0.66]]) {
    const y0 = lb - h * b, y1 = lb - h * a, w0 = wb - (wb - wt) * b, w1 = wb - (wb - wt) * a;
    g.beginPath(); g.moveTo(lx - w1 / 2, y1); g.lineTo(lx - w0 / 2, y0); g.lineTo(lx + w0 / 2, y0); g.lineTo(lx + w1 / 2, y1); g.closePath(); g.fill();
  }
  g.fillStyle = "rgba(0,0,0,.12)"; g.beginPath(); g.moveTo(lx + 2, lb); g.lineTo(lx + 1, top); g.lineTo(lx + wt / 2, top); g.lineTo(lx + wb / 2, lb); g.closePath(); g.fill();
  g.fillStyle = "#2b3442"; g.fillRect(lx - 14, top - 3, 28, 4);
  g.fillStyle = night ? "#fff1b0" : "#d8eef8"; g.fillRect(lx - 8, top - 15, 16, 12);
  g.strokeStyle = "#2b3442"; g.lineWidth = 1.5; g.strokeRect(lx - 8, top - 15, 16, 12);
  g.fillStyle = night ? "#8a2e3a" : "#d6453f"; g.beginPath(); g.moveTo(lx - 10, top - 15); g.lineTo(lx, top - 26); g.lineTo(lx + 10, top - 15); g.closePath(); g.fill();
  c.marks.lamp = [lx, top - 9];
  // ฟองคลื่นรอบเกาะ
  g.strokeStyle = night ? "rgba(190,230,255,.45)" : "rgba(255,255,255,.85)"; g.lineWidth = 2;
  for (let i = 0; i < 9; i++) { const x = OX - 150 + i * 36; g.beginPath(); g.arc(x, base + 2, 14, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
}
function seaArch(g, x, base, night) {
  const rock = night ? "#343c50" : "#7d766c", sh = night ? "#262c3e" : "#5f584f";
  g.strokeStyle = rock; g.lineWidth = 20; g.lineCap = "butt";
  g.beginPath(); g.moveTo(x - 38, base); g.lineTo(x - 34, base - 40); g.quadraticCurveTo(x, base - 70, x + 34, base - 40); g.lineTo(x + 38, base); g.stroke();
  g.strokeStyle = sh; g.lineWidth = 8; g.beginPath(); g.moveTo(x + 44, base); g.lineTo(x + 40, base - 40); g.stroke();
  g.strokeStyle = night ? "rgba(190,230,255,.45)" : "rgba(255,255,255,.85)"; g.lineWidth = 2;
  for (const d of [-38, 38]) { g.beginPath(); g.ellipse(x + d, base, 16, 4, 0, 0, TAU); g.stroke(); }
}
function seaRock(g, sx, sy, s, r, night) {
  g.strokeStyle = night ? "rgba(190,230,255,.45)" : "rgba(255,255,255,.8)"; g.lineWidth = 1.5;
  g.beginPath(); g.ellipse(sx, sy, s * 0.55, s * 0.17, 0, 0, TAU); g.stroke();
  const l = night ? 22 : 46;
  for (const [dx, dy, rx, ry, dl] of [[0.12, -0.12, 0.3, 0.28, -6], [-0.12, -0.24, 0.32, 0.38 + r * 0.3, 4]]) {
    g.fillStyle = `hsl(205,12%,${l + dl}%)`; g.beginPath(); g.ellipse(sx + dx * s, sy + dy * s, rx * s, ry * s, 0, Math.PI * 1.02, Math.PI * 1.98); g.lineTo(sx + (dx + rx) * s, sy); g.lineTo(sx + (dx - rx) * s, sy); g.fill();
  }
}
const T4 = {
  back(c) {
    const { g, C, night, bY, VX0, VW } = c;
    skyFill(c, C.sky);
    if (night) { stars(c, 70); orb(g, OX + 400, 40, 15, "#eef4ff", "220,235,255", 80, 0.35); }
    else { orb(g, OX - 420, 34, 18, "#fffbe8", "255,245,210", 110, 0.5); clouds(c, 6, "rgba(255,255,255,.9)"); }
    // ทะเลไกล
    const gr = g.createLinearGradient(0, bY - 46, 0, bY + 12);
    gr.addColorStop(0, C.seaFar); gr.addColorStop(1, C.ground1);
    g.fillStyle = gr; g.fillRect(VX0, bY - 46, VW, 58);
    g.fillStyle = night ? "rgba(200,225,255,.25)" : "rgba(255,255,255,.6)"; g.fillRect(VX0, bY - 46, VW, 1.5);
    // เกาะไกล
    for (const [dx, w, h] of [[-500, 130, 14], [-330, 70, 8], [520, 170, 18]]) {
      g.fillStyle = C.hill[0]; g.beginPath(); g.ellipse(OX + dx, bY - 45, w / 2, h, 0, Math.PI, TAU); g.fill();
    }
    // แสงจันทร์/แดดสะท้อนน้ำ
    const rx = night ? OX + 400 : OX - 420;
    for (let i = 0; i < 12; i++) { const y = bY - 42 + i * 6, w = 8 + i * 3; g.fillStyle = night ? `rgba(230,240,255,${0.45 - i * 0.03})` : `rgba(255,255,240,${0.6 - i * 0.04})`; g.fillRect(rx - w / 2 + Math.sin(i * 2.3) * 4, y, w, 1.6); }
    seaWhirl(g, OX - 430, bY - 18, 56, 10, night);
    seaWhirl(g, OX + 445, bY - 24, 44, 8, night);
    seaArch(g, OX - 255, bY - 14, night);
    lighthouseIsland(c);
    seaRock(g, OX + 250, bY - 10, 52, 0.5, night);
  },
  ground(c) {
    const { g, R, night, bY, VX0, VX1, wx0, wx1, wy1 } = c;
    const area = (wx1 - wx0) * (wy1 + 1), n = Math.min(1400, Math.round(area * 1.2));
    g.lineCap = "round";
    for (let i = 0; i < n; i++) {
      const [sx, sy, s] = PS(wx0 + R() * (wx1 - wx0), -0.5 + R() * (wy1 + 0.5));
      if (sy < bY - 8 || sx < VX0 - 10 || sx > VX1 + 10) continue;
      const w = s * (0.14 + R() * 0.2);
      g.strokeStyle = night ? `rgba(140,200,255,${0.15 + R() * 0.2})` : `rgba(255,255,255,${0.25 + R() * 0.35})`; g.lineWidth = Math.max(1, s * 0.03);
      g.beginPath(); g.moveTo(sx - w, sy); g.quadraticCurveTo(sx, sy - s * 0.06, sx + w, sy); g.stroke();
    }
    g.lineCap = "butt";
  },
  base(c) {
    const { g, C, night, info } = c;
    const outer = shoreline(info, 0.52, 0.22, 404), inner = shoreline(info, 0.34, 0.16, 404);
    gPoly(g, outer); g.fillStyle = night ? "rgba(150,200,240,.25)" : "rgba(220,245,250,.6)"; g.fill();
    gPoly(g, inner); g.fillStyle = C.sandWet; g.fill();
    g.strokeStyle = night ? "rgba(200,235,255,.6)" : "rgba(255,255,255,.95)"; g.lineWidth = 2; g.stroke();
    gPoly(g, shoreline(info, 0.18, 0.12, 405)); g.fillStyle = C.sand; g.fill();
    // เปลือกหอย/ก้อนกรวด
    const R = rng(406);
    for (let i = 0; i < 260; i++) {
      const p = P(-0.1 + R() * (info.cols + 0.2), -0.1 + R() * (info.rows + 0.2)), k = R();
      g.fillStyle = night ? "rgba(40,45,70,.35)" : k < 0.5 ? "rgba(170,140,90,.45)" : k < 0.8 ? "rgba(255,255,255,.55)" : "rgba(240,160,150,.6)";
      g.beginPath(); g.ellipse(p[0], p[1], p[2] * 0.03, p[2] * 0.018, 0, 0, TAU); g.fill();
    }
  },
  side(c) {
    const R = rng(407);
    sideRow(c, 9, 0.45, (sx, sy, s, r) => {
      if (r < 0.75) seaRock(c.g, sx, sy, s * (0.8 + r * 0.6), r, c.night);
      else {
        // หลักไม้ท่าเรือเก่า
        const g = c.g;
        for (let k = 0; k < 3; k++) {
          const px = sx + (k - 1) * s * 0.35, h = s * (0.5 + R() * 0.4);
          g.fillStyle = c.night ? "#3e3226" : "#7a5838"; g.fillRect(px - s * 0.05, sy - h, s * 0.1, h);
          g.strokeStyle = c.night ? "rgba(190,230,255,.45)" : "rgba(255,255,255,.8)"; g.lineWidth = 1.2; g.beginPath(); g.ellipse(px, sy, s * 0.12, s * 0.04, 0, 0, TAU); g.stroke();
        }
      }
    });
  },
  animBack(g, f, t) {
    // ไฟประภาคาร — กลางคืนส่องลำแสงกวาด
    if (!f.marks.lamp) return;
    const [x, y] = f.marks.lamp;
    if (!f.night) { glow(g, x, y, 10, "255,250,200", 0.5); return; }
    const a = t / 1700, L = 560 * Math.cos(a), spread = 0.09;
    glow(g, x, y, 40, "255,240,170", 0.55 + 0.2 * Math.abs(Math.cos(a)));
    if (Math.abs(L) > 6) {
      const gr = g.createLinearGradient(x, y, x + L, y);
      gr.addColorStop(0, "rgba(255,240,170,.45)"); gr.addColorStop(1, "rgba(255,240,170,0)");
      g.fillStyle = gr; g.beginPath(); g.moveTo(x, y - 3); g.lineTo(x + L, y - Math.abs(L) * spread); g.lineTo(x + L, y + Math.abs(L) * spread); g.lineTo(x, y + 3); g.closePath(); g.fill();
    }
  },
  ambient(g, f, t) {
    const { info, night } = f;
    // ประกายแดดบนน้ำ / แพลงก์ตอนเรืองแสงตอนกลางคืน
    for (let i = 0; i < 30; i++) {
      const side = i % 2 ? -1.2 - hash(i, 9) * 4 : info.cols + 0.2 + hash(i, 9) * 4;
      const [x, y] = P(side, hash(i, 10) * (info.rows + 2) - 1);
      const p = Math.max(0, Math.sin(t / (500 + (i % 5) * 140) + i * 1.9));
      if (p < 0.2) continue;
      if (night) { glow(g, x, y, 7, "120,240,255", 0.6 * p); }
      else {
        g.strokeStyle = `rgba(255,255,255,${0.9 * p})`; g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(x - 5 * p, y); g.lineTo(x + 5 * p, y); g.moveTo(x, y - 3 * p); g.lineTo(x, y + 3 * p); g.stroke();
      }
    }
  },
};

// =================================================================== ภูมิภาค V · ทะเลทราย
function pyramid(g, x, base, w, h, night) {
  const lit = night ? "#6d6890" : "#ecc98a", sh = night ? "#4f4a72" : "#c99a5a";
  g.fillStyle = lit; g.beginPath(); g.moveTo(x - w / 2, base); g.lineTo(x, base - h); g.lineTo(x + w * 0.12, base); g.closePath(); g.fill();
  g.fillStyle = sh; g.beginPath(); g.moveTo(x, base - h); g.lineTo(x + w / 2, base); g.lineTo(x + w * 0.12, base); g.closePath(); g.fill();
  g.strokeStyle = night ? "rgba(30,25,60,.25)" : "rgba(140,100,50,.3)"; g.lineWidth = 1;
  for (let k = 1; k < 8; k++) { const y = base - h * k / 8, hw = (w / 2) * (1 - k / 8); g.beginPath(); g.moveTo(x - hw, y); g.lineTo(x + hw, y); g.stroke(); }
}
function sandGate(c) {
  const { g, night, bY } = c, base = bY - 12;
  const lit = night ? "#8f88a6" : "#e3c48a", sh = night ? "#6a6488" : "#c29a5e";
  const torches = (c.marks.torches = []);
  for (const x of [OX - 205, OX - 135]) {
    g.fillStyle = lit; g.fillRect(x - 10, base - 66, 20, 66); g.fillStyle = sh; g.fillRect(x + 3, base - 66, 7, 66);
    g.fillStyle = lit; g.fillRect(x - 13, base - 70, 26, 6);
    g.fillStyle = "#3a2a1a"; g.fillRect(x - 15, base - 44, 6, 3); g.fillRect(x - 14, base - 50, 3, 8);
    torches.push([x - 12.5, base - 52]);
  }
  g.fillStyle = lit; g.beginPath(); g.moveTo(OX - 220, base - 70); g.lineTo(OX - 150, base - 70); g.lineTo(OX - 138, base - 78); g.lineTo(OX - 160, base - 80); g.lineTo(OX - 220, base - 80); g.closePath(); g.fill();
  // เสาโอเบลิสก์
  const ox = OX - 300;
  g.fillStyle = lit; g.beginPath(); g.moveTo(ox - 8, base); g.lineTo(ox - 5, base - 74); g.lineTo(ox, base - 84); g.lineTo(ox + 5, base - 74); g.lineTo(ox + 8, base); g.closePath(); g.fill();
  g.fillStyle = sh; g.beginPath(); g.moveTo(ox + 1, base); g.lineTo(ox + 1, base - 74); g.lineTo(ox, base - 84); g.lineTo(ox + 5, base - 74); g.lineTo(ox + 8, base); g.closePath(); g.fill();
}
const T5 = {
  back(c) {
    const { g, C, night, bY } = c;
    skyFill(c, C.sky);
    if (night) {
      stars(c, 120);
      orb(g, OX - 420, 40, 16, "#fff4d6", "255,244,214", 80, 0.35);
      g.fillStyle = C.sky[0]; g.beginPath(); g.arc(OX - 413, 36, 14, 0, TAU); g.fill();
    } else orb(g, OX + 430, 32, 22, "#fffbe8", "255,236,180", 150, 0.7);
    ridge(c, C.hill[0], bY - 46, 18, 0.0045, 0.5, "smooth");
    pyramid(g, OX + 170, bY - 22, 250, 100, night);
    pyramid(g, OX + 390, bY - 24, 120, 50, night);
    ridge(c, C.hill[1], bY - 26, 12, 0.007, 2.4, "smooth");
    horizonBand(c, C.horizon, 36);
    sandGate(c);
    backRow(c, 5, 18, (x) => x > OX - 330 && x < OX + 470, (x, y, sz, r) => {
      if (r < 0.5) cactusShape(g, x, y, sz * 0.7, night);
      else { g.fillStyle = C.hill[1]; g.beginPath(); g.ellipse(x, y, sz * 0.7, sz * 0.25, 0, Math.PI, TAU); g.fill(); }
    });
  },
  ground(c) {
    const { g, R, night, bY, VX0, VX1, wx0, wx1, wy1 } = c;
    worldDots(c, 0.7, 0.6, night ? 0.5 : 0.6);
    // ลอนทรายจากลม
    const area = (wx1 - wx0) * (wy1 + 1), n = Math.min(1100, Math.round(area * 1.0));
    g.strokeStyle = night ? "rgba(40,36,70,.3)" : "rgba(170,120,60,.3)"; g.lineWidth = 1.2;
    for (let i = 0; i < n; i++) {
      const [sx, sy, s] = PS(wx0 + R() * (wx1 - wx0), -0.5 + R() * (wy1 + 0.5));
      if (sy < bY || sx < VX0 - 10 || sx > VX1 + 10) continue;
      const w = s * (0.18 + R() * 0.2);
      g.beginPath(); g.moveTo(sx - w, sy); g.quadraticCurveTo(sx - w * 0.3, sy - s * 0.05, sx + w, sy + s * 0.01); g.stroke();
    }
  },
  side(c) {
    sideRow(c, 9, 0.6, (sx, sy, s, r) => {
      const g = c.g;
      if (r < 0.45) {
        g.fillStyle = c.C.shadow; g.beginPath(); g.ellipse(sx, sy, s * 0.3, s * 0.1, 0, 0, TAU); g.fill();
        cactusShape(g, sx, sy, s * (0.9 + r * 0.6), c.night);
      } else {
        g.fillStyle = c.night ? "#4f4c72" : "#e3bd7c"; g.beginPath(); g.ellipse(sx, sy, s * (0.8 + r * 0.6), s * (0.3 + r * 0.2), 0, Math.PI, TAU); g.fill();
        g.fillStyle = c.night ? "#3f3c60" : "#cfa461"; g.beginPath(); g.ellipse(sx + s * 0.2, sy, s * (0.5 + r * 0.4), s * (0.2 + r * 0.14), 0, Math.PI, TAU); g.fill();
      }
    });
  },
  animBack(g, f, t) {
    // คบเพลิงที่ประตูโบราณ
    (f.marks.torches || []).forEach(([x, y], i) => {
      const fl = 0.7 + 0.3 * Math.sin(t / 90 + i * 2) * Math.sin(t / 37 + i);
      glow(g, x, y - 4, f.night ? 30 : 14, "255,170,60", (f.night ? 0.5 : 0.3) * fl);
      g.fillStyle = "#ffb347"; g.beginPath(); g.moveTo(x - 3, y); g.quadraticCurveTo(x - 3, y - 6 * fl, x, y - 10 * fl); g.quadraticCurveTo(x + 3, y - 6 * fl, x + 3, y); g.closePath(); g.fill();
      g.fillStyle = "#fff1a8"; g.beginPath(); g.arc(x, y - 2, 1.5, 0, TAU); g.fill();
    });
  },
  ambient(g, f, t) {
    const { night, view, info } = f;
    if (night) { fireflies(g, f, t, 18, "#fff3b0", info.healClusters.length ? info.healClusters : null); return; }
    // ทรายปลิวตามลม
    const W = view.x1 - view.x0, H = view.y1 - view.y0;
    g.strokeStyle = "rgba(255,240,205,.5)"; g.lineWidth = 1.2;
    for (let i = 0; i < 16; i++) {
      const ph = (t / (2600 + i * 180) + hash(i, 11)) % 1, x = view.x0 + ph * (W + 200) - 100, y = view.y0 + (0.25 + hash(i, 12) * 0.7) * H + Math.sin(t / 600 + i) * 6;
      g.globalAlpha = Math.sin(ph * Math.PI); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 26 + (i % 3) * 10, y - 2); g.stroke();
    }
    g.globalAlpha = 1;
  },
};

// =================================================================== ภูมิภาค VI · อาณาจักรน้ำแข็ง
function peak(g, x, base, h, hw, lit, sh, snow) {
  g.fillStyle = lit; g.beginPath(); g.moveTo(x - hw, base); g.lineTo(x, base - h); g.lineTo(x + hw * 0.1, base); g.closePath(); g.fill();
  g.fillStyle = sh; g.beginPath(); g.moveTo(x, base - h); g.lineTo(x + hw, base); g.lineTo(x + hw * 0.1, base); g.closePath(); g.fill();
  const k = 0.36;
  g.fillStyle = snow; g.beginPath(); g.moveTo(x, base - h); g.lineTo(x + hw * k, base - h * (1 - k));
  g.lineTo(x + hw * k * 0.5, base - h * (1 - k * 0.8)); g.lineTo(x + hw * k * 0.1, base - h * (1 - k * 1.1)); g.lineTo(x - hw * k * 0.3, base - h * (1 - k * 0.75));
  g.lineTo(x - hw * k * 0.7, base - h * (1 - k * 1.05)); g.lineTo(x - hw * k, base - h * (1 - k)); g.closePath(); g.fill();
}
function aurora(c) {
  const { g, VX0, VX1 } = c;
  [["120,255,190", 22, 0], ["180,140,255", 46, 2.1]].forEach(([rgb, y0, ph]) => {
    const yAt = (x) => y0 + Math.sin(x * 0.006 + ph) * 16 + Math.sin(x * 0.017 + ph) * 6;
    const gr = g.createLinearGradient(0, y0 - 24, 0, y0 + 70);
    gr.addColorStop(0, `rgba(${rgb},0)`); gr.addColorStop(0.35, `rgba(${rgb},.32)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.beginPath(); g.moveTo(VX0, yAt(VX0));
    for (let x = VX0; x <= VX1 + 8; x += 8) g.lineTo(x, yAt(x));
    for (let x = VX1 + 8; x >= VX0; x -= 8) g.lineTo(x, yAt(x) + 60);
    g.closePath(); g.fill();
    g.strokeStyle = `rgba(${rgb},.1)`; g.lineWidth = 2;
    for (let x = VX0; x <= VX1; x += 7) { const y = yAt(x); g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 30 + Math.sin(x * 0.05) * 14); g.stroke(); }
  });
}
function icePalace(c) {
  const { g, night, bY } = c, base = bY - 14;
  if (night) glow(g, OX, base - 50, 200, "120,220,255", 0.25);
  const A = night ? "rgba(150,195,235,.95)" : "rgba(205,236,252,.97)", B = night ? "rgba(105,155,205,.95)" : "rgba(150,200,235,.97)";
  const capA = night ? "#d6ecff" : "#f4fbff", capB = night ? "#9cc2e6" : "#c4e4f6", win = night ? "#a6f6ff" : "#5c8fc0";
  const spire = (x, w, h) => {
    g.fillStyle = A; g.fillRect(x - w / 2, base - h, w, h);
    g.fillStyle = B; g.fillRect(x + w * 0.1, base - h, w * 0.4, h);
    g.fillStyle = capA; g.beginPath(); g.moveTo(x - w / 2 - 3, base - h); g.lineTo(x, base - h - w * 1.5); g.lineTo(x + w / 2 + 3, base - h); g.closePath(); g.fill();
    g.fillStyle = capB; g.beginPath(); g.moveTo(x, base - h - w * 1.5); g.lineTo(x + w / 2 + 3, base - h); g.lineTo(x + w * 0.1, base - h); g.closePath(); g.fill();
    g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = 1; g.strokeRect(x - w / 2, base - h, w, h);
    if (night) glow(g, x, base - h + 18, 16, "160,240,255", 0.5);
    g.fillStyle = win; g.fillRect(x - 3, base - h + 10, 6, 13);
    if (h > 70) g.fillRect(x - 3, base - h + 34, 6, 13);
  };
  spire(OX - 125, 22, 56); spire(OX + 125, 22, 56);
  g.fillStyle = A; g.fillRect(OX - 125, base - 38, 250, 38);
  g.fillStyle = B; g.fillRect(OX - 125, base - 14, 250, 14);
  for (let x = OX - 125; x < OX + 125; x += 14) { g.fillStyle = A; g.fillRect(x, base - 45, 8, 8); }
  spire(OX - 62, 26, 76); spire(OX + 62, 26, 76);
  spire(OX, 36, 92);
  g.fillStyle = night ? "#1d3a66" : "#3d6fa8"; g.beginPath(); g.moveTo(OX - 15, base); g.lineTo(OX - 15, base - 22); g.arc(OX, base - 22, 15, Math.PI, 0); g.lineTo(OX + 15, base); g.closePath(); g.fill();
  if (night) { g.fillStyle = "rgba(160,240,255,.35)"; g.fillRect(OX - 10, base - 20, 20, 20); }
  // ผลึกน้ำแข็งที่ฐาน
  for (const [dx, h, tilt] of [[-150, 26, -0.3], [-140, 18, 0.25], [150, 28, 0.3], [160, 16, -0.2], [-40, 14, -0.4], [44, 16, 0.4]]) prism(g, OX, base + 2, dx, h, 9, tilt, capA, capB);
}
const T6 = {
  back(c) {
    const { g, C, night, bY, VX0, VX1 } = c;
    skyFill(c, C.sky);
    if (night) { aurora(c); stars(c, 80); orb(g, OX - 430, 34, 11, "#eef4ff", "220,235,255", 60, 0.3); }
    else { orb(g, OX + 420, 30, 16, "#ffffff", "255,255,255", 90, 0.5); clouds(c, 4, "rgba(255,255,255,.75)"); }
    const R = rng(606), snow = night ? "#dbe6f8" : "#ffffff";
    for (let x = VX0 - 40; x < VX1 + 60; x += 70 + R() * 70) peak(g, x, bY - 26, 50 + R() * 50, 50 + R() * 40, C.hill[0], C.hillSh[0], snow);
    for (let x = VX0 - 20; x < VX1 + 40; x += 60 + R() * 60) peak(g, x, bY - 14, 26 + R() * 26, 40 + R() * 30, C.hill[1], C.hillSh[1], snow);
    horizonBand(c, C.horizon, 30);
    icePalace(c);
    const SP = SNOW_PINE[night ? "night" : "day"];
    backRow(c, 5, 24, (x) => Math.abs(x - OX) < 250, (x, y, sz) => pineShape(g, x, y, sz * 0.8, SP));
  },
  ground(c) {
    const { g, R, night, bY, VX0, VX1, wx0, wx1, wy1 } = c;
    worldDots(c, 1, 0.5, night ? 0.6 : 0.85);
    // ร่องหิมะ (เงาฟ้าอ่อน)
    for (let i = 0; i < 120; i++) {
      const [sx, sy, s] = PS(wx0 + R() * (wx1 - wx0), -0.5 + R() * (wy1 + 0.5));
      if (sy < bY || sx < VX0 - 40 || sx > VX1 + 40) continue;
      g.strokeStyle = night ? "rgba(30,50,90,.25)" : "rgba(120,160,210,.28)"; g.lineWidth = Math.max(1, s * 0.04);
      g.beginPath(); g.ellipse(sx, sy, s * (0.3 + R() * 0.4), s * 0.08, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    }
  },
  side(c) {
    const SP = SNOW_PINE[c.night ? "night" : "day"];
    sideRow(c, 9, 1, (sx, sy, s, r) => {
      const g = c.g;
      g.fillStyle = c.C.shadow; g.beginPath(); g.ellipse(sx, sy, s * 0.4, s * 0.12, 0, 0, TAU); g.fill();
      if (r < 0.78) pineShape(g, sx, sy, s * (1.0 + r * 0.5), SP);
      else { const A = c.night ? "#bcd6f0" : "#eaf8ff", B = c.night ? "#7fa6d2" : "#a8d6f0"; prism(g, sx, sy, 0, s * 0.8, s * 0.2, -0.1, A, B); prism(g, sx, sy, s * 0.15, s * 0.5, s * 0.16, 0.35, A, B); prism(g, sx, sy, -s * 0.15, s * 0.4, s * 0.14, -0.45, A, B); }
    });
  },
  fore: (f, c) => foreBlobs(f, c, c.C.leaf, c.C.foreAcc),
  ambient(g, f, t) {
    // หิมะตก
    const { view, night } = f, W = view.x1 - view.x0, H = view.y1 - view.y0;
    g.fillStyle = night ? "rgba(230,240,255,.85)" : "rgba(255,255,255,.95)";
    for (let i = 0; i < 70; i++) {
      const ph = (t / (7000 + (i % 7) * 900) + hash(i, 13)) % 1;
      const x = view.x0 + hash(i, 14) * W + Math.sin(t / 1100 + i) * 14, y = view.y0 + ph * H, r = 1.1 + (i % 4) * 0.5;
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
  },
};

// =================================================================== ภูมิภาค VII · จุดสิ้นสุดของโลก
function riftPts(VY0, bY) {
  const R = rng(707), pts = [];
  let x = OX + 70, y = Math.min(VY0, -10);
  while (y < bY - 50) { pts.push([x, y]); y += 10 + R() * 14; x += (R() - 0.55) * 22; }
  pts.push([x, bY - 50]);
  return pts;
}
function riftPath(g, pts) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); }
function floatIsle(g, x, y, w, night, crystal) {
  const top = night ? "#2e2638" : "#3f3448", side = night ? "#1c1624" : "#2a2232";
  g.fillStyle = side; g.beginPath(); g.moveTo(x - w, y); g.lineTo(x - w * 0.5, y + w * 0.5); g.lineTo(x - w * 0.15, y + w * 1.1); g.lineTo(x + w * 0.3, y + w * 0.6); g.lineTo(x + w, y); g.closePath(); g.fill();
  g.fillStyle = top; g.beginPath(); g.ellipse(x, y, w, w * 0.22, 0, 0, TAU); g.fill();
  if (crystal) { glow(g, x, y - w * 0.3, w * 0.9, "190,120,255", night ? 0.4 : 0.25); prism(g, x, y, 0, w * 0.7, w * 0.22, 0.1, "#d9a8ff", "#8a4fd8"); prism(g, x, y, w * 0.25, w * 0.4, w * 0.16, 0.4, "#c08bff", "#6a3cb0"); }
}
const T7 = {
  back(c) {
    const { g, C, night, bY, VX0, VY0, VX1, R } = c;
    skyFill(c, C.sky);
    glow(g, OX - 300, 40, 240, "180,60,200", night ? 0.22 : 0.25);
    glow(g, OX + 360, 70, 280, "90,60,220", night ? 0.25 : 0.2);
    stars(c, night ? 130 : 45, night ? 1 : 0.7);
    // สุริยุปราคา
    const ex = OX - 400, ey = 46;
    glow(g, ex, ey, 70, night ? "190,120,255" : "255,150,70", 0.5);
    g.fillStyle = "#08030c"; g.beginPath(); g.arc(ex, ey, 17, 0, TAU); g.fill();
    g.strokeStyle = night ? "#e2c4ff" : "#ffd9a0"; g.lineWidth = 2; g.stroke();
    // รอยแยกฟ้า
    const pts = riftPts(VY0, bY); c.marks.rift = pts;
    g.lineJoin = "round";
    riftPath(g, pts); g.strokeStyle = "rgba(220,170,255,.12)"; g.lineWidth = 30; g.stroke();
    riftPath(g, pts); g.strokeStyle = "rgba(230,190,255,.3)"; g.lineWidth = 12; g.stroke();
    riftPath(g, pts); g.strokeStyle = "#fbf0ff"; g.lineWidth = 3; g.stroke();
    g.lineJoin = "miter";
    // แผ่นดินแตกไกล + ยอดหอพัง
    ridge(c, C.hill[0], bY - 30, 26, 0.012, 0.7);
    for (const [dx, h, tilt, w] of [[-150, 86, -0.14, 20], [170, 70, 0.2, 18], [-60, 46, 0.32, 14], [260, 40, -0.25, 12]]) {
      const x = OX + dx, b = bY - 22;
      g.save(); g.translate(x, b); g.rotate(tilt);
      g.fillStyle = night ? "#120a18" : "#21142a"; g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(-w * 0.35, -h); g.lineTo(-w * 0.05, -h + 8); g.lineTo(w * 0.2, -h - 6); g.lineTo(w * 0.4, -h + 4); g.lineTo(w / 2, 0); g.closePath(); g.fill();
      g.strokeStyle = "rgba(200,130,255,.6)"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-2, -h * 0.8); g.lineTo(3, -h * 0.5); g.lineTo(-1, -h * 0.25); g.stroke();
      g.restore();
    }
    // ลาวาไหลจากขอบแผ่นดินไกล
    for (const lx of [OX - 330, OX + 330, OX + 30]) { glow(g, lx, bY - 20, 30, "255,110,40", 0.35); g.fillStyle = "#ff7a2a"; g.fillRect(lx - 1.5, bY - 34, 3, 26); }
    ridge(c, C.hill[1], bY - 16, 14, 0.02, 2.2);
    // เกาะลอย
    for (let i = 0; i < 7; i++) {
      const x = VX0 + (i + 0.5) / 7 * (VX1 - VX0) + (R() - 0.5) * 60, y = 28 + R() * 60, w = 12 + R() * 20;
      if (Math.abs(x - OX - 70) < 60) continue;
      floatIsle(g, x, y, w, night, i % 2 === 0);
    }
  },
  ground(c) {
    const { g, R, night, bY, VX0, VY1, VW } = c;
    // ดาวในความว่างเปล่าใต้ขอบฟ้า
    for (let i = 0; i < Math.round(240 * VW / LW); i++) {
      const x = VX0 + R() * VW, y = bY + R() * (VY1 - bY);
      g.fillStyle = `rgba(${i % 4 ? "255,255,255" : "200,150,255"},${0.2 + R() * 0.5})`; g.fillRect(x, y, 1.4, 1.4);
    }
    glow(g, OX, VY1 + 60, 520, "120,40,160", night ? 0.25 : 0.3);
  },
  base(c) {
    const { g, C, night, info, R } = c, COLS = info.cols, ROWS = info.rows;
    const top = shoreline(info, 0.55, 0.35, 701);
    // หน้าผารอบเกาะ — วาดเฉพาะช่วงขอบที่หันเข้ากล้อง (ตามมุมหมุน) เรียงไกล→ใกล้
    const ax = viewAxes(), n = top.length;
    const zl = top.map((_, i) => -(0.9 + (i % 3 === 1 ? 0.7 : 0.15) + R() * 0.4));
    const segs = [];
    for (let i = 0; i < n; i++) {
      const A = top[i], B = top[(i + 1) % n], nx = B[1] - A[1], ny = -(B[0] - A[0]);
      if (nx * ax.fx + ny * ax.fy > 0.05) segs.push({ A, B, za: zl[i], zb: zl[(i + 1) % n], d: depthOf((A[0] + B[0]) / 2, (A[1] + B[1]) / 2), i });
    }
    segs.sort((a, b) => a.d - b.d);
    const fp = segs.length ? segs[segs.length - 1].A : [COLS / 2, ROWS];
    const ga = P(fp[0], fp[1], 0), gb = P(fp[0], fp[1], -1.6), gr = g.createLinearGradient(0, ga[1], 0, gb[1]);
    gr.addColorStop(0, C.basalt2); gr.addColorStop(1, C.cliff);
    for (const { A, B, za, zb } of segs) {
      gPoly(g, [[A[0], A[1], 0], [B[0], B[1], 0], [B[0], B[1], zb], [A[0], A[1], za]]);
      g.fillStyle = gr; g.fill(); g.strokeStyle = gr; g.lineWidth = 1; g.stroke();
    }
    g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 1;
    for (const z of [-0.3, -0.6]) for (const { A, B } of segs) { gPoly(g, [[A[0], A[1], z + Math.sin(A[0] * 2 + A[1]) * 0.05], [B[0], B[1], z + Math.sin(B[0] * 2 + B[1]) * 0.05]], false); g.stroke(); }
    // ลาวาย้อยจากขอบหน้าผา
    for (const { A, i } of segs) {
      if (i % 7 !== 3) continue;
      const p0 = P(A[0], A[1], 0), p1 = P(A[0], A[1], -1.2);
      glow(g, p0[0], (p0[1] + p1[1]) / 2, 22, "255,110,40", 0.35);
      g.strokeStyle = "#ff8a2a"; g.lineWidth = 3; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0] + 2, p1[1]); g.stroke();
      g.strokeStyle = "#ffd06a"; g.lineWidth = 1; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0] + 2, p1[1]); g.stroke();
    }
    // ผิวเกาะหินบะซอลต์
    gPoly(g, top); g.fillStyle = C.basalt; g.fill();
    g.strokeStyle = night ? "rgba(200,140,255,.4)" : "rgba(255,170,110,.45)"; g.lineWidth = 1.5; g.stroke();
    for (let i = 0; i < 70; i++) {
      const p = P(-0.3 + R() * (COLS + 0.6), -0.3 + R() * (ROWS + 0.6));
      g.fillStyle = i % 5 ? "rgba(0,0,0,.18)" : night ? "rgba(190,130,255,.6)" : "rgba(200,150,255,.55)";
      g.beginPath(); g.ellipse(p[0], p[1], p[2] * (0.06 + R() * 0.12), p[2] * (0.03 + R() * 0.05), 0, 0, TAU); g.fill();
    }
    // รอยแตกลาวาจางๆ
    g.strokeStyle = night ? "rgba(255,120,50,.35)" : "rgba(255,130,60,.3)"; g.lineWidth = 1.2;
    for (let i = 0; i < 14; i++) {
      let x = R() * COLS, y = R() * ROWS; g.beginPath(); let p = P(x, y); g.moveTo(p[0], p[1]);
      for (let k = 0; k < 4; k++) { x += (R() - 0.5) * 0.9; y += (R() - 0.5) * 0.9; p = P(x, y); g.lineTo(p[0], p[1]); }
      g.stroke();
    }
  },
  side(c) {
    sideRow(c, 9, 0.4, (sx, sy, s, r, x, y) => {
      const p = PS(x, y, 0.5 + r * 0.8);
      glow(c.g, p[0], sy, s * 0.5, "120,40,160", 0.2);
      floatIsle(c.g, p[0], p[1], s * (0.3 + r * 0.3), c.night, r < 0.5);
    });
  },
  fore: (f, c) => foreBlobs(f, c, c.C.leaf, c.C.foreAcc),
  animBack(g, f, t) {
    const pts = f.marks.rift;
    if (!pts) return;
    const p = 0.5 + 0.5 * Math.sin(t / 900);
    g.lineJoin = "round";
    riftPath(g, pts); g.strokeStyle = `rgba(235,200,255,${0.1 + 0.2 * p})`; g.lineWidth = 18; g.stroke();
    g.lineJoin = "miter";
  },
  ambient(g, f, t) {
    const { info, night } = f;
    // ประกายไฟลอยขึ้นจากลาวา + ฝุ่นความว่างเปล่า
    const src = info.lavaTiles.length ? info.lavaTiles : null;
    for (let i = 0; i < 26; i++) {
      const ph = (t / (2400 + (i % 6) * 300) + hash(i, 15)) % 1;
      let bx, by;
      if (src && i % 2 === 0) { const s = src[i % src.length]; bx = s.x + 0.2 + hash(i, 16) * 0.6; by = s.y + 0.2 + hash(i, 17) * 0.6; }
      else { bx = hash(i, 16) * (info.cols + 2) - 1; by = hash(i, 17) * (info.rows + 1); }
      const [x, y] = P(bx + Math.sin(t / 700 + i) * 0.1, by, ph * 2.2);
      g.globalAlpha = Math.sin(ph * Math.PI) * 0.9; g.fillStyle = i % 3 ? "#ffa04a" : "#ffe08a";
      g.fillRect(x - 1, y - 1, 2.2, 2.2);
    }
    for (let i = 0; i < 14; i++) {
      const a = t / (6000 + i * 500) + i;
      const [x, y] = P(hash(i, 18) * (info.cols + 6) - 3 + Math.cos(a) * 0.8, hash(i, 19) * info.rows + Math.sin(a) * 0.5, 1.5 + Math.sin(a * 2) * 0.5);
      g.globalAlpha = 0.4 + 0.3 * Math.sin(t / 400 + i); glow(g, x, y, 8, night ? "200,150,255" : "230,170,255", 0.6);
    }
    g.globalAlpha = 1;
  },
};

const THEMES = { 1: T1, 2: T2, 3: T3, 4: T4, 5: T5, 6: T6, 7: T7 };
for (const a of Object.keys(THEMES)) THEMES[a].pal = PAL[a];

// ธีมของภูมิภาค (ไม่รู้จัก = ภูมิภาค I)
export function themeOf(area) { return THEMES[area] || THEMES[1]; }
// ช่วงพื้นโลกที่มองเห็น (หน่วยช่อง) — ใช้กระจายลายพื้น
export function worldRange(view) {
  const { cols, rows } = sceneSize();
  const bl = unprojectScene(view.x0, view.y1) || { x: -4, y: rows + 2 }, br = unprojectScene(view.x1, view.y1) || { x: cols + 4, y: rows + 2 };
  return { wx0: Math.min(-4, bl.x - 1), wx1: Math.max(cols + 4, br.x + 1), wy1: Math.max(rows + 2, bl.y + 1) };
}
