// ============================================================
//  กิระ (ราชาแมลงอวกาศ) — ระดับง่าย · id "kira"
//
//  ค่าพื้นฐาน: เลือด/เกราะมาตรฐาน · ระยะเดิน 4 · ตีประชิด [1, 1]
//  สกิลพื้นฐาน สวมเกราะราชัน (0 แต้ม): สลับร่างกิระ ⇄ ราชาแมลงอวกาศ · ไม่นับเป็นการใช้สกิล · ไม่มีคูลดาวน์ (ผู้ใช้ตัดสิน 2026-10-14)
//    ล็อกการเดินตามกฎพื้นฐาน · รูปบนปุ่ม = ร่างที่จะเปลี่ยนไป (skillPub)
//  สกิลรอง คลื่นความมืด (4 แต้ม): เลือกทิศ แนว 4×3 · ศัตรูทุกคนในแนวเสียหาย 1 (เกราะรับก่อน · หลบไม่ได้ · ฆ่าได้)
//    คนที่รอดในแถวข้าง (ช่อง 1 / 3) ถูกบีบเข้าแถวกลาง (ช่อง 2) ระดับเดียวกัน
//    + ติด "ถูกตรึง" เดินไม่ได้ 1 เทิร์น ทำอย่างอื่นได้ปกติ (ผู้ใช้สั่ง 2026-10-14 · ดีบัฟ — ต้าน/ล้างได้ · action.movOf = 0)
//      เป้าที่เดินไปแล้วในเทิร์นนี้ = ติดถึงเทิร์นหน้า (แบบเชื่องช้า — hasActed) · ติดแม้ไม่มีช่องให้บีบ
//    ช่องกลางไม่ว่าง = ไปช่องว่างที่ใกล้ช่องกลางนั้นที่สุด (ผู้ใช้ตัดสิน) · ตัวใหญ่ไม่ถูกบีบ
//  ท่าไม้ตาย อัฐิราชา (8 แต้ม · 2 ครั้งต่อเกม): 3 เทิร์น (รวมเทิร์นที่กด) ตายแล้วฟื้นทันทีด้วยพลังชีวิต 1 (ผู้ใช้ตัดสิน) ไม่จำกัดครั้ง
//    · พลังโจมตี +2 (ตีปกติ รวมตีสวน) · กดซ้ำระหว่างที่ยังมีผลไม่ได้
//  ติดตัว บดขยี้ส่วนเกิน:
//    ร่างราชาแมลงอวกาศ — ตีปกติปาดคลื่นแนวตรง 4×1 จากตัว โดนศัตรูทุกคนในแนว (ระบบแนวตรงเดียวกับแบล็คคิง — action.lanes)
//      · ออร่าหมอกดำแดง (ผู้ใช้สั่ง 2026-10-14): จบเทิร์น ศัตรูทุกคนที่ประชิดตัวเสียหาย 1 (เกราะรับก่อน · หลบไม่ได้ · ฆ่าได้)
//      · เพลง Rcules no Inbou เล่นค้างตลอดร่าง (view.activeSkillMusic) · คลิปแปลงร่างเล่นครั้งแรกต่อเกม
//    ร่างกิระ — อยู่ต่อเนื่องครบ 2 เทิร์น ฟื้นพลังชีวิต 2 + แต้มสกิล 1 (สวมเกราะแล้วนับใหม่ · เทิร์นที่สลับร่างไม่นับ)
// ============================================================

const ID = "kira";
const DIR = "/characters/kira";
// ไฟล์จากผู้ใช้ (Downloads/gira(alter) — 2026-10-14) · ปุ่มถอดเกราะใช้รูปกิระ
const IMG = {
  base: `${DIR}/kira.webp`,
  king: `${DIR}/king.webp`,
  toKing: `${DIR}/kira_skill1.webp`,
  toKira: `${DIR}/kira.webp`,
  skill2: `${DIR}/kira_skill2.webp`,
  skill3: `${DIR}/kira_skill3.webp`,
};
const VIDEO = { transform: `${DIR}/kira_skill1.mp4` };
const CUT = { transform: "kiraTransform" };
const MUSIC = "kira_king"; // คีย์ใน client/src/audio.js (Rcules no Inbou)
// เสียง (client/src/audio.js — ไฟล์อยู่ client/public/characters/kira/sfx/)
const SFX = {
  armor: "kira_armor",     // สวมเกราะราชัน
  unarmor: "kira_unarmor", // ถอดเกราะ กลับร่างกิระ
  hit: "kira_hit",         // ตีปกติร่างกิระ
  sweep: "kira_sweep",     // ตีปกติร่างราชา (ปาดคลื่น)
  wave: "kira_wave",       // คลื่นความมืด (client เล่นตามเอฟเฟกต์บนกระดาน)
  squeeze: "kira_squeeze", // ถูกบีบเข้าแถวกลาง
  ult: "kira_ult",         // อัฐิราชา
  revive: "kira_revive",   // ฟื้นคืนชีพ
  regen: "kira_regen",     // ร่างกิระครบ 2 เทิร์น
  aura: "kira_wave",       // ออร่าหมอกดำแดงกัดศัตรูประชิด (จบเทิร์น)
};

