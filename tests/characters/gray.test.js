// เกรย์ (gray) — คนเฝ้าสุสาน / Grave (จงบ้าคลั่ง) / รองโกมิเนียต (ชาร์จ 2 เทิร์น) / สัปเหร่อ (ศพค้าง + เก็บศพ)
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const gray = require('../../characters/gray.js');
const { CHAR_BY_ID } = require('../../characters.js');
const action = require('../../server/phases/action.js');

const realRandom = Math.random;
const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
// list = [[id, characterId, x, y, teamId?], ...] — แถว y = 6..8 ช่วง x = 2..12 ของภูมิภาค I เป็นพื้นโล่ง (แบบเทสต์กิระ)
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
// จบเทิร์น → ฉากเปลี่ยนเทิร์น (TRANSITION_TIME 3 วิ) → dealRound (ช่วงจั่วไพ่ของเทิร์นถัดไป)
//  (ครบช่วงภูมิภาค = ฉากเดินทางก่อน — รอจนถึงช่วงจั่วไพ่)
const nextRound = (t) => {
  engine.endTurn();
  for (let i = 0; i < 300 && engine.gameState !== 'PLAYING'; i++) t.mock.timers.tick(100);
  engine.clearPhaseTimer();
};
const kill = (p) => { p.hp = 0; p.armor = 0; engine.instantDeath(p); };

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

// ลำดับเดินจริง: ids ตามลำดับ · เดินผ่านไปจนถึงตาของ actorId (คนก่อนหน้า = hasActed)
function orderUpTo(t, ids, actorId) {
  engine.beginOrder();
  engine.turnOrder.splice(0, engine.turnOrder.length, ...ids);
  flush(t, 6600);
  while (engine.actorId !== actorId && engine.actorId) engine.finishActor();
}

test('ข้อมูล: ระดับกลาง · เดิน 4 ตีประชิด · 3 / 3 / 6 แต้ม · รองโกมิเนียตแนวยาวสุดสนาม กว้าง 7 (สกิลโจมตี)', () => {
  const ch = CHAR_BY_ID.gray;
  assert.equal(ch.name, 'เกรย์');
  assert.equal(ch.difficulty, 'medium');
  assert.equal(ch.mov, 4);
  assert.deepEqual(ch.range, [1, 1]);
  assert.deepEqual([ch.basic.cost, ch.secondary.cost, ch.ultimate.cost], [3, 3, 6]);
  assert.deepEqual(ch.basic.area, { kind: 'self' });
  assert.deepEqual(ch.secondary.area, { kind: 'self' });
  assert.deepEqual(ch.ultimate.area, { kind: 'line', len: 14, width: 7, hostile: true });
  assert.equal(ch.ultimate.name, 'รองโกมิเนียต');
  assert.equal(ch.passive.name, 'สัปเหร่อ');
});

test('คนเฝ้าสุสาน: 3 แต้ม · หลบหลีก 100% 1 เทิร์น · เยียวยา 1 · คูลดาวน์ 2 เทิร์น · ล็อกการเดิน', () => {
  const P = setup([['G', 'gray', 3, 7], ['B', 'dummy', 10, 7]]);
  engine.setRoundNumber(3);
  engine.setActor('G');
  engine.useSkill('G', 'basic', []);
  assert.equal(P.G.skillPoints, 5);
  assert.equal(P.G.statuses.evade, 1);
  assert.equal(engine.statusAmtOf(P.G, 'evade'), 100);
  assert.equal(P.G.statuses.mend, 2);
  assert.equal(engine.statusAmtOf(P.G, 'mend'), 1);
  assert.equal(engine.action.locked, true);
  assert.equal(calls.fx[0].event, 'grayFx');
  assert.equal(calls.fx[0].payload.kind, 'keeper');
  assert.equal(view('G', 'G').skillLocks.basic.cd, 2);
  // เทิร์นถัดไปยังใช้ไม่ได้ (ไม่เสียแต้ม) · เทิร์น +2 ใช้ได้
  engine.setRoundNumber(4); P.G.skillUsedRound = false; engine.setActor('G');
  engine.useSkill('G', 'basic', []);
  assert.equal(P.G.skillPoints, 5);
  engine.setRoundNumber(5); P.G.skillUsedRound = false; engine.setActor('G');
  engine.useSkill('G', 'basic', []);
  assert.equal(P.G.skillPoints, 2);
});

