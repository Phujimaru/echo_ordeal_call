// ⚠️ ไฟล์นี้สร้างอัตโนมัติจาก server/board.js — ห้ามแก้ตรงนี้ (แก้ที่ server แล้วรัน node scripts/gen-board-rules.js)
// ============================================================
//  กระดานเดินได้ (ระบบใหม่แบบ Fire Emblem — ดู GRID_PLAN.md)
//  ไฟล์นี้เป็นฟังก์ชันล้วน: ไม่อ่าน/เขียน match ไม่ require โมดูลอื่นใน server/
//  ทุกฟังก์ชันรับข้อมูลที่ต้องใช้ทางพารามิเตอร์ → เทสต์ได้ตรงๆ และเรียกจากเฟสไหนก็ได้
//
//  พิกัด: x = คอลัมน์ 0..COLS-1 (ซ้าย→ขวา) · y = แถว 0..ROWS-1 (ไกล→ใกล้กล้อง)
//  ระยะทุกอย่างนับแบบแมนฮัตตัน (|dx| + |dy|) ไม่มีแนวทแยง — เดิน ตี สกิล ตีหมู่ ใช้การนับเดียวกัน
//  unit = { id, x, y, alive, teamId? } — ผู้เล่นบนกระดาน (ข้อมูลอื่นไม่จำเป็นสำหรับไฟล์นี้)
// ============================================================

