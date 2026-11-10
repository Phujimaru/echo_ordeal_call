// ============================================================
//  สนาม Eos — ระบบ PVE รอบสี่ (ผู้ใช้สั่ง 2026-11-10 "ทำทั้งหมด" — ตัวเลข Claude ตั้ง · GRID_PLAN §8.6 "PVE รอบสี่")
//   การ์ดอัปเกรดทีม (แต้มรวมถึง 10/20/30 → โหวตเลือก 1 ใน 3 ทั้งทีม) · ดาวท้าทาย 3 ดวงต่อเกม
//   กำแพงชั่วคราว (ไอเทมร้าน → วางขวางทาง 3 เทิร์น) · โชโกโบะทอง (กลางวัน โผล่แล้ววิ่งหนี 2 เทิร์น)
//  ผลของอากาศต่อมอน (ฝน/หมอก/พายุทราย) อยู่ใน stage6.actMonsters (ใช้ค่าจาก WEATHER_MOB ที่นี่)
//  สถานะ = s.pk (สร้างใน init) · H = helper จาก stage6
// ============================================================
const lazyShop = () => require("../shop");

const PERKS = {
  swift: { icon: "👟", name: "ฝีเท้าไว", desc: "ทุกคนเดิน +1" },
  might: { icon: "⚔️", name: "คมดาบ", desc: "ตีปกติใส่มอน +1" },
  vital: { icon: "❤️", name: "ทนทาน", desc: "เลือดสูงสุด +2 ทุกคน" },
  bastion: { icon: "🔷", name: "เสาแกร่ง", desc: "เสาทนการตีได้เพิ่ม 1 ครั้ง" },
  phoenix: { icon: "🕯️", name: "ฟื้นไว", desc: "ล้มแล้วฟื้นเร็วขึ้น 1 เทิร์น" },
  surge: { icon: "☄️", name: "ใจเดียวกัน", desc: "มาตรวัดทีมเติม 2 เท่า" },
  fortune: { icon: "💰", name: "โชคลาภ", desc: "ล้มมอนได้เหรียญ +1 · โอกาสได้ของ +20%" },
  aegis: { icon: "🛡️", name: "เกราะคุ้มกัน", desc: "ต้นทุกเทิร์น ทุกคนฟื้นเกราะ 1" },
};
const PERK_AT = [10, 20, 30];
const CHALLENGES = [
  { key: "noLoss", icon: "🔷", name: "เสาไม่หลุดเลย" },
  { key: "fast", icon: "⏱️", name: "ชนะภายใน 30 เทิร์น", turns: 30 },
  { key: "noDown", icon: "❤️", name: "ไม่มีใครล้ม" },
];
// กำแพงไม้ (ผู้ใช้สั่ง 2026-11-11 "ไม้กั้นควรอยู่ป้องกันได้ ไม่ใช่อยู่แค่ 3 เทิร์น ควรถาวรและถูกพังได้"): อยู่ถาวรจนโดนทุบพัง
//  ทน hp ครั้ง (หุ่นเกราะ/ราชาปีศาจทุบ 2) · ผู้เล่นยืนติดกด "ซ่อม" ได้ (stage6 fixWall) · รื้อเองได้ (ไม่ใช้การโจมตี)
const WALL = { hp: 3, max: 2 };
const GOLD = { from: 3, pct: 22, hp: 3, gold: 12, stay: 2, run: 4 };
// อากาศ → มอน: ฝนฟ้าคะนอง = ทหารเหล็กลัดวงจร ตี −1 · หมอก = ปีศาจล่าในหมอก เดิน +1 · พายุทราย = ทหารเหล็กในทะเลทรายมองไม่เห็น ขยับเมื่อมีคนใกล้ ≤ 3
const WEATHER_MOB = { stormMagitekAtk: -1, fogDaemonMov: 1, sandSight: 3 };

function init(s) {
  s.pk = { owned: [], offer: null, nextAt: 0, seq: 0, lost: 0, downs: 0, walls: [], charges: {}, wallUsed: {}, gold: null };
  return s.pk;
}
const PK = (s) => s.pk || init(s);
const has = (s, id) => PK(s).owned.includes(id);
const people = (ctx) => Object.values(ctx.match.players).filter((p) => !p.summon && !p.duoOf);

