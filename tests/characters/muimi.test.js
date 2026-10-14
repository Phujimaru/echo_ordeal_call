process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine, computeAttackBase, attackSoundOf } = require('../../server.js');
const { CHAR_BY_ID } = require('../../characters.js');
const muimi = require('../../characters/muimi.js');
const Ice = require('../../server/ice.js');
const Zero = require('../../server/zeroTime.js');
const match = require('../../server/match.js');
const Board = require('../../server/board.js');
const draw = require('../../server/phases/draw.js');

const originalFns = {
  queueCutscene: engine.queueCutscene,
  skillFlash: engine.skillFlash,
  broadcastState: engine.broadcastState,
  checkAllLocked: engine.checkAllLocked,
  triggerCutscene: engine.triggerCutscene,
};
const realRandom = Math.random;

let queued = [];

test.before(() => {
  engine.queueCutscene = (p, key) => { queued.push(key); };
  engine.skillFlash = () => {};
  engine.broadcastState = () => {};
  engine.checkAllLocked = () => {};
  engine.triggerCutscene = () => {};
});

test.after(() => {
  Object.assign(engine, originalFns);
  engine.setGameMode('ffa');
  engine.setGameState('LOBBY');
});

test.afterEach(() => {
  Math.random = realRandom;
  engine.clearPhaseTimer();
  engine.setGameMode('ffa');
  engine.setGameState('LOBBY');
});

function mk(id, characterId, position, teamId = null) {
  return {
    id, name: id, characterId, position, teamId, alive: true, connected: true,
    hp: 4, armor: 0, shield: 0, skillPoints: 4, statuses: {}, statusAmt: {},
    seen: {}, cutsceneShown: {}, cards: [], inventory: [],
    locked: false, busted: false, result: null,
    dmgArmor: 0, dmgHp: 0, gainedSkill: 0, skillUsedRound: false,
    transformAt: 0,
  };
}

function setup() {
  for (const key of Object.keys(engine.players)) delete engine.players[key];
  queued = [];
  engine.setRoundNumber(3);
  const m = mk('M', 'muimi', 1);
  const a = mk('A', 'dummy', 2);
  const b = mk('B', 'dummy', 3);
  engine.players.M = m;
  engine.players.A = a;
  engine.players.B = b;
  muimi.resetCombat(m);
  return { m, a, b };
}

// บนกระดานจริง (startMatch) — list = [[id, characterId, x, y], ...] · ภูมิภาค I: แถว y 5..9 รอบ x 7 โล่ง
function boardSetup(list) {
  for (const key of Object.keys(engine.players)) delete engine.players[key];
  list.forEach(([id, ch], i) => { engine.players[id] = mk(id, ch, i + 1); });
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.hp = 5; p.armor = 0; p.shield = 0; p.skillPoints = 8; p.skillUsedRound = false;
    p.statuses = {}; p.statusAmt = {};
  }
  queued = [];
  return engine.players;
}
// หนามน้ำแข็ง Lv3 (เกราะ 2 → Lv2 เกราะ 2 → Lv1 เกราะ 1) — คืนเกราะรวมที่เหลือทุกระดับ (ไม่เหลือ = 0)
function lv3Spike(x, y) {
  Ice.placeSpike(x, y, null, 1);
  Ice.raiseSpike(`${x},${y}`); Ice.raiseSpike(`${x},${y}`);
  assert.equal(Ice.spikeAt(x, y).lv, 3);
  return () => {
    const s = Ice.spikeAt(x, y);
    return s ? s.armor + [0, 0, 1, 3][s.lv] : 0;
  };
}
const LV3_TOTAL = 2 + 2 + 1; // Lv3 ต้องโดนรวม 5 ถึงหาย

test('ข้อมูลตัวละครมุยมิเป็นระดับง่าย ใช้ชื่อสถานะภาษาไทย และมีสกิลครบตามค่าใช้', () => {
  const c = CHAR_BY_ID.muimi;
  assert.ok(c);
  assert.equal(c.name, 'มุยมิ');
  assert.equal(c.difficulty, 'easy');
  assert.equal(c.basic.cost, 0);
  assert.equal(c.basic.ammo, 2);
  assert.equal(c.secondary.cost, 4);
  assert.equal(c.ultimate.cost, 8);
  assert.match(c.secondary.desc, /ดาบเก่าๆ/);
  assert.match(c.ultimate.desc, /ดาบสะบั้น/);
  assert.ok(c.passive);
  assert.equal(c.passive2, undefined, 'หัวใจนักสู้ถอดออกแล้ว (GRID_PLAN §7.1)');
  assert.equal(c.mov, 4);
  assert.deepEqual(c.range, [1, 1]);
});

