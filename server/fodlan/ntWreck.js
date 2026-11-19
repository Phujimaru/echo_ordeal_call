// ============================================================
//  Nautilus ชั้น 2 "ซากเรือรบ" — ลูกเล่นโต้ตอบ + สภาพอากาศ (GRID_PLAN §8.9 · ผู้ใช้ "เอาทั้งหมด" 2026-11-19) · ผัง map8.js · ภาพ client/src/board/fodlan/wreck.js + wreckFx.js
//  ทุกปุ่ม = ยืนติด/อยู่ใกล้ → ใช้แทนการตี (ctx.useStrike) · ทุกการโดนหลบได้ (kit.hurt) · ตัวเลขทั้งหมด [Claude]
//   💣 ปืนใหญ่ (4 กระบอกในห้องหัวเรือ/ท้ายเรือ): ยืนติด → เลือกทิศ ลูกยิงทะลุช่องปืนของตัวเรือไปตามแนวไกล 7 · ทุกคนในแนวดาเมจ 3 + กระเด็น 1
//        ชนถังดินปืน = ถังระเบิด · บรรจุใหม่ 2 เทิร์น
//   🛢️ ถังดินปืน (7 ถัง เป็นกลุ่ม): ตี/ยิง/ผลักคนชน → ระเบิด 3×3 ดาเมจ 3 · ถังในวงระเบิดลามต่อ (คนละ 1 ครั้งต่อการระเบิดหนึ่งชุด · คนตีไม่โดน)
//   ⛓️ กว้านโซ่สมอ: ยืนติดกว้าน → เลือกแถว 1–8 · โซ่ตึงฟาดทั้งแถวจากเสาสมอ (x16) ออกไปจนชนสิ่งกีดขวาง (ไกล 12) ดาเมจ 2 + ลากเข้าหาสมอ 3 ช่อง · ชนถังดินปืน = ระเบิด · พัก 2 เทิร์น
//   📦 ปั้นจั่นรอก (3 จุดหน้าประตูห้องเรือ): ตี/ยิงเชือกที่เสา → ลังหล่นทับ 2×2 ดาเมจ 4 แล้วแตกเป็นกองลัง (เดิน 2 ก้าว) · ครั้งเดียวต่อปั้นจั่น
//   🚪 ประตูกั้นน้ำ: ยืนติดประตู → ปิดทุกประตูของห้องนั้น (ห้ามมีคนยืนขวางประตู) · ห้องที่ปิด = น้ำท่วม ทุกคนในห้องออกซิเจน −2 ทุกจบเทิร์น · ห้องอากาศในห้องใช้ไม่ได้
//        ตีประตูที่ปิด (จากในหรือนอก) = พังเปิดทั้งห้อง · ปิดซ้ำได้อีกหลัง 2 เทิร์น
//   🐍 เหยื่อปลาไหลมอเรย์: อยู่ห่างรูปลาไหลที่พร้อมไม่เกิน 4 → ปาเหยื่อใส่คนในระยะ 4 ที่อยู่ห่างรูนั้นไม่เกิน 2 → ปลาไหลพุ่งงับ ดาเมจ 2 + เลือดไหล · รูนั้นพัก 2 เทิร์น
//   🧰 หีบสมบัติ: จบตาบนหีบ = เปิด (ครั้งเดียวต่อหีบ) เหรียญ +3 · 30% หีบกัด ดาเมจ 2 + ถูกตรึง 1 เทิร์น
//   🧱 ตัวเรือถล่ม (ของเดิม): เทิร์นที่ 2 และ 4 ของชั้น เตือนช่วงผนัง 3 ช่องข้างตัวเรือ → ต้นเทิร์นถัดไปถล่มเป็นสิ่งกีดขวาง คนที่ยืนอยู่ดาเมจ 3 แล้วถูกดันออกช่องว่างใกล้สุด (ไม่ตัดทางเดิน)
//   🌙 ฉากมืดลง: เทิร์นที่ 3 ของชั้นเริ่มมืด (0.5) · เทิร์นที่ 4–6 มืดสนิท (1) — ก่อนทาลัสซาโผล่ครั้งแรกเทิร์น 10 (ภาพอย่างเดียว)
//  สภาพอากาศ (WEATHER_POOLS[8]):
//   🦈 ฝูงฉลามได้กลิ่นเลือด: ต้นเทิร์นฝูงล็อกคนเลือดน้อยสุดที่ไม่ได้อยู่ในห้องเรือ → เตือน 3×3 รอบตัว (นอกห้องเรือ) → จบเทิร์นกัดทุกคนในวง ดาเมจ 2 + เลือดไหล
//   🟤 กระแสตะกอนถล่ม: เลือกขอบ (ตะวันตก/ตะวันออก/ใต้) → กำแพงตะกอนกวาดเข้ามาทีละแถบลึก 3 ช่อง (เตือนก่อน 1 เทิร์น · 3 แถบ)
//        คนในแถบดาเมจ 2 + ถูกดันเข้าด้านใน 2 · ทิ้งเนินตะกอน (เดิน 2 ก้าว) ~35% ของพื้นในแถบ
// ============================================================
const kit = require("./ntKit");
const Journey = require("../../characters/_journey");
const DEF = require("./map8");
const { K } = kit;

