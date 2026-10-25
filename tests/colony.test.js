// โหมด Colony (server/colony.js · GRID_PLAN §8.3): กระดานต่อวงรอบ · กำแพง/ประตู · ปิดผนึก · ระเบิด · อีเวนต์ · กระโดด · ลิฟต์
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const match = require('../server/match.js');
const Board = require('../server/board.js');
const Colony = require('../server/colony.js');
const draw = require('../server/phases/draw.js');
const action = require('../server/phases/action.js');
const endTurnPhase = require('../server/phases/endTurn.js');
const Journey = require('../characters/_journey.js');

const realRandom = Math.random;
// 'dummy' = ตัวละครสมมติไม่มีฮุค
function setup(n = 3) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  for (let i = 0; i < n; i++) {
    engine.players['p' + i] = {
      id: 'p' + i, name: 'P' + i, position: i + 1, characterId: 'dummy', alive: true, connected: true,
      cards: [], statuses: {}, statusAmt: {}, seen: {}, inventory: [], teamId: null,
    };
  }
  engine.setGameMode('ffa');
  match.world = 'colony';
  engine.startMatch();
  engine.clearPhaseTimer();
  return engine.players;
}
const P = () => engine.players;
// แนวตั้งว่างยาว n ช่องในคอลัมน์ที่ไม่ใช่กระจก/ประตู (ไม่มีสิ่งกีดขวาง/ช่องพิเศษ) — ผังเป็นแบบสุ่มกำหนดค่า
function clearColumn(y0, n) {
  const map = action.boardMap();
  for (let x = 0; x < 16; x++) {
    if (Board.COLONY.glass.includes(x)) continue;
    let ok = true;
    for (let y = y0; y < y0 + n; y++) if (map.terrain[`${x},${y}`] || map.special[`${x},${y}`]) ok = false;
    if (ok) return x;
  }
  throw new Error("no clear column");
}
const put = (p, x, y) => { p.pos = { x, y }; };
// ไปต้นเทิร์น turn (อีเวนต์ของเทิร์นนั้นลงผล) — ข้ามฉาก
function startTurn(turn) {
  engine.setRoundNumber(turn - 1);
  match.colony.eventsRound = 0;
  draw.dealRound();
  engine.clearPhaseTimer();
}
// ให้ p เป็นคนที่กำลังเดิน (เฟส ACTION)
function actAs(p) {
  match.gameState = 'ACTION';
  engine.setActor(p.id);
}

test.afterEach(() => { Math.random = realRandom; engine.clearPhaseTimer(); });
test.after(() => {
  engine.clearPhaseTimer();
  match.world = 'earth'; match.colony = null; Board.setWrap(0);
  for (const id of Object.keys(engine.players)) delete engine.players[id];
});

test('เริ่มแมตช์ในสนาม Colony: กระดาน 16×40 ต่อวงรอบ · ไม่มีการเดินทาง · จุดเกิดปล้องแรก', () => {
  setup(3);
  assert.equal(match.board.area, Board.COLONY_AREA);
  const map = action.boardMap();
  assert.equal(map.cols, 16); assert.equal(map.rows, 40); assert.equal(map.wrap, true);
  assert.equal(Board.wrapCols(), 16);
  assert.equal(Journey.active(engine), false, 'ไม่มีผลภูมิภาค/การเปลี่ยนภูมิภาค');
  for (const p of Object.values(P())) assert.ok(p.pos && p.pos.y <= 2, 'เกิดในแถว 0–2');
  assert.equal(match.colony.sealed, 0);
});

test('กระดานต่อวงรอบ: ระยะข้ามตะเข็บ · เดินข้ามตะเข็บ · กำแพงกั้นปล้องผ่านได้แค่ประตู', () => {
  setup(2);
  const map = action.boardMap();
  assert.equal(Board.dist({ x: 0, y: 5 }, { x: 15, y: 5 }), 1);
  assert.equal(Board.dist({ x: 2, y: 5 }, { x: 10, y: 5 }), 8, 'ฝั่งตรงข้าม = ครึ่งวง');
  const me = { id: 'a', x: 0, y: 5, alive: true };
  const reach = Board.reachable(map, me, 2, [me]);
  assert.ok(reach.has('15,5') && reach.has('14,5'), 'เดินไปทางซ้ายข้ามตะเข็บได้');
  // แถว 9 → 10: คอลัมน์ 2 ไม่ใช่ประตู (กำแพง) · คอลัมน์ 4 เป็นประตู
  assert.equal(Board.wallBlocks(map, 2, 9, 10), true);
  assert.equal(Board.wallBlocks(map, 4, 9, 10), false);
  const wallUnit = { id: 'w', x: 2, y: 9, alive: true };
  assert.ok(!Board.reachable(map, wallUnit, 1, [wallUnit]).has('2,10'), 'ทะลุกำแพงไม่ได้');
  const doorUnit = { id: 'd', x: 4, y: 9, alive: true };
  assert.ok(Board.reachable(map, doorUnit, 1, [doorUnit]).has('4,10'), 'ผ่านประตูได้');
  // พื้นที่สกิลข้ามตะเข็บ: ช่องคืนค่าในช่วง 0..15
  const tiles = Board.tilesInRange(map, 0, 20, [1, 1]);
  assert.ok(tiles.some((t) => t.x === 15 && t.y === 20));
  assert.ok(tiles.every((t) => t.x >= 0 && t.x < 16));
});

