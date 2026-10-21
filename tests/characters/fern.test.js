// เฟิร์น (fern) — Zoltraak (Energy) / ผู้เชี่ยวชาญเวทมนต์พื้นฐาน / ร่ายต่อเนื่อง / เพิ่มระยะ / ซ่อนเร้นมานา (GRID_PLAN §7.14 · รื้อใหม่ 2026-10-21)
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const fern = require('../../characters/fern.js');
const { CHAR_BY_ID } = require('../../characters.js');
const action = require('../../server/phases/action.js');
const match = require('../../server/match.js');
const timers = require('../../server/timers.js');
const Ice = require('../../server/ice.js');

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
const fernFx = (kind) => calls.own.filter((f) => f.event === 'fernFx' && f.payload.kind === kind);

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
  engine.sfx = (s, ids) => calls.sfx.push({ s, ids });
  engine.boardFx = (event, payload) => calls.fx.push({ event, payload });
  engine.boardFxTo = (ids, event, payload) => calls.own.push({ ids, event, payload });
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.beforeEach(() => { for (const k of Object.keys(calls)) calls[k] = []; });
test.afterEach(() => { Math.random = realRandom; engine.setGameMode('ffa'); engine.setCycleShift(0); engine.clearPhaseTimer(); });

test('ข้อมูล: กลาง · พลังชีวิต 5 เกราะ 2 · เดิน 3 · ตีแนวตรง [1, 3] · ไม่มีตีสวน · 2 / 3 / 0 Energy · Energy 10 เริ่มเต็ม', () => {
  const ch = CHAR_BY_ID.fern;
  assert.equal(ch.name, 'เฟิร์น');
  assert.equal(ch.difficulty, 'medium');
  assert.equal(ch.mov, 3);
  assert.deepEqual(ch.range, [1, 3]);
  assert.ok(!ch.counter, 'ตีสวนปิดทั้งเกม (GRID_PLAN §6)');
  assert.equal(ch.passive.name, 'ผู้เชี่ยวชาญเวทมนต์พื้นฐาน');
  assert.deepEqual([ch.basic.name, ch.secondary.name, ch.ultimate.name], ['ร่ายต่อเนื่อง', 'เพิ่มระยะ', 'ซ่อนเร้นมานา']);
  assert.deepEqual([ch.basic.cost, ch.secondary.cost, ch.ultimate.cost], [2, 3, 0]);
  for (const t of ['basic', 'secondary', 'ultimate']) {
    assert.deepEqual(ch[t].area, { kind: 'self' });
    assert.doesNotMatch(ch[t].desc, /ก่อนเปิดไพ่|ไพ่แตก|สวน/);
  }
  const P = setup([['F', 'fern', 3, 7], ['B', 'dummy', 9, 7]]);
  assert.equal(P.F.hp, 5);
  assert.equal(P.F.armor, 2);
  assert.equal(P.F.skillPoints, 10, 'เริ่มเกมเต็ม');
  assert.equal(engine.maxSkillOf(P.F), 10);
  assert.equal(action.lanes(P.F), true);
  assert.equal(action.counters(P.F), false);
  assert.equal(view('F', 'F').maxSkill, 10);
  assert.equal(P.F.fern.concealReady, 5, 'เทิร์นแรก (1) + 4 — startMatch แจกเทิร์น 1 แล้ว');
  assert.deepEqual(view('F', 'F').fern, { conceal: false, count: 0, empowered: false, boost: false, shieldCd: 0, basicCd: 0, boostCd: 0, concealCd: 1 });
});

