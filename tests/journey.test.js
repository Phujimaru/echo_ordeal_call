// การเดินทาง 7 ภูมิภาค (characters/_journey.js) — สนามของโหมดสงครามทั่วไป ffa/duo/trio
process.env.JOURNEY_START_SECONDS = '1';
process.env.JOURNEY_ADVANCE_SECONDS = '1';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const Journey = require('../characters/_journey.js');
const { tickBurn } = require('../characters/_universal_status.js');

const realRandom = Math.random;
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitState(pred, ms = 5000) {
  for (let i = 0; i < ms / 50; i++) { if (pred()) return true; await delay(50); }
  return false;
}
function withRandom(v, fn) {
  Math.random = () => v;
  try { return fn(); } finally { Math.random = realRandom; }
}
// ตั้งเทิร์น + ภูมิภาค (เกมจริงสุ่มภูมิภาค — เทสต์ผลสนามกำหนดเอง: เทิร์น 1–6 = I, 7–12 = II, … ตามลำดับเลขเพื่อให้อ่านง่าย)
function at(round, area = Math.min(7, Math.floor((round - 1) / Journey.AREA_TURNS) + 1)) {
  engine.setRoundNumber(round);
  engine.setJourneyArea(area);
}
// 'dummy' = ตัวละครสมมติไม่มีฮุค — ทดสอบผลสนามล้วนๆ ไม่ให้สกิลติดตัวของใครมาปน
function setup(chars = ['dummy', 'dummy', 'dummy'], mode = 'ffa') {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  chars.forEach((ch, i) => {
    engine.players['p' + i] = {
      id: 'p' + i, name: 'P' + i, position: i + 1, characterId: ch, alive: true, connected: true,
      cards: [], statuses: {}, statusAmt: {}, seen: {}, inventory: [], teamId: null,
    };
  });
  engine.setGameMode(mode);
  engine.startMatch();
  engine.clearPhaseTimer();
  return engine.players;
}
// ตีปกติ 1 ครั้ง (ท่อดาเมจล้วน ไม่มีกระดาน/ตีสวน)
function attack(byId, targetId) {
  engine.doAttack(byId, targetId);
  engine.clearPhaseTimer();
}
// ซื้อของได้เฉพาะตาเดินของตัวเอง และต้องยืนติดร้าน (GRID_PLAN §8.1) — ย้ายคนซื้อไปยืนข้างร้าน (ร้านเป็นของกลาง)
function buy(id, itemId) {
  const p = engine.players[id];
  p.pos = { x: 6, y: 4 };
  engine.setShopPos({ x: 6, y: 3 });
  engine.setActor(id);
  engine.buyShopItem(id, itemId);
}

test.afterEach(() => { Math.random = realRandom; engine.clearPhaseTimer(); });
test.after(() => { engine.clearPhaseTimer(); for (const id of Object.keys(engine.players)) delete engine.players[id]; });

test('ภูมิภาคเปลี่ยนทุก 6 เทิร์น · กลางวัน/กลางคืนสลับทุก 3 เทิร์น (ทุกภูมิภาคเริ่มด้วยกลางวัน)', () => {
  assert.deepEqual([1, 5, 6, 7, 12, 18, 36, 42].map(Journey.legEnds), [false, false, true, false, true, true, true, true]);
  setup();
  // กลางวัน 1-3 · กลางคืน 4-6 · กลางวัน 7-9 · กลางคืน 10-12 …
  assert.deepEqual([1, 3, 4, 6, 7, 9, 10, 12, 13].map((r) => engine.isNightRound(r)), [false, false, true, true, false, false, true, true, false]);
  at(9, 5);
  assert.deepEqual(Journey.current(engine), { area: 5, night: false });
  at(10, 5);
  assert.deepEqual(Journey.current(engine), { area: 5, night: true });
  at(7, 4);
  assert.equal(engine.buildStateFor('p0').journey.turnsLeft, 6, 'เทิร์นแรกของภูมิภาคเหลือ 6 เทิร์น');
  at(12, 4);
  assert.equal(engine.buildStateFor('p0').journey.turnsLeft, 1, 'เทิร์นสุดท้ายของภูมิภาค');
  at(96, 7);
  assert.equal(engine.buildStateFor('p0').journey.turnsLeft, 1, 'ภูมิภาค 7 ก็ย้ายต่อ ไม่ค้างถาวร');
});

