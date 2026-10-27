// โหมด Fodlan ด่าน I แม่น้ำแอร์มิด — ป่า + แม่น้ำใหญ่ (server/fodlan/stage1.js · map1.js · GRID_PLAN §8.5)
//  แม่น้ำ = สิ่งกีดขวางแบ่งกระดาน · ข้ามได้แค่เรือ 2×3 (ของกลาง ขับไปตามแม่น้ำ ของบนเรือไปด้วย) หรือสะพานน้ำแข็ง
//  คันโยก = ดึงเรือว่างกลับท่าฝั่งนั้น (ใช้การตี) · ตกปลา (ใช้การตี — เลือด/แต้มสกิล/เหรียญ/ไม่ได้อะไร)
//  ฝนฟ้าผ่า: เดิน −1 · ช่องเตือน → ต้นเทิร์นถัดไปผ่าลง เสียหาย 2
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const match = require('../server/match.js');
const Board = require('../server/board.js');
const Fodlan = require('../server/fodlan.js');
const action = require('../server/phases/action.js');
const Ice = require('../server/ice.js');
const timers = require('../server/timers.js');
const S1 = require('../server/fodlan/stage1.js');
const MAP1 = require('../server/fodlan/map1.js');

const realRandom = Math.random;
const realStart = timers.startPhaseTimer;
const AREA = Board.FODLAN_AREA;
const K = Board.key;
const NORTH = { x: 9, y: 5 }, SOUTH = { x: 3, y: 6 }; // ที่จอดเรือ (มุมบนซ้าย)

// random 0.99 = ไม่มีสภาพอากาศ + เรือจอดท่าฝั่งใต้ · < 0.5 = ฝนฟ้าผ่า + ท่าฝั่งเหนือ
function setup(n = 3, random = 0.99) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  for (let i = 0; i < n; i++) {
    engine.players['p' + i] = {
      id: 'p' + i, name: 'P' + i, position: i + 1, characterId: 'dummy', alive: true, connected: true,
      cards: [], statuses: {}, statusAmt: {}, seen: {}, inventory: [],
    };
  }
  engine.setGameMode('ffa');
  match.world = 'fodlan';
  Math.random = () => random;
  engine.startMatch();
  Math.random = realRandom;
  engine.clearPhaseTimer();
  match.gameState = 'PLAYING'; match.actorId = null; match.action = null;
  park();
}
const P = (i) => match.players['p' + i];
const st = () => match.fodlan.s.fd1;
function place(p, x, y) { p.pos = { x, y }; }
function actor(p) { match.gameState = 'ACTION'; match.actorId = p.id; match.action = { locked: false, moved: false, canto: false, from: { ...p.pos } }; p.didAttackRound = false; }
const hud = (p) => Fodlan.hudActions(p);
const btn = (p, key) => hud(p).find((a) => a.key === key) || null;
// ไล่ทุกคนไปมุมไกลจากแม่น้ำ
function park() { const spots = [[1, 13], [12, 13], [6, 13], [11, 11]]; Object.values(match.players).forEach((p, i) => place(p, ...spots[i % spots.length])); }
const reachKeys = (p, mov = 99) => new Set(Board.reachable(action.boardMap(), { id: p.id, x: p.pos.x, y: p.pos.y }, mov, action.boardUnits().filter((u) => u.id !== p.id)).keys());
const total = (p) => p.hp + (p.armor || 0);

test.beforeEach(() => { timers.startPhaseTimer = (secs) => { match.timeLeft = Math.ceil(secs); }; });
test.afterEach(() => { Math.random = realRandom; timers.startPhaseTimer = realStart; engine.clearPhaseTimer(); });
test.after(() => {
  match.world = 'earth'; match.fodlan = null; engine.setGameMode('ffa');
  for (const id of Object.keys(engine.players)) delete engine.players[id];
});

