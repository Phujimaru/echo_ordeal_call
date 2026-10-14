// โอเบรอน (ฤดูร้อน) — characters/oberon_summer.js ผ่าน engine จริง (server.js)
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const ob = require('../../characters/oberon_summer.js');
const CHARACTERS = require('../../characters.js');
const draw = require('../../server/phases/draw.js');

const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
// จบเทิร์นแล้วขึ้นเทิร์นใหม่ทันที (ไม่รอตัวจับเวลาจริงของ TRANSITION/ฉากเปลี่ยนภูมิภาค) — ลูปลดเทิร์น/onEndTurn/onRoundStartTick ครบ
function nextRound() {
  const round = engine.roundNumber;
  engine.setGameState('ATTACKING');
  engine.endTurn(); engine.clearPhaseTimer();
  draw.dealRound(); engine.clearPhaseTimer();
  assert.equal(engine.roundNumber, round + 1);
}

// 'dummy' = ตัวละครสมมติไม่มีฮุค (ไม่มีการหลบแบบสุ่ม) — ใช้เป็นคู่ต่อสู้ได้โดยเทสต์ไม่แกว่ง
function setup({ mode = 'ffa', teams = null } = {}) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  engine.players.O = blank('O', 'oberon_summer', 1, teams && 'A');
  engine.players.M = blank('M', 'dummy', 2, teams && 'A');
  engine.players.T = blank('T', 'dummy', 3, teams && 'B');
  engine.setGameMode(mode);
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setGameState('PLAYING');
  for (const p of Object.values(engine.players)) {
    p.locked = false; p.skillPoints = 8; p.skillUsedRound = false;
    p.hp = 3; p.armor = 3; p.shield = 0; p.statuses = {}; p.statusAmt = {};
    ob.resetCombat(p);
  }
  // ยืนใกล้กันกลางกระดาน — ทุกคนอยู่ในระยะสกิล (ระยะบัฟของโอเบรอน = ระยะเดิน 4)
  const spots = [{ x: 7, y: 9 }, { x: 7, y: 8 }, { x: 8, y: 9 }, { x: 6, y: 9 }, { x: 7, y: 10 }];
  Object.values(engine.players).forEach((p, i) => { p.pos = { ...spots[i] }; });
  engine.setActor('O'); // ใช้สกิลได้เฉพาะตาเดินของตัวเอง (GRID_PLAN §7)
  return engine.players;
}
// ตีปกติ 1 ครั้ง (ท่อดาเมจล้วน ไม่มีกระดาน/ตีสวน)
function attack(byId, targetId) {
  engine.doAttack(byId, targetId);
  engine.clearPhaseTimer();
}

const saved = { triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash };
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = () => {};
  engine.skillFlash = () => {};
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.afterEach(() => { engine.clearPhaseTimer(); });

test('ข้อมูล: ระดับกลาง · ราคา 2/4/4 · ภาพสกิลจากโอเบรอนตัวเก่า', () => {
  const c = CHARACTERS.CHAR_BY_ID.oberon_summer;
  assert.equal(c.difficulty, 'medium');
  assert.deepEqual([c.basic.cost, c.secondary.cost, c.ultimate.cost], [2, 4, 4]);
  assert.match(c.basic.img, /\/characters\/oberon\/oberon_skill1/);
});

test('ม่านแห่งราตรี: ffa ทุกคน +1 พลังโจมตี 3 เทิร์น + ฟื้น 1 · กดซ้ำไม่ได้จนผลหมด', () => {
  const { O, M, T } = setup();
  engine.setActor('T'); // ตาของคนอื่น = ใช้สกิลไม่ได้
  engine.useSkill('O', 'basic');
  assert.equal(O.statuses.obsVeil, undefined);
  engine.setGameState('PLAYING'); // ช่วงจั่วไพ่ก็ใช้ไม่ได้แล้ว
  engine.useSkill('O', 'basic');
  assert.equal(O.statuses.obsVeil, undefined);
  engine.setActor('O');
  engine.useSkill('O', 'basic');
  assert.equal(engine.action.locked, true, 'ใช้สกิลแล้วเดินไม่ได้อีก');
  for (const p of [O, M, T]) {
    assert.equal(p.statuses.obsVeil, 3);
    assert.equal(p.hp, 4);
  }
  O.skillUsedRound = false;
  assert.equal(ob.canUseSkill(engine, O, 'basic'), false, 'ผลยังอยู่');
  engine.setRoundNumber(engine.roundNumber + 3);
  assert.equal(ob.canUseSkill(engine, O, 'basic'), true);
  T.armor = 0; T.hp = 7;
  O.statuses.obsVeil = 1;
  attack('O', 'T');
  assert.equal(T.hp, 5, 'พลังโจมตี 1 + ม่าน 1');
});

