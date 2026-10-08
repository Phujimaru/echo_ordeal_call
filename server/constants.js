// ค่าคงที่ของเกม (เวลาเฟส/เลือด/ร้านค้า/วงจรวัน-คืน/การเดินทาง)ยังใช้
// เพดานค่าใช้พลังงานของสกิล: ตัวปรับราคา "ขาขึ้น" ทุกชนิด (กลางคืน / ภาระเวท) ดันราคาได้ไม่เกินนี้
//  สกิลที่ราคาแตะเพดานอยู่แล้ว (เช่นท่าไม้ตาย 8) จะไม่ถูกดันให้แพงขึ้นไปอีก — ส่วนกระแสเวทยังลดราคาได้ตามปกติ
const SKILL_COST_MAX = 8;

// ---------- ค่าคงที่ ----------
const MAX_PLAYERS = 7; // patch 2.8: เปิดช่องผู้เล่นที่ 7
const CARD_TIME = 60;
const OVERLOAD_FORCE_CHANCE = 0.30;
const OVERLOAD_FORCE_CUTSCENE_SECONDS = 5; // overload_force_start.mp4 = 4.809s
// กระดาน (GRID_PLAN.md): แบนเนอร์ลำดับเดิน · เวลาต่อตาเดิน · ค่าเดิน/ระยะตีตั้งต้นของตัวละครที่ไม่ได้กำหนด
const ORDER_TIME = 2;
const ACTION_TIME = 60;
const DEFAULT_MOV = 4;
const DEFAULT_RANGE = [1, 1];
const TRANSITION_TIME = 3;
const RECONNECT_GRACE_MS = Math.max(100, Number(process.env.RECONNECT_GRACE_MS) || 60_000);
const RESERVATION_TTL_MS = 120_000;
const ATTACKFX_TIME = 3;  // อนิเมชันบอกว่าใครตีใคร

