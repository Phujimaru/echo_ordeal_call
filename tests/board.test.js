// กระดานเดินได้ (server/board.js) — ฟังก์ชันล้วน ไม่ต่อกับ engine (ดู GRID_PLAN.md)
const test = require('node:test');
const assert = require('node:assert/strict');
const Board = require('../server/board.js');

const map = Board.mapOf(1);
const u = (id, x, y, extra = {}) => ({ id, x, y, alive: true, ...extra });
const keys = (tiles) => tiles.map((t) => Board.key(t.x, t.y)).sort();
// rng ที่ให้ค่าซ้ำตามลำดับ (ทดสอบการสุ่มแบบกำหนดผล)
const seq = (...vals) => { let i = 0; return () => vals[i++ % vals.length]; };

test('แผนที่ภูมิภาค I: 16×12 · จุดเกิด 7 · จุดฟื้นฟู 4 · จุดเกิด/ร้านค้า/ฟื้นฟูไม่ทับสิ่งกีดขวางหรือกัน', () => {
  assert.equal(map.cols, 16);
  assert.equal(map.rows, 12);
  assert.equal(map.spawns.length, 7);
  assert.equal(map.heal.size, 4);
  const special = [...map.spawns, ...map.shopSpots, ...[...map.heal].map((k) => { const [x, y] = k.split(',').map(Number); return { x, y }; })];
  for (const t of special) assert.equal(Board.isObstacle(map, t.x, t.y), false, `ช่อง ${t.x},${t.y} เป็นสิ่งกีดขวาง`);
  assert.equal(new Set(special.map((t) => Board.key(t.x, t.y))).size, special.length, 'จุดพิเศษทับกันเอง');
  assert.ok(map.shopSpots.length >= 4 && map.shopSpots.length <= 6);
});

test('mapOf: ภูมิภาค I–VII มีแผนที่ของตัวเอง · ภูมิภาคที่ไม่มีแผนที่ใช้ของภูมิภาค I', () => {
  for (let a = 1; a <= 7; a++) assert.equal(Board.mapOf(a).area, a);
  assert.equal(Board.mapOf(99), Board.MAPS[1]);
});

test('เดิน: BFS 4 ทิศ ไม่เกินค่าเดิน · ระยะนับแบบแมนฮัตตัน', () => {
  const me = u('A', 7, 9);
  const reach = Board.reachable(map, me, 2, [me]);
  for (const n of reach.values()) assert.ok(Board.dist(me, n) <= 2 && n.d <= 2);
  assert.ok(reach.has('7,7'));   // ตรงขึ้น 2
  assert.ok(reach.has('6,8'));   // ทแยงต้องเดิน 2 ก้าว
  assert.ok(!reach.has('6,7'));  // ต้อง 3 ก้าว
  assert.ok(reach.has('7,9'));   // ช่องเริ่มหยุดได้ (ไม่เดิน)
});

test('เดิน: สิ่งกีดขวางเดินผ่านไม่ได้ ต้องอ้อม', () => {
  // ต้นไม้ที่ (3,6): จาก (2,6) ไป (4,6) ต้องอ้อม 4 ก้าว ไม่ใช่ 2
  const me = u('A', 2, 6);
  assert.ok(!Board.reachable(map, me, 2, [me]).has('4,6'));
  assert.ok(Board.reachable(map, me, 4, [me]).has('4,6'));
  assert.ok(!Board.reachable(map, me, 9, [me]).has('3,6'));
});

