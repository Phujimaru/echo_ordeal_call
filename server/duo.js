// ============================================================
//  ผู้เล่น 1 คนคุม 2 ตัว (ระบบคู่ — เคท & เอมิลิโกะ · ผู้ใช้ตัดสิน 2026-10-13)
//
//  ระเบียน: ผู้เล่นที่เลือกตัวละครที่มี `duo` ใน characters.js = "เจ้าของ" (ตัวแรก · ผูกกับ socket)
//   เริ่มแมตช์สร้าง "คู่" = ระเบียนผู้เล่นอีกตัวใน match.players (id `<เจ้าของ>~duo`) — มีตำแหน่ง/เลือด/เกราะ/สถานะ/โควตาสกิลของตัวเอง
//   เจ้าของ.duoWith = id คู่ · คู่.duoOf = id เจ้าของ
//  ใช้ร่วมกัน (คู่อ่าน/เขียนผ่าน getter/setter ไปที่เจ้าของ): แต้มสกิล · เหรียญ · กระเป๋า · ไพ่ (ลำดับเดินมาจากไพ่ของเจ้าของ)
//  คู่ไม่จั่วไพ่ (locked ตลอด) · ไม่อยู่ใน turnOrder · ไม่มี socket — ทุกคำสั่งตาเดินจาก socket ของเจ้าของไปที่ตัวที่คุมอยู่ (controlledId)
//  ฝ่ายเดียวกันเสมอ (combat.sameTeam / lobby.isAlly) · ตกรอบเมื่อตายทั้งคู่ — ตัวที่ตายทิ้งร่างไว้ (p.corpse) ขวางช่อง เดินข้ามได้
//
//  ตาเดิน (match.duo — phases/action.js เรียก):
//   ถึงคิวเจ้าของ → คุมตัวที่ยังขยับได้ (เจ้าของก่อน) · เวลา 1 นาทีรวมทั้งคู่ (duo.left = เวลาที่เหลือ ตอนตาถูกพัก)
//   สลับตัว (สกิลกระจกเงา — switchTo): เก็บสถานะตาของตัวเดิม (เดินแล้ว = ล็อกการเดิน) · ตัวที่ตี/รอแล้ว (done) สลับกลับไม่ได้
//   ตี/รอ = ตัวนั้นจบ → ยังมีอีกตัว = สลับไปให้เอง · ครบทั้งคู่/หมดเวลา = จบตาของผู้เล่น
// ============================================================
Object.assign(module.exports, {
  isPartner, isOwner, ownerOf, partnerOf, unitsOf, sideKey, sideAlive, inGame, cardUnit, cardHolders,
  sideCount, setup, teardown, controlledId, startTurn, switchTo, canSwitchTo, nextUnit, unitDone, otherUnit,
  moved, corpseKeys, corpseOf, corpseKept, keeperAlive, placeCorpses, saveCorpses, restoreCorpses, onDeath, clearSide,
});

const { CHAR_BY_ID } = require("../characters");
const Board = require("./board");
const match = require("./match");

const SUFFIX = "~duo";
// ฟิลด์ที่คู่ใช้ร่วมกับเจ้าของ (ทุกการอ่าน/เขียนบนระเบียนคู่ไปที่เจ้าของ)
const SHARED = ["skillPoints", "gold", "inventory", "cards", "gutsShotTurn"];
Object.assign(module.exports, { SUFFIX });