test('สุ่มภูมิภาคถัดไป: ได้แค่ 2–7 · ไม่ซ้ำที่อยู่ตอนนี้ · ไม่กลับไปภูมิภาค 1', () => {
  for (const from of [1, 2, 3, 4, 5, 6, 7]) {
    const seen = new Set();
    for (const r of [0, 0.17, 0.34, 0.51, 0.68, 0.85, 0.999]) seen.add(withRandom(r, () => Journey.pickNextArea(from)));
    const want = [2, 3, 4, 5, 6, 7].filter((a) => a !== from);
    assert.deepEqual([...seen].sort(), want, `จาก ${from}`);
  }
});

test('เริ่มเกม: พักรอฉากเปิดตัว + ฉากแผนที่ "start" แล้วค่อยแจกไพ่เทิร์น 1', async () => {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  ['dummy', 'dummy'].forEach((ch, i) => {
    engine.players['p' + i] = { id: 'p' + i, name: 'P' + i, position: i + 1, characterId: ch, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {}, seen: {}, inventory: [], teamId: null };
  });
  engine.setGameMode('ffa');
  engine.startMatch();
  assert.equal(engine.gameState, 'CUTSCENE');
  const scene = engine.buildStateFor('p0').journey.scene;
  assert.equal(scene.active, true);
  assert.equal(scene.mode, 'start');
  assert.ok(await waitState(() => engine.gameState === 'PLAYING' && engine.roundNumber === 1, 15000), 'เทิร์น 1 เริ่มหลังฉากจบ');
  assert.equal(engine.buildStateFor('p0').journey.scene.active, false);
});

test('ข้ามเข้าภูมิภาคใหม่: สุ่มปลายทาง + ฉากแผนที่ "advance" ก่อนเทิร์น 7 · เทิร์นกลางภูมิภาคไม่ข้าม', async () => {
  setup();
  at(5, 1);
  engine.setGameState('ATTACKING');
  engine.endTurn();
  assert.notEqual(engine.buildStateFor('p0').journey.scene?.mode, 'advance', 'จบเทิร์น 5 ยังไม่ย้าย');
  assert.equal(engine.journeyArea, 1);
  engine.clearPhaseTimer();
  at(6, 1);
  engine.setGameState('ATTACKING');
  Math.random = () => 0.99; // สุ่มได้ตัวท้ายของ [2..7] = 7
  engine.endTurn();
  Math.random = realRandom;
  assert.ok(await waitState(() => engine.buildStateFor('p0').journey.scene?.active));
  const j = engine.buildStateFor('p0').journey;
  assert.deepEqual({ mode: j.scene.mode, area: j.scene.area, fromArea: j.scene.fromArea }, { mode: 'advance', area: 7, fromArea: 1 });
  assert.deepEqual(j.scene.route, [1], 'เส้นทางที่ผ่านมาก่อนปลายทาง');
  assert.deepEqual(engine.journeyRoute, [1, 7]);
  assert.equal(j.area, 7, 'ระหว่างฉาก client เห็นภูมิภาคปลายทางแล้ว (ฉากหลัง/เพลงเปลี่ยนใต้แผนที่)');
  assert.equal(j.night, false, 'เทิร์น 7 เป็นกลางวัน — ทุกภูมิภาคเริ่มด้วยกลางวัน');
  assert.ok(await waitState(() => engine.gameState === 'PLAYING' && engine.roundNumber === 7));
});

