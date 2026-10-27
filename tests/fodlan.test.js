// โหมด Fodlan (server/fodlan.js · GRID_PLAN §8.5)
//  โหวตสนาม Fodlan (ffa/duo/trio) · เริ่มด่าน I เสมอ · สภาพอากาศ 50% ตอนเข้าด่าน อยู่ 3 เทิร์น
//  ครบ 6 เทิร์น = สุ่มด่านถัดไป 2–5 + ฉากเปลี่ยนแผนที่ (CUTSCENE) · กลางวัน/กลางคืนไม่มีผล · ไม่ใช่การเดินทางของ Origin
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const match = require('../server/match.js');
const Board = require('../server/board.js');
const Fodlan = require('../server/fodlan.js');
const lobby = require('../server/lobby.js');
const timers = require('../server/timers.js');
const Journey = require('../characters/_journey.js');

const realRandom = Math.random;
const realStart = timers.startPhaseTimer;
function fakeTimers() { timers.startPhaseTimer = (secs) => { match.timeLeft = Math.ceil(secs); }; }

function setup(n = 2, random = 0.99) {
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
}

test.beforeEach(() => { fakeTimers(); });
test.afterEach(() => { Math.random = realRandom; timers.startPhaseTimer = realStart; engine.clearPhaseTimer(); });
test.after(() => {
  match.world = 'earth'; match.fodlan = null; engine.setGameMode('ffa');
  for (const id of Object.keys(engine.players)) delete engine.players[id];
});

test('โหวต: สนาม Fodlan มีโหมด ffa / duo / trio · ไม่มี moon · โหวตครบ = แมตช์อยู่ในโลก fodlan', () => {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  engine.players.p0 = { id: 'p0', name: 'P0', position: 1, characterId: 'dummy', alive: true, connected: true, cards: [], statuses: {}, statusAmt: {}, seen: {}, inventory: [], ready: true };
  const opts = lobby.modeVoteSummary().filter((o) => o.world === 'fodlan');
  assert.deepEqual(opts.map((o) => o.mode).sort(), ['duo', 'ffa', 'trio']);
  match.gameState = 'TEAM_MODE';
  lobby.voteGameMode('p0', 'moon', 'fodlan');
  assert.equal(match.gameState, 'TEAM_MODE', 'moon บน Fodlan = โหวตไม่ได้');
  lobby.voteGameMode('p0', 'ffa', 'fodlan');
  engine.clearPhaseTimer();
  assert.equal(match.world, 'fodlan');
  assert.equal(match.gameMode, 'ffa');
});

test('เริ่มแมตช์: ด่าน I (area 40) เสมอ · ไม่ใช่การเดินทางของ Origin · state.fodlan ส่งด่าน/เทิร์นที่เหลือ', () => {
  setup(2);
  assert.equal(match.board.area, Board.FODLAN_AREA);
  assert.ok(Board.isFodlanArea(match.board.area));
  assert.equal(Fodlan.stageNow(), 1);
  assert.equal(Journey.active(engine), false);
  assert.equal(Journey.publicInfo(engine, null), null);
  const info = Fodlan.publicInfo();
  assert.equal(info.stage, 1);
  assert.equal(info.weather, null, 'สุ่มได้ 99 (≥ 50) = ไม่เกิดสภาพอากาศ');
  assert.deepEqual(info.route, [1]);
});

test('สภาพอากาศ: สุ่ม < 50% ตอนเข้าด่าน = เกิดทันที ชนิดตามด่าน อยู่ 3 เทิร์นแล้วสงบ', () => {
  setup(2, 0.1);
  assert.deepEqual(Fodlan.weatherNow(), { kind: 'storm', left: 3 });
  match.roundNumber = 1;
  Fodlan.onEndTurn(); Fodlan.onEndTurn();
  assert.equal(Fodlan.weatherNow().left, 1);
  Fodlan.onEndTurn();
  assert.equal(Fodlan.weatherNow(), null);
  assert.equal(Fodlan.publicInfo().weather, null);
});

