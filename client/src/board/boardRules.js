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

// ---------- แผนที่รายภูมิภาค ----------
//  terrain = สิ่งกีดขวาง (ชนิดใช้แค่ตอนวาด — กติกาเหมือนกันหมด: เดินผ่าน/ยืนไม่ได้ ไม่บังการตี)
//  heal = จุดฟื้นฟู (จบตาบนช่องนี้ เลือด +1) · spawns = จุดเกิด 7 จุด · shopSpots = จุดที่ร้านค้ามายาสุ่มไปตั้ง
//  ภูมิภาคที่ยังไม่มีแผนที่ใช้ของภูมิภาค I ไปก่อน (mapOf)
function buildMap({ area, name, terrain, heal, spawns, shopSpots }) {
  const t = {};
  for (const [kind, list] of Object.entries(terrain)) for (const [x, y] of list) t[key(x, y)] = kind;
  return {
    area, name, cols: COLS, rows: ROWS,
    terrain: t,
    heal: new Set(heal.map(([x, y]) => key(x, y))),
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
};

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

// ---------- การเดิน ----------
// BFS 4 ทิศ ไม่เกิน mov ก้าว · คืน Map<key, { x, y, d, prev }> ของช่องที่ "หยุดได้" รวมช่องเริ่ม
//  เดินผ่านพวกเดียวกันได้ (isAlly) แต่หยุดทับไม่ได้ · ผ่านศัตรูไม่ได้ · ผ่านสิ่งกีดขวาง/blocked ไม่ได้
function reachable(map, unit, mov, units, { isAlly = () => false, blocked = null } = {}) {
  const start = { x: unit.x, y: unit.y, d: 0, prev: null };
  const seen = new Map([[key(unit.x, unit.y), start]]);
  const stops = new Map([[key(unit.x, unit.y), start]]);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift();
    if (cur.d >= mov) continue;
    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx, ny = cur.y + dy, k = key(nx, ny);
      if (seen.has(k) || isObstacle(map, nx, ny, blocked)) continue;
      const other = unitAt(units, nx, ny);
      if (other && other.id !== unit.id && !isAlly(unit, other)) continue; // ศัตรูขวางทาง
      const node = { x: nx, y: ny, d: cur.d + 1, prev: cur };
      seen.set(k, node);
      queue.push(node);
      if (!other || other.id === unit.id) stops.set(k, node); // ช่องที่มีเพื่อนยืนอยู่ = ผ่านได้แต่หยุดไม่ได้
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
function pushback(map, attackerPos, defenderPos, units, { selfId = null, blocked = null } = {}) {
  const dx = attackerPos.x - defenderPos.x, dy = attackerPos.y - defenderPos.y;
  const sx = Math.sign(dx), sy = Math.sign(dy);
  let dirs;
  if (Math.abs(dx) > Math.abs(dy)) dirs = [[sx, 0]];
  else if (Math.abs(dy) > Math.abs(dx)) dirs = [[0, sy]];
  else dirs = [[0, sy], [sx, 0]];
  const free = ([ux, uy]) => {
    const nx = attackerPos.x + ux, ny = attackerPos.y + uy;
    if (isObstacle(map, nx, ny, blocked)) return false;
    const other = unitAt(units, nx, ny);
    return !other || other.id === selfId;
  };
  const dir = dirs.find(free);
  if (!dir) return { x: attackerPos.x, y: attackerPos.y, moved: false, collide: true };
  return { x: attackerPos.x + dir[0], y: attackerPos.y + dir[1], moved: true, collide: false };
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
  return { ...pub, terrain: pub.terrain || {}, heal: pub.heal instanceof Set ? pub.heal : new Set(pub.heal || []) };
}

export {
  COLS, ROWS, DIRS, LINE_DIRS, MAPS,
  key, mapOf, inBounds, isObstacle, isHeal, dist, inRange, unitAt,
  reachable, pathTo,
  tilesInRange, aoeTiles, lineTiles, unitsOnTiles, attackTargets,
  canCounter, pushback, threatZone,
  assignSpawns, pickShopSpot, nearShop,
  normalizeMap,
};
