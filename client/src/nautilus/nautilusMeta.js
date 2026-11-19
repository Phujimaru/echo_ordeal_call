// ============================================================
//  ข้อมูลแสดงผลของโหมด Nautilus (GRID_PLAN §8.9) — ชั้นใต้ทะเล 5 ชั้น = ด่าน 7–11 ของตัวคุม Fodlan (server/fodlan.js · area 46–50)
//  ใช้ร่วมกัน: fodlan/stages.js (fodlanStage → ป้ายด่าน/ฉาก) · fodlan/fodlanAudio.js (เสียงบรรยากาศ) · ModeVote.jsx (หมุด) · App.jsx/MatchIntro.jsx (ฉากเข้า)
//  ขั้น 1: ฉากเข้า/เปลี่ยนชั้นยืมของ Fodlan (ฉากด่าน = SCENE_STAGE) — ขั้น 5 ทำฉากดิ่งทะเลของตัวเอง
// ============================================================

// หมุด Nautilus บนลูกโลก (หน้าเลือกสนาม + ฉากดิ่งตอนเริ่มแมตช์ต้องตรงกัน) — ทะเลเปิดกว้างที่สุดของโลกจำลอง (globe/globeCore.js ทวีปจาก noise ไม่ใช่โลกจริง)
//  ระหว่างทวีปภูมิภาค V (ตะวันตก) กับหมุด Eos · ห่างฝั่งทุกทิศ (ตรวจด้วยสูตรแผ่นดินของ globeCore 2026-11-19) · หมุดโหมด ffa/duo/trio ก็อยู่ในทะเล
export const NAUTILUS_GEO = { lon: -64, lat: -18 };
export const NAUTILUS_COLOR = 0x1fb8c4; // ฟ้าอมเขียวน้ำลึก (หมุด)
export const NAUTILUS_FIRST = 7;
export const NAUTILUS_LAST = 11;

// amb = เสียงบรรยากาศ (fodlanAudio: คีย์ nt_… → /nautilus/sfx/…) · ambGain = คูณเพิ่ม (ไฟล์ทำที่ -16/-18 LUFS — ผู้ใช้: อย่าให้เสียงบรรยากาศเบาเกินไป 2026-11-19)
// ชื่อชั้นภาษาไทยทั้งหมด (ผู้ใช้สั่ง 2026-11-19 "ชื่อด่านขอเป็นภาษาไทยดีๆ") · latin = ชื่อรอง (ตอนนี้ไทย "ชั้นที่ N")
export const NAUTILUS_LAYERS = [
  { id: 7, numeral: "I", name: "แนวปะการังแสงรำไร", latin: "ชั้นที่ ๑", depth: -30, color: "#2fc4c0", glow: "#c8fff6", amb: "nt_amb_reef", ambGain: 1 },
  { id: 8, numeral: "II", name: "สุสานเรือรบ", latin: "ชั้นที่ ๒", depth: -200, color: "#3f8fb8", glow: "#bfe6ff", amb: "nt_amb_wreck", ambGain: 1 },
  { id: 9, numeral: "III", name: "หุบปล่องเพลิง", latin: "ชั้นที่ ๓", depth: -1000, color: "#e0662e", glow: "#ffc79a", amb: "nt_amb_vents", ambGain: 1 },
  { id: 10, numeral: "IV", name: "นครบาดาลที่สาบสูญ", latin: "ชั้นที่ ๔", depth: -3000, color: "#36d6e6", glow: "#d2fbff", amb: "nt_amb_city", ambGain: 1 },
  { id: 11, numeral: "V", name: "ห้วงเหวไร้แสง", latin: "ชั้นที่ ๕", depth: -10000, color: "#5a6fd8", glow: "#c9d2ff", amb: "nt_amb", ambGain: 1.1 },
];
export const isNautilusStage = (s) => Number(s) >= NAUTILUS_FIRST && Number(s) <= NAUTILUS_LAST;
export const nautilusLayer = (s) => NAUTILUS_LAYERS.find((l) => l.id === Number(s)) || NAUTILUS_LAYERS[0];
// ฉากด่าน Fodlan ที่ยืมมาเล่นตอนเข้า/เปลี่ยนชั้น (ด่าน III ชายฝั่ง — ใกล้ทะเลที่สุด) จนกว่าขั้น 5 จะมีฉากของตัวเอง
export const NAUTILUS_SCENE_STAGE = 3;
export const NAUTILUS_SCENE_FROM = 1;

// เพลง (ผู้ใช้สั่ง 2026-11-19): ชั้น 1–4 ไม่มีเพลง · ทาลัสซาอยู่ = nautilus_whale (ชั้น 1–4) · ชั้น 5 = nautilus_abyss ตลอด — ตัดสินที่ audioPolicy.nautilusMusic
