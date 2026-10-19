// ============================================================
//  เกรย์ (Gray — The Case Files of Lord El-Melloi II) — ระดับกลาง · id "gray"
//
//  ค่าพื้นฐาน: เลือด/เกราะมาตรฐาน · ระยะเดิน 4 · ตีประชิด [1, 1]
//    อาวุธ Add (ผู้ใช้สั่ง 2026-10-19): ตีประชิดสุ่มค้อน/เคียวทุกครั้ง · ตีระยะ 2 (จงบ้าคลั่ง) เป็นธนู
//    สุ่มใน attackStyle (strikeCard เรียกก่อน attackSound) แล้วเสียงตามอาวุธที่ได้
//  สกิลพื้นฐาน คนเฝ้าสุสาน (3 แต้ม · คูลดาวน์ 2 เทิร์น): หลบหลีก 1 เทิร์น + เยียวยา (1) 2 เทิร์น
//  สกิลรอง Grave (3 แต้ม · คูลดาวน์ 2 เทิร์น): ได้ "จงบ้าคลั่ง" 2 เทิร์น (รวมเทิร์นนี้) — ระยะตีปกติ [1, 2]
//    · อัตราคริติคอล +25% (ผู้ใช้สั่ง 2026-10-19 — บวกกับคริจากสนาม ทอยครั้งเดียว: ฮุค critPct)
//    · ตีปกติลงติด "ถูกตรึง" 1 เทิร์น (สถานะเดียวกับคลื่นความมืดของกิระ — ต้าน/ล้างได้ · เป้าเดินไปแล้ว = ติดถึงเทิร์นหน้า)
//  ท่าไม้ตาย รองโกมิเนียต (6 แต้ม · คูลดาวน์ 3 เทิร์นนับจากเทิร์นที่ยิง — ผู้ใช้ปรับจาก 5): เลือกทิศ แนวยาวสุดกระดาน กว้าง 7 (ผู้ใช้ปรับจาก 6)
//    กดเทิร์น N → คลิป intro → เพลง contro แล้ว standBy วน (client MUSIC_SEQUENCES "gray_ult") → ชาร์จ
//    ถึงตาเกรย์เทิร์น N+1 (ชาร์จ — ผู้ใช้สั่ง 2026-10-19): ศัตรูที่ยืนในแนวติด "ถูกตรึง" จนถึงตอนยิง (หนีออกในเทิร์น N ได้ = รอด)
//      · ตรึงต้นตาเดิน (ฮุค onActorStart — ติดแม้เกรย์ถูกข้ามตา) · ต้านสถานะกันได้ · พวกเดียวกันไม่ติด
//    เทิร์น N+2: เกรย์เดินลำดับแรกเสมอ (ฮุค leadsOrder — ผู้ใช้สั่ง "ถึงเทิร์นยิงให้ยิงทันที") → ต้นตาเดิน คลิป final → ลำแสงทองบนกระดาน → ดาเมจ
//    ระหว่างชาร์จ: เดิน/จั่ว/ตีปกติ/ใช้สกิล/ยิงปืน GUTS ไม่ได้ · ใช้ไอเทมอื่นได้ (ผู้ใช้สั่ง)
//      สตั้น/หลับไม่ยกเลิก — ถูกข้ามตาในเทิร์นที่ต้องยิง = เลื่อนไปยิงตาเดินถัดไปที่ขยับได้ (ยังชาร์จต่อ · คนในแนวถูกตรึงต่ออีกเทิร์น) · ตาย = ยกเลิก ไม่คืนแต้ม
//    ดาเมจ 5 (ผู้ใช้ปรับจาก 4) + 1 ต่อศพที่เก็บ (สูงสุด 2 ศพ = 7 — ผู้ใช้ปรับจาก +2) ตายตัว ไม่รับบัฟพลังโจมตี
//      · เกราะรับก่อน · ฆ่าได้ · หลบได้ (หลบหลีก/พุ่มไม้ — แม่นยำเจาะ) · คุ้มครองลด · เปราะบางเพิ่ม (ผู้ใช้สั่ง) · ไม่โดนพวกเดียวกัน
//    แนวลำแสงยิงจากช่องที่ยืนตอนยิง (ปกติขยับไม่ได้อยู่แล้ว — ถูกผลัก/เปลี่ยนภูมิภาคก็ตามตัวไป) · ทุกคนเห็นแนวตลอดช่วงชาร์จ
//  ติดตัว สัปเหร่อ:
//    ระหว่างที่เกรย์ยังอยู่ ทุกคนที่ตายทิ้งศพไว้บนกระดาน (ฮุค keepsCorpses — server/duo.js เดียวกับยูนะ)
//    ตีปกติใส่ศพที่ประชิด = เก็บศพ (จบตาแบบตีปกติ): ศพหายจากกระดาน (ฟื้นคืนชีพที่ใช้ศพทำไม่ได้แล้ว)
//      · ฟื้นพลังชีวิต 2 · พลังโจมตี +1 ถาวร (สูงสุด +2) · รองโกมิเนียต +1 ต่อศพ (สูงสุด 2 ศพ)
//      · ศพเคท/เอมิลิโกะที่อีกตัวยังรอด เกิดใหม่ข้างตัวที่รอดเมื่อเปลี่ยนภูมิภาค (Duo.placeCorpses ทำอยู่แล้ว)
// ============================================================
const Board = require("../server/board");

