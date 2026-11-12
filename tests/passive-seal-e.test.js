// ลบสกิลติดตัว (noPassive · server/passiveSeal.js) — กลุ่ม e: ไรเดอร์ ZECT 4 ตัว · Ice Spike
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const ClockUp = require('../server/clockUp');
const Ice = require('../server/ice.js');
const ice = require('../characters/ice_spike.js');
const ZECT = ['daisuke', 'yaguruma', 'kagami', 'tsurugi'].map((id) => require(`../characters/${id}`));

const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId, skillPoints: 0, gold: 0, img: '', ready: true, avatar: 0,
});
function setup(list, mode = 'ffa') {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, ch, , , team], i) => { engine.players[id] = blank(id, ch, i + 1, team || null); });
  engine.setGameMode(mode);
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setJourneyArea(1);
  engine.setCycleShift(0);
  engine.setShopPos(null);
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.skillPoints = 8; p.skillUsedRound = false; p.shield = 0;
    p.statuses = {}; p.statusAmt = {};
  }
  return engine.players;
}
const vit = (p) => (p.hp || 0) + (p.armor || 0);
const lay = (tiles) => tiles.forEach(([x, y]) => Ice.layIce(x, y, null));
const nextTick = () => new Promise((r) => setImmediate(r));

const saved = {
  triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash,
  notifyTransform: engine.notifyTransform, sfx: engine.sfx, boardFx: engine.boardFx,
};
const realActive = ClockUp.activeMember;
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = () => {};
  engine.skillFlash = () => {};
  engine.notifyTransform = () => {};
  engine.sfx = () => {};
  engine.boardFx = () => {};
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.afterEach(() => { ClockUp.activeMember = realActive; engine.clockUp.activeMember = realActive; ClockUp.reset(); engine.setGameMode('ffa'); engine.clearPhaseTimer(); });

// ---------- ZECT: หลบ 25% ระหว่าง Clock Up · ตีคน Clock Up ด้วยกัน +1 · PUT ON 3 เทิร์น ฟื้น 2 ----------
for (const hook of ZECT) {
  test(`${hook.id}: ลบสกิลติดตัว Zect → ไม่หลบ 25% · ไม่ได้ +1 ตีคน Clock Up · CAST OFF +1 ยังอยู่`, () => {
    const P = setup([['a', hook.id, 2, 2], ['b', 'dummy', 3, 2]]);
    const p = P.a;
    p.zect.henshin = true; p.zect.castOff = true;
    ClockUp.activeMember = engine.clockUp.activeMember = () => ({}); // จำลองทั้งสองคนอยู่ใน Clock Up
    assert.equal(hook.ownEvade(p), 25, 'คุม: หลบ 25%');
    assert.equal(hook.damageBonus(engine, p, P.b), 2, 'คุม: CAST OFF +1 + Zect +1');
    p.statuses.noPassive = 2;
    assert.equal(hook.ownEvade(p), 0);
    assert.equal(hook.damageBonus(engine, p, P.b), 1, 'เหลือ CAST OFF +1 (ร่าง ไม่ใช่สกิลติดตัว)');
  });
}

test('ZECT PUT ON: ลบสกิลติดตัว → ไม่นับเทิร์น/ไม่ฟื้น · ค่าที่นับไว้ไม่หาย · หมดสถานะ = นับต่อแล้วฟื้น', () => {
  const P = setup([['a', 'daisuke', 2, 2], ['b', 'dummy', 6, 2]]);
  const p = P.a, hook = ZECT[0];
  p.zect.henshin = true; p.zect.castOff = false;
  p.hp = 3; p.zect.putOnTurns = 2;
  p.statuses.noPassive = 2;
  hook.onRoundStartTick(engine, p);
  assert.equal(p.hp, 3);
  assert.equal(p.zect.putOnTurns, 2, 'ค่าสะสมไม่หาย ไม่เพิ่ม');
  delete p.statuses.noPassive;
  hook.onRoundStartTick(engine, p);
  assert.equal(p.hp, 5, 'คุม: ครบ 3 เทิร์น ฟื้น 2');
  assert.equal(p.zect.putOnTurns, 0);
});

