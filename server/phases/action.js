// เฟสกระดาน (ระบบใหม่แบบ Fire Emblem — GRID_PLAN.md §4): ลำดับเดิน → ตาเดินของแต่ละคน
//  ORDER  = เปิดแต้มแล้วเรียงลำดับเดิน (แบนเนอร์ "ลำดับเดิน")
//  ACTION = ตาของ match.actorId: เดิน 1 ครั้ง (ย้อนได้) · สกิล/ไอเทม/ซื้อของ (ทำแล้วเดินไม่ได้อีก) · โจมตี/รอ = จบตา
//  ATTACKING = ฉากตี/ตีสวน/ถอย ของคนที่กำลังเดินอยู่ (จบฉากแล้วไปคนถัดไป)
//  กติกากระดานล้วน (เดิน/ระยะ/สวน/ถอย) อยู่ใน server/board.js — ไฟล์นี้แค่ต่อเข้ากับ match
// export ก่อน require: ไฟล์ใน server/ require วนกันเอง — function declaration ถูก hoist จึงพร้อมใช้ตั้งแต่บรรทัดแรก
Object.assign(module.exports, {
  placeOnBoard, boardMap, boardUnits, boardBlocked, movOf, baseMovOf, rangeOf, turnOrderOf,
  beginOrder, nextActor, canAct, lockMove, moveTo, undoMove, attackTarget, waitAction, finishActor,
  removeFromOrder, hasActed, areaRange, resolveArea, counters, tileEndEffect,
});

