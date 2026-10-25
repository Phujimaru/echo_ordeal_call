// ห้องรอ: สี/ตำแหน่ง, โหวตโหมด, จัดทีม, เริ่มแมตช์, กลับห้องรอ
// export ก่อน require: ไฟล์ใน server/ require วนกันเอง — function declaration ถูก hoist จึงพร้อมใช้ตั้งแต่บรรทัดแรก
Object.assign(module.exports, {
  normalizeColor, colorOf, teamModeActive, isAlly, pregameStateActive, resetTeamAssignments,
  resetModeVotes, resetPregameFlowToLobby, validGameMode, modeOptionsFor, currentTeamOptions, normWorld,
  modeVoteSummary, voteGameMode, chooseTeam, confirmTeam, remainingTeamWinInfo, releaseReservation,
  reservePosition, positionsFor, positionUsedByOther, checkLobbyReady, startSoloTest, startMatch, backToLobby,
  relayLobbyEmote, modeSelectBackToLobby,
});

const { POSITION_COLORS } = require("../characters");
const Journey = require("../characters/_journey");
const CHAR_HOOKS = require("../characters/index");
const {
  JOURNEY_START_SECONDS, RESERVATION_TTL_MS, TEAM_IDS,
} = require("./constants");
const { io } = require("./app");
const match = require("./match");
const { engine } = require("./engine");
const action = require("./phases/action");
const combat = require("./combat");
const cutscene = require("./cutscene");
const draw = require("./phases/draw");
const shop = require("./shop");
const socketLayer = require("./socket");
const timers = require("./timers");
const view = require("./view");
const Zero = require("./zeroTime");
const Duo = require("./duo");
const Colony = require("./colony");
const Moon = require("./moonCell");
const Board = require("./board");

