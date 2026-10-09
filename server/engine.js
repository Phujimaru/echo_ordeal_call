// engine — context object ที่ส่งให้ characters/*.js เรียกกลับเข้ามาใช้ state/ฟังก์ชันร่วม
const engine = {};
module.exports = { engine };

const { CHAR_BY_ID, POSITION_COLORS } = require("../characters");
const CHAR_HOOKS = require("../characters/index");
const {
  SPELLBURDEN_MAX, statusAmtOf, applyBuff: rawApplyBuff, stripLatestBuff, setTurnsNoRefresh,
  resistActive, BASIC_DEBUFF_CLEAR, SOFT_DEBUFF_STEP, cleanseDebuffs, cleanseOneStep,
  cleanseLatestDebuff, applyPoison, poisonAtkPenalty, tickPoison, applyShock,
  tickShock, applyCurse, tickCurseOnSkill, MEND_MAX_TURNS, applyMend, tickMend, blindActive,
  noHealActive, invertActive, HBLEED_MAX, bleedActive, applyBleed, EVADE_TURNS,
  applyEvade, accurateActive,
} = require("../characters/_universal_status");
const { NETRAMANA_KILL_CHANCE, netramanaActive } = require("../characters/_universal_status");
const Journey = require("../characters/_journey");
const { io } = require("./app");
const {
  ATTACKFX_TIME, ACTION_TIME, GOLD_MAX, GUTS_AMMO, GUTS_CHAA_TURNS, GUTS_GUN_PRICE, GUTS_NURSE_DMG, MAX_HP,
  TRANSFORMS,
} = require("./constants");
const match = require("./match");
const action = require("./phases/action");
const attack = require("./phases/attack");
const characterRules = require("./characterRules");
const combat = require("./combat");
const cutscene = require("./cutscene");
const dayNight = require("./dayNight");
const cardDeck = require("./deck");
const draw = require("./phases/draw");
const endTurnPhase = require("./phases/endTurn");
const lobby = require("./lobby");
const qteSystem = require("./qte");
const shop = require("./shop");
const skills = require("./skills");
const timers = require("./timers");
const view = require("./view");

