// ⚠️ ไฟล์นี้สร้างอัตโนมัติจาก server/board.js — ห้ามแก้ตรงนี้ (แก้ที่ server แล้วรัน node scripts/gen-board-rules.js)
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
// ---------- กระดานต่อวงรอบ (โหมด Colony — GRID_PLAN §8.3) ----------
//  แผนที่ที่ map.wrap = true: คอลัมน์ต่อกันเป็นวง (x = -1 คือ cols-1) · ระยะ/เดิน/พื้นที่สกิลนับแบบวงรอบ
//  WRAP = จำนวนคอลัมน์ของกระดานที่ใช้อยู่ (0 = กระดานธรรมดา) — engine ตั้งตอนวางกระดาน (setWrap) เพราะ dist/covers ไม่ได้รับ map
//  พิกัด x ที่ฟังก์ชันในไฟล์นี้คืนออกไป ถูกจัดเข้าช่วง 0..cols-1 เสมอ (wx) · ค้นช่อง/คนด้วย x นอกช่วงได้ (จัดให้เอง)
//  กำแพงกั้นปล้อง: map.walls = แถว r ที่เดินจาก r ไป r+1 ไม่ได้ ยกเว้นคอลัมน์ประตู map.doors (ตัวใหญ่ 2×2+ ผ่านได้ — ตัวใหญ่เบียดได้)
//  ปล้องที่ปิดผนึกแล้ว: map.minRow = แถวแรกที่ยังอยู่ในกระดาน (แถวต่ำกว่า = นอกกระดาน)
let WRAP = 0;
function setWrap(cols) { WRAP = Math.max(0, cols | 0); }
// ฟังก์ชันที่รับ map ตั้ง WRAP ตามแผนที่นั้นเอง (เทสต์/โค้ดที่สลับแผนที่ไปมาได้ผลถูก)
function syncWrap(map) { const w = map && map.wrap ? map.cols : 0; if (w !== WRAP) WRAP = w; }
const wrapCols = () => WRAP;
const wx = (x) => (WRAP ? ((x % WRAP) + WRAP) % WRAP : x);
// ส่วนต่างคอลัมน์ a → b ที่สั้นสุด (กระดานธรรมดา = b − a)
const wdx = (a, b) => { if (!WRAP) return b - a; let d = ((b - a) % WRAP + WRAP) % WRAP; if (d > WRAP / 2) d -= WRAP; return d; };
const tk = (x, y) => key(wx(x), y);
// ก้าว (x, y) → (x, ny) ข้ามกำแพงกั้นปล้องไหม (ประตู = ผ่านได้)
function wallBlocks(map, x, y, ny) {
  if (!map.walls || ny === y) return false;
  const lo = Math.min(y, ny);
  return map.walls.includes(lo) && !(map.doors || []).includes(wx(x));
}
// สิ่งกีดขวางที่พังไม่ได้ (ตัวใหญ่เดิน/ขยายทับไม่ได้) — ผนึกมิโกะของห่วงเวลาซีโร่ (GRID_PLAN §8.2)
const UNBREAKABLE = new Set(["seal", "chasm", "breach"]); // breach = รอยรั่วของ Colony (server/colony.js) // chasm = ช่องพังของเรียวกิ (GRID_PLAN §7.17) — ตัวใหญ่เดินพังไม่ได้

// ---------- ช่องพิเศษ (GRID_PLAN §3.1 — แนว Fire Emblem) ----------
//  ยืน/เดินผ่านได้ทุกชนิด (ต่างจากสิ่งกีดขวาง) · ไม่มีผลกับระยะตี/สกิล
//  name/icon/desc = ป้ายข้อมูลช่องบนหน้าจอ · ตัวเลขกติกา:
//   cost  = ก้าวที่ใช้เดินเข้าช่องนี้ (ไม่ระบุ = 1)
//   evade = ยืนอยู่แล้วหลบหลีกการโจมตีปกติ/ตีสวน/สกิลที่ตีด้วยพลังโจมตี +N% (แม่นยำเจาะได้ — phases/attack.js)
//   stop  = เดินเข้าแล้วหยุดทันที (ก้าวที่เหลือหายหมด) · slide = เดินเข้าแล้วไถลไปทิศเดิมจนสุดแนวน้ำแข็ง (จบการเดิน — slideLine)
//   atk   = ยืนอยู่แล้วพลังโจมตี +N (computeAttackBase) · end = ผลตอนจบตาบนช่องนี้ (endTurnTile)
//   bush  = พุ่มหญ้า: ยืนอยู่แล้วศัตรูมองไม่เห็น ยกเว้นคนที่ยืนในพุ่มผืนเดียวกัน (bushPatchOf — server/visibility.js)
//   flower = ช่องดอกไม้ — เดินตามได้ไม่เสียก้าวเมื่อ opts.flowerWalk (ท่าไม้ตายเซลิน "ราชาดอกไม้" — stepCost)
//  heal / oasis = จุดฟื้นฟู (map.heal) — ชื่อตามภูมิภาค (map.healKind)
const TERRAIN_INFO = {
  heal: { name: "วงเวทฟื้นฟู", icon: "✨", desc: "จบตา ฟื้นพลังชีวิต +1" },
  oasis: { name: "โอเอซิส", icon: "🌴", desc: "จบตา ฟื้นพลังชีวิต +1" },
  flowers: { name: "พุ่มดอกไม้สูง", icon: "🌸", desc: "เดิน 2 ก้าว · หลบหลีก +20% · ซ่อนตัว", cost: 2, evade: 20, bush: true, flower: true },
  bloom: { name: "พุ่มดอกไม้", icon: "🌷", desc: "หลบหลีก +20% · ซ่อนตัว", evade: 20, bush: true, flower: true }, // เซลิน (ชั้นทับช่องเดิม — server/flora.js)
  forest: { name: "ป่าทึบ", icon: "🌲", desc: "เดิน 2 ก้าว · หลบหลีก +20% · ซ่อนตัว", cost: 2, evade: 20, bush: true },
  thorns: { name: "หนามพิษ", icon: "🥀", desc: "จบตา ติดพิษร้าย 1 เทิร์น", end: "thorns", poison: 1 },
  shallow: { name: "น้ำตื้น", icon: "💧", desc: "เดิน 2 ก้าว", cost: 2 },
  whirl: { name: "น้ำวน", icon: "🌀", desc: "จบตา ถูกดัน 1 ช่องตามกระแส", end: "whirl" },
  quicksand: { name: "ทรายดูด", icon: "⏳", desc: "เดินเข้าแล้วหยุด", stop: true },
  ice: { name: "น้ำแข็งลื่น", icon: "🧊", desc: "ไถลจนสุดแนว", slide: true },
  wet: { name: "พื้นเปียก", icon: "💦", desc: "ไถลจนสุดแนว", slide: true }, // แจกันใส่น้ำของเอมิลิโกะ (server/wet.js) — กติกาไถลเดียวกับน้ำแข็ง
  lava: { name: "ลาวา", icon: "🌋", desc: "จบตา เสียหาย 1", end: "lava", dmg: 1 },
  power: { name: "แท่นพลัง", icon: "🔮", desc: "พลังโจมตี +1", atk: 1 },
  lift: { name: "ลิฟต์แกนกลาง", icon: "⏫", desc: "จบตา ดีดขึ้น 4 แถว", end: "lift" }, // Colony (GRID_PLAN §8.3)
};

