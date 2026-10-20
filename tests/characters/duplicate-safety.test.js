// ตัวละครซ้ำในแมตช์เดียว (เลือกตัวเดียวกันได้หลายคน): สถานะ/ตัวนับของแต่ละคนต้องแยกกัน ไม่เขียนทับกัน
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const muimi = require('../../characters/muimi.js');
const oberon = require('../../characters/oberon_summer.js');
const sora = require('../../characters/sora_otosumi.js');
const gyro = require('../../characters/gyro_zeppeli.js');

const cutsceneFns = {
  triggerCutscene: engine.triggerCutscene,
  queueCutscene: engine.queueCutscene,
  pausePlayingForCutscene: engine.pausePlayingForCutscene,
  skillFlash: engine.skillFlash,
  sfx: engine.sfx,
  boardFx: engine.boardFx,
};

test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = () => {};
  engine.pausePlayingForCutscene = () => {};
  engine.skillFlash = () => {};
  engine.sfx = () => {};
  engine.boardFx = () => {};
});
test.afterEach(() => { engine.clearPhaseTimer(); engine.setShopPos(null); });

test.after(() => {
  Object.assign(engine, cutsceneFns);
  for (const id of Object.keys(engine.players)) delete engine.players[id];
});

let uid = 0;
function player(characterId, over = {}) {
  const id = `dup${++uid}`;
  const p = Object.assign({
    id, name: id, characterId, alive: true, position: uid, hp: 20, armor: 0, shield: 0, gold: 0,
    skillPoints: 4, gainedSkill: 0, cards: [], statuses: {}, statusAmt: {}, cutsceneShown: {}, seen: {},
    inventory: [], wasAttacked: false, busted: false,
  });
  if (characterId === 'muimi') muimi.resetCombat(p);
  if (characterId === 'oberon_summer') oberon.resetCombat(p);
  if (characterId === 'sora_otosumi') sora.resetCombat(p);
  Object.assign(p, over);
  engine.players[id] = p;
  return p;
}

test.beforeEach(() => {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  engine.setGameMode('ffa');
  engine.setRoundNumber(3);
});

test('โอเบรอน 2 คน: คูลดาวน์ท่าไม้ตาย / โควตานกจาบของแต่ละคนแยกกัน', () => {
  const a = player('oberon_summer');
  const b = player('oberon_summer');
  const target = player('dummy');
  oberon.applyInstantSkill(engine, a, 'ultimate', [target.id]);
  oberon.applyInstantSkill(engine, a, 'secondary', [target.id]);
  assert.equal(oberon.canUseSkill(engine, a, 'ultimate', [target.id]), false);
  assert.equal(oberon.canUseSkill(engine, a, 'secondary', [target.id]), false);
  assert.equal(oberon.canUseSkill(engine, b, 'ultimate', [target.id]), true, 'คูลดาวน์ของอีกคนต้องไม่ติดมา');
  assert.equal(oberon.canUseSkill(engine, b, 'secondary', [target.id]), true, 'โควตาของอีกคนต้องไม่ติดมา');
});

test('โอเบรอน 2 คน: หน้าไหว้หลังหลอกนับเฉพาะคนที่ไม่ถูกโจมตี คนละครั้ง', () => {
  const a = player('oberon_summer');
  const b = player('oberon_summer');
  const c = player('oberon_summer', { wasAttacked: true });
  oberon.onEndTurn(engine);
  assert.deepEqual([a.skillPoints, a.gold], [5, 1]);
  assert.deepEqual([b.skillPoints, b.gold], [5, 1], 'แต่ละคนได้ของตัวเอง ไม่ใช่ได้ซ้อนจากอีกคน');
  assert.deepEqual([c.skillPoints, c.gold], [4, 0]);
});

