// ============================================================
//  เรือ Nautilus — จอดทุกชั้นของโหมด Nautilus (GRID_PLAN §8.9 "เรือ Nautilus" · ขั้น 3) · ฝั่ง server
//  ไม่ใช่ด่าน: ตัวคุม server/fodlan.js เรียกผ่าน server/fodlan/nautilus.js · ที่จอด = DOCK ของ server/fodlan/mapN.js (มุมบนซ้าย + w × h)
//
//   ตัวเรือ = สิ่งกีดขวาง "fd_nt_ship" (ชั้นแผนที่) + ร้านค้าของโหมด (match.shops kind "nautilus" building: true — client ไม่วาดแผงร้าน)
//     ยืนติดเรือ = ปุ่มร้านค้าเดิมขึ้นเอง (shop.nearShopOf) · ของ = ร้านปกติทุกอย่าง + ถังออกซิเจนสำรอง (shop.syncStageItems)
//   ปุ่ม HUD เมื่อยืนติดเรือ (key "fd:nt:*") — ทุกปุ่มใช้แทนการตีของตานี้ (ctx.useStrike แบบคันโยก/เครื่องยิงหินของ Fodlan):
//     เติมออกซิเจน = เต็มถัง · ตอร์ปิโด = คนละ 1 ลูกต่อชั้น แนวตรงจากเรือ โดนตัวแรก 3 / ทาลัสซา 8
//     ~~หัวเจาะ~~ ถอดออก (ผู้ใช้ 2026-11-19: "เอาเจาะออก มันไร้ประโยชน์มาก")
//     ขับเรือ (ผู้ใช้ 2026-11-19 "อยากให้เคลื่อนย้ายเรือดำน้ำได้ เคลื่อนที่ไปพร้อมคนกด"): ยืนติดเรือ + ยังเดินได้ → กด "ขับเรือ" ขึ้นไปยืนบนหอบังคับการ
//       แล่นเรือ = ใช้การเดินของตา เลือกตำแหน่งใหม่ในระยะเดินพื้นฐานของคนขับ (ก้าว 4 ทิศ) · ลอยข้ามภูมิประเทศทุกอย่าง ติดแค่ลำตัวทาลัสซา/ขอบกระดาน
//       คนที่อยู่ในทางที่เรือกวาดผ่าน: ศัตรูโดน 2 (หลบได้) · ทุกคนถูกเบียดออกจากตัวเรือ · ปุ่มเรือ/ร้านใช้ได้จากบนเรือ · "ลงเรือ" = ลงช่องติดเรือ (จบการเดินของตา)
//       เปลี่ยนชั้น = เรือกลับท่าจอดของชั้นใหม่ · คนขับหลุดจากเรือ (ตาย/ถูกผลักออก) = เลิกขับ
//     ไฟฉาย = หมุนไปทิศที่เลือก (ค้างจนเปลี่ยนชั้น) · ชั้นมืดในลำแสงทุกคนมองเห็น (server/fodlan.js vision/hides) · ส่องโดนทาลัสซา = ชะงัก 1 ท่า · คูลดาวน์ 2
//     ออร์แกน = ทาลัสซาอยู่: สงบ 1 เทิร์น (ท่าที่เตือนไว้ยกเลิก + ไม่ว่าย) · ไม่อยู่: คุ้มครอง 1 (1 เทิร์น) ให้คนเล่น + เพื่อนร่วมทีม · คูลดาวน์ 4
//   ตัวเรือบังพุ่งทะลวง/เพลงวาฬ: ยืนติดเรือ = ไม่โดน (shelters — thalassa.js)
//  [Claude] ตัวเลข/ทิศ/ความกว้างลำแสง/ใช้แทนการตี = ข้อเสนอ ยังไม่ได้ถามผู้ใช้ · ดาเมจลดเกราะก่อน · หลบได้ (skillDodge)
// ============================================================
const DOCK_DEFAULT = { x: 7, y: 0, w: 6, h: 2 };
const TORPEDO_DMG = 3, TORPEDO_WHALE = 8;
const SAIL_HIT = 2;
const LIGHT_CD = 2, LIGHT_W = 4;
const ORGAN_CD = 4, ORGAN_GUARD = 1, ORGAN_TURNS = 1;
const SECS = { refill: 1.6, torpedo: 2.6, light: 1.6, organ: 3 };
const SHOP_KIND = "nautilus";
const DARK_FROM = 9; // ชั้น 3–5 (ด่าน 9–11) = ชั้นมืด
const K = (x, y) => `${x},${y}`;
const DIRV = { left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, down: { x: 0, y: 1 }, up: { x: 0, y: -1 } };

