// ============================================================
//  สนาม Eos — ระยะมองเห็น (หมอก · พายุทราย · ไฟเมือง) · ฮุค vision/hides
//  แยกออกจาก server/fodlan/stage6.js (ย้ายโค้ดล้วน · พฤติกรรมเดิม) · ฮุคทั้งหมดยังส่งออกผ่าน stage6.js
// ============================================================
const { SIGHT_EXTRA, K, bodies, sizeOf, footOf, fogOn, sandOn, SAND_SIGHT, inDesert, manhattan } = require("./eosCore");
const SC = require("./eosScore");

// ============================================================ การมองเห็นผู้เล่นอื่น (ระยะเดิน + 4 ช่อง · ไม่ใช่หมอก)
const SIGHT_CACHE = new WeakMap();
function sightOf(ctx, map, u) {
  const at = anchorOf(ctx, u);
  if (!at) return null;
  const size = sizeOf(ctx, u), mov = Math.max(0, ctx.action.movOf(u) | 0), ghost = !!ctx.action.walksThrough(u);
  const key = `${at.x},${at.y},${size},${mov},${ghost ? 1 : 0}`;
  let per = SIGHT_CACHE.get(map);
  if (!per) { per = new Map(); SIGHT_CACHE.set(map, per); }
  if (per.has(key)) return per.get(key);
  const dist = new Map(), queue = [];
  const seed = (x, y) => { const k = K(x, y); if (!dist.has(k)) { dist.set(k, 0); queue.push([x, y]); } };
  const reach = ctx.Board.reachable(map, { id: "_eossight", x: at.x, y: at.y, size, alive: true }, mov, [], { ghost });
  for (const n of reach.values()) for (const t of ctx.Board.footprint(n.x, n.y, size)) seed(t.x, t.y);
  for (const t of ctx.Board.footprint(at.x, at.y, size)) seed(t.x, t.y);
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i], d = dist.get(K(x, y));
    if (d >= SIGHT_EXTRA) continue;
    for (const [dx, dy] of ctx.Board.DIRS) {
      const nx = x + dx, ny = y + dy, k = K(nx, ny);
      if (dist.has(k) || !ctx.Board.inBounds(map, nx, ny)) continue;
      dist.set(k, d + 1); queue.push([nx, ny]);
    }
  }
  const set = new Set(dist.keys());
  if (per.size > 256) per.clear();
  per.set(key, set);
  return set;
}
function sideSight(ctx, viewer) {
  if (!viewer || ctx.match.gameState === "GAMEOVER") return null;
  const me = ctx.match.players[viewer.id] || viewer, side = SC.sideOf(me);
  const eyes = bodies(ctx).filter((u) => u.id === me.id || SC.sideOf(u) === side);
  if (!eyes.length) return null; // ล้มอยู่ = ดูได้ทั้งแผนที่
  const map = ctx.map(), set = new Set();
  for (const u of eyes) { const v = sightOf(ctx, map, u); if (v) for (const k of v) set.add(k); }
  return set;
}

// ============================================================ หมอก (eos_fog — มองเห็นแค่ระยะเดินของฝ่ายตัวเอง)
const EYE_CACHE = new WeakMap();
function anchorOf(ctx, u) {
  const m = ctx.match;
  if (m.gameState !== "ACTION") return u.pos;
  const a = m.actorId === u.id ? m.action : m.duo && m.duo.acts ? m.duo.acts[u.id] : null;
  return a && !a.locked ? a.eye || a.from || u.pos : u.pos;
}
function unitVision(ctx, map, u) {
  const at = anchorOf(ctx, u);
  if (!at) return null;
  const size = sizeOf(ctx, u), mov = Math.max(0, ctx.action.movOf(u) | 0), ghost = !!ctx.action.walksThrough(u);
  const key = `${at.x},${at.y},${size},${mov},${ghost ? 1 : 0}`;
  let per = EYE_CACHE.get(map);
  if (!per) { per = new Map(); EYE_CACHE.set(map, per); }
  if (per.has(key)) return per.get(key);
  const set = new Set();
  const reach = ctx.Board.reachable(map, { id: "_eoseye", x: at.x, y: at.y, size, alive: true }, mov, [], { ghost });
  for (const n of reach.values()) for (const t of ctx.Board.footprint(n.x, n.y, size)) set.add(K(t.x, t.y));
  for (const t of ctx.Board.footprint(at.x, at.y, size)) {
    set.add(K(t.x, t.y));
    for (const [dx, dy] of ctx.Board.DIRS) if (ctx.Board.inBounds(map, t.x + dx, t.y + dy)) set.add(K(t.x + dx, t.y + dy));
  }
  // สิ่งกีดขวางติดช่องที่เห็น = เห็นด้วย (ไม่เปิดเผยใคร)
  for (const k of [...set]) {
    const [x, y] = k.split(",").map(Number);
    for (const [dx, dy] of ctx.Board.DIRS) if (ctx.Board.inBounds(map, x + dx, y + dy) && ctx.Board.isObstacle(map, x + dx, y + dy)) set.add(K(x + dx, y + dy));
  }
  if (per.size > 256) per.clear();
  per.set(key, set);
  return set;
}
function sideVision(ctx, st, viewer) {
  if (!(st && st.eos) || !fogOn(ctx) || !viewer || ctx.match.gameState === "GAMEOVER") return null;
  const me = ctx.match.players[viewer.id] || viewer;
  const eyes = bodies(ctx).filter((u) => u.id === me.id || ctx.combat.sameTeam(me, u));
  if (!eyes.length) return null;
  const map = ctx.map(), set = new Set();
  for (const u of eyes) { const v = unitVision(ctx, map, u); if (v) for (const k of v) set.add(k); }
  return set;
}
function vision(ctx, st, viewer) {
  const set = sideVision(ctx, st, viewer);
  return set ? [...set] : null;
}
function hides(ctx, st, viewer, target) {
  if (!target || !target.pos || !viewer || !(st && st.eos)) return false;
  if (target.exposedRound === ctx.match.roundNumber) return false;
  const me = ctx.match.players[viewer.id] || viewer;
  if (target.id === me.id || SC.sideOf(target) === SC.sideOf(me)) return false; // ฝ่ายเดียวกันเห็นกันเสมอ
  const foot = footOf(ctx, target);
  if (sandOn(ctx)) {
    // พายุทราย: เป้าในทะเลทราย หรือคนดูทั้งฝ่ายอยู่ในทะเลทรายหมด → ต้องมีตัวฝ่ายคนดูห่างไม่เกิน SAND_SIGHT
    const eyes = bodies(ctx).filter((u) => SC.sideOf(u) === SC.sideOf(me));
    const tIn = foot.some((t) => inDesert(t.x, t.y));
    const allIn = eyes.length > 0 && eyes.every((u) => footOf(ctx, u).some((t) => inDesert(t.x, t.y)));
    if (tIn || allIn) {
      const near = eyes.some((u) => footOf(ctx, u).some((a) => foot.some((b) => manhattan(a, b) <= SAND_SIGHT)));
      if (!near) return true;
    }
  }
  const fog = sideVision(ctx, st, viewer);
  return !!fog && !foot.some((t) => fog.has(K(t.x, t.y)));
  // PVE: ไม่มีระยะมองเห็นผู้เล่นอื่นแล้ว (ทุกคนพวกเดียวกัน) — มอนเตอร์ถูกซ่อนเฉพาะในหมอก/พายุทราย
}

// Object.assign (ไม่แทน module.exports) — ไฟล์ eos* อ้างกันเองแบบวนได้
Object.assign(module.exports, {
  sideSight, vision, hides,
});
