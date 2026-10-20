// เฟสกระดาน (ระบบใหม่แบบ Fire Emblem — GRID_PLAN.md §4): ลำดับเดิน → ตาเดินของแต่ละคน
//  ORDER  = เปิดแต้มแล้วเรียงลำดับเดิน (แบนเนอร์ "ลำดับเดิน")
//  ACTION = ตาของ match.actorId: เดิน 1 ครั้ง (ย้อนได้) · สกิล/ไอเทม/ซื้อของ (ทำแล้วเดินไม่ได้อีก) · โจมตี/รอ = จบตา
//  ATTACKING = ฉากตี/ตีสวน/ถอย ของคนที่กำลังเดินอยู่ (จบฉากแล้วไปคนถัดไป)
//  กติกากระดานล้วน (เดิน/ระยะ/สวน/ถอย) อยู่ใน server/board.js — ไฟล์นี้แค่ต่อเข้ากับ match
// export ก่อน require: ไฟล์ใน server/ require วนกันเอง — function declaration ถูก hoist จึงพร้อมใช้ตั้งแต่บรรทัดแรก
Object.assign(module.exports, {
  placeOnBoard, boardMap, boardUnits, boardBlocked, movOf, baseMovOf, rangeOf, turnOrderOf,
  beginOrder, nextActor, canAct, lockMove, lockStrike, rebaseMove, moveTo, undoMove, attackTarget, waitAction, finishActor,
  removeFromOrder, joinOrder, hasActed, areaRange, resolveArea, areaTiles, tileArea, counters, tileEndEffect,
  sizeOf, boxOf, resizeUnit, breakObstacles, smashes, tileFree, chargeTiles, lanes, canStrike, laneVictims,
  actionTimeUp, hopTiles, stuck, nearFreeTile, resumeAction, runExtras, resumeFrom,
  walkUndoPatch, startMap, boxChebyshev,
});

const { CHAR_BY_ID } = require("../../characters");
const CHAR_HOOKS = require("../../characters/index");
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
const { engine } = require("../engine");
const Zero = require("../zeroTime");
const Ice = require("../ice");
const Duo = require("../duo");
const Soot = require("../soot");
const Ride = require("../ride");
const Voice = require("../voice");
const TimeStop = require("../timeStop");
const Dim = require("../dimension");
const Summon = require("../summon");

