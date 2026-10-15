// กิระ (kira) — สวมเกราะราชัน / คลื่นความมืด / อัฐิราชา / บดขยี้ส่วนเกิน บนกระดาน
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const kira = require('../../characters/kira.js');
const { CHAR_BY_ID } = require('../../characters.js');
const action = require('../../server/phases/action.js');

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

test('ข้อมูล: ระดับง่าย · เดิน 4 ตีประชิด · 0 / 4 / 8 แต้ม · คลื่นความมืดแนว 4×3 (สกิลโจมตี)', () => {
  const ch = CHAR_BY_ID.kira;
  assert.equal(ch.name, 'ราชาแมลงอวกาศ', 'ชื่อในหน้าเลือกตัว');
  assert.equal(ch.difficulty, 'easy');
  assert.equal(ch.mov, 4);
  assert.deepEqual(ch.range, [1, 1]);
  assert.equal(ch.basic.cost, 0);
  assert.equal(ch.secondary.cost, 4);
  assert.equal(ch.ultimate.cost, 8);
  assert.deepEqual(ch.basic.area, { kind: 'self' });
  assert.deepEqual(ch.secondary.area, { kind: 'line', len: 4, width: 3, hostile: true });
  assert.deepEqual(ch.ultimate.area, { kind: 'self' });
  assert.match(ch.secondary.desc, /4×3/);
  assert.match(ch.passive.desc, /4×1/);
  const P = setup([['K', 'kira', 2, 7], ['B', 'dummy', 12, 12]]);
  assert.equal(P.K.kira.king, false, 'เริ่มเกมร่างกิระ');
});

test('สวมเกราะราชัน: 0 แต้ม · สลับร่างไปกลับ · ไม่กินโควตา ไม่มีคูลดาวน์ · ล็อกการเดิน · รูป/ระยะ/เสียงตามร่าง', () => {
  const P = setup([['K', 'kira', 2, 7], ['B', 'dummy', 12, 12]]);
  engine.setActor('K');
  assert.equal(view('K', 'K').character.basic.img, kira.IMG.toKing, 'ปุ่มโชว์ร่างที่จะเปลี่ยนไป');
  engine.useSkill('K', 'basic', []);
  assert.equal(P.K.kira.king, true);
  assert.equal(P.K.skillPoints, 8);
  assert.equal(P.K.skillUsedRound, false, 'ไม่นับเป็นการใช้สกิล');
  assert.equal(engine.action.locked, true, 'ใช้แล้วเดินไม่ได้');
  assert.equal(kira.skillSound(P.K, 'basic'), 'kira_armor');
  const me = view('K', 'K');
  assert.equal(me.img, kira.IMG.king);
  assert.deepEqual(me.range, [1, 4]);
  assert.equal(me.lane, true);
  assert.equal(me.kira.king, true);
  assert.equal(me.character.basic.img, kira.IMG.toKira);
  engine.useSkill('K', 'basic', []);
  assert.equal(P.K.kira.king, false, 'สลับกลับในเทิร์นเดียวกันได้');
  assert.equal(kira.skillSound(P.K, 'basic'), 'kira_unarmor');
  assert.deepEqual(view('K', 'K').range, [1, 1]);
  P.K.skillUsedRound = true;
  engine.useSkill('K', 'basic', []);
  assert.equal(P.K.kira.king, true, 'ใช้โควตาไปแล้วก็ยังสวมเกราะได้');
});

test('บดขยี้ส่วนเกิน (ร่างราชา): ตีปกติแนวตรง 4×1 โดนศัตรูทุกคนในแนว · นอกแนวตีไม่ได้ · เสียง/ลำแสงม่วง', () => {
  const P = setup([['K', 'kira', 2, 7], ['A', 'dummy', 3, 7], ['B', 'dummy', 6, 7], ['C', 'dummy', 3, 8], ['D', 'dummy', 7, 7]]);
  P.K.kira.king = true;
  Math.random = () => 0.99;
  engine.setActor('K');
  const can = (id) => action.canStrike(P.K, P[id]);
  assert.ok(can('A') && can('B'));
  assert.ok(!can('C'), 'เฉียง = นอกแนว');
  assert.ok(!can('D'), 'ห่าง 5 = เกินระยะ');
  const a0 = vit(P.A), b0 = vit(P.B);
  engine.attackTarget('K', 'B');
  engine.clearPhaseTimer();
  assert.ok(vit(P.A) < a0, 'คนหน้าในแนวโดนด้วย');
  assert.ok(vit(P.B) < b0);
  const card = engine.buildStateFor('K').attack;
  assert.equal(card.byAttackSound, 'kira_sweep');
  assert.equal(card.byStyle, 'kiraSlash', 'คลื่นฟันดำขอบแดง');
  assert.equal(card.byBeam, 0, 'ไม่ใช่ลำแสงแล้ว');
  assert.ok(Array.isArray(card.byLane) && card.byLane.length === 4, 'ส่งช่องทั้งแนวให้ client วาดคลื่น');
  assert.equal(kira.attackSound({ characterId: 'kira', kira: { king: false } }), 'kira_hit');
});

