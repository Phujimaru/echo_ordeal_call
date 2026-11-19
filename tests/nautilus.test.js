// โหมด Nautilus (GRID_PLAN §8.9 · server/fodlan.js ด่าน 7–11 · server/fodlan/nautilusLayer.js)
//  โหวตสนาม nautilus (ffa/duo/trio) · เริ่มชั้น 1 (ด่าน 7 · area 46) เสมอ · ต้นเทิร์น 7/13/19/25 ดิ่งลงชั้นถัดไปตามลำดับ (ไม่สุ่ม)
//  ชั้น 5 (ด่าน 11) อยู่จนมีผู้ชนะ · สภาพอากาศกติกาเดียวกับ Fodlan แต่ชนิดสุ่มจากชุดของชั้น · Fodlan/Eos ไม่เปลี่ยน
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const match = require('../server/match.js');
const Board = require('../server/board.js');
const Fodlan = require('../server/fodlan.js');
const Nt = require('../server/fodlan/nautilusLayer.js');
const lobby = require('../server/lobby.js');
const timers = require('../server/timers.js');
const Journey = require('../characters/_journey.js');

const realRandom = Math.random;
const realStart = timers.startPhaseTimer;
function fakeTimers() { timers.startPhaseTimer = (secs) => { match.timeLeft = Math.ceil(secs); }; }

function setup(world = 'nautilus', n = 2, random = 0.99) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  for (let i = 0; i < n; i++) {
    engine.players['p' + i] = {
      id: 'p' + i, name: 'P' + i, position: i + 1, characterId: 'dummy', alive: true, connected: true,
      cards: [], statuses: {}, statusAmt: {}, seen: {}, inventory: [],
    };
  }
  engine.setGameMode(world === 'eos' ? 'eos' : 'ffa');
  match.world = world;
  Math.random = () => random;
  engine.startMatch();
  Math.random = realRandom;
  engine.clearPhaseTimer();
}

test.beforeEach(() => { fakeTimers(); });
test.afterEach(() => { Math.random = realRandom; timers.startPhaseTimer = realStart; engine.clearPhaseTimer(); });
test.after(() => {
  match.world = 'earth'; match.fodlan = null; engine.setGameMode('ffa');
  for (const id of Object.keys(engine.players)) delete engine.players[id];
});

test('โหวต: สนาม nautilus มีโหมด ffa / duo / trio · ไม่มี moon/eos · โหวตครบ = แมตช์อยู่ในโลก nautilus', () => {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  engine.players.p0 = { id: 'p0', name: 'P0', position: 1, characterId: 'dummy', alive: true, connected: true, cards: [], statuses: {}, statusAmt: {}, seen: {}, inventory: [], ready: true };
  const opts = lobby.modeVoteSummary().filter((o) => o.world === 'nautilus');
  assert.deepEqual(opts.map((o) => o.mode).sort(), ['duo', 'ffa', 'trio']);
  match.gameState = 'TEAM_MODE';
  lobby.voteGameMode('p0', 'eos', 'nautilus');
  assert.equal(match.gameState, 'TEAM_MODE', 'eos บน nautilus = โหวตไม่ได้');
  lobby.voteGameMode('p0', 'ffa', 'nautilus');
  engine.clearPhaseTimer();
  assert.equal(match.world, 'nautilus');
  assert.equal(match.gameMode, 'ffa');
  assert.equal(Fodlan.stageNow(), 7);
});

test('เริ่มแมตช์: ชั้น 1 = ด่าน 7 · area 46 · กระดาน 20×16 · ไม่ใช่การเดินทางของ Origin · publicInfo มีความลึก', () => {
  setup();
  assert.equal(Board.NAUTILUS_AREA, 46);
  assert.equal(match.board.area, 46);
  assert.equal(Fodlan.areaOf(7), 46);
  assert.ok(Board.isNautilusArea(match.board.area));
  assert.ok(!Board.isFodlanArea(match.board.area) && !Board.isEosArea(match.board.area));
  const map = Board.mapOf(match.board.area);
  assert.equal(map.cols, 20);
  assert.equal(map.rows, 16);
  assert.ok(Fodlan.inWorld() && Fodlan.isNautilus() && Fodlan.active() && !Fodlan.isEos());
  assert.equal(Journey.active(engine), false);
  for (const p of Object.values(match.players)) assert.ok(p.pos, 'ทุกคนอยู่บนกระดาน');
  const info = Fodlan.publicInfo();
  assert.equal(info.stage, 7);
  assert.equal(info.name, 'แนวปะการัง');
  assert.equal(info.depth, -30);
  assert.equal(info.nautilus, true);
  assert.equal(info.weather, null);
  assert.equal(info.turnsLeft, 6);
  assert.deepEqual(info.route, [7]);
  assert.deepEqual(info.board.layer, 1);
  assert.equal(info.board.whale, false);
});

