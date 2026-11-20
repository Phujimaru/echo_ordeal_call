// ============================================================
//  ของกลางทั้งโหมด Nautilus (GRID_PLAN §8.9 ขั้น 2–3) — ตัวคุม server/fodlan.js เรียกไฟล์นี้ "เพิ่ม" จากฮุคของชั้น (stage7–11.js) เฉพาะโลก nautilus
//   ทาลัสซา (thalassa.js · match.fodlan.whale) · เรือ Nautilus (nautilusShip.js · match.fodlan.ship) · ถังออกซิเจน (nautilusO2.js · match.fodlan.o2)
//   ทุกอย่างค้างข้ามชั้น · match.nautilusWhale === false (โหวตปิด) = ไม่มีทาลัสซาเลย (ไม่มีสถานะ · board.whale = null)
//  ลำดับชั้นแผนที่: ชั้นของด่าน → เรือ (fd_nt_ship) → ลำตัวทาลัสซา (fd_nt_whale — ไม่ทับช่องที่มีของอยู่แล้ว)
// ============================================================
const Th = require("./thalassa");
const Ship = require("./nautilusShip");
const O2 = require("./nautilusO2");

const whaleOn = (ctx) => Th.enabled(ctx.match) && !!(ctx.match.fodlan && ctx.match.fodlan.whale);

