// องค์หญิงดอกไม้ เซลิน (celine) — ความอ่อนโยน / ความแข็งกร้าว / สวนดอกไม้ของฉัน / เวลาน้ำชา / สวนดอกไม้ (GRID_PLAN §7.15)
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const celine = require('../../characters/celine.js');
const { CHAR_BY_ID } = require('../../characters.js');
const Board = require('../../server/board.js');
const Flora = require('../../server/flora.js');
const action = require('../../server/phases/action.js');
const match = require('../../server/match.js');
const timers = require('../../server/timers.js');

const realRandom = Math.random;
const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
// แถว y = 7..8 ของภูมิภาค I โล่งตลอด x 0..13
function setup(list, mode = 'ffa') {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, ch, , , team], i) => { engine.players[id] = blank(id, ch, i + 1, team || null); });
  engine.setGameMode(mode);
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setJourneyArea(1);
  engine.setCycleShift(0);
  engine.setRoundNumber(4);
  match.shopPos = null;
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.skillUsedRound = false; p.shield = 0; p.statuses = {}; p.statusAmt = {}; p.nightTaxTier = null;
    p.skillPoints = 8;
  }
  return engine.players;
}
const view = (viewerId, id) => engine.buildStateFor(viewerId).players.find((p) => p.id === id);
const special = (x, y) => engine.boardMap().special[Board.key(x, y)] || null;
const terrain = (x, y) => engine.boardMap().terrain[Board.key(x, y)] || null;
const tender = (id, form, targets = [], opts = {}) => engine.useSkill(id, 'basic', targets, { form, ...opts });
// ตีปกติแล้วจบฉากตีทันที (เก็บ callback ของตัวจับเวลาไว้เรียกเองจนหมด)
function strikeNow(id, targetId) {
  const orig = timers.startPhaseTimer;
  const fires = [];
  timers.startPhaseTimer = (s, fn) => { fires.push(fn); };
  try {
    const ok = engine.attackTarget(id, targetId);
    for (let i = 0; i < 6 && fires.length && match.actorId === id; i++) fires.shift()();
    return ok;
  } finally { timers.startPhaseTimer = orig; engine.clearPhaseTimer(); }
}

const saved = {
  triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash,
  notifyTransform: engine.notifyTransform, sfx: engine.sfx, boardFx: engine.boardFx, boardFxTo: engine.boardFxTo,
};
const calls = { fx: [], sfx: [], notice: [] };
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = () => {};
  engine.skillFlash = () => {};
  engine.notifyTransform = (p, key) => calls.notice.push(key);
  engine.sfx = (s) => calls.sfx.push(s);
  engine.boardFx = (event, payload) => calls.fx.push({ event, payload });
  engine.boardFxTo = () => {};
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.beforeEach(() => { for (const k of Object.keys(calls)) calls[k] = []; });
test.afterEach(() => { Math.random = realRandom; engine.setGameMode('ffa'); engine.setCycleShift(0); engine.clearPhaseTimer(); match.cutsceneQueue.length = 0; });
const fxOf = (kind) => calls.fx.filter((f) => f.event === 'celineFx' && f.payload.kind === kind).map((f) => f.payload);

test('ข้อมูล: พิเศษ · พลังชีวิต 7 เกราะ 3 · เดิน 4 · ดาบเล็กประชิด · ราคา 0/6 · คำอธิบายไม่มีจังหวะไพ่', () => {
  const ch = CHAR_BY_ID.celine;
  assert.equal(ch.name, 'องค์หญิงดอกไม้ เซลิน');
  assert.equal(ch.difficulty, 'special');
  assert.equal(ch.mov, 4);
  assert.deepEqual([ch.secondary.cost, ch.ultimate.cost], [0, 6]);
  for (const t of ['basic', 'secondary', 'ultimate']) assert.doesNotMatch(ch[t].desc, /ก่อนเปิดไพ่|ไพ่แตก/);
  const P = setup([['C', 'celine', 3, 7], ['B', 'dummy', 9, 7]]);
  assert.equal(P.C.hp, 7);
  assert.equal(P.C.armor, 3);
  assert.equal(P.C.celine.weapon, 'dagger');
  assert.deepEqual(action.rangeOf(P.C), [1, 1]);
  const v = view('C', 'C');
  assert.equal(v.celine.weapon, 'dagger');
  assert.equal(v.celine.tenderLeft, 3);
  const basic = v.character.basic;
  assert.deepEqual(basic.choices.map((c) => c.key), ['heal', 'wall', 'swap', 'pair', 'bloom']);
  assert.ok(basic.choices.every((c) => c.desc), 'ทุกตัวเลือกมีคำอธิบายตอนชี้เมาส์ (กฎผู้ใช้ 2026-10-19)');
  assert.deepEqual(basic.choices.map((c) => c.cost), [2, 3, 3, 3, 1]);
  assert.deepEqual(v.character.secondary.choices.map((c) => c.key), ['dagger', 'dragon', 'great', 'fire', 'wind', 'thunder']);
});

