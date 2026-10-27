// ============================================================
//  ด่าน IV เทือกเขาฟาร์กัส (Fodlan · GRID_PLAN §8.5) — ผัง server/fodlan/map4.js · ภาพ client/src/board/fodlan/stage4.js
//
//  กองไฟ (ผู้ใช้): สุ่มที่ตั้ง 2 กองทุกครั้งที่เข้าด่าน (ช่องพื้นโล่ง รอบตัว 8 ช่องไม่มีสิ่งกีดขวาง/ช่องพิเศษ/จุดเกิด/จุดร้านค้า · ไม่อยู่ในแนวหิมะถล่ม · ห่างกัน ≥ 5)
//   = สิ่งกีดขวาง (ชั้นของด่าน: fd_campfire ลุก · fd_campfire_out ดับ · fd_campfire_small กองไฟเล็ก)
//  ความอบอุ่น (ผู้ใช้): เข้าด่าน = 3 ทุกคน · จบเทิร์น อยู่ในระยะ 3 ช่องจากกองไฟที่ลุก (นับแบบการเดิน — สิ่งกีดขวางกั้น คนไม่กั้น) = +1 (เต็ม 3)
//   ไม่อยู่ = −1 · เหลือ 0 = น้ำแข็งกัด: เสียหาย 1 (ลดเกราะก่อน) ทุกเทิร์น + โอกาสสตั้น 40% ทุกครั้งที่โดน
//   ติดลุกไหม้ = อุ่นเหมือนอยู่ใกล้กองไฟ (ผู้ใช้) · ไฟของตัวละครนับเป็นกองไฟ (ผู้ใช้): โซระร่าง Fire Frame · กองไฟของดิเอโก้ (match.board.diego.fire)
//    → ช่องในระยะ 3 ช่องจากตัว/ช่องไฟนั้นอุ่นด้วย (Claude)
//  ฟืน: ตีต้นไม้แห้ง = ฟืน 1 (พกได้ 2) · ปุ่ม "เติมฟืน" (ติดกองไฟที่ดับ · 1 ฟืน) = จุดติดทันทีแม้พายุหิมะ
//   ปุ่ม "ก่อกองไฟ" (ฟืน 2 · ช่องว่างติดตัว) = กองไฟเล็ก 3 เทิร์น ระยะอบอุ่น 2 · ทั้งสองปุ่มใช้การตีของตานั้น
//  หิมะถล่ม: ตีกองหิมะ = หิมะถล่มเป็นแนวกว้าง 1 ยาว 5 ช่อง ทิศออกจากหน้าผา (ชนสิ่งกีดขวางหยุด) · ทุกคนในแนว (ไม่นับผู้ตี/เพื่อนร่วมทีม)
//   เสียหาย 2 + ถูกผลัก 2 ช่องตามแนว · กองหิมะหายไปจนจบการมาเยือนครั้งนี้
//  พายุหิมะ (สภาพอากาศของด่าน · 3 เทิร์นตั้งแต่เข้าด่าน): กองไฟใหญ่ดับตลอดพายุ (เติมฟืนจุดได้) · พายุสงบ = กองไฟที่ดับกลับมาลุก
//
//  Claude ตัดสินเอง: น้ำแข็งกัดลงตั้งแต่จบเทิร์นที่ความอบอุ่นลดถึง 0 · ยูนิตที่ถูกเรียก (summon) ไม่มีความอบอุ่น
//   · ฟืนเต็มแล้วตีต้นไม้ได้แต่ไม่ได้ฟืนเพิ่ม · ต้นไม้แห้งไม่หมด · กองไฟเล็กไม่ดับเพราะพายุ · ฟืน/ความอบอุ่นนับใหม่ทุกการมาเยือน
// ============================================================
const Ice = require("../ice");