test('ผัง: แม่น้ำกว้าง 2–3 ช่องพาดจากขอบซ้ายถึงขวา แบ่งกระดาน · ท่าเรือ + คันโยก 2 ฝั่ง · ที่จอดเรืออยู่บนแม่น้ำทั้งลำ', () => {
  const m = Board.MAPS[AREA];
  assert.equal(m.cols, 14); assert.equal(m.rows, 14);
  const river = (x, y) => m.terrain[K(x, y)] === 'fd_river';
  for (let x = 0; x < 14; x++) {
    const rows = [];
    for (let y = 0; y < 14; y++) if (river(x, y)) rows.push(y);
    assert.ok(rows.length >= 2 && rows.length <= 4, `คอลัมน์ ${x} แม่น้ำ ${rows.length} ช่อง`);
  }
  for (const k of Object.keys(m.terrain)) assert.ok(['fd_river', 'fd_riverpine', 'fd_riveroak', 'fd_lever'].includes(m.terrain[k]));
  assert.ok(Object.values(m.special).filter((k) => k === 'forest').length >= 10, 'พุ่มป่าทึบให้ซ่อน');
  assert.ok(Board.TERRAIN_INFO.fd_river.iceBridge);
  // ฝั่งเหนือไปฝั่งใต้ไม่ได้ (บนผังเปล่า — เรืออยู่ในชั้น layer)
  const north = m.spawns.filter((s) => s.y < 5), south = m.spawns.filter((s) => s.y > 7);
  assert.ok(north.length >= 3 && south.length >= 3, 'จุดเกิดทั้งสองฝั่ง');
  const reach = new Set(Board.reachable(m, { id: 'w', x: north[0].x, y: north[0].y }, 99, []).keys());
  for (const s of south) assert.ok(!reach.has(K(s.x, s.y)), `เดินจากเหนือถึง ${K(s.x, s.y)} ไม่ได้`);
  for (const s of north) assert.ok(reach.has(K(s.x, s.y)));
  // ท่าเรือ: ช่องท่าติดเรือ · คันโยกติดท่า · ที่จอดอยู่บนแม่น้ำทั้งลำ
  for (const d of S1.DOCKS) {
    for (const c of S1.boatCells(d.anchor)) assert.ok(river(c.x, c.y), `ที่จอด ${d.side} ${K(c.x, c.y)}`);
    const cells = S1.boatCells(d.anchor);
    for (const t of d.tiles) {
      assert.ok(!m.terrain[K(t.x, t.y)], 'ท่าเรือเดินได้');
      assert.ok(cells.some((c) => Board.dist(c, t) === 1), 'ท่าติดเรือ');
    }
    assert.equal(m.terrain[K(d.lever.x, d.lever.y)], 'fd_lever');
    assert.ok(d.tiles.some((t) => Board.dist(t, d.lever) === 1), 'คันโยกติดท่า');
  }
  assert.equal(MAP1.DOCKS.length, 2);
});

test('แม่น้ำขวางทาง · ช่องเรือเดินได้ (ขึ้นเรือจากท่า) · เรือจอดท่าใต้แล้วฝั่งเหนือเดินถึงเรือไม่ได้', () => {
  setup(3);
  assert.deepEqual(st().boat, SOUTH);
  const map = action.boardMap();
  for (const c of S1.boatCells(SOUTH)) {
    assert.ok(!Board.isObstacle(map, c.x, c.y), `ช่องเรือ ${K(c.x, c.y)} เดินได้`);
    assert.equal(Board.specialAt(map, c.x, c.y), 'fd_boat');
  }
  for (const c of S1.boatCells(NORTH)) assert.ok(Board.isObstacle(map, c.x, c.y), 'ท่าเหนือไม่มีเรือ = แม่น้ำ');
  // คนฝั่งใต้เดินขึ้นเรือได้ ข้ามไปฝั่งเหนือไม่ได้
  place(P(0), 4, 9);
  const r = reachKeys(P(0));
  assert.ok(r.has('4,7') && r.has('3,6'), 'ขึ้นเรือได้');
  for (const k of S1.RIVER) if (!S1.boatCells(SOUTH).some((c) => K(c.x, c.y) === k)) assert.ok(!r.has(k), `แม่น้ำ ${k}`);
  assert.ok(!r.has('6,3') && !r.has('10,4'), 'ฝั่งเหนือ');
  // คนฝั่งเหนือไปไม่ถึงเรือ
  place(P(1), 7, 4);
  const rn = reachKeys(P(1));
  assert.ok(!S1.boatCells(SOUTH).some((c) => rn.has(K(c.x, c.y))));
  // ยืนบนเรือ = ปุ่มขับเรือ (ยังไม่ใช่ตาตัวเอง = กดไม่ได้)
  place(P(0), 4, 7);
  const b = btn(P(0), 'fd:boat');
  assert.ok(b && b.icon === '🛶' && b.name === 'ขับเรือ' && b.disabled);
  actor(P(0));
  assert.equal(btn(P(0), 'fd:boat').disabled, false);
});