// ============================================================
//  engine — context object ที่ให้ characters/*.js เรียกกลับเข้ามาใช้ state/ฟังก์ชันร่วมของ server/
//  (สถานะแมตช์อยู่ใน match — ต้องผ่าน getter/setter เพราะส่งค่า primitive ตรงๆ ออกไปจะไม่ live-update)
// ============================================================
Object.defineProperties(engine, Object.getOwnPropertyDescriptors({
  fortuneTargetList: cardDeck.fortuneTargetList,
  players: match.players,
  CHAR_BY_ID,
  CHAR_HOOKS,
  POSITION_COLORS,
  ATTACKFX_TIME,
  ACTION_TIME,
  TRANSFORMS,
  SPELLBURDEN_MAX,
  MAX_HP,
  maxHpOf: combat.maxHpOf,
  maxArmorOf: combat.maxArmorOf,
  maxSkillOf: combat.maxSkillOf,
  addSkill: combat.addSkill,
  drawCardFor: cardDeck.drawCardFor,
  onCardDrawn: cardDeck.onCardDrawn,
  drawToScore: cardDeck.drawToScore,
  get centralDeck() { return match.centralDeck; },
  drawFromCentralDeck: cardDeck.drawFromCentralDeck, // ดึงการ์ดตามเงื่อนไข (predicate) ออกจากกองกลางจริง
  setCentralDeck(v) { match.centralDeck = v; },
  buildStateFor: view.buildStateFor, // เปิดให้เทสต์พิสูจน์ payload รายผู้ชมได้
  voidUltimateOnBust: combat.voidUltimateOnBust,
  hasQueuedCutscene() { return match.cutsceneQueue.length > 0; },
  startQte: qteSystem.startQte,           // ระบบ QTE กลาง (ดูหัวข้อ QTE ด้านบนของไฟล์)
  clearQte: qteSystem.clearQte,
  qteKey: qteSystem.qteKey,             // เปิดไว้ให้เทสต์กดปุ่มแทนผู้เล่นได้ (โค้ดจริงเรียกจาก socket handler)
  qtePending: qteSystem.qtePending,
  get gameState() { return match.gameState; },
  setGameState(v) { match.gameState = v; },
  get cutsceneInfo() { return match.cutsceneInfo; },
  get gameMode() { return match.gameMode; },
  setGameMode(v) { match.gameMode = v; },
  resetModeVotes: lobby.resetModeVotes,
  voteGameMode: lobby.voteGameMode,
  validGameMode: lobby.validGameMode,
  modeOptionsFor: lobby.modeOptionsFor,
  remainingTeamWinInfo: lobby.remainingTeamWinInfo,
  get winningTeamId() { return match.winningTeamId; },
  teamModeActive: lobby.teamModeActive,
  isAlly: lobby.isAlly, // ซัพพอร์ต: ตัดสินว่ามอบผลดี/เลือกเป็นเป้าหมายได้ไหม (ไม่ใช้ sameTeam — ดูคอมเมนต์ที่ตัวฟังก์ชัน)
  sameTeam: combat.sameTeam,
  friendlyEffectBlocked: combat.friendlyEffectBlocked,
  withEffectSource: combat.withEffectSource,
  // ต้นตอของเอฟเฟกต์ที่กำลังทำงานอยู่ (ตั้งโดย withEffectSource) — hook ที่ต้องรู้ว่า "ใครเป็นคนทำ"
  //  ในจังหวะที่ไม่มีพารามิเตอร์ผู้กระทำส่งมาให้ (เช่น adjustIncomingDamage) อ่านตรงนี้
  get effectSourceId() { return match.effectSourceId; },
  get roundNumber() { return match.roundNumber; },
  setRoundNumber(v) { match.roundNumber = v; },
  get cycleShift() { return match.cycleShift; },
  get journeyArea() { return match.journeyArea; },
  get journeyRoute() { return match.journeyRoute; },
  setJourneyArea(v) { match.journeyArea = v; }, // เทสต์ตั้งภูมิภาคเอง (เกมจริงสุ่มใน phases/endTurn.js)
  setCycleShift(v) { match.cycleShift = Number(v) || 0; }, // เทสต์ตั้งช่วงเวลาเองได้
  // ---------- กระดาน (GRID_PLAN.md) — เทสต์ขับตาเดินผ่านตรงนี้ ----------
  get board() { return match.board; },
  get turnOrder() { return match.turnOrder; },
  get actorId() { return match.actorId; },
  get action() { return match.action; },
  placeOnBoard: action.placeOnBoard,
  boardMap: action.boardMap,
  movOf: action.movOf,
  baseMovOf: action.baseMovOf,
  rangeOf: action.rangeOf,
  beginOrder: action.beginOrder,
  canAct: action.canAct,
  moveTo: action.moveTo,
  undoMove: action.undoMove,
  attackTarget: action.attackTarget,
  waitAction: action.waitAction,
  finishActor: action.finishActor,
  hasActed: action.hasActed,
  skillStrike: attack.skillStrike,
  // เทสต์: ให้ผู้เล่นคนนี้อยู่ในตาเดินของตัวเองทันที (ข้ามช่วงจั่วไพ่/ลำดับเดิน) — ไม่ตั้งตัวจับเวลา
  setActor(id) {
    const p = match.players[id];
    match.gameState = "ACTION";
    match.actorId = id;
    match.action = { from: p && p.pos ? { ...p.pos } : null, moved: false, locked: false, path: null };
  },
  get lastAttack() { return match.lastAttack; },
  setLastAttack(v) { match.lastAttack = v; },
  attackableTargets: attack.attackableTargets,
  pushCutsceneRaw(entry) { match.cutsceneQueue.push(entry); },
  log(msg) { match.lastLog.push(msg); },
  get lastLogLength() { return match.lastLog.length; },
  // เอฟเฟกต์บนกระดานที่ทุกคนเห็น (เช่น beamFx ลำแสง Beam Magnum) — client วาดเองตาม event
  boardFx(event, payload) { io.emit(event, payload); },
  // การ์ดสกิลเด้งบนกระดาน (ไม่หยุดเกม) — payload.sound = คีย์ใน client/src/audio.js ให้เล่นพร้อมการ์ด
  skillFlash(payload) { io.emit("skillFlash", payload); },
  // เสียงสั้นๆ ที่ทุกคนได้ยิน (ไม่มีป้าย) — onlyFor (ไม่บังคับ): array ของ playerId ที่ได้ยิน
  sfx(sound, onlyFor) {
    if (!sound) return;
    if (Array.isArray(onlyFor)) { for (const id of onlyFor) io.to(id).emit("sfx", { sound }); return; }
    io.emit("sfx", { sound });
  },
  // ผู้ลงมือของดาเมจก้อนนี้ติด "แม่นยำ" ไหม — ด่านหลบดาเมจจากสกิลของตัวละครใช้เช็ค
  sourceAccurate() { return !!match.effectSourceId && accurateActive(match.players[match.effectSourceId]); },
  accurateActive,
  journeyDotBonus() { return Journey.dotBonus(engine); },
  // อัตราคริเพิ่ม (%) ของผู้โจมตีจากสนาม (อาณาจักรน้ำแข็ง กลางวัน) — อ่านใน _universal_status.js
  critBonusFor(p) { return Journey.critBonus(engine); },
  journeyGiftItem: shop.journeyGiftItem,
  refreshShopForJourney: shop.refreshShopForJourney, // เทสต์: จำลองการขึ้นเทิร์นใหม่ของร้านค้า
  colorOf(p) { return lobby.colorOf(p); },
  nextTransformCounter() { return ++match.transformCounter; },
  startMatch: lobby.startMatch,
  endTurn: endTurnPhase.endTurn,
  doAttack: attack.doAttack,
  useSkill: skills.useSkill,
  alivePlayers: combat.alivePlayers,
  isNightRound: dayNight.isNightRound,
  GOLD_MAX,
  goldCapOf: shop.goldCapOf,
  addGold: shop.addGold,
  // ---------- ร้านค้ามายา (เปิดไว้ให้ tests/shop.test.js เรียกตรงๆ) ----------
  shopItemName: shop.shopItemName,
  grantInventoryItem: shop.grantInventoryItem,
  GUTS_AMMO,
  GUTS_GUN_PRICE,
  GUTS_CHAA_TURNS,
  GUTS_NURSE_DMG,
  rollShopItem: shop.rollShopItem,
  openShop: shop.openShop,
  buyShopItem: shop.buyShopItem,
  useInventoryItem: shop.useInventoryItem,
  gutsFireTargetOf: shop.gutsFireTargetOf,
  applyGutsBullet: shop.applyGutsBullet,
  hasGutsGun: shop.hasGutsGun,
  hasGutsWeapon: shop.hasGutsWeapon,
  hit: draw.hit,
  lock: draw.lock, // เปิดไพ่ (เทสต์ใช้ตรวจผลไพ่ครบชุดตอนเปิดไพ่)
  get shopItems() { return match.shopItems; },
  setShopItems(v) { match.shopItems = v; },
  get shopPos() { return match.shopPos; },
  setShopPos(v) { match.shopPos = v; },
  maybeMoveShop: shop.maybeMoveShop,
  shopTurnsLeft: shop.shopTurnsLeft,
  bagFull: shop.bagFull,
  dropItem: shop.dropItem,
  NETRAMANA_KILL_CHANCE,
  netramanaActive,
  statusAmtOf,
  calculateScore: cardDeck.calculateScore,
  scoreCap: cardDeck.scoreCap,
  applyBuff: rawApplyBuff,
  applyDebuff: combat.applyDebuff,
  applyPoison,     // "พิษร้าย" (สถานะ Universal): ดาเมจ 1/เทิร์น + พลังโจมตี -1 (เคารพต้านสถานะผิดปกติ)
  tickPoison,
  stripLatestBuff, // ปาดบัฟล่าสุดของเป้าหมายทิ้ง 1 ตัว — ทะเบียนบัฟอยู่ที่ _universal_status.js
  applyShock,      // "ช็อต" (สถานะ Universal): จุดเดียวที่ทุกตัวละครใช้ใส่สถานะนี้ (เคารพต้านสถานะผิดปกติ)
  tickShock,       // โรลต้นเทิร์น 15% -> สตั้น (เช็ค resist ตอนโรล ไม่ใช่ตอนแปะ)
  poisonAtkPenalty, // พลังโจมตีที่หายไปจากพิษ — computeAttackBase อ่านคู่กับ "อ่อนแอ"
  applyCurse,      // "คำสาป" (สถานะ Universal): จุดเดียวที่ทุกตัวละครใช้ใส่สถานะนี้ (เคารพต้านสถานะผิดปกติ)
  tickCurseOnSkill,
  MEND_MAX_TURNS,
  applyMend, // "เยียวยา" (สถานะ Universal): จุดเดียวที่ทุกตัวละครใช้ใส่สถานะนี้ (เคารพเพดานเทิร์น)
  tickMend,
  blindActive,
  // พลังโจมตีปกติที่ attacker จะฟาดใส่ target ได้ (ท่อเดียวกับ doAttack)
  attackPowerAgainst: attack.estimateAttackOn,
  setTurnsNoRefresh,
  applySpellburden: combat.applySpellburden,
  cleanseDebuffs,
  cleanseOneStep,
  cleanseLatestDebuff,
  BASIC_DEBUFF_CLEAR,
  SOFT_DEBUFF_STEP,
  noHealActive,
  invertActive,
  HBLEED_MAX,
  bleedActive,
  applyBleed, // "เลือดไหล" (สถานะ Universal): จุดเดียวที่ทุกตัวละครใช้ใส่สถานะนี้ (เคารพต้านสถานะ + เพดาน)
  EVADE_TURNS,
  applyEvade, // "หลบหลีก" (สถานะ Universal): 1 เทิร์นเสมอ · ไม่ซ้อน (ได้ซ้ำ = รีเฟรช · % ใช้ค่ามากสุด)
  healHp: combat.healHp,
  healArmor: combat.healArmor,
  healOverflow: combat.healOverflow,
  loseHp: combat.loseHp,
  loseArmor: combat.loseArmor,
  dealDirect: combat.dealDirect,
  dealMixed: combat.dealMixed,
  dealArmorOnly: combat.dealArmorOnly,
  damageSoft: combat.damageSoft,
  instantDeath: combat.instantDeath,
  displayImg: view.displayImg,
  resistActive,
  resolveDamageAftermath: combat.resolveDamageAftermath,
  bustedOf: cardDeck.bustedOf,
  scoreOf: cardDeck.scoreOf,
  hasKillCapability: characterRules.hasKillCapability,
  queueCutscene: cutscene.queueCutscene,
  triggerCutscene: cutscene.triggerCutscene,
  notifyTransform: cutscene.notifyTransform,
  // ให้ผลของสกิลเกิดหลังคลิปที่คิวไว้จบ (ไม่มีคลิป = เกิดทันทีหลัง hook) — ใช้ได้เฉพาะใน applyInstantSkill
  deferAfterCutscene(fn) { match.afterCutscene.push(fn); },
  runCutsceneQueue: cutscene.runCutsceneQueue,
  pausePlayingForCutscene: cutscene.pausePlayingForCutscene,
  startPhaseTimer: timers.startPhaseTimer,
  clearPhaseTimer: timers.clearPhaseTimer,
  get timeLeft() { return match.timeLeft; },
  setTimeLeft(v) { match.timeLeft = Math.max(1, Number(v) || 1); },
  broadcastState: view.broadcastState,
  checkAllLocked: draw.checkAllLocked,
}));
