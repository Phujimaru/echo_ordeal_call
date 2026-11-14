// ============================================================
//  คุซาคาเบะ ชินระ (Fire Force) — ยาก · id "kusakabe_shinra" · กติกาที่ผู้ใช้ตัดสิน GRID_PLAN §7.32 (2026-11-14)
//
//  ค่าพื้นฐาน: ไม่ระบุ → HP 7 / เกราะ 3 / โจมตี 1 · ระยะเดิน 4 · ตีประชิด [1, 1]
//  พลังงาน 2 แบบ: แต้มสกิล (ปกติ) + "เปลวเพลง" (p.shinra.ember · สูงสุด 5 · อุ่นเครื่องพอแล้ว 8)
//
//  ติดตัว นักผจญเพลิง รุ่นที่ 3:
//    เปลวเพลงเริ่มเกม 5/5 · ฟื้น +1 ต้นเทิร์น (onRoundStartTick)
//    ตีปกติธาตุไฟ ใช้เปลวเพลง 1 (onStrikeResolved/onStrikeObject — หลบพ้นก็เสีย) · ตีลงขณะมีเปลวเพลง = ลุกไหม้ 1 (อุ่นเครื่อง 2)
//    เปลวเพลง 0 = ยังตีได้ ไม่ติดลุกไหม้ · ตีสวน (ถ้ามี) ไม่ใช้เปลวเพลง ไม่ติดลุกไหม้ (ผู้ใช้รับข้อเสนอ 2026-11-14)
//    ลุกไหม้บนตัวเอง = ฟื้นพลังชีวิตแทน (ฮุค hburnHeals ของ _universal_status.tickBurn — ทุกแหล่ง)
//    ลบสกิลติดตัว (server/passiveSeal.js): ไม่ฟื้นเปลวเพลง · ตีปกติไม่ใช้/ไม่ติดลุกไหม้ · ลุกไหม้ทำดาเมจตามปกติ (เปลวเพลงที่มีไม่หาย)
//
//  สกิลพื้นฐาน ฉันนี่แหละฮีโร่ (3 แต้ม หรือ 2 เปลวเพลง — ปุ่ม 2 ตัวเลือก): 3 เทิร์น (เทิร์นนี้ + 2)
//    ระยะเดิน +2 (ฮุค mov) · ใช้สกิล/ไอเทมแล้วไม่หยุดเดิน (ฮุค keepsWalking ใน action.lockMove → rebaseMove เดินต่อด้วยระยะที่เหลือ)
//    ตีปกติยังจบตา · เปิดร้าน/ซื้อของยังหยุดเดิน (kind "shop") · กดซ้ำ = รีเซ็ทเป็น 3 เทิร์น
//  สกิลรอง อุ้งเท้าปีศาจ (4 แต้ม หรือ 3 เปลวเพลง · ไฟ): ศัตรูทุกคนรอบตัว 3×3 (aoe square) เสียหาย 2 + บัฟพลังโจมตี (skillStrike bonus 1 · หลบได้)
//  ท่าไม้ตาย (ช่องเดียว เลือก 1 ใน 2 — ผู้ใช้สั่ง 2026-11-14 "เลือกใช้ได้ ไม่ต้องใช้ 1 ก่อน"):
//    อุ่นเครื่องพอแล้ว (6 แต้ม): 5 เทิร์น เปลวเพลงสูงสุด 8 · ฟื้น +2/เทิร์น · ตีปกติลุกไหม้ 2 · ลุกไหม้ตัวเอง 5 (ข้ามต้านสถานะ)
//      เสริมสกิล (ผู้ใช้สั่ง 2026-11-14 · ค่า Claude เสนอ · ผู้ใช้ยืนยันแล้ว): ฮีโร่ ระยะเดิน +3 ใช้ 1 เปลวเพลง · อุ้งเท้าปีศาจ เสียหาย 3 + ลุกไหม้ 1 · ลาทัม 2 เปลวเพลง พุ่ง 8 ลุกไหม้ 3 · เพลง inferno (skillMusic)
//      หมดเวลา = เปลวเพลงเกิน 5 ตัดเหลือ 5 · ไม่เติมเปลวเพลงตอนกด
//    ลาทัม (3 แต้ม + 4 เปลวเพลง · ไฟ · คูลดาวน์ 2): ตัวเลือก = ไอเทมในกระเป๋าแต่ละชิ้น (ไม่มีไอเทม = กดไม่ได้)
//      ได้แม่นยำ 2 เทิร์นก่อน → เลือกทิศ แนว 6×1 → พุ่งไปโผล่ช่องว่างไกลสุดของแนว (สิ่งกีดขวาง/ร้าน = แนวหยุดก่อนช่องนั้น)
//      ศัตรูทุกคนที่พุ่งผ่าน: ล้างต้านสถานะ → ความเสียหาย ราคาไอเทม (ขั้นต่ำ 1) + บัฟพลังโจมตี (PVP ≤ 5 · PVE ไม่จำกัด) → ลุกไหม้ 2
//      มีปฏิกิริยาธาตุอย่างน้อย 1 คน = มอดไหม้จากภายใน 2 เทิร์น: ตีปกติระเบิดลุกไหม้บนเป้าเป็นดาเมจเพิ่ม แล้วลบลุกไหม้ที่ระเบิด
//        (PVP นับสูงสุด 4 — ที่เกินค้างไว้) · ลำดับ: ระเบิดก่อน แล้วติดลุกไหม้ใหม่จากการตีครั้งนั้น
//  PVE = สนาม Eos + Moon Cell (สู้ AI)
// ============================================================
const PassiveSeal = require("../server/passiveSeal");
const Board = require("../server/board");

