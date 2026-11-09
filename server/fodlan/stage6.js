// ============================================================
//  สนาม Eos (GRID_PLAN §8.6 — เดิมชื่อ Lucid · ธีม Final Fantasy XV) — "ด่าน 6" ของตัวคุม server/fodlan.js ในโลก "eos"
//  ผัง 32×32 + ข้อมูลรถ/ช็อโก้/โซน: server/fodlan/map6.js · ฮุคทั้งหมดดู server/fodlan/README.md
//
//  ขั้น 1 (ผู้ใช้สั่ง 2026-11-09):
//   - ระยะเดินทุกคน +2 (แผนที่ใหญ่ — ผู้ใช้ยืนยัน)
//   - ช็อโก้ 4 ตัว (คอกป่า Duscae 2 · คอกทะเลทราย 2): จบตาบนช่องช็อโก้ = ขึ้นขี่ · ขี่อยู่ เดิน +3 + ป่าทึบ/น้ำตื้นกิน 1 ก้าว
//     โดนดาเมจ (เลือด+เกราะลด) = ตกนก → นกวิ่งกลับคอก เกิดใหม่หลัง 3 เทิร์น · ปุ่ม "ลง" วางนกไว้ช่องข้างตัว (ไม่เสียการเดิน)
//     ขี่ไม่ได้: ตัวใหญ่หลายช่อง · บินได้ · ขี่ม้าอยู่ · ยูนิตที่ถูกเรียก (Claude ตัดสินแบบ Fire Emblem — ผู้ใช้มอบให้)
//   - รถ 3 คัน 2×2 (นั่ง 4 · แบบเรือ Fodlan ด่าน I): ยืนบนรถทั้งตัว + ยังเดินได้ → ปุ่ม "ขับ" เลือกตำแหน่งใหม่บนถนนไม่เกิน 10 ช่อง
//     ใช้การเดินของตา (lockMove) ยังตี/ใช้สกิลได้ · รถคันอื่นขวางทาง (หยุดหน้าคันที่ขวาง) · คนที่ไม่ได้นั่งรถบนทางที่รถผ่าน = ถูกชน 2 + กระเด็นออก 1 ช่อง (L1)
//     ทุกอย่างบนรถ (คน ศพ) ไปด้วย
//   - กลางคืน: ปีศาจ 4 ตัวเกิดนอกเมือง (HP 5 · เกราะ 1 · ตี 2 · เดิน 4) ต้นทุกเทิร์นกลางคืนเดินไล่คนใกล้สุดแล้วตีถ้าติดตัว
//     เข้าเมืองที่มีไฟถนน (Insomnia/Hammerhead/Altissia) ไม่ได้ · ฟ้าสาง = สลายหมด · ตีปกติใส่ได้ (ของบนกระดาน "fd:dm…") ฆ่าได้ 2 เหรียญ
//   - สภาพอากาศ (server/fodlan.js สุ่ม — 50% ทุกจบเทิร์นตั้งแต่จบเทิร์น 2 · อยู่ 3 เทิร์น · สงบแล้วพัก 2 เทิร์น):
//     ฝนฟ้าคะนอง eos_storm = เดิน −1 + ฟ้าผ่า 3 จุด/เทิร์น (ช่องเตือนก่อน → ต้นเทิร์นถัดไปผ่าจริง 2 ดาเมจ)
//     หมอก eos_fog = มองเห็นแค่ระยะเดินของฝ่ายตัวเอง (แบบด่าน II)
//
//  สถานะ = st.eos (สร้างใน enter) — ไม่มี = ฮุคไม่ทำอะไร
// ============================================================
const MAP = require("./map6");

const MOV_BONUS = 2;          // ทุกคนบน Eos
const CHOCO_MOV = 3;          // ขี่ช็อโก้
const CHOCO_RESPAWN = 3;      // ตกนกแล้วเกิดใหม่ที่คอกหลัง N เทิร์น
const CAR_RANGE = 10;         // ช่องที่รถวิ่งได้ต่อตา
const CAR_HIT_DMG = 2;
const DAEMON_COUNT = 4;
const DAEMON_HP = 5;
const DAEMON_ARMOR = 1;
const DAEMON_ATK = 2;
const DAEMON_MOV = 4;
const DAEMON_GOLD = 2;
const DAEMON_SPAWN_GAP = 3;   // เกิดห่างผู้เล่นอย่างน้อย N ช่อง
const LIGHTNING_COUNT = 3;
const LIGHTNING_DMG = 2;
const STORM_MOV = -1;
// เงื่อนไขชนะ (ผู้ใช้สั่ง 2026-11-09): ยึดเสา 5 ต้น · แต้มต่อเทิร์นตามจำนวนเสาที่ถือ · ถึง 20 ก่อนชนะ
const SCORE_GOAL = 20;
const SCORE_TABLE = [0, 1, 3, 6, 10, 15];
const SEIZE_SECS = 1.4;
const REVIVE_TURNS = 3;       // ตายแล้วฟื้นหลัง 3 เทิร์น
const SIGHT_EXTRA = 4;        // เห็นผู้เล่นอื่นในระยะเดิน + 4 ช่อง
const SECS = { revive: 1.2, lightning: 1.8, daemonSpawn: 1.6, daemonAct: 1.4, dawn: 1.4 };