// ---------- การ์ดอัปเกรดทีม ----------
function onScore(ctx, s) {
  const k = PK(s);
  if (k.offer || s.result) return;
  const at = PERK_AT[k.nextAt] == null ? null : require("./eosEvents").markAt(ctx, PERK_AT[k.nextAt]);
  if (at == null || (s.score || 0) < at) return;
  k.nextAt += 1;
  const pool = Object.keys(PERKS).filter((id) => !k.owned.includes(id));
  const choices = ctx.pick(pool, 3);
  if (!choices.length) return;
  k.offer = { id: ++k.seq, at: ctx.match.roundNumber, choices, votes: {}, mark: at };
  ctx.bump();
  ctx.fx("perk_offer", { choices, mark: at });
  ctx.log(`✨ แต้มรวมถึง ${at} — ทั้งทีมโหวตเลือกการ์ดอัปเกรด 1 ใบ`);
}
function vote(ctx, s, p, id) {
  const k = PK(s);
  if (!k.offer || !k.offer.choices.includes(id) || p.summon) return false;
  k.offer.votes[p.id] = id;
  ctx.bump();
  const voters = people(ctx).filter((u) => u.connected !== false);
  if (voters.every((u) => k.offer.votes[u.id])) resolve(ctx, s);
  return true;
}
function resolve(ctx, s) {
  const k = PK(s), o = k.offer;
  if (!o) return;
  const count = {};
  for (const v of Object.values(o.votes)) count[v] = (count[v] || 0) + 1;
  let best = o.choices[0], n = -1;
  for (const c of o.choices) if ((count[c] || 0) > n) { n = count[c] || 0; best = c; }
  k.owned.push(best);
  k.offer = null;
  if (best === "vital") for (const p of people(ctx)) if (p.alive && ctx.combat.healHp) ctx.combat.healHp(p, 2);
  ctx.bump();
  ctx.fx("perk_pick", { perk: best, votes: count });
  ctx.log(`✨ ทีมเลือกการ์ด ${PERKS[best].icon} ${PERKS[best].name} — ${PERKS[best].desc}`);
}
// ต้นเทิร์น: โหวตค้างเกิน 1 เทิร์น = ตัดสินเลย (ทุกคนได้ตาของตัวเองไปแล้ว)
function tickOffer(ctx, s) {
  const k = PK(s);
  if (k.offer && ctx.match.roundNumber > k.offer.at) resolve(ctx, s);
}
const movBonus = (s) => (has(s, "swift") ? 1 : 0);
const atkBonusVsMob = (s) => (has(s, "might") ? 1 : 0);
const hpBonus = (s) => (has(s, "vital") ? 2 : 0);
const pillarHpBonus = (s) => (has(s, "bastion") ? 1 : 0);
const reviveCut = (s) => (has(s, "phoenix") ? 1 : 0);
const gaugeMul = (s) => (has(s, "surge") ? 2 : 1);
const fortune = (s) => (has(s, "fortune") ? { gold: 1, pct: 20 } : { gold: 0, pct: 0 });
function aegisRound(ctx, s) {
  if (!has(s, "aegis")) return;
  for (const p of people(ctx)) if (p.alive && ctx.combat.healArmor) ctx.combat.healArmor(p, 1);
}

// ---------- ดาวท้าทาย ----------
function noteLost(s) { PK(s).lost += 1; }
function noteDown(s) { PK(s).downs += 1; }
function challengesOf(ctx, s) {
  const k = PK(s), round = ctx.match.roundNumber, win = s.result === "win";
  return CHALLENGES.map((c) => {
    let ok;
    if (c.key === "noLoss") ok = k.lost === 0;
    else if (c.key === "noDown") ok = k.downs === 0;
    else ok = round <= c.turns;
    return { key: c.key, icon: c.icon, name: c.name, ok, star: win && ok };
  });
}