// สีประจำตัว: ผู้เล่นปรับเองได้ตอนตั้งค่าก่อนเข้าเกม — ไม่ได้ตั้งไว้ก็ใช้สีประจำตำแหน่งเดิม
const CUSTOM_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
function normalizeColor(c) {
  return typeof c === "string" && CUSTOM_COLOR_RE.test(c) ? c.toUpperCase() : null;
}
function colorOf(p) {
  if (!p) return "#9B4F96";
  return p.customColor || POSITION_COLORS[p.position] || "#9B4F96";
}
// Moon Cell (GRID_PLAN §8.4): ผู้เล่นทุกคนเป็นทีมเดียวกัน (ทีม A) สู้บอส — ใช้กติกาทีมเดิม (ตีกันไม่ได้ · ผลดีถึงเพื่อน)
function teamModeActive() {
  return match.gameMode === "duo" || match.gameMode === "trio" || match.gameMode === "moon";
}
// "เป็นพวกเดียวกัน" สำหรับการมอบผลดี (ซัพพอร์ต) — duo/trio: ทีมเดียวกัน
function isAlly(a, b) {
  if (!a || !b || a.id === b.id) return false;
  if (Duo.sideKey(a) === Duo.sideKey(b)) return true; // ระบบคู่: สองตัวของผู้เล่นคนเดียวกัน
  return !!(teamModeActive() && a.teamId && b.teamId && a.teamId === b.teamId);
}
function pregameStateActive() {
  return match.gameState === "LOBBY" || match.gameState === "TEAM_MODE" || match.gameState === "TEAM_SETUP";
}
function resetTeamAssignments(resetMode = false) {
  for (const p of Object.values(match.players)) {
    p.teamId = null;
    p.teamConfirmed = false;
  }
  if (resetMode) {
    match.gameMode = "ffa";
    match.world = "earth";
    match.teamSize = 1;
    match.teamCount = 0;
    match.winningTeamId = null;
  }
}
function resetModeVotes() {
  match.modeVotes = {};
  for (const p of Object.values(match.players)) { p.modeVote = null; p.modeWorld = null; }
}
function resetPregameFlowToLobby() {
  match.gameState = "LOBBY";
  resetTeamAssignments(true);
  resetModeVotes();
  for (const p of Object.values(match.players)) p.ready = false;
}
function validGameMode(mode, count = Object.keys(match.players).length) {
  if (mode === "ffa") return count >= 1; // 1 คน = เล่นทดสอบคนเดียว (ปุ่ม "เล่นคนเดียว" ในห้องรอ)
  if (mode === "duo") return count >= 4 && count % 2 === 0;
  if (mode === "trio") return count === 6;
  if (mode === "moon") return count >= 1; // Moon Cell: ผู้เล่นทุกคนร่วมทีมเดียว (1 คนก็ได้)
  return false;
}
// โหมดที่ "พักใช้งาน" — โค้ดยังอยู่ครบ แต่ไม่โผล่ในหน้าโหวตโหมด และโหวตเข้าไม่ได้
const SUSPENDED_MODES = new Set(); // โหมดที่พักใช้งานชั่วคราว (ตอนนี้ไม่มี)
// group: "normal" = สงครามทั่วไป · "special" = สงครามพิเศษ (หน้าโหวตแยกเป็น 2 ชั้น)
//  โหมดที่พักใช้งานยังโผล่ในหมวดของมัน แต่เป็นปุ่มสีเทาพร้อมป้าย "พักใช้งาน" (suspended) และโหวตไม่ได้
//  สนามดวงจันทร์ (world "moon") มีโหมดเดียว "moon" (Raid Boss — GRID_PLAN §8.4) · โลก/โคโลนีมี ffa / duo / trio
function modeOptionsFor(count = Object.keys(match.players).length, world = "earth") {
  const list = world === "moon"
    ? [{ mode: "moon", label: "Moon Cell", size: count, group: "special" }]
    : [
      { mode: "ffa", label: "Free For All", size: 1, group: "normal" },
      { mode: "duo", label: "Duo", size: 2, group: "normal" },
      { mode: "trio", label: "Trio", size: 3, group: "normal" },
    ];
  return list.map((opt) => {
    const suspended = SUSPENDED_MODES.has(opt.mode);
    return { ...opt, suspended, enabled: !suspended && validGameMode(opt.mode, count) };
  });
}
// สนามที่โหวตได้: โลก (การเดินทาง) / โคโลนี — ทั้งสองมีโหมด ffa / duo / trio ชุดเดียวกัน · ดวงจันทร์ = โหมด moon อย่างเดียว
const WORLDS = ["earth", "colony", "moon"];
// โหมดนี้เล่นในสนามนี้ได้ไหม (moon คู่กับสนามดวงจันทร์เท่านั้น)
function worldHasMode(world, mode) { return (world === "moon") === (mode === "moon"); }
function normWorld(w) { return WORLDS.includes(w) ? w : "earth"; }
const voteKey = (world, mode) => `${world}:${mode}`;
function currentTeamOptions() {
  return TEAM_IDS.slice(0, match.teamCount).map((id) => ({ id, label: `Team ${id}`, size: match.teamSize }));
}
function modeVoteSummary() {
  const list = Object.values(match.players);
  return WORLDS.flatMap((world) => modeOptionsFor(list.length, world).map((opt) => {
    const voters = list.filter((p) => match.modeVotes[p.id] === voteKey(world, opt.mode)).map((p) => p.id);
    return { ...opt, world, voters, voteCount: voters.length };
  }));
}
function voteGameMode(playerId, mode, world = "earth") {
  if (match.gameState !== "TEAM_MODE") return;
  const p = match.players[playerId];
  if (!p || SUSPENDED_MODES.has(mode) || !validGameMode(mode)) return;
  const w = normWorld(world);
  if (!worldHasMode(w, mode)) return;
  match.modeVotes[playerId] = voteKey(w, mode);
  p.modeVote = mode;
  p.modeWorld = w;
  const list = Object.values(match.players);
  const votes = list.map((o) => match.modeVotes[o.id]).filter(Boolean);
  if (votes.length === list.length) {
    const counts = votes.reduce((acc, v) => ({ ...acc, [v]: (acc[v] || 0) + 1 }), {});
    const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (ranked[0] && (!ranked[1] || ranked[0][1] > ranked[1][1])) {
      const [w, m] = ranked[0][0].split(":");
      startTeamSetup(m, w);
      return;
    }
  }
  view.broadcastState();
}
function enterModeSelect() {
  if (match.gameState !== "LOBBY") return;
  const list = Object.values(match.players);
  // เล่นคนเดียวก็เข้าหน้าเลือกโหมดได้ (อิสระแบบทดสอบ — โหมดทีมจะเป็นปุ่มสีเทาเอง)
  if (list.length < 1 || !list.every((p) => p.ready)) return;
  resetTeamAssignments(false);
  resetModeVotes();
  match.gameMode = "pending";
  match.world = "earth";
  match.teamSize = 1;
  match.teamCount = 0;
  match.winningTeamId = null;
  match.gameState = "TEAM_MODE";
  view.broadcastState();
}
function startTeamSetup(mode, world = "earth") {
  const count = Object.keys(match.players).length;
  if (!validGameMode(mode, count)) return;
  resetModeVotes();
  match.world = normWorld(world);
  if (!worldHasMode(match.world, mode)) { match.world = "earth"; return; }
  if (mode === "moon") {
    // Moon Cell: ทุกคนทีม A ยืนยันแล้ว → เข้าแมตช์ทันที (ไม่มีหน้าเลือกทีม)
    match.gameMode = mode;
    match.teamSize = count;
    match.teamCount = 1;
    for (const p of Object.values(match.players)) { p.teamId = TEAM_IDS[0]; p.teamConfirmed = true; }
    startMatch();
    return;
  }
  if (mode === "ffa") {
    match.gameMode = mode;
    match.teamSize = 1;
    match.teamCount = 0;
    resetTeamAssignments(false);
    startMatch();
    return;
  }
  match.gameMode = mode;
  match.teamSize = mode === "duo" ? 2 : 3;
  match.teamCount = Math.floor(count / match.teamSize);
  resetTeamAssignments(false);
  match.gameState = "TEAM_SETUP";
  view.broadcastState();
}
function chooseTeam(playerId, teamId) {
  if (match.gameState !== "TEAM_SETUP") return;
  const p = match.players[playerId];
  if (!p || p.teamConfirmed) return;
  const id = String(teamId || "").toUpperCase();
  if (!currentTeamOptions().some((t) => t.id === id)) return;
  const members = Object.values(match.players).filter((o) => o.teamId === id && o.id !== p.id);
  if (members.length + 1 > match.teamSize && p.teamId !== id) return;
  p.teamId = id;
  p.teamConfirmed = false;
  view.broadcastState();
}
function confirmTeam(playerId, confirmed) {
  if (match.gameState !== "TEAM_SETUP") return;
  const p = match.players[playerId];
  if (!p || !p.teamId) return;
  p.teamConfirmed = !!confirmed;
  view.broadcastState();
  maybeStartTeamMatch();
}
function maybeStartTeamMatch() {
  if (match.gameState !== "TEAM_SETUP" || !teamModeActive()) return;
  const list = Object.values(match.players);
  if (!validGameMode(match.gameMode, list.length)) return;
  const fullTeams = currentTeamOptions().every((t) => list.filter((p) => p.teamId === t.id).length === match.teamSize);
  if (fullTeams && list.every((p) => p.teamId && p.teamConfirmed)) startMatch();
}
function aliveTeamIds(list = combat.alivePlayers()) { // Moon Cell ตัดสินแพ้ชนะเอง (Moon.outcome — phases/endTurn.js gameOver)
  return [...new Set(list.filter((p) => !p.summon).map((p) => p.teamId).filter(Boolean))]; // ยูนิตที่ถูกเรียกไม่นับ
}
function remainingTeamWinInfo(stillAlive = combat.alivePlayers(), total = Duo.sideCount(Object.values(match.players))) {
  if (!teamModeActive() || total < 2) return { over: false, teamId: null };
  const aliveTeams = aliveTeamIds(stillAlive);
  return aliveTeams.length <= 1 ? { over: true, teamId: aliveTeams[0] || null } : { over: false, teamId: null };
}

