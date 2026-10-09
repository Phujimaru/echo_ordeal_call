// Echo (พิเศษ) — มหึมา / Overwrite / สกิลติดตัว + ขยายร่างบนกระดาน (หลายช่อง · ผลักคน · พังสิ่งกีดขวาง)
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const echo = require('../../characters/echo.js');
const { CHAR_BY_ID } = require('../../characters.js');
const Board = require('../../server/board.js');

const realRandom = Math.random;
const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
// list = [[id, characterId, x, y, teamId?], ...] — ภูมิภาค I: แถว y = 5 โล่งทั้งแถว · เสาคริสตัล (4,4) (9,4) (4,9) (9,9)
function setup(list, mode = 'ffa') {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, ch, , , team], i) => { engine.players[id] = blank(id, ch, i + 1, team || null); });
  engine.setGameMode(mode);
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.placeOnBoard(1);
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.skillPoints = 8; p.skillUsedRound = false; p.shield = 0;
    p.statuses = {}; p.statusAmt = {};
  }
  return engine.players;
}
// ตั้งขยายร่างตรงๆ แล้วปรับขนาดตัวตามเลือดสูงสุด (ข้ามการรอทีละเทิร์น)
function grow(p, stacks) {
  p.echo.stacks = stacks;
  p.hp = engine.maxHpOf(p);
  engine.resizeUnit(p, echo.sizeForHp(engine.maxHpOf(p)));
}
const tick = (p) => { Math.random = () => 0.99; echo.onRoundStartTick(engine, p); Math.random = realRandom; };

const saved = { triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash, boardFx: engine.boardFx };
const fx = [];
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = () => {};
  engine.skillFlash = () => {};
  engine.boardFx = (event, payload) => fx.push({ event, payload });
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.beforeEach(() => { fx.length = 0; });
test.afterEach(() => { Math.random = realRandom; engine.setGameMode('ffa'); engine.clearPhaseTimer(); });

test('ข้อมูล: พลังชีวิต 10 ไม่มีเกราะ · หมวดพิเศษ · ท่าไม้ตายปิดไว้ · สกิลใช้กับตัวเอง 0 แต้ม · เริ่ม 1×1 เดิน 4 ตี 1', () => {
  const ch = CHAR_BY_ID.echo;
  assert.equal(ch.difficulty, 'special');
  assert.equal(ch.ultimate, null);
  assert.deepEqual(ch.basic.area, { kind: 'self' });
  assert.deepEqual(ch.secondary.area, { kind: 'self' });
  assert.equal(ch.basic.cost, 0);
  assert.equal(ch.secondary.cost, 0);
  const P = setup([['E', 'echo', 2, 5], ['B', 'dummy', 8, 5]]);
  assert.equal(engine.maxHpOf(P.E), 10);
  assert.equal(engine.maxArmorOf(P.E), 0);
  assert.equal(P.E.hp, 10);
  assert.equal(P.E.armor, 0);
  assert.equal(engine.sizeOf(P.E), 1);
  assert.equal(engine.baseMovOf(P.E), 4);
  assert.deepEqual(engine.rangeOf(P.E), [1, 1]);
  assert.equal(engine.maxHpOf(P.B), 7, 'ตัวอื่นเท่าเดิม');
});

test('มหึมา: ราชินี 10 เทิร์น + ขยายร่าง 1 ทันที (เลือดสูงสุด +2 ฟื้น 2) · คูลดาวน์ 12 · กดซ้ำระหว่างราชินีไม่ได้', () => {
  const P = setup([['E', 'echo', 2, 5], ['B', 'dummy', 8, 5]]);
  P.E.hp = 7;
  engine.setActor('E');
  engine.useSkill('E', 'basic', []);
  assert.equal(P.E.statuses.echoQueen, 10);
  assert.equal(P.E.echo.stacks, 1);
  assert.equal(engine.maxHpOf(P.E), 12);
  assert.equal(P.E.hp, 9);
  assert.equal(P.E.skillPoints, 8, 'ไม่เสียแต้ม');
  assert.equal(engine.action.locked, true, 'ใช้สกิลแล้วเดินไม่ได้');
  const locks = engine.buildStateFor('E').players.find((p) => p.id === 'E').skillLocks;
  assert.equal(locks.basic.cd, 12);
  P.E.skillUsedRound = false;
  engine.useSkill('E', 'basic', []);
  assert.equal(P.E.echo.stacks, 1, 'กดซ้ำไม่ได้');
});

