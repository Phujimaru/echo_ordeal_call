// ============================================================
//  โจรุโน่ โจวาน่า (JoJo ภาค 5 — Gold Experience) — ระดับปานกลาง · id "giorno_giovanna"
//
//  ค่าพื้นฐาน (สเปกไม่ระบุ → ค่าเริ่มต้น): พลังชีวิต 7 / เกราะ 3 / พลังโจมตี 1 · ระยะเดิน 4 · ตีประชิด [1, 1]
//  สกิลพื้นฐาน ชีวิตทดแทน (1): เลือกไอเทมในกระเป๋า 1 ชิ้นทิ้ง (ทุกชิ้นยกเว้นช่องที่ 6 = นกหวีด ซึ่งไม่อยู่ใน p.inventory)
//    → ฟื้นพลังชีวิต 1 · 2 ครั้งต่อเทิร์น · ไม่นับโควตาสกิล · เลือดเต็ม/กระเป๋าว่าง = กดไม่ได้
//  สกิลรอง จงกำเนิดชีวิตใหม่ (ปุ่ม 2 ตัวเลือก · คูลดาวน์แยกกัน — ผู้ใช้สั่ง):
//    ต้นตอแห่งชีวิต (3 · คูลดาวน์ 2): จนถึงก่อนตาเดินถัดไปของตัวเอง การโจมตีของศัตรู 1 ครั้งที่โดนตัว = ไม่ได้รับความเสียหาย
//      ความเสียหายทั้งหมดสะท้อนกลับใส่ผู้โจมตีแบบเดียวกับที่ได้รับ (เกราะก่อน/ทะลุเกราะ) + ดีบัฟที่การโจมตีนั้นติดให้ไปติดผู้โจมตีแทน
//      "1 ครั้ง" = คำสั่งเดียวของผู้โจมตี (engine.cmdSeq — ตีหลายฮิต/ท่าพื้นที่ทั้งท่านับเป็นครั้งเดียว)
//      สังหารทันทีสะท้อนไม่ได้ (ผู้ใช้สั่ง) · ดาเมจที่ไม่มีคนทำ (ลุกไหม้/เลือดไหล/พื้น) = กันไว้เฉยๆ ไม่เสียผลสะท้อน (ผู้ใช้: "เอาแบบนาย")
//      กลไกกลาง: ฮุค reflectsDamage → combat.adjustIncomingDamage / applyDebuff / engine.applyBleed ฯลฯ
//    จงกำเนิดใหม่ (2 · คูลดาวน์ 2): 1 คนในระยะเดิน (รวมตัวเอง)
//      ตัวเอง/เพื่อน = ต้นไม้ยกตัวลอยขึ้น หลบการโจมตีได้แน่นอน 1 ครั้ง (แม่นยำเจาะได้) · ลอยอยู่ = เดินไม่ได้ จนถึงก่อนตาเดินถัดไปของคนนั้น
//      ศัตรู = ถูกตรึง 1 เทิร์น คลุมตาเดินถัดไปของเป้า (เดินไปแล้วในเทิร์นนี้ = ต่อถึงเทิร์นหน้า · ต้านได้)
//      ฮุคกลาง grantedDodge (broadcast) → attack.strike / skillDodge · คลิป giorno_skill2_2 ครั้งแรกต่อเกม
//  ท่าไม้ตาย Muda!!!!!!! (4): ตีปกติครั้งถัดไป (ค้างจนได้ตี · ตีพลาดก็หมด) —
//    ศัตรู: ฮีล 3 → ล้างดีบัฟล่าสุด 1 → เปราะบาง +1 2 เทิร์น + สตั้น 1 เทิร์น (คลุมตาเดินถัดไป) → แล้วจึงเกิดความเสียหาย (ผู้ใช้สั่งลำดับ)
//    เพื่อน: ฮีล 3 + ล้างดีบัฟ 1 (ไม่มีดาเมจ/เปราะบาง/สตั้น) · คลิป giorno_skill3_hit ทุกครั้งที่ต่อยโดน
//  สกิลติดตัว Gold Experience: ตีปกติที่ไม่มีผลสกิล (ไม่ได้เสริม Muda) คริติคอล 30% (×2) — คลิป giorno_crit ทุกครั้งที่ติด
//    ตีปกติใส่เพื่อนร่วมทีมได้ = ฟื้นพลังชีวิต 1 แทนความเสียหาย (จบตา · ไม่ตีสวน · ไม่ถอย) — action.strikeTarget ฮุค allyStrike
//  สกิลติดตัว เศษเดนมนุษย์อย่างแกน่ะ…: พลังชีวิต ≤ 3 + ตีปกติที่ไม่ได้เสริม Muda → 30% ความเสียหายตายตัว 5 (เกราะก่อน · ไม่คริ)
//    1 ครั้งต่อเกม · คลิป giorno_passive2 เต็ม (32 วิ) ครั้งเดียว
//  เสียง: วีดีโอขึ้น = ไม่มีเสียงเอฟเฟกต์/พากย์ก่อนหรือซ้อน (กฎผู้ใช้ 2026-11-03) · คลิปท่าไม้ตาย/คริเล่นซ้ำได้ อื่นๆ ครั้งเดียว
//  ไฟล์จากผู้ใช้ (Downloads/giono + Gold Experience SFX + เสียงพากย์ ASBR) — ตัดเสียงด้วย ffmpeg (.claude/plans/giorno-media.md)
// ============================================================