test('Energy: จบเทิร์น/ไอเทม/ไพ่/สกิลติดตัวไม่ฟื้น · ซ่อนเร้นมานาฟื้นได้ (ไม่เกิน 10)', () => {
  const P = setup([['F', 'fern', 3, 7], ['B', 'dummy', 9, 7]]);
  P.F.skillPoints = 4;
  engine.addSkill(P.F, 3, 'item');
  engine.addSkill(P.F, 2, 'card');
  engine.addSkill(P.F, 1, 'passive');
  engine.addSkill(P.F, 1, 'journey');
  engine.addSkill(P.F, 1);
  assert.equal(P.F.skillPoints, 4);
  engine.setRoundNumber(1);
  P.B.skillPoints = 0;
  engine.endTurn();
  engine.clearPhaseTimer();
  assert.equal(P.F.skillPoints, 4, 'จบเทิร์นไม่ฟื้น');
  assert.ok(P.B.skillPoints >= 1, 'คนอื่นฟื้นตามปกติ');
  engine.setRoundNumber(5);
  P.F.fern.concealReady = 0;
  engine.setActor('F');
  engine.useSkill('F', 'ultimate', []);
  assert.equal(P.F.skillPoints, 8, 'ซ่อนเร้น +4');
  fern.onRoundStartTick(engine, P.F);
  assert.equal(P.F.skillPoints, 10, '+2 ต้นเทิร์น');
  fern.onRoundStartTick(engine, P.F);
  assert.equal(P.F.skillPoints, 10, 'เพดาน 10');
  assert.ok(P.F.fern.conceal, 'เต็มแล้วโหมดยังอยู่');
});

test('Zoltraak: 2 Energy ต่อการตี · แนว 3 ช่องโดนทุกคน (ทะลุ) เสียครั้งเดียว · ดาเมจ 2 (เกราะก่อน) · ไม่ถึง 2 = ตีไม่ได้', () => {
  const P = setup([['F', 'fern', 3, 7], ['B', 'dummy', 4, 7], ['C', 'dummy', 6, 7], ['D', 'dummy', 7, 7]]);
  for (const id of ['B', 'C', 'D']) { engine.players[id].hp = 10; engine.players[id].armor = 0; }
  P.C.armor = 1;
  engine.setActor('F');
  assert.equal(strikeNow('F', 'B'), true);
  assert.equal(P.F.skillPoints, 8, 'ตีครั้งเดียวเสีย 2 แม้โดน 2 คน');
  assert.equal(P.B.hp, 8, 'ดาเมจ 2');
  assert.deepEqual([P.C.hp, P.C.armor], [9, 0], 'คนในแนว (ระยะ 3) โดนด้วย · เกราะรับก่อน');
  assert.equal(P.D.hp, 10, 'ระยะ 4 ไม่โดน');
  assert.equal(engine.lastAttack.byStyle, 'fernZoltraak');
  assert.equal(engine.lastAttack.byAttackSound, 'fern_zoltraak');
  assert.equal(P.F.fern.count, 1);
  P.F.skillPoints = 1;
  engine.setActor('F');
  assert.deepEqual(action.rangeOf(P.F), [1, 0]);
  assert.equal(strikeNow('F', 'B'), false, 'Energy 1 = ตีไม่ได้');
  assert.equal(P.F.fern.count, 1);
});

test('Zoltraak ตีหนามน้ำแข็ง = 2 Energy + นับเข้ารอบ · ครั้งที่ 6 ใส่หนามก็ฟรีและรีเซ็ท', () => {
  const P = setup([['F', 'fern', 3, 7], ['I', 'ice_spike', 12, 12]]);
  Ice.placeSpike(5, 7, 'I', 3);
  engine.setActor('F');
  assert.equal(strikeNow('F', 'spike:5,7'), true);
  assert.equal(P.F.skillPoints, 8);
  assert.equal(P.F.fern.count, 1);
  P.F.fern.count = 5; P.F.skillPoints = 0; P.F.fern.castReady = 9;
  engine.setActor('F');
  assert.equal(strikeNow('F', 'spike:5,7'), true);
  assert.equal(P.F.skillPoints, 0);
  assert.equal(P.F.fern.count, 0);
  assert.equal(P.F.fern.castReady, 0);
});

