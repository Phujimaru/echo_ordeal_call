// ============================================================
//  โจชัว รอสฟิลด์ (Final Fantasy XVI · เทพไฟ — Dominant แห่งนกเพลิง) — Boss · id "joshua_rosfield" · GRID_PLAN §7.41 (2026-11-23)
//
//  ค่าพื้นฐาน (ผู้ใช้): พลังชีวิต 6 · เกราะ 2 (ไม่มีโบนัสกลาง — combat.STAT_BONUS_OF) · เดิน 4 · ตีปกติระยะ 1–3 เป้าเดียว · พลังโจมตี 1
//  ตีปกติ: ฟันดาบ ไม่มีธาตุ (ผู้ใช้ 2026-11-23) · ฉากตีฟันไขว้ทอง (attackHitFx "saberGold") · เสียงดาบ vergil_slash2 (Mixkit — สำเนาในเครื่อง)
//  สกิลพื้นฐาน เพื่อปกป้องทุกคน (2 แต้ม · คูลดาวน์ 1 เทิร์น = กดเทิร์น N → N+2): ธาตุไฟ · กรวย 4 ไปข้างหน้า (เลือกทิศ)
//    ศัตรูทุกคนในกรวย: ความเสียหาย 1 (ร่างนกเพลิง 2 · หลบได้ · ลดเกราะก่อน) + ลุกไหม้ 2
//  สกิลรอง พรของนกเพลิง (1–3 แต้ม · ร่างนกเพลิง 1–4 · คูลดาวน์ 1 เทิร์น): ตัวเองหรือ 1 คนในระยะ 3 ฟื้นพลังชีวิตเท่าแต้มที่ใช้
//  ท่าไม้ตาย สวมร่างนกเพลิง (4 แต้ม · ไม่กินโควตา = ใช้แล้วกดสกิลอื่นต่อได้อีก 1): 3 เทิร์น (สถานะ joshuaPhoenix 3 — ลดที่ endTurn)
//    · กด = คลิป joshua_skill3 ทุกครั้ง (ผู้ใช้ 2026-11-23 · บีบ crf 23) → คลิปจบ: ศัตรูทุกคนในระยะเดินรอบตัว (หลบได้) ลุกไหม้ 2 + คราบไฟ
//    · ระหว่างร่าง: หมากมีหางริบบิ้นขนนกเพลิงแบบในคลิป (aura joshuaPhoenix) + เสียงไฟลุกวนเป็นพื้นหลัง (joshua_fire_loop — Mixkit "Campfire crackles" #1330 · คลิปเล่น = พัก)
//    · การกระทำของโจชัวที่ทำให้เกิดปฏิกิริยา → ติดคราบไฟใส่ผู้โดนอีกครั้งทันที (ฮุค broadcast afterReaction — server/element.js)
//    · ศัตรูโจมตีใส่ (ตีปกติ/สกิล/ปืน — รวมหลบพ้น) → ผู้โจมตีติดลุกไหม้ 1 (ผู้ใช้ 2026-11-23 · 1 ครั้งต่อการโจมตี — คีย์แบบเฟิร์น)
//  สกิลติดตัว นกเพลิงอมตะ: ผู้ใช้ยังไม่ระบุ — เว้นไว้ (ตัวนกเพลิงใหญ่จะมาจากสกิลนี้ทีหลัง · รูป phoenix.webp เตรียมไว้แล้ว)
//  สกิลติดตัว ลูกชายคนเล็ก รอสฟิลด์ (ตอนนี้อยู่ช่อง passive — นกเพลิงอมตะมาเมื่อไรย้ายไป passive2):
//    · ลุกไหม้บนตัวโจชัว = ฟื้นพลังชีวิต 1 แทนเสียหาย (ฮุค hburnHeals — _universal_status.tickBurn)
//    · ปฏิกิริยาที่มีไฟเกิดบนตัวโจชัว = ยังรับความเสียหาย แล้วฟื้นพลังชีวิต 2 (ฮุค broadcast onReactionHit — ก่อนตัดสินตาย)
//    · ตีปกติโดน = เป้าติดลุกไหม้ 1
//    ลบสกิลติดตัว (server/passiveSeal.js): ทั้ง 3 ข้อไม่ทำงาน · ผลของท่าไม้ตายยังอยู่
//  Claude ตัดสินเอง (บอกผู้ใช้แล้ว): พรของนกเพลิงเลือกศัตรูได้ด้วย (สเปกไม่จำกัด) · ท่าไม้ตายไม่มีคูลดาวน์ (ค้างอยู่ = กดซ้ำไม่ได้)
//   · ลุกไหม้สวนกลับไม่ติดเพื่อนร่วมทีม · ถูกเรียวกิตัด/ล้างบัฟ = ร่างนกเพลิงหมดทันที
// ============================================================
const PassiveSeal = require("../server/passiveSeal");
const Board = require("../server/board");

