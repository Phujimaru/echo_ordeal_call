// เคท & เอมิลิโกะ (kate + emiliko) — ระบบคู่ (server/duo.js) + สกิล (characters/kate_emiliko.js)
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const action = require('../../server/phases/action.js');
const Duo = require('../../server/duo.js');
const { CHAR_BY_ID, publicRoster } = require('../../characters.js');

const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
const E = 'K~duo';
// list = [[id, characterId, x, y, teamId?], ...] — แถว y = 5 ของภูมิภาค I เป็นพื้นโล่งทั้งแถว
//  ตำแหน่งของเอมิลิโกะใส่เป็นแถว ['K~duo', null, x, y]
function setup(list, mode = 'ffa') {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.filter(([, ch]) => ch).forEach(([id, ch, , , team], i) => { engine.players[id] = blank(id, ch, i + 1, team || null); });
  engine.setGameMode(mode);
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setJourneyArea(1);
  engine.setCycleShift(0);
  engine.setShopPos(null);
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.skillUsedRound = false; p.shield = 0;
    p.statuses = {}; p.statusAmt = {};
  }
  engine.players.K && (engine.players.K.skillPoints = 8);
  return engine.players;
}
function startTurn(id) {
  // beginOrder เรียงลำดับเอง — ตั้งแค่คนเดียวที่จะเดินแล้วเรียก nextActor
  const m = require('../../server/match.js');
  m.turnOrder = [id];
  m.actorIndex = -1;
  m.actorId = null;
  m.action = null;
  m.duo = null;
  action.nextActor();
  engine.clearPhaseTimer();
}

const saved = {
  triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash,
  notifyTransform: engine.notifyTransform, sfx: engine.sfx, boardFx: engine.boardFx,
};
const calls = { fx: [] };
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = () => {};
  engine.skillFlash = () => {};
  engine.notifyTransform = () => {};
  engine.sfx = () => {};
  engine.boardFx = (event, payload) => calls.fx.push({ event, payload });
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.beforeEach(() => { calls.fx = []; });
test.afterEach(() => { engine.setGameMode('ffa'); engine.setCycleShift(0); engine.clearPhaseTimer(); });

test('ข้อมูล: เลือกได้แค่เคท (ชื่อการ์ด "เคท & เอมิลิโกะ") · เอมิลิโกะซ่อน · เดิน 4/3 · ราคา 0/0/6', () => {
  const roster = publicRoster();
  const k = roster.find((c) => c.id === 'kate');
  assert.equal(k.name, 'เคท & เอมิลิโกะ');
  assert.equal(k.difficulty, 'hard');
  assert.equal(roster.find((c) => c.id === 'emiliko').hidden, true);
  assert.equal(CHAR_BY_ID.kate.duo, 'emiliko');
  assert.equal(CHAR_BY_ID.kate.mov, 4);
  assert.equal(CHAR_BY_ID.emiliko.mov, 3);
  assert.deepEqual([CHAR_BY_ID.kate.basic.cost, CHAR_BY_ID.kate.ultimate.cost, CHAR_BY_ID.emiliko.ultimate.cost], [0, 6, 6]);
  assert.deepEqual(CHAR_BY_ID.kate.ultimate.area, { kind: 'tile', range: 'mov', square: 8, place: 'any', hostile: true });
  assert.deepEqual(CHAR_BY_ID.emiliko.ultimate.area, { kind: 'line', len: 4, width: 3, hostile: true });
});

test('เริ่มแมตช์: ได้ตัวที่สองข้างกัน · เลือด 3 เกราะ 2 ต่อตัว · แต้มสกิล/เหรียญ/กระเป๋าใช้ร่วมกัน (สูงสุด 16)', () => {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  engine.players.K = blank('K', 'kate', 1);
  engine.players.B = blank('B', 'dummy', 2);
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  const K = engine.players.K, M = engine.players[E];
  assert.ok(M, 'มีเอมิลิโกะ');
  assert.equal(M.characterId, 'emiliko');
  assert.equal(M.duoOf, 'K');
  assert.equal(K.duoWith, E);
  assert.deepEqual([K.hp, K.armor, M.hp, M.armor], [3, 2, 3, 2]);
  assert.equal(Math.abs(K.pos.x - M.pos.x) + Math.abs(K.pos.y - M.pos.y), 1, 'เกิดติดกัน');
  K.skillPoints = 5;
  assert.equal(M.skillPoints, 5);
  M.skillPoints = 7;
  assert.equal(K.skillPoints, 7);
  engine.addSkill(M, 20);
  assert.equal(K.skillPoints, 16, 'เพดาน 16');
  engine.addGold(M, 3);
  assert.equal(K.gold, 3);
  assert.equal(M.inventory, K.inventory);
  assert.equal(engine.sameTeam(K, M), true, 'ฝ่ายเดียวกันแม้ ffa');
  // ส่งให้ client: ตัวที่สองมี duoOf · ผู้เล่นเห็นเป็นของตัวเอง (กระเป๋า)
  const st = engine.buildStateFor('K');
  const mPub = st.players.find((p) => p.id === E);
  assert.equal(mPub.duoOf, 'K');
  assert.ok(Array.isArray(mPub.inventory));
  assert.equal(st.controlId, 'K');
});