const WARM_MAX = 3;
const FIRE_RANGE = 3;       // กองไฟใหญ่ (ผู้ใช้)
const SMALL_RANGE = 2;      // กองไฟเล็กจากฟืน
const SMALL_TURNS = 3;
const CHAR_FIRE_RANGE = 3;  // ไฟของตัวละคร (Claude)
const STUN_PCT = 40;
const FROST_DMG = 1;
const LOG_MAX = 2;
const BUILD_LOGS = 2;
const AVA_LEN = 5;
const AVA_DMG = 2;
const AVA_PUSH = 2;
const FIRES = 2;
const FIRE_GAP = 5;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const NAMES = { fd_deadwood: "ต้นไม้แห้ง", fd_snowpile: "กองหิมะ" };

module.exports = {
  enter, layer, onEndTurn, hudActions, charAction, objects, strikeObject, publicInfo, playerInfo,
  // เทสต์
  WARM_MAX, FIRE_RANGE, SMALL_RANGE, SMALL_TURNS, STUN_PCT, AVA_LEN, AVA_DMG, AVA_PUSH, warmTiles, isWarm, avalancheLine,
};

const blizzard = (ctx) => !!(ctx.weather && ctx.weather.kind === "blizzard" && ctx.weather.left > 0);
const parse = (k) => k.split(",").map(Number);
const isSummon = (p) => !!(p && p.summon);
const logsOf = (st, p) => (st.logs && st.logs[p.id]) || 0;
function warmthOf(st, p) {
  const w = st.warmth && st.warmth[p.id];
  return typeof w === "number" ? w : WARM_MAX;
}

// ---------- เข้าด่าน: กองไฟ 2 กองสุ่มที่ตั้ง ----------
function enter(ctx, st) {
  st.warmth = {};
  st.logs = {};
  st.usedPiles = [];
  st.fires = [];
  st.fireSeq = 0;
  const lit = !blizzard(ctx);
  for (const t of pickFireSpots(ctx, FIRES)) st.fires.push({ id: ++st.fireSeq, x: t.x, y: t.y, lit, small: false });
  if (!lit) ctx.log("🌨️ พายุหิมะโหมกระหน่ำ — กองไฟดับหมด!");
  ctx.bump();
}
// ช่องตั้งกองไฟ: พื้นโล่ง · รอบ 8 ช่องไม่มีสิ่งกีดขวาง/ช่องพิเศษ/จุดเกิด/จุดร้านค้า (กองไฟไม่ปิดทางเดิน/ทางเข้าน้ำแข็ง) · ไม่อยู่ในแนวหิมะถล่ม · ไม่มีคนยืน
function pickFireSpots(ctx, n) {
  const map = ctx.map();
  const B = ctx.Board;
  const near = new Set();
  for (const s of [...map.spawns, ...map.shopSpots]) near.add(B.key(s.x, s.y));
  const lanes = new Set();
  for (const [k, kind] of Object.entries(map.terrain)) {
    if (kind !== "fd_snowpile") continue;
    const [x, y] = parse(k);
    for (const t of avalancheLine(map, B, x, y).tiles) lanes.add(B.key(t.x, t.y));
  }
  const units = ctx.units();
  const ok = [];
  for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) {
    const k = B.key(x, y);
    if (B.isObstacle(map, x, y) || B.specialAt(map, x, y) || B.isHeal(map, x, y) || lanes.has(k) || B.unitAt(units, x, y)) continue;
    let clear = true;
    for (let dy = -1; dy <= 1 && clear; dy++) for (let dx = -1; dx <= 1 && clear; dx++) {
      const nx = x + dx, ny = y + dy;
      if (!B.inBounds(map, nx, ny)) { clear = false; break; }
      if (map.terrain[B.key(nx, ny)] || B.specialAt(map, nx, ny) || near.has(B.key(nx, ny))) clear = false;
    }
    if (clear) ok.push({ x, y });
  }
  const out = [];
  for (const t of ctx.pick(ok, ok.length)) {
    if (out.every((o) => Math.abs(o.x - t.x) + Math.abs(o.y - t.y) >= FIRE_GAP)) out.push(t);
    if (out.length >= n) break;
  }
  return out;
}

