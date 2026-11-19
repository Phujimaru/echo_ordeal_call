// ============================================================
//  Nautilus ชั้น 5 "ร่องลึกก้นสมุทร" — ความมืด + ลูกเล่นโต้ตอบ (GRID_PLAN §8.9 · ผู้ใช้ "เอาทั้งหมด" 2026-11-19) · ผัง map11.js · ภาพ client/src/board/fodlan/abyss.js
//   🌑 มืดสนิท: เห็นแค่ช่องในแสง (ดงแพลงก์ตอน · แสงล่อปลาตกเบ็ด · พลุ · ไฟตัวเรือ · ไฟฉายเรือ · คนที่ตัวเรือง) + ช่องติดตัวเอง/เพื่อนร่วมทีม (สัมผัส ระยะ 1)
//   ✨ แพลงก์ตอน: จบตาบนดง = ตัวเรือง 2 เทิร์น (เห็นรอบตัวระยะ 2 · ทุกคนเห็นเรา · ส่องรอบตัวระยะ 1)
//   🎣 ไฟล่อปลาตกเบ็ด (3 ตัวซุ่มในร่อง): ยืนติดแสงล่อ → ปาใส่ศัตรูที่มองเห็นในระยะ 4 → ปลาตกเบ็ดยักษ์งับ ดาเมจ 3 + ลากเข้าหาร่อง/หลุม 1 ช่อง + ไฟล่อติดตัว (เรือง 2 เทิร์น)
//       แสงล่อปลอม: จบตาติดแสงล่อ (ระยะ 1) = โดนงับ ดาเมจ 2 · ปลาหลบลงร่อง ไฟล่อกลับมาหลัง 2 เทิร์น (ปาไปแล้ว 3 เทิร์น)
//   🎆 พลุแสง (ยานสำรวจตก 2 ลำ): ยืนติดยาน → ยิงพลุไกล 5 → วง 3×3 ตาพร่า (ตาบอด 1 เทิร์น · หลบได้) + ส่องสว่างรัศมี 2 ทุกคนเห็น 2 เทิร์น · ยานพัก 3 เทิร์น
//   🦠 ทุบแพลงก์ตอน: ยืนบน/ติดดงที่ยังเรือง → ดงดับ + หมึกมืดคลุม (ดง + รอบ 1) 3 เทิร์น · ตีจากในความมืด พลังโจมตี +1 · คนเรืองในหมอกมืดดับ
//   🌉 ทุบสะพานหิน: ยืนริมร่องติดสะพาน → สะพานพังทั้งเส้น (เป็นร่องถาวร) · คนบนสะพานร่วงลงร่อง · กระดูกสันหลังพังไม่ได้ (ทางข้ามที่เหลือเสมอ)
//   🕳️ ร่องลึก/หลุมดิ่ง: ถูกผลัก/ลากลง = ดาเมจ 3 + สตั้น 1 เทิร์นแล้วโผล่จุดเกิดอื่น (kit.fallPit — "หายจากกระดาน 1 เทิร์น")
//   🧪 บ่อน้ำเกลือ: เดิน 2 ก้าว · จบตาในบ่อ = พิษ 2 เทิร์น
//   🌌 ร่องหายใจ: ทุก 4 เทิร์น (เทิร์น 4, 8, …) ดงแพลงก์ตอนบาน ส่องไกล 2 ช่องทั้งเทิร์น — จังหวะเปิดให้ล่า/หนี (ชั้นนี้อยู่จนจบเกม)
//   🌑 สภาพอากาศ "ความมืดบีบ" (nt_dark): ความมืดกินจากขอบกระดานเข้ามา 2 → 3 → 4 ช่อง (จบเทิร์นละขั้น · ช่องที่กำลังจะโดนเตือนก่อน)
//       จบเทิร์นอยู่ในเขตมืด + ไม่อยู่ในแสง/ไม่เรือง = ดาเมจ 2 (หลบได้)
//  [Claude] ตัวเลขทั้งหมดตั้งเอง (ผู้ใช้ให้ตั้งต้น) · "ตาพร่า ตีพลาดง่าย" ใช้สถานะตาบอดเดิม — engine ยังไม่มีจุดเสียบ "ผู้ตีพลาด" ให้ด่าน (ต้องเพิ่มที่ส่วนกลาง)
// ============================================================
const kit = require("./ntKit");
const { K } = kit;
const MAP = require("./map11");

