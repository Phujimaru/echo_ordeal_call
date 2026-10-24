// เอมิยะ ชิโร่ (emiya_shirou) — Trace On อาวุธ 5 แบบ · สกิลรองตามอาวุธ · Unlimited Blade Works · Avalon Magecraft
//  GRID_PLAN §7.18
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const emiya = require('../../characters/emiya_shirou.js');
const { CHAR_BY_ID } = require('../../characters.js');
const Board = require('../../server/board.js');
const match = require('../../server/match.js');
const timers = require('../../server/timers.js');
const shop = require('../../server/shop.js');
const action = require('../../server/phases/action.js');
const skills = require('../../server/skills.js');

const realRandom = Math.random;
const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
// ตัวจับเวลาของเฟส = เก็บ callback แล้วเรียกเองจนฉากจบ (ฉากตี / จังหวะพักของสกิล)
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
// กรอบ w × h ที่ไม่มีช่องพิเศษ/จุดฟื้นฟู บนแผนที่ปัจจุบัน — สิ่งกีดขวางในกรอบถูกพังทิ้ง (match.board.broken) → มุมซ้ายบน { x, y }
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
// list = [[id, characterId, dx, dy]] — dx/dy นับจากช่องชิโร่ (กลางแถวกลางของกรอบ 11×3)
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
  engine.placeOnBoard(1);
  engine.clearPhaseTimer();
  const a = openArea(13, 3);
  for (const p of Object.values(engine.players)) p.pos = null;
  const o = { x: a.x + 2, y: a.y + 1 };
  for (const [id, , dx, dy = 0] of list) {
    const p = engine.players[id];
    p.pos = { x: o.x + dx, y: o.y + dy }; p.skillUsedRound = false; p.shield = 0; p.statuses = {}; p.statusAmt = {}; p.nightTaxTier = null;
    p.skillPoints = 8; p.hp = 7; p.armor = 3;
  }
  // ลำดับเดิน: ชิโร่ก่อน คนอื่นยังไม่เดิน (ตีจบตา = ไปคนถัดไป ไม่จบเทิร์นทั้งวง)
  match.turnOrder = list.map(([id]) => id);
  match.actorIndex = 0;
  return engine.players;
}
const fxOf = (kind) => calls.fx.filter((f) => f.event === 'emiyaFx' && f.payload.kind === kind).map((f) => f.payload);
const noRoll = () => { Math.random = () => 0.99; }; // ไม่คริ ไม่หลบ ไม่เพิ่มความจุ
function trace(form) { return engine.useSkill('S', 'basic', [], { form }); }
// จบเทิร์นแล้วขึ้นเทิร์นใหม่ (ผลต้นเทิร์นของชิโร่เรียกตรง — ไม่ผ่าน dealRound ทั้งก้อน)
function nextRound(P) {
  engine.endTurn();
  engine.clearPhaseTimer();
  engine.setRoundNumber(engine.roundNumber + 1);
  emiya.onRoundStartTick(engine, P.S);
  for (const p of Object.values(P)) p.skillUsedRound = false;
}

const saved = {
  triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash,
  notifyTransform: engine.notifyTransform, sfx: engine.sfx, boardFx: engine.boardFx,
};
const calls = { fx: [], sfx: [], cut: [] };
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = (p, key) => calls.cut.push(key);
  engine.skillFlash = () => {};
  engine.notifyTransform = () => {};
  engine.sfx = (s) => calls.sfx.push(s);
  engine.boardFx = (event, payload) => calls.fx.push({ event, payload });
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.beforeEach(() => { for (const k of Object.keys(calls)) calls[k] = []; noRoll(); });
test.afterEach(() => { Math.random = realRandom; engine.clearPhaseTimer(); match.cutsceneQueue.length = 0; match.afterCutscene = []; match.skillBeats = []; });

