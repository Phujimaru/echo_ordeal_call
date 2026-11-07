// ============================================================
//  คาซามะ ไดสุเกะ → Kamen Rider Drake — ไรเดอร์ ZECT · ง่าย · id "daisuke" (GRID_PLAN §7.28)
//  ท่าไม้ตาย Rider Shooting: ยิงแนว 5×1 โดนศัตรูคนแรก · ล้างเกราะ 1 แล้วโจมตี +1 · ระบบทั้งหมดอยู่ characters/_zect.js
// ============================================================
const { makeZect } = require("./_zect");

module.exports = makeZect({
  id: "daisuke", rider: "Kamen Rider Drake", ult: "shooting",
  img: { base: "daisuke.webp", putOn: "drake_put_on.jpg", castOff: "daisuke_cass_off.jpg", clock: "daisuke_skill2.jpg", rider: "daisuke_skill3.jpg" },
  video: { henshin: "daisuke.mp4", castOff: "daisuke_skill1.mp4", clockUp: "daisuke_skill2.mp4", rider: "daisuke_skill3.mp4" },
});
