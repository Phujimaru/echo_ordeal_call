// Nautilus ชั้น 3 "ปล่องภูเขาไฟใต้ทะเล" −1,000 ม. (area 48 · GRID_PLAN §8.9) — ผังกระดาน + ชนิดช่องใหม่ (ข้อมูลล้วน · ดู server/fodlan/README.md · กติกา server/fodlan/stage9.js · ลูกเล่น ntVents.js)
//  พื้นทะเลภูเขาไฟจริง แบ่งโซนภูมิศาสตร์ (ภาพ client/src/board/fodlan/vents.js) — ชั้นแรกที่มืด (เห็นแค่ระยะเดิน + ทีม + แสงลาวา):
//   ตะวันตกเฉียงเหนือ = ที่ราบบะซอลต์เย็น (C เสาหินบะซอลต์หกเหลี่ยม · ฟองอากาศ h) + หินลาวาค้างขอบที่ราบ (o)
//   เหนือกลาง        = ท่าจอดเรือ Nautilus (N 6×2 — เรือจอด = ร้านค้า/เติมอากาศ)
//   ตะวันออกเฉียงเหนือ = ทุ่งปล่องควันดำ (V) ล้อมด้วยดงหนอนท่อ (w ซ่อนตัว/หลบหลีก) ที่กินความร้อนจากปล่อง
//   กลาง             = แอ่งปากปล่อง (caldera): ทะเลสาบลาวา (L) · รอยแยกลาวาเรือง (f) แผ่ออกเป็นแฉก · หินลาวาบนขอบแอ่ง (o)
//   ตะวันตก          = สันลาวาหมอน (P) เป็นแนวเฉียง มีช่องผ่าน · ปล่องควันดำโดดเดี่ยว
//   ตะวันออก         = ปล่องแรงดัน (p) บนพื้นหินร้อน + ปล่องควันดำ
//   ตะวันตกเฉียงใต้   = ลาดเถ้าภูเขาไฟ (a เดิน 2 ก้าว)
//   ใต้กลาง          = รอยแยกใหญ่ลากจากแอ่งลงขอบใต้ (f) + ปล่องควันดำในดงหนอนท่อ
//   ตะวันออกเฉียงใต้   = หลุมยุบ (H — ผลัก/ตกลง = ดาเมจ + ออกซิเจนหาย) + ลาวาหมอน
//  ร้านค้า = เรือ Nautilus ที่ท่าจอด · shopSpots ว่าง
//   x  01234567890123456789
const ROWS = [
  "CC.C...NNNNNN..w.ww.", // y0   ที่ราบบะซอลต์ · ท่าจอด · ทุ่งปล่องควันดำ
  "C..S...NNNNNN.S.wVw.", // y1
  "CC...h.........w.ww.", // y2   ฟองอากาศบนที่ราบ
  "C.....o.......wVw...", // y3   หินลาวาขอบที่ราบ
  "PP...........f.w....", // y4
  "PP..S..ff..o.ff.w..S", // y5   ขอบแอ่งเหนือ
  ".P.P..ffLLf.f.....p.", // y6   ทะเลสาบลาวา · ปล่องแรงดัน
  "..P..ffLLLLf..Vw....", // y7
  "S.P.V.fLLLLffow.p...", // y8
  "..P.wo.fLLf...ww..V.", // y9
  ".PPwww..ff.f...h.www", // y10  ฟองอากาศตะวันออก
  "aa...w...f..f..p..w.", // y11  ลาดเถ้า
  "aaa..p...f.f..HH...P", // y12  หลุมยุบ
  "aaaa.....fwVw.HHH.PP", // y13
  "aaaaa..S.f.w...HH.SP", // y14
  "aaaaaa...f.........P", // y15  รอยแยกออกขอบใต้
];
const at = (...chs) => {
  const out = [];
  ROWS.forEach((row, y) => [...row].forEach((c, x) => { if (chs.includes(c)) out.push([x, y]); }));
  return out;
};

module.exports = {
  map: {
    cols: 20, rows: 16,
    terrain: { fd_nt_vent: at("V"), fd_nt_column: at("C"), fd_nt_pillow: at("P"), fd_nt_lava: at("L"), fd_nt_pit: at("H") },
    special: { fd_nt_fissure: at("f"), fd_nt_tubeworm: at("w"), fd_nt_ash: at("a"), fd_nt_pvent: at("p") },
    heal: at("h"), healKind: "fd_nt_bubble",
    spawns: at("S"),
    shopSpots: [],
  },
  TERRAIN: {
    fd_nt_vent: { name: "ปล่องควันดำ", icon: "🌋" },
    fd_nt_column: { name: "เสาบะซอลต์", icon: "🪨" },
    fd_nt_pillow: { name: "ลาวาหมอน", icon: "🪨" },
    fd_nt_lava: { name: "ทะเลสาบลาวา", icon: "🔥" },
    fd_nt_pit: { name: "หลุมยุบ", icon: "🕳️" },
    fd_nt_crack: { name: "รอยแยกยุบ", icon: "🕳️" },
    fd_nt_lavarock: { name: "หินลาวา", icon: "☄️" },
    fd_nt_fissure: { name: "รอยแยกลาวา", icon: "🔥", desc: "จบตา ลุกไหม้ 1" },
    fd_nt_tubeworm: { name: "ดงหนอนท่อ", icon: "🪱", desc: "หลบหลีก +20% · ซ่อนตัว", evade: 20, bush: true },
    fd_nt_ash: { name: "ลาดเถ้า", icon: "🌫️", desc: "เดิน 2 ก้าว", cost: 2 },
    fd_nt_pvent: { name: "ปล่องแรงดัน", icon: "💨" },
    fd_nt_bubble: { name: "ฟองอากาศ", icon: "🫧", desc: "จบตา ฟื้นพลังชีวิต +1" },
    fd_nt_whale: { name: "ทาลัสซา", icon: "🐋" },
  },
  // ท่าจอดเรือ Nautilus (ขั้น 3): มุมบนซ้าย + ขนาด
  DOCK: { x: 7, y: 0, w: 6, h: 2 },
};
