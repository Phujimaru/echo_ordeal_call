// Socket.io: เชื่อมต่อ/หลุด/กลับเข้า + รับคำสั่งผู้เล่น
// export ก่อน require: ไฟล์ใน server/ require วนกันเอง — function declaration ถูก hoist จึงพร้อมใช้ตั้งแต่บรรทัดแรก
Object.assign(module.exports, {
  scheduleDisconnectedRemoval, newPlayerRecord,
});

const crypto = require("crypto");
const { CHARACTERS, CHAR_BY_ID, publicRoster } = require("../characters");
const CHAR_HOOKS = require("../characters/index");
const { io } = require("./app");
const { MAX_ARMOR, MAX_HP, MAX_PLAYERS, RECONNECT_GRACE_MS } = require("./constants");
const match = require("./match");
const action = require("./phases/action");
const characterRules = require("./characterRules");
const combat = require("./combat");
const draw = require("./phases/draw");
const lobby = require("./lobby");
const qteSystem = require("./qte");
const shop = require("./shop");
const skills = require("./skills");
const timers = require("./timers");
const view = require("./view");

// playerId is independent from socket.id so a reconnect can reclaim the same player.
const sessions = new Map();          // sessionToken -> playerId
const socketPlayerIds = new Map();   // socket.id -> playerId
const disconnectTimers = new Map();  // playerId -> timeout
const reservationTimers = new Map(); // socket.id -> timeout

// ============================================================
//  Socket.io
// ============================================================
function consumeEventQuota(socket, event, limit, windowMs = 1000) {
  const now = Date.now();
  const rates = socket.data.eventRates || (socket.data.eventRates = new Map());
  let bucket = rates.get(event);
  if (!bucket || now - bucket.startedAt >= windowMs) {
    bucket = { startedAt: now, count: 0 };
    rates.set(event, bucket);
  }
  bucket.count++;
  if (bucket.count <= limit) return true;
  if (bucket.count === limit + 1) socket.emit('rateLimited', { event });
  return false;
}

function playerIdFor(socket) {
  const id = socketPlayerIds.get(socket.id);
  const p = id && match.players[id];
  return p && p.socketId === socket.id ? id : null;
}

function bindPlayerSocket(socket, playerId) {
  const p = match.players[playerId];
  if (!p) return false;
  const timer = disconnectTimers.get(playerId);
  if (timer) clearTimeout(timer);
  disconnectTimers.delete(playerId);
  p.connected = true;
  p.socketId = socket.id;
  socketPlayerIds.set(socket.id, playerId);
  socket.join(playerId);
  return true;
}

function forgetPlayerSession(p) {
  if (p && p.sessionToken) sessions.delete(p.sessionToken);
}

function scheduleDisconnectedRemoval(playerId) {
  const oldTimer = disconnectTimers.get(playerId);
  if (oldTimer) clearTimeout(oldTimer);
  disconnectTimers.set(playerId, setTimeout(() => removeDisconnectedPlayer(playerId), RECONNECT_GRACE_MS));
}

function removeDisconnectedPlayer(playerId) {
  const p = match.players[playerId];
  if (!p || p.connected) return;
  const wasPregame = lobby.pregameStateActive();
  forgetPlayerSession(p);
  delete match.players[playerId];
  disconnectTimers.delete(playerId);

  if (Object.keys(match.players).length === 0) {
    match.gameState = 'LOBBY';
    timers.clearPhaseTimer();
    match.actorId = null;
    view.broadcastPositions();
    return;
  }
  if (wasPregame) {
    lobby.resetPregameFlowToLobby();
    view.broadcastState();
    view.broadcastPositions();
    return;
  }
  if (match.gameState === 'ACTION' && match.actorId === playerId) action.removeFromOrder(playerId);
  else if (match.gameState === 'PLAYING') { draw.checkAllLocked(); view.broadcastState(); }
  else view.broadcastState();
  view.broadcastPositions();
}