const CANNON_DMG = 3, CANNON_RANGE = 7, CANNON_PUSH = 1, CANNON_CD = 2;
const KEG_DMG = 3;
const CHAIN_DMG = 2, CHAIN_PULL = 3, CHAIN_LEN = 12, CHAIN_CD = 2, CHAIN_ROWS = [1, 8], ANCHOR_X = 16;
const CRATE_DMG = 4;
const FLOOD_O2 = 2, DOOR_CD = 2;
const EEL_DMG = 2, EEL_REACH = 2, BAIT_RANGE = 4, EEL_CD = 2;
const CHEST_GOLD = 3, MIMIC_PCT = 30, MIMIC_DMG = 2;
const COLLAPSE_DMG = 3, COLLAPSE_LEN = 3, COLLAPSE_TURNS = [2, 4];
const SHARK_DMG = 2;
const SILT_DMG = 2, SILT_PUSH = 2, SILT_DEPTH = 3, SILT_STEPS = 3, MOUND_PCT = 35;
const SECS = { cannon: 2.2, winch: 2, door: 1.4, bait: 1.5, crate: 1.6, keg: 1.6, doorBreak: 1.3, collapse: 1.8, silt: 2 };

const S = (st) => st && st.nt8;
const round = (ctx) => ctx.match.roundNumber || 0;
const ready = (ctx, cd) => !(cd > round(ctx));
const tilesOfDef = (kind, from = "terrain") => (DEF.map[from][kind] || []).map(([x, y]) => ({ x, y }));
const KEGS = tilesOfDef("fd_nt_keg");
const CANNONS = tilesOfDef("fd_nt_cannon");
const LAIRS = tilesOfDef("fd_nt_eelhole");
const WINCH = tilesOfDef("fd_nt_winch")[0];
const CHESTS = tilesOfDef("fd_nt_chest", "special");
const ROOMS = DEF.ROOMS.map((r) => ({ id: r.id, doors: r.doors.map(([x, y]) => ({ x, y })), box: r.box }));
const CRANES = DEF.CRANES.map((c) => ({ id: c.id, post: { x: c.post[0], y: c.post[1] }, area: [0, 1].flatMap((dy) => [0, 1].map((dx) => ({ x: c.area[0] + dx, y: c.area[1] + dy }))) }));
const PASS = new Set(["fd_nt_hull", "fd_nt_eelhole"]); // ลูกปืนใหญ่ทะลุช่องปืนของตัวเรือ
const SKIP_CHAIN = new Set(["fd_nt_anchor", "fd_nt_winch"]);
const inBox = (r, x, y) => x >= r.box[0] && x <= r.box[2] && y >= r.box[1] && y <= r.box[3];
const roomAt = (x, y) => ROOMS.find((r) => inBox(r, x, y)) || null;
const lazyShop = () => require("../shop");
const turnIn = (ctx, turn) => Journey.turnInArea(turn, ctx.match.legStart);

function enter(ctx, st) {
  st.nt8 = {
    gone: [], cannon: {}, winch: 0, eel: {}, cranes: {}, chests: [],
    rooms: Object.fromEntries(ROOMS.map((r) => [r.id, { shut: false, cd: 0 }])),
    collapsed: [], collapse: null, mounds: [], sharks: null, silt: null,
  };
}

// ---------- ช่อง/ของ ----------
const kegAlive = (s, x, y) => KEGS.some((k) => k.x === x && k.y === y) && !s.gone.includes(K(x, y));
const unitsOn = (ctx, tiles) => ctx.alive().filter((u) => u.pos && tiles.some((t) => t.x === u.pos.x && t.y === u.pos.y));

// ระเบิดถังดินปืนเป็นชุด (ถังในวง 3×3 ลามต่อ) — คนละ 1 ครั้ง · คืนจำนวนถัง
function explode(ctx, s, start, by) {
  const queue = [...start], chain = [], hitIds = new Set(), hits = [];
  while (queue.length) {
    const k = queue.shift();
    if (!kegAlive(s, k.x, k.y)) continue;
    s.gone.push(K(k.x, k.y));
    chain.push({ x: k.x, y: k.y, i: chain.length });
    for (const t of kit.area(ctx, k.x, k.y, 1)) {
      if (kegAlive(s, t.x, t.y)) queue.push(t);
      const u = kit.unitAt(ctx, t.x, t.y);
      if (u && !hitIds.has(u.id)) { hitIds.add(u.id); if (kit.hurt(ctx, u, KEG_DMG, { by, name: "🛢️ ถังดินปืนระเบิด" })) hits.push(u.id); }
    }
  }
  if (!chain.length) return 0;
  ctx.fx("nt8_keg", { chain, hits, by: by ? by.id : null });
  ctx.log(`🛢️ ถังดินปืนระเบิด ${chain.length} ถัง`);
  ctx.bump();
  return chain.length;
}

