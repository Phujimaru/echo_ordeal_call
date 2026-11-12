// ลบสกิลติดตัว (noPassive · server/passiveSeal.js) — กลุ่ม b:
//  เกรย์ · ไจโร · ดิเอโก้ · เฟิร์น · ฟันนี่ วาเลนไทน์ · เซลิน · ทาคุโตะ · เรียวกิ
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const Flora = require('../server/flora');

const H = (id) => engine.CHAR_HOOKS[id];
const blank = (id, characterId, position) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId: null, skillPoints: 0, gold: 0, img: '', ready: true, avatar: 0,
});
// list = [[id, characterId, x, y], ...] — แถว y = 6..8 ช่วง x = 2..12 ของภูมิภาค I เป็นพื้นโล่ง
function setup(list) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, ch], i) => { engine.players[id] = blank(id, ch, i + 1); });
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setJourneyArea(1);
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.skillPoints = 0; p.shield = 0; p.statuses = {}; p.statusAmt = {};
    p.hp = engine.maxHpOf(p); p.armor = 2;
  }
  return engine.players;
}
const seal = (p) => { p.statuses.noPassive = 2; };
const unseal = (p) => { delete p.statuses.noPassive; };

const realRandom = Math.random;
const saved = {
  triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash,
  sfx: engine.sfx, boardFx: engine.boardFx, boardFxTo: engine.boardFxTo,
};
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = () => {};
  engine.skillFlash = () => {};
  engine.sfx = () => {};
  engine.boardFx = () => {};
  engine.boardFxTo = () => {};
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.afterEach(() => { Math.random = realRandom; engine.clearPhaseTimer(); });

// ---------- เกรย์ ----------
test('เกรย์: สัปเหร่อ — พลังโจมตีจากศพ/เก็บศพ ปิดเมื่อติด noPassive (ศพที่เก็บไว้ไม่หาย · ศพยังค้าง)', () => {
  const P = setup([['A', 'gray', 4, 7], ['B', 'dummy', 5, 7], ['C', 'dummy', 9, 7]]);
  const h = H('gray');
  P.A.gray.souls = 2;
  assert.equal(h.damageBonus(engine, P.A, P.C, {}), 2);
  P.B.hp = 0; P.B.armor = 0;
  engine.instantDeath(P.B);
  assert.equal(P.B.alive, false);
  assert.ok(engine.corpseKept(P.B));
  assert.equal(h.canReapCorpse(engine, P.A, P.B), true);
  seal(P.A);
  assert.equal(h.damageBonus(engine, P.A, P.C, {}), 0);
  assert.equal(h.canReapCorpse(engine, P.A, P.B), false);
  assert.ok(engine.corpseKept(P.B), 'ศพยังค้างบนกระดาน');
  assert.equal(P.A.gray.souls, 2);
  unseal(P.A);
  assert.equal(h.damageBonus(engine, P.A, P.C, {}), 2);
});

// ---------- ไจโร ----------
test('ไจโร: ม้า/ทองคำ/ผลัก ปิดเมื่อติด noPassive', () => {
  const P = setup([['A', 'gyro_zeppeli', 4, 7], ['B', 'dummy', 8, 7]]);
  const h = H('gyro_zeppeli');
  assert.equal(P.A.gyro.mounted, true);
  assert.equal(h.mov(P.A), 5);
  assert.deepEqual(h.range(P.A), [1, 5]);
  const path = [{ x: 4, y: 7 }, { x: 5, y: 7 }, { x: 6, y: 7 }, { x: 7, y: 7 }];
  h.afterWalk(engine, P.A, path);
  assert.equal(P.A.gyro.golden, 3);
  assert.deepEqual(h.counterPush(engine, P.A, P.B, {}), { push: true });
  assert.equal(h.absorbDamage(engine, P.A), true);
  assert.equal(P.A.gyro.horseHp, 2);

  seal(P.A);
  assert.equal(h.mov(P.A), 4);
  assert.deepEqual(h.range(P.A), [1, 4]);
  assert.deepEqual(h.afterWalk(engine, P.A, path), []);
  assert.equal(P.A.gyro.golden, 3);
  assert.equal(h.counterPush(engine, P.A, P.B, {}), null);
  assert.equal(h.absorbDamage(engine, P.A), false);
  assert.equal(P.A.gyro.horseHp, 2);
  assert.equal(h.charAction(engine, P.A, 'horse'), false);
  assert.equal(P.A.gyro.mounted, true, 'สถานะขี่ค้างไว้');
  // ตีโดน (ไม่เสริม) = ไม่ผลัก
  h.onStrikeResolved(engine, P.A, P.B, { dmg: 1 }, {});
  assert.equal(h.afterBoardAttack(engine, P.A, P.B, { dmg: 1 }), null);
  assert.deepEqual(P.B.pos, { x: 8, y: 7 });
});

