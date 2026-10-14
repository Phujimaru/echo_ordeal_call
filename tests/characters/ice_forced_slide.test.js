// ถูกย้ายด้วยแรงอื่นลงน้ำแข็ง = ไถลต่อตามสเปก · ถูกดัน = เผยตัว (ผู้ใช้ตัดสิน 2026-10-14 · server/ice.js forcedSlides / revealPushed)
//  แหล่ง: ขยายร่าง Echo/กิงกะดันออก (action.resizeUnit) · Strium Ray ผลัก · ปืนโซระดึง · น้ำวน · ถอยหลังตีสวน (tests/terrain.test.js)
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const Ice = require('../../server/ice.js');
const action = require('../../server/phases/action.js');
const Board = require('../../server/board.js');
const iceSpike = require('../../characters/ice_spike.js');

const realRandom = Math.random;
const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
// list = [[id, characterId, x, y], ...] — ภูมิภาค I (แถว y = 5, 7 โล่งทั้งแถว)
function setup(list, area = 1) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, ch], i) => { engine.players[id] = blank(id, ch, i + 1); });
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setJourneyArea(area);
  engine.placeOnBoard(area);
  engine.setCycleShift(0);
  engine.setRoundNumber(1);
  engine.setShopPos(null);
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.skillPoints = 8; p.skillUsedRound = false; p.shield = 0;
    p.statuses = {}; p.statusAmt = {};
  }
  return engine.players;
}
const vit = (p) => (p.hp || 0) + (p.armor || 0);
const lay = (tiles) => tiles.forEach(([x, y]) => assert.ok(Ice.layIce(x, y, null), `วางน้ำแข็ง ${x},${y}`));
const iceEvents = () => calls.fx.filter((f) => f.event === 'iceFx').flatMap((f) => f.payload.events);
const fxIndex = (event) => calls.fx.findIndex((f) => f.event === event);
const flush = (t, ms = 20000) => { for (let i = 0; i < ms / 100; i++) t.mock.timers.tick(100); };
// Echo 1×1 ที่ (5,5) + B (6,5) + C (5,4) ล้อมไว้ → ขยายเป็น 2×2 ได้มุม (4..5, 5..6) ดัน V ที่ (5,6) ออกไป (6,6) ทางขวา
const GROW = [['E', 'echo', 5, 5], ['B', 'dummy', 6, 5], ['C', 'dummy', 5, 4], ['V', 'dummy', 5, 6]];

const saved = {
  triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash,
  notifyTransform: engine.notifyTransform, sfx: engine.sfx, boardFx: engine.boardFx,
};
const calls = { fx: [], onBoardFx: null };
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = () => {};
  engine.skillFlash = () => {};
  engine.notifyTransform = () => {};
  engine.sfx = () => {};
  engine.boardFx = (event, payload) => { if (calls.onBoardFx) calls.onBoardFx(event, payload); calls.fx.push({ event, payload }); };
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.beforeEach(() => { calls.fx = []; calls.onBoardFx = null; });
test.afterEach(() => { Math.random = realRandom; delete iceSpike.onKill; engine.setGameMode('ffa'); engine.setCycleShift(0); engine.clearPhaseTimer(); });

test('ขยายร่างดันออกลงน้ำแข็ง = ไถลต่อตามทิศที่ถูกดันจนชน · ชนคน = กระเด็นตามกติกาไถล · iceFx ตามหลัง growFx', () => {
  const P = setup([...GROW, ['W', 'dummy', 10, 6]]);
  lay([[6, 6], [7, 6], [8, 6], [9, 6]]);
  engine.resizeUnit(P.E, 2);
  assert.deepEqual(P.E.pos, { x: 4, y: 5 });
  assert.deepEqual(P.V.pos, { x: 9, y: 6 }, 'ไถลจนสุดแนว (ช่องถัดไปมีคน)');
  assert.deepEqual(P.W.pos, { x: 10, y: 6 }, 'คนที่โดนชนกระเด็นไม่ได้ (สิ่งกีดขวาง) = เด้ง');
  const ev = iceEvents();
  assert.deepEqual(ev[0], { kind: 'knock', id: 'V', from: { x: 5, y: 6 }, to: { x: 6, y: 6 } }, 'เลื่อนจากช่องเดิมก่อนไถล');
  assert.equal(ev[1].kind, 'slide');
  assert.deepEqual(ev[1].path.at(-1), { x: 9, y: 6 });
  assert.ok(ev.some((e) => e.kind === 'bump' && e.id === 'W' && e.by === 'V'));
  assert.ok(fxIndex('growFx') >= 0 && fxIndex('growFx') < fxIndex('iceFx'), 'growFx ก่อน iceFx');
});

