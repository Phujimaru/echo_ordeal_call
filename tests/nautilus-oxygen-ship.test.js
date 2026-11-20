// โหมด Nautilus ขั้น 2–3: ถังออกซิเจน (server/fodlan/nautilusO2.js) + เรือ Nautilus (server/fodlan/nautilusShip.js) · GRID_PLAN §8.9
//  ใช้ออกซิเจน 1/2/3 ต่อจบเทิร์นตามความลึก · หมด = เสียหาย 1 (เกราะก่อน · ตายได้) · เติม ฟองอากาศ +4 / เรือเต็มถัง / ถังสำรอง +5 · ค้างข้ามชั้น
//  เรือจอดที่ DOCK = สิ่งกีดขวาง + ร้านค้า (ถังสำรองขายที่นี่) · ปุ่มเรือ: ขับเรือ (แล่น/ลง) · เติมออกซิเจน · ตอร์ปิโด · ไฟฉาย · ออร์แกน (หัวเจาะถอดออก 2026-11-19) · บังพุ่งทะลวง/เพลงวาฬ
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const match = require('../server/match.js');
const Board = require('../server/board.js');
const Fodlan = require('../server/fodlan.js');
const timers = require('../server/timers.js');
const action = require('../server/phases/action.js');
const shop = require('../server/shop.js');
const Th = require('../server/fodlan/thalassa.js');
const O2 = require('../server/fodlan/nautilusO2.js');
const Ship = require('../server/fodlan/nautilusShip.js');
const Map7 = require('../server/fodlan/map7.js');

const K = Board.key;
const realRandom = Math.random;
const realStart = timers.startPhaseTimer;
const noWx = () => 0.99;
function fakeTimers() { timers.startPhaseTimer = (secs) => { match.timeLeft = Math.ceil(secs); }; }

function setup(n = 3, { whale = true, world = 'nautilus' } = {}) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  for (let i = 0; i < n; i++) {
    engine.players['p' + i] = {
      id: 'p' + i, name: 'P' + i, position: i + 1, characterId: 'dummy', alive: true, connected: true,
      cards: [], statuses: {}, statusAmt: {}, seen: {}, inventory: [],
    };
  }
  engine.setGameMode('ffa');
  match.world = world;
  match.nautilusWhale = world === 'nautilus' ? whale : null;
  Math.random = () => 0.99;
  engine.startMatch();
  Math.random = realRandom;
  engine.clearPhaseTimer();
}
const P = (i) => engine.players['p' + i];
const ctx = () => Fodlan.makeCtx();
const o2 = (i) => O2.get(ctx(), P(i));
const fxOf = (kind) => (match.fodlan.s.fx || []).filter((e) => e.kind === kind);
const total = (p) => p.hp + (p.armor || 0);
function placeAll(spots) {
  for (const p of Object.values(engine.players)) p.pos = null;
  spots.forEach((s, i) => { if (s) P(i).pos = { x: s[0], y: s[1] }; });
}
function act(i) {
  engine.clearPhaseTimer();
  match.gameState = 'ACTION';
  match.actorId = 'p' + i;
  match.action = { from: { ...P(i).pos }, moved: false, locked: false };
  P(i).didAttackRound = false;
}
const keys = (i) => Fodlan.hudActions(P(i)).map((a) => a.key);
const btn = (i, key) => Fodlan.hudActions(P(i)).find((a) => a.key === key);
// ปลาวาฬขึ้นกระดานตรงๆ ที่ระยะ s
function surface(s) {
  Object.assign(match.fodlan.whale, { on: true, present: true, left: 3, s, pending: [], calm: false });
  match.fodlan.s.ver = (match.fodlan.s.ver || 0) + 1;
  return Th.bodyNow(ctx());
}

test.beforeEach(() => { fakeTimers(); });
test.afterEach(() => { Math.random = realRandom; timers.startPhaseTimer = realStart; engine.clearPhaseTimer(); });
test.after(() => {
  match.world = 'earth'; match.fodlan = null; match.nautilusWhale = null; engine.setGameMode('ffa');
  for (const id of Object.keys(engine.players)) delete engine.players[id];
});

