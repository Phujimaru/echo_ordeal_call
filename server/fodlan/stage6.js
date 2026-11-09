// ============================================================
//  สนาม Eos (GRID_PLAN §8.6 — เดิมชื่อ Lucid · ธีม Final Fantasy XV) — "ด่าน 6" ของตัวคุม server/fodlan.js ในโลก "eos"
//  ผัง 32×32 + ข้อมูลรถ/โชโกโบะ/โซน: server/fodlan/map6.js · ฮุคทั้งหมดดู server/fodlan/README.md
//
//  ขั้น 1 (ผู้ใช้สั่ง 2026-11-09):
//   - ระยะเดินทุกคน +2 (แผนที่ใหญ่ — ผู้ใช้ยืนยัน)
//   - โชโกโบะ 4 ตัว (คอกป่า Duscae 2 · คอกทะเลทราย 2): จบตาบนช่องโชโกโบะ = ขึ้นขี่ · ขี่อยู่ เดิน +3 + ป่าทึบ/น้ำตื้นกิน 1 ก้าว
//     โดนดาเมจ (เลือด+เกราะลด) = ตกนก → นกวิ่งกลับคอก เกิดใหม่หลัง 3 เทิร์น · ปุ่ม "ลง" วางนกไว้ช่องข้างตัว (ไม่เสียการเดิน)
//     ขี่ไม่ได้: ตัวใหญ่หลายช่อง · บินได้ · ขี่ม้าอยู่ · ยูนิตที่ถูกเรียก (Claude ตัดสินแบบ Fire Emblem — ผู้ใช้มอบให้)
//   - รถ 3 คัน 2×2 (นั่ง 4 · แบบเรือ Fodlan ด่าน I): ยืนบนรถทั้งตัว + ยังเดินได้ → ปุ่ม "ขับ" เลือกตำแหน่งใหม่บนถนนไม่เกิน 10 ช่อง
//     ใช้การเดินของตา (lockMove) ยังตี/ใช้สกิลได้ · รถคันอื่นขวางทาง (หยุดหน้าคันที่ขวาง) · คนที่ไม่ได้นั่งรถบนทางที่รถผ่าน = ถูกชน 2 + กระเด็นออก 1 ช่อง (L1)
//     ทุกอย่างบนรถ (คน ศพ) ไปด้วย
//   - กลางคืน: ปีศาจ 4 ตัวเกิดนอกเมือง (HP 5 · เกราะ 1 · ตี 2 · เดิน 4) ต้นทุกเทิร์นกลางคืนเดินไล่คนใกล้สุดแล้วตีถ้าติดตัว
//     เข้าเมืองที่มีไฟถนน (Insomnia/Hammerhead/Altissia) ไม่ได้ · ฟ้าสาง = สลายหมด · ตีปกติใส่ได้ (ของบนกระดาน "fd:dm…") ฆ่าได้ 2 เหรียญ
//   - สภาพอากาศ (server/fodlan.js สุ่ม — 50% ทุกจบเทิร์นตั้งแต่จบเทิร์น 2 · อยู่ 3 เทิร์น · สงบแล้วพัก 2 เทิร์น):
//     ฝนฟ้าคะนอง eos_storm = เดิน −1 + ฟ้าผ่า 3 จุด/เทิร์น (ช่องเตือนก่อน → ต้นเทิร์นถัดไปผ่าจริง 2 ดาเมจ)
//     หมอก eos_fog = มองเห็นแค่ระยะเดินของฝ่ายตัวเอง (แบบด่าน II)
//
//  สถานะ = st.eos (สร้างใน enter) — ไม่มี = ฮุคไม่ทำอะไร
// ============================================================
const MAP = require("./map6");

const MOV_BONUS = 2;          // ทุกคนบน Eos
const CHOCO_MOV = 3;          // ขี่โชโกโบะ
const CHOCO_RESPAWN = 3;      // ตกนกแล้วเกิดใหม่ที่คอกหลัง N เทิร์น
const CAR_HIT_DMG = 2;
const DAEMON_COUNT = 10;      // ผู้ใช้สั่ง 2026-11-09: เกิดน้อยเกิน → มากขึ้น กระจายทั่วแผนที่ เกิดซ้ำทุกเทิร์นกลางคืน
const DAEMON_REFILL = 3;      // กลางคืนเทิร์นถัดไป: เติมกลับไม่เกินกี่ตัว/เทิร์น จนครบ DAEMON_COUNT
const DAEMON_HP = 5;
const DAEMON_ARMOR = 1;
const DAEMON_ATK = 2;
const DAEMON_MOV = 4;
const DAEMON_GOLD = 2;
const DAEMON_SPAWN_GAP = 3;   // เกิดห่างผู้เล่นอย่างน้อย N ช่อง
const LIGHTNING_COUNT = 3;
const LIGHTNING_DMG = 2;
const STORM_MOV = -1;
// เงื่อนไขชนะ (ผู้ใช้สั่ง 2026-11-09): ยึดเสา 5 ต้น · แต้มต่อเทิร์นตามจำนวนเสาที่ถือ · ถึง 20 ก่อนชนะ
const SCORE_GOAL = 20;
const SCORE_TABLE = [0, 1, 3, 6, 10, 15];
const SEIZE_SECS = 1.4;
const REVIVE_TURNS = 3;       // ตายแล้วฟื้นหลัง 3 เทิร์น
const SIGHT_EXTRA = 4;        // เห็นผู้เล่นอื่นในระยะเดิน + 4 ช่อง
const SECS = { dropship: 1.8, mobs: 1.4, revive: 1.2, lightning: 1.8, daemonSpawn: 1.6, daemonAct: 1.4, dawn: 1.4 };

const K = (x, y) => `${x},${y}`;
const ROAD = new Set((MAP.map.special.fd_eos_road || []).map(([x, y]) => K(x, y)));
const TOWNS = MAP.ZONES.filter((z) => z.town);
const inRect = (r, x, y) => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3];
const inTown = (x, y) => TOWNS.some((z) => inRect(z.rect, x, y));
const zoneAt = (x, y) => (MAP.ZONES.find((z) => inRect(z.rect, x, y)) || { id: "wild" }).id;
const lazyShop = () => require("../shop");
const lazyAttack = () => require("../phases/attack");
const lazyLobby = () => require("../lobby");
const lazyDuo = () => require("../duo");
let VISIT = 0;

const bodies = (ctx) => ctx.combat.alivePlayers().filter((p) => p.pos);
const sizeOf = (ctx, p) => Math.max(1, ctx.action.sizeOf(p) | 0);
const footOf = (ctx, p) => ctx.Board.footprint(p.pos.x, p.pos.y, sizeOf(ctx, p));
const stormOn = (ctx) => !!(ctx.weather && ctx.weather.kind === "eos_storm");
const fogOn = (ctx) => !!(ctx.weather && ctx.weather.kind === "eos_fog");
const nightAt = (ctx, round) => { try { return !!ctx.engine.isNightRound(round); } catch { return false; } };

// ============================================================ เข้าสนาม
function enter(ctx, st) {
  st.eos = {
    visit: ++VISIT, seq: 0,
    cars: MAP.CARS.map(([x, y], i) => ({ id: `fd:car${i + 1}`, img: i + 1, x, y, driver: null, dx: -1, dy: 0 })),
    chocos: MAP.CHOCOBOS.map(([x, y], i) => ({ id: `fd:choco${i + 1}`, home: { x, y }, x, y, rider: null, back: 0 })),
    riders: {},      // id ผู้ขี่ → { choco, mark } (mark = เลือด+เกราะล่าสุด — ลดลง = ตกนก)
    daemons: [],
    night: false, // เทิร์นแรกเป็นกลางคืน (เริ่มแมตช์กลางเทิร์น — dev) = ปีศาจเกิดต้นเทิร์นแรก
    warn: null, warnFor: 0,
    pillars: MAP.PILLARS.map((pl, i) => ({ id: `fd:pillar${i + 1}`, zone: pl.zone, x: pl.at[0], y: pl.at[1], owner: null, ch: null })),
    scores: {},      // ฝ่าย → แต้ม
    dead: {},        // id ผู้เล่น → เทิร์นที่ล้ม (ฟื้นต้นเทิร์น + REVIVE_TURNS)
    winner: null,
    bridgeUp: false, dome: null, domeReadyRound: 0, lightsOff: {},
    wrecks: MAP.WRECKS.map(([x, y], i) => ({ id: `fd:wreck${i + 1}`, x, y })),
    barrels: MAP.BARRELS.map(([x, y], i) => ({ id: `fd:barrel${i + 1}`, x, y, home: { x, y } })), barrelBack: [],
    crystals: [], crystalBack: MAP.CRYSTALS.map(([x, y]) => ({ at: { x, y }, round: 0 })),
    flasks: {}, mobs: [], beastBack: 1, dropship: null, dropNext: 0,
  };
  // dev: วางรถคันแรกไว้ที่ช่องที่กำหนด (EOS_DEV_CAR="x,y" — ทดสอบการขึ้นรถในเบราว์เซอร์)
  if (process.env.EOS_DEV_CAR) { const [x, y] = String(process.env.EOS_DEV_CAR).split(",").map(Number); if (Number.isFinite(x) && Number.isFinite(y)) Object.assign(st.eos.cars[0], { x, y }); }
  ctx.bump();
}

// ============================================================ ชั้นแผนที่
function layer(ctx, st, map) {
  const s = st && st.eos;
  if (!s) return map;
  const terrain = { ...map.terrain }, special = { ...map.special };
  syncCars(ctx, s);
  for (const c of s.cars) if (!c.driver) terrain[K(c.x, c.y)] = "fd_eos_car"; // จอดอยู่ = สิ่งกีดขวาง (ขับอยู่ = อยู่ใต้คนขับ)
  for (const c of s.chocos) if (c.x != null && !c.rider) special[K(c.x, c.y)] = "fd_eos_chocobo";
  for (const d of s.daemons) terrain[K(d.x, d.y)] = "fd_eos_daemon";
  for (const w of s.wrecks || []) terrain[K(w.x, w.y)] = "fd_eos_wreck";
  for (const b of s.barrels || []) terrain[K(b.x, b.y)] = "fd_eos_barrel";
  for (const c of s.crystals || []) terrain[K(c.x, c.y)] = "fd_eos_crystal";
  for (const m of s.mobs || []) terrain[K(m.x, m.y)] = "fd_eos_mob";
  // น้ำที่แช่แข็ง (ขวดน้ำแข็ง) = เดินได้ (ไถลตามกติกาน้ำแข็ง)
  const b = ctx.match.board || {};
  for (const k of Object.keys(b.ice || {})) if (terrain[k] === "fd_eos_water" || terrain[k] === "fd_eos_canal") { delete terrain[k]; special[k] = "ice"; }
  if (s.bridgeUp) for (const t of BRIDGES) { terrain[K(t.x, t.y)] = "fd_eos_bridgeup"; delete special[K(t.x, t.y)]; }
  if (domeOn(s)) for (const t of DOME_GATES) terrain[K(t.x, t.y)] = "fd_eos_barrier";
  return { ...map, terrain, special };
}
function layerVer(ctx, st) {
  const s = st && st.eos;
  return s ? `e${s.visit}` : "x";
}

// ============================================================ ระยะเดิน
function riding(s, p) { return !!(s && p && s.riders[p.id]); }
function movMod(ctx, st, p) {
  const s = st && st.eos;
  if (!s || !p) return 0;
  return MOV_BONUS + (riding(s, p) ? CHOCO_MOV : 0) + (driving(s, p) ? CAR_MOV : 0) + (stormOn(ctx) ? STORM_MOV : 0);
}
function flatWalk(ctx, st, p) { return riding(st && st.eos, p); }

