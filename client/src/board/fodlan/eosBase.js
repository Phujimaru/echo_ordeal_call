// ============================================================
//  ภาพของสนาม Eos — ค่าคงที่ · สี (PAL) · ภาพ (img) · เรขาคณิต/เงา · ชุดช่องของผัง (TILES/SETS) · marching squares · สถานะวาดที่ใช้ร่วม (LAST_FD …)
//  แยกออกจาก ./stage6.js (ย้ายโค้ดล้วน · พฤติกรรมเดิม) · stage6.js ยังส่งออกชื่อเดิมครบ
//  ⚠️ ห้ามเรียกของจาก ./index ตอนโหลดไฟล์ (index import stage6 — วน) · ใช้ได้ในฟังก์ชันวาดเท่านั้น
// ============================================================
import { P, faceVisible, glow, rng } from "../boardGeo";
import { EOS_AREA, MAPS } from "../boardRules";

export const TAU = Math.PI * 2;
export const hash = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
export const K = (x, y) => `${x},${y}`;
export const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
// ความยาวฉากของเหตุการณ์ (ms) — server ctx.fx
export const fx = {
  lightning: 1600, car_drive: 900, car_mount: 900, car_leave: 600, car_ram: 700, choco_mount: 900, choco_dismount: 700, choco_fall: 1100, choco_home: 1400, choco_back: 900,
  daemon_spawn: 1600, daemon_move: 1100, daemon_attack: 900, daemon_hit: 600, daemon_struck: 500, daemon_die: 1200, daemon_dissolve: 1400,
  bridge: 1600, dome_on: 1800, dome_off: 1400, lights: 900, city_flash: 1300, gysahl_lure: 1300, gysahl_call: 1100, wreck_push: 700,
  barrel_boom: 1600, crystal_break: 1100, flask: 1700, turret_shot: 750, mob_move: 1100, mob_attack: 900, mob_hit: 600, mob_die: 1300,
  beast_roar: 1300, dropship_warn: 1200, dropship_land: 2000, dropship_leave: 2000,
  // PVE (2026-11-10): มอนตีเสา · เสาหลุด · ซ่อมเสา · หีบสมบัติ
  pillar_hit: 900, pillar_lost: 1600, pillar_repair: 1200, chest_spawn: 1200, chest_open: 1600,
  // PVE รอบสอง: บอส · มอนพิเศษ · พระจันทร์สีเลือด · ภารกิจ · เกราะเสา · ช่วยฟื้น · ขบวนเสบียง
  boss_warn: 1600, boss_land: 2200, boss_roar: 1500, boss_quake_warn: 1400, boss_quake: 1600, boss_enrage: 1800, boss_big_warn: 1500, boss_big: 1900, boss_guards: 1600, boss_dark: 1100, camp_rest: 1200, tram: 2400, mob_wave: 1800, town_siege: 900, town_dark: 1800, town_light: 1400, lament_warn: 2000, lament_land: 2800, lament_blink: 700, lament_phase: 2000, lament_lines: 1400, lament_tears: 1800, lament_die: 3200, lament_curse: 1600, lament_life: 1200, boss_die: 2400, mob_heal: 1200, mob_shot: 700, mob_boom: 1400, mob_blink: 900, mob_pull: 900, mob_rune_set: 1100, mob_rune: 1400, mob_split: 1200, mob_block: 700, elite_spawn: 1600, elite_down: 1400, elite_blast: 1400, elite_drain: 900, elite_thorns: 700, elite_regen: 1000, armiger: 2600, town_garage: 1400, town_diner: 1300, town_shrine: 1600, town_ranch: 1200, blood_moon: 2600,
  quest_new: 1600, quest_step: 900, quest_done: 2000, quest_fail: 1000, pillar_ward: 1100, pillar_ward_hit: 900, revive_help: 1400,
  convoy_start: 1400, convoy_move: 1100, convoy_done: 2000, convoy_fail: 1600, score_bonus: 1800,
  // PVE รอบสาม: ท่าร่วม · พลังเสา · รังปีศาจ · ยักษ์หิน · พลเรือน · ถล่ม · คืนสุดท้าย
  meteor_warn: 1200, meteor_impact: 1800, supply_arrive: 1600, supply_leave: 1400, supply_load: 1000, eclipse_start: 2200, eclipse_end: 1400, full_moon: 1800, combo: 1100, power_turret: 1200, power_fountain: 1000, nest_spawn: 1200, nest_burst: 1400, giant_warn: 1600, giant_step: 1600, giant_leave: 1400, giant_die: 2400,
  civ_spawn: 1200, civ_follow: 700, civ_saved: 1800, civ_lost: 1300, gauge_full: 1600, barrage: 1800, final_start: 3000, final_wave: 1400,
  // PVE รอบสี่: การ์ดทีม · กำแพงไม้ · โชโกโบะทอง
  perk_offer: 1600, perk_pick: 2200, wall_up: 900, wall_down: 800, gold_spawn: 1400, gold_leave: 1000,
  // ขั้น 4 (ฉากฝั่ง client ยาวกว่าเวลาที่ server พักได้ — รถไฟวิ่งพ้นแผนที่ให้ครบขบวน)
  train_warn: 1800, train_pass: 3000, gondola: 2000, tunnel: 1500, camp_meal: 1500, fish: 2600, tomb_open: 2300, royal_drain: 1400, hunt_board: 1500, hunt_done: 1500, // 1500 = ค่าเริ่มของ fxActive (เหตุการณ์ที่ชื่อถูกทับ — p4Norm)
};
export const CAR_MS = 900, DAEMON_MS = 1000;
export const CAR_COLORS = {
  1: { body: "#f2c21b", dark: "#a07d08", hi: "#fff2a8" },  // car1 — เหลือง
  2: { body: "#d8321e", dark: "#7c160b", hi: "#ff9c86" },  // car2 — แดง
  3: { body: "#7d8288", dark: "#3d4146", hi: "#d5dade" },  // car3 — เทาด้าน
};


