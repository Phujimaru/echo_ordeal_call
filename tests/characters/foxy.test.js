// ฟ็อกซี่ — กลางวันเดิน 3 ตี 5 / กลางคืนเดิน 9 ตี 3 · โดนตีก่อน (กลางวัน) = เสียตาเดิน · ท่าพุ่ง 7×1 · แต้มสมอง (GRID_PLAN §7.37)
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const fx = require('../../characters/foxy.js');
const { CHAR_BY_ID } = require('../../characters.js');
const Board = require('../../server/board');

const realRandom = Math.random;
const blank = (id, characterId, position) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId: null,
});
function setup(list) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, ch], i) => { engine.players[id] = blank(id, ch, i + 1); });
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setJourneyArea(1);
  engine.setCycleShift(0);
  engine.setRoundNumber(1);
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.shield = 0; p.statuses = {}; p.statusAmt = {};
  }
  return engine.players;
}
const vit = (p) => (p.hp || 0) + (p.armor || 0);
const flush = (t, ms = 20000) => { for (let i = 0; i < ms / 100; i++) t.mock.timers.tick(100); };
// เดินเวลาทีละ 100ms จนเงื่อนไขจริง (ไม่ให้ข้ามไปเทิร์นหน้า — ต้นเทิร์นฟื้นเกราะ/แต้มสกิล + สถานะลดเทิร์น)
const until = (t, cond, ms = 15000) => { for (let i = 0; i < ms / 100 && !cond(); i++) t.mock.timers.tick(100); assert.ok(cond(), 'until'); };

// แถวแนวนอนที่ว่างยาว n ช่อง (ไม่มีสิ่งกีดขวาง) → { x, y } ช่องซ้ายสุด
function clearRun(n) {
  const map = engine.boardMap();
  for (let y = 1; y < map.rows - 1; y++) {
    for (let x = 0; x + n <= map.cols; x++) {
      let ok = true;
      for (let i = 0; i < n && ok; i++) if (map.terrain[Board.key(x + i, y)]) ok = false;
      if (ok) return { x, y };
    }
  }
  throw new Error('no clear run');
}

const saved = { triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash, sfx: engine.sfx };
const log = [];
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = (p, key, only) => { log.push({ cut: key }); return saved.queueCutscene(p, key, only); }; // คิวจริง — ผลหลังคลิป (deferAfterCutscene) ต้องลงในเทิร์นเดียวกัน
  engine.skillFlash = () => {};
  engine.sfx = (key) => log.push({ sfx: key });
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.beforeEach(() => { log.length = 0; Math.random = () => 0.99; });
test.afterEach(() => { Math.random = realRandom; engine.setGameMode('ffa'); engine.setCycleShift(0); engine.setRoundNumber(1); engine.clearPhaseTimer(); });

test('ข้อมูล: เอาฮา · HP 10 เกราะ 5 · ตีประชิด · สกิลพื้นฐานพุ่ง 7×1 ราคา 2', () => {
  const ch = CHAR_BY_ID.foxy;
  assert.equal(ch.difficulty, 'fun');
  assert.deepEqual(ch.range, [1, 1]);
  assert.deepEqual(ch.basic.area, { kind: 'line', len: 7, width: 1, hostile: true });
  assert.equal(ch.basic.cost, 2);
  assert.equal(ch.secondary, null);
  assert.equal(ch.ultimate, null);
  const P = setup([['F', 'foxy', 3, 7]]);
  assert.equal(engine.maxHpOf(P.F), 10);
  assert.equal(engine.maxArmorOf(P.F), 5);
});

test('กลางวันเดิน 3 ตี 5 · กลางคืนเดิน 9 ตี 3', () => {
  const P = setup([['F', 'foxy', 3, 7], ['D', 'dummy', 4, 7]]);
  assert.equal(engine.movOf(P.F), 3);
  assert.equal(fx.attackBaseOverride(engine, P.F, P.D), 5);
  engine.setRoundNumber(4);
  assert.equal(engine.isNightRound(4), true);
  assert.equal(engine.movOf(P.F), 9);
  assert.equal(fx.attackBaseOverride(engine, P.F, P.D), 3);
});

