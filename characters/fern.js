// ============================================================
//  เฟิร์น (Fern — Frieren: Beyond Journey's End) — ระดับง่าย · id "fern" · กติกาที่ผู้ใช้ตัดสิน GRID_PLAN §7.14
//
//  ค่าพื้นฐาน: พลังชีวิต 5 · เกราะ 2 · ระยะเดิน 3 · ตีปกติแนวตรง [1, 3] (attackLane — ทะลุสิ่งกีดขวาง โดนศัตรูทุกคนในแนว)
//  Energy = แต้มสกิล (p.skillPoints) เพดาน 10 (maxSkill) · เริ่มเกมเต็ม 10 (resetCombat)
//    ฟื้นได้จากซ่อนเร้นมานาเท่านั้น — ฮุค blocksSkillGain กันทุกทางอื่นใน combat.addSkill (จบเทิร์น/โบนัสกลางวัน/ไอเทม/ไพ่เหลือง/
//    ยูนะ/ฟื้นพลัง/ห่วงเวลาซีโร่/สกิลติดตัว) + เงินคืนของการเดินทาง (skills.js) · ฟื้นของตัวเองส่ง src "fern"
//    (ชะงัก/ผนึกพลังงานยังกันได้ — Claude ตัดสิน) · ภาษีกลางคืนคิดตามปกติ (Claude ตัดสิน)
//  ตีปกติ Zoltraak: 2 Energy ต่อการตี 1 ครั้ง (ไม่ใช่ต่อคนที่โดน — onStrikeResolved เรียกครั้งเดียวต่อการตี) · ดาเมจฐาน 2
//    (attackBaseOverride — บัฟ/คริบวกต่อ) · Energy ไม่ถึง 2 = range [1, 0] (ตีไม่ได้) · ไม่มีตีสวน (ปิดทั้งเกม — GRID_PLAN §6)
//  ติดตัว Defensive Magic: ศัตรูโจมตีใส่ (ตีปกติ/ปืน/สกิล — ไม่นับดาเมจที่ไม่มีผู้ลงมือ: ลุกไหม้/เลือดไหล/ผลต่อเทิร์น/ช่องพื้น)
//    ขณะพร้อม = การโจมตีนั้นทั้งก้อนเป็น 0 (ฮุค onAttacked + blocksAttack — คีย์ ผู้โจมตี|เทิร์น|ตาเดิน|commandSeq)
//    · ไม่นับว่าถูกโจมตี (ซ่อนเร้น/ชาร์จไม่หลุด) · กันเทิร์น N → พร้อมอีก N+2 · ทำงานก่อนทอยหลบ (หลบพ้นก็ใช้ไป)
//  สกิลพื้นฐาน ร่ายต่อเนื่อง (2 Energy · ใช้กับตัวเอง): ตุนตีปกติ +1 ครั้งในตาเดินนี้ (ฮุค extraStrike — ตีแล้วกลับเข้าตา)
//    · 2 ครั้งต่อตาเดิน (ครั้งที่ 2 ไม่ใช้โควตา) · กดเทิร์น N → กดได้อีก N+2 · ที่ตุนไว้หายตอนจบตาเดิน
//  สกิลรอง ซ่อนเร้นมานา (ฟรี): เข้า = ล่องหนอยู่กับที่ (ศัตรูระยะ 2 เห็น — ฮุค seenBy) · Energy +3 · ต้นเทิร์น +1 · ฟื้นพลังชีวิต 1
//    ทุก 2 เทิร์น (ต้นเทิร์น N+2, N+4 …) · ทำอะไรไม่ได้นอกจากกดยกเลิก (เดิน/ตี/สกิลอื่น/ปืน/ไอเทม) · เข้าไม่กินโควตา · ยกเลิกฟรีจริง
//    (skillFree — ไม่คิดภาษีกลางคืน) ไม่ใช้โควตา แล้วตาเดินนั้นตี/ใช้สกิลต่อได้ · คูลดาวน์ 3 นับจากเทิร์นที่ออก
//    · ศัตรูโจมตีใส่ (ไม่ถูกกัน · หลบพ้นก็นับ) = หลุดทันที + สตั้นเต็มเทิร์นถัดไป (onEndTurn — ใส่ตรง ไม่ทอยต้าน: เป็นโทษของตัวเอง)
//    · กดเข้าเงียบ: ไม่ขึ้นป้ายกลาง (silentFlash) · เสียง/เอฟเฟกต์เฉพาะฝ่ายตัวเอง
//  ท่าไม้ตาย Orbital Cannon Zoltraak (4 Energy · คูลดาวน์ 4 นับจากเทิร์นที่ยิง/ถูกยกเลิก):
//    กดเทิร์น N: เลือกช่องว่างช่องไหนก็ได้ → วาร์ป + ล่องหนเต็ม (คลิป fernUltIntro) · ตานั้นทำอะไรต่อไม่ได้ (ไอเทมได้)
//    ชาร์จ N+1..N+3: จั่วไม่ได้ (holdsDraw) · เดิน/ตี/สกิลอื่น/ปืนไม่ได้ · ต้นเทิร์นเผยตัวจนถึงตาเดินของตัวเอง (onActorStart)
//    ตาเดินเทิร์น N+k: ปุ่มกลายเป็นยิง (ฟรี · target 1 คนในกรอบ 7×7 square) ดาเมจ 2+k (3/4/5) หลบไม่ได้ · เกราะรับก่อน · ฆ่าได้
//      (คุ้มครองลด · เปราะบางเพิ่ม — แบบรองโกมิเนียตของเกรย์ · Claude ตัดสิน) · ไม่ยิง = รอ ชาร์จต่อ
//    ชาร์จครบ 3 แล้วจบตาโดยไม่ยิง (รอ/หมดเวลา) = ยิงศัตรูที่มองเห็นใกล้สุดในกรอบเอง (beforeActorEnd) · ไม่มี = จบท่าเปล่า
//    ถูกข้ามตา (สตั้น) = ชาร์จค้างที่ 3 แล้วยิงตาเดินถัดไปที่ขยับได้ (แบบเกรย์ — Claude ตัดสิน)
//    ศัตรูโจมตีใส่ระหว่างชาร์จ (ไม่ถูกกัน) = ยกเลิกทันที ไม่คืน Energy · ตาย = ยกเลิก
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
const VIDEO = { intro: `${DIR}/fern_ult_1.mp4`, final: `${DIR}/fern_ult_2.mp4` };
const CUT = { intro: "fernUltIntro", final: "fernUltFinal" };
// เสียง (client/src/audio.js — ไฟล์อยู่ client/public/characters/fern/sfx/)
const SFX = {
  zoltraak: "fern_zoltraak", cast: "fern_cast", conceal: "fern_conceal", unveil: "fern_unveil",
  shield: "fern_shield", teleport: "fern_teleport", charge: "fern_charge", cannon: "fern_cannon",
};
const FX = "fernFx"; // socket event (client/src/board/fernFx.js)
const STYLE = "fernZoltraak"; // ท่าตีปกติบนกระดาน (client STYLE_MS / STYLE_HIT_P)

