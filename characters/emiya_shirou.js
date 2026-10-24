// ============================================================
//  เอมิยะ ชิโร่ (Fate/stay night [Unlimited Blade Works]) — ยาก · id "emiya_shirou"
//  กติกาที่ผู้ใช้ตัดสิน GRID_PLAN §7.18 (2026-10-24) · สัญญาข้อมูล client .claude/plans/emiya-contract.md · เอฟเฟกต์ client/src/board/emiyaFx.js
//
//  ค่าพื้นฐาน 7/3/1 · เดิน 4 · ตีประชิด [1, 1] · แต้มสกิล 0/8 (ความจุเพิ่มได้ถึง 24 — ฮุค maxSkill)
//  Avalon Magecraft (ติดตัว):
//    จบเทิร์นที่ไม่เสียพลังชีวิต/เกราะเลย → เยียวยา 1 × 2 เทิร์น (คูลดาวน์ 3 นับจากเทิร์นที่ติด — onDamageTaken จดเทิร์นที่โดน · onEndTurn ตัดสิน)
//    ใช้สกิลสำเร็จ 30% → ความจุแต้มสกิล +2 (ไม่เกิน +16) · ไอเทมฟื้นแต้มสกิลใช้ไม่ได้ผล (blocksSkillGain "item")
//    ตีปกติขณะถืออาวุธ +1 แต้มสกิลต่อการตี 1 ครั้ง (afterStrike — K&B 2 ฮิตได้ 1)
//  Trace On (พื้นฐาน · ปุ่ม 5 ตัวเลือก · ราคาตามอาวุธ · คูลดาวน์ 2 · ไม่กินโควตา · กดแล้วยังเดินได้):
//    อาวุธอยู่ 5 เทิร์น (นับเทิร์นที่กด) · ตีปกติ + สกิลรองรวมครบ 3 ครั้ง = หาย · กดใหม่ = แทนอาวุธเดิม
//    Kanshou & Bakuya — ตีปกติ 2 ฮิต (ฮุค strikeRepeat) + คริ 15% · Hrunting — ระยะตี [1, 4] + เดิน −1 ·
//    Rule Breaker — ตีโดนติดห้ามสกิล (คลุมตาเดินถัดไปของเป้า) + ผนึกพลังงาน 2 · Nine Lives — พลังโจมตี +1 + ตีกรอบ 2×3 (ฮุค strikeRect) ·
//    Excalibur — เฉพาะ UBW · 1 ครั้งต่อเกม · 2 เทิร์น · ตี 2 ครั้ง/สกิลรอง 1 ครั้งหาย · เปลี่ยนอาวุธไม่ได้ · พลังโจมตี +1 · ตีแนว 3×1 · เปราะบาง +1 2 เทิร์น
//  Weapon Skill (รอง · เปลี่ยนตามอาวุธ · ไม่มีอาวุธ = ใช้ไม่ได้ · คูลดาวน์ร่วม 4 นับตอนใช้):
//    Throwing Blade (3 · ระยะ 4 · 1 + เลือดไหล 2) · Caladbolg II (ครึ่งความจุ · แนว 8×1 หยุดที่ศัตรูคนแรก · 1 + ราคา÷2 + ระเบิด 1 รัศมี 2 ·
//    คลิป Before → After ก่อนผลลง) · Ground Smash (6 · แนว 4×3 · 3 + ผลัก 2 ชน = สตั้น) · Rho Aias (5 · คุ้มครอง −1 + ต้านสถานะ 2 เทิร์น) ·
//    Ex calibruuuu! (8 · แนว 5×3 · 4 หลบไม่ได้ คุ้มครองไม่มีผล · ใช้แล้ว Excalibur หาย)
//  Unlimited Blade Works (ท่าไม้ตาย · 12 · ทั้งสนาม): 6 เทิร์น (นับเทิร์นที่กด) · คูลดาวน์ 6 นับหลังจบ (กด N → N+12) ·
//    ต้นเทิร์นแต้มสกิล +1 · คูลดาวน์สกิลรองลดเพิ่ม 1/เทิร์น · Trace On ไม่มีคูลดาวน์ · เดิน +1 · ชิโร่ตาย = จบ · ภาพทั้งกระดาน (ช่องเหมือนเดิม)
//
//  Claude ตัดสินเอง (GRID_PLAN §7.18): กดอาวุธเดิมซ้ำได้ (รีเฟรช) · แต้ม UBW ต้นเทิร์นเริ่มเทิร์นถัดไป (5 ครั้ง) · Caladbolg ไม่มีศัตรูในแนว = ยิงเปล่า ·
//    ดาเมจสกิลบวกเปราะบางของเป้า + คุ้มครองลดได้ (ยกเว้น Ex calibruuuu!) · ทอยหลบ: Throwing Blade / Caladbolg (คนแรก) / Ground Smash
// ============================================================
const Board = require("../server/board");