// =================================================================== palette
export const PAL = {
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
    moss: "#6f8f3a", litter: "#5a4528", fern: "#4f7d2e", fern2: "#6c9a3a", bark: "#4a3524", birch: "#e8e2d4", shroom: "#d8452f", shroomGlow: null,
    canopy: [["#4d6b2f", "#33491f", "#7da150"], ["#56762f", "#3a5223", "#8fb35a"], ["#3f5f33", "#2a4224", "#6e9455"], ["#62803a", "#435a25", "#a3bf63"]], ray: "255,236,180",
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
    moss: "#1f3a24", litter: "#1c1812", fern: "#173020", fern2: "#20402a", bark: "#1e1712", birch: "#6a6a72", shroom: "#5a2a3a", shroomGlow: "120,255,220",
    canopy: [["#1d3020", "#122016", "#2d4a2c"], ["#20362a", "#14241c", "#33503a"], ["#1a2c26", "#101c18", "#2a4440"], ["#22382a", "#16261c", "#3a5638"]], ray: "160,190,255",
  },
};

// =================================================================== ภาพ (โหลดครั้งเดียว)
const IMG = new Map();
export function img(src) {
  if (typeof Image === "undefined") return null;
  let im = IMG.get(src);
  if (!im) { im = new Image(); im.decoding = "async"; im.src = src; IMG.set(src, im); }
  return im.complete && im.naturalWidth ? im : null;
}
export const CHOCO_IMG = "/eos/img/chocobo.webp";
export const MAGITEK_IMG = "/eos/img/magitek.webp";
export const daemonImg = (k) => `/eos/img/daemon${((Number(k) || 1) - 1) % 8 + 1}.webp`; // 8 แบบ (5–8 ผู้ใช้ส่งมา 2026-11-10)
export const GIANT_IMG = "/eos/img/giant.webp", MAGITEK_EX_IMG = "/eos/img/magitek_ex.webp", LAMENT_IMG = "/eos/img/lament.webp"; // ผู้คร่ำครวญ (ภาพจากผู้ใช้ 2026-11-11 — ตัดพื้นหลังแล้ว)
// ภาพกว้าง (ปีศาจมีปีก/งู) ไม่ให้กว้างเกิน wMax ช่อง
export function fitH(src, hMax, wMax = 2.1) { const im = img(src); return im ? Math.min(hMax, wMax / (im.naturalWidth / im.naturalHeight)) : hMax; }
export function preloadEosArt() { img(CHOCO_IMG); for (let i = 1; i <= 6; i++) img(`/eos/img/people${i}.webp`); for (let i = 1; i <= 8; i++) img(daemonImg(i)); img(GIANT_IMG); img(MAGITEK_EX_IMG); img(LAMENT_IMG); for (let i = 1; i <= 3; i++) img(`/eos/img/car${i}.webp`); img(MAGITEK_IMG); }

