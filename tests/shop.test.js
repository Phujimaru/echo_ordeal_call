// ระบบร้านค้า: ร้านค้ามายา (ร้านเดียว รวมปืนหน่วย GUTS Select ที่เดิมอยู่ร้านลุงเท่ง)
//  ทดสอบเงื่อนไขการซื้อ/การยิง (gutsFireTargetOf) แยกจากผลของกระสุน (applyGutsBullet) เพราะการยิงจริง
//  ผ่าน useInventoryItem จะตัดเข้าคัตซีน (ตั้ง timer) — ผลของกระสุนเกิดหลังวีดีโอจบเสมอ
//  ระบบกระดาน (GRID_PLAN §8.1): ซื้อ/ใช้ของ/ยิงได้เฉพาะตาเดินของตัวเอง — เทสต์ใช้ engine.setActor(id)
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');

test.beforeEach(() => {
  for (const k of Object.keys(engine.players)) delete engine.players[k];
  engine.setShopItems([]);
  engine.setGameState('PLAYING');
  engine.setRoundNumber(1);
});
test.afterEach(() => engine.clearPhaseTimer()); // คัตซีนที่เกิดจากการยิงจริงจะตั้ง interval ค้างไว้

let uid = 0;
function mkPlayer(over = {}) {
  const id = `p${++uid}`;
  const p = Object.assign({
    id, name: id, alive: true, characterId: 'dummy', hp: 5, armor: 2, skillPoints: 0,
    gold: 0, inventory: [], cards: [], locked: false, busted: false,
    statuses: {}, statusAmt: {}, cutsceneShown: {}, seen: {},
    colorTrigger: { blue: 0, red: 0, green: 0, yellow: 0 },
    dmgHp: 0, dmgArmor: 0, gutsShotTurn: 0, gutsGargorgonPending: false,
  }, over);
  engine.players[id] = p;
  return p;
}
function stockShop(...items) {
  engine.setShopItems(items.map((it, i) => ({ id: `shop_1_${i}`, sold: false, soldTo: null, ...it })));
  return engine.shopItems;
}
function giveGun(p) { p.inventory.push({ uid: `gun_${p.id}`, type: 'gutsGun' }); }
function giveAmmo(p, ammo) {
  const item = { uid: `ammo_${ammo}_${p.id}_${p.inventory.length}`, type: 'gutsAmmo', ammo };
  p.inventory.push(item);
  return item;
}

// ---------- การสุ่มสินค้า ----------
const SHOP_TYPES = ['cardColor', 'fortune', 'resist', 'cardRemove', 'skillPoint', 'armor', 'gutsGun', 'gutsAmmo', 'mark42'];  // เกราะ Mark 42 (characters/_mark42.js)
test('rollShopItem: ออกได้เฉพาะชนิดที่มีจริง และราคาปืน/กระสุนตรงกับตาราง', () => {
  for (let i = 0; i < 800; i++) {
    const it = engine.rollShopItem();
    assert.ok(SHOP_TYPES.includes(it.type), `สินค้าชนิดที่ไม่รู้จัก: ${it.type}`);
    if (it.type === 'gutsGun') assert.equal(it.price, engine.GUTS_GUN_PRICE);
    if (it.type === 'gutsAmmo') {
      assert.ok(engine.GUTS_AMMO[it.ammo], `กระสุนที่ไม่รู้จัก: ${it.ammo}`);
      assert.equal(it.price, engine.GUTS_AMMO[it.ammo].price);
    }
  }
});

test('rollShopItem: allowGun=false ไม่ออกปืนเลย / allowMark42=false ไม่ออก Mark 42 เลย', () => {
  for (let i = 0; i < 400; i++) assert.notEqual(engine.rollShopItem(false).type, 'gutsGun');
  for (let i = 0; i < 400; i++) assert.notEqual(engine.rollShopItem(true, false).type, 'mark42'); // เพดาน Mark 42 ต่อรอบ
});

test('openShop: ร้านเดียว 15 ชิ้น id ขึ้นต้น shop_ ทั้งหมด', () => {
  engine.openShop();
  assert.equal(engine.shopItems.length, 15);
  assert.ok(engine.shopItems.every((it) => it.id.startsWith('shop_')));
});

