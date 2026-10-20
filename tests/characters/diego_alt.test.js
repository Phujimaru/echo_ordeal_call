// ดิเอโก้ แบรนโด (โลกคู่ขนาน — diego_alt) — คลังเครื่องมือ / ปืนลูกโม่ / เดอะเวิลด์ (หยุดเวลา) / เป็นไปดั่งกลอุบาย / เล่ห์เหลี่ยม / ม้า
//  กติกา: GRID_PLAN.md §7.12 (ผู้ใช้ตัดสิน 2026-10-20) · ระบบกลางหยุดเวลา server/timeStop.js
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const diego = require('../../characters/diego_alt.js');
const { CHAR_BY_ID } = require('../../characters.js');

const realRandom = Math.random;
const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
// list = [[id, characterId, x, y, teamId?], ...] — แถว y = 7 / 8 ของภูมิภาค I โล่ง (จุดฟื้นฟู x = 6, 7 แถว 6–7)
function setup(list, mode = 'ffa') {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, ch, , , team], i) => { engine.players[id] = blank(id, ch, i + 1, team || null); });
  engine.setGameMode(mode);
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setJourneyArea(1);
  engine.setCycleShift(0);
  engine.setShopPos(null);
  engine.setRoundNumber(2);
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.skillPoints = 8; p.skillUsedRound = false; p.shield = 0;
    p.statuses = {}; p.statusAmt = {};
  }
  return engine.players;
}
const view = (viewerId, id) => engine.buildStateFor(viewerId).players.find((p) => p.id === id);
const vit = (p) => (p.hp || 0) + (p.armor || 0);
const flush = (t, ms = 8000) => { for (let i = 0; i < ms / 100; i++) t.mock.timers.tick(100); };
const fxOf = (kind) => calls.fx.filter((f) => f.event === 'diegoFx' && f.payload.kind === kind).map((f) => f.payload);
const tool = (id, form, extra = {}) => engine.useSkill(id, 'basic', extra.targets || [], { form, ...extra });
const L = () => engine.board.diego || { oil: {}, fire: {}, ash: {} };

const saved = {
  triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash,
  notifyTransform: engine.notifyTransform, sfx: engine.sfx, boardFx: engine.boardFx, boardFxTo: engine.boardFxTo,
};
const calls = { fx: [], sfx: [], private: [], cut: [] };
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = (p, key) => calls.cut.push(key);
  engine.skillFlash = () => {};
  engine.notifyTransform = () => {};
  engine.sfx = (s, onlyFor, extra) => calls.sfx.push({ s, voice: extra && extra.voice, onlyFor: onlyFor || null });
  engine.boardFx = (event, payload) => calls.fx.push({ event, payload });
  engine.boardFxTo = (ids, event, payload) => calls.private.push({ ids, event, payload });
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.beforeEach(() => { for (const k of Object.keys(calls)) calls[k] = []; Math.random = () => 0.99; });
test.afterEach(() => { Math.random = realRandom; engine.setGameMode('ffa'); engine.setCycleShift(0); engine.setShopPos(null); engine.clearPhaseTimer(); });

// ลำดับเดินจริง: ids ตามลำดับ · เดินผ่านไปจนถึงตาของ actorId
function orderUpTo(t, ids, actorId) {
  engine.beginOrder();
  engine.turnOrder.splice(0, engine.turnOrder.length, ...ids);
  flush(t, 6600);
  while (engine.actorId !== actorId && engine.actorId) engine.finishActor();
}

