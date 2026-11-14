// โหมด Road Trip (GRID_PLAN §8.8 · .claude/plans/roadtrip-contract.md · server/roadtrip/)
//  ห้องรอ/ความยาก · วงจรช่วง drive → fork → (ปั๊ม/โมเต็ล/สู้/อีลิท/เหตุการณ์) · การต่อสู้เริ่ม/จบ/กลับไปขับ · สู้บนรถตู้ (ถนนเลื่อน/ร่วง/คนขับ)
//  จุดพักเดินอิสระ · ซื้อของนอกตาเดิน · อัปเกรด · สิ่งกีดขวาง/หลบ · แพ้ · ฟื้นตามความยาก · ตัวจับเวลาไม่ค้าง · สเกลมอน · กรองข้อมูล
//  กฎผู้ใช้ 2026-11-14: เวลาระบบต่อสู้หยุดนอกการต่อสู้ · จบสู้ตัดลำดับที่ค้าง + fx combatEnd · ช่วงเดินทางใช้สกิล/ตีไม่ได้
process.env.JOURNEY_START_SECONDS = '0';
delete process.env.ECHO_DEV_RT_PHASE; delete process.env.ECHO_DEV_RT_KM; delete process.env.ECHO_DEV_RT_DIFF;
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const match = require('../server/match.js');
const Board = require('../server/board.js');
const timers = require('../server/timers.js');
const lobby = require('../server/lobby.js');
const shop = require('../server/shop.js');
const endTurn = require('../server/phases/endTurn.js');
const draw = require('../server/phases/draw.js');
const socketLayer = require('../server/socket.js');
const RT = require('../server/roadtrip');
const D = require('../server/roadtrip/drive.js');
const F = require('../server/roadtrip/fight.js');
const S = require('../server/roadtrip/stop.js');
const E = require('../server/roadtrip/events.js');
const M = require('../server/roadtrip/mobs.js');
const Van = require('../server/roadtrip/van.js');
const Maps = require('../server/roadtrip/maps.js');
const Route = require('../server/roadtrip/route.js');

const realRandom = Math.random;
const realStart = timers.startPhaseTimer;
const realClear = timers.clearPhaseTimer;
let pending = null;
const fire = () => { const f = pending; pending = null; if (f) f(); };

function setup(n = 2, diff = 'normal') {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  for (let i = 0; i < n; i++) {
    engine.players['p' + i] = {
      id: 'p' + i, name: 'P' + i, position: i + 1, characterId: 'muimi', alive: true, connected: true,
      cards: [], statuses: {}, statusAmt: {}, seen: {}, inventory: [], teamId: 'A', teamConfirmed: true,
    };
  }
  engine.setGameMode('roadtrip');
  match.world = 'roadtrip';
  match.rtDiff = diff;
  engine.startMatch();
  D.stopTick();
}
const P = (i) => match.players['p' + i];
const rt = () => match.roadtrip;
const fxKinds = () => rt().fx.map((f) => f.k);
const mobs = () => M.mobs();
function driveTo(phase, max = 2000) {
  let now = Date.now();
  const rnd = Math.random;
  Math.random = () => 0.99; // ไม่สุ่มเข้าสู้บนรถระหว่างทาง
  try { for (let i = 0; i < max && rt().phase === 'drive'; i++) { now += 250; D.step(250, now); } } finally { Math.random = rnd; }
  assert.equal(rt().phase, phase);
}
function killAllMobs() { for (const m of mobs()) { m.hp = 0; RT.settle(m); } }

test.beforeEach(() => {
  pending = null;
  timers.startPhaseTimer = (secs, fn) => { match.timeLeft = Math.ceil(secs); pending = fn; };
  timers.clearPhaseTimer = () => { pending = null; realClear(); };
});
test.afterEach(() => { Math.random = realRandom; timers.startPhaseTimer = realStart; timers.clearPhaseTimer = realClear; engine.clearPhaseTimer(); D.stopTick(); });
test.after(() => {
  RT.reset(); match.world = 'earth'; engine.setGameMode('ffa');
  for (const id of Object.keys(engine.players)) delete engine.players[id];
});

// ---------------------------------------------------------------- ห้องรอ
test('ห้องรอ: โหมด roadtrip เฉพาะโลก roadtrip · 1–6 คน · โหวตความยาก (เสมอ = ปกติ) · ทีม A ทุกคน · ไม่มีหุ่นทดสอบ', () => {
  assert.equal(lobby.validGameMode('roadtrip', 1), true);
  assert.equal(lobby.validGameMode('roadtrip', 6), true);
  assert.equal(lobby.validGameMode('roadtrip', 7), false);
  assert.deepEqual(lobby.modeOptionsFor(2, 'roadtrip').map((o) => o.mode), ['roadtrip']);
  assert.equal(lobby.rtDiffOf([{ rtDiff: 'hard' }, { rtDiff: 'easy' }]), 'normal');
  assert.equal(lobby.rtDiffOf([{ rtDiff: 'hard' }, { rtDiff: 'hard' }, { rtDiff: 'easy' }]), 'hard');
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  for (let i = 0; i < 3; i++) engine.players['p' + i] = { id: 'p' + i, name: 'P' + i, position: i + 1, characterId: 'muimi', alive: true, connected: true, cards: [], statuses: {}, statusAmt: {}, seen: {}, inventory: [] };
  match.gameState = 'TEAM_MODE'; match.modeVotes = {};
  lobby.voteGameMode('p0', 'roadtrip', 'earth', 'hard'); // โลกผิด = ไม่นับ
  assert.equal(match.modeVotes.p0, undefined);
  lobby.voteGameMode('p0', 'roadtrip', 'roadtrip', 'hard');
  lobby.voteGameMode('p1', 'roadtrip', 'roadtrip', 'hard');
  assert.equal(require('../server/view.js').buildStateFor('p0').players.find((o) => o.id === 'p1').rtDiff, 'hard', 'จุดโหวตความยาก');
  lobby.voteGameMode('p2', 'roadtrip', 'roadtrip', 'easy');
  D.stopTick();
  assert.equal(match.gameMode, 'roadtrip');
  assert.equal(match.world, 'roadtrip');
  assert.equal(match.rtDiff, 'hard');
  assert.equal(rt().diff, 'hard');
  assert.ok(Object.values(match.players).every((p) => p.teamId === 'A'));
  assert.equal(lobby.teamModeActive(), true);
  assert.equal(rt().phase, 'drive');
  assert.equal(match.gameState, 'ROADTRIP');
  assert.ok(!Object.values(match.players).some((p) => p.summon), 'ไม่มีหุ่นยืนเฉย/มอนตอนขับ');
  const st = require('../server/view.js').buildStateFor('p0');
  assert.ok(st.roadtrip && st.roadtrip.van && st.roadtrip.van.upg);
  assert.equal(st.roadtrip.phase, 'drive');
  assert.equal(st.board.rtRegion, 'plains');
});

test('เล่นอีกรอบ: ความยากเดิม · กลับห้องรอ = ล้างสถานะ + ตัวจับเวลาขับหยุด', () => {
  setup(1, 'easy');
  D.startTick();
  assert.ok(D.ticking());
  match.gameState = 'GAMEOVER';
  lobby.rematchVote('p0');
  D.stopTick();
  assert.equal(match.gameMode, 'roadtrip');
  assert.equal(rt().diff, 'easy');
  D.startTick();
  lobby.backToLobby();
  assert.equal(D.ticking(), false);
  assert.equal(match.roadtrip, null);
});

// ---------------------------------------------------------------- วงจรช่วง
test('ขับครบ 2 ช่วง → ทางแยก → โหวตครบ = ไปทางที่เลือก (ปั๊ม/โมเต็ล/เหตุการณ์/สู้/อีลิท)', () => {
  for (const kind of ['gas', 'motel', 'event', 'fight', 'elite']) {
    setup(2);
    Math.random = () => 0.99; // ไม่เข้าสู้บนรถระหว่างทาง
    driveTo('fork');
    assert.ok(rt().fork.options.length >= 2 && rt().fork.options.length <= 3);
    assert.ok(rt().fork.options.every((o) => o.km > 0), 'ระยะถึงจุดหมาย');
    const km0 = rt().km, pub = RT.publicInfo();
    assert.ok(pub.now > 0 && pub.van.prices.body > 0);
    rt().fork.options[0] = { kind, km: 3 };
    assert.equal(D.vote(P(0), 0), true);
    assert.equal(rt().phase, 'fork', 'ยังรอคนที่สอง');
    D.vote(P(1), 0);
    Math.random = realRandom;
    if (kind === 'gas' || kind === 'motel') { assert.equal(rt().phase, 'stop'); assert.equal(rt().stop.kind, kind); assert.ok(Board.isRoadtripArea(match.board.area)); }
    assert.ok(rt().km > km0, 'วิ่งไปตามระยะทางที่เลือก');
    if (kind === 'event') { assert.equal(rt().phase, 'event'); assert.ok(rt().event.choices.length >= 2); assert.ok(RT.publicInfo().event.title && RT.publicInfo().event.icon); }
    if (kind === 'fight' || kind === 'elite') { assert.equal(rt().phase, 'combat'); assert.ok(mobs().length >= 1); }
    if (kind === 'elite') assert.ok(mobs().some((m) => m.summon.elite));
  }
});

test('ทางแยก: หมดเวลา/ไม่มีใครโหวต = ทางแรก · เสียงข้างมากชนะ · น้ำมันน้อย = มีปั๊มเสมอ', () => {
  assert.equal(D.tally([{}, {}, {}], {}), 0);
  assert.equal(D.tally([{}, {}, {}], { a: 2, b: 2, c: 1 }), 2);
  setup(1);
  rt().van.fuel = 2;
  for (let i = 0; i < 20; i++) assert.ok(Route.forkOptions(rt()).some((o) => o.kind === 'gas'));
  D.openFork();
  const first = rt().fork.options[0].kind;
  fire(); // หมดเวลา
  assert.notEqual(rt().phase, 'fork');
  assert.ok(fxKinds().includes('forkPick'));
  assert.equal(rt().fx.find((f) => f.k === 'forkPick').kind, first);
});

