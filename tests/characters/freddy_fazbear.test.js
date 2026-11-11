// เฟรดดี้ ฟาซแบร์ — กลางวันล่องหน/แตะไม่ได้ · มินิเกมประตู · กลางคืนเดิน 9 + เดินต่อ 3 · ฆ่าแล้วฟื้น 2 · PVE ร่างกลางคืน
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const fz = require('../../characters/freddy_fazbear.js');
const { CHAR_BY_ID } = require('../../characters.js');

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
  engine.setRoundNumber(1);
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.shield = 0; p.statuses = {}; p.statusAmt = {};
  }
  return engine.players;
}
const vit = (p) => (p.hp || 0) + (p.armor || 0);
const flush = (t, ms = 15000) => { for (let i = 0; i < ms / 100; i++) t.mock.timers.tick(100); };

const saved = { triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash, sfx: engine.sfx, boardFx: engine.boardFx };
const fx = [];
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = (p, key) => fx.push({ event: 'cut', payload: key });
  engine.skillFlash = () => {};
  engine.sfx = () => {};
  engine.boardFx = (event, payload) => fx.push({ event, payload });
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.beforeEach(() => { fx.length = 0; Math.random = () => 0.99; });
test.afterEach(() => { Math.random = realRandom; engine.setGameMode('ffa'); engine.setCycleShift(0); engine.setRoundNumber(1); engine.clearPhaseTimer(); });

test('ข้อมูล: เอาฮา · ไม่มีสกิล · เดิน 4 ประชิด', () => {
  const ch = CHAR_BY_ID.freddy_fazbear;
  assert.equal(ch.difficulty, 'fun');
  assert.equal(ch.basic, null);
  assert.equal(ch.secondary, null);
  assert.equal(ch.ultimate, null);
  assert.deepEqual(ch.range, [1, 1]);
});

test('กลางวัน: ล่องหน · เดิน 4 · ตีด้วยพลังโจมตี 4 · ศัตรูทำอะไรไม่ได้', () => {
  const P = setup([['F', 'freddy_fazbear', 4, 7], ['D', 'dummy', 5, 7]]);
  assert.equal(engine.movOf(P.F), 4);
  assert.equal(fz.stealthed(P.F), true);
  assert.equal(fz.attackBaseOverride(engine, P.F, P.D), 4);
  const before = vit(P.F);
  engine.withEffectSource(P.D, () => engine.dealMixed(P.F, 3, false));
  assert.equal(vit(P.F), before, 'กลางวันไม่มีดาเมจจากคนอื่นเข้า');
  engine.setActor('D');
  assert.equal(engine.attackTarget('D', 'F'), false, 'ตีคนที่มองไม่เห็นไม่ได้');
});

test('กลางคืน: เผยตัว · เดิน 9 · พลังโจมตี 3 · ตีแล้วเดินต่อ 3 ช่อง', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] });
  const P = setup([['F', 'freddy_fazbear', 4, 7], ['D', 'dummy', 5, 7]]);
  engine.setRoundNumber(4);
  assert.equal(engine.isNightRound(4), true);
  assert.equal(fz.stealthed(P.F), false);
  assert.equal(engine.movOf(P.F), 9);
  assert.equal(fz.attackBaseOverride(engine, P.F, P.D), 3);
  engine.setActor('F');
  assert.equal(engine.attackTarget('F', 'D'), true);
  assert.equal(fz.doorView(engine, ['D']), null, 'กลางคืนไม่มีประตู');
  for (let i = 0; i < 120 && !(engine.action && engine.action.canto); i++) t.mock.timers.tick(100); // คลิปกลางคืน + ฉากตี
  assert.equal(engine.actorId, 'F', 'ยังอยู่ในตา (เดินต่อ)');
  assert.equal(engine.action.canto, true);
  assert.equal(engine.action.cantoMov, 3);
});

test('กลางวัน ตี → มินิเกมประตู: ปิดผิด = โดนตี 4', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] });
  const P = setup([['F', 'freddy_fazbear', 4, 7], ['D', 'dummy', 5, 7]]);
  engine.setActor('F');
  const before = vit(P.D);
  const Cut = require('../../server/cutscene.js');
  const realQ = Cut.queueCutscene, cuts = [];
  Cut.queueCutscene = (p, key, onlyFor) => { cuts.push({ key, onlyFor }); };
  t.after(() => { Cut.queueCutscene = realQ; });
  assert.equal(engine.attackTarget('F', 'D'), true);
  const v = fz.doorView(engine, ['D']);
  assert.equal(v.side, 'foe');
  assert.equal(fz.doorView(engine, ['F']).side, 'freddy');
  assert.equal(fz.doorAction(engine, 'F', 'left'), false, 'เฟรดดี้ไม่ต้องเลือก (สุ่มให้)');
  assert.equal(fz.doorView(engine, ['D']).enter, null, 'เป้าไม่เห็นประตูที่เฟรดดี้เข้าก่อนผลออก');
  assert.equal(fz.doorAction(engine, 'D', 'left'), true); // สุ่ม 0.99 = ประตูขวา
  assert.equal(fz.doorView(engine, ['F']).result, 'enter');
  flush(t, 3000);
  assert.equal(before - vit(P.D), 4);
  const cut = cuts.find((c) => c.key === fz.CUT.scare);
  assert.ok(cut, 'คลิปจัมป์สแกร์ก่อนฉากตี');
  assert.deepEqual(cut.onlyFor, ['D'], 'ไม่เล่นบนจอของเฟรดดี้');
  flush(t, 4000);
  const d = Math.abs(P.F.pos.x - 4) + Math.abs(P.F.pos.y - 7);
  assert.ok(d >= 1 && d <= 5, `ตีโดนแล้ววาปออก (ระยะ ${d})`);
});

