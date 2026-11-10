// ============================================================
//  สนาม Eos — ระบบ PVE รอบสาม (GRID_PLAN §8.6 "PVE รอบสาม" · ผู้ใช้สั่ง 2026-11-10 "เอาครบเลย" — ตัวเลขทั้งหมด Claude ตั้ง)
//   คืนสุดท้าย (แต้ม ≥ 40 = คืนถาวร + คลื่นบุกเสา) · พลังประจำเสา (ยึดเสาโซนไหน ทั้งทีมได้ความสามารถของโซนนั้น)
//   ท่าร่วม (ตีมอนที่เพื่อนตีไปแล้วในเทิร์นเดียวกัน = ตี +1) · รังปีศาจ (กลางวันโผล่ · ค่ำพ่นปีศาจ) · ยักษ์หินเดินผ่านแผนที่
//   แสงไฟแคมป์ (ปีศาจเข้าวงไฟไม่ได้) · พลเรือนติดค้าง (พาเข้าเมือง) · มาตรวัดทีม (เต็ม = ถล่ม 5×5) · ฉายาจบเกม
//  stage6.js เรียกผ่านฮุคเล็กๆ (preRound · onUnitEnd · onMobDeath · atkBonus · movMod · hud/action · publicInfo)
//  H = helper จาก stage6 (กัน require วน) · สถานะ = s.x (สร้างใน init)
// ============================================================
const E = require("./eosEvents");
const K = (x, y) => `${x},${y}`;
const lazySummon = () => require("../summon");
const lazyShop = () => require("../shop");

const FINAL = { at: 40, perPillar: 2, near: [3, 6] };
const POWER = { turretDmg: 2, turretRange: 6, fountainR: 3, fountainHeal: 1, chocoMov: 1, carMov: 1, ramDmg: 1 };
const COMBO = { atk: 1 };
const NEST = { hp: 8, armor: 1, gold: 3, max: 3, burst: 3, drip: 1, gap: 8 };
const GIANT = { hp: 36, armor: 3, gold: 5, from: 6, every: 8, step: 4, dmg: 3, score: 4 };
const LIGHT = { r: 2 };
const CIV = { hp: 4, max: 2, score: 2, gold: 4, looks: 6 };
const GAUGE = { max: 20, kill: 1, combo: 1, nest: 2, boss: 5, giant: 5, dmg: 4, r: 2 };
const TITLES = [
  { key: "kills", icon: "⚔️", name: "นักล่า" },
  { key: "combos", icon: "🤝", name: "คู่หูมือฉมัง" },
  { key: "saves", icon: "🕊️", name: "ผู้ช่วยชีวิต" },
  { key: "guard", icon: "🔷", name: "ผู้พิทักษ์เสา" },
  { key: "nests", icon: "🔥", name: "ผู้ทำลายรัง" },
];
// พลังประจำเสา (โซนของเสา → ผล)
const POWERS = {
  insomnia: { icon: "🔫", name: "ป้อมปืนอัตโนมัติ" },
  altissia: { icon: "⛲", name: "น้ำพุฟื้นฟู" },
  duscae: { icon: "🐤", name: "โชโกโบะเร็วขึ้น" },
  hammerhead: { icon: "🚗", name: "รถแรงขึ้น" },
  lake: { icon: "🎣", name: "ตกปลานำโชค" },
};

function init(s) {
  s.x = { final: null, hitBy: {}, marks: {}, gauge: 0, nestDay: 0, giant: null, giantNext: GIANT.from, stats: {}, seq: 0 };
  return s.x;
}
const X = (s) => s.x || init(s);
const people = (ctx) => Object.values(ctx.match.players).filter((p) => !p.summon && !p.duoOf);
const isHero = (H, p) => !!(p && !H.isMob(p) && (!p.summon || p.summon.controlled));
const ownerOf = (ctx, p) => (p && p.summon && p.summon.controlled ? ctx.match.players[p.summon.ownerId] || p : p);
function stat(s, pid, key, n = 1) {
  if (!pid) return;
  const st = (X(s).stats[pid] ||= {});
  st[key] = (st[key] || 0) + n;
}
function addGauge(ctx, s, n) {
  n *= require("./eosPerks").gaugeMul(s); // การ์ดใจเดียวกัน = ×2
  const x = X(s), was = x.gauge;
  x.gauge = Math.min(GAUGE.max, x.gauge + n);
  if (was < GAUGE.max && x.gauge >= GAUGE.max) { ctx.fx("gauge_full", {}); ctx.log("☄️ มาตรวัดทีมเต็ม — พร้อมถล่ม!"); }
  if (x.gauge !== was) ctx.bump();
}

