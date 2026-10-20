// เฟิร์น (fern) — Zoltraak (Energy) / Defensive Magic / ร่ายต่อเนื่อง / ซ่อนเร้นมานา / Orbital Cannon Zoltraak (GRID_PLAN §7.14)
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const fern = require('../../characters/fern.js');
const { CHAR_BY_ID } = require('../../characters.js');
const action = require('../../server/phases/action.js');
const match = require('../../server/match.js');
const timers = require('../../server/timers.js');

const realRandom = Math.random;
const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
// แถว y = 7..8 ของภูมิภาค I โล่งตลอด x 0..13
function setup(list, mode = 'ffa') {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, ch, , , team], i) => { engine.players[id] = blank(id, ch, i + 1, team || null); });
  engine.setGameMode(mode);
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setJourneyArea(1);
  engine.setCycleShift(0);
  engine.setRoundNumber(4);
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.skillUsedRound = false; p.shield = 0; p.statuses = {}; p.statusAmt = {}; p.nightTaxTier = null;
    if (p.characterId !== 'fern') p.skillPoints = 8;
  }
  return engine.players;
}
const view = (viewerId, id) => engine.buildStateFor(viewerId).players.find((p) => p.id === id);
const vit = (p) => (p.hp || 0) + (p.armor || 0);
const flush = (t, ms = 6000) => { for (let i = 0; i < ms / 100; i++) t.mock.timers.tick(100); };
const newCommand = () => { match.commandSeq++; };
// ตีปกติแล้วจบฉากตีทันที (เก็บ callback ของตัวจับเวลาไว้เรียกเอง)
function strikeNow(id, targetId) {
  const orig = timers.startPhaseTimer;
  let fire = null;
  timers.startPhaseTimer = (s, fn) => { fire = fn; };
  try {
    const ok = engine.attackTarget(id, targetId);
    if (ok && fire) { const f = fire; fire = null; f(); }
    return ok;
  } finally { timers.startPhaseTimer = orig; engine.clearPhaseTimer(); }
}
const hitBy = (src, target, n = 1) => engine.withEffectSource(src, () => engine.dealMixed(target, n));

const saved = {
  triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash,
  notifyTransform: engine.notifyTransform, sfx: engine.sfx, boardFx: engine.boardFx, boardFxTo: engine.boardFxTo,
};
const calls = { fx: [], own: [], sfx: [], flash: [], queue: [] };
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = (p, key) => calls.queue.push(key);
  engine.skillFlash = (f) => calls.flash.push(f);
  engine.notifyTransform = () => {};
  engine.sfx = (s) => calls.sfx.push(s);
  engine.boardFx = (event, payload) => calls.fx.push({ event, payload });
  engine.boardFxTo = (ids, event, payload) => calls.own.push({ ids, event, payload });
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.beforeEach(() => { for (const k of Object.keys(calls)) calls[k] = []; });
test.afterEach(() => { Math.random = realRandom; engine.setGameMode('ffa'); engine.setCycleShift(0); engine.clearPhaseTimer(); });

test('ข้อมูล: ง่าย · พลังชีวิต 5 เกราะ 2 · เดิน 3 · ตีแนวตรง [1, 3] · ตีสวนได้ · 2 / 0 / 4 Energy · Energy 10 เริ่มเต็ม', () => {
  const ch = CHAR_BY_ID.fern;
  assert.equal(ch.name, 'เฟิร์น');
  assert.equal(ch.difficulty, 'easy');
  assert.equal(ch.mov, 3);
  assert.deepEqual(ch.range, [1, 3]);
  assert.equal(ch.counter, true);
  assert.deepEqual([ch.basic.cost, ch.secondary.cost, ch.ultimate.cost], [2, 0, 4]);
  assert.deepEqual(ch.ultimate.area, { kind: 'tile', range: 99, place: 'free', hostile: false });
  for (const t of ['basic', 'secondary', 'ultimate']) assert.doesNotMatch(ch[t].desc, /ก่อนเปิดไพ่|ไพ่แตก/);
  const P = setup([['F', 'fern', 3, 7], ['B', 'dummy', 9, 7]]);
  assert.equal(P.F.hp, 5);
  assert.equal(P.F.armor, 2);
  assert.equal(P.F.skillPoints, 10, 'เริ่มเกมเต็ม');
  assert.equal(engine.maxSkillOf(P.F), 10);
  assert.equal(action.lanes(P.F), true);
  assert.equal(view('F', 'F').maxSkill, 10);
});