// ============================================================ โชโกโบะ
// ขี่ม้าอยู่ (ไจโร/ดิเอโก้ — characters/_horse.js เก็บ { mounted, horseHp } ในสถานะตัวละคร)
function onHorse(p) {
  return Object.values(p || {}).some((v) => v && typeof v === "object" && !Array.isArray(v) && v.mounted === true && "horseHp" in v);
}
function canRide(ctx, p, s = null) {
  return !!(p && p.alive && p.pos && !p.summon && !p.mountId && sizeOf(ctx, p) === 1 && !ctx.action.flies(p) && !onHorse(p) && !driving(s, p));
}
const markOf = (p) => (p.hp || 0) + (p.armor || 0);
function chocoAt(s, x, y) { return s.chocos.find((c) => !c.rider && c.x === x && c.y === y) || null; }
function mount(ctx, s, p, c) {
  c.rider = p.id;
  s.riders[p.id] = { choco: c.id, mark: markOf(p) };
  ctx.bump();
  ctx.fx("choco_mount", { id: p.id, choco: c.id, x: c.x, y: c.y });
  ctx.log(`🐤 ${p.name} ขี่โชโกโบะ`);
}
// โชโกโบะวิ่งกลับคอก → เกิดใหม่หลัง CHOCO_RESPAWN เทิร์น
function sendHome(ctx, s, c, from) {
  c.rider = null;
  c.x = null; c.y = null;
  c.back = ctx.match.roundNumber + CHOCO_RESPAWN;
  ctx.bump();
  ctx.fx("choco_home", { choco: c.id, from, home: { ...c.home } });
}
function unride(ctx, s, pid) {
  const r = s.riders[pid];
  delete s.riders[pid];
  return r ? s.chocos.find((c) => c.id === r.choco) || null : null;
}
// ตกนก: เลือด+เกราะลดลงตั้งแต่ครั้งก่อน · ตาย · ออกจากกระดาน · ตอนนี้ขี่ไม่ได้แล้ว (ขึ้นม้า ขยายร่าง …)
function checkRiders(ctx, s) {
  for (const pid of Object.keys(s.riders)) {
    const p = ctx.match.players[pid], r = s.riders[pid];
    const from = p && p.pos ? { x: p.pos.x, y: p.pos.y } : null;
    if (!p || !p.alive || !p.pos || !canRide(ctx, p, s)) {
      const c = unride(ctx, s, pid);
      if (c) sendHome(ctx, s, c, from);
      continue;
    }
    const now = markOf(p);
    if (now < r.mark) {
      const c = unride(ctx, s, pid);
      ctx.fx("choco_fall", { id: p.id, x: p.pos.x, y: p.pos.y });
      ctx.log(`🐤 ${p.name} ตกจากโชโกโบะ!`);
      if (c) sendHome(ctx, s, c, from);
    } else r.mark = now; // ฟื้นเลือด = จุดอ้างอิงใหม่
  }
}
function respawnChocos(ctx, s) {
  const round = ctx.match.roundNumber + 1;
  for (const c of s.chocos) {
    if (c.x != null || c.rider || round < c.back) continue;
    const spot = freeNear(ctx, s, c.home.x, c.home.y, 2);
    if (!spot) continue;
    c.x = spot.x; c.y = spot.y; c.back = 0;
    ctx.bump();
    ctx.fx("choco_back", { choco: c.id, x: c.x, y: c.y });
  }
}
// ลงจากโชโกโบะ: วางนกไว้ช่องว่างข้างตัว
function dismountTiles(ctx, s, p) {
  const out = [];
  for (const [dx, dy] of ctx.Board.DIRS) {
    const x = p.pos.x + dx, y = p.pos.y + dy;
    if (tileFree(ctx, s, x, y)) out.push({ x, y });
  }
  return out;
}

// ============================================================ รถ
//  ผู้ใช้สั่ง 2026-11-09: "การขับรถคือการขี่แล้วขับ ไม่ใช่การกดแล้วไปตำแหน่ง — เหมือนม้า" · รถ 1 ช่อง · คนขับ + ผู้โดยสาร · ถนน + พื้นเรียบ
//  - จอดอยู่ = สิ่งกีดขวาง (terrain fd_eos_car) · ปุ่ม "ขึ้นรถ" ตอนยืนติดรถ → เข้าไปนั่งช่องรถ
//    ยังไม่ได้เดินตานี้ = เริ่มเดินจากรถเต็มระยะ · เดินแล้ว = ขึ้นได้แต่จบการเดินของตา (Claude ตัดสินแบบ Fire Emblem)
//  - ขับอยู่: เดิน +CAR_MOV · ไปได้แค่ถนน/ลาน/ทราย/สะพาน/หญ้า (ป่าทึบ น้ำตื้น น้ำแข็ง ช่องโชโกโบะ ไม่ได้ — Board opts.carWalk) · รถวิ่งตามคนขับ
//  - ปุ่ม "ชน" (ใช้การโจมตีของเทิร์น): ศัตรู/ปีศาจ/ทหาร/สัตว์ที่ติดรถ → CAR_HIT_DMG + กระเด็นออก 1 ช่อง
//  - ปุ่ม "ลงรถ" (ไม่เสียการเดิน): ลงช่องว่างข้างตัว รถจอดที่เดิม · ผู้โดยสารลงหมด
//  - ผู้โดยสาร: ปุ่ม "นั่งรถ" ข้างรถที่มีคนขับ → ขอขึ้น (ระบบขี่ server/ride.js — คนขับกดยอม) ได้อีก CAR_SEATS คน
//    ถูกตีไม่ร่วง (อยู่ในรถ — ฮุค carDriver) · คนขับตาย = รถจอดช่องว่างใกล้สุด ผู้โดยสารลงหมด
const CAR_MOV = 3;
const CAR_SEATS = 3;
const CAR_OFF = ["fd_eos_forest", "fd_eos_shallow", "ice", "fd_eos_chocobo", "fd_eos_stable"];
function carCells(a) { return [{ x: a.x, y: a.y }]; }
const carKeys = (a) => new Set([K(a.x, a.y)]);
function carOf(ctx, s, p) { return p && s ? s.cars.find((c) => c.driver === p.id) || null : null; }
function driving(s, p) { return !!(s && p && s.cars.some((c) => c.driver === p.id)); }
function canDrive(ctx, s, p) {
  return !!(p && p.alive && p.pos && !p.summon && !p.mountId && sizeOf(ctx, p) === 1 && !ctx.action.flies(p) && !onHorse(p) && !riding(s, p) && !driving(s, p));
}
const carNear = (ctx, s, p) => s.cars.filter((c) => !c.driver && Math.abs(c.x - p.pos.x) + Math.abs(c.y - p.pos.y) === 1);
const specialOf = (ctx, x, y) => {
  const m = ctx.match.board || {};
  if (m.ice && m.ice[K(x, y)]) return "ice";
  const sp = MAP.map.special || {};
  for (const name of CAR_OFF) if ((sp[name] || []).some(([a, b]) => a === x && b === y)) return name;
  return null;
};
const carGround = (ctx, s, x, y) => !CAR_OFF.includes(specialOf(ctx, x, y)) && !s.chocos.some((c) => !c.rider && c.x === x && c.y === y);
function passengersOf(ctx, driver) {
  return Object.values(ctx.match.players).filter((u) => u.alive && driver && u.mountId === driver.id);
}
function dropPassengers(ctx, driver) {
  const R = ctx.engine.ride;
  for (const u of passengersOf(ctx, driver)) if (R && R.fall) R.fall(u, "car");
}
// จอดรถ (คนขับลง/ตาย/ออกจากกระดาน) · ช่องเดิมใช้ไม่ได้ (มีศพ/ตัวอื่น) = ช่องว่างใกล้สุดที่รถจอดได้
function park(ctx, s, c, keepTile = true) {
  const p = ctx.match.players[c.driver];
  c.driver = null;
  if (!keepTile || !tileFree(ctx, s, c.x, c.y)) {
    const spot = freeNear(ctx, s, c.x, c.y, 5, null, (x, y) => (keepTile || x !== c.x || y !== c.y) && carGround(ctx, s, x, y));
    if (spot) { c.x = spot.x; c.y = spot.y; }
  }
  if (p) dropPassengers(ctx, p);
  ctx.bump();
}
// รถวิ่งตามคนขับ · คนขับหาย = จอด
function syncCars(ctx, s) {
  for (const c of s.cars) {
    if (!c.driver) continue;
    const p = ctx.match.players[c.driver];
    if (p && p.alive && p.pos) {
      if (p.pos.x !== c.x || p.pos.y !== c.y) { c.dx = Math.sign(p.pos.x - c.x); c.dy = Math.sign(p.pos.y - c.y); c.x = p.pos.x; c.y = p.pos.y; }
      continue;
    }
    if (p && p.pos == null && !p.alive) { park(ctx, s, c, false); continue; }
    park(ctx, s, c, false);
  }
}
function carWalk(ctx, st, p) { return driving(st && st.eos, p); }
// ขึ้นรถ
function boardCar(ctx, s, p, tile) {
  if (!canDrive(ctx, s, p) || !canMove(ctx, p) || !tile) return false;
  const c = carNear(ctx, s, p).find((o) => o.x === tile.x && o.y === tile.y);
  if (!c) return false;
  const a = ctx.match.action, from = { ...p.pos };
  c.driver = p.id;
  p.pos = { x: c.x, y: c.y };
  if (a.moved || a.path || a.locked) ctx.action.lockMove(p);
  else {
    if (!a.eye) a.eye = { ...a.from };
    a.from = { ...p.pos }; a.trail = null; a.path = null;
  }
  ctx.bump();
  ctx.fx("car_mount", { id: p.id, car: c.id, img: c.img, from, x: c.x, y: c.y });
  ctx.log(`🚗 ${p.name} ขึ้นรถ`);
  return true;
}
function leaveTiles(ctx, s, p) {
  const out = [];
  for (const [dx, dy] of ctx.Board.DIRS) {
    const x = p.pos.x + dx, y = p.pos.y + dy;
    if (tileFree(ctx, s, x, y)) out.push({ x, y });
  }
  return out;
}
function leaveCar(ctx, s, p, tile) {
  const c = carOf(ctx, s, p);
  if (!c || !ctx.action.canAct(p) || !tile) return false;
  if (!leaveTiles(ctx, s, p).some((t) => t.x === tile.x && t.y === tile.y)) return false;
  c.x = p.pos.x; c.y = p.pos.y;
  dropPassengers(ctx, p);
  c.driver = null;
  const a = ctx.match.action;
  p.pos = { x: tile.x, y: tile.y };
  if (a) { a.from = { ...p.pos }; a.trail = null; a.path = null; a.locked = true; }
  ctx.bump();
  ctx.fx("car_leave", { id: p.id, car: c.id, img: c.img, x: c.x, y: c.y, to: { ...tile } });
  ctx.log(`🚗 ${p.name} ลงรถ`);
  return true;
}
// เป้าที่ชนได้: ผู้เล่นฝ่ายอื่น (ไม่บิน ไม่ได้นั่งรถคันนี้) · ปีศาจ · ทหาร/สัตว์ — ติดรถ
function ramTargets(ctx, s, p) {
  const out = [];
  const adj = (x, y) => Math.abs(x - p.pos.x) + Math.abs(y - p.pos.y) === 1;
  for (const u of bodies(ctx)) {
    if (u.id === p.id || u.mountId === p.id || ctx.action.flies(u) || sizeOf(ctx, u) > 1) continue;
    if (ctx.combat.sameTeam && ctx.combat.sameTeam(u, p)) continue;
    if (adj(u.pos.x, u.pos.y)) out.push({ x: u.pos.x, y: u.pos.y });
  }
  for (const d of s.daemons) if (adj(d.x, d.y)) out.push({ x: d.x, y: d.y });
  for (const m of s.mobs || []) if (adj(m.x, m.y)) out.push({ x: m.x, y: m.y });
  return out;
}
function ram(ctx, s, p, tile) {
  const c = carOf(ctx, s, p);
  if (!c || !canStrike(ctx, p) || !tile) return false;
  if (!ramTargets(ctx, s, p).some((t) => t.x === tile.x && t.y === tile.y)) return false;
  const dx = tile.x - p.pos.x, dy = tile.y - p.pos.y;
  const hits = [];
  const u = bodies(ctx).find((o) => o.pos.x === tile.x && o.pos.y === tile.y && o.id !== p.id);
  if (u) {
    const from = { ...u.pos };
    const dealt = ctx.damage(u, CAR_HIT_DMG);
    if (u.alive && u.pos && tileFree(ctx, s, u.pos.x + dx, u.pos.y + dy, u.id)) u.pos = { x: u.pos.x + dx, y: u.pos.y + dy };
    hits.push({ id: u.id, from, to: u.pos ? { ...u.pos } : null, dmg: dealt });
    ctx.log(`🚗 ${p.name} ขับรถชน ${u.name} -${dealt}`);
  }
  const d = s.daemons.find((o) => o.x === tile.x && o.y === tile.y);
  if (d) { hits.push({ daemon: d.id, from: { x: d.x, y: d.y }, dmg: CAR_HIT_DMG }); hurtDaemon(ctx, s, d, CAR_HIT_DMG, p); }
  const m = (s.mobs || []).find((o) => o.x === tile.x && o.y === tile.y);
  if (m) { hits.push({ mob: m.id, from: { x: m.x, y: m.y }, dmg: CAR_HIT_DMG }); hurtMob(ctx, s, m, CAR_HIT_DMG, p); }
  c.dx = Math.sign(dx); c.dy = Math.sign(dy);
  ctx.bump();
  ctx.fx("car_ram", { car: c.id, img: c.img, by: p.id, x: p.pos.x, y: p.pos.y, at: { ...tile }, hits });
  ctx.useStrike(p, 1);
  return true;
}
// ผู้โดยสาร: รถที่มีคนขับติดตัว ยังมีที่นั่ง → ขอขึ้น (server/ride.js ask — คนขับกดยอม)
function seatsLeft(ctx, s, driver) { return driving(s, driver) ? CAR_SEATS - passengersOf(ctx, driver).length : 0; }
function boardTiles(ctx, s, p) {
  if (!canDrive(ctx, s, p)) return [];
  const out = [];
  for (const c of s.cars) {
    if (!c.driver || c.driver === p.id || Math.abs(c.x - p.pos.x) + Math.abs(c.y - p.pos.y) !== 1) continue;
    const d = ctx.match.players[c.driver];
    if (d && seatsLeft(ctx, s, d) > 0) out.push({ x: c.x, y: c.y });
  }
  return out;
}
// ฮุคของ server/ride.js: t ขับรถอยู่ = จำนวนที่นั่งผู้โดยสาร (0 = ไม่ใช่รถ)
function carSeats(ctx, st, p, t) {
  const s = st && st.eos;
  if (!s || !driving(s, t) || !canDrive(ctx, s, p)) return 0;
  return CAR_SEATS;
}
function carDriver(ctx, st, p) { return driving(st && st.eos, p); }
function askRide(ctx, s, p, tile) {
  if (!tile || !boardTiles(ctx, s, p).some((t) => t.x === tile.x && t.y === tile.y)) return false;
  const c = s.cars.find((o) => o.driver && o.x === tile.x && o.y === tile.y);
  return !!(c && require("../ride").ask(p.id, c.driver));
}

