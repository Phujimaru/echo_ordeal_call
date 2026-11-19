// Nautilus ชั้น 4 นครจมบาดาล — ลูกเล่นโต้ตอบ + ความมืด + สภาพอากาศ (server/fodlan/ntCity.js · ผัง map10.js · GRID_PLAN §8.9)
//  รูปปั้นเทพ ลำแสง 3 ทะลุคนแรก · แผ่นกด → เสาล้มทับแนว 3 · ประตูหินปิดทับ 3 + ดันออก · วงอักขระผนึกสกิล · อักขระบนพื้น กับดัก/พร
//  รูปปั้นเรืองแสงแตก = แสงรอบตัว · แท่นบูชาถวายเหรียญ · น้ำวนยักษ์ดูดเข้ากลาง · กระแสน้ำเย็นจัด เดิน −1 + น้ำแข็งกัด · มองเห็นแค่ระยะเดิน + แสง
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const match = require('../server/match.js');
const Board = require('../server/board.js');
const Fodlan = require('../server/fodlan.js');
const timers = require('../server/timers.js');
const C = require('../server/fodlan/ntCity.js');
const kit = require('../server/fodlan/ntKit.js');
const O2 = require('../server/fodlan/nautilusO2.js');
const DEF = require('../server/fodlan/map10.js');

const AREA = Board.NAUTILUS_AREA + 3;
const realRandom = Math.random;
const realStart = timers.startPhaseTimer;
function setup(n = 4) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  for (let i = 0; i < n; i++) engine.players['p' + i] = { id: 'p' + i, name: 'P' + i, position: i + 1, characterId: 'dummy', alive: true, connected: true, cards: [], statuses: {}, statusAmt: {}, seen: {}, inventory: [] };
  engine.setGameMode('ffa');
  match.world = 'nautilus';
  match.nautilusWhale = false;
  Math.random = () => 0.99; // ไม่หลบ (เทสต์ดาเมจตรงตัว)
  process.env.ECHO_DEV_START_ROUND = '19'; // เทิร์น 19 = ชั้น 4 (ด่าน 10)
  engine.startMatch();
  delete process.env.ECHO_DEV_START_ROUND;
  engine.clearPhaseTimer();
  const P = Object.values(match.players);
  for (const p of P) { p.hp = 20; p.maxHp = 20; p.armor = 0; p.statuses = {}; p.statusAmt = {}; p.pos = null; }
  // ทุกคนออกนอกกระดานก่อน (เทสต์วางเอง) → วางไว้มุมไกลๆ แยกกัน
  const park = [{ x: 0, y: 0 }, { x: 19, y: 0 }, { x: 0, y: 15 }, { x: 19, y: 15 }];
  P.forEach((p, i) => { p.pos = { ...park[i] }; });
  return P;
}
function act(p) { match.gameState = 'ACTION'; match.actorId = p.id; match.action = { locked: false }; p.didAttackRound = false; }
const ctx = () => Fodlan.makeCtx();
const st = () => Fodlan.stageState();

test.beforeEach(() => { timers.startPhaseTimer = () => {}; });
test.afterEach(() => { Math.random = realRandom; timers.startPhaseTimer = realStart; engine.clearPhaseTimer(); });
test.after(() => { match.world = 'earth'; match.fodlan = null; match.nautilusWhale = undefined; for (const id of Object.keys(engine.players)) delete engine.players[id]; });

function reachAll(M, blocked = new Set()) {
  const s0 = M.spawns[0], seen = new Set([Board.key(s0.x, s0.y)]), q = [s0];
  while (q.length) {
    const c = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = c.x + dx, y = c.y + dy, k = Board.key(x, y);
      if (seen.has(k) || !Board.inBounds(M, x, y) || Board.isObstacle(M, x, y) || blocked.has(k)) continue;
      seen.add(k); q.push({ x, y });
    }
  }
  let free = 0;
  for (let y = 0; y < M.rows; y++) for (let x = 0; x < M.cols; x++) if (!Board.isObstacle(M, x, y) && !blocked.has(Board.key(x, y))) free++;
  return { seen, free };
}