// ---------- ชั้นแผนที่: กองไฟ (สิ่งกีดขวาง) · กองหิมะที่ถล่มไปแล้วหาย ----------
function layer(ctx, st, map) {
  if (!st.fires && !(st.usedPiles && st.usedPiles.length)) return map;
  const terrain = { ...map.terrain };
  for (const k of st.usedPiles || []) delete terrain[k];
  for (const f of st.fires || []) terrain[ctx.key(f.x, f.y)] = f.small ? "fd_campfire_small" : f.lit ? "fd_campfire" : "fd_campfire_out";
  return { ...map, terrain };
}

// ---------- ความอบอุ่น ----------
// ช่องที่ห่างจากต้นทาง (ระยะ ≤ r แต่ละแหล่ง) นับแบบการเดิน 4 ทิศ — สิ่งกีดขวางกั้น คนไม่กั้น
//  sources = [{ x, y, r }] · ต้นทางที่เป็นสิ่งกีดขวาง (กองไฟ) ไม่นับตัวเอง แต่กระจายออกจากมันได้
function spread(map, B, sources) {
  const best = new Map(); // key → ระยะที่เหลือมากสุด
  const q = [];
  for (const s of sources) {
    const k = B.key(s.x, s.y);
    if (!B.inBounds(map, s.x, s.y)) continue;
    const start = { x: s.x, y: s.y, left: s.r, src: B.isObstacle(map, s.x, s.y) };
    if (!start.src) best.set(k, Math.max(best.get(k) ?? -1, s.r));
    q.push(start);
  }
  while (q.length) {
    const c = q.shift();
    if (c.left <= 0) continue;
    for (const [dx, dy] of DIRS) {
      const nx = c.x + dx, ny = c.y + dy, k = B.key(nx, ny);
      if (B.isObstacle(map, nx, ny)) continue;
      const left = c.left - 1;
      if ((best.get(k) ?? -1) >= left) continue;
      best.set(k, left);
      q.push({ x: nx, y: ny, left });
    }
  }
  return new Set(best.keys());
}
// แหล่งไฟของตัวละคร: โซระร่าง Fire Frame (ตัว) · กองไฟของดิเอโก้ (ช่อง)
function charFires(ctx) {
  const out = [];
  for (const p of ctx.alive()) {
    if (p.characterId === "sora_otosumi" && p.sora && p.sora.myth && p.sora.fire) out.push({ x: p.pos.x, y: p.pos.y, r: CHAR_FIRE_RANGE });
  }
  const L = ctx.match.board && ctx.match.board.diego;
  if (L && L.fire) for (const k of Object.keys(L.fire)) { const [x, y] = parse(k); out.push({ x, y, r: CHAR_FIRE_RANGE }); }
  return out;
}
function fireSources(st) {
  return (st.fires || []).filter((f) => f.lit).map((f) => ({ x: f.x, y: f.y, r: f.small ? SMALL_RANGE : FIRE_RANGE }));
}
// ช่องอุ่นทั้งหมดตอนนี้ (กองไฟที่ลุก + ไฟของตัวละคร)
function warmTiles(ctx, st) {
  return spread(ctx.map(), ctx.Board, [...fireSources(st), ...charFires(ctx)]);
}
function isWarm(ctx, st, p, warm = warmTiles(ctx, st)) {
  if (!p || !p.pos) return false;
  if (((p.statuses && p.statuses.hburn) || 0) > 0) return true; // ลุกไหม้ = อุ่น (ผู้ใช้)
  return ctx.Board.footprint(p.pos.x, p.pos.y, ctx.action.sizeOf(p)).some((c) => warm.has(ctx.key(c.x, c.y)));
}

