// Ophy นักเล่นแร่แปรธาตุ (ophy) — กระเป๋าวิเศษ / ปรุงยา / ปืนยิงยา / Lock in / calculated (GRID_PLAN §7.43)
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const ophy = require('../../characters/ophy.js');
const match = require('../../server/match.js');
const combat = require('../../server/combat.js');
const { CHAR_BY_ID } = require('../../characters.js');

const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
function setup(list, mode = 'ffa') {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, ch, , , team], i) => { engine.players[id] = blank(id, ch, i + 1, team || null); });
  engine.setGameMode(mode);
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setJourneyArea(1);
  engine.setCycleShift(0);
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.skillPoints = 8; p.skillUsedRound = false; p.shield = 0;
    p.statuses = {}; p.statusAmt = {};
  }
  match.skillBeats = []; match.afterCutscene = []; match.cutsceneQueue.length = 0;
  return engine.players;
}
const runBeats = (p) => { for (let i = 0; i < 6 && match.skillBeats.length; i++) for (const b of match.skillBeats.splice(0)) combat.withEffectSource(p, b.fn); };
const view = (viewerId, id) => engine.buildStateFor(viewerId).players.find((p) => p.id === id);
const hook = () => require('../../characters/index').ophy;
const act = (id, key, tile) => combat.withEffectSource(engine.players[id], () => hook().charAction(engine, engine.players[id], key, { tile }));
const mats = (p, list) => { p.ophy.mats = Array(6).fill(null); list.forEach(([k, n], i) => { p.ophy.mats[i] = { k, n }; }); };

const saved = { triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash, sfx: engine.sfx, pause: engine.pausePlayingForCutscene };
let rnd;
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = () => {};
  engine.skillFlash = () => {};
  engine.sfx = () => {};
  engine.pausePlayingForCutscene = () => {};
});
test.after(() => {
  Object.assign(engine, { triggerCutscene: saved.triggerCutscene, queueCutscene: saved.queueCutscene, skillFlash: saved.skillFlash, sfx: saved.sfx, pausePlayingForCutscene: saved.pause });
  for (const id of Object.keys(engine.players)) delete engine.players[id];
});
test.beforeEach(() => { rnd = Math.random; });
test.afterEach(() => { Math.random = rnd; engine.setGameMode('ffa'); engine.setCycleShift(0); engine.clearPhaseTimer(); match.skillBeats = []; });

test('ข้อมูล: ยาก · 13/2 · พลังงาน 0/8 · ปรุงยา 0 / Lock in 2 / calculated 0', () => {
  const ch = CHAR_BY_ID.ophy;
  assert.equal(ch.difficulty, 'hard');
  assert.deepEqual([ch.basic.cost, ch.secondary.cost, ch.ultimate.cost], [0, 2, 0]);
  const { O } = setup([['O', 'ophy', 4, 7], ['A', 'dummy', 9, 7]]);
  assert.equal(engine.maxHpOf(O), 13);
  assert.equal(engine.maxArmorOf(O), 2);
  assert.equal(engine.maxSkillOf(O), 8);
  assert.equal(ophy.potionCount(O.ophy, 'base'), 5);
});

test('ปรุงยาถูกสูตร (สลับตำแหน่งได้) → ยาเข้ากักตุน · ไม่กินโควตา · ไม่ล็อกการเดิน', () => {
  const { O } = setup([['O', 'ophy', 4, 7], ['A', 'dummy', 9, 7]]);
  engine.setActor('O');
  mats(O, [['water', 3], ['herb', 4]]);
  Math.random = () => 0.99; // ไม่ฟรี
  engine.useSkill('O', 'basic', [], { form: 'brew:m1,m0,m1' });
  assert.equal(ophy.potionCount(O.ophy, 'base'), 6);
  assert.equal(O.ophy.mats[1].n, 2);
  assert.equal(O.ophy.mats[0].n, 2);
  assert.equal(O.skillUsedRound, false);
  assert.equal(engine.action.locked, false);
  engine.useSkill('O', 'basic', [], { form: 'brew:m1,m1,m0' });
  assert.equal(ophy.potionCount(O.ophy, 'base'), 7);
});