const ID = "kusakabe_shinra";
const DIR = "/characters/kusakabe_shinra";
const IMG = {
  base: `${DIR}/shinra.webp`,
  hero: `${DIR}/skill1.webp`,
  storm: `${DIR}/skill2.webp`,
  warm: `${DIR}/skill3.webp`,
  latom: `${DIR}/skill4.webp`,
};
// เสียง (client/src/audio.js — สังเคราะห์ .claude/plans/shinra-sfx.py → client/public/effect_sound/shinra/)
const SFX = {
  kick: "shinra_kick", kickBlaze: "shinra_kick_blaze", hero: "shinra_hero", storm: "shinra_storm",
  warm: "shinra_warm", latom: "shinra_latom", detonate: "shinra_detonate",
};
const MUSIC = "shinra_inferno"; // เพลงตลอดอุ่นเครื่องพอแล้ว (ไฟล์จากผู้ใช้ 2026-11-14 · ปรับเป็น −14 LUFS) — client/src/audio.js
const FX = "shinraFx";
// คลิป (ไฟล์จากผู้ใช้ 2026-11-14 · บีบ crf 23): อุ่นเครื่องพอแล้ว = ครั้งแรกของแมตช์เท่านั้น · ลาทัม = ทุกครั้ง (ผู้ใช้สั่ง "เล่นซ้ำมีอันเดียวคือ 3.2")
//  กฎผู้ใช้: action ที่ขึ้นวีดีโอ ห้ามมีเสียงเอฟเฟกต์ตัดหน้า/ซ้อน — skillSound เงียบเมื่อคิวคลิป (s.clipNow) · ผลบนกระดาน + เสียงลงหลังคลิป
const VIDEO = { warm: `${DIR}/shinra_warm.mp4`, latom: `${DIR}/shinra_latom.mp4` };
const CUT = { warm: "shinraWarm", latom: "shinraLatom" }; // socket event (client/src/board/shinraFx.js)
const PASSIVE = "นักผจญเพลิง รุ่นที่ 3";
const NAMES = { hero: "ฉันนี่แหละฮีโร่", storm: "อุ้งเท้าปีศาจ", warm: "อุ่นเครื่องพอแล้ว", latom: "ลาทัม", smolder: "มอดไหม้จากภายใน" };

const EMBER_MAX = 5;
const EMBER_MAX_WARM = 8;
const EMBER_REGEN = 1;
const EMBER_REGEN_WARM = 1; // บวกเพิ่มระหว่างอุ่นเครื่อง
const STRIKE_EMBER = 1;
const STRIKE_BURN = 1;
const STRIKE_BURN_WARM = 2;
const HERO = { sp: 3, ember: 2, turns: 3, mov: 2 };
const STORM = { sp: 4, ember: 3, dmg: 2 };
// อุ่นเครื่องพอแล้วเสริมสกิลพื้นฐาน/รอง/ลาทัม (ผู้ใช้สั่ง 2026-11-14 · ค่าที่ Claude เสนอ — ผู้ใช้ยืนยันแล้ว)
const WARM_HERO = { mov: 3, ember: 1 };   // ฮีโร่: ระยะเดิน +3 (แทน +2) · 1 เปลวเพลง (แทน 2)
const WARM_STORM = { dmg: 3, burn: 1 };   // อุ้งเท้าปีศาจ: ความเสียหาย 3 (แทน 2) + ลุกไหม้ 1
const WARM_LATOM = { ember: 2, len: 8, burn: 3 }; // ลาทัม (ผู้ใช้สั่ง "บัฟท่าไม้ตาย 2 ด้วย" · ยืนยันแล้ว): 2 เปลวเพลง (แทน 4) · พุ่ง 8 ช่อง (แทน 6) · ลุกไหม้ 3 (แทน 2)
const WARM = { sp: 6, turns: 5, selfBurn: 5 };
const LATOM = { sp: 3, ember: 4, cd: 2, len: 6, burn: 2, accurate: 2, smolder: 2, pvpCap: 5 };
const DETONATE_PVP_CAP = 4;
const HBURN_MAX = 6;
// จังหวะฉาก (ms) — client SHINRA_T ต้องตรงกัน
const T = { stormBeat: 0.75, latomCharge: 380, latomStep: 70, latomTail: 260 };