test('สวนดอกไม้: ทุกช่องที่เดินผ่าน (รวมช่องออก/ปลาย) เป็นพุ่ม 3 เทิร์น · ย้อนการเดิน = หาย · เหยียบพุ่มเดิมไม่นับเวลาใหม่', () => {
  setup([['C', 'celine', 2, 7], ['B', 'dummy', 12, 8]]);
  engine.setActor('C');
  assert.ok(engine.moveTo('C', 5, 7));
  for (let x = 2; x <= 5; x++) assert.equal(special(x, 7), 'bloom', `ช่อง ${x},7`);
  assert.equal(Flora.at(4, 7).left, celine.TRAIL_TURNS);
  assert.ok(fxOf('trail').length >= 1);
  assert.ok(engine.undoMove('C'));
  for (let x = 2; x <= 5; x++) assert.equal(special(x, 7), null, 'ย้อนการเดิน = พุ่มหาย');
  assert.ok(engine.moveTo('C', 4, 7));
  Flora.at(3, 7).left = 1;
  engine.finishActor();
  engine.setActor('C');
  assert.ok(engine.moveTo('C', 2, 7));
  assert.equal(Flora.at(3, 7).left, 1, 'เหยียบพุ่มเดิมไม่รีเซ็ตเวลา');
  engine.ice.onEndTurn();
  assert.equal(special(3, 7), null, 'ครบเวลา = หาย');
});

test('สวนดอกไม้: เดินด้วยคีย์บอร์ดทีละก้าว = เอฟเฟกต์พุ่มงอกเฉพาะช่องใหม่ (ไม่งอกซ้ำทั้งเส้นทุกก้าว) · พุ่มยังครบทั้งเส้น', () => {
  setup([['C', 'celine', 2, 7], ['B', 'dummy', 12, 8]]);
  engine.setActor('C');
  celine.onActorStart(engine, engine.players.C);
  calls.fx = [];
  assert.ok(engine.moveTo('C', 3, 7, { step: true }));
  assert.ok(engine.moveTo('C', 4, 7, { step: true }));
  assert.ok(engine.moveTo('C', 5, 7, { step: true }));
  const trails = fxOf('trail').map((f) => f.tiles.map((t) => `${t.x},${t.y}`).join(' '));
  assert.deepEqual(trails, ['2,7 3,7', '4,7', '5,7']);
  for (let x = 2; x <= 5; x++) assert.equal(special(x, 7), 'bloom');
});

test('จุดด้อย: ยืนในพุ่มศัตรูยังเห็นเซลิน · คนอื่นในพุ่มของเซลินซ่อนได้ตามกติกากลาง', () => {
  const P = setup([['C', 'celine', 2, 7], ['A', 'dummy', 3, 8], ['B', 'dummy', 12, 8]]);
  Flora.lay(engine.boardMap(), [{ x: 2, y: 7 }, { x: 3, y: 8 }], 'C', 3, { made: true });
  assert.equal(engine.hiddenFrom(P.B, P.C), false, 'เซลินซ่อนในพุ่มไม่ได้');
  assert.equal(engine.hiddenFrom(P.B, P.A), true, 'คนอื่นยืนในพุ่มของเซลิน = ศัตรูนอกพุ่มมองไม่เห็น');
  assert.ok(view('C', 'C').celine.inBloom);
});

