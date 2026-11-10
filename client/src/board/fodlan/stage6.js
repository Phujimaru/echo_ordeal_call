// ============================================================
//  ภาพของสนาม Eos (GRID_PLAN §8.6 — ธีม Final Fantasy XV · "ด่าน 6" ของตัวกลาง ./index.js) · กติกา server/fodlan/stage6.js · ผัง server/fodlan/map6.js
//   อารมณ์: โลกกว้างแสงอบอุ่นยามบ่าย (กลางวัน) / ฟ้าน้ำเงินเข้ม ดาว ไฟเมืองเรือง (กลางคืน — เวลาปีศาจ)
//   ธีม (อบ): ฟ้า + ภูเขาไกล + เงาตึกระฟ้าของนครหลวงหลังกระดาน · ข้างกระดาน: ต้นไม้/หิน/ทราย
//   bakeSpecial (อบใต้เส้นตาราง): ถนนยางมะตอย+เส้นจราจร · ลานเมืองหินปู · ทราย · สะพาน · คอกโชโกโบะ
//   deco: น้ำลึก (ทะเลสาบ) + คลอง Altissia
//   สิ่งกีดขวาง: ตึก (หน้าต่างติดไฟกลางคืน) · กำแพงเมือง · เสาไฟถนน · ต้นไม้ · หิน · ปั๊มน้ำมัน · อู่ซ่อมรถ
//   items: รถ 3 คัน (เหลือง/แดง/เทา — วาดด้วยโค้ด ตามสีรถในภาพของผู้ใช้) · โชโกโบะ (ภาพผู้ใช้ /eos/img/chocobo.webp) ใต้คนขี่ · ปีศาจ (/eos/img/daemonN.webp)
//   air: ฝนฟ้าคะนอง · หมอก · ฉากเหตุการณ์ (fx) + เสียง (client/src/eos/eosAudio.js)
//   ขั้น 4: รางรถไฟ + ขบวนรถไฟ · ชานชาลา · อุโมงค์ · ท่า/เรือกอนโดลา · แคมป์ · จุดตกปลา · สุสานราชวงศ์ (ส่วน "ขั้น 4" ท้ายไฟล์) · เสายึดพื้นที่ 5 แบบตามโซน (drawPillar)
//  ⚠️ ห้ามเรียกของจาก ./index ตอนโหลดไฟล์ (index import ไฟล์นี้ — วน) · ใช้ได้ในฟังก์ชันวาดเท่านั้น
// ============================================================
import { LW, P, PS, depthOf, faceVisible, gEllipse, glow, quad, rng, sceneSize } from "../boardGeo";
import { EOS_AREA, MAPS } from "../boardRules";
import { fxActive, fxOnce, fxT } from "./index";
import { eosAudio } from "../../eos/eosAudio";
import { drawVitalBar } from "../boardDraw";

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
  // ขั้น 3 (ลูกเล่นโจมตี): ถังน้ำมัน · แหล่งหินเวท · ป้อมปืนบนกำแพง · มอนสเตอร์ (วาดใน items)
  "fd_eos_barrel", "fd_eos_crystal", "fd_eos_turret", "fd_eos_mob", "fd_eos_chest",
  // ขั้น 4 (เดินทาง + เก็บของ): ชานชาลา · ปากอุโมงค์ · ท่ากอนโดลา · แคมป์ · จุดตกปลา (ช่องพิเศษ — วาดเองทั้งหมด) · สุสานราชวงศ์ (สิ่งกีดขวาง)
  "fd_eos_station", "fd_eos_tunnel", "fd_eos_dock", "fd_eos_camp", "fd_eos_fish", "fd_eos_tomb",
];
export const tall = ["fd_eos_bldg", "fd_eos_tree", "fd_eos_lamp", "fd_eos_pillar", "fd_eos_bridgeup", "fd_eos_barrier", "fd_eos_turret", "fd_eos_tomb"];
// ความยาวฉากของเหตุการณ์ (ms) — server ctx.fx
export const fx = {
  lightning: 1600, car_drive: 900, car_mount: 900, car_leave: 600, car_ram: 700, choco_mount: 900, choco_dismount: 700, choco_fall: 1100, choco_home: 1400, choco_back: 900,
  daemon_spawn: 1600, daemon_move: 1100, daemon_attack: 900, daemon_hit: 600, daemon_struck: 500, daemon_die: 1200, daemon_dissolve: 1400,
  bridge: 1600, dome_on: 1800, dome_off: 1400, lights: 900, gysahl_lure: 1300, gysahl_call: 1100, wreck_push: 700,
  barrel_boom: 1600, crystal_break: 1100, flask: 1700, turret_shot: 750, mob_move: 1100, mob_attack: 900, mob_hit: 600, mob_die: 1300,
  beast_roar: 1300, dropship_warn: 1200, dropship_land: 2000, dropship_leave: 2000,
  // PVE (2026-11-10): มอนตีเสา · เสาหลุด · ซ่อมเสา · หีบสมบัติ
  pillar_hit: 900, pillar_lost: 1600, pillar_repair: 1200, chest_spawn: 1200, chest_open: 1600,
  // PVE รอบสอง: บอส · มอนพิเศษ · พระจันทร์สีเลือด · ภารกิจ · เกราะเสา · ช่วยฟื้น · ขบวนเสบียง
  boss_warn: 1600, boss_land: 2200, boss_roar: 1500, boss_die: 2400, mob_heal: 1200, mob_shot: 700, mob_boom: 1400, blood_moon: 2600,
  quest_new: 1600, quest_step: 900, quest_done: 2000, quest_fail: 1000, pillar_ward: 1100, pillar_ward_hit: 900, revive_help: 1400,
  convoy_start: 1400, convoy_move: 1100, convoy_done: 2000, convoy_fail: 1600, score_bonus: 1800,
  // PVE รอบสาม: ท่าร่วม · พลังเสา · รังปีศาจ · ยักษ์หิน · พลเรือน · ถล่ม · คืนสุดท้าย
  combo: 1100, power_turret: 1200, power_fountain: 1000, nest_spawn: 1200, nest_burst: 1400, giant_warn: 1600, giant_step: 1600, giant_leave: 1400, giant_die: 2400,
  civ_spawn: 1200, civ_follow: 700, civ_saved: 1800, civ_lost: 1300, gauge_full: 1600, barrage: 1800, final_start: 3000, final_wave: 1400,
  // ขั้น 4 (ฉากฝั่ง client ยาวกว่าเวลาที่ server พักได้ — รถไฟวิ่งพ้นแผนที่ให้ครบขบวน)
  train_warn: 1800, train_pass: 3000, gondola: 2000, tunnel: 1500, camp_meal: 1500, fish: 2600, tomb_open: 2300, royal_drain: 1400, hunt_board: 1500, hunt_done: 1500, // 1500 = ค่าเริ่มของ fxActive (เหตุการณ์ที่ชื่อถูกทับ — p4Norm)
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
    ballast: "#948c7f", ballast2: "#6b645a", sleeper: "#4d3b2b", rail: "#3a3e44", railHi: "#cdd3db", platform: "#bdb8ad", platform2: "#8d897f", dirt: "#7a6648",
    tent: "#d2c29c", canvas2: "#a3926e",
    marble: "#ddd2bb", marble2: "#c9bb9e", joint: "rgba(70,55,35,.16)", canalHi: "#4fa3ad", dune: "rgba(150,110,60,.2)", duneHi: "rgba(255,240,205,.32)", cactus: "#5f8a45", cactus2: "#46703a",
    altWalls: ["#efe2c8", "#f2d2ae", "#e9bfa0", "#f1e3ae", "#e3d6c4"], altRoofs: ["#c7653f", "#b5562f", "#d27a4a"], shutter: "#4f7a5a", flower: ["#e0475b", "#f08cb0", "#ffd25a"],
    roofUnit: "#c3c8cf", roofUnit2: "#9aa1ab",
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
    ballast: "#403e3c", ballast2: "#2c2a29", sleeper: "#251c15", rail: "#1c1f23", railHi: "#7e8896", platform: "#57585e", platform2: "#3d3e44", dirt: "#3a3026",
    tent: "#6e6656", canvas2: "#4a4438",
    marble: "#57534c", marble2: "#4a4640", joint: "rgba(0,0,0,.22)", canalHi: "#1d4f5c", dune: "rgba(0,0,0,.25)", duneHi: "rgba(180,190,220,.14)", cactus: "#24361f", cactus2: "#1a2a18",
    altWalls: ["#6c6658", "#6e6152", "#685548", "#6c6650", "#625c54"], altRoofs: ["#5c3424", "#52301f", "#643c28"], shutter: "#2a3a30", flower: ["#6a2a34", "#6e4a5a", "#6e6040"],
    roofUnit: "#3a4252", roofUnit2: "#2c3342",
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
const MAGITEK_IMG = "/eos/img/magitek.webp";
const daemonImg = (k) => `/eos/img/daemon${((Number(k) || 1) - 1) % 4 + 1}.webp`;
export function preloadEosArt() { img(CHOCO_IMG); for (let i = 1; i <= 6; i++) img(`/eos/img/people${i}.webp`); for (let i = 1; i <= 4; i++) img(daemonImg(i)); for (let i = 1; i <= 3; i++) img(`/eos/img/car${i}.webp`); img(MAGITEK_IMG); }

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
const HEIGHT = { fd_eos_bldg: null, fd_eos_wall: 0.85, fd_eos_tree: 1.25, fd_eos_rock: 0.55, fd_eos_lamp: 1.4, fd_eos_pump: 0.7, fd_eos_garage: 0.9, fd_eos_pillar: 1.5, fd_eos_lever: 0.45, fd_eos_domecore: 0.7, fd_eos_switch: 0.8, fd_eos_barrel: 0.5, fd_eos_crystal: 0.75, fd_eos_turret: 1.25, fd_eos_tomb: 1.0 };
function hull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.slice().reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
let SHADOW_POLYS = null;
function castShadows(g, C, night) {
  const m = MAPS[EOS_AREA], tr = (m && m.terrain) || {};
  if (!SHADOW_POLYS) SHADOW_POLYS = shadowPolys(tr);
  g.save();
  g.fillStyle = night ? "rgba(0,0,12,.22)" : "rgba(20,24,10,.26)";
  g.beginPath();
  for (const pts of SHADOW_POLYS) {
    pts.forEach(([a, b], i) => { const q = P(a, b); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); });
    g.closePath();
  }
  g.fill("nonzero");
  g.restore();
  if (!SETS.solid) SETS.solid = new Set(Object.entries(tr).filter(([, v]) => v === "fd_eos_bldg" || v === "fd_eos_wall" || v === "fd_eos_garage" || v === "fd_eos_turret").map(([k]) => k));
  msFill(g, SETS.solid, night ? "#000008" : "#141808", { cols: m.cols, rows: m.rows, th: 0.3, alpha: 0.18 });
}
function shadowPolys(tr) {
  const out = [];
  for (const [k, kind] of Object.entries(tr)) {
    if (!(kind in HEIGHT)) continue;
    const [x, y] = k.split(",").map(Number);
    const bd = BUILDING.get(k) || { id: 0, h: 1.2 };
    const h = kind !== "fd_eos_bldg" ? HEIGHT[kind] : zoneAt(x, y) === "altissia" ? 0.95 + hash(bd.id, 9) * 0.3 : bd.h; // บ้าน Altissia เตี้ย + หลังคาจั่ว (drawAltHouse)
    // ต้นไม้/หิน/เสาไฟ = เงารูปทรงกลม (ช่องเล็กกว่าเต็มช่อง) · ตึก/กำแพง = กล่องเต็มช่อง
    const inset = kind === "fd_eos_bldg" || kind === "fd_eos_wall" || kind === "fd_eos_garage" || kind === "fd_eos_turret" ? 0 : kind === "fd_eos_lamp" ? 0.44 : 0.22;
    const ox = SUN.x * h, oy = SUN.y * h;
    const sq = [[x + inset, y + inset], [x + 1 - inset, y + inset], [x + 1 - inset, y + 1 - inset], [x + inset, y + 1 - inset]];
    out.push(hull([...sq, ...sq.map(([a, b]) => [a + ox, b + oy])]));
  }
  return out;
}
// ไล่แสงบนผนัง: ล่างเข้ม → บนสว่าง (หลอกตาให้มีความลึก)
function shadeFace(g, a, b, h, alpha) {
  const p0 = P(a[0], a[1], 0), p1 = P(a[0], a[1], h);
  const gr = g.createLinearGradient(p0[0], p0[1], p1[0], p1[1]);
  gr.addColorStop(0, `rgba(0,0,0,${alpha})`); gr.addColorStop(0.5, "rgba(0,0,0,0)"); gr.addColorStop(1, `rgba(255,255,255,${alpha * 0.35})`);
  poly(g, [[a[0], a[1], 0], [b[0], b[1], 0], [b[0], b[1], h], [a[0], a[1], h]]);
  g.fillStyle = gr; g.fill();
}
// กล่องบนกระดาน: ผนังที่หันหากล้องจริง (faceVisible — ถูกทั้งมุมหมุนเฉียงและกล้องมีมุมมองลึก · เดิมเทียบความลึกแบบง่าย = ผนังทะลุเมื่อหมุน)
//  skip(nx, ny) → true = ไม่วาดผนังด้านนั้น (ผนังด้านในของตึกหลายช่อง) · สีตามทิศผนัง (แกน x = side1 · แกน y = side2) ไม่สลับตามลำดับ
const SIDES = [[0, -1], [1, 0], [0, 1], [-1, 0]];
function box(g, x0, y0, x1, y1, h, top, side1, side2, z0 = 0, skip = null) {
  const c = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const vis = [];
  for (let i = 0; i < 4; i++) {
    const a = c[i], b = c[(i + 1) % 4], [nx, ny] = SIDES[i];
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    if (!faceVisible(nx, ny, mx, my) || (skip && skip(nx, ny))) continue;
    vis.push({ a, b, nx, ny });
    poly(g, [[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], h], [a[0], a[1], h]]);
    g.fillStyle = nx ? side1 : side2; g.fill();
    if (h > 0.3 && !z0) shadeFace(g, a, b, h, 0.28);
  }
  poly(g, c.map(([x, y]) => [x, y, h])); g.fillStyle = top; g.fill();
  if (h > 0.3) {
    // ขอบหลังคารับแสง — เฉพาะขอบนอก (ตึกหลายช่องไม่มีเส้นแบ่งกลางหลังคา)
    g.strokeStyle = "rgba(255,255,255,.18)"; g.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const [nx, ny] = SIDES[i];
      if (skip && skip(nx, ny)) continue;
      const a = P(c[i][0], c[i][1], h), b = P(c[(i + 1) % 4][0], c[(i + 1) % 4][1], h);
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    }
  }
  return vis;
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
      for (let i = 0; i < 320; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + R() * 0.6})`; g.fillRect(VX0 + R() * VW, VY0 + R() * (bY - VY0 - 40), 1.2, 1.2); }
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
    // 8 ระดับสี วาดทีละระดับ (fill เดียวต่อระดับ — เร็วพอวาดสดตอนหมุน)
    const GB = 8;
    for (let b = 0; b < GB; b++) {
      g.beginPath();
      for (const t of GRASS_BUCKETS[b]) {
        const a = P(t.x - 0.02, t.y - 0.02), b1 = P(t.x + 1.02, t.y - 0.02), c2 = P(t.x + 1.02, t.y + 1.02), d = P(t.x - 0.02, t.y + 1.02);
        g.moveTo(a[0], a[1]); g.lineTo(b1[0], b1[1]); g.lineTo(c2[0], c2[1]); g.lineTo(d[0], d[1]); g.closePath();
      }
      g.fillStyle = mix(C.grassA, C.grassB, (b + 0.5) / GB); g.fill();
    }
    const dim = { cols: info.cols, rows: info.rows };
    const sand = setFor("sand", T.sand), forest = setFor("forest", T.forest), wet = setFor("wet", [...T.shallow, ...T.water]), deep = setFor("deep", T.water), road = setFor("road", T.road);
    // ทราย: ขอบนอกจาง (ทรายปนหญ้า) → เนื้อทราย
    msFill(g, sand, C.sandEdge, { ...dim, jitter: 0.45, th: 0.32, seed: 1, alpha: 0.75 });
    msFill(g, sand, C.sand, { ...dim, jitter: 0.45, th: 0.5, seed: 1 });
    // เนินทราย: ผืนสีเข้มกว่าตาม noise (ทะเลทรายไม่เป็นสีเดียวทั้งผืน)
    msFill(g, setFor("dune", T.sand.filter((t) => vnoise(t.x * 0.34 + 4, t.y * 0.34 + 1) > 0.56)), C.sand2, { ...dim, jitter: 0.55, th: 0.5, seed: 8, alpha: 0.3 });
    // พื้นป่า: ดินชื้นเข้ม (ขอบคด)
    msFill(g, forest, C.forestFloor2, { ...dim, jitter: 0.4, th: 0.36, seed: 2 });
    msFill(g, forest, C.forestFloor, { ...dim, jitter: 0.4, th: 0.55, seed: 2 });
    // ลานเมือง (เมืองเป็นเส้นตรงได้ — หินปูพื้น)
    //  (เดิมสลับสีทีละช่องแบบตาหมากรุก → ดูเป็นกระดานหมากรุก) ตอนนี้: สีเดียวไล่อ่อนเข้มเล็กน้อยต่อช่อง + รอยต่อแผ่นหินแบบก่ออิฐ
    //  Altissia = หินอ่อนครีมอุ่น · เมืองอื่น = หินเทา
    for (const t of T.plaza) {
      const alt = zoneAt(t.x, t.y) === "altissia";
      quad(g, t.x, t.y, -0.012); g.fillStyle = mix(alt ? C.marble : C.plaza, alt ? C.marble2 : C.plaza2, hash(t.x * 3 + 1, t.y * 5 + 2) * 0.3); g.fill();
    }
    if (!FAST) {
      g.strokeStyle = C.joint; g.lineWidth = 1; g.beginPath();
      const ln = (x0, y0, x1, y1) => { const a = P(x0, y0), b = P(x1, y1); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); };
      for (const t of T.plaza) {
        ln(t.x, t.y + 0.5, t.x + 1, t.y + 0.5);
        ln(t.x + 0.5, t.y, t.x + 0.5, t.y + 0.5);
        ln(t.x + 0.25, t.y + 0.5, t.x + 0.25, t.y + 1); ln(t.x + 0.75, t.y + 0.5, t.x + 0.75, t.y + 1);
      }
      g.stroke();
    }
    // น้ำ: ชายฝั่งทราย → น้ำตื้น → น้ำลึก (ขอบคดตาม noise)
    msFill(g, wet, C.shore, { ...dim, jitter: 0.4, th: 0.28, seed: 3 });
    msFill(g, wet, C.bank, { ...dim, jitter: 0.4, th: 0.5, seed: 3 });                       // ผนังตลิ่ง (มองเห็นฝั่งไกล)
    msFill(g, wet, C.shallow, { ...dim, jitter: 0.4, th: 0.5, seed: 3, oy: 0.16 });            // ผิวน้ำต่ำกว่าพื้น
    msFill(g, deep, C.water, { ...dim, jitter: 0.35, th: 0.5, seed: 4, oy: 0.16 });
    msFill(g, deep, C.water2, { ...dim, jitter: 0.3, th: 0.78, seed: 5, alpha: 0.6, oy: 0.16 });
    // คลองเมืองน้ำ: ขอบหิน
    //  ผืนต่อเนื่อง (เดิมวาดทีละช่อง → เห็นรอยต่อเป็นตาราง): ขอบหิน → ผนังคลอง → ผิวน้ำต่ำกว่าขอบ → แสงสะท้อนกลางคลอง
    const canal = setFor("canalUnder", [...T.canal, ...T.bridge]); // สะพาน Altissia พาดคลอง → คลองต่อใต้สะพาน
    msFill(g, canal, C.curb, { ...dim, th: 0.36 });
    msFill(g, canal, C.bank, { ...dim, th: 0.45 });
    msFill(g, canal, C.canal, { ...dim, th: 0.5, oy: 0.08 });
    msFill(g, canal, C.canalHi, { ...dim, jitter: 0.35, th: 0.8, seed: 7, alpha: 0.5, oy: 0.08 });
    // เงาทอดตามทิศแสง (สิ่งกีดขวางที่สูง) + เงามืดรอบฐานตึก/กำแพง (ambient occlusion)
    castShadows(g, C, c.night);
    // ถนน: ไหล่ทางดิน → ยางมะตอย (ขอบตรง เลี้ยวลบมุม 45°) → เส้นขอบถนน
    msFill(g, road, C.shoulder, { ...dim, th: 0.42 });
    msFill(g, road, C.roadLine, { ...dim, th: 0.5 });   // เส้นขอบถนนสีขาว
    msFill(g, road, C.road, { ...dim, th: 0.57 });
    // รอยล้อ/คราบน้ำมันบนถนน
    if (!FAST) for (const t of T.road) {
      const R = rng(t.x * 53 + t.y * 19);
      if (R() < 0.35) { const [px, py, s] = P(t.x + 0.2 + R() * 0.6, t.y + 0.2 + R() * 0.6); g.fillStyle = C.roadStain; g.beginPath(); g.ellipse(px, py, s * (0.1 + R() * 0.12), s * 0.04, R() * 3, 0, TAU); g.fill(); }
    }
    // สะพาน (ไม้บนน้ำ) · คอกโชโกโบะ (ฟาง)
    for (const t of T.bridge) {
      quad(g, t.x + 0.08, t.y - 0.02, 0.06); g.fillStyle = C.bridge; g.fill();
      g.strokeStyle = "rgba(0,0,0,.32)"; g.lineWidth = 1;
      for (let i = 1; i < 5; i++) { const a = P(t.x + 0.1, t.y + i / 5, 0.06), b = P(t.x + 0.9, t.y + i / 5, 0.06); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    }
    msFill(g, setFor("stable", T.stable), C.hay, { cols: info.cols, rows: info.rows, jitter: 0.3, th: 0.45, seed: 6 });
    // ขั้น 4: รางรถไฟ · ชานชาลา · สะพานท่าเรือ/ท่าตกปลา · ลานแคมป์ · หน้าอุโมงค์
    bakeP4(g, C, c.night);
  },
  // เส้นตาราง (boardDraw เรียกแทนตารางเต็มผืน): ขีดเฉพาะรอยต่อระหว่างช่องพื้นที่เดินได้ — ไม่ขีดทับน้ำ/คลอง/ตึก/กำแพง (เดิมน้ำเป็นตารางสี่เหลี่ยม)
  //  รอยต่อที่ติดทราย = จางครึ่งหนึ่ง (ทรายสีอ่อน เส้นเดิมเด่นเกิน)
  grid(c) {
    const { g, C, info } = c;
    if (info.area !== EOS_AREA) return false;
    const segs = gridSegs(info.cols, info.rows);
    g.strokeStyle = C.grid; g.lineWidth = 1;
    for (const [list, a] of [[segs.norm, 1], [segs.soft, 0.5]]) {
      g.globalAlpha = a; g.beginPath();
      for (const [x0, y0, x1, y1] of list) { const p = P(x0, y0), q = P(x1, y1); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); }
      g.stroke();
    }
    g.globalAlpha = 1;
    return true;
  },
  // ของชิ้นเล็กตามรอยต่อ (อบ — หลังเส้นตาราง): กก ริมน้ำ · ก้อนหินริมทราย · ดอกไม้/หญ้าในทุ่ง · พุ่มไม้ใต้ร่มป่า
  deco(c) {
    const { g, C, info } = c;
    if (info.area !== EOS_AREA) return;
    const T = TILES, isW = (x, y) => WATER_SET.has(K(x, y));
    const lite = false; // ผู้ใช้สั่ง "texture หาย" — วาดรายละเอียดครบแม้กล้องกำลังเคลื่อน
    // ประกายบนผิวน้ำ (ทะเลสาบ/ทะเล + คลอง)
    g.strokeStyle = C.foam; g.lineWidth = 1;
    for (const t of [...T.water, ...T.canal]) {
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
    if (!lite) for (const t of T.sand) {
      const R = rng(t.x * 91 + t.y * 13);
      if (R() < 0.3) { const [px, py, s] = P(t.x + R(), t.y + R()); g.fillStyle = C.pebble; g.beginPath(); g.ellipse(px, py, s * 0.06, s * 0.035, 0, 0, TAU); g.fill(); }
      if (R() < 0.25) { const [px, py, s] = P(t.x + R(), t.y + R()); g.strokeStyle = C.dryGrass; g.lineWidth = 1; for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(px, py); g.lineTo(px + k * s * 0.05, py - s * 0.12); g.stroke(); } }
    }
    // ลอนทราย (ลมพัดทางเดียวกันทั้งทะเลทราย) + กระบองเพชรต้นเล็ก (เฉพาะช่องว่าง ไม่ติดถนน)
    if (!lite) {
      for (const t of T.sand) {
        const R = rng(t.x * 61 + t.y * 43);
        if (R() < 0.55) {
          const x = t.x + R() * 0.3, y = t.y + 0.15 + R() * 0.7, w = 0.6 + R() * 0.35;
          const a = P(x, y), m = P(x + w * 0.5, y - 0.06), b = P(x + w, y + 0.02);
          g.strokeStyle = C.dune; g.lineWidth = 1.2; g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(m[0], m[1], b[0], b[1]); g.stroke();
          g.strokeStyle = C.duneHi; g.lineWidth = 1; g.beginPath(); g.moveTo(a[0], a[1] - 1.5); g.quadraticCurveTo(m[0], m[1] - 1.5, b[0], b[1] - 1.5); g.stroke();
        }
        if (R() < 0.11 && !STATIC_TR[K(t.x, t.y)] && ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => ROAD_SET.has(K(t.x + dx, t.y + dy)))) {
          const [px, py, s] = P(t.x + 0.3 + R() * 0.4, t.y + 0.35 + R() * 0.4);
          cactusShape(g, px, py, s * (0.75 + R() * 0.4), C, R());
        }
      }
    }
    // ทุ่งหญ้า: ดอกไม้/กอหญ้า (เว้นถนน/เมือง)
    if (!lite) for (const t of T.grass) {
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
const STATIC_TR = (MAPS[EOS_AREA] && MAPS[EOS_AREA].terrain) || {}; // สิ่งกีดขวางคงที่ของผัง (หาช่องข้างเคียงของกำแพง/อู่)
// หญ้าทั้งกระดาน (ทุกช่อง — พื้นอื่นทับทีหลัง) แบ่ง 8 ระดับสีตาม noise ความถี่ต่ำ (คำนวณครั้งเดียว)
const GRASS_BUCKETS = (() => {
  const m = MAPS[EOS_AREA], out = Array.from({ length: 8 }, () => []);
  if (!m) return out;
  for (let y = 0; y < m.rows; y++) for (let x = 0; x < m.cols; x++) {
    const v = Math.min(0.999, vnoise(x * 0.23, y * 0.23) * 0.8 + vnoise(x * 0.61 + 9, y * 0.61 + 3) * 0.35);
    out[Math.floor(v * 8)].push({ x, y });
  }
  return out;
})();
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
// รูปทรงคำนวณครั้งเดียวต่อชุดค่า (พิกัดกระดาน) แล้วเก็บไว้ — วาดแต่ละเฟรมแค่ฉายจุด (หมุนกล้องอิสระวาดสดทุกเฟรม — ผู้ใช้สั่ง "ภาพแตก/กระตุก")
const MS_CACHE = new WeakMap();
function msPolys(set, jitter, th, seed, cols, rows, ox, oy) {
  let per = MS_CACHE.get(set);
  if (!per) { per = new Map(); MS_CACHE.set(set, per); }
  const key = `${jitter}|${th}|${seed}|${cols}x${rows}|${ox}|${oy}`;
  if (per.has(key)) return per.get(key);
  const val = (x, y) => {
    const cx = Math.max(0, Math.min(cols - 1, x)), cy = Math.max(0, Math.min(rows - 1, y));
    const inside = set.has(K(cx, cy)), n = jitter ? vnoise(x * 0.7 + seed, y * 0.7 + seed * 2) * jitter : 0;
    return inside ? 1 - n : n;
  };
  const polys = [];
  for (let y = -1; y < rows; y++) for (let x = -1; x < cols; x++) {
    const c = [[x, y, val(x, y)], [x + 1, y, val(x + 1, y)], [x + 1, y + 1, val(x + 1, y + 1)], [x, y + 1, val(x, y + 1)]];
    if (c.every((q) => q[2] < th)) continue;
    const pts = [];
    for (let i = 0; i < 4; i++) {
      const p0 = c[i], p1 = c[(i + 1) % 4];
      if (p0[2] >= th) pts.push([p0[0], p0[1]]);
      if ((p0[2] >= th) !== (p1[2] >= th)) { const t = (th - p0[2]) / (p1[2] - p0[2]); pts.push([p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t]); }
    }
    polys.push(pts.map(([px, py]) => [Math.max(0, Math.min(cols, px + 0.5 + ox)), Math.max(0, Math.min(rows, py + 0.5 + oy))]));
  }
  per.set(key, polys);
  return polys;
}
function msFill(g, set, color, { jitter = 0, th = 0.5, seed = 0, cols = 32, rows = 32, alpha = 1, ox = 0, oy = 0 } = {}) {
  if (!set.size) return;
  const polys = msPolys(set, jitter, th, seed, cols, rows, ox, oy);
  g.globalAlpha = alpha;
  g.fillStyle = color; g.strokeStyle = color; g.lineWidth = 1;
  g.beginPath();
  for (const pts of polys) {
    pts.forEach(([px, py], i) => { const q = P(px, py); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); });
    g.closePath();
  }
  g.fill(); if (!FAST && alpha >= 1) g.stroke(); // เส้นบางสีเดียวกันปิดรอยต่อระหว่างเซลล์ (ข้ามระหว่างหมุน) · ชั้นโปร่งแสงไม่ขีด — เส้นซ้อนกันเห็นเป็นตาราง
  g.globalAlpha = 1;
}
// ระหว่างหมุนกล้องอิสระ (วาดสดทุกเฟรม): ข้ามรายละเอียดเล็ก — BoardCanvas ตั้งผ่าน setEosFast
let FAST = false;
export function setEosFast(b) { FAST = !!b; }
// ชุดช่องคงที่ (สร้างครั้งเดียว — msFill แคชรูปทรงตามชุด)
const SETS = {};
const setFor = (name, list) => (SETS[name] ||= new Set(list.map((t) => K(t.x, t.y))));

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
// กระบองเพชรต้นเล็ก (ลำต้น + แขน 1–2 ข้าง · ด้านเงาเข้ม)
function cactusShape(g, x, y, s, C, r = 0.5) {
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(x + s * 0.05, y, s * 0.14, s * 0.045, 0, 0, TAU); g.fill();
  g.lineCap = "round";
  const stem = (x0, y0, x1, y1, w) => {
    g.strokeStyle = C.cactus2; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.strokeStyle = C.cactus; g.lineWidth = w * 0.55; g.beginPath(); g.moveTo(x0 - w * 0.15, y0); g.lineTo(x1 - w * 0.15, y1); g.stroke();
  };
  const w = Math.max(2, s * 0.085), top = y - s * 0.42;
  stem(x, y, x, top, w);
  const arm = (dir, h0, h1) => { const ay = y - s * h0, ex = x + dir * s * 0.12; stem(x, ay, ex, ay, w * 0.75); stem(ex, ay, ex, y - s * h1, w * 0.75); };
  arm(r < 0.5 ? -1 : 1, 0.2, 0.33);
  if (r > 0.3) arm(r < 0.5 ? 1 : -1, 0.14, 0.24);
  g.lineCap = "butt";
}
// ส่วนเส้นตาราง (สร้างครั้งเดียว): norm = รอยต่อพื้นทั่วไป · soft = ติดทราย · ไม่มีเส้นถ้าช่องใดช่องหนึ่งเป็นน้ำ/คลอง/ตึก/กำแพง/อู่/ป้อม
let GRID_SEGS = null;
function gridSegs(cols, rows) {
  if (GRID_SEGS) return GRID_SEGS;
  const BLOCK = new Set(["fd_eos_bldg", "fd_eos_wall", "fd_eos_garage", "fd_eos_turret"]);
  const open = (x, y) => x >= 0 && y >= 0 && x < cols && y < rows && !WATER_SET.has(K(x, y)) && !BLOCK.has(STATIC_TR[K(x, y)]);
  const sand = setFor("sand", TILES.sand), out = { norm: [], soft: [] };
  const push = (a, b, seg) => ((sand.has(a) || sand.has(b)) ? out.soft : out.norm).push(seg);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (!open(x, y)) continue;
    if (open(x + 1, y)) push(K(x, y), K(x + 1, y), [x + 1, y, x + 1, y + 1]);
    if (open(x, y + 1)) push(K(x, y), K(x, y + 1), [x, y + 1, x + 1, y + 1]);
  }
  GRID_SEGS = out;
  return out;
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
// =================================================================== เสายึดพื้นที่ 5 ต้น — แบบเฉพาะของแต่ละพื้นที่ (ผู้ใช้สั่ง 2026-11-09 "ออกแบบเสาใหม่ สวยกว่าเดิม มีเอกลักษณ์ของแต่ละพื้นที่")
//  insomnia = เสาโอเบลิสก์หินดำขอบเงิน + คริสตัลหลวงลอยหมุน · hammerhead = เสาเหล็กโครงถัก + ป้ายนีออน + ไฟหมุนบนยอด
//  duscae = หินตั้งโบราณ มอส อักษรรูนเรือง หินลอยวน · lake (Cleigne) = ศาลน้ำ อ่างหิน น้ำไหลจากชามบนยอด ดอกบัว
//  altissia = เสาหินอ่อน Accordo หัวเสาทอง กระถางไฟ + อ่างน้ำพุ
//  เจ้าของ = สีฝ่ายบนไฟ/อักษร/คริสตัลของเสา + มงกุฎลอยสีฝ่าย + วงสีบนพื้น · ไม่มีเจ้าของ = สีกลางของพื้นที่ ไม่มีมงกุฎ
//  พิธียึด (pl.ch — ร่าย 2 ครั้ง): ครั้งแรกแล้ว = วงความคืบหน้าครึ่งวงสีคนร่าย + วงประหมุน + ประกายลอยขึ้น
const PILLAR_ZONE = { "19,3": "insomnia", "21,27": "hammerhead", "23,15": "duscae", "11,17": "lake", "3,27": "altissia" };
const PILLAR_NEUTRAL = { insomnia: "#9fd8ff", hammerhead: "#ff8a3c", duscae: "#7fe0c0", lake: "#8fe3ff", altissia: "#ffe0a0" };
const hex6 = (c, fb) => (/^#[0-9a-f]{6}$/i.test(String(c || "")) ? c : fb);
const shadeCol = (hex, k) => (k >= 0 ? mix(hex, "#ffffff", k) : mix(hex, "#000000", -k));
const faceLit = (nx, ny) => -(nx * 0.85 + ny * 0.52); // แสงจากตะวันตกเฉียงเหนือ (เงาทอดไป +x +y)
const sqPts = (cx, cy, h) => [[cx - h, cy - h], [cx + h, cy - h], [cx + h, cy + h], [cx - h, cy + h]];
const regPoly = (cx, cy, r, n, rot = 0) => Array.from({ length: n }, (_, i) => [cx + Math.cos(rot + i / n * TAU) * r, cy + Math.sin(rot + i / n * TAU) * r]);
// แท่งเหลี่ยมเรียว: ฐาน (z0) → ยอด (z1) จุดเท่ากัน เรียงตามแบบ box() (มุมเพิ่ม) · วาดเฉพาะด้านที่หันกล้อง · สีตามทิศแสง
function frustum(g, base, z0, top, z1, col, topCol = null, edge = null) {
  const n = base.length, faces = [];
  for (let i = 0; i < n; i++) {
    const a = base[i], b = base[(i + 1) % n], ex = b[0] - a[0], ey = b[1] - a[1], L = Math.hypot(ex, ey) || 1, nx = ey / L, ny = -ex / L;
    if (!faceVisible(nx, ny, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) continue;
    const lit = faceLit(nx, ny), ta = top[i], tb = top[(i + 1) % n];
    poly(g, [[a[0], a[1], z0], [b[0], b[1], z0], [tb[0], tb[1], z1], [ta[0], ta[1], z1]]);
    g.fillStyle = shadeCol(col, lit > 0 ? lit * 0.22 : lit * 0.38); g.fill();
    if (edge) { g.strokeStyle = edge; g.lineWidth = 1; g.stroke(); }
    faces.push({ a, b, ta, tb, nx, ny });
  }
  if (topCol) { poly(g, top.map(([x, y]) => [x, y, z1])); g.fillStyle = topCol; g.fill(); if (edge) { g.strokeStyle = edge; g.lineWidth = 1; g.stroke(); } }
  return faces;
}
// ทรงกลม/กรวยตัด (รัศมี r0 ที่ z0 → r1 ที่ z1) — เงาข้าง = เปลือกนูนของวงบน/ล่างที่ฉายจริง (ถูกทุกมุมกล้อง/ความเอียง) · col = { body, dark, hi }
function solidRound(g, cx, cy, r0, z0, r1, z1, col, topCol = null, n = 16) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, p = P(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, z0), q = P(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, z1);
    pts.push([p[0], p[1]], [q[0], q[1]]);
  }
  const h = hull(pts);
  let lo = Infinity, hi = -Infinity;
  for (const [x] of h) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
  const gr = g.createLinearGradient(lo, 0, hi + 0.01, 0);
  gr.addColorStop(0, col.dark); gr.addColorStop(0.28, col.body); gr.addColorStop(0.42, col.hi); gr.addColorStop(0.7, col.body); gr.addColorStop(1, col.dark);
  g.beginPath(); h.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = gr; g.fill();
  if (topCol) { gEllipse(g, cx, cy, r1, z1, n + 4); g.fillStyle = topCol; g.fill(); }
}
function arcPath(g, cx, cy, r, z, a0, a1, n = 24) {
  g.beginPath();
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n, p = P(cx + Math.cos(a) * r, cy + Math.sin(a) * r, z); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
}
// คริสตัลแปดหน้าหมุนรอบแกนตั้ง (วาดเฉพาะหน้าที่หันกล้อง · หน้าบนสว่างกว่า)
function crystal(g, cx, cy, zc, r, up, down, rot, col, night) {
  const eq = [0, 1, 2, 3].map((i) => [cx + Math.cos(rot + i * Math.PI / 2) * r, cy + Math.sin(rot + i * Math.PI / 2) * r]);
  const c = P(cx, cy, zc);
  glowAt(g, c[0], c[1], c[2] * (night ? 1.5 : 1.05), hexRgb(col), night ? 0.7 : 0.45);
  const faces = [];
  for (let i = 0; i < 4; i++) {
    const a = eq[i], b = eq[(i + 1) % 4], mx = (a[0] + b[0]) / 2 - cx, my = (a[1] + b[1]) / 2 - cy;
    if (!faceVisible(mx, my, cx + mx, cy + my)) continue;
    const lit = faceLit(mx / r, my / r);
    faces.push([[a[0], a[1], zc], [b[0], b[1], zc], [cx, cy, zc + up], shadeCol(col, 0.25 + Math.max(0, lit) * 0.3)]);
    faces.push([[a[0], a[1], zc], [b[0], b[1], zc], [cx, cy, zc - down], shadeCol(col, -0.18 + Math.max(0, lit) * 0.2)]);
  }
  g.globalAlpha *= 0.94;
  for (const [a, b, t, fill] of faces) { poly(g, [a, b, t]); g.fillStyle = fill; g.fill(); g.strokeStyle = "rgba(255,255,255,.45)"; g.lineWidth = 1; g.stroke(); }
  g.globalAlpha /= 0.94;
  const tp = P(cx, cy, zc + up * 0.8);
  g.fillStyle = "rgba(255,255,255,.85)"; g.beginPath(); g.arc(tp[0] - c[2] * 0.02, tp[1], Math.max(1, c[2] * 0.018), 0, TAU); g.fill();
}
// ฐานร่วม: วงสีเจ้าของ · พิธียึดที่กำลังร่าย (ความคืบหน้าครึ่งวง — ร่ายแล้ว 1 ใน 2 ครั้ง)
function pillarGround(g, pl, cx, cy, night, now) {
  const own = pl && pl.color ? hex6(pl.color, "#ffffff") : null, ch = pl && pl.ch;
  if (own) {
    gEllipse(g, cx, cy, 0.52, 0.012, 32); g.strokeStyle = hexA(own, 0.3); g.lineWidth = 7; g.stroke();
    g.strokeStyle = own; g.lineWidth = 2.2; g.stroke();
  } else { gEllipse(g, cx, cy, 0.52, 0.012, 32); g.strokeStyle = night ? "rgba(160,180,210,.22)" : "rgba(40,40,30,.22)"; g.lineWidth = 1.5; g.stroke(); }
  if (!ch) return;
  const col = hex6(ch.color, "#ffffff"), a0 = -Math.PI / 2, grow = (now / 1500) % 1;
  g.lineCap = "round";
  arcPath(g, cx, cy, 0.64, 0.02, 0, TAU, 40); g.strokeStyle = hexA(col, 0.22); g.lineWidth = 5; g.stroke();
  arcPath(g, cx, cy, 0.64, 0.02, a0, a0 + Math.PI, 24); g.strokeStyle = hexA(col, 0.35); g.lineWidth = 9; g.stroke();
  g.strokeStyle = col; g.lineWidth = 4; g.stroke();
  arcPath(g, cx, cy, 0.64, 0.02, a0 + Math.PI, a0 + Math.PI + Math.PI * 0.35 * grow, 10); g.strokeStyle = hexA(col, 0.7 * (1 - grow)); g.lineWidth = 4; g.stroke();
  g.lineCap = "butt";
  g.strokeStyle = hexA(col, 0.75); g.lineWidth = 1.6; g.setLineDash([5, 6]); g.lineDashOffset = -now / 45;
  gEllipse(g, cx, cy, 0.86 + 0.04 * Math.sin(now / 400), 0.04, 36); g.stroke(); g.setLineDash([]); g.lineDashOffset = 0;
  const c = P(cx, cy, 0.4);
  glowAt(g, c[0], c[1], c[2] * 1.3, hexRgb(col), 0.3 + 0.12 * Math.sin(now / 220));
  if (!FAST) for (let i = 0; i < 7; i++) { // ประกายลอยขึ้นรอบเสา
    const k = ((now / 1800) + i / 7) % 1, a = i * 2.4 + now / 2000, q = P(cx + Math.cos(a) * 0.55, cy + Math.sin(a) * 0.55, k * 1.6);
    g.fillStyle = hexA(col, 0.9 * (1 - k)); g.beginPath(); g.arc(q[0], q[1], Math.max(1, q[2] * 0.025), 0, TAU); g.fill();
  }
}
const hexA = (h, a) => `rgba(${hexRgb(h)},${a})`;
const tintA = (h, k, a) => { const [r, gg, b] = hexRgb(h).split(",").map(Number), m = (v) => Math.round(v + (255 - v) * k); return `rgba(${m(r)},${m(gg)},${m(b)},${a})`; };
// มงกุฎลอยสีเจ้าของ (มองจากทุกมุม) + ลำแสงขึ้นฟ้ายามค่ำ
function pillarCrown(g, own, cx, cy, z, now, night) {
  if (!own) return;
  const col = hex6(own, "#ffffff"), bob = Math.sin(now / 900 + cx) * 0.03, zc = z + bob, c = P(cx, cy, zc + 0.05);
  if (night && !FAST) {
    const top = P(cx, cy, zc + 3), w0 = c[2] * 0.09, w1 = c[2] * 0.22, gr = g.createLinearGradient(c[0], c[1], top[0], top[1]);
    gr.addColorStop(0, hexA(col, 0.35)); gr.addColorStop(1, hexA(col, 0));
    g.fillStyle = gr; g.beginPath(); g.moveTo(c[0] - w0, c[1]); g.lineTo(top[0] - w1, top[1]); g.lineTo(top[0] + w1, top[1]); g.lineTo(c[0] + w0, c[1]); g.closePath(); g.fill();
  }
  glowAt(g, c[0], c[1], c[2] * 0.75, hexRgb(col), night ? 0.8 : 0.55);
  const n = 6, r = 0.15, rot = now / 2600, sp = [];
  for (let i = 0; i < n; i++) {
    const a = rot + i / n * TAU;
    sp.push({ d: depthOf(cx + Math.cos(a) * r, cy + Math.sin(a) * r), a });
  }
  sp.sort((p, q) => p.d - q.d);
  gEllipse(g, cx, cy, r, zc, 24); g.strokeStyle = shadeCol(col, -0.3); g.lineWidth = 4; g.stroke();
  for (const { a } of sp) {
    const b0 = P(cx + Math.cos(a - 0.3) * r, cy + Math.sin(a - 0.3) * r, zc), b1 = P(cx + Math.cos(a + 0.3) * r, cy + Math.sin(a + 0.3) * r, zc), t = P(cx + Math.cos(a) * r * 1.08, cy + Math.sin(a) * r * 1.08, zc + 0.14);
    g.fillStyle = shadeCol(col, 0.15); g.beginPath(); g.moveTo(b0[0], b0[1]); g.lineTo(t[0], t[1]); g.lineTo(b1[0], b1[1]); g.closePath(); g.fill();
    g.fillStyle = "rgba(255,255,255,.9)"; g.beginPath(); g.arc(t[0], t[1], Math.max(1, t[2] * 0.018), 0, TAU); g.fill();
  }
  gEllipse(g, cx, cy, r, zc, 24); g.strokeStyle = col; g.lineWidth = 2; g.stroke();
}
// น้ำไหลเป็นสาย (ชามบนยอด → อ่าง / หัวพ่นน้ำพุ) · a0/a1 = รัศมีต้น/ปลาย
function waterArc(g, cx, cy, a, r0, z0, rc, zc, r1, z1, now, night) {
  const p0 = P(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, z0), pc = P(cx + Math.cos(a) * rc, cy + Math.sin(a) * rc, zc), p1 = P(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, z1), s = p0[2];
  g.beginPath(); g.moveTo(p0[0], p0[1]); g.quadraticCurveTo(pc[0], pc[1], p1[0], p1[1]);
  g.strokeStyle = night ? "rgba(150,200,240,.45)" : "rgba(200,238,255,.6)"; g.lineWidth = Math.max(1.5, s * 0.03); g.stroke();
  if (!FAST) { g.setLineDash([Math.max(2, s * 0.05), Math.max(2, s * 0.07)]); g.lineDashOffset = -now / 22; g.strokeStyle = "rgba(255,255,255,.75)"; g.lineWidth = Math.max(1, s * 0.012); g.stroke(); g.setLineDash([]); g.lineDashOffset = 0; }
  g.fillStyle = "rgba(235,250,255,.55)"; g.beginPath(); g.ellipse(p1[0], p1[1], s * 0.04, s * 0.015, 0, 0, TAU); g.fill();
}
const frontOf = (cx, cy, a, r) => depthOf(cx + Math.cos(a) * r, cy + Math.sin(a) * r) > depthOf(cx, cy);

// ---------- Insomnia: โอเบลิสก์หินดำ 2 ชั้นขอบเงิน + คริสตัลหลวง ----------
function pillarInsomnia(g, cx, cy, acc, night, now) {
  const blk = night ? "#14171c" : "#1f242b", trim = night ? "#8994a2" : "#d3dae3", trimA = night ? "rgba(150,165,185,.6)" : "rgba(215,225,238,.75)";
  frustum(g, sqPts(cx, cy, 0.44), 0, sqPts(cx, cy, 0.44), 0.1, blk, shadeCol(blk, 0.1), trimA);
  frustum(g, sqPts(cx, cy, 0.33), 0.1, sqPts(cx, cy, 0.31), 0.22, blk, shadeCol(blk, 0.12), trimA);
  const faces = frustum(g, sqPts(cx, cy, 0.16), 0.22, sqPts(cx, cy, 0.1), 1.42, night ? "#191d24" : "#262c35", null, trimA);
  // เส้นฝังเรืองกลางหน้าเสา (สีเจ้าของ / ฟ้าคริสตัล)
  const pulse = 0.65 + 0.35 * Math.sin(now / 700);
  for (const f of faces) {
    const b = P((f.a[0] + f.b[0]) / 2, (f.a[1] + f.b[1]) / 2, 0.3), t = P((f.ta[0] + f.tb[0]) / 2, (f.ta[1] + f.tb[1]) / 2, 1.34), s = b[2];
    g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(t[0], t[1]);
    g.strokeStyle = hexA(acc, 0.28 * pulse); g.lineWidth = Math.max(3, s * 0.06); g.stroke();
    g.strokeStyle = hexA(acc, 0.95); g.lineWidth = Math.max(1, s * 0.016); g.stroke();
    const m = P((f.a[0] + f.b[0]) / 2 + f.nx * 0.005, (f.a[1] + f.b[1]) / 2 + f.ny * 0.005, 0.75);
    g.strokeStyle = trim; g.lineWidth = 1; g.beginPath(); g.moveTo(m[0] - s * 0.05, m[1]); g.lineTo(m[0] + s * 0.05, m[1]); g.stroke();
  }
  frustum(g, sqPts(cx, cy, 0.1), 1.42, sqPts(cx, cy, 0.004), 1.6, trim);
  const zc = 1.9 + Math.sin(now / 800 + cx) * 0.05;
  crystal(g, cx, cy, zc, 0.11, 0.25, 0.19, now / 1700, acc, night);
  if (!FAST) for (let i = 0; i < 3; i++) { // เศษคริสตัลโคจร
    const a = now / 900 + i * TAU / 3, q = P(cx + Math.cos(a) * 0.24, cy + Math.sin(a) * 0.24, zc + Math.sin(a * 2) * 0.05);
    shard(g, q[0], q[1], q[2] * 0.07, q[2] * 0.02, a, acc, "#ffffff", 0.9);
  }
  return zc + 0.36;
}
// ---------- Hammerhead: เสาเหล็กโครงถัก + ป้ายนีออน + ไฟหมุน ----------
function pillarHammerhead(g, cx, cy, acc, own, night, now) {
  const pad = night ? "#4a4946" : "#8f8b82", steel = night ? "#24272c" : "#3b3f46";
  frustum(g, sqPts(cx, cy, 0.43), 0, sqPts(cx, cy, 0.41), 0.09, pad, shadeCol(pad, 0.08));
  poly(g, sqPts(cx, cy, 0.37).map(([a, b]) => [a, b, 0.092]));
  g.lineWidth = 3; g.setLineDash([5, 5]); g.strokeStyle = night ? "#8a6c14" : "#e9b51c"; g.stroke();
  g.lineDashOffset = 5; g.strokeStyle = "#16161a"; g.stroke(); g.setLineDash([]); g.lineDashOffset = 0;
  const H = 1.62, leg = (sx, sy, z) => { const w = 0.27 + (0.07 - 0.27) * ((z - 0.09) / (H - 0.09)); return P(cx + sx * w, cy + sy * w, z); };
  const C4 = [[-1, -1], [1, -1], [1, 1], [-1, 1]], s0 = P(cx, cy)[2];
  // โครงถักซิกแซกทุกด้าน (ด้านหลังจางกว่า)
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = C4[i], [bx, by] = C4[(i + 1) % 4], nx = (ax + bx) / 2, ny = (ay + by) / 2, vis = faceVisible(nx, ny, cx + nx * 0.2, cy + ny * 0.2);
    g.strokeStyle = vis ? steel : shadeCol(steel, 0.2); g.globalAlpha = vis ? 1 : 0.55; g.lineWidth = Math.max(1, s0 * 0.014);
    g.beginPath();
    for (let z = 0.09, k = 0; z < H - 0.2; z += 0.25, k++) { const p = k % 2 ? leg(ax, ay, z) : leg(bx, by, z), q = k % 2 ? leg(bx, by, z + 0.25) : leg(ax, ay, z + 0.25); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); }
    g.stroke(); g.globalAlpha = 1;
  }
  for (const [sx, sy] of C4) {
    const b = leg(sx, sy, 0.09), m = leg(sx, sy, H - 0.32), t = leg(sx, sy, H);
    g.strokeStyle = steel; g.lineWidth = Math.max(1.5, s0 * 0.032); g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(t[0], t[1]); g.stroke();
    g.strokeStyle = night ? "#8a2216" : "#d0321f"; g.beginPath(); g.moveTo(m[0], m[1]); g.lineTo(t[0], t[1]); g.stroke(); // แถบแดงเตือนอากาศยาน
  }
  // ป้ายนีออน: ติดด้านที่หันกล้องมากที่สุด
  let best = null;
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = C4[i], [bx, by] = C4[(i + 1) % 4], nx = (ax + bx) / 2, ny = (ay + by) / 2;
    if (!faceVisible(nx, ny, cx + nx * 0.2, cy + ny * 0.2)) continue;
    const d = depthOf(cx + nx, cy + ny);
    if (!best || d > best.d) best = { d, nx, ny };
  }
  if (best) {
    const { nx, ny } = best, ux = -ny, uy = nx, o = 0.22, W = 0.3;
    const sp = (u, z) => P(cx + nx * o + ux * u, cy + ny * o + uy * u, z);
    const q = [sp(-W, 1.16), sp(W, 1.16), sp(W, 0.7), sp(-W, 0.7)];
    g.fillStyle = "#101216"; g.beginPath(); q.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
    g.strokeStyle = "#5a5e66"; g.lineWidth = 1.5; g.stroke();
    const flick = !own && hash(Math.floor(now / 110), 7) < 0.07 ? 0.25 : 1, s = q[0][2];
    const neon = (draw) => { g.beginPath(); draw(); g.strokeStyle = hexA(acc, 0.32 * flick); g.lineWidth = Math.max(3, s * 0.05); g.stroke(); g.strokeStyle = tintA(acc, 0.45, flick); g.lineWidth = Math.max(1, s * 0.014); g.stroke(); };
    neon(() => { for (let i = 0; i <= 20; i++) { const a = i / 20 * TAU, p = sp(-0.15 + Math.cos(a) * 0.09, 0.93 + Math.sin(a) * 0.12); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); } });
    neon(() => { const a = sp(0.0, 1.05), b = sp(0.16, 0.93), c = sp(0.0, 0.81); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); const d = sp(0.1, 1.05), e = sp(0.26, 0.93), f = sp(0.1, 0.81); g.moveTo(d[0], d[1]); g.lineTo(e[0], e[1]); g.lineTo(f[0], f[1]); });
    neon(() => { const a = sp(-0.25, 0.76), b = sp(0.25, 0.76); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); });
    const m = sp(0, 0.93);
    glowAt(g, m[0], m[1], s * 0.9, hexRgb(acc), (night ? 0.55 : 0.3) * flick);
  }
  // ไฟหมุนบนยอด + เสาอากาศ
  solidRound(g, cx, cy, 0.1, H, 0.1, H + 0.07, { body: "#34373d", dark: "#121417", hi: "#70757e" }, "#2a2c30");
  solidRound(g, cx, cy, 0.075, H + 0.07, 0.02, H + 0.19, { body: acc, dark: shadeCol(acc, -0.4), hi: shadeCol(acc, 0.6) });
  const lamp = P(cx, cy, H + 0.12);
  glowAt(g, lamp[0], lamp[1], lamp[2] * 0.6, hexRgb(acc), 0.9);
  const ang = now / 650;
  for (const k of [0, Math.PI]) {
    const a = ang + k, e0 = P(cx + Math.cos(a - 0.13) * 2.2, cy + Math.sin(a - 0.13) * 2.2, H + 0.05), e1 = P(cx + Math.cos(a + 0.13) * 2.2, cy + Math.sin(a + 0.13) * 2.2, H + 0.05);
    const gr = g.createLinearGradient(lamp[0], lamp[1], (e0[0] + e1[0]) / 2, (e0[1] + e1[1]) / 2);
    gr.addColorStop(0, hexA(acc, night ? 0.42 : 0.16)); gr.addColorStop(1, hexA(acc, 0));
    g.fillStyle = gr; g.beginPath(); g.moveTo(lamp[0], lamp[1]); g.lineTo(e0[0], e0[1]); g.lineTo(e1[0], e1[1]); g.closePath(); g.fill();
  }
  const at = P(cx, cy, H + 0.19), tip = P(cx, cy, H + 0.5);
  g.strokeStyle = steel; g.lineWidth = Math.max(1, s0 * 0.012); g.beginPath(); g.moveTo(at[0], at[1]); g.lineTo(tip[0], tip[1]); g.stroke();
  if (Math.sin(now / 380) > 0) { g.fillStyle = "#ff3a28"; g.beginPath(); g.arc(tip[0], tip[1], Math.max(1.2, tip[2] * 0.025), 0, TAU); g.fill(); glowAt(g, tip[0], tip[1], tip[2] * 0.25, "255,60,40", 0.8); }
  return H + 0.62;
}
// ---------- Duscae: หินตั้งโบราณ มอส อักษรรูนเรือง หินลอย ----------
const DUSCAE_BASE = [0, 1, 2, 3, 4].map((i) => { const a = i / 5 * TAU + 0.3, r = 0.27 + (hash(i, 11) - 0.5) * 0.08; return [Math.cos(a) * r, Math.sin(a) * r]; });
const DUSCAE_TOP = DUSCAE_BASE.map(([x, y], i) => [x * (0.55 + hash(i, 12) * 0.15) + 0.03, y * (0.55 + hash(i, 13) * 0.15) - 0.02]);
function pillarDuscae(g, cx, cy, acc, night, now) {
  const st = night ? "#4b4a45" : "#86827a", moss = night ? "#2a3a22" : "#5d7a35";
  const rocks = { ...PAL[night ? "night" : "day"], rock: night ? "#45464a" : "#8c8d88", rock2: night ? "#34353a" : "#6a6b66" };
  for (const [dx, dy, k] of [[-0.36, 0.2, 0.32], [0.34, 0.3, 0.26], [0.3, -0.34, 0.22]]) { const [sx, sy, s] = P(cx + dx, cy + dy); if (depthOf(cx + dx, cy + dy) < depthOf(cx, cy)) rockShape(g, sx, sy, s * k, rocks, 0.4); }
  const H = 1.52, base = DUSCAE_BASE.map(([x, y]) => [cx + x, cy + y]), top = DUSCAE_TOP.map(([x, y]) => [cx + x, cy + y]);
  const faces = frustum(g, base, 0, top, H, st, shadeCol(st, 0.12), "rgba(0,0,0,.22)");
  const at = (f, u, z) => { const k = z / H, ax = f.a[0] + (f.ta[0] - f.a[0]) * k, ay = f.a[1] + (f.ta[1] - f.a[1]) * k, bx = f.b[0] + (f.tb[0] - f.b[0]) * k, by = f.b[1] + (f.tb[1] - f.b[1]) * k; return P(ax + (bx - ax) * u + f.nx * 0.004, ay + (by - ay) * u + f.ny * 0.004, z); };
  faces.forEach((f, fi) => {
    if (!FAST) { // มอสเกาะโคนหิน
      g.fillStyle = moss;
      for (let i = 0; i < 4; i++) { const p = at(f, 0.15 + hash(i, fi + 3) * 0.7, 0.04 + hash(i, fi + 9) * 0.3); g.globalAlpha = 0.75; g.beginPath(); g.ellipse(p[0], p[1], p[2] * (0.05 + hash(i, fi) * 0.05), p[2] * 0.03, 0, 0, TAU); g.fill(); }
      g.globalAlpha = 1;
    }
    // อักษรรูนเรือง (คอลัมน์กลางหน้า)
    for (let i = 0; i < 4; i++) {
      const z = 0.32 + i * 0.27, c = at(f, 0.5, z), up = at(f, 0.5, z + 0.07), lf = at(f, 0.38, z), rt = at(f, 0.62, z), dn = at(f, 0.5, z - 0.07), s = c[2];
      const kind = Math.floor(hash(i + fi * 5, 21) * 4), pulse = 0.55 + 0.45 * Math.sin(now / 650 + i * 1.3 + fi);
      g.beginPath();
      if (kind === 0) { g.moveTo(dn[0], dn[1]); g.lineTo(up[0], up[1]); g.moveTo(c[0], c[1]); g.lineTo(lf[0], up[1]); g.moveTo(c[0], c[1]); g.lineTo(rt[0], up[1]); }
      else if (kind === 1) { g.moveTo(up[0], up[1]); g.lineTo(rt[0], rt[1]); g.lineTo(dn[0], dn[1]); g.lineTo(lf[0], lf[1]); g.closePath(); }
      else if (kind === 2) { g.moveTo(dn[0], dn[1]); g.lineTo(up[0], up[1]); g.moveTo(lf[0], c[1]); g.lineTo(up[0], up[1]); g.lineTo(rt[0], c[1]); }
      else { g.moveTo(lf[0], up[1]); g.lineTo(rt[0], dn[1]); g.moveTo(rt[0], up[1]); g.lineTo(lf[0], dn[1]); }
      g.strokeStyle = hexA(acc, 0.3 * pulse); g.lineWidth = Math.max(2.5, s * 0.045); g.stroke();
      g.strokeStyle = tintA(acc, 0.35, 0.5 + 0.5 * pulse); g.lineWidth = Math.max(1, s * 0.014); g.stroke();
    }
  });
  if (!FAST) { const tc = P(cx + 0.03, cy - 0.02, H); g.fillStyle = moss; g.globalAlpha = 0.8; g.beginPath(); g.ellipse(tc[0] - tc[2] * 0.03, tc[1], tc[2] * 0.09, tc[2] * 0.035, 0, 0, TAU); g.fill(); g.globalAlpha = 1; }
  const m = P(cx, cy, 0.9);
  glowAt(g, m[0], m[1], m[2] * (night ? 1.2 : 0.8), hexRgb(acc), night ? 0.32 : 0.18);
  // หินลอยวนเหนือยอด
  for (let k = 0; k < 3; k++) {
    const a = now / 2600 + k * 2.1, z = H + 0.15 + k * 0.08 + Math.sin(now / 700 + k) * 0.05, q = P(cx + Math.cos(a) * 0.3, cy + Math.sin(a) * 0.3, z), s = q[2] * (0.05 + k * 0.012);
    glowAt(g, q[0], q[1] + s, s * 3, hexRgb(acc), 0.4);
    g.fillStyle = shadeCol(st, 0.1); g.beginPath(); g.moveTo(q[0] - s, q[1]); g.lineTo(q[0] - s * 0.3, q[1] - s * 0.9); g.lineTo(q[0] + s, q[1] - s * 0.4); g.lineTo(q[0] + s * 0.4, q[1] + s * 0.7); g.closePath(); g.fill();
    g.fillStyle = hexA(acc, 0.8); g.fillRect(q[0] - 0.5, q[1] - s * 0.3, 1.2, s * 0.5);
  }
  return H + 0.42;
}
// ---------- Cleigne (ทะเลสาบ): ศาลน้ำ อ่างหิน ชามน้ำบนเสา ดอกบัว ----------
const LOTUS = [0.7, 2.5, 4.3, 5.6];
function lotus(g, cx, cy, a, acc, glowOn, now) {
  const r = 0.27, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r, bob = Math.sin(now / 900 + a * 3) * 0.006, p = P(x, y, 0.155 + bob), s = p[2];
  g.fillStyle = "#3f7a3a"; g.beginPath(); g.ellipse(p[0] + s * 0.02, p[1] + s * 0.01, s * 0.075, s * 0.03, 0, 0, TAU); g.fill();
  for (let i = 0; i < 6; i++) {
    const t = (i / 6) * Math.PI + Math.PI, px = p[0] + Math.cos(t) * s * 0.045, py = p[1] + Math.sin(t) * s * 0.02;
    g.fillStyle = i % 2 ? "#f6b9d4" : "#ee9cc2"; g.beginPath(); g.moveTo(p[0], p[1]); g.quadraticCurveTo(px - s * 0.015, py - s * 0.05, px, py - s * 0.065); g.quadraticCurveTo(px + s * 0.02, py - s * 0.03, p[0], p[1]); g.fill();
  }
  if (glowOn) glowAt(g, p[0], p[1] - s * 0.03, s * 0.2, hexRgb(acc), 0.7);
  g.fillStyle = glowOn ? shadeCol(acc, 0.5) : "#ffd96a"; g.beginPath(); g.arc(p[0], p[1] - s * 0.03, Math.max(1, s * 0.016), 0, TAU); g.fill();
}
function pillarLake(g, cx, cy, acc, own, night, now) {
  const stone = { body: night ? "#5b6468" : "#a9b3b6", dark: night ? "#283034" : "#5d686c", hi: night ? "#8a969b" : "#eaf1f2" };
  const pale = { body: night ? "#7a807c" : "#dadfd7", dark: night ? "#3a403d" : "#8b938c", hi: night ? "#a9b0ab" : "#ffffff" };
  solidRound(g, cx, cy, 0.46, 0, 0.44, 0.17, stone, stone.hi, 22);
  gEllipse(g, cx, cy, 0.38, 0.152, 28);
  g.fillStyle = night ? "#123a56" : "#3c9bc2"; g.fill();
  if (!FAST) for (let i = 0; i < 2; i++) { const k = ((now / 2200) + i / 2) % 1; gEllipse(g, cx, cy, 0.12 + k * 0.24, 0.153, 26); g.strokeStyle = `rgba(220,245,255,${0.45 * (1 - k)})`; g.lineWidth = 1; g.stroke(); }
  const streams = [0.25, 1.82, 3.4, 4.97].map((a) => a + Math.PI / 4);
  for (const a of LOTUS) if (!frontOf(cx, cy, a, 0.27)) lotus(g, cx, cy, a, acc, !!own, now);
  for (const a of streams) if (!frontOf(cx, cy, a, 0.3)) waterArc(g, cx, cy, a, 0.21, 1.34, 0.36, 1.0, 0.33, 0.16, now, night);
  solidRound(g, cx, cy, 0.105, 0.15, 0.095, 1.22, pale);
  for (const z of [0.42, 0.86]) { gEllipse(g, cx, cy, 0.105, z, 18); g.strokeStyle = hexA(pale.dark, 0.7); g.lineWidth = 1.5; g.stroke(); }
  solidRound(g, cx, cy, 0.09, 1.2, 0.235, 1.36, pale);
  gEllipse(g, cx, cy, 0.205, 1.355, 22); g.fillStyle = night ? "#2d6f9a" : "#7fd0ee"; g.fill();
  const gl = P(cx - 0.05, cy - 0.04, 1.357); g.fillStyle = "rgba(255,255,255,.6)"; g.beginPath(); g.ellipse(gl[0], gl[1], gl[2] * 0.06, gl[2] * 0.015, 0, 0, TAU); g.fill();
  for (const a of streams) if (frontOf(cx, cy, a, 0.3)) waterArc(g, cx, cy, a, 0.21, 1.34, 0.36, 1.0, 0.33, 0.16, now, night);
  for (const a of LOTUS) if (frontOf(cx, cy, a, 0.27)) lotus(g, cx, cy, a, acc, !!own, now);
  // ดวงไฟน้ำลอยเหนือชาม
  const zo = 1.55 + Math.sin(now / 750) * 0.04, o = P(cx, cy, zo);
  glowAt(g, o[0], o[1], o[2] * (night ? 1.1 : 0.75), hexRgb(acc), night ? 0.75 : 0.5);
  g.fillStyle = shadeCol(acc, 0.6); g.beginPath(); g.arc(o[0], o[1], Math.max(1.5, o[2] * 0.045), 0, TAU); g.fill();
  if (!FAST) for (let i = 0; i < 4; i++) { const a = now / 600 + i * TAU / 4, q = P(cx + Math.cos(a) * 0.12, cy + Math.sin(a) * 0.12, zo + Math.sin(a * 2) * 0.03); g.fillStyle = "rgba(230,250,255,.85)"; g.beginPath(); g.arc(q[0], q[1], Math.max(0.8, q[2] * 0.014), 0, TAU); g.fill(); }
  return zo + 0.28;
}
// ---------- Altissia: เสาหินอ่อน Accordo หัวเสาทอง กระถางไฟ + อ่างน้ำพุแปดเหลี่ยม ----------
function tintFlame(g, x, y, h, w, rgb, a) {
  if (!(a > 0 && h > 0)) return;
  const gr = g.createLinearGradient(x, y, x, y - h);
  gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(0.55, `rgba(${rgb},${a * 0.8})`); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x - w * 0.9, y - h * 0.5, x, y - h); g.quadraticCurveTo(x + w * 0.9, y - h * 0.5, x + w, y); g.closePath(); g.fill();
}
function pillarAltissia(g, cx, cy, acc, night, now) {
  const marble = night ? "#8d8982" : "#efe9dd", gold = night ? "#9a782c" : "#d9b24a";
  const mCol = { body: marble, dark: shadeCol(marble, -0.35), hi: "#ffffff" }, gCol = { body: gold, dark: shadeCol(gold, -0.45), hi: shadeCol(gold, 0.55) };
  frustum(g, regPoly(cx, cy, 0.48, 8, Math.PI / 8), 0, regPoly(cx, cy, 0.46, 8, Math.PI / 8), 0.16, marble, shadeCol(marble, 0.04));
  poly(g, regPoly(cx, cy, 0.46, 8, Math.PI / 8).map(([a, b]) => [a, b, 0.161])); g.strokeStyle = gold; g.lineWidth = 2; g.stroke();
  poly(g, regPoly(cx, cy, 0.4, 8, Math.PI / 8).map(([a, b]) => [a, b, 0.14])); g.fillStyle = night ? "#123d55" : "#47a8cc"; g.fill();
  if (!FAST) for (let i = 0; i < 2; i++) { const k = ((now / 1800) + i / 2) % 1; gEllipse(g, cx, cy, 0.2 + k * 0.17, 0.141, 26); g.strokeStyle = `rgba(230,248,255,${0.4 * (1 - k)})`; g.lineWidth = 1; g.stroke(); }
  const jets = [0, 1, 2, 3].map((i) => i * Math.PI / 2 + Math.PI / 4);
  for (const a of jets) if (!frontOf(cx, cy, a, 0.3)) waterArc(g, cx, cy, a, 0.18, 0.3, 0.33, 0.62, 0.37, 0.14, now, night);
  frustum(g, sqPts(cx, cy, 0.17), 0.14, sqPts(cx, cy, 0.16), 0.34, marble, shadeCol(marble, 0.06));
  solidRound(g, cx, cy, 0.135, 0.34, 0.135, 0.39, gCol);
  solidRound(g, cx, cy, 0.12, 0.39, 0.11, 1.36, mCol);
  if (!FAST) { // ร่องเสา (เฉพาะครึ่งที่หันกล้อง)
    g.strokeStyle = night ? "rgba(40,36,30,.35)" : "rgba(140,128,108,.4)"; g.lineWidth = 1; g.beginPath();
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; if (!frontOf(cx, cy, a, 0.12)) continue; const b = P(cx + Math.cos(a) * 0.118, cy + Math.sin(a) * 0.118, 0.43), t = P(cx + Math.cos(a) * 0.108, cy + Math.sin(a) * 0.108, 1.32); g.moveTo(b[0], b[1]); g.lineTo(t[0], t[1]); }
    g.stroke();
  }
  solidRound(g, cx, cy, 0.11, 1.36, 0.19, 1.46, gCol);
  frustum(g, sqPts(cx, cy, 0.21), 1.46, sqPts(cx, cy, 0.21), 1.52, gold, shadeCol(gold, 0.25));
  solidRound(g, cx, cy, 0.05, 1.52, 0.11, 1.62, gCol, shadeCol(gold, -0.5));
  // เปลวไฟในกระถาง (สีเจ้าของ / ทองอ่อน)
  const f = P(cx, cy, 1.61), fl = 0.85 + 0.15 * Math.sin(now / 90) + 0.08 * Math.sin(now / 37), rgb = hexRgb(acc);
  glowAt(g, f[0], f[1] - f[2] * 0.15, f[2] * (night ? 1.25 : 0.8), rgb, night ? 0.75 : 0.45);
  tintFlame(g, f[0], f[1], f[2] * 0.36 * fl, f[2] * 0.085, rgb, 0.9);
  tintFlame(g, f[0], f[1], f[2] * 0.2 * fl, f[2] * 0.045, "255,250,235", 0.85);
  for (const a of jets) if (frontOf(cx, cy, a, 0.3)) waterArc(g, cx, cy, a, 0.18, 0.3, 0.33, 0.62, 0.37, 0.14, now, night);
  return 2.0;
}
function drawPillar(g, t, C, night, now) {
  const pl = LAST_FD && Array.isArray(LAST_FD.pillars) ? LAST_FD.pillars.find((o) => o.x === t.x && o.y === t.y) : null;
  const zone = (pl && pl.zone) || PILLAR_ZONE[K(t.x, t.y)] || "insomnia";
  const own = pl && pl.color ? hex6(pl.color, "#ffffff") : null, acc = own || PILLAR_NEUTRAL[zone] || "#9fd8ff";
  const cx = t.x + 0.5, cy = t.y + 0.5;
  gEllipse(g, cx + 0.04, cy + 0.04, 0.47, 0, 26); g.fillStyle = C.shadow; g.fill();
  pillarGround(g, pl, cx, cy, night, now);
  const top = zone === "hammerhead" ? pillarHammerhead(g, cx, cy, acc, own, night, now)
    : zone === "duscae" ? pillarDuscae(g, cx, cy, acc, night, now)
      : zone === "lake" ? pillarLake(g, cx, cy, acc, own, night, now)
        : zone === "altissia" ? pillarAltissia(g, cx, cy, acc, night, now)
          : pillarInsomnia(g, cx, cy, acc, night, now);
  pillarCrown(g, own, cx, cy, top, now, night);
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

// =================================================================== ขั้น 3: ลูกเล่นโจมตี (server/fodlan/stage6.js "ขั้น 3")
const ELEM = {
  fire: { rgb: "255,140,40", body: "#ff7a1c", hi: "#ffd27a", dark: "#a8360c" },
  ice: { rgb: "120,225,255", body: "#7fdcff", hi: "#eafcff", dark: "#2a7fb0" },
  thunder: { rgb: "185,130,255", body: "#b48cff", hi: "#fff6a0", dark: "#5a2fb0" },
};
const elemOf = (k) => ELEM[k] || ELEM.fire;
const objAt = (key, x, y) => (LAST_FD && Array.isArray(LAST_FD[key]) ? LAST_FD[key].find((o) => o.x === x && o.y === y) : null);
const seedOf = (id) => String(id).split("").reduce((a, ch) => a + ch.charCodeAt(0), 0);

// เงาทอดของของบนชั้น layer (ถัง/หินเวท — ไม่อยู่ในผังที่อบ castShadows) · วาดใน ground()
function dynShadow(g, x, y, h, inset, night) {
  const ox = SUN.x * h, oy = SUN.y * h;
  const sq = [[x + inset, y + inset], [x + 1 - inset, y + inset], [x + 1 - inset, y + 1 - inset], [x + inset, y + 1 - inset]];
  const pts = hull([...sq, ...sq.map(([a, b]) => [a + ox, b + oy])]);
  g.beginPath(); pts.forEach(([a, b], i) => { const q = P(a, b); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.closePath();
  g.fillStyle = night ? "rgba(0,0,12,.22)" : "rgba(20,24,10,.26)"; g.fill();
}

// ทรงกระบอกตั้ง (ถังน้ำมัน / แป้นหมุนป้อม) · stripe = สีแถบเตือนอันตราย (ลายเฉียงดำ)
function cylPath(g, t, b, rx, ry) {
  g.beginPath(); g.moveTo(t[0] - rx, t[1]); g.lineTo(b[0] - rx, b[1]); g.ellipse(b[0], b[1], rx, ry, 0, Math.PI, 0, true); g.lineTo(t[0] + rx, t[1]);
  g.ellipse(t[0], t[1], rx, ry, 0, 0, Math.PI, false); g.closePath();
}
function drum(g, cx, cy, r, h, col, stripe = null, z0 = 0) {
  const b = P(cx, cy, z0), t = P(cx, cy, z0 + h), rx = b[2] * r, ry = rx * 0.5;
  const gr = g.createLinearGradient(b[0] - rx, 0, b[0] + rx, 0);
  gr.addColorStop(0, col.dark); gr.addColorStop(0.3, col.body); gr.addColorStop(0.5, col.hi); gr.addColorStop(0.68, col.body); gr.addColorStop(1, col.dark);
  cylPath(g, t, b, rx, ry); g.fillStyle = gr; g.fill();
  if (stripe) {
    const lo = P(cx, cy, z0 + h * 0.48), up = P(cx, cy, z0 + h * 0.72);
    g.save();
    cylPath(g, up, lo, rx, ry); g.fillStyle = stripe; g.fill(); g.clip();
    g.fillStyle = "rgba(22,18,14,.92)";
    const bh = lo[1] - up[1] + ry * 2, w = rx * 0.3;
    for (let i = -3; i < 9; i++) {
      const x0 = lo[0] - rx + i * w * 2;
      g.beginPath(); g.moveTo(x0, up[1] - ry); g.lineTo(x0 + w, up[1] - ry); g.lineTo(x0 + w - bh * 0.7, lo[1] + ry); g.lineTo(x0 - bh * 0.7, lo[1] + ry); g.closePath(); g.fill();
    }
    g.restore();
  }
  // สันถัง + ฝา + จุกเติม
  g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 1;
  for (const k of [0.22, 0.86]) { const m = P(cx, cy, z0 + h * k); g.beginPath(); g.ellipse(m[0], m[1], rx, ry, 0, 0, Math.PI); g.stroke(); }
  g.fillStyle = col.hi; g.beginPath(); g.ellipse(t[0], t[1], rx, ry, 0, 0, TAU); g.fill();
  g.strokeStyle = col.dark; g.beginPath(); g.ellipse(t[0], t[1], rx * 0.8, ry * 0.8, 0, 0, TAU); g.stroke();
  g.fillStyle = col.dark; g.beginPath(); g.arc(t[0] + rx * 0.42, t[1], Math.max(1, rx * 0.13), 0, TAU); g.fill();
}

// ---------- ถังน้ำมัน Hammerhead (แดง/เหลือง + แถบเตือน) ----------
const DRUM_RED = { body: "#c8321f", dark: "#56120a", hi: "#ff8f72" }, DRUM_YEL = { body: "#e2b31a", dark: "#6e5005", hi: "#fff0a6" };
function drawBarrel(g, x, y) {
  const b = objAt("barrels", x, y), seed = b ? seedOf(b.id) : x * 7 + y;
  const [bx, by, s] = P(x + 0.5, y + 0.58);
  g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.ellipse(bx, by, s * 0.4, s * 0.15, 0, 0, TAU); g.fill();
  gEllipse(g, x + 0.66, y + 0.74, 0.2, 0.01, 14, 0.11); g.fillStyle = "rgba(18,12,8,.5)"; g.fill(); // คราบน้ำมัน
  const A = hash(seed, 1) < 0.5 ? DRUM_RED : DRUM_YEL, B = A === DRUM_RED ? DRUM_YEL : DRUM_RED;
  const drums = [
    { x: x + 0.32, y: y + 0.34, r: 0.17, h: 0.38, col: B, st: B === DRUM_RED ? "#f2c21b" : "#e8e2cf" },
    { x: x + 0.58, y: y + 0.6, r: 0.22, h: 0.5, col: A, st: A === DRUM_RED ? "#f2c21b" : "#e8e2cf" },
  ].sort((p, q) => depthOf(p.x, p.y) - depthOf(q.x, q.y));
  for (const d of drums) drum(g, d.x, d.y, d.r, d.h, d.col, d.st);
}

// ---------- แหล่งหินเวท (หิน + ผลึกเรืองตามธาตุ) ----------
function shard(g, bx, by, len, w, ang, col, hi, a = 1) {
  const tx = bx + Math.sin(ang) * len, ty = by - Math.cos(ang) * len, nx = Math.cos(ang) * w, ny = Math.sin(ang) * w;
  const mx = bx + (tx - bx) * 0.55, my = by + (ty - by) * 0.55;
  const a0 = g.globalAlpha;
  g.globalAlpha = a0 * a; g.fillStyle = col;
  g.beginPath(); g.moveTo(bx - nx * 0.6, by - ny * 0.6); g.lineTo(mx - nx, my - ny); g.lineTo(tx, ty); g.lineTo(mx + nx, my + ny); g.lineTo(bx + nx * 0.6, by + ny * 0.6); g.closePath(); g.fill();
  g.globalAlpha = a0 * a * 0.6; g.fillStyle = hi;
  g.beginPath(); g.moveTo(bx - nx * 0.6, by - ny * 0.6); g.lineTo(mx - nx, my - ny); g.lineTo(tx, ty); g.lineTo(mx, my); g.closePath(); g.fill();
  g.globalAlpha = a0;
}
const SHARDS = [[-0.16, 0.04, 0.4, -0.55], [0.0, -0.02, 0.62, 0.05], [0.15, 0.03, 0.44, 0.5], [-0.05, 0.1, 0.28, -0.22], [0.24, 0.11, 0.24, 0.85]];
function drawCrystal(g, x, y, C, night, now) {
  const c = objAt("crystals", x, y), E = elemOf(c && c.element);
  const [sx, sy, s] = P(x + 0.5, y + 0.6);
  rockShape(g, sx, sy, s * 0.95, zoneAt(x, y) === "desert" ? C : { ...C, rock: C.stone, rock2: C.stone2 }, 0.5);
  const pulse = 0.5 + 0.5 * Math.sin(now / 520 + x * 1.3 + y);
  glowAt(g, sx, sy - s * 0.5, s * (night ? 1.25 : 0.9), E.rgb, (night ? 0.55 : 0.35) + 0.15 * pulse);
  const R = rng(x * 31 + y * 17);
  for (const [dx, dy, len, ang] of SHARDS) shard(g, sx + dx * s, sy - s * 0.32 + dy * s, s * len * (0.85 + R() * 0.3), s * 0.075, ang + (R() - 0.5) * 0.2, E.body, E.hi);
  if (Math.sin(now / 260 + x * 5 + y) > 0.8) { // ประกาย
    const px = sx + (R() - 0.5) * s * 0.4, py = sy - s * (0.55 + R() * 0.3), k = s * 0.06;
    g.fillStyle = "rgba(255,255,255,.9)"; g.fillRect(px - 1, py - k, 2, k * 2); g.fillRect(px - k, py - 1, k * 2, 2);
  }
}

// ---------- ป้อมปืนบนกำแพง Insomnia (หันตามเป้าล่าสุด / กวาดหาเป้า) ----------
function rbox(g, cx, cy, ang, hl, hw, z0, z1, top, s1, s2) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const c = [[-hl, -hw], [hl, -hw], [hl, hw], [-hl, hw]].map(([u, v]) => [cx + u * ca - v * sa, cy + u * sa + v * ca]);
  const mid = depthOf(cx, cy);
  c.forEach((a, i) => {
    const b = c[(i + 1) % 4];
    if (depthOf((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) <= mid) return;
    poly(g, [[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]]); g.fillStyle = i % 2 ? s1 : s2; g.fill();
  });
  poly(g, c.map(([px, py]) => [px, py, z1])); g.fillStyle = top; g.fill();
  g.strokeStyle = "rgba(255,255,255,.16)"; g.lineWidth = 1; g.stroke();
}
const TURRET_GUN = "#1c1f24", TURRET_PLATE = { body: "#4a5058", dark: "#1e2227", hi: "#8a929c" };
function turretShot(x, y, now) {
  const e = lastFx("turret_shot");
  return e && e.from && e.from.x === x && e.from.y === y ? { e, p: fxT(e, now, fx.turret_shot) } : null;
}
function drawTurret(g, x, y, C, now) {
  box(g, x, y + 0.15, x + 1, y + 0.85, 0.75, C.wall, C.wall2, C.wall);
  box(g, x + 0.16, y + 0.18, x + 0.84, y + 0.82, 0.88, C.stone, C.stone2, C.stone);
  const cx = x + 0.5, cy = y + 0.5, sh = turretShot(x, y, now);
  // มุม: ยิงล่าสุด = หันหาเป้า (ค้างไว้) · ไม่มี = กวาดช้าๆ หันออกนอกเมือง
  const out = Math.atan2(cy - 4, cx - 15.5);
  const a = sh && sh.e.to ? Math.atan2(sh.e.to.y + 0.5 - cy, sh.e.to.x + 0.5 - cx) : out + Math.sin(now / 2600 + x * 0.7) * 0.7;
  const firing = !!sh && sh.p < 0.6, recoil = firing ? Math.abs(Math.sin(sh.p * 32)) * 0.07 : 0;
  drum(g, cx, cy, 0.24, 0.1, TURRET_PLATE, null, 0.88);
  const ca = Math.cos(a), sa = Math.sin(a);
  const tip = (off) => [cx + ca * (0.66 - recoil) - sa * off, cy + sa * (0.66 - recoil) + ca * off];
  const guns = () => {
    for (const off of [-0.07, 0.07]) {
      const r0 = P(cx + ca * 0.1 - sa * off, cy + sa * 0.1 + ca * off, 1.13), t = tip(off), r1 = P(t[0], t[1], 1.13);
      g.strokeStyle = TURRET_GUN; g.lineWidth = Math.max(2, r0[2] * 0.06); g.lineCap = "round";
      g.beginPath(); g.moveTo(r0[0], r0[1]); g.lineTo(r1[0], r1[1]); g.stroke(); g.lineCap = "butt";
    }
  };
  const front = depthOf(...tip(0)) > depthOf(cx, cy);
  if (!front) guns();
  rbox(g, cx - ca * recoil, cy - sa * recoil, a, 0.24, 0.2, 0.98, 1.24, "#6a727c", "#3a4048", "#4d545d");
  if (front) {
    guns();
    const eye = P(cx + ca * 0.25, cy + sa * 0.25, 1.17);
    g.fillStyle = "#ff3a28"; g.beginPath(); g.arc(eye[0], eye[1], Math.max(1.2, eye[2] * 0.03), 0, TAU); g.fill();
    glowAt(g, eye[0], eye[1], eye[2] * 0.25, "255,60,40", 0.6);
  }
  const lt = P(cx, cy, 1.27);
  if (Math.sin(now / 300 + x) > 0.2) glowAt(g, lt[0], lt[1], lt[2] * 0.3, "255,60,40", 0.7);
  if (firing && Math.sin(sh.p * 60) > 0) for (const off of [-0.07, 0.07]) {
    const t = tip(off), m = P(t[0] + ca * 0.06, t[1] + sa * 0.06, 1.13);
    glowAt(g, m[0], m[1], m[2] * 0.45, "255,220,140", 0.95);
  }
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
  if (kind === "fd_eos_mob" || kind === "fd_eos_chest") return; // มอนสเตอร์ · หีบสมบัติ วาดใน items
  if (kind === "fd_eos_barrel") { drawBarrel(g, x, y); return; }
  if (kind === "fd_eos_crystal") { drawCrystal(g, x, y, C, night, now); return; }
  if (kind === "fd_eos_turret") { drawTurret(g, x, y, C, now); return; }
  if (kind === "fd_eos_tomb") { drawTomb(g, x, y, C, night, now); return; }
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
    const same = (nx, ny) => { const o = BUILDING.get(K(x + nx, y + ny)); return !!(o && b && o.id === b.id); }; // ผนังด้านในของตึกเดียวกัน
    if (zone === "altissia") { drawAltHouse(g, x, y, b, same, C, night, s); return; }
    const top = C.bldg[tone], s1 = C.bldg[(tone + 1) % 3], s2 = C.bldg[(tone + 2) % 3];
    const hh = h;
    const faces = box(g, x, y, x + 1, y + 1, hh, top, s1, s2, 0, same);
    roofDeck(g, x, y, hh, top, same, C);
    if (hh > 1.4 && hash(x, y + 7) < 0.45) box(g, x + 0.25, y + 0.3, x + 0.55, y + 0.6, hh + 0.14, C.bldg[(tone + 1) % 3], C.bldg[(tone + 2) % 3], C.bldg[tone]);
    // หน้าต่าง: เฉพาะผนังด้านนอกที่มองเห็นจริง (เดิมวาดผนังทิศเดียวเสมอ → หมุนกล้องแล้วหน้าต่างลอยทะลุตึก)
    const R = rng(x * 37 + y * 11);
    for (const f of faces) {
      if (Math.abs(P(f.a[0], f.a[1], hh)[1] - P(f.a[0], f.a[1], 0)[1]) < s * 0.35) continue; // มุมบน: ผนังแบน ไม่วาดหน้าต่าง
      for (let zz = 0.25; zz < hh - 0.15; zz += 0.3) for (const t of [0.3, 0.7]) {
        const lit = R() < 0.55 && night && !darkAt(x, y);
        const px = f.a[0] + (f.b[0] - f.a[0]) * t + f.nx * 0.01, py = f.a[1] + (f.b[1] - f.a[1]) * t + f.ny * 0.01;
        const p = P(px, py, zz);
        g.fillStyle = lit ? C.winLit : C.win; g.fillRect(p[0] - s * 0.04, p[1] - s * 0.08, s * 0.08, s * 0.1);
        if (lit && R() < 0.25) glowAt(g, p[0], p[1] - s * 0.03, s * 0.18, "255,210,130", 0.35);
      }
    }
    return;
  }
  if (kind === "fd_eos_wall") {
    // หันตามแนวที่ต่อกัน (กำแพงข้างเมืองเป็นแนวตั้ง) · ไม่วาดผนังรอยต่อกับกำแพงช่องข้าง (เดิมเป็นแผ่นแนวนอนทุกช่อง = หมุนแล้วทะลุ)
    const isW = (dx, dy) => { const k = STATIC_TR[K(x + dx, y + dy)]; return k === "fd_eos_wall" || k === "fd_eos_turret"; };
    const vert = (isW(0, -1) || isW(0, 1)) && !(isW(-1, 0) || isW(1, 0));
    const join = (nx, ny) => isW(nx, ny);
    if (vert) {
      box(g, x + 0.15, y, x + 0.85, y + 1, 0.75, C.wall, C.wall2, C.wall, 0, join);
      for (let i = 0; i < 3; i++) box(g, x + 0.2, y + 0.05 + i * 0.33, x + 0.8, y + 0.25 + i * 0.33, 0.9, C.wall, C.wall2, C.wall);
    } else {
      box(g, x, y + 0.15, x + 1, y + 0.85, 0.75, C.wall, C.wall2, C.wall, 0, join);
      for (let i = 0; i < 3; i++) box(g, x + 0.05 + i * 0.33, y + 0.2, x + 0.25 + i * 0.33, y + 0.8, 0.9, C.wall, C.wall2, C.wall);
    }
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
    box(g, x, y, x + 1, y + 1, 0.9, "#9a8f7a", "#6f6656", "#827866", 0, (nx, ny) => STATIC_TR[K(x + nx, y + ny)] === "fd_eos_garage"); // อู่หลายช่อง = หลังเดียว
    const on = night && !darkAt(x, y);
    const p = P(x + 0.5, y + 0.99, 0.35); g.fillStyle = on ? "#ffcc66" : "#3a3a3a"; g.fillRect(p[0] - s * 0.3, p[1] - s * 0.2, s * 0.6, s * 0.3);
    if (on) glowAt(g, p[0], p[1], s * 0.8, "255,200,100", 0.4);
  }
}

// หลังคาตึกเมือง (Insomnia/Hammerhead): ขอบกันตก (parapet) ตามขอบนอกของตึก + พื้นหลังคาเข้มกว่า + เครื่องปรับอากาศ/ช่องระบาย
//  (เดิมหลังคาเรียบสีเดียว → มองจากด้านบนเป็นกล่องเทาเปล่า)
function roofDeck(g, x, y, hh, top, same, C) {
  const iN = same(0, -1) ? 0 : 0.09, iS = same(0, 1) ? 0 : 0.09, iW = same(-1, 0) ? 0 : 0.09, iE = same(1, 0) ? 0 : 0.09;
  poly(g, [[x + iW, y + iN, hh], [x + 1 - iE, y + iN, hh], [x + 1 - iE, y + 1 - iS, hh], [x + iW, y + 1 - iS, hh]]);
  g.fillStyle = shadeCol(top, -0.1); g.fill();
  const r = hash(x * 3 + 11, y * 5 + 7);
  if (r < 0.32) {
    const ux = x + 0.22 + hash(x, y * 2) * 0.3, uy = y + 0.22 + hash(x * 2, y) * 0.3;
    box(g, ux, uy, ux + 0.24, uy + 0.18, hh + 0.12, C.roofUnit, C.roofUnit2, shadeCol(C.roofUnit, -0.18), hh);
    const fc = P(ux + 0.12, uy + 0.09, hh + 0.12), s = fc[2];
    g.strokeStyle = C.roofUnit2; g.lineWidth = 1; g.beginPath(); g.arc(fc[0], fc[1], s * 0.05, 0, TAU); g.stroke();
  } else if (r < 0.48) {
    const vx = x + 0.3 + hash(x, y + 3) * 0.35, vy = y + 0.3 + hash(x + 3, y) * 0.35;
    poly(g, [[vx, vy, hh], [vx + 0.14, vy, hh], [vx + 0.14, vy + 0.14, hh], [vx, vy + 0.14, hh]]); g.fillStyle = "rgba(0,0,0,.28)"; g.fill();
  }
}
// บ้านเมืองน้ำ Altissia (แบบเวนิส): ผนังพาสเทลต่อหลัง · หลังคาจั่วกระเบื้องดินเผา สันหลังคาตามแนวยาวของตึก (บ้านแถวต่อสันเดียวกัน)
//  ขอบบัวสีขาวใต้ชายคา · หน้าต่างโค้งมีบานเกล็ดเขียว · กระถางดอกไม้ใต้หน้าต่างบางบาน · ประตูโค้ง · ปล่องไฟบางหลัง
//  (เดิมเป็นกล่องส้มทึบ + จุดหน้าต่าง)
const ALT_AXIS = new Map(); // id ตึก → "x" | "y" (แนวสันหลังคา = ด้านยาวของตึก)
function altAxis(id) {
  if (ALT_AXIS.has(id)) return ALT_AXIS.get(id);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [k, v] of BUILDING) if (v.id === id) { const [a, c] = k.split(",").map(Number); x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, c); y1 = Math.max(y1, c); }
  const ax = x1 - x0 >= y1 - y0 ? "x" : "y";
  ALT_AXIS.set(id, ax);
  return ax;
}
function drawAltHouse(g, x, y, b, same, C, night, s) {
  const id = b ? b.id : 0, hh = 0.78 + hash(id, 9) * 0.3;
  const wall = C.altWalls[id % C.altWalls.length], roof = C.altRoofs[id % C.altRoofs.length];
  const faces = box(g, x, y, x + 1, y + 1, hh, wall, wall, shadeCol(wall, -0.1), 0, same);
  const R = rng(x * 41 + y * 13);
  for (const f of faces) {
    for (const t of [0.3, 0.7]) {
      const px = f.a[0] + (f.b[0] - f.a[0]) * t + f.nx * 0.01, py = f.a[1] + (f.b[1] - f.a[1]) * t + f.ny * 0.01;
      const p = P(px, py, hh * 0.55), w = s * 0.07, hgt = s * 0.13;
      if (Math.abs(P(px, py, hh)[1] - P(px, py, 0)[1]) < s * 0.35) continue; // มุมบน: ผนังแบนจนหน้าต่างกลายเป็นจุด — ไม่วาด
      const lit = night && R() < 0.6;
      // บานเกล็ด + หน้าต่างโค้ง
      g.fillStyle = C.shutter; g.fillRect(p[0] - w * 1.05, p[1] - hgt * 0.5, w * 0.32, hgt); g.fillRect(p[0] + w * 0.73, p[1] - hgt * 0.5, w * 0.32, hgt);
      g.fillStyle = lit ? C.winLit : "#3a3f4a";
      g.beginPath(); g.moveTo(p[0] - w * 0.5, p[1] + hgt * 0.5); g.lineTo(p[0] - w * 0.5, p[1] - hgt * 0.2); g.arc(p[0], p[1] - hgt * 0.2, w * 0.5, Math.PI, 0); g.lineTo(p[0] + w * 0.5, p[1] + hgt * 0.5); g.closePath(); g.fill();
      if (lit) glowAt(g, p[0], p[1], s * 0.16, "255,210,130", 0.3);
      // กระถางดอกไม้
      if (R() < 0.45) {
        g.fillStyle = "#7a4a2a"; g.fillRect(p[0] - w * 0.6, p[1] + hgt * 0.5, w * 1.2, s * 0.025);
        for (let i = 0; i < 3; i++) { g.fillStyle = C.flower[(i + id) % C.flower.length]; g.beginPath(); g.arc(p[0] - w * 0.4 + i * w * 0.4, p[1] + hgt * 0.5 - s * 0.008, Math.max(1, s * 0.018), 0, TAU); g.fill(); }
      }
      // ประตูโค้งชั้นล่าง (บางผนัง)
      if (t === 0.3 && R() < 0.35) {
        const d = P(px + (f.b[0] - f.a[0]) * 0.2, py + (f.b[1] - f.a[1]) * 0.2, 0);
        g.fillStyle = "#5a3a26"; g.beginPath(); g.moveTo(d[0] - w * 0.55, d[1]); g.lineTo(d[0] - w * 0.55, d[1] - s * 0.13); g.arc(d[0], d[1] - s * 0.13, w * 0.55, Math.PI, 0); g.lineTo(d[0] + w * 0.55, d[1]); g.closePath(); g.fill();
      }
    }
    // ขอบบัวสีขาวใต้ชายคา
    const a = P(f.a[0], f.a[1], hh - 0.04), c2 = P(f.b[0], f.b[1], hh - 0.04);
    g.strokeStyle = night ? "rgba(200,200,190,.35)" : "rgba(255,250,236,.9)"; g.lineWidth = Math.max(1.5, s * 0.035); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(c2[0], c2[1]); g.stroke();
  }
  // หลังคาจั่ว: สันตามแกนยาว · ปลายที่ติดบ้านหลังเดียวกันต่อสันไปถึงขอบช่อง (ไม่มีหน้าจั่วกลางตึก) · ชายคายื่นเฉพาะขอบนอก
  const ax = altAxis(id), rz = hh + 0.34, e = 0.04;
  const X0 = x - (same(-1, 0) ? 0 : e), X1 = x + 1 + (same(1, 0) ? 0 : e), Y0 = y - (same(0, -1) ? 0 : e), Y1 = y + 1 + (same(0, 1) ? 0 : e);
  let pa, pb, sides;
  if (ax === "x") {
    pa = [same(-1, 0) ? x : x + 0.3, y + 0.5]; pb = [same(1, 0) ? x + 1 : x + 0.7, y + 0.5];
    sides = [
      { pts: [[X0, Y0, hh], [X1, Y0, hh], [pb[0], pb[1], rz], [pa[0], pa[1], rz]], n: [0, -1] },
      { pts: [[X1, Y1, hh], [X0, Y1, hh], [pa[0], pa[1], rz], [pb[0], pb[1], rz]], n: [0, 1] },
      same(-1, 0) ? null : { pts: [[X0, Y1, hh], [X0, Y0, hh], [pa[0], pa[1], rz]], n: [-1, 0] },
      same(1, 0) ? null : { pts: [[X1, Y0, hh], [X1, Y1, hh], [pb[0], pb[1], rz]], n: [1, 0] },
    ];
  } else {
    pa = [x + 0.5, same(0, -1) ? y : y + 0.3]; pb = [x + 0.5, same(0, 1) ? y + 1 : y + 0.7];
    sides = [
      { pts: [[X0, Y1, hh], [X0, Y0, hh], [pa[0], pa[1], rz], [pb[0], pb[1], rz]], n: [-1, 0] },
      { pts: [[X1, Y0, hh], [X1, Y1, hh], [pb[0], pb[1], rz], [pa[0], pa[1], rz]], n: [1, 0] },
      same(0, -1) ? null : { pts: [[X1, Y0, hh], [X0, Y0, hh], [pa[0], pa[1], rz]], n: [0, -1] },
      same(0, 1) ? null : { pts: [[X0, Y1, hh], [X1, Y1, hh], [pb[0], pb[1], rz]], n: [0, 1] },
    ];
  }
  const list = sides.filter(Boolean).map((f) => ({ ...f, front: faceVisible(f.n[0], f.n[1], x + 0.5 + f.n[0] * 0.5, y + 0.5 + f.n[1] * 0.5) ? 1 : 0 }));
  list.sort((p, q) => p.front - q.front); // ด้านหลังก่อน แล้วด้านที่หันกล้องทับ
  for (const f of list) {
    poly(g, f.pts); g.fillStyle = shadeCol(roof, faceLit(f.n[0], f.n[1]) > 0 ? 0.1 : -0.16); g.fill();
    // แนวกระเบื้อง: เส้นขนานชายคา 2 เส้น
    g.strokeStyle = night ? "rgba(0,0,0,.25)" : "rgba(90,30,10,.22)"; g.lineWidth = 1;
    const A = f.pts[0], B = f.pts[1], Cc = f.pts[2], D = f.pts[3] || f.pts[2];
    for (const k of [0.35, 0.68]) {
      const pu = P(A[0] + (D[0] - A[0]) * k, A[1] + (D[1] - A[1]) * k, A[2] + (D[2] - A[2]) * k);
      const pv = P(B[0] + (Cc[0] - B[0]) * k, B[1] + (Cc[1] - B[1]) * k, B[2] + (Cc[2] - B[2]) * k);
      g.beginPath(); g.moveTo(pu[0], pu[1]); g.lineTo(pv[0], pv[1]); g.stroke();
    }
  }
  // สันหลังคา
  const r0 = P(pa[0], pa[1], rz), r1 = P(pb[0], pb[1], rz);
  g.strokeStyle = shadeCol(roof, -0.3); g.lineWidth = Math.max(1.5, s * 0.03); g.beginPath(); g.moveTo(r0[0], r0[1]); g.lineTo(r1[0], r1[1]); g.stroke();
  // ปล่องไฟ (บางช่อง)
  if (hash(x * 7, y * 3) < 0.22) {
    const cx = x + 0.62, cy = y + 0.3;
    box(g, cx, cy, cx + 0.12, cy + 0.12, rz + 0.08, shadeCol(roof, -0.05), shadeCol(roof, -0.2), shadeCol(roof, -0.32), hh + 0.15);
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

// =================================================================== โชโกโบะ / ปีศาจ (ภาพ)
function sprite(g, src, x, y, z, hTiles, flip = false, alpha = 1) {
  const im = img(src);
  const [sx, sy, s] = P(x, y, z);
  if (!im) { g.fillStyle = "#f2c94c"; g.beginPath(); g.arc(sx, sy - s * 0.3, s * 0.2, 0, TAU); g.fill(); return [sx, sy, s]; }
  const h = s * hTiles, w = h * (im.naturalWidth / im.naturalHeight);
  g.save(); g.globalAlpha *= alpha; g.translate(sx, sy); if (flip) g.scale(-1, 1);
  g.drawImage(im, -w / 2, -h, w, h); g.restore();
  return [sx, sy, s];
}
// มอนเตอร์เป็นยูนิตจริง (server/summon.js): เดินเองต้นเทิร์น = เลื่อนตามเส้นทาง (smooth) · ถูกผลัก/ไถล/ดึง = ตามตำแหน่งวาดของหมาก (ระบบเดิมเล่นฉากให้)
function mobPos(units, id, sm) {
  if (sm.moving) return sm;
  const u = (units || []).find((it) => it.id === id && !it.corpse);
  if (!u) return sm;
  return { x: (u.rx != null ? u.rx : u.x) + (u.ox || 0), y: (u.ry != null ? u.ry : u.y) + (u.oy || 0), moving: false };
}
function unitAt(units, id) {
  const u = (units || []).find((it) => it.id === id && !it.corpse);
  if (!u) return null;
  return { x: (u.rx != null ? u.rx : u.x) + (u.ox || 0) + 0.5, y: (u.ry != null ? u.ry : u.y) + (u.oy || 0) + 0.5 };
}

// =================================================================== ขั้น 3: มอนสเตอร์ (magitek = ภาพ /eos/img/magitek.webp · beast = วาดด้วยโค้ด) + ยานลำเลียง
const MOB_MS = 1000;
const MOB_HEAD = new Map(), MOB_LAST = new Map(); // id → ทิศที่หัน (พิกัดกระดาน) · ตำแหน่งเฟรมก่อน
function mobFacing(id, pos) {
  const l = MOB_LAST.get(id);
  if (l && Math.abs(pos.x - l.x) + Math.abs(pos.y - l.y) > 0.002) MOB_HEAD.set(id, { dx: pos.x - l.x, dy: pos.y - l.y });
  MOB_LAST.set(id, { x: pos.x, y: pos.y });
  return MOB_HEAD.get(id) || { dx: 1, dy: 0 };
}
// ทิศบนกระดาน → หันซ้าย/ขวาบนจอ (ตามมุมกล้องที่หมุนได้)
const screenFace = (x, y, h) => (P(x + h.dx, y + h.dy)[0] - P(x, y)[0] >= 0 ? 1 : -1);
function mobAttackOf(id, now) {
  const e = lastFx("mob_attack");
  if (!e || !Array.isArray(e.attacks)) return null;
  const a = e.attacks.find((it) => it.id === id);
  if (!a) return null;
  const p = fxT(e, now, fx.mob_attack);
  return p < 1 ? { a, p } : null;
}
// หลอดเลือด/เกราะของปีศาจ/ศัตรู AI — แบบเดียวกับหมากผู้เล่น (boardDraw drawVitalBar) ขนาดตามช่อง (ผู้ใช้แจ้ง 2026-11-09: จุดแดงลอยอ่านไม่ออก)
function hpPips(g, x, y, z, hp, maxHp, armor, maxArmor = armor) {
  const top = P(x, y, z), s = top[2], UK = Math.max(0.35, s * 0.0085);
  drawVitalBar(g, top[0], top[1], s * 0.62, { hp, maxHp: Math.max(1, maxHp || 5), armor, maxArmor: Math.max(armor || 0, maxArmor || 0) }, UK);
  return top;
}
// สัตว์ยักษ์มีเขา (สูง ≈ 1.8 ช่อง) · พิกัดจอที่เท้า · face = 1 หันขวา / -1 หันซ้าย
function drawBeast(g, sx, sy, s, face, now, moving, lowQ, alpha = 1, sink = 0) {
  const u = s, wk = moving && !lowQ ? now / 120 : 0, br = lowQ ? 0 : Math.sin(now / 650) * 0.02;
  g.save(); g.globalAlpha *= alpha; g.translate(sx, sy + sink * u); g.scale(face, 1);
  const L = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo(a * u, b * u) : g.moveTo(a * u, b * u))); g.closePath(); g.fill(); };
  const leg = (lx, ph, col) => {
    const sw = moving ? Math.sin(wk + ph) * 0.1 : 0, lift = moving ? Math.max(0, Math.sin(wk + ph + 1.6)) * 0.05 : 0;
    L([[lx - 0.15, -0.95], [lx + 0.15, -0.95], [lx + 0.1 + sw, -0.05 - lift], [lx - 0.12 + sw, -0.05 - lift]], col);
    g.fillStyle = "#120a0e"; g.beginPath(); g.ellipse((lx - 0.01 + sw) * u, (-0.05 - lift) * u, 0.15 * u, 0.055 * u, 0, 0, TAU); g.fill();
    g.fillStyle = "#d8cbb8";
    for (const c of [-0.07, 0.02, 0.1]) L([[lx + c + sw, -0.08 - lift], [lx + c + sw + 0.08, -0.03 - lift], [lx + c + sw + 0.01, -0.02 - lift]], "#d8cbb8");
  };
  // ขาฝั่งไกล + หาง
  leg(-0.4, 0, "#1c1118"); leg(0.36, Math.PI, "#1c1118");
  g.strokeStyle = "#2a1822"; g.lineWidth = 0.09 * u; g.lineCap = "round";
  g.beginPath(); g.moveTo(-0.5 * u, -1.08 * u); g.quadraticCurveTo(-0.95 * u, (-1.12 + br * 3) * u, -0.9 * u, -0.62 * u); g.stroke(); g.lineCap = "butt";
  g.fillStyle = "#3a2030"; g.beginPath(); g.ellipse(-0.9 * u, -0.58 * u, 0.07 * u, 0.1 * u, 0, 0, TAU); g.fill();
  // ลำตัว (ขนม่วงอมน้ำตาล ไล่เงา บนสว่าง → ล่างเข้ม) + หนอกไหล่
  const gr = g.createLinearGradient(0, -1.6 * u, 0, -0.62 * u);
  gr.addColorStop(0, "#7a5470"); gr.addColorStop(0.45, "#4a2c44"); gr.addColorStop(1, "#22131d");
  g.fillStyle = gr;
  g.beginPath(); g.ellipse(-0.05 * u, (-1.0 - br) * u, 0.6 * u, (0.4 + br) * u, 0, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(0.26 * u, (-1.22 - br) * u, 0.38 * u, 0.36 * u, -0.3, 0, TAU); g.fill();
  g.fillStyle = "rgba(130,90,60,.3)"; g.beginPath(); g.ellipse(0, -0.76 * u, 0.42 * u, 0.1 * u, 0, 0, TAU); g.fill();
  // แผงขนแข็งตามสันหลัง
  for (let i = 0; i < 7; i++) {
    const t = i / 6, bx = -0.5 + t * 0.92, by = -1.32 - Math.sin(t * Math.PI) * 0.28 - br;
    L([[bx - 0.07, by + 0.07], [bx + 0.02, by - 0.18 - (i % 2) * 0.07], [bx + 0.08, by + 0.08]], "#2a1626");
  }
  if (!lowQ) { // ลายขน
    g.strokeStyle = "rgba(18,6,14,.45)"; g.lineWidth = Math.max(1, u * 0.015);
    for (let i = 0; i < 10; i++) {
      const fx0 = -0.5 + hash(i, 3) * 0.9, fy0 = -1.25 + hash(i, 4) * 0.4;
      g.beginPath(); g.moveTo(fx0 * u, fy0 * u); g.quadraticCurveTo((fx0 - 0.04) * u, (fy0 + 0.06) * u, (fx0 - 0.02) * u, (fy0 + 0.12) * u); g.stroke();
    }
  }
  // ขาฝั่งใกล้
  leg(-0.26, Math.PI, "#3a2434"); leg(0.5, 0, "#3a2434");
  // หัว (ก้มต่ำหน้าไหล่) + เขา
  const hx = 0.72, hy = -1.02 - br;
  const horn = (ox, col) => {
    g.fillStyle = col; g.beginPath();
    g.moveTo((hx - 0.12 + ox) * u, (hy - 0.12) * u);
    g.bezierCurveTo((hx - 0.58 + ox) * u, (hy - 0.45) * u, (hx - 0.38 + ox) * u, (hy - 0.88) * u, (hx + 0.12 + ox) * u, (hy - 0.78) * u);
    g.bezierCurveTo((hx - 0.22 + ox) * u, (hy - 0.7) * u, (hx - 0.36 + ox) * u, (hy - 0.4) * u, (hx + 0.06 + ox) * u, (hy - 0.16) * u);
    g.closePath(); g.fill();
  };
  horn(-0.12, "#7a6a54");
  L([[hx - 0.2, hy - 0.2], [hx + 0.12, hy - 0.22], [hx + 0.3, hy - 0.05], [hx + 0.28, hy + 0.12], [hx + 0.05, hy + 0.18], [hx - 0.2, hy + 0.12]], "#3e2638");
  L([[hx - 0.05, hy + 0.1], [hx + 0.26, hy + 0.12], [hx + 0.2, hy + 0.25], [hx - 0.02, hy + 0.22]], "#24141f");
  g.strokeStyle = "#e8dcc4"; g.lineWidth = 0.035 * u; g.lineCap = "round";
  g.beginPath(); g.moveTo((hx + 0.2) * u, (hy + 0.16) * u); g.quadraticCurveTo((hx + 0.34) * u, (hy + 0.12) * u, (hx + 0.32) * u, (hy - 0.02) * u); g.stroke();
  g.lineCap = "butt";
  horn(0.04, "#d9cbaa");
  g.strokeStyle = "rgba(90,70,50,.6)"; g.lineWidth = Math.max(1, u * 0.012);
  const bz = (t, a, b, c, d) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d;
  for (let i = 1; i < 6; i++) { // วงเขา (ตามแนวกลางเขา)
    const k = i / 6.5, px = bz(k, hx - 0.05, hx - 0.36, hx - 0.33, hx + 0.16), py = bz(k, hy - 0.14, hy - 0.42, hy - 0.79, hy - 0.78), w = 0.06 * (1 - k * 0.7);
    g.beginPath(); g.moveTo((px - w) * u, (py - w * 0.3) * u); g.lineTo((px + w) * u, (py + w * 0.3) * u); g.stroke();
  }
  // ตาเรือง
  const ex = (hx + 0.17) * u, ey = (hy - 0.05) * u;
  glowAt(g, ex, ey, 0.24 * u, "255,180,50", 0.9);
  g.fillStyle = "#ffe27a"; g.beginPath(); g.ellipse(ex, ey, 0.045 * u, 0.025 * u, -0.2, 0, TAU); g.fill();
  g.restore();
}

const shipsOf = (fd) => (Array.isArray(fd.ships) ? fd.ships : fd.dropship ? [fd.dropship] : []);
// หีบสมบัติ: กล่องไม้ขอบทอง แสงทองระยิบ (เด้งเบาๆ ให้เห็นจากไกล)
function drawChest(g, cx, cy, now, night, lowQ) {
  const z = lowQ ? 0 : Math.abs(Math.sin(now / 520 + cx)) * 0.05;
  const [sx, sy, s] = P(cx, cy);
  g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.ellipse(sx, sy, s * 0.32, s * 0.12, 0, 0, TAU); g.fill();
  box(g, cx - 0.26, cy - 0.18, cx + 0.26, cy + 0.18, 0.3 + z, "#8a5326", "#4a2a10", "#6e3f1a", z);
  box(g, cx - 0.27, cy - 0.19, cx + 0.27, cy + 0.19, 0.42 + z, "#a8652e", "#5a3313", "#7d4820", 0.3 + z);
  for (const k of [-0.15, 0.15]) box(g, cx + k - 0.03, cy - 0.2, cx + k + 0.03, cy + 0.2, 0.43 + z, "#f2c94c", "#9a7417", "#c99a22", 0.02 + z);
  const lock = P(cx, cy + 0.2, 0.3 + z);
  g.fillStyle = "#ffe27a"; g.fillRect(lock[0] - 2.5, lock[1] - 3, 5, 6);
  const top = P(cx, cy, 0.6 + z);
  glowAt(g, top[0], top[1], s * 0.55, "255,215,90", (night ? 0.55 : 0.32) + 0.15 * Math.sin(now / 300));
  if (!lowQ) for (let i = 0; i < 3; i++) {
    const k = ((now / 900) + i / 3) % 1, ang = i * 2.1 + now / 1400;
    g.fillStyle = "rgba(255,240,170," + (1 - k) + ")";
    g.fillRect(top[0] + Math.cos(ang) * s * 0.25, top[1] - k * s * 0.5, 2, 2);
  }
}
// ---------- ยานลำเลียง (2×2 · ลอย z ≈ 1.2) ----------
const DROP_Z = 1.2;
function dropZ(ds, now) {
  const e = LAST_FD && Array.isArray(LAST_FD.fx) ? LAST_FD.fx.slice().reverse().find((ev) => ev.kind === "dropship_land" && ev.x === ds.x && ev.y === ds.y) : null;
  if (!e) return DROP_Z;
  const k = fxT(e, now, fx.dropship_land);
  return k < 1 ? DROP_Z + (1 - ease(Math.min(1, k / 0.65))) * 7 : DROP_Z;
}
function drawDropship(g, x, y, z, now, lowQ, alpha = 1) {
  const b = z + (lowQ ? 0 : Math.sin(now / 700) * 0.05), cx = x + 1, cy = y + 1;
  g.save(); g.globalAlpha *= alpha;
  // ไอพ่นใต้เครื่องยนต์
  for (const ex of [-0.83, 0.83]) {
    const top = P(cx + ex, cy - 0.03, b), bot = P(cx + ex, cy - 0.03, Math.max(0, b - 0.9));
    const gr = g.createLinearGradient(top[0], top[1], bot[0], bot[1]);
    gr.addColorStop(0, "rgba(255,170,90,.55)"); gr.addColorStop(1, "rgba(255,120,60,0)");
    g.fillStyle = gr; g.beginPath(); g.moveTo(top[0] - top[2] * 0.12, top[1]); g.lineTo(top[0] + top[2] * 0.12, top[1]); g.lineTo(bot[0] + bot[2] * 0.2, bot[1]); g.lineTo(bot[0] - bot[2] * 0.2, bot[1]); g.closePath(); g.fill();
    glowAt(g, top[0], top[1], top[2] * 0.55, "255,150,80", 0.8);
  }
  // [x0, y0, x1, y1, z0, z1, top, side1, side2]
  const sub = [
    [cx - 1.0, cy - 0.38, cx - 0.66, cy + 0.32, b + 0.04, b + 0.3, "#3a3f46", "#1a1d21", "#2a2e34"], // เครื่องยนต์ซ้าย
    [cx + 0.66, cy - 0.38, cx + 1.0, cy + 0.32, b + 0.04, b + 0.3, "#3a3f46", "#1a1d21", "#2a2e34"], // เครื่องยนต์ขวา
    [cx - 0.36, cy + 0.72, cx + 0.36, cy + 0.98, b + 0.06, b + 0.32, "#1b222b", "#0e1216", "#161b21"], // หัว (ห้องนักบิน)
    [cx - 0.95, cy - 1.0, cx + 0.95, cy - 0.84, b + 0.3, b + 0.38, "#4a5058", "#22262b", "#33383e"], // ปีกท้าย
  ];
  const part = (q) => box(g, q[0], q[1], q[2], q[3], q[5], q[6], q[7], q[8], q[4]);
  const hd = depthOf(cx, cy - 0.06), dOf = (q) => depthOf((q[0] + q[2]) / 2, (q[1] + q[3]) / 2);
  sub.filter((q) => dOf(q) < hd).forEach(part);
  part([cx - 0.66, cy - 0.84, cx + 0.66, cy + 0.72, b, b + 0.42, "#5c626a", "#2a2e34", "#40454c"]); // ลำตัว
  part([cx - 0.2, cy - 0.7, cx + 0.2, cy + 0.42, b + 0.42, b + 0.6, "#4a5058", "#24282e", "#34393f"]); // สันหลัง
  sub.filter((q) => dOf(q) >= hd).forEach(part);
  // แนวแผ่นเกราะ + กระจกห้องนักบินเรืองแดง
  g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 1;
  for (const yy of [-0.35, 0.25]) { const a = P(cx - 0.66, cy + yy, b + 0.42), c = P(cx - 0.2, cy + yy, b + 0.42), d = P(cx + 0.2, cy + yy, b + 0.42), e = P(cx + 0.66, cy + yy, b + 0.42); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(c[0], c[1]); g.moveTo(d[0], d[1]); g.lineTo(e[0], e[1]); g.stroke(); }
  poly(g, [[cx - 0.3, cy + 0.76, b + 0.33], [cx + 0.3, cy + 0.76, b + 0.33], [cx + 0.24, cy + 0.95, b + 0.33], [cx - 0.24, cy + 0.95, b + 0.33]]);
  g.fillStyle = "rgba(255,60,40,.4)"; g.fill();
  // ไฟแดงกะพริบตามมุม
  const on = Math.sin(now / 260) > 0;
  for (const [lx, ly, lz] of [[cx - 1.0, cy, b + 0.3], [cx + 1.0, cy, b + 0.3], [cx - 0.95, cy - 0.92, b + 0.38], [cx + 0.95, cy - 0.92, b + 0.38], [cx, cy + 0.98, b + 0.3]]) {
    const q = P(lx, ly, lz);
    g.fillStyle = on ? "#ff3a28" : "#5a1410"; g.beginPath(); g.arc(q[0], q[1], Math.max(1.2, q[2] * 0.03), 0, TAU); g.fill();
    if (on) glowAt(g, q[0], q[1], q[2] * 0.3, "255,50,30", 0.75);
  }
  g.restore();
}

// =================================================================== ขั้น 4: เดินทาง + เก็บของ (server/fodlan/stage6.js "ขั้น 4" · ผัง map6 RAIL_Y / STATIONS / TUNNELS / DOCKS / CAMPS / FISH / TOMBS)
//  อบลงพื้น (theme.base → bakeP4): รางรถไฟ (หินโรยทาง หมอนไม้ รางเหล็ก · ทางข้ามถนน) · พื้นชานชาลา · สะพานท่าเรือ/ท่าตกปลา · ลานแคมป์ · ดินหน้าอุโมงค์
//  วาดทุกเฟรม (items — เรียงความลึกกับตัวละคร): หลังคาชานชาลา · เสาสัญญาณทางข้าม · เนินเขา+ซุ้มอุโมงค์ · กอนโดลาจอด · เต็นท์/กองไฟ/หินรูน · คันเบ็ด · ขบวนรถไฟ · กอนโดลาที่แล่น
//  สุสานราชวงศ์ = สิ่งกีดขวาง (drawObstacle → drawTomb) · ฉากเหตุการณ์ใน air (p4Fx)
const RAIL_Y = 20;
const MAP_W = (MAPS[EOS_AREA] && MAPS[EOS_AREA].cols) || 32, MAP_H = (MAPS[EOS_AREA] && MAPS[EOS_AREA].rows) || 32;
const P4_AT = (() => {
  const m = MAPS[EOS_AREA], out = {};
  if (!m) return out;
  const add = (kind, k) => { const [x, y] = k.split(",").map(Number); (out[kind] ||= []).push({ x, y }); };
  for (const [k, kind] of Object.entries(m.special || {})) add(kind, k);
  for (const [k, kind] of Object.entries(m.terrain || {})) if (kind === "fd_eos_tomb") add(kind, k);
  return out;
})();
const p4List = (kind) => P4_AT[kind] || [];
const LAKE_SET = new Set(TILES.water.map((t) => K(t.x, t.y)));
const WET_SET = new Set([...TILES.water, ...TILES.shallow, ...TILES.canal].map((t) => K(t.x, t.y)));
const WAY_SET = new Set([...TILES.canal, ...TILES.bridge, ...TILES.water].map((t) => K(t.x, t.y))); // ทางน้ำของกอนโดลา
const unitVec = (dx, dy) => { const L = Math.hypot(dx, dy) || 1; return [dx / L, dy / L]; };
function nearestIn(set, x, y, r) {
  let best = null;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (!(dx || dy) || !set.has(K(x + dx, y + dy))) continue;
    const d = Math.hypot(dx, dy) + (dx && dy ? 0.05 : 0);
    if (!best || d < best.d) best = { x: x + dx, y: y + dy, d };
  }
  return best;
}
const STATIONS4 = p4List("fd_eos_station").map((t) => ({ ...t, rd: Math.sign(RAIL_Y - t.y) || 1 }));
// ปากอุโมงค์หันออกหาที่โล่ง (เนินเขาอยู่ด้านหลัง) — ขอบแผนที่ = เนินอยู่นอกกระดาน
const TUNNEL_FACE = { "6,4": [0, 1], "0,18": [1, 0], "14,12": [0, -1], "20,31": [0, -1] };
const TUNNELS4 = p4List("fd_eos_tunnel").map((t) => ({
  ...t, f: TUNNEL_FACE[K(t.x, t.y)] || (t.x === 0 ? [1, 0] : t.x === MAP_W - 1 ? [-1, 0] : t.y === 0 ? [0, 1] : t.y === MAP_H - 1 ? [0, -1] : [0, 1]),
}));
// ท่ากอนโดลา: ช่องน้ำที่ใกล้ที่สุด = ที่จอดเรือ · ลำเรือตามแนวคลอง
const DOCKS4 = p4List("fd_eos_dock").map((t) => {
  const w = nearestIn(WAY_SET, t.x, t.y, 2) || { x: t.x, y: t.y + 1 }, d = unitVec(w.x - t.x, w.y - t.y);
  const hz = CANAL_SET.has(K(w.x - 1, w.y)) || CANAL_SET.has(K(w.x + 1, w.y)), vt = CANAL_SET.has(K(w.x, w.y - 1)) || CANAL_SET.has(K(w.x, w.y + 1));
  const ang = hz && !vt ? 0 : vt && !hz ? Math.PI / 2 : Math.atan2(d[1], d[0]) + Math.PI / 2;
  return { ...t, moor: w, d, ang, bx: w.x + 0.5 - d[0] * 0.12, by: w.y + 0.5 - d[1] * 0.12 };
});
const CAMPS4 = p4List("fd_eos_camp");
// จุดตกปลา: ทุ่นลอยในน้ำลึกที่ใกล้ที่สุด (ไม่มี = น้ำตื้น)
const FISH4 = p4List("fd_eos_fish").map((t) => {
  const w = nearestIn(LAKE_SET, t.x, t.y, 2) || nearestIn(WET_SET, t.x, t.y, 3) || { x: t.x - 1, y: t.y }, d = unitVec(w.x - t.x, w.y - t.y);
  const dist = Math.min(1.7, Math.hypot(w.x - t.x, w.y - t.y) * 0.85);
  return { ...t, d, bob: { x: t.x + 0.5 + d[0] * dist, y: t.y + 0.5 + d[1] * dist } };
});
// สุสาน: ประตูหันเข้ากลางแผนที่
const TOMBS4 = p4List("fd_eos_tomb").map((t) => { const dx = 15.5 - t.x, dy = 15.5 - t.y; return { ...t, f: Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy) || 1] }; });
const tombAt = (x, y) => TOMBS4.find((t) => t.x === x && t.y === y) || { x, y, f: [0, 1] };
// ทางข้ามถนนบนราง (ถนนแนวเหนือ-ใต้ตัดราง) + เสาสัญญาณมุมทแยงของแต่ละทาง
const CROSSINGS = (() => {
  const out = [];
  let a = null;
  for (let x = 0; x <= MAP_W; x++) {
    const road = x < MAP_W && ROAD_SET.has(K(x, RAIL_Y));
    if (road && a === null) a = x;
    if (!road && a !== null) { out.push({ a, b: x }); a = null; }
  }
  return out;
})();
const SIGNALS = CROSSINGS.flatMap((c) => [{ x: c.a - 0.14, y: RAIL_Y - 0.14 }, { x: c.b + 0.14, y: RAIL_Y + 1.14 }]);
function unitOf(units, id) {
  const u = (units || []).find((it) => it.id === id && !it.corpse);
  if (!u) return null;
  return { x: (u.rx != null ? u.rx : u.x) + (u.ox || 0) + 0.5, y: (u.ry != null ? u.ry : u.y) + (u.oy || 0) + 0.5, color: hex6(u.color, "#d8dde6") };
}
const occupied = (units) => { const s = new Set(); for (const u of units || []) if (!u.corpse) s.add(K(Math.round(u.rx != null ? u.rx : u.x), Math.round(u.ry != null ? u.ry : u.y))); return s; };
const activeOf = (fd, now, kind) => fxActive(fd, now).map(p4Norm).filter((e) => e.kind === kind);
// server ctx.fx = { kind, ...data } → data.kind ทับชื่อเหตุการณ์ของ camp_meal ("atk"/"mend"/"mov") และ hunt_board/hunt_done ("daemon"/"beast"/"magitek"/"player")
//  แปลงกลับเป็นชื่อเหตุการณ์ (meal / bounty = ชนิดเดิม) · รูปแบบที่ถูก { kind: "camp_meal", meal } ก็ใช้ได้
const MEAL_KINDS = new Set(["atk", "mend", "mov"]), BOUNTY_KINDS = new Set(["daemon", "beast", "magitek", "player"]);
function p4Norm(e) {
  if (!e) return e;
  if (MEAL_KINDS.has(e.kind)) return { ...e, kind: "camp_meal", meal: e.kind };
  if (BOUNTY_KINDS.has(e.kind)) return { ...e, kind: "gold" in e ? "hunt_done" : "hunt_board", bounty: e.kind };
  return e;
}

// ---------- อบลงพื้น ----------
function bakeRail(g, C) {
  const y = RAIL_Y, x0 = -1, x1 = MAP_W + 1, isX = (x) => CROSSINGS.some((c) => x >= c.a && x < c.b);
  const segs = [];
  for (let x = x0; x < x1; x++) if (!isX(x)) segs.push(x);
  const strip = (ya, yb, za, zb) => { g.beginPath(); for (const x of segs) { const a = P(x - 0.01, ya, za), b = P(x + 1.01, ya, za), c = P(x + 1.01, yb, zb), d = P(x - 0.01, yb, zb); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); } };
  // หินโรยทาง: เงาข้าง → ลาดเหนือ (รับแสง) → ลาดใต้ → หลังคันทาง
  strip(y + 0.0, y + 1.0, 0, 0); g.fillStyle = "rgba(0,0,0,.2)"; g.fill();
  strip(y + 0.04, y + 0.15, 0, 0.05); g.fillStyle = C.ballast; g.fill();
  strip(y + 0.85, y + 0.96, 0.05, 0); g.fillStyle = C.ballast2; g.fill();
  strip(y + 0.15, y + 0.85, 0.05, 0.05); g.fillStyle = mix(C.ballast, C.ballast2, 0.35); g.fill();
  if (!FAST) { // เม็ดหิน
    const R = rng(4411);
    for (const col of [C.ballast, C.ballast2, "#2e2b28"]) {
      g.fillStyle = col; g.beginPath();
      for (const x of segs) for (let i = 0; i < 12; i++) { const p = P(x + R(), y + 0.12 + R() * 0.76, 0.05); g.rect(p[0], p[1], Math.max(1, p[2] * 0.02), Math.max(1, p[2] * 0.014)); }
      g.fill();
    }
  }
  // ทางข้ามถนน: แผ่นยางระหว่างราง + เส้นหยุด
  for (const c of CROSSINGS) {
    poly(g, [[c.a, y + 0.22, 0.01], [c.b, y + 0.22, 0.01], [c.b, y + 0.78, 0.01], [c.a, y + 0.78, 0.01]]); g.fillStyle = "rgba(28,28,32,.55)"; g.fill();
    for (const yy of [y - 0.12, y + 1.08]) { poly(g, [[c.a + 0.08, yy, 0.005], [c.b - 0.08, yy, 0.005], [c.b - 0.08, yy + 0.04, 0.005], [c.a + 0.08, yy + 0.04, 0.005]]); g.fillStyle = C.roadLine; g.fill(); }
  }
  // หมอนรองราง
  g.beginPath();
  for (let sx = x0 + 0.17; sx < x1; sx += 0.34) {
    if (isX(Math.floor(sx))) continue;
    const a = P(sx - 0.055, y + 0.19, 0.06), b = P(sx + 0.055, y + 0.19, 0.06), c = P(sx + 0.055, y + 0.81, 0.06), d = P(sx - 0.055, y + 0.81, 0.06);
    g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath();
  }
  g.fillStyle = C.sleeper; g.fill();
  // รางเหล็ก 2 เส้น: ข้างรางที่หันกล้อง + หลังรางวาว (ทีละช่อง — กล้องใกล้ไม่ฉายเส้นยาวข้ามหลังกล้อง)
  for (const ry of [y + 0.36, y + 0.64]) {
    const n = faceVisible(0, 1, MAP_W / 2, ry + 0.02) ? 1 : -1;
    g.beginPath();
    for (let x = x0; x < x1; x++) { const a = P(x, ry + n * 0.022, 0.05), b = P(x + 1, ry + n * 0.022, 0.05), c = P(x + 1, ry + n * 0.022, 0.095), d = P(x, ry + n * 0.022, 0.095); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); }
    g.fillStyle = C.rail; g.fill();
    g.beginPath();
    for (let x = x0; x < x1; x++) { const a = P(x, ry - 0.022, 0.095), b = P(x + 1, ry - 0.022, 0.095), c = P(x + 1, ry + 0.022, 0.095), d = P(x, ry + 0.022, 0.095); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); }
    g.fillStyle = C.railHi; g.fill();
  }
}
// สะพานไม้ยื่นลงน้ำ (ท่ากอนโดลา / ท่าตกปลา) · d = ทิศไปหาน้ำ
function bakePier(g, cx, cy, d, len, w, C) {
  const n = [-d[1], d[0]], z = 0.055, s0 = -0.08, pt = (u, v, zz = z) => [cx + d[0] * u + n[0] * v, cy + d[1] * u + n[1] * v, zz];
  for (const sg of [-1, 1]) {
    const m = pt((s0 + len) / 2, sg * w);
    if (faceVisible(n[0] * sg, n[1] * sg, m[0], m[1])) { poly(g, [pt(s0, sg * w, -0.04), pt(len, sg * w, -0.04), pt(len, sg * w), pt(s0, sg * w)]); g.fillStyle = shadeCol(C.bridge, -0.4); g.fill(); }
  }
  const e = pt(len, 0);
  if (faceVisible(d[0], d[1], e[0], e[1])) { poly(g, [pt(len, -w, -0.04), pt(len, w, -0.04), pt(len, w), pt(len, -w)]); g.fillStyle = shadeCol(C.bridge, -0.45); g.fill(); }
  poly(g, [pt(s0, -w), pt(len, -w), pt(len, w), pt(s0, w)]); g.fillStyle = C.bridge; g.fill();
  g.strokeStyle = "rgba(0,0,0,.32)"; g.lineWidth = 1; g.beginPath();
  for (let u = s0 + 0.09; u < len; u += 0.09) { const a = P(...pt(u, -w)), b = P(...pt(u, w)); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }
  g.stroke();
  for (const v of [-w, w]) { const [px, py] = pt(len - 0.03, v); box(g, px - 0.028, py - 0.028, px + 0.028, py + 0.028, 0.17, shadeCol(C.bridge, -0.2), shadeCol(C.bridge, -0.5), shadeCol(C.bridge, -0.35), -0.02); }
}
function bakeP4(g, C, night) {
  bakeRail(g, C);
  // ชานชาลา: พื้นคอนกรีตยกต่ำ + เส้นเหลืองริมราง + แนวแผ่นปู
  for (const t of STATIONS4) {
    box(g, t.x - 0.08, t.y + 0.06, t.x + 1.08, t.y + 0.98, 0.09, C.platform, C.platform2, C.platform);
    const ey = t.rd > 0 ? t.y + 0.86 : t.y + 0.14;
    poly(g, [[t.x - 0.06, ey, 0.092], [t.x + 1.06, ey, 0.092], [t.x + 1.06, ey + 0.05 * t.rd, 0.092], [t.x - 0.06, ey + 0.05 * t.rd, 0.092]]); g.fillStyle = night ? "#7d6a24" : "#e2c13a"; g.fill();
    if (!FAST) { g.strokeStyle = "rgba(0,0,0,.14)"; g.lineWidth = 1; g.beginPath(); for (let u = 0.2; u < 1.1; u += 0.27) { const a = P(t.x - 0.08 + u, t.y + 0.07, 0.092), b = P(t.x - 0.08 + u, t.y + 0.97, 0.092); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); } g.stroke(); }
  }
  for (const t of DOCKS4) bakePier(g, t.x + 0.5, t.y + 0.5, t.d, Math.max(0.55, Math.hypot(t.moor.x - t.x, t.moor.y - t.y) - 0.15), 0.2, C);
  for (const t of FISH4) bakePier(g, t.x + 0.5, t.y + 0.5, t.d, 0.62, 0.13, C);
  // ลานแคมป์ (ดินอัด + วงรูนจาง — เรืองจริงวาดใน ground)
  for (const t of CAMPS4) {
    gEllipse(g, t.x + 0.5, t.y + 0.5, 0.48, 0, 30); g.fillStyle = hexA(C.dirt, 0.6); g.fill();
    gEllipse(g, t.x + 0.5, t.y + 0.5, 0.38, 0.004, 30); g.strokeStyle = night ? "rgba(110,170,255,.35)" : "rgba(90,140,200,.3)"; g.lineWidth = 1.5; g.stroke();
  }
  // หน้าอุโมงค์: ดินทางเดิน + เงามืดที่ปาก
  for (const t of TUNNELS4) {
    const cx = t.x + 0.5, cy = t.y + 0.5, [fx, fy] = t.f;
    gEllipse(g, cx + fx * 0.05, cy + fy * 0.05, 0.42, 0, 26, 0.42); g.fillStyle = hexA(C.dirt, 0.55); g.fill();
    gEllipse(g, cx - fx * 0.12, cy - fy * 0.12, 0.28, 0.002, 20); g.fillStyle = "rgba(0,0,0,.3)"; g.fill();
  }
}

// ---------- ชานชาลา (หลังคา เสา ไฟ ม้านั่ง ป้าย ไฟสัญญาณ) ----------
function drawStation(g, t, night, now, warn) {
  const rd = t.rd, cx = t.x + 0.5, cy = t.y + 0.5, yb = cy - rd * 0.42, yf = cy + rd * 0.06, py = cy - rd * 0.3;
  const post = night ? "#22252b" : "#363b44", roof = night ? "#2b323b" : "#5c6874";
  box(g, t.x + 0.2, py - 0.03, t.x + 0.36, py + 0.03, 0.2, "#6b4a2c", "#3e2a18", "#55391f", 0.09); // ม้านั่ง
  box(g, t.x + 0.64, py - 0.03, t.x + 0.8, py + 0.03, 0.2, "#6b4a2c", "#3e2a18", "#55391f", 0.09);
  for (const px of [t.x + 0.1, t.x + 0.9]) box(g, px - 0.025, py - 0.025, px + 0.025, py + 0.025, 0.98, post, shadeCol(post, -0.3), post, 0.09);
  // ป้ายชื่อสถานี (แผ่นน้ำเงินแถบขาว — ไม่มีตัวอักษร)
  const sp = (u, z) => P(t.x + u, py + rd * 0.03, z), q = [sp(0.3, 0.86), sp(0.7, 0.86), sp(0.7, 0.76), sp(0.3, 0.76)];
  g.fillStyle = "#1c3d6e"; g.beginPath(); q.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
  g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = 1; g.stroke();
  const m0 = sp(0.34, 0.81), m1 = sp(0.66, 0.81); g.beginPath(); g.moveTo(m0[0], m0[1]); g.lineTo(m1[0], m1[1]); g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = Math.max(1, m0[2] * 0.012); g.stroke();
  // หลังคาลาด
  const top = [[t.x - 0.04, yb, 1.03], [t.x + 1.04, yb, 1.03], [t.x + 1.04, yf, 0.93], [t.x - 0.04, yf, 0.93]];
  const fe = [[t.x - 0.04, yf, 0.93], [t.x + 1.04, yf, 0.93], [t.x + 1.04, yf, 0.88], [t.x - 0.04, yf, 0.88]];
  if (faceVisible(0, rd, cx, yf)) { poly(g, fe); g.fillStyle = shadeCol(roof, -0.35); g.fill(); }
  poly(g, top); g.fillStyle = roof; g.fill(); g.strokeStyle = "rgba(255,255,255,.18)"; g.lineWidth = 1; g.stroke();
  g.strokeStyle = "rgba(0,0,0,.22)"; g.beginPath(); // ลอนหลังคาเหล็ก
  for (let u = 0.1; u < 1.05; u += 0.12) { const a = P(t.x - 0.04 + u, yb, 1.031), b = P(t.x - 0.04 + u, yf, 0.931); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }
  g.stroke();
  // ไฟห้อยใต้หลังคา
  const lp = P(cx, yf - rd * 0.06, 0.84);
  g.fillStyle = night ? "#ffe6a8" : "#e6e0cc"; g.beginPath(); g.arc(lp[0], lp[1], Math.max(1.5, lp[2] * 0.03), 0, TAU); g.fill();
  if (night) { glowAt(g, lp[0], lp[1], lp[2] * 1.1, "255,215,140", 0.7); const fl = P(cx, cy, 0.09); glowAt(g, fl[0], fl[1], fl[2] * 0.9, "255,210,130", 0.35); }
  // ไฟสัญญาณปลายชานชาลา: เขียว / แดงกะพริบตอนรถไฟใกล้มา
  const sx = t.x + 1.0, sy = cy + rd * 0.32, b = P(sx, sy, 0.09), h = P(sx, sy, 0.62);
  g.strokeStyle = post; g.lineWidth = Math.max(1.5, b[2] * 0.025); g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(h[0], h[1]); g.stroke();
  g.fillStyle = "#121418"; g.beginPath(); g.arc(h[0], h[1], Math.max(2, h[2] * 0.045), 0, TAU); g.fill();
  const red = warn && Math.sin(now / 160) > 0, col = warn ? (red ? "255,50,40" : null) : "70,255,120";
  if (col) { g.fillStyle = `rgb(${col})`; g.beginPath(); g.arc(h[0], h[1], Math.max(1.2, h[2] * 0.028), 0, TAU); g.fill(); glowAt(g, h[0], h[1], h[2] * 0.4, col, night ? 0.9 : 0.55); }
}
// ---------- เสาสัญญาณทางข้าม (กากบาท + ไฟแดงสลับเมื่อรถไฟใกล้มา) ----------
function drawSignal(g, sx, sy, night, now, warn) {
  const b = P(sx, sy), t = P(sx, sy, 0.95), s = b[2];
  g.fillStyle = "rgba(0,0,0,.3)"; g.beginPath(); g.ellipse(b[0], b[1], s * 0.08, s * 0.03, 0, 0, TAU); g.fill();
  g.strokeStyle = night ? "#3a3d42" : "#d8dade"; g.lineWidth = Math.max(1.5, s * 0.03); g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(t[0], t[1]); g.stroke();
  const X = (u0, z0, u1, z1) => { const a = P(sx + u0, sy, z0), c = P(sx + u1, sy, z1); g.moveTo(a[0], a[1]); g.lineTo(c[0], c[1]); };
  g.beginPath(); X(-0.14, 0.78, 0.14, 0.94); X(-0.14, 0.94, 0.14, 0.78);
  g.strokeStyle = "#b8231a"; g.lineWidth = Math.max(2.5, s * 0.05); g.stroke();
  g.strokeStyle = night ? "#9a9da2" : "#ffffff"; g.lineWidth = Math.max(1, s * 0.022); g.stroke();
  const ph = Math.sin(now / 260) > 0;
  for (const [k, u] of [[0, -0.075], [1, 0.075]]) {
    const p = P(sx + u, sy, 0.6), on = warn && (k ? ph : !ph);
    g.fillStyle = "#101114"; g.beginPath(); g.arc(p[0], p[1], Math.max(2, s * 0.045), 0, TAU); g.fill();
    g.fillStyle = on ? "#ff3a28" : "#4a1410"; g.beginPath(); g.arc(p[0], p[1], Math.max(1.3, s * 0.03), 0, TAU); g.fill();
    if (on) glowAt(g, p[0], p[1], s * 0.45, "255,50,40", 0.9);
  }
}
// ---------- อุโมงค์: เนินเขา + ซุ้มหินโค้ง (หันออกหาที่โล่ง) ----------
function tunnelHill(g, t, night) {
  const [fx, fy] = t.f, ux = -fy, uy = fx, hx = t.x + 0.5 - fx * 0.6, hy = t.y + 0.5 - fy * 0.6, ru = 1.0, rf = 0.68, H = 1.0;
  const pts = [];
  for (let i = 0; i < 24; i++) for (let j = 0; j <= 4; j++) {
    const u = i / 24 * TAU, v = j / 4 * Math.PI / 2, a = Math.cos(v) * Math.cos(u) * ru, b = Math.cos(v) * Math.sin(u) * rf;
    const q = P(hx + ux * a + fx * b, hy + uy * a + fy * b, H * Math.sin(v) * (1 + 0.08 * Math.sin(u * 3)));
    pts.push([q[0], q[1]]);
  }
  const h = hull(pts), top = P(hx, hy, H), foot = P(hx, hy, 0);
  const gr = g.createLinearGradient(top[0], top[1] - top[2] * 0.2, foot[0], foot[1] + foot[2] * 0.3);
  gr.addColorStop(0, night ? "#2b3a2c" : "#7d9455"); gr.addColorStop(0.45, night ? "#24301f" : "#5f7a3c"); gr.addColorStop(1, night ? "#2a241c" : "#6e5a3c");
  g.beginPath(); h.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = gr; g.fill();
  if (!FAST) { // หินโผล่ + พุ่มหญ้าบนเนิน
    const R = rng(t.x * 31 + t.y * 7);
    for (let i = 0; i < 9; i++) {
      const u = R() * TAU, v = 0.25 + R() * 1.0, a = Math.cos(v) * Math.cos(u) * ru * 0.92, b = Math.cos(v) * Math.sin(u) * rf * 0.92;
      const q = P(hx + ux * a + fx * b, hy + uy * a + fy * b, H * Math.sin(v)), s = q[2];
      if (i % 3 === 0) { g.fillStyle = night ? "#3c3d40" : "#8d8b84"; g.beginPath(); g.ellipse(q[0], q[1], s * 0.08, s * 0.045, R(), 0, TAU); g.fill(); }
      else { g.fillStyle = night ? "#1b2a1c" : "#4c6a2c"; g.beginPath(); g.arc(q[0], q[1] - s * 0.03, s * (0.05 + R() * 0.04), 0, TAU); g.fill(); }
    }
  }
}
function tunnelPortal(g, t, night) {
  const [fx, fy] = t.f, ux = -fy, uy = fx, ox = t.x + 0.5 - fx * 0.14, oy = t.y + 0.5 - fy * 0.14;
  const sp = (u, z, out = 0) => P(ox + ux * u + fx * out, oy + uy * u + fy * out, z);
  const stone = night ? "#55575c" : "#9a968c", dark = night ? "#3a3c40" : "#6e6a62";
  // ผนังหน้า (กำแพงกันดิน) + ขอบบน
  const wall = [sp(-0.46, 0), sp(0.46, 0), sp(0.46, 0.58), sp(0.3, 0.7), sp(-0.3, 0.7), sp(-0.46, 0.58)];
  g.fillStyle = stone; g.beginPath(); wall.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
  g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 1; g.stroke();
  if (!FAST) { // แนวก้อนหิน
    g.strokeStyle = "rgba(0,0,0,.18)"; g.beginPath();
    for (let z = 0.14; z < 0.66; z += 0.14) { const a = sp(-0.45, z), b = sp(0.45, z); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }
    g.stroke();
  }
  // ช่องโค้ง: มืดลึก
  const arch = [];
  arch.push(sp(-0.24, 0));
  for (let i = 0; i <= 14; i++) { const a = Math.PI - i / 14 * Math.PI; arch.push(sp(Math.cos(a) * 0.24, 0.3 + Math.sin(a) * 0.24)); }
  arch.push(sp(0.24, 0));
  const c = sp(0, 0.25), gr = g.createRadialGradient(c[0], c[1] + c[2] * 0.1, 0, c[0], c[1], c[2] * 0.4);
  gr.addColorStop(0, "#000000"); gr.addColorStop(1, night ? "#0a0b0e" : "#1d1b19");
  g.fillStyle = gr; g.beginPath(); arch.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
  // หินโค้งรอบช่อง (voussoir) + หินหลักบนสุด
  g.strokeStyle = dark; g.lineWidth = Math.max(2, c[2] * 0.05); g.beginPath();
  for (let i = 0; i <= 14; i++) { const a = Math.PI - i / 14 * Math.PI, q = sp(Math.cos(a) * 0.27, 0.3 + Math.sin(a) * 0.27, 0.005); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }
  g.stroke();
  const k0 = sp(-0.05, 0.5, 0.01), k1 = sp(0.05, 0.5, 0.01), k2 = sp(0.06, 0.62, 0.01), k3 = sp(-0.06, 0.62, 0.01);
  g.fillStyle = shadeCol(stone, 0.15); g.beginPath(); g.moveTo(k0[0], k0[1]); g.lineTo(k1[0], k1[1]); g.lineTo(k2[0], k2[1]); g.lineTo(k3[0], k3[1]); g.closePath(); g.fill();
  // ตะเกียงสองข้าง
  for (const u of [-0.36, 0.36]) {
    const p = sp(u, 0.42, 0.03), s = p[2];
    g.fillStyle = "#1a1714"; g.fillRect(p[0] - s * 0.025, p[1] - s * 0.04, s * 0.05, s * 0.07);
    g.fillStyle = night ? "#ffcf7a" : "#d9c79a"; g.fillRect(p[0] - s * 0.016, p[1] - s * 0.03, s * 0.032, s * 0.045);
    if (night) glowAt(g, p[0], p[1], s * 0.55, "255,190,110", 0.75);
  }
}
function drawTunnel(g, t, night) {
  const [fx, fy] = t.f, front = faceVisible(fx, fy, t.x + 0.5 - fx * 0.14, t.y + 0.5 - fy * 0.14);
  if (front) { tunnelHill(g, t, night); tunnelPortal(g, t, night); } else tunnelHill(g, t, night);
}
// ---------- กอนโดลา (ลำดำขลับ ขอบทอง หัวเรือเหล็กหวี เบาะแดง) ----------
function drawGondola(g, cx, cy, ang, night, now, pass = null, alpha = 1) {
  const ca = Math.cos(ang), sa = Math.sin(ang), bob = Math.sin(now / 700 + cx * 3) * 0.012;
  const at = (u, v, z) => P(cx + ca * u - sa * v, cy + sa * u + ca * v, z + bob);
  const half = 0.46, W = (u) => 0.12 * Math.sqrt(Math.max(0, 1 - (u / 0.48) ** 2)), Z = (u) => 0.1 + 0.2 * Math.max(0, (Math.abs(u) - 0.26) / 0.2) ** 2;
  const N = 12, us = Array.from({ length: N + 1 }, (_, i) => -half + (i / N) * half * 2);
  g.save(); g.globalAlpha *= alpha;
  const sh = at(0, 0, -0.01);
  g.fillStyle = "rgba(0,10,20,.35)"; g.beginPath(); g.ellipse(sh[0], sh[1], sh[2] * 0.42, sh[2] * 0.1, 0, 0, TAU); g.fill();
  const hullC = night ? "#07080a" : "#121418", trim = night ? "#8a6f2e" : "#d0a94a";
  // ดาดฟ้า (ด้านใน) แล้วข้างลำที่หันกล้อง
  g.fillStyle = night ? "#20160f" : "#3d2a1b"; g.beginPath();
  us.forEach((u, i) => { const p = at(u, -W(u), Z(u)); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); });
  us.slice().reverse().forEach((u) => { const p = at(u, W(u), Z(u)); g.lineTo(p[0], p[1]); });
  g.closePath(); g.fill();
  const side = faceVisible(-sa, ca, cx, cy) ? 1 : -1;
  g.fillStyle = hullC; g.beginPath();
  us.forEach((u, i) => { const p = at(u, side * W(u), Z(u)); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); });
  us.slice().reverse().forEach((u) => { const p = at(u * 0.92, side * W(u) * 0.8, 0.0); g.lineTo(p[0], p[1]); });
  g.closePath(); g.fill();
  g.strokeStyle = trim; g.lineWidth = Math.max(1, sh[2] * 0.012); g.beginPath();
  us.forEach((u, i) => { const p = at(u, side * W(u), Z(u)); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); });
  g.stroke();
  // เบาะ + หัวเรือ ferro + ไม้พาย
  const c0 = at(-0.08, -0.07, 0.11), c1 = at(0.08, 0.07, 0.11);
  g.fillStyle = "#9c1c22"; g.beginPath(); g.ellipse((c0[0] + c1[0]) / 2, (c0[1] + c1[1]) / 2, sh[2] * 0.07, sh[2] * 0.03, 0, 0, TAU); g.fill();
  const bow = at(half, 0, Z(half)), bt = at(half + 0.03, 0, Z(half) + 0.1);
  g.strokeStyle = night ? "#8d939b" : "#e3e7ec"; g.lineWidth = Math.max(1, sh[2] * 0.014); g.beginPath(); g.moveTo(bow[0], bow[1]); g.lineTo(bt[0], bt[1]);
  for (let i = 0; i < 4; i++) { const p = at(half + 0.01, 0, Z(half) + 0.02 + i * 0.022), p2 = at(half + 0.06, 0, Z(half) + 0.02 + i * 0.022); g.moveTo(p[0], p[1]); g.lineTo(p2[0], p2[1]); }
  g.stroke();
  const o0 = at(-0.34, side * 0.1, 0.55), o1 = at(-0.42, side * 0.18, -0.02);
  g.strokeStyle = night ? "#3a2a1c" : "#6b4a2c"; g.lineWidth = Math.max(1, sh[2] * 0.015); g.beginPath(); g.moveTo(o0[0], o0[1]); g.lineTo(o1[0], o1[1]); g.stroke();
  if (pass) { // ผู้โดยสาร (สีของหมาก)
    const b = at(0, 0, 0.12), hd = at(0, 0, 0.3), s = b[2];
    g.fillStyle = shadeCol(pass, -0.25); g.beginPath(); g.ellipse(b[0], b[1] - s * 0.06, s * 0.05, s * 0.08, 0, 0, TAU); g.fill();
    g.fillStyle = pass; g.beginPath(); g.arc(hd[0], hd[1], Math.max(2, s * 0.045), 0, TAU); g.fill();
    glowAt(g, hd[0], hd[1], s * 0.25, hexRgb(pass), 0.4);
  }
  if (night) { const l = at(-half + 0.04, 0, 0.32); glowAt(g, l[0], l[1], l[2] * 0.4, "255,200,120", 0.7); g.fillStyle = "#ffd890"; g.beginPath(); g.arc(l[0], l[1], Math.max(1, l[2] * 0.015), 0, TAU); g.fill(); }
  g.restore();
}
// เส้นทางน้ำระหว่างท่า (BFS ตามคลอง/สะพาน/ทะเลสาบ · เกลารอยหยัก) — แคชตามคู่ท่า
const GPATH = new Map();
const dockNear = (p) => DOCKS4.reduce((best, d) => (!best || Math.hypot(d.x - p.x, d.y - p.y) < Math.hypot(best.x - p.x, best.y - p.y) ? d : best), null);
function gondolaPath(from, to) {
  const A = dockNear(from), B = dockNear(to);
  if (!A || !B) return null;
  const key = `${A.x},${A.y}>${B.x},${B.y}`;
  if (GPATH.has(key)) return GPATH.get(key);
  const s = K(A.moor.x, A.moor.y), goal = K(B.moor.x, B.moor.y), prev = new Map([[s, null]]), q = [s];
  for (let i = 0; i < q.length && !prev.has(goal); i++) {
    const [x, y] = q[i].split(",").map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = K(x + dx, y + dy); if (WAY_SET.has(k) && !prev.has(k)) { prev.set(k, q[i]); q.push(k); } }
  }
  let tiles = [];
  if (prev.has(goal)) { for (let k = goal; k; k = prev.get(k)) tiles.push(k.split(",").map(Number)); tiles.reverse(); }
  else tiles = [[A.moor.x, A.moor.y], [B.moor.x, B.moor.y]];
  let pts = [[A.bx, A.by], ...tiles.map(([x, y]) => [x + 0.5, y + 0.5]), [B.bx, B.by]];
  for (let it = 0; it < 2; it++) { // Chaikin
    const o = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) { const [a, b] = [pts[i], pts[i + 1]]; o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); }
    o.push(pts[pts.length - 1]); pts = o;
  }
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const out = { pts, len, A, B };
  GPATH.set(key, out);
  return out;
}
function alongPath(pp, k) {
  const L = pp.len[pp.len.length - 1] * Math.max(0, Math.min(1, k));
  let i = 1;
  while (i < pp.len.length - 1 && pp.len[i] < L) i++;
  const a = pp.pts[i - 1], b = pp.pts[i], seg = pp.len[i] - pp.len[i - 1] || 1, r = (L - pp.len[i - 1]) / seg;
  return { x: a[0] + (b[0] - a[0]) * r, y: a[1] + (b[1] - a[1]) * r, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
}
// ---------- แคมป์ (เต็นท์ผ้าใบ · กองไฟ · หินรูนเรืองฟ้า) ----------
function drawTent(g, x, y, night) {
  // เต็นท์ทรงจั่ว สันหลังคาตามแกน y (หน้าจั่วสามเหลี่ยม + ประตูหันทิศใต้) · เชือกขึงมุม
  const cx = x + 0.27, cy = y + 0.28, L = 0.2, Wd = 0.21, H = 0.3, C = PAL[night ? "night" : "day"];
  const A = [cx - Wd, cy - L, 0], B = [cx + Wd, cy - L, 0], Cc = [cx + Wd, cy + L, 0], D = [cx - Wd, cy + L, 0], R0 = [cx, cy - L - 0.02, H], R1 = [cx, cy + L + 0.02, H];
  const faces = [
    { pts: [A, D, R1, R0], col: shadeCol(C.tent, 0.1) },
    { pts: [B, Cc, R1, R0], col: C.canvas2 },
    { pts: [A, B, R0], col: shadeCol(C.tent, -0.12) },
    { pts: [D, Cc, R1], col: shadeCol(C.tent, -0.02), door: [0, 1] },
  ].map((f) => ({ ...f, d: depthOf(f.pts.reduce((s, p) => s + p[0], 0) / f.pts.length, f.pts.reduce((s, p) => s + p[1], 0) / f.pts.length) }));
  gEllipse(g, cx + 0.05, cy + 0.05, 0.28, 0, 18, 0.25); g.fillStyle = "rgba(0,0,0,.28)"; g.fill();
  if (!FAST) { // เชือกขึง
    g.strokeStyle = night ? "rgba(150,140,120,.4)" : "rgba(80,70,50,.5)"; g.lineWidth = 1; g.beginPath();
    for (const [rx, ry] of [[R0[0], R0[1]], [R1[0], R1[1]]]) for (const sx of [-1, 1]) { const a = P(rx, ry, H * 0.96), b = P(rx + sx * 0.3, ry + (ry > cy ? 0.08 : -0.08), 0); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }
    g.stroke();
  }
  faces.sort((a, b) => a.d - b.d);
  for (const f of faces) {
    poly(g, f.pts); g.fillStyle = f.col; g.fill(); g.strokeStyle = "rgba(40,30,20,.35)"; g.lineWidth = 1; g.stroke();
    if (f.door && faceVisible(0, 1, cx, cy + L)) { // ประตูเต็นท์ (กลางคืนมีไฟตะเกียงข้างใน)
      const p0 = P(cx - 0.08, cy + L + 0.003, 0), p1 = P(cx + 0.08, cy + L + 0.003, 0), p2 = P(cx, cy + L + 0.012, H * 0.72);
      g.fillStyle = night ? "rgba(255,190,100,.8)" : "rgba(40,30,20,.65)"; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.closePath(); g.fill();
      if (night) glowAt(g, p2[0], (p0[1] + p2[1]) / 2, p2[2] * 0.35, "255,190,100", 0.55);
    }
  }
  const r0 = P(...R0), r1 = P(...R1); g.strokeStyle = night ? "#3a2c1e" : "#6b4a2c"; g.lineWidth = Math.max(1.2, r0[2] * 0.012); g.beginPath(); g.moveTo(r0[0], r0[1]); g.lineTo(r1[0], r1[1]); g.stroke();
}
function drawCampfire(g, x, y, night, now, boost = 0) {
  const cx = x + 0.72, cy = y + 0.7, b = P(cx, cy), s = b[2];
  glowAt(g, b[0], b[1], s * (night ? 1.6 : 0.7) * (1 + boost * 0.4), "255,150,60", (night ? 0.5 : 0.22) + boost * 0.3);
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, p = P(cx + Math.cos(a) * 0.1, cy + Math.sin(a) * 0.1); g.fillStyle = night ? "#3a3b3e" : "#7f7d77"; g.beginPath(); g.ellipse(p[0], p[1], s * 0.03, s * 0.02, 0, 0, TAU); g.fill(); }
  g.strokeStyle = night ? "#2a1a10" : "#5a3a22"; g.lineWidth = Math.max(1.5, s * 0.025);
  for (const a of [0.5, 2.1]) { const p0 = P(cx + Math.cos(a) * 0.08, cy + Math.sin(a) * 0.08, 0.02), p1 = P(cx - Math.cos(a) * 0.08, cy - Math.sin(a) * 0.08, 0.02); g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke(); }
  const k = 1 + boost * 0.6;
  for (let i = 0; i < 3; i++) {
    const fl = 0.75 + 0.25 * Math.sin(now / (70 + i * 23) + i * 2);
    flameTongue(g, b[0] + (i - 1) * s * 0.035, b[1] - s * 0.01, s * (0.16 + (i === 1 ? 0.08 : 0)) * fl * k, s * 0.045, 0.95);
  }
  glowAt(g, b[0], b[1] - s * 0.08, s * 0.35, "255,210,120", 0.6);
  if (!FAST) for (let i = 0; i < 4; i++) { // ประกายไฟลอย
    const t = ((now / 1300) + i / 4) % 1, p = P(cx + Math.sin(now / 400 + i * 2) * 0.04, cy, 0.1 + t * 0.6);
    g.fillStyle = `rgba(255,${180 + i * 15},90,${1 - t})`; g.fillRect(p[0], p[1], 1.6, 1.6);
  }
}
function drawRuneStone(g, x, y, night, now) {
  const cx = x + 0.78, cy = y + 0.22, st = night ? "#4c5058" : "#8a8e94";
  const base = regPoly(cx, cy, 0.075, 5, 0.4), top = regPoly(cx + 0.01, cy, 0.045, 5, 0.6);
  const faces = frustum(g, base, 0, top, 0.42, st, shadeCol(st, 0.15), "rgba(0,0,0,.25)");
  const pulse = 0.6 + 0.4 * Math.sin(now / 800 + x);
  for (const f of faces) {
    const a = P((f.a[0] + f.b[0]) / 2 + f.nx * 0.004, (f.a[1] + f.b[1]) / 2 + f.ny * 0.004, 0.1), c = P((f.ta[0] + f.tb[0]) / 2 + f.nx * 0.004, (f.ta[1] + f.tb[1]) / 2 + f.ny * 0.004, 0.36);
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(c[0], c[1]); g.strokeStyle = `rgba(120,200,255,${0.5 + 0.5 * pulse})`; g.lineWidth = Math.max(1, a[2] * 0.012); g.stroke();
  }
  const m = P(cx, cy, 0.3);
  glowAt(g, m[0], m[1], m[2] * (night ? 0.8 : 0.45), "110,190,255", (night ? 0.6 : 0.3) * pulse);
}
// ---------- จุดตกปลา (คันเบ็ดปักขาตั้ง + ถังปลา + สายไปทุ่น) ----------
function drawFishSpot(g, t, night, now, busy) {
  const [dx, dy] = t.d, n = [-dy, dx], cx = t.x + 0.5, cy = t.y + 0.5;
  drum(g, cx - dx * 0.08 + n[0] * 0.24, cy - dy * 0.08 + n[1] * 0.24, 0.06, 0.1, night ? { body: "#3f4a52", dark: "#1a2026", hi: "#7f8c96" } : { body: "#6f8796", dark: "#33424c", hi: "#c9d8e2" });
  if (busy) return;
  const st0 = P(cx + dx * 0.2 - n[0] * 0.18, cy + dy * 0.2 - n[1] * 0.18, 0), st1 = P(cx + dx * 0.2 - n[0] * 0.18, cy + dy * 0.2 - n[1] * 0.18, 0.22);
  g.strokeStyle = night ? "#2b1e14" : "#5a3d24"; g.lineWidth = Math.max(1.2, st0[2] * 0.018); g.beginPath(); g.moveTo(st0[0], st0[1]); g.lineTo(st1[0], st1[1]); g.stroke();
  const butt = P(cx - dx * 0.05 - n[0] * 0.18, cy - dy * 0.05 - n[1] * 0.18, 0.03), tip = P(cx + dx * 0.75 - n[0] * 0.18, cy + dy * 0.75 - n[1] * 0.18, 0.62);
  g.strokeStyle = night ? "#3a2f22" : "#2e2a26"; g.lineWidth = Math.max(1, st0[2] * 0.014); g.beginPath(); g.moveTo(butt[0], butt[1]); g.quadraticCurveTo(st1[0], st1[1] - st0[2] * 0.1, tip[0], tip[1]); g.stroke();
  const bb = P(t.bob.x, t.bob.y, 0.03 + Math.sin(now / 520 + t.x) * 0.012);
  g.strokeStyle = "rgba(235,240,245,.55)"; g.lineWidth = 1; g.beginPath(); g.moveTo(tip[0], tip[1]); g.quadraticCurveTo((tip[0] + bb[0]) / 2, Math.max(tip[1], bb[1]) + bb[2] * 0.05, bb[0], bb[1]); g.stroke();
}
function drawBobber(g, bx, by, now, dip = 0) {
  const p = P(bx, by, 0.03 + Math.sin(now / 520 + bx) * 0.012 - dip * 0.05), s = p[2], r = Math.max(1.6, s * 0.03);
  g.fillStyle = "#f4f4f2"; g.beginPath(); g.arc(p[0], p[1], r, 0, Math.PI); g.fill();
  g.fillStyle = "#e0321f"; g.beginPath(); g.arc(p[0], p[1], r, Math.PI, TAU); g.fill();
}
// ---------- สุสานราชวงศ์ (สิ่งกีดขวาง · ปิด = ตราหลวงเรือง + อาวุธหลวงลอยหมุน · เปิดแล้ว = ประตูมืด ตราดับ) ----------
function drawTomb(g, x, y, C, night, now) {
  const t = tombAt(x, y), info = LAST_FD && Array.isArray(LAST_FD.tombs) ? LAST_FD.tombs.find((o) => o.x === x && o.y === y) : null;
  const open = !!(info && info.open), [fx0, fy0] = t.f, ux = -fy0, uy = fx0, cx = x + 0.5, cy = y + 0.5;
  const ope = LAST_FD ? lastFx("tomb_open") : null, ok = ope && ope.x === x && ope.y === y ? fxT(ope, now, fx.tomb_open) : 1;
  const slide = open ? ease(Math.min(1, ok / 0.35)) : 0;
  const st = night ? "#4a4a4f" : "#8f8b82", st2 = night ? "#38383d" : "#6f6b63", moss = night ? "#26341f" : "#5a7334";
  gEllipse(g, cx + 0.05, cy + 0.05, 0.5, 0, 24); g.fillStyle = C.shadow; g.fill();
  frustum(g, sqPts(cx, cy, 0.45), 0, sqPts(cx, cy, 0.45), 0.08, st2, shadeCol(st2, 0.1));
  const faces = frustum(g, sqPts(cx, cy, 0.36), 0.08, sqPts(cx, cy, 0.35), 0.7, st, null, "rgba(0,0,0,.2)");
  if (!FAST) for (const f of faces) { // มอสโคนผนัง + รอยร้าว
    const R = rng(x * 13 + y * 7 + f.nx * 3 + f.ny * 5);
    g.fillStyle = moss; g.globalAlpha = 0.7;
    for (let i = 0; i < 3; i++) { const u = R(), p = P(f.a[0] + (f.b[0] - f.a[0]) * u + f.nx * 0.004, f.a[1] + (f.b[1] - f.a[1]) * u + f.ny * 0.004, 0.1 + R() * 0.12); g.beginPath(); g.ellipse(p[0], p[1], p[2] * 0.06, p[2] * 0.025, 0, 0, TAU); g.fill(); }
    g.globalAlpha = 1;
  }
  // ประตูหิน (ด้านหันเข้ากลางแผนที่)
  const dp = (u, z, out = 0.362) => P(cx + fx0 * out + ux * u, cy + fy0 * out + uy * u, z);
  const doorVis = faceVisible(fx0, fy0, cx + fx0 * 0.36, cy + fy0 * 0.36);
  const doorPath = (off = 0) => { g.beginPath(); const a = dp(-0.16 + off, 0.08); g.moveTo(a[0], a[1]); for (let i = 0; i <= 10; i++) { const an = Math.PI - i / 10 * Math.PI, q = dp(Math.cos(an) * 0.16 + off, 0.42 + Math.sin(an) * 0.14); g.lineTo(q[0], q[1]); } const b = dp(0.16 + off, 0.08); g.lineTo(b[0], b[1]); g.closePath(); };
  const sigil = (u0, z0, a, col) => { // ตราหลวง: วงกลม + แฉก 8 + ดาวกลาง
    const c = dp(u0, z0, 0.366), s = c[2];
    if (a > 0.05) glowAt(g, c[0], c[1], s * 0.45, col, a * 0.8);
    g.strokeStyle = `rgba(${col},${Math.max(0.25, a)})`; g.lineWidth = Math.max(1, s * 0.012); g.beginPath();
    for (let i = 0; i <= 16; i++) { const an = i / 16 * TAU, q = dp(u0 + Math.cos(an) * 0.08, z0 + Math.sin(an) * 0.08, 0.366); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }
    for (let i = 0; i < 8; i++) { const an = i / 8 * TAU, q0 = dp(u0 + Math.cos(an) * 0.04, z0 + Math.sin(an) * 0.04, 0.366), q1 = dp(u0 + Math.cos(an) * 0.11, z0 + Math.sin(an) * 0.11, 0.366); g.moveTo(q0[0], q0[1]); g.lineTo(q1[0], q1[1]); }
    g.stroke();
  };
  if (doorVis) {
    doorPath(); g.fillStyle = "#050506"; g.fill();
    if (open) { const c = dp(0, 0.25); glowAt(g, c[0], c[1], c[2] * 0.4, "120,140,200", 0.15 * (1 - slide) + 0.08); }
    // แผ่นประตู: ปิด = ทับช่อง · เปิด = เลื่อนไปข้าง
    g.save(); doorPath(slide * 0.33); g.fillStyle = shadeCol(st, 0.08); g.fill(); g.strokeStyle = "rgba(0,0,0,.4)"; g.lineWidth = 1; g.stroke(); g.restore();
    const pulse = 0.65 + 0.35 * Math.sin(now / 620 + x);
    sigil(slide * 0.33, 0.3, open ? 0.06 : pulse, open ? "150,150,160" : "150,210,255");
  }
  // บัวหลังคา + หลังคาปิรามิด + ยอด
  frustum(g, sqPts(cx, cy, 0.41), 0.7, sqPts(cx, cy, 0.41), 0.78, st2, null);
  frustum(g, sqPts(cx, cy, 0.41), 0.78, sqPts(cx, cy, 0.02), 1.08, st);
  const fin = P(cx, cy, 1.08), fin2 = P(cx, cy, 1.18);
  g.strokeStyle = night ? "#6e6a5c" : "#b9a76a"; g.lineWidth = Math.max(1.5, fin[2] * 0.025); g.beginPath(); g.moveTo(fin[0], fin[1]); g.lineTo(fin2[0], fin2[1]); g.stroke();
  if (open && ok >= 1) return;
  // อาวุธหลวงวิญญาณลอยหมุนเหนือสุสาน (ยังไม่เปิด)
  const al = open ? 1 - Math.min(1, ok / 0.45) : 1;
  if (al <= 0) return;
  const zc = 1.55 + Math.sin(now / 900 + x) * 0.06, rot = now / 1400, ca = Math.cos(rot), sa = Math.sin(rot);
  const tipP = P(cx, cy, zc - 0.32), hilt = P(cx, cy, zc + 0.12), pom = P(cx, cy, zc + 0.24), g0 = P(cx - ca * 0.11, cy - sa * 0.11, zc + 0.12), g1 = P(cx + ca * 0.11, cy + sa * 0.11, zc + 0.12);
  g.save(); g.globalAlpha *= al;
  glowAt(g, hilt[0], (hilt[1] + tipP[1]) / 2, hilt[2] * 0.9, "120,190,255", night ? 0.75 : 0.5);
  g.lineCap = "round";
  g.strokeStyle = "rgba(150,210,255,.45)"; g.lineWidth = Math.max(4, hilt[2] * 0.07); g.beginPath(); g.moveTo(tipP[0], tipP[1]); g.lineTo(hilt[0], hilt[1]); g.stroke();
  g.strokeStyle = "rgba(235,248,255,.95)"; g.lineWidth = Math.max(1.5, hilt[2] * 0.022); g.beginPath(); g.moveTo(tipP[0], tipP[1]); g.lineTo(hilt[0], hilt[1]); g.lineTo(pom[0], pom[1]); g.stroke();
  g.strokeStyle = "rgba(200,230,255,.95)"; g.beginPath(); g.moveTo(g0[0], g0[1]); g.lineTo(g1[0], g1[1]); g.stroke();
  g.lineCap = "butt";
  if (!FAST) for (let i = 0; i < 4; i++) { const a = now / 700 + i * TAU / 4, q = P(cx + Math.cos(a) * 0.22, cy + Math.sin(a) * 0.22, zc + Math.sin(a * 2) * 0.1); g.fillStyle = "rgba(190,230,255,.85)"; g.beginPath(); g.arc(q[0], q[1], Math.max(1, q[2] * 0.016), 0, TAU); g.fill(); }
  g.restore();
}
// ---------- ขบวนรถไฟ (หัวรถจักร + ตู้โดยสาร 3 ตู้ · สีน้ำเงินเข้มขอบทอง) ----------
const TRAIN_CARS = [2.3, 2.0, 2.0, 2.0], TRAIN_GAP = 0.14;
const TRAIN_LEN = TRAIN_CARS.reduce((a, b) => a + b, 0) + TRAIN_GAP * (TRAIN_CARS.length - 1);
const TRAIN_RUN = MAP_W + 8 + TRAIN_LEN;
const trainHead = (dir, p) => (dir > 0 ? -4 + p * TRAIN_RUN : MAP_W + 4 - p * TRAIN_RUN);
const trainAtX = (dir, x) => (dir > 0 ? (x + 4) / TRAIN_RUN : (MAP_W + 4 - x) / TRAIN_RUN); // p ที่หัวรถถึง x
function trainCars(dir, p) {
  const head = trainHead(dir, p);
  let o = 0;
  return TRAIN_CARS.map((L, i) => { const front = head - dir * o, back = front - dir * L; o += L + TRAIN_GAP; return { i, a: Math.min(front, back), b: Math.max(front, back), front }; });
}
function drawTrainCar(g, car, dir, night, now, pass) {
  const y0 = RAIL_Y + 0.5 - 0.33, y1 = RAIL_Y + 0.5 + 0.33, cy = RAIL_Y + 0.5, loco = car.i === 0;
  const body = night ? "#141b27" : "#1d2635", side = night ? "#10151f" : "#1a2230", end = night ? "#0c1018" : "#131a26", roof = night ? "#2a3240" : "#434e60";
  const gold = night ? "#8a6f30" : "#caa24a";
  // แคร่ล้อ
  for (const bx of [car.a + 0.38, car.b - 0.38]) box(g, bx - 0.2, y0 + 0.06, bx + 0.2, y1 - 0.06, 0.15, "#0b0d10", "#08090b", "#101216", 0.03);
  let xa = car.a + 0.02, xb = car.b - 0.02;
  if (loco) { if (dir > 0) xb = car.front - 0.5; else xa = car.front + 0.5; }
  const faces = box(g, xa, y0, xb, y1, 0.74, roof, end, side, 0.14);
  box(g, xa + 0.06, y0 + 0.05, xb - 0.06, y1 - 0.05, 0.81, shadeCol(roof, 0.12), end, shadeCol(roof, -0.2), 0.74);
  // แถบทอง + หน้าต่างบนข้างลำที่มองเห็น
  for (const f of faces) {
    if (!f.ny) continue;
    const yy = f.ny > 0 ? y1 + 0.003 : y0 - 0.003;
    poly(g, [[xa + 0.04, yy, 0.42], [xb - 0.04, yy, 0.42], [xb - 0.04, yy, 0.46], [xa + 0.04, yy, 0.46]]); g.fillStyle = gold; g.fill();
    let wi = 0;
    for (let u = xa + 0.16; u < xb - 0.2; u += 0.3, wi++) {
      const lit = night ? hash(car.i * 31 + wi, 5) < 0.8 : false;
      poly(g, [[u, yy, 0.52], [u + 0.2, yy, 0.52], [u + 0.2, yy, 0.67], [u, yy, 0.67]]);
      g.fillStyle = lit ? "#ffd27a" : night ? "#1d2532" : "#7b97b4"; g.fill();
      const pc = !loco && pass && pass.length ? pass[(wi + car.i) % pass.length] : null;
      if (pc && wi % 2 === 0) { const h = P(u + 0.1, yy, 0.6); g.fillStyle = pc; g.beginPath(); g.arc(h[0], h[1], Math.max(1.5, h[2] * 0.035), 0, TAU); g.fill(); }
      if (lit && !FAST) { const c = P(u + 0.1, yy, 0.6); glowAt(g, c[0], c[1], c[2] * 0.22, "255,210,130", 0.35); }
    }
  }
  if (!loco) return;
  // หัวรถจักร: จมูกลาด + กระจกหน้า + ไฟหน้า + ห้องคนขับยกสูง
  const f0 = car.front, back = f0 - dir * 0.5, base = dir > 0 ? [[back, y0], [f0, y0], [f0, y1], [back, y1]] : [[f0, y0], [back, y0], [back, y1], [f0, y1]];
  const tf = f0 - dir * 0.28, top = dir > 0 ? [[back, y0 + 0.04], [tf, y0 + 0.04], [tf, y1 - 0.04], [back, y1 - 0.04]] : [[tf, y0 + 0.04], [back, y0 + 0.04], [back, y1 - 0.04], [tf, y1 - 0.04]];
  frustum(g, base, 0.14, top, 0.74, body, roof);
  if (faceVisible(dir, 0, f0, cy)) {
    const xz = (z) => f0 - dir * 0.28 * ((z - 0.14) / 0.6);
    poly(g, [[xz(0.5), y0 + 0.08, 0.5], [xz(0.5), y1 - 0.08, 0.5], [xz(0.68), y1 - 0.1, 0.68], [xz(0.68), y0 + 0.1, 0.68]]);
    g.fillStyle = night ? "#2a3a52" : "#8fb2d4"; g.fill();
    poly(g, [[xz(0.24), y0 + 0.04, 0.24], [xz(0.24), y1 - 0.04, 0.24], [xz(0.3), y1 - 0.04, 0.3], [xz(0.3), y0 + 0.04, 0.3]]); g.fillStyle = gold; g.fill();
  }
  const cab0 = dir > 0 ? xb - 0.55 : xa + 0.05, cab1 = dir > 0 ? xb - 0.05 : xa + 0.55;
  box(g, cab0, y0 + 0.06, cab1, y1 - 0.06, 0.9, roof, end, side, 0.81);
  for (const yy of [cy - 0.2, cy + 0.2]) {
    const h = P(f0 + dir * 0.005, yy, 0.32);
    g.fillStyle = "#fff8e0"; g.beginPath(); g.arc(h[0], h[1], Math.max(1.6, h[2] * 0.04), 0, TAU); g.fill();
    glowAt(g, h[0], h[1], h[2] * (night ? 0.9 : 0.5), "255,245,215", night ? 0.95 : 0.6);
  }
}
// ลำแสงไฟหน้าบนพื้น (ใต้ขบวน)
function trainBeam(g, dir, head, night) {
  const cy = RAIL_Y + 0.5, a = P(head, cy - 0.22, 0.01), b = P(head, cy + 0.22, 0.01), c = P(head + dir * 3.4, cy + 0.85, 0), d = P(head + dir * 3.4, cy - 0.85, 0);
  const gr = g.createLinearGradient((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (c[0] + d[0]) / 2, (c[1] + d[1]) / 2);
  gr.addColorStop(0, `rgba(255,245,210,${night ? 0.45 : 0.16})`); gr.addColorStop(1, "rgba(255,245,210,0)");
  g.fillStyle = gr; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); g.fill();
}
// ร่างจางของหมาก (สีผู้เล่น) — ตอนขึ้นรถไฟ / ลอดอุโมงค์
function ghostPiece(g, x, y, col, alpha, scale = 1, z = 0) {
  if (!(alpha > 0.01)) return;
  const b = P(x, y, z), s = b[2] * scale;
  g.save(); g.globalAlpha *= alpha;
  g.fillStyle = "rgba(0,0,0,.3)"; g.beginPath(); g.ellipse(b[0], b[1], s * 0.28, s * 0.1, 0, 0, TAU); g.fill();
  g.fillStyle = shadeCol(col, -0.3); g.beginPath(); g.ellipse(b[0], b[1] - s * 0.22, s * 0.13, s * 0.22, 0, 0, TAU); g.fill();
  g.fillStyle = col; g.beginPath(); g.arc(b[0], b[1] - s * 0.5, s * 0.11, 0, TAU); g.fill();
  glowAt(g, b[0], b[1] - s * 0.35, s * 0.55, hexRgb(col), 0.35);
  g.restore();
}

// ---------- พื้น (ใต้ไฮไลต์): ไฟเตือนบนราง · วงรูนแคมป์ · ทุ่นตกปลา ----------
function p4Ground(g, fd, now, night) {
  const rail = fd.rail || null, we = activeOf(fd, now, "train_warn")[0] || null;
  if ((rail && rail.warn) || we) {
    const dir = (we && we.dir) || (rail && rail.dir) || 1, y = RAIL_Y, pulse = 0.5 + 0.5 * Math.sin(now / 150);
    g.beginPath();
    for (let x = 0; x < MAP_W; x++) { const a = P(x, y + 0.08), b = P(x + 1, y + 0.08), c = P(x + 1, y + 0.92), d = P(x, y + 0.92); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); }
    g.fillStyle = `rgba(255,40,30,${0.08 + 0.12 * pulse})`; g.fill();
    const off = ((now / 380) % 1) * dir;
    g.beginPath();
    for (let x = -1; x <= MAP_W; x++) {
      const u = x + 0.5 + off, a = P(u - dir * 0.14, y + 0.3, 0.1), b = P(u + dir * 0.1, y + 0.5, 0.1), c = P(u - dir * 0.14, y + 0.7, 0.1);
      g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]);
    }
    g.strokeStyle = `rgba(255,${90 + 80 * pulse | 0},70,${0.55 + 0.35 * pulse})`; g.lineWidth = 2.2; g.lineJoin = "round"; g.stroke();
  }
  for (const t of CAMPS4) {
    const cx = t.x + 0.5, cy = t.y + 0.5, pulse = 0.5 + 0.5 * Math.sin(now / 900 + t.x), a = (night ? 0.55 : 0.3) + 0.2 * pulse;
    gEllipse(g, cx, cy, 0.38, 0.006, 32); g.strokeStyle = `rgba(120,200,255,${a})`; g.lineWidth = 2; g.stroke();
    const rot = now / 6000;
    g.beginPath();
    for (let i = 0; i < 12; i++) { const an = rot + i / 12 * TAU, p0 = P(cx + Math.cos(an) * 0.3, cy + Math.sin(an) * 0.3, 0.006), p1 = P(cx + Math.cos(an + 0.12) * 0.34, cy + Math.sin(an + 0.12) * 0.34, 0.006); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); }
    g.strokeStyle = `rgba(160,220,255,${a})`; g.lineWidth = 1.4; g.stroke();
    const c = P(cx, cy);
    glowAt(g, c[0], c[1], c[2] * 0.7, "100,180,255", (night ? 0.3 : 0.12) * (0.7 + 0.3 * pulse));
  }
  const busy = new Set(activeOf(fd, now, "fish").map((e) => K(e.x, e.y)));
  for (const t of FISH4) {
    if (busy.has(K(t.x, t.y))) continue;
    const k = ((now / 2600) + t.x * 0.37) % 1;
    gEllipse(g, t.bob.x, t.bob.y, 0.05 + k * 0.25, 0.01, 18); g.strokeStyle = `rgba(230,245,255,${0.45 * (1 - k)})`; g.lineWidth = 1; g.stroke();
    drawBobber(g, t.bob.x, t.bob.y, now);
  }
}
// ---------- items (เรียงความลึกกับตัวละคร) ----------
function p4Items(list, g, fd, units, now, lowQ, night) {
  const occ = occupied(units), rail = fd.rail || null;
  const warn = !!(rail && rail.warn) || activeOf(fd, now, "train_warn").length > 0;
  const fadeIf = (tile, d) => occ.has(tile) && d > depthOf(Number(tile.split(",")[0]) + 0.5, Number(tile.split(",")[1]) + 0.5);
  const push = (d, fn, tile = null) => {
    const fade = tile && fadeIf(tile, d);
    list.push({ d, f: fade ? () => { g.save(); g.globalAlpha = 0.42; fn(); g.restore(); } : fn });
  };
  for (const t of STATIONS4) push(depthOf(t.x + 0.5, t.y + 0.5 - t.rd * 0.3), () => drawStation(g, t, night, now, warn), K(t.x, t.y));
  for (const s of SIGNALS) push(depthOf(s.x, s.y), () => drawSignal(g, s.x, s.y, night, now, warn));
  for (const t of TUNNELS4) {
    const [fx, fy] = t.f, front = faceVisible(fx, fy, t.x + 0.5 - fx * 0.14, t.y + 0.5 - fy * 0.14);
    push(front ? depthOf(t.x + 0.5, t.y + 0.5) - 0.02 : depthOf(t.x + 0.5 - fx * 0.6, t.y + 0.5 - fy * 0.6), () => drawTunnel(g, t, night), front ? null : K(t.x, t.y));
  }
  // กอนโดลาจอด (ซ่อนลำที่กำลังแล่นอยู่ในฉาก)
  const sailing = activeOf(fd, now, "gondola");
  const away = new Set();
  for (const e of sailing) { const pp = e.from && e.to ? gondolaPath(e.from, e.to) : null; if (pp) { away.add(K(pp.A.x, pp.A.y)); if (fxT(e, now, fx.gondola) < 0.97) away.add(K(pp.B.x, pp.B.y)); } }
  for (const t of DOCKS4) if (!away.has(K(t.x, t.y))) push(depthOf(t.bx, t.by), () => drawGondola(g, t.bx, t.by, t.ang, night, now));
  for (const e of sailing) {
    const pp = e.from && e.to ? gondolaPath(e.from, e.to) : null;
    if (!pp) continue;
    const k = ease(fxT(e, now, fx.gondola)), at = alongPath(pp, k), u = unitOf(units, e.id);
    push(depthOf(at.x, at.y), () => drawGondola(g, at.x, at.y, at.ang, night, now, u ? u.color : "#d8dde6"));
  }
  const meals = activeOf(fd, now, "camp_meal");
  for (const t of CAMPS4) {
    const boost = meals.some((e) => e.x === t.x && e.y === t.y) ? 1 : 0;
    push(depthOf(t.x + 0.27, t.y + 0.28), () => drawTent(g, t.x, t.y, night), K(t.x, t.y));
    push(depthOf(t.x + 0.72, t.y + 0.7), () => drawCampfire(g, t.x, t.y, night, now, boost));
    push(depthOf(t.x + 0.78, t.y + 0.22), () => drawRuneStone(g, t.x, t.y, night, now));
  }
  const fishing = new Set(activeOf(fd, now, "fish").map((e) => K(e.x, e.y)));
  for (const t of FISH4) push(depthOf(t.x + 0.5 + t.d[0] * 0.3, t.y + 0.5 + t.d[1] * 0.3), () => drawFishSpot(g, t, night, now, fishing.has(K(t.x, t.y))));
  // ขบวนรถไฟ
  for (const e of activeOf(fd, now, "train_pass")) {
    const dir = e.dir || 1, p = fxT(e, now, fx.train_pass), cars = trainCars(dir, p);
    const pass = (e.carried || []).map((c) => (unitOf(units, c.id) || { color: "#d8dde6" }).color);
    const head = trainHead(dir, p);
    list.push({ d: -1e6, f: () => trainBeam(g, dir, head, night) });
    for (const car of cars) push(depthOf((car.a + car.b) / 2, RAIL_Y + 0.5), () => drawTrainCar(g, car, dir, night, now, pass));
  }
  void lowQ;
}
// ---------- ฉากเหตุการณ์ (air — ทับตัวละคร) ----------
const CAMP_ICON = { atk: "🍲", mend: "🐟", mov: "🍙" };
const CAMP_RGB = { atk: "255,120,60", mend: "110,255,150", mov: "110,210,255" };
const BOUNTY_ICON = { daemon: "👹", beast: "🦣", magitek: "🤖", player: "🎯" };
function emoji(g, ch, x, y, size, a = 1) {
  g.save(); g.globalAlpha *= a; g.font = `${Math.max(8, size) | 0}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(ch, x, y); g.restore();
}
function splash(g, x, y, p, seed, n, size, lowQ) {
  const c = P(x, y, 0.02), s = c[2];
  for (let i = 0; i < 2; i++) { const k = Math.min(1, p * 1.3 - i * 0.2); if (k <= 0) continue; gEllipse(g, x, y, 0.08 + k * size, 0.02, 22); g.strokeStyle = `rgba(230,245,255,${0.7 * (1 - k)})`; g.lineWidth = 1.5; g.stroke(); }
  if (lowQ) return;
  for (let i = 0; i < n; i++) {
    const a = hash(i, seed) * TAU, r = s * size * (0.4 + hash(i + 3, seed) * 0.8) * p, h = Math.sin(Math.min(1, p) * Math.PI) * s * size * (0.6 + hash(i + 5, seed));
    g.fillStyle = `rgba(225,242,255,${0.9 * (1 - p)})`; g.beginPath(); g.arc(c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r * 0.5 - h, Math.max(1, s * 0.016), 0, TAU); g.fill();
  }
}
function fishShape(g, x, y, s, ang, col, hi) {
  g.save(); g.translate(x, y); g.rotate(ang);
  g.fillStyle = col; g.beginPath(); g.ellipse(0, 0, s * 0.11, s * 0.04, 0, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(-s * 0.09, 0); g.lineTo(-s * 0.17, -s * 0.05); g.lineTo(-s * 0.17, s * 0.05); g.closePath(); g.fill();
  g.fillStyle = hi; g.beginPath(); g.ellipse(s * 0.02, -s * 0.015, s * 0.06, s * 0.012, 0, 0, TAU); g.fill();
  g.fillStyle = "#111"; g.beginPath(); g.arc(s * 0.07, -s * 0.008, Math.max(0.8, s * 0.008), 0, TAU); g.fill();
  g.restore();
}
function p4Fx(g, e, p, now, lowQ, units, out, night) {
  switch (e.kind) {
    case "train_warn": {
      const dir = e.dir || 1, y = RAIL_Y + 0.5, u = dir > 0 ? -1 + p * (MAP_W + 2) : MAP_W + 1 - p * (MAP_W + 2), c = P(u, y, 0.12);
      glowAt(g, c[0], c[1], c[2] * 1.3, "255,50,40", 0.75 * (1 - p * 0.5));
      return true;
    }
    case "train_pass": {
      const dir = e.dir || 1, head = trainHead(dir, p), tail = head - dir * TRAIN_LEN, y = RAIL_Y + 0.5;
      if (!lowQ) { // เส้นความเร็ว + ฝุ่นท้ายขบวน + ประกายล้อ
        g.strokeStyle = "rgba(230,235,245,.28)"; g.lineWidth = 1; g.beginPath();
        for (let i = 0; i < 10; i++) { const yy = y + (hash(i, e.seq) - 0.5) * 0.9, z = 0.15 + hash(i + 3, e.seq) * 0.7, x0 = tail - dir * (0.3 + hash(i, 4) * 1.6), a = P(x0, yy, z), b = P(x0 - dir * (1 + hash(i, 6) * 1.5), yy, z); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }
        g.stroke();
        for (let i = 0; i < 8; i++) { const k = ((now / 500) + i / 8) % 1, q = P(tail - dir * (k * 1.6), y + (hash(i, 2) - 0.5) * 0.8, 0.05 + k * 0.4); g.fillStyle = `rgba(170,160,145,${0.35 * (1 - k)})`; g.beginPath(); g.arc(q[0], q[1], q[2] * (0.08 + k * 0.14), 0, TAU); g.fill(); }
        for (let i = 0; i < 5; i++) { if (Math.sin(now / 40 + i * 7) < 0.5) continue; const x = head - dir * (hash(i, Math.floor(now / 60)) * TRAIN_LEN), q = P(x, y + (i % 2 ? 0.14 : -0.14), 0.06); g.fillStyle = "rgba(255,220,140,.9)"; g.fillRect(q[0] - 1, q[1] - 1, 2, 2); }
      }
      // คนบนรางโดนชน
      for (const h of e.hits || []) {
        if (!h.from) continue;
        const ph = trainAtX(dir, h.from.x + 0.5), q = (p - ph) / 0.14;
        if (q < 0 || q > 1) continue;
        const c = P(h.from.x + 0.5, h.from.y + 0.5, 0.5), s = c[2];
        if (q < 0.25) out.flash = Math.max(out.flash, 0.12 * (1 - q / 0.25));
        glowAt(g, c[0], c[1], s * (0.6 + q * 1.2), "255,220,170", 1 - q);
        gEllipse(g, h.from.x + 0.5, h.from.y + 0.5, 0.3 + q * 1.1, 0.05, 28); g.strokeStyle = `rgba(255,235,200,${0.7 * (1 - q)})`; g.lineWidth = 2; g.stroke();
        if (!lowQ) for (let i = 0; i < 10; i++) { const a = hash(i, e.seq + h.from.x) * TAU, r = s * 1.1 * q; g.fillStyle = `rgba(${i % 2 ? "255,200,120" : "90,80,70"},${1 - q})`; g.fillRect(c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r * 0.6 - s * 0.5 * q, 2.5, 2.5); }
      }
      // ผู้โดยสาร: ร่างจางรอที่ชานชาลาต้นทาง · ไอน้ำบังที่ชานชาลาปลายทางจนกว่าจะถึง
      for (const c of e.carried || []) {
        if (!c.from || !c.to) continue;
        const u = unitOf(units, c.id), col = u ? u.color : "#d8dde6", pFrom = trainAtX(dir, c.from.x + 0.5), pTo = Math.max(trainAtX(dir, c.to.x + 0.5), pFrom);
        if (p < pFrom + 0.04) ghostPiece(g, c.from.x + 0.5, c.from.y + 0.5, col, p > pFrom ? 1 - (p - pFrom) / 0.04 : 0.85);
        const ss = p < pTo ? 1 : Math.max(0, 1 - (p - pTo) / 0.15);
        if (ss > 0) {
          const c0 = P(c.to.x + 0.5, c.to.y + 0.5, 0.4);
          glowAt(g, c0[0], c0[1], c0[2] * 1.0, "235,238,242", 0.9 * ss);
          if (!lowQ) puff(g, c.to.x + 0.5, c.to.y + 0.5, 0.15, 0.4 + 0.3 * Math.sin(now / 300), e.seq + c.to.x, 7, "235,238,242", 0.18 * ss + 0.02);
        }
      }
      return true;
    }
    case "gondola": {
      const pp = e.from && e.to ? gondolaPath(e.from, e.to) : null;
      if (!pp) return true;
      const k = ease(p);
      if (!lowQ && k < 0.98) for (let i = 1; i <= 4; i++) { // คลื่นท้ายเรือ
        const b = alongPath(pp, Math.max(0, k - i * 0.035));
        gEllipse(g, b.x, b.y + 0.05, 0.08 + i * 0.07, 0.005, 16, 0.04 + i * 0.03); g.strokeStyle = `rgba(230,245,255,${0.4 * (1 - i / 5)})`; g.lineWidth = 1; g.stroke();
      }
      // หมอกน้ำบางที่ท่าปลายทางจนเรือถึง
      const mist = Math.max(0, 1 - k * 1.05);
      if (mist > 0 && e.to) { const c = P(e.to.x + 0.5, e.to.y + 0.5, 0.4); glowAt(g, c[0], c[1], c[2] * 0.9, "220,232,240", 0.85 * mist); }
      return true;
    }
    case "tunnel": {
      const from = e.from, to = e.to, u = unitOf(units, e.id), col = u ? u.color : "#d8dde6";
      if (from) {
        const t = TUNNELS4.find((o) => o.x === from.x && o.y === from.y), f = t ? t.f : [0, 1], k = Math.min(1, p / 0.5);
        ghostPiece(g, from.x + 0.5 - f[0] * 0.35 * ease(k), from.y + 0.5 - f[1] * 0.35 * ease(k), col, 0.9 * (1 - k), 1 - 0.35 * k);
        const m = P(from.x + 0.5 - f[0] * 0.14, from.y + 0.5 - f[1] * 0.14, 0.25);
        if (p < 0.5) glowAt(g, m[0], m[1], m[2] * 0.6, "0,0,0", 0.5 * (1 - k));
      }
      if (to) { // ออกจากความมืดที่ปากอีกฝั่ง
        const q = Math.max(0, (p - 0.3) / 0.7), c = P(to.x + 0.5, to.y + 0.5, 0.45);
        glowAt(g, c[0], c[1], c[2] * 1.1, "0,0,0", 0.95 * (1 - ease(q)));
        if (!lowQ && q > 0 && q < 1) puff(g, to.x + 0.5, to.y + 0.55, 0.05, q, e.seq, 6, "150,140,125", 0.1);
      }
      return true;
    }
    case "camp_meal": {
      const meal = e.meal || "atk", cx = e.x + 0.5, cy = e.y + 0.5, rgb = CAMP_RGB[meal] || "255,200,120";
      if (!lowQ) puff(g, e.x + 0.72, e.y + 0.7, 0.25 + p * 0.5, p, e.seq, 9, "235,232,225", 0.12); // ไอ/ควันจากหม้อ
      const u = unitOf(units, e.id) || { x: cx, y: cy }, b = P(u.x, u.y, 0.05), s = b[2];
      if (p > 0.35) { const q = (p - 0.35) / 0.65; gEllipse(g, u.x, u.y, 0.25 + q * 0.5, 0.03, 26); g.strokeStyle = `rgba(${rgb},${0.8 * (1 - q)})`; g.lineWidth = 2.5; g.stroke(); glowAt(g, b[0], b[1] - s * 0.4, s * 0.9, rgb, 0.6 * (1 - q)); }
      const pop = p < 0.25 ? ease(p / 0.25) : 1, al = p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25, ic = P(u.x, u.y, 1.25 + p * 0.45);
      glowAt(g, ic[0], ic[1], s * 0.5 * pop, rgb, 0.6 * al);
      emoji(g, CAMP_ICON[meal] || "🍲", ic[0], ic[1], s * 0.42 * (0.6 + 0.5 * pop - 0.1 * (pop >= 1 ? Math.max(0, Math.sin(p * 9)) * (1 - p) : 0)), al);
      return true;
    }
    case "fish": {
      const t = FISH4.find((o) => o.x === e.x && o.y === e.y) || { x: e.x, y: e.y, d: [-1, 0], bob: { x: e.x - 0.6, y: e.y + 0.5 } };
      const u = unitOf(units, e.id) || { x: e.x + 0.5, y: e.y + 0.5 }, [dx, dy] = t.d, n = [-dy, dx];
      const tipW = [u.x + dx * 0.5 - n[0] * 0.12, u.y + dy * 0.5 - n[1] * 0.12, 0.95], tip = P(...tipW), hand = P(u.x - n[0] * 0.12, u.y - n[1] * 0.12, 0.45);
      g.strokeStyle = night ? "#3a2f22" : "#2e2a26"; g.lineWidth = Math.max(1.2, tip[2] * 0.016); g.beginPath(); g.moveTo(hand[0], hand[1]); g.lineTo(tip[0], tip[1]); g.stroke();
      const bob = t.bob, giant = e.result === "giant";
      if (p < 0.22) { // เหวี่ยงสาย: ทุ่นลอยโค้งลงน้ำ
        const k = ease(p / 0.22), bx = tipW[0] + (bob.x - tipW[0]) * k, by = tipW[1] + (bob.y - tipW[1]) * k, bz = 0.95 * (1 - k) + Math.sin(k * Math.PI) * 0.6, q = P(bx, by, bz);
        g.strokeStyle = "rgba(235,240,245,.6)"; g.lineWidth = 1; g.beginPath(); g.moveTo(tip[0], tip[1]); g.lineTo(q[0], q[1]); g.stroke();
        g.fillStyle = "#e0321f"; g.beginPath(); g.arc(q[0], q[1], Math.max(1.6, q[2] * 0.03), 0, TAU); g.fill();
        return true;
      }
      const bite = p > 0.4 && p < 0.52, dip = bite ? Math.abs(Math.sin((p - 0.4) * 60)) : p >= 0.52 ? 1 : 0;
      const bp = P(bob.x, bob.y, 0.03 - dip * 0.05);
      const taut = p >= 0.52;
      g.strokeStyle = taut ? "rgba(245,248,250,.85)" : "rgba(235,240,245,.6)"; g.lineWidth = taut ? 1.4 : 1; g.beginPath(); g.moveTo(tip[0], tip[1]);
      if (taut) g.lineTo(bp[0], bp[1]); else g.quadraticCurveTo((tip[0] + bp[0]) / 2, Math.max(tip[1], bp[1]) + bp[2] * 0.06, bp[0], bp[1]);
      g.stroke();
      if (p < 0.52) { drawBobber(g, bob.x, bob.y, now, dip); if (bite) splash(g, bob.x, bob.y, (p - 0.4) / 0.12, e.seq, 6, 0.18, lowQ); return true; }
      const q = (p - 0.52) / 0.48;
      if (giant) { // ปลายักษ์โผล่หางแล้วฟาดลากลงน้ำ
        const rise = Math.sin(Math.min(1, q * 1.4) * Math.PI), b = P(bob.x, bob.y, 0), s = b[2];
        splash(g, bob.x, bob.y, Math.min(1, q * 1.2), e.seq + 3, 14, 0.55, lowQ);
        if (rise > 0.02) {
          const hgt = s * 0.7 * rise, wv = Math.sin(now / 80) * s * 0.05;
          g.fillStyle = "#1f2a33"; g.beginPath(); g.moveTo(b[0] - s * 0.08, b[1]); g.quadraticCurveTo(b[0] - s * 0.05 + wv, b[1] - hgt * 0.6, b[0] + wv, b[1] - hgt * 0.75);
          g.lineTo(b[0] - s * 0.32 + wv, b[1] - hgt * 1.05); g.quadraticCurveTo(b[0] + wv, b[1] - hgt * 0.85, b[0] + s * 0.32 + wv, b[1] - hgt * 1.05); g.lineTo(b[0] + wv, b[1] - hgt * 0.75);
          g.quadraticCurveTo(b[0] + s * 0.05 + wv, b[1] - hgt * 0.6, b[0] + s * 0.08, b[1]); g.closePath(); g.fill();
          g.strokeStyle = "rgba(120,160,190,.5)"; g.lineWidth = 1; g.stroke();
        }
        const pc = P(u.x, u.y, 0.5);
        if (q > 0.3) { glowAt(g, pc[0], pc[1], pc[2] * 0.9, "255,50,40", 0.6 * (1 - q)); out.flash = Math.max(out.flash, q < 0.4 ? 0.06 : 0); }
        if (!lowQ) for (let i = 0; i < 4; i++) { const k = ((now / 300) + i / 4) % 1, a = P(u.x + (bob.x - u.x) * k, u.y + (bob.y - u.y) * k, 0.05); g.fillStyle = `rgba(220,240,255,${0.5 * (1 - q)})`; g.beginPath(); g.arc(a[0], a[1], Math.max(1, a[2] * 0.02), 0, TAU); g.fill(); }
        return true;
      }
      splash(g, bob.x, bob.y, Math.min(1, q * 1.6), e.seq + 1, 10, 0.3, lowQ);
      if (e.result === "coins") { // เหรียญกระเด็นจากน้ำมาหาคนตก
        for (let i = 0; i < 6; i++) {
          const k = Math.max(0, Math.min(1, q * 1.5 - i * 0.08));
          if (k <= 0 || k >= 1) continue;
          const c = P(bob.x + (u.x - bob.x) * k, bob.y + (u.y - bob.y) * k, Math.sin(k * Math.PI) * 0.9 + k * 0.6), s = c[2], w = Math.abs(Math.cos(now / 70 + i)) * s * 0.05;
          glowAt(g, c[0], c[1], s * 0.2, "255,215,90", 0.6);
          g.fillStyle = "#f2c430"; g.beginPath(); g.ellipse(c[0], c[1], Math.max(0.8, w), s * 0.05, 0, 0, TAU); g.fill();
          g.strokeStyle = "#a8780c"; g.lineWidth = 1; g.stroke();
        }
      } else { // ปลาเงิน / ปลาทองกระโดดขึ้นมาหาคนตก
        const gold = e.result === "gold", k = ease(Math.min(1, q * 1.4)), c = P(bob.x + (u.x - bob.x) * k, bob.y + (u.y - bob.y) * k, Math.sin(k * Math.PI) * 1.0 + k * 0.7), s = c[2];
        const ang = Math.atan2((u.y - bob.y), (u.x - bob.x)) * 0.3 + Math.cos(k * Math.PI) * -0.9 + Math.sin(now / 50) * 0.25 * (1 - k);
        if (gold) glowAt(g, c[0], c[1], s * 0.6, "255,215,90", 0.85);
        fishShape(g, c[0], c[1], s * (gold ? 1.25 : 1.1), ang, gold ? "#ffcf3a" : "#c6dbe6", gold ? "#fff3b0" : "#ffffff");
        if (q > 0.7) { const pc = P(u.x, u.y, 0.6); glowAt(g, pc[0], pc[1], pc[2] * 0.8, gold ? "255,215,90" : "110,255,150", (1 - q) / 0.3 * 0.6); }
      }
      return true;
    }
    case "tomb_open": {
      const t = tombAt(e.x, e.y), [fx, fy] = t.f, cx = e.x + 0.5, cy = e.y + 0.5, dp = P(cx + fx * 0.4, cy + fy * 0.4, 0.3), s = dp[2];
      glowAt(g, dp[0], dp[1], s * (0.6 + p), "140,200,255", 0.9 * (1 - p));
      if (p > 0.15 && p < 0.75) { // เสาแสงพุ่งขึ้นฟ้า
        const k = (p - 0.15) / 0.6, a = Math.sin(k * Math.PI), b0 = P(cx, cy, 0.9), b1 = P(cx, cy, 6);
        const gr = g.createLinearGradient(b0[0], b0[1], b1[0], b1[1]); gr.addColorStop(0, `rgba(190,230,255,${0.6 * a})`); gr.addColorStop(1, "rgba(190,230,255,0)");
        g.fillStyle = gr; g.fillRect(b0[0] - s * 0.18 * a, b1[1], s * 0.36 * a, b0[1] - b1[1]);
      }
      const u = unitOf(units, e.id);
      if (u && p > 0.4 && p < 0.85) { // อาวุธหลวงพุ่งเข้าหาผู้เปิด
        const k = ease((p - 0.4) / 0.45), x = cx + (u.x - cx) * k, y = cy + (u.y - cy) * k, z = 1.55 + Math.sin(k * Math.PI) * 0.7 - k * 0.9, c = P(x, y, z), a2 = P(x + (u.x - cx) * 0.05, y + (u.y - cy) * 0.05, z - 0.3);
        glowAt(g, c[0], c[1], c[2] * 0.6, "150,210,255", 0.9);
        g.strokeStyle = "rgba(235,248,255,.95)"; g.lineWidth = Math.max(1.5, c[2] * 0.022); g.lineCap = "round"; g.beginPath(); g.moveTo(c[0], c[1]); g.lineTo(a2[0], a2[1]); g.stroke(); g.lineCap = "butt";
        if (!lowQ) for (let i = 1; i < 6; i++) { const kk = Math.max(0, k - i * 0.04), q2 = P(cx + (u.x - cx) * kk, cy + (u.y - cy) * kk, 1.55 + Math.sin(kk * Math.PI) * 0.7 - kk * 0.9); glowAt(g, q2[0], q2[1], q2[2] * 0.18, "150,210,255", 0.4 / i); }
      }
      if (u && p >= 0.82) { const q = (p - 0.82) / 0.18, c = P(u.x, u.y, 0.5); gEllipse(g, u.x, u.y, 0.3 + q * 0.6, 0.03, 26); g.strokeStyle = `rgba(160,215,255,${0.9 * (1 - q)})`; g.lineWidth = 2.5; g.stroke(); glowAt(g, c[0], c[1], c[2] * 1.0, "150,210,255", 0.8 * (1 - q)); }
      if (!lowQ && p < 0.6) puff(g, cx + fx * 0.45, cy + fy * 0.45, 0.05, p / 0.6, e.seq, 7, "160,150,135", 0.1);
      return true;
    }
    case "royal_drain": {
      const u = unitOf(units, e.id) || { x: e.x + 0.5, y: e.y + 0.5 }, c = P(u.x, u.y, 0.5), s = c[2];
      glowAt(g, c[0], c[1], s * (0.6 + p * 0.5), "120,60,200", 0.6 * (1 - p));
      if (!lowQ) for (let i = 0; i < 6; i++) { // ควันพลังถูกดูดขึ้นไปหาอาวุธ
        const a = hash(i, e.seq) * TAU, k = Math.min(1, p * 1.2 + hash(i, 4) * 0.1), q = P(u.x + Math.cos(a) * 0.25 * (1 - k), u.y + Math.sin(a) * 0.25 * (1 - k), 0.2 + k * 1.2);
        g.fillStyle = `rgba(140,90,220,${0.7 * (1 - k)})`; g.beginPath(); g.arc(q[0], q[1], Math.max(1, s * 0.05 * (1 - k * 0.5)), 0, TAU); g.fill();
      }
      const d = P(u.x + 0.12, u.y, 0.7 - p * 0.6);
      g.fillStyle = `rgba(220,40,50,${1 - p})`; g.beginPath(); g.moveTo(d[0], d[1] - s * 0.06); g.quadraticCurveTo(d[0] + s * 0.035, d[1], d[0], d[1] + s * 0.02); g.quadraticCurveTo(d[0] - s * 0.035, d[1], d[0], d[1] - s * 0.06); g.fill();
      return true;
    }
    case "hunt_board": {
      const u = unitOf(units, e.id);
      if (u) { // ใบประกาศค่าหัวเด้งขึ้นเหนือหัว
        const pop = p < 0.2 ? ease(p / 0.2) : 1, al = p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25, c = P(u.x, u.y, 1.45 + p * 0.25), s = c[2] * 0.42 * (0.5 + 0.5 * pop);
        g.save(); g.globalAlpha *= al; g.translate(c[0], c[1]); g.rotate(Math.sin(p * 12) * 0.08 * (1 - p));
        g.fillStyle = "#e9d8a6"; g.beginPath(); g.moveTo(-s * 0.5, -s * 0.62); g.lineTo(s * 0.5, -s * 0.6); g.lineTo(s * 0.47, s * 0.6); g.lineTo(-s * 0.52, s * 0.62); g.closePath(); g.fill();
        g.strokeStyle = "#8a6a32"; g.lineWidth = Math.max(1, s * 0.04); g.stroke();
        g.fillStyle = "#c8321f"; g.beginPath(); g.arc(0, -s * 0.55, Math.max(1.5, s * 0.07), 0, TAU); g.fill();
        g.restore();
        emoji(g, BOUNTY_ICON[e.bounty] || "📜", c[0], c[1] + s * 0.05, s * 0.62, al);
      }
      const tu = e.target ? unitOf(units, e.target) : null;
      if (tu && p > 0.25) { // เป้าค่าหัว: กรอบเล็งแดงหมุนรอบตัวเป้า
        const q = (p - 0.25) / 0.75, c = P(tu.x, tu.y, 0.45), s = c[2], r = s * (0.6 - 0.15 * ease(Math.min(1, q * 2))), rot = q * 2;
        g.save(); g.translate(c[0], c[1]); g.rotate(rot); g.strokeStyle = `rgba(255,60,50,${q < 0.8 ? 0.95 : (1 - q) / 0.2})`; g.lineWidth = Math.max(2, s * 0.035);
        for (let i = 0; i < 4; i++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(r, -r * 0.45); g.lineTo(r, -r); g.lineTo(r * 0.55, -r); g.stroke(); }
        g.restore();
      }
      return true;
    }
    case "hunt_done": {
      const u = unitOf(units, e.id);
      if (!u) return true;
      const c = P(u.x, u.y, 0.6), s = c[2];
      glowAt(g, c[0], c[1], s * (0.6 + p), "255,210,80", 0.8 * (1 - p));
      for (let i = 0; i < (lowQ ? 6 : 12); i++) { // เหรียญพุ่งกระจาย
        const a = hash(i, e.seq) * TAU, k = Math.min(1, p * 1.4), r = 0.6 * k * (0.5 + hash(i + 2, e.seq) * 0.6), z = 0.6 + Math.sin(k * Math.PI) * (0.6 + hash(i + 4, e.seq) * 0.5) - k * 0.4;
        const q = P(u.x + Math.cos(a) * r, u.y + Math.sin(a) * r, Math.max(0.05, z)), w = Math.abs(Math.cos(now / 60 + i)) * q[2] * 0.045;
        g.fillStyle = `rgba(242,196,48,${1 - Math.max(0, (p - 0.7) / 0.3)})`; g.beginPath(); g.ellipse(q[0], q[1], Math.max(0.8, w), q[2] * 0.045, 0, 0, TAU); g.fill();
      }
      if (p < 0.5) { const k = p / 0.5, b = P(u.x, u.y, 1.5 + k * 0.3); g.fillStyle = `rgba(255,120,40,${0.8 * (1 - k)})`; g.beginPath(); g.arc(b[0], b[1], s * 0.2 * (1 - k * 0.5), 0, TAU); g.fill(); emoji(g, "📜", b[0], b[1], s * 0.3 * (1 - k * 0.6), 1 - k); }
      return true;
    }
    default: return false;
  }
}
// ไฟหน้ารถไฟที่กำลังมาที่ขอบแผนที่ (ระหว่างเตือน)
function p4AirAlways(g, fd, now) {
  const rail = fd.rail;
  if (!rail || !rail.warn) return;
  const dir = rail.dir || 1, c = P(dir > 0 ? -0.6 : MAP_W + 0.6, RAIL_Y + 0.5, 0.35), pulse = 0.6 + 0.4 * Math.sin(now / 200);
  glowAt(g, c[0], c[1], c[2] * 1.4, "255,245,215", 0.55 * pulse);
  glowAt(g, c[0], c[1], c[2] * 0.4, "255,255,240", 0.9);
}

// =================================================================== ground (ใต้ไฮไลต์)
export function ground(g, fd, info, now, lowQ = false) {
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
    const pos = smooth(d.id, d.x, d.y, now, DAEMON_MS, pathOf(fd, "mob_move", d.id) || pathOf(fd, "daemon_move", d.id));
    const [x, y, s] = P(pos.x + 0.5, pos.y + 0.5);
    g.fillStyle = "rgba(60,0,40,.35)"; g.beginPath(); g.ellipse(x, y, s * 0.45, s * 0.17, 0, 0, TAU); g.fill();
  }
  // ขั้น 3: เงาทอดของถัง/หินเวท · รอยไหม้ระเบิด · เงา/เป้าของยานลำเลียง
  const night = !!fd.night || LAST_NIGHT;
  for (const b of fd.barrels || []) dynShadow(g, b.x, b.y, HEIGHT.fd_eos_barrel, 0.2, night);
  for (const c of fd.crystals || []) dynShadow(g, c.x, c.y, HEIGHT.fd_eos_crystal, 0.22, night);
  for (const e of fxActive(fd, now)) {
    if (e.kind !== "barrel_boom") continue;
    const p = fxT(e, now, fx.barrel_boom);
    for (const t of e.tiles || [{ x: e.x, y: e.y }]) {
      const c = t.x === e.x && t.y === e.y;
      gEllipse(g, t.x + 0.5, t.y + 0.5, c ? 0.5 : 0.36, 0.01, 18, c ? 0.5 : 0.32);
      g.fillStyle = `rgba(16,10,8,${(c ? 0.7 : 0.45) * (1 - p * p)})`; g.fill();
    }
  }
  p4Ground(g, fd, now, night); // ขั้น 4
  pveGround(g, fd, now, lowQ);
  pve3Ground(g, fd, now, lowQ); // วงไฟแคมป์ · เส้นทางยักษ์หิน
  for (const ds of shipsOf(fd)) { // ยานลงได้หลายลำพร้อมกัน (กลางวัน — ผู้ใช้สั่ง 2026-11-10)
  if (ds && ds.state === "landed") {
    const z = dropZ(ds, now);
    gEllipse(g, ds.x + 1, ds.y + 1, 0.95, 0, 30, 0.8); g.fillStyle = `rgba(0,0,0,${Math.max(0.08, 0.42 - z * 0.04)})`; g.fill();
  } else if (ds && ds.state === "warn") {
    const cx = ds.x + 1, cy = ds.y + 1, a = 0.55 + 0.3 * Math.sin(now / 160);
    g.strokeStyle = `rgba(255,50,40,${a})`; g.lineWidth = 2;
    g.setLineDash([8, 6]); g.lineDashOffset = -now / 30; gEllipse(g, cx, cy, 1.15, 0.03, 40); g.stroke(); g.setLineDash([]);
    gEllipse(g, cx, cy, 0.5, 0.03, 24); g.stroke();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const p0 = P(cx + dx * 0.6, cy + dy * 0.6, 0.03), p1 = P(cx + dx * 1.3, cy + dy * 1.3, 0.03);
      g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
    }
  }
  }
  void info;
}

