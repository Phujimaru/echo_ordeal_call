// รถบรรทุกเก่า (old_truck) — 3 ร่าง / ร่างที่แท้จริง / เปลี่ยนร่าง / ผู้พิทักษ์ตีสวน / คลื่นครึ่งวง / ไพร์ม บนกระดาน
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const ot = require('../../characters/old_truck.js');
const { CHAR_BY_ID } = require('../../characters.js');
const Board = require('../../server/board.js');

const realRandom = Math.random;
const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
// list = [[id, characterId, x, y, teamId?], ...] — แถว y = 6..8 ช่วง x = 3..6 ของภูมิภาค I เป็นพื้นโล่ง
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
  return engine.players;
}
const view = (viewerId, id) => engine.buildStateFor(viewerId).players.find((p) => p.id === id);
const vit = (p) => (p.hp || 0) + (p.armor || 0);
const flush = (t, ms = 6000) => { for (let i = 0; i < ms / 100; i++) t.mock.timers.tick(100); };
const toPrime = (P, id = 'T') => { P[id].oldTruck.form = 'prime'; };

const saved = {
  triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash,
  notifyTransform: engine.notifyTransform, sfx: engine.sfx, boardFx: engine.boardFx,
};
const calls = { fx: [], sfx: [], flash: [], queue: [] };
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = (p, key) => calls.queue.push(key);
  engine.skillFlash = (f) => calls.flash.push(f);
  engine.notifyTransform = () => {};
  engine.sfx = (s) => calls.sfx.push(s);
  engine.boardFx = (event, payload) => calls.fx.push({ event, payload });
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.beforeEach(() => { for (const k of Object.keys(calls)) calls[k] = []; Math.random = () => 0.99; });
test.afterEach(() => { Math.random = realRandom; engine.setGameMode('ffa'); engine.setCycleShift(0); engine.clearPhaseTimer(); });

test('ข้อมูล: ปานกลาง · เดิน 6 ตีประชิด · 0 / 4 / 6 แต้ม · ท่าไม้ตายครึ่งวงรัศมี 2 (สกิลโจมตี)', () => {
  const ch = CHAR_BY_ID.old_truck;
  assert.equal(ch.name, 'รถบรรทุกเก่า');
  assert.equal(ch.difficulty, 'medium');
  assert.equal(ch.mov, 6);
  assert.deepEqual(ch.range, [1, 1]);
  assert.equal(ch.basic.name, 'ร่างที่แท้จริง');
  assert.equal(ch.basic.cost, 0);
  assert.equal(ch.secondary.cost, 4);
  assert.equal(ch.ultimate.cost, 6);
  assert.equal(ch.ultimate.area.kind, 'line');
  assert.equal(ch.ultimate.area.arc, 2);
  assert.equal(ch.ultimate.area.hostile, true);
  const map = { cols: 16, rows: 16, terrain: [] };
  const tiles = Board.lineTiles(engine.boardMap(), 4, 8, 'up', 2, 5, 1, 2).map((c) => `${c.x},${c.y}`).sort();
  assert.deepEqual(tiles, ['2,8', '3,7', '3,8', '4,6', '4,7', '5,7', '5,8', '6,8'], 'ครึ่งวง 180° รัศมี 2 = 8 ช่อง รวมแถวข้างตัว');
  assert.ok(map);
});