test('openShop: ปืนและเกราะ Mark 42 ขึ้นได้อย่างละไม่เกิน 2 ชิ้นต่อรอบที่รี', () => {
  for (let i = 0; i < 200; i++) {
    engine.openShop();
    const guns = engine.shopItems.filter((it) => it.type === 'gutsGun').length;
    const suits = engine.shopItems.filter((it) => it.type === 'mark42').length;
    assert.ok(guns <= 2, `รอบนี้มีปืน ${guns} กระบอก`);
    assert.ok(suits <= 2, `รอบนี้มี Mark 42 ${suits} ชุด`);
  }
});

// ---------- การซื้อ ----------
test('buyShopItem: ซื้อปืน/กระสุนจากร้านค้ามายาได้ หักเหรียญ และของเข้ากระเป๋าพร้อมชนิดกระสุน', () => {
  const p = mkPlayer({ gold: 20 });
  const [gun, ammo] = stockShop({ type: 'gutsGun', price: 15 }, { type: 'gutsAmmo', ammo: 'thunder', price: 5 });
  engine.setActor(p.id);
  engine.buyShopItem(p.id, gun.id);
  engine.buyShopItem(p.id, ammo.id);
  assert.equal(p.gold, 0);
  assert.equal(p.inventory.length, 2);
  assert.equal(p.inventory[0].type, 'gutsGun');
  assert.equal(p.inventory[1].ammo, 'thunder');
  assert.ok(gun.sold && ammo.sold);
  assert.equal(engine.action.locked, true); // ซื้อแล้วเดินไม่ได้อีก
});

test('buyShopItem: นอกตาเดินของตัวเอง = ซื้อไม่ได้ (ไม่เสียเหรียญ)', () => {
  const p = mkPlayer({ gold: 20 });
  const other = mkPlayer();
  const [gun] = stockShop({ type: 'gutsGun', price: 15 });
  engine.buyShopItem(p.id, gun.id); // ช่วงจั่วไพ่
  engine.setActor(other.id);
  engine.buyShopItem(p.id, gun.id); // ตาของคนอื่น
  assert.equal(p.gold, 20);
  assert.equal(p.inventory.length, 0);
  assert.equal(gun.sold, false);
});

test('buyShopItem: มีปืนแล้วซื้อปืนอีกกระบอกไม่ได้ (ไม่เสียเหรียญ ของไม่ถูกทำเครื่องหมายว่าขายแล้ว)', () => {
  const p = mkPlayer({ gold: 40 });
  const [g1, g2] = stockShop({ type: 'gutsGun', price: 15 }, { type: 'gutsGun', price: 15 });
  engine.setActor(p.id);
  engine.buyShopItem(p.id, g1.id);
  engine.buyShopItem(p.id, g2.id);
  assert.equal(p.gold, 25);
  assert.equal(p.inventory.filter((it) => it.type === 'gutsGun').length, 1);
  assert.equal(g2.sold, false);
});

test('buyShopItem: เหรียญไม่พอ / ของขายไปแล้ว = ซื้อไม่ได้', () => {
  const poor = mkPlayer({ gold: 14 });
  const rich = mkPlayer({ gold: 30 });
  const [gun] = stockShop({ type: 'gutsGun', price: 15 });
  engine.setActor(poor.id);
  engine.buyShopItem(poor.id, gun.id);
  assert.equal(poor.inventory.length, 0);
  engine.setActor(rich.id);
  engine.buyShopItem(rich.id, gun.id);
  engine.setActor(poor.id);
  engine.buyShopItem(poor.id, gun.id); // ขายไปแล้ว
  assert.equal(poor.inventory.length, 0);
  assert.equal(rich.inventory.length, 1);
});

// ---------- เงื่อนไขการยิง ----------
test('gutsFireTargetOf: ไม่มีปืนยิงไม่ได้ / มีปืนแล้วยิงคนอื่นได้', () => {
  const p = mkPlayer();
  const t = mkPlayer();
  const ammo = giveAmmo(p, 'thunder');
  engine.setActor(p.id);
  assert.equal(engine.gutsFireTargetOf(p, ammo, t.id), null);
  giveGun(p);
  assert.equal(engine.gutsFireTargetOf(p, ammo, t.id), t);
});