test('Grave: จงบ้าคลั่ง 2 เทิร์น — ระยะตี 2 · คริ +25% · ตีลงติดถูกตรึง · หมดแล้วกลับประชิด · คูลดาวน์ 2', () => {
  const P = setup([['G', 'gray', 3, 7], ['B', 'dummy', 5, 7]]);
  engine.setRoundNumber(2);
  engine.setActor('G');
  assert.equal(action.canStrike(P.G, P.B), false, 'ปกติตีห่าง 2 ไม่ได้');
  engine.useSkill('G', 'secondary', []);
  assert.equal(P.G.skillPoints, 5);
  assert.equal(P.G.gray.frenzy, 2);
  assert.deepEqual(engine.rangeOf(P.G), [1, 2]);
  assert.equal(gray.critPct(P.G), 25);
  assert.equal(view('G', 'G').gray.frenzy, 2);
  Math.random = () => 0.99; // ไม่คริ
  const b0 = vit(P.B);
  assert.equal(engine.attackTarget('G', 'B'), true, 'ตีห่าง 2 ได้');
  engine.clearPhaseTimer();
  assert.ok(vit(P.B) < b0);
  assert.equal(P.B.statuses.rooted, 1, 'ยังไม่เดิน = 1 เทิร์น');
  const card = engine.buildStateFor('G').attack;
  assert.equal(card.byStyle, 'grayBow', 'ห่าง 2 = ธนู');
  assert.equal(card.byAttackSound, 'gray_bow');
  engine.endTurn(); engine.clearPhaseTimer();
  assert.equal(P.G.gray.frenzy, 1);
  engine.endTurn(); engine.clearPhaseTimer();
  assert.equal(P.G.gray.frenzy, 0);
  assert.equal(gray.range(P.G), null, 'หมดแล้วกลับระยะปกติ');
  assert.equal(gray.critPct(P.G), 0);
});

test('ตีปกติประชิด: สุ่มค้อน/เคียว (เสียงตามอาวุธ) · จงบ้าคลั่ง = ท่า Grave', () => {
  const P = setup([['G', 'gray', 3, 7], ['B', 'dummy', 4, 7]]);
  Math.random = () => 0.1;
  assert.equal(gray.attackStyle(P.G, 1), 'grayScythe');
  assert.equal(gray.attackSound(P.G), 'gray_scythe');
  Math.random = () => 0.9;
  assert.equal(gray.attackStyle(P.G, 1), 'grayHammer');
  assert.equal(gray.attackSound(P.G), 'gray_hammer');
  P.G.gray.frenzy = 1;
  assert.equal(gray.attackStyle(P.G, 1), 'grayHammerGrave');
  assert.equal(gray.attackStyle(P.G, 2), 'grayBow');
  assert.equal(gray.attackSound(P.G), 'gray_bow');
});

test('จงบ้าคลั่ง: เป้าที่เดินไปแล้วเทิร์นนี้ติดถูกตรึงถึงเทิร์นหน้า · ต้านสถานะกันได้', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['G', 'gray', 3, 7], ['B', 'dummy', 4, 7], ['C', 'dummy', 3, 8]]);
  P.G.gray.frenzy = 2;
  Math.random = () => 0.99;
  orderUpTo(t, ['B', 'C', 'G'], 'G');
  engine.attackTarget('G', 'B');
  engine.clearPhaseTimer();
  assert.equal(P.B.statuses.rooted, 2, 'เดินไปแล้ว = 2 (ลดตอนจบเทิร์นนี้)');
  P.C.statuses.resist = 2;
  engine.setActor('G');
  engine.attackTarget('G', 'C');
  engine.clearPhaseTimer();
  assert.ok(!P.C.statuses.rooted, 'ต้านได้');
});