const HP = 5;
const ARMOR = 2;
const ENERGY_MAX = 10;
const ZOLT_COST = 2;
const ZOLT_DMG = 2;
const SHIELD_CD = 2;
const CAST_MAX = 2;      // ร่ายต่อเนื่อง: กดได้ต่อตาเดิน
const CAST_CD = 2;       // กดเทิร์น N → กดได้อีก N+2
const CONCEAL_GAIN = 3;
const CONCEAL_REGEN = 1;
const CONCEAL_HEAL = 1;
const CONCEAL_HEAL_EVERY = 2;
const CONCEAL_SIGHT = 2; // ศัตรูในระยะนี้ (แมนฮัตตัน · กรอบตัว) มองเห็น
const CONCEAL_CD = 3;
const STUN_TURNS = 1;
const ULT_CD = 4;
const ULT_CHARGE_MAX = 3;
const ULT_BASE = 2;      // ดาเมจ = 2 + เทิร์นที่ชาร์จ (3/4/5)
const FIRE_AREA = { kind: "target", range: 3, square: true, hostile: true };
// จังหวะบนกระดาน (ต้องตรงกับ client/src/board/fernFx.js)
const CANNON_HIT = 1.4;
const CANNON_TAIL = 0.8;
const NO_STRIKE = [1, 0];