function isPartner(p) { return !!(p && p.duoOf); }
function isOwner(p) { return !!(p && p.duoWith); }
function ownerOf(p) { return p && p.duoOf ? match.players[p.duoOf] || p : p; }
function partnerOf(p) {
  if (!p) return null;
  if (p.duoWith) return match.players[p.duoWith] || null;
  if (p.duoOf) return match.players[p.duoOf] || null;
  return null;
}
// ทุกตัวของฝ่ายนี้ [เจ้าของ, คู่] (ตัวละครทั่วไป = [p])
function unitsOf(p) {
  const o = ownerOf(p);
  if (!o) return [];
  const mate = o.duoWith ? match.players[o.duoWith] : null;
  return mate ? [o, mate] : [o];
}
// คีย์ของฝ่าย (นับผู้รอด/จบเกม) = id เจ้าของ
function sideKey(p) { return p ? p.duoOf || p.id : null; }
function sideAlive(p) { return unitsOf(p).some((u) => u.alive); }
// ผู้เล่นคนนี้ยังอยู่ในเกม (จั่ว/เปิดไพ่/เข้าลำดับเดินได้) — เจ้าของที่ล้มแต่คู่ยังอยู่ = ยังอยู่
function inGame(p) { return !!p && !isPartner(p) && sideAlive(p); }
// ตัวที่รับผลของไพ่ที่ลงกับ "ผู้เล่น" (การ์ดราชินี ฯลฯ) — ตัวแรกที่ยังมีชีวิต
function cardUnit(p) { return unitsOf(p).find((u) => u.alive) || ownerOf(p); }
// ผู้ถือไพ่ทุกคนที่ยังอยู่ในเกม (ช่วงจั่ว/เปิดไพ่/ลำดับเดิน)
function cardHolders() { return Object.values(match.players).filter(inGame); }
// จำนวนฝ่ายที่ยังมีตัวรอด
function sideCount(list) {
  return new Set((list || Object.values(match.players).filter((p) => p.alive)).map(sideKey)).size;
}

// ---------- สร้าง/ลบคู่ ----------
function partnerCharOf(p) {
  const ch = p && CHAR_BY_ID[p.characterId];
  return ch && ch.duo ? CHAR_BY_ID[ch.duo] : null;
}
// เริ่มแมตช์: สร้างคู่ให้ทุกคนที่เลือกตัวละครแบบคู่ (ก่อน resetCombat — ค่าเริ่มต้นตั้งในนั้น)
function setup() {
  teardown();
  for (const o of Object.values(match.players)) {
    const ch = partnerCharOf(o);
    if (!ch) continue;
    const id = o.id + SUFFIX;
    const mate = {
      id, duoOf: o.id, connected: true, ready: true, socketId: null, sessionToken: null,
      teamId: o.teamId || null, teamConfirmed: true, modeVote: null,
      name: ch.name, customColor: o.customColor, position: o.position,
      characterId: ch.id, avatar: ch.avatar || 0, img: ch.img,
      locked: true, busted: false, result: null,
      hp: 0, armor: 0, alive: true, shield: 0, statuses: {}, statusAmt: {},
      seen: {}, transformAt: 0, cutsceneShown: {}, skillUsedRound: false,
      tempHp: 0, tempHpTurns: 0, sleepFresh: false, pos: null,
      dmgHp: 0, dmgArmor: 0, gainedSkill: 0, wasAttacked: false,
    };
    for (const k of SHARED) {
      Object.defineProperty(mate, k, {
        enumerable: true, configurable: true,
        get() { const own = match.players[mate.duoOf]; return own ? own[k] : undefined; },
        set(v) { const own = match.players[mate.duoOf]; if (own) own[k] = v; },
      });
    }
    o.duoWith = id;
    match.players[id] = mate;
  }
}
// กลับห้องรอ / เริ่มแมตช์ใหม่: ลบคู่ทั้งหมด
function teardown() {
  for (const p of Object.values(match.players)) {
    if (p.duoOf) delete match.players[p.id];
    else { delete p.duoWith; p.corpse = null; }
  }
  match.duo = null;
}