// แสงเรือง (อบครั้งเดียวต่อสี)
const GLOW = new Map();
export function glowAt(g, x, y, r, rgb, a) {
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
export function poly(g, pts) {
  g.beginPath();
  pts.forEach(([x, y, z = 0], i) => { const p = P(x, y, z); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); });
  g.closePath();
}
// กล่อง 3 มิติบนกระดาน (x0..x1, y0..y1, สูง h) — วาดด้านที่หันหากล้อง + หลังคา
// เงาทอด: แสงจากทิศตะวันตกเฉียงเหนือของกระดาน → เงาไปทาง +x +y (กลางคืน = แสงจันทร์ เงาจางกว่า)
export const SUN = { x: 0.62, y: 0.38 };
export const HEIGHT = { fd_eos_bldg: null, fd_eos_wall: 0.85, fd_eos_tree: 1.25, fd_eos_rock: 0.55, fd_eos_lamp: 1.4, fd_eos_pump: 1.0, fd_eos_garage: 0.9, fd_eos_pillar: 1.5, fd_eos_lever: 0.45, fd_eos_domecore: 0.7, fd_eos_switch: 0.8, fd_eos_barrel: 0.5, fd_eos_crystal: 0.75, fd_eos_turret: 1.25, fd_eos_tomb: 1.0, fd_eos_shrine: 1.65, fd_eos_diner: 1.0, fd_eos_ranch: 1.1 };
export function hull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.slice().reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
let SHADOW_POLYS = null;
export function castShadows(g, C, night) {
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
export function box(g, x0, y0, x1, y1, h, top, side1, side2, z0 = 0, skip = null) {
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
export function skyFill(c, stops) {
  const { g, VX0, VY0, VW, bY } = c, gr = g.createLinearGradient(0, VY0, 0, bY);
  stops.forEach((col, i) => gr.addColorStop(i / (stops.length - 1), col));
  g.fillStyle = gr; g.fillRect(VX0, VY0, VW, bY - VY0);
}
export function mountains(c, color, base, amp, f, ph) {
  const { g, VX0, VX1, bY } = c;
  g.fillStyle = color; g.beginPath(); g.moveTo(VX0, bY + 2);
  for (let x = VX0; x <= VX1 + 8; x += 8) g.lineTo(x, base - Math.abs(Math.sin(x * f + ph)) * amp - Math.abs(Math.sin(x * f * 2.3 + ph * 2)) * amp * 0.4);
  g.lineTo(VX1, bY + 2); g.closePath(); g.fill();
}
export function skyline(c, base) {
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
export const TILES = tilesOf();
export const STATIC_TR = (MAPS[EOS_AREA] && MAPS[EOS_AREA].terrain) || {}; // สิ่งกีดขวางคงที่ของผัง (หาช่องข้างเคียงของกำแพง/อู่)
// หญ้าทั้งกระดาน (ทุกช่อง — พื้นอื่นทับทีหลัง) แบ่ง 8 ระดับสีตาม noise ความถี่ต่ำ (คำนวณครั้งเดียว)
export const GRASS_BUCKETS = (() => {
  const m = MAPS[EOS_AREA], out = Array.from({ length: 8 }, () => []);
  if (!m) return out;
  for (let y = 0; y < m.rows; y++) for (let x = 0; x < m.cols; x++) {
    const v = Math.min(0.999, vnoise(x * 0.23, y * 0.23) * 0.8 + vnoise(x * 0.61 + 9, y * 0.61 + 3) * 0.35);
    out[Math.floor(v * 8)].push({ x, y });
  }
  return out;
})();
export const WATER_SET = new Set([...TILES.water, ...TILES.canal].map((t) => K(t.x, t.y)));
export const ROAD_SET = new Set(TILES.road.map((t) => K(t.x, t.y)));
export const BUILDING = (() => {
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
export function vnoise(x, y) {
  const x0 = Math.floor(x), y0 = Math.floor(y), tx = x - x0, ty = y - y0;
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const a = hash(x0, y0), b = hash(x0 + 1, y0), c2 = hash(x0, y0 + 1), d = hash(x0 + 1, y0 + 1);
  return (a * (1 - sx) + b * sx) * (1 - sy) + (c2 * (1 - sx) + d * sx) * sy;
}
export function mix(a, b, t) {
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
export function msFill(g, set, color, { jitter = 0, th = 0.5, seed = 0, cols = 32, rows = 32, alpha = 1, ox = 0, oy = 0 } = {}) {
  if (!set.size) return;
  const polys = msPolys(set, jitter, th, seed, cols, rows, ox, oy);
  g.globalAlpha = alpha;
  g.fillStyle = color; g.strokeStyle = color; g.lineWidth = 1;
  const edge = !FAST && alpha >= 1; // เส้นบางสีเดียวกันปิดรอยต่อระหว่างเซลล์ (ข้ามระหว่างหมุน) · ชั้นโปร่งแสงไม่ขีด — เส้นซ้อนกันเห็นเป็นตาราง
  g.beginPath();
  let n = 0;
  for (const pts of polys) {
    pts.forEach(([px, py], i) => { const q = P(px, py); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); });
    g.closePath();
    if (++n % FILL_CHUNK === 0) { g.fill(); if (edge) g.stroke(); g.beginPath(); } // เติมเป็นชุด — เส้นทางเดียวหลายร้อยรูปช้ากว่า ~10 เท่า (วัด 2026-11-10)
  }
  g.fill(); if (edge) g.stroke();
  g.globalAlpha = 1;
}
// ขนาดชุดเติมสี: Chrome (GPU canvas) เติมเส้นทางเดียวที่มีรูปย่อย 4000 รูป ~130ms แต่แบ่งเป็นชุดละ 20–100 รูป ~10ms (วัดบน RTX 5060 2026-11-10)
export const FILL_CHUNK = 48;
// ระหว่างหมุนกล้องอิสระ (วาดสดทุกเฟรม): ข้ามรายละเอียดเล็ก — BoardCanvas ตั้งผ่าน setEosFast
export let FAST = false;
export function setEosFast(b) { FAST = !!b; }
export const eosFast = () => FAST;
// ชุดช่องคงที่ (สร้างครั้งเดียว — msFill แคชรูปทรงตามชุด)
export const SETS = {};
export const setFor = (name, list) => (SETS[name] ||= new Set(list.map((t) => K(t.x, t.y))));

// =================================================================== สิ่งกีดขวาง (วาดทุกเฟรม เรียงความลึก)
export let LAST_NIGHT = false;
export function setLastNight(v) { LAST_NIGHT = v; }
export let LAST_FD = null;
export function setLastFd(v) { LAST_FD = v; }
export const palOf = (ctx) => (ctx && ctx.C && ctx.C.road ? ctx.C : PAL[ctx && ctx.night ? "night" : "day"]);
export const zoneAt = (x, y) => (y >= 20 && x >= 13 ? "desert" : y >= 24 && x <= 12 ? "altissia" : y <= 9 && x <= 7 ? "hills" : y <= 9 && x >= 24 ? "north" : "wild");
// =================================================================== เสายึดพื้นที่ 5 ต้น — แบบเฉพาะของแต่ละพื้นที่ (ผู้ใช้สั่ง 2026-11-09 "ออกแบบเสาใหม่ สวยกว่าเดิม มีเอกลักษณ์ของแต่ละพื้นที่")
//  insomnia = เสาโอเบลิสก์หินดำขอบเงิน + คริสตัลหลวงลอยหมุน · hammerhead = เสาเหล็กโครงถัก + ป้ายนีออน + ไฟหมุนบนยอด
//  duscae = หินตั้งโบราณ มอส อักษรรูนเรือง หินลอยวน · lake (Cleigne) = ศาลน้ำ อ่างหิน น้ำไหลจากชามบนยอด ดอกบัว
//  altissia = เสาหินอ่อน Accordo หัวเสาทอง กระถางไฟ + อ่างน้ำพุ
//  เจ้าของ = สีฝ่ายบนไฟ/อักษร/คริสตัลของเสา + มงกุฎลอยสีฝ่าย + วงสีบนพื้น · ไม่มีเจ้าของ = สีกลางของพื้นที่ ไม่มีมงกุฎ
//  พิธียึด (pl.ch — ร่าย 2 ครั้ง): ครั้งแรกแล้ว = วงความคืบหน้าครึ่งวงสีคนร่าย + วงประหมุน + ประกายลอยขึ้น
export const PILLAR_ZONE = { "19,3": "insomnia", "21,27": "hammerhead", "23,15": "duscae", "11,17": "lake", "3,27": "altissia" };
export const PILLAR_NEUTRAL = { insomnia: "#9fd8ff", hammerhead: "#ff8a3c", duscae: "#7fe0c0", lake: "#8fe3ff", altissia: "#ffe0a0" };
export const hex6 = (c, fb) => (/^#[0-9a-f]{6}$/i.test(String(c || "")) ? c : fb);
export const shadeCol = (hex, k) => (k >= 0 ? mix(hex, "#ffffff", k) : mix(hex, "#000000", -k));
export const faceLit = (nx, ny) => -(nx * 0.85 + ny * 0.52); // แสงจากตะวันตกเฉียงเหนือ (เงาทอดไป +x +y)
export const sqPts = (cx, cy, h) => [[cx - h, cy - h], [cx + h, cy - h], [cx + h, cy + h], [cx - h, cy + h]];
export const regPoly = (cx, cy, r, n, rot = 0) => Array.from({ length: n }, (_, i) => [cx + Math.cos(rot + i / n * TAU) * r, cy + Math.sin(rot + i / n * TAU) * r]);
export const CANAL_SET = new Set(TILES.canal.map((t) => K(t.x, t.y)));
export const MAP_W = (MAPS[EOS_AREA] && MAPS[EOS_AREA].cols) || 32, MAP_H = (MAPS[EOS_AREA] && MAPS[EOS_AREA].rows) || 32;
// ---------- รถราง (ผู้ใช้สั่ง 2026-11-11 — server/fodlan/map6.js TRAMS · ลำดับวงรอบต้องตรงกัน) ----------
//  รางวิ่งตามถนนระหว่างป้ายที่ติดกัน (Dijkstra: ถนน/ลาน 1 · ทราย/หญ้า 2 · น้ำตื้น/สะพาน 3 · ป่า 4 · สิ่งกีดขวาง/น้ำลึก ไม่ได้) · เกลาโค้ง Chaikin
// ยาก / Lament ไม่มีรถราง (server ส่ง trams ว่าง) — ซ่อนราง+ป้าย · ตั้งจากข้อมูลกระดานทุกเฟรม
export let TRAM_OFF = false;
export function setTramOff(v) { TRAM_OFF = v; }
// ตามอนทีละตัว (e.seqd — server mobTimeline): ความคืบหน้าของรายการย่อยตามคิว (ยังไม่ถึง < 0 · จบ = 1) · เหตุการณ์แบบเดิม = p ทั้งก้อน
export let FX_NOW = 0;
export function setFxNow(v) { FX_NOW = v; }