test('gutsFireTargetOf: ยิงตัวเอง / ยิงคนที่ตกรอบแล้ว / เป้าหมายไม่มีอยู่ = ยิงไม่ได้', () => {
  const p = mkPlayer();
  const dead = mkPlayer({ alive: false });
  giveGun(p);
  const ammo = giveAmmo(p, 'shockwave');
  engine.setActor(p.id);
  assert.equal(engine.gutsFireTargetOf(p, ammo, p.id), null);
  assert.equal(engine.gutsFireTargetOf(p, ammo, dead.id), null);
  assert.equal(engine.gutsFireTargetOf(p, ammo, 'ไม่มีคนนี้'), null);
});

test('gutsFireTargetOf: ยิงได้เฉพาะตาเดินของตัวเอง และ 1 นัดต่อเทิร์น', () => {
  const p = mkPlayer();
  const t = mkPlayer();
  giveGun(p);
  const ammo = giveAmmo(p, 'shockwave');

  engine.setGameState('PLAYING'); // ช่วงจั่วไพ่ = ยิงไม่ได้แล้ว
  assert.equal(engine.gutsFireTargetOf(p, ammo, t.id), null);
  engine.setActor(t.id); // ตาของคนอื่น
  assert.equal(engine.gutsFireTargetOf(p, ammo, t.id), null);
  engine.setActor(p.id);
  assert.equal(engine.gutsFireTargetOf(p, ammo, t.id), t);

  p.gutsShotTurn = engine.roundNumber; // ยิงไปแล้วในเทิร์นนี้
  assert.equal(engine.gutsFireTargetOf(p, ammo, t.id), null);
  engine.setRoundNumber(engine.roundNumber + 1); // เทิร์นใหม่ = ยิงได้อีก
  assert.equal(engine.gutsFireTargetOf(p, ammo, t.id), t);
});

test('useInventoryItem: ยิงไม่ผ่านเงื่อนไข = ไม่เสียกระสุน / ปืนกดใช้ตรงๆ ไม่หาย', () => {
  const p = mkPlayer();
  const t = mkPlayer();
  giveGun(p);
  const ammo = giveAmmo(p, 'thunder');

  engine.useInventoryItem(p.id, ammo.uid, { targetId: t.id }); // นอกตาเดินของตัวเอง = ยิงไม่ได้
  assert.equal(p.inventory.length, 2);

  engine.setActor(p.id);
  engine.useInventoryItem(p.id, ammo.uid, { targetId: p.id }); // ยิงตัวเองไม่ได้
  assert.equal(p.inventory.length, 2);

  engine.useInventoryItem(p.id, `gun_${p.id}`, {}); // กดที่ปืนตรงๆ = ไม่มีอะไรเกิดขึ้น
  assert.equal(engine.hasGutsGun(p), true);
  assert.equal(p.inventory.length, 2);

  engine.useInventoryItem(p.id, ammo.uid, { targetId: t.id }); // ยิงสำเร็จ = กระสุนหาย
  assert.equal(p.inventory.length, 1);
  assert.equal(p.gutsShotTurn, engine.roundNumber);
});

test('วีดีโอกระสุนนับแยกรายคน — คนที่ 2 ที่ยิงกระสุนแบบเดียวกันยังได้ดูวีดีโอของตัวเอง', () => {
  const a = mkPlayer();
  const b = mkPlayer();
  const t = mkPlayer({ armor: 3 });
  giveGun(a); giveGun(b);
  const ammoA = giveAmmo(a, 'thunder');
  const ammoB = giveAmmo(b, 'thunder');

  engine.setActor(a.id);
  engine.useInventoryItem(a.id, ammoA.uid, { targetId: t.id });
  assert.equal(engine.gameState, 'CUTSCENE');
  engine.clearPhaseTimer();
  engine.setActor(b.id);

  engine.useInventoryItem(b.id, ammoB.uid, { targetId: t.id }); // คนละคน = ยังได้วีดีโอ
  assert.equal(engine.gameState, 'CUTSCENE');
  engine.clearPhaseTimer();
});

