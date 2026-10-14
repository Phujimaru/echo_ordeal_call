// ความเสถียรของ engine กลาง: ฮุค broadcast + กัน error · ตายซ้ำ · คำสาปฆ่าผู้ใช้กลางสกิล · ตายตอนต้นเทิร์น
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const match = require('../server/match.js');
const draw = require('../server/phases/draw.js');
const CHAR_HOOKS = require('../characters/index.js');

// 'dummy' = ตัวละครสมมติไม่มีฮุค · chars[i] = ตัวละครจริงของ p<i>
function setup(n = 3, chars = []) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  for (let i = 0; i < n; i++) {
    engine.players['p' + i] = {
      id: 'p' + i, name: 'P' + i, position: i + 1, characterId: chars[i] || 'dummy', alive: true, connected: true,
      cards: [], statuses: {}, statusAmt: {}, seen: {}, cutsceneShown: {}, inventory: [], teamId: null,
    };
  }
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  const spots = [{ x: 7, y: 9 }, { x: 7, y: 8 }, { x: 8, y: 9 }, { x: 6, y: 9 }];
  Object.values(engine.players).forEach((p, i) => { p.pos = { ...spots[i] }; p.statuses = {}; p.statusAmt = {}; });
  return engine.players;
}
// เก็บ console.error ระหว่าง fn (ฮุคที่โยน error ถูก log แทนการระเบิด)
function captureErrors(fn) {
  const real = console.error;
  const lines = [];
  console.error = (...a) => { lines.push(a.map(String).join(' ')); };
  try { fn(); } finally { console.error = real; }
  return lines;
}

