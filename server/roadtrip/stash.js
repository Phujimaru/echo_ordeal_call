// Road Trip: กล่องเก็บของกลางของรถตู้ (ผู้ใช้สั่ง 2026-11-14 "ของกลาง ทั้งทีมเอามาเก็บรวมกัน แบ่งกันใช้")
//  rt.stash = [item…] · ความจุ = STASH_BASE + 2 × ขั้นอัปเกรดที่เก็บของ (storage) [Claude ตั้ง]
//  ใช้ได้ทุกช่วงเดินทาง (ขับ/ทางแยก/เหตุการณ์/จุดพัก) — ตอนต่อสู้ไม่ได้ · ของผูกตัว (BOUND) เก็บไม่ได้ · ทีมเดียวกันทุกคน (Road Trip = ทีมเดียว)
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
  return !!rt && RT.traveling() && !!p && !p.summon && p.alive !== false;
}
function command(p, o) {
  if (!usable(p)) return false;
  const rt = match.roadtrip, shop = require("../shop");
  const u = owner(p, o);
  rt.stash = rt.stash || [];
  if (o.op === "put") {
    const idx = (u.inventory || []).findIndex((it) => it && it.uid === o.uid);
    const item = idx >= 0 ? u.inventory[idx] : null;
    if (!item || shop.BOUND_ITEMS.includes(item.type) || rt.stash.length >= cap(rt)) return false;
    u.inventory.splice(idx, 1);
    rt.stash.push({ ...item, by: u.id });
    H().fx("stash", { id: u.id, op: "put", type: item.type });
    match.lastLog.push(`📦 ${u.name} เก็บ ${shop.shopItemName(item)} เข้ากล่องรถ`);
    return true;
  }
  if (o.op === "take") {
    const idx = rt.stash.findIndex((it) => it && it.uid === o.uid);
    if (idx < 0 || shop.bagFull(u)) return false;
    const [item] = rt.stash.splice(idx, 1);
    delete item.by;
    (u.inventory = u.inventory || []).push(item);
    H().fx("stash", { id: u.id, op: "take", type: item.type });
    match.lastLog.push(`📦 ${u.name} หยิบ ${shop.shopItemName(item)} จากกล่องรถ`);
    return true;
  }
  return false;
}
function publicInfo(rt) {
  return { items: (rt.stash || []).map((it) => ({ ...it })), cap: cap(rt) };
}
module.exports = { STASH_BASE, cap, command, publicInfo };