const isMe = (p) => !!p && p.characterId === ID && !p.summon;
const matchOf = () => require("../server/match");
function fresh() {
  return {
    ember: EMBER_MAX,
    heroEnd: 0, heroSever: 0,       // ฉันนี่แหละฮีโร่ทำงานเมื่อ roundNumber < heroEnd
    warm: false, warmEnd: 0, warmSever: 0, warmAt: 0,
    smolderEnd: 0, smolderSever: 0, // มอดไหม้จากภายใน
    latomReady: 0,                  // ลาทัมกดได้เมื่อ roundNumber >= ค่านี้
    latomHit: false,                // กำลังลงดาเมจลาทัม (ฮุค damageCap)
    clipNow: false,                 // ปุ่มที่เพิ่งกดคิวคลิป (skillSound เงียบ)
  };
}
function st(p) { return p.shinra || (p.shinra = fresh()); }
const round = () => matchOf().roundNumber || 0;
const cdLeft = (ready, r) => Math.max(0, (ready || 0) - r);
const heroOn = (p, r = round()) => isMe(p) && r < st(p).heroEnd;
const warmOn = (p, r = round()) => isMe(p) && st(p).warm && r < st(p).warmEnd;
const smolderOn = (p, r = round()) => isMe(p) && r < st(p).smolderEnd;
const emberMax = (p) => (warmOn(p) ? EMBER_MAX_WARM : EMBER_MAX);
const heroMov = (p) => (warmOn(p) ? WARM_HERO.mov : HERO.mov);
const heroEmber = (p) => (warmOn(p) ? WARM_HERO.ember : HERO.ember);
const latomEmber = (p) => (warmOn(p) ? WARM_LATOM.ember : LATOM.ember);
const latomLen = (p) => (warmOn(p) ? WARM_LATOM.len : LATOM.len);
const latomBurn = (p) => (warmOn(p) ? WARM_LATOM.burn : LATOM.burn);
const stormDmg = (p) => (warmOn(p) ? WARM_STORM.dmg : STORM.dmg);
const pve = () => { const m = matchOf().gameMode; return m === "eos" || m === "moon"; };
const passiveOn = (p) => PassiveSeal.on(p);
// ค่าสถานะของร่างที่สวมอยู่ (Echo สวมชินระ = statId "kusakabe_shinra")
function baseMov(p) {
  const { CHAR_BY_ID } = require("../characters");
  const ch = CHAR_BY_ID[require("./echo").statId(p)];
  return ch && Number.isFinite(ch.mov) ? ch.mov : 4;
}
const itemPrice = (it) => Math.max(0, Number(it && it.price) || 0);
const latomDmg = (it) => Math.max(1, itemPrice(it));
// ไอเทมที่สละได้ (ของประจำตัวละครอื่นสละไม่ได้)
const NO_SACRIFICE = new Set(["kebread", "giornoArrow", "lawHeart"]);
const sacrificeable = (p) => (p.inventory || []).filter((it) => it && !NO_SACRIFICE.has(it.type));
function itemName(it) {
  try { return require("../server/shop").shopItemName(it); } catch { return "ไอเทม"; }
}

// ---------- เอฟเฟกต์/เสียง ----------
function watchers(engine, p) {
  return Object.values(engine.players).filter((o) => !o.duoOf && !o.summon && (o.id === p.id || !engine.hiddenFrom(o, p))).map((o) => o.id);
}
function fx(engine, p, kind, extra = {}) {
  if (!p.pos) return;
  engine.boardFxTo(watchers(engine, p), FX, { kind, id: p.id, at: { ...p.pos }, ...extra });
}
function payEmber(p, n) { const s = st(p); s.ember = Math.max(0, s.ember - n); }
function gainEmber(p, n) {
  const s = st(p), before = s.ember;
  s.ember = Math.min(emberMax(p), s.ember + n);
  return s.ember - before;
}
function endWarm(engine, p, why) {
  const s = st(p);
  if (!s.warm) return;
  s.warm = false;
  s.warmEnd = 0;
  if (s.ember > EMBER_MAX) s.ember = EMBER_MAX;
  engine.log(why === "sever" ? `🔥 ${NAMES.warm}ของ ${p.name} ถูกตัด` : `🔥 ${p.name} ${NAMES.warm} หมดลง — เปลวเพลงสูงสุดกลับเป็น ${EMBER_MAX}`);
}

