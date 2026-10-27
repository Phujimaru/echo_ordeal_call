// ============================================================
//  ด่าน III "ชายฝั่งเดอร์ดริว" (area 42 · GRID_PLAN §8.5) — สงครามใหญ่ริมหาด · ผัง server/fodlan/map3.js · ภาพ client/src/board/fodlan/stage3.js
//  ฮุคตามสัญญา server/fodlan/README.md · st = match.fodlan.s (ล้างทุกครั้งที่เข้าด่าน)
//
//  เครื่องยิงหินลูกไฟ (ผู้ใช้): ยืนติดเครื่อง → ปุ่ม "เครื่องยิงหิน" เลือกช่องในระยะ 8 จากเครื่อง (นับแบบเดิน)
//   ลูกไฟ 3×3 เสียหาย 2 + ลุกไหม้ 1 (Claude) · ไม่โดนตัวเอง/เพื่อนร่วมทีม (Claude) · คูลดาวน์ 2 เทิร์นต่อเครื่อง · ใช้แทนการตี (จบตา)
//   ลูกไฟจุดหญ้าแห้ง/น้ำมันดิเอโก้ใน 3×3 ด้วย (Claude)
//  ห่าธนู (ผู้ใช้): ช่องสุ่มทั่วแผนที่ กะพริบแดงก่อน 1 เทิร์น → ต้นเทิร์นถัดไปเสียหาย 1 ·
//   จำนวนต่อเทิร์น = 3 + ⌊คนที่ยังอยู่ / 2⌋ (Claude) · ครึ่งหนึ่งเล็งรอบผู้เล่นสุ่ม (ห่าง ≤ 2) อีกครึ่งสุ่มทั้งแผนที่ (Claude)
//  มังกร (ผู้ใช้ — ไม่เห็นตัว เห็นแต่ไฟ): แนวไฟกว้าง 4 ช่อง ยาวสุดแผนที่ เสียหาย 2 + ลุกไหม้ 1 · ทุก 3 เทิร์น (เทิร์นที่ 3, 6 ของด่าน — Claude)
//   เตือนแดงก่อน 1 เทิร์น · แนวนอน/แนวตั้งสุ่ม (Claude) · ไฟมังกรจุดหญ้าแห้ง + น้ำมันของดิเอโก้ (ทั้งแอ่งที่ต่อกัน) ติดไฟ (ผู้ใช้)
//  ยึดธงทัพ: จบตาบนธง = ฝ่ายตัวเองยึด · ระหว่างยึด ห่าธนูไม่โดนคนยึดและเพื่อนร่วมทีม · ยึดค้างจนฝ่ายอื่นมายึด (Claude)
//  เผาทุ่ง: ติดกองไฟ → "หยิบไฟ" (ถือไฟ 🔥 ข้ามเทิร์นได้) · ถือไฟติดหญ้าแห้ง → "จุดไฟ" เลือกช่อง · ทั้งสองปุ่มล็อกการเดินแบบใช้ไอเทม (Claude)
//   ไฟลามหญ้าแห้งที่ติดกัน 4 ทิศ ทีละ 1 ช่องตอนจบเทิร์น · ลุก 3 เทิร์นแล้วเป็นเถ้า · จบตาบนไฟ = เสียหาย 1 + ลุกไหม้ 1
//   ไฟลามเข้าช่องที่มีคนยืน = ลุกไหม้ 1 (Claude)
//  สภาพอากาศ "คลื่นซึนามิ" (3 เทิร์นนับจากเข้าด่าน — Claude ตีความ ผู้ใช้ว่า "ประมาณนั้น"):
//   เทิร์น 1 เตือน (แถวริมหาดกะพริบ + คลื่นตั้งเค้า) · ต้นเทิร์น 2 พัดครั้งที่ 1 + เตือนอีกรอบ · ต้นเทิร์น 3 พัดครั้งที่ 2
//   พัดจากทะเล (y = 0) ไปฝั่งตรงข้าม: ทุกคนถูกผลักไปจนชนสิ่งกีดขวาง/คน/ขอบกระดาน · เสียหาย 2 · ชนสิ่งกีดขวาง +1 (ผู้ใช้)
//   ล้างของบนพื้น (ผู้ใช้): ไฟของด่าน (→ เถ้า) · ไฟที่ถืออยู่ · น้ำมัน/กองไฟ/ขี้เถ้าดิเอโก้ · พุ่มดอกไม้เซลิน (Flora.clear) · พื้นเปียกเอมิลิโกะ (Ice.dryWet)
// ============================================================
const MAP = require("./map3");

