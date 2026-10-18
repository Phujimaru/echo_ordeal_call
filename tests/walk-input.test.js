// เดินด้วยเมาส์ (คลิก) / คีย์บอร์ด (step) บนช่องพิเศษ + ย้อนการเดิน — ผ่าน engine จริง
//  ทุกการเดินคิดจาก "จุดเริ่มตา" บนแผนที่ตอนเริ่มตา (ถอดน้ำแข็ง/ของพังจากการเดินตานี้ออก — action.startMap)
//  คีย์บอร์ด = ลูกศรแบบ Fire Emblem (Board.stepPath): ต่อเส้นทางเดิม · ถอยกลับ = ตัดเส้นทาง · เกินระยะ = ทางสั้นสุด
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const Board = require('../server/board.js');
const Ice = require('../server/ice.js');

const blank = (id, ch, position, teamId = null) => ({
  id, name: id, position, characterId: ch, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
// list = [[id, characterId, x, y, teamId?]] · คนแรกได้เดิน
function setup(area, list, mode = 'ffa') {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, ch, , , team], i) => { engine.players[id] = blank(id, ch, i + 1, team || null); });
  engine.setGameMode(mode);
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.placeOnBoard(area);
  engine.setShopPos(null);
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.hp = engine.maxHpOf(p); p.armor = 0; p.shield = 0; p.statuses = {}; p.statusAmt = {}; p.skillPoints = 8;
  }
  engine.setActor(list[0][0]);
  return engine.players;
}
const step = (id, x, y) => engine.moveTo(id, x, y, { step: true });
const iceAt = (x, y) => engine.boardMap().special[`${x},${y}`] === 'ice';
const fxEvents = () => calls.fx.filter((f) => f.event === 'iceFx').flatMap((f) => f.payload.events);

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
test.afterEach(() => { engine.setGameMode('ffa'); engine.clearPhaseTimer(); });

test('Ice Spike เดินตรงด้วยคีย์บอร์ดได้ครบระยะ (ทางที่เพิ่งเดินเป็นน้ำแข็งไม่ขวาง) · ทุกช่องที่เดินเป็นน้ำแข็ง', () => {
  const P = setup(1, [['I', 'ice_spike', 1, 5], ['B', 'dummy', 12, 9]]);
  for (const x of [2, 3, 4, 5]) assert.equal(step('I', x, 5), true, `ก้าวไป x=${x}`);
  assert.deepEqual(P.I.pos, { x: 5, y: 5 });
  assert.equal(engine.action.locked, false, 'ไม่ไถล');
  for (const x of [1, 2, 3, 4, 5]) assert.ok(iceAt(x, 5), `ช่อง ${x},5`);
  assert.equal(step('I', 6, 5), false, 'เกินระยะเดิน 4');
  assert.deepEqual(engine.action.path, [{ x: 4, y: 5 }, { x: 5, y: 5 }], 'ภาพเดิน = ก้าวล่าสุด');
  // วางน้ำแข็งเฉพาะช่องใหม่ (ช่องเดิมไม่เล่นซ้ำ)
  const lays = fxEvents().filter((e) => e.kind === 'lay');
  assert.deepEqual(lays[lays.length - 1].tiles, [{ x: 5, y: 5 }]);
});

test('Ice Spike ถอยกลับทับทางตัวเองด้วยคีย์บอร์ด = ไม่ไถล · ตัดเส้นทาง (น้ำแข็งช่องที่ถอยออกหาย) · ถึงจุดเริ่ม = ย้อน', () => {
  const P = setup(1, [['I', 'ice_spike', 1, 5], ['B', 'dummy', 12, 9]]);
  step('I', 2, 5); step('I', 3, 5); step('I', 4, 5);
  assert.equal(step('I', 3, 5), true);
  assert.deepEqual(P.I.pos, { x: 3, y: 5 });
  assert.equal(engine.action.locked, false);
  assert.ok(!iceAt(4, 5), 'ช่องที่ถอยออกไม่เป็นน้ำแข็งแล้ว');
  assert.ok(iceAt(3, 5));
  assert.deepEqual(engine.action.trail, [{ x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }]);
  // เดินต่อแนวใหม่ได้ (ก้าวรวมยังไม่เกิน 4)
  assert.equal(step('I', 3, 6), true);
  assert.equal(step('I', 3, 7), true);
  assert.equal(step('I', 3, 8), false, 'ทางเดิมยาว 4 แล้ว และไม่มีทางอื่นที่สั้นกว่า');
  // ถอยถึงจุดเริ่ม = ย้อนการเดิน (น้ำแข็งหายหมด)
  for (const [x, y] of [[3, 6], [3, 5], [2, 5], [1, 5]]) assert.equal(step('I', x, y), true);
  assert.equal(engine.action.moved, false);
  for (const x of [1, 2, 3, 4]) assert.ok(!iceAt(x, 5), `ช่อง ${x},5`);
});

