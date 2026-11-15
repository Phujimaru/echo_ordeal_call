// ============================================================
//  สนาม Eos — การเดินของมอน: ก้าว · เดินเตร่ · รวมพล · บุกเมือง/เสา · ไฟเมือง (ปิดล้อม) · ราชาปีศาจ (พุ่ง/แผ่นดินแยก)
//  แยกออกจาก server/fodlan/stage6.js (ย้ายโค้ดล้วน · พฤติกรรมเดิม) · ฮุคทั้งหมดยังส่งออกผ่าน stage6.js
// ============================================================
const E = require("./eosEvents");
const PKS = require("./eosPerks");
const XT = require("./eosExtra");
const BB = require("./eosBoss");
const LM = require("./eosLament");
const { K, TOWNS, isMob, mobsOf, heroes, sizeOf, footOf, tileFree, freeNear, manhattan, townOf, canStrike } = require("./eosCore");
const DM = require("./eosDome");
const HH = require("./eosH");
const MT = require("./eosMobTurn");
const PR = require("./eosProps");
const RD = require("./eosRide");
const SC = require("./eosScore");
const SPN = require("./eosSpawn");
const WL = require("./eosWalls");

const stuckMob = (m) => ((m.statuses.stun || 0) > 0) || ((m.statuses.sleep || 0) > 0 && !m.sleepFresh);
// ก้าวไปหาช่องที่ติดเป้า (ผู้เล่น/เสา) ใกล้สุด — BFS ช่องว่าง ไม่เกิน mov · เป้าที่ติดอยู่แล้ว = ไม่เดิน
function stepMob(ctx, s, m, targets, pillars, mov) {
  const town = SPN.lightBound(m), dark = XT.fearsLight(m);
  // ติดหลายคน = ตีคนที่เลือด+เกราะน้อยสุดก่อน (มอนฉลาดขึ้น — ผู้ใช้ 2026-11-10)
  const adjT = (x, y) => targets.filter((p) => footOf(ctx, p).some((t) => manhattan(t, { x, y }) === 1)).sort((a, b) => ((a.hp || 0) + (a.armor || 0)) - ((b.hp || 0) + (b.armor || 0)))[0] || null;
  const adjP = (x, y) => pillars.find((pl) => manhattan(pl, { x, y }) === 1) || null;
  const goalAt = (x, y) => adjT(x, y) || adjP(x, y);
  if (goalAt(m.pos.x, m.pos.y)) return { to: null, path: null, target: adjT(m.pos.x, m.pos.y), pillar: adjT(m.pos.x, m.pos.y) ? null : adjP(m.pos.x, m.pos.y) };
  // มอนพวกเดียวกันขวางทาง (ต่อแถวหน้าประตู/ทางแคบ) = เดินผ่านแผนได้แต่หยุดบนช่องนั้นไม่ได้ (ผู้ใช้แจ้ง 2026-11-10 "มายืนออหน้าทางเข้า ไม่เข้ามาสักที")
  const mobAt = mobTiles(ctx, m.id);
  const start = { x: m.pos.x, y: m.pos.y, prev: null }, seen = new Set([K(m.pos.x, m.pos.y)]), q = [start];
  let goal = null;
  for (let i = 0; i < q.length && !goal; i++) for (const [dx, dy] of ctx.Board.DIRS) {
    const x = q[i].x + dx, y = q[i].y + dy, k = K(x, y);
    if (seen.has(k) || !ctx.Board.inBounds(ctx.map(), x, y) || WL.gateShut(s, x, y) || (town && DM.blockedTown(s, x, y)) || (dark && XT.lightSafe(HH.H(), x, y))) continue;
    const pal = mobAt.has(k);
    if (!pal && !tileFree(ctx, s, x, y, m.id)) continue;
    seen.add(k);
    const node = { x, y, prev: q[i] };
    if (!pal && goalAt(x, y)) { goal = node; break; }
    q.push(node);
  }
  if (!goal) return WL.wallRoute(ctx, s, m, targets, pillars, mov, town, dark, goalAt);
  const path = [];
  for (let c = goal; c; c = c.prev) path.unshift({ x: c.x, y: c.y });
  // มอนฉลาดขึ้น (ผู้ใช้แจ้ง 2026-11-10 "ไม่ทำลายสิ่งกีดขวางเพื่อพุ่งเข้ามา เดินอ้อมเฉยๆ"): ทางอ้อมยาวกว่าทางทุบ ≥ SMART.detour ก้าว = ทุบ
  if (path.length - 1 > mov) {
    const alt = WL.wallRoute(ctx, s, m, targets, pillars, mov, town, dark, goalAt, true);
    if (alt.to && alt.cost != null && alt.cost + WL.SMART.detour < path.length - 1) return alt;
  }
  let n = Math.min(mov, path.length - 1);
  while (n > 0 && mobAt.has(K(path[n].x, path[n].y))) n--; // หยุดก่อนช่องที่พวกเดียวกันยืน
  const to = path[n];
  const target = adjT(to.x, to.y);
  return { to, path: path.slice(0, n + 1), target, pillar: target ? null : adjP(to.x, to.y) };
}
const mobTiles = (ctx, selfId) => { const out = new Set(); for (const o of mobsOf(ctx)) if (o.id !== selfId && o.alive && o.pos) out.add(K(o.pos.x, o.pos.y)); return out; };
// ลาดตระเวน: ไม่เห็นใคร / เป้าที่เห็นไปไม่ถึง (หนีเข้าเมืองที่ไฟเปิด ฯลฯ) = เดินไปจุดสุ่มที่ใกล้ผู้เล่นขึ้น แทนการยืนเฉย (ผู้ใช้แจ้ง 2026-11-10 "บางตัวก็ยืนเฉยๆ")
//  จุดหมายค้างไว้จนถึง / ROAM.turns เทิร์น / ไปไม่ได้ · ตัวเลข Claude ตั้ง
const ROAM = { near: 4, far: 9, tries: 24, turns: 4 };
function roamMob(ctx, s, m, mov) {
  const sm = m.summon, round = ctx.match.roundNumber + 1, map = ctx.map();
  const town = SPN.lightBound(m), dark = XT.fearsLight(m);
  const ok = (x, y) => ctx.Board.inBounds(map, x, y) && tileFree(ctx, s, x, y, m.id) && !WL.gateShut(s, x, y) && !(town && DM.blockedTown(s, x, y)) && !(dark && XT.lightSafe(HH.H(), x, y));
  const hs = heroes(ctx);
  const pick = () => {
    let best = null, bs = Infinity;
    for (let i = 0; i < ROAM.tries; i++) {
      const d = ROAM.near + Math.floor(ctx.rng() * (ROAM.far - ROAM.near + 1)), a = ctx.rng() * Math.PI * 2;
      const x = Math.round(m.pos.x + Math.cos(a) * d), y = Math.round(m.pos.y + Math.sin(a) * d);
      if (!ok(x, y)) continue;
      const sc = (hs.length ? Math.min(...hs.map((p) => manhattan(p.pos, { x, y }))) : 0) + ctx.rng() * 4;
      if (sc < bs) { bs = sc; best = { x, y }; }
    }
    return best;
  };
  if (!sm.roam || round > sm.roam.until || (sm.roam.x === m.pos.x && sm.roam.y === m.pos.y)) { const t = pick(); sm.roam = t ? { ...t, until: round + ROAM.turns } : null; }
  if (!sm.roam) return null;
  const mobAt = mobTiles(ctx, m.id), goalK = K(sm.roam.x, sm.roam.y);
  const start = { x: m.pos.x, y: m.pos.y, prev: null }, seen = new Set([K(m.pos.x, m.pos.y)]), q = [start];
  let goal = null;
  for (let i = 0; i < q.length && !goal && i < 600; i++) for (const [dx, dy] of ctx.Board.DIRS) {
    const x = q[i].x + dx, y = q[i].y + dy, k = K(x, y);
    if (seen.has(k) || !(mobAt.has(k) ? ctx.Board.inBounds(map, x, y) : ok(x, y))) continue;
    seen.add(k);
    const node = { x, y, prev: q[i] };
    if (k === goalK) { goal = node; break; }
    q.push(node);
  }
  if (!goal) { sm.roam = null; return null; }
  const path = [];
  for (let c = goal; c; c = c.prev) path.unshift({ x: c.x, y: c.y });
  let n = Math.min(mov, path.length - 1);
  while (n > 0 && mobAt.has(K(path[n].x, path[n].y))) n--;
  return n > 0 ? { to: path[n], path: path.slice(0, n + 1) } : null;
}
// ============================================================ ผู้บัญชาการฝูงมอน (ผู้ใช้แจ้ง 2026-11-11 "เสาเปิดตั้งนาน ไม่เข้าไปตี ไม่มีคนเฝ้า ผู้เล่นอยู่อีกที่กันหมด มันเดินอยู่เฉยๆ")
//  ทุกต้นเทิร์นมอนแบ่งหน้าที่: เสาที่ยึดไว้แต่ไม่มีใครเฝ้า (ไม่มีผู้เล่นในระยะ RAID.guardR) = ส่งหน่วยบุก RAID.open ตัว (+1 ทุก 2 คืน)
//   เสาที่มีคนเฝ้า = ส่ง RAID.guarded ตัวไปกดดัน · หน่วยบุกเดินตรงไปเสา ตีเฉพาะคนที่ขวางหน้า/เฝ้าเสา · ป้อมปืนของเสานั้นเป็นเป้าด้วย
//   มอนที่ติดพันผู้เล่นอยู่ (ห่าง ≤ RAID.engage) ไม่ถูกดึงไปบุก · หน้าที่ค้างข้ามเทิร์นจนเสาหลุด/ไปไม่ถึง · ตัวเลข Claude ตั้ง
const RAID = { guardR: 3, open: 2, perNights: 2, guarded: 1, engage: 2 };
// ============================================================ รวมพลแล้วบุกพร้อมกัน (ผู้ใช้เลือก 2026-11-11 — "เสายึดอยู่ต้นเดียว คนก็อยู่ที่เดียว" · ตัวเลข Claude ตั้ง)
//  ผู้เล่นส่วนใหญ่ (≥ 60%) กองกันในรัศมี 4 และอยู่ที่เดิม (ขยับ ≤ 3) ติดกัน 2 เทิร์น = "ตั้งรับ" → มอนที่ยังไม่ติดพันไม่ทยอยเข้าไปให้ล้มทีละตัว
//   ไปรอเป็นวงห่างจุดตั้งรับ 5–7 ช่อง · ครบ 3 + จำนวนผู้เล่น ตัว หรือรอครบ 3 เทิร์น = บุกพร้อมกันเป็นระลอก 2 เทิร์น (ประกาศเตือน) แล้วกลับไปรวมพลใหม่
const MUSTER = { r: 4, share: 0.6, drift: 3, still: 2, ring: [5, 7], need: 3, perHead: 1, wait: 3, wave: 2 };
const musterMob = (m) => { const t = SPN.mobType(m), tr = m.summon && m.summon.trait; return (t === "daemon" || t === "magitek") && tr !== "boss" && tr !== "healer"; };
function musterTick(ctx, s, round) {
  const hs = heroes(ctx);
  if (!hs.length) { s.muster = null; return null; }
  let c = null, size = 0;
  for (const p of hs) { const n = hs.filter((o) => manhattan(o.pos, p.pos) <= MUSTER.r).length; if (n > size) { size = n; c = p.pos; } }
  if (size < Math.max(1, Math.ceil(hs.length * MUSTER.share))) { s.muster = null; return null; }
  let mu = s.muster;
  if (!mu || manhattan(mu.c, c) > MUSTER.drift) mu = s.muster = { c: { ...c }, still: 0, since: round, waveUntil: 0, mode: null };
  if (mu.tick === round) return mu;
  mu.tick = round;
  mu.still += 1;
  if (round <= mu.waveUntil) { mu.mode = "wave"; return mu; }
  if (mu.still < MUSTER.still) { mu.mode = null; return mu; }
  if (mu.mode !== "gather") { mu.mode = "gather"; mu.since = round; }
  const near = mobsOf(ctx).filter((m) => musterMob(m) && m.pos && manhattan(m.pos, mu.c) <= MUSTER.ring[1] + 1).length;
  if (near >= MUSTER.need + MUSTER.perHead * hs.length || (near > 0 && round - mu.since >= MUSTER.wait)) {
    mu.mode = "wave"; mu.waveUntil = round + MUSTER.wave - 1; mu.since = round + MUSTER.wave;
    ctx.fx("mob_wave", { x: mu.c.x, y: mu.c.y, n: near });
    ctx.log(`⚠️ ฝูงมอน ${near} ตัวล้อมรอบแล้ว — บุกพร้อมกัน!`);
  }
  return mu;
}
// เดินไปช่องว่างใกล้สุดที่ isGoal(x, y) (ผ่านช่องที่มอนพวกเดียวกันยืนได้แต่หยุดไม่ได้) — แบบเดียวกับลาดตระเวน
function stepToward(ctx, s, m, mov, isGoal) {
  const map = ctx.map(), town = SPN.lightBound(m), dark = XT.fearsLight(m);
  const ok = (x, y) => ctx.Board.inBounds(map, x, y) && tileFree(ctx, s, x, y, m.id) && !WL.gateShut(s, x, y) && !(town && DM.blockedTown(s, x, y)) && !(dark && XT.lightSafe(HH.H(), x, y));
  if (isGoal(m.pos.x, m.pos.y)) return { to: null, path: null, hold: true };
  const mobAt = mobTiles(ctx, m.id), seen = new Set([K(m.pos.x, m.pos.y)]), q = [{ x: m.pos.x, y: m.pos.y, prev: null }];
  let goal = null;
  for (let i = 0; i < q.length && !goal && i < 700; i++) for (const [dx, dy] of ctx.Board.DIRS) {
    const x = q[i].x + dx, y = q[i].y + dy, k = K(x, y), pal = mobAt.has(k);
    if (seen.has(k) || !(pal ? ctx.Board.inBounds(map, x, y) : ok(x, y))) continue;
    seen.add(k);
    const node = { x, y, prev: q[i] };
    if (!pal && isGoal(x, y)) { goal = node; break; }
    q.push(node);
  }
  if (!goal) return null;
  const path = [];
  for (let c = goal; c; c = c.prev) path.unshift({ x: c.x, y: c.y });
  let n = Math.min(mov, path.length - 1);
  while (n > 0 && mobAt.has(K(path[n].x, path[n].y))) n--;
  return n > 0 ? { to: path[n], path: path.slice(0, n + 1) } : { to: null, path: null, hold: true };
}
// ============================================================ ปีศาจปิดล้อมเมือง (ผู้ใช้เลือก 2026-11-11): ปีศาจที่ยืนติดขอบเมืองที่ไฟเปิด ทุบไฟเมือง 1/ตัว/เทิร์น
//  ไฟเมืองหมด = ไฟดับ (s.lightsOff) ปีศาจบุกเข้าเมืองได้ · ยืนติดแผงไฟกด "ซ่อมไฟ"/"เปิดไฟ" +4 · ฟ้าสาง = ไฟกลับเต็ม · ตัวเลข Claude ตั้ง
const TOWN_LIGHT = { hp: 8, fix: 4 };
const lightMax = (s) => Math.max(2, TOWN_LIGHT.hp + PKS.lightBonus(s) - (LM.curse(s, "dim") ? 2 : 0)); // การ์ดไฟเมืองแกร่ง +4 · คำสาปไฟริบหรี่ −2
// ไฟทุกเมืองที่ยังเปิดหรี่ลง n (ผู้คร่ำครวญเฟส 2+)
function dimLights(ctx, s, n) {
  for (const z of TOWNS) {
    if (!DM.lit(s, z.id)) continue;
    (s.lightHp ||= {})[z.id] = Math.max(0, lightHp(s, z.id) - n);
    if (s.lightHp[z.id] <= 0) { (s.lightsOff ||= {})[z.id] = true; ctx.fx("town_dark", { zone: z.id }); ctx.log(`🌑 ไฟเมือง ${SC.ZONE_NAMES[z.id] || z.id} ดับ!`); }
  }
  ctx.bump();
}
const lightHp = (s, z) => (s.lightHp && s.lightHp[z] != null ? s.lightHp[z] : lightMax(s));
function townEdge(ctx, s, m) {
  for (const [dx, dy] of ctx.Board.DIRS) { const x = m.pos.x + dx, y = m.pos.y + dy, z = townOf(x, y); if (z && DM.lit(s, z)) return z; }
  return null;
}
function siegeLight(ctx, s, m, z) {
  (s.lightHp ||= {})[z] = Math.max(0, lightHp(s, z) - 1);
  const out = s.lightHp[z] <= 0;
  if (out) { (s.lightsOff ||= {})[z] = true; ctx.fx("town_dark", { zone: z }); ctx.log(`🌑 ไฟเมือง ${SC.ZONE_NAMES[z] || z} ดับ! ปีศาจบุกเข้าเมืองได้ — ไปซ่อมที่แผงไฟ`); }
  ctx.bump();
  return { id: m.id, x: m.pos.x, y: m.pos.y, zone: z, hp: s.lightHp[z], out };
}
function restoreLights(ctx, s) {
  const had = Object.values(s.lightsOff || {}).some(Boolean) || Object.keys(s.lightHp || {}).length > 0;
  s.lightsOff = {}; s.lightHp = {};
  if (had) { ctx.bump(); ctx.log("💡 ฟ้าสาง — ไฟเมืองกลับมาสว่างเต็ม"); }
}
function lightFixable(ctx, s, p) { const sw = DM.switchNear(ctx, p); return sw && (!DM.lit(s, sw.zone) || lightHp(s, sw.zone) < lightMax(s)) ? sw : null; }
function fixLights(ctx, s, p) {
  const sw = canStrike(ctx, p) ? lightFixable(ctx, s, p) : null;
  if (!sw) return false;
  const z = sw.zone, was = !DM.lit(s, z);
  (s.lightHp ||= {})[z] = Math.min(lightMax(s), (was ? 0 : lightHp(s, z)) + TOWN_LIGHT.fix);
  if (s.lightHp[z] >= lightMax(s)) delete s.lightHp[z];
  if (s.lightsOff) delete s.lightsOff[z];
  ctx.bump();
  ctx.fx("town_light", { zone: z, x: sw.at[0], y: sw.at[1], by: p.id, relit: was });
  ctx.log(`💡 ${p.name} ${was ? "เปิดไฟเมืองกลับมา" : "ซ่อมไฟเมือง"} ${SC.ZONE_NAMES[z] || z}`);
  ctx.useStrike(p, DM.SWITCH_SECS);
  return true;
}
const raider = (m) => { const t = SPN.mobType(m), tr = m.summon && m.summon.trait; return (t === "daemon" || t === "magitek") && tr !== "boss" && tr !== "healer"; };
const guardedPl = (ctx, pl) => heroes(ctx).some((p) => manhattan(p.pos, pl) <= RAID.guardR);
function openPillars(ctx, s) { return SPN.pillarGoals(s).filter((pl) => pl.owner && !guardedPl(ctx, pl)); }
// ป้อมปืนประจำเสา (ยังไม่พัง) — เป้ารองของหน่วยบุก
function plTurrets(ctx, pl) { return PR.TURRETS.filter((t) => WL.turretZone(t) === pl.zone && PR.turretUp(ctx, t)).map((t) => ({ x: t.x, y: t.y, kind: "turret", zone: pl.zone })); }
function raidPlan(ctx, s) {
  const plan = new Map(), held = SPN.pillarGoals(s).filter((pl) => pl.owner);
  const mobs = mobsOf(ctx).filter((m) => m.alive && m.pos && raider(m) && !stuckMob(m));
  for (const m of mobs) if (m.summon.raid && !held.some((pl) => pl.id === m.summon.raid)) m.summon.raid = null;
  if (!held.length) return plan;
  const hs = heroes(ctx), busy = (m) => hs.some((p) => manhattan(p.pos, m.pos) <= RAID.engage);
  const can = (m, pl) => !(SPN.lightBound(m) && DM.blockedTown(s, pl.x, pl.y)); // ปีศาจบุกเสาในเมืองที่ไฟเปิดไม่ได้
  for (const pl of held) {
    const want = guardedPl(ctx, pl) ? RAID.guarded : RAID.open + Math.floor((s.nightNo || 0) / RAID.perNights);
    const mine = mobs.filter((m) => m.summon.raid === pl.id && can(m, pl)).slice(0, want);
    for (const m of mine) plan.set(m.id, pl);
    const free = mobs.filter((m) => !plan.has(m.id) && !m.summon.raid && !busy(m) && can(m, pl)).sort((a, b) => manhattan(a.pos, pl) - manhattan(b.pos, pl));
    for (const m of free.slice(0, Math.max(0, want - mine.length))) { m.summon.raid = pl.id; plan.set(m.id, pl); }
  }
  for (const m of mobs) if (m.summon.raid && !plan.has(m.id)) m.summon.raid = null; // ส่วนเกิน (เสามีคนมาเฝ้าแล้ว) กลับไปล่าตามปกติ
  return plan;
}
// ============================================================ ราชาปีศาจ (ผู้ใช้แจ้ง 2026-11-11 "บอสไม่น่ากลัว เดินเฉยๆ ไม่เข้าไปทำอะไรสักอย่างเหมือนกลัว")
//  เดิม: เล็งแต่เสา (เสาในเมืองที่ไฟเปิด = ไปไม่ถึง → ยืนนิ่ง) · ใหม่ (Claude ตั้ง):
//   ไม่กลัวไฟเมือง/ไฟแคมป์ · ไล่ทั้งผู้เล่นและเสา ใกล้สุดก่อน · ไปไม่ถึงอะไรเลย = เดินเข้าหาผู้เล่น (ไม่ยืนเฉย)
//   พุ่งชน: ผู้เล่นอยู่แนวตรง 2–6 ช่องทางโล่ง → พุ่งไปชน ดาเมจ +1 กระเด็น 1 ช่อง (พัก 2 เทิร์น)
//   แผ่นดินแยก: ผู้เล่นใกล้ ≤ 3 → วงเตือนรัศมี 2 รอบตัว ต้นเทิร์นหน้าระเบิด ดาเมจ 3 ทุกคนในวง (ออกจากวงทัน = รอด · พัก 3 เทิร์น)
//   คลั่ง: เลือดเหลือครึ่ง → ตี +1 เดิน +1 (ครั้งเดียว)
const BOSS_AI = { chargeMin: 2, chargeMax: 6, chargeBonus: 1, chargeCd: 2, quakeR: 2, quakeDmg: 3, quakeCd: 3, quakeNear: 3, enrage: 0.5, enrageAtk: 1, enrageMov: 1 };
const diamond = (x, y, r) => { const out = []; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.abs(dx) + Math.abs(dy) <= r && (dx || dy)) out.push({ x: x + dx, y: y + dy }); return out; };
function bossCharge(ctx, s, m, all) {
  if (sizeOf(ctx, m) > 1) return null;
  let best = null;
  for (const p of all) {
    if (sizeOf(ctx, p) > 1 || !p.pos) continue;
    const dx = p.pos.x - m.pos.x, dy = p.pos.y - m.pos.y, d = Math.abs(dx) + Math.abs(dy);
    if ((dx && dy) || d < BOSS_AI.chargeMin || d > BOSS_AI.chargeMax) continue;
    const sx = Math.sign(dx), sy = Math.sign(dy);
    let ok = true;
    for (let i = 1; i < d && ok; i++) { const x = m.pos.x + sx * i, y = m.pos.y + sy * i; ok = tileFree(ctx, s, x, y, m.id) && !WL.gateShut(s, x, y) && !PKS.wallAt(s, x, y); }
    if (ok && (!best || (p.hp || 0) + (p.armor || 0) < (best.p.hp || 0) + (best.p.armor || 0))) best = { p, sx, sy, d };
  }
  return best;
}
function bossAct(ctx, s, m, all, round, out) {
  const sm = m.summon, e = E.ev(s), atk0 = () => Math.max(1, (sm.atk | 0) + LM.rage(ctx).atk);
  // ---- แผ่นดินแยกที่เตือนไว้ ----
  if (e.quake && e.quake.by === m.id && round >= e.quake.at) {
    const hits = [];
    for (const u of PR.unitsOn(ctx, e.quake.tiles)) { if (isMob(u)) continue; const dealt = ctx.combat.withEffectSource(m, () => ctx.damage(u, BOSS_AI.quakeDmg)); hits.push({ id: u.id, dmg: dealt }); }
    ctx.fx("boss_quake", { id: m.id, x: e.quake.x, y: e.quake.y, tiles: e.quake.tiles, hits });
    ctx.log(`👑 ราชาปีศาจทุบแผ่นดินแยก!${hits.length ? ` โดน ${hits.length} คน` : " ไม่โดนใคร"}`);
    e.quake = null; sm.quakeAt = round;
    out.big = true;
  }
  if (BB.darkTick(ctx, s, HH.H(), m, round)) out.big = true; // เขตทมิฬค้าง
  if (BB.land(ctx, s, HH.H(), m, round)) out.big = true; // ท่าใหญ่ที่เตือนไว้
  // ---- คลั่ง ----
  if (!sm.enraged && m.hp <= (sm.maxHp || m.hp) * BOSS_AI.enrage) {
    sm.enraged = true; sm.atk = Math.min(MT.FAIR.bossHit, (sm.atk | 0) + BOSS_AI.enrageAtk);
    ctx.fx("boss_enrage", { id: m.id, x: m.pos.x, y: m.pos.y });
    ctx.log("👑 ราชาปีศาจคลั่ง! โจมตีแรงขึ้น เดินไวขึ้น");
  }
  if (BB.guards(ctx, s, HH.H(), m)) out.big = true; // เลือด ≤ 30% = องครักษ์
  // ---- คำราม: ทุก 2 เทิร์นเรียกปีศาจ 2 ตัวข้างตัว ----
  if (round >= (sm.roarAt || 0) + E.BOSS.roarEvery) {
    sm.roarAt = round;
    const st = E.scaleStats(ctx, SPN.daemonStats(Math.max(1, s.nightNo || 1))), spawned = [];
    for (let i = 0; i < 2 && SPN.mobRoom(ctx) > 0; i++) { const at = freeNear(ctx, s, m.pos.x, m.pos.y, 3); if (at) { const d = SPN.spawnMob(ctx, s, "daemon", at, st, { look: 1 + (++s.seq % 8), tier: s.nightNo || 1 }); spawned.push({ id: d.id, x: at.x, y: at.y }); } }
    if (spawned.length) ctx.fx("boss_roar", { id: m.id, x: m.pos.x, y: m.pos.y, spawned });
  }
  const hit = (v, dmg, extra = {}) => { if (!v.alive) return; const dealt = ctx.combat.withEffectSource(m, () => ctx.damage(v, dmg)); out.attacks.push({ id: m.id, type: "boss", x: m.pos.x, y: m.pos.y, target: v.id, dmg: dealt, ...extra }); };
  const adj = () => all.filter((p) => p.alive && p.pos && footOf(ctx, p).some((tt) => manhattan(tt, m.pos) === 1));
  const mov = Math.max(0, (ctx.action.movOf(m) | 0) + (sm.enraged ? BOSS_AI.enrageMov : 0));
  let acted = false;
  if (adj().length) { // กระทืบ: ทุกคนที่ติดตัว
    const list = adj();
    for (const v of list) hit(v, atk0());
    ctx.log(`👑 ราชาปีศาจกระทืบ ${list.map((v) => v.name).join(", ")}`);
    acted = true;
  }
  // ---- พุ่งชน ----
  const ch = !acted && round >= (sm.chargeAt ?? -99) + BOSS_AI.chargeCd ? bossCharge(ctx, s, m, all) : null;
  if (ch) {
    const to = { x: ch.p.pos.x - ch.sx, y: ch.p.pos.y - ch.sy }, path = [];
    for (let i = 0; i <= ch.d - 1; i++) path.push({ x: m.pos.x + ch.sx * i, y: m.pos.y + ch.sy * i });
    out.moves.push({ id: m.id, type: "boss", from: { ...m.pos }, to: { ...to }, path, charge: true });
    RD.faceTo(sm, ch.sx, ch.sy);
    m.pos = { ...to }; ctx.bump();
    sm.chargeAt = round;
    const v = ch.p, back = { x: v.pos.x + ch.sx, y: v.pos.y + ch.sy };
    hit(v, atk0() + BOSS_AI.chargeBonus, { charge: true });
    if (v.alive && v.pos && ctx.Board.inBounds(ctx.map(), back.x, back.y) && tileFree(ctx, s, back.x, back.y, v.id)) { v.pos = back; ctx.bump(); }
    ctx.log(`👑 ราชาปีศาจพุ่งชน ${v.name}!`);
    acted = true;
  }
  if (!acted) {
    let r = stepMob(ctx, s, m, all, SPN.pillarGoals(s), mov);
    if (!r.to && !r.target && !r.pillar && !r.wall) { const w = roamMob(ctx, s, m, mov); if (w) r = { ...w, target: null, pillar: null }; }
    if (r.to && (r.to.x !== m.pos.x || r.to.y !== m.pos.y)) {
      out.moves.push({ id: m.id, type: "boss", from: { ...m.pos }, to: { ...r.to }, path: r.path });
      const pv = Array.isArray(r.path) && r.path.length > 1 ? r.path[r.path.length - 2] : m.pos;
      RD.faceTo(sm, r.to.x - pv.x, r.to.y - pv.y);
      m.pos = { ...r.to }; ctx.bump();
    }
    const near = adj();
    if (near.length) { for (const v of near) hit(v, atk0()); ctx.log(`👑 ราชาปีศาจกระทืบ ${near.map((v) => v.name).join(", ")}`); }
    else if (r.pillar && r.pillar.kind === "turret") { const wh = WL.hitWall(ctx, s, m, r.pillar); if (wh) out.pillarHits.push({ type: "boss", ...wh }); }
    else if (r.pillar) for (let i = 0; i < E.BOSS.pillarHits && r.pillar.owner; i++) out.pillarHits.push({ id: m.id, type: "boss", x: m.pos.x, y: m.pos.y, at: { x: r.pillar.x, y: r.pillar.y }, ...WL.hitPillar(ctx, s, r.pillar, m) });
    else if (r.wall) { const wh = WL.hitWall(ctx, s, m, r.wall); if (wh) out.pillarHits.push({ type: "boss", ...wh }); }
  }
  // ---- เตือนแผ่นดินแยก (ลงต้นเทิร์นหน้า) ----
  let quaked = false;
  if (!e.quake && !sm.big && round >= (sm.quakeAt ?? -99) + BOSS_AI.quakeCd && all.some((p) => p.alive && p.pos && manhattan(p.pos, m.pos) <= BOSS_AI.quakeNear)) {
    const tiles = diamond(m.pos.x, m.pos.y, BOSS_AI.quakeR).filter((t) => ctx.Board.inBounds(ctx.map(), t.x, t.y));
    e.quake = { by: m.id, at: round + 1, x: m.pos.x, y: m.pos.y, tiles };
    sm.quakeAt = round; // นับพักจากตอนเตือน
    ctx.fx("boss_quake_warn", { id: m.id, x: m.pos.x, y: m.pos.y, tiles });
    ctx.log("⚠️ ราชาปีศาจยกเท้าขึ้นสูง — ออกจากวงแดง!");
    quaked = true;
  }
  if (BB.warn(ctx, s, HH.H(), m, all, round, quaked)) out.big = true; // ท่าใหญ่: เตือน 1 เทิร์น
}

// Object.assign (ไม่แทน module.exports) — ไฟล์ eos* อ้างกันเองแบบวนได้
Object.assign(module.exports, {
  stuckMob, stepMob, roamMob, RAID, MUSTER, musterMob, musterTick, stepToward, TOWN_LIGHT, lightMax, dimLights, lightHp, townEdge, siegeLight,
  restoreLights, lightFixable, fixLights, openPillars, plTurrets, raidPlan, BOSS_AI, bossAct,
});
