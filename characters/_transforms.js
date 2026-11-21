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
const sora = require("./sora_otosumi"); // โซระ: คลิปแปลงร่าง / Mouse Separade / ชน
const kira = require("./kira"); // กิระ: คลิปสวมเกราะราชัน (ครั้งแรกต่อเกม)
const hikaru = require("./raido_hikaru");
const yuna = require("./yuna"); // ยูนะ: คลิปร้อนแรงดังไฟ (ทุกครั้งที่กด)
const dio = require("./dio_brando"); // ดิโอ: BloodStack 6 / Last Stand เริ่ม + แพ้ / Road Roller
const diego = require("./diego_alt"); // ดิเอโก้: เป็นไปดั่งกลอุบาย intro (ทุกครั้งที่พุ่ง) / final (ทุกครั้งที่ชน)
const celine = require("./celine"); // เซลิน: คลิปคริก่อนฉากตี (สายดาบ/สายเวท) · การ์ดท่าไม้ตาย
const emiya = require("./emiya_shirou"); // เอมิยะ ชิโร่: Caladbolg II (ก่อน/หลังเลือกทิศ) · Unlimited Blade Works — ทุกครั้งที่กด
const kazuma = require("./kensaki_kazuma"); // เคนซากิ คาซุมะ: แปลงร่าง (ครั้งแรกต่อเกม) · มือเปล่าติดคริ (ก่อนฉากตี) · ท่า Lightning 3 แบบ (ตอนโดน)
const roland = require("./roland"); // โรลันด์: Furioso — คลิปผู้ใช้
const law = require("./trafalgar_law"); // ทราฟาก้า ลอว์: เปิด Room ครั้งแรกต่อเกม · Gamma Knife / Mess (ตีเสริมโดน) · Counter Shock — คลิปผู้ใช้ทุกตัว
const foxy = require("./foxy"); // ฟ็อกซี่: ตีปกติ (พื้นใส) / สมองเต็ม / เข้ากลางคืน
const freddy = require("./freddy_fazbear"); // เฟรดดี้ ฟาซแบร์: จัมป์สแกร์ (ชนะมินิเกมประตู)
const yuki = require("./yuki_makoto"); // ยูกิ มาโคโตะ: เกิดใหม่เป็นประตู (ตอนครบเวลานับถอยหลัง ก่อนฉากระเบิด)
const oto = require("./kurenai_otoya"); // คุเรไน โอโตยะ: Wake Up 1/2 + ตีลง Wake Up 2 ทุกครั้ง · ที่เหลือครั้งเดียว (ผู้ใช้)
const gio = require("./giorno_giovanna"); // โจรุโน่: คลิปท่าไม้ตาย/คริเล่นทุกครั้ง · ต้นไม้/เศษเดนมนุษย์ครั้งเดียว
const ot = require("./old_truck"); // รถบรรทุกเก่า / ออพติมัส ไพร์ม: คลิปผู้ใช้ 4 ตัว เล่นครั้งแรกต่อเกมเท่านั้น (ผู้ใช้สั่ง)
const kiri = require("./emiya_kiritsugu"); // เอมิยะ คริซุงุ: Time Alter ทุกครั้ง · Thompson ยิง/โดน ทุกครั้ง
const shinra = require("./kusakabe_shinra"); // คุซาคาเบะ ชินระ: อุ่นเครื่องพอแล้ว ครั้งแรกของแมตช์ · ลาทัม ทุกครั้ง
const arm = require("./armstrong"); // อาร์มสตรอง: ทุกคลิปเล่นทุกครั้ง ยกเว้นเปิดนาโน (ครั้งแรกของเกม — triggerCutscene) · ผู้ใช้ 2026-11-21
const midoriya = require("./midoriya_izuku"); // มิโดริยะ อิซึคุ: Smash 4 แบบทุกครั้ง · 1,000,000% ครั้งแรกของแมตช์
const dino = require("./diego_dino"); // ดิเอโก้ อสูรกายดึกดำบรรพ์: ทุกคลิปทุกครั้ง (GRID_PLAN §7.36)
const magna = require("./magna"); // แม็กน่า สวิง: Deathmatch (โซ่ติด) / Finisher (ทำงาน) ทุกครั้ง
const inui = require("./inui_takumi"); // อินุอิ ทาคุมิ: แปลงร่างครั้งแรกต่อเกม · คลิปอื่นเล่นทุกครั้ง
const ZECT = ["daisuke", "yaguruma", "kagami", "tsurugi"].map((id) => require(`./${id}`)); // ไรเดอร์ ZECT (GRID_PLAN §7.28)
const gil = require("./gilgamesh_fake"); // กิลกาเมช (Fake): ชัก EA / ตี EA ครั้งแรก / ประตูบาบิโลนครั้งแรก — ครั้งเดียวต่อเกม · EAชาร์จ ครั้งแรกเต็ม
const gray = require("./gray"); // เกรย์: รองโกมิเนียต intro (ตอนกด) / final (ตอนยิง) // ไรโด ฮิคารุ: ร่าง UltraLive 6 ร่าง / กิงกะ / สโตเรี่ยม / ท่าไม้ตาย 2 แบบ

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
    // บานาจ ลิงซ์ (GRID_PLAN §7.5.1) — จังหวะเล่นอยู่ใน sliver_bullet.js · seconds = ความยาวจริงปัดขึ้น
    banagherWear:     { img: sliverChar.IMG.laplace, video: sliverChar.VIDEO.wear,     title: "กล่องของลาพลัส",  label: "สวมใส่",       seconds: 20, music: null, afterReveal: false }, // 19.27 วิ
    banagherNtd:      { img: sliverChar.IMG.ntd,     video: sliverChar.VIDEO.ntd,      title: "NT-D ทำงาน",      label: "Destroy Mode", seconds: 15, music: null, afterReveal: false }, // 14.40 วิ
    banagherNtdShot:  { img: sliverChar.IMG.ntd,     video: sliverChar.VIDEO.ntdShot,  title: "NT-D ทำงาน",      label: "Destroy Mode", seconds: 7,  music: null, afterReveal: false }, // 6.43 วิ
    banagherAbsorb:   { img: sliverChar.IMG.shield,  video: sliverChar.VIDEO.absorb,   title: "โล่ดูดซับ",       label: "ดูดซับ",       seconds: 6,  music: null, afterReveal: false }, // 4.83 วิ
    banagherGuard:    { img: sliverChar.IMG.guard,   video: sliverChar.VIDEO.guard,    title: "โล่ผู้พิทักษ์",    label: "ล่อเป้า",      seconds: 4,  music: null, afterReveal: false }, // 3.13 วิ
    banagherReload:   { img: sliverChar.IMG.beam,    video: sliverChar.VIDEO.bReload,  title: "Beam Magnum",     label: "รีโหลด",       seconds: 3,  music: null, afterReveal: false }, // 1.70 วิ
    banagherBeam:     { img: sliverChar.IMG.beam,    video: sliverChar.VIDEO.bBeam,    title: "Beam Magnum",     label: "ยิงทำลาย",     seconds: 5,  music: null, afterReveal: false }, // 3.63 วิ
    banagherBeamNtd:  { img: sliverChar.IMG.beamNtd, video: sliverChar.VIDEO.bBeamNtd, title: "Beam Magnum",     label: "ยิงทำลาย",     seconds: 6,  music: null, afterReveal: false }, // 4.80 วิ
    banagherBeamUlt:  { img: sliverChar.IMG.beamUlt, video: sliverChar.VIDEO.bBeamUlt, title: "Beam Magnum",     label: "ยิงทำลาย",     seconds: 6,  music: null, afterReveal: false }, // 4.53 วิ
    banagherUnicorn:  { img: sliverChar.IMG.ult,     video: sliverChar.VIDEO.unicorn,  title: "ยูนิคอร์น!!!!",    label: "New Type Paradise", seconds: 16, music: null, afterReveal: false }, // 14.77 วิ
    // โซระ โอโตสุมิ — แปลงร่าง/ท่าไม้ตายเล่นครั้งแรกต่อเกม · คลิปชนเล่นทุกครั้งที่ชนโดน (sora_otosumi.js คิวเอง)
    //  ความยาวจริง 20.37 / 11.70 / 8.33 วิ ปัดขึ้น
    soraTransform: { img: sora.IMG.myth,   video: sora.VIDEO.transform, title: "Kamen Rider My-Th", label: "แปลงร่าง", seconds: 21, music: null, afterReveal: false },
    soraUlt:       { img: sora.IMG.skill3, video: sora.VIDEO.ult,       title: "Mouse Separade",    label: "ปล่อยท่าไม้ตาย", seconds: 13, music: null, afterReveal: false },
    soraHit:       { img: sora.IMG.skill3, video: sora.VIDEO.hit,       title: "Mouse Separade",    label: "พุ่งชน", seconds: 9, music: null, afterReveal: false, noIntro: true },
    // Fire Frame (seconds = ความยาวจริงปัดขึ้น) — แปลงร่าง/คลิปเปิดท่าไม้ตายครั้งแรกต่อเกม · คลิปชนทุกครั้ง
    soraFire:      { img: sora.IMG.fire,   video: sora.VIDEO.fire,      title: "Fire Frame",        label: "แปลงร่าง", seconds: 18, music: null, afterReveal: false },
    soraFireUlt:   { img: sora.IMG.fire,   video: sora.VIDEO.fireUlt,   title: "Mouse Separade",    label: "ปล่อยท่าไม้ตาย", seconds: 12, music: null, afterReveal: false },
    soraFireHit:   { img: sora.IMG.fire,   video: sora.VIDEO.fireHit,   title: "Mouse Separade",    label: "พุ่งชน", seconds: 11, music: null, afterReveal: false, noIntro: true },
    // Eagle / Tutle / Orca Frame (ผู้ใช้สั่ง 2026-11-15): แปลงร่าง/คลิปเปิดท่าไม้ตาย = ครั้งแรกต่อเกม · คลิปชน + Orca Echo = ทุกครั้ง
    soraEagle:     { img: sora.IMG.eagle,    video: sora.VIDEO.eagle,    title: "Eagle Frame",    label: "แปลงร่าง", seconds: 21, music: null, afterReveal: false },
    soraEagleUlt:  { img: sora.IMG.eagleUlt, video: sora.VIDEO.eagleUlt, title: "Eagle Separade", label: "ปล่อยท่าไม้ตาย", seconds: 5, music: null, afterReveal: false },
    soraEagleHit:  { img: sora.IMG.eagleUlt, video: sora.VIDEO.eagleHit, title: "Eagle Separade", label: "พุ่งชน", seconds: 7, music: null, afterReveal: false, noIntro: true },
    soraTutle:     { img: sora.IMG.tutle,    video: sora.VIDEO.tutle,    title: "Tutle Frame",    label: "แปลงร่าง", seconds: 20, music: null, afterReveal: false },
    soraTutleUlt:  { img: sora.IMG.tutleUlt, video: sora.VIDEO.tutleUlt, title: "Tutle Separade", label: "ปล่อยท่าไม้ตาย", seconds: 12, music: null, afterReveal: false },
    soraTutleHit:  { img: sora.IMG.tutleUlt, video: sora.VIDEO.tutleHit, title: "Tutle Separade", label: "โจมตี", seconds: 16, music: null, afterReveal: false, noIntro: true },
    soraOrca:      { img: sora.IMG.orca,     video: sora.VIDEO.orca,     title: "Orca Frame",     label: "แปลงร่าง", seconds: 18, music: null, afterReveal: false },
    soraOrcaUlt:   { img: sora.IMG.orcaUlt,  video: sora.VIDEO.orcaUlt,  title: "Orca Separade",  label: "ปล่อยท่าไม้ตาย", seconds: 3, music: null, afterReveal: false },
    soraOrcaHit:   { img: sora.IMG.orcaUlt,  video: sora.VIDEO.orcaHit,  title: "Orca Separade",  label: "พุ่งชน", seconds: 15, music: null, afterReveal: false, noIntro: true },
    soraOrcaEcho:  { img: sora.IMG.orcaEcho, video: sora.VIDEO.orcaEcho, title: "Orca Echo",      label: "สกิลรอง", seconds: 6, music: null, afterReveal: false, noIntro: true },
    // ดิเอโก้ แบรนโด (โลกคู่ขนาน) — เป็นไปดั่งกลอุบาย: intro ทุกครั้งก่อนพุ่ง · final ทุกครั้งที่ชน (ผู้ใช้สั่ง 2026-10-20) · ความยาวจริง 1.17 / 5.43 วิ
    dioBlood6: { img: dio.IMG.base, video: dio.VIDEO.blood6, title: "ดิโอ", label: "BloodStack 6", seconds: 8, music: null, afterReveal: false, noIntro: true },
    dioLastStand: { img: dio.IMG.base, video: dio.VIDEO.last, title: "Last Stand", label: "Last Stand", seconds: 7, music: null, afterReveal: false, noIntro: true },
    dioLastStandFail: { img: dio.IMG.base, video: dio.VIDEO.lastFail, title: "Last Stand", label: "Last Stand", seconds: 8, music: null, afterReveal: false, noIntro: true },
    dioRoadRoller: { img: dio.IMG.roller, video: dio.VIDEO.roller, title: "Road Roller", label: "ท่าไม้ตาย", seconds: 5, music: null, afterReveal: false, noIntro: true },
    diegoPlotIntro: { img: diego.IMG.plot, video: diego.VIDEO.intro, title: "เป็นไปดั่งกลอุบาย", label: "ปล่อยท่าไม้ตาย", seconds: 2, music: null, afterReveal: false, noIntro: true },
    diegoPlotFinal: { img: diego.IMG.plot, video: diego.VIDEO.final, title: "เป็นไปดั่งกลอุบาย", label: "พุ่งชน", seconds: 6, music: null, afterReveal: false, noIntro: true },
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
    // ยูนะ — คลิปร้อนแรงดังไฟเล่นทุกครั้งที่กด (ผู้ใช้สั่ง) แล้วเพลง Break Beat Bark! (state.skillMusic "yuna_idol") · ความยาวจริง 9.10 วิ ปัดขึ้น
    // เกรย์ — รองโกมิเนียต: intro ตอนกด · final ตอนยิง (ต้นตาเดินเทิร์น N+2) เล่นทุกครั้ง · ความยาวจริง 12.30 / 22.40 วิ ปัดขึ้น
    grayUltIntro: { img: gray.IMG.skill3, video: gray.VIDEO.intro, title: "รองโกมิเนียต", label: "ปลดผนึก", seconds: 13, music: null, afterReveal: false },
    grayUltFinal: { img: gray.IMG.skill3, video: gray.VIDEO.final, title: "รองโกมิเนียต", label: "ปล่อยท่าไม้ตาย", seconds: 23, music: null, afterReveal: false },
    // เซลิน — ตีปกติติดคริ = คลิปคริตามสายอาวุธก่อนฉากตีทุกครั้ง (ความยาวจริง 2.47 / 3.37 วิ) · ท่าไม้ตาย = การ์ดแจ้งเตือน (ไม่มีคลิป)
    celineCritSword: { img: celine.IMG.base, video: celine.VIDEO.critSword, title: "คริติคอล", label: "องค์หญิงดอกไม้ เซลิน", seconds: 2.6, music: null, afterReveal: false, noIntro: true },
    celineCritMage: { img: celine.IMG.base, video: celine.VIDEO.critMage, title: "คริติคอล", label: "องค์หญิงดอกไม้ เซลิน", seconds: 3.5, music: null, afterReveal: false, noIntro: true },
    celineUlt: { img: celine.IMG.skill3, video: null, title: "สวนดอกไม้ของฉัน", label: "ราชาดอกไม้", seconds: 0, music: null, afterReveal: false },
    // เอมิยะ ชิโร่ — Caladbolg II เล่นต่อกัน 2 คลิปทุกครั้ง (ง้างธนู → ลูกธนูระเบิด) · UBW ทุกครั้งที่กด · ความยาวจริง 9.26 / 3.25 / 22.73 วิ ปัดขึ้น
    emiyaCaladbolgBefore: { img: emiya.IMG.s("caladbolg"), video: emiya.VIDEO.calBefore, title: "Caladbolg II", label: "เอมิยะ ชิโร่", seconds: 9.6, music: null, afterReveal: false },
    emiyaCaladbolgAfter:  { img: emiya.IMG.s("caladbolg"), video: emiya.VIDEO.calAfter,  title: "Caladbolg II", label: "เอมิยะ ชิโร่", seconds: 3.6, music: null, afterReveal: false, noIntro: true },
    emiyaUbw:             { img: emiya.IMG.ubw,            video: emiya.VIDEO.ubw,       title: "Unlimited Blade Works", label: "ปล่อยท่าไม้ตาย", seconds: 23.2, music: null, afterReveal: false },
    // เคนซากิ คาซุมะ — ทุกครั้ง · ความยาวจริง 2.03 / 14.74 / 6.0 / 20.57 วิ ปัดขึ้น
    kazumaHenshin: { img: kazuma.IMG.blade,      video: kazuma.VIDEO.henshin,        title: "Kamen Rider Blade", label: "แปลงร่าง",        seconds: 13.5, music: null, afterReveal: false },
    kazumaCrit:  { img: kazuma.IMG.blade,        video: kazuma.VIDEO.crit,           title: "คริติคอล",        label: "เคนซากิ คาซุมะ", seconds: 2.1, music: null, afterReveal: false, noIntro: true },
    kazumaBlast: { img: kazuma.IMG.ult("blast"), video: kazuma.VIDEO.combo("blast"), title: "Lightning Blast", label: "ปล่อยท่าไม้ตาย", seconds: 15, music: null, afterReveal: false },
    kazumaSlash: { img: kazuma.IMG.ult("slash"), video: kazuma.VIDEO.combo("slash"), title: "Lightning Slash", label: "ปล่อยท่าไม้ตาย", seconds: 6.1, music: null, afterReveal: false },
    // ทราฟาก้า ลอว์ — Room ครั้งแรกต่อเกม · Gamma Knife / Mess / Counter Shock ทุกครั้ง · ความยาวจริง 4.97 / 9.23 / 6.73 / 3.07 วิ ปัดขึ้น
    lawRoom:  { img: law.IMG.room,  video: law.VIDEO.room,  title: "ROOM",          label: "ทราฟาก้า ลอว์",   seconds: 5.0, music: null, afterReveal: false },
    lawGamma: { img: law.IMG.ult, video: law.VIDEO.gamma, title: "Gamma Knife",   label: "ปล่อยท่าไม้ตาย", seconds: 9.3, music: null, afterReveal: false },
    lawMess:  { img: law.IMG.mess,  video: law.VIDEO.mess,  title: "Mess",          label: "ปล่อยท่าไม้ตาย", seconds: 6.8, music: null, afterReveal: false },
    // ยูกิ มาโคโตะ — เกิดใหม่เป็นประตู ตอนครบเวลา (ก่อนฉากระเบิด) · ความยาวจริง 17.70 วิ ปัดขึ้น (เสียงในคลิป)
    yukiUlt: { img: yuki.IMG.skill3, video: yuki.VIDEO.skill3, title: "เกิดใหม่เป็นประตู", label: "ปล่อยท่าไม้ตาย", seconds: 18, music: null, afterReveal: false },
    rolandFurioso: { img: roland.IMG.furioso, video: roland.VIDEO.furioso, title: "Furioso", label: "ปล่อยท่าไม้ตาย", seconds: 9.9, music: null, afterReveal: false },
    lawShock: { img: law.IMG.base,  video: law.VIDEO.shock, title: "Counter Shock", label: "ทราฟาก้า ลอว์",   seconds: 3.1, music: null, afterReveal: false, noIntro: true },
    kazumaSonic: { img: kazuma.IMG.ult("sonic"), video: kazuma.VIDEO.combo("sonic"), title: "Lightning Sonic", label: "ปล่อยท่าไม้ตาย", seconds: 20.6, music: null, afterReveal: false },
    kazumaKing: { img: kazuma.IMG.king, video: kazuma.VIDEO.king, title: "ร่างคิง", label: "แปลงร่าง", seconds: 20.3, music: null, afterReveal: false },
    kazumaDeform: { img: kazuma.IMG.base, video: kazuma.VIDEO.deform, title: "เคนซากิ คาซุมะ", label: "คืนร่าง", seconds: 8.7, music: null, afterReveal: false },
    kazumaStraight: { img: kazuma.IMG.ult("straight"), video: kazuma.VIDEO.straight, title: "Straight Flush", label: "ปล่อยท่าไม้ตาย", seconds: 15.7, music: null, afterReveal: false },
    kazumaFour: { img: kazuma.IMG.ult("four"), video: kazuma.VIDEO.four, title: "Four Card", label: "ปล่อยท่าไม้ตาย", seconds: 21.1, music: null, afterReveal: false },
    kazumaRoyal: { img: kazuma.IMG.ult("royal"), video: kazuma.VIDEO.royal, title: "Royal Straight Flush", label: "ปล่อยท่าไม้ตาย", seconds: 13, music: null, afterReveal: false },
    yunaIdol: { img: yuna.IMG.ult, video: yuna.VIDEO.ult, title: "ร้อนแรงดังไฟ", label: "ยูนะ ไอดอล", seconds: 10, music: null, afterReveal: false },
    // ---------- นกหวีดอัญเชิญมนต์อสูรเทพ (server/whistle.js — ช่องพิเศษที่ 6 ของกระเป๋า) ----------
    //  เต็มจอทุกครั้งที่เป่าติด · ผลลงหลังคลิป · ความยาวจริง 24.23 / 25.03 / 26.13 / 21.30 วิ ปัดขึ้น
    divineCrossWinds:   { img: "/item/divine_whistle/cross_winds.webp",   video: "/item/divine_whistle/cross_winds.mp4",   title: "CROSS WINDS",   label: "นกหวีดอัญเชิญมนต์อสูรเทพ", seconds: 25, music: null, afterReveal: false },
    divineTsunami:      { img: "/item/divine_whistle/tsunami.webp",       video: "/item/divine_whistle/tsunami.mp4",       title: "TSUNAMI",       label: "นกหวีดอัญเชิญมนต์อสูรเทพ", seconds: 26, music: null, afterReveal: false },
    divineDiamondDust:  { img: "/item/divine_whistle/diamond_dust.webp",  video: "/item/divine_whistle/diamond_dust.mp4",  title: "DIAMOND DUST",  label: "นกหวีดอัญเชิญมนต์อสูรเทพ", seconds: 27, music: null, afterReveal: false },
    divineJudgmentBolt: { img: "/item/divine_whistle/judgment_bolt.webp", video: "/item/divine_whistle/judgment_bolt.mp4", title: "JUDGMENT BOLT", label: "นกหวีดอัญเชิญมนต์อสูรเทพ", seconds: 22, music: null, afterReveal: false },
    // รถบรรทุกเก่า / ออพติมัส ไพร์ม — ความยาวจริง (ffprobe) 21.0 / 8.9 / 12.3 / 17.0 วิ ปัดขึ้น · ครั้งแรกต่อเกม (clipOnce ใน characters/old_truck.js)
    otTrueForm: { img: ot.IMG.truck, video: ot.VIDEO.trueForm, title: "ร่างที่แท้จริง", label: "รถบรรทุก", seconds: 21.5, music: null, afterReveal: false },
    otTransform: { img: ot.IMG.prime, video: ot.VIDEO.transform, title: "ออพติมัส ไพร์ม", label: "เปลี่ยนร่าง", seconds: 9.5, music: null, afterReveal: false },
    otGuardian: { img: ot.IMG.skill2, video: ot.VIDEO.guardian, title: "ผู้พิทักษ์", label: "ออพติมัส ไพร์ม", seconds: 13, music: null, afterReveal: false },
    // โจรุโน่ โจวาน่า — ความยาวจริง (ffprobe) 4.33 / 32.23 / 9.77 / 9.13 วิ ปัดขึ้น
    gioCrit: { img: gio.IMG.base, video: gio.VIDEO.crit, title: "GOLD EXPERIENCE", label: "คริติคอล", seconds: 4.8, music: null, afterReveal: false },
    gioPassive2: { img: gio.IMG.base, video: gio.VIDEO.passive2, title: "เศษเดนมนุษย์อย่างแกน่ะ…", label: "โจรุโน่ โจวาน่า", seconds: 32.7, music: null, afterReveal: false },
    gioTree: { img: gio.IMG.tree, video: gio.VIDEO.tree, title: "จงกำเนิดใหม่", label: "จงกำเนิดชีวิตใหม่", seconds: 10.2, music: null, afterReveal: false },
    gioArrow: { img: gio.IMG.re.arrow, video: gio.VIDEO.arrow, title: "ธนู Requiem", label: "โจรุโน่ โจวาน่า", seconds: 3.8, music: null, afterReveal: false },
    gioSuccess: { img: gio.IMG.re.cover, video: gio.VIDEO.success, title: "Gold Experience Requiem", label: "แปลงร่าง", seconds: 12.7, music: null, afterReveal: false },
    gioFail: { img: gio.IMG.re.arrow, video: gio.VIDEO.fail, title: "ธนู Requiem", label: "ตายทันที", seconds: 5.9, music: null, afterReveal: false },
    gioRewind: { img: gio.IMG.re.cover, video: gio.VIDEO.rewind, title: "นี่แหละ คือ Requiem", label: "Gold Experience Requiem", seconds: 3.6, music: null, afterReveal: false },
    gioShot: { img: gio.IMG.re.skill1, video: gio.VIDEO.shot, title: "กระสุนแห่งชีวิต", label: "ชีวิตทดแทน", seconds: 2.9, music: null, afterReveal: false },
    gioReUlt: { img: gio.IMG.re.skill3, video: gio.VIDEO.reUlt, title: "ขอให้ไปสู่ภพภูมิที่ดี", label: "Gold Experience Requiem", seconds: 11, music: null, afterReveal: false },
    gioReCrit: { img: gio.IMG.re.cover, video: gio.VIDEO.reCrit, title: "GOLD EXPERIENCE REQUIEM", label: "คริติคอล", seconds: 5.5, music: null, afterReveal: false },
    // คุเรไน โอโตยะ — ความยาวจริง (ffprobe) +0.4 วิ · คลิปมีเสียงในตัว (music: null)
    otoyaHenshin1: { img: oto.IMG.kiva, video: oto.VIDEO.henshin[0], title: "Dark Kiva", label: "ขอแรงหน่อยสิเจ้าค้างคาว", seconds: 15.7, music: null, afterReveal: false },
    otoyaHenshin2: { img: oto.IMG.kiva, video: oto.VIDEO.henshin[1], title: "Dark Kiva", label: "ขอแรงหน่อยสิเจ้าค้างคาว", seconds: 11.5, music: null, afterReveal: false },
    otoyaHenshin3: { img: oto.IMG.kiva, video: oto.VIDEO.henshin[2], title: "Dark Kiva", label: "ครั้งสุดท้าย", seconds: 16, music: null, afterReveal: false },
    otoyaTrap: { img: oto.IMG.trap, video: oto.VIDEO.trap, title: "หลุมพราง", label: "Dark Kiva", seconds: 5.4, music: null, afterReveal: false },
    otoyaWake1: { img: oto.IMG.wake, video: oto.VIDEO.wake1, title: "Wake Up 1", label: "จงตื่นขึ้น ครั้งสุดท้าย", seconds: 3.6, music: null, afterReveal: false },
    otoyaWake1Fill: { img: oto.IMG.wake, video: oto.VIDEO.wake1Fill, title: "Wake Up 1", label: "จันทร์แดง", seconds: 6.6, music: null, afterReveal: false },
    otoyaWake2: { img: oto.IMG.wake, video: oto.VIDEO.wake2, title: "Wake Up 2", label: "จงตื่นขึ้น ครั้งสุดท้าย", seconds: 3.4, music: null, afterReveal: false },
    otoyaWake2Hit: { img: oto.IMG.kiva, video: oto.VIDEO.wake2Hit, title: "Darkness Moon Break", label: "Wake Up 2", seconds: 7.4, music: null, afterReveal: false },
    otoyaDead: { img: oto.IMG.base, video: oto.VIDEO.dead, title: "คุเรไน โอโตยะ", label: "ครั้งสุดท้าย", seconds: 5.9, music: null, afterReveal: false },
    // กิลกาเมช (Fake) — ความยาวจริง (ffprobe) 16.0 / 13.8 / 17.7 / 14.2 วิ ปัดขึ้น · คลิปมีเสียงในตัว
    gilEaDraw: { img: gil.IMG.skill1, video: gil.VIDEO.draw, title: "EA", label: "จงเห่าหอนซะสิ เจ้าพันธุ์ทาง", seconds: 16.3, music: null, afterReveal: false },
    gilEaRoar: { img: gil.IMG.skill3, video: gil.VIDEO.roar, title: "EA", label: "พายุแห่งการแยกฟ้าดิน", seconds: 14.1, music: null, afterReveal: false },
    gilGate: { img: gil.IMG.skill2, video: gil.VIDEO.gate, title: "Gate of Babylon", label: "เมตตาจากราชา", seconds: 18, music: null, afterReveal: false },
    gilEnuma: { img: gil.IMG.skill3, video: gil.VIDEO.enuma, title: "Enuma Elish", label: "ดาบแยกฟ้าดิน", seconds: 14.5, music: null, afterReveal: false },
    gioMuda: { img: gio.IMG.skill3, video: gio.VIDEO.muda, title: "Muda!!!!!!!", label: "โจรุโน่ โจวาน่า", seconds: 9.6, music: null, afterReveal: false },
    // อินุอิ ทาคุมิ — ความยาวจริง (ffprobe) +0.4 วิ
    ...Object.fromEntries([
      ["open", "inui_start", inui.IMG.case, "กระเป๋า SmartBrain", "อินุอิ ทาคุมิ", 10.2],
      ["henshin", "henshin", inui.IMG.faiz, "Kamen Rider Faiz", "แปลงร่าง", 10.9],
      ["knuckle", "knuckle_mode", inui.IMG.knuckle, "Faiz_nuckle", "Kamen Rider Faiz", 7],
      ["pointer", "pointer_mode", inui.IMG.pointer, "Faiz_pointer", "Kamen Rider Faiz", 5.4],
      ["knuckleEx", "knuckle_ex_start", inui.IMG.knuckle, "Exceed Charge", "Faiz_nuckle", 8.3],
      ["pointerEx", "pointer_ex_start", inui.IMG.pointer, "Exceed Charge", "Faiz_pointer", 6.7],
      ["knuckleHit", "knuckle_ex_hit", inui.IMG.knuckle, "Exceed Charge", "Faiz_nuckle", 9.6],
      ["pointerHit", "pointer_ex_hit", inui.IMG.pointer, "Exceed Charge", "Faiz_pointer", 22.7],
      ["axel", "axel_watch", inui.IMG.axel, "Faiz Axel", "axel_watch", 12.9],
      ["startUp", "axel_start_up", inui.IMG.axel, "Start Up", "Faiz Axel", 8.8],
      ["axelCrit", "axel_crit", inui.IMG.axel, "Faiz Axel", "คริติคอล", 4.4],
      ["axelPointer", "axel_pointer_hit", inui.IMG.axel, "Faiz Axel", "คริติคอล", 13.6],
      ["timeOut", "axel_time_out", inui.IMG.faiz, "Time Out", "Faiz Axel", 6.9],
      ["timeOutIdle", "axel_time_out_no_use", inui.IMG.faiz, "Time Out", "Faiz Axel", 5.4],
    ].map(([k, v, img, title, label, seconds]) => [inui.CUT[k], { img, video: inui.VIDEO[v], title, label, seconds, music: null, afterReveal: false }])),
    // ไรเดอร์ ZECT — ความยาวจริง (ffprobe) +0.4 วิ · [ลำดับใน ZECT, คีย์, ชื่อ, ป้าย, รูป, วินาที]
    ...Object.fromEntries([
      [0, "henshin", "", "แปลงร่าง", "putOn", 16.8],
      [0, "castOff", "CAST OFF", "Change", "castOff", 11.8],
      [0, "clockUp", "Clock Up", "ZECT", "clock", 1.8],
      [0, "rider", "Rider Shooting", "ท่าไม้ตาย", "rider", 8.9],
      [1, "henshin", "", "แปลงร่าง", "putOn", 11.7],
      [1, "castOff", "CAST OFF", "Change", "castOff", 16.1],
      [1, "clockUp", "Clock Up", "ZECT", "clock", 3.9],
      [1, "rider", "Rider Sting", "ท่าไม้ตาย", "rider", 11.5],
      [2, "henshin", "", "แปลงร่าง", "putOn", 8.9],
      [2, "castOff", "CAST OFF", "Change", "castOff", 15.0],
      [2, "clockUp", "Clock Up", "ZECT", "clock", 2.9],
      [2, "kickOne", "Rider Kick", "One", "rider", 1.9],
      [2, "kickThree", "Rider Kick", "Three", "rider", 2.7],
      [2, "kickFinal", "Rider Kick", "ท่าไม้ตาย", "rider", 8.2],
      [3, "henshin", "", "แปลงร่าง", "putOn", 11.9],
      [3, "castOff", "CAST OFF", "Change", "castOff", 12.5],
      [3, "clockUp", "Clock Up", "ZECT", "clock", 2.0],
      [3, "slashFirst", "Rider Slash", "ท่าไม้ตาย", "rider", 7.9],
      [3, "slashFinal", "Rider Slash", "ท่าไม้ตาย", "rider", 3.9],
    ].map(([n, k, title, label, img, seconds]) => [ZECT[n].CUT[k], { img: ZECT[n].IMG[img], video: ZECT[n].VIDEO[k], title, label, seconds, music: null, afterReveal: false }])),
    // เฟรดดี้ — ความยาวจริง 1.5 วิ · ไม่มีการ์ดเปิด/ชื่อบนคลิป (ผู้ใช้สั่ง "ไม่ต้องใส่ชื่ออะไร")
    [freddy.CUT.scare]: { img: freddy.IMG.card, video: freddy.VIDEO.scare, title: "", label: "", seconds: 1.9, music: null, afterReveal: false, noIntro: true },
    // ฟ็อกซี่ — ไม่มีการ์ดเปิด/ชื่อบนคลิป (ผู้ใช้สั่ง "ไม่ต้องใส่ชื่ออะไร") · hit = คลิปพื้นใสซ้อนบนกระดาน (clear — webm VP9 alpha)
    [foxy.CUT.hit]: { img: foxy.IMG.card, video: foxy.VIDEO.hit, title: "", label: "", seconds: 1.0, music: null, afterReveal: false, noIntro: true, clear: true, scale: 1.5 }, // ขยาย 1.5 เท่า (ผู้ใช้: เล็กไป)
    [foxy.CUT.brain]: { img: foxy.IMG.card, video: foxy.VIDEO.brain, title: "", label: "", seconds: 4.5, music: null, afterReveal: false, noIntro: true },
    [foxy.CUT.night]: { img: foxy.IMG.card, video: foxy.VIDEO.night, title: "", label: "", seconds: 11.0, music: null, afterReveal: false, noIntro: true },
    [freddy.CUT.night]: { img: freddy.IMG.card, video: freddy.VIDEO.night, title: "", label: "", seconds: 1.4, music: null, afterReveal: false, noIntro: true },
    ...Object.fromEntries([
      ["double", "double", kiri.IMG.alter, "Double Accel", "Time Alter", 7.2],
      ["square", "square", kiri.IMG.alter, "Square Accel", "Time Alter", 6.8],
      ["shoot", "shoot", kiri.IMG.thompson, "Thompson Contender", "Origin Bullet", 5.5],
      ["hit", "hit", kiri.IMG.thompson, "Thompson Contender", "Origin Bullet", 6.0],
      ["alterReload", "alterReload", kiri.IMG.contender, "Thompson Contender", "Time Alter", 7.4],
      ["alterShoot", "alterShoot", kiri.IMG.thompson, "Thompson Contender", "Time Alter", 4.3],
    ].map(([k, v, img, title, label, seconds]) => [kiri.CUT[k], { img, video: kiri.VIDEO[v], title, label, seconds, music: null, afterReveal: false, ...(k === "hit" ? { noIntro: true } : {}) }])), // คลิปโดนต่อจากคลิปยิงทันที
    // คุซาคาเบะ ชินระ (GRID_PLAN §7.32) — ความยาวจริง 9.1 / 15.5 วิ
    [shinra.CUT.warm]: { img: shinra.IMG.warm, video: shinra.VIDEO.warm, title: "อุ่นเครื่องพอแล้ว", label: "ปล่อยท่าไม้ตาย", seconds: 9.3, music: null, afterReveal: false },
    [shinra.CUT.latom]: { img: shinra.IMG.latom, video: shinra.VIDEO.latom, title: "ลาทัม", label: "ปล่อยท่าไม้ตาย", seconds: 15.7, music: null, afterReveal: false },
    [midoriya.CUT.smash]: { img: midoriya.IMG.smash, video: midoriya.VIDEO.smash, title: midoriya.FORMS.smash.name, label: "ปล่อยสกิล", seconds: midoriya.CLIP_SEC.smash, music: null, afterReveal: false },
    [midoriya.CUT.throw]: { img: midoriya.IMG.smash, video: midoriya.VIDEO.throw, title: midoriya.FORMS.throw.name, label: "ปล่อยสกิล", seconds: midoriya.CLIP_SEC.throw, music: null, afterReveal: false },
    [midoriya.CUT.detroit]: { img: midoriya.IMG.smash, video: midoriya.VIDEO.detroit, title: midoriya.FORMS.detroit.name, label: "ปล่อยสกิล", seconds: midoriya.CLIP_SEC.detroit, music: null, afterReveal: false },
    [midoriya.CUT.delaware]: { img: midoriya.IMG.smash, video: midoriya.VIDEO.delaware, title: midoriya.FORMS.delaware.name, label: "ปล่อยสกิล", seconds: midoriya.CLIP_SEC.delaware, music: null, afterReveal: false },
    [midoriya.CUT.million]: { img: midoriya.IMG.smash, video: midoriya.VIDEO.million, title: midoriya.FORMS.million.name, label: "ปล่อยสกิล", seconds: midoriya.CLIP_SEC.million, music: null, afterReveal: false },
    // แม็กน่า สวิง (GRID_PLAN §7.35) — ความยาวจริง 9.36 / 6.04 วิ · ไฟล์ผู้ใช้ 1.2 Mbps ไม่ต้องบีบ
    // ดิเอโก้ อสูรกายดึกดำบรรพ์ — ความยาวจริง 3.77 / 9.30 / 3.37 / 3.03 / 1.37 วิ (ปัดขึ้น +1)
    [dino.CUT.swarm]: { img: dino.IMG.swarm, video: dino.VIDEO.swarm, title: "ฉันจะฆ่าแก", label: "ปล่อยท่าไม้ตาย", seconds: 5, music: null, afterReveal: false, noIntro: true },
    [dino.CUT.swarmHit]: { img: dino.IMG.swarm, video: dino.VIDEO.swarmHit, title: "ฉันจะฆ่าแก", label: "ปิดฉาก", seconds: 11, music: null, afterReveal: false, noIntro: true },
    [dino.CUT.transform]: { img: dino.IMG.full, video: dino.VIDEO.transform, title: "การกลายพันธุ์", label: "อสูรกายดึกดำบรรพ์", seconds: 5, music: null, afterReveal: false, noIntro: true },
    [dino.CUT.leap]: { img: dino.IMG.leap, video: dino.VIDEO.leap, title: "อ๊ากกก", label: "กระโดดขย่ำ", seconds: 5, music: null, afterReveal: false, noIntro: true },
    [dino.CUT.stomp]: { img: dino.IMG.stomp, video: dino.VIDEO.stomp, title: "ย่ำกระหม่อม", label: "ปล่อยท่าไม้ตาย", seconds: 3, music: null, afterReveal: false, noIntro: true },
    [magna.CUT.deathmatch]: { img: magna.IMG.deathmatch, video: magna.VIDEO.deathmatch, title: magna.NAME.deathmatch, label: "ปล่อยท่าไม้ตาย", seconds: magna.CLIP_SEC.deathmatch, music: null, afterReveal: false },
    [magna.CUT.finisher]: { img: magna.IMG.finisher, video: magna.VIDEO.finisher, title: magna.NAME.finisher, label: "ปล่อยท่าไม้ตาย", seconds: magna.CLIP_SEC.finisher, music: null, afterReveal: false },
    // อาร์มสตรอง (GRID_PLAN §7.39) — ความยาวจริง counter 9.77 · nano 11.5 · smoke 4.07 · ult 3.0/11.93/7.5 · guard 7.0/5.43/4.9/7.37 วิ
    ...Object.fromEntries([
      ["counter", arm.IMG.basic, "", "", true], // ไม่ขึ้นชื่อ: พุ่งไปต่อย · บุหรี่ · ฉากป้องกันทั้งชุด (ผู้ใช้ 2026-11-21)
      ["nano", arm.IMG.nano, arm.NAME.nano, arm.NAME.secondary, false],
      ["smoke", arm.IMG.smoke, "", "", true],
      ["ultStart", arm.IMG.ult, arm.NAME.ult, "ปล่อยท่าไม้ตาย", false],
      ["ultMash", arm.IMG.ult, arm.NAME.ult, "ปล่อยท่าไม้ตาย", true],
      ["ultEnd", arm.IMG.ult, arm.NAME.ult, "ปล่อยท่าไม้ตาย", true],
      ["guardStart", arm.IMG.nano, "", "", true],
      ["guardMash", arm.IMG.nano, "", "", true],
      ["guardHit", arm.IMG.nano, "", "", true],
      ["guardBlock", arm.IMG.nano, "", "", true],
    ].map(([k, img, title, label, noIntro]) => [arm.CUT[k], { img, video: arm.VIDEO[k], title, label, seconds: arm.CLIP_SEC[k], music: null, afterReveal: false, ...(noIntro ? { noIntro: true } : {}) }])),
    otUlt: { img: ot.IMG.skill3, video: ot.VIDEO.ult, title: "ข้าคือ...ออพติมัส ไพร์ม", label: "ปล่อยท่าไม้ตาย", seconds: 17.5, music: null, afterReveal: false },
  };
};