test('ม่านแห่งราตรี โหมดทีม: มอบเฉพาะตัวเองและเพื่อนร่วมทีม', () => {
  const { O, M, T } = setup({ mode: 'duo', teams: true });
  engine.useSkill('O', 'basic');
  assert.equal(O.statuses.obsVeil, 3);
  assert.equal(M.statuses.obsVeil, 3);
  assert.equal(T.statuses.obsVeil, undefined);
});

test('นกจาบยามเช้า: ฟื้น 5 · ต้านสถานะ 2 · ล้างดีบัฟล่าสุด · ไม่กินโควตาสกิล (กดท่าอื่นต่อได้ แต่กดซ้ำไม่ได้)', () => {
  const { O, T } = setup();
  engine.applyDebuff(T, 'weak', 1, 3);
  engine.applyDebuff(T, 'fragile', 1, 3);
  engine.useSkill('O', 'secondary', ['T']);
  assert.equal(T.hp, 7, 'ฟื้น 5 (เพดาน 7)');
  assert.equal(T.statuses.resist, 2);
  assert.equal(T.statuses.fragile, undefined, 'ล้างตัวที่โดนล่าสุด');
  assert.equal(T.statuses.weak, 3, 'ตัวที่โดนก่อนหน้ายังอยู่');
  assert.equal(O.skillUsedRound, false, 'ไม่กินโควตาสกิลของเทิร์น');
  const sp = O.skillPoints;
  engine.useSkill('O', 'secondary', ['T']);
  assert.equal(O.skillPoints, sp, 'กดซ้ำในเทิร์นเดียวไม่ได้');
  engine.useSkill('O', 'basic');
  assert.equal(O.statuses.obsVeil, 3, 'ยังกดท่าอื่นได้อีก 1 ครั้ง');
});

test('นกจาบยามเช้า: ต้นเทิร์นถัดไปเสียพลังชีวิต 2 ทะลุเกราะ · ต้านสถานะกันไม่ได้ · ตายได้', () => {
  const { O, T } = setup();
  engine.useSkill('O', 'secondary', ['T']);
  assert.equal(T.statuses.obsLark, ob.LARK_MARK_TURNS);
  T.hp = ob.LARK_DRAIN; T.armor = 3;
  nextRound();
  assert.equal(T.armor >= 3, true, 'เกราะไม่ถูกแตะ');
  assert.equal(T.alive, false, 'เลือด 2 -> ตาย แม้มีต้านสถานะ');
  assert.equal(O.alive, true);
});

test('จุดจบของความฝัน: +4 เฉพาะเทิร์นนี้ แล้วสตั้น 3 เทิร์น · ต้านสถานะกันได้ · คูลดาวน์ 5 · เลือกศัตรูได้แม้โหมดทีม', () => {
  const { O, T } = setup({ mode: 'duo', teams: true });
  const r0 = engine.roundNumber;
  engine.useSkill('O', 'ultimate', ['T']);
  assert.equal(T.statuses.obsDream, 1, 'เลือกศัตรูได้ในโหมดทีม');
  assert.equal(ob.atkBonus(T), 4);
  assert.equal(O.obsUltReady, r0 + 5);
  let stunnedTurns = 0;
  for (let i = 0; i < ob.DREAM_STUN_TURNS + 1; i++) {
    nextRound();
    if ((T.statuses.stun || 0) > 0) stunnedTurns++;
    if (i === 0) assert.equal(T.statuses.obsDream, undefined, '+4 หมดหลังจบเทิร์นที่กด');
  }
  assert.equal(stunnedTurns, ob.DREAM_STUN_TURNS, 'สตั้นครบ 3 เทิร์นถัดไป');

  // ต้านสถานะกันได้
  const { O: O2, M } = setup();
  engine.useSkill('O', 'ultimate', ['M']);
  M.statuses.resist = 5;
  ob.onEndTurn(engine);
  assert.equal(M.statuses.stun, undefined);
  assert.equal(ob.canUseSkill(engine, O2, 'ultimate', ['M']), false, 'ติดคูลดาวน์');
});

