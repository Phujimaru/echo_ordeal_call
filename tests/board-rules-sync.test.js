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

test('boardRules.js (ESM) คำนวณได้เท่ากับ server/board.js', async () => {
  const Server = require('../server/board.js');
  const Client = await import('../client/src/board/boardRules.js');
  const pub = (m) => ({ ...m, heal: [...m.heal] }); // รูปที่ server ส่งเป็น state.board
  for (const area of Object.keys(Server.MAPS)) {
    const sm = Server.MAPS[area];
    const cm = Client.normalizeMap(pub(sm));
    const units = [{ id: 'a', x: sm.spawns[0].x, y: sm.spawns[0].y, alive: true }, { id: 'b', x: sm.spawns[1].x, y: sm.spawns[1].y, alive: true }];
    const r1 = Server.reachable(sm, units[0], 5, units);
    const r2 = Client.reachable(cm, units[0], 5, units);
    assert.deepEqual([...r2.keys()].sort(), [...r1.keys()].sort(), `ภูมิภาค ${area}`);
  }
});
