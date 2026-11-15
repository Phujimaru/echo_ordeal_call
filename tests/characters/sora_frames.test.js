// โซระ โอโตสุมิ — Eagle / Tutle / Orca Frame + บัฟร่างแปลง + โหมด PVE (ผู้ใช้สั่ง 2026-11-15 · GRID_PLAN §7.7)
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const sora = require('../../characters/sora_otosumi.js');
const Visibility = require('../../server/visibility.js');

const realRandom = Math.random;
const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
// แถว y = 5 ของภูมิภาค I เป็นพื้นโล่งทั้งแถว
function setup(list) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, ch], i) => { engine.players[id] = blank(id, ch, i + 1); });
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setJourneyArea(1);
  engine.setCycleShift(0);
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.skillPoints = 8; p.skillUsedRound = false; p.shield = 0;
    p.statuses = {}; p.statusAmt = {};
  }
  return engine.players;
}
const vit = (p) => (p.hp || 0) + (p.armor || 0);
const FULL = 15;
const frame = (p, f) => { p.sora.myth = true; p.sora.frame = f; p.sora.fire = f === 'fire'; };
const flush = (t, ms = 20000) => { for (let i = 0; i < ms / 100; i++) t.mock.timers.tick(100); };
const fxOf = (kind) => calls.fx.filter((f) => f.event === 'soraFx' && f.payload.kind === kind).map((f) => f.payload);

const saved = {
  triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash,
  notifyTransform: engine.notifyTransform, sfx: engine.sfx, boardFx: engine.boardFx, boardFxTo: engine.boardFxTo,
};
const calls = { queue: [], fx: [] };
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = (p, key) => calls.queue.push(key);
  engine.skillFlash = () => {};
  engine.notifyTransform = () => {};
  engine.sfx = () => {};
  engine.boardFx = (event, payload) => calls.fx.push({ event, payload });
  engine.boardFxTo = (ids, event, payload) => calls.fx.push({ event, payload, ids });
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.beforeEach(() => { for (const k of Object.keys(calls)) calls[k] = []; });
test.afterEach(() => { Math.random = realRandom; engine.setGameMode('ffa'); engine.setCycleShift(0); engine.clearPhaseTimer(); });

test('แปลงร่าง: My-Th → Eagle / Tutle / Orca (0 แต้ม · คลิปครั้งแรกต่อเกมของแต่ละ Frame) · ตัวเลือก = Frame อื่น + My-Th + คืนร่าง · ภาพตามร่าง', () => {
  const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 9, 5]]);
  P.S.sora.myth = true;
  for (const [f, cut] of [['eagle', 'soraEagle'], ['tutle', 'soraTutle'], ['orca', 'soraOrca']]) {
    engine.setRoundNumber(engine.roundNumber + 1);
    engine.setActor('S');
    const sp = P.S.skillPoints;
    engine.useSkill('S', 'basic', [], { form: f });
    assert.equal(P.S.sora.frame, f);
    assert.equal(P.S.skillPoints, sp, '0 แต้ม');
    assert.equal(engine.displayImg(P.S), sora.IMG[f]);
    assert.ok(calls.queue.includes(cut));
    const keys = engine.buildStateFor('S').players.find((x) => x.id === 'S').character.basic.choices.map((c) => c.key);
    assert.deepEqual(keys, [...['fire', 'eagle', 'tutle', 'orca'].filter((k) => k !== f), 'myth', 'sora']);
  }
  // กลับ Eagle อีกครั้ง = ไม่มีคลิป
  calls.queue = [];
  engine.setRoundNumber(engine.roundNumber + 1);
  engine.setActor('S');
  engine.useSkill('S', 'basic', [], { form: 'eagle' });
  assert.deepEqual(calls.queue, []);
  // ไม่เสียแต้มตอนจบเทิร์น (ต่างจาก Fire Frame)
  P.S.skillPoints = 3;
  sora.onEndTurn(engine);
  assert.equal(P.S.skillPoints, 3);
  assert.equal(P.S.sora.frame, 'eagle');
});

test('บัฟร่าง: ทุกร่างที่ไม่ใช่มนุษย์ ตีปกติ +1 (PVE +2) · ร่างโซระไม่มี', () => {
  const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 2, 5]]);
  Math.random = () => 0.99;
  assert.equal(engine.attackPowerAgainst(P.S, P.B), 1);
  for (const f of [null, 'fire', 'eagle', 'tutle', 'orca']) {
    frame(P.S, f);
    P.S.sora.gun = true; // ปืน = ไม่มีโบนัสมีด
    assert.equal(engine.attackPowerAgainst(P.S, P.B), 2, `ร่าง ${f || 'My-Th'}`);
  }
  engine.setGameMode('roadtrip');
  assert.equal(engine.attackPowerAgainst(P.S, P.B), 3, 'โหมด PVE +2');
});