const CAT_RANGE = 8;
const CAT_CD = 2;          // ใช้แล้วกดได้อีกเมื่อ roundNumber ≥ ตอนยิง + 2 (แบบคูลดาวน์ของตัวละคร)
const CAT_DMG = 2;
const BURN = 1;
const ARROW_DMG = 1;
const ARROW_BASE = 3;
const DRAGON_EVERY = 3;
const DRAGON_WIDTH = 4;
const DRAGON_DMG = 2;
const FIRE_TURNS = 3;
const FIRE_DMG = 1;
const WAVE_DMG = 2;
const WAVE_CRASH = 1;
const WAVE_DIR = { x: 0, y: 1 }; // ทะเลอยู่ขอบ y = 0 → คลื่นพัดไปทาง y มาก
const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// วินาทีของฉากต้นเทิร์น / ยิงเครื่องยิงหิน (ต้องตรงกับ fx ใน client/src/board/fodlan/stage3.js)
const SECS = { arrows: 1.6, dragon: 2.8, wave: 3.2, catapult: 1.9 };

const K = (x, y) => `${x},${y}`;
const parseKey = (k) => { const [x, y] = k.split(",").map(Number); return { x, y }; };
const ofKind = (kind) => (MAP.map.terrain[kind] || []).map(([x, y]) => ({ x, y }));
const FLAG = { x: MAP.map.special.fd_flag[0][0], y: MAP.map.special.fd_flag[0][1] };
const GRASS = new Set(MAP.map.special.fd_grass.map(([x, y]) => K(x, y)));

// ---------- ตัวช่วย ----------
const turnNow = (ctx) => ctx.match.roundNumber;
const sizeOf = (ctx, p) => ctx.action.sizeOf(p);
const tilesOf = (ctx, p) => (p && p.pos ? ctx.Board.footprint(p.pos.x, p.pos.y, sizeOf(ctx, p)) : []);
const covers = (ctx, p, set) => tilesOf(ctx, p).some((t) => set.has(K(t.x, t.y)));
// คนบนกระดาน (ทุกชั้น) ที่ทับชุดช่องนี้
function unitsOn(ctx, set) {
  return ctx.alive().filter((p) => covers(ctx, p, set));
}
// ของในแผนที่ตอนนี้ (สิ่งกีดขวางที่ถูกพัง = หายไป)
function liveKind(ctx, kind) {
  const map = ctx.map();
  return ofKind(kind).filter((t) => map.terrain[K(t.x, t.y)] === kind);
}
const adjacentTo = (ctx, p, list) => list.filter((t) => ctx.adjacent(p, t.x, t.y));
function square3(ctx, c) {
  const map = ctx.map(), out = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const x = c.x + dx, y = c.y + dy;
    if (ctx.Board.inBounds(map, x, y)) out.push({ x, y });
  }
  return out;
}
function foe(ctx, src, t) {
  return !!(t && src && t.id !== src.id && !ctx.combat.sameTeam(src, t));
}
// ฝ่ายที่ยึดธง: คนยึด + เพื่อนร่วมทีม (ระบบคู่นับด้วย)
function flagSide(ctx, st, p) {
  const f = st.flag;
  if (!f || !p) return false;
  if (p.id === f.holder) return true;
  const h = ctx.match.players[f.holder];
  return !!(h && ctx.combat.sameTeam(h, p));
}
function hurt(ctx, p, n, burn = 0) {
  const dealt = ctx.damage(p, n);
  if (burn > 0 && p.alive) ctx.burn(p, burn);
  return dealt;
}

