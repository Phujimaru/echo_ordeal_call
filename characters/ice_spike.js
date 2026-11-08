// ============================================================
//  Ice Spike — ระดับยาก · id "ice_spike" · กติกาที่ผู้ใช้ตัดสิน: GRID_PLAN §7.9 (2026-10-12 · ปรับสมดุล 2026-10-14 · 2026-10-20)
//  ระบบกลางที่ใช้: server/ice.js (ธารน้ำแข็ง/หนาม/ไถล/ผลัก/เชื่องช้า) — เรียกผ่าน engine.ice
//
//  ค่าพื้นฐาน: เลือด 8 / เกราะ 2 · เดิน 3 (2026-11-08 — เดิม 4) · พลังโจมตี 0 · ตีปกติไม่ได้ (range [1, 0] ใน characters.js)
//  ติดตัว 1 ฝีก้าวของธารน้ำแข็ง: ทุกช่องที่เดิน/ไถลผ่าน (รวมช่องออกตัว) = ธารน้ำแข็ง 6 เทิร์น (เหยียบซ้ำ = นับใหม่)
//  ติดตัว 2 แรงปะทะเหมันต์: ไถลชนศัตรู = ความเสียหายเท่าระยะไถล (สูงสุด 3 · ไม่ติดคริ ไม่รับบัฟพลังโจมตี · หลบไม่ได้)
//    แล้วเป้ากระเด็นตามทิศ 1 ช่อง · ไถลชนตอนเดินในตาตัวเอง = นับเป็นการโจมตี จบตา
//  ติดตัว 3 การฟื้นฟูแห่งเหมันต์: ดาเมจที่ได้รับสะสมครบ 3 = ระเบิดผลักศัตรู 8 ช่องรอบตัว 2 ช่อง + เชื่องช้า 1 เทิร์น (server/ice.js burst)
//    ไถลครั้งเดียว: ครบทุก 4 ช่อง = ฟื้นพลังชีวิต +1 · ครบทุก 2 ช่อง = แต้มสกิล +1
//  ติดตัว 4 ย่างก้าวเหนือหิมะ (2026-11-08): ไม่โดนผลลดระยะเดิน (ไพ่แตก/เชื่องช้า/โทษระยะเดิน/สภาพอากาศ — ฮุค movCutImmune)
//  ติดตัว 5 ร่างแห่งเหมันต์ (2026-11-08): ไม่โดนน้ำแข็งกัด/สตั้นจากแผนที่ (Fodlan ด่าน IV — ฮุค mapEffectImmune)
//  พื้นฐาน Glacial Path (1 แต้ม · ไม่จำกัดครั้ง · ก่อน/หลังเดิน): ธารน้ำแข็ง 1 ช่องในระยะ 8
//  รอง หนามน้ำแข็ง (2 แต้ม · เทิร์นละ 2 ครั้ง · ก่อน/หลังเดิน): หนาม Lv1 ในระยะ 8 (บนน้ำแข็ง = Lv2 · เกราะ 1 ทุก Lv)
//    วางทับคน = ผลักไปทิศที่เลือก 1 ช่อง + เชื่องช้า 3 เทิร์น (ตัวเอง: ผลักแต่ไม่เชื่องช้า)
//    ไถล / ถูกผลัก / พุ่งชน เข้าหนาม = เสียเท่า Lv + เชื่องช้า 1 เทิร์น (server/ice.js spikeImpact · bumpSpike · dashBump) · เชื่องช้านับใหม่ ไม่สะสม
//    ตัวใหญ่ (2×2 ขึ้นไป) เหยียบหนาม = หนามแตก + เสีย 0/1/2 ตาม Lv + เชื่องช้า 1 เทิร์น · เดินต่อได้ (server/ice.js trampleSpikes)
//  ท่าไม้ตาย Ice Surge น้ำแข็งโถมกระหน่ำ (4 แต้ม · คูลดาวน์ 6 · ก่อน/หลังเดิน · ตัวเอง):
//    หนามทุกอันบนสนาม +1 Lv · ได้ "Ice Surge" 3 เทิร์น + "ฟื้นพลัง" 3 ขั้น (ต้นเทิร์นแต้มสกิล +1)
//    ระหว่าง Ice Surge: ธารน้ำแข็ง/หนามน้ำแข็ง ระยะทั้งสนาม · หนามใช้แต้มลดลง 1 และเทิร์นละ 6 ครั้ง (เนิฟ 2026-10-20 — เดิมไม่จำกัด)
//
//  Claude ตัดสินเอง (บอกผู้ใช้แล้ว — GRID_PLAN §7.9): ไถลชนเพื่อนร่วมทีม = หยุดเฉยๆ · ไถลชนตัวใหญ่ = ดาเมจแต่ไม่กระเด็น ·
//   ไถลชนจากการถูกผลักด้วยสกิลตัวเอง = ดาเมจลงแต่ไม่จบตา (ทำอย่างอื่นต่อไม่ได้แล้ว) · ระเบิดครั้งเดียวต่อดาเมจหนึ่งก้อน (เศษทบ) ·
//   คูลดาวน์ 6: กดเทิร์น N กดได้อีกเทิร์น N + 6 · Ice Surge ยกหนามของ Ice Spike ทุกคน · ฟื้นพลังกดซ้ำ = นับใหม่ 3 ขั้น
//  ทำลาย (ปุ่มพิเศษบน HUD ตำแหน่งเดียวกับขึ้น/ลงม้า — hudActions "iceBreak" + tiles → socket charAction { key, tile } · ผู้ใช้สั่ง 2026-11-08 รอบ Final):
//    ธารน้ำแข็ง/หนามน้ำแข็งของตัวเอง 1 ช่องที่ไหนก็ได้บนแผนที่ · เทิร์นละ 2 ครั้ง · 0 แต้ม · ไม่ได้แต้มคืน · หนาม = หายทุก Lv แล้วเป็นธารน้ำแข็งช่องเดิม
//    (แยกออกจากปุ่มพื้นฐาน/รองแล้ว — เดิมเป็นตัวเลือก "ทำลาย" ของสองปุ่มนั้น)
//  Claude ตัดสินเอง (รอบ Final 2026-11-08): ทำลายได้เฉพาะของตัวเอง (ยึดที่ผู้ใช้เลือกไว้รอบก่อน) · ไม่ใช่สกิล = ไม่กินโควตา/ห้ามสกิลไม่มีผล ·
//   ก่อนเดินแล้วยังเดินได้ หลังเดิน = ย้อนการเดินไม่ได้ (เหมือนสกิลของตัวเอง) · ไถลชนศัตรูไปแล้วในตานี้ = กดไม่ได้ · Ice Surge ไม่เพิ่มโควตา · เอฟเฟกต์/เสียงเดิม (melt / spikeDown)
//  Claude ตัดสินเอง 2026-11-08: ถูกตรึง/เดินไม่ได้ยังมีผล (ไม่ใช่การลดระยะเดิน) ·
//   ไม่โดนน้ำแข็งกัด = ไม่มีความอบอุ่นในด่าน IV · ท่าพุ่งที่พังสิ่งกีดขวางระหว่างทาง (โซระ Mouse Separade / ตัว 3×3) = หนามแตกเฉยๆ ไม่ทำงาน
// ============================================================

