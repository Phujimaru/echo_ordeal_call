// ============================================================
//  ชั้นมิติ — ระบบกลาง (ต้นแบบ ฟันนี่ วาเลนไทน์ · GRID_PLAN §7.13 · GAME_SYSTEM §26)
//
//  p.dim = null (กระดานหลัก) | สตริง (ชั้นอื่น: "veil:<id>" มิติหลบสายตา · "par:<id>:<n>" กระดานคู่ขนาน)
//  แยกเฉพาะ "ตัวคน" — แผนที่/สิ่งกีดขวาง/ของบนพื้น (น้ำแข็ง/น้ำมัน/ร้านค้า/ธง/ร่าง) ใช้ร่วมกันทุกชั้น
//   · action.boardUnits(ref) คืนเฉพาะคนชั้นเดียวกับ ref → เดิน/ขวาง/สกิลพื้นที่/ผลัก/ไถล/ถอย/ช่องว่าง แยกชั้นเองหมด
//   · เล็งเป้า (resolveArea target · ตีปกติ · ตีสวน · ปืน GUTS · ไอเทม · คาดการณ์) ต้องชั้นเดียวกัน (same)
//   · ตาข่ายกันเหนียว: combat.adjustIncomingDamage / applyDebuff — ต้นตอ (effectSource) อยู่คนละชั้นกับเป้า = ไม่มีผล
//     (ผลสนามที่ไม่มีต้นตอยังโดนทุกชั้น)
//  เดินทะลุ (ghost — p.dimGhost): Board.reachable(..., { ghost: true }) เหลือแค่ขอบกระดาน · ไม่เหยียบกับดัก/ช่องพิเศษ/น้ำแข็ง
//  กลับกระดานหลัก: leave(p) = dim null แล้วช่องเดิมไม่ว่างบนกระดานหลัก → ช่องว่างใกล้สุด · placeOnBoard = ทุกคนกลับหลัก (resetAll)
// ============================================================
Object.assign(module.exports, {
  layerOf, same, ghost, enter, leave, resetAll, refLayer, blocks, membersOf,
});

const match = require("./match");

// ชั้นของคนนี้ (null = กระดานหลัก)
function layerOf(p) { return (p && p.dim) || null; }
// อยู่ชั้นเดียวกันไหม
function same(a, b) { return layerOf(a) === layerOf(b); }
// เดินทะลุทุกอย่าง (เหลือแค่ขอบกระดาน) — มิติที่เข้าด้วย enter(..., { ghost: true })
function ghost(p) { return !!(p && p.dim && p.dimGhost); }
// ย้ายเข้าชั้น dim (null = กระดานหลัก — ใช้ leave ถ้าต้องการหาช่องว่าง)
function enter(p, dim, { ghost: g = false } = {}) {
  if (!p) return;
  p.dim = dim || null;
  p.dimGhost = !!(dim && g);
}
// ชั้นอ้างอิงของ boardUnits(ref): ref = playerId | ผู้เล่น · ไม่ส่ง = ชั้นของต้นตอ (effectSource) → คนที่กำลังเดิน → กระดานหลัก
function refLayer(ref) {
  let p = null;
  if (ref && typeof ref === "object") p = ref;
  else if (typeof ref === "string") p = match.players[ref] || null;
  if (!p && ref == null) p = (match.effectSourceId && match.players[match.effectSourceId]) || (match.actorId && match.players[match.actorId]) || null;
  return layerOf(p);
}
// ต้นตอ (effectSource) อยู่คนละชั้นกับเป้า = ผลไม่ถึง (ไม่มีต้นตอ = ผลสนาม ถึงทุกชั้น)
function blocks(target) {
  const src = match.effectSourceId && match.players[match.effectSourceId];
  if (!src || !target || src.id === target.id) return false;
  return !same(src, target);
}
// คนที่ยังอยู่ในชั้น dim
function membersOf(dim) {
  if (!dim) return [];
  return Object.values(match.players).filter((p) => p.alive && p.dim === dim);
}
// กลับกระดานหลัก: ช่องที่ยืนไม่ว่างบนกระดานหลัก (มีคน/สิ่งกีดขวาง/ร้าน) = ช่องว่างใกล้สุด → { from, to, moved }
function leave(p) {
  if (!p) return null;
  const from = p.pos ? { ...p.pos } : null;
  p.dim = null;
  p.dimGhost = false;
  if (!p.alive || !p.pos) return { from, to: from, moved: false };
  const action = require("./phases/action"); // require ตอนเรียก — กัน require วน
  if (action.sizeOf(p) > 1) {
    // ตัวใหญ่ (Echo ขยายร่าง): ทั้งตัวต้องลงได้ — ไม่ได้ = ที่ว่างใกล้สุดที่พอทั้งตัว (พังของใต้ตัวได้ถ้าเดินพังได้)
    const Board = require("./board");
    const units = action.boardUnits(p).filter((u) => u.id !== p.id);
    const opts = { blocked: action.boardBlocked(p.id), smash: action.smashes(p) };
    const fit = Board.bigFits(action.boardMap(), { id: p.id, x: p.pos.x, y: p.pos.y, size: action.sizeOf(p) }, p.pos.x, p.pos.y, units, opts);
    if (!fit || fit.ally) {
      const spot = Board.placeBig(action.boardMap(), action.sizeOf(p), p.pos, units, { selfId: p.id, ...opts });
      if (spot) { action.breakObstacles(spot.rubble); p.pos = { x: spot.x, y: spot.y }; }
    } else if (fit.rubble) {
      action.breakObstacles(Board.footprint(p.pos.x, p.pos.y, action.sizeOf(p)).map((t) => Board.key(t.x, t.y)));
    }
  } else if (!action.tileFree(p.pos.x, p.pos.y, p.id)) {
    const to = action.nearFreeTile(p.pos, p.id);
    if (to) p.pos = { ...to };
  }
  const moved = !!from && (from.x !== p.pos.x || from.y !== p.pos.y);
  return { from, to: { ...p.pos }, moved };
}
// เปลี่ยนแผนที่ (placeOnBoard): ทุกคนกลับกระดานหลัก
function resetAll() {
  for (const p of Object.values(match.players)) { p.dim = null; p.dimGhost = false; }
}
