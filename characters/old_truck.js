// ============================================================
//  รถบรรทุกเก่า → รถบรรทุก ⇄ ออพติมัส ไพร์ม (Transformers ภาค 4–5) — ระดับปานกลาง · id "old_truck"
//
//  ค่าพื้นฐาน (สเปกไม่ระบุ → ค่าเริ่มต้น): พลังชีวิต 7 / เกราะ 3 / พลังโจมตี 1 · ตีประชิด [1, 1]
//  ร่าง (p.oldTruck.form):
//    "old"   รถบรรทุกเก่า (ร่างพราง — เริ่มเกม) ระยะเดิน 6 · มีแค่ปุ่ม ร่างที่แท้จริง · ไม่มีสกิลติดตัว
//    "truck" รถบรรทุก ระยะเดิน 5 · มีแค่ปุ่ม เปลี่ยนร่าง · จบเทิร์นในร่างนี้ครบ 3 เทิร์น ฟื้นพลังชีวิต 2 (ร่างออพติมัสหยุดนับ ไม่รีเซ็ต)
//    "prime" ออพติมัส ไพร์ม ระยะเดิน 4 · พลังโจมตี +1 · เปลี่ยนร่าง + ผู้พิทักษ์ + ท่าไม้ตาย
//    ร่างที่ไม่ใช่ออพติมัสใช้สกิลรอง/ท่าไม้ตายไม่ได้เลย และไม่มีปุ่ม (ฮุค skillHidden — ผู้ใช้สั่ง 2026-11-03)
//  สกิลพื้นฐาน1 ร่างที่แท้จริง (0): ลอกคราบรถเก่าเป็นรถบรรทุก (ทางเดียว) — คลิป optimus_new_car
//  สกิลพื้นฐาน2 เปลี่ยนร่าง (0): สลับรถบรรทุก ⇄ ออพติมัส ไพร์ม 1 ครั้งต่อเทิร์น — คลิปแปลงร่างครั้งแรกต่อเกม
//    ทั้งสองปุ่ม: ไม่นับโควตาสกิล · ยังไม่ได้เดิน = ยังเดินได้ด้วยระยะของร่างใหม่ (keepsMove) · ไม่นับเป็น "ใช้สกิล" ของสกิลติดตัว
//  สกิลรอง ผู้พิทักษ์ (4 · คูลดาวน์ 3 เทิร์นเฉพาะตอนได้สวน): ตั้งท่าจนถึงต้นตาเดินถัดไปของตัวเอง
//    ถูกตีปกติ (ไม่รวมสกิล) ระยะเท่าไรก็ได้ = ฟันสวน 1 ครั้ง ความเสียหายตายตัว 2 (เกราะรับก่อน · หลบได้ · ไม่คริ)
//    + เลือดไหล 2 เทิร์น (ต้านได้) · ผู้ตีไม่ถอย (counterPush) · ไม่ได้สวน = เสียแต้มเฉยๆ ไม่ติดคูลดาวน์ · กลับเป็นรถ = ท่าหาย
//    กลไกตีสวนกลางของเกม (attack.counterAndPush): ฮุค counters / counterAnyRange / fixedStrikeDamage({ counter })
//  ท่าไม้ตาย ข้าคือ...ออพติมัส ไพร์ม (6): เลือกทิศ ครึ่งวง 180° รัศมี 2 (8 ช่อง — area line arc 2)
//    ศัตรู 1 คน = 4 · คนที่ 2 ขึ้นไป +1 ต่อคน · สูงสุด 6 (ผู้ใช้แก้ 2026-11-03) ทุกคนโดนเท่ากัน · เกราะรับก่อน · หลบได้ · ไม่จบตาเดิน
//  สกิลติดตัว ไพร์ม (ร่างรถบรรทุก/ออพติมัส): ตีปกติ · สวนกลับ · ท่าไม้ตาย ที่โดนจริง มีโอกาส 30% ฟื้นพลังชีวิต 1–2 (ทอยครั้งเดียวต่อท่า)
//    ใช้สกิลรอง/ท่าไม้ตาย/ไอเทม → ตีปกติคริติคอล +25% จนจบเทิร์น (ไม่ทบ)
//  คลิปทุกตัวเล่นครั้งแรกต่อเกมเท่านั้น (ผู้ใช้สั่ง "วีดีโอต่างๆให้เล่นครั้งเดียว") · ครั้งต่อไป = เสียง + เอฟเฟกต์บนกระดาน
//  ไฟล์จากผู้ใช้ (Downloads/optimus — 2026-11-03) · ตัวหมากรถ = ภาพรถตัดพื้นหลัง (หมากนั่งบนรถแบบม้าของไจโร — optimusFx.js)
//  เสียง Mixkit ฟรี (ผู้ใช้อนุญาตให้โหลด) — .claude/plans/old-truck-sfx.sh
// ============================================================

