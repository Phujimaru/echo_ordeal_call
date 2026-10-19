// ============================================================
//  ข้อมูลตัวละคร + สกิล (data-driven ตาม ECHO spec ข้อ 4)
//  แก้/เพิ่มตัวละครที่ไฟล์นี้ไฟล์เดียว โดยไม่ต้องแตะ engine
//
//  โครงสกิล: { name, desc, cost, area, effect }
//    - basic / secondary / ultimate — ราคาตั้งรายสกิล (หลอดสกิลจุ 8 แต้ม)
//    - passive   ฟรี ทำงานเองตาม trigger
//  ตัวละคร: mov = ระยะเดิน · range = [ใกล้สุด, ไกลสุด] ของตีปกติ (GRID_PLAN.md §5–§6)
//  area = ระยะสกิลบนกระดาน (GRID_PLAN.md §7 — server/skills.js resolveArea ตรวจก่อนหักแต้ม)
//    { kind: "self" }                                ใช้กับตัวเอง (ไม่ระบุ area = self)
//    { kind: "target", range, self? }                เลือก 1 คนในระยะ (self = เลือกตัวเองได้)
//    { kind: "aoe", range, self? }                   ทุกคนในรัศมีรอบตัว (ข้าวหลามตัด)
//    { kind: "line", len, width }                    เลือกทิศ — แนวยาว len กว้าง width จากช่องติดตัว
//    hostile: true = สกิลโจมตี — โดนคนที่มองไม่เห็นในพื้นที่ด้วย และคนล่องหนที่โดนปรากฏตัว (server/visibility.js)
//      ไม่ใส่ = คนที่ผู้ใช้มองไม่เห็นหลุดจากพื้นที่ (บัฟ/ฟื้นฟู)
//    range: "mov" = เท่าระยะเดินปกติสูงสุดของผู้ใช้
//
//  effect รองรับ (ยิงใส่ตัวเองก่อนใน milestone นี้ — สกิลใส่คู่ต่อสู้ค่อยเพิ่มทีหลัง):
//    { type:"heal",   amount }  ฟื้นเลือดจริง (ไม่เกินสูงสุด)
//    { type:"armor",  amount }  รับเกราะ (ไม่เกินสูงสุด)
//    { type:"points", amount }  รับแต้มสกิล
//    { type:"shield", amount }  กันความเสียหายครั้งถัดไป N ครั้ง (รีเซ็ตต้นรอบ)
//    { type:"draw",   amount }  จั่วไพ่เพิ่ม (เสี่ยงแตก)
//    { type:"redraw" }          ทิ้งมือ จั่วใหม่ 2 ใบ
//    หรือใส่เป็น array ของ effect เพื่อรวมหลายอย่าง
//
//  passive.trigger: "roundStart" | "win" | "lose" | "attacked"
//
//  instant: true = ลงผลทันทีตอนกด (ในตาเดินของผู้ใช้) -> เด้งโชว์บนกระดานทันที
// ============================================================

