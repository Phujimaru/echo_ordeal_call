// เด็กสาวเสื้อคลุมขาว (ยูนะ) — คำอวยพรสุดท้าย / เป็นส่วนหนึ่งของเงา / บทเพลงแห่งชีวิต / ร้อนแรงดังไฟ / ศพค้าง / ขี่ผู้เล่นอื่น
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const yuna = require('../../characters/yuna.js');
const { CHAR_BY_ID } = require('../../characters.js');
const action = require('../../server/phases/action.js');
const attack = require('../../server/phases/attack.js');
const Ride = require('../../server/ride.js');
const { accurateActive } = require('../../characters/_universal_status.js');

const realRandom = Math.random;
const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
// list = [[id, characterId, x, y, teamId?], ...] — แถว y = 6..8 ช่วง x = 2..7 ของภูมิภาค I เป็นพื้นโล่ง
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
const flush = (t, ms = 6000) => { for (let i = 0; i < ms / 100; i++) t.mock.timers.tick(100); };
function kill(p) { p.hp = 0; engine.instantDeath(p); if (!p.alive) p.pos = null; }
// ลำดับเดินจริง: ids ตามลำดับ · เดินผ่านไปจนถึงตาของ actorId
function orderUpTo(t, ids, actorId) {
  engine.beginOrder();
  engine.turnOrder.splice(0, engine.turnOrder.length, ...ids);
  flush(t, 6600);
  while (engine.actorId !== actorId) engine.finishActor();
}

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
test.beforeEach(() => { for (const k of Object.keys(calls)) calls[k] = []; });
test.afterEach(() => { Math.random = realRandom; engine.setGameMode('ffa'); engine.setCycleShift(0); engine.clearPhaseTimer(); });

test('ข้อมูล: หมวดพิเศษ · ชื่อ “เด็กสาวเสื้อคลุมขาว” · เดิน 4 ตีประชิด · 0 / 0 / 8 แต้ม · คำอวยพรเลือกศพในระยะเดิน', () => {
  const ch = CHAR_BY_ID.yuna;
  assert.equal(ch.name, 'เด็กสาวเสื้อคลุมขาว');
  assert.equal(ch.difficulty, 'special');
  assert.equal(ch.mov, 4);
  assert.deepEqual(ch.range, [1, 1]);
  assert.equal(ch.basic.cost, 0);
  assert.equal(ch.secondary.cost, 0);
  assert.equal(ch.ultimate.cost, 8);
  assert.deepEqual(ch.basic.area, { kind: 'tile', range: 'mov', place: 'corpse' });
  const P = setup([['Y', 'yuna', 3, 7], ['B', 'dummy', 12, 12]]);
  assert.equal(P.Y.yuna.song, 'rest', 'เริ่มเกมพักผ่อน');
  assert.equal(view('Y', 'Y').character.basic.area.range, 4, 'range "mov" แปลงเป็นตัวเลข');
});

test('ศพค้าง: ระหว่างที่ยูนะอยู่ คนตายทิ้งศพ (ขวาง เดินข้ามได้) · ยูนะตาย = ศพหายหมด · ไม่มียูนะ = ไม่มีศพ', () => {
  const P = setup([['Y', 'yuna', 3, 7], ['A', 'dummy', 5, 7], ['B', 'dummy', 6, 8]]);
  kill(P.A);
  assert.deepEqual(P.A.corpse, { x: 5, y: 7 });
  assert.equal(engine.tileFree(5, 7), false, 'ศพขวางช่อง');
  assert.ok(action.hopTiles().has('5,7'), 'เดินข้ามได้');
  assert.deepEqual(view('B', 'A').corpse, { x: 5, y: 7 }, 'ทุกคนเห็นศพ');
  P.Y.yuna.blessUsed = true; // ไม่ให้ฟื้นตัวเอง
  kill(P.Y);
  assert.equal(P.Y.alive, false);
  assert.equal(P.A.corpse, null, 'ยูนะตาย ศพหาย');
  assert.equal(engine.tileFree(5, 7), true);
  const Q = setup([['A', 'dummy', 5, 7], ['B', 'dummy', 6, 8]]);
  kill(Q.A);
  assert.equal(Q.A.corpse || null, null, 'ไม่มียูนะ = ไม่ทิ้งศพ');
});