test('สัปเหร่อ: คนตายทิ้งศพระหว่างที่เกรย์อยู่ · เก็บศพประชิด = ฟื้น 2 + พลังโจมตีถาวร (สูงสุด +2) · จบตา · ห่าง 2 เก็บไม่ได้', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['G', 'gray', 3, 7], ['A', 'dummy', 4, 7], ['C', 'dummy', 6, 7], ['D', 'dummy', 3, 6], ['B', 'dummy', 12, 12]]);
  kill(P.A); kill(P.C); kill(P.D);
  assert.deepEqual(P.A.corpse, { x: 4, y: 7 }, 'ศพค้าง');
  assert.deepEqual(view('B', 'A').corpse, { x: 4, y: 7 }, 'ทุกคนเห็นศพ');
  assert.equal(view('G', 'G').gray.reaper, true);
  P.G.hp = 3;
  engine.setActor('G');
  assert.equal(engine.attackTarget('G', 'corpse:C'), false, 'ห่าง 3 เก็บไม่ได้');
  assert.equal(engine.attackTarget('G', 'corpse:A'), true);
  assert.equal(P.A.corpse, null, 'ศพหาย');
  assert.equal(P.G.hp, 5, 'ฟื้นพลังชีวิต 2');
  assert.equal(P.G.gray.souls, 1);
  assert.equal(engine.gameState, 'ATTACKING');
  assert.ok(calls.fx.some((f) => f.payload.kind === 'reap'));
  assert.ok(calls.sfx.includes('gray_reap'));
  flush(t, 2000);
  assert.notEqual(engine.actorId, 'G', 'เก็บศพ = จบตา');
  // พลังโจมตี +1 ต่อศพ
  const ctx = {};
  assert.equal(gray.damageBonus(engine, P.G, P.B, ctx), 1);
  // ศพที่ 2 / 3 — พลังโจมตีไม่เกิน +2 แต่ยังฟื้นพลังชีวิต
  engine.setActor('G');
  engine.attackTarget('G', 'corpse:D');
  engine.clearPhaseTimer();
  assert.equal(P.G.gray.souls, 2);
  P.C.corpse = { x: 4, y: 7 };
  engine.setActor('G');
  P.G.hp = 2;
  engine.attackTarget('G', 'corpse:C');
  engine.clearPhaseTimer();
  assert.equal(P.G.gray.souls, 2, 'สูงสุด 2');
  assert.equal(P.G.hp, 4);
  assert.equal(gray.damageBonus(engine, P.G, P.B, {}), 2);
});

test('สัปเหร่อ: เกรย์ตาย ศพหายหมด · ไม่มีเกรย์ = ไม่ทิ้งศพ · ศพเคทที่ถูกเก็บ = ฟื้นไม่ได้จนเปลี่ยนภูมิภาค', () => {
  const P = setup([['G', 'gray', 3, 7], ['A', 'dummy', 4, 7], ['B', 'dummy', 12, 12]]);
  kill(P.A);
  assert.ok(P.A.corpse);
  kill(P.G);
  assert.equal(P.A.corpse, null);
  const Q = setup([['A', 'dummy', 4, 7], ['B', 'dummy', 12, 12]]);
  kill(Q.A);
  assert.equal(Q.A.corpse || null, null);
  // ระบบคู่: ศพเคทถูกเก็บ → placeCorpses (เปลี่ยนภูมิภาค) วางร่างข้างเอมิลิโกะใหม่
  const R = setup([['G', 'gray', 3, 7], ['K', 'kate', 4, 7], ['B', 'dummy', 12, 12]]);
  const emi = Object.values(engine.players).find((u) => u.characterId === 'emiliko');
  emi.pos = { x: 8, y: 7 };
  kill(R.K);
  assert.ok(R.K.corpse);
  engine.setActor('G');
  assert.equal(engine.attackTarget('G', 'corpse:K'), true);
  engine.clearPhaseTimer();
  assert.equal(R.K.corpse, null);
  engine.placeOnBoard(1);
  assert.ok(R.K.corpse, 'เปลี่ยนภูมิภาค = ร่างกลับมา');
});

