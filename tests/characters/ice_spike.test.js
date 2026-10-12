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

test('ข้อมูล: ระดับยาก · เลือด 8 เกราะ 2 · เดิน 4 · ตีปกติไม่ได้ · สกิลเลือกช่อง ระยะ 6 · ราคา 1/2/5', () => {
  const ch = CHAR_BY_ID.ice_spike;
  assert.equal(ch.difficulty, 'hard');
  assert.equal(ch.mov, 4);
  assert.deepEqual(ch.range, [1, 0]);
  assert.deepEqual([ch.basic.cost, ch.secondary.cost, ch.ultimate.cost], [1, 2, 5]);
  assert.deepEqual(ch.basic.area, { kind: 'tile', range: 6, place: 'ice' });
  assert.equal(ch.secondary.area.place, 'spike');
  assert.equal(ch.ultimate.area.square, 5);
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

test('ติดตัว 2: ไถลชนศัตรู = เสียหายเท่าระยะไถล (สูงสุด 4) แล้วเป้ากระเด็น 1 ช่อง · จบตา · ติดตัว 3: ไถลครบ 2 ช่อง ฟื้น 1/1', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const P = setup([['I', 'ice_spike', 1, 5], ['B', 'dummy', 7, 5]]);
  lay([[2, 5], [3, 5], [4, 5], [5, 5], [6, 5]]);
  P.I.hp = 5; P.I.skillPoints = 3;
  P.B.hp = 7; P.B.armor = 3;
  engine.setActor('I');
  assert.equal(engine.moveTo('I', 6, 5), true);
  assert.deepEqual(P.I.pos, { x: 6, y: 5 }, 'ไถลไปสุดแนว');
  assert.equal(vit(P.B), 10 - 4, 'ไถล 5 ช่อง แต่สูงสุด 4');
  assert.equal(P.B.armor, 0, 'ลดเกราะก่อน');
  assert.deepEqual(P.B.pos, { x: 8, y: 5 }, 'กระเด็น 1 ช่อง');
  assert.equal(P.I.hp, 7, '5 ช่อง = ฟื้น 2');
  assert.equal(P.I.skillPoints, 5);
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

test('สกิลพื้นฐาน: 1 แต้ม · ไม่จำกัดครั้ง · ระยะ 6 · ก่อนเดินแล้วยังเดินได้ · วางบนสิ่งกีดขวาง/นอกระยะไม่ได้ (ไม่เสียแต้ม)', () => {
  const P = setup([['I', 'ice_spike', 3, 5], ['B', 'dummy', 12, 12]]);
  engine.setActor('I');
  engine.useSkill('I', 'basic', [], { tile: { x: 3, y: 1 } }); // ห่าง 4
  engine.useSkill('I', 'basic', [], { tile: { x: 9, y: 5 } }); // ห่าง 6
  assert.equal(P.I.skillPoints, 6);
  assert.equal(engine.boardMap().special['9,5'], 'ice');
  engine.useSkill('I', 'basic', [], { tile: { x: 10, y: 5 } }); // ห่าง 7
  engine.useSkill('I', 'basic', [], { tile: { x: 4, y: 4 } });  // เสา (สิ่งกีดขวาง)
  assert.equal(P.I.skillPoints, 6, 'ไม่เสียแต้ม');
  assert.equal(engine.action.locked, false, 'ยังเดินได้');
  assert.equal(P.I.skillUsedRound, false, 'ไม่กินโควตา');
  engine.moveTo('I', 3, 7);
  engine.useSkill('I', 'basic', [], { tile: { x: 5, y: 7 } });
  assert.equal(engine.action.locked, true, 'เดินแล้วใช้ = ล็อก');
});

test('สกิลรอง: หนาม Lv1 (สิ่งกีดขวาง) · เทิร์นละครั้ง · บนน้ำแข็ง = Lv2 · ทับคน = ผลักไปทิศที่เลือก + เชื่องช้า · ทิศที่ขวาง = ใช้ไม่ได้', () => {
  const P = setup([['I', 'ice_spike', 3, 5], ['B', 'dummy', 5, 5], ['C', 'dummy', 12, 13]]);
  engine.setActor('I');
  engine.useSkill('I', 'secondary', [], { tile: { x: 3, y: 2 } });
  assert.equal(terrainAt(3, 2), 'icespike1');
  assert.equal(P.I.skillPoints, 6);
  engine.useSkill('I', 'secondary', [], { tile: { x: 2, y: 2 } });
  assert.equal(terrainAt(2, 2), undefined, 'เทิร์นละครั้ง');
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

test('ไถลชนหนาม: เสียเท่า Lv (เกราะก่อน) + เชื่องช้า · หนามลด 1 Lv · Ice Spike ชนหนามตัวเอง = แต้มสกิล +2 ไม่เสียหาย', () => {
  const P = setup([['A', 'dummy', 1, 5], ['I', 'ice_spike', 1, 8], ['C', 'dummy', 12, 13]]);
  lay([[2, 5], [3, 5]]);
  Ice.placeSpike(4, 5, 'I', 1);
  Ice.raiseSpike('4,5'); // Lv2
  engine.setActor('A');
  engine.moveTo('A', 3, 5);
  assert.deepEqual(P.A.pos, { x: 3, y: 5 });
  assert.equal(vit(P.A), 10 - 2);
  assert.ok(P.A.statuses.slow > 0);
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

test('ตีหนาม: ทุกคนตีได้ ("spike:x,y") · เกราะแตก = ลด 1 Lv · Lv1 แตก = หาย', () => {
  const P = setup([['A', 'dummy', 2, 5], ['I', 'ice_spike', 12, 12]]);
  Ice.placeSpike(3, 5, 'I', 1);
  Ice.raiseSpike('3,5'); Ice.raiseSpike('3,5'); // Lv3 เกราะ 2
  engine.setActor('A');
  assert.equal(engine.attackTarget('A', 'spike:3,5'), true);
  engine.clearPhaseTimer();
  assert.equal(Ice.spikeAt(3, 5).lv, 3);
  assert.equal(Ice.spikeAt(3, 5).armor, 1);
  assert.equal(engine.lastAttack.spike.x, 3);
  Ice.damageSpike('3,5', 1);
  assert.equal(Ice.spikeAt(3, 5).lv, 2);
  assert.equal(Ice.spikeAt(3, 5).armor, 2);
  Ice.damageSpike('3,5', 3);
  assert.equal(Ice.spikeAt(3, 5), null, 'Lv2 แตก (2) → Lv1 แตก (1) = หาย');
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

test('ติดตัว 3: ดาเมจสะสมครบ 3 (รวมเกราะ · เกินทบ) = ศัตรู 8 ช่องรอบตัวถูกผลักออก + เชื่องช้า · เพื่อนไม่โดน', async () => {
  const P = setup([['I', 'ice_spike', 5, 5, 'A'], ['F', 'dummy', 4, 5, 'A'], ['E', 'dummy', 6, 6, 'B'], ['G', 'dummy', 5, 4, 'B']], 'duo');
  engine.setGameState('ACTION');
  engine.dealMixed(P.I, 2, false);
  await nextTick();
  assert.equal(P.I.iceHurt, 2);
  assert.deepEqual(P.E.pos, { x: 6, y: 6 });
  engine.dealMixed(P.I, 2, false);
  await nextTick();
  assert.equal(P.I.iceHurt, 1, 'เกินทบ');
  assert.deepEqual(P.E.pos, { x: 7, y: 7 }, 'ทแยง = ผลักทแยง');
  assert.deepEqual(P.G.pos, { x: 5, y: 3 });
  assert.ok(P.E.statuses.slow > 0 && P.G.statuses.slow > 0);
  assert.deepEqual(P.F.pos, { x: 4, y: 5 }, 'เพื่อนไม่โดน');
  assert.ok(fxEvents().some((e) => e.kind === 'burst'));
});

test('ท่าไม้ตาย: ศัตรูในกรอบ 5×5 เชื่องช้า · หนามในกรอบ +1 Lv · คูลดาวน์ 5 · ต้นตาเดินถัดไป: น้ำแข็ง 3×3 + หนามรอบขอบ · คนบนขอบถูกผลักเข้า ไถลชนหนามฝั่งตรงข้าม', () => {
  // กรอบรอบ (6,9): x 4..8 · y 7..11 — เสา (4,9) อยู่บนขอบซ้าย
  const P = setup([['I', 'ice_spike', 1, 9], ['E', 'dummy', 6, 9], ['R', 'dummy', 6, 7], ['Z', 'dummy', 12, 13]]);
  Ice.placeSpike(6, 5, 'I', 1);  // นอกกรอบ
  Ice.placeSpike(8, 11, 'I', 1); // มุมขวาล่างของกรอบ
  engine.setActor('I');
  engine.useSkill('I', 'ultimate', [], { tile: { x: 8, y: 9 } }); // ห่าง 7
  assert.equal(P.I.skillPoints, 8, 'นอกระยะ');
  engine.useSkill('I', 'ultimate', [], { tile: { x: 6, y: 9 } }); // ห่าง 5
  engine.clearPhaseTimer();
  assert.equal(P.I.skillPoints, 3);
  assert.ok(P.E.statuses.slow > 0, 'E กลางกรอบ');
  assert.ok(P.R.statuses.slow > 0, 'R บนขอบ');
  assert.equal(P.Z.statuses.slow, undefined);
  assert.equal(P.I.statuses.slow, undefined);
  assert.equal(terrainAt(6, 5), 'icespike1', 'นอกกรอบไม่ขึ้น');
  assert.equal(terrainAt(8, 11), 'icespike2', 'ในกรอบ +1 Lv');
  assert.equal(engine.board.prisons.length, 1);
  assert.equal(engine.action.locked, true, 'หลังเดินเท่านั้น = ล็อกการเดิน');
  // ต้นตาเดินถัดไป
  engine.setRoundNumber(engine.roundNumber + 1);
  P.I.skillPoints = 8;
  engine.setActor('I');
  P.E.pos = { x: 12, y: 2 };
  ice.onActorStart(engine, P.I);
  assert.equal(engine.board.prisons.length, 0);
  for (const [x, y] of [[5, 8], [6, 9], [7, 10]]) assert.equal(engine.boardMap().special[`${x},${y}`], 'ice');
  assert.equal(terrainAt(4, 7), 'icespike1');
  assert.equal(terrainAt(4, 9), 'pillar', 'สิ่งกีดขวางเว้นไว้');
  assert.equal(terrainAt(8, 11), 'icespike3', 'หนามเดิมบนขอบ +1 Lv');
  // R ที่ขอบบน (6,7) ถูกผลักลง (6,8) น้ำแข็ง → ไถลไป (6,10) → ชนหนามขอบล่าง (6,11) Lv1
  assert.deepEqual(P.R.pos, { x: 6, y: 10 });
  assert.equal(vit(P.R), 10 - 1);
  assert.equal(terrainAt(6, 11), undefined, 'หนาม Lv1 ที่โดนชนแตก');
  assert.equal(terrainAt(6, 7), 'icespike1', 'ช่องที่ R ถูกผลักออก = หนาม');
  engine.useSkill('I', 'ultimate', [], { tile: { x: 1, y: 3 } });
  assert.equal(P.I.skillPoints, 8, 'คูลดาวน์');
  assert.ok(fxEvents().some((e) => e.kind === 'prison'));
});

test('ระยะเดิน/แผนที่ฝั่ง client: state.board ส่งน้ำแข็ง/หนาม/คุก · หนามเป็นสิ่งกีดขวาง', () => {
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
