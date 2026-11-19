// ============================================================
//  Nautilus ชั้น 4 "นครจมบาดาล" −3,000 ม. — ลูกเล่นโต้ตอบ + ความมืด + สภาพอากาศ (GRID_PLAN §8.9 · ผู้ใช้ "เอาทั้งหมด" 2026-11-19)
//  ผัง server/fodlan/map10.js · ภาพ client/src/board/fodlan/city.js + cityFx.js · ตัวเลขทั้งหมด = [Claude] ตั้งต้น
//   🗿 รูปปั้นเทพ (4 มุมลานวิหาร): ยืนติด → หมุนหันทิศ ตายิงลำแสงตามแนว (ไกลสุด 8 ถึงสิ่งกีดขวาง) ดาเมจ 3 ทะลุคนแรก (โดนสูงสุด 2 คน) · รูปปั้นนั้นพัก 2 เทิร์น
//   ⬛ แผ่นกดกับดัก (4 แผ่นข้างเสาหิน): ยืนบน/ติด → วางชนวน · ศัตรูของคนวางจบตาบนแผ่น/ถูกผลักลงแผ่น = เสาข้างๆ ล้มทับแนว 4 ช่อง ดาเมจ 3
//       เสาที่ล้มกลายเป็นซากเสาขวางทาง (เดิน 2 ก้าว · หลบหลีก) · แผ่นละครั้ง
//   ⛩️ ประตูหิน + คันโยก (2 บาน): ยืนติดคันโยก → ปิด/เปิด · ปิดใส่คนในช่องประตู = ดาเมจ 3 + ถูกดันออกข้างประตู · ปิดแล้วเป็นสิ่งกีดขวาง (ตัดทางลัด)
//   🔯 วงอักขระ (หินตั้ง 4 มุม): ยืนติดหินตั้ง → ปลุกวง · ทุกคนในวง (ห่างแท่นบูชา ≤ 2) ยกเว้นคนปลุก ใช้สกิลไม่ได้ 1 เทิร์น (หลบได้) · วงพัก 3 เทิร์น
//   🔣 อักขระบนพื้น: จบตาบนอักขระที่เรือง → สุ่ม กับดัก (ดาเมจ 2 + ถูกตรึง) หรือ พร (เสริมพลัง +1 2 เทิร์น + ออกซิเจน +2) · ดับไป 3 เทิร์น
//   ✨ รูปปั้นเรืองแสง (3 ตัว): ตีปกติให้แตก → แสงวาบ ศัตรูติดรูปปั้นตาพร่า · คนตีเรืองแสงรอบตัว 2 ช่อง 3 เทิร์น (ทุกคนเห็นในแสงนั้น)
//   🔱 แท่นบูชาทะเล (กลางวงอักขระ): ยืนติด → ถวาย 3 เหรียญ = เสริมพลัง +2 3 เทิร์น + ออกซิเจน +3 (คนละครั้งต่อการมาเยือน)
//  ความมืด (ชั้น 3–4): เห็นแค่ระยะเดินของตัวเอง (ทีมเห็นร่วม) + ช่องในแสง (วงอักขระ · อักขระที่เรือง · ตารูปปั้นเทพ · โดมอากาศ · รูปปั้นเรืองแสง · คนเรืองแสง · ไฟฉายเรือ)
//  สภาพอากาศ: 🌀 น้ำวนยักษ์ (ดูดเข้าวิหารกลาง 1 ช่อง/จบเทิร์น · ใกล้กลาง ≤ 4 = 2 ช่อง · ตาน้ำวน = ลานวิหาร ดาเมจ 2 + ออกซิเจน −1)
//              ❄️ กระแสน้ำเย็นจัด (ทุกคนเดิน −1 · แนวกระแสเย็น 3 แถวเห็นล่วงหน้า + ลานน้ำท่วม: จบเทิร์นโดนธาตุน้ำแข็ง + น้ำแข็งกัด)
// ============================================================
const kit = require("./ntKit");
const { K } = kit;
const CHAR_HOOKS = require("../../characters/index");