const S = MAP.CAR_SIZE;
const K = (x, y) => `${x},${y}`;
const ROAD = new Set((MAP.map.special.fd_eos_road || []).map(([x, y]) => K(x, y)));
const TOWNS = MAP.ZONES.filter((z) => z.town);
const inRect = (r, x, y) => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3];
const inTown = (x, y) => TOWNS.some((z) => inRect(z.rect, x, y));
const zoneAt = (x, y) => (MAP.ZONES.find((z) => inRect(z.rect, x, y)) || { id: "wild" }).id;
const lazyShop = () => require("../shop");
const lazyAttack = () => require("../phases/attack");
const lazyLobby = () => require("../lobby");
const lazyDuo = () => require("../duo");
let VISIT = 0;

const bodies = (ctx) => ctx.combat.alivePlayers().filter((p) => p.pos);
const sizeOf = (ctx, p) => Math.max(1, ctx.action.sizeOf(p) | 0);
const footOf = (ctx, p) => ctx.Board.footprint(p.pos.x, p.pos.y, sizeOf(ctx, p));
const stormOn = (ctx) => !!(ctx.weather && ctx.weather.kind === "eos_storm");
const fogOn = (ctx) => !!(ctx.weather && ctx.weather.kind === "eos_fog");
const nightAt = (ctx, round) => { try { return !!ctx.engine.isNightRound(round); } catch { return false; } };

// ============================================================ เข้าสนาม
function enter(ctx, st) {
  st.eos = {
    visit: ++VISIT, seq: 0,
    cars: MAP.CARS.map(([x, y], i) => ({ id: `fd:car${i + 1}`, img: i + 1, x, y })),
    chocos: MAP.CHOCOBOS.map(([x, y], i) => ({ id: `fd:choco${i + 1}`, home: { x, y }, x, y, rider: null, back: 0 })),
    riders: {},      // id ผู้ขี่ → { choco, mark } (mark = เลือด+เกราะล่าสุด — ลดลง = ตกนก)
    daemons: [],
    night: false, // เทิร์นแรกเป็นกลางคืน (เริ่มแมตช์กลางเทิร์น — dev) = ปีศาจเกิดต้นเทิร์นแรก
    warn: null, warnFor: 0,
    pillars: MAP.PILLARS.map((pl, i) => ({ id: `fd:pillar${i + 1}`, zone: pl.zone, x: pl.at[0], y: pl.at[1], owner: null, ch: null })),
    scores: {},      // ฝ่าย → แต้ม
    dead: {},        // id ผู้เล่น → เทิร์นที่ล้ม (ฟื้นต้นเทิร์น + REVIVE_TURNS)
    winner: null,
  };
  ctx.bump();
}

// ============================================================ ชั้นแผนที่
function layer(ctx, st, map) {
  const s = st && st.eos;
  if (!s) return map;
  const terrain = { ...map.terrain }, special = { ...map.special };
  for (const c of s.cars) for (const t of carCells(c)) special[K(t.x, t.y)] = "fd_eos_car";
  for (const c of s.chocos) if (c.x != null && !c.rider) special[K(c.x, c.y)] = "fd_eos_chocobo";
  for (const d of s.daemons) terrain[K(d.x, d.y)] = "fd_eos_daemon";
  return { ...map, terrain, special };
}
function layerVer(ctx, st) {
  const s = st && st.eos;
  return s ? `e${s.visit}` : "x";
}

// ============================================================ ระยะเดิน
function riding(s, p) { return !!(s && p && s.riders[p.id]); }
function movMod(ctx, st, p) {
  const s = st && st.eos;
  if (!s || !p) return 0;
  return MOV_BONUS + (riding(s, p) ? CHOCO_MOV : 0) + (stormOn(ctx) ? STORM_MOV : 0);
}
function flatWalk(ctx, st, p) { return riding(st && st.eos, p); }

// ============================================================ ช็อโก้
// ขี่ม้าอยู่ (ไจโร/ดิเอโก้ — characters/_horse.js เก็บ { mounted, horseHp } ในสถานะตัวละคร)
function onHorse(p) {
  return Object.values(p || {}).some((v) => v && typeof v === "object" && !Array.isArray(v) && v.mounted === true && "horseHp" in v);
}
function canRide(ctx, p) {
  return !!(p && p.alive && p.pos && !p.summon && sizeOf(ctx, p) === 1 && !ctx.action.flies(p) && !onHorse(p));
}
const markOf = (p) => (p.hp || 0) + (p.armor || 0);
function chocoAt(s, x, y) { return s.chocos.find((c) => !c.rider && c.x === x && c.y === y) || null; }
function mount(ctx, s, p, c) {
  c.rider = p.id;
  s.riders[p.id] = { choco: c.id, mark: markOf(p) };
  ctx.bump();
  ctx.fx("choco_mount", { id: p.id, choco: c.id, x: c.x, y: c.y });
  ctx.log(`🐤 ${p.name} ขี่ช็อโก้`);
}
// ช็อโก้วิ่งกลับคอก → เกิดใหม่หลัง CHOCO_RESPAWN เทิร์น
function sendHome(ctx, s, c, from) {
  c.rider = null;
  c.x = null; c.y = null;
  c.back = ctx.match.roundNumber + CHOCO_RESPAWN;
  ctx.bump();
  ctx.fx("choco_home", { choco: c.id, from, home: { ...c.home } });
}
function unride(ctx, s, pid) {
  const r = s.riders[pid];
  delete s.riders[pid];
  return r ? s.chocos.find((c) => c.id === r.choco) || null : null;
}
// ตกนก: เลือด+เกราะลดลงตั้งแต่ครั้งก่อน · ตาย · ออกจากกระดาน · ตอนนี้ขี่ไม่ได้แล้ว (ขึ้นม้า ขยายร่าง …)
function checkRiders(ctx, s) {
  for (const pid of Object.keys(s.riders)) {
    const p = ctx.match.players[pid], r = s.riders[pid];
    const from = p && p.pos ? { x: p.pos.x, y: p.pos.y } : null;
    if (!p || !p.alive || !p.pos || !canRide(ctx, p)) {
      const c = unride(ctx, s, pid);
      if (c) sendHome(ctx, s, c, from);
      continue;
    }
    const now = markOf(p);
    if (now < r.mark) {
      const c = unride(ctx, s, pid);
      ctx.fx("choco_fall", { id: p.id, x: p.pos.x, y: p.pos.y });
      ctx.log(`🐤 ${p.name} ตกจากช็อโก้!`);
      if (c) sendHome(ctx, s, c, from);
    } else r.mark = now; // ฟื้นเลือด = จุดอ้างอิงใหม่
  }
}
function respawnChocos(ctx, s) {
  const round = ctx.match.roundNumber + 1;
  for (const c of s.chocos) {
    if (c.x != null || c.rider || round < c.back) continue;
    const spot = freeNear(ctx, s, c.home.x, c.home.y, 2);
    if (!spot) continue;
    c.x = spot.x; c.y = spot.y; c.back = 0;
    ctx.bump();
    ctx.fx("choco_back", { choco: c.id, x: c.x, y: c.y });
  }
}
// ลงจากช็อโก้: วางนกไว้ช่องว่างข้างตัว
function dismountTiles(ctx, s, p) {
  const out = [];
  for (const [dx, dy] of ctx.Board.DIRS) {
    const x = p.pos.x + dx, y = p.pos.y + dy;
    if (tileFree(ctx, s, x, y)) out.push({ x, y });
  }
  return out;
}

