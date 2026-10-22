// ============================================================
// มุยมิ — เสบียงฉุกเฉิน / ดาบสนิม / ดาบสะบั้นหอคอยสวรรค์
// ============================================================

const ID = "muimi";

const EMERGENCY_USES = 2; // ต้องตรงกับ basic.ammo ใน characters.js (เทสต์เช็คให้)
const EMERGENCY_HEAL = 2;
const EMERGENCY_SP = 2;
const RUSTY_TURNS = 3;
const RUSTY_HEAL = 1;     // ตีปกติโดนระหว่าง "ดาบเก่าๆ"
const RUSTY_SP = 1;
const TOWER_TURNS = 2;
const TOWER_HEAL = 2;     // ตีปกติโดนระหว่าง "ดาบสะบั้น"
const TOWER_EXTEND = 1;   // ...และยืดเวลาดาบสะบั้น +1 เทิร์น (สกิลติดตัว ใจที่ไม่ยอมแพ้)
const RESIST_TURNS = 3;
// เนิฟ (ผู้ใช้สั่ง 2026-10-09): ตีปกติระหว่างดาบสะบั้น +3 → +1 · คูลดาวน์ท่าไม้ตาย 5 → 3 เทิร์น
//  คลื่นดาบยังแรงเท่าเดิม (ฐาน 1 + 3 = 4) จึงแยกโบนัสของคลื่นออกจากโบนัสตีปกติ
const TOWER_ATK_BONUS = 1;
const WAVE_ATK_BONUS = 3;
const ULT_COOLDOWN_TURNS = 3;
// ดาบสนิมระหว่างดาบสะบั้น (ผู้ใช้สั่ง 2026-10-09): กดได้ · เปลี่ยนผลเป็นคลื่นดาบแนวเดียวกับท่าไม้ตาย (ราคา/แรงดู TOWER_SEC_COST)
//  แต่ไม่ได้สถานะใดๆ (ไม่ได้ดาบเก่าๆ / ไม่ยืดดาบสะบั้น / ไม่ได้ต้านสถานะ) และไม่มีกติกา "หลบหมด = เสียท่าไม้ตาย"
const WAVE_AREA = { kind: "line", len: 4, width: 3, hostile: true }; // ต้องตรงกับ ultimate.area ใน characters.js
// ผู้ใช้สั่ง 2026-10-12: ดาบสนิมระหว่างดาบสะบั้น 6 → 4 แต้ม · ดาเมจ 4 → 2 (ฐาน 1 + 1) — แยกโบนัสจากคลื่นของท่าไม้ตาย
const TOWER_SEC_COST = 4;
const SEC_WAVE_ATK_BONUS = 1;

const IMG = {
  base: "/characters/muimi/muimi.webp",
  ultimate: "/characters/muimi/muimi_ub.webp",
  skill1: "/characters/muimi/muimi_skill1.webp",
  skill2: "/characters/muimi/muimi_skill2.png",
  skill3: "/characters/muimi/muimi_skill3.webp",
};
const SFX = { normal: "muimi_normal_hit", tower: "muimi_ub_hit" }; // คีย์ใน client/src/audio.js

function isMuimi(p) { return !!p && p.characterId === ID; }
function rustyActive(p) { return isMuimi(p) && ((p.statuses && p.statuses.muimiRusty) || 0) > 0; }
function towerActive(p) { return isMuimi(p) && ((p.statuses && p.statuses.muimiTower) || 0) > 0; }

// ท่าไม้ตายถูกล็อกอยู่ไหม — p.muimiUltLock = เทิร์นสุดท้ายที่ยังใช้ไม่ได้ (onUltExpire / คลื่นดาบถูกหลบหมด)
function ultLocked(engine, p) { return (p.muimiUltLock || 0) >= engine.roundNumber; }
// ตั้งล็อกท่าไม้ตาย: นับ ULT_COOLDOWN_TURNS เทิร์นถัดจากเทิร์นนี้ (ไม่ย่นล็อกที่ยาวกว่าอยู่แล้ว)
function lockUlt(engine, p) { p.muimiUltLock = Math.max(p.muimiUltLock || 0, engine.roundNumber + ULT_COOLDOWN_TURNS); }

// สกิลที่ไม่นับโควตาสกิลหลักของเทิร์น (กดได้แม้ใช้โควตาไปแล้ว + กดแล้วไม่กินโควตา): เสบียงฉุกเฉิน
const isQuotaFree = (p, tier) => isMuimi(p) && tier === "basic";

