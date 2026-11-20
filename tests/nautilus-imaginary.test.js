// Nautilus ชั้น 6 ทะเลข้อมูลจินตภาพ (server/fodlan/ntImaginary.js · map12.js · stage12.js · GRID_PLAN §8.9 ชั้น 6 — ผู้ใช้ 2026-11-19)
//  ชั้น 5 อยู่ 3 เทิร์น (25–27) แล้วกลายร่างเป็นชั้น 6 (เทิร์น 28 → จนมีผู้ชนะ) · คุณสมบัติจินตภาพ α–ζ สุ่มต้นเทิร์น · ระลอกข้อมูลส่งข้ามสนาม
//  ไม่ใช้ออกซิเจน · ทาลัสซาถาวร (ไม่ดำหนี) + ฟื้นเป็นร่างข้อมูลเลือดเต็ม (เข้าชั้น / 3 เทิร์นหลังตาย) · ท่า 4 (5) ดาเมจ +2
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const match = require('../server/match.js');
const Fodlan = require('../server/fodlan.js');
const timers = require('../server/timers.js');
const Board = require('../server/board.js');
const I = require('../server/fodlan/ntImaginary.js');
const MAP = require('../server/fodlan/map12.js');
const O2 = require('../server/fodlan/nautilusO2.js');
const Th = require('../server/fodlan/thalassa.js');

const realRandom = Math.random;
const realStart = timers.startPhaseTimer;
function setup({ whale = false } = {}) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  for (let i = 0; i < 3; i++) engine.players['p' + i] = { id: 'p' + i, name: 'P' + i, position: i + 1, characterId: 'dummy', alive: true, connected: true, cards: [], statuses: {}, statusAmt: {}, seen: {}, inventory: [] };
  engine.setGameMode('ffa');
  match.world = 'nautilus';
  match.nautilusWhale = whale;
  Math.random = () => 0.99;
  engine.startMatch();
  engine.clearPhaseTimer();
  return Object.values(match.players);
}
// ไปชั้น 5 (เทิร์น 24 จบ → 25) แล้วนับเทิร์น
function toLayer5() {
  match.legStart = 1; match.fodlan.stage = 10; match.roundNumber = 24;
  assert.equal(Fodlan.maybeAdvance(() => {}, () => 0), true);
  assert.equal(Fodlan.stageNow(), 11);
  match.journeyScene = null;
}
function toLayer6() {
  toLayer5();
  match.roundNumber = 27;
  assert.equal(Fodlan.maybeAdvance(() => {}, () => 0), true);
  assert.equal(Fodlan.stageNow(), 12);
}
const ctx = () => Fodlan.makeCtx();
const st = () => Fodlan.stageState();

test.beforeEach(() => { timers.startPhaseTimer = () => {}; });
test.afterEach(() => { Math.random = realRandom; timers.startPhaseTimer = realStart; engine.clearPhaseTimer(); });
test.after(() => { match.world = 'earth'; match.fodlan = null; match.nautilusWhale = undefined; for (const id of Object.keys(engine.players)) delete engine.players[id]; });

test('ผัง: 20×16 ทุกแถวยาวเท่ากัน · area 51 · ท่าจอดว่าง · ระลอก 3 คู่เดินได้ · จุดเกิด 8', () => {
  for (const r of MAP.ROWS) assert.equal(r.length, 20);
  const map = Board.mapOf(Board.NAUTILUS_AREA + 5);
  assert.ok(map && map.cols === 20 && map.rows === 16);
  assert.ok(Board.isNautilusArea(51));
  assert.equal(map.spawns.length, 8);
  for (const [a, b] of MAP.RIPPLES) for (const [x, y] of [a, b]) assert.ok(!Board.isObstacle(map, x, y), `ระลอก ${x},${y} เดินได้`);
  for (let y = 0; y < 2; y++) for (let x = 7; x < 13; x++) assert.ok(!map.terrain[`${x},${y}`], 'ท่าจอดว่าง');
});

