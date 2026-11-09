// เล่นอีกรอบ (server/lobby.js rematchVote): ผู้เล่นที่ยังต่ออยู่กดครบ = เริ่มแมตช์ใหม่โหมด/โลกเดิมทันที · คนที่หลุดถูกตัดออก
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const match = require('../server/match.js');
const lobby = require('../server/lobby.js');

function setup(chars, mode = 'ffa') {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  chars.forEach((ch, i) => {
    engine.players['p' + i] = {
      id: 'p' + i, name: 'P' + i, position: i + 1, characterId: ch, alive: true, connected: true,
      cards: [], statuses: {}, statusAmt: {}, seen: {}, cutsceneShown: {}, inventory: [], teamId: null,
    };
  });
  engine.setGameMode(mode);
  engine.startMatch();
  engine.clearPhaseTimer();
  match.gameState = 'GAMEOVER';
  return Object.values(engine.players);
}
test.after(() => { engine.clearPhaseTimer(); for (const id of Object.keys(engine.players)) delete engine.players[id]; });

test('กดครบทุกคน = เริ่มแมตช์ใหม่ · ยังไม่ครบ = รอ · กดซ้ำ = ยกเลิก', () => {
  setup(['muimi', 'fern', 'gray']);
  lobby.rematchVote('p0');
  lobby.rematchVote('p1');
  assert.equal(match.gameState, 'GAMEOVER');
  lobby.rematchVote('p1');
  assert.equal(match.players.p1.rematch, false);
  lobby.rematchVote('p1');
  lobby.rematchVote('p2');
  engine.clearPhaseTimer();
  assert.notEqual(match.gameState, 'GAMEOVER');
  assert.notEqual(match.gameState, 'LOBBY');
  assert.equal(match.gameMode, 'ffa');
  assert.ok(Object.values(match.players).every((p) => !p.rematch));
  assert.ok(Object.values(match.players).every((p) => p.alive && p.pos));
});

test('คนที่หลุดไม่ต้องกด และถูกตัดออกจากแมตช์ใหม่', () => {
  setup(['muimi', 'fern', 'gray']);
  match.players.p2.connected = false;
  lobby.rematchVote('p0');
  lobby.rematchVote('p1');
  engine.clearPhaseTimer();
  assert.equal(match.players.p2, undefined);
  assert.notEqual(match.gameState, 'LOBBY');
  assert.equal(Object.keys(match.players).length, 2);
});

test('นอกหน้าจบเกม = ไม่ทำอะไร', () => {
  setup(['muimi', 'fern']);
  match.gameState = 'ACTION';
  lobby.rematchVote('p0');
  assert.ok(!match.players.p0.rematch);
});
