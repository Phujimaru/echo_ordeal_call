// ผู้นำแห่งตระกูลเรียวกิ (ryougi) — หยินหยาง (เนตรมณะ/เยียวยา) · รากฐานจิต · ดับสิ้นซะ (ช่องพัง) · ติดตัว ฟันแนว 2 ช่อง/สังหาร 5%/บัฟหลังท่าไม้ตาย
//  GRID_PLAN §7.17
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const ryougi = require('../../characters/ryougi.js');
const { CHAR_BY_ID } = require('../../characters.js');
const Board = require('../../server/board.js');
const match = require('../../server/match.js');
const timers = require('../../server/timers.js');

const realRandom = Math.random;
const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
// ตัวจับเวลาของเฟส = เก็บ callback แล้วเรียกเองจนฉากจบ (ฉากตี / จังหวะพักของสกิล) — หยุดเมื่อกลับเข้าตาเดินหรือตาของคนนั้นจบ
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
// แถวโล่ง (ไม่มีสิ่งกีดขวาง/ช่องพิเศษ) ยาว len บนแผนที่ปัจจุบัน → { x, y }
function openRow(len) {
  const map = engine.boardMap();
  const clear = (x, y) => Board.inBounds(map, x, y) && !map.terrain[Board.key(x, y)];
  for (let y = 1; y < map.rows - 1; y++) {
    for (let x = 0; x + len <= map.cols; x++) {
      let ok = true;
      for (let i = 0; i < len && ok; i++) ok = clear(x + i, y) && !(map.special && map.special[Board.key(x + i, y)]);
      if (ok) return { x, y };
    }
  }
  throw new Error('ไม่มีแถวโล่ง');
}
// list = [[id, characterId, dx]] วางเรียงในแถวโล่งเดียวกัน (dx นับจากต้นแถว)
function setup(list, { mode = 'ffa', teams = {} } = {}) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, ch], i) => { engine.players[id] = blank(id, ch, i + 1, teams[id] || null); });
  engine.setGameMode(mode);
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setCycleShift(0);
  engine.setRoundNumber(4);
  match.shopPos = null;
  match.shopRazed = false;
  const row = openRow(11);
  for (const [id, , dx, dy = 0] of list) {
    const p = engine.players[id];
    p.pos = { x: row.x + dx, y: row.y + dy }; p.skillUsedRound = false; p.shield = 0; p.statuses = {}; p.statusAmt = {}; p.nightTaxTier = null;
    p.skillPoints = 8; p.hp = 7; p.armor = 3;
  }
  return { P: engine.players, row };
}
const fxOf = (kind) => calls.fx.filter((f) => f.event === 'ryougiFx' && f.payload.kind === kind).map((f) => f.payload);

const saved = {
  triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash,
  notifyTransform: engine.notifyTransform, sfx: engine.sfx, boardFx: engine.boardFx,
};
const calls = { fx: [], sfx: [] };
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = () => {};
  engine.skillFlash = () => {};
  engine.notifyTransform = () => {};
  engine.sfx = (s) => calls.sfx.push(s);
  engine.boardFx = (event, payload) => calls.fx.push({ event, payload });
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.beforeEach(() => { for (const k of Object.keys(calls)) calls[k] = []; });
test.afterEach(() => { Math.random = realRandom; engine.clearPhaseTimer(); match.cutsceneQueue.length = 0; match.afterCutscene = []; match.skillBeats = []; });

test('ข้อมูล: มหันตภัย · unique · ฟันแนว 2 ช่อง · ราคา 0/4/6 · ท่าไม้ตายแนว 8×1 · คำอธิบายไม่มีจังหวะไพ่', () => {
  const ch = CHAR_BY_ID.ryougi;
  assert.equal(ch.name, 'ผู้นำแห่งตระกูลเรียวกิ');
  assert.equal(ch.difficulty, 'calamity');
  assert.equal(ch.unique, true);
  assert.ok(!ch.hidden);
  assert.equal(ch.mov, 4);
  assert.deepEqual(ch.range, [1, 1], 'เล็งประชิด');
  assert.equal(ryougi.laneLen(engine.players.R || { characterId: 'ryougi' }), 2, 'ฟันแนวยาว 2 ช่อง');
  assert.deepEqual([ch.basic.cost, ch.secondary.cost, ch.ultimate.cost], [0, 4, 6]);
  assert.deepEqual(ch.ultimate.area, ryougi.ULT_AREA);
  for (const t of ['basic', 'secondary', 'ultimate']) assert.doesNotMatch(ch[t].desc, /ก่อนเปิดไพ่|ไพ่แตก/);
});

