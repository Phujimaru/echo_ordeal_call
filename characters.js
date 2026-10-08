// ============================================================
//  ข้อมูลตัวละคร + สกิล (data-driven ตาม ECHO spec ข้อ 4)
//  แก้/เพิ่มตัวละครที่ไฟล์นี้ไฟล์เดียว โดยไม่ต้องแตะ engine
//
//  โครงสกิล: { name, desc, cost, effect }
//    - basic     cost 2
//    - secondary cost 4
//    - ultimate  cost 6 (หลอดสกิลจุ 8 แต้ม — patch 1.7.6)
//    - passive   ฟรี ทำงานเองตาม trigger
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
//  instant: true = สกิลทำงานในช่วงจั่วการ์ด -> เด้งโชว์บนกระดานทันทีตอนใช้
//  (สกิลที่ทำงานหลังเปิดไพ่ จะไปโชว์ตอนอนิเมชันโจมตีแทน ว่าใครใช้อะไร)
// ============================================================

const CHARACTERS = [
  {
    id: "muimi",
    name: "มุยมิ",
    avatar: 0,
    difficulty: "easy",
    img: "/characters/muimi/muimi.webp",
    passive: {
      name: "ใจที่ไม่ยอมแพ้",
      desc: "ระหว่าง “ดาบสะบั้น” ตีปกติแต่ละครั้งยืดสถานะ +1 เทิร์น · ระหว่างนี้ไม่เกิด Overload Force",
    },
    passive2: {
      name: "หัวใจนักสู้",
      desc: "แพ้การจั่วหรือไพ่แตกติดกัน 3 ครั้ง: เทิร์นหน้า 50% ศัตรูทุกคนไพ่แตก (ไม่โดนเพื่อน · ต้านไม่ได้) · สุ่มแล้วนับใหม่เสมอ · ชนะจากดาบสะบั้นหอคอยสวรรค์ยังนับเป็นแพ้",
    },
    basic: {
      name: "เสบียงฉุกเฉิน",
      desc: "ก่อนเปิดไพ่ · ไม่นับเป็นการใช้สกิล · 1 ครั้ง/เทิร์น รวม 2 ครั้งต่อเกม: ฟื้นพลังชีวิต 2 และแต้มสกิล 2",
      cost: 0,
      img: "/characters/muimi/muimi_skill1.webp",
      ammo: 2,
      instant: true,
      effect: null,
    },
    secondary: {
      name: "ดาบสนิม",
      desc: "ก่อนเปิดไพ่: ได้ “ดาบเก่าๆ” 3 เทิร์น · ตีปกติฟื้นพลังชีวิต 1 และแต้มสกิล 1 · ใช้ไม่ได้ระหว่าง “ดาบสะบั้น”",
      cost: 4,
      img: "/characters/muimi/muimi_skill2.png",
      instant: true,
      effect: null,
    },
    ultimate: {
      name: "ดาบสะบั้นหอคอยสวรรค์",
      desc: "ก่อนเปิดไพ่: ศัตรูทุกคนไพ่แตกทันที (ไม่โดนเพื่อน · ต้านไม่ได้) · ได้ “ดาบสะบั้น” 2 เทิร์น: โจมตีพื้นฐาน +3 ตีปกติฟื้นพลังชีวิต 2 · ได้ต้านสถานะผิดปกติ 3 เทิร์น · ใช้ไม่ได้ระหว่าง “ดาบเก่าๆ” · หมดแล้วรอ 5 เทิร์นถึงใช้ซ้ำได้",
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
    passive: {
      name: "หน้าไหว้หลังหลอก",
      desc: "จบเทิร์นที่ไม่ถูกโจมตีเลย (ถูกเลือกเป็นเป้าก็นับ แม้หลบได้) ได้แต้มสกิล +1 และเหรียญ +1",
    },
    basic: {
      name: "ม่านแห่งราตรี",
      desc: "ก่อนเปิดไพ่: ทุกคนโจมตี +1 นาน 3 เทิร์น และฟื้นพลังชีวิต 1 · โหมด duo/trio เฉพาะตัวเองและเพื่อนร่วมทีม · กดซ้ำไม่ได้ระหว่างผลยังอยู่",
      cost: 2,
      img: "/characters/oberon/oberon_skill1.jpg",
      instant: true,
      effect: null, // จัดการใน characters/oberon_summer.js
    },
    secondary: {
      name: "นกจาบยามเช้า",
      desc: "ก่อนเปิดไพ่ · ยังใช้สกิลอื่นได้อีก 1 ครั้ง: 1 คน (รวมตัวเอง) ฟื้นพลังชีวิต 5 ได้ต้านสถานะผิดปกติ 2 เทิร์น และล้างสถานะผิดปกติล่าสุด 1 อย่าง · ต้นเทิร์นหน้าเป้าเสียพลังชีวิต 2 ไม่สนเกราะ (ต้านไม่ได้)",
      cost: 4,
      img: "/characters/oberon/oberon_skill2.jpg",
      instant: true,
      effect: null,
    },
    ultimate: {
      name: "จุดจบของความฝัน",
      desc: "ก่อนเปิดไพ่ (คูลดาวน์ 5 เทิร์น): 1 คน (รวมตัวเอง) โจมตี +4 เฉพาะเทิร์นนี้ · จบเทิร์นแล้วเป้าสตั้น 3 เทิร์น (ต้านได้)",
      cost: 4,
      img: "/characters/oberon/oberon_skill3_morning.webp",
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
  const pub = (s) => (s ? { name: s.name, desc: s.desc, cost: s.cost, img: s.img, ammo: s.ammo } : null);
  return CHARACTERS.map((c) => ({
    id: c.id,
    name: c.name,
    avatar: c.avatar,
    img: c.img,
    locked: !!c.locked,
    hidden: !!c.hidden,
    difficulty: c.difficulty || "easy", // ความยากในการเล่น (ใช้แบ่งหน้าเลือกตัวละคร)
    passive: c.passive ? { name: c.passive.name, desc: c.passive.desc } : null,
    passive2: c.passive2 ? { name: c.passive2.name, desc: c.passive2.desc } : null, // สกิลติดตัว 2 (มุยมิ) — ตัวอื่นเป็น null
    basic: pub(c.basic),
    secondary: pub(c.secondary),
    ultimate: pub(c.ultimate),
  }));
}

module.exports = { CHARACTERS, CHAR_BY_ID, POSITION_COLORS, publicRoster };