// อันตรายปลายทางการผลัก: ชนถังดินปืน = ถังระเบิด (คนที่ถูกผลักอยู่ในวงเอง)
function hazardAt(ctx, x, y) {
  const s = S(ctx.match.fodlan && ctx.match.fodlan.s);
  if (s && kegAlive(s, x, y)) return (c, p, at, by) => explode(c, s, [at], by);
  return null;
}

// ---------- ปืนใหญ่ ----------
function cannonLines(ctx, s, c) {
  const map = ctx.map(), out = [];
  for (const [dx, dy] of kit.DIRS) {
    const tiles = [];
    let keg = null, end = null;
    for (let i = 1; i <= CANNON_RANGE; i++) {
      const x = c.x + dx * i, y = c.y + dy * i;
      if (!kit.inB(map, x, y)) break;
      const k = map.terrain[K(x, y)];
      if (k && kegAlive(s, x, y)) { keg = { x, y }; end = keg; break; }
      if (k && PASS.has(k)) { end = { x, y }; continue; }
      if (k) break;
      tiles.push({ x, y }); end = { x, y };
    }
    if (tiles.length || keg) out.push({ dir: { x: dx, y: dy }, tiles, keg, end });
  }
  return out;
}
const cannonsNear = (ctx, s, p) => CANNONS.filter((c) => ctx.adjacent(p, c.x, c.y) && ready(ctx, s.cannon[K(c.x, c.y)]));
function cannonPick(ctx, s, p, tile) {
  for (const c of cannonsNear(ctx, s, p)) for (const l of cannonLines(ctx, s, c)) {
    if (l.tiles.some((t) => t.x === tile.x && t.y === tile.y) || (l.keg && l.keg.x === tile.x && l.keg.y === tile.y)) return { c, l };
  }
  return null;
}
function fireCannon(ctx, s, p, tile) {
  const pick = tile && cannonPick(ctx, s, p, tile); if (!pick) return false;
  const { c, l } = pick;
  s.cannon[K(c.x, c.y)] = round(ctx) + CANNON_CD;
  const victims = unitsOn(ctx, l.tiles).filter((u) => u.id !== p.id)
    .sort((a, b) => (Math.abs(b.pos.x - c.x) + Math.abs(b.pos.y - c.y)) - (Math.abs(a.pos.x - c.x) + Math.abs(a.pos.y - c.y)));
  const hits = [];
  for (const u of victims) {
    if (!kit.hurt(ctx, u, CANNON_DMG, { by: p, name: "💣 ลูกปืนใหญ่" })) continue;
    hits.push(u.id);
    if (u.alive) kit.shove(ctx, u, l.dir.x, l.dir.y, CANNON_PUSH, hazardAt, p);
  }
  ctx.fx("nt8_cannon", { by: p.id, from: { x: c.x, y: c.y }, dir: { ...l.dir }, to: l.end ? { ...l.end } : { x: c.x, y: c.y }, hits, keg: l.keg ? { ...l.keg } : null });
  ctx.log(`💣 ${p.name} จุดปืนใหญ่`);
  if (l.keg) explode(ctx, s, [l.keg], p);
  ctx.bump(); ctx.useStrike(p, SECS.cannon); return true;
}

// ---------- กว้านโซ่สมอ ----------
function chainSweep(ctx, s, y) {
  const map = ctx.map(), tiles = [];
  let keg = null;
  const walk = (x0, dx) => {
    for (let i = 0, x = x0; i < CHAIN_LEN && x >= 0 && x < map.cols; i++, x += dx) {
      const k = map.terrain[K(x, y)];
      if (k && SKIP_CHAIN.has(k)) continue;
      if (k && kegAlive(s, x, y)) { keg = keg || { x, y }; return; }
      if (k) return;
      tiles.push({ x, y });
    }
  };
  walk(ANCHOR_X, -1); walk(ANCHOR_X + 1, 1);
  return { y, tiles, keg };
}
const winchNear = (ctx, p) => !!WINCH && ctx.adjacent(p, WINCH.x, WINCH.y);
function winchRows(ctx, s, p) {
  const out = [];
  for (let y = CHAIN_ROWS[0]; y <= CHAIN_ROWS[1]; y++) {
    const sw = chainSweep(ctx, s, y);
    if (unitsOn(ctx, sw.tiles).some((u) => u.id !== p.id) || sw.keg) out.push(sw);
  }
  return out;
}
function crankWinch(ctx, s, p, tile) {
  if (!tile || !winchNear(ctx, p) || !ready(ctx, s.winch)) return false;
  const sw = winchRows(ctx, s, p).find((r) => r.y === tile.y && (r.tiles.some((t) => t.x === tile.x) || (r.keg && r.keg.x === tile.x)));
  if (!sw) return false;
  s.winch = round(ctx) + CHAIN_CD;
  const victims = unitsOn(ctx, sw.tiles).filter((u) => u.id !== p.id).sort((a, b) => Math.abs(a.pos.x - ANCHOR_X) - Math.abs(b.pos.x - ANCHOR_X));
  const hits = [], moves = [];
  for (const u of victims) {
    if (!kit.hurt(ctx, u, CHAIN_DMG, { by: p, name: "⛓️ โซ่สมอฟาด" })) continue;
    hits.push(u.id);
    const dx = Math.sign(ANCHOR_X - u.pos.x);
    if (u.alive && dx) { const from = { ...u.pos }; kit.shove(ctx, u, dx, 0, CHAIN_PULL, hazardAt, p); if (u.pos) moves.push({ id: u.id, from, to: { ...u.pos } }); }
  }
  const xs = sw.tiles.map((t) => t.x).concat(sw.keg ? [sw.keg.x] : []);
  ctx.fx("nt8_chain", { by: p.id, row: sw.y, x0: Math.min(...xs), x1: Math.max(...xs), anchor: { x: ANCHOR_X, y: 3 }, winch: { ...WINCH }, hits, moves, keg: sw.keg });
  ctx.log(`⛓️ ${p.name} หมุนกว้านโซ่สมอ`);
  if (sw.keg) explode(ctx, s, [sw.keg], p);
  ctx.bump(); ctx.useStrike(p, SECS.winch); return true;
}

