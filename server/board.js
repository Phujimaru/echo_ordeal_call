// ============================================================
//  กระดานเดินได้ (ระบบใหม่แบบ Fire Emblem — ดู GRID_PLAN.md)
//  ไฟล์นี้เป็นฟังก์ชันล้วน: ไม่อ่าน/เขียน match ไม่ require โมดูลอื่นใน server/
//  ทุกฟังก์ชันรับข้อมูลที่ต้องใช้ทางพารามิเตอร์ → เทสต์ได้ตรงๆ และเรียกจากเฟสไหนก็ได้
//
//  พิกัด: x = คอลัมน์ 0..COLS-1 (ซ้าย→ขวา) · y = แถว 0..ROWS-1 (ไกล→ใกล้กล้อง)
//  ระยะทุกอย่างนับแบบแมนฮัตตัน (|dx| + |dy|) ไม่มีแนวทแยง — เดิน ตี สกิล ตีหมู่ ใช้การนับเดียวกัน
//  unit = { id, x, y, alive, teamId?, size? } — ผู้เล่นบนกระดาน (ข้อมูลอื่นไม่จำเป็นสำหรับไฟล์นี้)
//  ตัวใหญ่ (size = N → กิน N×N ช่อง · Echo ขยายร่าง): (x, y) = ช่องมุมบนซ้าย · ระยะนับจากขอบตัวที่ใกล้สุด (dist)
//   ช่องไหนของตัวก็โดนตี/โดนพื้นที่สกิลได้ · เดินแบบตัวใหญ่ใน reachableBig
// ============================================================

const COLS = 14; // กระดานจัตุรัส 14×14 ทุกภูมิภาค (ผู้ใช้ตัดสิน 2026-10-09)
const ROWS = 14;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// ทิศของสกิลแนว (line): ชื่อ → เวกเตอร์ (y ลบ = ไปทางไกลกล้อง)
const LINE_DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

const key = (x, y) => `${x},${y}`;

// ---------- ช่องพิเศษ (GRID_PLAN §3.1 — แนว Fire Emblem) ----------
//  ยืน/เดินผ่านได้ทุกชนิด (ต่างจากสิ่งกีดขวาง) · ไม่มีผลกับระยะตี/สกิล
//  name/icon/desc = ป้ายข้อมูลช่องบนหน้าจอ · ตัวเลขกติกา:
//   cost  = ก้าวที่ใช้เดินเข้าช่องนี้ (ไม่ระบุ = 1)
//   evade = ยืนอยู่แล้วหลบหลีกการโจมตีปกติ/ตีสวน/สกิลที่ตีด้วยพลังโจมตี +N% (แม่นยำเจาะได้ — phases/attack.js)
//   stop  = เดินเข้าแล้วหยุดทันที (ก้าวที่เหลือหายหมด) · slide = เดินเข้าแล้วไถลต่อ 1 ช่องในทิศเดิม
//   atk   = ยืนอยู่แล้วพลังโจมตี +N (computeAttackBase) · end = ผลตอนจบตาบนช่องนี้ (endTurnTile)
//   bush  = พุ่มหญ้า: ยืนอยู่แล้วศัตรูมองไม่เห็น ยกเว้นคนที่ยืนในพุ่มผืนเดียวกัน (bushPatchOf — server/visibility.js)
//  heal / oasis = จุดฟื้นฟู (map.heal) — ชื่อตามภูมิภาค (map.healKind)
const TERRAIN_INFO = {
  heal: { name: "วงเวทฟื้นฟู", icon: "✨", desc: "จบตา ฟื้นพลังชีวิต +1" },
  oasis: { name: "โอเอซิส", icon: "🌴", desc: "จบตา ฟื้นพลังชีวิต +1" },
  flowers: { name: "พุ่มดอกไม้สูง", icon: "🌸", desc: "เดิน 2 ก้าว · หลบหลีก +20% · ซ่อนตัว", cost: 2, evade: 20, bush: true },
  forest: { name: "ป่าทึบ", icon: "🌲", desc: "เดิน 2 ก้าว · หลบหลีก +20% · ซ่อนตัว", cost: 2, evade: 20, bush: true },
  thorns: { name: "หนามพิษ", icon: "🥀", desc: "จบตา ติดพิษร้าย 1 เทิร์น", end: "thorns", poison: 1 },
  shallow: { name: "น้ำตื้น", icon: "💧", desc: "เดิน 2 ก้าว", cost: 2 },
  whirl: { name: "น้ำวน", icon: "🌀", desc: "จบตา ถูกดัน 1 ช่องตามกระแส", end: "whirl" },
  quicksand: { name: "ทรายดูด", icon: "⏳", desc: "เดินเข้าแล้วหยุด", stop: true },
  ice: { name: "น้ำแข็งลื่น", icon: "🧊", desc: "ไถลต่อ 1 ช่อง", slide: true },
  lava: { name: "ลาวา", icon: "🌋", desc: "จบตา เสียหาย 1", end: "lava", dmg: 1 },
  power: { name: "แท่นพลัง", icon: "🔮", desc: "พลังโจมตี +1", atk: 1 },
};

// ---------- แผนที่รายภูมิภาค ----------
//  terrain = สิ่งกีดขวาง (ชนิดใช้แค่ตอนวาด — กติกาเหมือนกันหมด: เดินผ่าน/ยืนไม่ได้ ไม่บังการตี)
//  special = ช่องพิเศษ { ชนิด: [[x, y]…] } (กติกาตาม TERRAIN_INFO) · น้ำวนใส่ทิศกระแส [x, y, "up"|"down"|"left"|"right"]
//    → map.special = { "x,y": ชนิด } · map.flow = { "x,y": ทิศ }
//  heal = จุดฟื้นฟู (จบตาบนช่องนี้ เลือด +1) · healKind = ชื่อจุดฟื้นฟูใน TERRAIN_INFO (ทะเลทราย = โอเอซิส)
//  spawns = จุดเกิด 7 จุด · shopSpots = จุดที่ร้านค้ามายาสุ่มไปตั้ง (พื้นธรรมดาเท่านั้น)
function buildMap({ area, name, terrain, special = {}, heal, healKind = "heal", spawns, shopSpots }) {
  const t = {};
  for (const [kind, list] of Object.entries(terrain)) for (const [x, y] of list) t[key(x, y)] = kind;
  const sp = {}, flow = {};
  for (const [kind, list] of Object.entries(special)) {
    for (const [x, y, dir] of list) {
      sp[key(x, y)] = kind;
      if (dir) flow[key(x, y)] = dir;
    }
  }
  return {
    area, name, cols: COLS, rows: ROWS,
    terrain: t,
    special: sp,
    flow,
    heal: new Set(heal.map(([x, y]) => key(x, y))),
    healKind,
    spawns: spawns.map(([x, y]) => ({ x, y })),
    shopSpots: shopSpots.map(([x, y]) => ({ x, y })),
  };
}

