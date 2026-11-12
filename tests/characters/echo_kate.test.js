// เจ้าหญิง Echo สวมร่างเคท & เอมิลิโกะ (ตัวละครคู่) — ผู้ใช้ 2026-11-12:
//  Echo อีกคนเกิดข้างๆ (= เอมิลิโกะ) ภาพกลับด้าน โทนเงาม่วงเข้ม · โคลนตาย = หาย Echo เล่นต่อคนเดียว · Echo ตาย = โคลนหายด้วย · คืนร่าง = โคลนหาย
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const echo = require('../../characters/echo.js');
const action = require('../../server/phases/action.js');
const match = require('../../server/match.js');

const blank = (id, characterId, position) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId: null,
});
const CLONE = 'E~duo';
function setup() {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  engine.players.E = blank('E', 'echo', 1);
  engine.players.B = blank('B', 'dummy', 2);
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setJourneyArea(1);
  engine.setShopPos(null);
  const P = engine.players;
  P.E.pos = { x: 5, y: 5 }; P.B.pos = { x: 12, y: 5 };
  for (const p of Object.values(P)) { p.shield = 0; p.statuses = {}; p.statusAmt = {}; p.skillUsedRound = false; }
  P.E.skillPoints = 6;
  return P;
}
function startTurn(id) {
  match.turnOrder = [id]; match.actorIndex = -1; match.actorId = null; match.action = null; match.duo = null;
  action.nextActor();
  engine.clearPhaseTimer();
}
function wearKate(P) {
  engine.setActor('E');
  engine.useSkill('E', 'basic', [], { form: 'kate' });
  assert.equal(P.E.characterId, 'kate');
  return engine.players[CLONE];
}
const saved = { triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash, sfx: engine.sfx, boardFx: engine.boardFx };
test.before(() => { engine.triggerCutscene = () => {}; engine.queueCutscene = () => {}; engine.skillFlash = () => {}; engine.sfx = () => {}; engine.boardFx = () => {}; });
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.afterEach(() => { engine.clearPhaseTimer(); });

test('สมุด: เคท & เอมิลิโกะเลือกได้ (ไม่ล็อกแล้ว)', () => {
  setup();
  const pub = engine.buildStateFor('E').players.find((q) => q.id === 'E');
  const c = pub.character.basic.choices.find((x) => x.key === 'kate');
  assert.ok(c);
  assert.equal(c.locked, false);
  assert.equal(echo.BLOCKED.size, 0, 'Echo ต้องสวมร่างได้ทุกตัว');
});

test('สวมร่างเคท = Echo อีกคนเกิดข้างๆ เป็นเอมิลิโกะ · ภาพเงากลับด้าน · ใช้แต้มร่วมกัน', () => {
  const P = setup();
  const m = wearKate(P);
  assert.ok(m, 'มีโคลน');
  assert.equal(m.characterId, 'emiliko');
  assert.equal(m.echoClone, true);
  assert.equal(P.E.duoWith, CLONE);
  assert.equal(Math.abs(m.pos.x - P.E.pos.x) + Math.abs(m.pos.y - P.E.pos.y) <= 2, true, 'เกิดข้างตัว');
  assert.equal(m.hp, engine.maxHpOf(m));
  m.skillPoints = 4;
  assert.equal(P.E.skillPoints, 4, 'แต้มสกิลร่วมกัน');
  const pub = engine.buildStateFor('E').players.find((q) => q.id === CLONE);
  assert.equal(pub.img, echo.CLONE_IMG, 'ภาพบนกระดาน = Echo เงากลับด้าน');
  assert.equal(pub.name, 'เจ้าหญิง Echo');
  assert.equal(pub.character.face, 'echoClone');
});

test('ตาเดินแบบคู่: กระจกเงาสลับไปคุมโคลนได้', () => {
  const P = setup();
  wearKate(P);
  startTurn('E');
  assert.equal(engine.actorId, 'E');
  engine.useSkill('E', 'basic', []);
  assert.equal(engine.actorId, CLONE, 'สลับไปคุม Echo อีกคน');
  const m = engine.players[CLONE];
  const to = engine.nearFreeTile(m.pos);
  assert.equal(engine.moveTo(CLONE, to.x, to.y), true, 'โคลนเดินได้');
});

test('โคลนตาย = หายไป ไม่ทิ้งร่าง · Echo ยังเล่นต่อ', () => {
  const P = setup();
  const m = wearKate(P);
  engine.instantDeath(m, true);
  assert.equal(m.alive, false);
  assert.equal(m.corpse, null, 'ไม่มีร่างบนกระดาน');
  assert.equal(P.E.alive, true);
  assert.notEqual(P.E.result, 'dead');
  assert.equal(engine.boardUnits().some((u) => u.id === CLONE), false);
  for (const v of ['E', 'B']) engine.buildStateFor(v);
});

test('Echo ตายทั้งที่โคลนยังอยู่ = โคลนหายด้วย ฝ่ายนี้ตกรอบ', () => {
  const P = setup();
  const m = wearKate(P);
  engine.instantDeath(P.E, true);
  assert.equal(P.E.alive, false);
  assert.equal(P.E.result, 'dead');
  assert.equal(m.alive, false);
  assert.equal(m.corpse, null);
  assert.equal(P.E.corpse, null);
});

test('คืนร่าง = โคลนหาย · ขนมปังของเอมิลิโกะหาย · สวมใหม่ไม่ได้ขนมปังซ้ำ', () => {
  const P = setup();
  wearKate(P);
  assert.ok((P.E.inventory || []).some((it) => it.type === 'kebread'), 'ได้ขนมปังครั้งแรก');
  engine.setActor('E');
  assert.ok(echo.queenAction(engine, P.E, 'echo:diary'));
  assert.equal(P.E.characterId, 'echo');
  assert.equal(engine.players[CLONE], undefined, 'โคลนหาย');
  assert.equal(P.E.duoWith, undefined);
  assert.equal((P.E.inventory || []).some((it) => it.type === 'kebread'), false);
  engine.setRoundNumber(engine.roundNumber + echo.REVERT_CD + 1);
  engine.setActor('E');
  P.E.skillUsedRound = false;
  engine.useSkill('E', 'basic', [], { form: 'kate' });
  assert.ok(engine.players[CLONE], 'โคลนเกิดใหม่');
  assert.equal((P.E.inventory || []).some((it) => it.type === 'kebread'), false, 'ขนมปังได้ครั้งเดียวต่อเกม');
});
