// เครื่องมือ dev (เฉพาะตอนตั้ง env): ECHO_DEV_START_ROUND = เริ่มแมตช์ที่เทิร์นนั้น (ทดสอบภูมิภาค II–VII)
//  · ECHO_DEV_RICH=1 = เหรียญ/แต้มสกิลเต็มตั้งแต่เริ่ม · ไม่ตั้ง env = เริ่มเทิร์น 1 ภูมิภาค I ตามปกติ
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');

const blank = (id, position) => ({
  id, name: id, position, characterId: 'dummy', alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId: null,
});
function start() {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  ['A', 'B'].forEach((id, i) => { engine.players[id] = blank(id, i + 1); });
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  return engine.players;
}

test.after(() => {
  delete process.env.ECHO_DEV_START_ROUND;
  delete process.env.ECHO_DEV_START_AREA;
  delete process.env.ECHO_DEV_RICH;
  engine.clearPhaseTimer();
  for (const id of Object.keys(engine.players)) delete engine.players[id];
});

test('ไม่ตั้ง env: เริ่มเทิร์น 1 บนกระดานภูมิภาค I · เหรียญเริ่ม 0', () => {
  delete process.env.ECHO_DEV_START_ROUND;
  delete process.env.ECHO_DEV_RICH;
  const { A } = start();
  assert.equal(engine.roundNumber, 1);
  assert.equal(engine.buildStateFor('A').board.area, 1);
  assert.equal(A.gold, 0);
});

test('ECHO_DEV_START_ROUND=13 + ECHO_DEV_START_AREA=3: เทิร์นแรกคือ 13 บนกระดานภูมิภาค III · ECHO_DEV_RICH=1 เหรียญ/แต้มเต็ม', () => {
  process.env.ECHO_DEV_START_ROUND = '13';
  process.env.ECHO_DEV_START_AREA = '3';
  process.env.ECHO_DEV_RICH = '1';
  const { A, B } = start();
  assert.equal(engine.roundNumber, 13);
  assert.equal(engine.buildStateFor('A').board.area, 3);
  assert.deepEqual(engine.journeyRoute, [1, 3]);
  for (const p of [A, B]) {
    assert.ok(p.pos, 'ได้จุดเกิดบนกระดานภูมิภาคใหม่');
    assert.equal(p.gold, 30);
    assert.equal(p.skillPoints, engine.maxSkillOf(p));
  }
});

test('ECHO_DEV_START_ROUND=13 อย่างเดียว: ภูมิภาคสุ่มจาก II–VII เหมือนเกมจริง', () => {
  process.env.ECHO_DEV_START_ROUND = '13';
  delete process.env.ECHO_DEV_START_AREA;
  delete process.env.ECHO_DEV_RICH;
  start();
  const area = engine.buildStateFor('A').board.area;
  assert.ok(area >= 2 && area <= 7);
  assert.equal(engine.journeyArea, area);
});
