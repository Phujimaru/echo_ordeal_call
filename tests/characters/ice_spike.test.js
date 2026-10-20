// Ice Spike (ice_spike) — ธารน้ำแข็ง / ไถลชน / หนามน้ำแข็ง / คุกน้ำแข็ง / เชื่องช้า (GRID_PLAN §7.9 · server/ice.js)
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const ice = require('../../characters/ice_spike.js');
const Ice = require('../../server/ice.js');
const { CHAR_BY_ID } = require('../../characters.js');

const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
// list = [[id, characterId, x, y, teamId?], ...] — แถว y = 5 ของภูมิภาค I เป็นพื้นโล่งทั้งแถว
function setup(list, mode = 'ffa') {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, ch, , , team], i) => { engine.players[id] = blank(id, ch, i + 1, team || null); });
  engine.setGameMode(mode);
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setJourneyArea(1);
  engine.setCycleShift(0);
  engine.setShopPos(null);
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.skillPoints = 8; p.skillUsedRound = false; p.shield = 0;
    p.statuses = {}; p.statusAmt = {};
  }
  return engine.players;
}
const vit = (p) => (p.hp || 0) + (p.armor || 0);
const lay = (tiles) => tiles.forEach(([x, y]) => Ice.layIce(x, y, null));
const terrainAt = (x, y) => engine.boardMap().terrain[`${x},${y}`];
const fxEvents = () => calls.fx.filter((f) => f.event === 'iceFx').flatMap((f) => f.payload.events);
const nextTick = () => new Promise((r) => setImmediate(r));

const saved = {
  triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash,
  notifyTransform: engine.notifyTransform, sfx: engine.sfx, boardFx: engine.boardFx,
};
const calls = { fx: [] };
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = () => {};
  engine.skillFlash = () => {};
  engine.notifyTransform = () => {};
  engine.sfx = () => {};
  engine.boardFx = (event, payload) => calls.fx.push({ event, payload });
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.beforeEach(() => { calls.fx = []; });
test.afterEach(() => { engine.setGameMode('ffa'); engine.setCycleShift(0); engine.clearPhaseTimer(); });

test('ข้อมูล: ระดับยาก · เลือด 8 เกราะ 2 · เดิน 4 · ตีปกติไม่ได้ · สกิลเลือกช่อง ระยะ 8 · ราคา 1/2/4 · ท่าไม้ตายใช้กับตัวเอง', () => {
  const ch = CHAR_BY_ID.ice_spike;
  assert.equal(ch.difficulty, 'hard');
  assert.equal(ch.mov, 4);
  assert.deepEqual(ch.range, [1, 0]);
  assert.deepEqual([ch.basic.cost, ch.secondary.cost, ch.ultimate.cost], [1, 2, 4]);
  assert.deepEqual(ch.basic.area, { kind: 'tile', range: 8, place: 'ice' });
  assert.equal(ch.secondary.area.place, 'spike');
  assert.equal(ch.secondary.area.range, 8);
  assert.deepEqual(ch.ultimate.area, { kind: 'self' });
  const P = setup([['I', 'ice_spike', 3, 5], ['B', 'dummy', 4, 5]]);
  assert.equal(P.I.hp, 8);
  assert.equal(P.I.armor, 2);
  engine.setActor('I');
  assert.equal(engine.attackTarget('I', 'B'), false, 'ยืนติดก็ตีปกติไม่ได้');
  const st = engine.buildStateFor('I');
  assert.equal(st.players.find((p) => p.id === 'I').iceHurt, 0);
  assert.equal(st.players.find((p) => p.id === 'B').iceHurt, undefined);
});

test('ติดตัว 1: เดินผ่านช่องไหน (รวมช่องออกตัว) เป็นธารน้ำแข็ง 6 เทิร์น · กดย้อนการเดิน = น้ำแข็งหาย · คนอื่นเดินไม่สร้าง', () => {
  const P = setup([['I', 'ice_spike', 1, 5], ['B', 'dummy', 10, 5]]);
  engine.setActor('I');
  assert.equal(engine.moveTo('I', 3, 5), true);
  for (const x of [1, 2, 3]) assert.equal(engine.boardMap().special[`${x},5`], 'ice', `ช่อง ${x},5`);
  assert.ok(fxEvents().some((e) => e.kind === 'lay'));
  assert.equal(engine.undoMove('I'), true);
  assert.equal(engine.boardMap().special['2,5'], undefined, 'ย้อนแล้วหาย');
  assert.deepEqual(P.I.pos, { x: 1, y: 5 });
  engine.moveTo('I', 3, 5);
  // อยู่ 6 เทิร์น
  for (let i = 0; i < 5; i++) Ice.onEndTurn();
  assert.equal(engine.boardMap().special['2,5'], 'ice');
  Ice.onEndTurn();
  assert.equal(engine.boardMap().special['2,5'], undefined);
  // คนอื่นเดินไม่สร้างน้ำแข็ง
  engine.setActor('B');
  engine.moveTo('B', 10, 3);
  assert.equal(engine.boardMap().special['10,4'], undefined);
});