const ID = "emiya_shirou";
const DIR = "/characters/emiya_shirou";
const IMG = {
  base: `${DIR}/emiya.webp`,
  trace: `${DIR}/emiya_trace.webp`,
  ubw: `${DIR}/emiya_ubw.webp`,
  ws: `${DIR}/emiya_ws.webp`,
  w: (k) => `${DIR}/emiya_w_${k}.webp`,
  s: (k) => `${DIR}/emiya_s_${k}.webp`,
};
const VIDEO = {
  calBefore: `${DIR}/emiya_caladbolg_before.mp4`,
  calAfter: `${DIR}/emiya_caladbolg_after.mp4`,
  ubw: `${DIR}/emiya_ubw.mp4`,
};
const CUT = { calBefore: "emiyaCaladbolgBefore", calAfter: "emiyaCaladbolgAfter", ubw: "emiyaUbw" };
const FX = "emiyaFx"; // socket event (client/src/board/emiyaFx.js)

const HP = 7;
const ARMOR = 3;
const BASE_SKILL = 8;
const CAP_STEP = 2;
const CAP_MAX = 16;        // เพิ่มได้ไม่เกิน 16 จากของเดิม (สูงสุด 24)
const CAP_CHANCE = 0.3;
const AVALON_AMT = 1;
const AVALON_TURNS = 2;
const AVALON_CD = 3;
const TRACE_CD = 2;
const WEAPON_TURNS = 5;
const WEAPON_USES = 3;     // ตีปกติ + สกิลรอง รวมกัน
const EXCAL_TURNS = 2;
const EXCAL_STRIKES = 2;
const WS_CD = 4;
const ULT_TURNS = 6;
const ULT_CD = ULT_TURNS + 6; // คูลดาวน์ 6 นับหลัง UBW หมด (ผู้ใช้ตัดสิน 2026-10-24)
const UBW = "emiyaUbw";       // สถานะแสดงเทิร์นที่เหลือของ UBW (ค่าจริงอยู่ที่ s.ubwEnd)
const KB_CRIT = 15;
const RULE_SEAL = 2;
const EXCAL_FRAGILE = 1;
const EXCAL_FRAGILE_TURNS = 2;
const THROW_DMG = 1;
const THROW_BLEED = 2;
const SMASH_DMG = 3;
const SMASH_PUSH = 2;
const RHO_GUARD = 1;
const RHO_TURNS = 2;
const EXCAL_DMG = 4;
const CAL_SPLASH = 1;
const CAL_RADIUS = 2;
// จังหวะพักให้กระดานเล่นเอฟเฟกต์ก่อนผลลง (ต้องไม่สั้นกว่าจังหวะใน client/src/board/emiyaFx.js — EMIYA_FX)
const BEAT = { throw: 0.6, shot: 0.7, blast: 0.9, smash: 0.75, excal: 1.4 };

const WEAPONS = {
  kb: {
    name: "Kanshou & Bakuya", cost: 2, style: "emiyaKB", repeat: 1, crit: KB_CRIT,
    desc: "ตีปกติ 1 ครั้งฟัน 2 ฮิตใส่เป้าเดิม · อัตราคริ +15%",
    skill: { key: "throw", name: "Throwing Blade", cost: 3, area: { kind: "target", range: 4, hostile: true },
      desc: `1 คนในระยะ 4: ความเสียหาย ${THROW_DMG} (ลดเกราะก่อน · หลบได้) + เลือดไหล ${THROW_BLEED}` },
  },
  hrunting: {
    name: "Hrunting & Caladbolg II", cost: 3, style: "emiyaBow", range: [1, 4], mov: -1,
    desc: "ระยะตี 1–4 · ระยะเดิน −1",
    skill: { key: "caladbolg", name: "Caladbolg II", cost: null, area: { kind: "line", len: 8, width: 1, hostile: true },
      desc: `เลือกทิศ: แนว 8×1 หยุดที่ศัตรูคนแรก · ใช้แต้มครึ่งหนึ่งของความจุ · ทุก 2 แต้ม ความเสียหาย +1 (เริ่ม 1 · หลบได้) · ระเบิด ${CAL_SPLASH} ใส่ศัตรูทุกคนในระยะ ${CAL_RADIUS} รอบคนแรก` },
  },
  rule: {
    name: "Rule Breaker", cost: 4, style: "emiyaRule",
    desc: `ตีโดน: ห้ามใช้สกิลจนจบตาเดินถัดไปของเป้า + ผนึกพลังงาน ${RULE_SEAL} เทิร์น (ต้านได้)`,
    skill: { key: "rho", name: "Rho Aias", cost: 5, area: { kind: "self" },
      desc: `ตัวเอง: คุ้มครอง −${RHO_GUARD} + ต้านสถานะผิดปกติ ${RHO_TURNS} เทิร์น` },
  },
  nine: {
    name: "Nine Lives Blade Works", cost: 5, style: "emiyaNine", atk: 1, range: [1, 2], rect: [2, 3],
    desc: "พลังโจมตี +1 · ตีเป้าในระยะ 2 โดนศัตรูทุกคนในกรอบ 2×3 ทางทิศนั้น",
    skill: { key: "smash", name: "Ground Smash", cost: 6, area: { kind: "line", len: 4, width: 3, hostile: true },
      desc: `เลือกทิศ: แนว 4×3 ความเสียหาย ${SMASH_DMG} (ลดเกราะก่อน · หลบได้) · ผลักศัตรู ${SMASH_PUSH} ช่อง ชนกำแพง/สิ่งของ/คน = สตั้น` },
  },
  excalibur: {
    name: "Excalibur", cost: 6, style: "emiyaExcal", atk: 1, range: [1, 3], lane: true, turns: EXCAL_TURNS, strikes: EXCAL_STRIKES,
    desc: `เฉพาะตอน Unlimited Blade Works · 1 ครั้งต่อเกม: พลังโจมตี +1 · ตีแนว 3×1 โดนทุกคนในแนว · ตีโดนติดเปราะบาง +${EXCAL_FRAGILE} ${EXCAL_FRAGILE_TURNS} เทิร์น · อยู่ ${EXCAL_TURNS} เทิร์น หายเมื่อตีครบ ${EXCAL_STRIKES} ครั้งหรือใช้สกิลรอง · เปลี่ยนอาวุธไม่ได้`,
    skill: { key: "excalibur", name: "Ex calibruuuu!", cost: 8, area: { kind: "line", len: 5, width: 3, hostile: true },
      desc: `เลือกทิศ: แนว 5×3 ความเสียหาย ${EXCAL_DMG} · หลบไม่ได้ · คุ้มครองไม่มีผล · ใช้แล้ว Excalibur หาย` },
  },
};
const WEAPON_KEYS = Object.keys(WEAPONS);
const LINE = Board.LINE_DIRS;