const MAX_HP = 7;       // เลือดจริงพื้นฐาน (patch พิเศษ — เดิม 5)
const MAX_ARMOR = 3;    // เกราะเริ่มต้น (patch พิเศษ — เดิม 2)
const MAX_SKILL = 8;
// ---------- ร้านค้ามายา + เศรษฐกิจเหรียญ (patch 2.2 full) ----------
const GOLD_MAX = 30;             // เพดานเหรียญต่อผู้เล่น
const GOLD_PER_TURN = 1;         // เหรียญที่ได้ทุกจบเทิร์น (ทุกคน)
const GOLD_FIRST_BONUS = 1;      // เหรียญเพิ่มให้คนเดินลำดับแรก (รวมกับของทุกคน = 2)
const SHOP_INTERVAL_TURNS = 5;   // ร้านค้าเปิดทุกๆ 5 เทิร์น
const SHOP_MAX_ITEMS = 15;       // จำนวนสินค้าสูงสุดต่อรอบร้านค้า (เดิม 6 -> 9 -> 15 หลังรวมร้านลุงเท่งเข้ามา)
const SHOP_CARD_COLOR_PRICE = 5; // ยาเปลี่ยนสีการ์ด: เลือกการ์ด 1 ใบในมือ เปลี่ยนเป็นสีที่ต้องการ
const SHOP_FORTUNE_PRICE = 5;
const SHOP_FORTUNE_AMOUNT = 2;   // ยาโชคลาภ: ได้โชคลาภ +2 หน่วยเมื่อใช้
const FORTUNE_MAX = 3;           // โชคลาภ ซ้อนทับได้สูงสุด 3 ครั้ง
const SHOP_RESIST_PRICE = 5;
const SHOP_RESIST_TURNS = 1;     // ยาต้านสถานะ: ต้านสถานะผิดปกติ 1 เทิร์น
const SHOP_ARMOR_PRICE = 3;
const SHOP_ARMOR_AMOUNT = 1;     // ยาฟื้นเกราะ: ฟื้นเกราะ +1 หน่วย
const SHOP_CARD_REMOVE_PRICE = 5; // ยาลดไพ่: ลดไพ่ใบล่าสุดของตัวเองออก 1 ใบ (กันแตกได้)
const SHOP_SKILL_SIZES = [
  { size: "small", amount: 1, price: 2, weight: 50 },   // สัดส่วนภายในกลุ่ม "ยาฟื้นแต้มสกิล"
  { size: "medium", amount: 4, price: 6, weight: 35 },
  { size: "large", amount: 6, price: 10, weight: 15 },
];
// ---------- ปืนหน่วย GUTS Select (เดิมอยู่ร้านลุงเท่ง — ยุบรวมเข้าร้านค้ามายาแล้ว) ----------
// ปืนเป็นไอเทมถาวร (มีได้กระบอกเดียว) กระสุนซื้อแยกอิสระ แต่ยิงไม่ได้ถ้าไม่มีปืน — ยิงได้ 1 นัด/เทิร์น ช่วงจั่วไพ่เท่านั้น
const ITEM_BASE = "/item";
const GUTS_GUN_PRICE = 15;
const GUTS_CHAA_TURNS = 2;       // Thunder Bullet: สภาพชาคงอยู่ 2 เทิร์น
const GUTS_NURSE_DMG = 4;         // Nursedessei Cannon: ดาเมจ (ลดเกราะก่อน)
const GUTS_AMMO = {
  shockwave: { id: "shockwave", name: "Shockwave Bullet",   price: 5,  img: `${ITEM_BASE}/guts_key/gomora_key.webp`,    cut: "gutsShockwave" },
  gargorgon: { id: "gargorgon", name: "Gargorgon Ray",      price: 5,  img: `${ITEM_BASE}/guts_key/gargorgon_key.webp`, cut: "gutsGargorgon" },
  thunder:   { id: "thunder",   name: "Thunder Bullet",     price: 5,  img: `${ITEM_BASE}/guts_key/eleking_key.webp`,   cut: "gutsThunder" },
  nurse:     { id: "nurse",     name: "Nursedessei Cannon", price: 10, img: `${ITEM_BASE}/guts_key/nurse_key.webp`,     cut: "gutsNurse", breaksGun: true },
};
const GUTS_AMMO_IDS = Object.keys(GUTS_AMMO);
const SHOP_MAX_GUNS = 2;          // ปืนขึ้นได้สูงสุด 2 กระบอกต่อรอบที่ร้านรีสต็อก (ที่เกินสุ่มเป็นกระสุนแทน)
const SHOP_MAX_MARK42 = 2;        // เกราะ Mark 42: โอกาสออก/เพดานต่อรอบเท่าปืน GUTS (ที่เกินสุ่มเป็นกระสุนแทน)
// น้ำหนักกระสุนธรรมดาภายในกลุ่ม "กระสุน" (รวม = SHOP_WEIGHTS.gutsAmmo)
const SHOP_AMMO_WEIGHTS = { shockwave: 4, gargorgon: 4, thunder: 4, nurse: 2 };
// ตารางโอกาสออกสินค้าต่อ 1 ช่องสุ่ม (รวม 97)
const SHOP_WEIGHTS = {
  cardColor: 15,
  fortune: 5,      // หายากสุด
  resist: 15,
  cardRemove: 12,
  skillPoint: 14,  // แตกย่อยตาม SHOP_SKILL_SIZES.weight
  armor: 14,
  gutsGun: 8,      // จำกัด SHOP_MAX_GUNS ต่อรอบ ที่เกินตกไปรวมกับกระสุน
  gutsAmmo: 14,    // แตกย่อยตาม SHOP_AMMO_WEIGHTS
  mark42: 8,       // เกราะ Mark 42: เจอได้พอๆ กับปืน จำกัด SHOP_MAX_MARK42 ต่อรอบ
};
const TEMP_HP_TURNS = 2; // เลือดชั่วคราว หายเองภายใน 2 เทิร์น