// ผังทุกภูมิภาค 14×14 (ผู้ใช้ตัดสิน 2026-10-09 — กระดานจัตุรัส) · ASCII ดู GRID_PLAN §3.2
//  จุดเกิด 7 จุดรอบขอบ (บน 2 · ซ้าย 1 · ขวา 1 · ล่าง 3) · จุดร้านค้า 4–6 จุด
//  ช่องอันตราย (หนามพิษ/น้ำวน/ทรายดูด/ลาวา) วางขวาง "ทางหลัก" จากจุดเกิดไปจุดสำคัญ (กลางแผนที่ จุดฟื้นฟู แท่นพลัง จุดร้านค้า)
//  → เลือกเอาว่าจะเดินลุยแล้วเสี่ยงโดนผล หรืออ้อมไกลขึ้น 2+ ก้าว · ทางไม่ผ่านช่องอันตรายระหว่างจุดเกิดทุกคู่ยังมีเสมอ (tests/terrain.test.js)
// I อาณาจักรแห่งจุดเริ่มต้น: ปราสาทอยู่หลังกระดาน (ขอบ y = 0) · ธง 2 ผืนหน้าประตูปราสาท · วงเวทกลาง 4 ช่อง = จุดฟื้นฟู
//   เสาคริสตัล 4 ต้นรอบลานวงเวท · ต้นไม้/พุ่มไม้ = สิ่งกีดขวาง
// II ทุ่งดอกไม้: ดงดอกไม้ล้อมลานกลาง (จุดร้านค้ากลาง) เป็นวง — เข้าลานต้องลุยดอกไม้ (ก้าว 2) · รั้วแบ่งเลนซ้าย/ขวา · กังหันลม 2 ต้น
// III ป่าไม้ต้องสาป: แนวหนามพิษหนา 1–2 ช่องล้อมลานกลาง (จุดร้านค้ากลาง) · ช่องเข้าที่ปลอดภัยเป็นป่าทึบ (ก้าว 2) 4 ทาง
//   ป่าทึบเป็นหย่อมตามขอบ
// IV คลื่นวงวนน้ำ: แม่น้ำกว้าง 2 ช่องพาดกลางแผนที่ (แถว 6–7) เป็นน้ำวนทั้งสาย กระแสไหลจากสองฝั่งเข้าหาซากเรือกลางแผนที่
//   → จบตาในแม่น้ำโดนดูดเข้าหาซากเรือ · ข้ามแบบไม่เสี่ยงต้องอ้อมไปท่าน้ำตื้น (ก้าว 2) ที่คอลัมน์ 2 และ 11
// V ทะเลทราย: วิหารร้างกลางแผนที่ล้อมโอเอซิส 4 ช่อง · ประตูบน/ล่างเป็นทรายดูด 2 ชั้น ประตูซ้าย/ขวาเป็นพื้น
//   แต่หน้าประตูข้างมีแนวทรายดูดตั้งขวาง (อ้อมหัว/ท้ายแนว)
// VI อาณาจักรน้ำแข็ง: ทะเลสาบน้ำแข็งใหญ่กลางแผนที่ (ไถล) · ก้อนน้ำแข็ง 4 ก้อนในทะเลสาบไว้หยุดไถล
// VII จุดสิ้นสุดของโลก: ธารลาวา 4 สายไหลจากขอบ (แนวทแยง) ลงบ่อลาวากลางแผนที่ → แบ่งแผนที่เป็น 4 ฝั่ง ข้ามได้ทางสะพานสายละ 1 จุด
//   แท่นพลัง 2 ช่องกลางแท่นบูชา (ล้อมลาวา ช่องเข้าซ้าย/ขวา) + ริมขอบ 2 ช่อง
const MAPS = {
  1: buildMap({
    area: 1,
    name: "อาณาจักรแห่งจุดเริ่มต้น",
    terrain: {
      tree: [[0, 0], [13, 0], [1, 1], [12, 1], [2, 6], [11, 6], [0, 11], [13, 11], [1, 12], [12, 12]],
      pillar: [[4, 4], [9, 4], [4, 9], [9, 9]],
      banner: [[5, 1], [8, 1]],
      hedge: [[3, 3], [10, 3], [3, 10], [10, 10]],
    },
    heal: [[6, 6], [7, 6], [6, 7], [7, 7]],
    spawns: [[4, 0], [9, 0], [0, 6], [13, 6], [2, 13], [7, 13], [11, 13]],
    shopSpots: [[6, 2], [1, 3], [12, 3], [1, 10], [12, 10], [7, 11]],
  }),
  2: buildMap({
    area: 2,
    name: "ทุ่งดอกไม้",
    terrain: {
      rock: [[0, 0], [13, 0], [2, 6], [11, 6], [2, 7], [11, 7], [0, 12], [13, 12]],
      windmill: [[1, 1], [12, 1]],
      fence: [[1, 3], [2, 3], [3, 3], [10, 3], [11, 3], [12, 3], [1, 10], [2, 10], [3, 10], [10, 10], [11, 10], [12, 10]],
    },
    special: {
      flowers: [[6, 1], [7, 1], [6, 2], [7, 2], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [3, 5], [4, 5], [9, 5], [10, 5], [4, 6], [9, 6], [4, 7], [9, 7], [3, 8], [4, 8], [9, 8], [10, 8], [4, 9], [5, 9], [6, 9], [7, 9], [8, 9], [9, 9], [1, 11], [2, 11], [11, 11], [12, 11], [2, 12], [3, 12], [10, 12], [11, 12]],
    },
    heal: [],
    spawns: [[4, 0], [9, 0], [0, 6], [13, 6], [2, 13], [7, 13], [11, 13]],
    shopSpots: [[2, 2], [11, 2], [6, 6], [5, 11], [8, 11]],
  }),
  3: buildMap({
    area: 3,
    name: "ป่าไม้ต้องสาป",
    terrain: {
      deadtree: [[0, 0], [13, 0], [2, 3], [3, 3], [10, 3], [11, 3], [2, 10], [3, 10], [10, 10], [11, 10], [0, 13], [13, 13]],
      stump: [[2, 5], [11, 5]],
      rock: [[5, 12], [8, 12]],
    },
    special: {
      forest: [[6, 0], [7, 0], [1, 1], [2, 1], [6, 1], [7, 1], [11, 1], [12, 1], [1, 2], [2, 2], [11, 2], [12, 2], [7, 3], [7, 4], [1, 5], [12, 5], [4, 7], [9, 7], [1, 8], [12, 8], [6, 9], [6, 10], [1, 11], [2, 11], [11, 11], [12, 11], [1, 12], [2, 12], [6, 12], [7, 12], [11, 12], [12, 12]],
      thorns: [[5, 3], [6, 3], [8, 3], [4, 4], [5, 4], [6, 4], [8, 4], [9, 4], [4, 5], [9, 5], [4, 6], [9, 6], [4, 8], [9, 8], [4, 9], [5, 9], [7, 9], [8, 9], [9, 9], [5, 10], [7, 10], [8, 10]],
    },
    heal: [],
    spawns: [[3, 0], [10, 0], [0, 6], [13, 6], [2, 13], [7, 13], [11, 13]],
    shopSpots: [[4, 2], [9, 2], [6, 6], [4, 11], [9, 11]],
  }),
  4: buildMap({
    area: 4,
    name: "คลื่นวงวนน้ำ",
    terrain: {
      reef: [[0, 0], [13, 0], [0, 13], [13, 13]],
      rock: [[4, 2], [5, 2], [8, 2], [9, 2], [4, 11], [5, 11], [8, 11], [9, 11]],
      wreck: [[6, 6], [7, 6], [6, 7], [7, 7]],
    },
    special: {
      shallow: [[1, 1], [2, 1], [11, 1], [12, 1], [1, 2], [12, 2], [3, 5], [6, 5], [7, 5], [10, 5], [2, 6], [11, 6], [2, 7], [11, 7], [3, 8], [6, 8], [7, 8], [10, 8], [1, 11], [12, 11], [1, 12], [2, 12], [11, 12], [12, 12]],
      whirl: [[0, 6, "right"], [1, 6, "right"], [3, 6, "right"], [4, 6, "right"], [5, 6, "right"], [8, 6, "left"], [9, 6, "left"], [10, 6, "left"], [12, 6, "left"], [13, 6, "left"], [0, 7, "right"], [1, 7, "right"], [3, 7, "right"], [4, 7, "right"], [5, 7, "right"], [8, 7, "left"], [9, 7, "left"], [10, 7, "left"], [12, 7, "left"], [13, 7, "left"]],
    },
    heal: [],
    spawns: [[4, 0], [9, 0], [0, 4], [13, 4], [2, 13], [7, 13], [11, 13]],
    shopSpots: [[2, 3], [11, 3], [6, 4], [7, 9], [2, 10], [11, 10]],
  }),
  5: buildMap({
    area: 5,
    name: "ทะเลทราย",
    healKind: "oasis",
    terrain: {
      cactus: [[1, 1], [12, 12]],
      dune: [[1, 3], [2, 3], [11, 10], [12, 10]],
      ruin: [[4, 4], [5, 4], [8, 4], [9, 4], [4, 5], [9, 5], [9, 6], [4, 7], [4, 8], [9, 8], [4, 9], [5, 9], [8, 9], [9, 9]],
    },
    special: {
      quicksand: [[6, 3], [7, 3], [2, 4], [6, 4], [7, 4], [2, 5], [2, 6], [11, 6], [2, 7], [11, 7], [11, 8], [6, 9], [7, 9], [11, 9], [6, 10], [7, 10]],
    },
    heal: [[6, 6], [7, 6], [6, 7], [7, 7]],
    spawns: [[4, 0], [9, 0], [0, 5], [13, 8], [2, 13], [7, 13], [11, 13]],
    shopSpots: [[2, 2], [11, 2], [8, 5], [5, 8], [2, 11], [11, 11]],
  }),
  6: buildMap({
    area: 6,
    name: "อาณาจักรน้ำแข็ง",
    terrain: {
      pine: [[0, 0], [1, 0], [12, 0], [13, 0], [0, 1], [13, 1], [0, 12], [13, 12], [0, 13], [1, 13], [12, 13], [13, 13]],
      rock: [[1, 3], [12, 3], [1, 10], [12, 10]],
      iceblock: [[5, 4], [8, 4], [5, 9], [8, 9]],
    },
    special: {
      ice: [[5, 2], [6, 2], [7, 2], [8, 2], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [3, 4], [4, 4], [6, 4], [7, 4], [9, 4], [10, 4], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6], [9, 6], [10, 6], [11, 6], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7], [7, 7], [8, 7], [9, 7], [10, 7], [11, 7], [2, 8], [3, 8], [4, 8], [5, 8], [6, 8], [7, 8], [8, 8], [9, 8], [10, 8], [11, 8], [3, 9], [4, 9], [6, 9], [7, 9], [9, 9], [10, 9], [4, 10], [5, 10], [6, 10], [7, 10], [8, 10], [9, 10], [5, 11], [6, 11], [7, 11], [8, 11]],
    },
    heal: [],
    spawns: [[4, 0], [9, 0], [0, 6], [13, 6], [3, 13], [6, 13], [10, 13]],
    shopSpots: [[3, 2], [10, 2], [3, 11], [10, 11]],
  }),
  7: buildMap({
    area: 7,
    name: "จุดสิ้นสุดของโลก",
    terrain: {
      crystal: [[0, 0], [13, 0], [0, 13], [13, 13]],
      ruin: [[2, 1], [11, 1], [2, 12], [11, 12]],
      obelisk: [[5, 2], [8, 2], [3, 6], [10, 7], [5, 11], [8, 11]],
    },
    special: {
      lava: [[0, 2], [1, 2], [12, 2], [13, 2], [11, 3], [12, 3], [2, 4], [3, 4], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [5, 6], [8, 7], [3, 8], [4, 8], [5, 8], [6, 8], [7, 8], [8, 8], [9, 8], [10, 8], [10, 9], [11, 9], [1, 10], [2, 10], [0, 11], [1, 11], [12, 11], [13, 11]],
      power: [[12, 5], [6, 6], [7, 7], [1, 8]],
    },
    heal: [],
    spawns: [[4, 0], [9, 0], [0, 6], [13, 7], [2, 13], [7, 13], [11, 13]],
    shopSpots: [[6, 3], [11, 6], [2, 7], [7, 10]],
  }),
};

