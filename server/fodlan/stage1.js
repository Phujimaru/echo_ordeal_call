// ============================================================
//  ด่าน I แม่น้ำแอร์มิด (ป่า + แม่น้ำใหญ่) — โหมด Fodlan · GRID_PLAN §8.5 · ฮุคทั้งหมดดู server/fodlan/README.md · ผัง server/fodlan/map1.js
//
//  แม่น้ำ (ผู้ใช้สั่ง): สิ่งกีดขวาง fd_river (เดิน/ยืน/วางของไม่ได้) แบ่งกระดานเหนือ/ใต้ · ข้ามได้แค่ 2 ทาง:
//   - เรือ 1 ลำ 2×3 (ของกลาง ศัตรูขึ้นได้) จอดท่าฝั่งใดฝั่งหนึ่ง (สุ่มทุกครั้งที่มาเยือน — Claude) · ช่องเรือเดินได้ (ชั้น layer: special "fd_boat")
//   - น้ำแข็ง: ธารน้ำแข็ง (Ice Spike — server/ice.js วางบนช่องที่ TERRAIN iceBridge ได้) บนแม่น้ำ = สะพานน้ำแข็ง (special "ice" — ไถลตามกติกาน้ำแข็งเดิม)
//     น้ำแข็งละลาย (ครบเวลา) ขณะมีคนยืน = ตกน้ำ: ไปช่องว่างใกล้สุด + เสีย 1 (Claude — ข้อเสนอแบบ Fire Emblem)
//  ขับเรือ (ผู้ใช้สั่ง · ปุ่ม "ขับเรือ" 🛶): ยืนบนเรือทั้งตัว + ยังเดินได้ (ไม่ล็อก) → เลือกตำแหน่งเรือใหม่ไปตามแม่น้ำได้ไม่จำกัดช่อง
//   (ทั้งลำต้องอยู่บนแม่น้ำ · ไม่ทับสะพานน้ำแข็ง/คนนอกเรือ · ผ่านสะพานน้ำแข็งไม่ได้) · ของบนเรือไปด้วยทั้งหมด (คน ศพ น้ำแข็ง/พื้นเปียก/ดอกไม้/หนาม/ชั้นของดิเอโก้)
//   ใช้การเดินของตา (lockMove) แต่ยังตี/ใช้สกิลได้ (Claude — ข้อเสนอที่ผู้ใช้รับ) · มีคนยืนคร่อมขอบเรือ (ตัวใหญ่) = ขับไม่ได้
//  คันโยก (ข้อเสนอ Claude ที่ผู้ใช้รับ · ปุ่ม "คันโยก" 🔗): ยืนติดคันโยก + เรือว่าง → ดึงเรือกลับท่าฝั่งของคันโยกนั้น · ใช้การตีของตา
//  ตกปลา (ข้อเสนอที่ผู้ใช้รับ · ปุ่ม "ตกปลา" 🎣): ยืนติดแม่น้ำหรือบนเรือ · ใช้การตีของตา → สุ่มเท่ากัน: เลือด +1 / แต้มสกิล +1 / เหรียญ +2 / ไม่ได้อะไร
//  ฝนฟ้าผ่า (สภาพอากาศ "storm" 3 เทิร์นจากเข้าด่าน): ทุกคนเดิน −1 · ฟ้าผ่า: ช่องเตือนกะพริบแดง → ต้นเทิร์นถัดไปผ่าลงจริง เสียหาย 2 (เกราะก่อน)
//   จำนวนจุด = 2 + ครึ่งหนึ่งของคนบนกระดาน (Claude) · เตือนชุดแรกตอนเข้าด่าน · ทุกเทิร์นที่ยังมีพายุตั้งชุดใหม่ (ชุดสุดท้ายผ่าลงต้นเทิร์นหลังพายุสงบ)
//
//  สถานะของการมาเยือน = st.fd1 (สร้างใน enter) — ไม่มี = ฮุคไม่ทำอะไร (placeOnBoard เรียก layer ก่อน enter ด้วยสถานะของด่านเก่า)
// ============================================================
const MAP = require("./map1");

const W = MAP.BOAT_W, H = MAP.BOAT_H; // เรือ 3 กว้าง × 2 สูง (มุมบนซ้าย = ตำแหน่งเรือ)
const LIGHTNING_DMG = 2;
const LIGHTNING_BASE = 2;      // จำนวนจุดฟ้าผ่า = 2 + floor(คนบนกระดาน / 2)
const LIGHTNING_SECS = 1.8;    // พักเกมให้ฉากฟ้าผ่าเล่น
const FALL_DMG = 1;            // ตกน้ำ (สะพานน้ำแข็งละลาย)
const FISH_SECS = 1.8;
const LEVER_SECS = 1.4;
const FISH_GOLD = 2;
const REWARDS = ["hp", "sp", "gold", "none"]; // สุ่มเท่ากัน

