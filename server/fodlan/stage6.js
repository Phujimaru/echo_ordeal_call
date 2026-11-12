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

const MOV_BONUS = 2;          // ทุกคนบน Eos
const WALK_MAX = 5;           // ผู้ใช้สั่ง 2026-11-09: โบนัส +2 ดันระยะเดินได้ไม่เกิน 5 · ค่าเริ่มต้นเกิน 5 / บัฟระยะเดิน (รองเท้า ฯลฯ) ปล่อยตามเดิม · ขี่โชโกโบะ/ขับรถบวกเพิ่ม
const CHOCO_MOV = 2;          // ขี่โชโกโบะ (ผู้ใช้สั่ง 2026-11-10: น้อยกว่ารถ +3)
const CHOCO_RESPAWN = 3;      // ตกนกแล้วเกิดใหม่ที่คอกหลัง N เทิร์น
// พาหนะมีเลือด (ผู้ใช้สั่ง 2026-11-10 "รถพังได้ มีหลอดเลือดสีเขียว โชโกโบะก็เช่นกัน · โดนดาเมจเข้ารถ/นกก่อน · ซ่อม/รักษาได้") — ตัวเลข Claude ตั้ง
const CAR_HP = 6, CHOCO_HP = 4, CAR_FIX = 3, CHOCO_FEED = 2, FIX_SECS = 1.0;
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
// โหมด PVE (ผู้ใช้สั่ง 2026-11-10 — แทนการแข่งยึดเสา): ผู้เล่นทุกคนฝ่ายเดียวกัน ยึดเสา 5 ต้น · แต้มรวมต่อเทิร์นตามจำนวนเสาที่ถือ
//  ถึง 50 = ทุกคนชนะ · มอนเตอร์ตีเสาที่ยึดแล้ว 2 ครั้ง = เสาหลุดกลับเป็นกลาง · ผู้เล่นล้มหมดพร้อมกัน = แพ้
const SCORE_GOAL = 50; // เป้าปกติ — ระดับยาก 100 (eosEvents.DIFF.goal / goalOf)
const SCORE_TABLE = [0, 1, 2, 4, 6, 8]; // ปรับสมดุล 2026-11-10 (เดิม 1/3/6/10/15 — ผู้ใช้เลือกตามข้อเสนอ Claude)
const PILLAR_HP = 2;          // มอนตีเสาครบกี่ครั้ง = เสาหลุด
const PVE = "pve";            // ฝ่ายของผู้เล่นทุกคน
const MOB_SIDE = "eosmob";    // ฝ่ายของมอนเตอร์ทุกตัว (summon.side)
const MOB_OWNER = { id: "eos", name: "Eos", position: 0, customColor: null, teamId: null }; // เจ้าของสมมติของมอนเตอร์ (แบบ Moon Cell)
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
let VISIT = 0;

const bodies = (ctx) => ctx.combat.alivePlayers().filter((p) => p.pos);
// มอนเตอร์ = ยูนิตที่ถูกเรียก (server/summon.js) ฝ่าย MOB_SIDE — ได้ผลผลัก/ไถล/สถานะ/สกิลทุกอย่างจากระบบเดิม (ผู้ใช้สั่ง 2026-11-10)
const isMob = (p) => !!(p && p.summon && p.summon.side === MOB_SIDE);
const mobsOf = (ctx, type = null) => Object.values(ctx.match.players).filter((p) => isMob(p) && p.alive && p.pos && (!type || p.summon.mobType === type));
const heroes = (ctx) => bodies(ctx).filter((p) => !isMob(p));
const lazySummon = () => require("../summon");
const sizeOf = (ctx, p) => Math.max(1, ctx.action.sizeOf(p) | 0);
const footOf = (ctx, p) => ctx.Board.footprint(p.pos.x, p.pos.y, sizeOf(ctx, p));
const stormOn = (ctx) => !!(ctx.weather && ctx.weather.kind === "eos_storm");
const fogOn = (ctx) => !!(ctx.weather && ctx.weather.kind === "eos_fog");
// พายุหิมะ (ผู้ใช้สั่ง 2026-11-10 — ผลเป็นข้อเสนอของ Claude): ทุกคนและมอนทุกตัวเดิน −1 · ในเมืองหรือในวงไฟแคมป์ (2 ช่อง) อุ่น = ไม่โดน
const snowOn = (ctx) => !!(ctx.weather && ctx.weather.kind === "eos_snow");
// พายุแม่เหล็ก (PVE รอบหก): มอน (ไม่ใช่สัตว์ยักษ์) เห็นผู้เล่นแค่ SKY.MAGNET.sight ช่อง · มินิแมพรวน (client)
const magnetOn = (ctx) => !!(ctx.weather && ctx.weather.kind === "eos_magnet");
const SNOW_MOV = -1, SNOW_WARM_R = 2;
function warmAt(x, y) { return !!townOf(x, y) || MAP.CAMPS.some(([cx, cy]) => Math.abs(cx - x) + Math.abs(cy - y) <= SNOW_WARM_R); }
const snowMov = (ctx, u) => (snowOn(ctx) && u && u.pos && !warmAt(u.pos.x, u.pos.y) ? SNOW_MOV : 0);
const sandOn = (ctx) => !!(ctx.weather && ctx.weather.kind === "eos_sand");
const SAND_SIGHT = 2;
const DESERT = (MAP.ZONES.find((z) => z.id === "desert") || { rect: [13, 20, 31, 31] }).rect;
const inDesert = (x, y) => inRect(DESERT, x, y);
const nightAt = (ctx, round) => { try { return !!ctx.engine.isNightRound(round); } catch { return false; } };

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