// ภูมิภาคที่ไม่มีแผนที่ (ไม่ควรเกิด) ใช้ของภูมิภาค I
function mapOf(area) {
  return MAPS[area] || MAPS[1];
}

// ---------- พื้นฐาน ----------
function inBounds(map, x, y) {
  return x >= 0 && y >= 0 && x < map.cols && y < map.rows;
}
// blocked = ชุด key ของช่องที่ยืน/เดินผ่านไม่ได้เพิ่มเติม (เช่น แผงร้านค้า)
function isObstacle(map, x, y, blocked) {
  if (!inBounds(map, x, y)) return true;
  if (map.terrain[key(x, y)]) return true;
  return !!(blocked && blocked.has(key(x, y)));
}
function isHeal(map, x, y) {
  return map.heal.has(key(x, y));
}
// ชนิดช่องพิเศษ (TERRAIN_INFO) ของช่องนี้ — ไม่มี = null
function specialAt(map, x, y) {
  return (map.special && map.special[key(x, y)]) || null;
}
// ก้าวที่ใช้เดินเข้าช่องนี้ (พื้นธรรมดา = 1)
function moveCost(map, x, y) {
  const info = TERRAIN_INFO[specialAt(map, x, y)];
  return (info && info.cost) || 1;
}
// หลบหลีกจากช่องที่ยืน (พุ่มดอกไม้สูง/ป่าทึบ) → { kind, name, icon, pct } · ไม่มี = null
function terrainEvade(map, x, y) {
  const kind = specialAt(map, x, y);
  const info = TERRAIN_INFO[kind];
  return info && info.evade ? { kind, name: info.name, icon: info.icon, pct: info.evade } : null;
}
// พลังโจมตีที่ได้จากช่องที่ยืน (แท่นพลัง)
function terrainAtk(map, x, y) {
  const info = TERRAIN_INFO[specialAt(map, x, y)];
  return (info && info.atk) || 0;
}
// พุ่มหญ้า: เลขผืนของช่องนี้ (ช่อง bush ที่ต่อกัน 4 ทิศ = ผืนเดียวกัน) · ไม่ใช่พุ่ม = null
//  คิดครั้งเดียวต่อแผนที่แล้วเก็บไว้ (แผนที่เป็นค่าคงที่)
const bushCache = new WeakMap();
function bushPatchOf(map, x, y) {
  let patches = bushCache.get(map);
  if (!patches) {
    patches = new Map();
    const isBush = (bx, by) => { const info = TERRAIN_INFO[specialAt(map, bx, by)]; return !!(info && info.bush); };
    let next = 0;
    for (let sy = 0; sy < map.rows; sy++) {
      for (let sx = 0; sx < map.cols; sx++) {
        if (!isBush(sx, sy) || patches.has(key(sx, sy))) continue;
        const id = next++;
        const stack = [[sx, sy]];
        patches.set(key(sx, sy), id);
        while (stack.length) {
          const [cx, cy] = stack.pop();
          for (const [dx, dy] of DIRS) {
            const nx = cx + dx, ny = cy + dy;
            if (!inBounds(map, nx, ny) || !isBush(nx, ny) || patches.has(key(nx, ny))) continue;
            patches.set(key(nx, ny), id);
            stack.push([nx, ny]);
          }
        }
      }
    }
    bushCache.set(map, patches);
  }
  const id = patches.get(key(x, y));
  return id === undefined ? null : id;
}
// ข้อมูลช่องสำหรับป้ายบนหน้าจอ → { kind, name, icon, desc } · พื้นธรรมดา/สิ่งกีดขวาง = null
function tileInfo(map, x, y) {
  const kind = isHeal(map, x, y) ? (map.healKind || "heal") : specialAt(map, x, y);
  const info = TERRAIN_INFO[kind];
  return info ? { kind, name: info.name, icon: info.icon, desc: info.desc } : null;
}
// ---------- ตัวใหญ่ (หลายช่อง) ----------
// ขนาดตัว (ด้านละกี่ช่อง) — ไม่ระบุ = 1
function sizeOf(u) {
  return Math.max(1, (u && u.size) | 0);
}
// ผู้เล่น (p.pos + p.boardSize) → กล่องที่ dist ใช้ { x, y, size } · ไม่อยู่บนกระดาน = null
function boxOf(p) {
  return p && p.pos ? { x: p.pos.x, y: p.pos.y, size: Math.max(1, p.boardSize | 0) } : null;
}
// ช่องทั้งหมดที่ตัวขนาด size ยืนที่มุม (x, y) กินอยู่
function footprint(x, y, size = 1) {
  const out = [];
  for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) out.push({ x: x + dx, y: y + dy });
  return out;
}
// ช่อง (x, y) อยู่ในตัวของ u ไหม
function covers(u, x, y) {
  const s = sizeOf(u);
  return x >= u.x && x < u.x + s && y >= u.y && y < u.y + s;
}
// ระยะแมนฮัตตันระหว่างขอบที่ใกล้สุดของสองกล่อง (ตัว 1 ช่อง = |dx| + |dy| ตามเดิม · ทับกัน = 0)
function dist(a, b) {
  const as = sizeOf(a), bs = sizeOf(b);
  const dx = Math.max(0, a.x - (b.x + bs - 1), b.x - (a.x + as - 1));
  const dy = Math.max(0, a.y - (b.y + bs - 1), b.y - (a.y + as - 1));
  return dx + dy;
}
// range = [rmin, rmax] (ตีปกติ) — ประชิด = [1, 1] · ธนู = [2, 2]
function inRange(range, d) {
  return d >= range[0] && d <= range[1];
}
function unitAt(units, x, y) {
  return units.find((u) => u.alive && covers(u, x, y)) || null;
}