// ============================================================ ช่องว่าง
// ช่องเดินได้ ว่าง (ไม่มีคน ไม่มีสิ่งกีดขวาง/ปีศาจ ไม่ใช่รถ/โชโกโบะ)
function tileFree(ctx, s, x, y, selfId = null) {
  if (!ctx.free(x, y, selfId)) return false;
  for (const c of s.cars) if (!c.driver && c.x === x && c.y === y) return false;
  if (s.chocos.some((c) => !c.rider && c.x === x && c.y === y)) return false;
  if (s.daemons.some((d) => d.x === x && d.y === y)) return false;
  if ((s.mobs || []).some((m) => m.x === x && m.y === y)) return false;
  if ((s.barrels || []).some((b) => b.x === x && b.y === y) || (s.crystals || []).some((c) => c.x === x && c.y === y)) return false;
  return true;
}
function freeNear(ctx, s, x0, y0, maxD = 4, selfId = null, extra = null) {
  for (let d = 0; d <= maxD; d++) {
    for (let dx = -d; dx <= d; dx++) for (const sy of [1, -1]) {
      const dy = sy * (d - Math.abs(dx));
      if (sy < 0 && dy === 0) continue;
      const x = x0 + dx, y = y0 + dy;
      if (tileFree(ctx, s, x, y, selfId) && (!extra || extra(x, y))) return { x, y };
    }
  }
  return null;
}

// ============================================================ ปีศาจ
const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
// กระจายทั่วแผนที่: แบ่งกระดานเป็นช่องตาราง 8×8 → สุ่มช่องละไม่เกิน 1 ตัวก่อน (ตารางที่ยังไม่มีปีศาจก่อน) แล้วค่อยซ้ำ
function spawnDaemons(ctx, s, n = DAEMON_COUNT) {
  const map = ctx.map(), units = bodies(ctx);
  const cell = (t) => `${Math.floor(t.x / 8)},${Math.floor(t.y / 8)}`;
  const buckets = new Map();
  for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) {
    if (blockedTown(s, x, y) || !tileFree(ctx, s, x, y)) continue;
    if (units.some((p) => footOf(ctx, p).some((t) => manhattan(t, { x, y }) < DAEMON_SPAWN_GAP))) continue;
    const k = cell({ x, y });
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push({ x, y });
  }
  const taken = new Set(s.daemons.map(cell));
  const keys = ctx.pick([...buckets.keys()], buckets.size);
  keys.sort((a, b) => (taken.has(a) ? 1 : 0) - (taken.has(b) ? 1 : 0));
  const picked = [];
  for (let round = 0; picked.length < n && round < 4; round++) {
    for (const k of keys) {
      if (picked.length >= n) break;
      const free = buckets.get(k).filter((t) => !picked.some((o) => manhattan(o, t) < 2));
      const t = ctx.pick(free, 1)[0];
      if (t) picked.push(t);
    }
  }
  for (const t of picked) s.daemons.push({ id: `fd:dm${++s.seq}`, x: t.x, y: t.y, hp: DAEMON_HP, armor: DAEMON_ARMOR, kind: 1 + (s.seq % 4) });
  if (picked.length) {
    ctx.bump();
    ctx.fx("daemon_spawn", { list: picked.map((t) => ({ x: t.x, y: t.y })) });
    ctx.log(s.daemons.length > picked.length ? `👹 ปีศาจโผล่เพิ่มอีก ${picked.length} ตัว` : `👹 ราตรีมาเยือน — ปีศาจ ${picked.length} ตัวโผล่ขึ้นมา!`);
  }
  return picked.length;
}
function dissolveDaemons(ctx, s) {
  if (!s.daemons.length) return 0;
  ctx.fx("daemon_dissolve", { list: s.daemons.map((d) => ({ x: d.x, y: d.y, kind: d.kind })) });
  ctx.log("☀️ ฟ้าสาง — ปีศาจสลายไปกับแสงอรุณ");
  s.daemons = [];
  ctx.bump();
  return 1;
}
// เป้าที่ตีได้: ผู้เล่นบนกระดาน (ไม่บินลอยข้ามหัว · ไม่อยู่ในเมือง)
function prey(ctx, s) {
  return bodies(ctx).filter((p) => !ctx.action.walksThrough(p) && !footOf(ctx, p).some((t) => blockedTown(s, t.x, t.y)));
}
// เดินไล่: BFS จากปีศาจ (ช่องว่าง นอกเมือง) หาช่องที่ติดเป้าใกล้สุด → เดินไปตามทางไม่เกิน DAEMON_MOV
function stepDaemon(ctx, s, d, targets) {
  const map = ctx.map();
  const adjT = (x, y) => targets.find((p) => footOf(ctx, p).some((t) => manhattan(t, { x, y }) === 1)) || null;
  const hit0 = adjT(d.x, d.y);
  if (hit0) return { to: null, target: hit0 };
  const start = { x: d.x, y: d.y, d: 0, prev: null };
  const seen = new Set([K(d.x, d.y)]);
  const queue = [start];
  let goal = null;
  for (let i = 0; i < queue.length && !goal; i++) {
    const cur = queue[i];
    for (const [dx, dy] of ctx.Board.DIRS) {
      const x = cur.x + dx, y = cur.y + dy, k = K(x, y);
      if (seen.has(k) || !ctx.Board.inBounds(map, x, y) || blockedTown(s, x, y) || !tileFree(ctx, s, x, y)) continue;
      seen.add(k);
      const node = { x, y, d: cur.d + 1, prev: cur };
      if (adjT(x, y)) { goal = node; break; }
      queue.push(node);
    }
  }
  if (!goal) return { to: null, target: null };
  const path = [];
  for (let c = goal; c; c = c.prev) path.unshift({ x: c.x, y: c.y });
  const stop = path[Math.min(DAEMON_MOV, path.length - 1)];
  return { to: stop, path: path.slice(0, Math.min(DAEMON_MOV, path.length - 1) + 1), target: adjT(stop.x, stop.y) };
}
function actDaemons(ctx, s) {
  if (!s.daemons.length) return 0;
  const moves = [], attacks = [];
  for (const d of s.daemons.slice()) {
    if (!s.daemons.includes(d)) continue;
    const targets = prey(ctx, s);
    if (!targets.length) break;
    const r = stepDaemon(ctx, s, d, targets);
    if (r.to && (r.to.x !== d.x || r.to.y !== d.y)) {
      moves.push({ id: d.id, from: { x: d.x, y: d.y }, to: { ...r.to }, path: r.path, kind: d.kind });
      d.x = r.to.x; d.y = r.to.y;
      ctx.bump();
    }
    if (r.target && r.target.alive) {
      const dealt = ctx.damage(r.target, DAEMON_ATK);
      attacks.push({ id: d.id, x: d.x, y: d.y, target: r.target.id, dmg: dealt });
      ctx.log(`👹 ปีศาจโจมตี ${r.target.name} -${dealt}`);
    }
  }
  if (moves.length) ctx.fx("daemon_move", { moves });
  if (attacks.length) ctx.fx("daemon_attack", { attacks });
  return moves.length || attacks.length ? 1 : 0;
}
function hurtDaemon(ctx, s, d, n, by) {
  let left = n;
  const soak = Math.min(d.armor, left);
  d.armor -= soak; left -= soak;
  d.hp -= left;
  if (d.hp > 0) {
    ctx.fx("daemon_hit", { id: d.id, x: d.x, y: d.y, hp: d.hp, armor: d.armor });
    return false;
  }
  s.daemons = s.daemons.filter((o) => o !== d);
  ctx.bump();
  const got = by ? lazyShop().addGold(by, DAEMON_GOLD) : 0;
  ctx.fx("daemon_die", { id: d.id, x: d.x, y: d.y, kind: d.kind, by: by ? by.id : null });
  ctx.log(`💥 ${by ? by.name : "ใครบางคน"} กำจัดปีศาจ!${got ? ` ได้ ${got} เหรียญ` : ""}`);
  return true;
}
function strikeDmg(p) {
  const dummy = { id: "fd:daemon", name: "ปีศาจ", alive: true, hp: DAEMON_HP, armor: DAEMON_ARMOR, statuses: {}, statusAmt: {}, pos: p.pos };
  const n = lazyAttack().estimateAttackOn(p, dummy);
  return Math.max(1, Number.isFinite(n) ? Math.round(n) : 1);
}

// ============================================================ ฝนฟ้าคะนอง
function setWarn(ctx, s, turn) {
  s.warn = ctx.pick(ctx.floorTiles(), LIGHTNING_COUNT);
  s.warnFor = turn;
}
function strike(ctx, s) {
  const hitIds = new Set(), hits = [];
  for (const t of s.warn) {
    ctx.fx("lightning", { x: t.x, y: t.y });
    for (const p of bodies(ctx)) {
      if (hitIds.has(p.id) || !footOf(ctx, p).some((c) => c.x === t.x && c.y === t.y)) continue;
      hitIds.add(p.id);
      hits.push(p);
    }
    for (const d of s.daemons.slice()) if (d.x === t.x && d.y === t.y) hurtDaemon(ctx, s, d, LIGHTNING_DMG, null);
  }
  ctx.log(`⚡ ฟ้าผ่าลง ${s.warn.length} จุด`);
  for (const p of hits) {
    const dealt = ctx.damage(p, LIGHTNING_DMG);
    ctx.log(`⚡ ${p.name} โดนฟ้าผ่า -${dealt}`);
  }
  s.warn = null;
  return SECS.lightning;
}
function weatherStart(ctx, st) {
  const s = st && st.eos;
  if (s && stormOn(ctx) && !s.warn) setWarn(ctx, s, ctx.match.roundNumber + 2);
}

