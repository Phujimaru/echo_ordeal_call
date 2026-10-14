// แผนที่ภูมิภาค II–VII + ช่องพิเศษแบบ Fire Emblem (GRID_PLAN §3.1 · ขั้น 7)
//  ส่วนแรก = กติกาล้วนใน server/board.js (แผนที่สมมติ) · ส่วนหลัง = ต่อกับ engine จริง (ตี/ตีสวน/จบตา บนแผนที่จริง)
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine, resolveRound } = require('../server.js');
const Board = require('../server/board.js');
const action = require('../server/phases/action.js');
const attack = require('../server/phases/attack.js');
const match = require('../server/match.js');

const K = Board.key;
const u = (id, x, y, extra = {}) => ({ id, x, y, alive: true, ...extra });
// แผนที่สมมติ 14×14 โล่งๆ — special = { "x,y": ชนิด } · terrain = { "x,y": สิ่งกีดขวาง }
const mapWith = (special = {}, terrain = {}, flow = {}) => ({
  cols: 14, rows: 14, terrain, special, flow, heal: new Set(), healKind: 'heal', spawns: [], shopSpots: [],
});
const path = (reach, x, y) => (Board.pathTo(reach, x, y) || []).map((t) => K(t.x, t.y));

// ชนิดสิ่งกีดขวาง/ช่องพิเศษของแต่ละภูมิภาค (ชื่อตายตัว — ตัววาดกระดานใช้ชื่อเหล่านี้)
const KINDS = {
  2: { obstacles: ['rock', 'windmill', 'fence'], special: ['flowers'] },
  3: { obstacles: ['deadtree', 'stump', 'rock'], special: ['forest', 'thorns'] },
  4: { obstacles: ['reef', 'rock', 'wreck'], special: ['shallow', 'whirl'] },
  5: { obstacles: ['cactus', 'ruin', 'dune'], special: ['quicksand'] },
  6: { obstacles: ['iceblock', 'pine', 'rock'], special: ['ice'] },
  7: { obstacles: ['crystal', 'ruin', 'obelisk'], special: ['lava', 'power'] },
};

// ---------- แผนที่จริงทุกภูมิภาค ----------
test('แผนที่ I–VII: 14×14 (จัตุรัส) · จุดเกิด 7 จุดบนพื้นธรรมดา ไม่ซ้ำ ไม่ติดกัน · จุดร้านค้า 4–6 จุดบนพื้นธรรมดา', () => {
  for (let area = 1; area <= 7; area++) {
    const m = Board.MAPS[area];
    assert.equal(m.area, area);
    assert.equal(m.cols, 14);
    assert.equal(m.rows, 14);
    const plain = (s) => Board.inBounds(m, s.x, s.y) && !m.terrain[K(s.x, s.y)] && !Board.specialAt(m, s.x, s.y) && !Board.isHeal(m, s.x, s.y);
    assert.equal(m.spawns.length, 7, `ภูมิภาค ${area} จุดเกิด`);
    assert.equal(new Set(m.spawns.map((s) => K(s.x, s.y))).size, 7);
    for (const s of m.spawns) assert.ok(plain(s), `ภูมิภาค ${area} จุดเกิด ${K(s.x, s.y)} ต้องเป็นพื้นธรรมดา`);
    for (const a of m.spawns) for (const b of m.spawns) if (a !== b) assert.ok(Board.dist(a, b) >= 2, `ภูมิภาค ${area} จุดเกิดติดกัน ${K(a.x, a.y)}`);
    // จุดเกิดอยู่รอบขอบ (ห่างขอบไม่เกิน 2 ช่อง)
    for (const s of m.spawns) assert.ok(Math.min(s.x, s.y, m.cols - 1 - s.x, m.rows - 1 - s.y) <= 2, `ภูมิภาค ${area} จุดเกิด ${K(s.x, s.y)} ต้องอยู่ริมขอบ`);
    assert.ok(m.shopSpots.length >= 4 && m.shopSpots.length <= 6, `ภูมิภาค ${area} จุดร้านค้า`);
    assert.equal(new Set(m.shopSpots.map((s) => K(s.x, s.y))).size, m.shopSpots.length);
    const spawnKeys = new Set(m.spawns.map((s) => K(s.x, s.y)));
    for (const s of m.shopSpots) {
      assert.ok(plain(s), `ภูมิภาค ${area} จุดร้านค้า ${K(s.x, s.y)} ต้องเป็นพื้นธรรมดา`);
      assert.ok(!spawnKeys.has(K(s.x, s.y)), `ภูมิภาค ${area} จุดร้านค้าทับจุดเกิด`);
    }
  }
});