const STATUE_DMG = 3, STATUE_LEN = 8, STATUE_HITS = 2, STATUE_CD = 2;
const PILLAR_DMG = 3, PILLAR_LEN = 4;
const GATE_DMG = 3;
const RING_R = 2, RING_CD = 3, RING_TURNS = 2; // noskill 2 = เทิร์นนี้ + เทิร์นหน้า (ลดทุกจบเทิร์น)
const RUNE_DMG = 2, RUNE_CD = 3, RUNE_MIGHT = 1, RUNE_O2 = 2;
const GLOW_TURNS = 3, GLOW_R = 2;
const ALTAR_COST = 3, ALTAR_MIGHT = 2, ALTAR_TURNS = 3, ALTAR_O2 = 3;
const PULL_NEAR = 4, EYE_DMG = 2, EYE_O2 = 1;
const COLD_ROWS = 3, COLD_TURNS = 2;
const SECS = { statue: 1.6, plate: 1, gate: 1.3, ring: 1.6, altar: 1.4, lstatue: 1.4 };

// แผ่นกด: ช่อง · เสาที่ล้ม · ทิศล้ม (แนว 4 ช่องจากเสา ผ่านแผ่น)
const PLATES = [
  { x: 9, y: 2, col: { x: 12, y: 2 }, dir: [-1, 0] },
  { x: 10, y: 4, col: { x: 7, y: 4 }, dir: [1, 0] },
  { x: 4, y: 10, col: { x: 4, y: 11 }, dir: [0, -1] },
  { x: 16, y: 9, col: { x: 16, y: 11 }, dir: [0, -1] },
];
// ประตูหิน: ช่องประตู · คันโยก · แกนดันออก (ประตูอยู่ในกำแพงแนวตั้ง → ดันซ้าย/ขวา)
const GATES = [
  { x: 5, y: 7, lever: { x: 5, y: 6 }, axis: [1, 0] },
  { x: 14, y: 7, lever: { x: 14, y: 6 }, axis: [1, 0] },
];
const RING = { x: 10, y: 13 }; // แท่นบูชา = กลางวง
const CENTER = { x: 10, y: 7.5 }; // กลางวิหาร (พิกัดโลก — วิหาร x 8–11 · y 6–8) = ตาน้ำวน

const S = (st) => st && st.nt10;
const kindAt = (ctx, x, y) => { const m = ctx.map(); return m.terrain[K(x, y)] || (m.special && m.special[K(x, y)]) || null; };
const baseKind = (ctx, kind) => { const m = ctx.Board.MAPS[ctx.match.board.area] || ctx.map(); const out = []; for (const src of [m.terrain, m.special]) for (const [k, v] of Object.entries(src || {})) if (v === kind) { const [x, y] = k.split(",").map(Number); out.push({ x, y }); } return out.sort((a, b) => a.y - b.y || a.x - b.x); };
const round = (ctx) => ctx.match.roundNumber || 0;
const ally = (ctx, a, b) => !!a && !!b && (a.id === b.id || !!(ctx.combat.sameTeam && ctx.combat.sameTeam(a, b)));
const mapImmune = (p, kind) => { const h = p && CHAR_HOOKS[p.characterId]; return !!(h && h.mapEffectImmune && h.mapEffectImmune(p, kind)); };
const lazyElement = () => require("../element");

function enter(ctx, st) {
  const statues = baseKind(ctx, "fd_nt_godstatue");
  st.nt10 = {
    statueCd: {}, statueDir: Object.fromEntries(statues.map((t) => [K(t.x, t.y), [t.x < 10 ? -1 : 1, 0]])),
    plates: {}, sprung: [], colDown: [], fallen: [],
    gates: Object.fromEntries(GATES.map((g) => [K(g.x, g.y), true])),
    runeCd: {}, ringCd: 0, broken: [], glow: {}, altar: [], cold: null,
  };
}

