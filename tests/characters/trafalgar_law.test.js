// ทราฟาก้า ลอว์ (trafalgar_law) — Room · ศัลแพทย์ 4 แบบ · Gamma Knife / Mess · Counter Shock
//  GRID_PLAN §7.20
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const { CHAR_BY_ID } = require('../../characters.js');
const Board = require('../../server/board.js');
const match = require('../../server/match.js');
const timers = require('../../server/timers.js');

const realRandom = Math.random;
const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
// ตัวจับเวลาของเฟส = เก็บ callback แล้วเรียกเองจนกลับเข้าตาเดิน (ฉากตี / จังหวะพักของสกิล)
function drain(fn, max = 30) {
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
// กรอบ w × h ที่ไม่มีช่องพิเศษ/จุดฟื้นฟู — สิ่งกีดขวางในกรอบถูกพังทิ้ง → มุมซ้ายบน { x, y }
function openArea(w, h) {
  const map = engine.boardMap();
  const plain = (x, y) => Board.inBounds(map, x, y) && !(map.special && map.special[Board.key(x, y)]) && !map.heal.has(Board.key(x, y));
  for (let y = 1; y + h <= map.rows - 1; y++) {
    for (let x = 0; x + w <= map.cols; x++) {
      let ok = true;
      for (let j = 0; j < h && ok; j++) for (let i = 0; i < w && ok; i++) ok = plain(x + i, y + j);
      if (!ok) continue;
      const broken = [];
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (map.terrain[Board.key(x + i, y + j)]) broken.push(Board.key(x + i, y + j));
      match.board.broken = broken;
      match.board.brokenVer = (match.board.brokenVer || 0) + 1;
      return { x, y };
    }
  }
  throw new Error('ไม่มีกรอบโล่ง');
}
// list = [[id, characterId, dx, dy]] — dx/dy นับจากช่องลอว์ (กลางกรอบโล่ง 9×5)
let O = null;
function setup(list) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, ch], i) => { engine.players[id] = blank(id, ch, i + 1); });
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setCycleShift(0);
  engine.setRoundNumber(4);
  match.shopPos = null;
  match.shopRazed = false;
  engine.placeOnBoard(1);
  engine.clearPhaseTimer();
  const a = openArea(9, 5);
  for (const p of Object.values(engine.players)) p.pos = null;
  O = { x: a.x + 4, y: a.y + 2 };
  for (const [id, , dx, dy = 0] of list) {
    const p = engine.players[id];
    p.pos = { x: O.x + dx, y: O.y + dy }; p.skillUsedRound = false; p.shield = 0; p.statuses = {}; p.statusAmt = {}; p.nightTaxTier = null;
    p.skillPoints = 12; p.hp = 7; p.armor = 3;
  }
  match.turnOrder = list.map(([id]) => id);
  match.actorIndex = 0;
  engine.setActor('L');
  return engine.players;
}
const noRoll = () => { Math.random = () => 0.99; }; // ไม่หลบ ไม่คริ
const room = (form = '5') => drain(() => engine.useSkill('L', 'basic', [], { form }));
const strike = (id) => drain(() => engine.attackTarget('L', id));
const sec = (form, opts) => drain(() => engine.useSkill('L', 'secondary', [], { form, ...opts }));
const ult = (form) => drain(() => engine.useSkill('L', 'ultimate', [], { form }));
const H = () => engine.CHAR_HOOKS.trafalgar_law;
const at = (dx, dy = 0) => ({ x: O.x + dx, y: O.y + dy });

test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = () => {};
  engine.skillFlash = () => {};
});
test.afterEach(() => { Math.random = realRandom; engine.clearPhaseTimer(); });

test('ข้อมูลตัวละคร: พิเศษ · unique · 7/3 · นอก Room ตีไม่ได้', () => {
  const ch = CHAR_BY_ID.trafalgar_law;
  assert.equal(ch.difficulty, 'special');
  assert.equal(ch.unique, true);
  assert.deepEqual(ch.range, [1, 0]);
  const P = setup([['L', 'trafalgar_law', 0], ['E', 'dummy', 1]]);
  assert.equal(engine.maxHpOf(P.L), 7);
  assert.equal(engine.maxArmorOf(P.L), 3);
  assert.equal(engine.attackTarget('L', 'E'), false); // ยังไม่มี Room
});