function releaseReservation(socketId) {
  delete match.reservations[socketId];
  const timer = socketLayer.reservationTimers.get(socketId);
  if (timer) clearTimeout(timer);
  socketLayer.reservationTimers.delete(socketId);
}
function reservePosition(socketId, position) {
  releaseReservation(socketId);
  match.reservations[socketId] = position;
  socketLayer.reservationTimers.set(socketId, setTimeout(() => {
    releaseReservation(socketId);
    view.broadcastPositions();
  }, RESERVATION_TTL_MS));
}
function joinedPositions() { return Object.values(match.players).map((p) => p.position); }
function positionsFor(sid) {
  const joined = joinedPositions();
  const reserved = Object.entries(match.reservations).filter(([id]) => id !== sid).map(([, p]) => p);
  return [...new Set([...joined, ...reserved])];
}
function positionUsedByOther(pos, sid) {
  return joinedPositions().includes(pos) ||
    Object.entries(match.reservations).some(([id, p]) => id !== sid && p === pos);
}

// ============================================================
//  วงจรรอบ
// ============================================================
// ห้องรอ: ทุกคนกดพร้อมครบ -> เข้าหน้าเลือกรูปแบบสนาม (1 คนก็ได้ — โหมดที่คนไม่พอจะเป็นปุ่มสีเทา) ไม่ต้องกดปุ่มเริ่มเกมเอง
function checkLobbyReady() {
  if (match.gameState !== "LOBBY") return;
  const list = Object.values(match.players);
  if (list.length >= 1 && list.every((p) => p.ready)) enterModeSelect(); // เล่นคนเดียวได้ (อิสระแบบทดสอบ)
}
// ปุ่ม "เล่นคนเดียว (ทดสอบ)" (socket startGame) — ผ่านหน้าเลือกโหมดเหมือนเกมปกติ ไม่กระโดดเข้าแมตช์ทันที
function startSoloTest(playerId) {
  if (match.gameState !== "LOBBY") return false;
  const p = match.players[playerId];
  if (!p || Object.keys(match.players).length !== 1) return false;
  p.ready = true;
  enterModeSelect();
  return match.gameState === "TEAM_MODE";
}
// หน้าเลือกโหมด -> ย้อนกลับห้องรอ (ปุ่มย้อนกลับ ถอยทีละขั้น) — ทุกคนกลับมาเป็น "ยังไม่พร้อม" (ไม่งั้นครบพร้อมแล้วเด้งกลับทันที)
//  ล้างโหวตโหมด/ทีมด้วย · ใช้ได้เฉพาะตอนอยู่หน้าเลือกโหมด
function modeSelectBackToLobby() {
  if (match.gameState !== "TEAM_MODE") return false;
  resetPregameFlowToLobby();
  view.broadcastState();
  return true;
}
// ฉากเปิดตัวผู้เล่น (ช่วงแรกของ MatchIntro ฝั่ง client) กินเวลาเท่านี้ — สูตรเดียวกันกับ client/src/oc/intro/MatchIntro.jsx
//  วีดีโอเปิดตัวของตัวละครต้องรอให้มันจบก่อน ไม่งั้นคลิปจะเล่นอยู่ใต้ม่านแล้วโดนตัดกลางคัน
//  (เวลาของคิวเดินอยู่ใต้ม่าน พอม่านเปิดก็เหลือแต่ท้ายคลิป)
function gameIntroHoldSeconds() {
  const n = Math.max(1, Object.keys(match.players).length);
  const perMs = Math.max(620, Math.min(1000, Math.round(4200 / n)));
  return Math.ceil((n * perMs + 2900 + 1000) / 1000) + 1; // +1 เผื่อม่านปิด-เปิด
}