const ID = "gray";
const DIR = "/characters/gray";
// ไฟล์จากผู้ใช้ (Downloads/gray — 2026-10-19) · ปุ่มสกิลใช้รูปตามลำดับ skill1..3
const IMG = {
  base: `${DIR}/gray.webp`,
  skill1: `${DIR}/gray_skill1.webp`,
  skill2: `${DIR}/gray_skill2.webp`,
  skill3: `${DIR}/gray_skill3.webp`,
};
const VIDEO = { intro: `${DIR}/gray_skill3_intro.mp4`, final: `${DIR}/gray_skill3_final.mp4` };
const CUT = { intro: "grayUltIntro", final: "grayUltFinal" };
const MUSIC = "gray_ult"; // client/src/audio.js — contro ครั้งเดียว → standBy วน (MUSIC_SEQUENCES)
// เสียง (client/src/audio.js — ไฟล์อยู่ client/public/characters/gray/sfx/)
const SFX = {
  scythe: "gray_scythe",    // ตีปกติ: เคียว Add
  hammer: "gray_hammer",    // ตีปกติ: ค้อน Add
  bow: "gray_bow",          // ตีปกติระยะ 2: ธนู Add
  chains: "gray_chains",    // จงบ้าคลั่ง: โซ่ตรึงตอนตีลง (client เล่นซ้อนกับเสียงอาวุธ)
  keeper: "gray_keeper",    // คนเฝ้าสุสาน
  grave: "gray_grave",      // Grave
  reap: "gray_reap",        // เก็บศพ
  beam: "gray_beam",        // ลำแสงรองโกมิเนียต (client เล่นตามเอฟเฟกต์บนกระดาน)
};

const KEEPER_CD = 2;
const MEND_AMT = 1;
const MEND_TURNS = 2;
const GRAVE_CD = 2;
const FRENZY_TURNS = 2;
const FRENZY_RANGE = [1, 2];
const FRENZY_CRIT = 25;
const ROOT_TURNS = 1;
const ULT_CD = 3;
const ULT_DELAY = 2; // ยิงต้นตาเดินของเทิร์น N+2
const ULT_AREA = { kind: "line", len: 14, width: 7, hostile: true };
const ULT_DMG = 5;
const SOUL_DMG = 1;
const BIND_TURNS = 2; // ตรึงต้นตาเดินเทิร์น N+1 → อยู่ถึงจบเทิร์น N+2 (เทิร์นที่ยิง)
const SOUL_MAX = 2;
const REAP_HP = 2;
// จังหวะบนกระดาน (ต้องตรงกับ client/src/board/grayFx.js — GRAY_BEAM)
const BEAM_HIT_SECONDS = 1.6;
const BEAM_TAIL_SECONDS = 2.2;
const REAP_SECONDS = 1.6;
const NO_STRIKE = [1, 0];
const MELEE = ["scythe", "hammer"];
// ท่าตีบนกระดาน (client/src/board/grayFx.js) — จงบ้าคลั่ง = เติม "Grave" (โซ่วิญญาณตรึงเป้า) · ธนูมีแต่ตอนจงบ้าคลั่ง
const STYLE = { scythe: "grayScythe", hammer: "grayHammer", bow: "grayBow" };