test('ไจโร: ไม่ติด noPassive — ตีโดนผลักเป้า', () => {
  const P = setup([['A', 'gyro_zeppeli', 4, 7], ['B', 'dummy', 8, 7]]);
  const h = H('gyro_zeppeli');
  h.onStrikeResolved(engine, P.A, P.B, { dmg: 1 }, {});
  const after = h.afterBoardAttack(engine, P.A, P.B, { dmg: 1 });
  assert.equal(typeof after, 'function');
  after();
  assert.deepEqual(P.B.pos, { x: 9, y: 7 });
});

// ---------- ดิเอโก้ ----------
test('ดิเอโก้: ไม่โดนของตัวเอง/เล่ห์เหลี่ยม/ม้า ปิดเมื่อติด noPassive', () => {
  const P = setup([['A', 'diego_alt', 4, 7], ['B', 'dummy', 6, 7]]);
  const h = H('diego_alt');
  engine.board.diego = { oil: { '4,7': { owner: 'A' } }, fire: { '6,7': { owner: 'A', until: 99 } }, ash: {} };
  assert.equal(h.mov(P.A), 5);
  assert.equal(h.movPenalty(engine, P.A, P.A.pos), 0);
  // กองไฟเผาศัตรู = เล่ห์เหลี่ยม +1
  P.A.diego.cunning = 0;
  h.onRoundStartTick(engine, P.B);
  assert.ok((P.B.statuses.hburn || 0) > 0);
  assert.equal(P.A.diego.cunning, 1);

  seal(P.A);
  assert.equal(h.mov(P.A), 4);
  assert.equal(h.movPenalty(engine, P.A, P.A.pos), 1, 'แอ่งน้ำมันของตัวเองทำให้ช้า');
  delete P.B.statuses.hburn;
  h.onRoundStartTick(engine, P.B);
  assert.ok((P.B.statuses.hburn || 0) > 0);
  assert.equal(P.A.diego.cunning, 1, 'เล่ห์เหลี่ยมไม่เพิ่ม');
  // ยืนบนกองไฟของตัวเอง = ลุกไหม้
  engine.board.diego.fire['4,7'] = { owner: 'A', until: 99 };
  h.onRoundStartTick(engine, P.A);
  assert.ok((P.A.statuses.hburn || 0) > 0);
  assert.equal(h.absorbDamage(engine, P.A), false);
  assert.equal(h.charAction(engine, P.A, 'horse'), false);
  assert.equal(h.hudActions(engine, P.A)[0].disabled, true);
});

test('ดิเอโก้: ไม่ติด noPassive — ยืนบนกองไฟตัวเองไม่ลุกไหม้ · ม้ารับดาเมจ', () => {
  const P = setup([['A', 'diego_alt', 4, 7]]);
  const h = H('diego_alt');
  engine.board.diego = { oil: {}, fire: { '4,7': { owner: 'A', until: 99 } }, ash: {} };
  h.onRoundStartTick(engine, P.A);
  assert.equal(P.A.statuses.hburn || 0, 0);
  assert.equal(h.absorbDamage(engine, P.A), true);
});

// ---------- เฟิร์น ----------
test('เฟิร์น: กันการโจมตี/ครั้งเสริมพลัง ปิดเมื่อติด noPassive (ที่นับไว้ไม่หาย)', () => {
  const P = setup([['A', 'fern', 4, 7], ['B', 'dummy', 6, 7], ['C', 'dummy', 8, 7]]);
  const h = H('fern');
  // ไม่ติด: กัน
  h.onAttacked(engine, P.A, P.B);
  assert.ok(h.blocksAttack(engine, P.A, P.B));
  // ติด: ไม่กัน (การกันพร้อมอยู่ก็ตาม)
  P.A.fern.shieldReady = 0; P.A.fern.blockKey = null;
  seal(P.A);
  h.onAttacked(engine, P.A, P.C);
  assert.equal(h.blocksAttack(engine, P.A, P.C), null);
  assert.equal(P.A.fern.shieldReady, 0);
  // ครั้งเสริมพลัง
  P.A.fern.count = 4;
  assert.equal(h.strikePierces(engine, P.A), false);
  P.A.skillPoints = 5;
  h.onStrikeResolved(engine, P.A, P.B, {}, {});
  assert.equal(P.A.skillPoints, 4, 'เสีย Energy ตามปกติ');
  h.afterStrike(engine, P.A);
  assert.equal(P.A.fern.count, 4, 'ไม่นับ/ไม่รีเซ็ท');
  unseal(P.A);
  assert.equal(h.strikePierces(engine, P.A), true);
  P.A.fern.castReady = 9;
  h.afterStrike(engine, P.A);
  assert.equal(P.A.fern.count, 0);
  assert.equal(P.A.fern.castReady, 0);
});