test('คลื่นความมืด: ศัตรูในแนว 4×3 เสียหาย 1 (เกราะก่อน) · แถวข้างถูกบีบเข้าแถวกลางหลังคลื่นจบ · ไม่โดนเพื่อน · กินโควตา', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([
    ['K', 'kira', 2, 7, 't1'], ['A', 'dummy', 3, 6, 't2'], ['B', 'dummy', 4, 7, 't2'], ['C', 'dummy', 5, 8, 't2'],
    ['F', 'dummy', 6, 6, 't1'], ['X', 'dummy', 7, 7, 't2'],
  ], 'duo');
  P.A.armor = 1;
  engine.setActor('K');
  const a0 = vit(P.A), b0 = vit(P.B), c0 = vit(P.C), f0 = vit(P.F), x0 = vit(P.X);
  engine.useSkill('K', 'secondary', [], { dir: 'right' });
  assert.equal(P.K.skillPoints, 4);
  assert.equal(P.K.skillUsedRound, true);
  assert.equal(engine.action.locked, true);
  assert.equal(vit(P.A), a0, 'ดาเมจลงตอนยอดคลื่นซัดถึง (ยังไม่ลงทันทีที่กด)');
  t.mock.timers.tick(400);
  assert.equal(P.A.armor, 0, 'เกราะรับก่อน');
  assert.equal(vit(P.A), a0 - 1);
  assert.equal(vit(P.B), b0 - 1);
  assert.equal(vit(P.C), c0 - 1);
  assert.equal(vit(P.F), f0, 'เพื่อนร่วมทีมไม่โดน');
  assert.equal(vit(P.X), x0, 'นอกแนว (ห่าง 5) ไม่โดน');
  assert.deepEqual(calls.fx.find((f) => f.event === 'darkWaveFx').payload, { from: { x: 2, y: 7 }, dir: 'right', len: 4, width: 3, color: engine.colorOf(P.K) });
  assert.equal(engine.gameState, 'ATTACKING', 'พักให้คลื่นเล่นก่อนบีบ');
  assert.deepEqual(P.A.pos, { x: 3, y: 6 }, 'ยังไม่ขยับระหว่างคลื่น');
  flush(t);
  assert.deepEqual(P.A.pos, { x: 3, y: 7 });
  assert.deepEqual(P.B.pos, { x: 4, y: 7 }, 'แถวกลางอยู่ที่เดิม');
  assert.deepEqual(P.C.pos, { x: 5, y: 7 });
  assert.deepEqual(P.F.pos, { x: 6, y: 6 }, 'เพื่อนไม่ถูกบีบ');
  const knocks = calls.fx.filter((f) => f.event === 'iceFx').flatMap((f) => f.payload.events);
  assert.deepEqual(knocks.map((e) => [e.kind, e.id]), [['knock', 'A'], ['knock', 'C']]);
  assert.ok(calls.sfx.includes('kira_squeeze'));
  assert.equal(engine.gameState, 'ACTION', 'กลับมาตาเดินต่อ');
  assert.equal(engine.actorId, 'K');
});

test('คลื่นความมืด: ช่องกลางไม่ว่าง = ไปช่องว่างที่ใกล้ช่องกลางที่สุด · ตายแล้วไม่ถูกบีบ · ไม่เลือกทิศ = กดไม่ได้ (ไม่เสียแต้ม)', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['K', 'kira', 2, 7], ['A', 'dummy', 3, 6], ['B', 'dummy', 3, 7], ['C', 'dummy', 5, 8]]);
  P.C.hp = 1; P.C.armor = 0;
  engine.setActor('K');
  engine.useSkill('K', 'secondary', []);
  assert.equal(P.K.skillPoints, 8, 'ไม่เลือกทิศ');
  engine.useSkill('K', 'secondary', [], { dir: 'right' });
  t.mock.timers.tick(400);
  assert.equal(P.C.alive, false);
  assert.equal(P.C.pos, null);
  flush(t);
  assert.deepEqual(P.B.pos, { x: 3, y: 7 });
  assert.deepEqual(P.A.pos, { x: 4, y: 7 }, 'ช่องกลาง (3,7) มีคน → ช่องว่างแนวกลางที่ติดกัน');
});

