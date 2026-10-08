const SHOP_ITEM_INFO = {
  fortune: { icon: "🍀", label: () => "ยาโชคลาภ", desc: "ได้รับโชคลาภ +2 หน่วย — จั่วครั้งถัดไปจะปรับไพ่ที่จั่วให้แต้มรวมตกช่วง 19-21 ทันที แล้วหน่วยนั้นหายไป" },
  resist: { icon: "🛡️", label: () => "ยาต้านสถานะ", desc: "ต้านสถานะผิดปกติทุกประเภท 1 เทิร์น (ป้องกันล่วงหน้าเท่านั้น ไม่ใช่ยารักษา)" },
  skillPoint: { icon: "⚡", label: (it) => `ยาฟื้นแต้มสกิล +${it.value}`, desc: "ฟื้นแต้มสกิลทันที (เกินเพดานจะหายทิ้งส่วนที่เกิน)" },
  armor: { icon: "🔧", label: (it) => `ยาฟื้นเกราะ +${it.value}`, desc: "ฟื้นเกราะทันที" },
  // ---------- ปืนหน่วย GUTS Select + กระสุน (ขายในร้านค้ามายา — ใช้รูปจริงแทน emoji) ----------
  gutsGun: { icon: "🔫", img: "/item/guts_select_gun/guts_gun.webp", label: () => "ปืนหน่วย GUTS Select", desc: "ไอเทมถาวร มีได้กระบอกเดียว · ยิงระยะ 1–4 ช่อง · ยิง = การโจมตีของตา (จบตา · เป้าสวนกลับได้ถ้าเราอยู่ในระยะของเป้า)" },
  // เกราะ Mark 42 (ใครก็ใส่ได้) — ตรงกับ characters/_mark42.js
  mark42: { icon: "🦾", img: "/characters/Mark42/mark42_item.jpg", label: (it) => `เกราะ Mark 42${it.armor && it.armor < 7 ? ` (${it.armor}/7)` : ""}`, desc: "ใส่ให้ตัวเอง / ใส่ให้คนที่ยืนติดกัน / ใส่ให้แล้วระเบิดทันที (ความเสียหาย 2) — เกราะชุด 7 หน่วยแทนพลังชีวิต พลังโจมตี +1 · เจ้าของเรียกคืน (ต้องยืนติดกัน) / ถอด / สั่งระเบิด (สั่งจากไกลได้) · ชุดพังจากการต่อสู้ ซื้อใหม่ไม่ได้ 10 เทิร์น" },
  gutsAmmo: {
    icon: "🔑",
    imgOf: (it) => GUTS_AMMO_INFO[it.ammo]?.img,
    label: (it) => GUTS_AMMO_INFO[it.ammo]?.name || "กระสุน",
    descOf: (it) => GUTS_AMMO_INFO[it.ammo]?.desc || "",
  },
};
// ข้อมูลกระสุนฝั่ง client (ชื่อ/รูปคีย์/คำอธิบาย) — ต้องตรงกับ GUTS_AMMO ใน server.js
export const GUTS_AMMO_INFO = {
  shockwave: { name: "Shockwave Bullet",   img: "/item/guts_key/gomora_key.webp",    video: "/item/guts_key/shockwave_boost.mp4",    desc: "ทำลายเกราะของเป้าหมายทั้งหมด แต่ไม่สร้างความเสียหายให้พลังชีวิตจริง" },
  gargorgon: { name: "Gargorgon Ray",      img: "/item/guts_key/gargorgon_key.webp", video: "/item/guts_key/gargorgon_ray.mp4",      desc: "เทิร์นถัดไปเป้าหมายติดสถานะสตั้น 1 เทิร์น (จั่วการ์ด/กดสกิลไม่ได้) — ต้านทานได้" },
  thunder:   { name: "Thunder Bullet",     img: "/item/guts_key/eleking_key.webp",   video: "/item/guts_key/thunder_boost.mp4",      desc: "เป้าหมายติดสถานะ [สภาพชา] 2 เทิร์น — กดจั่ว 1 ครั้งได้ไพ่ 2 ใบ — ต้านทานได้" },
  nurse:     { name: "Nursedessei Cannon", img: "/item/guts_key/nurse_key.webp",     video: "/item/guts_key/nursedessei_cannon.mp4", desc: "ความเสียหาย 4 หน่วย (ลดเกราะก่อน) — ปืน GUTS Select จะพัง" },
};

export function shopInfoOf(it) {
  const base = SHOP_ITEM_INFO[it.type] || { icon: "✦", label: () => "สินค้า", desc: "" };
  // imgOf/descOf: ไอเทมที่หน้าตา/คำอธิบายขึ้นกับข้อมูลในตัวไอเทมเอง (กระสุนแต่ละแบบ)
  return { ...base, img: base.imgOf ? base.imgOf(it) : base.img, desc: base.descOf ? base.descOf(it) : base.desc };
}
