// ============================================================
//  คากามิ อาราตะ → Kamen Rider Gatack — ไรเดอร์ ZECT · ง่าย · id "kagami" (GRID_PLAN §7.28)
//  ท่าไม้ตาย Rider Kick: ชาร์จ 3 ครั้ง (1/1/3 แต้ม · ค้างข้ามเทิร์น · ชาร์จแล้วยังเดินได้) → ตีปกติประชิดครั้งถัดไป +1
//   ช็อต 5 + ชา 3 · เป้ามีต้านสถานะ = ทะลุเกราะแทน (รวมไม่เกิน 3) · ระบบทั้งหมดอยู่ characters/_zect.js
// ============================================================
const { makeZect } = require("./_zect");

module.exports = makeZect({
  id: "kagami", rider: "Kamen Rider Gatack", style: "zGatack", sound: "zect_atk_gatack", ult: "kick",
  img: { base: "kagami.jpeg", putOn: "kagami_put_on.webp", castOff: "kagami_cass_off.jpg", clock: "kagami_skill2.jpg", rider: "kagami_skill3.jpg" },
  video: {
    henshin: "kagami.mp4", castOff: "kagami_skill1.mp4", clockUp: "kagami_skill2.mp4",
    kickOne: "kagami_skill3_one.mp4", kickThree: "kagami_skill3_three.mp4", kickFinal: "kagami_skill3_final.mp4",
  },
});
