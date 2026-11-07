// ============================================================
//  โซ ยากุรุมะ → Kamen Rider TheBee — ไรเดอร์ ZECT · ง่าย · id "yaguruma" (GRID_PLAN §7.28)
//  ท่าไม้ตาย Rider Sting: ประชิด · ล้างต้านสถานะ แล้วโจมตี +1 · พิษร้าย 3 + ผุพัง 2 · ระบบทั้งหมดอยู่ characters/_zect.js
// ============================================================
const { makeZect } = require("./_zect");

module.exports = makeZect({
  id: "yaguruma", rider: "Kamen Rider TheBee", ult: "sting",
  img: { base: "yaguruma.webp", putOn: "yaguruma_put_on.jpg", castOff: "yaguruma_cass_off.jpg", clock: "yaguruma_skill2.jpg", rider: "yaguruma_skill3.webp" },
  video: { henshin: "yaguruma.mp4", castOff: "yaguruma_skill1.mp4", clockUp: "yaguruma_skill2.mp4", rider: "yaguruma_skill3.mp4" },
});
