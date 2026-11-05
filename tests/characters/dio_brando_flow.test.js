// ดิโอ บรันโด — ฉากต่อเนื่องบนตัวจับเวลาจริง (mock timers): Last Stand / แทรกตา / กดทันที / Road Roller / คลิป BloodStack 6
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const dio = require('../../characters/dio_brando.js');

const realRandom = Math.random;
const blank = (id, characterId, position) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId: null,
});
function setup(list) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, ch], i) => { engine.players[id] = blank(id, ch, i + 1); });
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setJourneyArea(1);
  engine.setCycleShift(0);
  engine.setShopPos(null);
  engine.setRoundNumber(2);
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.skillPoints = 8; p.skillUsedRound = false; p.shield = 0;
    p.statuses = {}; p.statusAmt = {};
  }
  return list.map(([id]) => engine.players[id]);
}
const adv = (t, secs) => { for (let i = 0; i < secs; i++) t.mock.timers.tick(1000); };
const cards = (...vs) => vs.map((v) => ({ v, c: 'red' }));

test.beforeEach((t) => { Math.random = () => 0.99; t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] }); });
test.afterEach((t) => { Math.random = realRandom; engine.clearPhaseTimer(); t.mock.timers.reset(); });

test('ตีดิโอถึงตาย → คลิป → ดวล → แพ้ → คลิป → ตาย · ตาผู้ตีจบ', (t) => {
  const [d, a] = setup([['d', 'dio_brando', 3, 7], ['a', 'dummy', 4, 7], ['c', 'dummy', 9, 7]]);
  d.hp = 1;
  engine.setActor('a');
  engine.attackTarget('a', 'd');
  assert.equal(d.alive, true);
  adv(t, 12); // ฉากตี + คลิป Last Stand
  const duel = d.dio.duel;
  assert.ok(duel, 'เริ่มดวลแล้ว');
  duel.hands.dio = cards(2);
  duel.hands.foe = cards(9);
  assert.equal(dio.duelAction(engine, 'c', 'draw'), false, 'คนนอกกดไม่ได้');
  dio.duelAction(engine, 'd', 'stand');
  dio.duelAction(engine, 'a', 'stand');
  assert.equal(d.dio.duel.winner, 'foe');
  adv(t, 5); // แสดงผล
  assert.equal(d.alive, true, 'ยังไม่ตายก่อนคลิปจบ');
  assert.equal(engine.gameState, 'CUTSCENE');
  adv(t, 9); // คลิปแพ้
  assert.equal(d.alive, false);
  assert.notEqual(engine.actorId, 'a', 'จบตาผู้ตีแล้ว');
  assert.equal(a.alive, true);
});

test('ดิโอชนะดวล = ดูดเลือด 2 ฟื้น 2 · ผู้ตีเสีย 2 ทะลุเกราะ', (t) => {
  const [d, a] = setup([['d', 'dio_brando', 3, 7], ['a', 'dummy', 4, 7], ['c', 'dummy', 9, 7]]);
  d.hp = 1; a.hp = 7; a.armor = 3;
  engine.setActor('a');
  engine.attackTarget('a', 'd');
  adv(t, 12);
  d.dio.duel.hands.dio = cards(10, 10);
  d.dio.duel.hands.foe = cards(3);
  dio.duelAction(engine, 'd', 'stand');
  dio.duelAction(engine, 'a', 'stand');
  adv(t, 8);
  assert.equal(d.dio.duel, null);
  assert.equal(d.hp, 2);
  assert.equal(a.hp, 5);
  assert.equal(a.armor, 3);
});

test('ไม่กดอะไรในดวล = หมดเวลาเทียบแต้มที่มี', (t) => {
  const [d, a] = setup([['d', 'dio_brando', 3, 7], ['a', 'dummy', 4, 7], ['c', 'dummy', 9, 7]]);
  d.hp = 1;
  engine.setActor('a');
  engine.attackTarget('a', 'd');
  adv(t, 12);
  d.dio.duel.hands.dio = cards(8);
  d.dio.duel.hands.foe = cards(3);
  adv(t, 40);
  assert.equal(d.alive, true);
  assert.equal(d.hp, 2);
  assert.ok(a.alive);
});

test('สกิลศัตรูฆ่าดิโอกลางตา = ดวลแล้วกลับตาเดิมต่อ', (t) => {
  const [d, a] = setup([['d', 'dio_brando', 3, 7], ['a', 'dummy', 5, 7], ['c', 'dummy', 12, 7]]);
  d.hp = 0;
  engine.setActor('a');
  engine.startPhaseTimer(40, () => {});
  engine.withEffectSource(a, () => engine.instantDeath(d));
  assert.equal(d.dio.duelPending, true);
  assert.equal(engine.gameState, 'ACTION');
  // คำสั่งถัดไปของผู้เล่น (guard) ปล่อยฉาก
  engine.moveTo('a', 6, 7);
  assert.equal(engine.gameState, 'CUTSCENE');
  adv(t, 8);
  assert.ok(d.dio.duel);
  dio.duelAction(engine, 'd', 'stand');
  dio.duelAction(engine, 'a', 'stand');
  assert.ok(d.dio.duel.winner);
});

