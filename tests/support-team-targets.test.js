// ซัพพอร์ต (โอเบรอนฤดูร้อน) เลือกเพื่อนร่วมทีมเป็นเป้าหมายได้ทุกโหมดทีม
//  บั๊กเดิม: ใช้ sameTeam() ตัดสิน ซึ่งคืน false ให้ "เป้าที่ผู้เล่นกดเลือกเอง" (explicitTargetIds)
//  เพื่อนที่ถูกเลือกจึงกลายเป็นคนนอกทีม -> สกิลถูกปฏิเสธ · ตอนนี้ใช้ engine.isAlly() แทน
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');

const blank = (id, characterId, position, teamId) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});

// mode: 'duo' | 'trio' — supportId นั่งที่ S · M = เพื่อน · E = ศัตรู · 'dummy' = ตัวละครสมมติไม่มีฮุค
function setup(mode, supportId) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  engine.players.S = blank('S', supportId, 1, 'A');
  engine.players.M = blank('M', 'dummy', 2, 'A');
  if (mode === 'trio') engine.players.M2 = blank('M2', 'dummy', 3, 'A');
  engine.players.E = blank('E', 'dummy', 4, 'B');
  engine.setGameMode(mode);
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setGameState('PLAYING');
  for (const p of Object.values(engine.players)) {
    p.locked = false; p.skillPoints = 8; p.skillUsedRound = false;
    p.hp = 3; p.armor = 3; p.shield = 0; p.statuses = {}; p.statusAmt = {};
    p.cards = [{ value: 5, color: 'red' }, { value: 4, color: 'blue' }];
  }
  // ยืนใกล้กันกลางกระดาน — ทุกคนอยู่ในระยะสกิล (ระยะบัฟของโอเบรอน = ระยะเดิน 4)
  const spots = [{ x: 7, y: 9 }, { x: 7, y: 8 }, { x: 8, y: 9 }, { x: 6, y: 9 }, { x: 7, y: 10 }];
  Object.values(engine.players).forEach((p, i) => { p.pos = { ...spots[i] }; });
  engine.setActor('S'); // ใช้สกิลได้เฉพาะตาเดินของตัวเอง (GRID_PLAN §7)
  return engine.players;
}

const saved = { triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash };
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = () => {};
  engine.skillFlash = () => {};
});
test.after(() => {
  Object.assign(engine, saved);
  engine.setGameMode('ffa');
  for (const id of Object.keys(engine.players)) delete engine.players[id];
});
test.afterEach(() => { engine.clearPhaseTimer(); });

for (const mode of ['duo', 'trio']) {
  test(`${mode}: โอเบรอน นกจาบ + จุดจบของความฝัน เลือกเพื่อนได้`, () => {
    const { S, M } = setup(mode, 'oberon_summer');
    engine.useSkill('S', 'secondary', ['M']);
    assert.equal(M.statuses.resist, 2);
    engine.useSkill('S', 'ultimate', ['M']);
    assert.equal(M.statuses.obsDream, 1);
    assert.equal(S.skillPoints, 0);
  });
  test(`${mode}: ท่าที่มอบให้ "ทุกคน" ได้ถึงเพื่อน แต่ไม่ถึงศัตรู`, () => {
    const { S, M, M2, E } = setup(mode, 'oberon_summer');
    engine.useSkill('S', 'basic');
    assert.equal(S.statuses.obsVeil, 3);
    assert.equal(M.statuses.obsVeil, 3);
    if (M2) assert.equal(M2.statuses.obsVeil, 3);
    assert.equal(E.statuses.obsVeil, undefined);
  });
}