test('ค่าสถานะ: Eagle เดิน +2 · Tutle เดิน -1 + เกราะสูงสุด +3 (ออกจากร่างตัดเกราะเกิน) · Orca เดิน +1 / เริ่มบนพื้นเปียก +3', () => {
  const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 9, 5]]);
  frame(P.S, 'eagle');
  assert.equal(engine.baseMovOf(P.S), 6);
  frame(P.S, 'tutle');
  assert.equal(engine.baseMovOf(P.S), 3);
  const base = engine.maxArmorOf(P.S);
  frame(P.S, null);
  assert.equal(engine.maxArmorOf(P.S), base - 3);
  frame(P.S, 'tutle');
  P.S.armor = base;
  engine.setRoundNumber(engine.roundNumber + 1);
  engine.setActor('S');
  engine.useSkill('S', 'basic', [], { form: 'myth' });
  assert.equal(P.S.armor, base - 3, 'ตัดเกราะส่วนเกิน');
  frame(P.S, 'orca');
  assert.equal(engine.baseMovOf(P.S), 5);
  engine.ice.layWet([{ x: 1, y: 5 }]);
  sora.onActorStart(engine, P.S);
  assert.equal(engine.baseMovOf(P.S), 7);
});

test('Eagle Separade: พุ่ง 6×1 ชนคนแรก → รวบศัตรูในระยะ 2 รอบเป้า → เป้า 6 · คนอื่น 5 · หยุดหน้าเป้า · คลิปชนทุกครั้ง', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 6, 5], ['C', 'dummy', 8, 5], ['D', 'dummy', 6, 6], ['E', 'dummy', 11, 5]]);
  frame(P.S, 'eagle');
  Math.random = () => 0.99;
  engine.setActor('S');
  const v = engine.buildStateFor('S').players.find((x) => x.id === 'S');
  assert.equal(v.character.ultimate.name, 'Eagle Separade');
  assert.equal(v.character.ultimate.area.len, 6);
  engine.useSkill('S', 'ultimate', [], { dir: 'right' });
  flush(t, 12000);
  assert.deepEqual(calls.queue, ['soraEagleUlt', 'soraEagleHit']);
  assert.deepEqual(P.S.pos, { x: 5, y: 5 }, 'หยุดหน้าเป้า');
  assert.equal(vit(P.B), FULL - 6);
  assert.equal(vit(P.C), FULL - 5);
  assert.equal(vit(P.D), FULL - 5);
  assert.equal(vit(P.E), FULL, 'นอกระยะ 2');
  assert.deepEqual(P.C.pos, { x: 7, y: 5 }, 'ถูกรวบมาติดเป้า');
  assert.equal(fxOf('eagleStorm').length, 1);
  assert.equal(engine.buildStateFor('S').dash.quiet, true);
  // ครั้งที่สอง: คลิปเปิดไม่เล่น · คลิปชนเล่นทุกครั้ง
  calls.queue = [];
  P.S.skillUsedRound = false; P.S.sora.ultReady = 0; P.S.skillPoints = 8;
  engine.setActor('S');
  engine.useSkill('S', 'ultimate', [], { dir: 'right' });
  flush(t, 12000);
  assert.deepEqual(calls.queue, ['soraEagleHit']);
});

test('Orca Separade: พื้นแห้ง = พุ่ง 6×1 ทิ้งพื้นเปียก · พายุน้ำโดนศัตรูทุกคนในแนวจากเป้า 5 + แต้มสกิล -2 (ไม่พอ = ส่วนต่างเป็นดาเมจ)', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 4, 5], ['C', 'dummy', 6, 5], ['E', 'dummy', 10, 5]]);
  frame(P.S, 'orca');
  Math.random = () => 0.99;
  P.B.skillPoints = 1; P.C.skillPoints = 5;
  engine.setActor('S');
  engine.useSkill('S', 'ultimate', [], { dir: 'right' });
  flush(t, 12000);
  assert.deepEqual(calls.queue, ['soraOrcaUlt', 'soraOrcaHit']);
  assert.deepEqual(P.S.pos, { x: 3, y: 5 });
  assert.equal(vit(P.B), FULL - 6, '5 + ขาดแต้ม 1');
  assert.equal(P.B.skillPoints, 0);
  assert.equal(vit(P.C), FULL - 5);
  assert.equal(P.C.skillPoints, 3);
  assert.equal(vit(P.E), FULL, 'เกินแนว 6');
  assert.ok(engine.ice.wetAt(1, 5) && engine.ice.wetAt(2, 5) && engine.ice.wetAt(3, 5), 'ทิ้งพื้นเปียกตามทาง');
});

