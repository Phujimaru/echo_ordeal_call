// ค่าคงที่ของเกม (เวลาเฟส/เลือด/ร้านค้า/วงจรวัน-คืน/การเดินทาง)ยังใช้
// เพดานค่าใช้พลังงานของสกิล: ตัวปรับราคา "ขาขึ้น" ทุกชนิด (กลางคืน / ภาระเวท) ดันราคาได้ไม่เกินนี้
//  สกิลที่ราคาแตะเพดานอยู่แล้ว (เช่นท่าไม้ตาย 8) จะไม่ถูกดันให้แพงขึ้นไปอีก — ส่วนกระแสเวทยังลดราคาได้ตามปกติ
const SKILL_COST_MAX = 8;

// ---------- ค่าคงที่ ----------
const MAX_PLAYERS = 7; // patch 2.8: เปิดช่องผู้เล่นที่ 7
const CARD_TIME = 60;
// กระดาน (GRID_PLAN.md): แบนเนอร์ลำดับเดิน · เวลาต่อตาเดิน · ค่าเดิน/ระยะตีตั้งต้นของตัวละครที่ไม่ได้กำหนด
// ORDER: ฉากลำดับเดินเต็มจอฝั่ง client ยาว ~6.5 วิ — ตัวจับเวลาเฟสรับเศษวินาทีได้ (timers.startPhaseTimer)
const ORDER_TIME_MS = 6500;
const ORDER_TIME = ORDER_TIME_MS / 1000;
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
const GOLD_MAX = 100;            // เพดานเหรียญต่อผู้เล่น (เดิม 30 — ผู้ใช้สั่ง 2026-11-08)
const GOLD_PER_TURN = 1;         // เหรียญที่ได้ทุกจบเทิร์น (ทุกคน)
const GOLD_FIRST_BONUS = 1;      // เหรียญเพิ่มให้คนเดินลำดับแรก (รวมกับของทุกคน = 2)
const SHOP_INTERVAL_TURNS = 6;   // ร้านค้าตั้งบนแผนที่ 6 เทิร์น (= AREA_TURNS) แล้วย้ายจุด + สุ่มของใหม่ (GRID_PLAN §8.1)
const BAG_SLOTS = 5;             // กระเป๋า 5 ช่อง — ไอเทมทุกชิ้นกิน 1 ช่อง
const SHOP_CARD_COLOR_PRICE = 5; // ยาเปลี่ยนสีการ์ด: เลือกการ์ดเลข 1 ใบในมือ เปลี่ยนเป็นสีที่ต้องการ (ใช้ช่วงจั่วไพ่)
const SHOP_FORTUNE_PRICE = 5;
const SHOP_FORTUNE_AMOUNT = 2;   // ยาโชคลาภ: ได้โชคลาภ +2 หน่วยเมื่อใช้
const FORTUNE_MAX = 3;           // โชคลาภ ซ้อนทับได้สูงสุด 3 ครั้ง
const SHOP_RESIST_PRICE = 5;
const SHOP_RESIST_TURNS = 2;     // ยาต้านสถานะ: ต้านสถานะผิดปกติ 2 เทิร์น (เดิม 1 — ผู้ใช้สั่ง 2026-11-08)
const SHOP_ARMOR_PRICE = 3;
const SHOP_ARMOR_AMOUNT = 1;     // ยาฟื้นเกราะ: ฟื้นเกราะ +1 หน่วย
const SHOP_CARD_CUT_PRICE = 5;   // กรรไกรตัดไพ่: ตัดไพ่ใบล่าสุดในมือออก คืนเข้ากองกลาง (ไอเทมช่วงจั่ว — ผู้ใช้สั่งคืน 2026-11-08 · เดิมคือยาลดไพ่)
const SHOP_CLEANSE_PRICE = 3;    // ยาล้างสถานะ: ล้างดีบัฟทั้งหมดบนตัว (ผู้ใช้สั่ง 2026-11-08)
const SHOP_BATTERY_PRICE = 15;   // วงจรพลังงาน: ถังเก็บแต้มสกิล ชาร์จเอง +1/เทิร์น เก็บได้ BATTERY_MAX · ถอนออกมาเท่าที่เลือก (ผู้ใช้สั่ง 2026-11-08)
const SHOP_LIFE_CRYSTAL_PRICE = 15;  // ผลึกชีวิต: พลังชีวิตสูงสุด +1 ถาวร (+ ฟื้น 1) — ผู้ใช้สั่ง 2026-11-08
const SHOP_ARMOR_CRYSTAL_PRICE = 15; // ผลึกเกราะ: เกราะสูงสุด +1 ถาวร (+ ฟื้น 1)
const SHOP_WIND_BOOTS_PRICE = 4;     // รองเท้าวายุ: ระยะเดินตานี้ +WIND_BOOTS_MOV (ใช้แล้วยังเดินได้)
const WIND_BOOTS_MOV = 2;
const BATTERY_MAX = 5;
const BATTERY_REGEN = 1;
const SHOP_TORCH_PRICE = 2;      // คบเพลิง (Fodlan ด่าน II เรเมียร์ — server/fodlan/stage2.js): ขายเฉพาะตอนอยู่ด่านนี้ ซื้อได้ไม่จำกัด
const SHOP_PILLAR_WARD_PRICE = 4; // เกราะเสา (สนาม Eos PVE — server/fodlan/eosEvents.js): ขายทุกร้านเฉพาะ Eos ไม่จำกัด
const SHOP_GYSAHL_PRICE = 2;     // ผักกิซาล (สนาม Eos — server/fodlan/stage6.js L9): ขายทุกร้านเฉพาะ Eos ซื้อได้ไม่จำกัด
// ร้านค้ามายา (ผู้ใช้สั่ง 2026-11-08): ของทุกชนิดช่องละ 1 ไม่ซ้ำ — สุ่มจำนวนที่ซื้อได้ต่อช่อง SHOP_STOCK_MIN–MAX (รายการใน server/shop.js shopCatalog)
//  ถอดออกจากเกมแล้ว: เกราะ Mark 42 · ปืน+กระสุน GUTS · ยาฟื้นแต้มสกิล · ไอเทมช่วงจั่ว (ยาโชคลาภ/ยาเปลี่ยนสีการ์ด/กรรไกรตัดไพ่) เปิดกระเป๋าใช้ช่วงจั่ว
const SHOP_STOCK_MIN = 2;
const SHOP_STOCK_MAX = 5;
const TEMP_HP_TURNS = 2; // เลือดชั่วคราว หายเองภายใน 2 เทิร์น