// ---------- ตำแหน่งบนกระดาน ----------
//  สิ่งกีดขวางที่ถูกพังในภูมิภาคนี้ (Echo ตัวใหญ่เดินพัง) = match.board.broken ["x,y"…] — เปลี่ยนภูมิภาคแล้วกลับมาครบ
//  แผนที่ที่ใช้จริง = แผนที่ภูมิภาคหักช่องที่พังออก + ชั้นน้ำแข็ง/หนามที่สร้างระหว่างเกม (server/ice.js)
//  แคชตาม brokenVer + iceVer · client ได้ terrain/special ชุดนี้ไปวาด
function boardMap() {
  const b = match.board;
  const base = Board.mapOf(b ? b.area : 1);
  if (!(b && b.broken && b.broken.length) && !Ice.hasOverlay(b)) return base;
  const ver = `${b.brokenVer || 0}|${b.iceVer || 0}`;
  if (b.mapCache && b.mapCache.ver === ver && b.mapCache.base === base) return b.mapCache.map;
  const map = layeredMap(b, base);
  b.mapCache = { ver, base, map };
  return map;
}
// แผนที่ภูมิภาค base + ช่องที่พัง + ชั้นน้ำแข็ง/หนามของ b (ไม่แคช)
function layeredMap(b, base) {
  let terrain = { ...base.terrain }, special = base.special;
  if (b.broken && b.broken.length) for (const k of b.broken) delete terrain[k];
  if (Ice.hasOverlay(b)) ({ terrain, special } = Ice.overlayOf(b, terrain, special));
  return { ...base, terrain, special };
}
// พังสิ่งกีดขวางชุดนี้ (ช่องที่ไม่มีของข้าม) → คืนรายการ { x, y, kind } ที่พังจริง
function breakObstacles(keys) {
  if (!match.board || !keys || !keys.length) return [];
  const map = boardMap();
  const out = [];
  for (const k of keys) {
    const kind = map.terrain[k];
    if (!kind || Board.UNBREAKABLE.has(kind)) continue; // ผนึกมิโกะ (ห่วงเวลาซีโร่) พังด้วยการเดิน/ขยายร่างไม่ได้
    if (Ice.isSpikeKind(kind)) {
      // หนามน้ำแข็ง (Ice Spike): พังแล้วหายจากชั้นหนาม (เก็บไว้คืนตอนกดย้อนการเดิน)
      (match.board.smashedSpikes ||= {})[k] = Ice.removeSpike(k);
      const [x, y] = k.split(",").map(Number);
      out.push({ x, y, kind });
      continue;
    }
    (match.board.broken ||= []).push(k);
    const [x, y] = k.split(",").map(Number);
    out.push({ x, y, kind });
  }
  if (out.length) match.board.brokenVer = (match.board.brokenVer || 0) + 1;
  return out;
}
function restoreObstacles(keys) {
  if (!match.board || !keys || !keys.length) return;
  for (const k of keys) {
    const sp = match.board.smashedSpikes && match.board.smashedSpikes[k];
    if (sp) { Ice.restoreSpike(k, sp); delete match.board.smashedSpikes[k]; }
  }
  if (!match.board.broken) return;
  const drop = new Set(keys);
  match.board.broken = match.board.broken.filter((k) => !drop.has(k));
  match.board.brokenVer = (match.board.brokenVer || 0) + 1;
}
// ขนาดตัวบนกระดาน (ด้านละกี่ช่อง) — ตัวละครทั่วไป 1 · Echo ขยายร่างตั้ง p.boardSize ผ่าน resizeUnit
function sizeOf(p) {
  return Math.max(1, (p && p.boardSize) | 0);
}
function boxOf(p) {
  return Board.boxOf(p);
}
// ผู้เล่นที่ยังอยู่และยืนบนกระดาน ในรูปที่ board.js ใช้ ({ id, x, y, alive, teamId, size })
//  ชั้นมิติ (server/dimension.js): เฉพาะคนชั้นเดียวกับ ref (playerId / ผู้เล่น) · ไม่ส่ง = ชั้นของต้นตอ (effectSource) → คนที่กำลังเดิน → กระดานหลัก
//  ref = "*" = ทุกชั้น (หาช่องตั้งร้านค้า)
function boardUnits(ref) {
  const all = ref === "*";
  const layer = all ? null : Dim.refLayer(ref);
  return combat.alivePlayers()
    .filter((p) => p.pos && (all || Dim.layerOf(p) === layer))
    .map((p) => ({ id: p.id, x: p.pos.x, y: p.pos.y, alive: true, teamId: p.teamId || null, size: sizeOf(p) }));
}
// ช่องที่ยืน/เดินผ่าน/ถอยเข้าไม่ได้นอกจากสิ่งกีดขวางของแผนที่: แผงร้านค้ามายา (GRID_PLAN §8.1)
//  + ร่างของตัวที่ล้มในระบบคู่ (server/duo.js — เดินข้ามได้ผ่าน hopTiles แต่ยืน/ไถล/ถูกผลักเข้าไม่ได้)
//  selfId = ตัวที่กำลังขยับ: ถูกขังในม่านแดง (server/soot.js — ระบำเขม่า) = ช่องนอกม่านเข้าไม่ได้ด้วย (Set-like: .has)
function boardBlocked(selfId = null) {
  const corpses = Duo.corpseKeys();
  const trap = selfId ? Soot.blockedFor(match.players[selfId]) : null;
  if (!match.shopPos && !corpses.length && !trap) return null;
  const out = new Set(corpses);
  if (match.shopPos) out.add(Board.key(match.shopPos.x, match.shopPos.y));
  return trap ? { has: (k) => out.has(k) || trap.has(k) } : out;
}
// ร่างที่เดินข้ามได้ (Board.reachable opts.hop) · ไม่มี = null
function hopTiles() {
  const keys = Duo.corpseKeys();
  return keys.length ? new Set(keys) : null;
}
// พวกเดียวกัน (โหมดทีม) — เดินผ่านกันได้ ตีกันไม่ได้
function unitAlly(a, b) {
  return combat.sameTeam(match.players[a.id], match.players[b.id]);
}
// ระยะเดินปกติสูงสุด (ก่อนหักโทษ) — บัฟของโอเบรอนใช้ค่านี้เป็นระยะส่ง (GRID_PLAN §5)
//  ตัวละครเปลี่ยนเองได้ผ่านฮุค mov(p) (Echo: ตัวใหญ่ขึ้น เดินได้น้อยลง)
function baseMovOf(p) {
  if (p.summon && Number.isFinite(p.summon.mov)) return p.summon.mov; // ยูนิตที่ถูกเรียก (server/summon.js)
  const hook = CHAR_HOOKS[p.characterId];
  const own = hook && hook.mov ? hook.mov(p) : null;
  if (Number.isFinite(own)) return own;
  const ch = CHAR_BY_ID[p.characterId];
  return ch && Number.isFinite(ch.mov) ? ch.mov : DEFAULT_MOV;
}
// ระยะเดินเทิร์นนี้: ไพ่แตก −1 · เชื่องช้า −1 (Ice Spike — ไม่ซ้อน)
//  เดินต่อหลังจบตา (canto — ฮุค cantoMov · เอมิลิโกะ) = ค่าของฮุคตรงๆ
//  ระยะที่เหลือหลังเดินแล้วสลับตัวออก (action.movLeft — rebaseMove) = ไม่เกินค่านี้
function movOf(p) {
  if (((p && p.statuses && p.statuses.rooted) || 0) > 0) return 0; // ถูกตรึง (กิระ: คลื่นความมืด)
  const a = match.action && match.actorId === p.id ? match.action : null;
  if (a && a.canto) return a.cantoMov || 0;
  const n = Math.max(0, baseMovOf(p) - (cardDeck.bustedOf(p) ? 1 : 0) - (Ice.slowed(p) ? 1 : 0) - (Dim.ghost(p) ? 0 : movPenalty(p, a)));
  return a && a.movLeft != null ? Math.min(n, a.movLeft) : n;
}
// โทษระยะเดินจากของบนกระดานของคนอื่น (ฮุค broadcast movPenalty(engine, p, from) → จำนวน · ดิเอโก้: เริ่มตาเดินบนน้ำมัน −1)
//  from = ช่องเริ่มตาเดิน (ไม่ได้อยู่ในตา = ช่องที่ยืน) · ซ้อนกับไพ่แตก/เชื่องช้าได้
function movPenalty(p, a) {
  const from = (a && a.from) || p.pos;
  if (!from) return 0;
  let n = 0;
  for (const mod of CHAR_HOOKS.MODULES) if (typeof mod.movPenalty === "function") n += Number(combat.runHook(mod, "movPenalty", engine, p, from)) || 0;
  return Math.max(0, n);
}
// ระบบคู่: ตัวที่คุมอยู่ (p · ตา = match.action) เดินแล้วกำลังสลับออก (กระจกเงา — Duo.switchTo)
//  → ตาที่เก็บไว้เริ่มใหม่จากช่องที่ยืน ด้วยระยะที่เหลือ (ผู้ใช้สั่ง 2026-10-18 — เดิมสลับออก = เดินต่อไม่ได้)
//  ย้อนได้แค่ถึงช่องที่สลับออก · ไถล/ชนจนหลุดระยะ = เหลือ 0
function rebaseMove(p) {
  const a = match.action;
  if (!p || !p.pos || !a || !a.moved || match.actorId !== p.id) return;
  const all = boardUnits();
  const seen = all.filter((u) => !Visibility.hiddenFrom(p, match.players[u.id]));
  const budget = movOf(p);
  const reach = Board.reachable(startMap(), { id: p.id, ...a.from, size: sizeOf(p) }, budget, seen, { isAlly: unitAlly, blocked: boardBlocked(p.id), hop: hopTiles(), smash: smashes(p), ghost: Dim.ghost(p) });
  const node = reach.get(Board.key(p.pos.x, p.pos.y));
  const left = node ? Math.max(0, budget - node.d) : 0;
  if (a.canto) a.cantoMov = left;
  else a.movLeft = left;
  a.from = { ...p.pos };
  a.moved = false;
  a.path = null;
  a.trail = null;
  a.smashed = null;
  a.iceUndo = null;
  if (left <= 0) a.locked = true;
}
// ตีสวนได้ไหม (ผู้ใช้ตัดสิน 2026-10-09: เลิกตีสวนแบบ FE แล้ว — เก็บกลไกไว้ให้ตัวละคร "สะท้อน" ในอนาคต)
//  เปิดด้วยข้อมูลตัวละคร `counter: true` ใน characters.js หรือ p.counterBack (สถานะ/เทสต์)
function counters(p) {
  if (!p) return false;
  if (p.counterBack === true) return true;
  const ch = CHAR_BY_ID[p.characterId];
  return !!(ch && ch.counter);
}
// ระยะโจมตีปกติ [rmin, rmax] — ฮุค range(p) ของตัวละครแทนได้ (Echo: ตัวใหญ่ขึ้น ตีไกลขึ้น)
function rangeOf(p) {
  if (p.summon && Array.isArray(p.summon.range)) return p.summon.range; // ยูนิตที่ถูกเรียก (server/summon.js)
  const hook = CHAR_HOOKS[p.characterId];
  const own = hook && hook.range ? hook.range(p) : null;
  if (Array.isArray(own)) return own;
  const ch = CHAR_BY_ID[p.characterId];
  return ch && Array.isArray(ch.range) ? ch.range : DEFAULT_RANGE;
}
// ตีปกติแบบแนวตรง (ฮุค attackLane — ไรโด ฮิคารุ): ตีได้เฉพาะแนวตรงจากขอบตัว · ทุกคนในแนวโดน
//  คืน false | true (แนวตรงยาวตามระยะ — แบล็คคิง) | "face" (ทั้งด้านของตัวที่เป้าอยู่ — กิงกะ)
function lanes(p) {
  const hook = CHAR_HOOKS[p.characterId];
  const mode = hook && hook.attackLane ? hook.attackLane(p) : false;
  return mode === "face" ? "face" : !!mode;
}
// เป้าอยู่ในระยะตีปกติจากช่องที่ยืนไหม (แนวตรง = ต้องอยู่ในแนว · ปกติ = ระยะแมนฮัตตัน)
function canStrike(p, target) {
  if (!p || !p.pos || !target || !target.pos) return false;
  if (lanes(p)) return !!Board.laneOf(boardMap(), p.pos.x, p.pos.y, sizeOf(p), rangeOf(p), boxOf(target), lanes(p) === "face");
  return Board.inRange(rangeOf(p), Board.dist(boxOf(p), boxOf(target)));
}
// ตีแนวตรงแล้วโดนใครอีกบ้างนอกจากเป้าหลัก (ศัตรูในแนวเดียวกัน รวมคนที่มองไม่เห็น) → { ids, tiles }
function laneVictims(p, target) {
  if (!lanes(p) || !p.pos || !target || !target.pos) return null;
  const lane = Board.laneOf(boardMap(), p.pos.x, p.pos.y, sizeOf(p), rangeOf(p), boxOf(target), lanes(p) === "face");
  if (!lane) return null;
  const ids = Board.unitsOnTiles(boardUnits(), lane.tiles).map((u) => u.id)
    .filter((id) => id !== p.id && id !== target.id && !combat.sameTeam(p, match.players[id]));
  return { ids, tiles: lane.tiles.map((t) => ({ x: t.x, y: t.y })) };
}
// ตัวใหญ่ตั้งแต่ขนาดนี้ เดิน/ขยายตัวพังสิ่งกีดขวางได้ (ผู้ใช้ตัดสิน: 3×3)
function smashes(p) {
  const hook = CHAR_HOOKS[p.characterId];
  return !!(hook && hook.smashes && hook.smashes(p));
}
// เริ่มเกม/เปลี่ยนภูมิภาค: ตั้งแผนที่แล้วแจกจุดเกิดให้ทุกคนที่ยังอยู่ (คนตกรอบไม่มีที่ยืน)
//  ร้านค้าถูกยกออก — ต้นเทิร์นถัดไป (dealRound) สุ่มจุดใหม่บนแผนที่นี้พร้อมของใหม่ (GRID_PLAN §3)
//  ตัวใหญ่: วางใกล้จุดเกิดของตัวเองให้ทั้งตัวลงได้โดยไม่ทับใคร (พังสิ่งกีดขวางได้ = พังของใต้ตัว)
function placeOnBoard(area) {
  Ride.clearAll(); // ขี่ผู้เล่นอื่น: เปลี่ยนภูมิภาค = ลงจากหลังทุกคน (ได้จุดเกิดของตัวเอง)
  Summon.removeAll(); // ยูนิตที่ถูกเรียก (server/summon.js) หายหมด
  Dim.resetAll(); // ชั้นมิติ (server/dimension.js): ทุกคนกลับกระดานหลัก
  match.board = { area };
  match.shopPos = null;
  const map = boardMap();
  const alive = combat.alivePlayers();
  // ระบบคู่: จุดเกิดแจกต่อฝ่าย (ตัวแรกที่ยังอยู่) · อีกตัวลงช่องว่างติดกัน
  const leads = alive.filter((p) => Duo.unitsOf(p).find((u) => u.alive) === p);
  const spawns = Board.assignSpawns(map, leads.map((p) => ({ id: p.id, teamId: p.teamId || null })), { teamMode: lobby.teamModeActive() });
  for (const p of Object.values(match.players)) p.pos = p.alive && spawns[p.id] ? { ...spawns[p.id] } : null;
  for (const p of alive) {
    if (p.pos) continue;
    const lead = Duo.unitsOf(p).find((u) => u.alive && u.pos);
    if (lead) p.pos = nearFreeTile(lead.pos);
  }
  Duo.placeCorpses((x, y) => tileFree(x, y));
  for (const p of alive) {
    if (!p.pos || sizeOf(p) <= 1) continue;
    const near = { ...p.pos };
    p.pos = null; // ไม่นับตัวเองตอนหาที่
    const spot = Board.placeBig(boardMap(), sizeOf(p), near, boardUnits(), { selfId: p.id, smash: smashes(p) });
    if (!spot) { p.boardSize = 1; p.pos = near; continue; } // ไม่มีที่พอ (ไม่ควรเกิด) = ลงจุดเกิดแบบตัวเล็ก
    breakObstacles(spot.rubble);
    p.pos = { x: spot.x, y: spot.y };
  }
  // ฮุค broadcast onBoardPlaced(engine): แผนที่ใหม่ (เริ่มเกม/เปลี่ยนภูมิภาค/ห่วงเวลาซีโร่) — ไจโร: ลูกเหล็กบนพื้นกลับมือ
  combat.broadcastHook("onBoardPlaced", engine);
}
// ช่องว่างที่ใกล้ pos ที่สุด (ไล่วงข้าวหลามตัดออกไป) — ไม่มีเลย = null
function nearFreeTile(pos, selfId = null) {
  for (let r = 1; r <= 6; r++) {
    for (let dy = -r; dy <= r; dy++) {
      const w = r - Math.abs(dy);
      for (const dx of w ? [-w, w] : [0]) if (tileFree(pos.x + dx, pos.y + dy, selfId)) return { x: pos.x + dx, y: pos.y + dy };
    }
  }
  return null;
}
// เปลี่ยนขนาดตัวบนกระดาน (Echo ขยายร่าง/คืนร่าง) → คืนขนาดที่เป็นจริง
//  หดตัว: ยืนกลางตัวเดิม · ขยายตัว: มุมใหม่ครอบตัวเดิม (Board.growPlan) — คนในช่องที่ขยายทับถูกผลักออกไปช่องว่างใกล้สุด
//   ศัตรูที่ถูกผลักเสียพลังชีวิต 1 (ลดเกราะก่อน · ผู้ใช้สั่ง) · เพื่อนร่วมทีมถูกผลักเฉยๆ · พังสิ่งกีดขวางใต้ตัวใหม่ได้ถ้า smashes
//   ไม่มีที่ให้ขยาย (ร้านค้า/ขอบกระดานขวาง) = ค้างขนาดเดิมไว้ก่อน (ผู้เรียกลองใหม่ทีหลัง)
//   คนที่ถูกผลักเผยตัวก่อนส่ง growFx (Ice.revealPushed) · ถูกผลักลงน้ำแข็ง = ไถลต่อ (Ice.forcedSlides — iceFx ตามหลัง)
//  ส่ง boardFx "growFx" ให้ client เล่นเอฟเฟกต์ (ขนาดเดิม → ใหม่ · คนที่ถูกผลัก · ของที่พัง)
function resizeUnit(p, newSize) {
  const from = sizeOf(p);
  newSize = Math.max(1, newSize | 0);
  if (!p || !p.alive || !p.pos || newSize === from) { if (p && !p.pos) p.boardSize = newSize; return sizeOf(p); }
  const map = boardMap();
  const fromPos = { ...p.pos };
  if (newSize < from) {
    const off = Math.floor((from - newSize) / 2);
    p.pos = { x: p.pos.x + off, y: p.pos.y + off };
    p.boardSize = newSize;
    engine.boardFx("growFx", { id: p.id, from, to: newSize, at: { ...p.pos }, prev: fromPos, pushed: [], smashed: [] });
    return newSize;
  }
  const plan = Board.growPlan(map, { id: p.id, x: p.pos.x, y: p.pos.y, size: from }, newSize, boardUnits(),
    { blocked: boardBlocked(), smash: smashes({ ...p, boardSize: newSize }) }); // ฮุค smashes ตรวจขนาดเอง (3×3 ขึ้นไป)
  if (!plan) return from;
  const smashed = breakObstacles(plan.rubble);
  p.pos = { x: plan.x, y: plan.y };
  p.boardSize = newSize;
  const box = { x: plan.x, y: plan.y, size: newSize };
  const pushed = [];
  const slides = [];
  combat.withEffectSource(p, () => {
    for (const id of plan.displaced) {
      const o = match.players[id];
      if (!o || !o.alive || !o.pos) continue;
      Ice.revealPushed(o); // ถูกดัน = เผยตัว ก่อน growFx ส่งพิกัด (ผู้ใช้ตัดสิน 2026-10-14)
      const before = { ...o.pos };
      const to = Board.pushOutTile(boardMap(), before, box, boardUnits().filter((u) => u.id !== o.id), { selfId: o.id, blocked: boardBlocked(o.id) });
      if (to) {
        o.pos = { x: to.x, y: to.y };
        slides.push({ id: o.id, from: before, to: { ...o.pos }, dir: { x: to.x - before.x, y: to.y - before.y } });
      }
      const enemy = !combat.sameTeam(p, o);
      let dealt = 0;
      if (enemy) {
        const vit = (o.hp || 0) + (o.armor || 0);
        o.wasAttacked = true;
        combat.dealMixed(o, 1, false);
        dealt = Math.max(0, vit - ((o.hp || 0) + (o.armor || 0)));
        if (o.alive && o.hp <= 0) combat.instantDeath(o);
      }
      match.lastLog.push(`💢 ${o.name} ถูก ${p.name} ที่ขยายร่างผลักออก${enemy ? ` -${dealt} (ลดเกราะก่อน)` : ""}`);
      if (!o.alive) { o.pos = null; match.lastLog.push(`💀 ${o.name} เลือดจริงหมด ตกรอบ!`); }
      pushed.push({ id: o.id, from: before, to: o.pos ? { ...o.pos } : null, dmg: dealt });
    }
  });
  engine.boardFx("growFx", { id: p.id, from, to: newSize, at: { ...p.pos }, prev: fromPos, pushed, smashed });
  Ice.forcedSlides(slides, p); // ถูกดันลงน้ำแข็ง = ไถลต่อตามทิศที่ถูกดัน + ชนตามกติกาไถล (iceFx ตามหลัง growFx)
  return newSize;
}