// ห่อ handler ของ socket event ด้วย try/catch — payload ผิดรูปแบบ/บั๊กในโค้ดตัวละครจุดเดียว
//  ไม่ควรทำให้ process ทั้งตัว crash (ตัดผู้เล่นทุกคนออกจากเกมพร้อมกัน) แค่ event นั้นไม่ทำงานพอ
function safeOn(socket, event, handler) {
  socket.on(event, (...args) => {
    try {
      handler(...args);
    } catch (err) {
      console.error(`[socket:${event}] handler เกิดข้อผิดพลาด (ไม่กระทบผู้เล่นคนอื่น):`, err);
    }
  });
}

function onPlayerEvent(socket, event, handler, limit = 20, windowMs = 1000) {
  safeOn(socket, event, (payload) => {
    if (!consumeEventQuota(socket, event, limit, windowMs)) return;
    const playerId = playerIdFor(socket);
    if (!playerId) return;
    handler(playerId, payload);
  });
}

// ระเบียนผู้เล่นใหม่ (ค่าเริ่มต้นของทุกฟิลด์) — ใช้ตอน join
function newPlayerRecord({ playerId, sessionToken, socketId, name, color, pos, ch }) {
  return {
    id: playerId,
    sessionToken,
    socketId,
    connected: true,
    ready: false, // ห้องรอ: ต้องกดพร้อมก่อนเกมถึงจะเริ่มได้ (ครบทุกคน = เริ่มอัตโนมัติ)
    teamId: null, teamConfirmed: false, modeVote: null,
    name: (name || "ผู้เล่น").toString().slice(0, 12),
    customColor: lobby.normalizeColor(color),
    position: pos, characterId: ch.id, avatar: ch.avatar, img: ch.img,
    cards: [], locked: false, busted: false, result: null,
    hp: MAX_HP, armor: MAX_ARMOR, skillPoints: 0, alive: true, shield: 0,
    statuses: {}, statusAmt: {},
    seen: {}, transformAt: 0, cutsceneShown: {},
    skillUsedRound: false,
    gold: 0, inventory: [],
    tempHp: 0, tempHpTurns: 0,
    sleepFresh: false,
    muimiEmergencyUses: CHAR_HOOKS.muimi.EMERGENCY_USES, muimiEmergencyUsedRound: 0,
    muimiUltCasts: 0, muimiUltLock: 0,
    pos: null, // ตำแหน่งบนกระดาน { x, y } (แจกตอนเริ่มแมตช์ — phases/action.js placeOnBoard)
    dmgHp: 0, dmgArmor: 0, gainedSkill: 0,
    wasAttacked: false,
  };
}