test('ความอ่อนโยน: รวมกดได้ 3 ครั้งต่อเทิร์น · ไม่กินโควตาสกิล · ใช้แล้วยังเดินได้', () => {
  const P = setup([['C', 'celine', 2, 7], ['B', 'dummy', 12, 8]]);
  engine.setActor('C');
  for (let i = 0; i < 3; i++) tender('C', 'bloom', [], { tile: { x: 6 + i, y: 8 } });
  assert.equal(P.C.skillPoints, 5);
  tender('C', 'bloom', [], { tile: { x: 10, y: 8 } });
  assert.equal(P.C.skillPoints, 5, 'ครั้งที่ 4 ในเทิร์นเดียวกันกดไม่ได้');
  assert.equal(P.C.skillUsedRound, false, 'ไม่กินโควตาสกิล');
  assert.equal(engine.action.locked, false, 'ยังเดินได้');
  assert.ok(engine.moveTo('C', 4, 7));
  assert.equal(Flora.at(6, 8).made, true);
  assert.equal(Flora.at(6, 8).left, celine.BLOOM_TURNS);
});

test('คฑาแห่งการเยียวยา: ระยะเดิน · เป้า +1 + ล้างดีบัฟ · เซลินได้ด้วย · เลือกตัวเอง = ครั้งเดียว · ครบ 4 ครั้งสะสม = คูลดาวน์ 5', () => {
  const P = setup([['C', 'celine', 2, 7], ['A', 'dummy', 6, 7], ['B', 'dummy', 12, 8]]);
  Math.random = () => 0.99; // ไม่ติดคริ
  engine.setActor('C');
  P.A.hp = 3; P.C.hp = 4;
  P.A.statuses.weak = 2; P.A.statusAmt.weak = 1;
  tender('C', 'heal', ['B']);
  assert.equal(P.C.skillPoints, 8, 'นอกระยะเดิน (4) กดไม่ได้ ไม่เสียแต้ม');
  tender('C', 'heal', ['A']);
  assert.equal(P.A.hp, 4);
  assert.equal(P.C.hp, 5);
  assert.ok(!(P.A.statuses.weak > 0), 'ล้างดีบัฟเป้า');
  tender('C', 'heal', ['C']);
  assert.equal(P.C.hp, 6, 'เลือกตัวเองได้ 1 หน่วย');
  assert.equal(P.C.celine.healCount, 2);
  engine.setRoundNumber(5); engine.setActor('C');
  tender('C', 'heal', ['C']);
  tender('C', 'heal', ['C']);
  assert.equal(P.C.celine.healCount, 0);
  assert.equal(view('C', 'C').celine.healCd, celine.HEAL_CD);
  const sp = P.C.skillPoints;
  tender('C', 'heal', ['C']);
  assert.equal(P.C.skillPoints, sp, 'คูลดาวน์อยู่');
});

test('การรักษาติดคริ: ยืนในพุ่ม +20% → ×2 · ราชาดอกไม้ ×3', () => {
  const P = setup([['C', 'celine', 2, 7], ['A', 'dummy', 4, 7], ['B', 'dummy', 12, 8]]);
  Flora.lay(engine.boardMap(), [{ x: 2, y: 7 }], 'C', 3);
  P.A.hp = 1; P.C.hp = 1;
  Math.random = () => 0.1;
  engine.setActor('C');
  tender('C', 'heal', ['A']);
  assert.equal(P.A.hp, 3);
  assert.equal(P.C.hp, 3);
  assert.equal(fxOf('heal')[0].crit, true);
  P.C.statuses[celine.KING] = 3;
  P.A.hp = 1;
  tender('C', 'heal', ['A']);
  assert.equal(P.A.hp, 4, 'ราชาดอกไม้ ×3');
});

