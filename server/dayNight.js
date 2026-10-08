// ระบบกลางวัน/กลางคืน
// export ก่อน require: ไฟล์ใน server/ require วนกันเอง — function declaration ถูก hoist จึงพร้อมใช้ตั้งแต่บรรทัดแรก
Object.assign(module.exports, {
  isNightRound, morningBonusActive,
});

const { CYCLE_TURNS } = require("./constants");
const match = require("./match");

// สลับทุก CYCLE_TURNS เทิร์น เริ่มเกมเป็นกลางวัน — cycleShift เลื่อนวงจรทั้งเกม (เทสต์ตั้งผ่าน engine.setCycleShift)
function isNightRound(n) {
  const m = n - match.cycleShift;
  const block = m > 0 ? Math.floor((m - 1) / CYCLE_TURNS) : 0;
  return m > 0 && block % 2 === 1;
}
// patch 2.1.7: เช้าที่กี่ (1 = เช้าแรกของเกม, 2 = เช้าที่สอง, ...) — ใช้กำหนดว่าเช้าไหนแจกแต้มสกิลโบนัส
function dayCycleIndex(n) {
  const m = n - match.cycleShift;
  const block = m > 0 ? Math.floor((m - 1) / CYCLE_TURNS) : 0;
  return Math.floor(block / 2) + 1;
}
// patch 2.1.7: แต้มสกิลโบนัสตอนเช้า — แจกเฉพาะเช้าที่ 2, 4, 6, ... (เช้าที่ 1, 3, 5, ... ไม่มีโบนัส)
function morningBonusActive(n) {
  if (isNightRound(n)) return false;
  return dayCycleIndex(n) % 2 === 0;
}
