// ============================================================
//  หยุดเวลา — ระบบกลาง (ต้นแบบ ดิเอโก้ แบรนโด โลกคู่ขนาน · GRID_PLAN §7.12 · GAME_SYSTEM §24)
//
//  1) ตัดการโจมตีกลางคัน (counter): ตัวละครที่ฮุค counterArmed(engine, p) = true ถูกศัตรูทำให้เสียหาย (ทุกช่องทาง —
//     combat.adjustIncomingDamage) ในตาเดินของศัตรูคนนั้น → การกระทำนั้นถูกยกเลิก "ทั้งก้อน":
//     สถานะเกมย้อนกลับไปตอนเริ่มคำสั่ง (mark — แต้ม/ของ/เหรียญ/โควตาที่ผู้โจมตีจ่ายไปได้คืนเอง · คนอื่นในพื้นที่ก็ไม่โดน)
//     → ฮุค onCounterStop(engine, ผู้ตั้งรับ, ผู้โจมตี) → ผู้โจมตีจบตาทันที (finishActor · ไม่ได้เดินต่อ)
//     · จุดรับคำสั่ง (useSkill / attackTarget / moveTo / ใช้ไอเทม / ปุ่มพิเศษ) ห่อด้วย guard() · ต้นตาเดิน (nextActor) mark() ใหม่
//     · ผลที่ลงทีหลังในตัวจับเวลา (ฉากสกิล/ฉากตี) จับใน timers.tick — ย้อนกลับไปจุดเดียวกัน
//     · ไม่มี snapshot (เทสต์เรียก doAttack ตรงๆ / ไม่มีใครตั้งรับ) = ไม่ตัด ดาเมจลงตามปกติ
//  2) ตาเดินพิเศษ: queueExtra(id, kind) → nextActor เล่นตาพิเศษก่อนเลื่อนคิว (ลำดับเดินเดิมไม่ขยับ)
//     · match.action.extra = kind · ฮุค onExtraTurn(engine, p, kind) ตอนเริ่ม · extraTurnOutro(engine, p, kind) → วินาทีพักฉากก่อนจบตา
//  3) หยุดเวลา (freeze): ระหว่างนั้นคนอื่นไม่ตาย (instantDeath ค้างไว้) · ผู้ชมเห็นเลือด/เกราะ/สถานะของคนอื่นเท่าตอนเริ่มหยุด (frozenView)
//     · unfreeze() = เวลาเดินต่อ → คนที่เลือดหมดตกรอบพร้อมกัน → คืนรายการ { id, dmg, kill } (ดาเมจที่ลงระหว่างหยุด)
// ============================================================
Object.assign(module.exports, {
  guard, mark, clearMark, check, checkHit, checkSure, catchInterrupt, isInterrupt,
  queueExtra, takeExtra, extraKind, interrupt,
  freeze, unfreeze, frozen, holdsDeath, frozenView,
});

const CHAR_HOOKS = require("../characters/index");
const match = require("./match");
const { engine } = require("./engine");
const combat = require("./combat");
const timers = require("./timers");
const Duo = require("./duo");

class TimeStopInterrupt extends Error {
  constructor(defenderId, attackerId) {
    super("time stop interrupt");
    this.timeStopInterrupt = true;
    this.defenderId = defenderId;
    this.attackerId = attackerId;
  }
}
function isInterrupt(err) { return !!(err && err.timeStopInterrupt); }

