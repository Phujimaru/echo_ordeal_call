// ร้านค้า 3 แห่ง (GRID_PLAN §8.1): ร้านยาเจริญชัย / โรงช่างลุงเริง 1×1 ปรากฏพร้อมกันทุก 6 เทิร์น · พ่อค้าเร่ 2×1 สุ่มโผล่ 25% อยู่ 2 เทิร์น
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const Board = require('../server/board.js');
const match = require('../server/match.js');
const Shop = require('../server/shop.js');

const realRandom = Math.random;
test.beforeEach(() => {
  for (const k of Object.keys(engine.players)) delete engine.players[k];
  match.shops = []; match.shopCycleRound = null; match.merchantCycle = null;
  engine.setGameState('PLAYING');
  engine.setRoundNumber(1);
});
test.afterEach(() => { Math.random = realRandom; engine.clearPhaseTimer(); });

let uid = 0;
function mkPlayer(pos, over = {}) {
  const id = `t${++uid}`;
  const p = Object.assign({
    id, name: id, alive: true, characterId: 'dummy', hp: 5, armor: 2, skillPoints: 0,
    gold: 50, inventory: [], cards: [], locked: false, busted: false,
    statuses: {}, statusAmt: {}, cutsceneShown: {}, seen: {},
    colorTrigger: { blue: 0, red: 0, green: 0, yellow: 0 },
    dmgHp: 0, dmgArmor: 0, pos: { ...pos },
  }, over);
  engine.players[id] = p;
  return p;
}
const kinds = () => match.shops.map((s) => s.kind).sort();
const types = (s) => s.items.map((it) => it.type).sort();

test('ต้นเกม: ร้านยา + โรงช่าง ปรากฏพร้อมกัน 1×1 · ของตามร้าน · ไม่ทับกัน ห่างกันอย่างน้อย 1 ช่อง', () => {
  Math.random = () => 0.99; // พ่อค้าเร่ไม่โผล่
  engine.maybeMoveShop();
  assert.deepEqual(kinds(), ['apoth', 'forge']);
  const apoth = Shop.shopById('apoth'), forge = Shop.shopById('forge');
  assert.deepEqual([apoth.w, apoth.h], [1, 1]);
  assert.deepEqual([forge.w, forge.h], [1, 1]);
  assert.deepEqual(types(apoth), [...Shop.SHOP_ITEMS.apoth].sort());
  assert.deepEqual(types(forge), [...Shop.SHOP_ITEMS.forge].sort());
  assert.ok(Board.dist({ x: apoth.x, y: apoth.y, size: 1 }, { x: forge.x, y: forge.y, size: 1 }) >= 2);
  for (const s of [apoth, forge]) {
    assert.equal(Shop.shopAt(s.x, s.y), s);
    assert.equal(Shop.shopAt(s.x + 1, s.y), null, 'ไม่กินช่องข้างๆ');
  }
  const pub = engine.buildStateFor('none').shops;
  assert.equal(pub.length, 2);
  assert.equal(pub.find((s) => s.kind === 'apoth').name, 'ร้านยาเจริญชัย');
  assert.equal(pub.find((s) => s.kind === 'forge').name, 'โรงช่างลุงเริง');
  assert.deepEqual([pub[0].w, pub[0].h], [1, 1]);
  assert.equal(pub[0].turnsLeft, 6);
});

test('พ่อค้าเร่: สุ่มโผล่ 25% · 2×1 · ของ 2 ชนิด จำนวน 1–2 · อยู่ 2 เทิร์นแล้วจากไป', () => {
  Math.random = () => 0.99;
  engine.maybeMoveShop();
  assert.equal(Shop.shopById('cara'), null);
  engine.setRoundNumber(2);
  Math.random = () => 0.1; // < 25%
  Shop.tickMerchant();
  const cara = Shop.shopById('cara');
  assert.ok(cara, 'พ่อค้าเร่โผล่');
  assert.deepEqual([cara.w, cara.h], [2, 1]);
  assert.equal(Shop.shopAt(cara.x + 1, cara.y), cara, 'กิน 2 ช่องตามแนวนอน');
  assert.equal(Shop.shopAt(cara.x, cara.y + 1), null);
  assert.deepEqual(types(cara), [...Shop.SHOP_ITEMS.cara].sort());
  for (const it of cara.items) assert.ok(it.stockBase >= 1 && it.stockBase <= 2);
  assert.equal(Shop.shopTurnsLeftOf(cara), 2);
  for (const o of match.shops.filter((s) => s !== cara)) for (const dx of [0, 1]) assert.ok(Board.dist({ x: cara.x + dx, y: cara.y, size: 1 }, { x: o.x, y: o.y, size: 1 }) >= 2, 'ไม่ติดร้านอื่น');
  Math.random = () => 0.99;
  engine.setRoundNumber(3);
  Shop.tickMerchant();
  assert.ok(Shop.shopById('cara'), 'เทิร์นที่ 2 ยังอยู่');
  engine.setRoundNumber(4);
  Shop.tickMerchant();
  assert.equal(Shop.shopById('cara'), null, 'ครบ 2 เทิร์น = จากไป');
});