const isFern = (p) => !!p && p.characterId === ID;
// ฮุคที่ไม่ได้รับ engine (skillArea / skillPub / ignoresTurnQuota) อ่านเลขเทิร์นจาก engine กลาง (require ตอนเรียก — กันวน)
function eng() { return require("../server/engine").engine; }
function fresh() {
  return {
    shieldReady: 0,   // Defensive Magic พร้อมเมื่อ roundNumber >= ค่านี้
    blockKey: null,   // คีย์การโจมตีที่กำลังถูกกัน (ทุกจังหวะของการโจมตีเดียวกัน = 0)
    hitKey: null,     // คีย์การโจมตีที่นับว่าถูกโจมตีไปแล้ว (ไม่หลุดซ้ำ)
    castRound: 0,     // ร่ายต่อเนื่อง: เทิร์นล่าสุดที่กด
    casts: 0,         // ครั้งที่กดในตาเดินนี้
    castReady: 0,     // กดได้อีกเมื่อ roundNumber >= ค่านี้ (ยกเว้นเทิร์นเดียวกับที่กด)
    extra: 0,         // ตีปกติที่ตุนไว้ในตาเดินนี้
    conceal: null,    // ซ่อนเร้นมานา { since, healAt }
    concealReady: 0,
    stunPending: false,
    ult: null,        // Orbital Cannon Zoltraak ที่กำลังชาร์จ { cast, revealed }
    ultReady: 0,
    last: null,       // ผลของการกดล่าสุด (silentFlash/skillSound อ่านหลัง applyInstantSkill) "enter" | "exit" | "warp" | "fire" | "cast"
  };
}
function st(p) { return p.fern || (p.fern = fresh()); }
const cdLeft = (ready, round) => Math.max(0, (ready || 0) - round);
const concealOn = (p) => isFern(p) && !!st(p).conceal;
const charging = (p) => isFern(p) && !!st(p).ult;
const busy = (p) => concealOn(p) || charging(p);
// เทิร์นที่ชาร์จแล้ว (0 = เทิร์นที่กด · สูงสุด 3)
function chargeOf(engine, p) {
  const u = st(p).ult;
  return u ? Math.max(0, Math.min(ULT_CHARGE_MAX, engine.roundNumber - u.cast)) : null;
}
const canFire = (engine, p) => charging(p) && chargeOf(engine, p) >= 1;
const castsNow = (engine, s) => (s.castRound === engine.roundNumber ? s.casts : 0);
function castOpen(engine, p) {
  const s = st(p), r = engine.roundNumber;
  if (castsNow(engine, s) >= CAST_MAX) return false;
  return s.castRound === r ? s.casts > 0 || r >= s.castReady : r >= s.castReady;
}
// ตัวเอง + เพื่อนร่วมทีม (เห็นการเข้าซ่อนเร้น / จุดวาร์ป)
function audience(engine, p) {
  const out = [p.id];
  if (engine.teamModeActive() && p.teamId) for (const o of Object.values(engine.players)) if (o.id !== p.id && o.teamId === p.teamId && !o.duoOf) out.push(o.id);
  return out;
}
// ผู้ชมที่มองเห็นเฟิร์นอยู่ตอนนี้ (เอฟเฟกต์ที่บอกตำแหน่ง — โล่ Defensive Magic ระหว่างซ่อนเร้น)
function watchers(engine, p) {
  return Object.values(engine.players).filter((o) => !o.duoOf && (o.id === p.id || !engine.hiddenFrom(o, p))).map((o) => o.id);
}
function fx(engine, p, kind, extra, onlyFor) {
  const payload = { kind, id: p.id, ...(p.pos ? { at: { ...p.pos } } : {}), ...extra };
  if (onlyFor) engine.boardFxTo(onlyFor, FX, payload);
  else engine.boardFx(FX, payload);
}
function gainEnergy(engine, p, n) {
  const before = p.skillPoints;
  engine.addSkill(p, n, "fern");
  return p.skillPoints - before;
}
// ดาเมจที่ลงจริง: เลือด + เกราะ + โล่ + เลือดชั่วคราว + เกราะชุด Mark 42
function pool(t) {
  return (t.hp || 0) + (t.armor || 0) + (t.shield || 0) + (t.tempHp || 0) + (t.mark42 ? t.mark42.armor || 0 : 0);
}

