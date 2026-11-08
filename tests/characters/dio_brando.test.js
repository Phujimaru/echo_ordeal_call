// ดิโอ บรันโด (dio_brando) — Time Meter / BloodStack / Stand / Za warudo / ร่างหยุดเวลา / Road Roller / Last Stand
//  กติกา: GRID_PLAN.md §7.26 (ผู้ใช้ตัดสิน 2026-11-05) · ระบบกลางหยุดเวลา server/timeStop.js
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const dio = require('../../characters/dio_brando.js');
const diego = require('../../characters/diego_alt.js');
const { CHAR_BY_ID } = require('../../characters.js');

const realRandom = Math.random;
const real = {};
const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
function setup(list, { round = 2, shift = 0, mode = 'ffa' } = {}) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, ch, , , team], i) => { engine.players[id] = blank(id, ch, i + 1, team || null); });
  engine.setGameMode(mode);
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setJourneyArea(1);
  engine.setCycleShift(shift);
  engine.setShopPos(null);
  engine.setRoundNumber(round);
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.skillPoints = 8; p.skillUsedRound = false; p.shield = 0;
    p.statuses = {}; p.statusAmt = {};
  }
  return list.map(([id]) => engine.players[id]);
}
// เล่นฉากต่อเนื่อง (ตัวจับเวลา) ให้จบ: เรียกจริงผ่าน startPhaseTimer ที่ดักไว้
let pending = null;
function flush(max = 40) {
  for (let i = 0; i < max && pending; i++) { const fn = pending; pending = null; fn(); }
}

test.before(() => {
  real.start = engine.startPhaseTimer;
});
test.beforeEach(() => { Math.random = () => 0.99; pending = null; });
test.afterEach(() => { Math.random = realRandom; engine.clearPhaseTimer(); });

test('ข้อมูลตัวละคร: เลือด 9 เกราะ 0 ระยะ 1–2 กลาง unique', () => {
  const ch = CHAR_BY_ID.dio_brando;
  assert.equal(ch.difficulty, 'medium');
  assert.equal(ch.unique, true);
  assert.deepEqual(ch.range, [1, 2]);
  const [p] = setup([['d', 'dio_brando', 3, 7]]);
  assert.equal(p.hp, 9);
  assert.equal(p.armor, 0);
  assert.equal(p.dio.meter, 0);
});

test('ตีปกติโดน: ดาเมจ 1 ไม่ตี 2 · ฟื้น 1 + BloodStack + Time Meter', () => {
  const [d, t] = setup([['d', 'dio_brando', 3, 7], ['t', 'dummy', 5, 7]]);
  d.hp = 5; t.hp = 7; t.armor = 3;
  engine.setActor('d');
  engine.attackTarget('d', 't');
  assert.equal(t.armor, 2, 'ตีปกติ 1 เท่านั้น');
  assert.equal(t.hp, 7, 'ดูดเลือดไม่มีดาเมจเพิ่ม');
  assert.equal(d.hp, 6);
  assert.equal(d.dio.blood, 1);
  engine.clearPhaseTimer();
});

test('มีด: แนวตรงเท่านั้น ระยะ 4 ไม่ทะลุสิ่งกีดขวาง · คูลดาวน์ 3 · ไม่เสียแต้มเมื่อนอกระยะ', () => {
  const [d, t, u] = setup([['d', 'dio_brando', 3, 7], ['t', 'dummy', 7, 7], ['u', 'dummy', 4, 8]]);
  engine.setActor('d');
  engine.useSkill('d', 'basic', ['u']);
  assert.equal(d.skillPoints, 8, 'แนวทแยง = กดไม่ได้');
  engine.useSkill('d', 'basic', ['t']);
  assert.equal(d.skillPoints, 6);
  assert.ok(t.statuses.hbleed > 0);
  assert.equal(d.dio.meter, 1);
  assert.equal(d.dio.knifeReady, engine.roundNumber + 3);
  engine.clearPhaseTimer();
  const board = engine.boardMap();
  board.terrain[`${5},${7}`] = 'rock';
  assert.equal(dio.skillArea(d, 'basic', CHAR_BY_ID.dio_brando.basic.area).cells.some(([x, y]) => x === 2 && y === 0), false);
  delete board.terrain[`${5},${7}`];
});

