// ห่วงเวลาซีโร่ (server/zeroTime.js · GRID_PLAN §8.2)
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const Zero = require('../server/zeroTime.js');
const match = require('../server/match.js');
const Board = require('../server/board.js');
const draw = require('../server/phases/draw.js');
const attack = require('../server/phases/attack.js');
const action = require('../server/phases/action.js');
const Ice = require('../server/ice.js');
const Journey = require('../characters/_journey.js');
const { SHOP_INTERVAL_TURNS } = require('../server/constants.js');

const realRandom = Math.random;
function withRandom(v, fn) {
  Math.random = () => v;
  try { return fn(); } finally { Math.random = realRandom; }
}
// 'dummy' = ตัวละครสมมติไม่มีฮุค · chars[i] = ตัวละครจริงของ p<i>
function setup(n = 3, chars = []) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  for (let i = 0; i < n; i++) {
    engine.players['p' + i] = {
      id: 'p' + i, name: 'P' + i, position: i + 1, characterId: chars[i] || 'dummy', alive: true, connected: true,
      cards: [], statuses: {}, statusAmt: {}, seen: {}, inventory: [], teamId: null,
    };
  }
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  return engine.players;
}
// เข้าห่วงเวลาตรงๆ ที่เทิร์น round (จบเทิร์นก่อนหน้าแล้ว) แล้วเริ่มเทิร์นแรกข้างใน
function enterAt(round = 9) {
  engine.setRoundNumber(round);
  Zero.enter();
  engine.clearPhaseTimer();
  if (match.zeroScene) match.zeroScene.active = false;
  draw.dealRound();
  engine.clearPhaseTimer();
}
// ปลดผนึกทันที (ผนึกแตกครบ · ไม่มีคนทุบ = ทุกคนโดนแรงปลดผนึก) แล้วข้ามฉาก
function releaseNow() {
  for (const s of match.zero.seals) s.broken = true;
  match.zero.pending.push({ i: 3, by: null });
  Zero.runPendingBreak(() => {});
  engine.clearPhaseTimer();
  match.zeroScene.active = false;
}
// คลิปตัวละคร = ไม่ตัดเข้า CUTSCENE (ผลลงทันที) — คืนฟังก์ชันคืนค่าเดิม
function stubCutscenes() {
  const saved = { queueCutscene: engine.queueCutscene, triggerCutscene: engine.triggerCutscene };
  engine.queueCutscene = () => {};
  engine.triggerCutscene = () => {};
  return () => Object.assign(engine, saved);
}
const vit = (p) => (p.hp || 0) + (p.armor || 0);

test.afterEach(() => { Math.random = realRandom; engine.clearPhaseTimer(); delete process.env.ECHO_DEV_ZERO; });
test.after(() => { engine.clearPhaseTimer(); Zero.reset(); for (const id of Object.keys(engine.players)) delete engine.players[id]; });

test('ปิดอยู่: ไม่เกิดเลยแม้ทอยผ่าน', () => {
  setup();
  engine.setRoundNumber(9);
  assert.equal(Zero.ZERO_ENABLED, false);
  assert.equal(withRandom(0, () => Zero.maybeEnter()), false);
  assert.ok(!Zero.active());
});

test('เกิด: เทิร์นถัดไปเป็นกลางคืนตั้งแต่เทิร์น 10 · 30% · ครั้งเดียวต่อเกม', (t) => {
  Zero.ZERO_ENABLED = true;
  t.after(() => { Zero.ZERO_ENABLED = false; });
  setup();
  engine.setRoundNumber(3); // ถัดไป = 4 กลางคืนแรก — ยังไม่ถึงเทิร์น 10
  assert.equal(withRandom(0, () => Zero.maybeEnter()), false);
  engine.setRoundNumber(8); // ถัดไป = 9 กลางวัน
  assert.equal(withRandom(0, () => Zero.maybeEnter()), false);
  engine.setRoundNumber(9); // ถัดไป = 10 กลางคืน
  assert.equal(withRandom(0.31, () => Zero.maybeEnter()), false, 'ทอยเกิน 30% = ไม่เกิด');
  assert.equal(withRandom(0.29, () => Zero.maybeEnter()), true);
  engine.clearPhaseTimer();
  assert.ok(Zero.active());
  assert.equal(match.gameState, 'CUTSCENE');
  assert.equal(match.zeroScene.mode, 'enter');
  assert.equal(match.board.area, Board.ZERO_AREA);
  assert.equal(match.shopPos, null, 'ร้านปิด');
  // ครั้งเดียวต่อเกม
  match.zero = null;
  assert.equal(withRandom(0, () => Zero.maybeEnter()), false);
});