// ---------- ถังออกซิเจน ----------
test('ถังเต็ม 10 ทุกคน · ส่งให้ HUD (players[].fodlan o2/o2Max) · ใช้ 1/1/2/2/3 ต่อจบเทิร์นตามชั้น · ค้างข้ามชั้น', () => {
  setup(2);
  assert.equal(o2(0), 10);
  assert.deepEqual(Fodlan.playerInfo(P(0)), { o2: 10, o2Max: 10 });
  for (const [stage, use] of [[7, 1], [8, 1], [9, 2], [10, 2], [11, 3]]) {
    match.fodlan.stage = stage;
    O2.set(ctx(), P(0), 10);
    Fodlan.onEndTurn(noWx);
    assert.equal(o2(0), 10 - use, `ด่าน ${stage}`);
  }
  // เปลี่ยนชั้นไม่เติม
  match.fodlan.stage = 7;
  match.legStart = 1;
  O2.set(ctx(), P(0), 4);
  match.roundNumber = 6;
  assert.equal(Fodlan.maybeAdvance(() => {}, () => 0), true);
  assert.equal(Fodlan.stageNow(), 8);
  assert.equal(o2(0), 4);
});

test('ถังหมด = เสียหาย 1 ต่อเทิร์น · เกราะรับก่อน · ตายได้', () => {
  setup(2);
  O2.set(ctx(), P(0), 1);
  P(0).hp = 2; P(0).armor = 1;
  Fodlan.onEndTurn(noWx);
  assert.equal(o2(0), 0);
  assert.equal(P(0).armor, 0, 'เกราะก่อน');
  assert.equal(P(0).hp, 2);
  assert.ok(fxOf('nt_choke').some((e) => e.id === 'p0'));
  Fodlan.onEndTurn(noWx);
  assert.equal(P(0).hp, 1);
  Fodlan.onEndTurn(noWx);
  assert.equal(P(0).alive, false, 'ขาดอากาศจนตาย');
  assert.equal(o2(1), 7, 'คนอื่นแค่ใช้ตามปกติ');
});

test('เติม: จบตาบนฟองอากาศ +4 (ไม่เกิน 10) · ถังออกซิเจนสำรอง +5 · ถังเต็มใช้ถังสำรองไม่ได้ (ไม่เสียของ)', () => {
  setup(2);
  const [hx, hy] = Map7.map.heal[0];
  placeAll([[hx, hy], [0, 15]]);
  O2.set(ctx(), P(0), 3);
  Fodlan.onUnitEnd(P(0));
  assert.equal(o2(0), 7);
  Fodlan.onUnitEnd(P(0));
  assert.equal(o2(0), 10);
  assert.ok(fxOf('nt_refill').some((e) => e.src === 'bubble'));
  // ถังสำรอง
  placeAll([[3, 6], [0, 15]]);
  P(0).inventory = [{ uid: 't1', type: 'o2Tank' }];
  act(0);
  shop.useInventoryItem('p0', 't1');
  assert.equal(P(0).inventory.length, 1, 'ถังเต็ม = ใช้ไม่ได้');
  O2.set(ctx(), P(0), 2);
  shop.useInventoryItem('p0', 't1');
  assert.equal(o2(0), 7);
  assert.equal(P(0).inventory.length, 0);
});

