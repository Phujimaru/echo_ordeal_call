// บัฟเฉพาะ Eos ใช้ใน Road Trip ด้วย (ผู้ใช้สั่ง 2026-11-14 · server/pveMode.js · GRID_PLAN §8.8)
//  เฟิร์น (เกราะ 3 · Zoltraak แนว 4 · ซ่อนเร้นมานา = มอนไม่เห็น) · Ice Spike (LV ตามระยะทาง ทุก 25 กม.)
//  · ตัวเช็คกลาง isPveCoop / isPveMob / isPveBoss
process.env.JOURNEY_START_SECONDS = '0';
delete process.env.ECHO_DEV_RT_PHASE; delete process.env.ECHO_DEV_RT_KM; delete process.env.ECHO_DEV_RT_DIFF;
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const match = require('../../server/match.js');
const timers = require('../../server/timers.js');
const D = require('../../server/roadtrip/drive.js');
const F = require('../../server/roadtrip/fight.js');
const M = require('../../server/roadtrip/mobs.js');
const PVE = require('../../server/pveMode.js');
const fern = require('../../characters/fern.js');
const ice = require('../../characters/ice_spike.js');

const realStart = timers.startPhaseTimer;
let pending = null;
test.before(() => { timers.startPhaseTimer = (s, fn) => { pending = fn; }; });
test.after(() => { timers.startPhaseTimer = realStart; D.stopTick(); engine.setGameMode('ffa'); match.world = 'earth'; match.roadtrip = null; });

function setup(chars) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  chars.forEach((ch, i) => {
    engine.players['p' + i] = {
      id: 'p' + i, name: 'P' + i, position: i + 1, characterId: ch, alive: true, connected: true,
      cards: [], statuses: {}, statusAmt: {}, seen: {}, inventory: [], teamId: 'A', teamConfirmed: true,
    };
  });
  engine.setGameMode('roadtrip');
  match.world = 'roadtrip';
  match.rtDiff = 'normal';
  engine.startMatch();
  D.stopTick();
  return chars.map((_, i) => match.players['p' + i]);
}

test('ตัวเช็คกลาง: Road Trip = PVE ร่วมมือ · มอน rtmob · บอส summon.boss', () => {
  setup(['muimi']);
  assert.equal(PVE.isPveCoop(), true);
  assert.equal(PVE.pveActive(), true);
  assert.equal(PVE.isEos(), false);
  assert.equal(PVE.isPveMob({ summon: { side: 'rtmob' } }), true);
  assert.equal(PVE.isPveMob({ summon: { side: 'eosmob' } }), true);
  assert.equal(PVE.isPveMob({ summon: { side: 'rtwreck' } }), false);
  assert.equal(PVE.isPveBoss({ summon: { side: 'rtmob', boss: true } }), true);
  assert.equal(PVE.isPveBoss({ summon: { trait: 'boss' } }), true);
  assert.equal(PVE.isPveBoss({ summon: { side: 'rtmob', boss: false } }), false);
});

test('Ice Spike: LV1 ตอนออกรถ · +1 ทุก 25 กม. · เพดาน 5 · LV2 ขึ้นไปทำลายเทิร์นละ 4', () => {
  setup(['ice_spike']);
  match.roadtrip.km = 0;
  assert.equal(ice.eosLv(), 1);
  assert.equal(ice.breakLimit(), ice.BREAK_PER_TURN);
  match.roadtrip.km = 30;
  assert.equal(ice.eosLv(), 2);
  assert.equal(ice.breakLimit(), ice.EOS_BREAK_PER_TURN);
  match.roadtrip.km = 100;
  assert.equal(ice.eosLv(), 5);
  match.roadtrip.km = 900;
  assert.equal(ice.eosLv(), 5);
  assert.deepEqual(ice.eosInfo(), { lv: 5, max: 5, stack: 30, pct: 100, r: 5, pierce: true });
  assert.equal(ice.shockDmg(24), 6, 'Shock Wave เพดาน 6 ต่อครั้ง');
  assert.equal(ice.shockDmg(3), 3);
  match.roadtrip = null;
  assert.equal(ice.eosLv(), 0, 'โหมดยังไม่เริ่ม = ไม่มีบัฟ');
});

test('เฟิร์น: เกราะ 3 · เดินฐาน 5 · Zoltraak แนว 4 · ซ่อนเร้นมานา = มอนบนถนนมองไม่เห็น', () => {
  const [Fe] = setup(['fern', 'muimi']);
  assert.equal(fern.maxArmor(), 3);
  assert.equal(fern.mov(Fe), 5);
  Fe.skillPoints = 5;
  assert.deepEqual(fern.range(Fe), [1, 4]);
  assert.ok(F.begin('ambush'));
  if (pending) { const f = pending; pending = null; f(); }
  const mob = M.mobs()[0];
  assert.ok(mob, 'มีมอน');
  assert.ok(M.prey(mob).some((u) => u.id === Fe.id), 'ปกติมอนเล็งเฟิร์นได้');
  Fe.fern.conceal = { since: match.roundNumber, healAt: match.roundNumber + 1, every: 1, sever: 0 };
  assert.equal(fern.hiddenFromMobs(Fe), true);
  assert.ok(!M.prey(mob).some((u) => u.id === Fe.id), 'ซ่อนเร้นมานา: มอนไม่เล็ง');
});

