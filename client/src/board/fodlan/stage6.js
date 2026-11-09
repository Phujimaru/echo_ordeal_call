// ============================================================
//  ภาพของสนาม Eos (GRID_PLAN §8.6 — ธีม Final Fantasy XV · "ด่าน 6" ของตัวกลาง ./index.js) · กติกา server/fodlan/stage6.js · ผัง server/fodlan/map6.js
//   อารมณ์: โลกกว้างแสงอบอุ่นยามบ่าย (กลางวัน) / ฟ้าน้ำเงินเข้ม ดาว ไฟเมืองเรือง (กลางคืน — เวลาปีศาจ)
//   ธีม (อบ): ฟ้า + ภูเขาไกล + เงาตึกระฟ้าของนครหลวงหลังกระดาน · ข้างกระดาน: ต้นไม้/หิน/ทราย
//   bakeSpecial (อบใต้เส้นตาราง): ถนนยางมะตอย+เส้นจราจร · ลานเมืองหินปู · ทราย · สะพาน · คอกช็อโก้
//   deco: น้ำลึก (ทะเลสาบ) + คลอง Altissia
//   สิ่งกีดขวาง: ตึก (หน้าต่างติดไฟกลางคืน) · กำแพงเมือง · เสาไฟถนน · ต้นไม้ · หิน · ปั๊มน้ำมัน · อู่ซ่อมรถ
//   items: รถ 3 คัน (เหลือง/แดง/เทา — วาดด้วยโค้ด ตามสีรถในภาพของผู้ใช้) · ช็อโก้ (ภาพผู้ใช้ /eos/img/chocobo.webp) ใต้คนขี่ · ปีศาจ (/eos/img/daemonN.webp)
//   air: ฝนฟ้าคะนอง · หมอก · ฉากเหตุการณ์ (fx) + เสียง (client/src/eos/eosAudio.js)
//  ⚠️ ห้ามเรียกของจาก ./index ตอนโหลดไฟล์ (index import ไฟล์นี้ — วน) · ใช้ได้ในฟังก์ชันวาดเท่านั้น
// ============================================================
import { LW, P, PS, depthOf, gEllipse, glow, quad, rng, sceneSize } from "../boardGeo";
import { EOS_AREA, MAPS } from "../boardRules";
import { fxActive, fxOnce, fxT } from "./index";
import { eosAudio } from "../../eos/eosAudio";

const TAU = Math.PI * 2;
const hash = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
const K = (x, y) => `${x},${y}`;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export const kinds = [
  "fd_eos_bldg", "fd_eos_wall", "fd_eos_lamp", "fd_eos_tree", "fd_eos_rock", "fd_eos_water", "fd_eos_canal", "fd_eos_pump", "fd_eos_garage", "fd_eos_daemon",
  "fd_eos_road", "fd_eos_plaza", "fd_eos_sand", "fd_eos_bridge", "fd_eos_stable", "fd_eos_car", "fd_eos_chocobo",
  "fd_eos_forest", "fd_eos_shallow", "fd_eos_pillar",
  // ขั้น 2 (ลูกเล่นปั่นป่วน): คันโยกสะพาน · แท่นโดม · แผงไฟเมือง · ชั้น layer: สะพานที่ยก · กำแพงเวทที่ประตู · ซากรถ
  "fd_eos_lever", "fd_eos_domecore", "fd_eos_switch", "fd_eos_bridgeup", "fd_eos_barrier", "fd_eos_wreck",
];
export const tall = ["fd_eos_bldg", "fd_eos_tree", "fd_eos_lamp", "fd_eos_pillar", "fd_eos_bridgeup", "fd_eos_barrier"];
// ความยาวฉากของเหตุการณ์ (ms) — server ctx.fx
export const fx = {
  lightning: 1600, car_drive: 900, choco_mount: 900, choco_dismount: 700, choco_fall: 1100, choco_home: 1400, choco_back: 900,
  daemon_spawn: 1600, daemon_move: 1100, daemon_attack: 900, daemon_hit: 600, daemon_struck: 500, daemon_die: 1200, daemon_dissolve: 1400,
  bridge: 1600, dome_on: 1800, dome_off: 1400, lights: 900, gysahl_lure: 1300, gysahl_call: 1100, wreck_push: 700,
};
export const fogRGB = "150,165,185";
const CAR_MS = 900, DAEMON_MS = 1000;
const CAR_COLORS = {
  1: { body: "#f2c21b", dark: "#a07d08", hi: "#fff2a8" },  // car1 — เหลือง
  2: { body: "#d8321e", dark: "#7c160b", hi: "#ff9c86" },  // car2 — แดง
  3: { body: "#7d8288", dark: "#3d4146", hi: "#d5dade" },  // car3 — เทาด้าน
};


// =================================================================== palette
const PAL = {
  day: {
    ground1: "#728647", ground2: "#647a3d", tile: "rgba(0,0,0,0)", tile2: "rgba(0,0,0,0)",
    grid: "rgba(30,34,20,.09)", border: "rgba(0,0,0,0)",
    grassA: "#7c8f4c", grassB: "#5f7838", sandEdge: "#b9a670", forestFloor: "#3c4f28", forestFloor2: "#55693a",
    shore: "#cdbb86", shallow: "#5aa7b8", bank: "#6b5a3c", shoulder: "#8a7a5c", roadLine: "#e8e2cf", roadStain: "rgba(20,20,24,.25)", reed: "#5d6e33", pebble: "#9b8a6e",
    dryGrass: "#a8935c", tuft: "#4f6a2c", flowers: ["#f2e27a", "#e9a0c2", "#ffffff", "#c9b3f0"], leafHi: "#7da150", palm: "#3f6a2a",
    stone: "#8c8d88", stone2: "#6a6b66", altRoof: "#c7653f", altWall: "#efe4cf", altWall2: "#d8c9ad", spawn: "rgba(255,245,215,.45)",
    light: ["rgba(255,225,170,.12)", "rgba(30,20,10,.2)"], nightTint: null, shadow: "rgba(20,14,6,.35)",
    sky: ["#7fb4e0", "#c7dcea", "#f2d9aa"], mtn: ["#7f8fa6", "#6a7c8a"], city: "#5d6b80", cityLit: null,
    grass: ["#7a8a4f", "#6d7e45", "#8b9659", "#5f6f3b"], road: "#4a4b4f", road2: "#3e3f43", lane: "rgba(240,228,180,.85)", curb: "#9a968c",
    plaza: "#b9b2a2", plaza2: "#a69f8f", sand: "#d9b97c", sand2: "#c9a467", bridge: "#8a6a46", hay: "#c9a95a",
    water: "#2f6f9a", water2: "#3f8fbf", foam: "rgba(240,250,255,.75)", canal: "#2d7f8f",
    bldg: ["#8d97a5", "#76808e", "#a3adba"], win: "rgba(60,80,110,.85)", winLit: "#ffd98a", wall: "#a59a85", wall2: "#857a66",
    leaf: "#4d6b2f", leaf2: "#3b5524", trunk: "#5a4128", rock: "#a8784f", rock2: "#7d5638", lamp: "#2b2f36", lampOn: 0,
  },
  night: {
    ground1: "#1f3128", ground2: "#1a2a22", tile: "rgba(0,0,0,0)", tile2: "rgba(0,0,0,0)",
    grid: "rgba(160,190,240,.07)", border: "rgba(0,0,0,0)",
    grassA: "#24372c", grassB: "#182a20", sandEdge: "#4a4434", forestFloor: "#101c14", forestFloor2: "#18281d",
    shore: "#4d4636", shallow: "#1b3f52", bank: "#241e16", shoulder: "#3a3428", roadLine: "#8c8770", roadStain: "rgba(0,0,0,.3)", reed: "#22301c", pebble: "#4a4236",
    dryGrass: "#4f4630", tuft: "#1a2a18", flowers: ["#8a8650", "#7a5a6e", "#9a9aa4", "#6e6488"], leafHi: "#2d4a28", palm: "#1d3320",
    stone: "#45464a", stone2: "#34353a", altRoof: "#5c3424", altWall: "#6c6658", altWall2: "#5a5446", spawn: "rgba(170,200,255,.32)",
    light: ["rgba(90,120,220,.06)", "rgba(0,4,16,.38)"], nightTint: "rgba(8,14,40,.26)", shadow: "rgba(0,0,8,.5)",
    sky: ["#03060f", "#0b1630", "#1c2a4a"], mtn: ["#121c2e", "#0e1624"], city: "#0d1424", cityLit: "#ffd27a",
    grass: ["#22342c", "#1c2c25", "#2a3c30", "#18261f"], road: "#24262c", road2: "#1c1e23", lane: "rgba(255,220,140,.6)", curb: "#4a4c52",
    plaza: "#4c4f5a", plaza2: "#42454f", sand: "#5d5340", sand2: "#4f4636", bridge: "#3f3226", hay: "#5c4f30",
    water: "#0d2440", water2: "#16365c", foam: "rgba(170,200,240,.5)", canal: "#0f3340",
    bldg: ["#283246", "#1f283a", "#323d54"], win: "rgba(20,26,40,.9)", winLit: "#ffcf6e", wall: "#4a4640", wall2: "#38352f",
    leaf: "#1d3020", leaf2: "#142318", trunk: "#2a1f14", rock: "#4f3a2a", rock2: "#3a2a1e", lamp: "#1a1d22", lampOn: 1,
  },
};

// =================================================================== ภาพ (โหลดครั้งเดียว)
const IMG = new Map();
function img(src) {
  if (typeof Image === "undefined") return null;
  let im = IMG.get(src);
  if (!im) { im = new Image(); im.decoding = "async"; im.src = src; IMG.set(src, im); }
  return im.complete && im.naturalWidth ? im : null;
}
const CHOCO_IMG = "/eos/img/chocobo.webp";
const daemonImg = (k) => `/eos/img/daemon${((Number(k) || 1) - 1) % 4 + 1}.webp`;
export function preloadEosArt() { img(CHOCO_IMG); for (let i = 1; i <= 4; i++) img(daemonImg(i)); for (let i = 1; i <= 3; i++) img(`/eos/img/car${i}.webp`); }

