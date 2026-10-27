// โหมด Fodlan ด่าน IV เทือกเขาฟาร์กัส (server/fodlan/stage4.js · ผัง server/fodlan/map4.js · GRID_PLAN §8.5)
//  กองไฟ 2 กองสุ่มที่ตั้ง · ความอบอุ่น 3 (ระยะ 3 ช่องแบบการเดิน) · น้ำแข็งกัด 1 + สตั้น 40% · ลุกไหม้/Fire Frame/ไฟดิเอโก้ = อุ่น
//  ฟืน (ตีต้นไม้แห้ง) → เติมฟืน / ก่อกองไฟเล็ก · หิมะถล่ม (ตีกองหิมะ) · พายุหิมะ = กองไฟดับ 3 เทิร์น
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const match = require('../server/match.js');
const Board = require('../server/board.js');
const Fodlan = require('../server/fodlan.js');
const timers = require('../server/timers.js');
const S4 = require('../server/fodlan/stage4.js');

const K = Board.key;
const realRandom = Math.random;
const noWx = () => 0.99; // จบเทิร์นในเทสต์: ไม่สุ่มสภาพอากาศใหม่ (สุ่มทุกเทิร์นจนกว่าจะเกิด — server/fodlan.js onEndTurn)
const realStart = timers.startPhaseTimer;
function fakeTimers() { timers.startPhaseTimer = (secs) => { match.timeLeft = Math.ceil(secs); }; }

// เริ่มแมตช์ Fodlan แล้วเปลี่ยนไปด่าน IV · weather = พายุหิมะ
function setup(n = 3, { weather = false } = {}) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  for (let i = 0; i < n; i++) {
    engine.players['p' + i] = {
      id: 'p' + i, name: 'P' + i, position: i + 1, characterId: 'dummy', alive: true, connected: true,
      cards: [], statuses: {}, statusAmt: {}, seen: {}, inventory: [],
    };
  }
  engine.setGameMode('ffa');
  match.world = 'fodlan';
  Math.random = () => 0.99;
  engine.startMatch();
  Math.random = realRandom;
  engine.clearPhaseTimer();
  match.legStart = 1;
  match.roundNumber = 6;
  let k = 0;
  Fodlan.maybeAdvance(() => {}, () => [0.5, weather ? 0.1 : 0.9][k++]); // ด่าน 4
  assert.equal(Fodlan.stageNow(), 4);
  match.shopPos = null; // ร้านไม่ขวางเทสต์
  match.roundNumber = 7;
  const P = engine.players;
  for (const p of Object.values(P)) { p.hp = 7; p.armor = 0; p.shield = 0; p.statuses = {}; p.statusAmt = {}; }
  return P;
}
const st = () => Fodlan.stageState();
function place(p, x, y) { p.pos = { x, y }; }
// ตั้งกองไฟเอง (แทนที่ตั้งที่สุ่ม)
function setFires(list) {
  st().fires = list.map((f, i) => ({ id: 100 + i, lit: true, small: false, ...f }));
  st().ver = (st().ver || 0) + 1;
}
const warmth = (p) => Fodlan.playerInfo(p).warmth;
// ให้ p เป็นคนที่กำลังเดิน (ตีได้)
function myTurn(p) {
  match.gameState = 'ACTION';
  match.actorId = p.id;
  match.action = { moved: false, locked: false, from: { ...p.pos } };
  p.didAttackRound = false;
}
// วางทุกคนที่ไม่ได้ใช้ไว้ไกลๆ (มุมล่าง) ไม่ให้ชน
function park(P, ids) {
  const spots = [[13, 13], [11, 13], [9, 13]];
  ids.forEach((id, i) => place(P[id], ...spots[i]));
}

test.beforeEach(() => { fakeTimers(); });
test.afterEach(() => { Math.random = realRandom; timers.startPhaseTimer = realStart; engine.clearPhaseTimer(); });
test.after(() => {
  match.world = 'earth'; match.fodlan = null; engine.setGameMode('ffa');
  match.gameState = 'LOBBY'; match.actorId = null; match.action = null;
  for (const id of Object.keys(engine.players)) delete engine.players[id];
});

