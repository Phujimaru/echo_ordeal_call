// ============================================================
// มุยมิ — เสบียงฉุกเฉิน / ดาบสนิม / ดาบสะบั้นหอคอยสวรรค์
// ============================================================

const ID = "muimi";

const EMERGENCY_USES = 2;
const RUSTY_TURNS = 3;
const TOWER_TURNS = 2;
const RESIST_TURNS = 3;
const TOWER_ATK_BONUS = 3;
const ULT_COOLDOWN_TURNS = 5;

const IMG = {
  base: "/characters/muimi/muimi.webp",
  ultimate: "/characters/muimi/muimi_ub.webp",
  skill1: "/characters/muimi/muimi_skill1.webp",
  skill2: "/characters/muimi/muimi_skill2.png",
  skill3: "/characters/muimi/muimi_skill3.webp",
};

function isMuimi(p) { return !!p && p.characterId === ID; }
function rustyActive(p) { return isMuimi(p) && ((p.statuses && p.statuses.muimiRusty) || 0) > 0; }
function towerActive(p) { return isMuimi(p) && ((p.statuses && p.statuses.muimiTower) || 0) > 0; }

module.exports = {
  id: ID,
  IMG,
  EMERGENCY_USES,
  RUSTY_TURNS,
  TOWER_TURNS,
  RESIST_TURNS,
  TOWER_ATK_BONUS,
  ULT_COOLDOWN_TURNS,

  rustyActive,
  towerActive,

  resetCombat(p) {
    p.muimiEmergencyUses = EMERGENCY_USES;
    p.muimiEmergencyUsedRound = 0;
    p.muimiUltCasts = 0;
    p.muimiUltLock = 0;
  },

  displayImg(p) { return towerActive(p) ? IMG.ultimate : null; },

  canUseSkill(engine, p, tier) {
    if (!isMuimi(p)) return true;
    if (tier === "basic") {
      return (p.muimiEmergencyUses || 0) > 0 && p.muimiEmergencyUsedRound !== engine.roundNumber;
    }
    if (tier === "secondary") return !towerActive(p);
    if (tier === "ultimate") return !rustyActive(p) && this.ultCooldownLeft(engine, p) <= 0;
    return true;
  },

  // เสบียงฉุกเฉินไม่นับโควตาสกิลหลัก — กดได้แม้ใช้สกิลอื่นไปแล้ว และกดแล้วยังใช้สกิลอื่นได้อีก
  skipsTurnQuota(p, tier) { return isMuimi(p) && tier === "basic"; },
  ignoresTurnQuota(p, tier) { return isMuimi(p) && tier === "basic"; },

  onUltExpire(engine, p) {
    if (!isMuimi(p)) return;
    p.muimiUltLock = Math.max(p.muimiUltLock || 0, engine.roundNumber + ULT_COOLDOWN_TURNS);
    engine.log(`⏳ ${p.name} ดาบสะบั้นหมดเวลาแล้ว — ใช้ดาบสะบั้นหอคอยสวรรค์ซ้ำไม่ได้อีก ${ULT_COOLDOWN_TURNS} เทิร์น`);
  },

  ultCooldownLeft(engine, p) {
    if (!isMuimi(p)) return 0;
    // สถานะหมดตอนท้ายรอบ จึงบวก 1 เพื่อให้สามรอบถัดไปแสดง 3 -> 2 -> 1 และกดได้ในรอบต่อจากนั้น
    return Math.max(0, (p.muimiUltLock || 0) - engine.roundNumber + 1);
  },

  applyInstantSkill(engine, p, tier, targets) {
    p.statuses ||= {};
    if (tier === "basic") {
      p.muimiEmergencyUses = Math.max(0, (p.muimiEmergencyUses || 0) - 1);
      p.muimiEmergencyUsedRound = engine.roundNumber;
      const hp = engine.healHp(p, 2);
      const before = p.skillPoints;
      engine.addSkill(p, 2);
      const sp = p.skillPoints - before;
      engine.log(`🍖 ${p.name} ใช้เสบียงฉุกเฉิน — ฟื้นพลังชีวิต +${hp} และแต้มสกิล +${sp} (เหลือ ${p.muimiEmergencyUses} ครั้ง)`);
      return ` — พลังชีวิต +${hp} · แต้มสกิล +${sp}`;
    }
    if (tier === "secondary") {
      p.statuses.muimiRusty = RUSTY_TURNS;
      engine.log(`🗡️ ${p.name} ได้รับสถานะ “ดาบเก่าๆ” ${RUSTY_TURNS} เทิร์น`);
      return " — ได้รับสถานะ ดาบเก่าๆ";
    }
    if (tier === "ultimate") {
      p.statuses.muimiTower = TOWER_TURNS;
      p.statuses.resist = Math.max(p.statuses.resist || 0, RESIST_TURNS);
      p.muimiUltCasts = (p.muimiUltCasts || 0) + 1;
      p.transformAt = engine.nextTransformCounter();
      engine.queueCutscene(p, p.muimiUltCasts === 1 ? "muimiUltimateFull" : "muimiUltimateShort");
      engine.log(`⚔️ ${p.name} ได้รับสถานะ “ดาบสะบั้น” ${TOWER_TURNS} เทิร์น และ “ต้านสถานะผิดปกติ” ${RESIST_TURNS} เทิร์น`);
      // คลื่นดาบแนว 4×3 (GRID_PLAN §7.3): ได้ดาบสะบั้นก่อน แล้วฟันด้วยพลังโจมตีที่รวม +3 แล้ว · เฉพาะศัตรู
      let hits = 0;
      for (const id of targets || []) {
        const t = engine.players[id];
        if (!t || !t.alive || t.id === p.id || engine.sameTeam(p, t)) continue;
        const res = engine.skillStrike(p, t, "คลื่นดาบสะบั้น");
        if (!res.dodge) hits++;
      }
      return hits ? ` — ได้รับสถานะ ดาบสะบั้น · คลื่นดาบโดน ${hits} คน` : " — ได้รับสถานะ ดาบสะบั้น";
    }
    return "";
  },

  damageBonus(engine, attacker, target, ctx) {
    if (!towerActive(attacker)) return 0;
    ctx.muimiTowerAtk = TOWER_ATK_BONUS;
    return TOWER_ATK_BONUS;
  },

  onAttackLanded(engine, attacker) {
    if (!isMuimi(attacker)) return null;
    if (towerActive(attacker)) {
      const hp = engine.healHp(attacker, 2);
      attacker.statuses.muimiTower++;
      engine.log(`⚔️ ${attacker.name} ดาบสะบั้น — ฟื้นพลังชีวิต +${hp} และยืดเวลาท่าไม้ตาย +1 เทิร์น`);
      return { mode: "tower", hp, sp: 0, extended: true };
    }
    if (rustyActive(attacker)) {
      const hp = engine.healHp(attacker, 1);
      const before = attacker.skillPoints;
      engine.addSkill(attacker, 1);
      const sp = attacker.skillPoints - before;
      engine.log(`🗡️ ${attacker.name} ดาบเก่าๆ — ฟื้นพลังชีวิต +${hp} และแต้มสกิล +${sp}`);
      return { mode: "rusty", hp, sp, extended: false };
    }
    return null;
  },
};