test('เดิน: ศัตรูขวางทาง · เพื่อนร่วมทีมเดินผ่านได้แต่หยุดทับไม่ได้', () => {
  const me = u('A', 7, 9, { teamId: 'A' });
  const blocker = u('B', 7, 8, { teamId: 'B' });
  const isAlly = (a, b) => a.teamId === b.teamId;
  // ทางเดียวขึ้นไป (7,7) ใน 2 ก้าวคือผ่าน (7,8)
  const vsEnemy = Board.reachable(map, me, 2, [me, blocker], { isAlly });
  assert.ok(!vsEnemy.has('7,8'));
  assert.ok(!vsEnemy.has('7,7'));
  const mate = u('C', 7, 8, { teamId: 'A' });
  const vsAlly = Board.reachable(map, me, 2, [me, mate], { isAlly });
  assert.ok(!vsAlly.has('7,8'), 'หยุดทับเพื่อนไม่ได้');
  assert.ok(vsAlly.has('7,7'), 'เดินผ่านเพื่อนได้');
});

test('เดิน: ช่องใน blocked (แผงร้านค้า) เดินผ่าน/ยืนไม่ได้', () => {
  const me = u('A', 7, 4);
  const blocked = new Set(['7,3']);
  const reach = Board.reachable(map, me, 3, [me], { blocked });
  assert.ok(!reach.has('7,3'));
});

test('pathTo: คืนเส้นทางต่อเนื่องทีละช่องจากต้นถึงปลาย · ไปไม่ถึง = null', () => {
  const me = u('A', 7, 9);
  const reach = Board.reachable(map, me, 3, [me]);
  const path = Board.pathTo(reach, 7, 6);
  assert.deepEqual(path[0], { x: 7, y: 9 });
  assert.deepEqual(path[path.length - 1], { x: 7, y: 6 });
  for (let i = 1; i < path.length; i++) assert.equal(Board.dist(path[i - 1], path[i]), 1);
  assert.equal(Board.pathTo(reach, 0, 5), null);
});

test('ระยะตี: ประชิด [1,1] = 4 ทิศ · ธนู [2,2] ตีประชิดไม่ได้', () => {
  assert.deepEqual(keys(Board.tilesInRange(map, 7, 5, [1, 1])), ['6,5', '7,4', '7,6', '8,5']);
  const bow = Board.tilesInRange(map, 7, 5, [2, 2]);
  assert.equal(bow.length, 8);
  assert.ok(bow.every((t) => Board.dist({ x: 7, y: 5 }, t) === 2));
});

test('ตีหมู่ "รอบตัว N" = ข้าวหลามตัด: รอบตัว 2 = 12 ช่อง · รอบตัว 5 = 60 ช่อง (กลางกระดานใหญ่พอ) · ตัดขอบกระดาน', () => {
  assert.equal(Board.aoeTiles(map, 7, 5, 2).length, 12);
  const big = { ...map, cols: 40, rows: 40 };
  assert.equal(Board.aoeTiles(big, 20, 20, 5).length, 60);
  assert.ok(Board.aoeTiles(map, 0, 0, 2).every((t) => Board.inBounds(map, t.x, t.y)));
});

test('สกิลแนว 4×3: เริ่มจากช่องติดตัว ยาว 4 กว้าง 3 = 12 ช่อง ตามทิศที่เลือก', () => {
  const up = Board.lineTiles(map, 7, 9, 'up', 4, 3);
  assert.equal(up.length, 12);
  assert.ok(up.every((t) => t.y >= 5 && t.y <= 8 && t.x >= 6 && t.x <= 8));
  const right = Board.lineTiles(map, 3, 5, 'right', 4, 3);
  assert.ok(right.every((t) => t.x >= 4 && t.x <= 7 && t.y >= 4 && t.y <= 6));
  assert.equal(right.length, 12);
  // ชิดขอบ: ส่วนที่ล้นกระดานถูกตัด
  assert.equal(Board.lineTiles(map, 0, 5, 'left', 4, 3).length, 0);
  assert.equal(Board.lineTiles(map, 7, 9, 'diagonal', 4, 3).length, 0);
});

