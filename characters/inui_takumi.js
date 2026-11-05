// ============================================================
//  อินุอิ ทาคุมิ (Kamen Rider Faiz) — ปานกลาง · id "inui_takumi"
//  กติกาที่ตัดสินแล้ว GRID_PLAN §7.27 · ระบบกลาง GAME_SYSTEM §45
//
//  พลังชีวิต 7 / เกราะ 3 · พลังโจมตี 1 · เดิน 4 · ตีปกติประชิด
//  ช่อง basic: ก่อนเปิด = กระเป๋า SmartBrain (คลิปเปิดกระเป๋า) · เปิดแล้ว = Faiz Phone (HUD เฉพาะตัว FaizPhone.jsx)
//    รหัสส่งเป็น useSkill basic form: "555" | "103" | "106" | "279" | "exceed" (Enter เปล่า) | "hangup" (ปุ่มวางสาย)
//  ช่อง secondary: กระเป๋า SmartBrain form: "knuckle" | "pointer" | "axel" — กดซ้ำ = ถอด
//  ช่อง ultimate: Start Up — โผล่เฉพาะตอนสวม axel_watch
//
//  ไม่กินโควตา: ทุกอย่างที่ฟรี · กินโควตา: 279 / Exceed Charge / Start Up (ผู้ใช้เลือก 2026-11-05)
//  ทุกสกิลล็อกการเดิน ยกเว้น Exceed Charge และทุกอย่างระหว่าง Start Up
//  ร่าง Faiz ไม่เพิ่มค่าสถานะ (ผู้ใช้เลือก) · ใส่ Knuckle/Pointer/Axel ต้องแปลงร่างก่อน · วางสาย = ถอดของทั้งหมด
//  ปืน: กดรหัสแล้วค้างจนกระสุนหมด/เปลี่ยนรหัส · หักตอนยิงจริง (103 = 1 นัด · 106 = 2 นัด)
//  สกิลติดตัว: ตีโดนโดยไม่ได้สวม Knuckle/Pointer/Axel (รวมร่าง Faiz + ปืน) แต้มสกิล +1
//
//  Start Up: คลิปจบแล้วนับ 10 วิ เฉพาะเวลาที่ผู้เล่นกดได้ (ฮุค clockSeconds — ฉากตี/คลิปไม่กินเวลา)
//    ตีได้ 3 ครั้ง ระหว่างนั้นเดินได้ 7 ช่อง เติมใหม่ทุกครั้งที่ตี (ฮุค extraStrike + engine.freshMove)
//    ใส่ Knuckle/Pointer พร้อมกันได้ ไม่มีคลิป · ติดคริ = คลิปตามอุปกรณ์ล่าสุด (Pointer: axel_ponter_hit · Knuckle: axel_crit)
//    จบ (หมดเวลา / ครบ 3 ครั้ง / รอ) = คลิป axel_time_out (ฮุค actorOutro) กลับร่าง Faiz ถอดของ คูลดาวน์ 3 เทิร์น
//
//  Claude ตัดสินเอง (GRID_PLAN §7.27): Exceed Charge ปลดล็อกการเดินที่ค้างในตานั้น · ตีด้วย Exceed หลบได้ = เสียผล ·
//    เป้าประชิดเท่านั้น ไม่ใช้กระสุน · คริ 106 บวกกับคริ Axel · เลือกอุปกรณ์ทับ axel_watch = ถอด Axel (คูลดาวน์) ·
//    ฟื้นเลือด 2 เทิร์นต้องอยู่ร่างมนุษย์ติดกัน · exceed.m4a ใช้ตอนใส่ของใน Start Up (ไม่มีคลิปให้ซ้อน) · เสียง 103/106/279/ยิง ตัดจากไฟล์ซาวด์เอฟเฟกต์ของผู้ใช้โดยดูรูปคลื่น ยังไม่ได้ฟัง
// ============================================================

