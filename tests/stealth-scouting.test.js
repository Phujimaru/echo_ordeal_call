// เห็นคนล่องหนในระยะ (server/visibility.js eyeOf — ผู้ใช้สั่ง 2026-10-24): ยังเดินต่อได้ = มองจากช่องเริ่มตา · เดินต่อไม่ได้แล้ว = มองจากช่องที่ยืน
//  กันเดินวนทั้งแมพหาคนล่องหน · เปิดดูร้าน (shop.viewShop) = เดินต่อไม่ได้แม้ไม่ซื้อ
//  แถว y = 7..8 ของภูมิภาค I โล่งตลอด x 0..13
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const match = require('../server/match.js');
const shop = require('../server/shop.js');
const action = require('../server/phases/action.js');

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
  engine.setRoundNumber(5);
  match.shopPos = null;
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.skillUsedRound = false; p.shield = 0; p.statuses = {}; p.statusAmt = {};
    if (p.characterId !== 'fern') p.skillPoints = 8;
  }
  return engine.players;
}
const view = (viewerId, id) => engine.buildStateFor(viewerId).players.find((p) => p.id === id);
// เฟิร์นเข้าซ่อนเร้นมานา (ศัตรูในระยะ 2 เห็น)
function conceal(P) {
  P.F.fern.concealReady = 0;
  engine.setActor('F');
  engine.useSkill('F', 'ultimate', []);
  assert.ok(P.F.fern.conceal);
}

const saved = { triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash };
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = () => {};
  engine.skillFlash = () => {};
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.afterEach(() => { engine.clearPhaseTimer(); });

test('เดินเข้าระยะเห็นของคนล่องหนระหว่างที่ยังเดินต่อได้ = ยังไม่เห็น · ล็อกการเดินแล้ว = เห็น', () => {
  const P = setup([['F', 'fern', 10, 7], ['A', 'dummy', 4, 7], ['C', 'dummy', 0, 0]]);
  conceal(P);
  engine.setActor('A');
  assert.equal(view('A', 'F').pos, null);
  assert.equal(engine.moveTo('A', 8, 7), true);
  assert.deepEqual(P.A.pos, { x: 8, y: 7 });
  assert.equal(view('A', 'F').pos, null, 'ยังเดินต่อได้');
  assert.equal(engine.attackTarget('A', 'F'), false);
  action.lockMove(P.A);
  assert.deepEqual(view('A', 'F').pos, { x: 10, y: 7 }, 'เดินต่อไม่ได้แล้ว');
});

test('เริ่มตาในระยะเห็น = เห็นตลอดตา แม้เดินออกห่าง · ไม่ใช่ตาของตัวเอง = มองจากช่องที่ยืน', () => {
  const P = setup([['F', 'fern', 10, 7], ['A', 'dummy', 8, 7], ['C', 'dummy', 0, 0]]);
  conceal(P);
  assert.deepEqual(view('A', 'F').pos, { x: 10, y: 7 }, 'ตาของเฟิร์น');
  engine.setActor('A');
  assert.equal(engine.moveTo('A', 5, 7), true);
  assert.deepEqual(view('A', 'F').pos, { x: 10, y: 7 }, 'มองจากช่องเริ่มตา');
  action.lockMove(P.A);
  assert.equal(view('A', 'F').pos, null, 'ล็อกแล้วมองจากช่องที่ยืน');
});

test('เปิดดูร้าน (ยืนติดร้าน · ตาของตัวเอง) = เดินต่อ/ย้อนไม่ได้แม้ไม่ซื้อ · ไม่ติดร้าน/ไม่ใช่ตา = ไม่มีผล', () => {
  const P = setup([['A', 'dummy', 4, 7], ['B', 'dummy', 0, 0]]);
  match.shopPos = { x: 6, y: 8 };
  engine.setActor('A');
  shop.viewShop('A');
  assert.equal(match.action.locked, false, 'ไม่ติดร้าน');
  shop.viewShop('B');
  assert.equal(match.action.locked, false, 'ไม่ใช่ตา');
  assert.equal(engine.moveTo('A', 6, 7), true);
  shop.viewShop('A');
  assert.equal(match.action.locked, true);
  assert.equal(engine.moveTo('A', 7, 7), false);
  assert.equal(engine.undoMove('A'), false);
  assert.deepEqual(P.A.pos, { x: 6, y: 7 });
});
