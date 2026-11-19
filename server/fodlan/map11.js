// Nautilus ชั้น 5 "ร่องลึกก้นสมุทร" −10,000 ม. (area 50 · GRID_PLAN §8.9) — ผังกระดาน + ชนิดช่องใหม่ (ข้อมูลล้วน · กติกา server/fodlan/stage11.js · ลูกเล่น ntAbyss.js)
//  ภูมิประเทศจริง (ไม่ใช่ของวางกระจาย · ภาพ client/src/board/fodlan/abyss.js):
//   เหนือ    = ชั้นหินบะซอลต์ท่าจอดเรือ Nautilus (N 6×2) · ผาดิ่งสองข้าง (C) · ดงแพลงก์ตอนเรืองแสง 2 ดง (p) · ยานสำรวจตกเก่า (L — ยิงพลุ)
//   กลาง     = ร่องลึกดำสนิท (X) ผ่ากระดานจากตะวันตกไปตะวันออก — ข้ามได้ 3 ทาง:
//              สะพานหินแคบตะวันตก (= x3 · ทุบพังได้) · กระดูกสันหลังเลวีอาธาน (| x10 · พังไม่ได้ = ทางที่เหลือเสมอ) · สะพานหินตะวันออก (= x16 · ทุบพังได้)
//   โครงกระดูกเลวีอาธานยักษ์นอนคร่อมร่อง: กะโหลก (K 2×2) ทางเหนือ · กระดูกสันหลังพาดข้ามร่อง · ซี่โครง (r) โค้งสูงข้ามหัว ฐานปักสองฝั่ง x7/x13
//   ใต้      = แอ่งก้นร่อง: บ่อน้ำเกลือ (b — ทะเลสาบใต้ทะเล เดินช้า จบตา = พิษ) 2 บ่อ · หลุมดิ่ง (O) · ดงแพลงก์ตอน · ยานสำรวจลำที่ 2 · ผาดิ่งขอบใต้
//   หินแหลมร่องลึก (R) กระจายตามขอบ · ฟองอากาศ (h) แค่ 2 จุด (ลึกสุด = น้อยสุด)
//  ปลาตกเบ็ด 3 ตัวซุ่มในร่อง (ข้อมูลใน ntAbyss.js LURES — แสงล่อห้อยเหนือช่องริมร่อง (1,5) (8,9) (17,8))
//  ร้านค้า = เรือ Nautilus ที่ท่าจอด · shopSpots ว่าง
//   x  01234567890123456789
const ROWS = [
  "CCC....NNNNNN...CCCC", // y0   ท่าจอดเรือ · ผาดิ่ง
  "CC..S..NNNNNN..S..CC", // y1
  "C..ppp...KK.....pp.C", // y2   ดงแพลงก์ตอน · กะโหลกเลวีอาธาน
  "C.pp...r.KK..rL..p.C", // y3   ซี่โครงคู่แรก · ยานสำรวจ
  ".....h....|....R..S.", // y4   กระดูกสันหลังเริ่ม · ฟองอากาศ
  "....R..r..|..r.X=...", // y5   ซี่โครงคู่ที่ 2 · ปากร่องตะวันออก
  "XX....XX..|.XXXX=XXX", // y6   ร่องลึก
  "XXX=XXXXXX|XXXXX=XXX", // y7   สะพานหิน x3 · สันหลัง x10 · สะพานหิน x16
  ".XX=XXXXXX|XX.....XX", // y8
  "....XX....|.........", // y9
  ".S.....r..|..r..R.S.", // y10  ซี่โครงฝั่งใต้
  "..bb.....p|p....bb..", // y11  บ่อน้ำเกลือ
  ".bbb.LOr.....r.bbb..", // y12  ยานสำรวจ 2 · หลุมดิ่ง
  "R.b.....pp.h..OOb..R", // y13
  "C..S....p.....O.S..C", // y14
  "CCC..R.........R.CCC", // y15  ผาดิ่งขอบใต้
];
const at = (...chs) => {
  const out = [];
  ROWS.forEach((row, y) => [...row].forEach((c, x) => { if (chs.includes(c)) out.push([x, y]); }));
  return out;
};

module.exports = {
  ROWS,
  map: {
    cols: 20, rows: 16,
    terrain: { fd_nt_chasm: at("X"), fd_nt_cliff: at("C"), fd_nt_trenchrock: at("R"), fd_nt_skull: at("K"), fd_nt_rib: at("r"), fd_nt_probe: at("L"), fd_nt_pit: at("O") },
    special: { fd_nt_bridge: at("="), fd_nt_spine: at("|"), fd_nt_plankton: at("p"), fd_nt_brine: at("b") },
    heal: at("h"), healKind: "fd_nt_bubble",
    spawns: at("S"),
    shopSpots: [],
  },
  TERRAIN: {
    fd_nt_chasm: { name: "ร่องลึก", icon: "🕳️" },
    fd_nt_cliff: { name: "ผาดิ่ง", icon: "🪨" },
    fd_nt_trenchrock: { name: "หินร่องลึก", icon: "🪨" },
    fd_nt_skull: { name: "กะโหลกเลวีอาธาน", icon: "💀" },
    fd_nt_rib: { name: "ซี่โครงเลวีอาธาน", icon: "🦴" },
    fd_nt_probe: { name: "ยานสำรวจ", icon: "🛰️" },
    fd_nt_pit: { name: "หลุมดิ่ง", icon: "🕳️" },
    fd_nt_bridge: { name: "สะพานหิน", icon: "🌉" },
    fd_nt_spine: { name: "กระดูกสันหลัง", icon: "🦴" },
    fd_nt_plankton: { name: "แพลงก์ตอนเรืองแสง", icon: "✨" },
    fd_nt_brine: { name: "บ่อน้ำเกลือ", icon: "🧪", desc: "เดิน 2 ก้าว · จบตา พิษ", cost: 2 },
    fd_nt_bubble: { name: "ฟองอากาศ", icon: "🫧", desc: "จบตา ฟื้นพลังชีวิต +1" },
    fd_nt_whale: { name: "ทาลัสซา", icon: "🐋" },
  },
  DOCK: { x: 7, y: 0, w: 6, h: 2 },
};