test('ลำดับชั้นตายตัว 7→8→9→10→11 ที่จบเทิร์น 6/12/18/24 (= ต้นเทิร์น 7/13/19/25) · ย้ายกระดาน + ฉาก advance · ชั้น 11 ไม่เปลี่ยนอีก', () => {
  setup();
  match.legStart = 1;
  let started = 0;
  const depths = { 8: -200, 9: -1000, 10: -3000, 11: -10000 };
  for (const [round, to] of [[6, 8], [12, 9], [18, 10], [24, 11]]) {
    match.roundNumber = round - 1;
    assert.equal(Fodlan.maybeAdvance(() => { started++; }, () => 0), false, `เทิร์น ${round - 1} ยังไม่ครบชั้น`);
    match.roundNumber = round;
    const from = Fodlan.stageNow();
    // สุ่มเท่าไรก็ได้ชั้นถัดไปเสมอ
    assert.equal(Fodlan.maybeAdvance(() => { started++; }, () => 0.99), true);
    assert.equal(Fodlan.stageNow(), to);
    assert.equal(match.board.area, Board.NAUTILUS_AREA + to - 7);
    assert.equal(match.journeyScene.mode, 'advance');
    assert.equal(match.journeyScene.fromArea, from);
    const info = Fodlan.publicInfo();
    assert.equal(info.scene.stage, to);
    assert.equal(info.depth, depths[to]);
    assert.equal(info.board.layer, to - 6);
    for (const p of Object.values(match.players)) assert.ok(p.pos, 'ทุกคนเกิดใหม่บนชั้นใหม่');
  }
  assert.equal(started, 4);
  assert.deepEqual(match.fodlan.route, [7, 8, 9, 10, 11]);
  assert.equal(Fodlan.publicInfo().turnsLeft, null, 'ชั้นสุดท้ายไม่มีนับถอยหลัง');
  for (const round of [30, 36, 42, 60]) {
    match.roundNumber = round;
    assert.equal(Fodlan.maybeAdvance(() => { started++; }, () => 0), false, `เทิร์น ${round}: อยู่ชั้น 11 ต่อ`);
    assert.equal(Fodlan.stageNow(), 11);
    assert.equal(match.board.area, 50);
  }
  assert.equal(started, 4);
});

test('สภาพอากาศ: กติกาเดียวกับ Fodlan (ไม่เกิดตอนเข้าชั้น · เร็วสุดเทิร์น 3 · 3 เทิร์น) · ชนิดมาจากชุดของชั้น', () => {
  setup('nautilus', 2, 0.1);
  assert.equal(Fodlan.weatherNow(), null);
  match.legStart = 1;
  match.roundNumber = 1;
  Fodlan.onEndTurn(() => 0);
  assert.equal(Fodlan.weatherNow(), null, 'จบเทิร์น 1 ยังไม่สุ่ม');
  match.roundNumber = 2;
  Fodlan.onEndTurn(() => 0.1);
  assert.deepEqual(Fodlan.weatherNow(), { kind: 'nt_storm', left: 3 });
  assert.equal(Fodlan.WEATHER_NAMES.nt_storm, 'พายุใต้ทะเล');
  // แต่ละชั้น: ทุกชนิดที่สุ่มได้อยู่ในชุดของชั้น และสุ่มได้ครบทุกชนิด
  for (const stage of [8, 9, 10, 11]) {
    const pool = Nt.WEATHER_POOLS[stage];
    const seen = new Set();
    for (const r of [0, 0.3, 0.6, 0.99]) {
      match.fodlan.stage = stage;
      match.fodlan.weather = null;
      match.fodlan.s = { ver: 0, fx: [], fxSeq: 0, weather: null, wxDone: false };
      match.board = { area: Fodlan.areaOf(stage) };
      match.roundNumber = 2;
      const seq = [0.1, r]; // ค่าแรก < 0.5 = เกิด · ค่าถัดไปเลือกชนิด
      Fodlan.onEndTurn(() => seq.shift());
      const w = Fodlan.weatherNow();
      assert.ok(w, `ชั้น ${stage} r=${r}`);
      assert.ok(pool.includes(w.kind), `ชั้น ${stage}: ${w.kind}`);
      assert.ok(Fodlan.WEATHER_NAMES[w.kind], `ชื่อไทยของ ${w.kind}`);
      seen.add(w.kind);
    }
    assert.deepEqual([...seen].sort(), [...pool].sort(), `ชั้น ${stage} สุ่มได้ครบชุด`);
  }
  // startWeather() ไม่ระบุชนิด = ชนิดจากชุดของชั้น
  match.fodlan.stage = 9;
  match.fodlan.s.wxDone = false;
  Fodlan.startWeather();
  assert.ok(Nt.WEATHER_POOLS[9].includes(Fodlan.weatherNow().kind));
});

