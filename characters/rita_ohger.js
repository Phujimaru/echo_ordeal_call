// ============================================================
//  ริต้า → พาพิยอง โอเจอร์ — ขบวนการจอมราชันคิงโอเจอร์ · ระดับง่าย · id "rita_ohger" (GRID_PLAN §7.22)
//  ปุ่มบนแกนดาบ 4 (ม่วง) · Ohger Finish: พุ่ง 4 ช่องแล้วฟัน · ระบบทั้งหมดอยู่ characters/_ohger.js
// ============================================================
const { makeOhger } = require("./_ohger");

module.exports = makeOhger({
  id: "rita_ohger", form: "papiyon", btn: 4, name: "ริต้า", armorName: "พาพิยอง โอเจอร์", color: "#a54ae8",
  files: { face: "rita.jpg", armor: "papillon_ohger.webp", video: "papillon_ohger.mp4" },
});
