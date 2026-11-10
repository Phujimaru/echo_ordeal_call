// สนาม Eos (GRID_PLAN §8.6 · server/fodlan/stage6.js · map6.js) — หมุดใหม่บนลูกโลก แผนที่เดียว 32×32 ผังธรรมชาติตามภูมิศาสตร์ Lucis
//  เดิน +2 · โชโกโบะ (+3 · ป่า/น้ำตื้น 1 ก้าว · โดนดาเมจตกนก กลับคอก 3 เทิร์น) · รถ 3 คัน 1 ช่อง ขึ้นขี่แล้วขับแบบม้า (+3 · ถนน/พื้นเรียบ) ชน 2 · ผู้โดยสาร 3
//  ปีศาจกลางคืน 4 ตัว · อากาศ ฝนฟ้าคะนอง/หมอก
//  ชนะ = ยึดเสา 5 ต้น (ร่ายพิธี 2 ตา) แต้ม 1/3/6/10/15 ต่อเทิร์น ถึง 20 · ตายแล้วฟื้นหลัง 3 เทิร์น · เห็นผู้เล่นอื่นในระยะเดิน + 4
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const match = require('../server/match.js');
const Board = require('../server/board.js');
const Fodlan = require('../server/fodlan.js');
const action = require('../server/phases/action.js');
const combat = require('../server/combat.js');
const timers = require('../server/timers.js');
const lobby = require('../server/lobby.js');
const endTurn = require('../server/phases/endTurn.js');
const S6 = require('../server/fodlan/stage6.js');
const MAP6 = require('../server/fodlan/map6.js');

const realRandom = Math.random;
const realStart = timers.startPhaseTimer;
const AREA = Board.EOS_AREA;
const K = Board.key;
const PARK = [[13, 13], [30, 0], [28, 6], [1, 1]]; // ที่โล่งห่างรถ/โชโกโบะ/เสา

function setup(n = 3) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  for (let i = 0; i < n; i++) {
    engine.players['p' + i] = {
      id: 'p' + i, name: 'P' + i, position: i + 1, characterId: 'dummy', alive: true, connected: true,
      cards: [], statuses: {}, statusAmt: {}, seen: {}, inventory: [], teamId: 'A', teamConfirmed: true,
    };
  }
  engine.setGameMode('eos');
  match.world = 'eos';
  engine.startMatch();
  engine.clearPhaseTimer();
  match.gameState = 'PLAYING'; match.actorId = null; match.action = null; match.forcedWinnerId = null;
  Object.values(match.players).forEach((p, i) => { p.pos = { x: PARK[i][0], y: PARK[i][1] }; });
}
const P = (i) => match.players['p' + i];
const st = () => match.fodlan.s.eos;
const ctx = () => Fodlan.makeCtx();
function actor(p) { match.gameState = 'ACTION'; match.actorId = p.id; match.action = { locked: false, moved: false, canto: false, from: { ...p.pos } }; p.didAttackRound = false; }
const btn = (p, key) => Fodlan.hudActions(p).find((a) => a.key === key) || null;
const total = (p) => p.hp + (p.armor || 0);
const sameTile = (a, b) => a && b && a.x === b.x && a.y === b.y;
const Duo = () => require('../server/duo.js');
const mob = (type, x, y, o = {}) => _m(S6.spawnMob(ctx(), st(), type, { x, y }, { hp: 5, armor: 1, atk: S6.DAEMON_ATK, mov: 4, gold: 2, ...o }, { look: 1, tier: 1 }));
const _m = (r) => { if (r) r.summon.born = 0; return r; };

test.beforeEach(() => { timers.startPhaseTimer = (secs) => { match.timeLeft = Math.ceil(secs); }; });
test.afterEach(() => { Math.random = realRandom; timers.startPhaseTimer = realStart; engine.clearPhaseTimer(); });
test.after(() => {
  match.world = 'earth'; match.fodlan = null; match.forcedWinnerId = null; engine.setGameMode('ffa');
  for (const id of Object.keys(engine.players)) delete engine.players[id];
});

test('ผัง 32×32: จุดเกิด/ร้าน/โชโกโบะเดินถึงกันหมด · รถ 3 คันอยู่บนถนนและวิ่งถึงกัน · เสา 5 ต้นมีช่องติด · เมือง 3 แห่ง', () => {
  const m = Board.MAPS[AREA];
  assert.equal(m.cols, 32); assert.equal(m.rows, 32); assert.equal(m.name, 'Eos');
  assert.equal(m.spawns.length, 8);
  const s0 = m.spawns[0];
  const reach = new Set(Board.reachable(m, { id: 'w', x: s0.x, y: s0.y }, 999, []).keys());
  for (const s of [...m.spawns, ...m.shopSpots]) assert.ok(reach.has(K(s.x, s.y)), `ไปถึง ${K(s.x, s.y)}`);
  for (const [x, y] of MAP6.CHOCOBOS) assert.ok(reach.has(K(x, y)), `โชโกโบะ ${x},${y}`);
  for (const pl of MAP6.PILLARS) {
    const [x, y] = pl.at;
    assert.equal(m.terrain[K(x, y)], 'fd_eos_pillar');
    assert.ok(Board.DIRS.some(([dx, dy]) => reach.has(K(x + dx, y + dy))), `เสา ${pl.zone}`);
  }
  const onRoad = (a) => S6.carCells(a).every((c) => S6.ROAD.has(K(c.x, c.y)));
  const [c0, ...rest] = MAP6.CARS.map(([x, y]) => ({ x, y }));
  for (const c of [c0, ...rest]) assert.ok(onRoad(c), `รถ ${c.x},${c.y}`);
  const seen = new Set([K(c0.x, c0.y)]), q = [c0];
  for (let i = 0; i < q.length; i++) for (const [dx, dy] of Board.DIRS) {
    const a = { x: q[i].x + dx, y: q[i].y + dy };
    if (!seen.has(K(a.x, a.y)) && onRoad(a)) { seen.add(K(a.x, a.y)); q.push(a); }
  }
  for (const c of rest) assert.ok(seen.has(K(c.x, c.y)), `รถไปถึง ${c.x},${c.y}`);
  assert.ok(S6.inTown(15, 3) && S6.inTown(28, 28) && S6.inTown(5, 27));
  assert.ok(!S6.inTown(15, 15));
  // ไม่ใช่บล็อกสี่เหลี่ยม: ทะเลสาบไม่เต็มกรอบของตัวเอง
  const water = Object.entries(m.terrain).filter(([k, v]) => v === 'fd_eos_water' && Number(k.split(',')[1]) < 22).map(([k]) => k.split(',').map(Number));
  const xs = water.map(([x]) => x), ys = water.map(([, y]) => y);
  assert.ok(water.length < (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1) * 0.85, 'ทะเลสาบเป็นก้อนโค้ง');
});

test('หมุด Eos บนลูกโลก: โหมด eos (PVE) อย่างเดียว · ทุกคนทีมเดียว · เริ่มแมตช์ = แผนที่ Eos ด่าน 6 ไม่มีฉากเดินทาง · ไม่เปลี่ยนด่าน', () => {
  const opts = lobby.modeOptionsFor(4, 'eos').map((o) => o.mode);
  assert.deepEqual(opts, ['eos']);
  assert.ok(!lobby.modeOptionsFor(4, 'earth').some((o) => o.mode === 'eos'));
  assert.equal(lobby.normWorld('eos'), 'eos');
  setup();
  assert.ok(lobby.teamModeActive());
  assert.ok(combat.sameTeam(P(0), P(1)), 'ผู้เล่นทุกคนฝ่ายเดียวกัน');
  assert.equal(match.board.area, AREA);
  assert.ok(Fodlan.active() && Fodlan.isEos());
  assert.equal(Fodlan.stageNow(), 6);
  assert.equal(match.journeyScene, null);
  assert.equal(Fodlan.publicInfo().name, 'Eos');
  match.roundNumber = 6; match.legStart = 1;
  assert.equal(Fodlan.maybeAdvance(() => {}), false);
  assert.equal(match.board.area, AREA);
});

test('ระยะเดิน +2 แต่ไม่เกิน 5', () => {
  setup();
  match.world = 'earth';
  const base = action.movOf(P(0));
  match.world = 'eos';
  assert.equal(action.movOf(P(0)), Math.max(base, Math.min(base + S6.MOV_BONUS, S6.WALK_MAX)));
  assert.ok(action.movOf(P(0)) <= Math.max(base, S6.WALK_MAX));
});

test('โชโกโบะ: จบตาบนช่อง = ขี่ · เดิน +3 + ป่าทึบ 1 ก้าว · โดนดาเมจตกนก กลับคอก เกิดใหม่หลัง 3 เทิร์น', () => {
  setup();
  const p = P(0), c = st().chocos[0];
  const before = action.movOf(p);
  p.pos = { x: c.x, y: c.y };
  Fodlan.onUnitEnd(p);
  assert.equal(c.rider, p.id);
  assert.equal(action.movOf(p), before + S6.CHOCO_MOV);
  assert.ok(Fodlan.flatWalk(p));
  const m = action.boardMap();
  const forest = Board.DIRS.map(([dx, dy]) => ({ x: c.x + dx, y: c.y + dy })).find((t) => m.special[K(t.x, t.y)] === 'fd_eos_forest');
  assert.ok(forest, 'คอก Duscae ติดป่า');
  assert.ok(Board.reachable(m, { id: p.id, x: c.x, y: c.y }, 1, [], { flatWalk: true }).has(K(forest.x, forest.y)));
  assert.ok(!Board.reachable(m, { id: p.id, x: c.x, y: c.y }, 1, []).has(K(forest.x, forest.y)), 'ไม่ขี่ = ป่ากิน 2 ก้าว');
  // นกรับดาเมจแทนก่อน (ผู้ใช้สั่ง 2026-11-10) — เลือดคนขี่ไม่ลด · นกเลือดหมด = ตกนก ส่วนเกินเข้าคนขี่
  const hp0 = p.hp, ar0 = p.armor;
  combat.dealMixed(p, 1);
  Fodlan.onUnitEnd(P(1));
  assert.ok(st().riders[p.id], 'ยังขี่อยู่');
  assert.equal(c.hp, S6.CHOCO_HP - 1);
  assert.equal(p.hp + p.armor, hp0 + ar0);
  combat.dealMixed(p, S6.CHOCO_HP);
  Fodlan.onUnitEnd(P(1));
  assert.ok(!st().riders[p.id]);
  assert.equal(c.x, null);
  assert.equal(p.hp + p.armor, hp0 + ar0 - 1, 'ส่วนเกิน 1 เข้าคนขี่');
  assert.equal(action.movOf(p), before);
  const back = c.back;
  match.roundNumber = back - 2; Fodlan.preRound(() => {});
  assert.equal(c.x, null);
  match.roundNumber = back - 1; Fodlan.preRound(() => {});
  assert.ok(c.x != null && Math.abs(c.x - c.home.x) + Math.abs(c.y - c.home.y) <= 2);
  assert.equal(c.hp, S6.CHOCO_HP, 'กลับคอกแล้วหายดี');
});