test('ข้างใน: เวลาโลกหยุด · กลางวัน/กลางคืนและภูมิภาคไม่เดิน · ท่าไม้ตายล็อก · เกราะไม่ฟื้น', () => {
  const ps = setup();
  enterAt(9);
  assert.equal(engine.roundNumber, 10);
  assert.equal(Zero.worldRound(), 9, 'เวลาโลกค้างที่เทิร์นก่อนเข้า');
  draw.dealRound(); engine.clearPhaseTimer();
  draw.dealRound(); engine.clearPhaseTimer();
  assert.equal(Zero.worldRound(), 9);
  assert.equal(engine.buildStateFor('p0').players[0].skillLocks.ultimate.locked, true);
  const p = ps.p0;
  p.armor = 0;
  draw.dealRound(); engine.clearPhaseTimer(); // เทิร์นคู่ปกติเกราะฟื้น — ข้างในไม่ฟื้น
  draw.dealRound(); engine.clearPhaseTimer();
  assert.equal(p.armor, 0);
  assert.equal(engine.buildStateFor('p0').zero.stage, 1);
});

test('จบเทิร์น: แต้มสกิล +1 (เฟส 1) · ทุกคนเสีย 1 ลดเกราะก่อน', () => {
  const ps = setup();
  enterAt(9);
  const p = ps.p1;
  p.skillPoints = 0; p.armor = 1; p.hp = 5;
  const goldBefore = p.gold || 0;
  engine.endTurn(); engine.clearPhaseTimer();
  assert.equal(p.armor, 0, 'เสีย 1 ที่เกราะ');
  assert.equal(p.hp, 5);
  assert.equal(p.skillPoints, 2, 'จบเทิร์นปกติ +1 + ห่วงเวลา +1');
  assert.equal(p.gold, goldBefore + 1, 'เฟส 1 ยังไม่มีเหรียญเพิ่ม (ได้แค่ +1 ปกติ)');
});

test('ผนึก: เลือด 3 เกราะ 2 · ตีถึงตามระยะ · แตก = เฟสถัดไป (บัฟสะสม) · ตัวใหญ่ทับไม่แตก', () => {
  const ps = setup();
  enterAt(9);
  const p = ps.p0;
  // ยืนติดผนึกเหนือ (0,0)
  for (const o of Object.values(ps)) if (o !== p) o.pos = { x: 7, y: 7 + Number(o.id.slice(1)) };
  p.pos = { x: 1, y: 0 };
  engine.setActor('p0');
  const seal = match.zero.seals[0];
  assert.equal(seal.hp, 3); assert.equal(seal.armor, 2);
  assert.equal(engine.attackTarget('p0', 'seal:0'), true);
  engine.clearPhaseTimer();
  assert.equal(seal.armor, 1, 'ตี 1 = ลดเกราะก่อน');
  // ตีจนแตก (ข้ามฉาก)
  seal.armor = 0; seal.hp = 1;
  engine.setActor('p0');
  engine.attackTarget('p0', 'seal:0');
  engine.clearPhaseTimer();
  assert.equal(seal.broken, true);
  Zero.runPendingBreak(() => {});
  engine.clearPhaseTimer();
  assert.equal(Zero.stage(), 2);
  assert.equal(match.board.area, Board.ZERO_AREA + 1);
  assert.equal(match.zeroScene.mode, 'break');
  // เฟส 2: เหรียญ +1 เพิ่ม
  const g = ps.p2.gold || 0;
  engine.endTurn(); engine.clearPhaseTimer();
  assert.equal(ps.p2.gold, g + 2);
  // เฟส 3: พลังโจมตี +1 · เฟส 4: +2
  match.zero.seals[1].broken = true;
  const { computeAttackBase } = require('../server.js');
  assert.equal(computeAttackBase(engine, ps.p0, ps.p1).base, 2);
  match.zero.seals[2].broken = true;
  assert.equal(computeAttackBase(engine, ps.p0, ps.p1).base, 3);
  // ผนึกพังด้วยการทับไม่ได้
  assert.equal(Board.growPlan(Board.mapOf(Board.ZERO_AREA), { id: 'x', x: 0, y: 1, size: 1 }, 2, [], { smash: true }) !== null, true);
  const fit = Board.placeBig(Board.mapOf(Board.ZERO_AREA), 3, { x: 0, y: 0 }, [], { smash: true });
  assert.ok(Board.footprint(fit.x, fit.y, 3).every((t) => !(t.x === 0 && t.y === 0)), 'วางตัวใหญ่ไม่ทับผนึก');
});