// ============================================================ รถ
function carCells(a) {
  const out = [];
  for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) out.push({ x: a.x + dx, y: a.y + dy });
  return out;
}
const carKeys = (a) => new Set(carCells(a).map((c) => K(c.x, c.y)));
const touches = (ctx, keys, p) => footOf(ctx, p).some((c) => keys.has(K(c.x, c.y)));
const onCarFully = (ctx, c, p) => { const keys = carKeys(c); return footOf(ctx, p).every((t) => keys.has(K(t.x, t.y))); };
function carOf(ctx, s, p) { return p && p.pos ? s.cars.find((c) => onCarFully(ctx, c, p)) || null : null; }
// มุมบนซ้าย a ใช้ได้: ทั้งคันอยู่บนถนน · ไม่ทับรถคันอื่น
function anchorOnRoad(s, car, a) {
  for (const t of carCells(a)) if (!ROAD.has(K(t.x, t.y))) return false;
  for (const o of s.cars) {
    if (o === car) continue;
    const ok = carKeys(o);
    if (carCells(a).some((t) => ok.has(K(t.x, t.y)))) return false;
  }
  return true;
}
// ตำแหน่งที่ไปถึงได้ (BFS บนถนน ≤ CAR_RANGE ก้าว) → [{ x, y, d, path: [anchor…] }] · ปลายทางต้องว่าง (ไม่มีคนนอกรถ/ปีศาจ)
function carTargets(ctx, s, car) {
  const keys = carKeys(car);
  const all = bodies(ctx);
  if (all.some((p) => touches(ctx, keys, p) && !onCarFully(ctx, car, p))) return []; // คร่อมขอบรถ = ขับไม่ได้
  const riders = new Set(all.filter((p) => touches(ctx, keys, p)).map((p) => p.id));
  const blockedEnd = (a) => {
    const ak = carKeys(a);
    if (all.some((p) => !riders.has(p.id) && touches(ctx, ak, p))) return true;
    if (s.daemons.some((d) => ak.has(K(d.x, d.y)))) return true;
    return false;
  };
  const start = { x: car.x, y: car.y, d: 0, prev: null };
  const seen = new Map([[K(car.x, car.y), start]]);
  const queue = [start], out = [];
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i];
    if (cur.d >= CAR_RANGE) continue;
    for (const [dx, dy] of ctx.Board.DIRS) {
      const a = { x: cur.x + dx, y: cur.y + dy };
      const k = K(a.x, a.y);
      if (seen.has(k) || !anchorOnRoad(s, car, a)) continue;
      const node = { ...a, d: cur.d + 1, prev: cur };
      seen.set(k, node);
      queue.push(node);
      if (!blockedEnd(a)) out.push(node);
    }
  }
  return out.map((n) => {
    const path = [];
    for (let c = n; c; c = c.prev) path.unshift({ x: c.x, y: c.y });
    return { x: n.x, y: n.y, d: n.d, path };
  });
}
// ช่องที่ผู้เล่นคลิกเลือกตำแหน่งรถ = มุมบนซ้าย
const pickOf = (a) => ({ x: a.x, y: a.y });
function shiftCorpses(ctx, keys, dx, dy) {
  for (const p of Object.values(ctx.match.players)) {
    if (!p.alive && p.corpse && keys.has(K(p.corpse.x, p.corpse.y))) p.corpse = { ...p.corpse, x: p.corpse.x + dx, y: p.corpse.y + dy };
  }
}
// ชนคนบนทาง: ทุกคนที่ไม่ได้นั่งรถ (ไม่บิน) ที่ทับช่องรถช่วงไหนก็ได้ของทาง (ไม่รวมจุดเริ่ม)
function runOver(ctx, s, car, path, riders, by) {
  const swept = new Set();
  for (const a of path.slice(1)) for (const t of carCells(a)) swept.add(K(t.x, t.y));
  const end = carKeys(path[path.length - 1]);
  const hits = [];
  for (const p of bodies(ctx)) {
    if (riders.has(p.id) || ctx.action.walksThrough(p) || !touches(ctx, swept, p)) continue;
    const from = { x: p.pos.x, y: p.pos.y };
    const dealt = ctx.damage(p, CAR_HIT_DMG);
    if (p.alive && p.pos) {
      const to = knockSpot(ctx, s, p, swept, end);
      if (to) p.pos = to;
    }
    hits.push({ id: p.id, from, to: p.pos ? { ...p.pos } : null, dmg: dealt });
    ctx.log(`🚗 ${by.name} ขับรถชน ${p.name} -${dealt}`);
  }
  for (const d of s.daemons.slice()) {
    if (!swept.has(K(d.x, d.y))) continue;
    hits.push({ daemon: d.id, from: { x: d.x, y: d.y }, dmg: CAR_HIT_DMG });
    hurtDaemon(ctx, s, d, CAR_HIT_DMG, by);
  }
  return hits;
}
// กระเด็นออกจากทางรถ 1 ช่อง: ช่องว่างข้างตัวที่ไม่อยู่บนทางรถ (ไม่มี = ช่องว่างใกล้สุดนอกปลายทาง)
function knockSpot(ctx, s, p, swept, end) {
  for (const [dx, dy] of ctx.Board.DIRS) {
    const x = p.pos.x + dx, y = p.pos.y + dy;
    if (!swept.has(K(x, y)) && tileFree(ctx, s, x, y, p.id)) return { x, y };
  }
  const near = freeNear(ctx, s, p.pos.x, p.pos.y, 6, p.id, (x, y) => !end.has(K(x, y)));
  return near;
}
function drive(ctx, s, p, tile) {
  const car = carOf(ctx, s, p);
  if (!car || !canMove(ctx, p) || !tile) return false;
  const to = carTargets(ctx, s, car).find((a) => a.x === tile.x && a.y === tile.y);
  if (!to) return false;
  const keys = carKeys(car);
  const riders = new Set(bodies(ctx).filter((u) => onCarFully(ctx, car, u)).map((u) => u.id));
  const from = { x: car.x, y: car.y };
  const dx = to.x - car.x, dy = to.y - car.y;
  const hits = runOver(ctx, s, car, to.path, riders, p);
  for (const id of riders) {
    const u = ctx.match.players[id];
    if (u && u.pos) u.pos = { x: u.pos.x + dx, y: u.pos.y + dy };
  }
  shiftCorpses(ctx, keys, dx, dy);
  car.x = to.x; car.y = to.y;
  ctx.bump();
  ctx.action.lockMove(p);
  ctx.fx("car_drive", { car: car.id, img: car.img, from, to: { x: to.x, y: to.y }, path: to.path, by: p.id, riders: [...riders], hits });
  ctx.log(`🚗 ${p.name} ขับรถ ${to.d} ช่อง`);
  return true;
}