test('แผนที่ II–VII: ชนิดสิ่งกีดขวาง/ช่องพิเศษตามภูมิภาค · สิ่งกีดขวาง 14–24 · จุดฟื้นฟูมีแค่ I และ V (โอเอซิส 2–4)', () => {
  for (let area = 2; area <= 7; area++) {
    const m = Board.MAPS[area];
    const obs = Object.values(m.terrain);
    assert.ok(obs.length >= 14 && obs.length <= 24, `ภูมิภาค ${area} สิ่งกีดขวาง ${obs.length}`);
    for (const kind of obs) assert.ok(KINDS[area].obstacles.includes(kind), `ภูมิภาค ${area} สิ่งกีดขวาง ${kind}`);
    const sp = Object.values(m.special);
    assert.deepEqual([...new Set(sp)].sort(), [...KINDS[area].special].sort(), `ภูมิภาค ${area} ช่องพิเศษ`);
    for (const k of Object.keys(m.special)) {
      assert.ok(!m.terrain[k], `ภูมิภาค ${area} ช่องพิเศษ ${k} ทับสิ่งกีดขวาง`);
      assert.ok(!m.heal.has(k), `ภูมิภาค ${area} ช่องพิเศษ ${k} ทับจุดฟื้นฟู`);
    }
    // น้ำวนทุกช่องมีทิศกระแส · ทิศกระแสมีเฉพาะบนน้ำวน
    for (const [k, kind] of Object.entries(m.special)) if (kind === 'whirl') assert.ok(Board.LINE_DIRS[m.flow[k]], `น้ำวน ${k} ไม่มีทิศ`);
    for (const k of Object.keys(m.flow)) assert.equal(m.special[k], 'whirl');
    if (area === 5) {
      assert.ok(m.heal.size >= 2 && m.heal.size <= 4);
      assert.equal(m.healKind, 'oasis');
      for (const k of m.heal) assert.ok(!m.terrain[k]);
    } else {
      assert.equal(m.heal.size, 0, `ภูมิภาค ${area} ไม่มีจุดฟื้นฟู`);
    }
  }
  assert.deepEqual(Board.MAPS[1].special, {});
  assert.deepEqual(Board.MAPS[1].flow, {});
});

test('TERRAIN_INFO: มีป้ายข้อมูลครบทุกชนิดช่องพิเศษ + จุดฟื้นฟู/โอเอซิส · tileInfo ตามภูมิภาค', () => {
  const kinds = new Set(['heal', 'oasis']);
  for (const m of Object.values(Board.MAPS)) for (const kind of Object.values(m.special)) kinds.add(kind);
  for (const kind of kinds) {
    const info = Board.TERRAIN_INFO[kind];
    assert.ok(info && info.name && info.desc && info.icon, `ป้ายของ ${kind}`);
  }
  assert.equal(Board.tileInfo(Board.MAPS[1], 6, 6).name, 'วงเวทฟื้นฟู');
  assert.equal(Board.tileInfo(Board.MAPS[5], 6, 6).name, 'โอเอซิส');
  assert.equal(Board.tileInfo(Board.MAPS[2], 7, 4).kind, 'flowers');
  assert.equal(Board.tileInfo(Board.MAPS[2], 6, 3), null, 'พื้นธรรมดาไม่มีป้าย');
});

// ช่องที่ "หยุดได้" จากจุดหนึ่ง (ไม่สนคน · ก้าวไม่จำกัด)
//  น้ำแข็ง (§7.9) ไถลจนสุดแนว → ช่องกลางแนวเป็นแค่ทางผ่านเมื่อเข้าตามแนว แต่แนวน้ำแข็งของภูมิภาค VI กว้าง 1 ช่อง
//  → เดินเข้าจากด้านข้างแล้วหยุดบนช่องนั้นได้ทุกช่อง จึงบังคับให้ทุกช่อง (รวมน้ำแข็ง) เป็นจุดหยุดได้
function coverage(map, from, blocked = null) {
  return new Set(Board.reachable(map, u('walker', from.x, from.y), 999, [], { blocked }).keys());
}
test('แผนที่ I–VII: ทุกช่องที่ไม่ใช่สิ่งกีดขวางเดินไปหยุดได้จากทุกจุดเกิด รวมช่องน้ำแข็ง (แม้ร้านค้าตั้งอยู่จุดไหนก็ตาม)', () => {
  for (const m of Object.values(Board.MAPS)) {
    const check = (from, blocked) => {
      const stops = coverage(m, from, blocked);
      for (let x = 0; x < m.cols; x++) {
        for (let y = 0; y < m.rows; y++) {
          const k = K(x, y);
          if (m.terrain[k] || (blocked && blocked.has(k))) continue;
          assert.ok(stops.has(k), `ภูมิภาค ${m.area}: ${k} หยุดไม่ได้จาก ${K(from.x, from.y)}`);
        }
      }
    };
    for (const s of m.spawns) check(s, null);
    for (const shop of m.shopSpots) check(m.spawns[0], new Set([K(shop.x, shop.y)]));
  }
});