test('Energy: จบเทิร์น/โบนัสกลางวัน/ไอเทม/ไพ่เหลืองไม่ฟื้น · ซ่อนเร้นมานาฟื้นได้ (ไม่เกิน 10)', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['F', 'fern', 3, 7], ['B', 'dummy', 9, 7]]);
  P.F.skillPoints = 4;
  engine.addSkill(P.F, 3, 'item');
  engine.addSkill(P.F, 2, 'card');
  engine.addSkill(P.F, 1, 'passive');
  engine.addSkill(P.F, 1);
  assert.equal(P.F.skillPoints, 4);
  engine.setRoundNumber(1); // จบเทิร์น 1 = เช้าที่มีโบนัส (ถ้ามี) — ทั้งหมดถูกกัน
  P.B.skillPoints = 0;
  engine.endTurn();
  engine.clearPhaseTimer();
  assert.equal(P.F.skillPoints, 4, 'จบเทิร์นไม่ฟื้น');
  assert.ok(P.B.skillPoints >= 1, 'คนอื่นฟื้นตามปกติ');
  engine.setRoundNumber(4);
  engine.setActor('F');
  engine.useSkill('F', 'secondary', []);
  assert.equal(P.F.skillPoints, 7, 'ซ่อนเร้น +3');
  P.F.skillPoints = 9;
  fern.onRoundStartTick(engine, P.F);
  fern.onRoundStartTick(engine, P.F);
  assert.equal(P.F.skillPoints, 10, 'เพดาน 10');
});

test('Zoltraak: 2 Energy ต่อการตี · แนว 3 ช่องโดนทุกคน (ทะลุ) เสียครั้งเดียว · ดาเมจ 2 · ไม่ถึง 2 = ตีไม่ได้', () => {
  const P = setup([['F', 'fern', 3, 7], ['B', 'dummy', 4, 7], ['C', 'dummy', 6, 7], ['D', 'dummy', 7, 7]]);
  for (const id of ['B', 'C', 'D']) { engine.players[id].hp = 10; engine.players[id].armor = 0; }
  P.F.fern.shieldReady = 99;
  engine.setActor('F');
  assert.equal(strikeNow('F', 'B'), true);
  assert.equal(P.F.skillPoints, 8, 'ตีครั้งเดียวเสีย 2 แม้โดน 2 คน');
  assert.equal(P.B.hp, 8, 'ดาเมจ 2');
  assert.equal(P.C.hp, 8, 'คนในแนว (ระยะ 3) โดนด้วย');
  assert.equal(P.D.hp, 10, 'ระยะ 4 ไม่โดน');
  P.F.skillPoints = 1;
  engine.setActor('F');
  assert.deepEqual(action.rangeOf(P.F), [1, 0]);
  assert.equal(strikeNow('F', 'B'), false, 'Energy 1 = ตีไม่ได้');
});

test('ตีสวน: ศัตรูตีประชิด = เฟิร์นสวน เสีย 2 Energy · Energy ไม่ถึง 2 = ไม่สวน', () => {
  const P = setup([['F', 'fern', 3, 7], ['B', 'dummy', 4, 7]]);
  P.B.hp = 10; P.B.armor = 0;
  P.F.hp = 5; P.F.armor = 2;
  P.F.fern.shieldReady = 99;
  engine.setActor('B');
  assert.equal(strikeNow('B', 'F'), true);
  assert.equal(P.F.skillPoints, 8, 'ตีสวนเสีย 2');
  assert.equal(P.B.hp, 8, 'สวน 2');
  P.F.skillPoints = 1;
  engine.setActor('B');
  strikeNow('B', 'F');
  assert.equal(P.F.skillPoints, 1);
  assert.equal(P.B.hp, 8, 'ไม่สวน');
});

