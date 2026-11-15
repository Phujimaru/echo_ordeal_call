// ============================================================
//  สนาม Eos — โชโกโบะ (ขี่/ตก/เกิดใหม่) · รถ (ขับ/นั่ง/ชน/ซ่อม) · ร่วมแรง · หุ่นเกราะด้านหลัง
//  แยกออกจาก server/fodlan/stage6.js (ย้ายโค้ดล้วน · พฤติกรรมเดิม) · ฮุคทั้งหมดยังส่งออกผ่าน stage6.js
// ============================================================
const MAP = require("./map6");
const PKS = require("./eosPerks");
const XT = require("./eosExtra");
const TWN = require("./eosTowns");
const { MOV_BONUS, WALK_MAX, CHOCO_MOV, CHOCO_RESPAWN, CAR_HP, CHOCO_HP, CAR_FIX, CHOCO_FEED, FIX_SECS, CAR_HIT_DMG, STORM_MOV, K, bodies, isMob,
  heroes, sizeOf, footOf, stormOn, snowMov, tileFree, freeNear, manhattan, canMove, canStrike } = require("./eosCore");
const HH = require("./eosH");
const JR = require("./eosJourney");
const PR = require("./eosProps");
const SPN = require("./eosSpawn");

// ============================================================ ระยะเดิน
function riding(s, p) { return !!(s && p && s.riders[p.id]); }
function movMod(ctx, st, p) {
  const s = st && st.eos;
  if (!s || !p) return 0;
  const base = Number(ctx.action.baseMovOf ? ctx.action.baseMovOf(p) : require("../phases/action").baseMovOf(p)) || 0;
  const capHook = require("../../characters/index")[p.characterId]; // ฮุค eosWalkMax(p) → เพดานเฉพาะตัว (เฟิร์น: ฐาน 4 +2 = 6 — ผู้ใช้สั่ง 2026-11-11)
  const cap = Number((capHook && capHook.eosWalkMax && capHook.eosWalkMax(p)) || WALK_MAX);
  const walk = Math.max(0, Math.min(base + MOV_BONUS, cap) - base); // เดินเท้า: +2 แต่ไม่เกิน 5 · ตัวที่ค่าเริ่มต้นเกิน 5 อยู่แล้ว/บัฟระยะเดิน = ปล่อยตามเดิม (ผู้ใช้สั่ง)
  return walk + JR.p4MovBonus(s, p) + (riding(s, p) ? CHOCO_MOV : 0) + (driving(s, p) ? CAR_MOV : 0) + XT.movBonus(s, p, riding(s, p), driving(s, p)) + PKS.movBonus(s) + (driving(s, p) ? TWN.carMov(ctx, s, HH.H(), p) : 0) + (stormOn(ctx) ? STORM_MOV : 0) + snowMov(ctx, p);
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
    r.mark = markOf(p); // นกรับดาเมจแทนแล้ว (absorbDamage) — ตกนกเมื่อนกเลือดหมดเท่านั้น
  }
}
// ============================================================ พาหนะรับดาเมจแทน (combat → fodlan.absorbDamage → ที่นี่ · ทีละ 1 หน่วย)
function absorbDamage(ctx, st, p) {
  const s = st && st.eos;
  if (!s || !p || !p.alive || !p.pos) return false;
  const r = s.riders[p.id];
  const c = r ? s.chocos.find((o) => o.id === r.choco) : null;
  if (c) {
    c.hp = Math.max(0, (c.hp ?? CHOCO_HP) - 1);
    ctx.bump();
    if (c.hp <= 0) {
      const from = { x: p.pos.x, y: p.pos.y };
      unride(ctx, s, p.id);
      ctx.fx("choco_fall", { id: p.id, x: from.x, y: from.y });
      ctx.log(`🐤 โชโกโบะของ ${p.name} บาดเจ็บหนัก วิ่งกลับคอก!`);
      sendHome(ctx, s, c, from);
    }
    return true;
  }
  const car = carOf(ctx, s, p);
  if (car) {
    car.hp = Math.max(0, (car.hp ?? CAR_HP) - 1);
    ctx.bump();
    if (car.hp <= 0) breakCar(ctx, s, p, car);
    return true;
  }
  return false;
}
// รถพัง: คนขับกระเด็นลงช่องข้างรถ · ผู้โดยสารลง · รถจอดค้างเป็นสิ่งกีดขวาง ขับไม่ได้จนกว่าจะซ่อม
function breakCar(ctx, s, p, car) {
  car.broken = true;
  const spot = leaveTiles(ctx, s, p)[0] || null;
  if (spot) {
    p.pos = { x: spot.x, y: spot.y };
    const a = ctx.match.action;
    if (a && ctx.match.actorId === p.id) { a.from = { ...p.pos }; a.trail = null; a.path = null; a.locked = true; }
  }
  park(ctx, s, car, true);
  ctx.fx("car_break", { id: p.id, car: car.id, x: car.x, y: car.y, to: spot });
  ctx.log(`💥 รถของ ${p.name} พัง!`);
}
// ซ่อมรถ/ป้อนอาหารโชโกโบะ: พาหนะที่ติดตัว (หรือที่ตัวเองขับ/ขี่) เลือดไม่เต็ม — เลือกคันที่เลือดน้อยสุด
function fixTargets(ctx, s, p) {
  if (!p || !p.pos) return [];
  const out = [];
  const near = (x, y) => x != null && Math.abs(x - p.pos.x) + Math.abs(y - p.pos.y) <= 1;
  for (const c of s.cars) if ((c.hp ?? CAR_HP) < CAR_HP && (c.driver === p.id || (!c.driver && near(c.x, c.y)) || (c.driver && near(c.x, c.y)))) out.push({ kind: "car", o: c, k: (c.hp ?? CAR_HP) / CAR_HP });
  for (const c of s.chocos) if (c.x != null && (c.hp ?? CHOCO_HP) < CHOCO_HP && (c.rider === p.id || near(c.x, c.y))) out.push({ kind: "choco", o: c, k: (c.hp ?? CHOCO_HP) / CHOCO_HP });
  return out.sort((a, b) => a.k - b.k);
}
function fixVehicle(ctx, s, p) {
  if (!canStrike(ctx, p)) return false;
  const t = fixTargets(ctx, s, p)[0];
  if (!t) return false;
  const o = t.o, max = t.kind === "car" ? CAR_HP : CHOCO_HP, add = t.kind === "car" ? CAR_FIX : CHOCO_FEED;
  const was = o.hp ?? max;
  o.hp = Math.min(max, was + add);
  if (t.kind === "car" && o.broken && o.hp > 0) o.broken = false;
  ctx.bump();
  ctx.fx("vehicle_fix", { id: p.id, kind: t.kind, target: o.id, x: o.x, y: o.y, amount: o.hp - was });
  ctx.log(t.kind === "car" ? `🔧 ${p.name} ซ่อมรถ +${o.hp - was}` : `🥬 ${p.name} ป้อนผักกิซาลให้โชโกโบะ +${o.hp - was}`);
  ctx.useStrike(p, FIX_SECS);
  return true;
}
function respawnChocos(ctx, s) {
  const round = ctx.match.roundNumber + 1;
  for (const c of s.chocos) {
    if (c.x != null || c.rider || round < c.back) continue;
    const spot = freeNear(ctx, s, c.home.x, c.home.y, 2);
    if (!spot) continue;
    c.x = spot.x; c.y = spot.y; c.back = 0; c.hp = CHOCO_HP; // พักที่คอกหายดี
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

// ขึ้นขี่ทันที (ผู้ใช้สั่ง 2026-11-10 "ขี่ได้เลย ไม่ต้องรอ"): ยืนติดโชโกโบะว่าง → ปุ่ม "ขี่" กระโดดขึ้นหลังนก
//  ยังไม่ได้เดินตานี้ = เริ่มเดินจากนกเต็มระยะ (+CHOCO_MOV) · เดินแล้ว = ขึ้นได้แต่จบการเดิน (แบบขึ้นรถ)
function chocoNear(ctx, s, p) {
  if (!p || !p.pos) return [];
  return s.chocos.filter((c) => c.x != null && !c.rider && Math.abs(c.x - p.pos.x) + Math.abs(c.y - p.pos.y) === 1);
}
// เรียกโชโกโบะ (ฟาร์ม/ผักกิซาล) แล้วขึ้นขี่ทันที (ผู้ใช้ 2026-11-14 "เรียกแล้วขี่ไม่ได้เลย ต้องรอเทิร์นหน้า")
//  ยังไม่ได้เดิน = เดินต่อจากนกเต็มระยะ · เดินแล้ว = ขึ้นได้แต่จบการเดิน · ขี่ไม่ได้ (ตัวใหญ่/บิน/ขับรถ) = นกยืนรอข้างตัวเหมือนเดิม
function rideNow(ctx, s, p, c) {
  if (!canRide(ctx, p, s) || riding(s, p) || c.x == null) return false;
  const a = ctx.match.action;
  p.pos = { x: c.x, y: c.y };
  if (a && (a.moved || a.path || a.locked)) ctx.action.lockMove(p);
  else if (a) {
    if (!a.eye) a.eye = { ...a.from };
    a.from = { ...p.pos }; a.trail = null; a.path = null;
  }
  mount(ctx, s, p, c);
  return true;
}
function mountNear(ctx, s, p, tile) {
  if (!canRide(ctx, p, s) || riding(s, p) || !canMove(ctx, p) || !tile) return false;
  const c = chocoNear(ctx, s, p).find((o) => o.x === tile.x && o.y === tile.y);
  if (!c) return false;
  const a = ctx.match.action;
  p.pos = { x: c.x, y: c.y };
  if (a.moved || a.path || a.locked) ctx.action.lockMove(p);
  else {
    if (!a.eye) a.eye = { ...a.from };
    a.from = { ...p.pos }; a.trail = null; a.path = null;
  }
  mount(ctx, s, p, c);
  return true;
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
const carNear = (ctx, s, p) => s.cars.filter((c) => !c.driver && !c.broken && Math.abs(c.x - p.pos.x) + Math.abs(c.y - p.pos.y) === 1);
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
    const dealt = SPN.hurt(ctx, u, CAR_HIT_DMG + XT.ramBonus(s), p); // พลังเสา Hammerhead: ชน +1
    if (u.alive && u.pos && tileFree(ctx, s, u.pos.x + dx, u.pos.y + dy, u.id)) u.pos = { x: u.pos.x + dx, y: u.pos.y + dy };
    hits.push({ id: u.id, from, to: u.pos ? { ...u.pos } : null, dmg: dealt });
    ctx.log(`🚗 ${p.name} ขับรถชน ${u.name} -${dealt}`);
  }
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
  if (s) syncCars(ctx, s);
  if (!s || !driving(s, t) || !canDrive(ctx, s, p)) return 0;
  return CAR_SEATS;
}
// ร่วมแรง (ผู้ใช้สั่ง 2026-11-14 "เพื่อนร่วมทีมในบริเวณใกล้เคียง สู้ร่วมกัน" · ค่า Claude ตั้ง): มีเพื่อน (ผู้เล่นคนอื่น) ยืนในระยะ ALLY.r = ตีปกติใส่มอน +ALLY.atk (ไม่ซ้อนตามจำนวนเพื่อน)
const ALLY = { r: 2, atk: 1 };
function allyNear(ctx, p) {
  if (!p || !p.pos || p.summon) return false;
  const own = p.duoOf || p.id, mine = footOf(ctx, p);
  return heroes(ctx).some((u) => !u.summon && (u.duoOf || u.id) !== own && footOf(ctx, u).some((a) => mine.some((b) => manhattan(a, b) <= ALLY.r)));
}
function atkBonus(ctx, st, p, target = null) { const s = st && st.eos; return s && p ? JR.p4AtkBonus(s, p) + XT.comboBonus(ctx, s, HH.H(), p, target) + (target && isMob(target) && !isMob(p) ? PKS.atkBonusVsMob(s) + weakBonus(p, target) + (allyNear(ctx, p) ? ALLY.atk : 0) : 0) : 0; } // + ท่าร่วม (ตีมอนที่เพื่อนตีแล้วในเทิร์นนี้)
// หันหน้าของมอน (summon.face = ทิศหลักแกนเดียว) — หุ่นเกราะใช้หาด้านหลัง
function faceTo(sm, dx, dy) {
  if (!sm || (!dx && !dy)) return;
  sm.face = Math.abs(dx) >= Math.abs(dy) ? { dx: Math.sign(dx), dy: 0 } : { dx: 0, dy: Math.sign(dy) };
}
// คนตีอยู่ด้านหลังหุ่นเกราะ (ฝั่งตรงข้ามทิศที่หัน) → แรง +MECH.weak
function behindMech(p, m) {
  const f = m && m.summon && m.summon.face;
  if (!f || !p || !p.pos || !m.pos || m.summon.trait !== "mech") return false;
  return (p.pos.x - m.pos.x) * f.dx + (p.pos.y - m.pos.y) * f.dy < 0;
}
function weakBonus(p, target) { return behindMech(p, target) ? PR.MECH.weak : 0; }
function carDriver(ctx, st, p) { return driving(st && st.eos, p); }
// อยู่ในรถ (คนขับ หรือผู้โดยสาร) = ใช้สกิลไม่ได้ (ผู้ใช้สั่ง 2026-11-09) · ตี/ชนยังได้
function noSkill(ctx, st, p) {
  const s = st && st.eos;
  if (!s || !p) return false;
  if (driving(s, p)) return true;
  const m = p.mountId && ctx.match.players[p.mountId];
  return !!(m && driving(s, m));
}
function askRide(ctx, s, p, tile) {
  if (!tile || !boardTiles(ctx, s, p).some((t) => t.x === tile.x && t.y === tile.y)) return false;
  const c = s.cars.find((o) => o.driver && o.x === tile.x && o.y === tile.y);
  return !!(c && require("../ride").ask(p.id, c.driver));
}

// Object.assign (ไม่แทน module.exports) — ไฟล์ eos* อ้างกันเองแบบวนได้
Object.assign(module.exports, {
  riding, movMod, flatWalk, canRide, markOf, chocoAt, mount, sendHome, unride, checkRiders, absorbDamage, fixTargets, fixVehicle,
  respawnChocos, dismountTiles, chocoNear, rideNow, mountNear, CAR_MOV, CAR_SEATS, CAR_OFF, carCells, carOf, driving, canDrive, carNear, specialOf,
  carGround, syncCars, carWalk, boardCar, leaveTiles, leaveCar, ramTargets, ram, boardTiles, carSeats, ALLY, allyNear, atkBonus, faceTo, carDriver,
  noSkill, askRide,
});
