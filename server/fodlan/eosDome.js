// ============================================================
//  สนาม Eos — สะพานยก · โดมกำแพงเวท · สวิตช์ไฟเมือง · ผักกิซาล · ดันซากรถ
//  แยกออกจาก server/fodlan/stage6.js (ย้ายโค้ดล้วน · พฤติกรรมเดิม) · ฮุคทั้งหมดยังส่งออกผ่าน stage6.js
// ============================================================
const MAP = require("./map6");
const LM = require("./eosLament");
const { K, inRect, bodies, mobsOf, footOf, tileFree, freeNear, manhattan, listOf, townOf, canStrike } = require("./eosCore");
const RD = require("./eosRide");
const SC = require("./eosScore");
const SPN = require("./eosSpawn");

// ============================================================ ขั้น 2: ลูกเล่นปั่นป่วน (L6–L10 · ผู้ใช้สั่ง 2026-11-09 — ตัวเลขเป็นข้อเสนอของ Claude)
//  ทุกปุ่มใช้ "การตีของตา" (แบบคันโยกเรือของ Fodlan ด่าน I) · ยืนติดของนั้น 4 ทิศ
const DOME_TURNS = 3;          // L7 โดมอยู่ 3 เทิร์น
const DOME_HP = 8;              // บาเรียประตูรวม — มอนทุบครบ = โดมแตกก่อนเวลา (ผู้ใช้ 2026-11-10 "ปีศาจโจมตีกำแพงบาเรียได้")
const DOME_COOLDOWN = 5;       // ปิดแล้วพัก 5 เทิร์นก่อนเปิดใหม่ (ผู้ใช้สั่ง 2026-11-10 "ต้องมีคูลดาวน์ในการเปิด" — เดิม 2)
const GYSAHL_RANGE = 4;        // L9 โยนล่อโชโกโบะของศัตรูในระยะนี้
const LEVER_SECS = 1.4, DOME_SECS = 1.6, SWITCH_SECS = 1.2, PUSH_SECS = 1.0;
const BRIDGES = listOf(MAP.map.special, "fd_eos_bridge");
const LEVER = listOf(MAP.map.terrain, "fd_eos_lever")[0] || null;
const DOME_CORE = listOf(MAP.map.terrain, "fd_eos_domecore")[0] || null;
const SOLID = new Set(Object.values(MAP.map.terrain).flat().map(([x, y]) => K(x, y)));
const INSOMNIA = (MAP.ZONES.find((z) => z.id === "insomnia") || { rect: [8, 0, 23, 8] }).rect;
// ประตูของนครหลวง = ช่องเดินได้บนขอบกรอบเมือง (ยกเว้นขอบกระดาน)
const DOME_GATES = (() => {
  const [x0, y0, x1, y1] = INSOMNIA, out = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const edge = x === x0 || x === x1 || y === y1 || (y === y0 && y0 > 0);
    if (edge && !SOLID.has(K(x, y))) out.push({ x, y });
  }
  return out;
})();
const inDome = (x, y) => inRect(INSOMNIA, x, y);
function domeOn(s) { return !!(s && s.dome && s.dome.left > 0); }
// ไฟเมืองดับ = ปีศาจเข้าได้
function lit(s, zoneId) { return !(s && s.lightsOff && s.lightsOff[zoneId]); }
function blockedTown(s, x, y) { const z = townOf(x, y); return !!z && lit(s, z); }

