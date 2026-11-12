// เฟิร์น — บัฟเฉพาะสนาม Eos (GRID_PLAN §7.14 "บัฟเฉพาะ Eos" · characters/fern.js)
//  เกราะ 3 · เดินฐาน 4 (+2 = 6) · Zoltraak ลำแสงแนวตรง 4 ช่อง (ทะลุสิ่งกีดขวาง) · กัน 2 ครั้ง + คูลดาวน์ 3 ·
//  ร่ายต่อเนื่อง ตีเพิ่ม 2 + ดาเมจ +1 · เพิ่มระยะ 8 (2 Energy · คอมโบค้างทั้งตาเดิน) · ซ่อนเร้นมานา +6 / +2 ต่อเทิร์น / ฮีล 1 ทุกเทิร์น / มอนไม่เห็น
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const match = require('../../server/match.js');
const Board = require('../../server/board.js');
const Fodlan = require('../../server/fodlan.js');
const action = require('../../server/phases/action.js');
const combat = require('../../server/combat.js');
const timers = require('../../server/timers.js');
const S6 = require('../../server/fodlan/stage6.js');
const fern = require('../../characters/fern.js');
const { CHAR_BY_ID } = require('../../characters.js');

const realRandom = Math.random;
const saved = { boardFx: engine.boardFx, boardFxTo: engine.boardFxTo, sfx: engine.sfx, skillFlash: engine.skillFlash, triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, notifyTransform: engine.notifyTransform };
const vit = (p) => (p.hp || 0) + (p.armor || 0);
const K = Board.key;

function setup() {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  ['fern', 'dummy'].forEach((ch, i) => {
    engine.players['p' + i] = {
      id: 'p' + i, name: 'P' + i, position: i + 1, characterId: ch, alive: true, connected: true,
      cards: [], statuses: {}, statusAmt: {}, seen: {}, inventory: [], teamId: 'A', teamConfirmed: true,
    };
  });
  engine.setGameMode('eos');
  match.world = 'eos';
  engine.startMatch();
  engine.clearPhaseTimer();
  match.gameState = 'PLAYING'; match.actorId = null; match.action = null; match.forcedWinnerId = null;
  for (const [id, u] of Object.entries(match.players)) if (u.summon) delete match.players[id]; // มอนที่ด่านเกิดเอง — เทสต์วางเอง
  const F = match.players.p0, A = match.players.p1;
  F.statuses = {}; F.statusAmt = {}; F.skillUsedRound = false; F.nightTaxTier = null;
  match.roundNumber = 10;
  return { F, A };
}
const st = () => match.fodlan.s.eos;
const ctx = () => Fodlan.makeCtx();
// พื้นโล่ง (เคลียร์ผังแถบบนของแผนที่ Eos ในโปรเซสเทสต์นี้) → ช่องกลางซ้ายของสี่เหลี่ยมว่าง len × 5
function strip(len) {
  for (const u of Object.values(match.players)) u.pos = null; // เทสต์วางตัวเองทีหลัง
  const base = Board.MAPS[match.board.area];
  for (let y = 2; y <= 14; y++) for (let x = 0; x < base.cols; x++) { delete base.terrain[K(x, y)]; delete base.special[K(x, y)]; }
  match.board.iceVer = (match.board.iceVer || 0) + 1;
  if (st()) st().ver = (st().ver || 0) + 1;
  const map = action.boardMap();
  const PLAIN = new Set([undefined, 'fd_eos_road', 'fd_eos_plaza', 'fd_eos_sand']);
  const clear = (x, y) => Board.inBounds(map, x, y) && !map.terrain[K(x, y)] && PLAIN.has(map.special[K(x, y)]) && action.tileFree(x, y, null)
    && !require('../../server/shop.js').shopAt(x, y);
  for (let y = 3; y < map.rows - 3; y++) for (let x = 1; x + len < map.cols - 1; x++) {
    let ok = true;
    for (let dy = -2; dy <= 2 && ok; dy++) for (let i = 0; i < len && ok; i++) ok = clear(x + i, y + dy);
    if (ok) return { x, y };
  }
  throw new Error('ไม่มีพื้นโล่ง');
}
// ทหารเหล็ก (magitek) — ไม่ติดไฟเมือง/ไฟแคมป์ที่กันปีศาจ
const mob = (x, y, o = {}) => {
  const r = S6.spawnMob(ctx(), st(), 'magitek', { x, y }, { hp: 20, armor: 0, atk: 1, mov: 3, gold: 0, ...o }, { look: 1, tier: 1 });
  r.summon.born = 0;
  return r;
};
// ตีปกติแล้วจบฉากตีทันที
function strikeNow(id, targetId) {
  const orig = timers.startPhaseTimer;
  let fire = null;
  timers.startPhaseTimer = (s, fn) => { fire = fn; };
  try {
    const ok = engine.attackTarget(id, targetId);
    if (ok && fire) { const f = fire; fire = null; f(); }
    return ok;
  } finally { timers.startPhaseTimer = orig; engine.clearPhaseTimer(); }
}
const hitBy = (src, target, n = 1) => engine.withEffectSource(src, () => engine.dealMixed(target, n));
const newCommand = () => { match.commandSeq++; };
const view = (viewerId, id) => engine.buildStateFor(viewerId).players.find((p) => p.id === id);