// ---------- การโจมตีครั้งเดียวกัน (Defensive Magic) ----------
//  ทุกคำสั่งของผู้เล่นได้เลขใหม่ (TimeStop.guard) · ผลที่ลงทีหลังในฉากใช้เลขเดิม · ต้นเทิร์น/ต้นตาเดินแยกด้วยผู้ที่กำลังเดิน
function attackKey(engine, src) {
  return `${src.id}|${engine.roundNumber}|${engine.actorId || ""}|${engine.commandSeq}`;
}
function shieldReady(engine, p) { return engine.roundNumber >= st(p).shieldReady; }

// ---------- ซ่อนเร้นมานา ----------
function enterConceal(engine, p) {
  const s = st(p), r = engine.roundNumber;
  s.conceal = { since: r, healAt: r + CONCEAL_HEAL_EVERY };
  const got = gainEnergy(engine, p, CONCEAL_GAIN);
  const own = audience(engine, p);
  fx(engine, p, "conceal", {}, own);
  engine.sfx(SFX.conceal, own);
  s.last = "enter";
  return got;
}
function exitConceal(engine, p, why) {
  const s = st(p);
  if (!s.conceal) return;
  s.conceal = null;
  s.concealReady = engine.roundNumber + CONCEAL_CD;
  fx(engine, p, "unveil", { why });
  if (why === "hit") {
    s.stunPending = true;
    engine.sfx(SFX.unveil);
    engine.log(`💥 ${p.name} ถูกโจมตีระหว่างซ่อนเร้นมานา — หลุดจากการซ่อนตัว · สตั้นเทิร์นหน้า`);
  } else {
    engine.log(`✨ ${p.name} คลายซ่อนเร้นมานา`);
  }
}