let VISIT = 0; // เลขการมาเยือน (layerVer ต้องต่างจากการมาเยือนก่อน — แผนที่ที่แคชไว้ตอน placeOnBoard)
const K = (x, y) => `${x},${y}`;
const RIVER = new Set((MAP.map.terrain.fd_river || []).map(([x, y]) => K(x, y)));
const DOCKS = MAP.DOCKS.map((d) => ({
  side: d.side,
  tiles: d.tiles.map(([x, y]) => ({ x, y })),
  lever: { x: d.lever[0], y: d.lever[1] },
  anchor: { x: d.anchor[0], y: d.anchor[1] },
}));
const lazyShop = () => require("../shop");

// ---------- เรือ ----------
function boatCells(a) {
  const out = [];
  for (let dy = 0; dy < H; dy++) for (let dx = 0; dx < W; dx++) out.push({ x: a.x + dx, y: a.y + dy });
  return out;
}
const boatKeys = (a) => new Set(boatCells(a).map((c) => K(c.x, c.y)));
const sameSpot = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y;
const footOf = (ctx, p) => ctx.Board.footprint(p.pos.x, p.pos.y, Math.max(1, p.boardSize | 0));
// ตัวที่อยู่บนกระดาน (ทุกชั้นมิติ)
const bodies = (ctx) => ctx.combat.alivePlayers().filter((p) => p.pos);
// ยืนบนเรือทั้งตัว
function onBoat(ctx, s, p) {
  if (!p || !p.pos) return false;
  const keys = boatKeys(s.boat);
  return footOf(ctx, p).every((c) => keys.has(K(c.x, c.y)));
}
// ทับเรือบางส่วน/ทั้งตัว
function touchesBoat(ctx, keys, p) {
  return footOf(ctx, p).some((c) => keys.has(K(c.x, c.y)));
}
function boatEmpty(ctx, s) {
  const keys = boatKeys(s.boat);
  return !bodies(ctx).some((p) => touchesBoat(ctx, keys, p));
}
// ตำแหน่งเรือ a ใช้ได้ไหม: ทั้งลำอยู่บนแม่น้ำ · ไม่ทับสะพานน้ำแข็ง/หนาม/คนที่ไม่ได้อยู่บนเรือตอนนี้
function anchorOk(ctx, s, a, cur, riders) {
  const b = ctx.match.board || {};
  for (const c of boatCells(a)) {
    const k = K(c.x, c.y);
    if (!RIVER.has(k)) return false;
    if (cur.has(k)) continue; // ช่องของเรือตอนนี้ = ของบนเรือเลื่อนไปด้วย
    if ((b.ice && b.ice[k]) || (b.spikes && b.spikes[k])) return false;
  }
  const keys = boatKeys(a);
  return !bodies(ctx).some((p) => !riders.has(p.id) && touchesBoat(ctx, keys, p));
}
// ตำแหน่งเรือที่ไปถึงได้ตามแม่น้ำ (เลื่อนทีละช่อง 4 ทิศ ผ่านเฉพาะตำแหน่งที่ใช้ได้ — สะพานน้ำแข็งขวางทาง) ไม่รวมที่จอดอยู่
function reachableAnchors(ctx, s) {
  const cur = boatKeys(s.boat);
  const riders = new Set(bodies(ctx).filter((p) => touchesBoat(ctx, cur, p)).map((p) => p.id));
  const seen = new Set([K(s.boat.x, s.boat.y)]), out = [], queue = [s.boat];
  for (let i = 0; i < queue.length; i++) {
    for (const [dx, dy] of ctx.Board.DIRS) {
      const a = { x: queue[i].x + dx, y: queue[i].y + dy }, k = K(a.x, a.y);
      if (seen.has(k)) continue;
      seen.add(k);
      if (!anchorOk(ctx, s, a, cur, riders)) continue;
      queue.push(a);
      out.push(a);
    }
  }
  return out;
}
// ช่องที่ผู้เล่นคลิกเลือกตำแหน่งเรือ = กลางแถวหน้า (มุมบนซ้าย + (1, 1)) — client place "list" ไฮไลต์ช่องเหล่านี้
const pickOf = (a) => ({ x: a.x + 1, y: a.y + 1 });
function driveTargets(ctx, s) {
  const keys = boatKeys(s.boat);
  // มีคนยืนคร่อมขอบเรือ (บางส่วนบนเรือ) = ขับไม่ได้
  if (bodies(ctx).some((p) => touchesBoat(ctx, keys, p) && !onBoat(ctx, s, p))) return [];
  return reachableAnchors(ctx, s);
}
// ย้ายของในชั้นกระดานที่คีย์ "x,y" อยู่บนเรือ (ย้ายสองจังหวะ — ตำแหน่งเก่า/ใหม่ทับกันได้)
function shiftKeys(obj, keys, dx, dy) {
  if (!obj || typeof obj !== "object") return false;
  const moved = [];
  for (const k of Object.keys(obj)) {
    if (!keys.has(k)) continue;
    moved.push([k, obj[k]]);
    delete obj[k];
  }
  for (const [k, v] of moved) { const [x, y] = k.split(",").map(Number); obj[K(x + dx, y + dy)] = v; }
  return moved.length > 0;
}
// เลื่อนเรือไป to — ทุกอย่างบนเรือไปด้วย
function moveBoat(ctx, s, to) {
  const from = s.boat, dx = to.x - from.x, dy = to.y - from.y;
  const keys = boatKeys(from);
  for (const p of Object.values(ctx.match.players)) {
    if (p.alive && p.pos && onBoat(ctx, s, p)) p.pos = { x: p.pos.x + dx, y: p.pos.y + dy };
    else if (!p.alive && p.corpse && keys.has(K(p.corpse.x, p.corpse.y))) p.corpse = { ...p.corpse, x: p.corpse.x + dx, y: p.corpse.y + dy };
  }
  const b = ctx.match.board;
  if (b) {
    let layers = false;
    for (const name of ["ice", "wet", "flora", "spikes"]) layers = shiftKeys(b[name], keys, dx, dy) || layers;
    // ชั้นพื้นของดิเอโก้ (น้ำมัน/กองไฟ/ขี้เถ้า — match.board.diego.{…} คีย์ "x,y")
    if (b.diego && typeof b.diego === "object") for (const v of Object.values(b.diego)) if (v && typeof v === "object" && !Array.isArray(v)) layers = shiftKeys(v, keys, dx, dy) || layers;
    if (layers) b.iceVer = (b.iceVer || 0) + 1;
  }
  s.boat = { x: to.x, y: to.y };
  ctx.bump();
}