const ID = "old_truck";
const DIR = "/characters/old_truck";
const IMG = {
  old: `${DIR}/old_truck.webp`,
  truck: `${DIR}/truck.webp`,
  prime: `${DIR}/optimus.webp`,
  oldToken: `${DIR}/old_truck_token.webp`,
  truckToken: `${DIR}/truck_token.webp`,
  trueForm: `${DIR}/skill1.webp`,
  toPrime: `${DIR}/skill1_2.webp`,
  toTruck: `${DIR}/skill1_2_car.webp`,
  skill2: `${DIR}/skill2.webp`,
  skill3: `${DIR}/skill3.webp`,
};
const VIDEO = {
  trueForm: `${DIR}/optimus_new_car.mp4`,
  transform: `${DIR}/optimus_transform.mp4`,
  guardian: `${DIR}/optimus_skill2.mp4`,
  ult: `${DIR}/optimus_skill3.mp4`,
};
const CUT = { trueForm: "otTrueForm", transform: "otTransform", guardian: "otGuardian", ult: "otUlt" };
// คีย์ใน client/src/audio.js (ไฟล์ client/public/characters/old_truck/sfx/)
const SFX = {
  slash: "ot_slash",         // ตีปกติออพติมัส (ดาบ)
  ram: "ot_ram",             // ตีปกติร่างรถ (แตร + ชน)
  counter: "ot_counter",     // ฟันสวน
  transform: "ot_transform", // แปลงร่างหลังเล่นคลิปไปแล้ว
  stance: "ot_stance",       // ตั้งท่าผู้พิทักษ์ (คลิปเล่นตอนสวนจริง)
  ult: "ot_ult",             // คลื่นครึ่งวง (เล่นตอนคลื่นออก)
  heal: "ot_heal",           // ฟื้นพลังชีวิต (ไพร์ม / รถบรรทุกครบ 3 เทิร์น)
};

const NAME = { old: "รถบรรทุกเก่า", truck: "รถบรรทุก", prime: "ออพติมัส ไพร์ม" };
const MOV = { old: 6, truck: 5, prime: 4 };
const PRIME_ATK = 1;
const REGEN_TURNS = 3;
const REGEN_HP = 2;
const TRUE_HP = 2;    // ร่างที่แท้จริง: ฟื้นพลังชีวิต
const TRUE_ARMOR = 1; // ร่างที่แท้จริง: ฟื้นเกราะ
const COUNTER_DMG = 2;
const COUNTER_BLEED = 2;
const GUARD_CD = 3;
const ULT_ARC = 2;
const ULT_BASE = 4;
const ULT_MAX = 6;
const HEAL_PCT = 30;
const CRIT_PCT = 25;
// จังหวะบนกระดาน (ต้องตรงกับ client/src/board/optimusFx.js — OT_ARC_MS / OT_ARC_HIT)
const ULT_HIT_SECONDS = 0.45;
const ULT_REST_SECONDS = 0.75;