test('ชั้น 5 อยู่ 3 เทิร์นแล้วกลายร่างเป็นชั้น 6 · ชั้น 6 อยู่จนจบเกม', () => {
  setup();
  toLayer5();
  for (const r of [25, 26]) { match.roundNumber = r; assert.equal(Fodlan.maybeAdvance(() => {}, () => 0), false, `เทิร์น ${r} ยังอยู่ชั้น 5`); }
  match.roundNumber = 27;
  assert.equal(Fodlan.maybeAdvance(() => {}, () => 0), true);
  assert.equal(Fodlan.stageNow(), 12);
  assert.equal(match.board.area, 51);
  assert.equal(match.journeyScene.fromArea, 11);
  assert.equal(match.journeyScene.area, 12);
  assert.ok(match.lastLog.some((l) => l.includes('ทะเลข้อมูลจินตภาพ')));
  for (const r of [28, 30, 33, 34, 40, 60]) { match.roundNumber = r; assert.equal(Fodlan.maybeAdvance(() => {}, () => 0), false); }
  assert.equal(Fodlan.publicInfo().stage, 12);
});

test('ไม่ใช้ออกซิเจน: ไม่มีถัง ไม่ลด ไม่ขาดอากาศ · ไม่มีปุ่มเติม', () => {
  const P = setup();
  toLayer6();
  const p = P[0];
  assert.equal(O2.get(ctx(), p), null);
  const hp = p.hp;
  for (let i = 0; i < 6; i++) Fodlan.onEndTurn(() => 0.99);
  assert.equal(p.hp, hp);
  assert.equal((Fodlan.publicInfo().players || {}).o2, undefined);
  p.pos = { x: 6, y: 0 };
  match.gameState = 'ACTION'; match.actorId = p.id; match.action = { locked: false, from: { ...p.pos } }; p.didAttackRound = false;
  assert.ok(!Fodlan.hudActions(p).some((a) => a.key === 'fd:nt:refill'));
});

test('คุณสมบัติจินตภาพ: สุ่มต้นเทิร์นไม่ซ้ำเทิร์นก่อน · α ตี +1 · β เดิน +2 · γ −1 (ไม่ต่ำกว่า 1) · δ +1 · ε คริ +30', () => {
  const P = setup();
  toLayer6();
  const s = () => st().nt12;
  const seen = new Set();
  let prev = null;
  let seed = 7;
  Math.random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 30; i++) {
    match.roundNumber = 28 + i;
    Fodlan.preRound();
    assert.ok(I.ATTRS.includes(s().attr));
    assert.notEqual(s().attr, prev);
    prev = s().attr; seen.add(prev);
  }
  assert.equal(seen.size, 6);
  const p = P[0];
  s().attr = 'alpha'; assert.equal(Fodlan.atkBonus(p), 1); assert.equal(Fodlan.movMod(p), 0);
  s().attr = 'beta'; assert.equal(Fodlan.movMod(p), 2); assert.equal(Fodlan.atkBonus(p), 0);
  s().attr = 'gamma'; assert.equal(Fodlan.incomingDamage(p, 3, null, 'mixed'), 2); assert.equal(Fodlan.incomingDamage(p, 1, null, 'mixed'), 1);
  s().attr = 'delta'; assert.equal(Fodlan.incomingDamage(p, 3, null, 'mixed'), 4);
  s().attr = 'epsilon'; assert.equal(Fodlan.critPct(p), 30);
  assert.equal(Fodlan.publicInfo().board.imaginary.attr, 'epsilon');
  assert.equal(Fodlan.publicInfo().board.imaginary.sym, 'ε');
});