test('ขับเรือ: ไปที่ไหนก็ได้ตามแม่น้ำ · คน/ศพ/น้ำแข็งบนเรือไปด้วย · ใช้การเดินของตา (ล็อก) แต่ยังตีได้', () => {
  setup(3);
  place(P(0), 4, 7); place(P(1), 3, 6);
  // ศพ (ระบบคู่/ศพค้าง) บนเรือ + ธารน้ำแข็งบนพื้นเรือ
  P(2).alive = false; P(2).pos = null; P(2).corpse = { x: 5, y: 6 };
  Ice.layIce(5, 7, null);
  actor(P(0));
  const b = btn(P(0), 'fd:boat');
  assert.ok(b.tiles.length >= 8, 'ตำแหน่งเรือตามแม่น้ำ');
  assert.ok(b.tiles.some((t) => t.x === S1.pickOf(NORTH).x && t.y === S1.pickOf(NORTH).y), 'ไปท่าเหนือได้');
  assert.ok(b.tiles.some((t) => t.x === S1.pickOf({ x: 0, y: 4 }).x && t.y === S1.pickOf({ x: 0, y: 4 }).y), 'สุดแม่น้ำฝั่งซ้าย');
  assert.equal(Fodlan.charAction('p0', 'fd:boat', { x: 0, y: 0 }), false, 'ช่องที่ไม่ใช่ตำแหน่งเรือ');
  assert.equal(Fodlan.charAction('p0', 'fd:boat', S1.pickOf(NORTH)), true);
  assert.deepEqual(st().boat, NORTH);
  assert.deepEqual(P(0).pos, { x: 10, y: 6 });
  assert.deepEqual(P(1).pos, { x: 9, y: 5 });
  assert.deepEqual({ x: P(2).corpse.x, y: P(2).corpse.y }, { x: 11, y: 5 });
  assert.ok(match.board.ice['11,6'] && !match.board.ice['5,7'], 'น้ำแข็งบนเรือไปด้วย');
  assert.equal(match.action.locked, true, 'เดินต่อไม่ได้');
  assert.equal(match.gameState, 'ACTION', 'ยังตี/ใช้สกิลได้');
  const map = action.boardMap();
  assert.ok(Board.isObstacle(map, 4, 7), 'ที่เดิมกลายเป็นแม่น้ำ');
  assert.equal(Board.specialAt(map, 10, 6), 'fd_boat');
  assert.equal(Board.specialAt(map, 11, 6), 'ice');
  assert.deepEqual(Fodlan.publicInfo().board.boat, { x: 9, y: 5, w: 3, h: 2 });
  assert.equal(Fodlan.publicInfo().board.fx.at(-1).kind, 'boat');
  // ล็อกแล้วขับซ้ำไม่ได้
  assert.equal(btn(P(0), 'fd:boat').disabled, true);
  assert.equal(Fodlan.charAction('p0', 'fd:boat', S1.pickOf(SOUTH)), false);
  // ลงเรือฝั่งเหนือได้ (ตาหน้า)
  actor(P(1));
  assert.ok(reachKeys(P(1)).has('10,4'));
});

test('ขับเรือ: สะพานน้ำแข็งขวางทางเรือ · คนยืนคร่อมขอบเรือ = ขับไม่ได้', () => {
  setup(3);
  place(P(0), 4, 7);
  for (const y of [6, 7, 8, 9]) assert.ok(Ice.layIce(7, y, null), `วางน้ำแข็งบนแม่น้ำ (7, ${y})`);
  actor(P(0));
  const tiles = btn(P(0), 'fd:boat').tiles;
  assert.ok(tiles.length > 0);
  assert.ok(!tiles.some((t) => t.x >= 7), 'ผ่านสะพานไปฝั่งตะวันออกไม่ได้');
  // ตัวใหญ่คร่อมเรือกับท่า
  P(1).boardSize = 2; place(P(1), 4, 7); place(P(0), 3, 6);
  assert.equal(btn(P(0), 'fd:boat').disabled, true);
  P(1).boardSize = 0;
});