// ---------- เรือ Nautilus ----------
test('เรือจอดที่ DOCK: ช่องเรือ = สิ่งกีดขวาง fd_nt_ship · board.ship · ร้านค้า = เรือ (ของปกติ + ถังสำรอง) ไม่มีแผงร้านอื่น', () => {
  setup(2);
  const d = Map7.DOCK;
  const map = action.boardMap();
  for (let y = d.y; y < d.y + d.h; y++) for (let x = d.x; x < d.x + d.w; x++) {
    assert.equal(map.terrain[K(x, y)], 'fd_nt_ship');
    assert.ok(Board.isObstacle(map, x, y));
  }
  assert.deepEqual(Fodlan.publicInfo().board.ship, { x: 7, y: 0, w: 6, h: 2, light: null, cd: { light: 0, organ: 0 }, driver: null, torpedoUsed: [] });
  shop.maybeMoveShop(); // ต้นเทิร์น
  const list = shop.publicShops();
  assert.equal(list.length, 1, 'ร้านเดียว = เรือ');
  const s = list[0];
  assert.equal(s.kind, 'nautilus');
  assert.equal(s.name, 'นอติลุส');
  assert.deepEqual([s.x, s.y, s.w, s.h], [7, 0, 6, 2]);
  assert.equal(s.building, true);
  assert.equal(s.turnsLeft, 0);
  assert.ok(s.items.some((it) => it.type === 'o2Tank'));
  assert.ok(s.items.some((it) => it.type === 'lifeCrystal') && s.items.some((it) => it.type === 'elemBomb'), 'ของร้านปกติครบ');
  // แท็บร้าน (ผู้ใช้ 2026-11-19): ของเฉพาะเรือ = ship · ของร้านเดิมติดแท็บตามร้าน
  assert.equal(s.items.find((it) => it.type === 'o2Tank').tab, 'ship');
  assert.equal(s.items.find((it) => it.type === 'fortune').tab, 'apoth');
  assert.equal(s.items.find((it) => it.type === 'elemBomb').tab, 'forge');
  assert.equal(s.items.find((it) => it.type === 'lifeCrystal').tab, 'cara');
  assert.ok(s.items.every((it) => it.tab), 'ทุกชิ้นมีแท็บ');
  // ต้นเทิร์นถัดไปเรือไม่ย้าย
  for (let r = 1; r <= 8; r++) { match.roundNumber = r; shop.maybeMoveShop(); }
  assert.equal(shop.publicShops().length, 1);
  assert.equal(shop.publicShops()[0].x, 7);
});

test('ร้านเรือ: ยืนติดเรือ = เปิดร้าน/ซื้อได้ (nt_shop_open) · ไม่ติด = ไม่ได้ · ถังสำรองซื้อแล้วเข้ากระเป๋า', () => {
  setup(2);
  shop.maybeMoveShop();
  placeAll([[6, 0], [0, 15]]);
  const s = shop.shopById('nautilus');
  assert.ok(shop.nearShopOf(P(0), s));
  assert.ok(!shop.nearShopOf(P(1), s));
  act(0);
  shop.viewShop('p0', 'nautilus');
  assert.ok(fxOf('nt_shop_open').some((e) => e.id === 'p0'));
  P(0).gold = 20;
  const tank = s.items.find((it) => it.type === 'o2Tank');
  shop.buyShopItem('p0', 'nautilus', tank.id);
  assert.ok(P(0).inventory.some((it) => it.type === 'o2Tank'));
  assert.equal(P(0).gold, 20 - tank.price);
  // ไม่ติดเรือ = ซื้อไม่ได้
  P(1).gold = 20;
  act(1);
  shop.buyShopItem('p1', 'nautilus', tank.id);
  assert.equal(P(1).gold, 20);
});

test('ถังสำรองขายเฉพาะ Nautilus (ร้าน Fodlan ปกติไม่มี)', () => {
  setup(2, { world: 'fodlan' });
  shop.maybeMoveShop();
  assert.ok(shop.publicShops().length >= 1);
  for (const s of shop.publicShops()) assert.ok(!s.items.some((it) => it.type === 'o2Tank'));
});

test('ปุ่มเรือขึ้นเฉพาะยืนติดเรือ · เติมออกซิเจน = เต็มถัง ใช้แทนการตี (จบตา)', () => {
  setup(2);
  placeAll([[6, 0], [3, 6]]);
  assert.deepEqual(keys(0), ['fd:nt:drive', 'fd:nt:refill', 'fd:nt:torpedo', 'fd:nt:light', 'fd:nt:organ']);
  assert.deepEqual(keys(1), []);
  act(0);
  assert.equal(btn(0, 'fd:nt:refill').disabled, true, 'ถังเต็ม');
  O2.set(ctx(), P(0), 1);
  assert.equal(btn(0, 'fd:nt:refill').disabled, false);
  assert.equal(Fodlan.charAction('p0', 'fd:nt:refill', null), true);
  assert.equal(o2(0), 10);
  assert.equal(match.gameState, 'ATTACKING');
  assert.equal(P(0).didAttackRound, true);
  assert.ok(fxOf('nt_refill').some((e) => e.src === 'ship' && e.id === 'p0'));
  // ตีไปแล้ว = กดปุ่มเรือไม่ได้
  O2.set(ctx(), P(0), 1);
  assert.equal(Fodlan.charAction('p0', 'fd:nt:refill', null), false);
  // ไม่ติดเรือ = ไม่ได้
  act(1);
  O2.set(ctx(), P(1), 1);
  assert.equal(Fodlan.charAction('p1', 'fd:nt:refill', null), false);
});