test('ไม่มีตีสวน: ศัตรูตีประชิด = เฟิร์นไม่สวน ไม่เสีย Energy', () => {
  const P = setup([['F', 'fern', 3, 7], ['B', 'dummy', 4, 7]]);
  P.B.hp = 10; P.B.armor = 0;
  P.F.fern.shieldReady = 99;
  engine.setActor('B');
  assert.equal(strikeNow('B', 'F'), true);
  assert.equal(P.F.skillPoints, 10, 'ไม่เสีย Energy');
  assert.equal(P.B.hp, 10, 'ไม่สวน');
  assert.equal(engine.lastAttack.counter, null);
  assert.equal(P.F.fern.count, 0, 'ถูกตีไม่นับ');
});

test('ผู้เชี่ยวชาญเวทมนต์พื้นฐาน: กันการโจมตีทั้งก้อน (ฉากตีขึ้น 0) · กันเทิร์น N → N+3 · หลายจังหวะในคำสั่งเดียว = กันหมด', () => {
  const P = setup([['F', 'fern', 3, 7], ['B', 'dummy', 4, 7], ['C', 'dummy', 9, 7]]);
  engine.setActor('B');
  assert.equal(strikeNow('B', 'F'), true);
  assert.equal(vit(P.F), 7, 'กันหมด');
  const card = engine.lastAttack;
  assert.equal(card.dmg, 0, 'ฉากตีขึ้น 0');
  assert.ok(card.skills.some((s) => s.name === 'ผู้เชี่ยวชาญเวทมนต์พื้นฐาน' && s.side === 'def'));
  assert.ok(fernFx('shield').length);
  assert.ok(calls.sfx.some((c) => c.s === 'fern_shield'));
  assert.equal(view('F', 'F').fern.shieldCd, 3);
  engine.setActor('B');
  strikeNow('B', 'F');
  assert.equal(vit(P.F), 6, 'การโจมตีถัดไปโดน');
  engine.setRoundNumber(5); newCommand(); hitBy(P.C, P.F, 1);
  engine.setRoundNumber(6); newCommand(); hitBy(P.C, P.F, 1);
  assert.equal(vit(P.F), 4, 'N+1 / N+2 ยังไม่พร้อม');
  engine.setRoundNumber(7);
  newCommand(); hitBy(P.C, P.F, 2); hitBy(P.C, P.F, 2);
  assert.equal(vit(P.F), 4, 'N+3 กันทั้งคำสั่ง');
  newCommand(); hitBy(P.C, P.F, 1);
  assert.equal(vit(P.F), 3, 'คำสั่งถัดไปโดน');
  // ไม่มีผู้ลงมือ (ลุกไหม้/ผลต่อเทิร์น) = ไม่ใช้การกัน
  engine.setRoundNumber(10);
  newCommand(); engine.dealMixed(P.F, 1);
  assert.equal(vit(P.F), 2);
  assert.equal(view('F', 'F').fern.shieldCd, 0, 'ยังพร้อม');
});

