// ============================================================
//  ภาพของด่าน II เรเมียร์ (ป่าหมอก) โหมด Fodlan — ดูสัญญาที่หัวไฟล์ ./index.js · กติกา server/fodlan/stage2.js
//   อารมณ์ตามฉาก 3D client/src/fodlan/dioramas/fog.js: ป่าสนดำในหมอกหนา (โทนเขียวหัวเป็ด/ม่วง) · เสาเวทมืดอักษรม่วงเรือง · คบเพลิง · กล่องเสบียง
//   ธีม: ฟ้าหมอก + แนวสนไกลซ้อนชั้น + ต้นไม้ตายยักษ์ + ซากหมู่บ้านเรเมียร์ (บ้านหลังคาพัง โบสถ์ยอดหัก) + เสาเวทยักษ์ไกล (อบ)
//        พื้นมอส/ใบสนร่วง · ทางดินบนช่องพื้นธรรมดา (deco) · ข้างกระดาน: สนดำปนต้นไม้ตาย + ซากกำแพงหิน
//   ชีวิตในฉาก (ทุกเฟรม — ภาพเรืองที่อบไว้ + เส้นไม่กี่เส้น): ม่านหมอกเคลื่อนผ่านฉากหลัง/สองข้าง · ฝูงกาบินวน · หน้าต่างซากบ้านไฟริบหรี่ (กลางคืน)
//        แสงวาบสีม่วงซีดเป็นพักๆ (ไม่มีฟ้าผ่า) · ผีไฟลอยข้างกระดาน · อักษรบนเสาเรืองไล่ขึ้นเป็นจังหวะ
//   สิ่งกีดขวาง: fd_pine ต้นสนดำ · fd_rock หินตะไคร่ · fd_pillar เสาเวทมืด (ร้าวตาม hp) · fd_crate กล่องเสบียง
//   ground: แสงอุ่นของคบเพลิงบนช่องที่มองเห็น (= ระยะที่เปิดหมอก) · วงอักษรใต้เสา · รอยหมอกจางรอบเสาที่พัง
//   items: คบเพลิง (เสา + เปลวไฟ) · air: ละอองไอพิษ (สภาพอากาศ) + ฉากเหตุการณ์ (fx) + เสียง
//  เบา: แสงเรือง = ภาพที่อบไว้ครั้งเดียวต่อสี (glowAt) · ไม่สร้าง gradient ทุกเฟรม · lowQ = ตัดอนุภาค
//  ⚠️ ห้ามเรียกของจาก ./index ตอนโหลดไฟล์ (index import ไฟล์นี้ — วน) · ใช้ได้ในฟังก์ชันวาดเท่านั้น
// ============================================================
import { LW, OX, P, PA, PS, depthOf, gEllipse, glow, quad, rng, sceneSize } from "../boardGeo";
import { deadTreeShape, pineShape } from "../boardProps";
import { fxT, fxOnce } from "./index";
import { fodlanAudio } from "../../fodlan/fodlanAudio";

const TAU = Math.PI * 2;
const hash = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };

export const kinds = ["fd_pine", "fd_rock", "fd_pillar", "fd_crate"];
export const tall = ["fd_pine", "fd_pillar"];
// ความยาวฉากของเหตุการณ์ (ms) — server ctx.fx
export const fx = { pillar_hit: 700, pillar_break: 1600, fog_clear: 2200, crate_open: 1200, torch_place: 1100, torch_out: 1300, miasma: 1800 };
// สีหมอกนอกระยะมองเห็น (index.js drawFog) — เทาอมเขียวหัวเป็ดเข้ากับป่า
export const fogRGB = "86,100,98";
const SFX = { pillar_break: "pillar_break", fog_clear: "fog_clear", crate_open: "crate_open", torch_place: "torch_place", torch_out: "torch_out" };

// =================================================================== palette
const PAL = {
  day: {
    ground1: "#3e4c47", ground2: "#252f2c", tile: "rgba(200,235,225,.035)", tile2: "rgba(200,235,225,.09)",
    grid: "rgba(190,225,215,.12)", border: "rgba(200,228,222,.45)", spawn: "rgba(205,235,225,.38)",
    light: ["rgba(205,225,255,.10)", "rgba(4,10,14,.32)"], nightTint: null, shadow: "rgba(4,10,10,.4)",
    sky: ["#28333a", "#46544f", "#6c7a74"], hill: ["#3a4845", "#2d3a36", "#22302b"], horizon: "#34423c", fog: "185,200,196",
    c1: "#1f3329", c2: "#16261f", c3: "#2d4a3a", trunk: "#2b1e16", leaf: "#101b17", foreAcc: "#26363c",
    dots: ["#33493d", "#43385a", "#4d6a52", "#3a322b"], bushTint: "rgba(14,34,32,.55)", path: "rgba(96,80,60,.38)", pebble: "rgba(150,140,125,.45)",
    accent: "#b47cff", spark: "#cfb0ff", rune: "195,140,255", gold: "#d9a93f", line: "rgba(190,225,215,.6)",
    rim: "#3b4a44", rim2: "#2b3833", plaza: "#4a5a54", plaza2: "#42524c",
  },
  night: {
    ground1: "#1b2523", ground2: "#0b1110", tile: "rgba(190,215,255,.035)", tile2: "rgba(190,215,255,.085)",
    grid: "rgba(180,205,240,.11)", border: "rgba(180,205,240,.38)", spawn: "rgba(190,215,255,.32)",
    light: ["rgba(120,150,255,.06)", "rgba(0,4,14,.38)"], nightTint: "rgba(6,10,26,.22)", shadow: "rgba(0,0,6,.5)",
    sky: ["#06090e", "#111a20", "#1f2c2b"], hill: ["#18221f", "#121b18", "#0d1512"], horizon: "#161f1c", fog: "120,140,150",
    c1: "#13201b", c2: "#0d1713", c3: "#1d3027", trunk: "#1a120d", leaf: "#070d0b", foreAcc: "#1a2230",
    dots: ["#22342a", "#3a2f52", "#2f4838", "#221d19"], bushTint: "rgba(4,12,14,.3)", path: "rgba(70,58,46,.42)", pebble: "rgba(120,115,110,.4)",
    accent: "#c690ff", spark: "#dcc2ff", rune: "205,150,255", gold: "#f0c868", line: "rgba(180,205,240,.6)",
    rim: "#22302c", rim2: "#18221f", plaza: "#2c3a36", plaza2: "#26332f",
  },
};
const PINE = {
  day: { green: "#22352c", dark: "#18271f", snow: null, trunk: "#2b1e16" },
  night: { green: "#14231c", dark: "#0c1612", snow: null, trunk: "#160f0b" },
};
const FAR_PINE = [
  { day: { green: "#56635f", dark: "#4b5854", snow: null, trunk: "#4b5854" }, night: { green: "#1e2a2a", dark: "#1a2525", snow: null, trunk: "#1a2525" } },
  { day: { green: "#3f4d48", dark: "#36433e", snow: null, trunk: "#36433e" }, night: { green: "#152020", dark: "#111b1a", snow: null, trunk: "#111b1a" } },
];

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