test('Room 5×5: กางรอบตัว · 0 แต้ม · ไม่กินโควตา · ยังเดินได้ · ปิดแล้วคูลดาวน์ 1 เทิร์น', () => {
  const P = setup([['L', 'trafalgar_law', 0], ['E', 'dummy', 4]]);
  room('5');
  const r = P.L.law.room;
  assert.ok(r);
  assert.deepEqual([r.x0, r.y0, r.x1, r.y1], [O.x - 2, O.y - 2, O.x + 2, O.y + 2]);
  assert.equal(P.L.skillPoints, 12);
  assert.equal(P.L.skillUsedRound, false);
  assert.equal(engine.action.locked, false);
  assert.ok(engine.buildStateFor('E').board.law.rooms.length === 1);
  room(); // ปิด
  assert.equal(P.L.law.room, null);
  assert.equal(P.L.law.roomReady, engine.roundNumber + 2);
  assert.equal(H().canUseSkill(engine, P.L, 'basic', [], { form: '5' }), false);
  engine.setRoundNumber(engine.roundNumber + 2);
  assert.equal(H().canUseSkill(engine, P.L, 'basic', [], { form: '5' }), true);
});

test('Room 9×9 ปิดแล้วคูลดาวน์ 3 เทิร์น · เปลี่ยนภูมิภาค = ปิดและเปิดได้ทันที', () => {
  const P = setup([['L', 'trafalgar_law', 0]]);
  room('9');
  room();
  assert.equal(P.L.law.roomReady, engine.roundNumber + 4);
  P.L.law.roomReady = 0; // ตั้งใหม่: เปิดแล้วเปลี่ยนภูมิภาค
  room('9');
  assert.ok(P.L.law.room);
  H().onBoardPlaced(engine);
  assert.equal(P.L.law.room, null);
  assert.equal(P.L.law.roomReady, 0);
});

test('ตีใน Room: ทั้ง Room · ดาเมจ 0 · มาร์ก · ไม่จบตา · 3 ครั้งต่อเทิร์น · นอก Room ไม่ได้', () => {
  noRoll();
  const P = setup([['L', 'trafalgar_law', 0], ['E', 'dummy', 2, 2], ['F', 'dummy', 4]]);
  room('5');
  assert.equal(engine.attackTarget('L', 'F'), false); // F นอก Room
  strike('E');
  assert.equal(P.E.hp, 7);
  assert.equal(P.E.armor, 3);
  assert.deepEqual(P.L.law.marks, ['E']);
  assert.equal(engine.actorId, 'L');
  assert.equal(engine.gameState, 'ACTION');
  strike('E');
  strike('E');
  assert.equal(engine.attackTarget('L', 'E'), false); // ครบ 3 ครั้ง
  engine.waitAction('L');
  assert.deepEqual(P.L.law.marks, []); // จบตา = มาร์กหาย
});

test('ตัดพื้น: วัตถุลอยในช่องว่าง · นับเป็นการตี · สูงสุด 4', () => {
  const P = setup([['L', 'trafalgar_law', 0]]);
  room('9');
  const tiles = H().cutTiles(engine, P.L);
  assert.ok(tiles.length > 0);
  drain(() => H().charAction(engine, P.L, 'cut', { tile: at(1) }));
  assert.equal(P.L.law.objects.length, 1);
  assert.equal(engine.action.locked, true);
  drain(() => H().charAction(engine, P.L, 'cut', { tile: at(2) }));
  drain(() => H().charAction(engine, P.L, 'cut', { tile: at(3) }));
  assert.equal(H().cutTiles(engine, P.L).length, 0); // ตีครบ 3 ครั้งแล้ว
  engine.setRoundNumber(engine.roundNumber + 1);
  engine.setActor('L');
  drain(() => H().charAction(engine, P.L, 'cut', { tile: at(-1) }));
  assert.equal(P.L.law.objects.length, 4);
  assert.equal(H().cutTiles(engine, P.L).length, 0); // เต็ม 4
});

test('Shambles: สลับที่ตัวเองกับคนที่มาร์ก · 2 แต้ม · ไม่กินโควตา · 2 ครั้งต่อเทิร์น', () => {
  noRoll();
  const P = setup([['L', 'trafalgar_law', 0], ['E', 'dummy', 2, 1]]);
  room('5');
  strike('E');
  const eFrom = { ...P.E.pos }, lFrom = { ...P.L.pos };
  sec('shuffle', { tiles: [lFrom, eFrom], tile: lFrom });
  assert.deepEqual(P.L.pos, eFrom);
  assert.deepEqual(P.E.pos, lFrom);
  assert.equal(P.L.skillPoints, 10);
  assert.equal(P.L.skillUsedRound, false);
  // วัตถุลอยสลับกับคน
  drain(() => H().charAction(engine, P.L, 'cut', { tile: at(-2, -2) }));
  sec('shuffle', { tiles: [{ ...P.E.pos }, at(-2, -2)], tile: { ...P.E.pos } });
  assert.deepEqual(P.E.pos, at(-2, -2));
  assert.equal(H().canUseSkill(engine, P.L, 'secondary', [], { form: 'takt', tile: at(1) }), false); // ครบ 2 ครั้ง
});