test('กลางวัน: ศัตรูตีโดนก่อนฟ็อกซี่ได้เดิน = เสียตาเดิน · หลบได้/กลางคืน/เดินไปแล้ว = ไม่เสีย', () => {
  const P = setup([['F', 'foxy', 3, 7], ['D', 'dummy', 4, 7]]);
  engine.setActor('D');
  assert.equal(engine.hasActed('F'), false);
  engine.withEffectSource(P.D, () => engine.dealMixed(P.F, 1, false));
  assert.equal(fx.skipsTurn(engine, P.F), true, 'โดนก่อน → ข้ามตา');
  // ไม่โดนจริง (หลบ = ไม่มีดาเมจ) → ไม่เสีย
  P.F.foxy.skipRound = -1;
  assert.equal(fx.skipsTurn(engine, P.F), false);
  // กลางคืน → ไม่เสีย
  engine.setRoundNumber(4);
  engine.withEffectSource(P.D, () => engine.dealMixed(P.F, 1, false));
  assert.equal(fx.skipsTurn(engine, P.F), false, 'กลางคืนไม่มีโทษ');
  // ลบสกิลติดตัว → ไม่เสีย
  engine.setRoundNumber(1);
  P.F.statuses.noPassive = 2;
  engine.withEffectSource(P.D, () => engine.dealMixed(P.F, 1, false));
  assert.equal(fx.skipsTurn(engine, P.F), false, 'ลบสกิลติดตัว = ไม่มีโทษ');
});

test('กลางวัน: ฟ็อกซี่เดินไปแล้วในเทิร์นนั้น = โดนตีทีหลังไม่เสียตา', () => {
  const P = setup([['F', 'foxy', 3, 7], ['D', 'dummy', 4, 7]]);
  engine.setActor('D');
  const real = engine.hasActed;
  engine.hasActed = (id) => id === 'F';
  try {
    engine.withEffectSource(P.D, () => engine.dealMixed(P.F, 1, false));
  } finally { engine.hasActed = real; }
  assert.equal(fx.skipsTurn(engine, P.F), false);
});

test('พุ่งโดนศัตรูคนแรก: หยุดหน้าเป้า · ดาเมจเท่าพลังโจมตี · สมอง +1 · จบตา · คูลดาวน์ 1 เทิร์น', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] });
  setup([['F', 'foxy', 0, 0]]);
  const r = clearRun(8);
  const P = setup([['F', 'foxy', r.x, r.y], ['D', 'dummy', r.x + 4, r.y], ['E', 'dummy', r.x + 6, r.y]]);
  P.F.skillPoints = 8;
  const before = vit(P.D);
  engine.setActor('F');
  engine.useSkill('F', 'basic', [], { dir: 'right' });
  assert.deepEqual(P.F.pos, { x: r.x + 3, y: r.y }, 'หยุดหน้าเป้า');
  assert.equal(P.F.skillPoints, 6);
  const e0 = vit(P.E);
  until(t, () => vit(P.D) < before);
  assert.equal(before - vit(P.D), 5, 'กลางวันพลังโจมตี 5');
  assert.equal(vit(P.E), e0, 'โดนแค่คนแรก');
  assert.equal(P.F.foxy.brain, 1);
  assert.ok(log.some((e) => e.cut === fx.CUT.hit), 'คลิปตีปกติ');
  until(t, () => engine.actorId !== 'F');
  assert.notEqual(engine.actorId, 'F', 'จบตาเดิน');
  assert.equal(P.F.foxy.dashReady, engine.roundNumber + 2);
  engine.setActor('F');
  const sp = P.F.skillPoints;
  engine.useSkill('F', 'basic', [], { dir: 'left' });
  assert.equal(P.F.skillPoints, sp, 'ติดคูลดาวน์ — ไม่เสียแต้ม');
});

test('พุ่งไม่โดนใครแล้วชนสิ่งกีดขวาง = หยุดหน้าสิ่งกีดขวาง + สตั้นตัวเองเทิร์นหน้า', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] });
  setup([['F', 'foxy', 0, 0]]);
  const r = clearRun(8);
  const P = setup([['F', 'foxy', r.x, r.y]]);
  const map = engine.boardMap(), k = Board.key(r.x + 4, r.y);
  map.terrain[k] = 'rock';
  try {
    P.F.skillPoints = 8;
    engine.setActor('F');
    engine.useSkill('F', 'basic', [], { dir: 'right' });
    assert.deepEqual(P.F.pos, { x: r.x + 3, y: r.y });
    assert.equal(P.F.foxy.stunNext, true);
    engine.clearPhaseTimer();
    fx.onEndTurn(engine);
    assert.ok((P.F.statuses.stun || 0) > 0, 'สตั้นเทิร์นถัดไป (ใส่ตอนจบเทิร์น)');
    assert.equal(P.F.foxy.stunNext, false);
  } finally { delete map.terrain[k]; }
});