// ---------- snapshot ----------
// ฟิลด์ของ match ที่ไม่ย้อน: ตัวจับเวลา / คิวฉาก (ล้างทิ้งตอนตัด) / ห้องรอ
const SKIP_MATCH = new Set(["players", "phaseTimerId", "timeLeft", "afterCutscene", "skillBeats", "cutsceneQueue", "reservations", "tsSnap", "tsTurn", "effectSourceId"]);
// ฟิลด์ของผู้เล่นที่ผูกกับการเชื่อมต่อ (หลุด/กลับเข้าระหว่างนั้นต้องไม่ถูกย้อน)
const KEEP_PLAYER = new Set(["socketId", "connected", "sessionToken"]);
function clonePlain(v) {
  return structuredClone(v);
}
function snapshot() {
  const players = {};
  for (const [id, p] of Object.entries(match.players)) {
    const copy = {};
    for (const k of Object.keys(p)) if (!KEEP_PLAYER.has(k)) copy[k] = p[k];
    players[id] = clonePlain(copy);
  }
  const m = {};
  for (const k of Object.keys(match)) {
    if (SKIP_MATCH.has(k)) continue;
    // แคชแผนที่ (action.boardMap) ไม่ย้อน — สร้างใหม่เองตามเลขรุ่น
    if (k === "board" && match.board) { const b = { ...match.board }; delete b.mapCache; m.board = clonePlain(b); continue; }
    m[k] = clonePlain(match[k]);
  }
  return { players, m };
}
// ย้อนแบบคงตัวอ็อบเจกต์ผู้เล่นเดิม (ที่อื่นถือ reference ของ match.players[id] ได้)
function restore(snap) {
  for (const [id, p] of Object.entries(match.players)) {
    const s = snap.players[id];
    if (!s) { if (p.summon) delete match.players[id]; continue; } // ยูนิตที่ถูกเรียกระหว่างการกระทำที่ถูกตัด = หายไปด้วย
    for (const k of Object.keys(p)) if (!KEEP_PLAYER.has(k) && !(k in s)) delete p[k];
    Object.assign(p, s);
  }
  for (const [k, v] of Object.entries(snap.m)) match[k] = v;
  // ของที่พักไว้ของฉากตีที่ถูกตัด — จุดย้อนอาจจดก่อนมีฟิลด์นี้ · ค้างไว้ = เอฟเฟกต์ถัดไปถูกพักหาย (Return to Zero ครั้งที่ 2 ไม่ขึ้นบนกระดาน)
  match.voiceHold = null;
  match.hitFxHold = null;
  match.cutsceneQueue = [];
  match.skillBeats = [];
  match.afterCutscene = [];
}

// ฝ่ายของคนที่กำลังเดิน (ระบบคู่ = เจ้าของ)
function sideOf(p) { return p ? Duo.sideKey(p) || p.id : null; }
// มีใครตั้งรับ (counterArmed) ที่เป็นศัตรูของ actor อยู่ไหม
//  ระหว่างหยุดเวลา: เหลือเฉพาะฮุค rewindsTurn (โจรุโน่ Requiem — Return to Zero ชนะการหยุดเวลา)
function armedAgainst(actor) {
  if (!actor) return false;
  for (const q of Object.values(match.players)) {
    if (!q.alive || q.id === actor.id || combat.sameTeam(q, actor) || sideOf(q) === sideOf(actor)) continue;
    const hook = CHAR_HOOKS[q.characterId];
    if (match.timeFreeze && !(hook && hook.rewindsTurn)) continue;
    if (hook && typeof hook.counterArmed === "function" && combat.runHook(hook, "counterArmed", engine, q)) return true;
  }
  return false;
}
// จุดย้อนของตาเดินนี้ (เรียกตอนเริ่มตาเดิน/เริ่มคำสั่ง) — ไม่มีใครตั้งรับ = ไม่จด
//  turnSecs = เรียกจากต้นตาเดิน: จดเป็นจุดย้อนของทั้งตาด้วย (โจรุโน่ Requiem — ฮุค rewindsTurn ย้อนไปต้นตาเดิน)
function mark(turnSecs) {
  const actor = match.players[match.actorId];
  if (!actor || !armedAgainst(actor)) { match.tsSnap = null; if (turnSecs) match.tsTurn = null; return; }
  match.tsSnap = { side: sideOf(actor), data: snapshot() };
  if (turnSecs) match.tsTurn = { secs: turnSecs, data: match.tsSnap.data };
}
function clearMark() { match.tsSnap = null; match.tsTurn = null; }