test('หน้าไหว้หลังหลอก: จบเทิร์นที่ไม่ถูกโจมตี ได้แต้มสกิล +1 และเหรียญ +1', () => {
  const { O, T } = setup();
  O.skillPoints = 3; O.gold = 0; O.wasAttacked = false;
  ob.onEndTurn(engine);
  assert.equal(O.skillPoints, 4);
  assert.equal(O.gold, 1);
  O.wasAttacked = true;
  ob.onEndTurn(engine);
  assert.equal(O.skillPoints, 4, 'ถูกโจมตีแล้วไม่ได้โบนัส');
  assert.equal(T.gold || 0, 0, 'เฉพาะโอเบรอน');
});

test('ค่าคงที่ตรงกับคำอธิบายสกิล · เสียงกดสกิลรายช่อง', () => {
  const c = CHARACTERS.CHAR_BY_ID.oberon_summer;
  assert.match(c.basic.desc, new RegExp(`โจมตี \\+${ob.VEIL_ATK} นาน ${ob.VEIL_TURNS} เทิร์น และฟื้นพลังชีวิต ${ob.VEIL_HEAL}`));
  assert.match(c.secondary.desc, new RegExp(`ฟื้นพลังชีวิต ${ob.LARK_HEAL} ได้ต้านสถานะผิดปกติ ${ob.LARK_RESIST_TURNS} เทิร์น`));
  assert.match(c.secondary.desc, new RegExp(`เสียพลังชีวิต ${ob.LARK_DRAIN} `));
  assert.match(c.ultimate.desc, new RegExp(`คูลดาวน์ ${ob.DREAM_COOLDOWN} เทิร์น`));
  assert.match(c.ultimate.desc, new RegExp(`โจมตี \\+${ob.DREAM_ATK} `));
  assert.match(c.ultimate.desc, new RegExp(`สตั้น ${ob.DREAM_STUN_TURNS} เทิร์น`));
  for (const tier of ['basic', 'secondary', 'ultimate']) assert.equal(ob.skillSound(null, tier), ob.SOUND[tier]);
  assert.equal(ob.skillSound(null, 'passive'), null);
});

test('skillLocks: ม่าน/ท่าไม้ตายนับคูลดาวน์ · นกจาบล็อกเฉพาะเทิร์นที่กด · ส่งถึง client', () => {
  const { O } = setup();
  const r0 = engine.roundNumber;
  assert.deepEqual(ob.skillLocks(engine, O), { basic: { cd: 0 }, secondary: { locked: false }, ultimate: { cd: 0 } });
  engine.useSkill('O', 'secondary', ['O']);
  engine.useSkill('O', 'basic');
  assert.deepEqual(ob.skillLocks(engine, O), { basic: { cd: ob.VEIL_TURNS }, secondary: { locked: true }, ultimate: { cd: 0 } });
  O.skillUsedRound = false; O.skillPoints = 8;
  engine.setActor('O');
  engine.useSkill('O', 'ultimate', ['O']);
  assert.equal(ob.skillLocks(engine, O).ultimate.cd, ob.DREAM_COOLDOWN);
  const sent = engine.buildStateFor('O').players.find((p) => p.id === 'O').skillLocks;
  assert.equal(sent.ultimate.cd, ob.DREAM_COOLDOWN);
  engine.setRoundNumber(r0 + 1);
  assert.deepEqual(ob.skillLocks(engine, O), { basic: { cd: ob.VEIL_TURNS - 1 }, secondary: { locked: false }, ultimate: { cd: ob.DREAM_COOLDOWN - 1 } });
});

test('ม่านแห่งราตรี: ไม่มีรายชื่อในรัศมี = ให้ตัวเองคนเดียว (ไม่แจกทั้งสนาม) · atkFx ไม่พังกับเป้าไม่มี statuses', () => {
  const { O, M, T } = setup();
  ob.applyInstantSkill(engine, O, 'basic', undefined);
  assert.equal(O.statuses.obsVeil, ob.VEIL_TURNS);
  assert.equal(M.statuses.obsVeil, undefined);
  assert.equal(T.statuses.obsVeil, undefined);
  assert.deepEqual(ob.atkFx({}), []);
  assert.equal(ob.applyInstantSkill(engine, O, 'secondary', ['nobody']), '');
  assert.equal(ob.applyInstantSkill(engine, O, 'ultimate', []), '');
});