// ---------- L6 สะพานยก ----------
function bridgeOccupied(ctx) {
  const keys = new Set(BRIDGES.map((t) => K(t.x, t.y)));
  return bodies(ctx).some((p) => footOf(ctx, p).some((c) => keys.has(K(c.x, c.y))));
}
function pullLever(ctx, s, p) {
  if (!LEVER || !ctx.adjacent(p, LEVER.x, LEVER.y) || !canStrike(ctx, p) || bridgeOccupied(ctx)) return false;
  s.bridgeUp = !s.bridgeUp;
  ctx.match.action.locked = true;
  ctx.bump();
  ctx.fx("bridge", { up: s.bridgeUp, x: LEVER.x, y: LEVER.y, tiles: BRIDGES.map((t) => ({ ...t })), by: p.id });
  ctx.log(`🌉 ${p.name} ${s.bridgeUp ? "ยกสะพาน Altissia ขึ้น" : "ลดสะพาน Altissia ลง"}`);
  ctx.useStrike(p, LEVER_SECS);
  return true;
}
// ---------- L7 โดมกำแพงเวท ----------
function domeReady(ctx, s) { return !domeOn(s) && ctx.match.roundNumber >= (s.domeReadyRound || 0); }
function raiseDome(ctx, s, p) {
  if (!DOME_CORE || !ctx.adjacent(p, DOME_CORE.x, DOME_CORE.y) || !canStrike(ctx, p) || !domeReady(ctx, s)) return false;
  const gateKeys = new Set(DOME_GATES.map((t) => K(t.x, t.y)));
  if (bodies(ctx).some((u) => footOf(ctx, u).some((c) => gateKeys.has(K(c.x, c.y))))) return false; // มีคนยืนขวางประตู
  s.dome = { left: DOME_TURNS, by: p.id, hp: DOME_HP };
  ctx.match.action.locked = true;
  ctx.bump();
  ctx.fx("dome_on", { rect: INSOMNIA, gates: DOME_GATES.map((t) => ({ ...t })), by: p.id });
  ctx.log(`🛡️ ${p.name} เปิดโดมกำแพงเวทของ Insomnia (${DOME_TURNS} เทิร์น)`);
  ctx.useStrike(p, DOME_SECS);
  return true;
}
function tickDome(ctx, s) {
  if (!domeOn(s)) return;
  s.dome.left -= 1;
  if (s.dome.left > 0) return;
  s.dome = null;
  s.domeReadyRound = ctx.match.roundNumber + DOME_COOLDOWN;
  ctx.bump();
  ctx.fx("dome_off", { rect: INSOMNIA });
  ctx.log("🛡️ โดมกำแพงเวทของ Insomnia สลายไป");
}
// ตีจากนอกโดมเข้าไปในโดมไม่ได้ (ตีปกติ + สกิลเป้าเดียว)
function shields(ctx, st, attacker, target) {
  const s = st && st.eos;
  if (!domeOn(s) || !attacker || !attacker.pos || !target || !target.pos) return false;
  const tIn = footOf(ctx, target).some((c) => inDome(c.x, c.y));
  const aIn = footOf(ctx, attacker).some((c) => inDome(c.x, c.y));
  return tIn && !aIn;
}
// ---------- L8 แผงไฟเมือง ----------
function switchNear(ctx, p) { return MAP.SWITCHES.find((sw) => ctx.adjacent(p, sw.at[0], sw.at[1])) || null; }
// แผงไฟเมือง = ไฟสาด (ผู้ใช้แจ้ง 2026-11-10 "สวิตช์ไฟในเมืองไม่มีประโยชน์อะไรเลย" — เดิมเปิด/ดับไฟ ซึ่งเปิดอยู่แล้วตลอด)
//  ไฟเมืองเปิดถาวร · กดแผง = แสงสาดจ้า: ปีศาจ/ทหารเหล็ก/หุ่นเกราะในระยะ FLASH.r จากแผง มึน 1 เทิร์น + ปีศาจโดนแสงไหม้ FLASH.dmg · พักเครื่อง FLASH.cd เทิร์น
const FLASH = { r: 6, dmg: 1, cd: 5 };
const flashCd = (ctx, s, zone) => Math.max(0, ((s.flashReady || {})[zone] || 0) - ctx.match.roundNumber);
function flipLights(ctx, s, p) {
  const sw = switchNear(ctx, p);
  if (!sw || !canStrike(ctx, p) || flashCd(ctx, s, sw.zone) > 0) return false;
  const at = { x: sw.at[0], y: sw.at[1] }, hits = [];
  for (const m of mobsOf(ctx)) {
    const t = SPN.mobType(m);
    if (!m.alive || !m.pos || t === "nest" || t === "giant" || t === "gold" || manhattan(m.pos, at) > FLASH.r) continue;
    if (ctx.combat.applyDebuff) ctx.combat.applyDebuff(m, "stun", 1, 1);
    const dealt = t === "daemon" && m.summon.trait !== "boss" ? SPN.hurt(ctx, m, FLASH.dmg, p) : 0;
    hits.push({ id: m.id, x: m.pos.x, y: m.pos.y, dmg: dealt });
  }
  (s.flashReady ||= {})[sw.zone] = ctx.match.roundNumber + FLASH.cd;
  ctx.match.action.locked = true;
  ctx.bump();
  ctx.fx("city_flash", { zone: sw.zone, x: at.x, y: at.y, r: FLASH.r, hits, by: p.id });
  ctx.log(`💡 ${p.name} สาดไฟเมือง ${SC.ZONE_NAMES[sw.zone] || sw.zone} — มอน ${hits.length} ตัวตาพร่า`);
  ctx.useStrike(p, SWITCH_SECS);
  return true;
}
// ---------- L9 ผักกิซาล (ไอเทม — server/shop.js) ----------
// Lament: ร้านแพง ×1.5 (server/shop.js stockShop / syncStageItems)
function eosPriceMul() { const F = require("../fodlan"); return gysahlOnSale() && F.makeCtx && LM.on(F.makeCtx()) ? LM.LAMENT.shop : 1; }
function gysahlOnSale() {
  const F = require("../fodlan");
  return !!(F.active() && F.isEos() && F.stageState() && F.stageState().eos);
}
// ใช้จากกระเป๋า: ศัตรูขี่โชโกโบะในระยะ = โยนล่อให้นกวิ่งหนี (คนขี่ตกนก) · ไม่มี = เรียกโชโกโบะว่างตัวใกล้สุดมาข้างตัว · ทำไม่ได้ = ไม่เสียของ
function useGysahl(p) {
  if (!p || !p.alive || !p.pos || !gysahlOnSale()) return false;
  const F = require("../fodlan");
  const ctx = F.makeCtx(), s = F.stageState().eos, side = SC.sideOf(p);
  const foes = Object.keys(s.riders).map((id) => ctx.match.players[id])
    .filter((u) => u && u.alive && u.pos && SC.sideOf(u) !== side && manhattan(u.pos, p.pos) <= GYSAHL_RANGE)
    .sort((a, b) => manhattan(a.pos, p.pos) - manhattan(b.pos, p.pos));
  if (foes.length) {
    const u = foes[0], c = RD.unride(ctx, s, u.id);
    if (c) {
      const spot = freeNear(ctx, s, u.pos.x + Math.sign(u.pos.x - p.pos.x) * 2, u.pos.y + Math.sign(u.pos.y - p.pos.y) * 2, 3, null);
      if (spot) { c.x = spot.x; c.y = spot.y; c.rider = null; } else RD.sendHome(ctx, s, c, { ...u.pos });
      ctx.bump();
      ctx.fx("gysahl_lure", { from: { ...p.pos }, at: { ...u.pos }, to: spot || null, id: u.id, by: p.id });
      ctx.log(`🥬 ${p.name} โยนผักกิซาล — โชโกโบะของ ${u.name} วิ่งไล่ผักไป!`);
      p.exposedRound = ctx.match.roundNumber;
      return true;
    }
  }
  if (RD.riding(s, p)) return false;
  const free = s.chocos.filter((c) => c.x != null && !c.rider).sort((a, b) => manhattan(a, p.pos) - manhattan(b, p.pos));
  const spot = RD.dismountTiles(ctx, s, p)[0];
  if (!free.length || !spot) return false;
  const c = free[0], from = { x: c.x, y: c.y };
  c.x = spot.x; c.y = spot.y;
  ctx.bump();
  ctx.fx("gysahl_call", { from, to: { ...spot }, by: p.id });
  ctx.log(`🥬 ${p.name} ใช้ผักกิซาล — โชโกโบะวิ่งมาหา`);
  return RD.rideNow(ctx, s, p, c) ? "ride" : true; // "ride" = ร้านไม่ล็อกการเดิน (เดินต่อจากนกได้)
}
// ---------- L10 ซากรถ (ผลักได้) ----------
function wreckNear(ctx, s, p) { return (s.wrecks || []).filter((w) => ctx.adjacent(p, w.x, w.y)); }
function pushTo(ctx, s, p, w) {
  const dx = Math.sign(w.x - p.pos.x), dy = Math.sign(w.y - p.pos.y);
  if (Math.abs(dx) + Math.abs(dy) !== 1) return null;
  const to = { x: w.x + dx, y: w.y + dy };
  if (!tileFree(ctx, s, to.x, to.y) || (s.wrecks || []).some((o) => o.x === to.x && o.y === to.y)) return null;
  return to;
}
function pushWreck(ctx, s, p) {
  if (!canStrike(ctx, p)) return false;
  const w = wreckNear(ctx, s, p).find((o) => pushTo(ctx, s, p, o));
  if (!w) return false;
  const from = { x: w.x, y: w.y }, to = pushTo(ctx, s, p, w);
  w.x = to.x; w.y = to.y;
  ctx.match.action.locked = true;
  ctx.bump();
  ctx.fx("wreck_push", { id: w.id, from, to: { ...to }, by: p.id });
  ctx.log(`🚙 ${p.name} ผลักซากรถ`);
  ctx.useStrike(p, PUSH_SECS);
  return true;
}

// Object.assign (ไม่แทน module.exports) — ไฟล์ eos* อ้างกันเองแบบวนได้
Object.assign(module.exports, {
  DOME_TURNS, DOME_HP, DOME_COOLDOWN, GYSAHL_RANGE, SWITCH_SECS, BRIDGES, LEVER, DOME_CORE, INSOMNIA, DOME_GATES, domeOn, lit, blockedTown,
  bridgeOccupied, pullLever, domeReady, raiseDome, tickDome, shields, switchNear, FLASH, flashCd, flipLights, eosPriceMul, gysahlOnSale, useGysahl,
  wreckNear, pushTo, pushWreck,
});