test('ปรุงสำเร็จติดกัน 3 ขวด = ฟื้นพลัง 2 ขั้น', () => {
  const { O } = setup([['O', 'ophy', 4, 7], ['A', 'dummy', 9, 7]]);
  engine.setActor('O');
  mats(O, [['water', 9], ['herb', 15]]);
  Math.random = () => 0.99;
  for (let i = 0; i < 3; i++) engine.useSkill('O', 'basic', [], { form: 'brew:m1,m1,m0' });
  assert.equal(O.statuses.spRegen, 2);
});

test('ปรุงผิดสูตร: เสีย 2 ใน 3 · ระเบิดโดนตัวเอง+ศัตรูรอบตัว 1 · ผลัก 2 · จบตา', () => {
  const { O, A } = setup([['O', 'ophy', 4, 7], ['A', 'dummy', 5, 7]]);
  engine.setActor('O');
  mats(O, [['water', 1], ['orb', 1], ['spirit', 1]]);
  Math.random = () => 0.9; // ไม่หลบ
  const hpO = O.hp + O.armor, hpA = A.hp + A.armor;
  engine.useSkill('O', 'basic', [], { form: 'brew:m0,m1,m2' });
  assert.equal(O.ophy.mats.filter(Boolean).length, 1);
  assert.equal(O.hp + O.armor, hpO - 1);
  assert.equal(A.hp + A.armor, hpA - 1);
  assert.equal(A.pos.x, 7);
  assert.equal(O.ophy.streak, 0);
});

test('ยิงยา: ระยะ 3 วง 3×3 · ไม่มีดาเมจ · ตั้งต้น = คราบน้ำ + ภูมิต่ำ · ตาละครั้ง · เดินต่อไม่ได้', () => {
  const { O, A } = setup([['O', 'ophy', 4, 7], ['A', 'dummy', 7, 8]]);
  engine.setActor('O');
  Math.random = () => 0.99; // ไม่หลบ
  const hp = A.hp + A.armor;
  assert.equal(act('O', 'ophy:throw', { x: 8, y: 7 }), false); // ระยะ 4
  assert.equal(act('O', 'ophy:throw', { x: 7, y: 7 }), true);
  runBeats(O);
  assert.equal(A.hp + A.armor, hp);
  assert.ok(A.statuses.elWater > 0);
  assert.ok(A.statuses.immLow > 0);
  assert.equal(engine.action.locked, true);
  assert.equal(ophy.potionCount(O.ophy, 'base'), 4);
  assert.equal(act('O', 'ophy:throw', { x: 7, y: 7 }), false);
});

test('ภูมิต่ำ: คราบธาตุครั้งต่อไปนานขึ้น 2 เทิร์น', () => {
  const { A } = setup([['O', 'ophy', 4, 7], ['A', 'dummy', 7, 8]]);
  const E = require('../../server/element.js');
  A.statuses.immLow = 2;
  E.apply(A, 'fire', null);
  assert.equal(A.statuses.elFire, E.AURA_TURNS + 2);
});

test('ยิงโดนตัวเองถ้าอยู่ในวง · ลำดับเรียกใช้วนและข้ามช่องว่าง', () => {
  const { O } = setup([['O', 'ophy', 4, 7], ['A', 'dummy', 12, 7]]);
  engine.setActor('O');
  O.ophy.call[0] = { k: 'heal', n: 1 }; O.ophy.call[2] = { k: 'invis', n: 2 };
  assert.deepEqual(ophy.queueOf(O.ophy), ['heal', 'invis', 'invis', 'base']);
  O.hp = 5;
  act('O', 'ophy:throw', { x: 5, y: 7 });
  runBeats(O);
  assert.equal(O.hp, 6);
  assert.ok(O.statuses.mend > 0);
  assert.deepEqual(ophy.queueOf(O.ophy), ['invis', 'invis', 'base', 'base']);
});