test('ชั้นแผนที่: 7 จุดเกิด · 3 จุดร้านค้า · ท่าจอดเรือ 6×2 ว่าง · ชนิดช่องใหม่ขึ้นต้น fd_ และมีป้ายชื่อ/ไอคอน', () => {
  for (let i = 0; i < 5; i++) {
    const m = Board.MAPS[Board.NAUTILUS_AREA + i];
    const def = require(`../server/fodlan/map${7 + i}.js`);
    assert.equal(m.spawns.length, 7);
    assert.equal(m.shopSpots.length, 3);
    const D = def.DOCK;
    for (let x = D.x; x < D.x + D.w; x++) for (let y = D.y; y < D.y + D.h; y++) {
      const k = Board.key(x, y);
      assert.ok(!m.terrain[k] && !m.special[k] && !m.heal.has(k), `ท่าจอด ${k} ชั้น ${i + 1}`);
      assert.ok(!m.spawns.some((s) => s.x === x && s.y === y) && !m.shopSpots.some((s) => s.x === x && s.y === y));
    }
    for (const kind of [...Object.values(m.terrain), ...Object.values(m.special), m.healKind]) {
      assert.ok(kind.startsWith('fd_nt_'), kind);
      assert.ok(Board.TERRAIN_INFO[kind] && Board.TERRAIN_INFO[kind].name && Board.TERRAIN_INFO[kind].icon, kind);
    }
  }
});

test('Fodlan ไม่เปลี่ยน: เริ่มด่าน I · ด่านถัดไปสุ่ม 2–5 · สภาพอากาศชนิดเดียวของด่าน', () => {
  setup('fodlan');
  assert.equal(Fodlan.isNautilus(), false);
  assert.equal(match.board.area, Board.FODLAN_AREA);
  assert.equal(Fodlan.stageNow(), 1);
  assert.equal(Fodlan.publicInfo().depth, undefined);
  match.legStart = 1;
  match.roundNumber = 6;
  const seen = new Set();
  for (const r of [0, 0.3, 0.6, 0.95]) {
    match.fodlan.stage = 1;
    assert.equal(Fodlan.maybeAdvance(() => {}, () => r), true);
    seen.add(Fodlan.stageNow());
  }
  assert.deepEqual([...seen].sort(), [2, 3, 4, 5]);
  match.fodlan.stage = 2;
  match.fodlan.s.wxDone = false;
  Fodlan.startWeather();
  assert.equal(Fodlan.weatherNow().kind, 'miasma');
});

test('Eos ไม่เปลี่ยน: ด่าน 6 · area 45 · ไม่หมุนด่าน', () => {
  setup('eos', 1);
  assert.equal(Fodlan.isEos(), true);
  assert.equal(Fodlan.isNautilus(), false);
  assert.equal(Fodlan.stageNow(), 6);
  assert.equal(match.board.area, Board.EOS_AREA);
  match.legStart = 1;
  match.roundNumber = 6;
  assert.equal(Fodlan.maybeAdvance(() => {}, () => 0), false);
  assert.equal(Fodlan.stageNow(), 6);
});

