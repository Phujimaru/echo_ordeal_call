// ============================================================
//  เฟิร์น (Fern — Frieren: Beyond Journey's End) — ระดับกลาง · id "fern" · กติกาที่ผู้ใช้ตัดสิน GRID_PLAN §7.14 (รื้อใหม่ 2026-10-21)
//
//  ค่าพื้นฐาน: พลังชีวิต 5 · เกราะ 2 · ระยะเดิน 3 · ตีปกติแนวตรง [1, 3] (attackLane — ทะลุสิ่งกีดขวาง โดนศัตรูทุกคนในแนว)
//  Energy = แต้มสกิล (p.skillPoints) เพดาน 10 (maxSkill) · เริ่มเกมเต็ม 10 (resetCombat)
//    ฟื้นได้จากซ่อนเร้นมานาเท่านั้น — ฮุค blocksSkillGain กันทุกทางอื่นใน combat.addSkill + เงินคืนของการเดินทาง (skills.js)
//    · ฟื้นของตัวเองส่ง src "fern" (ชะงัก/ผนึกพลังงานยังกันได้)
//  ตีปกติ Zoltraak: ดาเมจฐาน 2 (attackBaseOverride — บัฟ/คริบวกต่อ) · 2 Energy ต่อการตี 1 ครั้ง (onStrikeResolved/onStrikeObject
//    เรียกครั้งเดียวต่อการตี — ทั้งแนวเสียครั้งเดียว) · Energy ไม่ถึง 2 = range [1, 0] (ตีไม่ได้) ยกเว้นครั้งที่ 6 · ไม่มีตีสวน
//  ติดตัว ผู้เชี่ยวชาญเวทมนต์พื้นฐาน:
//    (ก) ศัตรูโจมตีใส่ (ตีปกติ/ปืน/สกิล — ไม่นับดาเมจที่ไม่มีผู้ลงมือ) ขณะพร้อม = การโจมตีนั้นทั้งก้อนเป็น 0 (ฮุค onAttacked + blocksAttack
//        — คีย์ ผู้โจมตี|เทิร์น|ตาเดิน|commandSeq) · ไม่นับว่าถูกโจมตี (ซ่อนเร้นไม่หลุด ไม่สตั้น) · กันเทิร์น N → พร้อมอีก N+3 · ก่อนทอยหลบ
//    (ข) นับการตี Zoltraak (คน/ผนึก/หนาม · 1 ครั้งต่อการตี — afterStrike) ครบ 5 → ครั้งที่ 6: ไม่เสีย Energy + ทะลุเกราะทุกคนในแนว
//        (ฮุค strikePierces) + จบฉากตีแล้วรีเซ็ทคูลดาวน์ทุกอย่าง (ร่ายต่อเนื่อง/เพิ่มระยะ/ซ่อนเร้นมานา รวมคูลดาวน์เริ่มเกม/การกัน)
//        แล้วนับ 0 ใหม่ (ครั้งที่ 6 ไม่นับ)
//  สกิลพื้นฐาน ร่ายต่อเนื่อง (2 Energy · ตัวเอง): ตีปกติ +1 ครั้งในตาเดินนี้ (ฮุค extraStrike) · กดเทิร์น N → กดได้อีก N+2 · โควตาปกติ
//  สกิลรอง เพิ่มระยะ (3 Energy · ตัวเอง): ตีปกติครั้งถัดไป 1 ครั้งเป็นแนว [1, 6] (ค้างข้ามเทิร์นจนกว่าจะตี) · กดเทิร์น N → N+2
//    · ค้างอยู่แล้วกดซ้ำไม่ได้ (Claude ตัดสิน — กันเสีย Energy เปล่า)
//  ท่าไม้ตาย ซ่อนเร้นมานา (ฟรีจริง — skillFree · ไม่กินโควตา · ไม่ล็อกการเดิน · กดอีกครั้ง = ยกเลิก):
//    เริ่มเกมติดคูลดาวน์ — กดได้ตั้งแต่เทิร์นแรก + 4 (ตั้งตอนต้นเทิร์นแรก: roundNumber เริ่มที่ startRound — ปกติ 1 → เทิร์น 5)
//    เข้า: ล่องหน (ศัตรูในระยะ 2 แมนฮัตตันจากกรอบตัวเห็น — ฮุค seenBy) · Energy +4 ทันที · ต้นเทิร์น +2 · ฟื้นพลังชีวิต 1
//      ทุก 2 เทิร์น (ต้นเทิร์น N+2, N+4 …) · เดิน/จั่ว/ไอเทมได้ · กดเข้าเงียบ (silentFlash · เอฟเฟกต์/เสียงเฉพาะฝ่ายตัวเอง)
//    ออก: กดยกเลิก · ตี (ตีปกติ/ปืน GUTS/ไถลชน — onReveal "act" ยกเว้นไอเทม) · ใช้สกิลพื้นฐาน/รอง · ศัตรูโจมตีใส่ที่ไม่ถูกกัน
//      (หลบพ้นก็นับ) = หลุด + สตั้นเต็มเทิร์นถัดไป (onEndTurn — ใส่ตรง ไม่ทอยต้าน) · คูลดาวน์ 4 นับจากเทิร์นที่ออก (N → N+4)
// ============================================================
const Board = require("../server/board");