const LURES = [
  { id: 1, x: 1, y: 5, lair: { x: 1, y: 6 } },
  { id: 2, x: 8, y: 9, lair: { x: 8, y: 8 } },
  { id: 3, x: 17, y: 8, lair: { x: 17, y: 7 } },
];
const LURE_RANGE = 4, LURE_DMG = 3, LURE_BACK = 3, SNAP_DMG = 2, SNAP_BACK = 2, LURE_GLOW = 2, DRAG_REACH = 2;
const FLARE_RANGE = 5, FLARE_LIGHT = 2, FLARE_TURNS = 2, FLARE_CD = 3;
const INK_TURNS = 3, INK_ATK = 1;
const GLOW_TURNS = 2, GLOW_SIGHT = 2, TOUCH = 1;
const PIT_DMG = 3, BRINE_POISON = 2;
const DARK_DMG = 2, DARK_START = 2;
const BLOOM_EVERY = 4, BLOOM_LIGHT = 2; // ร่องหายใจ: ทุก 4 เทิร์นดงแพลงก์ตอนบานสว่างไกลขึ้น 1 เทิร์น (จังหวะของชั้นที่อยู่ยาวจนจบเกม)
const SECS = { lure: 2, flare: 1.8, smash: 1.2, bridge: 1.8 };

const S = (st) => st && st.nt11;
const round = (ctx) => ctx.match.roundNumber;
const kindAt = (ctx, x, y) => { const m = ctx.map(); return m.terrain[K(x, y)] || (m.special && m.special[K(x, y)]) || null; };
const inBox = (map, x, y) => kit.inB(map, x, y);
const lazyNt = () => require("./nautilus");
const bloomNow = (ctx) => round(ctx) > 0 && round(ctx) % BLOOM_EVERY === 0;

// ---------- ข้อมูลผังคงที่ (คิดครั้งเดียว) ----------
function clustersOf(kind) {
  const list = MAP.map.special[kind] || [];
  const left = new Set(list.map(([x, y]) => K(x, y))), out = [];
  for (const [x0, y0] of list) {
    if (!left.has(K(x0, y0))) continue;
    const tiles = [], q = [[x0, y0]]; left.delete(K(x0, y0));
    while (q.length) {
      const [x, y] = q.pop(); tiles.push({ x, y });
      for (const [dx, dy] of kit.DIRS) { const k = K(x + dx, y + dy); if (left.has(k)) { left.delete(k); q.push([x + dx, y + dy]); } }
    }
    out.push(tiles);
  }
  return out;
}
const PATCHES = clustersOf("fd_nt_plankton");
const BRIDGES = clustersOf("fd_nt_bridge");
const PROBES = (MAP.map.terrain.fd_nt_probe || []).map(([x, y]) => ({ x, y }));
const DOCK = MAP.DOCK;

function enter(ctx, st) {
  st.nt11 = { lures: LURES.map((l) => ({ ...l, lair: { ...l.lair }, back: 0 })), dark: {}, ink: [], flares: [], probe: {}, glow: {}, broken: [], zone: null, seq: 0 };
}