test('ราชินี: ต้นเทิร์นขยายร่าง +1 จนครบ 10 ระดับ (ใช้ 1 + ต้นเทิร์น 9 ครั้ง) · ขยายร่างอยู่ถาวรหลังราชินีหมด', () => {
  const P = setup([['E', 'echo', 2, 2], ['B', 'dummy', 12, 8]]);
  engine.setActor('E');
  engine.useSkill('E', 'basic', []);
  for (let i = 0; i < 9; i++) {
    P.E.statuses.echoQueen--; // จำลองลูปลดเทิร์นของ endTurn
    tick(P.E);
  }
  assert.equal(P.E.echo.stacks, 10);
  assert.equal(engine.maxHpOf(P.E), 30);
  P.E.statuses.echoQueen--;
  assert.equal(P.E.statuses.echoQueen, 0);
  delete P.E.statuses.echoQueen;
  tick(P.E);
  assert.equal(P.E.echo.stacks, 10, 'ไม่มีราชินี = ไม่เพิ่ม แต่ไม่หาย');
  assert.equal(engine.sizeOf(P.E), 5, 'เลือดสูงสุด 30 = 5×5');
});

test('ขนาดตัวตามเลือดสูงสุด: 15/20/25/30 = 2×2/3×3/4×4/5×5 · ระยะตี 2/2/3/3 · เดินได้น้อยลง', () => {
  assert.equal(echo.sizeForHp(14), 1);
  assert.equal(echo.sizeForHp(16), 2);
  assert.equal(echo.sizeForHp(20), 3);
  assert.equal(echo.sizeForHp(26), 4);
  assert.equal(echo.sizeForHp(30), 5);
  const P = setup([['E', 'echo', 5, 5], ['B', 'dummy', 12, 12]]);
  const want = { 3: [2, [1, 2], 3], 5: [3, [1, 2], 3], 8: [4, [1, 3], 2], 10: [5, [1, 3], 2] };
  for (const [stacks, [size, range, mov]] of Object.entries(want)) {
    grow(P.E, Number(stacks));
    assert.equal(engine.sizeOf(P.E), size, `ขยายร่าง ${stacks}`);
    assert.deepEqual(engine.rangeOf(P.E), range);
    assert.equal(engine.baseMovOf(P.E), mov);
  }
  const pub = engine.buildStateFor('B').players.find((p) => p.id === 'E');
  assert.equal(pub.size, 5);
  assert.equal(pub.smash, true);
});

test('ขยายตัว: ศัตรูในช่องที่ขยายทับถูกผลักออก + เสียหาย 1 (ลดเกราะก่อน) · growFx บอก client', () => {
  const P = setup([['E', 'echo', 5, 5], ['B', 'dummy', 6, 6], ['C', 'dummy', 12, 12]]);
  // ตัวเดิม (5,5) — ขยายเป็น 2×2 ครอบ (5..6, 5..6) หรือมุมอื่นที่ครอบตัวเดิม: เลือกมุมที่ไม่ต้องผลักใคร
  grow(P.E, 3);
  assert.equal(engine.sizeOf(P.E), 2);
  assert.ok(!Board.covers({ ...P.E.pos, size: 2 }, P.B.pos.x, P.B.pos.y), 'มีมุมว่าง = ไม่ผลักใคร');
  // ล้อมไว้ทุกด้านจนทุกมุมต้องทับศัตรู → ถูกผลัก
  const Q = setup([['E', 'echo', 6, 5], ['B', 'dummy', 5, 4], ['C', 'dummy', 7, 4], ['D', 'dummy', 5, 6], ['F', 'dummy', 7, 6]]);
  const armorBefore = Q.B.armor + Q.C.armor + Q.D.armor + Q.F.armor;
  grow(Q.E, 3);
  assert.equal(engine.sizeOf(Q.E), 2);
  const box = { ...Q.E.pos, size: 2 };
  for (const id of ['B', 'C', 'D', 'F']) assert.ok(!Board.covers(box, Q[id].pos.x, Q[id].pos.y), `${id} ไม่ทับตัว Echo`);
  const g = fx.find((f) => f.event === 'growFx' && f.payload.to === 2 && f.payload.pushed.length);
  assert.ok(g, 'growFx มีคนที่ถูกผลัก');
  assert.equal(g.payload.pushed.length, 1, 'ผลักแค่คนที่ขวางมุมที่เลือก');
  assert.equal(g.payload.pushed[0].dmg, 1);
  assert.equal(Q.B.armor + Q.C.armor + Q.D.armor + Q.F.armor, armorBefore - 1, 'เกราะรับก่อน');
});

test('ขยายตัวโหมดทีม: เพื่อนร่วมทีมถูกผลักแต่ไม่เสียเลือด', () => {
  const P = setup([['E', 'echo', 6, 5, 'A'], ['M', 'dummy', 5, 4, 'A'], ['B', 'dummy', 7, 4, 'B'], ['C', 'dummy', 5, 6, 'B'], ['D', 'dummy', 7, 6, 'B']], 'duo');
  const before = Object.fromEntries(['M', 'B', 'C', 'D'].map((id) => [id, P[id].hp + P[id].armor]));
  grow(P.E, 3);
  const g = fx.filter((f) => f.event === 'growFx').pop();
  for (const pu of g.payload.pushed) {
    if (pu.id === 'M') assert.equal(P.M.hp + P.M.armor, before.M, 'เพื่อนไม่เสีย');
  }
  assert.ok(g.payload.pushed.length >= 1);
});

