// เวอจิล — ฟันโหมกระหน่ำ/ฟันขึ้น รัวได้ไม่จำกัด · คอมโบ A+ (HIT · หน้าต่างเวลา · อ่านทางออก · หลุด) · Doppelganger · JCE ที่ 30 HIT (GRID_PLAN §7.40)
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const vg = require('../../characters/vergil.js');
const { CHAR_BY_ID } = require('../../characters.js');

const realRandom = Math.random;
const blank = (id, characterId, position) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId: null,
});
function setup(list) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, ch], i) => { engine.players[id] = blank(id, ch, i + 1); });
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setJourneyArea(1);
  engine.setCycleShift(0);
  engine.setRoundNumber(1);
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.shield = 0; p.statuses = {}; p.statusAmt = {};
    p.hp = 10; p.armor = 5;
  }
  return engine.players;
}
const vit = (p) => (p.hp || 0) + (p.armor || 0);

const saved = { triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash, sfx: engine.sfx, skillBeat: engine.skillBeat, boardFx: engine.boardFx };
const log = [];
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = (p, key) => { log.push({ cut: key }); };
  engine.skillFlash = () => {};
  engine.sfx = (key) => log.push({ sfx: key });
  engine.skillBeat = () => {}; // จังหวะพักให้เอฟเฟกต์บนกระดาน — เทสต์ตรรกะไม่ต้องรอ
  engine.boardFx = (ev, payload) => log.push({ fx: payload && payload.kind });
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.beforeEach(() => { log.length = 0; Math.random = () => 0.99; });
test.afterEach(() => {
  Math.random = realRandom;
  for (const p of Object.values(engine.players)) if (p.vergil) vg.resetCombat(p);
  engine.setRoundNumber(1); engine.clearPhaseTimer();
});

function vergilVs(x = 5, y = 7) {
  const P = setup([['V', 'vergil', x, y], ['D', 'dummy', x + 1, y]]);
  P.V.skillPoints = 8;
  engine.setActor('V');
  return P;
}

test('ข้อมูล: พิเศษ (เลือกซ้ำได้) · HP 10 เกราะ 5 · ตีประชิด · ราคา 1/1/4', () => {
  const ch = CHAR_BY_ID.vergil;
  assert.equal(ch.difficulty, 'special');
  assert.ok(!ch.unique);
  assert.equal(ch.gender, 'm');
  assert.deepEqual(ch.range, [1, 1]);
  assert.equal(ch.basic.cost, 1);
  assert.equal(ch.secondary.cost, 1);
  assert.equal(ch.ultimate.cost, 4);
  assert.deepEqual(ch.basic.area, { kind: 'target', range: 1, hostile: true });
  const P = vergilVs();
  assert.equal(engine.maxHpOf(P.V), 10);
  assert.equal(engine.maxArmorOf(P.V), 5);
});

test('ฟันโหมกระหน่ำ: 3 ครั้ง ครั้งละ 1 · +3 HIT · แต้มคืน 1 · เปิดหน้าต่างเวลา 3 วิ', () => {
  const P = vergilVs();
  engine.useSkill('V', 'basic', ['D']);
  assert.equal(vit(P.D), 12);
  assert.equal(P.V.vergil.combo, 3);
  assert.equal(P.V.skillPoints, 8);
  assert.equal(P.V.vergil.max, 3000);
  assert.equal(engine.actorId, 'V');
});

test('ฟันรัวได้หลายครั้งในตาเดียว (ไม่กินโควตา) · ฟันขึ้น (+2 HIT) = ลอย + ฟันโหมกระหน่ำใส่เป้าลอย ครั้งละ 2', () => {
  const P = vergilVs();
  engine.useSkill('V', 'secondary', ['D']);
  assert.equal(vit(P.D), 13);
  assert.ok(P.D.statuses.rooted > 0);
  assert.ok(P.D.vergilAir);
  engine.useSkill('V', 'basic', ['D']);
  assert.equal(vit(P.D), 9); // เพดาน 6 ต่อเทิร์น: 2 + (2+2+2) → ตัดเหลือ 6
  assert.equal(P.V.vergil.combo, 5); // ฟันขึ้น +2 · ฟันโหมกระหน่ำ +3
  assert.ok(P.D.vergilAir); // ฟันกลางอากาศ = ยังลอยค้าง
  assert.ok(P.V.vergil.air);
  vg.charAction(engine, P.V, 'sheathe'); // จบตา = ดิ่งตบลงพื้น
  assert.ok(!P.D.vergilAir);
  assert.ok(!P.V.vergil.air);
  assert.ok(log.some((l) => l.fx === 'land'));
});

