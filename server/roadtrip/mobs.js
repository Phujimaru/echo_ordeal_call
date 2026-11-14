// Road Trip: มอนบนถนน (contract §8) — ยูนิตที่ถูกเรียก (server/summon.js) ฝ่าย "rtmob" · เจ้าของสมมติ RT_OWNER (แบบ Eos)
//  ค่าสถานะ = ฐาน × (1 + diff.grow × floor(km/10)) × (1 + 0.25 × loop) · จำนวน × diff.count
//  ตาของมอน = ต้นเทิร์น (preRound ก่อนแจกไพ่ — แบบ Eos) · ตัวที่เพิ่งเกิดเทิร์นนี้ยังไม่ขยับ
//  การตีของมอนหลบได้ (attack.skillDodge — หลบหลีก/ช่องหลบ/หลบเฉพาะตัว) · ดาเมจผ่าน combat.dealMixed (เกราะก่อน)
const match = require("../match");
const Board = require("../board");
const { diffOf } = require("./diff");

const SIDE = "rtmob";
const KIND = "rtMob";
const RT_OWNER = { id: "rt", name: "Road Trip", position: 0, customColor: null, teamId: null };
const H = () => require("./index");
const lazy = {
  summon: () => require("../summon"), combat: () => require("../combat"), action: () => require("../phases/action"),
  attack: () => require("../phases/attack"), vis: () => require("../visibility"), dim: () => require("../dimension"),
};

// ฐาน (Claude ตั้งตัวเลข) · flags: fly บินข้ามสิ่งกีดขวาง · dash พุ่งแนวตรง · ram ชนแนว · slowHit ตีแล้วเชื่องช้า · thorns หนามรอบตัว · phase ทะลุตอนกลางคืน
const ROSTER = {
  stray: { name: "หมาจรจัด", hp: 3, armor: 0, atk: 1, mov: 5, gold: 1, color: "#9a7b5a" },
  crow: { name: "อีกาเหล็ก", hp: 2, armor: 0, atk: 1, mov: 5, gold: 1, fly: true, color: "#3b3f4a" },
  biker: { name: "แก๊งมอเตอร์ไซค์", hp: 4, armor: 1, atk: 2, mov: 4, gold: 2, dash: 5, color: "#c0392b" },
  trucker: { name: "ซอมบี้รถบรรทุก", hp: 7, armor: 2, atk: 2, mov: 3, gold: 3, ram: 3, color: "#5d6d3a" },
  giant: { name: "ยักษ์ขวางถนน", hp: 14, armor: 3, atk: 3, mov: 2, gold: 5, color: "#7d6b5d" },
  cactus: { name: "กระบองเพชรเดินได้", hp: 5, armor: 1, atk: 1, mov: 3, gold: 2, thorns: 1, color: "#3f8f3a" },
  boar: { name: "หมูป่า", hp: 6, armor: 1, atk: 2, mov: 4, gold: 2, dash: 3, color: "#6b4a2e" },
  yeti: { name: "มนุษย์หิมะ", hp: 9, armor: 2, atk: 2, mov: 3, gold: 3, slowHit: true, color: "#cfe3f0" },
  ghost: { name: "ผีโบกรถ", hp: 4, armor: 0, atk: 2, mov: 4, gold: 2, phase: true, color: "#8e7cc3" },
  saberclaw: { name: "เสือเขี้ยวดาบ", hp: 6, armor: 1, atk: 2, mov: 6, gold: 3, dash: 4, color: "#c98a3a" },
  devilTruck: { name: "แม็กซ์ เวอร์สแตปเพน", hp: 40, armor: 3, atk: 4, mov: 3, gold: 15, boss: true, color: "#6b0f1a" },  // บอสหลัก 50 — นักแข่ง (ผู้ใช้ตั้งชื่อ 2026-11-14 · id เดิม devilTruck · ภาพตลก — ผู้ใช้ตั้งใจ)
  darkKnight: { name: "อัศวินเงามรณะ", hp: 48, armor: 5, atk: 4, mov: 3, gold: 18, boss: true, color: "#2b2d3a" },   // บอสหลัก 100: ถึก ฟันกว้าง/พุ่ง
  jormungand: { name: "จอร์มุนกันด์", hp: 44, armor: 2, atk: 4, mov: 2, gold: 20, boss: true, color: "#2f6f7a" },   // บอสหลัก 150: ฉกยาว/คลื่นน้ำแข็ง
};
const ATK_CAP = 6, BOSS_ATK_CAP = 8, MOB_CAP = 12;
const ELITE = { hp: 2, atk: 1, armor: 1, gold: 3 };
const K = Board.key;
const man = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

function scale(rt, base, { elite = false } = {}) {
  const d = diffOf(rt);
  const steps = Math.floor(Math.max(0, rt.km) / 10);
  const loop = (rt.region && rt.region.loop) | 0;
  const k = (1 + d.grow * steps) * (1 + 0.25 * loop);
  const cap = base.boss ? BOSS_ATK_CAP : ATK_CAP;
  let hp = Math.max(1, Math.round(base.hp * k)), atk = Math.min(cap, Math.max(1, Math.round(base.atk * (1 + (k - 1) * 0.5))));
  let armor = base.armor + loop, gold = base.gold + Math.floor(steps / 10);
  if (elite) { hp = hp * ELITE.hp + 2; atk = Math.min(cap, atk + ELITE.atk); armor += ELITE.armor; gold += ELITE.gold; }
  return { hp, atk, armor, mov: base.mov, gold };
}
// ชนิดที่โผล่ได้ตามระยะ/ภูมิภาค/กลางคืน
function poolFor(rt, kind = null) {
  if (kind === "onvan") return poolFor(rt).filter((t) => CHASERS.includes(t)); // รถวิ่ง = เฉพาะตัวที่ไล่ทัน (ไม่มีกระบองเพชร/ยักษ์/มนุษย์หิมะ)
  const km = rt.km, out = ["stray", "crow"];
  if (km >= 25) out.push("biker");
  if (km >= 75) out.push("trucker", "giant");
  const reg = rt.region && rt.region.id;
  if (reg === "desert") out.push("cactus", "cactus");
  if (reg === "forest") out.push("boar", "boar");
  if (reg === "snow") out.push("yeti", "yeti");
  if (rt.night || reg === "ghost") out.push("ghost", "ghost");
  if (km >= 10) out.push("saberclaw");
  if (km >= 10 && (reg === "forest" || reg === "snow")) out.push("saberclaw", "saberclaw"); // เสือเขี้ยวดาบชุมในป่า/หิมะ
  if (km >= 150) return out.filter((t) => t !== "stray"); // ไกลแล้ว หมาจรหายไป
  return out;
}
function waveSize(rt, kind, heroes) {
  const base = kind === "boss" ? 2 : 3 + Math.floor(rt.km / 40);
  const n = Math.round((base + Math.max(0, heroes - 1)) * diffOf(rt).count);
  return Math.max(1, Math.min(MOB_CAP, n));
}

