// Road Trip: รถตู้ — ค่าสถานะ/อัปเกรด/ของแต่ง/ตัวกรองข้อมูลจากผู้เล่น (contract §3)
//  อัปเกรดรีเซ็ตทุกรอบเล่น (match.roadtrip ถูกสร้างใหม่ทุกแมตช์) · ของแต่งฟรีทั้งหมด (v1) ไม่มีผลค่าสถานะ
const { priceOf } = require("./diff");

const UPG_KEYS = ["body", "engine", "tank", "susp", "nitro", "turret", "bumper", "storage"];
const MAX_LV = 3;
const TABLE = {
  body: [20, 30, 40, 55],        // HP รถ
  engine: [100, 115, 130, 150],  // กม./ชม.
  tank: [40, 60, 80, 100],       // ลิตร
  susp: [1, 1.3, 1.6, 2],        // เกาะถนน (เปลี่ยนเลนไว)
  nitro: [0, 1, 2, 3],           // จำนวนครั้งที่บูสต์ได้ต่อจุดพัก
  turret: [0, 1, 2, 3],          // ดาเมจป้อมปืนต่อรอบ
  bumper: [0, 1, 2, 3],          // ลดดาเมจชน / ดาเมจกันชน
  storage: [0, 1, 2, 3],         // ช่องกระเป๋าเพิ่ม (ไม่เกิน BAG_CAP)
};
const UPG_COST = [6, 10, 16]; // ขั้น 1/2/3 × ราคาความยาก
const BAG_CAP = 8;
const STYLES = ["normal", "goofy", "cool"];
const DECOR = [
  "ไฟหลังคา", "แร็คหลังคา", "ธง", "ตุ๊กตาหน้ารถ", "ลายไฟ", "ลายดอกไม้", "หน้ายิ้ม", "ขนตา", "หูแมว", "เขากวาง",
  "ครีบฉลาม", "ล้อแม็กทอง", "ท่อคู่", "ไฟใต้ท้อง", "ป้ายหลังคา", "ลูกโป่ง", "ไฟประดับนอก", "เซิร์ฟบอร์ด", "กันชนกันวัว", "บังแดดกระจกหน้า",
];
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const PLATE_MAX = 9;
// ทะเบียน: อักษรไทย/ละติน/ตัวเลข/ช่องว่าง/ขีด ไม่เกิน 9 ตัว (ตัดอักขระควบคุมและอย่างอื่นทิ้ง)
function cleanPlate(text) {
  if (typeof text !== "string") return null;
  const s = text.normalize("NFC").replace(/[^฀-๿A-Za-z0-9 \-]/g, "").replace(/\s+/g, " ").trim();
  return [...s].slice(0, PLATE_MAX).join("").trim();
}
function cleanHex(hex) { return typeof hex === "string" && HEX_RE.test(hex) ? hex.toLowerCase() : null; }

function newVan() {
  const upg = Object.fromEntries(UPG_KEYS.map((k) => [k, 0]));
  return {
    hp: TABLE.body[0], hpMax: TABLE.body[0], fuel: TABLE.tank[0], fuelMax: TABLE.tank[0],
    kmh: TABLE.engine[0], lane: 0, driverId: null, nitro: 0, nitroOn: false,
    style: "normal", paint: "#e8b04a", plate: "ECHO 01", decor: [], upg, rearOpen: false,
  };
}
const statOf = (van, key) => TABLE[key][Math.max(0, Math.min(MAX_LV, (van.upg && van.upg[key]) | 0))];
function upgCost(rt, key) {
  const lv = rt.van.upg[key] | 0;
  return lv >= MAX_LV ? null : priceOf(rt, UPG_COST[lv]);
}
// อัปเกรดขั้นถัดไป (ผู้เรียกเช็ค/หักเงินแล้ว) → ขั้นใหม่
function applyUpgrade(van, key) {
  const lv = (van.upg[key] | 0) + 1;
  van.upg[key] = lv;
  if (key === "body") { const add = TABLE.body[lv] - TABLE.body[lv - 1]; van.hpMax += add; van.hp = Math.min(van.hpMax, van.hp + add); }
  if (key === "tank") { const add = TABLE.tank[lv] - TABLE.tank[lv - 1]; van.fuelMax += add; van.fuel = Math.min(van.fuelMax, van.fuel + add); }
  if (key === "engine") van.kmh = TABLE.engine[lv];
  if (key === "nitro") van.nitro += 1;
  return lv;
}
const bagBonus = (van) => statOf(van, "storage");
module.exports = { UPG_KEYS, MAX_LV, TABLE, UPG_COST, BAG_CAP, STYLES, DECOR, HEX_RE, PLATE_MAX, cleanPlate, cleanHex, newVan, statOf, upgCost, applyUpgrade, bagBonus };