const ID = "giorno_giovanna";
const DIR = "/characters/giorno_giovanna";
const IMG = {
  base: `${DIR}/giorno.webp`,
  skill1: `${DIR}/skill1.webp`,
  reflect: `${DIR}/skill2.webp`,
  tree: `${DIR}/tree.webp`,
  skill3: `${DIR}/skill3.webp`,
};
const VIDEO = {
  crit: `${DIR}/giorno_crit.mp4`,
  passive2: `${DIR}/giorno_passive2.mp4`,
  tree: `${DIR}/giorno_skill2_2.mp4`,
  muda: `${DIR}/giorno_skill3_hit.mp4`,
};
const CUT = { crit: "gioCrit", passive2: "gioPassive2", tree: "gioTree", muda: "gioMuda" };
// คีย์ใน client/src/audio.js (ไฟล์ client/public/characters/giorno_giovanna/sfx/ · voice/)
const SFX = {
  life: "gio_life",           // ชีวิตทดแทน: ไอเทมกลายเป็นชีวิต
  reflect: "gio_reflect",     // ต้นตอแห่งชีวิต: ตั้งท่า
  reflectHit: "gio_reflect_hit", // สะท้อนความเสียหายกลับ
  tree: "gio_tree",           // จงกำเนิดใหม่ (หลังคลิปครั้งแรก)
  burst: "gio_burst",         // Muda เสริมหมัด
  punch: "gio_punch",         // ตีปกติ
  heal: "gio_punch2",         // ตีเพื่อน = ฟื้นพลังชีวิต
};
// เสียงพากย์ (ตัดจากไฟล์ ASBR ของผู้ใช้ — client/public/characters/giorno_giovanna/voice/) · สุ่ม 1 ต่อเหตุการณ์ · มีคลิป = เงียบ
const VOICE = {
  turn: ["gio_v_turn1", "gio_v_turn2", "gio_v_turn3"],           // ゴールド・エクスペリエンス! · やるしかない · 行きますよ
  strike: ["gio_v_hit1", "gio_v_hit2", "gio_v_hit3", "gio_v_hit4", "gio_v_hit5"], // どうだ、くらえ! · そりゃ · そこだ!貰った! · 無駄だ! ×2
  basic: ["gio_v_life1", "gio_v_life2"],                          // 生まれろ、生命よ
  reflect: ["gio_v_reflect1", "gio_v_reflect2"],                  // 鋭い痛みをゆっくり味わえ · 味わいな!
  tree: ["gio_v_tree1", "gio_v_tree2"],                           // 生まれ変わらせた! · 命を生み出す
  ultimate: ["gio_v_ult1", "gio_v_ult2"],                         // 無駄無駄無駄…!
  heal: ["gio_v_heal1", "gio_v_heal2"],                           // 援護します! · 傷を見せてください
};

const LIFE_COST_ITEMS = 1;
const LIFE_HEAL = 1;
const LIFE_PER_TURN = 2;
const REFLECT_COST = 3;
const TREE_COST = 2;
const REFLECT_CD = 2;
const TREE_CD = 2;
const ROOT_TURNS = 1;
const MUDA_HEAL = 3;
const MUDA_FRAGILE = 1;
const MUDA_FRAGILE_TURNS = 2;
const MUDA_STUN_TURNS = 1;
const CRIT_PCT = 30;
const ALLY_HEAL = 1;
const RAGE_HP = 3;
const RAGE_PCT = 30;
const RAGE_DMG = 5;
const ALLY_STRIKE_SECONDS = 1.4;