test('กลางวัน ปิดถูก = เฟรดดี้เสียหาย 3 + วาประยะ 3–5', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] });
  const P = setup([['F', 'freddy_fazbear', 4, 7], ['D', 'dummy', 5, 7]]);
  engine.setActor('F');
  const before = vit(P.D), fBefore = vit(P.F), from = { ...P.F.pos };
  engine.attackTarget('F', 'D');
  fz.doorAction(engine, 'D', 'right');
  flush(t, 3000);
  assert.equal(vit(P.D), before);
  assert.equal(fBefore - vit(P.F), 3);
  const d = Math.abs(P.F.pos.x - from.x) + Math.abs(P.F.pos.y - from.y);
  assert.ok(d >= 1 && d <= 5, `วาประยะ ${d}`);
  flush(t, 3000);
  assert.notEqual(engine.actorId, 'F', 'จบตา');
});

test('กลางวัน หมดเวลา: เป้าไม่ได้ปิด = โดนตี', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] });
  const P = setup([['F', 'freddy_fazbear', 4, 7], ['D', 'dummy', 5, 7]]);
  engine.setActor('F');
  const before = vit(P.D);
  engine.attackTarget('F', 'D');
  flush(t, 12800);
  assert.equal(before - vit(P.D), 4);
});

test('กลางวัน เป้าหลบได้ = ไม่มีประตู วาปออก', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] });
  const P = setup([['F', 'freddy_fazbear', 4, 7], ['D', 'dummy', 5, 7]]);
  engine.applyBuff(P.D, 'evade', 100, 2);
  engine.setActor('F');
  const before = vit(P.D), from = { ...P.F.pos };
  engine.attackTarget('F', 'D');
  assert.equal(fz.doorView(engine, ['D']), null);
  flush(t, 5000);
  assert.equal(vit(P.D), before);
  assert.notDeepEqual(P.F.pos, from);
});

test('สังหารผู้เล่น ฟื้นพลังชีวิต 2', () => {
  const P = setup([['F', 'freddy_fazbear', 4, 7], ['D', 'dummy', 5, 7]]);
  P.F.hp = 3;
  fz.onKill(engine, P.F, P.D);
  assert.equal(P.F.hp, 5);
});

test('PVE (Eos/Moon Cell): ร่างกลางคืน · พลังโจมตี 6 · คริ 50%', () => {
  const P = setup([['F', 'freddy_fazbear', 4, 7], ['D', 'dummy', 5, 7]]);
  engine.setGameMode('moon');
  assert.equal(fz.stealthed(P.F), false);
  assert.equal(engine.movOf(P.F), 9);
  assert.equal(fz.attackBaseOverride(engine, P.F, P.D), 6);
  assert.equal(fz.critPct(P.F), 50);
});

test('เพลง: ศัตรูห่าง ≤ 3 ช่องได้ยิน (กลางวัน)', () => {
  const P = setup([['F', 'freddy_fazbear', 4, 7], ['D', 'dummy', 7, 7], ['E', 'dummy', 9, 7]]);
  assert.equal(fz.nearView(engine, ['D']), true);
  assert.equal(fz.nearView(engine, ['E']), false);
  assert.equal(fz.nearView(engine, ['F']), true);
  engine.setRoundNumber(4);
  assert.equal(fz.nearView(engine, ['D']), false);
  assert.ok(P);
});

test('ปุ่ม HUD: ขู่กดได้ตลอด · กล่องดนตรีเฉพาะกลางคืน · ปุ่มละครั้งต่อเทิร์น', () => {
  const P = setup([['F', 'freddy_fazbear', 4, 7], ['D', 'dummy', 5, 7]]);
  engine.setActor('F');
  assert.deepEqual(fz.hudActions(engine, P.F).map((a) => a.key), ['growl1', 'growl2']);
  assert.ok(fz.hudActions(engine, P.F).every((a) => a.row === 'growl'), 'ปุ่มขู่แบ่งครึ่งแถวเดียว');
  assert.equal(fz.charAction(engine, P.F, 'box'), false);
  assert.equal(fz.charAction(engine, P.F, 'growl1'), true);
  assert.equal(fz.charAction(engine, P.F, 'growl1'), false);
  assert.equal(fz.charAction(engine, P.F, 'growl2'), true);
  engine.setRoundNumber(4);
  engine.setActor('F');
  assert.deepEqual(fz.hudActions(engine, P.F).map((a) => a.key), ['growl1', 'growl2', 'box']);
  assert.equal(fz.charAction(engine, P.F, 'box'), true);
});
