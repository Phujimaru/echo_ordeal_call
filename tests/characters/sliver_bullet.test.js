// นักบินปริศนา (sliver_bullet) — เปลี่ยนชิ้นส่วน / Beam Magnum / ซุ่มโจมตี (ล่องหน) บนกระดาน (GRID_PLAN §7.5)
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const pilot = require('../../characters/sliver_bullet.js');
const { CHAR_BY_ID } = require('../../characters.js');

const realRandom = Math.random;
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
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.skillPoints = 8; p.skillUsedRound = false; p.shield = 0;
    p.statuses = {}; p.statusAmt = {};
  }
  return engine.players;
}
const view = (viewerId, id) => engine.buildStateFor(viewerId).players.find((p) => p.id === id);

const saved = {
  triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash,
  notifyTransform: engine.notifyTransform, sfx: engine.sfx, boardFx: engine.boardFx,
};
const calls = { queue: [], notice: [], sfx: [], fx: [] };
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = (p, key, onlyFor) => calls.queue.push({ key, onlyFor });
  engine.skillFlash = () => {};
  engine.notifyTransform = (p, key, onlyFor) => calls.notice.push({ key, onlyFor });
  engine.sfx = (sound, onlyFor) => calls.sfx.push({ sound, onlyFor });
  engine.boardFx = (event, payload) => calls.fx.push({ event, payload });
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.beforeEach(() => { for (const k of Object.keys(calls)) calls[k] = []; });
test.afterEach(() => { Math.random = realRandom; engine.setGameMode('ffa'); engine.clearPhaseTimer(); });

test('ข้อมูล: พลังชีวิต 5 · เกราะ 2 · ไม่มีท่าไม้ตาย · Beam Magnum แนว 6×1 (สกิลโจมตี) · unique', () => {
  const ch = CHAR_BY_ID.sliver_bullet;
  assert.equal(ch.ultimate, null);
  assert.equal(ch.unique, true);
  assert.deepEqual(ch.basic.area, { kind: 'self' });
  assert.deepEqual(ch.secondary.area, { kind: 'line', len: 6, width: 1, hostile: true });
  const P = setup([['S', 'sliver_bullet', 1, 5], ['B', 'dummy', 5, 5], ['C', 'dummy', 9, 5]]);
  assert.equal(engine.maxHpOf(P.S), 5);
  assert.equal(engine.maxArmorOf(P.S), 2);
  assert.equal(P.S.hp, 5);
  assert.equal(P.S.armor, 2);
  assert.equal(P.S.sliver.arm, true, 'เริ่มเกมมีแขน');
  assert.equal(engine.maxHpOf(P.B), 7, 'ตัวอื่นยังเท่าเดิม');
});

test('ซุ่มโจมตี: ffa 3 คนขึ้นไป = เริ่มเกมล่องหน · ศัตรูได้ pos null และเล็ง/ตีไม่ได้ · ตัวเองเห็นแบบโปร่งแสง', () => {
  const P = setup([['S', 'sliver_bullet', 5, 5], ['B', 'dummy', 6, 5], ['C', 'dummy', 9, 5]]);
  assert.equal(P.S.sliver.hidden, true);
  const fromB = view('B', 'S');
  assert.equal(fromB.pos, null);
  assert.equal(fromB.sliver.hidden, false, 'ศัตรูไม่รู้สถานะล่องหน');
  assert.equal(fromB.veiled, false);
  const self = view('S', 'S');
  assert.deepEqual(self.pos, { x: 5, y: 5 });
  assert.equal(self.sliver.hidden, true);
  assert.equal(self.veiled, true);
  engine.setActor('B');
  assert.equal(engine.attackTarget('B', 'S'), false, 'ตีคนที่มองไม่เห็นไม่ได้');
  assert.equal(engine.buildStateFor('B').forecast.S, undefined);
});

test('ซุ่มโจมตี: ffa เหลือ 2 คน / โหมด duo = ไม่ล่องหน · มีคนตายจนเหลือ 2 = ปรากฏตัว', () => {
  let P = setup([['S', 'sliver_bullet', 5, 5], ['B', 'dummy', 6, 5]]);
  assert.equal(P.S.sliver.hidden, false);
  P = setup([['S', 'sliver_bullet', 1, 5, 't1'], ['A', 'dummy', 3, 5, 't1'], ['B', 'dummy', 8, 5, 't2'], ['C', 'dummy', 10, 5, 't2']], 'duo');
  assert.equal(P.S.sliver.hidden, false, 'duo เพื่อนร่วมทีมมีแค่ 1');
  P = setup([['S', 'sliver_bullet', 5, 5], ['B', 'dummy', 7, 5], ['C', 'dummy', 9, 5]]);
  assert.equal(P.S.sliver.hidden, true);
  engine.instantDeath(P.C);
  assert.equal(P.S.sliver.hidden, false);
  assert.deepEqual(view('B', 'S').pos, { x: 5, y: 5 });
});