test('ผัง: หน้าผาตลอดขอบไกล · กองหิมะ 3 กองติดหน้าผา · ต้นไม้แห้ง · แอ่งน้ำแข็งผืนเดียว 3×4 · ตีได้ = ต้นไม้แห้ง + กองหิมะ', () => {
  const m = Board.MAPS[Fodlan.areaOf(4)];
  for (let x = 0; x < 14; x++) assert.equal(m.terrain[K(x, 0)], 'fd_snowcliff');
  const kinds = (k) => Object.values(m.terrain).filter((v) => v === k).length;
  assert.equal(kinds('fd_snowpile'), 3);
  assert.ok(kinds('fd_deadwood') >= 3);
  const ice = Object.entries(m.special).filter(([, v]) => v === 'ice').map(([k]) => k.split(',').map(Number));
  const xs = ice.map(([x]) => x), ys = ice.map(([, y]) => y);
  assert.equal(Math.max(...xs) - Math.min(...xs) + 1, 3);
  assert.equal(Math.max(...ys) - Math.min(...ys) + 1, 4);
  // ผืนเดียว (ต่อกัน 4 ทิศ)
  const set = new Set(ice.map(([x, y]) => K(x, y))), seen = new Set([K(...ice[0])]), q = [ice[0]];
  while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = K(x + dx, y + dy); if (set.has(k) && !seen.has(k)) { seen.add(k); q.push([x + dx, y + dy]); } } }
  assert.equal(seen.size, set.size);
  setup();
  const objs = Fodlan.publicInfo().board.objects;
  assert.equal(objs.filter((o) => o.kind === 'fd_snowpile').length, 3);
  assert.ok(objs.every((o) => o.strike && o.id.startsWith('fd:')));
});

test('เข้าด่าน: กองไฟ 2 กองสุ่มที่ตั้ง (ลุก · เป็นสิ่งกีดขวาง · ห่างกัน · ไม่ติดสิ่งกีดขวาง) · ความอบอุ่น 3/3 ทุกคน', () => {
  const P = setup();
  const fires = st().fires;
  assert.equal(fires.length, 2);
  const map = engine.boardMap();
  for (const f of fires) {
    assert.ok(f.lit);
    assert.equal(map.terrain[K(f.x, f.y)], 'fd_campfire');
    assert.ok(Board.isObstacle(map, f.x, f.y));
    const base = Board.MAPS[Fodlan.areaOf(4)];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) assert.ok(!base.terrain[K(f.x + dx, f.y + dy)], 'รอบกองไฟไม่มีสิ่งกีดขวาง');
  }
  assert.ok(Math.abs(fires[0].x - fires[1].x) + Math.abs(fires[0].y - fires[1].y) >= 5);
  for (const p of Object.values(P)) {
    assert.equal(warmth(p), 3);
    assert.deepEqual(Fodlan.playerInfo(p).badges[0], { key: 'warmth', icon: '🔥', label: '3/3', cls: 'bg-orange-300 text-gray-900' });
  }
  const pub = Fodlan.publicInfo().board.fires;
  assert.equal(pub.length, 2);
  assert.ok(pub.every((f) => f.lit && f.r === 3 && f.tiles.length > 10));
});

test('พายุหิมะเริ่มกลางด่าน (สุ่มติดตอนจบเทิร์น): กองไฟที่ลุกดับหมด · ครบ 3 เทิร์นกลับมาลุก', () => {
  setup();
  setFires([{ x: 5, y: 6 }, { x: 10, y: 10 }]);
  Fodlan.onEndTurn(() => 0.1);
  assert.deepEqual(Fodlan.weatherNow(), { kind: 'blizzard', left: 3 });
  assert.ok(match.fodlan.s.fires.every((f) => !f.lit), 'ดับหมด');
  assert.equal(match.fodlan.s.fx.filter((e) => e.kind === 'fireout').length, 2);
  Fodlan.onEndTurn(noWx); Fodlan.onEndTurn(noWx);
  assert.ok(match.fodlan.s.fires.every((f) => !f.lit), 'ยังดับ 3 เทิร์น');
  Fodlan.onEndTurn(noWx);
  assert.equal(Fodlan.weatherNow(), null);
  assert.ok(match.fodlan.s.fires.every((f) => f.lit), 'พายุสงบ = ลุกกลับ');
});

