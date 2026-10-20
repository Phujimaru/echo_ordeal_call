// ระบบกลาง: ชั้นมิติ (server/dimension.js) · ยูนิตที่ถูกเรียก (server/summon.js) · เดินทะลุ (Board ghost) · target รูปเฉพาะ (cells)
//  · ฮุค afterActorEnd (พักฉากแล้วไม่ลงผลจบตาซ้ำ) — GAME_SYSTEM §25 · GRID_PLAN §7.13
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const Board = require('../server/board.js');
const Duo = require('../server/duo.js');
const action = require('../server/phases/action.js');
const CHAR_HOOKS = require('../characters/index.js');

const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
function setup(list) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, ch], i) => { engine.players[id] = blank(id, ch, i + 1); });
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setJourneyArea(1);
  engine.setShopPos(null);
  engine.setRoundNumber(2);
  for (const [id, , x, y] of list) { const p = engine.players[id]; p.pos = { x, y }; p.statuses = {}; p.statusAmt = {}; p.skillPoints = 8; }
  return engine.players;
}
const saved = { boardFx: engine.boardFx, sfx: engine.sfx, skillFlash: engine.skillFlash };
test.before(() => { engine.boardFx = () => {}; engine.sfx = () => {}; engine.skillFlash = () => {}; });
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.afterEach(() => engine.clearPhaseTimer());

test('Board ghost: เดินทะลุสิ่งกีดขวาง/คน · เหลือแค่ขอบกระดาน · trailCost ก้าวละ 1', () => {
  const map = Board.mapOf(1);
  const units = [{ id: 'X', x: 3, y: 4, alive: true }];
  const reach = Board.reachable(map, { id: 'A', x: 3, y: 2 }, 3, units, { ghost: true });
  assert.ok(reach.has('3,3'), 'ยืนบนสิ่งกีดขวางได้');
  assert.ok(reach.has('3,5'), 'ทะลุสิ่งกีดขวาง + คน');
  assert.ok(!reach.has('3,6'), 'เกินระยะ');
  assert.equal(reach.get('3,5').d, 3);
  const normal = Board.reachable(map, { id: 'A', x: 3, y: 2 }, 3, units, {});
  assert.ok(!normal.has('3,3') && !normal.has('3,5'));
  const edge = Board.reachable(map, { id: 'A', x: 0, y: 0 }, 2, [], { ghost: true });
  assert.ok([...edge.values()].every((n) => n.x >= 0 && n.y >= 0), 'ไม่ออกนอกกระดาน');
  assert.equal(Board.trailCost(map, { id: 'A', x: 3, y: 2 }, [{ x: 3, y: 2 }, { x: 3, y: 3 }, { x: 3, y: 4 }], units, { ghost: true }), 2);
});

test('ชั้นมิติ: boardUnits แยกชั้น · tileFree ตามชั้นของ selfId · leave = ช่องว่างใกล้สุดบนกระดานหลัก · resolveArea target ข้ามชั้นไม่ได้', () => {
  const P = setup([['A', 'dummy', 2, 7], ['B', 'dummy', 3, 7], ['C', 'dummy', 10, 7]]);
  engine.dim.enter(P.B, 'par:test:1');
  assert.deepEqual(engine.boardUnits('A').map((u) => u.id).sort(), ['A', 'C']);
  assert.deepEqual(engine.boardUnits('B').map((u) => u.id), ['B']);
  assert.equal(engine.boardUnits('*').length, 3);
  assert.equal(engine.tileFree(3, 7, 'A'), true, 'คนคนละชั้นไม่ขวาง');
  assert.equal(engine.tileFree(3, 7, 'B'), true);
  P.A.pos = { x: 3, y: 7 };
  assert.equal(action.resolveArea(P.A, { kind: 'target', range: 3 }, ['B']), null, 'เล็งข้ามชั้นไม่ได้');
  const out = engine.dim.leave(P.B);
  assert.equal(P.B.dim, null);
  assert.ok(out.moved, 'ช่องเดิมมีคนบนกระดานหลัก = ย้าย');
  assert.equal(Board.dist(P.B.pos, { x: 3, y: 7 }), 1);
});