// ---------- จบเทิร์น: ความอบอุ่น → น้ำแข็งกัด · กองไฟเล็กนับเวลา · พายุสงบ = กองไฟกลับมาลุก ----------
function onEndTurn(ctx, st) {
  const warm = warmTiles(ctx, st);
  st.warmth ||= {};
  const cold = [], frozen = [];
  for (const p of ctx.alive()) {
    if (isSummon(p)) continue;
    const before = warmthOf(st, p);
    const now = isWarm(ctx, st, p, warm) ? Math.min(WARM_MAX, before + 1) : Math.max(0, before - 1);
    st.warmth[p.id] = now;
    if (now > before && before === 0) ctx.log(`🔥 ${p.name} ได้ไออุ่น — หายจากน้ำแข็งกัด (ความอบอุ่น ${now}/${WARM_MAX})`);
    else if (now < before) cold.push(`${p.name} ${now}/${WARM_MAX}`);
    if (now <= 0) frozen.push(p);
  }
  if (cold.length) ctx.log(`❄️ ความหนาวกัดกิน — ความอบอุ่น ${cold.join(" · ")}`);
  for (const p of frozen) {
    if (!p.alive || !p.pos) continue;
    // น้ำแข็งกัด
    const at = { x: p.pos.x, y: p.pos.y };
    const dealt = ctx.damage(p, FROST_DMG);
    ctx.log(`🥶 ${p.name} ถูกน้ำแข็งกัด — เสียหาย -${dealt} (ลดเกราะก่อน)`);
    let stun = false;
    if (p.alive && ctx.rng() * 100 < STUN_PCT) {
      if (ctx.Status.applyDebuff(p, "stun", null, 1)) { stun = true; ctx.log(`🧊 ${p.name} หนาวจนตัวแข็ง — ติดสตั้น 1 เทิร์น`); }
      else ctx.log(`🧊 ${p.name} ต้านความหนาวไว้ได้ (ต้านสถานะผิดปกติ)`);
    }
    ctx.fx("frostbite", { id: p.id, x: at.x, y: at.y, size: ctx.action.sizeOf(p), stun });
  }
  // กองไฟเล็กมอดลง
  let changed = false;
  for (const f of [...(st.fires || [])]) {
    if (!f.small) continue;
    f.left -= 1;
    if (f.left > 0) continue;
    st.fires.splice(st.fires.indexOf(f), 1);
    ctx.fx("fireout", { x: f.x, y: f.y, small: true });
    ctx.log("🪵 กองไฟเล็กมอดดับลงแล้ว");
    changed = true;
  }
  // พายุหิมะเทิร์นสุดท้าย (fodlan.js นับลงหลังฮุคนี้) → กองไฟที่ดับกลับมาลุก
  if (blizzard(ctx) && ctx.weather.left <= 1) {
    const out = (st.fires || []).filter((f) => !f.lit);
    for (const f of out) { f.lit = true; ctx.fx("ignite", { x: f.x, y: f.y }); }
    if (out.length) ctx.log("🔥 พายุหิมะสงบ — กองไฟกลับมาลุกโชน");
    if (out.length) changed = true;
  }
  if (changed) ctx.bump();
}

