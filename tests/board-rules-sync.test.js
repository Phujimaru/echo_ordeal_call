// กติกากระดานฝั่ง client (client/src/board/boardRules.js) ต้องสร้างจาก server/board.js เสมอ
//  ไม่ตรง = รัน node scripts/gen-board-rules.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { generate, OUT } = require('../scripts/gen-board-rules.js');

test('client/src/board/boardRules.js ตรงกับ server/board.js', () => {
  const now = fs.readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n');
  assert.equal(now, generate(), 'รัน node scripts/gen-board-rules.js');
});

// รูปที่ server ส่งเป็น state.board (server/view.js boardPublic) ผ่าน JSON เหมือนส่งทาง socket
const pub = (m) => JSON.parse(JSON.stringify({
  area: m.area, cols: m.cols, rows: m.rows, terrain: m.terrain, heal: [...m.heal],
  special: m.special, flow: m.flow, healKind: m.healKind, spawns: m.spawns, shopSpots: m.shopSpots,
}));
// ผลเดินแบบเทียบกันได้: ช่องที่หยุดได้ → ก้าวที่ใช้ + เส้นทาง
const flat = (Rules, reach) => Object.fromEntries([...reach.keys()].sort().map((k) => {
  const n = reach.get(k);
  return [k, { d: n.d, path: Rules.pathTo(reach, n.x, n.y).map((t) => `${t.x},${t.y}`).join(' ') }];
}));

test('boardRules.js (ESM) คำนวณได้เท่ากับ server/board.js', async () => {
  const Server = require('../server/board.js');
  const Client = await import('../client/src/board/boardRules.js');
  for (const area of Object.keys(Server.MAPS)) {
    const sm = Server.MAPS[area];
    const cm = Client.normalizeMap(pub(sm));
    for (let i = 0; i < sm.spawns.length; i++) {
      const units = [{ id: 'a', x: sm.spawns[i].x, y: sm.spawns[i].y, alive: true }, { id: 'b', x: sm.spawns[(i + 1) % 7].x, y: sm.spawns[(i + 1) % 7].y, alive: true }];
      const r1 = Server.reachable(sm, units[0], 6, units);
      const r2 = Client.reachable(cm, units[0], 6, units);
      assert.deepEqual(flat(Client, r2), flat(Server, r1), `ภูมิภาค ${area} จุดเกิด ${i}`);
    }
    for (const k of Object.keys(sm.special)) {
      const [x, y] = k.split(',').map(Number);
      assert.deepEqual(Client.tileInfo(cm, x, y), Server.tileInfo(sm, x, y));
      assert.deepEqual(Client.endTurnTile(cm, x, y, []), Server.endTurnTile(sm, x, y, []));
    }
  }
});

test('boardRules.js: ช่องพิเศษ (น้ำแข็ง/ทรายดูด/ค่าเดิน 2) ให้ผลเดินเท่ากับ server', async () => {
  const Server = require('../server/board.js');
  const Client = await import('../client/src/board/boardRules.js');
  const mk = (special, terrain = {}) => ({
    area: 0, cols: 16, rows: 12, terrain, special, flow: {}, heal: new Set(), healKind: 'heal', spawns: [], shopSpots: [],
  });
  const me = { id: 'a', x: 4, y: 5, alive: true };
  const cases = [
    { name: 'น้ำแข็งไถล', map: mk({ '5,5': 'ice', '4,4': 'ice', '6,6': 'ice' }), mov: 3, units: [me] },
    { name: 'น้ำแข็งไถลไม่ได้', map: mk({ '5,5': 'ice' }, { '6,5': 'rock' }), mov: 2, units: [me, { id: 'b', x: 4, y: 3, alive: true }] },
    { name: 'ทรายดูด', map: mk({ '5,5': 'quicksand', '4,6': 'quicksand' }), mov: 4, units: [me] },
    { name: 'ค่าเดิน 2', map: mk({ '5,5': 'flowers', '5,4': 'forest', '5,6': 'shallow', '6,5': 'shallow' }), mov: 4, units: [me] },
    { name: 'ทะเลสาบน้ำแข็งจริง', map: Server.MAPS[6], mov: 5, units: [{ id: 'a', x: 3, y: 4, alive: true }] },
  ];
  for (const c of cases) {
    const r1 = Server.reachable(c.map, c.units[0], c.mov, c.units);
    const r2 = Client.reachable(Client.normalizeMap(pub(c.map)), c.units[0], c.mov, c.units);
    assert.deepEqual(flat(Client, r2), flat(Server, r1), c.name);
  }
  const ice = mk({ '6,5': 'ice' });
  assert.deepEqual(
    Client.pushback(Client.normalizeMap(pub(ice)), { x: 5, y: 5 }, { x: 4, y: 5 }, []),
    Server.pushback(ice, { x: 5, y: 5 }, { x: 4, y: 5 }, []),
  );
});
