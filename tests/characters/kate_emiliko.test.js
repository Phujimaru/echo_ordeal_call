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

// ---------- อาวุธ / สกิล ----------
const M = require('../../server/match.js');
const KC = require('../../characters/kate_emiliko_combat.js');
const Soot = require('../../server/soot.js');
const hooks = require('../../characters/index.js');
const vit = (p) => (p.hp || 0) + (p.armor || 0);
const runBeats = () => { for (const b of M.skillBeats.splice(0)) b.fn(); };

test('เอมิลิโกะเปลี่ยนอาวุธ: 0 แต้ม ไม่กินโควตา ไม่ล็อกการเดิน · ดาบต้องได้จากเคทก่อน', () => {
  const P = setup([['K', 'kate', 3, 5], [E, null, 4, 5], ['B', 'dummy', 12, 5]]);
  startTurn('K');
  engine.useSkill('K', 'basic', []);
  engine.useSkill(E, 'secondary', [], { form: 'sword' });
  assert.equal(P.K.shadow.weapon, 'mop', 'ยังไม่มีดาบ');
  engine.useSkill(E, 'secondary', [], { form: 'vase' });
  assert.equal(P.K.shadow.weapon, 'vase');
  assert.equal(P[E].skillUsedRound, false);
  assert.equal(engine.action.locked, false);
  assert.equal(engine.moveTo(E, 6, 5), true);
});

test('แจกัน: ผลักเป้า 3 ช่อง ทางที่ผ่านเป็นพื้นเปียก · ชนสิ่งกีดขวาง/คน = เสีย 1', () => {
  const P = setup([['K', 'kate', 1, 1], [E, null, 3, 5], ['B', 'dummy', 4, 5], ['C', 'dummy', 6, 5]]);
  P.K.shadow.weapon = 'vase';
  const before = vit(P.B), beforeC = vit(P.C);
  hooks.emiliko.afterBoardAttack(engine, P[E], P.B, { dodge: false })();
  assert.deepEqual(P.B.pos, { x: 5, y: 5 }, 'ไปได้ 1 ช่องแล้วชน C');
  assert.equal(vit(P.B), before - 1);
  assert.equal(vit(P.C), beforeC - 1, 'คนที่ถูกชนเสีย 1');
  assert.equal(engine.boardMap().special['4,5'], 'wet');
  // ไม่มีอะไรขวาง = 3 ช่อง
  P.C.pos = { x: 12, y: 12 };
  hooks.emiliko.afterBoardAttack(engine, P[E], P.B, { dodge: false })();
  assert.ok(P.B.pos.x > 5, 'ถูกผลักต่อ');
});

test('เครื่องดูดฝุ่น: ระยะตี 3 · ดาเมจเท่าระยะ (ไม่รับบัฟ) · ดูดเป้ามาติดตัว', () => {
  const P = setup([['K', 'kate', 1, 1], [E, null, 3, 5], ['B', 'dummy', 6, 5]]);
  P.K.shadow.weapon = 'vacuum';
  assert.deepEqual(engine.rangeOf(P[E]), [1, 3]);
  P[E].statusAmt.cardAtkBonus = 2; // ไพ่แดงไม่มีผล
  const before = vit(P.B);
  engine.doAttack(E, 'B');
  assert.equal(vit(P.B), before - 3);
  hooks.emiliko.afterBoardAttack(engine, P[E], P.B, { dodge: false })();
  assert.deepEqual(P.B.pos, { x: 4, y: 5 });
});