// skillPub ไม่ได้รับ engine — require ตอนเรียก (กัน require วน)
const engineNow = () => require("../server/engine").engine;
const isGio = (p) => !!p && p.characterId === ID && !p.summon;
function fresh() {
  return {
    lifeRound: 0, lifeUses: 0,  // ชีวิตทดแทน: กดไปกี่ครั้งในเทิร์น lifeRound
    reflect: null,              // { round, acted, seq, at } — ต้นตอแห่งชีวิต
    reflectReady: 0, treeReady: 0, // ใช้ได้อีกตั้งแต่เทิร์นนี้ (0 = ได้)
    muda: false, mudaAt: 0,     // Muda!!!!!!! เสริมตีปกติครั้งถัดไป
    mudaHit: false,             // ตีครั้งนี้ลง Muda (ป้าย/คลิป)
    rageUsed: false, rageNow: false, // เศษเดนมนุษย์: ใช้ไปแล้ว / ติดในการตีครั้งนี้
    clipNext: null,             // คลิปก่อนฉากตีปกติ (preAttackClip)
    clipNow: false,             // ปุ่มที่เพิ่งกดเล่นคลิป (skillSound/เสียงพากย์เงียบ)
  };
}
function st(p) { return p.giorno || (p.giorno = fresh()); }
const cdLeft = (ready, round) => Math.max(0, (ready || 0) - round);
const pick = (list) => (list && list.length ? list[Math.floor(Math.random() * list.length)] : null);

// ---------- ช่วงเวลา "ถึงก่อนตาเดินถัดไปของ t" ----------
//  w = { round, acted } (acted = t เดินไปแล้ว/กำลังเดินตอนได้รับ → ตาถัดไปอยู่เทิร์นหน้า)
function windowOpen(engine, t, w) {
  if (!w || !t || !t.alive) return false;
  const r = engine.roundNumber;
  const waiting = engine.actorId !== t.id && !engine.hasActed(t.id);
  if (w.acted) return r === w.round || (r === w.round + 1 && waiting);
  return r === w.round && waiting;
}
// ผลแบบ "1 ครั้ง": ใช้ไปในคำสั่งอื่นแล้ว = หมด (คำสั่งเดียวกันยังใช้ต่อได้ — ตีหลายฮิต/ท่าพื้นที่)
const spent = (engine, w) => w.seq != null && w.seq !== engine.cmdSeq;
const live = (engine, t, w) => windowOpen(engine, t, w) && !spent(engine, w);
function windowFor(engine, t) {
  return { round: engine.roundNumber, acted: engine.actorId === t.id || engine.hasActed(t.id), seq: null, at: engine.severStamp() };
}

function clipOnce(engine, p, key) {
  p.cutsceneShown ||= {};
  if (p.cutsceneShown[key]) return false;
  p.cutsceneShown[key] = true;
  engine.queueCutscene(p, key);
  return true;
}
function fx(engine, p, kind, extra = {}) {
  if (!p || !p.pos) return;
  engine.boardFx("giornoFx", { kind, id: p.id, at: { ...p.pos }, size: engine.sizeOf(p), color: engine.colorOf(p), ...extra });
}
function voice(engine, p, event) {
  const key = pick(VOICE[event]);
  if (key) engine.sfx(key, null, { voice: p.id });
}

const friendOf = (engine, p, t) => !!t && (t.id === p.id || engine.sameTeam(p, t));
const reflectOn = (engine, p) => isGio(p) && !!st(p).reflect && live(engine, p, st(p).reflect);
const treeOn = (engine, t) => !!t && !!t.giornoTree && live(engine, t, t.giornoTree);

// ---------- ชีวิตทดแทน ----------
function lifeUses(engine, p) { const s = st(p); return s.lifeRound === engine.roundNumber ? s.lifeUses : 0; }
const bagItems = (p) => (p.inventory || []).filter((it) => it && it.uid);