// ============================================================ ฝ่าย (โหมดทีม = ทีม · อื่นๆ = เจ้าของ — ระบบคู่นับเป็นฝ่ายเดียว)
function sideOf(p) {
  if (!p) return null;
  if (lazyLobby().teamModeActive() && p.teamId) return `t:${p.teamId}`;
  return `p:${lazyDuo().sideKey(p)}`;
}
function sideColor(ctx, side) {
  const p = Object.values(ctx.match.players).find((u) => !u.summon && sideOf(u) === side);
  try { return p ? lazyLobby().colorOf(p) : "#cccccc"; } catch { return "#cccccc"; }
}
function sideName(ctx, side) {
  const list = Object.values(ctx.match.players).filter((u) => !u.summon && !u.duoOf && sideOf(u) === side).map((u) => u.name);
  return list.join(" & ") || "?";
}

// ============================================================ เสายึดพื้นที่ (ร่ายพิธี 2 ตา)
const nextTo = (ctx, p, pl) => !!(p && p.pos) && ctx.Board.dist(ctx.action.boxOf(p), { x: pl.x, y: pl.y }) === 1;
function pillarNear(ctx, s, p) { return s.pillars.find((pl) => nextTo(ctx, p, pl)) || null; }
function breakChannel(ctx, pl) {
  const by = ctx.match.players[pl.ch.by];
  ctx.fx("seize_break", { id: pl.id, x: pl.x, y: pl.y, by: pl.ch.by });
  if (by) ctx.log(`💢 พิธียึดเสาของ ${by.name} แตก!`);
  pl.ch = null;
}
// พิธีแตก: คนร่ายตาย/ออกจากกระดาน/ไม่ติดเสาแล้ว/โดนดาเมจ (เลือด+เกราะลด)
function checkChannels(ctx, s) {
  for (const pl of s.pillars) {
    if (!pl.ch) continue;
    const p = ctx.match.players[pl.ch.by];
    if (!p || !p.alive || !p.pos || !nextTo(ctx, p, pl)) { breakChannel(ctx, pl); continue; }
    const now = markOf(p);
    if (now < pl.ch.mark) breakChannel(ctx, pl);
    else pl.ch.mark = now;
  }
}
function seizeState(ctx, s, p) {
  const pl = pillarNear(ctx, s, p);
  if (!pl) return null;
  const side = sideOf(p);
  if (pl.owner === side) return { pl, ok: false };
  if (pl.ch && pl.ch.by !== p.id) return { pl, ok: false };
  if (pl.ch && pl.ch.round >= ctx.match.roundNumber) return { pl, ok: false }; // ครั้งที่สองได้ตั้งแต่ตาถัดไป
  return { pl, ok: canStrike(ctx, p), second: !!pl.ch };
}
const ZONE_NAMES = { insomnia: "Insomnia", hammerhead: "Hammerhead", duscae: "Duscae", lake: "Cleigne", altissia: "Altissia" };
function seize(ctx, s, p) {
  checkChannels(ctx, s);
  const st0 = seizeState(ctx, s, p);
  if (!st0 || !st0.ok) return false;
  const pl = st0.pl;
  ctx.match.action.locked = true;
  if (!st0.second) {
    pl.ch = { by: p.id, side: sideOf(p), round: ctx.match.roundNumber, mark: markOf(p) };
    ctx.fx("seize_start", { id: pl.id, x: pl.x, y: pl.y, by: p.id, color: sideColor(ctx, sideOf(p)) });
    ctx.log(`🔷 ${p.name} เริ่มร่ายพิธียึดเสา ${ZONE_NAMES[pl.zone] || ""}`);
  } else {
    const was = pl.owner;
    pl.owner = pl.ch.side; pl.ch = null;
    ctx.fx("seize_done", { id: pl.id, x: pl.x, y: pl.y, by: p.id, from: was, color: sideColor(ctx, pl.owner) });
    ctx.log(`🔷 ${p.name} ยึดเสา ${ZONE_NAMES[pl.zone] || ""} ได้!`);
  }
  ctx.useStrike(p, SEIZE_SECS);
  return true;
}
// จบเทิร์น: ทุกฝ่ายได้แต้มตามจำนวนเสาที่ถือ → ถึง 20 = ชนะ (มากสุด · เท่ากัน = ถือเสามากกว่า)
function scoreRound(ctx, s) {
  const held = {};
  for (const pl of s.pillars) if (pl.owner) held[pl.owner] = (held[pl.owner] || 0) + 1;
  const gains = [];
  for (const [side, n] of Object.entries(held)) {
    const add = SCORE_TABLE[Math.min(n, SCORE_TABLE.length - 1)];
    s.scores[side] = (s.scores[side] || 0) + add;
    gains.push({ side, add, total: s.scores[side], color: sideColor(ctx, side) });
  }
  if (gains.length) ctx.fx("score", { gains });
  const top = Object.entries(s.scores).filter(([, v]) => v >= SCORE_GOAL)
    .sort((a, b) => b[1] - a[1] || (held[b[0]] || 0) - (held[a[0]] || 0));
  if (top.length && !s.winner) {
    s.winner = top[0][0];
    ctx.log(`🏆 ${sideName(ctx, s.winner)} ได้ครบ ${SCORE_GOAL} แต้ม!`);
  }
}
// ผู้ชนะ → id ผู้เล่นของฝ่ายนั้น (phases/endTurn.js gameOver → forcedWinnerId)
function winner(ctx, st) {
  const s = st && st.eos;
  if (!s || !s.winner) return null;
  const p = Object.values(ctx.match.players).find((u) => !u.summon && !u.duoOf && sideOf(u) === s.winner);
  return p ? p.id : null;
}

// ============================================================ ตายแล้วฟื้น (หลัง 3 เทิร์น — จุดเกิดที่ไกลศัตรูสุด)
function noteDeaths(ctx, s) {
  for (const p of Object.values(ctx.match.players)) {
    if (p.summon || p.alive) { delete s.dead[p.id]; continue; }
    if (s.dead[p.id] == null) {
      s.dead[p.id] = ctx.match.roundNumber;
      ctx.log(`🕯️ ${p.name} ล้มลง — ฟื้นในอีก ${REVIVE_TURNS} เทิร์น`);
    }
  }
}
function reviveSpot(ctx, s, p) {
  const map = ctx.map(), side = sideOf(p);
  const foes = bodies(ctx).filter((u) => sideOf(u) !== side);
  const list = (map.spawns || []).map((sp) => ({ x: sp.x, y: sp.y, d: foes.length ? Math.min(...foes.map((u) => manhattan(u.pos, sp))) : 0 }))
    .sort((a, b) => b.d - a.d);
  for (const sp of list) {
    const spot = tileFree(ctx, s, sp.x, sp.y, p.id) ? { x: sp.x, y: sp.y } : freeNear(ctx, s, sp.x, sp.y, 3, p.id);
    if (spot) return spot;
  }
  return null;
}
function reviveDue(ctx, s) {
  const turn = ctx.match.roundNumber + 1, back = [];
  for (const [pid, r] of Object.entries(s.dead)) {
    const p = ctx.match.players[pid];
    if (!p || p.alive || p.summon || turn < r + REVIVE_TURNS) continue;
    const spot = reviveSpot(ctx, s, p);
    if (!spot) continue;
    p.alive = true; p.result = null; p.locked = false;
    p.statuses = {}; p.statusAmt = {};
    p.shield = 0; p.tempHp = 0; p.tempHpTurns = 0; p.mountId = null; p.wasAttacked = false; p.corpseKeeper = null;
    p.corpse = null;
    p.boardSize = 1;
    p.hp = ctx.combat.maxHpOf(p);
    p.armor = ctx.combat.maxArmorOf(p);
    p.pos = spot;
    delete s.dead[pid];
    back.push({ id: p.id, x: spot.x, y: spot.y });
    ctx.log(`✨ ${p.name} ฟื้นคืนชีพ!`);
  }
  if (back.length) { ctx.bump(); ctx.fx("revive", { list: back }); }
  return back.length;
}

// ============================================================ การมองเห็นผู้เล่นอื่น (ระยะเดิน + 4 ช่อง · ไม่ใช่หมอก)
const SIGHT_CACHE = new WeakMap();
function sightOf(ctx, map, u) {
  const at = anchorOf(ctx, u);
  if (!at) return null;
  const size = sizeOf(ctx, u), mov = Math.max(0, ctx.action.movOf(u) | 0), ghost = !!ctx.action.walksThrough(u);
  const key = `${at.x},${at.y},${size},${mov},${ghost ? 1 : 0}`;
  let per = SIGHT_CACHE.get(map);
  if (!per) { per = new Map(); SIGHT_CACHE.set(map, per); }
  if (per.has(key)) return per.get(key);
  const dist = new Map(), queue = [];
  const seed = (x, y) => { const k = K(x, y); if (!dist.has(k)) { dist.set(k, 0); queue.push([x, y]); } };
  const reach = ctx.Board.reachable(map, { id: "_eossight", x: at.x, y: at.y, size, alive: true }, mov, [], { ghost });
  for (const n of reach.values()) for (const t of ctx.Board.footprint(n.x, n.y, size)) seed(t.x, t.y);
  for (const t of ctx.Board.footprint(at.x, at.y, size)) seed(t.x, t.y);
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i], d = dist.get(K(x, y));
    if (d >= SIGHT_EXTRA) continue;
    for (const [dx, dy] of ctx.Board.DIRS) {
      const nx = x + dx, ny = y + dy, k = K(nx, ny);
      if (dist.has(k) || !ctx.Board.inBounds(map, nx, ny)) continue;
      dist.set(k, d + 1); queue.push([nx, ny]);
    }
  }
  const set = new Set(dist.keys());
  if (per.size > 256) per.clear();
  per.set(key, set);
  return set;
}
function sideSight(ctx, viewer) {
  if (!viewer || ctx.match.gameState === "GAMEOVER") return null;
  const me = ctx.match.players[viewer.id] || viewer, side = sideOf(me);
  const eyes = bodies(ctx).filter((u) => u.id === me.id || sideOf(u) === side);
  if (!eyes.length) return null; // ล้มอยู่ = ดูได้ทั้งแผนที่
  const map = ctx.map(), set = new Set();
  for (const u of eyes) { const v = sightOf(ctx, map, u); if (v) for (const k of v) set.add(k); }
  return set;
}

// ============================================================ ขั้น 2: ลูกเล่นปั่นป่วน (L6–L10 · ผู้ใช้สั่ง 2026-11-09 — ตัวเลขเป็นข้อเสนอของ Claude)
//  ทุกปุ่มใช้ "การตีของตา" (แบบคันโยกเรือของ Fodlan ด่าน I) · ยืนติดของนั้น 4 ทิศ
const DOME_TURNS = 3;          // L7 โดมอยู่ 3 เทิร์น
const DOME_COOLDOWN = 2;       // ปิดแล้วพัก 2 เทิร์นก่อนเปิดใหม่
const GYSAHL_RANGE = 4;        // L9 โยนล่อโชโกโบะของศัตรูในระยะนี้
const LEVER_SECS = 1.4, DOME_SECS = 1.6, SWITCH_SECS = 1.2, PUSH_SECS = 1.0;
const listOf = (obj, kind) => ((obj && obj[kind]) || []).map(([x, y]) => ({ x, y }));
const BRIDGES = listOf(MAP.map.special, "fd_eos_bridge");
const LEVER = listOf(MAP.map.terrain, "fd_eos_lever")[0] || null;
const DOME_CORE = listOf(MAP.map.terrain, "fd_eos_domecore")[0] || null;
const SOLID = new Set(Object.values(MAP.map.terrain).flat().map(([x, y]) => K(x, y)));
const INSOMNIA = (MAP.ZONES.find((z) => z.id === "insomnia") || { rect: [8, 0, 23, 8] }).rect;
// ประตูของนครหลวง = ช่องเดินได้บนขอบกรอบเมือง (ยกเว้นขอบกระดาน)
const DOME_GATES = (() => {
  const [x0, y0, x1, y1] = INSOMNIA, out = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const edge = x === x0 || x === x1 || y === y1 || (y === y0 && y0 > 0);
    if (edge && !SOLID.has(K(x, y))) out.push({ x, y });
  }
  return out;
})();
const inDome = (x, y) => inRect(INSOMNIA, x, y);
function domeOn(s) { return !!(s && s.dome && s.dome.left > 0); }
// ไฟเมืองดับ = ปีศาจเข้าได้
function lit(s, zoneId) { return !(s && s.lightsOff && s.lightsOff[zoneId]); }
function townOf(x, y) { const z = TOWNS.find((t) => inRect(t.rect, x, y)); return z ? z.id : null; }
function blockedTown(s, x, y) { const z = townOf(x, y); return !!z && lit(s, z); }