test('ปฏิกิริยาโดย Ophy: วัตถุดิบตก 2–4 · เดินพิเศษ 3 ช่อง · เดินเก็บได้พลังงาน +2 (ย้อนได้)', () => {
  const { O, A } = setup([['O', 'ophy', 4, 7], ['A', 'dummy', 7, 7]]);
  engine.setActor('O');
  O.ophy.call[0] = { k: 'flame', n: 1 };
  A.statuses.elWater = 2;
  Math.random = () => 0.5;
  act('O', 'ophy:throw', { x: 7, y: 7 });
  runBeats(O);
  assert.ok(O.ophy.drops.length >= 2 && O.ophy.drops.length <= 4, `drops ${O.ophy.drops.length}`);
  assert.equal(engine.action.locked, false);
  assert.equal(engine.movOf(O), 3);
  const d = O.ophy.drops[0];
  O.skillPoints = 0;
  O.ophy.drops = [{ ...d, x: 5, y: 7 }];
  engine.moveTo('O', 5, 7);
  assert.equal(O.skillPoints, 2);
  assert.equal(O.ophy.drops.length, 0);
  engine.undoMove('O');
  assert.equal(O.skillPoints, 0);
  assert.equal(O.ophy.drops.length, 1);
});

test('ปรับสมดุล 2026-11-24: วัตถุดิบตกไม่ทับช่องที่มียูนิต', () => {
  const { O, A } = setup([['O', 'ophy', 4, 7], ['A', 'dummy', 7, 7]]);
  engine.setActor('O');
  O.ophy.call[0] = { k: 'flame', n: 1 };
  A.statuses.elWater = 2;
  Math.random = () => 0.5; // เดิมสุ่มได้ช่องกลาง = ช่องที่ A ยืน
  act('O', 'ophy:throw', { x: 7, y: 7 });
  runBeats(O);
  assert.ok(O.ophy.drops.length >= 2);
  assert.ok(O.ophy.drops.every((d) => !(d.x === 7 && d.y === 7)), JSON.stringify(O.ophy.drops));
});

test('ปรับสมดุล 2026-11-24: ดื่มยาขยายปฏิกิริยา 5×5 ได้เทิร์นละ 1 ครั้ง', () => {
  const { O } = setup([['O', 'ophy', 4, 7], ['A', 'dummy', 12, 7]]);
  engine.setActor('O');
  O.ophy.store[1] = { k: 'flame', n: 2 };
  O.hp = 13; O.armor = 2;
  const E = require('../../server/element.js');
  const ring = E.withRing;
  let wide = 0;
  E.withRing = (...a) => { wide++; return ring(...a); };
  try {
    O.statuses.elWater = 2;
    act('O', 'ophy:drink:s1');
    O.statuses = { elWater: 2 }; O.hp = 13;
    act('O', 'ophy:drink:s1');
  } finally { E.withRing = ring; }
  assert.equal(wide, 1);
});

test('ปรับสมดุล 2026-11-24: ช่องพลังงาน 3 จุด ระยะ 5 อยู่ 2 เทิร์น · เก็บได้ 1–2 · ไพ่แดง 2 ใบ = ลูกแก้ว 1', () => {
  const { O } = setup([['O', 'ophy', 8, 8], ['A', 'dummy', 20, 8]]);
  const r0 = engine.roundNumber;
  O.ophy.nodes = [];
  hook().onRoundStartTick(engine, O);
  assert.equal(O.ophy.nodes.length, 3);
  const Board = require('../../server/board.js');
  for (const n of O.ophy.nodes) assert.ok(Board.dist({ x: 8, y: 8, size: 1 }, { x: n.x, y: n.y, size: 1 }) <= 5);
  match.roundNumber = r0 + 1;
  hook().onRoundStartTick(engine, O);
  assert.equal(O.ophy.nodes.length, 6); // ชุดก่อนยังอยู่ (2 เทิร์น)
  match.roundNumber = r0 + 2;
  hook().onRoundStartTick(engine, O);
  assert.equal(O.ophy.nodes.length, 6); // ชุดแรกหมดอายุ
  match.roundNumber = r0;
  // เดินผ่าน = ลูกแก้ว 1–2
  O.ophy.nodes = [{ x: 9, y: 8, until: r0 + 5 }];
  mats(O, []);
  Math.random = () => 0.99;
  hook().afterWalk(engine, O, [{ x: 8, y: 8 }, { x: 9, y: 8 }]);
  assert.equal(O.ophy.mats[0].k, 'orb');
  assert.equal(O.ophy.mats[0].n, 2);
  // ไพ่แดง 2 ใบ = ลูกแก้ว 1 (ไพ่ฟ้า 2 ใบ ก็ 1)
  mats(O, []);
  O.cards = [{ color: 'red' }, { color: 'red' }, { color: 'blue' }, { color: 'blue' }];
  hook().onOrderBegin(engine);
  assert.deepEqual(O.ophy.mats[0], { k: 'orb', n: 2 });
});