test('target รูปเฉพาะ: area.cells นับจากช่องผู้ใช้ แทนระยะ', () => {
  const P = setup([['A', 'dummy', 5, 7], ['B', 'dummy', 7, 8]]);
  const area = { kind: 'target', range: 9, cells: [[2, 1]] };
  assert.deepEqual(action.resolveArea(P.A, area, ['B']), ['B']);
  P.B.pos = { x: 6, y: 7 };
  assert.equal(action.resolveArea(P.A, area, ['B']), null, 'ระยะ 1 แต่ไม่อยู่ในรูป');
});

test('ยูนิตที่ถูกเรียก: แต้ม/เหรียญใช้ร่วม (คุมได้) · ฝ่าย = เจ้าของ / ตัวเอง · ไม่นับฝ่าย · ไม่ถือไพ่ · ไม่ส่ง socket · ลบตอนเปลี่ยนแผนที่', () => {
  const P = setup([['A', 'dummy', 2, 7], ['B', 'dummy', 10, 7]]);
  const c = engine.summon.spawn(P.A, { kind: 'clone', controlled: true, hp: 1, armor: 1, mov: 3, range: [1, 2], pos: { x: 2, y: 8 } });
  const d = engine.summon.spawn(P.A, { kind: 'double', hp: 3, armor: 2, mov: 5, range: [1, 0], pos: { x: 10, y: 8 } });
  c.skillPoints = 3;
  assert.equal(P.A.skillPoints, 3, 'แต้มร่วม');
  assert.equal(d.skillPoints, 0, 'ตัวเหมือนไม่ร่วม');
  assert.equal(Duo.sideKey(c), 'A');
  assert.equal(Duo.sideKey(d), d.id);
  assert.equal(engine.sameTeam(P.A, c), true);
  assert.equal(engine.sameTeam(P.A, d), false);
  assert.deepEqual([engine.maxHpOf(d), engine.maxArmorOf(d), engine.baseMovOf(c), engine.rangeOf(c)], [3, 2, 3, [1, 2]]);
  assert.equal(Duo.sideCount(), 2, 'ยูนิตที่ถูกเรียกไม่นับเป็นฝ่าย');
  assert.equal(Duo.inGame(c), false);
  assert.deepEqual(Duo.turnUnits(P.A).map((u) => u.id), ['A', c.id]);
  const st = engine.buildStateFor('A');
  assert.equal(st.players.find((p) => p.id === c.id).duoOf, 'A');
  assert.equal(st.players.find((p) => p.id === d.id).summon.kind, 'double');
  // ถูกฆ่า = หายจากกระดาน ไม่มีศพ · state ไม่ส่งระเบียนที่ตายแล้ว
  engine.withEffectSource(P.B, () => engine.instantDeath(d));
  assert.equal(d.alive, false);
  assert.equal(d.pos, null);
  assert.equal(engine.buildStateFor('A').players.find((p) => p.id === d.id), undefined);
  engine.placeOnBoard(1);
  assert.equal(Object.values(engine.players).filter((p) => p.summon).length, 0);
});

test('afterActorEnd: คืนวินาที = ค้างฉาก ATTACKING แล้วมาต่อ · ผลจบตา (onActorEnd / จุดฟื้นฟู) ไม่ลงซ้ำ', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['A', 'dummy', 6, 7], ['B', 'dummy', 10, 7]]);
  P.A.hp = 3;
  const mod = CHAR_HOOKS.funny_valentine;
  const real = mod.afterActorEnd;
  let calls = 0;
  mod.afterActorEnd = (eng, p) => (p.id === 'A' ? (++calls, 2) : 0);
  try {
    engine.setActor('A');
    engine.finishActor();
    assert.equal(engine.gameState, 'ATTACKING');
    assert.equal(P.A.hp, 4, 'จุดฟื้นฟู +1');
    for (let i = 0; i < 25; i++) t.mock.timers.tick(100);
    assert.equal(calls, 1, 'ฮุคเรียกครั้งเดียว');
    assert.equal(P.A.hp, 4, 'ผลของช่องไม่ลงซ้ำ');
    assert.notEqual(engine.actorId, 'A');
  } finally { mod.afterActorEnd = real; }
});

