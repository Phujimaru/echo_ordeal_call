// ============================================================
//  สนาม Eos — มอนเตอร์: ชื่อ/สี/ค่าสถานะ · เกิด (spawnMob · ปีศาจกลางคืน) · คุณสมบัติพิเศษ · เพดานมอน/เหตุการณ์ใหญ่ · สถานะคุมตัว
//  แยกออกจาก server/fodlan/stage6.js (ย้ายโค้ดล้วน · พฤติกรรมเดิม) · ฮุคทั้งหมดยังส่งออกผ่าน stage6.js
// ============================================================
const E = require("./eosEvents");
const XT = require("./eosExtra");
const SKY = require("./eosSky");
const ELT = require("./eosElite");
const MBS = require("./eosMobs");
const LM = require("./eosLament");
const { DAEMON_COUNT, DAEMON_REFILL, DAEMON_HP, DAEMON_ARMOR, DAEMON_ATK, DAEMON_MOV, DAEMON_GOLD, DAEMON_SPAWN_GAP, MOB_SIDE, MOB_OWNER, mobsOf,
  heroes, lazySummon, footOf, magnetOn, tileFree, manhattan } = require("./eosCore");
const DM = require("./eosDome");
const HH = require("./eosH");
const JR = require("./eosJourney");
const MAI = require("./eosMobAI");
const MT = require("./eosMobTurn");
const PR = require("./eosProps");