test('ข้อมูล: ระดับยาก · พลังชีวิต 6 เกราะ 2 · เดิน 4 (ขี่ม้า 5) ตี [1, 2] · ปืนแนว 5×1 · เริ่มเกมขี่ม้า · สัญญาข้อมูล §7.12', () => {
  const ch = CHAR_BY_ID.diego_alt;
  assert.equal(ch.difficulty, 'hard');
  assert.ok(!ch.unique, 'เลือกซ้ำได้');
  assert.deepEqual([ch.mov, ch.range], [4, [1, 2]]);
  assert.deepEqual(ch.secondary.area, { kind: 'line', len: 5, width: 1, hostile: true });
  const P = setup([['D', 'diego_alt', 2, 7], ['B', 'dummy', 9, 7]]);
  assert.deepEqual([P.D.hp, P.D.armor], [6, 2]);
  assert.equal(engine.movOf(P.D), 5);
  const d = view('D', 'D').diego;
  assert.deepEqual(Object.keys(d).sort(), ['ammo', 'ammoMax', 'cunning', 'cunningMax', 'firstAid', 'horseCd', 'horseHp', 'mounted', 'nets', 'reloadCd', 'shot', 'stopping', 'toolLeft', 'worldArmed', 'worldCd'].sort());
  assert.deepEqual([d.ammo, d.firstAid, d.toolLeft, d.cunning, d.mounted, d.horseHp], [4, 2, 2, 0, true, 3]);
  assert.equal(view('B', 'D').diego.nets, undefined, 'ตาข่ายเห็นเฉพาะเจ้าของ');
  const choices = view('D', 'D').character.basic.choices;
  assert.deepEqual(choices.map((c) => c.key), ['oil', 'match', 'net', 'knife', 'aid']);
  assert.ok(choices.every((c) => c.desc), 'ทุกตัวเลือกมีคำอธิบาย (กฎผู้ใช้)');
});

test('คลังเครื่องมือ: 2 ครั้งต่อเทิร์น · ไม่กินโควตาสกิล · ไม่ล็อกการเดิน · ครั้งที่ 3 กดไม่ได้และไม่เสียแต้ม · เล่ห์เหลี่ยม +1 ต่อครั้ง', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['D', 'diego_alt', 2, 7], ['B', 'dummy', 12, 2]]);
  engine.setActor('D');
  tool('D', 'match', { tile: { x: 4, y: 8 } });
  flush(t, 2000);
  tool('D', 'match', { tile: { x: 4, y: 8 } });
  flush(t, 2000);
  assert.equal(P.D.skillPoints, 6);
  assert.equal(P.D.skillUsedRound, false, 'ไม่กินโควตา');
  assert.equal(engine.action.locked, false, 'ยังเดินได้');
  assert.equal(P.D.diego.cunning, 2);
  tool('D', 'match', { tile: { x: 4, y: 8 } });
  flush(t, 2000);
  assert.equal(P.D.skillPoints, 6, 'ครั้งที่ 3 ไม่ทำงาน ไม่เสียแต้ม');
  assert.equal(view('D', 'D').diego.toolLeft, 0);
  assert.ok(engine.moveTo('D', 3, 8), 'ใช้ครบแล้วยังเดินได้');
});

test('ถังน้ำมัน: แอ่ง 3×3 · ศัตรูในพื้นที่ชุ่มน้ำมัน (ดิเอโก้ไม่) · ศัตรูเริ่มตาเดินบนน้ำมัน เดิน −1 · นอกระยะ 4 กดไม่ได้', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['D', 'diego_alt', 2, 7], ['B', 'dummy', 4, 8], ['C', 'dummy', 12, 2]]);
  engine.setActor('D');
  tool('D', 'oil', { tile: { x: 9, y: 8 } });
  assert.equal(P.D.skillPoints, 8, 'นอกระยะ = ไม่ทำงาน');
  tool('D', 'oil', { tile: { x: 3, y: 8 } });
  flush(t, 3000);
  assert.equal(P.D.skillPoints, 6);
  assert.equal(Object.keys(L().oil).length, 8, '3×3 ไม่นับช่องสิ่งกีดขวาง (4,9)');
  assert.ok((P.B.statuses.oilSoaked || 0) > 0, 'ศัตรูชุ่มน้ำมัน');
  assert.ok(!(P.D.statuses.oilSoaked > 0), 'ดิเอโก้ไม่ชุ่ม');
  assert.equal(P.D.diego.cunning, 2, 'ใช้ +1 · ชุ่มน้ำมัน +1');
  assert.equal(engine.buildStateFor('C').board.diego.oil.length, 8, 'ทุกคนเห็นแอ่งน้ำมัน');
  engine.setActor('B');
  assert.equal(engine.movOf(P.B), 3, 'เริ่มตาบนน้ำมัน เดิน −1');
  engine.setActor('D');
  assert.equal(engine.movOf(P.D), 5, 'แอ่งของตัวเองไม่ช้า');
});

