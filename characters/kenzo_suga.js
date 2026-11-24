// ============================================================
//  เค็นโซ ซุกะ (Kamen Rider Bake) — ง่าย · id "kenzo_suga" (สเปกผู้ใช้ 2026-11-24 · GRID_PLAN §7.44)
//
//  พลังชีวิต 10 / เกราะ 5 · พลังโจมตี 1 · เดิน 4 · ตีปกติระยะ 1–3 โดนคนเดียว (ทั้งสองร่าง)
//  ช่อง basic = Bake Magnum (ปุ่มเดียวของตัวละคร — รอง/ท่าไม้ตายซ่อน) · HUD ปืนเล่นได้จริง client/src/screens/hud/BakeMagnum.jsx
//    form "henshin" = แปลงร่าง Kamen Rider Bake · "revert" = คืนร่างคน — ฟรี ไม่นับโควตาสกิล ไม่มีคูลดาวน์ (ผู้ใช้เลือก)
//    คลิปแปลงร่างเล่นครั้งแรกของเกมเท่านั้น (ผู้ใช้สั่ง "วีดีโอเล่นครั้งเดียว") · ครั้งหลังเสียง bake_henshin + เอฟเฟกต์บนกระดาน
//  สกิลติดตัว นักวิทย์อัจฉริยะ: ร่างไรเดอร์ตีปกติโดน = การกัดกิน +1 (สถานะสะสม kenzoCorrode ถาวร · ต้าน/ล้างได้ · ล้าง = หายทั้งก้อน)
//    การกัดกิน N = พลังโจมตี −N (ตีปกติ + สกิลที่คิดจากพลังโจมตี — ฮุค broadcast auraAtk) · ไม่นับปฏิกิริยาธาตุ (ปฏิกิริยาไม่ใช้พลังโจมตี)
//  ร่างไรเดอร์: ตีปกติแล้ว 30% ได้ตีอีกครั้ง (ไม่จบตา เลือกเป้าใหม่ได้ ทอยต่อได้เรื่อยๆ — ผู้ใช้เลือก) · ตีโดน 30% ผุพัง 2 เทิร์น ·
//    ต้นเทิร์นเสียพลังชีวิต 1 (ทะลุเกราะ)
//  ร่างคน: แต้มสกิลไม่ฟื้น (ทุกช่องทาง — blocksSkillGain · ผู้ใช้สั่ง) · ต้นเทิร์นฟื้นพลังชีวิต 1 โดยใช้แต้มสกิล 1 (ไม่มีแต้ม = ไม่ฟื้น — ผู้ใช้สั่ง) · เลือดเต็ม = ไม่ฟื้น ไม่เสียแต้ม (Claude ตัดสิน)
//
//  Claude ตัดสินเอง: ตีสวนไม่ติดผล (ตีสวนปิดทั้งเกมอยู่แล้ว) · ลบสกิลติดตัวปิดเฉพาะการติดการกัดกิน (การกัดกินที่ติดอยู่ยังมีผล) ·
//    แปลงร่าง/คืนร่างล็อกการเดินตามกฎกลาง (ยังตีได้)
//  ธาตุ: ตีปกติ = มืด ทั้งสองร่าง (ผู้ใช้สั่ง 2026-11-24)
// ============================================================

const PassiveSeal = require("../server/passiveSeal");

const ID = "kenzo_suga";
const DIR = "/characters/kenzo_suga";
const IMG = {
  base: `${DIR}/kenzo.webp`, bake: `${DIR}/bake.webp`,
  gun: `${DIR}/bake_magnum.webp`, gunFull: `${DIR}/bake_magnum_card.webp`, // ปืนงับการ์ด Gochizo (ประกอบจาก bake_magnum_full ที่เจาะช่องการ์ด + gochizo) gunOpen: `${DIR}/bake_magnum_standby.webp`,
  card: `${DIR}/gochizo.webp`,
};
const VIDEO = { henshin: `${DIR}/bake_henshin.mp4` };
const CUT = { henshin: "kenzoHenshin" };
const CORRODE = "kenzoCorrode";
const AGAIN_PCT = 30;
const DECAY_PCT = 30;
const DECAY_TURNS = 2;
const RIDER_DRAIN = 1;
const HUMAN_HEAL = 1;