test('อัฐิราชา: 8 แต้ม · 3 เทิร์น (รวมเทิร์นที่กด) ตายแล้วฟื้นพลังชีวิต 1 ไม่จำกัดครั้ง · พลังโจมตี +2 · 2 ครั้งต่อเกม', () => {
  const P = setup([['K', 'kira', 2, 7], ['B', 'dummy', 3, 7]]);
  Math.random = () => 0.99;
  const base = engine.doAttack('K', 'B').dmg;
  P.B.hp = 10; P.B.armor = 0;
  engine.setRoundNumber(5);
  engine.setActor('K');
  engine.useSkill('K', 'ultimate', []);
  assert.equal(P.K.skillPoints, 0);
  assert.equal(P.K.skillUsedRound, true);
  assert.equal(calls.flash.length, 0);
  assert.equal(view('K', 'K').kira.ult, 3);
  assert.equal(engine.doAttack('K', 'B').dmg, base + 2, 'พลังโจมตี +2');
  // ตายกี่ครั้งก็ฟื้น
  for (let i = 0; i < 3; i++) {
    P.K.hp = 1; P.K.armor = 0;
    engine.dealMixed(P.K, 5);
    engine.resolveDamageAftermath(P.K);
    assert.equal(P.K.alive, true);
    assert.equal(P.K.hp, 1);
  }
  assert.equal(P.K.kira.revives, 3);
  assert.equal(calls.flash.at(-1).sound, 'kira_revive');
  // กดซ้ำระหว่างมีผลไม่ได้
  P.K.skillUsedRound = false; P.K.skillPoints = 8;
  engine.useSkill('K', 'ultimate', []);
  assert.equal(P.K.skillPoints, 8);
  assert.equal(view('K', 'K').skillLocks.ultimate.locked, true);
  engine.setRoundNumber(7);
  assert.equal(view('K', 'K').kira.ult, 1, 'เทิร์นสุดท้าย');
  P.K.hp = 0; engine.resolveDamageAftermath(P.K);
  assert.equal(P.K.alive, true);
  engine.setRoundNumber(8);
  assert.equal(view('K', 'K').kira.ult, 0, 'หมดผล');
  assert.equal(engine.doAttack('K', 'B').dmg, base);
  // ครั้งที่สอง ได้ · ครั้งที่สามไม่ได้
  engine.setActor('K');
  P.K.skillUsedRound = false; P.K.skillPoints = 8;
  engine.useSkill('K', 'ultimate', []);
  assert.equal(P.K.skillPoints, 0);
  engine.setRoundNumber(11);
  engine.setActor('K');
  P.K.skillUsedRound = false; P.K.skillPoints = 8;
  engine.useSkill('K', 'ultimate', []);
  assert.equal(P.K.skillPoints, 8, 'ใช้ครบ 2 ครั้งแล้ว');
  assert.equal(view('K', 'K').kira.ultUses, 0);
  P.K.hp = 0; engine.resolveDamageAftermath(P.K);
  assert.equal(P.K.alive, false, 'หมดผลแล้วตายจริง');
});

test('อัฐิราชา: โดนตีปกติจนเลือดหมดบนกระดาน = ฟื้นยืนที่เดิม', () => {
  const P = setup([['K', 'kira', 2, 7], ['B', 'dummy', 3, 7]]);
  Math.random = () => 0.99;
  P.K.kira.ultUntil = engine.roundNumber + 2;
  P.K.hp = 1; P.K.armor = 0;
  engine.setActor('B');
  engine.attackTarget('B', 'K');
  engine.clearPhaseTimer();
  assert.equal(P.K.alive, true);
  assert.equal(P.K.hp, 1);
  assert.deepEqual(P.K.pos, { x: 2, y: 7 });
});