test('ครั้งที่ 6: ตีครบ 5 → ฟรีแม้ Energy 0 · ทะลุเกราะทุกคนในแนว · รีเซ็ทคูลดาวน์ทุกอย่าง (รวมคูลดาวน์เริ่มเกม) · นับใหม่', () => {
  const P = setup([['F', 'fern', 3, 7], ['B', 'dummy', 4, 7], ['C', 'dummy', 6, 7]]);
  for (const id of ['B', 'C']) { engine.players[id].hp = 50; engine.players[id].armor = 0; }
  for (let i = 1; i <= 5; i++) {
    engine.setActor('F');
    assert.equal(strikeNow('F', 'B'), true, `ตีครั้งที่ ${i}`);
    assert.equal(P.F.fern.count, i);
  }
  assert.equal(P.F.skillPoints, 0);
  assert.equal(fernFx('empower').length, 1, 'ครบ 5 = เอฟเฟกต์พร้อม');
  assert.equal(view('F', 'F').fern.empowered, true);
  assert.equal(view('F', 'F').fern.count, 5);
  // คูลดาวน์ค้างทุกช่อง (ซ่อนเร้นมานายังติดคูลดาวน์เริ่มเกม)
  Object.assign(P.F.fern, { castReady: 9, boostReady: 9, shieldReady: 9, concealReady: null });
  for (const id of ['B', 'C']) { engine.players[id].hp = 10; engine.players[id].armor = 2; }
  engine.setActor('F');
  assert.deepEqual(action.rangeOf(P.F), [1, 3], 'Energy 0 ก็ตีได้');
  assert.equal(strikeNow('F', 'B'), true);
  assert.equal(P.F.skillPoints, 0, 'ไม่เสีย Energy');
  assert.deepEqual([P.B.hp, P.B.armor], [8, 2], 'ทะลุเกราะ');
  assert.deepEqual([P.C.hp, P.C.armor], [8, 2], 'คนในแนวทะลุเกราะด้วย');
  const card = engine.lastAttack;
  assert.equal(card.byStyle, 'fernZoltraakMax');
  assert.equal(card.byAttackSound, 'fern_zoltraak_max');
  assert.ok(card.skills.some((s) => s.name === 'ทะลุเกราะ' && s.side === 'atk'));
  assert.equal(fernFx('reset').length, 1);
  assert.equal(P.F.fern.count, 0, 'นับใหม่ (ครั้งที่ 6 ไม่นับ)');
  const s = view('F', 'F').fern;
  assert.deepEqual([s.basicCd, s.boostCd, s.shieldCd, s.concealCd, s.empowered], [0, 0, 0, 0, false]);
  // ครั้งถัดไปกลับเป็นปกติ
  P.F.skillPoints = 4;
  engine.setActor('F');
  strikeNow('F', 'B');
  assert.deepEqual([P.B.hp, P.B.armor], [8, 0], 'กลับมาลดเกราะก่อน');
  assert.equal(P.F.skillPoints, 2);
  assert.equal(P.F.fern.count, 1);
});

test('ครั้งที่ 6 ปลดคูลดาวน์ซ่อนเร้นมานาที่เพิ่งเริ่มจากการตีครั้งนั้น', () => {
  const P = setup([['F', 'fern', 3, 7], ['B', 'dummy', 4, 7]]);
  P.B.hp = 50; P.B.armor = 0;
  P.F.fern.concealReady = 0;
  engine.setActor('F');
  engine.useSkill('F', 'ultimate', []);
  assert.ok(P.F.fern.conceal);
  P.F.fern.count = 5;
  assert.equal(strikeNow('F', 'B'), true);
  assert.equal(P.F.fern.conceal, null, 'ตี = ออก');
  assert.equal(view('F', 'F').fern.concealCd, 0, 'คูลดาวน์ที่เริ่มจากการตีนี้ถูกรีเซ็ท');
});

test('ร่ายต่อเนื่อง: ตีครั้งแรกไม่จบตา · ตี 2 ครั้ง · กดซ้ำในเทิร์นเดียวกันไม่ได้ · N+1 ล็อก · N+2 กดได้', () => {
  const P = setup([['F', 'fern', 3, 7], ['B', 'dummy', 4, 7]]);
  P.B.hp = 99; P.B.armor = 0;
  engine.setActor('F');
  engine.useSkill('F', 'basic', []);
  assert.equal(P.F.skillPoints, 8);
  assert.equal(P.F.fern.extra, 1);
  assert.equal(P.F.skillUsedRound, true, 'กินโควตา');
  assert.ok(fernFx('cast').length);
  engine.useSkill('F', 'basic', []);
  assert.equal(P.F.skillPoints, 8, 'กดซ้ำไม่ได้');
  assert.equal(strikeNow('F', 'B'), true);
  assert.equal(engine.actorId, 'F', 'ตีครั้งแรกยังไม่จบตา');
  assert.equal(engine.gameState, 'ACTION');
  assert.equal(strikeNow('F', 'B'), true);
  assert.equal(P.B.hp, 99 - 4, 'ตี 2 ครั้ง');
  assert.equal(P.F.skillPoints, 4);
  assert.notEqual(engine.actorId, 'F', 'ครั้งที่ 2 จบตา');
  P.F.skillPoints = 10; P.F.skillUsedRound = false;
  engine.setRoundNumber(5);
  engine.setActor('F');
  engine.useSkill('F', 'basic', []);
  assert.equal(P.F.fern.extra, 0, 'N+1 ล็อก');
  assert.equal(view('F', 'F').skillLocks.basic.locked, true);
  assert.equal(view('F', 'F').fern.basicCd, 1);
  engine.setRoundNumber(6);
  engine.setActor('F');
  engine.useSkill('F', 'basic', []);
  assert.equal(P.F.fern.extra, 1, 'N+2 กดได้');
});

