// ============================================================
//  ห่วงเวลาซีโร่ (Zero Time) — GRID_PLAN §8.2 (ผู้ใช้ตัดสิน 2026-10-11)
//
//  เกิด: จบเทิร์นแล้วเทิร์นถัดไปเป็นกลางคืนตั้งแต่เทิร์น 10 (เวลาโลก) → สุ่ม 30% · ครั้งเดียวต่อเกม
//  เข้า: ย้ายทุกคนไปสนามเฉพาะ (area 8–11 ใน server/board.js — สุ่มจุดเกิด) · ร้านค้าปิด · ผลภูมิภาค/กลางวันกลางคืนปิด ·
//        ท่าไม้ตายล็อก · เวลาโลกหยุด (worldRound ไม่เดิน — ตัวนับ match.zeroFrozen) · สถานะ/คูลดาวน์นับตามปกติ (roundNumber)
//  ข้างใน: จบเทิร์นทุกคนเสีย 1 (ลดเกราะก่อน · ตายได้) · เกราะไม่ฟื้น · ต้นเทิร์นเกิดของฟื้นพลังชีวิต 1 ชิ้น (จบตาบนช่อง = เก็บ)
//  เฟส (บัฟทุกคน สะสม · เฟส = ผนึกแตก + 1): 1 แต้มสกิล +1/เทิร์น · 2 เหรียญ +1/เทิร์น · 3 พลังโจมตี +1 ·
//        4 (เหลือผนึกเดียว) พลังโจมตี +1 อีก + ฟ้าผ่าต้นเทิร์น 3 จุดสุ่ม เสีย 2
//  ผนึกมิโกะ 4 มุม (พลังชีวิต 3 เกราะ 2): ตีปกติ/สกิลโจมตีพื้นที่ (area.hostile) โดน · ตัวใหญ่ทับไม่แตก (board.js UNBREAKABLE)
//  ปลดผนึก (อันสุดท้ายแตก): กลับแผนที่/ตำแหน่งเดิม · ร้านกลับมา · ทุกคนเสีย 2 ยกเว้นคนทุบอันสุดท้าย · เวลาโลกเดินต่อจากที่หยุด
//
//  ฉาก (client เล่นระหว่าง gameState CUTSCENE ที่ cutsceneInfo = null): match.zeroScene { seq, mode, stage, seal, breakerId }
//   enter = ลำแสง → คลื่น → โซ่ → ผนึก · break = ผนึกแตก + สนามเปลี่ยนระดับ · release = มิติแตกกลับสนามเดิม
// ============================================================
// export ก่อน require: ไฟล์ใน server/ require วนกันเอง — function declaration ถูก hoist จึงพร้อมใช้ตั้งแต่บรรทัดแรก
Object.assign(module.exports, {
  active, stage, worldRound, maybeEnter, enter, onRoundStart, onEndTurn, attackBonus, ultLocked,
  sealIndexOf, sealUnit, canHitSeal, attackSeal, hitSealsInArea, hasPendingBreak, runPendingBreak,
  collectPickup, publicInfo, reset,
});

const { ATTACKFX_TIME } = require("./constants");
const Board = require("./board");
const match = require("./match");
const { engine } = require("./engine");
const combat = require("./combat");
const dayNight = require("./dayNight");
const action = require("./phases/action");
const attack = require("./phases/attack");
const draw = require("./phases/draw");
const lobby = require("./lobby");
const shop = require("./shop");
const timers = require("./timers");
const view = require("./view");
const { statusAmtOf, poisonAtkPenalty, invertActive } = require("../characters/_universal_status");