test('แทรกตา → เวลาหยุด → ใช้ Action หมด → เวลาเดินต่อ ดาเมจลง → กลับตาเดิม', (t) => {
  const [d, a] = setup([['d', 'dio_brando', 3, 7], ['a', 'dummy', 5, 7], ['c', 'dummy', 12, 7]]);
  a.hp = 7; a.armor = 0; d.dio.meter = 2;
  engine.setActor('a');
  engine.startPhaseTimer(40, () => {});
  adv(t, 10);
  const left = engine.timeLeft;
  assert.equal(dio.charAction(engine, d, 'dio:world'), true);
  assert.equal(engine.gameState, 'ATTACKING');
  adv(t, 5);
  assert.equal(engine.gameState, 'ACTION');
  assert.equal(engine.actorId, 'd');
  assert.ok(engine.timeStop.frozen());
  assert.equal(d.dio.actions, 1);
  engine.useSkill('d', 'secondary', [], { dir: 'right', form: 'muda' });
  assert.equal(a.hp, 3, 'ดาเมจจริง (ผู้ชมยังเห็นเดิม)');
  adv(t, 8); // ฉากสกิล + เวลาเดินต่อ
  assert.equal(engine.timeStop.frozen(), null);
  assert.equal(engine.actorId, 'a', 'กลับตาเดิม');
  assert.equal(engine.gameState, 'ACTION');
  assert.ok(left - engine.timeLeft <= 3, 'เวลาที่เหลือเท่าเดิม');
});

test('BloodStack 6 กด Za warudo ในตาตัวเอง = ทำงานทันที · ตีปกติ 1 Action ไม่จบตา · จบแล้วกลับตาตัวเอง', (t) => {
  const [d, a] = setup([['d', 'dio_brando', 3, 7], ['a', 'dummy', 5, 7], ['c', 'dummy', 12, 7]]);
  d.dio.blood = 6; d.dio.clip6 = true; d.dio.meter = 3; a.hp = 7; a.armor = 0;
  engine.setActor('d');
  engine.startPhaseTimer(40, () => {});
  engine.useSkill('d', 'ultimate', []);
  assert.equal(d.dio.worldReady, engine.roundNumber + 3, 'คูลดาวน์ 3');
  adv(t, 6);
  assert.equal(d.dio.stopping, true);
  assert.equal(engine.gameState, 'ACTION');
  assert.equal(engine.action.extra, 'dioWorld');
  engine.attackTarget('d', 'a');
  adv(t, 6);
  assert.equal(engine.gameState, 'ACTION');
  assert.equal(engine.actorId, 'd');
  assert.equal(d.dio.actions, 2);
  engine.finishActor();
  adv(t, 4);
  assert.equal(d.dio.stopping, false);
  assert.equal(engine.actorId, 'd', 'กลับตาตัวเอง');
  assert.equal(engine.action.extra, undefined);
  assert.equal(d.skillUsedRound, true);
  assert.ok(a.hp < 7);
});

test('Road Roller → คลิป → ลงข้างเป้า → เวลาเดินต่อทันที (Action ที่เหลือหาย)', (t) => {
  const [d, a] = setup([['d', 'dio_brando', 3, 7], ['a', 'dummy', 5, 8], ['c', 'dummy', 12, 7]]);
  a.hp = 7; a.armor = 0; d.dio.meter = 5; d.dio.blood = 6; d.dio.clip6 = true;
  engine.setActor('d');
  engine.startPhaseTimer(40, () => {});
  engine.useSkill('d', 'ultimate', []);
  adv(t, 6);
  assert.equal(d.dio.actions, 5);
  engine.useSkill('d', 'ultimate', ['a']);
  assert.equal(d.dio.actions, 3);
  adv(t, 1);
  assert.equal(engine.gameState, 'CUTSCENE');
  adv(t, 5);
  assert.equal(Math.abs(d.pos.x - 5) + Math.abs(d.pos.y - 8), 1, 'ลงข้างเป้า');
  assert.equal(a.hp, 3, '3 + ดูด 1');
  adv(t, 6);
  assert.equal(d.dio.stopping, false);
  assert.equal(engine.timeStop.frozen(), null);
  assert.equal(d.dio.actions, 0);
});

test('BloodStack ถึง 6 = คลิปเล่นหลังท่าจบ ครั้งเดียว แล้วกลับตา', (t) => {
  const [d] = setup([['d', 'dio_brando', 3, 7], ['a', 'dummy', 5, 7], ['c', 'dummy', 12, 7]]);
  d.dio.blood = 5;
  engine.setActor('d');
  engine.startPhaseTimer(40, () => {});
  engine.useSkill('d', 'secondary', [], { dir: 'right', form: 'shine' });
  assert.equal(d.dio.blood, 6);
  assert.equal(d.dio.clip6, true);
  assert.equal(engine.gameState, 'ATTACKING');
  adv(t, 2);
  assert.equal(engine.gameState, 'CUTSCENE');
  adv(t, 9);
  assert.equal(engine.gameState, 'ACTION');
});
