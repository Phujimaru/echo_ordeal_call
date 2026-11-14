// Road Trip: กล่องเก็บของกลางของรถตู้ (ผู้ใช้สั่ง 2026-11-14 "ของกลาง ทั้งทีมเอามาเก็บรวมกัน แบ่งกันใช้")
//  rt.stash = [item…] · ความจุ = STASH_BASE + 2 × ขั้นอัปเกรดที่เก็บของ (storage) [Claude ตั้ง]
//  ใช้ได้ทุกช่วงเดินทาง (ขับ/ทางแยก/เหตุการณ์/จุดพัก) — ตอนต่อสู้ไม่ได้ · ของผูกตัว (BOUND) เก็บไม่ได้ · ทีมเดียวกันทุกคน (Road Trip = ทีมเดียว)
//  ต้องอยู่ที่กล่องจริง (ผู้ใช้สั่ง 2026-11-14 "กล่องจริงบนรถ เดินไปเปิด"): ช่วงขับ = ยืนบน/ติดช่องกล่อง (vanProps.stash · ชั้นในรถ)
//   · จุดพัก/แคมป์ = ยืนติดรถตู้ที่จอด (vanBlock) · วัตถุดิบซ้อนกองในกล่องได้ (food.js STACK)
const match = require("../match");
const STASH_BASE = 6;
const H = () => require("./index");
function cap(rt) { return STASH_BASE + 2 * require("./van").statOf(rt.van, "storage"); }
function owner(p, o) {
  // ระบบคู่: กระเป๋าใช้ร่วมกับตัวหลัก
  const id = p.duoOf || p.id;
  return match.players[id] || p;
}
function usable(p) {
  const RT = H(), rt = match.roadtrip;
  return !!rt && RT.traveling() && !!p && !p.summon && p.alive !== false && near(p);
}
const DRIVE_PHASES = new Set(["intro", "drive", "fork", "event"]);
// ยืนที่กล่องไหม (ตัวที่สั่ง — ระบบคู่ส่ง unitId ของตัวที่ยืนใกล้)
function near(p) {
  const rt = match.roadtrip, Maps = require("./maps");
  if (!rt || !p) return false;
  if (DRIVE_PHASES.has(rt.phase)) {
    const me = rt.vanPos && rt.vanPos[p.id];
    const t = (Maps.defs[Maps.RT_ONVAN].vanProps || {}).stash;
    return !!me && !!t && !me.roof && Math.abs(me.x - t[0]) + Math.abs(me.y - t[1]) <= 1;
  }
  if (rt.phase === "stop") {
    const d = rt.stop && Maps.defs[rt.stop.area], b = d && d.vanBlock;
    if (!b || !p.pos) return false;
    return Math.max(b.x0 - p.pos.x, 0, p.pos.x - b.x1) + Math.max(b.y0 - p.pos.y, 0, p.pos.y - b.y1) === 1;
  }
  return false;
}
function command(p, o) {
  if (o && o.unitId != null) { p = require("../duo").unitsOf(p).find((x) => x.id === o.unitId) || null; if (!p) return false; } // ระบบคู่: ตัวที่ยืนที่กล่อง
  if (!usable(p)) return false;
  const rt = match.roadtrip, shop = require("../shop"), Food = require("./food");
  const u = owner(p, o);
  rt.stash = rt.stash || [];
  if (o.op === "put") {
    const idx = (u.inventory || []).findIndex((it) => it && it.uid === o.uid);
    const item = idx >= 0 ? u.inventory[idx] : null;
    if (!item || shop.BOUND_ITEMS.includes(item.type)) return false;
    const room = Food.isIng(item.type) ? rt.stash.reduce((s, it) => s + (it.type === item.type ? Food.STACK - Food.qtyOf(it) : 0), 0) + (rt.stash.length < cap(rt) ? Food.STACK : 0) : rt.stash.length < cap(rt) ? 1 : 0;
    if (room < Food.qtyOf(item)) return false; // ใส่ไม่หมด = ไม่ใส่ (ไม่แบ่งกอง)
    u.inventory.splice(idx, 1);
    Food.mergeInto(rt.stash, { ...item, by: u.id }, cap(rt));
    H().fx("stash", { id: u.id, op: "put", type: item.type });
    match.lastLog.push(`📦 ${u.name} เก็บ ${shop.shopItemName(item)} เข้ากล่องรถ`);
    return true;
  }
  if (o.op === "take") {
    const idx = rt.stash.findIndex((it) => it && it.uid === o.uid);
    if (idx < 0) return false;
    const item = rt.stash[idx];
    const merge = Food.isIng(item.type) && (u.inventory || []).filter((it) => it.type === item.type).reduce((s, it) => s + Food.STACK - Food.qtyOf(it), 0) >= Food.qtyOf(item);
    if (!merge && shop.bagFull(u)) return false;
    rt.stash.splice(idx, 1);
    delete item.by;
    u.inventory = u.inventory || [];
    if (merge) Food.mergeInto(u.inventory, item, Infinity); else u.inventory.push(item);
    H().fx("stash", { id: u.id, op: "take", type: item.type });
    match.lastLog.push(`📦 ${u.name} หยิบ ${shop.shopItemName(item)} จากกล่องรถ`);
    return true;
  }
  return false;
}
function publicInfo(rt) {
  return { items: (rt.stash || []).map((it) => ({ ...it })), cap: cap(rt) };
}
module.exports = { STASH_BASE, cap, command, publicInfo, near };
