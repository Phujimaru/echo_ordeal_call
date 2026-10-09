// ร้านค้าบนแผนที่ + กระเป๋า 5 ช่อง + ระยะปืน GUTS (GRID_PLAN §8.1 · ขั้น 4)
//  แผนที่ภูมิภาค I (server/board.js MAPS[1]) — จุดร้านค้า: (6,2) (1,3) (12,3) (1,10) (12,10) (7,11)
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const Board = require('../server/board.js');

const SPOTS = Board.MAPS[1].shopSpots;

test.beforeEach(() => {
  for (const k of Object.keys(engine.players)) delete engine.players[k];
  engine.setShopItems([]);
  engine.setShopPos(null);
  engine.setGameState('PLAYING');
  engine.setRoundNumber(1);
});
test.afterEach(() => engine.clearPhaseTimer());

let uid = 0;
function mkPlayer(pos, over = {}) {
  const id = `b${++uid}`;
  const p = Object.assign({
    id, name: id, alive: true, characterId: 'dummy', hp: 5, armor: 2, skillPoints: 0,
    gold: 0, inventory: [], cards: [], locked: false, busted: false,
    statuses: {}, statusAmt: {}, cutsceneShown: {}, seen: {},
    colorTrigger: { blue: 0, red: 0, green: 0, yellow: 0 },
    dmgHp: 0, dmgArmor: 0, gutsShotTurn: 0, gutsGargorgonPending: false, pos: { ...pos },
  }, over);
  engine.players[id] = p;
  return p;
}
const potion = (i = 0) => ({ id: `shop_9_${i}`, type: 'armor', value: 1, price: 3, sold: false, soldTo: null });
function fill(p, n) {
  for (let i = 0; i < n; i++) p.inventory.push({ uid: `f_${p.id}_${i}`, type: 'resist', price: 5 });
}
function giveGun(p) { p.inventory.push({ uid: `gun_${p.id}`, type: 'gutsGun' }); }
function giveAmmo(p, ammo, seen = true) {
  if (seen) p.cutsceneShown[engine.GUTS_AMMO[ammo].cut] = true; // เคยดูวีดีโอแล้ว = ยิงแล้วเข้าฉากยิงทันที
  const item = { uid: `ammo_${ammo}_${p.id}_${p.inventory.length}`, type: 'gutsAmmo', ammo };
  p.inventory.push(item);
  return item;
}
const isSpot = (pos) => SPOTS.some((s) => s.x === pos.x && s.y === pos.y);

// ---------- ร้านตั้ง / ย้าย ----------
test('ร้านค้า: ต้นเกมตั้งบนจุดร้านค้าพร้อมของ 15 ชิ้น · อยู่ 6 เทิร์น แล้วย้ายจุดใหม่ + สุ่มของใหม่', () => {
  engine.maybeMoveShop();
  const first = engine.shopPos;
  assert.ok(first && isSpot(first));
  assert.equal(engine.shopItems.length, 15);
  assert.equal(engine.shopTurnsLeft(), 6);
  const ids = engine.shopItems.map((it) => it.id).join();
  for (let r = 2; r <= 6; r++) {
    engine.setRoundNumber(r);
    engine.maybeMoveShop();
    assert.deepEqual(engine.shopPos, first, `เทิร์น ${r} ยังอยู่ที่เดิม`);
    assert.equal(engine.shopItems.map((it) => it.id).join(), ids, 'ของชุดเดิม');
    assert.equal(engine.shopTurnsLeft(), 7 - r);
  }
  engine.setRoundNumber(7);
  engine.maybeMoveShop();
  assert.ok(isSpot(engine.shopPos));
  assert.notDeepEqual(engine.shopPos, first, 'ไม่ซ้ำจุดเดิม');
  assert.notEqual(engine.shopItems.map((it) => it.id).join(), ids, 'สุ่มของใหม่');
  assert.equal(engine.shopTurnsLeft(), 6);
});