test('โอเบรอน 2 คน: ใส่ผลเป้าเดียวกันไม่เขียนทับกัน — ทุกครั้งนับ (นกจาบ 2 + 2 · ความฝัน +8 สตั้น 3 + 3 · ม่าน +2)', () => {
  const a = player('oberon_summer');
  const b = player('oberon_summer');
  const larkT = player('dummy'); // เป้าไม่ผ่าน resetCombat ของโอเบรอน — ฟิลด์รายครั้งต้องเริ่มเองได้
  const dreamT = player('dummy');
  oberon.applyInstantSkill(engine, a, 'secondary', [larkT.id]);
  oberon.applyInstantSkill(engine, b, 'secondary', [larkT.id]);
  larkT.hp = 10;
  oberon.onRoundStartTick(engine, larkT);
  assert.equal(larkT.hp, 10 - 2 * oberon.LARK_DRAIN, 'เครื่องหมายของ a ไม่ถูก b เขียนทับ');
  oberon.applyInstantSkill(engine, a, 'ultimate', [dreamT.id]);
  oberon.applyInstantSkill(engine, b, 'ultimate', [dreamT.id]);
  assert.equal(oberon.atkBonus(dreamT), 2 * oberon.DREAM_ATK);
  oberon.onEndTurn(engine);
  assert.equal(dreamT.statuses.stun, 2 * oberon.DREAM_STUN_TURNS, 'สตั้นของ a ไม่หาย');
  assert.equal(dreamT.statuses.obsDream, undefined);
  oberon.applyInstantSkill(engine, a, 'basic', [a.id, larkT.id]);
  oberon.applyInstantSkill(engine, b, 'basic', [b.id, larkT.id]);
  assert.equal(oberon.atkBonus(larkT), 2 * oberon.VEIL_ATK);
  assert.equal(oberon.atkBonus(a), oberon.VEIL_ATK, 'ม่านของ b ไม่ถึง a');
});

test('มุยมิ 2 คน: เสบียงฉุกเฉินและคูลดาวน์ท่าไม้ตายนับแยกกัน', () => {
  const a = player('muimi');
  const b = player('muimi');
  muimi.applyInstantSkill(engine, a, 'basic');
  assert.equal(a.muimiEmergencyUses, muimi.EMERGENCY_USES - 1);
  assert.equal(b.muimiEmergencyUses, muimi.EMERGENCY_USES);
  assert.equal(muimi.canUseSkill(engine, b, 'basic'), true);
  muimi.onUltExpire(engine, a);
  assert.equal(muimi.canUseSkill(engine, a, 'ultimate'), false);
  assert.equal(muimi.canUseSkill(engine, b, 'ultimate'), true, 'คูลดาวน์ของอีกคนต้องไม่ติดมา');
  engine.setRoundNumber(engine.roundNumber + 1); // ตัวเลขคูลดาวน์เริ่มโชว์เทิร์นถัดจากที่ตั้งล็อก
  assert.ok(muimi.ultCooldownLeft(engine, a) > 0);
  assert.equal(muimi.ultCooldownLeft(engine, b), 0);
});

// ---------- ไจโร เซปเปลี่ (GRID_PLAN §7.11 "ไจโรหลายคนในแมตช์เดียว") — ใช้กระดานจริง (ภูมิภาค I แถว 7–8 โล่ง) ----------
function board(list, mode = 'ffa') {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, characterId, , , teamId], i) => {
    engine.players[id] = {
      id, name: id, position: i + 1, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
      seen: {}, cutsceneShown: {}, inventory: [], teamId: teamId || null,
    };
  });
  engine.setGameMode(mode);
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setJourneyArea(1);
  engine.setCycleShift(0);
  engine.setShopPos(null);
  engine.setRoundNumber(2);
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.skillPoints = 8; p.skillUsedRound = false; p.shield = 0; p.statuses = {}; p.statusAmt = {};
  }
  return engine.players;
}
const vitOf = (p) => (p.hp || 0) + (p.armor || 0);
const tick = (t, ms) => { for (let i = 0; i < ms / 100; i++) t.mock.timers.tick(100); };
function orderTo(t, ids, actorId) {
  engine.beginOrder();
  engine.turnOrder.splice(0, engine.turnOrder.length, ...ids);
  tick(t, 6600);
  while (engine.actorId !== actorId && engine.actorId) engine.finishActor();
}

