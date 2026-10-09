// ระยะสกิลบนกระดาน (GRID_PLAN.md §7): เป้าต้องอยู่ในระยะ · บัฟของโอเบรอน = ระยะเดิน · คลื่นดาบมุยมิแนว 4×3
//  และจังหวะบัฟ/สตั้นของจุดจบของความฝัน (§7.4) — ผ่าน engine จริง
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine, resolveRound } = require('../server.js');
const muimi = require('../characters/muimi.js');

const realRandom = Math.random;
const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
// list = [[id, characterId, x, y, teamId?], ...]
function setup(list, mode = 'ffa') {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, ch, , , team], i) => { engine.players[id] = blank(id, ch, i + 1, team || null); });
  engine.setGameMode(mode);
  engine.startMatch();
  engine.clearPhaseTimer();
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.hp = 5; p.armor = 0; p.shield = 0; p.skillPoints = 8; p.skillUsedRound = false;
    p.statuses = {}; p.statusAmt = {};
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

test('ข้อมูลระยะสกิล: มุยมิ self/self/แนว 4×3 · โอเบรอน รอบตัว/เป้า/เป้า = ระยะเดิน', () => {
  const { CHAR_BY_ID } = require('../characters.js');
  const m = CHAR_BY_ID.muimi, o = CHAR_BY_ID.oberon_summer;
  assert.deepEqual([m.basic.area.kind, m.secondary.area.kind], ['self', 'self']);
  assert.deepEqual(m.ultimate.area, { kind: 'line', len: 4, width: 3, hostile: true });
  for (const t of ['basic', 'secondary', 'ultimate']) assert.equal(o[t].area.range, 'mov');
  assert.equal(o.basic.area.kind, 'aoe');
  for (const ch of [m, o]) for (const t of ['basic', 'secondary', 'ultimate']) assert.doesNotMatch(ch[t].desc, /ก่อนเปิดไพ่|ไพ่แตก/);
});

test('state: ระยะ "mov" ส่งให้ client เป็นตัวเลข = ระยะเดินปกติสูงสุดของผู้เล่น', () => {
  setup([['O', 'oberon_summer', 7, 9], ['X', 'dummy', 0, 4]]);
  const me = engine.buildStateFor('O').players.find((p) => p.id === 'O');
  assert.equal(me.character.secondary.area.range, 4);
  assert.equal(me.character.basic.area.kind, 'aoe');
});

test('นกจาบยามเช้า: เป้าต้องอยู่ในระยะเดิน (4) · ไกลกว่านั้นกดไม่ได้และไม่เสียแต้ม · เลือกตัวเองได้', () => {
  const P = setup([['O', 'oberon_summer', 7, 9], ['N', 'dummy', 7, 5], ['F', 'dummy', 7, 4]]);
  engine.setActor('O');
  engine.useSkill('O', 'secondary', ['F']); // ห่าง 5
  assert.equal(P.O.skillPoints, 8);
  assert.equal(P.F.statuses.obsLark, undefined);
  engine.useSkill('O', 'secondary', ['N']); // ห่าง 4
  assert.equal(P.N.statuses.obsLark, 2);
  assert.equal(P.O.skillPoints, 4);
});

test('ม่านแห่งราตรี: บัฟเฉพาะคนในรัศมีเท่าระยะเดิน (รวมตัวเอง) — คนไกลไม่ได้', () => {
  const P = setup([['O', 'oberon_summer', 7, 9], ['N', 'dummy', 5, 7], ['F', 'dummy', 0, 4]]);
  engine.setActor('O');
  engine.useSkill('O', 'basic');
  assert.ok(P.O.statuses.obsVeil > 0);
  assert.ok(P.N.statuses.obsVeil > 0, 'ห่าง 4 อยู่ในรัศมี');
  assert.equal(P.F.statuses.obsVeil, undefined, 'อยู่ไกลเกินระยะ');
});

test('จุดจบของความฝัน: ให้ก่อนเป้าเดิน = ใช้ได้เทิร์นนี้ แล้วขึ้นเทิร์นใหม่สตั้นทันที', () => {
  const P = setup([['O', 'oberon_summer', 7, 9], ['T', 'dummy', 7, 8]]);
  P.O.cards = [{ value: 20, color: 'blue' }]; P.T.cards = [{ value: 10, color: 'blue' }]; // O เดินก่อน
  resolveRound(); engine.clearPhaseTimer();
  engine.finishActor(); engine.clearPhaseTimer();
  assert.equal(engine.actorId, 'O');
  engine.useSkill('O', 'ultimate', ['T']);
  assert.equal(P.T.statuses.obsDream, 1);
  assert.equal(P.T.obsDreamUseRound, engine.roundNumber);
  engine.endTurn(); engine.clearPhaseTimer();
  assert.equal(P.T.statuses.obsDream, undefined);
  assert.ok(P.T.statuses.stun > 0, 'สตั้นตอนขึ้นเทิร์นใหม่');
});