test('หยินหยาง: ไม่กินโควตา · ยังเดินได้ · เทิร์นเดียวกดได้ทั้ง 2 อย่าง · คูลดาวน์ 10 / 5 นับจากเทิร์นที่กด', () => {
  const { P } = setup([['R', 'ryougi', 0], ['B', 'dummy', 6]]);
  engine.setActor('R');
  engine.useSkill('R', 'basic', [], { form: 'eyes' });
  assert.equal(P.R.statuses.netramana, 1, 'เนตรมณะ 1 เทิร์น');
  assert.equal(P.R.skillPoints, 8, 'ราคา 0');
  assert.ok(!P.R.skillUsedRound, 'ไม่กินโควตา');
  assert.ok(!engine.action.locked, 'ยังเดินได้');
  assert.equal(fxOf('eyes').length, 1);
  engine.useSkill('R', 'basic', [], { form: 'mend' });
  assert.equal(P.R.statuses.mend, ryougi.MEND_TURNS, 'เยียวยา 3 ครั้ง');
  assert.equal(engine.statusAmtOf(P.R, 'mend'), 1, 'ครั้งละ 1');
  // กดซ้ำระหว่างคูลดาวน์ไม่ได้
  delete P.R.statuses.netramana;
  engine.useSkill('R', 'basic', [], { form: 'eyes' });
  assert.ok(!P.R.statuses.netramana);
  const st = engine.buildStateFor('R').players.find((p) => p.id === 'R');
  assert.equal(st.ryougi.eyesCd, 10);
  assert.equal(st.ryougi.mendCd, 5);
  assert.equal(st.skillLocks.basic.locked, true, 'ทั้งสองอย่างติดคูลดาวน์ = ปุ่มล็อก');
  engine.setRoundNumber(4 + 5);
  assert.equal(engine.buildStateFor('R').players.find((p) => p.id === 'R').ryougi.mendCd, 0);
  engine.setRoundNumber(4 + 10);
  assert.equal(engine.buildStateFor('R').players.find((p) => p.id === 'R').ryougi.eyesCd, 0);
});

test('เยียวยา 3 เทิร์น = ฟื้นครบ 3 ครั้ง ครั้งละ 1 (กฎกลาง)', () => {
  const { P } = setup([['R', 'ryougi', 0], ['B', 'dummy', 6]]);
  engine.setActor('R');
  P.R.hp = 2;
  engine.useSkill('R', 'basic', [], { form: 'mend' });
  for (let i = 0; i < 4; i++) engine.tickMend(engine, P.R);
  assert.equal(P.R.hp, 5, '2 + 1×3');
  assert.ok(!P.R.statuses.mend);
});

test('ตีปกติฟันแนว 2 ช่อง: โดนศัตรูทุกคนในแนว (ไม่โดนเพื่อน)', () => {
  const { P } = setup([['R', 'ryougi', 0], ['A', 'dummy', 1], ['B', 'dummy', 2], ['C', 'dummy', 4]]);
  engine.setActor('R');
  Math.random = () => 0.99; // ไม่สังหาร · ไม่คริ
  drain(() => engine.attackTarget('R', 'A'));
  assert.equal(P.A.hp + P.A.armor, 9);
  assert.equal(P.B.hp + P.B.armor, 9, 'ช่องที่ 2 โดนด้วย');
  assert.equal(P.C.hp + P.C.armor, 10, 'นอกแนว 2 ช่อง');
});

