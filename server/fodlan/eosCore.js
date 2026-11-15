// ============================================================
//  สนาม Eos — ค่าคงที่ + helper พื้นฐาน (กระดาน · โซน · มอน/ผู้เล่น · สภาพอากาศ · ช่องว่าง) — ไม่ require ไฟล์ eos* ที่แยกจาก stage6
//  แยกออกจาก server/fodlan/stage6.js (ย้ายโค้ดล้วน · พฤติกรรมเดิม) · ฮุคทั้งหมดยังส่งออกผ่าน stage6.js
// ============================================================
const MAP = require("./map6");

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
const MOB_WALK_MS = 1000; // (เดิม) ช่วงมอนเดินพร้อมกัน — ตอนนี้ใช้ MOB_SEQ (ทีละตัว) แทน
// ตามอนทีละตัวแบบ Road Trip (ผู้ใช้ 2026-11-14 "ทำให้มอนขยับแบบเดียวกัน กล้องคงไว้ตามเดิม"):
//  ตามลำดับที่ server คิด แต่ละตัว = เดินทีละช่อง (step ms/ช่อง) แล้วพุ่งตี (hit ms) — ตัวถัดไปรอ · รวมยาวเกิน max = เร่งทั้งชุด (ช้าสุด ×minK)
const MOB_SEQ = { step: 130, hit: 560, gap: 60, max: 7000, minK: 0.3 };
const SECS = { dropship: 1.8, mobs: 1.4, revive: 1.2, lightning: 1.8, daemonSpawn: 1.6, daemonAct: 1.4, dawn: 1.4 };

const K = (x, y) => `${x},${y}`;
const ROAD = new Set((MAP.map.special.fd_eos_road || []).map(([x, y]) => K(x, y)));
const TOWNS = MAP.ZONES.filter((z) => z.town);
const inRect = (r, x, y) => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3];
const inTown = (x, y) => TOWNS.some((z) => inRect(z.rect, x, y));
const zoneAt = (x, y) => (MAP.ZONES.find((z) => inRect(z.rect, x, y)) || { id: "wild" }).id;
const lazyShop = () => require("../shop");

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
const listOf = (obj, kind) => ((obj && obj[kind]) || []).map(([x, y]) => ({ x, y }));
function townOf(x, y) { const z = TOWNS.find((t) => inRect(t.rect, x, y)); return z ? z.id : null; }

// ============================================================ ปุ่ม HUD
function canMove(ctx, p) {
  const a = ctx.match.action;
  return ctx.action.canAct(p) && !!a && !a.locked;
}
function canStrike(ctx, p) {
  const a = ctx.match.action;
  return ctx.action.canAct(p) && !!a && !a.noStrike && !p.didAttackRound;
}

// Object.assign (ไม่แทน module.exports) — ไฟล์ eos* อ้างกันเองแบบวนได้
Object.assign(module.exports, {
  MOV_BONUS, WALK_MAX, CHOCO_MOV, CHOCO_RESPAWN, CAR_HP, CHOCO_HP, CAR_FIX, CHOCO_FEED, FIX_SECS, CAR_HIT_DMG, DAEMON_COUNT, DAEMON_REFILL,
  DAEMON_HP, DAEMON_ARMOR, DAEMON_ATK, DAEMON_MOV, DAEMON_GOLD, DAEMON_SPAWN_GAP, LIGHTNING_COUNT, LIGHTNING_DMG, STORM_MOV, SCORE_GOAL, SCORE_TABLE,
  PILLAR_HP, PVE, MOB_SIDE, MOB_OWNER, SEIZE_SECS, REVIVE_TURNS, SIGHT_EXTRA, MOB_SEQ, SECS, K, ROAD, TOWNS, inRect, inTown, zoneAt, lazyShop,
  bodies, isMob, mobsOf, heroes, lazySummon, sizeOf, footOf, stormOn, fogOn, snowOn, magnetOn, snowMov, sandOn, SAND_SIGHT, inDesert, nightAt,
  tileFree, freeNear, manhattan, listOf, townOf, canMove, canStrike,
});