// ---------- แผนที่รายภูมิภาค ----------
//  terrain = สิ่งกีดขวาง (ชนิดใช้แค่ตอนวาด — กติกาเหมือนกันหมด: เดินผ่าน/ยืนไม่ได้ ไม่บังการตี)
//  special = ช่องพิเศษ { ชนิด: [[x, y]…] } (กติกาตาม TERRAIN_INFO) · น้ำวนใส่ทิศกระแส [x, y, "up"|"down"|"left"|"right"]
//    → map.special = { "x,y": ชนิด } · map.flow = { "x,y": ทิศ }
//  heal = จุดฟื้นฟู (จบตาบนช่องนี้ เลือด +1) · healKind = ชื่อจุดฟื้นฟูใน TERRAIN_INFO (ทะเลทราย = โอเอซิส)
//  spawns = จุดเกิด 7 จุด · shopSpots = จุดที่ร้านค้ามายาสุ่มไปตั้ง (พื้นธรรมดาเท่านั้น)
function buildMap({ area, name, terrain, special = {}, heal, healKind = "heal", spawns, shopSpots, cols = COLS, rows = ROWS }) {
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
    area, name, cols, rows,
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
// VI อาณาจักรน้ำแข็ง: แนวน้ำแข็งกว้าง 1 ช่อง ยาว 4–5 ช่อง กระจายทั่วแผนที่ (ไถลจนสุดแนว) · กลางแผนที่เป็นกังหัน 4 แนวชนก้อนน้ำแข็ง 2 ก้อน
//   แนวมุมชนต้นสน/หิน/ก้อนน้ำแข็ง หรือไถลออกไปถึงขอบกระดาน · ทุกช่องน้ำแข็งเป็นจุดหยุดได้ (เข้าจากด้านข้าง)
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
      rock: [[11, 5], [2, 8]],
      iceblock: [[5, 1], [7, 6], [6, 7], [8, 12]],
    },
    special: {
      ice: [[11, 0], [1, 1], [2, 1], [3, 1], [4, 1], [11, 1], [7, 2], [11, 2], [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [7, 3], [11, 3], [7, 4], [11, 4], [7, 5], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [7, 7], [8, 7], [9, 7], [10, 7], [11, 7], [6, 8], [2, 9], [6, 9], [2, 10], [6, 10], [9, 10], [10, 10], [11, 10], [12, 10], [13, 10], [2, 11], [6, 11], [2, 12], [9, 12], [10, 12], [11, 12], [12, 12], [2, 13]],
    },
    heal: [],
    spawns: [[4, 0], [9, 0], [0, 6], [13, 6], [3, 13], [6, 13], [10, 13]],
    shopSpots: [[9, 3], [3, 4], [10, 9], [4, 10]],
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

// ---------- ห่วงเวลาซีโร่ (GRID_PLAN §8.2) ----------
//  สนามเฉพาะ 14×14 ไม่มีสิ่งกีดขวางอื่นนอกจากผนึกมิโกะ 4 มุม (พังไม่ได้ด้วยการเดิน/ขยายร่าง — ตีได้อย่างเดียว ที่ server/zeroTime.js)
//  area 8–11 = ระดับ 1–4 (ผนึกแตก 0–3 อัน) ผังเดียวกัน — ต่างกันแค่หน้าตาที่ client วาด (ยิ่งใกล้ปลดผนึกยิ่งมืด)
//  ผนึก: 0 = มุมไกลซ้าย (เหนือ) · 1 = มุมไกลขวา (ตะวันออก) · 2 = มุมใกล้ขวา (ใต้) · 3 = มุมใกล้ซ้าย (ตะวันตก)
const ZERO_AREA = 8;
const ZERO_STAGES = 4;
const ZERO_SEALS = [[0, 0], [13, 0], [13, 13], [0, 13]];
const isZeroArea = (area) => Number(area) >= ZERO_AREA && Number(area) < ZERO_AREA + ZERO_STAGES;
for (let i = 0; i < ZERO_STAGES; i++) {
  MAPS[ZERO_AREA + i] = buildMap({
    area: ZERO_AREA + i,
    name: "ห่วงเวลาซีโร่",
    terrain: { seal: ZERO_SEALS },
    heal: [],
    spawns: [[4, 1], [9, 1], [1, 6], [12, 7], [3, 12], [7, 12], [10, 12]],
    shopSpots: [],
  });
}

// ---------- Colony (GRID_PLAN §8.3) ----------
//  ผิวด้านในของกระบอก คลี่เป็น 16 คอลัมน์ (ต่อวงรอบ) × 40 แถว · ปล้องละ 10 แถว (0–9 · 10–19 · 20–29 · ปล้องสุดท้าย 30–39)
//  กำแพงกั้นปล้องอยู่ระหว่างแถว 9|10 · 19|20 · 29|30 ประตู 4 บาน (คอลัมน์ 0 · 4 · 8 · 12)
//  แถบกระจก (คอลัมน์ 1 · 6 · 11) = พื้นธรรมดา (ใช้แค่ตอนวาด) · ลิฟต์แกนกลาง 6 จุด (จบตา = ดีดขึ้น 4 แถว)
//  เขตตามปล้อง (ผู้ใช้สั่ง: สภาพแวดล้อมจำลองจากโลก): บ้านพัก · ป่า + บึง (น้ำตื้น) · ใจกลางเมือง (ตึก) · สวนชมวิว (ต้นไม้ + สระ)
//  ผังสุ่มแบบกำหนดค่า (seed คงที่ — ต้นแบบ .claude/plans/colony.html genMap) · จุดเกิด 7 จุดแถว 1 กระจายรอบวง
const COLONY_AREA = 20;
const COLONY = { cols: 16, rows: 40, section: 10, walls: [9, 19, 29], doors: [0, 4, 8, 12], glass: [1, 6, 11],
  lifts: [[2, 7], [10, 7], [5, 17], [13, 17], [7, 27], [15, 27]] };
function buildColonyMap() {
  let s = 11;
  const R = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const C = COLONY.cols, SEC = COLONY.section;
  const m = (x) => ((x % C) + C) % C;
  const used = {}; // key → ชนิด
  const keep = new Set();
  for (const [x, y] of COLONY.lifts) for (const d of [0, 3, 4, 5]) keep.add(key(x, y + d));
  const free = (x, y, sec) => !COLONY.glass.includes(x) && !used[key(x, y)] && !keep.has(key(x, y)) && !(sec === 0 && y <= 2) && y % SEC !== SEC - 1 && y % SEC !== 0;
  const place = (sec, n, kind, shapes) => {
    let placed = 0, guard = 0;
    while (placed < n && guard++ < 800) {
      const x = Math.floor(R() * C), y = sec * SEC + 1 + Math.floor(R() * (SEC - 2));
      const sh = shapes[Math.floor(R() * shapes.length)];
      const cells = sh.map(([dx, dy]) => [m(x + dx), y + dy]);
      if (!cells.every(([cx, cy]) => free(cx, cy, sec))) continue;
      for (const [cx, cy] of cells) used[key(cx, cy)] = kind;
      placed++;
    }
  };
  const pond = (sec, w, h) => {
    for (let g = 0; g < 200; g++) {
      const x = Math.floor(R() * C), y = sec * SEC + 2 + Math.floor(R() * (SEC - 3 - h));
      const cells = [];
      for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) if (!((i === 0 || i === w - 1) && (j === 0 || j === h - 1)) || w < 3) cells.push([m(x + i), y + j]);
      if (!cells.every(([cx, cy]) => free(cx, cy, sec))) continue;
      for (const [cx, cy] of cells) used[key(cx, cy)] = "water";
      return;
    }
  };
  const ONE = [[0, 0]], H2 = [[0, 0], [1, 0]], V2 = [[0, 0], [0, 1]];
  place(0, 11, "house", [ONE, H2, ONE]);
  pond(1, 4, 3); place(1, 15, "tree", [ONE]);
  place(2, 9, "tower", [ONE, V2, H2]); place(2, 3, "tree", [ONE]);
  pond(3, 3, 2); place(3, 6, "tree", [ONE]);
  const terrain = {}, special = {};
  for (const [k, kind] of Object.entries(used)) { if (kind === "water") special[k] = "shallow"; else terrain[k] = kind; }
  for (const [x, y] of COLONY.lifts) special[key(x, y)] = "lift";
  return {
    area: COLONY_AREA, name: "Colony", cols: C, rows: COLONY.rows, wrap: true, minRow: 0,
    walls: COLONY.walls, doors: COLONY.doors, glass: COLONY.glass, section: SEC,
    terrain, special, flow: {}, heal: new Set(), healKind: "heal",
    spawns: [1, 3, 5, 8, 10, 12, 14].map((x, i) => ({ x, y: i % 2 ? 2 : 1 })),
    shopSpots: [], // ร้านค้า = แคปซูลเสบียง (server/colony.js) ไม่ใช้จุดร้านค้า
  };
}
MAPS[COLONY_AREA] = buildColonyMap();
const isColonyArea = (area) => Number(area) === COLONY_AREA;