// ---------- แสงไฟแคมป์ (ปีศาจเข้าวงไฟไม่ได้ · ราชาปีศาจไม่กลัวไฟ) ----------
function lightSafe(H, x, y) { return H.MAP.CAMPS.some(([cx, cy]) => Math.abs(cx - x) + Math.abs(cy - y) <= LIGHT.r); }
const fearsLight = (m) => !!(m && m.summon && m.summon.mobType === "daemon" && m.summon.trait !== "boss");

// ---------- พลังประจำเสา ----------
const held = (s, zone) => s.pillars.some((pl) => pl.zone === zone && pl.owner);
function powersOf(s) { return Object.keys(POWERS).filter((z) => held(s, z)); }
function powerRound(ctx, s, H) {
  let secs = 0;
  if (held(s, "insomnia")) {
    const shots = [], used = new Set();
    for (const t of H.TURRETS) {
      const m = H.mobsOf(ctx).filter((u) => !used.has(u.id) && H.manhattan(u.pos, t) <= POWER.turretRange).sort((a, b) => H.manhattan(a.pos, t) - H.manhattan(b.pos, t))[0];
      if (!m) continue;
      used.add(m.id);
      const to = { ...m.pos }, dealt = H.hurt(ctx, m, POWER.turretDmg);
      shots.push({ from: { x: t.x, y: t.y }, to, target: m.id, dmg: dealt });
    }
    if (shots.length) { ctx.fx("power_turret", { shots }); ctx.log(`🔫 ป้อมปืน Insomnia ยิงอัตโนมัติ ${shots.length} นัด`); secs = Math.max(secs, 1.2); }
  }
  if (held(s, "altissia")) {
    const pl = s.pillars.find((o) => o.zone === "altissia"), list = [];
    for (const p of H.heroes(ctx)) {
      if (H.manhattan(p.pos, pl) > POWER.fountainR || p.hp >= ctx.combat.maxHpOf(p)) continue;
      const n = ctx.combat.healHp ? ctx.combat.healHp(p, POWER.fountainHeal) : 0;
      if (n) list.push({ id: p.id, x: p.pos.x, y: p.pos.y, amt: n });
    }
    if (list.length) { ctx.fx("power_fountain", { x: pl.x, y: pl.y, list }); secs = Math.max(secs, 1.0); }
  }
  return secs;
}
function movBonus(s, p, riding, driving) { return (riding && held(s, "duscae") ? POWER.chocoMov : 0) + (driving && held(s, "hammerhead") ? POWER.carMov : 0); }
function ramBonus(s) { return held(s, "hammerhead") ? POWER.ramDmg : 0; }
function fishLuck(s) { return held(s, "lake"); }

// ---------- ท่าร่วม ----------
function snapshot(ctx, s, H) {
  const x = X(s), alive = new Set();
  for (const m of H.mobsOf(ctx)) { alive.add(m.id); x.marks[m.id] = m.hp + (m.armor || 0); }
  for (const id of Object.keys(x.marks)) if (!alive.has(id)) { delete x.marks[id]; delete x.hitBy[id]; }
}
function combo(ctx, s, H, m, at, a, b) {
  stat(s, b, "combos"); stat(s, a, "combos");
  addGauge(ctx, s, GAUGE.combo);
  const pa = ctx.match.players[a], pb = ctx.match.players[b];
  ctx.fx("combo", { x: at.x, y: at.y, a, b, target: m.id });
  ctx.log(`🤝 ท่าร่วม! ${pa ? pa.name : ""} + ${pb ? pb.name : ""}`);
}
// จบตาของ p: มอนที่เลือด+เกราะลดลงในตานี้ = p ตี · มีเพื่อนตีตัวเดียวกันก่อนหน้าในเทิร์นนี้ = ท่าร่วม
function trackHits(ctx, s, H, p) {
  const x = X(s), round = ctx.match.roundNumber, who = isHero(H, p) ? ownerOf(ctx, p) : null;
  for (const m of H.mobsOf(ctx)) {
    const now = m.hp + (m.armor || 0), prev = x.marks[m.id];
    x.marks[m.id] = now;
    if (!who || prev == null || now >= prev) continue;
    const h = x.hitBy[m.id];
    if (h && h.round === round && h.pid !== who.id) combo(ctx, s, H, m, m.pos, h.pid, who.id);
    x.hitBy[m.id] = { pid: who.id, round };
  }
}
function comboBonus(ctx, s, H, p, target) {
  if (!target || !H.isMob(target) || !isHero(H, p)) return 0;
  const h = X(s).hitBy[target.id], who = ownerOf(ctx, p);
  return h && h.round === ctx.match.roundNumber && h.pid !== who.id ? COMBO.atk : 0;
}

