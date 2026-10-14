// ============================================================
//  โอเบรอน (ฤดูร้อน) — ระดับกลาง
//
//  ระยะทุกท่า = ระยะเดินปกติสูงสุดของโอเบรอน (area range "mov" ใน characters.js — server/skills.js ตรวจให้)
//  สกิลพื้นฐาน ม่านแห่งราตรี (2 แต้ม · กดซ้ำไม่ได้ระหว่างผลยังอยู่)
//    ทุกคนในรัศมี (โหมดทีม: ตัวเอง + เพื่อนร่วมทีมเท่านั้น) พลังโจมตี +1 3 เทิร์น และฟื้นพลังชีวิต 1
//  สกิลรอง นกจาบยามเช้า (4 แต้ม · ไม่กินโควตาสกิลของเทิร์น แต่กดได้ 1 ครั้ง/เทิร์น)
//    เลือก 1 คนในระยะ (ใครก็ได้รวมตัวเอง ทุกโหมด — ข้อยกเว้นของโอเบรอน: ใช้ผลเสียของท่ากับศัตรูได้)
//    ฟื้นพลังชีวิต 5 + ต้านสถานะผิดปกติ 2 เทิร์น + ล้างดีบัฟที่โดนล่าสุด 1 อย่าง
//    ต้นเทิร์นถัดไป เป้าหมายเสียพลังชีวิต 2 แบบทะลุเกราะ (ต้านสถานะกันไม่ได้ · ตายได้)
//  ท่าไม้ตาย จุดจบของความฝัน (4 แต้ม · คูลดาวน์ 5 เทิร์น)
//    เลือก 1 คนในระยะ (ใครก็ได้รวมตัวเอง ทุกโหมด) พลังโจมตี +4 จนจบตาเดินถัดไปของเป้า (GRID_PLAN §7.4)
//    ให้ก่อนเป้าเดิน (หรือให้ตัวเอง) = ใช้ได้เทิร์นนี้ · ให้หลังเป้าเดินไปแล้ว = ใช้เทิร์นหน้า
//    จบเทิร์นที่เป้าได้ใช้บัฟ -> ติดสตั้น 3 เทิร์น เริ่มเทิร์นถัดไป (ต้านสถานะผิดปกติกันได้)
//  สกิลติดตัว หน้าไหว้หลังหลอก — จบเทิร์นที่ไม่ถูกโจมตีเลย ทั้งตีปกติและสกิลแบบตี (p.wasAttacked — ถูกเลือกเป็นเป้าก็นับ แม้หลบได้)
//    แต้มสกิล +1 และเหรียญ +1
//
//  สถานะ: obsVeil (ม่านแห่งราตรี +1) · obsDream (+4 จนจบตาเดินถัดไปของเป้า — 1 หรือ 2 เทิร์น ล้างทิ้งที่ onEndTurn)
//    · obsLark (เครื่องหมายรอเสียเลือด 2 — LARK_MARK_TURNS) — ทั้งหมดไม่อยู่ในรายการดีบัฟ จึงล้าง/ต้านไม่ได้
// ============================================================

const ID = "oberon_summer";
const DIR = "/characters/oberon(summer)";
// ภาพประจำตัว (ป้ายบัฟในฉากตี — phases/attack.js) · ภาพสกิลอยู่ใน characters.js (ภาพตอนเช้าของโอเบรอนตัวเก่า)
const IMG = { base: `${DIR}/oberon_summer.webp` };
const SOUND = { basic: "oberon_summer_skill1", secondary: "oberon_summer_skill2", ultimate: "oberon_summer_skill3" };

const VEIL_ATK = 1;
const VEIL_TURNS = 3;
const VEIL_HEAL = 1;
const LARK_HEAL = 5;
const LARK_RESIST_TURNS = 2;
const LARK_DRAIN = 2;
// เครื่องหมายนกจาบ: ลูปลดเทิร์นของ endTurn ลดเหลือ 1 → ต้นเทิร์นถัดไป (onRoundStartTick) เห็น > 0 แล้วลงผล
const LARK_MARK_TURNS = 2;
const DREAM_ATK = 4;
const DREAM_STUN_TURNS = 3;
const DREAM_COOLDOWN = 5;

const isOberon = (p) => !!p && p.characterId === ID;

