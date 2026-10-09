// พุ่มหญ้า (server/visibility.js): ยืนในพุ่มดอกไม้สูง/ป่าทึบ ศัตรูมองไม่เห็น ยกเว้นคนในพุ่มผืนเดียวกัน
//  โจมตี/ใส่ผลให้คนอื่นจากในพุ่ม = โผล่จนจบเทิร์น · เดินชนคนที่มองไม่เห็น = หยุดก่อนถึง
//  ภูมิภาค II (ทุ่งดอกไม้): วงดอกไม้กลาง (4..9,4) (3..4,5) (4,6) … = ผืนเดียว · (6..7,1..2) = อีกผืน · (6,3) (5,2) = พื้น
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const Board = require('../server/board.js');
const match = require('../server/match.js');
const action = require('../server/phases/action.js');

const realRandom = Math.random;
const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
function setup(list, mode = 'ffa', area = 2) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, ch, , , team], i) => { engine.players[id] = blank(id, ch, i + 1, team || null); });
  engine.setGameMode(mode);
  engine.startMatch();
  engine.clearPhaseTimer();
  action.placeOnBoard(area);
  match.shopPos = null;
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.skillPoints = 8; p.skillUsedRound = false; p.shield = 0;
    p.statuses = {}; p.statusAmt = {}; p.exposedRound = 0;
  }
  return engine.players;
}
const view = (viewerId, id) => engine.buildStateFor(viewerId).players.find((p) => p.id === id);

const saved = { triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash };
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = () => {};
  engine.skillFlash = () => {};
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.afterEach(() => { Math.random = realRandom; engine.setGameMode('ffa'); engine.clearPhaseTimer(); });

test('ผืนพุ่มหญ้า: ช่อง bush ที่ต่อกัน 4 ทิศ = ผืนเดียว · พื้นธรรมดา = null', () => {
  const m = Board.MAPS[2];
  const ring = Board.bushPatchOf(m, 6, 4);
  assert.notEqual(ring, null);
  assert.equal(Board.bushPatchOf(m, 4, 6), ring);
  assert.equal(Board.bushPatchOf(m, 9, 9), ring);
  assert.notEqual(Board.bushPatchOf(m, 6, 1), ring);
  assert.equal(Board.bushPatchOf(m, 6, 1), Board.bushPatchOf(m, 7, 2));
  assert.equal(Board.bushPatchOf(m, 6, 3), null);
  assert.ok(Board.TERRAIN_INFO.flowers.bush && Board.TERRAIN_INFO.forest.bush);
});

test('พุ่มหญ้า: ศัตรูนอกพุ่ม/คนละผืนมองไม่เห็น · ผืนเดียวกันเห็น · เพื่อนร่วมทีมเห็นเสมอ · ตัวเองเห็นแบบโปร่งแสง', () => {
  setup([['B', 'dummy', 6, 4], ['A', 'dummy', 6, 3], ['C', 'dummy', 4, 6], ['D', 'dummy', 6, 1]]);
  assert.equal(view('A', 'B').pos, null, 'นอกพุ่ม');
  assert.deepEqual(view('C', 'B').pos, { x: 6, y: 4 }, 'ผืนเดียวกัน');
  assert.equal(view('D', 'B').pos, null, 'คนละผืน');
  assert.equal(view('B', 'B').veiled, true);
  assert.equal(view('A', 'A').veiled, false);
  assert.equal(view('B', 'D').pos, null, 'D ก็อยู่ในพุ่มอีกผืน');
  setup([['B', 'dummy', 6, 4, 't1'], ['A', 'dummy', 6, 3, 't1'], ['C', 'dummy', 12, 12, 't2'], ['D', 'dummy', 13, 13, 't2']], 'duo');
  assert.deepEqual(view('A', 'B').pos, { x: 6, y: 4 }, 'เพื่อนร่วมทีม');
});