test('คลิกหลังเดิน (คลิก/คีย์บอร์ด) = เดินใหม่จากจุดเริ่มตา · Ice Spike: น้ำแข็งของทางเก่าหาย ทางใหม่เป็นน้ำแข็ง', () => {
  const P = setup(1, [['I', 'ice_spike', 1, 5], ['B', 'dummy', 12, 9]]);
  step('I', 2, 5); step('I', 3, 5);
  assert.equal(engine.moveTo('I', 1, 7), true);
  assert.deepEqual(P.I.pos, { x: 1, y: 7 });
  assert.ok(!iceAt(2, 5) && !iceAt(3, 5), 'ทางเก่าหาย');
  assert.ok(iceAt(1, 5) && iceAt(1, 6) && iceAt(1, 7));
  assert.equal(engine.action.locked, false, 'ไม่ไถลทางที่ตัวเองเพิ่งวาง');
  // คลิกช่องจุดเริ่ม = ย้อน
  assert.equal(engine.moveTo('I', 1, 5), true);
  assert.equal(engine.action.moved, false);
  assert.ok(!iceAt(1, 6));
  // คลิกแล้วเดินต่อด้วยคีย์บอร์ด = ต่อจากเส้นทางที่คลิก
  assert.equal(engine.moveTo('I', 3, 5), true);
  assert.equal(step('I', 4, 5), true);
  assert.deepEqual(engine.action.trail.map((t) => `${t.x},${t.y}`), ['1,5', '2,5', '3,5', '4,5']);
  assert.equal(step('I', 5, 5), true);
  assert.equal(step('I', 6, 5), false);
});

test('น้ำแข็งที่มีอยู่ก่อนตานี้ (ธารน้ำแข็งเก่า) ยังไถลตามปกติ ทั้งคลิกและคีย์บอร์ด', () => {
  const P = setup(1, [['I', 'ice_spike', 1, 5], ['B', 'dummy', 12, 9]]);
  Ice.layIce(3, 5, null); Ice.layIce(4, 5, null);
  step('I', 2, 5);
  assert.equal(step('I', 3, 5), true);
  assert.deepEqual(P.I.pos, { x: 4, y: 5 }, 'ไถลถึงปลายแนว');
  assert.equal(engine.action.locked, true);
  assert.equal(engine.undoMove('I'), false, 'ไถลแล้วย้อนไม่ได้');
});

test('คีย์บอร์ดเข้าน้ำแข็ง (ภูมิภาค VI): ระยะเดินเหลือ 1 ก็ก้าวเข้าแล้วไถลได้ · client คิดได้เหมือนกัน (stepPath)', () => {
  const P = setup(6, [['A', 'dummy', 5, 3], ['B', 'dummy', 13, 6]]);
  P.A.statuses.slow = 2; // เชื่องช้า −1
  const map = engine.boardMap(), unit = { id: 'A', x: 5, y: 3 };
  const mov = engine.movOf(P.A);
  assert.ok(mov >= 1);
  assert.deepEqual(Board.stepPath(map, unit, 1, [], null, { x: 4, y: 3 }), [{ x: 5, y: 3 }, { x: 4, y: 3 }]);
  assert.equal(step('A', 4, 3), true);
  assert.deepEqual(P.A.pos, { x: 0, y: 3 });
  assert.equal(engine.action.locked, true);
});

test('คีย์บอร์ดผ่านทรายดูด: ก้าวเข้าแล้วก้าวต่อจากทรายดูดไม่ได้ (ต่อเส้นทางไม่ได้) — ถ้ามีทางอื่นถึงช่องนั้นในระยะ = ใช้ทางนั้น', () => {
  // ภูมิภาค V: ทรายดูดแนวตั้ง (2,4)…(2,7) · A ยืน (3,4)
  const map = Board.MAPS[5];
  assert.equal(Board.specialAt(map, 2, 4), 'quicksand');
  const unit = { id: 'A', x: 3, y: 4 };
  const trail = [{ x: 3, y: 4 }, { x: 2, y: 4 }];
  assert.equal(Board.trailCost(map, unit, [...trail, { x: 1, y: 4 }], []), Infinity);
  // (1,4) อ้อมได้ใน 4 ก้าว? (3,4)→(3,3)→(2,3)? (2,3) เป็นเนินทราย — ไปไม่ถึงในระยะ 2
  assert.equal(Board.stepPath(map, unit, 2, [], trail, { x: 1, y: 4 }), null);
  // (2,5) ถึงได้ทางอื่นใน 2 ก้าว ((3,4)→(3,5)→(2,5))
  assert.deepEqual(Board.stepPath(map, unit, 2, [], trail, { x: 2, y: 5 }), [{ x: 3, y: 4 }, { x: 3, y: 5 }, { x: 2, y: 5 }]);
});