// ---------- ช่องใกล้ตัว ----------
const nearTile = (ctx, p, list) => list.find((t) => ctx.adjacent(p, t.x, t.y)) || null;
const onOrNear = (ctx, p, list) => list.find((t) => (p.pos.x === t.x && p.pos.y === t.y) || ctx.adjacent(p, t.x, t.y)) || null;
function statueBeams(ctx, t) {
  const out = [];
  for (const [dx, dy] of kit.DIRS) { const line = kit.line(ctx, t.x, t.y, dx, dy, STATUE_LEN); if (line.length) out.push({ dir: [dx, dy], tiles: line }); }
  return out;
}
function statueNear(ctx, s, p) { return nearTile(ctx, p, baseKind(ctx, "fd_nt_godstatue")); }
const statueReady = (ctx, s, t) => !(s.statueCd[K(t.x, t.y)] > round(ctx));
function plateNear(ctx, s, p) { return onOrNear(ctx, p, PLATES.filter((pl) => !s.plates[K(pl.x, pl.y)] && !s.sprung.includes(K(pl.x, pl.y)))); }
function gateNear(ctx, s, p) { return GATES.find((g) => ctx.adjacent(p, g.lever.x, g.lever.y)) || null; }
function pylonNear(ctx, s, p) { return nearTile(ctx, p, baseKind(ctx, "fd_nt_pylon")); }
const altarNear = (ctx, p) => ctx.adjacent(p, RING.x, RING.y);
const inRing = (pos) => !!pos && kit.cheb(pos, RING) <= RING_R;

// ประตู: ปิดใส่คนในช่องประตูได้ไหม (ต้องมีที่ให้ดันออก) → ช่องที่จะดันไป | null (ไม่มีคน = {})
function gatePush(ctx, g, by) {
  const u = kit.unitAt(ctx, g.x, g.y);
  if (!u) return {};
  const sides = [[g.axis[0], g.axis[1]], [-g.axis[0], -g.axis[1]]];
  if (by && by.pos) sides.sort((a, b) => kit.cheb({ x: g.x + b[0], y: g.y + b[1] }, by.pos) - kit.cheb({ x: g.x + a[0], y: g.y + a[1] }, by.pos)); // ดันออกฝั่งที่ไกลจากคนโยก
  for (const [dx, dy] of sides) if (ctx.free(g.x + dx, g.y + dy, u.id)) return { u, to: { x: g.x + dx, y: g.y + dy } };
  return null;
}

// ---------- ปุ่ม HUD ----------
function hudActions(ctx, st, p) {
  const s = S(st); if (!s || !p || !p.pos) return [];
  const can = kit.canStrike(ctx, p), out = [];
  const g = statueNear(ctx, s, p);
  if (g) { const tiles = statueBeams(ctx, g).flatMap((b) => b.tiles); out.push({ key: "fd:l10:statue", icon: "🗿", name: "รูปปั้นเทพ", disabled: !can || !statueReady(ctx, s, g) || !tiles.length, tiles: kit.pickTiles(tiles) }); }
  if (plateNear(ctx, s, p)) out.push({ key: "fd:l10:plate", icon: "⬛", name: "วางชนวนแผ่นกด", disabled: !can });
  const gt = gateNear(ctx, s, p);
  if (gt) { const open = s.gates[K(gt.x, gt.y)]; out.push({ key: "fd:l10:gate", icon: open ? "🚪" : "⛩️", name: open ? "ปิดประตูหิน" : "เปิดประตูหิน", disabled: !can || (open && !gatePush(ctx, gt, p)) }); }
  if (pylonNear(ctx, s, p)) out.push({ key: "fd:l10:ring", icon: "🔯", name: "ปลุกวงอักขระ", disabled: !can || s.ringCd > round(ctx) });
  if (altarNear(ctx, p)) out.push({ key: "fd:l10:altar", icon: "🔱", name: `ถวาย ${ALTAR_COST} เหรียญ`, disabled: !can || (p.gold || 0) < ALTAR_COST || s.altar.includes(p.id) });
  return out;
}
function charAction(ctx, st, p, key, tile) {
  const s = S(st); if (!s || !p || !p.pos || !kit.canStrike(ctx, p)) return false;
  if (key === "fd:l10:statue") return statue(ctx, s, p, tile);
  if (key === "fd:l10:plate") return armPlate(ctx, s, p);
  if (key === "fd:l10:gate") return gate(ctx, s, p);
  if (key === "fd:l10:ring") return ring(ctx, s, p);
  if (key === "fd:l10:altar") return altar(ctx, s, p);
  return false;
}

