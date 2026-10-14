// ============================================================
//  Ice Spike — ระดับยาก · id "ice_spike" · กติกาที่ผู้ใช้ตัดสิน: GRID_PLAN §7.9 (2026-10-12)
//  ระบบกลางที่ใช้: server/ice.js (ธารน้ำแข็ง/หนาม/ไถล/ผลัก/เชื่องช้า) — เรียกผ่าน engine.ice
//
//  ค่าพื้นฐาน: เลือด 8 / เกราะ 2 · เดิน 4 · พลังโจมตี 0 · ตีปกติไม่ได้ (range [1, 0] ใน characters.js · ปืน GUTS ยิงได้)
//  ติดตัว 1 ฝีก้าวของธารน้ำแข็ง: ทุกช่องที่เดิน/ไถลผ่าน (รวมช่องออกตัว) = ธารน้ำแข็ง 6 เทิร์น (เหยียบซ้ำ = นับใหม่)
//  ติดตัว 2 แรงปะทะเหมันต์: ไถลชนศัตรู = ความเสียหายเท่าระยะไถล (สูงสุด 4 · ไม่ติดคริ ไม่รับบัฟพลังโจมตี · หลบไม่ได้)
//    แล้วเป้ากระเด็นตามทิศ 1 ช่อง · ไถลชนตอนเดินในตาตัวเอง = นับเป็นการโจมตี จบตา
//  ติดตัว 3 การฟื้นฟูแห่งเหมันต์: ดาเมจที่ได้รับสะสมครบ 3 = ระเบิดผลักศัตรู 8 ช่องรอบตัว + เชื่องช้า (server/ice.js burst)
//    ไถลครบทุก 2 ช่อง = ฟื้นพลังชีวิต +1 และแต้มสกิล +1
//  พื้นฐาน Glacial Path (1 แต้ม · ไม่จำกัดครั้ง · ก่อน/หลังเดิน): ธารน้ำแข็ง 1 ช่องในระยะ 6
//  รอง หนามน้ำแข็ง (2 แต้ม · เทิร์นละครั้ง · ก่อน/หลังเดิน): หนาม Lv1 ในระยะ 6 (บนน้ำแข็ง = Lv2)
//    วางทับคน = ผลักไปทิศที่เลือก 1 ช่อง + เชื่องช้า (ตัวเอง: ผลักแต่ไม่เชื่องช้า)
//  ท่าไม้ตาย คุกน้ำแข็ง (5 แต้ม · คูลดาวน์ 5 · หลังเดินเท่านั้น): กรอบ 5×5 ช่องกลางในระยะ 6
//    กด: ศัตรูในกรอบเชื่องช้า · หนามในกรอบ +1 Lv · มาร์กกรอบ
//    ต้นตาเดินถัดไปของ Ice Spike: 3×3 กลาง = ธารน้ำแข็ง → ขอบ 16 ช่อง = หนาม Lv1 (มีน้ำแข็ง/หนามอยู่แล้ว = Lv ขึ้น)
//    คนบนขอบถูกผลักเข้ากรอบ (ลงน้ำแข็ง = ไถลข้ามไปชนหนามฝั่งตรงข้ามได้)
//
//  Claude ตัดสินเอง (บอกผู้ใช้แล้ว — GRID_PLAN §7.9): ไถลชนเพื่อนร่วมทีม = หยุดเฉยๆ · ไถลชนตัวใหญ่ = ดาเมจแต่ไม่กระเด็น ·
//   ไถลชนจากการถูกผลักด้วยสกิลตัวเอง = ดาเมจลงแต่ไม่จบตา (ทำอย่างอื่นต่อไม่ได้แล้ว) · ระเบิดครั้งเดียวต่อดาเมจหนึ่งก้อน (เศษทบ) ·
//   Ice Spike ตาย/เปลี่ยนภูมิภาคก่อนช่วงที่ 2 = คุกยกเลิก · คูลดาวน์ 5: กดเทิร์น N กดได้อีกเทิร์น N + 5
// ============================================================

const Board = require("../server/board");

const ID = "ice_spike";
const DIR = "/characters/ice_spike";
const IMG = { base: `${DIR}/ice_spike.webp`, skill1: `${DIR}/skill1.webp`, skill2: `${DIR}/skill2.webp`, skill3: `${DIR}/skill3.webp` };

const STRIKE_MAX = 4;     // โบนัสความเสียหายจากระยะไถลสูงสุด
const REGEN_EVERY = 2;    // ไถลครบทุก 2 ช่อง = ฟื้น 1/1
const OWN_SPIKE_SP = 2;   // ชนหนามตัวเอง = แต้มสกิล +2
const ULT_COOLDOWN = 5;
const PRISON = 5;         // กรอบคุก 5×5

const isIceSpike = (p) => !!p && p.characterId === ID;
// คูลดาวน์ที่เหลือ (เทิร์น) จากเทิร์นที่กดได้อีก ready · 0 = กดได้
const cdLeft = (ready, round) => Math.max(0, (ready || 0) - round);