test('วีดีโอกระสุนแบบเดิมเล่นครั้งเดียวต่อเกมต่อคน — นัดที่ 2 ของคนเดิมไม่ตัดเข้าคัตซีน และผลเกิดทันที', () => {
  const p = mkPlayer();
  const t = mkPlayer({ armor: 3 });
  giveGun(p);
  const a1 = giveAmmo(p, 'shockwave');
  const a2 = giveAmmo(p, 'shockwave');

  engine.setActor(p.id);
  engine.useInventoryItem(p.id, a1.uid, { targetId: t.id }); // นัดแรก = เล่นวีดีโอ (เข้าเฟส CUTSCENE)
  assert.equal(engine.gameState, 'CUTSCENE');
  assert.equal(t.armor, 3); // ผลยังไม่เกิด — รอวีดีโอจบก่อน
  engine.clearPhaseTimer();

  engine.setActor(p.id);
  engine.setRoundNumber(engine.roundNumber + 1);
  engine.useInventoryItem(p.id, a2.uid, { targetId: t.id }); // นัดที่ 2 ของแบบเดิม = ไม่มีวีดีโอ
  assert.equal(engine.gameState, 'ACTION');
  assert.equal(t.armor, 0); // ผลเกิดทันที
});

// ---------- ผลของกระสุน ----------
test('Shockwave Bullet: ทำลายเกราะทั้งหมด แต่ไม่แตะพลังชีวิตจริง', () => {
  const p = mkPlayer();
  const t = mkPlayer({ armor: 3, hp: 5 });
  engine.applyGutsBullet(p, { ammo: 'shockwave' }, t);
  assert.equal(t.armor, 0);
  assert.equal(t.hp, 5);
});

test('Shockwave Bullet: เป้าหมายไม่มีเกราะอยู่แล้ว = ไม่มีอะไรเกิดขึ้น (เลือดไม่ลด)', () => {
  const p = mkPlayer();
  const t = mkPlayer({ armor: 0, hp: 4 });
  engine.applyGutsBullet(p, { ammo: 'shockwave' }, t);
  assert.equal(t.armor, 0);
  assert.equal(t.hp, 4);
});

test('Gargorgon Ray: ตั้ง pending ไว้ ยังไม่สตั้นทันที', () => {
  const p = mkPlayer();
  const t = mkPlayer();
  engine.applyGutsBullet(p, { ammo: 'gargorgon' }, t);
  assert.equal(t.gutsGargorgonPending, true);
  assert.equal(t.statuses.stun || 0, 0);
});

test('Thunder Bullet: ติดสภาพชา 2 เทิร์น — แต่โดนต้านสถานะผิดปกติกันไว้ได้', () => {
  const p = mkPlayer();
  const t = mkPlayer();
  engine.applyGutsBullet(p, { ammo: 'thunder' }, t);
  assert.equal(t.statuses.chaa, engine.GUTS_CHAA_TURNS);

  const resisted = mkPlayer({ statuses: { resist: 1 } });
  engine.applyGutsBullet(p, { ammo: 'thunder' }, resisted);
  assert.equal(resisted.statuses.chaa || 0, 0);
});

test('Nursedessei Cannon: ดาเมจ 4 (ลดเกราะก่อน) และปืนของผู้ยิงพังหายไป', () => {
  const p = mkPlayer();
  giveGun(p);
  const t = mkPlayer({ armor: 2, hp: 5 });
  engine.applyGutsBullet(p, { ammo: 'nurse' }, t);
  assert.equal(t.armor, 0);
  assert.equal(t.hp, 3); // เกราะ 2 + เลือด 2 = 4 หน่วย
  assert.equal(engine.hasGutsGun(p), false);
});

test('Nursedessei Cannon: ปืนพังแม้เป้าหมายจะตกรอบไปก่อนวีดีโอจบ', () => {
  const p = mkPlayer();
  giveGun(p);
  const t = mkPlayer({ alive: false });
  engine.applyGutsBullet(p, { ammo: 'nurse' }, t);
  assert.equal(engine.hasGutsGun(p), false);
  assert.equal(t.hp, 5); // ไม่โดนดาเมจ (ตกรอบไปแล้ว)
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
