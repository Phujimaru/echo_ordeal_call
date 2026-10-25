// โหมด Moon Cell — Raid Boss (server/moonCell.js · GRID_PLAN §8.4)
//  โหวตสนามดวงจันทร์ · กระดาน 20×20 · ฮาคุโนะ 2 ตัว + Moon Cell · ฮาคุโนะเดินก่อนเสมอ · ตีปกติ (ATK 2 · แต้มสกิล −1)
//  ฟื้นคืนชีพหลัง 3 เทิร์น · ชนะ/แพ้ · คำสาปแห่งดวงจันทร์ (เล็ง → เตือน → คลิป → ลงผล → บัฟฮาคุโนะ) · AI ตาเดิน
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const match = require('../server/match.js');
const Board = require('../server/board.js');
const Moon = require('../server/moonCell.js');
const lobby = require('../server/lobby.js');
const combat = require('../server/combat.js');
const timers = require('../server/timers.js');
const action = require('../server/phases/action.js');
const endTurnPhase = require('../server/phases/endTurn.js');
const Journey = require('../characters/_journey.js');

const realRandom = Math.random;
const realStart = timers.startPhaseTimer;
// ตัวจับเวลาเฟส: เก็บ callback ไว้ยิงเอง (fire) แทนการรอจริง
let pending = null;
function fakeTimers() { timers.startPhaseTimer = (secs, fn) => { pending = fn; match.timeLeft = Math.ceil(secs); }; }
function fire() { const fn = pending; pending = null; if (fn) fn(); }

// 'dummy' = ตัวละครสมมติไม่มีฮุค
function setup(n = 2) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  for (let i = 0; i < n; i++) {
    engine.players['p' + i] = {
      id: 'p' + i, name: 'P' + i, position: i + 1, characterId: 'dummy', alive: true, connected: true,
      cards: [], statuses: {}, statusAmt: {}, seen: {}, inventory: [], teamId: 'A', teamConfirmed: true,
    };
  }
  engine.setGameMode('moon');
  match.world = 'moon';
  Moon.setAiDelay(0);
  engine.startMatch();
  engine.clearPhaseTimer();
  return engine.players;
}
const P = () => engine.players;
const boss = (k) => P()[match.moon.bosses[k].id];
const cell = () => P()[match.moon.cellId];
const put = (p, x, y) => { p.pos = { x, y }; };
// ย้ายทุกคนออกไปมุมล่าง (ไม่ขวางทาง/ไม่อยู่ในระยะ)
function park() { let x = 0; for (const p of Object.values(P())) if (!p.summon) put(p, x++ * 2, 19); }

test.beforeEach(() => { fakeTimers(); });
test.afterEach(() => { Math.random = realRandom; timers.startPhaseTimer = realStart; pending = null; engine.clearPhaseTimer(); });
test.after(() => {
  Moon.setAiDelay(700);
  match.world = 'earth'; match.moon = null; engine.setGameMode('ffa');
  for (const id of Object.keys(engine.players)) delete engine.players[id];
});

test('โหวตสนามดวงจันทร์: มีโหมดเดียว moon · ไม่ข้ามสนาม · โหวตครบ = เข้าแมตช์ทีม A ทันที', () => {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  engine.players.p0 = { id: 'p0', name: 'P0', position: 1, characterId: 'dummy', alive: true, connected: true, cards: [], statuses: {}, statusAmt: {}, seen: {}, inventory: [], ready: true };
  const opts = lobby.modeVoteSummary();
  assert.deepEqual(opts.filter((o) => o.world === 'moon').map((o) => o.mode), ['moon']);
  assert.ok(!opts.some((o) => o.world !== 'moon' && o.mode === 'moon'));
  match.gameState = 'TEAM_MODE';
  lobby.voteGameMode('p0', 'ffa', 'moon');
  assert.equal(match.gameState, 'TEAM_MODE', 'ffa บนดวงจันทร์ = โหวตไม่ได้');
  lobby.voteGameMode('p0', 'moon', 'earth');
  assert.equal(match.gameState, 'TEAM_MODE', 'moon บนโลก = โหวตไม่ได้');
  Moon.setAiDelay(0);
  lobby.voteGameMode('p0', 'moon', 'moon');
  engine.clearPhaseTimer();
  assert.equal(match.world, 'moon');
  assert.equal(match.gameMode, 'moon');
  assert.equal(P().p0.teamId, 'A');
  assert.ok(Moon.active());
});