test('ชั้นมิติ: คนละชั้นมองไม่เห็นกัน (ไม่ส่งตำแหน่ง) · มิติเดินทะลุ (หลบสายตา) เห็นทุกคน — ผู้ใช้สั่ง 2026-10-21', () => {
  const P = setup([['A', 'dummy', 2, 7], ['B', 'dummy', 6, 7]]);
  engine.dim.enter(P.B, 'par:x:1');
  assert.equal(engine.hiddenFrom(P.A, P.B), true);
  assert.equal(engine.buildStateFor('A').players.find((p) => p.id === 'B').pos, null, 'คนข้างนอกไม่เห็นอีกมิติ');
  assert.equal(engine.buildStateFor('B').players.find((p) => p.id === 'A').pos, null, 'คนข้างในก็ไม่เห็นข้างนอก');
  engine.dim.enter(P.A, 'par:x:1');
  assert.deepEqual(engine.buildStateFor('A').players.find((p) => p.id === 'B').pos, { x: 6, y: 7 }, 'ชั้นเดียวกันเห็น');
  engine.dim.enter(P.A, 'veil:A', { ghost: true });
  engine.dim.enter(P.B, null);
  assert.equal(engine.hiddenFrom(P.A, P.B), false, 'มองจากมิติหลบสายตาเห็นกระดานหลัก');
  assert.equal(engine.hiddenFrom(P.B, P.A), true, 'กระดานหลักไม่เห็นคนในมิติหลบสายตา');
});

test('ร่างแยก (คุมได้): ซื้อของเข้ากระเป๋า/ใช้เหรียญของเจ้าของ · ตัวเหมือนซื้อไม่ได้ · สายตาระยะใกล้ (summon.sight) เห็นคนในพุ่ม', () => {
  const P = setup([['A', 'dummy', 2, 7], ['B', 'dummy', 12, 12]]);
  P.A.gold = 10; P.A.inventory = [];
  engine.setShopPos({ x: 6, y: 3 });
  engine.setShopItems([{ id: 'shop_9_0', type: 'armor', value: 1, price: 3, sold: false, soldTo: null }]);
  const c = engine.summon.spawn(P.A, { kind: 'clone', controlled: true, hp: 1, armor: 1, mov: 4, range: [1, 2], pos: { x: 5, y: 3 } });
  const d = engine.summon.spawn(P.A, { kind: 'double', hp: 3, armor: 2, mov: 5, range: [1, 0], pos: { x: 7, y: 3 } });
  engine.setActor(d.id);
  engine.buyShopItem(d.id, 'shop_9_0');
  assert.equal(P.A.inventory.length, 0, 'ตัวเหมือนซื้อไม่ได้');
  engine.setActor(c.id);
  engine.buyShopItem(c.id, 'shop_9_0');
  assert.equal(P.A.inventory.length, 1, 'ของเข้ากระเป๋าตัวจริง');
  assert.equal(P.A.gold, 7, 'จ่ายเหรียญตัวจริง');
  // สายตา: ภูมิภาค II มีพุ่มดอกไม้ที่ (6,1)
  engine.placeOnBoard(2);
  engine.setShopPos(null);
  P.A.pos = { x: 12, y: 12 }; P.B.pos = { x: 6, y: 1 };
  const c2 = engine.summon.spawn(P.A, { kind: 'clone', controlled: true, hp: 1, armor: 1, mov: 4, range: [1, 2], pos: { x: 6, y: 4 }, data: { sight: 2 } });
  assert.equal(engine.hiddenFrom(P.A, P.B), true, 'ไกลเกิน 2 = ยังซ่อนในพุ่ม');
  c2.pos = { x: 6, y: 3 };
  assert.equal(engine.hiddenFrom(P.A, P.B), false, 'ร่างแยกเข้าใกล้ (ระยะ 2) = ฝ่ายเจ้าของเห็นเป็นคนปกติ');
  assert.equal(engine.hiddenFrom(c2, P.B), false);
});