// ม่านหมอก = ภาพเรืองสีหมอกยืดเป็นวงรี (ไม่สร้าง gradient ใหม่)
function bankAt(g, x, y, w, h, rgb, a) {
  const img = a > 0 ? glowImg(rgb) : null;
  if (!img) return;
  const a0 = g.globalAlpha;
  g.globalAlpha = a0 * Math.min(1, a);
  g.drawImage(img, x - w / 2, y - h / 2, w, h);
  g.globalAlpha = a0;
}
// แสงวาบสีม่วงซีด (ไม่มีฟ้าผ่า): ทุก ~13 วิ วาบสั้น 2 จังหวะ · คืน 0..1 (t = 0 → ไม่วาบ)
function eerieFlash(t) {
  if (!t) return 0;
  const P0 = 13000, k = Math.floor(t / P0), ph = t - k * P0 - hash(k, 41) * 6000;
  if (ph < 0 || ph > 900) return 0;
  const a = Math.max(0, 1 - Math.abs(ph - 120) / 160), b = Math.max(0, 1 - Math.abs(ph - 520) / 320) * 0.6;
  return Math.max(a, b);
}

// =================================================================== ธีม (อบ)
function skyFill(c, stops) {
  const { g, VX0, VY0, VW, bY } = c, gr = g.createLinearGradient(0, VY0, 0, bY);
  stops.forEach((col, i) => gr.addColorStop(i / (stops.length - 1), col));
  g.fillStyle = gr; g.fillRect(VX0, VY0, VW, bY - 18 - VY0);
}
// แนวสนไกล (เงาซ้อนกัน) วางตามเส้นฐาน base
function pineRow(c, seed, base, size, pal, gap = 11, skip = null) {
  const { g, VX0, VX1 } = c, R = rng(seed);
  for (let x = VX0 - 20; x <= VX1 + 20; x += gap + R() * gap) {
    const yy = base + R() * 6, sz = size * (0.7 + R() * 0.6);
    if (!skip || !skip(x)) pineShape(g, x, yy, sz, pal);
  }
}
// ต้นไม้ตายยักษ์ (เงาทึบ) — x = โคน · h = ความสูงลำต้น
function giantDead(g, x, base, h, col, seed) {
  const R = rng(seed);
  g.fillStyle = col; g.strokeStyle = col; g.lineCap = "round";
  const lean = (R() - 0.5) * h * 0.15, tx = x + lean, ty = base - h;
  g.beginPath(); g.moveTo(x - h * 0.13, base); g.quadraticCurveTo(x - h * 0.03, base - h * 0.5, tx - h * 0.04, ty);
  g.lineTo(tx + h * 0.04, ty); g.quadraticCurveTo(x + h * 0.05, base - h * 0.5, x + h * 0.14, base); g.closePath(); g.fill();
  for (const d of [-1, 1]) { g.lineWidth = h * 0.05; g.beginPath(); g.moveTo(x + d * h * 0.06, base - h * 0.08); g.quadraticCurveTo(x + d * h * 0.2, base - h * 0.02, x + d * h * 0.32, base + 2); g.stroke(); }
  const branch = (x0, y0, ang, len, w, depth) => {
    const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
    g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 + (R() - 0.5) * len * 0.5, (y0 + y1) / 2 + (R() - 0.5) * len * 0.4, x1, y1); g.stroke();
    if (depth > 0) { branch(x1, y1, ang - 0.4 - R() * 0.4, len * 0.68, w * 0.6, depth - 1); branch(x1, y1, ang + 0.35 + R() * 0.4, len * 0.64, w * 0.58, depth - 1); }
  };
  branch(tx, ty + h * 0.04, -Math.PI / 2 - 0.7, h * 0.36, h * 0.07, 3);
  branch(tx, ty + h * 0.04, -Math.PI / 2 + 0.75, h * 0.38, h * 0.07, 3);
  branch(x + lean * 0.5, base - h * 0.55, -Math.PI / 2 - 1.2, h * 0.26, h * 0.045, 2);
  branch(x + lean * 0.6, base - h * 0.7, -Math.PI / 2 + 1.1, h * 0.22, h * 0.04, 2);
  g.lineCap = "butt";
}
// ซากหมู่บ้านเรเมียร์ (เงาทึบ): บ้านหลังคาพัง + โบสถ์ยอดหัก + รั้วหัก — เก็บตำแหน่งหน้าต่างให้ animBack จุดไฟริบหรี่
function ruins(c, x0, base, dir, col, seed) {
  const { g, marks } = c, R = rng(seed), wins = marks.windows || (marks.windows = []);
  let x = x0;
  for (let i = 0; i < 4; i++) {
    const chapel = i === 1, w = chapel ? 26 : 30 + R() * 16, h = chapel ? 46 : 18 + R() * 10, bx = x - w / 2;
    g.fillStyle = col;
    g.fillRect(bx, base - h, w, h);
    if (chapel) {
      g.fillRect(x - 6, base - h - 26, 12, 26);
      g.beginPath(); g.moveTo(x - 9, base - h - 26); g.lineTo(x - 2, base - h - 44); g.lineTo(x + 1, base - h - 36); g.lineTo(x + 5, base - h - 40); g.lineTo(x + 9, base - h - 26); g.closePath(); g.fill();
      wins.push([x, base - h - 15, 2.6]);
    } else {
      const rh = 12 + R() * 8, gap = 0.3 + R() * 0.3;
      g.beginPath(); g.moveTo(bx - 3, base - h); g.lineTo(x - w * 0.1, base - h - rh); g.lineTo(x + w * (gap - 0.25), base - h - rh * 0.55);
      g.lineTo(x + w * gap, base - h - rh * 0.9); g.lineTo(bx + w + 3, base - h); g.closePath(); g.fill();
      if (R() < 0.6) g.fillRect(x + w * 0.22, base - h - rh - 6, 4, 10);
    }
    if (!chapel && R() < 0.7) wins.push([bx + w * (0.25 + R() * 0.5), base - h * 0.55, 2]);
    for (let k = 0; k < 3; k++) { const fx0 = x + dir * (w / 2 + 3 + k * 4); g.fillRect(fx0, base - 5 - R() * 5, 1.6, 10); }
    x += dir * (w / 2 + 24 + R() * 24);
  }
}
function mistBand(c, y, h, a, seed) {
  const { g, C, VX0, VW } = c, R = rng(seed);
  for (let i = 0; i < 14; i++) {
    g.fillStyle = `rgba(${C.fog},${a * (0.6 + R() * 0.6)})`;
    g.beginPath(); g.ellipse(VX0 + R() * VW, y + (R() - 0.5) * h, 120 + R() * 160, h * (0.4 + R() * 0.4), 0, 0, TAU); g.fill();
  }
}
// เสาเวทยักษ์กลางป่าไกล (แบบฉาก 3D) — marks.pillar ให้ animBack เรืองตามจังหวะ
function farPillar(c) {
  const { g, night, bY, marks } = c, x = OX, base = bY - 22, h = 92, w = 18;
  g.fillStyle = night ? "#120f1a" : "#2a2634"; g.fillRect(x - w / 2, base - h, w, h);
  g.fillStyle = night ? "#0c0a12" : "#201c29"; g.fillRect(x + 2, base - h, w / 2 - 2, h);
  g.strokeStyle = night ? "rgba(205,150,255,.75)" : "rgba(180,130,240,.55)"; g.lineWidth = 1.6;
  for (let k = 0; k < 6; k++) {
    const yy = base - h + 10 + k * 13;
    g.beginPath(); g.moveTo(x - 5, yy); g.lineTo(x - 1, yy + 5); g.lineTo(x - 5, yy + 9); g.stroke();
  }
  marks.pillar = { x, y: base - h - 16 };
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

export const theme = {
  pal: PAL,
  back(c) {
    const { g, C, night, bY } = c;
    skyFill(c, C.sky);
    if (night) glow(g, OX - 360, bY - 170, 150, "170,200,255", 0.28);
    else glow(g, OX + 340, bY - 160, 190, "235,240,235", 0.35);
    const far = night ? "#1a2424" : "#56625f", mid = night ? "#111a19" : "#3c4946", near = night ? "#0d1413" : "#2f3b38";
    // ต้นไม้ตายยักษ์ไกลสุด (จมหมอก)
    giantDead(g, OX - 470, bY - 40, 150, far, 3);
    giantDead(g, OX + 520, bY - 40, 170, far, 8);
    giantDead(g, OX - 120, bY - 44, 120, far, 5);
    pineRow(c, 11, bY - 44, 30, FAR_PINE[0][night ? "night" : "day"], 9);
    mistBand(c, bY - 46, 22, 0.16, 3);
    farPillar(c);
    // ซากหมู่บ้านเรเมียร์ซ้าย/ขวาของเสาเวท (เว้นแนวสนตรงนั้น)
    const village = (x) => (x > OX - 330 && x < OX - 90) || (x > OX + 120 && x < OX + 340);
    ruins(c, OX - 120, bY - 24, -1, mid, 17);
    ruins(c, OX + 150, bY - 24, 1, mid, 29);
    mistBand(c, bY - 30, 14, 0.14, 6);
    pineRow(c, 12, bY - 22, 34, FAR_PINE[1][night ? "night" : "day"], 10, village);
    giantDead(g, OX - 610, bY - 14, 120, near, 11);
    giantDead(g, OX + 380, bY - 12, 105, near, 13);
    mistBand(c, bY - 24, 18, 0.2, 4);
    pineRow(c, 13, bY - 4, 30, PINE[night ? "night" : "day"], 12);
    mistBand(c, bY - 2, 14, 0.22, 5);
    c.marks.crows = { x: OX + 40, y: bY - 150 };
    c.marks.horizon = bY;
  },
  ground(c) {
    const { g, C, night, R, VX0, VX1, bY, wx0, wx1, wy1 } = c;
    // มอสเป็นหย่อม + ใบสนร่วง + เห็ดเรืองแสง
    for (let i = 0; i < 260; i++) {
      const [sx, sy, s] = PS(wx0 + R() * (wx1 - wx0), -1 + R() * (wy1 + 1));
      if (sy < bY || sx < VX0 - 20 || sx > VX1 + 20) continue;
      g.fillStyle = C.dots[i % C.dots.length]; g.globalAlpha = 0.25 + R() * 0.25;
      g.beginPath(); g.ellipse(sx, sy, s * (0.12 + R() * 0.25), s * (0.05 + R() * 0.06), 0, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    g.strokeStyle = night ? "rgba(70,60,45,.55)" : "rgba(110,90,60,.5)"; g.lineWidth = 1;
    for (let i = 0; i < 420; i++) {
      const [sx, sy, s] = PS(wx0 + R() * (wx1 - wx0), -0.5 + R() * (wy1 + 0.5));
      if (sy < bY) continue;
      const a = R() * TAU, L = s * 0.06;
      g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + Math.cos(a) * L, sy + Math.sin(a) * L * 0.5); g.stroke();
    }
    for (let i = 0; i < 36; i++) {
      const [sx, sy, s] = PS(wx0 + R() * (wx1 - wx0), -0.5 + R() * (wy1 + 0.5));
      if (sy < bY) continue;
      const col = i % 2 ? "120,240,200" : "200,150,255";
      if (night) glow(g, sx, sy - s * 0.05, s * 0.2, col, 0.35);
      g.fillStyle = `rgb(${col})`; g.beginPath(); g.ellipse(sx, sy - s * 0.04, s * 0.03, s * 0.018, 0, Math.PI, TAU); g.fill();
    }
  },
  side(c) {
    const pal = PINE[c.night ? "night" : "day"];
    const stone = c.night ? ["#262c2c", "#1b2020"] : ["#56605d", "#434c49"];
    sideRow(c, 21, 1.3, (sx, sy, s, r) => {
      const g = c.g;
      g.fillStyle = c.C.shadow; g.beginPath(); g.ellipse(sx, sy, s * 0.42, s * 0.12, 0, 0, TAU); g.fill();
      if (r < 0.18) deadTreeShape(g, sx, sy, s * (1.2 + r * 2), Math.round(sx * 7 + sy), c.night, 0, null);
      else if (r < 0.26) {
        // ซากกำแพงหินมีมอส
        const w = s * 0.7, h = s * (0.25 + r);
        g.fillStyle = stone[0]; g.beginPath(); g.moveTo(sx - w / 2, sy); g.lineTo(sx - w / 2, sy - h * 0.7); g.lineTo(sx - w * 0.1, sy - h); g.lineTo(sx + w * 0.15, sy - h * 0.6); g.lineTo(sx + w / 2, sy - h * 0.45); g.lineTo(sx + w / 2, sy); g.closePath(); g.fill();
        g.fillStyle = stone[1]; g.fillRect(sx + w * 0.1, sy - h * 0.45, w * 0.4, h * 0.45);
        g.fillStyle = c.night ? "rgba(50,90,70,.6)" : "rgba(80,120,80,.7)"; g.fillRect(sx - w / 2, sy - h * 0.72, w * 0.45, s * 0.04);
      } else pineShape(g, sx, sy, s * (1.3 + r * 0.8), pal);
    });
    mistBand(c, c.bY + 40, 30, 0.08, 9);
  },
  // ทางดินบนช่องพื้นธรรมดา (ทางคดเคี้ยวผ่านดงสน) — วาดบนชั้นกระดานที่อบ
  deco(c) {
    const { g, C, info } = c;
    const special = new Set((info.special || []).map((s) => `${s.x},${s.y}`));
    const obs = info.terrainKind || {};
    for (let y = 0; y < info.rows; y++) for (let x = 0; x < info.cols; x++) {
      const k = `${x},${y}`;
      if (obs[k]) continue;
      // ป่าทึบ (ลายกลางของ boardProps — สีสด) → กดให้มืดเข้ากับป่าหมอก
      if (special.has(k)) { quad(g, x, y, 0.02); g.fillStyle = C.bushTint; g.fill(); continue; }
      quad(g, x, y, 0.06); g.fillStyle = C.path; g.fill();
      const R = rng(x * 31 + y * 17 + 3);
      g.fillStyle = C.pebble;
      for (let i = 0; i < 3; i++) { const p = P(x + 0.15 + R() * 0.7, y + 0.15 + R() * 0.7); g.beginPath(); g.ellipse(p[0], p[1], p[2] * 0.03, p[2] * 0.018, 0, 0, TAU); g.fill(); }
    }
  },
  fore(f, c) {
    const { VX0, VY0, VX1 } = c, C = c.C;
    for (const [cx, cy] of [[VX1 - 40, VY0 + 30], [VX1 - 110, VY0 - 20], [VX0 - 10, 280], [VX0 + 70, VY0 - 30]]) {
      f.globalAlpha = 0.9; f.fillStyle = C.leaf;
      for (let k = 0; k < 3; k++) { f.beginPath(); f.moveTo(cx - 140 + k * 40, cy + 70 - k * 20); f.lineTo(cx + k * 10, cy - 60 - k * 10); f.lineTo(cx + 120 - k * 30, cy + 80 - k * 15); f.closePath(); f.fill(); }
      f.fillStyle = C.foreAcc; f.globalAlpha = 0.5; f.beginPath(); f.ellipse(cx - 20, cy + 10, 70, 30, 0.3, 0, TAU); f.fill();
    }
    f.globalAlpha = 1;
  },
  animBack(g, f, t) {
    const mk = f.marks || {}, night = f.night, hz = mk.horizon, v = f.view;
    // แสงวาบสีม่วงซีดทั่วฟ้า (เป็นพักๆ)
    const fl = eerieFlash(t);
    if (fl > 0 && hz != null && v) { g.fillStyle = `rgba(200,185,255,${0.22 * fl})`; g.fillRect(v.x0, v.y0, v.x1 - v.x0, hz - v.y0); }
    // ม่านหมอกเคลื่อนผ่านแนวป่าไกล (ซ้าย→ขวา วนรอบ)
    if (hz != null && v) {
      const W = v.x1 - v.x0 + 600, fog = PAL[night ? "night" : "day"].fog;
      for (let i = 0; i < 7; i++) {
        const x = v.x0 - 300 + (((hash(i, 21) * W + t * (0.006 + i * 0.0015)) % W) + W) % W;
        bankAt(g, x, hz - 18 - (i % 3) * 16, 360 + i * 30, 46 + (i % 3) * 14, fog, (night ? 0.26 : 0.34) + 0.06 * Math.sin(t / 3000 + i));
      }
    }
    // หน้าต่างซากบ้านไฟริบหรี่ (กลางคืน · บางบ้าน)
    if (night && mk.windows) for (let i = 0; i < mk.windows.length; i++) {
      if (hash(i, 7) < 0.35) continue;
      const [x, y, r] = mk.windows[i], on = 0.55 + 0.45 * Math.sin(t / (170 + i * 23) + i) * Math.sin(t / 410 + i * 3);
      glowAt(g, x, y, r * 4, "255,170,90", 0.35 * on);
      g.fillStyle = `rgba(255,200,120,${0.5 + 0.4 * on})`; g.fillRect(x - r / 2, y - r / 2, r, r);
    }
    // ฝูงกาบินวนเหนือป่า
    const cr = mk.crows;
    if (cr) {
      g.strokeStyle = night ? "#05080a" : "#1a1f22"; g.lineCap = "round"; g.lineWidth = 1.6;
      for (let i = 0; i < 7; i++) {
        const a = t / (5200 + i * 650) * (i % 2 ? 1 : -1) + i * 1.9, rx = 70 + i * 26, ry = 18 + i * 5;
        const x = cr.x + (i - 3) * 30 + Math.cos(a) * rx, y = cr.y + Math.sin(a) * ry + Math.sin(t / 900 + i) * 6;
        const sz = 4.5 + (i % 3), flap = Math.sin(t / 95 + i * 1.7);
        g.beginPath(); g.moveTo(x - sz, y - flap * sz * 0.7); g.quadraticCurveTo(x - sz * 0.4, y - sz * 0.25, x, y); g.quadraticCurveTo(x + sz * 0.4, y - sz * 0.25, x + sz, y - flap * sz * 0.7); g.stroke();
      }
      g.lineCap = "butt";
    }
    const m = mk.pillar;
    if (!m) return;
    const k = 0.75 + 0.25 * Math.sin(t / 600) + 0.6 * fl;
    glowAt(g, m.x, m.y, 46, "164,92,255", (f.night ? 0.7 : 0.45) * k);
    const rot = t / 900, w = 7 * Math.abs(Math.cos(rot)) + 2, y = m.y + Math.sin(t / 800) * 2;
    g.fillStyle = f.night ? "#d6b0ff" : "#b98cf0";
    g.beginPath(); g.moveTo(m.x, y - 11); g.lineTo(m.x + w, y); g.lineTo(m.x, y + 11); g.lineTo(m.x - w, y); g.closePath(); g.fill();
  },
  // สปอร์/หิ่งห้อยลอยในหมอก (lowQ ข้าม)
  ambient(g, f, t) {
    const { info, night } = f, fog = PAL[night ? "night" : "day"].fog;
    // ม่านหมอกกลิ้งผ่านแถบสองข้าง/หน้ากระดาน (นอกช่องเล่น — ไม่บังกระดาน)
    for (let i = 0; i < 6; i++) {
      const side = i % 3, ph = (t / (26000 + i * 3100) + hash(i, 31)) % 1;
      let bx, by;
      if (side === 0) { bx = -2.6; by = ph * (info.rows + 4) - 2; }
      else if (side === 1) { bx = info.cols + 2.6; by = (1 - ph) * (info.rows + 4) - 2; }
      else { bx = ph * (info.cols + 6) - 3; by = info.rows + 1.6; }
      const [x, y, s] = P(bx, by, 0.2);
      bankAt(g, x, y, s * 5, s * 1.3, fog, (night ? 0.2 : 0.28) * Math.sin(ph * Math.PI));
    }
    // ผีไฟลอยวนตามขอบกระดาน — ริบหรี่ หางจาง
    for (let i = 0; i < 6; i++) {
      const a = t / (3800 + i * 520) + i * 1.3, edge = i % 2 ? -1.3 : info.cols + 0.3;
      const bx = edge + Math.cos(a) * 0.8, by = hash(i, 13) * info.rows + Math.sin(a * 0.7) * 1.6;
      const fk = 0.55 + 0.45 * Math.sin(t / 130 + i * 2.3) * Math.sin(t / 370 + i);
      const col = i % 3 === 0 ? "200,150,255" : "140,255,215";
      for (let k = 2; k >= 0; k--) {
        const [x, y, s] = P(bx - Math.cos(a) * 0.12 * k, by - Math.sin(a * 0.7) * 0.25 * k, 0.9 + Math.sin(a * 2) * 0.2);
        glowAt(g, x, y, s * (0.42 - k * 0.1), col, (night ? 0.7 : 0.45) * fk * (1 - k * 0.3));
      }
    }
    // แสงวาบซีดบางๆ ทับกระดาน (ช่องยังอ่านได้)
    const fl = eerieFlash(t), v = f.view;
    if (fl > 0 && v) { g.fillStyle = `rgba(210,200,255,${0.06 * fl})`; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); }
    for (let i = 0; i < 18; i++) {
      const a = t / (4200 + i * 260) + i * 2.1;
      const bx = hash(i, 5) * (info.cols + 2) - 1 + Math.cos(a) * 0.9, by = hash(i, 6) * info.rows + Math.sin(a * 0.8) * 0.8;
      const [x, y, s] = P(bx, by, 0.7 + Math.sin(a * 1.7) * 0.35);
      const col = i % 3 ? "150,240,210" : "200,150,255";
      glowAt(g, x, y, s * 0.3, col, (night ? 0.5 : 0.28) + 0.15 * Math.sin(t / 300 + i));
      g.fillStyle = `rgba(${col},.9)`; g.beginPath(); g.arc(x, y, 1.8, 0, TAU); g.fill();
    }
  },
};

// =================================================================== สิ่งกีดขวาง
// ข้อมูลล่าสุดของด่าน (ground วาดก่อนสิ่งกีดขวางทุกเฟรม) — ใช้หา hp/ฉากตีของเสา
let LAST = null;
const pillarAt = (x, y) => (LAST && Array.isArray(LAST.pillars) ? LAST.pillars.find((p) => p.x === x && p.y === y) : null);
function recentHit(x, y, now) {
  if (!LAST || !Array.isArray(LAST.fx)) return 0;
  for (let i = LAST.fx.length - 1; i >= 0; i--) {
    const e = LAST.fx[i];
    if ((e.kind === "pillar_hit" || e.kind === "pillar_break") && e.x === x && e.y === y) { const p = fxT(e, now, fx.pillar_hit); return p < 1 ? 1 - p : 0; }
  }
  return 0;
}

function drawPine(g, x, y, C, night) {
  const [bx, by, s] = PA(x, y, 0.1);
  const R = rng(x * 53 + y * 29 + 7), k = 1.15 + R() * 0.35, lean = (R() - 0.5) * s * 0.06;
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(bx, by, s * 0.44, s * 0.14, 0, 0, TAU); g.fill();
  const pal = PINE[night ? "night" : "day"];
  g.fillStyle = pal.trunk; g.fillRect(bx - s * 0.05, by - s * 0.3, s * 0.1, s * 0.3);
  const tiers = [[0.22, 0.48, 0.55], [0.55, 0.4, 0.5], [0.88, 0.3, 0.46], [1.18, 0.2, 0.42]];
  for (const [b0, hw, th] of tiers) {
    const yb = by - s * b0 * k, yt = yb - s * th * k, cx = bx + lean * b0;
    g.fillStyle = pal.green; g.beginPath(); g.moveTo(cx - s * hw, yb); g.lineTo(cx, yt); g.lineTo(cx + s * hw, yb); g.closePath(); g.fill();
    g.fillStyle = pal.dark; g.beginPath(); g.moveTo(cx, yt); g.lineTo(cx + s * hw, yb); g.lineTo(cx + s * hw * 0.15, yb); g.closePath(); g.fill();
  }
  // หมอกคลอโคนต้น
  g.fillStyle = `rgba(${C.fog || "185,200,196"},${night ? 0.12 : 0.18})`;
  g.beginPath(); g.ellipse(bx, by - s * 0.12, s * 0.5, s * 0.12, 0, 0, TAU); g.fill();
}
function drawRock(g, x, y, C, night) {
  const [cx, cy, s] = PA(x, y, 0.05);
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(cx, cy + s * 0.03, s * 0.46, s * 0.18, 0, 0, TAU); g.fill();
  const body = night ? ["#2c3233", "#22282a", "#1a1f20"] : ["#5a6462", "#4a5452", "#3b4442"];
  g.fillStyle = body[2]; g.beginPath(); g.ellipse(cx + s * 0.14, cy - s * 0.14, s * 0.26, s * 0.2, 0, 0, TAU); g.fill();
  g.fillStyle = body[1]; g.beginPath(); g.ellipse(cx - s * 0.06, cy - s * 0.24, s * 0.34, s * 0.3, 0, 0, TAU); g.fill();
  g.fillStyle = body[0]; g.beginPath(); g.ellipse(cx - s * 0.14, cy - s * 0.34, s * 0.18, s * 0.12, -0.3, 0, TAU); g.fill();
  g.fillStyle = night ? "rgba(60,110,80,.65)" : "rgba(80,130,80,.75)";
  g.beginPath(); g.ellipse(cx - s * 0.08, cy - s * 0.48, s * 0.2, s * 0.06, -0.2, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(cx + s * 0.2, cy - s * 0.28, s * 0.1, s * 0.04, 0.3, 0, TAU); g.fill();
}
// เสาเวทมืด: หินดำหกเหลี่ยม · อักษรม่วงเรือง · คริสตัลลอยหมุนบนยอด · ร้าวตาม hp · สั่นตอนโดนตี
function drawPillar(g, x, y, C, night, now) {
  const info = pillarAt(x, y), hp = info ? info.hp : 2, maxHp = info ? info.maxHp || 2 : 2;
  const shake = recentHit(x, y, now);
  const [bx0, by, s] = PA(x, y, 0.05);
  const bx = bx0 + Math.sin(now / 22) * s * 0.04 * shake;
  const w = s * 0.44, h = s * 1.75, pulse = 0.75 + 0.25 * Math.sin(now / 520 + x * 1.3 + y);
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(bx + s * 0.08, by, s * 0.42, s * 0.14, 0, 0, TAU); g.fill();
  // ฐาน
  g.fillStyle = night ? "#17141f" : "#2a2633"; g.fillRect(bx - w * 0.7, by - s * 0.16, w * 1.4, s * 0.16);
  // ตัวเสา (หน้าซ้ายสว่าง · หน้าขวามืด · สันกลาง)
  g.fillStyle = night ? "#221d2e" : "#3a3446"; g.fillRect(bx - w / 2, by - h, w / 2, h - s * 0.14);
  g.fillStyle = night ? "#15121d" : "#28232f"; g.fillRect(bx, by - h, w / 2, h - s * 0.14);
  g.fillStyle = night ? "#2c2539" : "#4a4258"; g.fillRect(bx - w / 2, by - h - s * 0.05, w, s * 0.07);
  // อักษรเรือง — ไล่สว่างจากโคนขึ้นยอดเป็นจังหวะ + วาบตามแสงวาบของฉาก · แสงม่วงจางที่โคนเสา
  g.lineWidth = Math.max(1, s * 0.03); g.lineCap = "round";
  const R = rng(x * 17 + y * 5 + 11), fl = eerieFlash(now);
  glowAt(g, bx, by - s * 0.1, s * 0.75, "164,92,255", (night ? 0.35 : 0.22) * pulse + 0.3 * fl);
  for (let k = 0; k < 5; k++) {
    const wave = 0.5 + 0.5 * Math.sin(now / 260 - (4 - k) * 0.9 + x);
    g.strokeStyle = `rgba(${C.rune || "195,140,255"},${Math.min(1, 0.3 + 0.55 * wave * pulse + 0.4 * fl)})`;
    const yy = by - h + s * 0.2 + k * s * 0.3, xa = bx - w * 0.36, xb = bx + w * 0.12;
    g.beginPath(); g.moveTo(xa, yy); g.lineTo(xa + w * 0.12, yy + s * 0.07 + R() * s * 0.04); g.lineTo(xa + w * 0.02, yy + s * 0.16); g.stroke();
    g.beginPath(); g.moveTo(xb, yy + s * 0.05); g.lineTo(xb + w * 0.18 * R() + w * 0.06, yy + s * 0.12); g.stroke();
  }
  g.lineCap = "butt";
  glowAt(g, bx, by - h * 0.55, s * 0.9, "164,92,255", (night ? 0.4 : 0.25) * pulse);
  // รอยร้าว (โดนตีแล้ว)
  if (hp < maxHp) {
    g.strokeStyle = night ? "rgba(235,215,255,.8)" : "rgba(250,240,255,.85)"; g.lineWidth = Math.max(1, s * 0.025);
    g.beginPath(); g.moveTo(bx - w * 0.3, by - h * 0.85); g.lineTo(bx - w * 0.05, by - h * 0.62); g.lineTo(bx - w * 0.22, by - h * 0.45); g.lineTo(bx + w * 0.12, by - h * 0.25);
    g.moveTo(bx - w * 0.05, by - h * 0.62); g.lineTo(bx + w * 0.3, by - h * 0.7); g.stroke();
  }
  // คริสตัลลอยหมุน + เศษโคจร
  const cy = by - h - s * 0.42 + Math.sin(now / 700 + x) * s * 0.05, rot = now / 900 + x, cw = s * 0.16 * (0.35 + 0.65 * Math.abs(Math.cos(rot)));
  glowAt(g, bx, cy, s * 0.7, "195,140,255", (night ? 0.65 : 0.45) * pulse);
  g.fillStyle = night ? "#c99cff" : "#b07bff"; g.beginPath(); g.moveTo(bx, cy - s * 0.26); g.lineTo(bx + cw, cy); g.lineTo(bx, cy + s * 0.26); g.lineTo(bx - cw, cy); g.closePath(); g.fill();
  g.fillStyle = "rgba(90,40,160,.55)"; g.beginPath(); g.moveTo(bx, cy - s * 0.26); g.lineTo(bx + cw, cy); g.lineTo(bx, cy + s * 0.26); g.closePath(); g.fill();
  g.fillStyle = night ? "#e6d2ff" : "#d6b8ff";
  for (let i = 0; i < 4; i++) {
    const a = now / 1100 + i / 4 * TAU, ox = Math.cos(a) * s * 0.38, oy = Math.sin(a) * s * 0.12;
    g.beginPath(); g.moveTo(bx + ox, cy + oy - s * 0.05); g.lineTo(bx + ox + s * 0.03, cy + oy); g.lineTo(bx + ox, cy + oy + s * 0.05); g.lineTo(bx + ox - s * 0.03, cy + oy); g.closePath(); g.fill();
  }
}
// กล่องเสบียง: ลังไม้ + คาดเหล็ก
function drawCrate(g, x, y, C, night) {
  const [bx, by, s] = PA(x, y, 0.05);
  const w = s * 0.56, h = s * 0.4, d = s * 0.16;
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(bx + s * 0.04, by + s * 0.02, s * 0.42, s * 0.14, 0, 0, TAU); g.fill();
  const wood = night ? ["#5b4128", "#463220", "#6e5033"] : ["#8a6238", "#6c4b2a", "#a87c4c"];
  // หน้า
  g.fillStyle = wood[0]; g.fillRect(bx - w / 2, by - h, w, h);
  // ข้าง (ขวา)
  g.fillStyle = wood[1]; g.beginPath(); g.moveTo(bx + w / 2, by); g.lineTo(bx + w / 2 + d, by - d * 0.6); g.lineTo(bx + w / 2 + d, by - h - d * 0.6); g.lineTo(bx + w / 2, by - h); g.closePath(); g.fill();
  // ฝา
  g.fillStyle = wood[2]; g.beginPath(); g.moveTo(bx - w / 2, by - h); g.lineTo(bx - w / 2 + d, by - h - d * 0.6); g.lineTo(bx + w / 2 + d, by - h - d * 0.6); g.lineTo(bx + w / 2, by - h); g.closePath(); g.fill();
  // ไม้กระดาน + คาดเหล็ก
  g.strokeStyle = night ? "rgba(20,12,6,.6)" : "rgba(50,30,15,.55)"; g.lineWidth = 1;
  for (const u of [0.33, 0.66]) { g.beginPath(); g.moveTo(bx - w / 2, by - h * u); g.lineTo(bx + w / 2, by - h * u); g.stroke(); }
  g.strokeStyle = night ? "#6d7178" : "#8d939b"; g.lineWidth = Math.max(1.2, s * 0.035);
  g.beginPath(); g.moveTo(bx - w * 0.32, by); g.lineTo(bx - w * 0.32, by - h); g.lineTo(bx - w * 0.32 + d, by - h - d * 0.6); g.stroke();
  g.beginPath(); g.moveTo(bx + w * 0.32, by); g.lineTo(bx + w * 0.32, by - h); g.lineTo(bx + w * 0.32 + d, by - h - d * 0.6); g.stroke();
  g.fillStyle = night ? "#c9a14a" : "#e2b85a"; g.fillRect(bx - s * 0.035, by - h * 0.62, s * 0.07, s * 0.08);
}

export function drawObstacle(g, t, ctx, now) {
  const { x, y, kind } = t, { C, night } = ctx;
  if (kind === "fd_pine") drawPine(g, x, y, C, night);
  else if (kind === "fd_rock") drawRock(g, x, y, C, night);
  else if (kind === "fd_pillar") drawPillar(g, x, y, C, night, now);
  else if (kind === "fd_crate") drawCrate(g, x, y, C, night);
}

// =================================================================== บนพื้น (ใต้ไฮไลต์)
export function ground(g, fd, info, now) {
  LAST = fd;
  g.save();
  // วงอักษรใต้เสา
  for (const p of fd.pillars || []) {
    gEllipse(g, p.x + 0.5, p.y + 0.55, 0.47, 0, 28);
    g.strokeStyle = `rgba(190,130,255,${0.35 + 0.2 * Math.sin(now / 520 + p.x)})`; g.lineWidth = 1.4;
    g.setLineDash([4, 5]); g.lineDashOffset = -now / 90; g.stroke(); g.setLineDash([]);
  }
  // รอยหมอกสลายรอบเสาที่พัง (เงินจาง)
  const cr = fd.clearRadius || 2;
  for (const c of fd.cleared || []) {
    gEllipse(g, c.x + 0.5, c.y + 0.5, cr + 0.45, 0, 36);
    g.strokeStyle = "rgba(220,230,255,.22)"; g.lineWidth = 1.2; g.stroke();
  }
  // แสงอุ่นของคบเพลิง (ช่องที่แสงถึง = ระยะที่เปิดหมอก) — ใกล้คบเพลิงสว่างกว่า · ไหวตามเปลว
  for (const t of fd.torches || []) {
    const fl = 0.85 + 0.15 * Math.sin(now / 90 + t.x * 3) * Math.sin(now / 143 + t.y);
    for (const k of t.tiles || []) {
      const [x, y] = k.split(",").map(Number);
      const d = Math.abs(x - t.x) + Math.abs(y - t.y);
      quad(g, x, y, 0.02);
      g.fillStyle = `rgba(255,170,70,${(0.3 - d * 0.05) * fl})`; g.fill();
    }
    // ขอบระยะแสง
    gEllipse(g, t.x + 0.5, t.y + 0.5, (fd.torchRadius || 4) + 0.5, 0, 48);
    g.strokeStyle = `rgba(255,190,110,${0.22 * fl})`; g.lineWidth = 1.2; g.setLineDash([6, 6]); g.stroke(); g.setLineDash([]);
  }
  g.restore();
}

// =================================================================== คบเพลิง (เรียงความลึกกับตัวละคร)
function drawTorch(g, t, now, lowQ, born) {
  const [bx, by, s] = PA(t.x, t.y, 0.18);
  const grow = born == null ? 1 : Math.min(1, born * 2);
  g.fillStyle = "rgba(0,0,0,.3)"; g.beginPath(); g.ellipse(bx, by, s * 0.14, s * 0.05, 0, 0, TAU); g.fill();
  g.strokeStyle = "#3a2616"; g.lineWidth = Math.max(2, s * 0.06);
  g.beginPath(); g.moveTo(bx, by); g.lineTo(bx, by - s * 0.85); g.stroke();
  g.fillStyle = "#2a1c10"; g.fillRect(bx - s * 0.07, by - s * 0.92, s * 0.14, s * 0.1);
  const fy = by - s * 0.92, fl = Math.sin(now / 70 + t.x * 3) * 0.5 + Math.sin(now / 113 + t.y) * 0.5;
  const fh = s * (0.34 + 0.06 * fl) * grow, fw = s * 0.11 * grow;
  glowAt(g, bx, fy - fh * 0.4, s * 1.1 * grow, "255,160,60", 0.55 + 0.1 * fl);
  g.fillStyle = "#ff7a1f"; g.beginPath(); g.moveTo(bx - fw, fy); g.quadraticCurveTo(bx - fw * 1.1, fy - fh * 0.5, bx + fl * fw * 0.4, fy - fh); g.quadraticCurveTo(bx + fw * 1.1, fy - fh * 0.5, bx + fw, fy); g.closePath(); g.fill();
  g.fillStyle = "#ffd36a"; g.beginPath(); g.moveTo(bx - fw * 0.5, fy); g.quadraticCurveTo(bx - fw * 0.5, fy - fh * 0.35, bx + fl * fw * 0.2, fy - fh * 0.62); g.quadraticCurveTo(bx + fw * 0.5, fy - fh * 0.35, bx + fw * 0.5, fy); g.closePath(); g.fill();
  if (lowQ) return;
  for (let i = 0; i < 3; i++) {
    const ph = (now / (700 + i * 170) + i * 0.37) % 1;
    g.fillStyle = `rgba(255,${150 + i * 30},80,${1 - ph})`;
    g.beginPath(); g.arc(bx + Math.sin(ph * 9 + i) * s * 0.06, fy - fh - ph * s * 0.5, Math.max(0.8, s * 0.018), 0, TAU); g.fill();
  }
}
export function items(list, g, fd, info, units, now, lowQ) {
  const born = {};
  for (const e of fd.fx || []) if (e.kind === "torch_place") born[`${e.x},${e.y}`] = fxT(e, now, fx.torch_place);
  for (const t of fd.torches || []) list.push({ d: depthOf(t.x + 0.5, t.y + 0.5) + 0.04, f: () => drawTorch(g, t, now, lowQ, born[`${t.x},${t.y}`]) });
}

// =================================================================== ทับตัวละคร: ไอพิษ + ฉากเหตุการณ์
function unitCenter(units, id) {
  const u = (units || []).find((v) => v && v.id === id);
  if (!u) return null;
  const h = Math.max(1, u.size | 0) / 2;
  return Number.isFinite(u.rx) ? [u.rx + h, u.ry + h] : u.pos ? [u.pos.x + h, u.pos.y + h] : null;
}
function drawMiasmaAir(g, info, now, view) {
  // หมอกพิษจางทั้งจอ + ละอองเขียว/ม่วงลอยขึ้นช้าๆ
  g.fillStyle = "rgba(90,150,70,.06)"; g.fillRect(view.x0, view.y0, view.x1 - view.x0, view.y1 - view.y0);
  for (let i = 0; i < 44; i++) {
    const ph = (now / (6000 + (i % 7) * 700) + hash(i, 2)) % 1;
    const bx = hash(i, 3) * info.cols + Math.sin(now / 1700 + i) * 0.5, by = hash(i, 4) * info.rows + Math.cos(now / 2100 + i) * 0.4;
    const [x, y, s] = P(bx, by, 0.15 + ph * 1.6);
    const col = i % 3 ? "163,255,122" : "190,130,255", a = Math.sin(ph * Math.PI) * 0.75;
    glowAt(g, x, y, s * 0.16, col, a * 0.6);
    g.fillStyle = `rgba(${col},${a})`; g.beginPath(); g.arc(x, y, Math.max(1, s * 0.022), 0, TAU); g.fill();
  }
}
export function air(g, fd, info, units, now, lowQ, view) {
  // เสียงของเหตุการณ์ (ครั้งเดียวต่อเหตุการณ์)
  for (const e of fd.fx || []) {
    const key = SFX[e.kind];
    if (key && fxOnce(e)) { try { fodlanAudio().sfx(key); } catch { /* ไม่มีเสียง */ } }
  }
  if (!lowQ && fd.weather && fd.weather.kind === "miasma" && view) drawMiasmaAir(g, info, now, view);
  for (const e of fd.fx || []) {
    const ms = fx[e.kind];
    if (!ms) continue;
    const p = fxT(e, now, ms);
    if (p >= 1) continue;
    g.save();
    if (e.kind === "pillar_hit") {
      const [x, y, s] = PA(e.x, e.y, 0.05, 1.1);
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * TAU + e.seq, r = s * 0.5 * p;
        g.fillStyle = `rgba(220,180,255,${1 - p})`; g.beginPath(); g.arc(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6, Math.max(1, s * 0.03), 0, TAU); g.fill();
      }
    } else if (e.kind === "pillar_break") {
      const [x, y, s] = PA(e.x, e.y, 0.05, 1);
      glowAt(g, x, y, s * (0.6 + 2 * p), "180,110,255", 1 - p);
      for (let i = 0; i < (lowQ ? 6 : 14); i++) {
        const a = hash(i, e.seq) * TAU, sp = 0.6 + hash(i, 9) * 1.2, r = s * sp * p * 1.6;
        const sx = x + Math.cos(a) * r, sy = y + Math.sin(a) * r * 0.55 + s * 1.2 * p * p;
        g.fillStyle = i % 2 ? `rgba(40,32,56,${1 - p})` : `rgba(200,150,255,${1 - p})`;
        g.beginPath(); g.moveTo(sx, sy - s * 0.07); g.lineTo(sx + s * 0.05, sy); g.lineTo(sx, sy + s * 0.07); g.lineTo(sx - s * 0.05, sy); g.closePath(); g.fill();
      }
    } else if (e.kind === "fog_clear") {
      const r = (e.r || 2) + 0.5;
      gEllipse(g, e.x + 0.5, e.y + 0.5, r * Math.min(1, p * 1.6), 0.05, 40);
      g.strokeStyle = `rgba(225,235,255,${0.8 * (1 - p)})`; g.lineWidth = 3 * (1 - p) + 1; g.stroke();
      g.fillStyle = `rgba(200,220,255,${0.12 * (1 - p)})`; g.fill();
    } else if (e.kind === "crate_open") {
      const [x, y, s] = PA(e.x, e.y, 0.05, 0.4);
      // ฝาเด้ง + ประกาย
      g.fillStyle = `rgba(168,124,76,${1 - p})`;
      g.save(); g.translate(x + s * 0.3 * p, y - s * 0.8 * Math.sin(p * Math.PI)); g.rotate(p * 3); g.fillRect(-s * 0.28, -s * 0.05, s * 0.56, s * 0.1); g.restore();
      glowAt(g, x, y - s * 0.3 * p, s * 0.6, e.got === "torch" ? "255,160,60" : e.got === "armor" ? "150,200,255" : "255,215,90", 1 - p);
      // กล่องใหม่โผล่ (ควันจาง)
      if (e.to) {
        const [tx, ty, ts] = PA(e.to.x, e.to.y, 0.05, 0.2);
        g.fillStyle = `rgba(${PAL.day.fog},${0.5 * (1 - p)})`;
        for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; g.beginPath(); g.arc(tx + Math.cos(a) * ts * 0.3 * (0.5 + p), ty + Math.sin(a) * ts * 0.12 * (0.5 + p), ts * 0.14, 0, TAU); g.fill(); }
      }
    } else if (e.kind === "torch_place") {
      gEllipse(g, e.x + 0.5, e.y + 0.5, ((e.r || 4) + 0.5) * Math.min(1, p * 1.4), 0.03, 48);
      g.strokeStyle = `rgba(255,190,110,${0.85 * (1 - p)})`; g.lineWidth = 2.5 * (1 - p) + 1; g.stroke();
    } else if (e.kind === "torch_out") {
      const [x, y, s] = PA(e.x, e.y, 0.18, 0.95);
      for (let i = 0; i < (lowQ ? 3 : 7); i++) {
        const a = hash(i, e.seq) * TAU, r = s * 0.25 * p;
        g.fillStyle = `rgba(150,150,160,${0.55 * (1 - p)})`;
        g.beginPath(); g.arc(x + Math.cos(a) * r, y - s * 0.6 * p + Math.sin(a) * r * 0.4, s * (0.08 + 0.1 * p), 0, TAU); g.fill();
      }
    } else if (e.kind === "miasma" && !lowQ) {
      for (const id of e.ids || []) {
        const c = unitCenter(units, id);
        if (!c) continue;
        for (let i = 0; i < 6; i++) {
          const a = i / 6 * TAU + now / 900, [x, y, s] = P(c[0] + Math.cos(a) * 0.35, c[1] + Math.sin(a) * 0.35, 0.2 + p * 1.2);
          g.fillStyle = i % 2 ? `rgba(163,255,122,${0.7 * (1 - p)})` : `rgba(190,130,255,${0.7 * (1 - p)})`;
          g.beginPath(); g.arc(x, y, Math.max(1.2, s * (0.04 + 0.04 * p)), 0, TAU); g.fill();
        }
      }
    }
    g.restore();
  }
}