// แสงเรือง (อบครั้งเดียวต่อสี)
const GLOW = new Map();
function glowAt(g, x, y, r, rgb, a) {
  if (!(a > 0 && r > 0) || typeof document === "undefined") return;
  let c = GLOW.get(rgb);
  if (!c) {
    c = document.createElement("canvas"); c.width = c.height = 64;
    const x2 = c.getContext("2d"), gr = x2.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.35, `rgba(${rgb},.45)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    x2.fillStyle = gr; x2.fillRect(0, 0, 64, 64); GLOW.set(rgb, c);
  }
  const a0 = g.globalAlpha; g.globalAlpha = a0 * Math.min(1, a); g.drawImage(c, x - r, y - r, r * 2, r * 2); g.globalAlpha = a0;
}
function poly(g, pts) {
  g.beginPath();
  pts.forEach(([x, y, z = 0], i) => { const p = P(x, y, z); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); });
  g.closePath();
}
// กล่อง 3 มิติบนกระดาน (x0..x1, y0..y1, สูง h) — วาดด้านที่หันหากล้อง + หลังคา
// เงาทอด: แสงจากทิศตะวันตกเฉียงเหนือของกระดาน → เงาไปทาง +x +y (กลางคืน = แสงจันทร์ เงาจางกว่า)
const SUN = { x: 0.62, y: 0.38 };
const HEIGHT = { fd_eos_bldg: null, fd_eos_wall: 0.85, fd_eos_tree: 1.25, fd_eos_rock: 0.55, fd_eos_lamp: 1.4, fd_eos_pump: 0.7, fd_eos_garage: 0.9, fd_eos_pillar: 1.5, fd_eos_lever: 0.45, fd_eos_domecore: 0.7, fd_eos_switch: 0.8 };
function hull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.slice().reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function castShadows(g, C, night) {
  const m = MAPS[EOS_AREA], tr = (m && m.terrain) || {};
  g.save();
  g.fillStyle = night ? "rgba(0,0,12,.22)" : "rgba(20,24,10,.26)";
  g.beginPath();
  for (const [k, kind] of Object.entries(tr)) {
    if (!(kind in HEIGHT)) continue;
    const [x, y] = k.split(",").map(Number);
    const h = kind === "fd_eos_bldg" ? (BUILDING.get(k) || { h: 1.2 }).h : HEIGHT[kind];
    // ต้นไม้/หิน/เสาไฟ = เงารูปทรงกลม (ช่องเล็กกว่าเต็มช่อง) · ตึก/กำแพง = กล่องเต็มช่อง
    const inset = kind === "fd_eos_bldg" || kind === "fd_eos_wall" || kind === "fd_eos_garage" ? 0 : kind === "fd_eos_lamp" ? 0.44 : 0.22;
    const ox = SUN.x * h, oy = SUN.y * h;
    const sq = [[x + inset, y + inset], [x + 1 - inset, y + inset], [x + 1 - inset, y + 1 - inset], [x + inset, y + 1 - inset]];
    const pts = hull([...sq, ...sq.map(([a, b]) => [a + ox, b + oy])]);
    pts.forEach(([a, b], i) => { const q = P(a, b); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); });
    g.closePath();
  }
  g.fill("nonzero");
  // เงามืดรอบฐานตึก/กำแพง (ขอบนุ่ม)
  const solid = new Set(Object.entries(tr).filter(([, v]) => v === "fd_eos_bldg" || v === "fd_eos_wall" || v === "fd_eos_garage").map(([k]) => k));
  g.restore();
  msFill(g, solid, night ? "#000008" : "#141808", { cols: m.cols, rows: m.rows, th: 0.3, alpha: 0.18 });
}
// ไล่แสงบนผนัง: ล่างเข้ม → บนสว่าง (หลอกตาให้มีความลึก)
function shadeFace(g, a, b, h, alpha) {
  const p0 = P(a[0], a[1], 0), p1 = P(a[0], a[1], h);
  const gr = g.createLinearGradient(p0[0], p0[1], p1[0], p1[1]);
  gr.addColorStop(0, `rgba(0,0,0,${alpha})`); gr.addColorStop(0.5, "rgba(0,0,0,0)"); gr.addColorStop(1, `rgba(255,255,255,${alpha * 0.35})`);
  poly(g, [[a[0], a[1], 0], [b[0], b[1], 0], [b[0], b[1], h], [a[0], a[1], h]]);
  g.fillStyle = gr; g.fill();
}
function box(g, x0, y0, x1, y1, h, top, side1, side2, z0 = 0) {
  const c = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const faces = [];
  for (let i = 0; i < 4; i++) {
    const a = c[i], b = c[(i + 1) % 4];
    const pa = P(a[0], a[1]), pb = P(b[0], b[1]);
    // ด้านที่หันหากล้อง: ขอบล่างอยู่ล่างจุดกลาง (ง่าย: เทียบความลึก)
    faces.push({ a, b, d: depthOf((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), dy: (pa[1] + pb[1]) / 2 });
  }
  const mid = depthOf((x0 + x1) / 2, (y0 + y1) / 2);
  faces.filter((f) => f.d > mid).forEach((f, i) => {
    poly(g, [[f.a[0], f.a[1], z0], [f.b[0], f.b[1], z0], [f.b[0], f.b[1], h], [f.a[0], f.a[1], h]]);
    g.fillStyle = i % 2 ? side1 : side2; g.fill();
    if (h > 0.3 && !z0) shadeFace(g, f.a, f.b, h, 0.28);
  });
  poly(g, c.map(([x, y]) => [x, y, h])); g.fillStyle = top; g.fill();
  if (h > 0.3) { g.strokeStyle = "rgba(255,255,255,.18)"; g.lineWidth = 1; g.stroke(); } // ขอบหลังคารับแสง
}

// =================================================================== ธีม (อบ)
function skyFill(c, stops) {
  const { g, VX0, VY0, VW, bY } = c, gr = g.createLinearGradient(0, VY0, 0, bY);
  stops.forEach((col, i) => gr.addColorStop(i / (stops.length - 1), col));
  g.fillStyle = gr; g.fillRect(VX0, VY0, VW, bY - VY0);
}
function mountains(c, color, base, amp, f, ph) {
  const { g, VX0, VX1, bY } = c;
  g.fillStyle = color; g.beginPath(); g.moveTo(VX0, bY + 2);
  for (let x = VX0; x <= VX1 + 8; x += 8) g.lineTo(x, base - Math.abs(Math.sin(x * f + ph)) * amp - Math.abs(Math.sin(x * f * 2.3 + ph * 2)) * amp * 0.4);
  g.lineTo(VX1, bY + 2); g.closePath(); g.fill();
}
function skyline(c, base) {
  const { g, C, night, VX0, VX1 } = c, R = rng(77);
  const mid = (VX0 + VX1) / 2;
  for (let x = mid - 260; x < mid + 260; x += 10 + R() * 16) {
    const w = 10 + R() * 20, h = 30 + R() * 90 * (1 - Math.abs(x - mid) / 320);
    g.fillStyle = C.city; g.fillRect(x, base - h, w, h);
    if (night && C.cityLit) {
      g.fillStyle = C.cityLit;
      for (let yy = base - h + 4; yy < base - 4; yy += 6) for (let xx = x + 2; xx < x + w - 2; xx += 5) if (R() < 0.35) g.fillRect(xx, yy, 1.6, 2);
    }
  }
  // ยอดปราสาท (ป้อมกลางนครหลวง)
  g.fillStyle = C.city; g.beginPath(); g.moveTo(mid - 18, base - 120); g.lineTo(mid, base - 175); g.lineTo(mid + 18, base - 120); g.closePath(); g.fill();
  g.fillRect(mid - 22, base - 122, 44, 122);
  if (night) glow(g, mid, base - 60, 220, "255,210,130", 0.18);
}
export const theme = {
  pal: PAL,
  back(c) {
    const { g, C, night, bY, VX0, VW, VY0 } = c;
    skyFill(c, C.sky);
    if (night) {
      const R = rng(5);
      for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + R() * 0.6})`; g.fillRect(VX0 + R() * VW, VY0 + R() * (bY - VY0 - 40), 1.2, 1.2); }
      glow(g, VX0 + VW * 0.78, VY0 + 70, 60, "220,230,255", 0.6);
      g.fillStyle = "#e8eefc"; g.beginPath(); g.arc(VX0 + VW * 0.78, VY0 + 70, 14, 0, TAU); g.fill();
    } else glow(g, VX0 + VW * 0.25, bY - 120, 260, "255,215,150", 0.35);
    mountains(c, C.mtn[0], bY - 70, 60, 0.0035, 0.4);
    skyline(c, bY - 18);
    mountains(c, C.mtn[1], bY - 16, 18, 0.008, 1.7);
  },
  ground(c) {
    const { g, C, R, bY, wx0, wx1, wy1 } = c;
    const area = (wx1 - wx0) * (wy1 + 1);
    for (let i = 0, n = Math.min(900, Math.round(area * 0.5)); i < n; i++) {
      const [sx, sy, s] = PS(wx0 + R() * (wx1 - wx0), -1 + R() * (wy1 + 1));
      if (sy < bY) continue;
      g.fillStyle = C.grass[i % C.grass.length]; g.globalAlpha = 0.35 + R() * 0.3;
      g.beginPath(); g.ellipse(sx, sy, s * (0.2 + R() * 0.4), s * (0.06 + R() * 0.08), 0, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
  },
  side(c) {
    const { g, C, VX0, VX1, VW } = c, { cols, rows } = sceneSize();
    const rs = rng(91), band = 2.4 + Math.max(0, (VW - LW) / 60);
    const list = [];
    for (let i = 0; i < 160; i++) {
      list.push([-1.4 - rs() * band, rs() * (rows + 0.5), rs()]);
      list.push([cols + 0.4 + rs() * band, rs() * (rows + 0.5), rs()]);
    }
    list.sort((a, b) => a[1] - b[1]).forEach(([x, y, r]) => {
      const [sx, sy, s] = PS(x, y);
      if (sx < VX0 - 80 || sx > VX1 + 80) return;
      if (r < 0.65) treeShape(g, sx, sy, s * (1 + r * 0.6), C, r);
      else rockShape(g, sx, sy, s * 0.9, C);
    });
  },
  // น้ำลึก/คลอง (หลังเส้นตาราง)
  // พื้นทั้งกระดาน (อบ — ใต้เส้นตาราง): หญ้าไล่สีตาม noise + พื้นแต่ละชนิดเป็นก้อนโค้งกลืนกัน (ไม่ลงสีทีละช่อง — ผู้ใช้สั่ง "ต้องสมจริง")
  //  เทคนิค: วงกลมซ้อนกันที่กลางช่องของชนิดเดียวกัน (รัศมีเกินครึ่งช่อง + สั่นตาม noise) = ขอบโค้งต่อกันเป็นผืน · ขอบนุ่มด้วยชั้นจางรัศมีใหญ่กว่า
  //  แล้วโรยของชิ้นเล็กตามขอบ (กก ก้อนหิน หญ้าแห้ง พุ่มไม้) ให้รอยต่อดูเป็นธรรมชาติ
  base(c) {
    const { g, C, info } = c;
    if (info.area !== EOS_AREA) return;
    const T = TILES;
    // หญ้า: สีไล่ตาม noise ความถี่ต่ำ (ไม่มีลายตาหมากรุก)
    for (let y = 0; y < info.rows; y++) for (let x = 0; x < info.cols; x++) {
      const v = vnoise(x * 0.23, y * 0.23), w = vnoise(x * 0.61 + 9, y * 0.61 + 3);
      quad(g, x - 0.02, y - 0.02, 0); g.fillStyle = mix(C.grassA, C.grassB, Math.min(1, v * 0.8 + w * 0.35)); g.fill();
    }
    const dim = { cols: info.cols, rows: info.rows };
    const sand = setOf(T.sand), forest = setOf(T.forest), wet = setOf([...T.shallow, ...T.water]), deep = setOf(T.water), road = setOf(T.road);
    // ทราย: ขอบนอกจาง (ทรายปนหญ้า) → เนื้อทราย
    msFill(g, sand, C.sandEdge, { ...dim, jitter: 0.45, th: 0.32, seed: 1, alpha: 0.75 });
    msFill(g, sand, C.sand, { ...dim, jitter: 0.45, th: 0.5, seed: 1 });
    // พื้นป่า: ดินชื้นเข้ม (ขอบคด)
    msFill(g, forest, C.forestFloor2, { ...dim, jitter: 0.4, th: 0.36, seed: 2 });
    msFill(g, forest, C.forestFloor, { ...dim, jitter: 0.4, th: 0.55, seed: 2 });
    // ลานเมือง (เมืองเป็นเส้นตรงได้ — หินปูพื้น)
    for (const t of T.plaza) { quad(g, t.x - 0.01, t.y - 0.01); g.fillStyle = (t.x + t.y) % 2 ? C.plaza : C.plaza2; g.fill(); }
    // น้ำ: ชายฝั่งทราย → น้ำตื้น → น้ำลึก (ขอบคดตาม noise)
    msFill(g, wet, C.shore, { ...dim, jitter: 0.4, th: 0.28, seed: 3 });
    msFill(g, wet, C.bank, { ...dim, jitter: 0.4, th: 0.5, seed: 3 });                       // ผนังตลิ่ง (มองเห็นฝั่งไกล)
    msFill(g, wet, C.shallow, { ...dim, jitter: 0.4, th: 0.5, seed: 3, oy: 0.16 });            // ผิวน้ำต่ำกว่าพื้น
    msFill(g, deep, C.water, { ...dim, jitter: 0.35, th: 0.5, seed: 4, oy: 0.16 });
    msFill(g, deep, C.water2, { ...dim, jitter: 0.3, th: 0.78, seed: 5, alpha: 0.6, oy: 0.16 });
    // คลองเมืองน้ำ: ขอบหิน
    for (const t of T.canal) { quad(g, t.x - 0.03, t.y - 0.03); g.fillStyle = C.curb; g.fill(); }
    for (const t of T.canal) { quad(g, t.x + 0.07, t.y + 0.07); g.fillStyle = C.bank; g.fill(); }
    for (const t of T.canal) { quad(g, t.x + 0.07, t.y + 0.2); g.fillStyle = C.canal; g.fill(); } // น้ำในคลองต่ำกว่าขอบ
    // เงาทอดตามทิศแสง (สิ่งกีดขวางที่สูง) + เงามืดรอบฐานตึก/กำแพง (ambient occlusion)
    castShadows(g, C, c.night);
    // ถนน: ไหล่ทางดิน → ยางมะตอย (ขอบตรง เลี้ยวลบมุม 45°) → เส้นขอบถนน
    msFill(g, road, C.shoulder, { ...dim, th: 0.42 });
    msFill(g, road, C.roadLine, { ...dim, th: 0.5 });   // เส้นขอบถนนสีขาว
    msFill(g, road, C.road, { ...dim, th: 0.57 });
    // รอยล้อ/คราบน้ำมันบนถนน
    for (const t of T.road) {
      const R = rng(t.x * 53 + t.y * 19);
      if (R() < 0.35) { const [px, py, s] = P(t.x + 0.2 + R() * 0.6, t.y + 0.2 + R() * 0.6); g.fillStyle = C.roadStain; g.beginPath(); g.ellipse(px, py, s * (0.1 + R() * 0.12), s * 0.04, R() * 3, 0, TAU); g.fill(); }
    }
    // สะพาน (ไม้บนน้ำ) · คอกช็อโก้ (ฟาง)
    for (const t of T.bridge) {
      quad(g, t.x - 0.02, t.y - 0.02); g.fillStyle = C.canal; g.fill();
      quad(g, t.x + 0.08, t.y - 0.02, 0.06); g.fillStyle = C.bridge; g.fill();
      g.strokeStyle = "rgba(0,0,0,.32)"; g.lineWidth = 1;
      for (let i = 1; i < 5; i++) { const a = P(t.x + 0.1, t.y + i / 5, 0.06), b = P(t.x + 0.9, t.y + i / 5, 0.06); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    }
    msFill(g, setOf(T.stable), C.hay, { cols: info.cols, rows: info.rows, jitter: 0.3, th: 0.45, seed: 6 });
  },
  // ของชิ้นเล็กตามรอยต่อ (อบ — หลังเส้นตาราง): กก ริมน้ำ · ก้อนหินริมทราย · ดอกไม้/หญ้าในทุ่ง · พุ่มไม้ใต้ร่มป่า
  deco(c) {
    const { g, C, info } = c;
    if (info.area !== EOS_AREA) return;
    const T = TILES, isW = (x, y) => WATER_SET.has(K(x, y));
    // ประกายบนผิวน้ำ
    g.strokeStyle = C.foam; g.lineWidth = 1;
    for (const t of T.water) {
      const R = rng(t.x * 31 + t.y * 17);
      g.globalAlpha = 0.3;
      for (let i = 0; i < 2; i++) { const yy = t.y + 0.2 + R() * 0.6, a = P(t.x + 0.1 + R() * 0.3, yy), b = P(t.x + 0.5 + R() * 0.4, yy); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    }
    g.globalAlpha = 1;
    // กกริมน้ำตื้น
    g.strokeStyle = C.reed; g.lineWidth = 1.2;
    for (const t of T.shallow) {
      const R = rng(t.x * 7 + t.y * 131);
      for (let i = 0; i < 5; i++) {
        const x = t.x + R(), y = t.y + R();
        if (isW(Math.floor(x), Math.floor(y))) continue;
        const p0 = P(x, y), p1 = P(x + 0.03, y, 0.22 + R() * 0.2);
        g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
      }
    }
    // ก้อนหินเล็ก/หญ้าแห้งริมทะเลทราย
    for (const t of T.sand) {
      const R = rng(t.x * 91 + t.y * 13);
      if (R() < 0.3) { const [px, py, s] = P(t.x + R(), t.y + R()); g.fillStyle = C.pebble; g.beginPath(); g.ellipse(px, py, s * 0.06, s * 0.035, 0, 0, TAU); g.fill(); }
      if (R() < 0.25) { const [px, py, s] = P(t.x + R(), t.y + R()); g.strokeStyle = C.dryGrass; g.lineWidth = 1; for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(px, py); g.lineTo(px + k * s * 0.05, py - s * 0.12); g.stroke(); } }
    }
    // ทุ่งหญ้า: ดอกไม้/กอหญ้า (เว้นถนน/เมือง)
    for (const t of T.grass) {
      const R = rng(t.x * 17 + t.y * 71);
      for (let i = 0; i < 3; i++) {
        const [px, py, s] = P(t.x + R(), t.y + R());
        if (R() < 0.5) { g.strokeStyle = C.tuft; g.lineWidth = 1; g.beginPath(); g.moveTo(px - s * 0.04, py); g.lineTo(px, py - s * 0.09); g.lineTo(px + s * 0.04, py); g.stroke(); }
        else if (R() < 0.3) { g.fillStyle = C.flowers[Math.floor(R() * C.flowers.length)]; g.beginPath(); g.arc(px, py - 1, Math.max(1, s * 0.025), 0, TAU); g.fill(); }
      }
    }
    // พุ่มไม้ใต้ร่มป่า (หลายชั้น เรียงจากไกลไปใกล้)
    const shrubs = [];
    for (const t of T.forest) {
      const R = rng(t.x * 29 + t.y * 37);
      for (let i = 0; i < 3; i++) shrubs.push([t.x + 0.1 + R() * 0.8, t.y + 0.1 + R() * 0.8, 0.16 + R() * 0.14, R()]);
    }
    shrubs.sort((a, b) => depthOf(a[0], a[1]) - depthOf(b[0], b[1]));
    for (const [x, y, r, k] of shrubs) {
      const [px, py, s] = P(x, y);
      g.fillStyle = C.shadow; g.beginPath(); g.ellipse(px, py + s * 0.02, s * r * 1.1, s * r * 0.4, 0, 0, TAU); g.fill();
      g.fillStyle = k < 0.5 ? C.leaf2 : C.leaf; g.beginPath(); g.arc(px, py - s * r * 0.6, s * r, 0, TAU); g.fill();
      g.fillStyle = C.leafHi; g.globalAlpha = 0.5; g.beginPath(); g.arc(px - s * r * 0.3, py - s * r * 0.9, s * r * 0.45, 0, TAU); g.fill(); g.globalAlpha = 1;
    }
  },
  ambient(g, f, t) {
    const { night, lowQ } = f;
    if (lowQ || !night) return;
    // หิ่งห้อยเหนือป่า Duscae (กลางคืน)
    for (let i = 0; i < 18; i++) {
      const a = t / (3200 + i * 250) + i * 1.7, x0 = 15 + (i * 5) % 12, y0 = 11 + (i * 3) % 9;
      const [x, y] = P(x0 + Math.cos(a) * 0.8, y0 + Math.sin(a * 0.9) * 0.6, 0.4 + Math.sin(a * 2) * 0.2);
      const k = 0.4 + 0.4 * Math.sin(t / 380 + i);
      glowAt(g, x, y, 7, "210,255,150", k * 0.7);
    }
  },
};

// =================================================================== ผังคงที่ (จาก MAPS — ใช้วาดพื้นแบบกลืนกัน)
function tilesOf() {
  const m = MAPS[EOS_AREA], out = { sand: [], forest: [], shallow: [], water: [], canal: [], road: [], plaza: [], bridge: [], stable: [], grass: [] };
  if (!m) return out;
  const sp = m.special || {}, tr = m.terrain || {};
  for (let y = 0; y < m.rows; y++) for (let x = 0; x < m.cols; x++) {
    const k = K(x, y), s = sp[k], t = tr[k];
    const kind = { fd_eos_sand: "sand", fd_eos_forest: "forest", fd_eos_shallow: "shallow", fd_eos_road: "road", fd_eos_plaza: "plaza", fd_eos_bridge: "bridge", fd_eos_stable: "stable" }[s]
      || { fd_eos_water: "water", fd_eos_canal: "canal" }[t];
    if (kind) out[kind].push({ x, y });
    else if (!t && !s) out.grass.push({ x, y });
  }
  return out;
}
const TILES = tilesOf();
const WATER_SET = new Set([...TILES.water, ...TILES.canal].map((t) => K(t.x, t.y)));
const ROAD_SET = new Set(TILES.road.map((t) => K(t.x, t.y)));
const BUILDING = (() => {
  // ตึกที่ติดกันเป็นหลังเดียว: ความสูงเดียวกันทั้งหลัง (ไม่ใช่กล่องแยกช่องละสูง)
  const m = MAPS[EOS_AREA], tr = (m && m.terrain) || {}, out = new Map();
  let id = 0;
  for (const [k, kind] of Object.entries(tr)) {
    if (kind !== "fd_eos_bldg" || out.has(k)) continue;
    id++;
    const h = 0.9 + hash(id, 3) * 1.8, q = [k];
    out.set(k, { id, h });
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i].split(",").map(Number);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nk = K(x + dx, y + dy);
        if (tr[nk] === "fd_eos_bldg" && !out.has(nk)) { out.set(nk, { id, h }); q.push(nk); }
      }
    }
  }
  return out;
})();
// value noise เรียบ (0..1)
function vnoise(x, y) {
  const x0 = Math.floor(x), y0 = Math.floor(y), tx = x - x0, ty = y - y0;
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const a = hash(x0, y0), b = hash(x0 + 1, y0), c2 = hash(x0, y0 + 1), d = hash(x0 + 1, y0 + 1);
  return (a * (1 - sx) + b * sx) * (1 - sy) + (c2 * (1 - sx) + d * sx) * sy;
}
function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16), k = Math.max(0, Math.min(1, t));
  const ch = (s) => Math.round(((pa >> s) & 255) * (1 - k) + ((pb >> s) & 255) * k);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
