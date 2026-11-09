// สนาม Eos (GRID_PLAN §8.6 — เดิมชื่อ Lucid) — ผังกระดาน 32×32 + ชนิดช่องใหม่ (ข้อมูลล้วน · ดู server/fodlan/README.md · กติกา server/fodlan/stage6.js)
//  Eos ใช้ตัวคุมกลางของ Fodlan เป็น "ด่าน 6" ของโลก "eos" (server/fodlan.js) — ไม่หมุนด่าน แผนที่เดียวทั้งแมตช์
//  ผังสร้างด้วย value noise ตามภูมิศาสตร์ Lucis ใน FFXV (ผู้ใช้สั่ง 2026-11-09 — ต้องเป็นสภาพแวดล้อมที่สมจริง ไม่ใช่บล็อกสี่เหลี่ยม)
//   เหนือ = นครหลวง Insomnia (กำแพง ตึกหลายขนาด ไฟถนน) · ตะวันตก = Cleigne (ทะเลสาบ + คอกช็อโก้ริมทะเลสาบ) · กลาง-ตะวันออก = Duscae (ป่า + คอกช็อโก้ Wiz)
//   ตะวันออกเฉียงใต้ = Leide (ทะเลทราย + อู่ Hammerhead) · ตะวันตกเฉียงใต้ = เมืองน้ำ Altissia ริมทะเล (คลองโค้ง สะพาน)
//   ถนนกว้าง 2 ช่อง (ขั้นบันไดตามแนวทแยง = 3) คดเคี้ยวเป็นวงรอบกลางแผนที่ + ทางแยกไปทั้ง 3 เมือง (รถ 2×2 วิ่งถึงกันหมด — tests/eos.test.js)
//   สคริปต์สร้าง: Claude (value noise · seed คงที่) — แก้ผังด้วยมือได้ แต่ต้องรันเทสต์ Eos ทุกครั้ง
//  ผัง (x = 0..31 ซ้าย→ขวา · y = 0..31 เหนือ→ใต้):
//   . หญ้า  = ถนน (fd_eos_road)  p ลานเมือง (fd_eos_plaza)  d ทราย (fd_eos_sand)  b สะพาน (fd_eos_bridge)  k คอกช็อโก้ (fd_eos_stable)
//   F ป่าทึบ (fd_eos_forest — กติกาเท่า forest)  s น้ำตื้น (fd_eos_shallow — กติกาเท่า shallow)  X เสายึดพื้นที่
//   B ตึก  W กำแพงเมือง  L เสาไฟถนน  T ต้นไม้  R หิน  ~ น้ำลึก  c คลอง  P ปั๊มน้ำมัน  G อู่ซ่อมรถ  (สิ่งกีดขวาง)
const ROWS = [
  "..R....RWBBBBBp==pBBBBBW.FTFFF..", // y0
  ".....RR.WBBBppL==LppBBBW.FTFFF..", // y1
  "...R....Wpppppp==pppBBBWFFTFF.FF", // y2
  "....R...WBpppBp==pBXppBWFT.FF.FF", // y3
  "....R...ppppLpp==ppLppppFFFFF..F", // y4
  "..R.R...WBBpppp==ppppBBWFFF.....", // y5
  "..RRR...WpppBBp==pBppppWF.......", // y6
  "..RR....WWppppL==LppppWWFFF.....", // y7
  ".T..R....WWpWWW==WWWpWW.FFFFF.FF", // y8
  ".......==============...FTTFFFFF", // y9
  "...=======================......", // y10
  "...======........TF========F....", // y11
  "...==~~~s..kk....TFFFTTF=====...", // y12
  "..===~~~~ssk...TTTFFFTTF.=====..", // y13
  "..===~~~~~~s...FTTFFFTTF..F===..", // y14
  "..==~~~~~~~s...FTFFkkTTX....==..", // y15
  "..==~~~~~~~s...FFFFkkTTFFF..==..", // y16
  ".===~~~~~~sX...FFFFFFFFFFFF===..", // y17
  ".===ss~~sss....FFFFFFFFT.FF===..", // y18
  ".==.ssssss.....FFFFFFFFFFFF==...", // y19
  ".===............FFFFF......==..d", // y20
  ".======.......=======..ddR===ddd", // y21
  "..===========================ddd", // y22
  ".....===========...=========dddd", // y23
  ".....===...........dddd====ddddd", // y24
  ".pppL===pLppp.....dddddd====dRdd", // y25
  ".BBpcp=BBpbpL.....ddddddd====RGG", // y26
  "~~~Xcpccpppcp.....RddXdddd===RGG", // y27
  "~~~~~bppccpcb....dddddddddd===dd", // y28
  "~~~~~~cpppccp....ddddddRddd===dd", // y29
  "~~~~~~~BBpcBB....ddddddddddP==dd", // y30
  "~~~~~~~~BpcBB...ddd..dddddddPddd", // y31
];
const COLS = 32;
const at = (ch) => {
  const out = [];
  ROWS.forEach((row, y) => [...row].forEach((c, x) => { if (c === ch) out.push([x, y]); }));
  return out;
};

