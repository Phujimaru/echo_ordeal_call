// เจ้าหญิง Echo: สวมร่างทุกตัว แล้วเล่นจริงหลายเทิร์น (สกิลทุกช่อง/ทุกตัวเลือก ใส่ศัตรูข้างตัว · ตีปกติ · จบตา)
//  → คืนร่างกลางผลค้าง → เล่นต่อ → สวมร่างตัวอื่น → เล่นต่อ · ห้ามมีฮุคโยน error และค่าต้องไม่เพี้ยน
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const echo = require('../characters/echo.js');
const { CHARACTERS } = require('../characters.js');
const combat = require('../server/combat.js');
const match = require('../server/match.js');

const blank = (id, characterId, position) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId: null,
});
function setup() {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  engine.players.E = blank('E', 'echo', 1);
  engine.players.B = blank('B', 'muimi', 2);
  engine.players.C = blank('C', 'oberon_summer', 3);
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.placeOnBoard(1);
  const P = engine.players;
  P.E.pos = { x: 5, y: 5 }; P.B.pos = { x: 6, y: 5 }; P.C.pos = { x: 5, y: 7 };
  for (const p of Object.values(P)) { p.skillPoints = 8; p.skillUsedRound = false; p.statuses = {}; p.statusAmt = {}; p.hp = 30; }
  P.B.hp = 7; P.C.hp = 7;
  return P;
}
const saved = { triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash, boardFx: engine.boardFx };
test.before(() => { engine.triggerCutscene = () => {}; engine.queueCutscene = () => {}; engine.skillFlash = () => {}; engine.boardFx = () => {}; });
test.after(() => { Object.assign(engine, saved); engine.clearPhaseTimer(); });

const USED = [];
test.after(() => { if (process.env.ECHO_STRESS_LOG) require('fs').writeFileSync(process.env.ECHO_STRESS_LOG, USED.join(String.fromCharCode(10))); });
const ids = CHARACTERS.filter((c) => !c.hidden && c.id !== 'echo' && !echo.BLOCKED.has(c.id) && (c.basic || c.secondary || c.ultimate)).map((c) => c.id);

function myTurn(t, E) {
  // ตาเดินของ E ใหม่ (ล้างคิวฉาก/ตัวจับเวลาที่ค้างจากตาก่อน)
  for (let i = 0; i < 300; i++) t.mock.timers.tick(100);
  engine.clearPhaseTimer();
  match.cutsceneQueue = []; match.skillBeats = [];
  if (!E.alive) return false;
  engine.setActor('E');
  match.gameState = 'ACTION';
  E.skillUsedRound = false; E.skillPoints = Math.max(E.skillPoints, 6);
  return true;
}
function tryAll(t, E) {
  const B = engine.players.B;
  for (const tier of ['basic', 'secondary', 'ultimate']) {
    const pub = engine.buildStateFor('E').players.find((q) => q.id === 'E');
    const slot = pub && pub.character && pub.character[tier];
    if (!slot || slot.book) continue;
    const forms = Array.isArray(slot.choices) && slot.choices.length ? slot.choices.slice(0, 4).map((c) => c.key) : [undefined];
    for (const form of forms) {
      if (!myTurn(t, E)) return;
      const tgt = B.alive && B.pos ? B : engine.players.C;
      const tile = tgt && tgt.pos ? { x: tgt.pos.x, y: tgt.pos.y } : { x: 6, y: 5 };
      const before = match.roundSkills.length + (E.skillPoints * 100) + (E.skillUsedRound ? 1 : 0);
      try { engine.useSkill('E', tier, tgt ? [tgt.id] : [], { form, dir: 'right', tile }); }
      catch (e) { if (!/interrupt|time ?stop/i.test(String(e && e.message))) throw e; }
      const after = match.roundSkills.length + (E.skillPoints * 100) + (E.skillUsedRound ? 1 : 0);
      if (after !== before) USED.push(`${E.characterId}:${tier}${form ? ':' + form : ''}`);
      for (let i = 0; i < 300; i++) t.mock.timers.tick(100);
    }
  }
  if (myTurn(t, E) && B.alive) { try { engine.attackTarget('E', 'B'); } catch (e) { if (!/interrupt/i.test(String(e && e.message))) throw e; } }
}
function roundTick(t) {
  for (const p of Object.values(engine.players)) if (p.alive) combat.broadcastHook('onRoundStartTick', engine, p);
  engine.setRoundNumber(engine.roundNumber + 1);
  for (let i = 0; i < 300; i++) t.mock.timers.tick(100);
}
function invariants(E, label) {
  assert.ok(E.hp <= engine.maxHpOf(E) || !E.alive, `${label}: hp ${E.hp} > max ${engine.maxHpOf(E)}`);
  assert.ok(E.skillPoints <= engine.maxSkillOf(E), `${label}: แต้ม ${E.skillPoints} > ${engine.maxSkillOf(E)}`);
  for (const v of ['E', 'B', 'C']) engine.buildStateFor(v);
  const me = engine.buildStateFor('E').players.find((q) => q.id === 'E');
  if (me) assert.equal(me.img, '/characters/echo/echo_cover.webp', `${label}: ภาพบนกระดานต้องเป็น Echo`);
}

for (const id of ids) {
  test(`เล่นจริง: สวมร่าง ${id} → สกิล/ตี/เทิร์น → คืนร่างกลางผล → สวมมุยมิ`, (t) => {
    t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
    const errs = [];
    const origErr = console.error;
    console.error = (...a) => { errs.push(a.map((x) => (x && x.stack) || String(x)).join(' ')); };
    try {
      const P = setup();
      const E = P.E;
      myTurn(t, E);
      engine.useSkill('E', 'basic', [], { form: id });
      assert.equal(E.characterId, id);
      for (let r = 0; r < 3 && E.alive; r++) { tryAll(t, E); invariants(E, `${id} รอบ ${r}`); roundTick(t); }
      if (E.alive) {
        myTurn(t, E);
        if (echo.mimicking(E)) {
          assert.ok(echo.queenAction(engine, E, 'echo:diary'), 'คืนร่างได้ในตาตัวเอง');
        }
        assert.equal(E.characterId, 'echo');
        assert.equal(engine.sizeOf(E), 1, 'คืนร่างแล้วตัว 1×1');
        invariants(E, `${id} หลังคืนร่าง`);
        for (let r = 0; r < 2 && E.alive; r++) { roundTick(t); invariants(E, `${id} หลังคืนร่าง รอบ ${r}`); }
        engine.setRoundNumber(engine.roundNumber + echo.REVERT_CD);
        if (myTurn(t, E)) {
          engine.useSkill('E', 'basic', [], { form: 'muimi' });
          assert.equal(E.characterId, 'muimi', 'สวมร่างตัวถัดไปได้');
          tryAll(t, E);
          invariants(E, `${id} → muimi`);
        }
      }
    } finally {
      console.error = origErr;
      engine.clearPhaseTimer();
    }
    const bad = errs.filter((l) => /\[hook\]|Error|error/.test(l));
    assert.deepEqual(bad, []);
  });
}