test('ร่ายต่อเนื่อง: ที่ตุนไว้หายตอนจบตา (รอ) · ร่าย + เพิ่มระยะในตาเดียวกันไม่ได้ (โควตา)', () => {
  const P = setup([['F', 'fern', 3, 7], ['B', 'dummy', 9, 7]]);
  engine.setActor('F');
  engine.useSkill('F', 'basic', []);
  engine.useSkill('F', 'secondary', []);
  assert.equal(P.F.fern.boost, false, 'โควตา 1 สกิลต่อเทิร์น');
  engine.waitAction('F');
  assert.equal(P.F.fern.extra, 0);
});

test('เพิ่มระยะ: ตีครั้งถัดไปแนว 6 ช่อง แล้วกลับเป็น 3 · ค้างข้ามเทิร์น · คูลดาวน์ N → N+2', () => {
  const P = setup([['F', 'fern', 3, 7], ['B', 'dummy', 9, 7]]);
  P.B.hp = 20; P.B.armor = 0;
  engine.setActor('F');
  assert.equal(strikeNow('F', 'B'), false, 'ระยะ 6 ตีไม่ถึงตามปกติ');
  engine.setActor('F');
  engine.useSkill('F', 'secondary', []);
  assert.equal(P.F.skillPoints, 7);
  assert.equal(P.F.fern.boost, true);
  assert.ok(fernFx('boost').length);
  assert.deepEqual(action.rangeOf(P.F), [1, 6]);
  assert.equal(view('F', 'F').skillLocks.secondary.locked, true, 'ค้างอยู่กดซ้ำไม่ได้');
  engine.waitAction('F');
  // เทิร์นถัดไปยังค้าง
  engine.setRoundNumber(5);
  P.F.skillUsedRound = false;
  engine.setActor('F');
  assert.equal(view('F', 'F').fern.boost, true);
  assert.equal(view('F', 'F').fern.boostCd, 1);
  assert.equal(strikeNow('F', 'B'), true, 'ระยะ 6 ตีถึง');
  assert.equal(P.B.hp, 18);
  assert.equal(P.F.fern.boost, false);
  assert.deepEqual(action.rangeOf(P.F), [1, 3]);
  // N+2 กดได้อีก
  engine.setRoundNumber(6);
  P.F.skillUsedRound = false;
  engine.setActor('F');
  engine.useSkill('F', 'secondary', []);
  assert.equal(P.F.fern.boost, true);
});