// ---------- ไฟบนหญ้าแห้ง (st.fire = { "x,y": เทิร์นที่เหลือ } · st.ash = { "x,y": 1 }) ----------
function grassAt(st, k) { return GRASS.has(k) && !(st.fire && st.fire[k]) && !(st.ash && st.ash[k]); }
// จุดไฟหญ้าแห้งในชุดช่อง → ช่องที่ติดจริง
function igniteGrass(ctx, st, tiles) {
  const out = [];
  st.fire ||= {};
  for (const t of tiles) {
    const k = K(t.x, t.y);
    if (!grassAt(st, k) || ctx.map().terrain[k]) continue;
    st.fire[k] = FIRE_TURNS;
    out.push({ x: t.x, y: t.y });
  }
  if (out.length) ctx.bump();
  return out;
}
// น้ำมันของดิเอโก้ (match.board.diego — characters/diego_alt.js) ในชุดช่องติดไฟ: ทั้งแอ่งที่ต่อกัน 4 ทิศ → กองไฟไม่มีเจ้าของ (โดนทุกคน)
//  ดิเอโก้ไม่มีฟังก์ชันจุดน้ำมันที่ไม่มีผู้จุด (explode ต้องมีตัวดิเอโก้) → ทำตามรูปข้อมูลเดิม: ลบน้ำมัน + fire { owner: null, until }
//  until = เทิร์นที่ไฟลุก + 3 (แบบ FIRE_TURNS ของดิเอโก้ — onEndTurn ของดิเอโก้เปลี่ยนเป็นขี้เถ้าเอง) · คนที่ยืนบนแอ่ง = ลุกไหม้ 1
function igniteOil(ctx, tiles, turn, skip = new Set()) {
  const L = ctx.match.board && ctx.match.board.diego;
  if (!L || !L.oil || !Object.keys(L.oil).length) return [];
  const seen = new Set(), q = tiles.map((t) => K(t.x, t.y)).filter((k) => L.oil[k]), out = [];
  while (q.length) {
    const k = q.shift();
    if (seen.has(k) || !L.oil[k]) continue;
    seen.add(k);
    out.push(parseKey(k));
    const { x, y } = parseKey(k);
    for (const [dx, dy] of DIRS4) { const n = K(x + dx, y + dy); if (!seen.has(n) && L.oil[n]) q.push(n); }
  }
  if (!out.length) return out;
  let fireTurns = FIRE_TURNS;
  try { fireTurns = require("../../characters/diego_alt").FIRE_TURNS || FIRE_TURNS; } catch { /* ไม่มีดิเอโก้ = ค่าเดิม */ }
  for (const t of out) {
    const k = K(t.x, t.y);
    delete L.oil[k];
    if (L.ash) delete L.ash[k];
    (L.fire ||= {})[k] = { owner: null, until: turn + fireTurns };
  }
  const set = new Set(out.map((t) => K(t.x, t.y)));
  for (const p of unitsOn(ctx, set)) {
    if (skip.has(p.id)) continue;
    if (ctx.burn(p, BURN) > 0) ctx.log(`🔥 น้ำมันใต้เท้า ${p.name} ลุกเป็นไฟ — ลุกไหม้ ${BURN} เทิร์น`);
  }
  ctx.log(`💥 น้ำมัน ${out.length} ช่องลุกเป็นไฟ`);
  return out;
}