const isKenzo = (p) => !!p && p.characterId === ID && !p.summon;
function fresh() { return { rider: false, riderAt: 0, again: false }; }
function st(p) { return p.kenzo || (p.kenzo = fresh()); }
const rider = (p) => isKenzo(p) && st(p).rider;
const corrodeOf = (t) => (t && t.statuses && t.statuses[CORRODE]) || 0;

function revert(engine, p, why) {
  const s = st(p);
  if (!s.rider) return;
  s.rider = false;
  engine.log(`🔧 ${p.name} ${why}`);
}

// การกัดกิน +1 (ต้านได้ — applyDebuff) → true = ติด
function corrode(engine, p, t) {
  if (!t || !t.alive || engine.sameTeam(p, t) || !PassiveSeal.on(p)) return false;
  const cur = corrodeOf(t);
  const ok = engine.withEffectSource(p, () => engine.applyDebuff(t, CORRODE, null, cur + 1));
  if (!ok) return false;
  t.statuses[CORRODE] = cur + 1;
  engine.log(`🧪 ${t.name} ถูกกัดกิน ${t.statuses[CORRODE]} — พลังโจมตี −${t.statuses[CORRODE]}`);
  return true;
}

module.exports = {
  id: ID, IMG, VIDEO, CUT, CORRODE, AGAIN_PCT, DECAY_PCT,
  resetCombat(p) { if (isKenzo(p)) p.kenzo = fresh(); },

  // ---------- หน้าตาตามร่าง ----------
  displayImg(p) { return rider(p) ? IMG.bake : null; },
  characterPub(engine, p) { return rider(p) ? { name: "Kamen Rider Bake", img: IMG.bake } : null; },
  unseenLook(p) { return rider(p) ? { img: IMG.bake, name: "Kamen Rider Bake" } : null; },
  skillHidden(p, tier) { return isKenzo(p) && tier !== "basic"; },
  skillPub(p, tier) {
    if (!isKenzo(p) || tier !== "basic") return null;
    return { img: st(p).rider ? IMG.gunFull : IMG.gun };
  },

  // ---------- Bake Magnum ----------
  skillCost(p, tier, base) { return tier === "basic" ? 0 : base; },
  skillFree(p, tier) { return tier === "basic"; },
  skipsTurnQuota(p, tier) { return tier === "basic"; },
  ignoresTurnQuota(p, tier) { return tier === "basic"; },
  silentFlash(p, tier, opts) { return !(opts && opts.form === "henshin"); },
  skillSound() { return null; }, // เสียงอยู่ใน applyInstantSkill (ครั้งแรกมีคลิป = เงียบ)
  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (tier !== "basic") return false;
    const s = st(p);
    if (opts.form === "henshin") return !s.rider;
    if (opts.form === "revert") return s.rider;
    return false;
  },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (tier !== "basic") return "";
    const s = st(p);
    if (opts.form === "henshin") {
      s.rider = true;
      s.riderAt = engine.severStamp();
      if (!p.cutsceneShown[CUT.henshin]) {
        p.cutsceneShown[CUT.henshin] = true;
        engine.queueCutscene(p, CUT.henshin);
      } else {
        engine.sfx("bake_henshin");
        if (p.pos) engine.boardFx("bakeFx", { kind: "henshin", id: p.id, at: { ...p.pos } });
      }
      engine.log(`🔫 ${p.name} Bake Magnum — แปลงร่าง Kamen Rider Bake`);
      return "";
    }
    if (opts.form === "revert") {
      revert(engine, p, "คืนร่างมนุษย์");
      engine.sfx("bake_eject");
      if (p.pos) engine.boardFx("bakeFx", { kind: "revert", id: p.id, at: { ...p.pos } });
    }
    return "";
  },

  // ---------- ตีปกติ ----------
  attackElement(engine, p) { return isKenzo(p) ? "dark" : null; }, // ตีปกติธาตุมืด ทั้งสองร่าง (ผู้ใช้สั่ง 2026-11-24)
  attackStyle(p) { return rider(p) ? "bakeShotRider" : "bakeShot"; },
  attackSound(p) { return isKenzo(p) ? (st(p).again ? "bake_shot2" : "bake_shot") : undefined; }, // นัดที่ได้ยิงซ้ำ = เสียงอีกแบบ
  afterStrike(engine, p) { if (isKenzo(p)) st(p).again = false; },
  onActorEnd(engine, p) { if (isKenzo(p)) st(p).again = false; },
  onStrikeLanded(engine, attacker, target, { counter } = {}) {
    if (!rider(attacker) || counter || !target || engine.sameTeam(attacker, target)) return [];
    const names = [];
    const hit = { id: attacker.id, targetId: target.id, at: target.pos ? { ...target.pos } : null };
    if (corrode(engine, attacker, target)) {
      names.push(`การกัดกิน ${corrodeOf(target)}`);
      if (hit.at) engine.boardFxAtHit("bakeFx", { ...hit, kind: "corrode", n: corrodeOf(target) });
    }
    if (target.alive && Math.random() * 100 < DECAY_PCT
      && engine.withEffectSource(attacker, () => engine.applyDebuff(target, "decay", null, DECAY_TURNS))) {
      names.push(`ผุพัง ${DECAY_TURNS} เทิร์น`);
      engine.log(`🥀 ${target.name} ติดผุพัง ${DECAY_TURNS} เทิร์น`);
      if (hit.at) engine.boardFxAtHit("bakeFx", { ...hit, kind: "decay" });
    }
    return names;
  },
  // 30% ได้ตีอีกครั้ง: กลับเข้าตาเดิน ตีปกติได้อีก 1 ครั้ง เลือกเป้าใหม่ได้ · ครั้งที่ได้มาก็ทอยต่อได้
  extraStrike(engine, p) {
    if (!rider(p) || !(Math.random() * 100 < AGAIN_PCT)) return false;
    st(p).again = true;
    engine.log(`🔫 ${p.name} ได้ยิงอีกครั้ง!`);
    if (p.pos) engine.boardFx("bakeFx", { kind: "again", id: p.id, at: { ...p.pos } });
    return true;
  },

  // การกัดกิน: หักพลังโจมตีของผู้ติด (ฮุค broadcast — ใครติดก็โดน รวมตีปกติและสกิลที่คิดจากพลังโจมตี)
  auraAtk(engine, attacker) {
    const n = corrodeOf(attacker);
    return n > 0 ? { amount: -n, name: `การกัดกิน −${n}`, img: IMG.card } : null;
  },

  // ร่างคน: แต้มสกิลไม่ฟื้นทุกช่องทาง (ผู้ใช้สั่ง 2026-11-24 — combat.addSkill)
  blocksSkillGain(p) { return isKenzo(p) && !st(p).rider; },

  // ---------- ต้นเทิร์น ----------
  onRoundStartTick(engine, p) {
    if (!isKenzo(p) || !p.alive) return;
    const s = st(p);
    if (s.rider) {
      p._statusDamage = true;
      engine.withEffectSource(null, () => engine.dealDirect(p, RIDER_DRAIN));
      p._statusDamage = false;
      engine.log(`🧪 ${p.name} ร่าง Kamen Rider Bake — เสียพลังชีวิต ${RIDER_DRAIN} (ทะลุเกราะ)`);
      if (p.alive && p.hp <= 0) {
        engine.instantDeath(p);
        if (!p.alive) { p.pos = null; engine.log(`💀 ${p.name} ตกรอบ!`); }
      }
      return;
    }
    if (p.hp >= engine.maxHpOf(p) || (p.skillPoints || 0) < 1) return;
    p.skillPoints -= 1;
    const got = engine.healHp(p, HUMAN_HEAL);
    engine.log(`💚 ${p.name} ร่างมนุษย์ — ใช้แต้มสกิล 1 ฟื้นพลังชีวิต ${got}`);
  },

  // ---------- ผลสกิลที่ตัดได้ (server/sever.js) ----------
  severables(engine, p) {
    if (!rider(p) || !p.alive) return [];
    return [{ key: "bake", label: "Kamen Rider Bake", at: st(p).riderAt, cancel: () => revert(engine, p, "ถูกตัดการแปลงร่าง") }];
  },

  // ---------- ข้อมูลให้ client (players[].kenzo) ----------
  kenzoState(engine, p) {
    if (!isKenzo(p)) return undefined;
    return { rider: st(p).rider, henshinShown: !!p.cutsceneShown[CUT.henshin] };
  },
};
