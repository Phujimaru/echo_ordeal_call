// ใครมองเห็นใครบนกระดาน — ระบบกลางของ "ล่องหน" ทุกแบบ
//  1. พุ่มหญ้า (ช่อง bush ใน Board.TERRAIN_INFO — พุ่มดอกไม้สูง / ป่าทึบ): ยืนอยู่แล้วศัตรูมองไม่เห็น
//     ยกเว้นศัตรูที่ยืนในพุ่มผืนเดียวกัน (Board.bushPatchOf) · โจมตี/ใช้ของ-สกิลใส่คนอื่น = โผล่จนจบเทิร์น (p.exposedRound)
//  2. ล่องหนของตัวละคร (hook stealthed — นักบินปริศนา): ศัตรูมองไม่เห็นเลย พุ่มหญ้าผืนเดียวกันก็ไม่เห็น
//  เพื่อนร่วมทีมเห็นกันเสมอ · จบเกม = เห็นทุกคน
//  ผลต่อกติกา: เล็ง/ตี/ยิงคนที่มองไม่เห็นไม่ได้ · สกิลพื้นที่แบบโจมตี (area.hostile) ยังโดน · เดินชนคนที่มองไม่เห็น = หยุดก่อนถึง (ซุ่มโจมตีแบบ FE)
//  มองในระยะ (พุ่มผืนเดียวกัน · seenBy · summon.sight) ระหว่างที่ยังเดินต่อได้ = นับจากช่องเริ่มตา (eyeOf)
//  ผู้ชมที่มองไม่เห็นได้ pos = null และไม่เห็นเส้นทางเดิน/บันทึกที่มีชื่อเขา (view.js)
// export ก่อน require: ไฟล์ใน server/ require วนกันเอง — function declaration ถูก hoist จึงพร้อมใช้ตั้งแต่บรรทัดแรก
Object.assign(module.exports, {
  stealthed, inBush, concealed, hiddenFrom, hiddenFromUnit, exposeBush, onHostileAct, onAreaHit, onBump, filterLog, markTurn,
});

const CHAR_HOOKS = require("../characters/index");
const Board = require("./board");
const match = require("./match");
const { engine } = require("./engine");
const combat = require("./combat");
const Duo = require("./duo");
const Soot = require("./soot");
const Dim = require("./dimension");

function hookOf(p) { return p ? CHAR_HOOKS[p.characterId] : null; }