// 🗿 รูปปั้นเทพ: หันตามช่องที่เลือก → ลำแสงแนวตรง โดนคนแรก ทะลุไปคนที่สอง
function statue(ctx, s, p, tile) {
  const g = statueNear(ctx, s, p); if (!g || !tile || !statueReady(ctx, s, g)) return false;
  const beam = statueBeams(ctx, g).find((b) => b.tiles.some((t) => t.x === tile.x && t.y === tile.y)); if (!beam) return false;
  s.statueDir[K(g.x, g.y)] = beam.dir;
  s.statueCd[K(g.x, g.y)] = round(ctx) + STATUE_CD;
  const hits = [], passed = [];
  let end = beam.tiles[beam.tiles.length - 1];
  for (const t of beam.tiles) {
    const u = kit.unitAt(ctx, t.x, t.y);
    if (u && u.id !== p.id) {
      passed.push(u.id);
      if (kit.hurt(ctx, u, STATUE_DMG, { by: p, name: "🗿 ตารูปปั้นเทพ" })) hits.push(u.id);
      if (passed.length >= STATUE_HITS) { end = t; break; }
    }
  }
  ctx.fx("nt_god_beam", { by: p.id, from: { x: g.x, y: g.y }, dir: { x: beam.dir[0], y: beam.dir[1] }, to: { ...end }, hits });
  ctx.log(`🗿 ${p.name} หมุนรูปปั้นเทพ — ลำแสงจากดวงตา`);
  ctx.useStrike(p, SECS.statue); return true;
}

// ⬛ แผ่นกด
function armPlate(ctx, s, p) {
  const pl = plateNear(ctx, s, p); if (!pl) return false;
  s.plates[K(pl.x, pl.y)] = p.id;
  ctx.fx("nt_plate_arm", { by: p.id, x: pl.x, y: pl.y });
  ctx.log(`⬛ ${p.name} วางชนวนแผ่นกด`);
  ctx.bump(); ctx.useStrike(p, SECS.plate); return true;
}
const plateAt = (s, x, y) => (s.plates[K(x, y)] ? PLATES.find((pl) => pl.x === x && pl.y === y) : null);
// ศัตรูของคนวางอยู่บนแผ่น → เสาล้ม (คืน true = ทำงาน)
function springIfEnemy(ctx, s, u) {
  if (!u || !u.alive || !u.pos) return false;
  const pl = plateAt(s, u.pos.x, u.pos.y); if (!pl) return false;
  const owner = ctx.match.players[s.plates[K(pl.x, pl.y)]] || null;
  if (owner && ally(ctx, owner, u)) return false;
  spring(ctx, s, pl, owner);
  return true;
}
function spring(ctx, s, pl, owner) {
  const k = K(pl.x, pl.y);
  delete s.plates[k];
  s.sprung.push(k);
  const line = kit.line(ctx, pl.col.x, pl.col.y, pl.dir[0], pl.dir[1], PILLAR_LEN);
  const hits = [];
  for (const t of line) { const u = kit.unitAt(ctx, t.x, t.y); if (u && kit.hurt(ctx, u, PILLAR_DMG, { by: owner, name: "🏛️ เสาหินล้มทับ" })) hits.push(u.id); }
  s.colDown.push(K(pl.col.x, pl.col.y));
  for (const t of line) if (!s.fallen.includes(K(t.x, t.y))) s.fallen.push(K(t.x, t.y));
  ctx.fx("nt_pillar_fall", { x: pl.x, y: pl.y, col: { ...pl.col }, dir: { x: pl.dir[0], y: pl.dir[1] }, line, hits, by: owner ? owner.id : null });
  ctx.log("🏛️ แผ่นกดทำงาน — เสาหินล้มทับแนว");
  ctx.bump();
}