test('รถมีเลือด: คนขับโดนตี รถรับแทน · รถพัง = คนขับลง รถจอดค้างขึ้นไม่ได้ · ซ่อมแล้วขับได้ · ป้อนอาหารโชโกโบะ', () => {
  setup();
  const p = P(0), car = st().cars[0];
  car.driver = p.id; p.pos = { x: car.x, y: car.y };
  const hp0 = p.hp + p.armor;
  combat.dealMixed(p, 2);
  assert.equal(car.hp, S6.CAR_HP - 2);
  assert.equal(p.hp + p.armor, hp0);
  combat.dealMixed(p, S6.CAR_HP);
  assert.equal(car.hp, 0);
  assert.ok(car.broken && !car.driver, 'รถพัง คนขับลง');
  assert.ok(!(p.pos.x === car.x && p.pos.y === car.y), 'คนขับไม่อยู่ช่องรถ');
  assert.equal(p.hp + p.armor, hp0 - 2, 'ส่วนเกินเข้าคนขับ');
  actor(p);
  if (Math.abs(p.pos.x - car.x) + Math.abs(p.pos.y - car.y) === 1) {
    assert.ok(!btn(p, 'fd:board'), 'รถพังขึ้นไม่ได้');
    const b = btn(p, 'fd:fix');
    assert.ok(b && !b.disabled);
    assert.ok(Fodlan.charAction(p.id, 'fd:fix'));
    assert.equal(car.hp, S6.CAR_FIX);
    assert.equal(car.broken, false);
  }
  const pub = Fodlan.publicInfo().board;
  assert.equal(pub.cars[0].maxHp, S6.CAR_HP);
  assert.equal(pub.chocos[0].hp, S6.CHOCO_HP);
});

test('โชโกโบะ: ตัวใหญ่ขี่ไม่ได้ · ปุ่มลงวางนกข้างตัว', () => {
  setup();
  const p = P(0), c = st().chocos[1];
  p.boardSize = 2;
  p.pos = { x: c.x, y: c.y };
  Fodlan.onUnitEnd(p);
  assert.equal(c.rider, null);
  p.boardSize = 1;
  Fodlan.onUnitEnd(p);
  assert.equal(c.rider, p.id);
  actor(p);
  const b = btn(p, 'fd:dismount');
  assert.ok(b && !b.disabled && b.tiles.length);
  const t = b.tiles[0];
  assert.ok(Fodlan.charAction(p.id, 'fd:dismount', t));
  assert.ok(!st().riders[p.id]);
  assert.ok(sameTile(c, t));
  assert.equal(action.boardMap().special[K(t.x, t.y)], 'fd_eos_chocobo');
});

test('รถ: ยืนติดรถ → ขึ้นรถ (ยังไม่เดิน = เดินเต็มระยะจากรถ) · เดิน +3 · รถวิ่งตามคนขับ · ป่า/น้ำตื้นเข้าไม่ได้ · ลงรถ รถจอดที่เดิม', () => {
  setup();
  const p = P(0), car = st().cars[1]; // Hammerhead
  p.pos = { x: car.x - 1, y: car.y };
  if (Board.isObstacle(action.boardMap(), p.pos.x, p.pos.y)) p.pos = { x: car.x, y: car.y - 1 };
  actor(p);
  assert.equal(action.boardMap().terrain[K(car.x, car.y)], 'fd_eos_car', 'รถจอด = สิ่งกีดขวาง');
  const mov0 = action.movOf(p);
  const b = btn(p, 'fd:board');
  assert.ok(b && !b.disabled);
  assert.ok(Fodlan.charAction(p.id, 'fd:board', { x: car.x, y: car.y }));
  assert.ok(sameTile(p.pos, car));
  assert.equal(car.driver, p.id);
  assert.equal(match.action.locked, false, 'ยังเดินต่อได้');
  assert.ok(sameTile(match.action.from, car));
  assert.equal(action.movOf(p), mov0 + S6.CAR_MOV);
  assert.ok(Fodlan.carWalk(p));
  assert.ok(Fodlan.noSkill(p), 'อยู่ในรถใช้สกิลไม่ได้');
  assert.ok(!action.boardMap().terrain[K(car.x, car.y)], 'ขับอยู่ = ไม่ใช่สิ่งกีดขวาง');
  const m = action.boardMap();
  const forest = (MAP6.map.special.fd_eos_forest || [])[0];
  assert.ok(Board.reachable(m, { id: p.id, x: forest[0] - 1, y: forest[1] }, 3, [], { carWalk: true }).get(K(forest[0], forest[1])) == null, 'ป่าทึบ: รถเข้าไม่ได้');
  // เดิน = รถไปด้วย
  const reach = Board.reachable(m, { id: p.id, ...p.pos }, action.movOf(p), [], { carWalk: true });
  const far = [...reach.values()].find((n) => n.d >= 3 && !(n.x === p.pos.x && n.y === p.pos.y));
  assert.ok(far);
  p.pos = { x: far.x, y: far.y };
  S6.syncCars(ctx(), st());
  assert.ok(sameTile(car, p.pos), 'รถตามคนขับ');
  // ลงรถ
  const lv = btn(p, 'fd:leave');
  assert.ok(lv && lv.tiles.length);
  const at = { x: car.x, y: car.y };
  assert.ok(Fodlan.charAction(p.id, 'fd:leave', lv.tiles[0]));
  assert.equal(car.driver, null);
  assert.ok(sameTile(car, at));
  assert.ok(sameTile(p.pos, lv.tiles[0]));
  assert.ok(!Fodlan.noSkill(p), 'ลงรถแล้วใช้สกิลได้');
});

test('รถ: ชน = ใช้การโจมตี มอนติดรถ 2 ดาเมจ + กระเด็น 1 ช่อง · ชนเพื่อนไม่ได้ · ผู้โดยสาร (คนขับยอม) ไม่ร่วงตอนคนขับโดนตี · คนขับตาย = รถจอด ผู้โดยสารลง', () => {
  setup();
  const p = P(0), q = P(1), r = P(2), car = st().cars[1];
  car.x = 13; car.y = 13; car.driver = p.id; p.pos = { x: 13, y: 13 };
  q.pos = { x: 30, y: 0 };
  const m = mob('daemon', 14, 13, { hp: 9, armor: 0 });
  actor(p);
  const hp0 = total(m);
  const b = btn(p, 'fd:ram');
  assert.ok(b && b.tiles.some((t) => sameTile(t, m.pos)));
  q.pos = { x: 13, y: 14 };
  assert.ok(!btn(p, 'fd:ram').tiles.some((t) => sameTile(t, q.pos)), 'เพื่อนไม่ใช่เป้าชน');
  q.pos = { x: 30, y: 0 };
  assert.ok(Fodlan.charAction(p.id, 'fd:ram', { x: 14, y: 13 }));
  assert.equal(total(m), hp0 - S6.CAR_HIT_DMG);
  assert.ok(sameTile(m.pos, { x: 15, y: 13 }) || Board.isObstacle(action.boardMap(), 15, 13));
  // ผู้โดยสาร
  const Ride = require('../server/ride.js');
  r.pos = { x: 13, y: 12 };
  if (Board.isObstacle(action.boardMap(), 13, 12)) r.pos = { x: 12, y: 13 };
  actor(r);
  const seat = btn(r, 'fd:seat');
  assert.ok(seat && seat.tiles.length);
  assert.ok(Fodlan.charAction(r.id, 'fd:seat', { x: 13, y: 13 }));
  assert.ok(match.rideAsk && match.rideAsk.to === p.id);
  assert.ok(Ride.answer(Duo().sideKey(p), true));
  assert.equal(r.mountId, p.id);
  assert.ok(Fodlan.noSkill(r), 'ผู้โดยสารใช้สกิลไม่ได้');
  Ride.onAttacked(p, m);
  assert.equal(r.mountId, p.id, 'อยู่ในรถ — ไม่ร่วง');
  combat.instantDeath(p, 'test');
  S6.syncCars(ctx(), st());
  assert.equal(car.driver, null);
  assert.ok(!r.mountId);
});

test('ปีศาจ = ยูนิตจริง: กลางคืนเกิดนอกเมือง ห่างคน · ต้นเทิร์นเดินไล่ + ตี · เข้าเมืองไม่ได้ · สตั้นไม่ขยับ · ฟ้าสางสลาย', () => {
  setup();
  const s = st();
  s.nightNo = 1;
  S6.spawnDaemons(ctx(), s);
  const list = S6.mobsOf(ctx(), 'daemon');
  assert.equal(list.length, S6.nightTarget(ctx(), s), 'จำนวนตามคืน × ความยาก × จำนวนผู้เล่น');
  for (const d of list) {
    assert.ok(!S6.inTown(d.pos.x, d.pos.y));
    for (const p of [P(0), P(1), P(2)]) assert.ok(Math.abs(p.pos.x - d.pos.x) + Math.abs(p.pos.y - d.pos.y) >= 3);
    assert.ok(S6.isMob(d) && d.summon && !combat.sameTeam(d, P(0)), 'ศัตรูของผู้เล่น');
  }
  S6.dissolveDaemons(ctx(), s);
  assert.equal(S6.mobsOf(ctx(), 'daemon').length, 0);
  const d = mob('daemon', 14, 12);
  const p = P(0); p.pos = { x: 14, y: 15 };
  P(1).pos = { x: 30, y: 0 }; P(2).pos = { x: 12, y: 4 };
  const hp0 = total(p);
  S6.actMonsters(ctx(), s);
  assert.equal(Math.abs(d.pos.x - p.pos.x) + Math.abs(d.pos.y - p.pos.y), 1);
  assert.equal(total(p), hp0 - S6.DAEMON_ATK);
  // สตั้น = ไม่ขยับ ไม่ตี
  p.pos = { x: 14, y: 17 };
  const at = { ...d.pos }; d.statuses.stun = 1;
  S6.actMonsters(ctx(), s);
  assert.ok(sameTile(d.pos, at), 'สตั้นอยู่');
  d.statuses.stun = 0;
  // เข้าเมืองที่ไฟเปิดไม่ได้
  p.pos = { x: 11, y: 4 }; P(1).pos = { x: 9, y: 26 }; P(2).pos = { x: 30, y: 0 };
  for (let i = 0; i < 3; i++) S6.actMonsters(ctx(), s);
  assert.ok(!S6.inTown(d.pos.x, d.pos.y));
});