// ---------- ช่องอันตรายขวางทางหลัก (ผู้ใช้ตัดสิน 2026-10-09) ----------
//  ช่องอันตราย = ช่องที่มีผลเสียตอนจบตา/เดินเข้า (หนามพิษ น้ำวน ทรายดูด ลาวา)
const HAZARDS = new Set(['thorns', 'whirl', 'quicksand', 'lava']);
// ก้าวน้อยสุดจาก from ไปทุกช่อง (ค่าเดินตามช่อง · ไม่คิดไถล/ทรายดูดหยุด — วัดแค่ความยาวทาง) · avoid = ห้ามเหยียบช่องอันตราย
function steps(m, from, avoid) {
  const best = new Map([[K(from.x, from.y), 0]]);
  const buckets = [[from]];
  for (let d = 0; d < buckets.length; d++) {
    for (const cur of buckets[d] || []) {
      if (best.get(K(cur.x, cur.y)) !== d) continue;
      for (const [dx, dy] of Board.DIRS) {
        const x = cur.x + dx, y = cur.y + dy, k = K(x, y);
        if (Board.isObstacle(m, x, y)) continue;
        if (avoid && HAZARDS.has(Board.specialAt(m, x, y))) continue;
        const nd = d + Board.moveCost(m, x, y);
        if (best.has(k) && best.get(k) <= nd) continue;
        best.set(k, nd);
        (buckets[nd] ||= []).push({ x, y });
      }
    }
  }
  return best;
}
// จุดสำคัญของแผนที่: ศูนย์กลาง (กลางแผนที่ 4 ช่อง + จุดฟื้นฟู + แท่นพลัง) และจุดร้านค้าแต่ละจุด
function keyPoints(m) {
  const hub = [[6, 6], [7, 6], [6, 7], [7, 7]].filter(([x, y]) => !Board.isObstacle(m, x, y)).map(([x, y]) => K(x, y));
  for (const k of m.heal) hub.push(k);
  for (const [k, kind] of Object.entries(m.special)) if (kind === 'power') hub.push(k);
  const groups = hub.length ? [{ name: 'ศูนย์กลาง', keys: hub, hub: true }] : [];
  for (const s of m.shopSpots) groups.push({ name: `ร้าน ${K(s.x, s.y)}`, keys: [K(s.x, s.y)] });
  return groups;
}
test('ช่องอันตรายวางขวางทางหลัก: ลุยสั้นกว่าอ้อม ≥ 2 ก้าว (จุดเกิด → ศูนย์กลาง/จุดร้านค้า) · จุดเกิดทุกคู่ยังมีทางไม่ผ่านช่องอันตราย', () => {
  for (const m of Object.values(Board.MAPS)) {
    const hazards = Object.values(m.special).filter((kind) => HAZARDS.has(kind));
    if (!hazards.length) continue;
    assert.ok(hazards.length >= 12, `ภูมิภาค ${m.area}: ช่องอันตรายต้องเป็นแนวกว้าง (มี ${hazards.length})`);
    const groups = keyPoints(m);
    let cut = 0;
    const cutSpawns = new Set(), cutHub = new Set();
    for (const s of m.spawns) {
      const any = steps(m, s, false), safe = steps(m, s, true);
      for (const t of m.spawns) assert.ok(safe.has(K(t.x, t.y)), `ภูมิภาค ${m.area}: ${K(s.x, s.y)} → ${K(t.x, t.y)} ต้องมีทางไม่ผ่านช่องอันตราย`);
      for (const g of groups) {
        const d1 = Math.min(...g.keys.map((k) => (any.has(k) ? any.get(k) : Infinity)));
        const d2 = Math.min(...g.keys.map((k) => (safe.has(k) ? safe.get(k) : Infinity)));
        assert.ok(Number.isFinite(d2), `ภูมิภาค ${m.area}: ${g.name} ต้องไปถึงได้แบบไม่ผ่านช่องอันตรายจาก ${K(s.x, s.y)}`);
        if (d2 - d1 >= 2) {
          cut++;
          cutSpawns.add(K(s.x, s.y));
          if (g.hub) cutHub.add(K(s.x, s.y));
        }
      }
    }
    // ช่องอันตรายต้องอยู่บนทางหลักจริง (ไม่ใช่จุดเล็กๆ ที่ไม่มีใครเหยียบ)
    assert.ok(cut >= 14, `ภูมิภาค ${m.area}: คู่จุดเกิด→จุดสำคัญที่ช่องอันตรายตัดทาง ${cut} คู่`);
    assert.ok(cutSpawns.size >= 5, `ภูมิภาค ${m.area}: จุดเกิดที่ต้องเลือกลุย/อ้อม ${cutSpawns.size} จุด`);
    if (groups.some((g) => g.hub)) assert.ok(cutHub.size >= 2, `ภูมิภาค ${m.area}: ทางไปศูนย์กลางที่ช่องอันตรายตัด ${cutHub.size} จุดเกิด`);
  }
  // ภูมิภาคที่มีช่องอันตราย
  for (const area of [3, 4, 5, 7]) assert.ok(Object.values(Board.MAPS[area].special).some((kind) => HAZARDS.has(kind)), `ภูมิภาค ${area}`);
});

test('ช่องเดินช้า/น้ำแข็งคลุมพื้นที่จริงจัง: ดอกไม้ ป่าทึบ น้ำตื้น ≥ 20 ช่อง · น้ำแข็ง 35–55 ช่อง', () => {
  const count = (area, kind) => Object.values(Board.MAPS[area].special).filter((k) => k === kind).length;
  assert.ok(count(2, 'flowers') >= 20);
  assert.ok(count(3, 'forest') >= 20);
  assert.ok(count(4, 'shallow') >= 20);
  assert.ok(count(6, 'ice') >= 35 && count(6, 'ice') <= 55, `น้ำแข็ง ${count(6, 'ice')} ช่อง`);
});

test('ภูมิภาค VI: น้ำแข็งกระจายทั่วแผนที่ (ไม่กระจุกกลาง) · แนวน้ำแข็งยาว ≥ 4 ช่องหลายแนวทั้งแนวตั้งและแนวนอน', () => {
  const m = Board.MAPS[6];
  const ice = (x, y) => Board.isIce(m, x, y);
  // ทุกมุมของแผนที่ (7×7) มีน้ำแข็ง ≥ 8 ช่อง
  for (const [qx, qy] of [[0, 0], [7, 0], [0, 7], [7, 7]]) {
    let n = 0;
    for (let x = qx; x < qx + 7; x++) for (let y = qy; y < qy + 7; y++) if (ice(x, y)) n++;
    assert.ok(n >= 8, `มุม ${qx},${qy} มีน้ำแข็ง ${n} ช่อง`);
  }
  // ไม่มีน้ำแข็งเต็มบล็อก 3×3 (ทะเลสาบผืนใหญ่ = ไถลยาวจนกลางแนวหยุดไม่ได้)
  for (let x = 0; x + 2 < m.cols; x++) {
    for (let y = 0; y + 2 < m.rows; y++) {
      let all = true;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (!ice(x + i, y + j)) all = false;
      assert.ok(!all, `น้ำแข็งเต็มบล็อก 3×3 ที่ ${K(x, y)}`);
    }
  }
  // แนวน้ำแข็งยาว ≥ 4 ช่อง (นับจากหัวแนว)
  const lanes = { h: 0, v: 0 };
  for (let x = 0; x < m.cols; x++) {
    for (let y = 0; y < m.rows; y++) {
      if (!ice(x, y)) continue;
      if (!ice(x - 1, y) && Board.slideLine(m, x, y, 1, 0, []).tiles.length >= 4) lanes.h++;
      if (!ice(x, y - 1) && Board.slideLine(m, x, y, 0, 1, []).tiles.length >= 4) lanes.v++;
    }
  }
  assert.ok(lanes.h >= 3 && lanes.v >= 3, `แนวนอน ${lanes.h} · แนวตั้ง ${lanes.v}`);
});