// ---------- เข้าด่าน ----------
function enter(ctx, st) {
  const dock = DOCKS[ctx.rng() < 0.5 ? 0 : 1];
  const s = st.fd1 = { visit: ++VISIT, boat: { ...dock.anchor }, warn: null, warnFor: 0 };
  ctx.bump();
  // ฝนฟ้าผ่าเริ่มตอนเข้าด่าน: เตือนชุดแรกทันที → ผ่าลงต้นเทิร์นถัดจากเทิร์นที่เข้า
  if (stormOn(ctx)) setWarn(ctx, s, ctx.match.roundNumber + 2);
}

// ---------- ชั้นแผนที่: ช่องเรือ + สะพานน้ำแข็ง เดินได้ ----------
function layer(ctx, st, map) {
  const s = st && st.fd1;
  if (!s) return map;
  const b = ctx.match.board || {};
  const terrain = { ...map.terrain }, special = { ...map.special };
  const deck = boatKeys(s.boat);
  for (const k of deck) {
    if (terrain[k] === "fd_river") delete terrain[k];
    // ชั้นบนเรือ (ตามลำดับของ Ice.overlayOf): ดอกไม้ > น้ำแข็ง > พื้นเปียก > พื้นเรือ
    special[k] = b.flora && b.flora[k] ? "bloom" : b.ice && b.ice[k] ? "ice" : b.wet && b.wet[k] ? "wet" : "fd_boat";
  }
  for (const k of Object.keys(b.ice || {})) {
    if (deck.has(k) || terrain[k] !== "fd_river") continue;
    delete terrain[k];
    special[k] = "ice";
  }
  return { ...map, terrain, special };
}
function layerVer(ctx, st) {
  const s = st && st.fd1;
  return s ? `r${s.visit}` : "x";
}