test('เสบียงฉุกเฉินฟื้นชีวิตและแต้มสกิล กดได้เทิร์นละครั้ง รวม 2 ครั้งต่อเกม', () => {
  const { m } = setup();
  m.hp = 2;
  m.skillPoints = 1;
  assert.equal(muimi.canUseSkill(engine, m, 'basic'), true);
  muimi.applyInstantSkill(engine, m, 'basic');
  assert.equal(m.hp, 4);
  assert.equal(m.skillPoints, 3);
  assert.equal(m.muimiEmergencyUses, 1);
  assert.equal(muimi.canUseSkill(engine, m, 'basic'), false, 'รอบเดียวกันกดซ้ำไม่ได้');

  engine.setRoundNumber(4);
  assert.equal(muimi.canUseSkill(engine, m, 'basic'), true);
  muimi.applyInstantSkill(engine, m, 'basic');
  assert.equal(m.muimiEmergencyUses, 0);
  engine.setRoundNumber(5);
  assert.equal(muimi.canUseSkill(engine, m, 'basic'), false, 'ครบสองครั้งแล้วหมดทั้งเกม');
});

test('เสบียงฉุกเฉินไม่กินสิทธิ์สกิลหลักของเทิร์น แต่สกิลรองกินสิทธิ์ตามปกติ', () => {
  const { m } = setup();
  engine.setActor(m.id); // ใช้สกิลได้เฉพาะตาเดินของตัวเอง
  m.skillPoints = 4;
  engine.useSkill(m.id, 'basic');
  assert.equal(m.skillUsedRound, false);
  assert.equal(m.muimiEmergencyUses, 1);
  engine.useSkill(m.id, 'secondary');
  assert.equal(m.skillUsedRound, true);
  assert.equal(m.statuses.muimiRusty, muimi.RUSTY_TURNS);
});

test('ดาบสนิมกับดาบสะบั้นล็อกกันเองตามสถานะ', () => {
  const { m } = setup();
  muimi.applyInstantSkill(engine, m, 'secondary');
  assert.equal(muimi.canUseSkill(engine, m, 'ultimate'), false);
  delete m.statuses.muimiRusty;
  m.statuses.muimiTower = 2;
  assert.equal(muimi.canUseSkill(engine, m, 'secondary'), true, 'ระหว่างดาบสะบั้นดาบสนิมกดได้ (เป็นคลื่นดาบ)');
  assert.equal(muimi.canUseSkill(engine, m, 'ultimate'), false, 'ระหว่างดาบสะบั้นกดท่าไม้ตายซ้ำไม่ได้');
  delete m.statuses.muimiTower;
  assert.equal(muimi.canUseSkill(engine, m, 'ultimate'), true);
});

test('ค่าบาลานซ์ (เนิฟ): ตีปกติระหว่างดาบสะบั้น +1 · คลื่นดาบ +3 · ฟื้น 2 · คูลดาวน์ 3 — คำอธิบายสกิลตรงกับค่า', () => {
  assert.equal(muimi.TOWER_ATK_BONUS, 1);
  assert.equal(muimi.WAVE_ATK_BONUS, 3);
  assert.equal(muimi.ULT_COOLDOWN_TURNS, 3);
  const desc = CHAR_BY_ID.muimi.ultimate.desc;
  assert.match(desc, new RegExp(`โจมตีพื้นฐาน \\+${muimi.TOWER_ATK_BONUS} `));
  assert.match(desc, new RegExp(`เท่าพลังโจมตี \\+${muimi.WAVE_ATK_BONUS} `));
  assert.match(desc, /ฟื้นพลังชีวิต 2/);
  assert.match(desc, new RegExp(`รอ ${muimi.ULT_COOLDOWN_TURNS} เทิร์น`));
  // ดาบสนิมระหว่างดาบสะบั้น (ผู้ใช้สั่ง 2026-10-12): 4 แต้ม · ดาเมจ 1 + 1
  assert.equal(muimi.TOWER_SEC_COST, 4);
  assert.equal(muimi.SEC_WAVE_ATK_BONUS, 1);
  const sec = CHAR_BY_ID.muimi.secondary.desc;
  assert.match(sec, new RegExp(`\\(${muimi.TOWER_SEC_COST} แต้ม\\)`));
  assert.match(sec, new RegExp(`เท่าพลังโจมตี \\+${muimi.SEC_WAVE_ATK_BONUS} `));
});