test('ไม้ขีด: ใส่แอ่งน้ำมัน = ระเบิดทั้งแอ่ง −2 + ลุกไหม้ (ดิเอโก้ไม่โดน) → กองไฟ 3 เทิร์น เผาคนที่ยืนต้นเทิร์น → ขี้เถ้า', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['D', 'diego_alt', 2, 7], ['B', 'dummy', 4, 8], ['C', 'dummy', 12, 2]]);
  engine.setActor('D');
  tool('D', 'oil', { tile: { x: 3, y: 8 } });
  flush(t, 3000);
  const before = vit(P.B), dBefore = vit(P.D);
  tool('D', 'match', { tile: { x: 2, y: 9 } });
  flush(t, 3000);
  assert.equal(before - vit(P.B), 2, 'ระเบิด −2');
  assert.equal(P.B.statuses.hburn, 1, 'ลุกไหม้ 1');
  assert.equal(vit(P.D), dBefore, 'ดิเอโก้ไม่โดนระเบิดของตัวเอง');
  assert.equal(Object.keys(L().oil).length, 0);
  assert.equal(Object.keys(L().fire).length, 8);
  assert.equal(fxOf('explode').length, 1);
  assert.equal(P.D.diego.cunning, 4, '2 ใช้ + ชุ่มน้ำมัน + ระเบิด');
  P.B.statuses = {};
  // ต้นเทิร์นยืนบนกองไฟ = ลุกไหม้ (ไฟของคนอื่น) · ดิเอโก้ไม่ติดไฟของตัวเอง
  engine.endTurn();
  flush(t, 9000);
  assert.ok(engine.roundNumber >= 3);
  assert.ok(fxOf('burn').some((f) => f.targetId === 'B'), 'กองไฟเผา B ต้นเทิร์น');
  assert.ok(!fxOf('burn').some((f) => f.targetId === 'D'));
  // ครบ 3 เทิร์น = ขี้เถ้า
  for (let i = 0; i < 3 && Object.keys(L().fire).length; i++) { engine.clearPhaseTimer(); engine.endTurn(); flush(t, 9000); }
  assert.equal(Object.keys(L().fire).length, 0);
  assert.equal(Object.keys(L().ash).length, 8);
});

test('ไม้ขีด: คนชุ่มน้ำมันนอกแอ่ง = ระเบิด 3×3 รอบตัว (โดนคนข้างๆ) ชุ่มน้ำมันหาย · คนธรรมดา = ลุกไหม้ 1 · ติดตาข่าย = ลุกไหม้ 3', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['D', 'diego_alt', 2, 8], ['B', 'dummy', 4, 7], ['C', 'dummy', 5, 8], ['E', 'dummy', 2, 4]]);
  engine.setActor('D');
  P.B.statuses.oilSoaked = 2;
  const c0 = vit(P.C);
  tool('D', 'match', { tile: { x: 4, y: 7 }, targets: ['B'] });
  flush(t, 3000);
  assert.equal(c0 - vit(P.C), 2, 'คนข้างๆ โดนระเบิด');
  assert.ok(!(P.B.statuses.oilSoaked > 0));
  assert.equal(Object.keys(L().fire).length > 0, true);
  P.E.statuses = {};
  tool('D', 'match', { tile: { x: 2, y: 4 }, targets: ['E'] });
  flush(t, 3000);
  assert.equal(P.E.statuses.hburn, 1);
  P.D.diego.toolUsed = 0;
  P.E.statuses = { diegoNet: 1, rooted: 1 };
  tool('D', 'match', { tile: { x: 2, y: 4 }, targets: ['E'] });
  flush(t, 3000);
  assert.equal(P.E.statuses.hburn, 3, 'ติดตาข่าย = ลุกไหม้ 3');
});