// ช่องนี้ว่างให้ไถล/ถูกดันเข้าไปไหม: ในกระดาน ไม่ใช่สิ่งกีดขวาง/blocked และไม่มีใครยืน (ยกเว้น selfId)
function freeTile(map, x, y, units, selfId, blocked) {
  if (isObstacle(map, x, y, blocked)) return false;
  const other = unitAt(units, x, y);
  return !other || other.id === selfId;
}

// ---------- การเดิน ----------
// หาช่องที่เดินถึงไม่เกิน mov ก้าว (4 ทิศ) · คืน Map<key, { x, y, d, prev }> ของช่องที่ "หยุดได้" รวมช่องเริ่ม
//  เดินผ่านพวกเดียวกันได้ (isAlly) แต่หยุดทับไม่ได้ · ผ่านศัตรูไม่ได้ · ผ่านสิ่งกีดขวาง/blocked ไม่ได้
//  ช่องพิเศษ (TERRAIN_INFO): ค่าเดินรายช่อง 1 หรือ 2 → Dijkstra แบบถังตามจำนวนก้าว (ก้าวน้อยสุดชนะ เท่ากัน = เจอก่อนชนะ)
//   - เดินเข้าช่อง cost 2 ต้องเหลือก้าวพอ
//   - ทรายดูด (stop): หยุดได้แต่เดินต่อจากช่องนั้นไม่ได้ (ยืนอยู่บนทรายดูดตั้งแต่ต้นตา = เดินออกได้ตามปกติ)
//   - น้ำแข็ง (slide): เดินเข้าแล้วไถลต่อ 1 ช่องในทิศเดิมโดยไม่เสียก้าว ถ้าช่องนั้นว่าง (ไม่มีใครยืน)
//     → ช่องน้ำแข็งเป็นแค่ทางผ่าน (อยู่ใน prev ให้ pathTo วาดการไถล) · ไถลไม่ได้ = หยุดบนน้ำแข็ง
//     ช่องที่ไถลไปลงไม่ไถลซ้ำ และไม่เสียค่าเดินของช่องนั้น
function reachable(map, unit, mov, units, opts = {}) {
  if (sizeOf(unit) > 1) return reachableBig(map, unit, mov, units, opts);
  const { isAlly = () => false, blocked = null } = opts;
  const start = { x: unit.x, y: unit.y, d: 0, prev: null };
  const best = new Map([[key(unit.x, unit.y), start]]); // ช่องที่ไปยืนได้ระหว่างทาง (รวมช่องที่มีเพื่อนยืน) → โหนดที่ใช้ก้าวน้อยสุด
  const stops = new Map([[key(unit.x, unit.y), start]]);
  const buckets = [[start]];
  const occupant = (x, y) => {
    const o = unitAt(units, x, y);
    return o && o.id !== unit.id ? o : null;
  };
  const visit = (node) => {
    const k = key(node.x, node.y);
    const old = best.get(k);
    if (old && old.d <= node.d) return;
    best.set(k, node);
    (buckets[node.d] ||= []).push(node);
    if (!occupant(node.x, node.y)) stops.set(k, node); // ช่องที่มีเพื่อนยืนอยู่ = ผ่านได้แต่หยุดไม่ได้
  };
  for (let d = 0; d < buckets.length; d++) {
    for (const cur of buckets[d] || []) {
      if (best.get(key(cur.x, cur.y)) !== cur) continue; // มีทางที่ใช้ก้าวน้อยกว่าแล้ว
      if (cur !== start && specialAt(map, cur.x, cur.y) === "quicksand") continue; // ทรายดูด: หยุดทันที
      for (const [dx, dy] of DIRS) {
        const nx = cur.x + dx, ny = cur.y + dy;
        if (isObstacle(map, nx, ny, blocked)) continue;
        const other = occupant(nx, ny);
        if (other && !isAlly(unit, other)) continue; // ศัตรูขวางทาง
        const nd = cur.d + moveCost(map, nx, ny);
        if (nd > mov) continue;
        const node = { x: nx, y: ny, d: nd, prev: cur };
        if (specialAt(map, nx, ny) === "ice" && freeTile(map, nx + dx, ny + dy, units, unit.id, blocked)) {
          visit({ x: nx + dx, y: ny + dy, d: nd, prev: node }); // ไถลต่อ 1 ช่อง
        } else {
          visit(node);
        }
      }
    }
  }
  return stops;
}
// ตัวใหญ่ (size > 1) ตรวจว่ายืนที่มุม (x, y) ได้ไหม → null = ไม่ได้ · { ally, rubble }
//  ทั้งตัวต้องอยู่ในกระดาน · ไม่ทับ blocked (ร้านค้า) · ไม่ทับศัตรู (ทับเพื่อน = ผ่านได้แต่หยุดไม่ได้ → ally)
//  สิ่งกีดขวาง: smash = พังได้ (ทับได้ · rubble = มีของต้องพัง) · ไม่ smash = ยืนไม่ได้
function bigFits(map, unit, x, y, units, { isAlly = () => false, blocked = null, smash = false } = {}) {
  const s = sizeOf(unit);
  if (x < 0 || y < 0 || x + s > map.cols || y + s > map.rows) return null;
  let rubble = false, ally = false;
  for (const t of footprint(x, y, s)) {
    const k = key(t.x, t.y);
    if (blocked && blocked.has(k)) return null;
    if (map.terrain[k]) { if (!smash) return null; rubble = true; }
  }
  const box = { x, y, size: s };
  for (const o of units) {
    if (!o.alive || o.id === unit.id || dist(box, o) > 0) continue;
    if (!isAlly(unit, o)) return null;
    ally = true;
  }
  return { ally, rubble };
}
// การเดินของตัวใหญ่ (GRID_PLAN — Echo ขยายร่าง) · คืนรูปเดียวกับ reachable (คีย์ = ช่องมุมบนซ้าย)
//  ก้าวละ 1 ช่องทั้งตัว · ไม่สนค่าเดิน/ทรายดูด/น้ำแข็งของช่องพิเศษ (ก้าวข้ามได้)
//  smash: เดินพังสิ่งกีดขวางได้ — ก้าวที่ขอบหน้าตัวชนของใหม่ กินเพิ่ม 1 ก้าว
function reachableBig(map, unit, mov, units, opts = {}) {
  const s = sizeOf(unit);
  const start = { x: unit.x, y: unit.y, d: 0, prev: null };
  const best = new Map([[key(unit.x, unit.y), start]]);
  const stops = new Map([[key(unit.x, unit.y), start]]);
  const buckets = [[start]];
  for (let d = 0; d < buckets.length; d++) {
    for (const cur of buckets[d] || []) {
      if (best.get(key(cur.x, cur.y)) !== cur) continue;
      for (const [dx, dy] of DIRS) {
        const nx = cur.x + dx, ny = cur.y + dy;
        const fit = bigFits(map, unit, nx, ny, units, opts);
        if (!fit) continue;
        // ขอบหน้าตัว (แถว/คอลัมน์ที่เพิ่งก้าวเข้า) มีสิ่งกีดขวาง = ต้องพัง +1 ก้าว
        let edge = false;
        if (fit.rubble) {
          for (let i = 0; i < s && !edge; i++) {
            const ex = dx > 0 ? nx + s - 1 : dx < 0 ? nx : nx + i;
            const ey = dy > 0 ? ny + s - 1 : dy < 0 ? ny : ny + i;
            if (map.terrain[key(ex, ey)]) edge = true;
          }
        }
        const nd = cur.d + 1 + (edge ? 1 : 0);
        if (nd > mov) continue;
        const k = key(nx, ny);
        const old = best.get(k);
        if (old && old.d <= nd) continue;
        const node = { x: nx, y: ny, d: nd, prev: cur };
        best.set(k, node);
        (buckets[nd] ||= []).push(node);
        if (!fit.ally) stops.set(k, node);
      }
    }
  }
  return stops;
}
// ขยายร่าง: หามุมใหม่ของตัวขนาด newSize ที่ครอบตัวเดิมไว้ทั้งหมด → { x, y, displaced: [id], rubble: ["x,y"] } · ไม่มีที่ = null
//  เลือกมุมที่ไล่คนออกน้อยสุด → พังของน้อยสุด → ใกล้กลางตัวเดิมสุด · คนในช่องใหม่ = ถูกผลักออก (pushOutTile)
//  smash = พังสิ่งกีดขวางได้ (ไม่ได้ = ช่องใหม่ต้องไม่มีสิ่งกีดขวาง) · blocked (ร้านค้า) ทับไม่ได้เสมอ
function growPlan(map, unit, newSize, units, { blocked = null, smash = false } = {}) {
  const s0 = sizeOf(unit), grow = newSize - s0;
  if (grow <= 0) return null;
  let best = null;
  for (let oy = -grow; oy <= 0; oy++) {
    for (let ox = -grow; ox <= 0; ox++) {
      const x = unit.x + ox, y = unit.y + oy;
      if (x < 0 || y < 0 || x + newSize > map.cols || y + newSize > map.rows) continue;
      const tiles = footprint(x, y, newSize);
      if (blocked && tiles.some((t) => blocked.has(key(t.x, t.y)))) continue;
      const rubble = tiles.filter((t) => map.terrain[key(t.x, t.y)]).map((t) => key(t.x, t.y));
      if (rubble.length && !smash) continue;
      const box = { x, y, size: newSize };
      const displaced = units.filter((o) => o.alive && o.id !== unit.id && dist(box, o) === 0).map((o) => o.id);
      const off = Math.abs(ox * 2 + grow) + Math.abs(oy * 2 + grow);
      const score = displaced.length * 100 + rubble.length * 10 + off;
      if (!best || score < best.score) best = { x, y, displaced, rubble, score };
    }
  }
  if (!best) return null;
  return { x: best.x, y: best.y, displaced: best.displaced, rubble: best.rubble };
}
// ช่องว่างที่ใกล้ from ที่สุดนอกกล่อง avoid (ถูกผลักออกตอนตัวใหญ่ขยาย) — ไม่ใช่สิ่งกีดขวาง/blocked/ไม่มีคน · ไม่มีเลย = null
//  ระยะเท่ากันเลือกช่องที่ห่างกลางกล่องมากกว่า (ผลักออกไปข้างนอก)
function pushOutTile(map, from, avoid, units, { selfId = null, blocked = null } = {}) {
  const ac = { x: avoid.x + (sizeOf(avoid) - 1) / 2, y: avoid.y + (sizeOf(avoid) - 1) / 2 };
  let best = null;
  for (let y = 0; y < map.rows; y++) {
    for (let x = 0; x < map.cols; x++) {
      if (covers(avoid, x, y) || !freeTile(map, x, y, units, selfId, blocked)) continue;
      const d = Math.abs(x - from.x) + Math.abs(y - from.y);
      const away = Math.abs(x - ac.x) + Math.abs(y - ac.y);
      if (!best || d < best.d || (d === best.d && away > best.away)) best = { x, y, d, away };
    }
  }
  return best ? { x: best.x, y: best.y } : null;
}
// วางตัวใหญ่ใกล้จุด near (เปลี่ยนภูมิภาค/จุดเกิด): มุมที่ใกล้ near สุดซึ่งยืนได้โดยไม่ทับใคร → { x, y, rubble } · ไม่มี = null
function placeBig(map, size, near, units, { selfId = null, blocked = null, smash = false } = {}) {
  let best = null;
  const unit = { id: selfId, x: 0, y: 0, size };
  for (let y = 0; y + size <= map.rows; y++) {
    for (let x = 0; x + size <= map.cols; x++) {
      const fit = bigFits(map, unit, x, y, units, { blocked, smash });
      if (!fit || fit.ally) continue;
      const d = dist({ x, y, size }, near);
      if (!best || d < best.d) best = { x, y, d };
    }
  }
  if (!best) return null;
  const rubble = footprint(best.x, best.y, size).filter((t) => map.terrain[key(t.x, t.y)]).map((t) => key(t.x, t.y));
  return { x: best.x, y: best.y, rubble };
}
// เส้นทางจากช่องเริ่มถึงช่องปลาย (รวมทั้งสองปลาย) · ไปไม่ถึง = null
function pathTo(reach, x, y) {
  let node = reach.get(key(x, y));
  if (!node) return null;
  const path = [];
  while (node) { path.unshift({ x: node.x, y: node.y }); node = node.prev; }
  return path;
}