const CHARACTERS = [
  {
    id: "muimi",
    name: "มุยมิ",
    avatar: 0,
    difficulty: "easy",
    img: "/characters/muimi/muimi.webp",
    mov: 4,          // ระยะเดิน (GRID_PLAN §5)
    range: [1, 1],   // ระยะตีปกติ [ใกล้สุด, ไกลสุด] — ประชิด
    passive: {
      name: "ใจที่ไม่ยอมแพ้",
      desc: "ระหว่าง “ดาบสะบั้น” ตีปกติแต่ละครั้งยืดสถานะ +1 เทิร์น",
    },
    basic: {
      name: "เสบียงฉุกเฉิน",
      desc: "ไม่นับเป็นการใช้สกิล · 1 ครั้ง/เทิร์น รวม 2 ครั้งต่อเกม: ฟื้นพลังชีวิต 2 และแต้มสกิล 2",
      area: { kind: "self" },
      cost: 0,
      img: "/characters/muimi/muimi_skill1.webp",
      ammo: 2,
      instant: true,
      effect: null,
    },
    secondary: {
      name: "ดาบสนิม",
      desc: "ได้ “ดาบเก่าๆ” 3 เทิร์น · ตีปกติฟื้นพลังชีวิต 1 และแต้มสกิล 1 · ระหว่าง “ดาบสะบั้น” (4 แต้ม): เลือกทิศ ปล่อยคลื่นดาบแนว 4×3 ใส่ศัตรูทุกคนในแนว เท่าพลังโจมตี +1 (เกราะรับก่อน · หลบได้ · ไม่ได้สถานะเพิ่ม)",
      area: { kind: "self" },
      cost: 4,
      img: "/characters/muimi/muimi_skill2.png",
      instant: true,
      effect: null,
    },
    ultimate: {
      name: "ดาบสะบั้นหอคอยสวรรค์",
      desc: "เลือกทิศ: ได้ “ดาบสะบั้น” 2 เทิร์น (โจมตีพื้นฐาน +1 · ตีปกติฟื้นพลังชีวิต 2) แล้วปล่อยคลื่นดาบแนว 4×3 ใส่ศัตรูทุกคนในแนว เท่าพลังโจมตี +3 (เกราะรับก่อน · หลบได้ · ไม่โดนเพื่อน) · ได้ต้านสถานะผิดปกติ 3 เทิร์น · ใช้ไม่ได้ระหว่าง “ดาบเก่าๆ” · หมดแล้วรอ 3 เทิร์นถึงใช้ซ้ำได้",
      area: { kind: "line", len: 4, width: 3, hostile: true },
      cost: 8,
      img: "/characters/muimi/muimi_skill3.webp",
      instant: true,
      effect: null,
    },
  },
  {
    // ---------- โอเบรอน (ฤดูร้อน) — ระดับกลาง — ดู characters/oberon_summer.js ----------
    //  ภาพสกิลใช้ภาพตอนเช้าของโอเบรอนตัวเก่า (ภาพประจำตัวเป็นภาพใหม่)
    id: "oberon_summer",
    name: "โอเบรอน (ฤดูร้อน)",
    avatar: 0,
    difficulty: "medium",
    img: "/characters/oberon(summer)/oberon_summer.webp",
    mov: 4,
    range: [1, 1],
    passive: {
      name: "หน้าไหว้หลังหลอก",
      desc: "จบเทิร์นที่ไม่ถูกโจมตีเลย (ถูกเลือกเป็นเป้าก็นับ แม้หลบได้) ได้แต้มสกิล +1 และเหรียญ +1",
    },
    basic: {
      name: "ม่านแห่งราตรี",
      desc: "ทุกคนในระยะรอบตัวเท่าระยะเดิน (รวมตัวเอง) โจมตี +1 นาน 3 เทิร์น และฟื้นพลังชีวิต 1 · โหมด duo/trio เฉพาะตัวเองและเพื่อนร่วมทีม · กดซ้ำไม่ได้ระหว่างผลยังอยู่",
      area: { kind: "aoe", range: "mov", self: true },
      cost: 2,
      img: "/characters/oberon/oberon_skill1.jpg",
      instant: true,
      effect: null, // จัดการใน characters/oberon_summer.js
    },
    secondary: {
      name: "นกจาบยามเช้า",
      desc: "ยังใช้สกิลอื่นได้อีก 1 ครั้ง: 1 คนในระยะเดิน (รวมตัวเอง) ฟื้นพลังชีวิต 5 ได้ต้านสถานะผิดปกติ 2 เทิร์น และล้างสถานะผิดปกติล่าสุด 1 อย่าง · ต้นเทิร์นหน้าเป้าเสียพลังชีวิต 2 ไม่สนเกราะ (ต้านไม่ได้)",
      area: { kind: "target", range: "mov", self: true },
      cost: 4,
      img: "/characters/oberon/oberon_skill2.jpg",
      instant: true,
      effect: null,
    },
    ultimate: {
      name: "จุดจบของความฝัน",
      desc: "คูลดาวน์ 5 เทิร์น: 1 คนในระยะเดิน (รวมตัวเอง) โจมตี +4 จนจบตาเดินถัดไปของเป้า · จากนั้นขึ้นเทิร์นใหม่เป้าสตั้น 3 เทิร์น (ต้านได้)",
      area: { kind: "target", range: "mov", self: true },
      cost: 4,
      img: "/characters/oberon/oberon_skill3_morning.webp",
      instant: true,
      effect: null,
    },
  },
  {
    // ---------- นักบินปริศนา (Silver Bullet) — ง่าย · unique — ดู characters/sliver_bullet.js ----------
    //  id สะกด "sliver_bullet" ตามโฟลเดอร์สื่อเดิม · พลังชีวิต 5 / เกราะ 2 (sliver_bullet.maxHp/maxArmor)
    //  basic.cost 2 = ราคาตอนไม่มีแขน · มีแขน = 3 (sliver_bullet.skillCost — useSkill/buildStateFor สูตรเดียวกัน)
    id: "sliver_bullet",
    name: "นักบินปริศนา",
    avatar: 0,
    difficulty: "easy",
    unique: true, // เลือกได้แค่ 1 คนต่อเกม
    img: "/characters/sliver_bullet/sliver_bullet_banagher.png",
    mov: 4,
    range: [1, 4],   // ตีปกติเป็นลำแสงไกลเท่าระยะเดิน (ผู้ใช้สั่ง 2026-10-09)
    passive: {
      name: "ซุ่มโจมตี",
      desc: "ผู้เล่นที่ยังรอด 3 คนขึ้นไป (โหมดทีม: เพื่อนร่วมทีม 2 คนขึ้นไป): ล่องหน ศัตรูมองไม่เห็นและเล็งไม่ได้ · ปรากฏตัว 2 เทิร์นเมื่อ ตีปกติ · ยิงปืน · ใช้ไอเทมใส่คนอื่น · Beam Magnum · อยู่ในพื้นที่สกิลโจมตีของศัตรู · ศัตรูเดินชน",
    },
    basic: {
      name: "เปลี่ยนชิ้นส่วน",
      desc: "ไม่นับเป็นการใช้สกิล · ไม่มีแขน (2 แต้ม): ได้แขนใหม่ · ฟื้นพลังชีวิต 1 · มีแขน (3 แต้ม): ฟื้นพลังชีวิต 2",
      area: { kind: "self" },
      cost: 2,
      img: "/characters/sliver_bullet/sliver_bullet_skill1.png",
      instant: true,
      effect: null, // จัดการใน characters/sliver_bullet.js
    },
    secondary: {
      name: "Beam Magnum",
      desc: "ต้องมีแขน · เสียแขน: เลือกทิศ ยิงทะลุศัตรูทุกคนในแนว 8×1 ความเสียหาย 4 (เกราะรับก่อน · หลบไม่ได้)",
      area: { kind: "line", len: 8, width: 1, hostile: true },
      cost: 4,
      img: "/characters/sliver_bullet/sliver_bullet_skill2.webp",
      instant: true,
      effect: null,
    },
    ultimate: null,
  },
  {
    // ---------- โซระ โอโตสุมิ — ระดับง่าย — ดู characters/sora_otosumi.js (GRID_PLAN §7.7) ----------
    //  ร่างโซระ ⇄ Kamen Rider My-Th · อาวุธมีด/ปืน (ปืน = ระยะตี [1, 3] ผ่านฮุค range) · ท่าไม้ตายพุ่งชนสลับที่
    id: "sora_otosumi",
    name: "โซระ โอโตสุมิ",
    avatar: 0,
    difficulty: "easy",
    img: "/characters/sora_otosumi/sora.jpg",
    mov: 4,
    range: [1, 1],
    passive: {
      name: "เพื่อคุณหนู",
      desc: "ร่างโซระ: อยู่ต่อเนื่องครบ 2 เทิร์น ฟื้นพลังชีวิต 2 (แปลงร่างแล้วนับใหม่) · ร่าง Kamen Rider My-Th: อัตราคริติคอล 20% (ตีปกติ)",
    },
    basic: {
      name: "แปลงร่าง",
      desc: "ไม่นับเป็นการใช้สกิล · เทิร์นละ 1 ครั้ง: สลับร่างโซระ ⇄ Kamen Rider My-Th",
      area: { kind: "self" },
      cost: 0,
      img: "/characters/sora_otosumi/sora_skill1.jpg",
      instant: true,
      effect: null, // จัดการใน characters/sora_otosumi.js
    },
    secondary: {
      name: "My-Th Edge",
      desc: "ร่าง My-Th · ไม่นับเป็นการใช้สกิล · เทิร์นละ 1 ครั้ง: สลับอาวุธ · มีด: ตีปกติ +1 · ปืน: ระยะตี 3 ตีโดนแล้วดึงเป้าเข้าประชิด (ช่องไม่ว่าง = ไม่ดึง)",
      area: { kind: "self" },
      cost: 0,
      img: "/characters/sora_otosumi/sora_skill2.jpg",
      instant: true,
      effect: null,
    },
    ultimate: {
      name: "Mouse Separade",
      desc: "ร่าง My-Th · เลือกทิศ: พุ่งสุดแนว 4×1 พังสิ่งกีดขวางที่ผ่าน · ชนศัตรูคนแรกที่หลบไม่พ้น: ความเสียหาย 3 แล้วสลับที่ (เป้าไปช่องที่เราออกตัว) · ตัวใหญ่: ความเสียหาย 4 แล้วผลักถอย 2 ช่อง (กระแทกสิ่งกีดขวาง +1) (คูลดาวน์ 2 เทิร์น)",
      area: { kind: "line", len: 4, width: 1, hostile: true },
      cost: 6,
      img: "/characters/sora_otosumi/sora_skill3.jpg",
      instant: true,
      effect: null,
    },
  },
  {
    // ---------- ไรโด ฮิคารุ — ระดับกลาง — ดู characters/raido_hikaru.js ----------
    //  ร่าง UltraLive 6 ร่าง (ระยะ/แนวตี/เกราะผ่านฮุค range/attackLane/maxArmor) · Ultraman Ginga ตัว 3×3
    //  ท่าไม้ตายสลับตามร่าง: Ginga Cross Shoot (4 แต้ม · 5×1) ⇄ Strium Ray (6 แต้ม · 5×3) — skillCost/skillArea/skillPub
    id: "raido_hikaru",
    name: "ไรโด ฮิคารุ",
    avatar: 0,
    difficulty: "medium",
    img: "/characters/raido_hikaru/hikaru.jpg",
    mov: 4,
    range: [1, 1],
    passive: {
      name: "Strium Brace",
      desc: "ช่วงกลางวัน: แปลงร่างกิงกะ +1 ทันที · จบเทิร์นในร่างกิงกะ +1 · ครบ 5 (รวมทั้งเกม): กลายเป็นกิงกะสโตเรี่ยมทันที และ Ultraman Ginga ครั้งต่อไปเป็นสโตเรี่ยมเสมอ · สโตเรี่ยม: ตีปกติ +1 อีก และติดลุกไหม้ 1 · ท่าไม้ตายเป็น Strium Ray",
    },
    passive2: {
      name: "ร่าง UltraLive",
      desc: "ทุกร่าง: อยู่ 3 เทิร์นแล้วคืนร่างเอง · เกราะสูงสุด +2 · เข้าร่างฟื้นเกราะ 2 (ฟื้นอีกได้หลัง 5 เทิร์น) · เกราะลดเท่าไร ฟื้นพลังชีวิตเท่านั้น · แบล็คคิง: ตีปกติแนวตรงยาว 3 จากขอบตัว โดนทุกศัตรูในแนว · ทันเดอร์ดารัมเบีย: ตีปกติติดช็อต 1 เทิร์น · มนุษย์ดาวเคมู: ตีปกติติดพิษร้าย 1 เทิร์น · ไม่ถูกโจมตีและไม่เสียหาย 2 เทิร์นติด = ล่องหนเทิร์นถัดไป 1 เทิร์น · คิงแพนด้อน: ระยะตี 3 · ตีปกติติดลุกไหม้ 1 · ดอรากอรี่: ตีปกติติดเลือดไหล 1 · Ultraman Tiga: พลังโจมตี +1 · แม่นยำ",
    },
    basic: {
      name: "UltraLive",
      desc: "ไม่นับเป็นการใช้สกิล · เทิร์นละ 1 ครั้ง: เปลี่ยนเป็น 1 ใน 6 ร่าง (ตัว 3×3 · เดิน 3 พังสิ่งกีดขวางที่ผ่าน) หรือคืนร่าง · ร่างอยู่ 3 เทิร์นแล้วคืนร่างเอง · ร่างจบ (หมดเวลา / เปลี่ยนร่าง / คืนร่าง) = ร่างนั้นคูลดาวน์ 5 เทิร์น · ใช้ไม่ได้ระหว่างร่างกิงกะ",
      area: { kind: "self" },
      cost: 0,
      img: "/characters/raido_hikaru/hikaru_skill1.webp",
      instant: true,
      effect: null, // จัดการใน characters/raido_hikaru.js
    },
    secondary: {
      name: "Ultraman Ginga",
      desc: "ร่างปกติ: แปลงเป็น Ultraman Ginga 5 เทิร์น · ตัว 3×3 (ทับศัตรู = ผลักออก เสียหาย 1) · เดิน 3 พังสิ่งกีดขวางที่ผ่าน · ตีปกติ +1 โดนศัตรูทุกคนที่ติดตัวด้านที่ตี (1×3) · คูลดาวน์ 3 เทิร์น",
      area: { kind: "self" },
      cost: 4,
      img: "/characters/raido_hikaru/hikaru_skill2.webp",
      instant: true,
      effect: null,
    },
    ultimate: {
      name: "Ginga Cross Shoot",
      desc: "ร่างกิงกะ · เลือกทิศ: ลำแสงแนว 5×1 ใส่ศัตรูทุกคนในแนว ความเสียหาย 2 (เกราะรับก่อน · หลบไม่ได้) · ลุกไหม้ 2",
      area: { kind: "line", len: 5, width: 1, hostile: true },
      cost: 4,
      img: "/characters/raido_hikaru/hikaru_skill3.jpg",
      instant: true,
      effect: null,
    },
  },
  {
    // ---------- Ice Spike — ระดับยาก — ดู characters/ice_spike.js + server/ice.js (GRID_PLAN §7.9) ----------
    //  ตีปกติไม่ได้ (range [1, 0] = ไม่มีช่องที่ตีถึง) · ดาเมจมาจากการไถลชนเท่านั้น
    //  สกิลชนิด tile = เลือกช่องบนกระดาน (place: ice / spike / any · square = กรอบรอบช่องที่เลือก)
    id: "ice_spike",
    name: "Ice Spike",
    avatar: 0,
    difficulty: "hard",
    img: "/characters/ice_spike/ice_spike.webp",
    mov: 4,
    range: [1, 0],
    passive: {
      name: "ฝีก้าวของธารน้ำแข็ง",
      desc: "ทุกช่องที่เดินหรือไถลผ่านกลายเป็นธารน้ำแข็ง 6 เทิร์น (เหยียบซ้ำ = นับใหม่) · เดินเข้าน้ำแข็ง = ไถลไปทิศเดิมจนสุดแนวแล้วหยุดเดิน · ตีปกติไม่ได้",
    },
    passive2: {
      name: "แรงปะทะเหมันต์",
      desc: "ไถลชนศัตรู: ความเสียหายเท่าจำนวนช่องที่ไถล (สูงสุด 3 · ไม่ติดคริติคอล ไม่รับบัฟพลังโจมตี · หลบไม่ได้) แล้วเป้ากระเด็นไปตามทิศ 1 ช่อง · ไถลชนตอนเดิน = นับเป็นการโจมตี จบตา",
    },
    passive3: {
      name: "การฟื้นฟูแห่งเหมันต์",
      desc: "ได้รับความเสียหายสะสมครบ 3 (รวมเกราะ): ผลักศัตรูทั้ง 8 ช่องรอบตัวออก 1 ช่อง และติดเชื่องช้า 3 เทิร์น · ไถลครั้งเดียว: ครบทุก 3 ช่อง ฟื้นพลังชีวิต 1 · ครบทุก 2 ช่อง แต้มสกิล 1",
    },
    basic: {
      name: "Glacial Path",
      desc: "ไม่จำกัดครั้ง · ใช้ก่อนเดินแล้วยังเดินได้: สร้างธารน้ำแข็ง 1 ช่องในระยะ 8 (6 เทิร์น)",
      area: { kind: "tile", range: 8, place: "ice" },
      cost: 1,
      img: "/characters/ice_spike/skill1.webp",
      instant: true,
      effect: null, // จัดการใน characters/ice_spike.js
    },
    secondary: {
      name: "หนามน้ำแข็ง",
      desc: "เทิร์นละ 2 ครั้ง · ใช้ก่อนเดินแล้วยังเดินได้: หนามน้ำแข็ง Lv1 1 ช่องในระยะ 8 (3 เทิร์น · เดินผ่านไม่ได้ · เกราะ 1 ทุก Lv · ตีแตก = ลด 1 Lv) · วางบนน้ำแข็ง = Lv2 · วางทับคน: ผลักไปทิศที่เลือก 1 ช่อง + เชื่องช้า 3 เทิร์น · ไถลชนหนาม: เสียหายเท่า Lv + เชื่องช้า 3 เทิร์น หนามลด 1 Lv (หนามตัวเอง: แต้มสกิล +2 แทน)",
      area: { kind: "tile", range: 8, place: "spike", hostile: true },
      cost: 2,
      img: "/characters/ice_spike/skill2.webp",
      instant: true,
      effect: null,
    },
    ultimate: {
      name: "Ice Surge",
      desc: "ใช้ก่อนเดินแล้วยังเดินได้: หนามน้ำแข็งทุกอันบนสนาม +1 Lv · ได้ “Ice Surge” 3 เทิร์น (ธารน้ำแข็งและหนามน้ำแข็งระยะทั้งสนาม · หนามใช้แต้มลดลง 1 ไม่จำกัดครั้ง) และ “ฟื้นพลัง” 3 ขั้น (ต้นเทิร์นแต้มสกิล +1) (คูลดาวน์ 6 เทิร์น)",
      area: { kind: "self" },
      cost: 4,
      img: "/characters/ice_spike/skill3.webp",
      instant: true,
      effect: null,
    },
  },
  {
    // ---------- กิระ (ราชาแมลงอวกาศ) — ระดับง่าย — ดู characters/kira.js ----------
    //  ร่างกิระ ⇄ ราชาแมลงอวกาศ (ตีปกติแนวตรง 4×1 ผ่านฮุค range/attackLane) · ท่าไม้ตายตายแล้วฟื้น (ฮุค preventDeath)
    id: "kira",
    name: "ราชาแมลงอวกาศ",
    avatar: 0,
    difficulty: "easy",
    img: "/characters/kira/kira.webp",
    mov: 4,
    range: [1, 1],
    passive: {
      name: "บดขยี้ส่วนเกิน",
      desc: "ร่างราชาแมลงอวกาศ: ตีปกติปาดคลื่นแนวตรง 4×1 จากตัว โดนศัตรูทุกคนในแนว · หมอกดำแดงรอบตัว: จบเทิร์น ศัตรูที่ประชิดตัวเสียหาย 1 (เกราะรับก่อน) · ร่างกิระ: อยู่ต่อเนื่องครบ 2 เทิร์น ฟื้นพลังชีวิต 2 และแต้มสกิล 1 (สลับร่างแล้วนับใหม่)",
    },
    basic: {
      name: "สวมเกราะราชัน",
      desc: "ไม่นับเป็นการใช้สกิล: สลับร่างกิระ ⇄ ราชาแมลงอวกาศ",
      area: { kind: "self" },
      cost: 0,
      img: "/characters/kira/kira_skill1.webp",
      instant: true,
      effect: null, // จัดการใน characters/kira.js
    },
    secondary: {
      name: "คลื่นความมืด",
      desc: "เลือกทิศ: คลื่นแนว 4×3 ศัตรูทุกคนในแนวเสียหาย 1 (เกราะรับก่อน · หลบไม่ได้) · คนที่อยู่แถวข้างถูกบีบเข้าแถวกลาง (ช่องไม่ว่าง = ช่องว่างที่ใกล้สุด) และเดินไม่ได้ 1 เทิร์น (ต้านได้)",
      area: { kind: "line", len: 4, width: 3, hostile: true },
      cost: 4,
      img: "/characters/kira/kira_skill2.webp",
      instant: true,
      effect: null,
    },
    ultimate: {
      name: "อัฐิราชา",
      desc: "3 เทิร์น (รวมเทิร์นนี้): ตายแล้วฟื้นทันทีด้วยพลังชีวิต 1 ไม่จำกัดครั้ง · พลังโจมตี +2 · ใช้ได้ 2 ครั้งต่อเกม",
      area: { kind: "self" },
      cost: 8,
      img: "/characters/kira/kira_skill3.webp",
      instant: true,
      effect: null,
    },
  },
  {
    // ---------- เด็กสาวเสื้อคลุมขาว (ยูนะ) — พิเศษ — ดู characters/yuna.js ----------
    //  วงเพลง = รัศมีระยะเดินรอบตัว (ตามตัวไป · ขี่อยู่ = รอบคนที่ถูกขี่) · duo/trio: บัฟพวกเรา ดีบัฟศัตรู · ffa: ผลดีทุกคน ผลเสียทุกคนยกเว้นยูนะ
    //  ศพค้างบนกระดานระหว่างที่ยูนะยังอยู่ (ฮุค keepsCorpses — server/duo.js) · ขี่ผู้เล่นอื่น (server/ride.js)
    id: "yuna",
    name: "เด็กสาวเสื้อคลุมขาว",
    avatar: 0,
    difficulty: "special",
    img: "/characters/yuna/yuna.webp",
    mov: 4,
    range: [1, 1],
    passive: {
      name: "เสียงอันไพเราะ",
      desc: "ผู้เล่นที่ตายทิ้งศพไว้บนกระดานจนกว่ายูนะจะตาย (ขวางทาง เดินข้ามได้) · ขี่ผู้เล่นที่อยู่ติดกันได้เมื่ออีกฝ่ายยินยอม: ยูนะถูกโจมตีไม่ได้ สกิลพื้นที่โดนแค่คนที่ถูกขี่ เดินออก = ลง · คนที่ถูกขี่สั่งให้ลงได้ในตาของตัวเอง · คนที่ถูกขี่ถูกโจมตี = ยูนะร่วงลงข้างๆ และขี่ไม่ได้ 3 เทิร์น · ตายโดยยังไม่ใช้คำอวยพรสุดท้าย = คำอวยพรสุดท้ายทำงานกับตัวเอง",
    },
    basic: {
      name: "คำอวยพรสุดท้าย",
      desc: "1 ครั้งต่อเกม: เลือกศพในระยะเดิน ฟื้นคืนชีพด้วยพลังชีวิต 3 (ได้เดินเทิร์นนี้) · พลังโจมตี +1 และต้านสถานะ 3 เทิร์น · ใช้แล้วกลายเป็น “เป็นส่วนหนึ่งของเงา”",
      area: { kind: "tile", range: "mov", place: "corpse" },
      cost: 0,
      img: "/characters/yuna/yuna_skill1.webp",
      instant: true,
      effect: null, // จัดการใน characters/yuna.js
    },
    secondary: {
      name: "บทเพลงแห่งชีวิต",
      desc: "เลือกเพลง (ไม่นับเป็นการใช้สกิล · ยังเดินได้ · ใช้ระหว่างร้อนแรงดังไฟไม่ได้) · เปิดเพลงเสียแต้มสกิลเทิร์นละ 2 (ไม่พอ = เพลงหยุด) · Delete: ศัตรูในวงได้รับความเสียหาย +1 · พวกเราในวงฟื้นแต้มสกิลเทิร์นละ +1 · Smile for You: พวกเราในวงได้รับความเสียหาย −1 · ฟื้นพลังชีวิตเทิร์นละ 1 · พักผ่อน: ปิดเพลง · ffa: ผลของวงลงทุกคนในวง (ยูนะไม่โดนผลเสีย)",
      area: { kind: "self" },
      cost: 0,
      img: "/characters/yuna/yuna_skill2.webp",
      instant: true,
      effect: null,
    },
    ultimate: {
      name: "ร้อนแรงดังไฟ",
      desc: "เปลี่ยนเป็นยูนะ ไอดอล 5 เทิร์น (รวมเทิร์นนี้ · ปิดบทเพลงแห่งชีวิต): ระยะตีเท่าระยะเดิน · พวกเราในวงพลังโจมตี +1 (ยูนะ +2) แม่นยำ และฟื้นแต้มสกิลเทิร์นละ +1 (ffa: ทุกคนในวง) · หมดแล้วคูลดาวน์ 3 เทิร์น",
      area: { kind: "self" },
      cost: 8,
      img: "/characters/yuna/yuna_skill3.webp",
      instant: true,
      effect: null,
    },
  },
  {
    // ---------- เกรย์ — ระดับกลาง — ดู characters/gray.js ----------
    //  ศพค้างบนกระดานระหว่างที่เกรย์ยังอยู่ (ฮุค keepsCorpses) · ตีปกติใส่ศพประชิด = เก็บศพ (action.attackTarget "corpse:<id>")
    //  ท่าไม้ตายชาร์จ 2 เทิร์น ยิงต้นตาเดินของเทิร์น N+2 (ฮุค onActorReady)
    id: "gray",
    name: "เกรย์",
    avatar: 0,
    difficulty: "medium",
    img: "/characters/gray/gray.webp",
    mov: 4,
    range: [1, 1],
    passive: {
      name: "สัปเหร่อ",
      desc: "ผู้เล่นที่ตายทิ้งศพไว้บนสนาม · ตีปกติใส่ศพที่ประชิด = เก็บศพ (ฟื้นคืนชีพจากศพนั้นไม่ได้ · ศพเคท/เอมิลิโกะกลับมาเมื่อเปลี่ยนภูมิภาค): ฟื้นพลังชีวิต 2 · พลังโจมตี +1 ถาวร (สูงสุด +2) · รองโกมิเนียต +1 (สูงสุด 2 ศพ)",
    },
    basic: {
      name: "คนเฝ้าสุสาน",
      desc: "หลบหลีก 1 เทิร์น · เยียวยา (1) 2 เทิร์น (คูลดาวน์ 2 เทิร์น)",
      area: { kind: "self" },
      cost: 3,
      img: "/characters/gray/gray_skill1.webp",
      instant: true,
      effect: null, // จัดการใน characters/gray.js
    },
    secondary: {
      name: "Grave",
      desc: "ได้ “จงบ้าคลั่ง” 2 เทิร์น (รวมเทิร์นนี้): ระยะตีปกติ 2 ช่อง · อัตราคริติคอล +25% · ตีปกติติดถูกตรึง 1 เทิร์น (ต้านได้) (คูลดาวน์ 2 เทิร์น)",
      area: { kind: "self" },
      cost: 3,
      img: "/characters/gray/gray_skill2.webp",
      instant: true,
      effect: null,
    },
    ultimate: {
      name: "รองโกมิเนียต",
      desc: "เลือกทิศ: ชาร์จ (เดิน/จั่ว/ตีปกติ/ใช้สกิล/ยิงปืนไม่ได้ · ใช้ไอเทมได้) แนวยาวสุดสนาม กว้าง 7 · ถึงตาถัดไป: ศัตรูในแนวถูกตรึงจนถึงตอนยิง (ต้านได้) · ถึงตาถัดจากนั้น: ยิง ศัตรูในแนวเสียหาย 5 +1 ต่อศพที่เก็บ (ไม่รับบัฟ · เกราะรับก่อน · หลบได้) · ตาย = ยกเลิก (คูลดาวน์ 3 เทิร์นหลังยิง)",
      area: { kind: "line", len: 14, width: 7, hostile: true },
      cost: 6,
      img: "/characters/gray/gray_skill3.webp",
      instant: true,
      effect: null,
    },
  },
  {
    // ---------- Echo — พิเศษ — ดู characters/echo.js ----------
    //  พลังชีวิต 10 ไม่มีเกราะ (echo.maxHp/maxArmor) · ขนาดตัว/ระยะเดิน/ระยะตีบนกระดานเปลี่ยนตามเลือดสูงสุด (echo.mov/range)
    //  ท่าไม้ตาย "ก่อกำเนิดใหม่" (ผู้ใช้ตัดสิน 2026-10-10) — ฉากโลกแตก + เปลี่ยนภูมิภาค/นับเวลาใหม่ (server/phases/endTurn.js journeyRebirth)
    //  ปลดล็อกแล้ว — เลือกได้แค่ 1 คนต่อเกม (ผู้ใช้สั่ง 2026-10-12)
    id: "echo",
    name: "Echo",
    avatar: 0,
    difficulty: "special",
    unique: true, // เลือกได้แค่ 1 คนต่อเกม
    img: "/characters/echo/echo.webp",
    mov: 4,
    range: [1, 1],
    passive: {
      name: "เหล่าสหายตัวน้อยเอ๋ย",
      desc: "ขยายร่างไม่เกิน 4 ระดับ: คุ้มครอง (ดาเมจที่ได้รับ −1) · 5 ระดับขึ้นไป: พลังโจมตี +1 · ครบ 10 ระดับ: พลังโจมตี +1 อีก และตีปกติมีโอกาสสังหาร 5% · ต้นเทิร์นมีโอกาส 20% ได้ต้านสถานะผิดปกติ 1 เทิร์น · ตัวใหญ่ตามเลือดสูงสุด 15/20/25/30 = 2×2/3×3/4×4/5×5 (ระยะตี 2/2/3/3 · เดินได้น้อยลง · ตั้งแต่ 3×3 เดินพังสิ่งกีดขวาง · ขยายตัวผลักคนที่ขวางออก ศัตรูเสียหาย 1)",
    },
    passive2: {
      name: "การกลืนกินระดับ EX",
      desc: "สังหารผู้เล่นอื่นได้ พลังโจมตี +1 ถาวร",
    },
    basic: {
      name: "มหึมา",
      desc: "ได้ “ราชินีแห่ง Echo” 10 เทิร์น (ล้างไม่ได้): ขยายร่าง +1 ทันที และทุกต้นเทิร์น · ขยายร่างแต่ละระดับ เลือดสูงสุด +2 และฟื้นพลังชีวิต 2 (สูงสุด 10 ระดับ · อยู่ถาวรจนกว่าจะใช้ Overwrite) · คูลดาวน์ 12 เทิร์น",
      area: { kind: "self" },
      cost: 0,
      img: "/characters/echo/echo_front.webp",
      instant: true,
      effect: null, // จัดการใน characters/echo.js
    },
    secondary: {
      name: "Overwrite",
      desc: "ต้องมีขยายร่าง: ล้างขยายร่างทั้งหมดและ “ราชินีแห่ง Echo” · ทุก 2 ระดับที่ล้าง คูลดาวน์มหึมา −1 และพลังโจมตี +1 (2 เทิร์น) · ฟื้นพลังชีวิต 5",
      area: { kind: "self" },
      cost: 0,
      img: "/characters/echo/echo_top.webp",
      instant: true,
      effect: null,
    },
    ultimate: {
      name: "ก่อกำเนิดใหม่",
      desc: "ต้องมีเลือดสูงสุด 30: ศัตรูทุกคนเสียหาย 2 (เกราะรับก่อน · ไม่โดนเพื่อน) · ไปภูมิภาคใหม่ทันที ทุกคนกลับจุดเกิด · เทิร์นนี้เป็นเทิร์นแรกของภูมิภาค (กลางวัน · อยู่ 6 เทิร์น) · ร้านค้าปรากฏจุดใหม่ · จบตาเดินทันที (คูลดาวน์ 5 เทิร์น)",
      area: { kind: "self" },
      cost: 6,
      img: "/characters/echo/echo_front.webp",
      instant: true,
      effect: null, // จัดการใน characters/echo.js + server/phases/endTurn.js journeyRebirth
    },
  },
  {
    // ---------- เคท & เอมิลิโกะ (Shadows House) — ระดับยาก — ดู characters/kate_emiliko.js + server/duo.js ----------
    //  ผู้เล่น 1 คนคุม 2 ตัว: เลือก "kate" แล้วเริ่มแมตช์ได้ตัวที่สอง (duo: "emiliko") เกิดข้างกัน
    //  พลังชีวิต 3 เกราะ 2 ต่อตัว · แต้มสกิล 16 ใช้ร่วมกัน ฟื้นเทิร์นละ 2 · ตกรอบเมื่อล้มทั้งคู่
    id: "kate",
    name: "เคท",
    rosterName: "เคท & เอมิลิโกะ", // ชื่อบนการ์ดเลือกตัวละคร (ในเกมแต่ละตัวใช้ name ของตัวเอง)
    duo: "emiliko",
    avatar: 0,
    difficulty: "hard",
    img: "/characters/kate_emiliko/kate.webp",
    cover: "/characters/kate_emiliko/cover.jpg", // ภาพปก: หน้าเลือกตัวละคร + หน้าสรุป (ผู้ใช้สั่ง 2026-10-14) — ในเกมยังใช้ img
    mov: 4,
    range: [1, 1],
    passive: {
      name: "เงาในพายุเขม่า",
      desc: "ในระบำเขม่า: เดิน 6 · ตีปกติทำให้เป้า “มืดบอด” 1 เทิร์น (หมากคนอื่นเป็นสีขาว ไม่มีชื่อ ภาพ และลำดับเดิน)",
    },
    passive2: {
      name: "เคท & เอมิลิโกะ",
      desc: "เกิดข้างกัน 2 ตัว (พลังชีวิต 3 เกราะ 2 ต่อตัว) · ตาเดินเดียวกันเดินได้ทั้งคู่ · ตกรอบเมื่อล้มทั้งคู่ · แต้มสกิล 16 เหรียญ กระเป๋า และไพ่ใช้ร่วมกัน · ฟื้นแต้มสกิลเทิร์นละ 2",
    },
    basic: {
      name: "กระจกเงา",
      desc: "ไม่นับเป็นการใช้สกิล · สลับไปคุมอีกตัว (ไม่จำกัดครั้ง · ตัวที่ตีหรือรอแล้วสลับกลับไม่ได้) · อีกตัวล้ม: กลายเป็น “ตื่นขึ้นอีกครั้ง” (6 แต้ม · ร่างอยู่ในระยะ 4) ฟื้นคืนชีพด้วยพลังชีวิต 3",
      area: { kind: "self" },
      cost: 0,
      img: "/characters/kate_emiliko/mirror.jpg",
      instant: true,
      effect: null, // จัดการใน characters/kate_emiliko.js
    },
    secondary: {
      name: "เขม่าควัน",
      desc: "เลือกใช้: แส้เขม่า (2 แต้ม · ระยะ 3) เอมิลิโกะ = ดึงมาติดตัว · ศัตรู = พุ่งเข้าประชิด ความเสียหาย 1 · ดาบเขม่า (0 แต้ม · ไม่นับเป็นการใช้สกิล) ถือเอง พลังโจมตี +1 / ส่งให้เอมิลิโกะในระยะ 4 / เรียกคืน · ปีกเขม่า (4 แต้ม) เลือกทิศ บิน 4 ช่องข้ามทุกอย่าง (ลงไม่ได้ = บินต่อ) พาเอมิลิโกะที่ติดตัวไปด้วย",
      area: { kind: "self" },
      cost: 0,
      img: "/characters/kate_emiliko/whip.jpg",
      instant: true,
      effect: null,
    },
    ultimate: {
      name: "ระบำเขม่า",
      desc: "เลือกจุดกลางในระยะเดิน: “ม่านแดง” พายุเขม่า 8×8 นาน 3 เทิร์น · ศัตรูข้างในเสียหาย 1 ทันทีและทุกเทิร์น (เกราะรับก่อน) · ขังทุกคนไว้ข้างใน (เคทกับเอมิลิโกะออกได้) · คนข้างนอกกับข้างในมองไม่เห็นกัน",
      area: { kind: "tile", range: "mov", square: 8, place: "any", hostile: true },
      cost: 6,
      img: "/characters/kate_emiliko/storm.avif",
      instant: true,
      effect: null,
    },
  },
  {
    // ---------- เอมิลิโกะ — ตัวที่สองของ "kate" (ระบบคู่ · เลือกเองไม่ได้) ----------
    id: "emiliko",
    name: "เอมิลิโกะ",
    hidden: true,
    avatar: 0,
    difficulty: "hard",
    img: "/characters/kate_emiliko/emiliko.webp",
    mov: 3,
    range: [1, 1],
    passive: {
      name: "กำลังใจเต็มเปี่ยม",
      desc: "ตีปกติหรือรอแล้ว เดินต่อได้อีก 2 ช่อง (ทำอย่างอื่นไม่ได้ · พื้นเปียกไถลเกินได้) · ในระบำเขม่า: เดิน 4",
    },
    passive2: {
      name: "เคท & เอมิลิโกะ",
      desc: "เกิดข้างกัน 2 ตัว (พลังชีวิต 3 เกราะ 2 ต่อตัว) · ตาเดินเดียวกันเดินได้ทั้งคู่ · ตกรอบเมื่อล้มทั้งคู่ · แต้มสกิล 16 เหรียญ กระเป๋า และไพ่ใช้ร่วมกัน · ฟื้นแต้มสกิลเทิร์นละ 2",
    },
    basic: {
      name: "กระจกเงา",
      desc: "ไม่นับเป็นการใช้สกิล · สลับไปคุมอีกตัว (ไม่จำกัดครั้ง · ตัวที่ตีหรือรอแล้วสลับกลับไม่ได้) · อีกตัวล้ม: กลายเป็น “ตื่นขึ้นอีกครั้ง” (6 แต้ม · ร่างอยู่ในระยะ 4) ฟื้นคืนชีพด้วยพลังชีวิต 3",
      area: { kind: "self" },
      cost: 0,
      img: "/characters/kate_emiliko/mirror.jpg",
      instant: true,
      effect: null,
    },
    secondary: {
      name: "เครื่องมือทำความสะอาด",
      desc: "สลับอาวุธ (ไม่นับเป็นการใช้สกิล · ยังเดินได้): ไม้ถูพื้น เดินเข้าพื้นเปียกไถลจนสุดแนว ชนศัตรูเสียหาย 2 (บัฟไม่ได้) ทางที่ไถลผ่านแห้ง · แจกันใส่น้ำ ตีปกติผลักเป้า 3 ช่อง (ชนเสียหาย 1) ทางที่ถูกผลักเป็นพื้นเปียก · เครื่องดูดฝุ่น (5 ครั้งต่อเกม · หมดแล้วกลับเป็นไม้ถูพื้น) ระยะตี 3 ความเสียหายเท่าระยะ (บัฟไม่ได้) ดูดเป้ามาติดตัว · ดาบเขม่า (ได้จากเคท) พลังโจมตี +2",
      area: { kind: "self" },
      cost: 0,
      img: "/characters/kate_emiliko/tools.jpg",
      instant: true,
      effect: null,
    },
    ultimate: {
      name: "ร่าเริงสุดๆ",
      desc: "เลือกทิศ แนว 4×3 ตามอาวุธที่ถือ: ไม้ถูพื้น พุ่ง 4 ช่อง ผลักทุกคนไปสุดแนว ความเสียหาย 2 (ชนเพิ่ม 1) ทางที่พุ่งเป็นพื้นเปียก · แจกัน ตีทุกคนแล้วผลัก 3 ช่อง · เครื่องดูดฝุ่น ความเสียหายเท่าระยะแล้วดูดเข้ามา (นับ 1 ครั้ง) · ดาบเขม่า ตีทุกคน พลังโจมตี +2",
      area: { kind: "line", len: 4, width: 3, hostile: true },
      cost: 6,
      img: "/characters/kate_emiliko/cheer.jpg",
      instant: true,
      effect: null,
    },
  },
];

