// ไล่ผู้เล่นออก (server/socket.js kickPlayer — คนเปิดห้องเท่านั้น): หายจากกระดาน/ลำดับเดิน · ถึงตาของคนนั้น = ข้าม · เหลือฝ่ายเดียว = จบเกม
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const match = require('../server/match.js');
const { kickPlayer, isHostSocket } = require('../server/socket.js');
const CharStats = require('../server/charStats.js');

function setup(chars) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  chars.forEach((ch, i) => {
    engine.players['p' + i] = {
      id: 'p' + i, name: 'P' + i, position: i + 1, characterId: ch, alive: true, connected: true,
      cards: [], statuses: {}, statusAmt: {}, seen: {}, cutsceneShown: {}, inventory: [], teamId: null,
    };
  });
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  return Object.values(engine.players);
}
function toAction(order) {
  match.gameState = 'ACTION';
  match.turnOrder = order;
  match.actorIndex = -1;
  require('../server/phases/action.js').nextActor();
  engine.clearPhaseTimer();
}

test.beforeEach(() => CharStats._reset());
test.after(() => { engine.clearPhaseTimer(); for (const id of Object.keys(engine.players)) delete engine.players[id]; });

test('คนเปิดห้อง = socket จากเครื่องนี้', () => {
  assert.equal(isHostSocket({ handshake: { address: '127.0.0.1' } }), true);
  assert.equal(isHostSocket({ handshake: { address: '::ffff:127.0.0.1' } }), true);
  assert.equal(isHostSocket({ handshake: { address: '::1' } }), true);
  assert.equal(isHostSocket({ handshake: { address: '192.168.1.20' } }), false);
  assert.equal(isHostSocket(null), false);
});

test('ไล่คนที่กำลังเดินอยู่ = ข้ามไปคนถัดไป · หายจากกระดาน', () => {
  setup(['muimi', 'fern', 'gray']);
  toAction(['p1', 'p0', 'p2']);
  assert.equal(match.actorId, 'p1');
  assert.equal(kickPlayer('p1', 'p0'), true);
  assert.equal(match.players.p1, undefined);
  assert.equal(match.actorId, 'p0');
  assert.equal(match.gameState, 'ACTION');
});

test('ไล่จนเหลือคนเดียว = จบเกม · คนถูกไล่ไม่นับสถิติ', () => {
  setup(['muimi', 'fern']);
  toAction(['p0', 'p1']);
  assert.equal(kickPlayer('p1', 'p0'), true);
  assert.equal(match.gameState, 'GAMEOVER');
  const s = CharStats.snapshot();
  assert.equal(s.fern, undefined);
});

test('ไล่ตัวเอง / ยูนิตที่ไม่มี = ไม่ทำอะไร', () => {
  setup(['muimi', 'fern', 'gray']);
  toAction(['p0', 'p1', 'p2']);
  assert.equal(kickPlayer('p0', 'p0'), false);
  assert.equal(kickPlayer('nobody', 'p0'), false);
  assert.ok(match.players.p0);
});

test('ระบบคู่: ไล่เจ้าของ = ตัวคู่หายด้วย', () => {
  setup(['muimi', 'kate', 'gray']);
  const mates = Object.values(match.players).filter((p) => p.duoOf === 'p1');
  assert.ok(mates.length >= 1);
  toAction(['p0', 'p1', 'p2']);
  kickPlayer('p1', 'p0');
  assert.equal(Object.values(match.players).filter((p) => p.duoOf === 'p1').length, 0);
});