test('ข้อมูล: ยาก · 7/3 · แต้ม 0/8 · ราคา 0/0/12 · ท่าไม้ตายทั้งสนาม · คำอธิบายไม่มีจังหวะไพ่', () => {
  const ch = CHAR_BY_ID.emiya_shirou;
  assert.equal(ch.name, 'เอมิยะ ชิโร่');
  assert.equal(ch.difficulty, 'hard');
  assert.ok(!ch.unique && !ch.hidden);
  assert.deepEqual([ch.basic.cost, ch.secondary.cost, ch.ultimate.cost], [0, 0, 12]);
  assert.equal(ch.ultimate.area.kind, 'field');
  for (const s of [ch.passive, ch.basic, ch.secondary, ch.ultimate]) assert.doesNotMatch(s.desc, /ก่อนเปิดไพ่|ไพ่แตก/);
  const P = setup([['S', 'emiya_shirou', 0]]);
  assert.equal(P.S.hp, 7);
  assert.equal(engine.maxSkillOf(P.S), 8);
  assert.equal(action.baseMovOf(P.S), 4);
  assert.deepEqual(action.rangeOf(P.S), [1, 1]);
});

test('Trace On: ราคาตามอาวุธ · ไม่กินโควตา · ยังเดินได้ · คูลดาวน์ 2 · ทุกตัวเลือกมีคำอธิบาย', () => {
  const P = setup([['S', 'emiya_shirou', 0], ['A', 'dummy', 5]]);
  engine.setActor('S');
  const pub = emiya.skillPub(P.S, 'basic');
  assert.equal(pub.choices.length, 5);
  for (const c of pub.choices) assert.ok(c.desc && c.desc.length > 10, `${c.key} ต้องมี desc`);
  assert.ok(pub.choices.find((c) => c.key === 'excalibur').locked, 'Excalibur ล็อกนอก UBW');
  trace('kb');
  assert.equal(P.S.emiya.weapon, 'kb');
  assert.equal(P.S.skillPoints, 6);
  assert.equal(P.S.skillUsedRound, false, 'ไม่กินโควตา');
  assert.equal(engine.action.locked, false, 'ยังเดินได้');
  trace('rule');
  assert.equal(P.S.emiya.weapon, 'kb', 'คูลดาวน์ 2 — กดซ้ำเทิร์นเดียวกันไม่ได้');
  assert.equal(P.S.skillPoints, 6, 'กดไม่ผ่าน = ไม่เสียแต้ม');
  engine.setRoundNumber(5);
  trace('rule');
  assert.equal(P.S.emiya.weapon, 'kb', 'เทิร์น N+1 ยังติด');
  engine.setRoundNumber(6);
  trace('rule');
  assert.equal(P.S.emiya.weapon, 'rule', 'เทิร์น N+2 กดได้ · แทนอาวุธเดิม');
  assert.equal(P.S.skillPoints, 2);
});

test('Trace On นอกตาตัวเองกดไม่ได้ · Excalibur ใช้ได้เฉพาะ UBW ครั้งเดียว และเปลี่ยนอาวุธไม่ได้', () => {
  const P = setup([['S', 'emiya_shirou', 0], ['A', 'dummy', 5]]);
  engine.setActor('A');
  trace('kb');
  assert.equal(P.S.emiya.weapon, null);
  engine.setActor('S');
  trace('excalibur');
  assert.equal(P.S.emiya.weapon, null, 'ไม่มี UBW');
  P.S.emiya.ubwEnd = engine.roundNumber + 3;
  trace('excalibur');
  assert.equal(P.S.emiya.weapon, 'excalibur');
  assert.equal(P.S.emiya.excalUsed, true);
  trace('kb');
  assert.equal(P.S.emiya.weapon, 'excalibur', 'ถือ Excalibur เปลี่ยนไม่ได้ (UBW ไม่มีคูลดาวน์ก็ตาม)');
  P.S.emiya.weapon = null;
  trace('excalibur');
  assert.equal(P.S.emiya.weapon, null, '1 ครั้งต่อเกม');
});