const ID = "fern";
const DIR = "/characters/fern";
const IMG = {
  base: `${DIR}/fern.webp`,
  skill1: `${DIR}/fern_skill1.webp`,
  skill2: `${DIR}/fern_skill2.webp`,
  skill3: `${DIR}/fern_skill3.webp`,
};
// เสียง (client/src/audio.js — ไฟล์อยู่ client/public/characters/fern/sfx/)
const SFX = {
  zoltraak: "fern_zoltraak", zoltraakMax: "fern_zoltraak_max", cast: "fern_cast", boost: "fern_boost",
  conceal: "fern_conceal", unveil: "fern_unveil", shield: "fern_shield",
};
const FX = "fernFx"; // socket event (client/src/board/fernFx.js)
const STYLE = "fernZoltraak";        // ท่าตีปกติบนกระดาน (client STYLE_MS / STYLE_HIT_P)
const STYLE_MAX = "fernZoltraakMax"; // ครั้งที่ 6
const PASSIVE = "ผู้เชี่ยวชาญเวทมนต์พื้นฐาน";
const PIERCE_FX = "ทะลุเกราะ";

const HP = 5;
const ARMOR = 2;
const ENERGY_MAX = 10;
const ZOLT_COST = 2;
const ZOLT_DMG = 2;
const ZOLT_FX_EXTRA = 1; // วินาทีที่ฉากตียาวขึ้น (ร่าย 1.5 วิก่อนปะทะ — client FERN_SFX_LEAD)
const EMPOWER_AT = 5;    // ตีครบ 5 → ครั้งที่ 6 เสริมพลัง
const SHIELD_CD = 3;     // กันเทิร์น N → พร้อม N+3
const CAST_CD = 2;       // กดเทิร์น N → กดได้อีก N+2
const BOOST_CD = 2;
const BOOST_RANGE = [1, 6];
const CONCEAL_START_CD = 4; // เริ่มเกม: กดได้ตั้งแต่เทิร์นแรก + 4
const CONCEAL_GAIN = 4;
const CONCEAL_REGEN = 2;
const CONCEAL_HEAL = 1;
const CONCEAL_HEAL_EVERY = 2;
const CONCEAL_SIGHT = 2; // ศัตรูในระยะนี้ (แมนฮัตตัน · กรอบตัว) มองเห็น
const CONCEAL_CD = 4;    // ออกเทิร์น N → กดได้อีก N+4
const STUN_TURNS = 1;
const NO_STRIKE = [1, 0];