// เทิร์นเริ่มแมตช์สำหรับ dev (env ECHO_DEV_START_ROUND) — ไม่ตั้ง/ค่าผิด = 1
function devStartRound() {
  const n = Math.floor(Number(process.env.ECHO_DEV_START_ROUND));
  return Number.isFinite(n) && n > 1 ? n : 1;
}
function devStartArea() {
  const n = Math.floor(Number(process.env.ECHO_DEV_START_AREA));
  return Number.isFinite(n) && n >= 1 && n <= Journey.AREA_COUNT ? n : 0;
}

function startMatch() {
  if (!teamModeActive()) {
    resetTeamAssignments(false);
    match.teamSize = 1;
    match.teamCount = 0;
  }
  match.winningTeamId = null;
  Duo.setup(); // ระบบคู่ (เคท & เอมิลิโกะ): สร้างตัวที่สองของผู้เล่นที่เลือกตัวละครแบบคู่
  for (const p of Object.values(match.players)) combat.resetCombat(p);
  // เครื่องมือ dev: ECHO_DEV_RICH=1 = เริ่มแมตช์ด้วยเหรียญเต็มเพดาน + แต้มสกิลเต็ม (ทดสอบร้าน/ท่าไม้ตายได้ทันที) · ไม่ตั้ง = ปกติ
  if (process.env.ECHO_DEV_RICH === "1") {
    for (const p of Object.values(match.players)) { p.gold = shop.goldCapOf(p); p.skillPoints = combat.maxSkillOf(p); }
  }
  // เครื่องมือ dev: ECHO_DEV_START_ROUND=13 = เริ่มแมตช์ที่เทิร์นนั้น · ECHO_DEV_START_AREA=3 = เริ่มที่ภูมิภาคนั้น
  //  (ทดสอบภูมิภาค II–VII โดยไม่ต้องเล่นยาว · ตั้งแค่เทิร์นเกิน 6 = สุ่มภูมิภาคเหมือนเกมจริง) · ไม่ตั้ง env = เริ่มเทิร์น 1 ภูมิภาค I ตามปกติ
  const startRound = devStartRound();
  match.roundNumber = startRound - 1;
  match.cycleShift = 0;
  match.legStart = 1;
  match.journeyScene = null;
  Zero.reset(); // ห่วงเวลาซีโร่: ยังไม่เกิด (ครั้งเดียวต่อเกม)
  const startArea = devStartArea() || (startRound > Journey.AREA_TURNS ? Journey.pickNextArea(1) : 1);
  match.journeyArea = startArea;
  match.journeyRoute = startArea === 1 ? [1] : [1, startArea];
  match.colony = null;
  match.moon = null;
  if (Colony.inWorld()) Colony.start(); // สนาม Colony: กระดานโคโลนี 16×40 ต่อวงรอบ (GRID_PLAN §8.3)
  else if (Moon.inWorld()) Moon.start(); // Moon Cell: กระดานดวงจันทร์ 20×20 + ฮาคุโนะ 2 ตัว + Moon Cell (GRID_PLAN §8.4)
  else action.placeOnBoard(startArea); // กระดานภูมิภาคแรก (ปกติ I) · แจกจุดเกิด (GRID_PLAN §3)
  CHAR_HOOKS.sliver_bullet.refresh(engine); // นักบินปริศนา: เริ่มเกมล่องหนทันที (ถ้าเข้าเงื่อนไข)
  match.shopItems = []; // ล้างสต็อกร้านค้าเก่าค้างจากแมตช์ก่อน (placeOnBoard ยกร้านออก — ตั้งใหม่ตอนเทิร์นแรก)
  match.cutsceneQueue = [];
  match.skillBeats = [];
  match.dash = null;
  match.extraTurns = []; match.timeFreeze = null; match.tsSnap = null; // หยุดเวลา (server/timeStop.js)
  // การเดินทาง: ฉากแผนที่ "การเดินทางเริ่มต้นขึ้น" ต่อท้ายฉากเปิดตัวผู้เล่น — พักรวมทั้งสองฉาก
  //  (client นับเวลาฉากแผนที่จาก timeLeft ของเฟสนี้ จึงจบพร้อมกันทุกเครื่องแม้ฉากเปิดตัวของแต่ละคนจะช้าเร็วต่างกัน)
  // Colony ใช้ช่วงพักเดียวกัน (ฉากพุ่งเข้าโคโลนีแทนดิ่งลงโลก) · Moon Cell = ฉากบินอ้อมโลกไปดวงจันทร์ (client oc/intro/moonFlight.js)
  const journeyStart = (Journey.active(engine) || Colony.inWorld() || Moon.inWorld()) && JOURNEY_START_SECONDS > 0;
  if (journeyStart) match.journeyScene = { seq: ++match.journeySceneSeq, active: true, mode: "start", area: startArea, fromArea: null };
  if (journeyStart) {
    // พักคิวไว้ก่อนจนกว่าฉากเปิดตัวผู้เล่นจะจบ — อยู่ในเฟส CUTSCENE แต่ยังไม่มีคลิป
    //  (cutsceneInfo = null -> client วาดกระดานปกติไว้ใต้ฉากเปิดแมตช์ (MatchIntro) ซึ่งบังอยู่แล้ว)
    match.cutsceneInfo = null;
    match.gameState = "CUTSCENE";
    timers.startPhaseTimer(gameIntroHoldSeconds() + (journeyStart ? JOURNEY_START_SECONDS : 0), () => {
      if (match.journeyScene) match.journeyScene.active = false;
      cutscene.runCutsceneQueue(draw.dealRound);
    });
    view.broadcastState();
  }
  else draw.dealRound();
}