test('UBW: Trace On ไม่มีคูลดาวน์ · ระยะเดิน +1 · Hrunting ระยะ 1–4 เดิน −1', () => {
  const P = setup([['S', 'emiya_shirou', 0], ['A', 'dummy', 5]]);
  engine.setActor('S');
  P.S.skillPoints = 8;
  trace('hrunting');
  assert.deepEqual(action.rangeOf(P.S), [1, 4]);
  assert.equal(action.baseMovOf(P.S), 3);
  P.S.emiya.ubwEnd = engine.roundNumber + 2;
  assert.equal(action.baseMovOf(P.S), 4, 'UBW +1 · ธนู −1');
  trace('kb');
  assert.equal(P.S.emiya.weapon, 'kb', 'UBW: ไม่มีคูลดาวน์');
  assert.equal(action.baseMovOf(P.S), 5);
});

test('อาวุธหาย: ตีปกติ+สกิลรองรวม 3 ครั้ง · หมดเวลาหลังจบเทิร์นที่ 5', () => {
  const P = setup([['S', 'emiya_shirou', 0], ['A', 'dummy', 1]]);
  engine.setActor('S');
  trace('rule');
  P.S.emiya.uses = 2;
  drain(() => engine.attackTarget('S', 'A'));
  assert.equal(P.S.emiya.weapon, null, 'ครั้งที่ 3 = หาย');
  assert.ok(fxOf('weaponBreak').length);
  // หมดเวลา: กดเทิร์น 4 → อยู่ถึงจบเทิร์น 8
  const Q = setup([['S', 'emiya_shirou', 0], ['A', 'dummy', 5]]);
  engine.setActor('S');
  trace('kb');
  for (let i = 0; i < 4; i++) nextRound(Q);
  assert.equal(engine.roundNumber, 8);
  assert.equal(Q.S.emiya.weapon, 'kb', 'เทิร์นที่ 5 ยังถือ');
  nextRound(Q);
  assert.equal(Q.S.emiya.weapon, null, 'หลังจบเทิร์นที่ 5 หาย');
});

test('Kanshou & Bakuya: ตี 1 ครั้ง = 2 ฮิต · แต้มสกิล +1 · นับใช้ 1 ครั้ง · คริ 15%', () => {
  const P = setup([['S', 'emiya_shirou', 0], ['A', 'dummy', 1]]);
  engine.setActor('S');
  trace('kb');
  assert.equal(emiya.critPct(P.S), 15);
  drain(() => engine.attackTarget('S', 'A'));
  assert.equal(P.A.armor, 1, '2 ฮิต × 1');
  assert.equal(match.lastAttack.repeat.length, 1);
  assert.equal(P.S.skillPoints, 7, '8 − 2 + 1');
  assert.equal(P.S.emiya.uses, 1);
});

test('ไม่มีอาวุธ: ตีปกติไม่ได้แต้ม · สกิลรองใช้ไม่ได้', () => {
  const P = setup([['S', 'emiya_shirou', 0], ['A', 'dummy', 1]]);
  engine.setActor('S');
  engine.useSkill('S', 'secondary', [], {});
  assert.equal(P.S.skillPoints, 8);
  drain(() => engine.attackTarget('S', 'A'));
  assert.equal(P.S.skillPoints, 8);
  assert.equal(P.A.armor, 2);
});

test('Rule Breaker: ตีโดน = ห้ามใช้สกิล + ผนึกพลังงาน 2 · ต้านสถานะกันได้', () => {
  const P = setup([['S', 'emiya_shirou', 0], ['A', 'dummy', 1], ['B', 'dummy', -1]]);
  engine.setActor('S');
  trace('rule');
  drain(() => engine.attackTarget('S', 'A'));
  assert.ok(P.A.statuses.noskill > 0);
  assert.equal(P.A.statuses.manaSeal, 2);
  engine.setActor('S');
  P.B.statuses.resist = 2;
  drain(() => engine.attackTarget('S', 'B'));
  assert.ok(!P.B.statuses.noskill && !P.B.statuses.manaSeal);
});