const COLS = 16;
const ROWS = 12;
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
//  heal / oasis = จุดฟื้นฟู (map.heal) — ชื่อตามภูมิภาค (map.healKind)
const TERRAIN_INFO = {
  heal: { name: "วงเวทฟื้นฟู", icon: "✨", desc: "จบตา ฟื้นพลังชีวิต +1" },
  oasis: { name: "โอเอซิส", icon: "🌴", desc: "จบตา ฟื้นพลังชีวิต +1" },
  flowers: { name: "พุ่มดอกไม้สูง", icon: "🌸", desc: "เดิน 2 ก้าว · หลบหลีก +20%", cost: 2, evade: 20 },
  forest: { name: "ป่าทึบ", icon: "🌲", desc: "เดิน 2 ก้าว · หลบหลีก +20%", cost: 2, evade: 20 },
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

// ภูมิภาค I · อาณาจักรแห่งจุดเริ่มต้น — ตามต้นแบบ .claude/plans/region1-board.html
//  ปราสาทอยู่หลังกระดาน · วงเวทกลาง 4 ช่อง = จุดฟื้นฟู · เสาคริสตัล 4 ต้น ธง 2 ผืน ต้นไม้ พุ่มไม้ = สิ่งกีดขวาง
const MAPS = {
  1: buildMap({
    area: 1,
    name: "อาณาจักรแห่งจุดเริ่มต้น",
    terrain: {
      tree: [[0, 0], [1, 1], [0, 7], [1, 8], [0, 10], [15, 0], [14, 1], [15, 7], [14, 8], [15, 10], [3, 6], [12, 6]],
      pillar: [[4, 3], [11, 3], [4, 8], [11, 8]],
      banner: [[6, 1], [9, 1]],
      hedge: [[5, 9], [10, 9], [5, 2], [10, 2]],
    },
    heal: [[7, 5], [8, 5], [7, 6], [8, 6]],
    spawns: [[2, 9], [13, 9], [1, 4], [14, 4], [4, 0], [11, 0], [7, 11]],
    shopSpots: [[7, 2], [2, 2], [13, 2], [2, 10], [13, 10], [8, 9]],
  }),
  // ภูมิภาค II–VII (Claude ออกแบบ — GRID_PLAN §3.1) · สมมาตรซ้าย-ขวาโดยประมาณ · จุดเกิดรอบขอบ 7 จุด
  // II ทุ่งดอกไม้: ทุ่งโล่ง · ดงดอกไม้กลางแผนที่เป็นที่กำบัง (หลบ +20%) · รั้วแบ่งเลนซ้าย/ขวา · กังหันลม 2 ต้น
  // III ป่าไม้ต้องสาป: ป่าทึบเป็นหย่อมตามขอบ · ทางลัดกลางแผนที่มีหนามพิษ (จบตาบนนั้น = ติดพิษ)
  // IV คลื่นวงวนน้ำ: ซากเรือกลางวงน้ำวนหมุนตามเข็มนาฬิกา · ร่องน้ำตื้นแบ่งแผนที่
  // V ทะเลทราย: วิหารร้างกลางแผนที่ล้อมโอเอซิส 2 ช่อง · ประตูวิหารเป็นทรายดูด
  // VI อาณาจักรน้ำแข็ง: ทะเลสาบน้ำแข็งกลางแผนที่ (ไถล) · ก้อนน้ำแข็งกลางทะเลสาบไว้หยุดไถล
  // VII จุดสิ้นสุดของโลก: ธารลาวาแบ่งแผนที่ · แท่นพลังกลางแท่นบูชา (ล้อมลาวา) และริมขอบ
  2: buildMap({
    area: 2,
    name: "ทุ่งดอกไม้",
    terrain: {
      rock: [[0, 0], [15, 0], [2, 5], [13, 5], [2, 6], [13, 6], [0, 11], [15, 11]],
      windmill: [[2, 1], [13, 1]],
      fence: [[1, 3], [2, 3], [3, 3], [12, 3], [13, 3], [14, 3], [1, 8], [2, 8], [3, 8], [12, 8], [13, 8], [14, 8]],
    },
    special: {
      flowers: [[7, 1], [8, 1], [7, 2], [8, 2], [7, 4], [8, 4], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [5, 6], [6, 6], [7, 6], [8, 6], [9, 6], [10, 6], [7, 7], [8, 7], [2, 9], [3, 9], [12, 9], [13, 9], [2, 10], [3, 10], [12, 10], [13, 10]],
    },
    heal: [],
    spawns: [[4, 0], [11, 0], [0, 4], [15, 4], [2, 11], [7, 11], [13, 11]],
    shopSpots: [[5, 2], [10, 2], [4, 7], [11, 7], [5, 10], [10, 10]],
  }),
  3: buildMap({
    area: 3,
    name: "ป่าไม้ต้องสาป",
    terrain: {
      deadtree: [[0, 0], [15, 0], [6, 1], [9, 1], [3, 3], [4, 3], [11, 3], [12, 3], [2, 8], [3, 8], [12, 8], [13, 8], [0, 11], [15, 11]],
      stump: [[4, 4], [11, 4], [3, 7], [12, 7]],
      rock: [[5, 9], [10, 9]],
    },
    special: {
      forest: [[6, 0], [7, 0], [8, 0], [9, 0], [1, 1], [2, 1], [7, 1], [8, 1], [13, 1], [14, 1], [1, 2], [2, 2], [13, 2], [14, 2], [1, 5], [2, 5], [6, 5], [9, 5], [13, 5], [14, 5], [1, 6], [2, 6], [6, 6], [9, 6], [13, 6], [14, 6], [1, 9], [2, 9], [6, 9], [7, 9], [8, 9], [9, 9], [13, 9], [14, 9], [1, 10], [2, 10], [13, 10], [14, 10]],
      thorns: [[6, 3], [9, 3], [6, 4], [9, 4], [6, 7], [9, 7]],
    },
    heal: [],
    spawns: [[3, 0], [12, 0], [0, 4], [15, 4], [2, 11], [7, 11], [13, 11]],
    shopSpots: [[4, 2], [11, 2], [1, 7], [14, 7], [5, 8], [10, 8]],
  }),
  4: buildMap({
    area: 4,
    name: "คลื่นวงวนน้ำ",
    terrain: {
      reef: [[0, 0], [15, 0], [3, 6], [12, 6], [0, 11], [15, 11]],
      rock: [[4, 3], [5, 3], [10, 3], [11, 3], [4, 8], [5, 8], [10, 8], [11, 8]],
      wreck: [[7, 5], [8, 5], [7, 6], [8, 6]],
    },
    special: {
      shallow: [[7, 0], [8, 0], [2, 1], [3, 1], [7, 1], [8, 1], [12, 1], [13, 1], [1, 2], [2, 2], [7, 2], [8, 2], [13, 2], [14, 2], [0, 5], [1, 5], [14, 5], [15, 5], [0, 6], [1, 6], [14, 6], [15, 6], [1, 9], [2, 9], [7, 9], [8, 9], [13, 9], [14, 9], [2, 10], [3, 10], [7, 10], [8, 10], [12, 10], [13, 10]],
      whirl: [[6, 4, "right"], [7, 4, "right"], [8, 4, "right"], [9, 4, "down"], [6, 5, "up"], [9, 5, "down"], [6, 6, "up"], [9, 6, "down"], [6, 7, "up"], [7, 7, "left"], [8, 7, "left"], [9, 7, "left"]],
    },
    heal: [],
    spawns: [[4, 0], [11, 0], [0, 4], [15, 4], [2, 11], [7, 11], [13, 11]],
    shopSpots: [[5, 2], [10, 2], [2, 3], [13, 3], [5, 9], [10, 9]],
  }),
  5: buildMap({
    area: 5,
    name: "ทะเลทราย",
    healKind: "oasis",
    terrain: {
      cactus: [[2, 1], [13, 1], [2, 5], [13, 5]],
      dune: [[1, 3], [2, 3], [13, 3], [14, 3], [1, 8], [2, 8], [13, 8], [14, 8]],
      ruin: [[5, 3], [6, 3], [9, 3], [10, 3], [5, 4], [10, 4], [5, 7], [10, 7], [5, 8], [6, 8], [9, 8], [10, 8]],
    },
    special: {
      quicksand: [[7, 1], [8, 1], [7, 3], [8, 3], [5, 6], [10, 6], [7, 8], [8, 8], [7, 10], [8, 10]],
    },
    heal: [[7, 5], [8, 5]],
    spawns: [[4, 0], [11, 0], [0, 4], [15, 4], [2, 11], [7, 11], [13, 11]],
    shopSpots: [[5, 2], [10, 2], [6, 9], [9, 9], [4, 10], [11, 10]],
  }),
  6: buildMap({
    area: 6,
    name: "อาณาจักรน้ำแข็ง",
    terrain: {
      pine: [[0, 0], [1, 0], [14, 0], [15, 0], [0, 1], [15, 1], [0, 10], [15, 10], [0, 11], [1, 11], [14, 11], [15, 11]],
      rock: [[2, 3], [13, 3], [2, 8], [13, 8]],
      iceblock: [[6, 4], [9, 4], [6, 7], [9, 7]],
    },
    special: {
      ice: [[6, 2], [7, 2], [8, 2], [9, 2], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [4, 4], [5, 4], [7, 4], [8, 4], [10, 4], [11, 4], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], [12, 5], [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6], [9, 6], [10, 6], [11, 6], [12, 6], [4, 7], [5, 7], [7, 7], [8, 7], [10, 7], [11, 7], [5, 8], [6, 8], [7, 8], [8, 8], [9, 8], [10, 8], [6, 9], [7, 9], [8, 9], [9, 9]],
    },
    heal: [],
    spawns: [[4, 0], [11, 0], [0, 4], [15, 4], [3, 11], [7, 11], [12, 11]],
    shopSpots: [[4, 2], [11, 2], [4, 9], [11, 9]],
  }),
  7: buildMap({
    area: 7,
    name: "จุดสิ้นสุดของโลก",
    terrain: {
      crystal: [[0, 0], [15, 0], [7, 4], [8, 4], [7, 7], [8, 7], [0, 11], [15, 11]],
      ruin: [[3, 1], [12, 1], [3, 10], [12, 10]],
      obelisk: [[5, 3], [10, 3], [2, 6], [13, 6], [5, 8], [10, 8]],
    },
    special: {
      power: [[1, 2], [14, 2], [7, 5], [8, 5], [1, 9], [14, 9]],
      lava: [[7, 2], [8, 2], [0, 3], [1, 3], [2, 3], [13, 3], [14, 3], [15, 3], [2, 4], [3, 4], [12, 4], [13, 4], [5, 5], [6, 5], [9, 5], [10, 5], [5, 6], [10, 6], [5, 7], [6, 7], [9, 7], [10, 7], [0, 8], [1, 8], [2, 8], [13, 8], [14, 8], [15, 8], [7, 9], [8, 9]],
    },
    heal: [],
    spawns: [[4, 0], [11, 0], [0, 4], [15, 4], [2, 11], [7, 11], [13, 11]],
    shopSpots: [[5, 2], [10, 2], [5, 9], [10, 9]],
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
// ข้อมูลช่องสำหรับป้ายบนหน้าจอ → { kind, name, icon, desc } · พื้นธรรมดา/สิ่งกีดขวาง = null
function tileInfo(map, x, y) {
  const kind = isHeal(map, x, y) ? (map.healKind || "heal") : specialAt(map, x, y);
  const info = TERRAIN_INFO[kind];
  return info ? { kind, name: info.name, icon: info.icon, desc: info.desc } : null;
}
function dist(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
// range = [rmin, rmax] (ตีปกติ) — ประชิด = [1, 1] · ธนู = [2, 2]
function inRange(range, d) {
  return d >= range[0] && d <= range[1];
}
function unitAt(units, x, y) {
  return units.find((u) => u.alive && u.x === x && u.y === y) || null;
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
function reachable(map, unit, mov, units, { isAlly = () => false, blocked = null } = {}) {
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
// เส้นทางจากช่องเริ่มถึงช่องปลาย (รวมทั้งสองปลาย) · ไปไม่ถึง = null
function pathTo(reach, x, y) {
  let node = reach.get(key(x, y));
  if (!node) return null;
  const path = [];
  while (node) { path.unshift({ x: node.x, y: node.y }); node = node.prev; }
  return path;
}

// ---------- ระยะ / พื้นที่ ----------
// ช่องในกระดานที่ห่างจาก (x, y) อยู่ในช่วง [rmin, rmax]
function tilesInRange(map, x, y, range) {
  const out = [];
  for (let dx = -range[1]; dx <= range[1]; dx++) {
    for (let dy = -range[1]; dy <= range[1]; dy++) {
      const d = Math.abs(dx) + Math.abs(dy);
      if (inRange(range, d) && inBounds(map, x + dx, y + dy)) out.push({ x: x + dx, y: y + dy });
    }
  }
  return out;
}
// สกิลตีหมู่ "รอบตัว N" = ข้าวหลามตัดรัศมี N (ไม่รวมช่องที่ยืน)
function aoeTiles(map, x, y, radius) {
  return tilesInRange(map, x, y, [1, radius]);
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
// ผู้เล่นที่ยังอยู่ซึ่งยืนในชุดช่องที่ให้มา
function unitsOnTiles(units, tiles) {
  const set = new Set(tiles.map((t) => key(t.x, t.y)));
  return units.filter((u) => u.alive && set.has(key(u.x, u.y)));
}
// เป้าที่ตีปกติได้จากช่อง (x, y) ด้วยระยะ range (ไม่รวมตัวเองและพวกเดียวกัน)
function attackTargets(attacker, x, y, range, units, { isAlly = () => false } = {}) {
  return units.filter((u) => u.alive && u.id !== attacker.id && !isAlly(attacker, u) && inRange(range, dist({ x, y }, u)));
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
function threatZone(map, unit, mov, range, units, opts = {}) {
  const reach = reachable(map, unit, mov, units, opts);
  const move = new Set(reach.keys());
  const threat = new Set();
  for (const n of reach.values()) {
    for (const t of tilesInRange(map, n.x, n.y, range)) {
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

// state.board จาก server ส่ง heal เป็น array ของ "x,y" — แปลงกลับเป็นรูปเดียวกับแผนที่ฝั่ง server ก่อนส่งให้ฟังก์ชันในไฟล์นี้
function normalizeMap(pub) {
  if (!pub) return null;
  return {
    ...pub,
    terrain: pub.terrain || {}, special: pub.special || {}, flow: pub.flow || {}, healKind: pub.healKind || "heal",
    heal: pub.heal instanceof Set ? pub.heal : new Set(pub.heal || []),
  };
}

export {
  COLS, ROWS, DIRS, LINE_DIRS, MAPS, TERRAIN_INFO,
  key, mapOf, inBounds, isObstacle, isHeal, dist, inRange, unitAt,
  specialAt, moveCost, terrainEvade, terrainAtk, tileInfo, freeTile,
  reachable, pathTo,
  tilesInRange, aoeTiles, lineTiles, unitsOnTiles, attackTargets,
  canCounter, pushback, threatZone, endTurnTile,
  assignSpawns, pickShopSpot, nearShop,
  normalizeMap,
};