test('ซุ่มโจมตี: ตีปกติ = ปรากฏตัว 2 เทิร์น (เทิร์นนี้ + เทิร์นหน้า) แล้วล่องหนอีกครั้ง', () => {
  const P = setup([['S', 'sliver_bullet', 5, 5], ['B', 'dummy', 6, 5], ['C', 'dummy', 9, 5]]);
  engine.setRoundNumber(3);
  engine.setActor('S');
  assert.equal(engine.attackTarget('S', 'B'), true);
  engine.clearPhaseTimer();
  assert.equal(P.S.sliver.hidden, false);
  assert.deepEqual(view('B', 'S').pos, { x: 5, y: 5 });
  assert.equal(view('B', 'S').sliver.revealLeft, 2);
  engine.setRoundNumber(4); pilot.refresh(engine);
  assert.equal(P.S.sliver.hidden, false, 'เทิร์นหน้ายังปรากฏ');
  assert.equal(view('B', 'S').sliver.revealLeft, 1);
  engine.setRoundNumber(5); pilot.refresh(engine);
  assert.equal(P.S.sliver.hidden, true, 'ครบ 2 เทิร์น = ล่องหนอีกครั้ง');
});

test('ซุ่มโจมตี: โดนสกิลโจมตีแบบพื้นที่ = ปรากฏ 2 เทิร์น · ปรากฏอยู่แล้วโดนอีก = ไม่นับเพิ่ม · ตีเองระหว่างปรากฏ = นับใหม่', () => {
  const P = setup([['S', 'sliver_bullet', 5, 5], ['M', 'muimi', 4, 5], ['C', 'dummy', 12, 5]]);
  engine.setRoundNumber(3);
  Math.random = () => 0.99; // ไม่หลบ
  engine.setActor('M');
  engine.useSkill('M', 'ultimate', [], { dir: 'right' });
  assert.equal(P.S.sliver.hidden, false, 'อยู่ในแนวคลื่นดาบ = ปรากฏตัว');
  assert.ok(P.S.hp + P.S.armor < 7, 'โดนดาเมจจริง');
  assert.equal(P.S.sliver.revealUntil, 4);
  // เทิร์นหน้า โดนอีก = ไม่ต่อเวลา
  engine.setRoundNumber(4);
  pilot.onReveal(engine, P.S, 'hit');
  assert.equal(P.S.sliver.revealUntil, 4);
  // ตีเองระหว่างปรากฏ = นับ 2 เทิร์นใหม่
  pilot.onReveal(engine, P.S, 'act');
  assert.equal(P.S.sliver.revealUntil, 5);
});

test('ซุ่มโจมตี: ศัตรูเดินชน = หยุดก่อนถึง การเดินจบ (ยังตีได้) และนักบินปรากฏตัว', () => {
  const P = setup([['S', 'sliver_bullet', 5, 5], ['B', 'dummy', 2, 5], ['C', 'dummy', 12, 12]]);
  engine.setActor('B');
  assert.equal(engine.moveTo('B', 6, 5), true, 'วางเส้นทางทะลุช่องที่มองไม่เห็นได้');
  assert.deepEqual(P.B.pos, { x: 4, y: 5 }, 'หยุดช่องก่อนชน');
  assert.equal(engine.action.locked, true, 'ย้อน/เดินต่อไม่ได้');
  assert.equal(engine.moveTo('B', 4, 6, { step: true }), false);
  assert.equal(P.S.sliver.hidden, false, 'ถูกพบ');
  assert.equal(engine.attackTarget('B', 'S'), true, 'ยังตีได้');
});

test('เปลี่ยนชิ้นส่วน: มีแขน 3 แต้ม ฟื้น 2 · ไม่มีแขน 2 แต้ม ได้แขน ฟื้น 1 · ไม่กินโควตา · ไม่ปรากฏตัว · คลิปครั้งแรกแล้วการ์ด+เสียง (เฉพาะตัวเองตอนล่องหน)', () => {
  const P = setup([['S', 'sliver_bullet', 5, 5], ['B', 'dummy', 8, 5], ['C', 'dummy', 12, 5]]);
  engine.setActor('S');
  assert.equal(view('S', 'S').character.basic.cost, 3);
  P.S.hp = 2;
  engine.useSkill('S', 'basic');
  assert.equal(P.S.skillPoints, 5);
  assert.equal(P.S.hp, 4);
  assert.equal(P.S.skillUsedRound, false, 'ไม่กินโควตา');
  assert.equal(P.S.sliver.hidden, true, 'ไม่ปรากฏตัว');
  assert.equal(engine.action.locked, true, 'ใช้สกิลแล้วเดินไม่ได้');
  assert.deepEqual(calls.queue, [{ key: 'sliverReload', onlyFor: ['S'] }]);
  P.S.sliver.arm = false;
  assert.equal(view('S', 'S').character.basic.cost, 2);
  engine.useSkill('S', 'basic');
  assert.equal(P.S.skillPoints, 3);
  assert.equal(P.S.hp, 5);
  assert.equal(P.S.sliver.arm, true);
  assert.equal(calls.queue.length, 1, 'คลิปเล่นครั้งเดียว');
  assert.deepEqual(calls.notice, [{ key: 'sliverReload', onlyFor: ['S'] }]);
  assert.deepEqual(calls.sfx, [{ sound: 'sliver_reload', onlyFor: ['S'] }]);
});