// ---------- ประตูกั้นน้ำ ----------
function doorRoomNear(ctx, s, p) {
  return ROOMS.find((r) => r.doors.some((d) => ctx.adjacent(p, d.x, d.y))) || null;
}
function canShut(ctx, s, r, p) {
  const rs = s.rooms[r.id];
  if (!rs || rs.shut || !ready(ctx, rs.cd)) return false;
  return !unitsOn(ctx, r.doors).length && !r.doors.some((d) => p.pos.x === d.x && p.pos.y === d.y);
}
function shutDoors(ctx, s, p) {
  const r = doorRoomNear(ctx, s, p); if (!r || !canShut(ctx, s, r, p)) return false;
  s.rooms[r.id].shut = true;
  const trapped = ctx.alive().filter((u) => u.pos && inBox(r, u.pos.x, u.pos.y)).map((u) => u.id);
  ctx.fx("nt8_door", { by: p.id, room: r.id, doors: r.doors.map((d) => ({ ...d })), box: r.box, shut: true, trapped });
  ctx.log(`🚪 ${p.name} ปิดประตูกั้นน้ำ — ห้องเรือน้ำท่วม`);
  ctx.bump(); ctx.useStrike(p, SECS.door); return true;
}
function breakDoor(ctx, s, p, x, y) {
  const r = ROOMS.find((q) => q.doors.some((d) => d.x === x && d.y === y));
  if (!r || !s.rooms[r.id].shut) return false;
  s.rooms[r.id] = { shut: false, cd: round(ctx) + DOOR_CD };
  ctx.fx("nt8_door_break", { by: p.id, room: r.id, x, y, doors: r.doors.map((d) => ({ ...d })), box: r.box });
  ctx.log(`🚪 ${p.name} พังประตูกั้นน้ำ`);
  ctx.bump();
  return SECS.doorBreak;
}

// ---------- เหยื่อปลาไหลมอเรย์ ----------
const lairsNear = (ctx, s, p) => LAIRS.filter((l) => ready(ctx, s.eel[K(l.x, l.y)]) && kit.cheb(l, p.pos) <= BAIT_RANGE);
function baitTargets(ctx, s, p) {
  const lairs = lairsNear(ctx, s, p);
  return ctx.alive().filter((u) => u.id !== p.id && u.pos && kit.cheb(u.pos, p.pos) <= BAIT_RANGE && lairs.some((l) => kit.cheb(l, u.pos) <= EEL_REACH));
}
function bait(ctx, s, p, tile) {
  if (!tile) return false;
  const u = baitTargets(ctx, s, p).find((q) => q.pos.x === tile.x && q.pos.y === tile.y); if (!u) return false;
  const lair = lairsNear(ctx, s, p).filter((l) => kit.cheb(l, u.pos) <= EEL_REACH).sort((a, b) => kit.cheb(a, u.pos) - kit.cheb(b, u.pos))[0];
  s.eel[K(lair.x, lair.y)] = round(ctx) + EEL_CD;
  const hit = kit.hurt(ctx, u, EEL_DMG, { by: p, name: "🐍 ปลาไหลมอเรย์งับ" });
  if (hit) kit.status.bleed(ctx, u, 1);
  ctx.fx("nt8_eel", { by: p.id, from: { ...p.pos }, lair: { ...lair }, to: { ...u.pos }, id: u.id, hit });
  ctx.log(`🐍 ${p.name} ปาเหยื่อ — ปลาไหลมอเรย์พุ่งงับ ${u.name}`);
  ctx.useStrike(p, SECS.bait); return true;
}