// ---------- L6 สะพานยก ----------
function bridgeOccupied(ctx) {
  const keys = new Set(BRIDGES.map((t) => K(t.x, t.y)));
  return bodies(ctx).some((p) => footOf(ctx, p).some((c) => keys.has(K(c.x, c.y))));
}
function pullLever(ctx, s, p) {
  if (!LEVER || !ctx.adjacent(p, LEVER.x, LEVER.y) || !canStrike(ctx, p) || bridgeOccupied(ctx)) return false;
  s.bridgeUp = !s.bridgeUp;
  ctx.match.action.locked = true;
  ctx.bump();
  ctx.fx("bridge", { up: s.bridgeUp, x: LEVER.x, y: LEVER.y, tiles: BRIDGES.map((t) => ({ ...t })), by: p.id });
  ctx.log(`🌉 ${p.name} ${s.bridgeUp ? "ยกสะพาน Altissia ขึ้น" : "ลดสะพาน Altissia ลง"}`);
  ctx.useStrike(p, LEVER_SECS);
  return true;
}
// ---------- L7 โดมกำแพงเวท ----------
function domeReady(ctx, s) { return !domeOn(s) && ctx.match.roundNumber >= (s.domeReadyRound || 0); }
function raiseDome(ctx, s, p) {
  if (!DOME_CORE || !ctx.adjacent(p, DOME_CORE.x, DOME_CORE.y) || !canStrike(ctx, p) || !domeReady(ctx, s)) return false;
  const gateKeys = new Set(DOME_GATES.map((t) => K(t.x, t.y)));
  if (bodies(ctx).some((u) => footOf(ctx, u).some((c) => gateKeys.has(K(c.x, c.y))))) return false; // มีคนยืนขวางประตู
  s.dome = { left: DOME_TURNS, by: p.id };
  ctx.match.action.locked = true;
  ctx.bump();
  ctx.fx("dome_on", { rect: INSOMNIA, gates: DOME_GATES.map((t) => ({ ...t })), by: p.id });
  ctx.log(`🛡️ ${p.name} เปิดโดมกำแพงเวทของ Insomnia (${DOME_TURNS} เทิร์น)`);
  ctx.useStrike(p, DOME_SECS);
  return true;
}
function tickDome(ctx, s) {
  if (!domeOn(s)) return;
  s.dome.left -= 1;
  if (s.dome.left > 0) return;
  s.dome = null;
  s.domeReadyRound = ctx.match.roundNumber + DOME_COOLDOWN;
  ctx.bump();
  ctx.fx("dome_off", { rect: INSOMNIA });
  ctx.log("🛡️ โดมกำแพงเวทของ Insomnia สลายไป");
}
// ตีจากนอกโดมเข้าไปในโดมไม่ได้ (ตีปกติ + สกิลเป้าเดียว)
function shields(ctx, st, attacker, target) {
  const s = st && st.eos;
  if (!domeOn(s) || !attacker || !attacker.pos || !target || !target.pos) return false;
  const tIn = footOf(ctx, target).some((c) => inDome(c.x, c.y));
  const aIn = footOf(ctx, attacker).some((c) => inDome(c.x, c.y));
  return tIn && !aIn;
}
// ---------- L8 แผงไฟเมือง ----------
function switchNear(ctx, p) { return MAP.SWITCHES.find((sw) => ctx.adjacent(p, sw.at[0], sw.at[1])) || null; }
function flipLights(ctx, s, p) {
  const sw = switchNear(ctx, p);
  if (!sw || !canStrike(ctx, p)) return false;
  s.lightsOff = s.lightsOff || {};
  s.lightsOff[sw.zone] = !s.lightsOff[sw.zone];
  ctx.match.action.locked = true;
  ctx.fx("lights", { zone: sw.zone, off: s.lightsOff[sw.zone], x: sw.at[0], y: sw.at[1], by: p.id });
  ctx.log(`💡 ${p.name} ${s.lightsOff[sw.zone] ? "ดับไฟ" : "เปิดไฟ"}เมือง ${ZONE_NAMES[sw.zone] || sw.zone}`);
  ctx.useStrike(p, SWITCH_SECS);
  return true;
}
// ---------- L9 ผักกิซาล (ไอเทม — server/shop.js) ----------
function gysahlOnSale() {
  const F = require("../fodlan");
  return !!(F.active() && F.isEos() && F.stageState() && F.stageState().eos);
}
// ใช้จากกระเป๋า: ศัตรูขี่โชโกโบะในระยะ = โยนล่อให้นกวิ่งหนี (คนขี่ตกนก) · ไม่มี = เรียกโชโกโบะว่างตัวใกล้สุดมาข้างตัว · ทำไม่ได้ = ไม่เสียของ
function useGysahl(p) {
  if (!p || !p.alive || !p.pos || !gysahlOnSale()) return false;
  const F = require("../fodlan");
  const ctx = F.makeCtx(), s = F.stageState().eos, side = sideOf(p);
  const foes = Object.keys(s.riders).map((id) => ctx.match.players[id])
    .filter((u) => u && u.alive && u.pos && sideOf(u) !== side && manhattan(u.pos, p.pos) <= GYSAHL_RANGE)
    .sort((a, b) => manhattan(a.pos, p.pos) - manhattan(b.pos, p.pos));
  if (foes.length) {
    const u = foes[0], c = unride(ctx, s, u.id);
    if (c) {
      const spot = freeNear(ctx, s, u.pos.x + Math.sign(u.pos.x - p.pos.x) * 2, u.pos.y + Math.sign(u.pos.y - p.pos.y) * 2, 3, null);
      if (spot) { c.x = spot.x; c.y = spot.y; c.rider = null; } else sendHome(ctx, s, c, { ...u.pos });
      ctx.bump();
      ctx.fx("gysahl_lure", { from: { ...p.pos }, at: { ...u.pos }, to: spot || null, id: u.id, by: p.id });
      ctx.log(`🥬 ${p.name} โยนผักกิซาล — โชโกโบะของ ${u.name} วิ่งไล่ผักไป!`);
      p.exposedRound = ctx.match.roundNumber;
      return true;
    }
  }
  if (riding(s, p)) return false;
  const free = s.chocos.filter((c) => c.x != null && !c.rider).sort((a, b) => manhattan(a, p.pos) - manhattan(b, p.pos));
  const spot = dismountTiles(ctx, s, p)[0];
  if (!free.length || !spot) return false;
  const c = free[0], from = { x: c.x, y: c.y };
  c.x = spot.x; c.y = spot.y;
  ctx.bump();
  ctx.fx("gysahl_call", { from, to: { ...spot }, by: p.id });
  ctx.log(`🥬 ${p.name} ใช้ผักกิซาล — โชโกโบะวิ่งมาหา`);
  return true;
}
// ---------- L10 ซากรถ (ผลักได้) ----------
function wreckNear(ctx, s, p) { return (s.wrecks || []).filter((w) => ctx.adjacent(p, w.x, w.y)); }
function pushTo(ctx, s, p, w) {
  const dx = Math.sign(w.x - p.pos.x), dy = Math.sign(w.y - p.pos.y);
  if (Math.abs(dx) + Math.abs(dy) !== 1) return null;
  const to = { x: w.x + dx, y: w.y + dy };
  if (!tileFree(ctx, s, to.x, to.y) || (s.wrecks || []).some((o) => o.x === to.x && o.y === to.y)) return null;
  return to;
}
function pushWreck(ctx, s, p) {
  if (!canStrike(ctx, p)) return false;
  const w = wreckNear(ctx, s, p).find((o) => pushTo(ctx, s, p, o));
  if (!w) return false;
  const from = { x: w.x, y: w.y }, to = pushTo(ctx, s, p, w);
  w.x = to.x; w.y = to.y;
  ctx.match.action.locked = true;
  ctx.bump();
  ctx.fx("wreck_push", { id: w.id, from, to: { ...to }, by: p.id });
  ctx.log(`🚙 ${p.name} ผลักซากรถ`);
  ctx.useStrike(p, PUSH_SECS);
  return true;
}

// ============================================================ ขั้น 3: ลูกเล่นโจมตี (L11–L15 · ผู้ใช้สั่ง "ทำขั้น 3 ต่อ" — ตัวเลขเป็นข้อเสนอของ Claude)
const BARREL_DMG = 2, BARREL_BURN = 2, BARREL_RESPAWN = 4;
const CRYSTAL_RESPAWN = 5, FLASK_MAX = 2, FLASK_RANGE = 5;
const FIRE_DMG = 1, FIRE_BURN = 2, THUNDER_DMG = 2, SHOCK_DMG = 2;
const TURRET_RANGE = 6, TURRET_DMG = 2;
const BEAST = { hp: 12, armor: 2, atk: 3, mov: 3, gold: 6, aggroTurns: 2, respawn: 6, wander: 2, reach: 2 };
const MAGITEK = { hp: 4, armor: 1, atk: 2, mov: 3, gold: 2, count: 3, stay: 4 };
const DROP_FROM = 4, DROP_PCT = 30, DROP_GAP = 6;
const ELEMENTS = ["fire", "ice", "thunder"];
const ELEMENT_NAMES = { fire: "ไฟ", ice: "น้ำแข็ง", thunder: "สายฟ้า" };
const FLASK_SECS = 1.4, TURRET_SECS = 1.2;
const TURRETS = listOf(MAP.map.terrain, "fd_eos_turret");
const WATERY = new Set([...listOf(MAP.map.terrain, "fd_eos_water"), ...listOf(MAP.map.terrain, "fd_eos_canal"), ...listOf(MAP.map.special, "fd_eos_shallow")].map((t) => K(t.x, t.y)));
const FOREST = new Set(listOf(MAP.map.special, "fd_eos_forest").map((t) => K(t.x, t.y)));
const lazyIce = () => require("../ice");
const area3 = (x, y) => { const out = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) out.push({ x: x + dx, y: y + dy }); return out; };
const unitsOn = (ctx, tiles) => { const keys = new Set(tiles.map((t) => K(t.x, t.y))); return bodies(ctx).filter((p) => footOf(ctx, p).some((c) => keys.has(K(c.x, c.y)))); };
function hitArea(ctx, s, tiles, dmg, by, extra = null) {
  const hits = [];
  for (const p of unitsOn(ctx, tiles)) {
    const dealt = ctx.damage(p, dmg);
    if (extra) extra(p);
    hits.push({ id: p.id, dmg: dealt });
  }
  const keys = new Set(tiles.map((t) => K(t.x, t.y)));
  for (const d of s.daemons.slice()) if (keys.has(K(d.x, d.y))) hurtDaemon(ctx, s, d, dmg, by);
  for (const m of s.mobs.slice()) if (keys.has(K(m.x, m.y))) hurtMob(ctx, s, m, dmg, by);
  return hits;
}