// marching squares (dual grid): ค่าที่กลางช่อง 1 = ในผืน · 0 = นอก (+ noise ที่ขอบ = โค้งไม่เท่ากัน) → เส้นขอบที่ระดับ th
//  jitter 0 = ขอบตรงลบมุม 45° (ถนน) · > 0 = ขอบคดตาม noise (น้ำ ทราย ป่า) · th < 0.5 = ผืนขยายออก (ชายฝั่งรอบน้ำ)
function msFill(g, set, color, { jitter = 0, th = 0.5, seed = 0, cols = 32, rows = 32, alpha = 1, ox = 0, oy = 0 } = {}) {
  if (!set.size) return;
  const val = (x, y) => {
    const cx = Math.max(0, Math.min(cols - 1, x)), cy = Math.max(0, Math.min(rows - 1, y));
    const inside = set.has(K(cx, cy)), n = jitter ? vnoise(x * 0.7 + seed, y * 0.7 + seed * 2) * jitter : 0;
    return inside ? 1 - n : n;
  };
  g.globalAlpha = alpha;
  g.fillStyle = color; g.strokeStyle = color; g.lineWidth = 1;
  g.beginPath();
  // เซลล์ระหว่างกลางช่อง (x, y)…(x+1, y+1) · ครอบเลยขอบกระดานครึ่งช่อง
  for (let y = -1; y < rows; y++) for (let x = -1; x < cols; x++) {
    const c = [[x, y, val(x, y)], [x + 1, y, val(x + 1, y)], [x + 1, y + 1, val(x + 1, y + 1)], [x, y + 1, val(x, y + 1)]];
    if (c.every((q) => q[2] < th)) continue;
    const pts = [];
    for (let i = 0; i < 4; i++) {
      const a = c[i], b = c[(i + 1) % 4];
      if (a[2] >= th) pts.push([a[0], a[1]]);
      if ((a[2] >= th) !== (b[2] >= th)) { const t = (th - a[2]) / (b[2] - a[2]); pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    }
    pts.forEach(([px, py], i) => { const q = P(Math.max(0, Math.min(cols, px + 0.5 + ox)), Math.max(0, Math.min(rows, py + 0.5 + oy))); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); });
    g.closePath();
  }
  g.fill(); g.stroke(); // เส้นบางสีเดียวกันปิดรอยต่อระหว่างเซลล์
  g.globalAlpha = 1;
}
const setOf = (list) => new Set(list.map((t) => K(t.x, t.y)));