// ---------- ตาเดิน ----------
// ตัวที่ socket ของผู้เล่นคนนี้สั่งอยู่ตอนนี้ (ตาของฝ่ายนี้ = ตัวที่กำลังคุม · ไม่ใช่ = ตัวแรกที่ยังมีชีวิต)
function controlledId(playerId) {
  const d = match.duo;
  if (d && d.ownerId === playerId && match.actorId) return match.actorId;
  const p = match.players[playerId];
  if (!p || !p.duoWith) return playerId;
  return p.alive ? p.id : (cardUnit(p) || p).id;
}
function stuck(u) {
  return ((u.statuses.stun || 0) > 0) || ((u.statuses.sleep || 0) > 0 && !u.sleepFresh);
}
function freshAction(u) { return { from: { ...u.pos }, moved: false, locked: false }; }
// เริ่มตาของฝ่ายคู่: units = ตัวที่ยังอยู่บนกระดาน (ผ่านด่านสตั้นแล้ว — ตัวแรกได้คุมก่อน)
function startTurn(owner, units) {
  match.duo = { ownerId: owner.id, acts: {}, done: {} };
  for (const u of unitsOf(owner)) if (!units.includes(u)) match.duo.done[u.id] = true;
  const first = units[0];
  match.actorId = first.id;
  match.action = freshAction(first);
  return first;
}
function canSwitchTo(u) {
  const d = match.duo;
  return !!(d && u && u.id !== match.actorId && sideKey(u) === d.ownerId && !d.done[u.id] && u.alive && u.pos && !stuck(u));
}
function otherUnit(p) { return unitsOf(p).find((u) => u.id !== p.id) || null; }
// สลับไปคุมตัว u (สกิลกระจกเงา) — เก็บสถานะตาของตัวเดิมไว้ · ตัวเดิมเดินแล้ว = กลับมาเดินต่อจากช่องที่ยืนด้วยระยะที่เหลือ (action.rebaseMove)
function switchTo(u) {
  const d = match.duo;
  if (!canSwitchTo(u)) return false;
  const cur = match.action;
  if (cur && match.actorId) {
    if (cur.moved) require("./phases/action").rebaseMove(match.players[match.actorId]); // require ตอนเรียก — กัน require วน
    d.acts[match.actorId] = cur;
  }
  match.actorId = u.id;
  match.action = d.acts[u.id] || freshAction(u);
  delete d.acts[u.id];
  return true;
}
// ตัวของฝ่ายนี้ถูกย้ายโดยสกิล (แส้/ปีกของเคท) ระหว่างตาเดิน — ตาที่เก็บไว้ (ยังไม่เดิน) เริ่มเดินจากช่องใหม่
function moved(u) {
  const d = match.duo;
  const a = d && d.acts[u.id];
  if (a && !a.moved && u.pos) a.from = { ...u.pos };
}
// ตัวที่กำลังคุมจบแล้ว (ตี/รอ)
function unitDone(p) {
  if (match.duo && p) match.duo.done[p.id] = true;
}
// ตัวถัดไปของฝ่ายนี้ที่ยังคุมได้ (ไม่มี = null)
function nextUnit() {
  const d = match.duo;
  if (!d) return null;
  const owner = match.players[d.ownerId];
  return unitsOf(owner).find((u) => !d.done[u.id] && u.id !== match.actorId && u.alive && u.pos && !stuck(u)) || null;
}