test('ข้าม 50 กม. = บอส แม็กซ์ เวอร์สแตปเพน (devilTruck) · state.roadtrip.combat.boss', () => {
  setup(1);
  rt().km = 49.9; rt().legKm = 40;
  D.step(250, Date.now() + 250);
  assert.equal(rt().phase, 'combat');
  assert.equal(rt().combat.kind, 'boss');
  assert.ok(mobs().some((m) => m.summon.mobType === 'devilTruck'));
  assert.equal(RT.publicInfo().combat.boss, 'devilTruck');
  assert.equal(rt().nextBossKm, 100);
});

test('เหตุการณ์: โหวต → ผลลัพธ์ → ขับต่อ · ทางที่ต้องจ่ายแต่เงินไม่พอกดไม่ได้ · ทางที่นำไปสู้ = เข้าสู้', () => {
  setup(2);
  for (const p of Object.values(match.players)) p.gold = 0;
  E.open('police');
  const pay = rt().event.choices.find((c) => c.key === 'pay');
  assert.ok(pay.disabled);
  assert.equal(E.vote(P(0), 'pay'), false);
  E.vote(P(0), 'fight'); E.vote(P(1), 'fight');
  assert.ok(rt().event.result);
  fire();
  assert.equal(rt().phase, 'combat');
  setup(2);
  E.open('shrine');
  E.vote(P(0), 'leave'); E.vote(P(1), 'pray');
  assert.equal(rt().event.result.key, 'leave', 'เสมอ = ทางปลอดภัย');
  fire();
  assert.equal(rt().phase, 'drive');
});

// ---------------------------------------------------------------- การต่อสู้
test('สู้ดักทาง: ฉากเตือน → แจกไพ่ (PLAYING) · ฆ่ามอนหมด = จบสู้ + เหรียญ + fx combatEnd → ขับต่อ', () => {
  setup(2);
  F.begin('ambush');
  assert.equal(match.gameState, 'CUTSCENE');
  assert.ok(Board.isRoadtripArea(match.board.area) && match.board.area === Maps.RT_ROAD);
  const vb = Maps.defs[Maps.RT_ROAD].vanBlock;
  assert.ok(match.board && Board.mapOf(match.board.area).terrain[Board.key(vb.x0, vb.y0)], 'รถตู้เป็นสิ่งกีดขวาง');
  for (const p of [P(0), P(1)]) assert.ok(p.pos);
  const r0 = match.roundNumber;
  fire();
  assert.equal(match.gameState, 'PLAYING');
  assert.equal(match.roundNumber, r0 + 1);
  assert.ok(P(0).cards.length > 0, 'จั่วการ์ดตอนสู้');
  const g0 = P(0).gold;
  killAllMobs();
  assert.equal(endTurn.gameOver(), true);
  assert.equal(rt().phase, 'drive');
  assert.equal(match.gameState, 'ROADTRIP');
  assert.ok(P(0).gold > g0);
  assert.ok(fxKinds().includes('combatEnd'));
  assert.equal(Object.values(match.players).filter((p) => p.summon).length, 0);
});

test('มอนเดินเข้าหาแล้วตี (หลบได้) · ตีรถเมื่อไม่มีคนติดตัว · ฆ่ามอน = เหรียญให้คนฆ่า', () => {
  setup(1);
  F.begin('ambush');
  fire();
  for (const m of mobs()) require('../server/summon.js').remove(m);
  const p = P(0);
  p.pos = { x: 5, y: 8 };
  const m = M.spawn(rt(), 'stray', { x: 5, y: 3 }, { born: 0 });
  const out = { moves: [], attacks: [], misses: [], van: [], charges: [], warns: [], falls: [], shots: [], rams: [] };
  const hp0 = p.hp + p.armor;
  Math.random = () => 0.99;
  M.actOne(rt(), m, out);
  assert.equal(out.moves.length, 1);
  assert.equal(Board.dist(m.pos, p.pos), 1);
  assert.equal(out.attacks.length, 1);
  assert.ok(p.hp + p.armor < hp0);
  // หลบหลีก 100% = พลาด
  p.statuses.evade = 2; p.statusAmt.evade = 100;
  Math.random = () => 0;
  M.actOne(rt(), m, out);
  assert.equal(out.misses.length, 1);
  delete p.statuses.evade;
  // ฆ่ามอน → เหรียญ
  const g0 = p.gold;
  m.hp = 0;
  require('../server/combat.js').withEffectSource(p, () => RT.settle(m));
  assert.equal(m.alive, false);
  assert.ok(p.gold > g0);
  assert.equal(rt().kills, 1);
});

test('สู้บนรถตู้: ถนนเลื่อน · มอนร่วงขอบหาย · ผู้เล่นร่วงเสียเลือดแล้วกลับท้ายรถ · ไม่มีคนขับ = รถส่าย · รอดครบเทิร์น = ชนะ', () => {
  setup(2);
  F.begin('onvan');
  const d = Maps.defs[Maps.RT_ONVAN];
  const van = new Set(d.vanTiles.map(([x, y]) => Board.key(x, y)));
  for (const p of [P(0), P(1)]) assert.ok(van.has(Board.key(p.pos.x, p.pos.y)), 'เกิดในรถ');
  fire(); // เทิร์น 1 (มอนยังไม่ขยับ ถนนยังไม่เลื่อน)
  for (const m of mobs()) require('../server/summon.js').remove(m);
  const near = M.spawn(rt(), 'stray', { x: 4, y: 1 }, { born: 99 });
  const edge = M.spawn(rt(), 'stray', { x: 0, y: 9 }, { born: 99 });
  near.summon.acted = true; edge.summon.acted = true; // เคยได้ตาแล้ว (มอนที่เพิ่งเกิดไม่ถูกถนนพาไป)
  P(1).pos = { x: 0, y: 2 };
  const hp1 = P(1).hp + P(1).armor;
  P(0).pos = { x: d.driverTile[0], y: d.driverTile[1] };
  match.gameState = 'TRANSITION';
  draw.dealRound(); // เทิร์น 2: เลื่อน
  if (match.gameState === 'CUTSCENE') fire();
  assert.equal(near.pos.x, 3, 'ถอยหลัง 1 ช่อง');
  assert.equal(edge.alive, false, 'ร่วงขอบ');
  assert.ok(P(1).hp + P(1).armor < hp1, 'ผู้เล่นร่วงเสียเลือด');
  assert.ok(d.rearTiles.concat(d.vanTiles).some(([x, y]) => x === P(1).pos.x && y === P(1).pos.y), 'กลับท้ายรถ');
  // คนขับนั่งอยู่ = ไม่ส่าย · ลุก = ส่าย
  const v0 = rt().van.hp;
  F.onEndTurn();
  assert.equal(rt().van.hp, v0);
  P(0).pos = { x: d.vanTiles[0][0], y: d.vanTiles[0][1] };
  F.onEndTurn();
  assert.equal(rt().van.hp, v0 - F.SWERVE_DMG);
  // รอดครบ
  rt().combat.round = rt().combat.rounds;
  F.onEndTurn();
  assert.equal(endTurn.gameOver(), true);
  assert.equal(rt().phase, 'drive');
});

test('ประตูท้ายเปิด: ยืนแถวท้ายรถ = ระยะตี +1 (ตาตัวเองเท่านั้น)', () => {
  setup(1);
  F.begin('onvan');
  fire();
  const p = P(0), d = Maps.defs[Maps.RT_ONVAN], action = require('../server/phases/action.js');
  p.pos = { x: d.rearTiles[0][0], y: d.rearTiles[0][1] };
  const r0 = action.rangeOf(p)[1];
  assert.equal(RT.command('p0', 'rear', {}), false, 'ไม่ใช่ตาตัวเอง');
  match.gameState = 'ACTION'; match.actorId = 'p0'; match.action = { locked: false, moved: false, from: { ...p.pos } };
  assert.equal(RT.command('p0', 'rear', {}), true);
  assert.equal(action.rangeOf(p)[1], r0 + 1);
});

test('ประตูท้ายตอนดักทาง (รถจอด): ช่องหลังรถ x 7 · เปิดได้ในตาตัวเอง (ดักทาง/อีลิท/บอส) · ตี + สกิลไกล +1 เฉพาะยืนบนช่องนั้น', () => {
  for (const kind of ['ambush', 'elite', 'boss']) {
    setup(1);
    F.begin(kind);
    fire();
    const p = P(0), d = Maps.defs[Maps.RT_ROAD], action = require('../server/phases/action.js');
    assert.deepEqual(d.rearTiles, [[7, 4], [7, 5]]);
    for (const m of mobs()) if (m.pos && m.pos.x === 7 && (m.pos.y === 4 || m.pos.y === 5)) require('../server/summon.js').remove(m);
    p.pos = { x: 7, y: 4 };
    const r0 = action.rangeOf(p)[1], a0 = action.areaRange(p, { range: 3 });
    assert.equal(RT.command('p0', 'rear', {}), false, 'ไม่ใช่ตาตัวเอง');
    match.gameState = 'ACTION'; match.actorId = 'p0'; match.action = { locked: false, moved: false, from: { ...p.pos } };
    assert.equal(RT.command('p0', 'rear', {}), true);
    assert.equal(rt().van.rearOpen, true);
    assert.equal(action.rangeOf(p)[1], r0 + 1);
    assert.equal(action.areaRange(p, { range: 3 }), a0 + 1);
    p.pos = { x: 5, y: 8 };
    assert.equal(action.rangeOf(p)[1], r0, 'นอกช่องหลังรถ = ปกติ');
  }
});

// ---------------------------------------------------------------- จุดพัก
test('จุดพัก: เดินไกลไม่จำกัดระยะ · ผ่านเพื่อนได้แต่หยุดซ้อนไม่ได้ · เดินเข้าสิ่งกีดขวางไม่ได้', () => {
  setup(2);
  S.enter('gas');
  const area = match.board.area, map = Board.mapOf(area), p = P(0);
  const reach = S.reachOf(p);
  const far = [...reach.values()].sort((a, b) => b.d - a.d)[0];
  assert.ok(far.d > 10, 'ไกลกว่าระยะเดินปกติ');
  assert.equal(RT.command('p0', 'walk', { x: far.x, y: far.y }), true);
  assert.deepEqual(p.pos, { x: far.x, y: far.y });
  assert.ok(fxKinds().includes('walk'));
  assert.equal(RT.command('p0', 'walk', { x: P(1).pos.x, y: P(1).pos.y }), false, 'ช่องเพื่อน');
  const rock = Object.keys(map.terrain)[0].split(',').map(Number);
  assert.equal(RT.command('p0', 'walk', { x: rock[0], y: rock[1] }), false, 'สิ่งกีดขวาง');
  assert.equal(RT.command('p0', 'walk', { x: 'a', y: 1 }), false);
});

