// ย้อนเทิร์น (snapshot) + Overload Force
// export ก่อน require: ไฟล์ใน server/ require วนกันเอง — function declaration ถูก hoist จึงพร้อมใช้ตั้งแต่บรรทัดแรก
Object.assign(module.exports, {
  captureTurnSnapshot, clearTurnSnapshot, restoreTurnSnapshot, triggerOverloadForce,
});

const { OVERLOAD_FORCE_CHANCE, OVERLOAD_FORCE_CUTSCENE_SECONDS } = require("./constants");
const match = require("./match");
const combat = require("./combat");
const cutscene = require("./cutscene");
const cardDeck = require("./deck");
const draw = require("./phases/draw");
const summary = require("./phases/summary");
const timers = require("./timers");
const view = require("./view");

function captureTurnSnapshot() {
  try {
    match.turnSnapshot = {
      players: structuredClone(match.players),
      roundSkills: structuredClone(match.roundSkills),
      shopItems: structuredClone(match.shopItems),
      g: { cycleShift: match.cycleShift, transformCounter: match.transformCounter },
    };
  } catch { match.turnSnapshot = null; }
}

function clearTurnSnapshot() { match.turnSnapshot = null; }

function restoreTurnSnapshot() {
  const snap = match.turnSnapshot;
  match.turnSnapshot = null;
  if (!snap) return false;
  for (const [id, saved] of Object.entries(snap.players)) {
    const live = match.players[id];
    if (!live) continue; // ออกจากเกมไปแล้วระหว่างเทิร์น — ไม่ปลุกกลับ
    // ข้อมูลการเชื่อมต่อเป็นของ "ปัจจุบัน" เสมอ ห้ามย้อน ไม่งั้น reconnect/disconnect กลางเทิร์นจะพัง
    const keep = {
      socketId: live.socketId, connected: live.connected,
      sessionToken: live.sessionToken, ready: live.ready,
    };
    for (const k of Object.keys(live)) delete live[k];
    Object.assign(live, structuredClone(saved), keep);
  }
  match.roundSkills = snap.roundSkills;
  match.shopItems = snap.shopItems;
  ({ cycleShift: match.cycleShift, transformCounter: match.transformCounter } = snap.g);
  match.lastAttack = null;
  return true;
}

function beginOverloadForceDraw() {
  match.centralDeck = cardDeck.buildCentralDeck();
  match.roundWinnerId = null;
  match.roundTiedWin = false;

  for (const p of Object.values(match.players)) {
    if (!p.alive) {
      p.cards = [];
      p.locked = true;
      p.busted = false;
      p.overloadDrawReady = false;
      continue;
    }
    p.cards = [];
    p.colorTrigger = { red: 0, blue: 0, green: 0, yellow: 0 };
    p.statusAmt.cardAtkBonus = 0;
    delete p.statuses.freecast; // ไพ่ Queen จากมือเดิมถูกย้อนทิ้งไปพร้อมไพ่
    combat.resetOverloadDrawCounter(p, false);
    const initial = cardDeck.drawInitialCard(p);
    if (initial) {
      p.cards.push(initial);
      cardDeck.onCardDrawn(p, initial);
    }
    p.overloadDrawReady = true;
    p.locked = (p.statuses.sleep || 0) > 0 || (p.statuses.stun || 0) > 0;
    p.busted = false;
    p.result = null;
    p.isWinner = false;
    p.isLoser = false;
  }

  match.lastLog.push("⚡ Overload Force เริ่มทำงาน — แจกไพ่ใหม่ในเทิร์นเดิม ปลดเพดาน 21 แต้ม!");
  match.gameState = "PLAYING";
  timers.startPhaseTimer(timers.cardPhaseSeconds(), summary.resolveRound);
  view.broadcastState();
  draw.checkAllLocked();
}

function triggerOverloadForce() {
  match.overloadForceCount++;
  match.overloadForceActive = true;
  match.overloadForceSeq++;
  // ย้อนทุกการกระทำในเทิร์นนี้ก่อนแจกไพ่ใหม่ — สกิลที่กดไป/แต้มสกิล/ไอเทม/เหรียญ ได้คืนทั้งหมด
  //  (บั๊กเดิม: สกิลที่ทำงาน "หลังเปิดไพ่" ถูกล้างทิ้งพร้อมมือไพ่ เจ้าของเสียแต้มกับสกิลไปฟรีๆ)
  if (restoreTurnSnapshot()) {
    match.lastLog.push("↩️ Overload Force ย้อนเวลาเทิร์นนี้กลับไปก่อนทุกการกระทำ — แต้มสกิล สกิลที่ใช้ และไอเทมถูกคืนทั้งหมด");
  }
  match.cutsceneQueue = [{
    info: {
      kind: "overloadForce",
      video: "/overload_force/overload_force_start.mp4",
      title: "OVERLOAD FORCE",
    },
    seconds: OVERLOAD_FORCE_CUTSCENE_SECONDS,
  }];
  match.lastLog.push(`⚡ คะแนนสูงสุดเสมอกัน — Overload Force ทำงาน (${Math.round(OVERLOAD_FORCE_CHANCE * 100)}%)!`);
  cutscene.runCutsceneQueue(beginOverloadForceDraw);
}