test('คำอวยพรสุดท้าย: ฟื้นศพในระยะเดิน · พลังชีวิต 3 เกราะ 0 · พลังโจมตี +1 + ต้านสถานะ 3 เทิร์น · ได้เดินเทิร์นนี้ · ใช้ได้ครั้งเดียว', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['A', 'dummy', 6, 7], ['Y', 'yuna', 3, 7], ['B', 'dummy', 12, 12]]);
  orderUpTo(t, ['A', 'Y', 'B'], 'Y');
  kill(P.A); // ตายหลังเดินไปแล้ว
  assert.ok(P.A.corpse);
  const before = P.Y.skillPoints;
  // นอกระยะ = กดไม่ได้ ไม่เสียอะไร
  P.A.corpse = { x: 8, y: 7 };
  engine.useSkill('Y', 'basic', [], { tile: { x: 8, y: 7 } });
  assert.equal(P.A.alive, false);
  assert.equal(P.Y.skillUsedRound, false);
  P.A.corpse = { x: 6, y: 7 };
  engine.useSkill('Y', 'basic', [], { tile: { x: 6, y: 7 } });
  assert.equal(P.A.alive, true);
  assert.deepEqual(P.A.pos, { x: 6, y: 7 });
  assert.equal(P.A.hp, 3);
  assert.equal(P.A.armor, 0);
  assert.equal(P.A.corpse, null);
  assert.equal(P.A.statuses.yunaBless, 3);
  assert.equal(P.A.statuses.resist, 3);
  assert.equal(P.Y.skillPoints, before, '0 แต้ม');
  assert.equal(P.Y.yuna.blessUsed, true);
  assert.equal(engine.turnOrder[engine.turnOrder.length - 1], 'A', 'ต่อท้ายลำดับเดิน');
  assert.equal(attack.computeAttackBase(engine, P.A, P.B).base, 2, 'พลังโจมตี +1');
  assert.ok(calls.fx.some((f) => f.event === 'yunaFx' && f.payload.kind === 'revive'));
  assert.equal(engine.buildStateFor('B').skillMusic, 'yuna_longing', 'เพลง Longing');
  // ปุ่มกลายเป็น เป็นส่วนหนึ่งของเงา
  const b = view('Y', 'Y').character.basic;
  assert.equal(b.name, 'เป็นส่วนหนึ่งของเงา');
  assert.equal(b.cost, 3);
  assert.equal(b.img, yuna.IMG.shadow);
  // ได้เดินจริงหลังยูนะกับ B
  engine.finishActor();
  assert.equal(engine.actorId, 'B');
  engine.finishActor();
  assert.equal(engine.actorId, 'A', 'คนที่ฟื้นได้ตาเดินเทิร์นนี้');
});

test('ตายโดยยังไม่ใช้คำอวยพร = ฟื้นตัวเองทันที (พลังชีวิต 3 + บัฟ) · ใช้แล้วตายจริง', () => {
  const P = setup([['Y', 'yuna', 3, 7], ['B', 'dummy', 12, 12]]);
  P.Y.statuses.burn = 2;
  kill(P.Y);
  assert.equal(P.Y.alive, true);
  assert.equal(P.Y.hp, 3);
  assert.equal(P.Y.statuses.burn, undefined, 'สถานะเดิมล้าง');
  assert.equal(P.Y.statuses.yunaBless, 3);
  assert.equal(P.Y.statuses.resist, 3);
  assert.equal(P.Y.yuna.blessUsed, true);
  kill(P.Y);
  assert.equal(P.Y.alive, false);
});

