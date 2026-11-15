// ============================================================
//  สนาม Eos — ถังระเบิด · คริสตัล/ขวดธาตุ · ป้อมปืน · สัตว์ยักษ์ · ยานลงจอด · หีบสมบัติ · ของเกิดใหม่
//  แยกออกจาก server/fodlan/stage6.js (ย้ายโค้ดล้วน · พฤติกรรมเดิม) · ฮุคทั้งหมดยังส่งออกผ่าน stage6.js
// ============================================================
const MAP = require("./map6");
const E = require("./eosEvents");
const PKS = require("./eosPerks");
const MBS = require("./eosMobs");
const { SECS, K, lazyShop, bodies, mobsOf, lazySummon, footOf, nightAt, tileFree, freeNear, manhattan, listOf, townOf, canStrike } = require("./eosCore");
const HH = require("./eosH");
const JR = require("./eosJourney");
const MAI = require("./eosMobAI");
const MT = require("./eosMobTurn");
const RD = require("./eosRide");
const SPN = require("./eosSpawn");

// ============================================================ ขั้น 3: ลูกเล่นโจมตี (L11–L15 · ผู้ใช้สั่ง "ทำขั้น 3 ต่อ" — ตัวเลขเป็นข้อเสนอของ Claude)
const BARREL_DMG = 2, BARREL_BURN = 2, BARREL_RESPAWN = 4;
const CRYSTAL_RESPAWN = 5, FLASK_MAX = 2, FLASK_RANGE = 5;
const FIRE_DMG = 1, FIRE_BURN = 2, THUNDER_DMG = 2, SHOCK_DMG = 2;
const TURRET_RANGE = 6, TURRET_DMG = 2;
const BEAST = { hp: 12, armor: 2, atk: 3, mov: 3, gold: 6, aggroTurns: 2, respawn: 6, wander: 2, reach: 2 };
const MAGITEK = { hp: 4, armor: 1, atk: 2, mov: 3, gold: 2, count: 3, stay: 4 };
const MECH = { chance: 0.25, perDay: 0.1, weak: 2 }; // weak = ตีจากด้านหลังแรง +2 (ผู้ใช้เลือกไอเดีย 2026-11-10) // หุ่นเกราะ: โอกาสต่อยาน 25% + 10% ต่อวันที่ผ่านไป
const DROP_FROM = 2; // ยานลงได้ตั้งแต่เทิร์น 2 (กลางวันลงบ่อย — dropshipTurn)
const ELEMENTS = ["fire", "ice", "thunder"];
const ELEMENT_NAMES = { fire: "ไฟ", ice: "น้ำแข็ง", thunder: "สายฟ้า" };
const FLASK_SECS = 1.4, TURRET_SECS = 1.2;
const TURRETS = listOf(MAP.map.terrain, "fd_eos_turret");
const WATERY = new Set([...listOf(MAP.map.terrain, "fd_eos_water"), ...listOf(MAP.map.terrain, "fd_eos_canal"), ...listOf(MAP.map.special, "fd_eos_shallow")].map((t) => K(t.x, t.y)));
const FOREST = new Set(listOf(MAP.map.special, "fd_eos_forest").map((t) => K(t.x, t.y)));
const lazyIce = () => require("../ice");
const area3 = (x, y) => { const out = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) out.push({ x: x + dx, y: y + dy }); return out; };
const unitsOn = (ctx, tiles) => { const keys = new Set(tiles.map((t) => K(t.x, t.y))); return bodies(ctx).filter((p) => footOf(ctx, p).some((c) => keys.has(K(c.x, c.y)))); };
function hitArea(ctx, s, tiles, dmg, by, extra = null) {
  const hits = [];
  for (const p of unitsOn(ctx, tiles)) {
    if (by && p.id !== by.id && ctx.combat.sameTeam(by, p)) continue; // PVE: ของด่านที่ผู้เล่นใช้ไม่โดนพวกเดียวกัน
    const dealt = SPN.hurt(ctx, p, dmg, by);
    if (extra && p.alive) extra(p);
    hits.push({ id: p.id, dmg: dealt });
  }
  return hits;
}