test('รองโกมิเนียต: 6 แต้ม · เลือกทิศ → คลิป intro · ชาร์จ: เดิน/ตี/สกิล/ปืน/จั่วไม่ได้ · เพลง · ทุกคนเห็นแนว', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['G', 'gray', 3, 7], ['B', 'dummy', 8, 7], ['C', 'dummy', 4, 7]]);
  engine.setRoundNumber(4);
  engine.setActor('G');
  engine.useSkill('G', 'ultimate', []);
  assert.equal(P.G.skillPoints, 8, 'ไม่เลือกทิศ = กดไม่ได้');
  engine.useSkill('G', 'ultimate', [], { dir: 'right' });
  assert.equal(P.G.skillPoints, 2);
  assert.deepEqual(calls.queue, ['grayUltIntro']);
  assert.deepEqual(P.G.gray.charge.dir, 'right');
  assert.equal(P.G.gray.charge.fire, 6);
  assert.equal(vit(P.B), vit(engine.players.B), 'ยังไม่โดนตอนกด');
  assert.equal(engine.movOf(P.G), 0);
  assert.equal(action.canStrike(P.G, P.C), false, 'ตีปกติไม่ได้');
  assert.equal(engine.attackTarget('G', 'C'), false);
  P.G.skillUsedRound = false;
  engine.useSkill('G', 'basic', []);
  assert.equal(P.G.skillPoints, 2, 'สกิลอื่นใช้ไม่ได้');
  P.G.inventory = [{ uid: 'gun', type: 'gutsGun' }, { uid: 'a1', type: 'gutsAmmo', ammo: Object.keys(engine.GUTS_AMMO)[0] }];
  assert.equal(engine.gutsFireTargetOf(P.G, P.G.inventory[1], 'C'), null, 'ปืนยิงไม่ได้');
  const st = view('B', 'G').gray;
  assert.equal(st.charge.left, 2);
  assert.ok(st.charge.tiles.some((t) => t.x === 8 && t.y === 7), 'แนวลำแสงส่งให้ทุกคน');
  assert.ok(st.charge.tiles.every((t) => t.x > 3), 'เฉพาะด้านขวา');
  assert.equal(new Set(st.charge.tiles.map((t) => t.y)).size, 7, 'กว้าง 7');
  assert.equal(engine.buildStateFor('B').skillMusic, 'gray_ult');
  assert.equal(view('G', 'G').skillLocks.ultimate.locked, true);
  // เทิร์นถัดไป: ช่วงจั่วไพ่ล็อก (จั่วไม่ได้)
  nextRound(t);
  assert.equal(engine.roundNumber, 5);
  assert.equal(P.G.locked, true);
  const n = P.G.cards.length;
  engine.hit('G');
  assert.equal(P.G.cards.length, n);
});