test('ไจโร 2 คน: ข้อมูลเก็บที่ตัวผู้เล่น · ลูกของสองคนตกช่องเดียวกันได้ · ลูกเก่าสุดนับตาม seq ของเจ้าของ · เรียกคืนได้เฉพาะลูกตัวเอง', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = board([['A', 'gyro_zeppeli', 2, 7], ['B', 'gyro_zeppeli', 2, 8], ['T', 'dummy', 5, 7], ['U', 'dummy', 12, 2]]);
  // หลบพ้น = ลูกตกช่องเป้า (ไม่มีการผลักมาย้ายลูก)
  gyro.onStrikeResolved(engine, P.A, P.T, { dmg: 0, dodge: true }, {});
  gyro.onStrikeResolved(engine, P.B, P.T, { dmg: 0, dodge: true }, {});
  P.T.pos = { x: 6, y: 2 };
  gyro.onStrikeResolved(engine, P.B, P.T, { dmg: 0, dodge: true }, {});
  assert.deepEqual(P.A.gyro.balls, [{ x: 5, y: 7, seq: 1 }]);
  assert.deepEqual(P.B.gyro.balls, [{ x: 5, y: 7, seq: 1 }, { x: 6, y: 2, seq: 2 }], 'ช่องเดียวกันไม่ทับกัน · seq ของ B นับเอง');
  assert.equal(gyro.hand(P.A), 1);
  assert.equal(gyro.hand(P.B), 0);
  engine.setActor('B');
  engine.useSkill('B', 'basic', []);
  tick(t, 1000);
  assert.deepEqual(P.B.gyro.balls, [{ x: 6, y: 2, seq: 2 }], 'B เรียกลูกเก่าสุดของตัวเอง');
  assert.deepEqual(P.A.gyro.balls, [{ x: 5, y: 7, seq: 1 }], 'ลูกของ A ไม่ถูกแตะ');
  P.A.gyro.golden = 9;
  assert.equal(P.B.gyro.golden, 0);
  assert.equal(P.T.gyro, null, 'ฮุคล้างค่าเช็คว่าเป็นไจโร (ตัวอื่นไม่มี p.gyro)');
});

test('ไจโร 2 คน: ลูกของ A วิ่งผ่าน B = B เสีย 1 (ffa) / ไม่เสีย (เพื่อนร่วมทีม)', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  for (const [mode, ta, tb, lose] of [['ffa', null, null, 1], ['duo', 't1', 't1', 0]]) {
    const P = board([['A', 'gyro_zeppeli', 2, 7, ta], ['B', 'gyro_zeppeli', 5, 7, tb], ['X', 'dummy', 12, 2, 't2'], ['Y', 'dummy', 12, 12, 't2']], mode);
    P.A.gyro.balls = [{ x: 8, y: 7, seq: 1 }];
    P.B.gyro.mounted = false; // ไม่ให้ม้ารับแทน — ดูเลือด/เกราะตรงๆ
    const b0 = vitOf(P.B);
    engine.setActor('A');
    engine.useSkill('A', 'basic', []);
    tick(t, 1000);
    assert.equal(vitOf(P.B), b0 - lose, mode);
  }
});

test('ไจโร 2 คน: B ถูก A ดึง/กระเด็น = สัดส่วนทองคำของ B ไม่เพิ่ม · ม้าของ B รับดาเมจก่อน', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = board([['A', 'gyro_zeppeli', 2, 8], ['B', 'gyro_zeppeli', 8, 8], ['C', 'dummy', 12, 2]]);
  P.A.gyro.golden = 30;
  const armor0 = P.B.armor;
  orderTo(t, ['A', 'C', 'B'], 'A');
  engine.useSkill('A', 'secondary', [], { dir: 'right' });
  tick(t, 2000);
  assert.deepEqual(P.B.pos, { x: 4, y: 8 }, 'ถูกดึง 4 ช่อง');
  assert.equal(P.B.gyro.golden, 0, 'ถูกดึงไม่นับ');
  assert.equal(P.B.gyro.horseHp, 1, 'ม้ารับ 2 ก่อน');
  assert.equal(P.B.armor, armor0, 'เกราะยังไม่ลด');
  // กระเด็นจากท่าไม้ตายของ A
  P.A.gyro.empowered = true;
  engine.attackTarget('A', 'B');
  tick(t, 3100);
  assert.equal(P.B.pos.x, 13, 'กระเด็นถึงขอบ');
  assert.equal(P.B.gyro.golden, 0, 'กระเด็นไม่นับ');
  tick(t, 2000);
});