test('สภาพอากาศ: ยังไม่เกิด = สุ่มใหม่ทุกจบเทิร์น · เกิดแล้ว 1 ครั้ง = รอด่านถัดไป · เทิร์นสุดท้ายของด่านไม่สุ่ม', () => {
  setup(2); // เข้าด่าน: 99 = ไม่เกิด
  match.legStart = 1;
  match.roundNumber = 1;
  Fodlan.onEndTurn(() => 0.99);
  assert.equal(Fodlan.weatherNow(), null, 'สุ่มได้ 99 = ยังไม่เกิด');
  match.roundNumber = 2;
  Fodlan.onEndTurn(() => 0.1);
  assert.deepEqual(Fodlan.weatherNow(), { kind: 'storm', left: 3 }, 'จบเทิร์น 2 สุ่มติด → เทิร์น 3–5');
  assert.equal(match.fodlan.s.weather, match.fodlan.weather, 'ฮุคของด่านเห็นด้วย (st.weather)');
  for (const r of [3, 4, 5]) { match.roundNumber = r; Fodlan.onEndTurn(() => 0); }
  assert.equal(Fodlan.weatherNow(), null, 'อยู่ 3 เทิร์นแล้วสงบ · ไม่เกิดซ้ำในด่านเดิม');
  // ด่านใหม่: เข้าไม่ติด → เทิร์นสุดท้ายของด่าน (12) ไม่สุ่ม
  match.roundNumber = 6;
  let n = 0;
  Fodlan.maybeAdvance(() => {}, () => [0, 0.99][n++]);
  assert.equal(Fodlan.weatherNow(), null);
  match.roundNumber = 12;
  Fodlan.onEndTurn(() => 0);
  assert.equal(Fodlan.weatherNow(), null, 'เทิร์นสุดท้ายของด่าน — ด่านถัดไปสุ่มเอง');
  match.roundNumber = 11;
  Fodlan.onEndTurn(() => 0);
  assert.equal(Fodlan.weatherNow().kind, 'miasma');
});

test('เหตุการณ์ (fx): seq ไม่นับใหม่ตอนเปลี่ยนด่าน/แมตช์ใหม่ (client จำ seq ที่เห็นแล้ว — นับใหม่ = เอฟเฟคไม่ขึ้น)', () => {
  setup(2);
  const a = Fodlan.makeCtx().fx('test');
  match.legStart = 1;
  match.roundNumber = 6;
  Fodlan.maybeAdvance(() => {}, () => 0.99);
  const b = Fodlan.makeCtx().fx('test');
  assert.ok(b > a, 'ด่านถัดไป');
  setup(2);
  const c = Fodlan.makeCtx().fx('test');
  assert.ok(c > b, 'แมตช์ใหม่');
});

test('ครบ 6 เทิร์น: สุ่มด่านถัดไป 2–5 (ไม่ซ้ำ) · ย้ายกระดาน · ฉากเปลี่ยนแผนที่ (advance) · สุ่มสภาพอากาศใหม่', () => {
  setup(2);
  match.legStart = 1;
  match.roundNumber = 5;
  let started = 0;
  assert.equal(Fodlan.maybeAdvance(() => { started++; }), false, 'เทิร์น 5 ยังไม่ครบด่าน');
  match.roundNumber = 6;
  const seen = new Set();
  for (const r of [0, 0.3, 0.6, 0.95]) {
    match.fodlan.stage = 1;
    assert.equal(Fodlan.maybeAdvance(() => { started++; }, () => r), true);
    const s = Fodlan.stageNow();
    assert.ok(s >= 2 && s <= 5);
    seen.add(s);
    assert.equal(match.board.area, Fodlan.areaOf(s));
    assert.equal(match.journeyScene.mode, 'advance');
    assert.equal(match.journeyScene.fromArea, 1);
    assert.equal(Fodlan.publicInfo().scene.stage, s);
  }
  assert.deepEqual([...seen].sort(), [2, 3, 4, 5]);
  assert.equal(started, 4);
  // ด่านปัจจุบันไม่ถูกสุ่มซ้ำ
  match.fodlan.stage = 3;
  for (const r of [0, 0.4, 0.8, 0.99]) { match.fodlan.stage = 3; Fodlan.maybeAdvance(() => {}, () => r); assert.notEqual(Fodlan.stageNow(), 3); }
  // ด่าน V = ออร่า
  match.fodlan.stage = 1;
  Fodlan.maybeAdvance(() => {}, () => 0.95); // ด่าน 5 · สุ่มสภาพอากาศได้ 95 = ไม่เกิด
  assert.equal(Fodlan.stageNow(), 5);
  match.fodlan.stage = 1;
  let n = 0;
  Fodlan.maybeAdvance(() => {}, () => [0.99, 0.1][n++]); // ด่าน 5 · สภาพอากาศเกิด
  assert.deepEqual(Fodlan.weatherNow(), { kind: 'aura', left: 3 });
});

test('กลางวัน/กลางคืนไม่มีผลใน Fodlan: ไม่มีภาษีกลางคืน · ไม่มีแต้มเช้า', () => {
  setup(1);
  assert.equal(Journey.nightTaxOn(engine, true), false);
  assert.equal(Journey.skillBonus(engine, true), 0);
  match.world = 'earth';
  engine.setGameMode('moon'); // ไม่ใช่การเดินทาง = กฎวัน/คืนเดิม
  assert.equal(Journey.nightTaxOn(engine, true), true);
  assert.equal(Journey.skillBonus(engine, true), 1);
  engine.setGameMode('ffa');
  match.world = 'fodlan';
});