test('ทาลัสซาเปิด/ปิด: เสียงข้างมากของคนที่โหวต Nautilus · เสมอ/ไม่มีข้อมูล = เปิด · เล่นอีกรอบไม่มีโหวต = ค่าเดิม', () => {
  const v = (...list) => list.map((ntWhale) => ({ ntWhale }));
  assert.equal(lobby.ntWhaleOf(v()), true, 'ไม่มีข้อมูล = เปิด');
  assert.equal(lobby.ntWhaleOf(v(null, null)), true, 'โหวตสนามอื่น = ไม่นับ');
  assert.equal(lobby.ntWhaleOf(v(false)), false);
  assert.equal(lobby.ntWhaleOf(v(true, false)), true, 'เสมอ = เปิด');
  assert.equal(lobby.ntWhaleOf(v(false, false, true)), false);
  assert.equal(lobby.ntWhaleOf(v(true, true, false, null, null)), true);
  assert.equal(lobby.ntWhaleOf(v(), false), false, 'เล่นอีกรอบ = ค่าเดิม');
  assert.equal(lobby.ntWhaleOf(v(true), false), true, 'มีโหวตใหม่ = ตามโหวต');

  // ผ่านหน้าโหวตจริง: 2 คนปิด 1 คนเปิด → ปิด · state.fodlan.whaleEnabled
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  for (let i = 0; i < 3; i++) engine.players['p' + i] = { id: 'p' + i, name: 'P' + i, position: i + 1, characterId: 'dummy', alive: true, connected: true, cards: [], statuses: {}, statusAmt: {}, seen: {}, inventory: [], ready: true };
  match.gameState = 'TEAM_MODE';
  match.nautilusWhale = null;
  lobby.voteGameMode('p0', 'ffa', 'nautilus', null, false);
  assert.equal(match.players.p0.ntWhale, false);
  lobby.voteGameMode('p1', 'ffa', 'nautilus', null, true);
  lobby.voteGameMode('p2', 'ffa', 'nautilus', null, false);
  engine.clearPhaseTimer();
  assert.equal(match.world, 'nautilus');
  assert.equal(match.nautilusWhale, false);
  assert.equal(Fodlan.publicInfo().whaleEnabled, false);
  // ไม่ส่งค่า = เปิด (ค่าเริ่ม)
  match.gameState = 'TEAM_MODE';
  for (const id of ['p0', 'p1', 'p2']) lobby.voteGameMode(id, 'ffa', 'nautilus');
  engine.clearPhaseTimer();
  assert.equal(match.nautilusWhale, true);
  assert.equal(Fodlan.publicInfo().whaleEnabled, true);
});

test('เพลง (audioPolicy): ชั้น 7–10 เงียบ · ทาลัสซาอยู่ = nautilus_whale (ปิดในโหวต = เงียบ) · ชั้น 11 = nautilus_abyss แม้ปลาวาฬอยู่ · เพลงท่าไม้ตายทับได้', () => {
  const fs = require('node:fs');
  const vm = require('node:vm');
  const policy = vm.createContext({});
  vm.runInContext(fs.readFileSync(require.resolve('../client/src/audioPolicy.js'), 'utf8').replace(/^export /gm, ''), policy);
  const st = (stage, board = {}, extra = {}) => ({ gameState: 'PLAYING', world: 'nautilus', fodlan: { stage, board, whaleEnabled: true, ...extra } });
  for (const s of [7, 8, 9, 10]) {
    assert.equal(policy.musicForState(st(s)).name, null, `ชั้น ${s} ไม่มีเพลง`);
    assert.equal(policy.musicForState(st(s, { whale: true })).name, 'nautilus_whale');
    assert.equal(policy.musicForState(st(s, { whale: true }, { whaleEnabled: false })).name, null);
  }
  assert.equal(policy.musicForState(st(11)).name, 'nautilus_abyss');
  assert.equal(policy.musicForState(st(11, { whale: true })).name, 'nautilus_abyss', 'ชั้น 5 เพลงเดิมแม้ปลาวาฬโผล่');
  assert.equal(policy.musicForState(st(8, { scene: true }, { scene: { active: true } })).name, null, 'ฉากเปลี่ยนชั้นไม่ใช่เพลงแผนที่ Fodlan');
  assert.equal(policy.musicForState({ ...st(11), skillMusic: 'ult', skillMusicSeq: 2 }).name, 'ult');
  // Fodlan ไม่เปลี่ยน
  assert.equal(policy.musicForState({ gameState: 'PLAYING', world: 'fodlan', fodlan: { stage: 2, board: {} } }).name, 'fodlan_2');
});