test('ติดตัว 1: เดินทีละก้าว (W A S D) — รอยน้ำแข็งของตัวเองในตานี้ไม่ตัดทาง · เดินตรงได้ครบระยะ 4 · กดย้อน = น้ำแข็งหาย', () => {
  const P = setup([['I', 'ice_spike', 1, 5], ['B', 'dummy', 10, 5]]);
  engine.setActor('I');
  for (const x of [2, 3, 4, 5]) assert.equal(engine.moveTo('I', x, 5, { step: true }), true, `ก้าวไป ${x},5`);
  assert.deepEqual(P.I.pos, { x: 5, y: 5 });
  assert.equal(engine.action.slid, undefined, 'ไม่ไถลบนรอยของตัวเอง');
  for (const x of [1, 2, 3, 4, 5]) assert.equal(engine.boardMap().special[`${x},5`], 'ice', `ช่อง ${x},5`);
  assert.equal(engine.moveTo('I', 6, 5, { step: true }), false, 'เกินระยะ 4');
  // ย้อนการเดิน = กลับช่องเริ่ม น้ำแข็งที่วางในตานี้หายหมด
  assert.equal(engine.undoMove('I'), true);
  assert.deepEqual(P.I.pos, { x: 1, y: 5 });
  for (const x of [1, 2, 3, 4, 5]) assert.equal(engine.boardMap().special[`${x},5`], undefined, `ช่อง ${x},5 หาย`);
});

test('ติดตัว 2: ไถลชนศัตรู = เสียหายเท่าระยะไถล (สูงสุด 3) แล้วเป้ากระเด็น 1 ช่อง · จบตา · ติดตัว 3: ทุก 4 ช่อง พลังชีวิต +1 · ทุก 2 ช่อง แต้มสกิล +1', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const P = setup([['I', 'ice_spike', 1, 5], ['B', 'dummy', 7, 5]]);
  lay([[2, 5], [3, 5], [4, 5], [5, 5], [6, 5]]);
  P.I.hp = 5; P.I.skillPoints = 3;
  P.B.hp = 7; P.B.armor = 3;
  engine.setActor('I');
  assert.equal(engine.moveTo('I', 6, 5), true);
  assert.deepEqual(P.I.pos, { x: 6, y: 5 }, 'ไถลไปสุดแนว');
  assert.equal(vit(P.B), 10 - 3, 'ไถล 5 ช่อง แต่สูงสุด 3');
  assert.equal(P.B.armor, 0, 'ลดเกราะก่อน');
  assert.equal(P.B.hp, 7);
  assert.deepEqual(P.B.pos, { x: 8, y: 5 }, 'กระเด็น 1 ช่อง');
  assert.equal(P.I.hp, 6, '5 ช่อง = พลังชีวิต +1 (ทุก 4)');
  assert.equal(P.I.skillPoints, 5, '5 ช่อง = แต้มสกิล +2 (ทุก 2)');
  assert.equal(engine.gameState, 'ATTACKING', 'ไถลชน = การโจมตี จบตา');
  const ev = fxEvents();
  assert.deepEqual(ev.map((e) => e.kind).filter((k) => k !== 'lay'), ['walk', 'slide', 'regen', 'hit', 'knock']);
  assert.equal(ev.find((e) => e.kind === 'hit').max, true);
});