test('ปีศาจ: โจมตีปกติ/ผลัก/ไถลได้แบบผู้เล่น · ฆ่าแล้วได้เหรียญ + ของ · แกร่งขึ้นทุกคืน · กลางวัน→กลางคืนผ่าน preRound', () => {
  setup();
  const s = st(), p = P(0);
  const d = mob('daemon', 14, 13, { hp: 1, armor: 0 });
  actor(p);
  const gold0 = p.gold || 0;
  Math.random = () => 0; // ของดรอปติด
  match.effectSourceId = p.id;
  combat.dealMixed(d, 5); combat.resolveDamageAftermath(d);
  match.effectSourceId = null;
  Math.random = realRandom;
  assert.equal(d.alive, false);
  assert.ok((p.gold || 0) > gold0, 'ได้เหรียญ');
  assert.ok((p.inventory || []).length > 0, 'ได้ของ');
  assert.equal(s.kills, 1);
  // แกร่งขึ้นทุกคืน
  const n1 = S6.daemonStats(1), n3 = S6.daemonStats(3);
  assert.ok(n3.hp > n1.hp && n3.atk >= n1.atk && S6.daemonCount(3) > S6.daemonCount(1));
  const dn = require('../server/dayNight.js');
  let night = 1;
  for (let r = 1; r < 30; r++) if (dn.isNightRound(r)) { night = r; break; }
  s.night = false; match.roundNumber = night - 1; match.fodlan.s.preRoundDone = 0;
  Fodlan.preRound(() => {});
  assert.equal(s.nightNo, 1);
  assert.ok(S6.mobsOf(ctx(), 'daemon').length > 0);
  let day = night;
  while (dn.isNightRound(day)) day++;
  s.night = true; match.roundNumber = day - 1; match.fodlan.s.preRoundDone = 0;
  Fodlan.preRound(() => {});
  assert.equal(S6.mobsOf(ctx(), 'daemon').length, 0);
  assert.equal(s.dayNo, 2);
});

test('สภาพอากาศ: ฝนฟ้าคะนองเดิน −1 + ฟ้าผ่า 2 · หมอกซ่อนมอนนอกระยะเดิน · สงบแล้วพัก 2 เทิร์น', () => {
  setup();
  const p = P(0), q = P(1);
  const mov = action.movOf(p);
  Fodlan.startWeather('eos_storm');
  assert.equal(action.movOf(p), mov - 1);
  const s = st();
  assert.equal(s.warn.length, S6.LIGHTNING_COUNT);
  s.warn = [{ x: p.pos.x, y: p.pos.y }]; s.warnFor = match.roundNumber + 1;
  const hp0 = total(p);
  match.fodlan.s.preRoundDone = 0;
  Fodlan.preRound(() => {});
  assert.equal(total(p), hp0 - S6.LIGHTNING_DMG);
  match.fodlan.weather = { kind: 'eos_fog', left: 3 }; match.fodlan.s.weather = match.fodlan.weather;
  const d = mob('daemon', 14, 13);
  assert.ok(!Fodlan.hides(p, d));
  d.pos = { x: 13 + action.movOf(p) + 3, y: 13 };
  assert.ok(Fodlan.hides(p, d), 'หมอกซ่อนมอนนอกระยะเดิน');
  q.pos = { x: 30, y: 30 };
  assert.ok(!Fodlan.hides(p, q), 'เพื่อนเห็นกันเสมอ');
  match.fodlan.weather.left = 1;
  Fodlan.onEndTurn(() => 0);
  assert.equal(Fodlan.weatherNow(), null);
  Fodlan.onEndTurn(() => 0);
  assert.equal(Fodlan.weatherNow(), null, 'พักหลังสงบ');
  match.roundNumber += 5;
  Fodlan.onEndTurn(() => 0.1);
  assert.ok(Fodlan.weatherNow());
  assert.ok(Fodlan.EOS_WEATHER.includes(Fodlan.weatherNow().kind));
});

test('PVE: เพื่อนเห็นกันทั้งแผนที่ · มอนเห็นทั้งแผนที่เมื่ออากาศปกติ', () => {
  setup();
  const p = P(0), q = P(1);
  q.pos = { x: 30, y: 0 };
  assert.ok(!Fodlan.hides(p, q));
  const d = mob('daemon', 2, 30);
  assert.ok(!Fodlan.hides(p, d));
  assert.ok(!Fodlan.hides(p, p));
});

test('เสา: ร่ายพิธี 2 ตา → ยึดได้ · โดนดาเมจ = พิธีแตก · มอนตีเสา 2 ครั้ง = หลุดเป็นกลาง · ซ่อมเสาได้', () => {
  setup();
  const p = P(0), pl = st().pillars.find((o) => o.zone === 'insomnia');
  p.pos = { x: pl.x, y: pl.y - 1 };
  match.roundNumber = 2;
  actor(p);
  let b = btn(p, 'fd:seize');
  assert.ok(b && !b.disabled);
  assert.ok(Fodlan.charAction(p.id, 'fd:seize'));
  assert.ok(pl.ch && pl.ch.by === p.id);
  actor(p);
  assert.ok(btn(p, 'fd:seize').disabled, 'ครั้งที่สองต้องตาถัดไป');
  match.roundNumber = 3;
  actor(p);
  assert.ok(Fodlan.charAction(p.id, 'fd:seize'));
  assert.equal(pl.owner, S6.PVE);
  assert.equal(pl.ch, null);
  // มอนตีเสา
  const m = mob('magitek', pl.x + 1, pl.y);
  if (!sameTile(m.pos, { x: pl.x + 1, y: pl.y })) m.pos = { x: pl.x, y: pl.y + 1 };
  p.pos = { x: 1, y: 1 }; P(1).pos = { x: 30, y: 30 }; P(2).pos = { x: 1, y: 30 };
  S6.actMonsters(ctx(), st());
  assert.equal(pl.hits, 1);
  assert.equal(pl.owner, S6.PVE);
  // ซ่อม
  p.pos = { x: pl.x, y: pl.y - 1 };
  actor(p);
  b = btn(p, 'fd:seize');
  assert.ok(b && b.name === 'ซ่อมเสา' && !b.disabled);
  assert.ok(Fodlan.charAction(p.id, 'fd:seize'));
  assert.equal(pl.hits, 0);
  p.pos = { x: 1, y: 1 };
  m.summon.born = 0;
  S6.actMonsters(ctx(), st()); S6.actMonsters(ctx(), st());
  assert.equal(pl.owner, null, 'ตีครบ 2 = หลุด');
  // พิธีแตกเมื่อโดนดาเมจ
  const q = P(1);
  lobby; m.pos = { x: 30, y: 30 }; combat.instantDeath(m, true);
  q.pos = { x: pl.x - 1, y: pl.y };
  actor(q);
  assert.ok(Fodlan.charAction(q.id, 'fd:seize'));
  assert.ok(pl.ch && pl.ch.by === q.id);
  combat.dealMixed(q, 1);
  S6.checkChannels(ctx(), st());
  assert.equal(pl.ch, null);
});

test('แต้มรวม: ถือ 1/…/5 ต้น = 1/3/…/15 ต่อเทิร์น · ครบ 50 ทุกคนชนะ · ผู้เล่นล้มหมดพร้อมกัน = แพ้', () => {
  setup();
  const s = st();
  s.pillars[0].owner = S6.PVE;
  S6.scoreRound(ctx(), s);
  assert.equal(s.score, 1);
  s.pillars[1].owner = S6.PVE;
  S6.scoreRound(ctx(), s);
  assert.equal(s.score, 1 + 3);
  combat.instantDeath(P(1), true); combat.instantDeath(P(2), true);
  match.gameState = 'PLAYING';
  assert.equal(endTurn.gameOver(), false, 'ยังมีคนรอด = ไม่จบ');
  for (const pl of s.pillars) pl.owner = S6.PVE;
  S6.scoreRound(ctx(), s); S6.scoreRound(ctx(), s);
  assert.equal(s.score, 4 + 30);
  assert.equal(Fodlan.eosOutcome(), null);
  const info = Fodlan.publicInfo().board;
  assert.equal(info.goal, S6.SCORE_GOAL);
  assert.equal(info.score, 34);
  assert.equal(info.rate, 15);
  S6.scoreRound(ctx(), s); S6.scoreRound(ctx(), s);
  assert.equal(Fodlan.eosOutcome(), 'win');
  assert.equal(endTurn.gameOver(), true);
  assert.equal(match.gameState, 'GAMEOVER');
  assert.equal(match.winningTeamId, 'A');
  // แพ้
  setup();
  match.gameState = 'PLAYING';
  for (const p of [P(0), P(1), P(2)]) combat.instantDeath(p, true);
  assert.equal(Fodlan.eosOutcome(), 'lose');
  assert.equal(endTurn.gameOver(), true);
  assert.equal(match.winningTeamId, null);
});

test('ตายแล้วฟื้นหลัง 3 เทิร์นที่จุดเกิดที่ไกลมอนสุด เลือด/เกราะเต็ม', () => {
  setup();
  match.cycleShift = 2; // กลางวันตลอดช่วงเทสต์ (กลางคืนมีปีศาจเกิด/ตีคนที่เพิ่งฟื้น)
  require('../server/fodlan/eosExtra.js').X(st()).giantNext = 999; // ยักษ์หินไม่มาในเทสต์นี้ (เหยียบคนที่เพิ่งฟื้นได้ — สุ่มตามเส้นทาง)
  const p = P(0);
  match.roundNumber = 4;
  combat.instantDeath(p, true);
  assert.equal(p.alive, false);
  Fodlan.onUnitEnd(P(1));
  assert.equal(st().dead[p.id], 4);
  assert.ok(Fodlan.publicInfo().board.revive.some((r) => r.id === p.id && r.at === 7));
  match.roundNumber = 5; match.fodlan.s.preRoundDone = 0; Fodlan.preRound(() => {});
  assert.equal(p.alive, false);
  match.roundNumber = 6; match.fodlan.s.preRoundDone = 0; Fodlan.preRound(() => {});
  assert.equal(p.alive, true);
  assert.equal(p.hp, combat.maxHpOf(p));
  assert.equal(p.armor, combat.maxArmorOf(p));
  match.cycleShift = 0;
});