test('SHINEI! ทะลุเกราะ + ไร้เยียวยา · MUDA ลงเกราะ + ผุพัง · แบบละคูลดาวน์ 2', () => {
  const [d, t] = setup([['d', 'dio_brando', 3, 7], ['t', 'dummy', 5, 7]]);
  t.hp = 7; t.armor = 3; d.hp = 8;
  engine.setActor('d');
  engine.useSkill('d', 'secondary', [], { dir: 'right', form: 'shine' });
  assert.equal(t.armor, 3);
  assert.equal(t.hp, 5, 'SHINEI! 2 ทะลุเกราะ ไม่มีดาเมจเพิ่ม');
  assert.ok(t.statuses.nohealing > 0);
  assert.equal(d.skillPoints, 5);
  engine.clearPhaseTimer();
  engine.setRoundNumber(engine.roundNumber + 1);
  d.skillUsedRound = false; engine.setActor('d');
  engine.useSkill('d', 'secondary', [], { dir: 'right', form: 'shine' });
  assert.equal(d.skillPoints, 5, 'คูลดาวน์ 2');
  engine.useSkill('d', 'secondary', [], { dir: 'right', form: 'muda' });
  assert.equal(d.skillPoints, 2, 'อีกแบบใช้ได้');
  assert.equal(t.armor, 0);
  assert.ok(t.statuses.decay > 0);
});

test('BloodStack 6: Time Meter จุ 8 + คูลดาวน์ 3 · BloodStack 8: สกิล +1 · ดูด 2 (จาก BloodStack 4)', () => {
  const [d, t] = setup([['d', 'dio_brando', 3, 7], ['t', 'dummy', 5, 7]]);
  d.dio.blood = 8; d.dio.clip6 = true; d.hp = 3; t.hp = 7; t.armor = 0;
  engine.setActor('d');
  engine.useSkill('d', 'secondary', [], { dir: 'right', form: 'muda' });
  assert.equal(t.hp, 3, '3+1 ไม่มีดาเมจเพิ่ม');
  assert.equal(d.hp, 5);
  assert.equal(d.dio.blood, 9);
  engine.clearPhaseTimer();
  d.dio.meter = 8;
  assert.equal(engine.players.d.dio.meter, 8);
  const s = dio.dioState(engine, d);
  assert.equal(s.meterMax, 8);
});

test('กลางวันโดน +1 · กลางคืนต้าน 1', () => {
  const [d] = setup([['d', 'dio_brando', 3, 7]]);
  engine.setCycleShift(0);
  const day = engine.isNightRound(engine.worldRound);
  assert.equal(dio.adjustIncomingDamage(engine, d, 2), day ? 1 : 3);
  engine.setRoundNumber(1);
  assert.equal(dio.adjustIncomingDamage(engine, d, 2), 3);
});

test('ดาเมจต่อเทิร์น (DoT) ต้นเทิร์นไม่โดนกลางวัน +1 / กลางคืน −1', () => {
  const [d] = setup([['d', 'dio_brando', 3, 7]]);
  const match = require('../../server/match');
  engine.setRoundNumber(1);
  d.hp = 9;
  engine.applyBleed(d, 1);
  match.dotTick = true;
  try { require('../../characters/_universal_status').tickBleed(engine, d); } finally { match.dotTick = false; }
  assert.equal(d.hp, 8, 'เลือดไหล 1 ไม่ +1 กลางวัน');
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '../../server/phases/draw.js'), 'utf8');
  const on = src.indexOf('match.dotTick = true'), off = src.indexOf('match.dotTick = false');
  assert.ok(on > 0 && on < src.indexOf('tickBleed(engine, p)') && src.indexOf('tickPoison(engine, p)') < off, 'ต้นเทิร์นห่อ DoT ทั้งหมด');
});

test('BloodStack 4 ขึ้นไป: ดูดเลือดฟื้น 2 · ต่ำกว่า 4 ฟื้น 1 · ดาเมจสกิลยังไม่ +1', () => {
  for (const [blood, heal] of [[3, 1], [4, 2]]) {
    const [d, t] = setup([['d', 'dio_brando', 3, 7], ['t', 'dummy', 5, 7]]);
    d.dio.blood = blood; d.hp = 3; t.hp = 7; t.armor = 0;
    engine.setActor('d');
    engine.useSkill('d', 'secondary', [], { dir: 'right', form: 'shine' });
    assert.equal(d.hp, 3 + heal, `BloodStack ${blood}`);
    assert.equal(t.hp, 5, 'SHINEI! 2 ไม่มีโบนัส');
    engine.clearPhaseTimer();
  }
});

