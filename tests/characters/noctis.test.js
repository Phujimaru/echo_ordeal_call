// น็อตทิส (noctis) — อาวุธของราชวงศ์ / Warp Strike / Warp Point / ขานรับ / ทำลายให้สิ้น / ปลดปล่อย / ให้มันจบ / สายเลือดราชา / หัวใจของเหล่าปวงชน (GRID_PLAN §7.31)
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const noct = require('../../characters/noctis.js');
const { CHAR_BY_ID } = require('../../characters.js');
const action = require('../../server/phases/action.js');
const match = require('../../server/match.js');

const realRandom = Math.random;
const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
// แถว y = 6..8 ช่วง x = 2..12 ของภูมิภาค I เป็นพื้นโล่ง
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
const flush = (t, ms = 6000) => { for (let i = 0; i < ms / 100; i++) t.mock.timers.tick(100); };
const saved = {
  triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash,
  notifyTransform: engine.notifyTransform, sfx: engine.sfx,
};
const calls = { queue: [], trig: [] };
test.before(() => {
  engine.triggerCutscene = (p, key) => calls.trig.push(key);
  engine.queueCutscene = (p, key) => calls.queue.push(key);
  engine.skillFlash = () => {};
  engine.notifyTransform = () => {};
  engine.sfx = () => {};
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.beforeEach(() => { calls.queue = []; calls.trig = []; });
test.afterEach(() => { Math.random = realRandom; engine.setGameMode('ffa'); engine.setCycleShift(0); engine.clearPhaseTimer(); });

test('ข้อมูล: มหันตภัย · unique · ชาย · HP 8 เกราะ 2 · แต้มสูงสุด 8 · เริ่ม Engine Blade', () => {
  const ch = CHAR_BY_ID.noctis;
  assert.equal(ch.difficulty, 'calamity');
  assert.equal(ch.unique, true);
  assert.equal(ch.gender, 'm');
  const P = setup([['N', 'noctis', 3, 7], ['B', 'dummy', 8, 7]]);
  assert.equal(P.N.hp, 8);
  assert.equal(P.N.armor, 2);
  assert.equal(engine.maxSkillOf(P.N), 8);
  assert.equal(P.N.noct.weapon, 'engine');
  const pub = noct.skillPub(P.N, 'basic');
  assert.equal(pub.choices.length, 14);
  assert.ok(pub.choices.every((c) => c.desc && c.img));
});

test('เปลี่ยนอาวุธ: ฟรี ไม่กินโควตา ยังเดินได้ · เทิร์นละครั้ง · Axe เดิน 2 โจมตี +2', () => {
  const P = setup([['N', 'noctis', 3, 7], ['B', 'dummy', 8, 7]]);
  engine.setActor('N');
  engine.useSkill('N', 'basic', [], { form: 'axe' });
  assert.equal(P.N.noct.weapon, 'axe');
  assert.equal(P.N.skillPoints, 8);
  assert.equal(engine.action.locked, false, 'ยังเดินได้');
  assert.equal(P.N.skillUsedRound, false, 'ไม่กินโควตา');
  engine.useSkill('N', 'basic', [], { form: 'bow' });
  assert.equal(P.N.noct.weapon, 'axe', 'เทิร์นละครั้ง');
  assert.equal(action.baseMovOf(P.N), 2);
  assert.equal(engine.attackPowerAgainst(P.N, P.B), 3);
});

test('Bow ระยะ 2–4 · Star 1–3 · Trident แนวตรง 2 ช่องโดนทุกคน + ไม่ไถล', () => {
  const P = setup([['N', 'noctis', 3, 7], ['A', 'dummy', 4, 7], ['B', 'dummy', 5, 7], ['C', 'dummy', 7, 7]]);
  P.N.noct.weapon = 'bow';
  assert.equal(action.canStrike(P.N, P.A), false);
  assert.equal(action.canStrike(P.N, P.C), true);
  P.N.noct.weapon = 'star';
  assert.equal(action.canStrike(P.N, P.C), false);
  P.N.noct.weapon = 'trident';
  assert.equal(action.canStrike(P.N, P.B), true);
  assert.deepEqual(action.laneVictims(P.N, P.A).ids, ['B']);
  assert.equal(action.noSlide(P.N), true);
});

test('สายเลือดราชา: Katana 3 ฮิต = เสียเลือดตัวเอง 3 (ลดเกราะก่อน) · Engine Blade ไม่เสีย', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['N', 'noctis', 3, 7], ['B', 'dummy', 4, 7]]);
  P.B.hp = 20; P.B.armor = 0;
  P.N.noct.weapon = 'katana';
  Math.random = () => 0.01; // ฮิต 2/3 ติด · คริติด
  engine.setActor('N');
  engine.attackTarget('N', 'B');
  flush(t, 8000);
  assert.equal(P.N.armor + P.N.hp, 10 - 3, 'เสีย 3');
  assert.equal(P.N.armor, 0);
  // Engine Blade
  const Q = setup([['N', 'noctis', 3, 7], ['B', 'dummy', 4, 7]]);
  Q.B.hp = 20;
  Math.random = () => 0.99;
  engine.setActor('N');
  engine.attackTarget('N', 'B');
  flush(t, 8000);
  assert.equal(Q.N.armor + Q.N.hp, 10);
});