let depth = 0;
let unfreezing = false; // ผลที่ค้างไว้ตอนเวลาเดินต่อ = การโจมตีเดิมที่ทอยไปแล้ว ไม่ทอยซ้ำ
// ห่อคำสั่งของผู้เล่นในตาเดิน: จดจุดย้อน แล้วรัน fn · ถูกตัด = ย้อน + ฮุค + จบตาผู้โจมตี (คืน undefined)
function guard(fn) {
  if (depth > 0) return fn();
  depth++;
  match.cmdSeq = (match.cmdSeq || 0) + 1; // เลขคำสั่งของผู้เล่น (ชั้นนอกสุด) — ตัวละครใช้แยก "การโจมตี 1 ครั้ง" (วาเลนไทน์: สกิลติดตัว)
  match.commandSeq = (match.commandSeq || 0) + 1; // ลำดับคำสั่งของผู้เล่น (ฮุคแยก "การโจมตีครั้งเดียวกัน" — เฟิร์น: ผู้เชี่ยวชาญเวทมนต์พื้นฐาน)
  match.voiceHold = null; // เสียงพากย์ที่พักไว้ของฉากตีที่ถูกตัดกลางทาง (attack.voiceAt) ไม่ค้างข้ามคำสั่ง
  match.hitFxHold = null; // เอฟเฟกต์ที่พักไว้แบบเดียวกัน (engine.boardFxAtHit)
  try {
    if (match.gameState === "ACTION") mark();
    const out = fn();
    // ผลของคำสั่งขอฉากต่อ (ดิโอ: Last Stand) และคำสั่งนี้ไม่ได้พักตาเอง = เล่นตอนนี้ แล้วกลับตาด้วยเวลาที่เหลือ
    if (match.flowWanted && match.gameState === "ACTION") require("./cutscene").pausePlayingForCutscene();
    return out;
  } catch (err) {
    if (!catchInterrupt(err)) throw err;
    return undefined;
  } finally {
    depth--;
  }
}

// combat.adjustIncomingDamage: p กำลังจะเสียหาย n จาก effectSource → ตั้งรับอยู่ = โยนตัดการกระทำ
function check(p, n, sure) {
  if (!(n > 0) || !p || !p.alive || !match.tsSnap || unfreezing) return;
  const src = match.effectSourceId && match.players[match.effectSourceId];
  if (!src || src.id === p.id || sideOf(src) !== match.tsSnap.side || combat.sameTeam(src, p)) return;
  const hook = CHAR_HOOKS[p.characterId];
  if (match.timeFreeze && !(hook && hook.rewindsTurn)) return;
  if (!hook || typeof hook.counterArmed !== "function" || !combat.runHook(hook, "counterArmed", engine, p)) return;
  // ฮุค counterFires(engine, p, src) → false = ครั้งนี้ไม่ตัด (โจรุโน่ Requiem: ทอย 50% ต่อคำสั่ง)
  if (typeof hook.counterFires === "function" && !combat.runHook(hook, "counterFires", engine, p, src, sure)) return;
  throw new TimeStopInterrupt(p.id, src.id);
}
// ถูกโจมตีโดยยังไม่มีดาเมจ (combat.notifyAttacked: ตีปกติ/สกิล/ปืน ก่อนทอยหลบ · combat.instantDeath: สังหารทันที)
//  ตัวที่มีฮุค counterFires นับเป็นการโจมตีด้วย — ตีปกติพลัง 0 ก็ติด (ดิเอโก้ตั้งรับเฉพาะตอนเสียหายตามเดิม)
function checkHit(p) {
  const hook = p && CHAR_HOOKS[p.characterId];
  if (hook && typeof hook.counterFires === "function") check(p, 1);
}
// การโจมตีที่ไม่ผ่านท่อดาเมจเสมอไป และโดน Return to Zero แน่นอน (ปืน GUTS · นกหวีด — ผู้ใช้สั่ง 2026-11-05)
function checkSure(p) {
  const hook = p && CHAR_HOOKS[p.characterId];
  if (hook && typeof hook.counterFires === "function") check(p, 1, true);
}