// ---------- L11 ถังน้ำมัน (ตีแล้วระเบิด 3×3 · ลูกโซ่) ----------
function explodeBarrel(ctx, s, b, by, chain = new Set()) {
  if (chain.has(b.id)) return [];
  chain.add(b.id);
  s.barrels = s.barrels.filter((o) => o !== b);
  s.barrelBack.push({ at: b.home, round: ctx.match.roundNumber + BARREL_RESPAWN });
  const tiles = area3(b.x, b.y).filter((t) => ctx.Board.inBounds(ctx.map(), t.x, t.y));
  ctx.bump();
  const hits = hitArea(ctx, s, tiles, BARREL_DMG, by, (p) => ctx.burn(p, BARREL_BURN));
  ctx.fx("barrel_boom", { x: b.x, y: b.y, tiles, hits });
  ctx.log(`💥 ถังน้ำมันระเบิด!${hits.length ? ` โดน ${hits.length} คน` : ""}`);
  const keys = new Set(tiles.map((t) => K(t.x, t.y)));
  for (const o of s.barrels.slice()) if (keys.has(K(o.x, o.y))) explodeBarrel(ctx, s, o, by, chain);
  return hits;
}
// ---------- L12 หินพลังเวท → ขวดเวท ----------
function flasksOf(s, p) { return (s.flasks[p.id] ||= []); }
function breakCrystal(ctx, s, c, p) {
  s.crystals = s.crystals.filter((o) => o !== c);
  s.crystalBack.push({ at: c.home, round: ctx.match.roundNumber + CRYSTAL_RESPAWN });
  ctx.bump();
  const bag = flasksOf(s, p);
  if (bag.length < FLASK_MAX) bag.push(c.element);
  ctx.fx("crystal_break", { x: c.x, y: c.y, element: c.element, by: p.id });
  ctx.log(`💎 ${p.name} ได้ขวดเวท${ELEMENT_NAMES[c.element]}`);
}
function flaskTiles(ctx, p) {
  const map = ctx.map(), out = [];
  for (let dy = -FLASK_RANGE; dy <= FLASK_RANGE; dy++) for (let dx = -FLASK_RANGE; dx <= FLASK_RANGE; dx++) {
    if (Math.abs(dx) + Math.abs(dy) > FLASK_RANGE) continue;
    const x = p.pos.x + dx, y = p.pos.y + dy;
    if (ctx.Board.inBounds(map, x, y)) out.push({ x, y });
  }
  return out;
}
// ผืนน้ำที่ต่อกันจากช่องในวง (สายฟ้าลงน้ำ = ช็อตทั้งผืน)
function waterBody(ctx, tiles) {
  const b = ctx.match.board || {};
  const wet = (x, y) => WATERY.has(K(x, y)) || !!(b.wet && b.wet[K(x, y)]);
  const seen = new Set(), q = [];
  for (const t of tiles) if (wet(t.x, t.y)) { seen.add(K(t.x, t.y)); q.push(t); }
  for (let i = 0; i < q.length; i++) for (const [dx, dy] of ctx.Board.DIRS) {
    const x = q[i].x + dx, y = q[i].y + dy, k = K(x, y);
    if (!seen.has(k) && wet(x, y)) { seen.add(k); q.push({ x, y }); }
  }
  return q;
}
function throwFlask(ctx, s, p, element, tile) {
  const bag = flasksOf(s, p), i = bag.indexOf(element);
  if (i < 0 || !canStrike(ctx, p) || !tile || !flaskTiles(ctx, p).some((t) => t.x === tile.x && t.y === tile.y)) return false;
  bag.splice(i, 1);
  const map = ctx.map();
  const tiles = area3(tile.x, tile.y).filter((t) => ctx.Board.inBounds(map, t.x, t.y));
  let hits = [], shock = null;
  if (element === "fire") {
    hits = hitArea(ctx, s, tiles, FIRE_DMG, p, (u) => ctx.burn(u, FIRE_BURN));
    // ไฟลามป่า: ช่องป่าในวง + ป่าที่ติดกัน 1 ช่อง
    const burn = new Set(tiles.map((t) => K(t.x, t.y)));
    for (const t of tiles) if (FOREST.has(K(t.x, t.y))) for (const [dx, dy] of ctx.Board.DIRS) if (FOREST.has(K(t.x + dx, t.y + dy))) burn.add(K(t.x + dx, t.y + dy));
    try { lazyIce().layFlame([...burn].map((k) => { const [x, y] = k.split(",").map(Number); return { x, y }; }), p.id); } catch { /* ไม่มีพื้นไฟ */ }
  } else if (element === "ice") {
    hits = unitsOn(ctx, tiles).map((u) => { lazyIce().applySlow(u); return { id: u.id, dmg: 0 }; });
    for (const t of tiles) if (WATERY.has(K(t.x, t.y))) { try { lazyIce().layIce(t.x, t.y, p.id, { bridge: true }); } catch { /* วางไม่ได้ */ } }
    ctx.bump();
  } else {
    hits = hitArea(ctx, s, tiles, THUNDER_DMG, p);
    const body = waterBody(ctx, tiles);
    if (body.length) {
      shock = body;
      const already = new Set(hits.map((h) => h.id));
      for (const u of unitsOn(ctx, body)) if (!already.has(u.id) && !ctx.action.walksThrough(u)) hits.push({ id: u.id, dmg: ctx.damage(u, SHOCK_DMG), shock: true });
    }
  }
  ctx.match.action.locked = true;
  p.exposedRound = ctx.match.roundNumber;
  ctx.fx("flask", { element, from: { ...p.pos }, to: { ...tile }, tiles, shock, hits, by: p.id });
  ctx.log(`🧪 ${p.name} ขว้างขวดเวท${ELEMENT_NAMES[element]}${hits.length ? ` โดน ${hits.length} คน` : ""}`);
  ctx.useStrike(p, FLASK_SECS);
  return true;
}
// ---------- L13 ป้อมปืนบนกำแพง Insomnia ----------
function turretNear(ctx, p) { return TURRETS.find((t) => ctx.adjacent(p, t.x, t.y)) || null; }
function turretTargets(ctx, s, p, t) {
  const me = sideOf(p);
  return bodies(ctx).filter((u) => sideOf(u) !== me && manhattan(u.pos, t) <= TURRET_RANGE && !ctx.Visibility.hiddenFromUnit(p, u)).map((u) => ({ x: u.pos.x, y: u.pos.y }));
}
function fireTurret(ctx, s, p, tile) {
  const t = turretNear(ctx, p);
  if (!t || !canStrike(ctx, p) || !tile) return false;
  const target = bodies(ctx).find((u) => u.pos.x === tile.x && u.pos.y === tile.y);
  if (!target || !turretTargets(ctx, s, p, t).some((c) => c.x === tile.x && c.y === tile.y)) return false;
  const dealt = ctx.damage(target, TURRET_DMG);
  ctx.match.action.locked = true;
  p.exposedRound = ctx.match.roundNumber;
  ctx.fx("turret_shot", { from: { x: t.x, y: t.y }, to: { ...tile }, target: target.id, dmg: dealt, by: p.id });
  ctx.log(`🔫 ${p.name} ยิงป้อมปืนใส่ ${target.name} -${dealt}`);
  ctx.useStrike(p, TURRET_SECS);
  return true;
}
// ---------- L14 สัตว์ยักษ์ + L15 ทหารเหล็ก (ศัตรู AI ตัวเดียวกัน — s.mobs) ----------
function hurtMob(ctx, s, m, n, by) {
  let left = n;
  const soak = Math.min(m.armor, left);
  m.armor -= soak; left -= soak;
  m.hp -= left;
  if (by && m.type === "beast") { m.aggro = by.id; m.aggroUntil = ctx.match.roundNumber + BEAST.aggroTurns; }
  if (m.hp > 0) { ctx.fx("mob_hit", { id: m.id, x: m.x, y: m.y, hp: m.hp }); return false; }
  s.mobs = s.mobs.filter((o) => o !== m);
  ctx.bump();
  const gold = m.type === "beast" ? BEAST.gold : MAGITEK.gold;
  const got = by ? lazyShop().addGold(by, gold) : 0;
  if (m.type === "beast") s.beastBack = ctx.match.roundNumber + BEAST.respawn;
  ctx.fx("mob_die", { id: m.id, type: m.type, x: m.x, y: m.y, by: by ? by.id : null });
  ctx.log(`💥 ${by ? by.name : "ใครบางคน"} โค่น${m.type === "beast" ? "สัตว์ยักษ์" : "ทหารเหล็ก"}!${got ? ` ได้ ${got} เหรียญ` : ""}`);
  return true;
}
function spawnBeast(ctx, s) {
  const [hx, hy] = MAP.BEAST_HOME;
  const at = freeNear(ctx, s, hx, hy, 4);
  if (!at) return false;
  s.mobs.push({ id: `fd:mob${++s.seq}`, type: "beast", x: at.x, y: at.y, hp: BEAST.hp, armor: BEAST.armor, aggro: null, aggroUntil: 0, home: { x: hx, y: hy } });
  s.beastBack = 0;
  ctx.bump();
  ctx.fx("beast_roar", { x: at.x, y: at.y });
  return true;
}
// ก้าวไปหาช่องติดเป้า (BFS ช่องว่าง) ไม่เกิน mov — เป้า = รายการผู้เล่น
function stepMob(ctx, s, m, targets, mov) {
  const adjT = (x, y) => targets.find((p) => footOf(ctx, p).some((t) => manhattan(t, { x, y }) === 1)) || null;
  const here = adjT(m.x, m.y);
  if (here) return { to: null, path: null, target: here };
  const start = { x: m.x, y: m.y, prev: null }, seen = new Set([K(m.x, m.y)]), q = [start];
  let goal = null;
  for (let i = 0; i < q.length && !goal; i++) for (const [dx, dy] of ctx.Board.DIRS) {
    const x = q[i].x + dx, y = q[i].y + dy, k = K(x, y);
    if (seen.has(k) || !ctx.Board.inBounds(ctx.map(), x, y) || !tileFree(ctx, s, x, y) || (m.type === "magitek" && blockedTown(s, x, y))) continue;
    seen.add(k);
    const node = { x, y, prev: q[i] };
    if (adjT(x, y)) { goal = node; break; }
    q.push(node);
  }
  if (!goal) return { to: null, path: null, target: null };
  const path = [];
  for (let c = goal; c; c = c.prev) path.unshift({ x: c.x, y: c.y });
  const n = Math.min(mov, path.length - 1);
  return { to: path[n], path: path.slice(0, n + 1), target: adjT(path[n].x, path[n].y) };
}
function actMobs(ctx, s) {
  if (!s.mobs.length) return 0;
  const moves = [], attacks = [];
  const round = ctx.match.roundNumber + 1;
  for (const m of s.mobs.slice()) {
    if (!s.mobs.includes(m)) continue;
    const all = bodies(ctx).filter((p) => !ctx.action.walksThrough(p));
    let targets, mov;
    if (m.type === "beast") {
      const agg = m.aggro && round <= m.aggroUntil + 1 ? ctx.match.players[m.aggro] : null;
      if (agg && agg.alive && agg.pos) { targets = [agg]; mov = BEAST.mov; }
      else {
        m.aggro = null;
        targets = all.filter((p) => manhattan(p.pos, m) <= BEAST.reach); // ใครเข้าใกล้ = โดน
        mov = targets.length ? 1 : 0;
      }
    } else { targets = all.filter((p) => !footOf(ctx, p).some((t) => blockedTown(s, t.x, t.y))); mov = MAGITEK.mov; }
    if (!targets.length) continue;
    const r = stepMob(ctx, s, m, targets, mov);
    if (r.to && (r.to.x !== m.x || r.to.y !== m.y)) {
      moves.push({ id: m.id, type: m.type, from: { x: m.x, y: m.y }, to: { ...r.to }, path: r.path });
      m.x = r.to.x; m.y = r.to.y;
      ctx.bump();
    }
    // สัตว์ยักษ์ตีทุกคนที่ติดตัว (ล่อมาชนคนอื่นได้) · ทหารเหล็กตีเป้าตัวเดียว
    const victims = m.type === "beast" ? all.filter((p) => footOf(ctx, p).some((t) => manhattan(t, m) === 1)) : r.target ? [r.target] : [];
    const atk = m.type === "beast" ? BEAST.atk : MAGITEK.atk;
    for (const v of victims) {
      if (!v.alive) continue;
      const dealt = ctx.damage(v, atk);
      attacks.push({ id: m.id, type: m.type, x: m.x, y: m.y, target: v.id, dmg: dealt });
      ctx.log(`${m.type === "beast" ? "🐗 สัตว์ยักษ์" : "🤖 ทหารเหล็ก"}โจมตี ${v.name} -${dealt}`);
    }
  }
  if (moves.length) ctx.fx("mob_move", { moves });
  if (attacks.length) ctx.fx("mob_attack", { attacks });
  return moves.length || attacks.length ? 1 : 0;
}
// ยานลงจอด: สุ่ม (ไม่มียานอยู่ · พักครบ) → เตือนช่อง 2×2 → ต้นเทิร์นถัดไปลงจอด ปล่อยทหารเหล็ก 3 ตัว → ครบ 4 เทิร์นทหารที่เหลือขึ้นยานกลับ
function dropZone(ctx, s) {
  const map = ctx.map(), cand = [];
  for (let y = 1; y < map.rows - 2; y++) for (let x = 1; x < map.cols - 2; x++) {
    const cells = [{ x, y }, { x: x + 1, y }, { x, y: y + 1 }, { x: x + 1, y: y + 1 }];
    if (cells.some((c) => townOf(c.x, c.y) || !tileFree(ctx, s, c.x, c.y))) continue;
    if (bodies(ctx).some((p) => manhattan(p.pos, { x, y }) < 4)) continue;
    cand.push({ x, y });
  }
  return ctx.pick(cand, 1)[0] || null;
}
function dropshipTurn(ctx, s, turn) {
  let secs = 0;
  const d = s.dropship;
  if (d && d.state === "warn" && turn >= d.landAt) {
    const spawned = [];
    for (const c of [{ x: d.x, y: d.y }, { x: d.x + 1, y: d.y }, { x: d.x, y: d.y + 1 }, { x: d.x + 1, y: d.y + 1 }]) {
      if (spawned.length >= MAGITEK.count) break;
      const at = tileFree(ctx, s, c.x, c.y) ? c : freeNear(ctx, s, c.x, c.y, 2);
      if (!at) continue;
      const m = { id: `fd:mob${++s.seq}`, type: "magitek", x: at.x, y: at.y, hp: MAGITEK.hp, armor: MAGITEK.armor, aggro: null, ship: true };
      s.mobs.push(m); spawned.push({ id: m.id, x: m.x, y: m.y });
    }
    d.state = "landed"; d.leaveAt = turn + MAGITEK.stay;
    s.warn = (s.warn || []).filter((w) => w.kind !== "dropship");
    ctx.bump();
    ctx.fx("dropship_land", { x: d.x, y: d.y, spawned });
    ctx.log(`🛸 ยานจักรวรรดิลงจอด — ทหารเหล็ก ${spawned.length} ตัว!`);
    secs = SECS.dropship;
  } else if (d && d.state === "landed" && turn >= d.leaveAt) {
    s.mobs = s.mobs.filter((m) => !(m.type === "magitek" && m.ship));
    s.dropship = null;
    s.dropNext = turn + DROP_GAP;
    ctx.bump();
    ctx.fx("dropship_leave", { x: d.x, y: d.y });
    ctx.log("🛸 ยานจักรวรรดิถอนกำลังกลับ");
  } else if (!d && turn >= Math.max(DROP_FROM, s.dropNext || 0) && ctx.rng() * 100 < DROP_PCT) {
    const z = dropZone(ctx, s);
    if (z) {
      s.dropship = { x: z.x, y: z.y, state: "warn", landAt: turn + 1 };
      ctx.fx("dropship_warn", { x: z.x, y: z.y });
      ctx.log("🚨 ยานจักรวรรดิกำลังจะลงจอด!");
    }
  }
  return secs;
}
function respawnProps(ctx, s) {
  const round = ctx.match.roundNumber + 1;
  let changed = false;
  s.barrelBack = s.barrelBack.filter((r) => {
    if (round < r.round) return true;
    if (!tileFree(ctx, s, r.at.x, r.at.y)) return true;
    s.barrels.push({ id: `fd:barrel${++s.seq}`, x: r.at.x, y: r.at.y, home: r.at }); changed = true; return false;
  });
  s.crystalBack = s.crystalBack.filter((r) => {
    if (round < r.round) return true;
    if (!tileFree(ctx, s, r.at.x, r.at.y)) return true;
    s.crystals.push({ id: `fd:crystal${++s.seq}`, x: r.at.x, y: r.at.y, home: r.at, element: ELEMENTS[Math.floor(ctx.rng() * 3) % 3] }); changed = true; return false;
  });
  if (!s.mobs.some((m) => m.type === "beast") && s.beastBack && round >= s.beastBack) changed = spawnBeast(ctx, s) || changed;
  if (changed) ctx.bump();
}

