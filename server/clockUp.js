// ============================================================
//  Clock Up — หลายคนขยับพร้อมกันแบบเรียลไทม์ (ไรเดอร์ ZECT · Faiz Start Up — GRID_PLAN §7.28 · GAME_SYSTEM §46)
//
//  "ช่วง Clock Up" = ตาเดินหนึ่งตาที่มีสมาชิกหลายคน (คล้ายระบบคู่ server/duo.js แต่ทุกคนกดได้พร้อมกัน)
//   · match.clockUp = { owner, seq, music, members: { id: { kind, left, hits, max, done, over, act } }, duel }
//   · owner = เจ้าของตานี้ในลำดับเดิน (กดในตาตัวเอง) หรือผู้แทรก (ตาพิเศษ kind "clockUp" — TimeStop.interrupt)
//   · คนที่กำลังถือตา (match.actorId/match.action) สลับไปหาสมาชิกที่ส่งคำสั่งมา (claim — socket onUnitEvent)
//     ตาของสมาชิกคนอื่นเก็บไว้ที่ members[id].act · เดินแล้วสลับออก = rebaseMove (เดินต่อจากช่องที่ยืนด้วยระยะที่เหลือ)
//   · เวลา: ตัวจับเวลาเฟส ACTION ระหว่างช่วงนี้เดินทีละ 1 วิ (timers.startPhaseTimer บังคับ) → tick() ลดเวลาของสมาชิกทุกคน
//     นับเฉพาะตอนเกมอยู่ ACTION (ฉากตี/คลิปไม่กินเวลา) · เวลาของใครหมด = คนนั้นจบ
//   · สมาชิกจบ (ตีครบ / รอ / หมดเวลา) = Clock Over หยุดนิ่ง โดนตีได้อิสระ · ทุกคนจบ = ช่วงจบ → เจ้าของตาจบตา
//     (ตาพิเศษที่แทรก → กลับตาที่ถูกแทรกด้วยเวลาที่เหลือ)
//   · สมาชิกที่ยังไม่จบตีกันเอง = QTE กดรัว (duel) ผู้ชนะตีปกติ 1 ครั้ง · เสมอไม่มีใครตี · จบแล้วแยกห่างกัน 2 ช่อง
//   · ตัวหยุดเวลาแทรก (ตาพิเศษของคนนอกช่วง) = คนถือตาไม่ใช่สมาชิก → สมาชิกกด/นับเวลาไม่ได้จนกลับมา
//  ตัวละครใช้ผ่าน engine.clockUp.* · ฮุคของตัวละคร: onClockDone(engine, p, why) ตอนสมาชิกคนนั้นจบ
// ============================================================
Object.assign(module.exports, {
  active, owns, memberOf, activeMember, isActiveMember, start, join, canEnter, enter, beginExtra,
  claim, tick, afterStrike, countHit, memberFinish, duelWanted, startDuel, mash, walked,
  asViewer, publicInfo, skipsRound, musicOf, forceSecond, reset,
});

const CHAR_HOOKS = require("../characters/index");
const match = require("./match");
const { engine } = require("./engine");
const combat = require("./combat");
const timers = require("./timers");
const view = require("./view");
const Board = require("./board");

const DUEL_SECONDS = 3;
const DUEL_PUSH = 2;
const STEP_MS = 70; // เดินในช่วง Clock Up: ms ต่อช่อง (client/src/board/BoardStage.jsx CLOCK_STEP_MS — ต้องตรงกัน)
const CLASH_MS = 650; // ชนกัน: เสียงกระแทก + แสงปะทะบนกระดานก่อน แล้วหน้าต่างกดรัวค่อยขึ้น
const { RESYNC_EVERY } = require("./constants");
const { io } = require("./app");

const action = () => require("./phases/action");