// ---------- เครื่องยิงหิน ----------
function catReadyAt(st, t) { return (st.cat && st.cat[K(t.x, t.y)]) || 0; }
function catCd(ctx, st, t) { return Math.max(0, catReadyAt(st, t) - turnNow(ctx)); }
function catTiles(ctx, c) {
  const map = ctx.map(), out = [];
  for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) {
    if (x === c.x && y === c.y) continue;
    if (Math.abs(x - c.x) + Math.abs(y - c.y) <= CAT_RANGE) out.push({ x, y });
  }
  return out;
}
const canFire = (ctx, p) => ctx.action.canAct(p) && !(ctx.match.action && ctx.match.action.noStrike);
function fireCatapult(ctx, st, p, tile) {
  if (!tile || !canFire(ctx, p)) return false;
  const cat = adjacentTo(ctx, p, liveKind(ctx, "fd_catapult"))
    .find((c) => catCd(ctx, st, c) === 0 && Math.abs(tile.x - c.x) + Math.abs(tile.y - c.y) <= CAT_RANGE);
  if (!cat || !ctx.Board.inBounds(ctx.map(), tile.x, tile.y)) return false;
  (st.cat ||= {})[K(cat.x, cat.y)] = turnNow(ctx) + CAT_CD;
  const area = square3(ctx, tile), set = new Set(area.map((t) => K(t.x, t.y)));
  const hits = [];
  ctx.log(`🪨 ${p.name} ยิงเครื่องยิงหินลูกไฟ`);
  for (const u of unitsOn(ctx, set)) {
    if (!foe(ctx, p, u)) continue;
    hits.push(u.id);
    u.wasAttacked = true;
    const dealt = hurt(ctx, u, CAT_DMG, BURN);
    ctx.log(`🔥 ลูกไฟโดน ${u.name} — เสียหาย -${dealt} + ลุกไหม้ ${BURN}`);
  }
  const lit = igniteGrass(ctx, st, area);
  igniteOil(ctx, area, turnNow(ctx), new Set(hits));
  ctx.fx("catapult", { id: p.id, from: { x: cat.x, y: cat.y }, to: { x: tile.x, y: tile.y }, tiles: area, hits, lit });
  ctx.useStrike(p, SECS.catapult);
  return true;
}

// ---------- ห่าธนู ----------
function pickArrows(ctx) {
  const alive = ctx.alive();
  const n = ARROW_BASE + Math.floor(alive.length / 2);
  const floor = ctx.floorTiles();
  const map = ctx.map();
  const taken = new Set(), out = [];
  const add = (t) => { const k = K(t.x, t.y); if (taken.has(k)) return false; taken.add(k); out.push({ x: t.x, y: t.y }); return true; };
  for (let i = 0; i < n && floor.length; i++) {
    let ok = false;
    if (alive.length && ctx.rng() < 0.5) {
      const a = alive[Math.floor(ctx.rng() * alive.length)];
      for (let g = 0; g < 12 && !ok; g++) {
        const x = a.pos.x + Math.round((ctx.rng() - 0.5) * 4), y = a.pos.y + Math.round((ctx.rng() - 0.5) * 4);
        if (ctx.Board.isObstacle(map, x, y)) continue;
        ok = add({ x, y });
      }
    }
    for (let g = 0; g < 40 && !ok; g++) ok = add(floor[Math.floor(ctx.rng() * floor.length)]);
  }
  return out;
}
function landArrows(ctx, st, tiles) {
  const set = new Set(tiles.map((t) => K(t.x, t.y)));
  const hits = [], spared = [];
  for (const p of unitsOn(ctx, set)) {
    if (flagSide(ctx, st, p)) { spared.push(p.id); continue; }
    hits.push(p.id);
    const dealt = hurt(ctx, p, ARROW_DMG);
    ctx.log(`🏹 ห่าธนูโดน ${p.name} — เสียหาย -${dealt}`);
  }
  if (spared.length) ctx.log(`🚩 ธงทัพคุ้มกัน ${spared.map((id) => ctx.match.players[id].name).join(", ")} จากห่าธนู`);
  return { hits, spared };
}

