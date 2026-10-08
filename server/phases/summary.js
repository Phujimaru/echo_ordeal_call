// เฟสสรุปผล: ตัดสินผู้ชนะ/ผู้แพ้ของรอบ
// export ก่อน require: ไฟล์ใน server/ require วนกันเอง — function declaration ถูก hoist จึงพร้อมใช้ตั้งแต่บรรทัดแรก
Object.assign(module.exports, {
  resolveRound,
});

const CHAR_HOOKS = require("../../characters/index");
const { GOLD_WIN_BONUS, OVERLOAD_FORCE_CHANCE, SUMMARY_TIME, TRANSFORMS } = require("../constants");
const match = require("../match");
const { engine } = require("../engine");
const attack = require("./attack");
const combat = require("../combat");
const cutscene = require("../cutscene");
const cardDeck = require("../deck");
const overload = require("../overload");
const qteSystem = require("../qte");
const shop = require("../shop");
const timers = require("../timers");
const view = require("../view");

// ---- สรุปผล ----
function resolveRound() {
  timers.clearPhaseTimer();
  for (const p of combat.alivePlayers()) p.locked = true;

  // QTE ที่ยังเล่นไม่จบเมื่อถึงเวลาเปิดไพ่ = ถือว่าพลาด (แต้มเสียฟรี)
  qteSystem.sweepQte();

  const combatants = combat.alivePlayers();
  match.roundWinnerId = null;

  if (combatants.length < 2) {
    match.lastLog.push("รอบนี้ไม่มีการต่อสู้ (ผู้เล่นไม่พอ)");
    afterResolve();
    return;
  }

  const val = (p) => (cardDeck.bustedOf(p) ? -1 : cardDeck.scoreOf(p));
  const best = Math.max(...combatants.map(val));
  const worst = Math.min(...combatants.map(val));

  if (best >= 0) {
    const tied = combatants.filter((p) => val(p) === best);
    // สนาม Overload เกิดได้เฉพาะตอนแต้มสูงสุดเสมอกันจริง
    if (!match.overloadForceActive && !CHAR_HOOKS.muimi.blocksOverloadForce(engine) && tied.length >= 2 && Math.random() < OVERLOAD_FORCE_CHANCE) {
      overload.triggerOverloadForce();
      return;
    }
    const w = tied[Math.floor(Math.random() * tied.length)];
    match.roundWinnerId = w.id;
    match.roundTiedWin = tied.length > 1; // เสมอแต้มกัน -> ยังได้แต้มสกิล/ท่าไม้ตายทำงานปกติ แต่ไม่มีเทิร์นโจมตี
    w.isWinner = true;
    w.result = "win";
    // ระบบเหรียญ (patch 2.2 full): ชนะการจั่วได้เหรียญเพิ่ม +1 (เพดาน 30)
    shop.addGold(w, GOLD_WIN_BONUS);
    // patch 2.1.3.5: ชนะจั่วการ์ดไม่ได้แต้มสกิลอีกต่อไป
    combat.firePassive(w, "win");
    if (tied.length > 1) {
      match.lastLog.push(`เสมอที่ ${best} แต้ม — สุ่มผู้ชนะได้ ${w.name} (เสมอ ไม่มีเทิร์นโจมตี)`);
    }
  }

  if (best !== worst) {
    for (const l of combatants.filter((p) => val(p) === worst && p.id !== match.roundWinnerId)) {
      l.isLoser = true;
      l.result = "lose";
      combat.damageSoft(l);
      combat.firePassive(l, "lose");
      match.lastLog.push(`${l.name} แต้มน้อยสุด รับความเสียหาย -1`);
    }
  }
  for (const p of combatants) if (!p.result) p.result = "safe";
  // มุยมิ: นับแพ้/ไพ่แตกต่อเนื่องหลังผลของทุกคนถูกกำหนดครบแล้ว
  CHAR_HOOKS.muimi.onAfterRoundScores(engine, combatants);

  afterResolve();
}

// เปิดร่างท่าไม้ตาย (หลังเปิดไพ่) -> cutscene ก่อนสรุปผล (สรุปผลไว้ท้ายสุดเสมอ)
//  หมายเหตุ: สกิลทั่วไปไม่มีแบนเนอร์ก่อนสรุปผลแล้ว — instant เด้งตอนใช้ / หลังเปิดไพ่ไปโชว์ตอนโจมตี
function afterResolve() {
  const activated = [];
  for (const p of combat.alivePlayers()) {
    const pBusted = cardDeck.bustedOf(p); // ไพ่แตก = ท่าไม้ตายไม่ทำงาน (กันหลุดกรณีเพิ่งกดแล้วแตก)
    for (const key of Object.keys(TRANSFORMS)) {
      if (!TRANSFORMS[key].afterReveal) continue;
      if (pBusted) continue;
      if ((p.statuses[key] || 0) > 0 && !p.seen[key]) {
        p.seen[key] = true;
        p.transformAt = ++match.transformCounter;
        cutscene.triggerCutscene(p, key);
        match.lastLog.push(`✨ ${p.name} ${TRANSFORMS[key].label} ${TRANSFORMS[key].title}!`);
        activated.push(p);
      }
    }
  }
  // สวนท่าไม้ตายกัน: เอาเพลงของผู้ชนะ (ถ้าไม่มีผู้ชนะ = คนที่เปิดหลังสุด ซึ่ง transformAt สูงสุดอยู่แล้ว)
  if (activated.length > 1) {
    const winner = activated.find((p) => p.id === match.roundWinnerId);
    if (winner) winner.transformAt = ++match.transformCounter;
  }
  cutscene.runCutsceneQueue(goSummary);
}

function goSummary() {
  match.gameState = "SUMMARY";
  timers.startPhaseTimer(SUMMARY_TIME, attack.afterSummary);
  view.broadcastState();
}
