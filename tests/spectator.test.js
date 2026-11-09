// ผู้ชม (server/view.js spectatorState): มุมมองคนนอกระหว่างแมตช์ — ไม่ล้ม · ไม่เห็นไพ่ใคร · youId = null
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const match = require('../server/match.js');
const view = require('../server/view.js');
const { CHARACTERS } = require('../characters');

function setup(chars, mode = 'ffa', world = 'earth') {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  chars.forEach((ch, i) => {
    engine.players['p' + i] = {
      id: 'p' + i, name: 'P' + i, position: i + 1, characterId: ch, alive: true, connected: true,
      cards: [], statuses: {}, statusAmt: {}, seen: {}, cutsceneShown: {}, inventory: [], teamId: null,
    };
  });
  engine.setGameMode(mode);
  match.world = world;
  engine.startMatch();
  engine.clearPhaseTimer();
}
test.after(() => { engine.clearPhaseTimer(); for (const id of Object.keys(engine.players)) delete engine.players[id]; });

test('มุมมองผู้ชม: ไม่เห็นไพ่ใคร · youId null · spectator true', () => {
  setup(['muimi', 'fern', 'gray']);
  match.players.p0.cards = [{ value: 5, color: 'red' }];
  const s = view.spectatorState();
  assert.equal(s.youId, null);
  assert.equal(s.spectator, true);
  for (const p of s.players) assert.ok(!p.cards || p.cards.every((c) => c == null || c.hidden || c.value == null), p.id);
});

test('มุมมองผู้ชมสร้างได้กับตัวละครทุกตัว (ไม่โยน error)', () => {
  const ids = CHARACTERS.filter((c) => !c.hidden).map((c) => c.id);
  for (let i = 0; i < ids.length; i += 4) {
    setup(ids.slice(i, i + 4).concat(i + 4 > ids.length ? ['muimi'] : []).slice(0, Math.max(2, Math.min(4, ids.length - i))));
    assert.doesNotThrow(() => view.spectatorState(), ids.slice(i, i + 4).join(','));
  }
});

test('Colony / Moon Cell: มุมมองผู้ชมไม่ล้ม', () => {
  setup(['muimi', 'fern'], 'ffa', 'colony');
  assert.doesNotThrow(() => view.spectatorState());
  setup(['muimi', 'fern'], 'moon', 'moon');
  assert.doesNotThrow(() => view.spectatorState());
});