test('ขยายร่างดันออกไม่ลงน้ำแข็ง = เหมือนเดิม (ไม่มี iceFx)', () => {
  const P = setup(GROW);
  engine.resizeUnit(P.E, 2);
  assert.deepEqual(P.V.pos, { x: 6, y: 6 });
  assert.equal(fxIndex('iceFx'), -1);
});

test('ถูกดันไถลชนหนาม: เสียเท่า Lv + เชื่องช้า · ตาย = เจ้าของหนามเป็นผู้สังหาร (ไม่ใช่ Echo ผู้ดัน)', () => {
  const P = setup([...GROW, ['I', 'ice_spike', 1, 8]]);
  lay([[6, 6], [7, 6]]);
  Ice.placeSpike(8, 6, 'I', 1);
  P.V.hp = 2; P.V.armor = 0;
  const kills = [];
  iceSpike.onKill = (eng, killer, victim) => kills.push([killer.id, victim.id]);
  engine.resizeUnit(P.E, 2);
  assert.equal(P.V.alive, false, 'ดันออก -1 แล้วชนหนาม Lv1 -1');
  assert.equal(P.V.pos, null);
  assert.deepEqual(kills, [['I', 'V']], 'เจ้าของหนามได้เครดิต');
  assert.equal(P.E.echo.kills, 0, 'Echo ไม่ได้การกลืนกิน');
  assert.equal(engine.boardMap().terrain['8,6'], undefined, 'หนาม Lv1 แตก');
  assert.ok(iceEvents().some((e) => e.kind === 'spike' && e.kill));
});

test('เดินไถลชนหนามจนตาย = เจ้าของหนามเป็นผู้สังหาร (ไม่ใช่ผู้ไถลเอง)', () => {
  const P = setup([['D', 'dummy', 1, 5], ['I', 'ice_spike', 1, 8], ['Z', 'dummy', 12, 12]]);
  lay([[2, 5], [3, 5], [4, 5]]);
  Ice.placeSpike(5, 5, 'I', 1);
  P.D.hp = 1; P.D.armor = 0;
  const kills = [];
  iceSpike.onKill = (eng, killer, victim) => kills.push([killer.id, victim.id]);
  engine.setActor('D');
  assert.equal(engine.moveTo('D', 4, 5), true);
  assert.equal(P.D.alive, false);
  assert.deepEqual(kills, [['I', 'D']], 'ต้นตอตอนตาย = เจ้าของหนาม (เดิม = ผู้ไถลเอง)');
});

test('ถูกดันโดยขยายร่าง = เผยตัว: นักบินปริศนาที่ล่องหนปรากฏตัวก่อน growFx ส่งพิกัด', () => {
  const P = setup([['E', 'echo', 5, 5], ['B', 'dummy', 6, 5], ['C', 'dummy', 5, 4], ['V', 'sliver_bullet', 5, 6], ['Z', 'dummy', 12, 12]]);
  P.V.sliver.hidden = true;
  assert.equal(engine.buildStateFor('B').players.find((p) => p.id === 'V').pos, null, 'ก่อนดัน: ศัตรูมองไม่เห็น');
  let hiddenAtFx = null;
  calls.onBoardFx = (event) => { if (event === 'growFx') hiddenAtFx = P.V.sliver.hidden; };
  engine.resizeUnit(P.E, 2);
  assert.equal(hiddenAtFx, false, 'ปรากฏตัวแล้วตอนส่ง growFx');
  const g = calls.fx.find((f) => f.event === 'growFx');
  assert.ok(g.payload.pushed.some((pu) => pu.id === 'V'));
  assert.deepEqual(engine.buildStateFor('B').players.find((p) => p.id === 'V').pos, P.V.pos, 'หลังดัน: ศัตรูเห็นตำแหน่ง');
});