test('Nine Lives Blade Works: พลังโจมตี +1 · ตีกรอบ 2×3 ทางทิศของเป้า โดนทุกศัตรูในกรอบ', () => {
  const P = setup([['S', 'emiya_shirou', 0], ['A', 'dummy', 2], ['B', 'dummy', 1, 1], ['C', 'dummy', 3], ['D', 'dummy', -1]]);
  engine.setActor('S');
  trace('nine');
  assert.deepEqual(action.rangeOf(P.S), [1, 2]);
  drain(() => engine.attackTarget('S', 'A'));
  assert.equal(P.A.armor, 1, 'เป้าหลัก 2');
  assert.equal(P.B.armor, 1, 'อยู่ในกรอบ');
  assert.equal(P.C.armor, 3, 'นอกกรอบ (ลึก 3)');
  assert.equal(P.D.armor, 3, 'อีกฝั่ง');
  assert.equal(match.lastAttack.byLane.length, 6);
});

test('Excalibur: ตีแนว 3×1 โดนทุกคนในแนว · เปราะบาง +1 · ตีครบ 2 ครั้งหาย', () => {
  const P = setup([['S', 'emiya_shirou', 0], ['A', 'dummy', 1], ['B', 'dummy', 3], ['C', 'dummy', 4]]);
  engine.setActor('S');
  P.S.emiya.ubwEnd = engine.roundNumber + 3;
  trace('excalibur');
  drain(() => engine.attackTarget('S', 'A'));
  assert.equal(P.A.armor, 1);
  assert.equal(P.B.armor, 1);
  assert.equal(P.C.armor, 3);
  assert.equal(P.A.statuses.fragile, 2);
  assert.equal(engine.statusAmtOf(P.A, 'fragile'), 1);
  assert.equal(P.S.emiya.weapon, 'excalibur');
  engine.setActor('S');
  drain(() => engine.attackTarget('S', 'A'));
  assert.equal(P.S.emiya.weapon, null, 'ตีครบ 2 ครั้ง');
});

test('Throwing Blade: ระยะ 4 · ดาเมจ 1 + เลือดไหล 2 · นอกระยะไม่เสียแต้ม · คูลดาวน์ร่วม 4', () => {
  const P = setup([['S', 'emiya_shirou', 0], ['A', 'dummy', 4], ['B', 'dummy', 5]]);
  engine.setActor('S');
  trace('kb');
  engine.useSkill('S', 'secondary', ['B']);
  assert.equal(P.S.skillPoints, 6, 'นอกระยะ = ไม่เสียแต้ม');
  drain(() => engine.useSkill('S', 'secondary', ['A']));
  assert.equal(P.S.skillPoints, 3);
  assert.equal(P.A.armor, 2);
  assert.equal(P.A.statuses.hbleed, 2);
  assert.equal(engine.action.locked, true);
  assert.equal(P.S.emiya.wsReady, engine.roundNumber + 4);
  assert.equal(P.S.emiya.uses, 1);
});

test('Caladbolg II: ราคาครึ่งความจุ · หยุดที่ศัตรูคนแรก · ระเบิดรัศมี 2 · คลิปก่อน/หลัง', () => {
  const P = setup([['S', 'emiya_shirou', 0], ['A', 'dummy', 3], ['B', 'dummy', 5], ['C', 'dummy', 9]]);
  engine.setActor('S');
  trace('hrunting');
  P.S.skillPoints = 8;
  P.S.emiya.capBonus = 2; // ความจุ 10 → ราคา 5 → ดาเมจ 1 + 2
  assert.equal(skills.skillCostOf(P.S, 'secondary', 0), 5);
  drain(() => engine.useSkill('S', 'secondary', [], { dir: 'right' }));
  assert.deepEqual(calls.cut, ['emiyaCaladbolgBefore', 'emiyaCaladbolgAfter']);
  assert.equal(P.S.skillPoints, 3);
  assert.equal(P.A.armor, 0, 'คนแรก 3');
  assert.equal(P.B.armor, 2, 'ระเบิด 1');
  assert.equal(P.C.armor, 3, 'ไม่ทะลุ');
});