// ============================================================ ระยะเดิน
function riding(s, p) { return !!(s && p && s.riders[p.id]); }
function movMod(ctx, st, p) {
  const s = st && st.eos;
  if (!s || !p) return 0;
  const base = Number(ctx.action.baseMovOf ? ctx.action.baseMovOf(p) : require("../phases/action").baseMovOf(p)) || 0;
  const capHook = require("../../characters/index")[p.characterId]; // ฮุค eosWalkMax(p) → เพดานเฉพาะตัว (เฟิร์น: ฐาน 4 +2 = 6 — ผู้ใช้สั่ง 2026-11-11)
  const cap = Number((capHook && capHook.eosWalkMax && capHook.eosWalkMax(p)) || WALK_MAX);
  const walk = Math.max(0, Math.min(base + MOV_BONUS, cap) - base); // เดินเท้า: +2 แต่ไม่เกิน 5 · ตัวที่ค่าเริ่มต้นเกิน 5 อยู่แล้ว/บัฟระยะเดิน = ปล่อยตามเดิม (ผู้ใช้สั่ง)
  return walk + p4MovBonus(s, p) + (riding(s, p) ? CHOCO_MOV : 0) + (driving(s, p) ? CAR_MOV : 0) + XT.movBonus(s, p, riding(s, p), driving(s, p)) + PKS.movBonus(s) + (driving(s, p) ? TWN.carMov(ctx, s, H(), p) : 0) + (stormOn(ctx) ? STORM_MOV : 0) + snowMov(ctx, p);
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
    const dealt = hurt(ctx, u, CAR_HIT_DMG + XT.ramBonus(s), p); // พลังเสา Hammerhead: ชน +1
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
function atkBonus(ctx, st, p, target = null) { const s = st && st.eos; return s && p ? p4AtkBonus(s, p) + XT.comboBonus(ctx, s, H(), p, target) + (target && isMob(target) && !isMob(p) ? PKS.atkBonusVsMob(s) + weakBonus(p, target) : 0) : 0; } // + ท่าร่วม (ตีมอนที่เพื่อนตีแล้วในเทิร์นนี้)
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
function weakBonus(p, target) { return behindMech(p, target) ? MECH.weak : 0; }
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

// ============================================================ ช่องว่าง
// ช่องเดินได้ ว่าง (ไม่มีคน ไม่มีสิ่งกีดขวาง/ปีศาจ ไม่ใช่รถ/โชโกโบะ)
function tileFree(ctx, s, x, y, selfId = null) {
  if (!ctx.free(x, y, selfId)) return false;
  for (const c of s.cars) if (!c.driver && c.x === x && c.y === y) return false;
  if (s.chocos.some((c) => !c.rider && c.x === x && c.y === y)) return false;
  if ((s.barrels || []).some((b) => b.x === x && b.y === y) || (s.crystals || []).some((c) => c.x === x && c.y === y)) return false;
  if ((s.chests || []).some((c) => c.x === x && c.y === y)) return false;
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

// ============================================================ มอนเตอร์ (ยูนิตที่ถูกเรียก — server/summon.js · ผู้ใช้สั่ง 2026-11-10)
//  ปีศาจ (กลางคืน · แกร่งขึ้นทุกคืน) · สัตว์ยักษ์ (ป่า Duscae) · ทหารเหล็ก (ยานลงจอด · กลางวันลงบ่อย หลายจุดพร้อมกัน)
//  เป็นยูนิตจริงใน match.players (ฝ่าย MOB_SIDE) → โดนผลัก/ไถลน้ำแข็ง/สถานะ/สกิลเลือกเป้าทุกแบบเหมือนผู้เล่น
//  ทุกตัวขยับพร้อมกันต้นเทิร์น (actMonsters — ไม่มีตาเดินของตัวเอง · ผู้ใช้เลือก) · สตั้น/หลับ = ไม่ขยับ · ระยะเดินผ่าน action.movOf (ตรึง/เชื่องช้ามีผล)
//  เป้า: ผู้เล่นที่ใกล้สุด หรือเสาที่ผู้เล่นยึดไว้ (ตี PILLAR_HP ครั้ง = เสาหลุด) · ทหารเหล็กเล็งเสาก่อน
//  ตาย = server/summon.js onDeath → onMobDeath: เหรียญ + ของดรอป + ค่าหัว (ผู้ใช้สั่ง "กำจัดมอนต้องได้ของ")
const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const MOB_NAMES = { daemon: "ปีศาจ", beast: "สัตว์ยักษ์", magitek: "ทหารเหล็ก", nest: "รังปีศาจ", giant: "ยักษ์หิน", gold: "โชโกโบะทอง", lament: "ผู้คร่ำครวญ" };
const MOB_COLORS = { daemon: "#8a2f9c", beast: "#7a5230", magitek: "#59636f", nest: "#5a1a4a", giant: "#7d7568", gold: "#f2c21b", lament: "#2a1838" };
const daemonImg = (k) => `/eos/img/daemon${((Number(k) || 1) - 1) % 8 + 1}.webp`;
// ค่าพลังตามคืน/วัน (n = 1, 2, 3 …) — Claude ตั้งตัวเลข
function daemonStats(n) {
  const k = Math.max(0, (n | 0) - 1);
  return { hp: DAEMON_HP + 2 * k, armor: DAEMON_ARMOR + Math.floor(k / 2), atk: Math.min(5, DAEMON_ATK + Math.floor(k / 2)), mov: Math.min(6, DAEMON_MOV + Math.floor(k / 3)), gold: DAEMON_GOLD + Math.floor(k / 2) };
}
const daemonCount = (n) => Math.min(18, DAEMON_COUNT + 2 * Math.max(0, (n | 0) - 1));
const daemonRefill = (n) => DAEMON_REFILL + Math.floor(Math.max(0, (n | 0) - 1) / 2);
function magitekStats(n) {
  const k = Math.max(0, (n | 0) - 1);
  return { hp: MAGITEK.hp + k, armor: MAGITEK.armor + Math.floor(k / 2), atk: Math.min(4, MAGITEK.atk + Math.floor(k / 2)), mov: MAGITEK.mov, gold: MAGITEK.gold + Math.floor(k / 2) };
}
function spawnMob(ctx, s, type, at, stats, extra = {}) {
  const look = extra.look || null;
  const elite = ELT.roll(ctx, s, H(), type, extra);
  if (elite) stats = ELT.stats(stats, elite);
  const baseName = (extra.trait && (MBS.nameOf(type, extra.trait) || TRAIT_NAMES[extra.trait])) || (MOB_NAMES[type] + (extra.tier > 1 ? ` ${"I".repeat(Math.min(3, extra.tier))}` : ""));
  const rec = lazySummon().spawn(MOB_OWNER, {
    kind: "eosMob", pos: { x: at.x, y: at.y }, hp: stats.hp, armor: stats.armor + (type !== "lament" && LM.curse(s, "plate") ? 1 : 0), mov: stats.mov, range: [1, 1],
    name: elite ? ELT.nameOf(baseName) : baseName,
    img: type === "lament" ? "/eos/img/lament.webp" : type === "daemon" ? daemonImg(look) : type === "magitek" ? (extra.trait === "mech" ? "/eos/img/magitek_ex.webp" : "/eos/img/magitek.webp") : null,
    color: MOB_COLORS[type],
    data: { side: MOB_SIDE, eos: s.visit, mobType: type, atk: stats.atk, gold: stats.gold, look, tier: extra.tier || 1, trait: extra.trait || null, roarAt: ctx.match.roundNumber + 1, ship: extra.ship || null, home: extra.home || null, aggro: null, aggroUntil: 0, mark: stats.hp + stats.armor, born: ctx.match.roundNumber + 1, elite: elite || null },
  });
  if (rec && elite && rec.pos) {
    ctx.fx("elite_spawn", { id: rec.id, x: rec.pos.x, y: rec.pos.y, affixes: elite });
    ctx.log(`👑 ${rec.name}ปรากฏ! (${elite.map((a) => ELT.AFFIX_NAMES[a]).join(" · ")})`);
  }
  return rec;
}
const mobType = (m) => (m && m.summon ? m.summon.mobType : null);
// มอนพิเศษมีนิสัย (ผู้ใช้เลือก 2026-11-10): ระเบิด · หมอ · ยิงไกล · บอส (ราชาปีศาจ — eosEvents)
const TRAIT_NAMES = { bomber: "ปีศาจระเบิด", healer: "ปีศาจหมอ", sniper: "ทหารเหล็กยิงไกล", boss: "ราชาปีศาจ", mech: "หุ่นเกราะจักรวรรดิ" };
const TRAIT = { bombDmg: 3, healAmt: 2, healReach: 2, sniperRange: 3, sniperDmg: 2, healerMax: 2 };
function pickTrait(ctx, s) {
  return MBS.pickDaemon(ctx, s, H()); // ระเบิด/หมอ + 8 แบบใหม่ (eosMobs — โอกาสตามความยาก)
}
function pickTraitOld(ctx, s) {
  if ((s.nightNo || 0) < 2) return null;
  const r = ctx.rng();
  if (r < 0.18) return "bomber";
  if (r < 0.3 && mobsOf(ctx, "daemon").filter((m) => m.summon.trait === "healer").length < TRAIT.healerMax) return "healer";
  return null;
}
function traitStats(st, trait) {
  const nx = MBS.stats(st, trait);
  if (nx) return nx;
  if (trait === "bomber") return { ...st, hp: Math.max(1, Math.round(st.hp * 0.7)), armor: 0, atk: TRAIT.bombDmg };
  if (trait === "healer") return { ...st, atk: 0, mov: Math.max(3, st.mov - 1) };
  if (trait === "sniper") return { ...st, hp: Math.max(1, st.hp - 1), atk: TRAIT.sniperDmg };
  if (trait === "mech") return { ...st, hp: st.hp * 2 + 2, armor: st.armor + 2, atk: st.atk + 1, mov: Math.max(2, st.mov - 1), gold: st.gold * 3 + 2 }; // หุ่นเกราะ: ถึก ตีแรง เดินช้า เหรียญเยอะ
  return st;
}
// ความเสียหายจากด่านที่มีต้นเหตุ (by = ผู้เล่น — ฆ่าได้ = เครดิต/ของรางวัล · พวกเดียวกันไม่โดน)
function hurt(ctx, u, n, by = null) {
  if (!u || !u.alive) return 0;
  if (by && u.id !== by.id && ctx.combat.sameTeam && ctx.combat.sameTeam(by, u)) return 0;
  return by ? ctx.combat.withEffectSource(by, () => ctx.damage(u, n)) : ctx.damage(u, n);
}
// กระจายทั่วแผนที่: แบ่งกระดานเป็นช่องตาราง 8×8 → สุ่มช่องละไม่เกิน 1 ตัวก่อน (ตารางที่ยังไม่มีปีศาจก่อน) แล้วค่อยซ้ำ
function spawnDaemons(ctx, s, n = nightTarget(ctx, s)) {
  const map = ctx.map(), units = heroes(ctx);
  const cell = (t) => `${Math.floor(t.x / 8)},${Math.floor(t.y / 8)}`;
  const buckets = new Map();
  for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) {
    if (blockedTown(s, x, y) || !tileFree(ctx, s, x, y) || onRail(x, y) || XT.lightSafe(H(), x, y)) continue;
    if (units.some((p) => footOf(ctx, p).some((t) => manhattan(t, { x, y }) < DAEMON_SPAWN_GAP))) continue;
    const k = cell({ x, y });
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push({ x, y });
  }
  const taken = new Set(mobsOf(ctx, "daemon").map((d) => cell(d.pos)));
  const keys = ctx.pick([...buckets.keys()], buckets.size);
  keys.sort((a, b) => (taken.has(a) ? 1 : 0) - (taken.has(b) ? 1 : 0));
  const picked = [];
  // เสาที่ยึดไว้แต่ไม่มีคนเฝ้า = ปีศาจโผล่ใกล้ๆ เสาละ 2 ตัว (ผู้ใช้แจ้ง 2026-11-11 — ผู้บัญชาการฝูงมอน)
  for (const pl of openPillars(ctx, s).filter((o) => !blockedTown(s, o.x, o.y))) {
    const near = [...buckets.values()].flat().filter((t) => { const d = manhattan(t, pl); return d >= 3 && d <= 7; });
    for (const t of ctx.pick(near, near.length)) {
      if (picked.length >= n || picked.filter((o) => manhattan(o, pl) <= 7).length >= 2) break;
      if (!picked.some((o) => manhattan(o, t) < 2)) picked.push(t);
    }
  }
  for (let round = 0; picked.length < n && round < 4; round++) {
    for (const k of keys) {
      if (picked.length >= n) break;
      const free = buckets.get(k).filter((t) => !picked.some((o) => manhattan(o, t) < 2));
      const t = ctx.pick(free, 1)[0];
      if (t) picked.push(t);
    }
  }
  const tier = Math.max(1, s.nightNo || 1), stats = E.scaleStats(ctx, daemonStats(tier));
  const had = mobsOf(ctx, "daemon").length;
  picked.splice(mobRoom(ctx)); // เพดานมอน
  for (const t of picked) { const trait = pickTrait(ctx, s), st2 = traitStats(stats, trait), ex = { look: 1 + (++s.seq % 8), tier, trait }; const rec = spawnMob(ctx, s, "daemon", t, st2, ex); if (rec) MBS.afterSpawn(ctx, s, H(), rec, st2, ex); }
  if (picked.length) {
    ctx.bump();
    ctx.fx("daemon_spawn", { list: picked.map((t) => ({ x: t.x, y: t.y })), tier });
    ctx.log(had ? `👹 ปีศาจโผล่เพิ่มอีก ${picked.length} ตัว` : `👹 คืนที่ ${tier} — ปีศาจ ${picked.length} ตัวโผล่ขึ้นมา!`);
  }
  return picked.length;
}
// จำนวนปีศาจของคืนนี้ (คืนที่ · ความยาก · จำนวนผู้เล่น · พระจันทร์สีเลือด ×1.5)
function nightTarget(ctx, s) { return Math.min(30, E.scaleCount(ctx, daemonCount(s.nightNo || 1), E.ev(s).blood ? E.BLOOD.count : 1)); }
function dissolveDaemons(ctx, s) {
  let list = mobsOf(ctx, "daemon").filter((d) => d.summon.trait !== "boss"); // ราชาปีศาจอยู่ข้ามกลางวัน
  if (LM.on(ctx) && list.length) list = ctx.pick(list, Math.ceil(list.length * (1 - LM.LAMENT.dawnKeep))); // Lament: คืนไม่สิ้นสุด — อีกครึ่งเดินต่อกลางวัน
  if (!list.length) return 0;
  ctx.fx("daemon_dissolve", { list: list.map((d) => ({ x: d.pos.x, y: d.pos.y, kind: d.summon.look })) });
  ctx.log("☀️ ฟ้าสาง — ปีศาจสลายไปกับแสงอรุณ");
  for (const d of list) lazySummon().remove(d);
  ctx.bump();
  return 1;
}
// ไฟเมืองกันมอนไหม (ผู้ใช้แจ้ง 2026-11-11 "เสาเปิดตั้งนาน ไม่เข้าไปตี" — เดิมกันทหารเหล็กด้วย = เสาในเมืองไม่มีใครแตะ)
//  ปีศาจกลัวแสง เข้าเมืองที่ไฟเปิดไม่ได้ · ทหารเหล็ก/หุ่นเกราะ (เครื่องจักร) และราชาปีศาจบุกเข้าเมืองได้ — กำแพง โดม ป้อมปืน คือของรับมือ
const lightBound = (m) => mobType(m) === "daemon" && !(m.summon && m.summon.trait === "boss");
// เป้าที่ตีได้: ผู้เล่นบนกระดาน (ไม่บินลอยข้ามหัว · ปีศาจ/ทหารเหล็กเข้าเมืองที่ไฟเปิดไม่ได้)
//  ฮุค hiddenFromMobs(p) → true = มอนมองไม่เห็นเลย ไม่เล็ง/ไม่เดินไปหา (เฟิร์น: ซ่อนเร้นมานาบน Eos — ผู้ใช้สั่ง 2026-11-11) · ตีพื้นที่ยังโดน
function mobBlind(p) {
  const h = require("../../characters/index")[p.characterId];
  return !!(h && h.hiddenFromMobs && h.hiddenFromMobs(p));
}
function prey(ctx, s, m) {
  const town = lightBound(m); // ไฟเมืองกันเฉพาะปีศาจ (เครื่องจักร/ราชาปีศาจเข้าได้ — 2026-11-11)
  const dark = XT.fearsLight(m); // ปีศาจ (ไม่ใช่ราชา) ไม่เข้าวงไฟแคมป์
  const blind = magnetOn(ctx) && mobType(m) !== "beast";
  return heroes(ctx).filter((p) => !mobBlind(p) && !(blind && manhattan(p.pos, m.pos) > SKY.MAGNET.sight) && !ctx.action.walksThrough(p) && !(town && footOf(ctx, p).some((t) => blockedTown(s, t.x, t.y))) && !(dark && footOf(ctx, p).some((t) => XT.lightSafe(H(), t.x, t.y))) && !(ctx.combat.sameTeam && ctx.combat.sameTeam(m, p)));
}
const pillarGoals = (s) => s.pillars.filter((pl) => pl.owner || pl.ch);
// สถานะคุมตัวของมอน (สตั้น/หลับ/ตรึง/เชื่องช้า) นับตามตาเดินของมอนเอง: endTurn ไม่ลด (phases/endTurn.js EOS_MOB_CONTROL)
//  ลดทีละ 1 หลังช่วงมอนของต้นเทิร์น (ท้าย preRound — หลังยักษ์หิน/โชโกโบะทองด้วย) → สตั้น 1 เทิร์น = มอนข้ามตาของมันจริง 1 ครั้ง
const MOB_CONTROL = ["stun", "sleep", "rooted", "slow"];
function tickMobControl(ctx) {
  for (const m of mobsOf(ctx)) {
    if (!m.statuses) continue;
    for (const k of MOB_CONTROL) {
      if (!(m.statuses[k] > 0)) continue;
      if (k === "sleep" && m.sleepFresh) { m.sleepFresh = false; continue; }
      m.statuses[k] -= 1;
      if (m.statuses[k] <= 0) { delete m.statuses[k]; if (m.statusAmt) delete m.statusAmt[k]; }
    }
  }
}
const stuckMob = (m) => ((m.statuses.stun || 0) > 0) || ((m.statuses.sleep || 0) > 0 && !m.sleepFresh);
// ก้าวไปหาช่องที่ติดเป้า (ผู้เล่น/เสา) ใกล้สุด — BFS ช่องว่าง ไม่เกิน mov · เป้าที่ติดอยู่แล้ว = ไม่เดิน
function stepMob(ctx, s, m, targets, pillars, mov) {
  const town = lightBound(m), dark = XT.fearsLight(m);
  // ติดหลายคน = ตีคนที่เลือด+เกราะน้อยสุดก่อน (มอนฉลาดขึ้น — ผู้ใช้ 2026-11-10)
  const adjT = (x, y) => targets.filter((p) => footOf(ctx, p).some((t) => manhattan(t, { x, y }) === 1)).sort((a, b) => ((a.hp || 0) + (a.armor || 0)) - ((b.hp || 0) + (b.armor || 0)))[0] || null;
  const adjP = (x, y) => pillars.find((pl) => manhattan(pl, { x, y }) === 1) || null;
  const goalAt = (x, y) => adjT(x, y) || adjP(x, y);
  if (goalAt(m.pos.x, m.pos.y)) return { to: null, path: null, target: adjT(m.pos.x, m.pos.y), pillar: adjT(m.pos.x, m.pos.y) ? null : adjP(m.pos.x, m.pos.y) };
  // มอนพวกเดียวกันขวางทาง (ต่อแถวหน้าประตู/ทางแคบ) = เดินผ่านแผนได้แต่หยุดบนช่องนั้นไม่ได้ (ผู้ใช้แจ้ง 2026-11-10 "มายืนออหน้าทางเข้า ไม่เข้ามาสักที")
  const mobAt = mobTiles(ctx, m.id);
  const start = { x: m.pos.x, y: m.pos.y, prev: null }, seen = new Set([K(m.pos.x, m.pos.y)]), q = [start];
  let goal = null;
  for (let i = 0; i < q.length && !goal; i++) for (const [dx, dy] of ctx.Board.DIRS) {
    const x = q[i].x + dx, y = q[i].y + dy, k = K(x, y);
    if (seen.has(k) || !ctx.Board.inBounds(ctx.map(), x, y) || gateShut(s, x, y) || (town && blockedTown(s, x, y)) || (dark && XT.lightSafe(H(), x, y))) continue;
    const pal = mobAt.has(k);
    if (!pal && !tileFree(ctx, s, x, y, m.id)) continue;
    seen.add(k);
    const node = { x, y, prev: q[i] };
    if (!pal && goalAt(x, y)) { goal = node; break; }
    q.push(node);
  }
  if (!goal) return wallRoute(ctx, s, m, targets, pillars, mov, town, dark, goalAt);
  const path = [];
  for (let c = goal; c; c = c.prev) path.unshift({ x: c.x, y: c.y });
  // มอนฉลาดขึ้น (ผู้ใช้แจ้ง 2026-11-10 "ไม่ทำลายสิ่งกีดขวางเพื่อพุ่งเข้ามา เดินอ้อมเฉยๆ"): ทางอ้อมยาวกว่าทางทุบ ≥ SMART.detour ก้าว = ทุบ
  if (path.length - 1 > mov) {
    const alt = wallRoute(ctx, s, m, targets, pillars, mov, town, dark, goalAt, true);
    if (alt.to && alt.cost != null && alt.cost + SMART.detour < path.length - 1) return alt;
  }
  let n = Math.min(mov, path.length - 1);
  while (n > 0 && mobAt.has(K(path[n].x, path[n].y))) n--; // หยุดก่อนช่องที่พวกเดียวกันยืน
  const to = path[n];
  const target = adjT(to.x, to.y);
  return { to, path: path.slice(0, n + 1), target, pillar: target ? null : adjP(to.x, to.y) };
}
const mobTiles = (ctx, selfId) => { const out = new Set(); for (const o of mobsOf(ctx)) if (o.id !== selfId && o.alive && o.pos) out.add(K(o.pos.x, o.pos.y)); return out; };
// ลาดตระเวน: ไม่เห็นใคร / เป้าที่เห็นไปไม่ถึง (หนีเข้าเมืองที่ไฟเปิด ฯลฯ) = เดินไปจุดสุ่มที่ใกล้ผู้เล่นขึ้น แทนการยืนเฉย (ผู้ใช้แจ้ง 2026-11-10 "บางตัวก็ยืนเฉยๆ")
//  จุดหมายค้างไว้จนถึง / ROAM.turns เทิร์น / ไปไม่ได้ · ตัวเลข Claude ตั้ง
const ROAM = { near: 4, far: 9, tries: 24, turns: 4 };
function roamMob(ctx, s, m, mov) {
  const sm = m.summon, round = ctx.match.roundNumber + 1, map = ctx.map();
  const town = lightBound(m), dark = XT.fearsLight(m);
  const ok = (x, y) => ctx.Board.inBounds(map, x, y) && tileFree(ctx, s, x, y, m.id) && !gateShut(s, x, y) && !(town && blockedTown(s, x, y)) && !(dark && XT.lightSafe(H(), x, y));
  const hs = heroes(ctx);
  const pick = () => {
    let best = null, bs = Infinity;
    for (let i = 0; i < ROAM.tries; i++) {
      const d = ROAM.near + Math.floor(ctx.rng() * (ROAM.far - ROAM.near + 1)), a = ctx.rng() * Math.PI * 2;
      const x = Math.round(m.pos.x + Math.cos(a) * d), y = Math.round(m.pos.y + Math.sin(a) * d);
      if (!ok(x, y)) continue;
      const sc = (hs.length ? Math.min(...hs.map((p) => manhattan(p.pos, { x, y }))) : 0) + ctx.rng() * 4;
      if (sc < bs) { bs = sc; best = { x, y }; }
    }
    return best;
  };
  if (!sm.roam || round > sm.roam.until || (sm.roam.x === m.pos.x && sm.roam.y === m.pos.y)) { const t = pick(); sm.roam = t ? { ...t, until: round + ROAM.turns } : null; }
  if (!sm.roam) return null;
  const mobAt = mobTiles(ctx, m.id), goalK = K(sm.roam.x, sm.roam.y);
  const start = { x: m.pos.x, y: m.pos.y, prev: null }, seen = new Set([K(m.pos.x, m.pos.y)]), q = [start];
  let goal = null;
  for (let i = 0; i < q.length && !goal && i < 600; i++) for (const [dx, dy] of ctx.Board.DIRS) {
    const x = q[i].x + dx, y = q[i].y + dy, k = K(x, y);
    if (seen.has(k) || !(mobAt.has(k) ? ctx.Board.inBounds(map, x, y) : ok(x, y))) continue;
    seen.add(k);
    const node = { x, y, prev: q[i] };
    if (k === goalK) { goal = node; break; }
    q.push(node);
  }
  if (!goal) { sm.roam = null; return null; }
  const path = [];
  for (let c = goal; c; c = c.prev) path.unshift({ x: c.x, y: c.y });
  let n = Math.min(mov, path.length - 1);
  while (n > 0 && mobAt.has(K(path[n].x, path[n].y))) n--;
  return n > 0 ? { to: path[n], path: path.slice(0, n + 1) } : null;
}
// ============================================================ ผู้บัญชาการฝูงมอน (ผู้ใช้แจ้ง 2026-11-11 "เสาเปิดตั้งนาน ไม่เข้าไปตี ไม่มีคนเฝ้า ผู้เล่นอยู่อีกที่กันหมด มันเดินอยู่เฉยๆ")
//  ทุกต้นเทิร์นมอนแบ่งหน้าที่: เสาที่ยึดไว้แต่ไม่มีใครเฝ้า (ไม่มีผู้เล่นในระยะ RAID.guardR) = ส่งหน่วยบุก RAID.open ตัว (+1 ทุก 2 คืน)
//   เสาที่มีคนเฝ้า = ส่ง RAID.guarded ตัวไปกดดัน · หน่วยบุกเดินตรงไปเสา ตีเฉพาะคนที่ขวางหน้า/เฝ้าเสา · ป้อมปืนของเสานั้นเป็นเป้าด้วย
//   มอนที่ติดพันผู้เล่นอยู่ (ห่าง ≤ RAID.engage) ไม่ถูกดึงไปบุก · หน้าที่ค้างข้ามเทิร์นจนเสาหลุด/ไปไม่ถึง · ตัวเลข Claude ตั้ง
const RAID = { guardR: 3, open: 2, perNights: 2, guarded: 1, engage: 2 };
// ============================================================ รวมพลแล้วบุกพร้อมกัน (ผู้ใช้เลือก 2026-11-11 — "เสายึดอยู่ต้นเดียว คนก็อยู่ที่เดียว" · ตัวเลข Claude ตั้ง)
//  ผู้เล่นส่วนใหญ่ (≥ 60%) กองกันในรัศมี 4 และอยู่ที่เดิม (ขยับ ≤ 3) ติดกัน 2 เทิร์น = "ตั้งรับ" → มอนที่ยังไม่ติดพันไม่ทยอยเข้าไปให้ล้มทีละตัว
//   ไปรอเป็นวงห่างจุดตั้งรับ 5–7 ช่อง · ครบ 3 + จำนวนผู้เล่น ตัว หรือรอครบ 3 เทิร์น = บุกพร้อมกันเป็นระลอก 2 เทิร์น (ประกาศเตือน) แล้วกลับไปรวมพลใหม่
const MUSTER = { r: 4, share: 0.6, drift: 3, still: 2, ring: [5, 7], need: 3, perHead: 1, wait: 3, wave: 2 };
const musterMob = (m) => { const t = mobType(m), tr = m.summon && m.summon.trait; return (t === "daemon" || t === "magitek") && tr !== "boss" && tr !== "healer"; };
function musterTick(ctx, s, round) {
  const hs = heroes(ctx);
  if (!hs.length) { s.muster = null; return null; }
  let c = null, size = 0;
  for (const p of hs) { const n = hs.filter((o) => manhattan(o.pos, p.pos) <= MUSTER.r).length; if (n > size) { size = n; c = p.pos; } }
  if (size < Math.max(1, Math.ceil(hs.length * MUSTER.share))) { s.muster = null; return null; }
  let mu = s.muster;
  if (!mu || manhattan(mu.c, c) > MUSTER.drift) mu = s.muster = { c: { ...c }, still: 0, since: round, waveUntil: 0, mode: null };
  if (mu.tick === round) return mu;
  mu.tick = round;
  mu.still += 1;
  if (round <= mu.waveUntil) { mu.mode = "wave"; return mu; }
  if (mu.still < MUSTER.still) { mu.mode = null; return mu; }
  if (mu.mode !== "gather") { mu.mode = "gather"; mu.since = round; }
  const near = mobsOf(ctx).filter((m) => musterMob(m) && m.pos && manhattan(m.pos, mu.c) <= MUSTER.ring[1] + 1).length;
  if (near >= MUSTER.need + MUSTER.perHead * hs.length || (near > 0 && round - mu.since >= MUSTER.wait)) {
    mu.mode = "wave"; mu.waveUntil = round + MUSTER.wave - 1; mu.since = round + MUSTER.wave;
    ctx.fx("mob_wave", { x: mu.c.x, y: mu.c.y, n: near });
    ctx.log(`⚠️ ฝูงมอน ${near} ตัวล้อมรอบแล้ว — บุกพร้อมกัน!`);
  }
  return mu;
}
// เดินไปช่องว่างใกล้สุดที่ isGoal(x, y) (ผ่านช่องที่มอนพวกเดียวกันยืนได้แต่หยุดไม่ได้) — แบบเดียวกับลาดตระเวน
function stepToward(ctx, s, m, mov, isGoal) {
  const map = ctx.map(), town = lightBound(m), dark = XT.fearsLight(m);
  const ok = (x, y) => ctx.Board.inBounds(map, x, y) && tileFree(ctx, s, x, y, m.id) && !gateShut(s, x, y) && !(town && blockedTown(s, x, y)) && !(dark && XT.lightSafe(H(), x, y));
  if (isGoal(m.pos.x, m.pos.y)) return { to: null, path: null, hold: true };
  const mobAt = mobTiles(ctx, m.id), seen = new Set([K(m.pos.x, m.pos.y)]), q = [{ x: m.pos.x, y: m.pos.y, prev: null }];
  let goal = null;
  for (let i = 0; i < q.length && !goal && i < 700; i++) for (const [dx, dy] of ctx.Board.DIRS) {
    const x = q[i].x + dx, y = q[i].y + dy, k = K(x, y), pal = mobAt.has(k);
    if (seen.has(k) || !(pal ? ctx.Board.inBounds(map, x, y) : ok(x, y))) continue;
    seen.add(k);
    const node = { x, y, prev: q[i] };
    if (!pal && isGoal(x, y)) { goal = node; break; }
    q.push(node);
  }
  if (!goal) return null;
  const path = [];
  for (let c = goal; c; c = c.prev) path.unshift({ x: c.x, y: c.y });
  let n = Math.min(mov, path.length - 1);
  while (n > 0 && mobAt.has(K(path[n].x, path[n].y))) n--;
  return n > 0 ? { to: path[n], path: path.slice(0, n + 1) } : { to: null, path: null, hold: true };
}
// ============================================================ ปีศาจปิดล้อมเมือง (ผู้ใช้เลือก 2026-11-11): ปีศาจที่ยืนติดขอบเมืองที่ไฟเปิด ทุบไฟเมือง 1/ตัว/เทิร์น
//  ไฟเมืองหมด = ไฟดับ (s.lightsOff) ปีศาจบุกเข้าเมืองได้ · ยืนติดแผงไฟกด "ซ่อมไฟ"/"เปิดไฟ" +4 · ฟ้าสาง = ไฟกลับเต็ม · ตัวเลข Claude ตั้ง
const TOWN_LIGHT = { hp: 8, fix: 4 };
const lightMax = (s) => Math.max(2, TOWN_LIGHT.hp + PKS.lightBonus(s) - (LM.curse(s, "dim") ? 2 : 0)); // การ์ดไฟเมืองแกร่ง +4 · คำสาปไฟริบหรี่ −2
// ไฟทุกเมืองที่ยังเปิดหรี่ลง n (ผู้คร่ำครวญเฟส 2+)
function dimLights(ctx, s, n) {
  for (const z of TOWNS) {
    if (!lit(s, z.id)) continue;
    (s.lightHp ||= {})[z.id] = Math.max(0, lightHp(s, z.id) - n);
    if (s.lightHp[z.id] <= 0) { (s.lightsOff ||= {})[z.id] = true; ctx.fx("town_dark", { zone: z.id }); ctx.log(`🌑 ไฟเมือง ${ZONE_NAMES[z.id] || z.id} ดับ!`); }
  }
  ctx.bump();
}
const lightHp = (s, z) => (s.lightHp && s.lightHp[z] != null ? s.lightHp[z] : lightMax(s));
function townEdge(ctx, s, m) {
  for (const [dx, dy] of ctx.Board.DIRS) { const x = m.pos.x + dx, y = m.pos.y + dy, z = townOf(x, y); if (z && lit(s, z)) return z; }
  return null;
}
function siegeLight(ctx, s, m, z) {
  (s.lightHp ||= {})[z] = Math.max(0, lightHp(s, z) - 1);
  const out = s.lightHp[z] <= 0;
  if (out) { (s.lightsOff ||= {})[z] = true; ctx.fx("town_dark", { zone: z }); ctx.log(`🌑 ไฟเมือง ${ZONE_NAMES[z] || z} ดับ! ปีศาจบุกเข้าเมืองได้ — ไปซ่อมที่แผงไฟ`); }
  ctx.bump();
  return { id: m.id, x: m.pos.x, y: m.pos.y, zone: z, hp: s.lightHp[z], out };
}
function restoreLights(ctx, s) {
  const had = Object.values(s.lightsOff || {}).some(Boolean) || Object.keys(s.lightHp || {}).length > 0;
  s.lightsOff = {}; s.lightHp = {};
  if (had) { ctx.bump(); ctx.log("💡 ฟ้าสาง — ไฟเมืองกลับมาสว่างเต็ม"); }
}
function lightFixable(ctx, s, p) { const sw = switchNear(ctx, p); return sw && (!lit(s, sw.zone) || lightHp(s, sw.zone) < lightMax(s)) ? sw : null; }
function fixLights(ctx, s, p) {
  const sw = canStrike(ctx, p) ? lightFixable(ctx, s, p) : null;
  if (!sw) return false;
  const z = sw.zone, was = !lit(s, z);
  (s.lightHp ||= {})[z] = Math.min(lightMax(s), (was ? 0 : lightHp(s, z)) + TOWN_LIGHT.fix);
  if (s.lightHp[z] >= lightMax(s)) delete s.lightHp[z];
  if (s.lightsOff) delete s.lightsOff[z];
  ctx.bump();
  ctx.fx("town_light", { zone: z, x: sw.at[0], y: sw.at[1], by: p.id, relit: was });
  ctx.log(`💡 ${p.name} ${was ? "เปิดไฟเมืองกลับมา" : "ซ่อมไฟเมือง"} ${ZONE_NAMES[z] || z}`);
  ctx.useStrike(p, SWITCH_SECS);
  return true;
}
const raider = (m) => { const t = mobType(m), tr = m.summon && m.summon.trait; return (t === "daemon" || t === "magitek") && tr !== "boss" && tr !== "healer"; };
const guardedPl = (ctx, pl) => heroes(ctx).some((p) => manhattan(p.pos, pl) <= RAID.guardR);
function openPillars(ctx, s) { return pillarGoals(s).filter((pl) => pl.owner && !guardedPl(ctx, pl)); }
// ป้อมปืนประจำเสา (ยังไม่พัง) — เป้ารองของหน่วยบุก
function plTurrets(ctx, pl) { return TURRETS.filter((t) => turretZone(t) === pl.zone && turretUp(ctx, t)).map((t) => ({ x: t.x, y: t.y, kind: "turret", zone: pl.zone })); }
function raidPlan(ctx, s) {
  const plan = new Map(), held = pillarGoals(s).filter((pl) => pl.owner);
  const mobs = mobsOf(ctx).filter((m) => m.alive && m.pos && raider(m) && !stuckMob(m));
  for (const m of mobs) if (m.summon.raid && !held.some((pl) => pl.id === m.summon.raid)) m.summon.raid = null;
  if (!held.length) return plan;
  const hs = heroes(ctx), busy = (m) => hs.some((p) => manhattan(p.pos, m.pos) <= RAID.engage);
  const can = (m, pl) => !(lightBound(m) && blockedTown(s, pl.x, pl.y)); // ปีศาจบุกเสาในเมืองที่ไฟเปิดไม่ได้
  for (const pl of held) {
    const want = guardedPl(ctx, pl) ? RAID.guarded : RAID.open + Math.floor((s.nightNo || 0) / RAID.perNights);
    const mine = mobs.filter((m) => m.summon.raid === pl.id && can(m, pl)).slice(0, want);
    for (const m of mine) plan.set(m.id, pl);
    const free = mobs.filter((m) => !plan.has(m.id) && !m.summon.raid && !busy(m) && can(m, pl)).sort((a, b) => manhattan(a.pos, pl) - manhattan(b.pos, pl));
    for (const m of free.slice(0, Math.max(0, want - mine.length))) { m.summon.raid = pl.id; plan.set(m.id, pl); }
  }
  for (const m of mobs) if (m.summon.raid && !plan.has(m.id)) m.summon.raid = null; // ส่วนเกิน (เสามีคนมาเฝ้าแล้ว) กลับไปล่าตามปกติ
  return plan;
}
// ============================================================ ราชาปีศาจ (ผู้ใช้แจ้ง 2026-11-11 "บอสไม่น่ากลัว เดินเฉยๆ ไม่เข้าไปทำอะไรสักอย่างเหมือนกลัว")
//  เดิม: เล็งแต่เสา (เสาในเมืองที่ไฟเปิด = ไปไม่ถึง → ยืนนิ่ง) · ใหม่ (Claude ตั้ง):
//   ไม่กลัวไฟเมือง/ไฟแคมป์ · ไล่ทั้งผู้เล่นและเสา ใกล้สุดก่อน · ไปไม่ถึงอะไรเลย = เดินเข้าหาผู้เล่น (ไม่ยืนเฉย)
//   พุ่งชน: ผู้เล่นอยู่แนวตรง 2–6 ช่องทางโล่ง → พุ่งไปชน ดาเมจ +1 กระเด็น 1 ช่อง (พัก 2 เทิร์น)
//   แผ่นดินแยก: ผู้เล่นใกล้ ≤ 3 → วงเตือนรัศมี 2 รอบตัว ต้นเทิร์นหน้าระเบิด ดาเมจ 3 ทุกคนในวง (ออกจากวงทัน = รอด · พัก 3 เทิร์น)
//   คลั่ง: เลือดเหลือครึ่ง → ตี +1 เดิน +1 (ครั้งเดียว)
const BOSS_AI = { chargeMin: 2, chargeMax: 6, chargeBonus: 1, chargeCd: 2, quakeR: 2, quakeDmg: 3, quakeCd: 3, quakeNear: 3, enrage: 0.5, enrageAtk: 1, enrageMov: 1 };
const diamond = (x, y, r) => { const out = []; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.abs(dx) + Math.abs(dy) <= r && (dx || dy)) out.push({ x: x + dx, y: y + dy }); return out; };
function bossCharge(ctx, s, m, all) {
  if (sizeOf(ctx, m) > 1) return null;
  let best = null;
  for (const p of all) {
    if (sizeOf(ctx, p) > 1 || !p.pos) continue;
    const dx = p.pos.x - m.pos.x, dy = p.pos.y - m.pos.y, d = Math.abs(dx) + Math.abs(dy);
    if ((dx && dy) || d < BOSS_AI.chargeMin || d > BOSS_AI.chargeMax) continue;
    const sx = Math.sign(dx), sy = Math.sign(dy);
    let ok = true;
    for (let i = 1; i < d && ok; i++) { const x = m.pos.x + sx * i, y = m.pos.y + sy * i; ok = tileFree(ctx, s, x, y, m.id) && !gateShut(s, x, y) && !PKS.wallAt(s, x, y); }
    if (ok && (!best || (p.hp || 0) + (p.armor || 0) < (best.p.hp || 0) + (best.p.armor || 0))) best = { p, sx, sy, d };
  }
  return best;
}
function bossAct(ctx, s, m, all, round, out) {
  const sm = m.summon, e = E.ev(s), atk0 = () => Math.max(1, (sm.atk | 0) + LM.rage(ctx).atk);
  // ---- แผ่นดินแยกที่เตือนไว้ ----
  if (e.quake && e.quake.by === m.id && round >= e.quake.at) {
    const hits = [];
    for (const u of unitsOn(ctx, e.quake.tiles)) { if (isMob(u)) continue; const dealt = ctx.combat.withEffectSource(m, () => ctx.damage(u, BOSS_AI.quakeDmg)); hits.push({ id: u.id, dmg: dealt }); }
    ctx.fx("boss_quake", { id: m.id, x: e.quake.x, y: e.quake.y, tiles: e.quake.tiles, hits });
    ctx.log(`👑 ราชาปีศาจทุบแผ่นดินแยก!${hits.length ? ` โดน ${hits.length} คน` : " ไม่โดนใคร"}`);
    e.quake = null; sm.quakeAt = round;
    out.big = true;
  }
  if (BB.darkTick(ctx, s, H(), m, round)) out.big = true; // เขตทมิฬค้าง
  if (BB.land(ctx, s, H(), m, round)) out.big = true; // ท่าใหญ่ที่เตือนไว้
  // ---- คลั่ง ----
  if (!sm.enraged && m.hp <= (sm.maxHp || m.hp) * BOSS_AI.enrage) {
    sm.enraged = true; sm.atk = (sm.atk | 0) + BOSS_AI.enrageAtk;
    ctx.fx("boss_enrage", { id: m.id, x: m.pos.x, y: m.pos.y });
    ctx.log("👑 ราชาปีศาจคลั่ง! โจมตีแรงขึ้น เดินไวขึ้น");
  }
  if (BB.guards(ctx, s, H(), m)) out.big = true; // เลือด ≤ 30% = องครักษ์
  // ---- คำราม: ทุก 2 เทิร์นเรียกปีศาจ 2 ตัวข้างตัว ----
  if (round >= (sm.roarAt || 0) + E.BOSS.roarEvery) {
    sm.roarAt = round;
    const st = E.scaleStats(ctx, daemonStats(Math.max(1, s.nightNo || 1))), spawned = [];
    for (let i = 0; i < 2 && mobRoom(ctx) > 0; i++) { const at = freeNear(ctx, s, m.pos.x, m.pos.y, 3); if (at) { const d = spawnMob(ctx, s, "daemon", at, st, { look: 1 + (++s.seq % 8), tier: s.nightNo || 1 }); spawned.push({ id: d.id, x: at.x, y: at.y }); } }
    if (spawned.length) ctx.fx("boss_roar", { id: m.id, x: m.pos.x, y: m.pos.y, spawned });
  }
  const hit = (v, dmg, extra = {}) => { if (!v.alive) return; const dealt = ctx.combat.withEffectSource(m, () => ctx.damage(v, dmg)); out.attacks.push({ id: m.id, type: "boss", x: m.pos.x, y: m.pos.y, target: v.id, dmg: dealt, ...extra }); };
  const adj = () => all.filter((p) => p.alive && p.pos && footOf(ctx, p).some((tt) => manhattan(tt, m.pos) === 1));
  const mov = Math.max(0, (ctx.action.movOf(m) | 0) + (sm.enraged ? BOSS_AI.enrageMov : 0));
  let acted = false;
  if (adj().length) { // กระทืบ: ทุกคนที่ติดตัว
    const list = adj();
    for (const v of list) hit(v, atk0());
    ctx.log(`👑 ราชาปีศาจกระทืบ ${list.map((v) => v.name).join(", ")}`);
    acted = true;
  }
  // ---- พุ่งชน ----
  const ch = !acted && round >= (sm.chargeAt ?? -99) + BOSS_AI.chargeCd ? bossCharge(ctx, s, m, all) : null;
  if (ch) {
    const to = { x: ch.p.pos.x - ch.sx, y: ch.p.pos.y - ch.sy }, path = [];
    for (let i = 0; i <= ch.d - 1; i++) path.push({ x: m.pos.x + ch.sx * i, y: m.pos.y + ch.sy * i });
    out.moves.push({ id: m.id, type: "boss", from: { ...m.pos }, to: { ...to }, path, charge: true });
    faceTo(sm, ch.sx, ch.sy);
    m.pos = { ...to }; ctx.bump();
    sm.chargeAt = round;
    const v = ch.p, back = { x: v.pos.x + ch.sx, y: v.pos.y + ch.sy };
    hit(v, atk0() + BOSS_AI.chargeBonus, { charge: true });
    if (v.alive && v.pos && ctx.Board.inBounds(ctx.map(), back.x, back.y) && tileFree(ctx, s, back.x, back.y, v.id)) { v.pos = back; ctx.bump(); }
    ctx.log(`👑 ราชาปีศาจพุ่งชน ${v.name}!`);
    acted = true;
  }
  if (!acted) {
    let r = stepMob(ctx, s, m, all, pillarGoals(s), mov);
    if (!r.to && !r.target && !r.pillar && !r.wall) { const w = roamMob(ctx, s, m, mov); if (w) r = { ...w, target: null, pillar: null }; }
    if (r.to && (r.to.x !== m.pos.x || r.to.y !== m.pos.y)) {
      out.moves.push({ id: m.id, type: "boss", from: { ...m.pos }, to: { ...r.to }, path: r.path });
      const pv = Array.isArray(r.path) && r.path.length > 1 ? r.path[r.path.length - 2] : m.pos;
      faceTo(sm, r.to.x - pv.x, r.to.y - pv.y);
      m.pos = { ...r.to }; ctx.bump();
    }
    const near = adj();
    if (near.length) { for (const v of near) hit(v, atk0()); ctx.log(`👑 ราชาปีศาจกระทืบ ${near.map((v) => v.name).join(", ")}`); }
    else if (r.pillar && r.pillar.kind === "turret") { const wh = hitWall(ctx, s, m, r.pillar); if (wh) out.pillarHits.push({ type: "boss", ...wh }); }
    else if (r.pillar) for (let i = 0; i < E.BOSS.pillarHits && r.pillar.owner; i++) out.pillarHits.push({ id: m.id, type: "boss", x: m.pos.x, y: m.pos.y, at: { x: r.pillar.x, y: r.pillar.y }, ...hitPillar(ctx, s, r.pillar, m) });
    else if (r.wall) { const wh = hitWall(ctx, s, m, r.wall); if (wh) out.pillarHits.push({ type: "boss", ...wh }); }
  }
  // ---- เตือนแผ่นดินแยก (ลงต้นเทิร์นหน้า) ----
  let quaked = false;
  if (!e.quake && !sm.big && round >= (sm.quakeAt ?? -99) + BOSS_AI.quakeCd && all.some((p) => p.alive && p.pos && manhattan(p.pos, m.pos) <= BOSS_AI.quakeNear)) {
    const tiles = diamond(m.pos.x, m.pos.y, BOSS_AI.quakeR).filter((t) => ctx.Board.inBounds(ctx.map(), t.x, t.y));
    e.quake = { by: m.id, at: round + 1, x: m.pos.x, y: m.pos.y, tiles };
    sm.quakeAt = round; // นับพักจากตอนเตือน
    ctx.fx("boss_quake_warn", { id: m.id, x: m.pos.x, y: m.pos.y, tiles });
    ctx.log("⚠️ ราชาปีศาจยกเท้าขึ้นสูง — ออกจากวงแดง!");
    quaked = true;
  }
  if (BB.warn(ctx, s, H(), m, all, round, quaked)) out.big = true; // ท่าใหญ่: เตือน 1 เทิร์น
}
const SMART = { detour: 3, barricadeCost: 3 };
// ============================================================ กำแพงเมือง Insomnia พังได้ (ผู้ใช้สั่ง 2026-11-10 — ตัวเลข Claude ตั้ง)
//  ทางปกติไปไม่ถึง (ประตูปิดด้วยโดม ฯลฯ) = หาทางที่ทะลุกำแพงได้ (กำแพง 1 ช่องนับเป็น WALL_COST ก้าว) → เดินไปติดกำแพงแล้วทุบ
//  ทุบครบ CITY_WALL.hp = ช่องนั้นพังเดินผ่านได้ · ผู้เล่นยืนติดกด "ซ่อมกำแพง" (+2 · ใช้การโจมตี) · ช่องพังซ่อมกลับได้ถ้าไม่มีใครยืน
const CITY_WALL = { hp: 4, fix: 2, cost: 4, mechDmg: 2 };
let WALL_KEYS = null; // ช่องกำแพงเดิมของผัง (ชั้นแผนที่ลบช่องที่พังออก) — สร้างตอนใช้ครั้งแรก (INSOMNIA ประกาศทีหลัง)
const cityWallKeys = () => WALL_KEYS || (WALL_KEYS = new Set([...(MAP.map.terrain.fd_eos_wall || []).filter(([x, y]) => inRect(INSOMNIA, x, y)), ...(MAP.map.terrain.fd_eos_turret || [])].map(([x, y]) => K(x, y)))); // ป้อมปืนทุกป้อม (บนกำแพง Insomnia + ป้อมประจำเสา) พังได้ด้วย
const isTurretTile = (x, y) => TURRETS.some((t) => t.x === x && t.y === y);
// ป้อมปืนเป็นของเสาโซนไหน (เสาที่ใกล้สุด — ป้อมบนกำแพง Insomnia = Insomnia)
const turretZone = (t) => { let best = null, bd = Infinity; for (const pl of MAP.PILLARS) { const d = Math.abs(pl.at[0] - t.x) + Math.abs(pl.at[1] - t.y); if (d < bd) { bd = d; best = pl.zone; } } return best; };
let GATE_KEYS = null;
const gateKey = (x, y) => (GATE_KEYS || (GATE_KEYS = new Set(DOME_GATES.map((t) => K(t.x, t.y))))).has(K(x, y));
const gateShut = (s, x, y) => domeOn(s) && gateKey(x, y);
// ช่องที่มอนทุบได้: กำแพง/ป้อมที่ยังไม่พัง · ประตูโดมตอนโดมเปิด
const breakable = (ctx, s, x, y) => isCityWall(ctx, s, x, y) || gateShut(s, x, y) || PKS.wallAt(s, x, y);
const isCityWall = (ctx, s, x, y) => cityWallKeys().has(K(x, y)) && !(s.wallBroken || {})[K(x, y)];
const wallHp = (s, k) => (s.wallHp && s.wallHp[k] != null ? s.wallHp[k] : CITY_WALL.hp);
function wallRoute(ctx, s, m, targets, pillars, mov, town, dark, goalAt, compare = false) {
  const none = { to: null, path: null, target: null, pillar: null };
  if (!compare && !targets.length && !pillars.length) return none;
  // Dijkstra แบบถังน้ำ (ค่าเดิน 1 หรือ WALL_COST)
  const cost = new Map([[K(m.pos.x, m.pos.y), 0]]), prev = new Map(), buckets = [[{ x: m.pos.x, y: m.pos.y }]];
  let goal = null;
  for (let c = 0; c < buckets.length && !goal && c < 400; c++) for (const n of buckets[c] || []) {
    if (cost.get(K(n.x, n.y)) !== c) continue;
    if (c > 0 && goalAt(n.x, n.y)) { goal = n; break; } // ช่องทุบได้ที่ติดเป้า = เป้าหมาย (ทุบแล้วถึงตัว)
    for (const [dx, dy] of ctx.Board.DIRS) {
      const x = n.x + dx, y = n.y + dy, k = K(x, y);
      if (!ctx.Board.inBounds(ctx.map(), x, y)) continue;
      const wall = breakable(ctx, s, x, y);
      if (!wall && (!tileFree(ctx, s, x, y, m.id) || (town && blockedTown(s, x, y)) || (dark && XT.lightSafe(H(), x, y)))) continue;
      const nc = c + (wall ? (PKS.wallAt(s, x, y) ? SMART.barricadeCost : CITY_WALL.cost) : 1);
      if (cost.has(k) && cost.get(k) <= nc) continue;
      cost.set(k, nc); prev.set(k, n);
      (buckets[nc] ||= []).push({ x, y });
    }
  }
  if (!goal) return none;
  const path = [];
  for (let c = goal; c; c = prev.get(K(c.x, c.y))) path.unshift({ x: c.x, y: c.y });
  const wi = path.findIndex((t) => breakable(ctx, s, t.x, t.y));
  if (wi < 1) return none;
  const n = Math.min(mov, wi - 1), to = path[n];
  const wall = n === wi - 1 ? path[wi] : null; // ถึงหน้ากำแพงตานี้ = ทุบ
  return { to, path: path.slice(0, n + 1), target: null, pillar: null, wall, cost: cost.get(K(goal.x, goal.y)) };
}
function hitWall(ctx, s, m, w) {
  const k = K(w.x, w.y);
  const dmg = m.summon && (m.summon.trait === "mech" || m.summon.trait === "boss") ? CITY_WALL.mechDmg : 1;
  if (gateShut(s, w.x, w.y)) { // ทุบบาเรียประตูโดม: เลือดโดมรวม หมด = โดมแตก (พักเครื่องตามปกติ)
    s.dome.hp = Math.max(0, (s.dome.hp ?? DOME_HP) - dmg);
    const broke = s.dome.hp <= 0;
    if (broke) { s.dome = null; s.domeReadyRound = ctx.match.roundNumber + DOME_COOLDOWN; ctx.fx("dome_off", { rect: INSOMNIA, broken: true }); ctx.log(`🛡️ โดมกำแพงเวทแตก! ${m.name}ทุบบาเรียประตูจนพัง`); }
    ctx.bump();
    return { id: m.id, x: m.pos.x, y: m.pos.y, at: { x: w.x, y: w.y }, wall: true, gate: true, hp: broke ? 0 : s.dome.hp, broke };
  }
  if (PKS.wallAt(s, w.x, w.y)) { // กำแพงไม้ (ร้าน — ถาวรจนพัง): ทน PKS.wallMax(s) ครั้ง
    const bw = PKS.PK(s).walls.find((o) => o.x === w.x && o.y === w.y);
    bw.hp = (bw.hp ?? PKS.wallMax(s)) - dmg;
    const broke = bw.hp <= 0;
    if (broke) { PKS.PK(s).walls = PKS.PK(s).walls.filter((o) => o !== bw); ctx.log(`🧱 ${m.name}พังกำแพงไม้`); }
    ctx.bump();
    return { id: m.id, x: m.pos.x, y: m.pos.y, at: { x: w.x, y: w.y }, wall: true, hp: broke ? 0 : bw.hp, broke };
  }
  if (!isCityWall(ctx, s, w.x, w.y)) return null;
  (s.wallHp ||= {})[k] = Math.max(0, wallHp(s, k) - dmg);
  const broke = s.wallHp[k] <= 0;
  if (broke) { (s.wallBroken ||= {})[k] = true; delete s.wallHp[k]; ctx.log(isTurretTile(w.x, w.y) ? `🔫 ${m.name}ทุบป้อมปืน ${ZONE_NAMES[turretZone(w)] || ""} พัง!` : `🧱 ${m.name}ทุบกำแพง Insomnia พัง!`); }
  ctx.bump();
  return { id: m.id, x: m.pos.x, y: m.pos.y, at: { x: w.x, y: w.y }, wall: true, hp: broke ? 0 : s.wallHp[k], broke };
}
// ของที่ซ่อมได้ติดตัว: กำแพง Insomnia / ป้อมปืน (พังแล้วก่อใหม่ได้ถ้าช่องว่าง) / กำแพงไม้ที่บุบ · kind = wall | turret | barricade
function wallFixTarget(ctx, s, p) {
  if (!p || !p.pos) return null;
  for (const [dx, dy] of ctx.Board.DIRS) {
    const x = p.pos.x + dx, y = p.pos.y + dy, k = K(x, y), kind = isTurretTile(x, y) ? "turret" : "wall";
    const bw = PKS.PK(s).walls.find((o) => o.x === x && o.y === y);
    if (bw) { if ((bw.hp ?? PKS.wallMax(s)) < PKS.wallMax(s)) return { x, y, broken: false, kind: "barricade" }; continue; }
    if (!cityWallKeys().has(k)) continue;
    if ((s.wallBroken || {})[k]) { if (tileFree(ctx, s, x, y)) return { x, y, broken: true, kind }; continue; }
    if (wallHp(s, k) < CITY_WALL.hp) return { x, y, broken: false, kind };
  }
  return null;
}
const FIX_NAMES = { wall: "ซ่อมกำแพง", turret: "ซ่อมป้อม", barricade: "ซ่อมไม้กั้น" };
function fixWall(ctx, s, p) {
  const w = canStrike(ctx, p) ? wallFixTarget(ctx, s, p) : null;
  if (!w) return false;
  const k = K(w.x, w.y);
  if (w.kind === "barricade") { const bw = PKS.PK(s).walls.find((o) => o.x === w.x && o.y === w.y); bw.hp = Math.min(PKS.wallMax(s), (bw.hp ?? PKS.wallMax(s)) + CITY_WALL.fix); }
  else if (w.broken) { delete s.wallBroken[k]; (s.wallHp ||= {})[k] = CITY_WALL.fix; }
  else { s.wallHp[k] = Math.min(CITY_WALL.hp, wallHp(s, k) + CITY_WALL.fix); if (s.wallHp[k] >= CITY_WALL.hp) delete s.wallHp[k]; }
  ctx.bump();
  ctx.fx("wall_fix", { id: p.id, x: w.x, y: w.y, rebuilt: w.broken });
  ctx.log(`${w.kind === "turret" ? "🔫" : "🧱"} ${p.name} ${w.broken ? (w.kind === "turret" ? "สร้างป้อมปืนขึ้นใหม่" : "ก่อกำแพงที่พังขึ้นใหม่") : FIX_NAMES[w.kind]}`);
  ctx.useStrike(p, FIX_SECS);
  return true;
}
// มอนตีเสา: ครบ PILLAR_HP ครั้ง = เสาหลุดกลับเป็นกลาง (พิธีที่กำลังร่ายก็แตก)
const pillarHp = (s) => (s.lamentOn ? 1 : PILLAR_HP) + PKS.pillarHpBonus(s); // การ์ดเสาแกร่ง +1 · Lament เสาเปราะ (ตีทีเดียวหลุด)
const reviveTurns = (s) => REVIVE_TURNS - PKS.reviveCut(s) + (s.lamentOn ? LM.LAMENT.reviveAdd : 0) + (LM.curse(s, "slow") ? 1 : 0); // การ์ดฟื้นไว −1 · Lament +1 · คำสาปฟื้นช้า +1
function hitPillar(ctx, s, pl, m) {
  if (pl.ch) { breakChannel(ctx, pl); if (!pl.owner) return { id: pl.id, broke: "channel" }; }
  if (!pl.owner) return { id: pl.id };
  if ((pl.ward || 0) > 0) { // เกราะเสา (ไอเทม) รับแทนรอยตี
    pl.ward -= 1;
    ctx.fx("pillar_ward_hit", { id: pl.id, x: pl.x, y: pl.y, ward: pl.ward, by: m.id });
    ctx.log(`🛡️ เกราะเสา ${ZONE_NAMES[pl.zone] || ""} รับการโจมตีของ ${m.name}`);
    return { id: pl.id, ward: pl.ward };
  }
  pl.hits = (pl.hits || 0) + 1;
  if (pl.hits < pillarHp(s)) {
    ctx.fx("pillar_hit", { id: pl.id, x: pl.x, y: pl.y, hits: pl.hits, hp: pillarHp(s), by: m.id });
    ctx.log(`🔷 ${m.name} โจมตีเสา ${ZONE_NAMES[pl.zone] || ""} (${pl.hits}/${pillarHp(s)})`);
    return { id: pl.id, hits: pl.hits };
  }
  pl.owner = null; pl.hits = 0;
  if (s.lamentOn) { const cut = Math.min(s.score || 0, LM.LAMENT.pillarLoss); if (cut) { s.score -= cut; ctx.log(`🩸 เสาหลุด — แต้มรวม −${cut}`); } } // Lament
  PKS.noteLost(s); // ดาวท้าทาย "เสาไม่หลุดเลย"
  ctx.bump();
  ctx.fx("pillar_lost", { id: pl.id, x: pl.x, y: pl.y, by: m.id });
  ctx.log(`💔 เสา ${ZONE_NAMES[pl.zone] || ""} ถูกมอนเตอร์ทำลายพิธี — หลุดกลับเป็นกลาง!`);
  return { id: pl.id, lost: true };
}
function actMonsters(ctx, s) {
  const runeOut = MBS.beforeAct(ctx, s, H()); // วงเวทที่วางไว้ตาก่อนระเบิด (นักเวทตายหมดแล้วก็ต้องล้างวง)
  const regenOut = ELT.beforeAct(ctx, s, H()); // หัวหน้าฟื้นตัว
  const list = mobsOf(ctx);
  if (!list.length) return runeOut.length || regenOut.length ? 1 : 0;
  const moves = [], attacks = [], pillarHits = [], heals = [], shots = [], booms = [];
  const acc = { moves, attacks, shots, blinks: [], pulls: [], runes: [] }; // มอนรูปแบบใหม่ (eosMobs.act)
  const round = ctx.match.roundNumber + 1;
  const out = { moves, attacks, pillarHits, big: false };
  const ev = E.ev(s);
  if (ev.quake && !list.some((m) => m.id === ev.quake.by && m.alive)) ev.quake = null; // ราชาปีศาจล้มก่อนทุบ = วงหาย
  const plan = raidPlan(ctx, s);
  const mu = musterTick(ctx, s, round), sieges = [];
  for (const m of list) {
    if (!m.alive || !m.pos || stuckMob(m) || m.summon.born === round) continue;
    const type = mobType(m), sm = m.summon;
    if (type === "nest" || type === "giant" || type === "gold") continue; // โชโกโบะทองวิ่งหนีเอง (eosPerks.goldTurn)
    // อากาศ → มอน (PVE รอบสี่): พายุทราย = ทหารเหล็กในทะเลทรายไม่เห็นใคร ขยับเมื่อมีคนใกล้ ≤ 3
    if (type === "magitek" && sandOn(ctx) && inDesert(m.pos.x, m.pos.y) && !heroes(ctx).some((p) => manhattan(p.pos, m.pos) <= PKS.WEATHER_MOB.sandSight)) continue; // รังอยู่กับที่ · ยักษ์หินเดินตามเส้นทาง (eosExtra.giantTurn)
    const all = prey(ctx, s, m);
    // ---- นิสัยพิเศษ ----
    if (MBS.isNew(sm.trait) && MBS.act(ctx, s, H(), m, all, acc)) continue;
    if (sm.trait === "healer") { healerAct(ctx, s, m, all, moves, heals); continue; }
    if (sm.trait === "sniper") {
      const t = all.filter((p) => manhattan(p.pos, m.pos) <= TRAIT.sniperRange).sort((a, b) => manhattan(a.pos, m.pos) - manhattan(b.pos, m.pos))[0];
      if (t) {
        const dealt = ctx.combat.withEffectSource(m, () => ctx.damage(t, Math.max(1, (sm.atk | 0) + (stormOn(ctx) ? PKS.WEATHER_MOB.stormMagitekAtk : 0))));
        shots.push({ id: m.id, from: { ...m.pos }, to: { ...t.pos }, target: t.id, dmg: dealt });
        ctx.log(`🎯 ${m.name}ยิง ${t.name} -${dealt}`);
        continue;
      }
    }
    if (sm.trait === "bomber" && all.some((p) => footOf(ctx, p).some((tt) => manhattan(tt, m.pos) === 1))) { booms.push(bomberBlast(ctx, s, m, true)); continue; }
    if (type === "lament") { LM.act(ctx, s, H(), m, all, round, out); continue; }
    if (sm.trait === "boss") { bossAct(ctx, s, m, all, round, out); continue; }
    let targets = [], pillars = [], mov = Math.max(1, (ctx.action.movOf(m) | 0) + (type !== "beast" ? LM.rage(ctx).mov : 0) + (type === "daemon" && fogOn(ctx) ? PKS.WEATHER_MOB.fogDaemonMov : 0) + snowMov(ctx, m)); // พายุหิมะ = มอนเดิน −1 (เดินได้อย่างน้อย 1) // หมอก = ปีศาจล่าในหมอก เดิน +1
    if (type === "beast") {
      const agg = sm.aggro && round <= sm.aggroUntil + 1 ? ctx.match.players[sm.aggro] : null;
      if (agg && agg.alive && agg.pos) targets = [agg];
      else {
        sm.aggro = null;
        targets = all.filter((p) => manhattan(p.pos, m.pos) <= BEAST.reach + SKY.beastMod(s).reach); // ใครเข้าใกล้ = โดน (จันทร์เต็มดวง +1)
        mov = targets.length ? Math.min(mov, 1 + SKY.beastMod(s).mov) : 0;
      }
    } else {
      targets = (type === "daemon" || type === "magitek") && sm.trait !== "boss" ? MBS.smartTargets(ctx, s, H(), m, all, mov, acc) : all; // ฆ่าได้ก่อน · คนแยกกลุ่มก่อน
      pillars = pillarGoals(s);
      // ทหารเหล็กเล็งเสาก่อน (มีเสาที่ยึดแล้ว = ไปหาเสา เว้นแต่มีคนติดตัวอยู่แล้ว)
      if (type === "magitek" && pillars.length && !all.some((p) => manhattan(p.pos, m.pos) === 1)) targets = [];
    }
    let r = { to: null, path: null, target: null, pillar: null };
    if ((type === "daemon" || type === "magitek") && MBS.fallBack(ctx, s, H(), m, all, mov, acc)) continue; // บาดเจ็บหนัก = ถอยไปหาปีศาจหมอ
    const raidPl = plan.get(m.id);
    if (raidPl) { // หน่วยบุก: ตรงไปเสา (หรือป้อมปืนของเสา) · ตีเฉพาะคนที่ติดตัว/ยืนเฝ้าเสา
      const tg = all.filter((p) => manhattan(p.pos, m.pos) <= 1 || manhattan(p.pos, raidPl) <= RAID.guardR);
      r = stepMob(ctx, s, m, tg, [raidPl, ...plTurrets(ctx, raidPl)], mov);
      if (!r.to && !r.target && !r.pillar && !r.wall) sm.raid = null; // ไปไม่ถึง = เลิกบุก ล่าตามปกติ
    }
    // รวมพล: ยังไม่ติดพัน = ไปรอที่วงรอบจุดตั้งรับ (ไม่ทยอยเข้าไปให้ล้มทีละตัว)
    let held = false;
    if (!raidPl && mu && mu.mode === "gather" && musterMob(m) && !all.some((p) => manhattan(p.pos, m.pos) <= RAID.engage)) {
      const inRing = (x, y) => { const d = manhattan({ x, y }, mu.c); return d >= MUSTER.ring[0] && d <= MUSTER.ring[1] && !all.some((p) => manhattan(p.pos, { x, y }) <= RAID.engage); };
      const g = stepToward(ctx, s, m, mov, inRing);
      if (g) { held = true; if (g.to) r = { to: g.to, path: g.path, target: null, pillar: null }; }
    }
    if (!held && !r.to && !r.target && !r.pillar && !r.wall) r = targets.length || pillars.length ? stepMob(ctx, s, m, targets, pillars, mov) : r;
    // ไม่มีเป้า / ไปหาเป้าไม่ได้เลย = ลาดตระเวนเข้าหาผู้เล่น (สัตว์ยักษ์เฝ้าถิ่นเหมือนเดิม)
    // ปิดล้อม: ปีศาจไปหาใครไม่ได้ เพราะผู้เล่นหลบในเมืองที่ไฟเปิด = ไปยืนติดขอบเมืองนั้น (แล้วทุบไฟ)
    if (!held && lightBound(m) && !r.to && !r.target && !r.pillar && !r.wall) {
      const zs = new Set(heroes(ctx).map((p) => townOf(p.pos.x, p.pos.y)).filter((z) => z && lit(s, z)));
      if (zs.size) {
        const g = stepToward(ctx, s, m, mov, (x, y) => ctx.Board.DIRS.some(([dx, dy]) => zs.has(townOf(x + dx, y + dy)) && blockedTown(s, x + dx, y + dy)));
        if (g) { held = true; if (g.to) r = { to: g.to, path: g.path, target: null, pillar: null }; }
      }
    }
    if (!held && !raidPl && (type === "daemon" || type === "magitek") && sm.trait !== "boss") { r = MBS.coordinate(ctx, s, H(), m, r, all, mov); if (r.held) held = true; } // รุมเป้าเดียว · ล้อม · รอฝูงก่อนเข้าวงตี
    if (held) { /* รอในวงรวมพล / ยืนล้อมเมือง */ } else if (type !== "beast" && !r.to && !r.target && !r.pillar && !r.wall) { const w = roamMob(ctx, s, m, mov); if (w) r = { ...w, target: null, pillar: null }; }
    else if (r.to || r.target || r.pillar) sm.roam = null;
    if (!r.to && !r.target && !r.pillar && !r.wall) { if (lightBound(m)) { const z = townEdge(ctx, s, m); if (z) sieges.push(siegeLight(ctx, s, m, z)); } continue; }
    if (r.to && (r.to.x !== m.pos.x || r.to.y !== m.pos.y)) {
      moves.push({ id: m.id, type, from: { ...m.pos }, to: { ...r.to }, path: r.path });
      const pv = Array.isArray(r.path) && r.path.length > 1 ? r.path[r.path.length - 2] : m.pos;
      faceTo(sm, r.to.x - pv.x, r.to.y - pv.y);
      m.pos = { x: r.to.x, y: r.to.y };
      ctx.bump();
    }
    if (sm.trait === "bomber") { // ปีศาจระเบิด: เดินถึงตัวคน = ระเบิดทันที (ไม่ตีเสา)
      if (all.some((p) => footOf(ctx, p).some((tt) => manhattan(tt, m.pos) === 1))) booms.push(bomberBlast(ctx, s, m, true));
      continue;
    }
    const atk = Math.max(1, (sm.atk | 0) + LM.rage(ctx).atk + (type === "magitek" && stormOn(ctx) ? PKS.WEATHER_MOB.stormMagitekAtk : 0) + (type === "beast" ? SKY.beastMod(s).atk : 0)); // จันทร์เต็มดวง = สัตว์ยักษ์ตี +1 // ฝนฟ้าคะนอง = ทหารเหล็กลัดวงจร ตี −1
    // สัตว์ยักษ์ตีทุกคนที่ติดตัว (ล่อมาชนคนอื่นได้) · อื่นๆ ตีเป้าตัวเดียว · ไม่มีคนติด = ตีเสา
    const victims = type === "beast" ? all.filter((p) => footOf(ctx, p).some((t) => manhattan(t, m.pos) === 1)) : r.target ? [r.target] : [];
    for (const v of victims) {
      if (!v.alive) continue;
      if (v.pos) faceTo(sm, v.pos.x - m.pos.x, v.pos.y - m.pos.y); // หันหน้าเข้าหาคนที่ตี
      const dealt = ctx.combat.withEffectSource(m, () => ctx.damage(v, atk));
      if (!acc.focus && type !== "beast" && v.alive) acc.focus = v.id; // ตัวอื่นรุมเป้านี้ต่อ
      attacks.push({ id: m.id, type, x: m.pos.x, y: m.pos.y, target: v.id, dmg: dealt });
      ctx.log(`${type === "beast" ? "🐗" : type === "magitek" ? "🤖" : "👹"} ${m.name}โจมตี ${v.name} -${dealt}`);
    }
    if (!victims.length && !r.pillar && !r.wall && lightBound(m)) { const z = townEdge(ctx, s, m); if (z) sieges.push(siegeLight(ctx, s, m, z)); } // ปิดล้อม: ติดขอบเมือง = ทุบไฟ
    if (!victims.length && !r.pillar && r.wall) { const wh = hitWall(ctx, s, m, r.wall); if (wh) pillarHits.push({ type, ...wh }); }
    if (!victims.length && r.pillar && r.pillar.kind === "turret") { const wh = hitWall(ctx, s, m, r.pillar); if (wh) pillarHits.push({ type, ...wh }); }
    else if (!victims.length && r.pillar) pillarHits.push({ id: m.id, type, x: m.pos.x, y: m.pos.y, at: { x: r.pillar.x, y: r.pillar.y }, ...hitPillar(ctx, s, r.pillar, m) });
  }
  // ต้นเทิร์นเหตุการณ์เดียวสำหรับ client (เดิน → ตี) · ชื่อเดิม mob_move / mob_attack ใช้ทั้งปีศาจและศัตรูอื่น
  if (moves.length) ctx.fx("mob_move", { moves });
  if (attacks.length || pillarHits.length) ctx.fx("mob_attack", { attacks, pillars: pillarHits });
  if (heals.length) ctx.fx("mob_heal", { heals });
  if (shots.length) ctx.fx("mob_shot", { shots });
  if (acc.blinks.length) ctx.fx("mob_blink", { list: acc.blinks });
  if (acc.pulls.length) ctx.fx("mob_pull", { list: acc.pulls });
  if (acc.runes.length) ctx.fx("mob_rune_set", { list: acc.runes });
  if (sieges.length) { ctx.fx("town_siege", { list: sieges }); const z = sieges[sieges.length - 1]; if (!z.out) ctx.log(`👹 ปีศาจทุบไฟเมือง ${ZONE_NAMES[z.zone] || z.zone} (${z.hp}/${lightMax(s)})`); }
  return moves.length || attacks.length || pillarHits.length || heals.length || shots.length || booms.length || sieges.length || out.big || runeOut.length || regenOut.length || acc.runes.length || acc.pulls.length || acc.blinks.length ? 1 : 0;
}
// ปีศาจหมอ: ฟื้นเลือดมอนในระยะ 2 (รวมตัวเอง) แล้วถอยห่างผู้เล่น / เกาะกลุ่มมอนตัวอื่น · ไม่ตี
function healerAct(ctx, s, m, all, moves, heals) {
  const mov = Math.max(0, ctx.action.movOf(m) | 0);
  const near = all.filter((p) => manhattan(p.pos, m.pos) <= 3);
  let to = null, path = null;
  if (near.length) { // ถอย: ช่องในระยะเดินที่ห่างผู้เล่นใกล้สุดมากที่สุด
    const reach = ctx.Board.reachable(ctx.map(), { id: m.id, x: m.pos.x, y: m.pos.y, size: 1, alive: true }, mov, ctx.units().filter((u) => u.id !== m.id));
    let best = null, bd = -1;
    for (const n of reach.values()) {
      if (!tileFree(ctx, s, n.x, n.y, m.id) || blockedTown(s, n.x, n.y)) continue;
      const d = Math.min(...near.map((p) => manhattan(p.pos, n)));
      if (d > bd) { bd = d; best = n; }
    }
    if (best && (best.x !== m.pos.x || best.y !== m.pos.y)) to = { x: best.x, y: best.y };
  } else {
    const pals = mobsOf(ctx).filter((o) => o !== m && o.summon.trait !== "healer").sort((a, b) => manhattan(a.pos, m.pos) - manhattan(b.pos, m.pos));
    if (pals[0] && manhattan(pals[0].pos, m.pos) > 2) { const r = stepMob(ctx, s, m, [pals[0]], [], mov); if (r.to) { to = r.to; path = r.path; } }
  }
  if (to) { moves.push({ id: m.id, type: "healer", from: { ...m.pos }, to: { ...to }, path: path || [{ ...m.pos }, { ...to }] }); m.pos = { ...to }; ctx.bump(); }
  for (const o of mobsOf(ctx)) {
    if (manhattan(o.pos, m.pos) > TRAIT.healReach) continue;
    const before = o.hp;
    o.hp = Math.min(o.summon.maxHp, o.hp + TRAIT.healAmt);
    if (o.hp > before) heals.push({ id: o.id, by: m.id, x: o.pos.x, y: o.pos.y, amt: o.hp - before });
  }
}
// ปีศาจระเบิด: วง 3×3 ดาเมจ 3 ทุกตัวที่ไม่ใช่มอน (ผู้เล่น · รถเสบียง) + ตีเสาที่ติดอยู่ 1 รอย · self = ระเบิดเอง (สลายเงียบ — ไม่ได้ของ)
function bomberBlast(ctx, s, m, self) {
  if (m.summon.blasted || !m.pos) return null;
  m.summon.blasted = true;
  const at = { ...m.pos }, tiles = area3(at.x, at.y).filter((tt) => ctx.Board.inBounds(ctx.map(), tt.x, tt.y));
  const hits = [];
  for (const u of unitsOn(ctx, tiles)) { if (isMob(u)) continue; const dealt = ctx.combat.withEffectSource(m, () => ctx.damage(u, TRAIT.bombDmg)); hits.push({ id: u.id, dmg: dealt }); }
  const pl = s.pillars.find((o) => o.owner && manhattan(o, at) === 1);
  if (pl) hitPillar(ctx, s, pl, m);
  if (self) lazySummon().remove(m);
  ctx.bump();
  ctx.fx("mob_boom", { id: m.id, x: at.x, y: at.y, tiles, hits });
  ctx.log(`💥 ${m.name}ระเบิด!${hits.length ? ` โดน ${hits.length} ตัว` : ""}`);
  return { at, hits };
}
// ศัตรู AI ตาย (server/summon.js onDeath — ฆ่าโดยใครก็ได้ด้วยวิธีใดก็ได้) → เหรียญ + ของดรอป + ค่าหัว
const DROP_POOL = {
  daemon: { pct: 30, items: ["armor", "cleanse", "gysahl"] },
  magitek: { pct: 40, items: ["armor", "resist", "battery"], flask: 35 },
  beast: { pct: 100, items: ["lifeCrystal", "armorCrystal", "windBoots"] },
  nest: { pct: 70, items: ["armor", "cleanse", "resist", "fortune"], flask: 40 },
  gold: { pct: 100, items: ["lifeCrystal", "armorCrystal", "windBoots", "fortune"] },
};
function itemOf(type) {
  const C = require("../constants");
  return type === "armor" ? { type, value: C.SHOP_ARMOR_AMOUNT } : { type };
}
function loot(ctx, s, p, pool, rng = ctx.rng) {
  const got = [];
  if (!p || !p.alive) return got;
  if (pool.pct && rng() * 100 < pool.pct) {
    const it = pool.items[Math.floor(rng() * pool.items.length) % pool.items.length];
    const entry = lazyShop().grantInventoryItem(p, itemOf(it));
    if (entry) got.push({ item: it, name: lazyShop().shopItemName ? lazyShop().shopItemName(entry) : it });
  }
  if (pool.flask && rng() * 100 < pool.flask) {
    const bag = flasksOf(s, p);
    if (bag.length < FLASK_MAX) { const el = ELEMENTS[Math.floor(rng() * 3) % 3]; bag.push(el); got.push({ flask: el, name: `ขวด${ELEMENT_NAMES[el]}` }); }
  }
  return got;
}
function onMobDeath(m, killerId) {
  const F = require("../fodlan");
  if (!F.active() || !F.isEos() || !F.stageState() || !F.stageState().eos) return;
  const ctx = F.makeCtx(), s = F.stageState().eos;
  const type = mobType(m), at = m.pos ? { ...m.pos } : null;
  let by = killerId ? ctx.match.players[killerId] : null;
  if (by && by.summon && by.summon.controlled) by = ctx.match.players[by.summon.ownerId] || by; // ร่างแยกฆ่า = เจ้าของได้ของ
  if (by && (isMob(by) || by.summon)) by = null;
  s.kills = (s.kills || 0) + 1;
  MBS.onDeath(ctx, s, H(), m); // ตัวแยกร่าง: แตก 2 ร่าง
  const elite = ELT.isElite(m);
  if (elite) ELT.onDeath(ctx, s, H(), m, by); // หัวหน้า: ระเบิดตอนตาย · แต้มรวม
  if (by && (elite || m.summon.trait === "boss")) { const S = SUM(s), b = elite ? S.elites : S.bosses; b[by.id] = (b[by.id] || 0) + 1; }
  if (m.summon.trait === "bomber") bomberBlast(ctx, s, m, false); // โดนฆ่าก็ระเบิด — ฆ่าจากระยะไกลปลอดภัยกว่า
  E.questKill(ctx, s, H(), at, by);
  if (XT.onMobDeath(ctx, s, H(), m, by)) return; // ท่าร่วม · ฉายา · มาตรวัดทีม · ยักษ์หิน (แจกของเอง)
  if (type === "lament") { LM.onDeath(ctx, s, H(), m, by); checkWin(ctx, s); return; }
  if (m.summon.trait === "boss") { if (by) lazyShop().addGold(by, m.summon.gold || 0); E.onBossDeath(ctx, s, H(), m, by); huntDone(ctx, s, by, type); return; }
  const mul = E.bloodMul(s) * (type === "beast" ? SKY.beastMod(s).goldMul : 1), pool0 = DROP_POOL[type] || {}, luck = PKS.fortune(s); // จันทร์เต็มดวง: สัตว์ยักษ์ของรางวัล ×2 // การ์ดโชคลาภ: เหรียญ +1 · โอกาสได้ของ +20%
  const pool = { ...pool0, pct: elite ? 100 : Math.min(100, ((pool0.pct || 0) + E.dropBonus(ctx) + luck.pct) * mul), flask: pool0.flask ? Math.min(100, pool0.flask * mul) : 0 };
  const gold = by ? lazyShop().addGold(by, Math.max(1, (m.summon.gold || 0) + luck.gold - (s.lamentOn ? LM.LAMENT.goldCut : 0)) * mul) : 0; // Lament: เหรียญ −1
  const got = by ? loot(ctx, s, by, pool) : [];
  if (by && by.alive && PKS.hunterHeal(s) && ctx.combat.healHp) ctx.combat.healHp(by, PKS.hunterHeal(s)); // การ์ดนักล่า
  if (type === "beast") s.beastBack = ctx.match.roundNumber + BEAST.respawn;
  ctx.bump();
  ctx.fx(type === "daemon" ? "daemon_die" : "mob_die", { id: m.id, type, x: at ? at.x : 0, y: at ? at.y : 0, kind: m.summon.look, by: by ? by.id : null, gold, loot: got.map((g) => g.name) });
  huntDone(ctx, s, by, type);
  ctx.log(`💥 ${by ? by.name : "ใครบางคน"} โค่น${MOB_NAMES[type] || "ศัตรู"}!${gold ? ` +${gold} เหรียญ` : ""}${got.length ? ` · ได้ ${got.map((g) => g.name).join(", ")}` : ""}`);
}
// สัตว์ยักษ์โดนตี (ทุกวิธี) → ไล่คนที่ตีมัน: ตรวจตอนจบตาของแต่ละคน (เลือด+เกราะลดลง = คนที่เพิ่งเดินคือคนตี)
function beastAggro(ctx, s, p) {
  for (const m of mobsOf(ctx, "beast")) {
    const now = m.hp + (m.armor || 0);
    if (p && !isMob(p) && now < (m.summon.mark || 0)) { m.summon.aggro = p.id; m.summon.aggroUntil = ctx.match.roundNumber + BEAST.aggroTurns; }
    m.summon.mark = now;
  }
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

// ============================================================ ฝ่าย (PVE — ผู้ใช้สั่ง 2026-11-10: ผู้เล่นทุกคนฝ่ายเดียวกัน · มอนเตอร์อีกฝ่าย)
function sideOf(p) {
  if (!p) return null;
  return isMob(p) ? MOB_SIDE : PVE;
}
const PVE_COLOR = "#7fd4ff";
function sideColor(ctx, side) { return side === PVE ? PVE_COLOR : "#b04ad8"; }

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
  if (isMob(p) || (p && p.summon && !p.summon.controlled)) return null;
  const pl = pillarNear(ctx, s, p);
  if (!pl) return null;
  if (pl.owner === sideOf(p)) {
    // เสาที่ยึดแล้วแต่โดนมอนตี = ซ่อมได้ (ใช้การตี)
    return { pl, ok: (pl.hits || 0) > 0 && canStrike(ctx, p), repair: true };
  }
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
  if (st0.repair) {
    pl.hits = 0;
    ctx.fx("pillar_repair", { id: pl.id, x: pl.x, y: pl.y, by: p.id });
    ctx.log(`🔧 ${p.name} ซ่อมเสา ${ZONE_NAMES[pl.zone] || ""}`);
    XT.stat(s, p.id, "guard");
  } else if (!st0.second) {
    pl.ch = { by: p.id, side: sideOf(p), round: ctx.match.roundNumber, mark: markOf(p) };
    ctx.fx("seize_start", { id: pl.id, x: pl.x, y: pl.y, by: p.id, color: sideColor(ctx, sideOf(p)) });
    ctx.log(`🔷 ${p.name} เริ่มร่ายพิธียึดเสา ${ZONE_NAMES[pl.zone] || ""}`);
  } else {
    const was = pl.owner;
    pl.owner = pl.ch.side; pl.ch = null; pl.hits = 0;
    ctx.fx("seize_done", { id: pl.id, x: pl.x, y: pl.y, by: p.id, from: was, color: sideColor(ctx, pl.owner) });
    ctx.log(`🔷 ${p.name} ยึดเสา ${ZONE_NAMES[pl.zone] || ""} ได้!`);
    XT.stat(s, p.id, "guard", 2);
  }
  ctx.useStrike(p, SEIZE_SECS);
  return true;
}
const heldCount = (s) => s.pillars.filter((pl) => pl.owner === PVE).length;
const rateOf = (n) => SCORE_TABLE[Math.min(n, SCORE_TABLE.length - 1)] || 0;
// จบเทิร์น: แต้มรวมตามจำนวนเสาที่ผู้เล่นถือ → ถึง SCORE_GOAL = ทุกคนชนะ
function scoreRound(ctx, s) {
  const n = heldCount(s), add = rateOf(n);
  s.lastGain = add;
  if (add > 0) {
    s.score = (s.score || 0) + add;
    ctx.fx("score", { gains: [{ side: PVE, add, total: s.score, color: PVE_COLOR }], held: n, total: s.score, goal: E.goalOf(ctx) });
  }
  checkWin(ctx, s);
  E.onScore(ctx, s, H()); // แต้มรวมถึงครึ่ง = ราชาปีศาจครั้งแรก
  XT.onScore(ctx, s, H());
  LM.onScore(ctx, s, H()); // Lament: แต้มรวม 90 = ผู้คร่ำครวญ // แต้มรวมถึง 40 = คืนสุดท้าย
  PKS.onScore(ctx, s); // แต้มรวมถึง 10/20/30 = โหวตการ์ดอัปเกรดทีม
}
function checkWin(ctx, s) {
  if (s.score >= E.goalOf(ctx) && !s.result && LM.blocksWin(ctx, s, H())) return; // Lament: ต้องล้มผู้คร่ำครวญก่อน
  if (s.score >= E.goalOf(ctx) && !s.result) {
    s.result = "win";
    ctx.log(`🏆 แต้มรวมครบ ${E.goalOf(ctx)} — ปกป้อง Eos สำเร็จ!`);
  }
}
// แต้มรวมโบนัส (บอส · ภารกิจ · ขบวนเสบียง)
function addScore(ctx, s, n, why) {
  s.score = (s.score || 0) + n;
  ctx.fx("score_bonus", { add: n, total: s.score, why, goal: E.goalOf(ctx) });
  checkWin(ctx, s);
  E.onScore(ctx, s, H());
  XT.onScore(ctx, s, H());
  LM.onScore(ctx, s, H()); // Lament: แต้มรวม 90 = ผู้คร่ำครวญ
  PKS.onScore(ctx, s);
}
// ผลแมตช์ (phases/endTurn.js gameOver): "win" = แต้มครบ · "lose" = ผู้เล่นล้มหมดพร้อมกัน (ไม่มีใครเหลือรอเพื่อนฟื้น)
function outcome(ctx, st) {
  const s = st && st.eos;
  if (!s) return null;
  if (s.result) return s.result;
  const people = Object.values(ctx.match.players).filter((u) => !u.summon);
  if (LM.lost(ctx, s)) { s.result = "lose"; ctx.log("🕯️ ชีวิตทีมหมด — Eos จมสู่ความโศก"); return s.result; } // Lament
  if (people.length && people.every((u) => !u.alive)) {
    s.result = "lose";
    ctx.log("🌑 ผู้เล่นล้มหมดทุกคน — Eos ถูกความมืดกลืนกิน");
  }
  return s.result;
}
// เดิม (โหมดแข่ง) — คงไว้ให้ fodlan.eosWinner: ชนะ = ผู้เล่นคนแรก (ทั้งทีมชนะ)
function winner(ctx, st) {
  const s = st && st.eos;
  if (!s || s.result !== "win") return null;
  const p = Object.values(ctx.match.players).find((u) => !u.summon && !u.duoOf);
  return p ? p.id : null;
}