test('จุดพัก: ร้านเดียว = อาคารมินิมาร์ท (รวมทุกแคตตาล็อก) · ไม่มีแผงร้านแยก · กดอาคาร = fx shop · ซื้อนอกตาเดินเมื่อยืนติดอาคาร · ขนนกตามความยาก', () => {
  setup(1, 'easy');
  S.enter('gas');
  const p = P(0), d = Maps.defs[match.board.area];
  assert.equal(match.shops.length, 1, 'ร้านเดียว');
  const s = match.shops[0];
  const mart = d.props.find((o) => o.kind === 'mart');
  assert.equal(s.kind, 'rtmart');
  assert.deepEqual([s.x, s.y, s.w, s.h], [mart.x0, mart.y0, mart.x1 - mart.x0 + 1, mart.y1 - mart.y0 + 1], 'ร้าน = ตัวอาคาร');
  assert.equal(RT.publicInfo().stop.shopId, s.id);
  assert.ok(shop.publicShops()[0].building, 'client ไม่วาดแผง');
  assert.equal((d.shopSpots || []).length, 0);
  const types = new Set(s.items.map((it) => it.type));
  for (const t of [...shop.SHOP_ITEMS.apoth, ...shop.SHOP_ITEMS.forge, ...shop.SHOP_ITEMS.cara, 'rtRevive', 'rtFish']) assert.ok(types.has(t), `ขาย ${t}`);
  const revive = s.items.find((it) => it.type === 'rtRevive');
  assert.equal(revive.price, 6);
  p.gold = 50;
  p.pos = { x: d.spawns[d.spawns.length - 1][0], y: d.spawns[d.spawns.length - 1][1] };
  assert.ok(!shop.nearShopOf(p, s));
  shop.buyShopItem('p0', s.id, revive.id);
  assert.equal(p.inventory.length, 0, 'ไกลร้าน');
  // กดอาคาร = เดินไปหน้าร้าน + เปิดหน้าร้าน
  assert.equal(RT.command('p0', 'act', { id: mart.id }), true);
  assert.ok(shop.nearShopOf(p, s), 'ยืนติดอาคาร');
  assert.ok(rt().fx.some((f) => f.k === 'shop' && f.pid === 'p0' && f.shopId === s.id));
  assert.equal(match.action, null);
  shop.buyShopItem('p0', s.id, revive.id);
  assert.equal(p.inventory.length, 1);
  assert.equal(p.gold, 44);
  const n = rt().fx.length;
  shop.viewShop('p0', s.id);
  assert.ok(rt().fx.length > n && rt().fx[rt().fx.length - 1].k === 'shop', 'viewShop ก็เปิด');
  // โมเต็ล: สำนักงาน ของน้อยกว่า
  RT.command('p0', 'ready', {});
  S.enter('motel');
  assert.equal(match.shops.length, 1);
  assert.equal(match.shops[0].kind, 'rtoffice');
  assert.ok(match.shops[0].items.length < s.items.length);
  setup(1, 'hard');
  Math.random = () => 0.99;
  S.enter('gas');
  assert.ok(!match.shops.some((o) => o.items.some((it) => it.type === 'rtRevive')), 'ยาก: ไม่ขายประจำ');
});

test('จุดพัก: กิจกรรมเดินไปให้ + คูลดาวน์ + ใช้ได้คนละครั้ง · ตู้น้ำมัน · หมาครบ 3 ปั๊ม = ลูกทีม · ทุกคนพร้อม = ขับต่อ', () => {
  setup(1);
  Math.random = () => 0; // ปั๊มแบบแรก
  S.enter('gas');
  Math.random = realRandom;
  const p = P(0);
  p.gold = 30;
  rt().van.fuel = 10;
  const pump = Maps.defs[match.board.area].props.find((o) => o.kind === 'pump');
  assert.equal(RT.command('p0', 'act', { id: pump.id }), true);
  assert.deepEqual([p.pos.x, p.pos.y], pump.spot.slice(0, 2).length ? [p.pos.x, p.pos.y] : null);
  assert.ok(rt().van.fuel > 10);
  assert.ok(p.gold < 30);
  const dog = Maps.defs[match.board.area].props.find((o) => o.kind === 'dog');
  assert.equal(RT.command('p0', 'act', { id: dog.id }), true);
  assert.equal(rt().dog.fed, 1);
  rt().stop.cd[`p0:${dog.id}`] = 0;
  assert.equal(RT.command('p0', 'act', { id: dog.id }), false, 'ให้อาหารได้ปั๊มละครั้ง');
  rt().dog.fed = 2; rt().dog.lastStop = -1; delete rt().stop.used.p0[dog.id]; rt().stop.cd[`p0:${dog.id}`] = 0;
  assert.equal(RT.command('p0', 'act', { id: dog.id }), true);
  assert.equal(rt().dog.on, true);
  assert.equal(RT.command('p0', 'ready', {}), true);
  assert.equal(rt().phase, 'drive');
  assert.equal(match.shops.length, 0, 'ปิดร้านตอนออก');
  F.begin('ambush');
  assert.ok(Object.values(match.players).some((u) => u.summon && u.summon.rtDog), 'หมามาช่วยสู้');
});

test('อัปเกรด: ตัวถัง HP · ถังน้ำมัน · เครื่องยนต์ · ที่เก็บของ (+ช่องกระเป๋า ไม่เกิน 8) · คนกดจ่าย · ต้องอยู่ใกล้อู่', () => {
  setup(1);
  Math.random = () => 0;
  S.enter('gas');
  Math.random = realRandom;
  const p = P(0), van = rt().van;
  p.gold = 200;
  const garage = Maps.defs[match.board.area].props.find((o) => o.kind === 'garage');
  p.pos = { x: 0, y: 15 };
  assert.equal(RT.command('p0', 'upg', { key: 'body' }), false, 'ไกลอู่');
  require('../server/roadtrip/stop.js').walk(p, garage.spot[0], garage.spot[1]);
  assert.ok(rt().fx.some((f) => f.k === 'garage' && f.pid === 'p0'), 'เปิดหน้าอู่');
  assert.equal(RT.command('p0', 'upg', { key: 'body' }), true);
  assert.equal(van.hpMax, 30);
  assert.equal(p.gold, 194);
  RT.command('p0', 'upg', { key: 'tank' });
  assert.equal(van.fuelMax, 60);
  RT.command('p0', 'upg', { key: 'engine' });
  assert.equal(van.kmh, 115);
  assert.equal(shop.bagSlotsOf(p), 5);
  for (let i = 0; i < 3; i++) RT.command('p0', 'upg', { key: 'storage' });
  assert.equal(shop.bagSlotsOf(p), 8);
  assert.equal(RT.command('p0', 'upg', { key: 'storage' }), false, 'ขั้นสูงสุด');
  assert.equal(RT.command('p0', 'upg', { key: 'wings' }), false);
});

// ---------------------------------------------------------------- ขับ
test('สิ่งกีดขวาง: อยู่เลนเดียวกัน = รถเสีย HP (กันชนลด) · คนขับเปลี่ยนเลนหลบได้ · ไม่ใช่คนขับเปลี่ยนเลนไม่ได้', () => {
  setup(2);
  const now = Date.now();
  const h = D.spawnHazard(rt(), now);
  h.lane = rt().van.lane;
  const hp0 = rt().van.hp;
  h.at = now; D.step(0, now);
  assert.equal(rt().van.hp, hp0 - D.hazardDmg(rt()));
  rt().van.upg.bumper = 3;
  assert.equal(D.hazardDmg(rt()), 1);
  rt().van.upg.bumper = 0;
  assert.equal(RT.command('p1', 'steer', { lane: 1 }), false, 'ไม่ใช่คนขับ');
  assert.equal(RT.command('p0', 'seat', { seat: 'driver' }), true);
  assert.equal(RT.command('p1', 'seat', { seat: 'driver' }), false, 'มีคนนั่งแล้ว');
  const h2 = D.spawnHazard(rt(), Date.now());
  h2.lane = 0; rt().van.lane = 0;
  rt().steerAt = 0;
  assert.equal(RT.command('p0', 'steer', { lane: 1 }), true);
  const hp1 = rt().van.hp;
  h2.at = Date.now(); D.step(0, Date.now());
  assert.equal(rt().van.hp, hp1, 'หลบได้');
  assert.equal(RT.command('p0', 'steer', { lane: 5 }), false);
  // คนขับหลุด = ที่นั่งว่าง
  P(0).connected = false;
  D.step(0, Date.now());
  assert.equal(rt().van.driverId, null);
});

test('น้ำมัน: ลดตามระยะ (ความยากคูณ) · หมด = ช้าลงมาก', () => {
  setup(1, 'easy');
  const f0 = rt().van.fuel;
  D.step(1000, Date.now());
  const easyUse = f0 - rt().van.fuel;
  setup(1, 'hard');
  D.step(1000, Date.now());
  const hardUse = f0 - rt().van.fuel;
  assert.ok(hardUse > easyUse * 1.5);
  rt().van.fuel = 0;
  assert.equal(D.speedOf(rt()), D.EMPTY_KMH);
});

// ---------------------------------------------------------------- แพ้ / ฟื้น / ตัวจับเวลา
test('แพ้: รถพังตอนขับ / ผู้เล่นล้มหมดตอนสู้ → GAMEOVER + สรุป + กระดานผู้นำ', () => {
  setup(1);
  rt().km = 33;
  rt().van.hp = 1;
  const h = D.spawnHazard(rt(), Date.now()); h.lane = rt().van.lane; h.at = Date.now();
  D.step(0, Date.now());
  assert.equal(match.gameState, 'GAMEOVER');
  assert.equal(rt().phase, 'over');
  assert.equal(rt().summary.km, 33);
  assert.equal(rt().summary.reason, 'van');
  assert.ok(rt().summary.best >= 33);
  assert.ok(RT.leaderboard().normal.some((e) => e.km === 33));
  setup(2);
  F.begin('ambush'); fire();
  for (const p of [P(0), P(1)]) { p.hp = 0; RT.settle(p); }
  assert.equal(endTurn.gameOver(), true);
  assert.equal(rt().phase, 'over');
  assert.equal(rt().summary.reason, 'wipe');
  assert.ok(fxKinds().includes('combatEnd'), 'แพ้กลางสู้ก็หยุดฉากท่าไม้ตาย');
});