// ---------- แสง / การมองเห็น ----------
const lureOn = (ctx, l) => !(l.back > round(ctx));
const patchLit = (ctx, s, i) => !(s.dark[i] >= round(ctx));
const glowing = (ctx, s, u) => !!(u && u.pos && s.glow[u.id] >= round(ctx) && !inInk(ctx, s, u.pos.x, u.pos.y));
function inkSet(ctx, s) { const set = new Set(); for (const z of s.ink) if (z.until >= round(ctx)) for (const k of z.tiles) set.add(k); return set; }
function inInk(ctx, s, x, y) { return s.ink.some((z) => z.until >= round(ctx) && z.tiles.includes(K(x, y))); }
function addRing(map, set, x, y, r) { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (inBox(map, x + dx, y + dy)) set.add(K(x + dx, y + dy)); }
const LIT_CACHE = new WeakMap(); // สถานะชั้น → { sig, map, set } (ไม่เก็บใน st — st ถูกส่ง/คัดลอกได้)
// ช่องที่ทุกคนเห็น (แหล่งแสง) — หมอกมืดจากการทุบแพลงก์ตอนกลืนแสงทุกชนิด
function publicLit(ctx, s) {
  const map = ctx.map(), units = ctx.alive();
  const sig = `${round(ctx)}|${s.seq}|${units.map((u) => `${u.id}@${u.pos.x},${u.pos.y}`).join(";")}`;
  const old = LIT_CACHE.get(s);
  if (old && old.sig === sig && old.map === map) return old.set;
  const set = new Set();
  const rp = bloomNow(ctx) ? BLOOM_LIGHT : 1;
  PATCHES.forEach((tiles, i) => { if (patchLit(ctx, s, i)) for (const t of tiles) addRing(map, set, t.x, t.y, rp); });
  for (const l of s.lures) if (lureOn(ctx, l)) addRing(map, set, l.x, l.y, 1);
  for (const f of s.flares) if (f.until >= round(ctx)) addRing(map, set, f.x, f.y, FLARE_LIGHT);
  // ไฟตัวเรือ Nautilus (หน้าต่างรอบลำ) = ที่หลบความมืด
  for (let y = DOCK.y - 1; y <= DOCK.y + DOCK.h; y++) for (let x = DOCK.x - 1; x <= DOCK.x + DOCK.w; x++) if (inBox(map, x, y)) set.add(K(x, y));
  for (const u of units) if (s.glow[u.id] >= round(ctx)) addRing(map, set, u.pos.x, u.pos.y, 1);
  for (const k of inkSet(ctx, s)) set.delete(k);
  LIT_CACHE.set(s, { sig, map, set });
  return set;
}
function sameSide(ctx, a, b) { return a.id === b.id || !!(ctx.combat.sameTeam && ctx.combat.sameTeam(a, b)); }
function eyesOf(ctx, viewer) { const me = ctx.match.players[viewer.id] || viewer; return ctx.alive().filter((u) => u.pos && sameSide(ctx, me, u)); }
// ช่องที่ฝ่ายของ viewer เห็น — null = ไม่มีความมืด (จบเกม / ไม่มีสายตาบนกระดาน)
function sideVision(ctx, st, viewer) {
  const s = S(st);
  if (!s || !viewer || ctx.match.gameState === "GAMEOVER") return null;
  const eyes = eyesOf(ctx, viewer);
  if (!eyes.length) return null;
  const map = ctx.map(), set = new Set(publicLit(ctx, s));
  for (const e of eyes) addRing(map, set, e.pos.x, e.pos.y, glowing(ctx, s, e) ? GLOW_SIGHT : TOUCH);
  return set;
}
function vision(ctx, st, viewer) { const set = sideVision(ctx, st, viewer); return set ? [...set] : null; }
function hides(ctx, st, viewer, target) {
  const s = S(st);
  if (!s || !viewer || !target || !target.pos) return false;
  const me = ctx.match.players[viewer.id] || viewer;
  if (sameSide(ctx, me, target)) return false;
  if (target.exposedRound === round(ctx) || glowing(ctx, s, target)) return false;
  const set = sideVision(ctx, st, viewer); if (!set) return false;
  const size = ctx.action.sizeOf ? ctx.action.sizeOf(target) : 1;
  return !ctx.Board.footprint(target.pos.x, target.pos.y, size).some((t) => set.has(K(t.x, t.y)));
}
// อยู่ในแสงไหม (ความมืดบีบ): ช่องแสงสาธารณะ · ตัวเรือง · ลำแสงไฟฉายเรือ
function inLight(ctx, s, u) {
  if (!u || !u.pos) return false;
  if (glowing(ctx, s, u) || publicLit(ctx, s).has(K(u.pos.x, u.pos.y))) return true;
  try { return !!lazyNt().lit(ctx, u); } catch { return false; }
}