const isEmiya = (p) => !!p && p.characterId === ID && !p.summon;
// ฮุคที่ไม่ได้รับ engine อ่านเลขเทิร์นจาก engine กลาง (require ตอนเรียก — กันวน)
function eng() { return require("../server/engine").engine; }
function fresh() {
  return {
    weapon: null, uses: 0, weaponEnd: 0, weaponAt: 0, // อาวุธที่ถือ · ครั้งที่ใช้ไป · หายหลังจบเทิร์น weaponEnd · ลำดับตอนได้มา (severables)
    traceReady: 0, wsReady: 0, ultReady: 0,
    capBonus: 0,                                       // ความจุแต้มสกิลที่เพิ่ม (0..16)
    hurtRound: 0, avalonReady: 0,                      // Avalon: เทิร์นล่าสุดที่เสียหาย · ติดได้อีกตั้งแต่เทิร์นนี้
    excalUsed: false,
    ubwEnd: 0, ubwAt: 0,                               // UBW กางอยู่ถึงเทิร์น ubwEnd (รวม)
  };
}
function st(p) { return p.emiya || (p.emiya = fresh()); }
const cdLeft = (ready, round) => Math.max(0, (ready || 0) - round);
const weaponOf = (p) => (isEmiya(p) && st(p).weapon ? WEAPONS[st(p).weapon] : null);
function ubwOn(p, round = eng().roundNumber) {
  if (!isEmiya(p) || !p.alive) return false;
  const s = st(p);
  return s.ubwEnd > 0 && round <= s.ubwEnd;
}
const traceCd = (p, r) => (ubwOn(p, r) ? 0 : cdLeft(st(p).traceReady, r));
function fx(engine, p, kind, extra) {
  engine.boardFx(FX, { kind, id: p.id, color: engine.colorOf(p), ...(p.pos ? { at: { ...p.pos } } : {}), size: engine.sizeOf(p), ...extra });
}
const vit = (t) => (t.hp || 0) + (t.armor || 0);
const guardOf = (engine, t) => ((t.statuses && t.statuses.guard) || 0) > 0 ? (engine.statusAmtOf(t, "guard") || 1) : 0;
const enemiesOf = (engine, p, ids) => (ids || []).map((id) => engine.players[id])
  .filter((t) => t && t.alive && t.pos && t.id !== p.id && !engine.sameTeam(p, t));
