// ============================================================
//  นักบินปริศนา (Silver Bullet) — ระดับง่าย · unique · id "sliver_bullet" (สะกดตามโฟลเดอร์สื่อเดิม)
//  พอร์ตจากโปรเจกต์เก่า (ก่อนมีกระดาน) แล้วปรับให้เข้ากับตาเดิน — กติกาที่ผู้ใช้ตัดสินดู GRID_PLAN §7.5
//
//  ค่าพื้นฐาน: พลังชีวิต 5 · เกราะ 2 (ผู้ใช้สั่ง) · ไม่มีท่าไม้ตาย · แขน (p.sliver.arm) เริ่มเกมมีแขน
//  สกิลพื้นฐาน เปลี่ยนชิ้นส่วน (ไม่กินโควตาสกิล · ไม่ทำให้ปรากฏตัว)
//    ไม่มีแขน: 2 แต้ม → ได้แขน + ฟื้นพลังชีวิต 1 · มีแขน: 3 แต้ม → ฟื้นพลังชีวิต 2 (ราคาผ่าน skillCost — useSkill/view ใช้สูตรเดียวกัน)
//    คลิปครั้งแรกต่อเกม · ครั้งต่อไปการ์ดแจ้งเตือน + เสียง · ระหว่างล่องหน คลิป/การ์ด/เสียงเฉพาะตัวเอง + เพื่อนร่วมทีม
//  สกิลรอง Beam Magnum (4 แต้ม · ต้องมีแขน · เสียแขน · ปรากฏตัว) — แนว 6×1 ทะลุโดนศัตรูทุกคนในแนว
//    ดาเมจ 4 แบบไอเทม (เหมือนกระสุน Nursedessei: เกราะรับก่อน · หลบหลีก/ช่องหลบใช้ไม่ได้ · ไม่บวกเปราะบาง) · ไม่จบตา (ตีปกติต่อได้)
//    คลิปครั้งแรกต่อเกม · ครั้งต่อไปเสียงยิง · ลำแสงบนกระดาน (beamFx) + ดาเมจลง "หลังคลิปจบ"
//  สกิลติดตัว ซุ่มโจมตี (ล่องหน — ระบบมองเห็นกลางอยู่ server/visibility.js)
//    เงื่อนไข: ffa = ผู้เล่นที่ยังรอด (รวมตัวเอง) ≥ 3 · โหมดทีม = เพื่อนร่วมทีมที่ยังรอด ≥ 2 (duo ไม่เข้าเงื่อนไข)
//    เริ่มเกม/ต้นเทิร์นที่ไม่ได้ปรากฏตัวอยู่ = ล่องหน · ศัตรูมองไม่เห็นเลย (พุ่มหญ้าผืนเดียวกันก็ไม่เห็น)
//    ปรากฏตัว: ตีปกติ / ยิงปืน / ไอเทมใส่คนอื่น / Beam Magnum ("act") · อยู่ในพื้นที่สกิลโจมตีของศัตรู ("hit") · ศัตรูเดินชน ("bump")
//      → ปรากฏ 2 เทิร์น (เทิร์นนี้ + เทิร์นหน้า) แล้วล่องหนอีกครั้งต้นเทิร์นถัดไป
//      "act" ระหว่างปรากฏอยู่ = นับ 2 เทิร์นใหม่ · "hit"/"bump" ระหว่างปรากฏอยู่ = ไม่นับเพิ่ม (ผู้ใช้ตัดสิน)
//    เงื่อนไขหมด (มีคนตาย) = ปรากฏตัวถาวร
// ============================================================

const ID = "sliver_bullet";
const DIR = "/characters/sliver_bullet";
const IMG = {
  cover: `${DIR}/sliver_bullet_banagher.png`,
  base: `${DIR}/sliver_bullet.png`,
  skill1: `${DIR}/sliver_bullet_skill1.png`,
  skill2: `${DIR}/sliver_bullet_skill2.webp`,
};
const VIDEO = {
  reload: `${DIR}/sliver_bullet_skill1.mp4`,
  beam: `${DIR}/sliver_bullet_skill2.mp4`,
};
const SFX = { reload: "sliver_reload", shot: "sliver_shot" };
const CUT = { reload: "sliverReload", beam: "sliverBeam" };