test('เพดาน 6 ต่อเป้าต่อเทิร์น · ยังนับ HIT และได้แต้มคืน', () => {
  const P = vergilVs();
  for (let i = 0; i < 4; i++) engine.useSkill('V', i % 2 ? 'secondary' : 'basic', ['D']);
  assert.equal(vit(P.D), 15 - 6);
  assert.equal(P.V.vergil.combo, 10);
  assert.equal(P.V.skillPoints, 8);
  engine.setRoundNumber(2);
  engine.setActor('V');
  engine.useSkill('V', 'basic', ['D']);
  assert.equal(vit(P.D), 15 - 6 - 6); // เทิร์นใหม่ เพดานรีเซ็ต · เป้ายังลอย (ครั้งละ 2) + 10 HIT (+1) = 3×3 ตัดที่ 6
});

test('ท่าเดิม 3 ครั้งติด = ไม่นับ HIT แต่คอมโบไม่หลุด · ยังได้แต้มคืน', () => {
  const P = vergilVs();
  engine.useSkill('V', 'basic', ['D']);
  engine.useSkill('V', 'basic', ['D']);
  assert.equal(P.V.vergil.combo, 6);
  engine.useSkill('V', 'basic', ['D']);
  assert.equal(P.V.vergil.combo, 6);
  assert.equal(P.V.skillPoints, 8);
  assert.equal(engine.actorId, 'V');
  engine.useSkill('V', 'secondary', ['D']);
  assert.equal(P.V.vergil.combo, 8); // สลับท่า = นับใหม่ (+2)
});

test('ศัตรูอ่านทางออก = คอมโบหลุด + จบตาเดิน · ไม่โดน', () => {
  const P = vergilVs();
  engine.useSkill('V', 'basic', ['D']);
  assert.equal(P.V.vergil.combo, 3);
  Math.random = () => 0.01; // < 5%
  engine.useSkill('V', 'secondary', ['D']);
  assert.equal(P.V.vergil.combo, 0);
  assert.equal(vit(P.D), 12);
  assert.notEqual(engine.actorId, 'V');
});

test('หน้าต่างเวลาหมด = คอมโบหลุด + จบตาเดิน', async () => {
  const P = vergilVs();
  P.V.vergil.combo = 25; // 20+ = 1.2 วิ
  engine.useSkill('V', 'basic', ['D']);
  assert.equal(P.V.vergil.max, 1200);
  await new Promise((r) => setTimeout(r, 1500));
  assert.equal(P.V.vergil.combo, 0);
  assert.notEqual(engine.actorId, 'V');
});

test('เก็บดาบ = จบตาเดิน คอมโบไม่หลุด', () => {
  const P = vergilVs();
  engine.useSkill('V', 'basic', ['D']);
  assert.ok(vg.charAction(engine, P.V, 'sheathe'));
  assert.equal(P.V.vergil.combo, 3);
  assert.notEqual(engine.actorId, 'V');
  assert.equal(P.V.vergil.max, 0);
});

test('โดนศัตรูทำให้เสียหาย = คอมโบหลุด (ผู้เล่น 3 คน)', () => {
  const P = setup([['V', 'vergil', 5, 7], ['D', 'dummy', 6, 7], ['E', 'dummy', 9, 7]]);
  P.V.skillPoints = 8;
  engine.setActor('V');
  engine.useSkill('V', 'basic', ['D']);
  vg.charAction(engine, P.V, 'sheathe');
  engine.withEffectSource(P.D, () => engine.dealMixed(P.V, 1, false));
  assert.equal(P.V.vergil.combo, 0);
});

test('10 HIT ขึ้นไป ความเสียหาย +1 ต่อครั้ง', () => {
  const P = vergilVs();
  P.V.vergil.combo = 10;
  engine.useSkill('V', 'secondary', ['D']);
  assert.equal(vit(P.D), 15 - 3);
});

