// ยูกิ มาโคโตะ (yuki_makoto) — มิตรภาพ (ไม่ตาย) / เกิดใหม่เป็นประตู (นับ 3 เทิร์น → ระเบิดทั้งแผนที่ → จบเกม ยูกิชนะ)
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const yuki = require('../../characters/yuki_makoto.js');
const { CHAR_BY_ID } = require('../../characters.js');

const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
// แถว y = 6..8 ช่วง x = 2..12 ของภูมิภาค I เป็นพื้นโล่ง (แบบเทสต์เกรย์)
function setup(list, mode = 'ffa') {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, ch, , , team], i) => { engine.players[id] = blank(id, ch, i + 1, team || null); });
  engine.setGameMode(mode);
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setJourneyArea(1);
  engine.setCycleShift(0);
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.skillPoints = 0; p.skillUsedRound = false; p.shield = 0;
    p.statuses = {}; p.statusAmt = {};
  }
  return engine.players;
}
const view = (viewerId, id) => engine.buildStateFor(viewerId).players.find((p) => p.id === id);
const flush = (t, ms = 6000) => { for (let i = 0; i < ms / 100; i++) t.mock.timers.tick(100); };
// ลำดับเดินจริง: ids ตามลำดับ · เดินจนถึงตาของ actorId (ยูกิกดแล้วจบตา = ไปคนถัดไป ไม่จบเทิร์น)
function orderUpTo(t, ids, actorId) {
  try { t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] }); } catch { /* เปิดไว้แล้วในเทสต์นี้ */ }
  engine.beginOrder();
  engine.turnOrder.splice(0, engine.turnOrder.length, ...ids);
  flush(t, 6600);
  while (engine.actorId !== actorId && engine.actorId) engine.finishActor();
}
const ult = (t, id, ids) => { orderUpTo(t, ids, id); engine.useSkill(id, 'ultimate', []); };
// จบเทิร์นที่ครบเวลา: คลิปคิวไว้ → (คลิปจบ) งานตอนเริ่มพักฉากระเบิด
const match = require('../../server/match.js');
const holdStart = () => { for (const fn of match.endTurnHoldStart || []) fn(); match.endTurnHoldStart = null; match.endTurnHold = 0; };

const saved = {
  triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash,
  notifyTransform: engine.notifyTransform, sfx: engine.sfx,
};
const calls = { queue: [], sfx: [] };
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = (p, key) => calls.queue.push(key);
  engine.skillFlash = () => {};
  engine.notifyTransform = () => {};
  engine.sfx = (s) => calls.sfx.push(s);
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.beforeEach(() => { for (const k of Object.keys(calls)) calls[k] = []; });
test.afterEach(() => { engine.setGameMode('ffa'); engine.setCycleShift(0); engine.clearPhaseTimer(); });

test('ข้อมูล: เอาฮา · พลังชีวิต 3 เกราะ 2 · มีแค่ท่าไม้ตาย 0 แต้ม', () => {
  const ch = CHAR_BY_ID.yuki_makoto;
  assert.equal(ch.difficulty, 'fun');
  assert.equal(ch.basic, null);
  assert.equal(ch.secondary, null);
  assert.equal(ch.ultimate.cost, 0);
  const { y } = setup([['y', 'yuki_makoto', 4, 7], ['a', 'dummy', 8, 7]]);
  assert.equal(y.hp, 3);
  assert.equal(y.armor, 2);
  const pub = view('y', 'y');
  assert.equal(pub.character.basic, null);
  assert.equal(pub.character.ultimate.name, 'เกิดใหม่เป็นประตู');
});

test('มิตรภาพ: ตายทุกทาง (รวม force) ฟื้นเต็ม · "absolute" ตายจริง', () => {
  const { y } = setup([['y', 'yuki_makoto', 4, 7], ['a', 'dummy', 8, 7]]);
  y.hp = 0; y.armor = 0;
  engine.instantDeath(y);
  assert.equal(y.alive, true);
  assert.equal(y.hp, 3);
  assert.equal(y.armor, 2);
  y.hp = 0;
  engine.instantDeath(y, true);
  assert.equal(y.alive, true);
  engine.instantDeath(y, 'absolute');
  assert.equal(y.alive, false);
});