const ID = "joshua_rosfield";
const DIR = "/characters/joshua_rosfield";
const IMG = {
  base: `${DIR}/joshua.webp`,
  basic: `${DIR}/skill1.webp`,
  secondary: `${DIR}/skill2.webp`,
  ultimate: `${DIR}/skill3.webp`,
  phoenix: `${DIR}/phoenix.webp`,
};
const FX = "joshuaFx";
const VIDEO = { ultimate: `${DIR}/joshua_skill3.mp4` };
const CUT = { ultimate: "joshuaPhoenix" };
const CLIP_SEC = { ultimate: 15 }; // 14.93 วิ
// เสียง (client/src/audio.js): ฟันดาบ = สำเนา vergil slash2 · เสียงไฟ = Mixkit (ผู้ใช้สั่งโหลด 2026-11-23)
const SFX = { slash: "joshua_slash", fire: "joshua_fire", heal: "joshua_heal", phoenix: "joshua_phoenix", loop: "joshua_fire_loop" };
const HP = 6;
const ARMOR = 2;
const CONE = { kind: "line", cone: true, len: 4, width: 1, hostile: true };
const BASIC = { dmg: 1, phoenixDmg: 2, burn: 2, cd: 2 }; // cd = กดเทิร์น N → N+2
const HEAL = { range: 3, max: 3, phoenixMax: 4, cd: 2 };
const PHOENIX = { key: "joshuaPhoenix", turns: 3, retaliate: 1, burn: 2 };
const PASSIVE2 = { name: "ลูกชายคนเล็ก รอสฟิลด์", reactHeal: 2, strikeBurn: 1 };
const T = { cone: 0.55 }; // จังหวะไฟพุ่งถึงช่องแรก (วินาที) — client JOSHUA_T.cone ต้องตรงกัน (ms)

const isMe = (p) => !!p && p.characterId === ID && !p.summon;
const matchOf = () => require("../server/match");
const round = () => matchOf().roundNumber || 0;
const cdLeft = (ready, r) => Math.max(0, (ready || 0) - r);
function fresh() { return { basicReady: 0, healReady: 0, phoenixSever: 0, hitKey: null }; }
function st(p) { return p.joshua || (p.joshua = fresh()); }
const phoenixOn = (p) => isMe(p) && p.alive !== false && ((p.statuses && p.statuses[PHOENIX.key]) || 0) > 0;
const passiveOn = (p) => PassiveSeal.on(p);
const healMax = (p) => (phoenixOn(p) ? HEAL.phoenixMax : HEAL.max);
const coneDmg = (p) => (phoenixOn(p) ? BASIC.phoenixDmg : BASIC.dmg);
const healAmt = (form) => { const n = Number(form); return Number.isInteger(n) && n >= 1 ? n : 0; };
const isFire = (a, b) => a === "fire" || b === "fire";