function spawn(rt, type, at, { elite = false, born = null } = {}) {
  const base = ROSTER[type];
  if (!base || !at) return null;
  const st = scale(rt, base, { elite });
  const rec = lazy.summon().spawn(RT_OWNER, {
    kind: KIND, pos: { x: at.x, y: at.y }, hp: st.hp, armor: st.armor, mov: st.mov, range: [1, 1],
    name: elite ? `หัวหน้า${base.name}` : base.name, img: `/roadtrip/mobs/${type}.webp`, color: base.color,
    data: { side: SIDE, mobType: type, atk: st.atk, gold: st.gold, elite, boss: !!base.boss, born: born == null ? match.roundNumber + 1 : born },
  });
  return rec;
}
const isMob = (p) => !!(p && p.summon && p.summon.side === SIDE);
const mobs = () => Object.values(match.players).filter((p) => isMob(p) && p.alive && p.pos);
// เป้าของมอน: ผู้เล่น (และลูกทีมหมา) ที่ยืนบนกระดาน
// m = มอนที่เล็ง: ชั้นมิติเดียวกัน · มองเห็น (ล่องหน/พุ่มไม้/ม่านแดง) · การล่อเป้า (แบบ Moon Cell)
function prey(m = null) {
  const action = lazy.action(), Vis = lazy.vis(), Dim = lazy.dim();
  return lazy.combat().alivePlayers().filter((p) => p.pos && !isMob(p) && (!p.summon || p.summon.rtDog)
    && (!m || (Dim.same(m, p) && !Vis.hiddenFromUnit(m, p) && action.tauntAllows(m, p)))
    && (!m || !p.rtRoof || canHitRoof(m))); // บนหลังคารถตู้: เฉพาะตัวบิน/บอสเอื้อมถึง
}
function canHitRoof(m) { const b = ROSTER[m.summon && m.summon.mobType] || {}; return !!(b.fly || b.boss); }

// ช่องว่างสำหรับเกิด (ไม่ทับยูนิต/สิ่งกีดขวาง/ร้าน)
function freeAt(x, y, taken) {
  const action = lazy.action();
  if (taken && taken.has(K(x, y))) return false;
  return action.tileFree(x, y);
}