function active() { return match.clockUp || null; }
function memberOf(p) {
  const s = match.clockUp;
  const id = p && (typeof p === "string" ? p : p.id);
  return (s && id && s.members[id]) || null;
}
function activeMember(p) {
  const m = memberOf(p);
  return m && !m.done ? m : null;
}
function isActiveMember(p) {
  const m = activeMember(p);
  const u = m && match.players[typeof p === "string" ? p : p.id];
  return !!(u && u.alive && u.pos);
}
// ช่วงนี้ถือตาอยู่ (คนถือตาเป็นสมาชิก) — ตาพิเศษของคนนอก (หยุดเวลาแทรก) = ไม่
function owns() {
  const s = match.clockUp;
  return !!(s && match.actorId && s.members[match.actorId]);
}
function reset() { match.clockUp = null; }

// ---------- เริ่ม / เข้าร่วม ----------
//  opts = { kind: "zect" | "faiz", secs, max, music }
function newMember(p, opts) {
  return { kind: opts.kind || "zect", left: Math.max(1, Math.ceil(opts.secs || 1)), hits: 0, max: opts.max || 2, done: false, over: false, act: null, at: engine.severStamp() };
}
// เริ่มช่วงใหม่ในตาเดินที่ p ถือตาอยู่ (ตาตัวเอง หรือตาพิเศษที่แทรกมา) — ระยะเดินนับใหม่จากช่องที่ยืน
function start(p, opts) {
  if (match.clockUp) return join(p, opts);
  match.clockUp = { owner: p.id, seq: ++clockSeq, music: opts.music || null, members: { [p.id]: newMember(p, opts) }, duel: null };
  action().freshMove(p);
  restartClock();
  return match.clockUp.members[p.id];
}
let clockSeq = 0;
// เข้าร่วมช่วงที่มีอยู่ (นอกตาตัวเอง) — ตาของคนนี้เริ่มจากช่องที่ยืน
function join(p, opts) {
  const s = match.clockUp;
  if (!s) return null;
  const m = newMember(p, opts);
  m.act = { from: { ...p.pos }, moved: false, locked: false };
  s.members[p.id] = m;
  if (!s.music && opts.music) s.music = opts.music;
  loseTurn(p);
  return m;
}
// แทรก/เข้าร่วมตอนยังไม่ได้เดินในเทิร์นนี้ = เสียตาเดินปกติของเทิร์นนี้ · เดินไปแล้ว = ไม่เสีย (ผู้ใช้ตัดสิน 2026-11-07)
function loseTurn(p) {
  const a = action();
  if (a.hasActed(p.id)) return;
  if (!match.turnOrder.includes(p.id)) return;
  p.clockSkipRound = match.roundNumber;
}
function skipsRound(u) {
  return !!u && u.clockSkipRound === match.roundNumber;
}

// กดนอกตาตัวเองได้ไหม → "join" | "interrupt" | null
//  แทรกตาของตัวหยุดเวลาไม่ได้: ระหว่างเวลาหยุด / ตาพิเศษใดๆ ที่ไม่ใช่ช่วง Clock Up (ดิโอ Za warudo · ดิเอโก้ เดอะเวิลด์)
function canEnter(p) {
  if (!p || !p.alive || !p.pos || match.gameState !== "ACTION" || match.timeFreeze) return null;
  if (memberOf(p)) return null;
  if (owns()) return "join";
  const actor = match.players[match.actorId];
  if (!actor || actor.id === p.id || !match.action || match.action.extra) return null;
  if (actor.summon && actor.summon.side && String(actor.summon.side).startsWith("moon")) return null; // บอส AI (Moon Cell)
  return "interrupt";
}
// กดนอกตาตัวเอง: เข้าร่วม หรือแทรกเป็นตาพิเศษ (ตาที่ถูกแทรกเดินต่อหลังช่วงจบ)
function enter(p, opts) {
  const how = canEnter(p);
  if (!how) return false;
  if (how === "join") { join(p, opts); view.broadcastState(); return true; }
  p.clockPending = opts;
  loseTurn(p);
  require("./timeStop").interrupt(p.id, "clockUp", match.timeLeft);
  return true;
}
// ตาพิเศษ kind "clockUp" เริ่ม (action.startExtra) — สร้างช่วงจากคำขอที่ค้างไว้
function beginExtra(p) {
  const opts = p.clockPending;
  p.clockPending = null;
  if (!opts) return;
  match.clockUp = { owner: p.id, seq: ++clockSeq, music: opts.music || null, members: { [p.id]: newMember(p, opts) }, duel: null };
}

