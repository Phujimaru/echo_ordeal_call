// โหมด Fodlan ด่าน II เรเมียร์ — ป่าหมอก (server/fodlan/stage2.js · map2.js · GRID_PLAN §8.5)
//  หมอก = มองเห็นแค่ระยะการเดินของตัวเอง (เพื่อนร่วมทีมมองร่วมกัน) · คบเพลิง (ร้านค้า 2 เหรียญ · ทุกคนเห็นระยะ 4 นับแบบการเดิน)
//  กล่องเสบียง (คบเพลิง / เหรียญ +2 / เกราะ +1 → ย้ายไปช่องอื่น) · เสาเวทมืด (ตี 2 ครั้ง → +2 เหรียญ + หมอกรอบเสาหายถาวร)
//  ไอพิษ: ต้นเทิร์นติดดีบัฟ Universal สุ่ม 1 อย่าง 1 เทิร์น (ไม่มีหลับใหล/สตั้น)
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const match = require('../server/match.js');
const Board = require('../server/board.js');
const Fodlan = require('../server/fodlan.js');
const action = require('../server/phases/action.js');
const Visibility = require('../server/visibility.js');
const Shop = require('../server/shop.js');
const Status = require('../characters/_universal_status.js');
const timers = require('../server/timers.js');
const S2 = require('../server/fodlan/stage2.js');

const realRandom = Math.random;
const realStart = timers.startPhaseTimer;
const AREA = Board.FODLAN_AREA + 1;
const K = Board.key;

function setup(n = 3) {
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
}
// ไปด่าน II (สุ่ม 0 = ด่าน 2 · weather = ไอพิษ)
function toFog(weather = false) {
  match.legStart = 1;
  match.roundNumber = 6;
  let n = 0;
  const seq = [0, weather ? 0.1 : 0.99];
  Fodlan.maybeAdvance(() => {}, () => seq[n++]);
  assert.equal(Fodlan.stageNow(), 2);
  assert.equal(match.board.area, AREA);
  match.gameState = 'PLAYING';
  match.actorId = null;
  match.action = null;
}
const P = (i) => match.players['p' + i];
function place(p, x, y) { p.pos = { x, y }; }
function actor(p) { match.gameState = 'ACTION'; match.actorId = p.id; match.action = { locked: false, canto: false, from: { ...p.pos } }; p.didAttackRound = false; }
const fd = () => Fodlan.publicInfo().board;
const vis = (p) => new Set(Fodlan.vision(p) || []);
// ช่องพื้นว่างติดกับ (x, y)
function freeNextTo(x, y) {
  const map = action.boardMap();
  for (const [dx, dy] of Board.DIRS) {
    const nx = x + dx, ny = y + dy;
    if (Board.inBounds(map, nx, ny) && !Board.isObstacle(map, nx, ny) && !Board.unitAt(action.boardUnits(), nx, ny)) return { x: nx, y: ny };
  }
  return null;
}
// ไล่ทุกคนออกไปมุมไกล (ไม่ให้สายตาซ้อนกัน)
function park() { place(P(0), 0, 13); place(P(1), 13, 12); place(P(2), 13, 0); }

test.beforeEach(() => { timers.startPhaseTimer = (secs) => { match.timeLeft = Math.ceil(secs); }; });
test.afterEach(() => { Math.random = realRandom; timers.startPhaseTimer = realStart; engine.clearPhaseTimer(); match.gameMode = 'ffa'; });
test.after(() => {
  match.world = 'earth'; match.fodlan = null; engine.setGameMode('ffa');
  for (const id of Object.keys(engine.players)) delete engine.players[id];
});