test('ผังชั้น 4: ทุกช่องเดินได้ต่อถึงกัน (ประตูหินเปิด/ปิดทั้งสองบาน) · 7 จุดเกิด · ท่าจอดว่าง · ไม่มีจุดร้าน', () => {
  const M = Board.MAPS[AREA];
  const open = reachAll(M);
  assert.equal(open.seen.size, open.free);
  const shut = reachAll(M, new Set(C.GATES.map((g) => Board.key(g.x, g.y))));
  assert.equal(shut.seen.size, shut.free, 'ปิดประตูแล้วไม่มีย่านถูกขังตาย');
  assert.equal(M.spawns.length, 7);
  assert.equal(M.shopSpots.length, 0);
  const D = DEF.DOCK;
  for (let x = D.x; x < D.x + D.w; x++) for (let y = D.y; y < D.y + D.h; y++) assert.ok(!M.terrain[Board.key(x, y)] && !M.special[Board.key(x, y)], `ท่าจอด ${x},${y}`);
  // จุดเสียบของลูกเล่นตรงกับผัง
  for (const pl of C.PLATES) { assert.equal(M.special[Board.key(pl.x, pl.y)], 'fd_nt_plate'); assert.equal(M.terrain[Board.key(pl.col.x, pl.col.y)], 'fd_nt_citycol'); }
  for (const g of C.GATES) { assert.equal(M.special[Board.key(g.x, g.y)], 'fd_nt_citygate'); assert.equal(M.terrain[Board.key(g.lever.x, g.lever.y)], 'fd_nt_citylever'); }
  assert.equal(M.terrain[Board.key(C.RING.x, C.RING.y)], 'fd_nt_seaaltar');
  for (const kind of [...Object.values(M.terrain), ...Object.values(M.special), M.healKind]) assert.ok(Board.TERRAIN_INFO[kind] && Board.TERRAIN_INFO[kind].name, kind);
  for (const k of ['fd_nt_gateshut', 'fd_nt_fallen', 'fd_nt_shards']) assert.ok(Board.TERRAIN_INFO[k], k);
});

test('เข้าชั้น 4: ด่าน 10 · publicInfo.city (รูปปั้น 4 · แผ่นกด 4 · ประตู 2 เปิด)', () => {
  setup();
  assert.equal(Fodlan.stageNow(), 10);
  assert.equal(match.board.area, AREA);
  const info = Fodlan.publicInfo().board.city;
  assert.equal(info.statues.length, 4);
  assert.equal(info.plates.length, 4);
  assert.deepEqual(info.gates.map((g) => g.open), [true, true]);
});

test('รูปปั้นเทพ: ลำแสงตามแนว ดาเมจ 3 ทะลุคนแรก (โดน 2 คน คนที่ 3 รอด) · คนหมุนไม่โดน · พัก 2 เทิร์น', () => {
  const [a, b, c, d] = setup();
  a.pos = { x: 7, y: 5 }; b.pos = { x: 9, y: 5 }; c.pos = { x: 10, y: 5 }; d.pos = { x: 11, y: 5 }; // รูปปั้น (6,5) ยิงไปตะวันออก
  act(a);
  const hud = Fodlan.hudActions(a).find((h) => h.key === 'fd:l10:statue');
  assert.ok(hud && !hud.disabled);
  assert.equal(Fodlan.charAction(a.id, 'fd:l10:statue', { x: 12, y: 5 }), true);
  assert.equal(a.hp, 20); assert.equal(b.hp, 17); assert.equal(c.hp, 17); assert.equal(d.hp, 20);
  assert.deepEqual(st().nt10.statueDir['6,5'], [1, 0]);
  act(a);
  assert.ok(Fodlan.hudActions(a).find((h) => h.key === 'fd:l10:statue').disabled, 'พัก');
  match.roundNumber += 2;
  assert.ok(!Fodlan.hudActions(a).find((h) => h.key === 'fd:l10:statue').disabled);
});

