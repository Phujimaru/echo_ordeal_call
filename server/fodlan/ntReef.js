// ============================================================
//  Nautilus ชั้น 1 "แนวปะการัง" — ลูกเล่นโต้ตอบ (GRID_PLAN §8.9 · ผู้ใช้ "เอาทั้งหมด" 2026-11-19) · ผัง map7.js · ภาพ client/src/board/fodlan/reef.js
//   🐡 ปลาปักเป้า (3 ตัวในลากูน): ยืนติด → เตะไปตามแนวไกล 4 → พองระเบิดหนาม 3×3 ดาเมจ 2 + พิษ 2 เทิร์น · เกิดใหม่หลัง 2 เทิร์น
//   ✴️ หอยเม่น: ยืนบน/ติดสวนปะการัง → ปาใส่คนในระยะ 3 ดาเมจ 2 + เลือดไหล · ดงเดิมเก็บได้อีกหลัง 2 เทิร์น
//   🪸 ทุบสันปะการัง: ตีกำแพงสันปะการัง → พังเป็นทาง + หินถล่มทับ 2 ช่องหลังกำแพง (ตามแนวที่ตี) ดาเมจ 3
//   🌀 วาล์วปะการัง (2 จุดปลายร่องกระแสน้ำ): สลับทิศกระแสน้ำ · จบเทิร์นคนบนร่องถูกพัด 1 ช่องตามทิศ
//   🦪 หอยมุกยักษ์: ถูกผลัก/พัดเข้าไป = งับ ดาเมจ 2 + ถูกตรึง 1 เทิร์น · เดินไปจบตาเอง = ได้มุก (เหรียญ +3 ครั้งเดียวต่อหอยต่อการมาเยือน)
//   🕳️ หลุมน้ำเงิน: ถูกผลัก/พัดลง = ดาเมจ 3 + ออกซิเจน −3 + สตั้น 1 เทิร์นแล้วโผล่จุดเกิดอื่น
// ============================================================
const kit = require("./ntKit");
const { K } = kit;

const PUFFERS = 3, PUFFER_RESPAWN = 2, PUFFER_RANGE = 4, PUFFER_DMG = 2;
const URCHIN_RANGE = 3, URCHIN_DMG = 2, URCHIN_CD = 2;
const WALL_DMG = 3, WALL_BEHIND = 2;
const CLAM_DMG = 2, PEARL_GOLD = 3;
const HOLE_DMG = 3, HOLE_O2 = 3;
const VALVES = [{ x: 2, y: 8 }, { x: 15, y: 7 }];
const SECS = { kick: 1.8, urchin: 1.3, valve: 1.1, wall: 1.6 };

const S = (st) => st && st.nt7;
const kindAt = (ctx, x, y) => { const m = ctx.map(); return m.terrain[K(x, y)] || (m.special && m.special[K(x, y)]) || null; };
const tilesOf = (ctx, kind, from = "special") => { const m = ctx.map(), out = []; for (const [k, v] of Object.entries(m[from] || {})) if (v === kind) { const [x, y] = k.split(",").map(Number); out.push({ x, y }); } return out; };
const lazyShop = () => require("../shop");

function enter(ctx, st) {
  st.nt7 = { puffers: [], pufferSeq: 0, urchin: {}, valveDir: 1, broken: [], pearls: [] };
  for (let i = 0; i < PUFFERS; i++) spawnPuffer(ctx, st.nt7);
}
function lagoonFree(ctx, s) {
  return ctx.floorTiles({ includeUnits: false }).filter((t) => !kindAt(ctx, t.x, t.y) && !s.puffers.some((p) => p.x === t.x && p.y === t.y) && !VALVES.some((v) => v.x === t.x && v.y === t.y) && t.y > 2);
}
function spawnPuffer(ctx, s) {
  const spots = lagoonFree(ctx, s); if (!spots.length) return;
  const t = ctx.pick(spots, 1)[0];
  s.puffers.push({ id: ++s.pufferSeq, x: t.x, y: t.y, back: 0 });
}