// ปิดไว้ (ผู้ใช้สั่ง 2026-10-12) — เก็บระบบไว้ใช้ในอนาคต · true = กลับมาสุ่มเกิดตามปกติ (ECHO_DEV_ZERO=1 ยังบังคับเกิดได้)
const ZERO_ENABLED = false;
const ZERO_START_ROUND = 10; // เริ่มสุ่มตั้งแต่กลางคืนช่วงที่ 2 (เทิร์น 10–12)
const ZERO_CHANCE = 30;      // % ต่อเทิร์นกลางคืน
const SEAL_HP = 3, SEAL_ARMOR = 2;
const PICKUP_HEAL = 2;       // ของฟื้นพลังชีวิต (Claude ตัดสิน — ผู้ใช้ไม่ได้ระบุ)
const PICKUP_MAX = 4;        // ค้างบนสนามได้ไม่เกินเท่านี้ (เทิร์นละ 1 ชิ้น)
const DRAIN = 1;             // จบเทิร์นทุกคนเสีย
const RELEASE_DMG = 2;       // ปลดผนึก: ทุกคนเสีย ยกเว้นคนทุบอันสุดท้าย
const BOLT_COUNT = 3, BOLT_DMG = 2; // เฟส 4: ฟ้าผ่าต้นเทิร์น
// ความยาวฉากที่ server พักเกมรอ (วินาที) — ต้องพอดีกับฉากฝั่ง client (client/src/board/zeroScene.js)
const ENTER_SECONDS = 8.5, BREAK_SECONDS = 3.6, RELEASE_SECONDS = 5;
const SEAL_NAMES = ["ทิศเหนือ", "ทิศตะวันออก", "ทิศใต้", "ทิศตะวันตก"];
Object.assign(module.exports, { ZERO_ENABLED, ZERO_START_ROUND, ZERO_CHANCE, SEAL_HP, SEAL_ARMOR, PICKUP_HEAL, DRAIN, RELEASE_DMG, BOLT_COUNT, BOLT_DMG });

const roll = (pct) => Math.random() * 100 < pct;

function active() { return !!match.zero; }
function stage() {
  if (!match.zero) return 0;
  return Math.min(Board.ZERO_STAGES, match.zero.seals.filter((s) => s.broken).length + 1);
}
// เวลาโลก (กลางวัน/กลางคืน · ภูมิภาค · ร้านค้า) — เทิร์นที่อยู่ในห่วงเวลาไม่นับ
function worldRound(n = match.roundNumber) { return n - (match.zeroFrozen || 0); }
function reset() {
  match.zero = null;
  match.zeroUsed = false;
  match.zeroFrozen = 0;
  match.zeroScene = null;
}
// เครื่องมือ dev: ECHO_DEV_ZERO=1 = เกิดแน่นอนตั้งแต่กลางคืนแรก
function devForce() { return process.env.ECHO_DEV_ZERO === "1"; }
// เครื่องมือ dev: ECHO_DEV_ZERO_SEAL_HP=1 = ผนึกเลือดเท่านี้ ไม่มีเกราะ (ทดสอบฉากผนึกแตก/ปลดผนึกเร็วๆ)
function devSealHp() { const n = Math.floor(Number(process.env.ECHO_DEV_ZERO_SEAL_HP)); return Number.isFinite(n) && n > 0 ? n : 0; }

// ---------- เกิด ----------
// เรียกจาก endTurn (หลังตัดสินจบเกม/ข้ามภูมิภาค) — true = เข้าห่วงเวลาแล้ว (ผู้เรียกไม่ต้องไปต่อ)
function maybeEnter() {
  if (match.zeroUsed || match.zero) return false;
  if (!module.exports.ZERO_ENABLED && !devForce()) return false; // อ่านผ่าน exports ให้เทสต์เปิดได้
  const next = worldRound() + 1;
  if (!dayNight.isNightRound(next)) return false;
  if (devForce()) return enter();
  if (next < ZERO_START_ROUND || !roll(ZERO_CHANCE)) return false;
  return enter();
}
function enter() {
  const alive = combat.alivePlayers();
  const saved = {
    board: match.board,
    shopPos: match.shopPos,
    positions: Object.fromEntries(alive.filter((p) => p.pos).map((p) => [p.id, { ...p.pos }])),
  };
  match.zeroUsed = true;
  match.zero = {
    saved,
    seals: Board.ZERO_SEALS.map(([x, y]) => ({ x, y, hp: devSealHp() || SEAL_HP, armor: devSealHp() ? 0 : SEAL_ARMOR, broken: false })),
    pickups: [],
    pending: [],
    enteredRound: match.roundNumber,
  };
  action.placeOnBoard(Board.ZERO_AREA); // สุ่มจุดเกิดบนสนามเฉพาะ (ยกร้านออกด้วย)
  match.lastLog.push("⏳ ห่วงเวลาซีโร่ — เวลาหยุดนิ่ง");
  playScene({ mode: "enter", stage: 1 }, ENTER_SECONDS, () => draw.dealRound());
  return true;
}
// พักเกมให้ client เล่นฉาก (ไม่มีคลิป) แล้วไปต่อ
function playScene(info, seconds, after) {
  timers.clearPhaseTimer();
  match.zeroScene = { seq: (match.zeroScene ? match.zeroScene.seq : 0) + 1, active: true, ...info };
  match.cutsceneInfo = null;
  match.gameState = "CUTSCENE";
  timers.startPhaseTimer(seconds, () => { if (match.zeroScene) match.zeroScene.active = false; after(); });
  view.broadcastState();
}

