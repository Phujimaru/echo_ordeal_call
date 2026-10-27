// ด่าน 2 ของโหมด Fodlan — เรเมียร์ (ป่าหมอก) · ผังกระดาน + ชนิดช่องใหม่ (ข้อมูลล้วน · ดู server/fodlan/README.md)
//  ป่าสนดำทึบในหมอก · ทางเดินดินคดเคี้ยวผ่านดงสน · หย่อมป่าทึบ (forest — ซ่อนตัว/เดิน 2 ก้าว) ตามทาง
//  # = ต้นสนดำ (fd_pine) · o = หินตะไคร่ (fd_rock) · f = ป่าทึบ · . = พื้น
//  S = จุดเกิด · $ = จุดร้านค้า · P = เสาเวทมืด (ตั้งตอนเข้าด่าน — server/fodlan/stage2.js) · C = กล่องเสบียงจุดแรก
//  ⚠️ P/C เป็นพื้นธรรมดาในผัง (ของบนกระดานลงผ่านชั้น layer ของ stage2.js)
const ROWS = [
  "##f.S.##f.S.f#",
  "#ff...o#f...ff",
  "f..#..#..#..o.",
  "..##.P..ff#...",
  ".f#..f##...C#.",
  ".f..ff#..$..f.",
  "S..#...f#.#..S",
  "f.$#.#.ff....f",
  "..C..#P.##.$..",
  "o#ff...#..f#..",
  "..f.##..#.ff.#",
  ".#.$..f..P..f.",
  "f..#f.C.#...#.",
  "##S..#.S..#S.#",
];
const at = (ch) => {
  const out = [];
  ROWS.forEach((row, y) => [...row].forEach((c, x) => { if (c === ch) out.push([x, y]); }));
  return out;
};

module.exports = {
  map: {
    terrain: { fd_pine: at("#"), fd_rock: at("o") },
    special: { forest: at("f") },
    heal: [],
    spawns: at("S"),
    shopSpots: at("$"),
  },
  TERRAIN: {},
  // ของบนกระดานตอนเข้าด่าน (server/fodlan/stage2.js) — เสาเวทมืด 3 ต้น · กล่องเสบียง 3 กล่อง
  PILLARS: at("P"),
  CRATES: at("C"),
};
