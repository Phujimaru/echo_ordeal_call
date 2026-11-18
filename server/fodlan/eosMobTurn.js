// ============================================================
//  สนาม Eos — ตาของมอน: เพดานดาเมจ · ลำดับฉาก (mobTimeline) · actMonsters · หมอ/ระเบิด · ของดรอป · มอนตาย
//  แยกออกจาก server/fodlan/stage6.js (ย้ายโค้ดล้วน · พฤติกรรมเดิม) · ฮุคทั้งหมดยังส่งออกผ่าน stage6.js
// ============================================================
const E = require("./eosEvents");
const PKS = require("./eosPerks");
const XT = require("./eosExtra");
const SKY = require("./eosSky");
const ELT = require("./eosElite");
const MBS = require("./eosMobs");
const LM = require("./eosLament");
const { MOB_SEQ, lazyShop, isMob, mobsOf, heroes, lazySummon, footOf, stormOn, fogOn, snowMov, sandOn, inDesert, tileFree, manhattan, townOf } = require("./eosCore");
const DM = require("./eosDome");
const HH = require("./eosH");
const JR = require("./eosJourney");
const MAI = require("./eosMobAI");
const PR = require("./eosProps");
const RD = require("./eosRide");
const SC = require("./eosScore");
const SPN = require("./eosSpawn");
const WL = require("./eosWalls");