test('ตีปกติเล็งได้เฉพาะประชิด (ห่าง 2 ช่องตีไม่ได้) · โดนคนด้านหลังเป้าเสมอ', () => {
  const { P } = setup([['R', 'ryougi', 0], ['A', 'dummy', 2], ['B', 'dummy', 3]]);
  engine.setActor('R');
  Math.random = () => 0.99;
  assert.equal(require('../../server/phases/action.js').canStrike(P.R, P.A), false, 'ห่าง 2 ช่อง = เล็งไม่ได้');
  P.R.pos = { x: P.A.pos.x - 1, y: P.A.pos.y };
  drain(() => engine.attackTarget('R', 'A'));
  assert.equal(P.A.hp + P.A.armor, 9);
  assert.equal(P.B.hp + P.B.armor, 9, 'คนด้านหลังเป้าโดนด้วย');
});

test('สังหารทันที: ไม่มีเนตรมณะ 5% · มีเนตรมณะรวมเป็น 25% (ทอยครั้งเดียว) · ตาย = กองเลือด + ฉากสังหาร', () => {
  let { P } = setup([['R', 'ryougi', 0], ['A', 'dummy', 1]]);
  engine.setActor('R');
  Math.random = () => 0.06;
  drain(() => engine.attackTarget('R', 'A'));
  assert.ok(P.A.alive, 'ทอย 6% ไม่ผ่าน 5%');
  ({ P } = setup([['R', 'ryougi', 0], ['A', 'dummy', 1]]));
  engine.setActor('R');
  engine.useSkill('R', 'basic', [], { form: 'eyes' });
  Math.random = () => 0.24;
  const at = { ...P.A.pos };
  drain(() => engine.attackTarget('R', 'A'));
  assert.equal(P.A.alive, false, 'ทอย 24% ผ่าน 25%');
  assert.equal(P.A.ryougiSlain, true);
  const kill = fxOf('kill')[0];
  assert.equal(kill.targetId, 'A');
  assert.equal(kill.how, 'strike');
  assert.deepEqual(engine.buildStateFor('R').board.ryougi.blood.map((b) => ({ x: b.x, y: b.y })), [at]);
  assert.equal(kill.line, ryougi.VOICE_KILL, 'เสียงพากย์สังหารเล่นตอนจังหวะปะทะ (client)');
  assert.equal(kill.sound, 'ryougi_kill');
  // เปลี่ยนภูมิภาค = กองเลือดหาย
  engine.placeOnBoard(engine.board.area);
  assert.equal(engine.buildStateFor('R').board.ryougi, undefined);
});

test('รากฐานจิต: กินโควตา · ยังเดินได้ · ตีโดน = ลบบัฟล่าสุด + ตัดผลสกิลล่าสุด แล้วหมด · ถูกหลบ = ยังอยู่ · กดซ้ำไม่ได้ระหว่างอยู่', () => {
  const { P } = setup([['R', 'ryougi', 0], ['A', 'dummy', 1]]);
  engine.setActor('R');
  engine.useSkill('R', 'secondary', []);
  assert.equal(P.R.statuses.ryougiMind, 3);
  assert.equal(P.R.skillPoints, 4);
  assert.ok(P.R.skillUsedRound);
  assert.ok(!engine.action.locked, 'ยังเดินได้');
  P.R.skillUsedRound = false;
  engine.useSkill('R', 'secondary', []);
  assert.equal(P.R.skillPoints, 4, 'กดซ้ำไม่ได้ระหว่างที่ยังอยู่');
  // ถูกหลบ = ยังอยู่
  engine.applyBuff(P.A, 'evade', 100, 1);
  Math.random = () => 0.5;
  drain(() => engine.attackTarget('R', 'A'));
  assert.ok(P.R.statuses.ryougiMind > 0, 'หลบพ้น = บัฟยังอยู่');
  // ตีโดน: ลบบัฟล่าสุด (คุ้มครอง) + ตัดผลสกิล (ฮุค severables ปลอม)
  engine.setActor('R');
  delete P.A.statuses.evade;
  engine.applyBuff(P.A, 'might', 1, 3);
  engine.applyBuff(P.A, 'guard', 1, 3);
  let cut = false;
  const CH = require('../../characters/index.js');
  CH.dummy = { id: 'dummy', severables: () => [{ key: 'x', label: 'ท่าทดสอบ', at: 5, cancel: () => { cut = true; } }] };
  try {
    Math.random = () => 0.99;
    drain(() => engine.attackTarget('R', 'A'));
  } finally { delete CH.dummy; }
  assert.ok(!P.A.statuses.guard, 'บัฟล่าสุดถูกลบ');
  assert.ok(P.A.statuses.might, 'บัฟเก่ายังอยู่');
  assert.ok(cut, 'ผลสกิลถูกตัด');
  assert.ok(!P.R.statuses.ryougiMind, 'ใช้แล้วหมด');
  const sever = fxOf('sever')[0];
  assert.equal(sever.targetId, 'A');
  assert.equal(sever.severed, 'ท่าทดสอบ');
});