// ---------- L11 ถังน้ำมัน (ตีแล้วระเบิด 3×3 · ลูกโซ่) ----------
function explodeBarrel(ctx, s, b, by, chain = new Set()) {
  if (chain.has(b.id)) return [];
  chain.add(b.id);
  s.barrels = s.barrels.filter((o) => o !== b);
  s.barrelBack.push({ at: b.home, round: ctx.match.roundNumber + BARREL_RESPAWN });
  const tiles = area3(b.x, b.y).filter((t) => ctx.Board.inBounds(ctx.map(), t.x, t.y));
  ctx.bump();
  const hits = hitArea(ctx, s, tiles, BARREL_DMG, by, (p) => ctx.burn(p, BARREL_BURN));
  ctx.fx("barrel_boom", { x: b.x, y: b.y, tiles, hits });
  ctx.log(`💥 ถังน้ำมันระเบิด!${hits.length ? ` โดน ${hits.length} คน` : ""}`);
  const keys = new Set(tiles.map((t) => K(t.x, t.y)));
  for (const o of s.barrels.slice()) if (keys.has(K(o.x, o.y))) explodeBarrel(ctx, s, o, by, chain);
  return hits;
}
// ---------- L12 หินพลังเวท → ขวดเวท ----------
function flasksOf(s, p) { return (s.flasks[p.id] ||= []); }
function breakCrystal(ctx, s, c, p) {
  s.crystals = s.crystals.filter((o) => o !== c);
  s.crystalBack.push({ at: c.home, round: ctx.match.roundNumber + CRYSTAL_RESPAWN });
  ctx.bump();
  const bag = flasksOf(s, p);
  if (bag.length < FLASK_MAX) bag.push(c.element);
  ctx.fx("crystal_break", { x: c.x, y: c.y, element: c.element, by: p.id });
  ctx.log(`💎 ${p.name} ได้ขวดเวท${ELEMENT_NAMES[c.element]}`);
}
function flaskTiles(ctx, p) {
  const map = ctx.map(), out = [];
  for (let dy = -FLASK_RANGE; dy <= FLASK_RANGE; dy++) for (let dx = -FLASK_RANGE; dx <= FLASK_RANGE; dx++) {
    if (Math.abs(dx) + Math.abs(dy) > FLASK_RANGE) continue;
    const x = p.pos.x + dx, y = p.pos.y + dy;
    if (ctx.Board.inBounds(map, x, y)) out.push({ x, y });
  }
  return out;
}
// ผืนน้ำที่ต่อกันจากช่องในวง (สายฟ้าลงน้ำ = ช็อตทั้งผืน)
function waterBody(ctx, tiles) {
  const b = ctx.match.board || {};
  const wet = (x, y) => WATERY.has(K(x, y)) || !!(b.wet && b.wet[K(x, y)]);
  const seen = new Set(), q = [];
  for (const t of tiles) if (wet(t.x, t.y)) { seen.add(K(t.x, t.y)); q.push(t); }
  for (let i = 0; i < q.length; i++) for (const [dx, dy] of ctx.Board.DIRS) {
    const x = q[i].x + dx, y = q[i].y + dy, k = K(x, y);
    if (!seen.has(k) && wet(x, y)) { seen.add(k); q.push({ x, y }); }
  }
  return q;
}
function throwFlask(ctx, s, p, element, tile) {
  const bag = flasksOf(s, p), i = bag.indexOf(element);
  if (i < 0 || !canStrike(ctx, p) || !tile || !flaskTiles(ctx, p).some((t) => t.x === tile.x && t.y === tile.y)) return false;
  bag.splice(i, 1);
  const map = ctx.map();
  const tiles = area3(tile.x, tile.y).filter((t) => ctx.Board.inBounds(map, t.x, t.y));
  let hits = [], shock = null;
  if (element === "fire") {
    hits = require("../element").withElement("fire", () => hitArea(ctx, s, tiles, FIRE_DMG, p, (u) => ctx.burn(u, FIRE_BURN))); // ธาตุไฟ 🔥 (GRID_PLAN §8.7)
    // ไฟลามป่า: ช่องป่าในวง + ป่าที่ติดกัน 1 ช่อง
    const burn = new Set(tiles.map((t) => K(t.x, t.y)));
    for (const t of tiles) if (FOREST.has(K(t.x, t.y))) for (const [dx, dy] of ctx.Board.DIRS) if (FOREST.has(K(t.x + dx, t.y + dy))) burn.add(K(t.x + dx, t.y + dy));
    try { lazyIce().layFlame([...burn].map((k) => { const [x, y] = k.split(",").map(Number); return { x, y }; }), p.id); } catch { /* ไม่มีพื้นไฟ */ }
  } else if (element === "ice") {
    hits = unitsOn(ctx, tiles).filter((u) => u.id !== p.id && !ctx.combat.sameTeam(p, u)).map((u) => { lazyIce().applySlow(u); require("../element").apply(u, "ice", p); return { id: u.id, dmg: 0 }; }); // ธาตุน้ำแข็ง ❄️
    for (const t of tiles) if (WATERY.has(K(t.x, t.y))) { try { lazyIce().layIce(t.x, t.y, p.id, { bridge: true }); } catch { /* วางไม่ได้ */ } }
    ctx.bump();
  } else require("../element").withElement("bolt", () => { // ธาตุสายฟ้า ⚡
    hits = hitArea(ctx, s, tiles, THUNDER_DMG, p);
    const body = waterBody(ctx, tiles);
    if (body.length) {
      shock = body;
      const already = new Set(hits.map((h) => h.id));
      for (const u of unitsOn(ctx, body)) if (!already.has(u.id) && !ctx.action.walksThrough(u)) { if (ctx.combat.sameTeam(p, u)) continue; hits.push({ id: u.id, dmg: SPN.hurt(ctx, u, SHOCK_DMG, p), shock: true }); }
    }
  });
  ctx.match.action.locked = true;
  p.exposedRound = ctx.match.roundNumber;
  ctx.fx("flask", { element, from: { ...p.pos }, to: { ...tile }, tiles, shock, hits, by: p.id });
  ctx.log(`🧪 ${p.name} ขว้างขวดเวท${ELEMENT_NAMES[element]}${hits.length ? ` โดน ${hits.length} คน` : ""}`);
  ctx.useStrike(p, FLASK_SECS);
  return true;
}
// ---------- L13 ป้อมปืนบนกำแพง Insomnia ----------
const turretUp = (ctx, t) => (ctx.map().terrain || {})[K(t.x, t.y)] === "fd_eos_turret"; // ป้อมพัง = หายจากชั้นแผนที่
function turretNear(ctx, p) { return TURRETS.find((t) => ctx.adjacent(p, t.x, t.y) && turretUp(ctx, t)) || null; }
function turretTargets(ctx, s, p, t) {
  return mobsOf(ctx).filter((u) => manhattan(u.pos, t) <= TURRET_RANGE && !ctx.Visibility.hiddenFromUnit(p, u)).map((u) => ({ x: u.pos.x, y: u.pos.y }));
}
function fireTurret(ctx, s, p, tile) {
  const t = turretNear(ctx, p);
  if (!t || !canStrike(ctx, p) || !tile) return false;
  const target = bodies(ctx).find((u) => u.pos.x === tile.x && u.pos.y === tile.y);
  if (!target || !turretTargets(ctx, s, p, t).some((c) => c.x === tile.x && c.y === tile.y)) return false;
  const dealt = SPN.hurt(ctx, target, TURRET_DMG + PKS.turretBonus(s), p);
  ctx.match.action.locked = true;
  p.exposedRound = ctx.match.roundNumber;
  ctx.fx("turret_shot", { from: { x: t.x, y: t.y }, to: { ...tile }, target: target.id, dmg: dealt, by: p.id });
  ctx.log(`🔫 ${p.name} ยิงป้อมปืนใส่ ${target.name} -${dealt}`);
  ctx.useStrike(p, TURRET_SECS);
  return true;
}
// ---------- L14 สัตว์ยักษ์ + L15 ทหารเหล็ก (มอนเตอร์ — ส่วน "มอนเตอร์" ด้านบน) ----------
function spawnBeast(ctx, s) {
  const [hx, hy] = MAP.BEAST_HOME;
  const at = freeNear(ctx, s, hx, hy, 4);
  if (!at) return false;
  SPN.spawnMob(ctx, s, "beast", at, { hp: BEAST.hp, armor: BEAST.armor, atk: BEAST.atk, mov: BEAST.mov, gold: BEAST.gold }, { home: { x: hx, y: hy } });
  s.beastBack = 0;
  ctx.bump();
  ctx.fx("beast_roar", { x: at.x, y: at.y });
  return true;
}
// ยานลงจอด (ผู้ใช้สั่ง 2026-11-10 "ตอนเช้าหุ่นยนต์ลงโจมตีหลายพื้นที่ได้ง่าย"):
//  กลางวัน: สุ่ม DAY_DROP_PCT% ต่อเทิร์น ลงได้พร้อมกันหลายลำ (วันแรก 2 · ตั้งแต่วันที่ 2 = 3) คนละพื้นที่ (ห่างกัน ≥ SHIP_SPREAD)
//  กลางคืน: NIGHT_DROP_PCT% ไม่เกิน 1 ลำ · เตือนช่อง 2×2 → ต้นเทิร์นถัดไปลงจอด ปล่อยทหารเหล็ก → ครบ MAGITEK.stay เทิร์นทหารที่เหลือขึ้นยานกลับ
const DAY_DROP_PCT = 55, NIGHT_DROP_PCT = 15, SHIP_SPREAD = 9;
const maxShips = (ctx, s, night) => (night ? 1 : Math.min(3, 1 + Math.max(1, s.dayNo || 1)));
function dropZone(ctx, s) {
  const map = ctx.map(), cand = [];
  const ships = s.ships || [];
  for (let y = 1; y < map.rows - 2; y++) for (let x = 1; x < map.cols - 2; x++) {
    const cells = [{ x, y }, { x: x + 1, y }, { x, y: y + 1 }, { x: x + 1, y: y + 1 }];
    if (cells.some((c) => townOf(c.x, c.y) || !tileFree(ctx, s, c.x, c.y) || JR.onRail(c.x, c.y))) continue;
    if (bodies(ctx).some((p) => manhattan(p.pos, { x, y }) < 4)) continue;
    if (ships.some((d) => manhattan(d, { x, y }) < SHIP_SPREAD)) continue;
    cand.push({ x, y });
  }
  // เสาที่ไม่มีคนเฝ้า = ยานมักลงใกล้ๆ (60%) — ผู้บัญชาการฝูงมอน 2026-11-11
  const open = MAI.openPillars(ctx, s);
  if (open.length && ctx.rng() < 0.6) {
    const near = cand.filter((c) => open.some((pl) => { const d = manhattan(c, pl); return d >= 4 && d <= 8; }));
    if (near.length) return ctx.pick(near, 1)[0];
  }
  return ctx.pick(cand, 1)[0] || null;
}
function dropshipTurn(ctx, s, turn) {
  let secs = 0;
  s.ships = s.ships || [];
  const night = nightAt(ctx, turn);
  for (const d of s.ships.slice()) {
    if (d.state === "warn" && turn >= d.landAt) {
      const spawned = [], tier = Math.max(1, s.dayNo || 1), stats = E.scaleStats(ctx, SPN.magitekStats(tier)), n = Math.max(2, E.scaleCount(ctx, MAGITEK.count + (tier >= 3 ? 1 : 0)));
      const trait = () => (tier >= 2 && !spawned.some((o) => o.sniper) ? "sniper" : null); // ทหารเหล็กยิงไกล ลำละ 1 ตัว ตั้งแต่วันที่ 2
      for (const c of [{ x: d.x, y: d.y }, { x: d.x + 1, y: d.y }, { x: d.x, y: d.y + 1 }, { x: d.x + 1, y: d.y + 1 }]) {
        if (spawned.length >= n) break;
        const at = tileFree(ctx, s, c.x, c.y) ? c : freeNear(ctx, s, c.x, c.y, 2);
        if (!at) continue;
        const tr = trait() || MBS.pickMagitek(ctx, s, HH.H()); // + โล่/โซ่ลาก/วงเวท/หน้าไม้ (eosMobs)
        const m = SPN.spawnMob(ctx, s, "magitek", at, SPN.traitStats(stats, tr), { ship: d.id, tier, trait: tr });
        spawned.push({ id: m.id, x: at.x, y: at.y, sniper: tr === "sniper" });
      }
      if (spawned.length < n) { const extra = freeNear(ctx, s, d.x, d.y, 3); if (extra) { const m = SPN.spawnMob(ctx, s, "magitek", extra, stats, { ship: d.id, tier }); spawned.push({ id: m.id, x: extra.x, y: extra.y }); } }
      // หุ่นเกราะจักรวรรดิ (ภาพจากผู้ใช้ 2026-11-10 "หุ่นพิเศษที่จะมีโอกาสโผล่มาพร้อมกองทัพ") — ลำละไม่เกิน 1 ตัว · โอกาส MECH.chance (Claude ตั้ง)
      let mech = false;
      if (ctx.rng() < MECH.chance + MECH.perDay * Math.max(0, tier - 1)) { const at = freeNear(ctx, s, d.x, d.y, 3); if (at) { const m = SPN.spawnMob(ctx, s, "magitek", at, SPN.traitStats(stats, "mech"), { ship: d.id, tier, trait: "mech" }); spawned.push({ id: m.id, x: at.x, y: at.y, mech: true }); mech = true; } }
      d.state = "landed"; d.leaveAt = turn + MAGITEK.stay;
      ctx.bump();
      ctx.fx("dropship_land", { id: d.id, x: d.x, y: d.y, spawned });
      ctx.log(`🛸 ยานจักรวรรดิลงจอด — ทหารเหล็ก ${spawned.length - (mech ? 1 : 0)} ตัว${mech ? " + หุ่นเกราะจักรวรรดิ!" : "!"}`);
      secs = SECS.dropship;
    } else if (d.state === "landed" && turn >= d.leaveAt) {
      for (const m of mobsOf(ctx, "magitek")) if (m.summon.ship === d.id) lazySummon().remove(m);
      s.ships = s.ships.filter((o) => o !== d);
      ctx.bump();
      ctx.fx("dropship_leave", { id: d.id, x: d.x, y: d.y });
      ctx.log("🛸 ยานจักรวรรดิถอนกำลังกลับ");
    }
  }
  if (turn >= Math.max(DROP_FROM, s.dropNext || 0) && s.ships.length < maxShips(ctx, s, night) && ctx.rng() * 100 < (night ? NIGHT_DROP_PCT : DAY_DROP_PCT)) {
    // กลางวัน: ลงทีละ 1–2 ลำในเทิร์นเดียว (หลายพื้นที่)
    const want = night ? 1 : Math.min(maxShips(ctx, s, night) - s.ships.length, ctx.rng() < 0.5 ? 2 : 1);
    for (let i = 0; i < want; i++) {
      const z = dropZone(ctx, s);
      if (!z) break;
      const d = { id: `fd:ship${++s.seq}`, x: z.x, y: z.y, state: "warn", landAt: turn + 1 };
      s.ships.push(d);
      ctx.fx("dropship_warn", { id: d.id, x: z.x, y: z.y });
    }
    if (s.ships.some((d) => d.state === "warn" && d.landAt === turn + 1)) ctx.log("🚨 ยานจักรวรรดิกำลังจะลงจอด!");
    s.dropNext = turn + 1;
  }
  return secs;
}
// ---------- หีบสมบัติ (ผู้ใช้สั่ง 2026-11-10 "ด่านกว้าง อยากให้มีอะไรทำ" — Claude ตั้งตัวเลข) ----------
//  ทุก CHEST_EVERY เทิร์น หีบโผล่ตามที่รกร้าง (นอกเมือง ห่างผู้เล่น) ครั้งละ CHEST_BATCH ใบ ไม่เกิน CHEST_MAX · ตีหีบ (ใช้การโจมตี) = เหรียญ + ของ
const CHEST_FIRST = 2, CHEST_EVERY = 3, CHEST_BATCH = 2, CHEST_MAX = 4, CHEST_GOLD = [3, 6], CHEST_LOOT = { pct: 60, items: ["armor", "cleanse", "resist", "fortune", "windBoots"], flask: 30 };
function spawnChests(ctx, s, turn) {
  s.chests = s.chests || [];
  if (turn < (s.chestNext || CHEST_FIRST) || s.chests.length >= CHEST_MAX) return 0;
  s.chestNext = turn + CHEST_EVERY;
  const map = ctx.map(), cand = [];
  for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) {
    if (townOf(x, y) || JR.onRail(x, y) || !tileFree(ctx, s, x, y) || RD.specialOf(ctx, x, y) === "fd_eos_forest") continue;
    if (bodies(ctx).some((p) => manhattan(p.pos, { x, y }) < 5)) continue;
    if (s.chests.some((c) => manhattan(c, { x, y }) < 8)) continue;
    cand.push({ x, y });
  }
  const out = [];
  for (const t of ctx.pick(cand, cand.length)) {
    if (out.length >= Math.min(CHEST_BATCH, CHEST_MAX - s.chests.length)) break;
    if (out.some((o) => manhattan(o, t) < 8)) continue;
    out.push(t);
  }
  for (const t of out) s.chests.push({ id: `fd:chest${++s.seq}`, x: t.x, y: t.y });
  if (out.length) { ctx.bump(); ctx.fx("chest_spawn", { list: out }); ctx.log(`🎁 หีบสมบัติโผล่ ${out.length} ใบ`); }
  return out.length;
}
function openChest(ctx, s, c, p) {
  s.chests = s.chests.filter((o) => o !== c);
  ctx.bump();
  const gold = lazyShop().addGold(p, CHEST_GOLD[0] + Math.floor(ctx.rng() * (CHEST_GOLD[1] - CHEST_GOLD[0] + 1)));
  const got = MT.loot(ctx, s, p, CHEST_LOOT);
  ctx.fx("chest_open", { id: c.id, x: c.x, y: c.y, by: p.id, gold, loot: got.map((g) => g.name) });
  ctx.log(`🎁 ${p.name} เปิดหีบ${gold ? ` +${gold} เหรียญ` : ""}${got.length ? ` · ได้ ${got.map((g) => g.name).join(", ")}` : ""}`);
}
function respawnProps(ctx, s) {
  const round = ctx.match.roundNumber + 1;
  let changed = false;
  s.barrelBack = s.barrelBack.filter((r) => {
    if (round < r.round) return true;
    if (!tileFree(ctx, s, r.at.x, r.at.y)) return true;
    s.barrels.push({ id: `fd:barrel${++s.seq}`, x: r.at.x, y: r.at.y, home: r.at }); changed = true; return false;
  });
  s.crystalBack = s.crystalBack.filter((r) => {
    if (round < r.round) return true;
    if (!tileFree(ctx, s, r.at.x, r.at.y)) return true;
    s.crystals.push({ id: `fd:crystal${++s.seq}`, x: r.at.x, y: r.at.y, home: r.at, element: ELEMENTS[Math.floor(ctx.rng() * 3) % 3] }); changed = true; return false;
  });
  if (!mobsOf(ctx, "beast").length && s.beastBack && round >= s.beastBack) changed = spawnBeast(ctx, s) || changed;
  if (spawnChests(ctx, s, round)) changed = true;
  if (changed) ctx.bump();
}

// Object.assign (ไม่แทน module.exports) — ไฟล์ eos* อ้างกันเองแบบวนได้
Object.assign(module.exports, {
  BARREL_DMG, BARREL_BURN, FLASK_MAX, FLASK_RANGE, FIRE_DMG, THUNDER_DMG, SHOCK_DMG, TURRET_RANGE, TURRET_DMG, BEAST, MAGITEK, MECH, ELEMENTS,
  ELEMENT_NAMES, TURRETS, area3, unitsOn, explodeBarrel, flasksOf, breakCrystal, flaskTiles, throwFlask, turretUp, turretNear, turretTargets,
  fireTurret, spawnBeast, DAY_DROP_PCT, dropshipTurn, CHEST_FIRST, CHEST_EVERY, CHEST_MAX, spawnChests, openChest, respawnProps,
});