// ---------- ลาทัม: วางแผนพุ่ง ----------
//  แนว 6 ช่องจากช่องติดตัว · สิ่งกีดขวาง/ร้าน/นอกกระดาน = แนวหยุดก่อนช่องนั้น
//  ช่องลงจอด = ช่องว่างไกลสุดในแนว (ไม่มีคน · ไม่ใช่สิ่งกีดขวาง) · ไม่มี = อยู่ที่เดิม
function planLatom(engine, p, dir) {
  const tiles = [];
  for (const t of engine.chargeTiles(p, dir, latomLen(p))) {
    if (t.obstacle || t.shop) break;
    tiles.push(t);
  }
  let land = null;
  for (let i = tiles.length - 1; i >= 0; i--) if (!tiles[i].unitId) { land = tiles[i]; break; }
  const path = [{ ...p.pos }];
  if (land) for (const t of tiles) { path.push({ x: t.x, y: t.y }); if (t === land) break; }
  const ids = [];
  for (const t of tiles) if (t.unitId && !ids.includes(t.unitId)) ids.push(t.unitId);
  return { tiles, land, path, ids };
}

function stripResist(t) {
  if (!t.statuses || !(t.statuses.resist > 0)) return false;
  delete t.statuses.resist;
  if (t.statusAmt) delete t.statusAmt.resist;
  return true;
}

// ลาทัม 1 คน (หลังฉากพุ่ง): ล้างต้านสถานะ → ดาเมจ → ลุกไหม้ · คืน true = เกิดปฏิกิริยา
function latomHit(engine, p, t, item) {
  if (!t || !t.alive || !t.pos) return false;
  const Element = require("../server/element");
  const s = st(p);
  const stripped = stripResist(t);
  if (stripped) engine.log(`🔥 ${NAMES.latom} — ต้านสถานะของ ${t.name} ถูกเผาทิ้ง`);
  const at = { ...t.pos };
  Element.takeReaction();
  s.latomHit = true;
  let res;
  try { res = engine.skillStrike(p, t, NAMES.latom, { bonus: latomDmg(item) - 1 }); }
  finally { s.latomHit = false; }
  const reacted = !!Element.takeReaction();
  if (t.alive && !(res && res.dodge)) {
    const n = engine.applyBurn(t, latomBurn(p));
    if (n > 0) engine.log(`🔥 ${t.name} ติดลุกไหม้ ${n}`);
  }
  engine.boardFxTo(watchers(engine, p), FX, { kind: "latomHit", id: p.id, at, to: t.id, dmg: res ? res.dmg : 0 });
  return reacted;
}