io.on('connection', (socket) => {
  socket.emit("roster", publicRoster());
  socket.emit("positions", lobby.positionsFor(socket.id));
  socket.emit("takenChars", view.takenUniqueChars());

  safeOn(socket, 'reconnectSession', ({ sessionToken } = {}) => {
    if (!consumeEventQuota(socket, 'reconnectSession', 3, 10_000)) return;
    if (typeof sessionToken !== 'string' || sessionToken.length > 128) return;
    const playerId = sessions.get(sessionToken);
    const p = playerId && match.players[playerId];
    if (!p || p.sessionToken !== sessionToken) { socket.emit('sessionExpired'); return; }
    if (p.connected && p.socketId !== socket.id && io.sockets.sockets.has(p.socketId)) {
      socket.emit('sessionInUse');
      return;
    }
    if (!bindPlayerSocket(socket, playerId)) { socket.emit('sessionExpired'); return; }
    socket.emit('reconnected', { sessionToken });
    view.broadcastState();
    view.broadcastPositions();
  });

  safeOn(socket, "reserve", ({ position } = {}) => {
    if (!consumeEventQuota(socket, 'reserve', 8, 10_000) || playerIdFor(socket)) return;
    const pos = Number(position);
    if (!pos) { lobby.releaseReservation(socket.id); view.broadcastPositions(); return; }
    if (pos < 1 || pos > MAX_PLAYERS || lobby.positionUsedByOther(pos, socket.id)) return;
    lobby.reservePosition(socket.id, pos);
    view.broadcastPositions();
  });

  safeOn(socket, "join", ({ name, position, characterId, color } = {}) => {
    if (!consumeEventQuota(socket, 'join', 3, 10_000) || playerIdFor(socket)) return;
    if (Object.keys(match.players).length >= MAX_PLAYERS) { socket.emit("full"); return; }
    if (match.gameState !== "LOBBY") { socket.emit("inProgress"); return; }
    const pos = Number(position);
    if (!pos || pos < 1 || pos > MAX_PLAYERS || lobby.positionUsedByOther(pos, socket.id)) { socket.emit("positionTaken"); return; }
    lobby.releaseReservation(socket.id);
    let ch = CHAR_BY_ID[characterId];
    // ตัวละครที่ยังล็อกอยู่ / id ไม่รู้จัก — ตกไปใช้ตัวแรกที่เล่นได้
    if (!ch || ch.locked) ch = CHARACTERS.find((c) => !c.locked) || CHARACTERS[0];
    // ตัวละคร unique: เลือกได้แค่ 1 คนต่อเกม — ปฏิเสธการเข้าร่วมแทนการสลับตัวให้เงียบๆ
    //  (ฝั่ง client ปิดการ์ดไว้ตั้งแต่หน้าเลือกตัวละครผ่าน event "takenChars" — ด่านนี้กันเคสกดพร้อมกันเป๊ะ)
    if (ch.unique && Object.values(match.players).some((o) => o.characterId === ch.id)) {
      socket.emit("characterTaken", { characterId: ch.id, name: ch.name });
      return;
    }

    const playerId = crypto.randomUUID();
    const sessionToken = crypto.randomBytes(32).toString('base64url');
    match.players[playerId] = newPlayerRecord({ playerId, sessionToken, socketId: socket.id, name, color, pos, ch });
    sessions.set(sessionToken, playerId);
    bindPlayerSocket(socket, playerId);
    socket.emit('joined', { sessionToken });
    view.broadcastState();
    view.broadcastPositions();
  });

  // ปุ่มเล่นคนเดียว (ทดสอบ): คนเดียวในห้อง -> เข้าหน้าเลือกโหมดเหมือนเกมปกติ (หลายคนเริ่มได้ทางกดพร้อมครบเท่านั้น)
  onPlayerEvent(socket, 'startGame', (id) => lobby.startSoloTest(id), 2);
  onPlayerEvent(socket, 'selectGameMode', (id, { mode } = {}) => {
    if (match.gameState !== 'TEAM_MODE') return;
    lobby.voteGameMode(id, mode);
  }, 4);
  onPlayerEvent(socket, 'teamBackToMode', () => {
    if (match.gameState !== 'TEAM_SETUP') return;
    lobby.resetTeamAssignments(false);
    lobby.resetModeVotes();
    match.gameMode = 'pending';
    match.teamSize = 1;
    match.teamCount = 0;
    match.gameState = 'TEAM_MODE';
    view.broadcastState();
  }, 4);
  // หน้าเลือกโหมด -> ย้อนกลับห้องรอ (ทุกคนยกเลิกพร้อม)
  onPlayerEvent(socket, 'modeBackToLobby', () => lobby.modeSelectBackToLobby(), 4);
  onPlayerEvent(socket, 'chooseTeam', (id, { teamId } = {}) => lobby.chooseTeam(id, teamId), 8);
  onPlayerEvent(socket, 'confirmTeam', (id, { confirmed } = {}) => lobby.confirmTeam(id, confirmed), 8);
  // ห้องรอ: กดพร้อม/ยกเลิกพร้อม — ครบทุกคน (อย่างน้อย 2 คน) เริ่มเกมอัตโนมัติ
  onPlayerEvent(socket, 'toggleReady', (playerId) => {
    if (!lobby.pregameStateActive()) return;
    const p = match.players[playerId];
    if (!p) return;
    p.ready = !p.ready;
    view.broadcastState();
    lobby.checkLobbyReady();
  });
  // ห้องรอ / เลือกโหมด / จัดทีม: ปักอีโมตบนลูกโลก — ส่งต่อให้ทุกคนในห้อง (1 ครั้งต่อ 600 ms)
  onPlayerEvent(socket, 'lobbyEmote', (id, payload) => lobby.relayLobbyEmote(id, payload), 1, 600);

  onPlayerEvent(socket, 'hit', (id) => draw.hit(id), 8);
  onPlayerEvent(socket, 'lock', (id) => draw.lock(id), 4);
  onPlayerEvent(socket, 'useSkill', (id, { tier, targets, dir } = {}) => skills.useSkill(id, tier, targets, { dir }), 12);
  onPlayerEvent(socket, 'buyShopItem', (id, { itemId } = {}) => shop.buyShopItem(id, itemId), 8);
  onPlayerEvent(socket, 'useInventoryItem', (id, { uid, targetId, mode } = {}) => combat.withEffectSource(match.players[id], () => shop.useInventoryItem(id, uid, { targetId, mode })), 8);
  onPlayerEvent(socket, 'dropItem', (id, { uid } = {}) => shop.dropItem(id, uid), 8); // ทิ้งของ (ตาตัวเอง · ไม่นับเป็นการใช้)
  // เกราะ Mark 42: เจ้าของคุมชุดที่ส่งออกไปแล้ว (recall / remove / detonate)
  onPlayerEvent(socket, 'mark42Control', (id, { action } = {}) => combat.withEffectSource(match.players[id], () => characterRules.mark42Control(id, action)), 6);
  // กระดาน (GRID_PLAN.md): ตาเดินของตัวเอง — เดิน / ย้อน / โจมตี (ในระยะ) / รอ (จบตา)
  onPlayerEvent(socket, 'move', (id, { x, y, step } = {}) => action.moveTo(id, x, y, { step: step === true }), 12);
  onPlayerEvent(socket, 'undoMove', (id) => action.undoMove(id), 8);
  onPlayerEvent(socket, 'attack', (id, { targetId } = {}) => action.attackTarget(id, targetId), 6);
  onPlayerEvent(socket, 'endAction', (id) => action.waitAction(id), 4);
  // QTE กลาง — กดปุ่มทีละตัว · limit สูงกว่าปกติเผื่อกดรัวตอนตื่นเต้น
  onPlayerEvent(socket, 'qteKey', (id, { key } = {}) => qteSystem.qteKey(id, key), 40);
  onPlayerEvent(socket, 'qteTimeout', (id) => qteSystem.qteTimeout(id), 10);
  onPlayerEvent(socket, 'backToLobby', () => { if (match.gameState === 'GAMEOVER') lobby.backToLobby(); }, 2);

  safeOn(socket, "leave", () => {
    if (!consumeEventQuota(socket, 'leave', 2, 10_000)) return;
    if (!lobby.pregameStateActive()) return;
    const playerId = playerIdFor(socket);
    const p = playerId && match.players[playerId];
    if (!p) return;
    lobby.reservePosition(socket.id, p.position);
    forgetPlayerSession(p);
    delete match.players[playerId];
    socketPlayerIds.delete(socket.id);
    // มีคนออกก่อนเริ่มเกม -> ย้อนกลับห้องรอและรีเซ็ตความพร้อม/ทีมของคนที่เหลือ
    lobby.resetPregameFlowToLobby();
    view.broadcastState();
    view.broadcastPositions();
  });

  safeOn(socket, 'disconnect', () => {
    const playerId = socketPlayerIds.get(socket.id);
    socketPlayerIds.delete(socket.id);
    lobby.releaseReservation(socket.id);
    const p = playerId && match.players[playerId];
    if (p && p.socketId === socket.id) {
      p.connected = false;
      p.socketId = null;
      if (lobby.pregameStateActive()) lobby.resetPregameFlowToLobby();
      // During a match the player is parked indefinitely and may reclaim this
      // exact character/session whenever they return. Lobby slots still expire.
      if (lobby.pregameStateActive()) scheduleDisconnectedRemoval(playerId);
      view.broadcastState();
    }
    view.broadcastPositions();
  });
});

Object.assign(module.exports, { reservationTimers });
