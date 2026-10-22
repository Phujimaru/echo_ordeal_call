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
//
//  ใส่ซ้ำคนเดิม (โอเบรอนหลายคน หรือท่าเดิมลงซ้ำ) = "ทุกครั้งนับ" ผลเกิดเท่าจำนวนครั้ง ไม่เขียนทับกัน
//    เก็บรายครั้งไว้ที่ตัวเป้า: t.obsVeilStack (เทิร์นที่เหลือของม่านแต่ละครั้ง) · t.obsLarkStack (จำนวนเครื่องหมายนกจาบที่รอลงผล)
//    · t.obsDreamQueue (เทิร์นที่ได้ใช้บัฟของความฝันแต่ละครั้ง) — statuses/statusAmt ยังเป็นตัวที่ client อ่าน (เทิร์นที่เหลือ / ผลรวม)
//    ม่าน 2 ครั้ง = +2 · นกจาบ 2 ครั้ง = ต้นเทิร์นเสีย 2 + 2 · ความฝัน 2 ครั้ง = +8 และถ้าจบพร้อมกัน สตั้น 3 + 3 เทิร์น
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
// จำนวนครั้งที่ยังมีผลอยู่ (อย่างน้อย 1 เมื่อสถานะติดอยู่ — สถานะที่ตั้งตรงๆ โดยไม่มีรายการครั้ง ยังนับเป็น 1 ครั้ง)
const castsOf = (list) => Math.max(1, Array.isArray(list) ? list.length : 0);
const veilAtkOf = (p) => ((p.statuses.obsVeil || 0) > 0 ? VEIL_ATK * castsOf(p.obsVeilStack) : 0);
const dreamAtkOf = (p) => ((p.statuses.obsDream || 0) > 0 ? DREAM_ATK * castsOf(p.obsDreamQueue) : 0);

// ตัดผลสกิล: ถอดม่านครั้งของตัวเองออก (รายครั้งที่เหลือเทิร์นเท่ากับครั้งนั้น) — ไม่เหลือครั้งไหน = สถานะหาย
function cutSelfVeil(engine, p) {
  const veil = p.obsSelfVeil;
  p.obsSelfVeil = null;
  const left = veil ? veil.until - engine.roundNumber + 1 : 0;
  const stack = Array.isArray(p.obsVeilStack) ? [...p.obsVeilStack] : [];
  let i = stack.indexOf(left);
  if (i < 0 && stack.length) i = stack.length - 1;
  if (i >= 0) stack.splice(i, 1);
  p.obsVeilStack = stack;
  if (stack.length) {
    p.statuses.obsVeil = Math.max(...stack);
    p.statusAmt.obsVeil = VEIL_ATK * stack.length;
  } else {
    delete p.statuses.obsVeil;
    if (p.statusAmt) delete p.statusAmt.obsVeil;
  }
}
// ตัดผลสกิล: ถอดความฝันครั้งของตัวเองออกจากคิว (+4 หาย · สตั้นของครั้งนั้นไม่ลง) — ไม่เหลือครั้งไหน = สถานะหาย
function cutSelfDream(p) {
  const dream = p.obsSelfDream;
  p.obsSelfDream = null;
  const queue = Array.isArray(p.obsDreamQueue) ? [...p.obsDreamQueue] : [];
  const i = dream ? queue.indexOf(dream.useRound) : -1;
  if (i >= 0) queue.splice(i, 1);
  p.obsDreamQueue = queue;
  p.obsDreamUseRound = queue.length ? Math.min(...queue) : 0;
  if (queue.length) p.statusAmt.obsDream = DREAM_ATK * queue.length;
  else { delete p.statuses.obsDream; if (p.statusAmt) delete p.statusAmt.obsDream; }
}