test('ร่ายต่อเนื่อง: ตีแล้วไม่จบตา · 2 ครั้ง = ตี 3 ครั้ง · ครั้งที่ 3 กดไม่ได้ · เทิร์นถัดไปล็อก · N+2 กดได้', () => {
  const P = setup([['F', 'fern', 3, 7], ['B', 'dummy', 4, 7]]);
  P.B.hp = 99; P.B.armor = 0;
  engine.setActor('F');
  engine.useSkill('F', 'basic', []);
  assert.equal(P.F.skillPoints, 8);
  assert.equal(P.F.fern.extra, 1);
  assert.equal(engine.action.locked, true, 'ล็อกการเดิน');
  assert.ok(calls.fx.some((f) => f.event === 'fernFx' && f.payload.kind === 'cast'));
  engine.useSkill('F', 'basic', []);
  assert.equal(P.F.fern.extra, 2, 'ครั้งที่ 2 ไม่ต้องใช้โควตา');
  assert.equal(P.F.skillPoints, 6);
  engine.useSkill('F', 'basic', []);
  assert.equal(P.F.fern.extra, 2, 'ครั้งที่ 3 กดไม่ได้');
  assert.equal(P.F.skillPoints, 6);
  for (let i = 0; i < 2; i++) {
    assert.equal(strikeNow('F', 'B'), true);
    assert.equal(engine.actorId, 'F', `ตีครั้งที่ ${i + 1} ยังไม่จบตา`);
    assert.equal(engine.gameState, 'ACTION');
  }
  assert.equal(strikeNow('F', 'B'), true);
  assert.equal(P.B.hp, 99 - 6, 'ตี 3 ครั้ง');
  assert.equal(P.F.skillPoints, 0);
  assert.notEqual(engine.actorId, 'F', 'ครั้งสุดท้ายจบตา');
  // เทิร์นถัดไปกดไม่ได้ · N+2 ได้
  P.F.skillPoints = 10; P.F.skillUsedRound = false;
  fern.onActorEnd(engine, P.F);
  engine.setRoundNumber(5);
  engine.setActor('F');
  engine.useSkill('F', 'basic', []);
  assert.equal(P.F.fern.extra, 0, 'N+1 ล็อก');
  assert.equal(view('F', 'F').skillLocks.basic.locked, true);
  engine.setRoundNumber(6);
  engine.setActor('F');
  engine.useSkill('F', 'basic', []);
  assert.equal(P.F.fern.extra, 1, 'N+2 กดได้');
});

test('ร่ายต่อเนื่อง: ที่ตุนไว้หายตอนจบตา (รอ)', () => {
  const P = setup([['F', 'fern', 3, 7], ['B', 'dummy', 9, 7]]);
  engine.setActor('F');
  engine.useSkill('F', 'basic', []);
  engine.waitAction('F');
  assert.equal(P.F.fern.extra, 0);
});

test('Defensive Magic: กันการโจมตีทั้งก้อน (ฉากตีขึ้น 0) · คูลดาวน์ 2 เทิร์น · หลายจังหวะในคำสั่งเดียว = กันหมด', () => {
  const P = setup([['F', 'fern', 3, 7], ['B', 'dummy', 4, 7], ['C', 'dummy', 9, 7]]);
  P.F.skillPoints = 0; // ไม่สวน
  engine.setActor('B');
  assert.equal(strikeNow('B', 'F'), true);
  assert.equal(vit(P.F), 7, 'กันหมด');
  const card = engine.lastAttack;
  assert.equal(card.dmg, 0, 'ฉากตีขึ้น 0');
  assert.ok(card.skills.some((s) => s.name === 'Defensive Magic' && s.side === 'def'));
  assert.ok(calls.own.some((f) => f.event === "fernFx" && f.payload.kind === "shield"));
  assert.ok(calls.sfx.includes('fern_shield'));
  assert.equal(view('F', 'F').fern.shieldCd, 2);
  // การโจมตีถัดไปในเทิร์นเดียวกัน = โดน
  engine.setActor('B');
  strikeNow('B', 'F');
  assert.equal(vit(P.F), 6);
  // เทิร์น N+1 ยังไม่พร้อม · N+2 พร้อม
  engine.setRoundNumber(5);
  newCommand(); hitBy(P.C, P.F, 1);
  assert.equal(vit(P.F), 5);
  engine.setRoundNumber(6);
  newCommand(); hitBy(P.C, P.F, 2); hitBy(P.C, P.F, 2);
  assert.equal(vit(P.F), 5, 'สกิลหลายจังหวะของคำสั่งเดียว = กันทั้งหมด');
  newCommand(); hitBy(P.C, P.F, 1);
  assert.equal(vit(P.F), 4, 'คำสั่งถัดไปโดน');
  // ไม่มีผู้ลงมือ (ลุกไหม้/ผลต่อเทิร์น) = ไม่ใช้โล่
  engine.setRoundNumber(8);
  newCommand(); engine.dealMixed(P.F, 1);
  assert.equal(vit(P.F), 3);
  assert.equal(view('F', 'F').fern.shieldCd, 0, 'ยังพร้อม');
});