// ---------- ปุ่ม HUD ----------
function hudActions(ctx, st, p) {
  const s = S(st); if (!s || !p || !p.pos) return [];
  const can = kit.canStrike(ctx, p), out = [];
  if (CANNONS.some((c) => ctx.adjacent(p, c.x, c.y))) {
    const lines = cannonsNear(ctx, s, p).flatMap((c) => cannonLines(ctx, s, c));
    const tiles = lines.flatMap((l) => [...l.tiles, ...(l.keg ? [l.keg] : [])]);
    out.push({ key: "fd:l8:cannon", icon: "💣", name: "ยิงปืนใหญ่", disabled: !can || !tiles.length, tiles: kit.pickTiles(tiles) });
  }
  if (winchNear(ctx, p)) {
    const rows = ready(ctx, s.winch) ? winchRows(ctx, s, p) : [];
    const tiles = rows.flatMap((r) => [...r.tiles, ...(r.keg ? [r.keg] : [])]);
    out.push({ key: "fd:l8:winch", icon: "⛓️", name: "กว้านโซ่สมอ", disabled: !can || !tiles.length, tiles: kit.pickTiles(tiles) });
  }
  const r = doorRoomNear(ctx, s, p);
  if (r && !s.rooms[r.id].shut) out.push({ key: "fd:l8:door", icon: "🚪", name: "ปิดประตูกั้นน้ำ", disabled: !can || !canShut(ctx, s, r, p) });
  if (lairsNear(ctx, s, p).length) {
    const t = baitTargets(ctx, s, p).map((u) => ({ x: u.pos.x, y: u.pos.y }));
    out.push({ key: "fd:l8:bait", icon: "🐍", name: "เหยื่อปลาไหล", disabled: !can || !t.length, tiles: t });
  }
  return out;
}
function charAction(ctx, st, p, key, tile) {
  const s = S(st); if (!s || !p || !p.pos || !kit.canStrike(ctx, p)) return false;
  if (key === "fd:l8:cannon") return fireCannon(ctx, s, p, tile);
  if (key === "fd:l8:winch") return crankWinch(ctx, s, p, tile);
  if (key === "fd:l8:door") return shutDoors(ctx, s, p);
  if (key === "fd:l8:bait") return bait(ctx, s, p, tile);
  return false;
}

// ---------- ของที่ตีได้: ถังดินปืน · เชือกรอก · ประตูที่ปิด ----------
function objects(ctx, st) {
  const s = S(st); if (!s) return [];
  const out = [];
  for (const k of KEGS) if (kegAlive(s, k.x, k.y)) out.push({ id: `fd:nt8:keg:${k.x},${k.y}`, x: k.x, y: k.y, kind: "keg", strike: true });
  for (const c of CRANES) if (!s.cranes[c.id]) out.push({ id: `fd:nt8:rope:${c.id}`, x: c.post.x, y: c.post.y, kind: "rope", strike: true });
  for (const r of ROOMS) if (s.rooms[r.id].shut) for (const d of r.doors) out.push({ id: `fd:nt8:door:${d.x},${d.y}`, x: d.x, y: d.y, kind: "door", strike: true });
  return out;
}
function strikeObject(ctx, st, p, id) {
  const s = S(st); id = String(id);
  if (!s || !id.startsWith("fd:nt8:")) return false;
  const [, , kind, arg] = id.split(":");
  if (kind === "keg") {
    const [x, y] = arg.split(",").map(Number);
    if (!kegAlive(s, x, y)) return false;
    explode(ctx, s, [{ x, y }], p);
    return SECS.keg;
  }
  if (kind === "rope") {
    const c = CRANES.find((q) => String(q.id) === arg);
    if (!c || s.cranes[c.id]) return false;
    s.cranes[c.id] = true;
    const hits = [];
    for (const u of unitsOn(ctx, c.area)) if (kit.hurt(ctx, u, CRATE_DMG, { by: p, name: "📦 ลังหล่นทับ" })) hits.push(u.id);
    ctx.fx("nt8_crate", { by: p.id, post: { ...c.post }, area: c.area.map((t) => ({ ...t })), hits });
    ctx.log(`📦 ${p.name} ตัดเชือกรอก — ลังสินค้าหล่นทับ`);
    ctx.bump();
    return SECS.crate;
  }
  if (kind === "door") { const [x, y] = arg.split(",").map(Number); return breakDoor(ctx, s, p, x, y); }
  return false;
}

// ---------- ชั้นแผนที่ ----------
function layer(ctx, st, map) {
  const s = S(st); if (!s) return map;
  const terrain = { ...map.terrain }, special = { ...(map.special || {}) };
  let heal = map.heal;
  for (const k of s.gone) if (terrain[k] === "fd_nt_keg") delete terrain[k];
  for (const k of s.collapsed) { terrain[k] = "fd_nt_collapse"; delete special[k]; }
  for (const c of CRANES) if (s.cranes[c.id]) for (const t of c.area) { const k = K(t.x, t.y); if (!terrain[k]) special[k] = "fd_nt_cargo"; }
  for (const k of s.mounds) if (!terrain[k] && (!special[k] || special[k] === "fd_nt_silt")) special[k] = "fd_nt_mound";
  for (const r of ROOMS) {
    if (!s.rooms[r.id].shut) continue;
    for (const d of r.doors) { const k = K(d.x, d.y); terrain[k] = "fd_nt_doorshut"; delete special[k]; }
    // ห้องน้ำท่วม: ห้องอากาศในห้องใช้ไม่ได้
    if (heal && [...heal].some((k) => { const [x, y] = k.split(",").map(Number); return inBox(r, x, y); })) heal = new Set([...heal].filter((k) => { const [x, y] = k.split(",").map(Number); return !inBox(r, x, y); }));
  }
  return { ...map, terrain, special, heal };
}
function layerVer(ctx, st) {
  const s = S(st); if (!s) return "";
  return `k${s.gone.length}c${s.collapsed.length}m${s.mounds.length}r${ROOMS.map((r) => (s.rooms[r.id].shut ? 1 : 0)).join("")}x${Object.keys(s.cranes).length}`;
}