// ---------- ระยะ / พื้นที่ ----------
// ช่องในกระดานที่ห่างจาก (x, y) อยู่ในช่วง [rmin, rmax] · size = ตัวใหญ่ (นับจากขอบตัว — ช่องในตัวเองห่าง 0)
function tilesInRange(map, x, y, range, size = 1) {
  const out = [];
  const box = { x, y, size };
  for (let tx = x - range[1]; tx <= x + size - 1 + range[1]; tx++) {
    for (let ty = y - range[1]; ty <= y + size - 1 + range[1]; ty++) {
      if (inRange(range, dist(box, { x: tx, y: ty })) && inBounds(map, tx, ty)) out.push({ x: tx, y: ty });
    }
  }
  return out;
}
// สกิลตีหมู่ "รอบตัว N" = ข้าวหลามตัดรัศมี N (ไม่รวมช่องที่ยืน)
function aoeTiles(map, x, y, radius, size = 1) {
  return tilesInRange(map, x, y, [1, radius], size);
}
// สกิลแนว "ทิศทาง L×W": ยาว len ช่องไปทาง dir เริ่มจากช่องติดตัว กว้าง width ช่อง (กลางตรงแนวตัวเรา)
//  width ควรเป็นเลขคี่ (4×3 = ท่าไม้ตายมุยมิ)
function lineTiles(map, x, y, dir, len, width) {
  const v = LINE_DIRS[dir];
  if (!v) return [];
  const [fx, fy] = v;
  const sx = -fy, sy = fx; // แกนขวาง (ตั้งฉากกับทิศ)
  const half = Math.floor(width / 2);
  const out = [];
  for (let i = 1; i <= len; i++) {
    for (let j = -half; j <= half; j++) {
      const tx = x + fx * i + sx * j, ty = y + fy * i + sy * j;
      if (inBounds(map, tx, ty)) out.push({ x: tx, y: ty });
    }
  }
  return out;
}
// ผู้เล่นที่ยังอยู่ซึ่งยืนในชุดช่องที่ให้มา (ตัวใหญ่ = ช่องไหนของตัวโดนก็นับ)
function unitsOnTiles(units, tiles) {
  const set = new Set(tiles.map((t) => key(t.x, t.y)));
  return units.filter((u) => u.alive && footprint(u.x, u.y, sizeOf(u)).some((t) => set.has(key(t.x, t.y))));
}
// เป้าที่ตีปกติได้จากช่อง (x, y) ด้วยระยะ range (ไม่รวมตัวเองและพวกเดียวกัน)
function attackTargets(attacker, x, y, range, units, { isAlly = () => false } = {}) {
  const from = { x, y, size: sizeOf(attacker) };
  return units.filter((u) => u.alive && u.id !== attacker.id && !isAlly(attacker, u) && inRange(range, dist(from, u)));
}