const KING_RANGE = [1, 4];
const WAVE = { len: 4, width: 3 };
const WAVE_DMG = 1;
const ULT_TURNS = 3;
const ULT_USES = 2;
const ULT_ATK = 2;
const REVIVE_HP = 1;
const REGEN_TURNS = 2;
const REGEN_HP = 2;
const REGEN_SP = 1;
const AURA_DMG = 1;
const ROOT_TURNS = 1;
// จังหวะบนกระดาน (ต้องตรงกับ client/src/board/boardDraw.js — DARK_T)
const WAVE_SECONDS = 1.1;
const SQUEEZE_REACH = 3; // หาช่องว่างรอบช่องกลางไม่เกินระยะนี้ (ไม่มีเลย = อยู่ที่เดิม)

const LINE_DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

const isKira = (p) => !!p && p.characterId === ID;
function fresh() {
  return {
    king: false,
    kingAt: 0,      // ลำดับการสวมเกราะล่าสุด (engine.nextTransformCounter — ตัวนับเดียวกับมุยมิ: คนเปิดทีหลังได้เพลง)
    switchRound: 0, // เทิร์นที่สลับร่างล่าสุด (เทิร์นนั้นไม่นับการฟื้นของร่างกิระ)
    calm: 0,        // เทิร์นที่อยู่ร่างกิระต่อเนื่อง
    ultUses: 0,
    ultUntil: 0,    // อัฐิราชามีผลถึงเทิร์นนี้ (รวม) — 0 = ไม่มีผล
    revives: 0,
  };
}
function st(p) { return p.kira || (p.kira = fresh()); }
const kingOn = (p) => isKira(p) && !!st(p).king;
function ultOn(engine, p) {
  if (!isKira(p)) return false;
  const s = st(p);
  return s.ultUntil > 0 && engine.roundNumber <= s.ultUntil;
}
const ultLeft = (engine, p) => (ultOn(engine, p) ? st(p).ultUntil - engine.roundNumber + 1 : 0);

// ---------- คลื่นความมืด ----------
//  จังหวะ: คลื่นเริ่มม้วน (client) → พัก HIT_SECONDS ให้ยอดคลื่นซัดแถวแรก → ดาเมจ (เลขขึ้นตอนคลื่นปะทะ)
//   → พักให้คลื่นเล่นจบ → บีบ + ตรึง → พักให้แอนิเมชันบีบ/ไถลเล่นจบ (ice.fxSeconds) แล้วกลับตาเดิน
const HIT_SECONDS = 0.3;
const enemiesIn = (engine, p, targets) => (targets || []).map((id) => engine.players[id])
  .filter((t) => t && t.alive && t.id !== p.id && !engine.sameTeam(p, t));