const isTruck = (p) => !!p && p.characterId === ID && !p.summon;
function fresh() {
  return {
    form: "old",
    swapRound: 0,   // เทิร์นที่เปลี่ยนร่างล่าสุด (1 ครั้งต่อเทิร์น)
    formAt: 0,      // engine.severStamp ตอนเข้าร่างออพติมัส (ตัดผลสกิล)
    regen: 0,       // เทิร์นที่จบในร่างรถบรรทุก (ครบ 3 = ฟื้น)
    stance: false,  // ท่าผู้พิทักษ์
    stanceRound: 0, // เทิร์นที่ตั้งท่า (ต้นตาเดินถัดไป = หมด)
    stanceAt: 0,
    guardReady: 0,  // ใช้ผู้พิทักษ์ได้อีกตั้งแต่เทิร์นนี้ (0 = ได้)
    crit: false,    // คริ +25% ถึงจบเทิร์นนี้ (onEndTurn ล้าง)
    countering: false, // กำลังฟันสวน (counterAnyRange ตั้ง → ดาเมจ/ท่าตี/เสียง → onStrikeResolved ล้าง)
    clipNow: false, // ปุ่มที่เพิ่งกดเล่นคลิป (skillSound ไม่ซ้อนเสียง)
  };
}
function st(p) { return p.oldTruck || (p.oldTruck = fresh()); }
const formOf = (p) => (isTruck(p) ? st(p).form : null);
const primeOn = (p) => formOf(p) === "prime";
const awake = (p) => isTruck(p) && st(p).form !== "old"; // สกิลติดตัวไพร์มทำงาน
const guardCd = (engine, p) => Math.max(0, (st(p).guardReady || 0) - engine.roundNumber);

// คลิปครั้งแรกต่อเกม → true = คิวแล้ว
function clipOnce(engine, p, key) {
  p.cutsceneShown ||= {};
  if (p.cutsceneShown[key]) return false;
  p.cutsceneShown[key] = true;
  engine.queueCutscene(p, key);
  return true;
}
function fx(engine, p, kind, extra = {}) {
  if (!p.pos) return;
  engine.boardFx("optimusFx", { kind, id: p.id, at: { ...p.pos }, color: engine.colorOf(p), ...extra });
}

// ไพร์ม: โอกาส 30% ฟื้นพลังชีวิต 1–2 → ข้อความป้าย | null
function primeHeal(engine, p) {
  if (!awake(p) || !p.alive || Math.random() * 100 >= HEAL_PCT) return null;
  const want = Math.random() < 0.5 ? 1 : 2;
  const healed = engine.healHp(p, want);
  if (!(healed > 0)) return null;
  engine.log(`💠 ${p.name} ไพร์ม — ฟื้นพลังชีวิต +${healed}`);
  engine.sfx(SFX.heal);
  fx(engine, p, "heal", { n: healed });
  return `ไพร์ม — ฟื้นพลังชีวิต +${healed}`;
}
function primeCrit(p) {
  if (awake(p)) st(p).crit = true;
}

function setForm(engine, p, form) {
  const s = st(p);
  if (s.form === "prime" && form !== "prime") s.stance = false; // กลับเป็นรถ = ท่าผู้พิทักษ์หาย
  s.form = form;
  if (form === "prime") s.formAt = engine.severStamp();
}

// ---------- ท่าไม้ตาย: คลื่นครึ่งวง ----------
const enemiesIn = (engine, p, ids) => (ids || []).map((id) => engine.players[id])
  .filter((t) => t && t.alive && t.id !== p.id && !engine.sameTeam(p, t));