// ⛩️ ประตูหิน
function gate(ctx, s, p) {
  const g = gateNear(ctx, s, p); if (!g) return false;
  const k = K(g.x, g.y), open = s.gates[k];
  if (open) {
    const push = gatePush(ctx, g, p); if (!push) return false;
    let hit = false;
    if (push.u) {
      const from = { ...push.u.pos };
      hit = kit.hurt(ctx, push.u, GATE_DMG, { by: p, name: "⛩️ ประตูหินปิดทับ" });
      if (push.u.alive && push.u.pos) { push.u.pos = { ...push.to }; ctx.fx("nt_shove", { id: push.u.id, from, to: { ...push.to } }); }
    }
    s.gates[k] = false;
    ctx.fx("nt_gate", { x: g.x, y: g.y, lever: { ...g.lever }, open: false, by: p.id, hit: push.u ? push.u.id : null, dmg: hit });
    ctx.log(`⛩️ ${p.name} ดึงคันโยก — ประตูหินปิด`);
  } else {
    s.gates[k] = true;
    ctx.fx("nt_gate", { x: g.x, y: g.y, lever: { ...g.lever }, open: true, by: p.id });
    ctx.log(`⛩️ ${p.name} ดึงคันโยก — ประตูหินเปิด`);
  }
  ctx.bump(); ctx.useStrike(p, SECS.gate); return true;
}

// 🔯 วงอักขระ
function ring(ctx, s, p) {
  if (!pylonNear(ctx, s, p) || s.ringCd > round(ctx)) return false;
  s.ringCd = round(ctx) + RING_CD;
  const sealed = [];
  for (const u of ctx.alive()) {
    if (u.id === p.id || !inRing(u.pos)) continue;
    if (kit.dodges(ctx, u)) { ctx.log(`💨 ${u.name} หลบวงอักขระได้`); ctx.fx("nt_dodge", { id: u.id, x: u.pos.x, y: u.pos.y }); continue; }
    if (ctx.Status.applyDebuff(u, "noskill", null, RING_TURNS)) sealed.push(u.id);
  }
  ctx.fx("nt_ring", { x: RING.x, y: RING.y, r: RING_R, by: p.id, sealed });
  ctx.log(`🔯 ${p.name} ปลุกวงอักขระ — ${sealed.length ? `${sealed.length} คนใช้สกิลไม่ได้` : "ไม่มีใครติดผนึก"}`);
  ctx.useStrike(p, SECS.ring); return true;
}

// 🔱 แท่นบูชาทะเล
function altar(ctx, s, p) {
  if (!altarNear(ctx, p) || (p.gold || 0) < ALTAR_COST || s.altar.includes(p.id)) return false;
  p.gold -= ALTAR_COST;
  s.altar.push(p.id);
  ctx.Status.applyBuff(p, "might", ALTAR_MIGHT, ALTAR_TURNS);
  kit.o2(ctx, p, ALTAR_O2, "altar");
  ctx.fx("nt_altar", { id: p.id, x: RING.x, y: RING.y, from: { ...p.pos } });
  ctx.log(`🔱 ${p.name} ถวายเหรียญแด่ทะเล — เสริมพลัง +${ALTAR_MIGHT} ${ALTAR_TURNS} เทิร์น · ออกซิเจน +${ALTAR_O2}`);
  ctx.useStrike(p, SECS.altar); return true;
}

// ---------- ✨ รูปปั้นเรืองแสง (ตีปกติ) ----------
function objects(ctx, st) {
  const s = S(st); if (!s) return [];
  return baseKind(ctx, "fd_nt_lightstatue").filter((t) => !s.broken.includes(K(t.x, t.y))).map((t) => ({ id: `fd:nt10:lstatue:${t.x},${t.y}`, x: t.x, y: t.y, kind: "lightstatue", strike: true }));
}
function strikeObject(ctx, st, p, id) {
  const s = S(st); if (!s || !String(id).startsWith("fd:nt10:lstatue:")) return false;
  const [x, y] = String(id).slice(16).split(",").map(Number);
  if (s.broken.includes(K(x, y)) || kindAt(ctx, x, y) !== "fd_nt_lightstatue") return false;
  s.broken.push(K(x, y));
  s.glow[p.id] = round(ctx) + GLOW_TURNS;
  const blind = [];
  for (const u of ctx.alive()) if (u.id !== p.id && !ally(ctx, u, p) && kit.cheb(u.pos, { x, y }) <= 1) { if (!kit.dodges(ctx, u) && ctx.Status.applyDebuff(u, "blind", null, 2)) blind.push(u.id); }
  ctx.fx("nt_statue_shatter", { x, y, by: p.id, blind });
  ctx.log(`✨ ${p.name} ตีรูปปั้นเรืองแสงแตก — แสงห่อหุ้มตัว ${GLOW_TURNS} เทิร์น`);
  ctx.bump();
  return SECS.lstatue;
}