test('แผ่นกด: วางชนวน → ศัตรูจบตาบนแผ่น = เสาล้มทับแนว 4 ดาเมจ 3 · เสากลายเป็นซาก · คนวางเหยียบเองไม่ทำงาน · ผลักลงแผ่นก็ทำงาน', () => {
  const [a, b, c] = setup();
  a.pos = { x: 9, y: 3 }; // ติดแผ่น (9,2) — เสา (12,2) ล้มไปตะวันตก
  act(a);
  assert.equal(Fodlan.charAction(a.id, 'fd:l10:plate'), true);
  assert.equal(st().nt10.plates['9,2'], a.id);
  a.pos = { x: 9, y: 2 }; C.onUnitEnd(ctx(), st(), a);
  assert.equal(st().nt10.plates['9,2'], a.id, 'คนวางเหยียบเอง = ไม่ทำงาน');
  a.pos = { x: 9, y: 3 };
  b.pos = { x: 9, y: 2 }; c.pos = { x: 11, y: 2 };
  C.onUnitEnd(ctx(), st(), b);
  assert.equal(b.hp, 17); assert.equal(c.hp, 17); assert.equal(a.hp, 20);
  const map = ctx().map();
  assert.ok(!map.terrain['12,2'], 'เสาล้มแล้ว');
  assert.equal(map.special['10,2'], 'fd_nt_fallen');
  // ผลักลงแผ่น (10,4) ที่วางชนวนไว้
  act(a); a.pos = { x: 10, y: 3 };
  assert.equal(Fodlan.charAction(a.id, 'fd:l10:plate'), true);
  b.pos = { x: 11, y: 4 }; b.hp = 20;
  kit.shove(ctx(), b, -1, 0, 1, C.hazardAt, a);
  assert.deepEqual(b.pos, { x: 10, y: 4 });
  assert.equal(b.hp, 17);
});

test('ประตูหิน: ปิดใส่คนในช่องประตู ดาเมจ 3 + ถูกดันออกฝั่งไกลคนโยก · ปิดแล้วเป็นสิ่งกีดขวาง · โยกอีกครั้งเปิด', () => {
  const [a, b] = setup();
  a.pos = { x: 4, y: 6 }; b.pos = { x: 5, y: 7 }; // คันโยก (5,6) · ประตู (5,7)
  act(a);
  const hud = Fodlan.hudActions(a).find((h) => h.key === 'fd:l10:gate');
  assert.ok(hud && !hud.disabled);
  assert.equal(Fodlan.charAction(a.id, 'fd:l10:gate'), true);
  assert.equal(b.hp, 17);
  assert.deepEqual(b.pos, { x: 6, y: 7 });
  assert.equal(ctx().map().terrain['5,7'], 'fd_nt_gateshut');
  assert.equal(ctx().free(5, 7), false);
  act(a);
  assert.equal(Fodlan.charAction(a.id, 'fd:l10:gate'), true);
  assert.ok(!ctx().map().terrain['5,7']);
  assert.equal(ctx().map().special['5,7'], 'fd_nt_citygate');
});

test('วงอักขระ: ยืนติดหินตั้ง → ทุกคนในวง (ห่างแท่นบูชา ≤ 2) ใช้สกิลไม่ได้ · คนนอกวง/คนปลุกไม่โดน · วงพัก 3 เทิร์น', () => {
  const [a, b, c] = setup();
  a.pos = { x: 7, y: 11 }; // ติดหินตั้ง (8,11)
  b.pos = { x: 9, y: 12 }; c.pos = { x: 14, y: 14 };
  act(a);
  assert.equal(Fodlan.charAction(a.id, 'fd:l10:ring'), true);
  assert.ok((b.statuses.noskill || 0) > 0);
  assert.ok(!(c.statuses.noskill > 0));
  assert.ok(!(a.statuses.noskill > 0));
  act(a);
  assert.ok(Fodlan.hudActions(a).find((h) => h.key === 'fd:l10:ring').disabled);
});

test('อักขระบนพื้น: จบตาบนอักขระ = พร (เสริมพลัง + ออกซิเจน) หรือกับดัก (ดาเมจ 2 + ถูกตรึง) · ดับ 3 เทิร์น', () => {
  const [a, b] = setup();
  a.pos = { x: 6, y: 4 }; // อักขระ
  const o2 = O2.get(ctx(), a);
  O2.set(ctx(), a, 5);
  C.onUnitEnd(ctx(), st(), a); // random 0.99 = พร
  assert.ok((a.statuses.might || 0) > 0);
  assert.equal(O2.get(ctx(), a), 7);
  C.onUnitEnd(ctx(), st(), a);
  assert.equal(a.hp, 20, 'ดับแล้ว ไม่ทำงานซ้ำ');
  void o2;
  Math.random = () => 0.1; // กับดัก (ไม่มีหลบ — ไม่มีสถานะหลบ/ที่กำบัง)
  b.pos = { x: 2, y: 7 };
  C.onUnitEnd(ctx(), st(), b);
  assert.equal(b.hp, 18);
  assert.ok((b.statuses.rooted || 0) > 0);
});