// ============================================================ ต้นเทิร์น / จบตา / จบเทิร์น
function preRound(ctx, st) {
  const s = st && st.eos;
  if (!s) return 0;
  checkRiders(ctx, s);
  checkChannels(ctx, s);
  noteDeaths(ctx, s);
  const turn = ctx.match.roundNumber + 1;
  let secs = 0;
  if (reviveDue(ctx, s)) secs = Math.max(secs, SECS.revive);
  if (s.warn && s.warnFor <= turn) secs = Math.max(secs, strike(ctx, s));
  if (stormOn(ctx) && !s.warn) setWarn(ctx, s, turn + 1);
  const night = nightAt(ctx, turn);
  if (night && !s.night) secs = Math.max(secs, spawnDaemons(ctx, s) ? SECS.daemonSpawn : 0);
  else if (night && s.daemons.length) secs = Math.max(secs, actDaemons(ctx, s) ? SECS.daemonAct : 0);
  else if (!night && s.night) secs = Math.max(secs, dissolveDaemons(ctx, s) ? SECS.dawn : 0);
  // เกิดซ้ำทุกเทิร์นกลางคืน (หลังตัวเดิมเดินแล้ว) จนครบ DAEMON_COUNT
  if (night && s.night && s.daemons.length < DAEMON_COUNT) secs = Math.max(secs, spawnDaemons(ctx, s, Math.min(DAEMON_REFILL, DAEMON_COUNT - s.daemons.length)) ? SECS.daemonSpawn : 0);
  s.night = night;
  respawnProps(ctx, s);
  secs = Math.max(secs, dropshipTurn(ctx, s, turn));
  if (actMobs(ctx, s)) secs = Math.max(secs, SECS.mobs);
  checkChannels(ctx, s);
  checkRiders(ctx, s); // ปีศาจ/ฟ้าผ่า/ศัตรูตีคนขี่ = ตกนก
  respawnChocos(ctx, s);
  return secs;
}
function onUnitEnd(ctx, st, p) {
  const s = st && st.eos;
  if (!s) return;
  checkRiders(ctx, s);
  checkChannels(ctx, s);
  noteDeaths(ctx, s);
  syncCars(ctx, s);
  if (!p || !p.alive || !p.pos || riding(s, p) || !canRide(ctx, p, s)) return;
  const c = chocoAt(s, p.pos.x, p.pos.y);
  if (c) mount(ctx, s, p, c);
}
function onEndTurn(ctx, st) {
  const s = st && st.eos;
  if (!s) return;
  checkRiders(ctx, s);
  checkChannels(ctx, s);
  noteDeaths(ctx, s);
  scoreRound(ctx, s);
  tickDome(ctx, s);
}

// ============================================================ ปุ่ม HUD
function canMove(ctx, p) {
  const a = ctx.match.action;
  return ctx.action.canAct(p) && !!a && !a.locked;
}
function canStrike(ctx, p) {
  const a = ctx.match.action;
  return ctx.action.canAct(p) && !!a && !a.noStrike && !p.didAttackRound;
}
function hudActions(ctx, st, p) {
  const s = st && st.eos;
  if (!s || !p || !p.pos) return [];
  const out = [];
  if (process.env.EOS_DEV_CAR === "near" && !s.devCar) { // dev: รถคันแรกมาจอดข้างคนแรกที่เปิดปุ่ม (ทดสอบในเบราว์เซอร์)
    const t = leaveTiles(ctx, s, p).find((o) => carGround(ctx, s, o.x, o.y));
    if (t) { Object.assign(s.cars[0], t); s.devCar = true; ctx.bump(); }
  }
  syncCars(ctx, s);
  const car = carOf(ctx, s, p);
  if (car) {
    const rt = canStrike(ctx, p) ? ramTargets(ctx, s, p) : [];
    out.push({ key: "fd:ram", icon: "💥", name: "ชน", disabled: !rt.length, tiles: rt });
    const lt = ctx.action.canAct(p) ? leaveTiles(ctx, s, p) : [];
    out.push({ key: "fd:leave", icon: "🚪", name: "ลงรถ", disabled: !lt.length, tiles: lt });
  } else if (canDrive(ctx, s, p)) {
    const near = carNear(ctx, s, p);
    if (near.length) out.push({ key: "fd:board", icon: "🚗", name: "ขึ้นรถ", disabled: !canMove(ctx, p), tiles: near.map((c) => ({ x: c.x, y: c.y })) });
    const bt = boardTiles(ctx, s, p);
    if (bt.length) out.push({ key: "fd:seat", icon: "💺", name: "นั่งรถ", disabled: !canMove(ctx, p) || !!ctx.match.rideAsk, tiles: bt });
  }
  if (LEVER && ctx.adjacent(p, LEVER.x, LEVER.y)) out.push({ key: "fd:lever", icon: "🌉", name: s.bridgeUp ? "ลดสะพาน" : "ยกสะพาน", disabled: !canStrike(ctx, p) || bridgeOccupied(ctx) });
  if (DOME_CORE && ctx.adjacent(p, DOME_CORE.x, DOME_CORE.y)) out.push({ key: "fd:dome", icon: "🛡️", name: "โดม", disabled: !canStrike(ctx, p) || !domeReady(ctx, s) });
  const sw = switchNear(ctx, p);
  if (sw) out.push({ key: "fd:lights", icon: "💡", name: lit(s, sw.zone) ? "ดับไฟ" : "เปิดไฟ", disabled: !canStrike(ctx, p) });
  if (wreckNear(ctx, s, p).length) out.push({ key: "fd:push", icon: "🚙", name: "ผลัก", disabled: !canStrike(ctx, p) || !wreckNear(ctx, s, p).some((w) => pushTo(ctx, s, p, w)) });
  for (const el of [...new Set(flasksOf(s, p))]) {
    out.push({ key: `fd:flask:${el}`, icon: el === "fire" ? "🔥" : el === "ice" ? "❄️" : "⚡", name: `ขวด${ELEMENT_NAMES[el]}`, count: flasksOf(s, p).filter((e) => e === el).length, disabled: !canStrike(ctx, p), tiles: canStrike(ctx, p) ? flaskTiles(ctx, p) : [] });
  }
  const tur = turretNear(ctx, p);
  if (tur) { const list = canStrike(ctx, p) ? turretTargets(ctx, s, p, tur) : []; out.push({ key: "fd:turret", icon: "🔫", name: "ป้อมปืน", disabled: !list.length, tiles: list }); }
  const sz = seizeState(ctx, s, p);
  if (sz) out.push({ key: "fd:seize", icon: "🔷", name: sz.pl.ch && sz.pl.ch.by === p.id ? "ยึด 2/2" : "ยึด", disabled: !sz.ok });
  if (riding(s, p)) {
    const tiles = ctx.action.canAct(p) ? dismountTiles(ctx, s, p) : [];
    out.push({ key: "fd:dismount", icon: "🐤", name: "ลง", disabled: !tiles.length, tiles });
  }
  return out;
}
function charAction(ctx, st, p, key, tile) {
  const s = st && st.eos;
  if (!s || !p || !p.pos) return false;
  if (key === "fd:board") return boardCar(ctx, s, p, tile);
  if (key === "fd:leave") return leaveCar(ctx, s, p, tile);
  if (key === "fd:ram") return ram(ctx, s, p, tile);
  if (key === "fd:seat") return askRide(ctx, s, p, tile);
  if (key === "fd:seize") return seize(ctx, s, p);
  if (key === "fd:lever") return pullLever(ctx, s, p);
  if (key === "fd:dome") return raiseDome(ctx, s, p);
  if (key === "fd:lights") return flipLights(ctx, s, p);
  if (key === "fd:push") return pushWreck(ctx, s, p);
  if (key === "fd:turret") return fireTurret(ctx, s, p, tile);
  if (typeof key === "string" && key.startsWith("fd:flask:")) return throwFlask(ctx, s, p, key.slice(9), tile);
  if (key === "fd:dismount") {
    if (!riding(s, p) || !ctx.action.canAct(p) || !tile) return false;
    if (!dismountTiles(ctx, s, p).some((t) => t.x === tile.x && t.y === tile.y)) return false;
    const c = unride(ctx, s, p.id);
    if (!c) return false;
    c.rider = null; c.x = tile.x; c.y = tile.y;
    ctx.bump();
    ctx.fx("choco_dismount", { id: p.id, choco: c.id, x: tile.x, y: tile.y });
    ctx.log(`🐤 ${p.name} ลงจากโชโกโบะ`);
    return true;
  }
  return false;
}