// ---------- ตีสวน / ถอย ----------
// ผู้โดนตี (ยังรอด) สวนได้ไหม: ผู้ตีต้องอยู่ในระยะโจมตีของผู้โดนตี
function canCounter(defenderRange, attackerPos, defenderPos) {
  return inRange(defenderRange, dist(attackerPos, defenderPos));
}
// หลังโดนสวน ผู้ตีถอย 1 ช่องออกจากผู้สวน
//  ทิศ: ตามแกนที่ห่างกันมากกว่า · ห่างเท่ากัน (แนวทแยง) ลองแกนตั้งก่อนแล้วแกนนอน
//  ไม่มีช่องว่างให้ถอย (สิ่งกีดขวาง/ขอบ/ตัวละคร/blocked) = ไม่ขยับ และ collide = true (ชน −1)
//  ถอยลงน้ำแข็ง = ไถลต่ออีก 1 ช่องในทิศเดิมถ้าว่าง (รวมถอย 2 ช่อง) → มี via = ช่องน้ำแข็งที่ไถลผ่าน (ไม่ไถล = ไม่มี via)
function pushback(map, attackerPos, defenderPos, units, { selfId = null, blocked = null } = {}) {
  const dx = attackerPos.x - defenderPos.x, dy = attackerPos.y - defenderPos.y;
  const sx = Math.sign(dx), sy = Math.sign(dy);
  let dirs;
  if (Math.abs(dx) > Math.abs(dy)) dirs = [[sx, 0]];
  else if (Math.abs(dy) > Math.abs(dx)) dirs = [[0, sy]];
  else dirs = [[0, sy], [sx, 0]];
  const dir = dirs.find(([ux, uy]) => freeTile(map, attackerPos.x + ux, attackerPos.y + uy, units, selfId, blocked));
  if (!dir) return { x: attackerPos.x, y: attackerPos.y, moved: false, collide: true };
  const nx = attackerPos.x + dir[0], ny = attackerPos.y + dir[1];
  if (specialAt(map, nx, ny) === "ice" && freeTile(map, nx + dir[0], ny + dir[1], units, selfId, blocked)) {
    return { x: nx + dir[0], y: ny + dir[1], moved: true, collide: false, via: { x: nx, y: ny } };
  }
  return { x: nx, y: ny, moved: true, collide: false };
}