const isFern = (p) => !!p && p.characterId === ID;
function fresh() {
  return {
    shieldReady: 0,      // การกันพร้อมเมื่อ roundNumber >= ค่านี้
    blockKey: null,      // คีย์การโจมตีที่กำลังถูกกัน (ทุกจังหวะของการโจมตีเดียวกัน = 0)
    hitKey: null,        // คีย์การโจมตีที่นับว่าถูกโจมตีไปแล้ว (ไม่หลุดซ้ำ)
    count: 0,            // การตี Zoltraak ที่นับไว้ (0..5 — ครบ 5 = ครั้งถัดไปเสริมพลัง)
    castReady: 0,        // ร่ายต่อเนื่องกดได้เมื่อ roundNumber >= ค่านี้
    extra: 0,            // ตีปกติที่ตุนไว้ในตาเดินนี้
    boost: false,        // เพิ่มระยะค้างอยู่ (ตีครั้งถัดไป [1, 6])
    boostReady: 0,
    conceal: null,       // ซ่อนเร้นมานา { since, healAt }
    concealReady: null,  // null = ยังไม่ตั้ง (ตั้งต้นเทิร์นแรก = เทิร์นนั้น + 4)
    stunPending: false,
    last: null,          // ผลของการกดล่าสุด (silentFlash/skillSound อ่านหลัง applyInstantSkill) "enter" | "exit" | "cast" | "boost"
    castSever: 0, boostSever: 0, // ลำดับตอนได้ผลสกิล (engine.severStamp — ฮุค severables · ซ่อนเร้นมานาเก็บใน conceal.sever)
  };
}
function st(p) { return p.fern || (p.fern = fresh()); }
const cdLeft = (ready, round) => Math.max(0, (ready || 0) - round);
const concealOn = (p) => isFern(p) && !!st(p).conceal;
const empowered = (p) => isFern(p) && st(p).count >= EMPOWER_AT;
// คูลดาวน์ซ่อนเร้นมานาก่อนตั้งค่าเริ่มเกม (ช่วงก่อนเทิร์นแรก) = เต็ม 4
function concealCdOf(s, r) { return s.concealReady == null ? CONCEAL_START_CD : cdLeft(s.concealReady, r); }

// ตัวเอง + เพื่อนร่วมทีม (เห็นการเข้าซ่อนเร้น)
function audience(engine, p) {
  const out = [p.id];
  if (engine.teamModeActive() && p.teamId) for (const o of Object.values(engine.players)) if (o.id !== p.id && o.teamId === p.teamId && !o.duoOf && !o.summon) out.push(o.id);
  return out;
}
// ผู้ชมที่มองเห็นเฟิร์นอยู่ตอนนี้ (เอฟเฟกต์ที่บอกตำแหน่ง — ในพุ่ม/ล่องหนไม่ส่งให้คนที่มองไม่เห็น)
function watchers(engine, p) {
  return Object.values(engine.players).filter((o) => !o.duoOf && !o.summon && (o.id === p.id || !engine.hiddenFrom(o, p))).map((o) => o.id);
}
function fx(engine, p, kind, onlyFor) {
  if (!p.pos) return;
  engine.boardFxTo(onlyFor || watchers(engine, p), FX, { kind, id: p.id, at: { ...p.pos } });
}
function sound(engine, p, key, onlyFor) { engine.sfx(key, onlyFor || watchers(engine, p)); }
function gainEnergy(engine, p, n) {
  const before = p.skillPoints;
  engine.addSkill(p, n, "fern");
  return p.skillPoints - before;
}

// ---------- การโจมตีครั้งเดียวกัน (การกันของติดตัว) ----------
//  ทุกคำสั่งของผู้เล่นได้เลขใหม่ (TimeStop.guard) · ผลที่ลงทีหลังในฉากใช้เลขเดิม · ต้นเทิร์น/ต้นตาเดินแยกด้วยผู้ที่กำลังเดิน
function attackKey(engine, src) {
  return `${src.id}|${engine.roundNumber}|${engine.actorId || ""}|${engine.commandSeq}`;
}
function shieldReady(engine, p) { return engine.roundNumber >= st(p).shieldReady; }