// ---------- ปุ่ม HUD: เติมฟืน · ก่อกองไฟ ----------
function canUseStrike(ctx, p) {
  return ctx.action.canAct(p) && !(ctx.match.action && ctx.match.action.noStrike);
}
function adjacentOut(ctx, st, p) {
  return (st.fires || []).filter((f) => !f.lit && ctx.adjacent(p, f.x, f.y));
}
function buildTiles(ctx, p) {
  const map = ctx.map(), B = ctx.Board, shop = ctx.match.shopPos;
  const out = [];
  for (const c of B.footprint(p.pos.x, p.pos.y, ctx.action.sizeOf(p))) {
    for (const [dx, dy] of DIRS) {
      const x = c.x + dx, y = c.y + dy;
      if (!ctx.adjacent(p, x, y) || out.some((t) => t.x === x && t.y === y)) continue;
      if (B.specialAt(map, x, y) || B.isHeal(map, x, y) || (shop && shop.x === x && shop.y === y)) continue;
      if (!ctx.free(x, y)) continue;
      out.push({ x, y });
    }
  }
  return out;
}
function hudActions(ctx, st, p) {
  if (isSummon(p)) return [];
  const can = canUseStrike(ctx, p);
  const logs = logsOf(st, p);
  const list = [];
  const out = adjacentOut(ctx, st, p);
  if (out.length) {
    const ok = can && logs >= 1;
    list.push({ key: "fd:refuel", icon: "🪵", name: "เติมฟืน", disabled: !ok, tiles: ok ? out.map((f) => ({ x: f.x, y: f.y })) : [] });
  }
  if (logs >= BUILD_LOGS) {
    const tiles = can ? buildTiles(ctx, p) : [];
    list.push({ key: "fd:build", icon: "🔥", name: "ก่อกองไฟ", disabled: !tiles.length, tiles });
  }
  return list;
}
function charAction(ctx, st, p, key, tile) {
  if (isSummon(p) || !canUseStrike(ctx, p) || !tile || !Number.isFinite(tile.x) || !Number.isFinite(tile.y)) return false;
  st.logs ||= {};
  if (key === "fd:refuel") {
    const f = adjacentOut(ctx, st, p).find((o) => o.x === tile.x && o.y === tile.y);
    if (!f || logsOf(st, p) < 1) return false;
    st.logs[p.id] = logsOf(st, p) - 1;
    f.lit = true;
    ctx.bump();
    ctx.fx("ignite", { x: f.x, y: f.y, id: p.id });
    ctx.log(`🔥 ${p.name} เติมฟืน — กองไฟกลับมาลุก${blizzard(ctx) ? "ท่ามกลางพายุหิมะ" : ""}`);
    return ctx.useStrike(p, 1);
  }
  if (key === "fd:build") {
    if (logsOf(st, p) < BUILD_LOGS || !buildTiles(ctx, p).some((t) => t.x === tile.x && t.y === tile.y)) return false;
    st.logs[p.id] = logsOf(st, p) - BUILD_LOGS;
    (st.fires ||= []).push({ id: ++st.fireSeq, x: tile.x, y: tile.y, lit: true, small: true, left: SMALL_TURNS });
    ctx.bump();
    ctx.fx("ignite", { x: tile.x, y: tile.y, id: p.id, small: true });
    ctx.log(`🔥 ${p.name} ก่อกองไฟเล็ก (${SMALL_TURNS} เทิร์น)`);
    return ctx.useStrike(p, 1);
  }
  return false;
}