// ============================================================ ช่องว่าง
// ช่องเดินได้ ว่าง (ไม่มีคน ไม่มีสิ่งกีดขวาง/ปีศาจ ไม่ใช่รถ/ช็อโก้)
function tileFree(ctx, s, x, y, selfId = null) {
  if (!ctx.free(x, y, selfId)) return false;
  for (const c of s.cars) if (carKeys(c).has(K(x, y))) return false;
  if (s.chocos.some((c) => !c.rider && c.x === x && c.y === y)) return false;
  if (s.daemons.some((d) => d.x === x && d.y === y)) return false;
  return true;
}
function freeNear(ctx, s, x0, y0, maxD = 4, selfId = null, extra = null) {
  for (let d = 0; d <= maxD; d++) {
    for (let dx = -d; dx <= d; dx++) for (const sy of [1, -1]) {
      const dy = sy * (d - Math.abs(dx));
      if (sy < 0 && dy === 0) continue;
      const x = x0 + dx, y = y0 + dy;
      if (tileFree(ctx, s, x, y, selfId) && (!extra || extra(x, y))) return { x, y };
    }
  }
  return null;
}

// ============================================================ ปีศาจ
const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
function spawnDaemons(ctx, s) {
  const map = ctx.map(), units = bodies(ctx);
  const cand = [];
  for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) {
    if (inTown(x, y) || !tileFree(ctx, s, x, y)) continue;
    if (units.some((p) => footOf(ctx, p).some((t) => manhattan(t, { x, y }) < DAEMON_SPAWN_GAP))) continue;
    cand.push({ x, y });
  }
  const picked = ctx.pick(cand, DAEMON_COUNT);
  for (const t of picked) s.daemons.push({ id: `fd:dm${++s.seq}`, x: t.x, y: t.y, hp: DAEMON_HP, armor: DAEMON_ARMOR, kind: 1 + (s.seq % 4) });
  if (picked.length) {
    ctx.bump();
    ctx.fx("daemon_spawn", { list: picked.map((t) => ({ x: t.x, y: t.y })) });
    ctx.log(`👹 ราตรีมาเยือน — ปีศาจ ${picked.length} ตัวโผล่ขึ้นมา!`);
  }
  return picked.length;
}
function dissolveDaemons(ctx, s) {
  if (!s.daemons.length) return 0;
  ctx.fx("daemon_dissolve", { list: s.daemons.map((d) => ({ x: d.x, y: d.y, kind: d.kind })) });
  ctx.log("☀️ ฟ้าสาง — ปีศาจสลายไปกับแสงอรุณ");
  s.daemons = [];
  ctx.bump();
  return 1;
}
// เป้าที่ตีได้: ผู้เล่นบนกระดาน (ไม่บินลอยข้ามหัว · ไม่อยู่ในเมือง)
function prey(ctx) {
  return bodies(ctx).filter((p) => !ctx.action.walksThrough(p) && !footOf(ctx, p).some((t) => inTown(t.x, t.y)));
}
// เดินไล่: BFS จากปีศาจ (ช่องว่าง นอกเมือง) หาช่องที่ติดเป้าใกล้สุด → เดินไปตามทางไม่เกิน DAEMON_MOV
function stepDaemon(ctx, s, d, targets) {
  const map = ctx.map();
  const adjT = (x, y) => targets.find((p) => footOf(ctx, p).some((t) => manhattan(t, { x, y }) === 1)) || null;
  const hit0 = adjT(d.x, d.y);
  if (hit0) return { to: null, target: hit0 };
  const start = { x: d.x, y: d.y, d: 0, prev: null };
  const seen = new Set([K(d.x, d.y)]);
  const queue = [start];
  let goal = null;
  for (let i = 0; i < queue.length && !goal; i++) {
    const cur = queue[i];
    for (const [dx, dy] of ctx.Board.DIRS) {
      const x = cur.x + dx, y = cur.y + dy, k = K(x, y);
      if (seen.has(k) || !ctx.Board.inBounds(map, x, y) || inTown(x, y) || !tileFree(ctx, s, x, y)) continue;
      seen.add(k);
      const node = { x, y, d: cur.d + 1, prev: cur };
      if (adjT(x, y)) { goal = node; break; }
      queue.push(node);
    }
  }
  if (!goal) return { to: null, target: null };
  const path = [];
  for (let c = goal; c; c = c.prev) path.unshift({ x: c.x, y: c.y });
  const stop = path[Math.min(DAEMON_MOV, path.length - 1)];
  return { to: stop, path: path.slice(0, Math.min(DAEMON_MOV, path.length - 1) + 1), target: adjT(stop.x, stop.y) };
}
function actDaemons(ctx, s) {
  if (!s.daemons.length) return 0;
  const moves = [], attacks = [];
  for (const d of s.daemons.slice()) {
    if (!s.daemons.includes(d)) continue;
    const targets = prey(ctx);
    if (!targets.length) break;
    const r = stepDaemon(ctx, s, d, targets);
    if (r.to && (r.to.x !== d.x || r.to.y !== d.y)) {
      moves.push({ id: d.id, from: { x: d.x, y: d.y }, to: { ...r.to }, path: r.path, kind: d.kind });
      d.x = r.to.x; d.y = r.to.y;
      ctx.bump();
    }
    if (r.target && r.target.alive) {
      const dealt = ctx.damage(r.target, DAEMON_ATK);
      attacks.push({ id: d.id, x: d.x, y: d.y, target: r.target.id, dmg: dealt });
      ctx.log(`👹 ปีศาจโจมตี ${r.target.name} -${dealt}`);
    }
  }
  if (moves.length) ctx.fx("daemon_move", { moves });
  if (attacks.length) ctx.fx("daemon_attack", { attacks });
  return moves.length || attacks.length ? 1 : 0;
}
function hurtDaemon(ctx, s, d, n, by) {
  let left = n;
  const soak = Math.min(d.armor, left);
  d.armor -= soak; left -= soak;
  d.hp -= left;
  if (d.hp > 0) {
    ctx.fx("daemon_hit", { id: d.id, x: d.x, y: d.y, hp: d.hp, armor: d.armor });
    return false;
  }
  s.daemons = s.daemons.filter((o) => o !== d);
  ctx.bump();
  const got = by ? lazyShop().addGold(by, DAEMON_GOLD) : 0;
  ctx.fx("daemon_die", { id: d.id, x: d.x, y: d.y, kind: d.kind, by: by ? by.id : null });
  ctx.log(`💥 ${by ? by.name : "ใครบางคน"} กำจัดปีศาจ!${got ? ` ได้ ${got} เหรียญ` : ""}`);
  return true;
}
function strikeDmg(p) {
  const dummy = { id: "fd:daemon", name: "ปีศาจ", alive: true, hp: DAEMON_HP, armor: DAEMON_ARMOR, statuses: {}, statusAmt: {}, pos: p.pos };
  const n = lazyAttack().estimateAttackOn(p, dummy);
  return Math.max(1, Number.isFinite(n) ? Math.round(n) : 1);
}