// คลื่นดาบที่กำลังลงผล — p.muimiWave = { bonus, striking } บนตัวมุยมิ (ไม่ใช้ตัวแปรระดับโมดูล: ค้างข้ามแมตช์/เทสต์ได้)
//  striking = ช่วงลูปฟันคน: ทุกเป้าใช้โบนัสคลื่นแทน TOWER_ATK_BONUS
//  หลังลูป = เฉพาะเป้าที่ไม่ใช่ผู้เล่น — หนามน้ำแข็ง/ผนึกมิโกะในแนว (skills.js ต่อคิวไว้หลังคลื่น แล้วคิดดาเมจผ่าน computeAttackBase)
//   จึงแรงเท่าตีคน (ผู้ใช้สั่ง "ให้แรงเท่าตีคน") แม้หลบหมดจนดาบสะบั้นหายไปแล้ว · ค่าประเมินพลังโจมตีใส่ผู้เล่นไม่โดนลากตาม
//  ล้างทิ้งเมื่อชุดผลหลังคลิปจบ (microtask — ชุดผลรันต่อกันแบบ synchronous จึงไม่มีตีปกติแทรกได้)
function waveBonusAgainst(engine, attacker, target) {
  const wave = attacker.muimiWave;
  if (!wave) return null;
  const isPlayer = !!target && engine.players[target.id] === target;
  return wave.striking || !isPlayer ? wave.bonus : null;
}

// คลื่นดาบแนว 4×3 ใส่ศัตรูทุกคนในแนว (ท่าไม้ตาย + ดาบสนิมระหว่างดาบสะบั้น) — คืนจำนวนศัตรูที่ฟัน/โดน
//  เอฟเฟกต์บนกระดาน (quakeFx: ของถล่มลงทุกช่องในแนว + พื้นระเบิด) + เสียงฟัน ลงพร้อมดาเมจ
function swordWave(engine, p, targets, dir, name, bonus) {
  let tried = 0, hits = 0;
  if (p.pos && dir) engine.boardFx("quakeFx", { from: { ...p.pos }, dir, len: WAVE_AREA.len, width: WAVE_AREA.width, color: engine.colorOf(p) });
  const wave = { bonus, striking: true };
  p.muimiWave = wave;
  queueMicrotask(() => { if (p.muimiWave === wave) delete p.muimiWave; });
  try {
    for (const id of targets || []) {
      const t = engine.players[id];
      if (!t || !t.alive || t.id === p.id || engine.sameTeam(p, t)) continue;
      tried++;
      const res = engine.skillStrike(p, t, name);
      if (!res.dodge) hits++;
    }
  } finally {
    wave.striking = false;
  }
  engine.sfx(SFX.tower);
  return { tried, hits };
}