test('รองโกมิเนียต: ยิงต้นตาเดินของเกรย์เทิร์น N+2 → คลิป final → ดาเมจ 5 +2/ศพ (ไม่รับบัฟ · เกราะก่อน · ไม่โดนพวก) · กลับตาเดิน · คูลดาวน์ 5', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['G', 'gray', 3, 7, 't1'], ['B', 'dummy', 9, 7, 't2'], ['C', 'dummy', 12, 4, 't2'], ['F', 'dummy', 6, 8, 't1'], ['D', 'dummy', 6, 2, 't2']], 'duo');
  P.G.gray.souls = 2;
  P.G.statuses.empower = 1; P.G.statusAmt.might = 3; // บัฟพลังโจมตีไม่มีผล
  P.G.gray.charge = { dir: 'right', cast: 4, fire: 6, at: 1 };
  engine.setRoundNumber(6);
  for (const id of ['B', 'C', 'F', 'D']) { engine.players[id].hp = 10; engine.players[id].armor = 2; }
  P.C.statuses.fragile = 2; P.C.statusAmt.fragile = 1;
  Math.random = () => 0.99;
  orderUpTo(t, ['B', 'G'], 'G');
  assert.ok(calls.queue.includes('grayUltFinal'), 'คลิป final');
  flush(t, 6000);
  const beam = calls.fx.find((f) => f.payload.kind === 'beam');
  assert.ok(beam, 'ลำแสงบนกระดาน');
  assert.equal(vit(P.B), 12 - 7, '5 + 1 ต่อศพ (2 ศพ) = 7');
  assert.equal(vit(P.C), 12 - 8, 'เปราะบาง +1');
  P.G.gray.souls = 5;
  assert.equal(gray.ULT_DMG + gray.SOUL_DMG * Math.min(gray.SOUL_MAX, P.G.gray.souls), 7, 'แรงสุด 7');
  assert.equal(vit(P.F), 12, 'พวกเดียวกันไม่โดน');
  assert.equal(vit(P.D), 12, 'นอกแนว (y 2 อยู่นอกกว้าง 7 รอบ y 7)');
  assert.equal(P.G.gray.charge, null);
  assert.equal(engine.gameState, 'ACTION', 'กลับตาเดิน');
  assert.equal(engine.actorId, 'G');
  assert.equal(view('G', 'G').gray.ultCd, 3);
  assert.equal(engine.buildStateFor('G').skillMusic || null, null, 'เพลงหยุด');
});

test('รองโกมิเนียต: หลบหลีกหลบได้ · คุ้มครองลด · ฆ่าได้แล้วทิ้งศพ', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['G', 'gray', 3, 7], ['B', 'dummy', 9, 7], ['C', 'dummy', 6, 6], ['E', 'dummy', 7, 8]]);
  P.G.gray.charge = { dir: 'right', cast: 4, fire: 6, at: 1 };
  engine.setRoundNumber(6);
  P.B.hp = 10; P.B.armor = 0; engine.applyEvade(P.B, 100);
  P.C.hp = 10; P.C.armor = 0; P.C.statuses.guard = 2; P.C.statusAmt.guard = 2;
  P.E.hp = 3; P.E.armor = 1;
  Math.random = () => 0.5;
  orderUpTo(t, ['G'], 'G');
  flush(t, 6000);
  assert.equal(P.B.hp, 10, 'หลบได้');
  assert.equal(P.C.hp, 10 - 3, 'คุ้มครอง 2');
  assert.equal(P.E.alive, false);
  assert.deepEqual(P.E.corpse, { x: 7, y: 8 }, 'ตายแล้วทิ้งศพให้เก็บ');
});

test('รองโกมิเนียต: เกรย์ตายระหว่างชาร์จ = ยกเลิก · ถูกข้ามตา (สตั้น) = เลื่อนไปยิงเทิร์นหน้า', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['G', 'gray', 3, 7], ['B', 'dummy', 9, 7]]);
  P.G.gray.charge = { dir: 'right', cast: 4, fire: 6, at: 1 };
  kill(P.G);
  assert.equal(P.G.gray.charge, null);
  const Q = setup([['G', 'gray', 3, 7], ['B', 'dummy', 9, 7], ['C', 'dummy', 12, 12]]);
  Q.G.gray.charge = { dir: 'right', cast: 4, fire: 6, at: 1 };
  engine.setRoundNumber(6);
  Q.G.statuses.stun = 1;
  Q.B.hp = 10; Q.B.armor = 0;
  Math.random = () => 0.99;
  orderUpTo(t, ['G', 'C'], 'C');
  assert.ok(!calls.queue.includes('grayUltFinal'), 'ถูกข้ามตา = ยังไม่ยิง');
  nextRound(t);
  assert.equal(Q.G.gray.charge.fire, 7, 'เลื่อนไปเทิร์นหน้า');
  assert.equal(Q.G.locked, true, 'ยังจั่วไม่ได้');
  Q.G.statuses = {};
  Q.G.pos = { x: 3, y: 7 }; Q.B.pos = { x: 9, y: 7 }; Q.C.pos = { x: 12, y: 12 }; // ครบช่วงภูมิภาค = จุดเกิดใหม่
  orderUpTo(t, ['G', 'C'], 'G');
  assert.ok(calls.queue.includes('grayUltFinal'));
  flush(t, 6000);
  assert.ok(Q.B.hp < 10, 'ยิงแล้ว');
});

