// Nautilus ชั้น 1 "แนวปะการัง" −30 ม. (area 46 · GRID_PLAN §8.9) — ผังกระดาน + ชนิดช่องใหม่ (ข้อมูลล้วน · ดู server/fodlan/README.md · กติกา server/fodlan/stage7.js)
//  ผู้ใช้สั่ง 2026-11-19: "ต้องเป็นภูมิประเทศจริง ไม่ใช่เอาของชิ้นเดิมวางกระจาย" → แบ่งโซนภูมิศาสตร์ (ภาพ client/src/board/fodlan/reef.js):
//   เหนือ    = สันแนวปะการัง (W กำแพงหินปะการัง มีช่องผ่าน) + อ่าวทรายท่าจอดเรือ Nautilus (N 6×2 — ขั้น 3 เรือจอด = ร้านค้า/เติมอากาศ)
//   ตะวันตก  = ป่าสาหร่ายเคลป์ (k เดินได้ หลบหลีก · B หินก้อนโต)
//   กลาง     = ลากูนทราย · ร่องกระแสน้ำไหลไปตะวันออก (> แถว 7–8) · ทุ่งหญ้าทะเล (g) · หอยมุกยักษ์ (m) · ฟองอากาศ (h)
//   ตะวันออก = สวนปะการัง (c หลบหลีก · B ปะการังสมอง)
//   ตะวันออกเฉียงใต้ = ซุ้มหินโค้ง (A) ล้อมถ้ำเล็ก ทางเข้าบน (x18) และล่าง (x17) · ฟองอากาศในถ้ำ
//   ใต้      = ขอบผาดิ่งสู่ห้วงลึก (l) · หลุมน้ำเงิน (H) มุมตะวันตกเฉียงใต้
//  ร้านค้า: ไม่ใช้แผงร้านเดิม (ผู้ใช้: "ไม่เข้าเลย") — ร้าน = เรือ Nautilus ที่ท่าจอด (ขั้น 3) · shopSpots ว่าง
//   x  01234567890123456789
const ROWS = [
  "WWWW...NNNNNN...WWWW", // y0   สันปะการัง · อ่าวท่าจอด
  "WWc..S.NNNNNN.S..cWW", // y1
  "Wk.g...........g.ccW", // y2
  "kkk.ggg.......g.cBcc", // y3
  "kkBk......m.....ccc.", // y4   หอยมุก
  "Sk.kk..gg....c.cBc.S", // y5
  "kkk.k.........ccc.c.", // y6
  "k.k>>>>>>>>>>>>..c..", // y7   ร่องกระแสน้ำ →
  "kk.>>>>>>>>>>>>....c", // y8
  ".kk.k...h..gg.......", // y9   ฟองอากาศ
  "k.Bk....gg...m...A.A", // y10  หอยมุก · ซุ้มหิน (ทางเข้าบน x18)
  ".kk..........S..A..A", // y11
  "..lll.S..g......Ah.A", // y12  ถ้ำ (ฟองอากาศ x17)
  ".HHH.l.........AA.AA", // y13  หลุมน้ำเงิน · ทางออกถ้ำล่าง x17
  "lHHHl.ll.......g....", // y14
  "llHlllllllS.llllllll", // y15  ขอบผา
];
const at = (...chs) => {
  const out = [];
  ROWS.forEach((row, y) => [...row].forEach((c, x) => { if (chs.includes(c)) out.push([x, y]); }));
  return out;
};

module.exports = {
  map: {
    cols: 20, rows: 16,
    terrain: { fd_nt_reefwall: at("W"), fd_nt_boulder: at("B"), fd_nt_arch: at("A"), fd_nt_bluehole: at("H") },
    special: { fd_nt_kelp: at("k"), fd_nt_coral: at("c"), fd_nt_seagrass: at("g"), fd_nt_current: at(">"), fd_nt_ledge: at("l"), fd_nt_clam: at("m") },
    heal: at("h"), healKind: "fd_nt_bubble",
    spawns: at("S"),
    shopSpots: [],
  },
  TERRAIN: {
    fd_nt_reefwall: { name: "สันแนวปะการัง", icon: "🪸" },
    fd_nt_boulder: { name: "ปะการังสมอง", icon: "🪨" },
    fd_nt_arch: { name: "ซุ้มหิน", icon: "🪨" },
    fd_nt_bluehole: { name: "หลุมน้ำเงิน", icon: "🕳️" },
    fd_nt_kelp: { name: "ป่าเคลป์", icon: "🌿", desc: "หลบหลีก +20%", evade: 20 },
    fd_nt_coral: { name: "สวนปะการัง", icon: "🪸", desc: "หลบหลีก +20%", evade: 20 },
    fd_nt_seagrass: { name: "หญ้าทะเล", icon: "🌱" },
    fd_nt_current: { name: "กระแสน้ำ", icon: "🌊" },
    fd_nt_ledge: { name: "ขอบผา", icon: "⬇️" },
    fd_nt_clam: { name: "หอยมุกยักษ์", icon: "🦪" },
    fd_nt_bubble: { name: "ฟองอากาศ", icon: "🫧", desc: "จบตา ฟื้นพลังชีวิต +1" },
    fd_nt_whale: { name: "ทาลัสซา", icon: "🐋" },
  },
  // ท่าจอดเรือ Nautilus (ขั้น 3): มุมบนซ้าย + ขนาด
  DOCK: { x: 7, y: 0, w: 6, h: 2 },
};