test('ผนึกแตก: เปลี่ยนแค่หน้าตาสนาม — น้ำแข็ง/หนามน้ำแข็งที่วางไว้ในห่วงเวลายังอยู่ (แผนที่คิดใหม่)', () => {
  setup();
  enterAt(9);
  const map = action.boardMap();
  const free = [];
  for (let y = 2; y < map.rows && free.length < 2; y++) {
    for (let x = 2; x < map.cols && free.length < 2; x++) if (action.tileFree(x, y)) free.push({ x, y });
  }
  const [a, b] = free;
  assert.ok(Ice.layIce(a.x, a.y, 'p0'), 'วางน้ำแข็งได้');
  Ice.placeSpike(b.x, b.y, 'p0');
  assert.ok(Board.isIce(action.boardMap(), a.x, a.y));
  match.zero.seals[0].broken = true;
  match.zero.pending.push({ i: 0, by: 'p0' });
  Zero.runPendingBreak(() => {});
  engine.clearPhaseTimer();
  match.zeroScene.active = false;
  assert.equal(match.board.area, Board.ZERO_AREA + 1);
  assert.ok(Ice.iceAt(a.x, a.y), 'น้ำแข็งยังอยู่');
  assert.ok(Ice.spikeAt(b.x, b.y), 'หนามยังอยู่');
  const after = action.boardMap();
  assert.equal(after.area, Board.ZERO_AREA + 1, 'แผนที่ใช้ผังระดับใหม่');
  assert.ok(Board.isIce(after, a.x, a.y));
  assert.match(after.terrain[Board.key(b.x, b.y)], /^icespike/);
});

test('เฟส 4: ฟ้าผ่าต้นเทิร์น 3 จุด เสีย 2', () => {
  const ps = setup();
  enterAt(9);
  for (const i of [0, 1, 2]) match.zero.seals[i].broken = true;
  assert.equal(Zero.stage(), 4);
  // สุ่มให้ทุกจุดตกที่ช่องแรกของรายการ → ช่อง (1,0), (2,0), (3,0) ตามลำดับ (ตัดออกจากรายการทีละช่อง)
  ps.p0.pos = { x: 1, y: 0 }; ps.p0.armor = 0; ps.p0.hp = 7;
  ps.p1.pos = { x: 8, y: 8 }; ps.p2.pos = { x: 9, y: 9 };
  withRandom(0, () => Zero.onRoundStart());
  assert.equal(match.zero.bolt.tiles.length, 3);
  assert.equal(ps.p0.hp, 5, 'โดนฟ้าผ่า −2');
  assert.equal(ps.p1.hp, 7);
});

test('ปลดผนึก: กลับแผนที่/ตำแหน่งเดิม · ทุกคนเสีย 2 ยกเว้นคนทุบ · เวลาโลกเดินต่อจากที่หยุด', () => {
  const ps = setup();
  engine.setRoundNumber(9);
  const area = match.board.area;
  const before = Object.fromEntries(Object.values(ps).map((p) => [p.id, { ...p.pos }]));
  Zero.enter(); engine.clearPhaseTimer(); match.zeroScene.active = false;
  draw.dealRound(); engine.clearPhaseTimer();
  draw.dealRound(); engine.clearPhaseTimer();
  for (const i of [0, 1, 3]) match.zero.seals[i].broken = true;
  const p = ps.p0;
  for (const o of Object.values(ps)) if (o !== p) o.pos = { x: 7, y: 7 + Number(o.id.slice(1)) };
  p.pos = { x: 12, y: 13 };
  for (const o of Object.values(ps)) { o.hp = 7; o.armor = 0; }
  match.zero.seals[2].hp = 1; match.zero.seals[2].armor = 0;
  engine.setActor('p0');
  engine.attackTarget('p0', 'seal:2');
  engine.clearPhaseTimer();
  Zero.runPendingBreak(() => {});
  engine.clearPhaseTimer();
  assert.equal(Zero.active(), false);
  assert.equal(match.zeroScene.mode, 'release');
  assert.equal(match.board.area, area, 'กลับภูมิภาคเดิม');
  for (const o of Object.values(ps)) assert.deepEqual(o.pos, before[o.id], `${o.id} กลับตำแหน่งเดิม`);
  assert.equal(p.hp, 7, 'คนทุบไม่โดน');
  assert.equal(ps.p1.hp, 5);
  assert.equal(ps.p2.hp, 5);
  assert.equal(Zero.worldRound(), 9, 'เวลาโลกค้างที่เดิม');
  draw.dealRound(); engine.clearPhaseTimer();
  assert.equal(Zero.worldRound(), 10, 'ออกมาแล้วเดินต่อเป็นเทิร์นกลางคืนที่ถูกหยุดไว้');
  assert.equal(engine.isNightRound(Zero.worldRound()), true);
});