test('กด Za warudo ปกติ: ใช้ Meter ทั้งหมด · ต้นเทิร์นถัดไปได้ตาหยุดเวลา · จบ Action แล้วเวลาเดินต่อ ดาเมจลงพร้อมกัน', () => {
  const [d, t] = setup([['d', 'dio_brando', 3, 7], ['t', 'dummy', 5, 7]]);
  d.dio.meter = 4; t.hp = 7; t.armor = 0;
  engine.setActor('d');
  engine.useSkill('d', 'ultimate', []);
  assert.equal(d.dio.meter, 0);
  assert.equal(d.dio.pending, 4);
  assert.equal(d.dio.worldReady, engine.roundNumber + 4);
  engine.setRoundNumber(engine.roundNumber + 1);
  dio.onOrderBegin(engine);
  // เริ่มตาพิเศษ
  engine.setGameState('ACTION');
  engine.timeStop.interrupt('d', 'dioWorld', 30);
  engine.clearPhaseTimer();
  assert.equal(d.dio.stopping, true);
  assert.equal(d.dio.actions, 4);
  assert.ok(engine.timeStop.frozen());
  engine.setGameState('ACTION');
  engine.useSkill('d', 'secondary', [], { dir: 'right', form: 'muda' });
  engine.clearPhaseTimer();
  assert.equal(t.hp, 4, 'ดาเมจจริงลงแล้ว (3)');
  assert.equal(engine.timeStop.frozen().held.t.hp, 7, 'ผู้ชมยังเห็นเลือดเดิม');
  assert.equal(d.dio.actions, 1, 'Stand 3 Action');
});

// เนิฟผู้ใช้ 2026-11-08: มีด 1 Action ได้ 2 ครั้งต่อการหยุดเวลา · Stand / Road Roller 3 Action · มีดไม่ได้ BloodStack
function enterStop(d, n) {
  d.dio.pending = n;
  d.dio.pendingRound = engine.roundNumber - 1;
  engine.setGameState('ACTION');
  engine.timeStop.interrupt('d', 'dioWorld', 30);
  engine.clearPhaseTimer();
  engine.setGameState('ACTION');
  assert.equal(d.dio.stopping, true);
  assert.equal(d.dio.actions, n);
}

test('ร่างหยุดเวลา: มีด 1 Action ใช้ได้ 2 ครั้ง · ครั้งที่ 3 กดไม่ได้ · หยุดเวลาครั้งใหม่นับใหม่', () => {
  const [d, t] = setup([['d', 'dio_brando', 3, 7], ['t', 'dummy', 7, 7]]);
  t.hp = 9; t.armor = 0;
  enterStop(d, 6);
  for (let i = 0; i < 2; i++) { engine.useSkill('d', 'basic', ['t']); engine.clearPhaseTimer(); engine.setGameState('ACTION'); }
  assert.equal(d.dio.actions, 4);
  assert.equal(d.dio.knives, 2);
  assert.equal(dio.skillLocks(engine, d).basic.locked, true);
  engine.useSkill('d', 'basic', ['t']);
  engine.clearPhaseTimer();
  assert.equal(d.dio.actions, 4, 'ครั้งที่ 3 ไม่ทำงาน ไม่เสีย Action');
  assert.equal(d.dio.knives, 2);
  assert.equal(d.dio.knifeReady, 0, 'มีดในร่างหยุดเวลาไม่ติดคูลดาวน์นอกร่าง');
  // หยุดเวลาครั้งใหม่ = มีดนับใหม่
  d.dio.stopping = false;
  engine.timeStop.unfreeze();
  enterStop(d, 2);
  assert.equal(d.dio.knives, 0);
  assert.equal(dio.skillLocks(engine, d).basic.locked, false);
});

test('ร่างหยุดเวลา: Stand ใช้ 3 Action · Action ไม่พอกดไม่ได้ · ป้ายบนปุ่มเป็น 3 Action', () => {
  const [d, t] = setup([['d', 'dio_brando', 3, 7], ['t', 'dummy', 5, 7]]);
  t.hp = 9; t.armor = 0;
  enterStop(d, 2);
  assert.equal(dio.skillLocks(engine, d).secondary.locked, true);
  const pub = dio.skillPub(d, 'secondary');
  assert.equal(pub.costLabel, '3 Action');
  assert.ok(pub.choices.every((c) => c.actions === 3 && c.cost === 0));
  engine.useSkill('d', 'secondary', [], { dir: 'right', form: 'shine' });
  engine.clearPhaseTimer();
  assert.equal(d.dio.actions, 2, 'Action ไม่พอ ไม่ทำงาน');
  assert.equal(t.hp, 9);
  d.dio.actions = 3;
  assert.equal(dio.skillLocks(engine, d).secondary.locked, false);
  engine.useSkill('d', 'secondary', [], { dir: 'right', form: 'shine' });
  engine.clearPhaseTimer();
  assert.equal(t.hp, 7);
  assert.equal(d.dio.actions, 0);
});