test('คนอื่นไถลชนศัตรู = เป้ากระเด็น 1 ช่องไม่เสียเลือด · กระเด็นลงน้ำแข็ง = ไถลต่อ · ชนเพื่อนร่วมทีม = หยุดเฉยๆ', () => {
  const P = setup([['A', 'dummy', 1, 5], ['C', 'dummy', 5, 5], ['I', 'ice_spike', 1, 9]]);
  lay([[2, 5], [3, 5], [4, 5], [7, 5], [8, 5], [9, 5]]);
  engine.setActor('A');
  engine.moveTo('A', 4, 5);
  assert.deepEqual(P.A.pos, { x: 4, y: 5 });
  assert.equal(vit(P.C), 7 + 3, 'ไม่เสียเลือด');
  // C กระเด็นไป (6,5) พื้น — ไม่ไถล
  assert.deepEqual(P.C.pos, { x: 6, y: 5 });
  assert.notEqual(engine.gameState, 'ATTACKING', 'ไม่ใช่การโจมตี');
  // ครั้งที่สอง: C ยืนติดแนวน้ำแข็ง (7..9) → กระเด็นลงน้ำแข็งแล้วไถลไป (9,5)
  P.A.pos = { x: 1, y: 5 }; P.C.pos = { x: 5, y: 5 };
  lay([[6, 5]]);
  engine.setActor('A');
  engine.moveTo('A', 4, 5);
  assert.deepEqual(P.C.pos, { x: 9, y: 5 }, 'กระเด็นลงน้ำแข็งแล้วไถลต่อ');
  // ทีม: ชนเพื่อน = ไม่กระเด็น
  const T = setup([['A', 'dummy', 1, 5, 'A'], ['C', 'dummy', 5, 5, 'A'], ['E', 'dummy', 12, 12, 'B']], 'duo');
  lay([[2, 5], [3, 5], [4, 5]]);
  engine.setActor('A');
  engine.moveTo('A', 4, 5);
  assert.deepEqual(T.C.pos, { x: 5, y: 5 });
});

test('สกิลพื้นฐาน: 1 แต้ม · ไม่จำกัดครั้ง · ระยะ 8 · ก่อนเดินแล้วยังเดินได้ · วางบนสิ่งกีดขวาง/นอกระยะไม่ได้ (ไม่เสียแต้ม)', () => {
  const P = setup([['I', 'ice_spike', 3, 5], ['B', 'dummy', 12, 12]]);
  engine.setActor('I');
  engine.useSkill('I', 'basic', [], { tile: { x: 3, y: 1 } }); // ห่าง 4
  engine.useSkill('I', 'basic', [], { tile: { x: 11, y: 5 } }); // ห่าง 8
  assert.equal(P.I.skillPoints, 6);
  assert.equal(engine.boardMap().special['11,5'], 'ice');
  engine.useSkill('I', 'basic', [], { tile: { x: 12, y: 5 } }); // ห่าง 9
  engine.useSkill('I', 'basic', [], { tile: { x: 4, y: 4 } });  // เสา (สิ่งกีดขวาง)
  assert.equal(P.I.skillPoints, 6, 'ไม่เสียแต้ม');
  assert.equal(engine.action.locked, false, 'ยังเดินได้');
  assert.equal(P.I.skillUsedRound, false, 'ไม่กินโควตา');
  engine.moveTo('I', 3, 7);
  engine.useSkill('I', 'basic', [], { tile: { x: 5, y: 7 } });
  assert.equal(engine.action.locked, true, 'เดินแล้วใช้ = ล็อก');
});

