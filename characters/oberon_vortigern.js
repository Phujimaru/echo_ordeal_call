// ============================================================
//  โอเบรอน (วอร์ติเกิร์น) — ร่างที่สองของการ์ดโอเบรอน (GRID_PLAN §7.46 · ผู้ใช้ส่งสเปก + ตอบ 2026-11-27)
//
//  ได้มา 2 ทาง: โหมด "วอร์ติเกิร์น" ในหน้าเลือกตัว (modes[].char) · หรือเล่นโอเบรอน (ฤดูร้อน) จนแต้มความเกลียดชังครบ 5
//   → ปุ่ม HUD ลอกคราบ (characters/oberon_summer.js → molt() ที่นี่) แปลงถาวร · เลือด/เกราะคงสัดส่วน · สถานะเดิมหายหมด
//  ค่าฐาน 7 / 3 ไม่บวกโบนัสกลาง (ผู้ใช้คิดรวมแล้ว — combat.STAT_BONUS_OF) · เดิน 4 · ตีประชิด · ธาตุพิษทุกการกระทำที่มีดาเมจ
//
//  สกิลพื้นฐาน ก็แค่เศษขยะ (2): ทำลายไอเทมในกระเป๋า (1 ชิ้น / ทั้งหมด) — ต่อชิ้น พลังชีวิต +2 · เกราะ +1 · แต้มสกิล +1
//  สกิลรอง ชีวิตพวกแกมีค่าพอไหม (3): เคียวยมทูต 3 เทิร์น — ตีปกติโดน = ดูดแต้มสกิล 1 (ขาดแต้มละ ดาเมจ +1 — แบบ diego_dino)
//   + ไร้ทางเยียวยา 2 เทิร์น + ผนึกพลังงาน (manaSeal 2 = กันการฟื้นแต้มจบเทิร์นนี้ 1 ครั้ง) · ตีแต่ละครั้งลดคูลดาวน์ไม้ตาย 1
//   · ในสนธยา: ดูด 2 · พลังโจมตี +1 · ไม่ลดคูลดาวน์
//  ช่องไม้ตายช่องเดียว 2 ท่า (skillPub): ปกติ = สนธยายามค่ำคืน · ระหว่างสนามของตัวเอง = Lie Like Vortigern
//   สนธยายามค่ำคืน (4): สนามกลืนกิน 10×10 (server/oberonField.js) 5 เทิร์น · นาฬิกาโลกหยุด · กลางคืนของตัวละคร (ไม่ใช่ภูมิภาค)
//    · โอเบรอนแต้มสกิล +1/เทิร์น (skillRegen 2) · ติดพิษร้ายตลอดสนาม (ราชาแห่งการจอมหลอกลวง = ฟื้น/พลังโจมตี +1)
//    · ศัตรูได้ "สนธยา" +1 ต้นเทิร์น (เพดาน 5 — เทิร์นสุดท้ายพอดี 5 · ต้านไม่ได้ · ล้างได้ทีละ 1) · สนธยา ≥ 3 = อ่อนแอ 1
//    · เน่าเปื่อย: ศัตรูทุกคนสุ่มช่องสกิล 1 ช่อง ใช้ไม่ได้เทิร์นนั้น · เทิร์นหน้าสุ่มใหม่ไม่ซ้ำช่องเดิม (p.skillRot — ผู้ใช้สั่ง 2026-11-27)
//    · โอเบรอนตาย = สนามหาย · คูลดาวน์ 6 เทิร์นนับหลังสนามหมด
//   Lie Like Vortigern (4): ศัตรูทั้งสนาม (ไม่โดนเพื่อน) — หลบได้ — ความเสียหาย 2 + ผุพัง 3 + หลับไหลเท่าสนธยา (ต้านได้) · สนามยืด 5 เทิร์น
//    · หลับไหลกลาง: ทำอะไรไม่ได้ · เสีย 1 ไม่สนเกราะต่อเทิร์น ค้างที่ 1 · ถูกตีตื่น (server/combat.js tookDamage) · หลับแต่ละเทิร์นสนธยา −1
//  สกิลติดตัว Vesper (แมลง · ระบบม้ากลาง characters/_horse.js): เริ่มเกมขี่ · เลือด 5 รับก่อนเกราะ · ตาย = เรียกไม่ได้ 3 เทิร์น
//   · ขี่ = เดิน +2 · ตีระยะ 1–3 แบบขี่ชน + พิษร้าย (ออกฤทธิ์ 1 ครั้ง) + ผุพัง 2
//  สกิลติดตัว 2 ราชาแห่งการจอมหลอกลวง: พิษร้ายที่ติดตัวเองกลับผล (ฮุค poisonInverts — _universal_status) · ในสนธยา พลังโจมตี +1
// ============================================================

