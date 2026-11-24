// ============================================================
//  แปลงร่างไก่ / นก — สถานะกลาง (น้ำยาแปลงร่างของ Ophy · GRID_PLAN §7.43 · GAME_SYSTEM §67)
//   ไก่ (statuses.chicken — ดีบัฟ · โดนยิงใส่): เลือด/เกราะคงเดิม · เดิน 3 · ไม่มีสกิล & สกิลติดตัว · ตีปกติประชิด 1 หน่วย
//   นก (statuses.bird — ดื่มเอง): เลือด/เกราะคงเดิม · เดิน 6 · ไม่มีสกิล & สกิลติดตัว · ตีปกติไม่ได้ · ใช้ไอเทมได้
//        บินข้ามสิ่งกีดขวาง (action.flies) · ได้หลบหลีก 1 เทิร์นตอนแปลง
//  ใครก็ติดได้ (ไม่ผูกกับตัวละคร) — จุดที่เช็ค: action.baseMovOf / rangeOf / flies · skills.useSkill · passiveSeal (ไม่มีสกิลติดตัว)
//   · attack.strike (ไก่ตี 1 ตายตัว) · view (ภาพบนกระดาน)
//  ไฟล์นี้ไม่ require อะไร — require ได้จากทุกที่โดยไม่วน
// ============================================================
const FORMS = {
  chicken: { name: "ไก่", mov: 3, range: [1, 1], strike: 1, img: "/characters/ophy/chicken.webp" },
  bird: { name: "นก", mov: 6, range: [1, 0], strike: 0, img: "/characters/ophy/bird.webp", flies: true },
};
function of(p) {
  const st = p && p.statuses;
  if (!st) return null;
  if ((st.bird || 0) > 0) return "bird";
  if ((st.chicken || 0) > 0) return "chicken";
  return null;
}
const info = (p) => FORMS[of(p)] || null;
const mov = (p) => { const f = info(p); return f ? f.mov : null; };
const range = (p) => { const f = info(p); return f ? f.range : null; };
const flies = (p) => { const f = info(p); return !!(f && f.flies); };
const noSkill = (p) => !!of(p);
const img = (p) => { const f = info(p); return f ? f.img : null; };
// ไก่ตีปกติ = 1 ตายตัว (ไม่รับบัฟ) · ไม่ใช่ไก่ = null
const strikeDamage = (p) => (of(p) === "chicken" ? FORMS.chicken.strike : null);

module.exports = { FORMS, of, info, mov, range, flies, noSkill, img, strikeDamage };
