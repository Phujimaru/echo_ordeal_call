// ระบบร้านค้า: ร้านค้ามายา (ร้านเดียว · เกราะ Mark 42 / ปืน+กระสุน GUTS / ยาฟื้นแต้มสกิล ถอดออกจากเกมแล้ว — ผู้ใช้สั่ง 2026-11-08)
//  ของใหม่ 2026-11-08: กรรไกรตัดไพ่ (ช่วงจั่ว) · ยาล้างสถานะ · วงจรพลังงาน · ยาต้านสถานะ 2 เทิร์น
//  ระบบกระดาน (GRID_PLAN §8.1): ซื้อ/ใช้ของได้เฉพาะตาเดินของตัวเอง — เทสต์ใช้ engine.setActor(id)
//  ผู้เล่นในไฟล์นี้ยืนเรียงแถว y = 4 ห่างกันคนละ 2 ช่อง · ร้านตั้งติดคนซื้อ (shopNextTo)
//  กติการ้านบนแผนที่ / กระเป๋า 5 ช่อง อยู่ใน tests/shop-board.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');

test.beforeEach(() => {
  for (const k of Object.keys(engine.players)) delete engine.players[k];
  engine.setShopItems([]);
  engine.setShopPos(null);
  engine.setGameState('PLAYING');
  slot = 0;
  engine.setRoundNumber(1);
});
test.afterEach(() => engine.clearPhaseTimer());

let uid = 0;
let slot = 0;
function mkPlayer(over = {}) {
  const id = `p${++uid}`;
  const pos = { x: 2 + 2 * slot++, y: 4 };
  const p = Object.assign({
    id, name: id, alive: true, characterId: 'dummy', hp: 5, armor: 2, skillPoints: 0,
    gold: 0, inventory: [], cards: [], locked: false, busted: false,
    statuses: {}, statusAmt: {}, cutsceneShown: {}, seen: {},
    colorTrigger: { blue: 0, red: 0, green: 0, yellow: 0 },
    dmgHp: 0, dmgArmor: 0, pos,
  }, over);
  engine.players[id] = p;
  return p;
}
function stockShop(...items) {
  engine.setShopItems(items.map((it, i) => ({ id: `shop_1_${i}`, sold: false, soldTo: null, ...it })));
  return engine.shopItems;
}
// ตั้งร้านไว้ช่องบนของคนซื้อ (ระยะ 1)
function shopNextTo(p) { engine.setShopPos({ x: p.pos.x, y: p.pos.y - 1 }); }

// ---------- การสุ่มสินค้า ----------
const SHOP_TYPES = ['fortune', 'cardColor', 'cardCut', 'armor', 'cleanse', 'resist'];
test('openShop (ร้านยาเจริญชัย): ของทุกชนิดของร้านช่องละ 1 ไม่ซ้ำ · จำนวนที่ซื้อได้ต่อช่องสุ่ม 2–5 · id ขึ้นต้น apoth_', () => {
  const seenStock = new Set();
  for (let r = 0; r < 200; r++) {
    engine.openShop();
    const types = engine.shopItems.map((it) => it.type);
    assert.deepEqual([...types].sort(), [...SHOP_TYPES].sort(), 'ครบทุกชนิด ไม่ซ้ำ');
    for (const it of engine.shopItems) {
      assert.ok(it.id.startsWith('apoth_'));
      assert.ok(it.stockBase >= 2 && it.stockBase <= 5, `stock ${it.stockBase}`);
      assert.equal(it.stock, it.stockBase);
      assert.equal(it.sold, false);
      seenStock.add(it.stockBase);
    }
  }
  assert.deepEqual([...seenStock].sort(), [2, 3, 4, 5]);
});