test('ซ่อนเร้นมานา: +3 · ล่องหน (ศัตรูระยะ 2 เห็น · 3 ไม่เห็น) · ต้นเทิร์น +1 · ฟื้นพลังชีวิตทุก 2 เทิร์น · เงียบ · ทำอะไรไม่ได้', () => {
  const P = setup([['F', 'fern', 3, 7], ['B', 'dummy', 5, 7], ['C', 'dummy', 6, 7]]);
  P.F.skillPoints = 2; P.F.hp = 3;
  engine.setActor('F');
  engine.useSkill('F', 'secondary', []);
  assert.equal(P.F.skillPoints, 5);
  assert.equal(P.F.skillUsedRound, false, 'ไม่กินโควตา');
  assert.equal(calls.flash.length, 0, 'ไม่ขึ้นป้ายกลาง');
  assert.ok(calls.own.some((f) => f.event === 'fernFx' && f.payload.kind === 'conceal' && f.ids.join() === 'F'), 'เอฟเฟกต์เฉพาะตัวเอง');
  assert.equal(engine.hiddenFrom(P.B, P.F), false, 'ระยะ 2 เห็น');
  assert.equal(engine.hiddenFrom(P.C, P.F), true, 'ระยะ 3 ไม่เห็น');
  assert.equal(view('C', 'F').pos, null);
  assert.equal(view('C', 'F').fern.conceal, false, 'ไม่บอกคนที่มองไม่เห็น');
  assert.equal(view('F', 'F').fern.conceal, true);
  // ทำอะไรไม่ได้
  assert.equal(action.movOf(P.F), 0);
  assert.deepEqual(action.rangeOf(P.F), [1, 0]);
  assert.equal(fern.blocksGuts(engine, P.F), true);
  assert.equal(fern.blocksItems(engine, P.F), true);
  engine.useSkill('F', 'basic', []);
  assert.equal(P.F.fern.extra, 0);
  // ต้นเทิร์น N+1: +1 · N+2: +1 + ฟื้น 1
  engine.setRoundNumber(5); fern.onRoundStartTick(engine, P.F);
  assert.deepEqual([P.F.skillPoints, P.F.hp], [6, 3]);
  engine.setRoundNumber(6); fern.onRoundStartTick(engine, P.F);
  assert.deepEqual([P.F.skillPoints, P.F.hp], [7, 4]);
  engine.setRoundNumber(7); fern.onRoundStartTick(engine, P.F);
  assert.deepEqual([P.F.skillPoints, P.F.hp], [8, 4]);
  engine.setRoundNumber(8); fern.onRoundStartTick(engine, P.F);
  assert.deepEqual([P.F.skillPoints, P.F.hp], [9, 5]);
});

test('ซ่อนเร้นมานา: ยกเลิกฟรี (แม้ภาษีกลางคืน) ไม่ใช้โควตา → ตีต่อได้ (เดินไม่ได้) · คูลดาวน์ 3 นับจากเทิร์นที่ออก', () => {
  const P = setup([['F', 'fern', 3, 7], ['B', 'dummy', 4, 7]]);
  P.B.hp = 99; P.B.armor = 0;
  engine.setActor('F');
  engine.useSkill('F', 'secondary', []);
  assert.equal(P.F.fern.conceal != null, true);
  engine.setRoundNumber(6);
  P.F.nightTaxTier = 'secondary';
  P.F.skillUsedRound = true; // ใช้โควตาไปแล้วก็ยกเลิกได้
  engine.setActor('F');
  engine.useSkill('F', 'secondary', []);
  assert.equal(P.F.fern.conceal, null, 'ออกแล้ว');
  assert.equal(P.F.skillPoints, 10, 'ฟรีจริง');
  assert.ok(calls.fx.some((f) => f.event === 'fernFx' && f.payload.kind === 'unveil'));
  assert.equal(engine.action.locked, true, 'เดินไม่ได้');
  assert.equal(strikeNow('F', 'B'), true, 'ตีต่อได้');
  // คูลดาวน์: ออกเทิร์น 6 → เข้าได้อีกเทิร์น 9
  P.F.skillUsedRound = false; P.F.nightTaxTier = null;
  engine.setRoundNumber(8); engine.setActor('F');
  engine.useSkill('F', 'secondary', []);
  assert.equal(P.F.fern.conceal, null, 'N+2 ยังไม่ได้');
  engine.setRoundNumber(9); engine.setActor('F');
  engine.useSkill('F', 'secondary', []);
  assert.ok(P.F.fern.conceal, 'N+3 ได้');
});