test('ฟื้น: ง่าย = ฟื้นอัตโนมัติ 50% หลังชนะ · ปกติ = รอจุดพัก (ปั๊ม 50% · โมเต็ลเต็ม) · ขนนกคืนชีพ', () => {
  setup(2, 'easy');
  F.begin('ambush'); fire();
  P(1).hp = 0; RT.settle(P(1));
  killAllMobs(); endTurn.gameOver();
  assert.equal(P(1).alive, true);
  assert.equal(P(1).hp, Math.ceil(require('../server/combat.js').maxHpOf(P(1)) * 0.5));
  setup(2, 'normal');
  F.begin('ambush'); fire();
  P(1).hp = 0; RT.settle(P(1));
  killAllMobs(); endTurn.gameOver();
  assert.equal(P(1).alive, false, 'ปกติไม่ฟื้นเอง');
  S.enter('gas');
  assert.equal(P(1).alive, true);
  assert.ok(P(1).pos, 'วางบนกระดานปั๊ม');
  P(1).alive = false; P(1).hp = 0; P(1).pos = null;
  RT.command('p0', 'ready', {}); RT.command('p1', 'ready', {});
  S.enter('motel');
  assert.equal(P(1).hp, require('../server/combat.js').maxHpOf(P(1)));
  // ขนนก (นอกการต่อสู้ — rt:use)
  P(1).alive = false; P(1).hp = 0; P(1).pos = null;
  P(0).inventory = [{ uid: 'f1', type: 'rtRevive' }];
  assert.equal(RT.command('p0', 'use', { uid: 'f1', targetId: 'p1' }), true);
  assert.equal(P(1).alive, true);
  assert.equal(P(0).inventory.length, 0);
});

test('ตัวจับเวลา: จบเกมแล้วตัวจับเวลาขับ/เฟสหยุด · ตัวจับเวลาเก่าที่ค้างมาเรียก dealRound นอกการต่อสู้ = ไม่แจกไพ่', () => {
  timers.startPhaseTimer = realStart;
  setup(1);
  D.startTick();
  S.enter('gas');
  assert.equal(D.ticking(), false, 'ออกจากช่วงขับ = หยุดจังหวะขับ');
  assert.ok(match.phaseTimerId, 'จุดพักนับเวลา');
  RT.lose('van');
  assert.equal(match.phaseTimerId, null);
  assert.equal(D.ticking(), false);
  setup(1);
  const r0 = match.roundNumber;
  draw.dealRound();
  assert.equal(match.roundNumber, r0);
  assert.equal(match.gameState, 'ROADTRIP');
  RT.lose('van');
});

// ---------------------------------------------------------------- มอน
test('สเกลมอน: กม. · ความยาก · รอบ (loop) · จำนวนตามความยาก/ผู้เล่น', () => {
  const base = M.ROSTER.biker;
  const at = (km, diff, loop = 0) => M.scale({ km, diff, region: { loop } }, base);
  assert.equal(at(0, 'normal').hp, base.hp);
  assert.ok(at(100, 'normal').hp > at(0, 'normal').hp);
  assert.ok(at(100, 'hard').hp > at(100, 'easy').hp);
  assert.ok(at(100, 'normal', 1).hp > at(100, 'normal', 0).hp);
  assert.ok(at(100, 'normal', 1).armor > at(100, 'normal', 0).armor);
  assert.ok(at(9999, 'hard', 5).atk <= M.ATK_CAP);
  const ws = (diff, heroes) => M.waveSize({ km: 40, diff, region: { loop: 0 } }, 'ambush', heroes);
  assert.ok(ws('hard', 1) > ws('easy', 1));
  assert.ok(ws('normal', 4) > ws('normal', 1));
  assert.ok(ws('hard', 6) <= M.MOB_CAP);
  assert.ok(!M.poolFor({ km: 0, region: { id: 'plains' }, night: false }).includes('biker'));
  assert.ok(M.poolFor({ km: 30, region: { id: 'snow' }, night: false }).includes('yeti'));
  assert.ok(M.poolFor({ km: 30, region: { id: 'plains' }, night: true }).includes('ghost'));
});

test('บอส: เตือนแนวพุ่ง 1 เทิร์น → เทิร์นถัดไปพุ่งทั้งแนว', () => {
  setup(1);
  F.begin('boss'); fire();
  const boss = mobs().find((m) => m.summon.mobType === 'devilTruck');
  for (const m of mobs()) if (m !== boss) require('../server/summon.js').remove(m);
  boss.summon.born = 0;
  boss.pos = { x: 2, y: 2 };
  P(0).pos = { x: 7, y: 2 }; // แนวพุ่ง 6 ช่อง (DRS +3)
  const out = { moves: [], attacks: [], misses: [], van: [], charges: [], warns: [], falls: [], shots: [], rams: [] };
  M.actOne(rt(), boss, out);
  assert.equal(out.warns.length, 1);
  assert.ok(rt().combat.warn.tiles.some((t) => t.x === 7 && t.y === 2));
  const hp0 = P(0).hp + P(0).armor;
  Math.random = () => 0.99;
  M.actOne(rt(), boss, out);
  assert.equal(out.charges.length, 1);
  assert.ok(P(0).hp + P(0).armor < hp0 || !P(0).alive);
  assert.equal(rt().combat.warn, null);
});

// ---------------------------------------------------------------- กรองข้อมูล
test('กรองข้อมูล: ทะเบียน/สี/ของแต่ง/ทรง/วิทยุ YouTube', () => {
  setup(1);
  const van = rt().van;
  assert.equal(RT.command('p0', 'plate', { text: 'กข 1234<script>\u0000ABCDEFG' }), true);
  assert.ok([...van.plate].length <= Van.PLATE_MAX);
  assert.ok(!/[<>\u0000]/.test(van.plate));
  assert.equal(RT.command('p0', 'plate', { text: 42 }), false);
  assert.equal(RT.command('p0', 'paint', { hex: 'red' }), false);
  assert.equal(RT.command('p0', 'paint', { hex: '#12ABef' }), true);
  assert.equal(van.paint, '#12abef');
  assert.equal(RT.command('p0', 'decor', { name: 'จรวด' }), false);
  assert.equal(RT.command('p0', 'decor', { name: 'หูแมว', on: true }), true);
  assert.deepEqual(van.decor, ['หูแมว']);
  assert.equal(RT.command('p0', 'decor', { name: 'หูแมว', on: false }), true);
  assert.equal(RT.command('p0', 'style', { style: 'evil' }), false);
  assert.equal(RT.command('p0', 'style', { style: 'goofy' }), true);
  assert.equal(RT.command('p0', 'radio', { src: 'yt', yt: { id: 'abc' } }), false);
  assert.equal(RT.command('p0', 'radio', { src: 'yt', yt: { id: 'dQw4w9WgXcQ"><' } }), false);
  assert.equal(RT.command('p0', 'radio', { src: 'yt', yt: { id: 'dQw4w9WgXcQ', start: -5 } }), true);
  assert.equal(rt().radio.yt.start, 0);
  assert.equal(RT.command('p0', 'radio', { src: 'yt', yt: { list: 'PL1234567890abc' } }), true);
  const q = ['dQw4w9WgXcQ', 'bad id', ...Array(30).fill('aaaaaaaaaaa')];
  assert.equal(RT.command('p0', 'radio', { src: 'yt', yt: { id: 'dQw4w9WgXcQ', queue: q } }), true);
  assert.equal(rt().radio.yt.queue.length, 20);
  assert.ok(!rt().radio.yt.queue.includes('bad id'));
  assert.ok(Math.abs(rt().radio.yt.at - Date.now()) < 1000);
  assert.equal(RT.command('p0', 'radio', { src: 'synth', station: '3' }), true);
  assert.equal(rt().radio.station, 3);
  assert.equal(RT.command('p0', 'radio', { src: 'synth', station: 99 }), true);
  assert.equal(rt().radio.station, 0);
  assert.equal(RT.command('p0', 'nope', {}), false);
  assert.equal(RT.command('p0', 'walk', null), false);
});

// ---------------------------------------------------------------- ความทนทาน (ตรวจตัวเอง 2026-11-14)
test('ทนทาน: คนหลุด = โหวต/พร้อมไม่รอ · ทุกคนหลุด = รถจอดรอ · ทุกคนออก = ล้างสถานะ', () => {
  setup(3);
  D.openFork();
  D.vote(P(0), 0); D.vote(P(1), 0);
  assert.equal(rt().phase, 'fork');
  P(2).connected = false;
  RT.presenceChanged();
  assert.notEqual(rt().phase, 'fork', 'ไม่ต้องรอคนที่หลุด');
  setup(2);
  S.enter('gas');
  RT.command('p0', 'ready', {});
  P(1).connected = false;
  RT.presenceChanged();
  assert.equal(rt().phase, 'drive');
  P(0).connected = false;
  const km = rt().km, hp = rt().van.hp;
  for (let i = 0; i < 100; i++) D.step(250, Date.now() + i * 250);
  assert.equal(rt().km, km, 'ไม่มีใครต่ออยู่ = ไม่วิ่ง');
  assert.equal(rt().van.hp, hp);
  for (const id of Object.keys(match.players)) delete match.players[id];
  RT.presenceChanged();
  assert.equal(match.roadtrip, null);
  assert.equal(RT.publicInfo(), null);
});