test('1 อาณาจักรแห่งจุดเริ่มต้น: กลางวันแต้มโบนัสเฉพาะเทิร์นเลขคู่ · กลางคืนมีภาษีสกิล — ภูมิภาคอื่นไม่มีทั้งสองอย่าง', () => {
  setup();
  at(2);
  assert.equal(Journey.skillBonus(engine, false), 1);
  at(3);
  assert.equal(Journey.skillBonus(engine, true), 0);
  at(4);
  assert.equal(Journey.nightTaxOn(engine, false), true);
  at(10);
  assert.equal(Journey.nightTaxOn(engine, true), false, 'ภูมิภาค 2 กลางคืน ไม่มีภาษีกลางคืนเดิม');
  at(8);
  assert.equal(Journey.skillBonus(engine, true), 0, 'ภูมิภาค 2 ไม่มีโบนัสเช้าเดิม');
});

test('2 ทุ่งดอกไม้: กลางวันได้ของฟรี · กลางคืนร้านซื้อได้ช่องละ 3 ชิ้น (ยกเว้นของที่มีโควตา)', () => {
  const { p0, p1, p2 } = setup();
  at(8);
  withRandom(0, () => Journey.onEndTurn(engine));
  assert.equal(p0.inventory.length, 1);
  assert.ok(p0.inventory[0].price <= 5 && p0.inventory[0].type !== 'gutsAmmo');

  at(10);
  engine.openShop();
  const shop = engine.shopItems;
  const potion = shop.find((it) => it.type !== 'gutsGun' && it.type !== 'mark42');
  assert.equal(potion.stock, 3);
  for (const p of [p0, p1, p2]) p.gold = 30;
  buy('p0', potion.id);
  buy('p1', potion.id);
  assert.equal(potion.sold, false);
  assert.equal(potion.stock, 1);
  buy('p2', potion.id);
  assert.equal(potion.sold, true, 'ชิ้นที่ 3 หมดช่อง');
  buy('p0', potion.id);
  assert.equal(p0.gold, 30 - potion.price, 'ซื้อเกินสต็อกไม่ได้');
  for (const it of shop.filter((x) => x.type === 'gutsGun' || x.type === 'mark42')) {
    assert.equal(it.stock, undefined, 'ของที่มีโควตาต่อรอบยังช่องละ 1');
  }
});

test('2 ทุ่งดอกไม้: ร้านที่เปิดตอนกลางวัน (เทิร์น 9) ซื้อได้ช่องละ 3 ชิ้นทันทีที่เข้ากลางคืน (10) — ไม่ต้องรอร้านรอบถัดไป', () => {
  const { p0, p1 } = setup();
  for (const p of [p0, p1]) p.gold = 30;
  at(9);
  engine.openShop();
  const potion = engine.shopItems.find((it) => it.type !== 'gutsGun' && it.type !== 'mark42');
  buy('p0', potion.id);
  assert.equal(potion.sold, true, 'กลางวันช่องละ 1 ชิ้น');
  at(10);
  engine.refreshShopForJourney(); // ต้นเทิร์นใหม่
  assert.equal(potion.sold, false, 'กลางคืนซื้อต่อได้');
  assert.equal(potion.stock, 2, 'ซื้อไปแล้ว 1 จาก 3');
  buy('p1', potion.id);
  buy('p1', potion.id);
  assert.equal(potion.sold, true);
  at(13);
  engine.refreshShopForJourney();
  assert.equal(potion.stock, undefined, 'พ้นทุ่งดอกไม้กลางคืนแล้วกลับเป็นช่องละ 1');
});