test('ซ่อนเร้นมานา: ถูกโจมตี (Defensive Magic ไม่พร้อม) = หลุด + สตั้นเทิร์นหน้า · กันได้ = ไม่หลุด', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['F', 'fern', 3, 7], ['B', 'dummy', 4, 7]]);
  engine.setActor('F');
  engine.useSkill('F', 'secondary', []);
  // โล่พร้อม: กัน → ยังซ่อนอยู่
  engine.setActor('B');
  strikeNow('B', 'F');
  assert.ok(P.F.fern.conceal, 'กันได้ = ไม่นับว่าถูกโจมตี');
  assert.equal(P.F.fern.stunPending, false);
  engine.setActor('B');
  strikeNow('B', 'F');
  assert.equal(P.F.fern.conceal, null, 'หลุด');
  assert.equal(engine.hiddenFrom(P.B, P.F), false);
  // ตาของ B จบ → หมดแถว → จบเทิร์น: ติดสตั้นหลังลูปลดเทิร์น = เต็มเทิร์นหน้า
  assert.equal(P.F.statuses.stun, 1, 'สตั้นเต็มเทิร์นหน้า');
  assert.equal(P.F.fern.stunPending, false);
  engine.clearPhaseTimer();
  assert.equal(view('F', 'F').fern.concealCd, 3);
});

test('Orbital Cannon Zoltraak: วาร์ปเฉพาะช่องว่าง · ล่องหน · คลิป intro · ชาร์จ: เดิน/ตี/สกิลอื่นไม่ได้', () => {
  const P = setup([['F', 'fern', 3, 7], ['B', 'dummy', 9, 7]]);
  engine.setActor('F');
  engine.useSkill('F', 'ultimate', [], { tile: { x: 2, y: 6 } }); // หิน
  engine.useSkill('F', 'ultimate', [], { tile: { x: 9, y: 7 } }); // มีคน
  assert.equal(P.F.fern.ult, null);
  assert.equal(P.F.skillPoints, 10, 'กดไม่ได้ไม่เสีย');
  engine.useSkill('F', 'ultimate', [], { tile: { x: 8, y: 8 } });
  assert.deepEqual(P.F.pos, { x: 8, y: 8 });
  assert.equal(P.F.skillPoints, 6);
  assert.ok(calls.queue.includes('fernUltIntro'));
  assert.equal(engine.hiddenFrom(P.B, P.F), true, 'ล่องหนเต็ม (ใกล้ก็ไม่เห็น)');
  assert.equal(view('B', 'F').pos, null);
  assert.equal(view('B', 'F').fern.charge, 0, 'ศัตรูรู้ว่าชาร์จ');
  assert.equal(action.movOf(P.F), 0);
  assert.deepEqual(action.rangeOf(P.F), [1, 0]);
  assert.equal(fern.blocksGuts(engine, P.F), true);
  P.F.skillUsedRound = false;
  engine.setActor('F');
  engine.useSkill('F', 'basic', []);
  engine.useSkill('F', 'secondary', []);
  assert.equal(P.F.fern.extra, 0);
  assert.equal(P.F.fern.conceal, null);
  assert.equal(view('F', 'F').skillLocks.ultimate.locked, true, 'เทิร์นที่กดยิงไม่ได้');
});

test('Orbital Cannon Zoltraak: เทิร์นถัดไปจั่วไม่ได้ · ต้นเทิร์นเผยตัวจนถึงตาตัวเอง', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['F', 'fern', 3, 7], ['B', 'dummy', 9, 7]]);
  engine.setActor('F');
  engine.useSkill('F', 'ultimate', [], { tile: { x: 8, y: 8 } });
  flush(t, 6000);
  assert.ok(calls.fx.some((f) => f.payload.kind === 'warpOut' && f.payload.at.x === 3));
  assert.ok(calls.own.some((f) => f.payload.kind === 'warpIn' && f.ids.join() === 'F'));
  engine.endTurn();
  for (let i = 0; i < 300 && engine.gameState !== 'PLAYING'; i++) t.mock.timers.tick(100);
  engine.clearPhaseTimer();
  assert.equal(P.F.locked, true, 'จั่วไม่ได้');
  assert.equal(P.F.fern.ult.revealed, true);
  assert.equal(engine.hiddenFrom(P.B, P.F), false, 'ต้นเทิร์นเห็นตัว');
  assert.ok(calls.fx.some((f) => f.payload.kind === 'reveal'));
  fern.onActorStart(engine, P.F);
  assert.equal(engine.hiddenFrom(P.B, P.F), true, 'ถึงตาตัวเอง = ล่องหนอีกครั้ง');
});

