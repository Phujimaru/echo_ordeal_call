// เกราะ Mark 42 (ไอเทมร้านค้า) — ผ่าน engine จริง (server.js)
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine, mark42Control } = require('../server.js');
const Mark42 = require('../characters/_mark42.js');

const blank = (id, characterId, position) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId: null, gold: 30,
});
function setup() {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  engine.players.A = blank('A', 'dummy', 1);
  engine.players.B = blank('B', 'dummy', 2);
  engine.players.C = blank('C', 'dummy', 3);
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setGameState('PLAYING');
  engine.setRoundNumber(5);
  engine.placeOnBoard(1);
  for (const p of Object.values(engine.players)) {
    p.locked = false; p.hp = 7; p.armor = 1; p.shield = 0; p.statuses = {}; p.statusAmt = {}; p.inventory = []; p.gold = 30;
    Mark42.resetCombat(p);
  }
  // ใส่ให้ / ระเบิดใส่ / เรียกคืน ต้องยืนติดกัน (GRID_PLAN §8.1): B อยู่ขวา C อยู่บนของ A
  engine.players.A.pos = { x: 5, y: 5 };
  engine.players.B.pos = { x: 6, y: 5 };
  engine.players.C.pos = { x: 5, y: 4 };
  engine.setShopPos({ x: 4, y: 5 }); // ร้านติด A (ซ้าย)
  cutscenes.length = 0;
  return engine.players;
}
const giveSuit = (p) => engine.grantInventoryItem(p, { type: 'mark42', price: 15 });
// ใส่/สั่งชุดได้เฉพาะตาเดินของตัวเอง (GRID_PLAN §8.1) — helper พาเข้าตาของคนนั้นก่อนเสมอ
const use = (p, mode, targetId) => {
  engine.setActor(p.id);
  engine.useInventoryItem(p.id, p.inventory.find((i) => i.type === 'mark42').uid, { mode, targetId });
};
const control = (id, act) => { engine.setActor(id); mark42Control(id, act); };
// ตีปกติ 1 ครั้ง (ท่อดาเมจล้วน ไม่มีกระดาน/ตีสวน)
function attack(by, target) {
  engine.doAttack(by, target);
  engine.clearPhaseTimer();
}