const PassiveSeal = require("../server/passiveSeal");
const Horse = require("./_horse");

const ID = "oberon_vortigern";
const DIR = "/characters/oberon_vortigern";
const IMG = {
  base: `${DIR}/oberon_vortigern.webp`, skill1: `${DIR}/skill1.jpg`, skill2: `${DIR}/skill2.webp`,
  field: `${DIR}/skill3.webp`, lie: `${DIR}/skill3_lie.webp`, vesper: `${DIR}/vesper.webp`,
};
// คลิป Lie Like Vortigern 2 เวอร์ชันจากผู้ใช้ (รุนแรง / เย็นชา — สุ่มทุกครั้ง) · 19.9 วิ · ผลลงหลังคลิป แล้วเอฟเฟกต์บนกระดานต่อจากฉากท้ายคลิป
//  + ฉากเข้าสนธยา (Abyssal Worm → OBERON → ดิ่งลงหลุม · 19.9 วิ) ทุกครั้ง · ลอกคราบ (True Name: Oberon → Oberon Vortigern · 5.8 วิ)
const VIDEO = { lieViolent: `${DIR}/lie_violent.mp4`, lieCold: `${DIR}/lie_cold.mp4`, field: `${DIR}/field.mp4`, molt: `${DIR}/molt.mp4` };
const CUT = { lieViolent: "obvLieViolent", lieCold: "obvLieCold", field: "obvField", molt: "obvMolt" };
const CLIP_SEC = 20;
const CLIP_SECS = { lieViolent: 20, lieCold: 20, field: 20, molt: 6 };
// เสียงพากย์ (client/src/audio.js obv_vNN · ตัดจากคลิปของผู้ใช้ — .claude/plans/oberon-voice-cut.py)
const v = (...n) => n.map((i) => `obv_v${String(i).padStart(2, "0")}`);
const VOICE = {
  turn: v(1, 2, 3, 7, 8, 9, 10, 11, 12),   // You're all so pathetic… · Let's go, then. · Don't hide. · Sure. …
  struck: v(20, 27),                      // Ugh, what a pain! · Did you underestimate me?
  basic: v(29, 32, 4),                    // Thanks for the meal! · Here's a full course! Now pay up! · Hahaha. Nice.
  secondary: v(5, 23, 28),                // How bold of you. It's nauseating! · My condolences! · Corpses!
  field: v(14, 15),                       // Very well. I'll show you the twilight sky! · …There's no light beyond this point.
  vesper: v(30, 18),                      // Vesper! How about right there!? · Forward, my flies!
  molt: v(26, 31),                        // I'm a bug, after all. · Having fun? I'm jealous!
  kill: v(25, 13),                        // It suits you just perfectly! · …Fall forever.
};
// เสียงตีปกติ (ตัดจากคลิปต่อสู้ของผู้ใช้ — มีเสียงพากย์ปนในตัว จึงไม่มี voiceLines.strike)
const SFX = { buster: "obv_hit_buster", quick: "obv_hit_quick", arts: "obv_hit_arts", extra: "obv_hit_extra",
  // Mixkit เน้นเบส (ผู้ใช้อนุญาต 2026-11-27 — แหล่งที่มา .claude/plans/oberon-sfx-sources.md)
  scytheOn: "obv_scythe_on", scrap: "obv_scrap", vesperOn: "obv_vesper_on", vesperOff: "obv_vesper_off", vesperDie: "obv_vesper_die",
  twilight: "obv_twilight", rot: "obv_rot", release: "obv_release" };
