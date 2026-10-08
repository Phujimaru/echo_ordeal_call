const test = require('node:test');
const assert = require('node:assert/strict');
const { engine, computeAttackBase, attackSoundOf } = require('../../server.js');
const { CHAR_BY_ID } = require('../../characters.js');
const muimi = require('../../characters/muimi.js');

const originalFns = {
  queueCutscene: engine.queueCutscene,
  skillFlash: engine.skillFlash,
  broadcastState: engine.broadcastState,
  checkAllLocked: engine.checkAllLocked,
};

let queued = [];

test.before(() => {
  engine.queueCutscene = (p, key) => { queued.push(key); };
  engine.skillFlash = () => {};
  engine.broadcastState = () => {};
  engine.checkAllLocked = () => {};
});

test.after(() => {
  Object.assign(engine, originalFns);
  engine.setGameMode('ffa');
  engine.setGameState('LOBBY');
});

test.afterEach(() => {
  engine.setGameMode('ffa');
  engine.setGameState('LOBBY');
});

function mk(id, characterId, position, teamId = null) {
  return {
    id, name: id, characterId, position, teamId, alive: true, connected: true,
    hp: 4, armor: 0, shield: 0, skillPoints: 4, statuses: {}, statusAmt: {},
    seen: {}, cutsceneShown: {}, cards: [], inventory: [], evadeStacks: [],
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
  assert.equal(muimi.canUseSkill(engine, m, 'secondary'), false);
  assert.equal(muimi.canUseSkill(engine, m, 'ultimate'), false, 'ระหว่างดาบสะบั้นกดท่าไม้ตายซ้ำไม่ได้');
  delete m.statuses.muimiTower;
  assert.equal(muimi.canUseSkill(engine, m, 'ultimate'), true);
});

test('ดาบสะบั้นหมดลงแล้วคูลดาวน์ 5 เทิร์น ก่อนใช้ท่าไม้ตายซ้ำได้', () => {
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

test('ดาบเก่าๆ ฟื้น 1/1 ส่วนดาบสะบั้นเพิ่มโจมตี 3 ฟื้นชีวิต 2 และยืดเวลา 1 เทิร์น', () => {
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
  assert.equal(computeAttackBase(engine, m, a).base, 4, 'ฐาน 1 + ดาบสะบั้น 3');
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
