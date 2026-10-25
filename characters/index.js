// ============================================================
// Character hook bundle used by server/ as CHAR_HOOKS[characterId].
// ตัวละครใหม่ต้อง require แล้วต่อท้าย CHARACTER_MODULES ที่นี่
// ============================================================

const muimi = require("./muimi"); // มุยมิ — ระดับง่าย
const oberon_summer = require("./oberon_summer"); // โอเบรอน (ฤดูร้อน) — ระดับกลาง
const sliver_bullet = require("./sliver_bullet"); // นักบินปริศนา — ระดับง่าย · unique
const echo = require("./echo"); // Echo — พิเศษ (ขยายร่างบนกระดาน)
const sora_otosumi = require("./sora_otosumi"); // โซระ โอโตสุมิ — ระดับง่าย (แปลงร่าง My-Th)
const raido_hikaru = require("./raido_hikaru"); // ไรโด ฮิคารุ — ระดับกลาง (UltraLive / Ultraman Ginga)
const ice_spike = require("./ice_spike"); // Ice Spike — ระดับยาก (ธารน้ำแข็ง / ไถลชน / หนามน้ำแข็ง)
const { kate, emiliko } = require("./kate_emiliko"); // เคท & เอมิลิโกะ — ระดับยาก (ผู้เล่น 1 คนคุม 2 ตัว — server/duo.js)
const kira = require("./kira"); // กิระ (ราชาแมลงอวกาศ) — ระดับง่าย (สวมเกราะราชัน / คลื่นความมืด / อัฐิราชา)
const yuna = require("./yuna"); // เด็กสาวเสื้อคลุมขาว (ยูนะ) — พิเศษ (วงเพลง / ศพค้าง / ขี่ผู้เล่นอื่น — server/ride.js)
const gray = require("./gray"); // เกรย์ — ระดับกลาง (คนเฝ้าสุสาน / Grave / รองโกมิเนียต ชาร์จ 2 เทิร์น / เก็บศพ)
const gyro_zeppeli = require("./gyro_zeppeli"); // ไจโร เซปเปลี่ — ระดับยาก (ลูกเหล็ก 2 ลูก / ม้าวาลคิรี / สัดส่วนทองคำ)
const diego_alt = require("./diego_alt"); // ดิเอโก้ แบรนโด (โลกคู่ขนาน) — ระดับยาก (คลังเครื่องมือ / ปืนลูกโม่ / เดอะเวิลด์ หยุดเวลา / ม้าซิลเวอร์ บูลเล็ต)
const fern = require("./fern"); // เฟิร์น — ระดับกลาง (Zoltraak แนวตรง / Energy 10 / ครั้งที่ 6 ทะลุเกราะ + รีเซ็ทคูลดาวน์ / ท่าไม้ตายซ่อนเร้นมานา)
const funny_valentine = require("./funny_valentine"); // ฟันนี่ วาเลนไทน์ — พิเศษ · unique (หลบสายตา ชั้นมิติ / ปืน / กระดานคู่ขนาน · ร่างแยก · ตัวที่เหมือนกัน — server/dimension.js + server/summon.js)
const celine = require("./celine"); // องค์หญิงดอกไม้ เซลิน — พิเศษ (คฑา 4 แบบ / อาวุธ 6 แบบ / พุ่มดอกไม้ server/flora.js / ราชาดอกไม้)
const takuto = require("./takuto"); // ซึนาชิ ทาคุโตะ — พิเศษ · unique (ร่างคน/ทาวเบิร์น 3×3 · ดาบ 2 เล่ม · ห่วงเวลาซีโร่ + ช่วงมิติพังทลาย — server/zeroTime.js)
const ryougi = require("./ryougi"); // ผู้นำแห่งตระกูลเรียวกิ — มหันตภัย · unique (ฟันแนว 2 ช่อง / เนตรมณะ / ตัดผลสกิล server/sever.js / ช่องพัง terrain "chasm")
const emiya_shirou = require("./emiya_shirou"); // เอมิยะ ชิโร่ — ยาก (Trace On อาวุธ 5 แบบ / สกิลรองตามอาวุธ / Unlimited Blade Works)
const kensaki_kazuma = require("./kensaki_kazuma"); // เคนซากิ คาซุมะ — ยาก (ร่างมนุษย์/Blade / Blay Rouzer การ์ด 9 ใบ / Rouze ท่า Lightning)
const Status = require("./_universal_status");

// ลำดับในรายการนี้ = ลำดับที่ engine กระจายฮุคแบบ broadcast (resetCombat / onRoundStartTick / onEndTurn / onDeath — combat.broadcastHook)
//  โอเบรอนมาก่อนมุยมิ และโซระมาก่อน Echo ตามลำดับที่ server/ เคยเรียกตรงๆ — ตัวใหม่ต่อท้ายได้เลย
const CHARACTER_MODULES = [
  oberon_summer,
  muimi,
  sliver_bullet,
  sora_otosumi,
  echo,
  raido_hikaru,
  ice_spike,
  kate,
  emiliko,
  kira,
  yuna,
  gray,
  gyro_zeppeli,
  diego_alt,
  fern,
  funny_valentine,
  celine,
  takuto,
  ryougi,
  emiya_shirou,
  kensaki_kazuma,
];

const CHAR_HOOKS = {};
for (const mod of CHARACTER_MODULES) CHAR_HOOKS[mod.id] = mod;
// รายการตามลำดับ (ไม่ enumerable — CHAR_HOOKS ยังเป็นแผนที่ id → โมดูลล้วนๆ)
// "แม่นยำ" จากออร่า (ฮุค auraAccurate(p)) — _universal_status.accurateActive ถามทุกแหล่ง
for (const mod of CHARACTER_MODULES) if (typeof mod.auraAccurate === "function") Status.addAccurateSource((p) => mod.auraAccurate(p));
Object.defineProperty(CHAR_HOOKS, "MODULES", { value: Object.freeze(CHARACTER_MODULES.slice()) });

module.exports = CHAR_HOOKS;