module.exports = {
  id: ID,
  IMG, SFX, FX, VIDEO, CUT, PASSIVE, NAMES, WARM_HERO, WARM_STORM, WARM_LATOM, EMBER_MAX, EMBER_MAX_WARM, HERO, STORM, WARM, LATOM, DETONATE_PVP_CAP, T,
  isMe, heroOn, warmOn, smolderOn, planLatom,

  resetCombat(p) {
    p.shinra = isMe(p) ? fresh() : null;
  },

  // ---------- ระยะเดิน / เดินต่อ ----------
  mov(p) { return heroOn(p) ? baseMov(p) + heroMov(p) : null; },
  // action.lockMove: ใช้สกิล/ไอเทมระหว่างฮีโร่ = เดินต่อด้วยระยะที่เหลือ (เปิดร้าน/ซื้อของยังหยุด)
  keepsWalking(engine, p, kind) { return heroOn(p) && kind !== "shop"; },
  // กดฮีโร่เอง (ยังไม่มีบัฟตอน useSkill เรียก lockMove) = ไม่ล็อก แล้วเดินต่อจากช่องที่ยืนใน applyInstantSkill
  keepsMove(engine, p, tier) { return isMe(p) && tier === "basic"; },

  // ---------- ติดตัว ----------
  hburnHeals(p) { return isMe(p) && passiveOn(p); },
  hburnLabel(p) { return isMe(p) && passiveOn(p) ? PASSIVE : null; },
  attackElement(engine, p) { return isMe(p) ? "fire" : null; },
  skillElement(engine, p, tier, opts = {}) {
    if (!isMe(p)) return null;
    if (tier === "secondary") return "fire";
    if (tier === "ultimate" && String(opts.form || "").startsWith("latom:")) return "fire";
    return null;
  },
  attackStyle(p) { return isMe(p) ? (warmOn(p) ? "shinraKickBlaze" : "shinraKick") : null; },
  attackSound(p) { return isMe(p) ? (warmOn(p) ? SFX.kickBlaze : SFX.kick) : undefined; },
  // มอดไหม้จากภายใน: ตีปกติได้ดาเมจเพิ่มเท่าลุกไหม้บนเป้า (PVP ≤ 4) — เฉพาะตีปกติจริง (skillStrike ก็เรียก computeAttackBase)
  damageBonus(engine, attacker, target) {
    if (!smolderOn(attacker) || !engine.inStrike() || !target || !target.statuses) return 0;
    const burn = target.statuses.hburn || 0;
    return pve() ? burn : Math.min(DETONATE_PVP_CAP, burn);
  },
  // เพดานดาเมจลาทัมใน PVP
  damageCap(engine, p) { return isMe(p) && st(p).latomHit && !pve() ? LATOM.pvpCap : null; },
  onStrikeLanded(engine, attacker, target, { counter } = {}) {
    if (!isMe(attacker) || counter || !target || !target.alive) return [];
    const out = [];
    const s = st(attacker);
    if (smolderOn(attacker) && target.statuses && target.statuses.hburn > 0) {
      const burn = target.statuses.hburn, n = pve() ? burn : Math.min(DETONATE_PVP_CAP, burn);
      target.statuses.hburn = burn - n;
      if (target.statuses.hburn <= 0) delete target.statuses.hburn;
      engine.log(`💥 ${attacker.name} ${NAMES.smolder} — ระเบิดลุกไหม้ ${n} หน่วยบนตัว ${target.name}`);
      engine.boardFxAtHit(FX, { kind: "detonate", id: attacker.id, at: { ...target.pos }, to: target.id, n });
      out.push(`${NAMES.smolder} +${n}`);
    }
    if (passiveOn(attacker) && s.ember >= STRIKE_EMBER) {
      const want = warmOn(attacker) ? STRIKE_BURN_WARM : STRIKE_BURN;
      const n = engine.applyBurn(target, want);
      out.push(n > 0 ? `ลุกไหม้ ${n}` : "ลุกไหม้ — ต้านได้");
    }
    return out;
  },
  onStrikeResolved(engine, attacker, target, res, { counter } = {}) {
    if (!isMe(attacker) || counter || !passiveOn(attacker)) return;
    payEmber(attacker, STRIKE_EMBER);
  },
  onStrikeObject(engine, p) {
    if (!isMe(p) || !passiveOn(p)) return;
    payEmber(p, STRIKE_EMBER);
  },

  // ---------- ปุ่มสกิล ----------
  skillPub(p, tier) {
    if (!isMe(p)) return null;
    const s = st(p), r = round();
    const costOf = (base, form) => require("../server/skills").skillCostOf(p, tier, base, { form });
    if (tier === "basic") {
      return {
        choices: [
          { key: "sp", name: NAMES.hero, img: IMG.hero, cost: costOf(HERO.sp, "sp"), free: false,
            desc: `${HERO.sp} แต้ม · ${HERO.turns} เทิร์น: ระยะเดิน +${heroMov(p)} · ใช้สกิลหรือไอเทมแล้วยังเดินต่อได้` },
          { key: "ember", name: NAMES.hero, img: IMG.hero, cost: 0, ember: heroEmber(p), free: false, locked: s.ember < heroEmber(p),
            desc: `${heroEmber(p)} เปลวเพลง · ${HERO.turns} เทิร์น: ระยะเดิน +${heroMov(p)} · ใช้สกิลหรือไอเทมแล้วยังเดินต่อได้` },
        ],
      };
    }
    if (tier === "secondary") {
      const area = { kind: "aoe", range: 1, square: true, hostile: true };
      return {
        choices: [
          { key: "sp", name: NAMES.storm, img: IMG.storm, cost: costOf(STORM.sp, "sp"), free: false, area,
            desc: `${STORM.sp} แต้ม · ธาตุไฟ · ศัตรูรอบตัว 3×3 เสียหาย ${stormDmg(p)}${warmOn(p) ? ` · ลุกไหม้ ${WARM_STORM.burn}` : ""}` },
          { key: "ember", name: NAMES.storm, img: IMG.storm, cost: 0, ember: STORM.ember, free: false, area, locked: s.ember < STORM.ember,
            desc: `${STORM.ember} เปลวเพลง · ธาตุไฟ · ศัตรูรอบตัว 3×3 เสียหาย ${stormDmg(p)}${warmOn(p) ? ` · ลุกไหม้ ${WARM_STORM.burn}` : ""}` },
        ],
      };
    }
    if (tier === "ultimate") {
      const latomCd = cdLeft(s.latomReady, r);
      const cap = pve() ? null : LATOM.pvpCap;
      const items = sacrificeable(p);
      const latomArea = { kind: "line", len: latomLen(p), width: 1, hostile: true };
      const latomLocked = latomCd > 0 || s.ember < latomEmber(p);
      return {
        choices: [
          { key: "warm", name: NAMES.warm, img: IMG.warm, cost: costOf(WARM.sp, "warm"), free: false, locked: warmOn(p), active: warmOn(p),
            desc: `${WARM.sp} แต้ม · ${WARM.turns} เทิร์น: เปลวเพลงสูงสุด ${EMBER_MAX_WARM} · ฟื้นเปลวเพลง +${EMBER_REGEN + EMBER_REGEN_WARM}/เทิร์น · ตีปกติติดลุกไหม้ ${STRIKE_BURN_WARM} · ${NAMES.hero} ระยะเดิน +${WARM_HERO.mov} ใช้ ${WARM_HERO.ember} เปลวเพลง · ${NAMES.storm} เสียหาย ${WARM_STORM.dmg} + ลุกไหม้ ${WARM_STORM.burn} · ${NAMES.latom} ใช้ ${WARM_LATOM.ember} เปลวเพลง พุ่ง ${WARM_LATOM.len} ช่อง ลุกไหม้ ${WARM_LATOM.burn} · ติดลุกไหม้ตัวเอง ${WARM.selfBurn}` },
          ...(items.length ? items.map((it) => {
            const dmg = cap ? Math.min(cap, latomDmg(it)) : latomDmg(it);
            return {
              key: `latom:${it.uid}`, name: NAMES.latom, item: { ...it }, cost: costOf(LATOM.sp, `latom:${it.uid}`), ember: latomEmber(p), free: false,
              area: latomArea, cd: latomCd, locked: latomLocked,
              desc: `${NAMES.latom} · สละ${itemName(it)} · ${LATOM.sp} แต้ม + ${latomEmber(p)} เปลวเพลง · ธาตุไฟ · แม่นยำ ${LATOM.accurate} เทิร์น · พุ่งแนว ${latomLen(p)}×1 ไปโผล่ปลายแนว · ศัตรูที่พุ่งผ่าน: ล้างต้านสถานะ · เสียหาย ${dmg}${cap ? ` (สูงสุด ${cap})` : ""} · ลุกไหม้ ${latomBurn(p)} · เกิดปฏิกิริยา = ${NAMES.smolder} ${LATOM.smolder} เทิร์น`,
            };
          }) : [{
            key: "latom:none", name: NAMES.latom, img: IMG.latom, cost: LATOM.sp, ember: latomEmber(p), free: false, locked: true, cd: latomCd,
            desc: `${NAMES.latom} · ${LATOM.sp} แต้ม + ${latomEmber(p)} เปลวเพลง · ต้องมีไอเทมให้สละ`,
          }]),
        ],
      };
    }
    return null;
  },
  // จ่ายด้วยเปลวเพลง = ไม่ใช้แต้มสกิลเลย (ไม่คิดภาษีกลางคืน/การเดินทาง)
  skillFree(p, tier, opts = {}) { return isMe(p) && (tier === "basic" || tier === "secondary") && opts.form === "ember"; },
  skillCost(p, tier, base, opts = {}) {
    if (!isMe(p) || tier !== "ultimate") return base;
    return String(opts.form || "").startsWith("latom:") ? LATOM.sp : WARM.sp;
  },
  skillArea(p, tier, area, opts = {}) {
    if (!isMe(p) || tier !== "ultimate") return area;
    return String(opts.form || "").startsWith("latom:") ? { kind: "line", len: latomLen(p), width: 1, hostile: true } : { kind: "self" };
  },
  // ลาทัม: ผลพื้นที่ลงเฉพาะช่องที่พุ่งผ่านจริง (หยุดที่สิ่งกีดขวาง)
  ownsAreaHit(p, tier, opts = {}) { return isMe(p) && tier === "ultimate" && String(opts.form || "").startsWith("latom:"); },
  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isMe(p)) return true;
    const s = st(p), form = String(opts.form || "");
    if (tier === "basic" || tier === "secondary") {
      if (form === "ember") return s.ember >= (tier === "basic" ? heroEmber(p) : STORM.ember);
      return form === "sp" || form === "";
    }
    if (tier === "ultimate") {
      if (form === "warm" || form === "") return !warmOn(p);
      if (form.startsWith("latom:")) {
        const uid = form.slice(6);
        if (cdLeft(s.latomReady, engine.roundNumber) > 0 || s.ember < latomEmber(p) || !p.pos) return false;
        return sacrificeable(p).some((it) => it.uid === uid);
      }
      return false;
    }
    return false;
  },
  skillSound(p, tier, opts = {}) {
    if (!isMe(p)) return null;
    if (st(p).clipNow) { st(p).clipNow = false; return null; }
    if (tier === "basic") return SFX.hero;
    if (tier === "secondary") return SFX.storm;
    if (tier === "ultimate") return String(opts.form || "").startsWith("latom:") ? SFX.latom : SFX.warm;
    return null;
  },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isMe(p)) return "";
    const s = st(p), r = engine.roundNumber, form = String(opts.form || "");
    if (tier === "basic") {
      const heroCost = heroEmber(p);
      if (form === "ember") payEmber(p, heroCost);
      s.heroEnd = r + HERO.turns;
      s.heroSever = engine.severStamp();
      engine.rebaseMove(p); // เดินมาแล้ว = เดินต่อจากช่องนี้ด้วยระยะที่เหลือ (ย้อนการเดินก่อนหน้าไม่ได้)
      fx(engine, p, "hero");
      engine.log(`🔥 ${p.name} ${NAMES.hero} — ระยะเดิน +${heroMov(p)} · ใช้สกิล/ไอเทมแล้วยังเดินต่อได้ ${HERO.turns} เทิร์น`);
      return form === "ember" ? ` (${heroCost} เปลวเพลง)` : "";
    }
    if (tier === "secondary") {
      if (form === "ember") payEmber(p, STORM.ember);
      const foes = (targets || []).map((id) => engine.players[id]).filter((t) => t && t.alive && t.id !== p.id && !engine.sameTeam(p, t));
      const tiles = Board.aoeTiles(engine.boardMap(), p.pos.x, p.pos.y, 1, engine.sizeOf(p), true);
      fx(engine, p, "storm", { tiles });
      engine.skillBeat(T.stormBeat, () => {
        const dmg = stormDmg(p), burn = warmOn(p) ? WARM_STORM.burn : 0;
        for (const t of foes) {
          if (!t.alive || !t.pos) continue;
          const res = engine.skillStrike(p, t, NAMES.storm, { bonus: dmg - 1 });
          if (burn && t.alive && !(res && res.dodge)) engine.applyBurn(t, burn);
        }
      });
      return form === "ember" ? ` (${STORM.ember} เปลวเพลง)` : "";
    }
    if (tier === "ultimate" && form.startsWith("latom:")) return castLatom(engine, p, form.slice(6), opts.dir);
    if (tier === "ultimate") {
      s.warm = true;
      s.warmEnd = r + WARM.turns;
      s.warmSever = engine.severStamp();
      s.warmAt = s.warmSever;
      // ติดลุกไหม้ตัวเอง 5 — ข้ามต้านสถานะ (ติดตัวเปลี่ยนเป็นฟื้นพลังชีวิต)
      p.statuses.hburn = Math.min(HBURN_MAX, (p.statuses.hburn || 0) + WARM.selfBurn);
      p.statusAt = p.statusAt || {};
      // คลิปครั้งแรกของแมตช์ → ผลบนกระดานหลังคลิป · ครั้งต่อไป = เอฟเฟกต์ + เสียงทันที
      if (!p.cutsceneShown) p.cutsceneShown = {};
      if (!p.cutsceneShown[CUT.warm]) {
        p.cutsceneShown[CUT.warm] = true;
        s.clipNow = true;
        engine.queueCutscene(p, CUT.warm);
        engine.deferAfterCutscene(() => fx(engine, p, "warm"));
      } else {
        fx(engine, p, "warm");
      }
      engine.log(`🔥 ${p.name} ${NAMES.warm} — ${WARM.turns} เทิร์น เปลวเพลงสูงสุด ${EMBER_MAX_WARM} · ติดลุกไหม้ตัวเอง ${WARM.selfBurn}`);
      return "";
    }
    return "";
  },

  // เพลงสนามตลอดอุ่นเครื่องพอแล้ว (view.activeSkillMusic — at มากสุดชนะ)
  skillMusic(engine, p) { return warmOn(p) && p.alive && engine.gameState !== "GAMEOVER" ? { music: MUSIC, at: st(p).warmAt || 0 } : null; },

  // ---------- จังหวะเทิร์น ----------
  onRoundStartTick(engine, p) {
    if (!isMe(p) || !p.alive) return;
    const s = st(p), r = engine.roundNumber;
    if (s.warm && r >= s.warmEnd) endWarm(engine, p, "time");
    if (!passiveOn(p)) return;
    gainEmber(p, EMBER_REGEN + (warmOn(p) ? EMBER_REGEN_WARM : 0));
  },
  onDeath(engine, p) {
    if (!isMe(p)) return;
    const s = st(p);
    s.heroEnd = 0;
    s.warm = false; s.warmEnd = 0;
    if (s.ember > EMBER_MAX) s.ember = EMBER_MAX;
    s.smolderEnd = 0;
  },

  // ---------- ผลสกิลที่ตัดได้ (server/sever.js) ----------
  severables(engine, p) {
    if (!isMe(p) || !p.alive) return [];
    const s = st(p), out = [];
    if (heroOn(p)) out.push({ key: "hero", label: NAMES.hero, at: s.heroSever, cancel: () => { s.heroEnd = 0; engine.log(`🔥 ${NAMES.hero}ของ ${p.name} หมดลง`); } });
    if (warmOn(p)) out.push({ key: "warm", label: NAMES.warm, at: s.warmSever, cancel: () => endWarm(engine, p, "sever") });
    if (smolderOn(p)) out.push({ key: "smolder", label: NAMES.smolder, at: s.smolderSever, cancel: () => { s.smolderEnd = 0; engine.log(`🔥 ${NAMES.smolder}ของ ${p.name} หมดลง`); } });
    return out;
  },

  // ---------- ข้อมูลให้ client ----------
  shinraState(engine, p) {
    if (!isMe(p)) return undefined;
    const s = st(p), r = engine.roundNumber;
    return {
      ember: s.ember,
      max: emberMax(p),
      hero: heroOn(p) ? s.heroEnd - r : 0,
      warm: warmOn(p) ? s.warmEnd - r : 0,
      smolder: smolderOn(p) ? s.smolderEnd - r : 0,
      latomCd: cdLeft(s.latomReady, r),
    };
  },
};

