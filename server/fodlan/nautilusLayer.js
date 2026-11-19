// ============================================================
//  Nautilus (GRID_PLAN §8.9) — ของกลางของชั้นใต้ทะเล 5 ชั้น (ด่าน 7–11 ของตัวคุม server/fodlan.js · area 46–50)
//  stage7.js … stage11.js สร้างจาก makeLayer(n) แล้วเติมฮุคของชั้นนั้นเอง (ตาราง server/fodlan/README.md)
//
//  ขั้น 1 (ตอนนี้): โครงเปล่า — เข้าชั้นไม่ทำอะไร · publicInfo ส่งเลขชั้น/ความลึก/ธงปลาวาฬให้ client
//  ขั้นถัดไป (GRID_PLAN §8.9):
//   ขั้น 2 ทาลัสซา — สถานะทั้งแมตช์ (ข้ามชั้น) เก็บที่ match.fodlan.whale = { present, hp, … } → ธง whale ด้านล่าง
//          (client/src/audioPolicy.js: ชั้น 7–10 มีปลาวาฬ = เพลง nautilus_whale ทับ · ชั้น 11 เพลง nautilus_abyss ตลอด)
//   ขั้น 3 เรือ Nautilus — จอดที่ DOCK ของ mapN.js (6×2 ขอบบน) ผ่านฮุค layer/objects/hudActions
//   ขั้น 4 ลูกเล่นของชั้น + สภาพอากาศ (st.weather.kind = nt_…) + แรงดันน้ำ
//   ขั้น 5 ฉากเข้า/เปลี่ยนชั้นของตัวเอง (ตอนนี้ยืมฉาก Fodlan)
// ============================================================
const DEPTHS = { 7: -30, 8: -200, 9: -1000, 10: -3000, 11: -10000 };
const LAYERS = 5;
const FIRST_STAGE = 7;
const LAST_STAGE = FIRST_STAGE + LAYERS - 1;
// ชนิดสภาพอากาศของแต่ละชั้น (สุ่มเท่ากันจากชุดของชั้น · ผลมาในขั้น 4)
const WEATHER_POOLS = {
  7: ["nt_storm"],
  8: ["nt_sharks", "nt_silt"],
  9: ["nt_eruption", "nt_quake"],
  10: ["nt_maelstrom", "nt_cold"],
  11: ["nt_dark"],
};
const WEATHER_NAMES = {
  nt_storm: "พายุใต้ทะเล",
  nt_sharks: "ฝูงฉลามได้กลิ่นเลือด",
  nt_silt: "กระแสตะกอนถล่ม",
  nt_eruption: "ภูเขาไฟใต้ทะเลปะทุ",
  nt_quake: "แผ่นดินไหวใต้ทะเล",
  nt_maelstrom: "น้ำวนยักษ์",
  nt_cold: "กระแสน้ำเย็นจัด",
  nt_dark: "ความมืดบีบ",
};

// ปลาวาฬอยู่บนกระดานตอนนี้ไหม (ขั้น 2 ตั้ง match.fodlan.whale.present) — client ใช้สลับเพลง
function whalePresent(ctx) {
  const w = ctx.match.fodlan && ctx.match.fodlan.whale;
  return !!(w && w.present);
}

function makeLayer(stage) {
  const layer = stage - FIRST_STAGE + 1;
  return {
    LAYER: layer,
    DEPTH: DEPTHS[stage],
    enter() {},
    publicInfo(ctx) {
      return { layer, depth: DEPTHS[stage], whale: whalePresent(ctx) };
    },
  };
}

module.exports = { DEPTHS, LAYERS, FIRST_STAGE, LAST_STAGE, WEATHER_POOLS, WEATHER_NAMES, makeLayer, whalePresent };