// ---------- ระบบกลางวัน/กลางคืน (patch 1.7 / ปรับเวลา+โบนัส patch 2.1.7) ----------
//  เริ่มเกมเป็นกลางวันเสมอ สลับทุก 5 เทิร์น: รอบ 1-5 กลางวัน, 6-10 กลางคืน, 11-15 กลางวัน, ...
//  จบเทิร์นกลางวัน = ทุกคนได้แต้มสกิลเพิ่ม +1 แต่แจกเฉพาะเช้าที่ 2, 4, 6, ... (เช้าที่ 1, 3, 5, ... ไม่มีโบนัส — ดู morningBonusActive)
//  กลางคืน = สุ่มสกิลพื้นฐาน/สกิลรองของแต่ละคนแพงขึ้น +1 ทุกเทิร์น (ดู nightTaxTier) — เกราะฟื้นทุก 2 เทิร์นเหมือนกันทั้งวัน/คืน
const CYCLE_TURNS = 5;

// การแปลงร่าง/cutscene ต่อสถานะ — ตาราง data ล้วนๆ ~160 บรรทัด ย้ายไป characters/_transforms.js แล้ว
const TRANSFORMS = require("../characters/_transforms")();

// ฉากแผนที่การเดินทาง (characters/_journey.js): server พักเกมในเฟส CUTSCENE (ไม่มีคลิป) ให้ทุกคนดูพร้อมกัน
//  start = หลังฉากเปิดตัวผู้เล่นตอนเริ่มเกม · advance = ก่อนเข้าเทิร์นแรกของภูมิภาคใหม่ (11, 21, …, 61)
//  ความยาวฝั่ง client: start 7 วิ · advance 6 วิ (+1 วิเผื่อเน็ตหน่วง) — เทสต์ย่อได้ผ่าน env
//  start เริ่มตั้งแต่ฉากเปิดตัว "เริ่มปิดฉาก" (1 วิสุดท้ายของ gameIntroHoldSeconds + ส่วนเผื่อ ~1 วิ) จึงบวกเพิ่มแค่ 6 วิ
const JOURNEY_START_SECONDS = Math.max(0, Number(process.env.JOURNEY_START_SECONDS ?? 6));
const JOURNEY_ADVANCE_SECONDS = Math.max(0, Number(process.env.JOURNEY_ADVANCE_SECONDS ?? 7));
const TEAM_IDS = ["A", "B", "C"];

const RESYNC_EVERY = 10; // ทุกกี่วินาทีถึงจะ broadcast state ตัวเต็ม (นอกนั้นส่งแค่ "tick")

module.exports = {
  SKILL_COST_MAX, MAX_PLAYERS, CARD_TIME, OVERLOAD_FORCE_CHANCE, OVERLOAD_FORCE_CUTSCENE_SECONDS,
  ORDER_TIME, ACTION_TIME, DEFAULT_MOV, DEFAULT_RANGE, TRANSITION_TIME, RECONNECT_GRACE_MS, RESERVATION_TTL_MS,
  ATTACKFX_TIME, MAX_HP, MAX_ARMOR, MAX_SKILL, GOLD_MAX, GOLD_PER_TURN, GOLD_FIRST_BONUS,
  SHOP_INTERVAL_TURNS, SHOP_MAX_ITEMS, SHOP_CARD_COLOR_PRICE, SHOP_FORTUNE_PRICE,
  SHOP_FORTUNE_AMOUNT, FORTUNE_MAX, SHOP_RESIST_PRICE, SHOP_RESIST_TURNS, SHOP_ARMOR_PRICE, SHOP_ARMOR_AMOUNT,
  SHOP_CARD_REMOVE_PRICE, SHOP_SKILL_SIZES, ITEM_BASE, GUTS_GUN_PRICE, GUTS_CHAA_TURNS,
  GUTS_NURSE_DMG, GUTS_AMMO, GUTS_AMMO_IDS, SHOP_MAX_GUNS, SHOP_MAX_MARK42, SHOP_AMMO_WEIGHTS,
  SHOP_WEIGHTS, TEMP_HP_TURNS, CYCLE_TURNS, TRANSFORMS, JOURNEY_START_SECONDS, JOURNEY_ADVANCE_SECONDS,
  TEAM_IDS, RESYNC_EVERY,
};