test('สะพานน้ำแข็ง: ธารน้ำแข็งวางบนแม่น้ำได้ (สิ่งกีดขวางอื่นไม่ได้) → เดินข้ามได้ · ละลายตอนยืนอยู่ = ตกน้ำขึ้นฝั่ง เสีย 1', () => {
  setup(3);
  assert.equal(Ice.canLay(0, 5), true, 'แม่น้ำ');
  assert.equal(Ice.canLay(0, 0), false, 'ต้นสน');
  assert.equal(Ice.canLay(8, 4), false, 'คันโยก');
  for (const y of [4, 5, 6]) Ice.layIce(2, y, null);
  const map = action.boardMap();
  assert.ok(!Board.isObstacle(map, 2, 5));
  assert.equal(Board.specialAt(map, 2, 5), 'ice');
  place(P(0), 2, 2);
  assert.ok(reachKeys(P(0)).has('2,6'), 'ไถลข้ามสะพาน (ไถลแล้วจบการเดิน)');
  place(P(0), 2, 6);
  assert.ok(reachKeys(P(0)).has('2,9'), 'ตาหน้าเดินขึ้นฝั่งใต้');
  // น้ำแข็งหมดเวลาใต้เท้า
  place(P(0), 2, 5);
  const before = total(P(0));
  for (const r of Object.values(match.board.ice)) r.left = 1;
  Ice.onEndTurn();
  Fodlan.onEndTurn();
  assert.ok(Board.isObstacle(action.boardMap(), 2, 5));
  assert.ok(!S1.RIVER.has(K(P(0).pos.x, P(0).pos.y)), 'ขึ้นฝั่ง');
  assert.equal(total(P(0)), before - S1.FALL_DMG);
});

test('คันโยก: ยืนติดคันโยก + เรือว่าง → ดึงเรือกลับท่าฝั่งนั้น · ใช้การตีของตา · มีคนบนเรือ = ดึงไม่ได้', () => {
  setup(3);
  S1.moveBoat(Fodlan.makeCtx(), st(), NORTH);
  place(P(0), 1, 8); // ติดคันโยกฝั่งใต้ (2, 8)
  actor(P(0));
  const b = btn(P(0), 'fd:lever');
  assert.ok(b && b.icon === '🔗' && b.name === 'คันโยก' && !b.disabled);
  // มีคนบนเรือ
  place(P(1), 10, 6);
  assert.equal(btn(P(0), 'fd:lever').disabled, true);
  assert.equal(Fodlan.charAction('p0', 'fd:lever'), false);
  park(); place(P(0), 1, 8);
  assert.equal(Fodlan.charAction('p0', 'fd:lever'), true);
  assert.deepEqual(st().boat, SOUTH);
  assert.equal(P(0).didAttackRound, true);
  assert.equal(match.gameState, 'ATTACKING', 'จบตาหลังฉาก');
  assert.equal(Fodlan.publicInfo().board.fx.at(-1).kind, 'lever');
  // เรืออยู่ท่านี้แล้ว = กดไม่ได้
  actor(P(0));
  assert.equal(btn(P(0), 'fd:lever').disabled, true);
});