function darkWave(engine, p, targets, dir) {
  if (!p.pos || !LINE_DIRS[dir]) return 0;
  engine.boardFx("darkWaveFx", { from: { ...p.pos }, dir, len: WAVE.len, width: WAVE.width, color: engine.colorOf(p) });
  const origin = { ...p.pos };
  const n = enemiesIn(engine, p, targets).length;
  if (n) engine.skillBeat(HIT_SECONDS, () => waveHit(engine, p, origin, targets, dir));
  return n;
}
function waveHit(engine, p, origin, targets, dir) {
  const hit = [];
  engine.withEffectSource(p, () => {
    for (const t of enemiesIn(engine, p, targets)) {
      t.wasAttacked = true;
      const before = (t.hp || 0) + (t.armor || 0);
      engine.dealMixed(t, WAVE_DMG);
      if (t.alive && t.hp <= 0) engine.instantDeath(t);
      const dealt = Math.max(0, before - ((t.hp || 0) + (t.armor || 0)));
      engine.log(`🌑 คลื่นความมืด → ${t.name} -${dealt} (ลดเกราะก่อน)`);
      if (!t.alive) { t.pos = null; engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`); continue; }
      hit.push(t.id);
    }
  });
  if (hit.length) engine.skillBeat(Math.max(0.1, WAVE_SECONDS - HIT_SECONDS), () => squeeze(engine, p, origin, dir, hit));
}
// ช่องว่างที่ใกล้ช่องกลาง (want) ที่สุด — ระยะเท่ากันเลือกช่องที่อยู่แนวกลางก่อน แล้วช่องที่ใกล้ตัวเดิม
function nearestFree(engine, t, want, side) {
  const cand = [];
  for (let d = 0; d <= SQUEEZE_REACH; d++) {
    for (let dx = -d; dx <= d; dx++) {
      for (const dy of dx === d || dx === -d ? [d - Math.abs(dx)] : [d - Math.abs(dx), -(d - Math.abs(dx))]) {
        const x = want.x + dx, y = want.y + dy;
        if (!engine.tileFree(x, y, t.id)) continue;
        const lat = Math.abs(dx * side.x + dy * side.y);
        cand.push({ x, y, d, lat, near: Math.abs(x - t.pos.x) + Math.abs(y - t.pos.y) });
      }
    }
    if (cand.length) break;
  }
  cand.sort((a, b) => a.d - b.d || a.lat - b.lat || a.near - b.near);
  return cand[0] || null;
}
// ---------- ออร่าหมอกดำแดง: ศัตรูประชิดตัว (ระยะ 1 จากตัว — ตัวใหญ่นับขอบตัว) ----------
function adjacent(engine, p, t) {
  const n = engine.sizeOf(t) || 1;
  const dx = Math.max(0, t.pos.x - p.pos.x, p.pos.x - (t.pos.x + n - 1));
  const dy = Math.max(0, t.pos.y - p.pos.y, p.pos.y - (t.pos.y + n - 1));
  return dx + dy === 1;
}
function auraTick(engine, p) {
  if (!p.pos) return;
  const near = Object.values(engine.players).filter((t) => t.alive && t.pos && t.id !== p.id && !engine.sameTeam(p, t) && adjacent(engine, p, t));
  if (!near.length) return;
  engine.withEffectSource(p, () => {
    for (const t of near) {
      const before = (t.hp || 0) + (t.armor || 0);
      t.wasAttacked = true;
      engine.dealMixed(t, AURA_DMG);
      if (t.alive && t.hp <= 0) engine.instantDeath(t);
      const dealt = Math.max(0, before - ((t.hp || 0) + (t.armor || 0)));
      engine.log(`🩸 หมอกราชันของ ${p.name} → ${t.name} -${dealt} (ลดเกราะก่อน)`);
      if (!t.alive) { t.pos = null; engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`); }
    }
  });
  engine.sfx(SFX.aura);
}