test('ท่าไม้ตาย: ไม่มีคลิปตอนกด · นับ 3 · จบตาเดิน · กดซ้ำไม่ได้ · ข้ามตาเดินระหว่างนับ · เพลง', (t) => {
  const { y } = setup([['y', 'yuki_makoto', 4, 7], ['a', 'dummy', 8, 7]]);
  ult(t, 'y', ['y', 'a']);
  assert.deepEqual(calls.queue, []);
  assert.equal(yuki.blastOf(y).left, 3);
  assert.notEqual(engine.actorId, 'y');
  assert.deepEqual(view('a', 'y').yuki, { left: 3, at: yuki.blastOf(y).at });
  assert.equal(engine.buildStateFor('a').skillMusic, 'yuki_charge');
  // กดซ้ำระหว่างนับไม่ได้
  y.skillUsedRound = false;
  engine.setActor('y');
  const before = yuki.blastOf(y).at;
  engine.useSkill('y', 'ultimate', []);
  assert.equal(yuki.blastOf(y).at, before);
  // ตาเดินถัดไปของยูกิถูกข้าม
  orderUpTo(t, ['y', 'a'], 'a');
  assert.equal(engine.actorId, 'a');
  assert.equal(engine.hasActed('y'), true);
});

test('ครบ 3 เทิร์น: คลิป → ทุกคนตาย (เพื่อนร่วมทีม/กันตายไม่ช่วย) + ฉากระเบิด → จบเกม ยูกิชนะ', (t) => {
  const { y, a, b } = setup([['y', 'yuki_makoto', 4, 7, 'A'], ['a', 'dummy', 8, 7, 'A'], ['b', 'dummy', 10, 7, 'B'], ['c', 'dummy', 2, 7, 'B']], 'duo');
  ult(t, 'y', ['y', 'a', 'b', 'c']);
  yuki.onEndTurn(engine);
  yuki.onEndTurn(engine);
  assert.equal(yuki.blastOf(y).left, 1);
  assert.equal(a.alive, true);
  yuki.onEndTurn(engine);
  assert.deepEqual(calls.queue, ['yukiUlt']);
  assert.equal(match.endTurnHold, 14);
  assert.equal(a.alive, true); // ตายหลังคลิปจบ
  holdStart();
  assert.equal(a.alive, false);
  assert.equal(b.alive, false);
  assert.equal(y.alive, true);
  assert.equal(yuki.blastOf(y), null);
  const boom = engine.buildStateFor('b').yukiBoom;
  assert.equal(boom.by, 'y');
  assert.deepEqual([boom.x, boom.y], [4, 7]);
  assert.equal(engine.buildStateFor('b').skillMusic, null);
  require('../../server/phases/endTurn.js').gameOver();
  assert.equal(engine.gameState, 'GAMEOVER');
  assert.equal(engine.winningTeamId, 'A');
});

test('ยูกิหลายคน: คนที่กดก่อนระเบิดก่อน ฆ่ายูกิทุกคน', (t) => {
  const { y1, y2 } = setup([['y1', 'yuki_makoto', 4, 7], ['y2', 'yuki_makoto', 8, 7], ['a', 'dummy', 10, 7]]);
  ult(t, 'y2', ['y2', 'y1', 'a']);
  engine.useSkill('y1', 'ultimate', []);
  for (let i = 0; i < 3; i++) yuki.onEndTurn(engine);
  holdStart();
  assert.equal(y2.alive, true);
  assert.equal(y1.alive, false);
  assert.equal(engine.buildStateFor('y2').yukiBoom.by, 'y2');
});

test('ตัดผลสกิล (เรียวกิ): เลิกนับถอยหลัง กดใหม่ได้', (t) => {
  const { y } = setup([['y', 'yuki_makoto', 4, 7], ['a', 'dummy', 8, 7]]);
  ult(t, 'y', ['y', 'a']);
  const list = yuki.severables(engine, y);
  assert.equal(list.length, 1);
  list[0].cancel();
  assert.equal(yuki.blastOf(y), null);
  y.skillUsedRound = false;
  ult(t, 'y', ['y', 'a']);
  assert.equal(yuki.blastOf(y).left, 3);
});
