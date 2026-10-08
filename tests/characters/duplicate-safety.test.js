// ตัวละครซ้ำในแมตช์เดียว (เลือกตัวเดียวกันได้หลายคน): สถานะ/ตัวนับของแต่ละคนต้องแยกกัน ไม่เขียนทับกัน
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const muimi = require('../../characters/muimi.js');
const oberon = require('../../characters/oberon_summer.js');

const cutsceneFns = {
  triggerCutscene: engine.triggerCutscene,
  queueCutscene: engine.queueCutscene,
  pausePlayingForCutscene: engine.pausePlayingForCutscene,
  skillFlash: engine.skillFlash,
};

test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = () => {};
  engine.pausePlayingForCutscene = () => {};
  engine.skillFlash = () => {};
});

test.after(() => {
  Object.assign(engine, cutsceneFns);
  for (const id of Object.keys(engine.players)) delete engine.players[id];
});

let uid = 0;
function player(characterId, over = {}) {
  const id = `dup${++uid}`;
  const p = Object.assign({
    id, name: id, characterId, alive: true, position: uid, hp: 20, armor: 0, shield: 0, gold: 0,
    skillPoints: 4, gainedSkill: 0, cards: [], statuses: {}, statusAmt: {}, cutsceneShown: {}, seen: {},
    inventory: [], wasAttacked: false, isWinner: false, isLoser: false, busted: false,
  });
  if (characterId === 'muimi') muimi.resetCombat(p);
  if (characterId === 'oberon_summer') oberon.resetCombat(p);
  Object.assign(p, over);
  engine.players[id] = p;
  return p;
}

test.beforeEach(() => {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  engine.setGameMode('ffa');
  engine.setRoundNumber(3);
});

test('โอเบรอน 2 คน: คูลดาวน์ท่าไม้ตาย / โควตานกจาบของแต่ละคนแยกกัน', () => {
  const a = player('oberon_summer');
  const b = player('oberon_summer');
  const target = player('dummy');
  oberon.applyInstantSkill(engine, a, 'ultimate', [target.id]);
  oberon.applyInstantSkill(engine, a, 'secondary', [target.id]);
  assert.equal(oberon.canUseSkill(engine, a, 'ultimate', [target.id]), false);
  assert.equal(oberon.canUseSkill(engine, a, 'secondary', [target.id]), false);
  assert.equal(oberon.canUseSkill(engine, b, 'ultimate', [target.id]), true, 'คูลดาวน์ของอีกคนต้องไม่ติดมา');
  assert.equal(oberon.canUseSkill(engine, b, 'secondary', [target.id]), true, 'โควตาของอีกคนต้องไม่ติดมา');
});

test('โอเบรอน 2 คน: หน้าไหว้หลังหลอกนับเฉพาะคนที่ไม่ถูกโจมตี คนละครั้ง', () => {
  const a = player('oberon_summer');
  const b = player('oberon_summer');
  const c = player('oberon_summer', { wasAttacked: true });
  oberon.onEndTurn(engine);
  assert.deepEqual([a.skillPoints, a.gold], [5, 1]);
  assert.deepEqual([b.skillPoints, b.gold], [5, 1], 'แต่ละคนได้ของตัวเอง ไม่ใช่ได้ซ้อนจากอีกคน');
  assert.deepEqual([c.skillPoints, c.gold], [4, 0]);
});

test('มุยมิ 2 คน: เสบียงฉุกเฉินและคูลดาวน์ท่าไม้ตายนับแยกกัน', () => {
  const a = player('muimi');
  const b = player('muimi');
  muimi.applyInstantSkill(engine, a, 'basic');
  assert.equal(a.muimiEmergencyUses, muimi.EMERGENCY_USES - 1);
  assert.equal(b.muimiEmergencyUses, muimi.EMERGENCY_USES);
  assert.equal(muimi.canUseSkill(engine, b, 'basic'), true);
  muimi.onUltExpire(engine, a);
  assert.ok(muimi.ultCooldownLeft(engine, a) > 0);
  assert.equal(muimi.ultCooldownLeft(engine, b), 0, 'คูลดาวน์ของอีกคนต้องไม่ติดมา');
});

test('มุยมิ 2 คน: หัวใจนักสู้นับแพ้ต่อเนื่องของใครของมัน', () => {
  const a = player('muimi', { muimiLoseStreak: 2, isLoser: true });
  const b = player('muimi', { muimiLoseStreak: 2, isWinner: true });
  muimi.onAfterRoundScores(engine, [a, b]);
  assert.equal(a.muimiLoseStreak, 3);
  assert.equal(a.muimiHeartRound, 4);
  assert.equal(b.muimiLoseStreak, 0, 'คนที่ชนะรีเซ็ตเฉพาะของตัวเอง');
  assert.equal(b.muimiHeartRound, 0);
});