test('ดาบสะบั้นหมดลงแล้วคูลดาวน์ 3 เทิร์น ก่อนใช้ท่าไม้ตายซ้ำได้', () => {
  const { m } = setup();
  engine.setRoundNumber(10);
  muimi.onUltExpire(engine, m);
  assert.equal(m.muimiUltLock, 10 + muimi.ULT_COOLDOWN_TURNS);

  // นับถอยหลังทีละเทิร์นจนครบ — ผูกกับค่าคงที่ ไม่ใช่เลขตายตัว จะได้ไม่พังทุกครั้งที่ปรับบาลานซ์
  for (let i = 1; i <= muimi.ULT_COOLDOWN_TURNS; i++) {
    engine.setRoundNumber(10 + i);
    assert.equal(muimi.ultCooldownLeft(engine, m), muimi.ULT_COOLDOWN_TURNS - i + 1);
    assert.equal(muimi.canUseSkill(engine, m, 'ultimate'), false);
  }
  engine.setRoundNumber(10 + muimi.ULT_COOLDOWN_TURNS + 1);
  assert.equal(muimi.ultCooldownLeft(engine, m), 0);
  assert.equal(muimi.canUseSkill(engine, m, 'ultimate'), true);
});

test('ท่าไม้ตาย: ได้ดาบสะบั้น + ต้านสถานะ · ไม่ทำให้ใครไพ่แตกแล้ว · สลับคลิปเต็ม/สั้น', () => {
  const { m, a, b } = setup();
  m.skillPoints = 8;

  muimi.applyInstantSkill(engine, m, 'ultimate');
  // ตอนนี้ไม่มีความสามารถที่ทำให้ไพ่แตก (GRID_PLAN §7)
  assert.equal(engine.bustedOf(a), false);
  assert.equal(engine.bustedOf(b), false);
  assert.equal(engine.bustedOf(m), false);
  assert.equal(m.statuses.muimiTower, 2);
  assert.equal(m.statuses.resist, 3);
  assert.equal(muimi.displayImg(m), muimi.IMG.ultimate);
  assert.deepEqual(queued, ['muimiUltimateFull']);

  engine.setRoundNumber(4);
  muimi.applyInstantSkill(engine, m, 'ultimate');
  assert.deepEqual(queued, ['muimiUltimateFull', 'muimiUltimateShort']);
  // วีดีโอเล่นอย่างละครั้งต่อแมตช์ — ครั้งที่ 3 เป็นแค่การ์ดแจ้งเตือน
  muimi.applyInstantSkill(engine, m, 'ultimate');
  assert.deepEqual(queued, ['muimiUltimateFull', 'muimiUltimateShort']);
});

test('คัตซีนท่าไม้ตายเผื่อเวลาจากความยาวจริงและเล่นเพลงที่กำหนด', () => {
  const full = engine.TRANSFORMS.muimiUltimateFull;
  const short = engine.TRANSFORMS.muimiUltimateShort;
  assert.equal(full.video, '/characters/muimi/muimi_skill3.mp4');
  assert.equal(full.seconds, 24);
  assert.equal(short.video, '/characters/muimi/muimi_skill3_short.mp4');
  assert.equal(short.seconds, 12);
  assert.equal(full.music, 'muimi');
  assert.equal(short.music, 'muimi');
});