test('ตัวใหญ่โดนตีได้ทุกช่อง · ระยะตีนับจากขอบตัว', () => {
  const P = setup([['E', 'echo', 5, 5], ['B', 'dummy', 8, 6], ['C', 'dummy', 12, 12]]);
  grow(P.E, 5); // 3×3
  assert.equal(engine.sizeOf(P.E), 3);
  const box = { ...P.E.pos, size: 3 };
  // ผู้ตีประชิดยืนติดขอบขวาของตัวไหนก็ได้
  P.B.pos = { x: box.x + 3, y: box.y + 2 };
  engine.setActor('B');
  assert.equal(engine.attackTarget('B', 'E'), true, 'ตีมุมล่างขวาของตัวได้');
  engine.clearPhaseTimer();
  // Echo 3×3 ระยะตี [1, 2]: เป้าห่างขอบ 2 ช่องตีได้ · 3 ช่องไม่ได้
  P.C.pos = { x: box.x + 4, y: box.y };
  engine.setActor('E');
  assert.equal(engine.attackTarget('E', 'C'), true);
  engine.clearPhaseTimer();
  P.C.pos = { x: box.x + 5, y: box.y };
  engine.setActor('E');
  assert.equal(engine.attackTarget('E', 'C'), false);
});

test('ตัวใหญ่ 3×3 เดินพังสิ่งกีดขวาง (ก้าวที่ขอบหน้าชนของ +1) · กดย้อนแล้วของกลับมา · 2×2 เดินทะลุไม่ได้', () => {
  const P = setup([['E', 'echo', 5, 5], ['B', 'dummy', 12, 12]]);
  grow(P.E, 5);
  P.E.pos = { x: 5, y: 5 }; // ตัว 5..7 × 5..7 — เสาคริสตัล (4,4) อยู่ซ้ายบนนอกตัว
  engine.setActor('E');
  // ก้าวขึ้น 1 ช่อง: ตัว 5..7 × 4..6 — ไม่ชนเสา · ก้าวซ้ายอีก 1: ตัว 4..6 × 4..6 — ทับเสา (4,4) = พัง (+1 ก้าว) รวม 3 = เดิน 3 พอดี
  assert.equal(engine.moveTo('E', 4, 4), true);
  assert.equal(engine.boardMap().terrain['4,4'], undefined, 'เสาพังแล้ว');
  assert.ok(fx.some((f) => f.event === 'smashFx' && f.payload.tiles.some((t) => t.x === 4 && t.y === 4)));
  assert.equal(engine.undoMove('E'), true);
  assert.equal(engine.boardMap().terrain['4,4'], 'pillar', 'ย้อนแล้วเสากลับมา');
  // 2×2 ไม่พัง: เดินทับเสาไม่ได้
  grow(P.E, 3);
  P.E.pos = { x: 5, y: 5 };
  engine.setActor('E');
  assert.equal(engine.moveTo('E', 4, 4), false);
});

test('Overwrite: ล้างขยายร่าง+ราชินี · ทุก 2 ระดับ = คูลดาวน์มหึมา −1 และพลังโจมตี +1 (2 เทิร์น) · ฟื้น 5 · ตัวหดกลับ 1×1 · ไม่มีขยายร่าง = กดไม่ได้', () => {
  const P = setup([['E', 'echo', 5, 5], ['B', 'dummy', 12, 12]]);
  engine.setActor('E');
  engine.useSkill('E', 'secondary', []);
  assert.equal(P.E.statuses.echoOverwrite, undefined, 'ไม่มีขยายร่าง = ไม่ทำงาน');
  P.E.echo.giantReady = engine.roundNumber + 10;
  P.E.statuses.echoQueen = 4;
  grow(P.E, 7); // 24 = 3×3
  P.E.hp = 20;
  P.E.skillUsedRound = false;
  engine.setActor('E');
  engine.useSkill('E', 'secondary', []);
  assert.equal(P.E.echo.stacks, 0);
  assert.equal(P.E.statuses.echoQueen, undefined);
  assert.equal(engine.maxHpOf(P.E), 10);
  assert.equal(P.E.hp, 10, 'เลือดถูกตัดเหลือ 10 แล้วฟื้น 5 ก็ยังเต็ม 10');
  assert.equal(P.E.echo.giantReady, engine.roundNumber + 10 - 3);
  assert.equal(P.E.statuses.echoOverwrite, 2);
  assert.equal(P.E.statusAmt.echoOverwrite, 3);
  assert.equal(engine.sizeOf(P.E), 1);
  assert.equal(echo.damageBonus(engine, P.E), 3);
});

