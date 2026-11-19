// Nautilus ชั้น 4 "นครจมบาดาล" −3,000 ม. (area 49 · GRID_PLAN §8.9) — ผังกระดาน + ชนิดช่องใหม่ (ข้อมูลล้วน · กติกา server/fodlan/stage10.js)
//  ซากนครหินสลัก: วิหารกลาง (กำแพง W ล้อม เปิดประตูบน/ล่าง/ซ้าย/ขวา) · เสาหินเรียงแถว (P) · รูปปั้นเรืองแสง (U — ขั้น 2 ตีแตกได้)
//  อักขระบนพื้น (r — ขั้น 2 เหยียบแล้วเปิดกับดัก/บัฟ · ตอนนี้แค่ลาย) · แท่นบูชา (h) = จุดฟื้นฟู
//   W กำแพงหินสลัก (fd_nt_citywall)  P เสาหิน (fd_nt_column)  U รูปปั้น (fd_nt_statue)  r อักขระ (fd_nt_rune)  h แท่นบูชา  S จุดเกิด  $ จุดร้านค้า
//   N = ท่าจอดเรือ Nautilus 6×2 (x 7–12 · y 0–1)
const ROWS = [
  "P......NNNNNN......P", // y0
  "..S....NNNNNN....S..", // y1
  "..P..P........P..P..", // y2
  "......WWW..WWW......", // y3
  ".S....W..r...W..$...", // y4
  "..P...W.r.r..W...P..", // y5
  "......r..h...r......", // y6
  "S.U.......U.......U.", // y7
  "......r...h..r......", // y8
  "..P...W..r.r.W...P..", // y9
  "......W...r..W....S.", // y10
  "..$...WWW..WWW......", // y11
  "..P..P........P..P..", // y12
  "....r....$.....r....", // y13
  ".S................S.", // y14
  "P........r.........P", // y15
];
const at = (ch) => {
  const out = [];
  ROWS.forEach((row, y) => [...row].forEach((c, x) => { if (c === ch) out.push([x, y]); }));
  return out;
};

module.exports = {
  map: {
    cols: 20, rows: 16,
    terrain: { fd_nt_citywall: at("W"), fd_nt_column: at("P"), fd_nt_statue: at("U") },
    special: { fd_nt_rune: at("r") },
    heal: at("h"), healKind: "fd_nt_altar",
    spawns: at("S"),
    shopSpots: at("$"),
  },
  TERRAIN: {
    fd_nt_citywall: { name: "กำแพงหินสลัก", icon: "🧱" },
    fd_nt_column: { name: "เสาหิน", icon: "🏛️" },
    fd_nt_statue: { name: "รูปปั้นเรืองแสง", icon: "🗿" },
    fd_nt_rune: { name: "อักขระโบราณ", icon: "🔣" },
    fd_nt_altar: { name: "แท่นบูชาทะเล", icon: "🔱", desc: "จบตา ฟื้นพลังชีวิต +1" },
  },
  DOCK: { x: 7, y: 0, w: 6, h: 2 },
};