test('ความอบอุ่น: ห่างกองไฟ −1/เทิร์น · กลับเข้าระยะ 3 ช่อง (นับแบบการเดิน) +1 จนเต็ม 3', () => {
  const P = setup();
  setFires([{ x: 5, y: 6 }]);
  park(P, ['p2']);
  place(P.p0, 12, 13); place(P.p1, 2, 6); // p1 ห่าง 3 ก้าวพอดี (5,6)→(4,6)→(3,6)→(2,6)
  Fodlan.onEndTurn(noWx);
  assert.equal(warmth(P.p0), 2);
  assert.equal(warmth(P.p1), 3, 'อยู่ในระยะ = เต็มอยู่แล้ว');
  Fodlan.onEndTurn(noWx);
  assert.equal(warmth(P.p0), 1);
  // (5,4) ห่าง 2 ช่องตรงๆ แต่หินหิมะ (5,5) กั้น — เดินอ้อม 4 ก้าว = ไม่อุ่น
  place(P.p0, 5, 4);
  Fodlan.onEndTurn(noWx);
  assert.equal(warmth(P.p0), 0);
  place(P.p0, 4, 4); // อ้อมซ้าย 3 ก้าว (4,6)→(4,5)→(4,4)
  Fodlan.onEndTurn(noWx);
  assert.equal(warmth(P.p0), 1);
  Fodlan.onEndTurn(noWx); Fodlan.onEndTurn(noWx); Fodlan.onEndTurn(noWx);
  assert.equal(warmth(P.p0), 3, 'เต็ม 3');
});

test('น้ำแข็งกัด: ความอบอุ่น 0 = เสียหาย 1 (ลดเกราะก่อน) ทุกเทิร์น · สตั้น 40% ทุกครั้งที่โดน', () => {
  const P = setup();
  setFires([{ x: 5, y: 6 }]);
  park(P, ['p1', 'p2']);
  place(P.p0, 12, 2);
  st().warmth.p0 = 1;
  P.p0.armor = 1;
  Math.random = () => 0.5; // ≥ 40% = ไม่สตั้น
  Fodlan.onEndTurn(noWx);
  assert.equal(warmth(P.p0), 0);
  assert.equal(P.p0.armor, 0, 'เกราะรับก่อน');
  assert.equal(P.p0.hp, 7);
  assert.ok(!(P.p0.statuses.stun > 0));
  assert.ok(Fodlan.playerInfo(P.p0).badges.some((b) => b.key === 'frost'));
  Math.random = () => 0.39; // < 40% = สตั้น
  Fodlan.onEndTurn(noWx);
  assert.equal(P.p0.hp, 6);
  assert.equal(P.p0.statuses.stun, 1);
  assert.ok(st().fx.some((e) => e.kind === 'frostbite' && e.id === 'p0' && e.stun));
  // คนอื่นที่ความอบอุ่นยังไม่หมดไม่โดน
  assert.equal(P.p1.hp, 7);
});

test('ติดลุกไหม้ = อุ่นเหมือนอยู่ใกล้กองไฟ', () => {
  const P = setup();
  setFires([{ x: 5, y: 6 }]);
  park(P, ['p1', 'p2']);
  place(P.p0, 12, 2);
  st().warmth.p0 = 1;
  P.p0.statuses.hburn = 1;
  Fodlan.onEndTurn(noWx);
  assert.equal(warmth(P.p0), 2);
  assert.equal(P.p0.hp, 7);
});