// ---------- มังกร ----------
function bandTiles(ctx, band) {
  const map = ctx.map(), out = [];
  for (let i = band.from; i < band.from + DRAGON_WIDTH; i++) {
    if (band.axis === "row") for (let x = 0; x < map.cols; x++) out.push({ x, y: i });
    else for (let y = 0; y < map.rows; y++) out.push({ x: i, y });
  }
  return out.filter((t) => ctx.Board.inBounds(map, t.x, t.y));
}
function pickBand(ctx, turn) {
  const map = ctx.map();
  const axis = ctx.rng() < 0.5 ? "row" : "col";
  const span = axis === "row" ? map.rows : map.cols;
  // แถว: ไม่เอาแนวที่ครึ่งหนึ่งเป็นทะเล (ทะเลอยู่แถว 0–1)
  const lo = axis === "row" ? 1 : 0;
  const from = lo + Math.floor(ctx.rng() * (span - DRAGON_WIDTH - lo + 1));
  return { at: turn, axis, from };
}
function breathe(ctx, st, band) {
  const tiles = bandTiles(ctx, band), set = new Set(tiles.map((t) => K(t.x, t.y)));
  const hits = [];
  ctx.log("🐉 มังกรพ่นไฟกวาดสนามรบ!");
  for (const p of unitsOn(ctx, set)) {
    hits.push(p.id);
    const dealt = hurt(ctx, p, DRAGON_DMG, BURN);
    ctx.log(`🔥 ไฟมังกรเผา ${p.name} — เสียหาย -${dealt} + ลุกไหม้ ${BURN}`);
  }
  const lit = igniteGrass(ctx, st, tiles);
  if (lit.length) ctx.log(`🌾 หญ้าแห้ง ${lit.length} ช่องติดไฟ`);
  const oil = igniteOil(ctx, tiles, band.at, new Set(hits));
  return { hits, lit, oil };
}

// ---------- คลื่นซึนามิ ----------
const tsunamiOn = (st) => !!(st.weather && st.weather.kind === "tsunami");
// แถวพื้นริมหาด (ช่องที่ไม่ใช่สิ่งกีดขวาง ใกล้ทะเลที่สุดในแต่ละคอลัมน์) — ช่องเตือน
function shoreTiles(ctx) {
  const map = ctx.map(), out = [];
  for (let x = 0; x < map.cols; x++) {
    for (let y = 0; y < map.rows; y++) {
      if (map.terrain[K(x, y)] === "fd_sea") continue;
      out.push({ x, y });
      break;
    }
  }
  return out;
}
// ผลักทุกคนจากทะเลไปจนสุดทาง · คนที่ไกลทะเลกว่าขยับก่อน (คนข้างหลังจึงไปหยุดชิดคนข้างหน้า)
function sweep(ctx, st) {
  const map = ctx.map();
  const lead = (p) => p.pos.x * WAVE_DIR.x + p.pos.y * WAVE_DIR.y + (sizeOf(ctx, p) - 1);
  const moves = [];
  ctx.log("🌊 คลื่นซึนามิถาโถมเข้าฝั่ง!");
  for (const p of ctx.alive().sort((a, b) => lead(b) - lead(a))) {
    if (!p.pos) continue;
    const from = { ...p.pos };
    const s = sizeOf(ctx, p);
    let crash = false;
    for (let guard = 0; guard < 64; guard++) {
      const nx = p.pos.x + WAVE_DIR.x, ny = p.pos.y + WAVE_DIR.y;
      const next = ctx.Board.footprint(nx, ny, s);
      if (next.every((t) => ctx.free(t.x, t.y, p.id))) { p.pos = { x: nx, y: ny }; continue; }
      const blocked = ctx.action.boardBlocked(p.id);
      crash = next.some((t) => ctx.Board.inBounds(map, t.x, t.y) && ctx.Board.isObstacle(map, t.x, t.y, blocked));
      break;
    }
    moves.push({ id: p.id, from, to: { ...p.pos }, crash });
    const dealt = hurt(ctx, p, WAVE_DMG + (crash ? WAVE_CRASH : 0));
    ctx.log(`🌊 ${p.name} ถูกคลื่นซัด${crash ? "ชนสิ่งกีดขวาง" : ""} — เสียหาย -${dealt}`);
  }
  const washed = washGround(ctx, st);
  return { moves, washed };
}
// ล้างของบนพื้น → จำนวนที่ล้างแต่ละชนิด (บันทึกให้ client/รายงาน)
function washGround(ctx, st) {
  const b = ctx.match.board || {};
  const out = { fire: 0, carry: 0, diego: 0, flora: 0, wet: 0 };
  // ไฟของด่าน → เถ้า · ไฟที่ถืออยู่ดับ
  for (const k of Object.keys(st.fire || {})) { delete st.fire[k]; (st.ash ||= {})[k] = 1; out.fire++; }
  out.carry = Object.keys(st.carry || {}).length;
  st.carry = {};
  // ดิเอโก้: น้ำมัน / กองไฟ / ขี้เถ้า
  const L = b.diego;
  if (L) for (const layer of ["oil", "fire", "ash"]) for (const k of Object.keys(L[layer] || {})) { delete L[layer][k]; out.diego++; }
  // เซลิน: พุ่มดอกไม้
  try {
    const Flora = require("../flora");
    for (const k of Object.keys(b.flora || {})) if (Flora.clear(k)) out.flora++;
  } catch (err) { console.error("[fodlan] stage3 ล้างพุ่มดอกไม้ไม่ได้:", err); }
  // เอมิลิโกะ: พื้นเปียก
  try {
    const Ice = require("../ice");
    out.wet = Ice.dryWet(Object.keys(b.wet || {}).map(parseKey)).length;
  } catch (err) { console.error("[fodlan] stage3 ล้างพื้นเปียกไม่ได้:", err); }
  if (out.fire) ctx.bump();
  return out;
}