test('ร้านค้า: ย้ายไม่ลงจุดที่มีคนยืน · เปลี่ยนภูมิภาค (placeOnBoard) = ตั้งใหม่ทันทีเทิร์นถัดไป', () => {
  engine.setShopPos({ ...SPOTS[0] });
  for (const s of SPOTS.slice(1, 5)) mkPlayer(s); // ยืนทับ 4 จุด เหลือว่างจุดเดียว (SPOTS[5])
  engine.setRoundNumber(20); // ห่างจากเทิร์นที่ร้านตั้ง (เทสต์ก่อนหน้า) เกิน 6 แน่นอน → ถึงกำหนดย้าย
  engine.maybeMoveShop();
  assert.deepEqual(engine.shopPos, { ...SPOTS[5] });

  engine.setRoundNumber(21);
  engine.placeOnBoard(1);
  assert.equal(engine.shopPos, null, 'ยกร้านออกตอนเปลี่ยนแผนที่');
  engine.maybeMoveShop();
  assert.ok(isSpot(engine.shopPos), 'ไม่ต้องรอครบ 6 เทิร์น');
});

test('ร้านค้ากินช่อง: เดินทับ/ผ่านไม่ได้ (อ้อมได้) · ถอยหลังตีสวนชนร้าน = ชน −1', () => {
  const a = mkPlayer({ x: 6, y: 4 });
  engine.setShopPos({ x: 6, y: 3 });
  engine.setActor(a.id);
  assert.equal(engine.moveTo(a.id, 6, 3), false, 'ยืนบนร้านไม่ได้');
  assert.equal(engine.moveTo(a.id, 6, 2), true, 'อ้อมไปหลังร้านได้ (4 ก้าว)');
  assert.ok(!engine.action.path.some((t) => t.x === 6 && t.y === 3), 'เส้นทางไม่ผ่านร้าน');
  engine.undoMove(a.id);

  const d = mkPlayer({ x: 6, y: 5 }, { counterBack: true }); // ตีสวนปิดเป็นค่าเริ่มต้น — เปิดให้เทสต์กลไกถอย
  engine.attackTarget(a.id, d.id); // ถูกสวน → ถอยขึ้นไปทาง (6,3) = ร้าน
  assert.equal(engine.lastAttack.push.collide, true);
  assert.deepEqual(a.pos, { x: 6, y: 4 });
});

// ---------- ซื้อ ----------
test('ซื้อได้เมื่อยืนติดร้าน (ระยะ 1) เท่านั้น — ทแยง/ห่าง 2 = ไม่ได้', () => {
  engine.setShopPos({ x: 6, y: 3 });
  engine.setShopItems([potion(0)]);
  const far = mkPlayer({ x: 6, y: 5 }, { gold: 10 });
  const diag = mkPlayer({ x: 7, y: 4 }, { gold: 10 });
  const near = mkPlayer({ x: 5, y: 3 }, { gold: 10 });
  for (const p of [far, diag]) {
    engine.setActor(p.id);
    engine.buyShopItem(p.id, 'shop_9_0');
    assert.equal(p.inventory.length, 0);
    assert.equal(p.gold, 10);
  }
  engine.setActor(near.id);
  engine.buyShopItem(near.id, 'shop_9_0');
  assert.equal(near.inventory.length, 1);
  assert.equal(near.gold, 7);
});

// ---------- กระเป๋า ----------
test('กระเป๋า 5 ช่อง: เต็มแล้วซื้อ/ได้ของฟรีไม่ได้ · ทิ้งได้เฉพาะตาตัวเอง และไม่นับเป็นการใช้ (ยังเดินได้)', () => {
  engine.setShopPos({ x: 6, y: 3 });
  engine.setShopItems([potion(0)]);
  const p = mkPlayer({ x: 6, y: 4 }, { gold: 10 });
  const other = mkPlayer({ x: 10, y: 4 });
  fill(p, 5);
  engine.setActor(p.id);
  engine.buyShopItem(p.id, 'shop_9_0');
  assert.equal(p.inventory.length, 5, 'กระเป๋าเต็ม');
  assert.equal(p.gold, 10);
  assert.equal(engine.grantInventoryItem(p, { type: 'armor', value: 1 }), null);

  engine.setActor(other.id);
  assert.equal(engine.dropItem(p.id, 'f_' + p.id + '_0'), false, 'ตาคนอื่น = ทิ้งไม่ได้');
  engine.setActor(p.id);
  assert.equal(engine.dropItem(p.id, 'f_' + p.id + '_0'), true);
  assert.equal(p.inventory.length, 4);
  assert.equal(engine.action.locked, false, 'ทิ้งของไม่ล็อกการเดิน');
  engine.buyShopItem(p.id, 'shop_9_0');
  assert.equal(p.inventory.length, 5);
});