test('ดับสิ้นซะ: พุ่ง 8×1 ไปลงช่องท้าย · ศัตรูเสียหาย 3 + ขโมย 2 (ขาด = ดาเมจเพิ่ม) · ช่องที่ผ่านพัง · ผลักออกข้าง · เพื่อนแค่ถูกผลัก', () => {
  const { P, row } = setup([['R', 'ryougi', 0], ['A', 'dummy', 2], ['B', 'dummy', 4], ['F', 'dummy', 6]], { mode: 'duo', teams: { R: 't1', F: 't1', A: 't2', B: 't2' } });
  P.R.teamId = 't1'; P.F.teamId = 't1'; P.A.teamId = 't2'; P.B.teamId = 't2';
  engine.setActor('R');
  P.A.skillPoints = 5; P.B.skillPoints = 0;
  Math.random = () => 0.99; // ไม่สังหาร
  drain(() => engine.useSkill('R', 'ultimate', [], { dir: 'right' }));
  assert.equal(P.R.skillPoints, 8 - 6 + 2, 'ขโมยจาก A 2 (B ไม่มีแต้ม)');
  assert.equal(P.A.skillPoints, 3);
  assert.equal(P.A.hp + P.A.armor, 7, 'A เสียหาย 3');
  assert.equal(P.B.hp + P.B.armor, 5, 'B เสียหาย 3 + ขาด 2');
  assert.equal(P.F.hp + P.F.armor, 10, 'เพื่อนไม่เสียหาย');
  assert.deepEqual(P.R.pos, { x: row.x + 8, y: row.y }, 'ลงช่องท้ายสุดของแนว 8');
  const map = engine.boardMap();
  for (let i = 1; i <= 7; i++) assert.equal(map.terrain[Board.key(row.x + i, row.y)], 'chasm', `ช่อง ${i} พัง`);
  assert.notEqual(map.terrain[Board.key(row.x + 8, row.y)], 'chasm', 'ช่องที่ลงไม่พัง');
  for (const id of ['A', 'B', 'F']) {
    assert.equal(Math.abs(P[id].pos.y - row.y), 1, `${id} ถูกผลักออกข้าง`);
    assert.ok(!engine.tileFree(P[id].pos.x, row.y), 'ช่องเดิมยืนไม่ได้แล้ว');
  }
  assert.equal(engine.tileFree(row.x + 3, row.y), false, 'ช่องพังเดิน/ยืนไม่ได้');
  assert.equal(engine.action.locked, true, 'เดินต่อไม่ได้');
  assert.equal(match.actorId, 'R', 'ไม่จบตา');
  // บัฟหลังท่าไม้ตาย 3 เทิร์น
  assert.equal(P.R.statuses.ryougiBloom, 3);
  assert.equal(P.R.statuses.resist, 3);
  assert.equal(ryougi.attackStyle(P.R), 'ryougiLeap');
  assert.equal(ryougi.damageBonus(engine, P.R), 1);
  assert.equal(fxOf('crumble')[0].tiles.length, 7);
  assert.equal(fxOf('bloom').length, 1);
  assert.equal(engine.buildStateFor('R').skillMusic, 'ryougi_bloom');
  // คูลดาวน์ 2 เทิร์น
  assert.equal(engine.buildStateFor('R').players.find((p) => p.id === 'R').ryougi.ultCd, 2);
  // เปลี่ยนภูมิภาค = ช่องพังหาย
  engine.placeOnBoard(engine.board.area);
  assert.equal(Object.values(engine.boardMap().terrain).filter((k) => k === 'chasm').length, 0);
});