const isGray = (p) => !!p && p.characterId === ID;
function fresh() {
  return {
    souls: 0,        // ศพที่เก็บ (สูงสุด SOUL_MAX) — พลังโจมตี +1 / ศพ · รองโกมิเนียต +2 / ศพ
    reaped: 0,       // ศพที่เก็บทั้งหมด (ฟื้นพลังชีวิตทุกศพ)
    keeperReady: 0,  // คนเฝ้าสุสาน: กดได้อีกเมื่อ roundNumber >= ค่านี้
    graveReady: 0,
    frenzy: 0,       // จงบ้าคลั่ง: เทิร์นที่เหลือ (ลดตอนจบเทิร์น)
    ultReady: 0,
    charge: null,    // รองโกมิเนียตที่กำลังชาร์จ { dir, cast, fire, at }
    weapon: "scythe", // อาวุธของการตีปกติครั้งล่าสุด (attackStyle สุ่ม → attackSound อ่าน)
  };
}
function st(p) { return p.gray || (p.gray = fresh()); }
const charging = (p) => isGray(p) && !!st(p).charge;
const frenzyOn = (p) => isGray(p) && st(p).frenzy > 0;
const cdLeft = (ready, round) => Math.max(0, (ready || 0) - round);

// ---------- ศพ ----------
function corpseNear(engine, p, dead) {
  if (!p.pos || !dead || dead.alive || !dead.corpse || !engine.corpseKept(dead)) return false;
  return Board.dist(Board.boxOf(p), { x: dead.corpse.x, y: dead.corpse.y, size: 1 }) === 1;
}

// ---------- ถูกตรึง (จงบ้าคลั่ง) — แบบเดียวกับกิระ: เป้าที่เดินไปแล้วเทิร์นนี้ได้ผลเทิร์นหน้า ----------
function root(engine, t) {
  const acted = engine.hasActed(t.id) || engine.actorId === t.id;
  if (engine.applyDebuff(t, "rooted", 1, ROOT_TURNS + (acted ? 1 : 0))) {
    engine.log(`⛓️ ${t.name} ถูกตรึง — เดินไม่ได้ ${ROOT_TURNS} เทิร์น`);
    return true;
  }
  engine.log(`⛓️ ${t.name} ต้านการตรึงไว้ได้`);
  return false;
}