test('Beam Magnum: แนว 6×1 ทะลุศัตรูทุกคน ดาเมจ 4 (เกราะก่อน · หลบไม่ได้) · เสียแขน · ปรากฏตัว · ไม่จบตา · ลำแสงบนกระดาน', () => {
  const P = setup([['S', 'sliver_bullet', 1, 5], ['B', 'dummy', 4, 5], ['C', 'dummy', 7, 5], ['D', 'dummy', 8, 5]]);
  P.B.armor = 1; P.B.hp = 7;
  P.C.statuses.evade = 1; P.C.statusAmt.evade = 100; // หลบหลีก 100% ก็หลบไม่ได้
  Math.random = () => 0;
  engine.setActor('S');
  engine.useSkill('S', 'secondary', [], { dir: 'right' });
  assert.equal(P.S.skillPoints, 4);
  assert.equal(P.B.armor, 0);
  assert.equal(P.B.hp, 4, 'เกราะ 1 + เลือด 3');
  assert.equal(P.C.hp + P.C.armor, 10 - 4);
  assert.equal(P.D.hp + P.D.armor, 10, 'ช่องที่ 7 นอกแนว');
  assert.equal(P.S.sliver.arm, false);
  assert.equal(P.S.sliver.hidden, false);
  assert.equal(P.S.skillUsedRound, true);
  assert.deepEqual(calls.queue.map((c) => c.key), ['sliverBeam']);
  assert.deepEqual(calls.fx, [{ event: 'beamFx', payload: { from: { x: 1, y: 5 }, dir: 'right', len: 6, color: engine.colorOf(P.S) } }]);
  assert.equal(engine.gameState, 'ACTION', 'ไม่จบตา');
  assert.equal(engine.actorId, 'S');
  // ไม่มีแขน = กดไม่ได้ (ไม่เสียแต้ม) · ปุ่มล็อก
  P.S.skillUsedRound = false;
  engine.useSkill('S', 'secondary', [], { dir: 'right' });
  assert.equal(P.S.skillPoints, 4);
  assert.equal(view('S', 'S').skillLocks.secondary.locked, true);
  // ครั้งที่สอง: ไม่มีคลิป ใช้เสียงยิงแทน
  P.S.sliver.arm = true;
  engine.useSkill('S', 'secondary', [], { dir: 'right' });
  assert.equal(calls.queue.length, 1);
  assert.ok(calls.sfx.some((c) => c.sound === 'sliver_shot'));
});

test('Beam Magnum: ฆ่าได้ (หายจากกระดาน) · โหมดทีมไม่โดนเพื่อน · ไม่เลือกทิศ = กดไม่ได้', () => {
  let P = setup([['S', 'sliver_bullet', 1, 5], ['B', 'dummy', 3, 5], ['C', 'dummy', 12, 12]]);
  P.B.hp = 2; P.B.armor = 1;
  engine.setActor('S');
  engine.useSkill('S', 'secondary', []);
  assert.equal(P.S.skillPoints, 8, 'ไม่เลือกทิศ = ไม่เสียแต้ม');
  engine.useSkill('S', 'secondary', [], { dir: 'right' });
  assert.equal(P.B.alive, false);
  assert.equal(P.B.pos, null);
  P = setup([['S', 'sliver_bullet', 1, 5, 't1'], ['A', 'dummy', 3, 5, 't1'], ['B', 'dummy', 5, 5, 't2'], ['C', 'dummy', 12, 12, 't2']], 'duo');
  engine.setActor('S');
  engine.useSkill('S', 'secondary', [], { dir: 'right' });
  assert.equal(P.A.hp + P.A.armor, 10, 'เพื่อนไม่โดน');
  assert.equal(P.B.hp + P.B.armor, 6);
});

test('ตีปกติใช้เสียงยิงของนักบิน', () => {
  const attack = require('../../server/phases/attack.js');
  const P = setup([['S', 'sliver_bullet', 1, 5], ['B', 'dummy', 2, 5]]);
  assert.equal(attack.attackSoundOf(P.S), 'sliver_shot');
});