test('ชนเพื่อนร่วมทีม = หยุดหน้า ไม่สตั้น ไม่ได้สมอง', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] });
  setup([['F', 'foxy', 0, 0]]);
  const r = clearRun(8);
  const P = setup([['F', 'foxy', r.x, r.y], ['A', 'dummy', r.x + 3, r.y]]);
  engine.setGameMode('duo');
  P.F.teamId = 't1'; P.A.teamId = 't1';
  P.F.skillPoints = 8;
  const a0 = vit(P.A);
  engine.setActor('F');
  engine.useSkill('F', 'basic', [], { dir: 'right' });
  assert.deepEqual(P.F.pos, { x: r.x + 2, y: r.y });
  assert.equal(P.F.foxy.stunNext, false);
  assert.equal(P.F.foxy.brain, 0);
  assert.equal(vit(P.A), a0);
  flush(t);
});

test('เป้าหลบได้ = พุ่งผ่านต่อ · ชนขอบแผนที่ = สตั้น', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] });
  setup([['F', 'foxy', 0, 0]]);
  const map = engine.boardMap();
  // แถวที่ว่างตั้งแต่ x = cols-5 ถึงขอบขวา
  let row = -1;
  for (let y = 1; y < map.rows - 1 && row < 0; y++) {
    let ok = true;
    for (let x = map.cols - 5; x < map.cols; x++) if (map.terrain[Board.key(x, y)]) ok = false;
    if (ok) row = y;
  }
  assert.ok(row >= 0);
  const P = setup([['F', 'foxy', map.cols - 5, row], ['D', 'dummy', map.cols - 3, row]]);
  P.F.skillPoints = 8;
  Math.random = () => 0; // หลบได้แน่นอน (ทอยต่ำสุด)
  P.D.statuses.evade = 3; P.D.statusAmt.evade = 100;
  const d0 = vit(P.D);
  engine.setActor('F');
  engine.useSkill('F', 'basic', [], { dir: 'right' });
  assert.deepEqual(P.F.pos, { x: map.cols - 1, y: row }, 'พุ่งผ่านเป้าที่หลบไปถึงขอบ');
  assert.equal(P.F.foxy.stunNext, true, 'ชนขอบ = สตั้น');
  assert.equal(P.F.foxy.brain, 0);
  assert.equal(vit(P.D), d0);
  flush(t);
});

test('สมองเต็ม: ตีปกติ → สตั้นเป้า + ลบแต้มสกิล 3 · ขาด = ความเสียหายเพิ่ม · สมองกลับ 0', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] });
  const P = setup([['F', 'foxy', 3, 7], ['D', 'dummy', 4, 7]]);
  P.F.foxy.brain = 3;
  P.D.skillPoints = 1;
  const before = vit(P.D);
  const clips = [];
  const realClip = fx.preAttackClip;
  fx.preAttackClip = (...a) => { const k = realClip(...a); clips.push(k); return k; };
  t.after(() => { fx.preAttackClip = realClip; });
  engine.setActor('F');
  assert.equal(engine.attackTarget('F', 'D'), true);
  until(t, () => vit(P.D) < before);
  assert.equal(P.D.skillPoints, 0);
  assert.equal(before - vit(P.D), 5 + 2, 'พลังโจมตี 5 + ส่วนต่าง 2');
  assert.ok((P.D.statuses.stun || 0) > 0, 'เป้าสตั้น');
  assert.equal(P.F.foxy.brain, 0);
  assert.deepEqual(clips, [fx.CUT.brain], 'คลิปสมองเต็ม (ไม่ใช่คลิปตีธรรมดา)');
});

test('สมองเต็ม: พุ่งโดน = ใช้สมอง (ไม่ได้ +1)', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] });
  setup([['F', 'foxy', 0, 0]]);
  const r = clearRun(8);
  const P = setup([['F', 'foxy', r.x, r.y], ['D', 'dummy', r.x + 2, r.y]]);
  P.F.skillPoints = 8; P.F.foxy.brain = 3; P.D.skillPoints = 5;
  engine.setActor('F');
  const b0 = vit(P.D);
  engine.useSkill('F', 'basic', [], { dir: 'right' });
  until(t, () => vit(P.D) < b0);
  // ตอนดาเมจลง ตาเดินจบต่อทันที (endsTurn) → เป้าที่สตั้นถูกข้าม → จบเทิร์น (สถานะลด/แต้มฟื้น) ในจังหวะเดียวกัน — ตรวจจาก log
  const line = require('../../server/match').lastLog.find((m) => m.includes('สมองเต็ม'));
  assert.ok(line && line.includes('สตั้น') && line.includes('แต้มสกิล -3') && !line.includes('ความเสียหายเพิ่ม'), line);
  assert.equal(P.F.foxy.brain, 0);
});