// ผู้รับม่านแห่งราตรี "ทุกคนในรัศมี" — ids = ผู้ที่อยู่ในรัศมี (server/skills.js resolveArea ส่งมาเป็น array เสมอ)
//  โหมดทีม = เฉพาะตัวเอง + เพื่อนร่วมทีม · ffa = ทุกคนในรัศมี · ไม่มีรายชื่อ = ตัวเองคนเดียว (ไม่แจกทั้งสนาม)
function veilRecipients(engine, src, ids) {
  const teamish = engine.teamModeActive();
  const inArea = new Set(Array.isArray(ids) ? ids : [src.id]);
  return engine.alivePlayers().filter((o) => inArea.has(o.id) && (!teamish || o.id === src.id || engine.isAlly(src, o)));
}
function pickTarget(engine, targets) {
  const t = engine.players[Array.isArray(targets) ? targets[0] : null];
  return t && t.alive ? t : null;
}

module.exports = {
  id: ID,
  IMG, SOUND,
  VEIL_ATK, VEIL_TURNS, VEIL_HEAL, LARK_HEAL, LARK_RESIST_TURNS, LARK_DRAIN, LARK_MARK_TURNS, DREAM_ATK, DREAM_STUN_TURNS, DREAM_COOLDOWN,

  resetCombat(p) {
    p.obsVeilUntil = 0;     // ม่านแห่งราตรี: กดได้อีกเมื่อ roundNumber >= ค่านี้ (ผลบนตัวผู้เล่นหมดแล้ว)
    p.obsLarkRound = 0;     // นกจาบยามเช้า: เทิร์นที่กดล่าสุด (กดได้ 1 ครั้ง/เทิร์น)
    p.obsUltReady = 0;      // จุดจบของความฝัน: กดได้อีกเมื่อ roundNumber >= ค่านี้
    p.obsDreamUseRound = 0;    // ที่ตัวเป้าหมาย: เทิร์นที่ได้ใช้บัฟ +4 — จบเทิร์นนั้นติดสตั้น 3 เทิร์น
  },

  // พลังโจมตีจากท่าของโอเบรอน (ungated — อ่านที่ computeAttackBase ใครติดก็ได้)
  atkBonus(p) {
    if (!p || !p.statuses) return 0;
    return ((p.statuses.obsVeil || 0) > 0 ? VEIL_ATK : 0) + ((p.statuses.obsDream || 0) > 0 ? DREAM_ATK : 0);
  },
  atkFx(p) {
    if (!p || !p.statuses) return [];
    const out = [];
    if ((p.statuses.obsVeil || 0) > 0) out.push(`ม่านแห่งราตรี +${VEIL_ATK}`);
    if ((p.statuses.obsDream || 0) > 0) out.push(`จุดจบของความฝัน +${DREAM_ATK}`);
    return out;
  },

  // ---------- ด่านก่อนหักแต้ม ----------
  canUseSkill(engine, p, tier, targets) {
    const round = engine.roundNumber;
    if (tier === "basic") return round >= (p.obsVeilUntil || 0);
    if (tier === "secondary") return p.obsLarkRound !== round && !!pickTarget(engine, targets);
    if (tier === "ultimate") return round >= (p.obsUltReady || 0) && !!pickTarget(engine, targets);
    return true;
  },
  // นกจาบยามเช้าไม่กินโควตาสกิลของเทิร์น (กดแล้วยังกดท่าอื่นได้อีก 1 ครั้ง)
  //  (ฮุคถูกเรียกผ่าน CHAR_HOOKS[p.characterId] จึงเป็นโอเบรอนเสมอ ไม่ต้องเช็คตัวละครซ้ำ)
  skipsTurnQuota(p, tier) { return tier === "secondary"; },
  skillSound(p, tier) { return SOUND[tier] || null; },

  // ---------- ลงผล ----------
  applyInstantSkill(engine, p, tier, targets) {
    const round = engine.roundNumber;
    if (tier === "basic") {
      p.obsVeilUntil = round + VEIL_TURNS;
      const list = veilRecipients(engine, p, targets);
      for (const o of list) {
        engine.applyBuff(o, "obsVeil", VEIL_ATK, VEIL_TURNS);
        engine.healHp(o, VEIL_HEAL);
      }
      engine.log(`🌙 ${p.name} ม่านแห่งราตรี — ${list.length} คน พลังโจมตี +${VEIL_ATK} (${VEIL_TURNS} เทิร์น) และฟื้นพลังชีวิต +${VEIL_HEAL}`);
      return "";
    }
    if (tier === "secondary") {
      const t = pickTarget(engine, targets);
      if (!t) return ""; // canUseSkill กันไว้แล้ว — กันพังเผื่อเป้าหายระหว่างทาง
      p.obsLarkRound = round;
      const healed = engine.healHp(t, LARK_HEAL);
      engine.applyBuff(t, "resist", 1, LARK_RESIST_TURNS);
      const cleansed = engine.cleanseLatestDebuff(t);
      t.statuses.obsLark = LARK_MARK_TURNS;
      engine.log(`🐦 ${p.name} นกจาบยามเช้า → ${t.name} ฟื้นพลังชีวิต +${healed} · ต้านสถานะผิดปกติ ${LARK_RESIST_TURNS} เทิร์น${cleansed ? " · ล้างสถานะผิดปกติที่โดนล่าสุด 1 อย่าง" : ""} (ต้นเทิร์นหน้าเสียพลังชีวิต ${LARK_DRAIN} ทะลุเกราะ)`);
      return ` → ${t.name}`;
    }
    if (tier === "ultimate") {
      const t = pickTarget(engine, targets);
      if (!t) return ""; // canUseSkill กันไว้แล้ว — กันพังเผื่อเป้าหายระหว่างทาง
      p.obsUltReady = round + DREAM_COOLDOWN;
      // เป้าเดินไปแล้วในเทิร์นนี้ = ได้ใช้บัฟในตาเดินของเทิร์นหน้า (บัฟอยู่ 2 เทิร์น) · ยังไม่เดิน/ตัวเอง = เทิร์นนี้
      const later = engine.hasActed(t.id);
      t.obsDreamUseRound = later ? round + 1 : round;
      engine.applyBuff(t, "obsDream", DREAM_ATK, later ? 2 : 1);
      engine.log(`💤 ${p.name} จุดจบของความฝัน → ${t.name} พลังโจมตี +${DREAM_ATK} ${later ? "ในตาเดินเทิร์นหน้า" : "ตาเดินนี้"} — จากนั้นจะติดสตั้น ${DREAM_STUN_TURNS} เทิร์น`);
      return ` → ${t.name}`;
    }
    return "";
  },

  // ---------- ต้นเทิร์น (ในลูปต่อผู้เล่นของ dealRound — ลงผลกับตัวเองเท่านั้น) ----------
  onRoundStartTick(engine, p) {
    if (!p.alive || !((p.statuses.obsLark || 0) > 0)) return;
    delete p.statuses.obsLark;
    // ไม่ผูก effectSource: ผลเสียของท่าต้องลงเพื่อนร่วมทีมได้ด้วย (friendlyEffectBlocked จะกันทิ้งถ้ามีต้นตอ)
    p._statusDamage = true;
    engine.dealDirect(p, LARK_DRAIN);
    p._statusDamage = false;
    engine.log(`🐦 ${p.name} ผลของนกจาบยามเช้า — เสียพลังชีวิต ${LARK_DRAIN} (ทะลุเกราะ)`);
    if (p.alive && p.hp <= 0) {
      engine.instantDeath(p);
      if (!p.alive) engine.log(`💀 ${p.name} ตกรอบ!`);
    }
  },

  // ---------- จบเทิร์น (หลังลูปลดเทิร์นสถานะ — สตั้นที่ติดตรงนี้จึงเต็ม 3 เทิร์นถัดไป) ----------
  onEndTurn(engine) {
    for (const t of Object.values(engine.players)) {
      if (!t.obsDreamUseRound || t.obsDreamUseRound !== engine.roundNumber) continue;
      t.obsDreamUseRound = 0;
      delete t.statuses.obsDream; // ตาเดินที่ได้ใช้บัฟผ่านไปแล้ว
      if (!t.alive) continue;
      if (engine.applyDebuff(t, "stun", null, DREAM_STUN_TURNS)) engine.log(`💤 ${t.name} ความฝันจบลง — ติดสตั้น ${DREAM_STUN_TURNS} เทิร์น`);
      else engine.log(`💤 ${t.name} ต้านทานสตั้นจากจุดจบของความฝันได้ (ต้านสถานะผิดปกติ)`);
    }
    // สกิลติดตัว หน้าไหว้หลังหลอก: ไม่ถูกโจมตีปกติในเทิร์นนี้ -> แต้มสกิล +1 และเหรียญ +1
    for (const p of engine.alivePlayers()) {
      if (!isOberon(p) || p.wasAttacked) continue;
      engine.addSkill(p, 1, "passive");
      engine.addGold(p, 1);
      engine.log(`🎭 ${p.name} หน้าไหว้หลังหลอก — ไม่ถูกโจมตีเลยเทิร์นนี้ ได้แต้มสกิล +1 และเหรียญ +1`);
    }
  },

  // ---------- ข้อมูลให้ client: ปุ่มล็อก/คูลดาวน์รายช่อง ----------
  skillLocks(engine, p) {
    const round = engine.roundNumber;
    return {
      basic: { cd: Math.max(0, (p.obsVeilUntil || 0) - round) },
      secondary: { locked: p.obsLarkRound === round },
      ultimate: { cd: Math.max(0, (p.obsUltReady || 0) - round) },
    };
  },
};