test('บทเพลงแห่งชีวิต: เลือกเพลง (ไม่กินโควตา ยังเดินได้) · Delete ศัตรูในวง +1 / พวกเรา SP +1 · จบเทิร์นเสีย 2 แต้ม', () => {
  const P = setup([['Y', 'yuna', 3, 7], ['A', 'dummy', 5, 7], ['F', 'dummy', 12, 12]]);
  engine.setActor('Y');
  const ch = view('Y', 'Y').character.secondary;
  assert.deepEqual(ch.choices.map((c) => c.key), ['delete', 'smile', 'rest']);
  engine.useSkill('Y', 'secondary', [], { form: 'delete' });
  assert.equal(P.Y.yuna.song, 'delete');
  assert.equal(P.Y.skillUsedRound, false, 'ไม่นับเป็นการใช้สกิล');
  assert.equal(engine.action.locked, false, 'ยังเดินได้');
  assert.equal(engine.buildStateFor('A').skillMusic, 'yuna_delete');
  assert.deepEqual(view('A', 'Y').yuna.aura, { kind: 'delete', x: 3, y: 7, r: 4 });
  // ศัตรูในวงรับดาเมจ +1 · นอกวงปกติ
  const a0 = P.A.hp + P.A.armor;
  engine.dealMixed(P.A, 1);
  assert.equal(a0 - (P.A.hp + P.A.armor), 2);
  const f0 = P.F.hp + P.F.armor;
  engine.dealMixed(P.F, 1);
  assert.equal(f0 - (P.F.hp + P.F.armor), 1);
  // จบเทิร์น: ยูนะจ่าย 2 แล้วได้คืน 1 (พวกเราในวง = ตัวเองใน ffa)
  assert.equal(yuna.SONG_COST, 2);
  P.Y.skillPoints = 3;
  yuna.onEndTurn(engine);
  assert.equal(P.Y.skillPoints, 2);
});

test('Smile for You: พวกเราในวงรับดาเมจ −1 (ถึง 0 ได้) + ฟื้นพลังชีวิต 1 · ศัตรูไม่ได้ · แต้มไม่พอ = เพลงหยุด', () => {
  const P = setup([['Y', 'yuna', 3, 7, 'a'], ['M', 'dummy', 4, 7, 'a'], ['E', 'dummy', 5, 7, 'b'], ['E2', 'dummy', 12, 12, 'b']], 'duo');
  engine.setActor('Y');
  engine.useSkill('Y', 'secondary', [], { form: 'smile' });
  const m0 = P.M.hp + P.M.armor;
  engine.dealMixed(P.M, 1);
  assert.equal(P.M.hp + P.M.armor, m0, 'เพื่อนในวงไม่เสีย');
  engine.dealMixed(P.M, 2);
  assert.equal(m0 - (P.M.hp + P.M.armor), 1);
  const e0 = P.E.hp + P.E.armor;
  engine.dealMixed(P.E, 1);
  assert.equal(e0 - (P.E.hp + P.E.armor), 1, 'ศัตรูไม่ได้ลด');
  P.M.hp = 3; P.Y.skillPoints = 3;
  yuna.onEndTurn(engine);
  assert.equal(P.M.hp, 4, 'ฟื้น 1');
  assert.equal(P.Y.skillPoints, 1, 'เสีย 2');
  yuna.onEndTurn(engine);
  assert.equal(P.Y.yuna.song, 'rest', 'จ่ายไม่ไหว เพลงหยุด');
  assert.equal(P.M.hp, 4);
});

