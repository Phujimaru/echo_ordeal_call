// Nautilus ชั้น 2 "ซากเรือรบ" −200 ม. (area 47 · GRID_PLAN §8.9) — ผังกระดาน + ชนิดช่องใหม่ (ข้อมูลล้วน · กติกา server/fodlan/stage8.js · ภาพ client/src/board/fodlan/wreck.js)
//  ภูมิประเทศ (ผู้ใช้สั่ง: เป็นภูมิศาสตร์จริง ไม่ใช่ของวางกระจาย): เรือรบยักษ์ลำเดียวหักกลางลำ จมนอนบนพื้นตะกอน
//   ตะวันตกเฉียงเหนือ = ส่วนหัวเรือ (H ตัวเรือเหล็ก · ห้องในเรือดาดฟ้าผุ d · ห้องอากาศค้าง h · ปืนใหญ่ข้างกราบ C) ทางเข้าตะวันออก (x7 y5) + ใต้ (x5 y7)
//   ตะวันออกเฉียงใต้ = ส่วนท้ายเรือ (ห้องเครื่อง) ทางเข้าบน (x16 y9) · ตะวันตก (x12 y11) · ใต้ (x15 y13)
//   กลาง = ทุ่งซากระหว่างสองท่อน (X เศษซาก เดิน 2 ก้าว · T หีบสมบัติ) · ตะวันตก = เสากระโดงหลักล้มขวางแถว 8 (M)
//   ตะวันออกเฉียงเหนือ = สมอยักษ์ปักพื้น (a) · พื้นตะกอนหนา (s) เป็นแอ่งรอบซาก · ท่าจอด Nautilus กลางบน (N)
//  ร้านค้า = เรือ Nautilus (shopSpots ว่าง)
//   x  01234567890123456789
const ROWS = [
  ".......NNNNNN.......", // y0
  "..S....NNNNNN....S..", // y1
  ".....ss......ss.....", // y2
  ".HHHHHHH...X....a...", // y3   หัวเรือ · สมอ
  ".HddCddH..X.X...a...", // y4
  "SHdhddd...XX......S.", // y5   ห้องอากาศ (x3) · ทางเข้าตะวันออก (x7)
  ".HddCddH...X..T.....", // y6   หีบ
  ".HHHH.HH..........ss", // y7   ทางเข้าใต้ (x5)
  "MMMMM....X..X.......", // y8   เสากระโดงล้ม
  "....T....XX.HHHH.HHH", // y9   ท้ายเรือ · ทางเข้าบน (x16)
  "..ss.....X..HddddCdH", // y10
  "S........T..dddhdddH", // y11  ทางเข้าตะวันตก (x12) · ห้องอากาศ (x15)
  "...X........HddCdddH", // y12
  "..XX..S.....HHH.HHHH", // y13  ทางเข้าใต้ (x15)
  ".ss.......ss.....S..", // y14
  "....ss........ss....", // y15
];
const at = (...chs) => {
  const out = [];
  ROWS.forEach((row, y) => [...row].forEach((c, x) => { if (chs.includes(c)) out.push([x, y]); }));
  return out;
};

module.exports = {
  map: {
    cols: 20, rows: 16,
    terrain: { fd_nt_hull: at("H"), fd_nt_cannon: at("C"), fd_nt_mast: at("M"), fd_nt_anchor: at("a") },
    special: { fd_nt_deck: at("d"), fd_nt_debris: at("X"), fd_nt_chest: at("T"), fd_nt_silt: at("s") },
    heal: at("h"), healKind: "fd_nt_airpocket",
    spawns: at("S"),
    shopSpots: [],
  },
  TERRAIN: {
    fd_nt_hull: { name: "ตัวเรือเหล็ก", icon: "⚓" },
    fd_nt_cannon: { name: "ปืนใหญ่เก่า", icon: "💣" },
    fd_nt_mast: { name: "เสากระโดงล้ม", icon: "🪵" },
    fd_nt_anchor: { name: "สมอยักษ์", icon: "⚓" },
    fd_nt_deck: { name: "ดาดฟ้าผุ", icon: "🟫", desc: "เดิน 2 ก้าว", cost: 2 },
    fd_nt_debris: { name: "ซากเรือ", icon: "🪵", desc: "เดิน 2 ก้าว", cost: 2 },
    fd_nt_chest: { name: "หีบสมบัติ", icon: "🧰" },
    fd_nt_silt: { name: "ตะกอน", icon: "🟤" },
    fd_nt_airpocket: { name: "ห้องอากาศ", icon: "🫧", desc: "จบตา ฟื้นพลังชีวิต +1" },
    fd_nt_whale: { name: "ทาลัสซา", icon: "🐋" },
  },
  DOCK: { x: 7, y: 0, w: 6, h: 2 },
};