test('ดาบเก่าๆ ฟื้น 1/1 ส่วนดาบสะบั้นเพิ่มโจมตี 1 ฟื้นชีวิต 2 และยืดเวลา 1 เทิร์น', () => {
  const { m, a } = setup();
  m.hp = 2;
  m.skillPoints = 2;
  m.statuses.muimiRusty = 3;
  const rusty = muimi.onAttackLanded(engine, m);
  assert.deepEqual(rusty, { mode: 'rusty', hp: 1, sp: 1, extended: false });
  assert.equal(m.hp, 3);
  assert.equal(m.skillPoints, 3);

  delete m.statuses.muimiRusty;
  m.statuses.muimiTower = 2;
  m.hp = 2;
  assert.equal(computeAttackBase(engine, m, a).base, 2, 'ฐาน 1 + ดาบสะบั้น 1 (เนิฟจาก +3)');
  const tower = muimi.onAttackLanded(engine, m);
  assert.equal(tower.hp, 2);
  assert.equal(tower.extended, true);
  assert.equal(m.hp, 4);
  assert.equal(m.statuses.muimiTower, 3);
});


test('เสียงโจมตีสลับตามสถานะดาบสะบั้น', () => {
  const { m } = setup();
  assert.equal(attackSoundOf(m), 'muimi_normal_hit');
  m.statuses.muimiTower = 2;
  assert.equal(attackSoundOf(m), 'muimi_ub_hit');
});

test('ค่าคงที่ตรงกับข้อมูลตัวละคร: จำนวนเสบียงฉุกเฉิน = ammo · ฟื้น/แต้มตรงคำอธิบาย', () => {
  const c = CHAR_BY_ID.muimi;
  assert.equal(c.basic.ammo, muimi.EMERGENCY_USES);
  assert.match(c.basic.desc, new RegExp(`รวม ${muimi.EMERGENCY_USES} ครั้ง`));
  assert.match(c.basic.desc, new RegExp(`ฟื้นพลังชีวิต ${muimi.EMERGENCY_HEAL} และแต้มสกิล ${muimi.EMERGENCY_SP}`));
  assert.deepEqual(c.ultimate.area, muimi.WAVE_AREA);
});

test('เสียงตีปกติมาจากฮุค attackSound ของมุยมิ (ไม่มีกรณีพิเศษใน attack.js)', () => {
  const { m, a } = setup();
  assert.equal(muimi.attackSound(m), 'muimi_normal_hit');
  m.statuses.muimiTower = 1;
  assert.equal(muimi.attackSound(m), 'muimi_ub_hit');
  assert.equal(muimi.attackSound(a), undefined, 'ตัวอื่นไม่ได้เสียงมุยมิ');
});

test('คลื่นดาบถูกหลบหมด: ล็อกจริงเท่าเดิม (กดได้อีกเทิร์นที่ +4) แต่ตัวเลขคูลดาวน์โชว์ 3, 2, 1 แบบหมดเวลาปกติ', () => {
  const P = boardSetup([['M', 'muimi', 7, 9], ['E', 'dummy', 7, 8]]);
  engine.applyEvade(P.E, 100);
  Math.random = () => 0;
  engine.setActor('M');
  const r0 = engine.roundNumber;
  engine.useSkill('M', 'ultimate', [], { dir: 'up' });
  assert.equal(P.M.statuses.muimiTower, undefined, 'หลบหมด = เสียดาบสะบั้น');
  assert.equal(P.M.muimiUltLock, r0 + muimi.ULT_COOLDOWN_TURNS, 'ล็อกจริงไม่เปลี่ยน');
  assert.equal(muimi.ultCooldownLeft(engine, P.M), 0, 'เทิร์นที่กดไม่โชว์ 4');
  assert.equal(muimi.canUseSkill(engine, P.M, 'ultimate'), false, 'แต่เทิร์นที่กดยังล็อกจริง');
  const shown = [];
  for (let i = 1; i <= muimi.ULT_COOLDOWN_TURNS; i++) {
    engine.setRoundNumber(r0 + i);
    shown.push(muimi.ultCooldownLeft(engine, P.M));
    assert.equal(muimi.canUseSkill(engine, P.M, 'ultimate'), false);
  }
  assert.deepEqual(shown, [3, 2, 1]);
  engine.setRoundNumber(r0 + muimi.ULT_COOLDOWN_TURNS + 1);
  assert.equal(muimi.ultCooldownLeft(engine, P.M), 0);
  assert.equal(muimi.canUseSkill(engine, P.M, 'ultimate'), true);
});