test('บดขยี้ส่วนเกิน (ร่างกิระ): ครบ 2 เทิร์นต่อเนื่อง ฟื้นพลังชีวิต 2 + แต้มสกิล 1 · เทิร์นที่สลับร่างไม่นับ · ร่างราชาไม่ได้', () => {
  const P = setup([['K', 'kira', 2, 7], ['B', 'dummy', 12, 12]]);
  const tick = () => { kira.onEndTurn(engine); engine.setRoundNumber(engine.roundNumber + 1); };
  P.K.hp = 3; P.K.skillPoints = 0;
  engine.setRoundNumber(1);
  tick();
  assert.equal(P.K.hp, 3);
  assert.equal(view('K', 'K').kira.calm, 1);
  tick();
  assert.equal(P.K.hp, 5);
  assert.equal(P.K.skillPoints, 1);
  assert.ok(calls.sfx.includes('kira_regen'));
  // สลับร่างกลางทาง = นับใหม่ (เทิร์นที่สลับไม่นับ)
  tick();
  P.K.kira.king = true; P.K.kira.switchRound = engine.roundNumber; P.K.kira.calm = 0;
  tick();
  P.K.kira.king = false; P.K.kira.switchRound = engine.roundNumber;
  tick();
  assert.equal(P.K.kira.calm, 0);
  tick();
  assert.equal(P.K.kira.calm, 1);
  assert.equal(P.K.hp, 5, 'ยังไม่ครบ');
  tick();
  assert.equal(P.K.hp, 7);
});

// ---------- ออร่าหมอกดำแดง / เพลงอัฐิราชา / คลิปแปลงร่าง / ถูกตรึง ----------

test('ออร่าหมอกดำแดง (ร่างราชา): จบเทิร์น ศัตรูประชิดเสียหาย 1 (เกราะก่อน · ฆ่าได้) · ห่าง 2 / เพื่อนไม่โดน · ร่างกิระไม่มีออร่า', () => {
  const P = setup([
    ['K', 'kira', 4, 7, 't1'], ['A', 'dummy', 3, 7, 't2'], ['B', 'dummy', 4, 8, 't2'], ['C', 'dummy', 6, 7, 't2'],
    ['F', 'dummy', 5, 7, 't1'], ['D', 'dummy', 4, 6, 't2'],
  ], 'duo');
  P.A.armor = 1;
  P.B.hp = 1; P.B.armor = 0;
  // ร่างกิระ: ไม่มีออร่า
  const before = Object.fromEntries(['A', 'B', 'C', 'D', 'F'].map((id) => [id, vit(P[id])]));
  kira.onEndTurn(engine);
  for (const id of Object.keys(before)) assert.equal(vit(P[id]), before[id], `ร่างกิระไม่กัด ${id}`);
  assert.ok(!calls.sfx.includes('kira_wave'));
  // ร่างราชา
  P.K.kira.king = true;
  const a0 = P.A.hp, d0 = vit(P.D);
  kira.onEndTurn(engine);
  assert.equal(P.A.armor, 0, 'เกราะรับก่อน');
  assert.equal(P.A.hp, a0);
  assert.equal(vit(P.D), d0 - 1);
  assert.equal(P.B.alive, false, 'ฆ่าได้');
  assert.equal(P.B.pos, null);
  assert.equal(vit(P.C), before.C, 'ห่าง 2 ไม่โดน');
  assert.equal(vit(P.F), before.F, 'เพื่อนร่วมทีมไม่โดน');
  assert.ok(calls.sfx.includes('kira_wave'));
});

test('ออร่าหมอกดำแดง: ไม่มีศัตรูประชิด = ไม่มีเสียง · ร่างราชาไม่นับเทิร์นฟื้นของร่างกิระ', () => {
  const P = setup([['K', 'kira', 2, 7], ['B', 'dummy', 12, 12]]);
  P.K.kira.king = true;
  P.K.hp = 3; P.K.skillPoints = 0;
  engine.setRoundNumber(1);
  for (let i = 0; i < 4; i++) { kira.onEndTurn(engine); engine.setRoundNumber(engine.roundNumber + 1); }
  assert.equal(P.K.kira.calm, 0);
  assert.equal(P.K.hp, 3);
  assert.equal(P.K.skillPoints, 0);
  assert.equal(calls.sfx.length, 0);
});