// ---------- ระบบกลางวัน/กลางคืน (patch 1.7 / ปรับเวลา+โบนัส patch 2.1.7) ----------
//  เริ่มเกมเป็นกลางวันเสมอ สลับทุก 3 เทิร์น: รอบ 1-3 กลางวัน, 4-6 กลางคืน, 7-9 กลางวัน, ... (เดิม 5 เทิร์น)
//  จบเทิร์นกลางวัน = ทุกคนได้แต้มสกิลเพิ่ม +1 แต่แจกเฉพาะเช้าที่ 2, 4, 6, ... (เช้าที่ 1, 3, 5, ... ไม่มีโบนัส — ดู morningBonusActive)
//  กลางคืน = สุ่มสกิลพื้นฐาน/สกิลรองของแต่ละคนแพงขึ้น +1 ทุกเทิร์น (ดู nightTaxTier) — เกราะฟื้นทุก 2 เทิร์นเหมือนกันทั้งวัน/คืน
const CYCLE_TURNS = 3;
const EOS_CYCLE_TURNS = 5; // สนาม Eos: กลางวัน/กลางคืนช่วงละ 5 เทิร์น (ผู้ใช้สั่ง 2026-11-09)

// การแปลงร่าง/cutscene ต่อสถานะ — ตาราง data ล้วนๆ ~160 บรรทัด ย้ายไป characters/_transforms.js แล้ว
const TRANSFORMS = require("../characters/_transforms")();