const DOCKS = {};
function dockOf(stage) {
  if (!(stage in DOCKS)) {
    let d = null;
    try { d = require(`./map${stage}`).DOCK || null; } catch { d = null; }
    DOCKS[stage] = d && Number.isFinite(d.x) && Number.isFinite(d.y) && d.w > 0 && d.h > 0 ? { x: d.x, y: d.y, w: d.w, h: d.h } : { ...DOCK_DEFAULT };
  }
  return DOCKS[stage];
}
// ตำแหน่งเรือตอนนี้: แล่นไปแล้วในชั้นนี้ = S.pos · ไม่งั้นท่าจอดของผัง
function dock(ctx) {
  const d = dockOf(ctx.stage), at = S(ctx).pos;
  return at && at.stage === ctx.stage ? { x: at.x, y: at.y, w: d.w, h: d.h } : d;
}
function tilesOf(d) {
  const out = [];
  for (let y = d.y; y < d.y + d.h; y++) for (let x = d.x; x < d.x + d.w; x++) out.push({ x, y });
  return out;
}
const S = (ctx) => (ctx.match.fodlan ? (ctx.match.fodlan.ship ||= { cd: {}, torpedo: {}, light: null }) : { cd: {}, torpedo: {}, light: null });
const turnNow = (ctx) => ctx.match.roundNumber;
const cdLeft = (ctx, key) => Math.max(0, (S(ctx).cd[key] || 0) - turnNow(ctx));

// ---------- ขับเรือ ----------
// ช่องคนขับ = หอบังคับการ (แถวบนของเรือ ช่องที่ 3)
const helmOf = (d) => ({ x: d.x + 2, y: d.y });
const onShip = (d, x, y) => x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h;
// คนขับตอนนี้ (ยังมีชีวิต + ยืนบนตัวเรือ) · หลุดจากเรือ = เลิกขับ
function driverOf(ctx) {
  const s = S(ctx), dr = s.drive;
  if (!dr) return null;
  const p = ctx.match.players[dr.id], d = dock(ctx);
  if (dr.stage !== ctx.stage || !p || !p.alive || !p.pos || !onShip(d, p.pos.x, p.pos.y)) { s.drive = null; return null; }
  return p;
}
const isDriver = (ctx, p) => !!p && driverOf(ctx) === p;
function near(ctx, p) {
  if (!p || !p.alive || !p.pos) return false;
  if (isDriver(ctx, p)) return true;
  return tilesOf(dock(ctx)).some((t) => ctx.adjacent(p, t.x, t.y));
}
function canMove(ctx, p) {
  const a = ctx.match.action;
  return ctx.action.canAct(p) && !!a && !a.locked;
}
// ช่องลำตัวทาลัสซาตอนนี้ (เรือแล่นทับไม่ได้)
function whaleKeys(ctx) {
  try { return new Set(Th().bodyNow(ctx).map((c) => K(c.x, c.y))); } catch { return new Set(); }
}
// ตำแหน่งเรือ (มุมบนซ้าย) ที่แล่นไปถึงได้ใน n ก้าว → [{ x, y, path: [มุมทีละก้าว] }] (ไม่รวมที่อยู่)
function sailTargets(ctx, n) {
  const map = ctx.map(), d = dock(ctx), wk = whaleKeys(ctx);
  const ok = (x, y) => {
    if (x < 0 || y < 0 || x + d.w > map.cols || y + d.h > map.rows) return false;
    for (let yy = y; yy < y + d.h; yy++) for (let xx = x; xx < x + d.w; xx++) if (wk.has(K(xx, yy))) return false;
    return true;
  };
  const seen = new Set([K(d.x, d.y)]), out = [];
  let front = [{ x: d.x, y: d.y, path: [{ x: d.x, y: d.y }] }];
  for (let step = 0; step < n; step++) {
    const next = [];
    for (const a of front) for (const v of Object.values(DIRV)) {
      const x = a.x + v.x, y = a.y + v.y, k = K(x, y);
      if (seen.has(k) || !ok(x, y)) continue;
      seen.add(k);
      const b = { x, y, path: [...a.path, { x, y }] };
      out.push(b); next.push(b);
    }
    front = next;
  }
  return out;
}
const sailMov = (ctx, p) => Math.max(1, Number(ctx.action.baseMovOf(p)) || 3);
// ยืนติดเรือ = ตัวเรือบังพุ่งทะลวง/เพลงวาฬ
function shelters(ctx, p) { return near(ctx, p); }
function canStrike(ctx, p) {
  const a = ctx.match.action;
  return ctx.action.canAct(p) && !!a && !a.noStrike && !p.didAttackRound;
}
const foe = (ctx, src, t) => !!(t && src && t.id !== src.id && !ctx.combat.sameTeam(src, t));
const unitOn = (ctx, x, y) => ctx.alive().find((u) => ctx.Board.footprint(u.pos.x, u.pos.y, ctx.action.sizeOf(u)).some((c) => c.x === x && c.y === y)) || null;
const Th = () => require("./thalassa");

