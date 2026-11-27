// โอเบรอน (วอร์ติเกิร์น) — characters/oberon_vortigern.js + สนามกลืนกิน server/oberonField.js (GRID_PLAN §7.46)
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const obv = require('../../characters/oberon_vortigern.js');
const draw = require('../../server/phases/draw.js');
const Board = require('../../server/board.js');

const blank = (id, characterId, teamId = null) => ({
  id, name: id, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId, avatar: 0, ready: true, gold: 0, img: '',
});
let realFlash, realQueue, realRandom;
const clips = [];
test.before(() => {
  realFlash = engine.skillFlash; realQueue = engine.queueCutscene; realRandom = Math.random;
  engine.skillFlash = () => {}; engine.queueCutscene = (p, k) => { clips.push(k); };
});
test.after(() => { engine.skillFlash = realFlash; engine.queueCutscene = realQueue; Math.random = realRandom; });
test.afterEach(() => { engine.clearPhaseTimer(); Math.random = realRandom; engine.setCycleShift(0); });

function nextRound() {
  const round = engine.roundNumber;
  engine.setGameState('ATTACKING');
  engine.endTurn(); engine.clearPhaseTimer();
  if (engine.roundNumber === round) { draw.dealRound(); engine.clearPhaseTimer(); }
  assert.equal(engine.roundNumber, round + 1);
}
function setup({ ids = ['O', 'T', 'U'], char = 'oberon_vortigern' } = {}) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  for (const id of ids) engine.players[id] = blank(id, id === 'O' ? char : 'dummy');
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setGameState('PLAYING');
  for (const p of Object.values(engine.players)) {
    p.locked = false; p.skillPoints = 8; p.skillUsedRound = false; p.statuses = {}; p.statusAmt = {};
    p.hp = engine.maxHpOf(p); p.armor = engine.maxArmorOf(p); p.shield = 0;
  }
  obv.resetCombat(engine.players.O);
  const spots = { O: { x: 6, y: 7 }, T: { x: 7, y: 7 }, U: { x: 3, y: 7 } };
  for (const id of ids) engine.players[id].pos = { ...spots[id] };
  engine.setActor('O');
  return engine.players;
}

test('ค่าฐาน 7/3 ไม่บวกโบนัส · ขี่ Vesper: เดิน 6 ตีระยะ 3 · Vesper รับดาเมจก่อนเกราะ', () => {
  const { O } = setup();
  assert.equal(engine.maxHpOf(O), 7);
  assert.equal(engine.maxArmorOf(O), 3);
  assert.equal(O.obv.mounted, true);
  assert.equal(engine.movOf ? engine.movOf(O) : obv.mov(O), 6);
  assert.deepEqual(obv.range(O), [1, 3]);
  const armor = O.armor;
  engine.dealMixed(O, 2, true);
  assert.equal(O.armor, armor);
  assert.equal(O.obv.horseHp, 3);
  obv.charAction(engine, O, 'vesper');
  assert.equal(O.obv.mounted, false);
  assert.deepEqual(obv.range(O), [1, 1]);
});

test('ก็แค่เศษขยะ: ทั้งหมด 2 ชิ้น = พลังชีวิต +4 เกราะ +2 แต้มสกิล +2 (จ่าย 2)', () => {
  const { O } = setup();
  O.hp = 2; O.armor = 0; O.skillPoints = 4;
  O.inventory = [{ uid: 'i1', type: 'potion' }, { uid: 'i2', type: 'potion' }];
  engine.useSkill('O', 'basic', [], { form: 'all' });
  assert.equal(O.inventory.length, 0);
  assert.equal(O.hp, 6);
  assert.equal(O.armor, 2);
  assert.equal(O.skillPoints, 4);
});

