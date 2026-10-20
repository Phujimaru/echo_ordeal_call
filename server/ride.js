// ขี่ผู้เล่นอื่น — ระบบกลาง (ต้นแบบ: ยูนะ · characters/yuna.js) · ตัวที่ขี่ = rider.mountId (id ตัวที่ถูกขี่)
//  นอกตาเดินของตัวเอง: rider.pos = null — ไม่อยู่บนกระดาน (ไม่มีใครเล็ง/ตีได้ · สกิลพื้นที่โดนแค่ตัวที่ถูกขี่ · ไม่ขวางช่อง)
//   client วาดบนหลังตัวที่ถูกขี่ (state.players[].ride) · ตัวที่ถูกขี่เดิน = พาไปด้วยเอง (ไม่ต้องย้ายอะไร)
//  ตาเดินของตัวเอง (action.nextActor → seat): pos = ช่องของตัวที่ถูกขี่ — ใช้สกิล/ตีจากตรงนั้น
//   เดินออก = ลง (action.moveTo — act.dismount) · ย้อนการเดินกลับช่องเดิม = ขึ้นกลับ · จบตา (finishActor → unseat) = pos กลับเป็น null
//  ขอขี่ (socket rideAsk): ฮุค canRide(engine, p) · ตาของตัวเองและยังเดินได้ · อยู่ติดกัน (ระยะ 1) · อีกฝ่ายไม่ได้ขี่/ถูกขี่ · ตัวเล็ก 1×1
//   → match.rideAsk ค้างจนเจ้าของตัวที่ถูกขอกดตอบ (socket rideAnswer) หรือจบตาของคนขอ
//   ยินยอม = ขึ้นขี่ · ใช้การเดินของตานี้ไปแล้ว (เดินต่อ/ย้อนไม่ได้) แต่ยังใช้สกิล/ตีได้ (ผู้ใช้ตัดสิน 2026-10-18)
//  ร่วง (fall): ตัวที่ถูกขี่ถูกโจมตี (ตีปกติ รวมหลบพ้น · เสียพลังชีวิต/เกราะจากผู้เล่นอื่น) / ตาย → ลงช่องว่างใกล้สุดรอบตัวที่ถูกขี่
//   + ฮุค onFall(engine, rider, reason) ของตัวที่ขี่ (ยูนะ: ขี่ไม่ได้ 3 เทิร์น) · เปลี่ยนภูมิภาค = ลงเงียบๆ (clearAll — แจกจุดเกิดใหม่)
//  สั่งให้ลง (socket rideDrop — drop): ตัวที่ถูกขี่กดในตาเดินของตัวเอง (ไม่นับเป็นการกระทำ · ผู้ใช้ตัดสิน 2026-10-19) → fall(reason "drop")
// export ก่อน require: ไฟล์ใน server/ require วนกันเอง — function declaration ถูก hoist จึงพร้อมใช้ตั้งแต่บรรทัดแรก
Object.assign(module.exports, {
  mountOf, riderOf, riding, centerOf, seat, unseat, canAsk, ask, answer, cancelAsk, fall, drop, dismounted, clearAll, onAttacked, onDeath, publicAsk,
});

const CHAR_HOOKS = require("../characters/index");
const Board = require("./board");
const match = require("./match");
const { engine } = require("./engine");
const combat = require("./combat");
const action = require("./phases/action");
const view = require("./view");
const Duo = require("./duo");
const Visibility = require("./visibility");

const hookOf = (p) => (p ? CHAR_HOOKS[p.characterId] : null);