// ---------- อันตราย (ปลายทางของการผลัก/ลาก) ----------
function hazardAt(ctx, x, y) {
  const k = kindAt(ctx, x, y);
  if (k === "fd_nt_chasm") return (c, p, at, by) => kit.fallPit(c, p, at, { dmg: PIT_DMG, name: "ร่องลึก", by });
  if (k === "fd_nt_pit") return (c, p, at, by) => kit.fallPit(c, p, at, { dmg: PIT_DMG, name: "หลุมดิ่ง", by });
  return null;
}
// ทิศลากเข้าหาร่อง/หลุมที่ใกล้ที่สุด (ไม่เกิน DRAG_REACH ช่อง) — ไม่มี = ไม่ลาก
function dragDir(ctx, pos) {
  let best = null;
  for (const [dx, dy] of kit.DIRS) for (let i = 1; i <= DRAG_REACH; i++) {
    const tx = pos.x + dx * i, ty = pos.y + dy * i;
    if (!inBox(ctx.map(), tx, ty)) break;
    const k = kindAt(ctx, tx, ty);
    if (k === "fd_nt_chasm" || k === "fd_nt_pit") { if (!best || i < best.i) best = { dx, dy, i }; break; }
    if (ctx.map().terrain[K(tx, ty)]) break;
  }
  return best;
}

// ---------- ปุ่ม HUD ----------
const near = (ctx, p, x, y) => (p.pos.x === x && p.pos.y === y) || ctx.adjacent(p, x, y);
const lureNear = (ctx, s, p) => s.lures.find((l) => lureOn(ctx, l) && near(ctx, p, l.x, l.y)) || null;
function lureTargets(ctx, st, p) {
  return ctx.alive().filter((u) => u.id !== p.id && u.pos && !sameSide(ctx, p, u) && kit.cheb(u.pos, p.pos) <= LURE_RANGE && !hides(ctx, st, p, u)).map((u) => ({ x: u.pos.x, y: u.pos.y }));
}
const probeNear = (ctx, s, p) => PROBES.find((q) => ctx.adjacent(p, q.x, q.y)) || null;
const probeReady = (ctx, s, q) => !(s.probe[K(q.x, q.y)] > round(ctx));
function flareTiles(ctx, p) { const map = ctx.map(), out = []; for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) if (kit.cheb(p.pos, { x, y }) <= FLARE_RANGE) out.push({ x, y }); return out; }
function patchNear(ctx, s, p) { return PATCHES.findIndex((tiles, i) => patchLit(ctx, s, i) && tiles.some((t) => near(ctx, p, t.x, t.y))); }
function bridgeNear(ctx, s, p) {
  const onBridge = BRIDGES.some((b, i) => !s.broken.includes(i) && b.some((t) => t.x === p.pos.x && t.y === p.pos.y));
  if (onBridge) return -1;
  return BRIDGES.findIndex((b, i) => !s.broken.includes(i) && b.some((t) => ctx.adjacent(p, t.x, t.y)));
}

function hudActions(ctx, st, p) {
  const s = S(st); if (!s || !p || !p.pos) return [];
  const can = kit.canStrike(ctx, p), out = [];
  if (lureNear(ctx, s, p)) { const t = lureTargets(ctx, st, p); out.push({ key: "fd:l11:lure", icon: "🎣", name: "ปาไฟล่อ", disabled: !can || !t.length, tiles: t }); }
  const q = probeNear(ctx, s, p);
  if (q) out.push({ key: "fd:l11:flare", icon: "🎆", name: "ยิงพลุ", disabled: !can || !probeReady(ctx, s, q), tiles: kit.pickTiles(flareTiles(ctx, p)) });
  if (patchNear(ctx, s, p) >= 0) out.push({ key: "fd:l11:smash", icon: "🦠", name: "ทุบแพลงก์ตอน", disabled: !can });
  if (bridgeNear(ctx, s, p) >= 0) out.push({ key: "fd:l11:bridge", icon: "🌉", name: "ทุบสะพานหิน", disabled: !can });
  return out;
}
function charAction(ctx, st, p, key, tile) {
  const s = S(st); if (!s || !p || !p.pos || !kit.canStrike(ctx, p)) return false;
  if (key === "fd:l11:lure") return throwLure(ctx, st, s, p, tile);
  if (key === "fd:l11:flare") return flare(ctx, s, p, tile);
  if (key === "fd:l11:smash") return smash(ctx, s, p);
  if (key === "fd:l11:bridge") return breakBridge(ctx, s, p);
  return false;
}
const changed = (ctx, s) => { s.seq++; ctx.bump(); };