// ---------- ชั้นแผนที่ + ร้าน ----------
function layer(ctx, map) {
  const terrain = { ...(map.terrain || {}) };
  for (const t of tilesOf(dock(ctx))) if (ctx.Board.inBounds(map, t.x, t.y)) terrain[K(t.x, t.y)] = "fd_nt_ship";
  return { ...map, terrain };
}
function keepsTile(ctx, k) { return tilesOf(dock(ctx)).some((t) => K(t.x, t.y) === k); }
// ร้านเรือของชั้นนี้: ไม่มี / อยู่ผิดท่า (เปลี่ยนชั้น) = ตั้งใหม่ (ของใหม่) · เรียกตอนเข้าชั้น + ต้นเทิร์น (shop.maybeMoveShop)
function ensureShop(ctx) {
  const shop = require("../shop");
  const d = dock(ctx);
  const cur = shop.shopById(SHOP_KIND);
  if (cur && cur.x === d.x && cur.y === d.y && cur.w === d.w && cur.h === d.h) return cur;
  return shop.openShopAt(SHOP_KIND, d.x, d.y, { w: d.w, h: d.h, building: true, ship: true });
}
// เข้าชั้นใหม่: ตอร์ปิโดคืน (คนละลูกต่อชั้น) · ไฟฉายดับ · ร้านเรือย้ายมาท่านี้
function enter(ctx) {
  const s = S(ctx);
  s.torpedo = {};
  s.light = null;
  s.pos = null;
  s.drive = null;
  ensureShop(ctx);
}