test('ถังน้ำมันโยนติดกองไฟ = ไฟลาม ระเบิดซ้ำ กองไฟใหม่นับเวลาใหม่', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['D', 'diego_alt', 0, 8], ['B', 'dummy', 5, 8], ['C', 'dummy', 12, 2]]);
  engine.setActor('D');
  engine.board.diego = { oil: {}, fire: { '3,8': { owner: 'D', until: engine.roundNumber + 1 } }, ash: {} };
  const b0 = vit(P.B);
  tool('D', 'oil', { tile: { x: 4, y: 8 } });
  flush(t, 4000);
  assert.equal(b0 - vit(P.B), 2, 'ระเบิดทันที');
  assert.equal(L().fire['4,8'].until, engine.roundNumber + diego.FIRE_TURNS);
  assert.equal(L().fire['3,8'].until, engine.roundNumber + diego.FIRE_TURNS, 'กองไฟเดิมที่ถูกทับนับใหม่');
});

test('ตาข่ายดัก: เห็นเฉพาะเจ้าของ · ศัตรูเดินเข้า = หยุด ถูกดึงไปกลาง + ตรึง · ตาข่ายหาย · วางได้พร้อมกัน 3', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['D', 'diego_alt', 2, 7], ['B', 'dummy', 9, 8], ['C', 'dummy', 12, 2]]);
  engine.setActor('D');
  tool('D', 'net', { tile: { x: 5, y: 8 } });
  flush(t, 2000);
  assert.deepEqual(view('D', 'D').diego.nets, [{ x: 5, y: 8 }]);
  assert.equal(view('B', 'D').diego.nets, undefined);
  assert.ok(calls.private.every((c) => c.ids.length === 1 && c.ids[0] === 'D'), 'เอฟเฟกต์วางตาข่ายส่งเจ้าของเท่านั้น');
  assert.ok(!fxOf('net').length);
  engine.setActor('B');
  engine.moveTo('B', 6, 8);
  assert.deepEqual(P.B.pos, { x: 5, y: 8 }, 'ดึงไปกลางตาข่าย');
  assert.ok((P.B.statuses.rooted || 0) > 0 && (P.B.statuses.diegoNet || 0) > 0);
  assert.equal(engine.action.locked, true, 'การเดินของตานี้จบ');
  assert.equal(P.D.diego.nets.length, 0, 'ตาข่ายหาย');
  assert.equal(fxOf('netTrap').length, 1);
  engine.setActor('D');
  P.D.diego.toolUsed = 0; tool('D', 'net', { tile: { x: 2, y: 4 } }); flush(t, 2000);
  P.D.diego.toolUsed = 0; tool('D', 'net', { tile: { x: 0, y: 7 } }); flush(t, 2000);
  P.D.diego.toolUsed = 0; tool('D', 'net', { tile: { x: 4, y: 5 } }); flush(t, 2000);
  const sp = P.D.skillPoints;
  P.D.diego.toolUsed = 0; tool('D', 'net', { tile: { x: 1, y: 9 } }); flush(t, 2000);
  assert.equal(P.D.skillPoints, sp, 'ตาข่ายที่ 4 วางไม่ได้');
  assert.equal(P.D.diego.nets.length, 3);
  engine.placeOnBoard(1);
  assert.equal(P.D.diego.nets.length, 0, 'เปลี่ยนแผนที่ = ล้างตาข่าย');
});

test('ตาข่ายดัก: ถูกผลักเข้าพื้นที่ก็ทำงาน', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['D', 'diego_alt', 2, 7], ['B', 'dummy', 8, 8], ['C', 'dummy', 12, 2]]);
  engine.setActor('D');
  tool('D', 'net', { tile: { x: 5, y: 8 } });
  flush(t, 2000);
  const ctx = engine.ice.begin();
  engine.ice.pushUnit(P.B, { x: -1, y: 0 }, ctx);
  engine.ice.flush(ctx);
  assert.deepEqual(P.B.pos, { x: 7, y: 8 }, 'ผลักยังไม่ถึงตาข่าย');
  engine.ice.pushUnit(P.B, { x: -1, y: 0 }, engine.ice.begin());
  assert.deepEqual(P.B.pos, { x: 5, y: 8 }, 'เข้าตาข่าย = ถูกดึงไปกลาง');
  assert.ok((P.B.statuses.rooted || 0) > 0);
});