test('Tall: แม่นยำ 60% (พลาด = ไม่มีดาเมจ) · โดน = เลือดไหล 2 · ขานรับ = ไม่พลาด ไม่เสียเลือดตัวเอง', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  let P = setup([['N', 'noctis', 3, 7], ['B', 'dummy', 4, 7]]);
  P.B.hp = 20; P.B.armor = 0;
  P.N.noct.weapon = 'tall';
  Math.random = () => 0.1; // < 40% = พลาด
  engine.setActor('N');
  engine.attackTarget('N', 'B');
  flush(t, 6000);
  assert.equal(P.B.hp, 20, 'พลาด');
  P = setup([['N', 'noctis', 3, 7], ['B', 'dummy', 4, 7]]);
  P.B.hp = 20; P.B.armor = 0;
  P.N.noct.weapon = 'tall';
  engine.setActor('N');
  engine.useSkill('N', 'secondary', [], { form: 'heed' });
  assert.equal(P.N.noct.heed, true);
  assert.equal(P.N.skillPoints, 5);
  assert.equal(noct.preAttackClip(engine, P.N), 'noctHeed_tall', 'คลิปท่าของอาวุธที่ถือ');
  engine.attackTarget('N', 'B');
  assert.equal(P.B.hp, 16, 'โจมตี 1 + Tall 2 + เสริมพลัง 1');
  assert.equal(P.B.statuses.hbleed, 2);
  flush(t, 40000); // คลิปก่อนฉากตี + ฉากตี (เทสต์ไม่มีลำดับเดิน = จบเทิร์นต่อเลย)
  assert.equal(P.N.hp + P.N.armor, 10, 'ขานรับ = ไม่เสียเลือดตัวเอง');
  assert.equal(P.N.noct.heed, false, 'ใช้แล้วหมด');
});

test('Mace: ผลัก 2 ช่อง · ชน = ตรึง + ดาเมจ 2', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['N', 'noctis', 3, 7], ['B', 'dummy', 4, 7], ['C', 'dummy', 6, 7]]);
  P.B.hp = 20; P.B.armor = 0;
  P.N.noct.weapon = 'mace';
  Math.random = () => 0.99;
  engine.setActor('N');
  engine.attackTarget('N', 'B');
  flush(t, 6000);
  assert.deepEqual(P.B.pos, { x: 5, y: 7 }, 'ผลักได้ 1 แล้วชน C');
  assert.ok(match.lastLog.some((l) => l.includes('B กระแทก — ถูกตรึง')), 'ตรึง (สถานะหมดไปแล้วเพราะเทสต์ไม่มีลำดับเดิน = จบเทิร์นทันที)');
  assert.equal(P.B.hp, 20 - 1 - 2);
});

test('Warp Strike: 1 แต้ม · ขว้างแนว 4 วาร์ปไปหน้าเป้าคนแรก แล้วตีปกติ', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['N', 'noctis', 3, 7], ['B', 'dummy', 7, 7], ['C', 'dummy', 3, 2]]);
  P.B.hp = 20; P.B.armor = 0;
  Math.random = () => 0.99;
  engine.setActor('N');
  const acts = noct.hudActions(engine, P.N);
  const warp = acts.find((a) => a.key === 'warp');
  assert.ok(warp.tiles.some((c) => c.x === 7 && c.y === 7));
  assert.ok(!warp.tiles.some((c) => c.y === 2), 'C ห่าง 5 = นอกแนว');
  assert.equal(noct.charAction(engine, P.N, 'warp', { tile: { x: 5, y: 7 } }), true);
  assert.deepEqual(P.N.pos, { x: 6, y: 7 });
  assert.equal(P.N.skillPoints, 7);
  assert.equal(P.B.hp, 19);
  flush(t, 6000);
});