// 🎣 ปาไฟล่อ → ปลาตกเบ็ดยักษ์งับ + ลากเข้าหาร่อง
function throwLure(ctx, st, s, p, tile) {
  const l = lureNear(ctx, s, p); if (!l || !tile) return false;
  const u = kit.unitAt(ctx, tile.x, tile.y);
  if (!u || u.id === p.id || sameSide(ctx, p, u) || kit.cheb(u.pos, p.pos) > LURE_RANGE || hides(ctx, st, p, u)) return false;
  l.back = round(ctx) + LURE_BACK;
  const to = { ...u.pos };
  const hit = kit.hurt(ctx, u, LURE_DMG, { by: p, name: "🎣 ปลาตกเบ็ดยักษ์งับ" });
  let drag = null;
  if (u.alive && u.pos) {
    s.glow[u.id] = Math.max(s.glow[u.id] || 0, round(ctx) + LURE_GLOW - 1); // ไฟล่อติดตัว — ทุกคนเห็น
    if (hit) { const d = dragDir(ctx, u.pos); if (d) { const from = { ...u.pos }; const r = kit.shove(ctx, u, d.dx, d.dy, 1, hazardAt, p); drag = { from, to: u.pos ? { ...u.pos } : null, fell: !!r.hazard }; } }
  }
  ctx.fx("nt_angler", { by: p.id, id: u.id, lure: { x: l.x, y: l.y }, lair: { ...l.lair }, to, hit, drag });
  ctx.log(`🎣 ${p.name} ปาไฟล่อใส่ ${u.name} — ปลาตกเบ็ดยักษ์โผล่จากความมืด`);
  changed(ctx, s); ctx.useStrike(p, SECS.lure); return true;
}
// 🎆 พลุแสง: วง 3×3 ตาพร่า + ส่องสว่าง
function flare(ctx, s, p, tile) {
  const q = probeNear(ctx, s, p); if (!q || !probeReady(ctx, s, q) || !tile || kit.cheb(p.pos, tile) > FLARE_RANGE || !inBox(ctx.map(), tile.x, tile.y)) return false;
  s.probe[K(q.x, q.y)] = round(ctx) + FLARE_CD;
  s.flares.push({ x: tile.x, y: tile.y, until: round(ctx) + FLARE_TURNS - 1 });
  const hits = [];
  for (const t of kit.area(ctx, tile.x, tile.y, 1)) {
    const u = kit.unitAt(ctx, t.x, t.y);
    if (!u || u.id === p.id) continue;
    if (kit.dodges(ctx, u)) { ctx.log(`💨 ${u.name} หลบแสงพลุได้`); ctx.fx("nt_dodge", { id: u.id, x: u.pos.x, y: u.pos.y }); continue; }
    kit.status.blind(ctx, u, 1); hits.push(u.id);
  }
  ctx.fx("nt_flare", { by: p.id, from: { x: q.x, y: q.y }, to: { x: tile.x, y: tile.y }, r: FLARE_LIGHT, hits });
  ctx.log(`🎆 ${p.name} ยิงพลุแสง — ตาพร่า ${hits.length} คน`);
  changed(ctx, s); ctx.useStrike(p, SECS.flare); return true;
}
// 🦠 ทุบแพลงก์ตอน: ดงดับ + หมอกมืด
function smash(ctx, s, p) {
  const i = patchNear(ctx, s, p); if (i < 0) return false;
  const until = round(ctx) + INK_TURNS - 1, map = ctx.map(), set = new Set();
  for (const t of PATCHES[i]) addRing(map, set, t.x, t.y, 1);
  s.dark[i] = until;
  s.ink.push({ tiles: [...set], until, patch: i });
  const doused = [];
  for (const u of ctx.alive()) if (s.glow[u.id] >= round(ctx) && set.has(K(u.pos.x, u.pos.y))) { delete s.glow[u.id]; doused.push(u.id); }
  const c = PATCHES[i].reduce((a, t) => ({ x: a.x + t.x / PATCHES[i].length, y: a.y + t.y / PATCHES[i].length }), { x: 0, y: 0 });
  ctx.fx("nt_ink", { by: p.id, x: c.x, y: c.y, patch: i, tiles: [...set], doused });
  ctx.log(`🦠 ${p.name} ทุบดงแพลงก์ตอน — ความมืดคลุม`);
  changed(ctx, s); ctx.useStrike(p, SECS.smash); return true;
}
// 🌉 ทุบสะพานหิน: พังทั้งเส้น คนบนสะพานร่วง
function breakBridge(ctx, s, p) {
  const i = bridgeNear(ctx, s, p); if (i < 0) return false;
  s.broken.push(i);
  changed(ctx, s);
  const fell = [];
  for (const t of BRIDGES[i]) { const u = kit.unitAt(ctx, t.x, t.y); if (u) { fell.push(u.id); kit.fallPit(ctx, u, t, { dmg: PIT_DMG, name: "ร่องลึก", by: u.id === p.id ? null : p }); } }
  ctx.fx("nt_bridge", { by: p.id, bridge: i, tiles: BRIDGES[i].map((t) => ({ ...t })), fell });
  ctx.log(`🌉 ${p.name} ทุบสะพานหินพังลงร่อง`);
  ctx.useStrike(p, SECS.bridge); return true;
}