test('ติดตัว: ดาเมจปฏิกิริยาที่ Ophy ได้รับ −1', () => {
  const { O } = setup([['O', 'ophy', 4, 7], ['B', 'dummy', 12, 7]]);
  O.statuses.elWater = 2; O.armor = 0; O.hp = 13;
  const E = require('../../server/element.js');
  engine.withEffectSource(null, () => E.apply(O, 'fire', null));
  assert.equal(O.hp, 11); // ระเหย +3 −1
});

test('ติดตัว: ลบสกิลติดตัว = ไม่ลดดาเมจปฏิกิริยา', () => {
  const { O } = setup([['O', 'ophy', 4, 7], ['B', 'dummy', 12, 7]]);
  O.statuses.elWater = 2; O.statuses.noPassive = 2; O.armor = 0; O.hp = 13;
  const E = require('../../server/element.js');
  engine.withEffectSource(null, () => E.apply(O, 'fire', null));
  assert.equal(O.hp, 10);
});

test('ดื่มยาเอง: ไม่ล็อกการเดิน · นก (เดิน 6 · บิน · ไม่มีสกิล) · วาร์ปเลือกช่องในระยะ 4', () => {
  const { O } = setup([['O', 'ophy', 4, 7], ['A', 'dummy', 12, 7]]);
  engine.setActor('O');
  O.ophy.store[1] = { k: 'morph', n: 1 }; O.ophy.store[2] = { k: 'warp', n: 1 };
  assert.equal(act('O', 'ophy:drink:s2', { x: 9, y: 7 }), false);
  assert.equal(act('O', 'ophy:drink:s2', { x: 6, y: 8 }), true);
  assert.deepEqual(O.pos, { x: 6, y: 8 });
  assert.equal(act('O', 'ophy:drink:s1'), true);
  assert.ok(O.statuses.bird > 0);
  assert.equal(engine.baseMovOf(O), 6);
  assert.equal(engine.action.locked, false);
  assert.equal(view('O', 'O').stageNoSkill, true);
});

test('ยาแปลงร่างที่ยิงใส่ศัตรู = ไก่ (เดิน 3 · ตีประชิด · ไม่มีสกิล)', () => {
  const { O, A } = setup([['O', 'ophy', 4, 7], ['A', 'dummy', 6, 7]]);
  engine.setActor('O');
  O.ophy.call[0] = { k: 'morph', n: 1 };
  Math.random = () => 0.99;
  act('O', 'ophy:throw', { x: 6, y: 7 });
  runBeats(O);
  assert.ok(A.statuses.chicken > 0);
  assert.equal(engine.baseMovOf(A), 3);
  assert.deepEqual(engine.rangeOf(A), [1, 1]);
  assert.equal(view('O', 'A').morph, 'chicken');
});

test('Lock in: ถูกโจมตี = โยนยาสวนกลับ · ครบเทิร์นไม่เสียหาย = ได้ยา 1 ขวด', () => {
  const { O, A } = setup([['O', 'ophy', 4, 7], ['A', 'dummy', 8, 7]]);
  engine.setActor('O');
  engine.useSkill('O', 'secondary', []);
  assert.ok(O.ophy.lockIn);
  Math.random = () => 0.99;
  combat.notifyAttacked(O, A, 'skill');
  ophy.flushCounters(engine, O);
  assert.ok(A.statuses.elWater > 0);
  assert.equal(ophy.potionCount(O.ophy, 'base'), 4);
  const total = ophy.potionTotal(O.ophy);
  engine.setRoundNumber(engine.roundNumber + 1);
  hook().onActorStart(engine, O);
  assert.equal(O.ophy.lockIn, null);
  assert.equal(ophy.potionTotal(O.ophy), total + 1);
});