test('จุดจบของความฝัน: ให้หลังเป้าเดินไปแล้ว = บัฟค้างไปใช้ตาเดินเทิร์นหน้า แล้วค่อยสตั้น', () => {
  const P = setup([['O', 'oberon_summer', 7, 9], ['T', 'dummy', 7, 8]]);
  P.T.cards = [{ value: 20, color: 'blue' }]; P.O.cards = [{ value: 10, color: 'blue' }]; // T เดินก่อน
  resolveRound(); engine.clearPhaseTimer();
  engine.finishActor(); engine.clearPhaseTimer();
  assert.equal(engine.actorId, 'T');
  engine.waitAction('T'); engine.clearPhaseTimer();
  assert.equal(engine.actorId, 'O');
  const r0 = engine.roundNumber;
  engine.useSkill('O', 'ultimate', ['T']);
  assert.equal(P.T.obsDreamUseRound, r0 + 1);
  engine.endTurn(); engine.clearPhaseTimer();
  assert.ok(P.T.statuses.obsDream > 0, 'บัฟยังอยู่ให้ใช้เทิร์นหน้า');
  assert.equal(P.T.statuses.stun, undefined, 'ยังไม่สตั้น');
  engine.setRoundNumber(r0 + 1);
  engine.endTurn(); engine.clearPhaseTimer();
  assert.equal(P.T.statuses.obsDream, undefined);
  assert.ok(P.T.statuses.stun > 0);
});

test('คลื่นดาบมุยมิ: ต้องเลือกทิศ · โดนศัตรูทุกคนในแนว 4×3 เท่าพลังโจมตี (1+3) เกราะรับก่อน · คนนอกแนวไม่โดน · ใช้แล้วเดินไม่ได้', () => {
  const P = setup([['M', 'muimi', 7, 9], ['A', 'dummy', 7, 8], ['B', 'dummy', 6, 5], ['C', 'dummy', 7, 4], ['D', 'dummy', 9, 8]]);
  P.A.armor = 2;
  engine.setActor('M');
  engine.useSkill('M', 'ultimate', [], {});
  assert.equal(P.M.statuses.muimiTower, undefined, 'ไม่เลือกทิศ = กดไม่ได้');
  engine.useSkill('M', 'ultimate', [], { dir: 'up' });
  assert.ok(P.M.statuses.muimiTower > 0);
  assert.equal(P.A.armor, 0); assert.equal(P.A.hp, 3, 'ดาเมจ 4: เกราะ 2 ก่อน แล้วเลือด 2');
  assert.equal(P.B.hp, 1, 'แนวกว้าง 3 · ยาว 4 (y 8..5)');
  assert.equal(P.C.hp, 5, 'ยาวเกิน 4 ช่อง');
  assert.equal(P.D.hp, 5, 'นอกแนวด้านข้าง');
  // เนิฟ: โบนัส +3 เป็นของคลื่นดาบเท่านั้น — ตีปกติหลังจากนั้นระหว่างดาบสะบั้นได้แค่ +1
  assert.equal(engine.attackPowerAgainst(P.M, P.D), 1 + muimi.TOWER_ATK_BONUS);
  assert.equal(muimi.TOWER_ATK_BONUS, 1);
  assert.equal(engine.action.locked, true);
  assert.equal(engine.moveTo('M', 7, 10), false);
});

test('คลื่นดาบมุยมิ: ศัตรูในแนวหลบได้ทุกคน = เสียดาบสะบั้น + เข้าคูลดาวน์ทันที · โดนอย่างน้อย 1 คน = ได้ตามปกติ', () => {
  let P = setup([['M', 'muimi', 7, 9], ['E', 'dummy', 7, 8]]);
  engine.applyEvade(P.E, 100);
  Math.random = () => 0;
  engine.setActor('M');
  engine.useSkill('M', 'ultimate', [], { dir: 'up' });
  assert.equal(P.E.hp, 5, 'หลบหลีก 100%');
  assert.equal(P.M.statuses.muimiTower, undefined, 'หลบหมด = เสียดาบสะบั้น');
  assert.ok(muimi.ultCooldownLeft(engine, P.M) > 0, 'เข้าคูลดาวน์ทันที');

  P = setup([['M', 'muimi', 7, 9], ['E', 'dummy', 7, 8], ['G', 'dummy', 6, 7]]);
  engine.applyEvade(P.E, 100);
  Math.random = () => 0;
  engine.setActor('M');
  engine.useSkill('M', 'ultimate', [], { dir: 'up' });
  assert.equal(P.G.hp, 1, 'โดน 1 คน');
  assert.ok(P.M.statuses.muimiTower > 0, 'โดนอย่างน้อย 1 คน = ยังได้ดาบสะบั้น');
});