test('ไฟของตัวละครนับเป็นกองไฟ: โซระร่าง Fire Frame (ตัวเอง + ระยะ 3) · กองไฟของดิเอโก้', () => {
  const P = setup();
  setFires([]);
  park(P, ['p2']);
  P.p0.characterId = 'sora_otosumi';
  P.p0.sora = { myth: true, fire: true };
  place(P.p0, 12, 2); place(P.p1, 9, 2); // ห่าง 3 ก้าว
  st().warmth = { p0: 1, p1: 1, p2: 1 };
  Fodlan.onEndTurn(noWx);
  assert.equal(warmth(P.p0), 2, 'โซระ Fire Frame อุ่นเอง');
  assert.equal(warmth(P.p1), 2, 'ในระยะ 3 ช่องของโซระ');
  assert.equal(warmth(P.p2), 0, 'ไกล = หนาว');
  P.p0.sora.fire = false; // กลับร่าง My-Th = ไม่มีไฟ
  Fodlan.onEndTurn(noWx);
  assert.equal(warmth(P.p1), 1);
  // กองไฟของดิเอโก้ (ชั้นพื้น match.board.diego.fire)
  match.board.diego = { oil: {}, fire: { [K(10, 13)]: { owner: 'x', left: 3 } }, ash: {} };
  Fodlan.onEndTurn(noWx);
  assert.equal(warmth(P.p2), 1, 'p2 (13,13) อยู่ในระยะ 3 ของกองไฟดิเอโก้ (10,13)');
  delete match.board.diego;
});

test('ฟืน: ตีต้นไม้แห้งได้ฟืน (พกได้ 2) · เติมฟืนจุดกองไฟที่ดับได้ทันทีแม้พายุหิมะ (ใช้การตี)', () => {
  const P = setup(3, { weather: true });
  assert.deepEqual(Fodlan.weatherNow(), { kind: 'blizzard', left: 3 });
  assert.ok(st().fires.every((f) => !f.lit), 'พายุหิมะ = กองไฟดับ');
  park(P, ['p1', 'p2']);
  // ตีต้นไม้แห้ง (4,3) จาก (4,2)
  place(P.p0, 4, 2);
  myTurn(P.p0);
  assert.ok(Fodlan.strikeObject(P.p0, 'fd:tree:4,3'));
  assert.equal(Fodlan.playerInfo(P.p0).logs, 1);
  assert.ok(Fodlan.playerInfo(P.p0).badges.some((b) => b.key === 'logs' && b.label === '1/2'));
  myTurn(P.p0);
  Fodlan.strikeObject(P.p0, 'fd:tree:4,3');
  myTurn(P.p0);
  Fodlan.strikeObject(P.p0, 'fd:tree:4,3');
  assert.equal(Fodlan.playerInfo(P.p0).logs, 2, 'พกได้ 2');
  // กองไฟที่ดับอยู่ข้างตัว → ปุ่มเติมฟืน
  setFires([{ x: 6, y: 6, lit: false }]);
  place(P.p0, 6, 7);
  myTurn(P.p0);
  const btn = Fodlan.hudActions(P.p0).find((a) => a.key === 'fd:refuel');
  assert.ok(btn && !btn.disabled);
  assert.deepEqual(btn.tiles, [{ x: 6, y: 6 }]);
  assert.equal(engine.boardMap().terrain[K(6, 6)], 'fd_campfire_out');
  assert.ok(Fodlan.charAction('p0', 'fd:refuel', { x: 6, y: 6 }));
  assert.equal(match.gameState, 'ATTACKING', 'ใช้การตีของตานี้');
  assert.ok(st().fires[0].lit);
  assert.equal(engine.boardMap().terrain[K(6, 6)], 'fd_campfire');
  assert.equal(Fodlan.playerInfo(P.p0).logs, 1);
  // ลุกแล้ว = อุ่นทั้งที่พายุหิมะยังอยู่
  st().warmth.p0 = 1;
  Fodlan.onEndTurn(noWx);
  assert.equal(warmth(P.p0), 2);
});