test('ผัง: ป่าสนดำ + หย่อมป่าทึบ (ซ่อนตัวได้) · เสาเวทมืด 3 ต้น + กล่องเสบียง 3 กล่องเป็นสิ่งกีดขวางของชั้นด่าน', () => {
  const m = Board.MAPS[AREA];
  assert.ok(Object.values(m.terrain).every((k) => k === 'fd_pine' || k === 'fd_rock'));
  assert.ok(Object.values(m.terrain).length >= 30, 'ป่าทึบ');
  assert.ok(Object.values(m.special).filter((k) => k === 'forest').length >= 20);
  assert.ok(Board.TERRAIN_INFO.forest.bush);
  setup(3);
  toFog();
  const b = fd();
  assert.equal(b.pillars.length, 3);
  assert.equal(b.crates.length, 3);
  const map = action.boardMap();
  for (const p of b.pillars) assert.equal(map.terrain[K(p.x, p.y)], 'fd_pillar');
  for (const c of b.crates) assert.equal(map.terrain[K(c.x, c.y)], 'fd_crate');
  assert.deepEqual(Fodlan.objects().filter((o) => o.kind === 'pillar').map((o) => o.hp), [2, 2, 2]);
});

test('หมอก: มองเห็นแค่ระยะการเดินของตัวเอง (+ ช่องที่ยืน + ติดตัว) · ศัตรูนอกระยะมองไม่เห็น · ในระยะเห็น', () => {
  setup(3);
  toFog();
  park();
  const a = P(0), e = P(1);
  place(a, 4, 6);
  const mov = action.movOf(a);
  const map = action.boardMap();
  const reach = Board.reachable(map, { id: 'x', x: 4, y: 6 }, mov, []);
  const want = new Set([...reach.keys()]);
  for (const [dx, dy] of [[0, 0], ...Board.DIRS]) if (Board.inBounds(map, 4 + dx, 6 + dy)) want.add(K(4 + dx, 6 + dy));
  // สิ่งกีดขวางที่ติดช่องที่เห็น = เห็นด้วย (ภาพเท่านั้น — ไม่มีใครยืนได้)
  for (const k of [...want]) {
    const [x, y] = k.split(',').map(Number);
    for (const [dx, dy] of Board.DIRS) if (Board.inBounds(map, x + dx, y + dy) && Board.isObstacle(map, x + dx, y + dy)) want.add(K(x + dx, y + dy));
  }
  assert.deepEqual([...vis(a)].sort(), [...want].sort());
  for (const k of vis(a)) { const [x, y] = k.split(',').map(Number); assert.ok(reach.has(k) || Board.isObstacle(map, x, y) || Board.dist({ x: 4, y: 6 }, { x, y }) <= 1, `${k} ต้องอยู่ในระยะเดิน`); }
  // ศัตรูไกล = มองไม่เห็น (pos ถูกซ่อน) · ศัตรูในระยะเดิน = เห็น
  assert.equal(Visibility.hiddenFrom(a, e), true);
  place(e, 6, 6);
  assert.ok(want.has('6,6'));
  assert.equal(Visibility.hiddenFrom(a, e), false);
  // ช่องที่เดินไปไม่ถึง (ไกลเกิน mov) = หมอก
  place(e, 12, 9);
  assert.equal(Visibility.hiddenFrom(a, e), true);
  // ตี/ยิง/ใช้ของใส่คนอื่น = โผล่จากหมอกจนจบเทิร์น
  e.exposedRound = match.roundNumber;
  assert.equal(Visibility.hiddenFrom(a, e), false);
  e.exposedRound = null;
  // ระยะเดินลดลง (เชื่องช้า) = มองเห็นน้อยลง
  a.statuses.slow = 1;
  assert.ok(vis(a).size < want.size);
  delete a.statuses.slow;
});

