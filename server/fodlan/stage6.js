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
//     พายุทราย eos_sand (ขั้น 5 · L21 — GRID_PLAN §8.6 "พายุทรายเฉพาะโซนทะเลทราย มองเห็นในโซนแค่ 2 ช่อง"):
//       ใครยืนในทะเลทราย Leide (รวม Hammerhead) = ฝ่ายอื่นเห็นได้เฉพาะเมื่อมีตัวของฝ่ายนั้นอยู่ห่างไม่เกิน 2 ช่อง
//       คนในทะเลทรายเองก็เห็นผู้เล่นอื่นได้แค่ 2 ช่อง (ทั้งในและนอกโซน) · นอกทะเลทรายไม่มีผล (Claude ตัดสินรายละเอียด)
//
//  สถานะ = st.eos (สร้างใน enter) — ไม่มี = ฮุคไม่ทำอะไร
//  แยกไฟล์ (2026-11-15 · ย้ายโค้ดล้วน): eosCore (ค่าคงที่/helper) · eosRide (โชโกโบะ/รถ) · eosSpawn · eosMobAI · eosMobTurn (มอน)
//   eosWalls (กำแพงเมือง) · eosScore (เสา/แต้ม/ฟื้น) · eosSight · eosDome · eosProps · eosJourney (ขั้น 4) · eosItems · eosH — ไฟล์นี้ส่งออกชื่อเดิมครบ
// ============================================================
const MAP = require("./map6");
const E = require("./eosEvents"); // PVE รอบสอง: ความยาก · บอส · มอนพิเศษ · พระจันทร์สีเลือด · ภารกิจ · เกราะเสา · ช่วยฟื้น · ขบวนเสบียง
const PKS = require("./eosPerks"); // PVE รอบสี่: การ์ดอัปเกรดทีม · ดาวท้าทาย · กำแพงชั่วคราว · โชโกโบะทอง
const XT = require("./eosExtra");
const SKY = require("./eosSky");
const TWN = require("./eosTowns"); // ของประจำเมือง (2026-11-12): อู่ · ร้านอาหาร · ศาลเทพธิดา · ฟาร์มโชโกโบะ
const AR = require("./eosArms"); // อาวุธจักรพรรดิ 13 อัน (2026-11-12)
const BB = require("./eosBoss"); // ท่าใหญ่ราชาปีศาจ (2026-11-12): ลำแสง · วงแหวน · อุกกาบาต · องครักษ์
const ELT = require("./eosElite"); // มอนหัวหน้า (2026-11-12): คุณสมบัติสุ่ม 7 แบบ
const MBS = require("./eosMobs"); // มอนรูปแบบใหม่ 8 แบบ (2026-11-12): พลธนู · โล่ · พ่นใย · วาร์ป · โซ่ลาก · วงเวท · ฝูงจิ๋ว · แยกร่าง
const LM = require("./eosLament"); // ความยาก Lament + ผู้คร่ำครวญ (2026-11-11) // PVE รอบหก: คราสกลางวัน · จันทร์เต็มดวง · ฝนดาวตก · รถไฟขนเสบียง · พายุแม่เหล็ก // PVE รอบสาม: คืนสุดท้าย · พลังประจำเสา · ท่าร่วม · รังปีศาจ · ยักษ์หิน · แสงไฟแคมป์ · พลเรือน · มาตรวัดทีม · ฉายา
const { MOV_BONUS, WALK_MAX, CHOCO_MOV, CHOCO_RESPAWN, CAR_HP, CHOCO_HP, CAR_FIX, CHOCO_FEED, CAR_HIT_DMG, DAEMON_COUNT, DAEMON_HP, DAEMON_ARMOR,
  DAEMON_ATK, DAEMON_MOV, DAEMON_GOLD, LIGHTNING_COUNT, LIGHTNING_DMG, SCORE_GOAL, SCORE_TABLE, PILLAR_HP, PVE, MOB_SIDE, REVIVE_TURNS, SIGHT_EXTRA,
  MOB_SEQ, SECS, K, ROAD, TOWNS, inTown, zoneAt, bodies, isMob, mobsOf, heroes, lazySummon, footOf, stormOn, snowOn, magnetOn, sandOn, SAND_SIGHT,
  inDesert, nightAt, freeNear, manhattan, canMove, canStrike } = require("./eosCore");
const { riding, movMod, flatWalk, canRide, chocoAt, mount, unride, checkRiders, absorbDamage, fixTargets, fixVehicle, respawnChocos, dismountTiles,
  chocoNear, mountNear, CAR_MOV, CAR_SEATS, CAR_OFF, carCells, carOf, driving, canDrive, carNear, carGround, syncCars, carWalk, boardCar, leaveTiles,
  leaveCar, ramTargets, ram, boardTiles, carSeats, ALLY, allyNear, atkBonus, carDriver, noSkill, askRide } = require("./eosRide");
const { daemonStats, daemonCount, daemonRefill, magitekStats, spawnMob, mobType, TRAIT, pickTrait, hurt, spawnDaemons, nightTarget, dissolveDaemons,
  lightBound, prey, MOB_CONTROL, tickMobControl, MOB_CAP, mobRoom, bigBusy, bigFree } = require("./eosSpawn");
const { RAID, MUSTER, musterTick, TOWN_LIGHT, lightMax, dimLights, lightHp, siegeLight, restoreLights, lightFixable, fixLights, openPillars,
  raidPlan, BOSS_AI } = require("./eosMobAI");
const { CITY_WALL, turretZone, gateShut, isCityWall, hitWall, wallFixTarget, FIX_NAMES, fixWall, pillarHp, reviveTurns, hitPillar } = require("./eosWalls");
const { mobAtkOf, fairHit, mobTimeline, actMonsters, healerAct, bomberBlast, onMobDeath, beastAggro } = require("./eosMobTurn");
const { sideOf, sideColor, checkChannels, seizeState, ZONE_NAMES, seize, heldCount, rateOf, scoreRound, addScore, outcome, winner, sumHit, publicSum,
  noteDeaths, reviveDue } = require("./eosScore");
