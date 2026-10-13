// ============================================================
//  โซระ โอโตสุมิ — ระดับง่าย · id "sora_otosumi" · กติกาที่ผู้ใช้ตัดสินดู GRID_PLAN §7.7
//
//  ค่าพื้นฐาน: เลือด/เกราะมาตรฐาน · ระยะเดิน 4 · ตีประชิด [1, 1]
//  สกิลพื้นฐาน แปลงร่าง (0 แต้ม): สลับร่างโซระ ⇄ Kamen Rider My-Th · เทิร์นละ 1 ครั้ง · ไม่นับเป็นการใช้สกิล (ล็อกการเดินตามกฎ)
//    เข้าร่าง My-Th ครั้งแรกต่อเกม = คลิปแปลงร่าง · รูปบนปุ่ม = ร่างที่จะเปลี่ยนไป (skillPub)
//  สกิลรอง My-Th Edge (0 แต้ม · ร่าง My-Th เท่านั้น): สลับมีด ⇄ ปืน · เทิร์นละ 1 ครั้ง · ไม่นับเป็นการใช้สกิล · อาวุธค้างตามที่เลือกไว้ (ไม่รีเซ็ตตอนคืนร่าง)
//    มีด (เริ่มต้น): ตีปกติ +1 · ฉากตีเป็นรอยฟันสีฟ้า
//    ปืน: ระยะตี [1, 3] · ลำแสงสีฟ้า · ตีโดนและเป้ารอด = ดึงเป้าเข้าประชิด (ช่องติดตัวที่ใกล้เป้าสุดซึ่งว่าง · ไม่ว่าง = ไม่ดึง · ดึง Echo ไม่ได้)
//  ท่าไม้ตาย Mouse Separade (6 แต้ม · ร่าง My-Th เท่านั้น · คูลดาวน์ 2 เทิร์น — ผู้ใช้สั่ง 2026-10-13): เลือกทิศ แนว 4×1
//    กดเทิร์น N → ข้ามเทิร์น N+1, N+2 → กดได้อีกเทิร์น N+3
//    คลิปครั้งแรกต่อเกม → วงล้อหนูหมุน → พุ่งตรงไปสุดแนว (พังสิ่งกีดขวางที่ผ่าน · ผนึกมิโกะ = หยุดหน้าผนึก)
//    ศัตรูคนแรกในแนวที่หลบไม่พ้น (หลบหลีก/พุ่มดอกไม้สูง/ป่าทึบ · แม่นยำเจาะ) = ชน → คลิปชน (ทุกครั้ง) → ระเบิดสีฟ้า
//      ความเสียหาย 3 (เกราะรับก่อน · ฆ่าได้) แล้วสลับที่: เราไปยืนช่องของเป้า · เป้าถูกโยนไปช่องที่เราออกตัว (เป้าตาย = ไม่มีการโยน)
//      ชน Echo (ตัวใหญ่) = ดาเมจ 3 แล้วหยุดหน้าตัว ไม่สลับที่
//    หลบพ้น = ทะลุผ่านไปชนคนถัดไปได้ · เพื่อนร่วมทีม = ทะลุผ่าน · ไม่ชนใคร = หยุดสุดแนว (ช่องไม่ว่าง = ถอยมาช่องว่างก่อนหน้า)
//    คริติคอลของร่าง My-Th ไม่ติดท่านี้ (ใช้กับตีปกติเท่านั้น)
//  ติดตัว เพื่อคุณหนู: ร่างโซระต่อเนื่องครบ 2 เทิร์น = ฟื้นพลังชีวิต 2 (แปลงร่างแล้วนับใหม่ · เทิร์นที่เพิ่งคืนร่างไม่นับ)
//    · ร่าง My-Th อัตราคริติคอล 20% (ตีปกติ — รวมกับคริของสนามแล้วทอยครั้งเดียว)
// ============================================================

