// Nautilus ชั้น 4 "นครจมบาดาล" −3,000 ม. (area 49 · GRID_PLAN §8.9) — ผังกระดาน + ชนิดช่องใหม่ (ข้อมูลล้วน · ดู server/fodlan/README.md · กติกา server/fodlan/stage10.js + ntCity.js)
//  ผู้ใช้สั่ง 2026-11-19: "ต้องเป็นภูมิประเทศจริง ไม่ใช่เอาของชิ้นเดิมวางกระจาย" → นครหินที่จมทั้งเมือง แบ่งโซนจริง (ภาพ client/src/board/fodlan/city.js):
//   เหนือ    = ท่าจอดเรือ Nautilus (N 6×2) ปลายถนนเสาเรียงสายเหนือ (P เสาหิน · X แผ่นกดกับดัก) · ท่อส่งน้ำโบราณพาดตะวันออก–ตะวันตก
//              (Q ตอม่อ · a ใต้ซุ้มโค้ง เดินลอดได้ · r ช่วงที่พังถล่ม) · รูปปั้นล้ม (T)
//   กลาง     = ลานยกสูง (=) ล้อมวิหารขั้นบันได (Z ซิกกูแรต 4×3) · รูปปั้นเทพ 4 มุมลาน (G — หมุนแล้วตายิงลำแสง) · โดมอากาศในซอกวิหาร (h)
//   ตะวันตก  = ย่านบ้านเรือนพังถล่ม (W ผนังบ้าน · T รูปปั้นล้ม · r กองซาก หลบได้ · R อักขระบนพื้น) · กำแพงย่านมีประตูหิน (D) + คันโยก (L)
//   ตะวันออก = อัฒจันทร์น้ำท่วม (t ขั้นอัฒจันทร์ · w ลานน้ำท่วม) ประตูหิน (D) + คันโยก (L) ฝั่งลาน
//   ใต้      = ถนนเสาเรียงสายตะวันออก–ตะวันตก (y10–11) · วงอักขระศักดิ์สิทธิ์ (o วงอักขระ · i ลานในวง · O หินตั้ง 4 มุม · A แท่นบูชาทะเลกลางวง)
//              ย่านพังตะวันออกเฉียงใต้ (รูปปั้นยักษ์ล้ม) · รูปปั้นเรืองแสง (U — ตีแตกเป็นแสง) 3 ตัวกระจายตามย่าน
//  ร้านค้า = เรือ Nautilus ที่ท่าจอด (shopSpots ว่าง)
//   x  01234567890123456789
const ROWS = [
  "W....S.NNNNNN.S....W", // y0   ท่าจอด
  "..R..T.NNNNNN.T..R..", // y1
  "aQaQaQ.P.X..P.QarrQa", // y2   ท่อส่งน้ำ (ตะวันออกพัง x16–17) · ถนนเสาเรียงเหนือ · แผ่นกด (9,2)
  "...r...........r..U.", // y3
  "WW.W..RP..X.P..tttt.", // y4   แผ่นกด (10,4) · อัฒจันทร์เหนือ
  "W.T..WG======GWtwwtt", // y5   รูปปั้นเทพ (6,5)(13,5)
  "...W.L==ZZZZ==Lwwwwt", // y6   คันโยก (5,6)(14,6)
  "S.RW.D=hZZZZh=Dwwwwt", // y7   ประตูหิน (5,7)(14,7) · โดมอากาศ (7,7)(12,7)
  ".WWW.W==ZZZZ==Wwwwwt", // y8
  ".U..r.G======G.tXwtt", // y9   รูปปั้นเทพ (6,9)(13,9) · แผ่นกดกลางลาน (16,9)
  "...RX..........ttttS", // y10  ถนนใหญ่ · แผ่นกด (4,10)
  "W.P.P...OoooO.P.P.r.", // y11  เสาเรียงใต้ · วงอักขระ
  "..WW.S..oiiio..W.T..", // y12
  "R.W...R.oiAio.RWrT..", // y13  แท่นบูชาทะเล (10,13)
  "....T.U.oiiio.....R.", // y14
  "W.S..r..OoooO..S...W", // y15
];
const at = (...chs) => {
  const out = [];
  ROWS.forEach((row, y) => [...row].forEach((c, x) => { if (chs.includes(c)) out.push([x, y]); }));
  return out;
};