test('4 คลื่นวงวนน้ำ: เข้ากลางวัน (เทิร์น 19) ร้านที่ค้างจากเทิร์น 18 เหลือแต่ของราคา 5 ขึ้นไปทันที · ของที่ซื้อไปแล้วไม่ถูกเปลี่ยน', () => {
  const { p0 } = setup();
  p0.gold = 30;
  at(18);
  engine.setShopItems([
    { id: 'a', type: 'armor', value: 1, price: 3, sold: false, soldTo: null },
    { id: 'b', type: 'armor', value: 1, price: 3, sold: false, soldTo: null },
    { id: 'c', type: 'resist', price: 5, sold: false, soldTo: null },
  ]);
  buy('p0', 'b');
  at(19);
  engine.refreshShopForJourney();
  const shop = engine.shopItems;
  assert.ok(shop.find((it) => it.id.startsWith('a')).price >= 5, 'ช่องถูกที่ยังไม่มีคนซื้อถูกสุ่มใหม่');
  assert.equal(shop.find((it) => it.id === 'b').price, 3, 'ช่องที่ซื้อไปแล้วคงเดิม');
  assert.equal(shop.find((it) => it.id === 'c').price, 5);
});

test('3 ป่าไม้ต้องสาป: สกิลแพงขึ้น +1 (ราคา 0 ยังฟรี) · กลางวันโจมตีพลาด 40% / โดนแรงขึ้น +1', () => {
  const { p1 } = setup(['oberon_summer', 'dummy', 'dummy']); // ต้องมีตัวละครจริงที่สกิลมีราคา (ม่านแห่งราตรี 2 แต้ม)
  at(1);
  const baseCost = engine.buildStateFor('p0').players.find((x) => x.id === 'p0').character.basic.cost;
  at(13);
  assert.equal(engine.buildStateFor('p0').players.find((x) => x.id === 'p0').character.basic.cost, baseCost + 1);
  assert.equal(Journey.skillTax(engine, 0), 0);

  p1.armor = 0; p1.hp = 7; p1.shield = 0;
  withRandom(0, () => attack('p0', 'p1'));
  assert.equal(p1.hp, 7, 'พลาดเป้า');
  assert.equal(engine.lastAttack.dodge, true);

  withRandom(0.99, () => attack('p0', 'p1'));
  assert.equal(p1.hp, 5, 'ตีโดน = พลังโจมตีพื้นฐาน 1 +1');
});

test('3 ป่าไม้ต้องสาป กลางวัน: สกิลที่เลือกศัตรูพลาด 25% · แม่นยำไม่พลาด · เป้าหมายเป็นตัวเอง/เพื่อนไม่นับ', () => {
  const { p0 } = setup();
  at(14);
  assert.equal(withRandom(0.2, () => Journey.skillMisses(engine, p0, ['p1'])), true);
  assert.equal(withRandom(0.3, () => Journey.skillMisses(engine, p0, ['p1'])), false);
  assert.equal(withRandom(0, () => Journey.skillMisses(engine, p0, ['p0'])), false);
  assert.equal(withRandom(0, () => Journey.skillMisses(engine, p0, [])), false);
  p0.statuses.accurate = 1;
  assert.equal(withRandom(0, () => Journey.skillMisses(engine, p0, ['p1'])), false);
});

test('3 ป่าไม้ต้องสาป กลางคืน: ลุกไหม้แรงขึ้น +1 ตามโอกาส 50%', () => {
  const { p0 } = setup();
  at(16);
  p0.armor = 0; p0.hp = 7; p0.shield = 0;
  p0.statuses.hburn = 2;
  withRandom(0, () => tickBurn(engine, p0));
  assert.equal(p0.hp, 5);
  withRandom(0.99, () => tickBurn(engine, p0));
  assert.equal(p0.hp, 4, 'ไม่ติดโอกาส = ความเสียหายปกติ 1');
  at(14);
  p0.statuses.hburn = 1;
  withRandom(0, () => tickBurn(engine, p0));
  assert.equal(p0.hp, 3, 'กลางวันไม่มีโบนัส');
});

test('4 คลื่นวงวนน้ำ: เหรียญ +1 · กลางวันร้านมีแต่ของราคา 5+ · กลางคืนเสียเหรียญ (ไม่พอ = โดนความเสียหาย)', () => {
  const { p0 } = setup();
  at(20);
  assert.equal(Journey.goldBonus(engine), 1);
  at(19);
  engine.openShop();
  assert.ok(engine.shopItems.every((it) => it.price >= 5));

  at(22);
  p0.gold = 1; p0.armor = 1; p0.shield = 0;
  withRandom(0, () => Journey.onEndTurn(engine));
  assert.equal(p0.gold, 0);
  assert.equal(p0.armor, 0, 'จ่ายไม่พอ -> ความเสียหาย 1 ลงเกราะก่อน');
});

