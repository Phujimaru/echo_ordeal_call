// ============================================================
//  Ice Spike — ระดับยาก · id "ice_spike" · กติกาที่ผู้ใช้ตัดสิน: GRID_PLAN §7.9 (2026-10-12 · ปรับสมดุล 2026-10-14)
//  ระบบกลางที่ใช้: server/ice.js (ธารน้ำแข็ง/หนาม/ไถล/ผลัก/เชื่องช้า) — เรียกผ่าน engine.ice
//
//  ค่าพื้นฐาน: เลือด 8 / เกราะ 2 · เดิน 4 · พลังโจมตี 0 · ตีปกติไม่ได้ (range [1, 0] ใน characters.js · ปืน GUTS ยิงได้)
//  ติดตัว 1 ฝีก้าวของธารน้ำแข็ง: ทุกช่องที่เดิน/ไถลผ่าน (รวมช่องออกตัว) = ธารน้ำแข็ง 6 เทิร์น (เหยียบซ้ำ = นับใหม่)
//  ติดตัว 2 แรงปะทะเหมันต์: ไถลชนศัตรู = ความเสียหายเท่าระยะไถล (สูงสุด 3 · ไม่ติดคริ ไม่รับบัฟพลังโจมตี · หลบไม่ได้)
//    แล้วเป้ากระเด็นตามทิศ 1 ช่อง · ไถลชนตอนเดินในตาตัวเอง = นับเป็นการโจมตี จบตา
//  ติดตัว 3 การฟื้นฟูแห่งเหมันต์: ดาเมจที่ได้รับสะสมครบ 3 = ระเบิดผลักศัตรู 8 ช่องรอบตัว + เชื่องช้า (server/ice.js burst)
//    ไถลครั้งเดียว: ครบทุก 3 ช่อง = ฟื้นพลังชีวิต +1 · ครบทุก 2 ช่อง = แต้มสกิล +1
//  พื้นฐาน Glacial Path (1 แต้ม · ไม่จำกัดครั้ง · ก่อน/หลังเดิน): ธารน้ำแข็ง 1 ช่องในระยะ 8
//  รอง หนามน้ำแข็ง (2 แต้ม · เทิร์นละ 2 ครั้ง · ก่อน/หลังเดิน): หนาม Lv1 ในระยะ 8 (บนน้ำแข็ง = Lv2 · เกราะ 1 ทุก Lv)
//    วางทับคน = ผลักไปทิศที่เลือก 1 ช่อง + เชื่องช้า (ตัวเอง: ผลักแต่ไม่เชื่องช้า)
//  ท่าไม้ตาย Ice Surge น้ำแข็งโถมกระหน่ำ (4 แต้ม · คูลดาวน์ 6 · ก่อน/หลังเดิน · ตัวเอง):
//    หนามทุกอันบนสนาม +1 Lv · ได้ "Ice Surge" 3 เทิร์น + "ฟื้นพลัง" 3 ขั้น (ต้นเทิร์นแต้มสกิล +1)
//    ระหว่าง Ice Surge: ธารน้ำแข็ง/หนามน้ำแข็ง ระยะทั้งสนาม · หนามใช้แต้มลดลง 1 และไม่จำกัดครั้ง
//
//  Claude ตัดสินเอง (บอกผู้ใช้แล้ว — GRID_PLAN §7.9): ไถลชนเพื่อนร่วมทีม = หยุดเฉยๆ · ไถลชนตัวใหญ่ = ดาเมจแต่ไม่กระเด็น ·
//   ไถลชนจากการถูกผลักด้วยสกิลตัวเอง = ดาเมจลงแต่ไม่จบตา (ทำอย่างอื่นต่อไม่ได้แล้ว) · ระเบิดครั้งเดียวต่อดาเมจหนึ่งก้อน (เศษทบ) ·
//   คูลดาวน์ 6: กดเทิร์น N กดได้อีกเทิร์น N + 6 · Ice Surge ยกหนามของ Ice Spike ทุกคน · ฟื้นพลังกดซ้ำ = นับใหม่ 3 ขั้น
// ============================================================

const Board = require("../server/board");