const saved = { triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash };
const cutscenes = [];
test.before(() => {
  // ไม่มีคลิปเข้าคิวจริง = ผลที่รอหลังวีดีโอลงทันที
  engine.triggerCutscene = (p, k) => cutscenes.push(k);
  engine.queueCutscene = (p, k) => cutscenes.push(k);
  engine.skillFlash = () => {};
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.afterEach(() => engine.clearPhaseTimer());

test('ใส่ให้ตัวเอง: เกราะชุด 7 แทนตัวจริง · พลังโจมตี +1 · ภาพเปลี่ยน · หน้าจอแสดงเลือด 0/0', () => {
  const { A, B } = setup();
  giveSuit(A);
  use(A, 'self');
  assert.ok(A.mark42);
  assert.equal(A.inventory.length, 0);
  assert.equal(engine.displayImg(A), Mark42.IMG.suit);
  const st = engine.buildStateFor('A').players.find((p) => p.id === 'A');
  assert.deepEqual([st.hp, st.maxHp, st.armor, st.maxArmor], [0, 0, 7, 7]);
  attack('A', 'B');
  assert.equal(B.hp + B.armor, 8 - 2, 'พลังโจมตี 1 + 1');
  attack('B', 'A');
  assert.equal(A.mark42.armor, 6, 'ชุดรับแทน');
  assert.deepEqual([A.hp, A.armor], [7, 1], 'เลือด/เกราะจริงไม่ถูกแตะ');
});

test('ชุดพังจากการต่อสู้ = กลับร่างเดิม (ดาเมจเกินหายไป) · เจ้าของซื้อใหม่ไม่ได้ 10 เทิร์น', () => {
  const { A } = setup();
  giveSuit(A);
  use(A, 'self');
  engine.dealDirect(A, 20); // แรงมาก + เจาะเกราะ
  assert.equal(A.mark42, null);
  assert.equal(A.alive, true);
  assert.deepEqual([A.hp, A.armor], [7, 1]);
  assert.equal(Mark42.buyLockLeft(engine, A), 11);
  assert.equal(Mark42.canBuy(engine, A), false);
  engine.setRoundNumber(16);
  assert.equal(Mark42.canBuy(engine, A), true);
});

test('สังหารทันทีระหว่างใส่ชุด = แค่ชุดพัง · แพ้จั่ว/สถานะ ลงชุด', () => {
  const { A } = setup();
  giveSuit(A);
  use(A, 'self');
  engine.damageSoft(A);
  A.statuses.hbleed = 2;
  require('../characters/_universal_status').tickBleed(engine, A);
  assert.equal(A.mark42.armor, 5);
  engine.instantDeath(A);
  assert.equal(A.alive, true);
  assert.equal(A.mark42, null);
  assert.equal(A.hp, 7);
});

test('ใส่ให้คนอื่น: คนใส่ถอดเองไม่ได้ · เจ้าของเรียกคืน (เกราะที่เหลือตามมา) / ถอดกลับเข้ากระเป๋า', () => {
  const { A, B } = setup();
  giveSuit(A);
  use(A, 'give', 'B');
  assert.equal(B.mark42.ownerId, 'A');
  assert.equal(A.mark42Owned.wearerId, 'B');
  control('B', 'remove');
  assert.ok(B.mark42, 'คนใส่ถอดเองไม่ได้ (ไม่ใช่เจ้าของ)');
  engine.dealMixed(B, 2);
  assert.equal(B.mark42.armor, 5);
  control('A', 'recall');
  assert.equal(B.mark42, null);
  assert.equal(A.mark42.armor, 5, 'เรียกคืนพร้อมเกราะที่เหลือ');
  assert.deepEqual(cutscenes, ['mark42SuitSome', 'mark42Recall']);
  control('A', 'remove');
  assert.equal(A.mark42, null);
  assert.equal(A.inventory[0].type, 'mark42');
  assert.equal(A.inventory[0].armor, 5);
  assert.equal(Mark42.canBuy(engine, A), false, 'ยังมีชุดในกระเป๋า = ซื้อซ้ำไม่ได้');
});

test('ระเบิด: ใส่ให้แล้วระเบิดทันที 2 (ลดเกราะก่อน) · สั่งระเบิดชุดบนตัวคนอื่น = ชุดพังแล้ว 2 ลงตัวจริง', () => {
  const { A, B, C } = setup();
  giveSuit(A);
  use(A, 'bomb', 'B');
  assert.equal(B.mark42, null);
  assert.deepEqual([B.armor, B.hp], [0, 6]);
  assert.equal(A.inventory.length, 0, 'ชุดถูกใช้ไปแล้ว');
  assert.equal(Mark42.buyLockLeft(engine, A), 0, 'ระเบิดเองไม่ติดคูลดาวน์');

  giveSuit(A);
  use(A, 'give', 'C');
  control('A', 'detonate');
  assert.equal(C.mark42, null);
  assert.deepEqual([C.armor, C.hp], [0, 6]);
  assert.equal(A.mark42Owned, null);
});

test('วีดีโอ: ใส่/ใส่ให้/เรียกคืน ผ่าน triggerCutscene (เต็มครั้งแรกครั้งเดียว) · ระเบิดคิวทุกครั้ง', () => {
  const { A } = setup();
  const calls = [];
  const t0 = engine.triggerCutscene, q0 = engine.queueCutscene;
  engine.triggerCutscene = (p, k) => calls.push('T:' + k);
  engine.queueCutscene = (p, k) => calls.push('Q:' + k);
  try {
    giveSuit(A);
    use(A, 'give', 'B');
    control('A', 'recall');
    control('A', 'remove');
    use(A, 'self');
    control('A', 'remove');
    use(A, 'bomb', 'C');
  } finally { engine.triggerCutscene = t0; engine.queueCutscene = q0; }
  assert.deepEqual(calls, ['T:mark42SuitSome', 'T:mark42Recall', 'T:mark42Suitup', 'Q:mark42Bomb']);
});

test('นอกตาเดินของตัวเอง: ใส่ชุด / สั่งชุดไม่ได้', () => {
  const { A, B } = setup();
  giveSuit(A);
  engine.useInventoryItem('A', A.inventory[0].uid, { mode: 'self' }); // ช่วงจั่วไพ่
  assert.equal(A.mark42 || null, null);
  assert.equal(A.inventory.length, 1);
  use(A, 'give', 'B');
  engine.setActor('B'); // ตาของคนอื่น
  mark42Control('A', 'recall');
  assert.equal(B.mark42.ownerId, 'A', 'เรียกคืนนอกตาตัวเองไม่ได้');
});

test('ใส่ซ้อนไม่ได้ · ซื้อจากร้านได้ชุดเดียว', () => {
  const { A } = setup();
  giveSuit(A);
  use(A, 'give', 'B');
  giveSuit(A); // สมมติได้มาอีกชุด
  use(A, 'give', 'B');
  assert.equal(A.inventory.length, 1, 'B ใส่อยู่แล้ว ใส่ซ้อนไม่ได้');

  const { A: A2 } = setup();
  engine.setShopItems([{ id: 's1', type: 'mark42', price: Mark42.PRICE, sold: false }, { id: 's2', type: 'mark42', price: Mark42.PRICE, sold: false }]);
  engine.setActor('A');
  engine.buyShopItem('A', 's1');
  engine.buyShopItem('A', 's2');
  assert.equal(A2.inventory.filter((i) => i.type === 'mark42').length, 1);
  assert.equal(A2.gold, 5, 'ราคา 25');
});

// ---------- ระยะบนกระดาน (GRID_PLAN §8.1) ----------
test('ระยะ: ใส่ให้ / ระเบิดใส่ ต้องยืนติดกัน · ไม่ติดกัน = ใช้ไม่ได้ (ไม่เสียชุด)', () => {
  const { A, B } = setup();
  B.pos = { x: 7, y: 4 }; // ห่าง A 3 ช่อง
  giveSuit(A);
  use(A, 'give', 'B');
  assert.equal(B.mark42 || null, null);
  use(A, 'bomb', 'B');
  assert.equal(B.hp, 7);
  assert.equal(A.inventory.length, 1, 'ชุดยังอยู่ในกระเป๋า');
  use(A, 'give', 'C'); // C ติดกัน
  assert.equal(engine.players.C.mark42.ownerId, 'A');
});

test('ระยะ: เรียกคืนต้องยืนติดกัน · ถอด / สั่งระเบิด สั่งจากไกลได้ · กระเป๋าเต็ม = ถอดไม่ได้', () => {
  const { A, B, C } = setup();
  giveSuit(A);
  use(A, 'give', 'B');
  B.pos = { x: 9, y: 5 };
  control('A', 'recall');
  assert.equal(B.mark42.ownerId, 'A', 'ไกลเกิน เรียกคืนไม่ได้');
  for (let i = 0; i < 5; i++) A.inventory.push({ uid: `x${i}`, type: 'resist' });
  control('A', 'remove');
  assert.ok(B.mark42, 'กระเป๋าเต็ม ถอดไม่ได้');
  A.inventory.length = 0;
  control('A', 'remove');
  assert.equal(B.mark42, null, 'ถอดจากไกลได้');
  assert.equal(A.inventory[0].type, 'mark42');

  use(A, 'give', 'C');
  C.pos = { x: 12, y: 8 };
  control('A', 'detonate');
  assert.equal(C.mark42, null, 'สั่งระเบิดจากไกลได้');
  assert.equal(C.hp + C.armor, 8 - 2);
});
