// ============================================================
//  Echo (พิเศษ) — id "echo" · สเปกต้นฉบับ: Downloads/Echo (พิเศษ).txt · ปรับเข้ากระดานตามที่ผู้ใช้ตัดสิน (2026-10-09)
//
//  ค่าพื้นฐาน: พลังชีวิต 10 · ไม่มีเกราะ · "ขยายร่าง" แต่ละระดับ = เลือดสูงสุด +2 และฟื้นพลังชีวิต 2 (สูงสุด 10 ระดับ = 30)
//  สกิลพื้นฐาน มหึมา (0 แต้ม · คูลดาวน์ 12 เทิร์น): ได้ "ราชินีแห่ง Echo" 10 เทิร์น (ล้างไม่ได้)
//    → ได้ขยายร่าง +1 ทันที และ +1 ทุกต้นเทิร์นที่ยังเป็นราชินี · ขยายร่างคงอยู่ถาวรจนกว่าจะใช้ Overwrite
//  สกิลรอง Overwrite (0 แต้ม · ต้องมีขยายร่าง): ล้างขยายร่างทั้งหมด + ราชินี · ทุก 2 ระดับที่ล้าง = คูลดาวน์มหึมา −1
//    และพลังโจมตี +1 (2 เทิร์น — เทิร์นนี้ + เทิร์นหน้า) · ฟื้นพลังชีวิต 5 (หลังเลือดสูงสุดลดกลับ)
//  ท่าไม้ตาย ก่อกำเนิดใหม่ (6 แต้ม · ผู้ใช้ตัดสิน 2026-10-10): ใช้ได้เมื่อเลือดสูงสุด 30 (ขยายร่างครบ 10) · คูลดาวน์ 5 เทิร์น
//    ฉากโลกแตก (เฉพาะ Echo) → ศัตรูทุกคนเสียหาย 2 (ลดเกราะก่อน · ฆ่าได้ · โหมดทีมไม่โดนเพื่อน · หลบไม่ได้)
//    → สุ่มภูมิภาคใหม่ทันที ทุกคนไปจุดเกิด · เทิร์นที่ใช้ = เทิร์นที่ 1 ของภูมิภาคใหม่ (กลางวัน · อยู่ครบ 6 เทิร์น) · ร้านค้าตั้งใหม่นับใหม่
//    → ตาเดินของ Echo จบทันที (ตีต่อไม่ได้) · ขยายร่าง/เลือด 30 ยังอยู่ · ศัตรูหมด = จบเกมทันที ไม่เปลี่ยนภูมิภาค
//    (ฉาก/เปลี่ยนภูมิภาค/นับเวลาใหม่ = engine.journeyRebirth — server/phases/endTurn.js)
//  ติดตัว เหล่าสหายตัวน้อยเอ๋ย: ขยายร่าง ≤ 4 = คุ้มครอง (ดาเมจที่ได้รับ −1) · ≥ 5 = พลังโจมตี +1
//    · ครบ 10 = พลังโจมตี +1 อีก และตีปกติมีโอกาสสังหาร 5% · ต้นเทิร์นมีโอกาส 20% ได้ต้านสถานะผิดปกติ 1 เทิร์น
//    (สเปกระดับ 5 เขียน "จะได้รับ ___ และพลังโจมตีเพิ่มขึ้นอีก 1" — ผู้ใช้ตัดสิน 2026-10-12: พลังโจมตี +1 อย่างเดียว · คุ้มครอง/ระยะเดินคงตามนี้)
//  ติดตัว 2 การกลืนกินระดับ EX: สังหารผู้เล่นอื่นได้ = พลังโจมตี +1 ถาวร (นับทุกทางที่เป็นต้นเหตุ — combat.instantDeath)
//
//  ร่างบนกระดาน (ผู้ใช้ตัดสิน — นับจากเลือดสูงสุด):
//    10–14 = 1×1 ระยะตี 1 · 15–19 = 2×2 ระยะตี 2 · 20–24 = 3×3 ระยะตี 2 · 25–29 = 4×4 ระยะตี 3 · 30 = 5×5 ระยะตี 3
//    ตัวใหญ่ขึ้น เดินได้น้อยลง (MOV_BY_SIZE) · ตั้งแต่ 3×3 เดิน/ขยายตัวพังสิ่งกีดขวาง · ขยายตัวทับใคร = ผลักออก + ศัตรูเสีย 1
//    (เปลี่ยนขนาดจริงผ่าน engine.resizeUnit — server/phases/action.js)
// ============================================================

