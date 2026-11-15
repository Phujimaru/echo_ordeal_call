// ============================================================
//  สนาม Eos — กำแพงเมือง/ป้อม/ประตูโดม (ทุบ/ซ่อม · เส้นทางผ่านกำแพง) · มอนตีเสา
//  แยกออกจาก server/fodlan/stage6.js (ย้ายโค้ดล้วน · พฤติกรรมเดิม) · ฮุคทั้งหมดยังส่งออกผ่าน stage6.js
// ============================================================
const MAP = require("./map6");
const PKS = require("./eosPerks");
const XT = require("./eosExtra");
const LM = require("./eosLament");
const { FIX_SECS, PILLAR_HP, REVIVE_TURNS, K, inRect, tileFree, canStrike } = require("./eosCore");
const DM = require("./eosDome");
const HH = require("./eosH");
const PR = require("./eosProps");
const SC = require("./eosScore");

const SMART = { detour: 3, barricadeCost: 3 };
// ============================================================ กำแพงเมือง Insomnia พังได้ (ผู้ใช้สั่ง 2026-11-10 — ตัวเลข Claude ตั้ง)
//  ทางปกติไปไม่ถึง (ประตูปิดด้วยโดม ฯลฯ) = หาทางที่ทะลุกำแพงได้ (กำแพง 1 ช่องนับเป็น WALL_COST ก้าว) → เดินไปติดกำแพงแล้วทุบ
//  ทุบครบ CITY_WALL.hp = ช่องนั้นพังเดินผ่านได้ · ผู้เล่นยืนติดกด "ซ่อมกำแพง" (+2 · ใช้การโจมตี) · ช่องพังซ่อมกลับได้ถ้าไม่มีใครยืน
const CITY_WALL = { hp: 4, fix: 2, cost: 4, mechDmg: 2 };
let WALL_KEYS = null; // ช่องกำแพงเดิมของผัง (ชั้นแผนที่ลบช่องที่พังออก) — สร้างตอนใช้ครั้งแรก (INSOMNIA ประกาศทีหลัง)
const cityWallKeys = () => WALL_KEYS || (WALL_KEYS = new Set([...(MAP.map.terrain.fd_eos_wall || []).filter(([x, y]) => inRect(DM.INSOMNIA, x, y)), ...(MAP.map.terrain.fd_eos_turret || [])].map(([x, y]) => K(x, y)))); // ป้อมปืนทุกป้อม (บนกำแพง Insomnia + ป้อมประจำเสา) พังได้ด้วย
const isTurretTile = (x, y) => PR.TURRETS.some((t) => t.x === x && t.y === y);
// ป้อมปืนเป็นของเสาโซนไหน (เสาที่ใกล้สุด — ป้อมบนกำแพง Insomnia = Insomnia)
const turretZone = (t) => { let best = null, bd = Infinity; for (const pl of MAP.PILLARS) { const d = Math.abs(pl.at[0] - t.x) + Math.abs(pl.at[1] - t.y); if (d < bd) { bd = d; best = pl.zone; } } return best; };
let GATE_KEYS = null;
const gateKey = (x, y) => (GATE_KEYS || (GATE_KEYS = new Set(DM.DOME_GATES.map((t) => K(t.x, t.y))))).has(K(x, y));
const gateShut = (s, x, y) => DM.domeOn(s) && gateKey(x, y);
// ช่องที่มอนทุบได้: กำแพง/ป้อมที่ยังไม่พัง · ประตูโดมตอนโดมเปิด
const breakable = (ctx, s, x, y) => isCityWall(ctx, s, x, y) || gateShut(s, x, y) || PKS.wallAt(s, x, y);
const isCityWall = (ctx, s, x, y) => cityWallKeys().has(K(x, y)) && !(s.wallBroken || {})[K(x, y)];
const wallHp = (s, k) => (s.wallHp && s.wallHp[k] != null ? s.wallHp[k] : CITY_WALL.hp);
function wallRoute(ctx, s, m, targets, pillars, mov, town, dark, goalAt, compare = false) {
  const none = { to: null, path: null, target: null, pillar: null };
  if (!compare && !targets.length && !pillars.length) return none;
  // Dijkstra แบบถังน้ำ (ค่าเดิน 1 หรือ WALL_COST)
  const cost = new Map([[K(m.pos.x, m.pos.y), 0]]), prev = new Map(), buckets = [[{ x: m.pos.x, y: m.pos.y }]];
  let goal = null;
  for (let c = 0; c < buckets.length && !goal && c < 400; c++) for (const n of buckets[c] || []) {
    if (cost.get(K(n.x, n.y)) !== c) continue;
    if (c > 0 && goalAt(n.x, n.y)) { goal = n; break; } // ช่องทุบได้ที่ติดเป้า = เป้าหมาย (ทุบแล้วถึงตัว)
    for (const [dx, dy] of ctx.Board.DIRS) {
      const x = n.x + dx, y = n.y + dy, k = K(x, y);
      if (!ctx.Board.inBounds(ctx.map(), x, y)) continue;
      const wall = breakable(ctx, s, x, y);
      if (!wall && (!tileFree(ctx, s, x, y, m.id) || (town && DM.blockedTown(s, x, y)) || (dark && XT.lightSafe(HH.H(), x, y)))) continue;
      const nc = c + (wall ? (PKS.wallAt(s, x, y) ? SMART.barricadeCost : CITY_WALL.cost) : 1);
      if (cost.has(k) && cost.get(k) <= nc) continue;
      cost.set(k, nc); prev.set(k, n);
      (buckets[nc] ||= []).push({ x, y });
    }
  }
  if (!goal) return none;
  const path = [];
  for (let c = goal; c; c = prev.get(K(c.x, c.y))) path.unshift({ x: c.x, y: c.y });
  const wi = path.findIndex((t) => breakable(ctx, s, t.x, t.y));
  if (wi < 1) return none;
  const n = Math.min(mov, wi - 1), to = path[n];
  const wall = n === wi - 1 ? path[wi] : null; // ถึงหน้ากำแพงตานี้ = ทุบ
  return { to, path: path.slice(0, n + 1), target: null, pillar: null, wall, cost: cost.get(K(goal.x, goal.y)) };
}
function hitWall(ctx, s, m, w) {
  const k = K(w.x, w.y);
  const dmg = m.summon && (m.summon.trait === "mech" || m.summon.trait === "boss") ? CITY_WALL.mechDmg : 1;
  if (gateShut(s, w.x, w.y)) { // ทุบบาเรียประตูโดม: เลือดโดมรวม หมด = โดมแตก (พักเครื่องตามปกติ)
    s.dome.hp = Math.max(0, (s.dome.hp ?? DM.DOME_HP) - dmg);
    const broke = s.dome.hp <= 0;
    if (broke) { s.dome = null; s.domeReadyRound = ctx.match.roundNumber + DM.DOME_COOLDOWN; ctx.fx("dome_off", { rect: DM.INSOMNIA, broken: true }); ctx.log(`🛡️ โดมกำแพงเวทแตก! ${m.name}ทุบบาเรียประตูจนพัง`); }
    ctx.bump();
    return { id: m.id, x: m.pos.x, y: m.pos.y, at: { x: w.x, y: w.y }, wall: true, gate: true, hp: broke ? 0 : s.dome.hp, broke };
  }
  if (PKS.wallAt(s, w.x, w.y)) { // กำแพงไม้ (ร้าน — ถาวรจนพัง): ทน PKS.wallMax(s) ครั้ง
    const bw = PKS.PK(s).walls.find((o) => o.x === w.x && o.y === w.y);
    bw.hp = (bw.hp ?? PKS.wallMax(s)) - dmg;
    const broke = bw.hp <= 0;
    if (broke) { PKS.PK(s).walls = PKS.PK(s).walls.filter((o) => o !== bw); ctx.log(`🧱 ${m.name}พังกำแพงไม้`); }
    ctx.bump();
    return { id: m.id, x: m.pos.x, y: m.pos.y, at: { x: w.x, y: w.y }, wall: true, hp: broke ? 0 : bw.hp, broke };
  }
  if (!isCityWall(ctx, s, w.x, w.y)) return null;
  (s.wallHp ||= {})[k] = Math.max(0, wallHp(s, k) - dmg);
  const broke = s.wallHp[k] <= 0;
  if (broke) { (s.wallBroken ||= {})[k] = true; delete s.wallHp[k]; ctx.log(isTurretTile(w.x, w.y) ? `🔫 ${m.name}ทุบป้อมปืน ${SC.ZONE_NAMES[turretZone(w)] || ""} พัง!` : `🧱 ${m.name}ทุบกำแพง Insomnia พัง!`); }
  ctx.bump();
  return { id: m.id, x: m.pos.x, y: m.pos.y, at: { x: w.x, y: w.y }, wall: true, hp: broke ? 0 : s.wallHp[k], broke };
}
// ของที่ซ่อมได้ติดตัว: กำแพง Insomnia / ป้อมปืน (พังแล้วก่อใหม่ได้ถ้าช่องว่าง) / กำแพงไม้ที่บุบ · kind = wall | turret | barricade
function wallFixTarget(ctx, s, p) {
  if (!p || !p.pos) return null;
  for (const [dx, dy] of ctx.Board.DIRS) {
    const x = p.pos.x + dx, y = p.pos.y + dy, k = K(x, y), kind = isTurretTile(x, y) ? "turret" : "wall";
    const bw = PKS.PK(s).walls.find((o) => o.x === x && o.y === y);
    if (bw) { if ((bw.hp ?? PKS.wallMax(s)) < PKS.wallMax(s)) return { x, y, broken: false, kind: "barricade" }; continue; }
    if (!cityWallKeys().has(k)) continue;
    if ((s.wallBroken || {})[k]) { if (tileFree(ctx, s, x, y)) return { x, y, broken: true, kind }; continue; }
    if (wallHp(s, k) < CITY_WALL.hp) return { x, y, broken: false, kind };
  }
  return null;
}
const FIX_NAMES = { wall: "ซ่อมกำแพง", turret: "ซ่อมป้อม", barricade: "ซ่อมไม้กั้น" };
function fixWall(ctx, s, p) {
  const w = canStrike(ctx, p) ? wallFixTarget(ctx, s, p) : null;
  if (!w) return false;
  const k = K(w.x, w.y);
  if (w.kind === "barricade") { const bw = PKS.PK(s).walls.find((o) => o.x === w.x && o.y === w.y); bw.hp = Math.min(PKS.wallMax(s), (bw.hp ?? PKS.wallMax(s)) + CITY_WALL.fix); }
  else if (w.broken) { delete s.wallBroken[k]; (s.wallHp ||= {})[k] = CITY_WALL.fix; }
  else { s.wallHp[k] = Math.min(CITY_WALL.hp, wallHp(s, k) + CITY_WALL.fix); if (s.wallHp[k] >= CITY_WALL.hp) delete s.wallHp[k]; }
  ctx.bump();
  ctx.fx("wall_fix", { id: p.id, x: w.x, y: w.y, rebuilt: w.broken });
  ctx.log(`${w.kind === "turret" ? "🔫" : "🧱"} ${p.name} ${w.broken ? (w.kind === "turret" ? "สร้างป้อมปืนขึ้นใหม่" : "ก่อกำแพงที่พังขึ้นใหม่") : FIX_NAMES[w.kind]}`);
  ctx.useStrike(p, FIX_SECS);
  return true;
}
// มอนตีเสา: ครบ PILLAR_HP ครั้ง = เสาหลุดกลับเป็นกลาง (พิธีที่กำลังร่ายก็แตก)
const pillarHp = (s) => (s.lamentOn ? 1 : PILLAR_HP) + PKS.pillarHpBonus(s); // การ์ดเสาแกร่ง +1 · Lament เสาเปราะ (ตีทีเดียวหลุด)
const reviveTurns = (s) => REVIVE_TURNS - PKS.reviveCut(s) + (s.lamentOn ? LM.LAMENT.reviveAdd : 0) + (LM.curse(s, "slow") ? 1 : 0); // การ์ดฟื้นไว −1 · Lament +1 · คำสาปฟื้นช้า +1
function hitPillar(ctx, s, pl, m) {
  if (pl.ch) { SC.breakChannel(ctx, pl); if (!pl.owner) return { id: pl.id, broke: "channel" }; }
  if (!pl.owner) return { id: pl.id };
  if ((pl.ward || 0) > 0) { // เกราะเสา (ไอเทม) รับแทนรอยตี
    pl.ward -= 1;
    ctx.fx("pillar_ward_hit", { id: pl.id, x: pl.x, y: pl.y, ward: pl.ward, by: m.id });
    ctx.log(`🛡️ เกราะเสา ${SC.ZONE_NAMES[pl.zone] || ""} รับการโจมตีของ ${m.name}`);
    return { id: pl.id, ward: pl.ward };
  }
  pl.hits = (pl.hits || 0) + 1;
  if (pl.hits < pillarHp(s)) {
    ctx.fx("pillar_hit", { id: pl.id, x: pl.x, y: pl.y, hits: pl.hits, hp: pillarHp(s), by: m.id });
    ctx.log(`🔷 ${m.name} โจมตีเสา ${SC.ZONE_NAMES[pl.zone] || ""} (${pl.hits}/${pillarHp(s)})`);
    return { id: pl.id, hits: pl.hits };
  }
  pl.owner = null; pl.hits = 0;
  if (s.lamentOn) { const cut = Math.min(s.score || 0, LM.LAMENT.pillarLoss); if (cut) { s.score -= cut; ctx.log(`🩸 เสาหลุด — แต้มรวม −${cut}`); } } // Lament
  PKS.noteLost(s); // ดาวท้าทาย "เสาไม่หลุดเลย"
  ctx.bump();
  ctx.fx("pillar_lost", { id: pl.id, x: pl.x, y: pl.y, by: m.id });
  ctx.log(`💔 เสา ${SC.ZONE_NAMES[pl.zone] || ""} ถูกมอนเตอร์ทำลายพิธี — หลุดกลับเป็นกลาง!`);
  return { id: pl.id, lost: true };
}

// Object.assign (ไม่แทน module.exports) — ไฟล์ eos* อ้างกันเองแบบวนได้
Object.assign(module.exports, {
  SMART, CITY_WALL, turretZone, gateShut, isCityWall, wallRoute, hitWall, wallFixTarget, FIX_NAMES, fixWall, pillarHp, reviveTurns, hitPillar,
});