test('หมอก: ยังเดินต่อได้ = มองจากช่องเริ่มตา · เพื่อนร่วมทีมมองร่วมกัน', () => {
  setup(3);
  toFog();
  park();
  const a = P(0), e = P(1), mate = P(2);
  place(a, 4, 6);
  const before = vis(a);
  actor(a);
  place(a, 6, 6); // เดินแล้วยังไม่ล็อก
  assert.deepEqual([...vis(a)].sort(), [...before].sort());
  match.action.locked = true;
  assert.notDeepEqual([...vis(a)].sort(), [...before].sort());
  match.gameState = 'PLAYING';
  // ทีม: สายตาของเพื่อน = ของเรา
  match.gameMode = 'duo';
  a.teamId = 'A'; mate.teamId = 'A'; e.teamId = 'B';
  place(a, 4, 6); place(mate, 11, 2); place(e, 12, 2);
  assert.ok(!before.has('12,2'));
  assert.equal(Visibility.hiddenFrom(a, e), false, 'เพื่อนเห็น = เราเห็น');
  const v = vis(a);
  for (const k of vis(mate)) assert.ok(v.has(k));
  assert.equal(Visibility.hiddenFrom(e, a), true, 'ฝ่ายตรงข้ามยังมองเราไม่เห็น');
  match.gameMode = 'ffa';
  for (const p of [a, mate, e]) p.teamId = null;
});

test('คบเพลิง: ขายในร้าน 2 เหรียญเฉพาะด่านนี้ (ซื้อซ้ำได้) · ใช้ = ปักบนช่องที่ยืน · ทุกคนเห็นระยะ 4 (นับแบบการเดิน) · ศัตรูตีดับได้', () => {
  setup(3);
  toFog();
  park();
  const a = P(0), e = P(1), far = P(2);
  const torch = match.shopItems.find((it) => it.type === 'torch');
  assert.ok(torch, 'ร้านมีคบเพลิง');
  assert.equal(torch.price, 2);
  assert.equal(Shop.shopItemName(torch), 'คบเพลิง');
  place(a, 6, 6);
  match.shopPos = { x: 7, y: 6 };
  a.gold = 5;
  actor(a);
  Shop.buyShopItem('p0', torch.id);
  actor(a);
  Shop.buyShopItem('p0', torch.id);
  assert.equal(a.gold, 1);
  assert.equal(a.inventory.filter((it) => it.type === 'torch').length, 2);
  assert.equal(torch.sold, false);
  match.shopPos = null;
  // ใช้: ปักบนช่องที่ยืน
  actor(a);
  Shop.useInventoryItem('p0', a.inventory[0].uid);
  assert.equal(a.inventory.length, 1);
  assert.equal(match.action.locked, true, 'ใช้ไอเทมแล้วเดินไม่ได้อีก');
  const t = fd().torches[0];
  assert.deepEqual([t.x, t.y], [6, 6]);
  assert.ok(fd().fx.some((x) => x.kind === 'torch_place'));
  // ช่องที่แสงถึง: ระยะเดินไม่เกิน 4 · ไม่มีสิ่งกีดขวาง · เห็นได้ทุกคน (รวมคนไกลที่ไม่เกี่ยว)
  const map = action.boardMap();
  const walk = Board.reachable(map, { id: 'x', x: 6, y: 6 }, 4, []);
  assert.deepEqual([...t.tiles].sort(), [...walk.keys()].sort());
  match.gameState = 'PLAYING';
  for (const p of [e, far]) { const v = vis(p); for (const k of t.tiles) assert.ok(v.has(k), `${p.id} เห็น ${k}`); }
  // ศัตรูยืนในแสงคบเพลิง = ทุกคนเห็น
  const lit = t.tiles.map((k) => k.split(',').map(Number)).find(([x, y]) => Math.abs(x - 6) + Math.abs(y - 6) >= 3);
  assert.ok(lit, 'แสงไปไกลกว่า 2 ช่อง');
  place(e, lit[0], lit[1]);
  assert.equal(Visibility.hiddenFrom(far, e), false);
  // ปักซ้ำช่องเดิมไม่ได้ (ไม่เสียของ)
  actor(a);
  Shop.useInventoryItem('p0', a.inventory[0].uid);
  assert.equal(a.inventory.length, 1);
  // เจ้าของดับเองไม่ได้ · ศัตรูที่อยู่ในระยะตีดับได้
  assert.equal(Fodlan.strikeObject(a, t.id), false);
  place(e, 6, 7);
  actor(e);
  assert.ok(Fodlan.strikeObject(e, t.id) > 0);
  assert.equal(fd().torches.length, 0);
  assert.ok(fd().fx.some((x) => x.kind === 'torch_out'));
  match.gameState = 'PLAYING';
  assert.equal(Visibility.hiddenFrom(far, e), true, 'ไฟดับ = กลับเป็นหมอก');
  // ออกจากด่าน = ร้านไม่ขาย · ใช้คบเพลิงไม่ได้
  match.roundNumber = 12;
  Fodlan.maybeAdvance(() => {}, () => 0);
  assert.notEqual(Fodlan.stageNow(), 2);
  Shop.refreshShopForJourney();
  assert.ok(!match.shopItems.some((it) => it.type === 'torch'));
  actor(a);
  Shop.useInventoryItem('p0', a.inventory[0].uid);
  assert.equal(a.inventory.length, 1);
  assert.equal(Fodlan.vision(a), null, 'ด่านอื่นไม่มีหมอก');
});