// ---------- ฟันนี่ วาเลนไทน์ ----------
test('วาเลนไทน์: สันติภาพและความยุติธรรม — ทำดาเมจไม่ได้แต้มเมื่อติด noPassive', () => {
  const P = setup([['A', 'funny_valentine', 4, 7], ['B', 'dummy', 6, 7]]);
  const h = H('funny_valentine');
  P.A.skillPoints = 0;
  seal(P.A);
  h.onDamageDealt(engine, P.A, P.B);
  assert.equal(P.A.skillPoints, 0);
  unseal(P.A);
  P.A.valentine.gainKey = undefined;
  h.onDamageDealt(engine, P.A, P.B);
  assert.equal(P.A.skillPoints, 1);
});

// ---------- เซลิน ----------
test('เซลิน: เวลาน้ำชา/คริในพุ่ม/สวนดอกไม้/จุดด้อยซ่อนในพุ่ม ปิดเมื่อติด noPassive', () => {
  const P = setup([['A', 'celine', 4, 7]]);
  const h = H('celine');
  Flora.lay(engine.boardMap(), [{ x: 4, y: 7 }], 'X', 5);
  assert.equal(h.inBloom(engine, P.A), true);
  assert.equal(h.bushExposed(P.A), true);
  assert.equal(h.critPct(P.A), 20);

  seal(P.A);
  assert.equal(h.bushExposed(P.A), false);
  assert.equal(h.critPct(P.A), 0);
  P.A.hp = 3;
  P.A.celine.teaStreak = 1;
  h.onRoundStartTick(engine, P.A);
  assert.equal(P.A.hp, 3, 'ไม่ฟื้น');
  assert.equal(P.A.celine.teaStreak, 1, 'ค่าที่นับไว้คงเดิม');
  assert.deepEqual(h.afterWalk(engine, P.A, [{ x: 5, y: 7 }, { x: 6, y: 7 }]), []);
  assert.equal(!!(engine.board.flora || {})['6,7'], false);
  h.onForcedMove(engine, P.A, [{ x: 7, y: 7 }]);
  assert.equal(!!(engine.board.flora || {})['7,7'], false);

  unseal(P.A);
  h.onRoundStartTick(engine, P.A);
  assert.equal(P.A.hp, 4, 'ไม่ติด: ฟื้น 1');
  assert.ok(h.afterWalk(engine, P.A, [{ x: 5, y: 7 }, { x: 6, y: 7 }]).length > 0);
  assert.equal(!!engine.board.flora['6,7'], true);
});

// ---------- ทาคุโตะ ----------
test('ทาคุโตะ: ห่วงเวลา +45%/ภูมิคุ้มกัน/ช่วงพังทลาย/พลังโจมตี/ดาบแห่งการพิพากษา ปิดเมื่อติด noPassive', () => {
  const P = setup([['A', 'takuto', 4, 7], ['B', 'dummy', 8, 7]]);
  const h = H('takuto');
  assert.equal(h.zeroChanceBonus(engine), 45);
  assert.equal(h.zeroImmune(P.A), true);
  assert.ok(h.zeroCollapseTurns(engine) > 0);
  P.A.takuto.form = 'tauburn';
  P.A.takuto.awakened = true;
  P.A.takuto.judgment = true;
  P.A.statuses.takutoEmerald = 3; P.A.statuses.takutoSapphire = 3;
  assert.equal(h.damageBonus(engine, P.A), 1);
  assert.equal(h.judgmentOn(P.A), true);

  seal(P.A);
  assert.equal(h.zeroChanceBonus(engine), 0);
  assert.equal(h.zeroImmune(P.A), false);
  assert.equal(h.zeroCollapseTurns(engine), 0);
  assert.equal(h.damageBonus(engine, P.A), 0);
  assert.equal(h.judgmentOn(P.A), false);
  assert.equal(P.A.takuto.awakened, true, 'ค่าที่ได้ไว้ไม่หาย');
  unseal(P.A);
  assert.equal(h.judgmentOn(P.A), true);
});

// ---------- เรียวกิ ----------
test('เรียวกิ: ฟันแนว/สังหาร 5%/พลังโจมตีหลังท่าไม้ตาย ปิดเมื่อติด noPassive', () => {
  const P = setup([['A', 'ryougi', 4, 7], ['B', 'dummy', 5, 7]]);
  const h = H('ryougi');
  P.A.statuses[h.BLOOM] = 2;
  assert.equal(h.attackLane(P.A), true);
  assert.equal(h.laneLen(P.A), 2);
  assert.equal(h.killChance(P.A), h.KILL_CHANCE);
  assert.equal(h.damageBonus(engine, P.A), 1);
  seal(P.A);
  assert.equal(h.attackLane(P.A), false);
  assert.equal(h.laneLen(P.A), 0);
  assert.equal(h.killChance(P.A), 0);
  assert.equal(h.damageBonus(engine, P.A), 0);
  assert.equal(P.A.statuses[h.BLOOM], 2, 'สถานะที่ติดไปแล้วไม่หาย');
});