// =================================================================== items (เรียงความลึกกับตัวละคร)
export function items(list, g, fd, info, units, now, lowQ) {
  const night = !!fd.night || LAST_NIGHT;
  // รถ 1 ช่อง (ผู้ใช้สั่ง 2026-11-09 — ขึ้นขี่แล้วขับแบบม้า): จอด = ตามตำแหน่งรถ · มีคนขับ = ใต้หมากคนขับ (ตามตำแหน่งวาดของหมาก วิ่งไปพร้อมกัน)
  //  ภาพรถของผู้ใช้หันซ้ายเป็นค่าเริ่ม → กลับด้านตามทิศที่วิ่งบนจอ (หมุนกล้องได้) · ขึ้นรถ = รถยุบรับน้ำหนัก + ไฟหน้าวาบ · ชน = รถพุ่งไปครึ่งช่องแล้วถอย
  for (const c of fd.cars || []) {
    const drv = c.driver ? unitAt(units, c.driver) : null;
    let cx, cy, moving = false;
    if (drv) { cx = drv.x; cy = drv.y; }
    else { const pos = smooth(c.id, c.x, c.y, now, CAR_MS); cx = pos.x + 0.5; cy = pos.y + 0.5; moving = pos.moving; }
    const last = MOB_LAST.get(c.id);
    if (last && Math.abs(cx - last.x) + Math.abs(cy - last.y) > 0.002) moving = true;
    if (!MOB_HEAD.has(c.id)) MOB_HEAD.set(c.id, { dx: c.dx || -1, dy: c.dy || 0 });
    const head = mobFacing(c.id, { x: cx, y: cy });
    const flip = screenFace(cx, cy, head) > 0;
    const mnt = lastFx("car_mount"), ramE = lastFx("car_ram");
    const mk = mnt && mnt.car === c.id ? fxT(mnt, now, 700) : 1, rk = ramE && ramE.car === c.id ? fxT(ramE, now, 520) : 1;
    let lx = 0, ly = 0;
    if (rk >= 0 && rk < 1 && ramE.at) { const j = Math.sin(rk * Math.PI) * 0.45; lx = (ramE.at.x - ramE.x) * j; ly = (ramE.at.y - ramE.y) * j; }
    const squash = mk >= 0 && mk < 1 ? Math.sin(mk * Math.PI * 2) * 0.06 * (1 - mk) : 0;
    const im = img(`/eos/img/car${c.img}.webp`), col = CAR_COLORS[c.img] || CAR_COLORS[1];
    const X = cx + lx, Y = cy + ly;
    list.push({
      d: depthOf(X, Y) - (drv ? 0.02 : 0),
      f: () => {
        const rumble = moving && !lowQ ? Math.sin(now / 45) * 0.012 : 0;
        if (!im) { drawCar(g, X, Y, Math.abs(head.dx) >= Math.abs(head.dy) ? "h" : "v", col, night, now, moving); return; }
        const [sx, sy, s] = P(X, Y + 0.12);
        const w = s * 1.5, h = w * (im.naturalHeight / im.naturalWidth) * (1 - squash);
        g.fillStyle = "rgba(0,0,0,.4)"; g.beginPath(); g.ellipse(sx, sy - s * 0.03, w * 0.46, s * 0.2, 0, 0, TAU); g.fill();
        g.save(); g.translate(sx, sy - rumble * s); if (flip) g.scale(-1, 1);
        g.drawImage(im, -w / 2, -h, w, h); g.restore();
        const hx = sx + (flip ? 1 : -1) * w * 0.42, hy = sy - h * 0.3;
        if (night || (mk >= 0 && mk < 1)) glowAt(g, hx, hy, s * (night ? 0.7 : 0.45), "255,240,200", night ? 0.6 : 0.8 * (1 - mk));
        if (moving && !lowQ) for (let i = 0; i < 4; i++) {
          const t = ((now / 380) + i / 4) % 1, ex = sx - (flip ? 1 : -1) * (w * 0.5 + t * s * 0.5), ey = sy - s * (0.05 + t * 0.12);
          g.fillStyle = `rgba(190,185,175,${0.32 * (1 - t)})`; g.beginPath(); g.arc(ex, ey, s * (0.05 + t * 0.1), 0, TAU); g.fill();
        }
      },
    });
  }
  // โชโกโบะว่างในคอก / ข้างทาง
  for (const c of fd.chocos || []) {
    if (c.x == null || c.rider) continue;
    const bob = lowQ ? 0 : Math.abs(Math.sin(now / 420 + c.x)) * 0.04;
    const flip = hash(c.x, c.y) < 0.5;
    list.push({ d: depthOf(c.x + 0.5, c.y + 0.5), f: () => sprite(g, CHOCO_IMG, c.x + 0.5, c.y + 0.55, bob, 0.8, flip) });
  }
  // โชโกโบะใต้คนขี่ (ตามตำแหน่งวาดของหมาก)
  for (const [pid] of Object.entries(fd.riders || {})) {
    const u = unitAt(units, pid);
    if (!u) continue;
    const bob = lowQ ? 0 : Math.abs(Math.sin(now / 260)) * 0.05;
    list.push({ d: depthOf(u.x, u.y) - 0.01, f: () => sprite(g, CHOCO_IMG, u.x, u.y + 0.08, bob, 1.1, false) });
  }
  // ปีศาจ
  for (const d of fd.daemons || []) {
    const pos = mobPos(units, d.id, smooth(d.id, d.x, d.y, now, DAEMON_MS, pathOf(fd, "mob_move", d.id) || pathOf(fd, "daemon_move", d.id)));
    const cx = pos.x + 0.5, cy = pos.y + 0.55;
    list.push({
      d: depthOf(cx, cy),
      f: () => {
        const breathe = lowQ ? 0 : Math.sin(now / 520 + d.kind) * 0.03;
        const [sx, sy, s] = P(cx, cy, 0);
        if (d.trait === "boss") { drawBoss(g, d, cx, cy, sx, sy, s, now, lowQ, breathe); return; }
        const tr = TRAIT_LOOK[d.trait] || null;
        glowAt(g, sx, sy - s * 0.6, s * 1.1, tr ? tr.rgb : "150,30,120", tr ? 0.5 + 0.15 * Math.sin(now / 240) : 0.35);
        if (d.trait === "healer" && !lowQ) { // วงสมุนไพรเขียวหมุนใต้เท้า
          g.save(); g.translate(sx, sy); g.scale(1, 0.42); g.rotate(now / 1600);
          g.strokeStyle = "rgba(120,255,170,.55)"; g.lineWidth = 2; g.setLineDash([6, 5]); g.beginPath(); g.arc(0, 0, s * 0.6, 0, TAU); g.stroke(); g.setLineDash([]); g.restore();
        }
        sprite(g, daemonImg(d.kind), cx, cy, breathe, d.trait === "bomber" ? 1.3 : 1.45, d.kind % 2 === 0);
        if (d.trait === "bomber") { // ไส้ตะเกียงลุก + ตัวพองตามจังหวะ
          const k = 0.5 + 0.5 * Math.sin(now / 130);
          glowAt(g, sx, sy - s * 0.75, s * (0.45 + k * 0.25), "255,120,30", 0.55 + k * 0.3);
          if (!lowQ) for (let i = 0; i < 4; i++) { const a = now / 90 + i * 1.6; g.fillStyle = `rgba(255,${180 + i * 15},80,${0.9 - i * 0.15})`; g.fillRect(sx + Math.cos(a) * s * 0.12, sy - s * 1.35 - ((now / 6 + i * 13) % 14), 2, 2); }
        }
        if (d.trait === "healer") { const top = P(cx, cy, 1.75); g.fillStyle = "#7dffaa"; g.fillRect(top[0] - 2, top[1] - 7, 4, 14); g.fillRect(top[0] - 7, top[1] - 2, 14, 4); }
        hpPips(g, cx, cy, 1.6, d.hp, d.maxHp, d.armor, d.maxArmor);
      },
    });
  }
  // ขั้น 3: มอนสเตอร์ (เลื่อนนุ่มตามเส้นทาง "mob_move" · พุ่งเข้าหาเป้าตอน "mob_attack")
  const hitE = lastFx("mob_hit");
  for (const m of fd.mobs || []) {
    if (m.type === "nest") { // รังปีศาจ (อยู่กับที่)
      const hn = hitE && hitE.id === m.id ? fxT(hitE, now, fx.mob_hit) : 1;
      list.push({ d: depthOf(m.x + 0.5, m.y + 0.5), f: () => drawNest(g, m, m.x + 0.5, m.y + 0.55, now, lowQ, hn) });
      continue;
    }
    if (m.type === "giant") { // ยักษ์หิน (เดินตามเส้นทาง — เลื่อนนุ่ม)
      const gp = smooth(`mob:${m.id}`, m.x, m.y, now, 1400);
      const gh = mobFacing(m.id, gp), hg = hitE && hitE.id === m.id ? fxT(hitE, now, fx.mob_hit) : 1;
      list.push({ d: depthOf(gp.x + 0.5, gp.y + 0.55), f: () => drawGiant(g, m, gp.x + 0.5, gp.y + 0.55, now, lowQ, gp.moving, screenFace(gp.x + 0.5, gp.y + 0.5, gh) > 0 ? 1 : -1, hg) });
      continue;
    }
    const beast = m.type === "beast";
    const pos = mobPos(units, m.id, smooth(`mob:${m.id}`, m.x, m.y, now, MOB_MS, pathOf(fd, "mob_move", m.id)));
    let head = mobFacing(m.id, pos), lunge = 0;
    const atk = mobAttackOf(m.id, now), tu = atk ? unitAt(units, atk.a.target) : null;
    if (tu) {
      head = { dx: tu.x - (pos.x + 0.5), dy: tu.y - (pos.y + 0.5) };
      MOB_HEAD.set(m.id, head);
      lunge = Math.sin(Math.min(1, atk.p / 0.6) * Math.PI) * 0.24;
    }
    const hl = Math.hypot(head.dx, head.dy) || 1;
    const cx = pos.x + 0.5 + (head.dx / hl) * lunge, cy = pos.y + 0.55 + (head.dy / hl) * lunge;
    const hit = hitE && hitE.id === m.id ? fxT(hitE, now, fx.mob_hit) : 1;
    list.push({
      d: depthOf(cx, cy),
      f: () => {
        const [sx, sy, s] = P(cx, cy);
        const face = screenFace(cx, cy, head);
        g.fillStyle = "rgba(0,0,0,.38)"; g.beginPath(); g.ellipse(sx, sy, s * (beast ? 0.6 : 0.3), s * (beast ? 0.21 : 0.11), 0, 0, TAU); g.fill();
        const shake = hit < 1 ? Math.sin(hit * 50) * s * 0.03 * (1 - hit) : 0;
        if (beast) drawBeast(g, sx + shake, sy, s, face, now, pos.moving, lowQ);
        else {
          const bob = pos.moving && !lowQ ? Math.abs(Math.sin(now / 140)) * 0.04 : 0;
          sprite(g, MAGITEK_IMG, cx + shake / s, cy, bob, 1.45, face > 0); // ภาพหันซ้าย → หันขวาให้กลับด้าน
          if (m.trait === "sniper") { const v = P(cx + face * 0.12, cy, 1.18); glowAt(g, v[0], v[1], s * 0.28, "255,40,40", 0.75 + 0.2 * Math.sin(now / 150)); g.fillStyle = "#ff4a3a"; g.fillRect(v[0] - 4, v[1] - 1.5, 8, 3); }
        }
        if (hit < 1) { const q = P(cx, cy, beast ? 1.0 : 0.7); glowAt(g, q[0], q[1], s * (beast ? 1.1 : 0.7), "255,255,255", (1 - hit) * 0.7); }
        const top = hpPips(g, cx, cy, beast ? 2.0 : 1.6, m.hp, m.maxHp, m.armor, m.maxArmor);
        if (m.aggro) glowAt(g, top[0], top[1] - s * 0.22, s * 0.32, "255,40,30", 0.55 + 0.25 * Math.sin(now / 200));
      },
    });
  }
  // PVE รอบสอง: รถเสบียง (ยูนิตฝ่ายเรา — วาดแทนหมาก) · ดวงวิญญาณเพื่อนที่ล้ม · หมุดภารกิจสำรวจ · โล่เสา
  if (fd.convoy) {
    const c = fd.convoy, cu = unitAt(units, c.id);
    const pos = cu ? { x: cu.x - 0.5, y: cu.y - 0.5 } : smooth(c.id, c.x, c.y, now, CAR_MS, pathOf(fd, "convoy_move", c.id) || null);
    const head = mobFacing(c.id, { x: pos.x + 0.5, y: pos.y + 0.5 });
    list.push({ d: depthOf(pos.x + 0.5, pos.y + 0.5), f: () => drawConvoy(g, pos.x + 0.5, pos.y + 0.5, head, c, now, night, lowQ) });
  }
  for (const sp of fd.spirits || []) list.push({ d: depthOf(sp.x + 0.5, sp.y + 0.5), f: () => drawSpirit(g, sp, now, lowQ) });
  for (const c of fd.civs || []) { // พลเรือน (ยูนิตฝ่ายเรา — วาดแทนหมาก)
    const cu = unitAt(units, c.id), pos = cu ? { x: cu.x, y: cu.y } : { x: c.x + 0.5, y: c.y + 0.5 };
    const lead = c.follow ? unitAt(units, c.follow) : null;
    list.push({ d: depthOf(pos.x, pos.y), f: () => drawCivilian(g, c, pos.x, pos.y + 0.05, now, lowQ, lead) });
  }
  for (const q of fd.quests || []) if (q.type === "scout") list.push({ d: depthOf(q.x + 0.5, q.y + 0.5), f: () => drawBeacon(g, q, now, lowQ) });
  for (const pl of fd.pillars || []) if ((pl.ward || 0) > 0) list.push({ d: depthOf(pl.x + 0.5, pl.y + 0.5) + 0.01, f: () => drawWard(g, pl, now) });
  // ขั้น 3: ยานลำเลียงจอดลอย (ทับคนที่อยู่ใต้ยาน)
  for (const ds of shipsOf(fd)) {
    if (ds.state !== "landed") continue;
    const z = dropZ(ds, now);
    list.push({
      d: Math.max(depthOf(ds.x + 0.1, ds.y + 0.1), depthOf(ds.x + 1.9, ds.y + 0.1), depthOf(ds.x + 0.1, ds.y + 1.9), depthOf(ds.x + 1.9, ds.y + 1.9)),
      f: () => drawDropship(g, ds.x, ds.y, z, now, lowQ),
    });
  }
  // หีบสมบัติ (ผู้ใช้สั่ง 2026-11-10 — ของให้ไปเก็บทั่วแผนที่)
  for (const c of fd.chests || []) list.push({ d: depthOf(c.x + 0.5, c.y + 0.5), f: () => drawChest(g, c.x + 0.5, c.y + 0.5, now, night, lowQ) });
  p4Items(list, g, fd, units, now, lowQ, night); // ขั้น 4
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
    case "car_mount": sfx("car_door"); sfx("car_start", { delay: 0.35, gain: 0.7 }); break;
    case "car_leave": sfx("car_door"); break;
    case "car_ram": sfx("car_drive", { gain: 0.7 }); sfx("car_hit", { delay: 0.18 }); break;
    case "choco_mount": sfx("chocobo_call"); sfx("chocobo_wings", { delay: 0.2, gain: 0.7 }); break;
    case "choco_dismount": sfx("chocobo_wings", { gain: 0.7 }); break;
    case "choco_fall": sfx("chocobo_call", { gain: 0.9 }); sfx("chocobo_run", { delay: 0.3, gain: 0.6 }); break;
    case "choco_back": sfx("chocobo_call", { gain: 0.6 }); break;
    case "daemon_spawn": sfx("daemon_spawn"); sfx("daemon_growl", { delay: 0.5 }); break;
    case "daemon_move": sfx("daemon_growl", { gain: 0.6 }); break;
    case "daemon_attack": sfx("daemon_attack"); break;
    case "daemon_struck": sfx("daemon_growl", { gain: 0.5 }); break;
    case "daemon_die": sfx("daemon_die"); if (e.loot && e.loot.length) sfx("hunt_done", { delay: 0.5, gain: 0.7 }); break;
    case "daemon_dissolve": sfx("daemon_dissolve"); sfx("day_break", { delay: 0.5, gain: 0.7 }); break;
    case "bridge": sfx("bridge_lever"); sfx("bridge_move", { delay: 0.35, gain: 0.85 }); break;
    case "dome_on": sfx("dome_on"); break;
    case "dome_off": sfx("dome_off"); break;
    case "lights": sfx("lights_off", { gain: e.off ? 0.9 : 0.5 }); break;
    case "gysahl_lure": sfx("throw_swoosh"); sfx("chocobo_call", { delay: 0.55 }); sfx("chocobo_run", { delay: 0.75, gain: 0.7 }); break;
    case "gysahl_call": sfx("gysahl_munch"); sfx("chocobo_run", { delay: 0.15, gain: 0.7 }); break;
    case "wreck_push": sfx("wreck_push"); break;
    // ขั้น 3
    case "barrel_boom": sfx("barrel_hit", { gain: 0.6 }); sfx("barrel_explode", { delay: 0.08 }); break;
    case "crystal_break": sfx("crystal_pick"); break;
    case "flask": {
      const el = e.element === "ice" ? "flask_ice" : e.element === "thunder" ? "flask_thunder" : "flask_fire";
      sfx("throw_swoosh"); sfx("flask_shatter", { delay: 0.6 }); sfx(el, { delay: 0.66 });
      if (e.element === "fire") sfx("fire_spread", { delay: 1.0, gain: 0.55 });
      if (Array.isArray(e.shock) && e.shock.length) sfx("water_shock", { delay: 0.85 });
      break;
    }
    case "turret_shot": sfx("turret_shot"); break;
    case "mob_move": {
      const ts = new Set((e.moves || []).map((m) => m.type));
      if (ts.has("beast")) sfx("beast_step", { gain: 0.8 });
      if (ts.has("magitek")) sfx("magitek_step", { gain: 0.7 });
      if (ts.has("daemon")) sfx("daemon_growl", { gain: 0.6 });
      break;
    }
    case "mob_attack": {
      const ts = new Set((e.attacks || []).map((a) => a.type));
      if (ts.has("beast")) sfx("beast_attack", { delay: 0.1 });
      if (ts.has("magitek")) sfx("magitek_attack", { delay: 0.1 });
      if (ts.has("daemon")) sfx("daemon_attack", { delay: 0.1 });
      if (ts.has("boss")) sfx("beast_attack", { delay: 0.1 });
      if ((e.pillars || []).length) sfx((e.pillars || []).some((h) => h.lost) ? "dome_off" : "crystal_pick", { delay: 0.25, gain: 0.8 });
      break;
    }
    case "mob_die": sfx(e.type === "beast" ? "beast_roar" : "magitek_die", { gain: e.type === "beast" ? 0.7 : 1 }); if (e.loot && e.loot.length) sfx("hunt_done", { delay: 0.5, gain: 0.7 }); break;
    case "pillar_repair": sfx("dome_on", { gain: 0.6 }); break;
    case "boss_warn": sfx("dropship_alarm", { gain: 0.7, dur: 2.4 }); sfx("daemon_growl", { delay: 0.4 }); break;
    case "boss_land": sfx("beast_roar"); sfx("barrel_explode", { delay: 0.2, gain: 0.8 }); break;
    case "boss_roar": sfx("beast_roar", { gain: 0.8 }); sfx("daemon_spawn", { delay: 0.4, gain: 0.7 }); break;
    case "boss_die": sfx("daemon_die"); sfx("royal_arms", { delay: 0.6 }); sfx("hunt_done", { delay: 1.2 }); break;
    case "mob_heal": sfx("camp_buff", { gain: 0.45 }); break;
    case "mob_shot": sfx("turret_shot", { gain: 0.8 }); break;
    case "mob_boom": sfx("barrel_explode"); break;
    case "blood_moon": sfx("night_fall"); sfx("daemon_growl", { delay: 0.8, gain: 0.8 }); break;
    case "quest_new": sfx("hunt_board"); break;
    case "quest_done": sfx("hunt_done"); sfx("royal_arms", { delay: 0.3, gain: 0.6 }); break;
    case "pillar_ward": sfx("dome_on", { gain: 0.5 }); break;
    case "pillar_ward_hit": sfx("dome_off", { gain: 0.5 }); break;
    case "revive_help": sfx("camp_buff", { gain: 0.7 }); break;
    case "convoy_start": sfx("car_start"); sfx("car_horn", { delay: 0.5, gain: 0.6 }); break;
    case "convoy_move": sfx("car_drive", { gain: 0.5, dur: 1.2 }); break;
    case "convoy_done": sfx("car_horn"); sfx("hunt_done", { delay: 0.4 }); break;
    case "convoy_fail": sfx("barrel_explode", { gain: 0.8 }); break;
    case "chest_spawn": sfx("crystal_pick", { gain: 0.5 }); break;
    // PVE รอบสาม (ใช้เสียงที่มีอยู่แล้ว)
    case "combo": sfx("car_hit", { gain: 0.6 }); sfx("royal_arms", { delay: 0.1, gain: 0.55 }); break;
    case "power_turret": sfx("turret_shot", { gain: 0.8 }); break;
    case "power_fountain": sfx("camp_buff", { gain: 0.5 }); break;
    case "nest_spawn": sfx("daemon_spawn", { gain: 0.6 }); break;
    case "nest_burst": sfx("daemon_spawn"); sfx("daemon_growl", { delay: 0.4, gain: 0.8 }); break;
    case "giant_warn": sfx("beast_step", { gain: 0.9 }); sfx("beast_step", { delay: 0.6, gain: 0.9 }); sfx("beast_roar", { delay: 1.0, gain: 0.6 }); break;
    case "giant_step": sfx("beast_step"); sfx("beast_step", { delay: 0.5 }); if (e.hits && e.hits.length) sfx("car_hit", { delay: 0.3 }); break;
    case "giant_leave": sfx("beast_step", { gain: 0.5 }); break;
    case "giant_die": sfx("barrel_explode"); sfx("beast_roar", { delay: 0.2, gain: 0.8 }); sfx("hunt_done", { delay: 1.2 }); break;
    case "civ_spawn": sfx("chocobo_call", { gain: 0.35 }); break;
    case "civ_follow": sfx("chocobo_run", { gain: 0.4 }); break;
    case "civ_saved": sfx("hunt_done"); sfx("camp_buff", { delay: 0.3, gain: 0.6 }); break;
    case "civ_lost": sfx("daemon_attack", { gain: 0.6 }); break;
    case "gauge_full": sfx("royal_arms", { gain: 0.8 }); break;
    case "barrage": sfx("throw_swoosh"); sfx("barrel_explode", { delay: 0.5 }); sfx("barrel_explode", { delay: 0.8, gain: 0.8 }); break;
    case "final_start": sfx("night_fall"); sfx("beast_roar", { delay: 0.6 }); sfx("dropship_alarm", { delay: 1.0, gain: 0.6, dur: 2.0 }); break;
    case "final_wave": sfx("daemon_spawn"); break;
    case "chest_open": sfx("tomb_open", { gain: 0.8 }); sfx("hunt_done", { delay: 0.5 }); break;
    case "beast_roar": sfx("beast_roar"); break;
    case "dropship_warn": sfx("dropship_alarm"); break;
    case "dropship_land": sfx("dropship_land"); break;
    case "dropship_leave": sfx("dropship_land", { gain: 0.45 }); break;
    // ขั้น 4 (เสียงยาวตัดด้วย dur — eosAudio)
    case "train_warn": sfx("train_warn", { gain: 0.85 }); sfx("train_horn", { delay: 0.9, gain: 0.6, dur: 2.4 }); break;
    case "train_pass":
      sfx("train_horn", { gain: 0.85, dur: 2.2 }); sfx("train_pass", { delay: 0.25, dur: 3.2 });
      if (e.carried && e.carried.length) { sfx("train_depart", { gain: 0.55, dur: 2.0 }); sfx("train_arrive", { delay: 1.6, gain: 0.55, dur: 2.6 }); }
      for (const h of (e.hits || []).slice(0, 3)) if (h.from) sfx("car_hit", { delay: Math.max(0, trainAtX(e.dir || 1, h.from.x + 0.5) * fx.train_pass / 1000), gain: 0.8 });
      break;
    case "gondola": sfx("gondola_row", { gain: 0.85, dur: 2.6 }); break;
    case "tunnel": sfx("tunnel_enter"); break;
    case "camp_meal": sfx("camp_ignite"); sfx("camp_meal", { delay: 0.25 }); sfx("camp_buff", { delay: 1.0, gain: 0.85 }); break;
    case "fish":
      sfx("fish_cast", { dur: 1.2 }); sfx("fish_bite", { delay: 1.05, dur: 1.4 });
      if (e.result === "giant") sfx("fish_drag", { delay: 1.35, dur: 2.6 });
      else { sfx("fish_catch", { delay: 1.35 }); if (e.result !== "coins") sfx("fish_flap", { delay: 1.6, gain: 0.8 }); }
      break;
    case "tomb_open": sfx("tomb_open"); sfx("royal_arms", { delay: 0.95, gain: 0.9 }); break;
    case "royal_drain": sfx("royal_drain", { gain: 0.75, dur: 2.0 }); break;
    case "hunt_board": sfx("hunt_board"); break;
    case "hunt_done": sfx("hunt_done"); break;
    default: break;
  }
}
// =================================================================== PVE รอบสาม: ภาพของระบบใหม่ (server/fodlan/eosExtra.js)
// รังปีศาจ: เนินรากหนามสีม่วงดำ · แกนกลางเรืองชมพูเต้นเป็นจังหวะ · ควันม่วงลอยขึ้น
function drawNest(g, m, cx, cy, now, lowQ, hit) {
  const [sx, sy, s] = P(cx, cy);
  const k = 0.5 + 0.5 * Math.sin(now / 420 + m.x);
  g.save(); g.translate(sx, sy); g.scale(1, 0.42);
  const gr = g.createRadialGradient(0, 0, s * 0.1, 0, 0, s * 0.85);
  gr.addColorStop(0, `rgba(190,40,150,${0.35 + 0.2 * k})`); gr.addColorStop(1, "rgba(60,0,50,0)");
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, s * 0.85, 0, TAU); g.fill();
  g.restore();
  // ราก/หนามรอบเนิน (หลังก่อน หน้าทับ)
  const thorns = [];
  for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + hash(i, m.x * 7 + m.y) * 0.4; thorns.push([a, 0.34 + hash(i, 5) * 0.12, 0.35 + hash(i, 9) * 0.3]); }
  thorns.sort((a, b) => Math.sin(a[0]) - Math.sin(b[0]));
  const thorn = ([a, r, h]) => {
    const bx = cx + Math.cos(a) * r, by = cy + Math.sin(a) * r * 0.9;
    const b0 = P(bx - Math.sin(a) * 0.06, by + Math.cos(a) * 0.06), b1 = P(bx + Math.sin(a) * 0.06, by - Math.cos(a) * 0.06), tip = P(bx + Math.cos(a) * 0.16, by + Math.sin(a) * 0.16, h);
    g.fillStyle = "#2a0d24"; g.beginPath(); g.moveTo(b0[0], b0[1]); g.lineTo(tip[0], tip[1]); g.lineTo(b1[0], b1[1]); g.closePath(); g.fill();
    g.strokeStyle = "rgba(200,60,160,.45)"; g.lineWidth = 1; g.beginPath(); g.moveTo((b0[0] + b1[0]) / 2, (b0[1] + b1[1]) / 2); g.lineTo(tip[0], tip[1]); g.stroke();
  };
  for (const t of thorns) if (Math.sin(t[0]) < 0) thorn(t);
  // เนิน
  const top = P(cx, cy, 0.42), shake = hit < 1 ? Math.sin(hit * 50) * s * 0.03 * (1 - hit) : 0;
  const mg = g.createRadialGradient(top[0] - s * 0.1, top[1], s * 0.05, sx, sy - s * 0.1, s * 0.5);
  mg.addColorStop(0, "#5a1d4e"); mg.addColorStop(1, "#1c0818");
  g.fillStyle = mg; g.beginPath(); g.ellipse(sx + shake, sy - s * 0.12, s * 0.4, s * 0.3, 0, Math.PI, 0); g.lineTo(sx + s * 0.4 + shake, sy - s * 0.12); g.ellipse(sx + shake, sy - s * 0.12, s * 0.4, s * 0.12, 0, 0, Math.PI); g.fill();
  // ช่องแกนกลางเรือง
  glowAt(g, sx + shake, sy - s * 0.32, s * (0.45 + k * 0.2), "255,60,190", 0.55 + 0.3 * k);
  g.fillStyle = `rgba(255,${120 + Math.floor(k * 80)},220,.95)`; g.beginPath(); g.ellipse(sx + shake, sy - s * 0.3, s * 0.09, s * 0.06 + k * s * 0.02, 0, 0, TAU); g.fill();
  for (const t of thorns) if (Math.sin(t[0]) >= 0) thorn(t);
  if (!lowQ) for (let i = 0; i < 5; i++) { const ph = ((now / 1800) + i / 5) % 1, px = sx + Math.sin(i * 2.3 + now / 900) * s * 0.18, py = sy - s * (0.4 + ph * 1.1); g.fillStyle = `rgba(150,40,130,${0.45 * (1 - ph)})`; g.beginPath(); g.arc(px, py, s * (0.05 + ph * 0.08), 0, TAU); g.fill(); }
  if (hit < 1) glowAt(g, sx, sy - s * 0.3, s * 0.7, "255,255,255", (1 - hit) * 0.7);
  hpPips(g, cx, cy, 1.1, m.hp, m.maxHp, m.armor, m.maxArmor);
}
// ยักษ์หิน: ร่างหินสูง 3 ช่อง ขาสองต้น ลำตัวหินเหลี่ยม ตะไคร่เขียว อักษรรูนฟ้าเรือง ตาเรือง · ก้าวเดินโยกตัว
function drawGiant(g, m, cx, cy, now, lowQ, moving, face, hit) {
  const [sx, sy, s] = P(cx, cy);
  const sway = moving && !lowQ ? Math.sin(now / 160) * s * 0.05 : 0, lift = moving && !lowQ ? Math.abs(Math.sin(now / 160)) * s * 0.06 : 0;
  const shake = hit < 1 ? Math.sin(hit * 50) * s * 0.04 * (1 - hit) : 0;
  const X0 = sx + shake;
  g.fillStyle = "rgba(0,0,0,.42)"; g.beginPath(); g.ellipse(sx, sy, s * 1.0, s * 0.34, 0, 0, TAU); g.fill();
  const stone = "#857c6d", dark = "#5a5348", hi = "#a69c8a", moss = "#5f7a3c", rune = "120,230,255";
  const rk = 0.6 + 0.4 * Math.sin(now / 500);
  // ขา
  const leg = (dx, up) => { g.fillStyle = dark; g.fillRect(X0 + dx - s * 0.17, sy - s * 1.05 - up, s * 0.34, s * 1.05 + up * 0.2); g.fillStyle = stone; g.fillRect(X0 + dx - s * 0.17, sy - s * 1.05 - up, s * 0.22, s * 1.0); g.fillStyle = hi; g.fillRect(X0 + dx - s * 0.22, sy - s * 0.12 - up * 0.2, s * 0.44, s * 0.12); };
  leg(-s * 0.3, moving ? lift : 0); leg(s * 0.3, moving ? s * 0.06 - lift : 0);
  // ลำตัว
  const bx = X0 + sway, by = sy - s * 1.0;
  g.fillStyle = dark; g.beginPath(); g.moveTo(bx - s * 0.62, by); g.lineTo(bx - s * 0.75, by - s * 1.25); g.lineTo(bx + s * 0.75, by - s * 1.3); g.lineTo(bx + s * 0.62, by); g.closePath(); g.fill();
  g.fillStyle = stone; g.beginPath(); g.moveTo(bx - s * 0.62, by); g.lineTo(bx - s * 0.75, by - s * 1.25); g.lineTo(bx + s * 0.2, by - s * 1.28); g.lineTo(bx + s * 0.12, by); g.closePath(); g.fill();
  // ไหล่ + แขน
  for (const d of [-1, 1]) {
    const ax = bx + d * s * 0.85, ay = by - s * 1.15;
    g.fillStyle = d * face > 0 ? stone : dark; g.beginPath(); g.ellipse(ax, ay, s * 0.26, s * 0.2, 0, 0, TAU); g.fill();
    g.fillStyle = dark; g.fillRect(ax - s * 0.14, ay, s * 0.28, s * 0.95 + (moving ? Math.sin(now / 160 + d) * s * 0.05 : 0));
    g.fillStyle = hi; g.beginPath(); g.ellipse(ax, ay + s * 1.0, s * 0.2, s * 0.16, 0, 0, TAU); g.fill();
  }
  // ตะไคร่
  g.fillStyle = moss; for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(bx + (hash(i, 3) - 0.5) * s * 1.1, by - s * (0.1 + hash(i, 7) * 1.1), s * 0.12, s * 0.06, 0, 0, TAU); g.fill(); }
  // อักษรรูนบนอก
  g.strokeStyle = `rgba(${rune},${0.55 + 0.4 * rk})`; g.lineWidth = Math.max(1.5, s * 0.035);
  g.beginPath(); g.moveTo(bx - s * 0.25, by - s * 0.9); g.lineTo(bx, by - s * 0.55); g.lineTo(bx + s * 0.25, by - s * 0.9); g.moveTo(bx, by - s * 0.55); g.lineTo(bx, by - s * 0.25); g.stroke();
  glowAt(g, bx, by - s * 0.6, s * 0.5, rune, 0.3 * rk);
  // หัว
  const hx = bx + face * s * 0.08, hy = by - s * 1.45;
  g.fillStyle = dark; g.fillRect(hx - s * 0.3, hy - s * 0.42, s * 0.6, s * 0.46);
  g.fillStyle = stone; g.fillRect(hx - s * 0.3, hy - s * 0.42, s * 0.4, s * 0.42);
  for (const d of [-1, 1]) { const ex = hx + d * s * 0.12 + face * s * 0.05; glowAt(g, ex, hy - s * 0.22, s * 0.18, rune, 0.9); g.fillStyle = "#dffaff"; g.fillRect(ex - s * 0.05, hy - s * 0.24, s * 0.1, s * 0.04); }
  if (hit < 1) glowAt(g, bx, by - s * 0.8, s * 1.2, "255,255,255", (1 - hit) * 0.6);
  const top = P(cx, cy, 3.3), UK = Math.max(0.5, s * 0.012);
  drawVitalBar(g, top[0], top[1], s * 1.3, { hp: m.hp, maxHp: Math.max(1, m.maxHp), armor: m.armor, maxArmor: Math.max(m.armor || 0, m.maxArmor || 0) }, UK);
}
// พลเรือน: คนตัวเล็กคลุมผ้า · ยังไม่มีคนพา = โบกมือ + วงทองเต้น · มีคนพา = เส้นประไปหาคนพา
const CIV_CLOAK = ["#c96b4b", "#5b86b8", "#8a6bb0"];
function drawCivilian(g, c, cx, cy, now, lowQ, lead) {
  const [sx, sy, s] = P(cx, cy);
  if (lead) {
    const a = P(cx, cy, 0.05), b = P(lead.x, lead.y, 0.05);
    g.strokeStyle = "rgba(255,230,160,.7)"; g.lineWidth = 2; g.setLineDash([4, 5]); g.lineDashOffset = -now / 40; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.setLineDash([]);
  } else {
    const k = (now / 1100) % 1;
    g.save(); g.translate(sx, sy); g.scale(1, 0.42); g.strokeStyle = `rgba(255,215,120,${0.9 * (1 - k)})`; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, s * (0.25 + k * 0.4), 0, TAU); g.stroke(); g.restore();
  }
  g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.ellipse(sx, sy, s * 0.2, s * 0.07, 0, 0, TAU); g.fill();
  const bob = lowQ ? 0 : Math.abs(Math.sin(now / (lead ? 150 : 600))) * s * 0.03;
  // ภาพคนจริง 6 แบบ (ผู้ใช้ส่งมา 2026-11-10 · ตัดพื้นหลังแล้ว): ภาพลอยบนกระดานแบบมอน (ไม่ใช่หมาก/การ์ด)
  //  รอคนช่วย = ลอยขึ้นลงช้าๆ + เอียงซ้ายขวา · มีคนพา = เด้งตามจังหวะเดิน · หันตามทิศคนพา
  const ph = img(`/eos/img/people${((c.look || 0) % 6) + 1}.webp`);
  if (ph) {
    const ar = ph.naturalWidth / ph.naturalHeight, h = Math.min(s * 1.35, (s * 1.05) / ar), w = h * ar;
    const hover = s * (0.08 + (lowQ ? 0 : lead ? Math.abs(Math.sin(now / 150)) * 0.06 : 0.03 + Math.sin(now / 700 + (c.look || 0)) * 0.03));
    const tilt = lead || lowQ ? 0 : Math.sin(now / 900 + (c.look || 0)) * 0.04;
    const flip = lead ? lead.x < cx : false;
    g.save(); g.translate(sx, sy - hover); g.rotate(tilt); if (flip) g.scale(-1, 1);
    g.drawImage(ph, -w / 2, -h, w, h);
    g.restore();
    const UK = Math.max(0.35, s * 0.0085);
    drawVitalBar(g, sx, sy - hover - h - s * 0.1, s * 0.5, { hp: c.hp, maxHp: Math.max(1, c.maxHp || 4), armor: 0, maxArmor: 0 }, UK);
    return;
  }
  const cloak = CIV_CLOAK[(c.look || 0) % CIV_CLOAK.length];
  g.fillStyle = cloak; g.beginPath(); g.moveTo(sx - s * 0.15, sy - bob); g.lineTo(sx - s * 0.1, sy - s * 0.48 - bob); g.lineTo(sx + s * 0.1, sy - s * 0.48 - bob); g.lineTo(sx + s * 0.15, sy - bob); g.closePath(); g.fill();
  g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(sx, sy - s * 0.48 - bob, s * 0.12, s * 0.48);
  g.fillStyle = "#f0c9a0"; g.beginPath(); g.arc(sx, sy - s * 0.58 - bob, s * 0.1, 0, TAU); g.fill();
  g.fillStyle = cloak; g.beginPath(); g.arc(sx, sy - s * 0.62 - bob, s * 0.11, Math.PI, 0); g.fill();
  if (!lead) { // โบกมือ
    const w = Math.sin(now / 160) * 0.5;
    g.strokeStyle = "#f0c9a0"; g.lineWidth = Math.max(2, s * 0.04); g.lineCap = "round";
    g.beginPath(); g.moveTo(sx + s * 0.1, sy - s * 0.42 - bob); g.lineTo(sx + s * (0.2 + w * 0.08), sy - s * 0.7 - bob); g.stroke(); g.lineCap = "butt";
  }
  hpPips(g, cx, cy, 0.95, c.hp, c.maxHp, 0, 0);
}
// พื้น: วงไฟแคมป์ (กลางคืน — ปีศาจเข้าไม่ได้) · เส้นทางยักษ์หิน (เตือน = ทั้งเส้น · กำลังเดิน = แถบที่จะเหยียบเทิร์นหน้า)
function pve3Ground(g, fd, now, lowQ) {
  if (fd.night && Array.isArray(fd.camps)) {
    const r = fd.lightR || 2;
    for (const c of fd.camps) {
      const [x, y, s] = P(c.x + 0.5, c.y + 0.5, 0.02);
      glowAt(g, x, y, s * (r + 0.8), "255,190,110", 0.32 + 0.05 * Math.sin(now / 300 + c.x));
      const pts = [[c.x + 0.5, c.y - r], [c.x + 1 + r, c.y + 0.5], [c.x + 0.5, c.y + 1 + r], [c.x - r, c.y + 0.5]].map(([a, b]) => P(a, b, 0.02));
      g.strokeStyle = "rgba(255,200,120,.55)"; g.lineWidth = 2; g.setLineDash([6, 6]); g.lineDashOffset = -now / 60;
      g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.stroke(); g.setLineDash([]);
    }
  }
  const gi = fd.giant;
  if (gi && Array.isArray(gi.path)) {
    const k = 0.5 + 0.5 * Math.sin(now / 200);
    if (gi.state === "warn") {
      g.strokeStyle = `rgba(255,150,60,${0.35 + 0.25 * k})`; g.lineWidth = 3; g.setLineDash([14, 10]); g.lineDashOffset = -now / 30;
      g.beginPath(); gi.path.forEach((t, i) => { const p = P(t.x + 0.5, t.y + 0.5, 0.03); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.stroke(); g.setLineDash([]);
    }
    for (const t of gi.next || []) {
      quad(g, t.x, t.y, 0.06, 0.02); g.fillStyle = `rgba(255,90,40,${0.14 + 0.12 * k})`; g.fill();
      g.strokeStyle = `rgba(255,120,60,${0.5 + 0.3 * k})`; g.lineWidth = 1.5; g.stroke();
    }
  }
}
// ฉาก PVE รอบสาม (คืน true = วาดแล้ว)
function pve3Fx(g, e, p, lowQ, units, out) {
  if (e.kind === "combo") {
    const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 0.9 + p * 0.6);
    for (let r = 0; r < 2; r++) { const k = Math.min(1, p * 1.6 - r * 0.25); if (k <= 0) continue; g.strokeStyle = `rgba(${r ? "255,210,90" : "120,220,255"},${1 - k})`; g.lineWidth = 4 * (1 - k) + 1; g.beginPath(); g.arc(x, y, s * (0.3 + k * 0.9), 0, TAU); g.stroke(); }
    emoji(g, "🤝", x, y - s * 0.2 - p * s * 0.4, Math.max(16, s * 0.45), 1 - p * p);
    return true;
  }
  if (e.kind === "power_turret") {
    for (const sh of e.shots || []) {
      const a = P(sh.from.x + 0.5, sh.from.y + 0.5, 1.1), b = P(sh.to.x + 0.5, sh.to.y + 0.5, 0.6), al = p < 0.35 ? 1 : Math.max(0, 1 - (p - 0.35) / 0.65);
      const k = Math.min(1, p / 0.25), hx = a[0] + (b[0] - a[0]) * k, hy = a[1] + (b[1] - a[1]) * k;
      g.strokeStyle = `rgba(120,220,255,${al})`; g.lineWidth = 3; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(hx, hy); g.stroke();
      glowAt(g, a[0], a[1], 22, "180,240,255", al * 0.8);
      if (k >= 1) glowAt(g, b[0], b[1], 34, "255,200,120", al * 0.9);
    }
    return true;
  }
  if (e.kind === "power_fountain") {
    for (const h of e.list || []) {
      const [x, y, s] = P(h.x + 0.5, h.y + 0.5, 0.3 + p * 1.2);
      if (!lowQ) for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + p * 3; g.fillStyle = `rgba(140,215,255,${1 - p})`; g.beginPath(); g.ellipse(x + Math.cos(a) * s * 0.25, y + Math.sin(a) * s * 0.1 - i * 2, 2.5, 4, 0, 0, TAU); g.fill(); }
      glowAt(g, x, y, s * 0.5, "140,215,255", (1 - p) * 0.7);
    }
    return true;
  }
  if (e.kind === "nest_spawn" || e.kind === "final_wave" || e.kind === "nest_burst") {
    const rgb = e.kind === "final_wave" ? "255,40,70" : "200,50,170";
    for (const t of e.list || []) {
      const [x, y, s] = P(t.x + 0.5, t.y + 0.5), a = Math.sin(Math.min(1, p) * Math.PI);
      glowAt(g, x, y - s * 0.3, s * (0.6 + p), rgb, a * 0.8);
      if (e.kind === "nest_spawn") { g.fillStyle = `rgba(${rgb},${0.3 * a})`; g.fillRect(x - s * 0.2, y - s * 5, s * 0.4, s * 5); }
      else if (!lowQ) puff(g, t.x + 0.5, t.y + 0.5, 0.1, p, e.seq + t.x, 5, "70,10,60", 0.12);
    }
    return true;
  }
  if (e.kind === "giant_step" || e.kind === "giant_warn") {
    if (e.kind === "giant_step" && p < 0.25) out.flash = Math.max(out.flash || 0, 0.12 * (1 - p / 0.25));
    if (!lowQ) for (const t of (e.band || []).filter((_, i) => i % 2 === 0)) puff(g, t.x + 0.5, t.y + 0.5, 0.05, p, e.seq + t.x * 3 + t.y, 3, "150,130,100", 0.16);
    return true;
  }
  if (e.kind === "giant_die") {
    const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 1.2);
    glowAt(g, x, y, s * (1 + p * 3), "140,230,255", (1 - p) * 0.8);
    if (!lowQ) for (let i = 0; i < 22; i++) { const a = hash(i, e.seq) * TAU, d = s * p * (1 + hash(i, 2) * 2), fall = s * 2.2 * p * p; g.fillStyle = i % 3 ? "#857c6d" : "#5a5348"; g.fillRect(x + Math.cos(a) * d - 4, y + Math.sin(a) * d * 0.5 - s * 1.5 + fall, 8, 6); }
    if (p > 0.3) puff(g, e.x + 0.5, e.y + 0.5, 0.1, (p - 0.3) / 0.7, e.seq, lowQ ? 4 : 12, "160,145,120", 0.3);
    return true;
  }
  if (e.kind === "giant_leave") return true;
  if (e.kind === "civ_spawn") {
    for (const t of e.list || []) { const [x, y, s] = P(t.x + 0.5, t.y + 0.5, 0.6); glowAt(g, x, y, s * (0.5 + p), "255,215,120", Math.sin(Math.min(1, p) * Math.PI) * 0.8); }
    return true;
  }
  if (e.kind === "civ_saved") {
    const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 0.6 + p * 2);
    glowAt(g, x, y, s * 0.8, "255,235,170", (1 - p) * 0.8);
    emoji(g, "🕊️", x, y, Math.max(18, s * 0.5), 1 - p * p);
    return true;
  }
  if (e.kind === "civ_lost") { const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 0.5); glowAt(g, x, y, s * 0.7, "180,180,190", (1 - p) * 0.6); return true; }
  if (e.kind === "civ_follow" || e.kind === "gauge_full") return true;
  if (e.kind === "barrage") {
    const tiles = e.tiles || [];
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i], d = hash(i, e.seq) * 0.35, k = (p - d) / 0.35;
      if (k < 0) continue;
      const [x, y, s] = P(t.x + 0.5, t.y + 0.5);
      if (k < 1) { const top = P(t.x + 0.5 - 1.2 * (1 - k), t.y + 0.5 - 0.6 * (1 - k), 9 * (1 - k)); g.strokeStyle = "rgba(255,210,120,.9)"; g.lineWidth = Math.max(2, s * 0.08); g.beginPath(); g.moveTo(top[0], top[1]); g.lineTo(top[0] + (x - top[0]) * 0.25, top[1] + (y - top[1]) * 0.25); g.stroke(); glowAt(g, top[0], top[1], s * 0.3, "255,230,160", 0.9); }
      else { const q = Math.min(1, k - 1); glowAt(g, x, y, s * (0.5 + q * 0.6), "255,150,60", (1 - q) * 0.85); }
    }
    if (p > 0.3 && p < 0.5) out.flash = Math.max(out.flash || 0, 0.18);
    return true;
  }
  if (e.kind === "final_start") {
    if (p < 0.4) out.flash = Math.max(out.flash || 0, 0.25 * (1 - p / 0.4));
    return true;
  }
  void units;
  return false;
}
// =================================================================== PVE รอบสอง: ภาพของระบบใหม่
const TRAIT_LOOK = { bomber: { rgb: "255,110,30" }, healer: { rgb: "90,255,150" } };
// ราชาปีศาจ: ร่างใหญ่ 2.6 ช่อง · ออร่าแดงม่วงหมุน · มงกุฎเรือง · หลอดเลือดใหญ่
function drawBoss(g, d, cx, cy, sx, sy, s, now, lowQ, breathe) {
  g.save(); g.translate(sx, sy); g.scale(1, 0.4);
  const gr = g.createRadialGradient(0, 0, s * 0.2, 0, 0, s * 1.4);
  gr.addColorStop(0, "rgba(255,40,80,.55)"); gr.addColorStop(1, "rgba(120,0,90,0)");
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, s * 1.4, 0, TAU); g.fill();
  if (!lowQ) { g.rotate(now / 900); g.strokeStyle = "rgba(255,80,110,.7)"; g.lineWidth = 3; g.setLineDash([10, 8]); g.beginPath(); g.arc(0, 0, s * 1.05, 0, TAU); g.stroke(); g.setLineDash([]); }
  g.restore();
  glowAt(g, sx, sy - s * 1.2, s * 1.8, "200,20,90", 0.45 + 0.1 * Math.sin(now / 300));
  sprite(g, daemonImg(4), cx, cy, breathe * 2, 2.6, false);
  const cr = P(cx, cy, 2.75);
  g.fillStyle = "#ffd34a"; g.beginPath();
  g.moveTo(cr[0] - 16, cr[1]); g.lineTo(cr[0] - 16, cr[1] - 12); g.lineTo(cr[0] - 8, cr[1] - 5); g.lineTo(cr[0], cr[1] - 16); g.lineTo(cr[0] + 8, cr[1] - 5); g.lineTo(cr[0] + 16, cr[1] - 12); g.lineTo(cr[0] + 16, cr[1]); g.closePath(); g.fill();
  glowAt(g, cr[0], cr[1] - 6, 26, "255,210,80", 0.5);
  const top = P(cx, cy, 2.95), UK = Math.max(0.5, s * 0.012);
  drawVitalBar(g, top[0], top[1], s * 1.4, { hp: d.hp, maxHp: Math.max(1, d.maxHp), armor: d.armor, maxArmor: Math.max(d.armor || 0, d.maxArmor || 0) }, UK);
}
// รถเสบียง: รถบรรทุกภาพผู้ใช้ (car2) + ลังเสบียง + ธงคุ้มกัน · หลอดเลือดฟ้า
function drawConvoy(g, cx, cy, head, c, now, night, lowQ) {
  const im = img("/eos/img/car2.webp");
  const [sx, sy, s] = P(cx, cy + 0.12);
  const flip = screenFace(cx, cy, head) > 0;
  glowAt(g, sx, sy - s * 0.3, s * 1.2, "255,200,90", 0.25 + 0.1 * Math.sin(now / 400));
  g.fillStyle = "rgba(0,0,0,.4)"; g.beginPath(); g.ellipse(sx, sy - s * 0.03, s * 0.7, s * 0.22, 0, 0, TAU); g.fill();
  if (im) { const w = s * 1.6, h = w * (im.naturalHeight / im.naturalWidth); g.save(); g.translate(sx, sy); if (flip) g.scale(-1, 1); g.drawImage(im, -w / 2, -h, w, h); g.restore(); }
  for (let i = 0; i < 3; i++) { const b = P(cx + (i - 1) * 0.18, cy, 0.62 + (i === 1 ? 0.12 : 0)); g.fillStyle = i === 1 ? "#c98b3c" : "#a8702e"; g.fillRect(b[0] - 7, b[1] - 7, 14, 12); g.strokeStyle = "#5a3a12"; g.lineWidth = 1; g.strokeRect(b[0] - 7, b[1] - 7, 14, 12); }
  const fl = P(cx - 0.25, cy, 1.25), wave = lowQ ? 0 : Math.sin(now / 200) * 3;
  g.strokeStyle = "#ddd"; g.lineWidth = 2; g.beginPath(); g.moveTo(fl[0], fl[1] + 22); g.lineTo(fl[0], fl[1]); g.stroke();
  g.fillStyle = "#7fd4ff"; g.beginPath(); g.moveTo(fl[0], fl[1]); g.lineTo(fl[0] + 18, fl[1] + 4 + wave); g.lineTo(fl[0], fl[1] + 10); g.closePath(); g.fill();
  hpPips(g, cx, cy, 1.55, c.hp, c.maxHp, c.armor, c.maxArmor);
  void night;
}
// ดวงวิญญาณเพื่อนที่ล้ม: เปลวฟ้าลอย + วงรอบ (ถูกช่วยแล้ว = ทอง)
function drawSpirit(g, sp, now, lowQ) {
  const cx = sp.x + 0.5, cy = sp.y + 0.5, f = lowQ ? 0 : Math.sin(now / 380 + sp.x) * 0.08;
  const [bx, by, s] = P(cx, cy, 0.02), rgb = sp.helped ? "255,215,110" : "140,210,255";
  g.save(); g.translate(bx, by); g.scale(1, 0.4); g.strokeStyle = `rgba(${rgb},.7)`; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, s * 0.42, 0, TAU); g.stroke(); g.restore();
  const t0 = P(cx, cy, 0.7 + f);
  glowAt(g, t0[0], t0[1], s * 0.6, rgb, 0.7);
  g.fillStyle = `rgba(${rgb},.95)`; g.beginPath(); g.moveTo(t0[0], t0[1] - s * 0.3); g.quadraticCurveTo(t0[0] + s * 0.16, t0[1], t0[0], t0[1] + s * 0.14); g.quadraticCurveTo(t0[0] - s * 0.16, t0[1], t0[0], t0[1] - s * 0.3); g.fill();
}
// จุดสัญญาณภารกิจสำรวจ: ลำแสงทองสูง (เห็นจากไกล) + วงหมุน
function drawBeacon(g, q, now, lowQ) {
  const cx = q.x + 0.5, cy = q.y + 0.5, [bx, by, s] = P(cx, cy, 0);
  g.save(); g.translate(bx, by); g.scale(1, 0.42); if (!lowQ) g.rotate(now / 1200);
  g.strokeStyle = "rgba(255,220,120,.9)"; g.lineWidth = 2.5; g.setLineDash([8, 6]); g.beginPath(); g.arc(0, 0, s * 0.45, 0, TAU); g.stroke(); g.setLineDash([]); g.restore();
  const top = P(cx, cy, 6), a = 0.28 + 0.1 * Math.sin(now / 300);
  const gr = g.createLinearGradient(bx, by, top[0], top[1]);
  gr.addColorStop(0, `rgba(255,225,140,${a + 0.2})`); gr.addColorStop(1, "rgba(255,225,140,0)");
  g.fillStyle = gr; g.beginPath(); g.moveTo(bx - s * 0.16, by); g.lineTo(top[0] - s * 0.05, top[1]); g.lineTo(top[0] + s * 0.05, top[1]); g.lineTo(bx + s * 0.16, by); g.closePath(); g.fill();
  const ic = P(cx, cy, 1.3 + (lowQ ? 0 : Math.sin(now / 420) * 0.1));
  emoji(g, "📡", ic[0], ic[1], Math.max(14, s * 0.4));
}
// โล่เสา: วงหกเหลี่ยมฟ้ารอบเสา (ชั้นละวง)
function drawWard(g, pl, now) {
  const cx = pl.x + 0.5, cy = pl.y + 0.5;
  for (let i = 0; i < (pl.ward || 0); i++) {
    const z = 0.5 + i * 0.55, [x, y, s] = P(cx, cy, z), r = s * (0.62 + i * 0.06);
    g.strokeStyle = `rgba(140,220,255,${0.75 - i * 0.15})`; g.lineWidth = 2.5;
    g.beginPath();
    for (let k = 0; k <= 6; k++) { const a = k / 6 * TAU + now / 1500 * (i ? -1 : 1); const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.42; if (k) g.lineTo(px, py); else g.moveTo(px, py); }
    g.stroke();
  }
}
// พื้น: วงเวทเตือนบอส · กรอบโซนภารกิจกวาดล้าง · เส้นทางรถเสบียง
function pveGround(g, fd, now, lowQ) {
  const w = fd.bossWarn;
  if (w) {
    const [x, y, s] = P(w.x + 0.5, w.y + 0.5, 0.02), k = 0.5 + 0.5 * Math.sin(now / 160);
    g.save(); g.translate(x, y); g.scale(1, 0.42); if (!lowQ) g.rotate(now / 700);
    for (const [r, a] of [[1.5, 0.9], [1.1, 0.6]]) { g.strokeStyle = `rgba(255,40,70,${a * (0.6 + 0.4 * k)})`; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, s * r, 0, TAU); g.stroke(); }
    g.beginPath(); for (let i = 0; i < 5; i++) { const a = i * 4 * Math.PI / 5 - Math.PI / 2; const px = Math.cos(a) * s * 1.1, py = Math.sin(a) * s * 1.1; if (i) g.lineTo(px, py); else g.moveTo(px, py); } g.closePath(); g.stroke();
    g.restore();
    glowAt(g, x, y, s * 1.8, "255,30,60", 0.35 + 0.25 * k);
  }
  for (const q of fd.quests || []) {
    if (q.type !== "hunt" || !q.rect) continue;
    const [x0, y0, x1, y1] = q.rect;
    const c = [P(x0, y0, 0.02), P(x1 + 1, y0, 0.02), P(x1 + 1, y1 + 1, 0.02), P(x0, y1 + 1, 0.02)];
    g.strokeStyle = `rgba(255,190,80,${0.45 + 0.2 * Math.sin(now / 400)})`; g.lineWidth = 2.5; g.setLineDash([12, 8]); g.lineDashOffset = -now / 40;
    g.beginPath(); c.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.stroke(); g.setLineDash([]);
  }
  const cv = fd.convoy;
  if (cv && Array.isArray(cv.path) && cv.path.length > 1) {
    g.strokeStyle = "rgba(255,210,110,.55)"; g.lineWidth = 3; g.setLineDash([4, 7]); g.lineDashOffset = -now / 50;
    g.beginPath(); cv.path.forEach((t, i) => { const p = P(t.x + 0.5, t.y + 0.5, 0.03); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.stroke(); g.setLineDash([]);
    const gp = P(cv.goal.x + 0.5, cv.goal.y + 0.5, 0.03);
    glowAt(g, gp[0], gp[1], 40, "255,210,110", 0.4 + 0.2 * Math.sin(now / 300));
  }
}
// ฉาก PVE รอบสอง (คืน true = วาดแล้ว)
function pve2Fx(g, e, p, lowQ, units) {
  if (e.kind === "mob_heal") {
    for (const h of e.heals || []) {
      const [x, y, s] = P(h.x + 0.5, h.y + 0.5, 0.6 + p * 1.2);
      g.fillStyle = `rgba(110,255,160,${1 - p})`;
      g.fillRect(x - 2, y - 7, 4, 14); g.fillRect(x - 7, y - 2, 14, 4);
      glowAt(g, x, y, s * 0.5, "110,255,160", (1 - p) * 0.6);
    }
    return true;
  }
  if (e.kind === "mob_shot") {
    for (const sh of e.shots || []) {
      const a = P(sh.from.x + 0.5, sh.from.y + 0.5, 1.1), b = P(sh.to.x + 0.5, sh.to.y + 0.5, 0.8), al = p < 0.3 ? 1 : Math.max(0, 1 - (p - 0.3) / 0.7);
      g.strokeStyle = `rgba(255,60,50,${al})`; g.lineWidth = 3; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      g.strokeStyle = `rgba(255,230,220,${al})`; g.lineWidth = 1; g.stroke();
      glowAt(g, b[0], b[1], 30, "255,80,60", al * 0.8);
    }
    return true;
  }
  if (e.kind === "mob_boom") {
    const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 0.5);
    glowAt(g, x, y, s * (1 + p * 2), "255,130,40", (1 - p) * 0.95);
    if (!lowQ) for (let i = 0; i < 18; i++) { const a = hash(i, e.seq) * TAU, d = s * p * (1 + hash(i, 3) * 1.5); g.fillStyle = `rgba(255,${120 + Math.floor(hash(i, 5) * 120)},40,${1 - p})`; g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.55 - s * p, 3, 0, TAU); g.fill(); }
    if (p > 0.2) puff(g, e.x + 0.5, e.y + 0.5, 0.4 + p, (p - 0.2) / 0.8, e.seq, lowQ ? 4 : 10, "60,50,50", 0.25);
    return true;
  }
  if (e.kind === "boss_land" || e.kind === "boss_roar") {
    const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 0.05);
    for (let r = 0; r < 3; r++) { const k = (p - r * 0.15) / 0.7; if (k <= 0 || k >= 1) continue; g.save(); g.translate(x, y); g.scale(1, 0.42); g.strokeStyle = `rgba(255,50,90,${0.8 * (1 - k)})`; g.lineWidth = 5 * (1 - k) + 1; g.beginPath(); g.arc(0, 0, s * (0.6 + k * 4), 0, TAU); g.stroke(); g.restore(); }
    if (e.kind === "boss_land" && p < 0.5) { const top = P(e.x + 0.5, e.y + 0.5, 12); g.strokeStyle = `rgba(255,60,100,${1 - p * 2})`; g.lineWidth = s * 0.5 * (1 - p * 2); g.beginPath(); g.moveTo(top[0], top[1]); g.lineTo(x, y); g.stroke(); }
    return true;
  }
  if (e.kind === "boss_die") {
    const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 1);
    glowAt(g, x, y, s * (1 + p * 3), "255,215,120", (1 - p) * 0.9);
    if (!lowQ) for (let i = 0; i < 26; i++) { const a = hash(i, e.seq) * TAU, d = s * p * (1.5 + hash(i, 2) * 2.5); g.fillStyle = `rgba(255,${200 + Math.floor(hash(i, 6) * 55)},120,${1 - p})`; g.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6 - s * 1.5 * p, 3, 3); }
    return true;
  }
  if (e.kind === "quest_done" || e.kind === "convoy_done") {
    const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 1 + p * 2.5);
    if (!lowQ) for (let i = 0; i < 20; i++) { const a = i / 20 * TAU, d = s * 0.9 * Math.min(1, p * 2); g.fillStyle = `hsla(${(i * 37 + e.seq * 11) % 360},90%,70%,${1 - p})`; g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6 + s * p * p, 3, 0, TAU); g.fill(); }
    glowAt(g, x, y, s * 0.8, "255,230,140", (1 - p) * 0.7);
    return true;
  }
  if (e.kind === "revive_help" || e.kind === "pillar_ward") {
    const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 0.6 + p);
    glowAt(g, x, y, s * (0.6 + p), e.kind === "pillar_ward" ? "140,220,255" : "255,215,110", (1 - p) * 0.9);
    return true;
  }
  if (e.kind === "pillar_ward_hit") { const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 0.9); g.strokeStyle = `rgba(140,220,255,${1 - p})`; g.lineWidth = 3; g.beginPath(); g.arc(x, y, s * (0.6 + p * 0.8), 0, TAU); g.stroke(); return true; }
  void units;
  return false;
}
// ฉาก PVE (คืน true = วาดแล้ว): มอนตีเสา (วงแตกแดง) · เสาหลุด (ผลึกกระจาย) · ซ่อม (วงฟ้าหด) · หีบโผล่ (ลำแสงทอง) · เปิดหีบ (ประกายทอง)
function pveFx(g, e, p, lowQ) {
  if (e.kind === "pillar_hit" || e.kind === "pillar_lost" || e.kind === "pillar_repair") {
    const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 0.8);
    const rgb = e.kind === "pillar_repair" ? "140,230,255" : "255,70,60";
    const r = e.kind === "pillar_repair" ? s * (1.4 - p) : s * (0.4 + p * 1.2);
    g.strokeStyle = `rgba(${rgb},${1 - p})`; g.lineWidth = Math.max(2, s * 0.06 * (1 - p));
    g.beginPath(); g.ellipse(x, y + s * 0.5, r, r * 0.45, 0, 0, TAU); g.stroke();
    glowAt(g, x, y, s * 1.2, rgb, (1 - p) * (e.kind === "pillar_lost" ? 0.9 : 0.5));
    if (e.kind === "pillar_lost" && !lowQ) for (let i = 0; i < 14; i++) {
      const ang = hash(i, e.seq) * TAU, d = s * (0.3 + p * 1.6) * (0.6 + hash(i, 2) * 0.4);
      g.fillStyle = `rgba(180,230,255,${1 - p})`;
      g.beginPath(); g.moveTo(x + Math.cos(ang) * d, y + Math.sin(ang) * d * 0.6 - s * 0.5 * (1 - p));
      g.lineTo(x + Math.cos(ang + 0.2) * (d + s * 0.12), y + Math.sin(ang + 0.2) * (d + s * 0.12) * 0.6 - s * 0.5 * (1 - p));
      g.lineTo(x + Math.cos(ang - 0.15) * (d + s * 0.05), y + Math.sin(ang - 0.15) * (d + s * 0.05) * 0.6 - s * 0.5 * (1 - p)); g.closePath(); g.fill();
    }
    return true;
  }
  if (e.kind === "chest_spawn") {
    for (const c of e.list || []) {
      const [x, y, s] = P(c.x + 0.5, c.y + 0.5);
      const a = Math.sin(Math.min(1, p) * Math.PI);
      g.fillStyle = `rgba(255,220,120,${0.35 * a})`;
      g.fillRect(x - s * 0.18, y - s * 6, s * 0.36, s * 6);
      glowAt(g, x, y, s * 0.9, "255,215,90", a * 0.8);
    }
    return true;
  }
  if (e.kind === "chest_open") {
    const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 0.4);
    glowAt(g, x, y, s * (0.6 + p), "255,215,90", (1 - p) * 0.9);
    if (!lowQ) for (let i = 0; i < 16; i++) {
      const ang = hash(i, e.seq) * TAU, d = s * p * (0.8 + hash(i, 4)), up = s * (1.4 * p - 1.6 * p * p);
      g.fillStyle = `rgba(255,${200 + Math.floor(hash(i, 5) * 55)},90,${1 - p})`;
      g.beginPath(); g.arc(x + Math.cos(ang) * d, y + Math.sin(ang) * d * 0.5 - up, Math.max(1.5, s * 0.04), 0, TAU); g.fill();
    }
    return true;
  }
  return false;
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
    } else { // ใบผักแตกกระจาย + ขนนกปลิวตามโชโกโบะที่วิ่ง
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
// ฉากของลูกเล่นขั้น 3 (คืน true = วาดแล้ว) · out.flash = แสงวาบทั้งจอ
function flameTongue(g, x, y, h, w, a) {
  if (!(a > 0 && h > 0)) return;
  const gr = g.createLinearGradient(x, y, x, y - h);
  gr.addColorStop(0, `rgba(255,80,20,${a})`); gr.addColorStop(0.5, `rgba(255,170,40,${a * 0.9})`); gr.addColorStop(1, "rgba(255,240,170,0)");
  g.fillStyle = gr; g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x - w * 0.9, y - h * 0.5, x, y - h); g.quadraticCurveTo(x + w * 0.9, y - h * 0.5, x + w, y); g.closePath(); g.fill();
}
function arcs(g, x, y, s, seed, a) { // ประกายไฟฟ้าเต้นบนผิวน้ำ (สุ่มใหม่ทุก 70ms)
  const R = rng(seed);
  g.lineJoin = "round";
  for (let k = 0; k < 2; k++) {
    const pts = [];
    let px = x + (R() - 0.5) * s * 0.8, py = y + (R() - 0.5) * s * 0.35;
    for (let i = 0; i < 6; i++) { pts.push([px, py]); px += (R() - 0.3) * s * 0.22; py += (R() - 0.5) * s * 0.14 - s * 0.02; }
    const path = () => { g.beginPath(); pts.forEach(([u, v], i) => (i ? g.lineTo(u, v) : g.moveTo(u, v))); };
    path(); g.strokeStyle = `rgba(120,200,255,${0.45 * a})`; g.lineWidth = Math.max(2, s * 0.06); g.stroke();
    path(); g.strokeStyle = `rgba(240,250,255,${a})`; g.lineWidth = Math.max(1, s * 0.02); g.stroke();
  }
  glowAt(g, x, y, s * 0.7, "140,210,255", a * 0.5);
}
function slashFx(g, x, y, s, beast, p) {
  const k = Math.min(1, p / 0.35), al = 1 - p;
  if (beast) { // กรงเล็บ 3 เส้น
    for (let i = -1; i <= 1; i++) {
      const ox = i * s * 0.14, x0 = x - s * 0.38 + ox, y0 = y - s * 0.42, x1 = x0 + s * 0.7 * k, y1 = y0 + s * 0.7 * k;
      g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + s * 0.42 * k, y0 + s * 0.1 * k, x1, y1);
      g.strokeStyle = `rgba(255,60,70,${al})`; g.lineWidth = Math.max(2, s * 0.07); g.stroke();
      g.strokeStyle = `rgba(255,235,235,${al})`; g.lineWidth = Math.max(1, s * 0.02); g.stroke();
    }
    glowAt(g, x, y, s * 0.6, "255,70,60", al * 0.6);
  } else { // ดาบฟันเป็นเสี้ยววงเดือน
    const a0 = -2.5, a1 = a0 + 2.7 * k;
    g.beginPath(); g.arc(x, y, s * 0.45, a0, a1); g.strokeStyle = `rgba(170,220,255,${al})`; g.lineWidth = Math.max(3, s * 0.1); g.stroke();
    g.beginPath(); g.arc(x, y, s * 0.45, a0, a1); g.strokeStyle = `rgba(255,255,255,${al})`; g.lineWidth = Math.max(1, s * 0.03); g.stroke();
    glowAt(g, x, y, s * 0.55, "170,220,255", al * 0.5);
  }
}
function stage3Fx(g, e, p, now, lowQ, units, out, Y0) {
  if (e.kind === "barrel_boom") {
    const cx = e.x + 0.5, cy = e.y + 0.5, [, , s] = P(cx, cy);
    if (p < 0.12) out.flash = Math.max(out.flash, 0.3 * (1 - p / 0.12));
    // คลื่นกระแทก
    const ring = ease(Math.min(1, p / 0.45));
    if (ring < 1) { gEllipse(g, cx, cy, 0.3 + ring * 1.7, 0.05, 36); g.strokeStyle = `rgba(255,225,180,${0.75 * (1 - ring)})`; g.lineWidth = Math.max(1.5, s * 0.09 * (1 - ring)); g.stroke(); }
    // เปลวไฟบนช่องรอบ 3×3
    if (p < 0.75) for (const t of e.tiles || []) {
      const q = p / 0.75;
      for (let i = 0; i < (lowQ ? 1 : 3); i++) {
        const b = P(t.x + 0.2 + hash(i, t.x * 7 + t.y + e.seq) * 0.6, t.y + 0.2 + hash(i + 4, t.x + t.y * 5 + e.seq) * 0.6);
        flameTongue(g, b[0], b[1], b[2] * (0.35 + 0.35 * hash(i, e.seq)) * Math.sin(Math.min(1, q * 2.2) * Math.PI * 0.5) * (1 - q * 0.6), b[2] * 0.1, (1 - q) * 0.9);
      }
    }
    // ควันดำลอยขึ้น
    if (p > 0.15) puff(g, cx, cy, 0.5 + p * 1.3, (p - 0.15) / 0.85, e.seq, lowQ ? 5 : 12, "36,32,30", 0.24);
    // ลูกไฟ
    const fb = Math.min(1, p / 0.22), fade = p < 0.3 ? 1 : Math.max(0, 1 - (p - 0.3) / 0.4), f = P(cx, cy, 0.35 + p * 0.9);
    glowAt(g, f[0], f[1], s * (0.6 + fb * 1.5), "255,140,30", 0.95 * fade);
    glowAt(g, f[0], f[1], s * (0.3 + fb * 0.8), "255,240,190", fade);
    // เศษเหล็ก + ประกายไฟ
    if (!lowQ) for (let i = 0; i < 12; i++) {
      const ang = hash(i, e.seq + 3) * TAU, d = Math.min(1, p * 1.6) * (0.6 + hash(i, e.seq) * 1.3), zz = Math.sin(Math.min(1, p * 1.6) * Math.PI) * (0.6 + hash(i, e.seq + 5) * 1.0);
      const q = P(cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, Math.max(0, zz));
      g.fillStyle = i % 3 ? `rgba(60,30,20,${1 - p})` : `rgba(255,200,90,${1 - p})`; g.fillRect(q[0] - 2, q[1] - 2, i % 3 ? 4 : 2.5, i % 3 ? 3 : 2.5);
    }
    return true;
  }
  if (e.kind === "crystal_break") {
    const E = elemOf(e.element), cx = e.x + 0.5, cy = e.y + 0.55, c = P(cx, cy, 0.45), s = c[2];
    glowAt(g, c[0], c[1], s * (0.6 + p * 1.3), E.rgb, (1 - p) * 0.9);
    for (let i = 0; i < (lowQ ? 6 : 14); i++) {
      const ang = hash(i, e.seq) * TAU, d = p * (0.4 + hash(i + 1, e.seq) * 0.9), zz = 0.45 + Math.sin(p * Math.PI) * (0.3 + hash(i + 2, e.seq) * 0.6) - p * 0.35;
      const q = P(cx + Math.cos(ang) * d, cy + Math.sin(ang) * d * 0.8, Math.max(0.02, zz));
      shard(g, q[0], q[1], q[2] * 0.16, q[2] * 0.045, ang + p * 8, E.body, E.hi, 1 - p);
    }
    // พลังเวทไหลเข้าหาคนเก็บ
    const u = unitAt(units, e.by);
    if (u && p > 0.2) for (let i = 0; i < 6; i++) {
      const k = Math.max(0, Math.min(1, (p - 0.2) / 0.6 - i * 0.05));
      if (k <= 0 || k >= 1) continue;
      const q = P(cx + (u.x - cx) * k, cy + (u.y - cy) * k, 0.5 + Math.sin(k * Math.PI) * 0.6 + (hash(i, e.seq) - 0.5) * 0.2);
      glowAt(g, q[0], q[1], q[2] * 0.22, E.rgb, 0.9 * (1 - k * 0.5));
    }
    return true;
  }
  if (e.kind === "flask") {
    const E = elemOf(e.element), from = e.from, to = e.to;
    if (!from || !to) return true;
    const T = 0.36;
    if (p < T) { // ขวดยาลอยโค้ง
      const k = p / T, dist = Math.hypot(to.x - from.x, to.y - from.y);
      const pt = (kk) => P(from.x + 0.5 + (to.x - from.x) * kk, from.y + 0.5 + (to.y - from.y) * kk, 0.8 + Math.sin(kk * Math.PI) * (1 + dist * 0.25) - kk * 0.75);
      if (!lowQ) for (let i = 1; i < 5; i++) { const kk = Math.max(0, k - i * 0.05), q = pt(kk); glowAt(g, q[0], q[1], q[2] * 0.15, E.rgb, 0.35 / i); }
      const [px, py, s] = pt(k);
      glowAt(g, px, py, s * 0.4, E.rgb, 0.6);
      g.save(); g.translate(px, py); g.rotate(k * 11);
      g.fillStyle = "rgba(220,235,240,.85)"; g.beginPath(); g.arc(0, 0, s * 0.09, 0, TAU); g.fill();
      g.fillStyle = E.body; g.beginPath(); g.arc(0, s * 0.02, s * 0.065, 0, TAU); g.fill();
      g.fillStyle = "rgba(220,235,240,.85)"; g.fillRect(-s * 0.03, -s * 0.15, s * 0.06, s * 0.08);
      g.fillStyle = "#6b4a2a"; g.fillRect(-s * 0.025, -s * 0.18, s * 0.05, s * 0.04);
      g.restore();
      return true;
    }
    const q = (p - T) / (1 - T), tiles = e.tiles && e.tiles.length ? e.tiles : [to];
    const c = P(to.x + 0.5, to.y + 0.5, 0.3);
    glowAt(g, c[0], c[1], c[2] * (0.6 + q * 1.4), E.rgb, (1 - q) * 0.85);
    if (!lowQ && q < 0.4) for (let i = 0; i < 8; i++) { // เศษแก้ว
      const ang = hash(i, e.seq) * TAU, r = c[2] * 0.7 * (q / 0.4);
      g.fillStyle = `rgba(230,245,255,${1 - q / 0.4})`; g.fillRect(c[0] + Math.cos(ang) * r, c[1] + Math.sin(ang) * r * 0.6 - c[2] * 0.2 * q, 2, 2);
    }
    tiles.forEach((t, ti) => {
      const b = P(t.x + 0.5, t.y + 0.55), s = b[2];
      if (e.element === "ice") { // หนามน้ำแข็งงอกจากพื้น
        const grow = ease(Math.min(1, q * 3)), a = q < 0.7 ? 1 : 1 - (q - 0.7) / 0.3;
        for (let i = 0; i < (lowQ ? 2 : 4); i++) {
          const ox = (hash(i, ti + e.seq) - 0.5) * s * 0.6, oy = (hash(i + 3, ti + e.seq) - 0.5) * s * 0.25;
          shard(g, b[0] + ox, b[1] + oy, s * (0.3 + 0.3 * hash(i + 5, ti)) * grow, s * 0.07, (hash(i + 7, ti) - 0.5) * 0.7, E.body, E.hi, a);
        }
        if (!lowQ) puff(g, t.x + 0.5, t.y + 0.55, 0.1, q, e.seq + ti, 4, "220,245,255", 0.12);
      } else if (e.element === "thunder") { // สายฟ้าฟาดลงทุกช่อง
        const a = q < 0.45 ? (Math.sin(now / 30 + ti) > -0.3 ? 1 : 0.35) : Math.max(0, 1 - (q - 0.45) / 0.4);
        if (a > 0) bolt(g, b[0] + (hash(ti, e.seq) - 0.5) * 50, Y0 - 10, b[0], b[1], e.seq * 13 + ti + Math.floor(now / 90), Math.max(1.4, s * 0.04), a);
        glowAt(g, b[0], b[1], s * 0.8, E.rgb, (1 - q) * 0.8);
        if (!lowQ && q < 0.6) for (let i = 0; i < 4; i++) { const ang = hash(i, ti + e.seq) * TAU, r = s * 0.5 * q; g.fillStyle = `rgba(255,246,160,${1 - q})`; g.fillRect(b[0] + Math.cos(ang) * r, b[1] + Math.sin(ang) * r * 0.5 - s * 0.3 * q, 2, 2); }
      } else { // ไฟลุก
        const a = q < 0.6 ? 1 : 1 - (q - 0.6) / 0.4;
        for (let i = 0; i < (lowQ ? 2 : 4); i++) {
          const ox = (hash(i, ti + e.seq) - 0.5) * s * 0.6, oy = (hash(i + 3, ti + e.seq) - 0.5) * s * 0.25;
          const h = s * (0.3 + 0.3 * hash(i + 5, ti)) * Math.min(1, q * 4) * (0.85 + 0.15 * Math.sin(now / 70 + i * 2 + ti));
          flameTongue(g, b[0] + ox, b[1] + oy, h, s * 0.1, a * 0.95);
        }
        glowAt(g, b[0], b[1] - s * 0.15, s * 0.7, E.rgb, a * 0.5);
      }
    });
    if (Array.isArray(e.shock) && q > 0.2) { // ไฟฟ้าแล่นบนผิวน้ำ
      const a = Math.min(1, (q - 0.2) / 0.1) * (1 - Math.max(0, (q - 0.75) / 0.25));
      e.shock.forEach((t, i) => { const b = P(t.x + 0.5, t.y + 0.5, 0.04); arcs(g, b[0], b[1], b[2], Math.floor(now / 70) * 31 + i * 7 + e.seq, a); });
    }
    return true;
  }
  if (e.kind === "turret_shot") {
    const from = e.from, tgt = unitAt(units, e.target) || (e.to ? { x: e.to.x + 0.5, y: e.to.y + 0.5 } : null);
    if (!from || !tgt) return true;
    const fx0 = from.x + 0.5, fy0 = from.y + 0.5, ang = Math.atan2(tgt.y - fy0, tgt.x - fx0);
    const m = P(fx0 + Math.cos(ang) * 0.72, fy0 + Math.sin(ang) * 0.72, 1.13), s = m[2];
    for (let i = 0; i < 3; i++) {
      const k = (p - i * 0.14) / 0.3;
      if (k < 0 || k > 1) continue;
      const jx = (hash(i, e.seq) - 0.5) * 0.25, jy = (hash(i + 2, e.seq) - 0.5) * 0.25, b = P(tgt.x + jx, tgt.y + jy, 0.55);
      const h = Math.min(1, k * 1.6), tl = Math.max(0, h - 0.4);
      const ax = m[0] + (b[0] - m[0]) * tl, ay = m[1] + (b[1] - m[1]) * tl, bx = m[0] + (b[0] - m[0]) * h, by = m[1] + (b[1] - m[1]) * h;
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by);
      g.strokeStyle = "rgba(255,190,90,.35)"; g.lineWidth = Math.max(3, s * 0.08); g.stroke();
      g.strokeStyle = "rgba(255,240,180,.95)"; g.lineWidth = Math.max(1.2, s * 0.025); g.stroke();
      if (k < 0.3) glowAt(g, m[0], m[1], s * 0.5, "255,210,120", 1 - k / 0.3);
      if (h >= 1) {
        glowAt(g, b[0], b[1], s * 0.45, "255,200,120", 1 - k);
        if (!lowQ) for (let j = 0; j < 5; j++) { const a2 = hash(j, e.seq + i) * TAU, r = s * 0.35 * (k - 0.6) / 0.4; g.fillStyle = `rgba(255,230,150,${1 - k})`; g.fillRect(b[0] + Math.cos(a2) * r, b[1] + Math.sin(a2) * r * 0.6, 2, 2); }
      }
    }
    return true;
  }
  if (e.kind === "mob_attack") {
    for (const a of e.attacks || []) {
      const u = unitAt(units, a.target);
      if (!u) continue;
      const [x, y, s] = P(u.x, u.y, 0.6);
      if (p > 0.25) slashFx(g, x, y, s, a.type === "beast", (p - 0.25) / 0.75);
    }
    return true;
  }
  if (e.kind === "mob_hit") {
    if (lowQ) return true;
    const m = MOVES.get(`mob:${e.id}`), pos = m ? posOf(m, now) : { x: e.x, y: e.y }, c = P(pos.x + 0.5, pos.y + 0.55, 0.8);
    for (let i = 0; i < 8; i++) { const ang = hash(i, e.seq) * TAU, r = c[2] * 0.5 * p; g.fillStyle = `rgba(255,240,200,${1 - p})`; g.fillRect(c[0] + Math.cos(ang) * r, c[1] + Math.sin(ang) * r * 0.6, 2, 2); }
    return true;
  }
  if (e.kind === "mob_die") {
    const cx = e.x + 0.5, cy = e.y + 0.55, beast = e.type === "beast", [sx, sy, s] = P(cx, cy);
    const head = MOB_HEAD.get(e.id) || { dx: 1, dy: 0 }, face = screenFace(cx, cy, head);
    if (beast) { // ล้มลงจมเงาฝุ่นม่วง
      drawBeast(g, sx, sy, s, face, now, false, lowQ, Math.max(0, 1 - p * 1.3), p * 0.5);
      puff(g, cx, cy, 0.1, p, e.seq, lowQ ? 5 : 12, "70,40,70", 0.22);
      glowAt(g, sx, sy - s * 0.8, s * 1.6, "150,60,140", (1 - p) * 0.5);
    } else { // ระเบิดประกายไฟ + ควัน
      const al = Math.max(0, 1 - p * 2);
      if (al > 0) sprite(g, MAGITEK_IMG, cx, cy, -p * 0.3, 1.45, face > 0, al);
      const c = P(cx, cy, 0.7);
      glowAt(g, c[0], c[1], s * (0.5 + p * 1.2), "255,150,60", (1 - p) * 0.9);
      if (!lowQ) for (let i = 0; i < 14; i++) {
        const ang = hash(i, e.seq) * TAU, r = s * 1.1 * p;
        g.fillStyle = `rgba(255,${180 + Math.floor(hash(i, 3) * 70)},90,${1 - p})`; g.fillRect(c[0] + Math.cos(ang) * r, c[1] + Math.sin(ang) * r * 0.6 - s * 0.4 * p + s * 0.6 * p * p, 2.5, 2.5);
      }
      if (p > 0.15) puff(g, cx, cy, 0.6 + p, (p - 0.15) / 0.85, e.seq, lowQ ? 4 : 9, "50,50,56", 0.18);
    }
    return true;
  }
  if (e.kind === "beast_roar") {
    const m = MOVES.get(`mob:${e.id}`), pos = m ? posOf(m, now) : { x: e.x, y: e.y }, cx = pos.x + 0.5, cy = pos.y + 0.55;
    for (let i = 0; i < 3; i++) {
      const k = (p - i * 0.15) / 0.7;
      if (k <= 0 || k >= 1) continue;
      gEllipse(g, cx, cy, 0.5 + ease(k) * 3.2, 0.05, 44); g.strokeStyle = `rgba(255,200,170,${0.6 * (1 - k)})`; g.lineWidth = Math.max(1.5, 4 * (1 - k)); g.stroke();
    }
    const h = P(cx + 0.3, cy, 1.1), s = h[2];
    for (let i = 0; i < 2; i++) { // คลื่นเสียงจากปาก
      const k = (p * 2 - i * 0.4) % 1;
      if (k < 0) continue;
      g.beginPath(); g.ellipse(h[0], h[1], s * (0.2 + k * 0.9), s * (0.12 + k * 0.5), 0, 0, TAU); g.strokeStyle = `rgba(255,230,210,${0.5 * (1 - k) * (1 - p)})`; g.lineWidth = 2; g.stroke();
    }
    if (!lowQ) puff(g, cx, cy, 0.05, p, e.seq, 8, "160,140,120", 0.14);
    return true;
  }
  if (e.kind === "dropship_warn") {
    const c = P(e.x + 1, e.y + 1, 0.05);
    glowAt(g, c[0], c[1], c[2] * 1.4, "255,40,30", (1 - p) * 0.5);
    return true;
  }
  if (e.kind === "dropship_land") {
    if (p > 0.4) {
      const q = (p - 0.4) / 0.6;
      puff(g, e.x + 1, e.y + 1, 0.05, q, e.seq, lowQ ? 6 : 16, "190,175,150", 0.28);
      if (q < 0.6) { gEllipse(g, e.x + 1, e.y + 1, 0.8 + q * 2.4, 0.04, 40); g.strokeStyle = `rgba(230,220,200,${0.5 * (1 - q / 0.6)})`; g.lineWidth = 2; g.stroke(); }
    }
    for (const t of p > 0.6 ? e.spawned || [] : []) { // ทหารที่ลงจากยาน
      const c = P(t.x + 0.5, t.y + 0.5, 0.6);
      glowAt(g, c[0], c[1], c[2] * 0.7, "255,80,60", (1 - p) * 1.5);
    }
    return true;
  }
  if (e.kind === "dropship_leave") {
    const z = DROP_Z + ease(p) * 8, al = p < 0.7 ? 1 : Math.max(0, 1 - (p - 0.7) / 0.3);
    if (p < 0.5) puff(g, e.x + 1, e.y + 1, 0.05, p / 0.5, e.seq, lowQ ? 6 : 14, "190,175,150", 0.26);
    drawDropship(g, e.x, e.y, z, now, lowQ, al);
    return true;
  }
  return false;
}
let NIGHT_WAS = null;
export function air(g, fd, info, units, now, lowQ, view) {
  for (const e0 of fd.fx || []) { const e = p4Norm(e0); if (fx[e.kind] && fxOnce(e)) playFx(e); }
  // กลางวัน ↔ กลางคืน: เสียงเปลี่ยนช่วง
  if (NIGHT_WAS !== null && NIGHT_WAS !== !!fd.night && fd.night) sfx("night_fall", { gain: 0.7 });
  NIGHT_WAS = !!fd.night;
  const W = view ? view.x1 - view.x0 : LW, H = view ? view.y1 - view.y0 : 720, X0 = view ? view.x0 : 0, Y0 = view ? view.y0 : 0;
  const kind = fd.weather && fd.weather.kind;
  let flash = 0;
  if (fd.blood) { // คืนพระจันทร์สีเลือด: ทั้งกระดานอมแดงเต้นช้าๆ
    g.fillStyle = `rgba(120,0,20,${0.2 + 0.05 * Math.sin(now / 900)})`; g.fillRect(X0, Y0, W, H);
  }
  if (fd.final) { // คืนสุดท้าย: ม่านม่วงแดงเข้ม + ขอบจอมืด (vignette)
    g.fillStyle = `rgba(50,0,40,${0.16 + 0.04 * Math.sin(now / 700)})`; g.fillRect(X0, Y0, W, H);
    const vg = g.createRadialGradient(X0 + W / 2, Y0 + H / 2, Math.min(W, H) * 0.35, X0 + W / 2, Y0 + H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(30,0,20,.5)"); g.fillStyle = vg; g.fillRect(X0, Y0, W, H);
  }
  if (kind === "eos_storm") {
    g.fillStyle = fd.night ? "rgba(2,5,16,.38)" : "rgba(20,28,40,.34)"; g.fillRect(X0, Y0, W, H);
    if (!lowQ) {
      // ขนาดเส้นฝนคงที่บนจอ (กล้องซูมใกล้ = พิกัดตรรกะเล็กลง) — ไม่หนาเป็นแท่งตอนซูม
      const zf = Math.max(0.12, Math.min(1.6, W / LW));
      g.strokeStyle = "rgba(205,220,240,.42)"; g.lineWidth = zf; g.beginPath();
      for (let i = 0; i < 170; i++) {
        const sp = (0.85 + hash(i, 2) * 0.5) * zf, y = Y0 + ((hash(i, 1) * H + now * sp) % (H + 40 * zf)) - 20 * zf, x = X0 + ((hash(i, 3) * W - (now * sp) * 0.25) % W + W) % W;
        g.moveTo(x, y); g.lineTo(x - 5 * zf, y + 18 * zf);
      }
      g.stroke();
    }
    const slot = Math.floor(now / 7000), at = hash(slot, 9) * 5600, d = now - slot * 7000 - at;
    if (d >= 0 && d < 260) flash = Math.max(flash, (d < 70 || (d > 140 && d < 200) ? 0.2 : 0.05));
  } else if (kind === "eos_sand") {
    // พายุทราย (ขั้น 5 · L21): ม่านทรายหมุนเฉพาะเหนือทะเลทราย Leide (x 13–31 · y 20–31) + ฝุ่นพัดเฉียง · ตัวเราอยู่ในโซน = ทั้งจอขุ่นด้วย
    const me = (units || []).find((u) => u.isMe && !u.corpse);
    const mx = me ? (me.rx != null ? me.rx : me.x) : -1, my = me ? (me.ry != null ? me.ry : me.y) : -1;
    const inside = mx >= 13 && my >= 20;
    const tint = fd.night ? "60,44,26" : "196,160,108";
    if (inside) { g.fillStyle = `rgba(${tint},${fd.night ? 0.42 : 0.36})`; g.fillRect(X0, Y0, W, H); }
    // ม่านทรายบนโซน: วงหมุนหลายชั้นตามช่องในทะเลทราย (หนาแน่นกลางโซน)
    const step = lowQ || FAST ? 3 : 2;
    for (let y = 20; y <= 31; y += step) for (let x = 13; x <= 31; x += step) {
      const ph = (now / (2600 + hash(x, y) * 1800) + hash(y, x)) % 1;
      const [sx, sy, s] = P(x + 0.5 + Math.sin(ph * TAU) * 0.6, y + 0.5, 0.4 + hash(x, y + 3) * 0.6);
      glowAt(g, sx, sy, s * (1.3 + hash(x + 1, y) * 0.9), tint, (inside ? 0.18 : 0.3) * (0.6 + 0.4 * Math.sin(ph * TAU * 2)));
    }
    if (!lowQ) {
      const zf = Math.max(0.12, Math.min(1.6, W / LW));
      g.strokeStyle = `rgba(${tint},${inside ? 0.55 : 0.3})`; g.lineWidth = 1.2 * zf; g.beginPath();
      const n = inside ? 150 : 60;
      for (let i = 0; i < n; i++) {
        let x, y;
        if (inside) { x = X0 + ((hash(i, 3) * W + now * (0.5 + hash(i, 2) * 0.4) * zf) % W); y = Y0 + hash(i, 1) * H + Math.sin(now / 300 + i) * 6 * zf; }
        else {
          const tx = 13 + hash(i, 3) * 19, ty = 20 + hash(i, 1) * 12, dx = ((now / 900 + hash(i, 4)) % 1) * 2.5;
          const p = P(tx + dx, ty, 0.3 + hash(i, 5) * 0.8); x = p[0]; y = p[1];
        }
        g.moveTo(x, y); g.lineTo(x - 14 * zf, y + 3 * zf);
      }
      g.stroke();
    }
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
  p4AirAlways(g, fd, now); // ขั้น 4: ไฟหน้ารถไฟที่ขอบแผนที่ระหว่างเตือน
  const out = { flash: 0 };
  for (const e0 of fxActive(fd, now)) {
    const e = p4Norm(e0), p = fxT(e, now, fx[e.kind] || 1500);
    if (stage2Fx(g, e, p, now, lowQ)) continue;
    if (stage3Fx(g, e, p, now, lowQ, units, out, Y0)) continue;
    if (p4Fx(g, e, p, now, lowQ, units, out, !!fd.night)) continue;
    if (pveFx(g, e, p, lowQ)) continue;
    if (pve2Fx(g, e, p, lowQ, units)) continue;
    if (pve3Fx(g, e, p, lowQ, units, out)) continue;
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
  flash = Math.max(flash, out.flash);
  if (flash > 0) { g.fillStyle = `rgba(232,240,255,${flash})`; g.fillRect(X0, Y0, W, H); }
  void info;
}