test('กล่องเสบียง: ยืนติดกด "เปิดกล่อง" (ใช้การตีของตา) → คบเพลิง / เหรียญ +2 / เกราะ +1 · กล่องย้ายไปช่องอื่น', () => {
  setup(3);
  toFog();
  park();
  const a = P(0);
  const open = (r) => {
    const c = fd().crates[0];
    const at = freeNextTo(c.x, c.y);
    place(a, at.x, at.y);
    actor(a);
    const acts = Fodlan.hudActions(a);
    assert.equal(acts.length, 1);
    assert.equal(acts[0].key, 'fd:crate');
    assert.equal(acts[0].name, 'เปิดกล่อง');
    assert.ok(!acts[0].disabled);
    Math.random = () => r;
    assert.equal(Fodlan.charAction('p0', 'fd:crate', null), true);
    Math.random = realRandom;
    assert.equal(a.didAttackRound, true, 'ใช้การตีของตา');
    assert.equal(match.gameState, 'ATTACKING');
    const now = fd().crates;
    assert.equal(now.length, 3);
    assert.ok(!now.some((x) => x.x === c.x && x.y === c.y), 'กล่องย้ายไปช่องอื่น');
    for (const x of now) assert.equal(action.boardMap().terrain[K(x.x, x.y)], 'fd_crate');
    assert.equal(action.boardMap().terrain[K(c.x, c.y)], undefined);
  };
  a.armor = 0; a.gold = 0;
  open(0); // [คบเพลิง, เหรียญ, เกราะ] → คบเพลิง
  assert.equal(a.inventory.filter((it) => it.type === 'torch').length, 1);
  open(0.5); // เหรียญ
  assert.equal(a.gold, 2);
  open(0.9); // เกราะ
  assert.equal(a.armor, 1);
  assert.ok(fd().fx.filter((x) => x.kind === 'crate_open').length === 3);
  // ไม่ได้อยู่ติดกล่อง = ไม่มีปุ่ม
  place(a, 0, 13);
  actor(a);
  assert.deepEqual(Fodlan.hudActions(a), []);
  // ตีไปแล้ว = กดไม่ได้
  const c = fd().crates[0];
  const at = freeNextTo(c.x, c.y);
  place(a, at.x, at.y);
  actor(a);
  a.didAttackRound = true;
  assert.equal(Fodlan.hudActions(a)[0].disabled, true);
  assert.equal(Fodlan.charAction('p0', 'fd:crate', null), false);
});