test.after(() => { engine.clearPhaseTimer(); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.afterEach(() => { engine.clearPhaseTimer(); });

test('CHAR_HOOKS.MODULES: ลำดับ broadcast เดิม (โอเบรอนก่อนมุยมิ · โซระก่อน Echo) และไม่โผล่ในแผนที่ id', () => {
  const ids = CHAR_HOOKS.MODULES.map((m) => m.id);
  assert.ok(ids.indexOf('oberon_summer') < ids.indexOf('muimi'));
  assert.ok(ids.indexOf('sora_otosumi') < ids.indexOf('echo'));
  assert.ok(ids.indexOf('echo') < ids.indexOf('raido_hikaru'));
  assert.ok(!Object.keys(CHAR_HOOKS).includes('MODULES'));
  for (const id of ids) assert.equal(CHAR_HOOKS[id].id, id);
});

test('ฮุค onEndTurn ที่โยน error: ตัวถัดไปยังทำงาน · จบเทิร์นต่อจนตั้งตัวจับเวลา (แมตช์ไม่ค้าง)', () => {
  setup(3);
  const ob = CHAR_HOOKS.oberon_summer;
  const hk = CHAR_HOOKS.raido_hikaru;
  const saved = { ob: ob.onEndTurn, hk: hk.onEndTurn };
  let hkCalled = 0;
  ob.onEndTurn = () => { throw new Error('boom'); };
  hk.onEndTurn = function (...a) { hkCalled++; return saved.hk.apply(this, a); };
  try {
    const errs = captureErrors(() => engine.endTurn());
    assert.equal(hkCalled, 1, 'ฮุคตัวถัดไปต้องถูกเรียก');
    assert.ok(errs.some((l) => l.includes('oberon_summer.onEndTurn')), 'log ชื่อตัวละคร + ชื่อฮุค');
    assert.equal(engine.gameState, 'TRANSITION');
    assert.ok(match.phaseTimerId, 'ต้องมีตัวจับเวลาไปเทิร์นถัดไป');
  } finally {
    ob.onEndTurn = saved.ob; hk.onEndTurn = saved.hk;
  }
});

test('ฮุค onRoundStartTick ที่โยน error: แจกรอบต่อจนเข้าช่วงจั่วไพ่', () => {
  setup(3);
  const echo = CHAR_HOOKS.echo;
  const saved = echo.onRoundStartTick;
  echo.onRoundStartTick = () => { throw new Error('boom'); };
  try {
    const errs = captureErrors(() => draw.dealRound());
    assert.ok(errs.some((l) => l.includes('echo.onRoundStartTick')));
    assert.equal(engine.gameState, 'PLAYING');
    for (const p of Object.values(engine.players)) assert.equal(p.cards.length, 1);
  } finally {
    echo.onRoundStartTick = saved;
  }
});

test('instantDeath ซ้ำกับคนที่ตายแล้ว = ไม่ทำอะไร (Echo นับการสังหารครั้งเดียว)', () => {
  const { p0, p1 } = setup(3, ['echo']);
  engine.withEffectSource(p0, () => { engine.instantDeath(p1); engine.instantDeath(p1); });
  assert.equal(p1.alive, false);
  assert.equal(p0.echo.kills, 1);
});

test('คำสาปกินผู้ใช้จนตายกลางสกิล: ไม่ระเบิด · สกิลไม่ลงผล (โอเบรอน นกจาบยามเช้าใส่ตัวเอง)', () => {
  const { p0 } = setup(3, ['oberon_summer']);
  engine.setActor('p0');
  p0.skillPoints = 8; p0.hp = 1; p0.armor = 0; p0.shield = 0; p0.tempHp = 0;
  p0.statuses.curse = 2;
  assert.doesNotThrow(() => engine.useSkill('p0', 'secondary', ['p0']));
  assert.equal(p0.alive, false);
  assert.equal(p0.obsLarkRound, 0, 'ฮุคสกิลต้องไม่ถูกเรียก');
  assert.equal(p0.statuses.obsLark, undefined);
});

test('ตายจากผลต้นเทิร์น (ฮุคตัวละคร): ไม่ได้ฟื้นเกราะ/ตื่นขึ้น · ไม่ได้ไพ่ · ล็อก · หายจากกระดาน', () => {
  const { p0, p1 } = setup(3);
  engine.setRoundNumber(1); // แจกรอบ = เทิร์น 2 (เกราะฟื้น)
  // นกจาบยามเช้า (โอเบรอน) ลงผลต้นเทิร์นกับใครก็ได้ที่ติด obsLark
  p0.hp = 2; p0.armor = 0; p0.shield = 0; p0.tempHp = 0;
  p0.statuses.obsLark = 1; p0.statuses.awaken = 2;
  p1.armor = 0; // คนรอด: เกราะฟื้นตามปกติ (ยืนยันว่าเทิร์นนี้เป็นเทิร์นฟื้นเกราะจริง)
  draw.dealRound();
  assert.equal(p0.alive, false);
  assert.equal(p0.hp, 0, 'ตื่นขึ้นต้องไม่ฟื้นพลังชีวิตให้คนตาย');
  assert.equal(p0.armor, 0, 'คนตายต้องไม่ฟื้นเกราะ');
  assert.deepEqual(p0.cards, []);
  assert.equal(p0.locked, true);
  assert.equal(p0.pos, null);
  assert.equal(p1.armor, 1);
  assert.equal(p1.cards.length, 1);
  assert.equal(engine.gameState, 'PLAYING');
});

test('ตายจากลุกไหม้ตอนต้นเทิร์น: ไม่ได้ไพ่ · ล็อก · หายจากกระดาน', () => {
  const { p0 } = setup(3);
  engine.setRoundNumber(2); // แจกรอบ = เทิร์น 3 (เกราะไม่ฟื้นก่อนลุกไหม้)
  p0.hp = 1; p0.armor = 0; p0.shield = 0; p0.tempHp = 0;
  p0.statuses.hburn = 1;
  draw.dealRound();
  assert.equal(p0.alive, false);
  assert.deepEqual(p0.cards, []);
  assert.equal(p0.locked, true);
  assert.equal(p0.pos, null);
});

test('ผลต้นเทิร์นฆ่าศัตรูคนสุดท้าย = จบเกมทันที', () => {
  const { p0, p1 } = setup(2);
  engine.setRoundNumber(2); // แจกรอบ = เทิร์น 3 (เกราะไม่ฟื้นก่อนลุกไหม้)
  p0.hp = 1; p0.armor = 0; p0.shield = 0; p0.tempHp = 0;
  p0.statuses.hburn = 1;
  draw.dealRound();
  assert.equal(p0.alive, false);
  assert.equal(p1.alive, true);
  assert.equal(engine.gameState, 'GAMEOVER');
  assert.equal(match.phaseTimerId, null);
});

test('มุยมิที่ตกรอบ: ดาบสะบั้นหมดเวลาไม่ตั้งคูลดาวน์/ไม่ log', () => {
  const { p0 } = setup(3, ['muimi']);
  p0.statuses.muimiTower = 1;
  engine.instantDeath(p0);
  const lockBefore = p0.muimiUltLock;
  match.lastLog = [];
  engine.endTurn();
  assert.equal(p0.statuses.muimiTower, undefined);
  assert.equal(p0.muimiUltLock, lockBefore);
  assert.ok(!match.lastLog.some((l) => l.includes('ดาบสะบั้นหมดเวลา')));
});