test('ระลอกข้อมูล: จบตาบนวง = ไปวงคู่ · วงคู่มีคน = ช่องว่างใกล้สุด · จบเทิร์นบนวง (ถูกผลัก) ก็ส่ง · ไม่ส่งซ้ำในเทิร์นเดียว', () => {
  const P = setup();
  toLayer6();
  const [[a, b]] = MAP.RIPPLES;
  for (const p of P) p.pos = null;
  P[0].pos = { x: a[0], y: a[1] };
  P[1].pos = { x: 10, y: 10 };
  Fodlan.onUnitEnd(P[0]);
  assert.deepEqual(P[0].pos, { x: b[0], y: b[1] });
  assert.ok(st().fx.some((e) => e.kind === 'nt_ripple' && e.id === 'p0'));
  // ไม่ส่งซ้ำในเทิร์นเดียวกัน
  Fodlan.onUnitEnd(P[0]);
  assert.deepEqual(P[0].pos, { x: b[0], y: b[1] });
  // เทิร์นใหม่: วงคู่มีคนยืน = ลงข้างๆ
  Fodlan.preRound();
  P[1].pos = { x: a[0], y: a[1] };
  Fodlan.onEndTurn(() => 0.99);
  assert.notDeepEqual(P[1].pos, { x: a[0], y: a[1] });
  assert.ok(Math.abs(P[1].pos.x - b[0]) + Math.abs(P[1].pos.y - b[1]) <= 2, 'ลงใกล้วงคู่');
});

test('ทาลัสซาชั้น 6: เข้าชั้น = ฟื้นเลือดเต็มแม้ตายไปแล้ว · โผล่ต้นเทิร์นแรก · ไม่ดำหนี · ท่า 4/5 · ตายแล้วกลับมาใน 3 เทิร์น', () => {
  setup({ whale: true });
  toLayer5();
  const w = match.fodlan.whale;
  w.dead = true; w.on = false; w.hp = 0;
  match.roundNumber = 27;
  assert.equal(Fodlan.maybeAdvance(() => {}, () => 0), true);
  assert.equal(w.dead, false);
  assert.equal(w.hp, w.hpMax);
  Math.random = () => 0.5;
  Fodlan.preRound(); // เทิร์น 28: โผล่
  assert.equal(w.on, true);
  assert.equal(Fodlan.publicInfo().board.whale.data, true);
  const c = ctx();
  assert.equal(Th.moveCount(c, w), st().nt12.attr === 'zeta' ? 5 : 4);
  for (let r = 28; r < 40; r++) { match.roundNumber = r; Fodlan.preRound(); assert.equal(w.on, true, `เทิร์น ${r + 1} ยังอยู่`); }
  // เลือดต่ำกว่าครึ่ง = 5 ท่า (ไม่นับ ζ)
  st().nt12.attr = 'alpha';
  w.hp = 1;
  assert.equal(Th.moveCount(ctx(), w), 5);
  // ฆ่า → ฟื้นใน 3 เทิร์น
  const killer = Object.values(match.players)[0];
  match.roundNumber = 40;
  Th.damageWhale(ctx(), killer, 5, { x: 0, y: 0 });
  assert.equal(w.dead, true);
  assert.equal(killer.statuses.might, 3);
  assert.equal(w.reviveAt, 44);
  match.roundNumber = 41; Fodlan.preRound(); assert.equal(w.dead, true);
  match.roundNumber = 43; Fodlan.preRound();
  assert.equal(w.dead, false);
  assert.equal(w.on, true);
  assert.equal(w.hp, w.hpMax);
});

// ---------- รอบ 2 (ผู้ใช้ "เอาทั้งหมด" 2026-11-19): หมากโกะ + ล้อมกิน · เขียนทับคุณสมบัติ · ท่าลบข้อมูล/คัดลอก ----------
const action = require('../server/phases/action.js');
function act(p) { match.gameState = 'ACTION'; match.actorId = p.id; match.action = { locked: false, from: { ...p.pos } }; p.didAttackRound = false; }
const keys = (p) => Fodlan.hudActions(p).map((a) => a.key);

