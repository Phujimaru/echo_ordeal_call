// ============================================================
//  Nautilus ชั้น 3 "ปล่องภูเขาไฟใต้ทะเล" — ลูกเล่นโต้ตอบ + จังหวะปล่อง + ความมืด + สภาพอากาศ (GRID_PLAN §8.9 · ผู้ใช้ "เอาทั้งหมด" 2026-11-19)
//   ผัง map9.js · ภาพ client/src/board/fodlan/vents.js + ventsFx.js · ตัวเลขทั้งหมด = [Claude] ตั้งต้น
//   ♨️ บิดหัวปล่อง (ยืนติดปล่องควันดำ): น้ำเดือดพุ่งแนวตรง 4 ช่อง (ทะลุคน) ดาเมจ 3 + ลุกไหม้ 1 · ปล่องนั้นพัก 2 เทิร์น
//   🪨 อุดปล่อง (ยืนติดปล่องควันดำ): ต้นเทิร์นถัดไประเบิด 3×3 รอบปล่อง ดาเมจ 4 (เตือนทันที) · ปล่องพัก 2 เทิร์น
//   ☄️ กลิ้งหินลาวา (ยืนติดหินลาวา): หินกลิ้งออกจากตัวไปตามแนวไกลสุด 6 ช่อง ทับทุกคนที่ขวาง ดาเมจ 3 + ลุกไหม้ 1 · เกิดใหม่ที่เดิมหลัง 3 เทิร์น
//   💨 ปล่องแรงดัน (ยืนบนปล่อง): ดีดตัวไกลสุด 4 ช่องไปตกข้างศัตรู → ทุกคนรอบจุดตก ดาเมจ 2 + ผลักออก 1 ช่อง (ผลักลงลาวา/หลุมได้) · ปล่องพัก 1 เทิร์น
//   🌋 ปล่องพ่นเป็นจังหวะ: ทุกเทิร์นเตือน 2 ปล่อง (วนตามลำดับ) → ต้นเทิร์นถัดไปพ่น วงรอบปล่อง ดาเมจ 1 + ลุกไหม้ 1
//   🔥 รอยแยกลาวา: จบตาบนรอยแยก = ลุกไหม้ 1 · ทะเลสาบลาวา/รอยแยก/หินลาวา/ปล่องที่ถูกอุด = แหล่งแสง
//   ผลักลงอันตราย: ทะเลสาบลาวา ดาเมจ 3 + ลุกไหม้ 2 · ปล่องควันดำ ดาเมจ 2 + ลุกไหม้ 1 · หลุมยุบ/รอยแยกยุบ ดาเมจ 3 + ออกซิเจน −2 + สตั้น + โผล่จุดเกิด
//   🌑 ความมืด: เห็นแค่ช่องในระยะเดินของตัวเอง/เพื่อนร่วมทีม + ช่องสว่าง (แสงลาวา · ไฟฉายเรือ) · ตี/ใช้ของใส่คนอื่น = โผล่จนจบเทิร์น
//   สภาพอากาศ: nt_eruption ฝนหินร้อนลงจุดเตือน (ดาเมจ 2 + ลุกไหม้ 1) + ปล่องพ่นพร้อมกันทุกปล่อง ·
//              nt_quake กระดานสั่น หินหล่นจุดเตือน (ดาเมจ 2) + พื้นแตกเป็นหลุม 2 จุด/เทิร์น (เตือนก่อน · ไม่ตัดทางเดิน · สูงสุด 8)
// ============================================================
const kit = require("./ntKit");
const { K } = kit;

const JET_LEN = 4, JET_DMG = 3, JET_BURN = 1, VENT_REST = 2;
const PLUG_DMG = 4;
const ROLL_LEN = 6, ROLL_DMG = 3, ROLL_BURN = 1, ROCK_BACK = 3;
const LAUNCH_MAX = 4, LAUNCH_DMG = 2, LAUNCH_PUSH = 1, PVENT_REST = 1;
const PULSE_VENTS = 2, PULSE_DMG = 1, PULSE_BURN = 1;
const FISSURE_BURN = 1;
const LAVA_DMG = 3, LAVA_BURN = 2, SCALD_DMG = 2, SCALD_BURN = 1, PIT_DMG = 3, PIT_O2 = 2;
const LIGHT_R = 1; // แสงลาวาส่องเลยออกไปรอบตัว (ช่อง · นับแบบหมากรุก)
const HOTROCK_BASE = 3, HOTROCK_DMG = 2, HOTROCK_BURN = 1;
const QUAKE_ROCKS = 3, QUAKE_DMG = 2, QUAKE_CRACKS = 2, CRACK_MAX = 8;
const SECS = { jet: 1.6, plug: 1.2, roll: 1.9, launch: 1.7, pulse: 1.6, blast: 1.8, wx: 2.2 };