test('unitsOnTiles / attackTargets: นับเฉพาะคนที่ยังอยู่ ไม่รวมตัวเองและพวกเดียวกัน', () => {
  const me = u('A', 7, 9, { teamId: 'A' });
  const foe = u('B', 7, 8, { teamId: 'B' });
  const mate = u('C', 8, 9, { teamId: 'A' });
  const dead = u('D', 6, 9, { alive: false });
  const isAlly = (a, b) => a.teamId === b.teamId;
  const all = [me, foe, mate, dead];
  assert.deepEqual(Board.attackTargets(me, 7, 9, [1, 1], all, { isAlly }).map((x) => x.id), ['B']);
  const hit = Board.unitsOnTiles(all, Board.lineTiles(map, 7, 10, 'up', 4, 3)).map((x) => x.id).sort();
  assert.deepEqual(hit, ['A', 'B', 'C']); // คนตายไม่นับ (คัดเพื่อนออกเป็นหน้าที่ของผู้เรียก)
});

test('ตีสวน: สวนได้เมื่อผู้ตีอยู่ในระยะของผู้โดนตี', () => {
  assert.equal(Board.canCounter([1, 1], { x: 7, y: 6 }, { x: 7, y: 5 }), true);
  assert.equal(Board.canCounter([1, 1], { x: 7, y: 7 }, { x: 7, y: 5 }), false); // ธนูยิงจากระยะ 2 → ดาบสวนไม่ถึง
  assert.equal(Board.canCounter([2, 2], { x: 7, y: 6 }, { x: 7, y: 5 }), false); // ธนูสวนคนประชิดไม่ได้
});

test('ถอยหลังโดนสวน: ถอยออกจากผู้สวน 1 ช่อง ตามแกนที่ห่างกว่า', () => {
  const pos = Board.pushback(map, { x: 7, y: 7 }, { x: 7, y: 6 }, []);
  assert.deepEqual(pos, { x: 7, y: 8, moved: true, collide: false });
  const side = Board.pushback(map, { x: 9, y: 5 }, { x: 8, y: 5 }, []);
  assert.deepEqual([side.x, side.y], [10, 5]);
});

test('ถอยหลังโดนสวน: แนวทแยง (ห่างเท่ากัน) ลองแกนตั้งก่อน แล้วแกนนอน', () => {
  const diag = Board.pushback(map, { x: 9, y: 7 }, { x: 8, y: 6 }, []);
  assert.deepEqual([diag.x, diag.y], [9, 8]);
  const vertBlocked = Board.pushback(map, { x: 9, y: 7 }, { x: 8, y: 6 }, [u('X', 9, 8)]);
  assert.deepEqual([vertBlocked.x, vertBlocked.y, vertBlocked.collide], [10, 7, false]);
});

test('ถอยหลังโดนสวน: ชนสิ่งกีดขวาง/ขอบ/ตัวละคร = ไม่ขยับ และ collide (ชน −1)', () => {
  // หลังเป็นเสาคริสตัล (4,8)
  const pillar = Board.pushback(map, { x: 4, y: 7 }, { x: 4, y: 6 }, []);
  assert.deepEqual(pillar, { x: 4, y: 7, moved: false, collide: true });
  // หลังเป็นขอบกระดาน
  const edge = Board.pushback(map, { x: 6, y: 11 }, { x: 6, y: 10 }, []);
  assert.equal(edge.collide, true);
  // หลังมีคนยืน
  const body = Board.pushback(map, { x: 7, y: 7 }, { x: 7, y: 6 }, [u('X', 7, 8)]);
  assert.equal(body.collide, true);
  // ช่องหลังเป็นตัวเอง (selfId) ไม่นับว่าชน
  const self = Board.pushback(map, { x: 7, y: 7 }, { x: 7, y: 6 }, [u('A', 7, 8)], { selfId: 'A' });
  assert.equal(self.collide, false);
});