test('ร่างรถบรรทุกเก่า: เดิน 6 · เห็นแค่ปุ่มร่างที่แท้จริง · ไม่มีสกิลติดตัว', () => {
  const P = setup([['T', 'old_truck', 4, 7], ['B', 'dummy', 12, 12]]);
  assert.equal(P.T.oldTruck.form, 'old');
  const me = view('T', 'T');
  assert.equal(me.character.name, 'รถบรรทุกเก่า');
  assert.equal(me.character.basic.name, 'ร่างที่แท้จริง');
  assert.equal(me.character.secondary, null, 'ไม่มีปุ่มสกิลรอง');
  assert.equal(me.character.ultimate, null, 'ไม่มีปุ่มท่าไม้ตาย');
  assert.equal(me.character.passive, null);
  assert.equal(engine.movOf(P.T), 6);
  engine.setActor('T');
  engine.useSkill('T', 'secondary', []);
  engine.useSkill('T', 'ultimate', [], { dir: 'up' });
  assert.equal(P.T.skillPoints, 8, 'ร่างอื่นใช้สกิลรอง/ท่าไม้ตายไม่ได้');
});

test('ร่างที่แท้จริง → รถบรรทุก (คลิปครั้งเดียว · ยังเดินได้) → เปลี่ยนร่าง ⇄ ออพติมัส 1 ครั้งต่อเทิร์น', () => {
  const P = setup([['T', 'old_truck', 4, 7], ['B', 'dummy', 12, 12]]);
  engine.setActor('T');
  engine.useSkill('T', 'basic', []);
  assert.equal(P.T.oldTruck.form, 'truck');
  assert.deepEqual(calls.queue, ['otTrueForm']);
  assert.equal(P.T.skillUsedRound, false, 'ไม่นับโควตาสกิล');
  assert.equal(engine.action.locked, false, 'ยังไม่เดิน = ยังเดินได้');
  assert.equal(engine.movOf(P.T), 5);
  let me = view('T', 'T');
  assert.equal(me.character.name, 'รถบรรทุก');
  assert.equal(me.img, ot.IMG.truck);
  assert.equal(me.character.basic.name, 'เปลี่ยนร่าง');
  assert.equal(me.character.basic.img, ot.IMG.toPrime);
  assert.equal(me.character.secondary, null);
  assert.equal(me.oldTruck.form, 'truck');
  // เปลี่ยนเป็นออพติมัสในเทิร์นเดียวกันได้ (ร่างที่แท้จริงไม่นับครั้งเปลี่ยนร่าง)
  engine.useSkill('T', 'basic', []);
  assert.equal(P.T.oldTruck.form, 'prime');
  assert.deepEqual(calls.queue, ['otTrueForm', 'otTransform']);
  assert.equal(engine.movOf(P.T), 4);
  me = view('T', 'T');
  assert.equal(me.character.name, 'ออพติมัส ไพร์ม');
  assert.equal(me.character.basic.img, ot.IMG.toTruck);
  assert.equal(me.character.secondary.name, 'ผู้พิทักษ์');
  assert.equal(me.character.ultimate.area.arc, 2);
  assert.equal(me.skillLocks.basic.locked, true, '1 ครั้งต่อเทิร์น');
  engine.useSkill('T', 'basic', []);
  assert.equal(P.T.oldTruck.form, 'prime', 'กดซ้ำในเทิร์นเดียวกันไม่ได้');
  // เทิร์นถัดไป กลับเป็นรถ — คลิปไม่เล่นซ้ำ มีแค่เสียง
  engine.setRoundNumber(engine.roundNumber + 1);
  engine.setActor('T');
  engine.useSkill('T', 'basic', []);
  assert.equal(P.T.oldTruck.form, 'truck');
  engine.setRoundNumber(engine.roundNumber + 1);
  engine.setActor('T');
  engine.useSkill('T', 'basic', []);
  assert.equal(P.T.oldTruck.form, 'prime');
  assert.deepEqual(calls.queue, ['otTrueForm', 'otTransform'], 'คลิปเล่นครั้งแรกต่อเกมเท่านั้น');
  assert.equal(ot.skillSound(P.T, 'basic'), 'ot_transform');
});

test('เปลี่ยนร่างหลังเดินแล้ว = ล็อกการเดิน', () => {
  const P = setup([['T', 'old_truck', 4, 7], ['B', 'dummy', 12, 12]]);
  P.T.oldTruck.form = 'truck';
  engine.setActor('T');
  engine.moveTo('T', 5, 7);
  engine.useSkill('T', 'basic', []);
  assert.equal(P.T.oldTruck.form, 'prime');
  assert.equal(engine.action.locked, true);
});