// ---------- ถือตา ----------
// สมาชิกส่งคำสั่ง → สลับตาไปหาคนนั้น (เดินแล้วสลับออก = เดินต่อจากช่องที่ยืนด้วยระยะที่เหลือ)
function claim(id) {
  const s = match.clockUp;
  if (!s || match.gameState !== "ACTION" || !owns() || id === match.actorId) return false;
  const m = activeMember(id);
  const u = match.players[id];
  if (!m || !u || !u.alive || !u.pos) return false;
  switchTo(id);
  return true;
}
function switchTo(id) {
  const s = match.clockUp;
  const cur = match.players[match.actorId];
  const curM = s.members[match.actorId];
  if (curM && match.action) {
    if (match.action.moved) action().rebaseMove(cur);
    curM.act = match.action;
  }
  const m = s.members[id];
  const u = match.players[id];
  match.actorId = id;
  match.action = m.act || { from: { ...u.pos }, moved: false, locked: false };
  m.act = null;
}

// ---------- เวลา ----------
// ตัวจับเวลาเฟส ACTION ระหว่างช่วง = 1 วิเสมอ (timers.startPhaseTimer เรียกตรงนี้)
function forceSecond(seconds, onExpire) {
  if (!owns() || onExpire !== action().actionTimeUp) return seconds;
  return 1;
}
function restartClock() {
  if (match.gameState === "ACTION" && owns()) timers.startPhaseTimer(1, action().actionTimeUp);
}
// ครบ 1 วิของช่วง (action.actionTimeUp ส่งมา) — ลดเวลาของทุกคนที่ยังไม่จบ
function tick() {
  const s = match.clockUp;
  if (!s) return false;
  let curOut = false;
  for (const [id, m] of Object.entries(s.members)) {
    if (m.done) continue;
    m.left -= 1;
    if (m.left > 0) continue;
    if (id === match.actorId) curOut = true;
    else markDone(id, "time");
  }
  if (curOut) {
    if (match.action) match.action.expired = true;
    action().finishActor();
    return true;
  }
  restartClock();
  // ทุกวินาทีส่งแค่ "tick" (เวลาของผู้ชมแต่ละคน) — state ตัวเต็มทุกวิทำให้ทั้งจอ re-render = กระตุกเป็นจังหวะ (tickStore.js)
  s.ticks = (s.ticks || 0) + 1;
  if (s.ticks % RESYNC_EVERY === 0) view.broadcastState();
  else emitTicks(s);
  return true;
}
function emitTicks(s) {
  const live = Object.values(s.members).filter((x) => !x.done).map((x) => x.left);
  const all = live.length ? Math.max(...live) : 0;
  const Duo = require("./duo");
  for (const p of Object.values(match.players)) {
    if (p.duoOf || p.summon) continue;
    const m = s.members[Duo.controlledId(p.id) || p.id];
    io.to(p.id).emit("tick", m && !m.done ? m.left : all);
  }
}

// ---------- นับการตี ----------
// ตีปกติของสมาชิกจบ (strikeTarget done) → true = ยังตีได้อีก (เดินใหม่เต็มระยะ · กลับเข้าตาด้วยเวลาที่เหลือ)
function afterStrike(p) {
  const m = activeMember(p);
  if (!m || match.actorId !== p.id) return null;
  m.hits += 1;
  if (m.hits >= m.max || !p.alive || !p.pos) return false;
  action().freshMove(p);
  return true;
}
// ท่าไม้ตายที่ตีเป้า (Rider Shooting / Sting / Slash) นับ 1 ครั้ง → true = ครบแล้ว (ผู้เรียกจบตาผ่านฮุค endsTurn)
function countHit(p) {
  const m = activeMember(p);
  if (!m) return false;
  m.hits += 1;
  if (m.hits < m.max) { if (match.actorId === p.id) action().freshMove(p); return false; }
  return true;
}