const ID = "sora_otosumi";
const DIR = "/characters/sora_otosumi";
const IMG = {
  base: `${DIR}/sora.jpg`,
  myth: `${DIR}/myth.jpg`,
  toMyth: `${DIR}/sora_skill1.jpg`,
  toSora: `${DIR}/sora_skill1_normal.jpg`,
  skill2: `${DIR}/sora_skill2.jpg`,
  skill3: `${DIR}/sora_skill3.jpg`,
};
const VIDEO = {
  transform: `${DIR}/sora_skill1.mp4`,
  ult: `${DIR}/sora_skill3_normal.mp4`,
  hit: `${DIR}/sora_skill3_hit.mp4`,
};
const CUT = { transform: "soraTransform", ult: "soraUlt", hit: "soraHit" };
// เสียง (client/src/audio.js) — ตีปกติมีดฟัน 2 ครั้ง (ฉากตีเล่นรอยฟัน 2 จังหวะตามเสียง) · สลับอาวุธ = เสียงของอาวุธใหม่
const SFX = { gun: "sora_hit_gun", knife: "sora_hit_knife", toGun: "sora_skill2_gun", toKnife: "sora_skill2_knife" };

const KNIFE_BONUS = 1;
const GUN_RANGE = [1, 3]; // ผู้ใช้สั่งเพิ่มจาก 2 (2026-10-12)
const GUN_BEAM = 3;
const CRIT_PCT = 20;
const REGEN_TURNS = 2; // ผู้ใช้สั่ง 2026-10-12 (เดิม 3)
const REGEN_HP = 2;
const ULT_LEN = 4;
const ULT_DMG = 3;
const ULT_CD = 2;
// จังหวะบนกระดาน (ต้องตรงกับ client/src/board — SORA_T ใน boardDraw.js)
const WHEEL_MS = 1400;
const DASH_STEP_MS = 90;
const BOOM_SECONDS = 1.4;

// ทิศที่เลือก → เวกเตอร์ (ส่งให้ client หันวงล้อ/ตัวละคร — เป้ายืนติดตัว = เส้นทางพุ่งยาว 0 ช่อง เดาทิศจากเส้นทางไม่ได้)
const DIR_VEC = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

const isSora = (p) => !!p && p.characterId === ID;
function fresh() {
  return {
    myth: false,
    gun: false,
    formRound: 0,   // เทิร์นที่กดแปลงร่างล่าสุด (เทิร์นละ 1 ครั้ง)
    weaponRound: 0, // เทิร์นที่สลับอาวุธล่าสุด (เทิร์นละ 1 ครั้ง)
    calm: 0,        // เทิร์นที่อยู่ร่างโซระต่อเนื่อง (ครบ REGEN_TURNS = ฟื้น)
    ultReady: 0,    // Mouse Separade: กดได้อีกเมื่อ roundNumber >= ค่านี้
  };
}
function st(p) { return p.sora || (p.sora = fresh()); }
const mythOn = (p) => isSora(p) && !!st(p).myth;
const gunOn = (p) => mythOn(p) && !!st(p).gun;
const knifeOn = (p) => mythOn(p) && !st(p).gun;

// ---------- ปืน: ดึงเป้าเข้าประชิด ----------
//  ช่องติดตัวเราที่ใกล้เป้าสุด (เป้าห่างแนวตรง 2 = ช่องกลาง · เฉียง = ช่องติดกันทั้งสองช่อง เลือกช่องว่างช่องแรก)
function pull(engine, p, t) {
  if (!p.alive || !p.pos || !t.alive || !t.pos || engine.sizeOf(t) > 1) return;
  const dist = Math.abs(t.pos.x - p.pos.x) + Math.abs(t.pos.y - p.pos.y);
  if (dist <= 1) return;
  const spots = [[1, 0], [-1, 0], [0, 1], [0, -1]]
    .map(([dx, dy]) => ({ x: p.pos.x + dx, y: p.pos.y + dy }))
    .filter((c) => Math.abs(t.pos.x - c.x) + Math.abs(t.pos.y - c.y) === dist - 1);
  const to = spots.find((c) => engine.tileFree(c.x, c.y, t.id));
  if (!to) { engine.log(`🔫 ${p.name} ดึง ${t.name} ไม่ได้ — ช่องข้างหน้าไม่ว่าง`); return; }
  t.pos = { x: to.x, y: to.y };
  engine.log(`🔫 ${p.name} ดึง ${t.name} เข้าประชิด`);
}