// ---------- ต้นเทิร์น (dealRound — เวลาโลกหยุดนับที่หัว dealRound เอง) ----------
//  ของฟื้นพลังชีวิต 1 ชิ้น · เฟส 4 ฟ้าผ่า
function onRoundStart() {
  if (!match.zero) return;
  const map = action.boardMap();
  const units = action.boardUnits();
  const z = match.zero;
  const free = [];
  for (let y = 0; y < map.rows; y++) {
    for (let x = 0; x < map.cols; x++) {
      if (Board.isObstacle(map, x, y)) continue;
      if (units.some((u) => Board.covers(u, x, y))) continue;
      if (z.pickups.some((q) => q.x === x && q.y === y)) continue;
      free.push({ x, y });
    }
  }
  if (z.pickups.length < PICKUP_MAX && free.length) {
    const t = free[Math.floor(Math.random() * free.length)];
    z.pickups.push({ x: t.x, y: t.y });
  }
  if (stage() >= 4) lightning(map);
}
function lightning(map) {
  const tiles = [];
  const all = [];
  for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) if (!Board.isObstacle(map, x, y)) all.push({ x, y });
  for (let i = 0; i < BOLT_COUNT && all.length; i++) tiles.push(all.splice(Math.floor(Math.random() * all.length), 1)[0]);
  const hits = [];
  for (const p of combat.alivePlayers()) {
    if (!p.pos) continue;
    const box = action.boxOf(p);
    if (!tiles.some((t) => Board.covers(box, t.x, t.y))) continue;
    const vit = (p.hp || 0) + (p.armor || 0);
    fieldHit(p, BOLT_DMG);
    hits.push({ id: p.id, dmg: Math.max(0, vit - ((p.hp || 0) + (p.armor || 0))) });
    match.lastLog.push(`⚡ ฟ้าผ่าใส่ ${p.name} -${BOLT_DMG} (ลดเกราะก่อน)`);
    if (!p.alive) match.lastLog.push(`💀 ${p.name} เลือดจริงหมด ตกรอบ!`);
  }
  match.zero.bolt = { seq: (match.zero.bolt ? match.zero.bolt.seq : 0) + 1, tiles, hits };
  engine.boardFx("zeroBolt", { tiles, hits });
}
// ความเสียหายจากห่วงเวลา (ไม่มีต้นตอ · ลดเกราะก่อน · ตายได้) — ท่อเดียวกับความเสียหายจากสนามของการเดินทาง
function fieldHit(p, n) {
  p._statusDamage = true;
  combat.dealMixed(p, n);
  p._statusDamage = false;
  if (p.alive && p.hp <= 0) combat.instantDeath(p);
  if (!p.alive) p.pos = null;
}

