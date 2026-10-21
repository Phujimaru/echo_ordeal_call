// ซึนาชิ ทาคุโตะ (takuto) — ร่างคน/ทาวเบิร์น · ดาบอันเจิดจรัด · ดาบประกายแสง · ทาวววว มิสไซล์ / ฉันยังมองเห็นอยู่
//  · ห่วงเวลาซีโร่ 5% (+45%) · ไม่โดนผลเสีย · พุ่งต้นตาเดิน · เฟส 4 ฟื้น 3 · ช่วงมิติพังทลาย 5 เทิร์น (GRID_PLAN §7.16)
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const takuto = require('../../characters/takuto.js');
const { CHAR_BY_ID } = require('../../characters.js');
const Zero = require('../../server/zeroTime.js');
const Board = require('../../server/board.js');
const draw = require('../../server/phases/draw.js');
const match = require('../../server/match.js');
const timers = require('../../server/timers.js');

const realRandom = Math.random;
const blank = (id, characterId, position) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId: null,
});
// ตัวจับเวลาของเฟส = เก็บ callback แล้วเรียกเองจนฉากจบ (ฉากตี / จังหวะพักของสกิล / ฉากห่วงเวลา)
//  หยุดเมื่อกลับเข้าตาเดิน (ACTION) หรือตาของคนนั้นจบ — ไม่ไหลไปเทิร์นถัดไป · max = จำนวน callback สูงสุด
function drain(fn, max = 20) {
  const orig = timers.startPhaseTimer;
  const fires = [];
  timers.startPhaseTimer = (s, cb) => { fires.push(cb); };
  try {
    const actor = match.actorId;
    const r = fn();
    for (let i = 0; i < max && fires.length; i++) {
      if (match.gameState === 'ACTION' || match.gameState === 'GAMEOVER') break;
      if (actor && match.actorId !== actor) break;
      fires.shift()();
    }
    return r;
  } finally { timers.startPhaseTimer = orig; engine.clearPhaseTimer(); }
}
// เข้าห่วงเวลาซีโร่ (เทิร์น 10) → ต้นเทิร์นแรกข้างใน = ทาคุโตะแปลงร่าง → วางตำแหน่งตามที่ให้ (สนามซีโร่โล่งทั้งผืน ยกเว้น 4 มุม)
function setup(list, { zero = true } = {}) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, ch], i) => { engine.players[id] = blank(id, ch, i + 1); });
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setCycleShift(0);
  if (zero) {
    engine.setRoundNumber(9);
    Zero.enter();
    engine.clearPhaseTimer();
    if (match.zeroScene) match.zeroScene.active = false;
    draw.dealRound();
    engine.clearPhaseTimer();
  } else engine.setRoundNumber(4);
  match.shopPos = null;
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.skillUsedRound = false; p.shield = 0; p.statuses = {}; p.statusAmt = {}; p.nightTaxTier = null;
    p.skillPoints = 8; p.hp = 7; p.armor = 3;
  }
  return engine.players;
}
const sword = (id, form) => engine.useSkill(id, 'basic', [], { form });
const vit = (p) => p.hp + p.armor;
const fxOf = (kind) => calls.fx.filter((f) => f.event === 'takutoFx' && f.payload.kind === kind).map((f) => f.payload);
function breakAllSeals(by = null) {
  for (const s of match.zero.seals) s.broken = true;
  match.zero.pending.push({ i: 3, by });
  drain(() => Zero.runPendingBreak(() => {}));
  if (match.zeroScene) match.zeroScene.active = false;
}