// ---------- อันตราย (ปลายทางของการผลัก/พัด) ----------
function hazardAt(ctx, x, y) {
  const k = kindAt(ctx, x, y);
  if (k === "fd_nt_bluehole") return (c, p, at, by) => kit.fallPit(c, p, at, { dmg: HOLE_DMG, o2Loss: HOLE_O2, name: "หลุมน้ำเงิน", by });
  if (k === "fd_nt_clam" && ctx.free(x, y)) return (c, p, at, by) => { p.pos = { x: at.x, y: at.y }; clamBite(c, p, by); };
  return null;
}
function clamBite(ctx, p, by) {
  ctx.fx("nt_clam_bite", { id: p.id, x: p.pos.x, y: p.pos.y });
  if (kit.hurt(ctx, p, CLAM_DMG, { by, name: "🦪 หอยมุกงับ", noDodge: true })) kit.status.root(ctx, p, 1);
}

// ---------- ปุ่ม HUD ----------
function pufferNear(ctx, s, p) { return s.puffers.find((f) => ctx.adjacent(p, f.x, f.y)) || null; }
function kickTiles(ctx, s, f) {
  const out = [];
  for (const [dx, dy] of kit.DIRS) for (const t of kit.line(ctx, f.x, f.y, dx, dy, PUFFER_RANGE, { stopAtUnit: true })) out.push(t);
  return out;
}
function urchinReady(ctx, s, p) {
  const beds = tilesOf(ctx, "fd_nt_coral").filter((t) => (t.x === p.pos.x && t.y === p.pos.y) || ctx.adjacent(p, t.x, t.y));
  return beds.find((b) => !(s.urchin[K(b.x, b.y)] > ctx.match.roundNumber)) || null;
}
function urchinTargets(ctx, p) { return ctx.alive().filter((u) => u.id !== p.id && u.pos && kit.cheb(u.pos, p.pos) <= URCHIN_RANGE).map((u) => ({ x: u.pos.x, y: u.pos.y })); }
const valveNear = (ctx, p) => VALVES.find((v) => ctx.adjacent(p, v.x, v.y) || (p.pos.x === v.x && p.pos.y === v.y)) || null;

function hudActions(ctx, st, p) {
  const s = S(st); if (!s || !p || !p.pos) return [];
  const can = kit.canStrike(ctx, p), out = [];
  const f = pufferNear(ctx, s, p);
  if (f) { const t = kickTiles(ctx, s, f); out.push({ key: "fd:l7:kick", icon: "🐡", name: "เตะปลาปักเป้า", disabled: !can || !t.length, tiles: kit.pickTiles(t) }); }
  if (urchinReady(ctx, s, p)) { const t = urchinTargets(ctx, p); out.push({ key: "fd:l7:urchin", icon: "✴️", name: "ปาหอยเม่น", disabled: !can || !t.length, tiles: t }); }
  if (valveNear(ctx, p)) out.push({ key: "fd:l7:valve", icon: "🌀", name: "วาล์วกระแสน้ำ", disabled: !can });
  return out;
}
function charAction(ctx, st, p, key, tile) {
  const s = S(st); if (!s || !p || !p.pos || !kit.canStrike(ctx, p)) return false;
  if (key === "fd:l7:kick") return kick(ctx, s, p, tile);
  if (key === "fd:l7:urchin") return urchin(ctx, s, p, tile);
  if (key === "fd:l7:valve") return valve(ctx, s, p);
  return false;
}
function kick(ctx, s, p, tile) {
  const f = pufferNear(ctx, s, p); if (!f || !tile) return false;
  const to = kickTiles(ctx, s, f).find((t) => t.x === tile.x && t.y === tile.y); if (!to) return false;
  s.puffers = s.puffers.filter((q) => q !== f);
  s.respawn = (s.respawn || []).concat([ctx.match.roundNumber + PUFFER_RESPAWN]);
  const hits = [];
  for (const t of kit.area(ctx, to.x, to.y, 1)) { const u = kit.unitAt(ctx, t.x, t.y); if (u && kit.hurt(ctx, u, PUFFER_DMG, { by: p, name: "🐡 หนามปักเป้า" })) { kit.status.poison(ctx, u, 2); hits.push(u.id); } }
  ctx.fx("nt_puffer", { by: p.id, from: { x: f.x, y: f.y }, to, hits });
  ctx.log(`🐡 ${p.name} เตะปลาปักเป้า — ระเบิดหนาม`);
  ctx.bump(); ctx.useStrike(p, SECS.kick); return true;
}
function urchin(ctx, s, p, tile) {
  const bed = urchinReady(ctx, s, p); if (!bed || !tile) return false;
  const u = kit.unitAt(ctx, tile.x, tile.y); if (!u || u.id === p.id || kit.cheb(u.pos, p.pos) > URCHIN_RANGE) return false;
  s.urchin[K(bed.x, bed.y)] = ctx.match.roundNumber + URCHIN_CD;
  const hit = kit.hurt(ctx, u, URCHIN_DMG, { by: p, name: "✴️ หอยเม่น" });
  if (hit) kit.status.bleed(ctx, u, 1);
  ctx.fx("nt_urchin", { by: p.id, from: { ...p.pos }, to: { x: tile.x, y: tile.y }, hit });
  ctx.useStrike(p, SECS.urchin); return true;
}
function valve(ctx, s, p) {
  const v = valveNear(ctx, p); if (!v) return false;
  s.valveDir = -s.valveDir;
  ctx.fx("nt_valve", { x: v.x, y: v.y, dir: s.valveDir, by: p.id });
  ctx.log(`🌀 ${p.name} หมุนวาล์ว — กระแสน้ำไหลไปทาง${s.valveDir > 0 ? "ตะวันออก" : "ตะวันตก"}`);
  ctx.bump(); ctx.useStrike(p, SECS.valve); return true;
}