test('ตกปลา: ติดแม่น้ำ/บนเรือ · ใช้การตีของตา · สุ่มเท่ากัน เลือด +1 / แต้มสกิล +1 / เหรียญ +2 / ไม่ได้อะไร', () => {
  setup(3);
  place(P(0), 8, 9); // ติดแม่น้ำ (8, 8)
  assert.ok(btn(P(0), 'fd:fish'));
  place(P(0), 1, 12);
  assert.equal(btn(P(0), 'fd:fish'), null, 'ไกลแม่น้ำ');
  place(P(0), 4, 6); // กลางเรือ
  assert.ok(btn(P(0), 'fd:fish'), 'บนเรือ');
  const want = { hp: 0.05, sp: 0.3, gold: 0.6, none: 0.9 };
  for (const [reward, r] of Object.entries(want)) {
    place(P(0), 8, 9);
    actor(P(0));
    P(0).hp = 3; P(0).skillPoints = 0; P(0).gold = 0;
    const seq = [0, r];
    let n = 0;
    Math.random = () => seq[n++ % seq.length];
    const got = Fodlan.charAction('p0', 'fd:fish');
    Math.random = realRandom;
    assert.equal(got, true);
    const e = Fodlan.publicInfo().board.fx.at(-1);
    assert.equal(e.kind, 'fish');
    assert.equal(e.reward, reward);
    assert.ok(S1.RIVER.has(K(e.x, e.y)), 'โยนลงแม่น้ำ');
    assert.equal(P(0).hp, reward === 'hp' ? 4 : 3);
    assert.equal(P(0).skillPoints, reward === 'sp' ? 1 : 0);
    assert.equal(P(0).gold, reward === 'gold' ? S1.FISH_GOLD : 0);
    assert.equal(P(0).didAttackRound, true);
    assert.equal(match.gameState, 'ATTACKING');
  }
  // ตีไปแล้ว = กดไม่ได้
  actor(P(0)); P(0).didAttackRound = true;
  assert.equal(btn(P(0), 'fd:fish').disabled, true);
  assert.equal(Fodlan.charAction('p0', 'fd:fish'), false);
});

test('ฝนฟ้าผ่า: เดิน −1 · เตือนตอนเข้าด่าน (2 + ครึ่งของคนบนกระดาน) → ต้นเทิร์นถัดไปผ่าลง เสียหาย 2 แล้วเตือนชุดใหม่', () => {
  setup(4, 0.1);
  assert.equal(Fodlan.weatherNow().kind, 'storm');
  assert.deepEqual(st().boat, NORTH, 'สุ่มต่ำ = ท่าเหนือ');
  const p = P(0);
  const stormMov = action.movOf(p);
  match.fodlan.weather.left = 0;
  assert.equal(action.movOf(p), stormMov + 1, 'ไม่มีพายุ = เดินปกติ');
  match.fodlan.weather.left = 3;
  // เตือนชุดแรก
  const warn = Fodlan.publicInfo().board.warn;
  assert.equal(warn.length, S1.LIGHTNING_BASE + Math.floor(4 / 2));
  const turnIn = match.roundNumber; // เทิร์นที่เข้าด่าน (startMatch แจกไพ่เทิร์นแรกไปแล้ว — preRound ของเทิร์นนี้ไม่ผ่า)
  assert.equal(st().warnFor, turnIn + 1);
  for (const w of warn) assert.ok(!Board.isObstacle(action.boardMap(), w.x, w.y), 'เตือนบนพื้นที่ยืนได้');
  // คนยืนบนช่องเตือน
  place(p, warn[0].x, warn[0].y);
  const others = Object.values(match.players).filter((o) => o !== p);
  others.forEach((o, i) => place(o, ...[[1, 13], [12, 13], [6, 13]][i]));
  for (const o of others) assert.ok(!warn.some((w) => w.x === o.pos.x && w.y === o.pos.y));
  const before = total(p), others0 = others.map(total);
  match.roundNumber = turnIn; // ต้นเทิร์นถัดไป
  assert.equal(Fodlan.preRound(() => {}), true, 'พักเกมให้ฉากฟ้าผ่า');
  assert.equal(match.gameState, 'CUTSCENE');
  assert.equal(total(p), before - S1.LIGHTNING_DMG);
  assert.deepEqual(others.map(total), others0);
  const fx = Fodlan.publicInfo().board.fx.filter((e) => e.kind === 'lightning');
  assert.equal(fx.length, warn.length);
  // พายุยังอยู่ = เตือนชุดใหม่สำหรับเทิร์นหน้า
  assert.ok(Fodlan.publicInfo().board.warn.length > 0);
  assert.equal(st().warnFor, turnIn + 2);
  // พายุสงบ: ชุดสุดท้ายยังผ่าลง แต่ไม่เตือนต่อ
  match.fodlan.weather.left = 0;
  match.roundNumber = turnIn + 1;
  assert.equal(Fodlan.preRound(() => {}), true);
  assert.equal(Fodlan.publicInfo().board.warn.length, 0);
});