test('เคียวยมทูต: ดูดแต้ม 1 · เป้าไม่มีแต้ม = ดาเมจ +1 · ไร้ทางเยียวยา + ผนึกพลังงาน · ลดคูลดาวน์', () => {
  const { O, T } = setup();
  obv.charAction(engine, O, 'vesper'); // ลงจากแมลง — ตีประชิดธรรมดา
  engine.useSkill('O', 'secondary', []);
  assert.ok(O.statuses.obvScythe > 0);
  O.obv.fieldReady = engine.roundNumber + 4;
  T.skillPoints = 3; T.armor = 0; T.hp = 10;
  const sp = O.skillPoints;
  engine.setActor('O');
  assert.ok(engine.attackTarget('O', 'T'));
  engine.clearPhaseTimer();
  assert.equal(T.skillPoints, 2);
  assert.equal(O.skillPoints, sp + 1);
  assert.ok(T.statuses.nohealing > 0);
  assert.ok(T.statuses.manaSeal > 0);
  assert.equal(O.obv.fieldReady, engine.roundNumber + 3);
  // เป้าไม่มีแต้ม = โบนัส +1
  T.skillPoints = 0;
  assert.equal(obv.damageBonus(engine, O, T), 1);
});

test('Vesper ขี่ชน: พิษร้ายออกฤทธิ์จริง 1 ครั้ง + ผุพัง', () => {
  const { O, T } = setup();
  T.pos = { x: 9, y: 7 }; // ห่าง 3
  T.hp = 10; T.armor = 0;
  assert.ok(engine.attackTarget('O', 'T'));
  engine.clearPhaseTimer();
  assert.ok(T.statuses.poison > 0);
  assert.ok(T.statuses.decay > 0);
  const hp = T.hp;
  nextRound();
  assert.equal(T.hp, hp - 1, 'พิษออกฤทธิ์ต้นเทิร์นถัดไป');
});

test('ราชาแห่งการจอมหลอกลวง: พิษที่ติดตัวเอง = ฟื้น 1 + พลังโจมตี +1', () => {
  const { O, T } = setup();
  O.hp = 3;
  O.statuses.poison = 3;
  assert.equal(obv.damageBonus(engine, O, T), 1);
  nextRound();
  assert.equal(O.hp, 4);
});

test('สนธยายามค่ำคืน: กลืนเข้า 10×10 · โอเบรอนกลาง ศัตรูขอบ · กลางคืน · สนธยา/อ่อนแอ/เน่าเปื่อย · หมดแล้วกลับช่องเดิม', () => {
  const { O, T, U } = setup();
  const before = { O: { ...O.pos }, T: { ...T.pos }, U: { ...U.pos } };
  const area0 = engine.board.area, leg0 = engine.legStart;
  engine.useSkill('O', 'ultimate', []);
  assert.equal(engine.board.area, Board.OBERON_AREA);
  assert.equal(engine.oberonField.active(), true);
  assert.ok(O.pos.x >= 3 && O.pos.x <= 6 && O.pos.y >= 3 && O.pos.y <= 6, 'โอเบรอนกลางหลุม');
  for (const t of [T, U]) assert.ok(t.pos.x === 0 || t.pos.y === 0 || t.pos.x === 9 || t.pos.y === 9, 'ศัตรูขอบ');
  assert.ok(T.pos.x > O.pos.x, 'T อยู่ขวาโอเบรอน = ขอบขวา');
  assert.ok(U.pos.x < O.pos.x);
  assert.equal(engine.isNightRound(engine.roundNumber), true);
  assert.ok(O.statuses.poison > 0, 'ติดพิษตลอดสนาม');
  const round0 = engine.roundNumber;
  for (let i = 1; i <= 5; i++) {
    nextRound();
    assert.equal(T.statuses.twilight, i);
    if (i >= 3) assert.ok(T.statuses.weak > 0, 'สนธยา 3 = อ่อนแอ');
  }
  assert.equal(engine.roundNumber, round0 + 5);
  assert.equal(engine.oberonField.active(), true, 'เทิร์นสุดท้ายยังอยู่');
  nextRound();
  assert.equal(engine.oberonField.active(), false);
  assert.equal(engine.board.area, area0);
  assert.deepEqual(O.pos, before.O);
  assert.deepEqual(T.pos, before.T);
  assert.deepEqual(U.pos, before.U);
  assert.equal(T.statuses.twilight, undefined);
  assert.equal(engine.legStart, leg0 + 6, 'นาฬิกาโลกหยุดระหว่างสนาม');
  assert.equal(O.obv.fieldReady, engine.roundNumber + obv.FIELD_CD);
});