const HP = 5;
const ARMOR = 2;
const COST_NO_ARM = 2;
const COST_ARM = 3;
const HEAL_NO_ARM = 1;
const HEAL_ARM = 2;
const BEAM_DMG = 4;
const BEAM_LEN = 6;
const REVEAL_TURNS = 2;
const FFA_MIN_ALIVE = 3;
const TEAM_MIN_MATES = 2;

const isPilot = (p) => !!p && p.characterId === ID;
function fresh() {
  return {
    arm: true,
    hidden: false,
    revealUntil: -1, // ปรากฏตัวถึงจบเทิร์นนี้ (เลขรอบ) — -1 = เริ่มเกมล่องหนทันที (startMatch ตั้งรอบ 0)
    logCut: 0,      // index ใน lastLog ตอนปรากฏตัวรอบนี้ — บรรทัดก่อนหน้าที่มีชื่อเขาซ่อนจากศัตรู
    logRound: 0,
  };
}
function st(p) { return p.sliver || (p.sliver = fresh()); }
function pilots(engine) { return Object.values(engine.players).filter(isPilot); }

function conditionHolds(engine, p) {
  if (!p.alive) return false;
  const living = Object.values(engine.players).filter((o) => o.alive);
  if (engine.teamModeActive()) {
    if (!p.teamId) return false;
    return living.filter((o) => o.id !== p.id && o.teamId === p.teamId).length >= TEAM_MIN_MATES;
  }
  return living.length >= FFA_MIN_ALIVE;
}
// ตัวเอง + เพื่อนร่วมทีม (คนที่เห็นความลับระหว่างล่องหน)
function audience(engine, p) {
  const out = [p.id];
  if (engine.teamModeActive() && p.teamId) {
    for (const o of Object.values(engine.players)) if (o.id !== p.id && o.teamId === p.teamId) out.push(o.id);
  }
  return out;
}
function reveal(engine, p, turns) {
  const s = st(p);
  if (s.hidden) {
    s.hidden = false;
    s.logCut = engine.lastLogLength;
    s.logRound = engine.roundNumber;
    engine.log(`🛩️ ${p.name} ปรากฏตัวบนสนาม!`);
  }
  if (turns) s.revealUntil = Math.max(s.revealUntil, engine.roundNumber + turns - 1);
}