// ---------- จบเทิร์น (endTurn — หลังลูปลดเทิร์นสถานะ ก่อนกวาดคนตาย) ----------
function onEndTurn() {
  if (!match.zero) return;
  const st = stage();
  const alive = combat.alivePlayers();
  for (const p of alive) combat.addSkill(p, 1);                 // เฟส 1: แต้มสกิล +1
  if (st >= 2) for (const p of alive) shop.addGold(p, 1);         // เฟส 2: เหรียญ +1
  match.lastLog.push(st >= 2 ? "⏳ ห่วงเวลาซีโร่ — แต้มสกิล +1 · เหรียญ +1" : "⏳ ห่วงเวลาซีโร่ — แต้มสกิล +1");
  for (const p of alive) {
    fieldHit(p, DRAIN);
    match.lastLog.push(`⏳ ${p.name} ถูกห่วงเวลากัดกิน -${DRAIN}`);
  }
}

// ---------- บัฟ / ล็อก ----------
// พลังโจมตีจากห่วงเวลา (ungated · computeAttackBase) — เฟส 3 +1 · เฟส 4 +2
function attackBonus() {
  const st = stage();
  if (st < 3) return null;
  const amount = st >= 4 ? 2 : 1;
  return { amount, name: `ห่วงเวลาซีโร่ — พลังโจมตี +${amount}` };
}
function ultLocked() { return !!match.zero; }