test('สกิลรอง: หนาม Lv1 (สิ่งกีดขวาง) · เทิร์นละ 2 ครั้ง · บนน้ำแข็ง = Lv2 · ทับคน = ผลักไปทิศที่เลือก + เชื่องช้า · ทิศที่ขวาง = ใช้ไม่ได้', () => {
  const P = setup([['I', 'ice_spike', 3, 5], ['B', 'dummy', 5, 5], ['C', 'dummy', 12, 13]]);
  engine.setActor('I');
  engine.useSkill('I', 'secondary', [], { tile: { x: 3, y: 2 } });
  assert.equal(terrainAt(3, 2), 'icespike1');
  assert.equal(P.I.skillPoints, 6);
  engine.useSkill('I', 'secondary', [], { tile: { x: 2, y: 2 } });
  assert.equal(terrainAt(2, 2), 'icespike1', 'ครั้งที่ 2 ได้');
  engine.useSkill('I', 'secondary', [], { tile: { x: 1, y: 2 } });
  assert.equal(terrainAt(1, 2), undefined, 'ครั้งที่ 3 ไม่ได้');
  assert.equal(P.I.skillPoints, 4);
  assert.equal(engine.buildStateFor('I').players.find((p) => p.id === 'I').skillLocks.secondary.locked, true);
  P.I.skillPoints = 8;
  // เทิร์นใหม่: วางบนน้ำแข็ง = Lv2
  engine.setRoundNumber(engine.roundNumber + 1);
  lay([[3, 7]]);
  engine.useSkill('I', 'secondary', [], { tile: { x: 3, y: 7 } });
  assert.equal(terrainAt(3, 7), 'icespike2');
  assert.equal(engine.boardMap().special['3,7'], undefined, 'น้ำแข็งใต้หนามหายไป');
  engine.setRoundNumber(engine.roundNumber + 1);
  P.I.skillPoints = 8;
  engine.useSkill('I', 'secondary', [], { tile: { x: 5, y: 5 }, dir: 'left' }); // (4,5) ว่าง
  assert.deepEqual(P.B.pos, { x: 4, y: 5 });
  assert.equal(terrainAt(5, 5), 'icespike1');
  assert.ok(P.B.statuses.slow > 0);
  assert.equal(engine.movOf(P.B), 3, 'เชื่องช้า = เดิน −1');
  // ทิศที่ขวาง: B ที่ (4,5) ดันขึ้นไป (4,4) = เสา
  engine.setRoundNumber(engine.roundNumber + 1);
  P.I.skillPoints = 8;
  engine.useSkill('I', 'secondary', [], { tile: { x: 4, y: 5 }, dir: 'up' });
  assert.equal(P.I.skillPoints, 8, 'ทิศที่ขวาง = ใช้ไม่ได้ ไม่เสียแต้ม');
  engine.useSkill('I', 'secondary', [], { tile: { x: 4, y: 5 } });
  assert.equal(P.I.skillPoints, 8, 'ทับคนต้องเลือกทิศ');
});

test('ไถลชนหนาม: เสียเท่า Lv (เกราะก่อน) + เชื่องช้า 1 เทิร์น · หนามลด 1 Lv · Ice Spike ชนหนามตัวเอง = แต้มสกิล +2 ไม่เสียหาย', () => {
  const P = setup([['A', 'dummy', 1, 5], ['I', 'ice_spike', 1, 8], ['C', 'dummy', 12, 13]]);
  lay([[2, 5], [3, 5]]);
  Ice.placeSpike(4, 5, 'I', 1);
  Ice.raiseSpike('4,5'); // Lv2
  engine.setActor('A');
  engine.moveTo('A', 3, 5);
  assert.deepEqual(P.A.pos, { x: 3, y: 5 });
  assert.equal(vit(P.A), 10 - 2);
  assert.equal(P.A.statuses.slow, 1 + 1, 'เชื่องช้า 1 เทิร์น (กำลังเดิน +1)');
  assert.equal(terrainAt(4, 5), 'icespike1');
  // ของตัวเอง
  lay([[2, 8], [3, 8]]);
  Ice.placeSpike(4, 8, 'I', 1);
  P.I.skillPoints = 1;
  const before = vit(P.I);
  engine.setActor('I');
  engine.moveTo('I', 3, 8);
  assert.equal(P.I.skillPoints, 1 + 2 + 1, 'ชนหนามตัวเอง +2 · ไถล 2 ช่อง +1');
  assert.ok(vit(P.I) >= before);
  assert.equal(P.I.statuses.slow, undefined);
  assert.equal(terrainAt(4, 8), undefined, 'Lv1 แตก');
});

test('ตีหนาม: ทุกคนตีได้ ("spike:x,y") · เกราะ 1 ทุก Lv · ตีแตก = ลด 1 Lv · Lv1 แตก = หาย', () => {
  const P = setup([['A', 'dummy', 2, 5], ['I', 'ice_spike', 12, 12]]);
  Ice.placeSpike(3, 5, 'I', 1);
  Ice.raiseSpike('3,5'); Ice.raiseSpike('3,5'); // Lv3
  assert.equal(Ice.spikeAt(3, 5).armor, 1);
  engine.setActor('A');
  assert.equal(engine.attackTarget('A', 'spike:3,5'), true);
  engine.clearPhaseTimer();
  assert.equal(Ice.spikeAt(3, 5).lv, 2, 'ตีแตก 1 ครั้ง = ลด 1 Lv');
  assert.equal(Ice.spikeAt(3, 5).armor, 1);
  assert.equal(engine.lastAttack.spike.x, 3);
  Ice.damageSpike('3,5', 1);
  assert.equal(Ice.spikeAt(3, 5).lv, 1);
  Ice.damageSpike('3,5', 1);
  assert.equal(Ice.spikeAt(3, 5), null, 'Lv3 ต้องตีแตก 3 ครั้งถึงหาย');
  assert.ok(P.A);
});