const MUSIC = "obv_theme"; // เพลงระหว่างสนธยายามค่ำคืน (theme.mp3 ของผู้ใช้)
const HP = 7, ARMOR = 3, MOV = 4, MOV_VESPER = 6;
const RANGE = [1, 1], RANGE_VESPER = [1, 3];
const VESPER = { hp: 5, cd: 3, name: " Vesper" };
const SCRAP = { hp: 2, armor: 1, sp: 1 };
const SCYTHE_TURNS = 3, SCYTHE_DRAIN = 1, SCYTHE_DRAIN_FIELD = 2, SCYTHE_NOHEAL = 2, SCYTHE_SEAL = 2;
const FIELD_TURNS = 5, FIELD_CD = 6, LIE_CD = 6, LIE_EXTEND = 5, LIE_DMG = 2, LIE_DECAY = 3;
const TWILIGHT_MAX = 5, TWILIGHT_WEAK_AT = 3;
const CHARGE_POISON = 2; // พิษร้าย 1 เทิร์นที่ออกฤทธิ์จริง (ติดกลางเทิร์น → ลดตอนจบเทิร์นก่อน · แบบ Gamma Knife ของลอว์)
const CHARGE_DECAY = 2;
const TIERS = ["basic", "secondary", "ultimate"];

const isMe = (p) => !!p && p.characterId === ID && !p.summon;
const Field = () => require("../server/oberonField");
const cdLeft = (ready, round) => Math.max(0, (ready || 0) - round);
const vesperCfg = { ...VESPER, fx: (engine, p, mode) => { fx(engine, p, "vesper", { mode }); engine.sfx(mode === "die" ? SFX.vesperDie : mode === "mount" ? SFX.vesperOn : SFX.vesperOff); } };

function fresh() {
  return {
    ...Horse.fresh(VESPER),
    scytheAt: null,      // ตัดผลสกิล: { at } ตอนเปิดเคียว
    fieldReady: 0,       // สนธยายามค่ำคืนกดได้อีกเมื่อ roundNumber >= ค่านี้
    lieReady: 0,
    fieldMine: false,    // สนามที่เปิดอยู่เป็นของคนนี้ (ตั้งคูลดาวน์ตอนสนามหาย)
    fieldAt: null,       // ตัดผลสกิล: { at }
    lieUsed: false,      // ใช้ Lie ไปแล้วในสนามนี้
    ultVoice: null,      // เสียงพากย์ท่าไม้ตายของการกดครั้งนี้ ("field" | null = มีคลิป ไม่พากย์ทับ)
    fieldSeq: 0,         // เพลงสนาม: ลำดับเริ่ม
  };
}
function st(p) {
  if (!p.obv) p.obv = fresh();
  return p.obv;
}
function voice(engine, p, key) {
  const list = VOICE[key];
  if (!list || !list.length) return;
  engine.sfx(list[Math.floor(Math.random() * list.length)], null, { voice: p.id });
}
function fx(engine, p, kind, extra = {}) {
  engine.boardFx("oberonFx", { kind, id: p.id, color: engine.colorOf ? engine.colorOf(p) : null, ...(p.pos ? { at: { ...p.pos } } : {}), ...extra });
}
const scytheOn = (p) => ((p.statuses && p.statuses.obvScythe) || 0) > 0;
const mounted = (p) => isMe(p) && st(p).mounted && PassiveSeal.on(p);
const fieldMine = (p) => Field().active() && Field().casterId() === p.id;
const enemyOf = (engine, p, o) => o && o.id !== p.id && o.alive && !engine.sameTeam(p, o);
const bagItems = (p) => (p.inventory || []).filter((it) => it && it.uid && !it.charItem && it.type !== "giornoArrow" && it.type !== "lawHeart");

// ---------- ลอกคราบ: โอเบรอน (ฤดูร้อน) → วอร์ติเกิร์น (เรียกจาก oberon_summer.charAction) ----------
function molt(engine, p) {
  const oldMaxHp = engine.maxHpOf(p), oldMaxArmor = engine.maxArmorOf(p);
  const hpRatio = oldMaxHp > 0 ? p.hp / oldMaxHp : 1, arRatio = oldMaxArmor > 0 ? p.armor / oldMaxArmor : 0;
  // สถานะทั้งหมดหาย (ลอกคราบเป็นร่างใหม่ — ผู้ใช้สั่ง)
  p.statuses = {}; p.statusAmt = {}; p.statusAt = {};
  p.characterId = ID;
  if (p.echoQ && p.echoQ.mimic) p.echoQ.mimic = ID; // Echo สวมโอเบรอนอยู่: ร่างที่สวมเปลี่ยนตาม
  p.obv = fresh();
  p.hp = Math.max(1, Math.min(engine.maxHpOf(p), Math.round(hpRatio * engine.maxHpOf(p))));
  p.armor = Math.max(0, Math.min(engine.maxArmorOf(p), Math.round(arRatio * engine.maxArmorOf(p))));
  engine.log(`🦋 ${p.name} ลอกคราบ — โอเบรอน วอร์ติเกิร์น (พลังชีวิต ${p.hp}/${engine.maxHpOf(p)} · เกราะ ${p.armor}/${engine.maxArmorOf(p)})`);
  fx(engine, p, "molt");
  return true;
}