test('ปิดผนึกตอนจบเทิร์น 5: คนในปล้อง 1 ตายจริง (ฟื้นไม่ได้) · ปล้องที่ปิด = นอกกระดาน', () => {
  setup(3);
  const [a, b, c] = Object.values(P());
  put(a, 3, 4); put(b, 3, 12); put(c, 8, 30);
  engine.setRoundNumber(5);
  Colony.onEndTurn();
  assert.equal(a.alive, false); assert.equal(a.pos, null);
  assert.equal(b.alive, true); assert.equal(c.alive, true);
  assert.equal(match.colony.sealed, 1);
  const map = action.boardMap();
  assert.equal(map.minRow, 10);
  assert.equal(Board.inBounds(map, 3, 9), false);
  assert.equal(Board.inBounds(map, 3, 10), true);
  // จบเทิร์น 6 ไม่ปิดอะไร · จบเทิร์น 9 ปิดปล้อง 2
  engine.setRoundNumber(6); Colony.onEndTurn(); assert.equal(match.colony.sealed, 1);
  engine.setRoundNumber(9); Colony.onEndTurn();
  assert.equal(match.colony.sealed, 2); assert.equal(b.alive, false);
});

test('ครบเทิร์น 23 = Colony ระเบิด: ทุกคนตาย → เสมอ', () => {
  setup(2);
  const [a, b] = Object.values(P());
  put(a, 1, 33); put(b, 9, 35);
  match.colony.sealed = 3;
  engine.setRoundNumber(23);
  Colony.onEndTurn();
  assert.equal(a.alive, false); assert.equal(b.alive, false);
  assert.equal(endTurnPhase.gameOver(), true);
  assert.equal(match.gameState, 'GAMEOVER');
  assert.equal(match.winningTeamId, null);
  assert.ok(match.lastLog.some((l) => l.includes('เสมอ')));
});

test('อุกกาบาต: คนบนจุดตกถูกดูดออก · คนในรัศมีถูกดูดเข้าหารู 2 ช่อง · รูปิดตอนจบเทิร์นถัดไป', () => {
  setup(3);
  const [a, b, c] = Object.values(P());
  const x = clearColumn(2, 7);
  put(a, x, 3); put(b, x, 6); put(c, (x + 8) % 16, 15);
  match.colony.tele = [{ type: 'meteor', x, y: 3, at: 4, radius: 4 }];
  Math.random = () => 0.999;
  startTurn(4);
  assert.equal(a.alive, false, 'อยู่บนจุดตก = ถูกดูดออก');
  assert.equal(b.pos.y, 4, 'ห่าง 3 ช่อง → ถูกดูดเข้ามา 2 ช่อง');
  assert.equal(c.pos.y, 15, 'นอกรัศมีไม่ขยับ');
  assert.equal(match.colony.holes.length, 1);
  assert.equal(action.boardMap().terrain[`${x},3`], 'breach', 'รูเดิน/ยืนไม่ได้');
  // ต้นเทิร์นถัดไป: ดูดซ้ำ — ห่าง 1 → ถึงรู = ตาย
  match.colony.tele = [];
  startTurn(5);
  assert.equal(b.alive, false, 'ถูกดูดเข้ารอยรั่ว = ตายจริง');
  engine.setRoundNumber(5); Colony.onEndTurn();
  assert.equal(match.colony.holes.length, 0, 'ดูดครบ 2 เทิร์นแล้วปิด');
  assert.ok(match.colony.patched.includes(`${x},3`));
});

test('ลำแสง: ทุกคนในแถวเสีย 3 (ลดเกราะก่อน) + รอยรั่ว 1 จุดบนแถว', () => {
  setup(3);
  const [a, b, c] = Object.values(P());
  put(a, 2, 14); put(b, 13, 14); put(c, 5, 22);
  for (const p of [a, b, c]) { p.hp = 7; p.armor = 3; }
  match.colony.tele = [{ type: 'beam', y: 14, at: 4 }];
  startTurn(4);
  const ev = match.colony.scene.events.find((e) => e.type === 'beam');
  assert.deepEqual([...ev.hit].sort(), [a.id, b.id].sort(), 'ทุกคนในแถว (ทั้งวง) โดน');
  for (const p of [a, b]) if (p.alive) assert.ok(p.hp + p.armor <= 7, 'เสีย 3 (รอดแล้วอาจถูกดูดต่อ)');
  assert.equal(c.hp + c.armor, 10, 'คนละแถวไม่โดน');
  assert.equal(match.colony.holes.length, 1);
  assert.equal(match.colony.holes[0].cells[0][1], 14);
});