test('หมากข้อมูล: วางระยะ 2 = สิ่งกีดขวาง 2 เทิร์น · คนละ 2 เม็ด · ล้อมครบ 4 ทิศ = ล้อมกิน 3 + สตั้น', () => {
  const P = setup();
  toLayer6();
  for (const p of P) { p.pos = null; p.hp = 20; p.armor = 0; p.statuses = {}; p.statusAmt = {}; }
  P[0].pos = { x: 10, y: 13 }; P[1].pos = { x: 10, y: 10 }; P[2].pos = { x: 10, y: 9 };
  const s = st().nt12;
  s.stones.push({ x: 9, y: 10, by: 'p0', until: 99 }, { x: 11, y: 10, by: 'p2', until: 99 });
  Fodlan.makeCtx().bump();
  match.roundNumber = 28; // เทิร์น 28
  act(P[0]);
  const b = Fodlan.hudActions(P[0]).find((a) => a.key === 'fd:im:stone');
  assert.ok(b && b.tiles.some((t) => t.x === 10 && t.y === 11));
  Math.random = () => 0.99;
  assert.equal(Fodlan.charAction('p0', 'fd:im:stone', { x: 10, y: 11 }), true);
  assert.equal(action.boardMap().terrain['10,11'], 'fd_nt_stone');
  assert.equal(P[1].hp, 17, 'ล้อมกิน 3');
  assert.equal(P[1].statuses.stun, 1);
  assert.ok(st().fx.some((e) => e.kind === 'nt_capture' && e.id === 'p1'));
  assert.equal(P[0].didAttackRound, true, 'ใช้แทนการตี');
  // เม็ดที่ 3 ไม่ได้ (มี 2 แล้ว)
  act(P[0]);
  assert.equal(Fodlan.hudActions(P[0]).find((a) => a.key === 'fd:im:stone').disabled, true);
  // หมดอายุ: วางเทิร์น 28 อยู่ถึงจบเทิร์น 29 (ต้นเทิร์น 29 ยังอยู่ · ต้นเทิร์น 30 หาย)
  s.stones = s.stones.filter((t) => t.until !== 99);
  match.roundNumber = 28; Fodlan.preRound();
  assert.equal(action.boardMap().terrain['10,11'], 'fd_nt_stone');
  match.roundNumber = 29; Fodlan.preRound();
  assert.equal(action.boardMap().terrain['10,11'], undefined, 'หมากหาย');
});

test('ล้อมกินตอนจบตา: เดินไปปิดช่องสุดท้ายแล้วจบตา = กิน · เทิร์นละครั้งต่อคน', () => {
  const P = setup();
  toLayer6();
  for (const p of P) { p.pos = null; p.hp = 20; p.armor = 0; p.statuses = {}; p.statusAmt = {}; }
  const s = st().nt12;
  P[1].pos = { x: 10, y: 10 };
  s.stones.push({ x: 9, y: 10, by: 'p2', until: 99 }, { x: 11, y: 10, by: 'p2', until: 99 }, { x: 10, y: 9, by: 'p2', until: 99 });
  Fodlan.makeCtx().bump();
  P[0].pos = { x: 10, y: 11 };
  Math.random = () => 0.99;
  Fodlan.onUnitEnd(P[0]);
  assert.equal(P[1].hp, 17);
  Fodlan.onUnitEnd(P[0]);
  assert.equal(P[1].hp, 17, 'ไม่กินซ้ำในเทิร์นเดียว');
});