const S = (st) => st && st.nt9;
const map0 = () => require("./map9");
const kindAt = (ctx, x, y) => { const m = ctx.map(); return m.terrain[K(x, y)] || (m.special && m.special[K(x, y)]) || null; };
const baseTiles = (kind) => { const m = map0().map; const list = m.terrain[kind] || m.special[kind] || []; return list.map(([x, y]) => ({ x, y })); };
const VENTS = baseTiles("fd_nt_vent");
const PVENTS = baseTiles("fd_nt_pvent");
// จุดวางหินลาวา (ขอบที่ราบ/ขอบแอ่ง) — ช่องเดินได้ในผังเดิม หินบนกระดาน = สิ่งกีดขวางผ่าน layer
const ROCK_SPOTS = [{ x: 6, y: 3 }, { x: 11, y: 5 }, { x: 13, y: 8 }, { x: 5, y: 9 }];
const sameT = (a, b) => a.x === b.x && b.y === a.y;
const round = (ctx) => ctx.match.roundNumber;
const wxOn = (st, kind) => !!(st && st.weather && st.weather.kind === kind && st.weather.left > 0);

function enter(ctx, st) {
  st.nt9 = {
    vents: VENTS.map((v, i) => ({ id: i, x: v.x, y: v.y, rest: 0, plug: null })),
    rocks: ROCK_SPOTS.map((r, i) => ({ id: i, x: r.x, y: r.y, home: { ...r }, back: 0, on: true })),
    pvents: {}, cracks: [], pulse: 0,
    ventWarn: null, // { ids, all, for } — ปล่องที่จะพ่นต้นเทิร์น for
    rockWarn: null, crackWarn: null, quakeWarn: null, wxFor: 0,
  };
  armPulse(ctx, st.nt9, round(ctx) + 2); // ต้นเทิร์นแรกของชั้นยังไม่พ่น — เห็นป้ายเตือนครบ 1 เทิร์นก่อน
}

// ---------- อันตราย (ปลายทางของการผลัก/ดีด/พัด) ----------
function hazardAt(ctx, x, y) {
  const k = kindAt(ctx, x, y);
  if (k === "fd_nt_lava") return (c, p, at, by) => lavaBurn(c, p, at, by);
  if (k === "fd_nt_vent") return (c, p, at, by) => scald(c, p, at, by);
  if (k === "fd_nt_pit" || k === "fd_nt_crack") return (c, p, at, by) => kit.fallPit(c, p, at, { dmg: PIT_DMG, o2Loss: PIT_O2, name: k === "fd_nt_pit" ? "หลุมยุบ" : "รอยแยกยุบ", by });
  return null;
}
function lavaBurn(ctx, p, at, by) {
  ctx.fx("nt_lava_dunk", { id: p.id, x: at.x, y: at.y, from: p.pos ? { ...p.pos } : null });
  if (kit.hurt(ctx, p, LAVA_DMG, { by, name: "🔥 ลาวาลวก", noDodge: true })) kit.status.burn(ctx, p, LAVA_BURN);
}
function scald(ctx, p, at, by) {
  ctx.fx("nt_scald", { id: p.id, x: at.x, y: at.y });
  if (kit.hurt(ctx, p, SCALD_DMG, { by, name: "♨️ ชนปล่องควันดำ", noDodge: true })) kit.status.burn(ctx, p, SCALD_BURN);
}

// ---------- ปล่องควันดำ ----------
const ventOk = (ctx, v) => !v.plug && !(v.rest > round(ctx));
function ventNear(ctx, s, p) { return s.vents.find((v) => ctx.adjacent(p, v.x, v.y)) || null; }
function jetLines(ctx, v) {
  const out = [];
  for (const [dx, dy] of kit.DIRS) { const l = kit.line(ctx, v.x, v.y, dx, dy, JET_LEN); if (l.length) out.push({ dx, dy, tiles: l }); }
  return out;
}

// ---------- หินลาวา ----------
function rocksNear(ctx, s, p) { return s.rocks.filter((r) => r.on && ctx.adjacent(p, r.x, r.y)); }
// หินกลิ้งออกจากตัวผู้ผลัก: ทะลุคน หยุดที่สิ่งกีดขวาง (ลาวา = จมลงไป) · ไกลสุด ROLL_LEN
function rollPath(ctx, s, p, r) {
  const dx = Math.sign(r.x - p.pos.x), dy = Math.sign(r.y - p.pos.y);
  if (!!dx === !!dy) return null;
  return { dx, dy, tiles: kit.line(ctx, r.x, r.y, dx, dy, ROLL_LEN) };
}