test('คลื่นดาบมุยมิ: หลบหลีกหลบได้ · ไม่โดนเพื่อนร่วมทีม', () => {
  const P = setup([['M', 'muimi', 7, 9, 'A'], ['F', 'dummy', 7, 8, 'A'], ['E', 'dummy', 8, 7, 'B'], ['G', 'dummy', 6, 7, 'B']], 'duo');
  engine.applyEvade(P.E, 100);
  Math.random = () => 0;
  engine.setActor('M');
  engine.useSkill('M', 'ultimate', [], { dir: 'up' });
  assert.equal(P.F.hp, 5, 'เพื่อนร่วมทีมไม่โดน');
  assert.equal(P.E.hp, 5, 'หลบหลีก 100%');
  assert.equal(P.G.hp, 1);
});

test('ดาบสนิมระหว่างดาบสะบั้น: 6 แต้ม · คลื่นดาบแนว 4×3 แรงเท่าท่าไม้ตาย (1+3) · ไม่ได้สถานะใดเพิ่ม · ปกติยังเป็น self 4 แต้ม', () => {
  const P = setup([['M', 'muimi', 7, 9], ['A', 'dummy', 7, 8], ['B', 'dummy', 6, 5], ['C', 'dummy', 7, 4]]);
  let me = engine.buildStateFor('M').players.find((p) => p.id === 'M');
  assert.deepEqual(me.character.secondary.area, { kind: 'self' });
  assert.equal(me.character.secondary.cost, 4);
  P.M.statuses.muimiTower = 2;
  me = engine.buildStateFor('M').players.find((p) => p.id === 'M');
  assert.deepEqual(me.character.secondary.area, muimi.WAVE_AREA);
  assert.deepEqual(muimi.WAVE_AREA, require('../characters.js').CHAR_BY_ID.muimi.ultimate.area, 'คลื่นเท่าท่าไม้ตาย');
  assert.equal(me.character.secondary.cost, 6);
  const fx = [];
  const realFx = engine.boardFx;
  engine.boardFx = (event, payload) => fx.push({ event, payload });
  try {
    engine.setActor('M');
    engine.useSkill('M', 'secondary', [], {});
    assert.equal(P.M.skillPoints, 8, 'ไม่เลือกทิศ = กดไม่ได้');
    engine.useSkill('M', 'secondary', [], { dir: 'up' });
  } finally {
    engine.boardFx = realFx;
  }
  assert.equal(P.M.skillPoints, 2);
  assert.equal(P.A.hp, 1, 'ดาเมจ 1 + 3');
  assert.equal(P.B.hp, 1);
  assert.equal(P.C.hp, 5, 'ยาวเกิน 4 ช่อง');
  assert.equal(P.M.statuses.muimiTower, 2, 'ไม่ยืดดาบสะบั้น');
  assert.equal(P.M.statuses.muimiRusty, undefined, 'ไม่ได้ดาบเก่าๆ');
  assert.equal(P.M.statuses.resist, undefined, 'ไม่ได้ต้านสถานะ');
  assert.deepEqual(fx, [{ event: 'quakeFx', payload: { from: { x: 7, y: 9 }, dir: 'up', len: 4, width: 3, color: engine.colorOf(P.M) } }]);
  assert.equal(engine.action.locked, true);
});

test('ท่าไม้ตายมุยมิ: พื้นระเบิดบนกระดาน (quakeFx) ตามแนวที่เลือก', () => {
  const P = setup([['M', 'muimi', 7, 9], ['A', 'dummy', 7, 8]]);
  const fx = [];
  const realFx = engine.boardFx;
  engine.boardFx = (event, payload) => fx.push({ event, payload });
  try {
    engine.setActor('M');
    engine.useSkill('M', 'ultimate', [], { dir: 'left' });
  } finally {
    engine.boardFx = realFx;
  }
  assert.deepEqual(fx, [{ event: 'quakeFx', payload: { from: { x: 7, y: 9 }, dir: 'left', len: 4, width: 3, color: engine.colorOf(P.M) } }]);
});