test('ฉากเปิดแมตช์: journey ส่งฉาก start แบบ moon ให้ client เล่นฉากบินไปดวงจันทร์ · ไม่มีภูมิภาค', () => {
  setup(1);
  match.journeyScene = { seq: 7, active: true, mode: 'start', area: 1, fromArea: null };
  const j = Journey.publicInfo(engine, match.journeyScene);
  assert.equal(j.moon, true);
  assert.ok(!j.colony);
  assert.deepEqual({ seq: j.scene.seq, active: j.scene.active, mode: j.scene.mode }, { seq: 7, active: true, mode: 'start' });
  assert.equal(Journey.publicInfo(engine, null), null);
});

test('เริ่มแมตช์: กระดาน 20×20 · Moon Cell 2×2 · ฮาคุโนะ 2 ตัว · ไม่มีการเดินทาง · ผู้เล่นเป็นพวกเดียวกัน', () => {
  setup(3);
  const map = action.boardMap();
  assert.equal(match.board.area, Board.MOON_AREA);
  assert.equal(map.cols, 20); assert.equal(map.rows, 20);
  assert.equal(Journey.active(engine), false);
  assert.ok(lobby.teamModeActive());
  const c = cell();
  assert.equal(c.boardSize, 2);
  assert.deepEqual(c.pos, Board.MOON.cell);
  assert.equal(c.hp, Moon.CELL_HP); assert.equal(c.armor, Moon.CELL_ARMOR);
  for (const k of ['m', 'f']) {
    const b = boss(k);
    assert.equal(b.hp, Moon.BOSS_HP); assert.equal(b.armor, Moon.BOSS_ARMOR);
    assert.equal(action.movOf(b), Moon.BOSS_MOV);
    assert.ok(combat.sameTeam(b, c), 'ฮาคุโนะกับ Moon Cell ฝ่ายเดียวกัน');
    assert.ok(!combat.sameTeam(b, P().p0));
  }
  assert.ok(combat.sameTeam(P().p0, P().p1), 'ผู้เล่นทุกคนทีมเดียวกัน');
  for (const p of [P().p0, P().p1, P().p2]) assert.ok(p.pos.y >= 18, 'ผู้เล่นเกิดขอบใต้');
  assert.equal(Moon.outcome(), null);
});

test('ลำดับเดิน: ฮาคุโนะเดินก่อนผู้เล่นเสมอ · เหรียญคนแรกเป็นของผู้เล่นคนแรก', () => {
  setup(2);
  for (const p of [P().p0, P().p1]) p.gold = 0;
  action.beginOrder();
  assert.deepEqual(match.turnOrder.slice(0, 2), [boss('m').id, boss('f').id]);
  assert.equal(match.turnOrder.length, 4);
  const first = P()[match.turnOrder[2]];
  assert.ok(first.gold > 0);
});

test('Moon Cell ไม่ติดสถานะใดๆ', () => {
  setup(1);
  combat.applyBuff(cell(), 'guard', 1, 2);
  assert.equal(combat.applyDebuff(cell(), 'stun', null, 1), false);
  assert.deepEqual(cell().statuses, {});
});

test('ตีปกติของฮาคุโนะ: พลังโจมตี 2 (เกราะก่อน) · โดนแล้วแต้มสกิลของเป้า −1 · คริ 25%', () => {
  setup(1);
  park();
  const b = boss('m'), t = P().p0;
  put(t, b.pos.x, b.pos.y + 1);
  t.hp = 7; t.armor = 3; t.skillPoints = 4;
  Math.random = () => 0.99; // ไม่คริ ไม่หลบ
  engine.setActor(b.id);
  assert.ok(action.attackTarget(b.id, t.id));
  assert.equal(t.armor, 1);
  assert.equal(t.hp, 7);
  assert.equal(t.skillPoints, 3);
  assert.equal(engine.CHAR_HOOKS.kishinami_hakuno.critPct(b), 25);
});

