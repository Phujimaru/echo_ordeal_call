// เกราะชุด Mark 42 เต็ม (characters/_mark42.js SUIT_ARMOR)
export const MARK42_ARMOR = 3;

const SHOP_ITEM_INFO = {
  // ไอเทมช่วงจั่วไพ่ (ยาโชคลาภ · ยาเปลี่ยนสีการ์ด) ใช้จากกล่องหกเหลี่ยมข้างปุ่มจั่ว — กระเป๋าไม่มีปุ่มใช้
  cardColor: { icon: "🎨", label: () => "ยาเปลี่ยนสีการ์ด", short: "เปลี่ยนสีการ์ด 1 ใบ", desc: "ช่วงจั่วไพ่: เลือกการ์ดเลข 1 ใบในมือ แล้วเปลี่ยนเป็นสีที่ต้องการ" },
  fortune: { icon: "🍀", label: () => "ยาโชคลาภ", short: "จั่วถัดไปได้ 19–21", desc: "ได้รับโชคลาภ +2 หน่วย — จั่วครั้งถัดไปจะปรับไพ่ที่จั่วให้แต้มรวมตกช่วง 19-21 ทันที แล้วหน่วยนั้นหายไป" },
  resist: { icon: "🛡️", label: () => "ยาต้านสถานะ", short: "กันสถานะ 1 เทิร์น", desc: "ต้านสถานะผิดปกติทุกประเภท 1 เทิร์น (ป้องกันล่วงหน้าเท่านั้น ไม่ใช่ยารักษา)" },
  skillPoint: { icon: "⚡", label: (it) => `ยาฟื้นแต้มสกิล +${it.value}`, short: "ฟื้นแต้มสกิล", desc: "ฟื้นแต้มสกิลทันที (เกินเพดานจะหายทิ้งส่วนที่เกิน)" },
  armor: { icon: "🔧", label: (it) => `ยาฟื้นเกราะ +${it.value}`, short: "ฟื้นเกราะ", desc: "ฟื้นเกราะทันที" },
  // คบเพลิง — ขายเฉพาะ Fodlan ด่าน II เรเมียร์ (server/fodlan/stage2.js · ป่าหมอก)
  torch: { icon: "🔥", label: () => "คบเพลิง", short: "มองทะลุหมอก 4 ช่อง", desc: "ปักบนช่องที่ยืน — ทุกคนมองทะลุหมอกรอบคบเพลิง 4 ช่อง (นับแบบการเดิน) จนเปลี่ยนแผนที่ · ศัตรูตีดับได้" },
  // ขนมปัง — ของประจำตัวเอมิลิโกะ (เคท & เอมิลิโกะ · ไม่กินช่องกระเป๋า · ทิ้งไม่ได้)
  kebread: { icon: "🍞", img: "/characters/kate_emiliko/bread.jpg", label: (it) => `ขนมปัง ×${it.uses ?? 0}`, short: "พลังชีวิต +2 · เกราะ +1", desc: "เอมิลิโกะกินเอง หรือป้อนเคทที่ยืนติดกัน — ฟื้นพลังชีวิต 2 และเกราะ 1 · ใช้แล้วเอมิลิโกะเดินต่อและโจมตีไม่ได้ในตานี้" },
  // หัวใจ — ท่าไม้ตาย Mess ของทราฟาก้า ลอว์ (กินช่องกระเป๋า · ใช้ = บีบ · ทิ้ง = คืนเจ้าของ · ready = เทิร์นนี้ยังไม่ได้บีบดวงนี้)
  lawHeart: { icon: "🫀", label: (it) => `หัวใจ · ${it.targetName || "?"}`, shortOf: (it) => `ความเสียหาย 2 · ${it.uses ?? 0}/3`, desc: "บีบหัวใจ: เจ้าของหัวใจเสียหาย 2 (เกราะรับก่อน) ไม่ว่าอยู่ไกลแค่ไหน · ดวงละ 1 ครั้งต่อเทิร์น · ใช้แล้วเดินไม่ได้อีก" },
  // ---------- ปืนหน่วย GUTS Select + กระสุน (ขายในร้านค้ามายา — ใช้รูปจริงแทน emoji) ----------
  gutsGun: { icon: "🔫", img: "/item/guts_select_gun/guts_gun.webp", label: () => "ปืนหน่วย GUTS Select", short: "ยิงระยะ 1–4 ช่อง", desc: "ไอเทมถาวร มีได้กระบอกเดียว · ยิงระยะ 1–4 ช่อง · ยิง = การโจมตีของตา (จบตา · เป้าสวนกลับได้ถ้าเราอยู่ในระยะของเป้า)" },
  // เกราะ Mark 42 (ใครก็ใส่ได้) — ตรงกับ characters/_mark42.js (SUIT_ARMOR = MARK42_ARMOR)
  mark42: { icon: "🦾", img: "/characters/Mark42/mark42_item.jpg", label: (it) => `เกราะ Mark 42${it.armor && it.armor < MARK42_ARMOR ? ` (${it.armor}/${MARK42_ARMOR})` : ""}`, short: `เกราะ ${MARK42_ARMOR} · โจมตี +1`, desc: "ใส่ให้ตัวเอง / ใส่ให้คนที่ยืนติดกัน / ใส่ให้แล้วระเบิดทันที (ความเสียหาย 2) — เกราะชุด 3 หน่วยแทนพลังชีวิต พลังโจมตี +1 · เจ้าของเรียกคืน (ต้องยืนติดกัน) / ถอด / สั่งระเบิด (สั่งจากไกลได้) · ชุดพังจากการต่อสู้ ซื้อใหม่ไม่ได้ 10 เทิร์น" },
  gutsAmmo: {
    icon: "🔑",
    imgOf: (it) => GUTS_AMMO_INFO[it.ammo]?.img,
    label: (it) => GUTS_AMMO_INFO[it.ammo]?.name || "กระสุน",
    descOf: (it) => GUTS_AMMO_INFO[it.ammo]?.desc || "",
    shortOf: (it) => GUTS_AMMO_INFO[it.ammo]?.short || "",
  },
};
// ข้อมูลกระสุนฝั่ง client (ชื่อ/รูปคีย์/คำอธิบาย) — ต้องตรงกับ GUTS_AMMO ใน server.js
export const GUTS_AMMO_INFO = {
  shockwave: { name: "Shockwave Bullet",   img: "/item/guts_key/gomora_key.webp",    video: "/item/guts_key/shockwave_boost.mp4",    short: "ทำลายเกราะทั้งหมด", desc: "ทำลายเกราะของเป้าหมายทั้งหมด แต่ไม่สร้างความเสียหายให้พลังชีวิตจริง" },
  gargorgon: { name: "Gargorgon Ray",      img: "/item/guts_key/gargorgon_key.webp", video: "/item/guts_key/gargorgon_ray.mp4",      short: "สตั้น 1 เทิร์น", desc: "เทิร์นถัดไปเป้าหมายติดสถานะสตั้น 1 เทิร์น (จั่วการ์ด/กดสกิลไม่ได้) — ต้านทานได้" },
  thunder:   { name: "Thunder Bullet",     img: "/item/guts_key/eleking_key.webp",   video: "/item/guts_key/thunder_boost.mp4",      short: "สภาพชา 2 เทิร์น", desc: "เป้าหมายติดสถานะ [สภาพชา] 2 เทิร์น — กดจั่ว 1 ครั้งได้ไพ่ 2 ใบ — ต้านทานได้" },
  nurse:     { name: "Nursedessei Cannon", img: "/item/guts_key/nurse_key.webp",     video: "/item/guts_key/nursedessei_cannon.mp4", short: "ดาเมจ 4 · ปืนพัง", desc: "ความเสียหาย 4 หน่วย (ลดเกราะก่อน) — ปืน GUTS Select จะพัง" },
};

export const DRAW_ITEM_TYPES = ["fortune", "cardColor"];

export function shopInfoOf(it) {
  const base = SHOP_ITEM_INFO[it.type] || { icon: "✦", label: () => "สินค้า", desc: "" };
  // imgOf/descOf: ไอเทมที่หน้าตา/คำอธิบายขึ้นกับข้อมูลในตัวไอเทมเอง (กระสุนแต่ละแบบ)
  // short = คำอธิบายย่อ (ร้าน/กระเป๋าแบบใหม่ · กฎ "ไม่มีข้อความอธิบายยาว") · desc = ฉบับเต็ม (ชี้ค้างดูได้)
  return { ...base, img: base.imgOf ? base.imgOf(it) : base.img, desc: base.descOf ? base.descOf(it) : base.desc, short: base.shortOf ? base.shortOf(it) : (base.short || "") };
}