// ---------- ร่าง (ตัวที่ล้มขณะอีกตัวยังอยู่) ----------
//  ยังขวางช่อง (เดินผ่าน/ข้ามได้ หยุดทับไม่ได้ · ผลัก/ไถลชน) · ตกรอบทั้งฝ่าย = ร่างหาย
//  ศพค้าง (ฮุค keepsCorpses(p) — ยูนะ: เสียงอันไพเราะ): ระหว่างที่มีคนเก็บร่างยังอยู่ ทุกคนที่ตายทิ้งร่างไว้ (ตัวละครทั่วไปด้วย)
//   คนเก็บร่างคนสุดท้ายตาย = ร่างของคนอื่นหายหมด (ระบบคู่ที่อีกตัวยังรอดยังทิ้งร่างตามปกติ)
function corpseOf(p) { return p && !p.alive && p.corpse ? p.corpse : null; }
// มีคนเก็บร่าง (ฮุค keepsCorpses) ที่ยังอยู่ไหม — require ตอนเรียก (characters/index ← โมดูลตัวละคร ← server/duo วนกัน)
function keeperAlive() {
  const HOOKS = require("../characters/index");
  return Object.values(match.players).some((u) => u.alive && HOOKS[u.characterId] && HOOKS[u.characterId].keepsCorpses && HOOKS[u.characterId].keepsCorpses(u));
}
const isPair = (p) => !!(p && (p.duoWith || p.duoOf));
// ร่างนี้ยังอยู่บนกระดานไหม
function corpseKept(p) {
  if (!corpseOf(p)) return false;
  return (isPair(p) && sideAlive(p)) || keeperAlive();
}
function corpseKeys() {
  const out = [];
  for (const p of Object.values(match.players)) {
    if (!corpseKept(p)) continue;
    out.push(Board.key(p.corpse.x, p.corpse.y));
  }
  return out;
}
// ล้มแล้ว: จำช่องไว้เป็นร่าง (ระบบคู่ที่อีกตัวรอด / มีคนเก็บร่าง) · ฝ่ายหมดแล้ว = ตกรอบ (ร่างหายถ้าไม่มีคนเก็บร่าง)
//  คนเก็บร่างคนสุดท้ายตาย = ร่างของทุกคนที่ไม่ใช่ระบบคู่ที่ยังรอดหาย
function onDeath(p) {
  if (!p) return;
  const keep = keeperAlive();
  if (p.pos && (keep || (isPair(p) && sideAlive(p)))) p.corpse = { ...p.pos };
  if (isPair(p) && !sideAlive(p)) clearSide(p);
  if (!keep) for (const u of Object.values(match.players)) if (!u.alive && u.corpse && !(isPair(u) && sideAlive(u))) u.corpse = null;
}
// ฝ่ายนี้ตกรอบ (ตายทั้งคู่): ร่างหาย (ยกเว้นมีคนเก็บร่าง) · เจ้าของเป็น "ตกรอบ" (ระหว่างที่คู่ยังอยู่ เจ้าของที่ล้มยังไม่ตกรอบ)
function clearSide(p) {
  const keep = keeperAlive();
  for (const u of unitsOf(p)) { if (!keep) u.corpse = null; u.result = "dead"; u.locked = true; }
}
// เปลี่ยนภูมิภาค/เริ่มเกม (phases/action.js placeOnBoard): คู่และร่างลงช่องติดตัวที่ได้จุดเกิด
//  free(x, y) = ช่องว่างให้ยืน · คืน true ถ้าวางได้
//  keep = ร่างที่มีช่องอยู่แล้วไม่ย้าย (วางเฉพาะร่างที่ยังไม่มีช่อง — restoreCorpses)
//  ศพค้าง (ไม่ใช่ระบบคู่ที่อีกตัวรอด): ลงช่องเดิมบนแผนที่ใหม่ถ้าว่าง ไม่งั้นช่องว่างที่ใกล้สุด
function placeCorpses(free, keep = false) {
  const keeper = keeperAlive();
  for (const p of Object.values(match.players)) {
    if (p.alive) continue;
    if (!(isPair(p) && sideAlive(p))) {
      if (!keeper || !p.corpse) { p.corpse = null; continue; }
      if (keep) continue;
      const old = p.corpse;
      p.corpse = null; // ไม่นับร่างตัวเองตอนหาที่
      p.corpse = free(old.x, old.y) ? { ...old } : nearFree(old, free);
      continue;
    }
    if (keep && p.corpse) continue;
    const mate = otherUnit(p);
    p.corpse = mate && mate.pos ? nearFree(mate.pos, free) : null;
  }
}
// ห่วงเวลาซีโร่ (server/zeroTime.js): จำช่องร่างก่อนเข้าสนามเฉพาะ → { id: { x, y } }
function saveCorpses() {
  const out = {};
  for (const p of Object.values(match.players)) if (!p.alive && p.corpse) out[p.id] = { ...p.corpse };
  return out;
}
// ปลดผนึก (กลับแผนที่เดิม): ร่างกลับช่องที่จำไว้ · ร่างที่ล้มในสนามเฉพาะ (ไม่มีช่องเดิม) = ไม่มีช่องไว้ก่อน
//  ผู้เรียกวางคนที่ยังอยู่เสร็จแล้วค่อย placeCorpses(free, true) ให้ร่างที่เหลือลงข้างอีกตัว
function restoreCorpses(saved) {
  for (const p of Object.values(match.players)) {
    if (p.alive || (!isPair(p) && !keeperAlive())) continue;
    p.corpse = saved && saved[p.id] && (sideAlive(p) || keeperAlive()) ? { ...saved[p.id] } : null;
  }
}
// ช่องว่างใกล้ pos ที่สุด (ไล่วงรอบตัวออกไป)
function nearFree(pos, free) {
  for (let r = 1; r <= 6; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) + Math.abs(dy) !== r) continue;
        if (free(pos.x + dx, pos.y + dy)) return { x: pos.x + dx, y: pos.y + dy };
      }
    }
  }
  return null;
}