test('รองโกมิเนียต: คลิป intro / final เล่นทุกครั้ง (ไม่ใช่ครั้งแรกต่อเกม — ผู้ใช้สั่ง)', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['G', 'gray', 3, 7], ['B', 'dummy', 9, 7]]);
  for (const round of [4, 20]) {
    engine.setRoundNumber(round);
    P.G.skillPoints = 8; P.G.skillUsedRound = false; P.G.gray.ultReady = 0;
    engine.setActor('G');
    engine.useSkill('G', 'ultimate', [], { dir: 'right' });
    engine.setRoundNumber(round + 2);
    P.B.hp = 10; P.B.alive = true; P.B.pos = { x: 9, y: 7 };
    orderUpTo(t, ['G'], 'G');
    flush(t, 6000);
    engine.clearPhaseTimer();
  }
  assert.deepEqual(calls.queue, ['grayUltIntro', 'grayUltFinal', 'grayUltIntro', 'grayUltFinal']);
});

test('รองโกมิเนียต: ถึงตาเกรย์เทิร์น N+1 ศัตรูในแนวติดถูกตรึงจนถึงตอนยิง · หนีออกในเทิร์น N = รอด · พวกเดียวกันไม่ติด · ต้านได้', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['G', 'gray', 3, 7, 't1'], ['B', 'dummy', 9, 7, 't2'], ['C', 'dummy', 10, 6, 't2'], ['E', 'dummy', 8, 8, 't2'], ['F', 'dummy', 6, 8, 't1'], ['H', 'dummy', 12, 12, 't2']], 'duo');
  engine.setRoundNumber(4);
  engine.setActor('G');
  engine.useSkill('G', 'ultimate', [], { dir: 'right' });
  assert.equal(P.G.gray.charge.fire, 6, 'ยิงต้นตาเดินเทิร์น N+2');
  assert.ok(!P.B.statuses.rooted, 'ตอนกดยังไม่ตรึง');
  // เทิร์น N: E หนีออกจากแนว (ไปแถว y 12)
  P.E.pos = { x: 8, y: 12 };
  P.C.statuses.resist = 3;
  engine.setRoundNumber(5);
  calls.fx = []; calls.sfx = [];
  // B เดินก่อนเกรย์ (เดินไปแล้ว) · เกรย์ถึงคิว = ตรึง
  orderUpTo(t, ['B', 'G', 'H'], 'G');
  assert.equal(P.B.statuses.rooted, 2, 'อยู่ถึงจบเทิร์นที่ยิง');
  assert.ok(!P.C.statuses.rooted, 'ต้านได้');
  assert.ok(!P.E.statuses.rooted, 'หนีออกแล้วรอด');
  assert.ok(!P.F.statuses.rooted, 'พวกเดียวกันไม่ติด');
  assert.ok(!P.H.statuses.rooted, 'นอกแนว');
  assert.ok(calls.fx.some((f) => f.payload.kind === 'grave' && f.payload.id === 'B'), 'โซ่พันคนที่ถูกตรึง');
  assert.ok(calls.sfx.includes('gray_chains'));
  assert.ok(!calls.queue.includes('grayUltFinal'), 'เทิร์นชาร์จยังไม่ยิง');
  assert.equal(engine.movOf(P.B), 0);
  // ตรึงครั้งเดียวต่อการชาร์จ
  P.B.statuses.rooted = 1;
  engine.finishActor();
  assert.equal(P.B.statuses.rooted, 1);
});