const CHAR_BY_ID = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));

// สีประจำตำแหน่ง P1-P7 (ตามภาพดีไซน์)
const POSITION_COLORS = {
  1: "#9B4F96", // ม่วง
  2: "#9B2D3A", // แดงเลือดหมู
  3: "#3B82C4", // ฟ้า
  4: "#E5B33B", // เหลือง
  5: "#C0392B", // แดง
  6: "#2E9E4B", // เขียว
  7: "#E86A2B", // ส้ม (ช่องผู้เล่นที่ 7 — patch 2.8)
};

// เวอร์ชัน "สาธารณะ" ส่งให้ client (ตัด effect ภายในออก เหลือชื่อ/คำอธิบาย/ค่าใช้)
function publicRoster() {
  const pub = (s) => (s ? { name: s.name, desc: s.desc, cost: s.cost, img: s.img, ammo: s.ammo, area: s.area || { kind: "self" } } : null);
  return CHARACTERS.map((c) => ({
    id: c.id,
    name: c.rosterName || c.name, // เคท & เอมิลิโกะ: การ์ดเลือกตัวละครใช้ชื่อคู่
    avatar: c.avatar,
    img: c.cover || c.img, // ภาพปก (เคท & เอมิลิโกะ) ใช้แทนบนหน้าเลือกตัวละคร
    locked: !!c.locked,
    hidden: !!c.hidden,
    difficulty: c.difficulty || "easy", // ความยากในการเล่น (ใช้แบ่งหน้าเลือกตัวละคร)
    passive: c.passive ? { name: c.passive.name, desc: c.passive.desc } : null,
    passive2: c.passive2 ? { name: c.passive2.name, desc: c.passive2.desc } : null,
    passive3: c.passive3 ? { name: c.passive3.name, desc: c.passive3.desc } : null, // Ice Spike
    basic: pub(c.basic),
    secondary: pub(c.secondary),
    ultimate: pub(c.ultimate),
  }));
}

module.exports = { CHARACTERS, CHAR_BY_ID, POSITION_COLORS, publicRoster };
