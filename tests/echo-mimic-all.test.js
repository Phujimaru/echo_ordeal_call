// เจ้าหญิง Echo: เปลี่ยนเป็นสกิลของ "ทุกตัว" ที่เลือกได้ → ลองกดสกิลทุกช่อง + ต้นเทิร์น + คืนร่าง — ห้ามมีฮุคโยน error
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const echo = require('../characters/echo.js');
const { CHARACTERS } = require('../characters.js');
const combat = require('../server/combat.js');

const blank = (id, characterId, position) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId: null,
});
function setup() {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  engine.players.E = blank('E', 'echo', 1);
  engine.players.B = blank('B', 'muimi', 2);
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.placeOnBoard(1);
  const E = engine.players.E, B = engine.players.B;
  E.pos = { x: 5, y: 5 }; B.pos = { x: 6, y: 5 };
  for (const p of [E, B]) { p.skillPoints = 8; p.skillUsedRound = false; p.statuses = {}; p.statusAmt = {}; }
  return { E, B };
}
const saved = { triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash, boardFx: engine.boardFx };
test.before(() => { engine.triggerCutscene = () => {}; engine.queueCutscene = () => {}; engine.skillFlash = () => {}; engine.boardFx = () => {}; });
test.after(() => { Object.assign(engine, saved); engine.clearPhaseTimer(); });

const ids = CHARACTERS.filter((c) => !c.hidden && c.id !== 'echo' && !echo.BLOCKED.has(c.id) && (c.basic || c.secondary || c.ultimate)).map((c) => c.id);

for (const id of ids) {
  test(`สวมร่าง ${id} → ใช้สกิล → ต้นเทิร์น → คืนร่าง`, () => {
    const errs = [];
    const origErr = console.error;
    console.error = (...a) => { errs.push(a.map(String).join(' ')); };
    try {
      const { E, B } = setup();
      engine.setActor('E');
      engine.useSkill('E', 'basic', [], { form: id });
      assert.equal(E.characterId, id);
      for (const tier of ['basic', 'secondary', 'ultimate']) {
        if (match().actorId !== 'E' || !E.alive) break;
        E.skillUsedRound = false; E.skillPoints = 8;
        try { engine.useSkill('E', tier, ['B'], { dir: 'right', tile: { x: 6, y: 5 } }); } catch (e) { if (!String(e && e.message).includes('interrupt')) throw e; }
      }
      combat.broadcastHook('onRoundStartTick', engine, E);
      engine.buildStateFor('E'); engine.buildStateFor('B');
      if (E.alive) {
        if (match().actorId !== 'E') engine.setActor('E');
        echo.revert(engine, E);
        assert.equal(E.characterId, 'echo');
        assert.ok(engine.maxHpOf(E) >= 7);
        engine.buildStateFor('E');
      }
      void B;
    } finally {
      console.error = origErr;
      engine.clearPhaseTimer();
    }
    assert.deepEqual(errs.filter((l) => l.includes('[hook]') || l.includes('Error')), []);
  });
}
function match() { return require('../server/match.js'); }