test('stepPath: ผ่านเพื่อนได้แต่หยุดทับไม่ได้ · ศัตรูขวาง · ช่องค่าเดิน 2 นับครบ', () => {
  const map = Board.MAPS[4]; // (2,6) น้ำตื้น ก้าว 2
  const isAlly = (a, b) => b.id === 'F';
  const units = [{ id: 'A', x: 2, y: 4, alive: true }, { id: 'F', x: 2, y: 5, alive: true }];
  const unit = { id: 'A', x: 2, y: 4 };
  assert.equal(Board.trailCost(map, unit, [{ x: 2, y: 4 }, { x: 2, y: 5 }], units, { isAlly }), Infinity, 'หยุดทับเพื่อนไม่ได้');
  assert.equal(Board.trailCost(map, unit, [{ x: 2, y: 4 }, { x: 2, y: 5 }, { x: 2, y: 6 }], units, { isAlly }), 3, 'ผ่านเพื่อน 1 + น้ำตื้น 2');
  assert.equal(Board.trailCost(map, unit, [{ x: 2, y: 4 }, { x: 2, y: 5 }, { x: 2, y: 6 }], units), Infinity, 'ศัตรูขวาง');
});

test('พื้นเปียก (แจกันของเอมิลิโกะ): คีย์บอร์ดก้าวเข้า = ไถลจนสุดแนว · คลิกผ่าน = ไถลเหมือนน้ำแข็ง · ย้อนไม่ได้หลังไถล', () => {
  const P = setup(1, [['A', 'dummy', 1, 5], ['B', 'dummy', 12, 9]]);
  Ice.layWet([{ x: 3, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 }]);
  assert.equal(step('A', 2, 5), true);
  assert.equal(step('A', 3, 5), true);
  assert.deepEqual(P.A.pos, { x: 5, y: 5 }, 'ไถลถึงปลายพื้นเปียก');
  assert.equal(engine.action.locked, true);
  assert.equal(engine.undoMove('A'), false);
  // คลิก: เส้นทางผ่านพื้นเปียก = ไถล (ตาใหม่)
  setup(1, [['A', 'dummy', 1, 5], ['B', 'dummy', 12, 9]]);
  Ice.layWet([{ x: 3, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 }]);
  const reach = Board.reachable(engine.boardMap(), { id: 'A', x: 1, y: 5 }, 4, []);
  assert.equal(reach.get('5,5').d, 2);
  assert.equal(engine.moveTo('A', 5, 5), true);
  assert.equal(engine.action.slid, true);
  assert.ok(Ice.wetAt(4, 5), 'เดินผ่านไม่ทำให้พื้นแห้ง');
});

test('Ice Spike เดินแล้วย้อน ไม่ลบพื้นเปียก/น้ำแข็งที่มีอยู่ก่อนตานี้', () => {
  setup(1, [['I', 'ice_spike', 1, 5], ['B', 'dummy', 12, 9]]);
  Ice.layIce(1, 7, null);
  step('I', 1, 6);
  assert.equal(engine.moveTo('I', 3, 5), true);
  assert.equal(engine.undoMove('I'), true);
  assert.ok(iceAt(1, 7), 'น้ำแข็งเดิมยังอยู่');
  assert.ok(!iceAt(1, 6) && !iceAt(2, 5) && !iceAt(3, 5) && !iceAt(1, 5));
});

test('stepPath: ร่างของตัวที่ล้ม (ระบบคู่ — opts.hop) เดินข้ามได้ หยุดทับไม่ได้', () => {
  const map = Board.MAPS[1];
  const hop = new Set(['2,5']);
  const opts = { blocked: hop, hop };
  const unit = { id: 'A', x: 1, y: 5 };
  assert.equal(Board.stepPath(map, unit, 4, [], null, { x: 2, y: 5 }, opts), null, 'ก้าวลงร่างไม่ได้');
  assert.equal(Board.trailCost(map, unit, [{ x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }], [], opts), 2, 'ข้ามร่าง');
});