// ============================================================ ฮุค
function enter(ctx, st) {
  st.turn0 = turnNow(ctx) + 1; // เทิร์นแรกของการมาเยือนครั้งนี้
  st.cat = {};
  st.carry = {};
  st.flag = null;
  st.fire = {};
  st.ash = {};
  st.arrows = null;  // { at, tiles }
  st.dragon = null;  // { at, axis, from }
  st.wave = null;    // { at } — เทิร์นที่คลื่นพัด
}

// ชั้นแผนที่: หญ้าที่ลุก = fd_fire · ไหม้แล้ว = fd_ash
function layer(ctx, st, map) {
  const fire = Object.keys(st.fire || {}), ash = Object.keys(st.ash || {});
  if (!fire.length && !ash.length) return map;
  const special = { ...map.special };
  for (const k of ash) if (!map.terrain[k]) special[k] = "fd_ash";
  for (const k of fire) if (!map.terrain[k]) special[k] = "fd_fire";
  return { ...map, special };
}

// ต้นเทิร์น: ห่าธนู → ไฟมังกร → คลื่น (ตามที่เตือนไว้) แล้วตั้งเป้าเทิร์นหน้า
function preRound(ctx, st) {
  const turn = turnNow(ctx) + 1;
  if (st.turn0 == null) st.turn0 = turn;
  const idx = turn - st.turn0 + 1;
  let secs = 0;
  if (st.arrows && st.arrows.at === turn && st.arrows.tiles.length) {
    const r = landArrows(ctx, st, st.arrows.tiles);
    ctx.fx("arrows", { tiles: st.arrows.tiles, hits: r.hits, spared: r.spared });
    secs += SECS.arrows;
  }
  st.arrows = null;
  if (st.dragon && st.dragon.at === turn) {
    const r = breathe(ctx, st, st.dragon);
    ctx.fx("dragon", { axis: st.dragon.axis, from: st.dragon.from, width: DRAGON_WIDTH, hits: r.hits, lit: r.lit, oil: r.oil });
    secs += SECS.dragon;
  }
  st.dragon = null;
  if (st.wave && st.wave.at === turn) {
    const r = sweep(ctx, st);
    ctx.fx("wave", { dir: { ...WAVE_DIR }, moves: r.moves, washed: r.washed });
    secs += SECS.wave;
  }
  st.wave = null;
  // เป้าเทิร์นหน้า (เตือนแดงตลอดเทิร์นนี้)
  if (ctx.alive().length) st.arrows = { at: turn + 1, tiles: pickArrows(ctx) };
  if ((idx + 1) % DRAGON_EVERY === 0) {
    st.dragon = pickBand(ctx, turn + 1);
    ctx.fx("dragonWarn", { axis: st.dragon.axis, from: st.dragon.from, width: DRAGON_WIDTH });
  }
  if (tsunamiOn(st) && idx < 3) {
    st.wave = { at: turn + 1 };
    ctx.fx("waveWarn", { dir: { ...WAVE_DIR } });
    ctx.log("🌊 ทะเลปั่นป่วน — คลื่นยักษ์กำลังก่อตัว!");
  }
  return Math.min(10, secs);
}