test('ฮาคุโนะตาย → ฟื้นต้นเทิร์นที่ 3 ถัดมา HP/เกราะเต็ม · ตายคนเดียว = ยังไม่ชนะ', () => {
  setup(1);
  park();
  engine.setRoundNumber(5);
  combat.instantDeath(boss('m'));
  assert.equal(match.moon.bosses.m.deadRound, 5);
  assert.equal(Moon.outcome(), null);
  engine.setRoundNumber(6); // ต้นเทิร์น 7 = ยังไม่ฟื้น
  Moon.preRound(() => {});
  assert.ok(!boss('m') || !boss('m').alive);
  engine.setRoundNumber(7); // ต้นเทิร์น 8 = ฟื้น
  assert.equal(Moon.preRound(() => {}), true, 'มีฉากฟื้นคืนชีพ');
  const m = boss('m');
  assert.ok(m && m.alive && m.pos);
  assert.equal(m.hp, Moon.BOSS_HP); assert.equal(m.armor, Moon.BOSS_ARMOR);
  assert.equal(match.moon.bosses.m.deadRound, null);
});

test('ชนะ: ฮาคุโนะตายพร้อมกันทั้งคู่ / Moon Cell ถูกทำลาย · แพ้: ผู้เล่นตายหมด', () => {
  setup(1);
  combat.instantDeath(boss('m'));
  combat.instantDeath(boss('f'));
  assert.equal(Moon.outcome(), 'win');
  assert.equal(endTurnPhase.gameOver(), true);
  assert.equal(match.gameState, 'GAMEOVER');
  assert.equal(match.winningTeamId, 'A');
  assert.equal(match.moon.result, 'win');

  setup(1);
  combat.dealMixed(cell(), 99);
  combat.resolveDamageAftermath(cell());
  assert.equal(Moon.outcome(), 'win');

  setup(2);
  combat.instantDeath(P().p0);
  assert.equal(Moon.outcome(), null);
  combat.instantDeath(P().p1);
  assert.equal(Moon.outcome(), 'lose');
  assert.equal(endTurnPhase.gameOver(), true);
  assert.equal(match.winningTeamId, null);
  assert.equal(match.moon.result, 'lose');
});

test('คำสาปแห่งดวงจันทร์: เล็งต้นเทิร์น 3 (คลุมผู้เล่นมากสุด) → ลงต้นเทิร์น 4 หลังคลิป · ดาเมจ 3 + ลบบัฟ · ฮาคุโนะแม่นยำ/ล้างดีบัฟ/ฟื้น 1', () => {
  setup(3);
  park();
  put(P().p0, 4, 12); put(P().p1, 6, 13); put(P().p2, 17, 19);
  engine.setRoundNumber(1); // ต้นเทิร์น 2 = ยังไม่เล็ง
  Moon.preRound(() => {});
  assert.equal(match.moon.curse, null);
  engine.setRoundNumber(2); // ต้นเทิร์น 3
  assert.equal(Moon.preRound(() => {}), true, 'ฉากเตือน');
  const curse = match.moon.curse;
  assert.ok(curse);
  assert.equal(curse.land, 4);
  const inArea = (p) => Math.abs(p.pos.x - curse.at.x) <= 4 && Math.abs(p.pos.y - curse.at.y) <= 4;
  assert.ok(inArea(P().p0) && inArea(P().p1), 'คลุม 2 คนที่อยู่ใกล้กัน');
  assert.ok(!inArea(P().p2));
  fire(); // จบฉากเตือน

  for (const p of [P().p0, P().p1, P().p2]) { p.hp = 7; p.armor = 1; }
  combat.applyBuff(P().p0, 'guard', 1, 3);
  combat.applyBuff(P().p0, 'might', 1, 3);
  const m = boss('m'), f = boss('f');
  m.hp = 10; combat.applyDebuff(m, 'weak', 1, 2);
  match.moon.pillars = []; // เสาข้อมูลสุ่ม — ไม่ให้ปนผลคำสาป
  engine.setRoundNumber(3); // ต้นเทิร์น 4 = ลงผล
  let resumed = 0;
  assert.equal(Moon.preRound(() => { resumed++; }), true);
  assert.equal(match.gameState, 'CUTSCENE');
  assert.ok(match.cutsceneInfo && /hakuno_duo_ultimate\.mp4$/.test(match.cutsceneInfo.video), 'เล่นคลิปท่าไม้ตายก่อน');
  assert.equal(P().p0.hp, 7, 'ยังไม่ลงผลระหว่างคลิป');
  fire(); // คลิปจบ → ลงผล → ฉากบนกระดาน
  assert.equal(P().p0.armor, 0); assert.equal(P().p0.hp, 5, 'ดาเมจ 3 เกราะก่อน · คุ้มครองถูกลบก่อนโดน');
  assert.ok(!(P().p0.statuses.guard > 0) && !(P().p0.statuses.might > 0), 'บัฟถูกลบหมด');
  assert.equal(P().p1.hp, 5);
  assert.equal(P().p2.hp, 7, 'นอกพื้นที่ไม่โดน');
  for (const b of [m, f]) assert.equal(b.statuses.accurate, 3);
  assert.ok(!(m.statuses.weak > 0), 'ล้างดีบัฟ');
  assert.equal(m.hp, 11, 'ฟื้น 1');
  assert.equal(match.moon.curse, null);
  fire(); // จบฉากบนกระดาน → กลับไปแจกไพ่
  assert.equal(resumed, 1);
});

