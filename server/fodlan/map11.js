// Nautilus ชั้น 5 "ร่องลึกก้นสมุทร" −10,000 ม. (area 50 · GRID_PLAN §8.9) — ผังกระดาน + ชนิดช่องใหม่ (ข้อมูลล้วน · กติกา server/fodlan/stage11.js)
//  ก้นร่องมืดสนิท: หินร่องลึก (R) เป็นแนวผา · หลุมดิ่ง (O — ขั้น 2 ตกแล้วหายจากกระดาน · ตอนนี้เป็นสิ่งกีดขวาง)
//  แพลงก์ตอนเรืองแสง (p — ขั้น 2 เหยียบแล้วตัวสว่าง · ตอนนี้แค่ลาย) · ฟองอากาศ (h) 2 จุด = จุดฟื้นฟู
//   R หินร่องลึก (fd_nt_trenchrock)  O หลุมดิ่ง (fd_nt_pit)  p แพลงก์ตอนเรืองแสง (fd_nt_plankton)  h ฟองอากาศ  S จุดเกิด  $ จุดร้านค้า
//   N = ท่าจอดเรือ Nautilus 6×2 (x 7–12 · y 0–1)
const ROWS = [
  "RR.....NNNNNN.....RR", // y0
  "R..S...NNNNNN...S..R", // y1
  "..........p.........", // y2
  "...RR..p......RR....", // y3
  ".S..R...OO......R.$.", // y4
  "....p...OO....p.....", // y5
  "S.R.........R.......", // y6
  ".RR...h..p...RR..p..", // y7
  "..R....RR........h..", // y8
  ".....p.R...OO.......", // y9
  "..$........OO..p..S.", // y10
  "....RR.........RR...", // y11
  ".p...R...p......R...", // y12
  "........R...$....p..", // y13
  ".S....p.R.........S.", // y14
  "RR.................R", // y15
];
const at = (ch) => {
  const out = [];
  ROWS.forEach((row, y) => [...row].forEach((c, x) => { if (c === ch) out.push([x, y]); }));
  return out;
};

module.exports = {
  map: {
    cols: 20, rows: 16,
    terrain: { fd_nt_trenchrock: at("R"), fd_nt_pit: at("O") },
    special: { fd_nt_plankton: at("p") },
    heal: at("h"), healKind: "fd_nt_bubble",
    spawns: at("S"),
    shopSpots: at("$"),
  },
  TERRAIN: {
    fd_nt_trenchrock: { name: "หินร่องลึก", icon: "🪨" },
    fd_nt_pit: { name: "หลุมดิ่ง", icon: "🕳️" },
    fd_nt_plankton: { name: "แพลงก์ตอนเรืองแสง", icon: "✨" },
    fd_nt_bubble: { name: "ฟองอากาศ", icon: "🫧", desc: "จบตา ฟื้นพลังชีวิต +1" },
  },
  DOCK: { x: 7, y: 0, w: 6, h: 2 },
};