const { sideSight, vision, hides } = require("./eosSight");
const { DOME_TURNS, DOME_HP, DOME_COOLDOWN, GYSAHL_RANGE, BRIDGES, LEVER, DOME_CORE, INSOMNIA, DOME_GATES, domeOn, lit, blockedTown, bridgeOccupied,
  pullLever, domeReady, raiseDome, tickDome, shields, switchNear, FLASH, flashCd, flipLights, eosPriceMul, gysahlOnSale, useGysahl, wreckNear,
  pushTo, pushWreck } = require("./eosDome");
const { BARREL_DMG, BARREL_BURN, FLASK_MAX, FLASK_RANGE, FIRE_DMG, THUNDER_DMG, SHOCK_DMG, TURRET_RANGE, TURRET_DMG, BEAST, MAGITEK, MECH,
  ELEMENT_NAMES, TURRETS, explodeBarrel, flasksOf, breakCrystal, flaskTiles, throwFlask, turretUp, turretNear, turretTargets, fireTurret, spawnBeast,
  DAY_DROP_PCT, dropshipTurn, CHEST_FIRST, CHEST_EVERY, CHEST_MAX, spawnChests, openChest, respawnProps } = require("./eosProps");
const { TRAIN_EVERY, TRAIN_DMG, CAMP_TURNS, CAMP_CD, ARM_TURNS, FISH_MAX, TEAM_MEALS, BOUNTY, p4State, trainTurn, TRAM_STOPS, TRAM, tramOff,
  rideTram, campRest, armRec, armDrain, huntDone, onKill, p4PreRound, p4Hud, p4Action, p4Public, p4Badges } = require("./eosJourney");
const { H } = require("./eosH");
const { wardOnSale, useWard, REVIVE_ITEM, keepsCorpse, reviveOnSale, reviveTargets, useRevive, useBarricade, onCivDeath, onConvoyDeath } = require("./eosItems");
let VISIT = 0;

