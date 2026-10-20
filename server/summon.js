// ============================================================
//  ยูนิตที่ถูกเรียกออกมา — ระบบกลาง (ต้นแบบ ฟันนี่ วาเลนไทน์ · GRID_PLAN §7.13 · GAME_SYSTEM §26)
//
//  ระเบียนใน match.players (id `<เจ้าของ>~s<n>`) มี `summon: { kind, ownerId, side, until, mov, range, maxHp, maxArmor,
//   look, targetId, controlled, … }` — ได้ตำแหน่ง/เลือด/เกราะ/สถานะ/ถูกตี/ตาย ฟรีจากระบบเดิม
//   · ไม่ใช่ผู้ถือไพ่ (Duo.inGame false · ไม่จั่ว/ไม่ได้เหรียญ/แต้มจบเทิร์น/ไม่อยู่ใน turnOrder) · ไม่มี socket (ข้ามใน broadcast/fx)
//   · ไม่นับเป็นผู้รอด/ฝ่าย (Duo.sideCount · gameOver · aliveTeamIds) · ไม่ทิ้งศพ · ไม่ยิงฮุค onDeath/onKill ของตัวละครอื่น
//   · Duo.sideKey = summon.side (ร่างแยก = เจ้าของ → พวกเดียวกัน · ตัวเหมือน = id ตัวเอง → ศัตรูของทุกคน)
//   · mov / range / เลือด-เกราะสูงสุด จาก summon.* (action.baseMovOf / rangeOf · combat.maxHpOf / maxArmorOf)
//  ตัวที่คุมได้ (controlled — ร่างแยก): แต้มสกิล/เหรียญ/กระเป๋า/ไพ่ ใช้ร่วมกับเจ้าของ (getter แบบระบบคู่)
//   · Duo.turnUnits(เจ้าของ) = เจ้าของ + ตัวที่คุมได้ที่ยังอยู่ → ตาเดินเล่นต่อกันแบบระบบคู่ (match.duo) · ตัวละ CONTROL_SECONDS
//   · ไม่ใช้สกิล/ไอเทม/ปืน GUTS/ขี่ใคร/ซื้อของ
//  ตาย = ฮุค onSummonDeath(engine, เจ้าของ, ตัวที่ตาย) ของโมดูลเจ้าของ · ระเบียนที่ตายถูกลบตอนจบเทิร์น (sweep)
//  เปลี่ยนแผนที่ (placeOnBoard) / กลับห้องรอ (Duo.teardown) = ลบหมด
// ============================================================
Object.assign(module.exports, {
  isSummon, spawn, remove, removeAll, sweep, ofOwner, controlledOf, onDeath,
});

const match = require("./match");

const CONTROL_SECONDS = 20; // เวลาคุมต่อร่างแยก (GRID_PLAN §7.13 — Claude ตัดสิน)
const SHARED = ["skillPoints", "gold", "inventory", "cards", "gutsShotTurn"]; // แบบเดียวกับระบบคู่ (server/duo.js)
Object.assign(module.exports, { CONTROL_SECONDS });

