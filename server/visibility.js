// ใครมองเห็นใครบนกระดาน — ระบบกลางของ "ล่องหน" ทุกแบบ
//  1. พุ่มหญ้า (ช่อง bush ใน Board.TERRAIN_INFO — พุ่มดอกไม้สูง / ป่าทึบ): ยืนอยู่แล้วศัตรูมองไม่เห็น
//     ยกเว้นศัตรูที่ยืนในพุ่มผืนเดียวกัน (Board.bushPatchOf) · โจมตี/ใช้ของ-สกิลใส่คนอื่น = โผล่จนจบเทิร์น (p.exposedRound)
//  2. ล่องหนของตัวละคร (hook stealthed — นักบินปริศนา): ศัตรูมองไม่เห็นเลย พุ่มหญ้าผืนเดียวกันก็ไม่เห็น
//  เพื่อนร่วมทีมเห็นกันเสมอ · จบเกม = เห็นทุกคน
//  ผลต่อกติกา: เล็ง/ตี/ยิงคนที่มองไม่เห็นไม่ได้ · สกิลพื้นที่แบบโจมตี (area.hostile) ยังโดน · เดินชนคนที่มองไม่เห็น = หยุดก่อนถึง (ซุ่มโจมตีแบบ FE)
//  ผู้ชมที่มองไม่เห็นได้ pos = null และไม่เห็นเส้นทางเดิน/บันทึกที่มีชื่อเขา (view.js)
// export ก่อน require: ไฟล์ใน server/ require วนกันเอง — function declaration ถูก hoist จึงพร้อมใช้ตั้งแต่บรรทัดแรก
Object.assign(module.exports, {
  stealthed, inBush, concealed, hiddenFrom, exposeBush, onHostileAct, onAreaHit, onBump, filterLog,
});

const CHAR_HOOKS = require("../characters/index");
const Board = require("./board");
const match = require("./match");
const { engine } = require("./engine");
const combat = require("./combat");

function hookOf(p) { return p ? CHAR_HOOKS[p.characterId] : null; }

// ล่องหนของตัวละคร (ไม่สนช่องที่ยืน)
function stealthed(p) {
  const hook = hookOf(p);
  return !!(p && p.alive && hook && hook.stealthed && hook.stealthed(p));
}
// ยืนในพุ่มหญ้าและยังไม่โผล่เทิร์นนี้
function inBush(p) {
  if (!p || !p.alive || !p.pos || !match.board) return false;
  if (p.exposedRound === match.roundNumber) return false;
  if ((p.boardSize | 0) > 1) return false; // ตัวใหญ่ (Echo ขยายร่าง) ซ่อนในพุ่มไม่ได้
  const map = Board.mapOf(match.board.area);
  return Board.bushPatchOf(map, p.pos.x, p.pos.y) !== null;
}
// ศัตรูอย่างน้อยบางคนมองไม่เห็นคนนี้อยู่ (ใช้วาดหมากโปร่งแสงให้ตัวเอง/เพื่อนร่วมทีม)
function concealed(p) {
  return stealthed(p) || inBush(p);
}
// viewer มองไม่เห็น target ไหม — viewer ไม่มี (ผู้ชมนอกเกม/เทสต์) = เห็น
function hiddenFrom(viewer, target) {
  if (!viewer || !target || viewer.id === target.id) return false;
  if (match.gameState === "GAMEOVER") return false;
  if (!target.alive || !target.pos) return false;
  if (combat.sameTeam(viewer, target)) return false;
  if (stealthed(target)) return true;
  if (!inBush(target)) return false;
  if (!viewer.alive || !viewer.pos) return true;
  const map = Board.mapOf(match.board.area);
  const a = Board.bushPatchOf(map, target.pos.x, target.pos.y);
  return a === null || a !== Board.bushPatchOf(map, viewer.pos.x, viewer.pos.y);
}
// โจมตี/ใส่ผลให้คนอื่นจากในพุ่ม = โผล่จนจบเทิร์น
function exposeBush(p) {
  if (p) p.exposedRound = match.roundNumber;
}
// โจมตีปกติ / ยิงปืน / ใช้ไอเทมใส่คนอื่น — พุ่มหญ้าโผล่ + ตัวละครล่องหนปรากฏตัว (hook onReveal "act")
function onHostileAct(p) {
  exposeBush(p);
  const hook = hookOf(p);
  if (hook && hook.onReveal) hook.onReveal(engine, p, "act");
}
// สกิลพื้นที่แบบโจมตี (area.hostile) โดนใคร — คนล่องหนที่เป็นศัตรูของผู้ใช้ปรากฏตัว (hook onReveal "hit")
function onAreaHit(user, ids) {
  for (const id of ids || []) {
    const t = match.players[id];
    if (!t || t.id === user.id || combat.sameTeam(user, t)) continue;
    const hook = hookOf(t);
    if (hook && hook.onReveal) hook.onReveal(engine, t, "hit");
  }
}
// มีคนเดินมาชนช่องที่ยืนอยู่ (ซุ่มโจมตีแบบ FE) — คนล่องหนปรากฏตัว (พุ่มหญ้าไม่มีผลเพิ่ม)
function onBump(mover, t) {
  const hook = hookOf(t);
  if (hook && hook.onReveal) hook.onReveal(engine, t, "bump");
}
// บันทึกที่ viewer เห็นได้: ตัดบรรทัดที่มีชื่อคนที่ viewer มองไม่เห็นอยู่ตอนนี้
//  + บรรทัดก่อนตัวละครล่องหนปรากฏตัว (hook logCut = index ที่ปรากฏตัวในบันทึกรอบนี้)
function filterLog(lines, viewer) {
  if (!viewer || match.gameState === "GAMEOVER") return lines;
  let out = lines.map((line, i) => ({ line, i }));
  for (const p of Object.values(match.players)) {
    if (p.id === viewer.id || !p.name || combat.sameTeam(viewer, p)) continue;
    const hook = hookOf(p);
    const cut = hiddenFrom(viewer, p) ? Infinity : (hook && hook.logCut ? hook.logCut(p, match.roundNumber) : 0);
    if (!cut) continue;
    out = out.filter(({ line, i }) => i >= cut || typeof line !== "string" || !line.includes(p.name));
  }
  return out.map(({ line }) => line);
}