test('ติดตัว: ≤4 ระดับ = คุ้มครอง (ตีพื้นฐาน 1 ไม่เข้า) · ≥5 พลังโจมตี +1 · ครบ 10 +2 และโอกาสสังหาร 5% · ต้านสถานะ 20%', () => {
  const P = setup([['E', 'echo', 5, 5], ['B', 'dummy', 12, 12]]);
  tick(P.E);
  assert.equal(P.E.statuses.guard, 1);
  assert.equal(P.E.statusAmt.guard, 1);
  const hp = P.E.hp;
  engine.doAttack('B', 'E');
  assert.equal(P.E.hp, hp, 'คุ้มครองลด 1');
  grow(P.E, 5);
  tick(P.E);
  assert.equal(P.E.statuses.guard, undefined, 'เกิน 4 ระดับ คุ้มครองหาย');
  assert.equal(echo.damageBonus(engine, P.E), 1);
  assert.equal(echo.killChance(P.E), 0);
  grow(P.E, 10);
  assert.equal(echo.damageBonus(engine, P.E), 2);
  assert.equal(echo.killChance(P.E), 0.05);
  // ต้านสถานะ: ทอยต่ำกว่า 20% = ได้
  delete P.E.statuses.resist;
  Math.random = () => 0.1;
  echo.onRoundStartTick(engine, P.E);
  assert.equal(P.E.statuses.resist, 1);
});

test('ครบ 10 ระดับ: ตีปกติทอยโอกาสสังหารโดน = เป้าตกรอบ · การกลืนกินระดับ EX พลังโจมตี +1 ถาวร', () => {
  const P = setup([['E', 'echo', 2, 2], ['B', 'dummy', 12, 12]]);
  grow(P.E, 10);
  Math.random = () => 0.01;
  engine.doAttack('E', 'B');
  assert.equal(P.B.alive, false);
  assert.equal(P.E.echo.kills, 1);
  assert.equal(echo.damageBonus(engine, P.E), 3);
});

test('เปลี่ยนภูมิภาค: ตัวใหญ่ลงใกล้จุดเกิดทั้งตัวโดยไม่ทับใคร · ของใต้ตัว (3×3 ขึ้นไป) พัง', () => {
  const P = setup([['E', 'echo', 5, 5], ['B', 'dummy', 12, 12], ['C', 'dummy', 1, 5]]);
  grow(P.E, 10);
  for (const area of [1, 2, 3, 4, 5, 6, 7]) {
    engine.placeOnBoard(area);
    const box = { ...P.E.pos, size: engine.sizeOf(P.E) };
    assert.equal(engine.sizeOf(P.E), 5, `ภูมิภาค ${area}`);
    assert.ok(box.x >= 0 && box.y >= 0 && box.x + 5 <= 14 && box.y + 5 <= 14);
    for (const id of ['B', 'C']) assert.ok(!Board.covers(box, P[id].pos.x, P[id].pos.y), `ภูมิภาค ${area}: ไม่ทับ ${id}`);
    const map = engine.boardMap();
    for (const t of Board.footprint(box.x, box.y, 5)) assert.equal(map.terrain[Board.key(t.x, t.y)], undefined, `ภูมิภาค ${area}: ใต้ตัวไม่มีสิ่งกีดขวาง`);
  }
});

test('กระดาน (ฟังก์ชันล้วน): dist นับขอบตัว · unitAt ครอบทุกช่อง · reachableBig ไม่ทับศัตรู', () => {
  assert.equal(Board.dist({ x: 0, y: 0 }, { x: 3, y: 4 }), 7, 'ตัว 1 ช่องเหมือนเดิม');
  assert.equal(Board.dist({ x: 2, y: 2, size: 3 }, { x: 6, y: 3 }), 2);
  assert.equal(Board.dist({ x: 2, y: 2, size: 3 }, { x: 3, y: 3 }), 0);
  const units = [{ id: 'E', x: 2, y: 2, size: 2, alive: true }, { id: 'B', x: 6, y: 2, alive: true }];
  assert.equal(Board.unitAt(units, 3, 3).id, 'E');
  const map = Board.mapOf(1);
  const reach = Board.reachable(map, units[0], 3, units);
  for (const n of reach.values()) assert.ok(Board.dist({ x: n.x, y: n.y, size: 2 }, units[1]) > 0, 'ไม่ทับ B');
  assert.ok(reach.has('2,1'), 'ขึ้นบนได้');
  assert.ok(!reach.has('3,2'), 'ขวามีพุ่มไม้ (3,3) ขวางตัว 2×2');
});
