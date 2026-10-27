// หน้าเลือกโหมด 2 ชั้น (GRID_PLAN §8.3): โหวตสนาม (โลก / Colony) คู่กับโหมด
//  modeVotes มีครบ 2 สนาม × 3 โหมด + ดวงจันทร์ 1 โหมด (Moon Cell — GRID_PLAN §8.4) · โหวต { mode, world } → state.world · player.modeWorld
//  สนามไม่รู้จัก = โลก · ย้อนกลับห้องรอ = ล้างสนามกลับเป็นโลก · คนละสนามโหมดเดียวกัน = นับแยกกัน (ยังไม่ครบเสียง)
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { io } = require('../client/node_modules/socket.io-client');

const projectRoot = path.resolve(__dirname, '..');
const port = 39000 + (process.pid % 1000);
const url = `http://127.0.0.1:${port}`;

function waitForEvent(socket, event, predicate = () => true, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off(event, listener); reject(new Error(`Timed out waiting for ${event}`)); }, timeoutMs);
    function listener(payload) {
      if (!predicate(payload)) return;
      clearTimeout(timer);
      socket.off(event, listener);
      resolve(payload);
    }
    socket.on(event, listener);
  });
}
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitForHttp() {
  for (let i = 0; i < 40; i++) {
    try { const r = await fetch(url); if (r.ok) return; } catch {}
    await delay(100);
  }
  throw new Error('Server did not become ready');
}
async function connectClient() {
  const socket = io(url, { autoConnect: false, forceNew: true, reconnection: false });
  const connected = waitForEvent(socket, 'connect');
  socket.connect();
  await connected;
  return socket;
}

test('เลือกสนาม: โหวต Colony คู่กับโหมด · นับแยกสนาม · ย้อนกลับล้างเป็นโลก', { timeout: 30000 }, async () => {
  const server = spawn(process.execPath, ['server.js'], {
    cwd: projectRoot,
    env: { ...process.env, PORT: String(port), RECONNECT_GRACE_MS: '100' },
    stdio: 'ignore',
  });
  const sockets = [];
  try {
    await waitForHttp();
    const a = await connectClient();
    const b = await connectClient();
    sockets.push(a, b);
    let latest = null;
    a.on('state', (s) => { latest = s; });
    const aJoined = waitForEvent(a, 'joined');
    a.emit('join', { name: 'Ann', position: 1, characterId: 'muimi' });
    await aJoined;
    const two = waitForEvent(a, 'state', (s) => s.players.length === 2);
    b.emit('join', { name: 'Bee', position: 2, characterId: 'muimi' });
    await two;

    // ทุกคนพร้อม → หน้าเลือกโหมด
    const tmP = waitForEvent(a, 'state', (s) => s.gameState === 'TEAM_MODE');
    a.emit('toggleReady'); b.emit('toggleReady');
    const tm = await tmP;
    assert.equal(tm.world, 'earth', 'เข้าหน้าเลือกโหมด = สนามตั้งต้นโลก');
    const keys = tm.modeVotes.map((o) => `${o.world}:${o.mode}`).sort();
    assert.deepEqual(keys, ['colony:duo', 'colony:ffa', 'colony:trio', 'earth:duo', 'earth:ffa', 'earth:trio', 'fodlan:duo', 'fodlan:ffa', 'fodlan:trio', 'moon:moon']);

    // คนละสนาม โหมดเดียวกัน → ยังไม่ครบเสียง
    a.emit('selectGameMode', { mode: 'ffa', world: 'colony' });
    await waitForEvent(a, 'state', (s) => s.players.find((p) => p.name === 'Ann')?.modeVote === 'ffa');
    b.emit('selectGameMode', { mode: 'ffa', world: 'earth' });
    await delay(300);
    assert.equal(latest.gameState, 'TEAM_MODE', 'โลก:อิสระ กับ Colony:อิสระ คือคนละตัวเลือก');
    const ann = latest.players.find((p) => p.name === 'Ann');
    const bee = latest.players.find((p) => p.name === 'Bee');
    assert.equal(ann.modeWorld, 'colony');
    assert.equal(bee.modeWorld, 'earth');
    const col = latest.modeVotes.find((o) => o.world === 'colony' && o.mode === 'ffa');
    assert.equal(col.voteCount, 1);

    // ย้อนกลับห้องรอ → ล้างโหวต + สนามกลับเป็นโลก
    const lobbyP = waitForEvent(a, 'state', (s) => s.gameState === 'LOBBY');
    a.emit('modeBackToLobby');
    const lob = await lobbyP;
    assert.equal(lob.world, 'earth');
    assert.ok(lob.players.every((p) => !p.modeVote && !p.modeWorld));

    // พร้อมใหม่ → โหวต Colony ครบ → แมตช์เริ่มในสนาม Colony
    await delay(400);
    const tm2 = waitForEvent(a, 'state', (s) => s.gameState === 'TEAM_MODE');
    a.emit('toggleReady'); b.emit('toggleReady');
    await tm2;
    const started = waitForEvent(a, 'state', (s) => s.gameState !== 'TEAM_MODE' && s.gameState !== 'LOBBY');
    a.emit('selectGameMode', { mode: 'ffa', world: 'colony' });
    b.emit('selectGameMode', { mode: 'ffa', world: 'colony' });
    const st = await started;
    assert.equal(st.gameMode, 'ffa');
    assert.equal(st.world, 'colony');

    // สนามไม่รู้จัก = โลก (ทดสอบผ่านฟังก์ชันตรง)
    const lobby = require('../server/lobby');
    assert.equal(lobby.normWorld('mars'), 'earth');
    assert.equal(lobby.normWorld('colony'), 'colony');
  } finally {
    for (const s of sockets) s.disconnect();
    server.kill();
  }
});