test('แคปซูลเสบียง: ลงจอด = ร้านเปิด 6 เทิร์น · ลงทับคน = เสีย 2 + ถูกดันออก · ครบเวลา = หายไป', () => {
  setup(2);
  const [a, b] = Object.values(P());
  put(a, 6, 15); put(b, 0, 1);
  a.hp = 7; a.armor = 0;
  match.colony.tele = [{ type: 'capsule', x: 6, y: 15, at: 3, final: false }];
  startTurn(3);
  assert.deepEqual(match.shopPos, { x: 6, y: 15 });
  assert.ok(match.shopItems.length > 0, 'มีของขาย');
  assert.equal(a.hp, 5);
  assert.ok(!(a.pos.x === 6 && a.pos.y === 15), 'ถูกดันออกจากจุดลงจอด');
  assert.equal(match.shopOpenedRound, 3);
  match.colony.tele = [];
  startTurn(9);
  assert.equal(match.shopPos, null, 'ครบ 6 เทิร์น = แคปซูลจากไป');
});

test('กระโดด: ไปฝั่งตรงข้าม สูงขึ้น 2 แถว · จบการเดิน · คูลดาวน์ 2 เทิร์น · ลงข้างศัตรู = กระทืบ 1', () => {
  setup(2);
  const [a, b] = Object.values(P());
  put(a, 3, 4); put(b, 12, 5); // จุดลง (11, 6) → ศัตรูอยู่ติดกัน (12, 5)? ไม่ — ห่าง 2
  b.hp = 7; b.armor = 3;
  put(b, 11, 7); // ติดจุดลงด้านล่าง
  actAs(a);
  assert.equal(Colony.canJump(a), true);
  assert.equal(Colony.jump(a.id), true);
  assert.deepEqual(a.pos, { x: 11, y: 6 });
  assert.equal(match.action.locked, true, 'จบการเดิน');
  assert.equal(b.armor, 2, 'กระทืบ 1 (ลดเกราะก่อน)');
  assert.equal(Colony.canJump(a), false, 'กระโดดซ้ำในตาเดียวกันไม่ได้');
  assert.equal(Colony.playerInfo(a).jumpCd, 2);
  // จบเทิร์น 2 ครั้ง → คูลดาวน์หมด
  engine.setRoundNumber(2); Colony.onEndTurn();
  engine.setRoundNumber(3); Colony.onEndTurn();
  actAs(a);
  assert.equal(Colony.canJump(a), true);
});

test('ลิฟต์แกนกลาง: จบตาบนช่องลิฟต์ = ดีดขึ้น 4 แถว', () => {
  setup(1);
  const [a] = Object.values(P());
  const [lx, ly] = Board.COLONY.lifts[0];
  put(a, lx, ly);
  action.tileEndEffect(a);
  assert.equal(a.pos.y, ly + 4);
});

test('โคโลนีหมุน (ทุก 3 เทิร์น): ทุกคนเลื่อนข้าง 1 ช่อง · พิกัดเกินขอบถูกจัดเข้าช่วง', () => {
  setup(2);
  const [a, b] = Object.values(P());
  put(a, 15, 3); put(b, 7, 3);
  match.colony.tele = [];
  startTurn(4);
  assert.deepEqual(a.pos, { x: 0, y: 3 }, 'ข้ามตะเข็บไปคอลัมน์ 0');
  assert.deepEqual(b.pos, { x: 8, y: 3 });
  put(a, 18, 3);
  Colony.normalize();
  assert.deepEqual(a.pos, { x: 2, y: 3 });
});

test('ตั้งเป้าเทิร์นหน้า: อุกกาบาตตั้งแต่เทิร์น 2 · ลำแสงเทิร์น 4 · แคปซูลในปล้องถัดขึ้นไป · ข้อมูลสาธารณะ', () => {
  setup(3);
  // เริ่มเกมแล้ว (ต้นเทิร์น 1) = ตั้งเป้าของเทิร์น 2 ไว้แล้ว
  const tele = match.colony.tele;
  assert.ok(tele.some((t) => t.type === 'meteor' && t.at === 2));
  const cap = tele.find((t) => t.type === 'capsule');
  assert.ok(cap && cap.y >= 10 && cap.y < 20, 'แคปซูลแรกลงปล้อง 2');
  startTurn(3);
  assert.ok(match.colony.tele.some((t) => t.type === 'beam' && t.at === 4));
  const info = Colony.publicInfo();
  assert.equal(info.sealIn, 3, 'เทิร์น 3: ประตูปิดในอีก 3 เทิร์น (รวมเทิร์นนี้)');
  assert.deepEqual(info.doors, [0, 4, 8, 12]);
  assert.equal(info.countdown, null);
});