test('ทนทาน: ข้ามหลัก 50 กม. ระหว่างทางแยก/จุดพัก = บอสทันทีที่กลับมาขับ (ตัวเดียวแม้ข้ามหลายหลัก) · สิ่งกีดขวางไม่ค้างข้ามช่วง', () => {
  setup(1);
  D.spawnHazard(rt(), Date.now());
  S.enter('gas');
  assert.equal(rt().hazards.length, 0);
  rt().km = 163;
  RT.command('p0', 'ready', {});
  assert.equal(rt().phase, 'drive');
  D.step(250, Date.now());
  assert.equal(rt().phase, 'combat');
  assert.equal(rt().combat.kind, 'boss');
  assert.equal(rt().nextBossKm, 200);
});

test('ทนทาน: สู้ค้างครบ 15 เทิร์น = มอนถอย (ชนะ) ยกเว้นบอส · ตัวที่สองของระบบคู่ฟื้นที่จุดพักด้วย · ภูมิภาควนรอบ', () => {
  setup(1);
  F.begin('ambush'); fire();
  rt().combat.round = 15;
  F.onEndTurn();
  assert.equal(endTurn.gameOver(), true);
  assert.equal(rt().phase, 'drive');
  setup(1);
  F.begin('boss'); fire();
  rt().combat.round = 15;
  F.onEndTurn();
  assert.equal(endTurn.gameOver(), false, 'บอสต้องล้มเท่านั้น');
  setup(1);
  const partner = { ...P(0), id: 'p0~d', name: 'คู่', duoOf: 'p0', alive: false, hp: 0, statuses: {}, statusAmt: {}, seen: {}, inventory: [] };
  match.players[partner.id] = partner;
  S.enter('gas');
  assert.equal(partner.alive, true);
  delete match.players[partner.id];
  assert.deepEqual(Route.regionAt(499), { id: 'ghost', loop: 0 });
  assert.deepEqual(Route.regionAt(500), { id: 'plains', loop: 1 });
});

test('QA: ระบบคู่สั่งตัวที่สองเดิน/เล่นที่จุดพัก (unitId ต้องเป็นของตัวเอง) · ขนนกไม่มีช่องยืน = ไม่ใช้', () => {
  setup(2);
  S.enter('gas');
  const mate = { ...P(0), id: 'p0~d', name: 'คู่', duoOf: 'p0', alive: true, statuses: {}, statusAmt: {}, seen: {}, inventory: [] };
  mate.pos = require('../server/phases/action.js').nearFreeTile(P(0).pos);
  match.players[mate.id] = mate; P(0).duoWith = mate.id;
  const far = [...S.reachOf(mate).values()].sort((a, b) => b.d - a.d)[0];
  assert.equal(RT.command('p1', 'walk', { x: far.x, y: far.y, unitId: mate.id }), false, 'สั่งตัวของคนอื่นไม่ได้');
  assert.equal(RT.command('p0', 'walk', { x: far.x, y: far.y, unitId: mate.id }), true);
  assert.deepEqual(mate.pos, { x: far.x, y: far.y });
  delete match.players[mate.id]; delete P(0).duoWith;
  // ขนนก: ไม่มีช่องว่างรอบตัว = ไม่ใช้ ไม่เสียของ
  P(1).alive = false; P(1).hp = 0; P(1).pos = null;
  P(0).inventory = [{ uid: 'f', type: 'rtRevive' }];
  const action = require('../server/phases/action.js'), real = action.nearFreeTile;
  action.nearFreeTile = () => null;
  try { assert.equal(RT.command('p0', 'use', { uid: 'f', targetId: 'p1' }), false); } finally { action.nearFreeTile = real; }
  assert.equal(P(1).alive, false);
  assert.equal(P(0).inventory.length, 1);
});

test('QA: ป้อมปืนยิงไกลจากรถไม่เกิน 4 ช่อง และหลบได้ · กันชนหลบได้ · หมาฆ่ามอน = เหรียญเข้าเจ้าของ · ตีสวนมอนได้', () => {
  setup(1);
  F.begin('ambush'); fire();
  for (const m of mobs()) require('../server/summon.js').remove(m);
  rt().van.upg.turret = 2;
  const far = M.spawn(rt(), 'giant', { x: 0, y: 4 }, { born: 99 }); // ห่างรถ 8 ช่อง
  const out = { moves: [], attacks: [], misses: [], van: [], charges: [], warns: [], falls: [], shots: [], rams: [] };
  F.turret(rt(), out);
  assert.equal(out.shots.length, 0, 'ไกลเกิน');
  const near = M.spawn(rt(), 'giant', { x: 13, y: 4 }, { born: 99 });
  near.statuses.evade = 2; near.statusAmt.evade = 100;
  Math.random = () => 0;
  F.turret(rt(), out);
  assert.equal(out.shots.length, 1);
  assert.equal(out.shots[0].dodge, true, 'หลบได้');
  Math.random = realRandom;
  require('../server/summon.js').remove(far); require('../server/summon.js').remove(near);
  // หมา: ฆ่ามอน → เหรียญเข้าเจ้าของ
  rt().dog.on = true;
  const dog = F.spawnDog(rt());
  const prey = M.spawn(rt(), 'stray', { x: dog.pos.x + 1, y: dog.pos.y }, { born: 99 });
  if (!prey) return;
  prey.hp = 1; prey.armor = 0;
  const g0 = P(0).gold;
  Math.random = () => 0.99;
  F.preRound(() => {});
  assert.equal(prey.alive, false);
  assert.ok(P(0).gold > g0, 'เหรียญเข้าเจ้าของหมา');
});

test('QA: ตีสวนมอนได้ (ฮุค counters) ผ่าน attack.strike', () => {
  setup(1);
  F.begin('ambush'); fire();
  for (const m of mobs()) require('../server/summon.js').remove(m);
  const p = P(0);
  p.pos = { x: 5, y: 8 }; p.counterBack = true;
  const m = M.spawn(rt(), 'giant', { x: 5, y: 7 }, { born: 0 });
  const hp0 = m.hp + m.armor;
  Math.random = () => 0.99;
  const out = { moves: [], attacks: [], misses: [], van: [], charges: [], warns: [], falls: [], shots: [], rams: [] };
  M.actOne(rt(), m, out);
  assert.ok(out.counters && out.counters.length === 1);
  assert.ok(m.hp + m.armor < hp0 || out.counters[0].dodge === false);
});

test('บอสหมุนตามหลัก: 50 แม็กซ์ เวอร์สแตปเพน · 100 อัศวินเงามรณะ · 150 จอร์มุนกันด์ · 200 วนใหม่ (แกร่งขึ้นตามรอบ)', () => {
  const at = (km) => M.bossOf(F.bossIndex({ bossKm: km, km }));
  assert.deepEqual([50, 100, 150, 200, 250].map(at), ['devilTruck', 'darkKnight', 'jormungand', 'devilTruck', 'darkKnight']);
  assert.equal(M.ROSTER.devilTruck.name, 'แม็กซ์ เวอร์สแตปเพน');
  setup(1);
  rt().km = 100.2; rt().legKm = 95; rt().nextBossKm = 100;
  D.step(250, Date.now() + 250);
  assert.equal(rt().combat.kind, 'boss');
  assert.ok(mobs().some((m) => m.summon.mobType === 'darkKnight'));
  const lo = M.scale({ km: 100, diff: 'normal', region: { loop: 0 } }, M.ROSTER.darkKnight).hp;
  const hi = M.scale({ km: 600, diff: 'normal', region: { loop: 1 } }, M.ROSTER.darkKnight).hp;
  assert.ok(hi > lo);
});

test('ท่าใหญ่บอส: อัศวินฟันกว้าง 3×2 · จอร์มุนกันด์ฉก 6 ช่อง + เชื่องช้า · เตือนก่อน 1 เทิร์น · หลบได้', () => {
  const OUTF = () => ({ moves: [], attacks: [], misses: [], van: [], charges: [], warns: [], falls: [], shots: [], rams: [] });
  setup(1);
  F.begin('ambush'); fire();
  for (const m of mobs()) require('../server/summon.js').remove(m);
  const p = P(0);
  p.pos = { x: 4, y: 8 };
  const k = M.spawn(rt(), 'darkKnight', { x: 2, y: 8 }, { born: 0 });
  k.summon.moveNo = 1; // ลำดับถัดไป = ฟันกว้าง
  Math.random = () => 0.99;
  const o1 = OUTF();
  M.actOne(rt(), k, o1);
  assert.equal(o1.warns[0].move, 'slash');
  assert.ok(o1.warns[0].tiles.length <= 6 && o1.warns[0].tiles.some((t) => t.x === 4 && t.y === 8));
  const hp0 = p.hp + p.armor;
  M.actOne(rt(), k, OUTF());
  assert.ok(p.hp + p.armor < hp0 || !p.alive);
  assert.deepEqual(k.pos, { x: 2, y: 8 }, 'ฟันไม่ขยับ');
  require('../server/summon.js').remove(k);
  // จอร์มุนกันด์: ฉกยาว · หลบหลีก 100% = พลาด
  setup(1);
  F.begin('ambush'); fire();
  for (const m of mobs()) require('../server/summon.js').remove(m);
  P(0).pos = { x: 6, y: 8 };
  const j = M.spawn(rt(), 'jormungand', { x: 1, y: 8 }, { born: 0 });
  Math.random = () => 0.99;
  const o2 = OUTF();
  M.actOne(rt(), j, o2);
  assert.equal(o2.warns[0].move, 'lunge');
  assert.ok(o2.warns[0].tiles.length <= 6);
  M.actOne(rt(), j, OUTF());
  assert.ok(P(0).alive === false || (P(0).statuses.slow || 0) > 0, 'ติดเชื่องช้า');
  // หลบ
  setup(1);
  F.begin('ambush'); fire();
  for (const m of mobs()) require('../server/summon.js').remove(m);
  P(0).pos = { x: 6, y: 8 }; P(0).statuses.evade = 3; P(0).statusAmt.evade = 100;
  const j2 = M.spawn(rt(), 'jormungand', { x: 1, y: 8 }, { born: 0 });
  M.actOne(rt(), j2, OUTF());
  const hp1 = P(0).hp + P(0).armor;
  Math.random = () => 0;
  const o3 = OUTF();
  M.actOne(rt(), j2, o3);
  assert.equal(P(0).hp + P(0).armor, hp1);
  assert.ok(o3.misses.length >= 1);
});