test('Ground Smash: ดาเมจ 3 · ผลัก 2 ช่อง · ชนคน = สตั้น', () => {
  const P = setup([['S', 'emiya_shirou', 0], ['B', 'dummy', 1], ['A', 'dummy', 3], ['C', 'dummy', 5]]);
  engine.setActor('S');
  P.S.skillPoints = 13; P.S.emiya.capBonus = 6;
  trace('nine');
  const ax = P.A.pos.x, bx = P.B.pos.x;
  drain(() => engine.useSkill('S', 'secondary', [], { dir: 'right' }));
  assert.equal(P.A.armor, 0);
  assert.equal(P.B.armor, 0);
  assert.equal(P.A.pos.x, ax + 1, 'ชน C หลังขยับ 1');
  assert.ok(P.A.statuses.stun > 0, 'ชน = สตั้น');
  assert.equal(P.B.pos.x, bx + 2, 'ผลักเต็ม 2');
  assert.ok(!P.B.statuses.stun);
  assert.equal(P.C.armor, 3, 'นอกแนว 4');
});

test('Rho Aias: คุ้มครอง −1 + ต้านสถานะ 2 เทิร์น', () => {
  const P = setup([['S', 'emiya_shirou', 0]]);
  engine.setActor('S');
  trace('rule');
  P.S.skillPoints = 5;
  engine.useSkill('S', 'secondary', [], {});
  assert.equal(P.S.skillPoints, 0);
  assert.equal(P.S.statuses.guard, 2);
  assert.equal(engine.statusAmtOf(P.S, 'guard'), 1);
  assert.equal(P.S.statuses.resist, 2);
});

test('Ex calibruuuu!: แนว 5×3 ดาเมจ 4 · คุ้มครองไม่มีผล · ใช้แล้ว Excalibur หาย', () => {
  const P = setup([['S', 'emiya_shirou', 0], ['A', 'dummy', 2], ['B', 'dummy', 5, 1], ['C', 'dummy', 6]]);
  engine.setActor('S');
  P.S.emiya.ubwEnd = engine.roundNumber + 3;
  P.S.emiya.capBonus = 8; P.S.skillPoints = 14;
  trace('excalibur');
  P.A.statuses.guard = 2; P.A.statusAmt.guard = 1;
  P.A.statuses.evade = 1; P.A.statusAmt.evade = 100;
  drain(() => engine.useSkill('S', 'secondary', [], { dir: 'right' }));
  assert.equal(P.A.armor, 0); assert.equal(P.A.hp, 6, 'คุ้มครอง/หลบไม่มีผล 4');
  assert.equal(P.B.hp, 6);
  assert.equal(P.C.armor, 3, 'นอกแนว 5');
  assert.equal(P.S.emiya.weapon, null);
});