// ---------- ก็แค่เศษขยะ ----------
function scrap(engine, p, items) {
  if (!items.length) return 0;
  const ids = new Set(items.map((it) => it.uid));
  p.inventory = (p.inventory || []).filter((it) => !ids.has(it.uid));
  const n = items.length;
  const hp = engine.healHp(p, SCRAP.hp * n);
  engine.healArmor(p, SCRAP.armor * n);
  engine.addSkill(p, SCRAP.sp * n, "oberon_vortigern");
  engine.log(`🗑️ ${p.name} ก็แค่เศษขยะ — ทำลาย ${n} ชิ้น · พลังชีวิต +${hp} · เกราะ +${SCRAP.armor * n} · แต้มสกิล +${SCRAP.sp * n}`);
  fx(engine, p, "scrap", { n });
  return n;
}

// ---------- สนาม ----------
function openField(engine, p) {
  const s = st(p);
  if (!Field().enter(p, engine.roundNumber + FIELD_TURNS)) return false;
  s.fieldMine = true; s.lieUsed = false; s.fieldAt = { at: engine.severStamp() }; s.fieldSeq = engine.severStamp();
  selfPoison(engine, p);
  rotAll(engine, p, true); // ส่วนหนึ่งของท่าที่มีคลิป — ไม่มีเสียง
  engine.log(`🕳️ ${p.name} สนธยายามค่ำคืน — หลุมกลืนกินทุกคน ${FIELD_TURNS} เทิร์น (นาฬิกาโลกหยุด)`);
  fx(engine, p, "swallow", { seq: Field().publicInfo().seq });
  return true;
}
// สนามหาย (หมดเวลา / ตาย / ถูกตัด) → คูลดาวน์นับจากเทิร์นนี้
function closeField(engine, reason) {
  const by = Field().casterId();
  const ok = Field().exit(reason);
  const p = by && engine.players[by];
  if (p && p.obv) {
    const r = engine.roundNumber + 1; // คูลดาวน์เริ่มเทิร์นถัดไป (นับหลังผลหมด)
    p.obv.fieldMine = false; p.obv.fieldAt = null;
    p.obv.fieldReady = r + FIELD_CD;
    p.obv.lieReady = r + LIE_CD;
  }
  if (ok) engine.log(reason === "death" ? "🕳️ หลุมกลืนกินสลายไปพร้อมผู้สร้าง — ทุกคนกลับที่เดิม" : "🕳️ สนธยายามค่ำคืนจบลง — ทุกคนกลับที่เดิม");
  if (ok && p) { fx(engine, p, "release", { reason }); engine.sfx(SFX.release); }
  return ok;
}
// ราชาแห่งการจอมหลอกลวง: สนามของตัวเอง = ติดพิษตลอด (ติดตรง ไม่ผ่านต้านสถานะ — แหล่งพิษของตัวเอง)
function selfPoison(engine, p) {
  if (!p.alive) return;
  p.statuses.poison = Math.max(p.statuses.poison || 0, 1);
}
// เน่าเปื่อย: ศัตรูทุกคนสุ่มช่องสกิล 1 ช่องที่มีอยู่ ไม่ซ้ำช่องของเทิร์นก่อน
function rotAll(engine, p, silent = false) {
  const { CHAR_BY_ID } = require("../characters");
  for (const o of engine.alivePlayers()) {
    if (!enemyOf(engine, p, o) || o.summon) continue;
    const ch = CHAR_BY_ID[o.characterId];
    const have = TIERS.filter((t) => ch && ch[t]);
    if (!have.length) { o.skillRot = null; continue; }
    const last = o.skillRot && o.skillRot.tier;
    const pool = have.length > 1 ? have.filter((t) => t !== last) : have;
    const tier = pool[Math.floor(Math.random() * pool.length)];
    o.skillRot = { tier, round: engine.roundNumber, by: p.id };
  }
  const rotted = engine.alivePlayers().filter((o) => o.pos && o.skillRot && o.skillRot.round === engine.roundNumber && o.skillRot.by === p.id);
  if (rotted.length && !silent) engine.sfx(SFX.rot);
  if (rotted.length) fx(engine, p, "rot", { targets: rotted.map((o) => ({ id: o.id, at: { ...o.pos }, size: engine.sizeOf(o), tier: o.skillRot.tier })) });
}
function lie(engine, p) {
  const s = st(p);
  s.lieUsed = true;
  Field().extend(LIE_EXTEND);
  const hit = [];
  engine.withElement("poison", () => {
    for (const t of engine.alivePlayers()) {
      if (!enemyOf(engine, p, t) || !t.pos) continue;
      const at = { ...t.pos }, size = engine.sizeOf(t);
      if (engine.skillDodge(p, t, "Lie Like Vortigern")) { hit.push({ id: t.id, at, size, dodge: true }); continue; }
      engine.dealMixed(t, LIE_DMG, true);
      const stacks = t.summon ? 0 : Math.min(TWILIGHT_MAX, (t.statuses.twilight || 0));
      if (t.alive && t.hp <= 0) { engine.instantDeath(t); if (!t.alive) { t.pos = null; hit.push({ id: t.id, at, size, dmg: LIE_DMG, kill: true }); continue; } }
      engine.applyDebuff(t, "decay", null, LIE_DECAY);
      let slept = 0;
      if (stacks > 0 && engine.applyDebuff(t, "sleep", null, stacks)) { t.sleepFresh = true; slept = stacks; }
      hit.push({ id: t.id, at, size, dmg: LIE_DMG, sleep: slept });
    }
  });
  engine.log(`🐛 ${p.name} Lie Like Vortigern — ศัตรูทั้งสนามเสียหาย ${LIE_DMG} · ผุพัง ${LIE_DECAY} เทิร์น · หลับไหลตามสนธยา · สนามยืดอีก ${LIE_EXTEND} เทิร์น`);
  fx(engine, p, "lie", { hits: hit });
  return hit;
}