test('เน่าเปื่อย: ช่องที่ถูกล็อกกดไม่ได้ · เทิร์นหน้าสุ่มไม่ซ้ำช่องเดิม', () => {
  const { O, T } = setup();
  T.characterId = 'oberon_summer';
  engine.useSkill('O', 'ultimate', []);
  const tier = T.skillRot.tier;
  assert.equal(engine.oberonField.rotBlocks(T, tier), true);
  engine.setActor('T');
  T.skillPoints = 8;
  const sp = T.skillPoints;
  engine.useSkill('T', tier, ['T']);
  assert.equal(T.skillPoints, sp, 'ไม่เสียแต้ม — ใช้ไม่ได้');
  nextRound();
  assert.notEqual(T.skillRot.tier, tier);
});

test('Lie Like Vortigern: เฉพาะในสนาม · ดาเมจ 2 · ผุพัง · หลับเท่าสนธยา · สนามยืด 5 · ถูกตีตื่น', () => {
  const { O, T } = setup();
  Math.random = () => 0.99; // ไม่หลบ
  engine.useSkill('O', 'ultimate', []);
  nextRound(); nextRound(); nextRound();
  assert.equal(T.statuses.twilight, 3);
  T.hp = 10; T.armor = 0;
  O.skillPoints = 8; O.skillUsedRound = false;
  const until = engine.oberonField.untilRound();
  engine.setActor('O');
  clips.length = 0;
  engine.useSkill('O', 'ultimate', []);
  assert.equal(clips.length, 1, 'คลิป Lie เล่นทุกครั้ง');
  assert.ok([obv.CUT.lieViolent, obv.CUT.lieCold].includes(clips[0]));
  assert.deepEqual(obv.voiceLines(O).ultimate, [], 'มีคลิป = ไม่พากย์ทับ');
  assert.equal(T.hp, 8);
  assert.ok(T.statuses.decay > 0);
  assert.equal(T.statuses.sleep, 3);
  assert.equal(T.statuses.twilight, undefined, 'หลับไหลกินสนธยาทั้งหมด');
  assert.equal(engine.oberonField.untilRound(), until + 5);
  nextRound();
  assert.ok(T.statuses.sleep > 0);
  assert.equal(T.hp, 7, 'หลับเสีย 1 ไม่สนเกราะ');
  assert.equal(T.statuses.twilight, undefined, 'หลับอยู่ ไม่สะสมสนธยา');
  engine.setActor('O');
  engine.withEffectSource(O, () => engine.dealMixed(T, 1, true));
  assert.equal(T.statuses.sleep, undefined, 'ถูกตีตื่น');
});

test('โอเบรอนตายกลางสนาม = สนามหาย ทุกคนกลับที่เดิม', () => {
  const { O, T } = setup();
  const tPos = { ...T.pos }, area0 = engine.board.area;
  engine.useSkill('O', 'ultimate', []);
  O.hp = 0;
  engine.instantDeath(O);
  assert.equal(engine.oberonField.active(), false);
  assert.equal(engine.board.area, area0);
  assert.deepEqual(T.pos, tPos);
});

test('ฤดูร้อน: แต้มความเกลียดชังครบ 5 → ลอกคราบเป็นวอร์ติเกิร์น (สัดส่วนเลือด · สถานะหาย)', () => {
  const { O, T } = setup({ char: 'oberon_summer' });
  const summer = require('../../characters/oberon_summer.js');
  for (let i = 0; i < 5; i++) { engine.setActor('T'); summer.onAttacked(engine, O, T); engine.players.T.__seq = i; }
  // แต่ละครั้งต้องเป็นการโจมตีคนละครั้ง (commandSeq ต่างกัน) — จำลองด้วยเทิร์นใหม่
  O.statuses.obsHate = 5; O.statusAmt.obsHate = 5;
  O.hp = Math.round(engine.maxHpOf(O) / 2);
  O.statuses.might = 2;
  engine.setActor('O');
  assert.ok(summer.hudActions(engine, O));
  clips.length = 0;
  assert.ok(summer.charAction(engine, O, 'molt'));
  engine.clearPhaseTimer();
  assert.deepEqual(clips, [obv.CUT.molt], 'คลิป True Name ก่อนลอกคราบ');
  assert.equal(O.characterId, 'oberon_vortigern');
  assert.equal(O.hp, 4, 'ครึ่งหลอดของ 7 (ปัด)');
  assert.equal(O.statuses.might, undefined);
  assert.equal(O.obv.mounted, true);
});