// ---------- ความแฟร์ของช่วงมอน (ผู้ใช้สั่ง 2026-11-14 "ป้องกันไม่ให้ผู้เล่นโดนตีจาก 4 ทิศแล้วตายภายในเทิร์นเดียว · การโจมตีครั้งเดียวไม่ควรฆ่าได้ แม้ท้ายเกม Lament · ไม่เอากันตาย") ----------
//  ทุกความยาก · ตัวเลข Claude ตั้ง (ผู้เล่นทั่วไปเลือด+เกราะ ~10)
//  engage: ช่วงมอนหนึ่ง ผู้เล่นคนหนึ่งโดนมอนได้ไม่เกิน 2 ตัว — ตัวที่ 3 ขึ้นไปไม่เลือกคนนั้นเป็นเป้า (prey) ไปหาคนอื่น/เสาแทน
//  hit / bossHit: ดาเมจรวมที่มอนตัวหนึ่งทำใส่ผู้เล่นคนหนึ่งในช่วงมอนเดียว ไม่เกิน 4 (ราชาปีศาจ/ผู้คร่ำครวญ 5) — รวมความดุ/หัวหน้า/ผู้บัญชาการแล้ว
//  → มอนทั้งฝูงทำได้สูงสุด 5 + 4 = 9 ต่อเทิร์น: คนที่เลือด+เกราะเต็ม (10) ไม่ตายในเทิร์นเดียว
const FAIR = { engage: 2, hit: 4, bossHit: 5 };
// เพดานพลังโจมตีที่ตัวมอน (spawnMob · คลั่ง) = hit/bossHit เช่นกัน — ตัวเลขที่เห็นคือที่ตีจริง
const fairCap = (m) => (SPN.mobType(m) === "lament" || (m.summon && m.summon.trait === "boss") ? FAIR.bossHit : FAIR.hit);
// พลังโจมตีที่แสดงบนป้ายมอน (ผู้ใช้ 2026-11-14 "อยากรู้พลังโจมตี เกราะ พลังชีวิต") — ค่าที่ตีจริงต่อครั้ง (รวมความดุ · ไม่เกินเพดาน) · ยักษ์หินเหยียบ · ไม่ตี = 0
function mobAtkOf(ctx, m) {
  const sm = m.summon || {}, type = SPN.mobType(m);
  if (type === "giant") return XT.GIANT ? XT.GIANT.dmg : 3;
  if (type === "nest" || type === "gold" || sm.trait === "healer") return 0;
  return Math.max(0, Math.min(fairCap(m), (sm.atk | 0) + (type === "beast" ? 0 : LM.rage(ctx).atk)));
}
// ไม่ติดกติกากันรุม: ฮุคตัวละคร noMobFair(p) (Master บอส — ผู้ใช้ 2026-11-16 "มาติดตัวแต่ไม่ตี") = มอนทุกตัวที่ติดตัวตีได้ ดาเมจไม่มีเพดาน
function noFair(p) {
  const h = p && require("../../characters/index")[p.characterId];
  return !!(h && typeof h.noMobFair === "function" && h.noMobFair(p));
}
function engageOk(s, m, p) {
  if (noFair(p)) return true;
  const by = s.fight && s.fight.by[p.id];
  return !by || by[m.id] != null || Object.keys(by).length < FAIR.engage;
}
// ดาเมจจากมอนใส่ผู้เล่นในช่วงมอน (ฮุค incoming) → จำนวนที่ลงได้
function fairHit(s, p, n, src) {
  if (!s.fight || !(n > 0) || noFair(p)) return n;
  const by = (s.fight.by[p.id] ||= {});
  if (by[src.id] == null && Object.keys(by).length >= FAIR.engage) return 0; // ตัวที่ 3 (วงที่เตือนไว้ ฯลฯ)
  const out = Math.max(0, Math.min(n, fairCap(src) - (by[src.id] || 0)));
  by[src.id] = (by[src.id] || 0) + out;
  return out;
}
// ลำดับเวลาของตามอน (MOB_SEQ): เรียงตามลำดับที่มอนได้ตาจริง (list) · ตัวที่ไม่มีรายการ = ไม่กินเวลา · คืนเวลารวม (ms)
function mobTimeline(list, L, s) {
  const of = (arr, id, key = "id") => arr.filter((e) => e && e[key] === id);
  const rows = list.map((m) => {
    const mv = of(L.moves, m.id);
    const hits = [...of(L.attacks, m.id), ...of(L.pillarHits, m.id), ...of(L.heals, m.id, "by"), ...of(L.shots, m.id), ...of(L.blinks, m.id), ...of(L.pulls, m.id)];
    const boom = ((s.fight && s.fight.defer) || []).filter((d) => d.id === m.id);
    const tiles = mv.reduce((n, e) => n + Math.max(1, (Array.isArray(e.path) ? e.path.length : 2) - 1), 0);
    return { mv, hits, boom, tiles };
  }).filter((r) => r.mv.length || r.hits.length || r.boom.length);
  const raw = rows.reduce((t, r) => t + r.tiles * MOB_SEQ.step + (r.mv.length ? MOB_SEQ.gap : 0) + (r.hits.length || r.boom.length ? MOB_SEQ.hit : 0), 0);
  const k = raw > MOB_SEQ.max ? Math.max(MOB_SEQ.minK, MOB_SEQ.max / raw) : 1;
  let t = 0;
  for (const r of rows) {
    for (const e of r.mv) { const n = Math.max(1, (Array.isArray(e.path) ? e.path.length : 2) - 1); e.at = Math.round(t); e.ms = Math.round(n * MOB_SEQ.step * k); t += e.ms; }
    if (r.mv.length) t += MOB_SEQ.gap * k;
    if (r.hits.length || r.boom.length) { for (const e of r.hits) e.at = Math.round(t); for (const d of r.boom) d.at = Math.round(t); t += MOB_SEQ.hit * k; }
  }
  // รายการที่ไม่ได้อยู่ในตามอนปกติ (ไม่มี at) = ต้นฉาก
  for (const arr of Object.values(L)) for (const e of arr) if (e && e.at == null) e.at = 0;
  return Math.round(t);
}
function actMonsters(ctx, s) {
  s.fight = { by: {}, defer: [] };
  try { return actMonstersRaw(ctx, s); } finally { s.fight = null; }
}
function actMonstersRaw(ctx, s) {
  const runeOut = MBS.beforeAct(ctx, s, HH.H()); // วงเวทที่วางไว้ตาก่อนระเบิด (นักเวทตายหมดแล้วก็ต้องล้างวง)
  const regenOut = ELT.beforeAct(ctx, s, HH.H()); // หัวหน้าฟื้นตัว
  const list = mobsOf(ctx);
  if (!list.length) return runeOut.length || regenOut.length ? 1 : 0;
  const moves = [], attacks = [], pillarHits = [], heals = [], shots = [], booms = [];
  const acc = { moves, attacks, shots, blinks: [], pulls: [], runes: [] }; // มอนรูปแบบใหม่ (eosMobs.act)
  const round = ctx.match.roundNumber + 1;
  const out = { moves, attacks, pillarHits, big: false };
  const ev = E.ev(s);
  if (ev.quake && !list.some((m) => m.id === ev.quake.by && m.alive)) ev.quake = null; // ราชาปีศาจล้มก่อนทุบ = วงหาย
  const plan = MAI.raidPlan(ctx, s);
  const mu = MAI.musterTick(ctx, s, round), sieges = [];
  for (const m of list) {
    if (!m.alive || !m.pos || MAI.stuckMob(m) || m.summon.born === round) continue;
    const type = SPN.mobType(m), sm = m.summon;
    if (type === "nest" || type === "giant" || type === "gold") continue; // โชโกโบะทองวิ่งหนีเอง (eosPerks.goldTurn)
    // อากาศ → มอน (PVE รอบสี่): พายุทราย = ทหารเหล็กในทะเลทรายไม่เห็นใคร ขยับเมื่อมีคนใกล้ ≤ 3
    if (type === "magitek" && sandOn(ctx) && inDesert(m.pos.x, m.pos.y) && !heroes(ctx).some((p) => manhattan(p.pos, m.pos) <= PKS.WEATHER_MOB.sandSight)) continue; // รังอยู่กับที่ · ยักษ์หินเดินตามเส้นทาง (eosExtra.giantTurn)
    const all = SPN.prey(ctx, s, m);
    // ---- นิสัยพิเศษ ----
    if (MBS.isNew(sm.trait) && MBS.act(ctx, s, HH.H(), m, all, acc)) continue;
    if (sm.trait === "healer") { healerAct(ctx, s, m, all, moves, heals); continue; }
    if (sm.trait === "sniper") {
      const t = all.filter((p) => manhattan(p.pos, m.pos) <= SPN.TRAIT.sniperRange).sort((a, b) => manhattan(a.pos, m.pos) - manhattan(b.pos, m.pos))[0];
      if (t) {
        const dealt = ctx.combat.withEffectSource(m, () => ctx.damage(t, Math.max(1, (sm.atk | 0) + (stormOn(ctx) ? PKS.WEATHER_MOB.stormMagitekAtk : 0))));
        shots.push({ id: m.id, from: { ...m.pos }, to: { ...t.pos }, target: t.id, dmg: dealt });
        ctx.log(`🎯 ${m.name}ยิง ${t.name} -${dealt}`);
        continue;
      }
    }
    if (sm.trait === "bomber" && all.some((p) => footOf(ctx, p).some((tt) => manhattan(tt, m.pos) === 1))) { booms.push(bomberBlast(ctx, s, m, true)); continue; }
    if (type === "lament") { LM.act(ctx, s, HH.H(), m, all, round, out); continue; }
    if (sm.trait === "boss") { MAI.bossAct(ctx, s, m, all, round, out); continue; }
    let targets = [], pillars = [], mov = Math.max(1, (ctx.action.movOf(m) | 0) + (type !== "beast" ? LM.rage(ctx).mov : 0) + (type === "daemon" && fogOn(ctx) ? PKS.WEATHER_MOB.fogDaemonMov : 0) + snowMov(ctx, m)); // พายุหิมะ = มอนเดิน −1 (เดินได้อย่างน้อย 1) // หมอก = ปีศาจล่าในหมอก เดิน +1
    if (type === "beast") {
      const agg = sm.aggro && round <= sm.aggroUntil + 1 ? ctx.match.players[sm.aggro] : null;
      if (agg && agg.alive && agg.pos) targets = [agg];
      else {
        sm.aggro = null;
        targets = all.filter((p) => manhattan(p.pos, m.pos) <= PR.BEAST.reach + SKY.beastMod(s).reach); // ใครเข้าใกล้ = โดน (จันทร์เต็มดวง +1)
        mov = targets.length ? Math.min(mov, 1 + SKY.beastMod(s).mov) : 0;
      }
    } else {
      targets = (type === "daemon" || type === "magitek") && sm.trait !== "boss" ? MBS.smartTargets(ctx, s, HH.H(), m, all, mov, acc) : all; // ฆ่าได้ก่อน · คนแยกกลุ่มก่อน
      pillars = SPN.pillarGoals(s);
      // ทหารเหล็กเล็งเสาก่อน (มีเสาที่ยึดแล้ว = ไปหาเสา เว้นแต่มีคนติดตัวอยู่แล้ว)
      if (type === "magitek" && pillars.length && !all.some((p) => manhattan(p.pos, m.pos) === 1)) targets = [];
    }
    // ตัวอัญเชิญที่ AI คุมของผู้เล่น (ลูกน้อง Master) เข้ามาใกล้ = มอนหันมาสู้ตัวนั้นก่อน ไม่เดินผ่านไปหาคนอื่น (ผู้ใช้ 2026-11-16)
    const guards = type === "beast" ? [] : all.filter((p) => p.summon && p.summon.ai && footOf(ctx, p).some((t) => manhattan(t, m.pos) <= mov + 1));
    if (guards.length) { targets = guards; pillars = []; }
    let r = { to: null, path: null, target: null, pillar: null };
    if ((type === "daemon" || type === "magitek") && MBS.fallBack(ctx, s, HH.H(), m, all, mov, acc)) continue; // บาดเจ็บหนัก = ถอยไปหาปีศาจหมอ
    const raidPl = guards.length ? null : plan.get(m.id);
    if (raidPl) { // หน่วยบุก: ตรงไปเสา (หรือป้อมปืนของเสา) · ตีเฉพาะคนที่ติดตัว/ยืนเฝ้าเสา
      const tg = all.filter((p) => manhattan(p.pos, m.pos) <= 1 || manhattan(p.pos, raidPl) <= MAI.RAID.guardR);
      r = MAI.stepMob(ctx, s, m, tg, [raidPl, ...MAI.plTurrets(ctx, raidPl)], mov);
      if (!r.to && !r.target && !r.pillar && !r.wall) sm.raid = null; // ไปไม่ถึง = เลิกบุก ล่าตามปกติ
    }
    // รวมพล: ยังไม่ติดพัน = ไปรอที่วงรอบจุดตั้งรับ (ไม่ทยอยเข้าไปให้ล้มทีละตัว)
    let held = false;
    if (!raidPl && mu && mu.mode === "gather" && MAI.musterMob(m) && !all.some((p) => manhattan(p.pos, m.pos) <= MAI.RAID.engage)) {
      const inRing = (x, y) => { const d = manhattan({ x, y }, mu.c); return d >= MAI.MUSTER.ring[0] && d <= MAI.MUSTER.ring[1] && !all.some((p) => manhattan(p.pos, { x, y }) <= MAI.RAID.engage); };
      const g = MAI.stepToward(ctx, s, m, mov, inRing);
      if (g) { held = true; if (g.to) r = { to: g.to, path: g.path, target: null, pillar: null }; }
    }
    if (!held && !r.to && !r.target && !r.pillar && !r.wall) r = targets.length || pillars.length ? MAI.stepMob(ctx, s, m, targets, pillars, mov) : r;
    // ไม่มีเป้า / ไปหาเป้าไม่ได้เลย = ลาดตระเวนเข้าหาผู้เล่น (สัตว์ยักษ์เฝ้าถิ่นเหมือนเดิม)
    // ปิดล้อม: ปีศาจไปหาใครไม่ได้ เพราะผู้เล่นหลบในเมืองที่ไฟเปิด = ไปยืนติดขอบเมืองนั้น (แล้วทุบไฟ)
    if (!held && SPN.lightBound(m) && !r.to && !r.target && !r.pillar && !r.wall) {
      const zs = new Set(heroes(ctx).map((p) => townOf(p.pos.x, p.pos.y)).filter((z) => z && DM.lit(s, z)));
      if (zs.size) {
        const g = MAI.stepToward(ctx, s, m, mov, (x, y) => ctx.Board.DIRS.some(([dx, dy]) => zs.has(townOf(x + dx, y + dy)) && DM.blockedTown(s, x + dx, y + dy)));
        if (g) { held = true; if (g.to) r = { to: g.to, path: g.path, target: null, pillar: null }; }
      }
    }
    if (!held && !raidPl && !guards.length && (type === "daemon" || type === "magitek") && sm.trait !== "boss") { r = MBS.coordinate(ctx, s, HH.H(), m, r, all, mov); if (r.held) held = true; } // รุมเป้าเดียว · ล้อม · รอฝูงก่อนเข้าวงตี
    if (held) { /* รอในวงรวมพล / ยืนล้อมเมือง */ } else if (type !== "beast" && !r.to && !r.target && !r.pillar && !r.wall) { const w = MAI.roamMob(ctx, s, m, mov); if (w) r = { ...w, target: null, pillar: null }; }
    else if (r.to || r.target || r.pillar) sm.roam = null;
    if (!r.to && !r.target && !r.pillar && !r.wall) { if (SPN.lightBound(m)) { const z = MAI.townEdge(ctx, s, m); if (z) sieges.push(MAI.siegeLight(ctx, s, m, z)); } continue; }
    if (r.to && (r.to.x !== m.pos.x || r.to.y !== m.pos.y)) {
      moves.push({ id: m.id, type, from: { ...m.pos }, to: { ...r.to }, path: r.path });
      const pv = Array.isArray(r.path) && r.path.length > 1 ? r.path[r.path.length - 2] : m.pos;
      RD.faceTo(sm, r.to.x - pv.x, r.to.y - pv.y);
      m.pos = { x: r.to.x, y: r.to.y };
      ctx.bump();
    }
    if (sm.trait === "bomber") { // ปีศาจระเบิด: เดินถึงตัวคน = ระเบิดทันที (ไม่ตีเสา)
      if (all.some((p) => footOf(ctx, p).some((tt) => manhattan(tt, m.pos) === 1))) booms.push(bomberBlast(ctx, s, m, true));
      continue;
    }
    const atk = Math.max(1, (sm.atk | 0) + LM.rage(ctx).atk + (type === "magitek" && stormOn(ctx) ? PKS.WEATHER_MOB.stormMagitekAtk : 0) + (type === "beast" ? SKY.beastMod(s).atk : 0)); // จันทร์เต็มดวง = สัตว์ยักษ์ตี +1 // ฝนฟ้าคะนอง = ทหารเหล็กลัดวงจร ตี −1
    // สัตว์ยักษ์ตีทุกคนที่ติดตัว (ล่อมาชนคนอื่นได้) · อื่นๆ ตีเป้าตัวเดียว · ไม่มีคนติด = ตีเสา
    // เป้าที่เลือกไว้ไปไม่ถึง แต่จบตาติดตัวคนอื่น (เช่น Master ขวางทางไปหาตัวอัญเชิญ) = ตีคนที่ติดตัว (ผู้ใช้ 2026-11-16 "มาติดตัวแต่ไม่ตี")
    if (type !== "beast" && !r.target && !r.pillar && !r.wall && m.pos) {
      const adj = all.filter((p) => p.alive && p.pos && footOf(ctx, p).some((t) => manhattan(t, m.pos) === 1));
      if (adj.length) r.target = adj.sort((a, b) => ((a.hp || 0) + (a.armor || 0)) - ((b.hp || 0) + (b.armor || 0)))[0];
    }
    const victims = type === "beast" ? all.filter((p) => footOf(ctx, p).some((t) => manhattan(t, m.pos) === 1)) : r.target ? [r.target] : [];
    for (const v of victims) {
      if (!v.alive) continue;
      if (v.pos) RD.faceTo(sm, v.pos.x - m.pos.x, v.pos.y - m.pos.y); // หันหน้าเข้าหาคนที่ตี
      const dealt = ctx.combat.withEffectSource(m, () => ctx.damage(v, atk));
      if (!acc.focus && type !== "beast" && v.alive) acc.focus = v.id; // ตัวอื่นรุมเป้านี้ต่อ
      attacks.push({ id: m.id, type, x: m.pos.x, y: m.pos.y, target: v.id, dmg: dealt });
      ctx.log(`${type === "beast" ? "🐗" : type === "magitek" ? "🤖" : "👹"} ${m.name}โจมตี ${v.name} -${dealt}`);
    }
    if (!victims.length && !r.pillar && !r.wall && SPN.lightBound(m)) { const z = MAI.townEdge(ctx, s, m); if (z) sieges.push(MAI.siegeLight(ctx, s, m, z)); } // ปิดล้อม: ติดขอบเมือง = ทุบไฟ
    if (!victims.length && !r.pillar && r.wall) { const wh = WL.hitWall(ctx, s, m, r.wall); if (wh) pillarHits.push({ type, ...wh }); }
    if (!victims.length && r.pillar && r.pillar.kind === "turret") { const wh = WL.hitWall(ctx, s, m, r.pillar); if (wh) pillarHits.push({ type, ...wh }); }
    else if (!victims.length && r.pillar) pillarHits.push({ id: m.id, type, x: m.pos.x, y: m.pos.y, at: { x: r.pillar.x, y: r.pillar.y }, ...WL.hitPillar(ctx, s, r.pillar, m) });
  }
  // ต้นเทิร์นเหตุการณ์เดียวสำหรับ client (เดิน → ตี) · ชื่อเดิม mob_move / mob_attack ใช้ทั้งปีศาจและศัตรูอื่น
  //  delay (ผู้ใช้ 2026-11-14 "อยู่ๆ ก็ไหลเข้ามาแล้วเกิดความเสียหายเลย ไม่ทันรู้ตัว"): มีมอนเดิน = ฉากตี/ยิง/ดึงรอจนเดินถึงก่อน (client เลื่อนเอฟเฟกต์ + เลขดาเมจ + หลอดเลือดตาม)
  //  ทีละตัว (MOB_SEQ): ทุกรายการได้ at (ms นับจากต้นฉากมอน) · ทางเดินได้ ms · client เล่นตาม at (ไม่ขยับกล้อง)
  const total = mobTimeline(list, { moves, attacks, pillarHits, heals, shots, blinks: acc.blinks, pulls: acc.pulls }, s);
  s.mobSeqMs = total;
  const firstAt = (arr) => arr.reduce((v, e) => Math.min(v, e.at || 0), Infinity);
  const span = (arr) => arr.reduce((v, e) => Math.max(v, e.at || 0), 0);
  if (moves.length) ctx.fx("mob_move", { moves, seqd: 1, dur: total + 400 });
  if (attacks.length || pillarHits.length) ctx.fx("mob_attack", { attacks, pillars: pillarHits, seqd: 1, dur: Math.max(span(attacks), span(pillarHits)) + 900, delay: 0, first: Math.min(firstAt(attacks), firstAt(pillarHits)) });
  if (heals.length) ctx.fx("mob_heal", { heals, seqd: 1, dur: span(heals) + 1200 });
  if (shots.length) ctx.fx("mob_shot", { shots, seqd: 1, dur: span(shots) + 700 });
  if (acc.blinks.length) ctx.fx("mob_blink", { list: acc.blinks, seqd: 1, dur: span(acc.blinks) + 900 });
  if (acc.pulls.length) ctx.fx("mob_pull", { list: acc.pulls, seqd: 1, dur: span(acc.pulls) + 900 });
  for (const d of (s.fight && s.fight.defer) || []) ctx.fx(d.kind, { ...d.data, delay: d.at || 0 }); // ระเบิดของปีศาจระเบิด = ตามจังหวะของตัวมันเอง
  if (s.fight) s.fight.defer = [];
  if (acc.runes.length) ctx.fx("mob_rune_set", { list: acc.runes });
  if (sieges.length) { ctx.fx("town_siege", { list: sieges }); const z = sieges[sieges.length - 1]; if (!z.out) ctx.log(`👹 ปีศาจทุบไฟเมือง ${SC.ZONE_NAMES[z.zone] || z.zone} (${z.hp}/${MAI.lightMax(s)})`); }
  return moves.length || attacks.length || pillarHits.length || heals.length || shots.length || booms.length || sieges.length || out.big || runeOut.length || regenOut.length || acc.runes.length || acc.pulls.length || acc.blinks.length ? 1 : 0;
}
// ปีศาจหมอ: ฟื้นเลือดมอนในระยะ 2 (รวมตัวเอง) แล้วถอยห่างผู้เล่น / เกาะกลุ่มมอนตัวอื่น · ไม่ตี
function healerAct(ctx, s, m, all, moves, heals) {
  const mov = Math.max(0, ctx.action.movOf(m) | 0);
  const near = all.filter((p) => manhattan(p.pos, m.pos) <= 3);
  let to = null, path = null;
  if (near.length) { // ถอย: ช่องในระยะเดินที่ห่างผู้เล่นใกล้สุดมากที่สุด
    const reach = ctx.Board.reachable(ctx.map(), { id: m.id, x: m.pos.x, y: m.pos.y, size: 1, alive: true }, mov, ctx.units().filter((u) => u.id !== m.id));
    let best = null, bd = -1;
    for (const n of reach.values()) {
      if (!tileFree(ctx, s, n.x, n.y, m.id) || DM.blockedTown(s, n.x, n.y)) continue;
      const d = Math.min(...near.map((p) => manhattan(p.pos, n)));
      if (d > bd) { bd = d; best = n; }
    }
    if (best && (best.x !== m.pos.x || best.y !== m.pos.y)) to = { x: best.x, y: best.y };
  } else {
    const pals = mobsOf(ctx).filter((o) => o !== m && o.summon.trait !== "healer").sort((a, b) => manhattan(a.pos, m.pos) - manhattan(b.pos, m.pos));
    if (pals[0] && manhattan(pals[0].pos, m.pos) > 2) { const r = MAI.stepMob(ctx, s, m, [pals[0]], [], mov); if (r.to) { to = r.to; path = r.path; } }
  }
  if (to) { moves.push({ id: m.id, type: "healer", from: { ...m.pos }, to: { ...to }, path: path || [{ ...m.pos }, { ...to }] }); m.pos = { ...to }; ctx.bump(); }
  for (const o of mobsOf(ctx)) {
    if (manhattan(o.pos, m.pos) > SPN.TRAIT.healReach) continue;
    const before = o.hp;
    o.hp = Math.min(o.summon.maxHp, o.hp + SPN.TRAIT.healAmt);
    if (o.hp > before) heals.push({ id: o.id, by: m.id, x: o.pos.x, y: o.pos.y, amt: o.hp - before });
  }
}
// ปีศาจระเบิด: วง 3×3 ดาเมจ 3 ทุกตัวที่ไม่ใช่มอน (ผู้เล่น · รถเสบียง) + ตีเสาที่ติดอยู่ 1 รอย · self = ระเบิดเอง (สลายเงียบ — ไม่ได้ของ)
function bomberBlast(ctx, s, m, self) {
  if (m.summon.blasted || !m.pos) return null;
  m.summon.blasted = true;
  const at = { ...m.pos }, tiles = PR.area3(at.x, at.y).filter((tt) => ctx.Board.inBounds(ctx.map(), tt.x, tt.y));
  const hits = [];
  for (const u of PR.unitsOn(ctx, tiles)) { if (isMob(u)) continue; const dealt = ctx.combat.withEffectSource(m, () => ctx.damage(u, SPN.TRAIT.bombDmg)); hits.push({ id: u.id, dmg: dealt }); }
  const pl = s.pillars.find((o) => o.owner && manhattan(o, at) === 1);
  if (pl) WL.hitPillar(ctx, s, pl, m);
  if (self) lazySummon().remove(m);
  ctx.bump();
  if (s.fight && s.fight.defer) s.fight.defer.push({ id: m.id, kind: "mob_boom", data: { id: m.id, x: at.x, y: at.y, tiles, hits } }); // ระหว่างตามอน = เล่นตามคิวของตัวมันเอง (mobTimeline)
  else ctx.fx("mob_boom", { id: m.id, x: at.x, y: at.y, tiles, hits });
  ctx.log(`💥 ${m.name}ระเบิด!${hits.length ? ` โดน ${hits.length} ตัว` : ""}`);
  return { at, hits };
}
// ศัตรู AI ตาย (server/summon.js onDeath — ฆ่าโดยใครก็ได้ด้วยวิธีใดก็ได้) → เหรียญ + ของดรอป + ค่าหัว
const DROP_POOL = {
  daemon: { pct: 30, items: ["armor", "cleanse", "gysahl"] },
  magitek: { pct: 40, items: ["armor", "resist", "battery"], flask: 35 },
  beast: { pct: 100, items: ["lifeCrystal", "armorCrystal", "windBoots"] },
  nest: { pct: 70, items: ["armor", "cleanse", "resist", "fortune"], flask: 40 },
  gold: { pct: 100, items: ["lifeCrystal", "armorCrystal", "windBoots", "fortune"] },
};
function itemOf(type) {
  const C = require("../constants");
  return type === "armor" ? { type, value: C.SHOP_ARMOR_AMOUNT } : { type };
}
function loot(ctx, s, p, pool, rng = ctx.rng) {
  const got = [];
  if (!p || !p.alive) return got;
  if (pool.pct && rng() * 100 < pool.pct) {
    const it = pool.items[Math.floor(rng() * pool.items.length) % pool.items.length];
    const entry = lazyShop().grantInventoryItem(p, itemOf(it));
    if (entry) got.push({ item: it, name: lazyShop().shopItemName ? lazyShop().shopItemName(entry) : it });
  }
  if (pool.flask && rng() * 100 < pool.flask) {
    const bag = PR.flasksOf(s, p);
    if (bag.length < PR.FLASK_MAX) { const el = PR.ELEMENTS[Math.floor(rng() * 3) % 3]; bag.push(el); got.push({ flask: el, name: `ขวด${PR.ELEMENT_NAMES[el]}` }); }
  }
  return got;
}
function onMobDeath(m, killerId) {
  const F = require("../fodlan");
  if (!F.active() || !F.isEos() || !F.stageState() || !F.stageState().eos) return;
  const ctx = F.makeCtx(), s = F.stageState().eos;
  const type = SPN.mobType(m), at = m.pos ? { ...m.pos } : null;
  let by = killerId ? ctx.match.players[killerId] : null;
  if (by && by.summon && by.summon.controlled) by = ctx.match.players[by.summon.ownerId] || by; // ร่างแยกฆ่า = เจ้าของได้ของ
  if (by && (isMob(by) || by.summon)) by = null;
  s.kills = (s.kills || 0) + 1;
  MBS.onDeath(ctx, s, HH.H(), m); // ตัวแยกร่าง: แตก 2 ร่าง
  const elite = ELT.isElite(m);
  if (elite) ELT.onDeath(ctx, s, HH.H(), m, by); // หัวหน้า: ระเบิดตอนตาย · แต้มรวม
  if (by && (elite || m.summon.trait === "boss")) { const S = SC.SUM(s), b = elite ? S.elites : S.bosses; b[by.id] = (b[by.id] || 0) + 1; }
  if (m.summon.trait === "bomber") bomberBlast(ctx, s, m, false); // โดนฆ่าก็ระเบิด — ฆ่าจากระยะไกลปลอดภัยกว่า
  E.questKill(ctx, s, HH.H(), at, by);
  if (XT.onMobDeath(ctx, s, HH.H(), m, by)) return; // ท่าร่วม · ฉายา · มาตรวัดทีม · ยักษ์หิน (แจกของเอง)
  if (type === "lament") { LM.onDeath(ctx, s, HH.H(), m, by); SC.checkWin(ctx, s); return; }
  if (m.summon.trait === "boss") { if (by) lazyShop().addGold(by, m.summon.gold || 0); E.onBossDeath(ctx, s, HH.H(), m, by); JR.huntDone(ctx, s, by, type); return; }
  const mul = E.bloodMul(s) * (type === "beast" ? SKY.beastMod(s).goldMul : 1), pool0 = DROP_POOL[type] || {}, luck = PKS.fortune(s); // จันทร์เต็มดวง: สัตว์ยักษ์ของรางวัล ×2 // การ์ดโชคลาภ: เหรียญ +1 · โอกาสได้ของ +20%
  const pool = { ...pool0, pct: elite ? 100 : Math.min(100, ((pool0.pct || 0) + E.dropBonus(ctx) + luck.pct) * mul), flask: pool0.flask ? Math.min(100, pool0.flask * mul) : 0 };
  const gold = by ? lazyShop().addGold(by, Math.max(1, (m.summon.gold || 0) + luck.gold - (s.lamentOn ? LM.LAMENT.goldCut : 0)) * mul) : 0; // Lament: เหรียญ −1
  const got = by ? loot(ctx, s, by, pool) : [];
  if (by && by.alive && PKS.hunterHeal(s) && ctx.combat.healHp) ctx.combat.healHp(by, PKS.hunterHeal(s)); // การ์ดนักล่า
  if (type === "beast") s.beastBack = ctx.match.roundNumber + PR.BEAST.respawn;
  ctx.bump();
  ctx.fx(type === "daemon" ? "daemon_die" : "mob_die", { id: m.id, type, x: at ? at.x : 0, y: at ? at.y : 0, kind: m.summon.look, by: by ? by.id : null, gold, loot: got.map((g) => g.name) });
  JR.huntDone(ctx, s, by, type);
  ctx.log(`💥 ${by ? by.name : "ใครบางคน"} โค่น${SPN.MOB_NAMES[type] || "ศัตรู"}!${gold ? ` +${gold} เหรียญ` : ""}${got.length ? ` · ได้ ${got.map((g) => g.name).join(", ")}` : ""}`);
}
// สัตว์ยักษ์โดนตี (ทุกวิธี) → ไล่คนที่ตีมัน: ตรวจตอนจบตาของแต่ละคน (เลือด+เกราะลดลง = คนที่เพิ่งเดินคือคนตี)
function beastAggro(ctx, s, p) {
  for (const m of mobsOf(ctx, "beast")) {
    const now = m.hp + (m.armor || 0);
    if (p && !isMob(p) && now < (m.summon.mark || 0)) { m.summon.aggro = p.id; m.summon.aggroUntil = ctx.match.roundNumber + PR.BEAST.aggroTurns; }
    m.summon.mark = now;
  }
}

// Object.assign (ไม่แทน module.exports) — ไฟล์ eos* อ้างกันเองแบบวนได้
Object.assign(module.exports, {
  FAIR, mobAtkOf, engageOk, fairHit, mobTimeline, actMonsters, healerAct, bomberBlast, loot, onMobDeath, beastAggro,
});