module.exports = {
  id: ID, IMG, VIDEO, CUT, CLIP_SEC, CLIP_SECS, VOICE, SFX, MUSIC,
  HP, ARMOR, MOV, MOV_VESPER, RANGE_VESPER, VESPER, SCRAP, SCYTHE_TURNS, SCYTHE_DRAIN, SCYTHE_DRAIN_FIELD,
  FIELD_TURNS, FIELD_CD, LIE_CD, LIE_EXTEND, LIE_DMG, LIE_DECAY, TWILIGHT_MAX, TWILIGHT_WEAK_AT, CHARGE_POISON, CHARGE_DECAY,
  molt, closeField,

  // ฮุคนี้ถูกเรียกกับผู้เล่นทุกคน — สร้างสถานะเฉพาะตัวของโอเบรอน (Vesper มี { mounted, horseHp } = Eos นับว่าขี่ม้า)
  resetCombat(p) { if (p && p.characterId === ID && !p.summon) p.obv = fresh(); else if (p) delete p.obv; },
  maxHp(p) { return isMe(p) ? HP : null; },
  maxArmor(p) { return isMe(p) ? ARMOR : null; },
  mov(p) { return isMe(p) ? (mounted(p) ? MOV_VESPER : MOV) : null; },
  range(p) { return isMe(p) ? (mounted(p) ? RANGE_VESPER : RANGE) : null; },
  skillRegen(p) { return isMe(p) && fieldMine(p) ? 2 : 1; },
  displayImg(p) { return isMe(p) ? IMG.base : undefined; },
  poisonInverts(p) { return isMe(p) && PassiveSeal.on(p); },
  attackElement(engine, p) { return isMe(p) ? "poison" : null; },
  skillElement(engine, p, tier) { return isMe(p) && tier === "ultimate" && fieldMine(p) ? "poison" : null; },

  // ---------- พลังโจมตี ----------
  damageBonus(engine, p, target) {
    if (!isMe(p)) return 0;
    let n = 0;
    const inField = fieldMine(p);
    if (PassiveSeal.on(p)) {
      if ((p.statuses.poison || 0) > 0) n += 1; // ราชาแห่งการจอมหลอกลวง: พิษกลับเป็น +1
      if (inField) n += 1;                      // ในสนธยา +1
    }
    if (scytheOn(p)) { // โอเบรอนไม่มีสกิลที่ฟันด้วยพลังโจมตี — โบนัสนี้ = ตีปกติ (+ หน้าคาดการณ์)
      if (inField) n += 1; // เคียวในสนธยา +1
      const want = inField ? SCYTHE_DRAIN_FIELD : SCYTHE_DRAIN;
      if (target && !target.summon) n += Math.max(0, want - Math.max(0, target.skillPoints | 0)); // ขาดแต้มละ +1
      else if (target) n += want; // ยูนิตที่ไม่มีแต้ม = โบนัสเต็ม
    }
    return n;
  },
  attackFxNames(p) {
    if (!isMe(p)) return [];
    const out = [];
    if (scytheOn(p)) out.push("เคียวยมทูต");
    if (fieldMine(p)) out.push("สนธยายามค่ำคืน");
    if (PassiveSeal.on(p) && (p.statuses.poison || 0) > 0) out.push("ราชาแห่งการจอมหลอกลวง");
    return out;
  },
  attackStyle(p, dist) {
    if (!isMe(p)) return undefined;
    if (mounted(p)) return "obvCharge";
    if (scytheOn(p)) return "obvScythe";
    return undefined;
  },
  onStrikeLanded(engine, a, t, { counter } = {}) {
    if (!isMe(a) || !t || counter) return [];
    const names = [];
    if (scytheOn(a)) {
      const inField = fieldMine(a);
      const want = inField ? SCYTHE_DRAIN_FIELD : SCYTHE_DRAIN;
      const take = t.summon ? 0 : Math.max(0, Math.min(want, t.skillPoints | 0));
      if (take > 0) { t.skillPoints -= take; engine.addSkill(a, take, "oberon_vortigern"); engine.log(`🩸 ${a.name} เคียวยมทูตดูดแต้มสกิล ${t.name} ${take}`); }
      if (t.alive) { engine.applyDebuff(t, "nohealing", null, SCYTHE_NOHEAL); engine.applyDebuff(t, "manaSeal", null, SCYTHE_SEAL); }
      if (!inField) { const s = st(a); s.fieldReady = Math.max(0, (s.fieldReady || 0) - 1); s.lieReady = Math.max(0, (s.lieReady || 0) - 1); }
      names.push(take > 0 ? `ดูดแต้ม ${take}` : "เคียวยมทูต");
    }
    if (mounted(a) && t.alive) {
      engine.applyPoison(t, CHARGE_POISON);
      engine.applyDebuff(t, "decay", null, CHARGE_DECAY);
      names.push("Vesper ชน");
    }
    return names; // รายการชื่อป้ายฉากตี (array เท่านั้น — สตริงถูกแตกเป็นตัวอักษรทีละแถว · บั๊ก 6.6.1)
  },

  // ---------- เสียง ----------
  voiceLines(p) {
    if (!isMe(p)) return null;
    const s = st(p);
    return { turn: VOICE.turn, struck: VOICE.struck, basic: VOICE.basic, secondary: VOICE.secondary, ultimate: s.ultVoice === "field" ? VOICE.field : [] };
  },
  // พื้นฐาน/รอง = เสียงกระแทก (+ เสียงพากย์จาก voiceLines) · ท่าไม้ตายมีคลิปทั้งสองแบบ = เงียบ
  skillSound(p, tier) { return isMe(p) ? (tier === "basic" ? SFX.scrap : tier === "secondary" ? SFX.scytheOn : null) : null; },
  attackSound(p) {
    if (!isMe(p)) return undefined;
    if (mounted(p)) return SFX.extra;
    if (scytheOn(p)) return SFX.buster;
    return Math.random() < 0.5 ? SFX.quick : SFX.arts;
  },
  skillMusic(engine, p) {
    if (!isMe(p) || !p.alive || !fieldMine(p)) return null;
    return { music: MUSIC, at: st(p).fieldSeq || 0 };
  },
  onKill(engine, killer) { if (isMe(killer)) voice(engine, killer, "kill"); },

  // ---------- Vesper ----------
  absorbDamage(engine, p) { return isMe(p) && PassiveSeal.on(p) && Horse.absorb(engine, p, st(p), vesperCfg); },
  hudActions(engine, p) {
    if (!isMe(p) || !p.alive) return undefined;
    const a = { ...Horse.action(engine, p, st(p)), key: "vesper", icon: "🪲", name: st(p).mounted ? "ลง Vesper" : "ขี่ Vesper", img: IMG.vesper };
    return [PassiveSeal.sealed(p) ? { ...a, disabled: true } : a];
  },
  charAction(engine, p, key) {
    if (!isMe(p) || key !== "vesper" || !PassiveSeal.on(p)) return false;
    const was = st(p).mounted;
    const ok = Horse.toggle(engine, p, st(p), vesperCfg);
    if (ok && !was) voice(engine, p, "vesper");
    return ok;
  },

  // ---------- สกิล ----------
  skillPub(p, tier) {
    if (!isMe(p)) return undefined;
    if (tier === "basic") {
      const items = bagItems(p);
      const one = items.map((it) => ({
        key: it.uid, item: { ...it }, img: IMG.skill1, area: { kind: "self" },
        desc: `ทำลาย 1 ชิ้น: พลังชีวิต +${SCRAP.hp} · เกราะ +${SCRAP.armor} · แต้มสกิล +${SCRAP.sp}`,
      }));
      const all = items.length > 1 ? [{ key: "all", name: `ทั้งหมด ${items.length} ชิ้น`, img: IMG.skill1, area: { kind: "self" },
        desc: `ทำลาย ${items.length} ชิ้น: พลังชีวิต +${SCRAP.hp * items.length} · เกราะ +${SCRAP.armor * items.length} · แต้มสกิล +${SCRAP.sp * items.length}` }] : [];
      return { choices: [...all, ...one] };
    }
    if (tier === "ultimate" && fieldMine(p)) {
      return {
        name: "Lie Like Vortigern", img: IMG.lie, flash: true,
        desc: `ธาตุพิษ · ศัตรูทั้งสนาม: ความเสียหาย ${LIE_DMG} · ผุพัง ${LIE_DECAY} เทิร์น · หลับไหลเท่าสนธยา (ต้านได้ · เสียพลังชีวิต 1 ทะลุเกราะต่อเทิร์น ค้างที่ 1 · ถูกตีตื่น) · สนามยืด ${LIE_EXTEND} เทิร์น (คูลดาวน์ ${LIE_CD} เทิร์น นับหลังสนามหมด)`,
      };
    }
    return undefined;
  },
  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isMe(p)) return true;
    const s = st(p), r = engine.roundNumber;
    if (tier === "basic") {
      const items = bagItems(p);
      if (opts.form === "all") return items.length > 0;
      return items.some((it) => it.uid === opts.form);
    }
    if (tier === "secondary") return !scytheOn(p);
    if (tier === "ultimate") {
      if (fieldMine(p)) return !s.lieUsed && r >= (s.lieReady || 0);
      return !Field().active() && r >= (s.fieldReady || 0) && !!p.pos;
    }
    return true;
  },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isMe(p)) return "";
    const s = st(p);
    if (tier === "basic") {
      const items = opts.form === "all" ? bagItems(p) : bagItems(p).filter((it) => it.uid === opts.form);
      const n = scrap(engine, p, items);
      return n ? ` ${n} ชิ้น` : "";
    }
    if (tier === "secondary") {
      engine.applyBuff(p, "obvScythe", null, SCYTHE_TURNS);
      s.scytheAt = { at: engine.severStamp() };
      engine.log(`⚰️ ${p.name} ชีวิตพวกแกมีค่าพอไหม — เคียวยมทูต ${SCYTHE_TURNS} เทิร์น`);
      fx(engine, p, "scythe");
      return "";
    }
    if (tier === "ultimate") {
      if (fieldMine(p)) {
        // คลิปเต็ม (สุ่มรุนแรง/เย็นชา) → ผลลงหลังคลิป + เอฟเฟกต์บนกระดานต่อจากท้ายคลิป · ไม่มีเสียงพากย์/เอฟเฟกต์ทับคลิป (กฎผู้ใช้ 2026-11-03)
        s.ultVoice = null;
        s.lieUsed = true; // กันกดซ้ำระหว่างคลิป
        engine.queueCutscene(p, Math.random() < 0.5 ? CUT.lieViolent : CUT.lieCold);
        engine.deferAfterCutscene(() => engine.withEffectSource(p, () => lie(engine, p)));
        engine.log(`🐛 ${p.name} Lie Like Vortigern`);
        return "";
      }
      // คลิปเข้าสนธยา → กลืนทุกคนหลังคลิปจบ (ฉากท้ายคลิปดิ่งลงหลุม) · มีคลิป = ไม่พากย์ทับ
      s.ultVoice = null;
      engine.queueCutscene(p, CUT.field);
      engine.deferAfterCutscene(() => engine.withEffectSource(p, () => openField(engine, p)));
      return "";
    }
    return "";
  },
  skillLocks(engine, p) {
    if (!isMe(p)) return undefined;
    const s = st(p), r = engine.roundNumber;
    const ult = fieldMine(p) ? { cd: cdLeft(s.lieReady, r), locked: s.lieUsed } : { cd: cdLeft(s.fieldReady, r), locked: Field().active() };
    return { basic: { locked: !bagItems(p).length }, secondary: { locked: scytheOn(p) }, ultimate: ult };
  },

  // ---------- ต้นเทิร์น ----------
  onRoundStartTick(engine, p) {
    if (isMe(p) && fieldMine(p)) selfPoison(engine, p); // ก่อนติกพิษ (draw.js) — ติดพิษตลอดสนาม
  },
  onRoundDealt(engine) {
    const F = Field();
    if (!F.active()) return;
    const caster = engine.players[F.casterId()];
    if (!caster || !caster.alive) { closeField(engine, "death"); return; }
    if (!isMe(caster)) return; // Echo คืนร่างกลางสนาม: สนามค้างจนหมดเวลา แต่ไม่ให้ผลต่อเทิร์น
    for (const t of engine.alivePlayers()) {
      if (!enemyOf(engine, caster, t) || t.summon) continue;
      const asleep = (t.statuses.sleep || 0) > 0 && !t.sleepFresh;
      const cur = t.statuses.twilight || 0;
      const next = asleep ? Math.max(0, cur - 1) : Math.min(TWILIGHT_MAX, cur + 1); // หลับอยู่ = สนธยาลดตามการหลับ
      if (next > 0) { t.statuses.twilight = next; t.statusAmt.twilight = next; } else { delete t.statuses.twilight; if (t.statusAmt) delete t.statusAmt.twilight; }
      if (next >= TWILIGHT_WEAK_AT) engine.applyDebuff(t, "weak", 1, 1);
    }
    engine.sfx(SFX.twilight);
    rotAll(engine, caster);
    fx(engine, caster, "twilight");
  },
  onEndTurn(engine) {
    const F = Field();
    if (F.active() && engine.roundNumber >= F.untilRound()) closeField(engine, "end");
    // สนามที่หายไปเพราะเปลี่ยนแผนที่ (placeOnBoard) — ตั้งคูลดาวน์ให้เจ้าของ
    for (const p of engine.alivePlayers()) {
      if (!isMe(p) || !p.obv || !p.obv.fieldMine || F.active()) continue;
      p.obv.fieldMine = false; p.obv.fieldAt = null;
      p.obv.fieldReady = engine.roundNumber + 1 + FIELD_CD; p.obv.lieReady = engine.roundNumber + 1 + LIE_CD;
    }
  },
  onDeath(engine, p) {
    if (p && Field().active() && Field().casterId() === p.id) closeField(engine, "death");
  },

  // ---------- ตัดผลสกิล (server/sever.js) ----------
  severables(engine, p) {
    if (!isMe(p)) return [];
    const s = st(p), out = [];
    if (scytheOn(p) && s.scytheAt) out.push({ key: "obvScythe", label: "เคียวยมทูต", at: s.scytheAt.at || 0, cancel() { delete p.statuses.obvScythe; s.scytheAt = null; } });
    if (fieldMine(p) && s.fieldAt) out.push({ key: "obvField", label: "สนธยายามค่ำคืน", at: s.fieldAt.at || 0, cancel() { closeField(engine, "end"); } });
    return out;
  },

  // ---------- ข้อมูลให้ client ----------
  obvState(engine, p) {
    if (!isMe(p)) return undefined;
    const s = st(p);
    return {
      mounted: !!s.mounted && PassiveSeal.on(p), vesperHp: s.horseHp, vesperMax: VESPER.hp, vesperCd: Horse.cooldown(engine, s),
      scythe: scytheOn(p), field: fieldMine(p), vesperImg: IMG.vesper,
    };
  },
};