// ---------- รังปีศาจ ----------
const nestsOf = (ctx, H) => H.mobsOf(ctx, "nest");
function spawnNests(ctx, s, H, turn) {
  const x = X(s);
  if (turn < 2 || s.night || x.nestDay === s.dayNo) return 0;
  x.nestDay = s.dayNo;
  const want = Math.min(NEST.max, 1 + (s.dayNo || 1)) - nestsOf(ctx, H).length;
  if (want <= 0) return 0;
  const map = ctx.map(), cand = [];
  for (let y = 1; y < map.rows - 1; y++) for (let xx = 1; xx < map.cols - 1; xx++) {
    if (H.townOf(xx, y) || H.onRail(xx, y) || lightSafe(H, xx, y) || !H.tileFree(ctx, s, xx, y)) continue;
    if (H.heroes(ctx).some((p) => H.manhattan(p.pos, { x: xx, y }) < 5)) continue;
    if (nestsOf(ctx, H).some((n) => H.manhattan(n.pos, { x: xx, y }) < NEST.gap)) continue;
    cand.push({ x: xx, y });
  }
  const out = [];
  for (const t of ctx.pick(cand, cand.length)) {
    if (out.length >= want) break;
    if (out.some((o) => H.manhattan(o, t) < NEST.gap)) continue;
    out.push(t);
  }
  for (const t of out) H.spawnMob(ctx, s, "nest", t, { hp: NEST.hp, armor: NEST.armor, atk: 0, mov: 0, gold: NEST.gold }, {});
  if (out.length) { ctx.bump(); ctx.fx("nest_spawn", { list: out }); ctx.log(`🔥 รังปีศาจโผล่ ${out.length} แห่ง — ทำลายก่อนค่ำ!`); }
  return out.length ? 1.2 : 0;
}
// ค่ำ: รังพ่นปีศาจ (ต้นคืน NEST.burst ตัว · เทิร์นกลางคืนถัดไป NEST.drip ตัว)
function nestBurst(ctx, s, H, freshNight) {
  if (!s.night) return 0;
  const n = freshNight ? NEST.burst : NEST.drip, out = [];
  const tier = Math.max(1, s.nightNo || 1), st = E.scaleStats(ctx, H.daemonStats(tier));
  for (const nest of nestsOf(ctx, H)) {
    for (let i = 0; i < n; i++) {
      const at = H.freeNear(ctx, s, nest.pos.x, nest.pos.y, 2, null, (xx, yy) => !lightSafe(H, xx, yy) && !H.townOf(xx, yy));
      if (!at) break;
      const d = H.spawnMob(ctx, s, "daemon", at, st, { look: 1 + (++s.seq % 4), tier });
      out.push({ id: d.id, x: at.x, y: at.y, nest: nest.id });
    }
  }
  if (out.length) { ctx.bump(); ctx.fx("nest_burst", { list: out }); ctx.log(`🔥 รังปีศาจพ่นปีศาจออกมา ${out.length} ตัว`); }
  return out.length ? 1.4 : 0;
}