// =================================================================== รูปทรง (พิกัดจอ)
function treeShape(g, x, y, s, C, r = 0.5) {
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(x, y, s * 0.36, s * 0.11, 0, 0, TAU); g.fill();
  g.fillStyle = C.trunk; g.fillRect(x - s * 0.04, y - s * 0.42, s * 0.08, s * 0.42);
  const blob = (dx, dy, rr, col) => { g.fillStyle = col; g.beginPath(); g.arc(x + dx * s, y + dy * s, rr * s, 0, TAU); g.fill(); };
  blob(0, -0.62, 0.3, C.leaf2); blob(-0.14, -0.55, 0.2, C.leaf); blob(0.13, -0.7, 0.2, C.leaf); blob(0.02, -0.82, 0.16 + r * 0.05, C.leaf);
  blob(-0.08, -0.8, 0.09, C.leafHi);
}
function palmShape(g, x, y, s, C, r = 0.5) {
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(x, y, s * 0.3, s * 0.09, 0, 0, TAU); g.fill();
  const lean = (r - 0.5) * 0.3, top = [x + lean * s, y - s * 0.95];
  g.strokeStyle = C.trunk; g.lineWidth = Math.max(2, s * 0.06); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + lean * s * 0.4, y - s * 0.5, top[0], top[1]); g.stroke();
  g.strokeStyle = C.palm; g.lineWidth = Math.max(2, s * 0.05); g.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU + r;
    g.beginPath(); g.moveTo(top[0], top[1]); g.quadraticCurveTo(top[0] + Math.cos(a) * s * 0.25, top[1] - s * 0.1, top[0] + Math.cos(a) * s * 0.38, top[1] + Math.abs(Math.sin(a)) * s * 0.18); g.stroke();
  }
  g.lineCap = "butt";
}
function pineTree(g, x, y, s, C) {
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(x, y, s * 0.3, s * 0.09, 0, 0, TAU); g.fill();
  g.fillStyle = C.trunk; g.fillRect(x - s * 0.03, y - s * 0.25, s * 0.06, s * 0.25);
  for (let i = 0; i < 3; i++) {
    const w = s * (0.32 - i * 0.08), yy = y - s * (0.2 + i * 0.28);
    g.fillStyle = i % 2 ? C.leaf : C.leaf2; g.beginPath(); g.moveTo(x - w, yy); g.lineTo(x, yy - s * 0.42); g.lineTo(x + w, yy); g.closePath(); g.fill();
  }
}
function rockShape(g, x, y, s, C, r = 0.5) {
  const k = 0.7 + r * 0.6;
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(x, y, s * 0.4 * k, s * 0.12 * k, 0, 0, TAU); g.fill();
  g.fillStyle = C.rock2; g.beginPath(); g.moveTo(x - s * 0.36 * k, y); g.lineTo(x - s * 0.28 * k, y - s * 0.46 * k); g.lineTo(x + s * 0.06 * k, y - s * 0.58 * k); g.lineTo(x + s * 0.32 * k, y - s * 0.34 * k); g.lineTo(x + s * 0.36 * k, y); g.closePath(); g.fill();
  g.fillStyle = C.rock; g.beginPath(); g.moveTo(x - s * 0.28 * k, y - s * 0.46 * k); g.lineTo(x + s * 0.06 * k, y - s * 0.58 * k); g.lineTo(x + s * 0.1 * k, y - s * 0.2 * k); g.lineTo(x - s * 0.3 * k, y - s * 0.12 * k); g.closePath(); g.fill();
  // ก้อนเล็กข้างๆ (ของชิ้นเล็กรอบของใหญ่)
  g.fillStyle = C.rock2; g.beginPath(); g.ellipse(x + s * 0.34 * k, y - s * 0.04, s * 0.09, s * 0.06, 0, 0, TAU); g.fill();
}

// =================================================================== ช่องพิเศษ: พื้นวาดรวมใน theme.base แล้ว — ไม่อบทีละช่อง
export function bakeSpecial() {}
export function animSpecial() {}

// =================================================================== สิ่งกีดขวาง (วาดทุกเฟรม เรียงความลึก)
let LAST_NIGHT = false;
let LAST_FD = null;
const palOf = (ctx) => (ctx && ctx.C && ctx.C.road ? ctx.C : PAL[ctx && ctx.night ? "night" : "day"]);
const zoneAt = (x, y) => (y >= 20 && x >= 13 ? "desert" : y >= 24 && x <= 12 ? "altissia" : y <= 9 && x <= 7 ? "hills" : y <= 9 && x >= 24 ? "north" : "wild");
function drawPillar(g, t, C, night, now) {
  const pl = LAST_FD && Array.isArray(LAST_FD.pillars) ? LAST_FD.pillars.find((o) => o.x === t.x && o.y === t.y) : null;
  const own = pl && pl.color ? pl.color : null, ch = pl && pl.ch ? pl.ch : null;
  const [bx, by, s] = P(t.x + 0.5, t.y + 0.5);
  // ฐานหิน
  box(g, t.x + 0.12, t.y + 0.12, t.x + 0.88, t.y + 0.88, 0.18, C.wall, C.wall2, C.wall);
  // วงสีเจ้าของบนพื้น
  if (own) { gEllipse(g, t.x + 0.5, t.y + 0.5, 0.62, 0.02, 28); g.strokeStyle = own; g.lineWidth = 2.5; g.stroke(); }
  // ผลึก (ลอยขึ้นลง)
  const bob = Math.sin(now / 700 + t.x) * 0.05, top = P(t.x + 0.5, t.y + 0.5, 1.55 + bob), mid = P(t.x + 0.5, t.y + 0.5, 0.95 + bob), bot = P(t.x + 0.5, t.y + 0.5, 0.3 + bob);
  const w = s * 0.2, col = own || "#8fdcff";
  glowAt(g, mid[0], mid[1], s * (night ? 1.3 : 0.9), hexRgb(col), night ? 0.65 : 0.4);
  g.fillStyle = col; g.globalAlpha = 0.9;
  g.beginPath(); g.moveTo(top[0], top[1]); g.lineTo(mid[0] + w, mid[1]); g.lineTo(bot[0], bot[1]); g.lineTo(mid[0] - w, mid[1]); g.closePath(); g.fill();
  g.globalAlpha = 1;
  g.fillStyle = "rgba(255,255,255,.6)"; g.beginPath(); g.moveTo(top[0], top[1]); g.lineTo(mid[0] - w * 0.2, mid[1]); g.lineTo(mid[0] - w, mid[1]); g.closePath(); g.fill();
  // พิธีที่กำลังร่าย: วงหมุนสีของคนร่ายรอบเสา
  if (ch) {
    const rot = now / 400;
    g.strokeStyle = ch.color || "#fff"; g.lineWidth = 2.5; g.setLineDash([6, 5]); g.lineDashOffset = -now / 40;
    gEllipse(g, t.x + 0.5, t.y + 0.5, 0.85 + 0.05 * Math.sin(rot), 0.05, 32); g.stroke(); g.setLineDash([]);
    glowAt(g, bx, by - s * 0.3, s * 1.2, hexRgb(ch.color || "#ffffff"), 0.35 + 0.15 * Math.sin(rot * 2));
  }
}
function hexRgb(h) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(h || ""));
  if (!m) return "180,220,255";
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}
// =================================================================== ขั้น 2: ลูกเล่นปั่นป่วน (server/fodlan/stage6.js "ขั้น 2")
//  drawObstacle ได้แค่ t/x/y → อ่านสถานะจาก LAST_FD (ground() เก็บไว้ทุกเฟรม)
const TOWN_RECTS = { insomnia: [8, 0, 23, 8], hammerhead: [24, 24, 31, 31], altissia: [0, 24, 12, 31] }; // = server map6 ZONES (town)
const inRect = (r, x, y) => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3];
function townAt(x, y) { for (const [id, r] of Object.entries(TOWN_RECTS)) if (inRect(r, x, y)) return id; return null; }
// ไฟเมืองดับ (แผงไฟ — fd.lightsOff[zone])
function darkAt(x, y) { const z = townAt(x, y); return !!(z && LAST_FD && LAST_FD.lightsOff && LAST_FD.lightsOff[z]); }
const lastFx = (kind) => (LAST_FD && Array.isArray(LAST_FD.fx) ? LAST_FD.fx.slice().reverse().find((e) => e.kind === kind) : null);
// เสาไฟ: ดับ/ติด + กะพริบช่วงสับสวิตช์
function lampOn(x, y, now) {
  const z = townAt(x, y), e = lastFx("lights");
  if (z && e && e.zone === z) {
    const p = fxT(e, now, fx.lights);
    if (p < 1) return Math.sin(now / 35 + x * 3) > (e.off ? p * 2 - 1 : 1 - p * 2);
  }
  return !darkAt(x, y);
}

// ---------- คันโยกสะพาน (เอียงตาม fd.bridgeUp · โยกตอนเหตุการณ์ "bridge") ----------
const LEVER_TILT = 0.65;
function leverAngle(now) {
  const to = LAST_FD && LAST_FD.bridgeUp ? LEVER_TILT : -LEVER_TILT, e = lastFx("bridge");
  if (!e) return to;
  const k = ease(Math.min(1, fxT(e, now, fx.bridge) / 0.3));
  return -to + to * 2 * k;
}
function drawLever(g, x, y, C, now) {
  const [bx, by, s] = P(x + 0.5, y + 0.55);
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(bx, by, s * 0.34, s * 0.12, 0, 0, TAU); g.fill();
  box(g, x + 0.24, y + 0.3, x + 0.76, y + 0.78, 0.26, C.stone, C.stone2, C.stone);
  const piv = P(x + 0.5, y + 0.54, 0.27);
  g.fillStyle = "#1c1f24"; g.fillRect(piv[0] - s * 0.05, piv[1] - s * 0.03, s * 0.1, s * 0.06);
  const a = leverAngle(now), L = 0.55;
  const end = P(x + 0.5, y + 0.54 + Math.sin(a) * L, 0.27 + Math.cos(a) * L);
  g.strokeStyle = "#3a3f47"; g.lineWidth = Math.max(2.5, s * 0.07); g.lineCap = "round";
  g.beginPath(); g.moveTo(piv[0], piv[1]); g.lineTo(end[0], end[1]); g.stroke();
  g.strokeStyle = "rgba(255,255,255,.25)"; g.lineWidth = Math.max(1, s * 0.02);
  g.beginPath(); g.moveTo(piv[0] - 1, piv[1]); g.lineTo(end[0] - 1, end[1]); g.stroke();
  g.lineCap = "butt";
  g.fillStyle = "#b8321f"; g.beginPath(); g.arc(end[0], end[1], Math.max(2, s * 0.06), 0, TAU); g.fill();
  g.fillStyle = "rgba(255,190,170,.6)"; g.beginPath(); g.arc(end[0] - s * 0.02, end[1] - s * 0.02, Math.max(1, s * 0.02), 0, TAU); g.fill();
}

// ---------- สะพานยก (fd_eos_bridgeup แทนสะพานที่อบไว้ · ลดลง = เห็นสะพานที่อบ) ----------
const BRIDGE_UP = 1.15; // มุมยก (rad) → ปลายสะพานสูง ≈ 0.9
const CANAL_SET = new Set(TILES.canal.map((t) => K(t.x, t.y)));
function bridgeLeaf(g, x, y, C, ang) {
  // น้ำในคลองใต้สะพาน (ปิดสะพานที่อบไว้)
  quad(g, x - 0.02, y - 0.02); g.fillStyle = C.bank; g.fill();
  quad(g, x + 0.04, y + 0.12); g.fillStyle = C.canal; g.fill();
  // คลองไหลซ้าย-ขวา = ข้ามแนวตั้ง (บานพับขอบบน) · คลองไหลบน-ล่าง = บานพับขอบซ้าย
  const vert = !(CANAL_SET.has(K(x, y - 1)) || CANAL_SET.has(K(x, y + 1))) || CANAL_SET.has(K(x - 1, y)) || CANAL_SET.has(K(x + 1, y));
  const L = 0.96, z0 = 0.06, run = Math.cos(ang) * L, top = z0 + Math.sin(ang) * L;
  const pt = (u, w) => (vert ? [x + 0.08 + u * 0.84, y + 0.02 + w * run, z0 + w * (top - z0)] : [x + 0.02 + w * run, y + 0.08 + u * 0.84, z0 + w * (top - z0)]);
  // เสาบานพับ
  for (const u of [0, 1]) {
    const [hx, hy] = pt(u, 0);
    box(g, hx - 0.05, hy - 0.05, hx + 0.05, hy + 0.05, 0.34, "#4a3a2a", "#2e241a", "#3c2f22");
  }
  // ขอบหนา → หน้าไม้ + แนวไม้กระดาน
  const face = [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)];
  poly(g, face.map(([a, b, z]) => [a, b, z - 0.05])); g.fillStyle = "#2e2318"; g.fill();
  poly(g, face); g.fillStyle = C.bridge; g.fill();
  g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 1;
  for (let i = 1; i < 6; i++) { const a = P(...pt(0, i / 6)), b = P(...pt(1, i / 6)); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  g.strokeStyle = "rgba(255,230,190,.18)"; poly(g, face); g.stroke();
  // โซ่ยก (ยอดเสา → ปลายสะพาน)
  if (ang > 0.1) {
    g.strokeStyle = "rgba(30,30,34,.75)"; g.lineWidth = 1; g.setLineDash([2, 2]);
    for (const u of [0, 1]) {
      const [hx, hy] = pt(u, 0), a = P(hx, hy, 0.34), b = P(...pt(u, 1));
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    }
    g.setLineDash([]);
  }
}