test('คฑาแห่งการกีดกัน: กำแพง 3×1 / 1×3 · ผลักคนออกตามทิศ · โดนตีครั้งเดียวแตก · หายต้นตาเดินถัดไปของเซลิน · ครบ 2 ครั้ง = คูลดาวน์ 3', () => {
  const P = setup([['C', 'celine', 2, 7], ['A', 'dummy', 4, 7], ['B', 'dummy', 12, 8]]);
  engine.setActor('C');
  tender('C', 'wall', [], { tile: { x: 4, y: 7 }, orient: 'h' });
  assert.equal(P.C.skillPoints, 8, 'มีคนในแนว ไม่เลือกทิศ = กดไม่ได้');
  tender('C', 'wall', [], { tile: { x: 4, y: 7 }, orient: 'h', dir: 'left' });
  assert.equal(P.C.skillPoints, 8, 'แนวนอนผลักได้แค่ขึ้น/ลง');
  tender('C', 'wall', [], { tile: { x: 4, y: 7 }, orient: 'h', dir: 'up' });
  assert.equal(P.C.skillPoints, 5);
  for (let x = 3; x <= 5; x++) assert.equal(terrain(x, 7), 'icewall');
  assert.deepEqual(P.A.pos, { x: 4, y: 6 }, 'ผลักขึ้น 1 ช่อง');
  assert.ok(engine.boardMap().terrain['4,7']);
  tender('C', 'wall', [], { tile: { x: 1, y: 8 }, orient: 'v' });
  for (let y = 7; y <= 9; y++) assert.equal(terrain(1, y), 'icewall');
  assert.equal(view('C', 'C').celine.wallCd, celine.WALL_CD);
  // ตีครั้งเดียวแตก (ผู้เล่นคนอื่นตีได้)
  engine.setActor('A');
  P.A.pos = { x: 4, y: 6 };
  assert.ok(strikeNow('A', 'spike:4,7'));
  assert.equal(terrain(4, 7), null, 'ตีครั้งเดียวแตก');
  assert.ok(fxOf('wallBreak').some((f) => f.why === 'hit'));
  // ต้นตาเดินถัดไปของเซลิน = หายหมด
  engine.setActor('C');
  celine.onActorStart(engine, P.C);
  assert.equal(terrain(3, 7), null);
  assert.equal(terrain(1, 8), null);
});

test('คฑาแห่งการเคลื่อนย้าย: สลับกับเป้าในระยะ 5 · จับคู่ 2 คน · คูลดาวน์ร่วม 3 · ตัว 2×2 ไม่ได้', () => {
  const P = setup([['C', 'celine', 2, 7], ['A', 'dummy', 5, 7], ['D', 'dummy', 6, 8], ['B', 'dummy', 12, 8]]);
  engine.setActor('C');
  tender('C', 'swap', ['B']);
  assert.equal(P.C.skillPoints, 8, 'นอกระยะ 5');
  tender('C', 'swap', ['A']);
  assert.deepEqual(P.C.pos, { x: 5, y: 7 });
  assert.deepEqual(P.A.pos, { x: 2, y: 7 });
  assert.deepEqual(engine.action.from, { x: 5, y: 7 }, 'ยังไม่ได้เดิน = เริ่มเดินจากช่องใหม่');
  tender('C', 'pair', ['A', 'D']);
  assert.deepEqual(P.A.pos, { x: 2, y: 7 }, 'คูลดาวน์ร่วมกัน');
  engine.setRoundNumber(7); engine.setActor('C');
  P.D.boardSize = 2;
  tender('C', 'pair', ['A', 'D']);
  assert.deepEqual(P.A.pos, { x: 2, y: 7 }, 'ตัว 2×2 ไม่ได้');
  P.D.boardSize = 1;
  tender('C', 'pair', ['A', 'D']);
  assert.deepEqual(P.A.pos, { x: 6, y: 8 });
  assert.deepEqual(P.D.pos, { x: 2, y: 7 });
  assert.equal(fxOf('swap').length, 2);
});

test('ความแข็งกร้าว: เปลี่ยนอาวุธฟรีไม่จำกัด · ยังเดินได้ · ระยะดาบ 1 / เวท 1–3 · มังกรแดงคริ 50 · ในพุ่ม +20', () => {
  const P = setup([['C', 'celine', 2, 7], ['B', 'dummy', 12, 8]]);
  engine.setActor('C');
  engine.useSkill('C', 'secondary', [], { form: 'fire' });
  assert.equal(P.C.celine.weapon, 'fire');
  assert.deepEqual(action.rangeOf(P.C), [1, 3]);
  engine.useSkill('C', 'secondary', [], { form: 'dragon' });
  assert.deepEqual(action.rangeOf(P.C), [1, 1]);
  assert.equal(celine.critPct(P.C), 50);
  Flora.lay(engine.boardMap(), [{ x: 2, y: 7 }], 'C', 3);
  assert.equal(celine.critPct(P.C), 70);
  assert.equal(engine.action.locked, false);
  assert.equal(P.C.skillUsedRound, false);
  assert.equal(P.C.skillPoints, 8);
  assert.equal(fxOf('weapon').length, 2);
});