// ล่องหนของตัวละคร (ไม่สนช่องที่ยืน)
function stealthed(p) {
  const hook = hookOf(p);
  return !!(p && p.alive && hook && hook.stealthed && hook.stealthed(p));
}
function seenBy(viewer, target) {
  const hook = hookOf(target);
  return !!(hook && hook.seenBy && viewer && viewer.alive && viewer.pos && hook.seenBy(engine, viewer, target));
}
// ยืนในพุ่มหญ้าและยังไม่โผล่เทิร์นนี้
function inBush(p) {
  if (!p || !p.alive || !p.pos || !match.board) return false;
  if (p.exposedRound === match.roundNumber) return false;
  if (engine.sizeOf(p) > 1) return false; // ตัวใหญ่ (Echo ขยายร่าง) ซ่อนในพุ่มไม่ได้
  const hook = hookOf(p);
  if (hook && hook.bushExposed && hook.bushExposed(p)) return false; // ซ่อนในพุ่มไม่ได้เลย (เซลิน)
  // แผนที่รวมชั้น (พุ่มดอกไม้ของเซลิน = พุ่ม · น้ำแข็ง/พื้นเปียกที่ทับดอกไม้ = ไม่ใช่พุ่มแล้ว)
  return Board.bushPatchOf(engine.boardMap(), p.pos.x, p.pos.y) !== null;
}
// ศัตรูอย่างน้อยบางคนมองไม่เห็นคนนี้อยู่ (ใช้วาดหมากโปร่งแสงให้ตัวเอง/เพื่อนร่วมทีม)
function concealed(p) {
  return stealthed(p) || inBush(p);
}
// viewer มองไม่เห็น target ไหม — viewer ไม่มี (ผู้ชมนอกเกม/เทสต์) = เห็น
//  ระบบคู่ (server/duo.js): สองตัวของผู้เล่นคนเดียวกันมองร่วมกัน — ตัวไหนเห็นก็เห็น
//  ยูนิตที่ถูกเรียกแบบคุมได้ (ร่างแยกของวาเลนไทน์ — server/summon.js) ก็เป็นสายตาของฝ่ายเจ้าของด้วย
function hiddenFrom(viewer, target) {
  const lead = viewer && viewer.summon && viewer.summon.controlled ? match.players[viewer.summon.ownerId] || viewer : viewer;
  const team = lead ? Duo.turnUnits(lead) : [];
  if (team.length > 1 || (viewer && viewer !== lead)) {
    const eyes = team.filter((u) => u.alive && u.pos);
    if (eyes.length) return eyes.every((u) => hiddenFromOne(u, target));
  }
  return hiddenFromOne(viewer, target);
}
// ตัวที่ลงมือ (เล็ง/ตี/ยิง/ส่งชุด) มองไม่เห็น target ไหม — เหมือน hiddenFrom แต่ม่านแดงนับจากตาของตัวนั้นเอง
//  ระบบคู่: ถูกขังในม่าน (หรืออยู่นอกม่าน) = อีกตัวที่อยู่คนละฝั่งช่วยเล็งข้ามม่านไม่ได้ · แผนที่ที่ผู้เล่นเห็นยังรวมสายตา (hiddenFrom)
function hiddenFromUnit(p, target) {
  return hiddenFrom(p, target) || (hiddenFromOne(p, target) && Soot.hiddenByStorm(p, target));
}
function hiddenFromOne(viewer, target) {
  if (!viewer || !target || viewer.id === target.id) return false;
  if (match.gameState === "GAMEOVER") return false;
  if (!target.alive || !target.pos) return false;
  if (Dim.unseen(viewer, target)) return true; // ชั้นมิติ: คนละมิติมองไม่เห็นกัน (เพื่อนร่วมทีมก็ไม่เห็น)
  if (combat.sameTeam(viewer, target)) return false;
  // Fodlan: หมอก (ด่าน II — server/fodlan/stage2.js hides) · ฮาคุโนะไม่มีในโหมดนี้
  if (require("./fodlan").hides(eyeOf(viewer), target)) return true;
  // เห็นทะลุทุกอย่างบนกระดานหลัก (summon.trueSight — ฮาคุโนะของ Moon Cell server/moonCell.js): ล่องหน · พุ่มหญ้า · ม่านแดง (ชั้นมิติยังบังตามด้านบน)
  if (viewer.summon && viewer.summon.trueSight) return false;
  // สายตาระยะใกล้ของยูนิตที่ถูกเรียก (summon.sight — ร่างแยกของวาเลนไทน์ 2 ช่อง): เห็นคนล่องหน/ในพุ่ม/ในม่านที่อยู่ใกล้เป็นคนปกติ (ผู้ใช้สั่ง 2026-10-21)
  //  การมองในระยะทุกแบบ (สายตานี้ · seenBy · พุ่มผืนเดียวกัน) นับจากช่องที่มอง (eyeOf) — ยังเดินต่อได้ = ช่องเริ่มตา
  const eye = eyeOf(viewer);
  if (viewer.summon && viewer.summon.sight > 0 && viewer.alive && viewer.pos && Board.dist(Board.boxOf(eye), Board.boxOf(target)) <= viewer.summon.sight) return false;
  // ล่องหนที่คนใกล้ๆ มองเห็น (ฮุคของเป้า seenBy(engine, viewer, target) → true = viewer เห็น — เฟิร์น: ซ่อนเร้นมานา ศัตรูในระยะ 2)
  //  ข้ามแค่ล่องหนของตัวละคร · พุ่มหญ้า/ม่านแดงยังบังตามปกติ
  if (stealthed(target) && !seenBy(eye, target)) return true;
  if (Soot.hiddenByStorm(viewer, target)) return true; // ม่านแดง (ระบำเขม่า): คนละฝั่งของม่านมองไม่เห็นกัน
  if (!inBush(target)) return false;
  if (!viewer.alive || !viewer.pos) return true;
  const map = engine.boardMap();
  const a = Board.bushPatchOf(map, target.pos.x, target.pos.y);
  return a === null || a !== Board.bushPatchOf(map, eye.pos.x, eye.pos.y);
}
// ช่องที่ viewer ใช้มองในระยะ (ผู้ใช้สั่ง 2026-10-24 — กันเดินวนทั้งแมพหาคนล่องหน):
//  ยังเดินต่อได้ (ตาของตัวเองที่ยังไม่ล็อก · ตัวในฝ่ายคู่/ร่างแยกที่สลับออกไปแล้วยังไม่ล็อก) = มองจากช่องเริ่มตา
//   (action.eye — rebaseMove เก็บไว้ · ไม่มี = action.from)
//  เดินต่อไม่ได้แล้ว (ล็อก — ใช้สกิล/ไอเทม/ซื้อ/ดูร้าน/ชน · จบตา · ไม่ใช่ตาของตัวเอง) = มองจากช่องที่ยืนจริง
//  คืนตัว viewer เอง หรือร่างเงา (Object.create — ฟิลด์อื่นอ่านผ่าน prototype) ที่ pos เป็นช่องเริ่มตา
function eyeOf(viewer) {
  const from = walkAnchor(viewer);
  if (!from || !viewer.pos || (from.x === viewer.pos.x && from.y === viewer.pos.y)) return viewer;
  const eye = Object.create(viewer);
  eye.pos = { x: from.x, y: from.y };
  return eye;
}
function walkAnchor(u) {
  if (!u || match.gameState !== "ACTION") return null;
  const a = match.actorId === u.id ? match.action : match.duo && match.duo.acts ? match.duo.acts[u.id] : null;
  return a && !a.locked ? a.eye || a.from : null;
}
// โจมตี/ใส่ผลให้คนอื่นจากในพุ่ม = โผล่จนจบเทิร์น
function exposeBush(p) {
  if (p) p.exposedRound = match.roundNumber;
}
// โจมตีปกติ / ยิงปืน / ใช้ไอเทมใส่คนอื่น — พุ่มหญ้าโผล่ + ตัวละครล่องหนปรากฏตัว (hook onReveal(engine, p, "act", how))
//  how = "strike" ตีปกติ (คน/ผนึก/หนาม) · "gun" ปืน GUTS · "slide" ไถลชน · "item" ใช้ไอเทมใส่คนอื่น (เฟิร์น: ไอเทมไม่ออกจากซ่อนเร้นมานา)
function onHostileAct(p, how) {
  exposeBush(p);
  const hook = hookOf(p);
  if (hook && hook.onReveal) hook.onReveal(engine, p, "act", how);
}
// สกิลพื้นที่แบบโจมตี (area.hostile) โดนใคร — คนล่องหนที่เป็นศัตรูของผู้ใช้ปรากฏตัว (hook onReveal "hit")
//  บรรทัดที่ผู้ใช้ก่อไว้ในตาเดินนี้ก่อนปรากฏตัว (เช่นดาเมจของการโจมตีนี้เอง) ฝ่ายผู้ใช้ยังเห็นได้ (witness — filterLog)
function onAreaHit(user, ids) {
  const st = logState();
  const side = Duo.sideKey(user);
  const from = st.turnSide === side ? st.turnAt : null;
  for (const id of ids || []) {
    const t = match.players[id];
    if (!t || t.id === user.id || combat.sameTeam(user, t)) continue;
    const hook = hookOf(t);
    if (!hook || !hook.onReveal) continue;
    if (from !== null && stealthed(t)) st.witness.push({ targetId: t.id, side, from, to: match.lastLog.length });
    hook.onReveal(engine, t, "hit");
  }
}
// มีคนเดินมาชนช่องที่ยืนอยู่ (ซุ่มโจมตีแบบ FE) — คนล่องหนปรากฏตัว (พุ่มหญ้าไม่มีผลเพิ่ม)
function onBump(mover, t) {
  const hook = hookOf(t);
  if (hook && hook.onReveal) hook.onReveal(engine, t, "bump");
}
// สถานะของบันทึกรอบนี้ (ผูกกับอาร์เรย์ lastLog — ต้นเทิร์นสร้างอาร์เรย์ใหม่ = ล้างเอง)
//  turnAt/turnSide = จุดเริ่มตาเดินปัจจุบัน (markTurn) · witness = [{ targetId, side, from, to }] ช่วงบรรทัดที่ฝ่าย side เห็นแม้ถูกตัด
const logStates = new WeakMap();
function logState() {
  let st = logStates.get(match.lastLog);
  if (!st) logStates.set(match.lastLog, (st = { turnAt: 0, turnSide: null, witness: [] }));
  return st;
}
// เริ่มตาเดินของฝ่าย side (action.nextActor) — จดตำแหน่งบันทึกไว้
function markTurn(side) {
  const st = logState();
  st.turnAt = match.lastLog.length;
  st.turnSide = side;
}
// บันทึกที่ viewer เห็นได้: ตัดบรรทัดที่มีชื่อคนที่ viewer มองไม่เห็นอยู่ตอนนี้
//  + บรรทัดก่อนตัวละครล่องหนปรากฏตัว (hook logCut = index ที่ปรากฏตัวในบันทึกรอบนี้)
//   ยกเว้นบรรทัดที่ฝ่ายของ viewer ก่อเองในตาที่ทำให้ปรากฏตัว (witness — onAreaHit)
function filterLog(lines, viewer) {
  if (!viewer || match.gameState === "GAMEOVER") return lines;
  const witness = (logStates.get(lines) || { witness: [] }).witness;
  const side = Duo.sideKey(viewer);
  let out = lines.map((line, i) => ({ line, i }));
  for (const p of Object.values(match.players)) {
    if (p.id === viewer.id || !p.name || p.summon || combat.sameTeam(viewer, p)) continue; // ยูนิตที่ถูกเรียก (ตัวเหมือนใช้ชื่อเป้า) ไม่ตัดบันทึก
    const hook = hookOf(p);
    const cut = hiddenFrom(viewer, p) ? Infinity : (hook && hook.logCut ? hook.logCut(p, match.roundNumber) : 0);
    if (!cut) continue;
    const own = cut === Infinity ? [] : witness.filter((w) => w.targetId === p.id && w.side === side);
    out = out.filter(({ line, i }) => i >= cut || typeof line !== "string" || !line.includes(p.name) || own.some((w) => i >= w.from && i < w.to));
  }
  return out.map(({ line }) => line);
}