const Journey = require("./_journey");
const { CHAR_BY_ID } = require("../characters.js"); // ข้อมูลไม่มี require ต่อ — ไม่วนกลับมาที่นี่

const ID = "echo";

const BASE_HP = 10;
const HP_PER_STACK = 2;
const HEAL_PER_STACK = 2;
const MAX_STACKS = 10;
const QUEEN_TURNS = 10;
const GIANT_CD = 12;
const OW_HEAL = 5;
const OW_ATK_TURNS = 2;
const GUARD_MAX_STACKS = 4;
const ATK_STACKS_1 = 5;
const KILL_CHANCE = 0.05;
const RESIST_CHANCE = 0.2;
const ULT_CD = 5;
const ULT_DMG = 2;
const ULT_NAME = CHAR_BY_ID[ID].ultimate.name; // ชื่อท่าใน log — ข้อมูลตัวละครเป็นต้นฉบับ
// เลือดสูงสุด → ขนาดตัว (ด้านละกี่ช่อง)
const SIZE_STEPS = [[30, 5], [25, 4], [20, 3], [15, 2]];
const MOV_BY_SIZE = { 1: 4, 2: 3, 3: 3, 4: 2, 5: 2 };
const RANGE_BY_SIZE = { 1: [1, 1], 2: [1, 2], 3: [1, 2], 4: [1, 3], 5: [1, 3] };
const SMASH_SIZE = 3;

const isEcho = (p) => !!p && p.characterId === ID;
function fresh() {
  return { stacks: 0, giantReady: 0, ultReady: 0, kills: 0, guardOwn: false };
}
function st(p) { return p.echo || (p.echo = fresh()); }
const maxHpFor = (stacks) => BASE_HP + HP_PER_STACK * stacks;
function sizeForHp(maxHp) {
  for (const [hp, size] of SIZE_STEPS) if (maxHp >= hp) return size;
  return 1;
}
// ขนาดตัวบนกระดาน (engine.sizeOf — สูตรเดียวกับ server/phases/action.js) · ฮุคบนกระดาน (mov/range/smashes/attackStyle)
//  ไม่ได้รับ engine จึงดึงแบบ lazy: server/engine require characters/ อยู่แล้ว (require ตอนโหลดไฟล์ = วนกัน)
const sizeOf = (p) => require("../server/engine").engine.sizeOf(p);
const queenActive = (p) => (p.statuses.echoQueen || 0) > 0;
// ท่าไม้ตายต้องเลือดสูงสุด 30 = ขยายร่างครบ 10
const fullSize = (p) => st(p).stacks >= MAX_STACKS;

// คุ้มครองจากสกิลติดตัว: ขยายร่าง ≤ 4 ต่ออายุทีละเทิร์น (ห้ามใส่เลขเทิร์นยาวแทนความถาวร) · เกิน 4 = เอาออก (เฉพาะที่ตัวเองใส่)
//  สมมติฐาน: guard ที่เหลือ 1 เทิร์นตอนเอาออก = ของสกิลติดตัวนี้ (ต่ออายุทีละ 1) — คุ้มครองจากแหล่งอื่นที่บังเอิญเหลือ 1 เทิร์น
//  พอดีจะถูกล้างไปด้วย (ยอมรับได้: เหลือแค่เทิร์นสุดท้าย) · แหล่งที่ยาวกว่านั้น (> 1) ไม่ถูกแตะ
function refreshGuard(p) {
  const s = st(p);
  if (s.stacks <= GUARD_MAX_STACKS) {
    p.statuses.guard = Math.max(p.statuses.guard || 0, 1);
    p.statusAmt.guard = Math.max(p.statusAmt.guard || 0, 1);
    s.guardOwn = true;
  } else if (s.guardOwn) {
    if (p.statuses.guard === 1) { delete p.statuses.guard; delete p.statusAmt.guard; }
    s.guardOwn = false;
  }
}
// ขนาดตัวตามเลือดสูงสุด — ขยายไม่ได้ (ไม่มีที่) = ค้างไว้ ลองใหม่ต้นเทิร์นถัดไป
function syncSize(engine, p) {
  const want = sizeForHp(engine.maxHpOf(p));
  if (engine.sizeOf(p) !== want) engine.resizeUnit(p, want);
}
// ขยายร่าง +1: เลือดสูงสุด +2 แล้วฟื้น 2 → ขนาดตัวตามเลือดสูงสุดใหม่
function gainStack(engine, p) {
  const s = st(p);
  if (s.stacks >= MAX_STACKS) return false;
  s.stacks++;
  const healed = engine.healHp(p, HEAL_PER_STACK);
  engine.log(`🌌 ${p.name} ขยายร่าง ระดับ ${s.stacks} — เลือดสูงสุด ${engine.maxHpOf(p)} · ฟื้นพลังชีวิต +${healed}`);
  refreshGuard(p);
  syncSize(engine, p);
  return true;
}