test('ตาเดิน: คุมเคทก่อน · กระจกเงาสลับไม่กินโควตา/ไม่ล็อกเดิน · เดินแล้วสลับออก = เดินซ้ำไม่ได้ · ตี/รอแล้วสลับกลับไม่ได้', () => {
  const P = setup([['K', 'kate', 3, 5], [E, null, 4, 5], ['B', 'dummy', 12, 5]]);
  startTurn('K');
  assert.equal(engine.actorId, 'K');
  assert.equal(engine.moveTo('K', 3, 4), true);
  engine.useSkill('K', 'basic', []);
  assert.equal(engine.actorId, E, 'สลับไปเอมิลิโกะ');
  assert.equal(P.K.skillUsedRound, false, 'ไม่กินโควตา');
  assert.equal(engine.moveTo(E, 5, 5), true, 'เอมิลิโกะเดินได้ (3)');
  engine.useSkill(E, 'basic', []);
  assert.equal(engine.actorId, 'K', 'สลับกลับเคท');
  assert.equal(engine.moveTo('K', 2, 4), false, 'เคทเดินไปแล้ว เดินซ้ำไม่ได้');
  assert.equal(engine.action.locked, true);
  // เคทรอ = จบ → สลับไปเอมิลิโกะเอง
  engine.setTimeLeft(40);
  assert.equal(engine.waitAction('K'), true);
  engine.clearPhaseTimer();
  assert.equal(engine.actorId, E);
  engine.useSkill(E, 'basic', []);
  assert.equal(engine.actorId, E, 'เคทจบแล้ว สลับกลับไม่ได้');
});

test('เอมิลิโกะ กำลังใจเต็มเปี่ยม: รอแล้วเดินต่อได้ 2 (ทำอย่างอื่นไม่ได้) → รออีกครั้ง = จบตาทั้งฝ่าย', () => {
  setup([['K', 'kate', 3, 5], [E, null, 4, 5], ['B', 'dummy', 12, 5]]);
  startTurn('K');
  engine.setTimeLeft(40);
  assert.equal(engine.waitAction('K'), true, 'เคทรอ');
  engine.clearPhaseTimer();
  assert.equal(engine.actorId, E);
  engine.setTimeLeft(40);
  assert.equal(engine.waitAction(E), true, 'เอมิลิโกะรอ');
  engine.clearPhaseTimer();
  assert.equal(engine.actorId, E, 'ยังเป็นตาเอมิลิโกะ (เดินต่อ)');
  assert.equal(engine.action.canto, true);
  assert.equal(engine.movOf(engine.players[E]), 2);
  assert.equal(engine.moveTo(E, 7, 5), false, 'เกิน 2 ช่อง');
  assert.equal(engine.moveTo(E, 6, 5), true);
  engine.useSkill(E, 'secondary', [], { form: 'vase' });
  assert.equal(engine.players.K.shadow.weapon, 'mop', 'เดินต่ออยู่ ใช้สกิลรองไม่ได้');
  engine.setTimeLeft(40);
  assert.equal(engine.waitAction(E), true);
  engine.clearPhaseTimer();
  assert.notEqual(engine.actorId, E, 'จบตาแล้ว');
});

test('หมดเวลา = จบตาทั้งฝ่าย (ไม่ได้เดินต่อ / ไม่สลับ)', () => {
  setup([['K', 'kate', 3, 5], [E, null, 4, 5], ['B', 'dummy', 12, 5]]);
  startTurn('K');
  action.actionTimeUp();
  engine.clearPhaseTimer();
  assert.ok(engine.actorId !== 'K' && engine.actorId !== E);
});

test('ล้ม 1 ตัว: ทิ้งร่าง (ขวางช่อง เดินข้ามได้) · ยังไม่ตกรอบ · ตายทั้งคู่ = ตกรอบ ร่างหาย', () => {
  const P = setup([['K', 'kate', 3, 5], [E, null, 3, 4], ['B', 'dummy', 5, 5], ['C', 'dummy', 12, 12]]);
  P.K.hp = 1; P.K.armor = 0;
  engine.dealDirect(P.K, 1);
  engine.resolveDamageAftermath(P.K);
  P.K.pos = null;
  assert.equal(P.K.alive, false);
  assert.deepEqual(P.K.corpse, { x: 3, y: 5 });
  assert.equal(P.K.result, null, 'ผู้เล่นยังไม่ตกรอบ');
  assert.equal(engine.tileFree(3, 5), false, 'ร่างขวางช่อง');
  // B เดินข้ามร่าง (4,5) → (2,5) ได้ แต่หยุดบนร่างไม่ได้
  engine.setActor('B');
  assert.equal(engine.moveTo('B', 3, 5), false, 'หยุดบนร่างไม่ได้');
  assert.equal(engine.moveTo('B', 2, 5), true, 'ข้ามร่างได้');
  // เอมิลิโกะล้มด้วย = ตกรอบ ร่างหาย
  P[E].hp = 1; P[E].armor = 0;
  engine.dealDirect(P[E], 1);
  engine.resolveDamageAftermath(P[E]);
  assert.equal(P.K.corpse, null);
  assert.equal(P.K.result, 'dead');
  assert.equal(Duo.sideAlive(P.K), false);
});