test('ร่างหยุดเวลา: Road Roller 3 Action · มี 2 กดไม่ได้', () => {
  const [d, t] = setup([['d', 'dio_brando', 3, 7], ['t', 'dummy', 5, 7]]);
  enterStop(d, 2);
  assert.equal(dio.skillLocks(engine, d).ultimate.locked, true);
  assert.equal(dio.skillPub(d, 'ultimate').costLabel, '3 Action');
  assert.equal(dio.canUseSkill(engine, d, 'ultimate', ['t']), false);
  d.dio.actions = 3;
  assert.equal(dio.canUseSkill(engine, d, 'ultimate', ['t']), true);
});

test('มีดไม่ได้ BloodStack (ทั้งนอกและในร่างหยุดเวลา) แต่ยังดูดเลือด', () => {
  const [d, t] = setup([['d', 'dio_brando', 3, 7], ['t', 'dummy', 7, 7]]);
  d.dio.blood = 5; d.hp = 3; t.hp = 9; t.armor = 0;
  engine.setActor('d');
  engine.useSkill('d', 'basic', ['t']);
  engine.clearPhaseTimer();
  assert.equal(t.hp, 8);
  assert.equal(d.dio.blood, 5, 'ไม่เพิ่ม');
  assert.equal(d.dio.clip6, false, 'ไม่ถึง 6 ไม่มีคลิป');
  assert.equal(d.hp, 5, 'BloodStack 4 ขึ้นไป ดูด 2');
  enterStop(d, 2);
  engine.useSkill('d', 'basic', ['t']);
  engine.clearPhaseTimer();
  assert.equal(d.dio.blood, 5);
});

test('แทรกตา: ใช้ Meter ทั้งหมด ได้ Action −1 · ต้องมีอย่างน้อย 2 · หลังจบกลับตาเดิมด้วยเวลาที่เหลือ', () => {
  const [d, a] = setup([['d', 'dio_brando', 3, 7], ['a', 'dummy', 9, 7]]);
  engine.setActor('a');
  d.dio.meter = 1;
  assert.equal(dio.dioState(engine, d).canInterrupt, false);
  d.dio.meter = 4;
  assert.equal(dio.dioState(engine, d).canInterrupt, true);
  assert.equal(dio.charAction(engine, d, 'dio:world'), true);
  engine.clearPhaseTimer();
  assert.equal(d.dio.stopping, true);
  assert.equal(d.dio.actions, 3);
  assert.equal(engine.actorId, 'd');
  assert.equal(engine.action.resume.actorId, 'a');
  engine.timeStop.frozen() || engine.timeStop.freeze('d');
  engine.setGameState('ACTION');
  engine.action.outro = false;
  engine.finishActor();
  engine.clearPhaseTimer();
  engine.finishActor();
  engine.clearPhaseTimer();
  assert.equal(engine.actorId, 'a', 'กลับตาเดิม');
  assert.equal(d.dio.stopping, false);
  assert.equal(engine.timeStop.frozen(), null);
});

test('หยุดเวลาซ้อน: ดิโอแทรกดิเอโก้ แล้วการหยุดเวลาของดิเอโก้ยังอยู่ · ดาเมจของดิโอลงตอนชั้นตัวเองจบ', () => {
  const [d, g, t] = setup([['d', 'dio_brando', 3, 7], ['g', 'diego_alt', 9, 7], ['t', 'dummy', 5, 7]]);
  t.hp = 7; t.armor = 0;
  engine.timeStop.freeze('g');
  assert.equal(engine.timeStop.frozen().by, 'g');
  engine.timeStop.freeze('d');
  assert.equal(engine.timeStop.frozen().by, 'd');
  t.hp = 2;
  const hits = engine.timeStop.unfreeze();
  assert.deepEqual(hits, [{ id: 't', dmg: 5, kill: false }]);
  assert.equal(engine.timeStop.frozen().by, 'g', 'ชั้นดิเอโก้ยังอยู่');
  assert.equal(engine.timeStop.frozen().held.t.hp, 2, 'ผู้ชมชั้นเดิมเห็นดาเมจของดิโอแล้ว');
  assert.deepEqual(engine.timeStop.unfreeze(), []);
  assert.equal(engine.timeStop.frozen(), null);
  assert.ok(diego);
});

