// ข้อมูลไอเทมฝั่ง client (ชื่อ/ไอคอน/คำอธิบาย) — ต้องตรงกับ server/shop.js
const SHOP_ITEM_INFO = {
  // ไอเทมช่วงจั่วไพ่ (ยาโชคลาภ · ยาเปลี่ยนสีการ์ด · กรรไกรตัดไพ่) — เปิดกระเป๋าใช้ช่วงจั่ว ก่อนกด "พอ" (ผู้ใช้สั่ง 2026-11-08) · ตาเดินกดใช้ไม่ได้
  cardColor: { icon: "🎨", label: () => "ยาเปลี่ยนสีการ์ด", short: "เปลี่ยนสีการ์ด 1 ใบ", desc: "ช่วงจั่วไพ่: เลือกการ์ดเลข 1 ใบในมือ แล้วเปลี่ยนเป็นสีที่ต้องการ" },
  fortune: { icon: "🍀", label: () => "ยาโชคลาภ", short: "จั่วถัดไปได้ 19–21", desc: "ได้รับโชคลาภ +2 หน่วย — จั่วครั้งถัดไปจะปรับไพ่ที่จั่วให้แต้มรวมตกช่วง 19-21 ทันที แล้วหน่วยนั้นหายไป" },
  cardCut: { icon: "✂️", label: () => "กรรไกรตัดไพ่", short: "ตัดไพ่ใบล่าสุด", desc: "ช่วงจั่วไพ่: ตัดไพ่ใบล่าสุดในมือออก คืนเข้ากองกลาง" },
  resist: { icon: "🛡️", label: () => "ยาต้านสถานะ", short: "กันสถานะ 2 เทิร์น", desc: "ต้านสถานะผิดปกติทุกประเภท 2 เทิร์น (ป้องกันล่วงหน้าเท่านั้น ไม่ใช่ยารักษา)" },
  cleanse: { icon: "💧", label: () => "ยาล้างสถานะ", short: "ล้างสถานะ 1 ขั้น", desc: "เลือกสถานะผิดปกติ 1 อย่างบนตัว แล้วลดลง 1 ขั้น (หมดขั้น = หาย)" },
  // วงจรพลังงาน: ถังแต้มสกิล ชาร์จเอง +1/เทิร์น เก็บได้ 5 · ถอนเท่าที่เลือก (it.charge)
  battery: { icon: "🔋", label: () => "วงจรพลังงาน", shortOf: (it) => `แต้มสกิล ${it.charge ?? 0}/${BATTERY_MAX}`, desc: "ชาร์จแต้มสกิล +1 ทุกจบเทิร์น เก็บได้สูงสุด 5 · เลือกจำนวนที่จะถอนออกมาใช้ได้เอง" },
  // ผลึก (ถาวรทั้งแมตช์) / รองเท้าวายุ — ผู้ใช้สั่ง 2026-11-08
  lifeCrystal: { icon: "💗", label: () => "ผลึกชีวิต", short: "พลังชีวิตสูงสุด +1", desc: "พลังชีวิตสูงสุด +1 ถาวรทั้งแมตช์ และฟื้นพลังชีวิต 1" },
  armorCrystal: { icon: "💠", label: () => "ผลึกเกราะ", short: "เกราะสูงสุด +1", desc: "เกราะสูงสุด +1 ถาวรทั้งแมตช์ และฟื้นเกราะ 1" },
  windBoots: { icon: "👟", label: () => "รองเท้าวายุ", short: "เดิน +2 ตานี้", desc: "ระยะเดินตานี้ +2 · ใช้แล้วยังเดินได้ (ต้องใช้ก่อนใช้สกิล/ไอเทมอื่น/ซื้อของ)" },
  // ระเบิดธาตุ (โรงช่างลุงเริง · ผู้ใช้สั่ง 2026-11-14 · GRID_PLAN §8.7): เลือกธาตุตอนโยน · วง 3×3 · ระยะเดินปกติ
  elemBomb: { icon: "💣", label: () => "ระเบิดธาตุ", short: "3×3", desc: "" },
  armor: { icon: "🔧", label: (it) => `ยาฟื้นเกราะ +${it.value}`, short: "ฟื้นเกราะ", desc: "ฟื้นเกราะทันที" },
  // คบเพลิง — ขายเฉพาะ Fodlan ด่าน II เรเมียร์ (server/fodlan/stage2.js · ป่าหมอก)
  torch: { icon: "🔥", label: () => "คบเพลิง", short: "มองทะลุหมอก 4 ช่อง", desc: "ปักบนช่องที่ยืน — ทุกคนมองทะลุหมอกรอบคบเพลิง 4 ช่อง (นับแบบการเดิน) จนเปลี่ยนแผนที่ · ศัตรูตีดับได้" },
  // ผักกิซาล — ขายเฉพาะสนาม Eos (server/fodlan/stage6.js useGysahl · GRID_PLAN §8.6)
  barricade: { icon: "🧱", label: () => "กำแพงไม้", short: "มอนผ่านไม่ได้ · ทน 3", desc: "วางช่องข้างตัว · มอนผ่านไม่ได้ · ทน 3 · ถือได้ 2" },
  eosRevive: { icon: "🪶", label: () => "ขนนกคืนชีพ", short: "ฟื้นเพื่อนที่ร่าง · ไม่นับการล้ม", desc: "ยืนติดร่างเพื่อน · ฟื้นทันที เลือดครึ่ง · ชีวิตทีมคืน 1" },
  pillarWard: { icon: "🛡️", label: () => "เกราะเสา", short: "โล่เสา +1 (สูงสุด 2)", desc: "ยืนติดเสาที่ยึด · โล่ +1 (สูงสุด 2) · รับการตีแทนรอย" },
  // Road Trip (server/roadtrip — QA 2026-11-14: เดิมไม่มีข้อมูล = ไอคอน ✦ ชื่อว่าง)
  rtRevive: { icon: "🪶", label: () => "ขนนกคืนชีพ", short: "ฟื้นเพื่อนที่ล้ม · เลือดครึ่ง", desc: "ฟื้นเพื่อนที่ล้ม เลือดครึ่ง ข้างตัวคนใช้ · ใช้ได้ตอนสู้และที่จุดพัก" },
  rtFish: { icon: "🐟", label: () => "ปลาย่าง", short: "พลังชีวิต +3", desc: "ฟื้นพลังชีวิต 3 · ใช้ได้ตอนสู้และนอกการต่อสู้" },
  // Road Trip: วัตถุดิบ (ซ้อนกองละ 5 · it.qty) + อาหารแคมป์ — ตรงกับ server/roadtrip/food.js (ผู้ใช้สั่ง 2026-11-14)
  ...Object.fromEntries([["ingRice", "🍚", "ข้าว"], ["ingEgg", "🥚", "ไข่"], ["ingVeg", "🥬", "ผัก"], ["ingSpice", "🧂", "เครื่องปรุง"], ["ingMeat", "🥩", "เนื้อ"], ["ingFish", "🐟", "ปลาสด"]]
    .map(([k, icon, name]) => [k, { icon, ing: true, label: (it) => (it && it.qty > 1 ? `${name} ×${it.qty}` : name), short: "วัตถุดิบ", desc: "วัตถุดิบทำอาหารที่กองไฟในแคมป์ · ซ้อนได้ช่องละ 5" }])),
  dishOmelet: { icon: "🍳", dish: true, label: () => "ข้าวไข่เจียว", short: "พลังชีวิต +3", desc: "ข้าว + ไข่ · พลังชีวิต +3 · กินได้ทุกที่นอกการต่อสู้" },
  dishFriedRice: { icon: "🍛", dish: true, label: () => "ข้าวผัด", short: "พลังชีวิต +4 · เกราะ +1", desc: "ข้าว + ไข่ + ผัก · พลังชีวิต +4 เกราะ +1 · กินได้ทุกที่นอกการต่อสู้" },
  dishSteak: { icon: "🍖", dish: true, label: () => "สเต๊กกระทะ", short: "พลังชีวิต +2 · เสริมพลัง +1", desc: "เนื้อ + เครื่องปรุง · พลังชีวิต +2 · สู้ครั้งหน้า เสริมพลัง +1 (2 เทิร์น)" },
  dishFish: { icon: "🐠", dish: true, label: () => "ปลาเผาเกลือ", short: "พลังชีวิต +2 · หลบหลีก 25%", desc: "ปลาสด + เครื่องปรุง · พลังชีวิต +2 · สู้ครั้งหน้า หลบหลีก 25% (2 เทิร์น)" },
  dishTomYum: { icon: "🍲", dish: true, label: () => "ต้มยำ", short: "พลังชีวิต +3 · ล้างสถานะ", desc: "ปลาสด + ผัก + เครื่องปรุง · พลังชีวิต +3 · ล้างสถานะผิดปกติทั้งหมด" },
  dishSalad: { icon: "🥗", dish: true, label: () => "สลัดผัก", short: "เกราะ +2 · คุ้มครอง +1", desc: "ผัก + ไข่ · เกราะ +2 · สู้ครั้งหน้า คุ้มครอง +1 (2 เทิร์น)" },
  dishLunch: { icon: "🍱", dish: true, label: () => "ข้าวกล่องช่าง", short: "รถตู้ +4 · พลังชีวิต +1", desc: "ข้าว + เนื้อ · HP รถตู้ +4 · พลังชีวิต +1" },
  dishHotpot: { icon: "🫕", dish: true, label: () => "หม้อไฟรวมมิตร", short: "ทั้งทีม พลังชีวิต +2", desc: "เนื้อ + ปลาสด + ผัก · ทุกคนในทีม พลังชีวิต +2" },
  gysahl: { icon: "🥬", label: () => "ผักกิซาล", short: "เรียกโชโกโบะ", desc: "โชโกโบะว่างมาข้างตัว · ศัตรูขี่ในระยะ 4 = ตกนก" },
  // ขนมปัง — ของประจำตัวเอมิลิโกะ (เคท & เอมิลิโกะ · ไม่กินช่องกระเป๋า · ทิ้งไม่ได้)
  kebread: { icon: "🍞", img: "/characters/kate_emiliko/bread.jpg", label: (it) => `ขนมปัง ×${it.uses ?? 0}`, short: "พลังชีวิต +2 · เกราะ +1 · ล้างดีบัฟ 1 ขั้น", desc: "เอมิลิโกะกินเอง หรือป้อนเคทที่ยืนติดกัน — ฟื้นพลังชีวิต 2 เกราะ 1 และล้างดีบัฟ 1 ขั้น · ใช้แล้วเอมิลิโกะเดินต่อและโจมตีไม่ได้ในตานี้" },
  // หัวใจ — ท่าไม้ตาย Mess ของทราฟาก้า ลอว์ (กินช่องกระเป๋า · ใช้ = บีบ · ทิ้ง = คืนเจ้าของ · ready = เทิร์นนี้ยังไม่ได้บีบดวงนี้)
  lawHeart: { icon: "🫀", label: (it) => `หัวใจ · ${it.targetName || "?"}`, shortOf: (it) => `ความเสียหาย 2 · ${it.uses ?? 0}/3`, desc: "บีบหัวใจ: เจ้าของหัวใจเสียหาย 2 (เกราะรับก่อน) ไม่ว่าอยู่ไกลแค่ไหน · ดวงละ 1 ครั้งต่อเทิร์น · ใช้แล้วเดินไม่ได้อีก" },
  // ธนู Requiem — ของประจำโจรุโน่ (ใช้ = จบตาทันที · it.cd = คูลดาวน์หลังคืนร่าง)
  giornoArrow: { icon: "🏹", img: "/characters/giorno_giovanna/req_arrow.webp", label: () => "ธนู Requiem", short: "แปลงร่าง 50/50", descOf: (it) => `จบตาทันที · ตาถัดไปสุ่ม 50/50: แปลงร่าง Gold Experience Requiem 3 เทิร์น หรือตายทันที · คูลดาวน์ 5 เทิร์นหลังคืนร่าง${it.cd > 0 ? ` · เหลือคูลดาวน์ ${it.cd} เทิร์น` : ""}` },
};
export const DRAW_ITEM_TYPES = ["fortune", "cardColor", "cardCut"];
// Road Trip: เมนูแคมป์ (server/roadtrip/food.js RECIPES — ลำดับ/วัตถุดิบตรงกัน)
export const RT_RECIPES = [
  { id: "omelet", dish: "dishOmelet", need: { ingRice: 1, ingEgg: 1 } },
  { id: "friedrice", dish: "dishFriedRice", need: { ingRice: 1, ingEgg: 1, ingVeg: 1 } },
  { id: "steak", dish: "dishSteak", need: { ingMeat: 1, ingSpice: 1 } },
  { id: "saltfish", dish: "dishFish", need: { ingFish: 1, ingSpice: 1 } },
  { id: "tomyum", dish: "dishTomYum", need: { ingFish: 1, ingVeg: 1, ingSpice: 1 } },
  { id: "salad", dish: "dishSalad", need: { ingVeg: 1, ingEgg: 1 } },
  { id: "lunch", dish: "dishLunch", need: { ingRice: 1, ingMeat: 1 } },
  { id: "hotpot", dish: "dishHotpot", need: { ingMeat: 1, ingFish: 1, ingVeg: 1 } },
];
export const isRtDish = (type) => typeof type === "string" && type.startsWith("dish");
export const rtQty = (it) => (it && it.qty > 0 ? it.qty | 0 : 1);
export const BATTERY_MAX = 5; // ตรงกับ server/constants.js BATTERY_MAX

export function shopInfoOf(it) {
  const base = SHOP_ITEM_INFO[it.type] || { icon: "✦", label: () => "สินค้า", desc: "" };
  // imgOf/descOf/shortOf: ไอเทมที่หน้าตา/คำอธิบายขึ้นกับข้อมูลในตัวไอเทมเอง
  // short = คำอธิบายย่อ (ร้าน/กระเป๋าแบบใหม่ · กฎ "ไม่มีข้อความอธิบายยาว") · desc = ฉบับเต็ม (ชี้ค้างดูได้)
  return { ...base, img: base.imgOf ? base.imgOf(it) : base.img, desc: base.descOf ? base.descOf(it) : base.desc, short: base.shortOf ? base.shortOf(it) : (base.short || "") };
}