test('อาวุธ: ดาบใหญ่ +1 ผลัก 1 · เวทย์ไฟ ลุกไหม้ 1 · เวทย์ไฟฟ้า ช็อต 2 · เวทย์ลม ผลัก 2 ชนขอบ +1', () => {
  Math.random = () => 0.99; // ไม่หลบ ไม่คริ
  let P = setup([['C', 'celine', 2, 7], ['A', 'dummy', 3, 7], ['B', 'dummy', 12, 8]]);
  P.A.armor = 0; P.A.hp = 6;
  P.C.celine.weapon = 'great';
  engine.setActor('C');
  assert.ok(strikeNow('C', 'A'));
  assert.equal(P.A.hp, 4, 'พลังโจมตี 1 + ดาบใหญ่ 1');
  assert.deepEqual(P.A.pos, { x: 4, y: 7 }, 'ผลัก 1 ช่อง');

  P = setup([['C', 'celine', 2, 7], ['A', 'dummy', 5, 7], ['B', 'dummy', 12, 8]]);
  P.C.celine.weapon = 'fire';
  engine.setActor('C');
  assert.ok(strikeNow('C', 'A'));
  assert.ok(P.A.statuses.hburn > 0, 'ลุกไหม้');

  P = setup([['C', 'celine', 2, 7], ['A', 'dummy', 5, 7], ['B', 'dummy', 12, 8]]);
  P.C.celine.weapon = 'thunder';
  engine.setActor('C');
  assert.ok(strikeNow('C', 'A'));
  assert.ok(P.A.statuses.shock > 0, 'ช็อต');
  assert.equal(fxOf('shock').length, 1);

  P = setup([['C', 'celine', 10, 7], ['A', 'dummy', 12, 7], ['B', 'dummy', 1, 8]]);
  P.A.armor = 0; P.A.hp = 6;
  P.C.celine.weapon = 'wind';
  engine.setActor('C');
  assert.ok(strikeNow('C', 'A'));
  assert.deepEqual(P.A.pos, { x: 13, y: 7 }, 'ผลักได้ 1 ช่องแล้วชนขอบ');
  assert.equal(P.A.hp, 4, 'ตี 1 + ชน 1');
  assert.equal(fxOf('collide').length, 1);
});

test('ดาบเล็ก: หลบหลีกเฉพาะตัว 5% · ตี/รอแล้วเดินต่อได้อีกรอบ (เดิน/รอเท่านั้น)', () => {
  const P = setup([['C', 'celine', 2, 7], ['A', 'dummy', 3, 7], ['B', 'dummy', 12, 8]]);
  assert.equal(celine.ownEvade(P.C), 5);
  engine.setActor('C');
  engine.waitAction('C');
  assert.equal(engine.actorId, 'C', 'กดรอแล้วยังอยู่ในตา (เดินต่อ)');
  assert.ok(engine.action.canto);
  tender('C', 'bloom', [], { tile: { x: 6, y: 1 } });
  assert.equal(P.C.skillPoints, 8, 'ระหว่างเดินต่อใช้สกิลไม่ได้');
  assert.ok(engine.moveTo('C', 2, 9));
  P.C.celine.weapon = 'dragon';
  assert.equal(celine.ownEvade(P.C), 0);
});