// ---------- ยักษ์หินเดินผ่าน ----------
function giantUnit(ctx, s) { const g = X(s).giant; return g && g.id ? ctx.match.players[g.id] || null : null; }
function bandOf(ctx, g, from, to) {
  const out = [], map = ctx.map();
  for (let i = Math.max(0, from); i <= Math.min(g.path.length - 1, to); i++) {
    const c = g.path[i];
    for (let k = -1; k <= 1; k++) {
      const t = g.axis === "x" ? { x: c.x, y: c.y + k } : { x: c.x + k, y: c.y };
      if (ctx.Board.inBounds(map, t.x, t.y)) out.push(t);
    }
  }
  return out;
}
function giantTurn(ctx, s, H, turn) {
  const x = X(s);
  let g = x.giant;
  if (!g) {
    if (turn < x.giantNext || x.final) return 0;
    const map = ctx.map(), axis = ctx.rng() < 0.5 ? "x" : "y", dir = ctx.rng() < 0.5 ? 1 : -1;
    const lines = [];
    for (let v = 3; v <= (axis === "x" ? map.rows : map.cols) - 4; v++) if (axis !== "x" || Math.abs(v - H.MAP.RAIL_Y) > 1) lines.push(v);
    const v = ctx.pick(lines, 1)[0];
    const n = axis === "x" ? map.cols : map.rows, path = [];
    for (let i = 0; i < n; i++) { const u = dir > 0 ? i : n - 1 - i; path.push(axis === "x" ? { x: u, y: v } : { x: v, y: u }); }
    g = x.giant = { id: null, axis, path, idx: -1, state: "warn", at: turn + 1 };
    ctx.bump();
    ctx.fx("giant_warn", { path, band: bandOf(ctx, g, 0, GIANT.step - 1) });
    ctx.log("🗿 พื้นสั่นสะเทือน — ยักษ์หินกำลังเดินผ่าน!");
    return 1.2;
  }
  if (g.state === "warn" && turn < g.at) return 0;
  // เดิน: เหยียบแถบกว้าง 3 ช่องตลอดช่วงที่ก้าวผ่าน
  const from = g.idx + 1, to = Math.min(g.path.length - 1, g.idx + GIANT.step);
  const band = bandOf(ctx, g, from, to), keys = new Set(band.map((t) => K(t.x, t.y)));
  const me = giantUnit(ctx, s);
  const hits = [];
  for (const u of H.bodies(ctx)) {
    if (me && u.id === me.id) continue;
    if (!H.footOf(ctx, u).some((t) => keys.has(K(t.x, t.y)))) continue;
    if (ctx.action.flies && ctx.action.flies(u)) continue;
    const dealt = H.hurt(ctx, u, GIANT.dmg);
    hits.push({ id: u.id, dmg: dealt });
  }
  let pos = null;
  for (let i = to; i >= from; i--) { const c = g.path[i]; if (H.tileFree(ctx, s, c.x, c.y, me ? me.id : null)) { pos = { ...c }; break; } }
  const prev = me && me.pos ? { ...me.pos } : null;
  if (g.state === "warn") {
    g.state = "walk";
    const at = pos || H.freeNear(ctx, s, g.path[to].x, g.path[to].y, 2);
    if (at) {
      const d = E.diffOf(ctx);
      const u = H.spawnMob(ctx, s, "giant", at, { hp: Math.round(GIANT.hp * d.hp), armor: GIANT.armor, atk: 0, mov: 0, gold: GIANT.gold }, {});
      g.id = u.id;
    }
  } else if (me && pos) me.pos = pos;
  g.idx = to;
  ctx.bump();
  ctx.fx("giant_step", { id: g.id, from: prev, to: pos, band, hits, next: bandOf(ctx, g, to + 1, to + GIANT.step) });
  if (hits.length) ctx.log(`🗿 ยักษ์หินเหยียบ ${hits.length} ตัว`);
  if (g.idx >= g.path.length - 1) {
    const u = giantUnit(ctx, s);
    if (u) lazySummon().remove(u);
    ctx.fx("giant_leave", { x: g.path[g.path.length - 1].x, y: g.path[g.path.length - 1].y });
    ctx.log("🗿 ยักษ์หินเดินพ้นแผนที่ไปแล้ว");
    x.giant = null; x.giantNext = turn + GIANT.every;
  }
  return 1.6;
}
function onGiantDeath(ctx, s, H, m, by) {
  const x = X(s), at = m.pos ? { ...m.pos } : { x: 0, y: 0 };
  x.giant = null; x.giantNext = ctx.match.roundNumber + 1 + GIANT.every;
  H.addScore(ctx, s, GIANT.score, "giant");
  const got = [];
  for (const p of people(ctx)) {
    if (!p.alive) continue;
    lazyShop().addGold(p, GIANT.gold);
    const it = H.loot(ctx, s, p, { pct: 100, items: ["lifeCrystal", "armorCrystal", "windBoots", "armor"] });
    if (it.length) got.push({ id: p.id, name: it[0].name });
  }
  addGauge(ctx, s, GAUGE.giant);
  ctx.fx("giant_die", { x: at.x, y: at.y, by: by ? by.id : null, loot: got });
  ctx.log(`🗿 ยักษ์หินถล่มลง! แต้มรวม +${GIANT.score} · ทุกคนได้เหรียญ ${GIANT.gold} และของ`);
}