test('ระยะอันตราย: threat = ช่องที่เดินแล้วตีถึง โดยไม่รวมช่องที่เดินถึงได้', () => {
  const me = u('A', 7, 9);
  const { move, threat } = Board.threatZone(map, me, 2, [1, 1], [me]);
  assert.ok(move.has('7,7'));
  assert.ok(threat.has('7,6'));  // เดิน 2 แล้วตีขึ้นไปอีก 1
  assert.ok(!threat.has('7,7'));
  for (const k of threat) assert.ok(!move.has(k));
});

test('จุดเกิด: ทุกคนได้จุดเกิดไม่ซ้ำกัน', () => {
  const players = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => ({ id }));
  const spawns = Board.assignSpawns(map, players, { rng: seq(0.3, 0.7, 0.1, 0.9, 0.5) });
  const placed = Object.values(spawns);
  assert.equal(placed.length, 7);
  assert.equal(new Set(placed.map((p) => Board.key(p.x, p.y))).size, 7);
  const spawnKeys = new Set(map.spawns.map((s) => Board.key(s.x, s.y)));
  for (const p of placed) assert.ok(spawnKeys.has(Board.key(p.x, p.y)));
});

test('จุดเกิด: โหมดทีม เพื่อนร่วมทีมได้จุดที่ต่อกันบนวงจุดเกิด', () => {
  const players = [
    { id: 'a1', teamId: 'A' }, { id: 'b1', teamId: 'B' }, { id: 'a2', teamId: 'A' },
    { id: 'b2', teamId: 'B' }, { id: 'a3', teamId: 'A' }, { id: 'b3', teamId: 'B' },
  ];
  const cx = (map.cols - 1) / 2, cy = (map.rows - 1) / 2;
  const ring = [...map.spawns].sort((p, q) => Math.atan2(p.y - cy, p.x - cx) - Math.atan2(q.y - cy, q.x - cx)).map((s) => Board.key(s.x, s.y));
  for (const r of [0.05, 0.4, 0.95]) {
    const spawns = Board.assignSpawns(map, players, { teamMode: true, rng: () => r });
    const idx = (id) => ring.indexOf(Board.key(spawns[id].x, spawns[id].y));
    for (const team of ['A', 'B']) {
      const pos = players.filter((p) => p.teamId === team).map((p) => idx(p.id)).sort((x, y) => x - y);
      // ต่อกันบนวง (อาจวนข้ามจุดเริ่ม): ระยะห่างรวมระหว่างสมาชิกบนวงต้องเป็น 2 ช่องของวง
      const gaps = pos.map((v, i) => ((pos[(i + 1) % pos.length] - v) + ring.length) % ring.length);
      assert.ok(gaps.filter((g) => g !== 1).length <= 1, `ทีม ${team} ไม่ต่อกัน: ${pos}`);
    }
  }
});

test('ร้านค้า: สุ่มจุดใหม่ไม่ซ้ำจุดเดิม และข้ามจุดที่มีคนยืน', () => {
  const prev = map.shopSpots[0];
  const standing = map.shopSpots.slice(1, -1).map((s, i) => u(`p${i}`, s.x, s.y));
  const last = map.shopSpots[map.shopSpots.length - 1];
  assert.deepEqual(Board.pickShopSpot(map, standing, prev, () => 0.5), { x: last.x, y: last.y });
  // ไม่มีจุดว่างเลย = คงจุดเดิม
  const everyone = map.shopSpots.slice(1).map((s, i) => u(`q${i}`, s.x, s.y));
  assert.deepEqual(Board.pickShopSpot(map, everyone, prev, () => 0.5), prev);
});

test('ร้านค้า: ซื้อได้เมื่อยืนติดร้าน (ระยะ 1) เท่านั้น', () => {
  const shop = { x: 7, y: 2 };
  assert.equal(Board.nearShop({ x: 7, y: 3 }, shop), true);
  assert.equal(Board.nearShop({ x: 8, y: 3 }, shop), false);
  assert.equal(Board.nearShop({ x: 7, y: 4 }, shop), false);
  assert.equal(Board.nearShop({ x: 7, y: 3 }, null), false);
});