test('ถูกดันเผยตัว: ซ่อนในพุ่มหญ้า = โผล่จนจบเทิร์น (Ice.revealPushed — ทุกจุดที่ผลัก/ดึงเรียกก่อนส่งพิกัด)', () => {
  // ภูมิภาค II: (6,1) เป็นพุ่มหญ้า
  const P = setup([['V', 'dummy', 6, 1], ['B', 'dummy', 12, 12]], 2);
  assert.equal(engine.buildStateFor('B').players.find((p) => p.id === 'V').pos, null, 'ในพุ่ม = ศัตรูมองไม่เห็น');
  Ice.revealPushed(P.V);
  assert.equal(P.V.exposedRound, engine.roundNumber);
  assert.deepEqual(engine.buildStateFor('B').players.find((p) => p.id === 'V').pos, { x: 6, y: 1 });
});

test('Strium Ray ผลักลงน้ำแข็ง = ผลักจบก่อน (hikaruPush) แล้วจังหวะถัดไปค่อยไถลต่อตามทิศลำแสงจนชน', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  // ฮิคารุ 3×3 ที่ (0,6) → ลำแสง x 3..7 แถว 6..8 · B (3,7) ถูกผลักไป (7,7) → น้ำแข็ง (7..9, 7) → ไถลถึง (9,7) ชน W (10,7)
  const P = setup([['H', 'raido_hikaru', 0, 6], ['B', 'dummy', 3, 7], ['W', 'dummy', 10, 7]]);
  P.H.hikaru.ginga = true; P.H.hikaru.strium = true; P.H.statuses.hikaruGinga = 3; P.H.boardSize = 3;
  lay([[7, 7], [8, 7], [9, 7]]);
  engine.setActor('H');
  engine.useSkill('H', 'ultimate', [], { dir: 'right' });
  let pushedAt = null;
  calls.onBoardFx = (event) => { if (event === 'hikaruPush') pushedAt = { ...P.B.pos }; };
  flush(t, 8000);
  assert.deepEqual(pushedAt, { x: 7, y: 7 }, 'ตอนส่ง hikaruPush ยังอยู่ปลายลำแสง (ยังไม่ไถล)');
  assert.deepEqual(P.B.pos, { x: 9, y: 7 });
  assert.deepEqual(P.W.pos, { x: 11, y: 7 }, 'คนที่ถูกชนกระเด็น 1 ช่อง');
  assert.ok(fxIndex('hikaruPush') < fxIndex('iceFx'), 'ไถลตามหลังผลัก');
  const ev = iceEvents();
  assert.equal(ev[0].kind, 'slide', 'ไม่มี knock ซ้ำ (ฉากผลักเล่นไปแล้ว)');
  assert.deepEqual(ev[0].path[0], { x: 7, y: 7 });
  assert.equal(engine.gameState, 'ACTION');
});

test('ปืนโซระดึงลงน้ำแข็ง = ไถลต่อตามทิศที่ถูกดึง (ทแยง) · เลื่อนจากช่องเดิมก่อนแล้วไถล', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  // S (1,5) ยิง B (3,6) ห่าง 3 → ดึงมา (2,5) ทิศ (−1, −1) → น้ำแข็ง (2,5) (1,4) (0,3) → ไถลถึง (0,3)
  const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 3, 6], ['Z', 'dummy', 12, 12]]);
  P.S.sora.myth = true; P.S.sora.gun = true;
  Math.random = () => 0.99;
  lay([[2, 5], [1, 4], [0, 3]]);
  engine.setActor('S');
  engine.action.locked = true;
  assert.equal(engine.attackTarget('S', 'B'), true);
  assert.deepEqual(P.B.pos, { x: 3, y: 6 }, 'ระหว่างฉากตียังไม่ขยับ');
  flush(t, 6000);
  assert.deepEqual(P.B.pos, { x: 0, y: 3 });
  const ev = iceEvents();
  assert.deepEqual(ev[0], { kind: 'knock', id: 'B', from: { x: 3, y: 6 }, to: { x: 2, y: 5 } });
  assert.equal(ev[1].kind, 'slide');
});