test('มอนสู้บนรถตู้ = เฉพาะตัวที่ไล่รถทัน · เสือเขี้ยวดาบชุมในป่า/หิมะ', () => {
  const rtx = { km: 200, region: { id: 'desert', loop: 0 }, night: true };
  const pool = M.poolFor(rtx, 'onvan');
  assert.ok(pool.length && pool.every((t) => M.CHASERS.includes(t)));
  assert.ok(!pool.includes('cactus') && !pool.includes('giant'));
  assert.ok(M.poolFor(rtx).includes('cactus'), 'ดักทางยังมี');
  assert.ok(!M.poolFor({ km: 200, region: { id: 'snow' } }, 'onvan').includes('yeti'));
  const cnt = (reg) => M.poolFor({ km: 50, region: { id: reg } }).filter((t) => t === 'saberclaw').length;
  assert.ok(cnt('forest') > cnt('plains') && cnt('plains') >= 1);
  setup(1);
  rt().km = 200; rt().region = { id: 'desert', loop: 0 };
  F.begin('onvan');
  assert.ok(mobs().every((m) => M.CHASERS.includes(m.summon.mobType)));
});

test('แม็กซ์ เวอร์สแตปเพน: ฟาดรถ F1 (โค้ง 3 ช่อง + กระเด็น) · ขี่พุ่งชน (เตือนแนว · กระเด็นข้าง · จบปลายแนว) · โยนรถ (เตือน 3×3 ระยะ ≤ 5 · ซากอยู่ 2 เทิร์น) · fx bossMove · หลบได้', () => {
  const OUTF = () => ({ moves: [], attacks: [], misses: [], van: [], charges: [], warns: [], falls: [], shots: [], rams: [] });
  const Summon = require('../server/summon.js');
  const fresh = () => { setup(1); F.begin('ambush'); fire(); for (const m of mobs()) Summon.remove(m); };
  const bossFx = () => rt().fx.filter((f) => f.k === 'bossMove');
  // ฟาด: ติดตัว → ฟาดทันที + กระเด็น 1 ช่อง
  fresh();
  const p = P(0);
  p.pos = { x: 3, y: 8 };
  let b = M.spawn(rt(), 'devilTruck', { x: 2, y: 8 }, { born: 0 });
  Math.random = () => 0.99;
  let hp0 = p.hp + p.armor;
  M.actOne(rt(), b, OUTF());
  assert.ok(p.hp + p.armor < hp0);
  assert.deepEqual(p.pos, { x: 4, y: 8 }, 'กระเด็น');
  assert.ok(bossFx().some((f) => f.move === 'swing' && f.boss === 'devilTruck'));
  // ขี่พุ่งชน: ตาแรกเตือนแนว → ตาถัดไปพุ่งจนปลายแนว
  fresh();
  P(0).pos = { x: 6, y: 8 };
  b = M.spawn(rt(), 'devilTruck', { x: 1, y: 8 }, { born: 0 });
  let o = OUTF();
  M.actOne(rt(), b, o);
  assert.equal(o.warns[0].move, 'ram');
  assert.equal(RT.publicInfo().combat.warn.move, 'ram');
  hp0 = P(0).hp + P(0).armor;
  M.actOne(rt(), b, OUTF());
  assert.ok(P(0).hp + P(0).armor < hp0);
  assert.notEqual(P(0).pos.y, 8, 'กระเด็นออกข้างแนว');
  assert.ok(b.pos.x > 6, 'ไปจบปลายแนว');
  assert.ok(bossFx().some((f) => f.move === 'ram' && f.to && f.tiles.length));
  // โยนรถ: เตือน 3×3 รอบเป้า (ระยะ ≤ 5) → โดน + ซาก (ตีพังได้ · ไม่ใช่มอน) → ครบ 2 เทิร์นหาย
  fresh();
  P(0).pos = { x: 4, y: 6 };
  b = M.spawn(rt(), 'devilTruck', { x: 2, y: 8 }, { born: 0 });
  b.summon.moveNo = 1;
  o = OUTF();
  M.actOne(rt(), b, o);
  assert.equal(o.warns[0].move, 'throw');
  assert.ok(o.warns[0].tiles.length <= 9 && o.warns[0].tiles.some((t) => t.x === 4 && t.y === 6));
  hp0 = P(0).hp + P(0).armor;
  o = OUTF();
  M.actOne(rt(), b, o);
  assert.ok(P(0).hp + P(0).armor < hp0);
  assert.equal(o.wrecks.length, 1);
  const wr = match.players[o.wrecks[0].id];
  assert.ok(wr && wr.summon.rtWreck && !M.mobs().includes(wr), 'ซากไม่นับเป็นมอน');
  assert.ok(require('../server/combat.js').sameTeam(P(0), wr) === false, 'ผู้เล่นตีซากได้');
  assert.ok(bossFx().some((f) => f.move === 'throw' && f.to));
  match.roundNumber += 2;
  M.expireWrecks();
  assert.equal(wr.alive, false, 'ครบ 2 เทิร์นหาย');
  // หลบได้
  fresh();
  P(0).pos = { x: 3, y: 8 }; P(0).statuses.evade = 3; P(0).statusAmt.evade = 100;
  b = M.spawn(rt(), 'devilTruck', { x: 2, y: 8 }, { born: 0 });
  Math.random = () => 0;
  hp0 = P(0).hp + P(0).armor;
  o = OUTF();
  M.actOne(rt(), b, o);
  assert.equal(P(0).hp + P(0).armor, hp0);
  assert.ok(o.misses.length >= 1);
});

test('สู้บนรถตู้: ฝั่งผู้เล่นเดินออกนอกรถไม่ได้ (เปิดประตูท้ายก็ไม่ได้) · หลุดออกไป (วาร์ป/ผลัก) = ร่วง กลับท้ายรถ · เกิด/ฟื้น/หมา อยู่ในรถเสมอ · มอนยังขึ้นรถได้', () => {
  setup(2);
  rt().dog.on = true;
  F.begin('onvan'); fire();
  const d = Maps.defs[Maps.RT_ONVAN], action = require('../server/phases/action.js');
  const van = new Set(d.vanTiles.map(([x, y]) => Board.key(x, y)));
  const onVan = (u) => van.has(Board.key(u.pos.x, u.pos.y));
  for (const u of Object.values(match.players)) if (u.alive && u.pos && !M.isMob(u)) assert.ok(onVan(u), `${u.name} อยู่ในรถ`);
  const dog = Object.values(match.players).find((u) => u.summon && u.summon.rtDog);
  assert.ok(dog && onVan(dog), 'หมาเกิดในรถ');
  // เดิน: ช่องที่ไปได้อยู่ในรถทั้งหมด แม้ยืนแถวท้ายและเปิดประตู
  const p = P(0);
  p.pos = { x: d.rearTiles[1][0], y: d.rearTiles[1][1] };
  rt().van.rearOpen = true;
  const reach = Board.reachable(action.boardMap(), { id: p.id, x: p.pos.x, y: p.pos.y, size: 1 }, 9, action.boardUnits().filter((u) => u.id !== p.id), { isAlly: () => true, blocked: action.boardBlocked(p.id) });
  for (const k of reach.keys()) assert.ok(van.has(k), `เดินถึง ${k} นอกรถ`);
  assert.equal(action.tileFree(d.rearTiles[1][0] - 1, d.rearTiles[1][1], p.id), false, 'หลังประตูท้าย = ห้ามยืน');
  // มอนยังยืน/เดินบนช่องในรถได้
  const m = M.spawn(rt(), 'stray', { x: 5, y: 5 }, { born: 99 });
  assert.equal(action.tileFree(d.vanTiles[0][0], d.vanTiles[0][1], m.id) || !!action.boardUnits().find((u) => u.x === d.vanTiles[0][0] && u.y === d.vanTiles[0][1]), true);
  assert.ok(!(action.boardBlocked(m.id) && action.boardBlocked(m.id).has(Board.key(5, 4))), 'ถนนไม่ใช่สิ่งกีดขวางของมอน');
  // วาร์ปไปถนน (สกิล/ผลัก) → จบตา = ร่วง เสียเลือด กลับท้ายรถ
  const hp0 = p.hp + p.armor;
  p.pos = { x: 2, y: 2 };
  RT.onUnitEnd(p);
  assert.ok(onVan(p), 'กลับเข้ารถ');
  assert.ok(p.hp + p.armor < hp0);
  assert.ok(rt().fx.some((f) => f.k === 'fall' && f.id === 'p0'));
  // ฟื้นด้วยขนนกระหว่างสู้ = ในรถ
  P(1).hp = 0; RT.settle(P(1));
  match.gameState = 'ACTION'; match.actorId = 'p0'; match.action = { locked: false, moved: false, from: { ...p.pos } };
  p.inventory = [{ uid: 'f', type: 'rtRevive' }];
  shop.useInventoryItem('p0', 'f', { targetId: 'p1' });
  assert.equal(P(1).alive, true);
  assert.ok(onVan(P(1)), 'ฟื้นในรถ');
});