test('เพลงอัฐิราชา: เล่นเฉพาะระหว่างท่าไม้ตาย (ไม่เล่นตอนเปลี่ยนร่าง) · ทุกคนได้ยิน · สองคนเปิด คนเปิดทีหลังได้เพลง · หมดผล/ตาย = ไม่มี', () => {
  const P = setup([['K', 'kira', 2, 7], ['L', 'kira', 6, 8], ['B', 'dummy', 12, 12]]);
  engine.setRoundNumber(5);
  engine.setActor('K');
  engine.useSkill('K', 'basic', []);
  assert.equal(P.K.kira.king, true);
  assert.equal(engine.buildStateFor('K').skillMusic, null, 'เปลี่ยนร่างเฉยๆ ไม่มีเพลง');
  engine.useSkill('K', 'ultimate', []);
  const s = engine.buildStateFor('K');
  assert.equal(s.skillMusic, 'kira_king');
  assert.equal(s.skillMusicSeq, P.K.kira.ultAt);
  assert.equal(engine.buildStateFor('B').skillMusic, 'kira_king', 'ทุกคนได้ยิน');
  // สองคนเปิด: ultAt มากกว่าชนะ
  P.K.kira.ultAt = 100;
  P.L.kira.ultUntil = 7; P.L.kira.ultAt = 200;
  assert.equal(engine.buildStateFor('K').skillMusicSeq, 200);
  P.K.kira.ultAt = 300;
  assert.equal(engine.buildStateFor('K').skillMusicSeq, 300);
  // ตาย = ไม่นับ
  P.K.alive = false;
  assert.equal(engine.buildStateFor('B').skillMusicSeq, 200);
  // หมดผล (เทิร์น 8) = ไม่มีเพลง
  engine.setRoundNumber(8);
  assert.equal(engine.buildStateFor('B').skillMusic, null);
});

test('คลิปสวมเกราะราชัน: คิว kiraTransform ครั้งแรกที่เข้าร่างราชาเท่านั้น (ต่อเกม)', () => {
  const P = setup([['K', 'kira', 2, 7], ['B', 'dummy', 12, 12]]);
  engine.setActor('K');
  engine.useSkill('K', 'basic', []);
  assert.equal(P.K.kira.king, true);
  assert.deepEqual(calls.queue, ['kiraTransform']);
  engine.useSkill('K', 'basic', []);
  engine.useSkill('K', 'basic', []);
  assert.equal(P.K.kira.king, true);
  assert.deepEqual(calls.queue, ['kiraTransform'], 'สวมซ้ำไม่เล่นคลิปอีก');
});

// ลำดับเดินจริง: ids ตามลำดับ · เดินผ่านไปจนถึงตาของ actorId (คนก่อนหน้า = hasActed)
function orderUpTo(t, ids, actorId) {
  engine.beginOrder();
  engine.turnOrder.splice(0, engine.turnOrder.length, ...ids);
  flush(t, 6600);
  while (engine.actorId !== actorId) engine.finishActor();
}

test('คลื่นความมืด: แถวข้างติดถูกตรึงหลังคลื่นจบ · แถวกลางไม่ติด · เดินไปแล้ว = 2 เทิร์น ยังไม่เดิน = 1', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['A', 'dummy', 3, 6], ['K', 'kira', 2, 7], ['B', 'dummy', 4, 7], ['C', 'dummy', 5, 8]]);
  orderUpTo(t, ['A', 'K', 'B', 'C'], 'K');
  assert.equal(engine.hasActed('A'), true);
  assert.equal(engine.hasActed('C'), false);
  engine.useSkill('K', 'secondary', [], { dir: 'right' });
  assert.equal(P.A.statuses.rooted, undefined, 'ยังไม่ติดระหว่างคลื่น');
  flush(t);
  assert.equal(P.A.statuses.rooted, 2, 'เดินไปแล้ว = ติดถึงเทิร์นหน้า');
  assert.equal(P.C.statuses.rooted, 1);
  assert.equal(P.B.statuses.rooted, undefined, 'แถวกลางไม่ติด');
  assert.equal(engine.movOf(P.A), 0);
  assert.ok(engine.movOf(P.B) > 0);
});

test('คลื่นความมืด: ไม่มีช่องให้บีบก็ยังติดถูกตรึง', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['K', 'kira', 2, 7], ['A', 'dummy', 4, 6], ['B', 'dummy', 4, 7], ['C', 'dummy', 3, 7], ['D', 'dummy', 5, 7]]);
  engine.setActor('K');
  engine.useSkill('K', 'secondary', [], { dir: 'right' });
  flush(t);
  assert.deepEqual(P.A.pos, { x: 4, y: 6 }, 'ไม่ถูกบีบ');
  assert.equal(P.A.statuses.rooted, 1);
  assert.ok(!calls.sfx.includes('kira_squeeze'));
});

