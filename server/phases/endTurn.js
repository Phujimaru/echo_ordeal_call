// ปิดรอบ: ลดเทิร์นสถานะ, เหรียญ, ตัดสินจบเกม, ไปรอบถัดไป
// export ก่อน require: ไฟล์ใน server/ require วนกันเอง — function declaration ถูก hoist จึงพร้อมใช้ตั้งแต่บรรทัดแรก
Object.assign(module.exports, {
  gameOver,
  endTurn,
});

const CHAR_HOOKS = require("../../characters/index");
const { tickEvadeStacks } = require("../../characters/_universal_status");
const Journey = require("../../characters/_journey");
const { GOLD_PER_TURN, JOURNEY_ADVANCE_SECONDS, TRANSITION_TIME } = require("../constants");
const match = require("../match");
const { engine } = require("../engine");
const combat = require("../combat");
const cutscene = require("../cutscene");
const dayNight = require("../dayNight");
const action = require("./action");
const draw = require("./draw");
const lobby = require("../lobby");
const shop = require("../shop");
const timers = require("../timers");
const view = require("../view");

function endTurn() {
  timers.clearPhaseTimer();
  match.actorId = null;
  match.action = null;

  for (const p of Object.values(match.players)) {
    tickEvadeStacks(engine, p);
  }

  for (const p of Object.values(match.players)) {
    for (const k of Object.keys(p.statuses || {})) {
      if (k === "hbleed") continue;  // เลือดไหล (patch 2.5): ลดลงเองในตอนต้นเทิร์นหลังสร้างผล (tickBleed) ไม่ลดซ้ำที่นี่
      if (k === "hburn") continue;   // ลุกไหม้: ลดลงเองในตอนต้นเทิร์นหลังสร้างผล ไม่ลดซ้ำที่นี่
      if (k === "fortune") continue; // โชคลาภ: คงอยู่จนกว่าจะจั่วไพ่ครั้งถัดไป
      if (k === "evade") continue;   // หลบหลีก (สถานะ Universal): p.statuses.evade เป็นแค่ mirror ของ p.evadeStacks.length — ตัวจริงหมดอายุผ่าน tickEvadeStacks (ดูด้านบน)
      if (k === "empower") continue; // เสริมพลัง: คงอยู่จนกว่าจะได้โจมตี (ไม่ซ้อนทับ)
      // หลับไหล: เทิร์นที่เพิ่งโดนกล่อม ยังไม่เริ่มนับ (เริ่มหลับจริงเทิร์นถัดไป)
      if (k === "sleep" && p.sleepFresh) { p.sleepFresh = false; continue; }
      p.statuses[k]--;
      if (p.statuses[k] <= 0) {
        delete p.statuses[k];
        if (p.statusAmt) delete p.statusAmt[k]; // ล้างจำนวน (amount) ของสถานะพื้นฐานที่หมดอายุ (patch 2.0.8)
        // มุยมิ: “ดาบสะบั้น” หมดเวลา -> เริ่มคูลดาวน์ท่าไม้ตาย
        if (k === "muimiTower" && p.characterId === "muimi") CHAR_HOOKS.muimi.onUltExpire(engine, p);
      }
    }
    for (const k of Object.keys(p.seen || {})) {
      if (!(p.statuses[k] > 0)) delete p.seen[k];
    }
    // เลือดชั่วคราว: หายเองเมื่อครบ 2 เทิร์น
    if ((p.tempHp || 0) > 0) {
      p.tempHpTurns--;
      if (p.tempHpTurns <= 0) { p.tempHp = 0; p.tempHpTurns = 0; }
    }
    p.armor = Math.min(p.armor, combat.maxArmorOf(p)); // กันเกราะเกินเพดาน
  }

  // จบเทิร์นรอบนั้น +1 — ช่วงกลางวันได้แต้มสกิลเพิ่มอีก +1 (ระบบกลางวัน/กลางคืน)
  //  การเดินทาง: โบนัสนี้มาจากภูมิภาคแทน (1 กลางวัน = จบเทิร์นเลขคู่ · 7 = ทุกเทิร์น) — Journey.skillBonus
  const dayBonus = Journey.skillBonus(engine, dayNight.morningBonusActive(match.roundNumber)); // patch 2.1.7: แจกเฉพาะเช้าที่ 2, 4, 6, ...
  for (const p of combat.alivePlayers()) combat.addSkill(p, 1 + dayBonus);
  if (dayBonus) match.lastLog.push(Journey.active(engine)
    ? `🗺️ ${Journey.AREAS[Journey.areaOf(match.roundNumber) - 1].name} — ทุกคนได้แต้มสกิลเพิ่ม +${dayBonus}`
    : "☀️ จบเทิร์นช่วงกลางวัน — ทุกคนได้แต้มสกิลเพิ่ม +1");
  // ระบบเหรียญ (patch 2.2 full): จบเทิร์น +1 เหรียญให้ทุกคน (เพดาน 30 — เต็มแล้วไม่ได้เพิ่มจน spending ลดลง)
  //  คนเดินลำดับแรกได้เพิ่มอีกตอนจัดลำดับ (phases/action.js beginOrder)
  for (const p of combat.alivePlayers()) shop.addGold(p, GOLD_PER_TURN + Journey.goldBonus(engine));

  // การเดินทาง: ผลจบเทิร์นของภูมิภาค (ของฟรี / เสียเหรียญ / ความเสียหายจากสนาม / สตั้น / ผุพัง)
  //  อยู่หลังลูปลดเทิร์นสถานะ (สตั้น/ผุพังที่ติดตรงนี้จึงมีผลเต็มเทิร์นหน้า) และก่อนด่านกวาดคนตายด้านล่าง
  Journey.onEndTurn(engine);
  // โอเบรอน (ฤดูร้อน): สตั้นจากจุดจบของความฝัน (ต้องอยู่หลังลูปลดเทิร์น = เต็ม 3 เทิร์นถัดไป) + สกิลติดตัวหน้าไหว้หลังหลอก
  CHAR_HOOKS.oberon_summer.onEndTurn(engine);

  for (const p of Object.values(match.players)) {
    if (p.alive && p.hp <= 0) {
      combat.instantDeath(p);
      if (!p.alive) match.lastLog.push(`💀 ${p.name} เลือดจริงหมด ตกรอบ!`);
    }
    if (!p.alive) p.pos = null; // คนตกรอบหายจากกระดาน
  }

  // เล่นฉากที่ค้างคิว (ถ้ามี) ให้จบก่อน แล้วค่อยสรุปจบเกม/ขึ้นรอบถัดไป
  cutscene.runCutsceneQueue(() => {
    if (gameOver()) return;
    // การเดินทาง: ข้ามเข้าภูมิภาคใหม่ -> ฉากแผนที่ก่อนแจกไพ่เทิร์นแรกของภูมิภาค
    if (maybeJourneyAdvance()) return;
    match.gameState = "TRANSITION";
    timers.startPhaseTimer(TRANSITION_TIME, draw.dealRound);
    view.broadcastState();
  });
}