// ---------- ตาของมอน ----------
//  คืนรายการเหตุการณ์ { moves, attacks, misses, van, charges } ให้ fx
function actAll(rt, out) {
  const round = match.roundNumber + 1;
  for (const m of mobs()) {
    if (!m.alive || !m.pos || m.summon.born >= round) continue;
    m.summon.acted = true; // ได้ตาแล้ว (ถนนเลื่อนพามอนที่ยังไม่เคยได้ตาไม่ได้ — fight.scroll)
    if (((m.statuses && m.statuses.stun) || 0) > 0 || (((m.statuses && m.statuses.sleep) || 0) > 0 && !m.sleepFresh)) continue;
    actOne(rt, m, out);
  }
  tickControl();
}
// สถานะคุมตัวของมอนลดหลังมอนได้ตาของตัวเอง (แบบ Eos tickMobControl)
const CONTROL = ["stun", "sleep", "rooted", "slow"];
function tickControl() {
  for (const m of mobs()) for (const k of CONTROL) {
    if (!(m.statuses[k] > 0)) continue;
    if (k === "sleep" && m.sleepFresh) { m.sleepFresh = false; continue; }
    m.statuses[k] -= 1;
    if (m.statuses[k] <= 0) { delete m.statuses[k]; if (m.statusAmt) delete m.statusAmt[k]; }
  }
}
function walkOpts(rt, m) {
  const sm = m.summon;
  const ghost = sm.mobType === "ghost" && (rt.night || (rt.region && rt.region.id === "ghost"));
  return { ghost, fly: !!ROSTER[sm.mobType].fly };
}
// ช่องที่มอนไปยืนได้ (BFS) — มอนด้วยกันผ่านได้ หยุดซ้อนไม่ได้ · อีกาบินข้ามสิ่งกีดขวาง (ลงจอดได้เฉพาะช่องว่าง) · ผีกลางคืนทะลุทุกอย่าง
function reach(rt, m, mov) {
  const action = lazy.action();
  const map = action.boardMap();
  const units = action.boardUnits().filter((u) => u.id !== m.id);
  const o = walkOpts(rt, m);
  const unit = { id: m.id, x: m.pos.x, y: m.pos.y, size: 1 };
  const isMate = (a, b) => isMob(match.players[b.id]);
  if (o.ghost || o.fly) {
    const all = Board.reachable(map, unit, mov, [], { ghost: true });
    const out = new Map();
    for (const [k, n] of all) if (k === K(m.pos.x, m.pos.y) || (!Board.isObstacle(map, n.x, n.y, action.boardBlocked(m.id)) && !Board.unitAt(units, n.x, n.y))) out.set(k, n);
    return out;
  }
  return Board.reachable(map, unit, mov, units, { isAlly: isMate, blocked: action.boardBlocked(m.id) });
}
function pathFrom(stops, x, y) { return Board.pathTo(stops, x, y) || [{ x, y }]; }
// เป้าที่ดีที่สุดจากช่อง (x, y): ติดตัว → เลือด+เกราะน้อยสุด
function adjTarget(x, y, targets) {
  return targets.filter((t) => t.alive && t.pos && Board.dist(Board.boxOf(t), { x, y, size: 1 }) === 1)
    .sort((a, b) => ((a.hp || 0) + (a.armor || 0)) - ((b.hp || 0) + (b.armor || 0)))[0] || null;
}
// ---------- AI (ผู้ใช้แจ้ง 2026-11-14 "บอสเมินผู้เล่นที่อยู่ใกล้แล้วเดินหนี … มอนมุ่งแต่รถ แล้วจะชนะยังไง") ----------
//  เป้าหลัก = ผู้เล่น: ล่าคนที่ใกล้ที่สุดที่ไปถึงได้ (ระยะทางเดินจริง อ้อมสิ่งกีดขวาง/รถตู้) · เดินเต็มระยะ แล้วตีในตาเดียวกันถ้าถึง
//   · มีคนติดตัวอยู่แล้ว = ตีเลย ไม่เดินหนี
//  บทบาท (summon.role — client ทำเครื่องหมายได้): "hunter" ล่าผู้เล่น · "saboteur" ป่วนรถ (~1 ใน 4 ของฝูง ไม่รวมบอส — แก๊งมอเตอร์ไซค์/ซอมบี้รถบรรทุก/อีกาก่อน)
//   ตัวป่วนรถเดินไปติดรถแล้วทุบรถ (มีคนติดตัว = ตีคนนั้นก่อน) · ไปหาผู้เล่นไม่ได้เลย (ทางตัน) = ไปทุบรถแทน
const SABOTEUR_SHARE = 0.25, SABOTEUR_PREF = ["biker", "trucker", "crow"];
function assignRoles(list) {
  const pool = list.filter((m) => m && m.summon && !m.summon.boss);
  for (const m of pool) m.summon.role = "hunter";
  const n = pool.length >= 2 ? Math.max(1, Math.round(pool.length * SABOTEUR_SHARE)) : 0;
  const order = [...pool].sort((a, b) => (SABOTEUR_PREF.includes(b.summon.mobType) ? 1 : 0) - (SABOTEUR_PREF.includes(a.summon.mobType) ? 1 : 0));
  for (const m of order.slice(0, n)) m.summon.role = "saboteur";
  return n;
}
// บันทึกเหตุการณ์ตามลำดับจริง (mobTurn.seq) ให้ client เล่นทีละตัว: mobMove → mobHit …
function seqPush(out, e) { (out.seq || (out.seq = [])).push(e); }
function moveMob(out, m, path, extra = {}) {
  if (!path || path.length < 2) return;
  const from = { ...m.pos }, to = { x: path[path.length - 1].x, y: path[path.length - 1].y };
  out.moves.push({ id: m.id, type: m.summon.mobType, from, to, path, ...extra });
  seqPush(out, { k: "mobMove", id: m.id, type: m.summon.mobType, path: path.map((t) => [t.x, t.y]), ...(extra.dash ? { dash: true } : {}) });
  m.pos = to;
}
// เดินเข้าหาเป้าหมาย: BFS ระยะไม่จำกัด (ทางจริง) → เดินตามเส้นทางนั้นให้ไกลสุดในระยะเดิน (หยุดบนช่องว่างเท่านั้น)
//  goal(n) = ช่องปลายทางที่ต้องการ · rank(n) = ค่าเทียบเมื่อระยะเท่ากัน (น้อย = ดี) → คืน true ถ้าขยับ
function approach(rt, m, mov, goal, rank = () => 0, out) {
  if (!(mov > 0)) return false;
  const stops = reach(rt, m, 99);
  let best = null;
  for (const n of stops.values()) if (goal(n) && (!best || n.d < best.d || (n.d === best.d && rank(n) < rank(best)))) best = n;
  if (!best || (best.x === m.pos.x && best.y === m.pos.y)) return false;
  const path = Board.pathTo(stops, best.x, best.y) || [];
  let i = path.length - 1;
  while (i > 0 && ((stops.get(K(path[i].x, path[i].y)) || { d: 99 }).d > mov || !stops.has(K(path[i].x, path[i].y)))) i--;
  if (i <= 0) return false;
  moveMob(out, m, path.slice(0, i + 1));
  return true;
}
const adjTo = (t) => (n) => t.alive && t.pos && Board.dist(Board.boxOf(t), { x: n.x, y: n.y, size: 1 }) === 1;
const adjAny = (targets) => (n) => targets.some((t) => adjTo(t)(n));
const weakness = (t) => (t.hp || 0) + (t.armor || 0);
function hitVan(m, out) {
  const n = H().hurtVan(1, "mob", m.id);
  out.van.push({ id: m.id, x: m.pos.x, y: m.pos.y, dmg: n });
  seqPush(out, { k: "mobHit", id: m.id, target: "van", dmg: n, dodged: false, crit: false });
}
function actOne(rt, m, out) {
  const sm = m.summon, base = ROSTER[sm.mobType] || ROSTER.stray;
  const action = lazy.action();
  const mov = Math.max(0, action.movOf(m) | 0);
  // หนาม (กระบองเพชร): ทุกคนที่ติดตัวโดน 1 ต้นตา
  if (base.thorns) for (const t of prey(m)) if (t.pos && Board.dist(Board.boxOf(t), m.pos) === 1) hit(rt, m, t, base.thorns, out, "หนามทิ่ม");
  const targets = prey(m);
  if (sm.boss) return bossAct(rt, m, targets, out);
  // มีคนติดตัวอยู่แล้ว = ตีเลย (ไม่เดินหนี — ตัวป่วนรถก็ป้องกันตัว)
  let target = adjTarget(m.pos.x, m.pos.y, targets);
  if (target) { hit(rt, m, target, sm.atk | 0, out, "โจมตี"); return; }
  if (sm.role === "saboteur") return sabotage(rt, m, mov, targets, out);
  // พุ่ง (แก๊งมอเตอร์ไซค์ / หมูป่า / เสือ) / ชนแนว (ซอมบี้รถบรรทุก): เป้าในแนวตรง ≤ N ช่อง ทางโล่ง = พุ่งไปติดแล้วตีแรง +1
  const lineN = base.dash || base.ram || 0;
  if (lineN) {
    const d = lineCharge(rt, m, targets, lineN);
    if (d) {
      moveMob(out, m, d.path, { dash: true });
      hit(rt, m, d.target, (sm.atk | 0) + 1, out, base.ram ? "ชนกระแทก" : "พุ่งชน");
      if (base.ram && d.target.alive && d.target.pos) push(d.target, d.dir);
      return;
    }
  }
  // ล่าผู้เล่นที่ใกล้สุด (ระยะเดินจริง) — ระยะเท่ากัน = ตัวที่อ่อนสุด
  if (targets.length && approach(rt, m, mov, adjAny(targets), (n) => Math.min(...targets.filter((t) => adjTo(t)(n)).map(weakness)), out)) {
    target = adjTarget(m.pos.x, m.pos.y, targets);
    if (target) { hit(rt, m, target, sm.atk | 0, out, "โจมตี"); return; }
    return;
  }
  // ไปหาผู้เล่นไม่ได้เลย = ไปทุบรถ
  return sabotage(rt, m, mov, [], out);
}
// ตัวป่วนรถ: เดินไปติดรถ (ทางจริง) แล้วทุบ · ติดรถอยู่แล้ว = ทุบเลย
function sabotage(rt, m, mov, targets, out) {
  if (!H().touchesVan(m.pos)) approach(rt, m, mov, (n) => H().touchesVan(n), () => 0, out);
  const t = adjTarget(m.pos.x, m.pos.y, targets);
  if (t) { hit(rt, m, t, m.summon.atk | 0, out, "โจมตี"); return; }
  if (H().touchesVan(m.pos)) hitVan(m, out);
}
function lineCharge(rt, m, targets, n) {
  const action = lazy.action(), map = action.boardMap();
  const units = action.boardUnits();
  for (const [dx, dy] of Board.DIRS) {
    const path = [{ ...m.pos }];
    for (let i = 1; i <= n; i++) {
      const x = m.pos.x + dx * i, y = m.pos.y + dy * i;
      const u = Board.unitAt(units, x, y);
      const t = u && targets.find((o) => o.id === u.id);
      if (t) return path.length > 1 ? { to: path[path.length - 1], path, target: t, dir: [dx, dy] } : null;
      if (u || Board.isObstacle(map, x, y, action.boardBlocked(m.id))) break;
      path.push({ x, y });
    }
  }
  return null;
}
function push(t, [dx, dy]) {
  const x = t.pos.x + dx, y = t.pos.y + dy;
  if (lazy.action().tileFree(x, y, t.id)) t.pos = { x, y };
}
// ตี 1 ครั้ง (หลบได้) → บันทึกลง out
function hit(rt, m, t, dmg, out, reason) {
  const combat = lazy.combat(), attack = lazy.attack();
  if (!t || !t.alive) return 0;
  if (attack.skillDodge(m, t, reason)) { out.misses.push({ id: m.id, target: t.id }); seqPush(out, { k: "mobHit", id: m.id, target: t.id, dmg: 0, dodged: true, crit: false, reason }); return 0; }
  const before = (t.hp || 0) + (t.armor || 0);
  combat.withEffectSource(m, () => combat.dealMixed(t, Math.max(1, dmg)));
  t.wasAttacked = true;
  const dealt = Math.max(0, before - ((t.hp || 0) + (t.armor || 0)));
  if (ROSTER[m.summon.mobType] && ROSTER[m.summon.mobType].slowHit && t.alive) combat.applyDebuff(t, "slow", 1, 1);
  out.attacks.push({ id: m.id, type: m.summon.mobType, x: m.pos.x, y: m.pos.y, target: t.id, dmg: dealt });
  seqPush(out, { k: "mobHit", id: m.id, target: t.id, dmg: dealt, dodged: false, crit: false, reason, kill: !t.alive || t.hp <= 0 });
  if ((!t.alive || t.hp <= 0) && !t.summon && m.summon.mobType === "devilTruck" && m.summon.boss) { m.summon.celebrate = true; radio(m, "kill"); } // แชมป์โลก: ฆ่าได้ = ฉลอง
  match.lastLog.push(`${m.name} ${reason} ${t.name} -${dealt}`);
  H().settle(t);
  counterBack(m, t, out);
  return dealt;
}
// ตีสวนมอน (ฮุค counters — ออพติมัส ไพร์ม: ผู้พิทักษ์ / counterAnyRange) ผ่าน attack.strike เต็มท่อ (หลบ/คริ/ผลตีโดน)
function counterBack(m, t, out) {
  const action = lazy.action(), attack = lazy.attack(), combat = lazy.combat();
  if (!t.alive || !t.pos || !m.alive || !m.pos || match.timeFreeze || !lazy.dim().same(m, t) || !action.counters(t, null)) return;
  const hook = require("../../characters/index")[t.characterId];
  const anyRange = !!(hook && hook.counterAnyRange && combat.runHook(hook, "counterAnyRange", require("../engine").engine, t, m));
  if (!anyRange && !Board.canCounter(action.rangeOf(t), m.pos, t.pos)) return;
  const r = attack.strike(t, m, { counter: true });
  (out.counters || (out.counters = [])).push({ id: t.id, target: m.id, dmg: r ? r.dmg : 0, dodge: !!(r && r.dodge) });
  seqPush(out, { k: "mobCounter", id: t.id, target: m.id, dmg: r ? r.dmg : 0, dodged: !!(r && r.dodge), crit: !!(r && r.crit) });
  H().settle(m);
}

