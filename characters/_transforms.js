// ============================================================
//  TRANSFORMS — ตาราง cutscene metadata ต่อสถานะ (data ล้วนๆ ไม่มี logic)
//  server/constants.js require แล้วเรียก factory นี้ครั้งเดียว → TRANSFORMS (ใช้ร่วมกันทั้ง server/)
//  path รูป/วีดีโอดึงจากโมดูลตัวละคร/ระบบ (เช่น IMG ของมุยมิ) กันค่าซ้ำสองที่
//
//  afterReveal = เล่นหลังเปิดไพ่ (ท่าไม้ตาย) | ntd/beat เล่นตอน trigger (โดนโจมตี/เลือดต่ำ)
//  voice = เสียงพากย์เล่นต่อเมื่อวีดีโอจบ | music = เพลงสกิลที่ค้างหลัง cutscene
// ============================================================
const muimiImg = require("./muimi").IMG;   // มุยมิ: ใช้ path รูปจาก hook กลาง
const sliverChar = require("./sliver_bullet"); // นักบินปริศนา: วีดีโอเปลี่ยนชิ้นส่วน / Beam Magnum
const mark42 = require("./_mark42"); // เกราะ Mark 42 (ไอเทมร้านค้า): path วีดีโอชุดเดียวกับไฟล์ระบบ
const sora = require("./sora_otosumi"); // โซระ: คลิปแปลงร่าง / Mouse Separade / ชน
const kira = require("./kira"); // กิระ: คลิปสวมเกราะราชัน (ครั้งแรกต่อเกม)
const hikaru = require("./raido_hikaru"); // ไรโด ฮิคารุ: ร่าง UltraLive 6 ร่าง / กิงกะ / สโตเรี่ยม / ท่าไม้ตาย 2 แบบ

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
    // โซระ โอโตสุมิ — แปลงร่าง/ท่าไม้ตายเล่นครั้งแรกต่อเกม · คลิปชนเล่นทุกครั้งที่ชนโดน (sora_otosumi.js คิวเอง)
    //  ความยาวจริง 20.37 / 11.70 / 8.33 วิ ปัดขึ้น
    soraTransform: { img: sora.IMG.myth,   video: sora.VIDEO.transform, title: "Kamen Rider My-Th", label: "แปลงร่าง", seconds: 21, music: null, afterReveal: false },
    soraUlt:       { img: sora.IMG.skill3, video: sora.VIDEO.ult,       title: "Mouse Separade",    label: "ปล่อยท่าไม้ตาย", seconds: 13, music: null, afterReveal: false },
    soraHit:       { img: sora.IMG.skill3, video: sora.VIDEO.hit,       title: "Mouse Separade",    label: "พุ่งชน", seconds: 9, music: null, afterReveal: false, noIntro: true },
    // ไรโด ฮิคารุ — ทุกคลิปเล่นครั้งเดียวต่อเกม (triggerCutscene · ผู้ใช้สั่ง) · ครั้งต่อไปเป็นการ์ดแจ้งเตือน
    //  ความยาวจริง (ffprobe) 13.03 / 9.03 / 3.47 / 13.30 / 11.33 / 18.40 / 20.33 / 18.87 / 10.00 / 16.87 วิ — ปัดขึ้น +1
    hkBlackKing: { img: hikaru.FORMS.blackking.img, video: hikaru.FORMS.blackking.video, title: "แบล็คคิง",          label: "UltraLive", seconds: 15, music: null, afterReveal: false },
    hkThunder:   { img: hikaru.FORMS.thunder.img,   video: hikaru.FORMS.thunder.video,   title: "ทันเดอร์ดารัมเบีย", label: "UltraLive", seconds: 11, music: null, afterReveal: false },
    hkKemur:     { img: hikaru.FORMS.kemur.img,     video: hikaru.FORMS.kemur.video,     title: "มนุษย์ดาวเคมู",     label: "UltraLive", seconds: 5,  music: null, afterReveal: false },
    hkPandon:    { img: hikaru.FORMS.pandon.img,    video: hikaru.FORMS.pandon.video,    title: "คิงแพนด้อน",        label: "UltraLive", seconds: 15, music: null, afterReveal: false },
    hkDoragory:  { img: hikaru.FORMS.doragory.img,  video: hikaru.FORMS.doragory.video,  title: "ดอรากอรี่",         label: "UltraLive", seconds: 13, music: null, afterReveal: false },
    hkTiga:      { img: hikaru.FORMS.tiga.img,      video: hikaru.FORMS.tiga.video,      title: "Ultraman Tiga",     label: "UltraLive", seconds: 20, music: null, afterReveal: false },
    hkGinga:     { img: hikaru.IMG.ginga,  video: hikaru.VIDEO.ginga,  title: "Ultraman Ginga",         label: "แปลงร่าง",       seconds: 22, music: null, afterReveal: false },
    hkStrium:    { img: hikaru.IMG.strium, video: hikaru.VIDEO.strium, title: "Ultraman Ginga Strium",  label: "แปลงร่าง",       seconds: 20, music: null, afterReveal: false },
    hkCross:     { img: hikaru.IMG.skill3, video: hikaru.VIDEO.cross,  title: "Ginga Cross Shoot",      label: "ปล่อยท่าไม้ตาย", seconds: 11, music: null, afterReveal: false },
    hkStriumRay: { img: hikaru.IMG.skill3Strium, video: hikaru.VIDEO.ray, title: "Strium Ray",          label: "ปล่อยท่าไม้ตาย", seconds: 18, music: null, afterReveal: false },
    // กิระ — คลิปสวมเกราะราชันเล่นครั้งแรกที่เข้าร่างราชาแมลงอวกาศต่อเกม (kira.js คิวเอง) · ความยาวจริง 17.90 วิ ปัดขึ้น
    kiraTransform: { img: kira.IMG.king, video: kira.VIDEO.transform, title: "ราชาแมลงอวกาศ", label: "สวมเกราะราชัน", seconds: 19, music: null, afterReveal: false },
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