const ID = "inui_takumi";
const DIR = "/characters/inui_takumi";
const IMG = {
  base: `${DIR}/inui.webp`, faiz: `${DIR}/faiz.webp`, axel: `${DIR}/faiz_axel.webp`,
  case: `${DIR}/smartbrain_case.webp`, phone: `${DIR}/faiz_phone.webp`,
  knuckle: `${DIR}/faiz_knuckle.webp`, pointer: `${DIR}/faiz_pointer.webp`, watch: `${DIR}/axel_watch.webp`,
  startUp: `${DIR}/start_up.webp`,
};
const VIDEO = Object.fromEntries([
  "inui_start", "henshin", "knuckle_mode", "knuckle_ex_start", "knuckle_ex_hit",
  "pointer_mode", "pointer_ex_start", "pointer_ex_hit",
  "axel_watch", "axel_start_up", "axel_crit", "axel_pointer_hit", "axel_time_out", "axel_time_out_no_use",
].map((k) => [k, `${DIR}/${k}.mp4`]));
const CUT = {
  open: "inuiOpen", henshin: "inuiHenshin",
  knuckle: "inuiKnuckle", knuckleEx: "inuiKnuckleEx", knuckleHit: "inuiKnuckleHit",
  pointer: "inuiPointer", pointerEx: "inuiPointerEx", pointerHit: "inuiPointerHit",
  axel: "inuiAxel", startUp: "inuiStartUp", axelCrit: "inuiAxelCrit", axelPointer: "inuiAxelPointer",
  timeOut: "inuiTimeOut", timeOutIdle: "inuiTimeOutIdle",
};
const GUNS = { 103: { ammo: 1, crit: 0 }, 106: { ammo: 2, crit: 50 } };
const AMMO = 4;
const RELOAD_COST = 4;
const EXCEED_COST = 4;
const EXCEED_DMG = 4;
const EXCEED_MOV = 2;
const AXEL_TURNS = 5;
const AXEL_CD = 3;
const AXEL_CRIT = 25;
const STARTUP_SECONDS = 10;
const STARTUP_HITS = 3;
const STARTUP_MOV = 7;
const STARTUP_CRIT = 25;
const BURN = 1;
const ROOT_TURNS = 1;
const HEAL_EVERY = 2;
const HEAL = 2;

const isInui = (p) => !!p && p.characterId === ID && !p.summon;
function fresh() {
  return {
    opened: false, faiz: false, faizAt: 0,
    ammo: AMMO, gun: null, gunAt: 0,
    knuckle: false, pointer: false, gearAt: 0, lastGear: null,
    axel: false, axelLeft: 0, axelCd: 0, axelAt: 0,
    exceed: null, exceedAt: 0, exceedClip: null,
    startUp: null,
    humanTurns: 0,
  };
}
function st(p) { return p.inui || (p.inui = fresh()); }
const gunNeed = (s) => (s.gun ? GUNS[s.gun].ammo : 0);
const gunOn = (p) => { const s = st(p); return !!s.gun && !s.exceed && s.ammo >= gunNeed(s); };
const geared = (s) => s.knuckle || s.pointer || s.axel;
const stopGun = (s) => { s.gun = null; };

function logTo(engine, msg) { engine.log(msg); }

// ---------- ร่าง Axel ----------
//  คูลดาวน์นับลงตอนจบเทิร์น: จบระหว่างเทิร์น +1 (เทิร์นปัจจุบันไม่นับ) · จบตอนจบเทิร์น (atEnd) = เต็ม 3 เทิร์นถัดไปพอดี
function endAxel(p, atEnd) {
  const s = st(p);
  s.axel = false;
  s.axelLeft = 0;
  s.axelCd = AXEL_CD + (atEnd ? 0 : 1);
}
function clearGear(s) { s.knuckle = false; s.pointer = false; s.lastGear = null; }
function endStartUp(engine, p) {
  const s = st(p);
  s.startUp = null;
  clearGear(s);
  endAxel(p);
}
function revert(engine, p, why) {
  const s = st(p);
  if (s.axel) endAxel(p);
  clearGear(s);
  s.exceed = null;
  s.faiz = false;
  s.humanTurns = 0;
  logTo(engine, `📵 ${p.name} ${why}`);
}