test('Orca Separade: ช่องแรกเปียก = ไถลตามพื้นเปียกเกิน 6 ช่องจนชน', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 10, 5]]);
  frame(P.S, 'orca');
  Math.random = () => 0.99;
  engine.ice.layWet([2, 3, 4, 5, 6, 7, 8, 9, 10].map((x) => ({ x, y: 5 })));
  engine.setActor('S');
  engine.useSkill('S', 'ultimate', [], { dir: 'right' });
  flush(t, 12000);
  assert.deepEqual(P.S.pos, { x: 9, y: 5 });
  assert.equal(vit(P.B), FULL - 5 - 0, 'แต้มสกิล 8 พอ');
  assert.equal(P.B.skillPoints, 6);
});

test('Orca: เดินบนพื้นเปียกไม่ไถล + เดินทิ้งพื้นเปียก (ย้อนการเดิน = แห้งคืน) · ร่างอื่นไถล', () => {
  const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 12, 12]]);
  frame(P.S, 'orca');
  engine.ice.layWet([{ x: 3, y: 5 }]);
  engine.setActor('S');
  assert.equal(engine.moveTo('S', 4, 5), true);
  assert.deepEqual(P.S.pos, { x: 4, y: 5 }, 'ไม่ไถลเลยช่อง');
  assert.ok(engine.ice.wetAt(2, 5) && engine.ice.wetAt(4, 5), 'ทิ้งพื้นเปียก');
  engine.undoMove('S');
  assert.equal(engine.ice.wetAt(2, 5), false, 'ย้อนเดิน = แห้ง');
  assert.equal(engine.ice.wetAt(3, 5), true, 'พื้นเปียกเดิมยังอยู่');
});

test('Orca Echo: ปุ่มพิเศษบน HUD (สกิลรองยังเป็น My-Th Edge) · ไม่กินโควตา/ไม่ล็อกเดิน · คลิปทุกครั้ง · มองทะลุ 2 เทิร์นเฉพาะโซระ · คูลดาวน์ 2 เทิร์น', () => {
  const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 9, 5]]);
  frame(P.S, 'orca');
  engine.setActor('S');
  const v = engine.buildStateFor('S').players.find((x) => x.id === 'S');
  assert.match(v.character.secondary.name, /My-Th Edge/, 'สกิลรองไม่เปลี่ยน');
  const btn = sora.hudActions(engine, P.S).find((a) => a.key === 'orcaEcho');
  assert.ok(btn && !btn.disabled, 'มีปุ่ม Orca Echo');
  const r = engine.roundNumber;
  sora.charAction(engine, P.S, 'orcaEcho');
  assert.deepEqual(calls.queue, ['soraOrcaEcho']);
  assert.equal(sora.trueSight(engine, P.S), true);
  assert.equal(engine.action.locked, false, 'ไม่ล็อกการเดิน');
  assert.equal(P.S.skillUsedRound ? 1 : 0, 0, 'ไม่กินโควตา');
  engine.clearPhaseTimer();
  engine.setActor('S');
  engine.useSkill('S', 'secondary', []);
  assert.equal(P.S.sora.gun, true, 'สกิลรอง = สลับอาวุธตามเดิม');
  // มองทะลุล่องหน: เป้าที่ซ่อน (ฮุค stealthed ชั่วคราว) — โซระเห็น · หมดเวลาแล้วไม่เห็น
  const hooks = engine.CHAR_HOOKS;
  hooks.dummy = { stealthed: () => true };
  try {
    assert.equal(Visibility.hiddenFrom(P.S, P.B), false);
    P.S.sora.sightUntil = r;
    assert.equal(Visibility.hiddenFrom(P.S, P.B), true);
  } finally { delete hooks.dummy; }
  engine.setRoundNumber(r + 2);
  engine.setActor('S');
  calls.queue = [];
  assert.equal(sora.hudActions(engine, P.S).find((a) => a.key === 'orcaEcho').disabled, true, 'ติดคูลดาวน์');
  sora.charAction(engine, P.S, 'orcaEcho');
  assert.deepEqual(calls.queue, []);
  engine.setRoundNumber(r + 3);
  engine.setActor('S');
  sora.charAction(engine, P.S, 'orcaEcho');
  assert.deepEqual(calls.queue, ['soraOrcaEcho'], 'คลิปเล่นทุกครั้ง');
  engine.clearPhaseTimer();
  frame(P.S, 'eagle');
  assert.equal(sora.hudActions(engine, P.S), undefined, 'ร่างอื่นไม่มีปุ่ม');
});

