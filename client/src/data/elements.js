// ระบบธาตุฝั่ง client (ตรงกับ server/element.js · GRID_PLAN §8.7)
//  คราบ = สถานะ elFire / elIce / elBolt / elWater (ส่งมาใน statuses) · ตารางปฏิกิริยามุมขวาบน (ผู้ใช้สั่งให้มีคำบอกผล)
export const ELEMENTS = {
  fire: { icon: "🔥", name: "ไฟ", color: "#ff7a3d" },
  ice: { icon: "❄️", name: "น้ำแข็ง", color: "#8fd8ff" },
  bolt: { icon: "⚡", name: "สายฟ้า", color: "#ffd84a" },
  water: { icon: "💧", name: "น้ำ", color: "#4aa3ff" },
  wind: { icon: "🌪️", name: "ลม", color: "#7fe0b5" },
  // ธาตุใหม่ของ Master (GRID_PLAN §7.34)
  poison: { icon: "☠️", name: "พิษ", color: "#7ddc4a" },
  light: { icon: "✨", name: "แสง", color: "#ffe9a0" },
  dark: { icon: "🌑", name: "มืด", color: "#8a5cff" },
};
export const ELEMENT_KEYS = ["fire", "ice", "bolt", "water", "wind", "poison", "light", "dark"];
export const AURA_STATUS = { elFire: "fire", elIce: "ice", elBolt: "bolt", elWater: "water", elPoison: "poison", elLight: "light", elDark: "dark" };
// คราบธาตุของผู้เล่นจาก statuses (ไม่มี = null)
export function auraOf(p) {
  const st = p && p.statuses;
  if (!st) return null;
  for (const [k, el] of Object.entries(AURA_STATUS)) if ((st[k] || 0) > 0) return el;
  return null;
}
// ตารางปฏิกิริยา (ลำดับตามที่ผู้ใช้เห็นในแบบร่าง) · eff = [ข้อความ, ตัวเลขเน้น] สลับกัน
export const REACTIONS = [
  { key: "burst", a: "fire", b: "ice", name: "ปะทุ", eff: ["ดาเมจเพิ่ม ", "3", " · ศัตรูรอบข้างโดน ", "1"] },
  { key: "blast", a: "fire", b: "bolt", name: "ระเบิด", eff: ["ทุกคนรอบจุดโดน ", "2", " · กระเด็น ", "1", " ช่อง"] },
  { key: "vapor", a: "fire", b: "water", name: "ระเหย", eff: ["ดาเมจเพิ่ม ", "3"] },
  { key: "erode", a: "ice", b: "bolt", name: "กัดเซาะ", eff: ["ดาเมจเพิ่ม ", "1", " · เกราะแตกหมด"] },
  { key: "freeze", a: "ice", b: "water", name: "เยือกแข็ง", eff: ["น้ำแข็งกัด ", "2", " เทิร์น · เดินไม่ได้ ", "1", " เทิร์น"] },
  { key: "conduct", a: "bolt", b: "water", name: "นำไฟฟ้า", eff: ["ดาเมจเพิ่ม ", "2", " ทะลุเกราะ"] },
  { key: "swirl", a: "wind", b: null, name: "พัดพา", eff: ["กระจายธาตุที่อยู่บนตัวเป้าหมาย"] },
  // Master (GRID_PLAN §7.34 · ชื่อผู้ใช้อนุมัติ)
  { key: "fog", a: "poison", b: "fire", name: "หมอกพิษ", eff: ["หมอก 3×3 ", "3", " เทิร์น · ตาบอด · เสียหาย ", "1", "/เทิร์น"] },
  { key: "stir", a: "poison", b: "bolt", name: "กระตุ้น", eff: ["ดาเมจต่อเทิร์น ×", "2", " · ", "3", " เทิร์น"] },
  { key: "spread", a: "poison", b: "wind", name: "กระจายพิษ", eff: ["พิษร้ายติดศัตรูในกรอบ 5×5"] },
  { key: "hole", a: "light", b: "dark", name: "หลุมดำ", eff: ["ดูดเข้ากลาง ", "3", " เทิร์น · ระเบิด ", "3"] },
  { key: "glare", a: "light", b: "light", name: "แสงจ้า", eff: ["ตาบอด · ลบสกิลติดตัว ", "3", " เทิร์น"] },
];
export const REACTION_BY_KEY = Object.fromEntries(REACTIONS.map((r) => [r.key, r]));

// ธาตุของสกิลบนหน้าเลือกตัว (ผู้ใช้สั่ง 2026-11-14 "แสดงแค่ไอคอนธาตุ · อันไหนไม่มีไม่ต้องใส่") — ตาม GRID_PLAN §8.7.1
//  key = ช่องสกิลใน roster (passive…passive5 / basic / secondary / ultimate) · ไม่อยู่ในตาราง = ไม่มีธาตุ
const ALL_ICE = ["ice"];
export const SKILL_ELEMENTS = {
  ice_spike: { passive: ALL_ICE, passive2: ALL_ICE, passive3: ALL_ICE, basic: ALL_ICE, secondary: ALL_ICE, ultimate: ALL_ICE },
  sora_otosumi: { basic: ["fire", "wind", "water"], secondary: ["water"], ultimate: ["fire", "wind", "water"] }, // แปลงร่าง: Fire ไฟ / Eagle ลม / Orca น้ำ · Orca Echo · Separade ตามร่าง
  raido_hikaru: { passive: ["fire"], basic: ["bolt", "fire"], ultimate: ["fire"] }, // สโตเรี่ยม · ดารัมเบีย/คิงแพนด้อน · Cross Shoot
  emiliko: { secondary: ["water"] }, // ไม้ถูพื้น · แจกันใส่น้ำ
  celine: { basic: ["ice"], secondary: ["fire", "wind", "bolt"] }, // คฑาการกีดกัน · เวทย์ไฟ/ลม/ไฟฟ้า
  diego_alt: { basic: ["fire"] }, // ไม้ขีด · ระเบิดแอ่งน้ำมัน · กองไฟ
  kensaki_kazuma: { secondary: ["bolt", "fire", "ice", "wind"], ultimate: ["bolt", "fire", "ice", "wind"] }, // การ์ด THUNDER/FIRE/BLIZZARD/TORNADO · Lightning
  trafalgar_law: { ultimate: ["bolt"] }, // Gamma Knife
  kagami: { ultimate: ["bolt"] }, // Rider Kick
  gilgamesh_fake: { basic: ["bolt"] }, // ถือ EA → พายุสายฟ้าแดง
  roland: { secondary: ["ice"] }, // Emotion A Kiss
  master: { passive3: ["poison", "light"], basic: ["poison", "light"], secondary: ["wind", "light"], ultimate: ["bolt", "dark"] }, // เฟส 1 → เฟส 2
};