test('ปืนโซระดึงแนวตรงลงน้ำแข็ง = ไถลชนโซระเอง (ศัตรูชน = โซระกระเด็น 1 ช่อง ไม่เสียเลือด)', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['S', 'sora_otosumi', 2, 5], ['B', 'dummy', 5, 5], ['Z', 'dummy', 12, 12]]);
  P.S.sora.myth = true; P.S.sora.gun = true;
  Math.random = () => 0.99;
  lay([[3, 5]]);
  engine.setActor('S');
  engine.action.locked = true;
  const before = vit(P.S);
  assert.equal(engine.attackTarget('S', 'B'), true);
  flush(t, 6000);
  assert.deepEqual(P.B.pos, { x: 3, y: 5 });
  assert.deepEqual(P.S.pos, { x: 1, y: 5 });
  assert.equal(vit(P.S), before);
  assert.ok(iceEvents().some((e) => e.kind === 'bump' && e.id === 'S' && e.by === 'B'));
});

test('น้ำวนดันลงน้ำแข็ง = ไถลต่อตามกระแส', () => {
  const P = setup([['A', 'dummy', 0, 0], ['Z', 'dummy', 0, 13]], 4);
  const map = engine.boardMap();
  // หาน้ำวนที่ช่องปลายกระแสสองช่องถัดไปวางน้ำแข็งได้
  let found = null;
  for (const [k, kind] of Object.entries(map.special)) {
    if (kind !== 'whirl') continue;
    const [x, y] = k.split(',').map(Number);
    const v = Board.LINE_DIRS[map.flow[k]];
    const a = { x: x + v[0], y: y + v[1] }, b = { x: x + 2 * v[0], y: y + 2 * v[1] }, c = { x: x + 3 * v[0], y: y + 3 * v[1] };
    if (!engine.tileFree(a.x, a.y) || !engine.tileFree(b.x, b.y) || Board.isIce(map, c.x, c.y)) continue;
    if (Ice.canLay(a.x, a.y) && Ice.canLay(b.x, b.y)) { found = { x, y, a, b }; break; }
  }
  assert.ok(found, 'มีน้ำวนที่ทดสอบได้');
  lay([[found.a.x, found.a.y], [found.b.x, found.b.y]]);
  P.A.pos = { x: found.x, y: found.y };
  action.tileEndEffect(P.A);
  assert.deepEqual(P.A.pos, found.b);
  const ev = iceEvents();
  assert.deepEqual(ev[0], { kind: 'knock', id: 'A', from: { x: found.x, y: found.y }, to: found.a });
  assert.equal(ev[1].kind, 'slide');
});

test('ถอยหลังตีสวนลงน้ำแข็ง = หลังฉากตีไถลต่อจนชน · ชนหนาม = เสียเท่า Lv + เชื่องช้า', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  // A (5,5) ตี B (6,5) → ถอยซ้ายลง (4,5) น้ำแข็ง → ไถลถึง (2,5) → ชนหนาม Lv2 ที่ (1,5)
  const P = setup([['A', 'dummy', 5, 5], ['B', 'dummy', 6, 5], ['I', 'ice_spike', 12, 12]]);
  P.B.counterBack = true;
  Math.random = () => 0.99;
  lay([[4, 5], [3, 5], [2, 5]]);
  Ice.placeSpike(1, 5, 'I', 2);
  engine.setActor('A');
  engine.action.locked = true;
  assert.equal(engine.attackTarget('A', 'B'), true);
  const afterCounter = vit(P.A);
  assert.deepEqual(P.A.pos, { x: 4, y: 5 });
  flush(t, 8000);
  assert.deepEqual(P.A.pos, { x: 2, y: 5 });
  assert.ok(vit(P.A) < afterCounter, 'ชนหนามเสียเลือด');
  const hit = iceEvents().find((e) => e.kind === 'spike' && e.by === 'A');
  assert.equal(hit.dmg, 2, 'ชนหนาม Lv2 = −2');
  assert.ok(iceEvents().some((e) => e.kind === 'slow' && e.id === 'A'));
});