// ---------- กำแพงชั่วคราว ----------
function addCharge(s, p) {
  const k = PK(s);
  if ((k.charges[p.id] || 0) >= WALL.max) return false;
  k.charges[p.id] = (k.charges[p.id] || 0) + 1;
  return true;
}
function wallTiles(ctx, s, H, p) {
  const out = [];
  for (const t of H.footOf(ctx, p)) for (const [dx, dy] of ctx.Board.DIRS) {
    const x = t.x + dx, y = t.y + dy;
    if (!ctx.Board.inBounds(ctx.map(), x, y) || !H.tileFree(ctx, s, x, y) || H.onRail(x, y)) continue;
    if (!out.some((o) => o.x === x && o.y === y)) out.push({ x, y });
  }
  return out;
}
function placeWall(ctx, s, H, p, tile) {
  const k = PK(s), key = `${p.id}|${ctx.match.roundNumber}`;
  if (!(k.charges[p.id] > 0) || k.wallUsed[key] || !tile || !ctx.action.canAct(p)) return false;
  if (!wallTiles(ctx, s, H, p).some((t) => t.x === tile.x && t.y === tile.y)) return false;
  k.charges[p.id] -= 1;
  k.wallUsed[key] = true;
  k.walls.push({ id: `fd:wall${++k.seq}`, x: tile.x, y: tile.y, hp: WALL.hp, by: p.id });
  ctx.bump();
  ctx.fx("wall_up", { x: tile.x, y: tile.y, by: p.id });
  ctx.log(`🧱 ${p.name} ตั้งกำแพงไม้ขวางทาง`);
  return true;
}
function tickWalls(ctx, s) {
  const k = PK(s), turn = ctx.match.roundNumber + 1;
  for (const key of Object.keys(k.wallUsed)) if (Number(key.split("|")[1]) < turn - 1) delete k.wallUsed[key];
}
// รื้อกำแพงไม้ที่ติดตัว (ทางตันของตัวเอง) — ไม่ใช้การโจมตี · ไม่คืนจำนวน
function razeTiles(ctx, s, H, p) {
  return PK(s).walls.filter((w) => H.footOf(ctx, p).some((t) => Math.abs(t.x - w.x) + Math.abs(t.y - w.y) === 1)).map((w) => ({ x: w.x, y: w.y }));
}
function razeWall(ctx, s, H, p, tile) {
  if (!tile || !ctx.action.canAct(p) || !razeTiles(ctx, s, H, p).some((t) => t.x === tile.x && t.y === tile.y)) return false;
  const k = PK(s);
  k.walls = k.walls.filter((w) => !(w.x === tile.x && w.y === tile.y));
  ctx.bump();
  ctx.fx("wall_down", { x: tile.x, y: tile.y });
  ctx.log(`🧱 ${p.name} รื้อกำแพงไม้`);
  return true;
}

// ---------- โชโกโบะทอง ----------
function goldUnit(ctx, H) { return H.mobsOf(ctx, "gold")[0] || null; }
function goldTurn(ctx, s, H, turn) {
  const k = PK(s);
  let g = goldUnit(ctx, H);
  if (g) {
    if (turn > (g.summon.leaveAt || 0)) {
      const at = { ...g.pos };
      require("../summon").remove(g);
      ctx.bump();
      ctx.fx("gold_leave", { x: at.x, y: at.y });
      ctx.log("🐤 โชโกโบะทองวิ่งหนีไปแล้ว");
      return 0.8;
    }
    // วิ่งหนี: ช่องในระยะ GOLD.run ที่ห่างผู้เล่นใกล้สุดมากที่สุด
    const heroes = H.heroes(ctx);
    const reach = ctx.Board.reachable(ctx.map(), { id: g.id, x: g.pos.x, y: g.pos.y, size: 1, alive: true }, GOLD.run, ctx.units().filter((u) => u.id !== g.id));
    let best = null, bd = -1;
    for (const n of reach.values()) {
      if (!H.tileFree(ctx, s, n.x, n.y, g.id) || H.townOf(n.x, n.y)) continue;
      const d = heroes.length ? Math.min(...heroes.map((p) => H.manhattan(p.pos, n))) : 0;
      if (d > bd) { bd = d; best = n; }
    }
    if (best && (best.x !== g.pos.x || best.y !== g.pos.y)) {
      const from = { ...g.pos };
      g.pos = { x: best.x, y: best.y };
      ctx.bump();
      ctx.fx("mob_move", { moves: [{ id: g.id, type: "gold", from, to: { ...g.pos }, path: [from, { ...g.pos }] }] });
    }
    return 0;
  }
  if (turn < GOLD.from || s.night || k.goldDay === s.dayNo || ctx.rng() * 100 >= GOLD.pct) return 0;
  const map = ctx.map(), cand = [];
  for (let y = 1; y < map.rows - 1; y++) for (let x = 1; x < map.cols - 1; x++) {
    if (H.townOf(x, y) || H.onRail(x, y) || !H.tileFree(ctx, s, x, y)) continue;
    const d = Math.min(99, ...H.heroes(ctx).map((p) => H.manhattan(p.pos, { x, y })));
    if (d < 4 || d > 9) continue;
    cand.push({ x, y });
  }
  const at = ctx.pick(cand, 1)[0];
  if (!at) return 0;
  k.goldDay = s.dayNo;
  g = H.spawnMob(ctx, s, "gold", at, { hp: GOLD.hp, armor: 0, atk: 0, mov: 0, gold: GOLD.gold }, {});
  g.summon.leaveAt = turn + GOLD.stay;
  ctx.bump();
  ctx.fx("gold_spawn", { x: at.x, y: at.y });
  ctx.log("🐤✨ โชโกโบะทองโผล่! จับให้ได้ก่อนมันหนี");
  return 1.0;
}

