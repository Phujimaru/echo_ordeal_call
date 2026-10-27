// ============================================================
//  ข้อมูลแสดงผลของ 5 ด่านในโหมด Fodlan (GRID_PLAN §8.5)
//  ด่าน I ล็อกเป็นด่านแรก · ต้นเทิร์น 7 สุ่มเปลี่ยนไปด่านอื่น (II–V)
//  uv = ตำแหน่งบนแผนที่ทวีป (0..1 ซ้าย→ขวา · บน(เหนือ)→ล่าง(ใต้)) — fodlanMap.js
//  amb = เสียงบรรยากาศพื้น · wx = เสียงสภาพอากาศ (ลูป) — fodlanAudio.js
//  ชื่อไทย = ชื่อโฟลเดอร์เพลงที่ผู้ใช้ส่งมา (2026-10-27) · ด่าน V ผู้ใช้เรียก "หลุมศพ" (โฟลเดอร์ "การ์เร็ก มัค")
// ============================================================

export const FODLAN_STAGES = [
  { id: 1, numeral: "I", name: "แม่น้ำแอร์มิด", latin: "AIRMID RIVER", color: "#6fb8c9", glow: "#c8f0ff", uv: [0.655, 0.565], amb: "amb_river", wx: "wx_rain" },
  { id: 2, numeral: "II", name: "เรเมียร์", latin: "REMIRE", color: "#8f7bd6", glow: "#d9ccff", uv: [0.37, 0.515], amb: "amb_fog", wx: "wx_miasma" },
  { id: 3, numeral: "III", name: "ชายฝั่งเดอร์ดริว", latin: "DERDRIU COAST", color: "#e0703a", glow: "#ffc08a", uv: [0.8, 0.7], amb: "amb_war", wx: null },
  { id: 4, numeral: "IV", name: "เทือกเขาฟาร์กัส", latin: "FAERGHUS PEAKS", color: "#a9d4f0", glow: "#ffffff", uv: [0.47, 0.17], amb: "amb_snow", wx: "wx_blizzard" },
  { id: 5, numeral: "V", name: "หลุมศพศักดิ์สิทธิ์", latin: "HOLY TOMB", color: "#4fe0a0", glow: "#b8ffd9", uv: [0.505, 0.425], amb: "amb_tomb", wx: null },
];

export const FODLAN_STAGE_COUNT = FODLAN_STAGES.length;

export function clampFodlanStage(s) {
  const n = Math.round(Number(s) || 1);
  return Math.min(FODLAN_STAGE_COUNT, Math.max(1, n));
}
export const fodlanStage = (s) => FODLAN_STAGES[clampFodlanStage(s) - 1];

// หมุด Fodlan บนลูกโลก (หน้าเลือกสนาม + ฉากดิ่งตอนเริ่มแมตช์ต้องตรงกัน) — ทะเลซีกใต้ ห่างหมุด Origin (ภูมิภาค I) ~70° ให้เห็นพร้อมกันได้
export const FODLAN_GEO = { lon: 68, lat: -28 };

// ความยาวฉาก (มิลลิวินาที) — ฉากเปิดแมตช์ (ต่อจากการ์ดผู้เล่น) / ฉากเปลี่ยนแผนที่กลางเกม
export const FODLAN_INTRO_MS = 13000;
export const FODLAN_TRAVEL_MS = 10000;
// สัดส่วนเวลาของฉากเปลี่ยนแผนที่ (FodlanTravel.jsx + FodlanCine.jsx ใช้ร่วมกัน)
export const FODLAN_TRAVEL_T = { route: 0.16, focus: 0.46, swoop: 0.5, stage: 0.62, title: 0.66 };
