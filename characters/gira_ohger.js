// ============================================================
//  กิระ → คุวากาตะ โอเจอร์ — ขบวนการจอมราชันคิงโอเจอร์ · ระดับง่าย · id "gira_ohger" (GRID_PLAN §7.22)
//  ปุ่มบนแกนดาบ 1 (แดง) · Ohger Finish: ฟาด 4×4 · ระบบทั้งหมดอยู่ characters/_ohger.js
// ============================================================
const { makeOhger } = require("./_ohger");

module.exports = makeOhger({
  id: "gira_ohger", form: "kuwagata", btn: 1, name: "กิระ", armorName: "คุวากาตะ โอเจอร์", color: "#e23b3b",
  files: { face: "gira.jpg", armor: "kuwagata_ohger.jpg", video: "kuwagata_ohger.mp4" },
});