test('เชื่องช้า: −1 เดิน · ไม่ซ้อน · ได้ใหม่ = 3 เทิร์น (คนที่เดินไปแล้ว +1) · ต้านสถานะได้', () => {
  const P = setup([['A', 'dummy', 2, 5], ['B', 'dummy', 6, 5]]);
  Ice.applySlow(P.A);
  Ice.applySlow(P.A);
  assert.equal(engine.movOf(P.A), 3);
  assert.equal(P.A.statuses.slow, 3);
  engine.setActor('A');
  Ice.applySlow(P.A);
  assert.equal(P.A.statuses.slow, 4, 'กำลังเดิน = นับเพิ่ม 1');
  P.B.statuses.resist = 2;
  assert.equal(Ice.applySlow(P.B), false);
});

test('ติดตัว 3: ดาเมจสะสมครบ 3 (รวมเกราะ · เกินทบ) = ศัตรู 8 ช่องรอบตัวถูกผลักออก 2 ช่อง + เชื่องช้า 1 เทิร์น · เพื่อนไม่โดน', async () => {
  const P = setup([['I', 'ice_spike', 5, 5, 'A'], ['F', 'dummy', 4, 5, 'A'], ['E', 'dummy', 6, 6, 'B'], ['G', 'dummy', 5, 4, 'B']], 'duo');
  engine.setGameState('ACTION');
  engine.dealMixed(P.I, 2, false);
  await nextTick();
  assert.equal(P.I.iceHurt, 2);
  assert.deepEqual(P.E.pos, { x: 6, y: 6 });
  engine.dealMixed(P.I, 2, false);
  await nextTick();
  assert.equal(P.I.iceHurt, 1, 'เกินทบ');
  assert.deepEqual(P.E.pos, { x: 8, y: 8 }, 'ทแยง = ผลักทแยง 2 ช่อง');
  assert.deepEqual(P.G.pos, { x: 5, y: 2 });
  assert.equal(P.E.statuses.slow, 1);
  assert.equal(P.G.statuses.slow, 1);
  assert.deepEqual(P.F.pos, { x: 4, y: 5 }, 'เพื่อนไม่โดน');
  assert.ok(fxEvents().some((e) => e.kind === 'burst'));
});

test('ระยะเดิน/แผนที่ฝั่ง client: state.board ส่งน้ำแข็ง/หนาม · หนามเป็นสิ่งกีดขวาง', () => {
  setup([['I', 'ice_spike', 3, 5], ['B', 'dummy', 12, 12]]);
  Ice.layIce(2, 2, 'I');
  Ice.placeSpike(6, 5, 'I', 1);
  const b = engine.buildStateFor('I').board;
  assert.deepEqual(b.ice, [{ x: 2, y: 2, left: 6, owner: 'I' }]);
  assert.equal(b.spikes[0].lv, 1);
  assert.equal(b.spikes[0].maxArmor, 1);
  assert.equal(b.terrain['6,5'], 'icespike1');
  assert.equal(b.special['2,2'], 'ice');
  assert.equal(engine.tileFree(6, 5), false);
});

test('หนาม: อยู่ 3 เทิร์น · ขึ้น Lv = นับ 3 เทิร์นใหม่', () => {
  setup([['I', 'ice_spike', 3, 5], ['B', 'dummy', 12, 12]]);
  Ice.placeSpike(6, 5, 'I', 1);
  Ice.onEndTurn(); Ice.onEndTurn();
  assert.equal(terrainAt(6, 5), 'icespike1');
  Ice.raiseSpike('6,5');
  assert.equal(Ice.spikeAt(6, 5).left, 3, 'ขึ้น Lv = นับใหม่');
  Ice.onEndTurn(); Ice.onEndTurn();
  assert.equal(terrainAt(6, 5), 'icespike2');
  Ice.onEndTurn();
  assert.equal(terrainAt(6, 5), undefined, 'ครบ 3 เทิร์น = หาย');
});

test('เปลี่ยนภูมิภาค (placeOnBoard) = ธารน้ำแข็ง/หนามหายหมด', () => {
  setup([['I', 'ice_spike', 3, 5], ['B', 'dummy', 12, 12]]);
  Ice.layIce(2, 2, 'I');
  Ice.placeSpike(6, 5, 'I', 1);
  engine.placeOnBoard(2);
  assert.equal(Ice.iceAt(2, 2), null);
  assert.equal(Ice.spikeAt(6, 5), null);
  assert.equal(terrainAt(6, 5), undefined);
  assert.equal(engine.boardMap().special['2,2'], undefined);
  const b = engine.buildStateFor('I').board;
  assert.deepEqual([b.ice, b.spikes], [[], []]);
});