test('สวนดอกไม้ของฉัน: ราชาดอกไม้ 5 เทิร์น · เดินตามดอกไม้ไม่เสียก้าว · คริ +50% ×3 · ต้นเทิร์นแต้มสกิล +1 · กดเทิร์น N → ได้อีก N+8 · ยังเดินได้', () => {
  const P = setup([['C', 'celine', 0, 7], ['B', 'dummy', 12, 8]]);
  const path = []; for (let x = 1; x <= 9; x++) path.push({ x, y: 7 });
  Flora.lay(engine.boardMap(), path, 'C', 5, { made: true });
  engine.setActor('C');
  assert.equal(action.flowerWalk(P.C), false);
  P.C.pos = { x: 0, y: 9 }; // นอกพุ่ม — อัตราคริไม่รวมเวลาน้ำชา
  const critBefore = celine.critPct(P.C);
  P.C.pos = { x: 0, y: 7 };
  engine.useSkill('C', 'ultimate', []);
  assert.equal(P.C.skillPoints, 2);
  assert.equal(P.C.statuses.celineKing, 5);
  assert.equal(celine.critMult(P.C), 3);
  P.C.pos = { x: 0, y: 9 };
  assert.equal(celine.critPct(P.C), critBefore + 50, 'อัตราคริ +50%');
  P.C.pos = { x: 0, y: 7 };
  assert.equal(engine.action.locked, false, 'กดแล้วยังเดินได้');
  assert.ok(view('C', 'C').flowerWalk);
  assert.ok(engine.moveTo('C', 9, 7), 'เดิน 9 ช่องตามดอกไม้ (ปกติเดินได้ 4)');
  assert.ok(calls.notice.includes('celineUlt'));
  // ต้นเทิร์นระหว่างบัฟ: แต้มสกิล +1
  P.C.skillPoints = 2;
  celine.onRoundStartTick(engine, P.C);
  assert.equal(P.C.skillPoints, 3);
  for (const r of [5, 6, 7, 8, 9, 10, 11]) {
    engine.setRoundNumber(r);
    P.C.skillUsedRound = false; P.C.skillPoints = 8;
    if (r >= 9) delete P.C.statuses.celineKing;
    engine.setActor('C');
    engine.useSkill('C', 'ultimate', []);
    assert.equal(P.C.skillPoints, 8, `เทิร์น ${r} ยังกดไม่ได้`);
  }
  delete P.C.statuses.celineKing;
  celine.onRoundStartTick(engine, P.C);
  assert.equal(P.C.skillPoints, 8, 'บัฟหมด = ไม่ได้แต้มเพิ่ม');
  engine.setRoundNumber(12);
  engine.setActor('C');
  engine.useSkill('C', 'ultimate', []);
  assert.equal(P.C.skillPoints, 2, 'เทิร์น N+8 กดได้');
});

test('ปุ่มหลายตัวเลือกที่ client ได้: ระยะเดินแปลงเป็นตัวเลข · ชื่อสั้น · ไม่กินโควตา · ปุ่มพื้นฐานราคา 0', () => {
  const P = setup([['C', 'celine', 2, 7], ['B', 'dummy', 12, 8]]);
  const basic = view('C', 'C').character.basic;
  assert.equal(basic.cost, 0);
  const by = Object.fromEntries(basic.choices.map((c) => [c.key, c]));
  assert.equal(by.heal.area.range, 4, 'range "mov" → ระยะเดิน');
  assert.equal(by.wall.area.range, 4);
  assert.deepEqual(basic.choices.map((c) => c.name), ['เยียวยา', 'กีดกัน', 'เคลื่อนย้าย', 'จับคู่', 'รังสรรค์']);
  assert.ok(basic.choices.every((c) => c.free === true));
  assert.ok(view('C', 'C').character.secondary.choices.every((c) => c.free === true));
  // ใช้ท่าไม้ตาย (กินโควตา) แล้ว ความอ่อนโยนยังกดได้
  engine.setActor('C');
  P.C.skillPoints = 8;
  engine.useSkill('C', 'ultimate', []);
  assert.equal(P.C.skillUsedRound, true);
  tender('C', 'heal', ['C']);
  assert.equal(P.C.skillPoints, 0, 'เยียวยาหลังท่าไม้ตายได้');
});

test('เวลาน้ำชา: ต้นเทิร์นยืนในพุ่มติดกัน 2 เทิร์น = ฟื้น 1 (ไม่ติดคริ) แล้วนับใหม่ · ออกจากพุ่ม = นับใหม่', () => {
  const P = setup([['C', 'celine', 2, 7], ['B', 'dummy', 12, 8]]);
  Math.random = () => 0; // คริติดแน่ถ้ายังติดได้
  P.C.celine.weapon = 'dragon';
  P.C.hp = 3;
  celine.onRoundStartTick(engine, P.C);
  assert.equal(P.C.hp, 3, 'ไม่อยู่ในพุ่ม');
  Flora.lay(engine.boardMap(), [{ x: 2, y: 7 }], 'C', 5, { made: true });
  celine.onRoundStartTick(engine, P.C);
  assert.equal(P.C.hp, 3, 'เทิร์นแรกในพุ่มยังไม่ฟื้น');
  assert.equal(view('C', 'C').celine.tea, 1);
  celine.onRoundStartTick(engine, P.C);
  assert.equal(P.C.hp, 4, 'ครบ 2 เทิร์น = ฟื้น 1 (ไม่ติดคริ)');
  assert.equal(fxOf('tea')[0].crit, false);
  celine.onRoundStartTick(engine, P.C);
  assert.equal(P.C.hp, 4, 'นับใหม่');
  // จบตาโดยไม่ได้ยืนในพุ่ม = นับใหม่
  P.C.pos = { x: 2, y: 9 };
  celine.onActorEnd(engine, P.C);
  P.C.pos = { x: 2, y: 7 };
  celine.onRoundStartTick(engine, P.C);
  assert.equal(P.C.hp, 4);
  celine.onRoundStartTick(engine, P.C);
  assert.equal(P.C.hp, 5);
});