// ---------- ค่าเดิน ----------
test('ค่าเดิน: พุ่มดอกไม้/ป่าทึบ/น้ำตื้น เดินเข้ากิน 2 ก้าว · ก้าวไม่พอ = เข้าไม่ได้', () => {
  for (const kind of ['flowers', 'forest', 'shallow']) {
    const m = mapWith({ '5,5': kind });
    assert.equal(Board.moveCost(m, 5, 5), 2);
    const me = u('A', 4, 5);
    assert.ok(!Board.reachable(m, me, 1, [me]).has('5,5'), `${kind}: เดิน 1 เข้าไม่ได้`);
    const r2 = Board.reachable(m, me, 2, [me]);
    assert.equal(r2.get('5,5').d, 2);
    // ทะลุพุ่มไป (6,5) = 3 ก้าว (อ้อม = 4)
    const r3 = Board.reachable(m, me, 3, [me]);
    assert.equal(r3.get('6,5').d, 3);
    assert.deepEqual(path(r3, 6, 5), ['4,5', '5,5', '6,5']);
  }
  assert.equal(Board.moveCost(mapWith(), 5, 5), 1);
  assert.equal(Board.moveCost(mapWith({ '5,5': 'lava' }), 5, 5), 1);
});

test('ทรายดูด: เดินเข้าแล้วหยุดทันที (เดินต่อจากช่องนั้นไม่ได้) · ยืนอยู่ตั้งแต่ต้นตาเดินออกได้', () => {
  const m = mapWith({ '5,5': 'quicksand' });
  const me = u('A', 4, 5);
  const reach = Board.reachable(m, me, 4, [me]);
  assert.equal(reach.get('5,5').d, 1, 'หยุดบนทรายดูดได้');
  assert.equal(reach.get('6,5').d, 4, 'ทะลุทรายดูดไม่ได้ ต้องอ้อม');
  for (const n of reach.values()) assert.ok(!(n.prev && n.prev.x === 5 && n.prev.y === 5), 'ไม่มีทางไหนเดินต่อจากทรายดูด');
  const stuck = u('A', 5, 5);
  assert.equal(Board.reachable(m, stuck, 2, [stuck]).get('7,5').d, 2);
});

// น้ำแข็ง (ผู้ใช้ตัดสิน 2026-10-12 — GRID_PLAN §7.9): เดินเข้าแล้วไถลไปทิศที่เข้าจนสุดแนวน้ำแข็ง แล้วจบการเดิน
const LANE = { '5,5': 'ice', '6,5': 'ice', '7,5': 'ice', '8,5': 'ice' }; // แนวนอน (5..8, 5)
test('น้ำแข็ง: เดินเข้าแล้วไถลไปทิศเดิมจนสุดแนว ไม่เสียก้าวเพิ่ม · ช่องกลางแนวเป็นทางผ่าน · เส้นทางมีทุกช่องที่ไถลผ่าน', () => {
  const m = mapWith(LANE);
  const me = u('A', 4, 5);
  const reach = Board.reachable(m, me, 1, [me]);
  for (const k of ['5,5', '6,5', '7,5']) assert.ok(!reach.has(k), `${k} หยุดไม่ได้เมื่อเข้าตามแนว`);
  assert.equal(reach.get('8,5').d, 1);
  assert.equal(reach.get('8,5').slide, true);
  assert.deepEqual(path(reach, 8, 5), ['4,5', '5,5', '6,5', '7,5', '8,5']);
  // ไถลจากอีกฝั่ง → หยุดหัวแนว
  const right = u('A', 9, 5);
  assert.deepEqual(path(Board.reachable(m, right, 1, [right]), 5, 5), ['9,5', '8,5', '7,5', '6,5', '5,5']);
  // เข้าจากด้านข้าง (แนวกว้าง 1 ช่อง) → ช่องถัดไปไม่ใช่น้ำแข็ง = หยุดบนช่องนั้นเลย
  const top = u('A', 6, 4);
  const rt = Board.reachable(m, top, 1, [top]);
  assert.equal(rt.get('6,5').d, 1);
  assert.deepEqual(path(rt, 6, 5), ['6,4', '6,5']);
  assert.ok(!rt.has('6,6'));
  // แนวตั้ง
  const col = mapWith({ '3,2': 'ice', '3,3': 'ice', '3,4': 'ice' });
  const up = u('A', 3, 1);
  assert.deepEqual(path(Board.reachable(col, up, 1, [up]), 3, 4), ['3,1', '3,2', '3,3', '3,4']);
});

test('น้ำแข็ง: ไถลแล้วจบการเดิน — ก้าวเหลือก็เดินต่อจากปลายแนวไม่ได้ · ยืนบนน้ำแข็งแล้วเดินออกไปพื้นไม่ไถล', () => {
  const m = mapWith(LANE);
  const me = u('A', 4, 5);
  const reach = Board.reachable(m, me, 4, [me]);
  assert.equal(reach.get('8,5').d, 1);
  for (const n of reach.values()) assert.ok(!(n.prev && n.prev.slide), `${K(n.x, n.y)} เดินต่อจากปลายไถล`);
  assert.ok(!reach.has('9,5'), '(9,5) ต้องอ้อมแนวน้ำแข็ง = 7 ก้าว');
  // ยืนบนน้ำแข็งตั้งแต่ต้นตา: เดินออกไปพื้นไม่ไถล · ก้าวไปน้ำแข็งช่องข้างๆ = ไถลต่อตามแนว
  const onIce = u('A', 6, 5);
  const r = Board.reachable(m, onIce, 2, [onIce]);
  assert.equal(r.get('6,4').d, 1);
  assert.equal(r.get('6,3').d, 2);
  assert.equal(r.get('8,5').d, 1);
  assert.ok(!r.has('7,5'));
  assert.equal(r.get('5,5').d, 1);
});

