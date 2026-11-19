// ============================================================
//  ถังออกซิเจน — โหมด Nautilus (GRID_PLAN §8.9 "ถังออกซิเจน" · ผู้ใช้ "เอาตามนั้น" 2026-11-19) · ฝั่ง server
//  ไม่ใช่ด่าน: ตัวคุม server/fodlan.js เรียกผ่าน server/fodlan/nautilus.js ทุกชั้น (7–11) · สถานะ match.fodlan.o2 = { [id ผู้เล่น]: n } (ค้างข้ามชั้น)
//
//   ถังเต็ม 10 · จบเทิร์นใช้ไป ชั้น 1–2 = 1 · ชั้น 3–4 = 2 · ชั้น 5 = 3 · เปลี่ยนชั้นไม่เติม
//   ถังหมด (0) = ความเสียหาย 1 ต่อเทิร์น (ไม่ทะลุเกราะ: ลดเกราะก่อน ตายได้ — ค่าเริ่มต้นของผู้ใช้)
//   เติม: จบตาบนจุดฟื้นฟูของชั้น (ฟองอากาศ/ห้องอากาศค้าง) +4 · ยืนติดเรือ Nautilus กด "เติมออกซิเจน" = เต็มถัง (nautilusShip.js)
//         ถังออกซิเจนสำรอง (ไอเทมร้านเรือ) +5 · ทาลัสซา: กลืนลงท้อง = หายครึ่งถัง · วังน้ำวน = −1 (thalassa.js)
//  [Claude] ถังหมดแล้วโดนดาเมจในจบเทิร์นเดียวกับที่ใช้จนหมด · ยูนิตที่ถูกเรียก (summon) ไม่มีถัง
// ============================================================
const O2_MAX = 10;
const BUBBLE = 4;
const TANK = 5;
const CHOKE_DMG = 1;
const USE = { 7: 1, 8: 1, 9: 2, 10: 2, 11: 3 };

const store = (ctx) => (ctx.match.fodlan ? (ctx.match.fodlan.o2 ||= {}) : {});
const hasTank = (p) => !!p && !p.summon;
function get(ctx, p) {
  if (!hasTank(p)) return null;
  const s = store(ctx);
  if (s[p.id] == null) s[p.id] = O2_MAX;
  return s[p.id];
}
function set(ctx, p, n) {
  if (!hasTank(p)) return 0;
  store(ctx)[p.id] = Math.max(0, Math.min(O2_MAX, Math.round(n)));
  return store(ctx)[p.id];
}
function reset(ctx) { if (ctx.match.fodlan) ctx.match.fodlan.o2 = {}; }
function useOf(stage) { return USE[stage] || 1; }

// เติม (คืนจำนวนที่เติมได้จริง) · src = "bubble" | "ship" | "tank"
function refill(ctx, p, n, src) {
  const before = get(ctx, p);
  if (before == null) return 0;
  const after = set(ctx, p, before + n);
  const got = after - before;
  if (got > 0) ctx.fx("nt_refill", { id: p.id, src, from: before, to: after, ...(p.pos ? { x: p.pos.x, y: p.pos.y } : {}) });
  return got;
}
// เสีย (ทาลัสซา) · คืนจำนวนที่หายจริง
function drain(ctx, p, n, src) {
  const before = get(ctx, p);
  if (before == null || !(n > 0)) return 0;
  const after = set(ctx, p, before - n);
  if (before !== after) ctx.fx("nt_o2_loss", { id: p.id, src, from: before, to: after });
  return before - after;
}

// จบตาของแต่ละตัว: จุดฟื้นฟูของชั้น (ฟองอากาศ) +4
function onUnitEnd(ctx, p) {
  if (!hasTank(p) || !p.alive || !p.pos) return;
  if (!ctx.Board.isHeal(ctx.map(), p.pos.x, p.pos.y)) return;
  const got = refill(ctx, p, BUBBLE, "bubble");
  if (got > 0) ctx.log(`🫧 ${p.name} สูดฟองอากาศ — ออกซิเจน +${got}`);
}

// จบเทิร์น: ทุกคนใช้ออกซิเจนตามความลึก → ถังหมด = เสียหาย 1 (เกราะก่อน)
function onEndTurn(ctx) {
  const use = useOf(ctx.stage);
  for (const p of Object.values(ctx.match.players)) {
    if (!hasTank(p) || !p.alive || !p.pos) continue;
    const after = set(ctx, p, get(ctx, p) - use);
    if (after > 0) continue;
    const dealt = ctx.damage(p, CHOKE_DMG);
    ctx.fx("nt_choke", { id: p.id, n: dealt });
    ctx.log(`🫧 ${p.name} ขาดอากาศ -${dealt}`);
  }
}

// ไอเทม "ถังออกซิเจนสำรอง" (server/shop.js useInventoryItem) · ถังเต็ม = ใช้ไม่ได้ ไม่เสียของ
function useTank(ctx, p) {
  const cur = get(ctx, p);
  if (cur == null || cur >= O2_MAX) return false;
  const got = refill(ctx, p, TANK, "tank");
  ctx.log(`🫧 ${p.name} เปิดถังออกซิเจนสำรอง — ออกซิเจน +${got}`);
  return true;
}

function playerInfo(ctx, p) {
  const n = get(ctx, p);
  return n == null ? undefined : { o2: n, o2Max: O2_MAX };
}

module.exports = { O2_MAX, BUBBLE, TANK, CHOKE_DMG, USE, get, set, reset, useOf, refill, drain, onUnitEnd, onEndTurn, useTank, playerInfo };
