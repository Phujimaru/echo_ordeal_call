// สถิติตัวละครที่เครื่อง host (server/charStats.js): บันทึกตอน gameOver ครั้งเดียวต่อแมตช์ · ชนะ/แพ้/เสมอ · เขียนไฟล์แล้วอ่านกลับได้
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'echo-stats-'));
const FILE = path.join(tmpDir, 'char-stats.json');
process.env.ECHO_STATS_FILE = FILE;
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const match = require('../server/match.js');
const { gameOver } = require('../server/phases/endTurn.js');
const CharStats = require('../server/charStats.js');

function setup(chars, mode = 'ffa', teams = []) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  chars.forEach((ch, i) => {
    engine.players['p' + i] = {
      id: 'p' + i, name: 'P' + i, position: i + 1, characterId: ch, alive: true, connected: true,
      cards: [], statuses: {}, statusAmt: {}, seen: {}, cutsceneShown: {}, inventory: [], teamId: teams[i] || null,
    };
  });
  engine.setGameMode(mode);
  engine.startMatch();
  engine.clearPhaseTimer();
  return Object.values(engine.players);
}
const read = () => JSON.parse(fs.readFileSync(FILE, 'utf8')).chars;

test.beforeEach(() => { fs.rmSync(FILE, { force: true }); CharStats._reset(); });
test.after(() => { engine.clearPhaseTimer(); for (const id of Object.keys(engine.players)) delete engine.players[id]; fs.rmSync(tmpDir, { recursive: true, force: true }); });

test('อิสระ: คนสุดท้ายชนะ คนอื่นแพ้ · gameOver ซ้ำไม่นับซ้ำ', () => {
  const [a, b, c] = setup(['muimi', 'fern', 'gray']);
  b.alive = false; c.alive = false;
  assert.equal(gameOver(), true);
  gameOver();
  const s = read();
  assert.deepEqual(s.muimi, { picks: 1, wins: 1, losses: 0, draws: 0 });
  assert.deepEqual(s.fern, { picks: 1, wins: 0, losses: 1, draws: 0 });
  assert.deepEqual(s.gray, { picks: 1, wins: 0, losses: 1, draws: 0 });
  assert.ok(a.alive);
});

test('ไม่มีผู้รอด = เสมอ · แมตช์ใหม่นับต่อจากไฟล์เดิม', () => {
  let ps = setup(['muimi', 'fern']);
  ps.forEach((p) => { p.alive = false; });
  gameOver();
  CharStats._reset(); // อ่านจากไฟล์ใหม่
  ps = setup(['muimi', 'fern']);
  ps[1].alive = false;
  gameOver();
  const s = read();
  assert.deepEqual(s.muimi, { picks: 2, wins: 1, losses: 0, draws: 1 });
  assert.deepEqual(s.fern, { picks: 2, wins: 0, losses: 1, draws: 1 });
});

test('ทีม: ทุกคนในทีมที่รอดชนะ', () => {
  const ps = setup(['muimi', 'fern', 'gray', 'roland'], 'duo', ['A', 'A', 'B', 'B']);
  ps[2].alive = false; ps[3].alive = false; ps[1].alive = false;
  assert.equal(gameOver(), true);
  const s = read();
  assert.equal(s.muimi.wins, 1);
  assert.equal(s.fern.wins, 1);
  assert.equal(s.gray.losses, 1);
  assert.equal(s.roland.losses, 1);
});

test('ผู้เล่นคนเดียว (ทดสอบ) ไม่นับ', () => {
  setup(['muimi']);
  match.forcedWinnerId = 'p0';
  assert.equal(gameOver(), true);
  assert.equal(fs.existsSync(FILE), false);
  assert.deepEqual(CharStats.snapshot(), {});
});
