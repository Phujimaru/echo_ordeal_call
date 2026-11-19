// Nautilus ชั้น 2 "ซากเรือรบ" −200 ม. (area 47 · GRID_PLAN §8.9) — ผังกระดาน + ชนิดช่องใหม่ (ข้อมูลล้วน · กติกา server/fodlan/stage8.js + ntWreck.js · ภาพ client/src/board/fodlan/wreck.js)
//  ภูมิประเทศ (ผู้ใช้สั่ง: เป็นภูมิศาสตร์จริง ไม่ใช่ของวางกระจาย): เรือรบยักษ์ลำเดียวหักกลางลำ จมนอนบนพื้นตะกอน
//   ตะวันตกเฉียงเหนือ = ส่วนหัวเรือ (H ตัวเรือเหล็ก · ห้องในเรือดาดฟ้าผุ d · ห้องอากาศค้าง h · ปืนใหญ่ข้างกราบ C) ประตูกั้นน้ำตะวันออก (D x7 y5) + ใต้ (D x5 y7)
//   ตะวันออกเฉียงใต้ = ส่วนท้ายเรือ (ห้องเครื่อง) ประตูบน (x16 y9) · ตะวันตก (x12 y11) · ใต้ (x15 y13)
//   กลาง = ทุ่งซากระหว่างสองท่อน (X เศษซาก เดิน 2 ก้าว · T หีบสมบัติ · K ถังดินปืนที่หกจากคลังกระสุน)
//   ปั้นจั่นรอกเก่า (P เสา) แขวนลังสินค้าเหนือทางเข้าห้องเรือ 3 จุด: หน้าประตูหัวเรือตะวันออก · หน้าประตูหัวเรือใต้ · หน้าประตูท้ายเรือตะวันตก
//   ตะวันตก = เสากระโดงหลักล้มขวางแถว 8 (M) · ตะวันออกเฉียงเหนือ = สมอยักษ์ปักพื้น (a) + กว้านโซ่สมอ (w)
//   รูปลาไหลมอเรย์ (E = ผนังเรือที่มีรู) 4 จุดรอบซาก · พื้นตะกอนหนา (s) เป็นแอ่งรอบซาก · ท่าจอด Nautilus กลางบน (N)
//  ร้านค้า = เรือ Nautilus (shopSpots ว่าง)
//   x  01234567890123456789
const ROWS = [
  ".......NNNNNN.......", // y0
  "..S....NNNNNN....S..", // y1
  ".....ss......ss.....", // y2
  ".HHEHHHHP..X....a...", // y3   หัวเรือ · รูปลาไหล (x3) · ปั้นจั่น 1 (x8 → ลัง x8–9 y4–5) · สมอ
  ".HddCddH..X.X..wa...", // y4   กว้านโซ่สมอ (x15)
  "SHdhdddD..XXKK....S.", // y5   ห้องอากาศ (x3) · ประตูตะวันออก (x7) · ถังดินปืน
  ".HddCddE...X.KT.....", // y6   รูปลาไหล (x7) · หีบ
  ".HHHHDHH..........ss", // y7   ประตูใต้ (x5)
  "MMMMM..P.X..X.......", // y8   เสากระโดงล้ม · ปั้นจั่น 3 (x7 → ลัง x5–6 y8–9)
  "....T....XXPEHHHDHHH", // y9   ปั้นจั่น 2 (x11 → ลัง x10–11 y10–11) · รูปลาไหล (x12) · ท้ายเรือ · ประตูบน (x16)
  "..ss..K..X..HddddCdH", // y10  ถังดินปืน
  "S......K.T..DddhdddH", // y11  ประตูตะวันตก (x12) · ห้องอากาศ (x15)
  "...X........HddCdddH", // y12
  "..XX..S...KKHHHDHHEH", // y13  ถังดินปืน · ประตูใต้ (x15) · รูปลาไหล (x18)
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
    terrain: {
      fd_nt_hull: at("H"), fd_nt_cannon: at("C"), fd_nt_mast: at("M"), fd_nt_anchor: at("a"),
      fd_nt_eelhole: at("E"), fd_nt_winch: at("w"), fd_nt_crane: at("P"), fd_nt_keg: at("K"),
    },
    special: { fd_nt_deck: at("d"), fd_nt_debris: at("X"), fd_nt_chest: at("T"), fd_nt_silt: at("s"), fd_nt_door: at("D") },
    heal: at("h"), healKind: "fd_nt_airpocket",
    spawns: at("S"),
    shopSpots: [],
  },
  TERRAIN: {
    fd_nt_hull: { name: "ตัวเรือเหล็ก", icon: "⚓" },
    fd_nt_cannon: { name: "ปืนใหญ่เก่า", icon: "💣" },
    fd_nt_mast: { name: "เสากระโดงล้ม", icon: "🪵" },
    fd_nt_anchor: { name: "สมอยักษ์", icon: "⚓" },
    fd_nt_eelhole: { name: "รูปลาไหลมอเรย์", icon: "🐍" },
    fd_nt_winch: { name: "กว้านโซ่สมอ", icon: "⛓️" },
    fd_nt_crane: { name: "ปั้นจั่นรอก", icon: "🏗️" },
    fd_nt_keg: { name: "ถังดินปืน", icon: "🛢️" },
    fd_nt_deck: { name: "ดาดฟ้าผุ", icon: "🟫", desc: "เดิน 2 ก้าว", cost: 2 },
    fd_nt_debris: { name: "ซากเรือ", icon: "🪵", desc: "เดิน 2 ก้าว", cost: 2 },
    fd_nt_chest: { name: "หีบสมบัติ", icon: "🧰" },
    fd_nt_silt: { name: "ตะกอน", icon: "🟤" },
    fd_nt_door: { name: "ประตูกั้นน้ำ", icon: "🚪" },
    fd_nt_airpocket: { name: "ห้องอากาศ", icon: "🫧", desc: "จบตา ฟื้นพลังชีวิต +1" },
    fd_nt_whale: { name: "ทาลัสซา", icon: "🐋" },
    // ช่องที่เกิดระหว่างเกม (ntWreck.layer)
    fd_nt_doorshut: { name: "ประตูกั้นน้ำ (ปิด)", icon: "🚪" },
    fd_nt_collapse: { name: "ตัวเรือถล่ม", icon: "🧱" },
    fd_nt_cargo: { name: "ลังสินค้าแตก", icon: "📦", desc: "เดิน 2 ก้าว", cost: 2 },
    fd_nt_mound: { name: "เนินตะกอน", icon: "🟤", desc: "เดิน 2 ก้าว", cost: 2 },
  },
  DOCK: { x: 7, y: 0, w: 6, h: 2 },
  // ห้องในเรือ (ประตู + พื้นในห้อง) · ปั้นจั่น (เสา + มุมบนซ้ายของลัง 2×2) · รูปลาไหล — ntWreck.js ใช้
  ROOMS: [
    { id: "bow", doors: [[7, 5], [5, 7]], box: [2, 4, 6, 6] },
    { id: "stern", doors: [[16, 9], [12, 11], [15, 13]], box: [13, 10, 18, 12] },
  ],
  CRANES: [
    { id: 1, post: [8, 3], area: [8, 4] },
    { id: 2, post: [11, 9], area: [10, 10] },
    { id: 3, post: [7, 8], area: [5, 8] },
  ],
};