test('ออพติมัส: พลังโจมตี +1 · ฟันดาบ (ท่า/เสียง) · ร่างรถตีเป็นพุ่งชน', () => {
  const P = setup([['T', 'old_truck', 4, 7], ['B', 'dummy', 5, 7]]);
  toPrime(P);
  engine.setActor('T');
  const b0 = vit(P.B);
  engine.attackTarget('T', 'B');
  engine.clearPhaseTimer();
  assert.equal(vit(P.B), b0 - 2);
  const card = engine.buildStateFor('T').attack;
  assert.equal(card.byStyle, 'otSlash');
  assert.equal(card.byAttackSound, 'ot_slash');
  assert.ok(card.skills.some((s) => /ออพติมัส ไพร์ม \+1/.test(s.name)));
  P.T.oldTruck.form = 'truck';
  assert.equal(ot.attackStyle(P.T), 'otRam');
  assert.equal(ot.attackSound(P.T), 'ot_ram');
});

test('ผู้พิทักษ์: ถูกตีปกติ = ฟันสวน 2 + เลือดไหล 2 เทิร์น · ผู้ตีไม่ถอย · ท่าหมด + คูลดาวน์ 3 เทิร์น', () => {
  const P = setup([['T', 'old_truck', 4, 7], ['B', 'dummy', 5, 7]]);
  toPrime(P);
  engine.setActor('T');
  engine.useSkill('T', 'secondary', []);
  assert.equal(P.T.skillPoints, 4);
  assert.equal(P.T.oldTruck.stance, true);
  assert.deepEqual(calls.queue, ['otGuardian']);
  assert.equal(view('T', 'T').oldTruck.stance, true);
  assert.equal(view('B', 'T').skillLocks.secondary.locked, true);
  const round = engine.roundNumber;
  engine.setActor('B');
  const b0 = vit(P.B);
  engine.attackTarget('B', 'T');
  engine.clearPhaseTimer();
  assert.equal(vit(P.B), b0 - 2, 'ฟันสวน 2 (ไม่บวกพลังโจมตีออพติมัส)');
  assert.equal(P.B.statuses.hbleed, 2, 'เลือดไหล 2 เทิร์น');
  assert.deepEqual(P.B.pos, { x: 5, y: 7 }, 'ผู้ตีไม่ถอย');
  assert.equal(P.T.oldTruck.stance, false, 'ทำงาน 1 ครั้งแล้วหาย');
  assert.equal(P.T.oldTruck.countering, false);
  assert.equal(P.T.oldTruck.guardReady, round + 4);
  const card = engine.buildStateFor('T').attack;
  assert.equal(card.counter.byStyle, 'otCounter');
  assert.equal(card.counter.byAttackSound, 'ot_counter');
  assert.equal(card.counter.dmg, 2);
  // คูลดาวน์ 3 เทิร์น
  engine.setRoundNumber(round + 1);
  engine.setActor('T');
  assert.equal(view('T', 'T').skillLocks.secondary.cd, 3);
  engine.useSkill('T', 'secondary', []);
  assert.equal(P.T.oldTruck.stance, false, 'ติดคูลดาวน์');
  engine.setRoundNumber(round + 4);
  engine.setActor('T');
  P.T.skillUsedRound = false; // เทสต์ไม่ผ่าน dealRound — ล้างโควตาเอง
  engine.useSkill('T', 'secondary', []);
  assert.equal(P.T.oldTruck.stance, true, 'ครบคูลดาวน์ใช้ได้อีก');
  engine.setRoundNumber(round);
});