const { CHAR_BY_ID } = require("../../characters");
const Status = require("../../characters/_universal_status");
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
const Visibility = require("../visibility");

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
// ตีสวนได้ไหม (ผู้ใช้ตัดสิน 2026-10-09: เลิกตีสวนแบบ FE แล้ว — เก็บกลไกไว้ให้ตัวละคร "สะท้อน" ในอนาคต)
//  เปิดด้วยข้อมูลตัวละคร `counter: true` ใน characters.js หรือ p.counterBack (สถานะ/เทสต์)
function counters(p) {
  if (!p) return false;
  if (p.counterBack === true) return true;
  const ch = CHAR_BY_ID[p.characterId];
  return !!(ch && ch.counter);
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
//  การมองเห็น (server/visibility.js): เล็งคนที่มองไม่เห็นไม่ได้ · พื้นที่ที่ไม่ใช่สกิลโจมตี (ไม่มี area.hostile) ไม่โดนคนที่มองไม่เห็น
function resolveArea(p, area, targets, dir) {
  const kind = (area && area.kind) || "self";
  if (kind === "self" || kind === "field") return Array.isArray(targets) ? targets : [];
  if (!p.pos) return null;
  const range = areaRange(p, area);
  if (kind === "target") {
    const t = match.players[Array.isArray(targets) ? targets[0] : null];
    if (!t || !t.alive || !t.pos) return null;
    if (t.id === p.id) return area.self ? [t.id] : null;
    if (Visibility.hiddenFrom(p, t)) return null;
    return Board.dist(p.pos, t.pos) <= range ? [t.id] : null;
  }
  const units = area.hostile ? boardUnits() : boardUnits().filter((u) => !Visibility.hiddenFrom(p, match.players[u.id]));
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
// เวลาต่อตาเดิน — เครื่องมือ dev: ECHO_DEV_ACTION_TIME=300 ยืดเวลาไว้ทดสอบ (ไม่ตั้ง = ACTION_TIME)
function actionSeconds() {
  const n = Math.floor(Number(process.env.ECHO_DEV_ACTION_TIME));
  return Number.isFinite(n) && n > 0 ? n : ACTION_TIME;
}
// ไปคนถัดไปในลำดับ · หมดแถว = จบเทิร์น
function nextActor() {
  timers.clearPhaseTimer();
  // ศัตรูคนสุดท้ายตายกลางเทิร์น = จบเกมทันที ไม่ต้องรอคนที่เหลือเดิน (ผู้ใช้ตัดสิน 2026-10-09)
  if (endTurnPhase.gameOver()) return;
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
    timers.startPhaseTimer(actionSeconds(), finishActor);
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
//  step = เดินทีละช่องด้วยคีย์บอร์ด (W A S D): ไปช่องติดกันได้เรื่อยๆ ตราบที่ช่องนั้นอยู่ในระยะเดินจาก "จุดเริ่มตา" (action.from)
//   — เหมือนลากเคอร์เซอร์แบบ Fire Emblem แต่ตัวละครเดินตามทันที · กลับมาจุดเริ่ม = เท่ากับย้อน · ยังใช้ได้จนกว่าจะล็อก (ใช้สกิล/ไอเทม/ซื้อ/ตี)
function moveTo(id, x, y, { step = false } = {}) {
  const p = match.players[id];
  if (!canAct(p) || match.action.locked) return false;
  if (match.action.moved && !step) return false;
  if (!Number.isInteger(x) || !Number.isInteger(y)) return false;
  if (step && Board.dist(p.pos, { x, y }) !== 1) return false;
  const origin = match.action.from;
  // คิดเส้นทางจากเท่าที่ผู้เดินมองเห็น — คนที่มองไม่เห็น (ล่องหน/พุ่มหญ้า) ไม่ขวางตอนวางเส้นทาง แต่ชนจริงตอนเดิน (ด้านล่าง)
  const all = boardUnits();
  const seen = all.filter((u) => !Visibility.hiddenFrom(p, match.players[u.id]));
  const reach = Board.reachable(boardMap(), { id: p.id, ...origin }, movOf(p), seen, { isAlly: unitAlly, blocked: boardBlocked() });
  const node = reach.get(Board.key(x, y));
  if (!node) return false;
  if (node.d === 0) {
    if (!step || !match.action.moved) return false;
    return undoMove(id);
  }
  const prev = { ...p.pos };
  const path = step ? [prev, { x, y }] : Board.pathTo(reach, x, y);
  // ซุ่มโจมตีแบบ Fire Emblem: เดินชนคนที่มองไม่เห็น = หยุดช่องก่อนหน้า (ถอยไปช่องว่างช่องล่าสุดถ้าช่องนั้นมีเพื่อนยืน)
  //  การเดินของตานี้จบทันที (ย้อน/เดินต่อไม่ได้) แต่ยังโจมตี/ใช้สกิลได้ · คนล่องหนที่ถูกชนปรากฏตัว (Visibility.onBump)
  const bumpIdx = path.findIndex((t, i) => i > 0 && all.some((u) => u.id !== p.id && u.x === t.x && u.y === t.y && !seen.includes(u)));
  if (bumpIdx > 0) {
    const hidden = all.find((u) => u.x === path[bumpIdx].x && u.y === path[bumpIdx].y);
    let stop = bumpIdx - 1;
    while (stop > 0 && all.some((u) => u.id !== p.id && u.x === path[stop].x && u.y === path[stop].y)) stop--;
    const walked = path.slice(0, stop + 1);
    p.pos = { ...walked[walked.length - 1] };
    match.action.path = walked.length > 1 ? walked : null;
    match.action.moved = match.action.moved || walked.length > 1;
    match.action.locked = true;
    match.action.ambush = { x: path[bumpIdx].x, y: path[bumpIdx].y };
    Visibility.onBump(p, match.players[hidden.id]);
    view.broadcastState();
    return true;
  }
  match.action.path = path;
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
  if (Visibility.hiddenFrom(p, target)) return false; // มองไม่เห็น = ตีไม่ได้
  if (!Board.inRange(rangeOf(p), Board.dist(p.pos, target.pos))) return false;
  timers.clearPhaseTimer();
  match.action.locked = true;
  Visibility.onHostileAct(p); // ตีจากในพุ่ม = โผล่จนจบเทิร์น · นักบินปริศนาปรากฏตัว
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
// จบตาของคนที่กำลังเดิน: ผลของช่อง (จุดฟื้นฟู / ช่องพิเศษ) แล้วไปคนถัดไป
function finishActor() {
  timers.clearPhaseTimer();
  const p = match.players[match.actorId];
  const map = boardMap();
  if (p && p.alive && p.pos && Board.isHeal(map, p.pos.x, p.pos.y) && combat.healHp(p, 1) > 0) {
    const heal = Board.TERRAIN_INFO[map.healKind || "heal"];
    match.lastLog.push(`${heal.icon} ${p.name} ยืนบน${heal.name} — ฟื้นพลังชีวิต +1`);
  }
  if (p && p.alive && p.pos) tileEndEffect(p);
  match.action = null;
  nextActor();
}
// ผลของช่องพิเศษตอนจบตาบนช่องนั้น (GRID_PLAN §3.1) — กติกาอยู่ที่ Board.endTurnTile · ที่นี่แค่ลงผลกับผู้เล่น
//  หนามพิษ = ติดพิษร้าย · ลาวา = เสีย 1 (ลดเกราะก่อน) · น้ำวน = โดนดัน 1 ช่องตามกระแส (ผลของช่องใหม่ไม่ทำงานซ้ำในตานี้)
function tileEndEffect(p) {
  const fx = Board.endTurnTile(boardMap(), p.pos.x, p.pos.y, boardUnits(), { selfId: p.id, blocked: boardBlocked() });
  if (!fx) return null;
  const info = Board.TERRAIN_INFO[fx.kind];
  if (fx.kind === "thorns") {
    // ติดตอนจบตา → endTurn ของเทิร์นนี้ลดเทิร์นสถานะไป 1 ทันที จึงตั้งเผื่อ +1
    //  = พิษมีผลเต็มๆ 1 เทิร์นถัดไป (ต้นเทิร์นเสีย 1 · พลังโจมตี −1 ตลอดเทิร์นนั้น)
    if (Status.applyPoison(p, fx.turns + 1)) match.lastLog.push(`${info.icon} ${p.name} จบตาบน${info.name} — ติดพิษร้าย ${fx.turns} เทิร์น`);
    else match.lastLog.push(`${info.icon} ${p.name} จบตาบน${info.name} — แต่ต้านสถานะผิดปกติไว้ได้`);
  } else if (fx.kind === "lava") {
    combat.dealMixed(p, fx.dmg, true);
    match.lastLog.push(`${info.icon} ${p.name} จบตาบน${info.name} — เสียหาย -${fx.dmg} (ลดเกราะก่อน)`);
    if (p.alive && p.hp <= 0) {
      combat.instantDeath(p);
      if (!p.alive) match.lastLog.push(`💀 ${p.name} เลือดจริงหมด ตกรอบ!`);
    }
    if (!p.alive) p.pos = null; // คนตกรอบหายจากกระดาน
  } else if (fx.kind === "whirl") {
    if (fx.to) {
      p.pos = { x: fx.to.x, y: fx.to.y };
      match.lastLog.push(`${info.icon} ${p.name} โดน${info.name}ดันไป 1 ช่อง`);
    } else {
      match.lastLog.push(`${info.icon} ${p.name} อยู่ใน${info.name} แต่ช่องข้างหน้าไม่ว่าง — ไม่ขยับ`);
    }
  }
  return fx;
}