// ---------- ซ่อนเร้นมานา ----------
function enterConceal(engine, p) {
  const s = st(p), r = engine.roundNumber;
  s.conceal = { since: r, healAt: r + CONCEAL_HEAL_EVERY, sever: engine.severStamp() };
  const got = gainEnergy(engine, p, CONCEAL_GAIN);
  const own = audience(engine, p);
  fx(engine, p, "conceal", own);
  sound(engine, p, SFX.conceal, own);
  s.last = "enter";
  return got;
}
// why: "cancel" | "attack" | "skill" | "hit"
function exitConceal(engine, p, why) {
  const s = st(p);
  if (!s.conceal) return;
  s.conceal = null;
  s.concealReady = engine.roundNumber + CONCEAL_CD;
  fx(engine, p, "unveil"); // หลังออก = ทุกคนที่มองเห็นแล้ว
  sound(engine, p, SFX.unveil);
  if (why === "hit") {
    s.stunPending = true;
    engine.log(`💥 ${p.name} ถูกโจมตีระหว่างซ่อนเร้นมานา — หลุดจากการซ่อนตัว · สตั้นเทิร์นหน้า`);
  } else {
    engine.log(`✨ ${p.name} คลายซ่อนเร้นมานา`);
  }
}

// ---------- ครั้งที่ 6: รีเซ็ทคูลดาวน์ทุกอย่าง ----------
function resetAll(s) {
  s.castReady = 0;
  s.boostReady = 0;
  s.concealReady = 0;
  s.shieldReady = 0;
}