test.before(() => {
  engine.boardFx = () => {}; engine.boardFxTo = () => {}; engine.sfx = () => {}; engine.skillFlash = () => {};
  engine.triggerCutscene = () => {}; engine.queueCutscene = () => {}; engine.notifyTransform = () => {};
});
test.beforeEach(() => { Math.random = () => 0.99; });
test.afterEach(() => { Math.random = realRandom; engine.clearPhaseTimer(); });
test.after(() => {
  Object.assign(engine, saved);
  match.world = 'earth'; match.fodlan = null; match.forcedWinnerId = null; match.eosDiff = undefined; engine.setGameMode('ffa');
  for (const id of Object.keys(engine.players)) delete engine.players[id];
});

test('ค่าสถานะ Eos: พลังชีวิต 5 · เกราะ 3 · เดินฐาน 4 +2 = 6 · Energy 10 ไม่ฟื้นเอง · เพิ่มระยะ 2 Energy · Echo สวมร่างได้ค่าสถานะของเฟิร์น', () => {
  const { F } = setup();
  assert.equal(combat.maxHpOf(F), 5);
  assert.equal(combat.maxArmorOf(F), 3);
  assert.equal(F.armor, 3, 'เริ่มเกมเกราะเต็ม 3');
  assert.equal(action.baseMovOf(F), 4);
  assert.equal(action.movOf(F), 6, 'โบนัส Eos +2 เต็ม (ข้ามเพดาน 5)');
  assert.equal(F.skillPoints, 10);
  F.skillPoints = 5;
  engine.addSkill(F, 3, 'item');
  assert.equal(F.skillPoints, 5, 'ไอเทม/ต้นเทิร์นฟื้นไม่ได้');
  const me = view('p0', 'p0');
  const sec = me.character.secondary;
  assert.equal(sec.cost, 2);
  assert.match(sec.desc, /แนวตรง 8/);
  assert.match(me.character.basic.desc, /ตีปกติเพิ่ม 2 ครั้ง/);
  assert.match(me.character.ultimate.desc, /Energy \+6/);
  assert.match(me.character.passive2.desc, /แนวตรง 4 ช่อง/);
  assert.match(me.character.passive.desc, /กันได้ 2 ครั้ง/);
  // Echo สวมร่างเฟิร์น: คัดลอกค่าสถานะของเฟิร์นด้วย (ผู้ใช้สั่ง 2026-11-12) — รวมค่าของ Eos
  const E = { id: 'e', characterId: 'fern', echoQ: { mimic: 'fern' }, statuses: {}, statusAmt: {} };
  assert.equal(combat.maxHpOf(E), combat.maxHpOf(F));
  assert.equal(combat.maxArmorOf(E), combat.maxArmorOf(F), 'เกราะสูงสุดของเฟิร์นใน Eos');
  // นอก Eos = ค่าเดิม
  match.world = 'earth';
  assert.equal(combat.maxArmorOf(F), 2);
  assert.equal(action.baseMovOf(F), 3);
  assert.equal(fern.skillCost(F, 'secondary', 3), 3);
  assert.equal(fern.attackLane(F), true);
  F.skillPoints = 10;
  assert.equal(action.rangeOf(F), CHAR_BY_ID.fern.range);
  match.world = 'eos';
});

