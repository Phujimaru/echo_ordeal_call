// ============================================================
//  โหมด PVE ร่วมมือ — ตัวเช็คกลางของ "บัฟเฉพาะ Eos" ในตัวละคร
//  สนาม Eos (GRID_PLAN §8.6) + Road Trip (§8.8 — ผู้ใช้สั่ง 2026-11-14 "ตัวละครที่ได้บัฟจาก EOS จะใช้ได้ด้วยในโหมดนี้")
//  Moon Cell ไม่นับเป็น PVE ร่วมมือ — ตัวที่เปิดบัฟใน Moon ด้วย (เฟรดดี้/ชินระ) เช็ค isMoon() เพิ่มเอง
//  ความคืบหน้าที่บัฟผูกไว้: Eos = แต้มรวมเทียบเป้า · Road Trip = ระยะทาง rtKm() (เช่น LV ของ Ice Spike)
// ============================================================
const match = require("./match");

// world กับ gameMode ตั้งคู่กันเสมอในเกมจริง · เทสต์บางตัวตั้งแค่อย่างเดียว (Eos ผ่าน Fodlan.isEos — เทสต์จำลองฟังก์ชันนี้)
const isEos = () => match.gameMode === "eos" || require("./fodlan").isEos();
const isRoadtrip = () => match.world === "roadtrip" || match.gameMode === "roadtrip";
const isMoon = () => match.world === "moon" || match.gameMode === "moon";
const isPveCoop = () => isEos() || isRoadtrip();

// สถานะของสนาม Eos ที่ระบบมอนสร้างแล้ว (null = ยังไม่เริ่ม/ไม่ใช่ Eos) — ต้องอยู่ในโลก Eos จริง (match.world)
function eosState() {
  return require("./fodlan").isEos() && match.fodlan && match.fodlan.s && match.fodlan.s.eos ? match.fodlan.s.eos : null;
}
// โหมดทำงานจริงแล้ว (Eos: มีสถานะสนาม · Road Trip: มี match.roadtrip)
function pveActive() { return !!eosState() || (isRoadtrip() && !!match.roadtrip); }
const rtKm = () => (isRoadtrip() && match.roadtrip ? Number(match.roadtrip.km) || 0 : 0);

// มอนของโหมด PVE (ยูนิตที่ถูกเรียก ฝ่าย eosmob / rtmob)
const isPveMob = (u) => !!(u && u.summon && (u.summon.side === "eosmob" || u.summon.side === "rtmob"));
// บอส: Eos ราชาปีศาจ (trait "boss") · Road Trip บอสทุก 50 กม. (summon.boss)
const isPveBoss = (u) => !!(u && u.summon && (u.summon.trait === "boss" || u.summon.boss));

module.exports = { isEos, isRoadtrip, isMoon, isPveCoop, eosState, pveActive, rtKm, isPveMob, isPveBoss };