test('ถูกตรึง: เดินไม่ได้ (mov 0) แต่ใช้สกิล/ตีปกติได้', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['K', 'kira', 2, 7], ['Z', 'kira', 3, 6]]);
  Math.random = () => 0.99;
  engine.setActor('K');
  engine.useSkill('K', 'secondary', [], { dir: 'right' });
  flush(t);
  assert.deepEqual(P.Z.pos, { x: 3, y: 7 });
  assert.equal(P.Z.statuses.rooted, 1);
  assert.equal(engine.movOf(P.Z), 0);
  assert.equal(view('Z', 'Z').mov, 0);
  engine.setActor('Z');
  assert.equal(engine.moveTo('Z', 4, 7), false, 'เดินไม่ได้');
  assert.equal(engine.action.locked, false);
  assert.deepEqual(P.Z.pos, { x: 3, y: 7 });
  engine.useSkill('Z', 'basic', []);
  assert.equal(P.Z.kira.king, true, 'ใช้สกิลได้');
  const k0 = vit(P.K);
  assert.ok(engine.attackTarget('Z', 'K'), 'ตีปกติได้');
  engine.clearPhaseTimer();
  assert.ok(vit(P.K) < k0);
});

test('ถูกตรึง: ต้านสถานะผิดปกติกันได้ · ล้างดีบัฟแล้วเดินได้', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['K', 'kira', 2, 7], ['A', 'dummy', 3, 6], ['C', 'dummy', 5, 8]]);
  P.A.statuses.resist = 2;
  engine.setActor('K');
  engine.useSkill('K', 'secondary', [], { dir: 'right' });
  flush(t);
  assert.equal(P.A.statuses.rooted, undefined, 'ต้านไว้');
  assert.deepEqual(P.A.pos, { x: 3, y: 7 }, 'ยังถูกบีบ');
  assert.equal(P.C.statuses.rooted, 1);
  engine.cleanseDebuffs(P.C);
  assert.equal(P.C.statuses.rooted, undefined);
  assert.equal(engine.movOf(P.C), engine.baseMovOf(P.C));
  engine.setActor('C');
  assert.equal(engine.moveTo('C', 5, 6), true, 'ล้างแล้วเดินได้');
});

test('คลื่นความมืด (กันเกมค้าง): คนแถวข้างตาย/หายระหว่างบีบ (ไถลชนกัน) = ข้ามไป ไม่ error · กลับตาเดินได้ · ตัวใหญ่แถวข้างถูกตรึงแต่ไม่ถูกบีบ', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['K', 'kira', 2, 7], ['A', 'dummy', 3, 6], ['C', 'dummy', 5, 8], ['G', 'dummy', 5, 5]]);
  P.G.boardSize = 2; // กิน (5,5)-(6,6) — แถวข้างบน
  const real = engine.ice.resolveEntry;
  engine.ice.resolveEntry = (u, dir, ctx) => { if (u.id === 'A') { P.C.alive = false; P.C.pos = null; } return real(u, dir, ctx); };
  t.after(() => { engine.ice.resolveEntry = real; });
  engine.setActor('K');
  engine.useSkill('K', 'secondary', [], { dir: 'right' });
  flush(t);
  assert.deepEqual(P.A.pos, { x: 3, y: 7 });
  assert.equal(P.C.statuses.rooted, undefined, 'ตายไปแล้ว ไม่ติดตรึง');
  assert.equal(P.G.statuses.rooted, 1, 'ตัวใหญ่ถูกตรึง');
  assert.deepEqual(P.G.pos, { x: 5, y: 5 }, 'ตัวใหญ่ไม่ถูกบีบ');
  assert.equal(engine.gameState, 'ACTION');
  assert.equal(engine.actorId, 'K');
});

test('เพลงอัฐิราชา: ลำดับใช้ตัวนับเดียวกับมุยมิ (ไม่ใช่เวลาจริง) · จบเกมแล้วไม่เล่น', () => {
  const P = setup([['K', 'kira', 2, 7], ['B', 'dummy', 12, 12]]);
  engine.setActor('K');
  engine.useSkill('K', 'ultimate', []);
  assert.ok(P.K.kira.ultAt > 0 && P.K.kira.ultAt < 1e6, 'engine.nextTransformCounter');
  assert.equal(engine.buildStateFor('K').skillMusic, 'kira_king');
  engine.setGameState('GAMEOVER');
  assert.equal(engine.buildStateFor('K').skillMusic, null);
  engine.setGameState('ACTION');
});