module.exports = {
  map: {
    cols: 20, rows: 16,
    terrain: {
      fd_nt_citywall: at("W"), fd_nt_citycol: at("P"), fd_nt_ziggurat: at("Z"), fd_nt_godstatue: at("G"), fd_nt_toppled: at("T"),
      fd_nt_aqpier: at("Q"), fd_nt_citylever: at("L"), fd_nt_lightstatue: at("U"), fd_nt_pylon: at("O"), fd_nt_seaaltar: at("A"),
    },
    special: {
      fd_nt_plaza: at("="), fd_nt_aqspan: at("a"), fd_nt_cityrubble: at("r"), fd_nt_tier: at("t"), fd_nt_flood: at("w"),
      fd_nt_floorrune: at("R"), fd_nt_plate: at("X"), fd_nt_citygate: at("D"), fd_nt_runering: at("o"), fd_nt_sanctum: at("i"),
    },
    heal: at("h"), healKind: "fd_nt_airdome",
    spawns: at("S"),
    shopSpots: [],
  },
  TERRAIN: {
    fd_nt_citywall: { name: "ผนังบ้านหินพัง", icon: "🧱" },
    fd_nt_citycol: { name: "เสาหินสลัก", icon: "🏛️" },
    fd_nt_ziggurat: { name: "วิหารขั้นบันได", icon: "🛕" },
    fd_nt_godstatue: { name: "รูปปั้นเทพ", icon: "🗿" },
    fd_nt_toppled: { name: "รูปปั้นล้ม", icon: "🪨" },
    fd_nt_aqpier: { name: "ตอม่อท่อส่งน้ำ", icon: "🏛️" },
    fd_nt_citylever: { name: "คันโยกประตูหิน", icon: "🕹️" },
    fd_nt_lightstatue: { name: "รูปปั้นเรืองแสง", icon: "🗿" },
    fd_nt_pylon: { name: "หินตั้งอักขระ", icon: "🪨" },
    fd_nt_seaaltar: { name: "แท่นบูชาทะเล", icon: "🔱" },
    fd_nt_gateshut: { name: "ประตูหิน", icon: "🚪" },
    fd_nt_plaza: { name: "ลานวิหาร", icon: "🟫" },
    fd_nt_aqspan: { name: "ใต้ซุ้มท่อส่งน้ำ", icon: "🌉" },
    fd_nt_cityrubble: { name: "กองซากหิน", icon: "🪨", desc: "หลบหลีก +20%", evade: 20 },
    fd_nt_fallen: { name: "เสาล้ม", icon: "🪨", desc: "เดิน 2 ก้าว · หลบหลีก +20%", cost: 2, evade: 20 },
    fd_nt_tier: { name: "อัฒจันทร์", icon: "🏟️", desc: "หลบหลีก +10%", evade: 10 },
    fd_nt_flood: { name: "ลานน้ำท่วม", icon: "🌊" },
    fd_nt_floorrune: { name: "อักขระบนพื้น", icon: "🔣" },
    fd_nt_plate: { name: "แผ่นกด", icon: "⬛" },
    fd_nt_citygate: { name: "ประตูหิน", icon: "⛩️" },
    fd_nt_runering: { name: "วงอักขระ", icon: "🔯" },
    fd_nt_sanctum: { name: "ลานในวงอักขระ", icon: "🔯" },
    fd_nt_shards: { name: "เศษรูปปั้น", icon: "✨" },
    fd_nt_airdome: { name: "โดมอากาศ", icon: "🫧", desc: "จบตา ฟื้นพลังชีวิต +1" },
    fd_nt_whale: { name: "ทาลัสซา", icon: "🐋" },
  },
  // ท่าจอดเรือ Nautilus (ขั้น 3): มุมบนซ้าย + ขนาด
  DOCK: { x: 7, y: 0, w: 6, h: 2 },
};