// ---------- ฮุคจาก stage6 ----------
// dev: ECHO_DEV_EOS_EXTRA=1 → เทิร์นแรก: การ์ดทีมรอโหวต · กำแพงไม้ 2 อันให้คนแรก · โชโกโบะทองข้างตัว (ตรวจภาพในเบราว์เซอร์)
function devSeed(ctx, s, H, turn) {
  const k = PK(s);
  if (!process.env.ECHO_DEV_EOS_EXTRA || k.devDone) return;
  const p = people(ctx).find((u) => u.alive && u.pos);
  if (!p) return;
  k.devDone = true;
  k.charges[p.id] = WALL.max;
  if ((s.score || 0) < PERK_AT[0]) s.score = PERK_AT[0];
  onScore(ctx, s);
  const at = H.freeNear(ctx, s, p.pos.x + 2, p.pos.y + 2, 4);
  if (at) { const g = H.spawnMob(ctx, s, "gold", at, { hp: GOLD.hp, armor: 0, atk: 0, mov: 0, gold: GOLD.gold }, {}); g.summon.leaveAt = turn + 6; }
  ctx.bump();
}
function preRound(ctx, s, H, turn) {
  let secs = 0;
  devSeed(ctx, s, H, turn);
  tickOffer(ctx, s);
  aegisRound(ctx, s);
  tickWalls(ctx, s);
  secs = Math.max(secs, goldTurn(ctx, s, H, turn));
  return secs;
}
function hud(ctx, s, H, p, out) {
  const k = PK(s);
  if (k.charges[p.id] > 0) {
    const used = !!k.wallUsed[`${p.id}|${ctx.match.roundNumber}`];
    const tiles = ctx.action.canAct(p) && !used ? wallTiles(ctx, s, H, p) : [];
    out.push({ key: "fd:wall", icon: "🧱", name: "กำแพง", count: k.charges[p.id], disabled: !tiles.length, tiles,
      desc: `ตั้งกำแพงไม้ขวางทางช่องข้างตัว อยู่ถาวรจนพัง (ทน ${WALL.hp} ครั้ง · ซ่อมได้) — มอนเดินผ่านไม่ได้ (ไม่ใช้การโจมตี · ตาละครั้ง)` });
  }
  const rz = ctx.action.canAct(p) ? razeTiles(ctx, s, H, p) : [];
  if (rz.length) out.push({ key: "fd:raze", icon: "🪓", name: "รื้อ", tiles: rz, desc: "รื้อกำแพงไม้ที่ติดตัวออก (ไม่ใช้การโจมตี)" });
}
function action(ctx, s, H, p, key, tile) {
  if (typeof key === "string" && key.startsWith("fd:perk:")) return vote(ctx, s, p, key.slice(8));
  if (key === "fd:wall") return placeWall(ctx, s, H, p, tile);
  if (key === "fd:raze") return razeWall(ctx, s, H, p, tile);
  return null;
}
function publicOf(ctx, s) {
  const k = PK(s);
  return {
    perks: k.owned.map((id) => ({ id, ...PERKS[id] })),
    perkOffer: k.offer ? { id: k.offer.id, mark: k.offer.mark, choices: k.offer.choices.map((id) => ({ id, ...PERKS[id] })), votes: { ...k.offer.votes } } : null,
    perkAt: PERK_AT.map((n) => require("./eosEvents").markAt(ctx, n)),
    challenges: challengesOf(ctx, s),
    walls: k.walls.map((w) => ({ id: w.id, x: w.x, y: w.y, hp: w.hp ?? WALL.hp, max: WALL.hp })),
    wallCharges: { ...k.charges },
  };
}
// layer: กำแพง = สิ่งกีดขวาง
function layerWalls(s, terrain) { for (const w of PK(s).walls) terrain[`${w.x},${w.y}`] = "fd_eos_barricade"; }
function wallAt(s, x, y) { return PK(s).walls.some((w) => w.x === x && w.y === y); }
function goldReward(ctx, s, by) { void ctx; void s; void by; return { pct: 100, items: ["lifeCrystal", "armorCrystal", "windBoots", "fortune"] }; }

module.exports = {
  init, PK, PERKS, PERK_AT, CHALLENGES, WALL, GOLD, WEATHER_MOB, has,
  onScore, vote, resolve, tickOffer, movBonus, atkBonusVsMob, hpBonus, pillarHpBonus, reviveCut, gaugeMul, fortune, aegisRound,
  noteLost, noteDown, challengesOf, addCharge, wallTiles, placeWall, tickWalls, goldTurn, goldUnit, goldReward,
  preRound, hud, action, publicOf, layerWalls, wallAt,
};
void lazyShop;