// ============================================================ ตายแล้วฟื้น (หลัง 3 เทิร์น — จุดเกิดที่ไกลมอนเตอร์สุด)
// สรุปจบเกม Eos (ผู้ใช้สั่ง 2026-11-12 "ทำทั้งหมด"): ดาเมจที่มอนแต่ละชนิดทำใส่ทีม · ใครล้มกี่ครั้ง เพราะอะไร · ใครล้มหัวหน้า/บอส
const SUM = (s) => (s.sum ||= { mobDmg: {}, last: {}, deaths: {}, causes: {}, elites: {}, bosses: {} });
function mobKey(m) { const tr = m.summon.trait, type = mobType(m); return { key: tr || type, name: (tr && (MBS.nameOf(type, tr) || TRAIT_NAMES[tr])) || MOB_NAMES[type] || m.name }; }
function sumHit(s, p, src, n) {
  if (!(n > 0) || !p || isMob(p)) return;
  const k = mobKey(src), S = SUM(s);
  const row = (S.mobDmg[k.key] ||= { key: k.key, name: k.name, n: 0 });
  row.n += n;
  S.last[p.id] = k.key;
}
function publicSum(ctx, s) {
  const S = SUM(s);
  return { turns: ctx.match.roundNumber, mobDmg: Object.values(S.mobDmg).sort((a, b) => b.n - a.n).slice(0, 5), deaths: S.deaths, causes: S.causes, elites: S.elites, bosses: S.bosses };
}
function noteDeaths(ctx, s) {
  for (const p of Object.values(ctx.match.players)) {
    if (p.summon || p.alive) { delete s.dead[p.id]; continue; }
    if (s.dead[p.id] == null) {
      s.dead[p.id] = ctx.match.roundNumber;
      { const S = SUM(s); S.deaths[p.id] = (S.deaths[p.id] || 0) + 1; const c = S.last[p.id]; if (c) (S.causes[p.id] ||= {})[c] = ((S.causes[p.id] || {})[c] || 0) + 1; }
      PKS.noteDown(s);
      LM.onDown(ctx, s); // Lament: ชีวิตทีม // ดาวท้าทาย "ไม่มีใครล้ม"
      ctx.log(`🕯️ ${p.name} ล้มลง — ฟื้นในอีก ${reviveTurns(s)} เทิร์น`);
    }
  }
}
function reviveSpot(ctx, s, p) {
  const map = ctx.map();
  const foes = mobsOf(ctx);
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
    if (!p || p.alive || p.summon || turn < r + reviveTurns(s)) continue;
    const spot = E.helpedSpot(ctx, s, H(), p) || reviveSpot(ctx, s, p); // ถูกเพื่อนช่วย = ฟื้นข้างดวงวิญญาณ
    if (!spot) continue;
    E.onRevived(s, pid);
    p.alive = true; p.result = null; p.locked = false;
    p.statuses = {}; p.statusAmt = {};
    p.shield = 0; p.tempHp = 0; p.tempHpTurns = 0; p.mountId = null; p.wasAttacked = false; p.corpseKeeper = null;
    p.corpse = null;
    p.boardSize = 1;
    if (ctx.combat.respawnReset) ctx.combat.respawnReset(p); // เกิดใหม่: ของที่ใช้ได้ครั้งเดียวต่อเกมกลับมาใช้ได้ (ผู้ใช้สั่ง 2026-11-11)
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
const DOME_HP = 8;              // บาเรียประตูรวม — มอนทุบครบ = โดมแตกก่อนเวลา (ผู้ใช้ 2026-11-10 "ปีศาจโจมตีกำแพงบาเรียได้")
const DOME_COOLDOWN = 5;       // ปิดแล้วพัก 5 เทิร์นก่อนเปิดใหม่ (ผู้ใช้สั่ง 2026-11-10 "ต้องมีคูลดาวน์ในการเปิด" — เดิม 2)
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
// ---------- จังหวะเหตุการณ์ใหญ่ (ผู้ใช้แจ้ง 2026-11-10 "หลายเหตุการณ์เกิดพร้อมกัน จนรับมือได้ยาก") ----------
//  เหตุการณ์ใหญ่ = ยักษ์หิน · ราชาปีศาจ (เตือน/อยู่) · ขบวนเสบียง · คราส · ฝนดาวตก · รถไฟขนเสบียง · คืนสุดท้าย
//  ทีละอย่าง + เว้นอย่างน้อย BIG_GAP เทิร์นหลังเริ่มอันก่อน — อันที่ถึงคิวแต่ติดอยู่ เลื่อนออกไปเอง
const BIG_GAP = 3;
// เพดานมอนบนแผนที่พร้อมกัน (ผู้ใช้แจ้ง 2026-11-10 "ช่วงสุดท้ายมอนเยอะจนไม่มีทางต่อกร") — ไม่นับรัง/ยักษ์หิน/โชโกโบะทอง/ราชาปีศาจ
const MOB_CAP = { base: 12, perHero: 4, max: 28 };
function mobRoom(ctx) {
  const heroesN = heroes(ctx).filter((p) => !p.summon).length || 1;
const C = LM.on(ctx) ? LM.LAMENT.cap : MOB_CAP; // Lament: เพดานมอนสูงขึ้น
  const mul = LM.on(ctx) ? 1 : (E.diffOf(ctx).cap || 1); // ความยาก: ง่าย ×0.8 · ปกติ ×1 · ยาก ×1.25
  const cap = Math.round(Math.min(C.max, C.base + C.perHero * (heroesN - 1)) * mul);
  const have = mobsOf(ctx).filter((m) => { const t = mobType(m); return t !== "nest" && t !== "giant" && t !== "gold" && t !== "lament" && m.summon.trait !== "boss"; }).length;
  return Math.max(0, cap - have);
}
function bigBusy(ctx, s) {
  const e = E.ev(s), x = s.x || {}, k = s.sky || {};
  const boss = !!e.bossWarn || mobsOf(ctx, "daemon").some((d) => d.summon.trait === "boss");
  return !!(x.giant || x.final || boss || e.convoy || k.eclipse || k.meteor || k.supply);
}
function bigFree(ctx, s, turn) { return !bigBusy(ctx, s) && turn - (s.bigLast ?? -99) >= BIG_GAP; }
function bigStart(s, turn) { s.bigLast = turn; }
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
  s.dome = { left: DOME_TURNS, by: p.id, hp: DOME_HP };
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
// แผงไฟเมือง = ไฟสาด (ผู้ใช้แจ้ง 2026-11-10 "สวิตช์ไฟในเมืองไม่มีประโยชน์อะไรเลย" — เดิมเปิด/ดับไฟ ซึ่งเปิดอยู่แล้วตลอด)
//  ไฟเมืองเปิดถาวร · กดแผง = แสงสาดจ้า: ปีศาจ/ทหารเหล็ก/หุ่นเกราะในระยะ FLASH.r จากแผง มึน 1 เทิร์น + ปีศาจโดนแสงไหม้ FLASH.dmg · พักเครื่อง FLASH.cd เทิร์น
const FLASH = { r: 6, dmg: 1, cd: 5 };
const flashCd = (ctx, s, zone) => Math.max(0, ((s.flashReady || {})[zone] || 0) - ctx.match.roundNumber);
function flipLights(ctx, s, p) {
  const sw = switchNear(ctx, p);
  if (!sw || !canStrike(ctx, p) || flashCd(ctx, s, sw.zone) > 0) return false;
  const at = { x: sw.at[0], y: sw.at[1] }, hits = [];
  for (const m of mobsOf(ctx)) {
    const t = mobType(m);
    if (!m.alive || !m.pos || t === "nest" || t === "giant" || t === "gold" || manhattan(m.pos, at) > FLASH.r) continue;
    if (ctx.combat.applyDebuff) ctx.combat.applyDebuff(m, "stun", 1, 1);
    const dealt = t === "daemon" && m.summon.trait !== "boss" ? hurt(ctx, m, FLASH.dmg, p) : 0;
    hits.push({ id: m.id, x: m.pos.x, y: m.pos.y, dmg: dealt });
  }
  (s.flashReady ||= {})[sw.zone] = ctx.match.roundNumber + FLASH.cd;
  ctx.match.action.locked = true;
  ctx.bump();
  ctx.fx("city_flash", { zone: sw.zone, x: at.x, y: at.y, r: FLASH.r, hits, by: p.id });
  ctx.log(`💡 ${p.name} สาดไฟเมือง ${ZONE_NAMES[sw.zone] || sw.zone} — มอน ${hits.length} ตัวตาพร่า`);
  ctx.useStrike(p, SWITCH_SECS);
  return true;
}
// ---------- L9 ผักกิซาล (ไอเทม — server/shop.js) ----------
// Lament: ร้านแพง ×1.5 (server/shop.js stockShop / syncStageItems)
function eosPriceMul() { const F = require("../fodlan"); return gysahlOnSale() && F.makeCtx && LM.on(F.makeCtx()) ? LM.LAMENT.shop : 1; }
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
const MECH = { chance: 0.25, perDay: 0.1, weak: 2 }; // weak = ตีจากด้านหลังแรง +2 (ผู้ใช้เลือกไอเดีย 2026-11-10) // หุ่นเกราะ: โอกาสต่อยาน 25% + 10% ต่อวันที่ผ่านไป
const DROP_FROM = 2; // ยานลงได้ตั้งแต่เทิร์น 2 (กลางวันลงบ่อย — dropshipTurn)
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
    if (by && p.id !== by.id && ctx.combat.sameTeam(by, p)) continue; // PVE: ของด่านที่ผู้เล่นใช้ไม่โดนพวกเดียวกัน
    const dealt = hurt(ctx, p, dmg, by);
    if (extra && p.alive) extra(p);
    hits.push({ id: p.id, dmg: dealt });
  }
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
    hits = unitsOn(ctx, tiles).filter((u) => u.id !== p.id && !ctx.combat.sameTeam(p, u)).map((u) => { lazyIce().applySlow(u); return { id: u.id, dmg: 0 }; });
    for (const t of tiles) if (WATERY.has(K(t.x, t.y))) { try { lazyIce().layIce(t.x, t.y, p.id, { bridge: true }); } catch { /* วางไม่ได้ */ } }
    ctx.bump();
  } else {
    hits = hitArea(ctx, s, tiles, THUNDER_DMG, p);
    const body = waterBody(ctx, tiles);
    if (body.length) {
      shock = body;
      const already = new Set(hits.map((h) => h.id));
      for (const u of unitsOn(ctx, body)) if (!already.has(u.id) && !ctx.action.walksThrough(u)) { if (ctx.combat.sameTeam(p, u)) continue; hits.push({ id: u.id, dmg: hurt(ctx, u, SHOCK_DMG, p), shock: true }); }
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
const turretUp = (ctx, t) => (ctx.map().terrain || {})[K(t.x, t.y)] === "fd_eos_turret"; // ป้อมพัง = หายจากชั้นแผนที่
function turretNear(ctx, p) { return TURRETS.find((t) => ctx.adjacent(p, t.x, t.y) && turretUp(ctx, t)) || null; }
function turretTargets(ctx, s, p, t) {
  return mobsOf(ctx).filter((u) => manhattan(u.pos, t) <= TURRET_RANGE && !ctx.Visibility.hiddenFromUnit(p, u)).map((u) => ({ x: u.pos.x, y: u.pos.y }));
}
function fireTurret(ctx, s, p, tile) {
  const t = turretNear(ctx, p);
  if (!t || !canStrike(ctx, p) || !tile) return false;
  const target = bodies(ctx).find((u) => u.pos.x === tile.x && u.pos.y === tile.y);
  if (!target || !turretTargets(ctx, s, p, t).some((c) => c.x === tile.x && c.y === tile.y)) return false;
  const dealt = hurt(ctx, target, TURRET_DMG + PKS.turretBonus(s), p);
  ctx.match.action.locked = true;
  p.exposedRound = ctx.match.roundNumber;
  ctx.fx("turret_shot", { from: { x: t.x, y: t.y }, to: { ...tile }, target: target.id, dmg: dealt, by: p.id });
  ctx.log(`🔫 ${p.name} ยิงป้อมปืนใส่ ${target.name} -${dealt}`);
  ctx.useStrike(p, TURRET_SECS);
  return true;
}
// ---------- L14 สัตว์ยักษ์ + L15 ทหารเหล็ก (มอนเตอร์ — ส่วน "มอนเตอร์" ด้านบน) ----------
function spawnBeast(ctx, s) {
  const [hx, hy] = MAP.BEAST_HOME;
  const at = freeNear(ctx, s, hx, hy, 4);
  if (!at) return false;
  spawnMob(ctx, s, "beast", at, { hp: BEAST.hp, armor: BEAST.armor, atk: BEAST.atk, mov: BEAST.mov, gold: BEAST.gold }, { home: { x: hx, y: hy } });
  s.beastBack = 0;
  ctx.bump();
  ctx.fx("beast_roar", { x: at.x, y: at.y });
  return true;
}
// ยานลงจอด (ผู้ใช้สั่ง 2026-11-10 "ตอนเช้าหุ่นยนต์ลงโจมตีหลายพื้นที่ได้ง่าย"):
//  กลางวัน: สุ่ม DAY_DROP_PCT% ต่อเทิร์น ลงได้พร้อมกันหลายลำ (วันแรก 2 · ตั้งแต่วันที่ 2 = 3) คนละพื้นที่ (ห่างกัน ≥ SHIP_SPREAD)
//  กลางคืน: NIGHT_DROP_PCT% ไม่เกิน 1 ลำ · เตือนช่อง 2×2 → ต้นเทิร์นถัดไปลงจอด ปล่อยทหารเหล็ก → ครบ MAGITEK.stay เทิร์นทหารที่เหลือขึ้นยานกลับ
const DAY_DROP_PCT = 55, NIGHT_DROP_PCT = 15, SHIP_SPREAD = 9;
const maxShips = (ctx, s, night) => (night ? 1 : Math.min(3, 1 + Math.max(1, s.dayNo || 1)));
function dropZone(ctx, s) {
  const map = ctx.map(), cand = [];
  const ships = s.ships || [];
  for (let y = 1; y < map.rows - 2; y++) for (let x = 1; x < map.cols - 2; x++) {
    const cells = [{ x, y }, { x: x + 1, y }, { x, y: y + 1 }, { x: x + 1, y: y + 1 }];
    if (cells.some((c) => townOf(c.x, c.y) || !tileFree(ctx, s, c.x, c.y) || onRail(c.x, c.y))) continue;
    if (bodies(ctx).some((p) => manhattan(p.pos, { x, y }) < 4)) continue;
    if (ships.some((d) => manhattan(d, { x, y }) < SHIP_SPREAD)) continue;
    cand.push({ x, y });
  }
  // เสาที่ไม่มีคนเฝ้า = ยานมักลงใกล้ๆ (60%) — ผู้บัญชาการฝูงมอน 2026-11-11
  const open = openPillars(ctx, s);
  if (open.length && ctx.rng() < 0.6) {
    const near = cand.filter((c) => open.some((pl) => { const d = manhattan(c, pl); return d >= 4 && d <= 8; }));
    if (near.length) return ctx.pick(near, 1)[0];
  }
  return ctx.pick(cand, 1)[0] || null;
}
function dropshipTurn(ctx, s, turn) {
  let secs = 0;
  s.ships = s.ships || [];
  const night = nightAt(ctx, turn);
  for (const d of s.ships.slice()) {
    if (d.state === "warn" && turn >= d.landAt) {
      const spawned = [], tier = Math.max(1, s.dayNo || 1), stats = E.scaleStats(ctx, magitekStats(tier)), n = Math.max(2, E.scaleCount(ctx, MAGITEK.count + (tier >= 3 ? 1 : 0)));
      const trait = () => (tier >= 2 && !spawned.some((o) => o.sniper) ? "sniper" : null); // ทหารเหล็กยิงไกล ลำละ 1 ตัว ตั้งแต่วันที่ 2
      for (const c of [{ x: d.x, y: d.y }, { x: d.x + 1, y: d.y }, { x: d.x, y: d.y + 1 }, { x: d.x + 1, y: d.y + 1 }]) {
        if (spawned.length >= n) break;
        const at = tileFree(ctx, s, c.x, c.y) ? c : freeNear(ctx, s, c.x, c.y, 2);
        if (!at) continue;
        const tr = trait() || MBS.pickMagitek(ctx, s, H()); // + โล่/โซ่ลาก/วงเวท/หน้าไม้ (eosMobs)
        const m = spawnMob(ctx, s, "magitek", at, traitStats(stats, tr), { ship: d.id, tier, trait: tr });
        spawned.push({ id: m.id, x: at.x, y: at.y, sniper: tr === "sniper" });
      }
      if (spawned.length < n) { const extra = freeNear(ctx, s, d.x, d.y, 3); if (extra) { const m = spawnMob(ctx, s, "magitek", extra, stats, { ship: d.id, tier }); spawned.push({ id: m.id, x: extra.x, y: extra.y }); } }
      // หุ่นเกราะจักรวรรดิ (ภาพจากผู้ใช้ 2026-11-10 "หุ่นพิเศษที่จะมีโอกาสโผล่มาพร้อมกองทัพ") — ลำละไม่เกิน 1 ตัว · โอกาส MECH.chance (Claude ตั้ง)
      let mech = false;
      if (ctx.rng() < MECH.chance + MECH.perDay * Math.max(0, tier - 1)) { const at = freeNear(ctx, s, d.x, d.y, 3); if (at) { const m = spawnMob(ctx, s, "magitek", at, traitStats(stats, "mech"), { ship: d.id, tier, trait: "mech" }); spawned.push({ id: m.id, x: at.x, y: at.y, mech: true }); mech = true; } }
      d.state = "landed"; d.leaveAt = turn + MAGITEK.stay;
      ctx.bump();
      ctx.fx("dropship_land", { id: d.id, x: d.x, y: d.y, spawned });
      ctx.log(`🛸 ยานจักรวรรดิลงจอด — ทหารเหล็ก ${spawned.length - (mech ? 1 : 0)} ตัว${mech ? " + หุ่นเกราะจักรวรรดิ!" : "!"}`);
      secs = SECS.dropship;
    } else if (d.state === "landed" && turn >= d.leaveAt) {
      for (const m of mobsOf(ctx, "magitek")) if (m.summon.ship === d.id) lazySummon().remove(m);
      s.ships = s.ships.filter((o) => o !== d);
      ctx.bump();
      ctx.fx("dropship_leave", { id: d.id, x: d.x, y: d.y });
      ctx.log("🛸 ยานจักรวรรดิถอนกำลังกลับ");
    }
  }
  if (turn >= Math.max(DROP_FROM, s.dropNext || 0) && s.ships.length < maxShips(ctx, s, night) && ctx.rng() * 100 < (night ? NIGHT_DROP_PCT : DAY_DROP_PCT)) {
    // กลางวัน: ลงทีละ 1–2 ลำในเทิร์นเดียว (หลายพื้นที่)
    const want = night ? 1 : Math.min(maxShips(ctx, s, night) - s.ships.length, ctx.rng() < 0.5 ? 2 : 1);
    for (let i = 0; i < want; i++) {
      const z = dropZone(ctx, s);
      if (!z) break;
      const d = { id: `fd:ship${++s.seq}`, x: z.x, y: z.y, state: "warn", landAt: turn + 1 };
      s.ships.push(d);
      ctx.fx("dropship_warn", { id: d.id, x: z.x, y: z.y });
    }
    if (s.ships.some((d) => d.state === "warn" && d.landAt === turn + 1)) ctx.log("🚨 ยานจักรวรรดิกำลังจะลงจอด!");
    s.dropNext = turn + 1;
  }
  return secs;
}
// ---------- หีบสมบัติ (ผู้ใช้สั่ง 2026-11-10 "ด่านกว้าง อยากให้มีอะไรทำ" — Claude ตั้งตัวเลข) ----------
//  ทุก CHEST_EVERY เทิร์น หีบโผล่ตามที่รกร้าง (นอกเมือง ห่างผู้เล่น) ครั้งละ CHEST_BATCH ใบ ไม่เกิน CHEST_MAX · ตีหีบ (ใช้การโจมตี) = เหรียญ + ของ
const CHEST_FIRST = 2, CHEST_EVERY = 3, CHEST_BATCH = 2, CHEST_MAX = 4, CHEST_GOLD = [3, 6], CHEST_LOOT = { pct: 60, items: ["armor", "cleanse", "resist", "fortune", "windBoots"], flask: 30 };
function spawnChests(ctx, s, turn) {
  s.chests = s.chests || [];
  if (turn < (s.chestNext || CHEST_FIRST) || s.chests.length >= CHEST_MAX) return 0;
  s.chestNext = turn + CHEST_EVERY;
  const map = ctx.map(), cand = [];
  for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) {
    if (townOf(x, y) || onRail(x, y) || !tileFree(ctx, s, x, y) || specialOf(ctx, x, y) === "fd_eos_forest") continue;
    if (bodies(ctx).some((p) => manhattan(p.pos, { x, y }) < 5)) continue;
    if (s.chests.some((c) => manhattan(c, { x, y }) < 8)) continue;
    cand.push({ x, y });
  }
  const out = [];
  for (const t of ctx.pick(cand, cand.length)) {
    if (out.length >= Math.min(CHEST_BATCH, CHEST_MAX - s.chests.length)) break;
    if (out.some((o) => manhattan(o, t) < 8)) continue;
    out.push(t);
  }
  for (const t of out) s.chests.push({ id: `fd:chest${++s.seq}`, x: t.x, y: t.y });
  if (out.length) { ctx.bump(); ctx.fx("chest_spawn", { list: out }); ctx.log(`🎁 หีบสมบัติโผล่ ${out.length} ใบ`); }
  return out.length;
}
function openChest(ctx, s, c, p) {
  s.chests = s.chests.filter((o) => o !== c);
  ctx.bump();
  const gold = lazyShop().addGold(p, CHEST_GOLD[0] + Math.floor(ctx.rng() * (CHEST_GOLD[1] - CHEST_GOLD[0] + 1)));
  const got = loot(ctx, s, p, CHEST_LOOT);
  ctx.fx("chest_open", { id: c.id, x: c.x, y: c.y, by: p.id, gold, loot: got.map((g) => g.name) });
  ctx.log(`🎁 ${p.name} เปิดหีบ${gold ? ` +${gold} เหรียญ` : ""}${got.length ? ` · ได้ ${got.map((g) => g.name).join(", ")}` : ""}`);
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
  if (!mobsOf(ctx, "beast").length && s.beastBack && round >= s.beastBack) changed = spawnBeast(ctx, s) || changed;
  if (spawnChests(ctx, s, round)) changed = true;
  if (changed) ctx.bump();
}

// ============================================================ ขั้น 4: เดินทาง (L2–L4) + เก็บของ/บัฟ (L16–L19) — ตัวเลข/รายละเอียด Claude ตัดสิน (ผู้ใช้สั่ง "Start phase 4")
//  L2 รถไฟ: ทุก TRAIN_EVERY เทิร์น (เทิร์น 4, 8, …) วิ่งตามราง y = 20 สลับทิศ · เทิร์นก่อนผ่าน = เตือนทั้งราง
//     ต้นเทิร์นที่ผ่าน: คนบนราง (ไม่บิน) TRAIN_DMG + กระเด็นออกข้างราง · ปีศาจ/ศัตรูบนราง TRAIN_DMG · รถจอดบนราง = ถูกดันออก
//     ยืนบนชานชาลา = ขึ้นรถไฟ ไปลงชานชาลาอีกฝั่ง
//  L3 กอนโดลา: ยืนบนท่า (Altissia) + ยังเดินได้ → เลือกท่าอื่น ไปทันที (จบการเดินของตา)
//  L4 อุโมงค์: ยืนบนปากอุโมงค์ + ยังเดินได้ → ออกปากคู่ (จบการเดินของตา)
//  L16 แคมป์: ยืนบนแคมป์ → เลือกอาหาร 1 อย่าง (ใช้การตี) บัฟ CAMP_TURNS เทิร์น · คนละ 1 ครั้งทุก CAMP_CD เทิร์น
//      สตูว์ = ตี +1 · ปลาย่าง = ฟื้นเลือด 1 ทุกต้นเทิร์น · ข้าวกล่อง = เดิน +1
//  L17 ตกปลา: ยืนบนจุดตกปลา (ใช้การตี) สุ่ม: ปลา (ฟื้นเลือด 2) · เหรียญ 3 · ปลาทอง (เหรียญ 6) · ปลายักษ์ลากลงน้ำ (ดาเมจ 2)
//  L18 สุสานราชวงศ์ 3 แห่ง: ยืนติด → เปิด (ใช้การตี · แห่งละครั้งต่อแมตช์) ได้อาวุธหลวง ARM_TURNS เทิร์น: ตี +1 แต่ตาที่ตี เสียเลือด 1 (ไม่ถึงตาย)
//  L19 บอร์ดล่าค่าหัว: ยืนติดร้าน → รับค่าหัว (ไม่ใช้การตี · ถือได้ครั้งละ 1): ปีศาจ / สัตว์ยักษ์ / ทหารเหล็ก / ผู้เล่นฝ่ายอื่น 1 คน → ล้มได้ = เหรียญ
const TRAIN_EVERY = 4;
const TRAIN_DMG = 3;
const CAMP_TURNS = 3;
const CAMP_CD = 4;
const ARM_TURNS = 5;
// อาหารทีม (ผู้ใช้เลือกไอเดีย 2026-11-10 "ทำอาหารที่แคมป์จากปลาที่ตกได้ บัฟแรงขึ้น ให้ทั้งทีมกิน") — ใช้ปลาในถุง · ตัวเลข Claude ตั้ง
const FISH_MAX = 3;
const TEAM_MEALS = {
  grill: { icon: "🍢", name: "ปลาย่างทั้งทีม", fish: 1, desc: "ใช้ปลา 1 — ทุกคนในทีมฟื้นเลือด 2 ทันที + ฟื้นเลือด 1 ทุกต้นเทิร์น 3 เทิร์น" },
  feast: { icon: "🥘", name: "งานเลี้ยงทีม", fish: 2, desc: "ใช้ปลา 2 — ทุกคนในทีม ตี +1 · เดิน +1 · ฟื้นเลือด 1 ทุกต้นเทิร์น 3 เทิร์น" },
};
const CAMP_MEALS = {
  atk: { icon: "🍲", name: "สตูว์", desc: "ตี +1 · 3 เทิร์น" },
  mend: { icon: "🐟", name: "ปลาย่าง", desc: "ฟื้นเลือด 1 ทุกต้นเทิร์น · 3 เทิร์น" },
  mov: { icon: "🍙", name: "ข้าวกล่อง", desc: "เดิน +1 · 3 เทิร์น" },
};
const BOUNTY = { daemon: { icon: "👹", name: "ปีศาจ", gold: 4 }, beast: { icon: "🦣", name: "สัตว์ยักษ์", gold: 8 }, magitek: { icon: "🤖", name: "ทหารเหล็ก", gold: 4 }, player: { icon: "🎯", name: "ผู้เล่น", gold: 6 } };
const SECS4 = { train: 2.4, warn: 0.6 };
const sameT = (a, b) => a && b && a.x === b.x && a.y === b.y;
const onRail = (x, y) => y === MAP.RAIL_Y && x >= 0 && x < 32;
const tl = ([x, y]) => ({ x, y });
function p4State(s) {
  if (!s.p4) s.p4 = { trainNext: TRAIN_EVERY, trainDir: 1, trainWarn: false, buffs: {}, campCd: {}, tombs: MAP.TOMBS.map(() => false), arms: {}, armPaid: {}, bounty: {} };
  return s.p4;
}
// ---------- L2 รถไฟ ----------
function trainTurn(ctx, s, turn) {
  const q = p4State(s);
  // รถไฟขนเสบียงจอดอยู่ = รถไฟปกติรอ (กันรถไฟชนขบวนที่จอด — ผู้ใช้แจ้ง 2026-11-10)
  if (s.sky && s.sky.supply && turn >= q.trainNext - 1) { q.trainNext = Math.max(q.trainNext, turn + 3); q.trainWarn = false; return 0; }
  if (turn === q.trainNext - 1 && !q.trainWarn) {
    q.trainWarn = true;
    ctx.bump();
    ctx.fx("train_warn", { dir: q.trainDir, y: MAP.RAIL_Y });
    ctx.log("🚆 รถไฟกำลังมา — ออกจากราง!");
    return SECS4.warn;
  }
  if (turn < q.trainNext) return 0;
  const dir = q.trainDir, hits = [], carried = [];
  // ขึ้นรถไฟ: คนบนชานชาลา → ชานชาลาอีกฝั่ง
  const st = MAP.STATIONS.map(tl);
  for (const p of bodies(ctx)) {
    const i = st.findIndex((t) => sameT(t, p.pos));
    if (i < 0 || sizeOf(ctx, p) > 1 || p.summon) continue;
    const to = st[1 - i];
    const spot = tileFree(ctx, s, to.x, to.y, p.id) ? to : freeNear(ctx, s, to.x, to.y, 3, p.id);
    if (!spot) continue;
    carried.push({ id: p.id, from: { ...p.pos }, to: { ...spot } });
    p.pos = { x: spot.x, y: spot.y };
  }
  // ชนคนบนราง
  for (const p of bodies(ctx)) {
    if (!footOf(ctx, p).some((t) => onRail(t.x, t.y)) || ctx.action.flies(p) || carried.some((c) => c.id === p.id)) continue;
    const from = { ...p.pos };
    const dealt = ctx.damage(p, TRAIN_DMG);
    if (p.alive && p.pos) {
      const side = [MAP.RAIL_Y - 1, MAP.RAIL_Y + 1].map((y) => ({ x: p.pos.x, y })).find((t) => tileFree(ctx, s, t.x, t.y, p.id))
        || freeNear(ctx, s, p.pos.x, p.pos.y, 3, p.id, (x, y) => !onRail(x, y));
      if (side) p.pos = { x: side.x, y: side.y };
    }
    hits.push({ id: p.id, from, to: p.pos ? { ...p.pos } : null, dmg: dealt });
    ctx.log(`🚆 รถไฟชน ${p.name} -${dealt}`);
  }
  for (const c of s.cars) if (!c.driver && onRail(c.x, c.y)) {
    const spot = freeNear(ctx, s, c.x, c.y, 3, null, (x, y) => !onRail(x, y) && carGround(ctx, s, x, y));
    if (spot) { c.x = spot.x; c.y = spot.y; }
  }
  for (const c of s.chocos) if (c.x != null && !c.rider && onRail(c.x, c.y)) sendHome(ctx, s, c, { x: c.x, y: c.y });
  q.trainNext += TRAIN_EVERY;
  q.trainDir = -dir;
  q.trainWarn = false;
  ctx.bump();
  ctx.fx("train_pass", { dir, y: MAP.RAIL_Y, hits, carried });
  if (carried.length) ctx.log(`🚆 รถไฟพา ${carried.map((c) => ctx.match.players[c.id].name).join(", ")} ข้ามแผนที่`);
  return SECS4.train;
}
// ---------- L3 กอนโดลา / L4 อุโมงค์ ----------
function travelTiles(ctx, s, p, list) {
  const here = list.findIndex((t) => sameT(t, p.pos));
  if (here < 0) return null;
  return list.filter((_, i) => i !== here).map((t) => (tileFree(ctx, s, t.x, t.y, p.id) ? t : freeNear(ctx, s, t.x, t.y, 2, p.id))).filter(Boolean);
}
const tunnelOf = (p) => { for (const pair of MAP.TUNNELS) { const i = pair.findIndex(([x, y]) => x === p.pos.x && y === p.pos.y); if (i >= 0) return [tl(pair[i]), tl(pair[1 - i])]; } return null; };
function canTravel(ctx, s, p) { return canMove(ctx, p) && sizeOf(ctx, p) === 1 && !driving(s, p); }
function travel(ctx, s, p, tile, kind) {
  if (!canTravel(ctx, s, p)) return false;
  let opts;
  if (kind === "gondola") opts = travelTiles(ctx, s, p, MAP.DOCKS.map(tl)) || [];
  else { const t = tunnelOf(p); opts = t ? [tileFree(ctx, s, t[1].x, t[1].y, p.id) ? t[1] : freeNear(ctx, s, t[1].x, t[1].y, 2, p.id)].filter(Boolean) : []; }
  // อุโมงค์มีปลายทางเดียว = กดปุ่มแล้วไปเลย (ผู้ใช้แจ้ง 2026-11-10 "อุโมงค์ใช้ไม่ได้" — เดิมต้องคลิกปากอีกฝั่งที่อยู่นอกจอ)
  const to = tile ? opts.find((t) => sameT(t, tile)) : opts.length === 1 ? opts[0] : null;
  if (!to) return false;
  const from = { ...p.pos };
  p.pos = { x: to.x, y: to.y };
  ctx.action.lockMove(p);
  ctx.bump();
  ctx.fx(kind, { id: p.id, from, to: { ...to } });
  ctx.log(kind === "gondola" ? `🛶 ${p.name} นั่งกอนโดลา` : `🕳️ ${p.name} ลอดอุโมงค์`);
  return true;
}
// ---------- รถราง (ผู้ใช้สั่ง 2026-11-11 "เชื่อมสถานีแต่ละเมือง ไปถึงกันได้"): ยืนบนป้าย → เลือกป้ายปลายทาง (จบการเดินของตา) ----------
const TRAM_STOPS = (MAP.TRAMS || []).map((t) => ({ zone: t.zone, x: t.at[0], y: t.at[1] }));
const tramHere = (p) => (p && p.pos ? TRAM_STOPS.find((t) => sameT(t, p.pos)) || null : null);
const tramDest = (ctx, s, p, t) => (tileFree(ctx, s, t.x, t.y, p.id) ? { x: t.x, y: t.y } : freeNear(ctx, s, t.x, t.y, 2, p.id));
// โควตา (ผู้ใช้สั่ง 2026-11-11): คนละ 2 เที่ยว แล้วพัก 2 เทิร์น จึงได้อีก 2 เที่ยว
const TRAM = { uses: 2, cd: 2 };
const tramQ = (s, p) => { const q = p4State(s); q.tram ||= {}; return q.tram[p.id] || (q.tram[p.id] = { left: TRAM.uses, readyAt: 0 }); };
const tramCd = (ctx, s, p) => Math.max(0, tramQ(s, p).readyAt - ctx.match.roundNumber);
function tramLeft(ctx, s, p) { const t = tramQ(s, p); if (t.left <= 0 && tramCd(ctx, s, p) === 0) t.left = TRAM.uses; return t.left; }
function rideTram(ctx, s, p, zone) {
  const a = tramHere(p), b = TRAM_STOPS.find((t) => t.zone === zone);
  if (!a || !b || a === b || !canTravel(ctx, s, p) || tramLeft(ctx, s, p) <= 0) return false;
  const to = tramDest(ctx, s, p, b);
  if (!to) return false;
  const from = { ...p.pos };
  p.pos = { x: to.x, y: to.y };
  ctx.action.lockMove(p);
  ctx.bump();
  const tq = tramQ(s, p);
  tq.left -= 1;
  if (tq.left <= 0) tq.readyAt = ctx.match.roundNumber + TRAM.cd;
  ctx.fx("tram", { id: p.id, from, to: { ...to }, a: a.zone, b: b.zone });
  ctx.log(`🚋 ${p.name} นั่งรถรางไป ${ZONE_NAMES[b.zone] || b.zone}`);
  return true;
}
// ---------- L16 แคมป์ ----------
const onSpot = (p, list) => list.some(([x, y]) => p.pos && x === p.pos.x && y === p.pos.y);
function buffOf(s, p) {
  const q = p4State(s), b = p && q.buffs[p.id];
  return b && b.until >= (b.from || 0) ? b : null;
}
const fishOf = (s, p) => (p4State(s).catch || {})[p.id] || 0;
function teamMeal(ctx, s, p, kind) {
  const q = p4State(s), m = TEAM_MEALS[kind];
  if (!m || !onSpot(p, MAP.CAMPS) || !canStrike(ctx, p) || fishOf(s, p) < m.fish) return false;
  const r = ctx.match.roundNumber;
  q.catch[p.id] -= m.fish;
  const team = heroes(ctx).filter((u) => u.alive && !u.summon && (u.id === p.id || !ctx.combat.sameTeam || ctx.combat.sameTeam(u, p)));
  for (const u of team) {
    q.buffs[u.id] = { kind: kind === "grill" ? "mend" : "feast", from: r, until: r + CAMP_TURNS - 1 };
    if (kind === "grill" && ctx.combat.healHp) ctx.combat.healHp(u, 2);
    ctx.fx("camp_meal", { id: u.id, meal: kind, x: p.pos.x, y: p.pos.y, quiet: u.id !== p.id });
  }
  ctx.bump();
  ctx.log(`🏕️ ${p.name} ทำ${m.name} — ทั้งทีม ${team.length} คนได้กิน`);
  ctx.useStrike(p, 1.4);
  return true;
}
// พักแคมป์ (ผู้ใช้สั่ง 2026-11-12 "ทำทั้งหมด" · ตัวเลข Claude ตั้ง): ต้นเทิร์นกลางคืน ผู้เล่นที่อยู่ในวงไฟแคมป์ (ปีศาจเข้าไม่ได้) ฟื้นเลือด CAMP_REST
const CAMP_REST = 1;
function campRest(ctx, s) {
  if (!s.night || !ctx.combat.healHp) return 0;
  const list = [];
  for (const p of heroes(ctx)) {
    if (!p.alive || !p.pos || !XT.lightSafe(H(), p.pos.x, p.pos.y)) continue;
    if (!(ctx.combat.healHp(p, CAMP_REST) > 0)) continue;
    list.push({ id: p.id, x: p.pos.x, y: p.pos.y });
  }
  if (list.length) { ctx.fx("camp_rest", { list }); ctx.bump(); }
  return list.length;
}
function campMeal(ctx, s, p, kind) {
  if (TEAM_MEALS[kind]) return teamMeal(ctx, s, p, kind);
  const q = p4State(s);
  if (!CAMP_MEALS[kind] || !onSpot(p, MAP.CAMPS) || !canStrike(ctx, p) || (q.campCd[p.id] || 0) > ctx.match.roundNumber) return false;
  const r = ctx.match.roundNumber;
  q.buffs[p.id] = { kind, from: r, until: r + CAMP_TURNS - 1 };
  q.campCd[p.id] = r + CAMP_CD;
  ctx.bump();
  ctx.fx("camp_meal", { id: p.id, meal: kind, x: p.pos.x, y: p.pos.y }); // ไม่ใช้ชื่อ kind (ctx.fx ใช้ kind เป็นชื่อเหตุการณ์)
  ctx.log(`🏕️ ${p.name} ตั้งแคมป์ — ${CAMP_MEALS[kind].name}`);
  ctx.useStrike(p, 1.2);
  return true;
}
// ---------- L17 ตกปลา ----------
function fish(ctx, s, p) {
  if (!onSpot(p, MAP.FISH) || !canStrike(ctx, p)) return false;
  const luck = XT.fishLuck(s), r = luck ? Math.random() * 0.75 : Math.random(); // พลังเสา Cleigne: ไม่เจอปลายักษ์ · เหรียญ ×2
  let result, amount = 0;
  if (r < 0.35) { // ได้ปลาเข้าถุง (ถือได้ FISH_MAX — เต็มแล้วกินเลย ฟื้นเลือด 2) · เอาไปทำอาหารทีมที่แคมป์
    const q = p4State(s); q.catch ||= {};
    result = "fish";
    if ((q.catch[p.id] || 0) < FISH_MAX) { q.catch[p.id] = (q.catch[p.id] || 0) + 1; amount = 0; }
    else amount = ctx.combat.healHp ? ctx.combat.healHp(p, 2) : 0;
  }
  else if (r < 0.6) { result = "coins"; amount = lazyShop().addGold(p, luck ? 6 : 3); }
  else if (r < 0.75) { result = "gold"; amount = lazyShop().addGold(p, luck ? 12 : 6); }
  else { result = "giant"; amount = ctx.damage(p, 2); }
  ctx.bump();
  ctx.fx("fish", { id: p.id, x: p.pos.x, y: p.pos.y, result, amount });
  ctx.log(result === "fish" ? (amount ? `🎣 ${p.name} ตกได้ปลา (ถุงเต็ม — กินเลย ฟื้นเลือด)` : `🎣 ${p.name} ตกได้ปลา (มี ${fishOf(s, p)})`) : result === "giant" ? `🎣 ${p.name} โดนปลายักษ์ลากลงน้ำ -${amount}` : `🎣 ${p.name} ตกได้${result === "gold" ? "ปลาทอง" : "เหรียญ"} ${amount}`);
  ctx.useStrike(p, 1.6);
  return true;
}
// ---------- L18 สุสานราชวงศ์ ----------
function tombNear(ctx, s, p) {
  const q = p4State(s);
  return MAP.TOMBS.findIndex(([x, y], i) => !q.tombs[i] && ctx.adjacent(p, x, y));
}
function hasArm(s, p) { const q = p4State(s), a = p && q.arms[p.id]; return !!a; }
const ARMIGER = { atk: 2, turns: 3, heal: 3 };
const armigerOn = (ctx, s) => (p4State(s).armiger ?? -1) >= ctx.match.roundNumber;
const armRec = (s, p) => (p ? p4State(s).arms[p.id] || null : null);
function openTomb(ctx, s, p) {
  const q = p4State(s), i = tombNear(ctx, s, p);
  if (i < 0 || !canStrike(ctx, p)) return false; // ถืออยู่แล้ว = เปลี่ยนเป็นอันใหม่
  const a = AR.armAt(i);
  q.tombs[i] = true;
  q.arms[p.id] = { until: ctx.match.roundNumber + ARM_TURNS - 1, w: a.id };
  ctx.bump();
  ctx.fx("tomb_open", { id: p.id, x: MAP.TOMBS[i][0], y: MAP.TOMBS[i][1], w: a.id });
  ctx.log(`⚱️ ${p.name} ได้อาวุธจักรพรรดิ ${a.name} — ${a.desc}`);
  // เปิดครบ 13 สุสาน = Armiger (ผู้ใช้สั่ง 2026-11-12 · Claude ตั้ง): ทั้งทีมตี +2 3 เทิร์น + ฟื้นเลือด 3
  if (!q.armiger && q.tombs.every(Boolean)) {
    q.armiger = ctx.match.roundNumber + ARMIGER.turns - 1;
    for (const o of heroes(ctx)) if (o.alive && ctx.combat.healHp) ctx.combat.healHp(o, ARMIGER.heal);
    ctx.fx("armiger", { by: p.id, ids: heroes(ctx).map((o) => o.id) });
    ctx.log(`👑 อาวุธจักรพรรดิครบ 13 อัน — Armiger! ทั้งทีมตี +${ARMIGER.atk} ${ARMIGER.turns} เทิร์น`);
  }
  ctx.useStrike(p, 1.6);
  return true;
}
// ตาที่ตีด้วยอาวุธหลวง → เสียเลือด 1 (ไม่ถึงตาย) · เรียกตอนจบตา
function armDrain(ctx, s, p) {
  const q = p4State(s);
  if (!p || !p.alive || !hasArm(s, p) || !p.didAttackRound || !AR.drains(armRec(s, p))) return; // Sword of the Father ไม่ดูดเลือด
  const key = `${p.id}|${ctx.match.roundNumber}`;
  if (q.armPaid[key]) return;
  q.armPaid[key] = true;
  if ((p.hp || 0) > 1) { p.hp -= 1; ctx.fx("royal_drain", { id: p.id, x: p.pos ? p.pos.x : 0, y: p.pos ? p.pos.y : 0 }); }
}
// ---------- L19 ค่าหัว ----------
function shopNear(ctx, p) {
  if (!p || !p.pos) return false;
  const keys = lazyShop().shopTiles();
  for (const k of keys) { const [x, y] = k.split(",").map(Number); if (ctx.adjacent(p, x, y)) return true; }
  return false;
}
function takeBounty(ctx, s, p) {
  const q = p4State(s);
  if (!shopNear(ctx, p) || q.bounty[p.id] || !ctx.action.canAct(p)) return false;
  const side = sideOf(p);
  const foes = Object.values(ctx.match.players).filter((u) => u.alive && !u.summon && !u.duoOf && sideOf(u) !== side);
  const kinds = ["daemon"];
  if (mobsOf(ctx, "beast").length) kinds.push("beast");
  if (mobsOf(ctx, "magitek").length) kinds.push("magitek");
  if (foes.length) kinds.push("player", "player");
  const kind = ctx.pick(kinds, 1)[0];
  const target = kind === "player" ? ctx.pick(foes, 1)[0] : null;
  q.bounty[p.id] = { kind, target: target ? target.id : null, name: target ? target.name : BOUNTY[kind].name, gold: BOUNTY[kind].gold };
  ctx.bump();
  ctx.fx("hunt_board", { id: p.id, bounty: kind, target: target ? target.id : null });
  ctx.log(`📜 ${p.name} รับค่าหัว: ${q.bounty[p.id].name}`);
  return true;
}
function huntDone(ctx, s, by, kind, victimId = null) {
  if (!by || !s) return;
  const q = p4State(s), b = q.bounty[by.id];
  if (!b || b.kind !== kind || (kind === "player" && b.target !== victimId)) return;
  delete q.bounty[by.id];
  const got = lazyShop().addGold(by, b.gold);
  ctx.fx("hunt_done", { id: by.id, bounty: kind, gold: got });
  ctx.log(`📜 ${by.name} ปิดค่าหัว ${b.name} ได้ ${got} เหรียญ`);
}
function onKill(ctx, st, victim, killerId) {
  const s = st && st.eos;
  if (!s || !victim || victim.summon) return;
  E.noteDeathAt(s, victim); // ดวงวิญญาณที่ช่องที่ล้ม (ช่วยเพื่อนฟื้นเร็ว)
  const by = killerId && ctx.match.players[killerId];
  if (by && by.id !== victim.id) huntDone(ctx, s, by, "player", victim.id);
}
// ---------- ต้นเทิร์น: หมดอายุบัฟ/อาวุธ · ปลาย่างฟื้นเลือด ----------
function p4PreRound(ctx, s, turn) {
  const q = p4State(s), r = turn;
  for (const [pid, b] of Object.entries(q.buffs)) {
    if (b.until < r) { delete q.buffs[pid]; continue; }
    const p = ctx.match.players[pid];
    if ((b.kind === "mend" || b.kind === "feast") && p && p.alive && ctx.combat.healHp) ctx.combat.healHp(p, 1);
  }
  for (const [pid, a] of Object.entries(q.arms)) if (a.until < r) delete q.arms[pid];
  for (const k of Object.keys(q.armPaid)) if (Number(k.split("|")[1]) < r - 1) delete q.armPaid[k];
  return trainTurn(ctx, s, turn);
}
function p4AtkBonus(s, p) {
  const b = buffOf(s, p);
  return (b && (b.kind === "atk" || b.kind === "feast") ? 1 : 0) + AR.atkOf(armRec(s, p)) + ((p4State(s).armiger ?? -1) >= (s.roundNow || 0) ? ARMIGER.atk : 0); // อาวุธจักรพรรดิ: ตีเพิ่มตามอาวุธ · Armiger
}
function p4MovBonus(s, p) { const b = buffOf(s, p); return b && (b.kind === "mov" || b.kind === "feast") ? 1 : 0; }
function p4Hud(ctx, s, p, out) {
  const q = p4State(s);
  if (tunnelOf(p)) {
    const t = tunnelOf(p), dest = canTravel(ctx, s, p) ? [tileFree(ctx, s, t[1].x, t[1].y, p.id) ? t[1] : freeNear(ctx, s, t[1].x, t[1].y, 2, p.id)].filter(Boolean) : [];
    out.push({ key: "fd:tunnel", icon: "🕳️", name: "อุโมงค์", disabled: !dest.length }); // ไม่มี tiles = กดแล้วไปปากอีกฝั่งทันที
  }
  if (onSpot(p, MAP.DOCKS)) {
    const dest = canTravel(ctx, s, p) ? travelTiles(ctx, s, p, MAP.DOCKS.map(tl)) || [] : [];
    out.push({ key: "fd:gondola", icon: "🛶", name: "กอนโดลา", disabled: !dest.length, tiles: dest });
  }
  const tr = tramHere(p);
  if (tr) {
    const left = tramLeft(ctx, s, p), cd = left > 0 ? 0 : tramCd(ctx, s, p);
    for (const t of TRAM_STOPS) {
      if (t === tr) continue;
      out.push({ key: `fd:tram:${t.zone}`, icon: "🚋", name: ZONE_NAMES[t.zone] || t.zone, count: left, cd, disabled: !canTravel(ctx, s, p) || !tramDest(ctx, s, p, t) || left <= 0 });
    }
  }
  if (onSpot(p, MAP.CAMPS)) {
    const off = !canStrike(ctx, p) || (q.campCd[p.id] || 0) > ctx.match.roundNumber;
    for (const [k, m] of Object.entries(CAMP_MEALS)) out.push({ key: `fd:camp:${k}`, icon: m.icon, name: m.name, desc: m.desc, disabled: off });
    const has = fishOf(s, p);
    for (const [k, m] of Object.entries(TEAM_MEALS)) if (has > 0) out.push({ key: `fd:camp:${k}`, icon: m.icon, name: m.name, desc: m.desc, count: m.fish, disabled: !canStrike(ctx, p) || has < m.fish });
  }
  if (onSpot(p, MAP.FISH)) out.push({ key: "fd:fish", icon: "🎣", name: "ตกปลา", disabled: !canStrike(ctx, p) });
  { const ti = tombNear(ctx, s, p); if (ti >= 0) { const a = AR.armAt(ti); out.push({ key: "fd:tomb", icon: "⚔️", name: a.name, desc: `อาวุธจักรพรรดิ ${ARM_TURNS} เทิร์น: ${a.desc}${a.noDrain ? "" : " · ตาที่ตีเสียเลือด 1"}${hasArm(s, p) ? " · เปลี่ยนจากอาวุธที่ถือ" : ""}`, disabled: !canStrike(ctx, p) }); } }
  if (shopNear(ctx, p) && !q.bounty[p.id]) out.push({ key: "fd:bounty", icon: "📜", name: "ค่าหัว", disabled: !ctx.action.canAct(p) });
}
function p4Action(ctx, s, p, key, tile) {
  if (key === "fd:tunnel") return travel(ctx, s, p, tile, "tunnel");
  if (key === "fd:gondola") return travel(ctx, s, p, tile, "gondola");
  if (typeof key === "string" && key.startsWith("fd:tram:")) return rideTram(ctx, s, p, key.slice(8));
  if (key === "fd:fish") return fish(ctx, s, p);
  if (key === "fd:tomb") return openTomb(ctx, s, p);
  if (key === "fd:bounty") return takeBounty(ctx, s, p);
  if (typeof key === "string" && key.startsWith("fd:camp:")) return campMeal(ctx, s, p, key.slice(8));
  return null;
}
function p4Public(ctx, s) {
  const q = p4State(s);
  return {
    rail: { y: MAP.RAIL_Y, stations: MAP.STATIONS.map(tl), next: q.trainNext, warn: !!q.trainWarn, dir: q.trainDir },
    tunnels: MAP.TUNNELS.map((pair) => pair.map(tl)), docks: MAP.DOCKS.map(tl), camps: MAP.CAMPS.map(tl), fish: MAP.FISH.map(tl),
    tombs: MAP.TOMBS.map(([x, y], i) => { const a = AR.armAt(i); return { x, y, open: !!q.tombs[i], w: a.id, name: a.name, desc: a.desc, img: AR.imgOf(a.id) }; }),
    armiger: (q.armiger ?? -1) >= ctx.match.roundNumber ? q.armiger : null,
    arms: Object.fromEntries(Object.entries(q.arms).map(([pid, r]) => { const a = AR.defOf(r); return [pid, { w: a.id, name: a.name, img: AR.imgOf(a.id), until: r.until }]; })),
    trams: TRAM_STOPS.map((t) => ({ ...t })),
  };
}
function p4Badges(s, p, badges) {
  const q = p4State(s), b = buffOf(s, p);
  const bm = b && (CAMP_MEALS[b.kind] || (b.kind === "feast" ? TEAM_MEALS.feast : null));
  if (bm) badges.push({ key: `meal_${b.kind}`, icon: bm.icon, label: bm.name, cls: "bg-orange-200 text-gray-900" });
  const fc = (q.catch || {})[p.id] || 0;
  if (fc) badges.push({ key: "fish_bag", icon: "🐟", label: `ปลา ×${fc}`, cls: "bg-sky-200 text-gray-900" });
  if ((q.armiger ?? -1) >= (s.roundNow || 0)) badges.push({ key: "armiger", icon: "👑", label: "Armiger", cls: "bg-sky-300 text-gray-900" });
  if (hasArm(s, p)) badges.push({ key: "royal_arm", icon: "⚔️", label: AR.defOf(armRec(s, p)).name, cls: "bg-indigo-300 text-gray-900" });
  const h = q.bounty[p.id];
  if (h) badges.push({ key: "bounty", icon: BOUNTY[h.kind].icon, label: h.name, cls: "bg-amber-300 text-gray-900" });
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
  if (actMonsters(ctx, s)) secs = Math.max(secs, SECS.mobs);
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
  if (sw && lightFixable(ctx, s, p)) out.push({ key: "fd:lightfix", icon: "🔦", name: lit(s, sw.zone) ? "ซ่อมไฟ" : "เปิดไฟ", disabled: !canStrike(ctx, p), desc: `ซ่อมไฟเมือง +${TOWN_LIGHT.fix} (เต็ม ${lightMax(s)}) · ไฟดับ = เปิดคืน ปีศาจเข้าเมืองไม่ได้อีก — ใช้การโจมตี` });
  const wf = wallFixTarget(ctx, s, p);
  if (wf) out.push({ key: "fd:wallfix", icon: wf.kind === "turret" ? "🔫" : "🧱", name: wf.broken && wf.kind === "turret" ? "สร้างป้อม" : FIX_NAMES[wf.kind], disabled: !canStrike(ctx, p),
    desc: wf.kind === "barricade" ? `ซ่อมกำแพงไม้ +${CITY_WALL.fix} (เต็ม ${PKS.wallMax(s)}) — ใช้การโจมตี` : `${wf.kind === "turret" ? "ซ่อมป้อมปืน" : "ซ่อมกำแพง Insomnia"} +${CITY_WALL.fix} (พังแล้วสร้างใหม่ได้ถ้าไม่มีใครยืน) — ใช้การโจมตี` });
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
  "fd:leave": "ลงจากรถ (ไม่เสียการเดิน) — รถจอดไว้ที่เดิม ผู้โดยสารลงหมด",
  "fd:mount": `กระโดดขึ้นหลังโชโกโบะ — ยังไม่ได้เดิน = เดินต่อจากนกได้เต็มระยะ +${CHOCO_MOV}\nผ่านป่า/น้ำตื้นกิน 1 ก้าว · โดนดาเมจ นกรับแทนก่อน (นกเลือดหมด = ตกนก นกกลับคอก)`,
  "fd:fix": `ซ่อมรถ +${CAR_FIX} / ป้อนผักให้โชโกโบะ +${CHOCO_FEED} — คันหรือตัวที่ติดตัวหรือที่ขับ/ขี่อยู่ เลือดน้อยสุดก่อน · รถพังซ่อมแล้วขับได้อีก (ใช้การโจมตี)`,
  "fd:dismount": "ลงจากโชโกโบะ วางนกไว้ช่องข้างตัว (ไม่เสียการเดิน)",
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
  if (sandOn(ctx)) {
    // พายุทราย: เป้าในทะเลทราย หรือคนดูทั้งฝ่ายอยู่ในทะเลทรายหมด → ต้องมีตัวฝ่ายคนดูห่างไม่เกิน SAND_SIGHT
    const eyes = bodies(ctx).filter((u) => sideOf(u) === sideOf(me));
    const tIn = foot.some((t) => inDesert(t.x, t.y));
    const allIn = eyes.length > 0 && eyes.every((u) => footOf(ctx, u).some((t) => inDesert(t.x, t.y)));
    if (tIn || allIn) {
      const near = eyes.some((u) => footOf(ctx, u).some((a) => foot.some((b) => manhattan(a, b) <= SAND_SIGHT)));
      if (!near) return true;
    }
  }
  const fog = sideVision(ctx, st, viewer);
  return !!fog && !foot.some((t) => fog.has(K(t.x, t.y)));
  // PVE: ไม่มีระยะมองเห็นผู้เล่นอื่นแล้ว (ทุกคนพวกเดียวกัน) — มอนเตอร์ถูกซ่อนเฉพาะในหมอก/พายุทราย
}

// ============================================================ helper ให้ eosEvents.js (กัน require วน)
let H_CACHE = null;
function H() {
  if (H_CACHE) return H_CACHE;
  H_CACHE = { carOf, CAR_HP, stepToward, faceTo, mobType, lightSafe: (x, y) => XT.lightSafe(H(), x, y), unitsOn, dimLights, turretZone, mobRoom, bigFree, bigStart, turretUp, p4State, spawnMob, traitStats, mobsOf, heroes, bodies, isMob, tileFree, freeNear, hurt, loot, flasksOf, blockedTown, townOf, inRect, manhattan, area3, addScore, sideColor, ZONE_NAMES, MAP, ROAD, canStrike, canMove, daemonStats, footOf, carGround, onRail, TURRETS };
  return H_CACHE;
}
// เกราะเสา (ไอเทมร้าน Eos — server/shop.js) · ใช้ไม่ได้ = ไม่เสียของ
function wardOnSale() { return gysahlOnSale(); }
function useWard(p) {
  if (!p || !p.alive || !p.pos || !gysahlOnSale()) return false;
  const F = require("../fodlan");
  const ctx = F.makeCtx(), s = F.stageState().eos, ok = E.useWard(ctx, s, p);
  if (ok) XT.stat(s, p.id, "guard");
  return ok;
}
// กำแพงไม้ (ไอเทมร้าน Eos — server/shop.js) → เพิ่มจำนวนที่วางได้ (ปุ่ม "กำแพง" บน HUD) · เต็มแล้ว = ไม่เสียของ
function useBarricade(p) {
  if (!p || !p.alive || !gysahlOnSale()) return false;
  const F = require("../fodlan");
  const ctx = F.makeCtx(), s = F.stageState().eos, ok = PKS.addCharge(s, p);
  if (ok) { ctx.bump(); ctx.log(`🧱 ${p.name} เตรียมกำแพงไม้ (กด "กำแพง" เพื่อวาง)`); }
  return ok;
}
function onCivDeath(c) {
  const F = require("../fodlan");
  if (!F.active() || !F.isEos() || !F.stageState() || !F.stageState().eos) return;
  XT.onCivDeath(F.makeCtx(), F.stageState().eos, c);
}
function onConvoyDeath(c) {
  const F = require("../fodlan");
  if (!F.active() || !F.isEos() || !F.stageState() || !F.stageState().eos) return;
  E.onConvoyDeath(F.makeCtx(), F.stageState().eos, c);
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
    daemons: mobsOf(ctx, "daemon").map((d) => ({ id: d.id, x: d.pos.x, y: d.pos.y, hp: d.hp, maxHp: d.summon.maxHp, armor: d.armor, maxArmor: d.summon.maxArmor, kind: d.summon.look, tier: d.summon.tier || 1, trait: d.summon.trait || null, face: d.summon.face || null, cd: d.summon.cdUntil > ctx.match.roundNumber ? 1 : 0, elite: ELT.publicOf(d) })),
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
    revive: Object.entries(s.dead).map(([id, r]) => ({ id, at: r + reviveTurns(s) })),
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
    mobs: mobsOf(ctx).filter((m) => mobType(m) !== "daemon").map((m) => ({ id: m.id, type: mobType(m), x: m.pos.x, y: m.pos.y, hp: m.hp, maxHp: m.summon.maxHp, armor: m.armor, maxArmor: m.summon.maxArmor, aggro: m.summon.aggro || null, tier: m.summon.tier || 1, trait: m.summon.trait || null, face: m.summon.face || null, elite: ELT.publicOf(m) })),
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
  for (const el of flasksOf(s, p)) badges.push({ key: `flask_${el}_${badges.length}`, icon: el === "fire" ? "🔥" : el === "ice" ? "❄️" : "⚡", label: `ขวด${ELEMENT_NAMES[el]}`, cls: "bg-indigo-200 text-gray-900" });
  if (!badges.length) return undefined;
  return { choco: riding(s, p), car: driving(s, p), badges };
}

module.exports = {
  FLASH, campRest, MOB_CAP, mobRoom, bigBusy, bigFree, H, SKY, magnetOn, DOME_HP, gateShut, turretUp, CITY_WALL, hitWall, fixWall, isCityWall, DOME_COOLDOWN,
  absorbDamage, CAR_HP, CHOCO_HP, CAR_FIX, CHOCO_FEED, MECH, TEAM_MEALS, FISH_MAX,
  incoming(ctx, st, p, n, src) { const s = st && st.eos; if (!s || !p) return n; if (isMob(p)) return ELT.toMob(ctx, s, H(), p, MBS.incoming(ctx, s, p, n, src), src); if (!(src && isMob(src))) return n; const out = AR.guard(armRec(s, p), ELT.toHero(ctx, s, H(), p, n, src)); sumHit(s, p, src, out); return out; }, // ทหารโล่ · Shield of the Just
  rangeMod(ctx, st, p, r) { const s = st && st.eos, add = s && p && !p.summon ? AR.rangeOf(armRec(s, p)) : 0; return add && Array.isArray(r) ? [r[0], r[1] + add] : r; }, // Bow of the Clever
  critPct(ctx, st, p) { const s = st && st.eos; return s && p && !p.summon ? AR.critOf(armRec(s, p)) : 0; }, // Swords of the Wanderer
  strikePierces(ctx, st, p) { const s = st && st.eos; return !!(s && p && !p.summon && AR.piercesOf(armRec(s, p))); }, // Katana of the Warrior
  onStrikeLanded(ctx, st, p, target) { const s = st && st.eos, r = s && p && !p.summon ? armRec(s, p) : null; return r ? AR.landed(ctx, s, H(), p, r, target) : null; },
  preventDeath(ctx, st, p) { return !!(st && st.eos) && PKS.gutsSave(ctx, st.eos, p); }, // การ์ดใจสู้
  enter, weatherStart, layer, keepsTile, CHASM_TURNS, layerVer, movMod, flatWalk, carWalk, carSeats, carDriver, noSkill, atkBonus, onKill, preRound, onUnitEnd, onEndTurn,
  hudActions, charAction, objects, strikeObject, vision, hides, publicInfo, playerInfo, winner, shields,
  gysahlOnSale, useGysahl, wardOnSale, useWard, useBarricade, onConvoyDeath, onCivDeath, H, pillarHp, reviveTurns,
  // ผลค้างทั้งแมตช์ (fodlan.persistAll): การ์ดทนทาน = เลือดสูงสุด +2
  persist: { maxHpBonus(ctx, st, p) { return st && st.eos && p && !p.summon ? PKS.hpBonus(st.eos) : 0; } }, addScore, bomberBlast, healerAct, TRAIT, pickTrait, nightTarget, explodeBarrel, throwFlask, fireTurret, actMonsters, spawnBeast, dropshipTurn, respawnProps, hurt, TURRETS, outcome, onMobDeath, isMob, mobsOf, spawnMob, spawnChests, openChest, mountNear, hitPillar,
  PILLAR_HP, PVE, MOB_SIDE, daemonStats, magitekStats, daemonCount, CHEST_EVERY, CHEST_MAX, DAY_DROP_PCT,
  BARREL_DMG, BARREL_BURN, FLASK_RANGE, FLASK_MAX, THUNDER_DMG, SHOCK_DMG, TURRET_DMG, TURRET_RANGE, BEAST, MAGITEK, BRIDGES, LEVER, DOME_CORE, DOME_GATES, DOME_TURNS, GYSAHL_RANGE, blockedTown,
  // เทสต์
  sandOn, inDesert, SAND_SIGHT, MOB_CONTROL, tickMobControl, LM, dimLights, eosPriceMul, TRAM, MUSTER, musterTick, TOWN_LIGHT, siegeLight, fixLights, restoreLights, lit, raidPlan, openPillars, RAID, BOSS_AI, turretZone, TRAM_STOPS, rideTram, lightBound, wallFixTarget,
  prey, sideOf, scoreRound, reviveDue, noteDeaths, sideSight, seizeState, heldCount, rateOf, checkChannels, SCORE_GOAL, SCORE_TABLE, REVIVE_TURNS, SIGHT_EXTRA,
  carCells, carOf, canRide, driving, boardCar, leaveCar, ram, ramTargets, syncCars, CAR_OFF, CAR_SEATS, CAR_MOV, checkRiders, spawnDaemons, dissolveDaemons, inTown, zoneAt, ROAD,
  trainTurn, p4State, huntDone, TRAIN_EVERY, TRAIN_DMG, CAMP_TURNS, CAMP_CD, ARM_TURNS, BOUNTY,
  MOV_BONUS, WALK_MAX, CHOCO_MOV, CHOCO_RESPAWN, CAR_HIT_DMG, DAEMON_COUNT, DAEMON_HP, DAEMON_ARMOR, DAEMON_ATK, DAEMON_MOV, DAEMON_GOLD,
  LIGHTNING_COUNT, LIGHTNING_DMG,
};
