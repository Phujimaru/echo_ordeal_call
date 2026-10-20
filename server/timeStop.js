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
  guard, mark, clearMark, check, catchInterrupt, isInterrupt,
  queueExtra, takeExtra, extraKind,
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
const SKIP_MATCH = new Set(["players", "phaseTimerId", "timeLeft", "afterCutscene", "skillBeats", "cutsceneQueue", "reservations", "tsSnap", "effectSourceId"]);
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
  match.cutsceneQueue = [];
  match.skillBeats = [];
  match.afterCutscene = [];
}

// ฝ่ายของคนที่กำลังเดิน (ระบบคู่ = เจ้าของ)
function sideOf(p) { return p ? Duo.sideKey(p) || p.id : null; }
// มีใครตั้งรับ (counterArmed) ที่เป็นศัตรูของ actor อยู่ไหม
function armedAgainst(actor) {
  if (!actor || match.timeFreeze) return false;
  for (const q of Object.values(match.players)) {
    if (!q.alive || q.id === actor.id || combat.sameTeam(q, actor) || sideOf(q) === sideOf(actor)) continue;
    const hook = CHAR_HOOKS[q.characterId];
    if (hook && typeof hook.counterArmed === "function" && combat.runHook(hook, "counterArmed", engine, q)) return true;
  }
  return false;
}
// จุดย้อนของตาเดินนี้ (เรียกตอนเริ่มตาเดิน/เริ่มคำสั่ง) — ไม่มีใครตั้งรับ = ไม่จด
function mark() {
  const actor = match.players[match.actorId];
  if (!actor || !armedAgainst(actor)) { match.tsSnap = null; return; }
  match.tsSnap = { side: sideOf(actor), data: snapshot() };
}
function clearMark() { match.tsSnap = null; }

let depth = 0;
// ห่อคำสั่งของผู้เล่นในตาเดิน: จดจุดย้อน แล้วรัน fn · ถูกตัด = ย้อน + ฮุค + จบตาผู้โจมตี (คืน undefined)
function guard(fn) {
  if (depth > 0) return fn();
  depth++;
  match.cmdSeq = (match.cmdSeq || 0) + 1; // เลขคำสั่งของผู้เล่น (ชั้นนอกสุด) — ตัวละครใช้แยก "การโจมตี 1 ครั้ง" (วาเลนไทน์: สกิลติดตัว)
  try {
    if (match.gameState === "ACTION") mark();
    return fn();
  } catch (err) {
    if (!catchInterrupt(err)) throw err;
    return undefined;
  } finally {
    depth--;
  }
}

// combat.adjustIncomingDamage: p กำลังจะเสียหาย n จาก effectSource → ตั้งรับอยู่ = โยนตัดการกระทำ
function check(p, n) {
  if (!(n > 0) || !p || !p.alive || !match.tsSnap || match.timeFreeze) return;
  const src = match.effectSourceId && match.players[match.effectSourceId];
  if (!src || src.id === p.id || sideOf(src) !== match.tsSnap.side || combat.sameTeam(src, p)) return;
  const hook = CHAR_HOOKS[p.characterId];
  if (!hook || typeof hook.counterArmed !== "function" || !combat.runHook(hook, "counterArmed", engine, p)) return;
  throw new TimeStopInterrupt(p.id, src.id);
}

// รับการตัด: ย้อนสถานะ → ฮุคผู้ตั้งรับ → ผู้โจมตีจบตา · ไม่ใช่การตัด = false
function catchInterrupt(err) {
  if (!isInterrupt(err)) return false;
  const snap = match.tsSnap;
  match.tsSnap = null;
  if (!snap) return true;
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

// ---------- ตาเดินพิเศษ ----------
function queueExtra(id, kind) {
  (match.extraTurns ||= []).push({ id, kind: kind || "extra" });
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
function freeze(byId) {
  const held = {};
  for (const p of Object.values(match.players)) {
    if (p.id === byId || !p.alive) continue;
    held[p.id] = {
      hp: p.hp, armor: p.armor, shield: p.shield, tempHp: p.tempHp || 0,
      statuses: { ...(p.statuses || {}) }, statusAmt: { ...(p.statusAmt || {}) }, pool: poolOf(p),
    };
  }
  match.timeFreeze = { by: byId, held, doomed: [] };
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
  const hits = [];
  for (const [id, h] of Object.entries(f.held)) {
    const p = match.players[id];
    if (!p) continue;
    if (p.alive && p.hp <= 0) {
      if (p.hp < 0) p.hp = 0;
      const die = () => combat.instantDeath(p);
      if (by) combat.withEffectSource(by, die); else die();
      if (!p.alive) { p.pos = null; match.lastLog.push(`💀 ${p.name} เลือดจริงหมด ตกรอบ!`); }
    }
    const dmg = Math.max(0, h.pool - poolOf(p));
    if (dmg > 0 || !p.alive) hits.push({ id, dmg, kill: !p.alive });
  }
  return hits;
}
// ข้อมูลที่ผู้ชมเห็นระหว่างหยุดเวลา (view.buildStateFor) — null = ค่าจริง
function frozenView(p) {
  const f = match.timeFreeze;
  if (!f || !p || p.id === f.by) return null;
  return f.held[p.id] || null;
}
