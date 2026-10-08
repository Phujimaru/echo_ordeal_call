// ตัวจับเวลาเฟส + เวลาเฟสจั่วไพ่
// export ก่อน require: ไฟล์ใน server/ require วนกันเอง — function declaration ถูก hoist จึงพร้อมใช้ตั้งแต่บรรทัดแรก
Object.assign(module.exports, {
  clearPhaseTimer, startPhaseTimer,
  cardPhaseSeconds,
});

const { io } = require("./app");
const { CARD_TIME, RESYNC_EVERY } = require("./constants");
const match = require("./match");
const view = require("./view");

function clearPhaseTimer() {
  if (match.phaseTimerId) clearInterval(match.phaseTimerId);
  match.phaseTimerId = null;
}
function startPhaseTimer(seconds, onExpire) {
  clearPhaseTimer();
  match.timeLeft = seconds;
  match.phaseTimerId = setInterval(() => {
    match.timeLeft--;
    if (match.timeLeft <= 0) { clearPhaseTimer(); onExpire(); }
    // ทุกวินาที client ต้องการแค่ตัวเลขนับถอยหลัง — ส่ง "tick" (ไม่กี่ไบต์) แทน state ตัวเต็ม
    //  (state ตัวเต็มมีคำอธิบายสกิลของผู้เล่นทุกคน ~10 KB/คน = bandwidth มหาศาลถ้ายิงทุกวินาที)
    //  ยังคง broadcast ตัวเต็มทุก ๆ RESYNC_EVERY วิ เป็นตาข่ายกันเหนียว เผื่อมีจุดไหนแก้ state
    //  แล้วลืมเรียก broadcastState() เอง (เดิมตัวจับเวลากลบให้ภายใน 1 วิ)
    else if (match.timeLeft % RESYNC_EVERY === 0) view.broadcastState();
    else io.emit("tick", match.timeLeft);
  }, 1000);
}
// เวลาของเฟสจั่วการ์ดในเทิร์นนี้
function cardPhaseSeconds() {
  return CARD_TIME;
}