// ---------- Ice Spike ----------
test('Ice Spike ติดตัว 1: ลบสกิลติดตัว → เดินไม่วางธารน้ำแข็ง (คุม: วาง)', () => {
  setup([['I', 'ice_spike', 1, 5], ['B', 'dummy', 10, 5]]);
  engine.players.I.statuses.noPassive = 2;
  engine.setActor('I');
  assert.equal(engine.moveTo('I', 3, 5), true);
  for (const x of [1, 2, 3]) assert.equal(engine.boardMap().special[`${x},5`], undefined, `ช่อง ${x},5`);
  // คุม
  setup([['I', 'ice_spike', 1, 5], ['B', 'dummy', 10, 5]]);
  engine.setActor('I');
  engine.moveTo('I', 3, 5);
  assert.equal(engine.boardMap().special['2,5'], 'ice');
});

test('Ice Spike ติดตัว 2+3: ลบสกิลติดตัว → ไถลชนศัตรู = กระเด็นไม่เสียเลือด · ไม่ฟื้นจากการไถล', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const P = setup([['I', 'ice_spike', 1, 5], ['B', 'dummy', 7, 5]]);
  lay([[2, 5], [3, 5], [4, 5], [5, 5], [6, 5]]);
  P.I.hp = 5; P.I.skillPoints = 3;
  P.B.hp = 7; P.B.armor = 3;
  P.I.statuses.noPassive = 2;
  engine.setActor('I');
  assert.equal(engine.moveTo('I', 6, 5), true);
  assert.deepEqual(P.I.pos, { x: 6, y: 5 }, 'ยังไถลตามกติกาน้ำแข็งกลาง');
  assert.equal(vit(P.B), 10, 'ไม่เสียหาย');
  assert.deepEqual(P.B.pos, { x: 8, y: 5 }, 'กระเด็น 1 ช่องแบบคนทั่วไป');
  assert.equal(P.I.hp, 5, 'ไม่ฟื้นพลังชีวิต');
  assert.equal(P.I.skillPoints, 3, 'ไม่ได้แต้มสกิล');
});

test('Ice Spike ติดตัว 3: ลบสกิลติดตัว → ดาเมจไม่สะสม · ค่าที่ครบแล้วไม่ระเบิดจนหมดสถานะ', async () => {
  const P = setup([['I', 'ice_spike', 5, 5, 'A'], ['E', 'dummy', 6, 6, 'B']], 'duo');
  engine.setGameState('ACTION');
  P.I.statuses.noPassive = 2;
  engine.dealMixed(P.I, 2, false);
  await nextTick();
  assert.equal(P.I.iceHurt || 0, 0, 'ไม่สะสม');
  P.I.iceHurt = 3; // สะสมครบไว้ก่อนติดสถานะ
  assert.equal(Ice.flushBursts(), false);
  assert.equal(P.I.iceHurt, 3, 'ค่าสะสมไม่หาย');
  assert.deepEqual(P.E.pos, { x: 6, y: 6 });
  delete P.I.statuses.noPassive;
  assert.equal(Ice.flushBursts(), true, 'คุม: หมดสถานะ = ระเบิด');
  assert.deepEqual(P.E.pos, { x: 8, y: 8 });
});

test('Ice Spike ติดตัว 4+5: ลบสกิลติดตัว → ติดเชื่องช้า/ไพ่แตกลดระยะเดิน · โดนน้ำแข็งกัด/สตั้นจากแผนที่', () => {
  const P = setup([['I', 'ice_spike', 1, 5], ['B', 'dummy', 10, 5]]);
  assert.equal(ice.mapEffectImmune(P.I, 'frostbite'), true, 'คุม');
  assert.equal(Ice.applySlow(P.I, 3), false, 'คุม: ไม่ติดเชื่องช้า');
  P.I.statuses.noPassive = 2;
  assert.equal(ice.mapEffectImmune(P.I, 'frostbite'), false);
  assert.equal(ice.mapEffectImmune(P.I, 'stun'), false);
  P.I.cards = [{ value: 10 }, { value: 10 }, { value: 5 }];
  assert.equal(engine.movOf(P.I), 2, 'ไพ่แตก −1');
  P.I.cards = [];
  assert.equal(Ice.applySlow(P.I, 3), true, 'ติดเชื่องช้าได้');
});