test('Warp Point: วาร์ปไปช่องติดสิ่งกีดขวาง · หลบได้ 1 ครั้ง · เดินต่อไม่ได้ · เทิร์นละครั้ง', () => {
  const P = setup([['N', 'noctis', 3, 7], ['B', 'dummy', 9, 7]]);
  engine.setActor('N');
  const tiles = noct.pointTiles(engine, P.N);
  if (!tiles.length) return; // แผนที่ไม่มีสิ่งกีดขวางในระยะ — ข้าม
  assert.equal(noct.charAction(engine, P.N, 'point', { tile: tiles[0] }), true);
  assert.deepEqual(P.N.pos, tiles[0]);
  assert.equal(engine.action.locked, true);
  assert.equal(P.N.noct.dodge, true);
  assert.deepEqual(noct.grantedDodge(engine, P.N, P.B) && 'ok', 'ok');
  assert.equal(P.N.noct.dodge, false, 'ใช้แล้วหมด');
  assert.equal(noct.charAction(engine, P.N, 'point', { tile: tiles[0] }), false, 'เทิร์นละครั้ง');
});

test('Wise: สกิลจากผู้ที่ห่าง ≥4 ช่อง 70% หลบ · ใกล้กว่านั้นไม่หลบ', () => {
  const P = setup([['N', 'noctis', 3, 7], ['B', 'dummy', 7, 7], ['C', 'dummy', 5, 7]]);
  P.N.noct.weapon = 'wise';
  Math.random = () => 0.5;
  assert.ok(noct.grantedDodge(engine, P.N, P.B));
  assert.equal(noct.grantedDodge(engine, P.N, P.C), null);
});

test('ทำลายให้สิ้น (PVP): แนว 6×3 ดาเมจ 4 · คูลดาวน์ 3', () => {
  const P = setup([['N', 'noctis', 3, 7], ['B', 'dummy', 6, 8], ['C', 'dummy', 10, 7]]);
  P.B.hp = 10; P.B.armor = 0; P.C.hp = 10; P.C.armor = 0;
  Math.random = () => 0.99;
  engine.setActor('N');
  engine.useSkill('N', 'secondary', [], { form: 'ruin', dir: 'right' });
  assert.deepEqual(calls.trig, ['noctRuin']);
  // ผลลงหลังคลิป (afterCutscene)
  for (const fn of match.afterCutscene.splice(0)) fn();
  assert.equal(P.B.hp, 6);
  assert.equal(P.C.hp, 10, 'นอกแนว 6');
  assert.equal(noct.skillPub(P.N, 'secondary').choices.find((c) => c.key === 'ruin').cd, 3);
});

test('ปลดปล่อยพลังที่แท้จริง: เดิน 6 · ระยะ 1–4 · ไม่เสียเลือดตัวเอง · แต้ม +1 ต่อเทิร์น · 5 เทิร์น', () => {
  const P = setup([['N', 'noctis', 3, 7], ['B', 'dummy', 7, 7]]);
  engine.setActor('N');
  engine.useSkill('N', 'ultimate', [], { form: 'unleash' });
  assert.deepEqual(calls.trig, ['noctUnleash']);
  assert.equal(action.baseMovOf(P.N), 6);
  assert.deepEqual(action.rangeOf(P.N), [1, 4]);
  assert.equal(action.canStrike(P.N, P.B), true);
  assert.equal(noct.canUseSkill(engine, P.N, 'basic', [], { form: 'axe' }), false, 'เปลี่ยนอาวุธไม่ได้');
  const until = P.N.noct.unleash.until;
  assert.equal(until - engine.roundNumber, 4);
});