// ============================================================ ฝนฟ้าคะนอง
function setWarn(ctx, s, turn) {
  s.warn = ctx.pick(ctx.floorTiles(), LIGHTNING_COUNT);
  s.warnFor = turn;
}
function strike(ctx, s) {
  const hitIds = new Set(), hits = [];
  for (const t of s.warn) {
    ctx.fx("lightning", { x: t.x, y: t.y });
    for (const p of bodies(ctx)) {
      if (hitIds.has(p.id) || !footOf(ctx, p).some((c) => c.x === t.x && c.y === t.y)) continue;
      hitIds.add(p.id);
      hits.push(p);
    }
    for (const d of s.daemons.slice()) if (d.x === t.x && d.y === t.y) hurtDaemon(ctx, s, d, LIGHTNING_DMG, null);
  }
  ctx.log(`⚡ ฟ้าผ่าลง ${s.warn.length} จุด`);
  for (const p of hits) {
    const dealt = ctx.damage(p, LIGHTNING_DMG);
    ctx.log(`⚡ ${p.name} โดนฟ้าผ่า -${dealt}`);
  }
  s.warn = null;
  return SECS.lightning;
}
function weatherStart(ctx, st) {
  const s = st && st.eos;
  if (s && stormOn(ctx) && !s.warn) setWarn(ctx, s, ctx.match.roundNumber + 2);
}

