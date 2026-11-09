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
      cards: [], statuses: {}, statusAmt: {}, seen: {}, inventory: [],
    };
  }
  engine.setGameMode('ffa');
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

test('หมุด Eos บนลูกโลก: โหวตได้ ffa/duo/trio · เริ่มแมตช์ = แผนที่ Eos ด่าน 6 ไม่มีฉากเดินทาง · ไม่เปลี่ยนด่าน', () => {
  const opts = lobby.modeOptionsFor(4, 'eos').map((o) => o.mode);
  assert.ok(opts.includes('ffa'));
  assert.ok(!opts.includes('moon'));
  assert.equal(lobby.normWorld('eos'), 'eos');
  setup();
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
  combat.dealMixed(p, 1);
  Fodlan.onUnitEnd(P(1));
  assert.ok(!st().riders[p.id]);
  assert.equal(c.x, null);
  assert.equal(action.movOf(p), before);
  const back = c.back;
  match.roundNumber = back - 2; Fodlan.preRound(() => {});
  assert.equal(c.x, null);
  match.roundNumber = back - 1; Fodlan.preRound(() => {});
  assert.ok(c.x != null && Math.abs(c.x - c.home.x) + Math.abs(c.y - c.home.y) <= 2);
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

test('รถ: ชน = ใช้การโจมตี ศัตรูติดรถ 2 ดาเมจ + กระเด็น 1 ช่อง · ผู้โดยสาร (คนขับยอม) ไปกับรถ ไม่ร่วงตอนคนขับโดนตี · คนขับตาย = รถจอด ผู้โดยสารลง', () => {
  setup();
  const p = P(0), q = P(1), r = P(2), car = st().cars[1];
  car.x = 13; car.y = 13; car.driver = p.id; p.pos = { x: 13, y: 13 };
  q.pos = { x: 14, y: 13 };
  actor(p);
  const hp0 = total(q);
  const b = btn(p, 'fd:ram');
  assert.ok(b && b.tiles.some((t) => sameTile(t, q.pos)));
  assert.ok(Fodlan.charAction(p.id, 'fd:ram', { x: 14, y: 13 }));
  assert.equal(total(q), hp0 - S6.CAR_HIT_DMG);
  assert.ok(sameTile(q.pos, { x: 15, y: 13 }) || !q.alive || Board.isObstacle(action.boardMap(), 15, 13));
  assert.ok(p.didAttackRound || match.action.noStrike || (btn(p, 'fd:ram') && btn(p, 'fd:ram').disabled), 'ชนแล้วใช้การโจมตี');
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
  Ride.onAttacked(p, q);
  assert.equal(r.mountId, p.id, 'อยู่ในรถ — ไม่ร่วง');
  // คนขับตาย
  combat.instantDeath ? combat.instantDeath(p, 'test') : (p.alive = false);
  S6.syncCars(ctx(), st());
  assert.equal(car.driver, null);
  assert.ok(!r.mountId);
});

test('ปีศาจ: กลางคืนเกิด 4 ตัวนอกเมือง ห่างคน · ต้นเทิร์นเดินไล่ + ตี 2 · เข้าเมืองไม่ได้ · ฟ้าสางสลาย', () => {
  setup();
  const s = st();
  S6.spawnDaemons(ctx(), s);
  assert.equal(s.daemons.length, S6.DAEMON_COUNT);
  for (const d of s.daemons) {
    assert.ok(!S6.inTown(d.x, d.y));
    for (const p of Object.values(match.players)) assert.ok(Math.abs(p.pos.x - d.x) + Math.abs(p.pos.y - d.y) >= 3);
    assert.equal(action.boardMap().terrain[K(d.x, d.y)], 'fd_eos_daemon');
  }
  s.daemons = [{ id: 'fd:dmT', x: 14, y: 12, hp: 5, armor: 1, kind: 1 }];
  const p = P(0); p.pos = { x: 14, y: 15 };
  P(1).pos = { x: 30, y: 0 }; P(2).pos = { x: 12, y: 4 };
  const hp0 = total(p);
  S6.actDaemons(ctx(), s);
  const d = s.daemons[0];
  assert.equal(Math.abs(d.x - p.pos.x) + Math.abs(d.y - p.pos.y), 1);
  assert.equal(total(p), hp0 - S6.DAEMON_ATK);
  p.pos = { x: 11, y: 4 }; P(1).pos = { x: 9, y: 26 };
  s.daemons = [{ id: 'fd:dmU', x: 14, y: 12, hp: 5, armor: 1, kind: 1 }];
  S6.actDaemons(ctx(), s);
  assert.ok(!S6.inTown(s.daemons[0].x, s.daemons[0].y));
  S6.dissolveDaemons(ctx(), s);
  assert.equal(s.daemons.length, 0);
});

test('ปีศาจ: ตีปกติใส่ได้ (เกราะ 1 ก่อน) ตายได้ 2 เหรียญ · กลางวัน→กลางคืนผ่าน preRound', () => {
  setup();
  const s = st(), p = P(0);
  s.daemons = [{ id: 'fd:dmV', x: 14, y: 13, hp: 2, armor: 1, kind: 2 }];
  actor(p);
  assert.ok(Fodlan.canHitObject(p, 'fd:dmV'));
  const gold0 = p.gold || 0;
  for (let i = 0; i < 6 && s.daemons.length; i++) Fodlan.strikeObject(p, 'fd:dmV');
  assert.equal(s.daemons.length, 0);
  assert.equal((p.gold || 0) - gold0, S6.DAEMON_GOLD);
  const dn = require('../server/dayNight.js');
  let night = 1;
  for (let r = 1; r < 30; r++) if (dn.isNightRound(r)) { night = r; break; }
  s.night = false; match.roundNumber = night - 1;
  Fodlan.preRound(() => {});
  assert.ok(s.daemons.length > 0);
  let day = night;
  while (dn.isNightRound(day)) day++;
  s.night = true; match.roundNumber = day - 1; match.fodlan.s.preRoundDone = 0;
  Fodlan.preRound(() => {});
  assert.equal(s.daemons.length, 0);
});

test('สภาพอากาศ: ฝนฟ้าคะนองเดิน −1 + ฟ้าผ่า 2 · หมอกซ่อนศัตรูนอกระยะเดิน · สงบแล้วพัก 2 เทิร์น', () => {
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
  q.pos = { x: 14, y: 13 };
  assert.ok(!Fodlan.hides(p, q));
  q.pos = { x: 13 + action.movOf(p) + 2, y: 13 };
  assert.ok(Fodlan.hides(p, q), 'หมอกซ่อนนอกระยะเดิน');
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

test('การมองเห็นผู้เล่นอื่น: เห็นในระยะเดิน + 4 ช่อง · ไกลกว่านั้นถูกซ่อน · ตัวเองเห็นเสมอ', () => {
  setup();
  const p = P(0), q = P(1);
  const sight = S6.sideSight(ctx(), p);
  assert.ok(sight && sight.has(K(13, 13)));
  q.pos = { x: 30, y: 0 };
  assert.ok(!sight.has(K(30, 0)));
  assert.ok(Fodlan.hides(p, q), 'ไกลเกินระยะ = ไม่เห็น');
  q.pos = { x: 14, y: 13 };
  assert.ok(!Fodlan.hides(p, q));
  q.pos = { x: 30, y: 0 };
  q.exposedRound = match.roundNumber;
  assert.ok(!Fodlan.hides(p, q));
  q.exposedRound = 0;
  assert.ok(!Fodlan.hides(p, p));
});

test('เสา: ร่ายพิธี 2 ตา → ยึดได้ · ระหว่างนั้นโดนดาเมจ = พิธีแตก', () => {
  setup();
  const p = P(0), pl = st().pillars.find((o) => o.zone === 'insomnia');
  p.pos = { x: pl.x, y: pl.y - 1 };
  match.roundNumber = 2;
  actor(p);
  let b = btn(p, 'fd:seize');
  assert.ok(b && !b.disabled);
  assert.ok(Fodlan.charAction(p.id, 'fd:seize'));
  assert.ok(pl.ch && pl.ch.by === p.id);
  assert.equal(pl.owner, null);
  actor(p);
  assert.ok(btn(p, 'fd:seize').disabled, 'ครั้งที่สองต้องตาถัดไป');
  match.roundNumber = 3;
  actor(p);
  b = btn(p, 'fd:seize');
  assert.ok(b && !b.disabled);
  assert.ok(Fodlan.charAction(p.id, 'fd:seize'));
  assert.equal(pl.owner, S6.sideOf(p));
  assert.equal(pl.ch, null);
  const q = P(1);
  q.pos = { x: pl.x - 1, y: pl.y };
  actor(q);
  assert.ok(Fodlan.charAction(q.id, 'fd:seize'));
  assert.ok(pl.ch && pl.ch.by === q.id);
  combat.dealMixed(q, 1);
  S6.checkChannels(ctx(), st());
  assert.equal(pl.ch, null);
  assert.equal(pl.owner, S6.sideOf(p));
});

test('แต้ม: ถือ 1/2/…/5 ต้น = 1/3/…/15 ต่อเทิร์น · ครบ 20 ชนะ (เกมจบ) · ไม่จบเพราะเหลือรอดคนเดียว', () => {
  setup();
  const s = st(), p = P(0), q = P(1);
  const sp = S6.sideOf(p), sq = S6.sideOf(q);
  s.pillars[0].owner = sp;
  S6.scoreRound(ctx(), s);
  assert.equal(s.scores[sp], 1);
  s.pillars[1].owner = sp; s.pillars[2].owner = sq;
  S6.scoreRound(ctx(), s);
  assert.equal(s.scores[sp], 1 + 3);
  assert.equal(s.scores[sq], 1);
  combat.instantDeath(q, true); combat.instantDeath(P(2), true);
  match.gameState = 'PLAYING';
  assert.equal(endTurn.gameOver(), false);
  assert.notEqual(match.gameState, 'GAMEOVER');
  for (const pl of s.pillars) pl.owner = sp;
  S6.scoreRound(ctx(), s);
  assert.equal(s.scores[sp], 4 + 15);
  assert.equal(Fodlan.eosWinner(), null);
  S6.scoreRound(ctx(), s);
  assert.equal(Fodlan.eosWinner(), p.id);
  const info = Fodlan.publicInfo().board;
  assert.equal(info.goal, S6.SCORE_GOAL);
  assert.equal(info.scores[0].side, sp);
  assert.equal(endTurn.gameOver(), true);
  assert.equal(match.gameState, 'GAMEOVER');
});

test('ตายแล้วฟื้นหลัง 3 เทิร์นที่จุดเกิดที่ไกลศัตรูสุด เลือด/เกราะเต็ม', () => {
  setup();
  match.cycleShift = 2; // กลางวันตลอดช่วงเทสต์ (กลางคืนมีปีศาจเกิด/ตีคนที่เพิ่งฟื้น)
  const p = P(0);
  match.roundNumber = 4;
  combat.instantDeath(p, true);
  assert.equal(p.alive, false);
  Fodlan.onUnitEnd(P(1));
  assert.equal(st().dead[p.id], 4);
  match.roundNumber = 5; match.fodlan.s.preRoundDone = 0; Fodlan.preRound(() => {});
  assert.equal(p.alive, false);
  match.roundNumber = 6; match.fodlan.s.preRoundDone = 0; Fodlan.preRound(() => {});
  assert.equal(p.alive, true);
  assert.equal(p.hp, combat.maxHpOf(p));
  assert.equal(p.armor, combat.maxArmorOf(p));
  const foes = [P(1), P(2)];
  const far = (t) => Math.min(...foes.map((f) => Math.abs(f.pos.x - t.x) + Math.abs(f.pos.y - t.y)));
  const best = Math.max(...Board.MAPS[AREA].spawns.map(far));
  assert.ok(far(p.pos) >= best - 3, 'ฟื้นใกล้จุดเกิดที่ไกลศัตรูสุด');
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
  // ปีศาจไล่คนในเมืองที่ไฟดับได้
  P(1).pos = { x: 30, y: 0 }; p.pos = { x: 1, y: 1 }; // เป้าเดียวในเมือง
  s.daemons = [{ id: 'fd:dmL', x: 15, y: 10, hp: 5, armor: 1, kind: 1 }];
  const q = P(2); q.pos = { x: 13, y: 5 };
  for (let i = 0; i < 3 && !S6.inTown(s.daemons[0].x, s.daemons[0].y); i++) S6.actDaemons(ctx(), s); // ทางประตูกลางมีรถ+เสาไฟขวาง → อ้อมประตูข้าง
  assert.ok(S6.inTown(s.daemons[0].x, s.daemons[0].y), 'ปีศาจเข้าเมืองที่ไฟดับ');
});

test('L9 ผักกิซาล: ขายทุกร้านใน Eos · ศัตรูขี่โชโกโบะในระยะ = ตกนก · ไม่มี = เรียกโชโกโบะมาข้างตัว', () => {
  setup();
  shop.refreshShopForJourney();
  const s = st(), p = P(0), q = P(1);
  assert.ok(S6.gysahlOnSale());
  const c = s.chocos[0];
  q.pos = { x: c.x, y: c.y }; Fodlan.onUnitEnd(q);
  assert.ok(s.riders[q.id]);
  p.pos = { x: q.pos.x - 3, y: q.pos.y };
  assert.ok(S6.useGysahl(p));
  assert.ok(!s.riders[q.id], 'ตกนก');
  // เรียกโชโกโบะมาหา
  p.pos = { x: 13, y: 13 };
  assert.ok(S6.useGysahl(p));
  const near = s.chocos.some((ch) => ch.x != null && !ch.rider && Math.abs(ch.x - 13) + Math.abs(ch.y - 13) === 1);
  assert.ok(near, 'โชโกโบะวิ่งมาข้างตัว');
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
test('L11 ถังน้ำมัน: ตีแล้วระเบิด 3×3 ดาเมจ 2 + ลุกไหม้ · ระเบิดลูกโซ่ · เกิดใหม่ภายหลัง', () => {
  setup();
  const s = st(), p = P(0), q = P(1);
  const b = s.barrels[0];
  p.pos = { x: b.x - 1, y: b.y };
  q.pos = { x: b.x + 1, y: b.y };
  actor(p);
  assert.ok(Fodlan.canHitObject(p, b.id));
  const hq = total(q);
  Fodlan.strikeObject(p, b.id);
  assert.ok(!s.barrels.some((o) => o.id === b.id));
  assert.equal(total(q), hq - S6.BARREL_DMG);
  assert.ok((q.statuses.hburn || 0) > 0, 'ลุกไหม้');
  // ลูกโซ่
  setup();
  const s2 = st();
  s2.barrels = [{ id: 'fd:bA', x: 2, y: 2, home: { x: 2, y: 2 } }, { id: 'fd:bB', x: 3, y: 3, home: { x: 3, y: 3 } }]; // ไม่ใช่จุดร้านค้า (ร้านสุ่มมาเปิดทับได้)
  S6.explodeBarrel(ctx(), s2, s2.barrels[0], P(0));
  assert.equal(s2.barrels.length, 0, 'ถังข้างกันระเบิดต่อ');
  match.roundNumber += 10; match.fodlan.s.preRoundDone = 0;
  S6.respawnProps(ctx(), s2);
  assert.equal(s2.barrels.length, 2, 'เกิดใหม่');
});

test('L12 หินพลังเวท → ขวดเวท · ไฟ = ลุกไหม้+พื้นไฟ · น้ำแข็ง = เชื่องช้า+น้ำเป็นน้ำแข็ง · สายฟ้าลงน้ำช็อตทั้งผืน', () => {
  setup();
  const s = st(), p = P(0), q = P(1);
  S6.respawnProps(ctx(), s);
  assert.equal(s.crystals.length, MAP6.CRYSTALS.length);
  const c = s.crystals[0];
  c.element = 'fire';
  p.pos = nextToTile(c);
  actor(p);
  Fodlan.strikeObject(p, c.id);
  assert.deepEqual(s.flasks[p.id], ['fire']);
  // ไฟ
  p.pos = { x: 13, y: 13 }; q.pos = { x: 15, y: 13 };
  actor(p);
  const b = btn(p, 'fd:flask:fire');
  assert.ok(b && !b.disabled && b.tiles.some((t) => t.x === 15 && t.y === 13));
  assert.ok(Fodlan.charAction(p.id, 'fd:flask:fire', { x: 15, y: 13 }));
  assert.ok((q.statuses.hburn || 0) > 0);
  assert.ok(match.board.flame && Object.keys(match.board.flame).length > 0, 'พื้นไฟ');
  assert.equal((s.flasks[p.id] || []).length, 0);
  // น้ำแข็ง: น้ำลึกริมทะเลสาบกลายเป็นทางเดิน
  setup();
  const s3 = st(), p3 = P(0), q3 = P(1);
  s3.flasks[p3.id] = ['ice'];
  const water = Object.entries(action.boardMap().terrain).find(([, v]) => v === 'fd_eos_water')[0].split(',').map(Number);
  p3.pos = nextToTile({ x: water[0], y: water[1] }) || { x: 13, y: 13 };
  q3.pos = { x: 30, y: 0 };
  actor(p3);
  const tiles = btn(p3, 'fd:flask:ice').tiles;
  const aim = tiles.find((t) => t.x === water[0] && t.y === water[1]);
  assert.ok(aim);
  assert.ok(Fodlan.charAction(p3.id, 'fd:flask:ice', aim));
  assert.ok(!Board.isObstacle(action.boardMap(), water[0], water[1]), 'น้ำแข็งเดินได้');
  // สายฟ้า: คนยืนในน้ำตื้นผืนเดียวกันโดน
  setup();
  const s4 = st(), p4 = P(0), q4 = P(1);
  s4.flasks[p4.id] = ['thunder'];
  const shallow = Object.entries(action.boardMap().special).filter(([, v]) => v === 'fd_eos_shallow').map(([k]) => k.split(',').map(Number));
  const [ax, ay] = shallow[0];
  const far = shallow.find(([x, y]) => Math.abs(x - ax) + Math.abs(y - ay) >= 4);
  q4.pos = { x: far[0], y: far[1] };
  p4.pos = { x: 13, y: 13 };
  const aim2 = { x: ax, y: ay };
  if (Math.abs(aim2.x - 13) + Math.abs(aim2.y - 13) > S6.FLASK_RANGE) p4.pos = nextToTile(aim2);
  actor(p4);
  const hq = total(q4);
  assert.ok(Fodlan.charAction(p4.id, 'fd:flask:thunder', aim2));
  assert.equal(total(q4), hq - S6.SHOCK_DMG, 'ช็อตทั้งผืนน้ำ');
});

test('L13 ป้อมปืน: ยืนติดป้อมบนกำแพง Insomnia ยิงศัตรูในระยะ 6 ดาเมจ 2', () => {
  setup();
  const p = P(0), q = P(1), t = S6.TURRETS[0];
  assert.ok(t);
  p.pos = { x: t.x, y: t.y - 1 };
  q.pos = { x: t.x, y: t.y + 3 };
  actor(p);
  const b = btn(p, 'fd:turret');
  assert.ok(b && !b.disabled && b.tiles.some((c) => c.x === q.pos.x && c.y === q.pos.y));
  const hq = total(q);
  assert.ok(Fodlan.charAction(p.id, 'fd:turret', q.pos));
  assert.equal(total(q), hq - S6.TURRET_DMG);
});

test('L14 สัตว์ยักษ์: ตีคนที่เข้าใกล้ · ถูกตี = ไล่คนตี และตีทุกคนที่ติดตัว · ฆ่าได้ 6 เหรียญ', () => {
  setup();
  const s = st(), p = P(0), q = P(1);
  match.roundNumber = 1;
  S6.respawnProps(ctx(), s);
  const m = s.mobs.find((o) => o.type === 'beast');
  assert.ok(m);
  p.pos = { x: m.x + 1, y: m.y };
  if (Board.isObstacle(action.boardMap(), p.pos.x, p.pos.y)) p.pos = nextToTile(m);
  const hp = total(p);
  S6.actMobs(ctx(), s);
  assert.equal(total(p), hp - S6.BEAST.atk, 'เข้าใกล้ = โดน');
  // ถูกตี → ไล่คนตี
  p.pos = { x: 1, y: 1 };
  q.pos = { x: m.x + 4, y: m.y };
  S6.hurtMob(ctx(), s, m, 1, q);
  assert.equal(m.aggro, q.id);
  S6.actMobs(ctx(), s);
  assert.ok(Math.abs(m.x - q.pos.x) + Math.abs(m.y - q.pos.y) <= 2, 'วิ่งไล่คนตี');
  const g0 = q.gold || 0;
  S6.hurtMob(ctx(), s, m, 99, q);
  assert.ok(!s.mobs.includes(m));
  assert.equal((q.gold || 0) - g0, S6.BEAST.gold);
});

test('L15 ยานลงจอด: เตือน → ต้นเทิร์นถัดไปลงจอด ปล่อยทหารเหล็ก 3 ตัว ไล่ตี · ครบเวลาถอนกลับ', () => {
  setup();
  const s = st();
  Math.random = () => 0.01; // สุ่มติด
  S6.dropshipTurn(ctx(), s, 10);
  Math.random = realRandom;
  assert.ok(s.dropship && s.dropship.state === 'warn');
  assert.ok(Fodlan.publicInfo().board.warn.some((w) => w.kind === 'dropship'));
  S6.dropshipTurn(ctx(), s, 11);
  assert.equal(s.dropship.state, 'landed');
  assert.equal(s.mobs.filter((m) => m.type === 'magitek').length, S6.MAGITEK.count);
  P(0).pos = { x: s.dropship.x + 3, y: s.dropship.y };
  if (Board.isObstacle(action.boardMap(), P(0).pos.x, P(0).pos.y)) P(0).pos = { x: 13, y: 13 };
  const before = s.mobs.map((m) => `${m.x},${m.y}`).join('|');
  S6.actMobs(ctx(), s);
  assert.notEqual(s.mobs.map((m) => `${m.x},${m.y}`).join('|'), before, 'ทหารเหล็กขยับ');
  S6.dropshipTurn(ctx(), s, 11 + S6.MAGITEK.stay);
  assert.equal(s.dropship, null);
  assert.equal(s.mobs.filter((m) => m.type === 'magitek').length, 0);
});