test('ไม้ถูพื้น: เดินเข้าพื้นเปียก = ไถลสุดแนว ชนศัตรู -2 ไม่กระเด็น ไม่จบตา · ทางที่ไถลแห้ง', () => {
  const P = setup([['K', 'kate', 1, 1], [E, null, 2, 5], ['B', 'dummy', 8, 5]]);
  engine.ice.layWet([{ x: 3, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 }, { x: 6, y: 5 }, { x: 7, y: 5 }]);
  startTurn('K');
  engine.useSkill('K', 'basic', []);
  const before = vit(P.B);
  engine.setTimeLeft(40);
  assert.equal(engine.moveTo(E, 3, 5, { step: true }), true);
  assert.deepEqual(P[E].pos, { x: 7, y: 5 });
  assert.equal(vit(P.B), before - 2);
  assert.deepEqual(P.B.pos, { x: 8, y: 5 }, 'ไม่กระเด็น');
  assert.equal(engine.gameState, 'ACTION', 'ไม่จบตา');
  assert.equal(engine.boardMap().special['4,5'], undefined, 'แห้งแล้ว');
});

test('ดาบเขม่า: เคทถือ +1 · ส่งให้เอมิลิโกะ (ระยะ 4) แล้วเลือกใช้ได้ +2 · เรียกคืน = กลับอาวุธเดิม', () => {
  const P = setup([['K', 'kate', 3, 5], [E, null, 4, 5], ['B', 'dummy', 12, 5]]);
  startTurn('K');
  engine.useSkill('K', 'secondary', [], { form: 'hold' });
  assert.equal(P.K.shadow.sword, 'kate');
  assert.equal(hooks.kate.damageBonus(engine, P.K), 1);
  assert.equal(P.K.skillUsedRound, false, 'ไม่กินโควตา');
  engine.useSkill('K', 'secondary', [E], { form: 'give' });
  assert.equal(P.K.shadow.sword, 'emi');
  engine.useSkill('K', 'basic', []);
  engine.useSkill(E, 'secondary', [], { form: 'sword' });
  assert.equal(P.K.shadow.weapon, 'sword');
  assert.equal(hooks.emiliko.damageBonus(engine, P[E]), 2);
  engine.useSkill(E, 'basic', []);
  engine.useSkill('K', 'secondary', [], { form: 'recall' });
  assert.equal(P.K.shadow.sword, 'kate');
  assert.equal(P.K.shadow.weapon, 'mop');
});

test('แส้เขม่า (2 แต้ม · ระยะ 3): เอมิลิโกะ = ดึงมาติดตัว · ศัตรู = เคทพุ่งไปติด แล้ว -1', () => {
  const P = setup([['K', 'kate', 3, 5], [E, null, 6, 5], ['B', 'dummy', 3, 8]]);
  startTurn('K');
  engine.useSkill('K', 'secondary', [E], { form: 'whip' });
  assert.deepEqual(P[E].pos, { x: 4, y: 5 });
  assert.equal(P.K.skillPoints, 6);
  P.K.skillUsedRound = false;
  M.action.locked = false;
  const before = vit(P.B);
  engine.useSkill('K', 'secondary', ['B'], { form: 'whip' });
  assert.deepEqual(P.K.pos, { x: 3, y: 7 });
  assert.equal(vit(P.B), before - 1);
});

test('ปีกเขม่า (4 แต้ม): บิน 4 ช่องข้ามทุกอย่าง · ช่องลงไม่ว่าง = บินต่อ · พาเอมิลิโกะที่ติดตัวไปด้วย', () => {
  const P = setup([['K', 'kate', 2, 5], [E, null, 2, 6], ['B', 'dummy', 6, 5]]);
  startTurn('K');
  engine.useSkill('K', 'secondary', [], { form: 'wings', dir: 'right' });
  assert.deepEqual(P.K.pos, { x: 7, y: 5 }, 'ช่องที่ 4 มี B → ลงช่องที่ 5');
  assert.deepEqual(P[E].pos, { x: 7, y: 6 }, 'เอมิลิโกะลงตำแหน่งเดิมเทียบกับเคท');
  assert.equal(P.K.skillPoints, 4);
});

