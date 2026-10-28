// ============================================================
//  คากุรากิ → ฮาจิ โอเจอร์ — ขบวนการจอมราชันคิงโอเจอร์ · ระดับง่าย · id "kaguragi_ohger" (GRID_PLAN §7.22)
//  ปุ่มบนแกนดาบ 5 (ดำ) · Ohger Finish: เข็มพิษ 5×1 แล้วถอย · ระบบทั้งหมดอยู่ characters/_ohger.js
// ============================================================
const { makeOhger } = require("./_ohger");

module.exports = makeOhger({
  id: "kaguragi_ohger", form: "hachi", btn: 5, name: "คากุรากิ", armorName: "ฮาจิ โอเจอร์", color: "#c9ced8",
  files: { face: "kaguragi.webp", armor: "hachi_ohger.webp", video: "hachi_ohger.mp4" },
});