// ============================================================ ของที่ตีได้ (ปีศาจ)
function objects(ctx, st) {
  const s = st && st.eos;
  if (!s) return [];
  return [
    ...s.daemons.map((d) => ({ id: d.id, x: d.x, y: d.y, kind: "daemon", name: "ปีศาจ", hp: d.hp, maxHp: DAEMON_HP, armor: d.armor, look: d.kind, strike: true })),
    ...(s.mobs || []).map((m) => ({ id: m.id, x: m.x, y: m.y, kind: m.type, name: m.type === "beast" ? "สัตว์ยักษ์" : "ทหารเหล็ก", hp: m.hp, maxHp: m.type === "beast" ? BEAST.hp : MAGITEK.hp, armor: m.armor, strike: true })),
    ...(s.barrels || []).map((b) => ({ id: b.id, x: b.x, y: b.y, kind: "barrel", name: "ถังน้ำมัน", strike: true })),
    ...(s.crystals || []).map((c) => ({ id: c.id, x: c.x, y: c.y, kind: "crystal", name: "หินพลังเวท", element: c.element, strike: true })),
  ];
}
function strikeObject(ctx, st, p, objId) {
  const s = st && st.eos;
  if (!s) return false;
  const b = (s.barrels || []).find((o) => o.id === objId);
  if (b) { ctx.fx("barrel_hit", { x: b.x, y: b.y, by: p.id }); explodeBarrel(ctx, s, b, p); return 1.4; }
  const c = (s.crystals || []).find((o) => o.id === objId);
  if (c) { breakCrystal(ctx, s, c, p); return 1.1; }
  const m = (s.mobs || []).find((o) => o.id === objId);
  if (m) { ctx.fx("mob_struck", { id: m.id, x: m.x, y: m.y, by: p.id }); hurtMob(ctx, s, m, strikeDmg(p), p); return 1.1; }
  const d = s.daemons.find((o) => o.id === objId);
  if (!d) return false;
  ctx.fx("daemon_struck", { id: d.id, x: d.x, y: d.y, by: p.id });
  hurtDaemon(ctx, s, d, strikeDmg(p), p);
  return 1.1;
}

// ============================================================ หมอก (eos_fog — มองเห็นแค่ระยะเดินของฝ่ายตัวเอง)
const EYE_CACHE = new WeakMap();
function anchorOf(ctx, u) {
  const m = ctx.match;
  if (m.gameState !== "ACTION") return u.pos;
  const a = m.actorId === u.id ? m.action : m.duo && m.duo.acts ? m.duo.acts[u.id] : null;
  return a && !a.locked ? a.eye || a.from || u.pos : u.pos;
}
function unitVision(ctx, map, u) {
  const at = anchorOf(ctx, u);
  if (!at) return null;
  const size = sizeOf(ctx, u), mov = Math.max(0, ctx.action.movOf(u) | 0), ghost = !!ctx.action.walksThrough(u);
  const key = `${at.x},${at.y},${size},${mov},${ghost ? 1 : 0}`;
  let per = EYE_CACHE.get(map);
  if (!per) { per = new Map(); EYE_CACHE.set(map, per); }
  if (per.has(key)) return per.get(key);
  const set = new Set();
  const reach = ctx.Board.reachable(map, { id: "_eoseye", x: at.x, y: at.y, size, alive: true }, mov, [], { ghost });
  for (const n of reach.values()) for (const t of ctx.Board.footprint(n.x, n.y, size)) set.add(K(t.x, t.y));
  for (const t of ctx.Board.footprint(at.x, at.y, size)) {
    set.add(K(t.x, t.y));
    for (const [dx, dy] of ctx.Board.DIRS) if (ctx.Board.inBounds(map, t.x + dx, t.y + dy)) set.add(K(t.x + dx, t.y + dy));
  }
  // สิ่งกีดขวางติดช่องที่เห็น = เห็นด้วย (ไม่เปิดเผยใคร)
  for (const k of [...set]) {
    const [x, y] = k.split(",").map(Number);
    for (const [dx, dy] of ctx.Board.DIRS) if (ctx.Board.inBounds(map, x + dx, y + dy) && ctx.Board.isObstacle(map, x + dx, y + dy)) set.add(K(x + dx, y + dy));
  }
  if (per.size > 256) per.clear();
  per.set(key, set);
  return set;
}
function sideVision(ctx, st, viewer) {
  if (!(st && st.eos) || !fogOn(ctx) || !viewer || ctx.match.gameState === "GAMEOVER") return null;
  const me = ctx.match.players[viewer.id] || viewer;
  const eyes = bodies(ctx).filter((u) => u.id === me.id || ctx.combat.sameTeam(me, u));
  if (!eyes.length) return null;
  const map = ctx.map(), set = new Set();
  for (const u of eyes) { const v = unitVision(ctx, map, u); if (v) for (const k of v) set.add(k); }
  return set;
}
function vision(ctx, st, viewer) {
  const set = sideVision(ctx, st, viewer);
  return set ? [...set] : null;
}
function hides(ctx, st, viewer, target) {
  if (!target || !target.pos || !viewer || !(st && st.eos)) return false;
  if (target.exposedRound === ctx.match.roundNumber) return false;
  const me = ctx.match.players[viewer.id] || viewer;
  if (target.id === me.id || sideOf(target) === sideOf(me)) return false; // ฝ่ายเดียวกันเห็นกันเสมอ
  const foot = footOf(ctx, target);
  const fog = sideVision(ctx, st, viewer);
  if (fog && !foot.some((t) => fog.has(K(t.x, t.y)))) return true;
  const sight = sideSight(ctx, viewer);
  return !!sight && !foot.some((t) => sight.has(K(t.x, t.y)));
}

// ============================================================ ข้อมูลให้ client
function publicInfo(ctx, st) {
  const s = st && st.eos;
  if (!s) return {};
  const riders = {};
  for (const [pid, r] of Object.entries(s.riders)) riders[pid] = r.choco;
  return {
    eos: true,
    night: !!s.night,
    cars: s.cars.map((c) => ({ id: c.id, img: c.img, x: c.x, y: c.y, size: 1, driver: c.driver || null, dx: c.dx || 0, dy: c.dy || 0 })),
    chocos: s.chocos.map((c) => ({ id: c.id, x: c.x, y: c.y, rider: c.rider, home: { ...c.home } })),
    riders,
    daemons: s.daemons.map((d) => ({ id: d.id, x: d.x, y: d.y, hp: d.hp, maxHp: DAEMON_HP, armor: d.armor, maxArmor: DAEMON_ARMOR, kind: d.kind })),
    warn: [
      ...(s.warn || []).map((t) => ({ x: t.x, y: t.y, kind: "lightning" })),
      ...(s.dropship && s.dropship.state === "warn" ? [0, 1].flatMap((dy) => [0, 1].map((dx) => ({ x: s.dropship.x + dx, y: s.dropship.y + dy, kind: "dropship" }))) : []),
    ],
    pillars: s.pillars.map((pl) => ({
      id: pl.id, zone: pl.zone, x: pl.x, y: pl.y, owner: pl.owner, color: pl.owner ? sideColor(ctx, pl.owner) : null,
      ch: pl.ch ? { by: pl.ch.by, color: sideColor(ctx, pl.ch.side), round: pl.ch.round } : null,
    })),
    goal: SCORE_GOAL,
    scores: scoreList(ctx, s),
    revive: Object.entries(s.dead).map(([id, r]) => ({ id, at: r + REVIVE_TURNS })),
    bridgeUp: !!s.bridgeUp,
    dome: domeOn(s) ? { left: s.dome.left, rect: INSOMNIA } : null,
    lightsOff: { ...(s.lightsOff || {}) },
    wrecks: (s.wrecks || []).map((w) => ({ ...w })),
    barrels: (s.barrels || []).map((b) => ({ id: b.id, x: b.x, y: b.y })),
    crystals: (s.crystals || []).map((c) => ({ id: c.id, x: c.x, y: c.y, element: c.element })),
    mobs: (s.mobs || []).map((m) => ({ id: m.id, type: m.type, x: m.x, y: m.y, hp: m.hp, maxHp: m.type === "beast" ? BEAST.hp : MAGITEK.hp, armor: m.armor, maxArmor: m.type === "beast" ? BEAST.armor : MAGITEK.armor, aggro: m.aggro || null })),
    dropship: s.dropship ? { x: s.dropship.x, y: s.dropship.y, state: s.dropship.state } : null,
  };
}
function scoreList(ctx, s) {
  const sides = new Set(Object.keys(s.scores));
  for (const pl of s.pillars) if (pl.owner) sides.add(pl.owner);
  return [...sides].map((side) => ({
    side, score: s.scores[side] || 0, held: s.pillars.filter((pl) => pl.owner === side).length, color: sideColor(ctx, side), name: sideName(ctx, side),
  })).sort((a, b) => b.score - a.score);
}
function playerInfo(ctx, st, p) {
  const s = st && st.eos;
  if (!s) return undefined;
  const badges = [];
  if (riding(s, p)) badges.push({ key: "choco", icon: "🐤", label: "โชโกโบะ", cls: "bg-yellow-300 text-gray-900" });
  if (driving(s, p)) badges.push({ key: "car", icon: "🚗", label: "รถ", cls: "bg-amber-200 text-gray-900" });
  for (const el of flasksOf(s, p)) badges.push({ key: `flask_${el}_${badges.length}`, icon: el === "fire" ? "🔥" : el === "ice" ? "❄️" : "⚡", label: `ขวด${ELEMENT_NAMES[el]}`, cls: "bg-indigo-200 text-gray-900" });
  if (!badges.length) return undefined;
  return { choco: riding(s, p), car: driving(s, p), badges };
}

module.exports = {
  enter, weatherStart, layer, layerVer, movMod, flatWalk, carWalk, carSeats, carDriver, preRound, onUnitEnd, onEndTurn,
  hudActions, charAction, objects, strikeObject, vision, hides, publicInfo, playerInfo, winner, shields,
  gysahlOnSale, useGysahl, explodeBarrel, throwFlask, fireTurret, actMobs, spawnBeast, dropshipTurn, respawnProps, hurtMob, TURRETS,
  BARREL_DMG, BARREL_BURN, FLASK_RANGE, FLASK_MAX, THUNDER_DMG, SHOCK_DMG, TURRET_DMG, TURRET_RANGE, BEAST, MAGITEK, BRIDGES, LEVER, DOME_CORE, DOME_GATES, DOME_TURNS, GYSAHL_RANGE, blockedTown,
  // เทสต์
  sideOf, scoreRound, reviveDue, noteDeaths, sideSight, seizeState, checkChannels, SCORE_GOAL, SCORE_TABLE, REVIVE_TURNS, SIGHT_EXTRA,
  carCells, carOf, canRide, driving, boardCar, leaveCar, ram, ramTargets, syncCars, CAR_OFF, CAR_SEATS, CAR_MOV, checkRiders, spawnDaemons, actDaemons, dissolveDaemons, hurtDaemon, inTown, zoneAt, ROAD,
  MOV_BONUS, CHOCO_MOV, CHOCO_RESPAWN, CAR_HIT_DMG, DAEMON_COUNT, DAEMON_HP, DAEMON_ARMOR, DAEMON_ATK, DAEMON_MOV, DAEMON_GOLD,
  LIGHTNING_COUNT, LIGHTNING_DMG,
};
