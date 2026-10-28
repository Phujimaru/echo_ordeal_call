// ============================================================
//  ยันมะ → ทอมโบ โอเจอร์ — ขบวนการจอมราชันคิงโอเจอร์ · ระดับง่าย · id "yanma_ohger" (GRID_PLAN §7.22)
//  ปุ่มบนแกนดาบ 2 (น้ำเงิน) · Ohger Finish: พุ่ง 6 ช่องแล้วย้อนกลับ · ระบบทั้งหมดอยู่ characters/_ohger.js
// ============================================================
const { makeOhger } = require("./_ohger");

module.exports = makeOhger({
  id: "yanma_ohger", form: "tonbo", btn: 2, name: "ยันมะ", armorName: "ทอมโบ โอเจอร์", color: "#3b78ff",
  files: { face: "yanma.jpg", armor: "tombo_ohger.webp", video: "tombo_ohger.mp4" },
});
