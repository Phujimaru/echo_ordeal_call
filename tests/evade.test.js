// หลบหลีก (evade, สถานะ Universal): หลบได้ตลอดเทิร์น · ไม่ซ้อนทับ · อยู่ 1 เทิร์น
//  - ทุกการโจมตีที่โดนในเทิร์นนั้นทอยหลบตาม % ทุกครั้ง ไม่มีอะไรถูกใช้หมด (แม่นยำยังเจาะได้)
//  - ได้ซ้ำขณะยังติด = รีเฟรชเป็น 1 เทิร์น ไม่บวกเพิ่ม · % ใช้ค่ามากสุด
//  - หมดอายุที่ลูปลดเทิร์นของ endTurn เหมือนบัฟ 1 เทิร์นตัวอื่น (ยาต้านสถานะ)
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const attack = require('../server/phases/attack.js');
const match = require('../server/match.js');
const Status = require('../characters/_universal_status.js');

const realRandom = Math.random;
const blank = (id, position) => ({
  id, name: id, position, characterId: 'dummy', alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId: null,
});
// ภูมิภาค II: (7,3) กับ (6,3) เป็นพื้นธรรมดา (ไม่มีช่องหลบมาทอยแทรก)
function setup() {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  engine.players.A = blank('A', 1);
  engine.players.B = blank('B', 2);
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.placeOnBoard(2);
  const pos = { A: { x: 7, y: 3 }, B: { x: 6, y: 3 } };
  for (const p of Object.values(engine.players)) {
    p.hp = 10; p.armor = 0; p.shield = 0; p.statuses = {}; p.statusAmt = {}; p.skillPoints = 5;
    p.pos = { ...pos[p.id] };
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

test('หลบได้ตลอดเทิร์น: โดนตีหลายครั้งในเทิร์นเดียว ทอยหลบทุกครั้ง · ไม่มีอะไรถูกใช้หมด', () => {
  const P = setup();
  engine.applyEvade(P.B, 50);
  Math.random = () => 0; // ทอยผ่าน 50% ทุกครั้ง
  for (let i = 0; i < 3; i++) {
    const r = attack.strike(P.A, P.B);
    assert.equal(r.dodge, true, `ครั้งที่ ${i + 1} ต้องหลบได้`);
  }
  assert.equal(P.B.hp, 10);
  assert.equal(P.B.statuses.evade, 1, 'ถูกเลือกโจมตีแล้วหลบหลีกต้องยังอยู่');
  assert.equal(P.B.statusAmt.evade, 50);

  Math.random = () => 0.99; // ทอยไม่ผ่าน → โดน แต่สถานะยังอยู่
  assert.equal(attack.strike(P.A, P.B).dodge, false);
  assert.equal(attack.strike(P.A, P.B, { counter: true }).dodge, false);
  assert.ok(P.B.hp < 10);
  assert.equal(P.B.statuses.evade, 1);

  Math.random = () => 0; // ยังหลบได้อีกในเทิร์นเดียวกัน
  assert.equal(attack.strike(P.A, P.B).dodge, true);
  // สกิลที่ตีด้วยพลังโจมตีก็ทอยทุกครั้งเหมือนกัน
  assert.equal(engine.skillStrike(P.A, P.B, 'คลื่นดาบ').dodge, true);
  assert.equal(engine.skillStrike(P.A, P.B, 'คลื่นดาบ').dodge, true);
  assert.equal(P.B.statuses.evade, 1);
  assert.equal(P.B.statusAmt.evade, 50);
  // log ไม่มีตัวนับ "เหลือหลบหลีกอีก N ครั้ง" แล้ว
  assert.ok(!JSON.stringify(match.lastLog).includes('เหลือหลบหลีกอีก'));
});

test('แม่นยำยังเจาะหลบหลีกได้ · และไม่ทำให้หลบหลีกหายไป', () => {
  const P = setup();
  engine.applyEvade(P.B); // ไม่ระบุ = 100%
  P.A.statuses.accurate = 1;
  Math.random = () => 0;
  assert.equal(attack.strike(P.A, P.B).dodge, false);
  assert.equal(engine.skillStrike(P.A, P.B, 'คลื่นดาบ').dodge, false);
  assert.equal(P.B.statuses.evade, 1);
  assert.equal(P.B.statusAmt.evade, 100);
});

test('ไม่ซ้อนทับ: ได้ซ้ำ = รีเฟรชเป็น 1 เทิร์น · % ใช้ค่ามากสุด', () => {
  const p = { statuses: {}, statusAmt: {} };
  assert.equal(Status.applyEvade(p, 50), 50);
  assert.deepEqual([p.statuses.evade, p.statusAmt.evade], [1, 50]);
  // % ต่ำกว่า: เทิร์นรีเฟรช แต่ % คงค่าเดิม
  Status.applyEvade(p, 30);
  assert.deepEqual([p.statuses.evade, p.statusAmt.evade], [1, 50]);
  // % สูงกว่า: ใช้ค่าสูงกว่า
  Status.applyEvade(p, 80);
  assert.deepEqual([p.statuses.evade, p.statusAmt.evade], [1, 80]);
  // ไม่ระบุ % = 100
  Status.applyEvade(p);
  assert.deepEqual([p.statuses.evade, p.statusAmt.evade], [1, 100]);
  // ผู้ให้ส่งมากี่เทิร์นก็ได้ 1 เทิร์นเสมอ (applyBuff ส่งต่อให้ applyEvade)
  const q = { statuses: {}, statusAmt: {} };
  Status.applyBuff(q, 'evade', 40, 3);
  Status.applyBuff(q, 'evade', 20, 2);
  assert.deepEqual([q.statuses.evade, q.statusAmt.evade], [1, 40]);
  // หมดไปแล้วได้ใหม่ = เริ่มจาก % ใหม่ ไม่จำค่าเก่า
  delete q.statuses.evade;
  Status.applyEvade(q, 25);
  assert.deepEqual([q.statuses.evade, q.statusAmt.evade], [1, 25]);
  // ปาดบัฟล่าสุดได้ตามปกติ
  assert.equal(Status.stripLatestBuff(q).key, 'evade');
  assert.equal(q.statuses.evade, undefined);
  assert.equal(q.statusAmt.evade, undefined);
});

test('อยู่ 1 เทิร์น: หมดอายุตอนจบเทิร์นที่ได้รับ พร้อมล้าง % (แบบเดียวกับยาต้านสถานะ 1 เทิร์น)', () => {
  const P = setup();
  engine.applyEvade(P.B, 60);
  P.B.statuses.resist = 1; // เทียบกับบัฟ 1 เทิร์นตัวอื่น
  Math.random = () => 0;
  assert.equal(attack.strike(P.A, P.B).dodge, true);
  Math.random = realRandom;
  engine.endTurn(); engine.clearPhaseTimer();
  assert.equal(P.B.statuses.evade, undefined, 'หลบหลีกหมดอายุหลังจบเทิร์น');
  assert.equal(P.B.statusAmt.evade, undefined, 'ล้าง % ไปด้วย');
  assert.equal(P.B.statuses.resist, undefined, 'หมดพร้อมบัฟ 1 เทิร์นตัวอื่น');
  // หมดแล้วตีโดนแน่นอน
  Math.random = () => 0;
  assert.equal(attack.strike(P.A, P.B).dodge, false);
  assert.equal(attack.estimateHitOn(P.A, P.B), 100);
});

test('หลบหลีกไม่อยู่ในรายการสถานะที่ไม่ลดเทิร์นแล้ว', () => {
  assert.equal(Status.NO_TICK_STATUS.has('evade'), false);
  assert.equal(Status.EVADE_TURNS, 1);
});