// ถูกตรึง 1 เทิร์น — ติดตอนตาเดินของกิระ: เป้าที่เดินไปแล้วเทิร์นนี้ได้ผลเทิร์นหน้า (+1 เพราะ endTurn นี้ลดไปก่อน)
function root(engine, t) {
  const acted = engine.hasActed(t.id) || engine.actorId === t.id;
  if (engine.applyDebuff(t, "rooted", 1, ROOT_TURNS + (acted ? 1 : 0))) engine.log(`⛓️ ${t.name} ถูกตรึง — เดินไม่ได้ ${ROOT_TURNS} เทิร์น`);
  else engine.log(`⛓️ ${t.name} ต้านการตรึงไว้ได้`);
}
function squeeze(engine, p, origin, dir, ids) {
  const [fx, fy] = LINE_DIRS[dir];
  const side = { x: -fy, y: fx }; // แกนขวาง
  const ctx = engine.ice.begin();
  const lat = (t) => (t.pos.x - origin.x) * side.x + (t.pos.y - origin.y) * side.y;
  // ไล่จากแถวใกล้ตัว → ไกล (คนหน้าได้ช่องก่อน) · แถวข้างทุกคนถูกตรึง (ตัวใหญ่ด้วย — แต่ไม่ถูกบีบ)
  const list = ids.map((id) => engine.players[id])
    .filter((t) => t && t.alive && t.pos && lat(t) !== 0)
    .sort((a, b) => ((a.pos.x - origin.x) * fx + (a.pos.y - origin.y) * fy) - ((b.pos.x - origin.x) * fx + (b.pos.y - origin.y) * fy));
  let moved = 0;
  for (const t of list) {
    // คนก่อนหน้าอาจไถลบนน้ำแข็งไปชน/ผลัก/ฆ่าคนนี้แล้ว — อ่านตำแหน่งปัจจุบันใหม่ทุกครั้ง
    if (!t.alive || !t.pos) continue;
    root(engine, t);
    const j = lat(t);
    if (j === 0 || engine.sizeOf(t) > 1) continue;
    const want = { x: t.pos.x - side.x * j, y: t.pos.y - side.y * j };
    const to = engine.tileFree(want.x, want.y, t.id) ? want : nearestFree(engine, t, want, side);
    if (!to || (to.x === t.pos.x && to.y === t.pos.y)) { engine.log(`🌑 ${t.name} ไม่ถูกบีบ — ไม่มีช่องว่าง`); continue; }
    const from = { ...t.pos };
    t.pos = { x: to.x, y: to.y };
    ctx.events.push({ kind: "knock", id: t.id, from, to: { x: to.x, y: to.y } });
    moved++;
    engine.log(`🌑 ${t.name} ถูกบีบเข้ากลางคลื่น`);
    // ถูกบีบลงน้ำแข็ง = ไถลต่อทางเดิม (เฉพาะการขยับแนวตรง)
    const dx = Math.sign(to.x - from.x), dy = Math.sign(to.y - from.y);
    if (!dx !== !dy) engine.ice.resolveEntry(t, { x: dx, y: dy }, ctx);
  }
  if (moved) engine.sfx(SFX.squeeze);
  engine.ice.flush(ctx);
  if (ctx.events.length) engine.skillBeat(engine.ice.fxSeconds(ctx), () => {});
}