// ---------- ลาทัม ----------
function castLatom(engine, p, uid, dir) {
  const s = st(p), r = engine.roundNumber;
  const idx = (p.inventory || []).findIndex((it) => it.uid === uid);
  if (idx < 0 || !p.pos) return "";
  const [item] = p.inventory.splice(idx, 1);
  payEmber(p, latomEmber(p));
  s.latomReady = r + LATOM.cd;
  engine.applyBuff(p, "accurate", null, LATOM.accurate);
  const plan = planLatom(engine, p, dir);
  const v = Board.LINE_DIRS[dir] || [0, 0];
  const from = { ...p.pos };
  engine.log(`🔥 ${p.name} ${NAMES.latom} — สละ${itemName(item)} (ราคา ${itemPrice(item)}) · แม่นยำ ${LATOM.accurate} เทิร์น`);
  // คลิปทุกครั้ง → หลังคลิป: พุ่ง + เสียง + ฉากพัก → ดาเมจ
  s.clipNow = true;
  engine.queueCutscene(p, CUT.latom);
  engine.deferAfterCutscene(() => dashLatom(engine, p, plan, v, from, item));
  return ` · ${itemName(item)}`;
}
function dashLatom(engine, p, plan, v, from, item) {
  const s = st(p);
  if (!p.alive || !p.pos) return;
  // ฮีโร่: ระยะที่เหลือก่อนพุ่ง (action.lockMove ทำไปแล้วใน useSkill) แล้วเริ่มนับเดินต่อจากปลายทาง
  if (plan.land) {
    p.pos = { x: plan.land.x, y: plan.land.y };
    engine.setDash({ id: p.id, path: plan.path, dir: { x: v[0], y: v[1] }, style: "shinraLatom" });
    const a = engine.action;
    if (a && engine.actorId === p.id && !a.locked) {
      a.from = { ...p.pos };
      a.moved = false;
      a.path = null;
      a.trail = null;
    }
  }
  fx(engine, p, "latom", { from, path: plan.path, tiles: plan.tiles.map((t) => ({ x: t.x, y: t.y })), dir: { x: v[0], y: v[1] } });
  engine.sfx(SFX.latom);
  const foes = plan.ids.map((id) => engine.players[id]).filter((t) => t && t.alive && t.id !== p.id && !engine.sameTeam(p, t));
  const steps = Math.max(0, plan.path.length - 1);
  const sec = (T.latomCharge + steps * T.latomStep + T.latomTail) / 1000;
  engine.skillBeat(sec, () => {
    let reacted = false;
    for (const t of foes) if (latomHit(engine, p, t, item)) reacted = true;
    require("../server/skills").hitArea(p, plan.tiles.map((t) => ({ x: t.x, y: t.y })), foes.map((t) => t.id));
    if (reacted && p.alive) {
      s.smolderEnd = engine.roundNumber + LATOM.smolder;
      s.smolderSever = engine.severStamp();
      fx(engine, p, "smolder");
      engine.log(`💥 ${p.name} ${NAMES.smolder} — ${LATOM.smolder} เทิร์น`);
    }
  });
}