// รับการตัด: ย้อนสถานะ → ฮุคผู้ตั้งรับ → ผู้โจมตีจบตา · ไม่ใช่การตัด = false
function catchInterrupt(err) {
  if (!isInterrupt(err)) return false;
  const snap = match.tsSnap;
  const turn = match.tsTurn;
  match.tsSnap = null;
  if (!snap) return true;
  const defHook = CHAR_HOOKS[(match.players[err.defenderId] || {}).characterId];
  if (defHook && defHook.rewindsTurn) return rewindTurn(err, snap, turn, defHook);
  // เวลาที่เหลือของตาผู้โจมตี (ถูกตัดระหว่างฉาก = เวลาที่จดไว้ตอนตาถูกพัก)
  const left = match.gameState === "ACTION" ? match.timeLeft : match.actionLeft;
  timers.clearPhaseTimer();
  restore(snap.data);
  match.effectSourceId = null;
  match.cutsceneInfo = null;
  match.lastAttack = null;
  const defender = match.players[err.defenderId];
  const attacker = match.players[err.attackerId];
  if (defender) combat.runHook(CHAR_HOOKS[defender.characterId], "onCounterStop", engine, defender, attacker);
  // ผู้ใช้สั่ง 2026-10-20: ไม่จบตาผู้โจมตี — ตาพิเศษแทรกกลางทาง แล้วกลับมาตาเดิมของผู้โจมตีต่อด้วยเวลาที่เหลือ
  const resume = {
    actorId: match.actorId, action: match.action, duo: match.duo, left: Math.max(3, Number(left) || 0),
    at: attacker && attacker.pos ? { ...attacker.pos } : null,
  };
  const ex = (match.extraTurns || []).find((e) => defender && e.id === defender.id && !e.resume);
  if (ex) ex.resume = resume;
  const action = require("./phases/action");
  if (!action.runExtras()) action.resumeFrom(resume);
  return true;
}

// ฮุค rewindsTurn (โจรุโน่ Requiem: Return to Zero): ย้อนทุกอย่างกลับต้นตาเดินของผู้โจมตี แล้วเดินตานั้นใหม่เต็มเวลา
//  จุดย้อนของตาพิเศษจดก่อนเริ่มหยุดเวลา → ถูกย้อนระหว่างหยุดเวลา = เวลาเดินต่อ เหลือตาธรรมดาของผู้โจมตี
//  ทุกอย่างของตานั้นคืนหมด ทั้งแต้ม/ไอเทม/เหรียญ/คูลดาวน์ (ผู้ใช้สั่ง 2026-11-05) · onCounterStop ได้ { from, back } คิวคลิป/ฉากก่อนกลับเข้าตา
function rewindTurn(err, snap, turn, hook) {
  const attacker = match.players[err.attackerId];
  const from = attacker && attacker.pos ? { ...attacker.pos } : null;
  timers.clearPhaseTimer();
  restore(clonePlain((turn || snap).data));
  match.tsTurn = turn;
  // ย้อนแล้วยังอยู่ในการหยุดเวลา (จุดย้อนจดหลังเริ่มหยุด) = เวลาเดินต่อเอง · ฮุค broadcast onFreezeBroken(engine, ผู้หยุดเวลา) ล้างสถานะของตัวละคร
  while (match.timeFreeze) { // วนลูป: หยุดเวลาซ้อนกัน (ดิโอแทรกการหยุดเวลาของคนอื่น) เดินต่อทุกชั้น
    const by = match.timeFreeze.by;
    unfreeze();
    combat.broadcastHook("onFreezeBroken", engine, by);
  }
  match.effectSourceId = null;
  match.cutsceneInfo = null;
  match.lastAttack = null;
  match.timeLeft = (turn && turn.secs) || match.timeLeft;
  const defender = match.players[err.defenderId];
  combat.runHook(hook, "onCounterStop", engine, defender, attacker, { from, back: attacker && attacker.pos ? { ...attacker.pos } : null });
  require("./cutscene").pausePlayingForCutscene();
  return true;
}

// ---------- ตาเดินพิเศษ ----------
function queueExtra(id, kind) {
  (match.extraTurns ||= []).push({ id, kind: kind || "extra" });
}
// แทรกตาเดินพิเศษกลางตาของคนที่กำลังเดินเดี๋ยวนี้ (ดิโอ: Za warudo) — จบแล้วกลับตานั้นด้วยเวลาที่เหลือ
//  left = เวลาที่เหลือของตาที่ถูกแทรก · ระหว่างฉาก ATTACKING/CUTSCENE ห้ามเรียก (ใช้ engine.flowHandoff ให้ฉากจบก่อน)
function interrupt(id, kind, left) {
  const actor = match.players[match.actorId];
  const resume = {
    actorId: match.actorId, action: match.action, duo: match.duo, left: Math.max(3, Number(left) || 0),
    at: actor && actor.pos ? { ...actor.pos } : null,
  };
  timers.clearPhaseTimer();
  (match.extraTurns ||= []).unshift({ id, kind: kind || "extra", resume });
  require("./phases/action").runExtras();
}
function takeExtra() {
  const q = match.extraTurns;
  return q && q.length ? q.shift() : null;
}
function extraKind() {
  return (match.action && match.action.extra) || null;
}