// ---------- Moon Cell — Raid Boss (GRID_PLAN §8.4) ----------
//  ลานโรงเรียน 20×20 (ผู้ใช้สั่ง: มีโรงเรียน + ต้นซากุระ กลีบโปรยตลอด) · อาคารเรียนเต็มแถวบนสุด (y = 0)
//  Moon Cell ตัวใหญ่ 3×3 (ผู้ใช้สั่ง — เดิม 2×2) ลอยหน้าอาคารกลางกระดาน (คอลัมน์ 8–10 · แถว 1–3) · ฮาคุโนะ 2 ตัวยืนหน้า Moon Cell ซ้าย/ขวา · ผู้เล่นเกิดขอบใต้ (แถว 18–19)
//  ต้นซากุระ/ม้านั่ง = สิ่งกีดขวางประปราย (ไม่ปิดทางจากจุดเกิดถึง Moon Cell)
const MOON_AREA = 30;
const MOON = { cols: 20, rows: 20, cell: { x: 8, y: 1 }, cellSize: 3, bosses: [{ x: 6, y: 3 }, { x: 13, y: 3 }] };
MAPS[MOON_AREA] = buildMap({
  area: MOON_AREA,
  name: "Moon Cell",
  cols: MOON.cols, rows: MOON.rows,
  terrain: {
    school: Array.from({ length: 20 }, (_, x) => [x, 0]),
    sakura: [[4, 2], [15, 2], [5, 6], [14, 6], [3, 8], [16, 8], [7, 11], [12, 11], [2, 14], [17, 14], [4, 16], [15, 16]],
    bench: [[9, 7], [10, 7], [9, 14], [10, 14]],
  },
  heal: [],
  spawns: [[3, 18], [6, 19], [8, 18], [10, 19], [12, 18], [14, 19], [17, 18]],
  shopSpots: [[1, 11], [18, 11], [9, 17]],
});
const isMoonArea = (area) => Number(area) === MOON_AREA;

// ---------- Fodlan (GRID_PLAN §8.5) ----------
//  area 40–44 = ด่าน I–V · ⚠️ ตอนนี้ยังเป็นแผนที่ชั่วคราว (ยืมผังภูมิภาคเดิมที่บรรยากาศใกล้กัน) — ผังจริง + กิมมิกทีละด่านเป็นขั้นถัดไป
//   I แม่น้ำแอร์มิด ← IV วังวนน้ำ · II เรเมียร์ ← III ป่าต้องสาป · III ชายฝั่งเดอร์ดริว ← VII สุดขอบโลก · IV เทือกเขาฟาร์กัส ← VI แดนน้ำแข็ง · V หลุมศพ ← I
//  ผังจริง + ชนิดช่องใหม่ของแต่ละด่านอยู่ที่ server/fodlan/mapN.js (ข้อมูลล้วน — map: null = ยังใช้ผังชั่วคราว)
const FODLAN_AREA = 40;
const FODLAN_STAGES = 5;
const FODLAN_NAMES = ["แม่น้ำแอร์มิด", "เรเมียร์", "ชายฝั่งเดอร์ดริว", "เทือกเขาฟาร์กัส", "หลุมศพศักดิ์สิทธิ์"];
//  require ต้องเขียนเป็นสตริงตรงๆ — scripts/gen-board-rules.js ฝังเนื้อไฟล์แทน require ตอนสร้าง client/src/board/boardRules.js
const FODLAN_DEFS = [(() => { const module = { exports: {} }; // ด่าน 1 ของโหมด Fodlan — ผังกระดาน + ชนิดช่องใหม่ (ข้อมูลล้วน · ดู server/fodlan/README.md) · map: null = ยังใช้แผนที่ชั่วคราว
module.exports = { map: null, TERRAIN: {} };
  return module.exports; })(), (() => { const module = { exports: {} }; // ด่าน 2 ของโหมด Fodlan — ผังกระดาน + ชนิดช่องใหม่ (ข้อมูลล้วน · ดู server/fodlan/README.md) · map: null = ยังใช้แผนที่ชั่วคราว
module.exports = { map: null, TERRAIN: {} };
  return module.exports; })(), (() => { const module = { exports: {} }; // ด่าน 3 ของโหมด Fodlan — ผังกระดาน + ชนิดช่องใหม่ (ข้อมูลล้วน · ดู server/fodlan/README.md) · map: null = ยังใช้แผนที่ชั่วคราว
module.exports = { map: null, TERRAIN: {} };
  return module.exports; })(), (() => { const module = { exports: {} }; // ด่าน 4 ของโหมด Fodlan — ผังกระดาน + ชนิดช่องใหม่ (ข้อมูลล้วน · ดู server/fodlan/README.md) · map: null = ยังใช้แผนที่ชั่วคราว
module.exports = { map: null, TERRAIN: {} };
  return module.exports; })(), (() => { const module = { exports: {} }; // ด่าน 5 ของโหมด Fodlan — ผังกระดาน + ชนิดช่องใหม่ (ข้อมูลล้วน · ดู server/fodlan/README.md) · map: null = ยังใช้แผนที่ชั่วคราว
module.exports = { map: null, TERRAIN: {} };
  return module.exports; })()];
[4, 3, 7, 6, 1].forEach((src, i) => {
  const def = FODLAN_DEFS[i];
  Object.assign(TERRAIN_INFO, def.TERRAIN || {});
  MAPS[FODLAN_AREA + i] = def.map
    ? buildMap({ ...def.map, area: FODLAN_AREA + i, name: FODLAN_NAMES[i] })
    : { ...MAPS[src], area: FODLAN_AREA + i, name: FODLAN_NAMES[i] };
});
const isFodlanArea = (area) => Number(area) >= FODLAN_AREA && Number(area) < FODLAN_AREA + FODLAN_STAGES;

// ภูมิภาคที่ไม่มีแผนที่ (ไม่ควรเกิด) ใช้ของภูมิภาค I
function mapOf(area) {
  return MAPS[area] || MAPS[1];
}