// ---------- ตกน้ำ: ยืนบนแม่น้ำ (สะพานน้ำแข็งละลาย) → ช่องว่างใกล้สุด + เสีย 1 ----------
function nearestFree(ctx, p) {
  const map = ctx.map(), n = Math.max(1, p.boardSize | 0);
  for (let d = 1; d <= map.cols + map.rows; d++) {
    for (let dx = -d; dx <= d; dx++) for (const sy of [1, -1]) {
      const dy = sy * (d - Math.abs(dx));
      if (sy < 0 && dy === 0) continue;
      const x = p.pos.x + dx, y = p.pos.y + dy;
      if (ctx.Board.footprint(x, y, n).every((c) => ctx.free(c.x, c.y, p.id))) return { x, y };
    }
  }
  return null;
}
function strand(ctx) {
  const map = ctx.map();
  for (const p of bodies(ctx)) {
    if (ctx.action.walksThrough(p)) continue; // บิน/เดินทะลุ = ลอยเหนือน้ำ
    if (!footOf(ctx, p).some((c) => map.terrain[K(c.x, c.y)] === "fd_river")) continue;
    const to = nearestFree(ctx, p);
    if (!to) continue;
    p.pos = to;
    ctx.log(`🌊 ${p.name} ตกน้ำ ขึ้นฝั่งที่ช่อง (${to.x}, ${to.y})`);
    ctx.damage(p, FALL_DMG);
  }
}

// ---------- ฝนฟ้าผ่า ----------
function stormOn(ctx) { return !!(ctx.weather && ctx.weather.kind === "storm"); }
function strikeCount(ctx) { return LIGHTNING_BASE + Math.floor(ctx.alive().length / 2); }
function setWarn(ctx, s, turn) {
  s.warn = ctx.pick(ctx.floorTiles(), strikeCount(ctx));
  s.warnFor = turn;
}
function strike(ctx, s) {
  const hits = [], hitIds = new Set();
  for (const t of s.warn) {
    ctx.fx("lightning", { x: t.x, y: t.y });
    for (const p of bodies(ctx)) {
      if (hitIds.has(p.id) || !footOf(ctx, p).some((c) => c.x === t.x && c.y === t.y)) continue;
      hitIds.add(p.id);
      hits.push(p);
    }
  }
  ctx.log(`⚡ ฟ้าผ่าลง ${s.warn.length} จุด`);
  for (const p of hits) {
    const dealt = ctx.damage(p, LIGHTNING_DMG);
    ctx.log(`⚡ ${p.name} โดนฟ้าผ่า -${dealt}`);
  }
  s.warn = null;
  return LIGHTNING_SECS;
}
// ต้นเทิร์น: ตกน้ำ → ฟ้าผ่าลงช่องที่เตือนไว้ → พายุยังอยู่ = เตือนชุดใหม่สำหรับเทิร์นหน้า
function preRound(ctx, st) {
  const s = st && st.fd1;
  if (!s) return 0;
  strand(ctx);
  const turn = ctx.match.roundNumber + 1;
  let secs = 0;
  if (s.warn && s.warnFor <= turn) secs = strike(ctx, s);
  if (stormOn(ctx) && !s.warn) setWarn(ctx, s, turn + 1);
  return secs;
}
function onEndTurn(ctx, st) {
  if (st && st.fd1) strand(ctx); // หลังน้ำแข็งนับเวลา (Ice.onEndTurn มาก่อน)
}
function movMod(ctx) { return stormOn(ctx) ? -1 : 0; }

// ---------- ปุ่ม HUD ----------
function canMove(ctx, p) {
  const a = ctx.match.action;
  return ctx.action.canAct(p) && !!a && !a.locked;
}
function canStrike(ctx, p) {
  const a = ctx.match.action;
  return ctx.action.canAct(p) && !!a && !a.noStrike && !p.didAttackRound;
}
// ช่องแม่น้ำ (ยังเป็นน้ำ) ที่ติดตัว / ติดเรือ (ยืนบนเรือ)
function waterNear(ctx, s, p) {
  const map = ctx.map(), out = [], seen = new Set();
  const from = onBoat(ctx, s, p) ? boatCells(s.boat) : footOf(ctx, p);
  for (const c of from) for (const [dx, dy] of ctx.Board.DIRS) {
    const x = c.x + dx, y = c.y + dy, k = K(x, y);
    if (seen.has(k) || map.terrain[k] !== "fd_river") continue;
    seen.add(k);
    out.push({ x, y });
  }
  return out;
}
const leverNear = (ctx, p) => DOCKS.find((d) => ctx.adjacent(p, d.lever.x, d.lever.y)) || null;
function leverReady(ctx, s, dock) {
  if (sameSpot(s.boat, dock.anchor) || !boatEmpty(ctx, s)) return false;
  return reachableAnchors(ctx, s).some((a) => sameSpot(a, dock.anchor));
}
function hudActions(ctx, st, p) {
  const s = st && st.fd1;
  if (!s || !p || !p.pos) return [];
  const out = [];
  if (onBoat(ctx, s, p)) {
    const list = canMove(ctx, p) ? driveTargets(ctx, s) : [];
    out.push({ key: "fd:boat", icon: "🛶", name: "ขับเรือ", disabled: !list.length, tiles: list.map(pickOf) });
  }
  const dock = leverNear(ctx, p);
  if (dock) out.push({ key: "fd:lever", icon: "🔗", name: "คันโยก", disabled: !(canStrike(ctx, p) && leverReady(ctx, s, dock)) });
  if (waterNear(ctx, s, p).length) out.push({ key: "fd:fish", icon: "🎣", name: "ตกปลา", disabled: !canStrike(ctx, p) });
  return out;
}

