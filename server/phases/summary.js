// เปิดไพ่: ทุกคนเปิดแต้ม → (Overload Force) → ท่าไม้ตายหลังเปิดไพ่ → ลำดับเดิน (phases/action.js)
//  ระบบกระดาน (GRID_PLAN.md §4/§10): ไม่มีผู้ชนะ/ผู้แพ้การจั่วอีกแล้ว — แต้มใช้จัดลำดับเดินเท่านั้น
//  (แต้มต่ำสุดไม่เสียเลือด · เหรียญชนะจั่วย้ายไปเป็นของคนเดินลำดับแรก)
// export ก่อน require: ไฟล์ใน server/ require วนกันเอง — function declaration ถูก hoist จึงพร้อมใช้ตั้งแต่บรรทัดแรก
Object.assign(module.exports, {
  resolveRound,
});

const CHAR_HOOKS = require("../../characters/index");
const { OVERLOAD_FORCE_CHANCE, TRANSFORMS } = require("../constants");
const match = require("../match");
const { engine } = require("../engine");
const action = require("./action");
const combat = require("../combat");
const cutscene = require("../cutscene");
const cardDeck = require("../deck");
const overload = require("../overload");
const qteSystem = require("../qte");
const timers = require("../timers");

function resolveRound() {
  timers.clearPhaseTimer();
  for (const p of combat.alivePlayers()) p.locked = true;

  // QTE ที่ยังเล่นไม่จบเมื่อถึงเวลาเปิดไพ่ = ถือว่าพลาด (แต้มเสียฟรี)
  qteSystem.sweepQte();

  const combatants = combat.alivePlayers();
  const val = (p) => (cardDeck.bustedOf(p) ? -1 : cardDeck.scoreOf(p));
  const best = combatants.length ? Math.max(...combatants.map(val)) : -1;
  // Overload Force: แต้มสูงสุดเสมอกันจริง (สุ่มติด) → ทุกคนจั่วใหม่ แล้วจัดลำดับเดินใหม่
  if (combatants.length >= 2 && best >= 0 && !match.overloadForceActive && !CHAR_HOOKS.muimi.blocksOverloadForce(engine)) {
    const tied = combatants.filter((p) => val(p) === best);
    if (tied.length >= 2 && Math.random() < OVERLOAD_FORCE_CHANCE) {
      overload.triggerOverloadForce();
      return;
    }
  }
  for (const p of combatants) if (cardDeck.bustedOf(p)) match.lastLog.push(`💥 ${p.name} ไพ่แตก — เดินท้ายแถว และเดินได้น้อยลง 1 ช่อง`);
  afterResolve();
}

// เปิดร่างท่าไม้ตาย (หลังเปิดไพ่) -> cutscene ก่อนเข้าลำดับเดิน
function afterResolve() {
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
      }
    }
  }
  cutscene.runCutsceneQueue(action.beginOrder);
}