// ---------- ชั้นแผนที่: สะพานที่พัง = ร่อง ----------
function layer(ctx, st, map) {
  const s = S(st); if (!s || !s.broken.length) return map;
  const terrain = { ...map.terrain }, special = { ...(map.special || {}) };
  for (const i of s.broken) for (const t of BRIDGES[i]) { delete special[K(t.x, t.y)]; terrain[K(t.x, t.y)] = "fd_nt_chasm"; }
  return { ...map, terrain, special };
}
function layerVer(ctx, st) { const s = S(st); return s ? `b${s.broken.join(".")}` : ""; }

// ⚔️ ตีจากในหมอกมืด +1
function atkBonus(ctx, st, p) { const s = S(st); return s && p && p.pos && inInk(ctx, s, p.pos.x, p.pos.y) ? INK_ATK : 0; }

// ---------- จบตา / จบเทิร์น ----------
function onUnitEnd(ctx, st, p) {
  const s = S(st); if (!s || !p || !p.alive || !p.pos) return;
  const k = kindAt(ctx, p.pos.x, p.pos.y);
  if (k === "fd_nt_plankton") {
    const i = PATCHES.findIndex((tiles) => tiles.some((t) => t.x === p.pos.x && t.y === p.pos.y));
    if (i >= 0 && patchLit(ctx, s, i)) { s.glow[p.id] = Math.max(s.glow[p.id] || 0, round(ctx) + GLOW_TURNS - 1); ctx.fx("nt_glow", { id: p.id, x: p.pos.x, y: p.pos.y }); changed(ctx, s); }
  }
  if (k === "fd_nt_brine") { kit.status.poison(ctx, p, BRINE_POISON); ctx.fx("nt_brine", { id: p.id, x: p.pos.x, y: p.pos.y }); ctx.log(`🧪 ${p.name} แช่บ่อน้ำเกลือ — ติดพิษ`); }
  // แสงล่อปลอม: เข้าใกล้ = โดนงับ
  const l = s.lures.find((q) => lureOn(ctx, q) && kit.cheb(q, p.pos) <= 1);
  if (l) {
    l.back = round(ctx) + SNAP_BACK;
    const hit = kit.hurt(ctx, p, SNAP_DMG, { name: "🎣 แสงล่อปลอม ปลาตกเบ็ดงับ" });
    ctx.fx("nt_angler_snap", { id: p.id, lure: { x: l.x, y: l.y }, lair: { ...l.lair }, to: p.pos ? { ...p.pos } : { x: l.x, y: l.y }, hit });
    changed(ctx, s);
  }
}
const darkOn = (st) => !!(st && st.weather && st.weather.kind === "nt_dark" && st.weather.left > 0);
const edgeDist = (map, x, y) => Math.min(x, y, map.cols - 1 - x, map.rows - 1 - y);
function onEndTurn(ctx, st) {
  const s = S(st); if (!s) return;
  if (darkOn(st) && s.zone) {
    s.zone.depth = s.zone.next;
    const map = ctx.map(), hits = [];
    for (const u of ctx.alive()) {
      if (edgeDist(map, u.pos.x, u.pos.y) >= s.zone.depth || inLight(ctx, s, u)) continue;
      const at = { ...u.pos };
      if (kit.hurt(ctx, u, DARK_DMG, { name: "🌑 ความมืดบีบ" })) hits.push({ id: u.id, ...at });
    }
    ctx.fx("nt_dark_bite", { depth: s.zone.depth, hits });
    s.zone.next = s.zone.depth + 1;
  }
  const r = round(ctx);
  s.flares = s.flares.filter((f) => f.until > r);
  s.ink = s.ink.filter((z) => z.until > r);
  for (const [id, until] of Object.entries(s.glow)) if (!(until > r)) delete s.glow[id];
  for (const [i, until] of Object.entries(s.dark)) if (!(until > r)) delete s.dark[i];
  if ((r + 1) % BLOOM_EVERY === 0) { ctx.fx("nt_bloom", { round: r + 1 }); ctx.log("✨ ร่องลึกหายใจ — แพลงก์ตอนบานสว่าง"); }
  changed(ctx, s);
}
function weatherStart(ctx, st) {
  const s = S(st); if (!s) return;
  s.zone = { depth: 0, next: DARK_START };
  ctx.fx("nt_dark_start", { next: DARK_START });
  ctx.log("🌑 ความมืดบีบ! ความมืดกินเข้ามาจากขอบ — อยู่ในแสงไว้");
  changed(ctx, s);
}
function weatherEnd(ctx, st) {
  const s = S(st); if (!s) return;
  s.zone = null;
  ctx.fx("nt_dark_lift", {});
  changed(ctx, s);
}