test('รูปปั้นเรืองแสง: ตีแตก → กลายเป็นเศษ (เดินได้) · ศัตรูติดรูปปั้นตาพร่า · คนตีเรืองแสง ศัตรูไกลๆ ก็มองเห็น', () => {
  const [a, b, c] = setup();
  a.pos = { x: 2, y: 9 }; b.pos = { x: 0, y: 9 }; c.pos = { x: 19, y: 15 }; // รูปปั้น (1,9)
  act(a);
  const id = 'fd:nt10:lstatue:1,9';
  assert.ok(Fodlan.objects().some((o) => o.id === id));
  assert.ok(Fodlan.strikeObject(a, id) > 0);
  assert.equal(ctx().map().special['1,9'], 'fd_nt_shards');
  assert.ok((b.statuses.blind || 0) > 0);
  assert.equal(Fodlan.hides(c, a), false, 'คนเรืองแสงทุกคนเห็น');
  assert.ok(Fodlan.vision(c).includes('3,9'), 'แสงรอบตัว 2 ช่อง');
});

test('แท่นบูชาทะเล: ถวาย 3 เหรียญ = เสริมพลัง +2 + ออกซิเจน +3 · คนละครั้ง', () => {
  const [a] = setup();
  a.pos = { x: 10, y: 12 }; a.gold = 5;
  O2.set(ctx(), a, 4);
  act(a);
  assert.equal(Fodlan.charAction(a.id, 'fd:l10:altar'), true);
  assert.equal(a.gold, 2);
  assert.equal(a.statusAmt.might, 2);
  assert.equal(O2.get(ctx(), a), 7);
  a.gold = 9; act(a);
  assert.ok(Fodlan.hudActions(a).find((h) => h.key === 'fd:l10:altar').disabled);
});

test('น้ำวนยักษ์: จบเทิร์นดูดเข้ากลางวิหาร (ใกล้ ≤ 4 = 2 ช่อง · ไกล = 1) · ตาน้ำวน (ลานวิหาร) ดาเมจ 2 + ออกซิเจน −1 · ช่องเตือน', () => {
  const [a, b] = setup();
  a.pos = { x: 10, y: 11 }; b.pos = { x: 0, y: 14 };
  Fodlan.startWeather('nt_maelstrom');
  assert.ok(Fodlan.publicInfo().board.warn.some((w) => w.kind === 'maelstrom' && w.x === 10 && w.y === 9));
  const o2 = O2.get(ctx(), a);
  C.onEndTurn(ctx(), st());
  assert.deepEqual(a.pos, { x: 10, y: 9 });
  assert.equal(a.hp, 18);
  assert.equal(O2.get(ctx(), a), o2 - 1);
  assert.deepEqual(b.pos, { x: 1, y: 14 });
  assert.equal(b.hp, 20);
});

test('กระแสน้ำเย็นจัด: ทุกคนเดิน −1 · แถบเย็นที่ประกาศ + ลานน้ำท่วม = ธาตุน้ำแข็ง + น้ำแข็งกัด · สุ่มแถบใหม่เห็นล่วงหน้า', () => {
  const [a, b, c] = setup();
  Fodlan.startWeather('nt_cold');
  assert.equal(Fodlan.movMod(a), -1);
  const s = st().nt10;
  assert.equal(s.cold.length, 3);
  s.cold = [12, 13, 14];
  a.pos = { x: 5, y: 13 }; b.pos = { x: 16, y: 6 }; c.pos = { x: 0, y: 3 };
  C.onEndTurn(ctx(), st());
  assert.ok((a.statuses.frostbite || 0) > 0 && (a.statuses.elIce || 0) > 0);
  assert.ok((b.statuses.frostbite || 0) > 0, 'ลานน้ำท่วม');
  assert.ok(!(c.statuses.frostbite > 0));
  assert.ok(Fodlan.publicInfo().board.warn.some((w) => w.kind === 'cold'));
});

test('ความมืด: เห็นแค่ระยะเดินตัวเอง (ทีมเห็นร่วม) + ช่องในแสง (วงอักขระ) · ศัตรูไกลในมืด = มองไม่เห็น', () => {
  const [a, b] = setup();
  a.pos = { x: 0, y: 0 }; b.pos = { x: 19, y: 15 };
  const vis = Fodlan.vision(a);
  assert.ok(vis.includes('1,1') && !vis.includes('19,15'));
  assert.ok(vis.includes('10,12'), 'วงอักขระเรืองแสง');
  assert.equal(Fodlan.hides(a, b), true);
  b.pos = { x: 10, y: 12 };
  assert.equal(Fodlan.hides(a, b), false, 'ยืนในวงอักขระ = ทุกคนเห็น');
});
