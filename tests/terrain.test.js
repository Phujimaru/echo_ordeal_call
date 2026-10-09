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

// ช่องที่ "เข้าไปได้" จากจุดหนึ่ง (ไม่สนคน): ช่องที่หยุดได้ + ช่องน้ำแข็งที่ไถลผ่าน (อยู่ใน prev)
function coverage(map, from, blocked = null) {
  const reach = Board.reachable(map, u('walker', from.x, from.y), 999, [], { blocked });
  const entered = new Set();
  for (const n of reach.values()) for (let c = n; c; c = c.prev) entered.add(K(c.x, c.y));
  return { stops: new Set(reach.keys()), entered };
}
test('แผนที่ I–VII: ทุกช่องที่ไม่ใช่สิ่งกีดขวางเดินถึงได้จากทุกจุดเกิด (แม้ร้านค้าตั้งอยู่จุดไหนก็ตาม)', () => {
  for (const m of Object.values(Board.MAPS)) {
    const check = (from, blocked) => {
      const { stops, entered } = coverage(m, from, blocked);
      for (let x = 0; x < m.cols; x++) {
        for (let y = 0; y < m.rows; y++) {
          const k = K(x, y);
          if (m.terrain[k] || (blocked && blocked.has(k))) continue;
          assert.ok(entered.has(k), `ภูมิภาค ${m.area}: ${k} เดินไม่ถึงจาก ${K(from.x, from.y)}`);
          if (Board.specialAt(m, x, y) !== 'ice') assert.ok(stops.has(k), `ภูมิภาค ${m.area}: ${k} หยุดไม่ได้`);
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

test('ช่องเดินช้า/น้ำแข็งคลุมพื้นที่จริงจัง: ดอกไม้ ป่าทึบ น้ำตื้น ≥ 20 ช่อง · ทะเลสาบน้ำแข็ง ≥ 40 ช่อง', () => {
  const count = (area, kind) => Object.values(Board.MAPS[area].special).filter((k) => k === kind).length;
  assert.ok(count(2, 'flowers') >= 20);
  assert.ok(count(3, 'forest') >= 20);
  assert.ok(count(4, 'shallow') >= 20);
  assert.ok(count(6, 'ice') >= 40);
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

test('น้ำแข็ง: เดินเข้าแล้วไถลต่อ 1 ช่องในทิศเดิมไม่เสียก้าว · ช่องน้ำแข็งเป็นทางผ่าน · เส้นทางมีทั้งสองช่อง', () => {
  const m = mapWith({ '5,5': 'ice' });
  const me = u('A', 4, 5);
  const reach = Board.reachable(m, me, 1, [me]);
  assert.ok(!reach.has('5,5'), 'หยุดบนน้ำแข็งไม่ได้เมื่อไถลได้');
  assert.equal(reach.get('6,5').d, 1);
  assert.deepEqual(path(reach, 6, 5), ['4,5', '5,5', '6,5']);
  // เข้าจากด้านบน → ไถลลง
  const top = u('A', 5, 4);
  assert.deepEqual(path(Board.reachable(m, top, 1, [top]), 5, 6), ['5,4', '5,5', '5,6']);
  // ไถลไปลงช่อง cost 2 ไม่เสียค่าเดินของช่องนั้น
  const m2 = mapWith({ '5,5': 'ice', '6,5': 'flowers' });
  assert.equal(Board.reachable(m2, me, 1, [me]).get('6,5').d, 1);
  // ไถลไปลงน้ำแข็งอีกช่อง = หยุด (ไม่ไถลซ้ำ)
  const m3 = mapWith({ '5,5': 'ice', '6,5': 'ice' });
  const r3 = Board.reachable(m3, me, 1, [me]);
  assert.ok(r3.has('6,5') && !r3.has('7,5'));
  // ยืนบนน้ำแข็งแล้วเดินออก ไม่ไถล
  const onIce = u('A', 5, 5);
  assert.equal(Board.reachable(m, onIce, 1, [onIce]).get('5,4').d, 1);
});

test('น้ำแข็ง: ไถลไม่ได้ (สิ่งกีดขวาง/ขอบ/คน/ร้านค้า) = หยุดบนน้ำแข็ง', () => {
  const me = u('A', 4, 5);
  const wall = mapWith({ '5,5': 'ice' }, { '6,5': 'rock' });
  assert.equal(Board.reachable(wall, me, 1, [me]).get('5,5').d, 1);
  const edge = mapWith({ '13,5': 'ice' });
  const e = u('A', 12, 5);
  assert.ok(Board.reachable(edge, e, 1, [e]).has('13,5'));
  const m = mapWith({ '5,5': 'ice' });
  const foe = u('B', 6, 5);
  assert.ok(Board.reachable(m, me, 1, [me, foe]).has('5,5'), 'ศัตรูขวาง');
  const ally = u('C', 6, 5);
  assert.ok(Board.reachable(m, me, 1, [me, ally], { isAlly: () => true }).has('5,5'), 'เพื่อนยืนขวางก็หยุดบนน้ำแข็ง');
  assert.ok(Board.reachable(m, me, 1, [me], { blocked: new Set(['6,5']) }).has('5,5'), 'แผงร้านค้า');
  // เพื่อนยืนบนน้ำแข็ง: เดินผ่านแล้วไถลต่อได้
  const onIce = u('C', 5, 5);
  const r = Board.reachable(m, me, 1, [me, onIce], { isAlly: () => true });
  assert.ok(r.has('6,5') && !r.has('5,5'));
});

test('ถอยบนน้ำแข็ง: ไถลรวม 2 ช่อง (via = ช่องน้ำแข็ง) · ช่องถัดไปไม่ว่าง = หยุดบนน้ำแข็ง', () => {
  const m = mapWith({ '6,5': 'ice' });
  assert.deepEqual(Board.pushback(m, { x: 5, y: 5 }, { x: 4, y: 5 }, []), { x: 7, y: 5, moved: true, collide: false, via: { x: 6, y: 5 } });
  const wall = mapWith({ '6,5': 'ice' }, { '7,5': 'rock' });
  assert.deepEqual(Board.pushback(wall, { x: 5, y: 5 }, { x: 4, y: 5 }, []), { x: 6, y: 5, moved: true, collide: false });
  const body = Board.pushback(m, { x: 5, y: 5 }, { x: 4, y: 5 }, [u('X', 7, 5)]);
  assert.deepEqual([body.x, body.y, body.via], [6, 5, undefined]);
});

test('ระยะอันตรายใช้กติกาช่องพิเศษ (แผนที่น้ำแข็งจริง)', () => {
  const m = Board.MAPS[6];
  const me = u('A', 2, 4); // ริมทะเลสาบ: (3,4) น้ำแข็ง → ไถลไปลง (4,4) (น้ำแข็งอีกช่อง = หยุด)
  const { move } = Board.threatZone(m, me, 1, [1, 1], [me]);
  assert.ok(move.has('4,4') && !move.has('3,4'));
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

test('น้ำแข็ง (engine): เดินเข้าน้ำแข็งแล้วไถล · path มีช่องน้ำแข็ง', () => {
  // (2,4) พื้น → (3,4) น้ำแข็ง → ไถลไป (4,4) (น้ำแข็งอีกช่อง = หยุด ไม่ไถลซ้ำ) ภูมิภาค VI
  const P = setup(6, { A: { x: 2, y: 4 }, B: { x: 13, y: 6 } });
  startActions(['A', 'B']);
  // (3,4) หยุดตรงๆ ไม่ได้ (เดินเข้าแล้วไถลไป (4,4)) — ไปลงได้แค่ทางอ้อมที่ไถลมาจากช่องอื่น
  const reach = Board.reachable(engine.boardMap(), { id: 'A', ...P.A.pos }, engine.movOf(P.A), [{ id: 'A', ...P.A.pos, alive: true }]);
  assert.ok(reach.get('3,4').d > 1);
  assert.equal(reach.get('4,4').d, 1);
  assert.equal(engine.moveTo('A', 4, 4), true);
  assert.deepEqual(P.A.pos, { x: 4, y: 4 });
  assert.deepEqual(engine.action.path, [{ x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 }]);
});

test('ถอยบนน้ำแข็ง (engine): โดนสวนแล้วถอยลงน้ำแข็ง ไถลรวม 2 ช่อง', () => {
  // A (4,2) ตี B (3,2) → ถอยขวาไป (5,2) น้ำแข็ง → ไถลไป (6,2)
  const P = setup(6, { A: { x: 4, y: 2 }, B: { x: 3, y: 2 } });
  P.B.counterBack = true;
  startActions(['A', 'B']);
  engine.attackTarget('A', 'B');
  engine.clearPhaseTimer();
  assert.deepEqual(P.A.pos, { x: 6, y: 2 });
  assert.deepEqual(engine.lastAttack.push.via, { x: 5, y: 2 });
  assert.deepEqual(engine.lastAttack.push.to, { x: 6, y: 2 });
  assert.equal(engine.lastAttack.push.collide, false);
  assert.ok(action.tileEndEffect); // ส่งออกให้ไฟล์อื่น/เทสต์เรียกได้
});