// ---------- Muda!!!!!!! ----------
// ลงผลก่อนความเสียหาย (ศัตรู) / แทนความเสียหาย (เพื่อน) → ป้ายฉากตี
function mudaLand(engine, p, t, foe) {
  const out = [];
  const healed = engine.healHp(t, MUDA_HEAL);
  out.push(`Muda!!!!!!! — ฟื้นพลังชีวิต +${healed}`);
  const cleared = engine.cleanseLatestDebuff(t);
  if (cleared) out.push("ล้างดีบัฟ 1");
  if (foe) {
    const acted = engine.actorId === t.id || engine.hasActed(t.id);
    if (engine.applyDebuff(t, "fragile", MUDA_FRAGILE, MUDA_FRAGILE_TURNS)) out.push(`เปราะบาง +${MUDA_FRAGILE}`);
    if (engine.applyDebuff(t, "stun", 1, MUDA_STUN_TURNS + (acted ? 1 : 0))) out.push("สตั้น");
  }
  engine.log(`👊 ${p.name} Muda!!!!!!! → ${t.name} ฟื้นพลังชีวิต +${healed}${cleared ? " · ล้างดีบัฟ 1" : ""}${foe ? " · เปราะบาง + สตั้น" : ""}`);
  fx(engine, t, "muda", { from: p.id });
  return out;
}