// ราคา Caladbolg II = ครึ่งหนึ่งของความจุแต้มสกิล
const caladbolgCost = (engine, p) => Math.floor(engine.maxSkillOf(p) / 2);
const caladbolgDmg = (cost) => 1 + Math.floor(cost / 2);
// ดาเมจจากสกิล: หลบได้ (เว้น sure) · คุ้มครองลด (เว้น sure) · เปราะบางเพิ่ม · เกราะก่อน · ตายได้ → { dodge, dealt }
function hurt(engine, p, t, n, reason, { sure = false } = {}) {
  t.wasAttacked = true;
  if (!sure && engine.skillDodge(p, t, reason)) return { dodge: true, dealt: 0 };
  const dmg = Math.max(0, n - (sure ? 0 : guardOf(engine, t))) + engine.statusAmtOf(t, "fragile");
  const before = vit(t);
  engine.dealMixed(t, dmg);
  if (t.alive && t.hp <= 0) engine.instantDeath(t);
  const dealt = Math.max(0, before - vit(t));
  engine.log(`⚔️ ${p.name} ${reason} → ${t.name} -${dealt} (ลดเกราะก่อน)`);
  if (!t.alive) { t.pos = null; engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`); }
  return { dodge: false, dealt };
}
// สถานะที่ต้องคลุม "ตาเดินถัดไป" ของเป้า (สถานะลดทีละเทิร์น): เป้าเดินไปแล้วเทิร์นนี้ = +1 เทิร์น
const nextTurnSpan = (engine, t, n = 1) => n + (engine.hasActed(t.id) ? 1 : 0);

// ---------- อาวุธ ----------
function equip(engine, p, key) {
  const s = st(p), r = engine.roundNumber, w = WEAPONS[key];
  const prev = s.weapon;
  s.weapon = key;
  s.uses = 0;
  s.weaponEnd = r + (w.turns || WEAPON_TURNS) - 1;
  s.weaponAt = engine.severStamp();
  if (key === "excalibur") s.excalUsed = true;
  if (!ubwOn(p, r)) s.traceReady = r + TRACE_CD;
  fx(engine, p, "trace", { weapon: key, prev });
  engine.sfx(key === "excalibur" ? "emiya_trace_excalibur" : "emiya_trace");
  engine.log(`🗡️ ${p.name} Trace On — ${w.name} (${w.turns || WEAPON_TURNS} เทิร์น)`);
}
function dropWeapon(engine, p, why) {
  const s = st(p);
  if (!s.weapon) return;
  const key = s.weapon, w = WEAPONS[key];
  s.weapon = null;
  s.uses = 0;
  if (p.alive && p.pos) fx(engine, p, "weaponBreak", { weapon: key, why });
  if (p.alive) engine.sfx("emiya_break");
  engine.log(`💨 ${w.name} ของ ${p.name} ${why === "expire" ? "หมดเวลา" : why === "sever" ? "ถูกตัด" : "ใช้ครบ"} — สลายไป`);
}
// ใช้อาวุธ 1 ครั้ง (kind: "strike" ตีปกติ / "skill" สกิลรอง) → ครบเงื่อนไข = หาย
function useWeapon(engine, p, kind) {
  const s = st(p), w = weaponOf(p);
  if (!w) return;
  s.uses += 1;
  const done = s.weapon === "excalibur" ? (kind === "skill" || s.uses >= EXCAL_STRIKES) : s.uses >= WEAPON_USES;
  if (done) dropWeapon(engine, p, "used");
}
function usesLeft(p) {
  const s = st(p);
  if (!s.weapon) return 0;
  return (s.weapon === "excalibur" ? EXCAL_STRIKES : WEAPON_USES) - s.uses;
}

// ---------- Avalon: ความจุแต้มสกิล ----------
function rollCapacity(engine, p) {
  const s = st(p);
  if (s.capBonus >= CAP_MAX || !(Math.random() < CAP_CHANCE)) return;
  s.capBonus = Math.min(CAP_MAX, s.capBonus + CAP_STEP);
  fx(engine, p, "capacity", { cap: engine.maxSkillOf(p) });
  engine.sfx("emiya_capacity");
  engine.log(`✨ ${p.name} Avalon Magecraft — ความจุแต้มสกิล +${CAP_STEP} (${engine.maxSkillOf(p)})`);
}

// ---------- สกิลรอง ----------
function throwingBlade(engine, p, t) {
  if (!t || !t.alive || !t.pos) return;
  fx(engine, p, "throw", { targetId: t.id, to: { ...t.pos }, tsize: engine.sizeOf(t) });
  engine.sfx("emiya_throw");
  engine.skillBeat(BEAT.throw, () => {
    if (!t.alive || !p.alive) return;
    const res = hurt(engine, p, t, THROW_DMG, "Throwing Blade");
    if (!res.dodge && t.alive) {
      const got = engine.applyBleed(t, THROW_BLEED);
      if (got > 0) engine.log(`🩸 ${t.name} เลือดไหล +${got}`);
    }
    fx(engine, p, "throwHit", { targetId: t.id, to: t.pos ? { ...t.pos } : null, dodge: res.dodge, dmg: res.dealt });
  });
}
// แนว 8×1 จากชิโร่ → ช่องทั้งแนว + ศัตรูคนแรก (ใกล้สุดตามแนว)
function caladbolgPlan(engine, p, dir, ids) {
  if (!p.pos || !LINE[dir]) return null;
  const [dx, dy] = LINE[dir], map = engine.boardMap();
  const tiles = [];
  for (let i = 1; i <= 8; i++) {
    const x = p.pos.x + dx * i, y = p.pos.y + dy * i;
    if (!Board.inBounds(map, x, y)) break;
    tiles.push({ x, y, i });
  }
  const step = (t) => {
    const n = engine.sizeOf(t);
    const hit = tiles.find((c) => Board.footprint(t.pos.x, t.pos.y, n).some((f) => f.x === c.x && f.y === c.y));
    return hit ? hit.i : Infinity;
  };
  const first = enemiesOf(engine, p, ids).sort((a, b) => step(a) - step(b))[0] || null;
  const end = first ? tiles.filter((c) => c.i <= step(first)) : tiles;
  return { dir, tiles: end.map((c) => ({ x: c.x, y: c.y })), first };
}
function caladbolg(engine, p, dir, ids, cost) {
  const plan = caladbolgPlan(engine, p, dir, ids);
  if (!plan) return;
  const dmg = caladbolgDmg(cost);
  engine.queueCutscene(p, CUT.calBefore);
  engine.queueCutscene(p, CUT.calAfter);
  engine.deferAfterCutscene(() => {
    if (!p.alive) return;
    const first = plan.first && plan.first.alive && plan.first.pos ? plan.first : null;
    const to = first ? { ...first.pos } : plan.tiles.length ? { ...plan.tiles[plan.tiles.length - 1] } : null;
    fx(engine, p, "caladbolg", { dir, tiles: plan.tiles, to, targetId: first ? first.id : null, tsize: first ? engine.sizeOf(first) : 1 });
    engine.sfx("emiya_caladbolg_shot");
    engine.skillBeat(BEAT.shot, () => {
      if (!p.alive) return;
      engine.hitArea(p, plan.tiles, first ? [first.id] : []);
      if (!first || !first.alive || !first.pos) { engine.log(`🏹 ${p.name} Caladbolg II — ไม่โดนใคร`); return; }
      const center = { x: first.pos.x, y: first.pos.y, size: engine.sizeOf(first) };
      const res = hurt(engine, p, first, dmg, "Caladbolg II");
      // ระเบิดรอบคนแรก (Broken Phantasm): ศัตรูทุกคนในระยะ 2 (ไม่โดนชิโร่/เพื่อน/คนแรก) — ระเบิดแม้คนแรกหลบ
      const near = Object.values(engine.players).filter((o) => o && o.alive && o.pos && o.id !== p.id && o.id !== first.id && !engine.sameTeam(p, o)
        && Board.dist(center, { x: o.pos.x, y: o.pos.y, size: engine.sizeOf(o) }) <= CAL_RADIUS);
      const blast = Board.tilesInRange ? Board.tilesInRange(engine.boardMap(), center.x, center.y, [0, CAL_RADIUS], center.size) : [];
      fx(engine, p, "caladbolgBlast", { at: { x: center.x, y: center.y }, tsize: center.size, radius: CAL_RADIUS, tiles: blast,
        hits: [{ id: first.id, dmg: res.dealt, dodge: res.dodge }] });
      engine.sfx("emiya_caladbolg_blast");
      const splash = [];
      for (const o of near) {
        const r2 = hurt(engine, p, o, CAL_SPLASH, "Caladbolg II — ระเบิด", { sure: true });
        splash.push({ id: o.id, dmg: r2.dealt });
      }
      if (splash.length) fx(engine, p, "caladbolgSplash", { hits: splash });
      engine.hitArea(p, blast, near.map((o) => o.id));
      engine.skillBeat(BEAT.blast, () => {});
    });
  });
}
function groundSmash(engine, p, dir, ids, tiles) {
  fx(engine, p, "smash", { dir, tiles });
  engine.sfx("emiya_smash");
  engine.skillBeat(BEAT.smash, () => {
    if (!p.alive) return;
    const v = { x: LINE[dir][0], y: LINE[dir][1] };
    const targets = enemiesOf(engine, p, ids);
    const landed = [];
    for (const t of targets) {
      const res = hurt(engine, p, t, SMASH_DMG, "Ground Smash");
      if (!res.dodge && t.alive && t.pos) landed.push(t);
    }
    // ผลักไกลสุดก่อน (คนหน้าไม่ชนคนหลังที่กำลังจะถูกผลักไปด้วย)
    const along = (t) => (t.pos.x - p.pos.x) * v.x + (t.pos.y - p.pos.y) * v.y;
    landed.sort((a, b) => along(b) - along(a));
    const ctx = engine.ice.begin();
    const stunned = [];
    engine.withEffectSource(p, () => {
      for (const t of landed) {
        if (!t.alive || !t.pos) continue;
        const mark = ctx.events.length;
        engine.ice.pushUnit(t, v, ctx, SMASH_PUSH);
        const hit = ctx.events.slice(mark).some((e) => e.kind === "knock" && e.id === t.id && e.collide);
        if (hit && t.alive && engine.applyDebuff(t, "stun", null, nextTurnSpan(engine, t))) {
          stunned.push(t.id);
          engine.log(`💫 ${t.name} ถูกกระแทกชน — สตั้น`);
        }
      }
    });
    engine.ice.flush(ctx);
    if (stunned.length) { fx(engine, p, "stun", { ids: stunned }); engine.sfx("emiya_stun"); }
    const hold = engine.ice.fxSeconds(ctx);
    if (hold > 0) engine.skillBeat(hold, () => {});
  });
}
function rhoAias(engine, p) {
  engine.applyBuff(p, "guard", RHO_GUARD, RHO_TURNS);
  engine.applyBuff(p, "resist", null, RHO_TURNS);
  fx(engine, p, "rho", {});
  engine.sfx("emiya_rho");
  engine.log(`🌸 ${p.name} Rho Aias — คุ้มครอง −${RHO_GUARD} + ต้านสถานะผิดปกติ ${RHO_TURNS} เทิร์น`);
}
function excalibur(engine, p, dir, ids, tiles) {
  fx(engine, p, "excalibur", { dir, tiles });
  engine.sfx("emiya_excalibur");
  engine.skillBeat(BEAT.excal, () => {
    if (!p.alive) return;
    const hits = [];
    for (const t of enemiesOf(engine, p, ids)) {
      const res = hurt(engine, p, t, EXCAL_DMG, "Ex calibruuuu!", { sure: true });
      hits.push({ id: t.id, dmg: res.dealt });
    }
    fx(engine, p, "excaliburHit", { hits });
  });
}

// ---------- Unlimited Blade Works ----------
function castUbw(engine, p) {
  const s = st(p), r = engine.roundNumber;
  s.ubwEnd = r + ULT_TURNS - 1;
  s.ubwAt = engine.severStamp();
  s.ultReady = r + ULT_CD;
  p.statuses[UBW] = ULT_TURNS;
  engine.queueCutscene(p, CUT.ubw);
  engine.deferAfterCutscene(() => {
    if (!p.alive) return;
    fx(engine, p, "ubw", {});
    engine.sfx("emiya_ubw");
  });
  engine.log(`⚔️ ${p.name} Unlimited Blade Works — ดึงทุกคนเข้าสู่โลกแห่งดาบ ${ULT_TURNS} เทิร์น`);
}
function endUbw(engine, p, why) {
  const s = st(p);
  if (!s.ubwEnd) return;
  s.ubwEnd = 0;
  delete p.statuses[UBW];
  fx(engine, p, "ubwEnd", { why });
  engine.log(`🌅 Unlimited Blade Works ของ ${p.name} ${why === "sever" ? "ถูกตัด" : why === "death" ? "สลายไปพร้อมเจ้าของ" : "สิ้นสุดลง"}`);
}

module.exports = {
  id: ID,
  IMG, VIDEO, CUT, FX, WEAPONS, WEAPON_KEYS, BEAT,
  HP, ARMOR, BASE_SKILL, CAP_STEP, CAP_MAX, CAP_CHANCE, AVALON_AMT, AVALON_TURNS, AVALON_CD, TRACE_CD, WEAPON_TURNS, WEAPON_USES,
  EXCAL_TURNS, EXCAL_STRIKES, WS_CD, ULT_TURNS, ULT_CD, UBW, KB_CRIT, RULE_SEAL, THROW_DMG, THROW_BLEED, SMASH_DMG, SMASH_PUSH,
  RHO_GUARD, RHO_TURNS, EXCAL_DMG, CAL_SPLASH, CAL_RADIUS,
  isEmiya, ubwOn, weaponOf, caladbolgCost, caladbolgDmg, caladbolgPlan,

  resetCombat(p) {
    p.emiya = isEmiya(p) ? fresh() : null;
    // เครื่องมือ dev: ECHO_DEV_EMIYA_CAP=N = เริ่มแมตช์ด้วยความจุแต้มสกิลเพิ่ม N (ทดสอบ UBW ได้ทันทีคู่กับ ECHO_DEV_RICH)
    const dev = Number(process.env.ECHO_DEV_EMIYA_CAP);
    if (p.emiya && dev > 0) p.emiya.capBonus = Math.min(CAP_MAX, dev);
  },
  maxHp() { return HP; },
  maxArmor() { return ARMOR; },
  maxSkill(p) { return isEmiya(p) ? BASE_SKILL + st(p).capBonus : null; },
  // ไอเทมฟื้นแต้มสกิลใช้ไม่ได้ผล (สเปก "ใช้ item ฟื้นแต้มไม่ได้")
  blocksSkillGain(p, src) { return isEmiya(p) && src === "item"; },

  // ---------- เดิน / ตีปกติ ----------
  mov(p) {
    if (!isEmiya(p)) return null;
    const w = weaponOf(p);
    return Math.max(0, 4 + (ubwOn(p) ? 1 : 0) + ((w && w.mov) || 0));
  },
  range(p) { const w = weaponOf(p); return w && w.range ? w.range : null; },
  attackLane(p) { const w = weaponOf(p); return !!(w && w.lane); },
  strikeRect(p) { const w = weaponOf(p); return w && w.rect ? w.rect : null; },
  strikeRepeat(p) { const w = weaponOf(p); return (w && w.repeat) || 0; },
  critPct(p) { const w = weaponOf(p); return (w && w.crit) || 0; },
  damageBonus(engine, attacker) { const w = weaponOf(attacker); return (w && w.atk) || 0; },
  attackFxNames(attacker) {
    const w = weaponOf(attacker);
    return w && w.atk ? [`${w.name} +${w.atk}`] : [];
  },
  attackStyle(p) { const w = weaponOf(p); return w ? w.style : null; },
  attackSound(p) { return weaponOf(p) ? `emiya_atk_${st(p).weapon}` : undefined; },
  onStrikeLanded(engine, attacker, target) {
    const w = weaponOf(attacker);
    if (!w || !target || !target.alive || engine.sameTeam(attacker, target)) return [];
    const out = [];
    const key = st(attacker).weapon;
    if (key === "rule") {
      const ns = engine.applyDebuff(target, "noskill", null, nextTurnSpan(engine, target));
      const ms = engine.applyDebuff(target, "manaSeal", null, RULE_SEAL);
      if (ns) out.push("ห้ามใช้สกิล");
      if (ms) out.push(`ผนึกพลังงาน ${RULE_SEAL}`);
      if (ns || ms) fx(engine, attacker, "ruleHit", { targetId: target.id, to: target.pos ? { ...target.pos } : null });
    } else if (key === "excalibur") {
      if (engine.applyDebuff(target, "fragile", EXCAL_FRAGILE, EXCAL_FRAGILE_TURNS)) out.push(`เปราะบาง +${EXCAL_FRAGILE}`);
    }
    return out;
  },
  // ตีจบ: ถืออาวุธอยู่ = แต้มสกิล +1 · นับการใช้อาวุธ
  afterStrike(engine, p) {
    if (!isEmiya(p) || !weaponOf(p)) return;
    const before = p.skillPoints || 0;
    engine.addSkill(p, 1, "emiya");
    if ((p.skillPoints || 0) > before) engine.log(`✨ ${p.name} Avalon Magecraft — แต้มสกิล +1`);
    useWeapon(engine, p, "strike");
  },

  // ---------- สกิล ----------
  skillCost(p, tier, base, opts = {}) {
    if (!isEmiya(p)) return base;
    if (tier === "basic") { const w = WEAPONS[opts.form]; return w ? w.cost : base; }
    if (tier === "secondary") {
      const w = weaponOf(p);
      if (!w) return base;
      return w.skill.cost == null ? caladbolgCost(eng(), p) : w.skill.cost;
    }
    return base;
  },
  skillArea(p, tier, area) {
    if (!isEmiya(p) || tier !== "secondary") return area;
    const w = weaponOf(p);
    return w ? w.skill.area : area;
  },
  skillPub(p, tier) {
    if (!isEmiya(p)) return null;
    const engine = eng(), s = st(p), r = engine.roundNumber;
    if (tier === "basic") {
      const cd = traceCd(p, r);
      const lockedAll = s.weapon === "excalibur";
      return {
        choices: WEAPON_KEYS.map((k) => {
          const w = WEAPONS[k];
          const excalNo = k === "excalibur" && (!ubwOn(p, r) || s.excalUsed);
          return {
            key: k, name: w.name, img: IMG.w(k), cost: w.cost, area: { kind: "self" }, cd, on: s.weapon === k,
            desc: `${w.name} (${w.cost} แต้ม): ${w.desc}${k === "excalibur" ? "" : ` · อยู่ ${WEAPON_TURNS} เทิร์น · ตีปกติ+สกิลรองรวม ${WEAPON_USES} ครั้งหาย`} · สกิลรอง ${w.skill.name}`,
            locked: cd > 0 || lockedAll || excalNo, free: true,
          };
        }),
      };
    }
    if (tier === "secondary") {
      const w = weaponOf(p);
      if (!w) return null;
      return { name: w.skill.name, img: IMG.s(w.skill.key), desc: w.skill.desc };
    }
    return null;
  },
  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isEmiya(p)) return true;
    const s = st(p), r = engine.roundNumber;
    if (!p.pos) return false;
    if (tier === "basic") {
      const w = WEAPONS[opts.form];
      if (!w || traceCd(p, r) > 0 || s.weapon === "excalibur") return false;
      if (opts.form === "excalibur") return ubwOn(p, r) && !s.excalUsed;
      return true;
    }
    if (tier === "secondary") {
      const w = weaponOf(p);
      if (!w || cdLeft(s.wsReady, r) > 0) return false;
      if (w.skill.key === "throw") {
        const t = engine.players[(targets || [])[0]];
        return !!t && t.id !== p.id && t.alive && !engine.sameTeam(p, t);
      }
      if (w.skill.area.kind === "line") return !!LINE[opts.dir];
      return true;
    }
    if (tier === "ultimate") return !ubwOn(p, r) && cdLeft(s.ultReady, r) === 0;
    return false;
  },
  // Trace On: ไม่กินโควตาสกิล · ใช้แล้วยังเดินได้ (สกิลรอง/ท่าไม้ตายใช้กติกาปกติ)
  skipsTurnQuota(p, tier) { return isEmiya(p) && tier === "basic"; },
  ignoresTurnQuota(p, tier) { return isEmiya(p) && tier === "basic"; },
  keepsMove(engine, p, tier) { return isEmiya(p) && tier === "basic"; },
  // Caladbolg II: แนว 8×1 โดนจริงแค่คนแรก + รอบตัว — ลงผลพื้นที่เองตอนลูกธนูถึง (hitArea)
  ownsAreaHit(p, tier) { return isEmiya(p) && tier === "secondary" && st(p).weapon === "hrunting"; },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isEmiya(p)) return "";
    const s = st(p), r = engine.roundNumber;
    let out = "";
    if (tier === "basic") {
      equip(engine, p, opts.form);
      out = ` — ${WEAPONS[opts.form].name}`;
    } else if (tier === "secondary") {
      const w = weaponOf(p), key = w.skill.key;
      s.wsReady = r + WS_CD;
      const cost = key === "caladbolg" ? caladbolgCost(engine, p) : w.skill.cost;
      const tiles = w.skill.area.kind === "line" ? engine.areaTiles(p, w.skill.area, opts.dir) : [];
      if (key === "throw") throwingBlade(engine, p, engine.players[targets[0]]);
      else if (key === "caladbolg") caladbolg(engine, p, opts.dir, [...(targets || [])], cost);
      else if (key === "smash") groundSmash(engine, p, opts.dir, [...(targets || [])], tiles);
      else if (key === "rho") rhoAias(engine, p);
      else if (key === "excalibur") excalibur(engine, p, opts.dir, [...(targets || [])], tiles);
      useWeapon(engine, p, "skill");
      out = ` — ${w.skill.name}`;
    } else if (tier === "ultimate") {
      castUbw(engine, p);
    }
    rollCapacity(engine, p);
    return out;
  },

  // ---------- จังหวะเทิร์น ----------
  onDamageTaken(engine, p) { if (isEmiya(p)) st(p).hurtRound = engine.roundNumber; },
  // UBW: ต้นเทิร์นแต้มสกิล +1
  onRoundStartTick(engine, p) {
    if (!ubwOn(p)) return;
    const before = p.skillPoints || 0;
    engine.addSkill(p, 1, "emiya");
    const got = (p.skillPoints || 0) - before;
    if (got > 0) engine.log(`⚔️ ${p.name} Unlimited Blade Works — แต้มสกิล +${got}`);
  },
  // จบเทิร์น: Avalon (ไม่เสียหายทั้งเทิร์น) · UBW ลดคูลดาวน์สกิลรองเพิ่ม / หมดเวลา · อาวุธหมดเวลา
  onEndTurn(engine) {
    const r = engine.roundNumber;
    for (const p of Object.values(engine.players)) {
      if (!isEmiya(p) || !p.alive) continue;
      const s = st(p);
      if (s.hurtRound !== r && r >= s.avalonReady) {
        engine.applyMend(p, AVALON_AMT, AVALON_TURNS);
        s.avalonReady = r + AVALON_CD;
        if (p.pos) fx(engine, p, "avalon", {});
        engine.sfx("emiya_avalon");
        engine.log(`🛡️ ${p.name} Avalon Magecraft — ไม่ได้รับความเสียหายทั้งเทิร์น: เยียวยา ${AVALON_AMT} × ${AVALON_TURNS} เทิร์น`);
      }
      if (s.ubwEnd && r <= s.ubwEnd) {
        if (s.wsReady > r + 1) s.wsReady -= 1;
        if (r >= s.ubwEnd) endUbw(engine, p, "expire");
      }
      if (s.weapon && r >= s.weaponEnd) dropWeapon(engine, p, "expire");
    }
  },
  onDeath(engine, p) {
    if (!isEmiya(p)) return;
    endUbw(engine, p, "death");
    const s = st(p);
    s.weapon = null;
    s.uses = 0;
  },

  // ---------- ผลสกิลที่ตัดได้ (server/sever.js — รากฐานจิตของเรียวกิ) ----------
  //  อาวุธที่ถือ → หายทันที · UBW → จบทันที คูลดาวน์ 6 นับจากเทิร์นถัดไป
  severables(engine, p) {
    if (!isEmiya(p) || !p.alive) return [];
    const s = st(p), out = [];
    if (s.weapon) out.push({ key: "weapon", label: WEAPONS[s.weapon].name, at: s.weaponAt, cancel: () => dropWeapon(engine, p, "sever") });
    if (ubwOn(p)) {
      out.push({
        key: "ubw", label: "Unlimited Blade Works", at: s.ubwAt,
        cancel: () => {
          endUbw(engine, p, "sever");
          s.ultReady = Math.min(s.ultReady, engine.roundNumber + 1 + (ULT_CD - ULT_TURNS));
        },
      });
    }
    return out;
  },

  // ---------- ข้อมูลให้ client (สัญญา .claude/plans/emiya-contract.md) ----------
  emiyaState(engine, p) {
    if (!isEmiya(p)) return undefined;
    const s = st(p), r = engine.roundNumber;
    return {
      weapon: s.weapon, weaponTurns: s.weapon ? Math.max(0, s.weaponEnd - r + 1) : 0, usesLeft: usesLeft(p),
      traceCd: traceCd(p, r), wsCd: cdLeft(s.wsReady, r), ultCd: ubwOn(p, r) ? 0 : cdLeft(s.ultReady, r),
      ubw: ubwOn(p, r) ? s.ubwEnd - r + 1 : 0, cap: s.capBonus, avalonCd: cdLeft(s.avalonReady, r + 1), excalUsed: s.excalUsed,
    };
  },
  skillLocks(engine, p) {
    if (!isEmiya(p)) return undefined;
    const s = st(p), r = engine.roundNumber;
    return {
      basic: { cd: traceCd(p, r), locked: s.weapon === "excalibur", free: true },
      secondary: { cd: s.weapon ? cdLeft(s.wsReady, r) : 0, locked: !s.weapon },
      ultimate: { cd: ubwOn(p, r) ? 0 : cdLeft(s.ultReady, r), locked: ubwOn(p, r) },
    };
  },
};