// ---------- ขั้น 2: ลูกเล่นปั่นป่วน (L6–L10) ----------
const shop = require('../server/shop.js');
const nextToTile = (t) => Board.DIRS.map(([dx, dy]) => ({ x: t.x + dx, y: t.y + dy })).find((c) => !Board.isObstacle(action.boardMap(), c.x, c.y));

test('L6 สะพานยก: คันโยก Altissia ยก/ลดสะพานทั้งเมือง (ยก = เดินผ่านไม่ได้) · มีคนบนสะพาน = ยกไม่ได้', () => {
  setup();
  const p = P(0), lv = S6.LEVER, br = S6.BRIDGES[0];
  assert.ok(lv && S6.BRIDGES.length >= 3);
  p.pos = nextToTile(lv);
  actor(p);
  P(1).pos = { x: br.x, y: br.y };
  assert.ok(btn(p, 'fd:lever').disabled, 'มีคนยืนบนสะพาน');
  P(1).pos = { x: 30, y: 0 };
  assert.ok(Fodlan.charAction(p.id, 'fd:lever'));
  assert.equal(st().bridgeUp, true);
  assert.ok(Board.isObstacle(action.boardMap(), br.x, br.y));
  match.roundNumber += 1; actor(p);
  assert.ok(Fodlan.charAction(p.id, 'fd:lever'));
  assert.equal(st().bridgeUp, false);
  assert.ok(!Board.isObstacle(action.boardMap(), br.x, br.y));
});

test('L7 โดม: แท่นกลาง Insomnia ปิดประตูเมือง 3 เทิร์น · ตีจากนอกเข้าในไม่ได้ · หมดแล้วพัก', () => {
  setup();
  const p = P(0), q = P(1), core = S6.DOME_CORE, gate = S6.DOME_GATES.find((g) => g.y === 8 && g.x === 15);
  assert.ok(core && gate);
  p.pos = nextToTile(core);
  actor(p);
  assert.ok(Fodlan.charAction(p.id, 'fd:dome'));
  assert.ok(Board.isObstacle(action.boardMap(), gate.x, gate.y), 'ประตูเมืองปิด');
  q.pos = { x: 15, y: 9 }; p.pos = { x: 15, y: 7 };
  assert.ok(Fodlan.shields(q, p), 'ตีจากนอกเข้าในไม่ได้');
  assert.ok(!action.canStrike(q, p));
  assert.ok(!Fodlan.shields(p, q), 'จากในออกนอกได้');
  for (let i = 0; i < S6.DOME_TURNS; i++) { Fodlan.onEndTurn(() => 0.99); match.roundNumber += 1; }
  assert.ok(!Board.isObstacle(action.boardMap(), gate.x, gate.y), 'โดมสลาย');
  p.pos = nextToTile(core); actor(p);
  assert.ok(btn(p, 'fd:dome').disabled, 'พักหลังโดมสลาย');
});

test('L8 ไฟเมือง: ดับไฟ = ปีศาจเข้าเมืองนั้นได้ · เปิดคืนได้', () => {
  setup();
  const s = st(), p = P(0), sw = MAP6.SWITCHES.find((w) => w.zone === 'insomnia');
  assert.ok(S6.blockedTown(s, 12, 4));
  p.pos = nextToTile({ x: sw.at[0], y: sw.at[1] });
  actor(p);
  assert.equal(btn(p, 'fd:lights').name, 'ดับไฟ');
  assert.ok(Fodlan.charAction(p.id, 'fd:lights'));
  assert.ok(!S6.blockedTown(s, 12, 4));
  P(1).pos = { x: 30, y: 0 }; p.pos = { x: 1, y: 1 };
  const d = mob('daemon', 15, 10);
  const q = P(2); q.pos = { x: 13, y: 5 };
  for (let i = 0; i < 3 && !S6.inTown(d.pos.x, d.pos.y); i++) S6.actMonsters(ctx(), s);
  assert.ok(S6.inTown(d.pos.x, d.pos.y), 'ปีศาจเข้าเมืองที่ไฟดับ');
});

test('L9 ผักกิซาล: ขายทุกร้านใน Eos · เรียกโชโกโบะมาข้างตัว · ขี่ได้ทันทีด้วยปุ่ม (ยังไม่เดิน = เดินเต็มระยะจากนก +2)', () => {
  setup();
  shop.refreshShopForJourney();
  const s = st(), p = P(0);
  assert.ok(S6.gysahlOnSale());
  p.pos = { x: 13, y: 13 };
  assert.ok(S6.useGysahl(p));
  const c = s.chocos.find((ch) => ch.x != null && !ch.rider && Math.abs(ch.x - 13) + Math.abs(ch.y - 13) === 1);
  assert.ok(c, 'โชโกโบะวิ่งมาข้างตัว');
  actor(p);
  const mov0 = action.movOf(p);
  const b = btn(p, 'fd:mount');
  assert.ok(b && !b.disabled && b.tiles.some((t) => sameTile(t, c)));
  assert.ok(Fodlan.charAction(p.id, 'fd:mount', { x: c.x, y: c.y }));
  assert.equal(c.rider, p.id);
  assert.ok(sameTile(p.pos, c));
  assert.equal(match.action.locked, false, 'ยังเดินต่อได้');
  assert.ok(sameTile(match.action.from, c));
  assert.equal(action.movOf(p), mov0 + S6.CHOCO_MOV);
  assert.ok(S6.CHOCO_MOV < S6.CAR_MOV, 'โชโกโบะเดินเพิ่มน้อยกว่ารถ');
});

test('L10 ซากรถ: ผลักไป 1 ช่องตามทิศ · ซากรถบนถนนขวางรถ', () => {
  setup();
  const s = st(), p = P(0), w = s.wrecks[0];
  p.pos = { x: w.x - 1, y: w.y };
  if (Board.isObstacle(action.boardMap(), p.pos.x, p.pos.y)) p.pos = { x: w.x, y: w.y - 1 };
  actor(p);
  const from = { x: w.x, y: w.y };
  assert.ok(Fodlan.charAction(p.id, 'fd:push'));
  assert.equal(Math.abs(w.x - from.x) + Math.abs(w.y - from.y), 1);
  assert.equal(action.boardMap().terrain[K(w.x, w.y)], 'fd_eos_wreck');
});

// ---------- ขั้น 3: ลูกเล่นโจมตี (L11–L15) ----------
test('L11 ถังน้ำมัน: ตีแล้วระเบิด 3×3 ดาเมจ 2 + ลุกไหม้ (มอน · ไม่โดนเพื่อน) · ระเบิดลูกโซ่ · เกิดใหม่ภายหลัง', () => {
  setup();
  const s = st(), p = P(0), q = P(1);
  const b = s.barrels[0];
  p.pos = { x: b.x - 1, y: b.y };
  q.pos = nextToTile({ x: b.x, y: b.y + 1 }) && !Board.isObstacle(action.boardMap(), b.x, b.y + 1) ? { x: b.x, y: b.y + 1 } : { x: 30, y: 0 };
  const m = mob('magitek', b.x + 1, b.y, { hp: 9, armor: 0 });
  actor(p);
  assert.ok(Fodlan.canHitObject(p, b.id));
  const hm = total(m), hq = total(q);
  Fodlan.strikeObject(p, b.id);
  assert.ok(!s.barrels.some((o) => o.id === b.id));
  assert.equal(total(m), hm - S6.BARREL_DMG);
  assert.ok((m.statuses.hburn || 0) > 0, 'ลุกไหม้');
  assert.equal(total(q), hq, 'เพื่อนไม่โดน');
  setup();
  const s2 = st();
  s2.barrels = [{ id: 'fd:bA', x: 2, y: 2, home: { x: 2, y: 2 } }, { id: 'fd:bB', x: 3, y: 3, home: { x: 3, y: 3 } }];
  S6.explodeBarrel(ctx(), s2, s2.barrels[0], P(0));
  assert.equal(s2.barrels.length, 0, 'ถังข้างกันระเบิดต่อ');
  match.roundNumber += 10; match.fodlan.s.preRoundDone = 0;
  S6.respawnProps(ctx(), s2);
  assert.equal(s2.barrels.length, 2, 'เกิดใหม่');
});

test('L12 หินพลังเวท → ขวดเวท · ไฟ = ลุกไหม้+พื้นไฟ · น้ำแข็ง = เชื่องช้า+น้ำเป็นน้ำแข็ง · สายฟ้าลงน้ำช็อตทั้งผืน', () => {
  setup();
  const s = st(), p = P(0);
  S6.respawnProps(ctx(), s);
  assert.equal(s.crystals.length, MAP6.CRYSTALS.length);
  const c = s.crystals[0];
  c.element = 'fire';
  p.pos = nextToTile(c);
  actor(p);
  Fodlan.strikeObject(p, c.id);
  assert.deepEqual(s.flasks[p.id], ['fire']);
  p.pos = { x: 13, y: 13 };
  const m = mob('daemon', 15, 13, { hp: 9, armor: 0 });
  actor(p);
  const b = btn(p, 'fd:flask:fire');
  assert.ok(b && !b.disabled && b.tiles.some((t) => t.x === 15 && t.y === 13));
  assert.ok(Fodlan.charAction(p.id, 'fd:flask:fire', { x: 15, y: 13 }));
  assert.ok((m.statuses.hburn || 0) > 0);
  assert.ok(match.board.flame && Object.keys(match.board.flame).length > 0, 'พื้นไฟ');
  assert.equal((s.flasks[p.id] || []).length, 0);
  setup();
  const s3 = st(), p3 = P(0), q3 = P(1);
  s3.flasks[p3.id] = ['ice'];
  const water = Object.entries(action.boardMap().terrain).find(([, v]) => v === 'fd_eos_water')[0].split(',').map(Number);
  p3.pos = nextToTile({ x: water[0], y: water[1] }) || { x: 13, y: 13 };
  q3.pos = { x: 30, y: 0 };
  actor(p3);
  const aim = btn(p3, 'fd:flask:ice').tiles.find((t) => t.x === water[0] && t.y === water[1]);
  assert.ok(aim);
  assert.ok(Fodlan.charAction(p3.id, 'fd:flask:ice', aim));
  assert.ok(!Board.isObstacle(action.boardMap(), water[0], water[1]), 'น้ำแข็งเดินได้');
  setup();
  const s4 = st(), p4 = P(0);
  s4.flasks[p4.id] = ['thunder'];
  const shallow = Object.entries(action.boardMap().special).filter(([, v]) => v === 'fd_eos_shallow').map(([k]) => k.split(',').map(Number));
  const [ax, ay] = shallow[0];
  const far = shallow.find(([x, y]) => Math.abs(x - ax) + Math.abs(y - ay) >= 4);
  const m4 = mob('daemon', far[0], far[1], { hp: 9, armor: 0 });
  p4.pos = { x: 13, y: 13 };
  const aim2 = { x: ax, y: ay };
  if (Math.abs(aim2.x - 13) + Math.abs(aim2.y - 13) > S6.FLASK_RANGE) p4.pos = nextToTile(aim2);
  actor(p4);
  const hm = total(m4);
  assert.ok(Fodlan.charAction(p4.id, 'fd:flask:thunder', aim2));
  assert.equal(total(m4), hm - S6.SHOCK_DMG, 'ช็อตทั้งผืนน้ำ');
});

