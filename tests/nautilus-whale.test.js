// โหมด Nautilus ขั้น 2: ทาลัสซา (server/fodlan/thalassa.js · ต่อเข้า engine ที่ server/fodlan.js → server/fodlan/nautilus.js · GRID_PLAN §8.9)
//  จังหวะ 10–12 โผล่ · 13–15 พัก · 16 กลับมา · เตือนแล้วยิงต้นเทิร์นถัดไป · หลบได้ · ลำตัวเป็นสิ่งกีดขวาง + เบียดคนออก
//  ตีได้ผ่านทางตีปกติ (fd:whale:x,y) · ตาย = ไม่กลับมา + ผู้ฆ่าได้หัวใจของท้องทะเล · ปิดในโหวต = ไม่มีปลาวาฬเลย
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const match = require('../server/match.js');
const Board = require('../server/board.js');
const Fodlan = require('../server/fodlan.js');
const timers = require('../server/timers.js');
const action = require('../server/phases/action.js');
const Th = require('../server/fodlan/thalassa.js');
const O2 = require('../server/fodlan/nautilusO2.js');

const K = Board.key;
const realRandom = Math.random;
const realStart = timers.startPhaseTimer;
function fakeTimers() { timers.startPhaseTimer = (secs) => { match.timeLeft = Math.ceil(secs); }; }

function setup(n = 3, { whale = true } = {}) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  for (let i = 0; i < n; i++) {
    engine.players['p' + i] = {
      id: 'p' + i, name: 'P' + i, position: i + 1, characterId: 'dummy', alive: true, connected: true,
      cards: [], statuses: {}, statusAmt: {}, seen: {}, inventory: [],
    };
  }
  engine.setGameMode('ffa');
  match.world = 'nautilus';
  match.nautilusWhale = whale;
  Math.random = () => 0.99;
  engine.startMatch();
  Math.random = realRandom;
  engine.clearPhaseTimer();
}
const P = (i) => engine.players['p' + i];
const W = () => match.fodlan.whale;
const ctx = () => Fodlan.makeCtx();
const fxOf = (kind) => (match.fodlan.s.fx || []).filter((e) => e.kind === kind);
const total = (p) => p.hp + (p.armor || 0);
function preRoundOf(turn) {
  match.roundNumber = turn - 1;
  match.gameState = 'PLAYING';
  return Fodlan.preRound(() => {});
}
function act(i) {
  match.gameState = 'ACTION';
  match.actorId = 'p' + i;
  match.action = { from: { ...P(i).pos }, moved: false, locked: false };
  P(i).didAttackRound = false;
}
// ปลาวาฬขึ้นกระดานตรงๆ ที่ระยะ s (ไม่มีท่าค้าง)
function surface(s = 30) {
  Object.assign(W(), { on: true, present: true, left: 3, s, pending: [], calm: false });
  match.fodlan.s.ver = (match.fodlan.s.ver || 0) + 1;
  return Th.bodyNow(ctx());
}
// ช่องว่างติดลำตัว (ไม่อยู่บนลำตัว ไม่ใช่สิ่งกีดขวาง) + ช่องลำตัวที่ติดกัน
function besideBody(body) {
  const map = action.boardMap(), set = new Set(body.map((c) => K(c.x, c.y)));
  for (const c of body) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const x = c.x + dx, y = c.y + dy;
    if (set.has(K(x, y)) || Board.isObstacle(map, x, y, action.boardBlocked())) continue;
    return { at: { x, y }, body: c };
  }
  return null;
}
function invuln() { for (const p of Object.values(engine.players)) if (p.alive) { p.hp = 99; p.maxHp = 99; } }

test.beforeEach(() => { fakeTimers(); });
test.afterEach(() => { Math.random = realRandom; timers.startPhaseTimer = realStart; engine.clearPhaseTimer(); });
test.after(() => {
  match.world = 'earth'; match.fodlan = null; match.nautilusWhale = null; engine.setGameMode('ffa');
  for (const id of Object.keys(engine.players)) delete engine.players[id];
});

