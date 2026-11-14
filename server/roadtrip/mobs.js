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
    && (!m || (Dim.same(m, p) && !Vis.hiddenFromUnit(m, p) && action.tauntAllows(m, p))));
}

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
function actOne(rt, m, out) {
  const sm = m.summon, base = ROSTER[sm.mobType] || ROSTER.stray;
  const action = lazy.action();
  const mov = Math.max(0, action.movOf(m) | 0);
  // หนาม (กระบองเพชร): ทุกคนที่ติดตัวโดน 1 ต้นตา
  if (base.thorns) for (const t of prey(m)) if (t.pos && Board.dist(Board.boxOf(t), m.pos) === 1) hit(rt, m, t, base.thorns, out, "หนามทิ่ม");
  const targets = prey(m);
  if (sm.boss) return bossAct(rt, m, targets, out);
  // พุ่ง (แก๊งมอเตอร์ไซค์ / หมูป่า) / ชนแนว (ซอมบี้รถบรรทุก): มีเป้าในแนวตรง ≤ N ช่อง ทางโล่ง = พุ่งไปติดแล้วตีแรง +1
  const lineN = base.dash || base.ram || 0;
  if (lineN && !adjTarget(m.pos.x, m.pos.y, targets)) {
    const d = lineCharge(rt, m, targets, lineN);
    if (d) {
      out.moves.push({ id: m.id, type: sm.mobType, from: { ...m.pos }, to: { ...d.to }, path: d.path, dash: true });
      m.pos = { ...d.to };
      hit(rt, m, d.target, (sm.atk | 0) + 1, out, base.ram ? "ชนกระแทก" : "พุ่งชน");
      if (base.ram && d.target.alive && d.target.pos) push(d.target, d.dir);
      return;
    }
  }
  let target = adjTarget(m.pos.x, m.pos.y, targets);
  if (!target && mov > 0 && targets.length) {
    const stops = reach(rt, m, mov);
    let best = null, bestScore = Infinity;
    for (const n of stops.values()) {
      const t = adjTarget(n.x, n.y, targets);
      const score = t ? n.d * 0.01 + ((t.hp || 0) + (t.armor || 0)) * 0.001 : 100 + Math.min(...targets.filter((u) => u.pos).map((u) => Board.dist(Board.boxOf(u), { x: n.x, y: n.y, size: 1 })));
      if (score < bestScore) { bestScore = score; best = n; }
    }
    if (best && (best.x !== m.pos.x || best.y !== m.pos.y)) {
      out.moves.push({ id: m.id, type: sm.mobType, from: { ...m.pos }, to: { x: best.x, y: best.y }, path: pathFrom(stops, best.x, best.y) });
      m.pos = { x: best.x, y: best.y };
    }
    target = adjTarget(m.pos.x, m.pos.y, targets);
  }
  if (target) { hit(rt, m, target, sm.atk | 0, out, "โจมตี"); return; }
  // ไม่มีใครติดตัว แต่ติดรถตู้ = ทุบรถ
  if (H().touchesVan(m.pos)) { H().hurtVan(1, "mob", m.id); out.van.push({ id: m.id, x: m.pos.x, y: m.pos.y, dmg: 1 }); }
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
  if (attack.skillDodge(m, t, reason)) { out.misses.push({ id: m.id, target: t.id }); return 0; }
  const before = (t.hp || 0) + (t.armor || 0);
  combat.withEffectSource(m, () => combat.dealMixed(t, Math.max(1, dmg)));
  t.wasAttacked = true;
  const dealt = Math.max(0, before - ((t.hp || 0) + (t.armor || 0)));
  if (ROSTER[m.summon.mobType] && ROSTER[m.summon.mobType].slowHit && t.alive) combat.applyDebuff(t, "slow", 1, 1);
  out.attacks.push({ id: m.id, type: m.summon.mobType, x: m.pos.x, y: m.pos.y, target: t.id, dmg: dealt });
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
  charge: { bonus: 2, verb: "พุ่งชน", move: true, line: 99 }, ram: { bonus: 2, verb: "ขี่รถ F1 พุ่งชน", move: true, line: 99, aside: true },
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
function bossFx(m, move, from, to, tiles) { H().fx("bossMove", { boss: m.summon.mobType, id: m.id, move, from: { ...from }, to: to ? { ...to } : null, tiles: tiles.map((t) => ({ x: t.x, y: t.y })) }); }
function bossAct(rt, m, targets, out) {
  const c = rt.combat, sm = m.summon;
  const action = lazy.action(), map = action.boardMap();
  const blocked = action.boardBlocked(m.id);
  const onTiles = (tiles) => targets.filter((t) => t.pos && tiles.some((tt) => Board.covers({ ...t.pos, size: action.sizeOf(t) }, tt.x, tt.y)));
  if (c.warn && c.warn.by === m.id) {
    const w = c.warn; c.warn = null;
    const spec = MOVE[w.move] || MOVE.charge;
    // ช่องที่เตือนไว้ ตัดที่สิ่งกีดขวางที่เพิ่งเกิด — แนวหยุดตรงนั้น · พื้นที่ข้ามช่องนั้น
    let tiles = [];
    if (spec.line) { for (const tt of w.tiles) { if (Board.isObstacle(map, tt.x, tt.y, blocked)) break; tiles.push(tt); } }
    else tiles = w.tiles.filter((tt) => !Board.isObstacle(map, tt.x, tt.y, blocked));
    const from = { ...m.pos };
    const victims = onTiles(tiles);
    for (const v of victims) {
      const dealt = hit(rt, m, v, (sm.atk | 0) + spec.bonus, out, spec.verb);
      if (spec.slow && dealt > 0 && v.alive) lazy.combat().applyDebuff(v, "slow", 1, 1);
      if (spec.aside && dealt > 0 && v.alive && w.dir) { const [dx] = w.dir; const side = Math.random() < 0.5 ? 1 : -1; knock(v, dx ? [0, side] : [side, 0]); } // กระเด็นออกข้างแนว
    }
    let to = w.at || null;
    if (spec.move) { // ปลายแนว: ช่องว่างสุดท้าย
      const end = [...tiles].reverse().find((tt) => action.tileFree(tt.x, tt.y, m.id));
      if (end) { out.moves.push({ id: m.id, type: sm.mobType, from: { ...m.pos }, to: { ...end }, path: [{ ...m.pos }, { ...end }], dash: true }); m.pos = { ...end }; to = end; }
    }
    if (spec.wreck && w.at) { const wr = dropWreck(rt, m, w.at, tiles); if (wr) out.wrecks = [...(out.wrecks || []), { id: wr.id, x: wr.pos.x, y: wr.pos.y }]; }
    out.charges.push({ id: m.id, move: w.move, type: sm.mobType, tiles, hit: victims.map((v) => v.id) });
    if (sm.mobType === "devilTruck") bossFx(m, w.move, from, to, tiles);
    return;
  }
  // ตาปกติ: แม็กซ์ฟาดรถ F1 (โค้งหน้าตัว) · บอสอื่นตีคนที่ติดตัว
  if (sm.mobType === "devilTruck") {
    let sw = null;
    for (const dir of Board.DIRS) { const tiles = moveTiles(map, blocked, m, "swing", dir); const vs = onTiles(tiles); if (vs.length && (!sw || vs.length > sw.vs.length)) sw = { dir, tiles, vs }; }
    if (sw) {
      for (const v of sw.vs) { const dealt = hit(rt, m, v, (sm.atk | 0) + MOVE.swing.bonus, out, MOVE.swing.verb); if (dealt > 0) knock(v, sw.dir); }
      bossFx(m, "swing", m.pos, { x: m.pos.x + sw.dir[0], y: m.pos.y + sw.dir[1] }, sw.tiles);
    }
  } else {
    const adj = adjTarget(m.pos.x, m.pos.y, targets);
    if (adj) hit(rt, m, adj, sm.atk | 0, out, "โจมตี");
  }
  // ท่าใหญ่ถัดไปตามลำดับของบอสตัวนี้ → เลือกทิศ/จุดที่โดนคนมากสุด
  const seq = BOSS_MOVES[sm.mobType] || BOSS_MOVES.devilTruck;
  const move = seq[(sm.moveNo | 0) % seq.length];
  let best = null;
  if (move === "throw") { const tp = throwPlan(map, blocked, m, targets); if (tp && tp.n > 0) best = { dir: null, tiles: tp.tiles, n: tp.n, at: tp.at }; else sm.moveNo = (sm.moveNo | 0) + 1; } // ไม่มีใครในระยะโยน = ตาหน้าใช้ท่าถัดไป
  else for (const dir of move === "tide" ? [[1, 0]] : Board.DIRS) {
    const tiles = moveTiles(map, blocked, m, move, dir);
    const n = onTiles(tiles).length;
    if (n > 0 && (!best || n > best.n)) best = { dir, tiles, n };
  }
  if (!best && targets.length) { // ไม่มีใครในระยะท่า = ขยับเข้าหาแล้วเล็งใหม่ตาหน้า
    const stops = reach(rt, m, Math.max(1, action.movOf(m) | 0));
    let pick = null, bd = Infinity;
    for (const n of stops.values()) {
      const d = Math.min(...targets.filter((t) => t.pos).map((t) => Math.min(Math.abs(t.pos.x - n.x), Math.abs(t.pos.y - n.y)) + (move === "tide" || move === "slash" ? Math.abs(t.pos.x - n.x) + Math.abs(t.pos.y - n.y) : 0)));
      if (d < bd) { bd = d; pick = n; }
    }
    if (pick && (pick.x !== m.pos.x || pick.y !== m.pos.y)) { out.moves.push({ id: m.id, type: sm.mobType, from: { ...m.pos }, to: { x: pick.x, y: pick.y }, path: pathFrom(stops, pick.x, pick.y) }); m.pos = { x: pick.x, y: pick.y }; }
    return;
  }
  if (best) {
    sm.moveNo = (sm.moveNo | 0) + 1;
    c.warn = { by: m.id, move, axis: best.dir ? (best.dir[0] ? "row" : "col") : null, dir: best.dir, tiles: best.tiles, ...(best.at ? { at: best.at } : {}) };
    out.warns.push({ id: m.id, move, type: sm.mobType, tiles: best.tiles, ...(best.at ? { at: best.at } : {}) });
  }
}
// บอสของหลักนี้ (นับครั้งที่เจอบอส 0, 1, 2 … วนทุก 3)
const BOSSES = ["devilTruck", "darkKnight", "jormungand"];
function bossOf(n) { return BOSSES[((n | 0) % BOSSES.length + BOSSES.length) % BOSSES.length]; }
// สู้บนรถตู้ (รถกำลังวิ่ง — กฎผู้ใช้ 2026-11-14): เฉพาะมอนที่วิ่งไล่รถได้
const CHASERS = ["biker", "crow", "stray", "trucker", "boar", "saberclaw", "ghost"];

module.exports = { SIDE, KIND, RT_OWNER, ROSTER, ATK_CAP, MOB_CAP, BOSSES, BOSS_MOVES, CHASERS, WRECK, THROW_RANGE, bossOf, moveTiles, expireWrecks, scale, poolFor, waveSize, spawn, isMob, mobs, prey, freeAt, actAll, actOne, hit, reach };
