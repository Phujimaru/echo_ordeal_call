// ข้อมูลแสดงผลของฉากสนาม Eos (GRID_PLAN §8.6) — ใช้ร่วมกัน: EosCine.jsx · EosZoneCard.jsx · MatchIntro.jsx · App.jsx

// หมุด Eos บนลูกโลก (หน้าเลือกโหมด ModeVote + ฉากดิ่งตอนเริ่มแมตช์ต้องตรงกัน)
export const EOS_GEO = { lon: -28, lat: -6 };

// ฉากเข้าสนาม (มิลลิวินาที — server/constants.js EOS_START_SECONDS ต้องพักนานพอ)
//  ฉากเดียวต่อเนื่อง: ลูกโลกหมุนหาหมุด → ดิ่ง (eosFlight.js) → ชน = แฟลช → ทะลุเมฆ บินเหนือกระดานจริงลงหาหมากเรา (EosCine.jsx + eosFly.js ยาว (1 − crash) × D)
export const EOS_INTRO_MS = 12000;
export const EOS_T = { turn: 0.13, dive: 0.15, crash: 0.25 };
export const EOS_HANDOFF = EOS_T.crash + 0.03; // แฟลชทึบเต็มจอแล้ว → App ปิดลูกโลกร่วม + วางกระดานข้างใต้

// ป้ายเข้าพื้นที่ — โซนตาม server/fodlan/map6.js ZONES (eosZoneAt ใน eosAudio.js)
// ชื่อ (ไทย = ทับศัพท์) · สี (c หลัก · g เรือง · bg พื้นภาพ)
export const EOS_ZONE_INFO = {
  insomnia: { name: "อินซอมเนีย", latin: "INSOMNIA", c: "#3f7fe6", g: "#cfe8ff", bg: "#050a19" },
  hammerhead: { name: "แฮมเมอร์เฮด", latin: "HAMMERHEAD", c: "#e2782f", g: "#ffd3a0", bg: "#140904" },
  altissia: { name: "อัลทิสเซีย", latin: "ALTISSIA", c: "#22b3a6", g: "#c8fff4", bg: "#03121a" },
  lake: { name: "เคลน", latin: "CLEIGNE", c: "#4f9fd0", g: "#d8f1ff", bg: "#040d18" },
  duscae: { name: "ดัสเค", latin: "DUSCAE", c: "#8fb43c", g: "#efffc4", bg: "#080f05" },
  forest: { name: "ป่าดัสเค", latin: "DUSCAE WOODS", c: "#3f9a55", g: "#d6ffd0", bg: "#030b06" },
  desert: { name: "ไลด์", latin: "LEIDE", c: "#d79a35", g: "#ffe6ad", bg: "#130a03" },
  wild: { name: "ลูซิส", latin: "LUCIS", c: "#7e90c4", g: "#e4ecff", bg: "#07090f" },
};