module.exports = {
  id: ID,
  IMG, STRIKE_MAX, REGEN_EVERY, OWN_SPIKE_SP, ULT_COOLDOWN, PRISON,
  isIceSpike,

  // เลือด 8 / เกราะ 2 · พลังโจมตีพื้นฐาน 0
  maxHp(p) { return isIceSpike(p) ? 8 : undefined; },
  maxArmor(p, base) { return isIceSpike(p) ? 2 : base; },
  attackBaseOverride(engine, p) { return isIceSpike(p) ? 0 : 1; },

  resetCombat(p) {
    p.iceHurt = 0;          // ดาเมจที่ได้รับสะสม (ครบ 3 = ระเบิด)
    p.iceSpikeRound = 0;    // หนามน้ำแข็ง: เทิร์นที่ใช้ล่าสุด (เทิร์นละครั้ง)
    p.iceUltReady = 0;      // คุกน้ำแข็ง: กดได้อีกเมื่อ roundNumber >= ค่านี้
    p.iceStruckRound = 0;   // เทิร์นที่ไถลชนศัตรูด้วยสกิลแล้ว (ทำอย่างอื่นต่อไม่ได้)
  },

  // ---------- สกิลทุกช่องมีโควตาของตัวเอง (ไม่ใช้โควตากลาง 1 สกิล/เทิร์น) ----------
  skipsTurnQuota(p) { return isIceSpike(p); },
  ignoresTurnQuota(p) { return isIceSpike(p); },
  // ธารน้ำแข็ง/หนามน้ำแข็ง ใช้ก่อนเดินแล้วยังเดินได้ (เดินไปแล้ว = ล็อกตามปกติ) · ท่าไม้ตายล็อกการเดินเสมอ (หลังเดินเท่านั้น)
  keepsMove(engine, p, tier) {
    return isIceSpike(p) && tier !== "ultimate" && !!engine.action && !engine.action.moved;
  },
  // Glacial Path ใช้ได้ไม่จำกัด — ไม่ขึ้นป้ายกลางทุกครั้ง (มีเอฟเฟกต์บนกระดานแทน)
  silentFlash(p, tier) { return isIceSpike(p) && tier === "basic"; },

  // ---------- ด่านก่อนหักแต้ม ----------
  canUseSkill(engine, p, tier, targets, opts = {}) {
    const round = engine.roundNumber;
    const t = opts.tile;
    if (!t) return false;
    if (p.iceStruckRound === round) return false;
    if (tier === "basic") return engine.ice.canLay(t.x, t.y);
    if (tier === "secondary") {
      if (p.iceSpikeRound === round) return false;
      return !!engine.ice.canSpike(t.x, t.y, opts.dir);
    }
    if (tier === "ultimate") return cdLeft(p.iceUltReady, round) === 0;
    return false;
  },

  // ---------- ลงผล ----------
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    const Ice = engine.ice;
    const ctx = Ice.begin();
    if (tier === "basic") castGlacialPath(engine, p, opts.tile, ctx);
    else if (tier === "secondary") castSpike(engine, p, opts.tile, opts.dir, ctx);
    else if (tier === "ultimate") castPrison(engine, p, opts.tile, targets, ctx);
    Ice.flush(ctx);
    if (ctx.events.length > 1) engine.skillBeat(Math.min(3, Ice.fxSeconds(ctx)), () => {});
    return "";
  },

  // ---------- ต้นตาเดิน: คุกน้ำแข็งช่วงที่ 2 ----------
  onActorStart(engine, p) {
    if (!isIceSpike(p)) return;
    for (const r of engine.ice.takePrisons(p.id, engine.roundNumber)) closePrison(engine, p, r);
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
    const k = Math.floor(n / REGEN_EVERY);
    if (k <= 0) return;
    const hp = engine.healHp(p, k);
    const before = p.skillPoints;
    engine.addSkill(p, k, "passive");
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
      secondary: { locked: struck || p.iceSpikeRound === round },
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

// ท่าไม้ตาย คุกน้ำแข็งช่วงที่ 1: ศัตรูในกรอบเชื่องช้า · หนามในกรอบ +1 Lv · มาร์กกรอบไว้รอช่วงที่ 2 (onActorStart)
//  targets = คนที่ตัวทับกรอบ 5×5 (useSkill → resolveArea ชนิด tile · ตัวใหญ่ทับช่องไหนก็ได้)
function castPrison(engine, p, t, targets, ctx) {
  const Ice = engine.ice;
  const round = engine.roundNumber;
  p.iceUltReady = round + ULT_COOLDOWN;
  ctx.events.push({ kind: "prisonMark", x: t.x, y: t.y, size: PRISON, by: p.id });
  let slowed = 0;
  for (const id of targets || []) {
    const o = engine.players[id];
    if (!o || o.id === p.id || engine.sameTeam(p, o)) continue;
    if (Ice.applySlow(o)) { slowed++; ctx.events.push({ kind: "slow", id: o.id }); }
  }
  for (const a of engine.tileArea({ square: PRISON }, t)) {
    if (!Ice.spikeAt(a.x, a.y)) continue;
    const r = Ice.raiseSpike(Board.key(a.x, a.y));
    if (r) ctx.events.push({ kind: "spikeUp", ...r });
  }
  Ice.addPrison({ x: t.x, y: t.y, owner: p.id, round });
  engine.log(`🧊 ${p.name} คุกน้ำแข็ง — ศัตรูในกรอบเชื่องช้า ${slowed} คน · ตาเดินถัดไปคุกปิด`);
}

// ---------- คุกน้ำแข็งช่วงที่ 2 ----------
// 3×3 กลาง = ธารน้ำแข็ง → ขอบ 16 ช่อง = หนาม Lv1 (น้ำแข็ง/หนามเดิม = Lv ขึ้น) → คนบนขอบถูกผลักเข้ากรอบ
function closePrison(engine, p, r) {
  const ctx = engine.ice.begin();
  const ev = { kind: "prison", x: r.x, y: r.y, by: p.id, ice: [], ring: [] };
  ctx.events.push(ev);
  layPrisonIce(engine, p, r, ev);
  const later = placeRing(engine, p, r, ev);
  pushInward(engine, p, r, later, ev, ctx);
  engine.log(`🧊 ${p.name} คุกน้ำแข็งปิด — ธารน้ำแข็ง ${ev.ice.length} ช่อง · หนาม ${ev.ring.length} ช่อง`);
  engine.ice.flush(ctx);
}

// ธารน้ำแข็ง 3×3 (ข้ามสิ่งกีดขวาง/หนาม/ร้านค้า) → ev.ice
function layPrisonIce(engine, p, r, ev) {
  const map = engine.boardMap();
  for (let y = r.y - 1; y <= r.y + 1; y++) {
    for (let x = r.x - 1; x <= r.x + 1; x++) if (Board.inBounds(map, x, y) && engine.ice.layIce(x, y, p.id)) ev.ice.push({ x, y });
  }
}

// ขอบ 16 ช่องของกรอบรอบ (cx, cy) ไล่ตามเข็มนาฬิกาจากมุมบนซ้าย (ลำดับที่หนามโผล่) — รวมช่องนอกกระดาน
function prisonRing(cx, cy) {
  const h = Math.floor(PRISON / 2), ring = [];
  for (let i = -h; i < h; i++) ring.push({ x: cx + i, y: cy - h });
  for (let i = -h; i < h; i++) ring.push({ x: cx + h, y: cy + i });
  for (let i = h; i > -h; i--) ring.push({ x: cx + i, y: cy + h });
  for (let i = h; i > -h; i--) ring.push({ x: cx - h, y: cy + i });
  return ring;
}

// หนามรอบขอบ (หนามเดิม = Lv ขึ้น · ข้ามสิ่งกีดขวาง/ร้านค้า) → ev.ring
//  คืนช่องที่มีคนยืน [{ t, id, big }] — ผลักเข้ากรอบก่อนแล้วค่อยวางหนาม (pushInward)
function placeRing(engine, p, r, ev) {
  const Ice = engine.ice;
  const map = engine.boardMap();
  const units = engine.boardUnits();
  const later = [];
  for (const t of prisonRing(r.x, r.y)) {
    if (!Board.inBounds(map, t.x, t.y)) continue;
    const k = Board.key(t.x, t.y);
    if (Ice.spikeAt(t.x, t.y)) { const up = Ice.raiseSpike(k); if (up) ev.ring.push({ x: t.x, y: t.y, lv: up.lv }); continue; }
    if (engine.boardMap().terrain[k]) continue; // สิ่งกีดขวางอื่น
    if (engine.shopPos && engine.shopPos.x === t.x && engine.shopPos.y === t.y) continue;
    const u = Board.unitAt(units, t.x, t.y);
    if (u) { later.push({ t, id: u.id, big: u.size > 1 }); continue; }
    const s = Ice.placeSpike(t.x, t.y, p.id, 1);
    ev.ring.push({ x: t.x, y: t.y, lv: s.lv });
  }
  return later;
}

// คนบนขอบถูกผลักเข้าหาช่องกลาง (มุม = ทแยง) · ขยับออกได้ = วางหนามที่ช่องเดิม → ev.ring
function pushInward(engine, p, r, later, ev, ctx) {
  const Ice = engine.ice;
  for (const l of later) {
    if (l.big) continue; // ตัวใหญ่ไม่ถูกผลัก — เว้นช่องนั้น
    const o = engine.players[l.id];
    if (!o || !o.alive || !o.pos || o.pos.x !== l.t.x || o.pos.y !== l.t.y) continue;
    const dir = { x: Math.sign(r.x - l.t.x), y: Math.sign(r.y - l.t.y) };
    if (Ice.pushUnit(o, dir, ctx) && !Ice.spikeAt(l.t.x, l.t.y) && !engine.boardMap().terrain[Board.key(l.t.x, l.t.y)]
      && engine.tileFree(l.t.x, l.t.y)) {
      const s = Ice.placeSpike(l.t.x, l.t.y, p.id, 1);
      ev.ring.push({ x: l.t.x, y: l.t.y, lv: s.lv });
    }
  }
}
