// ============================================================
//  เพศของตัวละคร — "f" หญิง · "m" ชาย · "n" ไร้เพศ (ผู้ใช้กำหนดรายตัว 2026-11-08)
//  ข้อมูลอยู่ที่ฟิลด์ gender ของ characters.js · ใช้โดยคุเรไน โอโตยะ (ปากหวาน / หนุ่มเจ้าเสน่ห์)
//  ยูนิตที่ถูกเรียก: ฮาคุโนะ (Moon Cell) ตามฝั่ง summon.moon · ตัว Moon Cell = ไร้เพศ ·
//   ตัวอื่น (ร่างแยก/ตัวที่เหมือนกันของวาเลนไทน์) = เพศของตัวละครตาม characterId
// ============================================================

const { CHAR_BY_ID } = require("../characters");

function genderOf(u) {
  if (!u) return "n";
  if (u.summon) {
    if (u.summon.moon === "f" || u.summon.moon === "m") return u.summon.moon; // ฮาคุโนะ
    if (u.summon.moon) return "n"; // Moon Cell
  }
  // เจ้าหญิง Echo สวมร่างจากไดอารี่ = ยังเป็น Echo (p.echoQ.mimic — characters/echo.js)
  const c = CHAR_BY_ID[u.echoQ && u.echoQ.mimic ? "echo" : u.characterId];
  return (c && c.gender) || "n";
}
const isFemale = (u) => genderOf(u) === "f";

module.exports = { genderOf, isFemale };