test('มีด 4×1 โดนแค่คนแรก −1 · ปฐมพยาบาล ฟื้น 2 + เกราะ 1 ได้ 2 ครั้งต่อเกม', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['D', 'diego_alt', 2, 8], ['B', 'dummy', 4, 8], ['C', 'dummy', 5, 8]]);
  engine.setActor('D');
  const b0 = vit(P.B), c0 = vit(P.C);
  tool('D', 'knife', { dir: 'right' });
  flush(t, 2000);
  assert.deepEqual([b0 - vit(P.B), c0 - vit(P.C)], [1, 0]);
  assert.equal(P.D.skillPoints, 6, 'มีด 2 แต้ม');
  P.D.hp = 2; P.D.armor = 0;
  tool('D', 'aid');
  flush(t, 2000);
  assert.deepEqual([P.D.hp, P.D.armor, P.D.diego.aid], [4, 1, 1]);
  P.D.diego.toolUsed = 0;
  tool('D', 'aid'); flush(t, 2000);
  P.D.diego.toolUsed = 0;
  const hp = P.D.hp;
  tool('D', 'aid'); flush(t, 2000);
  assert.equal(P.D.diego.aid, 0);
  assert.equal(P.D.hp, hp, 'ครั้งที่ 3 ใช้ไม่ได้');
});

test('ปืนลูกโม่: แนว 5×1 คนแรก −1 · ไม่กินโควตา · ล็อกการเดิน · ตาละ 1 นัด · หมด 4 นัด = รีโหลด 5 เทิร์น', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['D', 'diego_alt', 2, 8], ['B', 'dummy', 7, 8], ['C', 'dummy', 12, 2]]);
  engine.setActor('D');
  const b0 = vit(P.B);
  engine.useSkill('D', 'secondary', [], { dir: 'right' });
  flush(t, 2000);
  assert.equal(b0 - vit(P.B), 1);
  assert.equal(P.D.skillUsedRound, false);
  assert.equal(engine.action.locked, true);
  engine.useSkill('D', 'secondary', [], { dir: 'right' });
  flush(t, 2000);
  assert.equal(P.D.diego.ammo, 3, 'ตาละ 1 นัด');
  P.D.diego.ammo = 1; P.D.diego.shotRound = 0;
  engine.useSkill('D', 'secondary', [], { dir: 'up' });
  flush(t, 2000);
  assert.equal(P.D.diego.ammo, 0);
  assert.equal(view('D', 'D').diego.reloadCd, 5);
  P.D.diego.reloadRound = engine.roundNumber + 1;
  engine.endTurn();
  flush(t, 9000);
  assert.equal(P.D.diego.ammo, 4, 'รีโหลดครบ = เต็ม');
});