// ---------- ชั้นแผนที่ ----------
function layer(ctx, st, map) {
  const s = S(st); if (!s) return map;
  const closed = GATES.filter((g) => !s.gates[K(g.x, g.y)]);
  if (!s.broken.length && !s.colDown.length && !s.fallen.length && !closed.length) return map;
  const terrain = { ...map.terrain }, special = { ...(map.special || {}) };
  for (const k of s.broken) { delete terrain[k]; special[k] = "fd_nt_shards"; }
  for (const k of s.fallen) if (!terrain[k]) special[k] = "fd_nt_fallen";
  for (const k of s.colDown) { delete terrain[k]; special[k] = "fd_nt_cityrubble"; }
  for (const g of closed) { const k = K(g.x, g.y); delete special[k]; terrain[k] = "fd_nt_gateshut"; }
  return { ...map, terrain, special };
}
function layerVer(ctx, st) {
  const s = S(st); if (!s) return "";
  return `b${s.broken.length}c${s.colDown.length}g${GATES.map((g) => (s.gates[K(g.x, g.y)] ? 1 : 0)).join("")}`;
}

// ---------- อันตรายปลายทางการผลัก: แผ่นกดที่วางชนวนไว้ ----------
function hazardAt(ctx, x, y) {
  const s = S(ctx.match.fodlan && ctx.match.fodlan.s);
  if (!s || !plateAt(s, x, y) || !ctx.free(x, y)) return null;
  return (c, p, to) => { p.pos = { x: to.x, y: to.y }; springIfEnemy(c, s, p); };
}

// ---------- จบตา: แผ่นกด · อักขระบนพื้น ----------
function onUnitEnd(ctx, st, p) {
  const s = S(st); if (!s || !p || !p.alive || !p.pos) return;
  if (springIfEnemy(ctx, s, p)) return;
  const k = K(p.pos.x, p.pos.y);
  if (kindAt(ctx, p.pos.x, p.pos.y) === "fd_nt_floorrune" && !(s.runeCd[k] > round(ctx))) {
    s.runeCd[k] = round(ctx) + RUNE_CD;
    if (ctx.rng() < 0.5) {
      const hit = kit.hurt(ctx, p, RUNE_DMG, { name: "🔣 อักขระสาป" });
      if (hit) kit.status.root(ctx, p, 1);
      ctx.fx("nt_rune", { id: p.id, x: p.pos ? p.pos.x : 0, y: p.pos ? p.pos.y : 0, trap: true, hit });
      ctx.log(`🔣 ${p.name} เหยียบอักขระสาป`);
    } else {
      ctx.Status.applyBuff(p, "might", RUNE_MIGHT, 2);
      kit.o2(ctx, p, RUNE_O2, "rune");
      ctx.fx("nt_rune", { id: p.id, x: p.pos.x, y: p.pos.y, trap: false });
      ctx.log(`🔣 ${p.name} ได้รับพรอักขระ — เสริมพลัง +${RUNE_MIGHT} · ออกซิเจน +${RUNE_O2}`);
    }
    ctx.bump();
  }
}

// ---------- จบเทิร์น: สภาพอากาศ · ศัตรูที่ยืนบนแผ่นกด ----------
const wxOn = (st, kind) => !!(st && st.weather && st.weather.kind === kind && st.weather.left > 0);
function onEndTurn(ctx, st) {
  const s = S(st); if (!s) return;
  for (const u of ctx.alive()) springIfEnemy(ctx, s, u); // ถูกน้ำวน/กระแสพัดมาหยุดบนแผ่น
  if (wxOn(st, "nt_maelstrom")) maelstrom(ctx, s);
  if (wxOn(st, "nt_cold")) cold(ctx, s);
  for (const [id, until] of Object.entries(s.glow)) if (until <= round(ctx)) delete s.glow[id];
  ctx.bump();
}
function weatherStart(ctx, st) {
  const s = S(st); if (!s) return;
  if (wxOn(st, "nt_maelstrom")) { ctx.fx("nt_maelstrom", { x: CENTER.x, y: CENTER.y }); ctx.log("🌀 น้ำวนยักษ์ก่อตัวเหนือวิหาร!"); }
  if (wxOn(st, "nt_cold")) { s.cold = pickColdRows(ctx); ctx.fx("nt_cold", { rows: s.cold }); ctx.log("❄️ กระแสน้ำเย็นจัดไหลผ่านนคร"); }
}
function weatherEnd(ctx, st) { const s = S(st); if (s) s.cold = null; }