test('Shambles: คนอื่นกับคนอื่น · เรากับวัตถุ สลับได้', () => {
  noRoll();
  const P = setup([['L', 'trafalgar_law', 0], ['E', 'dummy', 2, 1], ['F', 'dummy', -2, -1]]);
  room('5');
  strike('E');
  strike('F');
  const e = { ...P.E.pos }, f = { ...P.F.pos };
  sec('shuffle', { tiles: [e, f], tile: e });
  assert.deepEqual(P.E.pos, f);
  assert.deepEqual(P.F.pos, e);
  drain(() => H().charAction(engine, P.L, 'cut', { tile: at(0, -2) }));
  const l = { ...P.L.pos };
  sec('shuffle', { tiles: [l, at(0, -2)], tile: l });
  assert.deepEqual(P.L.pos, at(0, -2));
  assert.deepEqual([P.L.law.objects[0].x, P.L.law.objects[0].y], [l.x, l.y]);
});

test('Shamble: สลับพลังชีวิต/เกราะของคนอื่น 2 คนได้', () => {
  noRoll();
  const P = setup([['L', 'trafalgar_law', 0], ['E', 'dummy', 2, 1], ['F', 'dummy', -2, -1]]);
  room('5');
  strike('E');
  strike('F');
  P.E.hp = 1; P.E.armor = 0;
  sec('shamble', { tiles: [{ ...P.E.pos }, { ...P.F.pos }], tile: { ...P.E.pos } });
  assert.equal(P.E.hp, 7);
  assert.equal(P.E.armor, 3);
  assert.equal(P.F.hp, 1);
  assert.equal(P.F.armor, 0);
  assert.equal(P.L.hp, 7);
});

test('Shambles: สลับกับคนที่ไม่ได้มาร์กไม่ได้ · วัตถุกับวัตถุไม่ได้', () => {
  const P = setup([['L', 'trafalgar_law', 0], ['E', 'dummy', 2, 1]]);
  room('5');
  assert.equal(H().canUseSkill(engine, P.L, 'secondary', [], { form: 'shuffle', tiles: [{ ...P.L.pos }, { ...P.E.pos }] }), false);
  drain(() => H().charAction(engine, P.L, 'cut', { tile: at(1) }));
  drain(() => H().charAction(engine, P.L, 'cut', { tile: at(-1) }));
  assert.equal(H().canUseSkill(engine, P.L, 'secondary', [], { form: 'shuffle', tiles: [at(1), at(-1)] }), false);
});

test('Takt: 1 แต้ม · ศัตรูเสียหาย 1 + ถูกผลักออก · หนามหินขวางทาง · หายตอนต้นตาเดินถัดไปของลอว์', () => {
  noRoll();
  const P = setup([['L', 'trafalgar_law', 0], ['E', 'dummy', 1]]);
  room('5');
  const t = { ...P.E.pos };
  sec('takt', { tile: t });
  assert.equal(P.L.skillPoints, 11);
  assert.equal(P.E.armor, 2);
  assert.deepEqual(P.E.pos, at(2));
  assert.ok(engine.board.spikes[`${t.x},${t.y}`]);
  assert.equal(engine.board.spikes[`${t.x},${t.y}`].look, 'lawRock');
  assert.equal(engine.tileFree(t.x, t.y), false);
  engine.setRoundNumber(engine.roundNumber + 1);
  H().onActorStart(engine, P.L);
  assert.equal(engine.board.spikes[`${t.x},${t.y}`], undefined);
});

test('โยนสิ่งของ: วัตถุทั้งหมดลงช่อง · ความเสียหาย 1 ต่อก้อน · วัตถุหมด', () => {
  noRoll();
  const P = setup([['L', 'trafalgar_law', 0], ['E', 'dummy', 2]]);
  room('5');
  drain(() => H().charAction(engine, P.L, 'cut', { tile: at(0, 1) }));
  drain(() => H().charAction(engine, P.L, 'cut', { tile: at(0, -1) }));
  sec('throw', { tile: { ...P.E.pos } });
  assert.equal(P.E.armor, 1);
  assert.equal(P.L.law.objects.length, 0);
});