test('L13 ป้อมปืน: ยืนติดป้อมบนกำแพง Insomnia ยิงมอนในระยะ 6 ดาเมจ 2 · ไม่เล็งเพื่อน', () => {
  setup();
  const p = P(0), q = P(1), t = S6.TURRETS[0];
  p.pos = { x: t.x, y: t.y - 1 };
  q.pos = { x: t.x + 1, y: t.y + 3 };
  const m = mob('daemon', t.x, t.y + 3, { hp: 9, armor: 0 });
  actor(p);
  const b = btn(p, 'fd:turret');
  assert.ok(b && !b.disabled && b.tiles.some((c) => sameTile(c, m.pos)));
  assert.ok(!b.tiles.some((c) => sameTile(c, q.pos)));
  const hm = total(m);
  assert.ok(Fodlan.charAction(p.id, 'fd:turret', m.pos));
  assert.equal(total(m), hm - S6.TURRET_DMG);
});

test('L14 สัตว์ยักษ์: ตีคนที่เข้าใกล้ · ถูกตี = ไล่คนตี · ฆ่าได้เหรียญ + ของ', () => {
  setup();
  const s = st(), p = P(0), q = P(1);
  match.roundNumber = 1;
  S6.respawnProps(ctx(), s);
  assert.equal(S6.mobsOf(ctx(), 'beast').length, 0, 'Deadeye ไม่เกิดเอง (ผู้ใช้สั่งเอาออก 2026-11-10)');
  S6.spawnBeast(ctx(), s);
  const m = S6.mobsOf(ctx(), 'beast')[0];
  assert.ok(m);
  m.summon.born = 0;
  p.pos = nextToTile(m.pos);
  const hp = total(p);
  S6.actMonsters(ctx(), s);
  assert.equal(total(p), hp - S6.BEAST.atk, 'เข้าใกล้ = โดน');
  p.pos = { x: 1, y: 1 };
  q.pos = { x: m.pos.x + 4, y: m.pos.y };
  if (Board.isObstacle(action.boardMap(), q.pos.x, q.pos.y)) q.pos = { x: m.pos.x, y: m.pos.y + 4 };
  combat.dealMixed(m, 1);
  Fodlan.onUnitEnd(q);
  assert.equal(m.summon.aggro, q.id);
  S6.actMonsters(ctx(), s);
  assert.ok(Math.abs(m.pos.x - q.pos.x) + Math.abs(m.pos.y - q.pos.y) <= 2, 'วิ่งไล่คนตี');
  const g0 = q.gold || 0, inv0 = (q.inventory || []).length;
  match.effectSourceId = q.id;
  combat.dealMixed(m, 99); combat.resolveDamageAftermath(m);
  match.effectSourceId = null;
  assert.equal(m.alive, false);
  assert.equal((q.gold || 0) - g0, S6.BEAST.gold);
  assert.equal((q.inventory || []).length, inv0 + 1, 'สัตว์ยักษ์ดรอปของแน่นอน');
});

test('L15 ยานลงจอด: กลางวันลงได้หลายลำคนละที่ · เตือน → ลงจอด ปล่อยทหารเหล็ก ไล่ตี/ตีเสา · ครบเวลาถอนกลับ', () => {
  setup();
  const s = st();
  match.cycleShift = 2;
  Math.random = () => 0.01;
  S6.dropshipTurn(ctx(), s, 2);
  Math.random = realRandom;
  assert.ok(s.ships.length >= 1 && s.ships.every((d) => d.state === 'warn'));
  if (s.ships.length > 1) assert.ok(Math.abs(s.ships[0].x - s.ships[1].x) + Math.abs(s.ships[0].y - s.ships[1].y) >= 9, 'คนละพื้นที่');
  assert.ok(Fodlan.publicInfo().board.warn.some((w) => w.kind === 'dropship'));
  Math.random = () => 0.99;
  S6.dropshipTurn(ctx(), s, 3);
  Math.random = realRandom;
  assert.ok(s.ships.every((d) => d.state === 'landed'));
  const mt = S6.mobsOf(ctx(), 'magitek');
  assert.ok(mt.length >= S6.MAGITEK.count);
  for (const m of mt) m.summon.born = 0;
  const before = mt.map((m) => `${m.pos.x},${m.pos.y}`).join('|');
  S6.actMonsters(ctx(), s);
  assert.notEqual(S6.mobsOf(ctx(), 'magitek').map((m) => `${m.pos.x},${m.pos.y}`).join('|'), before, 'ทหารเหล็กขยับ');
  Math.random = () => 0.99;
  S6.dropshipTurn(ctx(), s, 3 + S6.MAGITEK.stay);
  Math.random = realRandom;
  assert.equal(s.ships.length, 0);
  assert.equal(S6.mobsOf(ctx(), 'magitek').length, 0);
  match.cycleShift = 0;
});

test('L15b หุ่นเกราะจักรวรรดิ: มีโอกาสลงมากับยาน ลำละไม่เกิน 1 · ถึกกว่าทหารเหล็ก · ภาพ magitek_ex', () => {
  setup();
  const s = st();
  match.cycleShift = 2;
  Math.random = () => 0.01;
  S6.dropshipTurn(ctx(), s, 2);
  S6.dropshipTurn(ctx(), s, 3);
  Math.random = realRandom;
  const mt = S6.mobsOf(ctx(), 'magitek');
  const mechs = mt.filter((m) => m.summon.trait === 'mech');
  assert.ok(mechs.length >= 1 && mechs.length <= s.ships.length, 'ลำละไม่เกิน 1');
  const plain = mt.find((m) => !m.summon.trait);
  if (plain) assert.ok(mechs[0].hp > plain.hp && mechs[0].armor > plain.armor);
  assert.equal(mechs[0].img, '/eos/img/magitek_ex.webp');
  assert.equal(Fodlan.publicInfo().board.mobs.find((m) => m.id === mechs[0].id).trait, 'mech');
  match.cycleShift = 0;
});

// ---------- ขั้น 4: เดินทาง (L2–L4) + เก็บของ/บัฟ (L16–L19) ----------
test('L2 รถไฟ: เตือนเทิร์นก่อน → ผ่าน: คนบนราง 3 ดาเมจ + กระเด็นออก · ยืนชานชาลา = ไปอีกฝั่ง · รอบถัดไป +4 สลับทิศ', () => {
  setup();
  const s = st(), q = S6.p4State(s), p = P(0), r = P(1);
  p.pos = { x: 13, y: MAP6.RAIL_Y };
  const [w, e] = MAP6.STATIONS;
  r.pos = { x: w[0], y: w[1] };
  const hp0 = total(p);
  assert.ok(S6.trainTurn(ctx(), s, q.trainNext - 1) > 0);
  assert.equal(q.trainWarn, true);
  const next = q.trainNext, dir = q.trainDir;
  S6.trainTurn(ctx(), s, next);
  assert.equal(total(p), hp0 - S6.TRAIN_DMG);
  assert.notEqual(p.pos.y, MAP6.RAIL_Y, 'กระเด็นออกจากราง');
  assert.ok(Math.abs(r.pos.x - e[0]) + Math.abs(r.pos.y - e[1]) <= 3, 'ไปชานชาลาตะวันออก');
  assert.equal(q.trainNext, next + S6.TRAIN_EVERY);
  assert.equal(q.trainDir, -dir);
});

test('L3 กอนโดลา / L4 อุโมงค์: ยืนบนท่า/ปากอุโมงค์ → ไปจุดอื่น จบการเดินของตา', () => {
  setup();
  const p = P(0);
  const [a, b] = MAP6.DOCKS;
  p.pos = { x: a[0], y: a[1] };
  actor(p);
  const g = btn(p, 'fd:gondola');
  assert.ok(g && !g.disabled && g.tiles.some((t) => t.x === b[0] && t.y === b[1]));
  assert.ok(Fodlan.charAction(p.id, 'fd:gondola', { x: b[0], y: b[1] }));
  assert.ok(sameTile(p.pos, { x: b[0], y: b[1] }));
  assert.equal(match.action.locked, true);
  const [m0, m1] = MAP6.TUNNELS[0];
  p.pos = { x: m0[0], y: m0[1] };
  actor(p);
  const t = btn(p, 'fd:tunnel');
  assert.ok(t && !t.disabled && !t.tiles, 'อุโมงค์: กดแล้วไปเลย (ไม่ต้องคลิกปากอีกฝั่งที่อยู่นอกจอ)');
  assert.ok(Fodlan.charAction(p.id, 'fd:tunnel'));
  assert.ok(Math.abs(p.pos.x - m1[0]) + Math.abs(p.pos.y - m1[1]) <= 2);
});