// ห้องรอ: อีโมตปักบนลูกโลก — ไม่เก็บสถานะ แค่ส่งต่อให้ทุกคนในห้อง (สี = สีประจำตัวคนส่ง)
//  ต้องตรงกับรายการใน client/src/oc/lobby/emotes.js
const LOBBY_EMOTES = ["👋", "😂", "😮", "😡", "❤️", "🔥", "👍", "😭"];
function relayLobbyEmote(playerId, payload) {
  if (!pregameStateActive()) return false;
  const p = match.players[playerId];
  if (!p || !payload || typeof payload !== "object") return false;
  const { emoji, dir } = payload;
  if (typeof emoji !== "string" || !LOBBY_EMOTES.includes(emoji)) return false;
  if (!Array.isArray(dir) || dir.length !== 3 || !dir.every((n) => typeof n === "number" && Number.isFinite(n))) return false;
  const len = Math.hypot(dir[0], dir[1], dir[2]);
  if (!Number.isFinite(len) || len < 1e-6) return false;
  const unit = dir.map((n) => Math.round((n / len) * 1e4) / 1e4);
  io.to(Object.keys(match.players)).emit("lobbyEmote", { emoji, dir: unit, color: colorOf(p), playerId: p.id });
  return true;
}

function backToLobby() {
  match.gameState = "LOBBY";
  resetTeamAssignments(true);
  timers.clearPhaseTimer();
  match.timeLeft = 0;
  match.board = null;
  match.turnOrder = [];
  match.actorIndex = -1;
  match.actorId = null;
  match.action = null;
  match.roundNumber = 0;
  match.cycleShift = 0;
  match.legStart = 1;
  match.journeyScene = null;
  match.journeyArea = 1;
  match.journeyRoute = [1];
  match.colony = null;
  match.moon = null;
  Board.setWrap(0);
  Zero.reset();
  match.lastLog = [];
  match.cutsceneQueue = [];
  match.cutsceneInfo = null;
  Duo.teardown(); // ระบบคู่: ตัวที่สองหายไปจนกว่าจะเริ่มแมตช์ใหม่
  for (const p of Object.values(match.players)) {
    p.cards = []; p.locked = false; p.busted = false; p.result = null; p.pos = null;
    combat.resetRoundDisplay(p);
    combat.resetCombat(p);
    if (!p.connected) socketLayer.scheduleDisconnectedRemoval(p.id);
  }
  view.broadcastState();
}
Object.assign(module.exports, { LOBBY_EMOTES });
