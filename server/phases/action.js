// เฟสกระดาน (ระบบใหม่แบบ Fire Emblem — GRID_PLAN.md §4): ลำดับเดิน → ตาเดินของแต่ละคน
//  ORDER  = เปิดแต้มแล้วเรียงลำดับเดิน (แบนเนอร์ "ลำดับเดิน")
//  ACTION = ตาของ match.actorId: เดิน 1 ครั้ง (ย้อนได้) · สกิล/ไอเทม/ซื้อของ (ทำแล้วเดินไม่ได้อีก) · โจมตี/รอ = จบตา
//  ATTACKING = ฉากตี/ตีสวน/ถอย ของคนที่กำลังเดินอยู่ (จบฉากแล้วไปคนถัดไป)
//  กติกากระดานล้วน (เดิน/ระยะ/สวน/ถอย) อยู่ใน server/board.js — ไฟล์นี้แค่ต่อเข้ากับ match
// export ก่อน require: ไฟล์ใน server/ require วนกันเอง — function declaration ถูก hoist จึงพร้อมใช้ตั้งแต่บรรทัดแรก
Object.assign(module.exports, {
  placeOnBoard, boardMap, boardUnits, boardBlocked, movOf, baseMovOf, rangeOf, turnOrderOf,
  beginOrder, nextActor, canAct, lockMove, moveTo, undoMove, attackTarget, waitAction, finishActor,
  removeFromOrder, hasActed, areaRange, resolveArea,
});

const { CHAR_BY_ID } = require("../../characters");
const { ACTION_TIME, ORDER_TIME, GOLD_FIRST_BONUS, DEFAULT_MOV, DEFAULT_RANGE } = require("../constants");
const Board = require("../board");
const match = require("../match");
const combat = require("../combat");
const cardDeck = require("../deck");
const attack = require("./attack");
const endTurnPhase = require("./endTurn");
const lobby = require("../lobby");
const shop = require("../shop");
const timers = require("../timers");
const view = require("../view");

// ---------- ตำแหน่งบนกระดาน ----------
function boardMap() {
  return Board.mapOf(match.board ? match.board.area : 1);
}
// ผู้เล่นที่ยังอยู่และยืนบนกระดาน ในรูปที่ board.js ใช้ ({ id, x, y, alive, teamId })
function boardUnits() {
  return combat.alivePlayers()
    .filter((p) => p.pos)
    .map((p) => ({ id: p.id, x: p.pos.x, y: p.pos.y, alive: true, teamId: p.teamId || null }));
}
// ช่องที่ยืน/เดินผ่าน/ถอยเข้าไม่ได้นอกจากสิ่งกีดขวางของแผนที่: แผงร้านค้ามายา (GRID_PLAN §8.1)
function boardBlocked() {
  return match.shopPos ? new Set([Board.key(match.shopPos.x, match.shopPos.y)]) : null;
}
// พวกเดียวกัน (โหมดทีม) — เดินผ่านกันได้ ตีกันไม่ได้
function unitAlly(a, b) {
  return combat.sameTeam(match.players[a.id], match.players[b.id]);
}
// ระยะเดินปกติสูงสุด (ก่อนหักโทษ) — บัฟของโอเบรอนใช้ค่านี้เป็นระยะส่ง (GRID_PLAN §5)
function baseMovOf(p) {
  const ch = CHAR_BY_ID[p.characterId];
  return ch && Number.isFinite(ch.mov) ? ch.mov : DEFAULT_MOV;
}
// ระยะเดินเทิร์นนี้: ไพ่แตก −1
function movOf(p) {
  return Math.max(0, baseMovOf(p) - (cardDeck.bustedOf(p) ? 1 : 0));
}
// ระยะโจมตีปกติ [rmin, rmax]
function rangeOf(p) {
  const ch = CHAR_BY_ID[p.characterId];
  return ch && Array.isArray(ch.range) ? ch.range : DEFAULT_RANGE;
}
// เริ่มเกม/เปลี่ยนภูมิภาค: ตั้งแผนที่แล้วแจกจุดเกิดให้ทุกคนที่ยังอยู่ (คนตกรอบไม่มีที่ยืน)
//  ร้านค้าถูกยกออก — ต้นเทิร์นถัดไป (dealRound) สุ่มจุดใหม่บนแผนที่นี้พร้อมของใหม่ (GRID_PLAN §3)
function placeOnBoard(area) {
  match.board = { area };
  match.shopPos = null;
  const map = boardMap();
  const alive = combat.alivePlayers();
  const spawns = Board.assignSpawns(map, alive.map((p) => ({ id: p.id, teamId: p.teamId || null })), { teamMode: lobby.teamModeActive() });
  for (const p of Object.values(match.players)) p.pos = p.alive && spawns[p.id] ? { ...spawns[p.id] } : null;
}