// ---------- แนว/พื้นที่ของแต่ละปุ่ม ----------
// แนวตอร์ปิโดทั้งหมด: ออกจากขอบเรือทั้ง 4 ด้าน ทีละแถว/คอลัมน์ → [{ dir, from: {x,y} (ช่องติดเรือ), cells }]
function torpedoLines(ctx) {
  const map = ctx.map(), d = dock(ctx), out = [], body = whaleKeys(ctx);
  const walk = (dir, sx, sy, dx, dy) => {
    const cells = [];
    for (let x = sx, y = sy; ctx.Board.inBounds(map, x, y); x += dx, y += dy) {
      cells.push({ x, y });
      if (body.has(K(x, y))) break;
      const t = map.terrain[K(x, y)];
      if (t && t !== "fd_nt_ship") break; // สิ่งกีดขวาง/ลำตัวทาลัสซา = ปลายแนว
    }
    if (cells.length) out.push({ dir, cells });
  };
  for (let y = d.y; y < d.y + d.h; y++) { walk("left", d.x - 1, y, -1, 0); walk("right", d.x + d.w, y, 1, 0); }
  for (let x = d.x; x < d.x + d.w; x++) { walk("down", x, d.y + d.h, 0, 1); walk("up", x, d.y - 1, 0, -1); }
  return out;
}
// ลำแสงไฟฉาย: แถบกว้าง LIGHT_W จากกลางด้านของเรือจนสุดกระดาน
function beamOf(ctx, dir) {
  const map = ctx.map(), d = dock(ctx), out = [];
  const h0 = Math.floor(LIGHT_W / 2);
  if (dir === "down" || dir === "up") {
    const cx = d.x + Math.floor(d.w / 2);
    for (let x = cx - h0; x < cx - h0 + LIGHT_W; x++) {
      if (dir === "down") for (let y = d.y + d.h; y < map.rows; y++) out.push({ x, y });
      else for (let y = d.y - 1; y >= 0; y--) out.push({ x, y });
    }
  } else {
    const cy = d.y + Math.floor(d.h / 2);
    for (let y = cy - h0; y < cy - h0 + LIGHT_W; y++) {
      if (dir === "left") for (let x = d.x - 1; x >= 0; x--) out.push({ x, y });
      else for (let x = d.x + d.w; x < map.cols; x++) out.push({ x, y });
    }
  }
  return out.filter((t) => ctx.Board.inBounds(map, t.x, t.y));
}
const LIGHT_DIRS = ["down", "left", "right", "up"];
function lightTiles(ctx) {
  const l = S(ctx).light;
  return l && l.stage === ctx.stage ? beamOf(ctx, l.dir) : [];
}
function inLight(ctx, x, y) {
  if (ctx.stage < DARK_FROM) return false;
  return lightTiles(ctx).some((t) => t.x === x && t.y === y);
}
const uniq = (list) => { const seen = new Set(); return list.filter((t) => { const k = K(t.x, t.y); if (seen.has(k)) return false; seen.add(k); return true; }); };

// ---------- ปุ่ม HUD ----------
function hudActions(ctx, p) {
  if (!near(ctx, p)) return [];
  const s = S(ctx), can = canStrike(ctx, p);
  const O2 = require("./nautilusO2");
  const o2 = O2.get(ctx, p);
  const out = [];
  const dr = driverOf(ctx);
  if (dr === p) {
    const list = canMove(ctx, p) ? sailTargets(ctx, sailMov(ctx, p)) : [];
    out.push({ key: "fd:nt:sail", icon: "🚢", name: "แล่นเรือ", disabled: !list.length, tiles: list.map((a) => helmOf(a)) });
    const off = canMove(ctx, p) ? leaveTiles(ctx) : [];
    out.push({ key: "fd:nt:leave", icon: "🪜", name: "ลงเรือ", disabled: !off.length, tiles: off });
  } else if (!dr) {
    out.push({ key: "fd:nt:drive", icon: "🚢", name: "ขับเรือ", disabled: !canMove(ctx, p) || ctx.action.sizeOf(p) > 1 });
  }
  if (o2 != null) out.push({ key: "fd:nt:refill", icon: "🫧", name: "เติมออกซิเจน", disabled: !can || o2 >= O2.O2_MAX });
  const torpOk = can && !s.torpedo[p.id];
  out.push({ key: "fd:nt:torpedo", icon: "🚀", name: "ตอร์ปิโด", disabled: !torpOk, tiles: torpOk ? uniq(torpedoLines(ctx).flatMap((l) => l.cells)) : [], ...(s.torpedo[p.id] ? { used: true } : {}) });
  const lightCd = cdLeft(ctx, "light"), lightOk = can && !lightCd;
  out.push({ key: "fd:nt:light", icon: "🔦", name: "ไฟฉาย", disabled: !lightOk, tiles: lightOk ? uniq(LIGHT_DIRS.flatMap((dir) => beamOf(ctx, dir))) : [], ...(lightCd ? { cd: lightCd } : {}) });
  const organCd = cdLeft(ctx, "organ");
  out.push({ key: "fd:nt:organ", icon: "🎹", name: "ออร์แกน", disabled: !can || !!organCd, ...(organCd ? { cd: organCd } : {}) });
  return out;
}