test('น้ำแข็ง: ไถลหยุดบนน้ำแข็งช่องสุดท้ายที่ว่าง — ก่อนสิ่งกีดขวาง/คน/ร้านค้า · ไถลถึงขอบกระดาน', () => {
  const me = u('A', 4, 5);
  const wall = mapWith(LANE, { '7,5': 'rock' }); // หินทับกลางแนว = ไม่ใช่น้ำแข็ง
  assert.equal(Board.reachable(wall, me, 1, [me]).get('6,5').d, 1);
  const edge = mapWith({ '10,5': 'ice', '11,5': 'ice', '12,5': 'ice', '13,5': 'ice' });
  const e = u('A', 9, 5);
  const re = Board.reachable(edge, e, 1, [e]);
  assert.ok(re.has('13,5') && !re.has('10,5'));
  const m = mapWith(LANE);
  const foe = u('B', 7, 5);
  const rf = Board.reachable(m, me, 1, [me, foe]);
  assert.ok(rf.has('6,5') && !rf.has('8,5'), 'ศัตรูยืนกลางแนว');
  const ally = u('C', 7, 5);
  const ra = Board.reachable(m, me, 1, [me, ally], { isAlly: () => true });
  assert.ok(ra.has('6,5') && !ra.has('8,5'), 'เพื่อนยืนกลางแนวก็หยุดก่อน');
  const rs = Board.reachable(m, me, 1, [me], { blocked: new Set(['7,5']) });
  assert.ok(rs.has('6,5') && !rs.has('8,5'), 'แผงร้านค้า');
  // เพื่อนยืนบนน้ำแข็งช่องแรก = เข้าแนวนี้ไม่ได้
  const first = u('C', 5, 5);
  const r1 = Board.reachable(m, me, 1, [me, first], { isAlly: () => true });
  for (const k of ['5,5', '6,5', '7,5', '8,5']) assert.ok(!r1.has(k), k);
});

test('slideLine: ช่องที่หยุด · ช่องที่ผ่าน · ของที่ชน (คน/สิ่งกีดขวาง/ไม่มี) · ทแยงได้', () => {
  const m = mapWith(LANE, { '9,5': 'rock' });
  assert.deepEqual(Board.slideLine(m, 5, 5, 1, 0, []), {
    x: 8, y: 5, tiles: [{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 7, y: 5 }, { x: 8, y: 5 }], hit: { kind: 'obstacle', terrain: 'rock', x: 9, y: 5 },
  });
  const s = Board.slideLine(m, 5, 5, 1, 0, [u('X', 7, 5)]);
  assert.deepEqual([s.x, s.y, s.tiles.length, s.hit], [6, 5, 2, { kind: 'unit', id: 'X', x: 7, y: 5 }]);
  assert.equal(Board.slideLine(m, 5, 5, 1, 0, [u('A', 7, 5)], 'A').x, 8, 'ตัวเองไม่ขวาง');
  assert.equal(Board.slideLine(m, 8, 5, -1, 0, []).hit, null, 'สุดแนวเป็นพื้นว่าง');
  assert.equal(Board.slideLine(mapWith({ '12,5': 'ice', '13,5': 'ice' }), 12, 5, 1, 0, []).hit, null, 'ขอบกระดาน');
  assert.equal(Board.slideLine(m, 5, 5, 1, 0, [], null, new Set(['7,5'])).x, 6, 'ร้านค้าขวาง');
  // ทแยง (ผลักทแยง)
  const diag = mapWith({ '5,5': 'ice', '6,6': 'ice', '7,7': 'ice' });
  const d = Board.slideLine(diag, 5, 5, 1, 1, []);
  assert.deepEqual([d.x, d.y, d.tiles.length], [7, 7, 3]);
  // ช่องที่มีสิ่งกีดขวางทับไม่นับเป็นน้ำแข็ง
  assert.equal(Board.isIce(mapWith({ '5,5': 'ice' }, { '5,5': 'icespike1' }), 5, 5), false);
});

test('ถอยลงน้ำแข็ง: ไถลต่อจนสุดแนว (via = ช่องน้ำแข็งช่องแรก) · ช่องถัดไปไม่ว่าง = หยุดก่อน', () => {
  const m = mapWith({ '6,5': 'ice', '7,5': 'ice', '8,5': 'ice', '9,5': 'ice' });
  assert.deepEqual(Board.pushback(m, { x: 5, y: 5 }, { x: 4, y: 5 }, []), { x: 9, y: 5, moved: true, collide: false, via: { x: 6, y: 5 } });
  assert.deepEqual(Board.pushback(m, { x: 5, y: 5 }, { x: 4, y: 5 }, [u('X', 8, 5)]), { x: 7, y: 5, moved: true, collide: false, via: { x: 6, y: 5 } });
  // ไถลไม่ได้เลย (ช่องน้ำแข็งช่องแรกเป็นช่องสุดท้าย) = ไม่มี via
  const wall = mapWith({ '6,5': 'ice', '7,5': 'ice' }, { '7,5': 'rock' });
  assert.deepEqual(Board.pushback(wall, { x: 5, y: 5 }, { x: 4, y: 5 }, []), { x: 6, y: 5, moved: true, collide: false });
  const single = mapWith({ '6,5': 'ice' });
  assert.deepEqual(Board.pushback(single, { x: 5, y: 5 }, { x: 4, y: 5 }, []), { x: 6, y: 5, moved: true, collide: false });
  // แนวตั้ง
  const col = mapWith({ '5,6': 'ice', '5,7': 'ice', '5,8': 'ice' });
  assert.deepEqual(Board.pushback(col, { x: 5, y: 5 }, { x: 5, y: 4 }, []), { x: 5, y: 8, moved: true, collide: false, via: { x: 5, y: 6 } });
});

