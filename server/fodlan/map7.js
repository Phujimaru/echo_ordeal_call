// Nautilus ชั้น 1 "แนวปะการัง" −30 ม. (area 46 · GRID_PLAN §8.9) — ผังกระดาน + ชนิดช่องใหม่ (ข้อมูลล้วน · ดู server/fodlan/README.md · กติกา server/fodlan/stage7.js)
//  ลานทรายใต้แสงแดดรำไร · ดงปะการังเป็นหย่อม (เดินได้ หลบหลีก +20%) ล้อมหินปะการังก้อนใหญ่ · ฟองอากาศ 4 จุดกลางกระดาน = จุดฟื้นฟู
//  ผัง 20×16 (x = 0..19 ซ้าย→ขวา · y = 0..15 เหนือ→ใต้):
//   R หินปะการัง (fd_nt_reefrock — สิ่งกีดขวาง)  c ดงปะการัง (fd_nt_coral)  h ฟองอากาศ (จุดฟื้นฟู)  S จุดเกิด  $ จุดร้านค้า
//   N = ท่าจอดเรือ Nautilus 6×2 (x 7–12 · y 0–1) — ตอนนี้เป็นพื้นธรรมดา · ขั้น 3 เรือจอดตรงนี้ (DOCK)
const ROWS = [
  "RR.....NNNNNN.....RR", // y0
  "R..S...NNNNNN...S..R", // y1
  "..cc....c..c....cc..", // y2
  "..cR...........$Rc..", // y3
  ".....ccc....ccc.....", // y4
  "S...cRRc....cRRc...S", // y5
  ".....cc..hh..cc.....", // y6
  "..c.......RR......c.", // y7
  ".ccc..$..cRRc.....cc", // y8
  "..c.....cc..cc......", // y9
  ".....cc..hh..cc..$..", // y10
  "....cRRc....cRRc....", // y11
  "..R..cc......cc..R..", // y12
  "..cc..............cc", // y13
  ".R..S...........S.R.", // y14
  "RR.......S........RR", // y15
];
const at = (ch) => {
  const out = [];
  ROWS.forEach((row, y) => [...row].forEach((c, x) => { if (c === ch) out.push([x, y]); }));
  return out;
};

module.exports = {
  map: {
    cols: 20, rows: 16,
    terrain: { fd_nt_reefrock: at("R") },
    special: { fd_nt_coral: at("c") },
    heal: at("h"), healKind: "fd_nt_bubble",
    spawns: at("S"),
    shopSpots: at("$"),
  },
  TERRAIN: {
    fd_nt_reefrock: { name: "หินปะการัง", icon: "🪨" },
    fd_nt_coral: { name: "ดงปะการัง", icon: "🪸", desc: "หลบหลีก +20%", evade: 20 },
    fd_nt_bubble: { name: "ฟองอากาศ", icon: "🫧", desc: "จบตา ฟื้นพลังชีวิต +1" },
  },
  // ท่าจอดเรือ Nautilus (ขั้น 3): มุมบนซ้าย + ขนาด
  DOCK: { x: 7, y: 0, w: 6, h: 2 },
};