test('Unlimited Blade Works: 12 แต้ม · 6 เทิร์น · ต้นเทิร์นแต้ม +1 · คูลดาวน์สกิลรองลดเพิ่ม · คูลดาวน์ 6 หลังจบ', () => {
  const P = setup([['S', 'emiya_shirou', 0], ['A', 'dummy', 5]]);
  engine.setActor('S');
  engine.useSkill('S', 'ultimate', []);
  assert.equal(P.S.emiya.ubwEnd, 0, 'ความจุ 8 < 12 กดไม่ได้');
  P.S.emiya.capBonus = 4; P.S.skillPoints = 12;
  engine.useSkill('S', 'ultimate', []);
  const r = engine.roundNumber;
  assert.deepEqual(calls.cut, ['emiyaUbw']);
  assert.ok(emiya.ubwOn(P.S));
  assert.equal(P.S.statuses.emiyaUbw, 6);
  assert.equal(P.S.skillPoints, 0);
  P.S.emiya.wsReady = r + 4;
  nextRound(P);
  assert.equal(P.S.skillPoints, 2, 'จบเทิร์นปกติ +1 · ต้นเทิร์น UBW +1');
  assert.equal(P.S.emiya.wsReady - engine.roundNumber, 2, 'ลดเพิ่ม 1');
  for (let i = 0; i < 4; i++) nextRound(P);
  assert.equal(engine.roundNumber, r + 5);
  assert.ok(emiya.ubwOn(P.S), 'เทิร์นที่ 6 ยังอยู่');
  nextRound(P);
  assert.ok(!emiya.ubwOn(P.S));
  assert.ok(!P.S.statuses.emiyaUbw);
  assert.equal(P.S.emiya.ultReady, r + 12);
});

test('Avalon: จบเทิร์นไม่เสียหาย = เยียวยา 1 × 2 · โดนแล้วไม่ติด · คูลดาวน์ 3', () => {
  const P = setup([['S', 'emiya_shirou', 0], ['A', 'dummy', 5]]);
  engine.endTurn(); engine.clearPhaseTimer();
  assert.equal(P.S.statuses.mend, 2);
  assert.equal(P.S.emiya.avalonReady, 7);
  delete P.S.statuses.mend;
  engine.setRoundNumber(7);
  engine.dealMixed(P.S, 1);
  engine.endTurn(); engine.clearPhaseTimer();
  assert.ok(!P.S.statuses.mend, 'เทิร์นนี้เสียเกราะ');
  engine.setRoundNumber(8);
  engine.endTurn(); engine.clearPhaseTimer();
  assert.equal(P.S.statuses.mend, 2);
});

test('Avalon: ใช้สกิล 30% ความจุ +2 ไม่เกิน 24 · ตีพร้อมอาวุธ +1 · ยาฟื้นแต้มใช้ไม่ได้', () => {
  const P = setup([['S', 'emiya_shirou', 0], ['A', 'dummy', 5]]);
  engine.setActor('S');
  Math.random = () => 0.1;
  trace('kb');
  assert.equal(engine.maxSkillOf(P.S), 10);
  P.S.emiya.capBonus = 16;
  P.S.emiya.traceReady = 0;
  trace('rule');
  assert.equal(engine.maxSkillOf(P.S), 24);
  P.S.skillPoints = 3;
  P.S.inventory = [{ uid: 'sp1', type: 'skillPoint', value: 2 }];
  shop.useInventoryItem('S', 'sp1');
  assert.equal(P.S.skillPoints, 3);
  assert.equal(P.S.inventory.length, 1, 'ไม่เสียของ');
});

test('ตัดผลสกิล: อาวุธ + UBW (ล่าสุดก่อน)', () => {
  const P = setup([['S', 'emiya_shirou', 0]]);
  engine.setActor('S');
  P.S.emiya.capBonus = 4; P.S.skillPoints = 12;
  engine.useSkill('S', 'ultimate', []);
  P.S.skillPoints = 8;
  engine.setActor('S');
  trace('kb');
  const list = emiya.severables(engine, P.S);
  assert.deepEqual(list.map((x) => x.key).sort(), ['ubw', 'weapon']);
  const cut = engine.sever.cut(engine, P.S);
  assert.equal(cut.label, 'Kanshou & Bakuya');
  assert.equal(P.S.emiya.weapon, null);
  engine.sever.cut(engine, P.S);
  assert.ok(!emiya.ubwOn(P.S));
  assert.equal(P.S.emiya.ultReady, engine.roundNumber + 7);
});