// ---------- เอฟเฟกต์ ----------
function watchers(engine, p) {
  return Object.values(engine.players).filter((o) => !o.duoOf && !o.summon && (o.id === p.id || !engine.hiddenFrom(o, p))).map((o) => o.id);
}
function fx(engine, p, kind, extra = {}) {
  if (!p.pos) return;
  engine.boardFxTo(watchers(engine, p), FX, { kind, id: p.id, at: { ...p.pos }, size: engine.sizeOf(p), ...extra });
}

// ---------- สกิลพื้นฐาน: เพื่อปกป้องทุกคน ----------
function castCone(engine, p, targets, dir) {
  const v = Board.LINE_DIRS[dir];
  if (!v || !p.pos) return "";
  st(p).basicReady = engine.roundNumber + BASIC.cd;
  const tiles = Board.lineTiles(engine.boardMap(), p.pos.x, p.pos.y, dir, CONE.len, CONE.width, engine.sizeOf(p), 0, true);
  const foes = (targets || []).map((id) => engine.players[id]).filter((t) => t && t.alive && t.pos && t.id !== p.id && !engine.sameTeam(p, t));
  const dmg = coneDmg(p);
  engine.log(`🔥 ${p.name} เพื่อปกป้องทุกคน${phoenixOn(p) ? " (ร่างนกเพลิง)" : ""}`);
  engine.sfx(SFX.fire);
  fx(engine, p, "cone", { dir, tiles, phoenix: phoenixOn(p) });
  engine.skillBeat(T.cone, () => {
    if (!p.alive || !p.pos) return;
    engine.withEffectSource(p, () => {
      for (const t of foes) {
        if (!t.alive || !t.pos) continue;
        const res = engine.skillStrike(p, t, "เพื่อปกป้องทุกคน", { bonus: dmg - 1 });
        if (!res || res.dodge || res.blocked || !t.alive) continue;
        const n = engine.applyBurn(t, BASIC.burn);
        if (n > 0) engine.log(`🔥 ${t.name} ลุกไหม้ +${n}`);
      }
    });
  });
  return "";
}

// ---------- สกิลรอง: พรของนกเพลิง ----------
function castHeal(engine, p, targets, n) {
  st(p).healReady = engine.roundNumber + HEAL.cd;
  const t = engine.players[(targets || [])[0]] || p;
  if (!t.alive) return "";
  const got = engine.withEffectSource(p, () => engine.healHp(t, n));
  engine.log(`🪶 ${p.name} พรของนกเพลิง → ${t.name} ฟื้นพลังชีวิต +${got || 0}`);
  engine.sfx(SFX.heal);
  if (t.pos) fx(engine, t, "heal", { by: p.id, n });
  return ` · +${got || 0}`;
}

// ---------- ท่าไม้ตาย: สวมร่างนกเพลิง ----------
function castPhoenix(engine, p, targets) {
  p.statuses[PHOENIX.key] = PHOENIX.turns;
  st(p).phoenixSever = engine.severStamp();
  engine.log(`🐦‍🔥 ${p.name} สวมร่างนกเพลิง — ${PHOENIX.turns} เทิร์น`);
  const ids = (targets || []).filter((id) => id !== p.id);
  // คลิปทุกครั้ง → ผลบนกระดานหลังคลิปจบ (กฎผู้ใช้: ห้ามเสียงเอฟเฟกต์ตัดหน้า/ซ้อนวีดีโอ)
  p.cutsceneShown = p.cutsceneShown || {};
  p.cutsceneShown[CUT.ultimate] = true;
  engine.queueCutscene(p, CUT.ultimate);
  engine.deferAfterCutscene(() => landPhoenix(engine, p, ids));
  return "";
}
// คลิปจบ: ปีกเพลิงกาง + ศัตรูในระยะเดินรอบตัวลุกไหม้ 2 + คราบไฟ (หลบได้ทีละคน)
function landPhoenix(engine, p, ids) {
  if (!p.alive || !p.pos) return;
  engine.sfx(SFX.phoenix);
  fx(engine, p, "phoenix", { hit: ids });
  engine.withEffectSource(p, () => {
    for (const id of ids) {
      const t = engine.players[id];
      if (!t || !t.alive || !t.pos || engine.sameTeam(p, t)) continue;
      if (engine.skillDodge(p, t, "เปลวนกเพลิง")) continue;
      const n = engine.applyBurn(t, PHOENIX.burn);
      if (n > 0) engine.log(`🔥 ${t.name} ลุกไหม้ +${n}`);
      if (t.alive) engine.elementApply(t, "fire", p);
    }
  });
}
function endPhoenix(engine, p, why) {
  if (!p.statuses || !p.statuses[PHOENIX.key]) return;
  delete p.statuses[PHOENIX.key];
  engine.log(why === "sever" ? `🐦‍🔥 ร่างนกเพลิงของ ${p.name} ถูกตัด` : `🐦‍🔥 ร่างนกเพลิงของ ${p.name} หมดลง`);
}