test('Tutle Separade: ไถลตามแนวชนคนแรก → ครอบ + ดันไปถึงช่องที่เลือก · ตรึง 2 เทิร์น · คนอื่นตีไม่เข้า · โซระตี = 6 + ผุพัง 2 · กระดองแตก', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 4, 5], ['C', 'dummy', 8, 6]]);
  frame(P.S, 'tutle');
  Math.random = () => 0.99;
  engine.setActor('S');
  const v = engine.buildStateFor('S').players.find((x) => x.id === 'S');
  assert.equal(v.character.ultimate.area.kind, 'tile');
  assert.equal(v.character.ultimate.area.range, 6);
  engine.useSkill('S', 'ultimate', [], { tile: { x: 7, y: 5 } });
  flush(t, 8000);
  assert.deepEqual(calls.queue, ['soraTutleUlt']);
  assert.deepEqual(P.B.pos, { x: 7, y: 5 }, 'ดันไปพร้อมกระดอง');
  assert.equal(P.S.sora.shell.on, 'B');
  assert.ok(P.B.statuses.rooted >= 2, 'ถูกตรึง');
  assert.equal(fxOf('encase').length, 1);
  assert.deepEqual(engine.buildStateFor('S').board.soraShells.map((s) => s.on), ['B']);
  // คนอื่นตีไม่เข้า
  const before = vit(P.B);
  engine.doAttack('C', 'B');
  assert.equal(vit(P.B), before, 'กระดองกัน');
  // โซระตี = คลิปชน → 6 + ผุพัง 2 · กระดองแตก
  P.S.pos = { x: 6, y: 5 };
  engine.setActor('S');
  calls.queue = [];
  assert.equal(engine.attackTarget('S', 'B'), true);
  flush(t, 8000);
  assert.deepEqual(calls.queue, ['soraTutleHit']);
  assert.equal(vit(P.B), before - 6);
  assert.ok(P.B.statuses.decay >= 1, 'ติดผุพัง (นับเทิร์นนี้ด้วย)');
  assert.equal(P.S.sora.shell, null);
  assert.equal(P.B.statuses.rooted, undefined, 'ปล่อยแล้ว');
  assert.equal(fxOf('shellBreak').length, 1);
});

test('Tutle Separade: โยนลงพื้นเปล่า → วาร์ปไปที่กระดอง (ท่าจบ · เดินต่อไม่ได้) · กระดองหายเองหลัง 2 เทิร์น', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 12, 12]]);
  frame(P.S, 'tutle');
  engine.setActor('S');
  engine.useSkill('S', 'ultimate', [], { tile: { x: 5, y: 5 } });
  flush(t, 8000);
  assert.deepEqual({ x: P.S.sora.shell.x, y: P.S.sora.shell.y, on: P.S.sora.shell.on }, { x: 5, y: 5, on: null });
  engine.setActor('S');
  const acts = sora.hudActions(engine, P.S);
  assert.equal(acts[0].key, 'soraWarp');
  assert.equal(acts[0].disabled, false);
  sora.charAction(engine, P.S, 'soraWarp');
  assert.deepEqual(P.S.pos, { x: 5, y: 5 });
  assert.equal(P.S.sora.shell, null);
  assert.equal(engine.action.locked, true);
  assert.equal(fxOf('warp').length, 1);
  // หมดเวลา
  P.S.skillUsedRound = false; P.S.sora.ultReady = 0; P.S.skillPoints = 8;
  engine.setActor('S');
  engine.useSkill('S', 'ultimate', [], { tile: { x: 7, y: 5 } });
  flush(t, 8000);
  const until = P.S.sora.shell.until;
  engine.setRoundNumber(until - 2);
  sora.onEndTurn(engine);
  assert.ok(P.S.sora.shell, 'ยังอยู่เทิร์นแรก');
  engine.setRoundNumber(until - 1);
  sora.onEndTurn(engine);
  assert.equal(P.S.sora.shell, null, 'ครบ 2 เทิร์น');
});

test('โหมด PVE: ท่าไม้ตายทุกท่า ดาเมจ +6 (Mouse Separade 4 → 10)', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 3, 5]]);
  frame(P.S, null);
  Math.random = () => 0.99;
  engine.setGameMode('roadtrip');
  engine.setActor('S');
  engine.useSkill('S', 'ultimate', [], { dir: 'right' });
  flush(t, 8000);
  assert.equal(vit(P.B), FULL - sora.ULT_DMG - sora.PVE_ULT);
});