// ตัวที่ถูกขี่ (ยังอยู่บนกระดาน) — ไม่มี = null
function mountOf(p) {
  const m = p && p.mountId ? match.players[p.mountId] : null;
  return m && m.alive && m.pos ? m : null;
}
// คนที่ขี่ตัวนี้อยู่ — ไม่มี = null
function riderOf(m) {
  if (!m) return null;
  return Object.values(match.players).find((r) => r.alive && r.mountId === m.id) || null;
}
function riding(p) { return !!mountOf(p); }
// ช่องที่ใช้เป็นจุดกลาง (ออร่า/ระยะ) — ยืนเอง = pos · ขี่ = ช่องของตัวที่ถูกขี่
function centerOf(p) {
  if (!p) return null;
  if (p.pos) return p.pos;
  const m = mountOf(p);
  return m ? m.pos : null;
}
// เริ่มตาเดินของตัวที่ขี่: วางลงช่องของตัวที่ถูกขี่ (ตัวที่ถูกขี่หายไปแล้ว = ลงข้างๆ)
function seat(p) {
  if (!p || !p.mountId || !p.alive) return;
  const m = mountOf(p);
  if (m) { p.pos = { ...m.pos }; return; }
  p.mountId = null;
  if (!p.pos && p.lastRidePos) p.pos = action.nearFreeTile(p.lastRidePos);
}
// จบตาเดินของตัวที่ขี่: ขึ้นไปอยู่บนหลังต่อ (ไม่อยู่บนกระดาน)
function unseat(p) {
  if (!p || !riding(p)) return;
  p.lastRidePos = { ...mountOf(p).pos };
  p.pos = null;
}