// ---------- รองโกมิเนียต ----------
function beamTiles(engine, p, dir) { return engine.areaTiles(p, ULT_AREA, dir); }
function beamVictims(engine, p, tiles) {
  const set = new Set(tiles.map((t) => Board.key(t.x, t.y)));
  return Object.values(engine.players).filter((t) => t.alive && t.pos && t.id !== p.id
    && Board.footprint(t.pos.x, t.pos.y, engine.sizeOf(t)).some((c) => set.has(Board.key(c.x, c.y))));
}
const ultDamage = (p) => ULT_DMG + SOUL_DMG * Math.min(SOUL_MAX, st(p).souls);
// ชาร์จ (ถึงตาเกรย์เทิร์น N+1): ศัตรูในแนวถูกตรึงจนถึงตอนยิง — turns = เทิร์นที่ติด (นับเทิร์นนี้)
function bind(engine, p, turns) {
  if (!p.pos) return;
  const s = st(p), c = s.charge;
  const victims = beamVictims(engine, p, beamTiles(engine, p, c.dir)).filter((t) => !engine.sameTeam(p, t));
  let n = 0;
  engine.withEffectSource(p, () => {
    for (const t of victims) {
      if (engine.applyDebuff(t, "rooted", 1, turns)) {
        n++;
        engine.boardFx("grayFx", { kind: "grave", at: { ...t.pos }, id: t.id });
        engine.log(`⛓️ ${t.name} ถูกตรึงในแนวรองโกมิเนียต`);
      } else engine.log(`⛓️ ${t.name} ต้านการตรึงไว้ได้`);
    }
  });
  if (n) engine.sfx(SFX.chains);
}
// ถึงเวลายิง (ต้นตาเดินของเกรย์ — ฮุค onActorReady): คลิป final → ลำแสง → ดาเมจ แล้วกลับเข้าตาเดินด้วยเวลาที่เหลือ
function fire(engine, p) {
  const s = st(p), c = s.charge;
  s.charge = null;
  s.ultReady = engine.roundNumber + ULT_CD;
  if (!p.pos || !c) return;
  engine.log(`✨ ${p.name} รองโกมิเนียต!`);
  engine.queueCutscene(p, CUT.final);
  engine.deferAfterCutscene(() => beamStart(engine, p, c.dir));
  engine.pausePlayingForCutscene();
}
function beamStart(engine, p, dir) {
  if (!p.alive || !p.pos) return;
  const tiles = beamTiles(engine, p, dir);
  engine.boardFx("grayFx", { kind: "beam", at: { ...p.pos }, size: engine.sizeOf(p), dir, len: ULT_AREA.len, width: ULT_AREA.width, tiles });
  engine.skillBeat(BEAM_HIT_SECONDS, () => beamHit(engine, p, dir, tiles));
}
function beamHit(engine, p, dir, tiles) {
  const dmg = ultDamage(p);
  const ids = beamVictims(engine, p, tiles).map((t) => t.id);
  engine.withEffectSource(p, () => {
    for (const id of ids) {
      const t = engine.players[id];
      if (!t || !t.alive || engine.sameTeam(p, t)) continue;
      t.wasAttacked = true;
      if (engine.skillDodge(p, t, "รองโกมิเนียต")) continue;
      const guard = (t.statuses.guard || 0) > 0 ? (engine.statusAmtOf(t, "guard") || 1) : 0;
      const n = Math.max(0, dmg - guard) + (engine.statusAmtOf(t, "fragile") || 0);
      const before = (t.hp || 0) + (t.armor || 0);
      engine.dealMixed(t, n);
      if (t.alive && t.hp <= 0) engine.instantDeath(t);
      const dealt = Math.max(0, before - ((t.hp || 0) + (t.armor || 0)));
      engine.log(`✨ รองโกมิเนียต → ${t.name} -${dealt} (ลดเกราะก่อน)`);
      if (!t.alive) { t.pos = null; engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`); }
    }
    // ผลของสกิลโจมตีพื้นที่ (คนในพุ่มโผล่ · ล่องหนปรากฏ · ผนึก/หนามน้ำแข็งในแนว) — ownsAreaHit ข้ามตอนกด
    engine.hitArea(p, tiles, ids);
  });
  engine.skillBeat(BEAM_TAIL_SECONDS, () => {});
}

module.exports = {
  id: ID,
  IMG, VIDEO, CUT, MUSIC, SFX, KEEPER_CD, MEND_AMT, MEND_TURNS, GRAVE_CD, FRENZY_TURNS, FRENZY_RANGE, ROOT_TURNS,
  FRENZY_CRIT, ULT_CD, ULT_DELAY, ULT_AREA, ULT_DMG, SOUL_DMG, SOUL_MAX, REAP_HP, BIND_TURNS,
  isGray, charging,

  resetCombat(p) { p.gray = isGray(p) ? fresh() : null; },
  // ศพค้างระหว่างที่เกรย์ยังอยู่ (server/duo.js keeperAlive)
  keepsCorpses(p) { return isGray(p); },

  // ---------- ระหว่างชาร์จ: เดินไม่ได้ · ตีปกติไม่ได้ (ไม่มีช่องที่ตีถึง) ----------
  mov(p) { return charging(p) ? 0 : null; },
  range(p) {
    if (charging(p)) return NO_STRIKE;
    return frenzyOn(p) ? FRENZY_RANGE : null;
  },
  blocksGuts(engine, p) { return charging(p); },
  // ช่วงจั่วไพ่ระหว่างชาร์จ = จั่วไม่ได้ (ยืนอยู่ที่ไพ่ใบแรก — server/phases/draw.js dealRound)
  holdsDraw(engine, p) { return charging(p); },

  // ---------- ตีปกติ ----------
  attackStyle(p, dist) {
    if (!isGray(p)) return null;
    const w = dist >= 2 ? "bow" : MELEE[Math.floor(Math.random() * MELEE.length)];
    st(p).weapon = w;
    return STYLE[w] + (frenzyOn(p) && w !== "bow" ? "Grave" : "");
  },
  attackSound(p) {
    if (!isGray(p)) return undefined;
    return SFX[st(p).weapon] || SFX.scythe;
  },
  // จงบ้าคลั่ง: คริติคอล +25% (strike รวมกับคริสนามแล้วทอยครั้งเดียว · หน้าต่างคาดการณ์ใช้ค่าเดียวกัน)
  critPct(p) { return frenzyOn(p) ? FRENZY_CRIT : 0; },
  onStrikeLanded(engine, attacker, target) {
    if (!frenzyOn(attacker) || !target.alive || target.hp <= 0) return [];
    return root(engine, target) ? ["ถูกตรึง"] : [];
  },
  // สัปเหร่อ: พลังโจมตี +1 ต่อศพ (สูงสุด +2) — ตีปกติ · สกิลที่ตีด้วยพลังโจมตี
  damageBonus(engine, attacker, target, ctx) {
    if (!isGray(attacker)) return 0;
    const n = Math.min(SOUL_MAX, st(attacker).souls);
    if (n > 0) ctx.graySouls = n;
    return n;
  },
  attackFxNames(attacker, atkCtx) { return atkCtx && atkCtx.graySouls ? [`สัปเหร่อ +${atkCtx.graySouls}`] : []; },

  // ---------- เก็บศพ (action.attackTarget "corpse:<id>") ----------
  canReapCorpse(engine, p, dead) { return isGray(p) && !charging(p) && corpseNear(engine, p, dead); },
  // ลงผลแล้วคืนจำนวนวินาทีของฉาก (เฟส ATTACKING) ก่อนจบตา
  reapCorpse(engine, p, dead) {
    const s = st(p);
    const from = { ...dead.corpse };
    dead.corpse = null;
    s.reaped++;
    const grew = s.souls < SOUL_MAX;
    if (grew) s.souls++;
    const healed = engine.healHp(p, REAP_HP);
    engine.boardFx("grayFx", { kind: "reap", from, at: { ...p.pos }, id: p.id, souls: s.souls });
    engine.sfx(SFX.reap);
    engine.log(`⚰️ ${p.name} เก็บศพของ ${dead.name} — ฟื้นพลังชีวิต +${healed}${grew ? ` · พลังโจมตี +${s.souls} (ถาวร)` : ""}`);
    return REAP_SECONDS;
  },

  // ---------- สกิล ----------
  canUseSkill(engine, p, tier) {
    if (!isGray(p)) return true;
    if (charging(p)) return false;
    const s = st(p), r = engine.roundNumber;
    if (tier === "basic") return cdLeft(s.keeperReady, r) === 0;
    if (tier === "secondary") return cdLeft(s.graveReady, r) === 0;
    if (tier === "ultimate") return cdLeft(s.ultReady, r) === 0 && !!p.pos;
    return false;
  },
  // รองโกมิเนียตโดนตอนยิง (เทิร์น N+2) ไม่ใช่ตอนกด — useSkill ข้ามผลพื้นที่ (โผล่จากพุ่ม/หนาม/ผนึก) ให้ beamHit เรียกเอง
  ownsAreaHit(p, tier) { return isGray(p) && tier === "ultimate"; },
  skillSound(p, tier) {
    if (!isGray(p)) return null;
    if (tier === "basic") return SFX.keeper;
    if (tier === "secondary") return SFX.grave;
    return null; // รองโกมิเนียต: คลิป intro
  },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isGray(p)) return "";
    const s = st(p), r = engine.roundNumber;
    if (tier === "basic") {
      s.keeperReady = r + KEEPER_CD;
      engine.applyEvade(p, 100);
      engine.applyMend(p, MEND_AMT, MEND_TURNS);
      if (p.pos) engine.boardFx("grayFx", { kind: "keeper", at: { ...p.pos }, id: p.id });
      engine.log(`🪦 ${p.name} คนเฝ้าสุสาน — หลบหลีก 1 เทิร์น · เยียวยา ${MEND_TURNS} เทิร์น`);
      return "";
    }
    if (tier === "secondary") {
      s.graveReady = r + GRAVE_CD;
      s.frenzy = FRENZY_TURNS;
      if (p.pos) engine.boardFx("grayFx", { kind: "grave", at: { ...p.pos }, id: p.id });
      engine.log(`⛓️ ${p.name} Grave — จงบ้าคลั่ง ${FRENZY_TURNS} เทิร์น (ระยะตี 2 · ตีติดถูกตรึง)`);
      return " — จงบ้าคลั่ง";
    }
    if (tier === "ultimate") {
      if (!opts.dir) return "";
      s.charge = { dir: opts.dir, cast: r, fire: r + ULT_DELAY, at: engine.nextTransformCounter() };
      s.ultReady = s.charge.fire + ULT_CD; // ป้ายคูลดาวน์ระหว่างชาร์จ (ยิงแล้วนับใหม่จากเทิร์นที่ยิง)
      engine.queueCutscene(p, CUT.intro);
      engine.log(`✨ ${p.name} ปลดผนึกรองโกมิเนียต — ยิงเทิร์นที่ ${s.charge.fire}`);
      return "";
    }
    return "";
  },

  // เทิร์นที่ยิง: เดินลำดับแรก (action.beginOrder)
  leadsOrder(engine, p) {
    const c = isGray(p) && st(p).charge;
    return !!c && p.alive && engine.roundNumber >= c.fire;
  },
  // ถึงคิวเกรย์ (ก่อนเช็คสตั้น) เทิร์นชาร์จ: ตรึงศัตรูในแนว
  onActorStart(engine, p) {
    const c = st(p).charge;
    if (c && !c.bound && engine.roundNumber >= c.cast + 1 && engine.roundNumber < c.fire) {
      c.bound = true;
      bind(engine, p, BIND_TURNS);
    }
  },
  // ต้นตาเดินของเกรย์ (ตั้งตา + นาฬิกาแล้ว — server/phases/action.js nextActor)
  onActorReady(engine, p) {
    const s = st(p);
    if (s.charge && engine.roundNumber >= s.charge.fire) fire(engine, p);
  },

  onEndTurn(engine) {
    for (const p of Object.values(engine.players)) {
      if (!isGray(p)) continue;
      const s = st(p);
      if (s.frenzy > 0) s.frenzy--;
      // ไม่ได้ยิงในเทิร์นที่ต้องยิง: ถูกข้ามตา (สตั้น/หลับ) = เลื่อนไปเทิร์นหน้า · ไม่อยู่บนกระดาน = ลำแสงสลาย
      if (s.charge && engine.roundNumber >= s.charge.fire) {
        if (p.alive && p.pos) {
          s.charge.fire = engine.roundNumber + 1;
          s.ultReady = s.charge.fire + ULT_CD;
          engine.log(`✨ รองโกมิเนียตของ ${p.name} ยังรอปล่อย`);
          bind(engine, p, 1); // หลังลูปลดเทิร์นสถานะ — คนในแนวติดถึงจบเทิร์นหน้า
        } else {
          s.charge = null;
          engine.log(`✨ รองโกมิเนียตของ ${p.name} สลายไป`);
        }
      }
    }
  },
  onDeath(engine, p) {
    if (!isGray(p)) return;
    const s = st(p);
    if (s.charge) engine.log(`✨ รองโกมิเนียตของ ${p.name} สลายไป`);
    s.charge = null;
    s.frenzy = 0;
  },

  // เพลงระหว่างชาร์จ (view.activeSkillMusic): contro → standBy วน
  skillMusic(engine, p) {
    return isGray(p) && p.alive && st(p).charge ? { music: MUSIC, at: st(p).charge.at } : null;
  },

  // ---------- ข้อมูลให้ client ----------
  grayState(engine, p) {
    if (!isGray(p)) return undefined;
    const s = st(p), r = engine.roundNumber;
    const c = s.charge;
    return {
      souls: s.souls, soulsMax: SOUL_MAX,
      frenzy: s.frenzy,
      reaper: !c, // เก็บศพได้ (client: ศพประชิด = เป้าตีปกติ)
      ultCd: c ? 0 : cdLeft(s.ultReady, r),
      charge: c && p.pos ? { dir: c.dir, cast: c.cast, fire: c.fire, left: Math.max(0, c.fire - r), tiles: beamTiles(engine, p, c.dir) } : null,
    };
  },
  skillLocks(engine, p) {
    if (!isGray(p)) return undefined;
    const s = st(p), r = engine.roundNumber, c = charging(p);
    return {
      basic: { cd: cdLeft(s.keeperReady, r), locked: c },
      secondary: { cd: cdLeft(s.graveReady, r), locked: c },
      ultimate: { cd: c ? 0 : cdLeft(s.ultReady, r), locked: c },
    };
  },
};