test('L16 แคมป์: เลือกอาหาร (ใช้การตี) · สตูว์ ตี +1 · ข้าวกล่อง เดิน +1 · ปลาย่าง ฟื้นเลือดต้นเทิร์น · พักใช้ซ้ำ', () => {
  setup();
  const p = P(0), c = MAP6.CAMPS[0];
  p.pos = { x: c[0], y: c[1] };
  match.roundNumber = 3;
  actor(p);
  assert.equal(btn(p, 'fd:camp:atk').disabled, false);
  assert.ok(Fodlan.charAction(p.id, 'fd:camp:atk'));
  assert.equal(Fodlan.atkBonus(p), 1);
  actor(p);
  assert.ok(btn(p, 'fd:camp:mov').disabled, 'พักใช้ซ้ำ');
  // ปลาย่าง
  const q = S6.p4State(st());
  q.buffs[p.id] = { kind: 'mend', from: 3, until: 5 };
  p.hp = 3;
  match.roundNumber = 4; match.fodlan.s.preRoundDone = 0; Fodlan.preRound(() => {});
  assert.equal(p.hp, 4);
  q.buffs[p.id] = { kind: 'mov', from: 4, until: 6 };
  const mov = action.movOf(p);
  delete q.buffs[p.id];
  assert.equal(action.movOf(p), mov - 1);
});

test('L17 ตกปลา / L18 สุสาน: ตกปลาใช้การตี · สุสานเปิดได้ครั้งเดียว อาวุธหลวงตี +1 ตาที่ตีเสียเลือด 1 (ไม่ถึงตาย)', () => {
  setup();
  const p = P(0), f = MAP6.FISH[0];
  p.pos = { x: f[0], y: f[1] };
  actor(p);
  Math.random = () => 0.5; // เหรียญ
  assert.ok(Fodlan.charAction(p.id, 'fd:fish'));
  assert.ok(p.didAttackRound || match.action.noStrike || btn(p, 'fd:fish').disabled);
  Math.random = realRandom;
  const tb = MAP6.TOMBS[1];
  p.pos = { x: tb[0] - 1, y: tb[1] };
  if (Board.isObstacle(action.boardMap(), p.pos.x, p.pos.y)) p.pos = { x: tb[0], y: tb[1] + 1 };
  actor(p);
  assert.ok(Fodlan.charAction(p.id, 'fd:tomb'));
  assert.equal(Fodlan.atkBonus(p), 1);
  assert.ok(S6.p4State(st()).tombs[1]);
  p.hp = 5; p.didAttackRound = true;
  Fodlan.onUnitEnd(p);
  assert.equal(p.hp, 4);
  Fodlan.onUnitEnd(p);
  assert.equal(p.hp, 4, 'เทิร์นละครั้ง');
  p.hp = 1; match.roundNumber += 1;
  Fodlan.onUnitEnd(p);
  assert.equal(p.hp, 1, 'ไม่ถึงตาย');
});

test('L19 ค่าหัว: ติดร้าน รับได้ทีละ 1 · ฆ่าเป้าได้ = เหรียญ', () => {
  setup();
  const p = P(0), q = P(1);
  const shop = require('../server/shop.js');
  const keys = [...shop.shopTiles()];
  assert.ok(keys.length > 0);
  const [sx, sy] = keys[0].split(',').map(Number);
  const spot = Board.DIRS.map(([dx, dy]) => ({ x: sx + dx, y: sy + dy })).find((t) => !shop.shopTiles().has(K(t.x, t.y)) && !Board.isObstacle(action.boardMap(), t.x, t.y));
  p.pos = spot;
  actor(p);
  Math.random = () => 0.99; // ผู้เล่น
  assert.ok(Fodlan.charAction(p.id, 'fd:bounty'));
  Math.random = realRandom;
  const b = S6.p4State(st()).bounty[p.id];
  assert.ok(b);
  assert.ok(!btn(p, 'fd:bounty'), 'ถือได้ทีละ 1');
  const gold0 = p.gold || 0;
  if (b.kind === 'player') {
    const t = match.players[b.target];
    match.effectSourceId = p.id;
    combat.instantDeath(t, true);
    match.effectSourceId = null;
  } else {
    S6.huntDone(ctx(), st(), p, b.kind);
  }
  assert.ok(!S6.p4State(st()).bounty[p.id]);
  assert.ok((p.gold || 0) > gold0);
  void q;
});

// ---------- ขั้น 5: พายุทราย (L21) ----------
test('L21 พายุทราย: สุ่มได้ใน Eos · มอนในทะเลทรายถูกเห็นเฉพาะระยะ 2 ช่อง · นอกทะเลทรายปกติ', () => {
  setup(2);
  assert.ok(Fodlan.EOS_WEATHER.includes('eos_sand'));
  Fodlan.startWeather('eos_sand');
  const a = P(0); P(1).pos = { x: 1, y: 1 };
  const d = mob('daemon', 23, 24);
  const vis = (v, t) => !Fodlan.hides(v, t);
  a.pos = { x: 20, y: 24 };
  assert.ok(S6.inDesert(20, 24));
  assert.equal(vis(a, d), false);
  d.pos = { x: 22, y: 24 };
  assert.equal(vis(a, d), true);
  a.pos = { x: 13, y: 15 }; d.pos = { x: 15, y: 16 };
  assert.equal(vis(a, d), true);
  match.fodlan.weather = null;
});

test('หีบสมบัติ: โผล่ตามที่รกร้างทุก 3 เทิร์น ห่างผู้เล่น · ตีหีบ = เหรียญ (+ของ)', () => {
  setup();
  const s = st(), p = P(0);
  match.roundNumber = 1;
  S6.respawnProps(ctx(), s);
  assert.ok(s.chests.length >= 1 && s.chests.length <= S6.CHEST_MAX);
  const c = s.chests[0];
  assert.ok(!S6.inTown(c.x, c.y));
  assert.equal(action.boardMap().terrain[K(c.x, c.y)], 'fd_eos_chest');
  p.pos = nextToTile(c);
  actor(p);
  assert.ok(Fodlan.canHitObject(p, c.id));
  const g0 = p.gold || 0;
  Fodlan.strikeObject(p, c.id);
  assert.ok(!s.chests.includes(c));
  assert.ok((p.gold || 0) > g0);
});

// ---------- PVE รอบสอง (GRID_PLAN §8.6 "PVE รอบสอง") ----------
const EV = require('../server/fodlan/eosEvents.js');
test('ความยาก: โหวตในหน้าเลือก (เสียงมากสุด · เท่ากัน = ปกติ) · ยากเลือดมากขึ้น · ปีศาจเพิ่มตามจำนวนผู้เล่น', () => {
  setup();
  const base = S6.daemonStats(1);
  match.eosDiff = 'easy'; const e = EV.scaleStats(ctx(), base);
  match.eosDiff = 'hard'; const h = EV.scaleStats(ctx(), base);
  match.eosDiff = 'normal';
  assert.ok(e.hp < base.hp && h.hp > base.hp && h.atk > e.atk);
  const n3 = EV.scaleCount(ctx(), 10);
  setup(1);
  assert.ok(EV.scaleCount(ctx(), 10) < n3, 'คนน้อย = มอนน้อย');
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  for (let i = 0; i < 3; i++) engine.players['v' + i] = { id: 'v' + i, name: 'V' + i, position: i + 1, characterId: 'dummy', alive: true, connected: true, cards: [], statuses: {}, statusAmt: {}, seen: {}, inventory: [] };
  match.gameState = 'TEAM_MODE';
  lobby.voteGameMode('v0', 'eos', 'eos', 'hard');
  lobby.voteGameMode('v1', 'eos', 'eos', 'hard');
  lobby.voteGameMode('v2', 'eos', 'eos', 'easy');
  assert.equal(match.gameMode, 'eos');
  assert.equal(match.eosDiff, 'hard');
  engine.clearPhaseTimer();
});

test('ราชาปีศาจ: แต้มรวมถึง 25 = เตือน → ลงมา · ตีเสาทีเดียวหลุด · ล้มได้ = แต้ม +5 ทุกคนได้ของ · เกราะเสารับแทน', () => {
  setup();
  const s = st(), pl = s.pillars[0];
  pl.owner = S6.PVE;
  s.score = 24; s.pillars[1].owner = S6.PVE;
  S6.scoreRound(ctx(), s);
  const e = EV.ev(s);
  assert.ok(e.bossFirst && e.bossWarn, 'เตือนบอส');
  assert.ok(Fodlan.publicInfo().board.bossWarn);
  EV.landBoss(ctx(), s, S6.H(), e.bossWarn.at);
  const b = EV.bossAlive(ctx(), S6.H());
  assert.ok(b && b.summon.trait === 'boss');
  pl.ward = 1;
  P(0).pos = { x: 30, y: 30 }; P(1).pos = { x: 30, y: 29 }; P(2).pos = { x: 30, y: 28 };
  b.pos = nextToTile(pl);
  b.summon.born = 0; b.summon.roarAt = 99;
  S6.actMonsters(ctx(), s);
  assert.equal(pl.ward, 0, 'โล่หายก่อน');
  assert.equal(pl.hits, 1);
  S6.actMonsters(ctx(), s);
  assert.equal(pl.owner, null, 'บอสตี = หลุด');
  const score0 = s.score, inv0 = (P(0).inventory || []).length;
  match.effectSourceId = P(1).id; combat.dealMixed(b, 999); combat.resolveDamageAftermath(b); match.effectSourceId = null;
  assert.equal(s.score, score0 + EV.BOSS.score);
  assert.equal((P(0).inventory || []).length, inv0 + 1, 'ทุกคนได้ของ');
});

test('มอนพิเศษ: ปีศาจระเบิด (ติดตัว = ระเบิด 3×3) · ปีศาจหมอฟื้นเลือดพวก · ทหารเหล็กยิงไกล', () => {
  setup();
  const s = st(), p = P(0);
  P(1).pos = { x: 30, y: 0 }; P(2).pos = { x: 1, y: 30 };
  p.pos = { x: 13, y: 13 };
  const bomb = S6.spawnMob(ctx(), s, 'daemon', { x: 14, y: 13 }, { hp: 3, armor: 0, atk: 3, mov: 4, gold: 1 }, { trait: 'bomber' }); bomb.summon.born = 0;
  const hp = total(p);
  S6.actMonsters(ctx(), s);
  assert.equal(bomb.alive, false, 'ระเบิดตัวเองหาย');
  assert.equal(total(p), hp - S6.TRAIT.bombDmg);
  const hurtD = mob('daemon', 20, 14, { hp: 9 }); hurtD.hp = 3;
  const heal = S6.spawnMob(ctx(), s, 'daemon', { x: 21, y: 14 }, { hp: 5, armor: 0, atk: 0, mov: 3, gold: 1 }, { trait: 'healer' }); heal.summon.born = 0;
  S6.actMonsters(ctx(), s);
  assert.ok(hurtD.hp > 3, 'หมอฟื้นเลือด');
  const sn = S6.spawnMob(ctx(), s, 'magitek', { x: 13, y: 16 }, { hp: 4, armor: 0, atk: 2, mov: 3, gold: 1 }, { trait: 'sniper' }); sn.summon.born = 0;
  const hp2 = total(p);
  S6.actMonsters(ctx(), s);
  assert.ok(sameTile(sn.pos, { x: 13, y: 16 }), 'ยิงจากที่เดิม');
  assert.ok(total(p) < hp2, 'โดนยิงระยะ 3');
});