test('ไจโร 2 คน: A ตี B แล้ว B สวน — ใช้ลูกของตัวเอง · ผลัก 1 ช่องของการสวนแทนการถอยปกติ · B ไม่มีลูก = สวนไม่ได้', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = board([['A', 'gyro_zeppeli', 2, 8], ['B', 'gyro_zeppeli', 5, 8], ['C', 'dummy', 12, 2]]);
  P.B.counterBack = true;
  orderTo(t, ['A', 'C', 'B'], 'A');
  const a0 = vitOf(P.A);
  engine.attackTarget('A', 'B');
  const card = engine.buildStateFor('A').attack;
  assert.ok(card.counter, 'B สวน (ระยะของ B ถึง A)');
  assert.deepEqual(P.A.gyro.balls.map((b) => [b.x, b.y]), [[6, 8]], 'ลูกของ A ตกช่องที่ B จะถูกผลักไป');
  assert.deepEqual(P.B.gyro.balls.map((b) => [b.x, b.y]), [[1, 8]], 'ลูกของ B ตกช่องที่ A ถูกผลักไป');
  assert.equal(P.B.gyro.counterFx, null, 'ส่ง throw ของการสวนแล้ว');
  assert.deepEqual(card.push, { from: { x: 2, y: 8 }, to: { x: 1, y: 8 }, collide: false, via: null }, 'ถูกผลัก 1 ช่อง ไม่ถอยซ้อน');
  assert.deepEqual(P.A.pos, { x: 1, y: 8 });
  assert.equal(vitOf(P.A), a0, 'สวนลงม้าของ A ก่อน · ผลักไม่เสียเพิ่ม');
  assert.equal(P.A.gyro.horseHp, 2);
  tick(t, 6000);
  assert.deepEqual(P.B.pos, { x: 6, y: 8 }, 'แล้ว B ถูกลูกของ A ผลักหลังฉากสวน');
  // B ไม่มีลูกในมือ = สวนไม่ได้
  const Q = board([['A', 'gyro_zeppeli', 2, 8], ['B', 'gyro_zeppeli', 5, 8], ['C', 'dummy', 12, 2]]);
  Q.B.counterBack = true;
  Q.B.gyro.balls = [{ x: 0, y: 0, seq: 1 }, { x: 0, y: 1, seq: 2 }];
  orderTo(t, ['A', 'C', 'B'], 'A');
  engine.attackTarget('A', 'B');
  assert.equal(engine.buildStateFor('A').attack.counter, null);
  tick(t, 4000);
});

test('ไจโร 2 คน: ดาเมจจากลูกนับคิลให้เจ้าของลูก · B ตาย = ล้างเฉพาะลูกของ B · ฮุค broadcast ไม่ปนกัน', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = board([['A', 'gyro_zeppeli', 2, 7], ['B', 'gyro_zeppeli', 2, 9], ['T', 'dummy', 4, 7], ['U', 'dummy', 12, 2]]);
  const kills = [];
  gyro.onKill = (eng, killer, victim) => kills.push([killer.id, victim.id]);
  try {
    P.A.gyro.balls = [{ x: 6, y: 7, seq: 1 }];
    P.T.hp = 1; P.T.armor = 0;
    engine.setActor('A');
    engine.useSkill('A', 'basic', []);
    tick(t, 1000);
    assert.equal(P.T.alive, false);
    assert.deepEqual(kills, [['A', 'T']], 'คิลเป็นของเจ้าของลูก');
  } finally { delete gyro.onKill; }
  P.A.gyro.balls = [{ x: 9, y: 9, seq: 4 }];
  P.B.gyro.balls = [{ x: 9, y: 9, seq: 7 }];
  P.B.hp = 0; P.B.armor = 0;
  engine.instantDeath(P.B);
  assert.deepEqual(P.B.gyro.balls, []);
  assert.deepEqual(P.A.gyro.balls, [{ x: 9, y: 9, seq: 4 }], 'ลูกของ A ยังอยู่');
  P.A.gyro.empowered = true;
  gyro.onActorEnd(engine, P.B);
  assert.equal(P.A.gyro.empowered, true, 'จบตาของ B ไม่ล้างเสริมของ A');
});

test('โซระ 2 คน: ร่าง/อาวุธ/โควตาเทิร์น/ตัวนับเพื่อคุณหนูของแต่ละคนแยกกัน', () => {
  const a = player('sora_otosumi', { hp: 5 });
  const b = player('sora_otosumi', { hp: 5 });
  sora.applyInstantSkill(engine, a, 'basic');
  sora.applyInstantSkill(engine, a, 'secondary');
  assert.deepEqual([a.sora.myth, a.sora.gun], [true, true]);
  assert.deepEqual([b.sora.myth, b.sora.gun], [false, false], 'ร่าง/อาวุธของอีกคนต้องไม่เปลี่ยนตาม');
  assert.equal(sora.canUseSkill(engine, a, 'basic'), false);
  assert.equal(sora.canUseSkill(engine, b, 'basic'), true, 'โควตาแปลงร่างของอีกคนต้องไม่ติดมา');
  sora.onEndTurn(engine);
  assert.equal(a.sora.calm, 0, 'ร่าง My-Th ไม่นับ');
  assert.equal(b.sora.calm, 1);
});