test('ผู้พิทักษ์: สวนได้ไม่ว่าผู้ตีอยู่ไกลแค่ไหน · ปืน GUTS ไม่นับ · ผู้ตีหลบได้', () => {
  const P = setup([['T', 'old_truck', 4, 7], ['K', 'kensaki_kazuma', 6, 7]]);
  toPrime(P);
  P.T.oldTruck.stance = true; P.T.oldTruck.stanceRound = engine.roundNumber;
  assert.equal(ot.counters(P.T, { gun: 'normal' }), false);
  assert.equal(ot.counters(P.T, {}), true);
  engine.setActor('K');
  const k0 = vit(P.K);
  assert.ok(engine.attackTarget('K', 'T'), 'คาซุมะตีระยะ 2');
  engine.clearPhaseTimer();
  assert.equal(vit(P.K), k0 - 2, 'สวนข้ามระยะ 2');
  // หลบพ้น = ท่าหมดเหมือนกัน
  const Q = setup([['T', 'old_truck', 4, 7], ['B', 'dummy', 5, 7]]);
  toPrime(Q);
  Q.T.oldTruck.stance = true; Q.T.oldTruck.stanceRound = engine.roundNumber;
  Q.B.statuses.evade = 2;
  engine.setActor('B');
  const b0 = vit(Q.B);
  Math.random = () => 0; // หลบหลีก 100% ติด
  engine.attackTarget('B', 'T');
  engine.clearPhaseTimer();
  assert.equal(vit(Q.B), b0, 'ผู้ตีหลบการสวนได้');
  assert.equal(Q.T.oldTruck.stance, false);
  assert.equal(Q.T.oldTruck.countering, false);
});

test('ผู้พิทักษ์: ไม่ได้สวน = หมดต้นตาเดินถัดไป ไม่ติดคูลดาวน์ · กลับเป็นรถ = ท่าหาย', () => {
  const P = setup([['T', 'old_truck', 4, 7], ['B', 'dummy', 12, 12]]);
  toPrime(P);
  engine.setActor('T');
  engine.useSkill('T', 'secondary', []);
  ot.onActorStart(engine, P.T);
  assert.equal(P.T.oldTruck.stance, true, 'ตาเดินเดียวกัน ยังอยู่');
  engine.setRoundNumber(engine.roundNumber + 1);
  ot.onActorStart(engine, P.T);
  assert.equal(P.T.oldTruck.stance, false);
  assert.equal(P.T.oldTruck.guardReady, 0, 'ไม่ติดคูลดาวน์');
  engine.setActor('T');
  P.T.skillUsedRound = false;
  engine.useSkill('T', 'secondary', []);
  assert.equal(P.T.oldTruck.stance, true);
  engine.useSkill('T', 'basic', []);
  assert.equal(P.T.oldTruck.form, 'truck');
  assert.equal(P.T.oldTruck.stance, false);
  assert.equal(ot.counters(P.T, {}), false);
});

test('ข้าคือ...ออพติมัส ไพร์ม: ครึ่งวงรัศมี 2 · 1 คน = 4 · 3 คน = 6 (ทุกคนเท่ากัน) · ไม่โดนนอกวง/เพื่อน', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([
    ['T', 'old_truck', 4, 8, 't1'], ['A', 'dummy', 3, 8, 't2'], ['B', 'dummy', 5, 7, 't2'], ['C', 'dummy', 4, 6, 't2'],
    ['F', 'dummy', 3, 7, 't1'], ['X', 'dummy', 6, 7, 't2'],
  ], 'duo');
  toPrime(P);
  for (const id of ['A', 'B', 'C', 'X']) { P[id].hp = 7; P[id].armor = 3; }
  engine.setActor('T');
  const f0 = vit(P.F), x0 = vit(P.X);
  engine.useSkill('T', 'ultimate', [], { dir: 'up' });
  assert.equal(P.T.skillPoints, 2);
  assert.deepEqual(calls.queue, ['otUlt']);
  flush(t);
  for (const id of ['A', 'B', 'C']) assert.equal(vit(P[id]), 4, `${id} โดน 6`);
  assert.equal(vit(P.F), f0, 'เพื่อนไม่โดน');
  assert.equal(vit(P.X), x0, 'นอกวงไม่โดน');
  const arc = calls.fx.find((f) => f.event === 'optimusFx' && f.payload.kind === 'arc');
  assert.equal(arc.payload.tiles.length, 8);
  assert.equal(arc.payload.dir, 'up');
  assert.ok(calls.sfx.includes('ot_ult'));
  assert.equal(P.T.oldTruck.crit, true, 'ใช้ท่าไม้ตาย = คริ +25%');
  assert.equal(ot.critPct(P.T), 25);
  assert.equal(engine.gameState, 'ACTION', 'ไม่จบตาเดิน');
  assert.equal(ot.ultDamage(1), 4);
  assert.equal(ot.ultDamage(2), 5);
  assert.equal(ot.ultDamage(3), 6);
  assert.equal(ot.ultDamage(5), 6, 'สูงสุด 6');
});