test('Ice Spike สองคน: ไถลชนหนามของอีกคน = เสียเท่า Lv + เชื่องช้า (ไม่ได้แต้มแบบหนามตัวเอง)', () => {
  const P = setup([['I', 'ice_spike', 1, 5], ['J', 'ice_spike', 12, 12]]);
  lay([[2, 5], [3, 5]]);
  Ice.placeSpike(4, 5, 'J', 1);
  P.I.skillPoints = 1;
  engine.setActor('I');
  engine.moveTo('I', 3, 5);
  assert.deepEqual(P.I.pos, { x: 3, y: 5 });
  assert.equal(vit(P.I), 10 - 1, 'เสียเท่า Lv (เกราะก่อน)');
  assert.equal(P.I.armor, 1);
  assert.ok(P.I.statuses.slow > 0, 'หนามของอีกคน = เชื่องช้า');
  assert.equal(P.I.skillPoints, 1 + 1, 'ไถล 2 ช่อง +1 เท่านั้น');
  assert.equal(terrainAt(4, 5), undefined, 'Lv1 แตก');
  assert.equal(fxEvents().find((e) => e.kind === 'spike').own, false);
});

test('ภูมิภาค VI: น้ำแข็งถาวร — วางธารน้ำแข็งทับไม่ได้ (ไม่เสียแต้ม) · หนามบนน้ำแข็งถาวร = Lv2', () => {
  const P = setup([['I', 'ice_spike', 3, 5], ['B', 'dummy', 12, 12]]);
  engine.setJourneyArea(6);
  engine.placeOnBoard(6);
  P.I.pos = { x: 4, y: 4 }; P.B.pos = { x: 12, y: 5 };
  assert.equal(engine.boardMap().special['1,3'], 'ice');
  assert.equal(Ice.layIce(1, 3, 'I'), null);
  assert.equal(Ice.canLay(1, 3), false);
  engine.setActor('I');
  engine.useSkill('I', 'basic', [], { tile: { x: 1, y: 3 } });
  assert.equal(P.I.skillPoints, 8, 'วางไม่ได้ = ไม่เสียแต้ม');
  assert.equal(Ice.iceAt(1, 3), null);
  engine.useSkill('I', 'secondary', [], { tile: { x: 2, y: 3 } });
  assert.equal(terrainAt(2, 3), 'icespike2');
  assert.equal(P.I.skillPoints, 6);
});

test('ท่าไม้ตาย Ice Surge: 4 แต้ม · ใช้ก่อนเดินแล้วยังเดินได้ · หนามทุกอันบนสนาม +1 Lv · บัฟ 3 เทิร์น + ฟื้นพลัง 3 ขั้น · คูลดาวน์ 6', () => {
  const P = setup([['I', 'ice_spike', 3, 5], ['J', 'ice_spike', 12, 13], ['B', 'dummy', 12, 2]]);
  Ice.placeSpike(6, 5, 'I', 1);
  Ice.placeSpike(10, 8, 'J', 1);
  Ice.placeSpike(1, 2, 'I', 1); Ice.raiseSpike('1,2'); Ice.raiseSpike('1,2'); // Lv3 อยู่แล้ว
  engine.setActor('I');
  engine.useSkill('I', 'ultimate', []);
  engine.clearPhaseTimer();
  assert.equal(P.I.skillPoints, 4);
  assert.equal(terrainAt(6, 5), 'icespike2');
  assert.equal(terrainAt(10, 8), 'icespike2', 'หนามของ Ice Spike คนอื่นก็ขึ้น');
  assert.equal(terrainAt(1, 2), 'icespike3', 'Lv3 = เพดาน');
  assert.equal(P.I.statuses.iceSurge, 3);
  assert.equal(P.I.statuses.spRegen, 3);
  assert.equal(engine.action.locked, false, 'ยังเดินได้');
  const ev = fxEvents();
  assert.equal(ev[0].kind, 'surge');
  assert.equal(ev.filter((e) => e.kind === 'spikeUp').length, 2);
  // คูลดาวน์ 6: กดเทิร์น N ได้อีกเทิร์น N + 6
  const r0 = engine.roundNumber;
  P.I.skillPoints = 8;
  engine.setRoundNumber(r0 + 5);
  engine.setActor('I');
  engine.useSkill('I', 'ultimate', []);
  assert.equal(P.I.skillPoints, 8, 'ยังติดคูลดาวน์');
  assert.equal(engine.buildStateFor('I').players.find((p) => p.id === 'I').skillLocks.ultimate.cd, 1);
  engine.setRoundNumber(r0 + 6);
  engine.setActor('I');
  engine.useSkill('I', 'ultimate', []);
  engine.clearPhaseTimer();
  assert.equal(P.I.skillPoints, 4);
});