// ระยะของสกิล (area.range) — "mov" = ระยะเดินปกติสูงสุดของผู้ใช้ (บัฟของโอเบรอน — ผู้ใช้ตัดสิน)
function areaRange(p, area) {
  if (!area) return 0;
  return area.range === "mov" ? baseMovOf(p) : (Number(area.range) || 0);
}
// ตรวจระยะสกิลบนกระดาน แล้วคืนรายชื่อผู้โดน (playerId[]) ที่ส่งต่อให้ hook ของตัวละคร — null = ใช้ไม่ได้
//  self: ไม่สนเป้า · target: เป้า 1 คนในระยะ (self = เลือกตัวเองได้) · aoe: ทุกคนในรัศมี (self = รวมตัวเอง)
//  line: เลือกทิศ (dir) — ทุกคนในแนว len×width · การคัดเพื่อน/ศัตรูเป็นหน้าที่ของ hook (บางท่าใช้กับศัตรูได้)
function resolveArea(p, area, targets, dir) {
  const kind = (area && area.kind) || "self";
  if (kind === "self" || kind === "field") return Array.isArray(targets) ? targets : [];
  if (!p.pos) return null;
  const range = areaRange(p, area);
  if (kind === "target") {
    const t = match.players[Array.isArray(targets) ? targets[0] : null];
    if (!t || !t.alive || !t.pos) return null;
    if (t.id === p.id) return area.self ? [t.id] : null;
    return Board.dist(p.pos, t.pos) <= range ? [t.id] : null;
  }
  const units = boardUnits();
  if (kind === "aoe") {
    const ids = Board.unitsOnTiles(units, Board.aoeTiles(boardMap(), p.pos.x, p.pos.y, range)).map((u) => u.id);
    return area.self ? [p.id, ...ids] : ids;
  }
  if (kind === "line") {
    if (!Board.LINE_DIRS[dir]) return null;
    const tiles = Board.lineTiles(boardMap(), p.pos.x, p.pos.y, dir, area.len || 1, area.width || 1);
    return Board.unitsOnTiles(units, tiles).map((u) => u.id).filter((id) => id !== p.id);
  }
  return null;
}

// ---------- ลำดับเดิน ----------
// แต้มมากเดินก่อน · เท่ากันสุ่ม · ไพ่แตกไปท้ายแถว (หลายคนสุ่มกันเอง)
function turnOrderOf(players, rng = Math.random) {
  const rows = players.map((p) => ({ p, bust: cardDeck.bustedOf(p), score: cardDeck.scoreOf(p), r: rng() }));
  rows.sort((a, b) => (a.bust - b.bust) || (a.bust ? 0 : b.score - a.score) || (a.r - b.r));
  return rows.map((row) => row.p.id);
}
function beginOrder() {
  timers.clearPhaseTimer();
  const alive = combat.alivePlayers().filter((p) => p.pos);
  match.turnOrder = turnOrderOf(alive);
  match.actorIndex = -1;
  match.actorId = null;
  match.action = null;
  // เหรียญ: ทุกคน +1 ตอนจบเทิร์น (endTurn) · คนเดินลำดับแรกได้เพิ่มอีก (รวม 2)
  const first = match.players[match.turnOrder[0]];
  if (first) {
    shop.addGold(first, GOLD_FIRST_BONUS);
    match.lastLog.push(`🥇 ${first.name} ได้เดินลำดับแรก — เหรียญ +${GOLD_FIRST_BONUS}`);
  }
  match.gameState = "ORDER";
  timers.startPhaseTimer(ORDER_TIME, nextActor);
  view.broadcastState();
}
// ไปคนถัดไปในลำดับ · หมดแถว = จบเทิร์น
function nextActor() {
  timers.clearPhaseTimer();
  for (;;) {
    match.actorIndex++;
    const id = match.turnOrder[match.actorIndex];
    if (id === undefined) {
      match.actorId = null;
      match.action = null;
      endTurnPhase.endTurn();
      return;
    }
    const p = match.players[id];
    if (!p || !p.alive || !p.pos) continue;
    // สตั้น / หลับไหล: ข้ามทั้งตา (เดินก็ไม่ได้) · เทิร์นที่เพิ่งโดนกล่อม (sleepFresh) ยังขยับได้
    if ((p.statuses.stun || 0) > 0 || ((p.statuses.sleep || 0) > 0 && !p.sleepFresh)) {
      match.lastLog.push(`😵 ${p.name} ขยับไม่ได้ — ข้ามตาเดิน`);
      continue;
    }
    match.actorId = id;
    match.action = { from: { ...p.pos }, moved: false, locked: false };
    match.gameState = "ACTION";
    timers.startPhaseTimer(ACTION_TIME, finishActor);
    view.broadcastState();
    return;
  }
}
// ผู้เล่นออกจากเกมกลางเทิร์น: ถ้าเป็นคนที่กำลังเดิน ข้ามไปคนถัดไปเลย
//  (กำลังเล่นฉากตีอยู่ = ปล่อยให้ตัวจับเวลาของฉากพาไปคนถัดไปเอง ไม่งั้นข้ามสองคน)
function removeFromOrder(playerId) {
  if (match.actorId === playerId && match.gameState === "ACTION") nextActor();
}