// 🌀 น้ำวนยักษ์: ดูดเข้าหากลางวิหาร (ใกล้กว่าเดินก่อน — ไม่ชนกันเอง) · ตาน้ำวน = ลานวิหาร
const eyeTiles = (ctx) => baseKind(ctx, "fd_nt_plaza").concat((ctx.map().heal ? [...ctx.map().heal] : []).map((k) => { const [x, y] = String(k).split(",").map(Number); return { x, y }; }));
function maelstrom(ctx, s) {
  const off = (u) => [CENTER.x - (u.pos.x + 0.5), CENTER.y - (u.pos.y + 0.5)];
  const order = ctx.alive().filter((u) => u.pos).sort((a, b) => { const [ax, ay] = off(a), [bx, by] = off(b); return Math.abs(ax) + Math.abs(ay) - Math.abs(bx) - Math.abs(by); });
  const moves = [];
  for (const u of order) {
    const [dx, dy] = off(u);
    const step = Math.abs(dx) >= Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
    if (!step[0] && !step[1]) continue;
    const n = Math.max(Math.abs(dx), Math.abs(dy)) <= PULL_NEAR ? 2 : 1;
    const from = { ...u.pos };
    const r = kit.shove(ctx, u, step[0], step[1], n, hazardAt, null);
    if (r.moved || r.hazard) moves.push({ id: u.id, from, to: u.pos ? { ...u.pos } : null });
  }
  const eye = new Set(eyeTiles(ctx).map((t) => K(t.x, t.y))), hurtIds = [];
  for (const u of ctx.alive()) if (u.pos && eye.has(K(u.pos.x, u.pos.y))) { if (kit.hurt(ctx, u, EYE_DMG, { name: "🌀 ตาน้ำวน" })) { kit.o2(ctx, u, -EYE_O2, "maelstrom"); hurtIds.push(u.id); } }
  ctx.fx("nt_maelstrom_pull", { x: CENTER.x, y: CENTER.y, moves, hits: hurtIds });
}
// ❄️ กระแสน้ำเย็นจัด: แถบ 3 แถวที่ประกาศไว้ + ลานน้ำท่วม → ธาตุน้ำแข็ง + น้ำแข็งกัด · แล้วสุ่มแถบของเทิร์นหน้า
function pickColdRows(ctx) { const map = ctx.map(); const y0 = 2 + Math.floor(ctx.rng() * (map.rows - 2 - COLD_ROWS + 1)); return Array.from({ length: COLD_ROWS }, (_, i) => y0 + i); }
function cold(ctx, s) {
  const rows = new Set(s.cold || []), chilled = [];
  for (const u of ctx.alive()) {
    if (!u.pos || mapImmune(u, "frostbite")) continue;
    if (!rows.has(u.pos.y) && kindAt(ctx, u.pos.x, u.pos.y) !== "fd_nt_flood") continue;
    try { lazyElement().apply(u, "ice", null); } catch (err) { void err; }
    if (u.alive) ctx.Status.applyDebuff(u, "frostbite", 1, COLD_TURNS);
    chilled.push(u.id);
  }
  ctx.fx("nt_cold_sweep", { rows: [...rows], chilled });
  if (chilled.length) ctx.log(`❄️ กระแสน้ำเย็นจัดพัดผ่าน — ${chilled.length} คนถูกน้ำแข็งกัด`);
  s.cold = pickColdRows(ctx);
}
function movMod(ctx, st, p) { return wxOn(st, "nt_cold") && !mapImmune(p, "frostbite") ? -1 : 0; }