// ---------- พลเรือนติดค้าง ----------
const civsOf = (ctx) => Object.values(ctx.match.players).filter((p) => p.alive && p.pos && p.summon && p.summon.civilian);
function spawnCivs(ctx, s, H, freshNight) {
  if (!freshNight || X(s).final) return 0;
  const want = Math.min(CIV.max - civsOf(ctx).length, people(ctx).length >= 3 ? 2 : 1);
  if (want <= 0) return 0;
  const map = ctx.map(), cand = [];
  for (let y = 1; y < map.rows - 1; y++) for (let xx = 1; xx < map.cols - 1; xx++) {
    if (H.townOf(xx, y) || H.onRail(xx, y) || lightSafe(H, xx, y) || !H.tileFree(ctx, s, xx, y)) continue;
    if (H.heroes(ctx).some((p) => H.manhattan(p.pos, { x: xx, y }) < 4)) continue;
    if (H.MAP.ZONES.some((z) => z.town && H.manhattan({ x: (z.rect[0] + z.rect[2]) / 2, y: (z.rect[1] + z.rect[3]) / 2 }, { x: xx, y }) < 9)) continue;
    cand.push({ x: xx, y });
  }
  const out = [];
  for (const t of ctx.pick(cand, cand.length)) {
    if (out.length >= want) break;
    if (out.some((o) => H.manhattan(o, t) < 8)) continue;
    out.push(t);
  }
  for (const t of out) {
    const owner = { id: "eoscivil", name: "Eos", position: 0, customColor: null, teamId: "A" };
    const rec = lazySummon().spawn(owner, { kind: "eosCivilian", pos: t, hp: CIV.hp, armor: 0, mov: 0, range: [0, 0], name: "พลเรือน", img: null, color: "#f2d39b", data: { civilian: true, follow: null, look: (++X(s).seq) % CIV.looks } }); // ภาพคน 6 แบบ (ผู้ใช้ส่งมา 2026-11-10 — /eos/img/peopleN.webp)
    rec.teamId = "A";
  }
  if (out.length) { ctx.bump(); ctx.fx("civ_spawn", { list: out }); ctx.log(`🕊️ มีพลเรือนติดค้างกลางป่า ${out.length} คน — พาเข้าเมือง!`); }
  return out.length ? 1.0 : 0;
}
function civNear(ctx, H, p) { return civsOf(ctx).filter((c) => c.summon.follow !== p.id && H.footOf(ctx, p).some((t) => H.manhattan(t, c.pos) === 1)); }
function escort(ctx, s, H, p, tile) {
  if (!ctx.action.canAct(p)) return false;
  const c = civNear(ctx, H, p).find((o) => !tile || (o.pos.x === tile.x && o.pos.y === tile.y));
  if (!c) return false;
  c.summon.follow = p.id;
  ctx.bump();
  ctx.fx("civ_follow", { id: c.id, by: p.id, from: { ...c.pos }, to: { ...c.pos } });
  ctx.log(`🕊️ ${p.name} พาพลเรือนไปด้วย`);
  return true;
}
function rescue(ctx, s, H, c) {
  const by = ctx.match.players[c.summon.follow];
  const at = { ...c.pos };
  lazySummon().remove(c);
  H.addScore(ctx, s, CIV.score, "civilian");
  if (by && by.alive) { lazyShop().addGold(by, CIV.gold); H.loot(ctx, s, by, { pct: 100, items: ["armor", "cleanse", "resist", "fortune"] }); stat(s, by.id, "saves"); }
  ctx.fx("civ_saved", { x: at.x, y: at.y, by: by ? by.id : null });
  ctx.log(`🕊️ พาพลเรือนถึงเมืองปลอดภัย! แต้มรวม +${CIV.score}`);
}
// จบตาของ p: พลเรือนที่ตาม p วิ่งมาติดตัว · ถึงเมือง = รอด
function followUp(ctx, s, H, p) {
  for (const c of civsOf(ctx)) {
    const lead = ctx.match.players[c.summon.follow];
    if (!lead || !lead.alive || !lead.pos) { c.summon.follow = null; continue; }
    if (lead.id === (p && p.id) && !H.footOf(ctx, lead).some((t) => H.manhattan(t, c.pos) === 1)) {
      const to = H.freeNear(ctx, s, lead.pos.x, lead.pos.y, 2, c.id);
      if (to) { const from = { ...c.pos }; c.pos = to; ctx.bump(); ctx.fx("civ_follow", { id: c.id, by: lead.id, from, to: { ...to } }); }
    }
    if (H.townOf(c.pos.x, c.pos.y)) rescue(ctx, s, H, c);
  }
}
function onCivDeath(ctx, s, c) {
  ctx.bump();
  ctx.fx("civ_lost", { x: c.pos ? c.pos.x : 0, y: c.pos ? c.pos.y : 0 });
  ctx.log("🕊️ พลเรือนถูกมอนเตอร์ทำร้าย…");
}