test('ราคา: กรรไกร 5 · ยาล้างสถานะ 3 · วงจรพลังงาน 15 · ผลึกชีวิต/เกราะ 15 · รองเท้าวายุ 4', () => {
  const price = Object.fromEntries(engine.shopCatalog().map((it) => [it.type, it.price]));
  assert.equal(price.cardCut, 5);
  assert.equal(price.cleanse, 3);
  assert.equal(price.battery, 15);
  assert.equal(price.lifeCrystal, 15);
  assert.equal(price.armorCrystal, 15);
  assert.equal(price.windBoots, 4);
});

test('buyShopItem: ช่องเดียวซื้อได้หลายชิ้นจนหมดจำนวน (ของกลาง)', () => {
  const p = mkPlayer({ gold: 30 });
  const [it] = stockShop({ type: 'cleanse', price: 3, stockBase: 2, bought: 0 });
  engine.refreshShopForJourney();
  shopNextTo(p);
  engine.setActor(p.id);
  engine.buyShopItem(p.id, it.id);
  assert.equal(it.stock, 1);
  assert.equal(it.sold, false);
  engine.buyShopItem(p.id, it.id);
  assert.equal(it.sold, true);
  engine.buyShopItem(p.id, it.id);
  assert.equal(p.inventory.length, 2);
  assert.equal(p.gold, 24);
});

// ---------- การซื้อ ----------
test('buyShopItem: ซื้อของจากร้านค้ามายาได้ หักเหรียญ และของเข้ากระเป๋า', () => {
  const p = mkPlayer({ gold: 8 });
  const [armor, resist] = stockShop({ type: 'armor', value: 1, price: 3 }, { type: 'resist', price: 5 });
  shopNextTo(p);
  engine.setActor(p.id);
  engine.buyShopItem(p.id, armor.id);
  engine.buyShopItem(p.id, resist.id);
  assert.equal(p.gold, 0);
  assert.equal(p.inventory.length, 2);
  assert.equal(p.inventory[0].type, 'armor');
  assert.equal(p.inventory[0].value, 1);
  assert.equal(p.inventory[1].type, 'resist');
  assert.ok(armor.sold && resist.sold);
  assert.equal(engine.action.locked, true); // ซื้อแล้วเดินไม่ได้อีก
});

test('buyShopItem: นอกตาเดินของตัวเอง = ซื้อไม่ได้ (ไม่เสียเหรียญ)', () => {
  const p = mkPlayer({ gold: 20 });
  const other = mkPlayer();
  const [it] = stockShop({ type: 'resist', price: 5 });
  shopNextTo(p);
  engine.buyShopItem(p.id, it.id); // ช่วงจั่วไพ่
  engine.setActor(other.id);
  engine.buyShopItem(p.id, it.id); // ตาของคนอื่น
  assert.equal(p.gold, 20);
  assert.equal(p.inventory.length, 0);
  assert.equal(it.sold, false);
});

test('buyShopItem: เหรียญไม่พอ / ของขายไปแล้ว = ซื้อไม่ได้', () => {
  const poor = mkPlayer({ gold: 4 });
  const rich = mkPlayer({ gold: 30, pos: { x: 2, y: 2 } }); // ยืนอีกฝั่งของร้าน (2,3)
  const [it] = stockShop({ type: 'resist', price: 5 });
  shopNextTo(poor);
  engine.setActor(poor.id);
  engine.buyShopItem(poor.id, it.id);
  assert.equal(poor.inventory.length, 0);
  engine.setActor(rich.id);
  engine.buyShopItem(rich.id, it.id);
  engine.setActor(poor.id);
  poor.gold = 10;
  engine.buyShopItem(poor.id, it.id); // ขายไปแล้ว
  assert.equal(poor.inventory.length, 0);
  assert.equal(rich.inventory.length, 1);
});

test('buyShopItem: วงจรพลังงานซื้อมาว่าง (charge 0)', () => {
  const p = mkPlayer({ gold: 15 });
  const [bt] = stockShop({ type: 'battery', price: 15 });
  shopNextTo(p);
  engine.setActor(p.id);
  engine.buyShopItem(p.id, bt.id);
  assert.equal(p.gold, 0);
  assert.equal(p.inventory[0].type, 'battery');
  assert.equal(p.inventory[0].charge, 0);
});