// ============================================================ ฝ่าย (โหมดทีม = ทีม · อื่นๆ = เจ้าของ — ระบบคู่นับเป็นฝ่ายเดียว)
function sideOf(p) {
  if (!p) return null;
  if (lazyLobby().teamModeActive() && p.teamId) return `t:${p.teamId}`;
  return `p:${lazyDuo().sideKey(p)}`;
}
function sideColor(ctx, side) {
  const p = Object.values(ctx.match.players).find((u) => !u.summon && sideOf(u) === side);
  try { return p ? lazyLobby().colorOf(p) : "#cccccc"; } catch { return "#cccccc"; }
}
function sideName(ctx, side) {
  const list = Object.values(ctx.match.players).filter((u) => !u.summon && !u.duoOf && sideOf(u) === side).map((u) => u.name);
  return list.join(" & ") || "?";
}

// ============================================================ เสายึดพื้นที่ (ร่ายพิธี 2 ตา)
const nextTo = (ctx, p, pl) => !!(p && p.pos) && ctx.Board.dist(ctx.action.boxOf(p), { x: pl.x, y: pl.y }) === 1;
function pillarNear(ctx, s, p) { return s.pillars.find((pl) => nextTo(ctx, p, pl)) || null; }
function breakChannel(ctx, pl) {
  const by = ctx.match.players[pl.ch.by];
  ctx.fx("seize_break", { id: pl.id, x: pl.x, y: pl.y, by: pl.ch.by });
  if (by) ctx.log(`💢 พิธียึดเสาของ ${by.name} แตก!`);
  pl.ch = null;
}
// พิธีแตก: คนร่ายตาย/ออกจากกระดาน/ไม่ติดเสาแล้ว/โดนดาเมจ (เลือด+เกราะลด)
function checkChannels(ctx, s) {
  for (const pl of s.pillars) {
    if (!pl.ch) continue;
    const p = ctx.match.players[pl.ch.by];
    if (!p || !p.alive || !p.pos || !nextTo(ctx, p, pl)) { breakChannel(ctx, pl); continue; }
    const now = markOf(p);
    if (now < pl.ch.mark) breakChannel(ctx, pl);
    else pl.ch.mark = now;
  }
}
function seizeState(ctx, s, p) {
  const pl = pillarNear(ctx, s, p);
  if (!pl) return null;
  const side = sideOf(p);
  if (pl.owner === side) return { pl, ok: false };
  if (pl.ch && pl.ch.by !== p.id) return { pl, ok: false };
  if (pl.ch && pl.ch.round >= ctx.match.roundNumber) return { pl, ok: false }; // ครั้งที่สองได้ตั้งแต่ตาถัดไป
  return { pl, ok: canStrike(ctx, p), second: !!pl.ch };
}
const ZONE_NAMES = { insomnia: "Insomnia", hammerhead: "Hammerhead", duscae: "Duscae", lake: "Cleigne", altissia: "Altissia" };
function seize(ctx, s, p) {
  checkChannels(ctx, s);
  const st0 = seizeState(ctx, s, p);
  if (!st0 || !st0.ok) return false;
  const pl = st0.pl;
  ctx.match.action.locked = true;
  if (!st0.second) {
    pl.ch = { by: p.id, side: sideOf(p), round: ctx.match.roundNumber, mark: markOf(p) };
    ctx.fx("seize_start", { id: pl.id, x: pl.x, y: pl.y, by: p.id, color: sideColor(ctx, sideOf(p)) });
    ctx.log(`🔷 ${p.name} เริ่มร่ายพิธียึดเสา ${ZONE_NAMES[pl.zone] || ""}`);
  } else {
    const was = pl.owner;
    pl.owner = pl.ch.side; pl.ch = null;
    ctx.fx("seize_done", { id: pl.id, x: pl.x, y: pl.y, by: p.id, from: was, color: sideColor(ctx, pl.owner) });
    ctx.log(`🔷 ${p.name} ยึดเสา ${ZONE_NAMES[pl.zone] || ""} ได้!`);
  }
  ctx.useStrike(p, SEIZE_SECS);
  return true;
}
// จบเทิร์น: ทุกฝ่ายได้แต้มตามจำนวนเสาที่ถือ → ถึง 20 = ชนะ (มากสุด · เท่ากัน = ถือเสามากกว่า)
function scoreRound(ctx, s) {
  const held = {};
  for (const pl of s.pillars) if (pl.owner) held[pl.owner] = (held[pl.owner] || 0) + 1;
  const gains = [];
  for (const [side, n] of Object.entries(held)) {
    const add = SCORE_TABLE[Math.min(n, SCORE_TABLE.length - 1)];
    s.scores[side] = (s.scores[side] || 0) + add;
    gains.push({ side, add, total: s.scores[side], color: sideColor(ctx, side) });
  }
  if (gains.length) ctx.fx("score", { gains });
  const top = Object.entries(s.scores).filter(([, v]) => v >= SCORE_GOAL)
    .sort((a, b) => b[1] - a[1] || (held[b[0]] || 0) - (held[a[0]] || 0));
  if (top.length && !s.winner) {
    s.winner = top[0][0];
    ctx.log(`🏆 ${sideName(ctx, s.winner)} ได้ครบ ${SCORE_GOAL} แต้ม!`);
  }
}
// ผู้ชนะ → id ผู้เล่นของฝ่ายนั้น (phases/endTurn.js gameOver → forcedWinnerId)
function winner(ctx, st) {
  const s = st && st.eos;
  if (!s || !s.winner) return null;
  const p = Object.values(ctx.match.players).find((u) => !u.summon && !u.duoOf && sideOf(u) === s.winner);
  return p ? p.id : null;
}