test('สวนดอกไม้: ถูกผลัก/กระเด็น/ดึง = ทางที่ถูกพาผ่านเกิดพุ่ม 5 เทิร์น · สลับตำแหน่ง (วาร์ป) ไม่เกิด · Ice Spike ถูกผลัก = เกิดธารน้ำแข็ง', () => {
  const P = setup([['C', 'celine', 2, 7], ['I', 'ice_spike', 2, 8], ['B', 'dummy', 12, 8]]);
  const ctx = engine.ice.begin();
  engine.ice.pushUnit(P.C, { x: 1, y: 0 }, ctx, 2);
  engine.ice.flush(ctx);
  assert.deepEqual(P.C.pos, { x: 4, y: 7 });
  for (let x = 2; x <= 4; x++) assert.equal(special(x, 7), 'bloom', `ช่อง ${x},7`);
  assert.equal(Flora.at(3, 7).left, 5);
  assert.ok(fxOf('trail').length >= 1);
  // ถูกย้ายด้วยแรงอื่นที่ส่งช่องเดิมมา (via)
  P.C.pos = { x: 6, y: 7 };
  engine.ice.forcedSlides([{ id: 'C', via: { x: 4, y: 7 }, to: { x: 6, y: 7 } }], P.B);
  assert.equal(special(5, 7), 'bloom');
  // วาร์ป (สลับตำแหน่ง) ไม่เกิดพุ่ม
  P.C.pos = { x: 9, y: 7 };
  engine.ice.forcedSlides([{ id: 'C', to: { x: 9, y: 7 }, warp: true }], P.B);
  assert.equal(special(9, 7), null);
  // Ice Spike ถูกผลัก = ทางเป็นธารน้ำแข็ง
  const ctx2 = engine.ice.begin();
  engine.ice.pushUnit(P.I, { x: 1, y: 0 }, ctx2, 1);
  assert.deepEqual(P.I.pos, { x: 3, y: 8 });
  assert.ok(engine.ice.iceAt(2, 8) && engine.ice.iceAt(3, 8), 'ช่องเดิม + ช่องที่ลงเป็นน้ำแข็ง');
  assert.ok(ctx2.events.some((e) => e.kind === 'lay' && e.by === 'I'));
  engine.ice.flush(ctx2);
});

test('คลิปคริก่อนฉากตี: สายดาบ / สายเวท · ไม่คริ = ไม่มีคลิป', () => {
  const P = setup([['C', 'celine', 2, 7], ['B', 'dummy', 12, 8]]);
  assert.equal(celine.preAttackClip(engine, P.C, { crit: false }), null);
  assert.equal(celine.preAttackClip(engine, P.C, { crit: true }), 'celineCritSword');
  P.C.celine.weapon = 'wind';
  assert.equal(celine.preAttackClip(engine, P.C, { crit: true }), 'celineCritMage');
  assert.equal(celine.preAttackClip(engine, P.B, { crit: true }), null);
  // เสียงพากย์ตอนตี: ไม่ติดคริ = เล่น · ติดคริ = ไม่เล่น (ไม่ทับคลิป)
  calls.sfx = [];
  celine.preAttackClip(engine, P.C, { crit: true });
  assert.ok(!calls.sfx.some((k) => String(k).startsWith('celine_v_strike')));
  celine.preAttackClip(engine, P.C, { crit: false });
  assert.ok(calls.sfx.some((k) => String(k).startsWith('celine_v_strike')));
  assert.deepEqual(celine.voiceLines(P.C).strike, [], 'Voice.play ตอนตีไม่เล่นเอง');
});