test('คำสาป: ฮาคุโนะอยู่ไม่ครบ = ไม่เล็ง · ตายระหว่างรอลง = ยกเลิก', () => {
  setup(1);
  park();
  engine.setRoundNumber(2);
  Moon.preRound(() => {});
  assert.ok(match.moon.curse);
  fire();
  combat.instantDeath(boss('f'));
  P().p0.hp = 7; P().p0.armor = 3;
  match.moon.pillars = [];
  engine.setRoundNumber(3);
  Moon.preRound(() => {});
  assert.equal(match.moon.curse, null);
  assert.equal(P().p0.hp, 7); assert.equal(P().p0.armor, 3);
  assert.equal(match.cutsceneQueue.length, 0, 'ไม่เล่นคลิป');

  setup(1);
  park();
  combat.instantDeath(boss('m'));
  engine.setRoundNumber(2);
  Moon.preRound(() => {});
  assert.equal(match.moon.curse, null, 'ไม่ครบตั้งแต่ตอนเล็ง');
});

test('AI: เล็งคนที่ใกล้ที่สุด → เลือดน้อยสุด · ไม่เล็งฮาคุโนะ/Moon Cell · ตีไม่ถึงใคร = เดินเข้าหา (ไม่ออกห่าง Moon Cell เกิน 8)', () => {
  setup(2);
  park();
  const m = boss('m');
  put(P().p0, m.pos.x + 2, m.pos.y + 2); P().p0.hp = 2; P().p0.armor = 0;
  put(P().p1, m.pos.x - 2, m.pos.y + 1); P().p1.hp = 7; P().p1.armor = 3;
  engine.setActor(m.id);
  const plan = Moon.planTurn(m);
  assert.equal(plan.targetId, 'p1', 'ใกล้กว่า (3 ช่อง) ชนะเลือดน้อย (4 ช่อง)');
  assert.equal(Board.dist(plan.to, P().p1.pos), 1);
  put(P().p0, m.pos.x + 2, m.pos.y + 1);
  assert.equal(Moon.planTurn(m).targetId, 'p0', 'ระยะเท่ากัน = เลือดน้อยสุด');
  assert.ok(![boss('f').id, cell().id].includes(Moon.planTurn(m).targetId));

  // ไกลเกินระยะเดิน: เดินเข้าหา แต่ไม่ออกนอกสายจูง
  park();
  put(P().p0, 10, 19); put(P().p1, 0, 19);
  engine.setActor(m.id);
  const far = Moon.planTurn(m);
  assert.equal(far.targetId, null);
  assert.ok(far.to);
  assert.ok(Board.dist({ ...far.to, size: 1 }, Board.boxOf(cell())) <= Moon.LEASH);
});

test('AI: ตาของฮาคุโนะเริ่ม = เดิน + ตีเอง แล้วจบตา', () => {
  setup(1);
  park();
  const m = boss('m'), t = P().p0;
  put(t, m.pos.x + 3, m.pos.y + 1);
  t.hp = 7; t.armor = 3;
  Math.random = () => 0.99;
  engine.setActor(m.id);
  Moon.startAi(m);
  assert.equal(Board.dist(m.pos, t.pos), 1, 'เดินไปประชิด');
  assert.equal(t.armor, 1, 'ตีแล้ว');
  assert.equal(match.gameState, 'ATTACKING');
});