module.exports = {
  map: {
    cols: COLS,
    rows: ROWS.length,
    terrain: {
      fd_eos_bldg: at("B"), fd_eos_wall: at("W"), fd_eos_lamp: at("L"), fd_eos_tree: at("T"), fd_eos_rock: at("R"),
      fd_eos_water: at("~"), fd_eos_canal: at("c"), fd_eos_pump: at("P"), fd_eos_garage: at("G"),
      fd_eos_pillar: at("X"), // = PILLARS ด้านล่าง
    },
    special: {
      fd_eos_road: at("="), fd_eos_plaza: at("p"), fd_eos_sand: at("d"), fd_eos_bridge: at("b"), fd_eos_stable: at("k"),
      fd_eos_forest: at("F"), fd_eos_shallow: at("s"),
    },
    heal: [],
    // จุดเกิด 8 จุดกระจายทุกโซน (นครหลวง · เนินเขา · ป่าเหนือ · ฝั่งทะเลสาบ · ป่าตะวันออก · ทะเลทราย · เมืองน้ำ · ที่รกร้าง)
    spawns: [[3, 5], [28, 4], [11, 4], [1, 9], [31, 13], [14, 26], [23, 30], [31, 21]],
    shopSpots: [[19, 6], [24, 28], [9, 26], [15, 15], [24, 18], [26, 3], [5, 6]],
  },
  TERRAIN: {
    fd_eos_road: { name: "ถนน", icon: "🛣️" },
    // กติกาเดียวกับ forest / shallow เดิม (ชื่อของ Eos เอง — client วาดพื้นแบบกลืนกันทั้งผืน)
    fd_eos_forest: { name: "ป่าทึบ", icon: "🌲", cost: 2, evade: 20, bush: true },
    fd_eos_shallow: { name: "น้ำตื้น", icon: "💧", cost: 2 },
    fd_eos_plaza: { name: "ลานเมือง", icon: "🏙️" },
    fd_eos_sand: { name: "ทราย", icon: "🏜️" },
    fd_eos_bridge: { name: "สะพาน", icon: "🌉" },
    fd_eos_stable: { name: "คอกช็อโก้", icon: "🐤" },
    fd_eos_car: { name: "รถ", icon: "🚗" },           // ชั้น layer: ช่องรถ (ยืนบนรถ = นั่งรถ)
    fd_eos_chocobo: { name: "ช็อโก้", icon: "🐤" },   // ชั้น layer: ช่องที่ช็อโก้ยืน (จบตาบนช่องนี้ = ขึ้นขี่)
    fd_eos_daemon: { name: "ปีศาจ", icon: "👹" },
    fd_eos_pillar: { name: "เสาคริสตัล", icon: "🔷" },     // ชั้น layer: ปีศาจ (สิ่งกีดขวางที่ตีได้ — stage6 objects)
  },
  // โซน (สี่เหลี่ยมรวมขอบ [x0, y0, x1, y1]) — เมืองที่มีไฟถนน = ปีศาจเข้าไม่ได้ · ใช้เลือกเสียงบรรยากาศฝั่ง client ด้วย
  ZONES: [
    { id: "insomnia", name: "Insomnia", rect: [8, 0, 23, 8], town: true },
    { id: "hammerhead", name: "Hammerhead", rect: [24, 24, 31, 31], town: true },
    { id: "altissia", name: "Altissia", rect: [0, 24, 12, 31], town: true },
    { id: "lake", name: "Cleigne", rect: [0, 11, 12, 21] },
    { id: "duscae", name: "Duscae", rect: [13, 11, 27, 21] },
    { id: "forest", name: "Duscae", rect: [24, 0, 31, 9] },
    { id: "desert", name: "Leide", rect: [13, 20, 31, 31] },
    { id: "wild", name: "Eos", rect: [0, 0, 31, 31] },
  ],
  // รถ 3 คัน (ผู้ใช้สั่ง — ภาพ car1–3) ขนาด 2×2 บนถนน — มุมบนซ้ายตอนเริ่ม: Insomnia · Hammerhead · Altissia
  CAR_SIZE: 2,
  CARS: [[15, 5], [27, 28], [5, 23]],
  // เสายึดพื้นที่ 5 ต้น (โซนละ 1 — ผู้ใช้สั่ง 2026-11-09: ชนะด้วยแต้ม 20) · สิ่งกีดขวาง fd_eos_pillar (ร่ายพิธีจากช่องติดเสา)
  PILLARS: [
    { zone: "insomnia", at: [19, 3] }, { zone: "hammerhead", at: [21, 27] }, { zone: "duscae", at: [23, 15] },
    { zone: "lake", at: [11, 17] }, { zone: "altissia", at: [3, 27] },
  ],
  // ช็อโก้ 4 ตัว (คอกละ 2): คอก Wiz ในป่า Duscae · คอกริมทะเลสาบ Cleigne
  CHOCOBOS: [[19, 15], [20, 16], [11, 12], [12, 12]],
};