// ช่องนี้ยืนได้ไหม: ในกระดาน ไม่ใช่สิ่งกีดขวาง/ร้านค้า และไม่มีใครยืน (ยกเว้น selfId)
//  ชั้นมิติ: นับเฉพาะคนชั้นเดียวกับ selfId (ไม่ส่ง = ชั้นตั้งต้นของ boardUnits)
function tileFree(x, y, selfId = null) {
  return Board.freeTile(boardMap(), x, y, boardUnits(selfId || undefined), selfId, boardBlocked(selfId));
}
// ช่องตามแนวพุ่งตรงจากตัว (โซระ: Mouse Separade) ทีละช่องไม่เกิน len · ตัดที่ขอบกระดาน
//  ต่อช่อง { x, y, obstacle: ชนิดสิ่งกีดขวาง | null, wall: พังไม่ได้ (ผนึกมิโกะ), shop, unitId: คนที่ยืน (ไม่นับตัวเอง · รวมคนที่มองไม่เห็น) }
function chargeTiles(p, dir, len) {
  const v = Board.LINE_DIRS[dir];
  if (!v || !p || !p.pos) return [];
  const map = boardMap(), units = boardUnits().filter((u) => u.id !== p.id), blocked = boardBlocked();
  const out = [];
  for (let i = 1; i <= len; i++) {
    const x = p.pos.x + v[0] * i, y = p.pos.y + v[1] * i;
    if (!Board.inBounds(map, x, y)) break;
    const k = Board.key(x, y), obstacle = map.terrain[k] || null;
    const u = Board.unitAt(units, x, y);
    out.push({ x, y, obstacle, wall: !!obstacle && Board.UNBREAKABLE.has(obstacle), shop: !!(blocked && blocked.has(k)), unitId: u ? u.id : null });
  }
  return out;
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
function resolveArea(p, area, targets, dir, tile) {
  const kind = (area && area.kind) || "self";
  if (kind === "self" || kind === "field") return Array.isArray(targets) ? targets : [];
  if (!p.pos) return null;
  const range = areaRange(p, area);
  // tile (Ice Spike): เลือกช่องบนกระดานในระยะ (รวมช่องที่ยืน) → คนที่ยืนบนช่องนั้น / ในกรอบ square×square รอบช่องนั้น
  if (kind === "tile") {
    const t = tileOf(tile);
    if (!t || !Board.inBounds(boardMap(), t.x, t.y) || Board.dist(boxOf(p), t) > range) return null;
    return Board.unitsOnTiles(boardUnits(), tileArea(area, t)).map((u) => u.id);
  }
  if (kind === "target") {
    const t = match.players[Array.isArray(targets) ? targets[0] : null];
    if (!t || !t.alive || !t.pos) return null;
    if (t.id === p.id) return area.self ? [t.id] : null;
    if (!Dim.same(p, t)) return null; // ชั้นมิติ: เล็งคนคนละชั้นไม่ได้
    if (Visibility.hiddenFromUnit(p, t)) return null;
    // รูปเฉพาะ (area.cells = [[dx, dy], …] นับจากช่องของผู้ใช้) — เป้าต้องทับช่องตามรูป แทนการนับระยะ
    if (Array.isArray(area.cells)) return cellsHit(p, area.cells, t) ? [t.id] : null;
    // square: true = กรอบสี่เหลี่ยมรอบตัว (นับแบบเชบีเชฟ — range 3 = 7×7 · เฟิร์น: ยิง Orbital Cannon Zoltraak) · ไม่ใส่ = แมนฮัตตัน
    const d = area.square ? boxChebyshev(boxOf(p), boxOf(t)) : Board.dist(boxOf(p), boxOf(t));
    return d <= range ? [t.id] : null;
  }
  const units = area.hostile ? boardUnits() : boardUnits().filter((u) => !Visibility.hiddenFromUnit(p, match.players[u.id]));
  if (kind === "aoe") {
    const ids = Board.unitsOnTiles(units, Board.aoeTiles(boardMap(), p.pos.x, p.pos.y, range, sizeOf(p))).map((u) => u.id);
    return area.self ? [p.id, ...ids] : ids;
  }
  if (kind === "line") {
    if (!Board.LINE_DIRS[dir]) return null;
    const tiles = Board.lineTiles(boardMap(), p.pos.x, p.pos.y, dir, area.len || 1, area.width || 1, sizeOf(p));
    return Board.unitsOnTiles(units, tiles).map((u) => u.id).filter((id) => id !== p.id);
  }
  return null;
}
// เป้า t ทับช่องตามรูป cells ([[dx, dy], …] นับจากช่องของ p) ไหม
function cellsHit(p, cells, t) {
  const want = new Set(cells.filter((c) => Array.isArray(c)).map(([dx, dy]) => Board.key(p.pos.x + dx, p.pos.y + dy)));
  return Board.footprint(t.pos.x, t.pos.y, sizeOf(t)).some((c) => want.has(Board.key(c.x, c.y)));
}
// ระยะแบบเชบีเชฟระหว่างกรอบตัว (ช่องว่างตามแกนที่มากกว่า · ติดกัน/ทแยง = 1) — target ที่ square: true
function boxChebyshev(a, b) {
  const as = Math.max(1, a.size | 0), bs = Math.max(1, b.size | 0);
  const dx = Math.max(0, a.x - (b.x + bs - 1), b.x - (a.x + as - 1));
  const dy = Math.max(0, a.y - (b.y + bs - 1), b.y - (a.y + as - 1));
  return Math.max(dx, dy);
}
// ช่องที่เลือก (socket ส่ง { x, y }) → { x, y } จำนวนเต็ม · ไม่ถูกต้อง = null
function tileOf(tile) {
  if (!tile || !Number.isInteger(tile.x) || !Number.isInteger(tile.y)) return null;
  return { x: tile.x, y: tile.y };
}
// ช่องที่สกิล tile คลุม: ช่องเดียว หรือกรอบ square×square รอบช่องกลาง (ตัดขอบกระดาน)
//  ขนาดคู่ (ระบำเขม่า 8×8) = ช่องที่เลือกอยู่กลางค่อนซ้ายบน (−n/2 … +n/2−1)
function tileArea(area, t) {
  const n = Math.max(1, (area && area.square) | 0), lo = Math.floor(n / 2), hi = n - 1 - lo, map = boardMap(), out = [];
  for (let y = t.y - lo; y <= t.y + hi; y++) for (let x = t.x - lo; x <= t.x + hi; x++) if (Board.inBounds(map, x, y)) out.push({ x, y });
  return out;
}
// ช่องที่สกิลพื้นที่คลุม (aoe / line / tile) — ใช้ลงผลกับผนึกมิโกะ (ห่วงเวลาซีโร่) / หนามน้ำแข็ง · ชนิดอื่น = []
function areaTiles(p, area, dir, tile) {
  const kind = (area && area.kind) || "self";
  if (kind === "tile") { const t = tileOf(tile); return t ? tileArea(area, t) : []; }
  if (!p || !p.pos) return [];
  if (kind === "aoe") return Board.aoeTiles(boardMap(), p.pos.x, p.pos.y, areaRange(p, area), sizeOf(p));
  if (kind === "line" && Board.LINE_DIRS[dir]) return Board.lineTiles(boardMap(), p.pos.x, p.pos.y, dir, area.len || 1, area.width || 1, sizeOf(p));
  return [];
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
  // ระบบคู่: ลำดับเดินต่อผู้เล่น (ไพ่ของเจ้าของ) — ฝ่ายที่ยังมีตัวบนกระดาน
  //  ขี่ผู้เล่นอื่น (server/ride.js): ตัวที่ขี่ไม่อยู่บนกระดาน (pos = null) แต่ยังได้ตาเดิน
  const alive = Duo.cardHolders().filter((p) => Duo.unitsOf(p).some((u) => u.alive && (u.pos || Ride.riding(u))));
  match.turnOrder = turnOrderOf(alive);
  match.actorIndex = -1;
  match.actorId = null;
  match.action = null;
  match.duo = null;
  // เหรียญ: ทุกคน +1 ตอนจบเทิร์น (endTurn) · คนเดินลำดับแรกได้เพิ่มอีก (รวม 2)
  const first = match.players[match.turnOrder[0]];
  if (first) {
    shop.addGold(first, GOLD_FIRST_BONUS);
    match.lastLog.push(`🥇 ${first.name} ได้เดินลำดับแรก — เหรียญ +${GOLD_FIRST_BONUS}`);
  }
  // ฮุค broadcast onOrderBegin(engine): ลำดับเดินเทิร์นนี้เรียงแล้ว (ดิเอโก้: เดอะเวิลด์ที่ไม่ถูกตี = ตาหยุดเวลาก่อนทุกคน — TimeStop.queueExtra)
  combat.broadcastHook("onOrderBegin", engine);
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
  TimeStop.clearMark();
  // ตาเดินพิเศษที่รอคิว (หยุดเวลา — server/timeStop.js) เล่นก่อนเลื่อนลำดับ · จบแล้วกลับมาที่นี่ต่อ
  if (runExtras()) return;
  for (;;) {
    match.actorIndex++;
    const id = match.turnOrder[match.actorIndex];
    if (id === undefined) {
      match.actorId = null;
      match.action = null;
      endTurnPhase.endTurn();
      return;
    }
    const owner = match.players[id];
    if (!owner) continue;
    // ระบบคู่ (server/duo.js): ตาของผู้เล่น = ทุกตัวของฝ่าย (ตัวละครทั่วไปมีตัวเดียว)
    //  ขี่ผู้เล่นอื่น: ตาของตัวเอง = ลงมายืนช่องของตัวที่ถูกขี่ชั่วคราว (Ride.seat — จบตาขึ้นหลังต่อ)
    for (const u of Duo.unitsOf(owner)) Ride.seat(u);
    // + ยูนิตที่ถูกเรียกแบบคุมได้ (ร่างแยก — server/summon.js) เดินต่อจากเจ้าของ
    let units = Duo.turnUnits(owner).filter((u) => u.alive && u.pos);
    if (!units.length) continue;
    Visibility.markTurn(id); // บรรทัดที่ฝ่ายนี้ก่อในตานี้ (filterLog — คนล่องหนที่ถูกโจมตีพื้นที่จนปรากฏตัว)
    // ผลต้นตาเดิน (ถึงคิวแล้ว — รวมคนที่ถูกข้ามตาเพราะสตั้น) · Ice Spike: คุกน้ำแข็งช่วงที่ 2
    for (const u of units) {
      const startHook = CHAR_HOOKS[u.characterId];
      if (startHook && startHook.onActorStart && u.alive && u.pos) combat.withEffectSource(u, () => startHook.onActorStart(engine, u));
    }
    if (endTurnPhase.gameOver()) return;
    units = units.filter((u) => u.alive && u.pos);
    // สตั้น / หลับไหล: ข้ามทั้งตา (เดินก็ไม่ได้) · เทิร์นที่เพิ่งโดนกล่อม (sleepFresh) ยังขยับได้
    for (const u of units) if (stuck(u)) match.lastLog.push(`😵 ${u.name} ขยับไม่ได้ — ข้ามตาเดิน`);
    units = units.filter((u) => !stuck(u));
    if (!units.length) continue;
    const secs = units[0].summon ? Summon.CONTROL_SECONDS : actionSeconds();
    if (owner.duoWith || units.length > 1 || units[0] !== owner) Duo.startTurn(owner, units);
    else {
      match.duo = null;
      match.actorId = id;
      match.action = { from: { ...owner.pos }, moved: false, locked: false };
    }
    match.gameState = "ACTION";
    timers.startPhaseTimer(secs, actionTimeUp);
    TimeStop.mark(); // จุดย้อนของตานี้ (ฉากต้นตาเดินที่โจมตีคนที่ตั้งรับด้วยการหยุดเวลา)
    for (const u of units) Voice.play(u, "turn"); // เสียงพากย์ต้นตาเดิน (server/voice.js — ไจโร: start_1/2)
    // ฮุค onActorReady: ตาเริ่มแล้ว (ACTION + นาฬิกา) — ฉากต้นตาเดินพักตาไว้เล่นคลิป/เอฟเฟกต์ได้ (engine.pausePlayingForCutscene
    //  → กลับมาตาเดินด้วยเวลาที่เหลือ) · เกรย์: ปล่อยรองโกมิเนียตที่ชาร์จไว้
    for (const u of units) {
      const readyHook = CHAR_HOOKS[u.characterId];
      if (readyHook && readyHook.onActorReady && u.alive && u.pos) combat.withEffectSource(u, () => readyHook.onActorReady(engine, u));
    }
    if (match.gameState !== "ACTION") return; // ฉากต้นตาเดินพักตาไว้แล้ว (บรอดแคสต์เอง)
    view.broadcastState();
    return;
  }
}
// ตาเดินพิเศษ (TimeStop.queueExtra — ดิเอโก้: หยุดเวลา): ตาใหม่เต็มๆ ของ ex.id โดยไม่เลื่อนลำดับเดิน · เล่นไม่ได้ (ตาย/ไม่อยู่บนกระดาน/ติดสตั้น) = false
//  ฮุค onExtraTurn(engine, p, kind) หลังตั้งตา+นาฬิกา (พักตาเล่นฉากได้แบบ onActorReady)
function runExtras() {
  for (let ex = TimeStop.takeExtra(); ex; ex = TimeStop.takeExtra()) if (startExtra(ex)) return true;
  return false;
}
//  ex.resume = ตาของคนที่ถูกแทรก (counter) — จบตาพิเศษแล้วกลับไปเล่นต่อ (resumeFrom) แทนการเลื่อนคิว
function startExtra(ex) {
  const p = match.players[ex.id];
  if (!p || !p.alive || !p.pos || stuck(p) || p.duoWith || p.duoOf || p.summon) {
    if (ex.resume) { resumeFrom(ex.resume); return true; }
    return false;
  }
  match.duo = null;
  match.actorId = p.id;
  match.action = { from: { ...p.pos }, moved: false, locked: false, extra: ex.kind, resume: ex.resume || null };
  match.gameState = "ACTION";
  timers.startPhaseTimer(actionSeconds(), actionTimeUp);
  const hook = CHAR_HOOKS[p.characterId];
  if (hook && hook.onExtraTurn) combat.withEffectSource(p, () => combat.runHook(hook, "onExtraTurn", engine, p, ex.kind));
  if (match.gameState !== "ACTION") return true; // ฉากต้นตาพักไว้แล้ว (บรอดแคสต์เอง)
  view.broadcastState();
  return true;
}
// กลับเข้าตาที่ถูกแทรก (ตาพิเศษ counter จบ): ตา/ระบบคู่/เวลาที่เหลือเดิม · ระหว่างนั้นถูกย้ายตำแหน่ง = เดินต่อไม่ได้แล้ว
//  ตายระหว่างตาที่แทรก = จบตานั้น (finishActor)
function resumeFrom(r) {
  if (endTurnPhase.gameOver()) return;
  match.actorId = r.actorId;
  match.action = r.action;
  match.duo = r.duo;
  const p = match.players[r.actorId];
  if (!p || !p.alive || !p.pos || !match.action) {
    if (match.action) match.action.expired = true;
    finishActor();
    return;
  }
  const a = match.action;
  if (r.at && (p.pos.x !== r.at.x || p.pos.y !== r.at.y)) {
    a.from = { ...p.pos }; a.moved = false; a.path = null; a.trail = null; a.locked = true;
  }
  match.gameState = "ACTION";
  timers.startPhaseTimer(r.left || actionSeconds(), actionTimeUp);
  TimeStop.mark();
  view.broadcastState();
}
// ผู้เล่นออกจากเกมกลางเทิร์น: ถ้าเป็นคนที่กำลังเดิน ข้ามไปคนถัดไปเลย
//  (กำลังเล่นฉากตีอยู่ = ปล่อยให้ตัวจับเวลาของฉากพาไปคนถัดไปเอง ไม่งั้นข้ามสองคน)
function removeFromOrder(playerId) {
  const mine = match.actorId === playerId || (match.duo && match.duo.ownerId === playerId);
  if (mine && match.gameState === "ACTION") { match.duo = null; nextActor(); }
}
// ฟื้นคืนชีพกลางตาเดินแล้วได้เดินเทิร์นนี้ (ยูนะ: คำอวยพรสุดท้าย — ผู้ใช้ตัดสิน 2026-10-18)
//  ยังไม่ถึงคิว = รอคิวเดิม · ไม่มีชื่อในลำดับ/เดินไปแล้ว = ต่อท้ายแถว (ย้ายออกจากที่เดิม — actorIndex เลื่อนตาม)
function joinOrder(id) {
  const p = match.players[id];
  if (!p || match.gameState === "PLAYING" || match.gameState === "ORDER") return; // ช่วงจั่ว/ลำดับเดิน = ได้คิวตามไพ่อยู่แล้ว
  const side = Duo.sideKey(p) || id;
  const idx = match.turnOrder.indexOf(side);
  if (idx > match.actorIndex) return;
  if (idx === match.actorIndex && (match.actorId === id || (match.duo && match.duo.ownerId === side))) return; // ฝ่ายนี้กำลังเดินอยู่
  if (idx >= 0) { match.turnOrder.splice(idx, 1); match.actorIndex--; }
  match.turnOrder.push(side);
}
// ติดสตั้น / หลับไหล (เทิร์นที่เพิ่งโดนกล่อมยังขยับได้) = ข้ามตา
function stuck(p) {
  return ((p.statuses.stun || 0) > 0) || ((p.statuses.sleep || 0) > 0 && !p.sleepFresh);
}
// หมดเวลาตาเดิน (ตัวจับเวลาของเฟส ACTION) — ระบบคู่: จบตาของทั้งฝ่ายทันที · ไม่ได้เดินต่อ (canto)
function actionTimeUp() {
  if (match.action) match.action.expired = true;
  finishActor();
}

// เดินไปแล้วในเทิร์นนี้ไหม (ตาของคนนี้ผ่านไปแล้ว — ไม่นับคนที่กำลังเดินอยู่)
//  ระบบคู่: นับตามลำดับของเจ้าของ · ตาของฝ่ายนี้กำลังเล่น = ตัวที่จบแล้ว (ตี/รอ) นับว่าเดินแล้ว
function hasActed(id) {
  const side = Duo.sideKey(match.players[id]) || id;
  const idx = match.turnOrder.indexOf(side);
  if (idx < 0) return false;
  if (idx === match.actorIndex && match.actorId === id) return false;
  if (idx === match.actorIndex && match.duo && match.duo.ownerId === side) return !!match.duo.done[id];
  return idx <= match.actorIndex;
}

// ---------- ตาเดิน ----------
// เป็นตาของคนนี้และกดอะไรได้อยู่ไหม (ระหว่างฉากตี/คัตซีน = ไม่ได้)
//  เดินต่อหลังจบตา (canto — เอมิลิโกะ): ได้แค่เดิน/ย้อน/รอ (move: true) · อย่างอื่นกดไม่ได้
function canAct(p, { move = false } = {}) {
  if (!p || !p.alive || match.gameState !== "ACTION" || match.actorId !== p.id || !match.action) return false;
  return move || !match.action.canto;
}
// ใช้สกิล/ไอเทม/ซื้อของแล้ว เดินไม่ได้อีก (ยังโจมตีปกติได้) — GRID_PLAN §4 กฎพื้นฐาน
function lockMove(p) {
  if (canAct(p)) match.action.locked = true;
}
// เดินไม่ได้ ตีปกติไม่ได้ และไม่ได้เดินต่อหลังจบตา (ยังใช้สกิล/รอได้) — ขนมปังของเอมิลิโกะ
function lockStrike(p) {
  if (!canAct(p)) return;
  match.action.locked = true;
  match.action.noStrike = true;
}
// แผนที่ตอนเริ่มตาเดินนี้ = แผนที่ตอนนี้ถอดผลการเดินของตานี้ออก (ธารน้ำแข็งที่ Ice Spike เดินสร้าง · ของที่ตัวใหญ่เดินพัง)
//  เส้นทาง/ระยะเดินจากจุดเริ่มตาคิดบนแผนที่นี้เสมอ — ไม่งั้นทางที่เพิ่งเดินกลายเป็นน้ำแข็ง/ทางโล่งแล้วคิดผิด
//  walkUndoPatch ส่งให้ client ด้วย (state.action.walkUndo) ให้ไฮไลต์/เดินด้วยคีย์บอร์ดคิดตรงกับ server
function walkUndoPatch() {
  const a = match.action;
  if (!a || !match.board || (!(a.iceUndo && a.iceUndo.length) && !(a.smashed && a.smashed.length))) return null;
  const base = Board.mapOf(match.board.area);
  const special = {}, terrain = {}, seenK = new Set();
  for (const r of a.iceUndo || []) {
    if (!r || !r.k || seenK.has(r.k)) continue; // บันทึกที่ไม่ใช่ช่องน้ำแข็ง (r.undo — ไจโร: สัดส่วนทองคำ) ไม่แตะแผนที่
    seenK.add(r.k);
    if (!r.prev) special[r.k] = base.special[r.k] || null; // บันทึกแรกของช่อง = สภาพก่อนตานี้
  }
  const spikes = match.board.smashedSpikes || {};
  for (const k of a.smashed || []) terrain[k] = spikes[k] ? `icespike${spikes[k].lv}` : base.terrain[k] || null;
  return { terrain, special };
}
function startMap() {
  return Board.patchMap(boardMap(), walkUndoPatch());
}
// วางเส้นทางเดินจากจุดเริ่มตา (action.from) ถึง (x, y) → path (ช่องเริ่ม → ปลาย) · ไม่ได้ = null
//  คลิก = ทางที่ก้าวน้อยสุด · step (คีย์บอร์ด) = ลูกศรแบบ FE ต่อจากเส้นทางที่เดินมา (Board.stepPath)
//  คิดจากเท่าที่ผู้เดินมองเห็น — คนที่มองไม่เห็น (ล่องหน/พุ่มหญ้า) ไม่ขวางตอนวางเส้นทาง แต่ชนจริงตอนเดิน (moveTo)
//  ตัวใหญ่: คีย์ของระยะเดิน = ช่องมุมบนซ้าย · ตั้งแต่ 3×3 เดินพังสิ่งกีดขวางได้ (smash)
function planWalk(p, x, y, step) {
  const a = match.action, map = startMap();
  const seen = boardUnits().filter((u) => !Visibility.hiddenFrom(p, match.players[u.id]));
  const unit = { id: p.id, x: a.from.x, y: a.from.y, size: sizeOf(p) };
  const opts = { isAlly: unitAlly, blocked: boardBlocked(p.id), hop: hopTiles(), smash: smashes(p), ghost: Dim.ghost(p) };
  const last = a.trail && a.trail[a.trail.length - 1];
  const trail = last && last.x === p.pos.x && last.y === p.pos.y ? a.trail : null; // เส้นทางที่ไม่ได้จบที่ช่องที่ยืน (ถูกย้ายด้วยสกิล) = เริ่มนับใหม่
  if (step) return Board.stepPath(map, unit, movOf(p), seen, trail, { x, y }, opts);
  const reach = Board.reachable(map, unit, movOf(p), seen, opts);
  const node = reach.get(Board.key(x, y));
  return node ? Board.pathTo(reach, x, y) : null;
}
// เดิน (ตาของตัวเอง · ยังไม่ล็อก): ทุกครั้งคิดเส้นทางใหม่จาก "จุดเริ่มตา" — เดินแล้วคลิก/กดใหม่ได้เรื่อยๆ จนกว่าจะล็อก (ใช้สกิล/ไอเทม/ซื้อ/ตี)
//  คลิก = ไปช่องนั้นด้วยทางที่ก้าวน้อยสุด (เดินไปแล้ว = เริ่มใหม่จากจุดเริ่มตา)
//  step = เดินทีละช่องด้วยคีย์บอร์ด (W A S D) แบบลูกศร FE — ตัวละครเดินตามทันที · กลับมาจุดเริ่ม (คลิกหรือก้าว) = ย้อนการเดิน
function moveTo(id, x, y, opts = {}) {
  return TimeStop.guard(() => walkTo(id, x, y, opts));
}
function walkTo(id, x, y, { step = false } = {}) {
  const p = match.players[id];
  if (!canAct(p, { move: true }) || match.action.locked) return false;
  if (!Number.isInteger(x) || !Number.isInteger(y)) return false;
  if (step && Board.dist(p.pos, { x, y }) !== 1) return false;
  const act = match.action, origin = act.from;
  if (x === origin.x && y === origin.y) return act.moved ? undoMove(id) : false;
  if (!step && x === p.pos.x && y === p.pos.y) return false; // คลิกช่องที่ยืนอยู่
  const path = planWalk(p, x, y, step);
  if (!path) return false;
  if (path.length < 2) return act.moved ? undoMove(id) : false;
  const prev = { x: p.pos.x, y: p.pos.y };
  // ผลการเดินที่แสดงอยู่แล้ว (เดินซ้ำทางเดิม = ไม่เล่นเอฟเฟกต์ซ้ำ) → ถอดการเดินเดิมออกก่อนเดินทางใหม่จากจุดเริ่ม
  const had = { ice: new Set((act.iceUndo || []).filter(Boolean).map((r) => r.k)), smashed: new Set(act.smashed || []) };
  if (act.moved) rewindWalk(p);
  // ขี่อยู่ (server/ride.js): เดินออกจากช่องของตัวที่ถูกขี่ = ลงจากหลัง (ย้อนการเดินกลับช่องเดิม = ขึ้นกลับ — rewindWalk)
  if (p.mountId) { act.dismount = p.mountId; p.mountId = null; }
  const s = sizeOf(p);
  const map = boardMap();
  const all = boardUnits();
  const seen = all.filter((u) => !Visibility.hiddenFrom(p, match.players[u.id]));
  // ภาพเดิน: คลิก = ทั้งเส้นทางจากจุดเริ่มตา · คีย์บอร์ด = ก้าวนี้ก้าวเดียว (จากช่องที่ยืน)
  const animOf = (walked) => {
    const end = walked[walked.length - 1];
    if (!step) return walked.length > 1 ? walked : null;
    return end.x === prev.x && end.y === prev.y ? null : [prev, { x: end.x, y: end.y }];
  };
  // น้ำแข็ง (GRID_PLAN §7.9): ช่องน้ำแข็งช่องแรกที่เดินเข้า = จุดเริ่มไถล — เดินจริงแค่ถึงช่องนั้น ที่เหลือคิดใหม่ด้วยตำแหน่งจริงของทุกคน
  //  เดินทะลุ (ชั้นมิติ — Dim.ghost) ไม่เหยียบน้ำแข็ง/กับดัก ไม่ชนใคร
  const ghost = Dim.ghost(p);
  const entry = s <= 1 && !ghost ? path.findIndex((t, i) => i > 0 && Board.isIce(map, t.x, t.y)) : -1;
  const walk = entry > 0 ? path.slice(0, entry + 1) : path;
  const bodyAt = (t) => ({ x: t.x, y: t.y, size: s });
  // ซุ่มโจมตีแบบ Fire Emblem: เดินชนคนที่มองไม่เห็น = หยุดช่องก่อนหน้า (ถอยไปช่องว่างช่องล่าสุดถ้าช่องนั้นมีเพื่อนยืน)
  //  การเดินของตานี้จบทันที (ย้อน/เดินต่อไม่ได้) แต่ยังโจมตี/ใช้สกิลได้ · คนล่องหนที่ถูกชนปรากฏตัว (Visibility.onBump)
  const hiddenAt = (t) => all.find((u) => u.id !== p.id && !seen.includes(u) && Board.dist(bodyAt(t), u) === 0);
  const bumpIdx = ghost ? -1 : walk.findIndex((t, i) => i > 0 && hiddenAt(t));
  // กับดักบนทางเดิน (ฮุค broadcast walkTrap — ดิเอโก้: ตาข่ายล่องหน): เหยียบช่องแรกที่มีกับดัก = หยุดตรงนั้น การเดินของตานี้จบ
  //  (ย้อน/เดินต่อไม่ได้ · ยังโจมตี/ใช้สกิลได้) แล้วกับดักทำงาน (spring — ดึง/ตรึงเอง) · ก่อนชนคนที่มองไม่เห็นเท่านั้น
  const trap = s <= 1 && !ghost ? walkTrapOf(p, walk) : null;
  if (trap && (bumpIdx < 0 || trap.index < bumpIdx)) {
    const walked = walk.slice(0, trap.index + 1);
    p.pos = { x: walked[walked.length - 1].x, y: walked[walked.length - 1].y };
    smashAlong(p, walked, had.smashed);
    act.path = animOf(walked);
    afterWalk(p, walked, null, act.path, had.ice);
    act.moved = true;
    act.trail = walked;
    act.locked = true;
    combat.runHook(trap.mod, "springTrap", engine, p, trap.tile, trap.info);
    view.broadcastState();
    return true;
  }
  if (bumpIdx > 0) {
    const hidden = hiddenAt(walk[bumpIdx]);
    let stop = bumpIdx - 1;
    while (stop > 0 && all.some((u) => u.id !== p.id && Board.dist(bodyAt(walk[stop]), u) === 0)) stop--;
    const walked = walk.slice(0, stop + 1);
    p.pos = { x: walked[walked.length - 1].x, y: walked[walked.length - 1].y };
    smashAlong(p, walked, had.smashed);
    act.path = animOf(walked);
    afterWalk(p, walked, null, act.path, had.ice);
    act.moved = walked.length > 1;
    act.trail = walked;
    act.locked = true;
    act.ambush = { x: walk[bumpIdx].x, y: walk[bumpIdx].y };
    if (act.dismount && p.pos.x === act.from.x && p.pos.y === act.from.y) { p.mountId = act.dismount; act.dismount = null; } // ชนตั้งแต่ก้าวแรก = ยังอยู่บนหลัง
    Visibility.onBump(p, match.players[hidden.id]);
    trampleAlong(p, walked, act.path);
    view.broadcastState();
    return true;
  }
  const end = walk[walk.length - 1];
  act.path = animOf(walk);
  act.trail = walk;
  p.pos = { x: end.x, y: end.y };
  smashAlong(p, walk, had.smashed);
  act.moved = true;
  if (entry <= 0) {
    afterWalk(p, walk, null, act.path, had.ice);
    trampleAlong(p, walk, act.path);
    view.broadcastState();
    return true;
  }
  // ไถล → จบการเดิน (ย้อน/เดินต่อไม่ได้ · ยังใช้สกิล/โจมตีได้) · ไถลชนศัตรูด้วยฮุค slideStrike (Ice Spike) = นับเป็นการโจมตี จบตา
  const ctx = Ice.begin();
  ctx.events.push({ kind: "walk", id: p.id, path: act.path.map((t) => ({ x: t.x, y: t.y })) });
  const a = walk[walk.length - 2];
  combat.withEffectSource(p, () => Ice.resolveEntry(p, { x: end.x - a.x, y: end.y - a.y }, ctx));
  act.locked = true;
  act.slid = true;
  // เส้นทางของตานี้ = เดิน + ไถลของตัวเอง (ฉากบนกระดานเล่นตาม iceFx · path ไว้ให้ส่วนอื่นอ่าน)
  const own = ctx.events.find((e) => e.kind === "slide" && e.id === p.id);
  if (own) act.path = [...act.path, ...own.path.slice(1)];
  afterWalk(p, walk, ctx, null, had.ice);
  Ice.flush(ctx);
  const struck = ctx.strikes.some((h) => h.by === p.id && h.attack !== false); // ไม้ถูพื้น (เอมิลิโกะ) ไม่นับเป็นการโจมตี
  if (struck || !p.alive) {
    if (struck) { p.didAttackRound = true; Visibility.onHostileAct(p); }
    timers.clearPhaseTimer();
    match.gameState = "ATTACKING";
    timers.startPhaseTimer(Ice.fxSeconds(ctx), finishActor);
  }
  view.broadcastState();
  return true;
}
// หลังเดิน: ฮุค afterWalk ของตัวละคร (Ice Spike: ทุกช่องที่เดิน/ไถลผ่านกลายเป็นธารน้ำแข็ง) — คืนบันทึกไว้ย้อน
//  ctx = เหตุการณ์ไถลของการเดินนี้ (ไม่ไถล = null → ส่ง iceFx แยกเฉพาะผลของฮุค · anim = ภาพเดินของเหตุการณ์ walk)
//  hadIce = ช่องที่การเดินก่อนหน้าในตานี้ทำเป็นน้ำแข็งไว้แล้ว (ยังเห็นอยู่บนจอ) — ไม่เล่นภาพวางน้ำแข็งซ้ำ
function afterWalk(p, walk, ctx, anim, hadIce) {
  const hook = CHAR_HOOKS[p.characterId];
  if (!hook || !hook.afterWalk || !p.alive) return;
  const own = ctx ? ctx : Ice.begin();
  // ไม่ไถล: ฉากเดินเล่นผ่าน iceFx ด้วย (client ค้างตำแหน่งคนในชุดเหตุการณ์ไว้ — ต้องมี walk ให้เดินจริง)
  if (!ctx && anim && anim.length > 1) own.events.push({ kind: "walk", id: p.id, path: anim.map((t) => ({ x: t.x, y: t.y })) });
  const slid = ctx ? ctx.events.filter((e) => e.kind === "slide" && e.id === p.id).flatMap((e) => e.path) : [];
  const recs = hook.afterWalk(engine, p, [...walk, ...slid], own) || [];
  if (hadIce && hadIce.size) {
    for (const e of own.events) if (e.kind === "lay") e.tiles = e.tiles.filter((t) => !hadIce.has(Board.key(t.x, t.y)));
    own.events = own.events.filter((e) => e.kind !== "lay" || e.tiles.length);
  }
  if (!match.action.locked) match.action.iceUndo = [...(match.action.iceUndo || []), ...recs];
  if (!ctx) Ice.flush(own);
}
// ตัวใหญ่เดินพังสิ่งกีดขวาง: ของที่ตัวทับตลอดเส้นทางพังหมด (จำไว้ใน action.smashed — กดย้อนแล้วกลับมาครบ)
//  ส่ง boardFx "smashFx" ให้ client เล่นของแตก (ช่อง + ชนิดของ + ลำดับก้าว) · had = ช่องที่พังไปแล้วในตานี้ (ไม่เล่น/ไม่จดซ้ำ)
function smashAlong(p, path, had) {
  if (!smashes(p) || !path || path.length < 2) return;
  const s = sizeOf(p), map = boardMap(), keys = [], step = {};
  path.forEach((t, i) => {
    for (const f of Board.footprint(t.x, t.y, s)) {
      const k = Board.key(f.x, f.y);
      if (map.terrain[k] && !Ice.isSpikeKind(map.terrain[k]) && !(k in step)) { keys.push(k); step[k] = i; } // หนามน้ำแข็ง = เหยียบ (trampleAlong)
    }
  });
  const broke = breakObstacles(keys);
  if (!broke.length) return;
  match.action.smashed = [...(match.action.smashed || []), ...broke.map((b) => Board.key(b.x, b.y))];
  const fresh = had ? broke.filter((b) => !had.has(Board.key(b.x, b.y))) : broke;
  if (!fresh.length) return;
  match.lastLog.push(`💥 ${p.name} เดินพังสิ่งกีดขวาง ${fresh.length} ช่อง`);
  engine.boardFx("smashFx", { id: p.id, tiles: fresh.map((b) => ({ ...b, step: step[Board.key(b.x, b.y)] })) });
}
// ตัวใหญ่ (2×2 ขึ้นไป) เดินเหยียบหนามน้ำแข็ง (ผู้ใช้ปรับสมดุล 2026-10-20): หนามแตก + ดาเมจ/เชื่องช้า (Ice.trampleSpikes) · เดินต่อได้ไม่หยุดที่หนาม
//  ผลลงจริงย้อนไม่ได้ → ตาเดินเริ่มใหม่จากช่องที่ยืนด้วยระยะที่เหลือ (rebaseMove — ย้อนได้แค่ถึงช่องนี้) ก่อนติดเชื่องช้า (ไม่ตัดระยะของตานี้)
//  ฉาก iceFx: เดินถึงหนาม → หนามแตก → เดินต่อ (anim = ภาพเดินของการเดินนี้ · ต้องเป็นท้ายของ walked ไม่งั้นเดินจบก่อนแล้วแตกทีเดียว)
//  ตายกลางทาง = จบตา (เหมือนไถลชนตาย) · คืน true = มีหนามถูกเหยียบ
function trampleAlong(p, walked, anim) {
  if (sizeOf(p) <= 1 || !walked || walked.length < 2 || !match.board || !match.board.spikes) return false;
  const s = sizeOf(p), steps = [], seenK = new Set();
  walked.forEach((t, i) => {
    if (!i) return;
    const keys = [];
    for (const f of Board.footprint(t.x, t.y, s)) {
      const k = Board.key(f.x, f.y);
      if (!seenK.has(k) && Ice.spikeAt(f.x, f.y)) { seenK.add(k); keys.push(k); }
    }
    if (keys.length) steps.push({ i, keys });
  });
  if (!steps.length) return false;
  if (!match.action.locked) rebaseMove(p);
  const path = anim && anim.length > 1 ? anim : null;
  const off = path ? walked.length - path.length : 0;
  const suffix = !!path && off >= 0 && path.every((t, j) => t.x === walked[off + j].x && t.y === walked[off + j].y);
  const ctx = Ice.begin();
  if (path && !suffix) ctx.events.push({ kind: "walk", id: p.id, path: path.map((t) => ({ x: t.x, y: t.y })) });
  let last = 0;
  for (const st of steps) {
    const ai = st.i - off;
    if (suffix && ai > last) { ctx.events.push({ kind: "walk", id: p.id, path: path.slice(last, ai + 1).map((t) => ({ x: t.x, y: t.y })) }); last = ai; }
    if (!Ice.trampleSpikes(p, st.keys, ctx)) break;
  }
  if (suffix && p.alive && last < path.length - 1) ctx.events.push({ kind: "walk", id: p.id, path: path.slice(last).map((t) => ({ x: t.x, y: t.y })) });
  Ice.flush(ctx);
  if (!p.alive) {
    timers.clearPhaseTimer();
    match.gameState = "ATTACKING";
    timers.startPhaseTimer(Ice.fxSeconds(ctx), finishActor);
  }
  return true;
}
// ช่องแรกบนทางเดิน (ไม่นับช่องเริ่ม) ที่มีกับดักของโมดูลไหน (ฮุค walkTrap(engine, p, tile) → ข้อมูลกับดัก | null) → { index, tile, mod, info } | null
function walkTrapOf(p, walk) {
  for (let i = 1; i < walk.length; i++) {
    for (const mod of CHAR_HOOKS.MODULES) {
      if (typeof mod.walkTrap !== "function" || typeof mod.springTrap !== "function") continue;
      const info = combat.runHook(mod, "walkTrap", engine, p, { x: walk[i].x, y: walk[i].y });
      if (info) return { index: i, tile: { x: walk[i].x, y: walk[i].y }, mod, info };
    }
  }
  return null;
}
// ถอดการเดินของตานี้ออกทั้งหมด: กลับจุดเริ่มตา · ของที่เดินพังกลับมาครบ · ธารน้ำแข็งที่ Ice Spike เดินสร้างหาย
function rewindWalk(p) {
  const a = match.action;
  p.pos = { x: a.from.x, y: a.from.y };
  if (a.dismount) {
    const m = match.players[a.dismount];
    if (m && m.alive && m.pos && m.pos.x === a.from.x && m.pos.y === a.from.y) p.mountId = m.id;
    a.dismount = null;
  }
  restoreObstacles(a.smashed);
  a.smashed = null;
  Ice.undoLay(a.iceUndo);
  a.iceUndo = null;
  a.moved = false;
  a.path = null;
  a.trail = null;
}
// ย้อนกลับช่องเดิม — ได้จนกว่าจะใช้สกิล/ไอเทม/ซื้อของ/โจมตี
function undoMove(id) {
  const p = match.players[id];
  if (!canAct(p, { move: true }) || !match.action.moved || match.action.locked) return false;
  rewindWalk(p);
  view.broadcastState();
  return true;
}
// โจมตีปกติ: เป้าต้องอยู่ในระยะจากช่องที่ยืน · ตีแล้วจบตา (หลังฉากตี/สวน/ถอย)
function attackTarget(id, targetId) {
  return TimeStop.guard(() => strikeTarget(id, targetId));
}
function strikeTarget(id, targetId) {
  const p = match.players[id];
  if (match.action && match.action.noStrike) return false; // lockStrike (ขนมปังของเอมิลิโกะ)
  // ตีจบแล้ว (ก่อนจบตา): ฮุค afterStrike — เอมิลิโกะ: เครื่องดูดฝุ่นหัก 1 ครั้ง
  const done = () => {
    const hook = CHAR_HOOKS[p.characterId];
    if (hook && hook.afterStrike) combat.withEffectSource(p, () => hook.afterStrike(engine, p));
    // ฮุค extraStrike(engine, p) → true = ตีครั้งนี้ไม่จบตา (ใช้ครั้งที่ตุนไว้ — เฟิร์น: ร่ายต่อเนื่อง) → กลับเข้าตาเดินด้วยเวลาที่เหลือ
    //  (เดินยังล็อก · รอ/หมดเวลา = จบตาตามปกติ)
    if (p.alive && p.pos && match.action && match.actorId === p.id && match.gameState !== "GAMEOVER" && hook && hook.extraStrike
      && combat.withEffectSource(p, () => combat.runHook(hook, "extraStrike", engine, p))) {
      if (endTurnPhase.gameOver()) return;
      Ice.flushBursts();
      resumeAction();
      return;
    }
    finishActor();
  };
  // ห่วงเวลาซีโร่: ตีผนึกมิโกะ ("seal:N") — ระยะเหมือนตีคน
  const seal = Zero.sealIndexOf(targetId);
  if (seal >= 0) {
    if (!canAct(p) || !Zero.canHitSeal(p, seal)) return false;
    timers.clearPhaseTimer();
    match.action.locked = true;
    Visibility.onHostileAct(p);
    strikeObject(p, Zero.sealUnit(seal).pos);
    Zero.attackSeal(p, seal, done);
    return true;
  }
  // หนามน้ำแข็ง ("spike:x,y" — Ice Spike): ทุกคนตีได้ · ระยะเหมือนตีคน
  const spikeK = Ice.spikeKeyOf(targetId);
  if (spikeK) {
    if (!canAct(p) || !Ice.canHitSpike(p, spikeK)) return false;
    timers.clearPhaseTimer();
    match.action.locked = true;
    Visibility.onHostileAct(p);
    const [sx, sy] = spikeK.split(",").map(Number);
    strikeObject(p, { x: sx, y: sy });
    Ice.attackSpike(p, spikeK, done);
    return true;
  }
  // ศพ ("corpse:<id>" — เกรย์: สัปเหร่อ): ตีปกติใส่ศพที่ประชิด = เก็บศพ · ฮุค canReapCorpse / reapCorpse (คืนวินาทีของฉาก)
  const dead = typeof targetId === "string" && targetId.startsWith("corpse:") ? match.players[targetId.slice(7)] : null;
  if (dead) {
    const hook = CHAR_HOOKS[p.characterId];
    if (!canAct(p) || (match.action && match.action.noStrike) || !hook || !hook.canReapCorpse || !hook.canReapCorpse(engine, p, dead)) return false;
    timers.clearPhaseTimer();
    match.action.locked = true;
    p.didAttackRound = true;
    const secs = combat.withEffectSource(p, () => hook.reapCorpse(engine, p, dead));
    match.gameState = "ATTACKING";
    timers.startPhaseTimer(Number(secs) > 0 ? secs : 1, done);
    view.broadcastState();
    return true;
  }
  const target = match.players[targetId];
  if (!canAct(p) || !target || !target.alive || !target.pos || target.id === p.id) return false;
  if (combat.sameTeam(p, target)) return false;
  if (!Dim.same(p, target)) return false; // ชั้นมิติ (server/dimension.js): คนละชั้นตีกันไม่ได้
  if (Visibility.hiddenFromUnit(p, target)) return false; // มองไม่เห็น = ตีไม่ได้ (ม่านแดง: นับจากตาของตัวที่ตีเอง)
  if (!canStrike(p, target)) return false;
  timers.clearPhaseTimer();
  match.action.locked = true;
  Visibility.onHostileAct(p); // ตีจากในพุ่ม = โผล่จนจบเทิร์น · นักบินปริศนาปรากฏตัว
  attack.boardAttack(p, target, done);
  return true;
}
// ตีปกติใส่ของบนกระดาน (ผนึกมิโกะ / หนามน้ำแข็ง) — ฮุค onStrikeObject(engine, p, at) ก่อนลงผล (ไจโร: ใช้ลูกเหล็ก ลูกตกช่องนั้น)
function strikeObject(p, at) {
  const hook = CHAR_HOOKS[p.characterId];
  if (hook && hook.onStrikeObject) combat.withEffectSource(p, () => combat.runHook(hook, "onStrikeObject", engine, p, { x: at.x, y: at.y }));
}
// "รอ" = จบตาโดยไม่โจมตี
function waitAction(id) {
  const p = match.players[id];
  if (!canAct(p, { move: true })) return false;
  finishActor();
  return true;
}
// จบตาของคนที่กำลังเดิน: ผลของช่อง (จุดฟื้นฟู / ช่องพิเศษ) แล้วไปคนถัดไป
//  ระบบคู่ (server/duo.js): ตัวนี้จบ → ยังมีอีกตัว = สลับไปคุมต่อด้วยเวลาที่เหลือ · หมดเวลา = จบทั้งฝ่าย
//  เดินต่อหลังจบตา (ฮุค cantoMov — เอมิลิโกะ): ตี/รอแล้วได้เดินอีก N ช่องก่อนจบจริง (หมดเวลา = ไม่ได้)
function finishActor() {
  const expired = !!(match.action && match.action.expired);
  timers.clearPhaseTimer();
  Ice.flushBursts(); // ระเบิดติดตัว 3 ของ Ice Spike ที่ค้างไว้ระหว่างฉากตี
  const p = match.players[match.actorId];
  // ผลจบตาลงไปแล้ว (เรียกซ้ำหลังพักฉากของฮุค afterActorEnd) = ข้ามไปเลือกตัว/คนถัดไป
  if (!(match.action && match.action.endDone)) {
    if (!expired && startCanto(p)) return;
    // ตาเดินพิเศษ: ฮุค extraTurnOutro(engine, p, kind) → วินาทีพักฉากก่อนจบตาจริง (ดิเอโก้: เวลาเดินต่อ — ดาเมจที่ค้างลงพร้อมกัน) · ครั้งเดียวต่อตา
    if (p && match.action && match.action.extra && !match.action.outro) {
      match.action.outro = true;
      const hook = CHAR_HOOKS[p.characterId];
      const secs = hook && hook.extraTurnOutro ? Number(combat.withEffectSource(p, () => combat.runHook(hook, "extraTurnOutro", engine, p, match.action.extra))) : 0;
      if (secs > 0 && match.gameState !== "GAMEOVER") {
        match.gameState = "ATTACKING";
        timers.startPhaseTimer(secs, finishActor);
        view.broadcastState();
        return;
      }
    }
    const endHook = p && CHAR_HOOKS[p.characterId];
    // ฮุค beforeActorEnd(engine, p) → true = ตัวละครพักตาเล่นฉากก่อนจบตา (ตั้งฉากเอง เช่น pausePlayingForCutscene(…, { endTurn: true })
    //  แล้ว finishActor ถูกเรียกอีกครั้ง) · ครั้งเดียวต่อตา · รอ/หมดเวลาก็ถึง (เฟิร์น: ชาร์จครบ 3 เทิร์นไม่ยิง = ยิงเอง)
    if (p && p.alive && match.action && !match.action.endScene && endHook && endHook.beforeActorEnd && match.gameState !== "GAMEOVER") {
      match.action.endScene = true;
      if (combat.withEffectSource(p, () => combat.runHook(endHook, "beforeActorEnd", engine, p))) return;
    }
    // ฮุค onActorEnd(engine, p): ตาเดินของตัวนี้จบจริง (หลังเดินต่อ/ก่อนผลของช่อง) — ไจโร: เสริมท่าไม้ตายที่ไม่ได้ใช้หมดลง
    if (endHook && endHook.onActorEnd) combat.withEffectSource(p, () => combat.runHook(endHook, "onActorEnd", engine, p));
    Ride.cancelAsk(); // คำขอขี่ที่ยังไม่ได้ตอบหมดอายุพร้อมตา
    if (p && match.action && match.action.dismount && !Ride.riding(p)) Ride.dismounted(p, "walk"); // เดินลงจากหลังตานี้ (ไม่ได้ย้อนกลับ)
    if (Ride.riding(p)) Ride.unseat(p); // ขี่อยู่ = ไม่ได้ยืนบนช่อง (ไม่ได้ผลของช่อง) · ขึ้นหลังต่อ
    else if (!Dim.ghost(p)) endUnitTile(p); // เดินทะลุ (ชั้นมิติ — หลบสายตา) = ไม่ได้ผลของช่อง
    // ฮุค broadcast afterActorEnd(engine, p) → วินาที: ตาเดินของใครก็ได้จบ (หลังผลของช่อง ก่อนไปตัว/คนถัดไป)
    //  > 0 = ค้างฉาก ATTACKING เท่านั้นแล้วมาต่อที่นี่ (วาเลนไทน์: ตัวที่เหมือนกันวิ่งเข้าหา + ชน) · ผลจบตาไม่ลงซ้ำ (endDone)
    const hold = afterActorEnd(p);
    if (!match.action) match.action = { from: p && p.pos ? { ...p.pos } : null, moved: false, locked: true, expired };
    match.action.endDone = true;
    if (hold > 0 && match.gameState !== "GAMEOVER") {
      match.gameState = "ATTACKING";
      timers.startPhaseTimer(hold, finishActor);
      view.broadcastState();
      return;
    }
  }
  // ยูนิตที่ถูกเรียกแบบคุมได้ (ร่างแยก — server/summon.js) ที่ยังไม่ได้เดิน = ตาของฝ่ายนี้เล่นต่อแบบระบบคู่ (เรียกกลางตา → ตาเดียวกัน)
  if (!match.duo && p && !p.summon && Duo.turnUnits(p).length > 1 && match.gameState !== "GAMEOVER") {
    match.duo = { ownerId: Duo.sideKey(p), acts: {}, done: {} };
  }
  if (match.duo) {
    if (endTurnPhase.gameOver()) return;
    Duo.unitDone(p);
    // หมดเวลา = จบทั้งฝ่าย · ยกเว้นร่างแยก (ยูนิตที่ถูกเรียก) ที่ยังมีเวลาของตัวเอง
    const next = Duo.nextUnit({ summonsOnly: expired });
    if (next) {
      Duo.switchTo(next);
      resumeAction(next.summon ? Summon.CONTROL_SECONDS : undefined);
      return;
    }
    // หมดเวลา: ตัวที่สลับออกไปก่อนแล้วยังไม่จบ ได้ผลของช่องที่ยืนด้วย
    const owner = match.players[match.duo.ownerId];
    if (expired) for (const u of Duo.unitsOf(owner)) if (!match.duo.done[u.id] && (!p || u.id !== p.id)) endUnitTile(u);
    match.duo = null;
  }
  const resume = match.action && match.action.resume;
  match.action = null;
  if (resume) { resumeFrom(resume); return; } // ตาพิเศษที่แทรกกลางตาคนอื่น = กลับไปตานั้นต่อ
  nextActor();
}
// ฮุค broadcast afterActorEnd(engine, p) ของทุกโมดูล → วินาทีพักฉากรวม (ค่ามากสุด) · ฮุคลงผลเอง
function afterActorEnd(p) {
  if (!p) return 0;
  let hold = 0;
  const called = new Set();
  for (const mod of CHAR_HOOKS.MODULES) {
    if (typeof mod.afterActorEnd !== "function" || called.has(mod.afterActorEnd)) continue;
    called.add(mod.afterActorEnd);
    hold = Math.max(hold, Number(combat.runHook(mod, "afterActorEnd", engine, p)) || 0);
  }
  return hold;
}
// กลับเข้าตาเดิน (ระบบคู่สลับตัว / เดินต่อหลังจบตา) ด้วยเวลาที่เหลือของตานี้
//  (match.actionLeft = เวลาที่เหลือตอนตาถูกพัก — timers.clearPhaseTimer จดไว้ระหว่างเฟส ACTION)
//  secs = เวลาของตัวที่คุมต่อ (ร่างแยก — Summon.CONTROL_SECONDS) · ไม่ส่ง = เวลาที่เหลือ
function resumeAction(secs) {
  match.gameState = "ACTION";
  timers.startPhaseTimer(secs > 0 ? secs : Math.max(3, match.actionLeft || 0), actionTimeUp);
  view.broadcastState();
}
// เดินต่อหลังจบตา (canto): ฮุค cantoMov(engine, p) → ระยะ · ครั้งเดียวต่อตา · ทำได้แค่เดิน/ย้อน/รอ
function startCanto(p) {
  if (!p || !p.alive || !p.pos || !match.action || match.action.canto || match.action.noStrike) return false;
  const hook = CHAR_HOOKS[p.characterId];
  const n = hook && hook.cantoMov ? hook.cantoMov(engine, p) : 0;
  if (!(n > 0)) return false;
  if (endTurnPhase.gameOver()) return true;
  match.action = { from: { ...p.pos }, moved: false, locked: false, canto: true, cantoMov: n };
  resumeAction();
  return true;
}
// ผลของช่องที่ยืนตอนจบตาของตัวนี้ (จุดฟื้นฟู / ช่องพิเศษ / ของในห่วงเวลาซีโร่)
function endUnitTile(p) {
  const map = boardMap();
  // ตัวใหญ่: ช่องไหนของตัวทับจุดฟื้นฟูก็ได้ (ฟื้นครั้งเดียว)
  if (p && p.alive && p.pos && Board.footprint(p.pos.x, p.pos.y, sizeOf(p)).some((t) => Board.isHeal(map, t.x, t.y)) && combat.healHp(p, 1) > 0) {
    const heal = Board.TERRAIN_INFO[map.healKind || "heal"];
    match.lastLog.push(`${heal.icon} ${p.name} ยืนบน${heal.name} — ฟื้นพลังชีวิต +1`);
  }
  if (p && p.alive && p.pos) tileEndEffect(p);
  if (p && p.alive && p.pos) Zero.collectPickup(p); // ห่วงเวลาซีโร่: จบตาบนของฟื้นพลังชีวิต = เก็บ
}
// ผลของช่องพิเศษตอนจบตาบนช่องนั้น (GRID_PLAN §3.1) — กติกาอยู่ที่ Board.endTurnTile · ที่นี่แค่ลงผลกับผู้เล่น
//  หนามพิษ = ติดพิษร้าย · ลาวา = เสีย 1 (ลดเกราะก่อน) · น้ำวน = โดนดัน 1 ช่องตามกระแส (ผลของช่องใหม่ไม่ทำงานซ้ำในตานี้ · ลงน้ำแข็ง = ไถลต่อ)
//  ตัวใหญ่: ทับหนามพิษ/ลาวาช่องไหนก็โดน (ครั้งเดียวต่อจบตา · ลาวาก่อน) · น้ำวนดันตัวใหญ่ไม่ได้
function tileEndEffect(p) {
  let fx;
  if (sizeOf(p) > 1) {
    const map = boardMap();
    const kinds = Board.footprint(p.pos.x, p.pos.y, sizeOf(p)).map((t) => Board.endTurnTile(map, t.x, t.y, []) || null).filter(Boolean);
    fx = kinds.find((f) => f.kind === "lava") || kinds.find((f) => f.kind === "thorns") || null;
  } else {
    fx = Board.endTurnTile(boardMap(), p.pos.x, p.pos.y, boardUnits(), { selfId: p.id, blocked: boardBlocked(p.id) });
  }
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
      const from = { ...p.pos };
      p.pos = { x: fx.to.x, y: fx.to.y };
      match.lastLog.push(`${info.icon} ${p.name} โดน${info.name}ดันไป 1 ช่อง`);
      // ดันลงน้ำแข็ง = ไถลต่อตามกระแส + ชนตามกติกาไถล (ไม่มีผู้ผลัก — ชนหนามยังนับเจ้าของหนาม)
      const v = Board.LINE_DIRS[fx.dir];
      Ice.forcedSlides([{ id: p.id, from, to: { ...p.pos }, dir: { x: v[0], y: v[1] } }]);
    } else {
      match.lastLog.push(`${info.icon} ${p.name} อยู่ใน${info.name} แต่ช่องข้างหน้าไม่ว่าง — ไม่ขยับ`);
    }
  }
  return fx;
}