test('วงจรจริง: ลำดับเดิน → ตาฮาคุโนะ 2 ตัวเล่นเอง → ถึงตาผู้เล่น', () => {
  setup(1);
  park();
  action.beginOrder();
  fire(); // ORDER หมด → nextActor
  for (let i = 0; i < 10 && match.actorId !== 'p0'; i++) fire(); // ฉากตี/จบตาของฮาคุโนะ
  assert.equal(match.gameState, 'ACTION');
  assert.equal(match.actorId, 'p0');
  assert.equal(match.actorIndex, 2);
});

test('ฮาคุโนะเห็นทะลุล่องหน/พุ่มหญ้า: เล็งได้ · ผู้เล่นยังมองไม่เห็นกันตามปกติ', () => {
  setup(1);
  park();
  const m = boss('m'), t = P().p0;
  put(t, m.pos.x + 1, m.pos.y);
  const vis = require('../server/visibility.js');
  const realStealth = vis.stealthed;
  t.exposedRound = -1;
  // จำลองล่องหนด้วยฮุคตัวละครชั่วคราว
  engine.CHAR_HOOKS.dummy = { id: 'dummy', stealthed: () => true };
  try {
    assert.equal(vis.hiddenFrom(m, t), false);
    engine.setActor(m.id);
    assert.equal(Moon.planTurn(m).targetId, 'p0');
  } finally { delete engine.CHAR_HOOKS.dummy; }
  assert.equal(typeof realStealth, 'function');
});

test('AI: หนาม/กำแพงน้ำแข็งขวางทาง = ตีทิ้ง', () => {
  setup(1);
  park();
  const m = boss('m'), t = P().p0;
  const Ice = require('../server/ice.js');
  // ล้อมฮาคุโนะด้วยกำแพงทุกด้านที่ว่าง → เดินไม่ได้ → ต้องตีกำแพงที่อยู่ทางเป้า
  put(t, m.pos.x, m.pos.y + 6);
  const ring = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: m.pos.x + dx, y: m.pos.y + dy }));
  for (const c of ring) Ice.placeWall(c.x, c.y, 'p0');
  engine.setActor(m.id);
  const plan = Moon.planTurn(m);
  assert.equal(plan.targetId, `spike:${m.pos.x},${m.pos.y + 1}`, 'กำแพงด้านที่เป้าอยู่');
});

test('เสาข้อมูล: เตือนตั้งแต่ต้นเทิร์น 2 → พุ่งต้นเทิร์นถัดไป · ผู้เล่นบนช่องเสียหาย 1 · ฮาคุโนะ/Moon Cell ไม่โดน · หนามแตก', () => {
  setup(2);
  park();
  engine.setRoundNumber(0); // ต้นเทิร์น 1 = ยังไม่มีเสา
  Moon.preRound(() => {}); fire();
  assert.deepEqual(match.moon.pillars, []);
  engine.setRoundNumber(1); // ต้นเทิร์น 2 = เตือนชุดแรก
  Moon.preRound(() => {}); fire();
  assert.equal(match.moon.pillars.length, Math.min(Moon.PILLAR_MAX, Moon.PILLAR_BASE + 1));
  const m = boss('m'), t = P().p0;
  const Ice = require('../server/ice.js');
  put(t, 3, 12); t.hp = 7; t.armor = 0;
  Ice.placeWall(5, 12, 'p0');
  match.moon.pillars = [{ x: 3, y: 12 }, { x: m.pos.x, y: m.pos.y }, { x: 5, y: 12 }, { x: Board.MOON.cell.x, y: Board.MOON.cell.y }];
  const bossHp = m.hp, cellHp = cell().hp;
  engine.setRoundNumber(2); // ต้นเทิร์น 3 = พุ่ง
  assert.equal(Moon.preRound(() => {}), true);
  assert.equal(t.hp, 6);
  assert.equal(m.hp, bossHp);
  assert.equal(cell().hp, cellHp);
  assert.equal(Ice.spikeAt(5, 12), null);
  assert.ok(match.moon.pillars.length > 0, 'ชุดใหม่ของเทิร์นหน้า');
});