// ---------- หยุดเวลา ----------
const poolOf = (p) => (p.hp || 0) + (p.armor || 0) + (p.shield || 0) + (p.tempHp || 0);
//  หยุดเวลาซ้อน (ดิโอแทรกตอนคนอื่นหยุดเวลา — ผู้ใช้สั่ง 2026-11-05: แทรกแล้วคืนตาเขา): ชั้นเดิมเก็บใน parent · ผู้ชมยังเห็นค่าเท่าชั้นเดิม
function freeze(byId) {
  const prev = match.timeFreeze || null;
  const held = {};
  for (const p of Object.values(match.players)) {
    if (p.id === byId || !p.alive) continue;
    const seen = (prev && prev.held[p.id]) || p;
    held[p.id] = {
      hp: seen.hp, armor: seen.armor, shield: seen.shield, tempHp: seen.tempHp || 0,
      statuses: { ...(seen.statuses || {}) }, statusAmt: { ...(seen.statusAmt || {}) }, pool: poolOf(p),
    };
  }
  match.timeFreeze = { by: byId, held, doomed: [], parent: prev };
}
function frozen() { return match.timeFreeze || null; }
// combat.instantDeath: ระหว่างหยุดเวลา คนอื่นยังไม่ตาย (จดไว้ ตกรอบตอนเวลาเดินต่อ)
function holdsDeath(p) {
  const f = match.timeFreeze;
  if (!f || !p || p.id === f.by || !p.alive) return false;
  if (!f.doomed.includes(p.id)) f.doomed.push(p.id);
  return true;
}
// เวลาเดินต่อ → [{ id, dmg, kill }] ของคนที่เสียหายระหว่างหยุด (เรียงตามลำดับผู้เล่น)
function unfreeze() {
  const f = match.timeFreeze;
  if (!f) return [];
  match.timeFreeze = null;
  const by = match.players[f.by];
  const parent = f.parent || null;
  const hits = [];
  for (const [id, h] of Object.entries(f.held)) {
    const p = match.players[id];
    if (!p) continue;
    // หยุดเวลาซ้อน: คนที่ชั้นเดิมสังหารไว้ยังไม่ตาย ถ้าชั้นนี้ไม่ได้ตีเพิ่ม (ตกรอบตอนชั้นเดิมเดินต่อ)
    const parentsKill = parent && parent.doomed.includes(id) && !f.doomed.includes(id);
    if (p.alive && p.hp <= 0 && !parentsKill) {
      if (p.hp < 0) p.hp = 0;
      const die = () => combat.instantDeath(p);
      unfreezing = true;
      try { if (by) combat.withEffectSource(by, die); else die(); } finally { unfreezing = false; }
      if (!p.alive) { p.pos = null; match.lastLog.push(`💀 ${p.name} เลือดจริงหมด ตกรอบ!`); }
    }
    const dmg = Math.max(0, h.pool - poolOf(p));
    if (dmg > 0 || !p.alive) hits.push({ id, dmg, kill: !p.alive });
    // ดาเมจของชั้นนี้ลงแล้ว = ผู้ชมชั้นเดิมเห็นเลือดใหม่ · ไม่นับเป็นดาเมจของชั้นเดิมซ้ำ
    const up = parent && parent.held[id];
    if (up && dmg > 0) {
      up.pool = Math.max(0, up.pool - dmg);
      up.hp = Math.max(0, up.hp - dmg);
      up.armor = p.armor; up.shield = p.shield; up.tempHp = p.tempHp || 0;
    }
  }
  if (parent) {
    match.timeFreeze = parent;
    const owner = match.players[parent.by];
    if (!owner || !owner.alive) hits.push(...unfreeze()); // เจ้าของชั้นเดิมตายตอนนี้ = เวลาเดินต่อทั้งหมด
  }
  return hits;
}
// ข้อมูลที่ผู้ชมเห็นระหว่างหยุดเวลา (view.buildStateFor) — null = ค่าจริง
function frozenView(p) {
  const f = match.timeFreeze;
  if (!f || !p || p.id === f.by) return null;
  return f.held[p.id] || null;
}