test('คลื่นดาบท่าไม้ตาย ทุบหนามน้ำแข็ง Lv3 แรงเท่าตีคน (4 ไม่ใช่ 2) · หมดชุดผลแล้วโบนัสคลื่นไม่ค้าง', async () => {
  const P = boardSetup([['M', 'muimi', 7, 9], ['A', 'dummy', 7, 8], ['D', 'dummy', 11, 11]]);
  const left = lv3Spike(8, 6);
  engine.setActor('M');
  engine.useSkill('M', 'ultimate', [], { dir: 'up' });
  const toPlayer = 5 - P.A.hp;
  assert.equal(toPlayer, 1 + muimi.WAVE_ATK_BONUS);
  assert.equal(LV3_TOTAL - left(), toPlayer, 'หนามโดนเท่าผู้เล่นในแนวเดียวกัน');
  assert.equal(engine.attackPowerAgainst(P.M, P.D), 1 + muimi.TOWER_ATK_BONUS, 'ค่าประเมินใส่ผู้เล่นไม่โดนโบนัสคลื่นลากตาม');
  await Promise.resolve();
  assert.equal(P.M.muimiWave, undefined, 'ล้างเครื่องหมายคลื่นหลังชุดผลจบ');
});

test('คลื่นดาบท่าไม้ตายถูกหลบหมด: หนามน้ำแข็งยังโดนเท่าคลื่น (ไม่ตกเหลือ 1 เพราะดาบสะบั้นหายไปแล้ว)', () => {
  const P = boardSetup([['M', 'muimi', 7, 9], ['E', 'dummy', 7, 8]]);
  const left = lv3Spike(6, 6);
  engine.applyEvade(P.E, 100);
  Math.random = () => 0;
  engine.setActor('M');
  engine.useSkill('M', 'ultimate', [], { dir: 'up' });
  assert.equal(P.E.hp, 5, 'หลบหมด');
  assert.equal(P.M.statuses.muimiTower, undefined);
  assert.equal(LV3_TOTAL - left(), 1 + muimi.WAVE_ATK_BONUS);
});

test('คลื่นดาบของดาบสนิม (ระหว่างดาบสะบั้น): หนามน้ำแข็งโดนเท่าผู้เล่นในแนว', () => {
  const P = boardSetup([['M', 'muimi', 7, 9], ['A', 'dummy', 7, 8]]);
  const left = lv3Spike(8, 7);
  P.M.statuses.muimiTower = 2;
  engine.setActor('M');
  engine.useSkill('M', 'secondary', [], { dir: 'up' });
  const toPlayer = 5 - P.A.hp;
  assert.equal(toPlayer, 1 + muimi.SEC_WAVE_ATK_BONUS);
  assert.equal(LV3_TOTAL - left(), toPlayer);
});

// ห่วงเวลาซีโร่ล็อกท่าไม้ตายทุกตัว — คลื่นที่ถึงผนึกได้จริงมีแค่ดาบสนิมระหว่างดาบสะบั้น
test('คลื่นดาบของดาบสนิม ทุบผนึกมิโกะ (ห่วงเวลาซีโร่) แรงเท่าตีคน', () => {
  const P = boardSetup([['M', 'muimi', 7, 9], ['D', 'dummy', 7, 8]]);
  engine.setRoundNumber(9);
  Zero.enter(); engine.clearPhaseTimer(); match.zeroScene.active = false;
  draw.dealRound(); engine.clearPhaseTimer();
  const [sx, sy] = Board.ZERO_SEALS[0];
  const seal = match.zero.seals[0];
  seal.hp = 10; seal.armor = 0;
  P.M.pos = { x: sx, y: sy + 1 }; P.D.pos = { x: sx + 1, y: sy };
  P.D.hp = 5; P.D.armor = 0; P.D.statuses = {};
  P.M.skillPoints = 8; P.M.skillUsedRound = false; P.M.statuses = { muimiTower: 2 };
  engine.setActor('M');
  engine.useSkill('M', 'secondary', [], { dir: 'up' });
  const toPlayer = 5 - P.D.hp;
  assert.equal(toPlayer, 1 + muimi.SEC_WAVE_ATK_BONUS);
  assert.equal(10 - seal.hp, toPlayer);
});