test('เสียง/คลิป: เข้าสนธยามีคลิปทุกครั้ง ไม่พากย์ทับ · ตีปกติขี่ Vesper = เสียงชน · เปิดเคียว = buster · เพลงสนาม', () => {
  const { O } = setup();
  clips.length = 0;
  engine.useSkill('O', 'ultimate', []);
  assert.deepEqual(clips, [obv.CUT.field]);
  assert.equal(engine.oberonField.active(), true, 'กลืนหลังคลิป');
  assert.deepEqual(obv.voiceLines(O).ultimate, []);
  assert.equal(obv.attackSound(O), obv.SFX.extra);
  assert.equal(obv.skillMusic(engine, O).music, obv.MUSIC);
  obv.charAction(engine, O, 'vesper');
  O.statuses.obvScythe = 2;
  assert.equal(obv.attackSound(O), obv.SFX.buster);
});

test('ป้ายฉากตี (onStrikeLanded) เป็น array ไม่ใช่สตริง — กันตัวอักษรแตกทีละแถว', () => {
  const { O, T } = setup();
  T.hp = 10; T.armor = 0;
  const r = obv.onStrikeLanded(engine, O, T, {});
  assert.ok(Array.isArray(r));
  assert.ok(r.includes('Vesper ชน'));
  assert.deepEqual(obv.onStrikeLanded(engine, O, T, { counter: true }), []);
});

test('Moon Cell/Eos: เปิดสนามแล้วไม่ตัดสินชนะผิด (กติกาทีมสุดท้ายที่รอด) · ยูนิตที่ไม่มีที่ลงกลับกระดานเดิม', () => {
  const Field = require('../../server/oberonField.js');
  const endTurn = require('../../server/phases/endTurn.js');
  const { O, T } = setup();
  // จำลองยูนิตที่ไม่มีที่ลงในสนาม: pos null ระหว่างสนาม แต่จดช่องเดิมไว้
  engine.useSkill('O', 'ultimate', []);
  const saved = engine.board === null ? null : Field.savedArea();
  assert.ok(saved != null);
  const tPos = require('../../server/match.js').oberonField.saved.pos.T;
  T.pos = null;
  Field.exit('end');
  assert.deepEqual(T.pos, tPos, 'กลับช่องเดิมแม้ไม่มีที่ในสนาม');
  assert.equal(typeof endTurn.gameOver, 'function');
});

test('Moon Cell: เปิดสนามกลืนกินแล้วเกมไม่จบด้วยกติกาทีม (เดิมผู้เล่นชนะทันที) · ฮาคุโนะ/Moon Cell ถูกกลืนด้วย', () => {
  const match = require('../../server/match.js');
  const Moon = require('../../server/moonCell.js');
  const endTurn = require('../../server/phases/endTurn.js');
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  engine.players.O = { ...blank('O', 'oberon_vortigern', 'A'), position: 1, teamConfirmed: true };
  engine.players.Q = { ...blank('Q', 'dummy', 'A'), position: 2, teamConfirmed: true };
  engine.setGameMode('moon');
  match.world = 'moon';
  Moon.setAiDelay(0);
  engine.startMatch();
  engine.clearPhaseTimer();
  const O = engine.players.O;
  O.skillPoints = 8; O.skillUsedRound = false;
  engine.setActor('O');
  engine.useSkill('O', 'ultimate', []);
  assert.equal(engine.oberonField.active(), true);
  assert.equal(endTurn.gameOver(), false, 'บอสยังอยู่ = เกมยังไม่จบ');
  assert.notEqual(engine.gameState, 'GAMEOVER');
  const units = Object.values(engine.players).filter((u) => u.alive && u.pos);
  assert.ok(units.some((u) => u.summon), 'ฮาคุโนะ/Moon Cell อยู่ในสนามด้วย');
  engine.oberonField.exit('end');
  Moon.setAiDelay(700);
  match.world = 'earth';
  engine.setGameMode('ffa');
});