test('ซ่อนเร้นมานา: เริ่มเกมคูลดาวน์ 4 (เทิร์นแรก + 4) · +4 · ต้นเทิร์น +2 · ฟื้นพลังชีวิตทุก 2 เทิร์น · เงียบ · เดินได้', () => {
  const P = setup([['F', 'fern', 3, 7], ['B', 'dummy', 5, 7], ['C', 'dummy', 6, 7]]);
  P.F.fern.concealReady = null; // ก่อนเทิร์นแรก
  assert.equal(view('F', 'F').fern.concealCd, 4);
  engine.setRoundNumber(1);
  fern.onRoundStartTick(engine, P.F);
  assert.equal(P.F.fern.concealReady, 5);
  engine.setRoundNumber(4);
  engine.setActor('F');
  engine.useSkill('F', 'ultimate', []);
  assert.equal(P.F.fern.conceal, null, 'เทิร์น 4 ยังกดไม่ได้');
  assert.equal(view('F', 'F').skillLocks.ultimate.locked, true);
  assert.equal(view('F', 'F').fern.concealCd, 1);
  engine.setRoundNumber(5);
  P.F.skillPoints = 2; P.F.hp = 3;
  engine.setActor('F');
  engine.useSkill('F', 'ultimate', []);
  assert.ok(P.F.fern.conceal, 'เทิร์น 5 กดได้');
  assert.equal(P.F.skillPoints, 6);
  assert.equal(P.F.skillUsedRound, false, 'ไม่กินโควตา');
  assert.equal(engine.action.locked, false, 'ไม่ล็อกการเดิน');
  assert.equal(calls.flash.length, 0, 'ไม่ขึ้นป้ายกลาง');
  assert.ok(fernFx('conceal').some((f) => f.ids.join() === 'F'), 'เอฟเฟกต์เฉพาะตัวเอง');
  assert.ok(calls.sfx.some((c) => c.s === 'fern_conceal' && c.ids.join() === 'F'));
  assert.equal(view('F', 'F').character.ultimate.active, true);
  // มองเห็นได้เฉพาะศัตรูในระยะ 2
  assert.equal(engine.hiddenFrom(P.B, P.F), false, 'ระยะ 2 เห็น');
  assert.equal(engine.hiddenFrom(P.C, P.F), true, 'ระยะ 3 ไม่เห็น');
  assert.equal(view('C', 'F').pos, null);
  assert.equal(view('C', 'F').fern.conceal, false, 'ไม่บอกคนที่มองไม่เห็น');
  assert.equal(view('C', 'F').fern.count, null);
  assert.equal(view('F', 'F').fern.conceal, true);
  // ยังเดินได้ · ยังใช้ไอเทม/ตีได้
  assert.equal(action.movOf(P.F), 3);
  assert.deepEqual(action.rangeOf(P.F), [1, 3]);
  assert.equal(engine.moveTo('F', 2, 8), true);
  assert.ok(P.F.fern.conceal, 'เดินแล้วยังซ่อน');
  assert.equal(engine.hiddenFrom(P.B, P.F), true, 'เดินห่างออกไป = ระยะ 4 ไม่เห็น');
  // ต้นเทิร์น N+1: +2 · N+2: +2 + ฟื้น 1
  engine.setRoundNumber(6); fern.onRoundStartTick(engine, P.F);
  assert.deepEqual([P.F.skillPoints, P.F.hp], [8, 3]);
  engine.setRoundNumber(7); fern.onRoundStartTick(engine, P.F);
  assert.deepEqual([P.F.skillPoints, P.F.hp], [10, 4]);
  engine.setRoundNumber(8); fern.onRoundStartTick(engine, P.F);
  assert.deepEqual([P.F.skillPoints, P.F.hp], [10, 4]);
  engine.setRoundNumber(9); fern.onRoundStartTick(engine, P.F);
  assert.deepEqual([P.F.skillPoints, P.F.hp], [10, 5]);
});

test('ซ่อนเร้นมานา: ยกเลิกฟรี (แม้ภาระเวท) ไม่ใช้โควตา ไม่ล็อกการเดิน · คูลดาวน์ 4 นับจากเทิร์นที่ออก', () => {
  const P = setup([['F', 'fern', 3, 7], ['B', 'dummy', 9, 7]]);
  P.F.fern.concealReady = 0;
  P.F.statuses.spellburden = 3; P.F.statusAmt.spellburden = 1;
  engine.setActor('F');
  engine.useSkill('F', 'ultimate', []);
  assert.ok(P.F.fern.conceal);
  assert.equal(P.F.skillPoints, 10, 'เข้าฟรี');
  engine.setRoundNumber(6);
  P.F.skillUsedRound = true; // ใช้โควตาไปแล้วก็ยกเลิกได้
  P.F.skillPoints = 5;
  engine.setActor('F');
  engine.useSkill('F', 'ultimate', []);
  assert.equal(P.F.fern.conceal, null, 'ออกแล้ว');
  assert.equal(P.F.skillPoints, 5, 'ฟรีจริง');
  assert.equal(engine.action.locked, false, 'ยังเดินได้');
  assert.ok(fernFx('unveil').length);
  assert.ok(calls.sfx.some((c) => c.s === 'fern_unveil'));
  assert.equal(calls.flash.length, 0);
  assert.equal(view('F', 'F').fern.concealCd, 4);
  P.F.skillUsedRound = false;
  engine.setRoundNumber(9); engine.setActor('F');
  engine.useSkill('F', 'ultimate', []);
  assert.equal(P.F.fern.conceal, null, 'N+3 ยังไม่ได้');
  engine.setRoundNumber(10); engine.setActor('F');
  engine.useSkill('F', 'ultimate', []);
  assert.ok(P.F.fern.conceal, 'N+4 ได้');
});