test('พ่อค้าเร่: มาได้ครั้งเดียวต่อรอบภูมิภาค (6 เทิร์น) · ภูมิภาคใหม่มาได้อีก', () => {
  Math.random = () => 0.99;
  engine.setRoundNumber(1);
  engine.maybeMoveShop();
  Math.random = () => 0.1;
  engine.setRoundNumber(2);
  Shop.tickMerchant();
  assert.ok(Shop.shopById('cara'));
  engine.setRoundNumber(4);
  Shop.tickMerchant(); // จากไป · สุ่มผ่านแต่รอบนี้มาแล้ว
  assert.equal(Shop.shopById('cara'), null);
  engine.setRoundNumber(5);
  Shop.tickMerchant();
  assert.equal(Shop.shopById('cara'), null, 'ไม่กลับมาในภูมิภาคเดิม');
  engine.setRoundNumber(7);
  engine.maybeMoveShop(); // ครบ 6 เทิร์น = รอบร้านใหม่
  assert.ok(Shop.shopById('cara'), 'ภูมิภาคใหม่มาได้อีก');
});

test('ซื้อ: ต้องยืนติดร้านนั้น (ขอบไหนก็ได้) · ซื้อของร้านอื่นจากร้านนี้ไม่ได้', () => {
  Math.random = () => 0.99;
  engine.maybeMoveShop();
  const apoth = Shop.shopById('apoth'), forge = Shop.shopById('forge');
  // ยืนติดขอบล่าง
  const p = mkPlayer({ x: apoth.x, y: apoth.y + 1 });
  engine.setGameState('ACTION');
  match.actorId = p.id;
  match.action = { locked: false, canto: false, from: { ...p.pos } };
  assert.ok(Shop.nearShopOf(p, apoth));
  assert.ok(!Shop.nearShopOf(p, forge));
  const boots = forge.items[0];
  Shop.buyShopItem(p.id, apoth.id, boots.id);
  assert.equal(p.inventory.length, 0, 'ของโรงช่างซื้อที่ร้านยาไม่ได้');
  Shop.buyShopItem(p.id, forge.id, boots.id);
  assert.equal(p.inventory.length, 0, 'ไม่ได้ยืนติดโรงช่าง');
  const armor = apoth.items.find((it) => it.type === 'armor');
  Shop.buyShopItem(p.id, apoth.id, armor.id);
  assert.equal(p.inventory.length, 1);
  assert.equal(p.inventory[0].type, 'armor');
});

test('ร้านกันทาง: เดินผ่าน/ยืนบนช่องร้านไม่ได้', () => {
  Math.random = () => 0.99;
  engine.maybeMoveShop();
  const apoth = Shop.shopById('apoth');
  const p = mkPlayer({ x: apoth.x - 1, y: apoth.y });
  const reach = Board.reachable(engine.boardMap(), { id: p.id, x: p.pos.x, y: p.pos.y }, 4, [], { blocked: Shop.shopTiles() });
  assert.ok(Shop.shopTiles().has(Board.key(apoth.x, apoth.y)));
  assert.ok(!reach.has(Board.key(apoth.x, apoth.y)), 'ยืนบนร้านไม่ได้');
});

test('ร้านพัง: ร้านที่โดนแม้ช่องเดียวหายไป · ร้านอื่นอยู่', () => {
  Math.random = () => 0.99;
  engine.maybeMoveShop();
  const apoth = Shop.shopById('apoth');
  const hit = Shop.razeShopsIn(new Set([Board.key(apoth.x, apoth.y)]));
  assert.equal(hit.length, 1);
  assert.equal(hit[0].kind, 'apoth');
  assert.deepEqual(kinds(), ['forge']);
});
