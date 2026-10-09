// ============================================================
//  ข้อมูลแสดงผลของ 7 ภูมิภาคในระบบ "การเดินทาง" (Journey)
//  ภูมิภาคเปลี่ยนทุก 6 เทิร์น (ต้องตรง AREA_TURNS ใน characters/_journey.js): 1–6 = ภูมิภาค 1 เสมอ แล้วสุ่มจาก 2–7 (server ส่งมาใน state.journey)
//  ใช้ร่วมกันระหว่าง JourneyBackdrop / HUD / ฉากเดินทางบนลูกโลก (oc/intro: MatchIntro, RegionTravel)
//  icon = คีย์ตราสัญลักษณ์เดิม (ตอนนี้ไม่มีที่ใช้แล้ว เก็บไว้เผื่อ HUD)
// ============================================================

export const JOURNEY_AREAS = [
  { id: 1, name: "อาณาจักรแห่งจุดเริ่มต้น", short: "จุดเริ่มต้น", numeral: "I", color: "#e3bd5c", glow: "#ffe6a0", icon: "castle" },
  { id: 2, name: "สวนดอกไม้ทุ่งหญ้าแสนอบอุ่น", short: "ทุ่งดอกไม้", numeral: "II", color: "#f19ab9", glow: "#ffd3e3", icon: "flower" },
  { id: 3, name: "ป่าไม้ต้องสาป", short: "ป่าต้องสาป", numeral: "III", color: "#9dbb5e", glow: "#d6f29a", icon: "tree" },
  { id: 4, name: "คลื่นวงวนน้ำ", short: "วังวนน้ำ", numeral: "IV", color: "#46bfd6", glow: "#a8f1ff", icon: "whirl" },
  { id: 5, name: "ทะเลทรายไม่อาจหวนคืน", short: "ทะเลทราย", numeral: "V", color: "#f0a043", glow: "#ffd79a", icon: "sun" },
  { id: 6, name: "อาณาจักรน้ำแข็ง", short: "แดนน้ำแข็ง", numeral: "VI", color: "#9fd8f5", glow: "#e6f8ff", icon: "snow" },
  { id: 7, name: "จุดสิ้นสุดของโลก", short: "สุดขอบโลก", numeral: "VII", color: "#e0342f", glow: "#ff8a5c", icon: "flame" },
];

export const JOURNEY_AREA_COUNT = JOURNEY_AREAS.length;
export const JOURNEY_TURNS_PER_AREA = 6;

/** บีบค่าให้อยู่ในช่วง 1..7 */
export function clampJourneyArea(area) {
  const a = Math.round(Number(area) || 1);
  return Math.min(JOURNEY_AREA_COUNT, Math.max(1, a));
}

export function journeyArea(area) {
  return JOURNEY_AREAS[clampJourneyArea(area) - 1];
}
