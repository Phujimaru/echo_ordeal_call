// ============================================================
//  คิชินามิ ฮาคุโนะ (ชาย/หญิง) — บอสของโหมด Moon Cell (GRID_PLAN §8.4 · server/moonCell.js)
//  ไม่ใช่ตัวละครที่ผู้เล่นเลือกได้: เป็นยูนิตที่ถูกเรียก (server/summon.js) คุมโดย AI · ลงทะเบียนใน CHAR_HOOKS แบบไม่กระจายฮุค (characters/index.js)
//  ตีปกติ: พลังโจมตี 2 · คริติคอล 25% · โดน (ไม่หลบพ้น) = แต้มสกิลของเป้า −1
// ============================================================

const ATK = 2;
const CRIT_PCT = 25;

module.exports = {
  id: "kishinami_hakuno",
  ATK, CRIT_PCT,
  attackBaseOverride() { return ATK; },
  critPct() { return CRIT_PCT; },
  onStrikeResolved(engine, attacker, target, res) {
    if (!target || target.summon || !res || res.dodge) return;
    if (!((target.skillPoints || 0) > 0)) return;
    target.skillPoints -= 1;
    engine.log(`🌙 ${attacker.name} — แต้มสกิลของ ${target.name} −1`);
  },
};