// ---------- ปล่องแรงดัน ----------
function onPvent(ctx, s, p) { return PVENTS.find((v) => v.x === p.pos.x && v.y === p.pos.y) || null; }
const pventOk = (ctx, s, v) => !(s.pvents[K(v.x, v.y)] > round(ctx));
// ช่องตก: ว่าง ติดเป้า ห่างจากปล่องไม่เกิน LAUNCH_MAX (เดินตรง ไม่สนสิ่งกีดขวาง — ดีดลอยข้าม) · เลือกช่องที่ใกล้ปล่องที่สุด
function landingFor(ctx, p, v, target) {
  const map = ctx.map();
  let best = null, bd = 99;
  for (const [dx, dy] of [...kit.DIRS, [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const x = target.pos.x + dx, y = target.pos.y + dy;
    if (!kit.inB(map, x, y) || !ctx.free(x, y, p.id)) continue;
    const d = Math.abs(x - v.x) + Math.abs(y - v.y);
    if (d < 2 || d > LAUNCH_MAX) continue;
    if (d < bd) { bd = d; best = { x, y }; }
  }
  return best;
}
function launchTargets(ctx, p, v) {
  return ctx.alive().filter((u) => u.id !== p.id && u.pos && !(ctx.combat.sameTeam && ctx.combat.sameTeam(u, p)) && landingFor(ctx, p, v, u));
}

// ---------- ปุ่ม HUD ----------
function hudActions(ctx, st, p) {
  const s = S(st); if (!s || !p || !p.pos) return [];
  const can = kit.canStrike(ctx, p), out = [];
  const v = ventNear(ctx, s, p);
  if (v) {
    const ok = ventOk(ctx, v), lines = jetLines(ctx, v);
    out.push({ key: "fd:l9:jet", icon: "♨️", name: "บิดหัวปล่อง", disabled: !can || !ok || !lines.length, tiles: kit.pickTiles(lines.flatMap((l) => l.tiles)) });
    out.push({ key: "fd:l9:plug", icon: "🪨", name: "อุดปล่อง", disabled: !can || !ok });
  }
  const rs = rocksNear(ctx, s, p);
  if (rs.length) {
    const tiles = rs.map((r) => rollPath(ctx, s, p, r)).filter((r) => r && r.tiles.length).flatMap((r) => r.tiles);
    out.push({ key: "fd:l9:roll", icon: "☄️", name: "กลิ้งหินลาวา", disabled: !can || !tiles.length, tiles: kit.pickTiles(tiles) });
  }
  const pv = onPvent(ctx, s, p);
  if (pv) {
    const t = pventOk(ctx, s, pv) ? launchTargets(ctx, p, pv) : [];
    out.push({ key: "fd:l9:launch", icon: "💨", name: "ปล่องแรงดัน", disabled: !can || !t.length, tiles: t.map((u) => ({ x: u.pos.x, y: u.pos.y })) });
  }
  return out;
}
function charAction(ctx, st, p, key, tile) {
  const s = S(st); if (!s || !p || !p.pos || !kit.canStrike(ctx, p)) return false;
  if (key === "fd:l9:jet") return jet(ctx, s, p, tile);
  if (key === "fd:l9:plug") return plug(ctx, s, p);
  if (key === "fd:l9:roll") return roll(ctx, s, p, tile);
  if (key === "fd:l9:launch") return launch(ctx, s, p, tile);
  return false;
}
function jet(ctx, s, p, tile) {
  const v = ventNear(ctx, s, p); if (!v || !ventOk(ctx, v) || !tile) return false;
  const l = jetLines(ctx, v).find((q) => q.tiles.some((t) => sameT(t, tile))); if (!l) return false;
  v.rest = round(ctx) + VENT_REST;
  const hits = [];
  for (const t of l.tiles) { const u = kit.unitAt(ctx, t.x, t.y); if (u && kit.hurt(ctx, u, JET_DMG, { by: p, name: "♨️ น้ำเดือดพุ่ง" })) { kit.status.burn(ctx, u, JET_BURN); hits.push(u.id); } }
  p.exposedRound = round(ctx);
  ctx.fx("nt_jet", { by: p.id, x: v.x, y: v.y, dir: { x: l.dx, y: l.dy }, tiles: l.tiles, hits });
  ctx.log(`♨️ ${p.name} บิดหัวปล่องควันดำ — น้ำเดือดพุ่ง`);
  ctx.bump(); ctx.useStrike(p, SECS.jet); return true;
}
function plug(ctx, s, p) {
  const v = ventNear(ctx, s, p); if (!v || !ventOk(ctx, v)) return false;
  v.plug = { by: p.id, at: round(ctx) + 1 };
  ctx.fx("nt_plug", { by: p.id, x: v.x, y: v.y });
  ctx.log(`🪨 ${p.name} อุดปล่องควันดำ — แรงดันกำลังสะสม`);
  ctx.bump(); ctx.useStrike(p, SECS.plug); return true;
}
function roll(ctx, s, p, tile) {
  if (!tile) return false;
  const pick = rocksNear(ctx, s, p).map((r) => ({ r, path: rollPath(ctx, s, p, r) })).find((q) => q.path && q.path.tiles.some((t) => sameT(t, tile)));
  if (!pick) return false;
  const { r, path } = pick, hits = [];
  for (const t of path.tiles) { const u = kit.unitAt(ctx, t.x, t.y); if (u && kit.hurt(ctx, u, ROLL_DMG, { by: p, name: "☄️ หินลาวาทับ" })) { kit.status.burn(ctx, u, ROLL_BURN); hits.push(u.id); } }
  const last = path.tiles[path.tiles.length - 1] || { x: r.x, y: r.y };
  const nx = last.x + path.dx, ny = last.y + path.dy;
  const sink = kit.inB(ctx.map(), nx, ny) && kindAt(ctx, nx, ny) === "fd_nt_lava";
  ctx.fx("nt_roll", { by: p.id, from: { x: r.x, y: r.y }, to: last, dir: { x: path.dx, y: path.dy }, tiles: path.tiles, hits, sink: sink ? { x: nx, y: ny } : null });
  r.on = false; r.back = round(ctx) + ROCK_BACK;
  p.exposedRound = round(ctx);
  ctx.log(`☄️ ${p.name} กลิ้งหินลาวา`);
  ctx.bump(); ctx.useStrike(p, SECS.roll); return true;
}
function launch(ctx, s, p, tile) {
  const v = onPvent(ctx, s, p); if (!v || !pventOk(ctx, s, v) || !tile) return false;
  const target = kit.unitAt(ctx, tile.x, tile.y); if (!target || target.id === p.id) return false;
  if (ctx.combat.sameTeam && ctx.combat.sameTeam(target, p)) return false;
  const land = landingFor(ctx, p, v, target); if (!land) return false;
  s.pvents[K(v.x, v.y)] = round(ctx) + 1 + PVENT_REST;
  const from = { ...p.pos };
  p.pos = { ...land };
  const hits = [];
  for (const t of kit.area(ctx, land.x, land.y, 1)) {
    const u = kit.unitAt(ctx, t.x, t.y); if (!u || u.id === p.id) continue;
    if (!kit.hurt(ctx, u, LAUNCH_DMG, { by: p, name: "💨 ดีดตัวกระแทก" })) continue;
    hits.push(u.id);
    const dx = Math.sign(u.pos.x - land.x), dy = Math.sign(u.pos.y - land.y);
    // ผลักออกจากจุดตก: แนวทแยงเลือกแกนที่ห่างกว่า (ผลักทีละแกน — กระดานเดินแบบ 4 ทิศ)
    const ax = Math.abs(u.pos.x - land.x) >= Math.abs(u.pos.y - land.y);
    if (u.alive && u.pos) kit.shove(ctx, u, ax ? dx : 0, ax ? 0 : dy, LAUNCH_PUSH, hazardAt, p);
  }
  p.exposedRound = round(ctx);
  ctx.fx("nt_launch", { by: p.id, id: p.id, from, to: land, vent: { x: v.x, y: v.y }, hits });
  ctx.log(`💨 ${p.name} ดีดตัวจากปล่องแรงดัน`);
  ctx.bump(); ctx.useStrike(p, SECS.launch); return true;
}

// ---------- จังหวะปล่อง / ระเบิด / สภาพอากาศ (ต้นเทิร์น) ----------
const ring = (ctx, v) => kit.area(ctx, v.x, v.y, 1).filter((t) => !sameT(t, v) && !ctx.Board.isObstacle(ctx.map(), t.x, t.y));
// ตั้งปล่องที่จะพ่นต้นเทิร์น turn (วนทีละ PULSE_VENTS ปล่องที่ไม่ได้ถูกอุด)
function armPulse(ctx, s, turn) {
  const live = s.vents.filter((v) => !v.plug);
  if (!live.length) { s.ventWarn = null; return; }
  const ids = [];
  for (let i = 0; i < Math.min(PULSE_VENTS, live.length); i++) ids.push(live[(s.pulse + i) % live.length].id);
  s.pulse = (s.pulse + PULSE_VENTS) % Math.max(1, live.length);
  s.ventWarn = { ids, all: false, for: turn };
}
function erupt(ctx, s, ids) {
  const hits = [], spots = [];
  for (const v of s.vents.filter((q) => ids.includes(q.id) && !q.plug)) {
    spots.push({ x: v.x, y: v.y });
    for (const t of ring(ctx, v)) { const u = kit.unitAt(ctx, t.x, t.y); if (u && !hits.includes(u.id) && kit.hurt(ctx, u, PULSE_DMG, { name: "🌋 ปล่องพ่นน้ำเดือด" })) { kit.status.burn(ctx, u, PULSE_BURN); hits.push(u.id); } }
  }
  if (spots.length) { ctx.fx("nt_erupt", { vents: spots, hits }); ctx.log(`🌋 ปล่องควันดำพ่นน้ำเดือด ${spots.length} ปล่อง`); }
  return spots.length;
}
function blast(ctx, s, v) {
  const by = ctx.match.players[v.plug.by] || null, hits = [];
  for (const t of kit.area(ctx, v.x, v.y, 1)) { const u = kit.unitAt(ctx, t.x, t.y); if (u && kit.hurt(ctx, u, PLUG_DMG, { by, name: "💥 ปล่องที่ถูกอุดระเบิด", selfOk: true })) hits.push(u.id); }
  ctx.fx("nt_vent_blast", { x: v.x, y: v.y, by: v.plug.by, hits });
  ctx.log("💥 ปล่องควันดำที่ถูกอุดระเบิด!");
  v.plug = null; v.rest = round(ctx) + 1 + VENT_REST;
}
function preRound(ctx, st) {
  const s = S(st); if (!s) return 0;
  const turn = round(ctx) + 1;
  let secs = 0;
  for (const v of s.vents) if (v.plug && v.plug.at <= turn) { blast(ctx, s, v); secs = Math.max(secs, SECS.blast); }
  if (s.ventWarn && s.ventWarn.for <= turn) {
    const ids = s.ventWarn.all ? s.vents.map((v) => v.id) : s.ventWarn.ids;
    if (erupt(ctx, s, ids)) secs = Math.max(secs, SECS.pulse);
    s.ventWarn = null;
  }
  if (s.rockWarn && s.rockWarn.for <= turn) { hotRocks(ctx, s); secs = Math.max(secs, SECS.wx); }
  if ((s.crackWarn && s.crackWarn.for <= turn) || (s.quakeWarn && s.quakeWarn.for <= turn)) { quake(ctx, s); secs = Math.max(secs, SECS.wx); }
  // เตือนชุดใหม่สำหรับเทิร์นหน้า
  if (!s.ventWarn) armPulse(ctx, s, turn + 1);
  if (wxOn(st, "nt_eruption")) { if (s.ventWarn) s.ventWarn.all = true; if (!s.rockWarn) armRocks(ctx, s, turn + 1); }
  if (wxOn(st, "nt_quake") && !s.quakeWarn) armQuake(ctx, s, turn + 1);
  ctx.bump();
  return secs;
}
// ฝนหินร้อน (nt_eruption)
function armRocks(ctx, s, turn) {
  const n = HOTROCK_BASE + Math.floor(ctx.alive().length / 2);
  s.rockWarn = { tiles: ctx.pick(ctx.floorTiles(), n).map((t) => ({ x: t.x, y: t.y })), for: turn };
}
function hotRocks(ctx, s) {
  const hits = [];
  for (const t of s.rockWarn.tiles) { const u = kit.unitAt(ctx, t.x, t.y); if (u && kit.hurt(ctx, u, HOTROCK_DMG, { name: "🌋 หินร้อนตก" })) { kit.status.burn(ctx, u, HOTROCK_BURN); hits.push(u.id); } }
  ctx.fx("nt_hotrock", { tiles: s.rockWarn.tiles, hits });
  ctx.log(`🌋 หินร้อนตก ${s.rockWarn.tiles.length} จุด`);
  s.rockWarn = null;
}
// แผ่นดินไหว (nt_quake): หินหล่น + พื้นแตกเป็นหลุม (ไม่ตัดทางเดิน)
function armQuake(ctx, s, turn) {
  s.quakeWarn = { tiles: ctx.pick(ctx.floorTiles(), QUAKE_ROCKS).map((t) => ({ x: t.x, y: t.y })), for: turn };
  const left = CRACK_MAX - s.cracks.length;
  s.crackWarn = left > 0 ? { tiles: crackSpots(ctx, s, Math.min(QUAKE_CRACKS, left), s.quakeWarn.tiles), for: turn } : null;
}
// ช่องที่แตกได้: พื้นธรรมดา (ไม่ใช่จุดเกิด/ฟองอากาศ/ปล่องแรงดัน/รอยแยก/ท่าจอด) และแตกแล้วทุกช่องที่เดินได้ยังถึงกัน
function crackSpots(ctx, s, n, avoid = []) {
  const map = ctx.map(), spawns = (map.spawns || []).map((t) => K(t.x, t.y));
  const blocked = new Set([...s.cracks, ...s.rocks.map((r) => K(r.home.x, r.home.y))]), out = []; // จุดหินลาวา = กันไว้เสมอ (หินกลับมาแล้วต้องไม่ตัดทาง)
  const pool = ctx.pick(ctx.floorTiles().filter((t) => !kindAt(ctx, t.x, t.y) && !ctx.Board.isHeal(map, t.x, t.y) && !spawns.includes(K(t.x, t.y)) && !s.rocks.some((r) => sameT(r.home, t)) && !avoid.some((q) => sameT(q, t))), 60);
  for (const t of pool) {
    if (out.length >= n) break;
    blocked.add(K(t.x, t.y));
    if (connected(ctx, map, blocked)) out.push({ x: t.x, y: t.y }); else blocked.delete(K(t.x, t.y));
  }
  return out;
}
function connected(ctx, map, blocked) {
  const walk = [];
  for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) if (!ctx.Board.isObstacle(map, x, y) && !blocked.has(K(x, y))) walk.push(K(x, y));
  if (!walk.length) return true;
  const all = new Set(walk), seen = new Set([walk[0]]), q = [walk[0]];
  while (q.length) {
    const [x, y] = q.pop().split(",").map(Number);
    for (const [dx, dy] of kit.DIRS) { const k = K(x + dx, y + dy); if (all.has(k) && !seen.has(k)) { seen.add(k); q.push(k); } }
  }
  return seen.size === all.size;
}
function quake(ctx, s) {
  const hits = [], falls = [];
  const rocks = s.quakeWarn ? s.quakeWarn.tiles : [], cracks = s.crackWarn ? s.crackWarn.tiles : [];
  for (const t of rocks) { const u = kit.unitAt(ctx, t.x, t.y); if (u && kit.hurt(ctx, u, QUAKE_DMG, { name: "🪨 หินหล่น" })) hits.push(u.id); }
  for (const t of cracks) { if (!s.cracks.includes(K(t.x, t.y))) s.cracks.push(K(t.x, t.y)); }
  ctx.bump();
  for (const t of cracks) { const u = kit.unitAt(ctx, t.x, t.y); if (u) { falls.push(u.id); kit.fallPit(ctx, u, t, { dmg: PIT_DMG, o2Loss: PIT_O2, name: "รอยแยกยุบ" }); } }
  ctx.fx("nt_quake", { rocks, cracks, hits, falls });
  ctx.log(`🌐 แผ่นดินไหว — หินหล่น${cracks.length ? ` · พื้นแตก ${cracks.length} จุด` : ""}`);
  s.quakeWarn = null; s.crackWarn = null;
}
function weatherStart(ctx, st) {
  const s = S(st); if (!s) return;
  const turn = round(ctx) + 2; // เริ่มตอนจบเทิร์น → เตือนให้เห็นครบ 1 เทิร์นก่อนลง (แบบฟ้าผ่าด่าน I) · ปล่องพ่นพร้อมกันเริ่มตั้งแต่ชุดเตือนถัดไป
  if (wxOn(st, "nt_eruption")) {
    armRocks(ctx, s, turn);
    ctx.fx("nt_wx_eruption", {});
    ctx.log("🌋 ภูเขาไฟใต้ทะเลปะทุ!");
  } else if (wxOn(st, "nt_quake")) {
    armQuake(ctx, s, turn);
    ctx.fx("nt_wx_quake", {});
    ctx.log("🌐 แผ่นดินไหวใต้ทะเล!");
  }
  ctx.bump();
}

// ---------- จบตา / จบเทิร์น ----------
function onUnitEnd(ctx, st, p) {
  const s = S(st); if (!s || !p || !p.alive || !p.pos) return;
  if (kindAt(ctx, p.pos.x, p.pos.y) === "fd_nt_fissure") {
    kit.status.burn(ctx, p, FISSURE_BURN);
    ctx.fx("nt_singe", { id: p.id, x: p.pos.x, y: p.pos.y });
    ctx.log(`🔥 ${p.name} ยืนบนรอยแยกลาวา — ลุกไหม้`);
  }
}
function onEndTurn(ctx, st) {
  const s = S(st); if (!s) return;
  for (const r of s.rocks) {
    if (r.on || r.back > round(ctx)) continue;
    if (!ctx.free(r.home.x, r.home.y)) continue; // มีคนยืนอยู่ = รอ
    r.on = true; r.x = r.home.x; r.y = r.home.y;
    ctx.fx("nt_rock_back", { x: r.x, y: r.y });
  }
  ctx.bump();
}

// ---------- ชั้นแผนที่ ----------
function layer(ctx, st, map) {
  const s = S(st); if (!s) return map;
  const on = s.rocks.filter((r) => r.on);
  if (!on.length && !s.cracks.length) return map;
  const terrain = { ...map.terrain }, special = { ...(map.special || {}) };
  for (const r of on) { const k = K(r.x, r.y); if (!terrain[k]) { terrain[k] = "fd_nt_lavarock"; delete special[k]; } }
  for (const k of s.cracks) { if (!terrain[k]) { terrain[k] = "fd_nt_crack"; delete special[k]; } }
  return { ...map, terrain, special };
}
function layerVer(ctx, st) { const s = S(st); return s ? `r${s.rocks.map((r) => (r.on ? 1 : 0)).join("")}c${s.cracks.length}` : ""; }

// ---------- ความมืด (ชั้น 3: เห็นระยะเดินตัวเอง + ทีม + แสงลาวา/ไฟฉายเรือ) ----------
function anchorOf(ctx, u) {
  const m = ctx.match;
  if (!u || m.gameState !== "ACTION") return u.pos;
  const a = m.actorId === u.id ? m.action : m.duo && m.duo.acts ? m.duo.acts[u.id] : null;
  return a && !a.locked ? a.eye || a.from || u.pos : u.pos;
}
function unitSight(ctx, map, u, set) {
  const Board = ctx.Board, action = ctx.action, at = anchorOf(ctx, u);
  if (!at) return;
  const size = action.sizeOf(u), mov = Math.max(0, action.movOf(u) | 0);
  const reach = Board.reachable(map, { id: "_nt9eye", x: at.x, y: at.y, size, alive: true }, mov, [], { ghost: !!action.walksThrough(u) });
  for (const n of reach.values()) for (const t of Board.footprint(n.x, n.y, size)) set.add(K(t.x, t.y));
  for (const t of Board.footprint(at.x, at.y, size)) { // ตัวเอง + ช่องติดตัวเสมอ
    set.add(K(t.x, t.y));
    for (const [dx, dy] of Board.DIRS) if (Board.inBounds(map, t.x + dx, t.y + dy)) set.add(K(t.x + dx, t.y + dy));
  }
}
// ช่องสว่างที่ทุกคนเห็น: ทะเลสาบลาวา · รอยแยกลาวา · หินลาวา · ปล่องที่ถูกอุด/กำลังจะพ่น (+ รอบตัว LIGHT_R) · ไฟฉายเรือ
function litSet(ctx, s, map = ctx.map(), ship = null) {
  const set = new Set(), src = [];
  for (const [k, v] of Object.entries(map.terrain)) if (v === "fd_nt_lava" || v === "fd_nt_lavarock") src.push(k);
  for (const [k, v] of Object.entries(map.special || {})) if (v === "fd_nt_fissure") src.push(k);
  const hot = s.ventWarn ? (s.ventWarn.all ? s.vents : s.vents.filter((v) => s.ventWarn.ids.includes(v.id))) : [];
  for (const v of [...s.vents.filter((q) => q.plug), ...hot]) src.push(K(v.x, v.y));
  for (const k of src) {
    const [x, y] = k.split(",").map(Number);
    for (let dy = -LIGHT_R; dy <= LIGHT_R; dy++) for (let dx = -LIGHT_R; dx <= LIGHT_R; dx++) if (kit.inB(map, x + dx, y + dy)) set.add(K(x + dx, y + dy));
  }
  if (!ship) { try { ship = require("./nautilus").litKeys(ctx); } catch (err) { void err; ship = []; } }
  for (const k of ship) set.add(k);
  return set;
}
function eyesOf(ctx, viewer) {
  const me = ctx.match.players[viewer.id] || viewer;
  return ctx.combat.alivePlayers().filter((u) => u.pos && (u.id === me.id || (ctx.combat.sameTeam && ctx.combat.sameTeam(me, u))));
}
// แคชต่อแผนที่ (map ใหม่ทุกครั้งที่ชั้นเปลี่ยน) · คีย์ = ตำแหน่ง/ระยะเดินของสายตาทุกตัว + ปล่องที่ร้อน + ไฟฉายเรือ
const SIGHT_CACHE = new WeakMap();
function sideVision(ctx, st, viewer) {
  const s = S(st);
  if (!s || !viewer || ctx.match.gameState === "GAMEOVER") return null;
  const eyes = eyesOf(ctx, viewer);
  if (!eyes.length) return null;
  const map = ctx.map();
  let ship = [];
  try { ship = require("./nautilus").litKeys(ctx); } catch (err) { void err; }
  const key = eyes.map((u) => { const a = anchorOf(ctx, u) || {}; return `${u.id}@${a.x},${a.y}/${ctx.action.movOf(u) | 0}`; }).sort().join("|")
    + `#${s.ventWarn ? `${s.ventWarn.all ? "a" : s.ventWarn.ids.join(".")}` : ""}#${s.vents.filter((v) => v.plug).map((v) => v.id).join(".")}#${ship.join(";")}`;
  let per = SIGHT_CACHE.get(map);
  if (!per) { per = new Map(); SIGHT_CACHE.set(map, per); }
  const hit = per.get(key);
  if (hit) return hit;
  const set = litSet(ctx, s, map, ship);
  for (const u of eyes) unitSight(ctx, map, u, set);
  if (per.size > 128) per.clear();
  per.set(key, set);
  return set;
}
function vision(ctx, st, viewer) { const set = sideVision(ctx, st, viewer); return set ? [...set] : null; }
function hides(ctx, st, viewer, target) {
  if (!target || !target.pos || !viewer) return false;
  if (target.exposedRound === round(ctx)) return false;
  const set = sideVision(ctx, st, viewer);
  if (!set) return false;
  return !ctx.Board.footprint(target.pos.x, target.pos.y, ctx.action.sizeOf(target)).some((t) => set.has(K(t.x, t.y)));
}

// ---------- ข้อมูลให้ client ----------
function warnList(ctx, s) {
  const out = [];
  if (s.ventWarn) {
    const ids = s.ventWarn.all ? s.vents.map((v) => v.id) : s.ventWarn.ids;
    for (const v of s.vents.filter((q) => ids.includes(q.id) && !q.plug)) for (const t of ring(ctx, v)) out.push({ x: t.x, y: t.y, kind: "vent" });
  }
  for (const v of s.vents.filter((q) => q.plug)) for (const t of kit.area(ctx, v.x, v.y, 1)) if (!sameT(t, v)) out.push({ x: t.x, y: t.y, kind: "plug" });
  for (const t of (s.rockWarn && s.rockWarn.tiles) || []) out.push({ x: t.x, y: t.y, kind: "hotrock" });
  for (const t of (s.quakeWarn && s.quakeWarn.tiles) || []) out.push({ x: t.x, y: t.y, kind: "rock" });
  for (const t of (s.crackWarn && s.crackWarn.tiles) || []) out.push({ x: t.x, y: t.y, kind: "crack" });
  return out;
}
function publicInfo(ctx, st) {
  const s = S(st); if (!s) return {};
  const r = round(ctx);
  return {
    warn: warnList(ctx, s),
    vents: {
      vents: s.vents.map((v) => ({ x: v.x, y: v.y, rest: Math.max(0, v.rest - r), plug: !!v.plug, hot: !!(s.ventWarn && (s.ventWarn.all || s.ventWarn.ids.includes(v.id))) })),
      rocks: s.rocks.filter((q) => q.on).map((q) => ({ id: q.id, x: q.x, y: q.y })),
      pvents: PVENTS.map((v) => ({ x: v.x, y: v.y, rest: Math.max(0, (s.pvents[K(v.x, v.y)] || 0) - r - 1) })),
      cracks: s.cracks.slice(),
      eruption: wxOn(st, "nt_eruption"), quake: wxOn(st, "nt_quake"),
    },
  };
}

module.exports = {
  enter, hazardAt, hudActions, charAction, preRound, weatherStart, onUnitEnd, onEndTurn, layer, layerVer, vision, hides, publicInfo,
  VENTS, PVENTS, ROCK_SPOTS, litSet,
  N: { JET_LEN, JET_DMG, PLUG_DMG, ROLL_LEN, ROLL_DMG, LAUNCH_MAX, LAUNCH_DMG, PULSE_DMG, LAVA_DMG, SCALD_DMG, PIT_DMG, PIT_O2, HOTROCK_DMG, QUAKE_DMG, CRACK_MAX },
};