// ---------- พื้นฐาน ----------
function inBounds(map, x, y) {
  syncWrap(map);
  if (map.wrap) return y >= (map.minRow | 0) && y < map.rows;
  return x >= 0 && y >= 0 && x < map.cols && y < map.rows;
}
// blocked = ชุด key ของช่องที่ยืน/เดินผ่านไม่ได้เพิ่มเติม (เช่น แผงร้านค้า)
function isObstacle(map, x, y, blocked) {
  if (!inBounds(map, x, y)) return true;
  if (map.terrain[tk(x, y)]) return true;
  return !!(blocked && blocked.has(tk(x, y)));
}
function isHeal(map, x, y) {
  return map.heal.has(tk(x, y));
}
// ชนิดช่องพิเศษ (TERRAIN_INFO) ของช่องนี้ — ไม่มี = null
function specialAt(map, x, y) {
  return (map.special && map.special[tk(x, y)]) || null;
}
// ก้าวที่ใช้เดินเข้าช่องนี้ (พื้นธรรมดา = 1)
function moveCost(map, x, y) {
  const info = TERRAIN_INFO[specialAt(map, x, y)];
  return (info && info.cost) || 1;
}
// ก้าวที่ใช้เดินเข้าช่องนี้ตามตัวเลือกการเดิน — opts.flowerWalk (ราชาดอกไม้ของเซลิน): ช่องดอกไม้ = 0 ก้าว
function stepCost(map, x, y, opts) {
  if (opts && opts.flowerWalk) {
    const info = TERRAIN_INFO[specialAt(map, x, y)];
    if (info && info.flower) return 0;
  }
  return moveCost(map, x, y);
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
            const nx = wx(cx + dx), ny = cy + dy;
            if (!inBounds(map, nx, ny) || !isBush(nx, ny) || patches.has(key(nx, ny))) continue;
            patches.set(key(nx, ny), id);
            stack.push([nx, ny]);
          }
        }
      }
    }
    bushCache.set(map, patches);
  }
  const id = patches.get(tk(x, y));
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
  for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) out.push({ x: wx(x + dx), y: y + dy });
  return out;
}
// ช่อง (x, y) อยู่ในตัวของ u ไหม
function covers(u, x, y) {
  const s = sizeOf(u);
  if (WRAP) { const d = ((x - u.x) % WRAP + WRAP) % WRAP; return d < s && y >= u.y && y < u.y + s; }
  return x >= u.x && x < u.x + s && y >= u.y && y < u.y + s;
}
// ระยะแมนฮัตตันระหว่างขอบที่ใกล้สุดของสองกล่อง (ตัว 1 ช่อง = |dx| + |dy| ตามเดิม · ทับกัน = 0)
function dist(a, b) {
  const as = sizeOf(a), bs = sizeOf(b);
  let dx;
  if (WRAP) { // ช่องว่างระหว่างสองช่วงบนวง (ไปทางขวา/ซ้ายแล้วเอาที่น้อยกว่า)
    const f = ((b.x - a.x) % WRAP + WRAP) % WRAP, r = ((a.x - b.x) % WRAP + WRAP) % WRAP;
    dx = Math.min(Math.max(0, f - (as - 1)), Math.max(0, r - (bs - 1)));
  } else dx = Math.max(0, a.x - (b.x + bs - 1), b.x - (a.x + as - 1));
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

// ---------- น้ำแข็ง (ผู้ใช้ตัดสิน 2026-10-12 — GRID_PLAN §7.9 · ใช้กับน้ำแข็งทุกแบบ: ภูมิภาค VI + ธารน้ำแข็งของ Ice Spike) ----------
// ช่องนี้ไถลได้ไหม: น้ำแข็ง หรือพื้นเปียก (TERRAIN_INFO slide) · มีสิ่งกีดขวาง/หนามน้ำแข็งทับ = ไม่ใช่
function isIce(map, x, y) {
  if (!inBounds(map, x, y) || map.terrain[tk(x, y)]) return false;
  const info = TERRAIN_INFO[specialAt(map, x, y)];
  return !!(info && info.slide);
}
// ไถลจากช่องน้ำแข็ง (x, y) ที่เพิ่งเข้ามา ไปทาง (dx, dy) จนสุดแนวน้ำแข็ง — หยุดบนช่องน้ำแข็งช่องสุดท้าย
//  ช่องน้ำแข็งถัดไปไม่ว่าง (คน/ร้านค้า) = หยุดก่อน · ทแยงได้ (ผลักทแยง)
//  คืน { x, y (ช่องที่หยุด), tiles (ช่องน้ำแข็งที่ผ่านรวมช่องแรก — ยาว = ระยะไถล), hit } · hit = ของที่ช่องถัดจากช่องที่หยุด:
//   { kind: "unit", id, x, y } | { kind: "obstacle", terrain, x, y } | null (พื้นว่าง/ขอบกระดาน/ร้านค้า)
function slideLine(map, x, y, dx, dy, units, selfId, blocked) {
  syncWrap(map);
  const tiles = [{ x, y }];
  let cx = x, cy = y;
  while (isIce(map, cx + dx, cy + dy) && !wallBlocks(map, cx, cy, cy + dy) && freeTile(map, cx + dx, cy + dy, units, selfId, blocked) && tiles.length < map.cols + map.rows) {
    cx = wx(cx + dx); cy += dy;
    tiles.push({ x: cx, y: cy });
  }
  const nx = wx(cx + dx), ny = cy + dy;
  let hit = null;
  if (inBounds(map, nx, ny)) {
    const u = unitAt(units, nx, ny);
    if (u && u.id !== selfId) hit = { kind: "unit", id: u.id, x: nx, y: ny };
    else if (map.terrain[key(nx, ny)]) hit = { kind: "obstacle", terrain: map.terrain[key(nx, ny)], x: nx, y: ny };
    else if (wallBlocks(map, cx, cy, ny)) hit = { kind: "obstacle", terrain: "bulkhead", x: nx, y: ny };
  }
  return { x: cx, y: cy, tiles, hit };
}

// ---------- การเดิน ----------
// หาช่องที่เดินถึงไม่เกิน mov ก้าว (4 ทิศ) · คืน Map<key, { x, y, d, prev }> ของช่องที่ "หยุดได้" รวมช่องเริ่ม
//  เดินผ่านพวกเดียวกันได้ (isAlly) แต่หยุดทับไม่ได้ · ผ่านศัตรูไม่ได้ · ผ่านสิ่งกีดขวาง/blocked ไม่ได้
//  ช่องพิเศษ (TERRAIN_INFO): ค่าเดินรายช่อง 1 หรือ 2 → Dijkstra แบบถังตามจำนวนก้าว (ก้าวน้อยสุดชนะ เท่ากัน = เจอก่อนชนะ)
//   - เดินเข้าช่อง cost 2 ต้องเหลือก้าวพอ
//   - ทรายดูด (stop): หยุดได้แต่เดินต่อจากช่องนั้นไม่ได้ (ยืนอยู่บนทรายดูดตั้งแต่ต้นตา = เดินออกได้ตามปกติ)
//   - opts.hop = ชุด key ของร่างตัวที่ล้ม (ระบบคู่ — server/duo.js · อยู่ใน blocked ด้วย): เดินข้ามได้ หยุดทับไม่ได้
//   - น้ำแข็ง (slide — GRID_PLAN §7.9): เดินเข้าแล้วไถลไปทิศที่เข้ามาจนสุดแนวน้ำแข็ง (slideLine) ไม่เสียก้าวเพิ่ม
//     → ไถลแล้วจบการเดิน (โหนดปลาย slide: true เดินต่อไม่ได้) · ช่องที่ไถลผ่านอยู่ใน prev ให้ pathTo วาดการไถล
//     ช่องน้ำแข็งที่มีเพื่อนยืน = เข้าไม่ได้ · เดินออกจากน้ำแข็ง (ช่องเริ่ม) ไปพื้นธรรมดาไม่ไถล
//   - opts.ghost = เดินทะลุ (ชั้นมิติ server/dimension.js — หลบสายตาของวาเลนไทน์): ก้าวละ 1 ข้ามทุกอย่าง เหลือแค่ขอบกระดาน (reachableGhost)
function reachable(map, unit, mov, units, opts = {}) {
  syncWrap(map);
  if (opts.ghost) return reachableGhost(map, unit, mov);
  if (sizeOf(unit) > 1) return reachableBig(map, unit, mov, units, opts);
  const { isAlly = () => false, blocked = null, hop = null } = opts;
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
    if (!occupant(node.x, node.y) && !(hop && hop.has(k))) stops.set(k, node); // ช่องที่มีเพื่อนยืนอยู่ / ร่าง (hop) = ผ่านได้แต่หยุดไม่ได้
  };
  for (let d = 0; d < buckets.length; d++) {
    for (const cur of buckets[d] || []) {
      if (best.get(key(cur.x, cur.y)) !== cur) continue; // มีทางที่ใช้ก้าวน้อยกว่าแล้ว
      if (cur.slide) continue; // ไถลมาแล้ว = จบการเดิน
      if (cur !== start && specialAt(map, cur.x, cur.y) === "quicksand") continue; // ทรายดูด: หยุดทันที
      for (const [dx, dy] of DIRS) {
        const nx = wx(cur.x + dx), ny = cur.y + dy;
        if (wallBlocks(map, cur.x, cur.y, ny)) continue; // กำแพงกั้นปล้อง (ผ่านได้แค่ประตู)
        if (isObstacle(map, nx, ny, blocked) && !(hop && hop.has(key(nx, ny)))) continue; // ร่าง (ระบบคู่) = กระโดดข้ามได้
        const other = occupant(nx, ny);
        if (other && !isAlly(unit, other)) continue; // ศัตรูขวางทาง
        const nd = cur.d + stepCost(map, nx, ny, opts);
        if (nd > mov) continue;
        const node = { x: nx, y: ny, d: nd, prev: cur };
        if (isIce(map, nx, ny)) {
          if (other) continue; // เพื่อนยืนบนน้ำแข็ง = เข้าไม่ได้
          const s = slideLine(map, nx, ny, dx, dy, units, unit.id, blocked);
          let end = node;
          for (const t of s.tiles.slice(1)) end = { x: t.x, y: t.y, d: nd, prev: end };
          end.slide = true;
          visit(end);
        } else {
          visit(node);
        }
      }
    }
  }
  return stops;
}
// เดินทะลุ (opts.ghost): ทุกช่องในกระดานที่ห่างไม่เกิน mov ก้าว (4 ทิศ) — ไม่สนสิ่งกีดขวาง/คน/ร้าน/ค่าเดิน/น้ำแข็ง/ทรายดูด · หยุดได้ทุกช่อง
function reachableGhost(map, unit, mov) {
  syncWrap(map);
  const start = { x: unit.x, y: unit.y, d: 0, prev: null };
  const stops = new Map([[key(unit.x, unit.y), start]]);
  const queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i];
    if (cur.d >= mov) continue;
    for (const [dx, dy] of DIRS) {
      const nx = wx(cur.x + dx), ny = cur.y + dy, k = key(nx, ny);
      if (!inBounds(map, nx, ny) || stops.has(k)) continue;
      const node = { x: nx, y: ny, d: cur.d + 1, prev: cur };
      stops.set(k, node);
      queue.push(node);
    }
  }
  return stops;
}
// หนามน้ำแข็ง (Ice Spike — terrain "icespike<lv>"): ตัวใหญ่เหยียบได้ (หนามแตก — server/ice.js trampleSpikes · ผู้ใช้ปรับสมดุล 2026-10-20)
//  ไม่ขวางทาง ไม่กินก้าวเพิ่มแบบพังของ (smash)
const trampleKind = (kind) => typeof kind === "string" && kind.startsWith("icespike");
// ตัวใหญ่ (size > 1) ตรวจว่ายืนที่มุม (x, y) ได้ไหม → null = ไม่ได้ · { ally, rubble }
//  ทั้งตัวต้องอยู่ในกระดาน · ไม่ทับ blocked (ร้านค้า) · ไม่ทับศัตรู (ทับเพื่อน = ผ่านได้แต่หยุดไม่ได้ → ally)
//  สิ่งกีดขวาง: smash = พังได้ (ทับได้ · rubble = มีของต้องพัง) · ไม่ smash = ยืนไม่ได้ · หนามน้ำแข็ง = เหยียบได้เสมอ (trampleKind)
function bigFits(map, unit, x, y, units, { isAlly = () => false, blocked = null, smash = false } = {}) {
  syncWrap(map);
  const s = sizeOf(unit);
  if (map.wrap ? y < (map.minRow | 0) || y + s > map.rows : x < 0 || y < 0 || x + s > map.cols || y + s > map.rows) return null;
  x = wx(x);
  let rubble = false, ally = false;
  for (const t of footprint(x, y, s)) {
    const k = key(t.x, t.y);
    if (blocked && blocked.has(k)) return null;
    if (map.terrain[k] && !trampleKind(map.terrain[k])) { if (!smash || UNBREAKABLE.has(map.terrain[k])) return null; rubble = true; }
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
  syncWrap(map);
  const start = { x: unit.x, y: unit.y, d: 0, prev: null };
  const best = new Map([[key(unit.x, unit.y), start]]);
  const stops = new Map([[key(unit.x, unit.y), start]]);
  const buckets = [[start]];
  for (let d = 0; d < buckets.length; d++) {
    for (const cur of buckets[d] || []) {
      if (best.get(key(cur.x, cur.y)) !== cur) continue;
      for (const [dx, dy] of DIRS) {
        const nx = wx(cur.x + dx), ny = cur.y + dy;
        const st = bigStep(map, unit, nx, ny, dx, dy, units, opts);
        if (!st) continue;
        const nd = cur.d + st.cost;
        if (nd > mov) continue;
        const k = key(nx, ny);
        const old = best.get(k);
        if (old && old.d <= nd) continue;
        const node = { x: nx, y: ny, d: nd, prev: cur };
        best.set(k, node);
        (buckets[nd] ||= []).push(node);
        if (!st.ally) stops.set(k, node);
      }
    }
  }
  return stops;
}
// ตัวใหญ่ก้าว 1 ช่องทั้งตัวไปมุม (nx, ny) ในทิศ (dx, dy) → null = ไปไม่ได้ · { cost, ally }
//  ขอบหน้าตัว (แถว/คอลัมน์ที่เพิ่งก้าวเข้า) มีสิ่งกีดขวาง = ต้องพัง +1 ก้าว
function bigStep(map, unit, nx, ny, dx, dy, units, opts) {
  const s = sizeOf(unit);
  const fit = bigFits(map, unit, nx, ny, units, opts);
  if (!fit) return null;
  let edge = false;
  if (fit.rubble) {
    for (let i = 0; i < s && !edge; i++) {
      const ex = dx > 0 ? nx + s - 1 : dx < 0 ? nx : nx + i;
      const ey = dy > 0 ? ny + s - 1 : dy < 0 ? ny : ny + i;
      const kind = map.terrain[tk(ex, ey)];
      if (kind && !trampleKind(kind)) edge = true;
    }
  }
  return { cost: 1 + (edge ? 1 : 0), ally: fit.ally };
}
// ก้าวที่ใช้เดินตามเส้นทาง trail (ช่องแรก = ช่องเริ่ม · ทุกช่องติดกัน) ตามกติกาเดียวกับ reachable — เดินไม่ได้ = Infinity
//  ช่องสุดท้ายต้องหยุดได้ (ไม่มีคนยืน) ยกเว้นเป็นน้ำแข็ง = จุดเริ่มไถล (ต้องว่าง)
//  ระหว่างทาง: ผ่านเพื่อน/ร่าง (opts.hop) ได้ · ทรายดูด/น้ำแข็ง (ที่ไม่ใช่ช่องเริ่ม) = จบการเดินที่ช่องนั้น เดินต่อไม่ได้
function trailCost(map, unit, trail, units, opts = {}) {
  syncWrap(map);
  const { isAlly = () => false, blocked = null, hop = null } = opts;
  if (opts.ghost) { // เดินทะลุ: ก้าวละ 1 · ต้องติดกันและอยู่ในกระดาน
    for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1], t = trail[i];
      if (Math.abs(wdx(a.x, t.x)) + Math.abs(t.y - a.y) !== 1 || !inBounds(map, t.x, t.y)) return Infinity;
    }
    return trail.length - 1;
  }
  const big = sizeOf(unit) > 1;
  let d = 0;
  for (let i = 1; i < trail.length; i++) {
    const a = trail[i - 1], t = trail[i], last = i === trail.length - 1;
    const dx = wdx(a.x, t.x), dy = t.y - a.y;
    if (Math.abs(dx) + Math.abs(dy) !== 1) return Infinity;
    if (!big && wallBlocks(map, a.x, a.y, t.y)) return Infinity;
    if (big) {
      const st = bigStep(map, unit, t.x, t.y, dx, dy, units, opts);
      if (!st || (last && st.ally)) return Infinity;
      d += st.cost;
      continue;
    }
    if (i > 1 && (specialAt(map, a.x, a.y) === "quicksand" || isIce(map, a.x, a.y))) return Infinity;
    const hopped = !!(hop && hop.has(key(t.x, t.y)));
    if (hopped ? last : isObstacle(map, t.x, t.y, blocked)) return Infinity;
    const o = unitAt(units, t.x, t.y);
    if (o && o.id !== unit.id && (last || !isAlly(unit, o) || isIce(map, t.x, t.y))) return Infinity;
    d += stepCost(map, t.x, t.y, opts);
  }
  return d;
}
// เดินทีละช่อง (คีย์บอร์ด) แบบลูกศรของ Fire Emblem → เส้นทางใหม่จากช่องเริ่มตา (unit.x, unit.y) ถึง to · ไปไม่ได้ = null
//  trail = เส้นทางที่เดินมาแล้วในตานี้ (ช่องเริ่ม → ช่องที่ยืน · ไม่มี = ยังไม่ขยับ)
//  ก้าวกลับช่องที่เคยผ่าน = ตัดเส้นทางถึงช่องนั้น (กลับช่องเริ่ม = [ช่องเริ่ม]) · ต่อเส้นทางเดิมได้ไม่เกิน mov = ต่อ
//  ต่อไม่ได้ = ทางที่ก้าวน้อยสุดจากช่องเริ่ม (ไม่รับทางที่ต้องไถลไปลง) · ก้าวเข้าน้ำแข็ง = ช่องสุดท้าย (ไถลต่อตอนเดินจริง)
function stepPath(map, unit, mov, units, trail, to, opts = {}) {
  syncWrap(map);
  const origin = { x: unit.x, y: unit.y };
  const tr = Array.isArray(trail) && trail.length && trail[0].x === origin.x && trail[0].y === origin.y ? trail : [origin];
  const cur = tr[tr.length - 1];
  if (Math.abs(wdx(cur.x, to.x)) + Math.abs(to.y - cur.y) !== 1) return null;
  const back = tr.findIndex((t) => t.x === to.x && t.y === to.y);
  if (back >= 0) return tr.slice(0, back + 1).map((t) => ({ x: t.x, y: t.y }));
  const ext = [...tr.map((t) => ({ x: t.x, y: t.y })), { x: to.x, y: to.y }];
  if (trailCost(map, unit, ext, units, opts) <= mov) return ext;
  const reach = reachable(map, unit, mov, units, opts);
  if (!opts.ghost && sizeOf(unit) <= 1 && isIce(map, to.x, to.y)) {
    const at = reach.get(key(cur.x, cur.y));
    if (!at || at.slide) return null;
    const via = [...pathTo(reach, cur.x, cur.y), { x: to.x, y: to.y }];
    return trailCost(map, unit, via, units, opts) <= mov ? via : null;
  }
  const node = reach.get(key(to.x, to.y));
  return node && node.d > 0 && !node.slide ? pathTo(reach, to.x, to.y) : null;
}
// แผนที่ที่แก้บางช่อง: patch = { terrain: { "x,y": ชนิด | null }, special: { "x,y": ชนิด | null } } (null = ไม่มี)
//  ใช้ถอดผลการเดินของตานี้ออก (ธารน้ำแข็งที่ Ice Spike เดินสร้าง · ของที่ตัวใหญ่เดินพัง) ตอนคิดเส้นทางจากช่องเริ่มตา
function patchMap(map, patch) {
  if (!patch) return map;
  const terrain = { ...map.terrain }, special = { ...map.special };
  for (const [k, v] of Object.entries(patch.terrain || {})) { if (v) terrain[k] = v; else delete terrain[k]; }
  for (const [k, v] of Object.entries(patch.special || {})) { if (v) special[k] = v; else delete special[k]; }
  return { ...map, terrain, special };
}
// ขยายร่าง: หามุมใหม่ของตัวขนาด newSize ที่ครอบตัวเดิมไว้ทั้งหมด → { x, y, displaced: [id], rubble: ["x,y"] } · ไม่มีที่ = null
//  เลือกมุมที่ไล่คนออกน้อยสุด → พังของน้อยสุด → ใกล้กลางตัวเดิมสุด · คนในช่องใหม่ = ถูกผลักออก (pushOutTile — ตัว 1 ช่องเท่านั้น
//  มุมที่ทับตัวใหญ่อีกตัว = ข้าม · ไม่เหลือมุมเลย = null ให้ผู้เรียกลองใหม่ทีหลัง)
//  smash = พังสิ่งกีดขวางได้ (ไม่ได้ = ช่องใหม่ต้องไม่มีสิ่งกีดขวาง) · blocked (ร้านค้า) ทับไม่ได้เสมอ
function growPlan(map, unit, newSize, units, { blocked = null, smash = false } = {}) {
  syncWrap(map);
  const s0 = sizeOf(unit), grow = newSize - s0;
  if (grow <= 0) return null;
  let best = null;
  for (let oy = -grow; oy <= 0; oy++) {
    for (let ox = -grow; ox <= 0; ox++) {
      const x = wx(unit.x + ox), y = unit.y + oy;
      if (map.wrap ? y < (map.minRow | 0) || y + newSize > map.rows : x < 0 || y < 0 || x + newSize > map.cols || y + newSize > map.rows) continue;
      const tiles = footprint(x, y, newSize);
      if (blocked && tiles.some((t) => blocked.has(key(t.x, t.y)))) continue;
      const rubble = tiles.filter((t) => map.terrain[key(t.x, t.y)]).map((t) => key(t.x, t.y));
      if (rubble.length && !smash) continue;
      if (rubble.some((k) => UNBREAKABLE.has(map.terrain[k]))) continue;
      const box = { x, y, size: newSize };
      const hit = units.filter((o) => o.alive && o.id !== unit.id && dist(box, o) === 0);
      if (hit.some((o) => sizeOf(o) > 1)) continue; // ตัวใหญ่อีกตัวผลักออกไม่ได้ (pushOutTile หาที่ให้แค่ 1 ช่อง)
      const displaced = hit.map((o) => o.id);
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
  syncWrap(map);
  const ac = { x: avoid.x + (sizeOf(avoid) - 1) / 2, y: avoid.y + (sizeOf(avoid) - 1) / 2 };
  let best = null;
  for (let y = map.minRow | 0; y < map.rows; y++) {
    for (let x = 0; x < map.cols; x++) {
      if (covers(avoid, x, y) || !freeTile(map, x, y, units, selfId, blocked)) continue;
      const d = Math.abs(wdx(from.x, x)) + Math.abs(y - from.y);
      const away = Math.abs(wdx(ac.x, x)) + Math.abs(y - ac.y);
      if (!best || d < best.d || (d === best.d && away > best.away)) best = { x, y, d, away };
    }
  }
  return best ? { x: best.x, y: best.y } : null;
}
// วางตัวใหญ่ใกล้จุด near (เปลี่ยนภูมิภาค/จุดเกิด): มุมที่ใกล้ near สุดซึ่งยืนได้โดยไม่ทับใคร → { x, y, rubble } · ไม่มี = null
function placeBig(map, size, near, units, { selfId = null, blocked = null, smash = false } = {}) {
  syncWrap(map);
  let best = null;
  const unit = { id: selfId, x: 0, y: 0, size };
  for (let y = map.minRow | 0; y + size <= map.rows; y++) {
    for (let x = 0; x + (map.wrap ? 1 : size) <= map.cols; x++) {
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
  syncWrap(map);
  const out = [];
  const box = { x, y, size };
  const seen = new Set();
  for (let tx = x - range[1]; tx <= x + size - 1 + range[1]; tx++) {
    for (let ty = y - range[1]; ty <= y + size - 1 + range[1]; ty++) {
      if (!inRange(range, dist(box, { x: wx(tx), y: ty })) || !inBounds(map, tx, ty)) continue;
      const k = tk(tx, ty);
      if (seen.has(k)) continue; // กระดานวงรอบ: ระยะยาวเกินครึ่งวงวนมาซ้ำช่องเดิม
      seen.add(k);
      out.push({ x: wx(tx), y: ty });
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
//  size = ตัวใหญ่ (x, y = มุมบนซ้าย): แนวออกจากกลางด้านหน้าของตัว (กิงกะ 3×3) — ขนาดคู่ปัดไปทางมุมบนซ้าย
function lineTiles(map, x, y, dir, len, width, size = 1) {
  syncWrap(map);
  const v = LINE_DIRS[dir];
  if (!v) return [];
  const [fx, fy] = v;
  const sx = -fy, sy = fx; // แกนขวาง (ตั้งฉากกับทิศ)
  const half = Math.floor(width / 2);
  const n = Math.max(1, size | 0), c = Math.floor((n - 1) / 2);
  const cx = x + c, cy = y + c;
  const edge = fx + fy > 0 ? n - 1 - c : c; // จากกลางตัวถึงขอบด้านที่หัน
  const out = [];
  for (let i = 1; i <= len; i++) {
    for (let j = -half; j <= half; j++) {
      const tx = cx + fx * (edge + i) + sx * j, ty = cy + fy * (edge + i) + sy * j;
      if (inBounds(map, tx, ty)) out.push({ x: wx(tx), y: ty });
    }
  }
  return out;
}
// ตีปกติแบบแนวตรง (ไรโด ฮิคารุ: แบล็คคิง / กิงกะ "1×3"): ตีได้เฉพาะช่องที่อยู่แนวตรงจากขอบตัว 4 ทิศ ห่าง range[0]..range[1]
//  ตัวใหญ่ = ทุกแถว/คอลัมน์ที่ตัวกิน (ช่องหน้าแต่ละช่องของขอบเป็น 1 แนว)
//  คืน [{ dir, j (ช่องที่เท่าไรของขอบ), tiles: [{ x, y, i }] }] — tiles ตัดที่ขอบกระดาน
function laneSets(map, x, y, size, range) {
  syncWrap(map);
  const n = Math.max(1, size | 0), out = [];
  for (const [dir, [fx, fy]] of Object.entries(LINE_DIRS)) {
    for (let j = 0; j < n; j++) {
      // ช่องขอบตัวด้านที่หัน (j = ลำดับตามแกนขวาง)
      const ex = fx > 0 ? x + n - 1 : fx < 0 ? x : x + j;
      const ey = fy > 0 ? y + n - 1 : fy < 0 ? y : y + j;
      const tiles = [];
      for (let i = range[0]; i <= range[1]; i++) {
        const tx = ex + fx * i, ty = ey + fy * i;
        if (inBounds(map, tx, ty)) tiles.push({ x: wx(tx), y: ty, i });
      }
      out.push({ dir, j, tiles });
    }
  }
  return out;
}
// ช่องทั้งหมดที่ตีแบบแนวตรงถึง (ไฮไลต์แดง / ระยะอันตราย)
function laneTiles(map, x, y, size, range) {
  const seen = new Set(), out = [];
  for (const l of laneSets(map, x, y, size, range)) {
    for (const t of l.tiles) { const k = key(t.x, t.y); if (!seen.has(k)) { seen.add(k); out.push({ x: t.x, y: t.y }); } }
  }
  return out;
}
// แนวที่เป้า (กล่อง { x, y, size }) อยู่ — ไม่อยู่แนวไหน = null · ตัวใหญ่ทับหลายแนว = แนวที่ใกล้กลางตัวผู้ตีสุด
//  คืน { dir, j, tiles } (tiles = ทั้งแนว ห่าง 1..range[1] — ทุกคนในนี้โดน)
//  face = ตีทั้งด้าน (กิงกะ: ช่องติดตัวทั้งด้านที่เป้าอยู่ กว้างเท่าตัว) — tiles = ทุกแนวของด้านนั้น
// len = ความยาวแนวที่โดนจริง (ไม่ใส่ = ปลายระยะตี) — เรียวกิ: เล็งประชิด [1, 1] แต่ฟันยาว 2 ช่อง (เป้า + คนด้านหลัง)
function laneOf(map, x, y, size, range, target, face = false, len = 0) {
  if (!target) return null;
  const n = Math.max(1, size | 0), mid = (n - 1) / 2;
  let best = null;
  for (const l of laneSets(map, x, y, n, range)) {
    if (!l.tiles.some((t) => covers(target, t.x, t.y))) continue;
    const off = Math.abs(l.j - mid);
    if (!best || off < best.off) best = { ...l, off };
  }
  if (!best) return null;
  const sets = laneSets(map, x, y, n, [1, Math.max(range[1], len || 0)]);
  if (face) return { dir: best.dir, j: best.j, tiles: sets.filter((l) => l.dir === best.dir).flatMap((l) => l.tiles) };
  const full = sets.find((l) => l.dir === best.dir && l.j === best.j);
  return { dir: best.dir, j: best.j, tiles: full.tiles };
}
// ตีปกติเป็นกรอบ (ฮุค strikeRect — ชิโร่ Nine Lives Blade Works: ลึก 2 × กว้าง 3) ทางทิศของเป้า
//  ทิศ = แกนที่เป้าห่างจากกลางตัวผู้ตีมากกว่า (เท่ากัน = แนวนอน) · กรอบเริ่มจากช่องติดขอบตัว กว้าง width (+ ขนาดตัว − 1) กลางตรงกลางตัว
//  คืน { dir, tiles } — tiles ตัดที่ขอบกระดาน · เป้าไม่อยู่ในกรอบ = null
function rectToward(map, x, y, size, target, depth, width) {
  syncWrap(map);
  if (!target) return null;
  const n = Math.max(1, size | 0), tn = Math.max(1, (target.size | 0) || 1);
  const dx = wdx(x + (n - 1) / 2, target.x + (tn - 1) / 2), dy = (target.y + (tn - 1) / 2) - (y + (n - 1) / 2);
  if (!dx && !dy) return null;
  const dir = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
  const [fx, fy] = LINE_DIRS[dir];
  const half = Math.floor((Math.max(1, width) - 1) / 2);
  const tiles = [];
  for (let d = 1; d <= depth; d++) {
    for (let w = -half; w <= n - 1 + half; w++) {
      const tx = fx > 0 ? x + n - 1 + d : fx < 0 ? x - d : x + w;
      const ty = fy > 0 ? y + n - 1 + d : fy < 0 ? y - d : y + w;
      if (inBounds(map, tx, ty)) tiles.push({ x: wx(tx), y: ty });
    }
  }
  if (!tiles.some((t) => covers(target, t.x, t.y))) return null;
  return { dir, tiles };
}
// ผู้เล่นที่ยังอยู่ซึ่งยืนในชุดช่องที่ให้มา (ตัวใหญ่ = ช่องไหนของตัวโดนก็นับ)
function unitsOnTiles(units, tiles) {
  const set = new Set(tiles.map((t) => tk(t.x, t.y)));
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
//  ถอยลงน้ำแข็ง = ไถลต่อจนสุดแนวน้ำแข็ง (slideLine) → มี via = ช่องน้ำแข็งช่องแรก (ไม่ไถล = ไม่มี via)
function pushback(map, attackerPos, defenderPos, units, { selfId = null, blocked = null } = {}) {
  syncWrap(map);
  const dx = wdx(defenderPos.x, attackerPos.x), dy = attackerPos.y - defenderPos.y;
  const sx = Math.sign(dx), sy = Math.sign(dy);
  let dirs;
  if (Math.abs(dx) > Math.abs(dy)) dirs = [[sx, 0]];
  else if (Math.abs(dy) > Math.abs(dx)) dirs = [[0, sy]];
  else dirs = [[0, sy], [sx, 0]];
  const dir = dirs.find(([ux, uy]) => !wallBlocks(map, attackerPos.x, attackerPos.y, attackerPos.y + uy) && freeTile(map, attackerPos.x + ux, attackerPos.y + uy, units, selfId, blocked));
  if (!dir) return { x: attackerPos.x, y: attackerPos.y, moved: false, collide: true };
  const nx = wx(attackerPos.x + dir[0]), ny = attackerPos.y + dir[1];
  if (isIce(map, nx, ny)) {
    const s = slideLine(map, nx, ny, dir[0], dir[1], units, selfId, blocked);
    if (s.tiles.length > 1) return { x: s.x, y: s.y, moved: true, collide: false, via: { x: nx, y: ny } };
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
  syncWrap(map);
  const kind = specialAt(map, x, y);
  const info = TERRAIN_INFO[kind];
  if (!info || !info.end) return null;
  if (info.end === "thorns") return { kind, turns: info.poison };
  if (info.end === "lava") return { kind, dmg: info.dmg };
  if (info.end === "lift") return { kind }; // Colony: ดีดขึ้น 4 แถว (server/colony.js liftUnit)
  if (info.end === "whirl") {
    const dir = map.flow && map.flow[key(x, y)];
    const v = LINE_DIRS[dir];
    if (!v) return null;
    const to = freeTile(map, x + v[0], y + v[1], units, selfId, blocked) ? { x: wx(x + v[0]), y: y + v[1] } : null;
    return { kind, dir, to };
  }
  return null;
}

// ---------- ระยะอันตราย ----------
// ช่องทั้งหมดที่ unit "เดินแล้วตีถึง" ในตาเดียว (ไฮไลต์แดงตอนเลือกเดิน / ปุ่มระยะอันตราย)
//  คืน { move: Set<key>, threat: Set<key> } — threat ไม่รวมช่องที่เดินถึงได้อยู่แล้ว
//  ตัวใหญ่: move = ทุกช่องที่ตัวไปทับได้ (รวมทั้งตัว ไม่ใช่แค่มุม)
//  opts.lane = ตีแบบแนวตรง (laneTiles) แทนข้าวหลามตัด
function threatZone(map, unit, mov, range, units, opts = {}) {
  syncWrap(map);
  const reach = reachable(map, unit, mov, units, opts);
  const s = sizeOf(unit);
  const move = new Set();
  for (const n of reach.values()) for (const t of footprint(n.x, n.y, s)) move.add(key(t.x, t.y));
  const threat = new Set();
  for (const n of reach.values()) {
    for (const t of opts.lane ? laneTiles(map, n.x, n.y, s, range) : tilesInRange(map, n.x, n.y, range, s)) {
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
  const free = map.shopSpots.filter((s) => !unitAt(units, s.x, s.y) && !map.terrain[key(s.x, s.y)] && !(prev && s.x === prev.x && s.y === prev.y)); // ช่องพัง (chasm) ตั้งร้านไม่ได้
  if (!free.length) return prev || null;
  const s = free[Math.floor(rng() * free.length)];
  return { x: s.x, y: s.y };
}
// ยืนติดร้าน (ระยะ 1) ถึงซื้อได้
function nearShop(pos, shopPos) {
  return !!shopPos && dist(pos, shopPos) === 1;
}

// state.board จาก server ส่ง heal เป็น array ของ "x,y" — แปลงกลับเป็นรูปเดียวกับแผนที่ฝั่ง server ก่อนส่งให้ฟังก์ชันในไฟล์นี้
function normalizeMap(pub) {
  if (!pub) return null;
  setWrap(pub.wrap ? pub.cols : 0); // Colony: กระดานต่อวงรอบ (ระยะ/เดินนับวง)
  return {
    ...pub,
    terrain: pub.terrain || {}, special: pub.special || {}, flow: pub.flow || {}, healKind: pub.healKind || "heal",
    heal: pub.heal instanceof Set ? pub.heal : new Set(pub.heal || []),
  };
}

export {
  COLS, ROWS, DIRS, LINE_DIRS, MAPS, TERRAIN_INFO, MOON_AREA, MOON, isMoonArea, UNBREAKABLE, ZERO_AREA, ZERO_STAGES, ZERO_SEALS, isZeroArea,
  COLONY_AREA, COLONY, isColonyArea, FODLAN_AREA, FODLAN_STAGES, isFodlanArea,
  key, mapOf, inBounds, isObstacle, isHeal, dist, inRange, unitAt,
  setWrap, wrapCols, wx, wdx, wallBlocks,
  sizeOf, boxOf, footprint, covers, bigFits, growPlan, pushOutTile, placeBig,
  specialAt, moveCost, stepCost, terrainEvade, terrainAtk, tileInfo, freeTile, bushPatchOf, isIce, slideLine,
  reachable, reachableBig, reachableGhost, pathTo, trailCost, stepPath, patchMap,
  tilesInRange, aoeTiles, lineTiles, laneSets, laneTiles, laneOf, rectToward, unitsOnTiles, attackTargets,
  canCounter, pushback, threatZone, endTurnTile,
  assignSpawns, pickShopSpot, nearShop,
  normalizeMap,
};