// ---------- ตัวเรือถล่ม ----------
function connectedWith(ctx, block) {
  const map = ctx.map(), bad = new Set(block.map((t) => K(t.x, t.y)));
  const open = (x, y) => kit.inB(map, x, y) && !map.terrain[K(x, y)] && !bad.has(K(x, y));
  let start = null, total = 0;
  for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) if (open(x, y)) { total++; start = start || { x, y }; }
  if (!start) return false;
  const seen = new Set([K(start.x, start.y)]), q = [start];
  while (q.length) {
    const c = q.shift();
    for (const [dx, dy] of kit.DIRS) { const x = c.x + dx, y = c.y + dy, k = K(x, y); if (!seen.has(k) && open(x, y)) { seen.add(k); q.push({ x, y }); } }
  }
  return seen.size === total;
}
function collapseCandidates(ctx) {
  const map = ctx.map(), spawn = new Set((map.spawns || []).map((t) => K(t.x, t.y))), out = [];
  const doors = new Set(ROOMS.flatMap((r) => r.doors.map((d) => K(d.x, d.y))));
  const crate = new Set(CRANES.flatMap((c) => c.area.map((t) => K(t.x, t.y))));
  for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) {
    const k = K(x, y), sp = map.special && map.special[k];
    if (map.terrain[k] || spawn.has(k) || doors.has(k) || crate.has(k) || map.heal.has(k) || (sp && sp !== "fd_nt_silt" && sp !== "fd_nt_deck")) continue;
    if (kit.DIRS.some(([dx, dy]) => doors.has(K(x + dx, y + dy)) || map.terrain[K(x + dx, y + dy)] === "fd_nt_cannon")) continue; // หน้าประตู/ข้างปืนใหญ่ต้องว่าง
    if (kit.DIRS.some(([dx, dy]) => PASS.has(map.terrain[K(x + dx, y + dy)]))) out.push({ x, y });
  }
  return out;
}
function planCollapse(ctx, s, forTurn) {
  const cands = collapseCandidates(ctx), set = new Set(cands.map((t) => K(t.x, t.y)));
  for (const seed of ctx.pick(cands, cands.length)) {
    // ช่วงผนังต่อกันตามแนว (แนวนอนก่อน แล้วแนวตั้ง)
    for (const [dx, dy] of ctx.pick([[1, 0], [0, 1]], 2)) {
      const tiles = [seed];
      for (let i = 1; tiles.length < COLLAPSE_LEN && set.has(K(seed.x + dx * i, seed.y + dy * i)); i++) tiles.push({ x: seed.x + dx * i, y: seed.y + dy * i });
      for (let i = 1; tiles.length < COLLAPSE_LEN && set.has(K(seed.x - dx * i, seed.y - dy * i)); i++) tiles.push({ x: seed.x - dx * i, y: seed.y - dy * i });
      if (tiles.length < 2 || !connectedWith(ctx, tiles)) continue;
      s.collapse = { tiles, for: forTurn };
      ctx.fx("nt8_creak", { tiles: tiles.map((t) => ({ ...t })) });
      ctx.log("🧱 ตัวเรือลั่นเอี๊ยด — ผนังกำลังจะถล่ม");
      return true;
    }
  }
  return false;
}
function nearestFree(ctx, from, block) {
  const map = ctx.map(), bad = new Set(block.map((t) => K(t.x, t.y)));
  const seen = new Set([K(from.x, from.y)]), q = [from];
  while (q.length) {
    const c = q.shift();
    for (const [dx, dy] of kit.DIRS) {
      const x = c.x + dx, y = c.y + dy, k = K(x, y);
      if (seen.has(k) || !kit.inB(map, x, y) || map.terrain[k]) continue;
      seen.add(k);
      if (!bad.has(k) && !kit.unitAt(ctx, x, y)) return { x, y };
      q.push({ x, y });
    }
  }
  return null;
}
function doCollapse(ctx, s) {
  const tiles = s.collapse.tiles; s.collapse = null;
  const hits = [], moves = [];
  for (const u of unitsOn(ctx, tiles)) {
    if (kit.hurt(ctx, u, COLLAPSE_DMG, { by: null, name: "🧱 ตัวเรือถล่มทับ" })) hits.push(u.id);
    if (!u.alive || !u.pos) continue;
    const to = nearestFree(ctx, u.pos, tiles);
    if (to) { moves.push({ id: u.id, from: { ...u.pos }, to }); u.pos = to; }
  }
  for (const t of tiles) s.collapsed.push(K(t.x, t.y));
  ctx.fx("nt8_collapse", { tiles: tiles.map((t) => ({ ...t })), hits, moves });
  ctx.log("🧱 ตัวเรือถล่มลงมา");
  ctx.bump();
  return SECS.collapse;
}