test('Doppelganger: เงาฟันตาม +1 HIT ความเสียหาย 1 · 2 เทิร์น · ตัดได้ (severables)', () => {
  const P = vergilVs();
  engine.useSkill('V', 'ultimate', []);
  assert.equal(P.V.skillPoints, 4);
  engine.useSkill('V', 'secondary', ['D']);
  assert.equal(P.V.vergil.combo, 3); // ฟันขึ้น +2 · เงา +1
  assert.equal(vit(P.D), 15 - 3);
  const sev = vg.severables(engine, P.V);
  assert.equal(sev.length, 1);
  sev[0].cancel();
  assert.equal(vg.severables(engine, P.V).length, 0);
});

test('ครบ 30 HIT = Judgment Cut End ทำงานเอง: ศัตรูที่มองเห็น -6 ไม่ติดเพดาน · คอมโบ 0 · จบตาเดิน · ไม่มีเสียงซ้อนคลิป', () => {
  const P = setup([['V', 'vergil', 5, 7], ['D', 'dummy', 6, 7], ['E', 'dummy', 9, 7]]);
  P.V.skillPoints = 8;
  engine.setActor('V');
  P.V.vergil.combo = 29;
  engine.useSkill('V', 'secondary', ['D']);
  assert.equal(P.V.vergil.combo, 0);
  assert.ok(log.some((l) => l.cut === vg.CUT.jce));
  assert.ok(!log.some((l) => l.sfx));
  // ผลหลังคลิป (ทดสอบตรง: คิวคลิปถูกแทนที่ด้วย stub → เรียกฟังก์ชันที่ฝากไว้เอง)
  assert.equal(vit(P.E), 15 - 6);
  assert.equal(vit(P.D), 15 - 4 - 6);
  assert.notEqual(engine.actorId, 'V');
});

test('ตีปกติโดน +1 HIT', () => {
  const P = vergilVs();
  assert.deepEqual(vg.onStrikeLanded(engine, P.V, P.D, {}), ['1 HIT']);
  assert.equal(P.V.vergil.combo, 1);
});

test('ลบสกิลติดตัว: ไม่นับคอมโบ · ไม่มีหน้าต่างเวลา · กินโควตาตามปกติ', () => {
  const P = vergilVs();
  P.V.statuses.noPassive = 2;
  engine.useSkill('V', 'basic', ['D']);
  assert.equal(P.V.vergil.combo, 0);
  assert.equal(P.V.vergil.max, 0);
  assert.equal(P.V.skillPoints, 7);
  engine.useSkill('V', 'basic', ['D']);
  assert.equal(P.V.skillPoints, 7); // โควตาหมด
});

test('พายุไม่หยุด: เหลือ 2 คน = โดนตีคอมโบไม่หลุด · ต้นเทิร์นแต้ม +2 เกราะ +1 · 3 คน = ไม่ทำงาน', () => {
  const P = vergilVs();
  engine.useSkill('V', 'basic', ['D']);
  vg.charAction(engine, P.V, 'sheathe');
  assert.ok(vg.duelOn(engine, P.V));
  engine.withEffectSource(P.D, () => engine.dealMixed(P.V, 1, false));
  assert.equal(P.V.vergil.combo, 3);
  P.V.skillPoints = 3; P.V.armor = 2;
  vg.onRoundStartTick(engine, P.V);
  assert.equal(P.V.skillPoints, 5);
  assert.equal(P.V.armor, 3);
  vg.onRoundDealt(engine);
  vg.onRoundDealt(engine);
  assert.equal(log.filter((l) => l.cut === vg.CUT.duel).length, 1); // คลิปพายุไม่หยุดครั้งแรกของแมตช์เท่านั้น
  const Q = setup([['V', 'vergil', 5, 7], ['D', 'dummy', 6, 7], ['E', 'dummy', 9, 7]]);
  assert.ok(!vg.duelOn(engine, Q.V));
  Q.E.alive = false;
  assert.ok(vg.duelOn(engine, Q.V));
  Q.V.statuses.noPassive = 2;
  assert.ok(!vg.duelOn(engine, Q.V));
});