module.exports = {
  id: ID,
  BASE_HP, MAX_STACKS, QUEEN_TURNS, GIANT_CD, OW_HEAL, OW_ATK_TURNS, GUARD_MAX_STACKS, ATK_STACKS_1, KILL_CHANCE, RESIST_CHANCE,
  MOV_BY_SIZE, RANGE_BY_SIZE, SMASH_SIZE, ULT_CD, ULT_DMG,
  sizeForHp,

  maxHp(p) { return isEcho(p) ? maxHpFor(st(p).stacks) : undefined; },
  maxArmor() { return 0; },
  resetCombat(p) { p.echo = isEcho(p) ? fresh() : null; },
  mov(p) { return isEcho(p) ? MOV_BY_SIZE[sizeOf(p)] : null; },
  range(p) { return isEcho(p) ? RANGE_BY_SIZE[sizeOf(p)] : null; },
  smashes(p) { return isEcho(p) && sizeOf(p) >= SMASH_SIZE; },
  // ท่าตีปกติบนกระดาน (ผู้ใช้ตัดสิน): 1×1 = คลื่นเสียง · 2×2–3×3 = ผมฟาด · 4×4–5×5 = ห่าง 1–2 ช่องผมฟาด / ห่าง 3 ช่องปาหิน
  attackStyle(p, dist) {
    if (!isEcho(p)) return null;
    const n = sizeOf(p);
    if (n <= 1) return "echo";
    if (n >= 4 && dist >= 3) return "rock";
    return "hair";
  },

  // ---------- ต้นเทิร์น (dealRound) ----------
  //  ราชินี: ขยายร่าง +1 · คุ้มครองต่ออายุ · ต้านสถานะ 20% · ขนาดตัวที่ค้างไว้ลองขยายใหม่
  onRoundStartTick(engine, p) {
    if (!isEcho(p) || !p.alive) return;
    if (queenActive(p)) gainStack(engine, p); // ขยายแล้ว syncSize ในตัวแล้ว
    refreshGuard(p);
    if (Math.random() < RESIST_CHANCE) {
      p.statuses.resist = Math.max(p.statuses.resist || 0, 1);
      engine.log(`🛡️ ${p.name} — เหล่าสหายตัวน้อยเอ๋ย: ได้ต้านสถานะผิดปกติ 1 เทิร์น`);
    }
    // เรียกซ้ำโดยตั้งใจ: ไม่มีราชินี (gainStack ไม่ทำงาน) หรือขยายตัวรอบก่อนไม่สำเร็จเพราะไม่มีที่ = ลองใหม่ทุกต้นเทิร์น
    //  (ขนาดตรงแล้ว syncSize ไม่ทำอะไร)
    syncSize(engine, p);
  },

  // ---------- การโจมตี ----------
  damageBonus(engine, p) {
    if (!isEcho(p)) return 0;
    const s = st(p);
    let n = s.kills;
    if (s.stacks >= ATK_STACKS_1) n++;
    if (s.stacks >= MAX_STACKS) n++;
    if ((p.statuses.echoOverwrite || 0) > 0) n += p.statusAmt.echoOverwrite || 0;
    return n;
  },
  // โอกาสสังหารทันทีจากตีปกติ (ครบ 10 ระดับ) — phases/attack.js strike()
  killChance(p) { return isEcho(p) && st(p).stacks >= MAX_STACKS ? KILL_CHANCE : 0; },
  // การกลืนกินระดับ EX: ใครตายโดยมี Echo เป็นต้นเหตุ (match.effectSourceId) = พลังโจมตี +1 ถาวร — combat.instantDeath
  onKill(engine, killer, victim) {
    if (!isEcho(killer) || !victim || victim.id === killer.id) return;
    st(killer).kills++;
    engine.log(`🍽️ ${killer.name} — การกลืนกินระดับ EX: พลังโจมตี +1 ถาวร (รวม +${st(killer).kills})`);
  },

  // ---------- สกิล ----------
  canUseSkill(engine, p, tier) {
    if (!isEcho(p)) return true;
    const s = st(p);
    if (tier === "basic") return !queenActive(p) && engine.roundNumber >= s.giantReady;
    if (tier === "secondary") return s.stacks > 0;
    if (tier === "ultimate") return fullSize(p) && engine.roundNumber >= s.ultReady && Journey.active(engine);
    return false;
  },
  // ก่อกำเนิดใหม่: ฉากโลกแตกเป็นตัวประกาศท่าเอง (ห้ามมีชื่อท่าบนจอ — ผู้ใช้สั่ง) = ไม่ขึ้นป้ายสกิลกลาง
  silentFlash(p, tier) { return isEcho(p) && tier === "ultimate"; },
  applyInstantSkill(engine, p, tier) {
    if (!isEcho(p)) return "";
    const s = st(p);
    if (tier === "basic") {
      p.statuses.echoQueen = QUEEN_TURNS;
      s.giantReady = engine.roundNumber + GIANT_CD;
      engine.log(`👑 ${p.name} ใช้ มหึมา — ราชินีแห่ง Echo ${QUEEN_TURNS} เทิร์น`);
      gainStack(engine, p);
      return "";
    }
    if (tier === "secondary") {
      const cleared = s.stacks;
      const pairs = Math.floor(cleared / 2);
      s.stacks = 0;
      delete p.statuses.echoQueen;
      p.hp = Math.min(p.hp, engine.maxHpOf(p));
      s.giantReady = Math.max(0, s.giantReady - pairs);
      if (pairs > 0) {
        p.statuses.echoOverwrite = OW_ATK_TURNS;
        p.statusAmt.echoOverwrite = pairs;
      }
      const healed = engine.healHp(p, OW_HEAL);
      refreshGuard(p);
      syncSize(engine, p);
      engine.log(`🔄 ${p.name} ใช้ Overwrite — ล้างขยายร่าง ${cleared} ระดับ${pairs ? ` · พลังโจมตี +${pairs} ${OW_ATK_TURNS} เทิร์น · คูลดาวน์มหึมา −${pairs}` : ""} · ฟื้นพลังชีวิต +${healed}`);
      return "";
    }
    if (tier === "ultimate") {
      s.ultReady = engine.roundNumber + ULT_CD;
      engine.log(`🌍 ${p.name} ใช้ ${ULT_NAME}`);
      // ความเสียหายลงตอนฉากจบ (ก่อนเปลี่ยนภูมิภาค) — journeyRebirth เรียกในนามของ Echo (effectSource)
      engine.journeyRebirth(p, () => rebirthHit(engine, p));
      return "";
    }
    return "";
  },
  skillLocks(engine, p) {
    if (!isEcho(p)) return undefined;
    const s = st(p);
    return {
      basic: { cd: Math.max(0, s.giantReady - engine.roundNumber), locked: queenActive(p) },
      secondary: { locked: s.stacks <= 0 },
      ultimate: { cd: Math.max(0, s.ultReady - engine.roundNumber), locked: !fullSize(p) },
    };
  },

  // ---------- ข้อมูลให้ client (ทุกคนเห็น) ----------
  echoState(engine, p) {
    if (!isEcho(p)) return undefined;
    const s = st(p);
    return { stacks: s.stacks, max: MAX_STACKS, kills: s.kills, giantCd: Math.max(0, s.giantReady - engine.roundNumber) };
  },
};

// ก่อกำเนิดใหม่: ศัตรูทุกคนเสียหาย ULT_DMG (ลดเกราะก่อน · ฆ่าได้ · หลบไม่ได้ · โหมดทีมไม่โดนเพื่อน)
//  เรียกในนามของ Echo (withEffectSource) → ใครตาย = การกลืนกินระดับ EX ผ่าน combat.instantDeath
function rebirthHit(engine, p) {
  for (const t of engine.alivePlayers()) {
    if (t.id === p.id || engine.sameTeam(p, t)) continue;
    t.wasAttacked = true;
    const before = (t.hp || 0) + (t.armor || 0);
    engine.dealMixed(t, ULT_DMG);
    engine.resolveDamageAftermath(t);
    const dealt = Math.max(0, before - ((t.hp || 0) + (t.armor || 0)));
    engine.log(`🌍 ${ULT_NAME} → ${t.name} -${dealt} (ลดเกราะก่อน)`);
    if (!t.alive) {
      t.pos = null;
      engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`);
    }
  }
}
