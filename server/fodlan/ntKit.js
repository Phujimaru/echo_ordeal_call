// ============================================================
//  Nautilus — ชุดเครื่องมือกลางของลูกเล่นโต้ตอบทุกชั้น (GRID_PLAN §8.9 "ลูกเล่นโต้ตอบชุดใหม่" · ผู้ใช้ "เอาทั้งหมด" 2026-11-19)
//  ทุกลูกเล่น = ยืนติด → ปุ่ม HUD (key "fd:l<ด่าน>:…" — "fd:nt:" เป็นของเรือ nautilus.js) → ใช้แทนการตี (ctx.useStrike) · ทุกการโดนหลบได้ (กฎผู้ใช้: สกิลหลบได้เสมอ)
//  ผลัก/ดีดลงอันตรายของชั้น (หลุม ปล่อง หอยมุก …) = โดนหนักกว่าปกติ → hazardAt ของแต่ละชั้น
// ============================================================
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const K = (x, y) => `${x},${y}`;

function canStrike(ctx, p) { const a = ctx.match.action; return ctx.action.canAct(p) && !!a && !a.noStrike && !p.didAttackRound; }
function cheb(a, b) { return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)); }
function adjacentTo(ctx, p, tiles) { return !!(p && p.pos) && tiles.some((t) => ctx.adjacent(p, t.x, t.y)); }
function nearestOf(ctx, p, tiles) { return tiles.filter((t) => ctx.adjacent(p, t.x, t.y))[0] || null; }
function inB(map, x, y) { return x >= 0 && y >= 0 && x < map.cols && y < map.rows; }
function unitAt(ctx, x, y) { return ctx.alive().find((u) => u.pos && u.pos.x === x && u.pos.y === y) || null; }