test('ระบำเขม่า: ม่านแดง 8×8 รอบช่องที่เลือก · ศัตรูข้างในเสีย 1 · ขังไว้ · คนนอก/ในมองไม่เห็นกัน · หมดใน 3 เทิร์น', () => {
  const P = setup([['K', 'kate', 4, 4], [E, null, 4, 5], ['B', 'dummy', 6, 6], ['C', 'dummy', 12, 12]]);
  startTurn('K');
  const before = vit(P.B);
  engine.useSkill('K', 'ultimate', [], { tile: { x: 5, y: 5 } });
  const s = Soot.storms()[0];
  assert.deepEqual([s.x0, s.y0, s.x1, s.y1], [1, 1, 8, 8]);
  assert.equal(engine.gameState, 'ATTACKING', 'พักตาเดินให้ฉากเล่นก่อนลงดาเมจ');
  engine.clearPhaseTimer();
  Soot.strikeInside(s); // จังหวะหลังฉาก (skillBeat)
  assert.equal(vit(P.B), before - 1, 'ร่ายแล้วเสีย 1');
  assert.equal(engine.buildStateFor('C').players.find((p) => p.id === 'B').pos, null, 'คนนอกไม่เห็นคนใน');
  assert.ok(engine.buildStateFor('K').players.find((p) => p.id === 'B').pos, 'ฝ่ายเคทเห็น');
  assert.equal(engine.buildStateFor('K').skillMusic, 'kate_storm');
  // ขัง: B เดินออกนอกม่านไม่ได้
  engine.setActor('B');
  assert.equal(engine.moveTo('B', 9, 6), false);
  assert.equal(engine.moveTo('B', 8, 6), true);
  // เคทในม่านเดิน 6 · เอมิลิโกะ 4
  assert.equal(engine.baseMovOf(P.K), 6);
  assert.equal(engine.baseMovOf(P[E]), 4);
  for (let i = 0; i < 3; i++) Soot.onEndTurn();
  assert.equal(Soot.storms().length, 0);
});

test('ติดตัวเคท: ตีปกติในม่านแดง → เป้ามองไม่ออก (เห็นหมากคนอื่นเป็นสีขาว ไม่มีลำดับเดิน)', () => {
  const P = setup([['K', 'kate', 4, 4], [E, null, 4, 3], ['B', 'dummy', 5, 4], ['C', 'dummy', 12, 12]]);
  Soot.cast(P.K, engine.tileArea({ kind: 'tile', square: 8 }, { x: 5, y: 5 }));
  engine.doAttack('K', 'B');
  assert.ok(P.B.statuses.shadowMask > 0);
  const st = engine.buildStateFor('B');
  assert.equal(st.masked, true);
  assert.deepEqual(st.turnOrder, []);
  const k = st.players.find((p) => p.id === 'K');
  assert.equal(k.masked, true);
  assert.equal(k.name, '');
  assert.equal(st.players.find((p) => p.id === 'B').masked, undefined, 'ตัวเองเห็นปกติ');
});

test('ร่าเริงสุดๆ (ไม้ถูพื้น): ผลักศัตรูในแนวไปพ้นปลายแนว -2 · เอมิลิโกะพุ่ง 4 ช่อง ทางที่พุ่งเปียก', () => {
  const P = setup([['K', 'kate', 1, 1], [E, null, 2, 5], ['B', 'dummy', 4, 5], ['C', 'dummy', 3, 6]]);
  const before = vit(P.B);
  KC.ultimate(engine, P[E], ['B', 'C'], { dir: 'right' }, { st: P.K.shadow });
  runBeats();
  assert.equal(vit(P.B), before - 2);
  assert.deepEqual(P.B.pos, { x: 7, y: 5 }, 'ไปช่องที่ 5 นับจากเอมิลิโกะ');
  assert.deepEqual(P.C.pos, { x: 7, y: 6 });
  assert.deepEqual(P[E].pos, { x: 6, y: 5 });
  assert.equal(engine.boardMap().special['3,5'], 'wet');
});