test('Ice Surge: ธารน้ำแข็ง/หนามระยะทั้งสนาม · หนามใช้ 1 แต้ม เทิร์นละ 6 ครั้ง · หมดบัฟ = กลับปกติ', () => {
  const P = setup([['I', 'ice_spike', 0, 5], ['B', 'dummy', 12, 2]]);
  engine.setActor('I');
  engine.useSkill('I', 'basic', [], { tile: { x: 13, y: 13 } }); // ห่าง 21
  assert.equal(P.I.skillPoints, 8, 'ไม่มีบัฟ = นอกระยะ');
  engine.applyBuff(P.I, 'iceSurge', null, 3);
  engine.useSkill('I', 'basic', [], { tile: { x: 13, y: 13 } });
  assert.equal(engine.boardMap().special['13,13'], 'ice');
  P.I.skillPoints = 8;
  for (const x of [8, 9, 10, 11]) engine.useSkill('I', 'secondary', [], { tile: { x, y: 12 } });
  for (const x of [8, 9, 10, 11]) assert.equal(terrainAt(x, 12), 'icespike1', `หนาม ${x},12`);
  assert.equal(P.I.skillPoints, 8 - 4, 'หนาม 1 แต้ม × 4 ครั้ง');
  const pub = engine.buildStateFor('I').players.find((p) => p.id === 'I');
  assert.equal(pub.character.secondary.cost, 1);
  assert.equal(pub.character.secondary.area.range, ice.SURGE_RANGE);
  assert.equal(pub.skillLocks.secondary.locked, false);
  for (const x of [8, 9]) engine.useSkill('I', 'secondary', [], { tile: { x, y: 13 } });
  assert.equal(terrainAt(9, 13), 'icespike1', 'ครั้งที่ 6');
  assert.equal(engine.buildStateFor('I').players.find((p) => p.id === 'I').skillLocks.secondary.locked, true);
  engine.useSkill('I', 'secondary', [], { tile: { x: 10, y: 13 } });
  assert.equal(terrainAt(10, 13), undefined, 'ครั้งที่ 7 ไม่ได้');
  assert.equal(P.I.skillPoints, 8 - 6);
  // หมดบัฟ
  delete P.I.statuses.iceSurge;
  engine.setRoundNumber(engine.roundNumber + 1);
  P.I.skillPoints = 8;
  engine.setActor('I');
  engine.useSkill('I', 'secondary', [], { tile: { x: 12, y: 9 } });
  assert.equal(terrainAt(12, 9), undefined, 'นอกระยะ 8');
  assert.equal(engine.buildStateFor('I').players.find((p) => p.id === 'I').character.secondary.cost, 2);
});

test('ฟื้นพลัง: ต้นเทิร์นแต้มสกิล +1 ทีละขั้น · ไม่ลดตอนจบเทิร์น · ได้ใหม่ = นับใหม่ 3 ขั้น', () => {
  const P = setup([['I', 'ice_spike', 3, 5], ['B', 'dummy', 12, 2]]);
  P.I.skillPoints = 0;
  engine.applySpRegen(P.I, 3);
  engine.endTurn();
  engine.clearPhaseTimer();
  assert.equal(P.I.statuses.spRegen, 3, 'จบเทิร์นไม่ลด');
  const Status = require('../../characters/_universal_status.js');
  Status.tickSpRegen(engine, P.I);
  assert.equal(P.I.statuses.spRegen, 2);
  Status.tickSpRegen(engine, P.I);
  engine.applySpRegen(P.I, 3);
  assert.equal(P.I.statuses.spRegen, 3, 'ได้ใหม่ = นับใหม่');
  Status.tickSpRegen(engine, P.I); Status.tickSpRegen(engine, P.I); Status.tickSpRegen(engine, P.I);
  assert.equal(P.I.statuses.spRegen, undefined);
  assert.equal(P.I.skillPoints, 1 + 5, 'จบเทิร์น +1 · ติก 5 ครั้ง');
});