function healDesc(n) {
  return `ตัวเองหรือ 1 คนในระยะ ${HEAL.range} ฟื้นพลังชีวิต ${n} (คูลดาวน์ 1 เทิร์น)`;
}

module.exports = {
  id: ID,
  IMG, FX, SFX, VIDEO, CUT, CLIP_SEC, HP, ARMOR, CONE, BASIC, HEAL, PHOENIX, PASSIVE2, T,
  isMe, phoenixOn,

  maxHp(p) { return isMe(p) ? HP : undefined; },
  maxArmor(p, base) { return isMe(p) ? ARMOR : base; },

  resetCombat(p) {
    p.joshua = isMe(p) ? fresh() : null;
    if (p.statuses && isMe(p)) delete p.statuses[PHOENIX.key];
  },

  // ---------- ตีปกติ: ฟันดาบ (ไม่มีธาตุ) ----------
  attackSound(p) { return isMe(p) ? SFX.slash : undefined; },
  attackHitFx(p) { return isMe(p) ? "saberGold" : undefined; },
  onStrikeLanded(engine, attacker, target) {
    if (!isMe(attacker) || !passiveOn(attacker) || !target || !target.alive) return [];
    const n = engine.applyBurn(target, PASSIVE2.strikeBurn);
    return n > 0 ? [`ลุกไหม้ +${n}`] : [];
  },

  // ---------- สกิล ----------
  skillElement(engine, p, tier) { return isMe(p) && tier === "basic" ? "fire" : null; },
  skillPub(p, tier) {
    if (!isMe(p) || tier !== "secondary") return null;
    const r = round(), cd = cdLeft(st(p).healReady, r), max = healMax(p);
    const choices = [];
    for (let n = 1; n <= max; n++) {
      choices.push({ key: String(n), name: `พรของนกเพลิง ${n}`, img: IMG.secondary, cost: n, area: { kind: "target", range: HEAL.range, self: true }, cd, locked: cd > 0, desc: healDesc(n) });
    }
    return { choices };
  },
  skillCost(p, tier, base, opts = {}) {
    if (!isMe(p) || tier !== "secondary") return base;
    return healAmt(opts.form) || base;
  },
  skipsTurnQuota(p, tier) { return isMe(p) && tier === "ultimate"; },
  skillLocks(engine, p) {
    if (!isMe(p)) return undefined;
    const r = engine.roundNumber;
    const b = cdLeft(st(p).basicReady, r), h = cdLeft(st(p).healReady, r);
    return { basic: { cd: b, locked: b > 0 }, secondary: { cd: h, locked: h > 0 }, ultimate: { cd: 0, locked: phoenixOn(p) } };
  },
  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isMe(p)) return true;
    const r = engine.roundNumber;
    if (tier === "basic") return !!p.pos && cdLeft(st(p).basicReady, r) === 0;
    if (tier === "secondary") {
      const n = healAmt(opts.form);
      return n >= 1 && n <= healMax(p) && cdLeft(st(p).healReady, r) === 0;
    }
    if (tier === "ultimate") return !phoenixOn(p);
    return false;
  },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isMe(p)) return "";
    if (tier === "basic") return castCone(engine, p, targets, opts.dir);
    if (tier === "secondary") return castHeal(engine, p, targets, healAmt(opts.form));
    if (tier === "ultimate") return castPhoenix(engine, p, targets);
    return "";
  },
  skillSound() { return null; }, // เสียงเล่นใน applyInstantSkill ตามจังหวะของแต่ละท่า

  // ---------- ร่างนกเพลิง: ถูกศัตรูโจมตี = ผู้โจมตีลุกไหม้ 1 (ครั้งเดียวต่อการโจมตี) ----------
  onAttacked(engine, p, attacker) {
    if (!phoenixOn(p) || !attacker || !attacker.alive || (attacker.summon && attacker.summon.noStatus)) return;
    if (engine.sameTeam(p, attacker)) return;
    const s = st(p), key = `${attacker.id}|${engine.roundNumber}|${engine.actorId || ""}|${engine.commandSeq}`;
    if (s.hitKey === key) return;
    s.hitKey = key;
    const n = engine.withEffectSource(p, () => engine.applyBurn(attacker, PHOENIX.retaliate));
    if (n > 0) {
      engine.log(`🐦‍🔥 ${attacker.name} โจมตีร่างนกเพลิง — ลุกไหม้ +${n}`);
      if (attacker.pos) fx(engine, attacker, "singe", { by: p.id });
    }
  },

  // ---------- ปฏิกิริยาธาตุ (server/element.js) ----------
  // ลูกชายคนเล็ก: ปฏิกิริยาที่มีไฟบนตัวโจชัว = ยังเสียหาย แล้วฟื้น 2 (ก่อนตัดสินตาย)
  onReactionHit(engine, t, info) {
    if (!isMe(t) || !t.alive || !passiveOn(t) || !info || !isFire(info.a, info.b)) return;
    const got = engine.withEffectSource(t, () => engine.healHp(t, PASSIVE2.reactHeal));
    if (got > 0) engine.log(`❤️‍🔥 ${t.name} ${PASSIVE2.name} — ไฟหล่อเลี้ยง ฟื้นพลังชีวิต +${got}`);
  },
  // ร่างนกเพลิง: การกระทำของโจชัวทำให้เกิดปฏิกิริยา → ติดคราบไฟต่อทันที
  afterReaction(engine, t, info) {
    const src = info && info.source;
    if (!phoenixOn(src) || !t || !t.alive || !t.pos) return;
    engine.elementApply(t, "fire", src);
  },

  // ลุกไหม้บนตัวโจชัว = ฟื้นแทนเสียหาย
  hburnHeals(p) { return isMe(p) && passiveOn(p); },

  // ---------- จังหวะเทิร์น ----------
  onRoundStartTick(engine, p) {
    if (!isMe(p) || !p.alive) return;
    if (st(p).phoenixSever && !phoenixOn(p)) { st(p).phoenixSever = 0; engine.log(`🐦‍🔥 ร่างนกเพลิงของ ${p.name} หมดลง`); }
  },
  onDeath(engine, p) { if (isMe(p) && p.statuses) delete p.statuses[PHOENIX.key]; },

  // ---------- ผลสกิลที่ตัดได้ (server/sever.js) ----------
  severables(engine, p) {
    if (!phoenixOn(p)) return [];
    return [{ key: "joshuaPhoenix", label: "สวมร่างนกเพลิง", at: st(p).phoenixSever, cancel: () => { endPhoenix(engine, p, "sever"); st(p).phoenixSever = 0; } }];
  },

  // ---------- ข้อมูลให้ client (players[].joshua) ----------
  joshuaState(engine, p) {
    if (!isMe(p)) return undefined;
    const r = engine.roundNumber;
    return {
      phoenix: phoenixOn(p) ? p.statuses[PHOENIX.key] : 0,
      basicCd: cdLeft(st(p).basicReady, r),
      healCd: cdLeft(st(p).healReady, r),
    };
  },
};