module.exports = {
  id: ID,
  IMG, VIDEO, CUT, MUSIC, SFX, AURA_DMG, ROOT_TURNS, KING_RANGE, WAVE, WAVE_DMG, ULT_TURNS, ULT_USES, ULT_ATK, REVIVE_HP, REGEN_TURNS, REGEN_HP, REGEN_SP,
  isKira, kingOn,

  resetCombat(p) { p.kira = isKira(p) ? fresh() : null; },
  displayImg(p) { return kingOn(p) ? IMG.king : null; },

  // ---------- ตีปกติ ----------
  range(p) { return kingOn(p) ? KING_RANGE : null; },
  attackLane(p) { return kingOn(p); },
  attackBeam(p) { return kingOn(p) ? KING_RANGE[1] : 0; },
  attackBeamTone(p) { return kingOn(p) ? "dark" : null; },
  attackSound(p) {
    if (!isKira(p)) return undefined;
    return kingOn(p) ? SFX.sweep : SFX.hit;
  },
  // อัฐิราชา: พลังโจมตี +2 (ตีปกติ · ตีสวน — ท่อ strike)
  damageBonus(engine, attacker, target, ctx) {
    if (!ultOn(engine, attacker)) return 0;
    ctx.kiraUlt = ULT_ATK;
    return ULT_ATK;
  },
  attackFxNames(attacker, atkCtx) { return atkCtx && atkCtx.kiraUlt ? [`อัฐิราชา +${atkCtx.kiraUlt}`] : []; },

  // ---------- อัฐิราชา: ตายแล้วฟื้น (combat.instantDeath → ฮุค preventDeath) ----------
  preventDeath(engine, p) {
    if (!ultOn(engine, p)) return false;
    const s = st(p);
    s.revives++;
    p.hp = REVIVE_HP;
    engine.log(`🦴 ${p.name} อัฐิราชา — ฟื้นคืนชีพ (พลังชีวิต ${REVIVE_HP})`);
    engine.skillFlash({ name: "อัฐิราชา — ฟื้นคืนชีพ", img: IMG.skill3, by: p.name, color: engine.colorOf(p), sound: SFX.revive });
    return true;
  },

  // ---------- สกิล ----------
  canUseSkill(engine, p, tier) {
    if (!isKira(p)) return true;
    const s = st(p);
    if (tier === "basic" || tier === "secondary") return true;
    if (tier === "ultimate") return s.ultUses < ULT_USES && !ultOn(engine, p);
    return false;
  },
  // สวมเกราะราชันไม่นับเป็นการใช้สกิล (ผู้ใช้ตัดสิน) — สลับแล้วยังใช้คลื่นความมืด/ท่าไม้ตายได้ในเทิร์นเดียวกัน
  skipsTurnQuota(p, tier) { return isKira(p) && tier === "basic"; },
  ignoresTurnQuota(p, tier) { return isKira(p) && tier === "basic"; },
  skillSound(p, tier) {
    if (!isKira(p)) return null;
    if (tier === "basic") return st(p).king ? SFX.armor : SFX.unarmor; // เรียกหลังสลับแล้ว = ร่างที่เพิ่งเข้า
    if (tier === "ultimate") return SFX.ult;
    return null; // คลื่นความมืด: client เล่นเสียงพร้อมเอฟเฟกต์บนกระดาน
  },
  skillPub(p, tier) {
    if (!isKira(p)) return null;
    if (tier === "basic") return { img: kingOn(p) ? IMG.toKira : IMG.toKing };
    return null;
  },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isKira(p)) return "";
    const s = st(p);
    if (tier === "basic") {
      s.king = !s.king;
      s.switchRound = engine.roundNumber;
      s.calm = 0;
      if (s.king) s.kingAt = engine.nextTransformCounter();
      p.cutsceneShown ||= {};
      if (s.king && !p.cutsceneShown[CUT.transform]) {
        p.cutsceneShown[CUT.transform] = true;
        engine.queueCutscene(p, CUT.transform);
      }
      engine.log(s.king ? `🪲 ${p.name} สวมเกราะราชัน — ราชาแมลงอวกาศ` : `🪲 ${p.name} ถอดเกราะ — กลับเป็นกิระ`);
      return s.king ? " — ราชาแมลงอวกาศ" : " — กิระ";
    }
    if (tier === "secondary") {
      const n = darkWave(engine, p, targets, opts.dir);
      return n ? ` — โดน ${n} คน` : "";
    }
    if (tier === "ultimate") {
      s.ultUses++;
      s.ultUntil = engine.roundNumber + ULT_TURNS - 1;
      engine.log(`🦴 ${p.name} อัฐิราชา — ${ULT_TURNS} เทิร์น ตายแล้วฟื้น · พลังโจมตี +${ULT_ATK} (เหลือ ${ULT_USES - s.ultUses} ครั้ง)`);
      return "";
    }
    return "";
  },

  // ---------- บดขยี้ส่วนเกิน (ร่างกิระ): ครบ 2 เทิร์น ฟื้นพลังชีวิต 2 + แต้มสกิล 1 (endTurn — หลังลูปลดเทิร์นสถานะ) ----------
  onEndTurn(engine) {
    for (const p of Object.values(engine.players)) {
      if (!isKira(p) || !p.alive) continue;
      const s = st(p);
      if (s.king) { auraTick(engine, p); continue; }
      if (s.switchRound === engine.roundNumber) continue;
      s.calm++;
      if (s.calm < REGEN_TURNS) continue;
      s.calm = 0;
      const healed = engine.healHp(p, REGEN_HP);
      const before = p.skillPoints;
      engine.addSkill(p, REGEN_SP);
      const sp = p.skillPoints - before;
      engine.log(`🪲 ${p.name} บดขยี้ส่วนเกิน — ฟื้นพลังชีวิต +${healed} · แต้มสกิล +${sp}`);
      if (healed > 0 || sp > 0) engine.sfx(SFX.regen);
    }
  },

  // เพลงร่างราชาแมลงอวกาศ (view.activeSkillMusic) → { music, at } | null
  kingMusic(p) { return kingOn(p) && p.alive ? { music: MUSIC, at: st(p).kingAt || 0 } : null; },

  // ---------- ข้อมูลให้ client ----------
  kiraState(engine, p) {
    if (!isKira(p)) return undefined;
    const s = st(p);
    return {
      king: !!s.king, calm: s.calm, calmMax: REGEN_TURNS,
      ult: ultLeft(engine, p), ultUses: ULT_USES - s.ultUses,
    };
  },
  skillLocks(engine, p) {
    if (!isKira(p)) return undefined;
    const s = st(p);
    return {
      basic: { locked: false, free: true }, // free = ไม่กินโควตาสกิลของเทิร์น
      ultimate: { locked: s.ultUses >= ULT_USES || ultOn(engine, p) },
    };
  },
};