function isSummon(p) { return !!(p && p.summon); }
// ยูนิตที่เรียกโดย owner (ยังอยู่ · kind = ชนิด ไม่ส่ง = ทุกชนิด)
function ofOwner(ownerId, kind) {
  return Object.values(match.players).filter((p) => p.summon && p.alive && p.summon.ownerId === ownerId && (!kind || p.summon.kind === kind));
}
// ตัวที่คุมได้ของเจ้าของ (ตามลำดับที่เรียก)
function controlledOf(owner) {
  if (!owner) return [];
  return ofOwner(owner.id).filter((p) => p.summon.controlled);
}
// เรียกยูนิตใหม่ → ระเบียน (ยังไม่วาง pos ถ้าไม่ส่ง)
//  o = { kind, pos, dim, hp, armor, mov, range, controlled, characterId, name, img, color, look, targetId, until, data }
function spawn(owner, o = {}) {
  const id = `${owner.id}~s${match.summonSeq = (match.summonSeq || 0) + 1}`;
  const controlled = !!o.controlled;
  const rec = {
    id, connected: true, ready: true, socketId: null, sessionToken: null,
    teamId: controlled ? owner.teamId || null : null, teamConfirmed: true, modeVote: null,
    name: o.name || owner.name, customColor: o.color || owner.customColor || null, position: owner.position,
    characterId: o.characterId || "summon", avatar: 0, img: o.img || null,
    locked: true, busted: false, result: null,
    hp: o.hp || 1, armor: o.armor || 0, alive: true, shield: 0, statuses: {}, statusAmt: { cardAtkBonus: 0 },
    seen: {}, transformAt: 0, cutsceneShown: {}, skillUsedRound: false,
    tempHp: 0, tempHpTurns: 0, sleepFresh: false, pos: o.pos ? { ...o.pos } : null,
    dim: o.dim || null, dimGhost: false,
    dmgHp: 0, dmgArmor: 0, gainedSkill: 0, wasAttacked: false, didAttackRound: false,
    boardSize: 1, exposedRound: 0, nightTaxTier: null, curseHitRound: 0, gutsGargorgonPending: false,
    mark42: null, mark42Owned: null, mark42BuyLock: 0,
    colorTrigger: { red: 0, blue: 0, green: 0, yellow: 0 },
    summon: {
      kind: o.kind || "summon", ownerId: owner.id, side: controlled ? (owner.summon ? owner.summon.side : (owner.duoOf || owner.id)) : id,
      controlled, until: o.until == null ? null : o.until,
      mov: Number.isFinite(o.mov) ? o.mov : null, range: Array.isArray(o.range) ? [...o.range] : null,
      maxHp: o.hp || 1, maxArmor: o.armor || 0,
      look: o.look || null, targetId: o.targetId || null,
      ...(o.data || {}),
    },
  };
  if (controlled) {
    for (const k of SHARED) {
      Object.defineProperty(rec, k, {
        enumerable: true, configurable: true,
        get() { const own = match.players[rec.summon.ownerId]; return own ? own[k] : undefined; },
        set(v) { const own = match.players[rec.summon.ownerId]; if (own) own[k] = v; },
      });
    }
  } else {
    Object.assign(rec, { skillPoints: 0, gold: 0, inventory: [], cards: [], gutsShotTurn: 0 });
  }
  match.players[id] = rec;
  return rec;
}
// เอาออกจากกระดานเงียบๆ (หมดเวลา/ชนแล้วสลาย/เจ้าของตาย) — ไม่ยิงฮุคตาย · ระเบียนถูกลบตอน sweep
function remove(p) {
  if (!p || !p.summon) return;
  p.alive = false; p.hp = 0; p.result = "dead"; p.locked = true; p.pos = null;
}
// ถูกฆ่า (combat.instantDeath) → ฮุค onSummonDeath(engine, เจ้าของ, p) ของโมดูลเจ้าของ (ก่อนล้าง pos — ฮุคอ่านช่องที่ตายได้)
function onDeath(p) {
  p.hp = 0; p.alive = false; p.result = "dead"; p.locked = true;
  const CHAR_HOOKS = require("../characters/index"); // require ตอนเรียก — กัน require วน
  const combat = require("./combat");
  const { engine } = require("./engine");
  const owner = match.players[p.summon.ownerId];
  const hook = owner && CHAR_HOOKS[owner.characterId];
  if (hook && hook.onSummonDeath) combat.runHook(hook, "onSummonDeath", engine, owner, p);
  p.pos = null;
}
// ลบระเบียนที่ตายแล้ว (จบเทิร์น)
function sweep() {
  for (const p of Object.values(match.players)) if (p.summon && !p.alive && match.actorId !== p.id) delete match.players[p.id];
}
// ลบทั้งหมด (เปลี่ยนแผนที่ / กลับห้องรอ / เริ่มแมตช์ใหม่)
function removeAll() {
  for (const p of Object.values(match.players)) if (p.summon) delete match.players[p.id];
}