test('ดับสิ้นซะ: ร้านค้าในแนวพัง (หายจนรอบย้ายร้าน) · สั้นลงที่ขอบกระดาน · พุ่งข้ามช่องพังเดิมได้', () => {
  const { P, row } = setup([['R', 'ryougi', 0], ['B', 'dummy', 0, 1]]);
  engine.setActor('R');
  match.shopPos = { x: row.x + 3, y: row.y };
  match.shopOpenedRound = 4;
  Math.random = () => 0.99;
  drain(() => engine.useSkill('R', 'ultimate', [], { dir: 'right' }));
  assert.equal(match.shopPos, null);
  assert.equal(match.shopRazed, true);
  const shop = require('../../server/shop.js');
  assert.equal(shop.shopDue(), false, 'ไม่ตั้งร้านใหม่ทันที');
  // ลงกลับทางเดิม: ข้ามช่องพัง 7 ช่อง ไปลงจุดเริ่มเดิม (ช่องที่ยืนได้ท้ายสุด)
  engine.setRoundNumber(4 + 5);
  engine.setActor('R');
  P.R.skillPoints = 8; P.R.skillUsedRound = false;
  drain(() => engine.useSkill('R', 'ultimate', [], { dir: 'left' }));
  const map = engine.boardMap();
  assert.notEqual(map.terrain[Board.key(P.R.pos.x, P.R.pos.y)], 'chasm', 'ลงบนช่องที่ยืนได้');
  assert.ok(P.R.pos.x < row.x + 8);
});

test('ตัดผลสกิล: server/sever.js เลือกอันล่าสุด · ไม่มีฮุค = null', () => {
  const Sever = require('../../server/sever.js');
  const { P } = setup([['R', 'ryougi', 0], ['A', 'dummy', 1]]);
  assert.equal(Sever.cut(engine, P.A), null);
  const CH = require('../../characters/index.js');
  const order = [];
  CH.dummy = { id: 'dummy', severables: () => [
    { key: 'old', label: 'เก่า', at: 1, cancel: () => order.push('old') },
    { key: 'new', label: 'ใหม่', at: 9, cancel: () => order.push('new') },
  ] };
  try { assert.deepEqual(Sever.cut(engine, P.A), { key: 'new', label: 'ใหม่' }); } finally { delete CH.dummy; }
  assert.deepEqual(order, ['new']);
  assert.ok(Sever.stamp() < Sever.stamp());
});

test('ดับสิ้นซะ: สังหารทันที 5% · เนตรมณะเปิดอยู่ = 25%', () => {
  let { P } = setup([['R', 'ryougi', 0], ['A', 'dummy', 2]]);
  engine.setActor('R');
  Math.random = () => 0.06;
  drain(() => engine.useSkill('R', 'ultimate', [], { dir: 'right' }));
  assert.ok(P.A.alive, 'ทอย 6% ไม่ผ่าน 5%');
  ({ P } = setup([['R', 'ryougi', 0], ['A', 'dummy', 2]]));
  engine.setActor('R');
  engine.useSkill('R', 'basic', [], { form: 'eyes' });
  Math.random = () => 0.24;
  drain(() => engine.useSkill('R', 'ultimate', [], { dir: 'right' }));
  assert.equal(P.A.alive, false, 'ทอย 24% ผ่าน 25% (เนตรมณะ)');
  assert.equal(P.A.ryougiSlain, true);
  assert.equal(fxOf('kill').filter((k) => k.how === 'skill').length, 1);
});