test('Zoltraak (Eos): ลำแสงแนวตรงด้านเดียว 4 ช่อง ดาเมจ 2 · ทะลุสิ่งกีดขวาง · ทุกศัตรูในแนวโดน · นอกแนว/อีกฝั่ง/ช่องที่ 5 ไม่โดน · เพื่อนไม่โดน', () => {
  const { F, A } = setup();
  const s = strip(12);
  F.pos = { x: s.x + 5, y: s.y };
  const T = mob(s.x + 7, s.y);           // เป้าหลัก ช่องที่ 2 ทางขวา
  const L = mob(s.x + 9, s.y);           // ช่องที่ 4 แนวเดียวกัน
  const FAR = mob(s.x + 10, s.y);        // ช่องที่ 5
  const BACK = mob(s.x + 3, s.y);        // อีกฝั่ง (ซ้าย) ระยะ 2
  const SIDE = mob(s.x + 7, s.y - 1);    // นอกแนว ระยะ 3
  A.pos = { x: s.x + 8, y: s.y };        // เพื่อนในแนว
  A.hp = 7; A.armor = 0;
  const map = action.boardMap();
  map.terrain[K(s.x + 6, s.y)] = 'rock'; // หินขวางระหว่างเฟิร์นกับเป้า
  assert.ok(Board.isObstacle(map, s.x + 6, s.y));
  engine.setActor('p0');
  assert.deepEqual(action.rangeOf(F), [1, 4]);
  assert.equal(fern.attackLane(F), true);
  assert.equal(action.canStrike(F, SIDE), false, 'นอกแนวตีไม่ได้');
  assert.equal(strikeNow('p0', T.id), true);
  delete map.terrain[K(s.x + 6, s.y)];
  assert.equal(F.skillPoints, 9, 'ตีครั้งเดียวเสีย 1');
  assert.equal(T.hp, 18);
  assert.equal(L.hp, 18, 'ช่องที่ 4 ในแนวโดน');
  assert.equal(FAR.hp, 20, 'ช่องที่ 5 ไม่โดน');
  assert.equal(BACK.hp, 20, 'อีกฝั่งไม่โดน');
  assert.equal(SIDE.hp, 20, 'นอกแนวไม่โดน');
  assert.equal(A.hp, 7, 'เพื่อนไม่โดน');
  assert.ok(!view('p0', 'p0').strikeArea);
});

test('ผู้เชี่ยวชาญเวทมนต์พื้นฐาน (Eos): กันได้ 2 การโจมตี แล้วคูลดาวน์ 3 เทิร์น · ครั้งที่ 3 โดน', () => {
  const { F } = setup();
  const s = strip(6);
  F.pos = { x: s.x + 2, y: s.y };
  const M = mob(s.x + 3, s.y);
  F.hp = 5; F.armor = 3;
  newCommand(); hitBy(M, F, 2);
  assert.equal(vit(F), 8, 'ครั้งที่ 1 กันหมด');
  assert.equal(F.fern.shieldReady, 0, 'ยังไม่ติดคูลดาวน์');
  assert.equal(view('p0', 'p0').fern.shieldLeft, 1);
  newCommand(); hitBy(M, F, 2);
  assert.equal(vit(F), 8, 'ครั้งที่ 2 กันหมด');
  assert.equal(F.fern.shieldReady, match.roundNumber + 3, 'ครบ 2 ครั้ง → คูลดาวน์ 3');
  newCommand(); hitBy(M, F, 2);
  assert.equal(vit(F), 6, 'ครั้งที่ 3 โดน (เกราะก่อน)');
  match.roundNumber += 3;
  newCommand(); hitBy(M, F, 1);
  newCommand(); hitBy(M, F, 1);
  assert.equal(vit(F), 6, 'ครบคูลดาวน์ = ได้ 2 ครั้งใหม่');
  // นอก Eos: กันครั้งเดียวแล้วคูลดาวน์
  match.world = 'earth';
  F.fern.shieldReady = 0; F.fern.shieldUsed = 0;
  newCommand(); hitBy(M, F, 1);
  assert.equal(F.fern.shieldReady, match.roundNumber + 3);
  match.world = 'eos';
});