// ---------- คำสั่งโทรศัพท์ ----------
function dial(engine, p, form) {
  const s = st(p);
  if (form === "555") {
    s.faiz = true;
    s.faizAt = engine.severStamp();
    s.humanTurns = 0;
    if (!p.cutsceneShown[CUT.henshin]) { p.cutsceneShown[CUT.henshin] = true; engine.queueCutscene(p, CUT.henshin); }
    else { engine.sfx("inui_standby"); engine.sfx("inui_henshin2"); }
    logTo(engine, `📱 ${p.name} 555 ENTER — แปลงร่าง Kamen Rider Faiz`);
    return;
  }
  if (form === "103" || form === "106") {
    s.gun = form;
    s.gunAt = engine.severStamp();
    engine.sfx(form === "103" ? "inui_single" : "inui_burst");
    logTo(engine, `📱 ${p.name} ${form} ENTER — ${form === "103" ? "Single Mode" : "Burst Mode"}`);
    return;
  }
  if (form === "279") {
    s.ammo = AMMO;
    engine.sfx("inui_charge");
    logTo(engine, `📱 ${p.name} 279 ENTER — เติมกระสุน ${AMMO} นัด`);
    return;
  }
  if (form === "hangup") { revert(engine, p, "วางสาย — คืนร่างมนุษย์"); return; }
  if (form === "exceed") {
    const kind = s.lastGear === "knuckle" || (s.knuckle && !s.pointer) ? "knuckle" : "pointer";
    s.exceed = { kind, round: engine.roundNumber };
    s.exceedAt = engine.severStamp();
    // ปลดล็อกการเดินที่ค้างจากคำสั่งก่อนหน้า: ระยะเดิน +2 ระหว่าง Exceed Charge
    if (engine.action) engine.action.locked = false;
    engine.queueCutscene(p, kind === "knuckle" ? CUT.knuckleEx : CUT.pointerEx);
    logTo(engine, `⚡ ${p.name} Exceed Charge — ${kind === "knuckle" ? "Faiz_nuckle" : "Faiz_pointer"}`);
  }
}

// ---------- กระเป๋า ----------
function wear(engine, p, form) {
  const s = st(p);
  const up = !!s.startUp;
  if (form === "axel") {
    if (s.axel) { endAxel(p); logTo(engine, `⌚ ${p.name} ถอด axel_watch`); return; }
    clearGear(s);
    s.axel = true;
    s.axelLeft = AXEL_TURNS;
    s.axelAt = engine.severStamp();
    engine.queueCutscene(p, CUT.axel);
    logTo(engine, `⌚ ${p.name} สวม axel_watch — Faiz Axel`);
    return;
  }
  if (s[form]) {
    s[form] = false;
    if (s.lastGear === form) s.lastGear = s.knuckle ? "knuckle" : s.pointer ? "pointer" : null;
    logTo(engine, `🎒 ${p.name} ถอด ${form === "knuckle" ? "Faiz_nuckle" : "Faiz_pointer"}`);
    return;
  }
  if (!up) {
    if (s.axel) endAxel(p);
    clearGear(s);
  }
  s[form] = true;
  s.lastGear = form;
  s.gearAt = engine.severStamp();
  if (up) engine.sfx("inui_exceed");
  else engine.queueCutscene(p, form === "knuckle" ? CUT.knuckle : CUT.pointer);
  logTo(engine, `🎒 ${p.name} สวม ${form === "knuckle" ? "Faiz_nuckle" : "Faiz_pointer"}`);
}