const ID = "ice_spike";
const DIR = "/characters/ice_spike";
const IMG = { base: `${DIR}/ice_spike.webp`, skill1: `${DIR}/skill1.webp`, skill2: `${DIR}/skill2.webp`, skill3: `${DIR}/skill3.webp` };

const STRIKE_MAX = 3;     // โบนัสความเสียหายจากระยะไถลสูงสุด (เดิม 4 — เนิฟ 2026-10-14)
const REGEN_HP_EVERY = 3; // ไถลครบทุก 3 ช่อง = พลังชีวิต +1
const REGEN_SP_EVERY = 2; // ไถลครบทุก 2 ช่อง = แต้มสกิล +1
const OWN_SPIKE_SP = 2;   // ชนหนามตัวเอง = แต้มสกิล +2
const SPIKE_PER_TURN = 2; // หนามน้ำแข็งเทิร์นละ 2 ครั้ง (Ice Surge = ไม่จำกัด)
const ULT_COOLDOWN = 6;
const SURGE_TURNS = 3;    // บัฟ Ice Surge
const SURGE_REGEN = 3;    // ฟื้นพลัง 3 ขั้น
const SURGE_RANGE = 99;   // ระยะ "ทั้งสนาม" (เกินกระดาน 14×14 ทุกทิศ)

const isIceSpike = (p) => !!p && p.characterId === ID;
// ระหว่างบัฟ Ice Surge
const surging = (p) => !!p && ((p.statuses && p.statuses.iceSurge) || 0) > 0;
// หนามน้ำแข็งที่ใช้ไปแล้วในเทิร์นนี้
const spikesUsed = (p, round) => (p.iceSpikeRound === round ? p.iceSpikeUses || 0 : 0);
// คูลดาวน์ที่เหลือ (เทิร์น) จากเทิร์นที่กดได้อีก ready · 0 = กดได้
const cdLeft = (ready, round) => Math.max(0, (ready || 0) - round);

module.exports = {
  id: ID,
  IMG, STRIKE_MAX, REGEN_HP_EVERY, REGEN_SP_EVERY, OWN_SPIKE_SP, SPIKE_PER_TURN, ULT_COOLDOWN, SURGE_TURNS, SURGE_REGEN, SURGE_RANGE,
  isIceSpike, surging,

  // เลือด 8 / เกราะ 2 · พลังโจมตีพื้นฐาน 0
  maxHp(p) { return isIceSpike(p) ? 8 : undefined; },
  maxArmor(p, base) { return isIceSpike(p) ? 2 : base; },
  attackBaseOverride(engine, p) { return isIceSpike(p) ? 0 : 1; },

  resetCombat(p) {
    p.iceHurt = 0;          // ดาเมจที่ได้รับสะสม (ครบ 3 = ระเบิด)
    p.iceSpikeRound = 0;    // หนามน้ำแข็ง: เทิร์นที่ใช้ล่าสุด
    p.iceSpikeUses = 0;     //  … จำนวนครั้งในเทิร์นนั้น (เทิร์นละ 2 · Ice Surge ไม่จำกัด)
    p.iceUltReady = 0;      // Ice Surge: กดได้อีกเมื่อ roundNumber >= ค่านี้
    p.iceStruckRound = 0;   // เทิร์นที่ไถลชนศัตรูด้วยสกิลแล้ว (ทำอย่างอื่นต่อไม่ได้)
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
    return isIceSpike(p) && surging(p) && (tier === "basic" || tier === "secondary") ? { ...area, range: SURGE_RANGE } : area;
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
      if (!surging(p) && spikesUsed(p, round) >= SPIKE_PER_TURN) return false;
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
      secondary: { locked: struck || (!surging(p) && spikesUsed(p, round) >= SPIKE_PER_TURN) },
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
  engine.applySpRegen(p, SURGE_REGEN);
  ctx.events.push({ kind: "surge", id: p.id, x: p.pos.x, y: p.pos.y });
  const raised = engine.ice.raiseAllSpikes();
  for (const r of raised) ctx.events.push({ kind: "spikeUp", ...r });
  engine.log(`🧊 ${p.name} Ice Surge — หนามน้ำแข็ง +1 Lv ${raised.length} อัน · ระยะสกิลทั้งสนาม ${SURGE_TURNS} เทิร์น · ฟื้นพลัง ${SURGE_REGEN} ขั้น`);
}