test('ซ่อนเร้นมานา: ตีปกติ / ใช้ร่ายต่อเนื่อง / ยิงปืน = ออก · ใช้ไอเทมไม่ออก', () => {
  let P = setup([['F', 'fern', 3, 7], ['B', 'dummy', 4, 7]]);
  P.B.hp = 50; P.B.armor = 0;
  P.F.fern.concealReady = 0;
  engine.setActor('F');
  engine.useSkill('F', 'ultimate', []);
  assert.equal(strikeNow('F', 'B'), true);
  assert.equal(P.F.fern.conceal, null, 'ตี = ออก');
  assert.equal(P.F.fern.stunPending, false);
  assert.equal(view('F', 'F').fern.concealCd, 4);
  // ร่ายต่อเนื่อง
  P = setup([['F', 'fern', 3, 7], ['B', 'dummy', 9, 7]]);
  P.F.fern.concealReady = 0;
  engine.setActor('F');
  engine.useSkill('F', 'ultimate', []);
  engine.useSkill('F', 'basic', []);
  assert.equal(P.F.fern.conceal, null, 'ใช้สกิลอื่น = ออก');
  assert.equal(P.F.fern.extra, 1);
  // ปืน / ไอเทม (ฮุคที่ Visibility.onHostileAct เรียก)
  P.F.fern.concealReady = 0; P.F.skillUsedRound = false;
  engine.setActor('F');
  engine.useSkill('F', 'ultimate', []);
  fern.onReveal(engine, P.F, 'act', 'item');
  fern.onReveal(engine, P.F, 'hit');
  fern.onReveal(engine, P.F, 'bump');
  assert.ok(P.F.fern.conceal, 'ไอเทม/ถูกพื้นที่/ถูกชน ไม่ออก');
  fern.onReveal(engine, P.F, 'act', 'gun');
  assert.equal(P.F.fern.conceal, null, 'ปืน = ออก');
});

test('ซ่อนเร้นมานา: ถูกโจมตี (การกันไม่พร้อม) = หลุด + สตั้นเทิร์นหน้า · กันได้ = ไม่หลุด', () => {
  const P = setup([['F', 'fern', 3, 7], ['B', 'dummy', 4, 7]]);
  P.F.fern.concealReady = 0;
  engine.setActor('F');
  engine.useSkill('F', 'ultimate', []);
  engine.setActor('B');
  strikeNow('B', 'F');
  assert.ok(P.F.fern.conceal, 'กันได้ = ไม่นับว่าถูกโจมตี');
  assert.equal(P.F.fern.stunPending, false);
  assert.equal(vit(P.F), 7);
  engine.setActor('B');
  strikeNow('B', 'F');
  assert.equal(P.F.fern.conceal, null, 'หลุด');
  assert.equal(engine.hiddenFrom(P.B, P.F), false);
  // ตาของ B จบ → หมดแถว → จบเทิร์น: ติดสตั้นหลังลูปลดเทิร์น = เต็มเทิร์นหน้า
  assert.equal(P.F.statuses.stun, 1, 'สตั้นเต็มเทิร์นหน้า');
  assert.equal(P.F.fern.stunPending, false);
  engine.clearPhaseTimer();
  assert.equal(view('F', 'F').fern.concealCd, 4);
});