// ============================================================ ตายแล้วฟื้น (หลัง 3 เทิร์น — จุดเกิดที่ไกลศัตรูสุด)
function noteDeaths(ctx, s) {
  for (const p of Object.values(ctx.match.players)) {
    if (p.summon || p.alive) { delete s.dead[p.id]; continue; }
    if (s.dead[p.id] == null) {
      s.dead[p.id] = ctx.match.roundNumber;
      ctx.log(`🕯️ ${p.name} ล้มลง — ฟื้นในอีก ${REVIVE_TURNS} เทิร์น`);
    }
  }
}
function reviveSpot(ctx, s, p) {
  const map = ctx.map(), side = sideOf(p);
  const foes = bodies(ctx).filter((u) => sideOf(u) !== side);
  const list = (map.spawns || []).map((sp) => ({ x: sp.x, y: sp.y, d: foes.length ? Math.min(...foes.map((u) => manhattan(u.pos, sp))) : 0 }))
    .sort((a, b) => b.d - a.d);
  for (const sp of list) {
    const spot = tileFree(ctx, s, sp.x, sp.y, p.id) ? { x: sp.x, y: sp.y } : freeNear(ctx, s, sp.x, sp.y, 3, p.id);
    if (spot) return spot;
  }
  return null;
}
function reviveDue(ctx, s) {
  const turn = ctx.match.roundNumber + 1, back = [];
  for (const [pid, r] of Object.entries(s.dead)) {
    const p = ctx.match.players[pid];
    if (!p || p.alive || p.summon || turn < r + REVIVE_TURNS) continue;
    const spot = reviveSpot(ctx, s, p);
    if (!spot) continue;
    p.alive = true; p.result = null; p.locked = false;
    p.statuses = {}; p.statusAmt = {};
    p.shield = 0; p.tempHp = 0; p.tempHpTurns = 0; p.mountId = null; p.wasAttacked = false; p.corpseKeeper = null;
    p.corpse = null;
    p.boardSize = 1;
    p.hp = ctx.combat.maxHpOf(p);
    p.armor = ctx.combat.maxArmorOf(p);
    p.pos = spot;
    delete s.dead[pid];
    back.push({ id: p.id, x: spot.x, y: spot.y });
    ctx.log(`✨ ${p.name} ฟื้นคืนชีพ!`);
  }
  if (back.length) { ctx.bump(); ctx.fx("revive", { list: back }); }
  return back.length;
}

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
  const me = ctx.match.players[viewer.id] || viewer, side = sideOf(me);
  const eyes = bodies(ctx).filter((u) => u.id === me.id || sideOf(u) === side);
  if (!eyes.length) return null; // ล้มอยู่ = ดูได้ทั้งแผนที่
  const map = ctx.map(), set = new Set();
  for (const u of eyes) { const v = sightOf(ctx, map, u); if (v) for (const k of v) set.add(k); }
  return set;
}

// ============================================================ ต้นเทิร์น / จบตา / จบเทิร์น
function preRound(ctx, st) {
  const s = st && st.eos;
  if (!s) return 0;
  checkRiders(ctx, s);
  checkChannels(ctx, s);
  noteDeaths(ctx, s);
  const turn = ctx.match.roundNumber + 1;
  let secs = 0;
  if (reviveDue(ctx, s)) secs = Math.max(secs, SECS.revive);
  if (s.warn && s.warnFor <= turn) secs = Math.max(secs, strike(ctx, s));
  if (stormOn(ctx) && !s.warn) setWarn(ctx, s, turn + 1);
  const night = nightAt(ctx, turn);
  if (night && !s.night) secs = Math.max(secs, spawnDaemons(ctx, s) ? SECS.daemonSpawn : 0);
  else if (night && s.daemons.length) secs = Math.max(secs, actDaemons(ctx, s) ? SECS.daemonAct : 0);
  else if (!night && s.night) secs = Math.max(secs, dissolveDaemons(ctx, s) ? SECS.dawn : 0);
  s.night = night;
  checkRiders(ctx, s); // ปีศาจ/ฟ้าผ่าตีคนขี่ = ตกนก
  respawnChocos(ctx, s);
  return secs;
}
function onUnitEnd(ctx, st, p) {
  const s = st && st.eos;
  if (!s) return;
  checkRiders(ctx, s);
  checkChannels(ctx, s);
  noteDeaths(ctx, s);
  if (!p || !p.alive || !p.pos || riding(s, p) || !canRide(ctx, p)) return;
  const c = chocoAt(s, p.pos.x, p.pos.y);
  if (c) mount(ctx, s, p, c);
}
function onEndTurn(ctx, st) {
  const s = st && st.eos;
  if (!s) return;
  checkRiders(ctx, s);
  checkChannels(ctx, s);
  noteDeaths(ctx, s);
  scoreRound(ctx, s);
}

