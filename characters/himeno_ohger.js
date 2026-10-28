// ============================================================
//  ฮิเมโนะ → คามาคิริ โอเจอร์ — ขบวนการจอมราชันคิงโอเจอร์ · ระดับง่าย · id "himeno_ohger" (GRID_PLAN §7.22)
//  ปุ่มบนแกนดาบ 3 (เหลือง) · Ohger Finish: ฟาด 4×5 ดึงเข้ากลาง · ระบบทั้งหมดอยู่ characters/_ohger.js
// ============================================================
const { makeOhger } = require("./_ohger");

module.exports = makeOhger({
  id: "himeno_ohger", form: "kamakiri", btn: 3, name: "ฮิเมโนะ", armorName: "คามาคิริ โอเจอร์", color: "#f2c21b",
  files: { face: "himeno.jpg", armor: "kamakiri_ohger.webp", video: "kamakiri_ohger.mp4" },
});