test('โยนสิ่งของ: คูลดาวน์ 3 เทิร์นหลังโยน', () => {
  noRoll();
  const P = setup([['L', 'trafalgar_law', 0], ['E', 'dummy', 2]]);
  room('5');
  drain(() => H().charAction(engine, P.L, 'cut', { tile: at(0, 1) }));
  sec('throw', { tile: { ...P.E.pos } });
  const r0 = engine.roundNumber;
  drain(() => H().charAction(engine, P.L, 'cut', { tile: at(0, -1) }));
  const ok = () => H().canUseSkill(engine, P.L, 'secondary', [], { form: 'throw', tile: { ...P.E.pos } });
  for (let d = 1; d <= 3; d++) {
    engine.setRoundNumber(r0 + d);
    assert.equal(ok(), false, `เทิร์นที่ ${d} หลังโยน`);
    const c = H().skillPub(P.L, 'secondary').choices.find((x) => x.key === 'throw');
    assert.equal(c.cd, 4 - d);
  }
  engine.setRoundNumber(r0 + 4);
  assert.equal(ok(), true);
});

test('ทิ้งวัตถุลอย: เลือกทีละก้อน · ฟรี ไม่นับเป็นการตี · ปุ่มคู่กับตัดพื้น', () => {
  const P = setup([['L', 'trafalgar_law', 0], ['E', 'dummy', 3]]);
  room('5');
  drain(() => H().charAction(engine, P.L, 'cut', { tile: at(0, 1) }));
  drain(() => H().charAction(engine, P.L, 'cut', { tile: at(0, -1) }));
  const sp = P.L.skillPoints, used = P.L.law.strikes;
  const acts = H().hudActions(engine, P.L);
  const drop = acts.find((x) => x.key === 'drop');
  assert.equal(drop.row, 'cut');
  assert.equal(acts.find((x) => x.key === 'cut').row, 'cut');
  assert.deepEqual(drop.tiles, [at(0, 1), at(0, -1)]);
  assert.equal(H().charAction(engine, P.L, 'drop', { tile: at(1) }), false); // ไม่มีวัตถุ
  assert.equal(H().charAction(engine, P.L, 'drop', { tile: at(0, 1) }), true);
  assert.deepEqual(P.L.law.objects.map((o) => ({ x: o.x, y: o.y })), [at(0, -1)]);
  assert.equal(P.L.skillPoints, sp);
  assert.equal(P.L.law.strikes, used);
  assert.equal(engine.action.locked, true); // ล็อกมาจากการตัด ไม่ใช่การทิ้ง
});

test('Shamble: สลับพลังชีวิต/เกราะ 2 คน (ตัดส่วนเกินเพดาน) · 3 แต้ม', () => {
  noRoll();
  const P = setup([['L', 'trafalgar_law', 0], ['E', 'dummy', 1]]);
  room('5');
  strike('E');
  P.L.hp = 2; P.L.armor = 0;
  sec('shamble', { tiles: [{ ...P.L.pos }, { ...P.E.pos }], tile: { ...P.L.pos } });
  assert.equal(P.L.hp, 7);
  assert.equal(P.L.armor, 3);
  assert.equal(P.E.hp, 2);
  assert.equal(P.E.armor, 0);
  assert.equal(P.L.skillPoints, 9);
});

test('Gamma Knife: ตีประชิด = ลุกไหม้/เลือดไหล/พิษร้าย · คูลดาวน์ 3 · ตีไกลไม่ได้ระหว่างรอ', () => {
  Math.random = () => 0.99; // สุ่มเพิ่ม = พิษร้าย
  const P = setup([['L', 'trafalgar_law', 0], ['E', 'dummy', 1], ['F', 'dummy', 2, 2]]);
  room('5');
  ult('gamma');
  assert.equal(P.L.skillPoints, 8);
  assert.equal(engine.action.locked, false); // ยังเดินได้
  assert.equal(engine.attackTarget('L', 'F'), false); // ต้องประชิด
  strike('E');
  assert.equal(P.E.statuses.hburn, 2);
  assert.equal(P.E.statuses.hbleed, 2);
  assert.equal(P.E.statuses.poison, 4); // 3 เทิร์น (+1 ระบบลดเทิร์น)
  assert.equal(P.L.law.gammaReady, engine.roundNumber + 4);
  assert.equal(H().canUseSkill(engine, P.L, 'ultimate', [], { form: 'gamma' }), false);
});

