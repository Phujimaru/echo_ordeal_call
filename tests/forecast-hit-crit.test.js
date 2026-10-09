// หน้าต่างคาดการณ์ (GRID_PLAN §6): โอกาสโดน/คริติคอลของตีปกติ — estimateHitOn / estimateCritOf + state.forecast
//  สูตรเดียวกับ strike(): แม่นยำ = 100 · ไม่งั้นคูณโอกาสรอด หลบหลีก × ช่องที่เป้ายืน × ป่าไม้ต้องสาปกลางวัน
//  ค่าประเมินต้องไม่ทอย (Math.random) และไม่แตะสถานะ (หลบหลีกยังอยู่ครบ)
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine, resolveRound } = require('../server.js');
const attack = require('../server/phases/attack.js');
const view = require('../server/view.js');
const Journey = require('../characters/_journey.js');

const realRandom = Math.random;
const blank = (id, position) => ({
  id, name: id, position, characterId: 'dummy', alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId: null,
});
// เริ่มแมตช์แล้วย้ายไปกระดานภูมิภาค area · ตั้งตำแหน่งตาม pos
function setup(area, pos) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  Object.keys(pos).forEach((id, i) => { engine.players[id] = blank(id, i + 1); });
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.placeOnBoard(area);
  for (const p of Object.values(engine.players)) {
    p.hp = engine.maxHpOf(p); p.armor = 0; p.shield = 0; p.statuses = {}; p.statusAmt = {}; p.skillPoints = 5;
    p.pos = { ...pos[p.id] };
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
test.afterEach(() => { Math.random = realRandom; engine.clearPhaseTimer(); });
// ห้ามทอยระหว่างประเมิน
const noRandom = () => { Math.random = () => { throw new Error('estimate ห้ามเรียก Math.random'); }; };

test('ค่าเริ่มต้น: เป้ายืนบนพื้นธรรมดา ไม่มีสถานะ ไม่มีผลสนาม → โดน 100 · คริ 0', () => {
  // ภูมิภาค II (7,3) พื้น · (6,3) พื้น
  const P = setup(2, { A: { x: 7, y: 3 }, B: { x: 6, y: 3 } });
  noRandom();
  assert.equal(attack.estimateHitOn(P.A, P.B), 100);
  assert.equal(attack.estimateCritOf(P.A, P.B), 0);
});

test('หลบหลีก 50% + พุ่มดอกไม้สูง 20% → โดน 40 (0.5 × 0.8) · ไม่แตะหลบหลีก', () => {
  // ภูมิภาค II (6,4) พุ่มดอกไม้สูง
  const P = setup(2, { A: { x: 6, y: 3 }, B: { x: 6, y: 4 } });
  engine.applyEvade(P.B, 50);
  noRandom();
  assert.equal(attack.estimateHitOn(P.A, P.B), 40);
  assert.equal(P.B.statuses.evade, 1, 'ประเมินแล้วหลบหลีกต้องยังอยู่');
  assert.equal(P.B.statusAmt.evade, 50);
  // หลบหลีกไม่ระบุ % = 100 → โดนไม่ได้เลย
  delete P.B.statusAmt.evade;
  assert.equal(attack.estimateHitOn(P.A, P.B), 0);
  // ช่องอย่างเดียว
  P.B.statuses = {};
  assert.equal(attack.estimateHitOn(P.A, P.B), 80);
});

test('แม่นยำ: เจาะการหลบหลีกทุกแบบ → โดน 100 แม้เป้าหลบหลีก + ยืนในพุ่มดอกไม้', () => {
  const P = setup(2, { A: { x: 6, y: 3 }, B: { x: 6, y: 4 } });
  P.B.statuses.evade = 1; P.B.statusAmt.evade = 50;
  P.A.statuses.accurate = 1;
  noRandom();
  assert.equal(attack.estimateHitOn(P.A, P.B), 100);
});

test('ผลสนาม: ป่าไม้ต้องสาปกลางวันพลาด 40% → โดน 60 · อาณาจักรน้ำแข็งกลางวัน คริ 20', () => {
  const P = setup(2, { A: { x: 7, y: 3 }, B: { x: 6, y: 3 } });
  const round = engine.roundNumber, area = engine.journeyArea;
  try {
    engine.setRoundNumber(13);
    engine.setJourneyArea(3);
    assert.deepEqual(Journey.current(engine), { area: 3, night: false });
    noRandom();
    assert.equal(Journey.attackMissPct(engine), Journey.FOREST_ATK_MISS_PCT);
    assert.equal(attack.estimateHitOn(P.A, P.B), 100 - Journey.FOREST_ATK_MISS_PCT);
    assert.equal(attack.estimateCritOf(P.A, P.B), 0);
    Math.random = realRandom;
    engine.setJourneyArea(6);
    assert.deepEqual(Journey.current(engine), { area: 6, night: false });
    noRandom();
    assert.equal(attack.estimateHitOn(P.A, P.B), 100);
    assert.equal(attack.estimateCritOf(P.A, P.B), Journey.ICE_CRIT_PCT);
  } finally { engine.setRoundNumber(round); engine.setJourneyArea(area); }
});

test('state.forecast: คนที่กำลังเดินเห็น { dmg, back, hit, crit, backHit, backCrit } ต่อศัตรู', () => {
  // A ยืนในพุ่มดอกไม้ (6,4) → ฝั่ง B ตีสวน A โดน 80 · B ยืนบนพื้น (6,3) → A ตี B โดน 100
  const P = setup(2, { A: { x: 6, y: 4 }, B: { x: 6, y: 3 } });
  P.A.cards = [{ value: 20, color: 'blue' }]; P.B.cards = [{ value: 19, color: 'blue' }];
  resolveRound();
  engine.clearPhaseTimer();
  engine.finishActor(); // ORDER → ตาเดินของ A
  engine.clearPhaseTimer();
  assert.equal(engine.gameState, 'ACTION');
  assert.equal(engine.actorId, 'A');
  const f = view.buildStateFor('A').forecast;
  assert.deepEqual(Object.keys(f.B).sort(), ['back', 'backCrit', 'backHit', 'crit', 'dmg', 'hit']);
  assert.equal(f.B.hit, 100);
  assert.equal(f.B.crit, 0);
  assert.equal(f.B.backHit, 80);
  assert.equal(f.B.backCrit, 0);
  assert.equal(view.buildStateFor('B').forecast, null, 'ไม่ใช่ตาของ B');
});
