// ระบบธาตุฝั่ง client (ตรงกับ server/element.js · GRID_PLAN §8.7)
//  คราบ = สถานะ elFire / elIce / elBolt / elWater (ส่งมาใน statuses) · ตารางปฏิกิริยามุมขวาบน (ผู้ใช้สั่งให้มีคำบอกผล)
export const ELEMENTS = {
  fire: { icon: "🔥", name: "ไฟ", color: "#ff7a3d" },
  ice: { icon: "❄️", name: "น้ำแข็ง", color: "#8fd8ff" },
  bolt: { icon: "⚡", name: "สายฟ้า", color: "#ffd84a" },
  water: { icon: "💧", name: "น้ำ", color: "#4aa3ff" },
  wind: { icon: "🌪️", name: "ลม", color: "#7fe0b5" },
};
export const ELEMENT_KEYS = ["fire", "ice", "bolt", "water", "wind"];
export const AURA_STATUS = { elFire: "fire", elIce: "ice", elBolt: "bolt", elWater: "water" };
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
];
export const REACTION_BY_KEY = Object.fromEntries(REACTIONS.map((r) => [r.key, r]));