test('5 ทะเลทราย: เกราะฟื้นทุกเทิร์น · กลางวันโดนแดด 1 · กลางคืนคืนแต้มไม่เกินที่จ่ายจริง', () => {
  const { p0 } = setup();
  at(25);
  assert.equal(Journey.armorRegenDue(engine, 25), true);
  at(11);
  assert.equal(Journey.armorRegenDue(engine, 11), false);
  at(25);
  p0.armor = 3; p0.shield = 0;
  Journey.onEndTurn(engine);
  assert.equal(p0.armor, 2);
  at(28);
  assert.equal(Journey.skillRefund(engine, 6), 2);
  assert.equal(Journey.skillRefund(engine, 1), 1);
  assert.equal(Journey.skillRefund(engine, 0), 0);
});

test('6 อาณาจักรน้ำแข็ง: คริติคอล 20% ×2 (อัตราคริจากบัฟอื่น = บวกเข้าอัตราเดิม ไม่คูณซ้อน) · กลางคืนสตั้น ไม่โดนซ้ำเทิร์นติดกัน · ต้านสถานะกันได้', () => {
  const { p0, p1 } = setup();
  at(31);
  assert.equal(withRandom(0, () => Journey.applyCrit(engine, p0, 2, {})), 4);
  assert.equal(withRandom(0.5, () => Journey.applyCrit(engine, p0, 2, {})), 2);
  assert.equal(Journey.critBonus(engine), 20);
  // อัตราคริจากบัฟอื่น (extraPct): บวกเข้าอัตราของสนามแล้วทอยครั้งเดียว — ไม่ทอยแยกจนคูณซ้อน
  assert.equal(withRandom(0.29, () => Journey.applyCrit(engine, p0, 2, {}, 10)), 4, 'สนาม 20% + 10% = คริได้');
  assert.equal(withRandom(0.31, () => Journey.applyCrit(engine, p0, 2, {}, 10)), 2);
  assert.equal(withRandom(0, () => Journey.applyCrit(engine, p0, 3, {}, 50)), 6, 'ไม่เกิน ×2');
  at(21);
  assert.equal(withRandom(0.15, () => Journey.applyCrit(engine, p0, 2, {}, 10)), 2, 'นอกอาณาจักรน้ำแข็งไม่มีโบนัสของสนาม');

  at(34);
  p1.statuses.resist = 1;
  withRandom(0, () => Journey.onEndTurn(engine));
  assert.equal(p0.statuses.stun, 1);
  assert.equal(p1.statuses.stun, undefined, 'ต้านสถานะผิดปกติ');
  delete p0.statuses.stun;
  at(35);
  withRandom(0, () => Journey.onEndTurn(engine));
  assert.equal(p0.statuses.stun, undefined, 'เพิ่งโดนเมื่อเทิร์นที่แล้ว');
});

test('7 จุดสิ้นสุดของโลก: แต้มสกิล +1 ทุกเทิร์น · กลางวันไฟแผดเผา + ผุพัง · กลางคืนพลังโจมตี +1', () => {
  const { p0, p1 } = setup();
  at(37);
  assert.equal(Journey.skillBonus(engine, false), 1);
  p0.armor = 3; p0.shield = 0;
  withRandom(0, () => Journey.onEndTurn(engine));
  assert.equal(p0.armor, 2);
  assert.equal(p0.statuses.decay, 1);

  at(40);
  p1.armor = 0; p1.hp = 7; p1.shield = 0;
  withRandom(0.99, () => attack('p0', 'p1'));
  assert.equal(p1.hp, 5, 'พลังโจมตีพื้นฐาน 1 +1');
});