// ---------- แท่นโดม (คริสตัลเรือง) ----------
function drawDomeCore(g, x, y, C, night, now) {
  const on = !!(LAST_FD && LAST_FD.dome);
  const [bx, by, s] = P(x + 0.5, y + 0.55);
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(bx, by, s * 0.4, s * 0.14, 0, 0, TAU); g.fill();
  box(g, x + 0.18, y + 0.18, x + 0.82, y + 0.82, 0.16, C.stone2, C.stone2, C.stone);
  box(g, x + 0.3, y + 0.3, x + 0.7, y + 0.7, 0.42, C.stone, C.stone2, C.stone);
  const pulse = 0.5 + 0.5 * Math.sin(now / (on ? 260 : 700));
  g.strokeStyle = `rgba(140,220,255,${on ? 0.9 : 0.45 + 0.2 * pulse})`; g.lineWidth = 1.5;
  gEllipse(g, x + 0.5, y + 0.5, 0.17, 0.43, 18); g.stroke();
  // คริสตัลลอย
  const bob = Math.sin(now / 600) * 0.04, top = P(x + 0.5, y + 0.5, 1.05 + bob), mid = P(x + 0.5, y + 0.5, 0.8 + bob), bot = P(x + 0.5, y + 0.5, 0.52 + bob), w = s * 0.13;
  glowAt(g, mid[0], mid[1], s * (on ? 1.5 : night ? 1 : 0.7), "120,200,255", on ? 0.55 + 0.25 * pulse : night ? 0.45 : 0.3);
  g.fillStyle = on ? "#bfeaff" : "#7fc6ee"; g.globalAlpha = 0.92;
  g.beginPath(); g.moveTo(top[0], top[1]); g.lineTo(mid[0] + w, mid[1]); g.lineTo(bot[0], bot[1]); g.lineTo(mid[0] - w, mid[1]); g.closePath(); g.fill();
  g.globalAlpha = 1;
  g.fillStyle = "rgba(255,255,255,.65)"; g.beginPath(); g.moveTo(top[0], top[1]); g.lineTo(mid[0] - w * 0.2, mid[1]); g.lineTo(mid[0] - w, mid[1]); g.closePath(); g.fill();
}

// ---------- โดมกำแพงเวท (ทับกรอบ Insomnia ใน air · จาง ไม่บังของ) ----------
function domeGrow(now) {
  const e = lastFx("dome_on");
  return e ? ease(fxT(e, now, fx.dome_on)) : 1;
}
const HEX = Array.from({ length: 6 }, (_, i) => [Math.cos(i / 6 * TAU + Math.PI / 6), Math.sin(i / 6 * TAU + Math.PI / 6)]);
function hexPath(g, cx, cy, r, sq = 1) {
  HEX.forEach(([a, b], i) => (i ? g.lineTo(cx + a * r, cy + b * r * sq) : g.moveTo(cx + a * r, cy + b * r * sq)));
  g.closePath();
}
function drawDome(g, rect, k, alpha, now, lowQ) {
  if (!(k > 0.01 && alpha > 0.01)) return;
  const [x0, y0, x1, y1] = rect, cx = (x0 + x1 + 1) / 2, cy = (y0 + y1 + 1) / 2, rx = (x1 - x0 + 1) / 2 + 0.15, ry = (y1 - y0 + 1) / 2 + 0.15, H = 3.4 * k;
  const S = (u, v) => P(cx + rx * Math.cos(v) * Math.cos(u), cy + ry * Math.cos(v) * Math.sin(u), H * Math.sin(v));
  g.save();
  // เงาโดม (ผิวจาง ไล่บนสว่าง)
  const pts = [];
  for (let i = 0; i < 28; i++) for (let j = 0; j <= 6; j++) { const q = S(i / 28 * TAU, j / 6 * Math.PI / 2); pts.push([q[0], q[1]]); }
  const hl = hull(pts), apex = S(0, Math.PI / 2), foot = S(Math.PI / 2, 0);
  const gr = g.createLinearGradient(apex[0], apex[1], foot[0], foot[1]);
  gr.addColorStop(0, `rgba(190,235,255,${0.12 * alpha})`); gr.addColorStop(1, `rgba(90,170,255,${0.05 * alpha})`);
  g.beginPath(); hl.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); g.closePath();
  g.fillStyle = gr; g.fill();
  g.strokeStyle = `rgba(170,225,255,${0.35 * alpha})`; g.lineWidth = 1.5; g.stroke();
  // วงฐาน
  g.beginPath();
  for (let i = 0; i <= 48; i++) { const q = S(i / 48 * TAU, 0); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }
  g.strokeStyle = `rgba(140,215,255,${0.5 * alpha})`; g.lineWidth = 2; g.stroke();
  // ลายหกเหลี่ยม (ผิวหน้าเข้มกว่าผิวหลัง) + ประกายวิ่ง
  if (!lowQ) {
    const rows = 6, glint = [];
    g.lineWidth = 1;
    for (const side of [-1, 1]) {
      g.beginPath();
      for (let j = 0; j < rows; j++) {
        const v = (j + 0.5) / rows * Math.PI / 2, n = Math.max(6, Math.round(30 * Math.cos(v)));
        for (let i = 0; i < n; i++) {
          const u = (i + (j % 2) * 0.5) / n * TAU;
          if (Math.sign(Math.sin(u)) !== side) continue;
          const [px, py, s] = S(u, v), r = s * 0.42 * (0.55 + 0.45 * Math.cos(v));
          hexPath(g, px, py, r, 0.55 + 0.45 * Math.sin(v));
          if (Math.sin(now / 700 + i * 1.7 + j * 2.3) > 0.9) glint.push([px, py, r, 0.55 + 0.45 * Math.sin(v)]);
        }
      }
      g.strokeStyle = `rgba(190,235,255,${(side > 0 ? 0.24 : 0.1) * alpha})`; g.stroke();
    }
    g.beginPath(); for (const [px, py, r, sq] of glint) hexPath(g, px, py, r, sq);
    g.fillStyle = `rgba(200,240,255,${0.14 * alpha})`; g.fill();
  }
  g.restore();
}
function drawBarrier(g, x, y, now) {
  const h = 1.15 * domeGrow(now);
  if (h < 0.02) return;
  const sh = 0.5 + 0.5 * Math.sin(now / 320 + x * 0.9 + y * 0.7);
  box(g, x + 0.04, y + 0.04, x + 0.96, y + 0.96, h, `rgba(170,225,255,${0.22 + 0.1 * sh})`, `rgba(90,170,255,${0.28 + 0.1 * sh})`, `rgba(120,195,255,${0.24 + 0.1 * sh})`);
  // ลายหกเหลี่ยมบนหน้ากำแพง (ขอบที่หันหากล้อง y+1)
  const [, , s] = P(x + 0.5, y + 1);
  g.beginPath();
  for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
    const zc = (row + 0.5) / 3 * h, xc = x + 0.18 + (col + (row % 2) * 0.5) * 0.3;
    if (xc > x + 0.9) continue;
    const c = P(xc, y + 0.96, zc);
    hexPath(g, c[0], c[1], s * 0.1, 0.9);
  }
  g.strokeStyle = `rgba(200,240,255,${0.35 + 0.25 * sh})`; g.lineWidth = 1; g.stroke();
  const m = P(x + 0.5, y + 0.5, h * 0.5);
  glowAt(g, m[0], m[1], s * 0.9, "120,200,255", 0.35 + 0.2 * sh);
}

// ---------- แผงไฟเมือง (กล่องเหล็กบนเสา · ไฟเขียว = เปิด / แดง = ดับ) ----------
function drawSwitch(g, x, y, C, now) {
  const [bx, by, s] = P(x + 0.5, y + 0.55);
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(bx, by, s * 0.2, s * 0.07, 0, 0, TAU); g.fill();
  const base = P(x + 0.5, y + 0.5), top = P(x + 0.5, y + 0.5, 0.62);
  g.strokeStyle = "#3a3d42"; g.lineWidth = Math.max(2, s * 0.05); g.beginPath(); g.moveTo(base[0], base[1]); g.lineTo(top[0], top[1]); g.stroke();
  box(g, x + 0.32, y + 0.4, x + 0.68, y + 0.62, 0.92, "#8a9098", "#5a6068", "#70767e", 0.56);
  const off = darkAt(x, y), e = lastFx("lights");
  const blink = !!e && e.x === x && e.y === y && fxT(e, now, fx.lights) < 1 && Math.sin(now / 45) > 0;
  const d = P(x + 0.42, y + 0.63, 0.66);
  g.fillStyle = "rgba(20,22,26,.6)"; g.fillRect(d[0] - s * 0.02, d[1] - s * 0.02, s * 0.18, s * 0.035);
  const lp = P(x + 0.5, y + 0.63, 0.8);
  g.fillStyle = blink ? "#ffffff" : off ? "#ff4a32" : "#50ff78"; g.beginPath(); g.arc(lp[0], lp[1], Math.max(1.5, s * 0.035), 0, TAU); g.fill();
  glowAt(g, lp[0], lp[1], s * 0.35, off ? "255,70,50" : "80,255,120", 0.55 + 0.25 * Math.sin(now / 400));
}

// ---------- ซากรถ (ผลักได้ · เลื่อนนุ่มตอนถูกผลัก) ----------
const WRECK_MS = 600;
function drawWreck(g, x, y, now) {
  const w = LAST_FD && Array.isArray(LAST_FD.wrecks) ? LAST_FD.wrecks.find((o) => o.x === x && o.y === y) : null;
  const pos = w ? smooth(`wreck:${w.id}`, x, y, now, WRECK_MS) : { x, y };
  const seed = w ? String(w.id).split("").reduce((a, ch) => a + ch.charCodeAt(0), 0) : x * 7 + y;
  const hz = hash(seed, 5) < 0.6, mx = pos.x + 0.5, my = pos.y + 0.5;
  const [cx, cy, s] = P(mx, my + 0.05);
  g.fillStyle = "rgba(0,0,0,.4)"; g.beginPath(); g.ellipse(cx, cy, s * 0.48, s * 0.17, 0, 0, TAU); g.fill();
  const ax = hz ? 0.42 : 0.26, ay = hz ? 0.26 : 0.42;
  // ล้อแบน (ยางไหม้)
  g.fillStyle = "#141210";
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const p = P(mx + dx * ax * 0.75, my + dy * ay * 0.85, 0.05);
    g.beginPath(); g.ellipse(p[0], p[1], s * 0.08, s * 0.05, 0, 0, TAU); g.fill();
  }
  // ตัวถังสนิม + ห้องโดยสารยุบ
  box(g, mx - ax, my - ay, mx + ax, my + ay, 0.27, "#6b3d24", "#3a2216", "#58311d", 0.06);
  const ca = hz ? 0.2 : ay * 0.8, cb = hz ? ay * 0.8 : 0.2, off = hz ? -0.05 : 0;
  box(g, mx - ca + off, my - cb, mx + ca + off, my + cb, 0.42, "#2a2420", "#1a1512", "#332b25", 0.27);
  // รอยไหม้/สนิม
  const R = rng(seed * 13 + 3);
  for (let i = 0; i < 4; i++) {
    const p = P(mx + (R() - 0.5) * ax * 1.6, my + (R() - 0.5) * ay * 1.6, 0.28);
    g.fillStyle = i % 2 ? "rgba(150,70,30,.7)" : "rgba(15,12,10,.6)";
    g.beginPath(); g.ellipse(p[0], p[1], s * (0.05 + R() * 0.06), s * 0.025, R() * 3, 0, TAU); g.fill();
  }
  // กระจกแตก
  const wp = P(mx, my + cb, 0.35);
  g.fillStyle = "rgba(0,0,0,.75)"; g.fillRect(wp[0] - s * 0.07, wp[1] - s * 0.04, s * 0.14, s * 0.06);
}