// ---------- สมาชิกจบ ----------
function markDone(id, why) {
  const s = match.clockUp;
  const m = s && s.members[id];
  if (!m || m.done) return;
  m.done = true;
  m.over = true;
  const u = match.players[id];
  if (u) {
    const hook = CHAR_HOOKS[u.characterId];
    if (hook && hook.onClockDone) combat.withEffectSource(u, () => combat.runHook(hook, "onClockDone", engine, u, why));
    match.lastLog.push(`⏱️ ${u.name} Clock Over`);
  }
}
// action.finishActor: คนถือตาเป็นสมาชิก → จบเฉพาะคนนั้น ส่งตาให้สมาชิกคนต่อไป · ทุกคนจบ = ช่วงจบ แล้วเจ้าของตาจบตาตามปกติ
//  คืน true = จัดการแล้ว (ผู้เรียก return) · false = ไม่ใช่ช่วง Clock Up
function memberFinish(p, expired) {
  const s = match.clockUp;
  if (!s || !p || !s.members[p.id]) return false;
  markDone(p.id, expired ? "time" : "end");
  // ตาของคนที่จบเก็บไว้ (เจ้าของตา: ตาพิเศษมี resume — ช่วงจบแล้วต้องกลับตาที่ถูกแทรก)
  if (match.actorId === p.id && match.action) s.members[p.id].act = match.action;
  const next = Object.keys(s.members).find((id) => !s.members[id].done && isActiveMember(id));
  if (next) {
    timers.clearPhaseTimer();
    match.actorId = next;
    const m = s.members[next];
    const u = match.players[next];
    match.action = m.act || { from: { ...u.pos }, moved: false, locked: false };
    m.act = null;
    match.gameState = "ACTION";
    restartClock();
    view.broadcastState();
    return true;
  }
  end();
  return true;
}
// ช่วงจบ: ตาเดินกลับเป็นของเจ้าของตา แล้วจบตาตามปกติ (ตาพิเศษที่แทรก = กลับไปตาที่ถูกแทรก)
function end() {
  const s = match.clockUp;
  match.clockUp = null;
  const owner = match.players[s.owner];
  timers.clearPhaseTimer();
  if (owner && match.actorId !== owner.id) {
    match.actorId = owner.id;
    const om = s.members[owner.id];
    match.action = (om && om.act) || match.action;
  }
  if (match.action) match.action.clockEnded = true;
  match.lastLog.push("⏱️ Clock Up จบ — เวลากลับมาเดินตามปกติ");
  action().finishActor();
}