// เหลือทีมเดียว (duo/trio) หรือเหลือคนสุดท้าย (อิสระ) = จบเกม
function gameOver() {
  const stillAlive = combat.alivePlayers();
  const total = Object.keys(match.players).length;
  const teamWin = lobby.remainingTeamWinInfo(stillAlive, total);
  if (teamWin.over) {
    match.winningTeamId = teamWin.teamId;
    if (match.winningTeamId) {
      const winners = stillAlive.filter((p) => p.teamId === match.winningTeamId).map((p) => p.name).join(" & ");
      match.lastLog.push(`🏆 Team ${match.winningTeamId} (${winners}) ชนะ!`);
    } else {
      match.lastLog.push("ไม่มีทีมที่รอด — เสมอ");
    }
  } else if (!lobby.teamModeActive() && total >= 2 && stillAlive.length <= 1) {
    match.winningTeamId = null;
    if (stillAlive.length === 1) match.lastLog.push(`🏆 ${stillAlive[0].name} คือผู้ชนะคนสุดท้าย!`);
    else match.lastLog.push("ไม่มีผู้รอด — เสมอ");
  } else {
    return false;
  }
  timers.clearPhaseTimer();
  match.gameState = "GAMEOVER";
  match.timeLeft = 0;
  view.broadcastState();
  return true;
}

// การเดินทาง: เทิร์นหน้าเป็นภูมิภาคใหม่ -> พักเฟส CUTSCENE (ไม่มีคลิป) ให้ client เล่นฉากเดินทางบนลูกโลก
function maybeJourneyAdvance() {
  if (!Journey.active(engine)) return false;
  const from = Journey.areaOf(match.roundNumber);
  const to = Journey.areaOf(match.roundNumber + 1);
  if (to <= from) return false;
  match.journeyScene = { seq: ++match.journeySceneSeq, active: true, mode: "advance", area: to, fromArea: from };
  match.lastLog.push(`🗺️ ออกเดินทางต่อ — มุ่งหน้าสู่ภูมิภาคที่ ${to} ${Journey.AREAS[to - 1].name}`);
  action.placeOnBoard(to); // แผนที่ใหม่ → ทุกคนกลับไปยืนจุดเกิด (GRID_PLAN §3)
  match.cutsceneInfo = null;
  match.gameState = "CUTSCENE";
  timers.startPhaseTimer(JOURNEY_ADVANCE_SECONDS, () => { match.journeyScene.active = false; draw.dealRound(); });
  view.broadcastState();
  return true;
}