test('เข้ากลางคืน: คลิปครั้งเดียวต่อการเปลี่ยน · Nautilus กลางคืนตั้งแต่ชั้น 6 · PVE กลางคืนตลอด', () => {
  const P = setup([['F', 'foxy', 3, 7]]);
  fx.onRoundDealt(engine);
  assert.equal(log.filter((e) => e.cut === fx.CUT.night).length, 0, 'กลางวันไม่มีคลิป');
  engine.setRoundNumber(4);
  fx.onRoundDealt(engine);
  fx.onRoundDealt(engine);
  assert.equal(log.filter((e) => e.cut === fx.CUT.night).length, 1, 'ครั้งเดียว');
  engine.setRoundNumber(7);
  fx.onRoundDealt(engine);
  engine.setRoundNumber(10);
  fx.onRoundDealt(engine);
  assert.equal(log.filter((e) => e.cut === fx.CUT.night).length, 2, 'ทุกครั้งที่เข้ากลางคืน');
  assert.ok(P.F);
});

test('เดินมีเสียงฝีเท้าทั้งกลางวัน/กลางคืน · ปุ่มกล่องเพลง 1 ครั้งต่อเทิร์น', () => {
  const P = setup([['F', 'foxy', 3, 7]]);
  fx.afterWalk(engine, P.F);
  fx.afterWalk(engine, P.F);
  assert.equal(log.filter((e) => e.sfx === fx.SFX.steps).length, 1);
  assert.equal(fx.charAction(engine, P.F, 'board'), true);
  assert.equal(fx.charAction(engine, P.F, 'board'), false);
  const acts = fx.hudActions(engine, P.F);
  assert.equal(acts.find((a) => a.key === 'brain').name, '0/3');
});

test('Nautilus: ชั้น 1–5 ตามวงจรกลางวัน/กลางคืน · ชั้น 6 กลางคืนถาวร · PVE กลางคืนตลอด', () => {
  const match = require('../../server/match');
  const P = setup([['F', 'foxy', 3, 7]]);
  const keep = { world: match.world, fodlan: match.fodlan };
  try {
    match.world = 'nautilus';
    match.fodlan = { stage: 11 };
    engine.setRoundNumber(1);
    assert.equal(fx.nightNow(engine), false, 'ชั้น 5 ช่วงกลางวันของวงจร = กลางวัน');
    assert.equal(engine.movOf(P.F), 3);
    engine.setRoundNumber(4);
    assert.equal(fx.nightNow(engine), true, 'ชั้น 1–5 ช่วงกลางคืนของวงจร = กลางคืน');
    fx.onRoundDealt(engine);
    assert.equal(log.filter((e) => e.cut === fx.CUT.night).length, 1, 'คลิปกลางคืนในชั้น 1–5');
    engine.setRoundNumber(7);
    fx.onRoundDealt(engine); // กลางวันของวงจร
    match.fodlan = { stage: 12 };
    engine.setRoundNumber(1);
    assert.equal(fx.nightNow(engine), true, 'ชั้น 6 = กลางคืนถาวร');
    assert.equal(engine.movOf(P.F), 9);
    fx.onRoundDealt(engine);
    assert.equal(log.filter((e) => e.cut === fx.CUT.night).length, 2, 'เข้าชั้น 6 (จากกลางวัน) = คลิปกลางคืน');
    engine.setRoundNumber(7); // วงจรเป็นกลางวัน แต่ชั้น 6 ยังกลางคืน
    assert.equal(fx.nightNow(engine), true, 'ชั้น 6 กลางคืนถาวร');
  } finally { match.world = keep.world; match.fodlan = keep.fodlan; }
  const M = require('../../server/pveMode');
  const real = M.isPveCoop;
  M.isPveCoop = () => true;
  try {
    engine.setRoundNumber(1);
    assert.equal(fx.nightNow(engine), true, 'PVE กลางคืนตลอด');
  } finally { M.isPveCoop = real; }
});