test('เดอะเวิลด์ counter: ศัตรูตีโดน = ยกเลิกทั้งก้อน → ตาหยุดเวลาแทรกทันที (สกิล 5 ครั้ง ตีปกติไม่ได้) · ดาเมจค้างจนเวลาเดินต่อ · แล้วกลับไปตาของผู้ตีต่อ', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['D', 'diego_alt', 2, 8], ['B', 'dummy', 3, 8], ['C', 'dummy', 12, 2]]);
  P.D.diego.cunning = 6;
  orderUpTo(t, ['D', 'B', 'C'], 'D');
  engine.useSkill('D', 'ultimate', []);
  flush(t, 2000);
  assert.equal(P.D.diego.cunning, 1, 'เล่ห์เหลี่ยม −5');
  assert.equal(P.D.skillPoints, 8, 'ไม่ใช้แต้มสกิล');
  assert.equal(view('D', 'D').diego.worldArmed, true);
  // ศัตรูไม่รู้ว่ากดแล้ว (ผู้ใช้สั่ง): ไม่มีเอฟเฟกต์/เสียงถึงศัตรู · สถานะ/เล่ห์เหลี่ยม/คูลดาวน์ซ่อน
  assert.equal(view('B', 'D').diego.worldArmed, null);
  assert.equal(view('B', 'D').diego.cunning, null);
  assert.equal(view('B', 'D').skillLocks, undefined);
  assert.ok(!fxOf('world').length, 'ไม่ broadcast');
  assert.ok(calls.private.some((c) => c.payload.kind === 'world' && c.ids.length === 1 && c.ids[0] === 'D'));
  assert.ok(calls.sfx.filter((c) => c.s === 'diego_world' || c.s === 'diego_v_skill3').every((c) => c.onlyFor && c.onlyFor.length === 1 && c.onlyFor[0] === 'D'));
  engine.finishActor();
  assert.equal(engine.actorId, 'B');
  const d0 = vit(P.D);
  engine.attackTarget('B', 'D');
  assert.equal(vit(P.D), d0, 'ไม่โดน');
  assert.equal(engine.actorId, 'D', 'ตาหยุดเวลาทันที');
  assert.equal(engine.action.extra, 'counter');
  assert.ok(engine.buildStateFor('C').timeFreeze, 'หยุดเวลา');
  assert.ok(fxOf('timeStop').some((f) => f.mode === 'counter' && f.attackerId === 'B'));
  assert.ok(calls.sfx.some((c) => c.s === 'diego_v_skill3_counter'));
  flush(t, 3000);
  assert.equal(engine.gameState, 'ACTION');
  // ระหว่างหยุดเวลา: คลังเครื่องมือไม่จำกัด · มีด 1 แต้ม · ดาเมจลงแต่ผู้ชมเห็นค่าเดิม
  const b0 = vit(P.B), shown = view('C', 'B');
  assert.equal(engine.attackTarget('D', 'B'), false, 'ตาหยุดเวลาตีปกติไม่ได้');
  for (let i = 0; i < 3; i++) { tool('D', 'knife', { dir: 'right' }); flush(t, 2000); }
  assert.equal(P.D.skillPoints, 5, 'มีด 1 แต้ม × 3');
  assert.equal(b0 - vit(P.B), 3);
  assert.equal(vit(view('C', 'B')), vit(shown), 'ค่าที่เห็นค้างไว้');
  engine.useSkill('D', 'secondary', [], { dir: 'right' }); flush(t, 2000);
  engine.useSkill('D', 'secondary', [], { dir: 'right' }); flush(t, 2000);
  assert.equal(P.D.diego.ammo, 2, 'ยิงได้หลายนัดในตาหยุดเวลา');
  assert.equal(view('D', 'D').diego.toolLeft, 0, 'ครบ 5 ครั้ง');
  const sp5 = P.D.skillPoints;
  tool('D', 'knife', { dir: 'right' }); flush(t, 2000);
  assert.equal(P.D.skillPoints, sp5, 'ครั้งที่ 6 ใช้ไม่ได้');
  engine.waitAction('D');
  assert.equal(engine.gameState, 'ATTACKING', 'ฉากเวลาเดินต่อ');
  flush(t, 2000);
  assert.ok(!engine.buildStateFor('C').timeFreeze);
  assert.equal(vit(view('C', 'B')), vit(P.B), 'ดาเมจโชว์แล้ว');
  assert.ok(fxOf('timeResume').some((f) => f.hits.some((h) => h.id === 'B' && h.dmg === 5)));
  assert.equal(engine.actorId, 'B', 'กลับไปตาของผู้ตีต่อ');
  assert.equal(engine.gameState, 'ACTION');
  assert.ok(engine.attackTarget('B', 'D'), 'ผู้ตีเล่นตาต่อได้ (ตีใหม่ได้)');
  flush(t, 6000);
  assert.equal(engine.actorId, 'C', 'แล้วลำดับเดินต่อตามปกติ');
});