// ---------- ชนกัน: QTE กดรัว ----------
function duelWanted(p, t) {
  return !!(owns() && activeMember(p) && activeMember(t) && p.id !== t.id && !(match.clockUp && match.clockUp.duel) && !combat.sameTeam(p, t));
}
// ชนกัน: หมากหยุดทันที → (เดินถึงก่อน leadMs) → เสียงกระแทก + แสงปะทะ → หน้าต่างกดรัว DUEL_SECONDS วิ → ผล
//  ระหว่างนี้ ATTACKING (นาฬิกาของช่วงหยุด) · duel.open = หน้าต่างกดรัวขึ้นแล้ว (client เห็นเฉพาะตอนเปิด)
function startDuel(p, t, done, leadMs = 0) {
  const s = match.clockUp;
  timers.clearPhaseTimer();
  if (match.action) match.action.locked = true;
  const d = { a: p.id, b: t.id, counts: { [p.id]: 0, [t.id]: 0 }, until: 0, seq: ++duelSeq, winner: null, open: false };
  s.duel = d;
  match.gameState = "ATTACKING";
  match.lastLog.push(`💥 ${p.name} พุ่งชน ${t.name}`);
  const live = () => match.clockUp === s && s.duel === d;
  const clash = () => {
    if (!live()) return;
    // เสียงชนแรง (parry) มาก่อนทุกอย่าง + แสงปะทะกลางสองหมาก (client/src/board/zectFx.js zClash)
    engine.sfx("zect_parry");
    if (p.pos && t.pos) engine.boardFx("zectFx", { kind: "zClash", from: { ...p.pos }, to: { ...t.pos } });
    timers.startPhaseTimer(CLASH_MS / 1000, open);
  };
  const open = () => {
    if (!live()) return;
    d.open = true;
    d.until = Date.now() + DUEL_SECONDS * 1000;
    timers.startPhaseTimer(DUEL_SECONDS, () => resolveDuel(done));
    view.broadcastState();
  };
  if (leadMs > 0) timers.startPhaseTimer(leadMs / 1000, clash);
  else clash();
  view.broadcastState();
  return true;
}
// เดินในช่วง Clock Up (action.walkTo — ก่อน broadcast): ภาพเดินเร็วตามเส้นทางให้ทุกคนเห็นพร้อมกัน (หลายคนเดินพร้อมกันได้)
//  แล้วเช็คชน: หยุดติดสมาชิกฝั่งตรงข้ามที่ยังไม่จบ = ชนกันทันที (ผู้ใช้สั่ง 2026-11-07 — ไม่ต้องกดโจมตี)
function walked(p, path) {
  if (!owns() || match.actorId !== p.id || !activeMember(p)) return false;
  const pts = Array.isArray(path) ? path.map((t) => ({ x: t.x, y: t.y })) : [];
  if (pts.length > 1) view.emitVisible("clockWalk", { id: p.id, path: pts, step: STEP_MS, seq: ++walkSeq }, p);
  const body = { ...p.pos, size: Math.max(1, p.boardSize | 0) };
  const foe = Object.keys(match.clockUp.members).map((id) => match.players[id])
    .find((u) => u && u.alive && u.pos && duelWanted(p, u) && Board.dist(body, { ...u.pos, size: Math.max(1, u.boardSize | 0) }) === 1);
  if (!foe) return false;
  const lead = Math.max(0, pts.length - 1) * STEP_MS + 40;
  return startDuel(p, foe, () => action().finishActor(), lead);
}
let walkSeq = 0;
let duelSeq = 0;
function mash(id) {
  const d = match.clockUp && match.clockUp.duel;
  if (!d || !d.open || d.winner !== null || Date.now() > d.until) return;
  if (!(id in d.counts)) return;
  d.counts[id] += 1;
}
function resolveDuel(done) {
  const s = match.clockUp;
  const d = s && s.duel;
  if (!d) { done(); return; }
  const a = match.players[d.a], b = match.players[d.b];
  const ca = d.counts[d.a] || 0, cb = d.counts[d.b] || 0;
  const win = ca > cb ? a : cb > ca ? b : null;
  const lose = win === a ? b : win === b ? a : null;
  d.winner = win ? win.id : "";
  d.result = { [d.a]: ca, [d.b]: cb };
  const after = () => {
    s.duel = null;
    pushApart(a, b);
    if (win && win.alive && match.clockUp) {
      // ผู้ชนะ = ตีปกติ 1 ครั้งของคนนั้น
      const wm = s.members[win.id];
      if (wm && !wm.done) {
        wm.hits += 1;
        if (wm.hits >= wm.max) markDone(win.id, "hits");
        else if (match.actorId === win.id) action().freshMove(win);
      }
    }
    // ตาคืนให้คนที่พุ่งเข้าชน (ยังไม่จบ) · จบแล้ว = สมาชิกคนต่อไป
    const back = match.players[d.a];
    if (!match.clockUp) { done(); return; }
    if (back && activeMember(back) && back.alive && back.pos) {
      if (match.actorId !== back.id) switchToAny(back.id);
      if (match.action) match.action.locked = false;
      match.gameState = "ACTION";
      restartClock();
      view.broadcastState();
      return;
    }
    memberFinish(match.players[match.actorId] || back, false);
  };
  if (!win || !lose || !lose.alive || !lose.pos) {
    match.lastLog.push(`💥 ${a.name} ${ca} : ${cb} ${b.name} — เสมอ ไม่มีใครได้ตี`);
    after();
    return;
  }
  match.lastLog.push(`💥 ${a.name} ${ca} : ${cb} ${b.name} — ${win.name} ชนะ`);
  // ผู้ชนะถือตาระหว่างฉากตี
  switchToAny(win.id);
  require("./phases/attack").boardAttack(win, lose, after);
}
// สลับคนถือตาแบบไม่ต้องอยู่ ACTION (ระหว่างฉาก)
function switchToAny(id) {
  const s = match.clockUp;
  if (!s || match.actorId === id || !s.members[id]) return;
  switchTo(id);
}
// แยกห่างกัน 2 ช่อง (ตามแนวแกนที่ห่างกันมากกว่า · ชนของ = หยุดก่อน)
function pushApart(a, b) {
  if (!a || !b || !a.pos || !b.pos || !a.alive || !b.alive) return;
  const dx = Board.wdx ? Board.wdx(a.pos.x, b.pos.x) : b.pos.x - a.pos.x;
  const dy = b.pos.y - a.pos.y;
  const dir = Math.abs(dx) >= Math.abs(dy) ? { x: Math.sign(dx) || 1, y: 0 } : { x: 0, y: Math.sign(dy) || 1 };
  const ctx = engine.ice.begin();
  engine.ice.pushUnit(b, dir, ctx, DUEL_PUSH);
  engine.ice.pushUnit(a, { x: -dir.x, y: -dir.y }, ctx, DUEL_PUSH);
  engine.ice.flush(ctx);
  for (const u of [a, b]) {
    const m = activeMember(u);
    if (m && m.act) m.act = { from: { ...u.pos }, moved: false, locked: false, movLeft: m.act.movLeft };
  }
  if (match.action && match.players[match.actorId] && match.players[match.actorId].pos) {
    const cur = match.players[match.actorId];
    if ([a.id, b.id].includes(cur.id)) { match.action.from = { ...cur.pos }; match.action.moved = false; match.action.path = null; match.action.trail = null; }
  }
}