test('เขียนทับคุณสมบัติ: ติดเรือ + เหรียญ 3 → เลือก 5 ตัว (ไม่ซ้ำเทิร์นนี้) · ปุ่มเรือซ่อน · เทิร์นหน้าเป็นตามที่เลือก · พัก 3', () => {
  const P = setup();
  toLayer6();
  match.roundNumber = 28; Fodlan.preRound();
  const s = st().nt12;
  s.attr = 'alpha';
  for (const p of P) p.pos = null;
  P[0].pos = { x: 6, y: 0 }; P[0].gold = 5;
  act(P[0]);
  assert.ok(keys(P[0]).includes('fd:im:rw'));
  assert.equal(Fodlan.charAction('p0', 'fd:im:rw', null), true);
  const k = keys(P[0]);
  assert.deepEqual(k, ['fd:im:rw:beta', 'fd:im:rw:gamma', 'fd:im:rw:delta', 'fd:im:rw:epsilon', 'fd:im:rw:zeta', 'fd:im:rwx']);
  assert.ok(Fodlan.hudActions(P[0]).every((a) => a.key === 'fd:im:rwx' || a.desc), 'ตัวเลือกมีคำอธิบายตอนชี้');
  assert.equal(Fodlan.charAction('p0', 'fd:im:rw:alpha', null), false, 'ซ้ำเทิร์นนี้ไม่ได้');
  assert.equal(Fodlan.charAction('p0', 'fd:im:rw:delta', null), true);
  assert.equal(P[0].gold, 2);
  assert.equal(P[0].didAttackRound, true);
  assert.equal(Fodlan.publicInfo().board.imaginary.next, 'δ');
  match.roundNumber = 29; Fodlan.preRound();
  assert.equal(s.attr, 'delta');
  assert.ok(st().fx.some((e) => e.kind === 'nt_attr' && e.by === 'p0'));
  P[0].gold = 9; act(P[0]);
  const rw = Fodlan.hudActions(P[0]).find((a) => a.key === 'fd:im:rw');
  assert.equal(rw.disabled, true); assert.ok(rw.cd > 0);
  // ไม่ติดเรือ = ไม่มีปุ่ม
  P[0].pos = { x: 10, y: 10 }; act(P[0]);
  assert.ok(!keys(P[0]).includes('fd:im:rw'));
});

test('ทาลัสซาชั้น 6 ท่าใหม่: ลบข้อมูล = แถวกลายเป็นช่องว่าง 1 เทิร์น คนในแถว 3 + ถูกดีดออก · คัดลอก = ร่างเงาฟันเจ้าของ (≥ 2) · มีในชุดท่าเฉพาะชั้น 6', () => {
  const P = setup({ whale: true });
  toLayer6();
  match.roundNumber = 27; Fodlan.preRound(); // โผล่
  const w = match.fodlan.whale;
  for (const p of P) { p.pos = null; p.hp = 20; p.armor = 0; p.statuses = {}; p.statusAmt = {}; }
  P[0].pos = { x: 3, y: 10 }; P[1].pos = { x: 15, y: 13 }; P[2].pos = { x: 18, y: 4 };
  w.pending = [{ kind: 'erase', row: 10, tiles: Array.from({ length: 20 }, (_, x) => ({ x, y: 10 })) }, { kind: 'copy', id: 'p1', at: { x: 15, y: 13 }, tiles: [{ x: 15, y: 13 }] }];
  w.calm = true;
  Math.random = () => 0.99;
  match.roundNumber = 28; Fodlan.preRound();
  assert.ok(P[0].hp <= 15, 'ลบข้อมูล 3 + โบนัสชั้น 6');
  assert.notEqual(P[0].pos.y, 10, 'ถูกดีดออกจากแถว');
  const map = action.boardMap();
  assert.equal(map.terrain['0,10'], 'fd_nt_void');
  assert.ok(P[1].hp <= 16, 'คัดลอกโดน');
  assert.ok(st().fx.some((e) => e.kind === 'whale_copy' && e.hits.includes('p1')));
  match.roundNumber = 29; Fodlan.preRound();
  assert.notEqual(action.boardMap().terrain['0,10'], 'fd_nt_void', 'แถวกลับมา');
  assert.deepEqual(Th.DATA_MOVES, ['erase', 'copy']);
});