// ---------- Mouse Separade ----------
//  ไล่ช่องตามแนว: ผนึกมิโกะ = หยุด · ศัตรูที่หลบไม่พ้น = ชน · หลบพ้น/เพื่อน/ร้านค้า = ทะลุ
function planCharge(engine, p, dir) {
  const tiles = engine.chargeTiles(p, dir, ULT_LEN);
  const passed = [];
  const dodged = new Set();
  let hit = null;
  for (const t of tiles) {
    if (t.wall) break;
    const o = t.unitId ? engine.players[t.unitId] : null;
    if (o && o.alive && !engine.sameTeam(p, o) && !dodged.has(o.id)) {
      o.wasAttacked = true;
      if (!engine.skillDodge(p, o, "Mouse Separade")) { hit = o; break; }
      dodged.add(o.id);
    }
    passed.push(t);
  }
  return { passed, hit };
}
// ช่องที่หยุดได้: ไล่ถอยจากปลายทางมาหาช่องว่าง (ช่องที่มีสิ่งกีดขวางนับว่าว่าง — พังตอนพุ่งผ่าน) · ไม่มีเลย = ที่เดิม
function landIndex(engine, p, passed) {
  for (let i = passed.length - 1; i >= 0; i--) {
    const t = passed[i];
    if (!t.unitId && !t.shop) return i;
  }
  return -1;
}
function smashPassed(engine, p, passed) {
  const keys = passed.filter((t) => t.obstacle && !t.wall).map((t) => `${t.x},${t.y}`);
  const broke = engine.breakObstacles(keys);
  if (broke.length) engine.log(`💥 ${p.name} พุ่งพังสิ่งกีดขวาง ${broke.length} ช่อง`);
  return broke;
}
function charge(engine, p, dir) {
  if (!p.alive || !p.pos) return;
  const start = { ...p.pos };
  const { passed, hit } = planCharge(engine, p, dir);
  const big = hit && engine.sizeOf(hit) > 1;
  // ชนคน: ยืนช่องก่อนถึงเป้าระหว่างคลิปชน (ตำแหน่งจริงยังไม่ขยับ — client ค้างภาพไว้)
  //  ไม่ชน / ชนตัวใหญ่: หยุดช่องว่างสุดท้ายในแนวที่ผ่านมา
  const land = landIndex(engine, p, passed);
  const runTo = hit && !big ? passed.length - 1 : land;
  const path = [start, ...passed.slice(0, runTo + 1).map((t) => ({ x: t.x, y: t.y }))];
  engine.setDash({ id: p.id, path, wheel: true, dir: DIR_VEC[dir] || null });
  const seconds = (WHEEL_MS + Math.max(0, path.length - 1) * DASH_STEP_MS) / 1000 + 0.3;
  engine.skillBeat(seconds, () => {
    const broke = smashPassed(engine, p, passed.slice(0, runTo + 1));
    if (broke.length) engine.boardFx("smashFx", { id: p.id, tiles: broke.map((b) => ({ ...b, step: 0 })) });
    if (!hit) {
      if (land >= 0) p.pos = { x: passed[land].x, y: passed[land].y };
      engine.log(`🐭 ${p.name} พุ่งไปสุดทาง — ไม่ชนใคร`);
      return;
    }
    if (big && land >= 0) p.pos = { x: passed[land].x, y: passed[land].y };
    engine.queueCutscene(p, CUT.hit);
    const stop = path[path.length - 1]; // ช่องที่ภาพค้างไว้ระหว่างคลิปชน (client ต่อแอนิเมชันจากตรงนี้)
    engine.deferAfterCutscene(() => impact(engine, p, hit, start, stop, big));
  });
}
// คลิปชนจบ: ระเบิดสีฟ้า + ดาเมจ 3 + สลับที่
function impact(engine, p, t, start, stop, big) {
  if (!p.alive || !t.alive || !t.pos) return;
  const at = { ...t.pos };
  const before = (t.hp || 0) + (t.armor || 0);
  t.wasAttacked = true;
  engine.dealMixed(t, ULT_DMG);
  if (t.alive && t.hp <= 0) engine.instantDeath(t);
  const dealt = Math.max(0, before - ((t.hp || 0) + (t.armor || 0)));
  engine.log(`💥 Mouse Separade → ${t.name} -${dealt} (ลดเกราะก่อน)`);
  if (!t.alive) { t.pos = null; engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`); }
  let swap = null;
  if (!big) {
    if (t.alive) {
      t.pos = { ...start };
      swap = { id: t.id, from: at, to: { ...start } };
      engine.log(`🔄 ${p.name} สลับที่กับ ${t.name}`);
    }
    p.pos = { ...at };
  }
  engine.setDash({ id: p.id, path: big ? [{ ...p.pos }] : [{ ...stop }, at], swap, boom: at, boomSize: (t.alive && engine.sizeOf(t)) || 1 });
  engine.skillBeat(BOOM_SECONDS, () => {});
}

module.exports = {
  id: ID,
  IMG, VIDEO, CUT, SFX, KNIFE_BONUS, GUN_RANGE, CRIT_PCT, REGEN_TURNS, REGEN_HP, ULT_LEN, ULT_DMG, ULT_CD,
  WHEEL_MS, DASH_STEP_MS,
  isSora, mythOn, gunOn,

  resetCombat(p) { p.sora = isSora(p) ? fresh() : null; },
  displayImg(p) { return mythOn(p) ? IMG.myth : null; },

  // ---------- ตีปกติ ----------
  range(p) { return gunOn(p) ? GUN_RANGE : null; },
  damageBonus(engine, attacker, target, ctx) {
    if (!knifeOn(attacker)) return 0;
    ctx.soraKnife = KNIFE_BONUS;
    return KNIFE_BONUS;
  },
  attackFxNames(attacker, atkCtx) { return atkCtx && atkCtx.soraKnife ? [`My-Th Edge มีด +${atkCtx.soraKnife}`] : []; },
  critPct(p) { return mythOn(p) ? CRIT_PCT : 0; },
  attackBeam(p) { return gunOn(p) ? GUN_BEAM : 0; },
  attackBeamTone(p) { return gunOn(p) ? "blue" : null; },
  attackHitFx(p) { return knifeOn(p) ? "mythSlash" : null; },
  attackSound(p) {
    if (gunOn(p)) return SFX.gun;
    if (knifeOn(p)) return SFX.knife;
    return undefined;
  },
  afterBoardAttack(engine, attacker, target, res) {
    if (!gunOn(attacker) || !res || res.dodge || !target.alive) return null;
    return () => pull(engine, attacker, target);
  },

  // ---------- สกิล ----------
  canUseSkill(engine, p, tier) {
    if (!isSora(p)) return true;
    const s = st(p);
    if (tier === "basic") return s.formRound !== engine.roundNumber;
    if (tier === "secondary") return s.myth && s.weaponRound !== engine.roundNumber;
    if (tier === "ultimate") return s.myth && engine.roundNumber >= s.ultReady;
    return false;
  },
  // แปลงร่าง / สลับอาวุธ ไม่นับเป็นการใช้สกิล (ผู้ใช้ตัดสิน) — กดแล้วยังใช้ท่าไม้ตายได้ในเทิร์นเดียวกัน
  skipsTurnQuota(p, tier) { return isSora(p) && (tier === "basic" || tier === "secondary"); },
  ignoresTurnQuota(p, tier) { return isSora(p) && (tier === "basic" || tier === "secondary"); },
  skillSound(p, tier) {
    if (!isSora(p) || tier !== "secondary") return null;
    return st(p).gun ? SFX.toGun : SFX.toKnife; // เรียกหลังสลับแล้ว = เสียงของอาวุธที่ถืออยู่ตอนนี้
  },
  skillPub(p, tier) {
    if (!isSora(p)) return null;
    if (tier === "basic") return { img: mythOn(p) ? IMG.toSora : IMG.toMyth };
    if (tier === "secondary") return { name: `My-Th Edge (${st(p).gun ? "มีด" : "ปืน"})` };
    return null;
  },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isSora(p)) return "";
    const s = st(p);
    p.cutsceneShown ||= {};
    if (tier === "basic") {
      s.formRound = engine.roundNumber;
      s.myth = !s.myth;
      s.calm = 0;
      if (s.myth && !p.cutsceneShown[CUT.transform]) {
        p.cutsceneShown[CUT.transform] = true;
        engine.queueCutscene(p, CUT.transform);
      }
      engine.log(s.myth ? `🐭 ${p.name} แปลงร่างเป็น Kamen Rider My-Th` : `🐭 ${p.name} กลับเป็นร่างโซระ`);
      return s.myth ? " — Kamen Rider My-Th" : " — โซระ";
    }
    if (tier === "secondary") {
      s.weaponRound = engine.roundNumber;
      s.gun = !s.gun;
      engine.log(`🗡️ ${p.name} เปลี่ยน My-Th Edge เป็น${s.gun ? "ปืน" : "มีด"}`);
      return "";
    }
    if (tier === "ultimate") {
      s.ultReady = engine.roundNumber + 1 + ULT_CD;
      if (!p.cutsceneShown[CUT.ult]) {
        p.cutsceneShown[CUT.ult] = true;
        engine.queueCutscene(p, CUT.ult);
      }
      engine.log(`🐭 ${p.name} ใช้ Mouse Separade`);
      engine.deferAfterCutscene(() => charge(engine, p, opts.dir));
      return "";
    }
    return "";
  },

  // ---------- เพื่อคุณหนู: ร่างโซระครบ 2 เทิร์น ฟื้น 2 (endTurn — หลังลูปลดเทิร์นสถานะ) ----------
  onEndTurn(engine) {
    for (const p of Object.values(engine.players)) {
      if (!isSora(p) || !p.alive) continue;
      const s = st(p);
      if (s.myth || s.formRound === engine.roundNumber) continue;
      s.calm++;
      if (s.calm < REGEN_TURNS) continue;
      s.calm = 0;
      const healed = engine.healHp(p, REGEN_HP);
      engine.log(`🐭 ${p.name} เพื่อคุณหนู — ฟื้นพลังชีวิต +${healed}`);
    }
  },

  // ---------- ข้อมูลให้ client ----------
  soraState(engine, p) {
    if (!isSora(p)) return undefined;
    const s = st(p);
    return { myth: !!s.myth, gun: !!s.gun, calm: s.calm, calmMax: REGEN_TURNS };
  },
  skillLocks(engine, p) {
    if (!isSora(p)) return undefined;
    const s = st(p), r = engine.roundNumber;
    return {
      basic: { locked: s.formRound === r, free: true }, // free = ไม่กินโควตาสกิลของเทิร์น (ปุ่มยังกดได้หลังใช้สกิลอื่น)
      secondary: { locked: !s.myth || s.weaponRound === r, free: true },
      // เทิร์นที่กดเอง = โควตาสกิลล็อกอยู่แล้ว → โชว์ไม่เกิน ULT_CD
      ultimate: { locked: !s.myth, cd: Math.min(ULT_CD, Math.max(0, s.ultReady - r)) },
    };
  },
};