test('ร่ายต่อเนื่อง (Eos): ตีเพิ่ม 2 ครั้ง (รวม 3) ดาเมจ +1 ทุกครั้งในตาเดินนี้ · แต่ละครั้งใช้ 1 Energy · จบตาแล้วหมด · คูลดาวน์', () => {
  const { F } = setup();
  const s = strip(8);
  F.pos = { x: s.x + 2, y: s.y };
  const M = mob(s.x + 4, s.y);
  engine.setActor('p0');
  engine.useSkill('p0', 'basic', []);
  assert.equal(F.skillPoints, 8, 'ร่ายต่อเนื่อง 2 Energy');
  assert.equal(F.fern.extra, 2);
  assert.equal(strikeNow('p0', M.id), true);
  assert.equal(M.hp, 17, 'ดาเมจ 3');
  assert.equal(engine.actorId, 'p0', 'ยังไม่จบตา');
  assert.equal(strikeNow('p0', M.id), true);
  assert.equal(engine.actorId, 'p0');
  assert.equal(strikeNow('p0', M.id), true);
  assert.equal(M.hp, 11, '3 ครั้ง ครั้งละ 3');
  assert.equal(F.skillPoints, 5, 'ตีครั้งละ 1 Energy');
  assert.notEqual(engine.actorId, 'p0', 'ครั้งที่ 3 จบตา');
  assert.equal(F.fern.castOn, false, 'ดาเมจ +1 หมดเมื่อจบตาเดิน');
  assert.equal(fern.canUseSkill(engine, F, 'basic'), false, 'คูลดาวน์');
  match.roundNumber += 2;
  assert.equal(fern.canUseSkill(engine, F, 'basic'), true);
});

test('เพิ่มระยะ (Eos): ตีครั้งถัดไปแนวตรง 8 ช่อง (ครั้งเดียว) · คอมโบร่ายต่อเนื่อง = ระยะ 8 อยู่ทุกครั้งในตาเดินนั้น', () => {
  const { F } = setup();
  const s = strip(14);
  F.pos = { x: s.x + 1, y: s.y };
  const M = mob(s.x + 9, s.y);            // ช่องที่ 8 ในแนว
  const N = mob(s.x + 7, s.y);            // ช่องที่ 6 ในแนว
  engine.setActor('p0');
  engine.useSkill('p0', 'secondary', []);
  assert.equal(F.skillPoints, 8, 'เพิ่มระยะ 2 Energy');
  assert.deepEqual(action.rangeOf(F), [1, 8]);
  assert.equal(strikeNow('p0', M.id), true);
  assert.equal(M.hp, 18);
  assert.equal(N.hp, 18, 'แนว 8 ช่องโดนทุกตัว');
  assert.equal(F.fern.boost, false, 'ไม่มีคอมโบ = หมดหลังตี 1 ครั้ง');
  assert.deepEqual(action.rangeOf(F), [1, 4]);
  // คอมโบ: ร่ายต่อเนื่อง + เพิ่มระยะ
  match.roundNumber += 2;
  engine.setActor('p0');
  engine.useSkill('p0', 'basic', []);
  engine.useSkill('p0', 'secondary', []);
  for (let i = 0; i < 3; i++) {
    assert.deepEqual(action.rangeOf(F), [1, 8], `ครั้งที่ ${i + 1} ยังระยะ 8`);
    assert.equal(strikeNow('p0', M.id), true);
  }
  assert.equal(M.hp, 18 - 9, 'ร่ายต่อเนื่อง +1 ทั้ง 3 ครั้ง');
  assert.equal(F.fern.boost, false, 'จบตาเดิน = เพิ่มระยะหมด');
  assert.deepEqual(action.rangeOf(F), [1, 4]);
});