const Board = require("../server/board");

const ID = "ice_spike";
const DIR = "/characters/ice_spike";
const IMG = { base: `${DIR}/ice_spike.webp`, skill1: `${DIR}/skill1.webp`, skill2: `${DIR}/skill2.webp`, skill3: `${DIR}/skill3.webp` };

const STRIKE_MAX = 3;     // โบนัสความเสียหายจากระยะไถลสูงสุด (เดิม 4 — เนิฟ 2026-10-14)
const REGEN_HP_EVERY = 4; // ไถลครบทุก 4 ช่อง = พลังชีวิต +1 (ปรับสมดุล 2026-10-20 — เดิม 3)
const REGEN_SP_EVERY = 2; // ไถลครบทุก 2 ช่อง = แต้มสกิล +1
const OWN_SPIKE_SP = 2;   // ชนหนามตัวเอง = แต้มสกิล +2
const SPIKE_PER_TURN = 2; // หนามน้ำแข็งเทิร์นละ 2 ครั้ง
const SURGE_SPIKE_PER_TURN = 6; // ระหว่าง Ice Surge เทิร์นละ 6 ครั้ง (เนิฟ 2026-10-20 — เดิมไม่จำกัด)
const ULT_COOLDOWN = 6;
const SURGE_TURNS = 3;    // บัฟ Ice Surge
const SURGE_REGEN = 3;    // ฟื้นพลัง 3 ขั้น
const SURGE_RANGE = 99;   // ระยะ "ทั้งสนาม" (เกินกระดาน 14×14 ทุกทิศ)
const CAST_RANGE = 8;     // ระยะสร้างธารน้ำแข็ง/หนาม (characters.js area.range)
const BREAK_PER_TURN = 2; // ปุ่มทำลาย เทิร์นละ 2 ครั้ง
const BREAK_KEY = "iceBreak";

