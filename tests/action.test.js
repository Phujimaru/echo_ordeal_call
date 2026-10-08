// วงจรเทิร์นบนกระดาน (GRID_PLAN.md §4–§6): เปิดไพ่ → ลำดับเดิน → ตาเดิน (เดิน/ย้อน/ตี/สวน/ถอย/รอ) — ผ่าน engine จริง
// startMatch() พักรอฉากแผนที่การเดินทางก่อนแจกไพ่ — เทสต์นี้ต้องการเทิร์นแรกทันที
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine, resolveRound } = require('../server.js');
const Board = require('../server/board.js');

const realRandom = Math.random;
const blank = (id, characterId, position) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId: null,
});
// 'dummy' = ตัวละครสมมติไม่มีฮุค (เดิน 4 · ตีประชิด ตามค่าตั้งต้น)
function setup(ids = ['A', 'B', 'C'], ch = 'dummy') {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  ids.forEach((id, i) => { engine.players[id] = blank(id, ch, i + 1); });
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  for (const p of Object.values(engine.players)) {
    p.hp = engine.maxHpOf(p); p.armor = 0; p.shield = 0; p.statuses = {}; p.statusAmt = {}; p.skillPoints = 5;
  }
  return engine.players;
}
const cards = (...vals) => vals.map((v) => ({ value: v, color: 'blue' }));
// วางตัวแล้วเริ่มตาเดินของคนแรกในลำดับ
function startActions(order) {
  for (const [i, id] of order.entries()) engine.players[id].cards = cards(20 - i);
  resolveRound();
  engine.clearPhaseTimer();
  engine.finishActor(); // ORDER → ตาเดินของคนแรก
  engine.clearPhaseTimer();
}

const saved = { triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash };
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = () => {};
  engine.skillFlash = () => {};
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.afterEach(() => { Math.random = realRandom; engine.clearPhaseTimer(); });

test('เริ่มแมตช์: ทุกคนยืนบนจุดเกิดของภูมิภาค I ไม่ซ้ำกัน', () => {
  setup(['A', 'B', 'C', 'D']);
  assert.equal(engine.board.area, 1);
  const map = engine.boardMap();
  const spawnKeys = new Set(map.spawns.map((s) => Board.key(s.x, s.y)));
  const placed = Object.values(engine.players).map((p) => Board.key(p.pos.x, p.pos.y));
  assert.equal(new Set(placed).size, 4);
  for (const k of placed) assert.ok(spawnKeys.has(k));
});

test('เปิดไพ่: แต้มมากเดินก่อน · ไพ่แตกท้ายแถว · ไม่มีใครเสียเลือด · คนแรกได้เหรียญ +1 · เข้าเฟสลำดับเดิน', () => {
  const P = setup();
  P.A.cards = cards(5); P.B.cards = cards(10, 9); P.C.cards = cards(10, 9, 8); // C แตก
  const hp = Object.fromEntries(Object.values(P).map((p) => [p.id, p.hp]));
  const gold = P.B.gold || 0;
  resolveRound();
  assert.equal(engine.gameState, 'ORDER');
  assert.deepEqual(engine.turnOrder, ['B', 'A', 'C']);
  for (const p of Object.values(P)) assert.equal(p.hp, hp[p.id], `${p.id} ไม่ควรเสียเลือดตอนเปิดไพ่`);
  assert.equal(P.B.gold, gold + 1);
  assert.equal(engine.movOf(P.C), engine.baseMovOf(P.C) - 1, 'ไพ่แตก เดินได้ −1');
});