test('พุ่มหญ้า: ตีคนที่มองไม่เห็นไม่ได้ · ตีจากในพุ่ม = โผล่จนจบเทิร์น แล้วซ่อนอีกครั้งเทิร์นถัดไป', () => {
  const P = setup([['B', 'dummy', 6, 4], ['A', 'dummy', 6, 3], ['C', 'dummy', 12, 12]]);
  engine.setActor('A');
  assert.equal(engine.attackTarget('A', 'B'), false);
  assert.equal(engine.buildStateFor('A').forecast.B, undefined);
  Math.random = () => 0.99;
  engine.setActor('B');
  assert.equal(engine.attackTarget('B', 'A'), true, 'คนในพุ่มตีคนนอกพุ่มได้');
  engine.clearPhaseTimer();
  assert.deepEqual(view('A', 'B').pos, { x: 6, y: 4 }, 'โผล่');
  assert.equal(view('B', 'B').veiled, false);
  engine.setRoundNumber(engine.roundNumber + 1);
  assert.equal(view('A', 'B').pos, null, 'เทิร์นใหม่ซ่อนอีกครั้ง');
  void P;
});

test('พุ่มหญ้า: ตาของคนที่มองไม่เห็น ผู้ชมไม่ได้เส้นทางเดิน · บันทึกที่มีชื่อเขาถูกตัด', () => {
  setup([['B', 'dummy', 6, 4], ['A', 'dummy', 6, 3], ['C', 'dummy', 12, 12]]);
  engine.setActor('B');
  assert.ok(engine.buildStateFor('B').action);
  assert.equal(engine.buildStateFor('A').action, null);
  match.lastLog = ['B ทำอะไรบางอย่าง', 'A ทำอะไรบางอย่าง'];
  engine.setGameState('ORDER');
  assert.deepEqual(engine.buildStateFor('A').log, ['A ทำอะไรบางอย่าง']);
  assert.deepEqual(engine.buildStateFor('C').log, ['A ทำอะไรบางอย่าง']);
  assert.equal(engine.buildStateFor('B').log.length, 2);
});

test('พุ่มหญ้า: เดินชนคนที่มองไม่เห็น = หยุดช่องก่อนหน้า เดินต่อ/ย้อนไม่ได้', () => {
  // A (5,2) → (5,5): ทางเดียวผ่าน (5,4) พุ่มดอกไม้ที่ B ซ่อนอยู่
  const P = setup([['B', 'dummy', 5, 4], ['A', 'dummy', 5, 2], ['C', 'dummy', 12, 12]]);
  engine.setActor('A');
  assert.equal(engine.moveTo('A', 5, 5), true);
  assert.deepEqual(P.A.pos, { x: 5, y: 3 });
  assert.equal(engine.action.locked, true);
  assert.equal(engine.undoMove('A'), false);
});

test('พุ่มหญ้า: สกิลโจมตีแบบพื้นที่โดนคนที่มองไม่เห็น · บัฟพื้นที่ไม่ถึงศัตรูที่มองไม่เห็น', () => {
  // มุยมิ (6,3) ฟันลง: แนว 4×3 คลุม (5..7, 4..7) — B ในพุ่ม (6,4)
  let P = setup([['M', 'muimi', 6, 3], ['B', 'dummy', 6, 4], ['C', 'dummy', 12, 12]]);
  Math.random = () => 0.99; // ไม่หลบ
  engine.setActor('M');
  engine.useSkill('M', 'ultimate', [], { dir: 'down' });
  assert.ok(P.B.hp + P.B.armor < 10, 'โดนคลื่นดาบ');
  assert.equal(view('C', 'B').pos, null, 'พุ่มหญ้าไม่โผล่เพราะโดนตี');
  // โอเบรอน (6,3) ม่านแห่งราตรี รอบตัว 4: B ในพุ่มมองไม่เห็น = ไม่ได้บัฟ
  P = setup([['O', 'oberon_summer', 6, 3], ['B', 'dummy', 6, 4], ['C', 'dummy', 8, 3]]);
  engine.setActor('O');
  assert.deepEqual(action.resolveArea(P.O, { kind: 'aoe', range: 4, self: true }, [], null), ['O', 'C']);
  assert.equal(action.resolveArea(P.O, { kind: 'target', range: 4 }, ['B'], null), null, 'เล็งคนที่มองไม่เห็นไม่ได้');
});