// ขอขี่ได้ไหม (ไม่สนว่ามีคำขอค้างอยู่) — ตาของตัวเอง · ยังเดินได้ · ติดกัน · อีกฝ่ายว่าง
function canAsk(p, t) {
  if (!p || !t || p.id === t.id || !t.alive || !t.pos || !p.pos) return false;
  if (p.summon || t.summon || (p.dim || null) !== (t.dim || null)) return false; // ยูนิตที่ถูกเรียก / คนละชั้นมิติ ขี่ไม่ได้
  if (!action.canAct(p) || match.action.locked || match.action.dismount) return false; // เพิ่งลงจากหลังตานี้ = ขึ้นใหม่ไม่ได้
  if (p.mountId || t.mountId || riderOf(t) || riderOf(p)) return false;
  const hook = hookOf(p);
  if (!hook || !hook.canRide || !hook.canRide(engine, p)) return false;
  if (action.sizeOf(t) > 1 || action.sizeOf(p) > 1) return false;
  if (Visibility.hiddenFromUnit(p, t)) return false;
  return Board.dist(action.boxOf(p), action.boxOf(t)) === 1;
}
function ask(id, targetId) {
  const p = match.players[id], t = match.players[targetId];
  if (!canAsk(p, t)) return false;
  match.rideAsk = { from: p.id, to: t.id, seq: (match.rideAsk && match.rideAsk.seq ? match.rideAsk.seq : 0) + 1 };
  const hook = hookOf(p);
  if (hook && hook.rideSound) engine.sfx(hook.rideSound(p, "ask"));
  view.broadcastState();
  return true;
}
// เจ้าของตัวที่ถูกขอกดตอบ (ownerId = id ผู้เล่นที่ส่ง socket — ระบบคู่: เจ้าของฝ่าย)
function answer(ownerId, ok) {
  const q = match.rideAsk;
  if (!q) return false;
  const p = match.players[q.from], t = match.players[q.to];
  if (!t || Duo.sideKey(t) !== ownerId) return false;
  match.rideAsk = null;
  const hook = hookOf(p);
  if (!ok || !canAsk(p, t)) {
    if (p && t) match.lastLog.push(`🙅 ${t.name} ไม่ให้ ${p.name} ขี่`);
    if (hook && hook.rideSound) engine.sfx(hook.rideSound(p, "no"));
    view.broadcastState();
    return false;
  }
  const from = { ...p.pos };
  p.mountId = t.id;
  p.pos = { ...t.pos };
  const a = match.action;
  a.from = { ...p.pos };
  a.moved = false; a.path = null; a.trail = null; a.dismount = null;
  a.locked = true; // ขึ้นขี่ = ใช้การเดินของตานี้แล้ว (ยังใช้สกิล/ตีได้)
  match.lastLog.push(`🎠 ${p.name} ขึ้นขี่ ${t.name}`);
  if (hook && hook.onMount) combat.withEffectSource(p, () => hook.onMount(engine, p, t, from));
  view.broadcastState();
  return true;
}
function cancelAsk() {
  if (match.rideAsk) match.rideAsk = null;
}
// ร่วงจากหลัง → ช่องว่างใกล้สุดรอบตัวที่ถูกขี่ · reason = "hit" | "death" | "gone"
function fall(p, reason = "hit") {
  if (!p || !p.mountId) return;
  const m = match.players[p.mountId];
  const base = (m && m.pos) || p.pos || p.lastRidePos || null;
  p.mountId = null;
  const actor = match.actorId === p.id && match.action;
  const to = base ? action.nearFreeTile(base, p.id) : null;
  if (to) p.pos = to;
  else if (!p.pos && base) p.pos = { ...base }; // ไม่มีช่องว่างเลย (ไม่ควรเกิด) = ยืนช่องเดิม
  if (actor && p.pos) { match.action.from = { ...p.pos }; match.action.locked = true; match.action.dismount = null; }
  match.lastLog.push(`💫 ${p.name} ร่วงลงจากหลัง${m ? ` ${m.name}` : ""}`);
  const hook = hookOf(p);
  if (hook && hook.onFall) hook.onFall(engine, p, reason, base);
}
// ลงจากหลังเอง (เดินออกแล้วจบตา — action.finishActor) → ฮุค onDismount(engine, p, reason)
function dismounted(p, reason = "walk") {
  const hook = hookOf(p);
  if (hook && hook.onDismount) hook.onDismount(engine, p, reason);
}
// ตัวที่ถูกขี่สั่งให้ลง (ตาเดินของตัวเอง · ไม่ล็อกการเดิน/ไม่กินอะไร)
function drop(id) {
  const m = match.players[id];
  if (!action.canAct(m, { move: true })) return false;
  const r = riderOf(m);
  if (!r) return false;
  match.lastLog.push(`🙇 ${m.name} ให้ ${r.name} ลงจากหลัง`);
  fall(r, "drop");
  view.broadcastState();
  return true;
}
// เปลี่ยนภูมิภาค (placeOnBoard): ทุกคนลงจากหลัง — จุดเกิดใหม่แจกให้ตามปกติ
function clearAll() {
  for (const p of Object.values(match.players)) { p.mountId = null; p.lastRidePos = null; }
  match.rideAsk = null;
}
// ตัวที่ถูกขี่ถูกโจมตี (attack.strike · combat.tookDamage จากผู้เล่นอื่น) → คนขี่ร่วง
function onAttacked(target, source) {
  const r = riderOf(target);
  if (!r || (source && source.id === r.id)) return;
  fall(r, "hit");
}
// มีคนตาย (combat.instantDeath ก่อน pos ถูกล้าง): ตัวที่ขี่ตาย = จำช่องไว้เป็นที่ทิ้งศพ · ตัวที่ถูกขี่ตาย = คนขี่ร่วง
function onDeath(p) {
  if (p.mountId) {
    const m = match.players[p.mountId];
    if (!p.pos && m && m.pos) p.pos = { ...m.pos };
    p.mountId = null;
  }
  const r = riderOf(p);
  if (r) fall(r, "death");
  if (match.rideAsk && (match.rideAsk.from === p.id || match.rideAsk.to === p.id)) match.rideAsk = null;
}
// คำขอขี่ที่ผู้ชมคนนี้ต้องเห็น (คนขอ / เจ้าของตัวที่ถูกขอ) — อื่นๆ = null
function publicAsk(viewerId) {
  const q = match.rideAsk;
  if (!q) return null;
  const p = match.players[q.from], t = match.players[q.to];
  if (!p || !t) return null;
  const mine = Duo.sideKey(t) === viewerId, asker = Duo.sideKey(p) === viewerId;
  if (!mine && !asker) return null;
  return { from: p.id, to: t.id, seq: q.seq, mine, fromName: p.name, fromImg: view.displayImg(p), fromColor: engine.colorOf(p) };
}