// จบเทิร์น: ไฟลาม 1 ช่อง (หญ้าแห้งติดกัน 4 ทิศ) แล้วไฟเดิมนับเวลาลง → หมด = เถ้า
function onEndTurn(ctx, st) {
  const fire = st.fire || {};
  const old = Object.keys(fire);
  if (!old.length) return;
  const spread = [];
  for (const k of old) {
    const { x, y } = parseKey(k);
    for (const [dx, dy] of DIRS4) {
      const n = K(x + dx, y + dy);
      if (grassAt(st, n) && !spread.some((t) => K(t.x, t.y) === n)) spread.push({ x: x + dx, y: y + dy });
    }
  }
  const lit = igniteGrass(ctx, st, spread);
  if (lit.length) {
    const set = new Set(lit.map((t) => K(t.x, t.y)));
    for (const p of unitsOn(ctx, set)) if (ctx.burn(p, BURN) > 0) ctx.log(`🔥 ไฟลามถึง ${p.name} — ลุกไหม้ ${BURN} เทิร์น`);
    ctx.fx("spread", { tiles: lit });
  }
  for (const k of old) {
    fire[k] -= 1;
    if (fire[k] <= 0) { delete fire[k]; (st.ash ||= {})[k] = 1; }
  }
  ctx.bump();
}

// จบตา: ยืนบนไฟ → ยึดธง
function onUnitEnd(ctx, st, p) {
  if (!p || !p.alive || !p.pos) return;
  const fireSet = new Set(Object.keys(st.fire || {}));
  if (fireSet.size && covers(ctx, p, fireSet)) {
    const dealt = hurt(ctx, p, FIRE_DMG, BURN);
    ctx.log(`🔥 ${p.name} จบตาบนไฟลุก — เสียหาย -${dealt} + ลุกไหม้ ${BURN}`);
  }
  if (!p.alive || !p.pos) return;
  if (covers(ctx, p, new Set([K(FLAG.x, FLAG.y)])) && !(st.flag && st.flag.holder === p.id)) {
    const same = flagSide(ctx, st, p);
    st.flag = { holder: p.id, team: p.teamId || null };
    if (!same) {
      ctx.log(`🚩 ${p.name} ยึดธงทัพ!`);
      ctx.fx("flag", { id: p.id, team: p.teamId || null });
    }
  }
}

function hudActions(ctx, st, p) {
  const out = [];
  const can = ctx.action.canAct(p);
  // เครื่องยิงหิน
  const cats = adjacentTo(ctx, p, liveKind(ctx, "fd_catapult"));
  if (cats.length) {
    const ready = cats.filter((c) => catCd(ctx, st, c) === 0);
    const ok = can && canFire(ctx, p) && ready.length > 0;
    const seen = new Set(), tiles = [];
    if (ok) for (const c of ready) for (const t of catTiles(ctx, c)) { const k = K(t.x, t.y); if (!seen.has(k)) { seen.add(k); tiles.push(t); } }
    const cd = ready.length ? 0 : Math.min(...cats.map((c) => catCd(ctx, st, c)));
    out.push({ key: "fd:catapult", icon: "🪨", name: "เครื่องยิงหิน", disabled: !ok, tiles, ...(cd ? { cd } : {}) });
  }
  // เผาทุ่ง
  const carrying = !!(st.carry && st.carry[p.id]);
  if (!carrying && adjacentTo(ctx, p, liveKind(ctx, "fd_bonfire")).length) {
    out.push({ key: "fd:takefire", icon: "🔥", name: "หยิบไฟ", disabled: !can });
  }
  if (carrying) {
    const tiles = grassNear(ctx, st, p);
    if (tiles.length) out.push({ key: "fd:lightfire", icon: "🔥", name: "จุดไฟ", disabled: !can, tiles: can ? tiles : [] });
  }
  return out;
}
// หญ้าแห้งที่ยังไม่ไหม้ ติดตัว (ระยะ 1)
function grassNear(ctx, st, p) {
  const out = [];
  for (const k of GRASS) {
    if (!grassAt(st, k)) continue;
    const t = parseKey(k);
    if (ctx.adjacent(p, t.x, t.y)) out.push(t);
  }
  return out;
}