test('คืนพระจันทร์สีเลือด: ปีศาจ ×1.5 · ของรางวัล ×2', () => {
  setup();
  const s = st();
  s.nightNo = 2;
  const normal = S6.nightTarget(ctx(), s);
  Math.random = () => 0.01;
  EV.onNight(ctx(), s, S6.H(), true);
  Math.random = realRandom;
  assert.ok(EV.ev(s).blood);
  assert.ok(S6.nightTarget(ctx(), s) > normal);
  assert.equal(EV.bloodMul(s), 2);
  EV.onDay(s);
  assert.equal(EV.bloodMul(s), 1);
});

test('ภารกิจโซน: กวาดล้างครบ/สำรวจจุดสัญญาณ = แต้มรวม +3 · หมดเวลาหาย', () => {
  setup();
  const s = st(), e = EV.ev(s);
  EV.spawnQuest(ctx(), s, S6.H(), 5);
  const q = e.quests[0];
  assert.ok(q);
  const score0 = s.score || 0;
  if (q.type === 'hunt') {
    for (let i = 0; i < q.need; i++) EV.questKill(ctx(), s, S6.H(), { x: q.rect[0], y: q.rect[1] }, P(0));
  } else {
    P(0).pos = { x: q.x, y: q.y }; actor(P(0));
    assert.ok(btn(P(0), 'fd:scout'));
    assert.ok(Fodlan.charAction(P(0).id, 'fd:scout'));
  }
  assert.equal(s.score, score0 + EV.QUEST.score);
  assert.ok(!e.quests.includes(q));
  e.questNext = 0;
  EV.spawnQuest(ctx(), s, S6.H(), 6);
  assert.ok(e.quests.length >= 1);
  EV.tickQuests(ctx(), s, S6.H(), 999);
  assert.ok(e.quests.every((o) => o.until >= 999));
});

test('ช่วยเพื่อนฟื้นเร็ว: ดวงวิญญาณที่ช่องที่ล้ม · กดช่วย = เร็วขึ้น 1 เทิร์น ฟื้นข้างดวงวิญญาณ', () => {
  setup();
  match.cycleShift = 2;
  const p = P(0), q = P(1), s = st();
  match.roundNumber = 4;
  p.pos = { x: 14, y: 13 };
  combat.instantDeath(p, true);
  Fodlan.onUnitEnd(q);
  assert.ok(EV.ev(s).deathAt[p.id]);
  q.pos = { x: 13, y: 13 };
  actor(q);
  const b = btn(q, 'fd:help');
  assert.ok(b && !b.disabled);
  assert.ok(Fodlan.charAction(q.id, 'fd:help'));
  assert.equal(s.dead[p.id], 3);
  match.roundNumber = 5; match.fodlan.s.preRoundDone = 0; Fodlan.preRound(() => {});
  assert.equal(p.alive, true, 'ฟื้นเร็วขึ้น 1 เทิร์น');
  assert.ok(Math.abs(p.pos.x - 14) + Math.abs(p.pos.y - 13) <= 3, 'ฟื้นข้างดวงวิญญาณ');
  match.cycleShift = 0;
});

test('เกราะเสา: ขายในร้าน Eos · ใช้ติดเสาที่ยึดไว้ = โล่ +1 (สูงสุด 2) · ไม่มีเสา = ไม่เสียของ', () => {
  setup();
  shop.refreshShopForJourney();
  assert.ok((match.shops || []).some((sh) => (sh.items || []).some((it) => it.type === 'pillarWard')));
  const s = st(), p = P(0), pl = s.pillars[0];
  p.pos = { x: 13, y: 13 };
  assert.equal(S6.useWard(p), false);
  pl.owner = S6.PVE;
  p.pos = nextToTile(pl);
  assert.ok(S6.useWard(p)); assert.ok(S6.useWard(p));
  assert.equal(pl.ward, 2);
  assert.equal(S6.useWard(p), false, 'เต็มแล้ว');
});

test('ขบวนเสบียง: วิ่งตามถนน · มอนตีได้ ผู้เล่นตีไม่ได้ · ถึงปลายทาง = แต้มรวม +6', () => {
  setup();
  const s = st(), e = EV.ev(s);
  P(0).pos = { x: 1, y: 1 }; P(1).pos = { x: 1, y: 2 }; P(2).pos = { x: 1, y: 3 };
  EV.spawnConvoy(ctx(), s, S6.H(), 4);
  const c = EV.convoyUnit(ctx(), s);
  assert.ok(c && c.alive);
  assert.ok(combat.sameTeam(c, P(0)), 'ฝ่ายผู้เล่น');
  const d = mob('daemon', 0, 31);
  assert.ok(!combat.sameTeam(c, d));
  const score0 = s.score || 0;
  for (let i = 0; i < 40 && e.convoy; i++) EV.moveConvoy(ctx(), s, S6.H());
  assert.equal(e.convoy, null);
  assert.equal(s.score, score0 + EV.CONVOY.score);
});

// ---------------------------------------------------------------- PVE รอบสาม (server/fodlan/eosExtra.js)
const XT = require('../server/fodlan/eosExtra.js');
const kill = (u, by) => { match.effectSourceId = by ? by.id : null; combat.dealMixed(u, 999); combat.resolveDamageAftermath(u); match.effectSourceId = null; };

test('คืนสุดท้าย: แต้มรวมถึง 40 = กลางคืนถาวร + เตือนบอส · ต้นเทิร์นมีคลื่นปีศาจรอบเสาที่ยึดไว้', () => {
  setup();
  const s = st();
  s.pillars[0].owner = S6.PVE;
  s.score = 39;
  S6.scoreRound(ctx(), s);
  assert.ok(XT.X(s).final, 'เริ่มคืนสุดท้าย');
  assert.ok(engine.isNightRound(match.roundNumber + 5), 'กลางคืนถาวร');
  assert.ok(EV.ev(s).bossWarn, 'บอสมาด้วย');
  const before = S6.mobsOf(ctx(), 'daemon').length;
  const n = XT.finalWave(ctx(), s, S6.H(), XT.X(s).final.from);
  assert.ok(n > 0);
  assert.equal(S6.mobsOf(ctx(), 'daemon').length, before + XT.FINAL.perPillar);
  match.forcedNight = null;
});

test('พลังประจำเสา: Insomnia ป้อมยิงเอง · Altissia น้ำพุฟื้นเลือด · Duscae โชโกโบะ +1 · Hammerhead ชน +1', () => {
  setup();
  const s = st(), H = S6.H();
  const t = S6.TURRETS[0];
  const d = mob('daemon', t.x, t.y + 3, { hp: 9, armor: 0 });
  assert.equal(XT.powerRound(ctx(), s, H), 0, 'ยังไม่ยึด = ไม่มีผล');
  s.pillars.find((o) => o.zone === 'insomnia').owner = S6.PVE;
  XT.powerRound(ctx(), s, H);
  assert.equal(d.hp, 9 - XT.POWER.turretDmg, 'ป้อมยิงเอง');
  const alt = s.pillars.find((o) => o.zone === 'altissia');
  alt.owner = S6.PVE;
  const p = P(0); p.pos = S6.H().freeNear(ctx(), s, alt.x, alt.y, 2, p.id); p.hp = 2;
  XT.powerRound(ctx(), s, H);
  assert.equal(p.hp, 3, 'น้ำพุฟื้นเลือด');
  assert.equal(XT.movBonus(s, p, true, false), 0);
  s.pillars.find((o) => o.zone === 'duscae').owner = S6.PVE;
  assert.equal(XT.movBonus(s, p, true, false), XT.POWER.chocoMov);
  s.pillars.find((o) => o.zone === 'hammerhead').owner = S6.PVE;
  assert.equal(XT.ramBonus(s), XT.POWER.ramDmg);
  assert.deepEqual(XT.powersOf(s).sort(), ['altissia', 'duscae', 'hammerhead', 'insomnia']);
});

test('ท่าร่วม: ตีมอนตัวที่เพื่อนตีแล้วในเทิร์นเดียวกัน = ตี +1 · ตัวเองตีซ้ำไม่ได้โบนัส · นับฉายา + มาตรวัด', () => {
  setup();
  const s = st(), H = S6.H();
  const d = mob('daemon', 14, 13, { hp: 9, armor: 0 });
  XT.snapshot(ctx(), s, H);
  assert.equal(Fodlan.atkBonus(P(1), d), 0);
  d.hp -= 2; XT.onUnitEnd(ctx(), s, H, P(0));
  assert.equal(Fodlan.atkBonus(P(0), d), 0, 'คนเดิม = ไม่มีโบนัส');
  assert.equal(Fodlan.atkBonus(P(1), d), XT.COMBO.atk, 'เพื่อน = +1');
  const g0 = XT.X(s).gauge;
  d.hp -= 2; XT.onUnitEnd(ctx(), s, H, P(1));
  assert.equal(XT.X(s).stats.p1.combos, 1);
  assert.ok(XT.X(s).gauge > g0);
  match.roundNumber += 1;
  assert.equal(Fodlan.atkBonus(P(2), d), 0, 'เทิร์นใหม่ = รีเซ็ต');
});