// ---------- Orbital Cannon Zoltraak ----------
function cancelUlt(engine, p, why) {
  const s = st(p);
  if (!s.ult) return;
  s.ult = null;
  s.ultReady = engine.roundNumber + ULT_CD;
  if (p.pos) { fx(engine, p, "fizzle", { why }); engine.sfx(SFX.conceal); }
  if (why === "hit") engine.log(`💥 ${p.name} ถูกโจมตีระหว่างชาร์จ — Orbital Cannon Zoltraak ถูกยกเลิก`);
  else if (why === "empty") engine.log(`✨ Orbital Cannon Zoltraak ของ ${p.name} ไม่มีเป้าในระยะ — สลายไป`);
}
// ศัตรูที่มองเห็นในกรอบ 7×7 รอบตัว — ใกล้สุดก่อน (แมนฮัตตัน → เชบีเชฟ → ลำดับ id)
function fireTargets(engine, p) {
  if (!p.pos) return [];
  const me = Board.boxOf(p);
  return Object.values(engine.players)
    .filter((t) => t.alive && t.pos && t.id !== p.id && !engine.sameTeam(p, t) && !engine.hiddenFromUnit(p, t))
    .map((t) => ({ t, cheb: cheb(me, Board.boxOf(t)), d: Board.dist(me, Board.boxOf(t)) }))
    .filter((r) => r.cheb <= FIRE_AREA.range)
    .sort((a, b) => a.d - b.d || a.cheb - b.cheb || (a.t.id < b.t.id ? -1 : 1))
    .map((r) => r.t);
}
function cheb(a, b) {
  const dx = Math.max(0, a.x - (b.x + b.size - 1), b.x - (a.x + a.size - 1));
  const dy = Math.max(0, a.y - (b.y + b.size - 1), b.y - (a.y + a.size - 1));
  return Math.max(dx, dy);
}
// ยิง: คลิป fernUltFinal → ลำแสงบนกระดาน (fernFx cannon) → ดาเมจลง (CANNON_HIT) → พักท้าย (CANNON_TAIL)
//  ผู้เรียกพักตาเอง (useSkill — คลิปที่คิว · beforeActorEnd — pausePlayingForCutscene)
function fire(engine, p, target, dmg) {
  const s = st(p);
  s.ult = null;
  s.ultReady = engine.roundNumber + ULT_CD;
  s.last = "fire";
  const from = p.pos ? { ...p.pos } : null;
  const to = target && target.pos ? { ...target.pos } : null;
  engine.log(`☄️ ${p.name} Orbital Cannon Zoltraak!`);
  engine.queueCutscene(p, CUT.final);
  engine.deferAfterCutscene(() => {
    if (!p.alive || !from) return;
    fx(engine, p, "cannon", { from, to, dmg, target: target ? target.id : null });
    engine.sfx(SFX.cannon);
    engine.skillBeat(CANNON_HIT, () => {
      cannonHit(engine, p, target, dmg);
      engine.skillBeat(CANNON_TAIL, () => {});
    });
  });
}
function cannonHit(engine, p, t, dmg) {
  if (!t || !t.alive || !t.pos) return;
  engine.withEffectSource(p, () => {
    t.wasAttacked = true;
    const guard = (t.statuses.guard || 0) > 0 ? (engine.statusAmtOf(t, "guard") || 1) : 0;
    const n = Math.max(0, dmg - guard) + (engine.statusAmtOf(t, "fragile") || 0);
    const before = pool(t);
    engine.dealMixed(t, n);
    if (t.alive && t.hp <= 0) engine.instantDeath(t);
    const dealt = Math.max(0, before - pool(t));
    engine.log(`☄️ Orbital Cannon Zoltraak → ${t.name} -${dealt} (ลดเกราะก่อน)`);
    if (!t.alive) { t.pos = null; engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`); }
  });
}
// ช่องปลายทางของการวาร์ป: ช่องว่าง · ช่องที่มีคนที่มองไม่เห็นยืน = ช่องว่างใกล้สุด (ไม่บอกใบ้ว่ามีคน) · อื่นๆ = null
function warpDest(engine, p, tile) {
  if (!tile || !Number.isInteger(tile.x) || !Number.isInteger(tile.y)) return null;
  if (engine.tileFree(tile.x, tile.y)) return { x: tile.x, y: tile.y };
  const u = engine.boardUnits().find((o) => Board.dist({ x: o.x, y: o.y, size: o.size }, { x: tile.x, y: tile.y, size: 1 }) === 0);
  const o = u && engine.players[u.id];
  if (!o || o.id === p.id || !engine.hiddenFrom(p, o) || !engine.tileFree(tile.x, tile.y, o.id)) return null;
  return engine.nearFreeTile(tile);
}

// ---------- ถูกศัตรูโจมตี (ไม่ถูก Defensive Magic กัน) ----------
function struck(engine, p) {
  if (st(p).conceal) exitConceal(engine, p, "hit");
  if (st(p).ult) cancelUlt(engine, p, "hit");
}

module.exports = {
  id: ID,
  IMG, VIDEO, CUT, SFX, FX, STYLE, HP, ARMOR, ENERGY_MAX, ZOLT_COST, ZOLT_DMG, SHIELD_CD, CAST_MAX, CAST_CD,
  CONCEAL_GAIN, CONCEAL_REGEN, CONCEAL_HEAL, CONCEAL_HEAL_EVERY, CONCEAL_SIGHT, CONCEAL_CD, STUN_TURNS,
  ULT_CD, ULT_CHARGE_MAX, ULT_BASE, FIRE_AREA, CANNON_HIT, CANNON_TAIL,
  isFern, concealOn, charging,

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

  // ---------- ทำอะไรไม่ได้ระหว่างซ่อนเร้น / ชาร์จ ----------
  mov(p) { return busy(p) ? 0 : null; },
  range(p) {
    if (!isFern(p)) return null;
    if (busy(p) || (p.skillPoints || 0) < ZOLT_COST) return NO_STRIKE;
    return null;
  },
  blocksGuts(engine, p) { return busy(p); },
  blocksItems(engine, p) { return concealOn(p); },
  holdsDraw(engine, p) { return charging(p) && engine.roundNumber > st(p).ult.cast; },

  // ---------- ตีปกติ Zoltraak ----------
  attackLane(p) { return isFern(p); },
  attackBaseOverride(engine, attacker) { return isFern(attacker) ? ZOLT_DMG : 1; },
  attackStyle(p) { return isFern(p) ? STYLE : null; },
  attackSound(p) { return isFern(p) ? SFX.zoltraak : undefined; },
  // ตีคน 1 ครั้ง (ทั้งแนวนับครั้งเดียว) · ตีผนึก/หนาม = 2 Energy
  onStrikeResolved(engine, attacker) {
    if (isFern(attacker)) attacker.skillPoints = Math.max(0, (attacker.skillPoints || 0) - ZOLT_COST);
  },
  onStrikeObject(engine, p) {
    if (isFern(p)) p.skillPoints = Math.max(0, (p.skillPoints || 0) - ZOLT_COST);
  },
  // ร่ายต่อเนื่อง: ตีที่ตุนไว้ = ตีครั้งนี้ไม่จบตา (server/phases/action.js strikeTarget)
  extraStrike(engine, p) {
    if (!isFern(p) || st(p).extra <= 0) return false;
    st(p).extra--;
    return true;
  },

  // ---------- Defensive Magic + ถูกโจมตี ----------
  onAttacked(engine, p, attacker) {
    if (!isFern(p) || !p.alive) return;
    const s = st(p), key = attackKey(engine, attacker);
    if (s.blockKey === key || s.hitKey === key) return;
    if (shieldReady(engine, p)) {
      s.blockKey = key;
      s.shieldReady = engine.roundNumber + SHIELD_CD;
      if (p.pos) fx(engine, p, "shield", {}, watchers(engine, p));
      engine.sfx(SFX.shield, watchers(engine, p));
      engine.log(`🛡️ ${p.name} Defensive Magic — กันการโจมตีของ ${attacker.name}`);
      return;
    }
    s.hitKey = key;
    struck(engine, p);
  },
  blocksAttack(engine, p, attacker) {
    if (!isFern(p) || st(p).blockKey !== attackKey(engine, attacker)) return null;
    return { name: "Defensive Magic", img: IMG.base };
  },

  // ---------- การมองเห็น ----------
  stealthed(p) {
    if (!isFern(p)) return false;
    const s = st(p);
    return !!s.conceal || (!!s.ult && !s.ult.revealed);
  },
  // ซ่อนเร้นมานา: ศัตรูในระยะ 2 (แมนฮัตตัน · กรอบตัว) มองเห็น — ล่องหนของท่าไม้ตายไม่มีข้อนี้
  seenBy(engine, viewer, target) {
    if (!concealOn(target) || !viewer.pos || !target.pos) return false;
    return Board.dist(Board.boxOf(viewer), Board.boxOf(target)) <= CONCEAL_SIGHT;
  },

  // ---------- สกิล ----------
  skillArea(p, tier, area) { return tier === "ultimate" && isFern(p) && canFire(eng(), p) ? FIRE_AREA : area; },
  skillFree(p, tier) {
    if (!isFern(p)) return false;
    if (tier === "secondary") return concealOn(p); // ยกเลิก
    if (tier === "ultimate") return charging(p);   // ยิง
    return false;
  },
  skipsTurnQuota(p, tier) { return isFern(p) && tier === "secondary"; },
  ignoresTurnQuota(p, tier) {
    if (!isFern(p)) return false;
    const s = st(p);
    if (tier === "basic") return castsNow(eng(), s) > 0; // ครั้งที่ 2 ในตาเดินเดียวกัน
    if (tier === "secondary") return concealOn(p);
    if (tier === "ultimate") return charging(p);
    return false;
  },
  silentFlash(p, tier) { return isFern(p) && tier === "secondary" && st(p).last === "enter"; },
  skillSound(p, tier) {
    if (!isFern(p)) return null;
    if (tier === "basic") return SFX.cast;
    if (tier === "secondary") return st(p).last === "exit" ? SFX.unveil : null;
    return null; // ท่าไม้ตาย: คลิป + เสียงวาร์ป/ลำแสงตามเอฟเฟกต์
  },
  skillPub(p, tier) {
    if (tier === "ultimate" && isFern(p) && canFire(eng(), p)) return { name: "ยิง Zoltraak" };
    return null;
  },
  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isFern(p)) return true;
    const s = st(p), r = engine.roundNumber;
    if (tier === "basic") return !busy(p) && castOpen(engine, p);
    if (tier === "secondary") {
      if (charging(p)) return false;
      return concealOn(p) || cdLeft(s.concealReady, r) === 0;
    }
    if (tier === "ultimate") {
      if (concealOn(p)) return false;
      if (charging(p)) {
        if (!canFire(engine, p)) return false;
        const t = engine.players[(targets || [])[0]];
        return !!t && t.alive && t.id !== p.id && !engine.sameTeam(p, t);
      }
      return cdLeft(s.ultReady, r) === 0 && !!p.pos && !!warpDest(engine, p, opts.tile);
    }
    return false;
  },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isFern(p)) return "";
    const s = st(p), r = engine.roundNumber;
    if (tier === "basic") {
      s.casts = castsNow(engine, s) + 1;
      s.castRound = r;
      s.castReady = r + CAST_CD;
      s.extra++;
      s.last = "cast";
      if (p.pos) fx(engine, p, "cast", { extra: s.extra });
      engine.log(`✨ ${p.name} ร่ายต่อเนื่อง — ตีปกติเพิ่ม +1 ในตาเดินนี้`);
      return "";
    }
    if (tier === "secondary") {
      if (s.conceal) { exitConceal(engine, p, "cancel"); s.last = "exit"; return ""; }
      enterConceal(engine, p);
      return "";
    }
    if (tier === "ultimate") {
      if (s.ult) {
        const t = engine.players[(targets || [])[0]];
        fire(engine, p, t, ULT_BASE + chargeOf(engine, p));
        return "";
      }
      const dest = warpDest(engine, p, opts.tile);
      if (!dest) return "";
      const from = { ...p.pos };
      p.pos = { ...dest };
      const a = engine.action;
      if (a && engine.actorId === p.id) Object.assign(a, { from: { ...dest }, moved: false, path: null, trail: null, locked: true });
      s.ult = { cast: r, revealed: false };
      s.last = "warp";
      engine.queueCutscene(p, CUT.intro);
      // หลังคลิป: หายจากช่องเดิม (ทุกคนเห็น) · โผล่ช่องใหม่ (ฝ่ายตัวเองเห็น)
      engine.deferAfterCutscene(() => {
        fx(engine, p, "warpOut", { at: from });
        fx(engine, p, "warpIn", { at: { ...p.pos } }, audience(engine, p));
        engine.sfx(SFX.teleport);
      });
      return "";
    }
    return "";
  },

  // ---------- จังหวะเทิร์น/ตาเดิน ----------
  onRoundStartTick(engine, p) {
    if (!isFern(p) || !p.alive) return;
    const s = st(p), r = engine.roundNumber;
    if (s.conceal) {
      const got = gainEnergy(engine, p, CONCEAL_REGEN);
      let healed = 0;
      if (r >= s.conceal.healAt) {
        s.conceal.healAt += CONCEAL_HEAL_EVERY;
        healed = engine.healHp(p, CONCEAL_HEAL);
      }
      if (got || healed) engine.log(`✨ ${p.name} ซ่อนเร้นมานา —${got ? ` Energy +${got}` : ""}${healed ? ` พลังชีวิต +${healed}` : ""}`);
    }
    if (s.ult && r > s.ult.cast) {
      s.ult.revealed = true;
      if (p.pos) {
        fx(engine, p, "reveal", { charge: chargeOf(engine, p) });
        engine.sfx(SFX.charge);
      }
    }
  },
  // ตาเดินของตัวเองเริ่ม: ที่ตุนไว้เริ่มใหม่ · ชาร์จอยู่ = ล่องหนอีกครั้ง
  onActorStart(engine, p) {
    if (!isFern(p)) return;
    const s = st(p);
    s.extra = 0;
    s.casts = 0;
    if (s.ult) s.ult.revealed = false;
  },
  // ชาร์จครบ 3 เทิร์นแล้วจะจบตาโดยไม่ยิง = ยิงศัตรูใกล้สุดในกรอบเอง (ไม่มี = สลาย)
  beforeActorEnd(engine, p) {
    if (!isFern(p) || !charging(p) || chargeOf(engine, p) < ULT_CHARGE_MAX || !p.pos) return false;
    const t = fireTargets(engine, p)[0];
    if (!t) { cancelUlt(engine, p, "empty"); return false; }
    engine.setGameState("ACTION");
    fire(engine, p, t, ULT_BASE + ULT_CHARGE_MAX);
    engine.pausePlayingForCutscene(undefined, { endTurn: true });
    return true;
  },
  onActorEnd(engine, p) {
    if (!isFern(p)) return;
    const s = st(p);
    s.extra = 0;
    s.casts = 0;
  },
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
    s.ult = null;
    s.extra = 0;
    s.stunPending = false;
  },

  // ---------- ข้อมูลให้ client ----------
  fernState(engine, p) {
    if (!isFern(p)) return undefined;
    const s = st(p), r = engine.roundNumber;
    return {
      conceal: !!s.conceal,
      charge: chargeOf(engine, p),
      revealed: !!(s.ult && s.ult.revealed),
      shieldCd: cdLeft(s.shieldReady, r),
      basicLeft: busy(p) || !castOpen(engine, p) ? 0 : CAST_MAX - castsNow(engine, s),
      extra: s.extra,
      concealCd: s.conceal ? 0 : cdLeft(s.concealReady, r),
      ultCd: s.ult ? 0 : cdLeft(s.ultReady, r),
    };
  },
  skillLocks(engine, p) {
    if (!isFern(p)) return undefined;
    const s = st(p), r = engine.roundNumber, conceal = concealOn(p), charge = charging(p);
    const castCd = castsNow(engine, s) > 0 ? 0 : cdLeft(s.castReady, r);
    return {
      basic: { cd: castCd, locked: conceal || charge || !castOpen(engine, p), free: castsNow(engine, s) > 0 },
      secondary: { cd: conceal ? 0 : cdLeft(s.concealReady, r), locked: charge, free: conceal },
      ultimate: { cd: charge ? 0 : cdLeft(s.ultReady, r), locked: conceal || (charge && !canFire(engine, p)), free: charge },
    };
  },
};