module.exports = {
  id: ID,
  IMG, SOUND,
  VEIL_ATK, VEIL_TURNS, VEIL_HEAL, LARK_HEAL, LARK_RESIST_TURNS, LARK_DRAIN, LARK_MARK_TURNS, DREAM_ATK, DREAM_STUN_TURNS, DREAM_COOLDOWN,

  resetCombat(p) {
    p.obsVeilUntil = 0;     // ม่านแห่งราตรี: กดได้อีกเมื่อ roundNumber >= ค่านี้ (ผลบนตัวผู้เล่นหมดแล้ว)
    p.obsLarkRound = 0;     // นกจาบยามเช้า: เทิร์นที่กดล่าสุด (กดได้ 1 ครั้ง/เทิร์น)
    p.obsUltReady = 0;      // จุดจบของความฝัน: กดได้อีกเมื่อ roundNumber >= ค่านี้
    p.obsDreamUseRound = 0;    // ที่ตัวเป้าหมาย: เทิร์นที่ได้ใช้บัฟ +4 ที่ใกล้ที่สุด (สรุปจาก obsDreamQueue) — จบเทิร์นนั้นติดสตั้น 3 เทิร์น
    // ที่ตัวเป้าหมาย — รายครั้ง (ทุกครั้งนับ):
    p.obsVeilStack = [];    // ม่านแห่งราตรี: เทิร์นที่เหลือของแต่ละครั้ง (+1 ต่อครั้ง)
    p.obsLarkStack = 0;     // นกจาบยามเช้า: จำนวนเครื่องหมายที่รอลงผลต้นเทิร์นหน้า (เสีย 2 ต่อครั้ง)
    p.obsDreamQueue = [];   // จุดจบของความฝัน: เทิร์นที่ได้ใช้บัฟของแต่ละครั้ง (+4 ต่อครั้ง · สตั้น 3 ต่อครั้ง)
    // ผลสกิลของโอเบรอนที่ลงตัวเอง (ตัดผลสกิล server/sever.js — รากฐานจิตของเรียวกิ) · at = engine.severStamp()
    p.obsSelfVeil = null;   // ม่านแห่งราตรีที่ตัวเองร่ายใส่ตัวเอง: { at, until } (until = เทิร์นสุดท้ายที่มีผล)
    p.obsSelfDream = null;  // จุดจบของความฝันที่ตัวเองใช้กับตัวเอง: { at, useRound } (รายการใน obsDreamQueue)
  },

  // พลังโจมตีจากท่าของโอเบรอน (ungated — อ่านที่ computeAttackBase ใครติดก็ได้)
  atkBonus(p) {
    if (!p || !p.statuses) return 0;
    return veilAtkOf(p) + dreamAtkOf(p);
  },
  atkFx(p) {
    if (!p || !p.statuses) return [];
    const out = [];
    const veil = veilAtkOf(p);
    const dream = dreamAtkOf(p);
    if (veil > 0) out.push(`ม่านแห่งราตรี +${veil}`);
    if (dream > 0) out.push(`จุดจบของความฝัน +${dream}`);
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
        // ทุกครั้งนับ: ม่านจากโอเบรอนอีกคนที่ยังอยู่ ซ้อนเป็น +1 ต่อครั้ง (แต่ละครั้งหมดอายุของมันเอง)
        const live = (o.statuses.obsVeil || 0) > 0 ? (o.obsVeilStack || []) : [];
        engine.applyBuff(o, "obsVeil", VEIL_ATK, VEIL_TURNS);
        o.obsVeilStack = [...live, VEIL_TURNS];
        o.statusAmt.obsVeil = VEIL_ATK * o.obsVeilStack.length;
        engine.healHp(o, VEIL_HEAL);
        if (o.id === p.id) p.obsSelfVeil = { at: engine.severStamp(), until: round + VEIL_TURNS - 1 };
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
      // ทุกครั้งนับ: เครื่องหมายที่ยังรอลงผลไม่ถูกเขียนทับ — ต้นเทิร์นหน้าเสีย 2 ต่อเครื่องหมาย
      //  (statuses.obsLark = เทิร์นที่เหลือ ให้ client โชว์ป้ายเหมือนเดิม · จำนวนครั้งอยู่ที่ t.obsLarkStack)
      t.obsLarkStack = ((t.statuses.obsLark || 0) > 0 ? Math.max(1, t.obsLarkStack || 0) : 0) + 1;
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
      // ทุกครั้งนับ: ความฝันจากอีกครั้งที่ยังค้างไม่ถูกเขียนทับ — แต่ละครั้งมีเทิร์นใช้บัฟ/สตั้นของตัวเอง
      t.obsDreamQueue = [...(t.obsDreamQueue || []), later ? round + 1 : round];
      if (t.id === p.id) p.obsSelfDream = { at: engine.severStamp(), useRound: later ? round + 1 : round };
      t.obsDreamUseRound = Math.min(...t.obsDreamQueue);
      engine.applyBuff(t, "obsDream", DREAM_ATK, later ? 2 : 1);
      t.statusAmt.obsDream = DREAM_ATK * t.obsDreamQueue.length;
      engine.log(`💤 ${p.name} จุดจบของความฝัน → ${t.name} พลังโจมตี +${DREAM_ATK} ${later ? "ในตาเดินเทิร์นหน้า" : "ตาเดินนี้"} — จากนั้นจะติดสตั้น ${DREAM_STUN_TURNS} เทิร์น`);
      return ` → ${t.name}`;
    }
    return "";
  },

  // ---------- ต้นเทิร์น (ในลูปต่อผู้เล่นของ dealRound — ลงผลกับตัวเองเท่านั้น) ----------
  onRoundStartTick(engine, p) {
    if (!p.alive || !((p.statuses.obsLark || 0) > 0)) return;
    delete p.statuses.obsLark;
    // ทุกครั้งนับ: ลงผลแยกทีละเครื่องหมาย (2 ครั้ง = เสีย 2 + 2)
    const marks = Math.max(1, p.obsLarkStack || 0);
    p.obsLarkStack = 0;
    // ไม่ผูก effectSource: ผลเสียของท่าต้องลงเพื่อนร่วมทีมได้ด้วย (friendlyEffectBlocked จะกันทิ้งถ้ามีต้นตอ)
    p._statusDamage = true;
    for (let i = 0; i < marks; i++) {
      if (i > 0 && p.hp <= 0) break; // ตายจากครั้งก่อนแล้ว
      engine.dealDirect(p, LARK_DRAIN);
    }
    p._statusDamage = false;
    engine.log(`🐦 ${p.name} ผลของนกจาบยามเช้า — เสียพลังชีวิต ${marks > 1 ? `${LARK_DRAIN} × ${marks}` : LARK_DRAIN} (ทะลุเกราะ)`);
    if (p.alive && p.hp <= 0) {
      engine.instantDeath(p);
      if (!p.alive) engine.log(`💀 ${p.name} ตกรอบ!`);
    }
  },

  // ---------- จบเทิร์น (หลังลูปลดเทิร์นสถานะ — สตั้นที่ติดตรงนี้จึงเต็ม 3 เทิร์นถัดไป) ----------
  onEndTurn(engine) {
    const round = engine.roundNumber;
    for (const t of Object.values(engine.players)) {
      // ม่านแห่งราตรี: นับเทิร์นที่เหลือรายครั้งให้ตรงกับลูปลดเทิร์นสถานะ (ครั้งที่หมดแล้วเลิกนับ +1)
      if (Array.isArray(t.obsVeilStack) && t.obsVeilStack.length) {
        t.obsVeilStack = t.obsVeilStack.map((n) => n - 1).filter((n) => n > 0);
        if ((t.statuses.obsVeil || 0) > 0 && t.obsVeilStack.length) t.statusAmt.obsVeil = VEIL_ATK * t.obsVeilStack.length;
      }
      // จุดจบของความฝัน: ทุกครั้งที่ถึงเทิร์นใช้บัฟลงผลพร้อมกัน — สตั้นรวม 3 ต่อครั้ง · ครั้งที่ยังไม่ถึงค้างไว้ต่อ
      const queue = Array.isArray(t.obsDreamQueue) && t.obsDreamQueue.length ? t.obsDreamQueue
        : (t.obsDreamUseRound ? [t.obsDreamUseRound] : []);
      const due = queue.filter((r) => r <= round).length;
      if (!due) continue;
      t.obsDreamQueue = queue.filter((r) => r > round);
      t.obsDreamUseRound = t.obsDreamQueue.length ? Math.min(...t.obsDreamQueue) : 0;
      if (t.obsDreamQueue.length) t.statusAmt.obsDream = DREAM_ATK * t.obsDreamQueue.length;
      else { delete t.statuses.obsDream; if (t.statusAmt) delete t.statusAmt.obsDream; } // ตาเดินที่ได้ใช้บัฟผ่านไปแล้ว
      if (!t.alive) continue;
      // สตั้นซ้อน = บวกต่อจากเทิร์นที่ยังเหลือ (ผู้ใช้ตัดสิน — ไม่รีเซ็ตกลับเป็น 3)
      const stun = DREAM_STUN_TURNS * due;
      const left = t.statuses.stun || 0;
      if (engine.applyDebuff(t, "stun", null, left + stun)) engine.log(`💤 ${t.name} ความฝันจบลง — ติดสตั้น ${stun} เทิร์น${left ? ` (รวม ${left + stun})` : ""}`);
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

  // ---------- ตัดผลสกิล (server/sever.js — รากฐานจิตของเรียวกิ) ----------
  //  เฉพาะผลจากท่าของโอเบรอนเองที่ลงตัวเอง (ม่าน/ความฝันจากโอเบรอนคนอื่นไม่ใช่ผลสกิลของเขา · นกจาบ = ผลเสียที่รอลง ไม่นับ)
  //  ม่านแห่งราตรี: ถอดเฉพาะครั้งของตัวเองออกจากรายครั้ง · คูลดาวน์ (obsVeilUntil) เดินต่อตามปกติ
  //  จุดจบของความฝัน: ถอดครั้งของตัวเองออกจากคิว = เสียพลังโจมตี +4 และสตั้นที่รอลงของครั้งนั้นไม่เกิด (ตัดจบก่อนทำงาน)
  //   · คูลดาวน์ (obsUltReady) เดินต่อตามปกติ
  severables(engine, p) {
    if (!isOberon(p) || !p.statuses) return [];
    const round = engine.roundNumber;
    const out = [];
    const veil = p.obsSelfVeil;
    if (veil && round <= veil.until && (p.statuses.obsVeil || 0) > 0) {
      out.push({ key: "obsVeil", label: "ม่านแห่งราตรี", at: veil.at || 0, cancel() { cutSelfVeil(engine, p); } });
    }
    const dream = p.obsSelfDream;
    if (dream && (p.statuses.obsDream || 0) > 0 && (p.obsDreamQueue || []).includes(dream.useRound)) {
      out.push({ key: "obsDream", label: "จุดจบของความฝัน", at: dream.at || 0, cancel() { cutSelfDream(p); } });
    }
    return out;
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