test('ตอร์ปิโด: แนวตรงจากเรือ · ตัวแรก 3 (เกราะก่อน) · คนละ 1 ลูกต่อชั้น · ชั้นใหม่ได้คืน', () => {
  setup(3);
  placeAll([[13, 1], [9, 5], [9, 8]]);
  act(0);
  const b = btn(0, 'fd:nt:torpedo');
  assert.ok(b.tiles.some((t) => t.x === 9 && t.y === 4), 'แนวคอลัมน์ใต้เรือเลือกได้');
  P(1).hp = 10; P(1).armor = 1;
  const before2 = total(P(2));
  Math.random = () => 0.99;
  assert.equal(Fodlan.charAction('p0', 'fd:nt:torpedo', { x: 9, y: 4 }), true);
  assert.equal(total(P(1)), 8, 'ตัวแรกในแนวโดน 3');
  assert.equal(P(1).armor, 0);
  assert.equal(total(P(2)), before2, 'คนหลังไม่โดน');
  const e = fxOf('nt_torpedo').at(-1);
  assert.equal(e.hit, 'p1');
  assert.deepEqual(e.from, { x: 9, y: 2 });
  assert.deepEqual(e.to, { x: 9, y: 5 });
  assert.deepEqual(e.dir, { x: 0, y: 1 });
  assert.equal(e.side, 'down');
  // ลูกที่สองในชั้นเดียวกัน = ไม่ได้
  act(0);
  assert.equal(btn(0, 'fd:nt:torpedo').disabled, true);
  assert.equal(Fodlan.charAction('p0', 'fd:nt:torpedo', { x: 9, y: 4 }), false);
  assert.deepEqual(Fodlan.publicInfo().board.ship.torpedoUsed, ['p0']);
  // ชั้นใหม่ = ได้คืน
  match.legStart = 1; match.roundNumber = 6;
  Fodlan.maybeAdvance(() => {}, () => 0);
  assert.deepEqual(Fodlan.publicInfo().board.ship.torpedoUsed, []);
});

test('ตอร์ปิโดโดนทาลัสซา = 8 · ฆ่าได้ = หัวใจของท้องทะเล', () => {
  setup(3);
  // หาตำแหน่งปลาวาฬที่ลำตัวตัดแนวตอร์ปิโด
  let line = null;
  for (let s = 0; s < 120 && !line; s += 0.5) {
    surface(s);
    line = Ship.torpedoLines(ctx()).find((l) => action.boardMap().terrain[K(l.cells.at(-1).x, l.cells.at(-1).y)] === 'fd_nt_whale');
  }
  assert.ok(line, 'มีจุดที่ลำตัวตัดแนว');
  const end = line.cells.at(-1);
  placeAll([[6, 0], [0, 15], [19, 15]]);
  act(0);
  const hp = match.fodlan.whale.hp;
  assert.equal(Fodlan.charAction('p0', 'fd:nt:torpedo', { x: end.x, y: end.y }), true);
  assert.equal(match.fodlan.whale.hp, hp - 8);
  assert.equal(fxOf('nt_torpedo').at(-1).hit, 'whale');
  assert.ok(fxOf('whale_hit').some((e) => e.src === 'torpedo' && e.n === 8));
  // ลูกของอีกคน ปิดฉาก
  match.fodlan.whale.hp = 5;
  placeAll([[6, 0], [6, 1], [19, 15]]);
  act(1);
  assert.equal(Fodlan.charAction('p1', 'fd:nt:torpedo', { x: end.x, y: end.y }), true);
  assert.equal(match.fodlan.whale.dead, true);
  assert.equal(match.fodlan.whale.killer, 'p1');
  assert.equal(P(1).statuses.might, 3);
});