const MOB_NAMES = { daemon: "ปีศาจ", beast: "สัตว์ยักษ์", magitek: "ทหารเหล็ก", nest: "รังปีศาจ", giant: "ยักษ์หิน", gold: "โชโกโบะทอง", lament: "ผู้คร่ำครวญ" };
const MOB_COLORS = { daemon: "#8a2f9c", beast: "#7a5230", magitek: "#59636f", nest: "#5a1a4a", giant: "#7d7568", gold: "#f2c21b", lament: "#2a1838" };
const daemonImg = (k) => `/eos/img/daemon${((Number(k) || 1) - 1) % 8 + 1}.webp`;
// ค่าพลังตามคืน/วัน (n = 1, 2, 3 …) — Claude ตั้งตัวเลข
function daemonStats(n) {
  const k = Math.max(0, (n | 0) - 1);
  return { hp: DAEMON_HP + 2 * k, armor: DAEMON_ARMOR + Math.floor(k / 2), atk: Math.min(5, DAEMON_ATK + Math.floor(k / 2)), mov: Math.min(6, DAEMON_MOV + Math.floor(k / 3)), gold: DAEMON_GOLD + Math.floor(k / 2) };
}
const daemonCount = (n) => Math.min(18, DAEMON_COUNT + 2 * Math.max(0, (n | 0) - 1));
const daemonRefill = (n) => DAEMON_REFILL + Math.floor(Math.max(0, (n | 0) - 1) / 2);
function magitekStats(n) {
  const k = Math.max(0, (n | 0) - 1);
  return { hp: PR.MAGITEK.hp + k, armor: PR.MAGITEK.armor + Math.floor(k / 2), atk: Math.min(4, PR.MAGITEK.atk + Math.floor(k / 2)), mov: PR.MAGITEK.mov, gold: PR.MAGITEK.gold + Math.floor(k / 2) };
}
function spawnMob(ctx, s, type, at, stats, extra = {}) {
  const look = extra.look || null;
  const elite = ELT.roll(ctx, s, HH.H(), type, extra);
  if (elite) stats = ELT.stats(stats, elite);
  { const cap = type === "lament" || extra.trait === "boss" ? MT.FAIR.bossHit : MT.FAIR.hit; if ((stats.atk | 0) > cap) stats = { ...stats, atk: cap }; } // เพดานพลังโจมตี (ความแฟร์ — ผู้ใช้ 2026-11-14)
  const baseName = (extra.trait && (MBS.nameOf(type, extra.trait) || TRAIT_NAMES[extra.trait])) || (MOB_NAMES[type] + (extra.tier > 1 ? ` ${"I".repeat(Math.min(3, extra.tier))}` : ""));
  const rec = lazySummon().spawn(MOB_OWNER, {
    kind: "eosMob", pos: { x: at.x, y: at.y }, hp: stats.hp, armor: stats.armor + (type !== "lament" && LM.curse(s, "plate") ? 1 : 0), mov: stats.mov, range: [1, 1],
    name: elite ? ELT.nameOf(baseName) : baseName,
    img: type === "lament" ? "/eos/img/lament.webp" : type === "daemon" ? daemonImg(look) : type === "magitek" ? (extra.trait === "mech" ? "/eos/img/magitek_ex.webp" : "/eos/img/magitek.webp") : null,
    color: MOB_COLORS[type],
    data: { side: MOB_SIDE, eos: s.visit, mobType: type, atk: stats.atk, gold: stats.gold, look, tier: extra.tier || 1, trait: extra.trait || null, roarAt: ctx.match.roundNumber + 1, ship: extra.ship || null, home: extra.home || null, aggro: null, aggroUntil: 0, mark: stats.hp + stats.armor, born: ctx.match.roundNumber + 1, elite: elite || null },
  });
  if (rec && elite && rec.pos) {
    ctx.fx("elite_spawn", { id: rec.id, x: rec.pos.x, y: rec.pos.y, affixes: elite });
    ctx.log(`👑 ${rec.name}ปรากฏ! (${elite.map((a) => ELT.AFFIX_NAMES[a]).join(" · ")})`);
  }
  return rec;
}
const mobType = (m) => (m && m.summon ? m.summon.mobType : null);
// มอนพิเศษมีนิสัย (ผู้ใช้เลือก 2026-11-10): ระเบิด · หมอ · ยิงไกล · บอส (ราชาปีศาจ — eosEvents)
const TRAIT_NAMES = { bomber: "ปีศาจระเบิด", healer: "ปีศาจหมอ", sniper: "ทหารเหล็กยิงไกล", boss: "ราชาปีศาจ", mech: "หุ่นเกราะจักรวรรดิ" };
const TRAIT = { bombDmg: 3, healAmt: 2, healReach: 2, sniperRange: 3, sniperDmg: 2, healerMax: 2 };
function pickTrait(ctx, s) {
  return MBS.pickDaemon(ctx, s, HH.H()); // ระเบิด/หมอ + 8 แบบใหม่ (eosMobs — โอกาสตามความยาก)
}
function pickTraitOld(ctx, s) {
  if ((s.nightNo || 0) < 2) return null;
  const r = ctx.rng();
  if (r < 0.18) return "bomber";
  if (r < 0.3 && mobsOf(ctx, "daemon").filter((m) => m.summon.trait === "healer").length < TRAIT.healerMax) return "healer";
  return null;
}
function traitStats(st, trait) {
  const nx = MBS.stats(st, trait);
  if (nx) return nx;
  if (trait === "bomber") return { ...st, hp: Math.max(1, Math.round(st.hp * 0.7)), armor: 0, atk: TRAIT.bombDmg };
  if (trait === "healer") return { ...st, atk: 0, mov: Math.max(3, st.mov - 1) };
  if (trait === "sniper") return { ...st, hp: Math.max(1, st.hp - 1), atk: TRAIT.sniperDmg };
  if (trait === "mech") return { ...st, hp: st.hp * 2 + 2, armor: st.armor + 2, atk: st.atk + 1, mov: Math.max(2, st.mov - 1), gold: st.gold * 3 + 2 }; // หุ่นเกราะ: ถึก ตีแรง เดินช้า เหรียญเยอะ
  return st;
}
// ความเสียหายจากด่านที่มีต้นเหตุ (by = ผู้เล่น — ฆ่าได้ = เครดิต/ของรางวัล · พวกเดียวกันไม่โดน)
function hurt(ctx, u, n, by = null) {
  if (!u || !u.alive) return 0;
  if (by && u.id !== by.id && ctx.combat.sameTeam && ctx.combat.sameTeam(by, u)) return 0;
  return by ? ctx.combat.withEffectSource(by, () => ctx.damage(u, n)) : ctx.damage(u, n);
}
// กระจายทั่วแผนที่: แบ่งกระดานเป็นช่องตาราง 8×8 → สุ่มช่องละไม่เกิน 1 ตัวก่อน (ตารางที่ยังไม่มีปีศาจก่อน) แล้วค่อยซ้ำ
function spawnDaemons(ctx, s, n = nightTarget(ctx, s)) {
  const map = ctx.map(), units = heroes(ctx);
  const cell = (t) => `${Math.floor(t.x / 8)},${Math.floor(t.y / 8)}`;
  const buckets = new Map();
  for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) {
    if (DM.blockedTown(s, x, y) || !tileFree(ctx, s, x, y) || JR.onRail(x, y) || XT.lightSafe(HH.H(), x, y)) continue;
    if (units.some((p) => footOf(ctx, p).some((t) => manhattan(t, { x, y }) < DAEMON_SPAWN_GAP))) continue;
    const k = cell({ x, y });
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push({ x, y });
  }
  const taken = new Set(mobsOf(ctx, "daemon").map((d) => cell(d.pos)));
  const keys = ctx.pick([...buckets.keys()], buckets.size);
  keys.sort((a, b) => (taken.has(a) ? 1 : 0) - (taken.has(b) ? 1 : 0));
  const picked = [];
  // เสาที่ยึดไว้แต่ไม่มีคนเฝ้า = ปีศาจโผล่ใกล้ๆ เสาละ 2 ตัว (ผู้ใช้แจ้ง 2026-11-11 — ผู้บัญชาการฝูงมอน)
  for (const pl of MAI.openPillars(ctx, s).filter((o) => !DM.blockedTown(s, o.x, o.y))) {
    const near = [...buckets.values()].flat().filter((t) => { const d = manhattan(t, pl); return d >= 3 && d <= 7; });
    for (const t of ctx.pick(near, near.length)) {
      if (picked.length >= n || picked.filter((o) => manhattan(o, pl) <= 7).length >= 2) break;
      if (!picked.some((o) => manhattan(o, t) < 2)) picked.push(t);
    }
  }
  for (let round = 0; picked.length < n && round < 4; round++) {
    for (const k of keys) {
      if (picked.length >= n) break;
      const free = buckets.get(k).filter((t) => !picked.some((o) => manhattan(o, t) < 2));
      const t = ctx.pick(free, 1)[0];
      if (t) picked.push(t);
    }
  }
  const tier = Math.max(1, s.nightNo || 1), stats = E.scaleStats(ctx, daemonStats(tier));
  const had = mobsOf(ctx, "daemon").length;
  picked.splice(mobRoom(ctx)); // เพดานมอน
  for (const t of picked) { const trait = pickTrait(ctx, s), st2 = traitStats(stats, trait), ex = { look: 1 + (++s.seq % 8), tier, trait }; const rec = spawnMob(ctx, s, "daemon", t, st2, ex); if (rec) MBS.afterSpawn(ctx, s, HH.H(), rec, st2, ex); }
  if (picked.length) {
    ctx.bump();
    ctx.fx("daemon_spawn", { list: picked.map((t) => ({ x: t.x, y: t.y })), tier });
    ctx.log(had ? `👹 ปีศาจโผล่เพิ่มอีก ${picked.length} ตัว` : `👹 คืนที่ ${tier} — ปีศาจ ${picked.length} ตัวโผล่ขึ้นมา!`);
  }
  return picked.length;
}
// จำนวนปีศาจของคืนนี้ (คืนที่ · ความยาก · จำนวนผู้เล่น · พระจันทร์สีเลือด ×1.5)
function nightTarget(ctx, s) { return Math.min(30, E.scaleCount(ctx, daemonCount(s.nightNo || 1), E.ev(s).blood ? E.BLOOD.count : 1)); }
function dissolveDaemons(ctx, s) {
  let list = mobsOf(ctx, "daemon").filter((d) => d.summon.trait !== "boss"); // ราชาปีศาจอยู่ข้ามกลางวัน
  if (LM.on(ctx) && list.length) list = ctx.pick(list, Math.ceil(list.length * (1 - LM.LAMENT.dawnKeep))); // Lament: คืนไม่สิ้นสุด — อีกครึ่งเดินต่อกลางวัน
  if (!list.length) return 0;
  ctx.fx("daemon_dissolve", { list: list.map((d) => ({ x: d.pos.x, y: d.pos.y, kind: d.summon.look })) });
  ctx.log("☀️ ฟ้าสาง — ปีศาจสลายไปกับแสงอรุณ");
  for (const d of list) lazySummon().remove(d);
  ctx.bump();
  return 1;
}
// ไฟเมืองกันมอนไหม (ผู้ใช้แจ้ง 2026-11-11 "เสาเปิดตั้งนาน ไม่เข้าไปตี" — เดิมกันทหารเหล็กด้วย = เสาในเมืองไม่มีใครแตะ)
//  ปีศาจกลัวแสง เข้าเมืองที่ไฟเปิดไม่ได้ · ทหารเหล็ก/หุ่นเกราะ (เครื่องจักร) และราชาปีศาจบุกเข้าเมืองได้ — กำแพง โดม ป้อมปืน คือของรับมือ
const lightBound = (m) => mobType(m) === "daemon" && !(m.summon && m.summon.trait === "boss");
// เป้าที่ตีได้: ผู้เล่นบนกระดาน (ไม่บินลอยข้ามหัว · ปีศาจ/ทหารเหล็กเข้าเมืองที่ไฟเปิดไม่ได้)
//  ฮุค hiddenFromMobs(p) → true = มอนมองไม่เห็นเลย ไม่เล็ง/ไม่เดินไปหา (เฟิร์น: ซ่อนเร้นมานาบน Eos — ผู้ใช้สั่ง 2026-11-11) · ตีพื้นที่ยังโดน
function mobBlind(p) {
  const h = require("../../characters/index")[p.characterId];
  return !!(h && h.hiddenFromMobs && h.hiddenFromMobs(p));
}
function prey(ctx, s, m) {
  const town = lightBound(m); // ไฟเมืองกันเฉพาะปีศาจ (เครื่องจักร/ราชาปีศาจเข้าได้ — 2026-11-11)
  const dark = XT.fearsLight(m); // ปีศาจ (ไม่ใช่ราชา) ไม่เข้าวงไฟแคมป์
  const blind = magnetOn(ctx) && mobType(m) !== "beast";
  return heroes(ctx).filter((p) => !mobBlind(p) && !(blind && manhattan(p.pos, m.pos) > SKY.MAGNET.sight) && !ctx.action.walksThrough(p) && !(town && footOf(ctx, p).some((t) => DM.blockedTown(s, t.x, t.y))) && !(dark && footOf(ctx, p).some((t) => XT.lightSafe(HH.H(), t.x, t.y))) && !(ctx.combat.sameTeam && ctx.combat.sameTeam(m, p)) && MT.engageOk(s, m, p)); // รุมได้ไม่เกิน FAIR.engage ตัว
}
const pillarGoals = (s) => s.pillars.filter((pl) => pl.owner || pl.ch);
// สถานะคุมตัวของมอน (สตั้น/หลับ/ตรึง/เชื่องช้า) นับตามตาเดินของมอนเอง: endTurn ไม่ลด (phases/endTurn.js EOS_MOB_CONTROL)
//  ลดทีละ 1 หลังช่วงมอนของต้นเทิร์น (ท้าย preRound — หลังยักษ์หิน/โชโกโบะทองด้วย) → สตั้น 1 เทิร์น = มอนข้ามตาของมันจริง 1 ครั้ง
const MOB_CONTROL = ["stun", "sleep", "rooted", "slow"];
function tickMobControl(ctx) {
  for (const m of mobsOf(ctx)) {
    if (!m.statuses) continue;
    for (const k of MOB_CONTROL) {
      if (!(m.statuses[k] > 0)) continue;
      if (k === "sleep" && m.sleepFresh) { m.sleepFresh = false; continue; }
      m.statuses[k] -= 1;
      if (m.statuses[k] <= 0) { delete m.statuses[k]; if (m.statusAmt) delete m.statusAmt[k]; }
    }
  }
}
// ---------- จังหวะเหตุการณ์ใหญ่ (ผู้ใช้แจ้ง 2026-11-10 "หลายเหตุการณ์เกิดพร้อมกัน จนรับมือได้ยาก") ----------
//  เหตุการณ์ใหญ่ = ยักษ์หิน · ราชาปีศาจ (เตือน/อยู่) · ขบวนเสบียง · คราส · ฝนดาวตก · รถไฟขนเสบียง · คืนสุดท้าย
//  ทีละอย่าง + เว้นอย่างน้อย BIG_GAP เทิร์นหลังเริ่มอันก่อน — อันที่ถึงคิวแต่ติดอยู่ เลื่อนออกไปเอง
const BIG_GAP = 3;
// เพดานมอนบนแผนที่พร้อมกัน (ผู้ใช้แจ้ง 2026-11-10 "ช่วงสุดท้ายมอนเยอะจนไม่มีทางต่อกร") — ไม่นับรัง/ยักษ์หิน/โชโกโบะทอง/ราชาปีศาจ
const MOB_CAP = { base: 12, perHero: 4, max: 28 };
function mobRoom(ctx) {
  const heroesN = heroes(ctx).filter((p) => !p.summon).length || 1;
const C = LM.on(ctx) ? LM.LAMENT.cap : MOB_CAP; // Lament: เพดานมอนสูงขึ้น
  const mul = LM.on(ctx) ? 1 : (E.diffOf(ctx).cap || 1); // ความยาก: ง่าย ×0.8 · ปกติ ×1 · ยาก ×1.25
  const cap = Math.round(Math.min(C.max, C.base + C.perHero * (heroesN - 1)) * mul);
  const have = mobsOf(ctx).filter((m) => { const t = mobType(m); return t !== "nest" && t !== "giant" && t !== "gold" && t !== "lament" && m.summon.trait !== "boss"; }).length;
  return Math.max(0, cap - have);
}
function bigBusy(ctx, s) {
  const e = E.ev(s), x = s.x || {}, k = s.sky || {};
  const boss = !!e.bossWarn || mobsOf(ctx, "daemon").some((d) => d.summon.trait === "boss");
  return !!(x.giant || x.final || boss || e.convoy || k.eclipse || k.meteor || k.supply);
}
function bigFree(ctx, s, turn) { return !bigBusy(ctx, s) && turn - (s.bigLast ?? -99) >= BIG_GAP; }
function bigStart(s, turn) { s.bigLast = turn; }

// Object.assign (ไม่แทน module.exports) — ไฟล์ eos* อ้างกันเองแบบวนได้
Object.assign(module.exports, {
  MOB_NAMES, daemonStats, daemonCount, daemonRefill, magitekStats, spawnMob, mobType, TRAIT_NAMES, TRAIT, pickTrait, traitStats, hurt,
  spawnDaemons, nightTarget, dissolveDaemons, lightBound, prey, pillarGoals, MOB_CONTROL, tickMobControl, MOB_CAP, mobRoom, bigBusy, bigFree, bigStart,
});