test('วงจรพลังงาน: จบเทิร์นชาร์จ +1 เพดาน 5 · ถอนเท่าที่เลือก (ไม่เกินที่ถังมี/ที่แต้มว่าง) · ถังอยู่ต่อ', () => {
  const p = mkPlayer({ skillPoints: 0, inventory: [{ uid: 'bt', type: 'battery', charge: 0 }] });
  for (let i = 0; i < 7; i++) engine.chargeBatteries();
  assert.equal(p.inventory[0].charge, 5, 'เพดาน 5');
  engine.setGameState('ACTION');
  engine.setActor(p.id);
  engine.useInventoryItem(p.id, 'bt', { amount: 2 });
  assert.equal(p.skillPoints, 2);
  assert.equal(p.inventory[0].charge, 3);
  assert.equal(p.inventory.length, 1, 'ถังยังอยู่ในกระเป๋า');
  assert.equal(engine.action.locked, true, 'ใช้ไอเทมแล้วเดินไม่ได้อีก');
  engine.useInventoryItem(p.id, 'bt', { amount: 0 });
  assert.equal(p.inventory[0].charge, 3, 'ถอน 0 = ไม่มีผล');
  p.skillPoints = engine.maxSkillOf(p) - 1;
  engine.useInventoryItem(p.id, 'bt', { amount: 3 });
  assert.equal(p.skillPoints, engine.maxSkillOf(p), 'ถอนได้เท่าที่แต้มว่าง');
  assert.equal(p.inventory[0].charge, 2);
  engine.useInventoryItem(p.id, 'bt', { amount: 1 });
  assert.equal(p.inventory[0].charge, 2, 'แต้มเต็ม = ถอนไม่ได้');
});

test('ยาล้างสถานะ: เลือกสถานะเอง ลดทีละ 1 ขั้น · ไม่ได้เลือก/ไม่มีสถานะนั้น = ใช้ไม่ได้ ไม่เสียของ · ยาต้านสถานะ 2 เทิร์น', () => {
  const p = mkPlayer({ inventory: [{ uid: 'c1', type: 'cleanse' }, { uid: 'c2', type: 'cleanse' }, { uid: 'rs', type: 'resist' }] });
  engine.setGameState('ACTION');
  engine.setActor(p.id);
  p.statuses.weak = 2; p.statuses.stun = 1;
  assert.deepEqual(engine.cleansableOf(p).sort(), ['stun', 'weak']);
  engine.useInventoryItem(p.id, 'c1', {});
  engine.useInventoryItem(p.id, 'c1', { status: 'poison' });
  engine.useInventoryItem(p.id, 'c1', { status: 'resist' });
  assert.equal(p.inventory.length, 3, 'ไม่ได้เลือก / ไม่มีสถานะนั้น / ไม่ใช่ดีบัฟ = ไม่เสียยา');
  engine.useInventoryItem(p.id, 'c1', { status: 'weak' });
  assert.equal(p.statuses.weak, 1, 'ลด 1 ขั้น ไม่หายทั้งหมด');
  assert.equal(p.statuses.stun, 1, 'สถานะอื่นไม่ถูกแตะ');
  engine.useInventoryItem(p.id, 'c2', { status: 'stun' });
  assert.ok(!p.statuses.stun, 'ขั้นสุดท้าย = หาย');
  assert.equal(p.inventory.length, 1);
  engine.useInventoryItem(p.id, 'rs');
  assert.equal(p.statuses.resist, 2);
});