test('Lock in: เสียหายระหว่างนั้น = ไม่ได้รางวัล', () => {
  const { O } = setup([['O', 'ophy', 4, 7], ['A', 'dummy', 8, 7]]);
  engine.setActor('O');
  engine.useSkill('O', 'secondary', []);
  engine.dealMixed(O, 1);
  const total = ophy.potionTotal(O.ophy);
  engine.setRoundNumber(engine.roundNumber + 1);
  hook().onActorStart(engine, O);
  assert.equal(ophy.potionTotal(O.ophy), total);
});

test('calculated: ยิงต่อเนื่อง ครั้งแรกฟรี ต่อไป 2 · ยิงไปแล้วใช้ท่าไม้ตายไม่ได้', () => {
  const { O } = setup([['O', 'ophy', 4, 7], ['A', 'dummy', 12, 7]]);
  engine.setActor('O');
  O.skillPoints = 4;
  engine.useSkill('O', 'ultimate', []);
  assert.ok(O.ophy.calc);
  for (let i = 0; i < 3; i++) { assert.equal(act('O', 'ophy:throw', { x: 6, y: 7 }), true); runBeats(O); }
  assert.equal(O.skillPoints, 0);
  assert.equal(act('O', 'ophy:throw', { x: 6, y: 7 }), false);
  const { O: O2 } = setup([['O', 'ophy', 4, 7], ['A', 'dummy', 12, 7]]);
  engine.setActor('O');
  act('O', 'ophy:throw', { x: 6, y: 7 }); runBeats(O2);
  engine.useSkill('O', 'ultimate', []);
  assert.equal(O2.ophy.calc, null);
});

test('เรียงกระเป๋า: ของชุดเดิมเท่านั้น · คูลดาวน์ 1 เทิร์น', () => {
  const { O } = setup([['O', 'ophy', 4, 7], ['A', 'dummy', 12, 7]]);
  engine.setActor('O');
  assert.equal(act('O', 'ophy:sort:c:base.5|||||/s:|||||/m:|||||'), true);
  assert.equal(O.ophy.call[0].k, 'base');
  assert.equal(act('O', 'ophy:sort:c:|||||/s:base.5|||||/m:|||||'), false); // คูลดาวน์
  engine.setRoundNumber(engine.roundNumber + 2);
  assert.equal(act('O', 'ophy:sort:c:|||||/s:base.6|||||/m:|||||'), false); // ของไม่ตรง
  assert.equal(act('O', 'ophy:sort:c:|||||/s:base.3|base.2||||/m:|||||'), true);
});

test('ให้ยาเพื่อนที่ยืนติดกัน (duo) → ไอเทมในกระเป๋าเพื่อน · เพื่อนดื่มได้', () => {
  const { O, B } = setup([['O', 'ophy', 4, 7, 't1'], ['B', 'dummy', 5, 7, 't1'], ['C', 'dummy', 12, 7, 't2']], 'duo');
  engine.setActor('O');
  O.ophy.store[1] = { k: 'heal', n: 1 };
  assert.equal(act('O', 'ophy:give:s1:B'), true);
  const it = B.inventory.find((x) => x.type === 'ophyPotion');
  assert.ok(it);
  B.hp = 3;
  engine.setActor('B');
  engine.useInventoryItem('B', it.uid);
  assert.equal(B.hp, 4);
  assert.ok(!B.inventory.includes(it));
});

test('state: คนอื่นเห็นลำดับยา 4 ขวด ไม่เห็นกระเป๋า', () => {
  setup([['O', 'ophy', 4, 7], ['A', 'dummy', 12, 7]]);
  const other = view('A', 'O');
  assert.deepEqual(other.ophy.queue, ['base', 'base', 'base', 'base']);
  assert.equal(other.ophy.call, undefined);
  assert.ok(Array.isArray(view('O', 'O').ophy.store));
});