test('Orbital Cannon Zoltraak: ยิงกรอบ 7×7 (เชบีเชฟ 3 ได้ · 4 ไม่ได้) · ดาเมจ 3/4/5 · หลบไม่ได้ · คูลดาวน์ 4 เทิร์นนับจากยิง', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  for (const k of [1, 2, 3]) {
    const P = setup([['F', 'fern', 5, 7], ['B', 'dummy', 8, 10], ['C', 'dummy', 9, 7]]);
    P.B.hp = 10; P.B.armor = 2; P.B.statuses.evade = 1; P.B.statusAmt.evade = 100;
    P.F.fern.ult = { cast: 4 - k, revealed: false };
    engine.setActor('F');
    engine.useSkill('F', 'ultimate', ['C']);
    assert.ok(P.F.fern.ult, 'เชบีเชฟ 4 ยิงไม่ได้');
    assert.equal(view('F', 'F').character.ultimate.name, 'ยิง Zoltraak');
    assert.deepEqual(view('F', 'F').character.ultimate.area, fern.FIRE_AREA);
    engine.useSkill('F', 'ultimate', ['B']);
    assert.equal(P.F.fern.ult, null);
    assert.equal(P.F.skillPoints, 10, 'ยิงฟรี');
    assert.ok(calls.queue.includes('fernUltFinal'));
    flush(t, 15000);
    assert.equal(vit(P.B), 12 - (2 + k), `ชาร์จ ${k} = ดาเมจ ${2 + k} (หลบไม่ได้)`);
    assert.ok(calls.fx.some((f) => f.payload.kind === 'cannon' && f.payload.dmg === 2 + k));
    assert.equal(engine.actorId, 'F', 'กลับตาเดิน');
    assert.equal(view('F', 'F').fern.ultCd, 4);
    assert.equal(engine.hiddenFrom(P.B, P.F), false, 'ยิงแล้วเห็นตัว');
    engine.clearPhaseTimer();
    calls.queue = []; calls.fx = [];
  }
});

test('Orbital Cannon Zoltraak: ชาร์จครบ 3 แล้วรอ = ยิงคนใกล้สุดในกรอบเอง · ไม่มีใคร = สลาย', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  let P = setup([['F', 'fern', 5, 7], ['B', 'dummy', 7, 8], ['C', 'dummy', 5, 9]]);
  for (const id of ['B', 'C']) { engine.players[id].hp = 10; engine.players[id].armor = 0; }
  P.F.fern.ult = { cast: 1, revealed: false };
  engine.setActor('F');
  engine.waitAction('F');
  assert.ok(calls.queue.includes('fernUltFinal'));
  flush(t, 15000);
  assert.equal(P.C.hp, 5, 'ใกล้สุด (ระยะ 2) โดน 5');
  assert.equal(P.B.hp, 10);
  assert.equal(P.F.fern.ult, null);
  assert.notEqual(engine.actorId, 'F', 'จบตา');
  engine.clearPhaseTimer();
  P = setup([['F', 'fern', 3, 7], ['B', 'dummy', 12, 7]]);
  P.F.fern.ult = { cast: 1, revealed: false };
  engine.setActor('F');
  engine.waitAction('F');
  assert.equal(P.F.fern.ult, null, 'สลาย');
  assert.ok(calls.fx.some((f) => f.payload.kind === 'fizzle'));
  assert.equal(view('F', 'F').fern.ultCd, 4);
});

test('Orbital Cannon Zoltraak: ถูกโจมตีระหว่างชาร์จ (ไม่ถูกกัน) = ยกเลิก ไม่คืน Energy · คูลดาวน์เริ่ม', () => {
  const P = setup([['F', 'fern', 3, 7], ['B', 'dummy', 4, 7]]);
  P.F.skillPoints = 6;
  P.F.fern.ult = { cast: 3, revealed: true };
  newCommand(); hitBy(P.B, P.F, 1);
  assert.ok(P.F.fern.ult, 'Defensive Magic กัน = ยังชาร์จ');
  assert.equal(vit(P.F), 7);
  newCommand(); hitBy(P.B, P.F, 1);
  assert.equal(P.F.fern.ult, null, 'ยกเลิก');
  assert.equal(P.F.skillPoints, 6);
  assert.ok(calls.fx.some((f) => f.payload.kind === 'fizzle'));
  assert.equal(view('F', 'F').fern.ultCd, 4);
});