// ---------- ลงผลปุ่ม ----------
function drive(ctx, s, p, tile) {
  if (!canMove(ctx, p) || !onBoat(ctx, s, p) || !tile) return false;
  const to = driveTargets(ctx, s).find((a) => sameSpot(pickOf(a), tile));
  if (!to) return false;
  const from = { ...s.boat };
  moveBoat(ctx, s, to);
  ctx.action.lockMove(p);
  ctx.fx("boat", { from, to: { ...to }, by: p.id });
  ctx.log(`🛶 ${p.name} ขับเรือ`);
  return true;
}
function pullLever(ctx, s, p) {
  const dock = leverNear(ctx, p);
  if (!dock || !canStrike(ctx, p) || !leverReady(ctx, s, dock)) return false;
  const from = { ...s.boat };
  ctx.match.action.locked = true;
  moveBoat(ctx, s, dock.anchor);
  ctx.fx("lever", { x: dock.lever.x, y: dock.lever.y, side: dock.side, from, to: { ...dock.anchor }, by: p.id });
  ctx.log(`🔗 ${p.name} ดึงคันโยก — เรือกลับเข้าท่า`);
  ctx.useStrike(p, LEVER_SECS);
  return true;
}
function fish(ctx, s, p) {
  if (!canStrike(ctx, p)) return false;
  const water = waterNear(ctx, s, p);
  if (!water.length) return false;
  const spot = water[Math.floor(ctx.rng() * water.length) % water.length];
  const reward = REWARDS[Math.floor(ctx.rng() * REWARDS.length) % REWARDS.length];
  let amt = 0, text = "ไม่ได้อะไร";
  if (reward === "hp") { amt = ctx.combat.healHp(p, 1) || 0; text = `ฟื้นพลังชีวิต +${amt}`; }
  else if (reward === "sp") { const before = p.skillPoints || 0; ctx.combat.addSkill(p, 1, "item"); amt = (p.skillPoints || 0) - before; text = `แต้มสกิล +${amt}`; }
  else if (reward === "gold") { amt = lazyShop().addGold(p, FISH_GOLD); text = `เหรียญ +${amt}`; }
  ctx.match.action.locked = true;
  ctx.fx("fish", { id: p.id, from: { x: p.pos.x, y: p.pos.y }, x: spot.x, y: spot.y, reward, amt });
  ctx.log(`🎣 ${p.name} ตกปลา — ${text}`);
  ctx.useStrike(p, FISH_SECS);
  return reward;
}
function charAction(ctx, st, p, key, tile) {
  const s = st && st.fd1;
  if (!s || !p || !p.pos) return false;
  if (key === "fd:boat") return drive(ctx, s, p, tile);
  if (key === "fd:lever") return pullLever(ctx, s, p);
  if (key === "fd:fish") return !!fish(ctx, s, p);
  return false;
}

// ---------- ข้อมูลให้ client ----------
function publicInfo(ctx, st) {
  const s = st && st.fd1;
  if (!s) return {};
  return {
    boat: { x: s.boat.x, y: s.boat.y, w: W, h: H },
    docks: DOCKS.map((d) => ({ side: d.side, tiles: d.tiles.map((t) => ({ ...t })), lever: { ...d.lever }, anchor: { ...d.anchor }, here: sameSpot(s.boat, d.anchor) })),
    warn: (s.warn || []).map((t) => ({ x: t.x, y: t.y, kind: "lightning" })),
  };
}

module.exports = {
  enter, layer, layerVer, preRound, onEndTurn, movMod, hudActions, charAction, publicInfo,
  // เทสต์
  boatCells, reachableAnchors, driveTargets, moveBoat, pickOf, strand,
  RIVER, DOCKS, LIGHTNING_DMG, LIGHTNING_BASE, FALL_DMG, FISH_GOLD, REWARDS,
};