test('รังปีศาจ: กลางวันโผล่ (ห่างผู้เล่น/เมือง) · ค่ำพ่นปีศาจ · ทำลายได้เหรียญ + ฉายา', () => {
  setup();
  const s = st(), H = S6.H();
  s.night = false; s.dayNo = 2;
  XT.spawnNests(ctx(), s, H, 3);
  const nests = S6.mobsOf(ctx(), 'nest');
  assert.ok(nests.length >= 1);
  for (const n of nests) assert.ok(!S6.inTown(n.pos.x, n.pos.y));
  s.night = true; s.nightNo = 2;
  const before = S6.mobsOf(ctx(), 'daemon').length;
  XT.nestBurst(ctx(), s, H, true);
  assert.ok(S6.mobsOf(ctx(), 'daemon').length > before, 'พ่นปีศาจ');
  const g0 = P(0).gold || 0;
  kill(nests[0], P(0));
  assert.ok((P(0).gold || 0) > g0);
  assert.equal(XT.X(s).stats.p0.nests, 1);
});

test('ยักษ์หิน: เตือนเส้นทาง → เดินทีละ 4 ช่อง เหยียบแถบกว้าง 3 · ล้มได้ = แต้ม +4 ทุกคนได้เหรียญ', () => {
  setup();
  const s = st(), H = S6.H(), x = XT.X(s);
  x.giantNext = 1;
  XT.giantTurn(ctx(), s, H, 1);
  assert.equal(x.giant.state, 'warn');
  const g = x.giant;
  const band = XT.bandOf(ctx(), g, 0, XT.GIANT.step - 1);
  const p = P(0), spot = band.find((t) => S6.H().tileFree(ctx(), s, t.x, t.y, p.id));
  p.pos = { ...spot };
  const hp = total(p);
  XT.giantTurn(ctx(), s, H, 2);
  assert.equal(total(p), hp - XT.GIANT.dmg, 'โดนเหยียบ');
  const u = XT.giantUnit(ctx(), s);
  assert.ok(u && u.alive);
  const score0 = s.score || 0, gold0 = P(2).gold || 0;
  kill(u, P(1));
  assert.equal(s.score, score0 + XT.GIANT.score);
  assert.ok((P(2).gold || 0) > gold0, 'ทุกคนได้เหรียญ');
  assert.equal(x.giant, null);
});

test('แสงไฟแคมป์: ปีศาจไม่ตี/ไม่เดินเข้าวงไฟ · ราชาปีศาจไม่กลัว', () => {
  setup();
  const s = st(), [cx, cy] = MAP6.CAMPS[0];
  const p = P(0); p.pos = S6.H().freeNear(ctx(), s, cx, cy, 1, p.id);
  P(1).pos = { x: 30, y: 0 }; P(2).pos = { x: 30, y: 2 };
  const out = S6.H().freeNear(ctx(), s, cx, cy, 5, null, (x, y) => !XT.lightSafe(S6.H(), x, y) && Math.abs(x - p.pos.x) + Math.abs(y - p.pos.y) <= 4);
  const d = mob('daemon', out.x, out.y, { hp: 5, armor: 0 });
  const hp = total(p);
  S6.actMonsters(ctx(), s);
  assert.equal(total(p), hp, 'ไม่โดนตี');
  assert.ok(!XT.lightSafe(S6.H(), d.pos.x, d.pos.y), 'ไม่เข้าวงไฟ');
});

test('พลเรือน: ค่ำโผล่ · กดพาไป = ตามติดตัว · ถึงเมือง = แต้มรวม +2 + ฉายา', () => {
  setup();
  const s = st(), H = S6.H();
  s.night = true;
  XT.spawnCivs(ctx(), s, H, true);
  const c = XT.civsOf(ctx())[0];
  assert.ok(c && combat.sameTeam(c, P(0)));
  const p = P(0);
  p.pos = H.freeNear(ctx(), s, c.pos.x, c.pos.y, 1, p.id, (x, y) => Math.abs(x - c.pos.x) + Math.abs(y - c.pos.y) === 1);
  actor(p);
  assert.ok(btn(p, 'fd:escort'));
  assert.ok(Fodlan.charAction(p.id, 'fd:escort', null));
  p.pos = { x: 15, y: 6 }; // เข้าเมือง Insomnia
  const score0 = s.score || 0;
  XT.onUnitEnd(ctx(), s, H, p);
  assert.equal(c.alive && !!c.pos, false, 'รอดแล้วหายจากกระดาน');
  assert.equal(s.score, score0 + XT.CIV.score);
  assert.equal(XT.X(s).stats.p0.saves, 1);
});

test('มาตรวัดทีม: ล้มมอนเติม · เต็มแล้วกดถล่มวง 5×5 ดาเมจ 4 · ฉายาจบเกม', () => {
  setup();
  const s = st(), H = S6.H();
  const a = mob('daemon', 14, 13, { hp: 9, armor: 0 }), b = mob('daemon', 15, 14, { hp: 9, armor: 0 }), far = mob('daemon', 20, 13, { hp: 9, armor: 0 });
  const p = P(0); actor(p);
  assert.equal(btn(p, 'fd:barrage'), null);
  XT.addGauge(ctx(), s, XT.GAUGE.max);
  const bt = btn(p, 'fd:barrage');
  assert.ok(bt && !bt.disabled);
  assert.ok(Fodlan.charAction(p.id, 'fd:barrage', { x: 14, y: 13 }));
  assert.equal(a.hp, 9 - XT.GAUGE.dmg); assert.equal(b.hp, 9 - XT.GAUGE.dmg); assert.equal(far.hp, 9);
  assert.equal(XT.X(s).gauge, 0);
  kill(far, P(2));
  const t = Fodlan.publicInfo().board.titles;
  assert.ok(t.some((o) => o.key === 'kills' && o.id === 'p2'));
});

// ---------------------------------------------------------------- PVE รอบสี่ (server/fodlan/eosPerks.js)
const PK = require('../server/fodlan/eosPerks.js');

test('การ์ดอัปเกรดทีม: แต้มถึง 10 = เสนอ 3 ใบ · โหวตครบ = ได้ใบที่เสียงมากสุด · ผลจริง (เดิน/ตีมอน/เสาแกร่ง/ฟื้นไว)', () => {
  setup();
  const s = st();
  s.score = 9; s.pillars[0].owner = S6.PVE;
  S6.scoreRound(ctx(), s);
  const o = PK.PK(s).offer;
  assert.ok(o && o.choices.length === 3, 'มีการ์ดให้เลือก');
  o.choices = ['swift', 'might', 'bastion'];
  const mov0 = action.movOf(P(0));
  for (const i of [0, 1]) Fodlan.charAction(P(i).id, 'fd:perk:swift');
  assert.ok(PK.PK(s).offer, 'ยังโหวตไม่ครบ');
  Fodlan.charAction(P(2).id, 'fd:perk:might');
  assert.equal(PK.PK(s).offer, null);
  assert.deepEqual(PK.PK(s).owned, ['swift']);
  assert.equal(action.movOf(P(0)), mov0 + 1, 'เดิน +1');
  PK.PK(s).owned.push('might', 'bastion', 'phoenix');
  const d = mob('daemon', 14, 13, { hp: 9 });
  assert.ok(Fodlan.atkBonus(P(0), d) >= 1, 'ตีมอน +1');
  assert.equal(S6.pillarHp(s), S6.PILLAR_HP + 1);
  assert.equal(S6.reviveTurns(s), S6.REVIVE_TURNS - 1);
});

test('การ์ดอัปเกรด: โหวตไม่ครบภายในเทิร์น = ตัดสินต้นเทิร์นถัดไป · ทนทาน = เลือดสูงสุด +2', () => {
  setup();
  const s = st();
  s.score = 19; PK.PK(s).nextAt = 1; s.pillars[0].owner = S6.PVE;
  S6.scoreRound(ctx(), s);
  PK.PK(s).offer.choices = ['vital', 'aegis', 'surge'];
  const max0 = combat.maxHpOf(P(0));
  match.roundNumber += 1;
  PK.tickOffer(ctx(), s);
  assert.deepEqual(PK.PK(s).owned, ['vital'], 'ไม่มีใครโหวต = ใบแรก');
  assert.equal(combat.maxHpOf(P(0)), max0 + 2);
});

test('ดาวท้าทาย: เสาหลุด/มีคนล้ม = ดาวดับ · ชนะ = ได้ดาวที่ทำสำเร็จ', () => {
  setup();
  const s = st();
  let c = PK.challengesOf(ctx(), s);
  assert.ok(c.every((x) => x.ok));
  PK.noteLost(s);
  c = PK.challengesOf(ctx(), s);
  assert.equal(c.find((x) => x.key === 'noLoss').ok, false);
  s.result = 'win';
  c = PK.challengesOf(ctx(), s);
  assert.equal(c.filter((x) => x.star).length, 2);
});

test('กำแพงไม้: ขายในร้าน Eos · ใช้แล้ววางช่องข้างตัว มอนเดินผ่านไม่ได้ 3 เทิร์นแล้วหาย', () => {
  setup();
  const s = st(), p = P(0);
  assert.ok(S6.useBarricade(p));
  actor(p);
  const b = btn(p, 'fd:wall');
  assert.ok(b && b.tiles.length);
  const t = b.tiles[0];
  assert.ok(Fodlan.charAction(p.id, 'fd:wall', t));
  assert.ok(Board.isObstacle(action.boardMap(), t.x, t.y), 'เป็นสิ่งกีดขวาง');
  assert.equal(btn(p, 'fd:wall'), null, 'ใช้หมดแล้ว');
  match.roundNumber += PK.WALL.turns + 1;
  PK.tickWalls(ctx(), s);
  assert.ok(!Board.isObstacle(action.boardMap(), t.x, t.y), 'หมดเวลา = หาย');
});

test('โชโกโบะทอง: กลางวันโผล่ วิ่งหนีผู้เล่น · ล้มได้ = เหรียญเยอะ + ของ · ครบเวลาหนีไป', () => {
  setup();
  const s = st(), H = S6.H();
  s.night = false; s.dayNo = 1;
  Math.random = () => 0.01;
  ctx().rng; // ctx.rng = Math.random
  PK.goldTurn(ctx(), s, H, 4);
  Math.random = realRandom;
  const g = PK.goldUnit(ctx(), H);
  assert.ok(g, 'โผล่');
  const near = Math.min(...H.heroes(ctx()).map((p) => H.manhattan(p.pos, g.pos)));
  PK.goldTurn(ctx(), s, H, 5);
  const near2 = Math.min(...H.heroes(ctx()).map((p) => H.manhattan(p.pos, g.pos)));
  assert.ok(near2 >= near, 'วิ่งหนี');
  const gold0 = P(1).gold || 0;
  kill(g, P(1));
  assert.ok((P(1).gold || 0) >= gold0 + PK.GOLD.gold);
});