test('เริ่มแมตช์: ทาลัสซาเลือด 30 + 5 ต่อผู้เล่นจริง · ยังไม่โผล่ (เทิร์น 10) · board.whale ส่งให้ client · ช่องลำตัวมีชื่อใน TERRAIN_INFO', () => {
  setup(3);
  assert.equal(W().hpMax, 45);
  assert.equal(W().hp, 45);
  assert.equal(W().on, false);
  assert.equal(W().nextAt, 10);
  const b = Fodlan.publicInfo().board;
  assert.equal(b.whale.enabled, true);
  assert.equal(b.whale.on, false);
  assert.equal(b.whale.hp, 45);
  assert.equal(b.layer, 1);
  assert.ok(Board.TERRAIN_INFO.fd_nt_whale && Board.TERRAIN_INFO.fd_nt_whale.name === 'ทาลัสซา');
  assert.ok(Board.TERRAIN_INFO.fd_nt_ship && Board.TERRAIN_INFO.fd_nt_ship.name === 'นอติลุส');
});

test('จังหวะ: โผล่ 10–12 · พัก 13–15 · กลับมา 16 · ธง present ตามจริง (เพลงปลาวาฬ)', () => {
  setup(3);
  const on = [];
  for (let t = 1; t <= 19; t++) {
    invuln();
    preRoundOf(t);
    if (W().on) on.push(t);
    assert.equal(!!W().present, !!W().on, `เทิร์น ${t}: present ตรงกับ on`);
    assert.equal(!!Fodlan.publicInfo().board.whale.on, !!W().on);
  }
  assert.deepEqual(on, [10, 11, 12, 16, 17, 18]);
  assert.equal(fxOf('whale_appear').length >= 1, true);
  assert.ok(fxOf('whale_leave').length >= 1);
});

test('โผล่ = พักเกมเล่นฉากข่มขวัญ 10 วิ · ประกาศท่า (warn ใน board.warn) แล้วยิงต้นเทิร์นถัดไป', () => {
  setup(3);
  invuln();
  match.timeLeft = 0;
  assert.equal(preRoundOf(10), true);
  assert.equal(match.gameState, 'CUTSCENE');
  assert.equal(match.timeLeft, 10);
  assert.ok(fxOf('whale_flyby').length && fxOf('whale_appear').length);
  // ท่าที่ประกาศไว้ (ไม่นับเพลงวาฬ) อยู่ใน warn ของกระดาน
  W().pending = [{ kind: 'zap', at: { ...P(0).pos }, tiles: [{ ...P(0).pos }] }];
  const warn = Fodlan.publicInfo().board.warn;
  assert.ok(warn.some((w) => w.kind === 'whale_zap' && w.x === P(0).pos.x && w.y === P(0).pos.y));
  assert.equal(Fodlan.publicInfo().board.whale.pending[0].kind, 'zap');
  // ต้นเทิร์น 11: ยิง (ประจุเรืองแสง 2 ดาเมจ เกราะก่อน)
  for (const p of Object.values(engine.players)) p.pos = null;
  P(0).pos = { x: 3, y: 5 }; P(1).pos = { x: 18, y: 4 }; P(2).pos = { x: 18, y: 9 };
  W().pending = [{ kind: 'zap', at: { x: 3, y: 5 }, tiles: [{ x: 3, y: 5 }] }];
  P(0).hp = 10; P(0).armor = 1;
  Math.random = () => 0.99;
  preRoundOf(11);
  assert.equal(P(0).armor, 0, 'เกราะรับก่อน');
  assert.equal(P(0).hp, 9);
  assert.ok(fxOf('whale_zap').some((e) => e.hits.includes('p0')));
});

test('ทุกท่าหลบได้: หลบหลีก 100% = ไม่โดน (whale_dodge)', () => {
  setup(3);
  surface(50);
  for (const p of Object.values(engine.players)) p.pos = null;
  P(0).pos = { x: 3, y: 5 }; P(1).pos = { x: 18, y: 4 }; P(2).pos = { x: 18, y: 9 };
  P(0).statuses.evade = 1; P(0).statusAmt = { evade: 100 };
  const before = total(P(0));
  W().pending = [{ kind: 'zap', at: { x: 3, y: 5 }, tiles: [{ x: 3, y: 5 }] }];
  match.fodlan.s.preRoundDone = null;
  preRoundOf(11);
  assert.equal(total(P(0)), before);
  assert.ok(fxOf('whale_dodge').some((e) => e.id === 'p0'));
});