export function drawObstacle(g, t, ctx, now) {
  LAST_NIGHT = !!(ctx && ctx.night);
  const C = palOf(ctx), night = LAST_NIGHT;
  const { x, y, kind } = t;
  if (kind === "fd_eos_water" || kind === "fd_eos_canal" || kind === "fd_eos_daemon") return; // น้ำวาดในพื้น · ปีศาจใน items
  if (kind === "fd_eos_pillar") { drawPillar(g, t, C, night, now); return; }
  if (kind === "fd_eos_lever") { drawLever(g, x, y, C, now); return; }
  if (kind === "fd_eos_bridgeup") { const e = lastFx("bridge"); bridgeLeaf(g, x, y, C, e && e.up ? BRIDGE_UP * ease(fxT(e, now, fx.bridge)) : BRIDGE_UP); return; }
  if (kind === "fd_eos_domecore") { drawDomeCore(g, x, y, C, night, now); return; }
  if (kind === "fd_eos_barrier") { drawBarrier(g, x, y, now); return; }
  if (kind === "fd_eos_switch") { drawSwitch(g, x, y, C, now); return; }
  if (kind === "fd_eos_wreck") { drawWreck(g, x, y, now); return; }
  const [sx, sy, s] = P(x + 0.5, y + 0.6);
  const zone = zoneAt(x, y), r = hash(x, y);
  if (kind === "fd_eos_tree") {
    if (zone === "desert" || zone === "altissia") palmShape(g, sx, sy, s * 1.2, C, r);
    else if (zone === "north" || zone === "hills") pineTree(g, sx, sy, s * 1.3, C);
    else treeShape(g, sx, sy, s * (1.05 + r * 0.3), C, r);
    return;
  }
  if (kind === "fd_eos_rock") { rockShape(g, sx, sy, s, zone === "desert" ? C : { ...C, rock: C.stone, rock2: C.stone2 }, r); return; }
  if (kind === "fd_eos_bldg") {
    const b = BUILDING.get(K(x, y)), h = b ? b.h : 1.2, tone = b ? b.id % 3 : 0;
    const altissia = zone === "altissia";
    const top = altissia ? C.altRoof : C.bldg[tone], s1 = altissia ? C.altWall : C.bldg[(tone + 1) % 3], s2 = altissia ? C.altWall2 : C.bldg[(tone + 2) % 3];
    const hh = altissia ? Math.min(h, 1.1) : h;
    box(g, x, y, x + 1, y + 1, hh, top, s1, s2);
    if (!altissia && hh > 1.4 && hash(x, y + 7) < 0.45) box(g, x + 0.25, y + 0.3, x + 0.55, y + 0.6, hh + 0.14, C.bldg[(tone + 1) % 3], C.bldg[(tone + 2) % 3], C.bldg[tone]);
    const R = rng(x * 37 + y * 11);
    for (let zz = 0.25; zz < (altissia ? 1 : h) - 0.15; zz += 0.3) for (const fx2 of [0.3, 0.7]) {
      const lit = R() < 0.55 && night && !darkAt(x, y);
      const p = P(x + fx2, y + 1, zz);
      g.fillStyle = lit ? C.winLit : C.win; g.fillRect(p[0] - s * 0.05, p[1] - s * 0.08, s * 0.09, s * 0.1);
      if (lit && R() < 0.25) glowAt(g, p[0], p[1] - s * 0.03, s * 0.18, "255,210,130", 0.35);
    }
    return;
  }
  if (kind === "fd_eos_wall") {
    box(g, x, y + 0.15, x + 1, y + 0.85, 0.75, C.wall, C.wall2, C.wall);
    for (let i = 0; i < 3; i++) box(g, x + 0.05 + i * 0.33, y + 0.2, x + 0.25 + i * 0.33, y + 0.8, 0.9, C.wall, C.wall2, C.wall);
    return;
  }
  if (kind === "fd_eos_lamp") {
    const base = P(x + 0.5, y + 0.5), top = P(x + 0.5, y + 0.5, 1.5);
    g.strokeStyle = C.lamp; g.lineWidth = Math.max(2, s * 0.06); g.beginPath(); g.moveTo(base[0], base[1]); g.lineTo(top[0], top[1]); g.stroke();
    g.fillStyle = C.lamp; g.fillRect(top[0] - s * 0.1, top[1] - s * 0.04, s * 0.2, s * 0.06);
    const fl = 0.85 + 0.15 * Math.sin(now / 170 + x), on = night && lampOn(x, y, now);
    g.fillStyle = on ? "#ffe2a0" : night ? "#5a5a52" : "#d8d3c0"; g.beginPath(); g.arc(top[0], top[1] + s * 0.04, s * 0.05, 0, TAU); g.fill();
    if (on) { glowAt(g, top[0], top[1], s * 0.9, "255,210,130", 0.75 * fl); glowAt(g, base[0], base[1], s * 0.8, "255,200,120", 0.35 * fl); }
    return;
  }
  if (kind === "fd_eos_pump") {
    box(g, x + 0.3, y + 0.3, x + 0.7, y + 0.7, 0.75, "#c63b2b", "#8f2418", "#a52d1f");
    const p = P(x + 0.5, y + 0.71, 0.5); g.fillStyle = "#f4f0e6"; g.fillRect(p[0] - s * 0.08, p[1] - s * 0.06, s * 0.16, s * 0.09);
    return;
  }
  if (kind === "fd_eos_garage") {
    box(g, x + 0.02, y + 0.02, x + 0.98, y + 0.98, 0.9, "#9a8f7a", "#6f6656", "#827866");
    const on = night && !darkAt(x, y);
    const p = P(x + 0.5, y + 0.99, 0.35); g.fillStyle = on ? "#ffcc66" : "#3a3a3a"; g.fillRect(p[0] - s * 0.3, p[1] - s * 0.2, s * 0.6, s * 0.3);
    if (on) glowAt(g, p[0], p[1], s * 0.8, "255,200,100", 0.4);
  }
}

// =================================================================== ตำแหน่งนุ่ม (รถ/ปีศาจเลื่อนไปที่ใหม่)
const MOVES = new Map(); // id → { fx, fy, tx, ty, t0, ms, path }
function smooth(id, x, y, now, ms, path = null) {
  let m = MOVES.get(id);
  if (!m) { m = { fx: x, fy: y, tx: x, ty: y, t0: -1e9, ms, path: null }; MOVES.set(id, m); }
  if (m.tx !== x || m.ty !== y) {
    const cur = posOf(m, now);
    Object.assign(m, { fx: cur.x, fy: cur.y, tx: x, ty: y, t0: now, ms, path: path && path.length > 1 ? path : null });
  }
  return posOf(m, now);
}
function posOf(m, now) {
  const k = Math.max(0, Math.min(1, (now - m.t0) / m.ms));
  if (m.path) {
    const n = m.path.length - 1, f = ease(k) * n, i = Math.min(n - 1, Math.floor(f)), r = f - i;
    const a = m.path[i], b = m.path[i + 1];
    return { x: a.x + (b.x - a.x) * r, y: a.y + (b.y - a.y) * r, moving: k < 1 };
  }
  const e = ease(k);
  return { x: m.fx + (m.tx - m.fx) * e, y: m.fy + (m.ty - m.fy) * e, moving: k < 1 };
}
const pathOf = (fd, kind, id) => {
  const e = (fd.fx || []).slice().reverse().find((ev) => ev.kind === kind && (ev.car === id || (ev.moves && ev.moves.some((m) => m.id === id))));
  if (!e) return null;
  if (e.path) return e.path;
  const m = e.moves && e.moves.find((mm) => mm.id === id);
  return m ? m.path : null;
};

// =================================================================== รถ (2×2 · หันตามทิศที่วิ่งล่าสุด)
const HEADING = new Map();
function drawCar(g, cx, cy, dir, col, night, now, moving) {
  // ตัวรถในกรอบ 2×2: ยาว 1.7 กว้าง 0.95 (หันตาม dir: "h" แนวนอน / "v" แนวตั้ง)
  const L = 0.85, W = 0.47, h = 0.32;
  const hz = dir === "h";
  const ax = hz ? L : W, ay = hz ? W : L;
  const sh = P(cx, cy);
  g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.ellipse(sh[0], sh[1] + 2, sh[2] * (hz ? 1.0 : 0.6), sh[2] * 0.3, 0, 0, TAU); g.fill();
  box(g, cx - ax, cy - ay, cx + ax, cy + ay, h, col.body, col.dark, col.body);
  // ห้องโดยสาร (ต่ำ ลู่)
  const ca = hz ? 0.42 : W * 0.8, cb = hz ? W * 0.8 : 0.42;
  box(g, cx - ca, cy - cb, cx + ca, cy + cb, h + 0.2, "rgba(30,40,55,.92)", "rgba(20,26,36,.95)", "rgba(40,52,70,.92)");
  // ไฟหน้า/ไฟท้าย
  const front = hz ? [[cx + ax, cy - ay * 0.6], [cx + ax, cy + ay * 0.6]] : [[cx - ax * 0.6, cy + ay], [cx + ax * 0.6, cy + ay]];
  const back = hz ? [[cx - ax, cy - ay * 0.6], [cx - ax, cy + ay * 0.6]] : [[cx - ax * 0.6, cy - ay], [cx + ax * 0.6, cy - ay]];
  for (const [fx2, fy2] of front) {
    const p = P(fx2, fy2, h * 0.6);
    g.fillStyle = "#fff6d8"; g.beginPath(); g.arc(p[0], p[1], Math.max(1.4, p[2] * 0.04), 0, TAU); g.fill();
    if (night || moving) glowAt(g, p[0], p[1], p[2] * (night ? 0.7 : 0.35), "255,240,200", night ? 0.7 : 0.4);
  }
  for (const [bx, by] of back) {
    const p = P(bx, by, h * 0.6);
    g.fillStyle = "#ff3a2a"; g.beginPath(); g.arc(p[0], p[1], Math.max(1.2, p[2] * 0.035), 0, TAU); g.fill();
    if (night) glowAt(g, p[0], p[1], p[2] * 0.35, "255,60,40", 0.5);
  }
  // เงาสะท้อนบนฝากระโปรง
  const hl = P(cx + (hz ? ax * 0.55 : 0), cy + (hz ? 0 : ay * 0.55), h + 0.01);
  g.fillStyle = col.hi; g.globalAlpha = 0.5; g.beginPath(); g.ellipse(hl[0], hl[1], hl[2] * 0.14, hl[2] * 0.04, 0, 0, TAU); g.fill(); g.globalAlpha = 1;
  if (moving && !night) void now;
}

// =================================================================== ช็อโก้ / ปีศาจ (ภาพ)
function sprite(g, src, x, y, z, hTiles, flip = false, alpha = 1) {
  const im = img(src);
  const [sx, sy, s] = P(x, y, z);
  if (!im) { g.fillStyle = "#f2c94c"; g.beginPath(); g.arc(sx, sy - s * 0.3, s * 0.2, 0, TAU); g.fill(); return [sx, sy, s]; }
  const h = s * hTiles, w = h * (im.naturalWidth / im.naturalHeight);
  g.save(); g.globalAlpha *= alpha; g.translate(sx, sy); if (flip) g.scale(-1, 1);
  g.drawImage(im, -w / 2, -h, w, h); g.restore();
  return [sx, sy, s];
}
function unitAt(units, id) {
  const u = (units || []).find((it) => it.id === id && !it.corpse);
  if (!u) return null;
  return { x: (u.rx != null ? u.rx : u.x) + (u.ox || 0) + 0.5, y: (u.ry != null ? u.ry : u.y) + (u.oy || 0) + 0.5 };
}