// ---------- มาตรวัดทีม → ถล่ม ----------
function barrageTiles(ctx, H) { return H.mobsOf(ctx).map((m) => ({ x: m.pos.x, y: m.pos.y })); }
function barrage(ctx, s, H, p, tile) {
  const x = X(s);
  if (x.gauge < GAUGE.max || !H.canStrike(ctx, p) || !tile) return false;
  const tiles = [];
  for (let dy = -GAUGE.r; dy <= GAUGE.r; dy++) for (let dx = -GAUGE.r; dx <= GAUGE.r; dx++) if (ctx.Board.inBounds(ctx.map(), tile.x + dx, tile.y + dy)) tiles.push({ x: tile.x + dx, y: tile.y + dy });
  const keys = new Set(tiles.map((t) => K(t.x, t.y))), hits = [];
  x.gauge = 0;
  for (const m of H.mobsOf(ctx)) {
    if (!H.footOf(ctx, m).some((t) => keys.has(K(t.x, t.y)))) continue;
    const dealt = H.hurt(ctx, m, GAUGE.dmg, p);
    hits.push({ id: m.id, dmg: dealt });
  }
  ctx.match.action.locked = true;
  ctx.bump();
  ctx.fx("barrage", { x: tile.x, y: tile.y, tiles, hits, by: p.id });
  ctx.log(`☄️ ${p.name} สั่งถล่ม! โดนมอน ${hits.length} ตัว`);
  ctx.useStrike(p, 1.8);
  return true;
}