// ---------- ผลของช่องตอนจบตา ----------
// ผลของช่องพิเศษที่ยูนิตยืนอยู่ตอนจบตาของตัวเอง (จุดฟื้นฟูแยกไว้ที่ isHeal) → descriptor ให้ phases/action.js ลงผล
//  { kind: "thorns", turns }  = ติดพิษร้าย (ผู้เรียกเช็คต้านสถานะเอง)
//  { kind: "lava", dmg }      = เสียพลังชีวิต (ลดเกราะก่อน)
//  { kind: "whirl", dir, to } = โดนกระแสดัน 1 ช่องตาม map.flow · to = null เมื่อช่องนั้นไม่ว่าง (ไม่ขยับ)
//  ช่องอื่น = null
function endTurnTile(map, x, y, units = [], { selfId = null, blocked = null } = {}) {
  const kind = specialAt(map, x, y);
  const info = TERRAIN_INFO[kind];
  if (!info || !info.end) return null;
  if (info.end === "thorns") return { kind, turns: info.poison };
  if (info.end === "lava") return { kind, dmg: info.dmg };
  if (info.end === "whirl") {
    const dir = map.flow && map.flow[key(x, y)];
    const v = LINE_DIRS[dir];
    if (!v) return null;
    const to = freeTile(map, x + v[0], y + v[1], units, selfId, blocked) ? { x: x + v[0], y: y + v[1] } : null;
    return { kind, dir, to };
  }
  return null;
}