module.exports = {
  id: ID,
  IMG, VIDEO, SFX, CUT, HP, ARMOR, COST_NO_ARM, COST_ARM, HEAL_NO_ARM, HEAL_ARM, BEAM_DMG, BEAM_LEN, REVEAL_TURNS,
  isPilot, conditionHolds,

  maxHp() { return HP; },
  maxArmor() { return ARMOR; },
  resetCombat(p) { p.sliver = isPilot(p) ? fresh() : null; },
  displayImg(p) { return isPilot(p) ? IMG.base : null; },
  attackSound(p) { return isPilot(p) ? SFX.shot : undefined; },

  // ---------- ซุ่มโจมตี ----------
  stealthed(p) { return isPilot(p) && !!p.sliver && p.sliver.hidden; },
  // เริ่มเกม / ต้นเทิร์น: หมดเวลาปรากฏตัวแล้ว + เงื่อนไขจริง = ล่องหน
  refresh(engine) {
    for (const p of pilots(engine)) {
      const s = st(p);
      if (!p.alive) { s.hidden = false; continue; }
      if (!conditionHolds(engine, p)) { if (s.hidden) reveal(engine, p, 0); continue; }
      if (!s.hidden && engine.roundNumber > s.revealUntil) s.hidden = true;
    }
  },
  // มีคนตาย: เงื่อนไขหมด = ปรากฏตัว
  onDeath(engine) {
    for (const p of pilots(engine)) {
      if (st(p).hidden && !conditionHolds(engine, p)) reveal(engine, p, 0);
    }
  },
  // kind: "act" = ตัวเองโจมตี (นับ 2 เทิร์นใหม่เสมอ) · "hit"/"bump" = ถูกพบ (นับเฉพาะตอนล่องหนอยู่)
  onReveal(engine, p, kind) {
    if (!isPilot(p) || !p.alive) return;
    const s = st(p);
    if (kind === "act" || s.hidden) reveal(engine, p, REVEAL_TURNS);
  },
  // บันทึก (lastLog) ล้างทุกต้นเทิร์น — จุดตัดใช้ได้เฉพาะเทิร์นที่ปรากฏตัว
  logCut(p, round) {
    const s = p.sliver;
    return s && s.logRound === round ? s.logCut : 0;
  },

  // ---------- สกิล ----------
  skillCost(p, tier, base) {
    if (!isPilot(p) || tier !== "basic") return base;
    return st(p).arm ? COST_ARM : COST_NO_ARM;
  },
  canUseSkill(engine, p, tier) {
    if (!isPilot(p)) return true;
    if (tier === "basic") return true;
    if (tier === "secondary") return st(p).arm;
    return false;
  },
  // เปลี่ยนชิ้นส่วนไม่กินโควตาสกิล (ผู้ใช้ตัดสิน) — กดแล้วยังยิง Beam Magnum ได้ในเทิร์นเดียวกัน
  skipsTurnQuota(p, tier) { return isPilot(p) && tier === "basic"; },
  ignoresTurnQuota(p, tier) { return isPilot(p) && tier === "basic"; },
  // ไม่ขึ้นป้ายสกิลกลาง (skillFlash) / ไม่บันทึกใน roundSkills — เปลี่ยนชิ้นส่วนมีคลิป/การ์ดของตัวเอง (ระหว่างล่องหนต้องเงียบ)
  silentFlash(p, tier) { return isPilot(p) && tier === "basic"; },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isPilot(p)) return "";
    const s = st(p);
    p.cutsceneShown ||= {};
    if (tier === "basic") {
      const onlyFor = s.hidden ? audience(engine, p) : undefined;
      const hadArm = s.arm;
      s.arm = true;
      const healed = engine.healHp(p, hadArm ? HEAL_ARM : HEAL_NO_ARM);
      if (!p.cutsceneShown[CUT.reload]) {
        p.cutsceneShown[CUT.reload] = true;
        engine.queueCutscene(p, CUT.reload, onlyFor);
      } else {
        engine.notifyTransform(p, CUT.reload, onlyFor);
        engine.sfx(SFX.reload, onlyFor);
      }
      engine.log(`🔧 ${p.name} เปลี่ยนชิ้นส่วน — ${hadArm ? "" : "ได้แขนใหม่ · "}ฟื้นพลังชีวิต +${healed}`);
      return "";
    }
    if (tier === "secondary") {
      s.arm = false;
      reveal(engine, p, REVEAL_TURNS);
      const video = !p.cutsceneShown[CUT.beam];
      if (video) { p.cutsceneShown[CUT.beam] = true; engine.queueCutscene(p, CUT.beam); }
      const from = p.pos ? { ...p.pos } : null;
      const dir = opts.dir;
      engine.log(`🔫 ${p.name} ยิง Beam Magnum (เสียแขน)`);
      // ลำแสง + ดาเมจลงหลังคลิปจบ (ไม่มีคลิป = ทันที)
      engine.deferAfterCutscene(() => {
        if (from) engine.boardFx("beamFx", { from, dir, len: BEAM_LEN, color: engine.colorOf(p) });
        if (!video) engine.sfx(SFX.shot);
        for (const id of targets || []) {
          const t = engine.players[id];
          if (!t || !t.alive || t.id === p.id || engine.sameTeam(p, t)) continue;
          t.wasAttacked = true;
          const before = (t.hp || 0) + (t.armor || 0);
          engine.dealMixed(t, BEAM_DMG);
          if (t.alive && t.hp <= 0) engine.instantDeath(t);
          const dealt = Math.max(0, before - ((t.hp || 0) + (t.armor || 0)));
          engine.log(`💥 Beam Magnum → ${t.name} -${dealt} (ลดเกราะก่อน)`);
          if (!t.alive) { t.pos = null; engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`); }
        }
      });
      return "";
    }
    return "";
  },

  // ---------- ข้อมูลให้ client ----------
  //  hidden ส่งจริงเฉพาะตัวเอง + เพื่อนร่วมทีม (ศัตรูได้ false — และได้ pos = null อยู่แล้วตอนล่องหน)
  publicState(engine, p, viewer) {
    if (!isPilot(p)) return undefined;
    const s = st(p);
    const inside = !!viewer && audience(engine, p).includes(viewer.id);
    return {
      arm: !!s.arm,
      hidden: inside ? !!s.hidden : false,
      revealLeft: !s.hidden && s.revealUntil >= engine.roundNumber ? s.revealUntil - engine.roundNumber + 1 : 0,
    };
  },
  skillLocks(engine, p) {
    if (!isPilot(p)) return undefined;
    return { basic: { locked: false }, secondary: { locked: !st(p).arm }, ultimate: { locked: true } };
  },
};
