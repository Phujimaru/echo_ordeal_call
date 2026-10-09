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
      desc: "ได้ “ดาบเก่าๆ” 3 เทิร์น · ตีปกติฟื้นพลังชีวิต 1 และแต้มสกิล 1 · ระหว่าง “ดาบสะบั้น” (6 แต้ม): เลือกทิศ ปล่อยคลื่นดาบแนว 4×3 ใส่ศัตรูทุกคนในแนว เท่าพลังโจมตี +3 (เกราะรับก่อน · หลบได้ · ไม่ได้สถานะเพิ่ม)",
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
    name: c.name,
    avatar: c.avatar,
    img: c.img,
    locked: !!c.locked,
    hidden: !!c.hidden,
    difficulty: c.difficulty || "easy", // ความยากในการเล่น (ใช้แบ่งหน้าเลือกตัวละคร)
    passive: c.passive ? { name: c.passive.name, desc: c.passive.desc } : null,
    basic: pub(c.basic),
    secondary: pub(c.secondary),
    ultimate: pub(c.ultimate),
  }));
}

module.exports = { CHARACTERS, CHAR_BY_ID, POSITION_COLORS, publicRoster };
