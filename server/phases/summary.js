// เปิดไพ่: ทุกคนเปิดแต้ม → ท่าไม้ตายหลังเปิดไพ่ → ลำดับเดิน (phases/action.js)
//  ระบบกระดาน (GRID_PLAN.md §4/§10): ไม่มีผู้ชนะ/ผู้แพ้การจั่วอีกแล้ว — แต้มใช้จัดลำดับเดินเท่านั้น
//  (แต้มต่ำสุดไม่เสียเลือด · เหรียญชนะจั่วย้ายไปเป็นของคนเดินลำดับแรก)
// export ก่อน require: ไฟล์ใน server/ require วนกันเอง — function declaration ถูก hoist จึงพร้อมใช้ตั้งแต่บรรทัดแรก
Object.assign(module.exports, {
  resolveRound,
});

const { TRANSFORMS } = require("../constants");
const match = require("../match");
const action = require("./action");
const combat = require("../combat");
const cutscene = require("../cutscene");
const cardDeck = require("../deck");
const qteSystem = require("../qte");
const timers = require("../timers");

function resolveRound() {
  timers.clearPhaseTimer();
  // หมดเวลาช่วงจั่ว: คนที่ยังไม่กด "พอ" ได้ผลไพ่สี 3 ใบเหมือนกดเอง (เดิมหลุดไป) แล้วค่อยล็อก
  for (const p of combat.alivePlayers()) {
    if (!p.locked) cardDeck.applyLockColorTriggers(p);
    p.locked = true;
  }

  // QTE ที่ยังเล่นไม่จบเมื่อถึงเวลาเปิดไพ่ = ถือว่าพลาด (แต้มเสียฟรี)
  qteSystem.sweepQte();

  for (const p of combat.alivePlayers()) if (cardDeck.bustedOf(p)) match.lastLog.push(`💥 ${p.name} ไพ่แตก — เดินท้ายแถว และเดินได้น้อยลง 1 ช่อง`);
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