// ---------- ผนึก ----------
// "seal:N" → N (ผนึกที่ยังไม่แตก) · อื่น = -1
function sealIndexOf(targetId) {
  if (!match.zero || typeof targetId !== "string" || !targetId.startsWith("seal:")) return -1;
  const i = Number(targetId.slice(5));
  const s = match.zero.seals[i];
  return Number.isInteger(i) && s && !s.broken ? i : -1;
}
// ผนึกในรูปที่ท่อพลังโจมตีอ่านได้ (ฮุคตัวละครรับเป็น target)
function sealUnit(i) {
  const s = match.zero.seals[i];
  return {
    id: `seal:${i}`, name: `ผนึกมิโกะ${SEAL_NAMES[i]}`, pos: { x: s.x, y: s.y }, boardSize: 1, alive: true,
    hp: s.hp, armor: s.armor, statuses: {}, statusAmt: {}, characterId: null, teamId: null, img: null, customColor: "#ff7ac8",
  };
}
function canHitSeal(p, i) {
  if (!match.zero || i < 0 || !p || !p.pos) return false;
  const s = match.zero.seals[i];
  if (!s || s.broken) return false;
  // ตีปกติแบบแนวตรง (ไรโด ฮิคารุ) = ผนึกต้องอยู่ในแนว
  if (action.lanes(p)) return !!Board.laneOf(action.boardMap(), p.pos.x, p.pos.y, action.sizeOf(p), action.rangeOf(p), { x: s.x, y: s.y, size: 1 });
  return Board.inRange(action.rangeOf(p), Board.dist(action.boxOf(p), { x: s.x, y: s.y }));
}
// พลังโจมตีที่ลงผนึก: ท่อเดียวกับตีปกติ (ฐาน + โบนัส + เสริมพลัง − อ่อนแอ/พิษ · ผกผัน) — ผนึกไม่หลบ/ไม่มีบัฟป้องกัน
function sealDamage(attacker, i, { normal = true } = {}) {
  const c = attack.computeAttackBase(engine, attacker, sealUnit(i));
  let base = c.base - (!normal && c.empowerAtk ? 1 : 0);
  if (invertActive(attacker)) base = Math.max(0, 1 - (base - 1));
  let dmg = base + statusAmtOf(attacker, "might");
  dmg = Math.max(0, dmg - (statusAmtOf(attacker, "weak") + poisonAtkPenalty(attacker)));
  return { dmg, empower: normal && c.empowerAtk };
}
// ลงความเสียหายที่ผนึก (เกราะก่อน) → แตก = จองฉากไว้ใน pending (ผู้เรียกเล่นด้วย runPendingBreak)
function damageSeal(i, dmg, by) {
  const s = match.zero.seals[i];
  if (!s || s.broken || !(dmg > 0)) return false;
  let left = dmg;
  const fromArmor = Math.min(s.armor, left);
  s.armor -= fromArmor; left -= fromArmor;
  s.hp = Math.max(0, s.hp - left);
  if (s.hp > 0) return false;
  s.broken = true;
  match.zero.pending.push({ i, by: by ? by.id : null });
  match.lastLog.push(`💥 ${by ? by.name : "?"} ทำลายผนึกมิโกะ${SEAL_NAMES[i]}!`);
  return true;
}
// ตีปกติใส่ผนึก (action.attackTarget) — ฉากตีเหมือนตีคน แล้วเล่นฉากผนึกแตก/ปลดผนึกถ้าแตก → done (จบตา)
function attackSeal(p, i, done) {
  const unit = sealUnit(i);
  p.didAttackRound = true;
  const { dmg, empower } = sealDamage(p, i);
  if (empower) {
    delete p.statuses.empower;
    match.lastLog.push(`💪 ${p.name} เสริมพลัง — การโจมตีนี้ +1 (บัฟหมดลง)`);
  }
  const broke = damageSeal(i, dmg, p);
  if (!broke) match.lastLog.push(`${p.name} โจมตี${unit.name} -${dmg}`);
  const card = {
    id: ++match.attackSeq, ...attack.strikeCard(p, unit, { dmg, dodge: false, kill: broke, skills: [] }),
    targetImg: null, targetColor: "#ff7ac8", seal: i, counter: null, push: null,
  };
  const zb = attackBonus();
  if (zb) card.skills = [{ name: zb.name, img: null, by: p.name, color: lobby.colorOf(p), side: "atk" }];
  const fxSeconds = ATTACKFX_TIME + (card.skills.length ? 2 : 0);
  card.fxMs = fxSeconds * 1000;
  match.lastAttack = card;
  match.gameState = "ATTACKING";
  timers.startPhaseTimer(fxSeconds, () => runPendingBreak(done));
  view.broadcastState();
}
// สกิลโจมตีพื้นที่ (area.hostile) ที่คลุมช่องผนึก — ความเสียหาย = พลังโจมตีของผู้ใช้ (ไม่รวมเสริมพลัง) ต่อผนึก
function hitSealsInArea(p, tiles) {
  if (!match.zero || !Array.isArray(tiles) || !tiles.length) return;
  const keys = new Set(tiles.map((t) => Board.key(t.x, t.y)));
  match.zero.seals.forEach((s, i) => {
    if (s.broken || !keys.has(Board.key(s.x, s.y))) return;
    const { dmg } = sealDamage(p, i, { normal: false });
    if (!damageSeal(i, dmg, p)) match.lastLog.push(`${p.name} โจมตีผนึกมิโกะ${SEAL_NAMES[i]}ด้วยสกิล -${dmg}`);
  });
}
function hasPendingBreak() { return !!(match.zero && match.zero.pending.length); }
// เล่นฉากผนึกแตก (หรือปลดผนึกถ้าแตกครบ) แล้วเรียก done · ไม่มีอะไรค้าง = done ทันที
function runPendingBreak(done) {
  if (!hasPendingBreak()) { done(); return; }
  const z = match.zero;
  const last = z.pending[z.pending.length - 1];
  z.pending = [];
  if (z.seals.every((s) => s.broken)) { release(last, done); return; }
  const st = stage();
  // ผังเดิม หน้าตาตามระดับ — เปลี่ยนแค่ area (ตำแหน่ง/ของบนสนาม เช่นน้ำแข็ง/หนาม/ช่องที่พัง ไม่เปลี่ยน) · ล้างแคชแผนที่
  match.board.area = Board.ZERO_AREA + st - 1;
  delete match.board.mapCache;
  match.lastLog.push(`⏳ ห่วงเวลาซีโร่ — เฟส ${st}`);
  playScene({ mode: "break", stage: st, seal: last.i, breakerId: last.by }, BREAK_SECONDS, done);
}
// ปลดผนึก: กลับสนามเดิม (ตำแหน่งเดิม · ไม่ว่าง = ช่องว่างใกล้สุด) · ร้านกลับมา · ทุกคนเสีย 2 ยกเว้นคนทุบอันสุดท้าย
function release(last, done) {
  const z = match.zero;
  const breaker = last && last.by ? match.players[last.by] : null;
  match.board = z.saved.board;
  match.shopPos = z.saved.shopPos;
  match.zero = null;
  // วางคืนทีละคน (คนที่ตำแหน่งเดิมว่างก่อน)
  const alive = combat.alivePlayers();
  for (const p of alive) p.pos = null;
  const order = [...alive].sort((a, b) => (z.saved.positions[a.id] ? 0 : 1) - (z.saved.positions[b.id] ? 0 : 1));
  for (const p of order) p.pos = spotNear(p, z.saved.positions[p.id]);
  if (match.action && match.actorId) {
    const a = match.players[match.actorId];
    if (a && a.pos) match.action = { ...match.action, from: { ...a.pos }, moved: true, locked: true, path: null };
  }
  match.lastLog.push("⏳ ปลดผนึก — เวลากลับมาเดินอีกครั้ง");
  for (const p of alive) {
    if (breaker && p.id === breaker.id) continue;
    fieldHit(p, RELEASE_DMG);
    match.lastLog.push(`💥 ${p.name} โดนแรงปลดผนึก -${RELEASE_DMG}`);
    if (!p.alive) match.lastLog.push(`💀 ${p.name} เลือดจริงหมด ตกรอบ!`);
  }
  playScene({ mode: "release", stage: 4, seal: last ? last.i : 0, breakerId: breaker ? breaker.id : null }, RELEASE_SECONDS, done);
}
// ช่องยืนใกล้ want ที่สุด (ทั้งตัวลงได้ ไม่ทับใคร/สิ่งกีดขวาง/ร้าน) — ตัวใหญ่ใช้ placeBig (ไม่พังของ)
function spotNear(p, want) {
  const map = action.boardMap();
  const units = action.boardUnits().filter((u) => u.id !== p.id);
  const near = want || { x: Math.floor(map.cols / 2), y: Math.floor(map.rows / 2) };
  const blocked = action.boardBlocked();
  if (action.sizeOf(p) > 1) {
    const spot = Board.placeBig(map, action.sizeOf(p), near, units, { selfId: p.id, blocked });
    if (spot) return { x: spot.x, y: spot.y };
    p.boardSize = 1;
  }
  let best = null;
  for (let y = 0; y < map.rows; y++) {
    for (let x = 0; x < map.cols; x++) {
      if (!Board.freeTile(map, x, y, units, p.id, blocked)) continue;
      const d = Math.abs(x - near.x) + Math.abs(y - near.y);
      if (!best || d < best.d) best = { x, y, d };
    }
  }
  return best ? { x: best.x, y: best.y } : null;
}