test('ซ่อนเร้นมานา (Eos): Energy +6 ทันที · ต้นเทิร์น +2 จนเต็ม · ฟื้นพลังชีวิต 1 ทุกเทิร์น · กดอีกครั้งยกเลิก · มอนมองไม่เห็นและไม่เล็ง', () => {
  const { F } = setup();
  const s = strip(8);
  F.pos = { x: s.x + 2, y: s.y };
  const M = mob(s.x + 3, s.y);
  F.fern.concealReady = 0;
  F.skillPoints = 1; F.hp = 2;
  engine.setActor('p0');
  engine.useSkill('p0', 'ultimate', []);
  assert.ok(F.fern.conceal);
  assert.equal(F.skillPoints, 7, '+6 ทันที');
  // มอนไม่เห็นแม้อยู่ติดกัน และไม่อยู่ในรายชื่อเป้า
  assert.equal(require('../../server/visibility.js').hiddenFromUnit(M, F), true);
  assert.ok(!S6.prey(ctx(), st(), M).some((p) => p.id === F.id), 'มอนไม่เล็งเฟิร์น');
  match.roundNumber += 1;
  fern.onRoundStartTick(engine, F);
  assert.deepEqual([F.skillPoints, F.hp], [9, 3], '+2 Energy · ฮีล 1');
  match.roundNumber += 1;
  fern.onRoundStartTick(engine, F);
  assert.deepEqual([F.skillPoints, F.hp], [10, 4], 'Energy ตันที่ 10 · ฮีลทุกเทิร์น');
  assert.ok(F.fern.conceal, 'เต็มแล้วโหมดยังอยู่');
  // กดอีกครั้ง = ยกเลิก (ไม่สตั้น)
  engine.setActor('p0');
  engine.useSkill('p0', 'ultimate', []);
  assert.equal(F.fern.conceal, null);
  assert.equal(F.fern.stunPending, false);
  assert.ok(S6.prey(ctx(), st(), M).some((p) => p.id === F.id), 'ออกแล้วมอนเล็งได้อีก');
  // นอก Eos: ศัตรูในระยะ 2 ยังเห็น · ฮีลทุก 2 เทิร์น
  match.world = 'earth';
  assert.equal(fern.hiddenFromMobs(F), false);
  F.fern.conceal = { since: match.roundNumber, healAt: match.roundNumber + 2, every: 2 };
  assert.equal(fern.seenBy(engine, M, F), true);
  F.fern.conceal = null;
  match.world = 'eos';
});

test('ตีครบ 4 → ครั้งที่ 5 เสริมพลัง (Eos ยังอยู่): ฟรี · ทะลุเกราะทุกตัวในแนว · รีเซ็ทการกันได้ 2 ครั้งใหม่', () => {
  const { F } = setup();
  const s = strip(8);
  F.pos = { x: s.x + 2, y: s.y };
  const M = mob(s.x + 4, s.y, { armor: 3 });
  const N = mob(s.x + 5, s.y, { armor: 3 });  // แนวเดียวกัน ช่องที่ 3
  F.fern.count = 4; F.fern.shieldReady = 99; F.fern.shieldUsed = 1;
  engine.setActor('p0');
  assert.equal(strikeNow('p0', M.id), true);
  assert.equal(F.skillPoints, 10, 'ฟรี');
  assert.deepEqual([M.hp, M.armor], [18, 3], 'ทะลุเกราะ');
  assert.deepEqual([N.hp, N.armor], [18, 3]);
  assert.equal(F.fern.count, 0);
  assert.deepEqual([F.fern.shieldReady, F.fern.shieldUsed], [0, 0]);
});
