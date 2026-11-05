// ดิโอ บรันโด ปะทะ Return to Zero ของโจรุโน่ Requiem — ทุกทางที่ดิโอหยุดเวลาได้ต้องแพ้การย้อน (mock timers)
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const match = require('../../server/match');
const timeStop = require('../../server/timeStop');
const action = require('../../server/phases/action');
const dio = require('../../characters/dio_brando.js');
const gio = require('../../characters/giorno_giovanna.js');

const realRandom = Math.random;
const blank = (id, characterId, position) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId: null,
});
const awaken = (g) => { g.giorno.requiem = { until: engine.roundNumber + gio.REQ_TURNS - 1, at: 1 }; };
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
    p.pos = { x, y }; p.skillPoints = 8; p.skillUsedRound = false; p.shield = 0; p.hp = 7;
    p.statuses = {}; p.statusAmt = {};
  }
  const P = Object.fromEntries(list.map(([id]) => [id, engine.players[id]]));
  awaken(P.g);
  return P;
}
const adv = (t, secs) => { for (let i = 0; i < secs; i++) t.mock.timers.tick(1000); };
const vit = (p) => (p.hp || 0) + (p.armor || 0);
const LIST = [['d', 'dio_brando', 3, 7], ['g', 'giorno_giovanna', 4, 7], ['x', 'dummy', 9, 7]];
const isRewindClip = () => match.cutsceneInfo && match.cutsceneInfo.video === gio.VIDEO.rewind;
// เริ่มตาหยุดเวลาจริงผ่านคิวตาพิเศษ — ตามทางเดียวกับเกมจริง จุดย้อนจึงจดก่อนเวลาหยุด
function startWorld(t, d, n) {
  d.dio.pending = n;
  d.dio.pendingRound = engine.roundNumber - 1;
  engine.setActor('x');
  engine.timeStop.queueExtra('d', 'dioWorld');
  action.finishActor();
  adv(t, 3);
  assert.equal(engine.actorId, 'd');
  assert.equal(d.dio.stopping, true);
  assert.ok(engine.timeStop.frozen(), 'เริ่มหยุดเวลาแล้ว');
}

test.beforeEach((t) => { Math.random = () => 0.1; t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] }); });
test.afterEach((t) => { Math.random = realRandom; engine.clearPhaseTimer(); t.mock.timers.reset(); });

test('กด Za warudo ในตาตัวเอง = ย้อนทันที · ไม่มีเสียงนำคลิป · Time Meter/คูลดาวน์คืนหมด', () => {
  const P = setup(LIST);
  P.d.dio.meter = 4;
  engine.setActor('d');
  timeStop.mark(45);
  const sfx = [];
  const real = engine.sfx;
  engine.sfx = (s) => sfx.push(s);
  try {
    timeStop.guard(() => engine.useSkill('d', 'ultimate', []));
  } finally { engine.sfx = real; }
  assert.equal(P.d.dio.meter, 4);
  assert.equal(P.d.dio.pending, 0);
  assert.equal(P.d.dio.worldReady, 0);
  assert.deepEqual(sfx, [], 'ไม่มีเสียงตัดหน้าคลิป');
  assert.ok(isRewindClip());
});

test('แทรก Za warudo ตาคนอื่น = ถูกย้อนทันที: ไม่หยุดเวลา · ไม่เสีย Time Meter · ตาเดิมเดินต่อ · กดซ้ำตานั้นไม่ได้', (t) => {
  const P = setup(LIST);
  P.d.dio.meter = 4;
  engine.setActor('x');
  match.timeLeft = 30;
  assert.equal(timeStop.guard(() => dio.charAction(engine, P.d, 'dio:world')), true);
  assert.equal(P.d.dio.meter, 4, 'Time Meter ไม่หาย');
  assert.equal(P.d.dio.pending, 0);
  assert.equal(P.d.dio.worldReady, 0, 'คูลดาวน์ไม่ติด');
  assert.equal(P.d.dio.stopping, false);
  assert.equal(engine.timeStop.frozen(), null);
  assert.ok(isRewindClip());
  adv(t, 10);
  assert.equal(engine.gameState, 'ACTION');
  assert.equal(engine.actorId, 'x', 'กลับตาคนเดิม');
  assert.equal(timeStop.guard(() => dio.charAction(engine, P.d, 'dio:world')), false, 'กดซ้ำตานี้ไม่ได้ (กันถ่วงเวลา)');
  assert.equal(engine.gameState, 'ACTION');
});

test('แทรก Za warudo ระหว่างตาของโจรุโน่เอง ก็ถูกย้อน', (t) => {
  const P = setup(LIST);
  P.d.dio.meter = 4;
  engine.setActor('g');
  match.timeLeft = 30;
  timeStop.guard(() => dio.charAction(engine, P.d, 'dio:world'));
  assert.equal(engine.timeStop.frozen(), null);
  assert.ok(isRewindClip());
  adv(t, 10);
  assert.equal(engine.actorId, 'g');
});