// ---------- สภาพอากาศ ----------
const wx = (ctx, kind) => !!(ctx.weather && ctx.weather.kind === kind);
function sharkTarget(ctx) {
  const list = ctx.alive().filter((u) => u.pos && !roomAt(u.pos.x, u.pos.y));
  if (!list.length) return null;
  const low = Math.min(...list.map((u) => u.hp));
  return ctx.pick(list.filter((u) => u.hp === low), 1)[0];
}
function planSharks(ctx, s) {
  const t = sharkTarget(ctx); if (!t) { s.sharks = null; return; }
  const map = ctx.map();
  const tiles = kit.area(ctx, t.pos.x, t.pos.y, 1).filter((c) => !map.terrain[K(c.x, c.y)] && !roomAt(c.x, c.y));
  s.sharks = { id: t.id, x: t.pos.x, y: t.pos.y, tiles };
  ctx.fx("nt8_sharks", { id: t.id, x: t.pos.x, y: t.pos.y });
  ctx.log(`🦈 ฝูงฉลามได้กลิ่นเลือด — วนรอบ ${t.name}`);
}
function sharkBite(ctx, s) {
  const sh = s.sharks; s.sharks = null;
  const hits = [];
  for (const u of unitsOn(ctx, sh.tiles)) {
    const hit = kit.hurt(ctx, u, SHARK_DMG, { by: null, name: "🦈 ฉลามกัด" });
    if (hit) { kit.status.bleed(ctx, u, 1); hits.push({ id: u.id, x: u.pos ? u.pos.x : sh.x, y: u.pos ? u.pos.y : sh.y }); }
  }
  ctx.fx("nt8_shark_bite", { x: sh.x, y: sh.y, tiles: sh.tiles.map((t) => ({ ...t })), hits });
}
const EDGES = { w: { dx: 1, dy: 0 }, e: { dx: -1, dy: 0 }, s: { dx: 0, dy: -1 } };
function siltBand(ctx, edge, step) {
  const map = ctx.map(), out = [];
  for (let d = step * SILT_DEPTH; d < (step + 1) * SILT_DEPTH; d++) {
    if (edge === "s") { const y = map.rows - 1 - d; for (let x = 0; x < map.cols; x++) if (!map.terrain[K(x, y)]) out.push({ x, y }); }
    else { const x = edge === "w" ? d : map.cols - 1 - d; for (let y = 0; y < map.rows; y++) if (!map.terrain[K(x, y)]) out.push({ x, y }); }
  }
  return out;
}
function planSilt(ctx, s, step, forTurn) {
  const edge = s.silt ? s.silt.edge : ctx.pick(Object.keys(EDGES), 1)[0];
  s.silt = { edge, step, for: forTurn, tiles: siltBand(ctx, edge, step) };
}
function doSilt(ctx, s) {
  const sl = s.silt, { dx, dy } = EDGES[sl.edge], map = ctx.map();
  const spawn = new Set((map.spawns || []).map((t) => K(t.x, t.y))), doors = new Set(ROOMS.flatMap((r) => r.doors.map((d) => K(d.x, d.y))));
  const depth = (u) => (sl.edge === "w" ? u.pos.x : sl.edge === "e" ? -u.pos.x : -u.pos.y);
  const hits = [], moves = [];
  for (const u of unitsOn(ctx, sl.tiles).sort((a, b) => depth(b) - depth(a))) {
    if (!kit.hurt(ctx, u, SILT_DMG, { by: null, name: "🟤 กระแสตะกอนถล่ม" })) continue;
    hits.push(u.id);
    if (!u.alive) continue;
    const from = { ...u.pos }; kit.shove(ctx, u, dx, dy, SILT_PUSH, hazardAt, null);
    if (u.pos) moves.push({ id: u.id, from, to: { ...u.pos } });
  }
  const made = [];
  for (const t of sl.tiles) {
    const k = K(t.x, t.y), sp = map.special && map.special[k];
    if (spawn.has(k) || doors.has(k) || map.heal.has(k) || (sp && sp !== "fd_nt_silt") || kit.unitAt(ctx, t.x, t.y) || s.mounds.includes(k)) continue;
    if (Math.random() * 100 < MOUND_PCT) { s.mounds.push(k); made.push({ ...t }); }
  }
  ctx.fx("nt8_silt", { edge: sl.edge, step: sl.step, dir: { x: dx, y: dy }, tiles: sl.tiles.map((t) => ({ ...t })), hits, moves, mounds: made });
  ctx.log("🟤 กระแสตะกอนถล่มกวาดผ่าน");
  ctx.bump();
  return SECS.silt;
}
function weatherStart(ctx, st) {
  const s = S(st); if (!s) return;
  if (wx(ctx, "nt_silt")) { planSilt(ctx, s, 0, round(ctx) + 2); ctx.fx("nt8_silt_warn", { edge: s.silt.edge }); }
  if (wx(ctx, "nt_sharks")) ctx.fx("nt8_sharks", { arrive: true });
}