// ---------- ของฟื้นพลังชีวิต ----------
// จบตาบนช่องของ (ตัวใหญ่: ช่องไหนของตัวก็ได้ · เก็บทุกชิ้นที่ทับ)
function collectPickup(p) {
  if (!match.zero || !p || !p.alive || !p.pos) return;
  const box = action.boxOf(p);
  const got = match.zero.pickups.filter((q) => Board.covers(box, q.x, q.y));
  if (!got.length) return;
  match.zero.pickups = match.zero.pickups.filter((q) => !got.includes(q));
  const healed = combat.healHp(p, PICKUP_HEAL * got.length);
  match.lastLog.push(`💚 ${p.name} เก็บพลังชีวิตในห่วงเวลา +${healed}`);
}

// ---------- ข้อมูลที่ส่งให้ client ----------
function publicInfo() {
  const scene = match.zeroScene && match.zeroScene.active ? { ...match.zeroScene } : null;
  if (!match.zero) return scene ? { active: false, scene } : null;
  const z = match.zero;
  return {
    active: true,
    stage: stage(),
    buffPhase: Math.min(3, stage()),
    seals: z.seals.map((s, i) => ({ i, x: s.x, y: s.y, hp: s.hp, armor: s.armor, maxHp: SEAL_HP, maxArmor: SEAL_ARMOR, broken: s.broken })),
    pickups: z.pickups.map((q) => ({ x: q.x, y: q.y })),
    atk: attackBonus() ? attackBonus().amount : 0,
    scene,
  };
}