test('ระยะอันตรายใช้กติกาช่องพิเศษ (แผนที่น้ำแข็งจริง)', () => {
  const m = Board.MAPS[6];
  const me = u('A', 5, 3); // แนวน้ำแข็ง (0..4, 3) → เดินเข้าทางซ้ายไถลไปถึงขอบ (0,3)
  const { move, threat } = Board.threatZone(m, me, 1, [1, 1], [me]);
  assert.ok(move.has('0,3') && !move.has('4,3') && !move.has('1,3'));
  assert.ok(threat.has('0,4') && threat.has('0,2'));
});

// ---------- ผลตอนจบตา (ฟังก์ชันล้วน) ----------
test('endTurnTile: หนามพิษ/ลาวา/น้ำวน · พื้นอื่นไม่มีผล', () => {
  const m = mapWith({ '1,1': 'thorns', '2,2': 'lava', '5,5': 'whirl', '13,0': 'whirl', '3,3': 'flowers' }, { '5,4': 'rock' }, { '5,5': 'right', '13,0': 'right' });
  assert.deepEqual(Board.endTurnTile(m, 1, 1), { kind: 'thorns', turns: 1 });
  assert.deepEqual(Board.endTurnTile(m, 2, 2), { kind: 'lava', dmg: 1 });
  assert.deepEqual(Board.endTurnTile(m, 5, 5, []), { kind: 'whirl', dir: 'right', to: { x: 6, y: 5 } });
  assert.equal(Board.endTurnTile(m, 5, 5, [u('X', 6, 5)]).to, null, 'มีคนขวาง');
  assert.equal(Board.endTurnTile(m, 5, 5, [], { blocked: new Set(['6,5']) }).to, null, 'แผงร้านค้าขวาง');
  assert.equal(Board.endTurnTile(m, 13, 0).to, null, 'ขอบกระดาน');
  m.flow['5,5'] = 'up';
  assert.equal(Board.endTurnTile(m, 5, 5).to, null, 'สิ่งกีดขวาง');
  assert.equal(Board.endTurnTile(m, 3, 3), null);
  assert.equal(Board.endTurnTile(m, 9, 9), null);
});

// ---------- ต่อกับ engine (แผนที่จริง) ----------
const realRandom = Math.random;
const blank = (id, position) => ({
  id, name: id, position, characterId: 'dummy', alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId: null,
});
// เริ่มแมตช์ (ภูมิภาค I) แล้วย้ายไปกระดานภูมิภาค area · ตั้งตำแหน่งตาม pos
function setup(area, pos) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  Object.keys(pos).forEach((id, i) => { engine.players[id] = blank(id, i + 1); });
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.placeOnBoard(area);
  for (const p of Object.values(engine.players)) {
    p.hp = engine.maxHpOf(p); p.armor = 0; p.shield = 0; p.statuses = {}; p.statusAmt = {}; p.skillPoints = 5;
    p.pos = { ...pos[p.id] };
  }
  return engine.players;
}
// เปิดไพ่ให้ order เดินตามลำดับ แล้วเข้าตาเดินของคนแรก
function startActions(order) {
  for (const [i, id] of order.entries()) engine.players[id].cards = [{ value: 20 - i, color: 'blue' }];
  resolveRound();
  engine.clearPhaseTimer();
  engine.finishActor();
  engine.clearPhaseTimer();
}
const saved = { triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash };
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = () => {};
  engine.skillFlash = () => {};
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.afterEach(() => { Math.random = realRandom; engine.clearPhaseTimer(); });
const lastLogs = (n = 8) => match.lastLog.slice(-n).join('\n');

test('เปลี่ยนภูมิภาค: mapOf/boardMap ได้แผนที่จริงของภูมิภาค · state.board ส่งช่องพิเศษ/ทิศกระแส', () => {
  setup(4, { A: { x: 0, y: 4 }, B: { x: 13, y: 4 } });
  assert.equal(engine.boardMap().area, 4);
  assert.equal(engine.boardMap(), Board.MAPS[4]);
  const st = engine.buildStateFor ? engine.buildStateFor('A') : require('../server/view.js').buildStateFor('A');
  assert.equal(st.board.area, 4);
  assert.equal(st.board.special['3,6'], 'whirl');
  assert.equal(st.board.flow['3,6'], 'right');
  assert.equal(st.board.flow['10,7'], 'left'); // แม่น้ำไหลจากสองฝั่งเข้าหาซากเรือ
  assert.equal(st.board.cols, 14);
  assert.equal(st.board.rows, 14);
  assert.equal(st.board.healKind, 'heal');
});

