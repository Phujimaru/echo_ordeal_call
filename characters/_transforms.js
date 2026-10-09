// ============================================================
//  TRANSFORMS — ตาราง cutscene metadata ต่อสถานะ (data ล้วนๆ ไม่มี logic)
//  ย้ายออกมาจาก server.js เพื่อลดขนาดไฟล์หลัก — ยังคง require เป็น const เดียวใน server.js เหมือนเดิม
//  รับ path รูปภาพที่ server.js ใช้ร่วมกับที่อื่น (เช่น displayImg) ผ่าน factory function กันค่าซ้ำสองที่
//
//  afterReveal = เล่นหลังเปิดไพ่ (ท่าไม้ตาย) | ntd/beat เล่นตอน trigger (โดนโจมตี/เลือดต่ำ)
//  voice = เสียงพากย์เล่นต่อเมื่อวีดีโอจบ | music = เพลงสกิลที่ค้างหลัง cutscene
// ============================================================
const muimiImg = require("./muimi").IMG;   // มุยมิ: ใช้ path รูปจาก hook กลาง
const sliverChar = require("./sliver_bullet"); // นักบินปริศนา: วีดีโอเปลี่ยนชิ้นส่วน / Beam Magnum
const mark42 = require("./_mark42"); // เกราะ Mark 42 (ไอเทมร้านค้า): path วีดีโอชุดเดียวกับไฟล์ระบบ

module.exports = function buildTransforms() {
  return {
    // มุยมิ: ครั้งแรกเล่นคลิปเต็ม 23.803 วิ ครั้งถัดไปเล่นคลิปสั้น 11.078 วิ
    // ปัดขึ้นเผื่อเวลาตัดฉากเพื่อให้วิดีโอเล่นจบครบ และ queueCutscene ทำให้เล่นทุกครั้งที่กด
    muimiUltimateFull:  { img: muimiImg.skill3, video: "/characters/muimi/muimi_skill3.mp4",       title: "ดาบสะบั้นหอคอยสวรรค์", label: "ปล่อยท่าไม้ตาย", seconds: 24, music: "muimi", afterReveal: false },
    muimiUltimateShort: { img: muimiImg.skill3, video: "/characters/muimi/muimi_skill3_short.mp4", title: "ดาบสะบั้นหอคอยสวรรค์", label: "ปล่อยท่าไม้ตาย", seconds: 12, music: "muimi", afterReveal: false },
    // นักบินปริศนา — ทั้งสองคลิปเต็มครั้งแรกต่อเกม (sliver_bullet.js ตั้ง cutsceneShown เอง) · ครั้งต่อไปเป็นเสียง/การ์ดแจ้งเตือน
    //  sliverReload ระหว่างล่องหนคิวแบบ onlyFor (นักบิน + เพื่อนร่วมทีม) · ความยาวจริง skill1 3.10 / skill2 5.07 วิ
    sliverReload: { img: sliverChar.IMG.skill1, video: sliverChar.VIDEO.reload, title: "เปลี่ยนชิ้นส่วน", label: "ซ่อมแซม", seconds: 5, music: null, afterReveal: false },
    sliverBeam:   { img: sliverChar.IMG.skill2, video: sliverChar.VIDEO.beam,   title: "Beam Magnum",     label: "ยิงทำลาย", seconds: 7, music: null, afterReveal: false },
    // เกราะ Mark 42 (ไอเทม) — คิวจากโค้ดทุกครั้ง แล้วผลเกิดหลังคลิปจบ · seconds จาก mvhd (15.40 / 23.24 / 12.51 / 16.17) ปัดขึ้น
    mark42Suitup:   { img: mark42.IMG.suit, video: mark42.VIDEO.suitup,   title: "เกราะ Mark 42", label: "สวมเกราะ",            seconds: 16, music: null, afterReveal: false },
    mark42Recall:   { img: mark42.IMG.suit, video: mark42.VIDEO.recall,   title: "เกราะ Mark 42", label: "เรียกเกราะกลับมาสวม",  seconds: 24, music: null, afterReveal: false },
    mark42SuitSome: { img: mark42.IMG.suit, video: mark42.VIDEO.suitSome, title: "เกราะ Mark 42", label: "ส่งเกราะไปสวมให้",     seconds: 13, music: null, afterReveal: false },
    mark42Bomb:     { img: mark42.IMG.suit, video: mark42.VIDEO.bomb,     title: "เกราะ Mark 42", label: "ระเบิด!",              seconds: 17, music: null, afterReveal: false },
    // ---------- ปืนหน่วย GUTS Select (ร้านค้ามายา) ----------
    //  ไม่ใช่ของตัวละครไหน — เป็นไอเทมที่ใครซื้อก็ยิงได้ เล่นวีดีโอทุกครั้งที่ยิง (queueCutscene ตรงๆ ไม่ผ่าน triggerCutscene)
    //  seconds วัดจาก mvhd atom จริง (+buffer ~0.5-1 วิ กันตัดก่อนจบ)
    gutsShockwave: { img: "/item/guts_key/gomora_key.webp",    video: "/item/guts_key/shockwave_boost.mp4",    title: "SHOCKWAVE BULLET",   label: "ยิงปืนหน่วย GUTS Select", seconds: 11, music: null, afterReveal: false }, // shockwave_boost.mp4 ~9.51s
    gutsGargorgon: { img: "/item/guts_key/gargorgon_key.webp", video: "/item/guts_key/gargorgon_ray.mp4",      title: "GARGORGON RAY",      label: "ยิงปืนหน่วย GUTS Select", seconds: 9,  music: null, afterReveal: false }, // gargorgon_ray.mp4 ~7.67s
    gutsThunder:   { img: "/item/guts_key/eleking_key.webp",   video: "/item/guts_key/thunder_boost.mp4",      title: "THUNDER BULLET",     label: "ยิงปืนหน่วย GUTS Select", seconds: 7,  music: null, afterReveal: false }, // thunder_boost.mp4 ~5.38s
    gutsNurse:     { img: "/item/guts_key/nurse_key.webp",     video: "/item/guts_key/nursedessei_cannon.mp4", title: "NURSEDESSEI CANNON", label: "ยิงปืนหน่วย GUTS Select", seconds: 16, music: null, afterReveal: false }, // nursedessei_cannon.mp4 ~14.40s
  };
};