const isIceSpike = (p) => !!p && p.characterId === ID;
// ระหว่างบัฟ Ice Surge
const surging = (p) => !!p && ((p.statuses && p.statuses.iceSurge) || 0) > 0;
// หนามน้ำแข็งที่ใช้ไปแล้วในเทิร์นนี้
const spikesUsed = (p, round) => (p.iceSpikeRound === round ? p.iceSpikeUses || 0 : 0);
// โควตาหนามต่อเทิร์นตอนนี้ (นับรวมที่ใช้ก่อนกด Ice Surge ในเทิร์นเดียวกัน)
const spikeLimit = (p) => (surging(p) ? SURGE_SPIKE_PER_TURN : SPIKE_PER_TURN);
// คูลดาวน์ที่เหลือ (เทิร์น) จากเทิร์นที่กดได้อีก ready · 0 = กดได้
const cdLeft = (ready, round) => Math.max(0, (ready || 0) - round);
// ปุ่มทำลาย: ใช้ไปแล้วกี่ครั้งในเทิร์นนี้ · กดได้ไหม · ช่องที่เลือกได้ (ธารน้ำแข็ง + หนามของตัวเองทั้งแผนที่)
const breaksUsed = (p, round) => (p.iceBreakRound === round ? p.iceBreakUses || 0 : 0);
function breakReady(engine, p) {
  const round = engine.roundNumber;
  return isIceSpike(p) && p.alive && !!engine.canAct(p) && p.iceStruckRound !== round && breaksUsed(p, round) < BREAK_PER_TURN;
}
function breakTiles(engine, p) {
  return [...engine.ice.ownIceTiles(p.id), ...engine.ice.ownSpikeTiles(p.id)].map((t) => ({ x: t.x, y: t.y }));
}