module.exports = {
  id: ID,
  IMG,
  EMERGENCY_USES,
  EMERGENCY_HEAL,
  EMERGENCY_SP,
  RUSTY_TURNS,
  TOWER_TURNS,
  RESIST_TURNS,
  TOWER_ATK_BONUS,
  WAVE_ATK_BONUS,
  ULT_COOLDOWN_TURNS,
  WAVE_AREA,
  TOWER_SEC_COST,
  SEC_WAVE_ATK_BONUS,

  rustyActive,
  towerActive,

  resetCombat(p) {
    p.muimiEmergencyUses = EMERGENCY_USES;
    p.muimiEmergencyUsedRound = 0;
    p.muimiUltLock = 0;
    p.muimiTowerAt = 0; // ลำดับตอนได้ดาบสะบั้น / ดาบเก่าๆ (engine.severStamp — ตัดผลสกิล server/sever.js)
    p.muimiRustyAt = 0;
    delete p.muimiWave;
  },

  displayImg(p) { return towerActive(p) ? IMG.ultimate : null; },
  // เสียงตีปกติ (attackSoundOf): ระหว่างดาบสะบั้น = เสียงฟันของท่าไม้ตาย
  attackSound(p) {
    if (!isMuimi(p)) return undefined;
    return towerActive(p) ? SFX.tower : SFX.normal;
  },

  skillCost(p, tier, base) { return tier === "secondary" && towerActive(p) ? TOWER_SEC_COST : base; },
  skillArea(p, tier, area) { return tier === "secondary" && towerActive(p) ? WAVE_AREA : area; },

  canUseSkill(engine, p, tier) {
    if (!isMuimi(p)) return true;
    if (tier === "basic") {
      return (p.muimiEmergencyUses || 0) > 0 && p.muimiEmergencyUsedRound !== engine.roundNumber;
    }
    // ระหว่างดาบสะบั้นท่าไม้ตายกดซ้ำไม่ได้ (ผู้ใช้สั่ง) · ดาบสนิมกดได้ = คลื่นดาบ (skillArea/skillCost)
    if (tier === "ultimate") return !rustyActive(p) && !towerActive(p) && !ultLocked(engine, p);
    return true;
  },

  // เสบียงฉุกเฉินไม่นับโควตาสกิลหลัก — กดได้แม้ใช้สกิลอื่นไปแล้ว และกดแล้วยังใช้สกิลอื่นได้อีก
  skipsTurnQuota: isQuotaFree,
  ignoresTurnQuota: isQuotaFree,
  // เนิฟ (ผู้ใช้สั่ง 2026-10-19): ท่าไม้ตายใช้แล้วจบตาเดินทันทีหลังคลื่นดาบลง — ตีปกติ/ใช้ยา/ใช้สกิลต่อในตานั้นไม่ได้
  //  (กันคอมโบประชิด คลื่นดาบ + ตีปกติในตาเดียว)
  endsTurn(engine, p, tier) { return isMuimi(p) && tier === "ultimate"; },

  onUltExpire(engine, p) {
    if (!isMuimi(p)) return;
    lockUlt(engine, p);
    engine.log(`⏳ ${p.name} ดาบสะบั้นหมดเวลาแล้ว — ใช้ดาบสะบั้นหอคอยสวรรค์ซ้ำไม่ได้อีก ${ULT_COOLDOWN_TURNS} เทิร์น`);
  },

  // ตัวเลขคูลดาวน์ที่แสดง (view.js muimiUltCd): 3 → 2 → 1 ในสามเทิร์นถัดจากเทิร์นที่ตั้งล็อก แล้วกดได้เทิร์นต่อจากนั้น
  //  หมดเวลาตามปกติตั้งล็อกตอนจบเทิร์น · คลื่นดาบถูกหลบหมดตั้งล็อกกลางเทิร์นที่กด — เทิร์นนั้นล็อกจริง (ultLocked)
  //  แต่ไม่โชว์ตัวเลข (ไม่งั้นขึ้น 4 — ปุ่มปิดอยู่แล้วเพราะเพิ่งใช้สกิลของเทิร์นไป) ทั้งสองทางจึงเห็น 3, 2, 1 เหมือนกัน
  ultCooldownLeft(engine, p) {
    if (!isMuimi(p) || !ultLocked(engine, p)) return 0;
    const left = p.muimiUltLock - engine.roundNumber + 1;
    return left > ULT_COOLDOWN_TURNS ? 0 : left;
  },

  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    p.statuses ||= {};
    if (tier === "basic") {
      p.muimiEmergencyUses = Math.max(0, (p.muimiEmergencyUses || 0) - 1);
      p.muimiEmergencyUsedRound = engine.roundNumber;
      const hp = engine.healHp(p, EMERGENCY_HEAL);
      const before = p.skillPoints;
      engine.addSkill(p, EMERGENCY_SP);
      const sp = p.skillPoints - before;
      engine.log(`🍖 ${p.name} ใช้เสบียงฉุกเฉิน — ฟื้นพลังชีวิต +${hp} และแต้มสกิล +${sp} (เหลือ ${p.muimiEmergencyUses} ครั้ง)`);
      return ` — พลังชีวิต +${hp} · แต้มสกิล +${sp}`;
    }
    if (tier === "secondary" && towerActive(p)) {
      engine.log(`🌊 ${p.name} ดาบสนิม — ปล่อยคลื่นดาบ`);
      engine.deferAfterCutscene(() => { swordWave(engine, p, targets, opts.dir, "คลื่นดาบ", SEC_WAVE_ATK_BONUS); });
      return " — คลื่นดาบ";
    }
    if (tier === "secondary") {
      p.statuses.muimiRusty = RUSTY_TURNS;
      p.muimiRustyAt = engine.severStamp();
      engine.log(`🗡️ ${p.name} ได้รับสถานะ “ดาบเก่าๆ” ${RUSTY_TURNS} เทิร์น`);
      return " — ได้รับสถานะ ดาบเก่าๆ";
    }
    if (tier === "ultimate") {
      const resistBefore = p.statuses.resist || 0;
      p.statuses.muimiTower = TOWER_TURNS;
      p.muimiTowerAt = engine.severStamp();
      // เขียน resist ตรงๆ (ไม่ผ่าน engine.applyBuff) โดยตั้งใจ: applyBuff ประทับ statusAt ทำให้ต้านสถานะนี้กลายเป็น
      //  "บัฟล่าสุด" ที่ stripLatestBuff ดึงทิ้งก่อน — พฤติกรรมเดิมถือว่าเก่ากว่าบัฟอื่นเสมอ · หลบหมดคืนค่าเดิม (resistBefore)
      p.statuses.resist = Math.max(resistBefore, RESIST_TURNS);
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
        const { tried, hits } = swordWave(engine, p, targets, opts.dir, "คลื่นดาบสะบั้น", WAVE_ATK_BONUS);
        if (tried > 0 && hits === 0) {
          delete p.statuses.muimiTower;
          if (resistBefore > 0) p.statuses.resist = resistBefore; else delete p.statuses.resist;
          lockUlt(engine, p);
          engine.log(`💨 คลื่นดาบของ ${p.name} ถูกหลบทั้งหมด — เสียดาบสะบั้น · ใช้ท่าไม้ตายซ้ำไม่ได้ ${ULT_COOLDOWN_TURNS} เทิร์น`);
        }
      });
      return " — ได้รับสถานะ ดาบสะบั้น";
    }
    return "";
  },

  // ตัดผลสกิล (server/sever.js — รากฐานจิตของเรียวกิ): ดาบสะบั้น (ท่าไม้ตาย) · ดาบเก่าๆ (สกิลรอง)
  //  ดาบสะบั้นถูกตัด = จบแบบหมดเวลาเอง → ล็อกท่าไม้ตาย ULT_COOLDOWN_TURNS (ต้านสถานะที่ได้พร้อมกันเป็นบัฟกลาง — ไม่แตะ)
  severables(engine, p) {
    if (!isMuimi(p) || !p.statuses) return [];
    const out = [];
    if (towerActive(p)) {
      out.push({
        key: "muimiTower", label: "ดาบสะบั้น", at: p.muimiTowerAt || 0,
        cancel() { delete p.statuses.muimiTower; if (p.seen) delete p.seen.muimiTower; lockUlt(engine, p); },
      });
    }
    if (rustyActive(p)) {
      out.push({
        key: "muimiRusty", label: "ดาบเก่าๆ", at: p.muimiRustyAt || 0,
        cancel() { delete p.statuses.muimiRusty; if (p.seen) delete p.seen.muimiRusty; },
      });
    }
    return out;
  },

  damageBonus(engine, attacker, target, ctx) {
    if (!isMuimi(attacker)) return 0;
    // คลื่นดาบ: ไม่ใช่ตีปกติ จึงไม่ใส่ ctx.muimiTowerAtk (ป้ายนั้นใช้ในฉากตีปกติ)
    const wave = waveBonusAgainst(engine, attacker, target);
    if (wave != null) return wave;
    if (!towerActive(attacker)) return 0;
    ctx.muimiTowerAtk = TOWER_ATK_BONUS;
    return TOWER_ATK_BONUS;
  },

  onAttackLanded(engine, attacker) {
    if (!isMuimi(attacker)) return null;
    if (towerActive(attacker)) {
      const hp = engine.healHp(attacker, TOWER_HEAL);
      attacker.statuses.muimiTower += TOWER_EXTEND;
      engine.log(`⚔️ ${attacker.name} ดาบสะบั้น — ฟื้นพลังชีวิต +${hp} และยืดเวลาท่าไม้ตาย +${TOWER_EXTEND} เทิร์น`);
      return { mode: "tower", hp, sp: 0, extended: true };
    }
    if (rustyActive(attacker)) {
      const hp = engine.healHp(attacker, RUSTY_HEAL);
      const before = attacker.skillPoints;
      engine.addSkill(attacker, RUSTY_SP);
      const sp = attacker.skillPoints - before;
      engine.log(`🗡️ ${attacker.name} ดาบเก่าๆ — ฟื้นพลังชีวิต +${hp} และแต้มสกิล +${sp}`);
      return { mode: "rusty", hp, sp, extended: false };
    }
    return null;
  },
};
