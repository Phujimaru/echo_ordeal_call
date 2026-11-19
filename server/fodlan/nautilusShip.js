// ============================================================
//  เรือ Nautilus — จอดทุกชั้นของโหมด Nautilus (GRID_PLAN §8.9 "เรือ Nautilus" · ขั้น 3) · ฝั่ง server
//  ไม่ใช่ด่าน: ตัวคุม server/fodlan.js เรียกผ่าน server/fodlan/nautilus.js · ที่จอด = DOCK ของ server/fodlan/mapN.js (มุมบนซ้าย + w × h)
//
//   ตัวเรือ = สิ่งกีดขวาง "fd_nt_ship" (ชั้นแผนที่) + ร้านค้าของโหมด (match.shops kind "nautilus" building: true — client ไม่วาดแผงร้าน)
//     ยืนติดเรือ = ปุ่มร้านค้าเดิมขึ้นเอง (shop.nearShopOf) · ของ = ร้านปกติทุกอย่าง + ถังออกซิเจนสำรอง (shop.syncStageItems)
//   ปุ่ม HUD เมื่อยืนติดเรือ (key "fd:nt:*") — ทุกปุ่มใช้แทนการตีของตานี้ (ctx.useStrike แบบคันโยก/เครื่องยิงหินของ Fodlan):
//     เติมออกซิเจน = เต็มถัง · ตอร์ปิโด = คนละ 1 ลูกต่อชั้น แนวตรงจากเรือ โดนตัวแรก 3 / ทาลัสซา 8
//     หัวเจาะ = หัวเรือพุ่งตามแถวของเรือ 4 ช่อง (ซ้าย/ขวา) ดาเมจ 3 + ผลัก 1 · คูลดาวน์ 3 เทิร์น (ใช้ร่วมทั้งกระดาน)
//     ไฟฉาย = หมุนไปทิศที่เลือก (ค้างจนเปลี่ยนชั้น) · ชั้นมืดในลำแสงทุกคนมองเห็น (server/fodlan.js vision/hides) · ส่องโดนทาลัสซา = ชะงัก 1 ท่า · คูลดาวน์ 2
//     ออร์แกน = ทาลัสซาอยู่: สงบ 1 เทิร์น (ท่าที่เตือนไว้ยกเลิก + ไม่ว่าย) · ไม่อยู่: คุ้มครอง 1 (1 เทิร์น) ให้คนเล่น + เพื่อนร่วมทีม · คูลดาวน์ 4
//   ตัวเรือบังพุ่งทะลวง/เพลงวาฬ: ยืนติดเรือ = ไม่โดน (shelters — thalassa.js)
//  [Claude] ตัวเลข/ทิศ/ความกว้างลำแสง/ใช้แทนการตี = ข้อเสนอ ยังไม่ได้ถามผู้ใช้ · ดาเมจลดเกราะก่อน · หลบได้ (skillDodge)
// ============================================================
const DOCK_DEFAULT = { x: 7, y: 0, w: 6, h: 2 };
const TORPEDO_DMG = 3, TORPEDO_WHALE = 8;
const RAM_LEN = 4, RAM_DMG = 3, RAM_CD = 3;
const LIGHT_CD = 2, LIGHT_W = 4;
const ORGAN_CD = 4, ORGAN_GUARD = 1, ORGAN_TURNS = 1;
const SECS = { refill: 1.6, torpedo: 2.6, ram: 2.4, light: 1.6, organ: 3 };
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
const dock = (ctx) => dockOf(ctx.stage);
function tilesOf(d) {
  const out = [];
  for (let y = d.y; y < d.y + d.h; y++) for (let x = d.x; x < d.x + d.w; x++) out.push({ x, y });
  return out;
}
const S = (ctx) => (ctx.match.fodlan ? (ctx.match.fodlan.ship ||= { cd: {}, torpedo: {}, light: null }) : { cd: {}, torpedo: {}, light: null });
const turnNow = (ctx) => ctx.match.roundNumber;
const cdLeft = (ctx, key) => Math.max(0, (S(ctx).cd[key] || 0) - turnNow(ctx));

function near(ctx, p) {
  if (!p || !p.alive || !p.pos) return false;
  return tilesOf(dock(ctx)).some((t) => ctx.adjacent(p, t.x, t.y));
}
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
  ensureShop(ctx);
}

