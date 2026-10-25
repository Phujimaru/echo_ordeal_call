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
const hikaru = require("./raido_hikaru");
const yuna = require("./yuna"); // ยูนะ: คลิปร้อนแรงดังไฟ (ทุกครั้งที่กด)
const diego = require("./diego_alt"); // ดิเอโก้: เป็นไปดั่งกลอุบาย intro (ทุกครั้งที่พุ่ง) / final (ทุกครั้งที่ชน)
const celine = require("./celine"); // เซลิน: คลิปคริก่อนฉากตี (สายดาบ/สายเวท) · การ์ดท่าไม้ตาย
const takuto = require("./takuto"); // ทาคุโตะ: แปลงร่างทาวเบิร์น / เฟส 2·4 / ห่วงเวลาถูกทำลาย / ดาบรวมร่าง / ปาดาบ / สกิล
const emiya = require("./emiya_shirou"); // เอมิยะ ชิโร่: Caladbolg II (ก่อน/หลังเลือกทิศ) · Unlimited Blade Works — ทุกครั้งที่กด
const kazuma = require("./kensaki_kazuma"); // เคนซากิ คาซุมะ: แปลงร่าง (ครั้งแรกต่อเกม) · มือเปล่าติดคริ (ก่อนฉากตี) · ท่า Lightning 3 แบบ (ตอนโดน)
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
    // ดิเอโก้ แบรนโด (โลกคู่ขนาน) — เป็นไปดั่งกลอุบาย: intro ทุกครั้งก่อนพุ่ง · final ทุกครั้งที่ชน (ผู้ใช้สั่ง 2026-10-20) · ความยาวจริง 1.17 / 5.43 วิ
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
    // ซึนาชิ ทาคุโตะ — ความยาวจริง (ffprobe) 29.4 / 13.1 / 4.9 / 10.5 / 1.13 / 12.9 / 17.3 / 14.9 / 18.4 วิ ปัดขึ้น
    //  แปลงร่าง/เฟส/ห่วงเวลาถูกทำลาย = คิวจากโค้ด (ครั้งเดียวต่อเกมตามจังหวะห่วงเวลา) · ปาดาบ = ทุกครั้ง (preAttackClip) · สกิล = เต็มครั้งแรกต่อเกม (triggerCutscene)
    takutoTauburn:  { img: takuto.IMG.tauburn, video: takuto.VIDEO.tauburn,     title: "ทาวเบิร์น",              label: "apprivoise", seconds: 30, music: null, afterReveal: false },
    takutoPassive:  { img: takuto.IMG.tauburn, video: takuto.VIDEO.passive,     title: "apprivoise",             label: "ทาวเบิร์น", seconds: 14, music: null, afterReveal: false },
    takutoPassive2: { img: takuto.IMG.tauburn, video: takuto.VIDEO.passive2,    title: "apprivoise",             label: "ทาวเบิร์น", seconds: 5.5, music: null, afterReveal: false, noIntro: true },
    takutoPassive3: { img: takuto.IMG.zero,    video: takuto.VIDEO.passive3,    title: "ห่วงเวลาถูกทำลาย",       label: "ทาวเบิร์น", seconds: 11, music: null, afterReveal: false },
    takutoDuo:      { img: takuto.IMG.zero,    video: takuto.VIDEO.duo,         title: "ดาบแห่งการพิพากษา",      label: "ทาวเบิร์น", seconds: 1.6, music: null, afterReveal: false, noIntro: true },
    takutoDuoHit:   { img: takuto.IMG.zero,    video: takuto.VIDEO.duoHit,      title: "ดาบแห่งการพิพากษา",      label: "ทาวเบิร์น", seconds: 13.5, music: null, afterReveal: false, noIntro: true },
    takutoFlash:    { img: takuto.IMG.skill2,  video: takuto.VIDEO.skill2,      title: "ดาบประกายแสง",           label: "ทาวเบิร์น", seconds: 18, music: null, afterReveal: false },
    takutoMissile:  { img: takuto.IMG.skill3,  video: takuto.VIDEO.skill3,      title: "ทาวววว มิสไซล์",          label: "ปล่อยท่าไม้ตาย", seconds: 15.5, music: null, afterReveal: false },
    takutoBlast:    { img: takuto.IMG.zero,    video: takuto.VIDEO.skill3Extra, title: "ฉันยังมองเห็นอยู่",       label: "ปล่อยท่าไม้ตาย", seconds: 19, music: null, afterReveal: false },
    // เอมิยะ ชิโร่ — Caladbolg II เล่นต่อกัน 2 คลิปทุกครั้ง (ง้างธนู → ลูกธนูระเบิด) · UBW ทุกครั้งที่กด · ความยาวจริง 9.26 / 3.25 / 22.73 วิ ปัดขึ้น
    emiyaCaladbolgBefore: { img: emiya.IMG.s("caladbolg"), video: emiya.VIDEO.calBefore, title: "Caladbolg II", label: "เอมิยะ ชิโร่", seconds: 9.6, music: null, afterReveal: false },
    emiyaCaladbolgAfter:  { img: emiya.IMG.s("caladbolg"), video: emiya.VIDEO.calAfter,  title: "Caladbolg II", label: "เอมิยะ ชิโร่", seconds: 3.6, music: null, afterReveal: false, noIntro: true },
    emiyaUbw:             { img: emiya.IMG.ubw,            video: emiya.VIDEO.ubw,       title: "Unlimited Blade Works", label: "ปล่อยท่าไม้ตาย", seconds: 23.2, music: null, afterReveal: false },
    // เคนซากิ คาซุมะ — ทุกครั้ง · ความยาวจริง 2.03 / 14.74 / 6.0 / 20.57 วิ ปัดขึ้น
    kazumaHenshin: { img: kazuma.IMG.blade,      video: kazuma.VIDEO.henshin,        title: "Kamen Rider Blade", label: "แปลงร่าง",        seconds: 13.5, music: null, afterReveal: false },
    kazumaCrit:  { img: kazuma.IMG.blade,        video: kazuma.VIDEO.crit,           title: "คริติคอล",        label: "เคนซากิ คาซุมะ", seconds: 2.1, music: null, afterReveal: false, noIntro: true },
    kazumaBlast: { img: kazuma.IMG.ult("blast"), video: kazuma.VIDEO.combo("blast"), title: "Lightning Blast", label: "ปล่อยท่าไม้ตาย", seconds: 15, music: null, afterReveal: false },
    kazumaSlash: { img: kazuma.IMG.ult("slash"), video: kazuma.VIDEO.combo("slash"), title: "Lightning Slash", label: "ปล่อยท่าไม้ตาย", seconds: 6.1, music: null, afterReveal: false },
    kazumaSonic: { img: kazuma.IMG.ult("sonic"), video: kazuma.VIDEO.combo("sonic"), title: "Lightning Sonic", label: "ปล่อยท่าไม้ตาย", seconds: 20.6, music: null, afterReveal: false },
    yunaIdol: { img: yuna.IMG.ult, video: yuna.VIDEO.ult, title: "ร้อนแรงดังไฟ", label: "ยูนะ ไอดอล", seconds: 10, music: null, afterReveal: false },
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