function charAction(ctx, st, p, key, tile) {
  if (key === "fd:catapult") return fireCatapult(ctx, st, p, tile);
  if (!ctx.action.canAct(p)) return false;
  if (key === "fd:takefire") {
    if (st.carry && st.carry[p.id]) return false;
    const bf = adjacentTo(ctx, p, liveKind(ctx, "fd_bonfire"))[0];
    if (!bf) return false;
    (st.carry ||= {})[p.id] = true;
    ctx.action.lockMove(p);
    ctx.log(`🔥 ${p.name} หยิบไฟจากกองไฟ`);
    ctx.fx("takefire", { id: p.id, at: { x: bf.x, y: bf.y } });
    return true;
  }
  if (key === "fd:lightfire") {
    if (!(st.carry && st.carry[p.id]) || !tile) return false;
    if (!grassNear(ctx, st, p).some((t) => t.x === tile.x && t.y === tile.y)) return false;
    const lit = igniteGrass(ctx, st, [tile]);
    if (!lit.length) return false;
    delete st.carry[p.id];
    ctx.action.lockMove(p);
    ctx.log(`🔥 ${p.name} จุดไฟเผาทุ่งหญ้าแห้ง`);
    ctx.fx("ignite", { id: p.id, tiles: lit });
    return true;
  }
  return false;
}

function publicInfo(ctx, st) {
  const warn = [];
  if (st.arrows) for (const t of st.arrows.tiles) warn.push({ x: t.x, y: t.y, kind: "arrow" });
  if (st.dragon) for (const t of bandTiles(ctx, st.dragon)) warn.push({ x: t.x, y: t.y, kind: "dragon" });
  if (st.wave) for (const t of shoreTiles(ctx)) warn.push({ x: t.x, y: t.y, kind: "wave" });
  const flagHolder = st.flag && ctx.match.players[st.flag.holder];
  let color = null;
  if (flagHolder) { try { color = require("../lobby").colorOf(flagHolder); } catch { color = null; } }
  return {
    warn,
    fires: Object.entries(st.fire || {}).map(([k, left]) => ({ ...parseKey(k), left })),
    // ธงทัพ: client ย้อมสีตามทีม (duo/trio) หรือสีผู้เล่นที่ยึด (ffa)
    flag: { x: FLAG.x, y: FLAG.y, holder: st.flag ? st.flag.holder : null, team: st.flag ? st.flag.team : null, color },
    catapults: liveKind(ctx, "fd_catapult").map((c) => ({ x: c.x, y: c.y, cd: catCd(ctx, st, c) })),
    carry: Object.keys(st.carry || {}).filter((id) => st.carry[id]),
    dragon: st.dragon ? { axis: st.dragon.axis, from: st.dragon.from, width: DRAGON_WIDTH, at: st.dragon.at } : null,
    wave: st.wave ? { at: st.wave.at, dir: { ...WAVE_DIR } } : null,
  };
}

function playerInfo(ctx, st, p) {
  const badges = [];
  if (st.carry && st.carry[p.id]) badges.push({ key: "carry", icon: "🔥", label: "ถือไฟ" });
  if (st.flag && flagSide(ctx, st, p)) badges.push({ key: "flag", icon: "🚩", label: "ธงทัพ" });
  return badges.length ? { badges } : undefined;
}

module.exports = {
  enter, layer, preRound, onEndTurn, onUnitEnd, hudActions, charAction, publicInfo, playerInfo,
  // ค่าคงที่ (เทสต์ / client)
  CAT_RANGE, CAT_CD, CAT_DMG, ARROW_DMG, ARROW_BASE, DRAGON_EVERY, DRAGON_WIDTH, DRAGON_DMG, FIRE_TURNS, WAVE_DMG, WAVE_CRASH, SECS, FLAG,
  _bandTiles: bandTiles, _shoreTiles: shoreTiles,
};