// =================================================================== ground (ใต้ไฮไลต์)
export function ground(g, fd, info, now) {
  LAST_FD = fd;
  // สะพานกำลังลดลง (ชั้น layer ไม่มี fd_eos_bridgeup แล้ว — วาดบานสะพานตกลงทับสะพานที่อบไว้)
  const be = lastFx("bridge");
  if (be && !be.up && !fd.bridgeUp) {
    const p = fxT(be, now, fx.bridge);
    if (p < 1) for (const t of be.tiles || TILES.bridge) bridgeLeaf(g, t.x, t.y, PAL[fd.night || LAST_NIGHT ? "night" : "day"], BRIDGE_UP * (1 - ease(p)));
  }
  // รอยไหม้ฟ้าผ่า
  for (const e of fxActive(fd, now)) {
    if (e.kind !== "lightning") continue;
    const p = fxT(e, now, fx.lightning), [x, y, s] = P(e.x + 0.5, e.y + 0.5);
    g.fillStyle = `rgba(14,10,8,${0.6 * (1 - p)})`; g.beginPath(); g.ellipse(x, y, s * 0.38, s * 0.15, 0, 0, TAU); g.fill();
  }
  // วงมืดใต้ปีศาจ
  for (const d of fd.daemons || []) {
    const pos = smooth(d.id, d.x, d.y, now, DAEMON_MS, pathOf(fd, "daemon_move", d.id));
    const [x, y, s] = P(pos.x + 0.5, pos.y + 0.5);
    g.fillStyle = "rgba(60,0,40,.35)"; g.beginPath(); g.ellipse(x, y, s * 0.45, s * 0.17, 0, 0, TAU); g.fill();
  }
  void info;
}

// =================================================================== items (เรียงความลึกกับตัวละคร)
export function items(list, g, fd, info, units, now, lowQ) {
  const night = !!fd.night || LAST_NIGHT;
  for (const c of fd.cars || []) {
    const path = pathOf(fd, "car_drive", c.id);
    const pos = smooth(c.id, c.x, c.y, now, CAR_MS, path);
    if (pos.moving && path) {
      const m = MOVES.get(c.id), k = Math.max(0, Math.min(1, (now - m.t0) / m.ms)), n = path.length - 1, i = Math.min(n - 1, Math.floor(ease(k) * n));
      HEADING.set(c.id, path[i + 1].x !== path[i].x ? "h" : "v");
    }
    const dir = HEADING.get(c.id) || (ROAD_SET.has(K(c.x + 2, c.y)) || ROAD_SET.has(K(c.x - 1, c.y)) ? "h" : "v");
    const cx = pos.x + 1, cy = pos.y + 1, col = CAR_COLORS[c.img] || CAR_COLORS[1];
    // ภาพรถของผู้ใช้ (ตัดพื้นหลังแล้ว — /eos/img/carN.webp) · ยังโหลดไม่เสร็จ = รถวาดด้วยโค้ด · หมากคนนั่งวาดทับด้านบน (ความลึกน้อยกว่า)
    const im = img(`/eos/img/car${c.img}.webp`);
    const flip = (HEADING.get(c.id) || "h") === "h" && path && path.length > 1 && path[path.length - 1].x > path[0].x;
    list.push({
      d: depthOf(cx, cy) - 0.6,
      f: () => {
        if (!im) { drawCar(g, cx, cy, dir, col, night, now, pos.moving); return; }
        const [sx, sy, s] = P(cx, cy + 0.55);
        const w = s * 2.35, h = w * (im.naturalHeight / im.naturalWidth);
        g.fillStyle = "rgba(0,0,0,.38)"; g.beginPath(); g.ellipse(sx, sy - s * 0.05, w * 0.48, s * 0.28, 0, 0, TAU); g.fill();
        g.save(); g.translate(sx, sy); if (flip) g.scale(-1, 1);
        g.drawImage(im, -w / 2, -h, w, h); g.restore();
        if (night) {
          const hl = P(cx + (flip ? 0.7 : -0.7), cy + 0.6, 0.25);
          glowAt(g, hl[0], hl[1], s * 0.9, "255,240,200", 0.55);
        }
      },
    });
  }
  // ช็อโก้ว่างในคอก / ข้างทาง
  for (const c of fd.chocos || []) {
    if (c.x == null || c.rider) continue;
    const bob = lowQ ? 0 : Math.abs(Math.sin(now / 420 + c.x)) * 0.04;
    const flip = hash(c.x, c.y) < 0.5;
    list.push({ d: depthOf(c.x + 0.5, c.y + 0.5), f: () => sprite(g, CHOCO_IMG, c.x + 0.5, c.y + 0.55, bob, 1.05, flip) });
  }
  // ช็อโก้ใต้คนขี่ (ตามตำแหน่งวาดของหมาก)
  for (const [pid] of Object.entries(fd.riders || {})) {
    const u = unitAt(units, pid);
    if (!u) continue;
    const bob = lowQ ? 0 : Math.abs(Math.sin(now / 260)) * 0.05;
    list.push({ d: depthOf(u.x, u.y) - 0.01, f: () => sprite(g, CHOCO_IMG, u.x, u.y + 0.08, bob, 1.1, false) });
  }
  // ปีศาจ
  for (const d of fd.daemons || []) {
    const pos = smooth(d.id, d.x, d.y, now, DAEMON_MS, pathOf(fd, "daemon_move", d.id));
    const cx = pos.x + 0.5, cy = pos.y + 0.55;
    list.push({
      d: depthOf(cx, cy),
      f: () => {
        const breathe = lowQ ? 0 : Math.sin(now / 520 + d.kind) * 0.03;
        const [sx, sy, s] = P(cx, cy, 0);
        glowAt(g, sx, sy - s * 0.6, s * 1.1, "150,30,120", 0.35);
        sprite(g, daemonImg(d.kind), cx, cy, breathe, 1.45, d.kind % 2 === 0);
        // พลังชีวิต (จุด) + เกราะ
        const top = P(cx, cy, 1.6);
        const n = d.maxHp || 5, w = s * 0.12;
        for (let i = 0; i < n; i++) { g.fillStyle = i < d.hp ? "#e0324a" : "rgba(40,10,20,.7)"; g.fillRect(top[0] - (n * w) / 2 + i * w + 1, top[1], w - 2, s * 0.06); }
        if (d.armor > 0) { g.fillStyle = "#8fb8e8"; g.fillRect(top[0] - (n * w) / 2, top[1] - s * 0.08, w * d.armor - 2, s * 0.05); }
      },
    });
  }
  void info;
}