module.exports = {
  id: ID, IMG, VIDEO, CUT, STARTUP_SECONDS,
  resetCombat(p) { if (isInui(p)) p.inui = fresh(); },

  // ---------- ปุ่มตามสถานะ ----------
  displayImg(p) { if (!isInui(p)) return null; const s = st(p); return s.axel ? IMG.axel : s.faiz ? IMG.faiz : null; },
  characterPub(engine, p) {
    if (!isInui(p)) return null;
    const s = st(p);
    return s.axel ? { name: "Faiz Axel", img: IMG.axel } : s.faiz ? { name: "Kamen Rider Faiz", img: IMG.faiz } : null;
  },
  skillHidden(p, tier) {
    const s = st(p);
    if (tier === "secondary") return !s.opened;
    if (tier === "ultimate") return !s.axel || !!s.startUp;
    return false;
  },
  skillPub(p, tier) {
    const s = st(p);
    if (tier === "basic" && !s.opened) {
      return { name: "กระเป๋า SmartBrain", img: IMG.case, desc: "เปิดกระเป๋า: ได้ Faiz Phone และอุปกรณ์เสริม" };
    }
    if (tier === "secondary" && s.opened) {
      const cdLeft = s.axelCd;
      return {
        choices: [
          { key: "knuckle", name: "Faiz_nuckle", img: IMG.knuckle, cost: 0, worn: s.knuckle, desc: "การโจมตีปกติแรงขึ้น 1 · Exceed Charge: ต่อย ความเสียหาย 4 ลุกไหม้ 1 · ระหว่าง Start Up: ตีโดน ลุกไหม้ 1" },
          { key: "pointer", name: "Faiz_pointer", img: IMG.pointer, cost: 0, worn: s.pointer, desc: "แม่นยำตลอดที่สวม · Exceed Charge: เตะ ความเสียหาย 4 ถูกตรึง 1 เทิร์น · ระหว่าง Start Up: ตีโดน ถูกตรึง 1 เทิร์น" },
          { key: "axel", name: "axel_watch", img: IMG.watch, cost: 0, worn: s.axel, cd: cdLeft, locked: cdLeft > 0 || !!s.startUp, left: cdLeft > 0 ? cdLeft : undefined, desc: `ร่าง Faiz Axel ${AXEL_TURNS} เทิร์น อัตราคริติคอล ${AXEL_CRIT}% · ปลดล็อก Start Up · จบแล้วคูลดาวน์ ${AXEL_CD} เทิร์น` },
        ],
      };
    }
    return null;
  },
  skillCost(p, tier, base, opts) {
    const form = opts && opts.form;
    if (tier === "basic") return form === "279" ? RELOAD_COST : form === "exceed" ? EXCEED_COST : 0;
    return base;
  },
  // รหัส/ของที่ฟรี = ฟรีจริง ไม่คิดภาษีกลางคืน/การเดินทาง
  skillFree(p, tier, opts) {
    if (tier === "secondary") return true;
    return tier === "basic" && !(opts && (opts.form === "279" || opts.form === "exceed"));
  },
  skipsTurnQuota(p, tier, opts) {
    if (tier === "secondary") return true;
    return tier === "basic" && !(opts && (opts.form === "279" || opts.form === "exceed"));
  },
  ignoresTurnQuota(p, tier, opts) { return module.exports.skipsTurnQuota(p, tier, opts); },
  keepsMove(engine, p, tier, opts) {
    const s = st(p);
    return !!s.startUp || tier === "ultimate" || (tier === "basic" && !!opts && opts.form === "exceed");
  },
  silentFlash(p, tier, opts) { return tier !== "ultimate" && !(opts && opts.form === "exceed"); },
  skillSound() { return null; }, // ทุกสกิลที่มีเสียงมีคลิปของตัวเอง

  canUseSkill(engine, p, tier, targets, opts = {}) {
    const s = st(p), form = opts.form;
    if (tier === "basic") {
      if (!s.opened) return form === undefined;
      if (form === "555") return !s.faiz;
      if (form === "hangup") return s.faiz && !s.startUp;
      if (form === "103" || form === "106") return !s.exceed && s.gun !== form && s.ammo >= GUNS[form].ammo;
      if (form === "279") return s.ammo < AMMO;
      if (form === "exceed") return s.faiz && !s.exceed && !s.startUp && !s.axel && (s.knuckle || s.pointer);
      return false;
    }
    if (tier === "secondary") {
      if (!s.opened || !s.faiz || s.exceed) return false;
      if (form === "axel") return !s.startUp && (s.axel || s.axelCd <= 0);
      return form === "knuckle" || form === "pointer";
    }
    if (tier === "ultimate") return s.axel && !s.startUp;
    return false;
  },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    const s = st(p);
    if (tier === "basic" && !s.opened) {
      s.opened = true;
      engine.queueCutscene(p, CUT.open);
      logTo(engine, `💼 ${p.name} เปิดกระเป๋า SmartBrain`);
      return "";
    }
    if (tier === "basic") { dial(engine, p, opts.form); return ""; }
    if (tier === "secondary") { wear(engine, p, opts.form); return ""; }
    if (tier === "ultimate") {
      s.startUp = { left: STARTUP_HITS, started: false, at: engine.severStamp() };
      engine.freshMove(p);
      engine.queueCutscene(p, CUT.startUp);
      logTo(engine, `⏱️ ${p.name} Start Up — ${STARTUP_SECONDS} วินาที`);
    }
    return "";
  },

  // ---------- ตีปกติ ----------
  range(p) { return gunOn(p) ? [1, 3] : [1, 1]; },
  attackBeam(p) { return gunOn(p) ? 3 : 0; },
  attackSound(p) { if (!gunOn(p)) return undefined; return st(p).gun === "106" ? "inui_shot_burst" : "inui_shot"; },
  critPct(p) {
    const s = st(p);
    return (s.axel ? AXEL_CRIT : 0) + (s.startUp ? STARTUP_CRIT : 0) + (gunOn(p) ? GUNS[s.gun].crit : 0);
  },
  damageBonus(engine, attacker) {
    if (!isInui(attacker)) return 0;
    const s = st(attacker);
    return (s.knuckle ? 1 : 0) + (s.startUp ? 1 : 0);
  },
  attackFxNames(p) {
    const s = st(p), out = [];
    if (s.knuckle) out.push("Faiz_nuckle +1");
    if (s.startUp) out.push("Start Up +1");
    return out;
  },
  fixedStrikeDamage(engine, attacker) { return st(attacker).exceed ? EXCEED_DMG : null; },
  auraAccurate(p) { return isInui(p) && st(p).pointer; },
  onStrikeLanded(engine, attacker, target) {
    const s = st(attacker), names = [];
    const burn = s.exceed ? s.exceed.kind === "knuckle" : !!s.startUp && s.knuckle;
    const root = s.exceed ? s.exceed.kind === "pointer" : !!s.startUp && s.pointer;
    if (burn && engine.applyBurn(target, BURN)) names.push(`ลุกไหม้ ${BURN}`);
    if (root && engine.applyDebuff(target, "rooted", 1, ROOT_TURNS + (engine.hasActed(target.id) ? 1 : 0))) names.push(`ถูกตรึง ${ROOT_TURNS} เทิร์น`);
    return names;
  },
  onStrikeResolved(engine, attacker, target, res, { counter } = {}) {
    if (counter) return;
    const s = st(attacker);
    if (s.exceed) {
      if (!res.dodge) s.exceedClip = s.exceed.kind;
      s.exceed = null;
      return;
    }
    if (!res.dodge && !geared(s)) engine.addSkill(attacker, 1);
    spendAmmo(attacker);
  },
  onStrikeObject(engine, p) { spendAmmo(p); },
  // Exceed Charge ลง = คลิปท่าไม้ตาย · ติดคริใน Start Up = คลิปตามอุปกรณ์ที่สวมล่าสุด
  preAttackClip(engine, attacker, card) {
    const s = st(attacker);
    if (s.exceedClip) {
      const kind = s.exceedClip;
      s.exceedClip = null;
      return kind === "knuckle" ? CUT.knuckleHit : CUT.pointerHit;
    }
    if (!s.startUp || !card.crit) return null;
    const gear = s.lastGear || (s.pointer ? "pointer" : s.knuckle ? "knuckle" : null);
    return gear === "pointer" ? CUT.axelPointer : gear === "knuckle" ? CUT.axelCrit : null;
  },
  // ตีครั้งที่ 1–2 ของ Start Up ไม่จบตา · เติมระยะเดิน 7 ช่อง
  extraStrike(engine, p) {
    const s = st(p);
    if (!s.startUp) return false;
    s.startUp.left -= 1;
    if (s.startUp.left <= 0) return false;
    engine.freshMove(p);
    return true;
  },
  mov(p) {
    if (!isInui(p)) return null;
    const s = st(p);
    if (s.startUp) return STARTUP_MOV;
    return s.exceed ? 4 + EXCEED_MOV : null;
  },
  // เวลาตาเดินตอนกลับจากฉาก: คลิป Start Up จบ = เริ่ม 10 วิ · ฉากตี/คลิปอื่น = เวลาที่เหลือพอดี
  clockSeconds(engine, p, left) {
    const s = st(p);
    if (!s.startUp) return null;
    // เพลง axel_theme + เสียง axel_startUp_soundeffect เริ่มพร้อมกันตอนนับ 10 วิ หลังคลิปจบ (ผู้ใช้สั่ง 2026-11-05) — client เล่นตาม startUp.running · พักตอนมีคลิป
    if (!s.startUp.started) { s.startUp.started = true; return STARTUP_SECONDS; }
    return Math.max(1, left);
  },
  actorOutro(engine, p) {
    const s = st(p);
    if (!s.startUp) return;
    endStartUp(engine, p);
    engine.queueCutscene(p, CUT.timeOut);
    logTo(engine, `⏱️ ${p.name} Time Out — กลับร่าง Faiz`);
  },
  onActorEnd(engine, p) { const s = st(p); s.exceed = null; s.exceedClip = null; },

  // ---------- จังหวะเทิร์น ----------
  onEndTurn(engine) {
    for (const p of Object.values(engine.players)) {
      if (!isInui(p) || !p.alive) continue;
      const s = st(p);
      if (s.axelCd > 0) s.axelCd -= 1;
      if (s.axel) {
        s.axelLeft -= 1;
        if (s.axelLeft <= 0) {
          endAxel(p, true);
          engine.queueCutscene(p, CUT.timeOutIdle);
          logTo(engine, `⌚ ${p.name} Faiz Axel หมดเวลา`);
        }
      }
      if (s.faiz) { s.humanTurns = 0; continue; }
      s.humanTurns += 1;
      if (s.humanTurns < HEAL_EVERY) continue;
      s.humanTurns = 0;
      const got = engine.healHp(p, HEAL);
      if (got > 0) logTo(engine, `💚 ${p.name} ฉันก็เป็นมนุษย์ — ฟื้นพลังชีวิต ${got}`);
    }
  },
  onDeath(engine, p) { if (isInui(p)) st(p).startUp = null; },

  skillMusic(engine, p) {
    if (!isInui(p) || !p.alive) return null;
    const s = st(p);
    if (s.exceed) return { music: "inui_exceed_wait", at: s.exceedAt };
    return s.startUp && s.startUp.started ? { music: "inui_axel", at: s.startUp.at } : null;
  },

  // ---------- ผลสกิลที่ตัดได้ (server/sever.js) ----------
  severables(engine, p) {
    if (!isInui(p) || !p.alive) return [];
    const s = st(p), out = [];
    if (s.exceed) out.push({ key: "exceed", label: "Exceed Charge", at: s.exceedAt, cancel: () => { s.exceed = null; } });
    if (s.startUp) out.push({ key: "startUp", label: "Start Up", at: s.startUp.at, cancel: () => endStartUp(engine, p) });
    else if (s.axel) out.push({ key: "axel", label: "Faiz Axel", at: s.axelAt, cancel: () => endAxel(p) });
    if (s.knuckle || s.pointer) out.push({ key: "gear", label: s.pointer ? "Faiz_pointer" : "Faiz_nuckle", at: s.gearAt, cancel: () => clearGear(s) });
    if (s.gun) out.push({ key: "gun", label: s.gun === "103" ? "Single Mode" : "Burst Mode", at: s.gunAt, cancel: () => stopGun(s) });
    if (s.faiz) out.push({ key: "faiz", label: "Kamen Rider Faiz", at: s.faizAt, cancel: () => revert(engine, p, "ถูกตัดการแปลงร่าง") });
    return out;
  },

  // ---------- ข้อมูลให้ client (players[].inui) ----------
  inuiState(engine, p) {
    if (!isInui(p)) return undefined;
    const s = st(p);
    return {
      opened: s.opened, faiz: s.faiz, ammo: s.ammo, ammoMax: AMMO, gun: gunOn(p) ? s.gun : null,
      knuckle: s.knuckle, pointer: s.pointer, axel: s.axel, axelLeft: s.axelLeft, axelCd: s.axelCd,
      exceed: s.exceed ? s.exceed.kind : null,
      startUp: s.startUp ? { left: s.startUp.left, running: s.startUp.started } : null,
      henshinShown: !!p.cutsceneShown[CUT.henshin],
      humanTurns: s.humanTurns, humanNeed: HEAL_EVERY,
    };
  },
};

function spendAmmo(p) {
  if (!isInui(p) || !gunOn(p)) return;
  const s = st(p);
  s.ammo = Math.max(0, s.ammo - gunNeed(s));
  if (s.ammo < gunNeed(s)) stopGun(s);
}
