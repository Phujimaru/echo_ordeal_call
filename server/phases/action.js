// เฟสกระดาน (ระบบใหม่แบบ Fire Emblem — GRID_PLAN.md §4): ลำดับเดิน → ตาเดินของแต่ละคน
//  ORDER  = เปิดแต้มแล้วเรียงลำดับเดิน (แบนเนอร์ "ลำดับเดิน")
//  ACTION = ตาของ match.actorId: เดิน 1 ครั้ง (ย้อนได้) · สกิล/ไอเทม/ซื้อของ (ทำแล้วเดินไม่ได้อีก) · โจมตี/รอ = จบตา
//  ATTACKING = ฉากตี/ตีสวน/ถอย ของคนที่กำลังเดินอยู่ (จบฉากแล้วไปคนถัดไป)
//  กติกากระดานล้วน (เดิน/ระยะ/สวน/ถอย) อยู่ใน server/board.js — ไฟล์นี้แค่ต่อเข้ากับ match
// export ก่อน require: ไฟล์ใน server/ require วนกันเอง — function declaration ถูก hoist จึงพร้อมใช้ตั้งแต่บรรทัดแรก
Object.assign(module.exports, {
  placeOnBoard, boardMap, boardUnits, boardBlocked, movOf, baseMovOf, rangeOf, turnOrderOf,
  beginOrder, nextActor, canAct, lockMove, lockStrike, moveTo, undoMove, attackTarget, waitAction, finishActor,
  removeFromOrder, hasActed, areaRange, resolveArea, areaTiles, tileArea, counters, tileEndEffect,
  sizeOf, boxOf, resizeUnit, breakObstacles, smashes, tileFree, chargeTiles, lanes, canStrike, laneVictims,
  actionTimeUp, hopTiles, stuck, nearFreeTile, resumeAction,
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
// แผนที่ที่ใช้ตรวจการเดินทีละก้าว: ไม่นับธารน้ำแข็งที่ฮุค afterWalk วางใหม่ในตานี้ (action.iceUndo — ช่องที่เดิมไม่มีน้ำแข็ง)
//  ไม่งั้นรอยน้ำแข็งของ Ice Spike เองกลายเป็นโหนดไถลใน reachable แล้วตัดทางเดินต่อ · ผลของก้าวจริง (ไถล) ยังใช้ boardMap()
function stepMap() {
  const fresh = ((match.action && match.action.iceUndo) || []).filter((r) => r && !r.prev).map((r) => r.k);
  if (!fresh.length || !match.board || !match.board.ice) return boardMap();
  const ice = { ...match.board.ice };
  for (const k of fresh) delete ice[k];
  return layeredMap({ ...match.board, ice }, Board.mapOf(match.board.area));
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
function boardUnits() {
  return combat.alivePlayers()
    .filter((p) => p.pos)
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
  const hook = CHAR_HOOKS[p.characterId];
  const own = hook && hook.mov ? hook.mov(p) : null;
  if (Number.isFinite(own)) return own;
  const ch = CHAR_BY_ID[p.characterId];
  return ch && Number.isFinite(ch.mov) ? ch.mov : DEFAULT_MOV;
}
// ระยะเดินเทิร์นนี้: ไพ่แตก −1 · เชื่องช้า −1 (Ice Spike — ไม่ซ้อน)
//  เดินต่อหลังจบตา (canto — ฮุค cantoMov · เอมิลิโกะ) = ค่าของฮุคตรงๆ
function movOf(p) {
  if (match.action && match.action.canto && match.actorId === p.id) return match.action.cantoMov || 0;
  return Math.max(0, baseMovOf(p) - (cardDeck.bustedOf(p) ? 1 : 0) - (Ice.slowed(p) ? 1 : 0));
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
  combat.withEffectSource(p, () => {
    for (const id of plan.displaced) {
      const o = match.players[id];
      if (!o || !o.alive || !o.pos) continue;
      const before = { ...o.pos };
      const to = Board.pushOutTile(boardMap(), before, box, boardUnits().filter((u) => u.id !== o.id), { selfId: o.id, blocked: boardBlocked(o.id) });
      if (to) o.pos = { x: to.x, y: to.y };
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
  return newSize;
}

// ช่องนี้ยืนได้ไหม: ในกระดาน ไม่ใช่สิ่งกีดขวาง/ร้านค้า และไม่มีใครยืน (ยกเว้น selfId)
function tileFree(x, y, selfId = null) {
  return Board.freeTile(boardMap(), x, y, boardUnits(), selfId, boardBlocked(selfId));
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
    if (Visibility.hiddenFrom(p, t)) return null;
    return Board.dist(boxOf(p), boxOf(t)) <= range ? [t.id] : null;
  }
  const units = area.hostile ? boardUnits() : boardUnits().filter((u) => !Visibility.hiddenFrom(p, match.players[u.id]));
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
  const alive = Duo.cardHolders().filter((p) => Duo.unitsOf(p).some((u) => u.alive && u.pos));
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
    const owner = match.players[id];
    if (!owner) continue;
    // ระบบคู่ (server/duo.js): ตาของผู้เล่น = ทุกตัวของฝ่าย (ตัวละครทั่วไปมีตัวเดียว)
    let units = Duo.unitsOf(owner).filter((u) => u.alive && u.pos);
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
    const secs = actionSeconds();
    if (owner.duoWith) Duo.startTurn(owner, units, secs);
    else {
      match.duo = null;
      match.actorId = id;
      match.action = { from: { ...owner.pos }, moved: false, locked: false };
    }
    match.gameState = "ACTION";
    timers.startPhaseTimer(secs, actionTimeUp);
    view.broadcastState();
    return;
  }
}
// ผู้เล่นออกจากเกมกลางเทิร์น: ถ้าเป็นคนที่กำลังเดิน ข้ามไปคนถัดไปเลย
//  (กำลังเล่นฉากตีอยู่ = ปล่อยให้ตัวจับเวลาของฉากพาไปคนถัดไปเอง ไม่งั้นข้ามสองคน)
function removeFromOrder(playerId) {
  const mine = match.actorId === playerId || (match.duo && match.duo.ownerId === playerId);
  if (mine && match.gameState === "ACTION") { match.duo = null; nextActor(); }
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
//  step = เดินทีละช่องด้วยคีย์บอร์ด (W A S D): ไปช่องติดกันได้เรื่อยๆ ตราบที่ช่องนั้นอยู่ในระยะเดินจาก "จุดเริ่มตา" (action.from)
//   — เหมือนลากเคอร์เซอร์แบบ Fire Emblem แต่ตัวละครเดินตามทันที · กลับมาจุดเริ่ม = เท่ากับย้อน · ยังใช้ได้จนกว่าจะล็อก (ใช้สกิล/ไอเทม/ซื้อ/ตี)
function moveTo(id, x, y, { step = false } = {}) {
  const p = match.players[id];
  if (!canAct(p, { move: true }) || match.action.locked) return false;
  if (match.action.moved && !step) return false;
  if (!Number.isInteger(x) || !Number.isInteger(y)) return false;
  if (step && Board.dist(p.pos, { x, y }) !== 1) return false;
  const origin = match.action.from;
  const s = sizeOf(p);
  const map = boardMap();
  // คิดเส้นทางจากเท่าที่ผู้เดินมองเห็น — คนที่มองไม่เห็น (ล่องหน/พุ่มหญ้า) ไม่ขวางตอนวางเส้นทาง แต่ชนจริงตอนเดิน (ด้านล่าง)
  //  ตัวใหญ่: คีย์ของระยะเดิน = ช่องมุมบนซ้าย · ตั้งแต่ 3×3 เดินพังสิ่งกีดขวางได้ (smash)
  const all = boardUnits();
  const seen = all.filter((u) => !Visibility.hiddenFrom(p, match.players[u.id]));
  const reach = Board.reachable(step ? stepMap() : map, { id: p.id, ...origin, size: s }, movOf(p), seen, { isAlly: unitAlly, blocked: boardBlocked(p.id), hop: hopTiles(), smash: smashes(p) });
  const prev = { x: p.pos.x, y: p.pos.y };
  // เดินทีละช่องเข้าน้ำแข็ง: ช่องนั้นเป็นจุดเริ่มไถล (ไม่ใช่ช่องที่หยุดได้ จึงไม่อยู่ใน reach) — ตรวจก้าวจากช่องที่ยืนเอง
  //  ก้าวกลับช่องเริ่มตา = ย้อนการเดินเสมอ (Ice Spike วางน้ำแข็งไว้ที่ช่องเริ่มแล้วก็ตาม)
  if (step && match.action.moved && x === origin.x && y === origin.y) return undoMove(id);
  const stepIce = step && s <= 1 && Board.isIce(map, x, y);
  if (stepIce) {
    const at = reach.get(Board.key(prev.x, prev.y));
    if (!at || at.d + Board.moveCost(map, x, y) > movOf(p) || !Board.freeTile(map, x, y, seen, p.id, boardBlocked(p.id))) return false;
  } else {
    const node = reach.get(Board.key(x, y));
    if (!node) return false;
    if (node.d === 0) {
      if (!step || !match.action.moved) return false;
      return undoMove(id);
    }
  }
  const path = step ? [prev, { x, y }] : Board.pathTo(reach, x, y);
  // น้ำแข็ง (GRID_PLAN §7.9): ช่องน้ำแข็งช่องแรกที่เดินเข้า = จุดเริ่มไถล — เดินจริงแค่ถึงช่องนั้น ที่เหลือคิดใหม่ด้วยตำแหน่งจริงของทุกคน
  const entry = s <= 1 ? path.findIndex((t, i) => i > 0 && Board.isIce(map, t.x, t.y)) : -1;
  const walk = entry > 0 ? path.slice(0, entry + 1) : path;
  const bodyAt = (t) => ({ x: t.x, y: t.y, size: s });
  // ซุ่มโจมตีแบบ Fire Emblem: เดินชนคนที่มองไม่เห็น = หยุดช่องก่อนหน้า (ถอยไปช่องว่างช่องล่าสุดถ้าช่องนั้นมีเพื่อนยืน)
  //  การเดินของตานี้จบทันที (ย้อน/เดินต่อไม่ได้) แต่ยังโจมตี/ใช้สกิลได้ · คนล่องหนที่ถูกชนปรากฏตัว (Visibility.onBump)
  const hiddenAt = (t) => all.find((u) => u.id !== p.id && !seen.includes(u) && Board.dist(bodyAt(t), u) === 0);
  const bumpIdx = walk.findIndex((t, i) => i > 0 && hiddenAt(t));
  if (bumpIdx > 0) {
    const hidden = hiddenAt(walk[bumpIdx]);
    let stop = bumpIdx - 1;
    while (stop > 0 && all.some((u) => u.id !== p.id && Board.dist(bodyAt(walk[stop]), u) === 0)) stop--;
    const walked = walk.slice(0, stop + 1);
    p.pos = { x: walked[walked.length - 1].x, y: walked[walked.length - 1].y };
    smashAlong(p, walked);
    afterWalk(p, walked, null);
    match.action.path = walked.length > 1 ? walked : null;
    match.action.moved = match.action.moved || walked.length > 1;
    match.action.locked = true;
    match.action.ambush = { x: walk[bumpIdx].x, y: walk[bumpIdx].y };
    Visibility.onBump(p, match.players[hidden.id]);
    view.broadcastState();
    return true;
  }
  const end = walk[walk.length - 1];
  match.action.path = walk;
  p.pos = { x: end.x, y: end.y };
  smashAlong(p, walk);
  match.action.moved = true;
  if (entry <= 0) {
    afterWalk(p, walk, null);
    view.broadcastState();
    return true;
  }
  // ไถล → จบการเดิน (ย้อน/เดินต่อไม่ได้ · ยังใช้สกิล/โจมตีได้) · ไถลชนศัตรูด้วยฮุค slideStrike (Ice Spike) = นับเป็นการโจมตี จบตา
  const ctx = Ice.begin();
  ctx.events.push({ kind: "walk", id: p.id, path: walk.map((t) => ({ x: t.x, y: t.y })) });
  const a = walk[walk.length - 2];
  combat.withEffectSource(p, () => Ice.resolveEntry(p, { x: end.x - a.x, y: end.y - a.y }, ctx));
  match.action.locked = true;
  match.action.slid = true;
  // เส้นทางของตานี้ = เดิน + ไถลของตัวเอง (ฉากบนกระดานเล่นตาม iceFx · path ไว้ให้ส่วนอื่นอ่าน)
  const own = ctx.events.find((e) => e.kind === "slide" && e.id === p.id);
  if (own) match.action.path = [...walk, ...own.path.slice(1)];
  afterWalk(p, walk, ctx);
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
//  ctx = เหตุการณ์ไถลของการเดินนี้ (ไม่ไถล = null → ส่ง iceFx แยกเฉพาะผลของฮุค)
function afterWalk(p, walk, ctx) {
  const hook = CHAR_HOOKS[p.characterId];
  if (!hook || !hook.afterWalk || !p.alive) return;
  const own = ctx ? ctx : Ice.begin();
  // ไม่ไถล: ฉากเดินเล่นผ่าน iceFx ด้วย (client ค้างตำแหน่งคนในชุดเหตุการณ์ไว้ — ต้องมี walk ให้เดินจริง)
  if (!ctx && walk.length > 1) own.events.push({ kind: "walk", id: p.id, path: walk.map((t) => ({ x: t.x, y: t.y })) });
  const slid = ctx ? ctx.events.filter((e) => e.kind === "slide" && e.id === p.id).flatMap((e) => e.path) : [];
  const recs = hook.afterWalk(engine, p, [...walk, ...slid], own) || [];
  if (!match.action.locked) match.action.iceUndo = [...(match.action.iceUndo || []), ...recs];
  if (!ctx) Ice.flush(own);
}
// ตัวใหญ่เดินพังสิ่งกีดขวาง: ของที่ตัวทับตลอดเส้นทางพังหมด (จำไว้ใน action.smashed — กดย้อนแล้วกลับมาครบ)
//  ส่ง boardFx "smashFx" ให้ client เล่นของแตก (ช่อง + ชนิดของ + ลำดับก้าว)
function smashAlong(p, path) {
  if (!smashes(p) || !path || path.length < 2) return;
  const s = sizeOf(p), map = boardMap(), keys = [], step = {};
  path.forEach((t, i) => {
    for (const f of Board.footprint(t.x, t.y, s)) {
      const k = Board.key(f.x, f.y);
      if (map.terrain[k] && !(k in step)) { keys.push(k); step[k] = i; }
    }
  });
  const broke = breakObstacles(keys);
  if (!broke.length) return;
  match.action.smashed = [...(match.action.smashed || []), ...broke.map((b) => Board.key(b.x, b.y))];
  match.lastLog.push(`💥 ${p.name} เดินพังสิ่งกีดขวาง ${broke.length} ช่อง`);
  engine.boardFx("smashFx", { id: p.id, tiles: broke.map((b) => ({ ...b, step: step[Board.key(b.x, b.y)] })) });
}
// ย้อนกลับช่องเดิม — ได้จนกว่าจะใช้สกิล/ไอเทม/ซื้อของ/โจมตี · ของที่เดินพังไปกลับมาครบ
function undoMove(id) {
  const p = match.players[id];
  if (!canAct(p, { move: true }) || !match.action.moved || match.action.locked) return false;
  p.pos = { x: match.action.from.x, y: match.action.from.y };
  restoreObstacles(match.action.smashed);
  match.action.smashed = null;
  Ice.undoLay(match.action.iceUndo); // ธารน้ำแข็งที่ Ice Spike เดินสร้าง
  match.action.iceUndo = null;
  match.action.moved = false;
  match.action.path = null;
  view.broadcastState();
  return true;
}
// โจมตีปกติ: เป้าต้องอยู่ในระยะจากช่องที่ยืน · ตีแล้วจบตา (หลังฉากตี/สวน/ถอย)
function attackTarget(id, targetId) {
  const p = match.players[id];
  if (match.action && match.action.noStrike) return false; // lockStrike (ขนมปังของเอมิลิโกะ)
  // ตีจบแล้ว (ก่อนจบตา): ฮุค afterStrike — เอมิลิโกะ: เครื่องดูดฝุ่นหัก 1 ครั้ง
  const done = () => {
    const hook = CHAR_HOOKS[p.characterId];
    if (hook && hook.afterStrike) combat.withEffectSource(p, () => hook.afterStrike(engine, p));
    finishActor();
  };
  // ห่วงเวลาซีโร่: ตีผนึกมิโกะ ("seal:N") — ระยะเหมือนตีคน
  const seal = Zero.sealIndexOf(targetId);
  if (seal >= 0) {
    if (!canAct(p) || !Zero.canHitSeal(p, seal)) return false;
    timers.clearPhaseTimer();
    match.action.locked = true;
    Visibility.onHostileAct(p);
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
    Ice.attackSpike(p, spikeK, done);
    return true;
  }
  const target = match.players[targetId];
  if (!canAct(p) || !target || !target.alive || !target.pos || target.id === p.id) return false;
  if (combat.sameTeam(p, target)) return false;
  if (Visibility.hiddenFrom(p, target)) return false; // มองไม่เห็น = ตีไม่ได้
  if (!canStrike(p, target)) return false;
  timers.clearPhaseTimer();
  match.action.locked = true;
  Visibility.onHostileAct(p); // ตีจากในพุ่ม = โผล่จนจบเทิร์น · นักบินปริศนาปรากฏตัว
  attack.boardAttack(p, target, done);
  return true;
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
  if (!expired && startCanto(p)) return;
  endUnitTile(p);
  if (match.duo) {
    if (endTurnPhase.gameOver()) return;
    Duo.unitDone(p);
    const next = expired ? null : Duo.nextUnit();
    if (next) {
      Duo.switchTo(next);
      resumeAction();
      return;
    }
    // หมดเวลา: ตัวที่สลับออกไปก่อนแล้วยังไม่จบ ได้ผลของช่องที่ยืนด้วย
    const owner = match.players[match.duo.ownerId];
    if (expired) for (const u of Duo.unitsOf(owner)) if (!match.duo.done[u.id] && (!p || u.id !== p.id)) endUnitTile(u);
    match.duo = null;
  }
  match.action = null;
  nextActor();
}
// กลับเข้าตาเดิน (ระบบคู่สลับตัว / เดินต่อหลังจบตา) ด้วยเวลาที่เหลือของตานี้
//  (match.actionLeft = เวลาที่เหลือตอนตาถูกพัก — timers.clearPhaseTimer จดไว้ระหว่างเฟส ACTION)
function resumeAction() {
  match.gameState = "ACTION";
  timers.startPhaseTimer(Math.max(3, match.actionLeft || 0), actionTimeUp);
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
//  หนามพิษ = ติดพิษร้าย · ลาวา = เสีย 1 (ลดเกราะก่อน) · น้ำวน = โดนดัน 1 ช่องตามกระแส (ผลของช่องใหม่ไม่ทำงานซ้ำในตานี้)
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
      p.pos = { x: fx.to.x, y: fx.to.y };
      match.lastLog.push(`${info.icon} ${p.name} โดน${info.name}ดันไป 1 ช่อง`);
    } else {
      match.lastLog.push(`${info.icon} ${p.name} อยู่ใน${info.name} แต่ช่องข้างหน้าไม่ว่าง — ไม่ขยับ`);
    }
  }
  return fx;
}
