// ============================================================
//  สนาม Eos — ไอเทมร้าน Eos: เกราะเสา · ขนนกคืนชีพ (Lament) · กำแพงไม้ · พลเรือน/รถเสบียงตาย
//  แยกออกจาก server/fodlan/stage6.js (ย้ายโค้ดล้วน · พฤติกรรมเดิม) · ฮุคทั้งหมดยังส่งออกผ่าน stage6.js
// ============================================================
const E = require("./eosEvents");
const PKS = require("./eosPerks");
const XT = require("./eosExtra");
const LM = require("./eosLament");
const { tileFree, freeNear } = require("./eosCore");
const DM = require("./eosDome");
const SC = require("./eosScore");

// เกราะเสา (ไอเทมร้าน Eos — server/shop.js) · ใช้ไม่ได้ = ไม่เสียของ
function wardOnSale() { return DM.gysahlOnSale(); }
function useWard(p) {
  if (!p || !p.alive || !p.pos || !DM.gysahlOnSale()) return false;
  const F = require("../fodlan");
  const ctx = F.makeCtx(), s = F.stageState().eos, ok = E.useWard(ctx, s, p);
  if (ok) XT.stat(s, p.id, "guard");
  return ok;
}
// ---------- Lament: หมากศพ + ขนนกคืนชีพ (ผู้ใช้สั่ง 2026-11-14) ----------
//  ล้มใน Lament = ทิ้งร่างไว้ที่ช่องที่ล้ม (server/duo.js keptFor) · ยืนติดร่างเพื่อนแล้วใช้ขนนก = ฟื้นทันทีที่ร่าง เลือดครึ่งหนึ่ง
//  การล้มครั้งนั้นไม่นับ (คืนชีวิตทีม — eosLament.onSaved) · ไม่มีร่างติดตัว = ไม่เสียของ · ขายเฉพาะ Lament
const REVIVE_ITEM = { hpK: 0.5 };
function lamentOn() {
  if (!DM.gysahlOnSale()) return false;
  return LM.on(require("../fodlan").makeCtx());
}
function keepsCorpse(p) { return !!(p && !p.summon && lamentOn()); }
function reviveOnSale() { return lamentOn(); }
function reviveTargets(ctx, s, p) {
  const e = E.ev(s), out = [];
  for (const pid of Object.keys(s.dead || {})) {
    const u = ctx.match.players[pid];
    if (!u || u.alive || u.summon || u.id === p.id) continue;
    const at = u.corpse || e.deathAt[pid];
    if (at && ctx.adjacent(p, at.x, at.y)) out.push({ u, x: at.x, y: at.y });
  }
  return out;
}
function useRevive(p) {
  if (!p || !p.alive || !p.pos || !reviveOnSale()) return false;
  const F = require("../fodlan");
  const ctx = F.makeCtx(), s = F.stageState().eos;
  for (const t of reviveTargets(ctx, s, p)) {
    const u = t.u;
    u.corpse = null; // ไม่นับร่างตัวเองตอนหาช่อง
    const spot = tileFree(ctx, s, t.x, t.y, u.id) ? { x: t.x, y: t.y } : freeNear(ctx, s, t.x, t.y, 2, u.id);
    if (!spot) { u.corpse = { x: t.x, y: t.y }; continue; }
    SC.raise(ctx, s, u, spot, Math.ceil(ctx.combat.maxHpOf(u) * REVIVE_ITEM.hpK));
    const refund = LM.onSaved(ctx, s, u);
    XT.stat(s, p.id, "saves");
    ctx.bump();
    ctx.fx("revive", { list: [{ id: u.id, x: spot.x, y: spot.y }], by: p.id, item: true });
    ctx.log(`🪶 ${p.name} ใช้ขนนกคืนชีพ — ${u.name} ฟื้นคืนชีพ!${refund ? " (ไม่นับการล้ม)" : ""}`);
    return true;
  }
  return false;
}
// กำแพงไม้ (ไอเทมร้าน Eos — server/shop.js) → เพิ่มจำนวนที่วางได้ (ปุ่ม "กำแพง" บน HUD) · เต็มแล้ว = ไม่เสียของ
function useBarricade(p) {
  if (!p || !p.alive || !DM.gysahlOnSale()) return false;
  const F = require("../fodlan");
  const ctx = F.makeCtx(), s = F.stageState().eos, ok = PKS.addCharge(s, p);
  if (ok) { ctx.bump(); ctx.log(`🧱 ${p.name} เตรียมกำแพงไม้ (กด "กำแพง" เพื่อวาง)`); }
  return ok;
}
function onCivDeath(c) {
  const F = require("../fodlan");
  if (!F.active() || !F.isEos() || !F.stageState() || !F.stageState().eos) return;
  XT.onCivDeath(F.makeCtx(), F.stageState().eos, c);
}
function onConvoyDeath(c) {
  const F = require("../fodlan");
  if (!F.active() || !F.isEos() || !F.stageState() || !F.stageState().eos) return;
  E.onConvoyDeath(F.makeCtx(), F.stageState().eos, c);
}

// Object.assign (ไม่แทน module.exports) — ไฟล์ eos* อ้างกันเองแบบวนได้
Object.assign(module.exports, {
  wardOnSale, useWard, REVIVE_ITEM, keepsCorpse, reviveOnSale, reviveTargets, useRevive, useBarricade, onCivDeath, onConvoyDeath,
});