test('ลำตัว = สิ่งกีดขวาง fd_nt_whale · ยืนทับไม่ได้ · คนที่อยู่ใต้ลำตัวถูกเบียดออกข้าง', () => {
  setup(3);
  const body = surface(50);
  assert.ok(body.length >= 6, 'ลำตัว 5×2 (บางส่วนอาจพ้นขอบ)');
  const map = action.boardMap();
  const free = body.filter((c) => !Board.MAPS[match.board.area].terrain[K(c.x, c.y)]);
  assert.ok(free.length > 0);
  for (const c of free) {
    assert.equal(map.terrain[K(c.x, c.y)], 'fd_nt_whale');
    assert.ok(Board.isObstacle(map, c.x, c.y));
  }
  // เดินเข้าช่องลำตัวไม่ได้
  const spot = besideBody(body);
  for (const p of Object.values(engine.players)) p.pos = null;
  P(0).pos = { ...spot.at }; P(1).pos = { x: 0, y: 15 }; P(2).pos = { x: 19, y: 15 };
  act(0);
  const reach = action.reachableOf ? action.reachableOf(P(0)) : null;
  if (reach) assert.ok(!reach.some((t) => t.x === spot.body.x && t.y === spot.body.y));
  assert.equal(action.moveTo('p0', spot.body.x, spot.body.y), false);
  // ยืนใต้ลำตัว (ตอนโผล่/ว่าย/เปลี่ยนชั้น) → ถูกเบียดออก
  const under = free[0];
  P(0).pos = { ...under };
  Fodlan.makeCtx(); // ไม่มีผลข้างเคียง
  require('../server/fodlan/nautilus.js').enter(ctx());
  const set = new Set(body.map((c) => K(c.x, c.y)));
  assert.ok(!set.has(K(P(0).pos.x, P(0).pos.y)), 'ไม่อยู่บนลำตัวแล้ว');
  assert.ok(fxOf('whale_shove').some((e) => e.id === 'p0'));
});

test('ตีทาลัสซาผ่านทางตีปกติ (attackTarget fd:whale:x,y) · เลือดลด · ตาย = หัวใจของท้องทะเล (เสริมพลัง +3 · 3 เทิร์น) · ไม่กลับมาอีก', () => {
  setup(3);
  const body = surface(50);
  const spot = besideBody(body);
  for (const p of Object.values(engine.players)) p.pos = null;
  P(0).pos = { ...spot.at }; P(1).pos = { x: 0, y: 15 }; P(2).pos = { x: 19, y: 15 };
  const id = `fd:whale:${spot.body.x},${spot.body.y}`;
  assert.ok(Fodlan.objects().some((o) => o.id === id && o.strike && o.kind === 'whale'));
  act(0);
  const hp0 = W().hp;
  assert.equal(action.attackTarget('p0', id), true);
  assert.ok(W().hp < hp0, 'เลือดปลาวาฬลด');
  assert.ok(fxOf('whale_hit').some((e) => e.by === 'p0'));
  // ฆ่า
  engine.clearPhaseTimer();
  act(0);
  W().hp = 1;
  assert.equal(action.attackTarget('p0', id), true);
  assert.equal(W().dead, true);
  assert.equal(W().on, false);
  assert.equal(W().present, false);
  assert.equal(W().killer, 'p0');
  assert.equal(P(0).statuses.might, 3);
  assert.equal(P(0).statusAmt.might, 3);
  assert.ok(fxOf('whale_death').some((e) => e.by === 'p0'));
  assert.equal(Fodlan.objects().filter((o) => o.kind === 'whale').length, 0);
  assert.ok(!Object.values(action.boardMap().terrain).includes('fd_nt_whale'), 'ลำตัวหายจากแผนที่');
  // ไม่กลับมาอีกทั้งเกม
  for (let t = 13; t <= 40; t++) { invuln(); preRoundOf(t); assert.equal(W().on, false, `เทิร์น ${t}`); }
  assert.equal(Fodlan.publicInfo().board.whale.dead, true);
});