// ---------- ระยะอันตราย ----------
// ช่องทั้งหมดที่ unit "เดินแล้วตีถึง" ในตาเดียว (ไฮไลต์แดงตอนเลือกเดิน / ปุ่มระยะอันตราย)
//  คืน { move: Set<key>, threat: Set<key> } — threat ไม่รวมช่องที่เดินถึงได้อยู่แล้ว
//  ตัวใหญ่: move = ทุกช่องที่ตัวไปทับได้ (รวมทั้งตัว ไม่ใช่แค่มุม)
function threatZone(map, unit, mov, range, units, opts = {}) {
  const reach = reachable(map, unit, mov, units, opts);
  const s = sizeOf(unit);
  const move = new Set();
  for (const n of reach.values()) for (const t of footprint(n.x, n.y, s)) move.add(key(t.x, t.y));
  const threat = new Set();
  for (const n of reach.values()) {
    for (const t of tilesInRange(map, n.x, n.y, range, s)) {
      const k = key(t.x, t.y);
      if (!move.has(k)) threat.add(k);
    }
  }
  return { move, threat };
}

// ---------- จุดเกิด / ร้านค้า ----------
// แจกจุดเกิดตอนเริ่มเกม/เปลี่ยนภูมิภาค: สุ่ม · โหมดทีมให้เพื่อนร่วมทีมได้จุดที่อยู่ติดกัน
//  (จุดเกิดเรียงตามมุมรอบกลางกระดาน → ทีมได้จุดที่ต่อกันเป็นช่วง)
//  players = [{ id, teamId? }] · คืน { [id]: { x, y } } · คนเกินจำนวนจุดเกิดไม่ได้ช่อง (ห้องรับได้ 7 = จุดเกิด 7)
function assignSpawns(map, players, { teamMode = false, rng = Math.random } = {}) {
  const cx = (map.cols - 1) / 2, cy = (map.rows - 1) / 2;
  const ring = [...map.spawns].sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  // เรียงผู้เล่นเป็นก้อนตามทีม (ลำดับทีมสุ่ม) แล้ววางลงวงจุดเกิดเริ่มจากจุดสุ่ม
  let order;
  if (teamMode) {
    const groups = {};
    for (const p of players) (groups[p.teamId || `_${p.id}`] ||= []).push(p);
    order = shuffle(Object.values(groups)).flatMap((g) => shuffle(g));
  } else {
    order = shuffle(players);
  }
  const offset = Math.floor(rng() * ring.length);
  const out = {};
  order.forEach((p, i) => {
    if (i >= ring.length) return;
    const s = ring[(offset + i) % ring.length];
    out[p.id] = { x: s.x, y: s.y };
  });
  return out;
}
// สุ่มจุดตั้งร้านค้ามายา: ไม่ซ้ำจุดเดิม · ข้ามจุดที่มีคนยืน · ไม่มีจุดว่างเลย = คงจุดเดิม (หรือ null)
function pickShopSpot(map, units, prev, rng = Math.random) {
  const free = map.shopSpots.filter((s) => !unitAt(units, s.x, s.y) && !(prev && s.x === prev.x && s.y === prev.y));
  if (!free.length) return prev || null;
  const s = free[Math.floor(rng() * free.length)];
  return { x: s.x, y: s.y };
}
// ยืนติดร้าน (ระยะ 1) ถึงซื้อได้
function nearShop(pos, shopPos) {
  return !!shopPos && dist(pos, shopPos) === 1;
}

module.exports = {
  COLS, ROWS, DIRS, LINE_DIRS, MAPS, TERRAIN_INFO,
  key, mapOf, inBounds, isObstacle, isHeal, dist, inRange, unitAt,
  sizeOf, boxOf, footprint, covers, bigFits, growPlan, pushOutTile, placeBig,
  specialAt, moveCost, terrainEvade, terrainAtk, tileInfo, freeTile, bushPatchOf,
  reachable, reachableBig, pathTo,
  tilesInRange, aoeTiles, lineTiles, unitsOnTiles, attackTargets,
  canCounter, pushback, threatZone, endTurnTile,
  assignSpawns, pickShopSpot, nearShop,
};