test('ทุ่งดอกไม้: เป้าในพุ่มดอกไม้หลบการโจมตีปกติได้ 20% · ไม่พ้น = โดนตามปกติ', () => {
  // (6,4) พุ่มดอกไม้ · (6,3) พื้น — B อยู่ในพุ่ม A มองไม่เห็น (server/visibility.js) จึงตั้งให้ B โผล่เทิร์นนี้ (ตีจากพุ่มมาแล้ว)
  let P = setup(2, { A: { x: 6, y: 3 }, B: { x: 6, y: 4 } });
  startActions(['A', 'B']);
  P.B.exposedRound = engine.roundNumber;
  Math.random = () => 0; // ทอยหลบพ้น
  const hpB = P.B.hp;
  assert.equal(engine.attackTarget('A', 'B'), true);
  engine.clearPhaseTimer();
  assert.equal(P.B.hp, hpB, 'หลบพ้น');
  assert.equal(engine.lastAttack.dodge, true);
  assert.ok(engine.lastAttack.skills.some((s) => s.name.includes('พุ่มดอกไม้สูง') && s.side === 'def'));
  assert.match(lastLogs(), /🌸 B หลบการโจมตีของ A ในพุ่มดอกไม้สูงได้ \(20%\)/);

  P = setup(2, { A: { x: 6, y: 3 }, B: { x: 6, y: 4 } });
  startActions(['A', 'B']);
  P.B.exposedRound = engine.roundNumber;
  Math.random = () => 0.5; // 50 ≥ 20 → ไม่พ้น
  engine.attackTarget('A', 'B');
  engine.clearPhaseTimer();
  assert.equal(P.B.hp, engine.maxHpOf(P.B) - 1);
});

test('ทุ่งดอกไม้: ผู้ตียืนในพุ่มดอกไม้ หลบการตีสวนได้ · แม่นยำเจาะการหลบจากช่อง', () => {
  let P = setup(2, { A: { x: 6, y: 4 }, B: { x: 6, y: 3 } });
  P.B.counterBack = true; // ตีสวนปิดเป็นค่าเริ่มต้น — เปิดให้เทสต์
  startActions(['A', 'B']);
  Math.random = () => 0;
  engine.attackTarget('A', 'B');
  engine.clearPhaseTimer();
  assert.equal(P.B.hp, engine.maxHpOf(P.B) - 1, 'B ยืนบนพื้น โดนเต็มๆ');
  assert.equal(P.A.hp, engine.maxHpOf(P.A), 'A หลบการตีสวนในพุ่มดอกไม้');
  assert.equal(engine.lastAttack.counter.dodge, true);

  P = setup(2, { A: { x: 6, y: 3 }, B: { x: 6, y: 4 } });
  startActions(['A', 'B']);
  P.B.exposedRound = engine.roundNumber;
  P.A.statuses.accurate = 1;
  Math.random = () => 0;
  engine.attackTarget('A', 'B');
  engine.clearPhaseTimer();
  assert.equal(P.B.hp, engine.maxHpOf(P.B) - 1, 'แม่นยำ = หลบไม่ได้');
});

test('ป่าทึบ: สกิลที่ตีด้วยพลังโจมตี (skillStrike) ก็หลบได้ 20% · แม่นยำเจาะได้', () => {
  // (1,5) ป่าทึบ ภูมิภาค III
  const P = setup(3, { A: { x: 0, y: 5 }, B: { x: 1, y: 5 } });
  Math.random = () => 0;
  const res = engine.skillStrike(P.A, P.B, 'คลื่นดาบ');
  assert.equal(res.dodge, true);
  assert.equal(P.B.hp, engine.maxHpOf(P.B));
  assert.match(lastLogs(), /🌲 B หลบคลื่นดาบในป่าทึบได้ \(20%\)/);
  P.A.statuses.accurate = 1;
  assert.equal(engine.skillStrike(P.A, P.B, 'คลื่นดาบ').dodge, false);
  assert.equal(P.B.hp, engine.maxHpOf(P.B) - 1);
});

test('แท่นพลัง: ยืนบนแท่นพลัง พลังโจมตี +1 (ตีปกติ + ป้ายในฉากตี) · ลงจากแท่นแล้วหาย', () => {
  // (6,6) แท่นพลัง (กลางแท่นบูชา) · (7,6) พื้น ภูมิภาค VII
  const P = setup(7, { A: { x: 6, y: 6 }, B: { x: 7, y: 6 } });
  assert.equal(attack.computeAttackBase(engine, P.A, P.B).terrainAtk, 1);
  assert.equal(attack.computeAttackBase(engine, P.B, P.A).terrainAtk, 0);
  startActions(['A', 'B']);
  engine.attackTarget('A', 'B');
  engine.clearPhaseTimer();
  assert.equal(P.B.hp, engine.maxHpOf(P.B) - 2);
  assert.ok(engine.lastAttack.skills.some((s) => s.name === 'แท่นพลัง +1' && s.side === 'atk'));
});

test('หนามพิษ: จบตาบนช่อง ติดพิษร้าย (มีผล 1 เทิร์นถัดไป) · ต้านสถานะผิดปกติกันได้', () => {
  // (5,3) หนามพิษ ภูมิภาค III
  let P = setup(3, { A: { x: 5, y: 3 }, B: { x: 0, y: 4 } });
  startActions(['A', 'B']);
  engine.waitAction('A');
  engine.clearPhaseTimer();
  assert.equal(P.A.statuses.poison, 2, 'จบเทิร์นนี้ลดเหลือ 1 → ต้นเทิร์นหน้าโดนพิษ');
  assert.match(lastLogs(), /หนามพิษ — ติดพิษร้าย 1 เทิร์น/);

  P = setup(3, { A: { x: 5, y: 3 }, B: { x: 0, y: 4 } });
  startActions(['A', 'B']);
  P.A.statuses.resist = 3;
  engine.waitAction('A');
  engine.clearPhaseTimer();
  assert.equal(P.A.statuses.poison, undefined);
  assert.match(lastLogs(), /ต้านสถานะผิดปกติไว้ได้/);
});