// ---------- ของที่ตีได้: ต้นไม้แห้ง (ฟืน) · กองหิมะ (หิมะถล่ม) ----------
function objects(ctx) {
  const out = [];
  for (const [k, kind] of Object.entries(ctx.map().terrain)) {
    if (!NAMES[kind]) continue;
    const [x, y] = parse(k);
    out.push({ id: `fd:${kind === "fd_deadwood" ? "tree" : "pile"}:${k}`, x, y, kind, name: NAMES[kind], strike: true });
  }
  return out;
}
// แนวหิมะถล่มจากกองหิมะ (x, y): ทิศออกจากหน้าผาที่ติดกอง · ไม่ติดหน้าผา = ออกจากผู้ตี (from) · ชนสิ่งกีดขวาง/ขอบหยุด
function avalancheLine(map, B, x, y, from = null) {
  let dir = null;
  for (const [dx, dy] of DIRS) if (map.terrain[B.key(x + dx, y + dy)] === "fd_snowcliff") { dir = [-dx || 0, -dy || 0]; break; }
  if (!dir && from) {
    const dx = x - from.x, dy = y - from.y;
    dir = Math.abs(dx) >= Math.abs(dy) ? [Math.sign(dx) || 1, 0] : [0, Math.sign(dy)];
  }
  if (!dir) dir = [0, 1];
  const tiles = [];
  for (let i = 1; i <= AVA_LEN; i++) {
    const tx = x + dir[0] * i, ty = y + dir[1] * i;
    if (!B.inBounds(map, tx, ty) || map.terrain[B.key(tx, ty)]) break;
    tiles.push({ x: tx, y: ty });
  }
  return { dir, tiles };
}
function strikeObject(ctx, st, p, objId) {
  const o = objects(ctx).find((t) => t.id === objId);
  if (!o) return false;
  if (o.kind === "fd_deadwood") {
    st.logs ||= {};
    const had = logsOf(st, p);
    st.logs[p.id] = Math.min(LOG_MAX, had + 1);
    ctx.fx("chop", { x: o.x, y: o.y, id: p.id, got: st.logs[p.id] > had });
    ctx.log(st.logs[p.id] > had ? `🪓 ${p.name} ตัดต้นไม้แห้ง — ได้ฟืน (${st.logs[p.id]}/${LOG_MAX})` : `🪓 ${p.name} ตัดต้นไม้แห้ง — ฟืนเต็มแล้ว (${LOG_MAX}/${LOG_MAX})`);
    return 0.9;
  }
  // หิมะถล่ม
  const B = ctx.Board;
  const line = avalancheLine(ctx.map(), B, o.x, o.y, p.pos);
  (st.usedPiles ||= []).push(B.key(o.x, o.y));
  ctx.bump();
  const set = new Set(line.tiles.map((t) => B.key(t.x, t.y)));
  const along = (u) => Math.max(...B.footprint(u.pos.x, u.pos.y, ctx.action.sizeOf(u)).map((c) => (c.x - o.x) * line.dir[0] + (c.y - o.y) * line.dir[1]));
  const hit = ctx.alive().filter((u) => u.id !== p.id && !ctx.combat.sameTeam(p, u)
    && B.footprint(u.pos.x, u.pos.y, ctx.action.sizeOf(u)).some((c) => set.has(B.key(c.x, c.y))))
    .sort((a, b) => along(b) - along(a)); // ตัวที่อยู่ปลายแนวก่อน — ผลักแล้วไม่ชนกันเอง
  ctx.fx("avalanche", { x: o.x, y: o.y, dx: line.dir[0], dy: line.dir[1], len: line.tiles.length, hit: hit.map((u) => u.id) });
  ctx.log(`🏔️ ${p.name} ตีกองหิมะ — หิมะถล่มลงมา!${hit.length ? "" : " (ไม่โดนใคร)"}`);
  const ictx = Ice.begin();
  for (const u of hit) {
    const dealt = ctx.damage(u, AVA_DMG);
    ctx.log(`🏔️ ${u.name} ถูกหิมะถล่มทับ — เสียหาย -${dealt} (ลดเกราะก่อน)`);
    if (u.alive && u.pos) Ice.pushUnit(u, { x: line.dir[0], y: line.dir[1] }, ictx, AVA_PUSH);
  }
  Ice.flush(ictx);
  return 1.8;
}

// ---------- ข้อมูลให้ client ----------
function publicInfo(ctx, st) {
  const map = ctx.map(), B = ctx.Board;
  return {
    fires: (st.fires || []).map((f) => ({
      id: f.id, x: f.x, y: f.y, lit: !!f.lit, small: !!f.small, left: f.small ? f.left : undefined,
      r: f.small ? SMALL_RANGE : FIRE_RANGE,
      tiles: f.lit ? [...spread(map, B, [{ x: f.x, y: f.y, r: f.small ? SMALL_RANGE : FIRE_RANGE }])] : [],
    })),
  };
}
function playerInfo(ctx, st, p) {
  if (isSummon(p) || !p.alive) return undefined;
  const w = warmthOf(st, p);
  const badges = [{ key: "warmth", icon: "🔥", label: `${w}/${WARM_MAX}`, cls: w >= WARM_MAX ? "bg-orange-300 text-gray-900" : w > 0 ? "bg-amber-200 text-gray-900" : "bg-sky-300 text-gray-900" }];
  if (w <= 0) badges.push({ key: "frost", icon: "🥶", label: "น้ำแข็งกัด", cls: "bg-sky-200 text-gray-900" });
  const logs = logsOf(st, p);
  if (logs > 0) badges.push({ key: "logs", icon: "🪵", label: `${logs}/${LOG_MAX}`, cls: "bg-amber-700 text-white" });
  return { warmth: w, logs, badges };
}