test('เสาเวทมืด: ตี 2 ครั้งพัง → ผู้ตี +2 เหรียญ · หมอกรอบเสาระยะ 2 หายถาวร (ทุกคนเห็น) · ช่องเสากลับเป็นพื้น', () => {
  setup(3);
  toFog();
  park();
  const a = P(0), far = P(2);
  const pil = Fodlan.objects().find((o) => o.kind === 'pillar');
  const at = freeNextTo(pil.x, pil.y);
  place(a, at.x, at.y);
  a.gold = 0;
  actor(a);
  assert.ok(Fodlan.strikeObject(a, pil.id) > 0);
  assert.equal(Fodlan.objects().find((o) => o.id === pil.id).hp, 1);
  assert.equal(a.gold, 0);
  actor(a);
  assert.ok(Fodlan.strikeObject(a, pil.id) > 0);
  assert.equal(Fodlan.objects().find((o) => o.id === pil.id), undefined);
  assert.equal(a.gold, 2);
  assert.equal(action.boardMap().terrain[K(pil.x, pil.y)], undefined);
  const kinds = fd().fx.map((x) => x.kind);
  assert.ok(kinds.includes('pillar_break') && kinds.includes('fog_clear'));
  assert.deepEqual(fd().cleared, [{ x: pil.x, y: pil.y }]);
  match.gameState = 'PLAYING';
  const v = vis(far);
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const x = pil.x + dx, y = pil.y + dy;
    if (Math.abs(dx) + Math.abs(dy) > 2 || !Board.inBounds(action.boardMap(), x, y)) continue;
    assert.ok(v.has(K(x, y)), `เห็น ${x},${y}`);
  }
});

test('ไอพิษ: ต้นเทิร์นทุกคนติดดีบัฟ Universal สุ่ม 1 อย่าง 1 เทิร์น (ไม่มีหลับใหล/สตั้น) · ต้านสถานะกันได้ · ครบ 3 เทิร์นหยุด', () => {
  const keys = S2.MIASMA.map((d) => d.key);
  for (const k of ['sleep', 'stun', 'nodraw', 'noskill', 'rooted']) assert.ok(!keys.includes(k), k);
  for (const k of keys) assert.ok(Status.BASIC_DEBUFF_CLEAR.includes(k), `${k} เป็นดีบัฟ Universal`);
  setup(3);
  toFog(true);
  assert.deepEqual(Fodlan.weatherNow(), { kind: 'miasma', left: 3 });
  for (const p of [P(0), P(1), P(2)]) { p.statuses = {}; p.statusAmt = {}; }
  P(2).statuses.resist = 1;
  const seen = new Set();
  for (let turn = 0; turn < 3; turn++) {
    for (const p of [P(0), P(1)]) { p.statuses = {}; p.statusAmt = {}; }
    match.roundNumber = 6 + turn;
    Math.random = () => (turn * 0.37 + 0.05) % 1;
    assert.equal(Fodlan.preRound(() => {}), false, 'ไม่พักเกม');
    Math.random = realRandom;
    for (const p of [P(0), P(1)]) {
      const got = Object.keys(p.statuses).filter((k) => keys.includes(k));
      assert.equal(got.length, 1, `${p.id} ติด 1 อย่าง`);
      assert.equal(p.statuses[got[0]], 1, 'มีผลเทิร์นเดียว (endTurn ลดเหลือ 0 ตอนจบเทิร์นนี้)');
      assert.ok(!p.statuses.sleep && !p.statuses.stun);
      seen.add(got[0]);
    }
    assert.deepEqual(Object.keys(P(2).statuses), ['resist'], 'ต้านสถานะ = ไม่ติด');
    assert.ok(match.lastLog.some((l) => l.includes('ไอพิษ')));
    Fodlan.onEndTurn();
  }
  assert.ok(seen.size >= 2, 'สุ่มได้หลายแบบ');
  assert.equal(Fodlan.weatherNow(), null);
  for (const p of [P(0), P(1)]) { p.statuses = {}; p.statusAmt = {}; }
  match.roundNumber = 9;
  Fodlan.preRound(() => {});
  assert.deepEqual(P(0).statuses, {}, 'สภาพอากาศหมดแล้วไม่ติด');
});