test('ตาเดิน: เดินได้ไม่เกินระยะ · ย้อนกลับที่เดิมได้ · ตาคนอื่นกดไม่ได้', () => {
  const P = setup();
  P.A.pos = { x: 7, y: 9 }; P.B.pos = { x: 0, y: 4 }; P.C.pos = { x: 13, y: 4 };
  startActions(['A', 'B', 'C']);
  assert.equal(engine.gameState, 'ACTION');
  assert.equal(engine.actorId, 'A');
  assert.equal(engine.moveTo('B', 1, 4), false, 'ไม่ใช่ตาของ B');
  assert.equal(engine.moveTo('A', 7, 4), false, 'ไกลเกินระยะเดิน 4');
  assert.equal(engine.moveTo('A', 7, 5), true);
  assert.deepEqual(P.A.pos, { x: 7, y: 5 });
  assert.equal(engine.moveTo('A', 7, 6), false, 'เดินได้ครั้งเดียว');
  assert.equal(engine.undoMove('A'), true);
  assert.deepEqual(P.A.pos, { x: 7, y: 9 });
  assert.equal(engine.moveTo('A', 6, 8), true, 'ย้อนแล้วเลือกใหม่ได้');
});

test('ตาเดิน: ใช้สกิลแล้วเดินไม่ได้อีก (ยังโจมตีได้) · ย้อนการเดินก็ไม่ได้', () => {
  const P = setup(['A', 'B'], 'oberon_summer');
  P.A.pos = { x: 7, y: 9 }; P.B.pos = { x: 7, y: 7 };
  startActions(['A', 'B']);
  assert.equal(engine.moveTo('A', 7, 8), true);
  engine.useSkill('A', 'basic'); // ม่านแห่งราตรี (ใช้กับตัวเอง/ทั้งทีม)
  assert.equal(engine.action.locked, true);
  assert.equal(engine.undoMove('A'), false);
  assert.equal(engine.attackTarget('A', 'B'), true, 'ยังตีปกติได้');
});

test('สกิล/ไอเทม/ร้านค้า ใช้ไม่ได้ช่วงจั่วไพ่ (ทำได้เฉพาะตาเดินของตัวเอง)', () => {
  const P = setup(['A', 'B'], 'oberon_summer');
  engine.setGameState('PLAYING');
  const sp = P.A.skillPoints;
  engine.useSkill('A', 'basic');
  assert.equal(P.A.skillPoints, sp);
  assert.equal(engine.canAct(P.A), false);
});

test('โจมตี: เป้านอกระยะตีไม่ได้ · ประชิดแล้วโดนสวน + ถอย 1 ช่อง · จบตาหลังฉากตี', () => {
  const P = setup();
  P.A.pos = { x: 7, y: 9 }; P.B.pos = { x: 7, y: 7 }; P.C.pos = { x: 0, y: 4 };
  P.B.counterBack = true; // ตีสวนปิดเป็นค่าเริ่มต้นแล้ว — เทสต์กลไกที่เก็บไว้ให้ตัวละครสะท้อน
  startActions(['A', 'B', 'C']);
  assert.equal(engine.attackTarget('A', 'B'), false, 'ห่าง 2 ช่อง ตีประชิดไม่ถึง');
  engine.moveTo('A', 7, 8);
  const hpA = P.A.hp, hpB = P.B.hp;
  assert.equal(engine.attackTarget('A', 'B'), true);
  engine.clearPhaseTimer();
  assert.equal(engine.gameState, 'ATTACKING');
  assert.equal(P.B.hp, hpB - 1);
  assert.equal(P.A.hp, hpA - 1, 'โดนตีสวน');
  assert.deepEqual(P.A.pos, { x: 7, y: 9 }, 'ถอยออกจากผู้สวน 1 ช่อง');
  assert.ok(engine.lastAttack.counter, 'ฉากตีมีข้อมูลตีสวน');
  engine.finishActor();
  engine.clearPhaseTimer();
  assert.equal(engine.actorId, 'B', 'ไปตาคนถัดไป');
});