// ---------- ต้นเทิร์น / จบตา / จบเทิร์น ----------
function preRound(ctx, st) {
  const s = S(st); if (!s) return 0;
  const turn = round(ctx) + 1, tin = turnIn(ctx, turn);
  let secs = 0;
  if (s.collapse && s.collapse.for <= turn) secs += doCollapse(ctx, s);
  if (s.silt && s.silt.for <= turn) {
    secs += doSilt(ctx, s);
    const next = s.silt.step + 1;
    if (wx(ctx, "nt_silt") && next < SILT_STEPS) planSilt(ctx, s, next, turn + 1);
    else s.silt = null;
  }
  if (!s.collapse && COLLAPSE_TURNS.includes(tin)) planCollapse(ctx, s, turn + 1);
  if (wx(ctx, "nt_sharks")) planSharks(ctx, s);
  return Math.min(4, secs);
}
function onUnitEnd(ctx, st, p) {
  const s = S(st); if (!s || !p || !p.pos || !p.alive) return;
  const k = K(p.pos.x, p.pos.y);
  if (!CHESTS.some((c) => c.x === p.pos.x && c.y === p.pos.y) || s.chests.includes(k)) return;
  s.chests.push(k);
  if (Math.random() * 100 < MIMIC_PCT) {
    ctx.fx("nt8_chest", { id: p.id, x: p.pos.x, y: p.pos.y, mimic: true });
    if (kit.hurt(ctx, p, MIMIC_DMG, { name: "🧰 หีบกัด", noDodge: true })) kit.status.root(ctx, p, 1);
  } else {
    const got = lazyShop().addGold(p, CHEST_GOLD);
    ctx.fx("nt8_chest", { id: p.id, x: p.pos.x, y: p.pos.y, gold: got });
    ctx.log(`🧰 ${p.name} เปิดหีบสมบัติ +${got} เหรียญ`);
  }
}
function onEndTurn(ctx, st) {
  const s = S(st); if (!s) return;
  if (s.sharks) sharkBite(ctx, s);
  // ห้องที่ปิดประตู: น้ำท่วม ออกซิเจน −2
  for (const r of ROOMS) {
    if (!s.rooms[r.id].shut) continue;
    const ids = [];
    for (const u of ctx.alive()) if (u.pos && inBox(r, u.pos.x, u.pos.y)) { kit.o2(ctx, u, -FLOOD_O2, "flood"); ids.push(u.id); }
    if (ids.length) { ctx.fx("nt8_flood", { room: r.id, box: r.box, ids }); ctx.log("🌊 ห้องเรือน้ำท่วม — ออกซิเจนลดลง"); }
  }
}

// ---------- ข้อมูลให้ client ----------
function darkOf(ctx) { const t = turnIn(ctx, round(ctx)); return t >= 4 ? 1 : t === 3 ? 0.5 : 0; }
function publicInfo(ctx, st) {
  const s = S(st); if (!s) return {};
  const warn = [
    ...(s.collapse ? s.collapse.tiles.map((t) => ({ x: t.x, y: t.y, kind: "collapse" })) : []),
    ...(s.sharks ? s.sharks.tiles.map((t) => ({ x: t.x, y: t.y, kind: "shark" })) : []),
    ...(s.silt ? s.silt.tiles.map((t) => ({ x: t.x, y: t.y, kind: "silt" })) : []),
  ];
  return {
    wreck: {
      kegs: KEGS.filter((k) => kegAlive(s, k.x, k.y)),
      cannons: CANNONS.map((c) => ({ x: c.x, y: c.y, cd: s.cannon[K(c.x, c.y)] || 0 })),
      winch: { ...WINCH, cd: s.winch, anchor: { x: ANCHOR_X, y: 3 } },
      eels: LAIRS.map((l) => ({ x: l.x, y: l.y, cd: s.eel[K(l.x, l.y)] || 0 })),
      cranes: CRANES.map((c) => ({ id: c.id, post: c.post, area: c.area, dropped: !!s.cranes[c.id] })),
      rooms: ROOMS.map((r) => ({ id: r.id, doors: r.doors, box: r.box, shut: s.rooms[r.id].shut })),
      chests: s.chests.slice(),
      collapsed: s.collapsed.slice(),
      mounds: s.mounds.slice(),
      sharks: s.sharks ? { id: s.sharks.id, x: s.sharks.x, y: s.sharks.y } : null,
      silt: s.silt ? { edge: s.silt.edge, step: s.silt.step } : null,
      dark: darkOf(ctx),
    },
    ...(warn.length ? { warn } : {}),
  };
}

module.exports = {
  enter, hazardAt, explode, hudActions, charAction, objects, strikeObject, layer, layerVer, preRound, weatherStart, onUnitEnd, onEndTurn, publicInfo,
  KEGS, CANNONS, LAIRS, ROOMS, CRANES, WINCH, CHESTS,
};