// ---------- ทุบสันปะการัง (ตีปกติใส่กำแพง) ----------
function objects(ctx, st) {
  const s = S(st); if (!s) return [];
  const walls = tilesOf(ctx, "fd_nt_reefwall", "terrain").filter((t) => !s.broken.includes(K(t.x, t.y)));
  return walls.map((t) => ({ id: `fd:nt7:wall:${t.x},${t.y}`, x: t.x, y: t.y, kind: "reefwall", strike: true }));
}
function strikeObject(ctx, st, p, id) {
  const s = S(st); if (!s || !String(id).startsWith("fd:nt7:wall:")) return false;
  const [x, y] = String(id).slice(12).split(",").map(Number);
  if (s.broken.includes(K(x, y))) return false;
  s.broken.push(K(x, y));
  const dx = Math.sign(x - p.pos.x), dy = Math.sign(y - p.pos.y), behind = [];
  for (let i = 1; i <= WALL_BEHIND; i++) { const tx = x + dx * i, ty = y + dy * i; if (kit.inB(ctx.map(), tx, ty)) behind.push({ x: tx, y: ty }); }
  const hits = [];
  for (const t of behind) { const u = kit.unitAt(ctx, t.x, t.y); if (u && kit.hurt(ctx, u, WALL_DMG, { by: p, name: "🪨 หินปะการังถล่ม" })) hits.push(u.id); }
  ctx.fx("nt_wall_break", { x, y, behind, hits, by: p.id });
  ctx.log(`🪸 ${p.name} ทุบสันปะการังพัง`);
  ctx.bump();
  return 1.6;
}
function layer(ctx, st, map) {
  const s = S(st); if (!s || !s.broken.length) return map;
  const terrain = { ...map.terrain }, special = { ...(map.special || {}) };
  for (const k of s.broken) { delete terrain[k]; special[k] = "fd_nt_rubble"; }
  return { ...map, terrain, special };
}
function layerVer(ctx, st) { const s = S(st); return s ? `w${s.broken.length}v${s.valveDir}` : ""; }

// ---------- จบตา / จบเทิร์น ----------
function onUnitEnd(ctx, st, p) {
  const s = S(st); if (!s || !p || !p.pos) return;
  if (kindAt(ctx, p.pos.x, p.pos.y) === "fd_nt_clam" && !s.pearls.includes(K(p.pos.x, p.pos.y))) {
    s.pearls.push(K(p.pos.x, p.pos.y));
    const got = lazyShop().addGold(p, PEARL_GOLD);
    ctx.fx("nt_pearl", { id: p.id, x: p.pos.x, y: p.pos.y, amt: got });
    ctx.log(`🦪 ${p.name} ได้มุก +${got} เหรียญ`);
  }
}
function onEndTurn(ctx, st) {
  const s = S(st); if (!s) return;
  // กระแสน้ำพัด 1 ช่อง (เรียงจากปลายน้ำก่อน ไม่ให้ชนกันเอง)
  const cur = new Set(tilesOf(ctx, "fd_nt_current").map((t) => K(t.x, t.y)));
  const riders = ctx.alive().filter((u) => u.pos && cur.has(K(u.pos.x, u.pos.y))).sort((a, b) => (b.pos.x - a.pos.x) * s.valveDir);
  const moves = [];
  for (const u of riders) { const from = { ...u.pos }; const r = kit.shove(ctx, u, s.valveDir, 0, 1, hazardAt, null); if (r.moved || r.hazard) moves.push({ id: u.id, from, to: u.pos ? { ...u.pos } : null }); }
  if (moves.length) ctx.fx("nt_current", { dir: s.valveDir, moves });
  // ปลาปักเป้าเกิดใหม่
  const now = ctx.match.roundNumber, due = (s.respawn || []).filter((r) => r <= now);
  s.respawn = (s.respawn || []).filter((r) => r > now);
  for (let i = 0; i < due.length; i++) spawnPuffer(ctx, s);
  storm(ctx, st, s);
  ctx.bump();
}