// ============================================================ เข้าสนาม
function enter(ctx, st) {
  st.eos = {
    visit: ++VISIT, seq: 0,
    cars: MAP.CARS.map(([x, y], i) => ({ id: `fd:car${i + 1}`, img: i + 1, x, y, driver: null, dx: -1, dy: 0, hp: CAR_HP, broken: false })),
    chocos: MAP.CHOCOBOS.map(([x, y], i) => ({ id: `fd:choco${i + 1}`, home: { x, y }, x, y, rider: null, back: 0, hp: CHOCO_HP })),
    riders: {},      // id ผู้ขี่ → { choco, mark } (mark = เลือด+เกราะล่าสุด — ลดลง = ตกนก)
    night: false, // เทิร์นแรกเป็นกลางคืน (เริ่มแมตช์กลางเทิร์น — dev) = ปีศาจเกิดต้นเทิร์นแรก
    nightNo: 0, dayNo: 1, // คืนที่เท่าไหร่ (ปีศาจแกร่งขึ้นทุกคืน) · วันที่เท่าไหร่ (ทหารเหล็กแกร่งขึ้นทุกวัน)
    warn: null, warnFor: 0,
    pillars: MAP.PILLARS.map((pl, i) => ({ id: `fd:pillar${i + 1}`, zone: pl.zone, x: pl.at[0], y: pl.at[1], owner: null, ch: null, hits: 0, ward: 0 })),
    score: 0,        // แต้มรวมของผู้เล่นทุกคน (PVE)
    lastGain: 0,     // แต้มที่ได้ตอนจบเทิร์นล่าสุด
    dead: {},        // id ผู้เล่น → เทิร์นที่ล้ม (ฟื้นต้นเทิร์น + REVIVE_TURNS)
    result: null,    // "win" | "lose"
    chests: [], chestNext: CHEST_FIRST, kills: 0,
    bridgeUp: false, dome: null, domeReadyRound: 0, lightsOff: {},
    wrecks: MAP.WRECKS.map(([x, y], i) => ({ id: `fd:wreck${i + 1}`, x, y })),
    barrels: MAP.BARRELS.map(([x, y], i) => ({ id: `fd:barrel${i + 1}`, x, y, home: { x, y } })), barrelBack: [],
    crystals: [], crystalBack: MAP.CRYSTALS.map(([x, y]) => ({ at: { x, y }, round: 0 })),
    flasks: {}, beastBack: 0, ships: [], dropNext: 0, // beastBack 0 = ไม่มีสัตว์ยักษ์ (Deadeye — ผู้ใช้สั่งเอาออก 2026-11-10)
  };
  for (const p of Object.values(ctx.match.players)) if (isMob(p) || (p.summon && p.summon.convoy)) lazySummon().remove(p); // แมตช์ใหม่: มอน/รถเสบียงเก่าหายหมด
  E.init(st.eos);
  XT.init(st.eos);
  PKS.init(st.eos);
  SKY.init(st.eos);
  // เกราะสูงสุดที่ขึ้นกับสนาม Eos (ฮุค maxArmor — เฟิร์น 3): resetCombat ตั้งเกราะก่อนสถานะ Eos มี → เติมให้เต็มตอนเข้าด่าน (ไม่ลดใคร)
  for (const p of Object.values(ctx.match.players)) if (p.alive && !p.summon) p.armor = Math.max(p.armor || 0, ctx.combat.maxArmorOf(p));
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
  for (const w of s.wrecks || []) terrain[K(w.x, w.y)] = "fd_eos_wreck";
  for (const b of s.barrels || []) terrain[K(b.x, b.y)] = "fd_eos_barrel";
  for (const c of s.crystals || []) terrain[K(c.x, c.y)] = "fd_eos_crystal";
  for (const c of s.chests || []) terrain[K(c.x, c.y)] = "fd_eos_chest";
  PKS.layerWalls(s, terrain); // กำแพงชั่วคราว (ไอเทมร้าน)
  // น้ำที่แช่แข็ง (ขวดน้ำแข็ง) = เดินได้ (ไถลตามกติกาน้ำแข็ง)
  const b = ctx.match.board || {};
  for (const k of Object.keys(b.ice || {})) if (terrain[k] === "fd_eos_water" || terrain[k] === "fd_eos_canal") { delete terrain[k]; special[k] = "ice"; }
  if (s.bridgeUp) for (const t of BRIDGES) { terrain[K(t.x, t.y)] = "fd_eos_bridgeup"; delete special[K(t.x, t.y)]; }
  // ประตูโดม (ผู้ใช้ 2026-11-10): ผู้เล่นทุกคนเดินทะลุได้ ใครเปิดก็ตาม · มอนผ่านไม่ได้แต่ทุบได้ (stepMob/wallRoute) — จึงไม่ใส่เป็นสิ่งกีดขวางในแผนที่
  for (const k of Object.keys(s.wallBroken || {})) if (terrain[k] === "fd_eos_wall" || terrain[k] === "fd_eos_turret") delete terrain[k]; // กำแพง/ป้อมพัง = ช่องโล่ง
  if (snowOn(ctx)) for (const [k, v] of Object.entries(special)) if (v === "fd_eos_shallow") special[k] = "ice"; // พายุหิมะ: น้ำตื้นแข็ง (เดิน 1 ก้าว แต่ลื่นไถล)
  return { ...map, terrain, special };
}
// ช่องพังจากท่าทำลายพื้นที่ (เรียวกิ/อรชุน/กิลกาเมช — engine.addChasm): เสายึดพังไม่ได้ · ช่องพังคืนสภาพเองหลัง 2 เทิร์น (ผู้ใช้สั่ง 2026-11-12)
const CHASM_TURNS = 2;
const PILLAR_KEYS = new Set(MAP.PILLARS.map((pl) => K(pl.at[0], pl.at[1])));
function keepsTile(ctx, st, k) { return !!(st && st.eos) && PILLAR_KEYS.has(k); }
function layerVer(ctx, st) {
  const s = st && st.eos;
  return s ? `e${s.visit}|w${Object.keys(s.wallBroken || {}).length}|${snowOn(ctx) ? "s" : ""}` : "x"; // กำแพงพัง/พายุหิมะเปลี่ยนแผนที่
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

// ============================================================ ต้นเทิร์น / จบตา / จบเทิร์น
function preRound(ctx, st) {
  const s = st && st.eos;
  if (!s) return 0;
  s.lamentOn = LM.on(ctx);
  s.roundNow = ctx.match.roundNumber + 1; // เทิร์นปัจจุบัน (ฟังก์ชันที่ไม่มี ctx — Armiger)
  if (process.env.ECHO_DEV_EOS_AT && !s.devAt) { const [ax, ay] = process.env.ECHO_DEV_EOS_AT.split(",").map(Number), h = heroes(ctx)[0], to = h && freeNear(ctx, s, ax, ay, 3); if (to) { s.devAt = true; h.pos = { ...to }; ctx.bump(); } } // dev: วางผู้เล่นคนแรกที่ช่องนี้ (ดูภาพแต่ละเมือง)
  if (process.env.ECHO_DEV_EOS_ELITE && !s.devElite) { const h = heroes(ctx)[0]; if (h && h.pos) { s.devElite = true; for (const [dx, aff] of [[3, ["commander", "vampiric"]], [-3, ["thorns"]]]) { const at = freeNear(ctx, s, h.pos.x + dx, h.pos.y, 2); if (!at) continue; const st0 = ELT.stats(daemonStats(2), aff); const m = spawnMob(ctx, s, dx > 0 ? "daemon" : "magitek", at, st0, { look: 3, tier: 2, noElite: true }); if (m) { m.summon.elite = aff; m.name = ELT.nameOf(m.name); } } ctx.bump(); } } // dev: หัวหน้า 2 ตัวข้างผู้เล่นคนแรก (ดูภาพ)
  if (process.env.ECHO_DEV_EOS_BOSS && !s.devBoss) { const h = heroes(ctx)[0], at = h && h.pos && freeNear(ctx, s, h.pos.x + 4, h.pos.y, 2); if (at) { s.devBoss = true; const b = spawnMob(ctx, s, "daemon", at, { hp: 40, armor: 2, atk: 3, mov: 3, gold: 10 }, { look: 4, tier: 3, trait: "boss" }); if (b) { b.summon.born = 0; b.summon.roarAt = 99; } ctx.bump(); } } // dev: ราชาปีศาจข้างผู้เล่นคนแรก (ดูท่าใหญ่)
  const healed = require("../phases/action").expireChasm(CHASM_TURNS);
  if (healed.length) { ctx.fx("eos_chasm_heal", { tiles: healed.map((k) => { const [x, y] = k.split(",").map(Number); return { x, y }; }) }); ctx.bump(); }
  checkRiders(ctx, s);
  checkChannels(ctx, s);
  noteDeaths(ctx, s);
  campRest(ctx, s); // นอนในวงไฟแคมป์ตอนกลางคืน = ฟื้นเลือด
  const turn = ctx.match.roundNumber + 1;
  let secs = 0;
  if (reviveDue(ctx, s)) secs = Math.max(secs, SECS.revive);
  if (s.warn && s.warnFor <= turn) secs = Math.max(secs, strike(ctx, s));
  if (stormOn(ctx) && !s.warn) setWarn(ctx, s, turn + 1);
  const natural = nightAt(ctx, turn);
  SKY.maybeEclipse(ctx, s, turn, natural);
  const eclipse = !natural && SKY.eclipseAt(s, turn), night = natural || eclipse;
  // คืนใหม่: ปีศาจรุ่นใหม่ (แกร่งขึ้นทุกคืน — ผู้ใช้สั่ง 2026-11-10) · ฟ้าสาง: ปีศาจสลาย วันใหม่ (ทหารเหล็กแกร่งขึ้น)
  const freshNight = night && !s.night, realNight = freshNight && !eclipse; // คราส = มืดแต่ไม่ใช่คืนใหม่
  if (realNight) s.nightNo = (s.nightNo || 0) + 1;
  else if (!night && s.night) { if (!s.eclipseDark) s.dayNo = (s.dayNo || 1) + 1; secs = Math.max(secs, dissolveDaemons(ctx, s) ? SECS.dawn : 0); if (!LM.on(ctx)) restoreLights(ctx, s); E.onDay(s); SKY.onDay(s); }
  s.night = night; s.eclipseDark = eclipse;
  secs = Math.max(secs, E.onNight(ctx, s, H(), realNight));
  secs = Math.max(secs, SKY.onNight(ctx, s, realNight, !!E.ev(s).blood)); // จันทร์เต็มดวง (คืนที่ไม่ใช่สีเลือด) // พระจันทร์สีเลือด (ก่อนเกิดปีศาจ — จำนวน ×1.5) · เตือนบอสต้นคืน
  // มอนเตอร์ที่อยู่แล้วขยับก่อน (ตัวที่เพิ่งเกิดเทิร์นนี้ยังไม่ขยับ)
  if (actMonsters(ctx, s)) secs = Math.max(secs, SECS.mobs + (s.mobSeqMs || 0) / 1000); // ตามอนทีละตัว (mobTimeline) แล้วค่อยไปต่อ
  if (freshNight) secs = Math.max(secs, spawnDaemons(ctx, s) ? SECS.daemonSpawn : 0);
  else if (night) {
    // เกิดซ้ำทุกเทิร์นกลางคืน จนครบจำนวนของคืนนั้น
    const want = nightTarget(ctx, s), have = mobsOf(ctx, "daemon").filter((d) => d.summon.trait !== "boss").length;
    if (have < want) secs = Math.max(secs, spawnDaemons(ctx, s, Math.min(E.scaleCount(ctx, daemonRefill(s.nightNo || 1)), want - have)) ? SECS.daemonSpawn : 0);
  }
  respawnProps(ctx, s);
  secs = Math.max(secs, dropshipTurn(ctx, s, turn));
  secs = Math.max(secs, p4PreRound(ctx, s, turn)); // ขั้น 4: รถไฟ · บัฟแคมป์ · อาวุธหลวงหมดอายุ
  secs = Math.max(secs, E.preRound(ctx, s, H(), turn, false, false)); // บอสลง · ภารกิจโซน · ขบวนเสบียง
  secs = Math.max(secs, XT.preRound(ctx, s, H(), turn, realNight));
  secs = Math.max(secs, LM.preRound(ctx, s, H(), turn)); // ผู้คร่ำครวญลง
  secs = Math.max(secs, SKY.preRound(ctx, s, H(), turn)); // ฝนดาวตก · รถไฟขนเสบียง · คราสหมด // พลังเสา · รังปีศาจ · คืนสุดท้าย · พลเรือน · ยักษ์หิน
  secs = Math.max(secs, PKS.preRound(ctx, s, H(), turn)); // การ์ดอัปเกรด (ตัดสินโหวต) · เกราะคุ้มกัน · กำแพงหมดเวลา · โชโกโบะทอง
  checkChannels(ctx, s);
  checkRiders(ctx, s); // ปีศาจ/ฟ้าผ่า/ศัตรูตีคนขี่ = ตกนก
  respawnChocos(ctx, s);
  tickMobControl(ctx); // มอนได้ตาไปแล้ว = สถานะคุมตัวลด 1
  return secs;
}
function onUnitEnd(ctx, st, p) {
  const s = st && st.eos;
  if (!s) return;
  armDrain(ctx, s, p); // ขั้น 4: ตาที่ตีด้วยอาวุธหลวง เสียเลือด 1
  checkRiders(ctx, s);
  checkChannels(ctx, s);
  noteDeaths(ctx, s);
  syncCars(ctx, s);
  beastAggro(ctx, s, p); // สัตว์ยักษ์โดนตีตานี้ = ไล่คนที่เพิ่งเดิน
  XT.onUnitEnd(ctx, s, H(), p); // ท่าร่วม (ใครตีมอนตัวไหนในเทิร์นนี้) · พลเรือนวิ่งตามคนพา
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
    const cn = riding(s, p) || !canRide(ctx, p, s) ? [] : chocoNear(ctx, s, p);
    if (cn.length) out.push({ key: "fd:mount", icon: "🐤", name: "ขี่", disabled: !canMove(ctx, p), tiles: cn.map((c) => ({ x: c.x, y: c.y })) });
    const near = carNear(ctx, s, p);
    if (near.length) out.push({ key: "fd:board", icon: "🚗", name: "ขึ้นรถ", disabled: !canMove(ctx, p), tiles: near.map((c) => ({ x: c.x, y: c.y })) });
    const bt = boardTiles(ctx, s, p);
    if (bt.length) out.push({ key: "fd:seat", icon: "💺", name: "นั่งรถ", disabled: !canMove(ctx, p) || !!ctx.match.rideAsk, tiles: bt });
  }
  if (LEVER && ctx.adjacent(p, LEVER.x, LEVER.y)) out.push({ key: "fd:lever", icon: "🌉", name: s.bridgeUp ? "ลดสะพาน" : "ยกสะพาน", disabled: !canStrike(ctx, p) || bridgeOccupied(ctx) });
  if (DOME_CORE && ctx.adjacent(p, DOME_CORE.x, DOME_CORE.y)) {
    const cd = domeOn(s) ? 0 : Math.max(0, (s.domeReadyRound || 0) - ctx.match.roundNumber);
    out.push({ key: "fd:dome", icon: "🛡️", name: domeOn(s) ? `โดม ${s.dome.left}` : "โดม", cd, disabled: !canStrike(ctx, p) || !domeReady(ctx, s) });
  }
  const sw = switchNear(ctx, p);
  if (sw) { const cd = flashCd(ctx, s, sw.zone); out.push({ key: "fd:lights", icon: "💡", name: "สาดไฟ", cd, disabled: !canStrike(ctx, p) || cd > 0 || !lit(s, sw.zone) }); }
  if (sw && lightFixable(ctx, s, p)) out.push({ key: "fd:lightfix", icon: "🔦", name: lit(s, sw.zone) ? "ซ่อมไฟ" : "เปิดไฟ", disabled: !canStrike(ctx, p), desc: `ไฟเมือง +${TOWN_LIGHT.fix} (เต็ม ${lightMax(s)})` });
  const wf = wallFixTarget(ctx, s, p);
  if (wf) out.push({ key: "fd:wallfix", icon: wf.kind === "turret" ? "🔫" : "🧱", name: wf.broken && wf.kind === "turret" ? "สร้างป้อม" : FIX_NAMES[wf.kind], disabled: !canStrike(ctx, p),
    desc: `+${CITY_WALL.fix}` });
  if (fixTargets(ctx, s, p).length) { const ft = fixTargets(ctx, s, p)[0]; out.push({ key: "fd:fix", icon: ft.kind === "car" ? "🔧" : "🥬", name: ft.kind === "car" ? "ซ่อมรถ" : "ป้อนอาหาร", disabled: !canStrike(ctx, p) }); }
  if (wreckNear(ctx, s, p).length) out.push({ key: "fd:push", icon: "🚙", name: "ผลัก", disabled: !canStrike(ctx, p) || !wreckNear(ctx, s, p).some((w) => pushTo(ctx, s, p, w)) });
  for (const el of [...new Set(flasksOf(s, p))]) {
    out.push({ key: `fd:flask:${el}`, icon: el === "fire" ? "🔥" : el === "ice" ? "❄️" : "⚡", name: `ขวด${ELEMENT_NAMES[el]}`, count: flasksOf(s, p).filter((e) => e === el).length, disabled: !canStrike(ctx, p), tiles: canStrike(ctx, p) ? flaskTiles(ctx, p) : [] });
  }
  const tur = turretNear(ctx, p);
  if (tur) { const list = canStrike(ctx, p) ? turretTargets(ctx, s, p, tur) : []; out.push({ key: "fd:turret", icon: "🔫", name: "ป้อมปืน", disabled: !list.length, tiles: list }); }
  p4Hud(ctx, s, p, out); // ขั้น 4
  TWN.hud(ctx, s, H(), p, out); // ของประจำเมือง
  E.hud(ctx, s, H(), p, out); // ช่วยเพื่อน · สำรวจภารกิจ
  XT.hud(ctx, s, H(), p, out); // พาพลเรือน · ถล่ม (มาตรวัดทีมเต็ม)
  SKY.hud(ctx, s, H(), p, out); // ขนเสบียงขึ้นรถไฟ
  PKS.hud(ctx, s, H(), p, out); // กำแพงชั่วคราว
  const sz = seizeState(ctx, s, p);
  if (sz) out.push({ key: "fd:seize", icon: "🔷", name: sz.repair ? "ซ่อมเสา" : sz.pl.ch && sz.pl.ch.by === p.id ? "ยึด 2/2" : "ยึด", disabled: !sz.ok });
  if (riding(s, p)) {
    const tiles = ctx.action.canAct(p) ? dismountTiles(ctx, s, p) : [];
    out.push({ key: "fd:dismount", icon: "🐤", name: "ลง", disabled: !tiles.length, tiles });
  }
  for (const a of out) if (!a.desc) a.desc = descOf(a, s, sz);
  return out;
}
// คำอธิบายตอนชี้ปุ่ม (ผู้ใช้สั่ง 2026-11-10 "หลายอย่างไม่มีคำอธิบาย ไม่เข้าใจอะไรเลย" — อนุญาตเฉพาะ Eos)
const HUD_DESC = {
  "fd:board": `ขึ้นขับรถคันที่ติดตัว — ยังไม่ได้เดิน = เดินต่อจากรถได้เต็มระยะ +${CAR_MOV}\nขับได้เฉพาะถนน/พื้นเรียบ · อยู่ในรถใช้สกิลไม่ได้`,
  "fd:seat": "ขอนั่งรถที่เพื่อนขับ (คนขับต้องกดยอม) — ไปกับรถ ไม่ร่วงตอนคนขับโดนตี",
  "fd:ram": `ขับชนมอนเตอร์ที่ติดรถ: ดาเมจ ${CAR_HIT_DMG} + กระเด็น 1 ช่อง (ใช้การโจมตีของตา)`,
  "fd:leave": "ลงช่องข้างตัว · รถจอดที่เดิม · จบการเดิน",
  "fd:mount": `กระโดดขึ้นหลังโชโกโบะ — ยังไม่ได้เดิน = เดินต่อจากนกได้เต็มระยะ +${CHOCO_MOV}\nผ่านป่า/น้ำตื้นกิน 1 ก้าว · โดนดาเมจ นกรับแทนก่อน (นกเลือดหมด = ตกนก นกกลับคอก)`,
  "fd:fix": `ซ่อมรถ +${CAR_FIX} / ป้อนผักให้โชโกโบะ +${CHOCO_FEED} — คันหรือตัวที่ติดตัวหรือที่ขับ/ขี่อยู่ เลือดน้อยสุดก่อน · รถพังซ่อมแล้วขับได้อีก (ใช้การโจมตี)`,
  "fd:dismount": "ลงช่องข้างตัว · นกยืนที่เดิม · จบการเดิน",
  "fd:lever": "ยก/ลดสะพานทั้งเมือง Altissia — ยกขึ้น = เดินข้ามไม่ได้ (ใช้การโจมตีของตา)",
  "fd:dome": `เปิดโดมกำแพงเวท Insomnia ${DOME_TURNS} เทิร์น — ปิดประตูเมือง ตีจากนอกโดมเข้าไปไม่ได้ (ใช้การโจมตี)`,
  "fd:lights": `สาดไฟจ้า: มอนในระยะ ${FLASH.r} ช่องจากแผงมึน 1 เทิร์น · ปีศาจโดนแสงไหม้ ${FLASH.dmg} · พัก ${FLASH.cd} เทิร์น (ใช้การโจมตี)`,
  "fd:push": "ผลักซากรถไป 1 ช่อง ใช้ปิดทาง (ใช้การโจมตี)",
  "fd:turret": `ยิงมอนเตอร์ในระยะ ${TURRET_RANGE} ช่อง ดาเมจ ${TURRET_DMG} (ใช้การโจมตี)`,
  "fd:tunnel": "ลอดอุโมงค์ไปออกปากอีกฝั่งทันที (จบการเดินของตา)",
  "fd:gondola": "นั่งกอนโดลาไปท่าอื่นใน Altissia (จบการเดินของตา)",
  "fd:fish": "ตกปลา (ใช้การโจมตี): ได้ปลาเข้าถุง (ถือได้ 3 — เอาไปทำอาหารทีมที่แคมป์) · เหรียญ · ปลาทอง · หรือปลายักษ์ลากลงน้ำ ดาเมจ 2",
  "fd:tomb": `เปิดสุสานราชวงศ์ (แห่งละครั้ง): อาวุธจักรพรรดิ ${ARM_TURNS} เทิร์น — แต่ละอันผลต่างกัน · ตาที่ตีเสียเลือด 1`,
  "fd:bounty": "รับค่าหัวจากบอร์ดร้าน — ล้มเป้าหมายได้ = เหรียญ (ถือได้ทีละใบ)",
};
const FLASK_DESC = {
  fire: `ขว้างไกล ${FLASK_RANGE} ช่อง วง 3×3: ดาเมจ ${FIRE_DMG} + ลุกไหม้ · ไฟลามป่า (ใช้การโจมตี)`,
  ice: `ขว้างไกล ${FLASK_RANGE} ช่อง วง 3×3: เชื่องช้า · น้ำในวงกลายเป็นทางน้ำแข็ง (ใช้การโจมตี)`,
  thunder: `ขว้างไกล ${FLASK_RANGE} ช่อง วง 3×3: ดาเมจ ${THUNDER_DMG} · โดนน้ำ = ช็อตทุกตัวในผืนน้ำเดียวกัน (ใช้การโจมตี)`,
};
function descOf(a, s, sz) {
  if (a.key === "fd:seize") {
    if (sz && sz.repair) return `ซ่อมเสาที่มอนเตอร์ตี — ล้างรอยตี (ตีครบ ${pillarHp(s)} ครั้ง = เสาหลุด) · ใช้การโจมตีของตา`;
    return "ร่ายพิธียึดเสา 2 ตาติดกัน (ใช้การโจมตีของตา) — ระหว่างนั้นโดนดาเมจ/ออกห่าง = พิธีแตก\nเสาที่ยึดได้ = แต้มรวมทุกจบเทิร์น";
  }
  if (a.key.startsWith("fd:flask:")) return FLASK_DESC[a.key.slice(9)] || "";
  if (a.key.startsWith("fd:tram:")) return `นั่งรถรางไปป้าย ${ZONE_NAMES[a.key.slice(8)] || ""} (จบการเดินของตา) · คนละ ${TRAM.uses} เที่ยว แล้วพัก ${TRAM.cd} เทิร์น`;
  void s;
  return HUD_DESC[a.key] || "";
}
function charAction(ctx, st, p, key, tile) {
  const s = st && st.eos;
  if (s && p && typeof key === "string" && key.startsWith("fd:perk:")) return PKS.action(ctx, s, H(), p, key, tile); // โหวตการ์ดทีม (คนที่ล้มก็โหวตได้)
  if (!s || !p || !p.pos) return false;
  const tw = TWN.action(ctx, s, H(), p, key);
  if (tw !== null) return tw;
  const p4 = p4Action(ctx, s, p, key, tile);
  if (p4 !== null) return p4;
  const ex = E.action(ctx, s, H(), p, key, tile);
  if (ex !== null) { if (ex && key === "fd:help") XT.stat(s, p.id, "saves"); return ex; }
  const sk = SKY.action(ctx, s, H(), p, key, tile);
  if (sk !== null) return sk;
  const xt = XT.action(ctx, s, H(), p, key, tile);
  if (xt !== null) return xt;
  const pk = PKS.action(ctx, s, H(), p, key, tile);
  if (pk !== null) return pk;
  if (key === "fd:board") return boardCar(ctx, s, p, tile);
  if (key === "fd:leave") return leaveCar(ctx, s, p, tile);
  if (key === "fd:ram") return ram(ctx, s, p, tile);
  if (key === "fd:seat") return askRide(ctx, s, p, tile);
  if (key === "fd:mount") return mountNear(ctx, s, p, tile);
  if (key === "fd:seize") return seize(ctx, s, p);
  if (key === "fd:lever") return pullLever(ctx, s, p);
  if (key === "fd:dome") return raiseDome(ctx, s, p);
  if (key === "fd:lights") return flipLights(ctx, s, p);
  if (key === "fd:lightfix") return fixLights(ctx, s, p);
  if (key === "fd:push") return pushWreck(ctx, s, p);
  if (key === "fd:fix") return fixVehicle(ctx, s, p);
  if (key === "fd:wallfix") return fixWall(ctx, s, p);
  if (key === "fd:turret") return fireTurret(ctx, s, p, tile);
  if (typeof key === "string" && key.startsWith("fd:flask:")) return throwFlask(ctx, s, p, key.slice(9), tile);
  if (key === "fd:dismount") { // ลงแบบรถ (ผู้ใช้ 2026-11-14): เราก้าวลงช่องข้างตัว · นกยืนที่เดิม · จบการเดิน
    if (!riding(s, p) || !ctx.action.canAct(p) || !tile) return false;
    if (!dismountTiles(ctx, s, p).some((t) => t.x === tile.x && t.y === tile.y)) return false;
    const c = unride(ctx, s, p.id);
    if (!c) return false;
    const from = { ...p.pos };
    c.rider = null; c.x = from.x; c.y = from.y;
    p.pos = { x: tile.x, y: tile.y };
    const a = ctx.match.action;
    if (a) { a.from = { ...p.pos }; a.trail = null; a.path = null; a.locked = true; }
    ctx.bump();
    ctx.fx("choco_dismount", { id: p.id, choco: c.id, x: from.x, y: from.y, to: { ...tile } });
    ctx.log(`🐤 ${p.name} ลงจากโชโกโบะ`);
    return true;
  }
  return false;
}