test('Mess: หัวใจเข้ากระเป๋า · บีบ = ความเสียหาย 2 ไม่ว่าไกลแค่ไหน · 1 ครั้งต่อเทิร์น · 3 ครั้งแล้วคืน', () => {
  noRoll();
  const P = setup([['L', 'trafalgar_law', 0], ['E', 'dummy', 1]]);
  room('5');
  ult('mess');
  strike('E');
  const heart = P.L.inventory.find((it) => it.type === 'lawHeart');
  assert.ok(heart);
  assert.equal(heart.targetId, 'E');
  P.E.pos = at(-4, 2); // ไปไกล (นอก Room)
  drain(() => engine.useInventoryItem('L', heart.uid));
  assert.equal(P.E.armor, 1);
  assert.equal(heart.uses, 2);
  assert.equal(engine.action.locked, true);
  drain(() => engine.useInventoryItem('L', heart.uid)); // เทิร์นเดียวกัน = ไม่ได้
  assert.equal(heart.uses, 2);
  for (let i = 0; i < 2; i++) {
    engine.setRoundNumber(engine.roundNumber + 1);
    H().onRoundStartTick(engine, P.L);
    engine.setActor('L');
    drain(() => engine.useInventoryItem('L', heart.uid));
  }
  assert.equal(P.E.hp, 4); // 6 = เกราะ 3 + เลือด 3
  assert.equal(P.L.inventory.some((it) => it.type === 'lawHeart'), false);
});

test('ตายใน Room เหลือศพ · Counter Shock ฟื้นพลังชีวิต 1 · 3 ครั้งต่อเกม', () => {
  noRoll();
  const P = setup([['L', 'trafalgar_law', 0], ['E', 'dummy', 1], ['F', 'dummy', 4, 2]]);
  room('5');
  engine.instantDeath(P.E);
  assert.ok(P.E.corpse);
  assert.equal(engine.corpseKept(P.E), true);
  engine.instantDeath(P.F); // นอก Room
  assert.equal(engine.corpseKept(P.F), false);
  const acts = H().hudActions(engine, P.L);
  const shock = acts.find((a) => a.key === 'shock');
  assert.equal(shock.tiles.length, 1);
  drain(() => H().charAction(engine, P.L, 'shock', { tile: { ...P.E.corpse } }));
  assert.equal(P.E.alive, true);
  assert.equal(P.E.hp, 1);
  assert.equal(P.E.armor, 0);
  assert.equal(P.L.law.shocks, 2);
});

test('ลอว์ตาย = Room ปิด · ศพที่เก็บไว้หาย', () => {
  const P = setup([['L', 'trafalgar_law', 0], ['E', 'dummy', 1], ['G', 'dummy', -4]]);
  room('5');
  engine.instantDeath(P.E);
  assert.equal(engine.corpseKept(P.E), true);
  engine.instantDeath(P.L);
  assert.equal(P.L.law.room, null);
  assert.equal(engine.corpseKept(P.E), false);
});

test('คลิป: Room ครั้งแรกต่อเกมเท่านั้น · Gamma Knife / Mess ก่อนฉากตีที่โดน · เสียงพากย์ตีเสริมเงียบ (เสียงในคลิป)', () => {
  const P = setup([['L', 'trafalgar_law', 0]]);
  const queued = [];
  const q = engine.queueCutscene;
  engine.queueCutscene = (p, key) => queued.push(key);
  try {
    room('5');
    room();
    P.L.law.roomReady = 0;
    room('5');
  } finally { engine.queueCutscene = q; }
  assert.deepEqual(queued, ['lawRoom']);
  ult('gamma');
  assert.equal(H().preAttackClip(engine, P.L, { dodge: false }), 'lawGamma');
  assert.equal(H().preAttackClip(engine, P.L, { dodge: true }), null);
  assert.deepEqual(H().voiceLines(P.L).strike, []);
  P.L.law.armed = null;
  assert.equal(H().voiceLines(P.L).strike.length, 4);
  assert.equal(H().voiceLines(P.L).turn.length, 3);
  assert.equal(H().voiceLines(P.L).struck.length, 2);
});

test('ตัดผลสกิล: Room / ท่าไม้ตายที่รอตี', () => {
  const P = setup([['L', 'trafalgar_law', 0]]);
  room('5');
  ult('mess');
  const sev = H().severables(engine, P.L).map((s) => s.key);
  assert.ok(sev.includes('room'));
  assert.ok(sev.includes('armed'));
  H().severables(engine, P.L).find((s) => s.key === 'room').cancel();
  assert.equal(P.L.law.room, null);
  assert.ok(P.L.law.roomReady > engine.roundNumber);
});