test('ผลึกชีวิต / ผลึกเกราะ: สูงสุด +1 ถาวร + ฟื้น 1 · ซ้อนได้ · ล้างทุกแมตช์ใหม่', () => {
  const p = mkPlayer({ hp: 3, armor: 1, inventory: [{ uid: 'l1', type: 'lifeCrystal' }, { uid: 'l2', type: 'lifeCrystal' }, { uid: 'a1', type: 'armorCrystal' }] });
  const hp0 = engine.maxHpOf(p), ar0 = engine.maxArmorOf(p);
  engine.setGameState('ACTION');
  engine.setActor(p.id);
  engine.useInventoryItem(p.id, 'l1');
  assert.equal(engine.maxHpOf(p), hp0 + 1);
  assert.equal(p.hp, 4);
  engine.setActor(p.id);
  engine.useInventoryItem(p.id, 'l2');
  assert.equal(engine.maxHpOf(p), hp0 + 2, 'ซ้อนได้');
  engine.useInventoryItem(p.id, 'a1');
  assert.equal(engine.maxArmorOf(p), ar0 + 1);
  assert.equal(p.armor, 2);
  assert.equal(p.inventory.length, 0);
});

test('รองเท้าวายุ: ระยะเดินตานี้ +2 · ใช้แล้วยังเดินได้ · ล็อกการเดินแล้วใช้ไม่ได้ (ไม่เสียของ)', () => {
  const p = mkPlayer({ inventory: [{ uid: 'w1', type: 'windBoots' }, { uid: 'w2', type: 'windBoots' }] });
  engine.setGameState('ACTION');
  engine.setActor(p.id);
  const mov0 = engine.movOf(p);
  engine.useInventoryItem(p.id, 'w1');
  assert.equal(engine.movOf(p), mov0 + 2);
  assert.equal(engine.action.locked, false, 'ยังเดินได้');
  engine.action.locked = true;
  engine.useInventoryItem(p.id, 'w2');
  assert.equal(p.inventory.length, 1, 'ล็อกแล้ว = ไม่เสียรองเท้า');
  engine.setActor(p.id);
  assert.equal(engine.movOf(p), mov0, 'ตาใหม่ = โบนัสหาย');
});

test('เพดานเหรียญ 100', () => {
  const p = mkPlayer({ gold: 95 });
  assert.equal(engine.GOLD_MAX, 100);
  assert.equal(engine.addGold(p, 10), 5);
  assert.equal(p.gold, 100);
});

test('useDrawItem: กรรไกรตัดไพ่ตัดใบล่าสุดคืนเข้ากองกลาง · แตกแล้วตัดให้ไม่แตกได้ · กด "พอ" แล้วใช้ไม่ได้', () => {
  const p = mkPlayer({ inventory: [{ uid: 'k1', type: 'cardCut' }, { uid: 'k2', type: 'cardCut' }], cards: [{ value: 10, color: 'red' }, { value: 9, color: 'blue' }, { value: 5, color: 'green' }], busted: true });
  engine.setCentralDeck([]);
  engine.useDrawItem(p.id, 'k1');
  assert.equal(p.cards.length, 2);
  assert.equal(p.busted, false);
  assert.equal(engine.centralDeck.length, 1);
  assert.equal(p.inventory.length, 1);
  p.locked = true;
  engine.useDrawItem(p.id, 'k2');
  assert.equal(p.cards.length, 2);
  assert.equal(p.inventory.length, 1);
});

test('useInventoryItem: ไอเทมชนิดที่ไม่มีในเกมแล้ว (ของค้างจาก snapshot เก่า) กดใช้ไม่ได้ ไม่หายจากกระเป๋า', () => {
  const p = mkPlayer({ inventory: [{ uid: 'old', type: 'gutsGun' }, { uid: 'sp', type: 'skillPoint', value: 2 }] });
  engine.setGameState('ACTION');
  engine.setActor(p.id);
  engine.useInventoryItem(p.id, 'old', {});
  engine.useInventoryItem(p.id, 'sp', {});
  assert.equal(p.inventory.length, 2);
});