test('Last Stand: ถูกตีถึงตาย = ไม่ตาย ได้ดวล · ใช้ครั้งเดียว · ไม่มีผู้โจมตี = ตายเลย', () => {
  const [d, t] = setup([['d', 'dio_brando', 3, 7], ['t', 'dummy', 5, 7]]);
  d.hp = 0;
  engine.withEffectSource(t, () => engine.instantDeath(d));
  assert.equal(d.alive, true);
  assert.equal(d.hp, 1);
  assert.equal(d.dio.lastUsed, true);
  assert.equal(d.dio.duelFoe, 't');

  const [e] = setup([['e', 'dio_brando', 3, 7]]);
  e.hp = 0;
  engine.instantDeath(e);
  assert.equal(e.alive, false, 'ไม่มีผู้โจมตี');
});

test('Last Stand: แต้มสูงกว่าโดยไม่แตกชนะ · เสมอ/แตกทั้งคู่ ดิโอชนะ', () => {
  const [d, t] = setup([['d', 'dio_brando', 3, 7], ['t', 'dummy', 5, 7]]);
  const card = (v) => ({ v, c: 'red' });
  const run = (a, b) => {
    d.dio.duel = { deck: [], dioId: 'd', foeId: 't', hands: { dio: a.map(card), foe: b.map(card) }, stood: { dio: true, foe: true }, winner: null };
    dio.duelResolveForTest(engine, d);
    const w = d.dio.duel.winner;
    d.dio.duel = null;
    engine.clearPhaseTimer();
    return w;
  };
  assert.equal(run([10, 9], [10, 8]), 'dio');
  assert.equal(run([10, 7], [10, 8]), 'foe');
  assert.equal(run([10, 8], [10, 8]), 'dio', 'เสมอ');
  assert.equal(run([10, 10, 5], [10, 8]), 'foe', 'ดิโอแตก');
  assert.equal(run([10, 10, 5], [10, 10, 2]), 'dio', 'แตกทั้งคู่');
  assert.equal(run([3], [10, 10, 2]), 'dio', 'ศัตรูแตก');
  assert.ok(t);
});

test('ดวล: เห็นเฉพาะมือตัวเอง · อีกฝ่ายและคนดูเห็นการ์ดคว่ำ · เปิดหมดเมื่อรู้ผล', () => {
  const [d] = setup([['d', 'dio_brando', 3, 7], ['t', 'dummy', 5, 7], ['c', 'dummy', 9, 7]]);
  const card = (v) => ({ v, c: 'red' });
  d.dio.duel = { deck: [], dioId: 'd', foeId: 't', hands: { dio: [card(9)], foe: [card(4), card(5)] }, stood: { dio: false, foe: false }, winner: null };
  const a = dio.duelView(engine, ['d']);
  assert.equal(a.side, 'dio');
  assert.equal(a.scores.dio, 9);
  assert.equal(a.scores.foe, null);
  assert.deepEqual(a.hands.foe, [{ hidden: true }, { hidden: true }]);
  const b = dio.duelView(engine, ['t']);
  assert.equal(b.side, 'foe');
  assert.deepEqual(b.hands.dio, [{ hidden: true }]);
  assert.equal(b.scores.foe, 9);
  const c = dio.duelView(engine, ['c']);
  assert.equal(c.side, null);
  assert.equal(JSON.stringify(c).includes('"v"'), false, 'คนดูไม่ได้หน้าการ์ดเลย');
  d.dio.duel.winner = 'foe';
  const e = dio.duelView(engine, ['c']);
  assert.equal(e.scores.dio, 9);
  assert.equal(e.hands.foe[1].v, 5);
  d.dio.duel = null;
  assert.equal(dio.duelView(engine, ['d']), null);
});

test('HUD ดิโออยู่ในจอคอม ไม่ใช่ส่วนจอมือถือ (ปุ่มแทรกตา/แถบ/จอดวล)', () => {
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '../../client/src/screens/Game.jsx'), 'utf8');
  const desktop = src.indexOf('const hudAway');
  assert.ok(desktop > 0);
  for (const tag of ['<DioGauge', '<DioInterrupt', '<LastStandDuel']) assert.ok(src.indexOf(tag) > desktop, tag);
});
