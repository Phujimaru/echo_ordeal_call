// ============================================================
//  ควบคุมร่าง (ระบบกลาง — "เข้าร่วมเผ่าพันธุ์" ของดิเอโก้ อสูรกายดึกดำบรรพ์ · GRID_PLAN §7.36 · GAME_SYSTEM §60)
//   match.possess = { [targetId]: { by, round } } — ตาเดินของเป้าในเทิร์น round ผู้เล่น by คุมแทน
//   · Duo.controlledId(by) → เป้า (แผงตัวเรา/ปุ่มสกิล/เดิน/ตี ของผู้คุมเป็นของเป้า — ใช้ท่อเดียวกับระบบคู่)
//   · เจ้าของตัวจริงสั่งอะไรไม่ได้ (controlledId → id ปลอม · canAct ไม่ผ่าน)
//   · ระหว่างคุม เป้าเป็นฝ่ายเดียวกับผู้คุม (combat.sameTeam → sideOf) — ตีเพื่อนเดิมของเป้าได้ ตีฝ่ายผู้คุมไม่ได้
//   · ใช้ไอเทม/ซื้อของไม่ได้ (shop.js) · ผลหมดเมื่อตาเดินนั้นจบ (clearActor) หรือเทิร์นผ่านไป (sweep)
// ============================================================
const match = require("./match");

const LOCKED_PREFIX = "possessed:";

function table() { return match.possess || (match.possess = {}); }
function entryOf(u) { return u && match.possess ? match.possess[u.id] || null : null; }
// ผลยังใช้ได้ (ผู้คุม/เป้ายังอยู่ · เทิร์นตรง)
function live(u) {
  const e = entryOf(u);
  if (!e || !u.alive || e.round !== match.roundNumber) return null;
  const by = match.players[e.by];
  return by && by.alive ? e : null;
}
// ตอนนี้ u กำลังถูกคุมอยู่จริง (ถึงตาของ u แล้ว)
function acting(u) { return !!(u && match.actorId === u.id && live(u)); }
function actorEntry() {
  const a = match.actorId && match.players[match.actorId];
  return a && acting(a) ? live(a) : null;
}

// ตั้งผล: ตาเดินของ t ในเทิร์น round ให้ by คุม
function mark(t, by, round) { table()[t.id] = { by: by.id, round }; }
function clear(id) { if (match.possess) delete match.possess[id]; }
function clearAll() { match.possess = {}; }
// เทิร์นที่ผ่านไปแล้ว = หมดผล (ตาของเป้าถูกข้าม/สตั้น)
function sweep() {
  if (!match.possess) return;
  for (const [id, e] of Object.entries(match.possess)) if (!(e.round >= match.roundNumber)) delete match.possess[id];
}

// ---------- ทางสั่งงาน (server/duo.js controlledId) ----------
// ผู้เล่น playerId คุมใครอยู่ตอนนี้ (null = ไม่ได้คุมใคร) · เป้าเอง = id ปลอม (สั่งอะไรไม่ได้)
function controlFor(playerId) {
  const e = actorEntry();
  if (!e) return null;
  if (e.by === playerId) return match.actorId;
  if (playerId === match.actorId) return LOCKED_PREFIX + playerId;
  return null;
}
// ฝ่ายของ u ตอนนี้ (กำลังถูกคุม = ผู้คุม)
function sideOf(u) {
  if (!acting(u)) return u;
  return match.players[live(u).by] || u;
}
// ผู้คุมของคนที่กำลังเดิน (null = ไม่มี)
function controllerOf(u) { return acting(u) ? match.players[live(u).by] || null : null; }
// ใช้ไอเทม/ซื้อของไม่ได้ระหว่างถูกคุม
function blocksItems(u) { return acting(u); }

module.exports = { LOCKED_PREFIX, entryOf, live, acting, mark, clear, clearAll, sweep, controlFor, sideOf, controllerOf, blocksItems };