module.exports = {
  id: ID,
  IMG, STRIKE_MAX, REGEN_HP_EVERY, REGEN_SP_EVERY, OWN_SPIKE_SP, SPIKE_PER_TURN, SURGE_SPIKE_PER_TURN, ULT_COOLDOWN, SURGE_TURNS, SURGE_REGEN, SURGE_RANGE,
  CAST_RANGE, BREAK_PER_TURN, BREAK_KEY, isIceSpike, surging,

  // เลือด 8 / เกราะ 2 · พลังโจมตีพื้นฐาน 0
  maxHp(p) { return isIceSpike(p) ? 8 : undefined; },
  maxArmor(p, base) { return isIceSpike(p) ? 2 : base; },
  attackBaseOverride(engine, p) { return isIceSpike(p) ? 0 : 1; },
  // ติดตัว 4: ไม่โดนผลลดระยะเดิน (action.movOf · Ice.applySlow) · ติดตัว 5: ไม่โดนน้ำแข็งกัด/สตั้นจากแผนที่ (server/fodlan/stage4.js)
  movCutImmune(p) { return isIceSpike(p); },
  mapEffectImmune(p, kind) { return isIceSpike(p) && (kind === "frostbite" || kind === "stun"); },

  resetCombat(p) {
    p.iceHurt = 0;          // ดาเมจที่ได้รับสะสม (ครบ 3 = ระเบิด)
    p.iceSpikeRound = 0;    // หนามน้ำแข็ง: เทิร์นที่ใช้ล่าสุด
    p.iceSpikeUses = 0;     //  … จำนวนครั้งในเทิร์นนั้น (เทิร์นละ 2 · Ice Surge เทิร์นละ 6)
    p.iceBreakRound = 0;    // ปุ่มทำลาย: เทิร์นที่ใช้ล่าสุด
    p.iceBreakUses = 0;     //  … จำนวนครั้งในเทิร์นนั้น (เทิร์นละ 2)
    p.iceUltReady = 0;      // Ice Surge: กดได้อีกเมื่อ roundNumber >= ค่านี้
    p.iceStruckRound = 0;   // เทิร์นที่ไถลชนศัตรูด้วยสกิลแล้ว (ทำอย่างอื่นต่อไม่ได้)
    p.iceSurgeAt = 0;       // ลำดับตอนได้ Ice Surge ล่าสุด (engine.severStamp — ตัดผลสกิล server/sever.js)
  },

  // ตัดผลสกิล (server/sever.js — รากฐานจิตของเรียวกิ): Ice Surge → หมดทันทีแบบหมดเวลาเอง
  //  (ระยะ/ราคา/โควตาหนามกลับปกติ · คูลดาวน์ iceUltReady เดินต่อ · ฟื้นพลังที่ได้พร้อมกันเป็นบัฟกลาง — ไม่แตะ · หนามที่ยก Lv แล้วคงอยู่)
  severables(engine, p) {
    if (!isIceSpike(p) || !surging(p)) return [];
    return [{
      key: "iceSurge", label: "Ice Surge", at: p.iceSurgeAt || 0,
      cancel() {
        delete p.statuses.iceSurge;
        if (p.statusAmt) delete p.statusAmt.iceSurge;
        if (p.statusAt) delete p.statusAt.iceSurge;
      },
    }];
  },

  // ---------- สกิลทุกช่องมีโควตาของตัวเอง (ไม่ใช้โควตากลาง 1 สกิล/เทิร์น) ----------
  skipsTurnQuota(p) { return isIceSpike(p); },
  ignoresTurnQuota(p) { return isIceSpike(p); },
  // ทุกสกิลใช้ก่อนเดินแล้วยังเดินได้ (เดินไปแล้ว = ล็อกตามปกติ)
  keepsMove(engine, p) {
    return isIceSpike(p) && !!engine.action && !engine.action.moved;
  },
  // Ice Surge: ธารน้ำแข็ง/หนามน้ำแข็ง ระยะทั้งสนาม · หนามใช้แต้มลดลง 1
  skillArea(p, tier, area) {
    if (!isIceSpike(p) || (tier !== "basic" && tier !== "secondary")) return area;
    return surging(p) ? { ...area, range: SURGE_RANGE } : area;
  },
  skillCost(p, tier, base) {
    return isIceSpike(p) && surging(p) && tier === "secondary" ? Math.max(0, base - 1) : base;
  },
  // Glacial Path ใช้ได้ไม่จำกัด — ไม่ขึ้นป้ายกลางทุกครั้ง (มีเอฟเฟกต์บนกระดานแทน)
  silentFlash(p, tier) { return isIceSpike(p) && tier === "basic"; },

  // ---------- ด่านก่อนหักแต้ม ----------
  canUseSkill(engine, p, tier, targets, opts = {}) {
    const round = engine.roundNumber;
    if (p.iceStruckRound === round) return false;
    if (tier === "ultimate") return cdLeft(p.iceUltReady, round) === 0;
    const t = opts.tile;
    if (!t) return false;
    if (tier === "basic") return engine.ice.canLay(t.x, t.y);
    if (tier === "secondary") {
      if (spikesUsed(p, round) >= spikeLimit(p)) return false;
      return !!engine.ice.canSpike(t.x, t.y, opts.dir);
    }
    return false;
  },

  // ---------- ลงผล ----------
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    const Ice = engine.ice;
    const ctx = Ice.begin();
    if (tier === "basic") castGlacialPath(engine, p, opts.tile, ctx);
    else if (tier === "secondary") castSpike(engine, p, opts.tile, opts.dir, ctx);
    else if (tier === "ultimate") castSurge(engine, p, ctx);
    Ice.flush(ctx);
    if (ctx.events.length > 1) engine.skillBeat(Math.min(3, Ice.fxSeconds(ctx)), () => {});
    return "";
  },

  // ---------- ปุ่มทำลายบน HUD (tiles = ธารน้ำแข็ง/หนามของตัวเองทั้งแผนที่ → socket charAction { key, tile }) ----------
  hudActions(engine, p) {
    if (!isIceSpike(p) || !p.alive) return undefined;
    const ok = breakReady(engine, p);
    const left = BREAK_PER_TURN - breaksUsed(p, engine.roundNumber);
    return [{ key: BREAK_KEY, icon: "🔨", name: `ทำลาย ${left}/${BREAK_PER_TURN}`, tiles: ok ? breakTiles(engine, p) : [], disabled: !ok }];
  },
  // ไม่ใช่สกิล: 0 แต้ม · ไม่ได้แต้มคืน · ไม่กินโควตาสกิล · ก่อนเดิน = ยังเดินได้ · หลังเดิน = ย้อนการเดินไม่ได้แล้ว
  //  ทำลายแล้วแตก+น้ำแข็งเกิดสั้นๆ ไม่พักเกม (ไม่มี skillBeat)
  charAction(engine, p, key, { tile: t } = {}) {
    if (!isIceSpike(p) || key !== BREAK_KEY || !t || !breakReady(engine, p)) return false;
    const Ice = engine.ice;
    const spike = Ice.ownSpikeAt(t.x, t.y, p.id);
    if (!spike && !Ice.ownIceAt(t.x, t.y, p.id)) return false;
    const round = engine.roundNumber;
    p.iceBreakUses = breaksUsed(p, round) + 1;
    p.iceBreakRound = round;
    const ctx = Ice.begin();
    (spike ? breakOwnSpike : meltOwnIce)(engine, p, t, ctx);
    Ice.flush(ctx);
    if (engine.action && engine.action.moved) engine.action.locked = true;
    engine.broadcastState();
    return true;
  },

  // ---------- ติดตัว 1: ช่องที่เดิน/ไถลผ่านเป็นธารน้ำแข็ง ----------
  afterWalk(engine, p, tiles, ctx) {
    if (!isIceSpike(p)) return [];
    const recs = [], laid = [];
    const seen = new Set();
    for (const t of tiles) {
      const k = `${t.x},${t.y}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const r = engine.ice.layIce(t.x, t.y, p.id);
      if (r) { recs.push(r); laid.push({ x: t.x, y: t.y }); }
    }
    if (laid.length) {
      // เหตุการณ์วางน้ำแข็งเล่นต่อจากการเดิน (ก่อนไถล)
      const at = ctx.events.findIndex((e) => e.kind === "walk") + 1;
      ctx.events.splice(at, 0, { kind: "lay", tiles: laid, by: p.id });
    }
    return recs;
  },

  // ถูกผลัก/กระเด็น/ดึง (ระบบกลาง Ice.forcedMoved — ผู้ใช้สั่ง 2026-10-22): ทางที่ถูกพาผ่านเป็นธารน้ำแข็งเหมือนเดินเอง (ย้อนไม่ได้)
  //  ctx = ชุดเหตุการณ์ iceFx ที่ยังไม่ส่ง (ต่อท้าย) · null = ส่งชุดของตัวเอง
  onForcedMove(engine, u, tiles, ctx) {
    if (!isIceSpike(u) || !u.alive || !Array.isArray(tiles) || !tiles.length) return;
    const laid = [];
    const seen = new Set();
    for (const t of tiles) {
      const k = `${t.x},${t.y}`;
      if (seen.has(k)) continue;
      seen.add(k);
      if (engine.ice.layIce(t.x, t.y, u.id)) laid.push({ x: t.x, y: t.y });
    }
    if (!laid.length) return;
    const own = ctx || engine.ice.begin();
    own.events.push({ kind: "lay", tiles: laid, by: u.id });
    if (!ctx) engine.ice.flush(own);
  },

  // ---------- ติดตัว 2: ไถลชนศัตรู ----------
  slideStrike(engine, p, u, n) {
    if (!isIceSpike(p)) return 0;
    const dmg = Math.min(STRIKE_MAX, n);
    u.wasAttacked = true;
    engine.dealMixed(u, dmg, false);
    engine.log(`🧊 ${p.name} ไถลชน ${u.name} -${dmg} (ลดเกราะก่อน)`);
    return dmg;
  },

  // ---------- ติดตัว 3: ฟื้นจากการไถล · สะสมดาเมจ ----------
  onSlide(engine, p, n, ctx) {
    if (!isIceSpike(p)) return;
    const kHp = Math.floor(n / REGEN_HP_EVERY), kSp = Math.floor(n / REGEN_SP_EVERY);
    if (kHp <= 0 && kSp <= 0) return;
    const hp = kHp > 0 ? engine.healHp(p, kHp) : 0;
    const before = p.skillPoints;
    if (kSp > 0) engine.addSkill(p, kSp, "passive");
    const sp = p.skillPoints - before;
    if (hp || sp) {
      ctx.events.push({ kind: "regen", id: p.id, hp, sp });
      engine.log(`🧊 ${p.name} ไถล ${n} ช่อง — ฟื้นพลังชีวิต +${hp} แต้มสกิล +${sp}`);
    }
  },
  onDamageTaken(engine, p, n) {
    if (isIceSpike(p) && p.alive) engine.ice.noteHurt(p, n);
  },
  // ชนหนามของตัวเอง = แต้มสกิล +2 (ไม่เสียหาย ไม่เชื่องช้า)
  ownSpike(engine, p) {
    if (!isIceSpike(p)) return 0;
    const before = p.skillPoints;
    engine.addSkill(p, OWN_SPIKE_SP, "passive");
    return p.skillPoints - before;
  },

  // ---------- ข้อมูลให้ client ----------
  skillLocks(engine, p) {
    const round = engine.roundNumber;
    const struck = p.iceStruckRound === round;
    return {
      basic: { locked: struck },
      secondary: { locked: struck || spikesUsed(p, round) >= spikeLimit(p) },
      ultimate: { cd: cdLeft(p.iceUltReady, round), locked: struck },
    };
  },
};

// ---------- ลงผลสกิลทีละช่อง (applyInstantSkill) — ctx = ชุดเหตุการณ์ iceFx ของการกดครั้งนี้ ----------
// พื้นฐาน Glacial Path: ธารน้ำแข็ง 1 ช่อง (canUseSkill เช็ค canLay แล้ว)
function castGlacialPath(engine, p, t, ctx) {
  engine.ice.layIce(t.x, t.y, p.id);
  ctx.events.push({ kind: "lay", tiles: [{ x: t.x, y: t.y }], by: p.id });
  engine.log(`🧊 ${p.name} Glacial Path — ธารน้ำแข็งที่ช่อง (${t.x}, ${t.y})`);
}

// ปุ่มทำลาย: ธารน้ำแข็งของตัวเอง 1 ช่องหายไป
function meltOwnIce(engine, p, t, ctx) {
  if (!engine.ice.meltIce(t.x, t.y)) return;
  ctx.events.push({ kind: "melt", tiles: [{ x: t.x, y: t.y }], by: p.id });
  engine.log(`🧊 ${p.name} ทำลายธารน้ำแข็งที่ช่อง (${t.x}, ${t.y})`);
}
// ปุ่มทำลาย: หนามของตัวเองหายทันที (ทุก Lv) → ธารน้ำแข็งที่ช่องเดิม
function breakOwnSpike(engine, p, t, ctx) {
  const s = engine.ice.breakSpike(t.x, t.y);
  if (!s) return;
  ctx.events.push({ kind: "spikeDown", x: t.x, y: t.y, lv: 0, from: s.lv });
  if (engine.ice.layIce(t.x, t.y, p.id)) ctx.events.push({ kind: "lay", tiles: [{ x: t.x, y: t.y }], by: p.id });
  engine.log(`🧊 ${p.name} ทำลายหนามน้ำแข็ง Lv.${s.lv} กลายเป็นธารน้ำแข็ง`);
}

// รอง หนามน้ำแข็ง: มีคนยืน = ผลักไปทิศ dir ก่อน (ศัตรู + เชื่องช้า) แล้ววางหนามที่ช่องนั้น
function castSpike(engine, p, t, dir, ctx) {
  const Ice = engine.ice;
  const round = engine.roundNumber;
  p.iceSpikeUses = spikesUsed(p, round) + 1;
  p.iceSpikeRound = round;
  const chk = Ice.canSpike(t.x, t.y, dir);
  const u = chk && chk.unit; // มีคน = canSpike ยืนยันทิศ dir แล้ว
  const up = { kind: "spikeUp", x: t.x, y: t.y, lv: 1, from: 0 };
  ctx.events.push(up);
  if (u) {
    engine.log(`🧊 ${p.name} หนามน้ำแข็ง — ${u.name} ถูกผลัก`);
    const [dx, dy] = Board.LINE_DIRS[dir];
    Ice.pushUnit(u, { x: dx, y: dy }, ctx);
    if (u.id !== p.id && !engine.sameTeam(p, u) && u.alive && Ice.applySlow(u)) ctx.events.push({ kind: "slow", id: u.id });
  }
  const placed = Ice.placeSpike(t.x, t.y, p.id, 1);
  up.lv = placed.lv;
  engine.log(`🧊 ${p.name} หนามน้ำแข็ง Lv.${placed.lv}`);
  // ผลักตัวเอง = เดินต่อไม่ได้ · ไถลไปชนศัตรูด้วย = ดาเมจลง แต่จบตาไม่ได้กลางสกิล → ทำอย่างอื่นต่อไม่ได้แล้ว (ย้อน/เดิน/สกิล)
  const struck = ctx.strikes.some((h) => h.by === p.id);
  if (struck) p.iceStruckRound = round;
  if ((struck || (u && u.id === p.id)) && engine.action) { engine.action.moved = true; engine.action.locked = true; }
}

// ท่าไม้ตาย Ice Surge: หนามทุกอันบนสนาม +1 Lv · บัฟ Ice Surge 3 เทิร์น · ฟื้นพลัง 3 ขั้น
function castSurge(engine, p, ctx) {
  p.iceUltReady = engine.roundNumber + ULT_COOLDOWN;
  engine.applyBuff(p, "iceSurge", null, SURGE_TURNS);
  p.iceSurgeAt = engine.severStamp();
  engine.applySpRegen(p, SURGE_REGEN);
  ctx.events.push({ kind: "surge", id: p.id, x: p.pos.x, y: p.pos.y });
  const raised = engine.ice.raiseAllSpikes();
  for (const r of raised) ctx.events.push({ kind: "spikeUp", ...r });
  engine.log(`🧊 ${p.name} Ice Surge — หนามน้ำแข็ง +1 Lv ${raised.length} อัน · ระยะสกิลทั้งสนาม ${SURGE_TURNS} เทิร์น · ฟื้นพลัง ${SURGE_REGEN} ขั้น`);
}