function ultDamage(n) { return n > 0 ? Math.min(ULT_MAX, ULT_BASE + (n - 1)) : 0; }
function ultWave(engine, p, targets, dir, tiles) {
  fx(engine, p, "arc", { dir, tiles });
  engine.sfx(SFX.ult);
  const list = enemiesIn(engine, p, targets);
  const dmg = ultDamage(list.length);
  if (!list.length) { engine.skillBeat(ULT_HIT_SECONDS + ULT_REST_SECONDS, () => {}); return; }
  engine.skillBeat(ULT_HIT_SECONDS, () => {
    let hits = 0;
    engine.withEffectSource(p, () => {
      for (const t of list) {
        if (!t.alive) continue;
        t.wasAttacked = true;
        if (engine.skillDodge(p, t, "คลื่นของออพติมัส ไพร์ม")) continue;
        const before = (t.hp || 0) + (t.armor || 0);
        engine.dealMixed(t, dmg);
        if (t.alive && t.hp <= 0) engine.instantDeath(t);
        const dealt = Math.max(0, before - ((t.hp || 0) + (t.armor || 0)));
        engine.log(`⚔️ ข้าคือ...ออพติมัส ไพร์ม → ${t.name} -${dealt} (ลดเกราะก่อน)`);
        hits++;
        if (!t.alive) { t.pos = null; engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`); }
      }
    });
    if (hits) primeHeal(engine, p);
    engine.skillBeat(ULT_REST_SECONDS, () => {});
  });
}

module.exports = {
  id: ID,
  IMG, VIDEO, CUT, SFX, NAME, MOV, PRIME_ATK, REGEN_TURNS, REGEN_HP, COUNTER_DMG, COUNTER_BLEED, GUARD_CD,
  ULT_ARC, ULT_BASE, ULT_MAX, HEAL_PCT, CRIT_PCT,
  isTruck, formOf, ultDamage,

  resetCombat(p) { p.oldTruck = isTruck(p) ? fresh() : null; },

  // ---------- ร่าง: ชื่อ / ปก / ตัวหมาก / ระยะเดิน ----------
  characterPub(engine, p) {
    if (!isTruck(p)) return null;
    const f = st(p).form;
    return { name: NAME[f], img: IMG[f], ...(f === "old" ? { passive: null } : {}) };
  },
  displayImg(p) {
    const f = formOf(p);
    return f === "truck" ? IMG.truck : f === "prime" ? IMG.prime : f === "old" ? IMG.old : null;
  },
  mov(p) { return isTruck(p) ? MOV[st(p).form] : null; },

  // ---------- ตีปกติ ----------
  damageBonus(engine, attacker, target, ctx) {
    if (!primeOn(attacker)) return 0;
    ctx.otPrime = PRIME_ATK;
    return PRIME_ATK;
  },
  attackFxNames(attacker, atkCtx) { return atkCtx && atkCtx.otPrime && !st(attacker).countering ? [`ออพติมัส ไพร์ม +${atkCtx.otPrime}`] : []; },
  critPct(p) { return awake(p) && !st(p).countering && st(p).crit ? CRIT_PCT : 0; },
  attackStyle(p) {
    if (!isTruck(p)) return null;
    const s = st(p);
    if (s.countering) return "otCounter";
    return s.form === "prime" ? "otSlash" : "otRam";
  },
  attackSound(p) {
    if (!isTruck(p)) return undefined;
    const s = st(p);
    if (s.countering) return SFX.counter;
    return s.form === "prime" ? SFX.slash : SFX.ram;
  },
  // ตีปกติ/สวนกลับที่โดน → ไพร์มฟื้นเลือด (ป้ายต่อท้ายฉากตีของจังหวะนั้น) · สวนเสร็จ = ท่าหมด + คูลดาวน์
  onStrikeResolved(engine, attacker, target, res, { counter } = {}) {
    if (!isTruck(attacker)) return;
    const s = st(attacker);
    if (counter && s.countering) {
      s.countering = false;
      s.stance = false;
      s.guardReady = engine.roundNumber + GUARD_CD + 1;
    }
    if (res && !res.dodge) {
      const label = primeHeal(engine, attacker);
      if (label && Array.isArray(res.skills)) res.skills.push({ name: label, img: IMG.prime, by: attacker.name, color: engine.colorOf(attacker), side: "atk" });
    }
  },
  // ฟันสวนโดน = เลือดไหล 2 เทิร์น
  onStrikeLanded(engine, attacker, target, { counter } = {}) {
    if (!isTruck(attacker) || !counter || !st(attacker).countering) return [];
    const n = engine.applyBleed(target, COUNTER_BLEED);
    engine.log(n > 0 ? `🩸 ${target.name} เลือดไหล ${COUNTER_BLEED} เทิร์น (ผู้พิทักษ์)` : `🩸 ${target.name} ต้านเลือดไหลได้`);
    return n > 0 ? [`ผู้พิทักษ์ — เลือดไหล ${COUNTER_BLEED} เทิร์น`] : [];
  },

  // ---------- ผู้พิทักษ์: ตีสวนผ่านกลไกกลาง (attack.counterAndPush) ----------
  counters(p) { return primeOn(p) && !!st(p).stance; },
  // ถูกเรียกเป็นด่านสุดท้ายก่อนตีสวน (ด่านอื่นผ่านหมดแล้ว = สวนแน่) → ตั้งธงฟันสวน
  //  ธงอยู่ตลอดจังหวะสวน: ดาเมจตายตัว (fixedStrikeDamage) · ท่าตี/เสียง (strikeCard) · ล้างใน onStrikeResolved
  counterAnyRange(engine, p) {
    if (!primeOn(p) || !st(p).stance) return false;
    st(p).countering = true;
    return true;
  },
  fixedStrikeDamage(engine, attacker, target, ctx = {}) {
    if (!isTruck(attacker) || ctx.estimate || !ctx.counter || !st(attacker).countering) return null;
    return COUNTER_DMG;
  },
  counterPush() { return { push: false }; }, // ผู้ตีไม่ถอย
  // คลิปผู้พิทักษ์เล่นตอนสวนกลับเกิดจริง (ก่อนฉากตี) — ครั้งเดียวต่อเกม · กดสกิลมีแค่เสียงตั้งท่า
  counterClip(engine, p, card) {
    if (!isTruck(p) || !card || !card.counter) return null;
    p.cutsceneShown ||= {};
    if (p.cutsceneShown[CUT.guardian]) return null;
    p.cutsceneShown[CUT.guardian] = true;
    return CUT.guardian;
  },

  // ---------- สกิล ----------
  skillHidden(p, tier) {
    if (!isTruck(p)) return false;
    return tier !== "basic" && !primeOn(p);
  },
  canUseSkill(engine, p, tier) {
    if (!isTruck(p)) return true;
    const s = st(p);
    if (tier === "basic") return s.form === "old" || s.swapRound !== engine.roundNumber;
    if (!primeOn(p)) return false;
    if (tier === "secondary") return !s.stance && guardCd(engine, p) === 0;
    return tier === "ultimate";
  },
  skipsTurnQuota(p, tier) { return isTruck(p) && tier === "basic"; },
  ignoresTurnQuota(p, tier) { return isTruck(p) && tier === "basic"; },
  keepsMove(engine, p, tier) { return isTruck(p) && tier === "basic" && !!engine.action && !engine.action.moved; },
  skillPub(p, tier) {
    if (!isTruck(p) || tier !== "basic" || st(p).form === "old") return null;
    const toPrime = st(p).form === "truck";
    return {
      name: "เปลี่ยนร่าง",
      desc: toPrime
        ? `แปลงร่างเป็น “ออพติมัส ไพร์ม” ระยะเดิน ${MOV.prime} · พลังโจมตี +${PRIME_ATK} (1 ครั้งต่อเทิร์น · ไม่นับโควตาสกิล · ยังไม่เดิน = ยังเดินได้)`
        : `กลับเป็น “รถบรรทุก” ระยะเดิน ${MOV.truck} · จบเทิร์นในร่างนี้ครบ ${REGEN_TURNS} เทิร์น ฟื้นพลังชีวิต ${REGEN_HP} (1 ครั้งต่อเทิร์น · ไม่นับโควตาสกิล · ยังไม่เดิน = ยังเดินได้)`,
      img: toPrime ? IMG.toPrime : IMG.toTruck,
    };
  },
  skillSound(p, tier) {
    if (!isTruck(p)) return null;
    const s = st(p);
    if (s.clipNow) { s.clipNow = false; return null; }
    if (tier === "basic") return SFX.transform;
    if (tier === "secondary") return SFX.stance;
    return null; // ท่าไม้ตาย: เสียงตอนคลื่นออก (ultWave)
  },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isTruck(p)) return "";
    const s = st(p);
    if (tier === "basic") {
      if (s.form === "old") {
        setForm(engine, p, "truck");
        s.clipNow = clipOnce(engine, p, CUT.trueForm);
        fx(engine, p, "transform", { form: "truck" });
        const hp = engine.healHp(p, TRUE_HP), ar = engine.healArmor(p, TRUE_ARMOR);
        if (hp > 0) fx(engine, p, "heal", { n: hp });
        engine.log(`🚛 ${p.name} ร่างที่แท้จริง — ลอกคราบเป็นรถบรรทุก · พลังชีวิต +${hp} · เกราะ +${ar}`);
        return " — รถบรรทุก";
      }
      const to = s.form === "truck" ? "prime" : "truck";
      setForm(engine, p, to);
      s.swapRound = engine.roundNumber;
      s.clipNow = to === "prime" && clipOnce(engine, p, CUT.transform);
      fx(engine, p, "transform", { form: to });
      engine.log(to === "prime" ? `🤖 ${p.name} แปลงร่าง — ออพติมัส ไพร์ม` : `🚛 ${p.name} แปลงร่าง — รถบรรทุก`);
      return to === "prime" ? " — ออพติมัส ไพร์ม" : " — รถบรรทุก";
    }
    if (tier === "secondary") {
      s.stance = true;
      s.stanceRound = engine.roundNumber;
      s.stanceAt = engine.severStamp();
      fx(engine, p, "stance");
      primeCrit(p);
      engine.log(`🛡️ ${p.name} ผู้พิทักษ์ — ตั้งท่าสวนกลับ`);
      return "";
    }
    if (tier === "ultimate") {
      const dir = opts.dir;
      const tiles = engine.areaTiles ? engine.areaTiles(p, { kind: "line", arc: ULT_ARC }, dir) : [];
      s.clipNow = clipOnce(engine, p, CUT.ult);
      primeCrit(p);
      const ids = targets.slice();
      engine.deferAfterCutscene(() => ultWave(engine, p, ids, dir, tiles));
      const n = enemiesIn(engine, p, ids).length;
      return n ? ` — ${n} คน · ${ultDamage(n)}` : "";
    }
    return "";
  },
  onItemUsed(engine, p) {
    if (!isTruck(p)) return;
    primeCrit(p);
  },

  // ---------- ต้นตาเดินของตัวเอง: ท่าผู้พิทักษ์ที่ไม่ได้สวนหมดลง (ไม่ติดคูลดาวน์) ----------
  onActorStart(engine, p) {
    if (!isTruck(p)) return;
    const s = st(p);
    if (s.stance && s.stanceRound < engine.roundNumber) {
      s.stance = false;
      engine.log(`🛡️ ${p.name} ผู้พิทักษ์หมดลง — ไม่ได้สวน`);
    }
  },

  // ---------- รถบรรทุก: จบเทิร์นในร่างนี้ครบ 3 เทิร์น ฟื้นพลังชีวิต 2 ----------
  onEndTurn(engine) {
    for (const p of Object.values(engine.players)) {
      if (!isTruck(p)) continue;
      const s = st(p);
      s.crit = false;
      if (!p.alive || s.form !== "truck") continue;
      s.regen++;
      if (s.regen < REGEN_TURNS) continue;
      s.regen = 0;
      const healed = engine.healHp(p, REGEN_HP);
      engine.log(`🚛 ${p.name} รถบรรทุก — ฟื้นพลังชีวิต +${healed}`);
      if (healed > 0) { engine.sfx(SFX.heal); fx(engine, p, "heal", { n: healed }); }
    }
  },

  // ---------- ตัดผลสกิล (server/sever.js) ----------
  //  ออพติมัส ไพร์ม → กลับเป็นรถบรรทุกทันที (ท่าผู้พิทักษ์หายไปด้วย · เทิร์นนี้นับว่าเปลี่ยนร่างแล้ว)
  //  ผู้พิทักษ์ → ท่าหายแบบไม่ได้สวน (ไม่ติดคูลดาวน์)
  severables(engine, p) {
    if (!isTruck(p)) return [];
    const s = st(p);
    const out = [];
    if (s.form === "prime") {
      out.push({ key: "otPrime", label: "ออพติมัส ไพร์ม", at: s.formAt || 0, cancel() { setForm(engine, p, "truck"); s.swapRound = engine.roundNumber; } });
    }
    if (s.stance) out.push({ key: "otGuard", label: "ผู้พิทักษ์", at: s.stanceAt || 0, cancel() { s.stance = false; } });
    return out;
  },

  // ---------- ข้อมูลให้ client ----------
  oldTruckState(engine, p) {
    if (!isTruck(p)) return undefined;
    const s = st(p);
    return {
      form: s.form, stance: !!s.stance, guardCd: guardCd(engine, p),
      regen: s.regen, regenMax: REGEN_TURNS,
      crit: awake(p) && !!s.crit,
    };
  },
  skillLocks(engine, p) {
    if (!isTruck(p)) return undefined;
    const s = st(p);
    return {
      basic: { locked: s.form !== "old" && s.swapRound === engine.roundNumber, free: true },
      secondary: { locked: s.stance, cd: guardCd(engine, p) },
    };
  },
};
