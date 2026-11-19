// Nautilus ชั้น 3 "ปล่องภูเขาไฟใต้ทะเล" −1,000 ม. (area 48 · GRID_PLAN §8.9) — ผังกระดาน + ชนิดช่องใหม่ (ข้อมูลล้วน · กติกา server/fodlan/stage9.js)
//  พื้นหินบะซอลต์ดำ รอยแตกเรืองส้ม · ปล่องควันดำ (V) 5 ปล่อง (ขั้น 4 พ่นน้ำเดือด) · หินบะซอลต์ (R) เป็นแนว
//  ดงหนอนท่อ (w — ซ่อนตัว เดิน 2 ก้าว) รอบปล่อง · ฟองอากาศ (h) = จุดฟื้นฟู
//   V ปล่องควันดำ (fd_nt_vent)  R หินบะซอลต์ (fd_nt_basalt)  w ดงหนอนท่อ (fd_nt_tubeworm)  h ฟองอากาศ  S จุดเกิด  $ จุดร้านค้า
//   N = ท่าจอดเรือ Nautilus 6×2 (x 7–12 · y 0–1)
const ROWS = [
  "R......NNNNNN......R", // y0
  "..S....NNNNNN...S...", // y1
  ".....w..........w...", // y2
  "...ww.R......R.wVw..", // y3
  "...wVw.R....R...w...", // y4
  "S...w...........$..S", // y5
  "......RR....RR......", // y6
  "..R......wVw.....R..", // y7
  "..R...h..wVw..h..R..", // y8
  "......RR.....R......", // y9
  ".$..w...........w...", // y10
  "...wVw..R....R.wVw..", // y11
  "....w..R......R.w...", // y12
  "..........$.........", // y13
  ".S...R..........R.S.", // y14
  "R........S.........R", // y15
];
const at = (ch) => {
  const out = [];
  ROWS.forEach((row, y) => [...row].forEach((c, x) => { if (c === ch) out.push([x, y]); }));
  return out;
};

module.exports = {
  map: {
    cols: 20, rows: 16,
    terrain: { fd_nt_vent: at("V"), fd_nt_basalt: at("R") },
    special: { fd_nt_tubeworm: at("w") },
    heal: at("h"), healKind: "fd_nt_bubble",
    spawns: at("S"),
    shopSpots: at("$"),
  },
  TERRAIN: {
    fd_nt_vent: { name: "ปล่องควันดำ", icon: "🌋" },
    fd_nt_basalt: { name: "หินบะซอลต์", icon: "🪨" },
    fd_nt_tubeworm: { name: "ดงหนอนท่อ", icon: "🪱", desc: "เดิน 2 ก้าว · หลบหลีก +20% · ซ่อนตัว", cost: 2, evade: 20, bush: true },
    fd_nt_bubble: { name: "ฟองอากาศ", icon: "🫧", desc: "จบตา ฟื้นพลังชีวิต +1" },
  },
  DOCK: { x: 7, y: 0, w: 6, h: 2 },
};