test('เดอะเวิลด์ counter: สกิลพื้นที่ที่โดนดิเอโก้ = ยกเลิกทั้งก้อน (คนอื่นไม่โดน · แต้มคืน)', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['D', 'diego_alt', 4, 8], ['G', 'gyro_zeppeli', 2, 8], ['C', 'dummy', 6, 8]]);
  P.D.diego.cunning = 5;
  P.G.gyro.golden = 10;
  orderUpTo(t, ['D', 'G', 'C'], 'D');
  engine.useSkill('D', 'ultimate', []);
  flush(t, 2000);
  engine.finishActor();
  assert.equal(engine.actorId, 'G');
  const c0 = vit(P.C), sp = P.G.skillPoints;
  engine.useSkill('G', 'secondary', [], { dir: 'right' });
  flush(t, 4000);
  assert.equal(vit(P.C), c0, 'คนหลังดิเอโก้ไม่โดน');
  assert.equal(P.G.skillPoints, sp, 'แต้มคืน');
  assert.equal(P.G.gyro.golden, 10, 'สัดส่วนทองคำคืน');
  assert.ok(engine.actorId === 'D' || fxOf('timeStop').length > 0);
});

test('เดอะเวิลด์ ปกติ: ไม่ถูกตี = ต้นเทิร์นหน้าได้ตาหยุดเวลาก่อนทุกคน แล้วตาปกติยังอยู่', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['D', 'diego_alt', 2, 8], ['B', 'dummy', 9, 8]]);
  P.D.diego.cunning = 5;
  orderUpTo(t, ['B', 'D'], 'D');
  engine.useSkill('D', 'ultimate', []);
  flush(t, 2000);
  engine.finishActor();
  flush(t, 15000); // จบเทิร์น → เทิร์นใหม่ (ช่วงจั่วไพ่)
  for (const p of Object.values(engine.players)) p.locked = true;
  engine.clearPhaseTimer();
  engine.beginOrder();
  engine.turnOrder.splice(0, engine.turnOrder.length, 'B', 'D');
  flush(t, 6600);
  assert.equal(engine.actorId, 'D', 'ตาหยุดเวลาก่อนทุกคน');
  assert.equal(engine.action.extra, 'normal');
  assert.ok(calls.sfx.some((c) => c.s === 'diego_v_skill3_normal'));
  flush(t, 3000);
  engine.waitAction('D');
  flush(t, 2000);
  assert.equal(engine.actorId, 'B', 'แล้วเริ่มลำดับปกติ');
  engine.finishActor();
  assert.equal(engine.actorId, 'D', 'ตาปกติของดิเอโก้ยังอยู่');
  assert.ok(!engine.action.extra);
});

test('เป็นไปดั่งกลอุบาย: เฉพาะตาหยุดเวลา · ขี่ม้า · พุ่งชนศัตรูคนแรก −4 + เลือดไหล 2 + กระเด็น 2 · กระสุน −1 · คลิป intro/final · เวลาเดินต่อ + จบตา', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['D', 'diego_alt', 1, 8], ['B', 'dummy', 4, 8], ['C', 'dummy', 12, 2]]);
  engine.setActor('D');
  assert.equal(view('D', 'D').character.ultimate.name, 'เดอะเวิลด์');
  P.D.diego.cunning = 0;
  engine.setActor('D');
  engine.action.extra = 'normal';
  P.D.diego.stopping = false;
  // เข้าตาหยุดเวลาตรงๆ
  engine.timeStop.queueExtra('D', 'normal');
  engine.beginOrder();
  engine.turnOrder.splice(0, engine.turnOrder.length, 'D', 'B', 'C');
  flush(t, 6600 + 3000);
  assert.equal(engine.action.extra, 'normal');
  assert.equal(view('D', 'D').character.ultimate.name, 'เป็นไปดั่งกลอุบาย');
  const b0 = vit(P.B);
  calls.cut = [];
  P.D.diego.mounted = false;
  engine.useSkill('D', 'ultimate', [], { dir: 'right' });
  assert.deepEqual(calls.cut, [], 'ไม่ได้ขี่ม้า = ใช้ไม่ได้');
  assert.equal(view('D', 'D').skillLocks.ultimate.locked, true);
  P.D.diego.mounted = true;
  engine.useSkill('D', 'ultimate', [], { dir: 'right' });
  assert.deepEqual(calls.cut, ['diegoPlotIntro']);
  flush(t, 4000);
  assert.ok(calls.cut.includes('diegoPlotFinal'), 'ชน = คลิป final');
  assert.equal(b0 - vit(P.B), 4);
  assert.equal(P.B.statuses.hbleed, 2);
  assert.deepEqual(P.B.pos, { x: 6, y: 8 }, 'กระเด็น 2 ช่อง');
  assert.deepEqual(P.D.pos, { x: 4, y: 8 }, 'ดิเอโก้ยืนช่องเดิมของเป้า');
  assert.equal(P.D.diego.ammo, 3, 'กระสุน 1 นัด');
  assert.equal(P.D.skillPoints, 4);
  flush(t, 4000);
  assert.ok(!P.D.diego.stopping, 'เวลาเดินต่อ');
  assert.equal(engine.actorId, 'D', 'ตาปกติของดิเอโก้ต่อ (ลำดับแรก)');
});