test('ไพร์ม: โอกาส 30% ฟื้นพลังชีวิต 1–2 เมื่อตีโดน · ร่างรถเก่าไม่มี · คริหมดตอนจบเทิร์น', () => {
  const P = setup([['T', 'old_truck', 4, 7], ['B', 'dummy', 5, 7]]);
  toPrime(P);
  P.T.hp = 3;
  engine.setActor('T');
  Math.random = () => 0.1;
  engine.attackTarget('T', 'B');
  engine.clearPhaseTimer();
  assert.equal(P.T.hp, 4, 'ฟื้น +1');
  const card = engine.buildStateFor('T').attack;
  assert.ok(card.skills.some((s) => /ไพร์ม — ฟื้นพลังชีวิต \+1/.test(s.name)));
  P.T.oldTruck.form = 'old';
  assert.equal(ot.critPct(P.T), 0);
  P.T.oldTruck.form = 'prime';
  ot.onItemUsed(engine, P.T);
  assert.equal(ot.critPct(P.T), 25, 'ใช้ไอเทม = คริ +25%');
  engine.endTurn();
  engine.clearPhaseTimer();
  assert.equal(ot.critPct(P.T), 0, 'หมดตอนจบเทิร์น');
});

test('รถบรรทุก: จบเทิร์นในร่างรถครบ 3 เทิร์น ฟื้นพลังชีวิต 2 · ร่างออพติมัสหยุดนับ', () => {
  const P = setup([['T', 'old_truck', 4, 7], ['B', 'dummy', 12, 12]]);
  P.T.oldTruck.form = 'truck';
  P.T.hp = 3;
  ot.onEndTurn(engine);
  ot.onEndTurn(engine);
  assert.equal(P.T.oldTruck.regen, 2);
  P.T.oldTruck.form = 'prime';
  ot.onEndTurn(engine);
  assert.equal(P.T.oldTruck.regen, 2, 'ร่างออพติมัสไม่นับ ไม่รีเซ็ต');
  P.T.oldTruck.form = 'truck';
  ot.onEndTurn(engine);
  assert.equal(P.T.hp, 5);
  assert.equal(P.T.oldTruck.regen, 0);
});

test('ตัดผลสกิล: ออพติมัส → กลับเป็นรถ · ผู้พิทักษ์หายไม่ติดคูลดาวน์', () => {
  const P = setup([['T', 'old_truck', 4, 7], ['B', 'dummy', 12, 12]]);
  toPrime(P);
  P.T.oldTruck.stance = true;
  const list = ot.severables(engine, P.T);
  assert.deepEqual(list.map((x) => x.key), ['otPrime', 'otGuard']);
  list[1].cancel();
  assert.equal(P.T.oldTruck.stance, false);
  list[0].cancel();
  assert.equal(P.T.oldTruck.form, 'truck');
});