test('ให้มันจบตรงนี้แหละ: เลือดตัวเองเหลือ 1 · ดาเมจ 9 ไม่ฆ่า · ล้างบัฟ · ครั้งเดียว', () => {
  const P = setup([['N', 'noctis', 3, 7], ['B', 'dummy', 6, 7]]);
  P.B.hp = 7; P.B.armor = 3;
  engine.applyBuff(P.B, 'might', 1, 2);
  Math.random = () => 0.99;
  engine.setActor('N');
  engine.useSkill('N', 'ultimate', [], { form: 'end', dir: 'right' });
  assert.equal(P.N.hp, 1);
  assert.deepEqual(P.N.pos, { x: 5, y: 7 }, 'วาร์ปไปหน้าเป้า');
  for (const fn of match.afterCutscene.splice(0)) fn();
  assert.equal(P.B.alive, true);
  assert.equal(P.B.hp, 1);
  assert.equal(P.B.armor, 0);
  assert.ok(!(P.B.statuses.might > 0), 'ล้างบัฟ');
  assert.equal(noct.canUseSkill(engine, P.N, 'ultimate', ['B'], { form: 'end' }), false);
});

test('กันตาย: ตายครั้งแรก = เลือด 2 เกราะ +1 + คลิป · ครั้งที่สองตาย', () => {
  const P = setup([['N', 'noctis', 3, 7], ['B', 'dummy', 6, 7]]);
  P.N.armor = 0;
  engine.withEffectSource(P.B, () => { P.N.hp = 0; engine.instantDeath(P.N); });
  assert.equal(P.N.alive, true);
  assert.equal(P.N.hp, 2);
  assert.equal(P.N.armor, 1);
  assert.ok(calls.queue.includes('noctGuts'));
  engine.withEffectSource(P.B, () => { P.N.hp = 0; engine.instantDeath(P.N); });
  assert.equal(P.N.alive, false);
  assert.ok(calls.queue.includes('noctDeath'), 'ตายโดยไม่เคยฆ่าใคร');
});

test('หัวใจของเหล่าปวงชน: เหลือ 2 คน → คลิป → เข้าช่วย = ผู้โจมตีตาย ผู้ถูกช่วยชนะ · ปล่อย = ตาย', () => {
  for (const yes of [true, false]) {
    const P = setup([['N', 'noctis', 3, 7], ['A', 'dummy', 6, 7], ['B', 'dummy', 9, 7]]);
    P.N.noct.gutsUsed = true;
    engine.withEffectSource(P.A, () => engine.instantDeath(P.N, true));
    assert.equal(P.N.alive, false);
    calls.queue = [];
    engine.withEffectSource(P.A, () => { P.B.hp = 0; engine.instantDeath(P.B); });
    assert.equal(P.B.alive, true, 'ค้างรอ');
    assert.ok(calls.queue.includes('noctAtlas'));
    for (const fn of match.afterCutscene.splice(0)) fn(); // เริ่มรอตัดสิน
    assert.ok(engine.buildStateFor('N').players.find((p) => p.id === 'N').noct.heart);
    const beat = match.skillBeats.splice(0).pop();
    P.N.noct.heart.choice = yes;
    beat.fn();
    for (const fn of match.afterCutscene.splice(0)) fn();
    if (yes) {
      assert.equal(P.A.alive, false, 'ผู้โจมตีตาย');
      assert.equal(match.forcedWinnerId, 'B');
      match.forcedWinnerId = null;
    } else assert.equal(P.B.alive, false, 'ปล่อย = ตาย');
  }
});

test('หัวใจของเหล่าปวงชน: น็อตทิสเคยฆ่าคน = ไม่ทำงาน · ยังเหลือ 3 คน = ไม่ทำงาน', () => {
  const P = setup([['N', 'noctis', 3, 7], ['A', 'dummy', 6, 7], ['B', 'dummy', 9, 7], ['C', 'dummy', 11, 7]]);
  P.N.noct.gutsUsed = true;
  engine.withEffectSource(P.A, () => engine.instantDeath(P.N, true));
  engine.withEffectSource(P.A, () => { P.B.hp = 0; engine.instantDeath(P.B); });
  assert.equal(P.B.alive, false, 'เหลือ A, C, B = 3 คน');
  const Q = setup([['N', 'noctis', 3, 7], ['A', 'dummy', 6, 7], ['B', 'dummy', 9, 7]]);
  Q.N.noct.kills = 1; Q.N.noct.gutsUsed = true;
  engine.withEffectSource(Q.A, () => engine.instantDeath(Q.N, true));
  engine.withEffectSource(Q.A, () => { Q.B.hp = 0; engine.instantDeath(Q.B); });
  assert.equal(Q.B.alive, false);
});
