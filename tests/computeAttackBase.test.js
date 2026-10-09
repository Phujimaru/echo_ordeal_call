// Regression net for doAttack()'s damage-bonus formula, extracted as computeAttackBase()
// (server/phases/attack.js). ล็อกพฤติกรรมของทุกเทอมที่ยังเหลืออยู่: ฐาน 1 · ฮุคตัวละคร (attackBaseOverride/damageBonus)
// · บัฟกลาง (empower / cardAtkBonus) · เกราะ Mark 42 · ผลสนามการเดินทาง · บัฟพลังโจมตีของโอเบรอน (ungated)
const test = require('node:test');
const assert = require('node:assert/strict');
const { computeAttackBase, engine } = require('../server.js');
const muimi = require('../characters/muimi.js');
const oberon = require('../characters/oberon_summer.js');

test.beforeEach(() => {
  for (const k of Object.keys(engine.players)) delete engine.players[k];
});

let uid = 0;
// 'dummy' = ตัวละครสมมติไม่มีฮุค
function mkPlayer(over = {}) {
  const id = `p${++uid}`;
  const p = Object.assign({
    id, name: id, alive: true, characterId: 'dummy', hp: 5, armor: 2, coins: 0,
    statuses: {}, statusAmt: {},
  }, over);
  engine.players[id] = p;
  return p;
}

function base(attackerOver = {}, targetOver = {}, eng = engine) {
  const attacker = mkPlayer(attackerOver);
  const target = mkPlayer(targetOver);
  return computeAttackBase(eng, attacker, target).base;
}

test('baseline: plain attacker vs plain target = 1', () => {
  assert.equal(base(), 1);
});

// ---------- บัฟกลาง (ungated) ----------
test('empowerAtk: +1', () => {
  assert.equal(base({ statuses: { empower: 1 } }), 2);
});
test('cardAtkBonus (การ์ดแดงครบ 3 ใบ): +N', () => {
  assert.equal(base({ statusAmt: { cardAtkBonus: 2 } }), 3);
});
test('mark42Atk: +1 while wearing the suit, none once the wearer is down', () => {
  assert.equal(base({ mark42: { armor: 3 } }), 2);
  const attacker = mkPlayer({ mark42: { armor: 3 } });
  const target = mkPlayer();
  assert.equal(computeAttackBase(engine, attacker, target).mark42Atk, 1);
  attacker.alive = false;
  assert.equal(computeAttackBase(engine, attacker, target).mark42Atk, 0);
});

// ---------- ผลสนามการเดินทาง ----------
test('journeyAtk: ป่าไม้ต้องสาปกลางวัน / จุดสิ้นสุดของโลกกลางคืน +1 · ภูมิภาคอื่นไม่บวก', () => {
  const at = (roundNumber, night) => ({ __proto__: engine, gameMode: 'ffa', roundNumber, isNightRound: () => night });
  assert.equal(base({}, {}, at(11, false)), 2, 'ภูมิภาค 3 กลางวัน');
  assert.equal(base({}, {}, at(11, true)), 1, 'ภูมิภาค 3 กลางคืน');
  assert.equal(base({}, {}, at(31, true)), 2, 'ภูมิภาค 7 กลางคืน');
  assert.equal(base({}, {}, at(1, false)), 1, 'ภูมิภาค 1');
  const attacker = mkPlayer();
  const target = mkPlayer();
  assert.equal(computeAttackBase(at(11, false), attacker, target).journeyAtkFx.amount, 1);
});

// ---------- บัฟของโอเบรอน: ใครติดสถานะก็ได้พลังโจมตี ----------
test('oberon giftAtk: ม่านแห่งราตรี +1 / จุดจบของความฝัน +4 ซ้อนกันได้ แม้ผู้โจมตีไม่ใช่โอเบรอน', () => {
  assert.equal(base({ statuses: { obsVeil: 2 } }), 1 + oberon.VEIL_ATK);
  assert.equal(base({ statuses: { obsDream: 1 } }), 1 + oberon.DREAM_ATK);
  assert.equal(base({ statuses: { obsVeil: 2, obsDream: 1 } }), 1 + oberon.VEIL_ATK + oberon.DREAM_ATK);
});

// ---------- ฮุคตัวละคร (damageBonus) ----------
test('muimi damageBonus: ดาบสะบั้น +TOWER_ATK_BONUS เฉพาะมุยมิ และส่งค่าใน ctx', () => {
  const attacker = mkPlayer({ characterId: 'muimi', statuses: { muimiTower: 2 } });
  const target = mkPlayer();
  const result = computeAttackBase(engine, attacker, target);
  assert.equal(result.base, 1 + muimi.TOWER_ATK_BONUS);
  assert.equal(result.muimiTowerAtk, muimi.TOWER_ATK_BONUS, 'ctx ของฮุคต้องติดออกมาให้ขั้นแสดงผลโจมตี');
  assert.equal(base({ characterId: 'muimi' }), 1, 'ไม่มีดาบสะบั้น = ไม่บวก');
  assert.equal(base({ characterId: 'dummy', statuses: { muimiTower: 2 } }), 1, 'สถานะดาบสะบั้นบนตัวอื่นไม่บวก');
});

test('all terms stack additively', () => {
  assert.equal(base({ characterId: 'muimi', mark42: { armor: 3 }, statuses: { muimiTower: 2, empower: 1, obsVeil: 1 } }),
    1 + muimi.TOWER_ATK_BONUS + 1 + 1 + oberon.VEIL_ATK);
});