// ---------- แนว/พื้นที่ของแต่ละปุ่ม ----------
// แนวตอร์ปิโดทั้งหมด: ออกจากขอบเรือทั้ง 4 ด้าน ทีละแถว/คอลัมน์ → [{ dir, from: {x,y} (ช่องติดเรือ), cells }]
function torpedoLines(ctx) {
  const map = ctx.map(), d = dock(ctx), out = [];
  const walk = (dir, sx, sy, dx, dy) => {
    const cells = [];
    for (let x = sx, y = sy; ctx.Board.inBounds(map, x, y); x += dx, y += dy) {
      cells.push({ x, y });
      const t = map.terrain[K(x, y)];
      if (t && t !== "fd_nt_ship") break; // สิ่งกีดขวาง/ลำตัวทาลัสซา = ปลายแนว
    }
    if (cells.length) out.push({ dir, cells });
  };
  for (let y = d.y; y < d.y + d.h; y++) { walk("left", d.x - 1, y, -1, 0); walk("right", d.x + d.w, y, 1, 0); }
  for (let x = d.x; x < d.x + d.w; x++) { walk("down", x, d.y + d.h, 0, 1); walk("up", x, d.y - 1, 0, -1); }
  return out;
}
// หัวเจาะ: แถวของเรือ RAM_LEN ช่องจากหัว/ท้ายเรือ
function ramStrip(ctx, dir) {
  const map = ctx.map(), d = dock(ctx), out = [];
  for (let y = d.y; y < d.y + d.h; y++) for (let i = 0; i < RAM_LEN; i++) {
    const x = dir === "left" ? d.x - 1 - i : d.x + d.w + i;
    if (ctx.Board.inBounds(map, x, y)) out.push({ x, y });
  }
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
  out.push({ key: "fd:nt:refill", icon: "🫧", name: "เติมออกซิเจน", disabled: !can || o2 == null || o2 >= O2.O2_MAX });
  const torpOk = can && !s.torpedo[p.id];
  out.push({ key: "fd:nt:torpedo", icon: "🚀", name: "ตอร์ปิโด", disabled: !torpOk, tiles: torpOk ? uniq(torpedoLines(ctx).flatMap((l) => l.cells)) : [], ...(s.torpedo[p.id] ? { used: true } : {}) });
  const ramCd = cdLeft(ctx, "ram"), ramOk = can && !ramCd;
  out.push({ key: "fd:nt:ram", icon: "⚓", name: "หัวเจาะ", disabled: !ramOk, tiles: ramOk ? uniq([...ramStrip(ctx, "left"), ...ramStrip(ctx, "right")]) : [], ...(ramCd ? { cd: ramCd } : {}) });
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
  const map = ctx.map(), path = [];
  let hit = null, n = 0, target = null;
  for (const c of line.cells) {
    path.push(c);
    if (map.terrain[K(c.x, c.y)] === "fd_nt_whale") { hit = "whale"; target = c; break; }
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
function ram(ctx, p, tile) {
  if (!tile || cdLeft(ctx, "ram")) return false;
  const dir = ramStrip(ctx, "left").some((c) => c.x === tile.x && c.y === tile.y) ? "left" : ramStrip(ctx, "right").some((c) => c.x === tile.x && c.y === tile.y) ? "right" : null;
  if (!dir) return false;
  S(ctx).cd.ram = turnNow(ctx) + RAM_CD;
  const strip = ramStrip(ctx, dir), set = new Set(strip.map((c) => K(c.x, c.y)));
  const dx = dir === "left" ? -1 : 1;
  const hits = [], pushed = [];
  ctx.log(`⚓ ${p.name} สั่งเรือ Nautilus พุ่งกระทุ้งด้วยหัวเจาะ`);
  const victims = ctx.alive().filter((u) => foe(ctx, p, u) && ctx.Board.footprint(u.pos.x, u.pos.y, ctx.action.sizeOf(u)).some((c) => set.has(K(c.x, c.y))))
    .sort((a, b) => (b.pos.x - a.pos.x) * dx); // ไกลเรือก่อน (ผลักได้ไม่ชนกันเอง)
  for (const u of victims) {
    u.wasAttacked = true;
    if (skillDodge(ctx, p, u, "หัวเจาะ")) { ctx.fx("whale_dodge", { id: u.id, move: "ram" }); continue; }
    const dealt = ctx.damage(u, RAM_DMG);
    hits.push(u.id);
    ctx.log(`⚓ หัวเจาะโดน ${u.name} -${dealt}`);
    if (u.alive && u.pos && ctx.free(u.pos.x + dx, u.pos.y, u.id)) { u.pos = { x: u.pos.x + dx, y: u.pos.y }; pushed.push({ id: u.id, x: u.pos.x, y: u.pos.y }); }
  }
  // ลำตัวทาลัสซาอยู่ในแถว = โดนด้วย
  const map = ctx.map();
  const wc = strip.find((c) => map.terrain[K(c.x, c.y)] === "fd_nt_whale");
  let secs = SECS.ram;
  if (wc) { const r = Th().damageWhale(ctx, p, RAM_DMG, { x: wc.x, y: wc.y, src: "ram" }); if (r) { hits.push("whale"); secs = Math.max(secs, r + 1); } }
  ctx.fx("nt_ram", { by: p.id, side: dir, dir: dx, dist: RAM_LEN, tiles: strip, hits, pushed }); // dir = −1 ซ้าย / 1 ขวา (shipArt.shipPose)
  ctx.bump();
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
function charAction(ctx, p, key, tile) {
  if (!near(ctx, p) || !canStrike(ctx, p)) return false;
  if (key === "fd:nt:refill") return refillAction(ctx, p);
  if (key === "fd:nt:torpedo") return torpedo(ctx, p, tile);
  if (key === "fd:nt:ram") return ram(ctx, p, tile);
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
    cd: { ram: cdLeft(ctx, "ram"), light: cdLeft(ctx, "light"), organ: cdLeft(ctx, "organ") },
    torpedoUsed: Object.keys(s.torpedo || {}).filter((id) => s.torpedo[id]),
  };
}

module.exports = {
  SHOP_KIND, DOCK_DEFAULT, TORPEDO_DMG, TORPEDO_WHALE, RAM_LEN, RAM_DMG, RAM_CD, LIGHT_CD, LIGHT_W, ORGAN_CD, ORGAN_GUARD, DARK_FROM,
  dockOf, tilesOf, near, shelters, layer, keepsTile, ensureShop, enter, torpedoLines, ramStrip, beamOf, lightTiles, inLight, hudActions, charAction, publicInfo,
};
