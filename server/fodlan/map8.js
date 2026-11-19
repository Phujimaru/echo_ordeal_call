// Nautilus ชั้น 2 "ซากเรือรบ" −200 ม. (area 47 · GRID_PLAN §8.9) — ผังกระดาน + ชนิดช่องใหม่ (ข้อมูลล้วน · กติกา server/fodlan/stage8.js)
//  ซากเรือรบ 3 ลำนอนบนพื้นทราย: ผนังเหล็ก (W) ล้อมห้องในเรือ มีช่องโหว่ทางเข้าลำละ 1 ช่อง · ดาดฟ้าไม้ผุในห้อง (d — เดิน 2 ก้าว)
//  ไม้เรือหัก (T) + ปืนใหญ่เก่า (g — ขั้น 2 ยิงได้) กระจายรอบ · ห้องอากาศค้าง (h) = จุดฟื้นฟู
//   W ผนังเหล็ก (fd_nt_hull)  T ไม้เรือหัก (fd_nt_timber)  g ปืนใหญ่ (fd_nt_cannon)  d ดาดฟ้าผุ (fd_nt_deck)  h ห้องอากาศ  S จุดเกิด  $ จุดร้านค้า
//   N = ท่าจอดเรือ Nautilus 6×2 (x 7–12 · y 0–1)
const ROWS = [
  "T......NNNNNN......T", // y0
  "..S....NNNNNN....S..", // y1
  "....WWWW......g.....", // y2
  "...W....W..T.......T", // y3
  ".S...dd.W....WWW....", // y4
  "...W.dd.W...W...W.S.", // y5
  "....W..W....W.h.W...", // y6
  "..T..WW..g...W.W....", // y7
  "S.......h.........T.", // y8
  "...g....WWWWW.......", // y9
  "..W....W.ddd.W..$...", // y10
  ".$W..h.W.ddd.W..TT..", // y11
  "..W....W.....W......", // y12
  "...T....WW.WW...g...", // y13
  ".S.........$........", // y14
  "T.......S..........T", // y15
];
const at = (ch) => {
  const out = [];
  ROWS.forEach((row, y) => [...row].forEach((c, x) => { if (c === ch) out.push([x, y]); }));
  return out;
};

module.exports = {
  map: {
    cols: 20, rows: 16,
    terrain: { fd_nt_hull: at("W"), fd_nt_timber: at("T"), fd_nt_cannon: at("g") },
    special: { fd_nt_deck: at("d") },
    heal: at("h"), healKind: "fd_nt_airpocket",
    spawns: at("S"),
    shopSpots: at("$"),
  },
  TERRAIN: {
    fd_nt_hull: { name: "ผนังเหล็กเรือรบ", icon: "⚓" },
    fd_nt_timber: { name: "ไม้เรือหัก", icon: "🪵" },
    fd_nt_cannon: { name: "ปืนใหญ่เก่า", icon: "💣" },
    fd_nt_deck: { name: "ดาดฟ้าผุ", icon: "🟫", desc: "เดิน 2 ก้าว", cost: 2 },
    fd_nt_airpocket: { name: "ห้องอากาศ", icon: "🫧", desc: "จบตา ฟื้นพลังชีวิต +1" },
  },
  DOCK: { x: 7, y: 0, w: 6, h: 2 },
};