test('ท่าทาลัสซา: วังน้ำวน ออกซิเจน −1 · กลืนลงท้อง ออกซิเจนหายครึ่งถัง + พ่นออก + สตั้น', () => {
  setup(3);
  surface(50);
  for (const p of Object.values(engine.players)) p.pos = null;
  P(0).pos = { x: 3, y: 5 }; P(1).pos = { x: 15, y: 12 }; P(2).pos = { x: 18, y: 9 };
  invuln();
  Math.random = () => 0.99;
  W().pending = [{ kind: 'whirl', centers: [{ x: 3, y: 5 }], tiles: [{ x: 3, y: 5 }] }, { kind: 'swallow', at: { x: 15, y: 12 }, tiles: [{ x: 15, y: 12 }] }];
  preRoundOf(11);
  assert.equal(O2.get(ctx(), P(0)), 9);
  assert.equal(O2.get(ctx(), P(1)), 5);
  assert.ok(P(1).statuses.stun >= 1);
  assert.ok(fxOf('nt_o2_loss').some((e) => e.id === 'p1' && e.src === 'swallow'));
});

test('ปิดทาลัสซาในโหวต = ไม่มีปลาวาฬเลย (ไม่มีสถานะ · ไม่โผล่ · board.whale null · ไม่มีเพลง)', () => {
  setup(3, { whale: false });
  assert.equal(W(), null);
  for (let t = 1; t <= 20; t++) { invuln(); preRoundOf(t); }
  assert.equal(W(), null);
  const info = Fodlan.publicInfo();
  assert.equal(info.whaleEnabled, false);
  assert.equal(info.board.whale, null);
  assert.equal(Fodlan.objects().filter((o) => o.kind === 'whale').length, 0);
  assert.equal((match.fodlan.s.fx || []).filter((e) => String(e.kind).startsWith('whale_')).length, 0);
});

test('dev ECHO_DEV_START_ROUND=10: เริ่มชั้น 2 · ต้นเทิร์นแรก = ทาลัสซาโผล่', () => {
  process.env.ECHO_DEV_START_ROUND = '10';
  try { setup(2); } finally { delete process.env.ECHO_DEV_START_ROUND; }
  assert.equal(Fodlan.stageNow(), 8);
  assert.equal(match.roundNumber, 9);
  // เริ่มแมตช์แจกเทิร์นแรกทันที (JOURNEY_START_SECONDS=0) → ต้นเทิร์น 10 = ข่มขวัญ + โผล่ (พักเกมเล่นฉาก)
  assert.equal(match.gameState, 'CUTSCENE');
  assert.equal(W().on, true);
  assert.equal(W().appearSeq, 1);
  assert.ok(W().pending.length >= 1, 'ประกาศท่าแรกแล้ว');
  assert.ok(fxOf('whale_appear').length);
});

test('ความดุ (2026-11-19): ชั้น II–IV เตือน 2 ท่า/เทิร์น · ชั้น V 3 (เลือดต่ำกว่าครึ่ง 4) · ว่ายชนคนที่ขวาง · งับคนใกล้ลำตัว (หลบได้)', () => {
  setup(3);
  invuln();
  surface(20);
  // ว่ายชน: วางคนไว้บนช่องที่ลำตัวจะกวาดผ่าน (ยังไม่อยู่ใต้ลำตัวตอนนี้)
  const map = action.boardMap();
  const now = new Set(Th.bodyNow(ctx()).map((b) => K(b.x, b.y)));
  const ahead = Th.footprint(Th.posAt(W().s + 2, map.cols, map.rows), map.cols, map.rows);
  const spot = ahead.find((t) => !now.has(K(t.x, t.y)) && !Board.isObstacle(map, t.x, t.y, action.boardBlocked()));
  for (const p of Object.values(engine.players)) p.pos = null;
  P(0).pos = { ...spot }; P(1).pos = { x: 0, y: 15 }; P(2).pos = { x: 19, y: 15 };
  const hp0 = total(P(0));
  Math.random = () => 0.99; // ไม่หลบ
  preRoundOf(13);
  Math.random = realRandom;
  assert.ok(fxOf('whale_ram').some((e) => e.hits.includes('p0')), 'ว่ายชน');
  assert.ok(total(P(0)) < hp0, 'โดนดาเมจจากการว่ายชน');
  assert.ok(fxOf('whale_bite').length >= 1, 'งับคนใกล้ลำตัว');
  assert.ok(W().pending.length >= 2, 'ชั้น II–IV เตือน 2 ท่า');
  // ชั้น V: 3 ท่า · เลือดต่ำกว่าครึ่ง 4
  const c5 = ctx(); c5.stage = 11;
  W().hp = W().hpMax;
  assert.equal(Th.moveCount(c5, W()), 3);
  W().hp = Math.floor(W().hpMax / 2) - 1;
  assert.equal(Th.moveCount(c5, W()), 4);
});