// ---------- คืนสุดท้าย ----------
function onScore(ctx, s, H) {
  const x = X(s);
  if (x.final || s.result || (s.score || 0) < FINAL.at) return;
  const from = ctx.match.roundNumber + 1;
  x.final = { from };
  try { ctx.engine.setForcedNight({ from, until: 99999, by: "eos" }); } catch { /* ไม่มี engine (เทสต์) */ }
  ctx.bump();
  ctx.fx("final_start", { at: from });
  ctx.log("🌑 คืนสุดท้ายมาถึง — มอนเตอร์บุกทุกเสา! ยื้อไว้จนแต้มครบ");
  if (!E.bossAlive(ctx, H) && !E.ev(s).bossWarn) E.warnBoss(ctx, s, H, from);
}
// ทุกต้นเทิร์นของคืนสุดท้าย: คลื่นปีศาจโผล่รอบเสาที่ยึดไว้ (เสาละ FINAL.perPillar ตัว)
function finalWave(ctx, s, H, turn) {
  const x = X(s);
  if (!x.final || turn <= x.final.from - 1) return 0;
  const tier = Math.max(1, (s.nightNo || 1) + 1), st = E.scaleStats(ctx, H.daemonStats(tier)), out = [];
  for (const pl of s.pillars.filter((o) => o.owner)) {
    const cand = [];
    for (let dy = -FINAL.near[1]; dy <= FINAL.near[1]; dy++) for (let dx = -FINAL.near[1]; dx <= FINAL.near[1]; dx++) {
      const t = { x: pl.x + dx, y: pl.y + dy }, d = Math.abs(dx) + Math.abs(dy);
      if (d < FINAL.near[0] || d > FINAL.near[1] || !ctx.Board.inBounds(ctx.map(), t.x, t.y) || !H.tileFree(ctx, s, t.x, t.y) || lightSafe(H, t.x, t.y)) continue;
      if (H.heroes(ctx).some((p) => H.manhattan(p.pos, t) < 2)) continue;
      cand.push(t);
    }
    for (const t of ctx.pick(cand, FINAL.perPillar)) {
      const d = H.spawnMob(ctx, s, "daemon", t, st, { look: 1 + (++s.seq % 4), tier });
      out.push({ id: d.id, x: t.x, y: t.y, pillar: pl.id });
    }
  }
  if (out.length) { ctx.bump(); ctx.fx("final_wave", { list: out }); ctx.log(`🌑 คลื่นบุกเสา — ปีศาจ ${out.length} ตัว`); }
  return out.length ? 1.4 : 0;
}