test('ของฟื้นพลังชีวิต: ต้นเทิร์นเกิด 1 ชิ้น · จบตาบนช่อง = เก็บ', () => {
  const ps = setup();
  enterAt(9);
  assert.equal(match.zero.pickups.length, 1);
  const q = match.zero.pickups[0];
  const p = ps.p0;
  p.hp = 3;
  p.pos = { x: q.x, y: q.y };
  Zero.collectPickup(p);
  assert.equal(p.hp, 3 + Zero.PICKUP_HEAL);
  assert.equal(match.zero.pickups.length, 0);
});

test('ท่าไม้ตายล็อก: useSkill ultimate ใช้ไม่ได้ระหว่างอยู่ในห่วงเวลา · ปลดผนึกแล้วใช้ได้', () => {
  const restore = stubCutscenes();
  try {
    const ps = setup(3, ['muimi']);
    enterAt(9);
    const m = ps.p0;
    for (const o of Object.values(ps)) if (o !== m) o.pos = { x: 7, y: 7 + Number(o.id.slice(1)) };
    m.pos = { x: 4, y: 6 }; m.skillPoints = 8; m.skillUsedRound = false; m.statuses = {}; m.statusAmt = {};
    engine.setActor('p0');
    engine.useSkill('p0', 'ultimate', [], { dir: 'right' });
    assert.equal(m.skillPoints, 8, 'แต้มไม่ลด');
    assert.equal(m.skillUsedRound, false);
    assert.equal(engine.action.locked, false, 'ยังเดินได้');
    // ควบคุม: ออกจากห่วงเวลาแล้วกดได้ตามปกติ
    releaseNow();
    m.skillPoints = 8; m.skillUsedRound = false;
    engine.setActor('p0');
    engine.useSkill('p0', 'ultimate', [], { dir: 'right' });
    assert.equal(m.skillPoints, 0);
  } finally { restore(); }
});

test('ผนึก: สกิลโจมตีพื้นที่ (Beam Magnum แนว 8×1) คลุมช่องผนึก = ลงผนึกเท่าพลังโจมตี · แตก = ฉากผนึกแตก', () => {
  const restore = stubCutscenes();
  try {
    const ps = setup(3, ['sliver_bullet']);
    enterAt(9);
    const s = ps.p0;
    for (const o of Object.values(ps)) if (o !== s) o.pos = { x: 7, y: 7 + Number(o.id.slice(1)) };
    s.pos = { x: 3, y: 0 }; s.statuses = {}; s.statusAmt = {};
    const fire = (dir) => {
      s.skillPoints = 8; s.skillUsedRound = false; s.sliver.arm = true;
      engine.setActor('p0');
      engine.useSkill('p0', 'secondary', [], { dir });
    };
    const dmg = attack.computeAttackBase(engine, s, Zero.sealUnit(0)).base;
    assert.ok(dmg > 0 && dmg < Zero.SEAL_HP + Zero.SEAL_ARMOR);
    const seal = match.zero.seals[0];
    fire('left'); // (2,0) (1,0) (0,0) = ผนึกเหนือ
    assert.equal(s.skillPoints, 4, 'ยิงจริง');
    assert.equal(vit(seal), Zero.SEAL_HP + Zero.SEAL_ARMOR - dmg);
    assert.equal(seal.armor, Math.max(0, Zero.SEAL_ARMOR - dmg), 'ลดเกราะก่อน');
    for (const i of [1, 2, 3]) assert.equal(vit(match.zero.seals[i]), Zero.SEAL_HP + Zero.SEAL_ARMOR, 'ผนึกอื่นไม่โดน');
    assert.equal(match.gameState, 'ACTION', 'ไม่แตก = ตาเดินต่อ');
    // ทิศที่ไม่คลุมผนึก = ไม่โดน
    const before = vit(seal);
    fire('down');
    assert.equal(s.skillPoints, 4);
    assert.equal(vit(seal), before);
    // แตกด้วยสกิล = ฉากผนึกแตก (สนามเปลี่ยนระดับ)
    seal.hp = 1; seal.armor = 0;
    fire('left');
    assert.equal(seal.broken, true);
    assert.equal(match.gameState, 'CUTSCENE');
    assert.equal(match.zeroScene.mode, 'break');
    assert.equal(Zero.stage(), 2);
    assert.equal(match.board.area, Board.ZERO_AREA + 1);
  } finally { restore(); }
});