// ---------- สภาพชา (ดีบัฟ Universal) ----------
test('สภาพชา: กดจั่ว 1 ครั้ง ได้ไพ่ 2 ใบ — ไม่ติดสถานะจั่วได้ใบเดียวตามปกติ', () => {
  const normal = mkPlayer();
  const chaa = mkPlayer({ statuses: { chaa: 2 } });
  engine.setCentralDeck(Array.from({ length: 20 }, () => ({ value: 1, color: 'red' })));

  engine.hit(normal.id);
  assert.equal(normal.cards.length, 1);

  engine.hit(chaa.id);
  assert.equal(chaa.cards.length, 2);
});

// ---------- ไอเทมช่วงจั่วไพ่: ยาโชคลาภ / ยาเปลี่ยนสีการ์ด (ผู้ใช้สั่ง 2026-10-18) ----------
test('useDrawItem: ยาโชคลาภใช้ช่วงจั่วได้ (+2) · เต็มเพดานแล้วไม่เสียของ · กด "พอ" แล้วใช้ไม่ได้', () => {
  const p = mkPlayer({ inventory: [{ uid: 'f1', type: 'fortune' }, { uid: 'f2', type: 'fortune' }] });
  engine.useDrawItem(p.id, 'f1');
  assert.equal(p.statuses.fortune, 2);
  assert.equal(p.inventory.length, 1);
  p.statuses.fortune = 3;
  engine.useDrawItem(p.id, 'f2');
  assert.equal(p.inventory.length, 1, 'โชคลาภเต็ม 3 แล้ว ไม่ควรเสียยา');
  p.statuses.fortune = 0;
  p.locked = true;
  engine.useDrawItem(p.id, 'f2');
  assert.equal(p.inventory.length, 1);
});

test('useDrawItem: ยาเปลี่ยนสีการ์ดเปลี่ยนสีการ์ดเลขได้ · การ์ดพิเศษ/สีเดิม/สีมั่วไม่เสียของ', () => {
  const p = mkPlayer({
    inventory: [{ uid: 'c1', type: 'cardColor' }],
    cards: [{ value: 5, color: 'red' }, { special: 'king', color: null }],
  });
  engine.useDrawItem(p.id, 'c1', { cardIndex: 1, color: 'blue' });
  engine.useDrawItem(p.id, 'c1', { cardIndex: 0, color: 'red' });
  engine.useDrawItem(p.id, 'c1', { cardIndex: 0, color: 'purple' });
  assert.equal(p.inventory.length, 1);
  engine.useDrawItem(p.id, 'c1', { cardIndex: 0, color: 'green' });
  assert.equal(p.cards[0].color, 'green');
  assert.equal(p.inventory.length, 0);
});

test('useDrawItem: นอกช่วงจั่วไพ่ใช้ไม่ได้ · ตาเดินกด "ใช้" ยาช่วงจั่วจากกระเป๋าไม่ได้', () => {
  const p = mkPlayer({ inventory: [{ uid: 'f1', type: 'fortune' }, { uid: 'c1', type: 'cardColor' }, { uid: 'k1', type: 'cardCut' }], cards: [{ value: 5, color: 'red' }] });
  engine.setGameState('ACTION');
  engine.useDrawItem(p.id, 'f1');
  engine.useDrawItem(p.id, 'c1', { cardIndex: 0, color: 'blue' });
  engine.setActor(p.id);
  engine.useInventoryItem(p.id, 'f1');
  engine.useInventoryItem(p.id, 'c1', { cardIndex: 0, color: 'blue' });
  engine.useDrawItem(p.id, 'k1');
  engine.useInventoryItem(p.id, 'k1');
  assert.equal(p.inventory.length, 3);
  assert.equal(p.cards.length, 1);
  assert.equal(p.cards[0].color, 'red');
  assert.ok(!p.statuses.fortune);
});