// ฉากแผนที่การเดินทาง (characters/_journey.js): server พักเกมในเฟส CUTSCENE (ไม่มีคลิป) ให้ทุกคนดูพร้อมกัน
//  start = หลังฉากเปิดตัวผู้เล่นตอนเริ่มเกม · advance = ก่อนเข้าเทิร์นแรกของภูมิภาคใหม่ (7, 13, …, 37)
//  ความยาวฝั่ง client: start 7 วิ · advance 8.4 วิ (สุ่ม + เดินทาง · +0.6 วิเผื่อเน็ตหน่วง) — เทสต์ย่อได้ผ่าน env
//  start เริ่มตั้งแต่ฉากเปิดตัว "เริ่มปิดฉาก" (1 วิสุดท้ายของ gameIntroHoldSeconds + ส่วนเผื่อ ~1 วิ) จึงบวกเพิ่มแค่ 6 วิ
const JOURNEY_START_SECONDS = Math.max(0, Number(process.env.JOURNEY_START_SECONDS ?? 6));
const JOURNEY_ADVANCE_SECONDS = Math.max(0, Number(process.env.JOURNEY_ADVANCE_SECONDS ?? 9)); // เดิม 7 — +2 วิ ให้ฉากสุ่มภูมิภาค
// ท่าไม้ตาย Echo "ก่อกำเนิดใหม่": พักเกม (CUTSCENE · journeyScene mode "rebirth") ตามความยาวฉากโลกแตกฝั่ง client (~17 วิ + เผื่อ)
//  ความเสียหาย + เปลี่ยนภูมิภาคลงตอนหมดเวลานี้ (phases/endTurn.js journeyRebirth)
const REBIRTH_SECONDS = 18;
// โหมด Fodlan (GRID_PLAN §8.5): ฉากเข้าแมตช์ 13 วิ (ดิ่งลงหมุด → แผนที่ทวีป → ฉากเข้าด่าน) · ฉากเปลี่ยนด่าน 10 วิ (client fodlan/stages.js) — +1 วิเผื่อเน็ตหน่วง
//  เริ่มฉากตั้งแต่ฉากเปิดตัวผู้เล่น "เริ่มปิดฉาก" แบบเดียวกับ JOURNEY_START_SECONDS · env 0 = ไม่มีฉาก (เทสต์)
const FODLAN_START_SECONDS = Math.max(0, Number(process.env.FODLAN_START_SECONDS ?? process.env.JOURNEY_START_SECONDS ?? 12));
// Eos (GRID_PLAN §8.6): ไม่มีฉากเดินทาง — พักให้ฉากเปิดตัวผู้เล่น + ฉากเข้าสนาม Eos จบ (client eos/eosMeta.js EOS_INTRO_MS 12 วิ: ลูกโลกหมุน/ดิ่งลงหมุด Eos → บินลงกระดานจริง)
//  (0 ตามการตั้งของเทสต์ที่ปิดฉากเดินทาง)
const EOS_START_SECONDS = Math.max(0, Number(process.env.EOS_START_SECONDS ?? (Number(process.env.JOURNEY_START_SECONDS) === 0 ? 0 : 14))); // ฉากเปิด Eos 3 มิติ (eos/eosTheatre.js) 14 วิ
const FODLAN_ADVANCE_SECONDS = Math.max(0, Number(process.env.FODLAN_ADVANCE_SECONDS ?? process.env.JOURNEY_ADVANCE_SECONDS ?? 11));
const TEAM_IDS = ["A", "B", "C"];

const RESYNC_EVERY = 10; // ทุกกี่วินาทีถึงจะ broadcast state ตัวเต็ม (นอกนั้นส่งแค่ "tick")

module.exports = {
  SKILL_COST_MAX, MAX_PLAYERS, CARD_TIME,
  ORDER_TIME_MS, ORDER_TIME, ACTION_TIME, DEFAULT_MOV, DEFAULT_RANGE, TRANSITION_TIME, RECONNECT_GRACE_MS, RESERVATION_TTL_MS,
  ATTACKFX_TIME, MAX_HP, MAX_ARMOR, MAX_SKILL, GOLD_MAX, GOLD_PER_TURN, GOLD_FIRST_BONUS,
  SHOP_INTERVAL_TURNS, BAG_SLOTS, SHOP_STOCK_MIN, SHOP_STOCK_MAX, SHOP_CARD_COLOR_PRICE, SHOP_FORTUNE_PRICE,
  SHOP_FORTUNE_AMOUNT, FORTUNE_MAX, SHOP_RESIST_PRICE, SHOP_RESIST_TURNS, SHOP_ARMOR_PRICE, SHOP_ARMOR_AMOUNT, SHOP_TORCH_PRICE, SHOP_GYSAHL_PRICE, SHOP_PILLAR_WARD_PRICE,
  SHOP_CARD_CUT_PRICE, SHOP_CLEANSE_PRICE, SHOP_BATTERY_PRICE, BATTERY_MAX, BATTERY_REGEN,
  SHOP_LIFE_CRYSTAL_PRICE, SHOP_ARMOR_CRYSTAL_PRICE, SHOP_WIND_BOOTS_PRICE, WIND_BOOTS_MOV,
  TEMP_HP_TURNS, CYCLE_TURNS, EOS_CYCLE_TURNS, TRANSFORMS, JOURNEY_START_SECONDS, JOURNEY_ADVANCE_SECONDS,
  REBIRTH_SECONDS, FODLAN_START_SECONDS, EOS_START_SECONDS, FODLAN_ADVANCE_SECONDS, TEAM_IDS, RESYNC_EVERY,
};