test('การเดินทาง: ผลภูมิภาคปิดในห่วงเวลา (Journey.current = null) · ปลดผนึกแล้วกลับมา', () => {
  setup();
  engine.setRoundNumber(9);
  assert.ok(Journey.current(engine), 'ก่อนเข้ามีผลภูมิภาค');
  enterAt(9);
  assert.equal(Journey.current(engine), null);
  draw.dealRound(); engine.clearPhaseTimer();
  assert.equal(Journey.current(engine), null);
  releaseNow();
  const c = Journey.current(engine);
  assert.ok(c);
  assert.equal(c.area, engine.journeyArea);
  assert.equal(c.night, false, 'เวลาโลกยังเป็นเทิร์น 9 (กลางวัน)');
  draw.dealRound(); engine.clearPhaseTimer();
  assert.equal(Journey.current(engine).night, true, 'เทิร์น 10 ของเวลาโลก = กลางคืน');
});

test('การเดินทาง: ภูมิภาคไม่เปลี่ยนระหว่างอยู่ในห่วงเวลา แม้ผ่านหลายเทิร์น · ออกมาแล้วเปลี่ยนตามเวลาโลก', () => {
  const ps = setup();
  enterAt(10);
  const area = engine.journeyArea;
  const route = [...match.journeyRoute];
  const heal = () => { for (const o of Object.values(ps)) { o.hp = 7; o.armor = 0; } };
  for (let i = 0; i < 8; i++) { // roundNumber 11 → 19 (ผ่าน 12 และ 18 ที่ปกติจะเปลี่ยนภูมิภาค)
    heal();
    engine.endTurn(); engine.clearPhaseTimer();
    assert.equal(match.gameState, 'TRANSITION', `เทิร์น ${engine.roundNumber} ไม่มีฉากเดินทาง`);
    assert.equal(engine.journeyArea, area);
    draw.dealRound(); engine.clearPhaseTimer();
  }
  assert.equal(engine.roundNumber, 19);
  assert.equal(Zero.worldRound(), 10);
  assert.deepEqual(match.journeyRoute, route);
  releaseNow();
  // เวลาโลก 10 → 11 → 12: จบเทิร์น 12 ของเวลาโลก = เปลี่ยนภูมิภาค
  for (let i = 0; i < 2; i++) {
    heal();
    engine.endTurn(); engine.clearPhaseTimer();
    assert.equal(match.gameState, 'TRANSITION');
    draw.dealRound(); engine.clearPhaseTimer();
  }
  assert.equal(Zero.worldRound(), 12);
  heal();
  engine.endTurn(); engine.clearPhaseTimer();
  assert.equal(match.gameState, 'CUTSCENE');
  assert.equal(match.journeyScene.mode, 'advance');
  assert.notEqual(engine.journeyArea, area);
});

test('ร้านค้า: ปิดในห่วงเวลา (shopPos null) · ปลดผนึกแล้วกลับที่เดิม · เหลือกี่เทิร์นนับตามเวลาโลก', () => {
  setup();
  engine.setRoundNumber(8);
  match.shopPos = null; // บังคับให้ร้านปรากฏใหม่ที่เทิร์น 9
  draw.dealRound(); engine.clearPhaseTimer();
  const pos = { ...match.shopPos };
  const left = () => engine.buildStateFor('p0').shopTurnsLeft;
  assert.equal(match.shopOpenedRound, 9);
  assert.equal(left(), SHOP_INTERVAL_TURNS);
  Zero.enter(); engine.clearPhaseTimer(); match.zeroScene.active = false;
  assert.equal(match.shopPos, null);
  for (let i = 0; i < 4; i++) { draw.dealRound(); engine.clearPhaseTimer(); }
  assert.equal(match.shopPos, null, 'ร้านไม่ปรากฏระหว่างอยู่ข้างใน');
  assert.equal(left(), 0);
  releaseNow();
  assert.deepEqual(match.shopPos, pos, 'กลับมาที่เดิม');
  assert.equal(left(), SHOP_INTERVAL_TURNS, 'เวลาโลกไม่เดิน = เหลือเท่าเดิม');
  draw.dealRound(); engine.clearPhaseTimer();
  assert.deepEqual(match.shopPos, pos);
  assert.equal(left(), SHOP_INTERVAL_TURNS - 1);
});