const saved = {
  triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash,
  notifyTransform: engine.notifyTransform, sfx: engine.sfx, boardFx: engine.boardFx,
};
const calls = { fx: [], sfx: [], clips: [] };
test.before(() => {
  engine.triggerCutscene = (p, key) => calls.clips.push(key);
  engine.queueCutscene = (p, key) => calls.clips.push(key);
  engine.skillFlash = () => {};
  engine.notifyTransform = () => {};
  engine.sfx = (s) => calls.sfx.push(s);
  engine.boardFx = (event, payload) => calls.fx.push({ event, payload });
});
test.after(() => { Object.assign(engine, saved); Zero.reset(); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.beforeEach(() => { for (const k of Object.keys(calls)) calls[k] = []; });
test.afterEach(() => { Math.random = realRandom; engine.clearPhaseTimer(); match.cutsceneQueue.length = 0; match.afterCutscene = []; match.skillBeats = []; Zero.reset(); });

test('ข้อมูล: พิเศษ · unique · เดิน 5 · ราคา 2/4/6 · พื้นที่สกิล · คำอธิบายไม่มีจังหวะไพ่', () => {
  const ch = CHAR_BY_ID.takuto;
  assert.equal(ch.name, 'ซึนาชิ ทาคุโตะ');
  assert.equal(ch.difficulty, 'special');
  assert.equal(ch.unique, true);
  assert.equal(ch.mov, 5);
  assert.deepEqual([ch.basic.cost, ch.secondary.cost, ch.ultimate.cost], [2, 4, 6]);
  assert.deepEqual(ch.secondary.area, takuto.FLASH_AREA);
  assert.deepEqual(ch.ultimate.area, takuto.MISSILE_AREA);
  for (const t of ['basic', 'secondary', 'ultimate']) assert.doesNotMatch(ch[t].desc, /ก่อนเปิดไพ่|ไพ่แตก/);
});

test('ร่างคน: เดิน 5 ตัว 1×1 · ใช้สกิลไม่ได้เลย (ไม่เสียแต้ม) · ปุ่มล็อกทุกช่อง', () => {
  const P = setup([['T', 'takuto', 3, 7], ['B', 'dummy', 9, 7]], { zero: false });
  engine.setActor('T');
  assert.equal(engine.baseMovOf(P.T), 5);
  assert.equal(engine.sizeOf(P.T), 1);
  sword('T', 'emerald');
  engine.useSkill('T', 'ultimate', [], { dir: 'right' });
  assert.equal(P.T.skillPoints, 8);
  assert.ok(!P.T.statuses.takutoEmerald);
  const locks = engine.buildStateFor('T').players.find((p) => p.id === 'T').skillLocks;
  assert.ok(locks.basic.locked && locks.secondary.locked && locks.ultimate.locked);
});

test('ห่วงเวลาซีโร่เปิดอยู่: 5% · มีทาคุโตะที่ยังอยู่ +45% (ตายแล้วหาย)', () => {
  const P = setup([['T', 'takuto', 3, 7], ['B', 'dummy', 9, 7]], { zero: false });
  assert.equal(Zero.ZERO_ENABLED, true);
  assert.equal(Zero.ZERO_CHANCE, 5);
  assert.equal(Zero.chance(), 50);
  P.T.alive = false;
  assert.equal(Zero.chance(), 5);
  P.T.alive = true;
  engine.setRoundNumber(9);
  Math.random = () => 0.49;
  assert.equal(Zero.maybeEnter(), true, 'ทอย 49% ผ่าน (โอกาส 50%)');
  engine.clearPhaseTimer();
});

test('เข้าห่วงเวลา: แปลงร่างทาวเบิร์น 3×3 · คลิปแปลงร่าง · ไม่โดนกัดกิน/ล็อกท่าไม้ตาย', () => {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  engine.players.T = blank('T', 'takuto', 1); engine.players.B = blank('B', 'dummy', 2);
  engine.setGameMode('ffa'); engine.startMatch(); engine.clearPhaseTimer();
  engine.setRoundNumber(9);
  Zero.enter(); engine.clearPhaseTimer();
  draw.dealRound(); engine.clearPhaseTimer();
  const P = engine.players;
  assert.equal(P.T.takuto.form, 'tauburn');
  assert.equal(engine.sizeOf(P.T), 3);
  assert.ok(calls.clips.includes(takuto.CUT.tauburn));
  assert.equal(fxOf('tauburn').length, 1);
  assert.equal(Zero.ultLocked(P.T), false);
  assert.equal(Zero.ultLocked(P.B), true);
  const t0 = vit(P.T), b0 = vit(P.B);
  Zero.onEndTurn();
  assert.equal(vit(P.T), t0, 'ทาคุโตะไม่ถูกกัดกิน');
  assert.equal(vit(P.B), b0 - 1);
  assert.equal(engine.buildStateFor('T').players.find((p) => p.id === 'T').skillLocks.ultimate.locked, false);
});

test('ดาบอันเจิดจรัด: 2 แต้ม · ไม่กินโควตา · ยังเดินได้ · เรียกซ้ำไม่ได้ · อยู่ 5 เทิร์น · แซฟไฟร์ = ตีทั้งด้าน', () => {
  const P = setup([['T', 'takuto', 5, 5], ['B', 'dummy', 10, 10]]);
  engine.setActor('T');
  sword('T', 'emerald');
  assert.equal(P.T.skillPoints, 6);
  assert.equal(P.T.statuses.takutoEmerald, 5);
  assert.equal(P.T.skillUsedRound, false);
  assert.equal(engine.action.locked, false);
  sword('T', 'emerald');
  assert.equal(P.T.skillPoints, 6, 'เรียกซ้ำไม่ได้');
  sword('T', 'sapphire');
  assert.equal(P.T.skillPoints, 4);
  assert.equal(engine.attackStyle ? undefined : takuto.attackStyle(P.T), 'takutoDual');
  assert.equal(engine.rangeOf(P.T)[1], 1);
  assert.equal(require('../../server/phases/action.js').lanes(P.T), 'face');
  assert.deepEqual(fxOf('summon').map((f) => f.sword), ['emerald', 'sapphire']);
  assert.ok(calls.sfx.includes('takuto_sword_emerald') && calls.sfx.includes('takuto_sword_sapphire'));
  const pub = engine.buildStateFor('T').players.find((p) => p.id === 'T');
  assert.deepEqual(pub.takuto.emerald, 5);
  assert.ok(pub.skillLocks.basic.locked, 'ถือครบ 2 เล่ม = ปุ่มเทา');
});

test('ดาบเอเมอรูด: ตีปกติฟื้นพลังชีวิตเท่าดาเมจจริง (รวมทุกคนในแนว) สูงสุด 2 · แซฟไฟร์โดนทั้งด้าน', () => {
  const P = setup([['T', 'takuto', 5, 5], ['B', 'dummy', 8, 5], ['C', 'dummy', 8, 7]]);
  engine.setActor('T');
  match.turnOrder = ['T', 'B']; match.actorIndex = 0; // ตีจบ = ตาของ B (ไม่จบเทิร์น — ไม่มีกัดกิน)
  sword('T', 'emerald'); sword('T', 'sapphire');
  P.T.hp = 2;
  P.B.armor = 0; P.C.armor = 0;
  drain(() => engine.attackTarget('T', 'B'));
  assert.equal(P.B.hp, 6);
  assert.equal(P.C.hp, 6, 'แซฟไฟร์: คนที่ติดด้านเดียวกันโดนด้วย');
  assert.equal(P.T.hp, 4, 'ดาเมจจริง 2 = ฟื้น 2');
  assert.equal(fxOf('heal').length, 1);
});

test('ดาบประกายแสง: ต้องถือ 2 เล่ม · แนว 5×3 ศัตรูเสียหาย 4 · สลับกับคนไกลสุด · คูลดาวน์ 3 · เดินต่อไม่ได้', () => {
  const P = setup([['T', 'takuto', 2, 5], ['B', 'dummy', 6, 6], ['C', 'dummy', 9, 5], ['D', 'dummy', 12, 12]]);
  engine.setActor('T');
  engine.useSkill('T', 'secondary', [], { dir: 'right' });
  assert.equal(P.T.skillPoints, 8, 'ยังไม่มีดาบ = กดไม่ได้');
  sword('T', 'emerald'); sword('T', 'sapphire');
  drain(() => engine.useSkill('T', 'secondary', [], { dir: 'right' }));
  assert.equal(P.T.skillPoints, 0);
  assert.equal(vit(P.B), 6);
  assert.equal(vit(P.C), 6);
  assert.equal(vit(P.D), 10, 'นอกแนว');
  // C (ไกลสุด) ไปลงกลางตัวเดิม (3,6) · ทาคุโตะกลางตัวตรงช่องเดิมของ C (9,5) → มุม (8,4)
  assert.deepEqual(P.C.pos, { x: 3, y: 6 });
  assert.deepEqual(P.T.pos, { x: 8, y: 4 });
  assert.equal(engine.action.locked, true);
  assert.equal(P.T.statuses.takutoEmerald, 5, 'ดาบไม่หาย');
  assert.equal(engine.buildStateFor('T').players.find((p) => p.id === 'T').takuto.secCd, 3);
  assert.equal(fxOf('flash').length, 1);
});

test('ทาวววว มิสไซล์: แนว 8×1 ดาเมจ 2 + ขโมยแต้มคนละ 2 · แต้มไม่พอ = ดาเมจเพิ่ม · คูลดาวน์ 2', () => {
  const P = setup([['T', 'takuto', 1, 5], ['B', 'dummy', 6, 6], ['C', 'dummy', 11, 6], ['D', 'dummy', 6, 5]]);
  engine.setActor('T');
  P.T.skillPoints = 6;
  P.C.skillPoints = 1;
  drain(() => engine.useSkill('T', 'ultimate', [], { dir: 'right' }));
  assert.equal(vit(P.B), 8);
  assert.equal(P.B.skillPoints, 6);
  assert.equal(vit(P.C), 7, 'ขาด 1 แต้ม = ดาเมจ 3');
  assert.equal(P.C.skillPoints, 0);
  assert.equal(vit(P.D), 10, 'แนวกว้าง 1 (กลางตัว)');
  assert.equal(P.T.skillPoints, 3);
  assert.ok(calls.clips.includes(takuto.CUT.missile));
  assert.equal(engine.buildStateFor('T').players.find((p) => p.id === 'T').takuto.ultCd, 2);
});

test('เฟส 2: ปลดล็อกพุ่งต้นตาเดิน 1–3 ช่อง (ชนแล้วหยุด) แล้วเดินต่อได้ · เฟส 4 ฟื้น 3 ครั้งเดียว', () => {
  const P = setup([['T', 'takuto', 5, 5], ['B', 'dummy', 6, 2]]);
  takuto.onZeroStage(engine, 2);
  assert.ok(calls.clips.includes(takuto.CUT.passive));
  engine.setActor('T');
  const act = engine.buildStateFor('T').players.find((p) => p.id === 'T').actions[0];
  assert.equal(act.key, 'dash');
  const up = act.tiles.filter((t) => t.x === 5 && t.y < 5).map((t) => t.y);
  assert.deepEqual(up, [4, 3], 'B ขวางช่องที่ 3');
  assert.equal(takuto.charAction(engine, P.T, 'dash', { tile: { x: 5, y: 2 } }), false, 'นอกรายการ');
  assert.equal(takuto.charAction(engine, P.T, 'dash', { tile: { x: 8, y: 5 } }), true);
  assert.deepEqual(P.T.pos, { x: 8, y: 5 });
  assert.equal(fxOf('dash').length, 1);
  assert.equal(takuto.charAction(engine, P.T, 'dash', { tile: { x: 9, y: 5 } }), false, 'ตาเดินละครั้ง');
  assert.equal(engine.moveTo('T', 8, 8), true, 'เดินต่อจากจุดที่พุ่งไปได้');
  P.T.hp = 2;
  takuto.onZeroStage(engine, 4);
  assert.equal(P.T.hp, 5);
  takuto.onZeroStage(engine, 4);
  assert.equal(P.T.hp, 5, 'ครั้งเดียว');
});

test('ห่วงเวลาถูกทำลาย: มิติพังทลาย 5 เทิร์น · เดิน 8 · พลังโจมตี +1 · ปลดล็อกทุกคน · ไม่กัดกิน · ครบแล้วกลับสนามเดิม', () => {
  const P = setup([['T', 'takuto', 5, 5], ['B', 'dummy', 10, 10]]);
  breakAllSeals('B');
  assert.ok(Zero.collapsing());
  assert.equal(match.board.area, Board.ZERO_AREA + Board.ZERO_STAGES - 1, 'ยังอยู่สนามซีโร่');
  assert.ok(calls.clips.includes(takuto.CUT.passive3));
  assert.equal(engine.baseMovOf(P.T), 8);
  assert.equal(takuto.damageBonus(engine, P.T), 1);
  assert.equal(Zero.ultLocked(P.B), false);
  const pub = engine.buildStateFor('T');
  assert.deepEqual(pub.zero.collapse, { left: 5, total: 5, seq: engine.roundNumber });
  assert.equal(pub.skillMusic, 'takuto_theme');
  assert.equal(pub.players.find((p) => p.id === 'T').character.ultimate.name, 'ฉันยังมองเห็นอยู่');
  const b0 = vit(P.B);
  Zero.onEndTurn();
  assert.equal(vit(P.B), b0, 'ไม่มีกัดกิน');
  // เทิร์นที่ 5 จบ → กลับสนามเดิม
  match.zero.collapse.done = false;
  engine.setRoundNumber(match.zero.collapse.endRound);
  drain(() => engine.endTurn(), 0);
  assert.equal(Zero.active(), false);
  assert.notEqual(match.board.area, Board.ZERO_AREA + Board.ZERO_STAGES - 1);
  assert.equal(takuto.damageBonus(engine, P.T), 1, 'พลังโจมตี +1 ถาวร');
  assert.equal(engine.baseMovOf(P.T), 5);
});

test('ดาบแห่งการพิพากษา: ช่วงพังทลาย + 2 เล่ม → ปาระยะ 4 ดาเมจตายตัว 4 คลิปทุกครั้ง แล้วดาบหาย', () => {
  const P = setup([['T', 'takuto', 5, 5], ['B', 'dummy', 11, 6]]);
  breakAllSeals();
  engine.setActor('T');
  sword('T', 'emerald'); sword('T', 'sapphire');
  assert.ok(takuto.judgmentOn(P.T));
  assert.ok(calls.clips.includes(takuto.CUT.duo));
  assert.deepEqual(engine.rangeOf(P.T), [1, 4]);
  P.B.armor = 0;
  const hp0 = P.B.hp;
  drain(() => engine.attackTarget('T', 'B'));
  assert.equal(P.B.hp, hp0 - 4);
  assert.ok(!P.T.statuses.takutoEmerald && !P.T.statuses.takutoSapphire, 'ดาบทั้งสองหาย');
  assert.equal(takuto.judgmentOn(P.T), false);
});

test('ฉันยังมองเห็นอยู่: รัศมีระยะเดิน ศัตรูเสียหาย 5 · ตัวเองเสียหาย 5 เหลืออย่างน้อย 1', () => {
  const P = setup([['T', 'takuto', 5, 5], ['B', 'dummy', 10, 10], ['C', 'dummy', 12, 12]]);
  breakAllSeals();
  engine.setActor('T');
  P.T.hp = 2; P.T.armor = 1;
  const b0 = vit(P.B);
  drain(() => engine.useSkill('T', 'ultimate', []));
  assert.equal(vit(P.B), b0 - 5);
  assert.equal(P.T.hp, 1, 'เหลือ 1');
  assert.equal(P.T.armor, 0);
  assert.ok(calls.clips.includes(takuto.CUT.blast));
  assert.equal(fxOf('blast').length, 1);
});

test('ไม่มีทาคุโตะ: ผนึกแตกครบ = ปลดผนึกทันทีแบบเดิม', () => {
  setup([['A', 'dummy', 5, 5], ['B', 'dummy', 10, 10]]);
  breakAllSeals();
  assert.equal(Zero.active(), false);
});