test('น้ำวน: จบตาบนช่อง โดนดัน 1 ช่องตามกระแส · ช่องข้างหน้ามีคน = ไม่ขยับ', () => {
  // (3,6) น้ำวนไหลขวา (เข้าหาซากเรือ) → (4,6) ภูมิภาค IV
  let P = setup(4, { A: { x: 3, y: 6 }, B: { x: 0, y: 4 } });
  startActions(['A', 'B']);
  engine.waitAction('A');
  engine.clearPhaseTimer();
  assert.deepEqual(P.A.pos, { x: 4, y: 6 });
  assert.equal(engine.actorId, 'B');

  P = setup(4, { A: { x: 3, y: 6 }, B: { x: 4, y: 6 } });
  startActions(['A', 'B']);
  engine.waitAction('A');
  engine.clearPhaseTimer();
  assert.deepEqual(P.A.pos, { x: 3, y: 6 });
});

test('ลาวา: จบตาบนช่อง เสีย 1 (เกราะก่อน) · เลือดหมด = ตกรอบหายจากกระดาน', () => {
  // (2,4) ลาวา ภูมิภาค VII
  let P = setup(7, { A: { x: 2, y: 4 }, B: { x: 13, y: 7 }, C: { x: 0, y: 5 } });
  startActions(['A', 'B', 'C']);
  P.A.armor = 1;
  const hp = P.A.hp;
  engine.waitAction('A');
  engine.clearPhaseTimer();
  assert.equal(P.A.armor, 0);
  assert.equal(P.A.hp, hp);
  assert.match(lastLogs(), /🌋 A จบตาบนลาวา — เสียหาย -1/);

  P = setup(7, { A: { x: 2, y: 4 }, B: { x: 13, y: 7 }, C: { x: 0, y: 5 } });
  startActions(['A', 'B', 'C']);
  P.A.hp = 1;
  engine.waitAction('A');
  engine.clearPhaseTimer();
  assert.equal(P.A.alive, false);
  assert.equal(P.A.pos, null);
});

test('ทะเลทราย: จบตาบนโอเอซิส ฟื้นพลังชีวิต +1', () => {
  // (6,6) โอเอซิส ภูมิภาค V
  const P = setup(5, { A: { x: 6, y: 6 }, B: { x: 0, y: 4 } });
  startActions(['A', 'B']);
  P.A.hp = 3;
  engine.waitAction('A');
  engine.clearPhaseTimer();
  assert.equal(P.A.hp, 4);
  assert.match(lastLogs(), /ยืนบนโอเอซิส — ฟื้นพลังชีวิต \+1/);
});

test('น้ำแข็ง (engine): เดินเข้าน้ำแข็งแล้วไถลจนสุดแนว · path มีทุกช่องที่ไถลผ่าน · ไถลแล้วเดินต่อไม่ได้', () => {
  // ภูมิภาค VI: (5,3) พื้น → (4,3) น้ำแข็ง → ไถลซ้ายตามแนว (0..4, 3) ไปหยุดที่ขอบ (0,3)
  const P = setup(6, { A: { x: 5, y: 3 }, B: { x: 13, y: 6 } });
  startActions(['A', 'B']);
  // (4,3) หยุดตรงๆ ไม่ได้ (เข้าตามแนวแล้วไถลไปถึงขอบ) — ไปลงได้แค่ทางอ้อมที่เข้าจากด้านข้าง
  const reach = Board.reachable(engine.boardMap(), { id: 'A', ...P.A.pos }, engine.movOf(P.A), [{ id: 'A', ...P.A.pos, alive: true }]);
  assert.ok(reach.get('4,3').d > 1);
  assert.equal(reach.get('0,3').d, 1);
  assert.equal(engine.moveTo('A', 0, 3), true);
  assert.deepEqual(P.A.pos, { x: 0, y: 3 });
  assert.deepEqual(engine.action.path, [{ x: 5, y: 3 }, { x: 4, y: 3 }, { x: 3, y: 3 }, { x: 2, y: 3 }, { x: 1, y: 3 }, { x: 0, y: 3 }]);
  // ไถลแล้วจบการเดิน (ต้องรอ moveTo ของ server/phases/action.js ล็อกการเดินหลังไถล)
  assert.equal(engine.action.locked, true);
  assert.equal(engine.moveTo('A', 0, 4, { step: true }), false);
  assert.deepEqual(P.A.pos, { x: 0, y: 3 });
});

test('ถอยบนน้ำแข็ง (engine): โดนสวนแล้วถอยลงน้ำแข็ง — ฉากตีถอย 1 ช่อง แล้วไถลต่อจนสุดแนวหลังฉากตี (Ice.forcedSlides)', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  // ภูมิภาค VI: A (5,3) ตี B (6,3) → ถอยซ้ายไป (4,3) น้ำแข็ง → ไถลตามแนวไปหยุดที่ขอบ (0,3)
  const P = setup(6, { A: { x: 5, y: 3 }, B: { x: 6, y: 3 } });
  P.B.counterBack = true;
  startActions(['A', 'B']);
  engine.attackTarget('A', 'B');
  assert.deepEqual(P.A.pos, { x: 4, y: 3 }, 'ระหว่างฉากตี = ถอย 1 ช่อง');
  assert.deepEqual(engine.lastAttack.push.to, { x: 4, y: 3 });
  assert.equal(engine.lastAttack.push.via, null);
  assert.equal(engine.lastAttack.push.collide, false);
  for (let i = 0; i < 100; i++) t.mock.timers.tick(100);
  engine.clearPhaseTimer();
  assert.deepEqual(P.A.pos, { x: 0, y: 3 }, 'จบฉากตี = ไถลต่อจนสุดแนว');
  assert.ok(action.tileEndEffect); // ส่งออกให้ไฟล์อื่น/เทสต์เรียกได้
});
