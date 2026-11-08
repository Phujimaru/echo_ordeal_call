// กติกากลางที่ระบบเรียกตรง (สังหารทันที · ชื่อท่าจากสถานะ)
// export ก่อน require: ไฟล์ใน server/ require วนกันเอง — function declaration ถูก hoist จึงพร้อมใช้ตั้งแต่บรรทัดแรก
Object.assign(module.exports, {
  hasKillCapability,
  ultNameOfStatus,
});

const { netramanaActive } = require("../characters/_universal_status");
const { TRANSFORMS } = require("./constants");
const combat = require("./combat");

// ผู้เล่นคนนี้ "มี" ความสามารถสังหารทันทีติดตัวไหม
function hasKillCapability(p) {
  if (!p || !p.alive) return false;
  // "เนตรมณะ" (สถานะ Universal patch 2.2.7): ใครติดบัฟนี้ก็มีความสามารถสังหารทันทีระหว่างที่บัฟยังอยู่
  if (netramanaActive(p)) return true;
  return false;
}
// ชื่อท่าไม้ตายจาก status (ใช้ตอนยกเลิกย้อนหลัง — บางท่าไม่มีใน TRANSFORMS/ข้อมูลสกิล)
function ultNameOfStatus(p, key) {
  const t = TRANSFORMS[key];
  if (t && t.title) return t.title;
  const s = combat.skillByStatus(p, key);
  return s ? s.name : key;
}