test('ร้อนแรงดังไฟ: 5 เทิร์น · ชื่อ “ยูนะ” + ปกไอดอล · ระยะตี 4 · ตัวเอง +2 เพื่อน +1 แม่นยำ · ปิดเพลง · คูลดาวน์ 3 เทิร์น', () => {
  const P = setup([['Y', 'yuna', 3, 7, 'a'], ['M', 'dummy', 5, 7, 'a'], ['E', 'dummy', 4, 8, 'b'], ['E2', 'dummy', 12, 12, 'b']], 'duo');
  engine.setRoundNumber(2);
  engine.setActor('Y');
  engine.useSkill('Y', 'secondary', [], { form: 'smile' });
  engine.useSkill('Y', 'ultimate', []);
  assert.deepEqual(calls.queue, ['yunaIdol']);
  assert.equal(P.Y.yuna.song, 'rest');
  assert.equal(P.Y.yuna.ultUntil, 6);
  const me = view('Y', 'Y');
  assert.equal(me.character.name, 'ยูนะ');
  assert.equal(me.character.img, yuna.IMG.idol);
  assert.equal(me.img, yuna.IMG.idol);
  assert.deepEqual(me.range, [1, 4]);
  assert.equal(engine.buildStateFor('Y').skillMusic, 'yuna_idol');
  assert.equal(attack.computeAttackBase(engine, P.Y, P.E).base, 3);
  assert.equal(attack.computeAttackBase(engine, P.M, P.E).base, 2);
  assert.equal(attack.computeAttackBase(engine, P.E, P.M).base, 1, 'ศัตรูไม่ได้');
  assert.equal(accurateActive(P.M), true);
  assert.equal(accurateActive(P.E), false);
  P.M.pos = { x: 12, y: 7 };
  assert.equal(attack.computeAttackBase(engine, P.M, P.E).base, 1, 'ออกนอกวง = ไม่ได้');
  engine.useSkill('Y', 'secondary', [], { form: 'delete' });
  assert.equal(P.Y.yuna.song, 'rest', 'ระหว่างไอดอลเปิดเพลงไม่ได้');
  engine.setRoundNumber(7);
  assert.equal(view('Y', 'Y').character.name, 'เด็กสาวเสื้อคลุมขาว', 'หมดแล้วกลับร่าง');
  assert.equal(view('Y', 'Y').yuna.ultCd, 3);
  P.Y.skillUsedRound = false; P.Y.skillPoints = 8;
  engine.setActor('Y');
  engine.useSkill('Y', 'ultimate', []);
  assert.equal(P.Y.yuna.ultUntil, 6, 'ติดคูลดาวน์');
  engine.setRoundNumber(10);
  engine.setActor('Y');
  engine.useSkill('Y', 'ultimate', []);
  assert.equal(P.Y.yuna.ultUntil, 14, 'ครบ 3 เทิร์นแล้วกดได้');
});

test('เป็นส่วนหนึ่งของเงา: 3 แต้ม · เทิร์นหน้าหายตัว (มองไม่เห็น · ไม่โดนดาเมจ/ดีบัฟ) · วงเพลงไม่ทำงานและไม่เสียค่าเพลง', () => {
  const P = setup([['Y', 'yuna', 3, 7], ['B', 'dummy', 4, 7]]);
  P.Y.yuna.blessUsed = true;
  P.Y.yuna.song = 'delete';
  engine.setRoundNumber(3);
  engine.setActor('Y');
  engine.useSkill('Y', 'basic', []);
  assert.equal(P.Y.skillPoints, 5);
  assert.equal(P.Y.yuna.vanishRound, 4);
  assert.ok(view('B', 'Y').pos, 'เทิร์นนี้ยังเห็น');
  engine.setRoundNumber(4);
  assert.equal(view('B', 'Y').pos, null, 'เทิร์นหน้าศัตรูมองไม่เห็น');
  const v0 = P.Y.hp + P.Y.armor;
  engine.withEffectSource(P.B, () => engine.dealMixed(P.Y, 3));
  assert.equal(P.Y.hp + P.Y.armor, v0, 'ไม่เสียหาย');
  assert.equal(engine.withEffectSource(P.B, () => engine.applyDebuff(P.Y, 'stun', null, 1)), false);
  const b0 = P.B.hp + P.B.armor;
  engine.dealMixed(P.B, 1);
  assert.equal(b0 - (P.B.hp + P.B.armor), 1, 'Delete ไม่ทำงานระหว่างหายตัว');
  P.Y.skillPoints = 2;
  yuna.onEndTurn(engine);
  assert.equal(P.Y.skillPoints, 2, 'ไม่เสียค่าเพลง');
});