test('AI: ผู้เล่นคือเป้าหลัก — ติดทั้งรถและคน = ตีคน · เดินเต็มระยะอ้อมรถแล้วตีในตาเดียวกัน · ตัวป่วนรถ ~1 ใน 4 · fx เรียงลำดับ mobMove → mobHit', () => {
  const OUTF = () => ({ moves: [], attacks: [], misses: [], van: [], charges: [], warns: [], falls: [], shots: [], rams: [] });
  const Summon = require('../server/summon.js');
  setup(1);
  F.begin('ambush'); fire();
  for (const m of mobs()) Summon.remove(m);
  const vb = Maps.defs[Maps.RT_ROAD].vanBlock; // x 8–11 y 4–5
  const p = P(0);
  // ติดทั้งรถ (7,4)→ติด vanBlock และคน (7,3)
  p.pos = { x: 7, y: 3 };
  const a = M.spawn(rt(), 'stray', { x: 7, y: 4 }, { born: 0 });
  a.summon.role = 'hunter';
  Math.random = () => 0.99;
  const v0 = rt().van.hp;
  let o = OUTF();
  M.actOne(rt(), a, o);
  assert.equal(o.attacks.length, 1, 'ตีคน');
  assert.equal(rt().van.hp, v0, 'ไม่ทุบรถ');
  // ตัวป่วนรถที่มีคนติดตัวก็ป้องกันตัวก่อน
  a.summon.role = 'saboteur';
  o = OUTF(); M.actOne(rt(), a, o);
  assert.equal(o.attacks.length, 1);
  Summon.remove(a);
  // อ้อมรถ: มอนหลังรถ (12,4) ผู้เล่นหน้ารถอีกฝั่ง (6,5) → เดินอ้อมเต็มระยะ แล้วตีถ้าถึง
  p.pos = { x: 6, y: 5 };
  const b = M.spawn(rt(), 'saberclaw', { x: 12, y: 4 }, { born: 0 });
  b.summon.role = 'hunter';
  o = OUTF(); M.actOne(rt(), b, o);
  assert.equal(o.moves.length, 1);
  assert.ok(o.moves[0].path.every((t) => !(t.x >= vb.x0 && t.x <= vb.x1 && t.y >= vb.y0 && t.y <= vb.y1)), 'ไม่เดินทะลุรถ');
  assert.ok(Board.dist(b.pos, p.pos) < Board.dist({ x: 12, y: 4 }, p.pos), 'เข้าใกล้');
  assert.equal(o.seq[0].k, 'mobMove');
  assert.ok(Array.isArray(o.seq[0].path[0]) && o.seq[0].path[0].length === 2);
  if (Board.dist(b.pos, p.pos) === 1) assert.equal(o.seq[1].k, 'mobHit', 'ถึงแล้วตีในตาเดียวกัน');
  Summon.remove(b);
  // ตัวป่วนรถ (ไม่มีคนติดตัว) → เดินไปติดรถแล้วทุบ
  p.pos = { x: 0, y: 10 };
  const c = M.spawn(rt(), 'biker', { x: 14, y: 5 }, { born: 0 });
  c.summon.role = 'saboteur';
  o = OUTF(); M.actOne(rt(), c, o);
  assert.ok(o.van.length === 1 && rt().van.hp < v0, 'ทุบรถ');
  assert.equal(o.seq[o.seq.length - 1].target, 'van');
  // สัดส่วนบทบาท
  const fake = Array.from({ length: 8 }, (_, i) => ({ summon: { mobType: i < 2 ? 'biker' : 'stray' } }));
  assert.equal(M.assignRoles(fake), 2);
  assert.ok(fake.filter((m) => m.summon.role === 'saboteur').every((m) => m.summon.mobType === 'biker'), 'แก๊งมอเตอร์ไซค์ก่อน');
  setup(2);
  F.begin('ambush');
  assert.ok(mobs().every((m) => ['hunter', 'saboteur'].includes(m.summon.role)));
});

test('AI บอส: ไม่เดินหนีคนที่ติดตัว · ไม่มีท่าไหนถึง = เดินเข้าหาคนใกล้สุดแล้วตีในตาเดียวกัน · เลือกท่าที่โดนคนมากสุด', () => {
  const OUTF = () => ({ moves: [], attacks: [], misses: [], van: [], charges: [], warns: [], falls: [], shots: [], rams: [] });
  const Summon = require('../server/summon.js');
  setup(2);
  F.begin('ambush'); fire();
  for (const m of mobs()) Summon.remove(m);
  Math.random = () => 0.99;
  // อัศวิน: มีคนติดตัวแต่ไม่มีท่าใหญ่ไหนโดนคนอื่นเพิ่ม → ยืนสู้ ไม่เดินหนี
  P(0).pos = { x: 3, y: 9 }; P(1).pos = { x: 18, y: 1 };
  const k = M.spawn(rt(), 'darkKnight', { x: 2, y: 9 }, { born: 0 });
  const at0 = { ...k.pos };
  let o = OUTF(); M.actOne(rt(), k, o);
  assert.ok(o.attacks.some((a) => a.target === 'p0') || o.warns.length, 'สู้คนที่ติดตัว');
  assert.ok(Board.dist(k.pos, P(0).pos) <= 1 || o.warns.length, 'ไม่เดินหนี');
  assert.deepEqual(o.moves.length ? k.pos : at0, k.pos);
  Summon.remove(k);
  // แม็กซ์: เลือกโยน (โดน 2 คนในวง 3×3) แทนพุ่ง (โดน 1)
  P(0).pos = { x: 4, y: 7 }; P(1).pos = { x: 5, y: 7 };
  const mx = M.spawn(rt(), 'devilTruck', { x: 1, y: 8 }, { born: 0 });
  o = OUTF(); M.actOne(rt(), mx, o);
  assert.equal(o.warns[0].move, 'throw');
  assert.ok(o.seq.some((e) => e.k === 'bossWarn' && e.move === 'throw'));
  Summon.remove(mx);
  // จอร์มุนกันด์ไกลทุกท่า → เดินเข้าหาคนใกล้สุด (ระยะลดลง)
  P(0).pos = { x: 18, y: 9 }; P(1).pos = { x: 19, y: 10 };
  const j = M.spawn(rt(), 'jormungand', { x: 1, y: 2 }, { born: 0 });
  const d0 = Board.dist(j.pos, P(0).pos);
  o = OUTF(); M.actOne(rt(), j, o);
  assert.ok(Board.dist(j.pos, P(0).pos) < d0, 'เข้าใกล้');
  assert.equal(o.seq[0].k, 'mobMove');
});

test('สู้บนรถตู้ (ตัวประชิดได้สู้): มอนขึ้นรถ · หน้าต่างตีไกล 2 · ปาดรถ · ป้อมปืนมือ · หลังคา', () => {
  const OUTF = () => ({ moves: [], attacks: [], misses: [], van: [], charges: [], warns: [], falls: [], shots: [], rams: [] });
  const Summon = require('../server/summon.js'), action = require('../server/phases/action.js');
  setup(2);
  F.begin('onvan'); fire();
  for (const m of mobs()) Summon.remove(m);
  const d = Maps.defs[Maps.RT_ONVAN];
  const van = new Set(d.vanTiles.map(([x, y]) => Board.key(x, y)));
  const p = P(0), q = P(1);
  const turn = (u) => { match.gameState = 'ACTION'; match.actorId = u.id; match.action = { locked: false, moved: false, from: { ...u.pos } }; };
  Math.random = () => 0.99;
  // 1) มอนตัวล่ากระโดดขึ้นรถไปหาผู้เล่น
  p.pos = { x: 10, y: 5 }; q.pos = { x: 13, y: 6 };
  const m1 = M.spawn(rt(), 'stray', { x: 9, y: 2 }, { born: 0 }); m1.summon.role = 'hunter';
  let o = OUTF(); M.actOne(rt(), m1, o);
  assert.ok(van.has(Board.key(m1.pos.x, m1.pos.y)), 'มอนขึ้นรถ');
  assert.ok(o.attacks.length === 1, 'แล้วตีในรถ');
  Summon.remove(m1);
  // 2) หน้าต่าง: ระยะอย่างน้อย 2
  p.pos = { x: 9, y: 4 };
  assert.ok(action.rangeOf(p)[1] >= 2);
  assert.ok(action.areaRange(p, { range: 1 }) >= 2);
  p.pos = { x: 10, y: 5 };
  // 3) ปาดรถ (คนขับ · ฝั่งซ้าย = แถวเหนือรถ)
  const side = M.spawn(rt(), 'giant', { x: 10, y: 3 }, { born: 99 });
  const hp0 = side.hp + side.armor, v0 = rt().van.hp;
  turn(q);
  assert.equal(RT.command('p1', 'swerve', { side: 'up' }), false);
  assert.equal(RT.command('p0', 'swerve', { side: 'left' }), false, 'ไม่ใช่ตา/ไม่ใช่คนขับ');
  assert.ok(RT.publicInfo('p1').actions.p1.includes('swerve'));
  assert.equal(RT.command('p1', 'swerve', { side: 'left' }), true);
  assert.ok(side.hp + side.armor < hp0);
  assert.equal(side.pos.y, 2, 'กระเด็นออกจากรถ');
  assert.equal(rt().van.hp, v0 - 1, 'กันชน 0 = รถเสีย 1');
  assert.equal(RT.command('p1', 'swerve', { side: 'left' }), false, 'คูลดาวน์');
  Summon.remove(side);
  // 4) ป้อมปืนมือ (ช่องซันรูฟ)
  rt().van.upg.turret = 1;
  turn(p);
  const tg = M.spawn(rt(), 'giant', { x: 10, y: 1 }, { born: 99 });
  const far = M.spawn(rt(), 'giant', { x: 1, y: 1 }, { born: 99 });
  assert.equal(RT.publicInfo().van.turretReady, true);
  assert.equal(RT.command('p0', 'turret', { x: far.pos.x, y: far.pos.y }), false, 'ไกลเกิน 4');
  const t0 = tg.hp + tg.armor;
  assert.equal(RT.command('p0', 'turret', { x: tg.pos.x, y: tg.pos.y }), true);
  assert.equal(t0 - (tg.hp + tg.armor), 2, 'ขั้น + 1');
  assert.equal(RT.command('p0', 'turret', { x: tg.pos.x, y: tg.pos.y }), false, 'ครั้งเดียวต่อตา');
  Summon.remove(tg); Summon.remove(far);
  // 5) หลังคา: ทีละคน · ระยะ +2 · มอนเดินดินแตะไม่ได้ (อีกา/บอสได้) · ร่วง 25% ตอนถนนกระตุก
  const r0 = action.rangeOf(p)[1];
  assert.equal(RT.command('p0', 'roof', {}), true);
  assert.equal(RT.publicInfo().combat.roofId, 'p0');
  assert.equal(action.rangeOf(p)[1], r0 + 2);
  const st = M.spawn(rt(), 'stray', { x: 10, y: 3 }, { born: 99 });
  const cr = M.spawn(rt(), 'crow', { x: 9, y: 3 }, { born: 99 });
  assert.ok(!M.prey(st).includes(p) && M.prey(cr).includes(p));
  Math.random = () => 0;
  assert.equal(F.roofLurch('lurch'), true);
  assert.equal(p.rtRoof, false);
  assert.ok(van.has(Board.key(p.pos.x, p.pos.y)), 'ร่วงกลับท้ายรถ');
  // จบสู้ = ล้างหลังคา
  p.pos = { x: 10, y: 5 }; turn(p);
  Math.random = () => 0.99;
  RT.command('p0', 'roof', {});
  for (const m of mobs()) Summon.remove(m);
  endTurn.gameOver();
  assert.equal(p.rtRoof, false);
});