test('ตื่นขึ้นอีกครั้ง: ร่างในระยะ 4 → 6 แต้ม ฟื้นที่ร่าง เลือด 3 เกราะ 0 · นอกระยะ = กดไม่ได้ ไม่เสียแต้ม', () => {
  const P = setup([['K', 'kate', 3, 5], [E, null, 8, 5], ['B', 'dummy', 12, 12]]);
  P.K.hp = 0; P.K.alive = false; P.K.corpse = { x: 3, y: 5 }; P.K.pos = null;
  P.K.skillPoints = 10;
  startTurn('K');
  assert.equal(engine.actorId, E, 'เคทล้ม = คุมเอมิลิโกะ');
  const pub = engine.buildStateFor('K').players.find((p) => p.id === E).character.basic;
  assert.equal(pub.name, 'ตื่นขึ้นอีกครั้ง');
  assert.equal(pub.cost, 6);
  engine.useSkill(E, 'basic', []);
  assert.equal(P.K.alive, false, 'ห่าง 5 = นอกระยะ');
  assert.equal(P.K.skillPoints, 10);
  P[E].pos = { x: 7, y: 5 };
  engine.useSkill(E, 'basic', []);
  assert.equal(P.K.alive, true);
  assert.deepEqual(P.K.pos, { x: 3, y: 5 });
  assert.deepEqual([P.K.hp, P.K.armor], [3, 0]);
  assert.equal(P.K.skillPoints, 4);
  assert.equal(P.K.corpse, null);
  assert.equal(engine.hasActed('K'), true, 'ตัวที่ฟื้นขยับไม่ได้ในตานี้');
});

test('ไพ่: เคทล้มแต่เอมิลิโกะอยู่ = ผู้เล่นยังจั่ว/เปิดไพ่ · ตาของฝ่ายนี้ยังอยู่ในลำดับเดิน', () => {
  const P = setup([['K', 'kate', 3, 5], [E, null, 4, 5], ['B', 'dummy', 12, 5]]);
  P.K.hp = 0; P.K.alive = false; P.K.corpse = { x: 3, y: 5 }; P.K.pos = null;
  require('../../server/phases/draw.js').dealRound();
  engine.clearPhaseTimer();
  assert.equal(P.K.locked, false, 'ยังจั่วได้');
  assert.equal(P.K.cards.length, 1);
  assert.equal(P[E].locked, true, 'ตัวที่สองไม่จั่ว');
  assert.equal(P[E].cards, P.K.cards, 'ไพ่ใช้ร่วมกัน');
  engine.hit('K');
  assert.equal(P.K.cards.length, 2);
  engine.lock('B');
  assert.equal(engine.gameState, 'PLAYING', 'ยังรอเคทเปิดไพ่');
  engine.lock('K');
  engine.clearPhaseTimer();
  assert.ok(engine.turnOrder.includes('K'));
  assert.ok(!engine.turnOrder.includes(E));
});

test('จบเทิร์น: แต้มสกิล +2 ครั้งเดียวต่อฝ่าย · เหรียญ +1 ครั้งเดียว', () => {
  const P = setup([['K', 'kate', 3, 5], [E, null, 4, 5], ['B', 'dummy', 12, 5]]);
  P.K.skillPoints = 0; P.K.gold = 0;
  engine.setCycleShift(0);
  engine.setRoundNumber(1); // เทิร์นคี่ = ไม่มีโบนัสเช้า
  engine.endTurn();
  engine.clearPhaseTimer();
  assert.equal(P.K.skillPoints, 2);
  assert.equal(P.K.gold, 1);
});

test('จบเกม ffa: เหลือแค่ฝ่ายคู่ = ชนะ (สองตัวนับเป็นฝ่ายเดียว)', () => {
  const P = setup([['K', 'kate', 3, 5], [E, null, 4, 5], ['B', 'dummy', 12, 5]]);
  P.B.alive = false; P.B.hp = 0; P.B.pos = null;
  engine.endTurn();
  engine.clearPhaseTimer();
  assert.equal(engine.gameState, 'GAMEOVER');
});

test('เอมิลิโกะตีเคทไม่ได้ · ศัตรูตีเอมิลิโกะได้', () => {
  const P = setup([['K', 'kate', 3, 5], [E, null, 4, 5], ['B', 'dummy', 5, 5]]);
  startTurn('K');
  engine.useSkill('K', 'basic', []);
  assert.equal(engine.attackTarget(E, 'K'), false);
  engine.setActor('B');
  assert.equal(engine.attackTarget('B', E), true);
  engine.clearPhaseTimer();
  assert.ok(P[E].hp + P[E].armor < 5);
});