test('ขี่: ขอ → เจ้าของยินยอม → ขึ้นหลัง (ใช้การเดินแล้ว) · จบตาไม่อยู่บนกระดาน · ไม่โดนพื้นที่ · ตาของตัวเองลงมายืนช่องเดียวกัน · เดินออก = ลง · ย้อน = ขึ้นกลับ', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['Y', 'yuna', 3, 7], ['M', 'dummy', 4, 7], ['B', 'dummy', 12, 12]]);
  orderUpTo(t, ['Y', 'M', 'B'], 'Y');
  assert.equal(Ride.ask('Y', 'B'), false, 'ต้องอยู่ติดกัน');
  assert.equal(Ride.ask('Y', 'M'), true);
  assert.equal(engine.buildStateFor('M').rideAsk.mine, true);
  assert.equal(Ride.answer('B', true), false, 'คนอื่นตอบแทนไม่ได้');
  assert.equal(Ride.answer('M', true), true);
  assert.equal(P.Y.mountId, 'M');
  assert.deepEqual(P.Y.pos, { x: 4, y: 7 });
  assert.equal(engine.action.locked, true);
  engine.finishActor(); // จบตายูนะ → ตาของ M
  assert.equal(P.Y.pos, null, 'ขี่อยู่ = ไม่อยู่บนกระดาน');
  assert.equal(view('B', 'Y').ride, 'M');
  assert.ok(!engine.boardUnits().some((u) => u.id === 'Y'));
  assert.ok(engine.moveTo('M', 5, 8));
  assert.deepEqual(Ride.centerOf(P.Y), { x: 5, y: 8 }, 'พาไปด้วย');
  P.B.pos = { x: 6, y: 8 };
  const area = action.resolveArea(P.B, { kind: 'aoe', range: 2, hostile: true }, [], null);
  assert.ok(area.includes('M') && !area.includes('Y'), 'สกิลพื้นที่โดนแค่คนที่ถูกขี่');
  engine.finishActor(); // M → B
  engine.finishActor(); // B → จบเทิร์น
  flush(t, 9000);
  engine.beginOrder();
  engine.turnOrder.splice(0, engine.turnOrder.length, 'Y', 'M', 'B');
  flush(t, 6600);
  assert.equal(engine.actorId, 'Y');
  assert.deepEqual(P.Y.pos, { x: 5, y: 8 }, 'ตาของตัวเอง = ลงมายืนช่องของคนที่ถูกขี่');
  assert.ok(engine.moveTo('Y', 4, 8));
  assert.equal(P.Y.mountId, null, 'เดินออก = ลง');
  engine.undoMove('Y');
  assert.equal(P.Y.mountId, 'M', 'ย้อน = ขึ้นกลับ');
});

test('ขี่: คนที่ถูกขี่ถูกโจมตี = ยูนะร่วงลงข้างๆ และขี่ไม่ได้ 3 เทิร์น · คนที่ถูกขี่ตาย = ร่วง', () => {
  const P = setup([['Y', 'yuna', 3, 7], ['M', 'dummy', 4, 7], ['B', 'dummy', 5, 7]]);
  P.Y.mountId = 'M'; P.Y.pos = null;
  Math.random = () => 0.99;
  attack.strike(P.B, P.M);
  assert.equal(P.Y.mountId, null);
  assert.ok(P.Y.pos && Math.abs(P.Y.pos.x - 4) + Math.abs(P.Y.pos.y - 7) >= 1, 'ลงช่องข้างๆ');
  assert.equal(P.Y.statuses.yunaNoRide, 3);
  assert.equal(yuna.canRide(engine, P.Y), false);
  P.Y.statuses = {};
  P.Y.mountId = 'M'; P.Y.pos = null;
  kill(P.M);
  assert.equal(P.Y.mountId, null);
  assert.ok(P.Y.pos, 'ร่วงลงกระดาน');
  assert.ok(P.M.corpse, 'คนที่ถูกขี่ทิ้งศพ');
});

test('ขี่: คนที่ถูกขี่สั่งให้ลงได้ในตาของตัวเอง (ไม่ติดห้ามขี่) · นอกตาสั่งไม่ได้', () => {
  const P = setup([['Y', 'yuna', 3, 7], ['M', 'dummy', 4, 7], ['B', 'dummy', 12, 12]]);
  P.Y.mountId = 'M'; P.Y.pos = null;
  engine.setActor('B');
  assert.equal(Ride.drop('M'), false, 'ไม่ใช่ตาของคนที่ถูกขี่');
  assert.equal(P.Y.mountId, 'M');
  engine.setActor('M');
  assert.equal(Ride.drop('M'), true);
  assert.equal(P.Y.mountId, null);
  assert.ok(P.Y.pos, 'ลงช่องข้างๆ');
  assert.equal(P.Y.statuses.yunaNoRide, undefined, 'ไม่ติดห้ามขี่');
  assert.equal(engine.action.locked, false, 'ไม่ล็อกการเดินของคนที่ถูกขี่');
});