// ============================================================ ของที่ตีได้ (ถังน้ำมัน · หินพลังเวท · หีบสมบัติ — มอนเตอร์เป็นยูนิตจริง ตีด้วยการโจมตีปกติ)
function objects(ctx, st) {
  const s = st && st.eos;
  if (!s) return [];
  return [
    ...(s.chests || []).map((c) => ({ id: c.id, x: c.x, y: c.y, kind: "chest", name: "หีบสมบัติ", strike: true })),
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
  const ch = (s.chests || []).find((o) => o.id === objId);
  if (ch) { openChest(ctx, s, ch, p); return 1.4; }
  return false;
}

// ============================================================ ข้อมูลให้ client
function publicInfo(ctx, st) {
  const s = st && st.eos;
  if (!s) return {};
  syncCars(ctx, s); // รถที่มีคนขับตามตำแหน่งคนขับ (ชั้นแผนที่แคชไว้ — ไม่ได้เรียก layer ทุกครั้งที่เดิน)
  const riders = {};
  for (const [pid, r] of Object.entries(s.riders)) riders[pid] = r.choco;
  return {
    eos: true,
    night: !!s.night,
    cars: s.cars.map((c) => ({ id: c.id, img: c.img, x: c.x, y: c.y, size: 1, driver: c.driver || null, dx: c.dx || 0, dy: c.dy || 0, hp: c.hp ?? CAR_HP, maxHp: CAR_HP, broken: !!c.broken })),
    ...p4Public(ctx, s), // ขั้น 4: ราง/ชานชาลา · อุโมงค์ · ท่ากอนโดลา · แคมป์ · จุดตกปลา · สุสาน
    chocos: s.chocos.map((c) => ({ id: c.id, x: c.x, y: c.y, rider: c.rider, home: { ...c.home }, hp: c.hp ?? CHOCO_HP, maxHp: CHOCO_HP })),
    riders,
    daemons: mobsOf(ctx, "daemon").map((d) => ({ id: d.id, x: d.pos.x, y: d.pos.y, hp: d.hp, maxHp: d.summon.maxHp, armor: d.armor, maxArmor: d.summon.maxArmor, kind: d.summon.look, tier: d.summon.tier || 1, trait: d.summon.trait || null, face: d.summon.face || null, cd: d.summon.cdUntil > ctx.match.roundNumber ? 1 : 0, elite: ELT.publicOf(d), atk: mobAtkOf(ctx, d) })),
    warn: [
      ...(s.warn || []).map((t) => ({ x: t.x, y: t.y, kind: "lightning" })),
      ...(s.ships || []).filter((d) => d.state === "warn").flatMap((d) => [0, 1].flatMap((dy) => [0, 1].map((dx) => ({ x: d.x + dx, y: d.y + dy, kind: "dropship" })))),
    ],
    pillars: s.pillars.map((pl) => ({
      id: pl.id, zone: pl.zone, x: pl.x, y: pl.y, owner: pl.owner, color: pl.owner ? sideColor(ctx, pl.owner) : null,
      ch: pl.ch ? { by: pl.ch.by, color: sideColor(ctx, pl.ch.side), round: pl.ch.round } : null,
      hits: pl.hits || 0, hp: pillarHp(s), ward: pl.ward || 0, wardMax: E.WARD_MAX,
    })),
    pve: true,
    ...E.publicOf(ctx, s, H()), // diff · blood · boss · bossWarn · quests · convoy · spirits
    ...XT.publicOf(ctx, s, H()), // final · powers · gauge · giant · civs · lightR · stats · titles
    sky: SKY.publicOf(ctx, s), // คราส · จันทร์เต็มดวง · ดาวตก · รถไฟขนเสบียง
    ...MBS.publicOf(ctx, s),
    eosSum: publicSum(ctx, s), // สรุปจบเกม
    bossBig: BB.publicOf(ctx, mobsOf(ctx, "daemon").filter((d) => d.summon.trait === "boss")), // ท่าใหญ่ที่เตือนไว้
    ...TWN.publicOf(ctx, s), // ของประจำเมือง // วงเวทของมอนที่รอระเบิด
    ...LM.publicOf(ctx, s), // Lament: ชีวิตทีม · คำสาป · ผู้คร่ำครวญ
    ...PKS.publicOf(ctx, s), // perks · perkOffer · perkAt · challenges · walls · wallCharges
    goal: E.goalOf(ctx),
    score: s.score || 0,
    rate: rateOf(heldCount(s)),
    lastGain: s.lastGain || 0,
    nightNo: s.nightNo || 0, dayNo: s.dayNo || 1, kills: s.kills || 0,
    cycleLeft: (() => { const r = ctx.match.roundNumber, n0 = nightAt(ctx, r); let k = 1; while (k < 12 && nightAt(ctx, r + k) === n0) k++; return k; })(), // อีกกี่เทิร์นสลับกลางวัน/คืน
    revive: Object.entries(s.dead).map(([id, r]) => ({ id, at: r + reviveTurns(s), gone: LM.gone(s, id) || undefined })),
    chests: (s.chests || []).map((c) => ({ id: c.id, x: c.x, y: c.y })),
    bridgeUp: !!s.bridgeUp,
    dome: domeOn(s) ? { left: s.dome.left, rect: INSOMNIA, hp: s.dome.hp ?? DOME_HP, maxHp: DOME_HP, gates: DOME_GATES.map((t) => ({ ...t })) } : null,
    lightsOff: { ...(s.lightsOff || {}) },
    townLight: { max: lightMax(s), hp: Object.fromEntries(TOWNS.map((z) => [z.id, lit(s, z.id) ? lightHp(s, z.id) : 0])) }, // ไฟเมืองที่ปีศาจทุบ (ปิดล้อม)
    muster: s.muster && s.muster.mode ? { x: s.muster.c.x, y: s.muster.c.y, mode: s.muster.mode, ring: MUSTER.ring } : null,
    cityWalls: { max: CITY_WALL.hp, hurt: Object.entries(s.wallHp || {}).map(([k, hp]) => { const [x, y] = k.split(",").map(Number); return { x, y, hp }; }), broken: Object.keys(s.wallBroken || {}).map((k) => { const [x, y] = k.split(",").map(Number); return { x, y }; }) },
    domeReadyAt: s.domeReadyRound || 0,
    wrecks: (s.wrecks || []).map((w) => ({ ...w })),
    barrels: (s.barrels || []).map((b) => ({ id: b.id, x: b.x, y: b.y })),
    crystals: (s.crystals || []).map((c) => ({ id: c.id, x: c.x, y: c.y, element: c.element, ...(c.meteor ? { meteor: true } : null) })),
    mobs: mobsOf(ctx).filter((m) => mobType(m) !== "daemon").map((m) => ({ id: m.id, type: mobType(m), x: m.pos.x, y: m.pos.y, hp: m.hp, maxHp: m.summon.maxHp, armor: m.armor, maxArmor: m.summon.maxArmor, aggro: m.summon.aggro || null, tier: m.summon.tier || 1, trait: m.summon.trait || null, face: m.summon.face || null, elite: ELT.publicOf(m), atk: mobAtkOf(ctx, m) })),
    ships: (s.ships || []).map((d) => ({ id: d.id, x: d.x, y: d.y, state: d.state })),
    dropship: (s.ships || []).find((d) => d.state === "landed") || null,
  };
}
function playerInfo(ctx, st, p) {
  const s = st && st.eos;
  if (!s) return undefined;
  const badges = [];
  if (riding(s, p)) badges.push({ key: "choco", icon: "🐤", label: "โชโกโบะ", cls: "bg-yellow-300 text-gray-900" });
  if (driving(s, p)) badges.push({ key: "car", icon: "🚗", label: "รถ", cls: "bg-amber-200 text-gray-900" });
  p4Badges(s, p, badges);
  if (allyNear(ctx, p)) badges.push({ key: "ally", icon: "🤝", label: `ร่วมแรง ตี +${ALLY.atk}`, cls: "bg-emerald-200 text-gray-900" });
  for (const el of flasksOf(s, p)) badges.push({ key: `flask_${el}_${badges.length}`, icon: el === "fire" ? "🔥" : el === "ice" ? "❄️" : "⚡", label: `ขวด${ELEMENT_NAMES[el]}`, cls: "bg-indigo-200 text-gray-900" });
  // พลังตีใส่มอน (ป้ายชี้ผู้เล่น — ผู้ใช้ 2026-11-14 "ทำทุกข้อ"): ประเมินกับมอนที่ใกล้สุด · ไม่มีมอน = null
  let atk = null;
  if (p && p.alive && p.pos && !p.summon) {
    const m = mobsOf(ctx).filter((u) => u.pos).sort((a, b) => manhattan(a.pos, p.pos) - manhattan(b.pos, p.pos))[0];
    if (m) { const v = require("../phases/attack").estimateAttackOn(p, m); if (Number.isFinite(v)) atk = v; }
  }
  if (!badges.length && atk == null) return undefined;
  return { choco: riding(s, p), car: driving(s, p), badges, atk };
}

module.exports = {
  FLASH, MOB_SEQ, mobTimeline, campRest, MOB_CAP, mobRoom, bigBusy, bigFree, H, SKY, magnetOn, DOME_HP, gateShut, turretUp, CITY_WALL, hitWall, fixWall, isCityWall, DOME_COOLDOWN,
  absorbDamage, ALLY, allyNear, CAR_HP, CHOCO_HP, CAR_FIX, CHOCO_FEED, MECH, TEAM_MEALS, FISH_MAX,
  incoming(ctx, st, p, n, src, kind) { const s = st && st.eos; if (!s || !p) return n; if (isMob(p)) return ELT.toMob(ctx, s, H(), p, MBS.incoming(ctx, s, p, n, src), src); if (!(src && isMob(src))) return n; const out = fairHit(s, p, AR.guard(armRec(s, p), ELT.toHero(ctx, s, H(), p, n, src)), src); sumHit(s, p, src, out); return out; }, // ทหารโล่ · Shield of the Just
  rangeMod(ctx, st, p, r) { const s = st && st.eos, add = s && p && !p.summon ? AR.rangeOf(armRec(s, p)) : 0; return add && Array.isArray(r) ? [r[0], r[1] + add] : r; }, // Bow of the Clever
  critPct(ctx, st, p) { const s = st && st.eos; return s && p && !p.summon ? AR.critOf(armRec(s, p)) : 0; }, // Swords of the Wanderer
  strikePierces(ctx, st, p) { const s = st && st.eos; return !!(s && p && !p.summon && AR.piercesOf(armRec(s, p))); }, // Katana of the Warrior
  onStrikeLanded(ctx, st, p, target) { const s = st && st.eos, r = s && p && !p.summon ? armRec(s, p) : null; return r ? AR.landed(ctx, s, H(), p, r, target) : null; },
  preventDeath(ctx, st, p) { return !!(st && st.eos) && PKS.gutsSave(ctx, st.eos, p); }, // การ์ดใจสู้
  enter, weatherStart, layer, keepsTile, CHASM_TURNS, layerVer, movMod, flatWalk, carWalk, carSeats, carDriver, noSkill, atkBonus, onKill, preRound, onUnitEnd, onEndTurn,
  hudActions, charAction, objects, strikeObject, vision, hides, publicInfo, playerInfo, winner, shields,
  gysahlOnSale, useGysahl, wardOnSale, useWard, useBarricade, keepsCorpse, reviveOnSale, useRevive, reviveTargets, REVIVE_ITEM, onConvoyDeath, onCivDeath, pillarHp, reviveTurns,
  // ผลค้างทั้งแมตช์ (fodlan.persistAll): การ์ดทนทาน = เลือดสูงสุด +2
  persist: { maxHpBonus(ctx, st, p) { return st && st.eos && p && !p.summon ? PKS.hpBonus(st.eos) : 0; } }, addScore, bomberBlast, healerAct, TRAIT, pickTrait, nightTarget, explodeBarrel, throwFlask, fireTurret, actMonsters, spawnBeast, dropshipTurn, respawnProps, hurt, TURRETS, outcome, onMobDeath, isMob, mobsOf, spawnMob, spawnChests, openChest, mountNear, hitPillar,
  PILLAR_HP, PVE, MOB_SIDE, daemonStats, magitekStats, daemonCount, CHEST_EVERY, CHEST_MAX, DAY_DROP_PCT,
  BARREL_DMG, BARREL_BURN, FLASK_RANGE, FLASK_MAX, THUNDER_DMG, SHOCK_DMG, TURRET_DMG, TURRET_RANGE, BEAST, MAGITEK, BRIDGES, LEVER, DOME_CORE, DOME_GATES, DOME_TURNS, GYSAHL_RANGE, blockedTown,
  // เทสต์
  sandOn, inDesert, SAND_SIGHT, MOB_CONTROL, tickMobControl, LM, dimLights, eosPriceMul, TRAM, tramOff, MUSTER, musterTick, TOWN_LIGHT, siegeLight, fixLights, restoreLights, lit, raidPlan, openPillars, RAID, BOSS_AI, turretZone, TRAM_STOPS, rideTram, lightBound, wallFixTarget,
  prey, sideOf, scoreRound, reviveDue, noteDeaths, sideSight, seizeState, heldCount, rateOf, checkChannels, SCORE_GOAL, SCORE_TABLE, REVIVE_TURNS, SIGHT_EXTRA,
  carCells, carOf, canRide, driving, boardCar, leaveCar, ram, ramTargets, syncCars, CAR_OFF, CAR_SEATS, CAR_MOV, checkRiders, spawnDaemons, dissolveDaemons, inTown, zoneAt, ROAD,
  trainTurn, p4State, huntDone, TRAIN_EVERY, TRAIN_DMG, CAMP_TURNS, CAMP_CD, ARM_TURNS, BOUNTY,
  MOV_BONUS, WALK_MAX, CHOCO_MOV, CHOCO_RESPAWN, CAR_HIT_DMG, DAEMON_COUNT, DAEMON_HP, DAEMON_ARMOR, DAEMON_ATK, DAEMON_MOV, DAEMON_GOLD,
  LIGHTNING_COUNT, LIGHTNING_DMG,
};