// =================================================================== air (ทับตัวละคร)
function sfx(key, opt) { try { eosAudio().sfx(key, opt); } catch { /* ไม่มีเสียง */ } }
function bolt(g, x0, y0, x1, y1, seed, w, a) {
  const R = rng(seed * 97 + 5), n = 9, pts = [[x0, y0]];
  for (let i = 1; i < n; i++) { const k = i / n; pts.push([x0 + (x1 - x0) * k + (R() - 0.5) * 34 * (1 - k * 0.5), y0 + (y1 - y0) * k]); }
  pts.push([x1, y1]);
  const path = () => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); };
  g.lineJoin = "round";
  path(); g.strokeStyle = `rgba(150,190,255,${0.45 * a})`; g.lineWidth = w * 3.2; g.stroke();
  path(); g.strokeStyle = `rgba(245,250,255,${a})`; g.lineWidth = w; g.stroke();
}
let THUNDER_AT = 0;
function playFx(e) {
  switch (e.kind) {
    case "lightning": if (performance.now() - THUNDER_AT > 350) { THUNDER_AT = performance.now(); sfx("wx_lightning_strike", { gain: 0.9 }); } break;
    case "car_drive": sfx("car_start", { gain: 0.6 }); sfx("car_drive", { delay: 0.15 }); if (e.hits && e.hits.length) sfx("car_hit", { delay: 0.45 }); break;
    case "choco_mount": sfx("chocobo_call"); sfx("chocobo_wings", { delay: 0.2, gain: 0.7 }); break;
    case "choco_dismount": sfx("chocobo_wings", { gain: 0.7 }); break;
    case "choco_fall": sfx("chocobo_call", { gain: 0.9 }); sfx("chocobo_run", { delay: 0.3, gain: 0.6 }); break;
    case "choco_back": sfx("chocobo_call", { gain: 0.6 }); break;
    case "daemon_spawn": sfx("daemon_spawn"); sfx("daemon_growl", { delay: 0.5 }); break;
    case "daemon_move": sfx("daemon_growl", { gain: 0.6 }); break;
    case "daemon_attack": sfx("daemon_attack"); break;
    case "daemon_struck": sfx("daemon_growl", { gain: 0.5 }); break;
    case "daemon_die": sfx("daemon_die"); break;
    case "daemon_dissolve": sfx("daemon_dissolve"); sfx("day_break", { delay: 0.5, gain: 0.7 }); break;
    case "bridge": sfx("bridge_lever"); sfx("bridge_move", { delay: 0.35, gain: 0.85 }); break;
    case "dome_on": sfx("dome_on"); break;
    case "dome_off": sfx("dome_off"); break;
    case "lights": sfx("lights_off", { gain: e.off ? 0.9 : 0.5 }); break;
    case "gysahl_lure": sfx("throw_swoosh"); sfx("chocobo_call", { delay: 0.55 }); sfx("chocobo_run", { delay: 0.75, gain: 0.7 }); break;
    case "gysahl_call": sfx("gysahl_munch"); sfx("chocobo_run", { delay: 0.15, gain: 0.7 }); break;
    case "wreck_push": sfx("wreck_push"); break;
    default: break;
  }
}
// ฉากของลูกเล่นขั้น 2 (คืน true = วาดแล้ว)
function puff(g, x, y, z, p, seed, n, rgb, size) {
  for (let i = 0; i < n; i++) {
    const ang = hash(i, seed) * TAU, r = (0.15 + 0.5 * p) * (0.6 + hash(i + 7, seed) * 0.6);
    const [px, py, s] = P(x + Math.cos(ang) * r, y + Math.sin(ang) * r * 0.8, z + p * 0.3);
    g.fillStyle = `rgba(${rgb},${0.45 * (1 - p)})`; g.beginPath(); g.arc(px, py, s * size * (0.6 + p), 0, TAU); g.fill();
  }
}
function leaf(g, x, y, s, rot) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.fillStyle = "#5fbf3a"; g.beginPath(); g.ellipse(0, 0, s * 0.09, s * 0.035, 0, 0, TAU); g.fill();
  g.fillStyle = "#8fe05a"; g.beginPath(); g.ellipse(s * 0.03, -s * 0.02, s * 0.06, s * 0.025, 0.6, 0, TAU); g.fill();
  g.restore();
}
function feathers(g, from, to, p, seed) {
  if (!from || !to) return;
  for (let i = 0; i < 8; i++) {
    const k = Math.min(1, p * 1.2 + hash(i, seed) * 0.2), x = from.x + (to.x - from.x) * k + 0.5, y = from.y + (to.y - from.y) * k + 0.5;
    const [px, py, s] = P(x + (hash(i + 2, seed) - 0.5) * 0.6, y + (hash(i + 4, seed) - 0.5) * 0.6, 0.1 + hash(i + 6, seed) * 0.5);
    g.fillStyle = `rgba(255,214,90,${0.8 * (1 - p)})`; g.beginPath(); g.ellipse(px, py, s * 0.05, s * 0.018, hash(i, 9) * 3 + p * 4, 0, TAU); g.fill();
  }
}
function stage2Fx(g, e, p, now, lowQ) {
  if (e.kind === "bridge") {
    const [lx, ly, s] = P(e.x + 0.5, e.y + 0.5, 0.8);
    if (p < 0.35) glowAt(g, lx, ly, s * 0.6, "255,220,160", (1 - p / 0.35) * 0.6);
    if (!lowQ && p > 0.25) for (const t of e.tiles || []) puff(g, t.x + 0.5, t.y + 0.6, 0.05, (p - 0.25) / 0.75, e.seq + t.x, 6, "220,240,255", 0.07); // น้ำกระเซ็น
    return true;
  }
  if (e.kind === "dome_on") {
    const r = e.rect || TOWN_RECTS.insomnia, [cx, cy] = [(r[0] + r[2] + 1) / 2, (r[1] + r[3] + 1) / 2];
    const rad = 2 + p * 9, a = (1 - p) * 0.8;
    g.beginPath();
    for (let i = 0; i <= 40; i++) { const u = i / 40 * TAU, q = P(cx + Math.cos(u) * rad, cy + Math.sin(u) * rad * 0.6, 0.05); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }
    g.strokeStyle = `rgba(160,225,255,${a})`; g.lineWidth = 3; g.stroke();
    for (const t of e.gates || []) { const [gx, gy, s] = P(t.x + 0.5, t.y + 0.5, 0.5); glowAt(g, gx, gy, s * 1.1, "120,200,255", (1 - p) * 0.6); }
    return true;
  }
  if (e.kind === "dome_off") {
    if (lowQ) return true;
    const r = e.rect || TOWN_RECTS.insomnia;
    for (let i = 0; i < 26; i++) {
      const x = r[0] + hash(i, e.seq) * (r[2] - r[0] + 1), y = r[1] + hash(i + 3, e.seq) * (r[3] - r[1] + 1);
      const [px, py, s] = P(x, y, 0.5 + hash(i + 5, e.seq) * 2.6 - p * 1.2);
      g.fillStyle = `rgba(190,235,255,${0.7 * (1 - p)})`; g.beginPath(); hexPath(g, px, py, s * 0.12, 0.8); g.fill();
    }
    return true;
  }
  if (e.kind === "lights") {
    const [sx, sy, s] = P(e.x + 0.5, e.y + 0.6, 0.8);
    glowAt(g, sx, sy, s * (0.5 + p), e.off ? "255,90,60" : "120,255,150", (1 - p) * 0.7);
    if (!lowQ) for (let i = 0; i < 6; i++) { // ประกายไฟฟ้า
      const ang = hash(i, e.seq) * TAU, rr = s * 0.5 * p;
      g.fillStyle = `rgba(255,240,180,${1 - p})`; g.fillRect(sx + Math.cos(ang) * rr, sy + Math.sin(ang) * rr - s * 0.2 * p, 2, 2);
    }
    if (e.off && e.zone && TOWN_RECTS[e.zone]) { // เมืองมืดวูบ
      const r = TOWN_RECTS[e.zone];
      g.beginPath(); poly(g, [[r[0], r[1]], [r[2] + 1, r[1]], [r[2] + 1, r[3] + 1], [r[0], r[3] + 1]]);
      g.fillStyle = `rgba(0,4,16,${0.3 * Math.sin(p * Math.PI)})`; g.fill();
    }
    return true;
  }
  if (e.kind === "gysahl_lure" || e.kind === "gysahl_call") {
    const lure = e.kind === "gysahl_lure", from = lure ? e.from : e.to, at = lure ? e.at : e.to;
    if (!from || !at) return true;
    const tt = lure ? Math.min(1, p / 0.45) : 0;
    if (lure && tt < 1) { // ผักลอยโค้งไปหาเป้า + เศษใบไม้ตามทาง
      for (let i = 0; i < 4; i++) {
        const k = Math.max(0, tt - i * 0.06), x = from.x + 0.5 + (at.x - from.x) * k, y = from.y + 0.5 + (at.y - from.y) * k;
        const [px, py, s] = P(x, y, 0.6 + Math.sin(k * Math.PI) * 1.6);
        g.globalAlpha = i ? 0.35 / i : 1; leaf(g, px, py, s * (i ? 0.7 : 1.2), now / 60 + i); g.globalAlpha = 1;
      }
    } else { // ใบผักแตกกระจาย + ขนนกปลิวตามช็อโก้ที่วิ่ง
      const q = lure ? (p - 0.45) / 0.55 : p;
      const [ax, ay, s] = P(at.x + 0.5, at.y + 0.5, 0.4);
      for (let i = 0; i < 7; i++) { const ang = hash(i, e.seq) * TAU, r = s * 0.6 * q; leaf(g, ax + Math.cos(ang) * r, ay + Math.sin(ang) * r * 0.6 - s * 0.3 * q, s, ang + q * 5); }
      glowAt(g, ax, ay, s * 0.8, "150,240,110", (1 - q) * 0.5);
      if (lure) feathers(g, e.at, e.to, q, e.seq); else feathers(g, e.from, e.to, q, e.seq);
    }
    return true;
  }
  if (e.kind === "wreck_push") {
    if (!e.to) return true;
    puff(g, e.to.x + 0.5, e.to.y + 0.6, 0.05, p, e.seq, lowQ ? 4 : 9, "170,155,130", 0.1);
    if (e.from) puff(g, e.from.x + 0.5, e.from.y + 0.6, 0.05, p, e.seq + 1, lowQ ? 2 : 5, "150,140,120", 0.08);
    return true;
  }
  return false;
}
let NIGHT_WAS = null;
export function air(g, fd, info, units, now, lowQ, view) {
  for (const e of fd.fx || []) if (fx[e.kind] && fxOnce(e)) playFx(e);
  // กลางวัน ↔ กลางคืน: เสียงเปลี่ยนช่วง
  if (NIGHT_WAS !== null && NIGHT_WAS !== !!fd.night && fd.night) sfx("night_fall", { gain: 0.7 });
  NIGHT_WAS = !!fd.night;
  const W = view ? view.x1 - view.x0 : LW, H = view ? view.y1 - view.y0 : 720, X0 = view ? view.x0 : 0, Y0 = view ? view.y0 : 0;
  const kind = fd.weather && fd.weather.kind;
  let flash = 0;
  if (kind === "eos_storm") {
    g.fillStyle = fd.night ? "rgba(2,5,16,.38)" : "rgba(20,28,40,.34)"; g.fillRect(X0, Y0, W, H);
    if (!lowQ) {
      g.strokeStyle = "rgba(205,220,240,.42)"; g.lineWidth = 1; g.beginPath();
      for (let i = 0; i < 170; i++) {
        const sp = 0.85 + hash(i, 2) * 0.5, y = Y0 + ((hash(i, 1) * H + now * sp) % (H + 40)) - 20, x = X0 + ((hash(i, 3) * W - (now * sp) * 0.25) % W + W) % W;
        g.moveTo(x, y); g.lineTo(x - 5, y + 18);
      }
      g.stroke();
    }
    const slot = Math.floor(now / 7000), at = hash(slot, 9) * 5600, d = now - slot * 7000 - at;
    if (d >= 0 && d < 260) flash = Math.max(flash, (d < 70 || (d > 140 && d < 200) ? 0.2 : 0.05));
  } else if (kind === "eos_fog" && !lowQ) {
    for (let i = 0; i < 10; i++) {
      const ph = (now / (22000 + i * 1500) + hash(i, 5)) % 1;
      glowAt(g, X0 + ph * W * 1.4 - W * 0.2, Y0 + hash(i, 6) * H, H * 0.35, fd.night ? "90,105,130" : "220,226,232", 0.22);
    }
  }
  // โดมกำแพงเวท (ขึ้น = โตจากพื้น · สลาย = จางหาย)
  if (fd.dome && Array.isArray(fd.dome.rect)) drawDome(g, fd.dome.rect, domeGrow(now), 1, now, lowQ);
  else {
    const off = lastFx("dome_off");
    const p = off ? fxT(off, now, fx.dome_off) : 1;
    if (p < 1) drawDome(g, off.rect || TOWN_RECTS.insomnia, 1 + p * 0.06, 1 - p, now, lowQ);
  }
  for (const e of fxActive(fd, now)) {
    const p = fxT(e, now, fx[e.kind] || 1500);
    if (stage2Fx(g, e, p, now, lowQ)) continue;
    if (e.kind === "lightning") {
      const [x, y, s] = P(e.x + 0.5, e.y + 0.5);
      if (p < 0.12) flash = Math.max(flash, 0.4 * (1 - p / 0.12));
      const a = p < 0.5 ? 1 : Math.max(0, 1 - (p - 0.5) * 2.4);
      if (a > 0) bolt(g, x + (hash(e.seq, 4) - 0.5) * 60, Y0 - 10, x, y, e.seq, Math.max(1.6, s * 0.05), a);
      glowAt(g, x, y, s * (0.7 + p * 0.8), "200,225,255", (1 - p) * 0.9);
    } else if (e.kind === "daemon_spawn" || e.kind === "daemon_dissolve") {
      for (const t of e.list || []) {
        const [x, y, s] = P(t.x + 0.5, t.y + 0.5);
        const rise = e.kind === "daemon_spawn" ? p : 1 - p;
        g.fillStyle = e.kind === "daemon_spawn" ? `rgba(40,0,30,${0.6 * (1 - p)})` : `rgba(255,240,200,${0.6 * (1 - p)})`;
        g.fillRect(x - s * 0.25, y - s * 2 * rise, s * 0.5, s * 2 * rise);
        glowAt(g, x, y - s * 0.6, s * 1.4, e.kind === "daemon_spawn" ? "160,20,120" : "255,230,170", (1 - p) * 0.8);
      }
    } else if (e.kind === "daemon_attack") {
      for (const a of e.attacks || []) {
        const u = unitAt(units, a.target);
        if (!u) continue;
        const [x, y, s] = P(u.x, u.y, 0.6);
        g.strokeStyle = `rgba(255,60,90,${1 - p})`; g.lineWidth = Math.max(2, s * 0.05);
        for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(x - s * 0.3 + i * s * 0.1, y - s * 0.3); g.lineTo(x + s * 0.3 + i * s * 0.1, y + s * 0.2); g.stroke(); }
      }
    } else if (e.kind === "daemon_die") {
      const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 0.6);
      for (let i = 0; i < 14; i++) {
        const ang = hash(i, e.seq) * TAU, r = s * 1.2 * p;
        g.fillStyle = `rgba(120,30,110,${1 - p})`; g.beginPath(); g.arc(x + Math.cos(ang) * r, y + Math.sin(ang) * r * 0.6 - s * 0.6 * p, Math.max(1, s * 0.05), 0, TAU); g.fill();
      }
      glowAt(g, x, y, s * 1.4, "200,60,180", (1 - p) * 0.8);
    } else if (e.kind === "daemon_hit" || e.kind === "daemon_struck") {
      const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 0.7);
      glowAt(g, x, y, s * 0.8, "255,255,255", (1 - p) * 0.7);
    } else if (e.kind === "choco_mount" || e.kind === "choco_fall" || e.kind === "choco_dismount") {
      const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 0.6);
      for (let i = 0; i < 10; i++) {
        const ang = hash(i, e.seq) * TAU, r = s * 0.8 * p;
        g.save(); g.translate(x + Math.cos(ang) * r, y + Math.sin(ang) * r * 0.5 + s * 0.4 * p); g.rotate(ang + now / 200);
        g.fillStyle = `rgba(255,214,90,${1 - p})`; g.beginPath(); g.ellipse(0, 0, s * 0.06, s * 0.02, 0, 0, TAU); g.fill(); g.restore();
      }
    } else if (e.kind === "car_drive" && !lowQ) {
      for (const h of e.hits || []) {
        if (!h.from) continue;
        const [x, y, s] = P(h.from.x + 0.5, h.from.y + 0.5, 0.5);
        if (p > 0.35) glowAt(g, x, y, s * 1.0, "255,230,180", (1 - p) * 0.9);
      }
      const m = MOVES.get(e.car);
      if (m) {
        const pos = posOf(m, now);
        if (pos.moving) for (let i = 0; i < 6; i++) {
          const [x, y, s] = P(pos.x + 1 + (hash(i, e.seq) - 0.5) * 1.6, pos.y + 1 + (hash(i + 3, e.seq) - 0.5) * 1.6, 0.05);
          g.fillStyle = `rgba(200,190,170,${0.35 * (1 - p)})`; g.beginPath(); g.arc(x, y, s * (0.08 + hash(i, 9) * 0.08), 0, TAU); g.fill();
        }
      }
    }
  }
  // หมอกบางตามระยะ (aerial perspective): ด้านไกล (บนจอ) จางเป็นสีฟ้า → ใกล้กล้องใส
  if (!lowQ) {
    const gr = g.createLinearGradient(0, Y0, 0, Y0 + H * 0.55);
    gr.addColorStop(0, fd.night ? "rgba(40,60,110,.32)" : "rgba(205,222,240,.34)"); gr.addColorStop(1, "rgba(205,222,240,0)");
    g.fillStyle = gr; g.fillRect(X0, Y0, W, H * 0.55);
  }
  if (flash > 0) { g.fillStyle = `rgba(232,240,255,${flash})`; g.fillRect(X0, Y0, W, H); }
  void info;
}