test('ปามีดในตาหยุดเวลาโดนย้อน = เวลาเดินต่อ · ดาเมจไม่ลง · Za warudo ไม่ค้างไปเทิร์นหน้า · จบตาพิเศษ ไม่ได้ตาแถม', (t) => {
  const P = setup(LIST);
  startWorld(t, P.d, 3);
  const g0 = vit(P.g);
  timeStop.guard(() => engine.useSkill('d', 'basic', ['g']));
  assert.equal(engine.timeStop.frozen(), null, 'เวลาเดินต่อ');
  assert.equal(P.d.dio.stopping, false);
  assert.equal(P.d.dio.pending, 0, 'Action ที่เหลือหาย ไม่กลับมาหยุดเวลาเทิร์นหน้า');
  assert.equal(vit(P.g), g0);
  assert.ok(isRewindClip());
  adv(t, 10);
  assert.ok(!(match.action && match.action.extra), 'ตาพิเศษจบแล้ว');
  assert.equal(engine.timeStop.frozen(), null);
});

test('ตีปกติ / Stand ในตาหยุดเวลาโดนย้อนเหมือนกัน', (t) => {
  for (const act of [
    () => engine.attackTarget('d', 'g'),
    () => engine.useSkill('d', 'secondary', ['g'], { form: 'shine', dir: 'right' }),
  ]) {
    const P = setup(LIST);
    startWorld(t, P.d, 3);
    const g0 = vit(P.g);
    timeStop.guard(act);
    assert.equal(engine.timeStop.frozen(), null);
    adv(t, 12);
    assert.equal(P.d.dio.pending, 0);
    assert.equal(P.d.dio.stopping, false);
    assert.equal(vit(P.g), g0);
    engine.clearPhaseTimer();
  }
});

test('กด Road Roller = ย้อนแน่นอนแม้ทอยไม่ติด · รถไม่ตก', (t) => {
  const P = setup(LIST);
  startWorld(t, P.d, 3);
  Math.random = () => 0.99;
  const g0 = vit(P.g);
  timeStop.guard(() => engine.useSkill('d', 'ultimate', ['g']));
  assert.equal(engine.timeStop.frozen(), null);
  assert.ok(isRewindClip());
  adv(t, 12);
  assert.equal(vit(P.g), g0);
});

test('ตีครั้งแรกทอยไม่ติด ครั้งถัดไปติด = ย้อนดาเมจครั้งแรกด้วย', (t) => {
  const P = setup(LIST);
  startWorld(t, P.d, 3);
  const g0 = vit(P.g);
  Math.random = () => 0.99;
  timeStop.guard(() => engine.useSkill('d', 'basic', ['g']));
  assert.ok(vit(P.g) < g0, 'ดาเมจครั้งแรกลง');
  adv(t, 2);
  assert.ok(engine.timeStop.frozen());
  Math.random = () => 0.1;
  timeStop.guard(() => engine.attackTarget('d', 'g'));
  assert.equal(engine.timeStop.frozen(), null);
  adv(t, 12);
  assert.equal(vit(P.g), g0);
});

test('ตาที่ถูกแทรกแล้วกลับมา: ย้อนต้องกลับต้นตาของคนนั้น ไม่ใช่ต้นตาพิเศษ', (t) => {
  const P = setup(LIST);
  P.x.pos = { x: 6, y: 7 };
  P.g.giorno.requiem = { until: engine.roundNumber + 2, at: 1 };
  engine.setActor('x');
  timeStop.mark(45);
  const x0 = { ...P.x.pos };
  match.timeLeft = 30;
  engine.moveTo('x', 5, 7);
  assert.equal(P.x.pos.x, 5);
  // ร่างยังปิดอยู่ตอนแทรก (ไม่งั้นโดนย้อนตั้งแต่กด) แล้วติดกลับตอนจบตาพิเศษ
  P.g.giorno.requiem = null;
  P.d.dio.meter = 2;
  assert.equal(timeStop.guard(() => dio.charAction(engine, P.d, 'dio:world')), true);
  adv(t, 4);
  assert.equal(engine.actorId, 'd');
  action.finishActor();
  adv(t, 4);
  assert.equal(engine.actorId, 'x', 'กลับตาคนที่ถูกแทรก');
  awaken(P.g);
  timeStop.guard(() => engine.attackTarget('x', 'g'));
  adv(t, 10);
  assert.equal(engine.actorId, 'x', 'ย้อนแล้วยังเป็นตาของ x');
  assert.deepEqual(P.x.pos, x0, 'กลับจุดเริ่มต้นของตา x');
});