// ---------- ลงผลปุ่ม ----------
function refillAction(ctx, p) {
  const O2 = require("./nautilusO2");
  const cur = O2.get(ctx, p);
  if (cur == null || cur >= O2.O2_MAX) return false;
  const got = O2.refill(ctx, p, O2.O2_MAX, "ship");
  ctx.log(`🫧 ${p.name} เติมออกซิเจนที่เรือ Nautilus +${got}`);
  ctx.useStrike(p, SECS.refill);
  return true;
}
function skillDodge(ctx, p, u, name) {
  try { return require("../phases/attack").skillDodge(p, u, name); } catch { return false; }
}
function torpedo(ctx, p, tile) {
  const s = S(ctx);
  if (!tile || s.torpedo[p.id]) return false;
  const line = torpedoLines(ctx).find((l) => l.cells.some((c) => c.x === tile.x && c.y === tile.y));
  if (!line) return false;
  const map = ctx.map(), path = [], body = whaleKeys(ctx);
  let hit = null, n = 0, target = null;
  for (const c of line.cells) {
    path.push(c);
    if (body.has(K(c.x, c.y))) { hit = "whale"; target = c; break; }
    if (map.terrain[K(c.x, c.y)]) break;
    const u = unitOn(ctx, c.x, c.y);
    if (u && foe(ctx, p, u)) { hit = u.id; target = u; break; }
  }
  s.torpedo[p.id] = true;
  let secs = SECS.torpedo;
  if (hit === "whale") {
    const r = Th().damageWhale(ctx, p, TORPEDO_WHALE, { x: target.x, y: target.y, src: "torpedo" });
    n = TORPEDO_WHALE;
    if (r) secs = Math.max(secs, r + 1.4);
  } else if (target) {
    target.wasAttacked = true;
    if (skillDodge(ctx, p, target, "ตอร์ปิโด")) { hit = null; ctx.fx("whale_dodge", { id: target.id, move: "torpedo" }); }
    else { n = ctx.damage(target, TORPEDO_DMG); ctx.log(`🚀 ตอร์ปิโดของ ${p.name} โดน ${target.name} -${n}`); }
  } else ctx.log(`🚀 ${p.name} ยิงตอร์ปิโด`);
  const end = path[path.length - 1];
  ctx.fx("nt_torpedo", { by: p.id, side: line.dir, dir: { ...DIRV[line.dir] }, from: { ...path[0] }, to: { ...end }, path: path.map((c) => ({ x: c.x, y: c.y })), hit, n });
  ctx.useStrike(p, secs);
  return true;
}
function light(ctx, p, tile) {
  if (!tile || cdLeft(ctx, "light")) return false;
  const dir = LIGHT_DIRS.find((dd) => beamOf(ctx, dd).some((c) => c.x === tile.x && c.y === tile.y));
  if (!dir) return false;
  const s = S(ctx);
  s.cd.light = turnNow(ctx) + LIGHT_CD;
  s.light = { dir, stage: ctx.stage };
  const tiles = beamOf(ctx, dir), set = new Set(tiles.map((c) => K(c.x, c.y)));
  const body = Th().bodyNow(ctx);
  const stunned = body.some((c) => set.has(K(c.x, c.y))) && Th().stun(ctx);
  ctx.log(`🔦 ${p.name} หมุนไฟฉายของเรือ`);
  ctx.fx("nt_light", { by: p.id, side: dir, dir: { ...DIRV[dir] }, tiles, stunned: !!stunned }); // dir = เวกเตอร์ (shipArt.searchlight)
  ctx.useStrike(p, SECS.light);
  return true;
}
function organ(ctx, p) {
  if (cdLeft(ctx, "organ")) return false;
  S(ctx).cd.organ = turnNow(ctx) + ORGAN_CD;
  const calm = Th().calm(ctx);
  const buffed = [];
  if (!calm) {
    for (const u of ctx.alive()) {
      if (u.id !== p.id && !ctx.combat.sameTeam(p, u)) continue;
      ctx.Status.applyBuff(u, "guard", ORGAN_GUARD, ORGAN_TURNS);
      buffed.push(u.id);
    }
    ctx.log(`🎹 ${p.name} บรรเลงออร์แกนของกัปตัน — คุ้มครอง +${ORGAN_GUARD}`);
  }
  ctx.fx("nt_organ", { by: p.id, calm: !!calm, buffed });
  ctx.useStrike(p, SECS.organ);
  return true;
}
// ช่องลงเรือ: ช่องว่างที่ยืนได้ ติดตัวเรือ (4 ทิศ)
function leaveTiles(ctx) {
  const map = ctx.map(), d = dock(ctx), out = [];
  for (let y = d.y - 1; y <= d.y + d.h; y++) for (let x = d.x - 1; x <= d.x + d.w; x++) {
    if (onShip(d, x, y) || !ctx.Board.inBounds(map, x, y)) continue;
    const adj = (x >= d.x && x < d.x + d.w) || (y >= d.y && y < d.y + d.h);
    if (adj && ctx.free(x, y)) out.push({ x, y });
  }
  return out;
}
function boardShip(ctx, p) {
  if (driverOf(ctx) || !canMove(ctx, p) || ctx.action.sizeOf(p) > 1) return false;
  if (!tilesOf(dock(ctx)).some((t) => ctx.adjacent(p, t.x, t.y))) return false;
  const from = { ...p.pos }, h = helmOf(dock(ctx));
  p.pos = { ...h };
  S(ctx).drive = { id: p.id, stage: ctx.stage };
  ctx.fx("nt_board", { id: p.id, from, to: { ...h } });
  ctx.log(`🚢 ${p.name} ขึ้นไปบังคับเรือ Nautilus`);
  ctx.bump();
  return true;
}
// เบียดคนออกจากช่องเรือ (ไม่นับคนขับ) ไปช่องว่างที่ใกล้ที่สุดนอกเรือ
function shoveOff(ctx, d, skipId) {
  const out = [], map = ctx.map();
  for (const u of ctx.alive()) {
    if (u.id === skipId || !u.pos) continue;
    const foot = ctx.Board.footprint(u.pos.x, u.pos.y, ctx.action.sizeOf(u));
    if (!foot.some((c) => onShip(d, c.x, c.y))) continue;
    let best = null, bd = 1e9;
    for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) {
      if (onShip(d, x, y) || !ctx.free(x, y, u.id)) continue;
      const dd = Math.abs(x - u.pos.x) + Math.abs(y - u.pos.y);
      if (dd < bd) { bd = dd; best = { x, y }; }
    }
    if (best) { u.pos = best; out.push({ id: u.id, x: best.x, y: best.y }); }
  }
  return out;
}
function sail(ctx, p, tile) {
  if (!isDriver(ctx, p) || !canMove(ctx, p) || !tile) return false;
  const to = sailTargets(ctx, sailMov(ctx, p)).find((a) => { const h = helmOf(a); return h.x === tile.x && h.y === tile.y; });
  if (!to) return false;
  const d0 = dock(ctx), from = { x: d0.x, y: d0.y };
  // ช่องที่ตัวเรือกวาดผ่านทั้งทาง
  const swept = new Set();
  for (const a of to.path) for (let y = a.y; y < a.y + d0.h; y++) for (let x = a.x; x < a.x + d0.w; x++) swept.add(K(x, y));
  const hits = [];
  for (const u of ctx.alive()) {
    if (u.id === p.id || !u.pos || !foe(ctx, p, u)) continue;
    if (!ctx.Board.footprint(u.pos.x, u.pos.y, ctx.action.sizeOf(u)).some((c) => swept.has(K(c.x, c.y)))) continue;
    u.wasAttacked = true;
    if (skillDodge(ctx, p, u, "เรือ Nautilus")) { ctx.fx("whale_dodge", { id: u.id, move: "sail" }); continue; }
    const n = ctx.damage(u, SAIL_HIT);
    hits.push({ id: u.id, n });
    ctx.log(`🚢 เรือ Nautilus ชน ${u.name} -${n}`);
  }
  S(ctx).pos = { stage: ctx.stage, x: to.x, y: to.y };
  const d = dock(ctx);
  p.pos = helmOf(d);
  const shop = require("../shop").shopById(SHOP_KIND);
  if (shop) { shop.x = d.x; shop.y = d.y; }
  const pushed = shoveOff(ctx, d, p.id);
  ctx.bump();
  ctx.action.lockMove(p);
  ctx.fx("nt_sail", { by: p.id, from, to: { x: to.x, y: to.y }, path: to.path.map((c) => ({ x: c.x, y: c.y })), hits, pushed });
  ctx.log(`🚢 ${p.name} แล่นเรือ Nautilus`);
  return true;
}
function leaveShip(ctx, p, tile) {
  if (!isDriver(ctx, p) || !canMove(ctx, p) || !tile) return false;
  const t = leaveTiles(ctx).find((c) => c.x === tile.x && c.y === tile.y);
  if (!t) return false;
  const from = { ...p.pos };
  p.pos = { x: t.x, y: t.y };
  S(ctx).drive = null;
  ctx.action.lockMove(p);
  ctx.fx("nt_board", { id: p.id, from, to: { ...t }, off: true });
  ctx.log(`🪜 ${p.name} ลงจากเรือ Nautilus`);
  ctx.bump();
  return true;
}
function charAction(ctx, p, key, tile) {
  if (key === "fd:nt:drive") return boardShip(ctx, p);
  if (key === "fd:nt:sail") return sail(ctx, p, tile);
  if (key === "fd:nt:leave") return leaveShip(ctx, p, tile);
  if (!near(ctx, p) || !canStrike(ctx, p)) return false;
  if (key === "fd:nt:refill") return refillAction(ctx, p);
  if (key === "fd:nt:torpedo") return torpedo(ctx, p, tile);
  if (key === "fd:nt:light") return light(ctx, p, tile);
  if (key === "fd:nt:organ") return organ(ctx, p);
  return false;
}

function publicInfo(ctx) {
  const d = dock(ctx), s = S(ctx);
  const l = s.light && s.light.stage === ctx.stage ? s.light : null;
  return {
    x: d.x, y: d.y, w: d.w, h: d.h,
    light: l ? { side: l.dir, dir: { ...DIRV[l.dir] }, tiles: beamOf(ctx, l.dir) } : null,
    cd: { light: cdLeft(ctx, "light"), organ: cdLeft(ctx, "organ") },
    driver: (driverOf(ctx) || {}).id || null,
    torpedoUsed: Object.keys(s.torpedo || {}).filter((id) => s.torpedo[id]),
  };
}

module.exports = {
  SHOP_KIND, DOCK_DEFAULT, TORPEDO_DMG, TORPEDO_WHALE, SAIL_HIT, LIGHT_CD, LIGHT_W, ORGAN_CD, ORGAN_GUARD, DARK_FROM,
  dockOf, tilesOf, near, shelters, layer, keepsTile, ensureShop, enter, torpedoLines, sailTargets, driverOf, helmOf, beamOf, lightTiles, inLight, hudActions, charAction, publicInfo,
};