// ---------- ข้อมูลให้ client ----------
function publicInfo(ctx, st) {
  const s = S(st); if (!s) return {};
  const map = ctx.map(), lit = publicLit(ctx, s);
  const warn = [];
  if (darkOn(st) && s.zone) for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) {
    const d = edgeDist(map, x, y);
    if (d >= s.zone.depth && d < s.zone.next && !map.terrain[K(x, y)] && !lit.has(K(x, y))) warn.push({ x, y, kind: "nt_dark" });
  }
  return {
    abyss: {
      lures: s.lures.map((l) => ({ id: l.id, x: l.x, y: l.y, lair: { ...l.lair }, on: lureOn(ctx, l) })),
      patches: PATCHES.map((tiles, i) => ({ i, lit: patchLit(ctx, s, i), tiles: tiles.map((t) => ({ ...t })) })),
      ink: s.ink.filter((z) => z.until >= round(ctx)).map((z) => ({ tiles: z.tiles.slice(), until: z.until })),
      flares: s.flares.filter((f) => f.until >= round(ctx)).map((f) => ({ x: f.x, y: f.y, r: FLARE_LIGHT })),
      probes: PROBES.map((q) => ({ x: q.x, y: q.y, ready: probeReady(ctx, s, q) })),
      glow: ctx.alive().filter((u) => glowing(ctx, s, u)).map((u) => ({ id: u.id, x: u.pos.x, y: u.pos.y })),
      broken: s.broken.slice(),
      bridges: BRIDGES.map((b) => b.map((t) => ({ ...t }))),
      bloom: bloomNow(ctx),
      zone: darkOn(st) && s.zone ? { depth: s.zone.depth, next: s.zone.next } : null,
      lit: [...lit],
    },
    ...(warn.length ? { warn } : {}),
  };
}

module.exports = {
  enter, hazardAt, hudActions, charAction, layer, layerVer, atkBonus, onUnitEnd, onEndTurn, weatherStart, weatherEnd, vision, hides, publicInfo,
  LURES, PATCHES, BRIDGES, PROBES, inLight,
  N: { LURE_RANGE, LURE_DMG, LURE_BACK, SNAP_DMG, SNAP_BACK, FLARE_RANGE, FLARE_LIGHT, FLARE_TURNS, FLARE_CD, INK_TURNS, INK_ATK, GLOW_TURNS, PIT_DMG, DARK_DMG, DARK_START, BLOOM_EVERY, BLOOM_LIGHT },
};