test('ผลัก n ช่อง: ทีละช่อง · ช่องถัดไปไม่ว่าง = หยุดช่องก่อนหน้า (เด้ง) · ลงน้ำแข็ง = ไถลต่อแทน', () => {
  const P = setup([['A', 'dummy', 2, 7], ['B', 'dummy', 5, 7], ['C', 'dummy', 2, 8]]);
  let ctx = Ice.begin();
  assert.equal(Ice.pushUnit(P.A, { x: 1, y: 0 }, ctx, 2), true);
  assert.deepEqual(P.A.pos, { x: 4, y: 7 }, 'ผลัก 2 ช่อง');
  ctx = Ice.begin();
  assert.equal(Ice.pushUnit(P.A, { x: 1, y: 0 }, ctx, 2), false, 'ติดคนข้างหน้า');
  assert.deepEqual(P.A.pos, { x: 4, y: 7 });
  assert.equal(ctx.events.at(-1).collide, true);
  lay([[3, 8], [4, 8], [5, 8], [6, 8]]);
  ctx = Ice.begin();
  Ice.pushUnit(P.C, { x: 1, y: 0 }, ctx, 2);
  assert.deepEqual(P.C.pos, { x: 6, y: 8 }, 'ลงน้ำแข็งช่องแรก = ไถลจนสุดแนว');
});

test('ตัวใหญ่ 2×2 เหยียบหนาม: หนามแตกทุก Lv · เสีย Lv − 1 (เกราะก่อน) + เชื่องช้า 1 เทิร์น · เดินต่อได้ · ย้อนได้แค่ถึงช่องที่เหยียบ', () => {
  const P = setup([['E', 'dummy', 1, 7], ['I', 'ice_spike', 12, 2], ['C', 'dummy', 12, 13]]);
  P.E.boardSize = 2;
  Ice.placeSpike(3, 7, 'I', 1); Ice.raiseSpike('3,7');   // Lv2
  Ice.placeSpike(4, 8, 'I', 1); Ice.raiseSpike('4,8', 2); // Lv3
  Ice.placeSpike(7, 7, 'I', 1);                          // Lv1
  engine.setActor('E');
  assert.equal(engine.moveTo('E', 4, 7), true, 'หนามไม่ขวางตัวใหญ่');
  assert.deepEqual(P.E.pos, { x: 4, y: 7 }, 'เดินต่อไม่หยุดที่หนาม');
  assert.equal(terrainAt(3, 7), undefined);
  assert.equal(terrainAt(4, 8), undefined);
  assert.equal(vit(P.E), 10 - 1 - 2, 'Lv2 = 1 · Lv3 = 2');
  assert.equal(P.E.statuses.slow, 1 + 1, 'เชื่องช้า 1 เทิร์น (กำลังเดิน +1)');
  const kinds = fxEvents().map((e) => e.kind);
  assert.deepEqual(kinds, ['walk', 'trample', 'slow', 'walk', 'trample', 'slow', 'walk']);
  assert.equal(engine.undoMove('E'), false, 'เหยียบแล้วย้อนไม่ได้');
  assert.equal(engine.moveTo('E', 5, 7), true, 'ก้าวที่เหลือ 1 ยังเดินได้');
  assert.equal(engine.moveTo('E', 6, 7), false, 'ก้าวหมด');
  calls.fx = [];
  P.E.hp = 1; P.E.armor = 0; P.E.statuses = {};
  engine.setRoundNumber(engine.roundNumber + 1);
  engine.setActor('E');
  assert.equal(engine.moveTo('E', 7, 7), true);
  assert.equal(terrainAt(7, 7), undefined, 'Lv1 แตก');
  assert.equal(P.E.hp, 1, 'Lv1 = ไม่เสียหาย');
  assert.equal(P.E.statuses.slow, 1 + 1);
});

test('ตัวใหญ่เหยียบหนามตาย = ตกรอบ จบตา', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const P = setup([['E', 'dummy', 1, 7], ['I', 'ice_spike', 12, 2], ['C', 'dummy', 12, 13]]);
  P.E.boardSize = 2;
  P.E.hp = 2; P.E.armor = 0;
  Ice.placeSpike(3, 7, 'I', 1); Ice.raiseSpike('3,7', 2); // Lv3
  engine.setActor('E');
  assert.equal(engine.moveTo('E', 4, 7), true);
  assert.equal(P.E.alive, false);
  assert.equal(engine.gameState, 'ATTACKING');
  const tr = fxEvents().find((e) => e.kind === 'trample');
  assert.equal(tr.kill, true);
});