module.exports = {
  id: ID,
  IMG, VIDEO, CUT, SFX, CRIT_PCT, RAGE_DMG, RAGE_PCT, RAGE_HP, MUDA_HEAL, ALLY_HEAL, LIFE_PER_TURN,
  REFLECT_COST, TREE_COST, REFLECT_CD, TREE_CD,
  isGio, treeOn, reflectOn,

  resetCombat(p) {
    p.giorno = isGio(p) ? fresh() : null;
    p.giornoTree = null;
  },

  // ---------- ตีปกติ ----------
  critPct(p) { return isGio(p) && !st(p).muda ? CRIT_PCT : 0; },
  attackStyle(p) { return isGio(p) ? "gioPunch" : null; }, // หมัดทองรัว (client/src/board/giornoFx.js)
  attackSound(p) { return isGio(p) ? SFX.punch : undefined; },
  // เศษเดนมนุษย์อย่างแกน่ะ…: ทอยเฉพาะตอนเข้าเงื่อนไข (ไม่แตะ Math.random ของคนอื่น)
  fixedStrikeDamage(engine, attacker, target, ctx = {}) {
    if (!isGio(attacker) || ctx.estimate || ctx.counter) return null;
    const s = st(attacker);
    if (s.muda || s.rageUsed || attacker.hp > RAGE_HP) return null;
    if (Math.random() * 100 >= RAGE_PCT) return null;
    s.rageUsed = true;
    s.rageNow = true;
    s.clipNext = CUT.passive2;
    engine.log(`💢 ${attacker.name} เศษเดนมนุษย์อย่างแกน่ะ… — ความเสียหาย ${RAGE_DMG}`);
    return RAGE_DMG;
  },
  attackFxNames(attacker) {
    if (!isGio(attacker)) return [];
    const s = st(attacker);
    if (!s.rageNow) return [];
    s.rageNow = false;
    return [`เศษเดนมนุษย์อย่างแกน่ะ… ${RAGE_DMG}`];
  },
  beforeStrikeHit(engine, attacker, target, { counter } = {}) {
    if (!isGio(attacker) || counter || !st(attacker).muda) return [];
    st(attacker).mudaHit = true;
    return mudaLand(engine, attacker, target, true);
  },
  // ตีจบ 1 ครั้ง (โดน/พลาด) → Muda หมด
  onStrikeResolved(engine, attacker, target, res, { counter } = {}) {
    if (!isGio(attacker) || counter) return;
    const s = st(attacker);
    if (s.muda) { s.muda = false; if (!s.mudaHit) engine.log(`👊 ${attacker.name} Muda!!!!!!! พลาด — หมดลง`); }
    if (s.mudaHit) { s.mudaHit = false; s.clipNext = CUT.muda; }
  },
  // คลิปก่อนฉากตี: Muda (ทุกครั้ง) > เศษเดนมนุษย์ (ครั้งเดียว) > คริ (ทุกครั้ง) · ไม่มีคลิป = เสียงพากย์ตอนตี
  preAttackClip(engine, attacker, card) {
    if (!isGio(attacker)) return null;
    const s = st(attacker);
    const clip = s.clipNext || (card && card.crit ? CUT.crit : null);
    s.clipNext = null;
    if (!clip) voice(engine, attacker, "strike");
    return clip;
  },
  voiceLines(p) { return isGio(p) ? { turn: VOICE.turn } : null; }, // ที่เหลือเล่นเองตามว่ามีคลิปไหม

  // ---------- ตีปกติใส่เพื่อนร่วมทีม (action.strikeTarget) → วินาทีของฉาก ----------
  strikesAllies(p) { return isGio(p); },
  allyHealOn(engine, p) { return isGio(p) ? (st(p).muda ? MUDA_HEAL : ALLY_HEAL) : null; }, // หน้าคาดการณ์
  allyStrike(engine, p, t) {
    if (!isGio(p) || !t || !t.alive || !engine.sameTeam(p, t)) return 0;
    const s = st(p);
    if (s.muda) {
      s.muda = false;
      mudaLand(engine, p, t, false);
      engine.queueCutscene(p, CUT.muda);
      return ALLY_STRIKE_SECONDS;
    }
    const healed = engine.healHp(t, ALLY_HEAL);
    engine.log(`✨ ${p.name} Gold Experience → ${t.name} ฟื้นพลังชีวิต +${healed}`);
    fx(engine, t, "heal", { from: p.id, n: healed });
    engine.sfx(SFX.heal);
    voice(engine, p, "heal");
    return ALLY_STRIKE_SECONDS;
  },

  // ---------- จงกำเนิดใหม่: หลบได้แน่นอน 1 ครั้ง (ใครก็ได้ที่มีต้นไม้ — broadcast) ----------
  grantedDodge(engine, target) {
    if (!treeOn(engine, target)) return null;
    target.giornoTree.seq = engine.cmdSeq;
    fx(engine, target, "dodge");
    return { name: "จงกำเนิดใหม่ — หลบหลีก", img: IMG.tree };
  },
  dodgeSure(engine, target) { return treeOn(engine, target); }, // หน้าคาดการณ์ (ไม่ใช้ผล)
  // ลอยบนต้นไม้ = เดินไม่ได้ (broadcast movBlocked)
  movBlocked(engine, p) { return treeOn(engine, p); },

  // ---------- ต้นตอแห่งชีวิต (combat — ฮุคของเป้า) ----------
  reflectsDamage(engine, p, src) {
    if (!reflectOn(engine, p) || !src || src.id === p.id) return null;
    st(p).reflect.seq = engine.cmdSeq;
    return { name: "ต้นตอแห่งชีวิต", img: IMG.reflect };
  },
  // ความเสียหายที่ไม่มีต้นตอ (ลุกไหม้/เลือดไหล/พื้น/ชน) ระหว่างต้นตอแห่งชีวิต = กันไว้เฉยๆ ไม่เสียผลสะท้อน
  adjustIncomingDamage(engine, p, n) {
    if (!isGio(p) || !(n > 0) || !reflectOn(engine, p)) return n;
    return engine.effectSourceId ? n : 0;
  },
  // หลังสะท้อน (combat.reflectBack) · inStrike = ในฉากตีปกติ (ไม่มีเสียง — คลิปก่อนฉากตีของผู้ตีอาจตามมา · ป้ายฉากตีบอกแทน)
  onReflected(engine, p, src, n, { inStrike } = {}) {
    if (!isGio(p)) return;
    fx(engine, p, "reflectHit", { to: src.id, toAt: src.pos ? { ...src.pos } : null, n });
    if (!inStrike) engine.sfx(SFX.reflectHit);
  },

  // ---------- สกิล ----------
  skillPub(p, tier) {
    if (!isGio(p)) return null;
    const s = st(p);
    const eng = engineNow();
    const round = eng.roundNumber;
    if (tier === "basic") {
      const uses = lifeUses(eng, p);
      const full = p.hp >= eng.maxHpOf(p);
      return {
        choices: bagItems(p).map((it) => ({
          key: it.uid, item: { ...it }, img: IMG.skill1, cost: LIFE_COST_ITEMS, area: { kind: "self" },
          desc: `ฟื้นพลังชีวิต ${LIFE_HEAL}`, locked: uses >= LIFE_PER_TURN || full, left: LIFE_PER_TURN - uses, free: true,
        })),
      };
    }
    if (tier === "secondary") {
      const rcd = cdLeft(s.reflectReady, round), tcd = cdLeft(s.treeReady, round);
      return {
        choices: [
          { key: "reflect", name: "ต้นตอแห่งชีวิต", img: IMG.reflect, cost: REFLECT_COST, area: { kind: "self" }, cd: rcd, locked: rcd > 0 || reflectOn(eng, p),
            desc: `ถึงตาเดินถัดไป: ศัตรูโจมตีโดน 1 ครั้ง = ไม่เสียหาย สะท้อนความเสียหายและดีบัฟกลับ (คูลดาวน์ ${REFLECT_CD} เทิร์น)` },
          { key: "tree", name: "จงกำเนิดใหม่", img: IMG.tree, cost: TREE_COST, area: { kind: "target", range: "mov", self: true }, cd: tcd, locked: tcd > 0,
            desc: `1 คนในระยะเดิน: ตัวเอง/เพื่อน ลอยบนต้นไม้ หลบได้แน่นอน 1 ครั้ง เดินไม่ได้ ถึงตาเดินถัดไป · ศัตรู ถูกตรึง ${ROOT_TURNS} เทิร์น (คูลดาวน์ ${TREE_CD} เทิร์น)` },
        ],
      };
    }
    if (tier === "ultimate") return s.muda ? { active: true } : null;
    return null;
  },
  skillCost(p, tier, base, opts = {}) {
    if (!isGio(p) || tier !== "secondary") return base;
    return opts.form === "tree" ? TREE_COST : opts.form === "reflect" ? REFLECT_COST : base;
  },
  skillArea(p, tier, area, opts = {}) {
    if (!isGio(p) || tier !== "secondary") return area;
    return opts.form === "tree" ? { kind: "target", range: "mov", self: true } : { kind: "self" };
  },
  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isGio(p)) return true;
    const s = st(p);
    if (tier === "basic") {
      if (lifeUses(engine, p) >= LIFE_PER_TURN || p.hp >= engine.maxHpOf(p)) return false;
      return bagItems(p).some((it) => it.uid === opts.form);
    }
    if (tier === "secondary") {
      if (opts.form === "reflect") return cdLeft(s.reflectReady, engine.roundNumber) === 0 && !reflectOn(engine, p);
      if (opts.form === "tree") {
        const t = engine.players[(targets || [])[0]];
        return cdLeft(s.treeReady, engine.roundNumber) === 0 && !!t && t.alive;
      }
      return false;
    }
    if (tier === "ultimate") return !s.muda;
    return true;
  },
  skipsTurnQuota(p, tier) { return isGio(p) && tier === "basic"; },
  ignoresTurnQuota(p, tier) { return isGio(p) && tier === "basic"; },
  skillSound(p, tier, opts = {}) {
    if (!isGio(p)) return null;
    const s = st(p);
    if (s.clipNow) { s.clipNow = false; return null; }
    if (tier === "basic") return SFX.life;
    if (tier === "secondary") return opts.form === "tree" ? SFX.tree : SFX.reflect;
    return SFX.burst;
  },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isGio(p)) return "";
    const s = st(p);
    s.clipNow = false;
    if (tier === "basic") {
      const idx = (p.inventory || []).findIndex((it) => it.uid === opts.form);
      if (idx < 0) return "";
      const [item] = p.inventory.splice(idx, 1);
      if (s.lifeRound !== engine.roundNumber) { s.lifeRound = engine.roundNumber; s.lifeUses = 0; }
      s.lifeUses++;
      const healed = engine.healHp(p, LIFE_HEAL);
      engine.log(`🌱 ${p.name} ชีวิตทดแทน — สละ${item.type ? "ไอเทม" : ""} 1 ชิ้น ฟื้นพลังชีวิต +${healed}`);
      fx(engine, p, "life", { n: healed });
      voice(engine, p, "basic");
      return ` +${healed}`;
    }
    if (tier === "secondary" && opts.form === "reflect") {
      s.reflect = windowFor(engine, p);
      s.reflectReady = engine.roundNumber + REFLECT_CD + 1;
      fx(engine, p, "reflect");
      voice(engine, p, "reflect");
      engine.log(`🐍 ${p.name} ต้นตอแห่งชีวิต — การโจมตีครั้งถัดไปของศัตรูจะสะท้อนกลับ`);
      return "";
    }
    if (tier === "secondary" && opts.form === "tree") {
      const t = engine.players[(targets || [])[0]];
      s.treeReady = engine.roundNumber + TREE_CD + 1;
      s.clipNow = clipOnce(engine, p, CUT.tree);
      if (!s.clipNow) voice(engine, p, "tree");
      if (!t) return "";
      if (friendOf(engine, p, t)) {
        t.giornoTree = { ...windowFor(engine, t), by: p.id };
        fx(engine, t, "tree");
        engine.log(`🌳 ${p.name} จงกำเนิดใหม่ → ${t.name} ลอยขึ้นบนต้นไม้ (หลบได้ 1 ครั้ง)`);
        return t.id === p.id ? "" : ` → ${t.name}`;
      }
      const acted = engine.actorId === t.id || engine.hasActed(t.id);
      const ok = engine.applyDebuff(t, "rooted", 1, ROOT_TURNS + (acted ? 1 : 0));
      fx(engine, t, "root");
      engine.log(ok ? `🌳 ${p.name} จงกำเนิดใหม่ → ${t.name} ถูกตรึง ${ROOT_TURNS} เทิร์น` : `🌳 ${t.name} ต้านการตรึงได้`);
      return ` → ${t.name}`;
    }
    if (tier === "ultimate") {
      s.muda = true;
      s.mudaAt = engine.severStamp();
      fx(engine, p, "burst");
      voice(engine, p, "ultimate");
      engine.log(`👊 ${p.name} Muda!!!!!!! — ตีปกติครั้งถัดไปเสริมพลังชีวิต`);
      return "";
    }
    return "";
  },

  // ---------- ต้นตาเดินของตัวเอง: ต้นตอแห่งชีวิต/ต้นไม้ที่ไม่ได้ใช้หมดลง (ล้างค้าง — ช่วงเวลาคิดจาก windowOpen อยู่แล้ว) ----------
  onActorStart(engine, p) {
    if (!isGio(p)) return;
    const s = st(p);
    if (s.reflect && !windowOpen(engine, p, s.reflect)) s.reflect = null;
  },
  onEndTurn(engine) {
    for (const u of Object.values(engine.players)) {
      if (u.giornoTree && !windowOpen(engine, u, u.giornoTree) && engine.roundNumber > u.giornoTree.round + 1) u.giornoTree = null;
    }
  },

  // ---------- ตัดผลสกิล (server/sever.js) ----------
  severables(engine, p) {
    if (!isGio(p)) return [];
    const s = st(p);
    const out = [];
    if (reflectOn(engine, p)) out.push({ key: "gioReflect", label: "ต้นตอแห่งชีวิต", at: s.reflect.at || 0, cancel() { s.reflect = null; } });
    if (s.muda) out.push({ key: "gioMuda", label: "Muda!!!!!!!", at: s.mudaAt || 0, cancel() { s.muda = false; } });
    for (const u of Object.values(engine.players)) {
      if (treeOn(engine, u) && u.giornoTree.by === p.id) out.push({ key: `gioTree:${u.id}`, label: "จงกำเนิดใหม่", at: u.giornoTree.at || 0, cancel() { u.giornoTree = null; } });
    }
    return out;
  },

  // ---------- ข้อมูลให้ client ----------
  //  ทุกคน (ต้นไม้อยู่บนใครก็ได้) — view.buildStateFor players[].giorno
  unitMark(engine, p) {
    const tree = treeOn(engine, p);
    const mine = isGio(p);
    const reflect = mine && reflectOn(engine, p);
    const muda = mine && st(p).muda;
    if (!tree && !reflect && !muda && !mine) return undefined;
    return {
      tree, reflect, muda,
      ...(mine ? { lifeLeft: LIFE_PER_TURN - lifeUses(engine, p), reflectCd: cdLeft(st(p).reflectReady, engine.roundNumber), treeCd: cdLeft(st(p).treeReady, engine.roundNumber), rage: !st(p).rageUsed } : {}),
    };
  },
  skillLocks(engine, p) {
    if (!isGio(p)) return undefined;
    const s = st(p);
    return {
      basic: { locked: lifeUses(engine, p) >= LIFE_PER_TURN, free: true },
      ultimate: { locked: s.muda },
    };
  },
};