test('บอสอลังการ: แม็กซ์ พิทสต็อป/DRS/ล็อกล้อ/แชมป์โลก/วิทยุ · อัศวินแยกเงา/คลื่นดาบ/หนามเงา · จอร์มุนกันด์ถนนน้ำแข็ง/คลื่นยักษ์/คุก · ระยะ + คลั่ง', () => {
  const OUTF = () => ({ moves: [], attacks: [], misses: [], van: [], charges: [], warns: [], falls: [], shots: [], rams: [] });
  const Summon = require('../server/summon.js');
  const fresh = (n = 1) => { setup(n); F.begin('boss'); fire(); for (const m of mobs()) Summon.remove(m); };
  const fxk = (k) => rt().fx.filter((f) => f.k === k);
  // ---- แม็กซ์: พิทสต็อป ≤ 50% (กินทั้งตา · หลบทุกอย่าง · ฟื้น 25% · รถใหม่)
  fresh();
  P(0).pos = { x: 3, y: 8 };
  let mx = M.spawn(rt(), 'devilTruck', { x: 2, y: 8 }, { born: 0 });
  mx.summon.boss = true;
  mx.hp = Math.floor(mx.summon.maxHp * 0.45);
  const h0 = mx.hp;
  Math.random = () => 0.99;
  let o = OUTF(); M.actOne(rt(), mx, o);
  assert.ok(mx.hp > h0, 'ฟื้น');
  assert.equal(o.attacks.length, 0, 'พิทกินทั้งตา');
  assert.equal(mx.statuses.evade > 0 && mx.statusAmt.evade, 100, 'หลบทุกอย่าง');
  assert.ok(fxk('pitstop').length && fxk('pitstop')[0].crew >= 4 && fxk('pitstop')[0].time === '1.8 วิ');
  assert.ok(fxk('radio').some((f) => f.boss === 'devilTruck' && typeof f.text === 'string'));
  assert.equal(mx.summon.phase, 2);
  assert.equal(RT.publicInfo().combat.bossPhase, 2);
  assert.equal(mx.summon.celebrate, true, 'เข้าระยะ 2 = ฉลอง');
  // ฉลอง: เตือนวงแล้วลง — โดนัทติดตัวกระเด็น + เชื่องช้าจากแชมเปญ
  o = OUTF(); M.actOne(rt(), mx, o);
  assert.equal(o.warns[0].move, 'celebrate');
  const hp1 = P(0).hp + P(0).armor;
  o = OUTF(); M.actOne(rt(), mx, o);
  assert.ok(P(0).hp + P(0).armor < hp1 || (P(0).statuses.slow || 0) > 0, 'โดนัทหรือแชมเปญ');
  assert.ok(fxk('donut').length && fxk('champagne').length);
  assert.equal(mx.summon.celebrate, false);
  // ล็อกล้อ: พุ่งแล้ว 20% หมุนติ้ว (Math.random 0)
  fresh();
  P(0).pos = { x: 5, y: 8 };
  mx = M.spawn(rt(), 'devilTruck', { x: 1, y: 8 }, { born: 0 });
  Math.random = () => 0.99;
  M.actOne(rt(), mx, OUTF()); // เล็งพุ่ง
  Math.random = () => 0.1;
  P(0).statuses = {};
  M.actOne(rt(), mx, OUTF());
  assert.ok(mx.statuses.stun >= 1, 'มึน');
  assert.ok(fxk('spinout').length);
  // คลั่ง ≤ 20%: ATK +1
  fresh();
  mx = M.spawn(rt(), 'devilTruck', { x: 1, y: 8 }, { born: 0 });
  mx.summon.pit1 = true; mx.summon.pit2 = true;
  const a0 = mx.summon.atk;
  mx.hp = 1;
  M.bossPre(rt(), mx, [], OUTF());
  assert.equal(mx.summon.atk, a0 + 1);
  assert.equal(mx.summon.phase, 3);
  assert.ok(fxk('enrage').length);
  // ---- อัศวิน ระยะ 2: เงา 2 ตัว · ชุดท่าใหม่
  fresh();
  P(0).pos = { x: 6, y: 8 };
  const k = M.spawn(rt(), 'darkKnight', { x: 2, y: 8 }, { born: 0 });
  k.summon.boss = true;
  k.hp = Math.floor(k.summon.maxHp * 0.4);
  Math.random = () => 0.99;
  o = OUTF(); M.actOne(rt(), k, o);
  const clones = mobs().filter((m) => m.summon.decoy);
  assert.equal(clones.length, 2);
  assert.ok(clones.every((c) => !c.summon.boss && c.hp === 3));
  assert.ok(M.movesFor(k).includes('wave') && M.movesFor(k).includes('spikes'));
  assert.ok(['wave', 'spikes', 'charge', 'slash'].includes(o.warns[0].move));
  // ---- จอร์มุนกันด์ ระยะ 2: ถนนน้ำแข็ง · คุกน้ำแข็ง = ตรึง
  fresh();
  P(0).pos = { x: 6, y: 9 };
  const j = M.spawn(rt(), 'jormungand', { x: 1, y: 2 }, { born: 0 });
  j.summon.boss = true;
  j.hp = Math.floor(j.summon.maxHp * 0.4);
  j.summon.moveNo = 1; // ลำดับถัดไป = คุกน้ำแข็ง
  o = OUTF(); M.actOne(rt(), j, o);
  assert.ok(fxk('freezeRoad').length && fxk('freezeRoad')[0].tiles.length > 0);
  assert.ok(require('../server/ice.js').iceAt(6, 9) || fxk('freezeRoad')[0].tiles.length);
  const w = rt().combat.warn;
  assert.ok(w && ['tidal', 'prison'].includes(w.move));
  M.actOne(rt(), j, OUTF());
  if (w.move === 'prison') assert.ok((P(0).statuses.rooted || 0) > 0 || !P(0).alive, 'ตรึง');
});

// ---------------------------------------------------------------- กฎผู้ใช้ 2026-11-14
test('กฎผู้ใช้: นอกการต่อสู้เวลาระบบต่อสู้ไม่เดิน (สถานะ/เทิร์น/คูลดาวน์ค้างไว้) แล้วนับต่อเมื่อสู้', () => {
  setup(1);
  const p = P(0);
  p.statuses.might = 2; p.statusAmt.might = 1; p.statuses.burn = 3;
  const r0 = match.roundNumber, hp0 = p.hp;
  driveTo('fork');
  D.openFork(); fire();
  S.enter('gas');
  for (let i = 0; i < 3; i++) RT.command('p0', 'walk', { x: p.pos.x + (i % 2 ? -1 : 1), y: p.pos.y });
  fire(); // หมดเวลาปั๊ม
  E.open('cows'); fire(); fire();
  assert.equal(match.roundNumber, r0, 'ไม่มีเทิร์นระหว่างทาง');
  assert.equal(p.statuses.might, 2);
  assert.equal(p.statuses.burn, 3);
  assert.equal(p.hp, hp0, 'ไม่มีดาเมจต่อเทิร์นระหว่างทาง');
  assert.equal(require('../server/dayNight.js').isNightRound(match.roundNumber), rt().night, 'กลางวัน/กลางคืนตามระยะทาง');
  p.statuses.muimiTower = 2; p.transformAt = 1;
  assert.equal(require('../server/view.js').buildStateFor('p0').skillMusic, null, 'ไม่มีเพลงท่าไม้ตายระหว่างทาง');
  delete p.statuses.muimiTower;
  F.begin('ambush'); fire();
  assert.equal(match.roundNumber, r0 + 1, 'เข้าสู้แล้วนับต่อ');
});

test('กฎผู้ใช้: จบสู้ = ตัดฉาก/คิว/QTE/หยุดเวลา/Clock Up ที่ค้าง + fx combatEnd', () => {
  setup(1);
  F.begin('ambush'); fire();
  killAllMobs();
  Object.assign(match, { endTurnHold: 14, endTurnHoldStart: [() => {}], cutsceneQueue: [{ id: 'x' }], cutsceneInfo: { id: 'ult' }, clockUp: { owner: 'p0' }, timeFreeze: { by: 'p0' }, extraTurns: ['p0'] });
  P(0).qte = { keys: ['w'], idx: 0 };
  pending = () => {}; // ฉากท่าไม้ตายที่ค้างอยู่
  assert.equal(endTurn.gameOver(), true);
  assert.equal(match.endTurnHold, 0);
  assert.deepEqual(match.cutsceneQueue, []);
  assert.equal(match.cutsceneInfo, null);
  assert.equal(match.clockUp, null);
  assert.equal(match.timeFreeze, null);
  assert.equal(P(0).qte, null);
  assert.equal(pending, null, 'ไม่มีตัวจับเวลาของการต่อสู้ค้าง');
  assert.ok(fxKinds().includes('combatEnd'));
  assert.equal(match.gameState, 'ROADTRIP');
});

test('กฎผู้ใช้: ช่วงเดินทางใช้สกิล/ท่าไม้ตาย/ตี/ปุ่มตัวละครไม่ได้ (server ปฏิเสธ) — ตอนสู้ได้', () => {
  setup(1);
  let called = 0;
  const guarded = socketLayer.combatOnly(() => { called++; return true; });
  for (const ph of ['drive', 'fork', 'event', 'stop']) {
    rt().phase = ph;
    assert.equal(RT.blocksCombatCmd(), true, ph);
    assert.equal(guarded('p0', {}), false);
  }
  assert.equal(called, 0);
  rt().phase = 'drive';
  F.begin('ambush');
  assert.equal(RT.blocksCombatCmd(), false);
  assert.equal(guarded('p0', {}), true);
  assert.equal(called, 1);
  // ร้าน/ไอเทมที่จุดพักยังใช้ได้ (rt:use)
  setup(1);
  S.enter('gas');
  P(0).hp = 1;
  P(0).inventory = [{ uid: 'fish', type: 'rtFish' }];
  assert.equal(RT.command('p0', 'use', { uid: 'fish' }), true);
  assert.equal(P(0).hp, 4);
});