// ทอยหลบ: หลบหลีก (สถานะ) แล้วช่องกำบัง (เคลป์/ปะการัง/พุ่ม) — แบบเดียวกับท่าของทาลัสซา
function dodges(ctx, p) {
  if (!p || !p.statuses) return false;
  if ((p.statuses.evade || 0) > 0) { const pct = ctx.Status.statusAmtOf ? ctx.Status.statusAmtOf(p, "evade") || 100 : 100; if (Math.random() * 100 < pct) return true; }
  const cover = ctx.Board.terrainEvade && p.pos ? ctx.Board.terrainEvade(ctx.map(), p.pos.x, p.pos.y) : null;
  return !!(cover && cover.pct > 0 && Math.random() * 100 < cover.pct);
}
// ทำดาเมจจากลูกเล่น (by = ผู้ใช้ — ตัวเองไม่โดนเว้นแต่ selfOk) · คืน true = โดน
function hurt(ctx, p, n, { by = null, name = "", pierce = false, selfOk = false, noDodge = false } = {}) {
  if (!p || !p.alive || !p.pos) return false;
  if (by && p.id === by.id && !selfOk) return false;
  if (!noDodge && dodges(ctx, p)) { ctx.log(`💨 ${p.name} หลบ${name}ได้`); ctx.fx("nt_dodge", { id: p.id, x: p.pos.x, y: p.pos.y }); return false; }
  const src = by || null;
  const dealt = src ? ctx.combat.withEffectSource(src, () => ctx.damage(p, n, { pierce })) : ctx.damage(p, n, { pierce });
  ctx.log(`${name} → ${p.name} -${dealt}`);
  return true;
}
const status = {
  poison(ctx, p, turns = 2) { if (p && p.alive) ctx.Status.applyPoison(p, turns); },
  bleed(ctx, p, n = 1) { if (p && p.alive) ctx.Status.applyBleed(p, n); },
  burn(ctx, p, n = 1) { if (p && p.alive) ctx.Status.applyBurn(p, n); },
  root(ctx, p, turns = 1) { if (p && p.alive) ctx.Status.applyDebuff(p, "rooted", null, turns); },
  stun(ctx, p, turns = 1) { if (p && p.alive) ctx.Status.applyDebuff(p, "stun", null, turns); },
  noskill(ctx, p, turns = 1) { if (p && p.alive) ctx.Status.applyDebuff(p, "noskill", null, turns); },
  blind(ctx, p, turns = 1) { if (p && p.alive) ctx.Status.applyDebuff(p, "blind", null, turns); },
};
function o2(ctx, p, delta, src) {
  try { const O = require("./nautilusO2"); if (delta < 0) O.drain(ctx, p, -delta, src); else O.refill(ctx, p, delta, src); } catch (err) { void err; }
}
// ช่องตามแนวตรงจาก (x,y) ทิศ (dx,dy) ไกลสุด n ช่อง — หยุดที่สิ่งกีดขวาง (stopAtUnit = หยุดที่คนแรก รวมช่องนั้น)
function line(ctx, x, y, dx, dy, n, { stopAtUnit = false, through = null } = {}) {
  const map = ctx.map(), out = [];
  for (let i = 1; i <= n; i++) {
    const tx = x + dx * i, ty = y + dy * i;
    if (!inB(map, tx, ty)) break;
    const k = map.terrain[K(tx, ty)];
    if (k && !(through && through(k))) break;
    out.push({ x: tx, y: ty });
    if (stopAtUnit && unitAt(ctx, tx, ty)) break;
  }
  return out;
}
function area(ctx, cx, cy, r = 1) {
  const map = ctx.map(), out = [];
  for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) if (inB(map, cx + dx, cy + dy)) out.push({ x: cx + dx, y: cy + dy });
  return out;
}
// ผลัก n ช่อง ทีละช่อง: ชนสิ่งกีดขวาง/คน = หยุด · ช่องถัดไปเป็นอันตราย (hazardAt คืน fn) = ตกลงอันตรายนั้น
//  คืน { moved, hazard }
function shove(ctx, p, dx, dy, n, hazardAt, by = null) {
  if (!p || !p.alive || !p.pos || !(n > 0)) return { moved: 0 };
  const map = ctx.map();
  let moved = 0;
  for (let i = 0; i < n; i++) {
    const tx = p.pos.x + dx, ty = p.pos.y + dy;
    const hz = hazardAt ? hazardAt(ctx, tx, ty) : null;
    if (hz) { const from = { ...p.pos }; ctx.fx("nt_shove", { id: p.id, from, to: { x: tx, y: ty } }); hz(ctx, p, { x: tx, y: ty }, by); return { moved, hazard: true }; }
    if (!inB(map, tx, ty) || !ctx.free(tx, ty, p.id)) break;
    p.pos = { x: tx, y: ty }; moved++;
  }
  if (moved) ctx.fx("nt_shove", { id: p.id, to: { ...p.pos } });
  return { moved };
}
// ตกลงหลุม (หลุมน้ำเงิน/หลุมดิ่ง): ดาเมจ + สตั้น 1 เทิร์น แล้วโผล่ที่จุดเกิดว่างแบบสุ่ม ("หายจากกระดาน 1 เทิร์น" — engine ไม่มีสถานะนอกกระดานที่ปลอดภัย)
function fallPit(ctx, p, at, { dmg = 3, o2Loss = 0, name = "หลุม", by = null } = {}) {
  if (!p || !p.alive) return;
  ctx.fx("nt_fall", { id: p.id, x: at.x, y: at.y });
  hurt(ctx, p, dmg, { by, name: `🕳️ ตก${name}`, noDodge: true });
  if (o2Loss) o2(ctx, p, -o2Loss, "pit");
  if (!p.alive) return;
  status.stun(ctx, p, 1);
  const map = ctx.map(), spots = (map.spawns || []).filter((s) => ctx.free(s.x, s.y, p.id));
  const spot = spots.length ? ctx.pick(spots, 1)[0] : (ctx.floorTiles({ includeUnits: false })[0] || null);
  if (spot) { p.pos = { x: spot.x, y: spot.y }; ctx.fx("nt_surface", { id: p.id, x: spot.x, y: spot.y }); }
}
// ปุ่มเลือกช่อง (HUD tiles) จากรายการช่อง
const pickTiles = (list) => list.map((t) => ({ x: t.x, y: t.y }));

module.exports = { DIRS, K, canStrike, cheb, adjacentTo, nearestOf, inB, unitAt, dodges, hurt, status, o2, line, area, shove, fallPit, pickTiles };
