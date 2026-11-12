// เจ้าหญิง Echo สวมร่างเฟรดดี้ (ตัวที่ไม่มีสกิล มีแต่สกิลติดตัว — ผู้ใช้ 2026-11-12: "มันควรจะสวมได้ มันมีสกิลติดตัว")
//  ขึ้นในสมุด · สวมได้ · ได้สกิลติดตัวครบ (กลางวันล่องหน/มินิเกมประตู · กลางคืนเดิน 9) · คืนร่างได้
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const echo = require('../../characters/echo.js');
const fz = require('../../characters/freddy_fazbear.js');

const realRandom = Math.random;
const blank = (id, characterId, position) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId: null,
});
function setup() {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  engine.players.E = blank('E', 'echo', 1);
  engine.players.D = blank('D', 'dummy', 2);
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setJourneyArea(1);
  engine.setCycleShift(0);
  engine.setRoundNumber(1);
  const P = engine.players;
  P.E.pos = { x: 4, y: 7 }; P.D.pos = { x: 5, y: 7 };
  for (const p of Object.values(P)) { p.shield = 0; p.statuses = {}; p.statusAmt = {}; p.skillUsedRound = false; }
  return P;
}
function wearFreddy(P) {
  engine.setActor('E');
  engine.useSkill('E', 'basic', [], { form: 'freddy_fazbear' });
  assert.equal(P.E.characterId, 'freddy_fazbear');
}
const vit = (p) => (p.hp || 0) + (p.armor || 0);
const flush = (t, ms) => { for (let i = 0; i < ms / 100; i++) t.mock.timers.tick(100); };

const saved = { triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash, sfx: engine.sfx, boardFx: engine.boardFx };
test.before(() => { engine.triggerCutscene = () => {}; engine.queueCutscene = () => {}; engine.skillFlash = () => {}; engine.sfx = () => {}; engine.boardFx = () => {}; });
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.beforeEach(() => { Math.random = () => 0.99; });
test.afterEach(() => { Math.random = realRandom; engine.setCycleShift(0); engine.setRoundNumber(1); engine.clearPhaseTimer(); });

test('สมุด: เฟรดดี้ขึ้นในรายชื่อ เลือกได้ · คำบรรยายบอกสกิลติดตัว', () => {
  setup();
  const pub = engine.buildStateFor('E').players.find((q) => q.id === 'E');
  const c = pub.character.basic.choices.find((x) => x.key === 'freddy_fazbear');
  assert.ok(c, 'มีเฟรดดี้ในสมุด');
  assert.equal(c.locked, false);
  assert.match(c.desc, /ติดตัว: ปี 1987/);
});

test('กลางวัน: Echo ร่างเฟรดดี้ล่องหน · คนอื่นตีไม่ได้ · ดาเมจไม่เข้า', () => {
  const P = setup();
  wearFreddy(P);
  assert.equal(fz.stealthed(P.E), true);
  const before = vit(P.E);
  engine.withEffectSource(P.D, () => engine.dealMixed(P.E, 3, false));
  assert.equal(vit(P.E), before);
  engine.setActor('D');
  assert.equal(engine.attackTarget('D', 'E'), false);
});

test('กลางวัน: Echo ร่างเฟรดดี้ตี → มินิเกมประตู · ปิดผิด = เป้าโดนตี', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] });
  const P = setup();
  wearFreddy(P);
  engine.setActor('E');
  const before = vit(P.D);
  assert.equal(engine.attackTarget('E', 'D'), true);
  assert.equal(fz.doorView(engine, ['D']).side, 'foe');
  assert.equal(fz.doorAction(engine, 'D', 'left'), true); // สุ่ม 0.99 = ประตูขวา → ปิดผิด
  flush(t, 7000);
  assert.ok(before - vit(P.D) > 0, 'เป้าโดนตี');
  assert.equal(P.E.characterId, 'freddy_fazbear', 'ยังอยู่ในร่าง');
});

test('กลางคืน: เผยตัว · ระยะเดิน 9', () => {
  const P = setup();
  wearFreddy(P);
  engine.setRoundNumber(4);
  assert.equal(engine.isNightRound(4), true);
  assert.equal(fz.stealthed(P.E), false);
  assert.equal(engine.movOf(P.E), 9);
});

test('คืนร่างจากเฟรดดี้ได้ · กลับเป็น Echo · ไม่ล่องหนแล้ว', () => {
  const P = setup();
  wearFreddy(P);
  engine.setActor('E');
  assert.ok(echo.queenAction(engine, P.E, 'echo:diary'));
  assert.equal(P.E.characterId, 'echo');
  assert.equal(fz.stealthed(P.E), false);
  for (const v of ['E', 'D']) engine.buildStateFor(v);
});