// เดินไปแล้วในเทิร์นนี้ไหม (ตาของคนนี้ผ่านไปแล้ว — ไม่นับคนที่กำลังเดินอยู่)
function hasActed(id) {
  const idx = match.turnOrder.indexOf(id);
  if (idx < 0) return false;
  if (idx === match.actorIndex && match.actorId === id) return false;
  return idx <= match.actorIndex;
}

// ---------- ตาเดิน ----------
// เป็นตาของคนนี้และกดอะไรได้อยู่ไหม (ระหว่างฉากตี/คัตซีน = ไม่ได้)
function canAct(p) {
  return !!p && p.alive && match.gameState === "ACTION" && match.actorId === p.id && !!match.action;
}
// ใช้สกิล/ไอเทม/ซื้อของแล้ว เดินไม่ได้อีก (ยังโจมตีปกติได้) — GRID_PLAN §4 กฎพื้นฐาน
function lockMove(p) {
  if (canAct(p)) match.action.locked = true;
}
function moveTo(id, x, y) {
  const p = match.players[id];
  if (!canAct(p) || match.action.moved || match.action.locked) return false;
  if (!Number.isInteger(x) || !Number.isInteger(y)) return false;
  const reach = Board.reachable(boardMap(), { id: p.id, ...p.pos }, movOf(p), boardUnits(), { isAlly: unitAlly, blocked: boardBlocked() });
  const node = reach.get(Board.key(x, y));
  if (!node || node.d === 0) return false;
  match.action.path = Board.pathTo(reach, x, y);
  p.pos = { x, y };
  match.action.moved = true;
  view.broadcastState();
  return true;
}
// ย้อนกลับช่องเดิม — ได้จนกว่าจะใช้สกิล/ไอเทม/ซื้อของ/โจมตี
function undoMove(id) {
  const p = match.players[id];
  if (!canAct(p) || !match.action.moved || match.action.locked) return false;
  p.pos = { ...match.action.from };
  match.action.moved = false;
  match.action.path = null;
  view.broadcastState();
  return true;
}
// โจมตีปกติ: เป้าต้องอยู่ในระยะจากช่องที่ยืน · ตีแล้วจบตา (หลังฉากตี/สวน/ถอย)
function attackTarget(id, targetId) {
  const p = match.players[id];
  const target = match.players[targetId];
  if (!canAct(p) || !target || !target.alive || !target.pos || target.id === p.id) return false;
  if (combat.sameTeam(p, target)) return false;
  if (!Board.inRange(rangeOf(p), Board.dist(p.pos, target.pos))) return false;
  timers.clearPhaseTimer();
  match.action.locked = true;
  attack.boardAttack(p, target, finishActor);
  return true;
}
// "รอ" = จบตาโดยไม่โจมตี
function waitAction(id) {
  const p = match.players[id];
  if (!canAct(p)) return false;
  finishActor();
  return true;
}
// จบตาของคนที่กำลังเดิน: ผลของช่อง (จุดฟื้นฟู) แล้วไปคนถัดไป
function finishActor() {
  timers.clearPhaseTimer();
  const p = match.players[match.actorId];
  if (p && p.alive && p.pos && Board.isHeal(boardMap(), p.pos.x, p.pos.y) && combat.healHp(p, 1) > 0) {
    match.lastLog.push(`✨ ${p.name} ยืนบนวงเวทฟื้นฟู — ฟื้นพลังชีวิต +1`);
  }
  match.action = null;
  nextActor();
}