test('ถอดยาเปลี่ยนสีการ์ด/ยาลดไพ่ออกจากร้านและของฟรี', () => {
  for (let i = 0; i < 1500; i++) {
    const t = engine.rollShopItem().type;
    assert.ok(t !== 'cardColor' && t !== 'cardRemove', t);
    const g = engine.journeyGiftItem().type;
    assert.ok(g !== 'cardColor' && g !== 'cardRemove', g);
  }
});

// ---------- ปืน GUTS ----------
test('ปืน GUTS: ยิงได้ระยะ 1–4 เท่านั้น', () => {
  const p = mkPlayer({ x: 2, y: 4 });
  giveGun(p);
  const ammo = giveAmmo(p, 'thunder');
  const d4 = mkPlayer({ x: 6, y: 4 });
  const d5 = mkPlayer({ x: 2, y: 9 });
  const d1 = mkPlayer({ x: 2, y: 5 });
  engine.setActor(p.id);
  assert.equal(engine.gutsFireTargetOf(p, ammo, d4.id), d4);
  assert.equal(engine.gutsFireTargetOf(p, ammo, d1.id), d1);
  assert.equal(engine.gutsFireTargetOf(p, ammo, d5.id), null, 'ห่าง 5');
});

test('ปืน GUTS = การโจมตีของตา: เข้าฉากยิงแล้วจบตา · เป้าประชิดสวนกลับ + ผู้ยิงถอย · ยิงจากไกลไม่โดนสวน', () => {
  const p = mkPlayer({ x: 6, y: 4 }, { hp: 7, armor: 0 });
  giveGun(p);
  const near = mkPlayer({ x: 6, y: 5 }, { counterBack: true });
  const a1 = giveAmmo(p, 'thunder');
  engine.setActor(p.id);
  engine.useInventoryItem(p.id, a1.uid, { targetId: near.id });
  assert.equal(engine.gameState, 'ATTACKING');
  assert.equal(engine.action.locked, true, 'ย้อนการเดินไม่ได้แล้ว');
  assert.equal(engine.lastAttack.gun, 'thunder');
  assert.ok(engine.lastAttack.counter, 'เป้าประชิดสวนกลับ');
  assert.equal(p.hp, 6);
  assert.deepEqual(p.pos, { x: 6, y: 3 }, 'ผู้ยิงถอย 1 ช่อง');
  assert.equal(near.statuses.chaa, engine.GUTS_CHAA_TURNS);
  engine.clearPhaseTimer();

  const q = mkPlayer({ x: 10, y: 4 }, { hp: 7, armor: 0 });
  giveGun(q);
  const far = mkPlayer({ x: 13, y: 4 });
  const a2 = giveAmmo(q, 'shockwave');
  engine.setActor(q.id);
  engine.useInventoryItem(q.id, a2.uid, { targetId: far.id });
  assert.equal(engine.gameState, 'ATTACKING');
  assert.equal(engine.lastAttack.counter, null, 'ห่าง 3 — ดาบตีไม่ถึง');
  assert.equal(engine.lastAttack.push, null);
  assert.equal(far.armor, 0);
  assert.deepEqual(q.pos, { x: 10, y: 4 });
});

test('ปืน GUTS: กระสุนฆ่าเป้าได้ = เป้าหายจากกระดาน ไม่มีตีสวน', () => {
  const p = mkPlayer({ x: 6, y: 4 });
  giveGun(p);
  const t = mkPlayer({ x: 6, y: 5 }, { hp: 1, armor: 0 });
  const nurse = giveAmmo(p, 'nurse');
  engine.setActor(p.id);
  engine.useInventoryItem(p.id, nurse.uid, { targetId: t.id });
  assert.equal(t.alive, false);
  assert.equal(t.pos, null);
  assert.equal(engine.lastAttack.counter, null);
  assert.equal(engine.lastAttack.kill, true);
});
