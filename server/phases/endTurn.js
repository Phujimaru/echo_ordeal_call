// ปิดรอบ: ลดเทิร์นสถานะ, เหรียญ, ตัดสินจบเกม, ไปรอบถัดไป
// export ก่อน require: ไฟล์ใน server/ require วนกันเอง — function declaration ถูก hoist จึงพร้อมใช้ตั้งแต่บรรทัดแรก
Object.assign(module.exports, {
  gameOver,
  endTurn,
  journeyRebirth,
});

const CHAR_HOOKS = require("../../characters/index");
const { NO_TICK_STATUS } = require("../../characters/_universal_status");
const Journey = require("../../characters/_journey");
const { GOLD_PER_TURN, JOURNEY_ADVANCE_SECONDS, REBIRTH_SECONDS, TRANSITION_TIME } = require("../constants");
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
const Zero = require("../zeroTime");
const Ice = require("../ice");
const Duo = require("../duo");
const Soot = require("../soot");

function endTurn() {
  timers.clearPhaseTimer();
  match.actorId = null;
  match.action = null;

  for (const p of Object.values(match.players)) {
    for (const k of Object.keys(p.statuses || {})) {
      // สถานะที่ไม่ลดเทิร์นที่นี่ (NO_TICK_STATUS — characters/_universal_status.js):
      //  เลือดไหล/ลุกไหม้ ลดเองตอนต้นเทิร์นหลังสร้างผล · โชคลาภ คงอยู่จนจั่วครั้งถัดไป · เสริมพลัง คงอยู่จนได้โจมตี
      if (NO_TICK_STATUS.has(k)) continue;
      // หลับไหล: เทิร์นที่เพิ่งโดนกล่อม ยังไม่เริ่มนับ (เริ่มหลับจริงเทิร์นถัดไป)
      if (k === "sleep" && p.sleepFresh) { p.sleepFresh = false; continue; }
      p.statuses[k]--;
      if (p.statuses[k] <= 0) {
        delete p.statuses[k];
        if (p.statusAmt) delete p.statusAmt[k]; // ล้างจำนวน (amount) ของสถานะพื้นฐานที่หมดอายุ (patch 2.0.8)
        // มุยมิ: “ดาบสะบั้น” หมดเวลา -> เริ่มคูลดาวน์ท่าไม้ตาย
        if (k === "muimiTower" && p.characterId === "muimi" && p.alive) CHAR_HOOKS.muimi.onUltExpire(engine, p);
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
  const dayBonus = Zero.active() ? 0 : Journey.skillBonus(engine, dayNight.morningBonusActive(Zero.worldRound())); // patch 2.1.7: แจกเฉพาะเช้าที่ 2, 4, 6, ...
  //  ระบบคู่: แต้มใช้ร่วมกัน — ฟื้นครั้งเดียวต่อฝ่ายตามฮุค skillRegen (เคท & เอมิลิโกะ: 2)
  for (const p of Duo.cardHolders()) {
    const hook = CHAR_HOOKS[p.characterId];
    const regen = hook && hook.skillRegen ? hook.skillRegen(p) : 1;
    combat.addSkill(Duo.cardUnit(p), regen + dayBonus);
  }
  if (dayBonus) match.lastLog.push(Journey.active(engine)
    ? `🗺️ ${Journey.AREAS[Journey.areaNow(engine) - 1].name} — ทุกคนได้แต้มสกิลเพิ่ม +${dayBonus}`
    : "☀️ จบเทิร์นช่วงกลางวัน — ทุกคนได้แต้มสกิลเพิ่ม +1");
  // ระบบเหรียญ (patch 2.2 full): จบเทิร์น +1 เหรียญให้ทุกคน (เพดาน 30 — เต็มแล้วไม่ได้เพิ่มจน spending ลดลง)
  //  คนเดินลำดับแรกได้เพิ่มอีกตอนจัดลำดับ (phases/action.js beginOrder)
  for (const p of Duo.cardHolders()) shop.addGold(p, GOLD_PER_TURN + Journey.goldBonus(engine)); // ระบบคู่: เหรียญร่วมกัน = ครั้งเดียวต่อฝ่าย

  // การเดินทาง: ผลจบเทิร์นของภูมิภาค (ของฟรี / เสียเหรียญ / ความเสียหายจากสนาม / สตั้น / ผุพัง)
  //  อยู่หลังลูปลดเทิร์นสถานะ (สตั้น/ผุพังที่ติดตรงนี้จึงมีผลเต็มเทิร์นหน้า) และก่อนด่านกวาดคนตายด้านล่าง
  Journey.onEndTurn(engine);
  // ห่วงเวลาซีโร่: บัฟเฟส (แต้มสกิล/เหรียญ) + ห่วงเวลากัดกินทุกคน −1
  Zero.onEndTurn();
  // ฮุคจบเทิร์นของทุกตัวละคร (หลังลูปลดเทิร์น — สตั้นที่ติดตรงนี้จึงเต็มเทิร์นถัดไป)
  //  โอเบรอน: สตั้นจากจุดจบของความฝัน + สกิลติดตัวหน้าไหว้หลังหลอก · โซระ: เพื่อคุณหนู (ร่างโซระครบ 3 เทิร์น ฟื้น 2)
  //  ไรโด ฮิคารุ: Strium Brace · Tiga/กิงกะหมดเวลา (คืนร่าง + คูลดาวน์) · เคมูล่องหน
  combat.broadcastHook("onEndTurn", engine);
  // น้ำแข็ง/หนามน้ำแข็ง (Ice Spike): นับเวลาที่เหลือ หมดแล้วหาย
  Ice.onEndTurn();
  // ระบำเขม่า (เคท): ม่านแดงนับเวลา หมดแล้วหาย
  Soot.onEndTurn();

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
    // ห่วงเวลาซีโร่: เทิร์นถัดไปเป็นกลางคืน (ตั้งแต่เทิร์น 10) สุ่ม 30% ครั้งเดียวต่อเกม
    if (Zero.maybeEnter()) return;
    match.gameState = "TRANSITION";
    timers.startPhaseTimer(TRANSITION_TIME, draw.dealRound);
    view.broadcastState();
  });
}

// เหลือทีมเดียว (duo/trio) หรือเหลือคนสุดท้าย (อิสระ) = จบเกม
function gameOver() {
  const stillAlive = combat.alivePlayers();
  const total = Duo.sideCount(Object.values(match.players)); // ระบบคู่: นับต่อฝ่าย (สองตัวของผู้เล่นคนเดียวกัน = 1)
  const sidesLeft = Duo.sideCount(stillAlive);
  const teamWin = lobby.remainingTeamWinInfo(stillAlive, total);
  if (teamWin.over) {
    match.winningTeamId = teamWin.teamId;
    if (match.winningTeamId) {
      const winners = [...new Set(stillAlive.filter((p) => p.teamId === match.winningTeamId).map((p) => Duo.ownerOf(p).name))].join(" & ");
      match.lastLog.push(`🏆 Team ${match.winningTeamId} (${winners}) ชนะ!`);
    } else {
      match.lastLog.push("ไม่มีทีมที่รอด — เสมอ");
    }
  } else if (!lobby.teamModeActive() && total >= 2 && sidesLeft <= 1) {
    match.winningTeamId = null;
    if (sidesLeft === 1) match.lastLog.push(`🏆 ${Duo.ownerOf(stillAlive[0]).name} คือผู้ชนะคนสุดท้าย!`);
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

// การเดินทาง: เทิร์นหน้าเป็นภูมิภาคใหม่ (สุ่ม) -> พักเฟส CUTSCENE (ไม่มีคลิป) ให้ client เล่นฉากสุ่ม + เดินทางบนลูกโลก
function maybeJourneyAdvance() {
  if (Zero.active() || !Journey.active(engine) || !Journey.legEnds(Zero.worldRound(), match.legStart)) return false;
  const from = Journey.areaNow(engine);
  const to = Journey.pickNextArea(from);
  const route = [...match.journeyRoute]; // เส้นทางที่ผ่านมา (ถึงต้นทาง) — ฉากวาดค้างไว้บนโลก
  match.journeyArea = to;
  match.journeyRoute.push(to);
  match.journeyScene = { seq: ++match.journeySceneSeq, active: true, mode: "advance", area: to, fromArea: from, route };
  match.lastLog.push(`🗺️ ออกเดินทางต่อ — มุ่งหน้าสู่ภูมิภาคที่ ${to} ${Journey.AREAS[to - 1].name}`);
  action.placeOnBoard(to); // แผนที่ใหม่ → ทุกคนกลับไปยืนจุดเกิด (GRID_PLAN §3)
  match.cutsceneInfo = null;
  match.gameState = "CUTSCENE";
  timers.startPhaseTimer(JOURNEY_ADVANCE_SECONDS, () => { match.journeyScene.active = false; draw.dealRound(); });
  view.broadcastState();
  return true;
}

// ท่าไม้ตาย Echo "ก่อกำเนิดใหม่" (characters/echo.js): สุ่มภูมิภาคปลายทางไว้ก่อน → พักเกม CUTSCENE ให้ client เล่นฉากโลกแตก
//  (journeyScene mode "rebirth" — ระหว่างฉาก client ยังเห็นภูมิภาค/กระดานเดิม · Journey.publicInfo ไม่นับเป็น advance)
//  ฉากจบ: impact() (ความเสียหายของท่า ในนามคนใช้ — การกลืนกินระดับ EX นับผ่าน effectSource) → ศัตรูหมด = จบเกมทันที ไม่เปลี่ยนภูมิภาค
//   → ไม่งั้นเปลี่ยนภูมิภาค + ทุกคนไปจุดเกิด + นับเวลาใหม่หมด: เทิร์นนี้ = เทิร์นที่ 1 ของภูมิภาคใหม่ (legStart) และเป็นกลางวัน (cycleShift)
//     ร้านค้าตั้งจุดใหม่ สุ่มของใหม่ นับ 6 เทิร์นใหม่ → ตาเดินของคนใช้จบทันที (finishActor) · คนที่ยังไม่เดินเดินต่อบนแผนที่ใหม่
//  เรียกจาก applyInstantSkill (ระหว่าง useSkill — server/skills.js เห็นเฟส CUTSCENE แล้วแค่บรอดแคสต์)
function journeyRebirth(p, impact) {
  if (!p || !Journey.active(engine)) return false;
  const from = Journey.areaNow(engine);
  const to = Journey.pickNextArea(from);
  const casterId = p.id;
  const scene = { seq: ++match.journeySceneSeq, active: true, mode: "rebirth", area: to, fromArea: from, route: [...match.journeyRoute], casterId };
  match.journeyScene = scene;
  match.cutsceneInfo = null;
  match.gameState = "CUTSCENE";
  timers.startPhaseTimer(REBIRTH_SECONDS, () => finishRebirth(scene, impact));
  return true;
}
function finishRebirth(scene, impact) {
  const caster = match.players[scene.casterId];
  scene.active = false;
  if (impact && caster) combat.withEffectSource(caster, impact);
  for (const o of Object.values(match.players)) if (!o.alive) o.pos = null; // คนตกรอบหายจากกระดาน
  if (gameOver()) return; // ศัตรูหมด = จบเกมทันที ไม่ต้องเปลี่ยนภูมิภาค
  const to = scene.area;
  const world = Zero.worldRound();
  match.journeyArea = to;
  match.journeyRoute.push(to);
  action.placeOnBoard(to); // แผนที่ใหม่ → ทุกคนกลับไปยืนจุดเกิด (ยกร้านออก)
  match.legStart = world;      // เทิร์นนี้ = เทิร์นที่ 1 ของภูมิภาคใหม่ (Journey.legEnds/turnInArea)
  match.cycleShift = world - 1; // เทิร์นนี้ = กลางวันแรก (ตั้งค่าใหม่ตรงๆ ห้ามบวกสะสม — GAME_SYSTEM §10)
  for (const o of Object.values(match.players)) o.nightTaxTier = null; // ภาษีกลางคืนที่สุ่มไว้ต้นเทิร์นเป็นของภูมิภาคเดิม
  shop.relocateShop(); // ร้านตั้งจุดใหม่ + ของใหม่ · shopOpenedRound = เทิร์นนี้
  match.lastLog.push(`🌍 โลกถือกำเนิดใหม่ — มาถึงภูมิภาคที่ ${to} ${Journey.AREAS[to - 1].name}`);
  action.finishActor(); // ตาเดินของคนใช้จบทันที (ตีต่อไม่ได้) → คนถัดไป / จบเทิร์น (บรอดแคสต์ในนั้น)
}