module.exports = {
  id: ID,
  IMG, SFX, FX, STYLE, STYLE_MAX, PASSIVE, PIERCE_FX, HP, ARMOR, ENERGY_MAX, ZOLT_COST, ZOLT_DMG, EMPOWER_AT, SHIELD_CD,
  CAST_CD, BOOST_CD, BOOST_RANGE, CONCEAL_START_CD, CONCEAL_GAIN, CONCEAL_REGEN, CONCEAL_HEAL, CONCEAL_HEAL_EVERY,
  CONCEAL_SIGHT, CONCEAL_CD, STUN_TURNS,
  isFern, concealOn, empowered,

  resetCombat(p) {
    p.fern = isFern(p) ? fresh() : null;
    if (isFern(p)) p.skillPoints = ENERGY_MAX; // Energy เริ่มเกมเต็ม
  },
  maxHp() { return HP; },
  maxArmor() { return ARMOR; },
  maxSkill(p) { return isFern(p) ? ENERGY_MAX : undefined; },
  skillRegen(p) { return isFern(p) ? 0 : 1; },
  // Energy ฟื้นจากซ่อนเร้นมานาเท่านั้น (src "fern") — ทุกทางอื่นที่ผ่าน combat.addSkill ถูกกัน
  blocksSkillGain(p, src) { return isFern(p) && src !== "fern"; },

  // ---------- ตีปกติ Zoltraak ----------
  range(p) {
    if (!isFern(p)) return null;
    if ((p.skillPoints || 0) < ZOLT_COST && !empowered(p)) return NO_STRIKE;
    return st(p).boost ? BOOST_RANGE : null;
  },
  attackLane(p) { return isFern(p); },
  attackBaseOverride(engine, attacker) { return isFern(attacker) ? ZOLT_DMG : 1; },
  attackStyle(p) { return isFern(p) ? (empowered(p) ? STYLE_MAX : STYLE) : null; },
  // ร่าย/ชาร์จก่อนลำแสงปะทะ 1.5 วิ (ตามไฟล์เสียง ZOLTRAAK FIre) → ฉากตียาวขึ้น 1 วิ
  attackFxExtra(p) { return isFern(p) ? ZOLT_FX_EXTRA : 0; },
  attackSound(p) { return isFern(p) ? (empowered(p) ? SFX.zoltraakMax : SFX.zoltraak) : undefined; },
  // ครั้งที่ 6: ดาเมจทะลุเกราะ (attack.strike — ทุกคนในแนว) + ป้ายบนฉากตี
  strikePierces(engine, attacker) { return empowered(attacker); },
  attackFxNames(attacker) { return empowered(attacker) ? [PIERCE_FX] : []; },
  // ตีคน 1 ครั้ง (ทั้งแนวนับครั้งเดียว) · ตีผนึก/หนาม = 2 Energy · ครั้งที่ 6 ฟรี
  onStrikeResolved(engine, attacker, target, res, { counter } = {}) {
    if (!isFern(attacker) || counter || empowered(attacker)) return;
    attacker.skillPoints = Math.max(0, (attacker.skillPoints || 0) - ZOLT_COST);
  },
  onStrikeObject(engine, p) {
    if (!isFern(p) || empowered(p)) return;
    p.skillPoints = Math.max(0, (p.skillPoints || 0) - ZOLT_COST);
  },
  // จบฉากตี 1 ครั้ง (คน/ผนึก/หนาม): ใช้เพิ่มระยะ · นับ Zoltraak · ครั้งที่ 6 = รีเซ็ทคูลดาวน์ทั้งหมดแล้วนับใหม่
  afterStrike(engine, p) {
    if (!isFern(p)) return;
    const s = st(p);
    s.boost = false;
    if (s.count >= EMPOWER_AT) {
      s.count = 0;
      resetAll(s);
      fx(engine, p, "reset");
      engine.log(`✨ ${p.name} ${PASSIVE} — รีเซ็ทคูลดาวน์ทุกสกิล`);
      return;
    }
    s.count++;
    if (s.count >= EMPOWER_AT) fx(engine, p, "empower");
  },
  // ร่ายต่อเนื่อง: ตีที่ตุนไว้ = ตีครั้งนี้ไม่จบตา (server/phases/action.js strikeTarget)
  extraStrike(engine, p) {
    if (!isFern(p) || st(p).extra <= 0) return false;
    st(p).extra--;
    return true;
  },

  // ---------- ติดตัว: กันการโจมตี + ถูกโจมตี ----------
  onAttacked(engine, p, attacker) {
    if (!isFern(p) || !p.alive) return;
    const s = st(p), key = attackKey(engine, attacker);
    if (s.blockKey === key || s.hitKey === key) return;
    if (shieldReady(engine, p)) {
      s.blockKey = key;
      s.shieldReady = engine.roundNumber + SHIELD_CD;
      fx(engine, p, "shield");
      sound(engine, p, SFX.shield);
      engine.log(`🛡️ ${p.name} ${PASSIVE} — กันการโจมตีของ ${attacker.name}`);
      return;
    }
    s.hitKey = key;
    if (s.conceal) exitConceal(engine, p, "hit");
  },
  blocksAttack(engine, p, attacker) {
    if (!isFern(p) || st(p).blockKey !== attackKey(engine, attacker)) return null;
    return { name: PASSIVE, img: IMG.base };
  },

  // ---------- การมองเห็น ----------
  stealthed(p) { return concealOn(p); },
  // ซ่อนเร้นมานา: ศัตรูในระยะ 2 (แมนฮัตตัน · กรอบตัว) มองเห็น
  seenBy(engine, viewer, target) {
    if (!concealOn(target) || !viewer.pos || !target.pos) return false;
    return Board.dist(Board.boxOf(viewer), Board.boxOf(target)) <= CONCEAL_SIGHT;
  },
  // ลงมือ (Visibility.onHostileAct): ตีปกติ/ปืน/ไถลชน = ออกจากซ่อนเร้นก่อนลงผล · ใช้ไอเทมใส่คนอื่นไม่ออก (ไอเทมใช้ได้ระหว่างโหมด)
  //  ถูกพื้นที่โจมตี ("hit") ตัดสินที่ onAttacked (ถูกกัน = ไม่หลุด) · ถูกชน ("bump") ไม่หลุด
  onReveal(engine, p, kind, how) {
    if (!concealOn(p) || kind !== "act" || how === "item") return;
    exitConceal(engine, p, "attack");
  },

  // ---------- สกิล ----------
  // ท่าไม้ตายฟรีจริงทุกครั้ง (เข้า/ยกเลิก — ภาระเวทไม่บวก)
  skillFree(p, tier) { return isFern(p) && tier === "ultimate"; },
  skipsTurnQuota(p, tier) { return isFern(p) && tier === "ultimate"; },
  ignoresTurnQuota(p, tier) { return isFern(p) && tier === "ultimate" && concealOn(p); }, // ยกเลิก
  keepsMove(engine, p, tier) { return isFern(p) && tier === "ultimate"; },
  silentFlash(p, tier) { return isFern(p) && tier === "ultimate"; }, // เข้าเงียบ · ออกมีเอฟเฟกต์ unveil + เสียงแทนป้าย
  skillSound(p, tier) {
    if (!isFern(p)) return null;
    if (tier === "basic") return SFX.cast;
    if (tier === "secondary") return SFX.boost;
    return null;
  },
  skillPub(p, tier) {
    if (tier === "ultimate" && concealOn(p)) return { active: true };
    return null;
  },
  canUseSkill(engine, p, tier) {
    if (!isFern(p)) return true;
    const s = st(p), r = engine.roundNumber;
    if (tier === "basic") return cdLeft(s.castReady, r) === 0;
    if (tier === "secondary") return !s.boost && cdLeft(s.boostReady, r) === 0;
    if (tier === "ultimate") return concealOn(p) || (!!p.pos && concealCdOf(s, r) === 0);
    return false;
  },
  applyInstantSkill(engine, p, tier) {
    if (!isFern(p)) return "";
    const s = st(p), r = engine.roundNumber;
    if (tier === "basic") {
      if (s.conceal) exitConceal(engine, p, "skill");
      s.castReady = r + CAST_CD;
      s.extra++;
      s.castSever = engine.severStamp();
      s.last = "cast";
      fx(engine, p, "cast");
      engine.log(`✨ ${p.name} ร่ายต่อเนื่อง — ตีปกติเพิ่ม +1 ในตาเดินนี้`);
      return "";
    }
    if (tier === "secondary") {
      if (s.conceal) exitConceal(engine, p, "skill");
      s.boost = true;
      s.boostSever = engine.severStamp();
      s.boostReady = r + BOOST_CD;
      s.last = "boost";
      fx(engine, p, "boost");
      engine.log(`✨ ${p.name} เพิ่มระยะ — ตีปกติครั้งถัดไประยะ ${BOOST_RANGE[1]}`);
      return "";
    }
    if (tier === "ultimate") {
      if (s.conceal) { exitConceal(engine, p, "cancel"); s.last = "exit"; return ""; }
      enterConceal(engine, p);
      return "";
    }
    return "";
  },

  // ---------- จังหวะเทิร์น/ตาเดิน ----------
  onRoundStartTick(engine, p) {
    if (!isFern(p) || !p.alive) return;
    const s = st(p), r = engine.roundNumber;
    if (s.concealReady == null) s.concealReady = r + CONCEAL_START_CD; // เทิร์นแรกของเกม
    if (!s.conceal) return;
    const got = gainEnergy(engine, p, CONCEAL_REGEN);
    let healed = 0;
    if (r >= s.conceal.healAt) {
      s.conceal.healAt += CONCEAL_HEAL_EVERY;
      healed = engine.healHp(p, CONCEAL_HEAL);
    }
    if (got || healed) engine.log(`✨ ${p.name} ซ่อนเร้นมานา —${got ? ` Energy +${got}` : ""}${healed ? ` พลังชีวิต +${healed}` : ""}`);
  },
  // ตีที่ตุนไว้ใช้ได้เฉพาะตาเดินนั้น
  onActorStart(engine, p) { if (isFern(p)) st(p).extra = 0; },
  onActorEnd(engine, p) { if (isFern(p)) st(p).extra = 0; },
  onEndTurn(engine) {
    for (const p of Object.values(engine.players)) {
      if (!isFern(p)) continue;
      const s = st(p);
      if (s.stunPending && p.alive) {
        engine.applyBuff(p, "stun", null, STUN_TURNS); // โทษของตัวเอง: ไม่ทอยต้าน (หลังลูปลดเทิร์น = เต็มเทิร์นถัดไป)
        engine.log(`😵 ${p.name} สตั้น ${STUN_TURNS} เทิร์น (หลุดจากซ่อนเร้นมานา)`);
      }
      s.stunPending = false;
    }
  },
  onDeath(engine, p) {
    if (!isFern(p)) return;
    const s = st(p);
    s.conceal = null;
    s.extra = 0;
    s.stunPending = false;
  },

  // ---------- ผลสกิลที่ตัดได้ (server/sever.js — รากฐานจิตของเรียวกิ) ----------
  //  ซ่อนเร้นมานา (ออกแบบกดยกเลิก — ไม่สตั้น · คูลดาวน์ 4 นับจากเทิร์นนี้) · เพิ่มระยะที่ค้างอยู่ · ตีที่ตุนไว้จากร่ายต่อเนื่อง (มีแค่ในตาเดินของเฟิร์น)
  //  คูลดาวน์ร่ายต่อเนื่อง/เพิ่มระยะนับจากตอนกดอยู่แล้ว · การกัน/ครั้งที่ 6 = ติดตัว ไม่ใช่ผลสกิล
  severables(engine, p) {
    if (!isFern(p) || !p.alive) return [];
    const s = st(p), out = [];
    if (s.conceal) {
      out.push({ key: "conceal", label: "ซ่อนเร้นมานา", at: s.conceal.sever || 0, cancel: () => exitConceal(engine, p, "cancel") });
    }
    if (s.boost) {
      out.push({
        key: "boost", label: "เพิ่มระยะ", at: s.boostSever,
        cancel: () => { s.boost = false; engine.log(`✨ เพิ่มระยะของ ${p.name} หมดลง`); },
      });
    }
    if (s.extra > 0) {
      out.push({
        key: "cast", label: "ร่ายต่อเนื่อง", at: s.castSever,
        cancel: () => { s.extra = 0; engine.log(`✨ ร่ายต่อเนื่องของ ${p.name} หมดลง`); },
      });
    }
    return out;
  },

  // ---------- ข้อมูลให้ client ----------
  //  cd = เทิร์นที่เหลือ (0 = พร้อม) · ศัตรูที่มองไม่เห็นได้ค่าว่าง (view.unseenPub)
  fernState(engine, p) {
    if (!isFern(p)) return undefined;
    const s = st(p), r = engine.roundNumber;
    return {
      conceal: !!s.conceal,
      count: Math.min(s.count, EMPOWER_AT),
      empowered: s.count >= EMPOWER_AT,
      boost: !!s.boost,
      shieldCd: cdLeft(s.shieldReady, r),
      basicCd: cdLeft(s.castReady, r),
      boostCd: cdLeft(s.boostReady, r),
      concealCd: s.conceal ? 0 : concealCdOf(s, r),
    };
  },
  skillLocks(engine, p) {
    if (!isFern(p)) return undefined;
    const s = st(p), r = engine.roundNumber, conceal = concealOn(p);
    const basicCd = cdLeft(s.castReady, r), boostCd = cdLeft(s.boostReady, r), ultCd = conceal ? 0 : concealCdOf(s, r);
    return {
      basic: { cd: basicCd, locked: basicCd > 0 },
      secondary: { cd: boostCd, locked: boostCd > 0 || !!s.boost },
      ultimate: { cd: ultCd, locked: ultCd > 0, free: conceal },
    };
  },
};