test('ค่าเริ่มต้น: ไม่มีการตีสวน — ผู้ตีไม่เสียเลือดและไม่ถอย (ผู้ใช้ตัดสิน 2026-10-09)', () => {
  const P = setup(['A', 'B']);
  P.A.pos = { x: 7, y: 8 }; P.B.pos = { x: 7, y: 7 };
  startActions(['A', 'B']);
  const hpA = P.A.hp;
  engine.attackTarget('A', 'B');
  engine.clearPhaseTimer();
  assert.equal(P.A.hp, hpA);
  assert.deepEqual(P.A.pos, { x: 7, y: 8 });
  assert.equal(engine.lastAttack.counter, null);
  assert.equal(engine.lastAttack.push, null);
});

test('ศัตรูคนสุดท้ายตายกลางเทิร์น = จบเกมทันที ไม่รอคนที่เหลือเดิน', () => {
  const P = setup(['A', 'B', 'C']);
  P.A.pos = { x: 7, y: 8 }; P.B.pos = { x: 7, y: 7 }; P.C.pos = { x: 0, y: 4 };
  P.B.hp = 1; P.B.armor = 0;
  P.C.alive = false; P.C.pos = null;
  startActions(['A', 'B', 'C']);
  engine.attackTarget('A', 'B');
  engine.clearPhaseTimer();
  engine.finishActor();
  engine.clearPhaseTimer();
  assert.equal(engine.gameState, 'GAMEOVER');
});

test('ถอยชนสิ่งกีดขวางหลังโดนสวน: ไม่ขยับ และเสียเพิ่ม 1', () => {
  const P = setup(['A', 'B']);
  // เสาคริสตัลที่ (4,9): A ยืน (4,8) ตี B ที่ (4,7) → ถอยลงไปชนเสา
  P.A.pos = { x: 4, y: 8 }; P.B.pos = { x: 4, y: 7 };
  P.B.counterBack = true;
  startActions(['A', 'B']);
  const hpA = P.A.hp;
  engine.attackTarget('A', 'B');
  engine.clearPhaseTimer();
  assert.deepEqual(P.A.pos, { x: 4, y: 8 });
  assert.equal(P.A.hp, hpA - 2, 'โดนสวน 1 + ชน 1');
  assert.equal(engine.lastAttack.push.collide, true);
});

test('ตีจนเป้าตาย: ไม่มีตีสวน · คนตายหายจากกระดาน', () => {
  const P = setup(['A', 'B', 'C']);
  P.A.pos = { x: 7, y: 9 }; P.B.pos = { x: 7, y: 8 }; P.C.pos = { x: 0, y: 4 };
  startActions(['A', 'B', 'C']);
  P.B.hp = 1;
  const hpA = P.A.hp;
  engine.attackTarget('A', 'B');
  engine.clearPhaseTimer();
  assert.equal(P.B.alive, false);
  assert.equal(P.B.pos, null);
  assert.equal(P.A.hp, hpA);
  assert.equal(engine.lastAttack.counter, null);
});

test('รอ = จบตา · จบตาบนวงเวทฟื้นฟู เลือด +1 · คนสุดท้ายจบแล้วจบเทิร์น', () => {
  const P = setup(['A', 'B']);
  P.A.pos = { x: 7, y: 9 }; P.B.pos = { x: 0, y: 4 };
  startActions(['A', 'B']);
  P.A.hp = 3;
  engine.moveTo('A', 7, 6); // วงเวท (7,6)
  engine.waitAction('A');
  engine.clearPhaseTimer();
  assert.equal(P.A.hp, 4);
  assert.equal(engine.actorId, 'B');
  engine.waitAction('B');
  engine.clearPhaseTimer();
  assert.equal(engine.actorId, null);
  assert.equal(engine.gameState, 'TRANSITION');
});

test('สตั้น: ข้ามตาเดินทั้งตา', () => {
  const P = setup(['A', 'B']);
  P.A.pos = { x: 7, y: 9 }; P.B.pos = { x: 0, y: 4 };
  for (const [i, id] of ['A', 'B'].entries()) P[id].cards = cards(20 - i);
  resolveRound();
  engine.clearPhaseTimer();
  P.A.statuses.stun = 2;
  engine.finishActor();
  engine.clearPhaseTimer();
  assert.equal(engine.actorId, 'B');
});