test('ขับเรือ: ขึ้นหอบังคับการ · แล่นตามระยะเดิน ลอยข้ามภูมิประเทศ · ชนศัตรู 2 + เบียดออก · ร้าน/ปุ่มเรือใช้จากบนเรือ · ลงเรือ', () => {
  setup(3);
  placeAll([[6, 0], [8, 3], [19, 15]]);
  act(0);
  assert.equal(btn(0, 'fd:nt:drive').disabled, false);
  assert.equal(Fodlan.charAction('p0', 'fd:nt:drive', null), true);
  assert.deepEqual(P(0).pos, { x: 9, y: 0 }, 'ยืนหอบังคับการ');
  assert.equal(Fodlan.publicInfo().board.ship.driver, 'p0');
  assert.ok(keys(0).includes('fd:nt:sail') && keys(0).includes('fd:nt:leave') && !keys(0).includes('fd:nt:drive'));
  assert.ok(shop.nearShopOf(P(0), shop.shopById('nautilus')), 'คนขับซื้อของได้');
  // คนอื่นขับซ้อนไม่ได้
  placeAll([[9, 0], [8, 3], [6, 1]]);
  P(0).pos = { x: 9, y: 0 };
  act(2);
  assert.ok(!keys(2).includes('fd:nt:drive'));
  // แล่นลง 2 ช่อง: ทับ p1 ที่ (8,3)
  act(0);
  const sail = btn(0, 'fd:nt:sail');
  assert.ok(sail.tiles.some((t) => t.x === 9 && t.y === 2));
  const before = total(P(1));
  Math.random = () => 0.99;
  assert.equal(Fodlan.charAction('p0', 'fd:nt:sail', { x: 9, y: 2 }), true);
  const sp = Fodlan.publicInfo().board.ship;
  assert.deepEqual([sp.x, sp.y], [7, 2]);
  assert.deepEqual(P(0).pos, { x: 9, y: 2 });
  assert.equal(total(P(1)), before - 2, 'ศัตรูในทางโดน 2');
  const f = P(1).pos;
  assert.ok(!(f.x >= 7 && f.x < 13 && f.y >= 2 && f.y < 4), 'ถูกเบียดออกจากตัวเรือ');
  assert.equal(match.action.locked, true, 'ใช้การเดินของตา');
  assert.deepEqual([shop.shopById('nautilus').x, shop.shopById('nautilus').y], [7, 2], 'ร้านไปกับเรือ');
  for (let y = 2; y < 4; y++) for (let x = 7; x < 13; x++) assert.equal(action.boardMap().terrain[K(x, y)], 'fd_nt_ship');
  assert.ok(fxOf('nt_sail').length);
  // ยังตี/ใช้ปุ่มเรือได้หลังแล่น
  assert.equal(btn(0, 'fd:nt:light').disabled, false);
  // ลงเรือ ตาถัดไป
  act(0);
  const off = btn(0, 'fd:nt:leave').tiles[0];
  assert.equal(Fodlan.charAction('p0', 'fd:nt:leave', off), true);
  assert.deepEqual(P(0).pos, off);
  assert.equal(Fodlan.publicInfo().board.ship.driver, null);
  // เปลี่ยนชั้น = เรือกลับท่า
  match.legStart = 1; match.roundNumber = 6;
  Fodlan.maybeAdvance(() => {}, () => 0);
  const sp2 = Fodlan.publicInfo().board.ship;
  assert.deepEqual([sp2.x, sp2.y], [Ship.dockOf(8).x, Ship.dockOf(8).y]);
});

