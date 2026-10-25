// ============================================================
//  คิชินามิ ฮาคุโนะ (ชาย/หญิง) — บอสของโหมด Moon Cell (GRID_PLAN §8.4 · server/moonCell.js)
//  ไม่ใช่ตัวละครที่ผู้เล่นเลือกได้: เป็นยูนิตที่ถูกเรียก (server/summon.js) คุมโดย AI · ลงทะเบียนใน CHAR_HOOKS แบบไม่กระจายฮุค (characters/index.js)
//  ตีปกติ: พลังโจมตี 2 · คริติคอล 25% · โดน (ไม่หลบพ้น) = แต้มสกิลของเป้า −1
//  ท่าตีบนกระดานแยกตามเพศ (ผู้ใช้สั่ง — client/src/board/moonFx.js): ชาย "hakunoM" หมัด code cast · หญิง "hakunoF" หอกข้อมูลจากวงเวท
//  เสียงพากย์ (server/voice.js): ไฟล์ผู้ใช้ตัดเป็นท่อน — Claude จัดท่อนเข้าเหตุการณ์เอง (ยังไม่ได้ฟัง · สลับได้ที่ VOICE)
//   เหตุการณ์เฉพาะ Moon Cell (server/moonCell.js เรียก Voice.play): warn = เล็งคำสาป · revive = ฟื้นคืนชีพ · down = ล้ม
// ============================================================

const ATK = 2;
const CRIT_PCT = 25;
const v = (side, list) => list.map((n) => `hakuno_v_${side}${String(n).padStart(2, "0")}`);
const VOICE = {
  m: { turn: v("m", [2, 4, 5, 7, 11]), strike: v("m", [14, 16, 17, 18, 20]), warn: v("m", [6, 12]), revive: v("m", [10, 15]), down: v("m", [9, 19]) },
  f: { turn: v("f", [1, 2, 5, 10, 18]), strike: v("f", [11, 12, 15, 17, 19]), warn: v("f", [4, 6]), revive: v("f", [7, 14]), down: v("f", [16, 20]) },
};
const sideOf = (p) => (p && p.summon && p.summon.moon === "f" ? "f" : "m");

module.exports = {
  id: "kishinami_hakuno",
  ATK, CRIT_PCT,
  attackBaseOverride() { return ATK; },
  critPct() { return CRIT_PCT; },
  attackStyle(p) { return sideOf(p) === "f" ? "hakunoF" : "hakunoM"; },
  attackSound(p) { return sideOf(p) === "f" ? "hakuno_hit_f" : "hakuno_hit_m"; },
  voiceLines(p) { return VOICE[sideOf(p)]; },
  onStrikeResolved(engine, attacker, target, res) {
    if (!target || target.summon || !res || res.dodge) return;
    if (!((target.skillPoints || 0) > 0)) return;
    target.skillPoints -= 1;
    engine.log(`🌙 ${attacker.name} — แต้มสกิลของ ${target.name} −1`);
  },
};