// ---------- สภาพอากาศ: พายุใต้ทะเล (nt_storm · GRID_PLAN §8.9) ----------
//  [Claude] ทุกจบเทิร์นระหว่างพายุ: ทุกคนถูกพัด 2 ช่องตามทิศที่ประกาศไว้ (ลงหลุม/หอยได้) แล้วสุ่มทิศใหม่ของเทิร์นหน้า (เห็นล่วงหน้า)
//   ตะกอนฟุ้ง: มองเห็นแค่ระยะ 4 จากตัวเอง/เพื่อนร่วมทีม
const STORM_PUSH = 2, STORM_SIGHT = 4;
const stormOn = (st) => !!(st && st.weather && st.weather.kind === "nt_storm" && st.weather.left > 0);
function weatherStart(ctx, st) {
  const s = S(st); if (!s) return;
  s.stormDir = ctx.pick(kit.DIRS, 1)[0];
  ctx.fx("nt_storm", { dir: { x: s.stormDir[0], y: s.stormDir[1] } });
  ctx.log("🌪️ พายุใต้ทะเล! กระแสน้ำปั่นป่วน");
}
function storm(ctx, st, s) {
  if (!stormOn(st) || !s.stormDir) return;
  const [dx, dy] = s.stormDir, moves = [];
  const order = ctx.alive().filter((u) => u.pos).sort((a, b) => (b.pos.x - a.pos.x) * dx + (b.pos.y - a.pos.y) * dy);
  for (const u of order) { const from = { ...u.pos }; const r = kit.shove(ctx, u, dx, dy, STORM_PUSH, hazardAt, null); if (r.moved || r.hazard) moves.push({ id: u.id, from, to: u.pos ? { ...u.pos } : null }); }
  ctx.fx("nt_storm_push", { dir: { x: dx, y: dy }, moves });
  s.stormDir = ctx.pick(kit.DIRS, 1)[0];
}
const teamOf = (ctx, viewer) => ctx.alive().filter((u) => u.pos && (u.id === viewer.id || (ctx.combat.sameTeam && ctx.combat.sameTeam(u, viewer))));
function vision(ctx, st, viewer) {
  if (!stormOn(st) || !viewer) return null;
  const map = ctx.map(), eyes = teamOf(ctx, viewer), out = [];
  for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) if (eyes.some((e) => kit.cheb(e.pos, { x, y }) <= STORM_SIGHT)) out.push(K(x, y));
  return out;
}
function hides(ctx, st, viewer, target) {
  if (!stormOn(st) || !viewer || !target || !target.pos) return false;
  return !teamOf(ctx, viewer).some((e) => kit.cheb(e.pos, target.pos) <= STORM_SIGHT);
}

// ---------- ข้อมูลให้ client ----------
function publicInfo(ctx, st) {
  const s = S(st); if (!s) return {};
  return { reef: { puffers: s.puffers.map((f) => ({ id: f.id, x: f.x, y: f.y })), valves: VALVES, valveDir: s.valveDir, broken: s.broken.slice(), pearls: s.pearls.slice(), urchin: { ...s.urchin }, stormDir: stormOn(st) && s.stormDir ? { x: s.stormDir[0], y: s.stormDir[1] } : null } };
}

module.exports = { enter, hazardAt, hudActions, charAction, objects, strikeObject, layer, layerVer, onUnitEnd, onEndTurn, publicInfo, weatherStart, vision, hides, VALVES };