test('ก่อกองไฟ (ฟืน 2): กองไฟเล็กบนช่องว่างติดตัว · ระยะอบอุ่น 2 · อยู่ 3 เทิร์นแล้วมอด', () => {
  const P = setup();
  setFires([]);
  park(P, ['p2']);
  place(P.p0, 6, 6);
  st().logs.p0 = 2;
  myTurn(P.p0);
  const btn = Fodlan.hudActions(P.p0).find((a) => a.key === 'fd:build');
  assert.ok(btn && !btn.disabled);
  assert.ok(btn.tiles.some((t) => t.x === 6 && t.y === 5));
  assert.ok(Fodlan.charAction('p0', 'fd:build', { x: 6, y: 5 }));
  assert.equal(Fodlan.playerInfo(P.p0).logs, 0);
  assert.equal(engine.boardMap().terrain[K(6, 5)], 'fd_campfire_small');
  // ระยะ 2: (6,7) ห่าง 2 อุ่น · (6,8) ห่าง 3 ไม่อุ่น
  place(P.p0, 6, 7); place(P.p1, 6, 8);
  st().warmth = { p0: 1, p1: 1 };
  Fodlan.onEndTurn(noWx);
  assert.equal(warmth(P.p0), 2);
  assert.equal(warmth(P.p1), 0);
  Fodlan.onEndTurn(noWx);
  assert.equal(st().fires.length, 1, 'ยังอยู่หลัง 2 เทิร์น');
  Fodlan.onEndTurn(noWx);
  assert.equal(st().fires.length, 0, 'ครบ 3 เทิร์น มอด');
  assert.ok(!engine.boardMap().terrain[K(6, 5)]);
});

test('หิมะถล่ม: ตีกองหิมะ → แนวยาว 5 ช่องออกจากหน้าผา · เสียหาย 2 + ผลัก 2 ช่องตามแนว · ไม่โดนผู้ตี · กองหิมะหาย', () => {
  const P = setup(4);
  setFires([]);
  park(P, ['p3']);
  // กองหิมะ (7,1) ติดหน้าผา (7,0) → แนว x = 7, y = 2..6
  place(P.p0, 6, 1); place(P.p1, 7, 3); place(P.p2, 7, 6);
  P.p2.armor = 1;
  myTurn(P.p0);
  const secs = Fodlan.strikeObject(P.p0, 'fd:pile:7,1');
  assert.ok(secs > 1);
  assert.deepEqual(P.p1.pos, { x: 7, y: 5 });
  assert.deepEqual(P.p2.pos, { x: 7, y: 8 });
  assert.equal(P.p1.hp, 5);
  assert.equal(P.p2.armor, 0); assert.equal(P.p2.hp, 6, 'เกราะรับก่อน');
  assert.equal(P.p0.hp, 7, 'ผู้ตีไม่โดน');
  assert.ok(!engine.boardMap().terrain[K(7, 1)], 'กองหิมะหาย');
  assert.ok(!Fodlan.objects().some((o) => o.id === 'fd:pile:7,1'));
  const e = st().fx.find((f) => f.kind === 'avalanche');
  assert.deepEqual([e.x, e.y, e.dx, e.dy, e.len], [7, 1, 0, 1, 5]);
  const line = S4.avalancheLine(engine.boardMap(), Board, 2, 1);
  assert.deepEqual(line.dir, [0, 1]);
  assert.equal(line.tiles.length, 5);
});

test('พายุหิมะ: กองไฟดับตลอด 3 เทิร์น (ไม่อุ่น) · พายุสงบแล้วกองไฟกลับมาลุก', () => {
  const P = setup(3, { weather: true });
  const f = st().fires[0];
  park(P, ['p1', 'p2']);
  place(P.p0, f.x, f.y + 1);
  assert.ok(!f.lit);
  assert.equal(engine.boardMap().terrain[K(f.x, f.y)], 'fd_campfire_out');
  assert.equal(Fodlan.publicInfo().board.fires[0].tiles.length, 0);
  Fodlan.onEndTurn(noWx);
  assert.equal(warmth(P.p0), 2, 'ติดกองไฟที่ดับ = หนาว');
  Fodlan.onEndTurn(noWx);
  assert.equal(warmth(P.p0), 1);
  Fodlan.onEndTurn(noWx); // พายุเทิร์นสุดท้าย
  assert.equal(warmth(P.p0), 0);
  assert.equal(Fodlan.weatherNow(), null);
  assert.ok(st().fires.every((o) => o.lit), 'พายุสงบ กองไฟลุก');
  assert.equal(engine.boardMap().terrain[K(f.x, f.y)], 'fd_campfire');
  Fodlan.onEndTurn(noWx);
  assert.equal(warmth(P.p0), 1);
});