// ---------- ผู้ชม ----------
// buildStateFor: สมาชิกที่ไม่ได้ถือตาเห็นตาของตัวเอง (actorId/action/เวลา) — สลับชั่วคราวแล้วคืน
function asViewer(viewerId, fn) {
  const s = match.clockUp;
  if (!s || !owns()) return fn();
  const m = s.members[viewerId];
  const saved = { actorId: match.actorId, action: match.action, timeLeft: match.timeLeft };
  try {
    if (m && !m.done && viewerId !== match.actorId && match.gameState === "ACTION" && isActiveMember(viewerId)) {
      match.actorId = viewerId;
      match.action = m.act || { from: { ...match.players[viewerId].pos }, moved: false, locked: false };
    } else if ((!m || m.done) && s.owner && match.players[s.owner] && match.actorId !== s.owner) {
      // คนดู (ไม่ได้อยู่ในช่วง / Clock Over แล้ว): เห็นเจ้าของตาถือตาตลอดช่วง — ไม่ใช่สลับไปมาตามคนที่ส่งคำสั่ง (ป้าย "ตาของ…" เด้งรัว)
      const om = s.members[s.owner];
      match.actorId = s.owner;
      if (om && om.act) match.action = om.act;
    }
    const own = m && !m.done ? m.left : Math.max(0, ...Object.values(s.members).filter((x) => !x.done).map((x) => x.left));
    match.timeLeft = own;
    return fn();
  } finally {
    match.actorId = saved.actorId;
    match.action = saved.action;
    match.timeLeft = saved.timeLeft;
  }
}
function publicInfo() {
  const s = match.clockUp;
  if (!s) return null;
  return {
    seq: s.seq, owner: s.owner, music: s.music,
    members: Object.entries(s.members).map(([id, m]) => ({ id, kind: m.kind, left: m.left, hits: m.hits, max: m.max, over: m.over })),
    duel: s.duel && s.duel.open ? { seq: s.duel.seq, a: s.duel.a, b: s.duel.b, until: s.duel.until, winner: s.duel.winner, result: s.duel.result || null } : null,
    paused: !owns(),
  };
}
// เพลงของช่วง (view.activeSkillMusic) — FULL FORCE ตั้งแต่ไรเดอร์คนแรก เล่นต่อเนื่องเมื่อมีคนเข้าร่วม
function musicOf() {
  const s = match.clockUp;
  return s && s.music ? { music: s.music, at: s.seq } : null;
}