// ---------- บอส 3 ตัว (หมุนตามหลัก 50 กม.: แม็กซ์ เวอร์สแตปเพน (devilTruck) → อัศวินเงามรณะ → จอร์มุนกันด์ → วนใหม่ แกร่งขึ้นตามรอบ) ----------
//  ท่าใหญ่: เตือนช่อง 1 เทิร์นก่อน (rt.combat.warn = { by, move, dir, tiles, at? } — client วาดช่องเตือน) แล้วลงผลต้นเทิร์นถัดไป
//  ทุกท่าหลบได้ (hit → attack.skillDodge) · แนว/พื้นที่หยุดที่สิ่งกีดขวาง/รถตู้ช่องแรก (ไม่ทะลุ) · fx bossMove { boss, move, from, to, tiles }
//  แม็กซ์ เวอร์สแตปเพน (ผู้ใช้สั่ง 2026-11-14 "เอารถ f1 ฟาด ไม่ก็ ขี่พุ่งชนใส่ผู้เล่น และ มีโยนใส่บ้าง"):
//   swing ฟาดรถ F1: ศัตรูอยู่ในโค้ง 3 ช่องหน้าตัว = ฟาดทันที (แทนตีปกติ) atk+1 · กระเด็น 1 ช่อง
//   ram ขี่พุ่งชน: เตือนแนวตรง → ขับทั้งแนวจนสิ่งกีดขวาง/รถตู้ atk+2 · คนบนแนวกระเด็นออกข้าง 1 ช่อง · ไปจบปลายแนว
//   throw โยนรถใส่: เตือน 3×3 รอบช่องเป้า (ระยะ ≤ 5) → atk+2 ทุกคนในวง · ซากรถตกกลางวง = สิ่งกีดขวางที่ตีพังได้ อยู่ 2 เทิร์น
//  อัศวินเงามรณะ: charge พุ่งทั้งแนว atk+2 ไปปลายแนว · slash ฟันกว้างหน้าตัว 3×2 atk+3
//  จอร์มุนกันด์: lunge ฉกยาว 6 ช่อง atk+2 + เชื่องช้า · tide คลื่นน้ำเย็นรัศมี 2 atk+1 + เชื่องช้า
const BOSS_MOVES = { devilTruck: ["ram", "throw"], darkKnight: ["charge", "slash"], jormungand: ["lunge", "lunge", "tide"] };
const MOVE = {
  charge: { bonus: 2, verb: "พุ่งชน", move: true, line: 99 }, ram: { bonus: 2, verb: "ขี่รถ F1 พุ่งชน", move: true, line: 6, aside: true },
  // ท่าเพิ่ม (ผู้ใช้ 2026-11-14 "อลังการสมชื่อบอส · MAX ฮาๆ"): ระยะ 2 ขั้น · คลั่งที่เลือดต่ำ — ดู bossPhase ด้านล่าง
  celebrate: { bonus: 0, verb: "โดนัทฉลองแชมป์", celebrate: true }, // แม็กซ์: โดนัทวง 1 (กระเด็น) + พ่นแชมเปญวง 2 (เชื่องช้า)
  wave: { bonus: 2, verb: "คลื่นดาบเงา", line: 9 }, spikes: { bonus: 2, verb: "หนามเงาผุด" },   // อัศวิน (ระยะ 2)
  sweep: { bonus: 1, verb: "ฟาดหาง", knockAway: true }, tidal: { bonus: 1, verb: "คลื่นยักษ์", push: true }, prison: { bonus: 1, verb: "คุกน้ำแข็ง", root: true }, // จอร์มุนกันด์
  slash: { bonus: 3, verb: "ฟันกว้าง" }, lunge: { bonus: 2, verb: "ฉก", slow: true, line: 6 }, tide: { bonus: 1, verb: "คลื่นน้ำแข็ง", slow: true },
  throw: { bonus: 2, verb: "โยนรถ F1 ใส่", wreck: true }, swing: { bonus: 1, verb: "ฟาดรถ F1", knock: true },
};
const THROW_RANGE = 5, WRECK = { hp: 4, armor: 0, turns: 2 };
function moveTiles(map, blocked, m, move, [dx, dy]) {
  const free = (x, y) => Board.inBounds(map, x, y) && !Board.isObstacle(map, x, y, blocked);
  const out = [], spec = MOVE[move] || {};
  if (spec.line) {
    for (let i = 1, x = m.pos.x + dx, y = m.pos.y + dy; i <= spec.line && free(x, y); i++, x += dx, y += dy) out.push({ x, y });
  } else if (move === "slash") {
    for (let d = 1; d <= 2; d++) for (let w = -1; w <= 1; w++) {
      const x = m.pos.x + dx * d + (dy ? w : 0), y = m.pos.y + dy * d + (dx ? w : 0);
      const nx = m.pos.x + dx + (dy ? w : 0), ny = m.pos.y + dy + (dx ? w : 0); // ช่องแรกของแถบตัน = แถบนั้นไม่โดน
      if (free(x, y) && free(nx, ny)) out.push({ x, y });
    }
  } else if (move === "swing") { // โค้ง 3 ช่องหน้าตัว (หน้า + ทแยงซ้าย/ขวา)
    for (const w of [-1, 0, 1]) { const x = m.pos.x + dx + (dy ? w : 0), y = m.pos.y + dy + (dx ? w : 0); if (free(x, y)) out.push({ x, y }); }
  } else if (move === "sweep") { // วงรอบตัว 8 ช่อง
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) if ((ox || oy) && free(m.pos.x + ox, m.pos.y + oy)) out.push({ x: m.pos.x + ox, y: m.pos.y + oy });
  } else if (move === "celebrate") { // วงโดนัท 1 + วงแชมเปญ 2
    for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) if ((ox || oy) && Math.abs(ox) + Math.abs(oy) <= 2 || (Math.abs(ox) === 1 && Math.abs(oy) === 1)) { if (free(m.pos.x + ox, m.pos.y + oy)) out.push({ x: m.pos.x + ox, y: m.pos.y + oy }); }
  } else if (move === "tide") {
    for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) {
      const d = Math.abs(ox) + Math.abs(oy);
      if (d && d <= 2 && free(m.pos.x + ox, m.pos.y + oy)) out.push({ x: m.pos.x + ox, y: m.pos.y + oy });
    }
  }
  return out;
}
// โยนรถ: ช่องเป้า (ระยะ ≤ 5 จากบอส) ที่วง 3×3 ครอบคนมากสุด
function throwPlan(map, blocked, m, targets) {
  let best = null;
  for (const t of targets) {
    if (!t.pos || man(t.pos, m.pos) > THROW_RANGE) continue;
    const tiles = [];
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) { const x = t.pos.x + ox, y = t.pos.y + oy; if (Board.inBounds(map, x, y) && !Board.isObstacle(map, x, y, blocked)) tiles.push({ x, y }); }
    const n = targets.filter((u) => u.pos && tiles.some((tt) => tt.x === u.pos.x && tt.y === u.pos.y)).length;
    if (!best || n > best.n) best = { at: { ...t.pos }, tiles, n };
  }
  return best;
}
// ซากรถ F1: สิ่งกีดขวางที่ตีพังได้ (ยูนิตที่ถูกเรียกฝ่ายของตัวเอง — มอนไม่เล็ง · ไม่นับเป็นมอนตอนตัดสินจบสู้) · หายเองหลัง 2 เทิร์น
function dropWreck(rt, m, center, tiles) {
  const action = lazy.action();
  const spot = action.tileFree(center.x, center.y) ? center : tiles.find((tt) => action.tileFree(tt.x, tt.y));
  if (!spot) return null;
  return lazy.summon().spawn(RT_OWNER, {
    kind: "rtWreck", pos: { ...spot }, hp: WRECK.hp, armor: WRECK.armor, mov: 0, range: [1, 0], name: "ซากรถ F1",
    img: "/roadtrip/mobs/f1car.webp", color: "#3a3f48", data: { side: "rtwreck", rtWreck: true, until: match.roundNumber + 1 + WRECK.turns, by: m.id },
  });
}
// ต้นเทิร์น: ซากที่ครบเวลาหายไป (fight.preRound)
function expireWrecks() {
  const turn = match.roundNumber + 1, out = [];
  for (const p of Object.values(match.players)) if (p.summon && p.summon.rtWreck && p.alive && p.pos && p.summon.until <= turn) { out.push({ id: p.id, x: p.pos.x, y: p.pos.y }); lazy.summon().remove(p); }
  return out;
}
function knock(t, [dx, dy]) { if (t.alive && t.pos && lazy.action().tileFree(t.pos.x + dx, t.pos.y + dy, t.id)) t.pos = { x: t.pos.x + dx, y: t.pos.y + dy }; }
function bossFx(m, move, from, to, tiles, out = null) {
  const e = { boss: m.summon.mobType, id: m.id, move, from: { ...from }, to: to ? { ...to } : null, tiles: tiles.map((t) => ({ x: t.x, y: t.y })) };
  H().fx("bossMove", e);
  if (out) seqPush(out, { k: "bossMove", ...e });
}
// ---------- ระยะของบอส + คลั่ง + ชุดท่าตามระยะ (ผู้ใช้ 2026-11-14) ----------
//  ระยะ 1 (> 50%) → ระยะ 2 (≤ 50% · ปลดท่าใหม่ + เหตุการณ์ระยะ) → ระยะ 3 คลั่ง (≤ 20% · ATK +1 เดิน +1) — rt.combat.bossPhase
//  แม็กซ์: พิทสต็อป (≤ 50% และ ≤ 20% ครั้งละหน: หลบทุกอย่าง 1 เทิร์น ฟื้น 25% รถใหม่ พุ่ง +1) · DRS (ตาหน้าเดิน ×2 พุ่งยาว +3)
//   · ล็อกล้อ (พุ่ง 20% หมุนติ้วมึน 1 เทิร์น) · แชมป์โลก (ฆ่าผู้เล่น/เข้าระยะ 2 = โดนัท + แชมเปญ) · วิทยุทีม (fx radio)
//  อัศวิน ระยะ 2: เงาอัศวิน 2 ตัว (ตัวล่อ อ่อน) + คลื่นดาบเงา/หนามเงา · จอร์มุนกันด์ ระยะ 2: ถนนเป็นน้ำแข็ง (ลื่น 3 เทิร์น) + คลื่นยักษ์/คุกน้ำแข็ง
const RADIO = {
  pitstop: ["บ๊อกซ์ บ๊อกซ์!", "Box, box!"], drs: ["DRS เปิด!", "DRS enabled!"], spinout: ["ยางหมดแล้ว!", "No grip, no grip!"],
  kill: ["Simply lovely!", "แซงแล้ว!"], celebrate: ["ดู ดู ดู ดู~", "แชมป์โลก!"], phase2: ["Push now!", "ไปกันเต็มสูบ!"], enrage: ["Full push!", "ห้ามยกคันเร่ง!"],
};
function radio(m, key) { const list = RADIO[key]; if (list && m.summon.mobType === "devilTruck") H().fx("radio", { id: m.id, boss: "devilTruck", key, text: list[Math.floor(Math.random() * list.length)] }); }
function movesFor(m) {
  const sm = m.summon, ph = sm.phase || 1;
  if (sm.mobType === "darkKnight") return ph >= 2 ? ["wave", "spikes", "slash", "charge"] : ["charge", "slash"];
  if (sm.mobType === "jormungand") return ph >= 2 ? ["tidal", "prison", "lunge", "sweep", "tide"] : ["lunge", "sweep", "tide"];
  return BOSS_MOVES[sm.mobType] || BOSS_MOVES.devilTruck;
}
const phaseByHp = (m) => { const f = m.hp / Math.max(1, m.summon.maxHp); return f <= 0.2 ? 3 : f <= 0.5 ? 2 : 1; };
// ต้นตาของบอส: อัปเดตระยะ (+เหตุการณ์ระยะ) · พิทสต็อปของแม็กซ์ (กินทั้งตา) → true = จบตานี้
function bossPre(rt, m, targets, out) {
  const sm = m.summon, c = rt.combat, round = match.roundNumber + 1;
  const ph = Math.max(sm.phase || 1, phaseByHp(m));
  if (ph !== (sm.phase || 1)) {
    const prev = sm.phase || 1;
    sm.phase = ph;
    c.bossPhase = ph;
    H().fx("bossPhase", { id: m.id, boss: sm.mobType, phase: ph });
    if (prev < 2 && ph >= 2) phase2(rt, m, targets, out);
    if (ph >= 3 && !sm.enraged) { sm.enraged = true; sm.atk = (sm.atk | 0) + 1; sm.mov = (sm.mov | 0) + 1; H().fx("enrage", { id: m.id, boss: sm.mobType }); radio(m, "enrage"); match.lastLog.push(`🔥 ${m.name} คลั่ง!`); }
  }
  if (sm.mobType === "devilTruck") {
    const f = m.hp / Math.max(1, sm.maxHp);
    if ((f <= 0.5 && !sm.pit1) || (f <= 0.2 && !sm.pit2)) {
      if (f <= 0.2) sm.pit2 = true; sm.pit1 = true;
      c.warn = c.warn && c.warn.by === m.id ? null : c.warn; // เข้าพิท = ยกเลิกท่าที่เล็งไว้
      const heal = Math.ceil(sm.maxHp * 0.25);
      m.hp = Math.min(sm.maxHp, m.hp + heal);
      sm.car = (sm.car | 0) + 1; // รถใหม่: พุ่งแรงขึ้น
      lazy.combat().applyBuff(m, "evade", 100, 1); // หลบทุกอย่างตลอดเทิร์นนี้ (ทีมพิทบัง)
      sm.drs = round + 1;
      const crew = 4 + Math.floor(Math.random() * 3);
      H().fx("pitstop", { id: m.id, x: m.pos.x, y: m.pos.y, crew, time: "1.8 วิ", heal });
      seqPush(out, { k: "bossMove", boss: "devilTruck", id: m.id, move: "pitstop", from: { ...m.pos }, to: null, tiles: [] });
      radio(m, "pitstop");
      match.lastLog.push(`🔧 ${m.name} เข้าพิท ${"1.8 วิ"}! ฟื้น +${heal}`);
      return true;
    }
    if (sm.drs === round) { H().fx("drs", { id: m.id }); radio(m, "drs"); }
    else if (!sm.drs || sm.drs < round) { if ((sm.moveNo | 0) % 3 === 2) sm.drs = round + 1; }
  }
  return false;
}
function phase2(rt, m, targets, out) {
  const sm = m.summon, action = lazy.action();
  if (sm.mobType === "devilTruck") { sm.celebrate = true; radio(m, "phase2"); return; }
  if (sm.mobType === "darkKnight") { // เงาอัศวิน 2 ตัว (ตัวล่อ)
    const list = [];
    for (let i = 0; i < 2; i++) {
      const at = action.nearFreeTile(m.pos);
      if (!at) break;
      const d = spawn(rt, "darkKnight", at, { born: match.roundNumber + 1 });
      if (!d) continue;
      Object.assign(d.summon, { boss: false, decoy: true, atk: 1, gold: 0, role: "hunter", maxHp: 3, maxArmor: 0 });
      d.hp = 3; d.armor = 0; d.name = "เงาอัศวิน";
      list.push({ id: d.id, x: d.pos.x, y: d.pos.y });
    }
    H().fx("shadowClones", { id: m.id, list });
    match.lastLog.push(`🌑 ${m.name} แยกเงา!`);
    return;
  }
  if (sm.mobType === "jormungand") { // ถนนเป็นน้ำแข็ง (ลื่น) รอบผู้เล่น
    const Ice = require("../ice"), map = action.boardMap(), tiles = [];
    for (const t of targets) for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const x = t.pos.x + ox, y = t.pos.y + oy;
      if (tiles.length >= 12 || !Board.inBounds(map, x, y) || Board.specialAt(map, x, y)) continue; // ไม่แช่ช่องพิเศษ (ในรถตู้)
      if (Ice.layIce(x, y, null, { turns: 3 })) tiles.push({ x, y });
    }
    H().fx("freezeRoad", { id: m.id, tiles });
    match.lastLog.push(`❄️ ${m.name} แช่แข็งถนน!`);
  }
}
// แผนท่าพิเศษที่เล็งตามตำแหน่งผู้เล่น (ไม่ใช่ทิศ)
function specialPlan(map, blocked, m, move, targets) {
  const free = (x, y) => Board.inBounds(map, x, y) && !Board.isObstacle(map, x, y, blocked);
  if (move === "spikes") { // หนามผุดใต้ผู้เล่นในระยะ 6 (สูงสุด 3 คน)
    const tiles = targets.filter((t) => t.pos && man(t.pos, m.pos) <= 6).slice(0, 3).map((t) => ({ x: t.pos.x, y: t.pos.y }));
    return tiles.length ? { move, dir: null, tiles, n: tiles.length } : null;
  }
  if (move === "prison") { // คุกน้ำแข็ง: คนที่ใกล้สุดในระยะ 6
    const t = targets.filter((u) => u.pos && man(u.pos, m.pos) <= 6).sort((a, b) => man(a.pos, m.pos) - man(b.pos, m.pos))[0];
    return t ? { move, dir: null, tiles: [{ x: t.pos.x, y: t.pos.y }], n: 1 } : null;
  }
  if (move === "tidal") { // คลื่นยักษ์ 2 แถวเต็มความกว้าง — ดันออกห่างบอส 1 ช่อง
    let best = null;
    for (let y = 0; y < map.rows - 1; y++) {
      const tiles = [];
      for (const yy of [y, y + 1]) for (let x = 0; x < map.cols; x++) if (free(x, yy)) tiles.push({ x, y: yy });
      const n = targets.filter((t) => t.pos && (t.pos.y === y || t.pos.y === y + 1)).length;
      if (n > 0 && (!best || n > best.n)) best = { move, dir: [0, y + 0.5 >= m.pos.y ? 1 : -1], tiles, n };
    }
    return best;
  }
  if (move === "celebrate") { const tiles = moveTiles(map, blocked, m, "celebrate", [1, 0]); return { move, dir: null, tiles, n: Math.max(1, targets.filter((t) => t.pos && tiles.some((tt) => tt.x === t.pos.x && tt.y === t.pos.y)).length) }; }
  return undefined; // ไม่ใช่ท่าพิเศษ
}
function bossAct(rt, m, targets, out) {
  const c = rt.combat, sm = m.summon;
  const action = lazy.action(), map = action.boardMap();
  const blocked = action.boardBlocked(m.id);
  const onTiles = (tiles) => targets.filter((t) => t.pos && tiles.some((tt) => Board.covers({ ...t.pos, size: action.sizeOf(t) }, tt.x, tt.y)));
  if (bossPre(rt, m, targets, out)) return;
  if (c.warn && c.warn.by === m.id) {
    const w = c.warn; c.warn = null;
    const spec = MOVE[w.move] || MOVE.charge;
    // ช่องที่เตือนไว้ ตัดที่สิ่งกีดขวางที่เพิ่งเกิด — แนวหยุดตรงนั้น · พื้นที่ข้ามช่องนั้น
    let tiles = [];
    if (spec.line) { for (const tt of w.tiles) { if (Board.isObstacle(map, tt.x, tt.y, blocked)) break; tiles.push(tt); } }
    else tiles = w.tiles.filter((tt) => !Board.isObstacle(map, tt.x, tt.y, blocked));
    const from = { ...m.pos };
    const victims = onTiles(tiles);
    const carBonus = w.move === "ram" ? (sm.car | 0) : 0;
    for (const v of victims) {
      if (spec.celebrate) { // โดนัท (ติดตัว 8 ช่อง) = ตี + กระเด็น · แชมเปญ (วงนอก) = เชื่องช้าถ้าไม่หลบ
        const near = Math.max(Math.abs(v.pos.x - m.pos.x), Math.abs(v.pos.y - m.pos.y)) <= 1;
        if (near) { const dealt = hit(rt, m, v, Math.max(1, sm.atk | 0), out, "โดนัทฉลองแชมป์"); if (dealt > 0) knock(v, [Math.sign(v.pos.x - m.pos.x), Math.sign(v.pos.y - m.pos.y)]); }
        else if (!lazy.attack().skillDodge(m, v, "พ่นแชมเปญ")) lazy.combat().applyDebuff(v, "slow", 1, 1);
        continue;
      }
      const dealt = hit(rt, m, v, (sm.atk | 0) + spec.bonus + carBonus, out, spec.verb);
      if (spec.slow && dealt > 0 && v.alive) lazy.combat().applyDebuff(v, "slow", 1, 1);
      if (spec.root && dealt > 0 && v.alive) lazy.combat().applyDebuff(v, "rooted", 1, 1);
      if (spec.knockAway && dealt > 0 && v.alive && v.pos) knock(v, [Math.sign(v.pos.x - m.pos.x), Math.sign(v.pos.y - m.pos.y)]);
      if (spec.push && dealt > 0 && v.alive && w.dir) knock(v, w.dir);
      if (spec.aside && dealt > 0 && v.alive && w.dir) { const [dx] = w.dir; const side = Math.random() < 0.5 ? 1 : -1; knock(v, dx ? [0, side] : [side, 0]); } // กระเด็นออกข้างแนว
    }
    let to = w.at || null;
    if (spec.move) { // ปลายแนว: ช่องว่างสุดท้าย
      const end = [...tiles].reverse().find((tt) => action.tileFree(tt.x, tt.y, m.id));
      if (end) { moveMob(out, m, [{ ...m.pos }, ...tiles.slice(0, tiles.indexOf(end) + 1)], { dash: true }); to = end; }
    }
    if (spec.wreck && w.at) { const wr = dropWreck(rt, m, w.at, tiles); if (wr) out.wrecks = [...(out.wrecks || []), { id: wr.id, x: wr.pos.x, y: wr.pos.y }]; }
    if (spec.celebrate) { sm.celebrate = false; H().fx("donut", { id: m.id, x: m.pos.x, y: m.pos.y }); H().fx("champagne", { id: m.id, tiles }); radio(m, "celebrate"); }
    if (w.move === "ram" && Math.random() < 0.2) { // ล็อกล้อ: หมุนติ้วมึน 1 เทิร์น
      m.statuses.stun = Math.max(m.statuses.stun || 0, 2); // tickControl ลดหลังตานี้ 1 → ข้ามตาหน้าจริง 1 ครั้ง
      H().fx("spinout", { id: m.id, x: m.pos.x, y: m.pos.y }); radio(m, "spinout");
      match.lastLog.push(`🌀 ${m.name} ล็อกล้อหมุนติ้ว!`);
    }
    out.charges.push({ id: m.id, move: w.move, type: sm.mobType, tiles, hit: victims.map((v) => v.id) });
    bossFx(m, w.move, from, to, tiles, out);
    // ท่าใหญ่ลงแล้วยังมีคนติดตัว = ตีต่อ (ไม่ปล่อยให้ยืนเฉย)
    const adj2 = adjTarget(m.pos.x, m.pos.y, prey(m));
    if (adj2 && sm.mobType !== "devilTruck") hit(rt, m, adj2, sm.atk | 0, out, "โจมตี");
    return;
  }
  // ตาปกติ: แม็กซ์ฟาดรถ F1 (โค้งหน้าตัว) · บอสอื่นตีคนที่ติดตัว
  if (sm.mobType === "devilTruck") {
    let sw = null;
    for (const dir of Board.DIRS) { const tiles = moveTiles(map, blocked, m, "swing", dir); const vs = onTiles(tiles); if (vs.length && (!sw || vs.length > sw.vs.length)) sw = { dir, tiles, vs }; }
    if (sw) {
      for (const v of sw.vs) { const dealt = hit(rt, m, v, (sm.atk | 0) + MOVE.swing.bonus, out, MOVE.swing.verb); if (dealt > 0) knock(v, sw.dir); }
      bossFx(m, "swing", m.pos, { x: m.pos.x + sw.dir[0], y: m.pos.y + sw.dir[1] }, sw.tiles, out);
    }
  } else {
    const adj = adjTarget(m.pos.x, m.pos.y, targets);
    if (adj) hit(rt, m, adj, sm.atk | 0, out, "โจมตี");
  }
  // ท่าใหญ่: เลือกท่าที่โดนผู้เล่นมากสุดจากชุดท่าของบอสตัวนี้ (เท่ากัน = ตามลำดับหมุนเวียน) · ทิศ/จุดที่โดนมากสุด
  const seq = sm.celebrate ? ["celebrate"] : movesFor(m); // แชมป์โลกค้างอยู่ = ฉลองก่อน
  const drsNow = sm.drs === match.roundNumber + 1;
  const planOf = (move) => {
    if (move === "throw") { const tp = throwPlan(map, blocked, m, targets); return tp && tp.n > 0 ? { move, dir: null, tiles: tp.tiles, n: tp.n, at: tp.at } : null; }
    const sp = specialPlan(map, blocked, m, move, targets);
    if (sp !== undefined) return sp;
    if (move === "ram" && drsNow) { // DRS: พุ่งยาว +3
      let b = null;
      for (const dir of Board.DIRS) {
        const tiles = [];
        for (let i = 1, x = m.pos.x + dir[0], y = m.pos.y + dir[1]; i <= MOVE.ram.line + 3 && Board.inBounds(map, x, y) && !Board.isObstacle(map, x, y, blocked); i++, x += dir[0], y += dir[1]) tiles.push({ x, y });
        const n = onTiles(tiles).length;
        if (n > 0 && (!b || n > b.n)) b = { move, dir, tiles, n };
      }
      return b;
    }
    let b = null;
    for (const dir of move === "tide" ? [[1, 0]] : Board.DIRS) {
      const tiles = moveTiles(map, blocked, m, move, dir);
      const n = onTiles(tiles).length;
      if (n > 0 && (!b || n > b.n)) b = { move, dir, tiles, n };
    }
    return b;
  };
  const start = (sm.moveNo | 0) % seq.length;
  let best = null;
  for (let i = 0; i < seq.length; i++) { const pl = planOf(seq[(start + i) % seq.length]); if (pl && (!best || pl.n > best.n)) best = pl; }
  if (!best && targets.length) {
    // ไม่มีใครในระยะท่าไหนเลย = เดินเข้าหาผู้เล่นใกล้สุด (ทางจริง · ไม่ถอยหนี) — มีคนติดตัวอยู่แล้ว = ยืนสู้
    if (!adjTarget(m.pos.x, m.pos.y, targets)) {
      approach(rt, m, Math.max(1, action.movOf(m) | 0) * (drsNow ? 2 : 1), adjAny(targets), (n) => Math.min(...targets.filter((t) => adjTo(t)(n)).map(weakness)), out);
      const adj3 = adjTarget(m.pos.x, m.pos.y, targets);
      if (adj3) { // ถึงตัวแล้ว = ตีในตาเดียวกัน
        if (sm.mobType === "devilTruck") {
          const dir = [Math.sign(adj3.pos.x - m.pos.x), Math.sign(adj3.pos.y - m.pos.y)];
          const d2 = dir[0] && dir[1] ? [dir[0], 0] : dir;
          const tiles = moveTiles(map, action.boardBlocked(m.id), m, "swing", d2);
          for (const v of onTiles(tiles)) { const dealt = hit(rt, m, v, (sm.atk | 0) + MOVE.swing.bonus, out, MOVE.swing.verb); if (dealt > 0) knock(v, d2); }
          bossFx(m, "swing", m.pos, { x: m.pos.x + d2[0], y: m.pos.y + d2[1] }, tiles, out);
        } else hit(rt, m, adj3, sm.atk | 0, out, "โจมตี");
      }
    }
    return;
  }
  if (best) {
    sm.moveNo = sm.celebrate ? (sm.moveNo | 0) : seq.indexOf(best.move) + 1;
    c.warn = { by: m.id, move: best.move, axis: best.dir ? (best.dir[0] ? "row" : "col") : null, dir: best.dir, tiles: best.tiles, ...(best.at ? { at: best.at } : {}) };
    out.warns.push({ id: m.id, move: best.move, type: sm.mobType, tiles: best.tiles, ...(best.at ? { at: best.at } : {}) });
    seqPush(out, { k: "bossWarn", id: m.id, boss: sm.mobType, move: best.move, tiles: best.tiles.map((t) => ({ x: t.x, y: t.y })), ...(best.at ? { at: best.at } : {}) });
  }
}
// บอสของหลักนี้ (นับครั้งที่เจอบอส 0, 1, 2 … วนทุก 3)
const BOSSES = ["devilTruck", "darkKnight", "jormungand"];
function bossOf(n) { return BOSSES[((n | 0) % BOSSES.length + BOSSES.length) % BOSSES.length]; }
// สู้บนรถตู้ (รถกำลังวิ่ง — กฎผู้ใช้ 2026-11-14): เฉพาะมอนที่วิ่งไล่รถได้
const CHASERS = ["biker", "crow", "stray", "trucker", "boar", "saberclaw", "ghost"];

module.exports = { SIDE, KIND, RT_OWNER, ROSTER, ATK_CAP, MOB_CAP, BOSSES, BOSS_MOVES, CHASERS, WRECK, THROW_RANGE, bossOf, moveTiles, expireWrecks, movesFor, bossPre, phaseByHp, RADIO, assignRoles, approach, SABOTEUR_SHARE, scale, poolFor, waveSize, spawn, isMob, mobs, prey, freeAt, actAll, actOne, hit, reach };