// เริ่มแมตช์ (Fodlan.start ก่อน placeOnBoard): ถังเต็มทุกคน · ทาลัสซาตามจำนวนผู้เล่นจริง · เรือรีเซ็ต
function reset(ctx, playerCount) {
  O2.reset(ctx);
  ctx.match.fodlan.ship = { cd: {}, torpedo: {}, light: null };
  if (Th.enabled(ctx.match)) Th.reset(ctx.match, playerCount);
  else ctx.match.fodlan.whale = null;
}
// เข้าชั้น (หลัง placeOnBoard · หลังฮุค enter ของชั้น)
function enter(ctx) {
  Ship.enter(ctx);
  if (whaleOn(ctx)) Th.enterLayer(ctx);
}
function preRound(ctx) {
  if (!whaleOn(ctx)) return 0;
  const secs = Number(Th.preRound(ctx)) || 0;
  Th.syncPresent(ctx.match.fodlan.whale);
  return secs;
}
function layer(ctx, map) {
  const m = Ship.layer(ctx, map);
  return whaleOn(ctx) ? Th.layer(ctx, m) : m;
}
function layerVer(ctx) {
  const w = whaleOn(ctx) ? ctx.match.fodlan.whale : null;
  const er = w && w.erased ? `e${w.erased.row}.${w.erased.until}` : "";
  return (w && w.on && !w.dead ? `w${w.appearSeq}.${Math.round(w.s * 100)}` : "") + er;
}
function keepsTile(ctx, k) { return Ship.keepsTile(ctx, k); }
function objects(ctx) { return whaleOn(ctx) ? Th.objects(ctx) : []; }
function ownsObject(id) { return typeof id === "string" && id.startsWith("fd:whale:"); }
function strikeObject(ctx, p, id) { return whaleOn(ctx) ? Th.strikeObject(ctx, p, id) : false; }
// เหยื่อล่อทาลัสซา (GRID_PLAN §8.9 ลูกเล่นทุกชั้น · ผู้ใช้ "เอาทั้งหมด"): ซื้อที่ร้านเรือ → ปุ่ม "ปาเหยื่อล่อ" ใส่ศัตรูในระยะ 4 (ใช้แทนการตี)
//  ท่าถัดไปของทาลัสซาเล็งคนนั้นก่อน · ใช้ได้เฉพาะตอนทาลัสซาอยู่บนกระดาน · หลบได้ (ทอยหลบแบบท่าอื่น)
const BAIT_RANGE = 4, BAIT_SECS = 1.3;
const baitOf = (p) => (p.inventory || []).find((it) => it && it.type === "whaleBait") || null;
function baitTargets(ctx, p) { return ctx.alive().filter((u) => u.pos && u.id !== p.id && !(ctx.combat.sameTeam && ctx.combat.sameTeam(u, p)) && Math.max(Math.abs(u.pos.x - p.pos.x), Math.abs(u.pos.y - p.pos.y)) <= BAIT_RANGE); }
function hudActions(ctx, p) {
  // ชั้น 6: กำลังเลือกคุณสมบัติที่จะเขียนทับ (ntImaginary.js) = ซ่อนปุ่มเรือ ให้ปุ่ม α–ζ พอดีตาราง
  const im = ctx.match.fodlan && ctx.match.fodlan.s && ctx.match.fodlan.s.nt12;
  if (p && im && im.pick && im.pick[p.id]) return [];
  const out = Ship.hudActions(ctx, p);
  if (p && p.pos && baitOf(p)) {
    const w = whaleOn(ctx) && ctx.match.fodlan.whale, t = baitTargets(ctx, p), a = ctx.match.action;
    const can = ctx.action.canAct(p) && !!a && !a.noStrike && !p.didAttackRound;
    out.push({ key: "fd:nt:bait", icon: "🥩", name: "ปาเหยื่อล่อ", disabled: !can || !(w && w.on && !w.dead) || !t.length, tiles: t.map((u) => ({ x: u.pos.x, y: u.pos.y })) });
  }
  return out;
}
function ownsAction(key) { return typeof key === "string" && key.startsWith("fd:nt:"); }
function charAction(ctx, p, key, tile) {
  if (key !== "fd:nt:bait") return Ship.charAction(ctx, p, key, tile);
  const item = baitOf(p), w = whaleOn(ctx) && ctx.match.fodlan.whale;
  if (!item || !tile || !(w && w.on && !w.dead) || !ctx.action.canAct(p) || p.didAttackRound) return false;
  const t = baitTargets(ctx, p).find((u) => u.pos.x === tile.x && u.pos.y === tile.y);
  if (!t) return false;
  p.inventory.splice(p.inventory.indexOf(item), 1);
  const dodged = require("./ntKit").dodges(ctx, t);
  if (!dodged) Th.bait(ctx, p, t);
  ctx.fx("nt_bait", { by: p.id, from: { ...p.pos }, to: { x: t.pos.x, y: t.pos.y }, id: t.id, hit: !dodged });
  ctx.log(dodged ? `💨 ${t.name} หลบเหยื่อล่อได้` : `🥩 ${p.name} ปาเหยื่อล่อใส่ ${t.name} — ทาลัสซาได้กลิ่น!`);
  ctx.useStrike(p, BAIT_SECS);
  return true;
}
function onUnitEnd(ctx, p) { O2.onUnitEnd(ctx, p); }
function onEndTurn(ctx) { O2.onEndTurn(ctx); }
function playerInfo(ctx, p) { return O2.playerInfo(ctx, p); }
// ชั้นมืด: ช่องในลำแสงไฟฉายเรือ ทุกคนมองเห็น (ต่อเข้ากับ vision/hides ของชั้น — ขั้น 4 ทำความมืด)
function litKeys(ctx) { return ctx.stage >= Ship.DARK_FROM ? Ship.lightTiles(ctx).map((t) => `${t.x},${t.y}`) : []; }
function lit(ctx, p) { return !!(p && p.pos) && Ship.inLight(ctx, p.pos.x, p.pos.y); }

// state.fodlan.board: whale (null = ปิด) · ship · warn (ช่องเตือนท่าทาลัสซา ต่อท้าย warn ของชั้น)
function publicInfo(ctx, base = {}) {
  const w = whaleOn(ctx) ? Th.publicInfo(ctx) : null;
  const warn = [...(Array.isArray(base.warn) ? base.warn : []), ...(w ? w.warn : [])];
  return { whale: w, ship: Ship.publicInfo(ctx), ...(warn.length || base.warn ? { warn } : {}) };
}

module.exports = { reset, enter, preRound, layer, layerVer, keepsTile, objects, ownsObject, strikeObject, hudActions, ownsAction, charAction, onUnitEnd, onEndTurn, playerInfo, litKeys, lit, publicInfo };