// ---------- ความมืด (ชั้น 3–4): ระยะเดินตัวเอง + ทีม + แสง ----------
function lightKeys(ctx, s) {
  const out = new Set(), map = ctx.map(), now = round(ctx);
  const add = (x, y, r = 0) => { for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) if (kit.inB(map, x + dx, y + dy)) out.add(K(x + dx, y + dy)); };
  for (const t of baseKind(ctx, "fd_nt_runering").concat(baseKind(ctx, "fd_nt_sanctum"))) add(t.x, t.y); // วงอักขระเรืองตลอด
  for (const t of baseKind(ctx, "fd_nt_floorrune")) if (!(s.runeCd[K(t.x, t.y)] > now)) add(t.x, t.y);
  for (const t of baseKind(ctx, "fd_nt_godstatue")) add(t.x, t.y, 1); // ตารูปปั้นเทพ
  for (const t of baseKind(ctx, "fd_nt_lightstatue")) if (!s.broken.includes(K(t.x, t.y))) add(t.x, t.y, 1);
  for (const k of map.heal || []) { const [x, y] = String(k).split(",").map(Number); add(x, y); }
  for (const [id, until] of Object.entries(s.glow)) { const u = ctx.match.players[id]; if (until > now && u && u.alive && u.pos) add(u.pos.x, u.pos.y, GLOW_R); }
  return out;
}
const teamOf = (ctx, viewer) => ctx.alive().filter((u) => u.pos && ally(ctx, u, viewer));
function sight(ctx, s, viewer) {
  const map = ctx.map(), set = lightKeys(ctx, s);
  for (const e of teamOf(ctx, viewer)) {
    const r = Math.max(2, Number(ctx.action.baseMovOf ? ctx.action.baseMovOf(e) : 3) || 3);
    for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) if (Math.abs(x - e.pos.x) + Math.abs(y - e.pos.y) <= r) set.add(K(x, y));
  }
  return set;
}
function vision(ctx, st, viewer) {
  const s = S(st); if (!s || !viewer) return null;
  return [...sight(ctx, s, viewer)];
}
function hides(ctx, st, viewer, target) {
  const s = S(st); if (!s || !viewer || !target || !target.pos) return false;
  if (ally(ctx, viewer, target)) return false;
  if (target.exposedRound === round(ctx)) return false; // ตี/ใช้ของใส่คนอื่น = โผล่จนจบเทิร์น
  return !sight(ctx, s, viewer).has(K(target.pos.x, target.pos.y));
}

// ---------- ข้อมูลให้ client ----------
function publicInfo(ctx, st) {
  const s = S(st); if (!s) return {};
  const now = round(ctx);
  const warn = [];
  if (wxOn(st, "nt_maelstrom")) for (const t of eyeTiles(ctx)) warn.push({ x: t.x, y: t.y, kind: "maelstrom" });
  if (wxOn(st, "nt_cold") && s.cold) { const m = ctx.map(); for (const y of s.cold) for (let x = 0; x < m.cols; x++) if (!m.terrain[K(x, y)]) warn.push({ x, y, kind: "cold" }); }
  return {
    city: {
      statues: baseKind(ctx, "fd_nt_godstatue").map((t) => ({ x: t.x, y: t.y, dir: s.statueDir[K(t.x, t.y)] || [1, 0], cd: Math.max(0, (s.statueCd[K(t.x, t.y)] || 0) - now) })),
      plates: PLATES.map((pl) => ({ x: pl.x, y: pl.y, col: pl.col, dir: pl.dir, armed: s.plates[K(pl.x, pl.y)] || null, sprung: s.sprung.includes(K(pl.x, pl.y)) })),
      gates: GATES.map((g) => ({ x: g.x, y: g.y, lever: g.lever, open: !!s.gates[K(g.x, g.y)] })),
      ring: { x: RING.x, y: RING.y, r: RING_R, cd: Math.max(0, s.ringCd - now) },
      runes: Object.fromEntries(Object.entries(s.runeCd).filter(([, v]) => v > now)),
      broken: s.broken.slice(),
      glow: Object.entries(s.glow).filter(([, v]) => v > now).map(([id]) => id),
      cold: s.cold ? s.cold.slice() : null,
      center: { ...CENTER },
    },
    ...(warn.length ? { warn } : {}),
  };
}

module.exports = {
  enter, hudActions, charAction, objects, strikeObject, layer, layerVer, hazardAt, onUnitEnd, onEndTurn, weatherStart, weatherEnd, movMod, vision, hides, publicInfo,
  PLATES, GATES, RING, CENTER, STATUE_DMG, PILLAR_DMG, GATE_DMG,
};
