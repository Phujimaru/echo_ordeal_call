// ============================================================
// มุยมิ — เสบียงฉุกเฉิน / ดาบสนิม / ดาบสะบั้นหอคอยสวรรค์
// ============================================================

const ID = "muimi";

const EMERGENCY_USES = 2;
const RUSTY_TURNS = 3;
const TOWER_TURNS = 2;
const RESIST_TURNS = 3;
// เนิฟ (ผู้ใช้สั่ง 2026-10-09): ตีปกติระหว่างดาบสะบั้น +3 → +1 · คูลดาวน์ท่าไม้ตาย 5 → 3 เทิร์น
//  คลื่นดาบยังแรงเท่าเดิม (ฐาน 1 + 3 = 4) จึงแยกโบนัสของคลื่นออกจากโบนัสตีปกติ
const TOWER_ATK_BONUS = 1;
const WAVE_ATK_BONUS = 3;
const ULT_COOLDOWN_TURNS = 3;

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

// มุยมิที่กำลังปล่อยคลื่นดาบอยู่ (ตั้งเฉพาะช่วงลูปคลื่นดาบ) — damageBonus ใช้ WAVE_ATK_BONUS แทน TOWER_ATK_BONUS
let waveStriker = null;

module.exports = {
  id: ID,
  IMG,
  EMERGENCY_USES,
  RUSTY_TURNS,
  TOWER_TURNS,
  RESIST_TURNS,
  TOWER_ATK_BONUS,
  WAVE_ATK_BONUS,
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
    // ระหว่างดาบสะบั้นกดซ้ำไม่ได้ (ผู้ใช้สั่ง)
    if (tier === "ultimate") return !rustyActive(p) && !towerActive(p) && this.ultCooldownLeft(engine, p) <= 0;
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
      const resistBefore = p.statuses.resist || 0;
      p.statuses.muimiTower = TOWER_TURNS;
      p.statuses.resist = Math.max(resistBefore, RESIST_TURNS);
      p.muimiUltCasts = (p.muimiUltCasts || 0) + 1;
      p.transformAt = engine.nextTransformCounter();
      // วีดีโอ (ผู้ใช้สั่ง): ฉบับเต็ม 1 ครั้ง ฉบับสั้น 1 ครั้ง ต่อแมตช์ — หลังจากนั้นเป็นการ์ดแจ้งเตือน ไม่หยุดเกม
      p.cutsceneShown ||= {};
      const clip = !p.cutsceneShown.muimiUltimateFull ? "muimiUltimateFull" : !p.cutsceneShown.muimiUltimateShort ? "muimiUltimateShort" : null;
      if (clip) { p.cutsceneShown[clip] = true; engine.queueCutscene(p, clip); }
      else engine.notifyTransform(p, "muimiUltimateShort");
      engine.log(`⚔️ ${p.name} ได้รับสถานะ “ดาบสะบั้น” ${TOWER_TURNS} เทิร์น และ “ต้านสถานะผิดปกติ” ${RESIST_TURNS} เทิร์น`);
      // คลื่นดาบแนว 4×3 (GRID_PLAN §7.3): ลงผล "หลังวีดีโอจบ" พร้อมเสียงฟัน · พลังโจมตี +WAVE_ATK_BONUS (แทน +TOWER_ATK_BONUS ของตีปกติ) · เฉพาะศัตรู
      //  มีศัตรูในแนวแต่หลบได้ทุกคน = เสียท่าไม้ตาย (ดาบสะบั้น + ต้านสถานะที่ได้) และเข้าคูลดาวน์ทันที · โดนอย่างน้อย 1 คน = ได้ตามปกติ
      //  แนวว่างไม่มีศัตรู = ได้ดาบสะบั้นตามปกติ (ไม่มีใครหลบ)
      engine.deferAfterCutscene(() => {
        let tried = 0, hits = 0;
        waveStriker = p;
        try {
          for (const id of targets || []) {
            const t = engine.players[id];
            if (!t || !t.alive || t.id === p.id || engine.sameTeam(p, t)) continue;
            tried++;
            const res = engine.skillStrike(p, t, "คลื่นดาบสะบั้น");
            if (!res.dodge) hits++;
          }
        } finally {
          waveStriker = null;
        }
        engine.sfx("muimi_ub_hit");
        if (tried > 0 && hits === 0) {
          delete p.statuses.muimiTower;
          if (resistBefore > 0) p.statuses.resist = resistBefore; else delete p.statuses.resist;
          p.muimiUltLock = Math.max(p.muimiUltLock || 0, engine.roundNumber + ULT_COOLDOWN_TURNS);
          engine.log(`💨 คลื่นดาบของ ${p.name} ถูกหลบทั้งหมด — เสียดาบสะบั้น · ใช้ท่าไม้ตายซ้ำไม่ได้ ${ULT_COOLDOWN_TURNS} เทิร์น`);
        }
      });
      return " — ได้รับสถานะ ดาบสะบั้น";
    }
    return "";
  },

  damageBonus(engine, attacker, target, ctx) {
    // คลื่นดาบ: ไม่ใช่ตีปกติ จึงไม่ใส่ ctx.muimiTowerAtk (ป้ายนั้นใช้ในฉากตีปกติ)
    if (isMuimi(attacker) && waveStriker === attacker) return WAVE_ATK_BONUS;
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
