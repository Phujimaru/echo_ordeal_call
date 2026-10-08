// เปิดไพ่ (ระบบกระดาน GRID_PLAN §4/§10) — resolveRound() ผ่าน engine จริง
//  ไม่มีผู้ชนะ/ผู้แพ้การจั่วแล้ว: แต้มต่ำสุดไม่เสียเลือด/ไม่ได้แต้มสกิล · แต้มใช้จัดลำดับเดินเท่านั้น
//  ลำดับ = แต้มมากเดินก่อน · เท่ากันสุ่ม · ไพ่แตกไปท้ายแถว · คนเดินลำดับแรกได้เหรียญเพิ่ม · จบแล้วเข้า ORDER
// startMatch() ในโหมดปกติพักรอฉากแผนที่การเดินทางก่อนแจกไพ่ — เทสต์นี้ต้องการเทิร์นแรกทันที
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine, resolveRound } = require('../server.js');
const action = require('../server/phases/action.js');
const { GOLD_FIRST_BONUS } = require('../server/constants.js');

const blank = (id, characterId, position) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId: null,
});
// 'dummy' = ตัวละครสมมติไม่มีฮุค — ไม่มีผลพิเศษตอนเปิดไพ่
function setup(ids = ['A', 'B', 'C']) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  ids.forEach((id, i) => { engine.players[id] = blank(id, 'dummy', i + 1); });
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setGameState('PLAYING');
  for (const p of Object.values(engine.players)) {
    p.locked = true; p.skillPoints = 3; p.skillUsedRound = false; p.gold = 0;
    p.hp = engine.maxHpOf(p); p.armor = 0; p.shield = 0; p.statuses = {}; p.statusAmt = {};
  }
  return engine.players;
}

const saved = { triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash };
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = () => {};
  engine.skillFlash = () => {};
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.afterEach(() => { engine.clearPhaseTimer(); });

test('เปิดไพ่: แต้มน้อยสุดไม่เสียเลือด ไม่ได้แต้มสกิล · ลำดับเดินเรียงแต้มมากไปน้อย · เข้า ORDER', () => {
  const { A, B, C } = setup();
  A.cards = [{ value: 5, color: 'blue' }];
  B.cards = [{ value: 10, color: 'red' }, { value: 9, color: 'green' }];
  C.cards = [{ value: 8, color: 'yellow' }, { value: 4, color: 'blue' }];
  const hp = A.hp;
  resolveRound();
  assert.equal(A.hp, hp, 'แต้มต่ำสุดไม่เสียเลือดแล้ว');
  assert.ok(!A.isLoser && !B.isWinner, 'ไม่มีผู้ชนะ/ผู้แพ้การจั่ว');
  for (const p of [A, B, C]) assert.equal(p.skillPoints, 3);
  assert.deepEqual(engine.turnOrder, ['B', 'C', 'A']);
  assert.equal(engine.gameState, 'ORDER');
  assert.equal(engine.actorId, null, 'ยังไม่มีใครเริ่มเดินระหว่างแบนเนอร์ลำดับเดิน');
});

test('ไพ่แตกไปท้ายแถว แม้แต้มรวมจะสูงกว่า · ไม่เสียเลือด', () => {
  const { A, B, C } = setup();
  A.cards = [{ value: 9, color: 'blue' }, { value: 8, color: 'red' }, { value: 7, color: 'green' }]; // 24 แตก
  B.cards = [{ value: 3, color: 'blue' }];
  C.cards = [{ value: 6, color: 'red' }];
  const hp = A.hp;
  resolveRound();
  assert.deepEqual(engine.turnOrder, ['C', 'B', 'A']);
  assert.equal(A.hp, hp);
  assert.equal(A.skillPoints, 3);
  assert.equal(engine.gameState, 'ORDER');
});

test('คนเดินลำดับแรกได้เหรียญเพิ่ม (GOLD_FIRST_BONUS) — คนอื่นไม่ได้ตอนเปิดไพ่', () => {
  const { A, B, C } = setup();
  A.cards = [{ value: 4, color: 'blue' }];
  B.cards = [{ value: 7, color: 'red' }];
  C.cards = [{ value: 11, color: 'green' }];
  resolveRound();
  assert.equal(engine.turnOrder[0], 'C');
  assert.equal(GOLD_FIRST_BONUS, 1);
  assert.equal(C.gold, GOLD_FIRST_BONUS);
  assert.equal(A.gold, 0);
  assert.equal(B.gold, 0);
});

test('turnOrderOf: แต้มเท่ากันสุ่มลำดับ · ไพ่แตกหลายคนสุ่มกันเองที่ท้ายแถว', () => {
  const { A, B, C } = setup(['A', 'B', 'C', 'D']);
  const D = engine.players.D;
  A.cards = [{ value: 8, color: 'red' }];
  B.cards = [{ value: 8, color: 'blue' }];
  C.cards = [{ value: 10, color: 'red' }, { value: 10, color: 'blue' }, { value: 5, color: 'green' }]; // แตก
  D.cards = [{ value: 10, color: 'red' }, { value: 9, color: 'blue' }, { value: 9, color: 'green' }]; // แตก
  const seq = (vals) => { let i = 0; return () => vals[i++]; };
  assert.deepEqual(action.turnOrderOf([A, B, C, D], seq([0.1, 0.9, 0.2, 0.8])), ['A', 'B', 'C', 'D']);
  assert.deepEqual(action.turnOrderOf([A, B, C, D], seq([0.9, 0.1, 0.8, 0.2])), ['B', 'A', 'D', 'C']);
});