test('ม้าซิลเวอร์ บูลเล็ต: รับดาเมจก่อนเกราะ · ตาย = เรียกไม่ได้ 3 เทิร์น', () => {
  const P = setup([['D', 'diego_alt', 2, 8], ['B', 'dummy', 9, 8]]);
  engine.dealMixed(P.D, 3);
  assert.deepEqual([P.D.hp, P.D.armor, P.D.diego.mounted], [6, 2, false]);
  assert.equal(view('D', 'D').diego.horseCd, 3);
  assert.equal(engine.movOf(P.D), 4);
});

test('ดิเอโก้สองคน: ไฟของ A เผา B · ตาข่ายแยกเจ้าของ', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['A', 'diego_alt', 2, 8], ['B', 'diego_alt', 4, 8], ['C', 'dummy', 12, 2]]);
  engine.setActor('A');
  tool('A', 'oil', { tile: { x: 4, y: 8 } });
  flush(t, 3000);
  const b0 = vit(P.B) + P.B.diego.horseHp;
  tool('A', 'match', { tile: { x: 4, y: 8 }, targets: ['B'] });
  flush(t, 3000);
  assert.equal(b0 - (vit(P.B) + P.B.diego.horseHp), 2, 'A ระเบิดใส่ B ได้ (ม้ารับก่อน)');
  engine.setActor('B');
  tool('B', 'net', { tile: { x: 8, y: 8 } });
  flush(t, 2000);
  assert.equal(P.B.diego.nets.length, 1);
  assert.equal(P.A.diego.nets.length, 0);
  assert.equal(view('A', 'B').diego.nets, undefined);
});

test('เดอะเวิลด์ counter: ดาเมจที่ลงทีหลังในฉากสกิล (Mouse Separade ของโซระ) ก็ถูกตัด — ย้อนตำแหน่ง/แต้ม/คูลดาวน์', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['D', 'diego_alt', 5, 8], ['S', 'sora_otosumi', 2, 8], ['C', 'dummy', 12, 2]]);
  P.D.diego.cunning = 5;
  P.S.sora.myth = true;
  orderUpTo(t, ['D', 'S', 'C'], 'D');
  engine.useSkill('D', 'ultimate', []);
  flush(t, 2000);
  engine.finishActor();
  assert.equal(engine.actorId, 'S');
  const sp = P.S.skillPoints, d0 = vit(P.D);
  engine.useSkill('S', 'ultimate', [], { dir: 'right' });
  assert.ok(P.S.skillPoints < sp, 'จ่ายแต้มไปก่อน');
  flush(t, 12000);
  assert.equal(vit(P.D), d0, 'ไม่โดน');
  assert.equal(P.S.skillPoints, sp, 'แต้มคืน');
  assert.deepEqual(P.S.pos, { x: 2, y: 8 }, 'ตำแหน่งย้อนกลับ');
  assert.equal(P.S.sora.ultReady, 0, 'คูลดาวน์ย้อน');
  assert.ok(fxOf('timeStop').some((f) => f.attackerId === 'S'));
});