// ---------- ฮุคจาก stage6 ----------
// dev: ECHO_DEV_EOS_EXTRA=1 → เทิร์นแรกวางของรอบสามใกล้ผู้เล่นคนแรก (รัง · พลเรือน · ยักษ์เตือน · มาตรวัดเต็ม · เสา 2 ต้น) — ตรวจภาพในเบราว์เซอร์
function devSeed(ctx, s, H, turn) {
  const x = X(s);
  if (!process.env.ECHO_DEV_EOS_EXTRA || x.devDone) return;
  const p = people(ctx).find((u) => u.alive && u.pos);
  if (!p) return;
  x.devDone = true;
  for (const z of ["insomnia", "altissia"]) { const pl = s.pillars.find((o) => o.zone === z); if (pl) pl.owner = "pve"; }
  x.gauge = GAUGE.max;
  const nAt = H.freeNear(ctx, s, p.pos.x + 3, p.pos.y, 3);
  if (nAt) H.spawnMob(ctx, s, "nest", nAt, { hp: NEST.hp, armor: NEST.armor, atk: 0, mov: 0, gold: NEST.gold }, {});
  const cAt = H.freeNear(ctx, s, p.pos.x - 2, p.pos.y + 1, 3);
  if (cAt) { const rec = lazySummon().spawn({ id: "eoscivil", name: "Eos", position: 0, customColor: null, teamId: "A" }, { kind: "eosCivilian", pos: cAt, hp: CIV.hp, armor: 0, mov: 0, range: [0, 0], name: "พลเรือน", img: null, color: "#f2d39b", data: { civilian: true, follow: null, look: Math.floor(ctx.rng() * CIV.looks) } }); rec.teamId = "A"; }
  x.giantNext = turn;
  ctx.bump();
}
function preRound(ctx, s, H, turn, freshNight) {
  let secs = 0;
  devSeed(ctx, s, H, turn);
  secs = Math.max(secs, powerRound(ctx, s, H));
  secs = Math.max(secs, spawnNests(ctx, s, H, turn));
  secs = Math.max(secs, nestBurst(ctx, s, H, freshNight));
  secs = Math.max(secs, finalWave(ctx, s, H, turn));
  secs = Math.max(secs, spawnCivs(ctx, s, H, freshNight));
  secs = Math.max(secs, giantTurn(ctx, s, H, turn));
  followUp(ctx, s, H, null);
  snapshot(ctx, s, H);
  return secs;
}
function onUnitEnd(ctx, s, H, p) {
  trackHits(ctx, s, H, p);
  followUp(ctx, s, H, p);
}
// มอนตาย (stage6.onMobDeath เรียกก่อนแจกของ) · คืน true = จัดการเองแล้ว (ยักษ์หิน)
function onMobDeath(ctx, s, H, m, by) {
  const x = X(s), type = m.summon.mobType;
  const who = by ? ownerOf(ctx, by) : null;
  const h = x.hitBy[m.id];
  if (who && h && h.round === ctx.match.roundNumber && h.pid !== who.id) combo(ctx, s, H, m, m.pos || { x: 0, y: 0 }, h.pid, who.id);
  delete x.hitBy[m.id]; delete x.marks[m.id];
  if (who) stat(s, who.id, type === "nest" ? "nests" : "kills");
  addGauge(ctx, s, type === "nest" ? GAUGE.nest : m.summon.trait === "boss" ? GAUGE.boss : type === "giant" ? 0 : GAUGE.kill);
  if (type === "giant") { onGiantDeath(ctx, s, H, m, who); return true; }
  return false;
}
function hud(ctx, s, H, p, out) {
  const x = X(s);
  const cv = civNear(ctx, H, p);
  if (cv.length) out.push({ key: "fd:escort", icon: "🕊️", name: "พาไป", disabled: !ctx.action.canAct(p), tiles: cv.length > 1 ? cv.map((c) => ({ ...c.pos })) : undefined,
    desc: "พาพลเรือนไปด้วย — ตามติดตัวทุกตาที่เราเดิน · เข้าเมืองได้ = รอด แต้มรวม +2 · คนพาได้เหรียญ + ของ" });
  if (x.gauge >= GAUGE.max) {
    const tiles = H.canStrike(ctx, p) ? barrageTiles(ctx, H) : [];
    out.push({ key: "fd:barrage", icon: "☄️", name: "ถล่ม", disabled: !tiles.length, tiles, desc: `มาตรวัดทีมเต็ม: ถล่มวง 5×5 ที่ไหนก็ได้ในแผนที่ ดาเมจ ${GAUGE.dmg} ใส่มอนทุกตัวในวง (ใช้การโจมตีของตา)` });
  }
}
function action(ctx, s, H, p, key, tile) {
  if (key === "fd:escort") return escort(ctx, s, H, p, tile);
  if (key === "fd:barrage") return barrage(ctx, s, H, p, tile);
  return null;
}
function titlesOf(ctx, s) {
  const st = X(s).stats, out = [];
  for (const t of TITLES) {
    let best = null, n = 0;
    for (const p of people(ctx)) { const v = (st[p.id] && st[p.id][t.key]) || 0; if (v > n) { n = v; best = p.id; } }
    if (best) out.push({ ...t, id: best, n });
  }
  return out;
}
function publicOf(ctx, s, H) {
  const x = X(s), g = x.giant;
  return {
    final: x.final ? { from: x.final.from } : null, finalAt: FINAL.at,
    powers: powersOf(s),
    gauge: x.gauge, gaugeMax: GAUGE.max,
    giant: g ? { id: g.id, state: g.state, axis: g.axis, at: g.at, path: g.path, idx: g.idx, next: bandOf(ctx, g, g.idx + 1, g.idx + GIANT.step) } : null,
    civs: civsOf(ctx).map((c) => ({ id: c.id, x: c.pos.x, y: c.pos.y, hp: c.hp, maxHp: CIV.hp, follow: c.summon.follow || null, look: c.summon.look || 0 })),
    lightR: LIGHT.r,
    stats: x.stats,
    titles: titlesOf(ctx, s),
  };
}

module.exports = {
  init, X, FINAL, POWER, POWERS, COMBO, NEST, GIANT, LIGHT, CIV, GAUGE, TITLES,
  lightSafe, fearsLight, powersOf, held, powerRound, movBonus, ramBonus, fishLuck,
  snapshot, trackHits, comboBonus, spawnNests, nestBurst, giantTurn, onGiantDeath, giantUnit, bandOf,
  spawnCivs, civsOf, escort, followUp, rescue, onCivDeath, addGauge, barrage, onScore, finalWave, stat,
  preRound, onUnitEnd, onMobDeath, hud, action, titlesOf, publicOf,
};