// ============================================================ ปุ่ม HUD
function canMove(ctx, p) {
  const a = ctx.match.action;
  return ctx.action.canAct(p) && !!a && !a.locked;
}
function canStrike(ctx, p) {
  const a = ctx.match.action;
  return ctx.action.canAct(p) && !!a && !a.noStrike && !p.didAttackRound;
}
function hudActions(ctx, st, p) {
  const s = st && st.eos;
  if (!s || !p || !p.pos) return [];
  const out = [];
  const car = carOf(ctx, s, p);
  if (car) {
    const list = canMove(ctx, p) ? carTargets(ctx, s, car) : [];
    out.push({ key: "fd:drive", icon: "🚗", name: "ขับ", disabled: !list.length, tiles: list.map(pickOf) });
  }
  const sz = seizeState(ctx, s, p);
  if (sz) out.push({ key: "fd:seize", icon: "🔷", name: sz.pl.ch && sz.pl.ch.by === p.id ? "ยึด 2/2" : "ยึด", disabled: !sz.ok });
  if (riding(s, p)) {
    const tiles = ctx.action.canAct(p) ? dismountTiles(ctx, s, p) : [];
    out.push({ key: "fd:dismount", icon: "🐤", name: "ลง", disabled: !tiles.length, tiles });
  }
  return out;
}
function charAction(ctx, st, p, key, tile) {
  const s = st && st.eos;
  if (!s || !p || !p.pos) return false;
  if (key === "fd:drive") return drive(ctx, s, p, tile);
  if (key === "fd:seize") return seize(ctx, s, p);
  if (key === "fd:dismount") {
    if (!riding(s, p) || !ctx.action.canAct(p) || !tile) return false;
    if (!dismountTiles(ctx, s, p).some((t) => t.x === tile.x && t.y === tile.y)) return false;
    const c = unride(ctx, s, p.id);
    if (!c) return false;
    c.rider = null; c.x = tile.x; c.y = tile.y;
    ctx.bump();
    ctx.fx("choco_dismount", { id: p.id, choco: c.id, x: tile.x, y: tile.y });
    ctx.log(`🐤 ${p.name} ลงจากช็อโก้`);
    return true;
  }
  return false;
}

// ============================================================ ของที่ตีได้ (ปีศาจ)
function objects(ctx, st) {
  const s = st && st.eos;
  if (!s) return [];
  return s.daemons.map((d) => ({ id: d.id, x: d.x, y: d.y, kind: "daemon", name: "ปีศาจ", hp: d.hp, maxHp: DAEMON_HP, armor: d.armor, look: d.kind, strike: true }));
}
function strikeObject(ctx, st, p, objId) {
  const s = st && st.eos;
  const d = s && s.daemons.find((o) => o.id === objId);
  if (!d) return false;
  ctx.fx("daemon_struck", { id: d.id, x: d.x, y: d.y, by: p.id });
  hurtDaemon(ctx, s, d, strikeDmg(p), p);
  return 1.1;
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
  if (target.id === me.id || sideOf(target) === sideOf(me)) return false; // ฝ่ายเดียวกันเห็นกันเสมอ
  const foot = footOf(ctx, target);
  const fog = sideVision(ctx, st, viewer);
  if (fog && !foot.some((t) => fog.has(K(t.x, t.y)))) return true;
  const sight = sideSight(ctx, viewer);
  return !!sight && !foot.some((t) => sight.has(K(t.x, t.y)));
}

// ============================================================ ข้อมูลให้ client
function publicInfo(ctx, st) {
  const s = st && st.eos;
  if (!s) return {};
  const riders = {};
  for (const [pid, r] of Object.entries(s.riders)) riders[pid] = r.choco;
  return {
    eos: true,
    night: !!s.night,
    cars: s.cars.map((c) => ({ id: c.id, img: c.img, x: c.x, y: c.y, size: S })),
    chocos: s.chocos.map((c) => ({ id: c.id, x: c.x, y: c.y, rider: c.rider, home: { ...c.home } })),
    riders,
    daemons: s.daemons.map((d) => ({ id: d.id, x: d.x, y: d.y, hp: d.hp, maxHp: DAEMON_HP, armor: d.armor, kind: d.kind })),
    warn: (s.warn || []).map((t) => ({ x: t.x, y: t.y, kind: "lightning" })),
    pillars: s.pillars.map((pl) => ({
      id: pl.id, zone: pl.zone, x: pl.x, y: pl.y, owner: pl.owner, color: pl.owner ? sideColor(ctx, pl.owner) : null,
      ch: pl.ch ? { by: pl.ch.by, color: sideColor(ctx, pl.ch.side), round: pl.ch.round } : null,
    })),
    goal: SCORE_GOAL,
    scores: scoreList(ctx, s),
    revive: Object.entries(s.dead).map(([id, r]) => ({ id, at: r + REVIVE_TURNS })),
  };
}
function scoreList(ctx, s) {
  const sides = new Set(Object.keys(s.scores));
  for (const pl of s.pillars) if (pl.owner) sides.add(pl.owner);
  return [...sides].map((side) => ({
    side, score: s.scores[side] || 0, held: s.pillars.filter((pl) => pl.owner === side).length, color: sideColor(ctx, side), name: sideName(ctx, side),
  })).sort((a, b) => b.score - a.score);
}
function playerInfo(ctx, st, p) {
  const s = st && st.eos;
  if (!s || !riding(s, p)) return undefined;
  return { choco: true, badges: [{ key: "choco", icon: "🐤", label: "ช็อโก้", cls: "bg-yellow-300 text-gray-900" }] };
}

module.exports = {
  enter, weatherStart, layer, layerVer, movMod, flatWalk, preRound, onUnitEnd, onEndTurn,
  hudActions, charAction, objects, strikeObject, vision, hides, publicInfo, playerInfo, winner,
  // เทสต์
  sideOf, scoreRound, reviveDue, noteDeaths, sideSight, seizeState, checkChannels, SCORE_GOAL, SCORE_TABLE, REVIVE_TURNS, SIGHT_EXTRA,
  carCells, carTargets, carOf, canRide, checkRiders, spawnDaemons, actDaemons, dissolveDaemons, hurtDaemon, inTown, zoneAt, ROAD,
  MOV_BONUS, CHOCO_MOV, CHOCO_RESPAWN, CAR_RANGE, CAR_HIT_DMG, DAEMON_COUNT, DAEMON_HP, DAEMON_ARMOR, DAEMON_ATK, DAEMON_MOV, DAEMON_GOLD,
  LIGHTNING_COUNT, LIGHTNING_DMG,
};