test('ไฟฉาย: หมุนทิศที่เลือก ค้างจนเปลี่ยนชั้น · ส่องโดนทาลัสซา = ชะงัก 1 ท่า · คูลดาวน์ 2 · ชั้นมืดในลำแสงมองเห็น', () => {
  setup(3);
  placeAll([[9, 2], [0, 15], [19, 15]]);
  // ลำตัวอยู่ในลำแสงด้านล่าง
  let body = [];
  const beam = new Set(Ship.beamOf(ctx(), 'down').map((t) => K(t.x, t.y)));
  for (let s = 0; s < 120; s += 0.5) { body = surface(s); if (body.some((c) => beam.has(K(c.x, c.y)))) break; }
  match.fodlan.whale.pending = [{ kind: 'zap', at: { x: 0, y: 15 }, tiles: [{ x: 0, y: 15 }] }, { kind: 'song', tiles: [], soft: true }];
  act(0);
  const t = Ship.beamOf(ctx(), 'down')[0];
  assert.equal(Fodlan.charAction('p0', 'fd:nt:light', t), true);
  assert.deepEqual(match.fodlan.whale.pending.map((m) => m.kind), ['song'], 'ท่าแรกถูกยกเลิก');
  const e = fxOf('nt_light').at(-1);
  assert.equal(e.stunned, true);
  assert.deepEqual(e.dir, { x: 0, y: 1 });
  assert.equal(Fodlan.publicInfo().board.ship.light.side, 'down');
  assert.equal(Fodlan.publicInfo().board.ship.cd.light, 2);
  act(0);
  assert.equal(Fodlan.charAction('p0', 'fd:nt:light', t), false, 'คูลดาวน์');
  // ชั้นมืด (ด่าน 9+): ยืนในลำแสง = ไม่ถูกซ่อน · ช่องในลำแสงอยู่ในช่องที่มองเห็น
  assert.equal(Ship.inLight(ctx(), t.x, t.y), false, 'ชั้น 1 ไม่มืด');
  match.fodlan.stage = 9;
  Object.assign(match.fodlan.ship.light, { stage: 9 });
  assert.equal(Ship.inLight(ctx(), t.x, t.y), true);
  assert.ok(require('../server/fodlan/nautilus.js').litKeys(ctx()).includes(K(t.x, t.y)));
});

test('ออร์แกน: ทาลัสซาอยู่ = สงบ (ท่ายกเลิก + เทิร์นหน้าไม่ว่าย) · ไม่อยู่ = คุ้มครอง 1 ให้ตัวเอง · คูลดาวน์ 4', () => {
  setup(3);
  placeAll([[9, 2], [0, 15], [19, 15]]);
  act(0);
  assert.equal(Fodlan.charAction('p0', 'fd:nt:organ', null), true);
  assert.equal(P(0).statuses.guard, 1);
  assert.equal(P(0).statusAmt.guard, 1);
  assert.ok(!P(1).statuses.guard, 'ffa: ไม่ใช่ทีม');
  assert.deepEqual(fxOf('nt_organ').at(-1).buffed, ['p0']);
  act(0);
  assert.equal(btn(0, 'fd:nt:organ').cd, 4);
  // ทาลัสซาอยู่
  match.roundNumber += 4;
  surface(50);
  const s0 = match.fodlan.whale.s;
  match.fodlan.whale.pending = [{ kind: 'song', tiles: [], soft: true }];
  act(0);
  assert.equal(Fodlan.charAction('p0', 'fd:nt:organ', null), true);
  assert.equal(fxOf('nt_organ').at(-1).calm, true);
  assert.deepEqual(match.fodlan.whale.pending, []);
  match.fodlan.s.preRoundDone = null;
  match.gameState = 'PLAYING';
  Fodlan.preRound(() => {});
  assert.equal(match.fodlan.whale.s, s0, 'ไม่ว่าย');
  assert.ok(fxOf('whale_calm').length);
});

test('ตัวเรือบังพุ่งทะลวง/เพลงวาฬ: ยืนติดเรือไม่โดน', () => {
  setup(3);
  surface(50);
  placeAll([[6, 0], [3, 6], [19, 15]]);
  const a = total(P(0)), b = total(P(1));
  match.fodlan.whale.pending = [{ kind: 'song', tiles: [], soft: true }];
  Math.random = () => 0.99;
  match.fodlan.s.preRoundDone = null;
  match.roundNumber = 10; match.gameState = 'PLAYING';
  Fodlan.preRound(() => {});
  assert.equal(total(P(0)), a, 'ติดเรือ = ไม่โดน');
  assert.equal(total(P(1)), b - 1);
  assert.ok(fxOf('whale_dodge').some((e) => e.id === 'p0' && e.ship));
});
