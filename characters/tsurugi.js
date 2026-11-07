// ============================================================
//  คามิชิโร่ ซึรุงิ → Kamen Rider Sasword — ไรเดอร์ ZECT · ง่าย · id "tsurugi" (GRID_PLAN §7.28)
//  ท่าไม้ตาย Rider Slash: ฟัน 2 ครั้งประชิด (กดสองรอบ) · ครั้งแรกลบบัฟล่าสุดแล้วโจมตีตามปกติ ·
//   ครั้งสองเลือกเป้าใหม่ได้ ดาเมจ 1 + พิษร้าย 3 · ฟันแล้วเดินต่อได้ · ระบบทั้งหมดอยู่ characters/_zect.js
// ============================================================
const { makeZect } = require("./_zect");

module.exports = makeZect({
  id: "tsurugi", rider: "Kamen Rider Sasword", ult: "slash",
  img: { base: "tsurugi.jpg", putOn: "tsurugi_put_on.png", castOff: "tsurugi_cass_off.jpg", clock: "tsurugi_skill2.jpg", rider: "tsurugi_skill3.jpg" },
  video: {
    henshin: "tsurugi.mp4", castOff: "tsurugi_skill1.mp4", clockUp: "tsurugi_skill2.mp4",
    slashFirst: "tsurugi_skill3_first.mp4", slashFinal: "tsurugi_skill3_final.mp4",
  },
});
