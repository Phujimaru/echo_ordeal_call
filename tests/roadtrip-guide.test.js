// Road Trip — คู่มือ (client/src/roadtrip/rtGuideData.js) ต้องตรงกับค่าจริงฝั่ง server + การ์ดมอน (view.js summon.rtMob)
process.env.JOURNEY_START_SECONDS = '0';
delete process.env.ECHO_DEV_RT_PHASE; delete process.env.ECHO_DEV_RT_KM; delete process.env.ECHO_DEV_RT_DIFF;
const test = require('node:test');
const assert = require('node:assert/strict');

const Route = require('../server/roadtrip/route.js');
const Mobs = require('../server/roadtrip/mobs.js');
const Fight = require('../server/roadtrip/fight.js');
const Drive = require('../server/roadtrip/drive.js');
const Stop = require('../server/roadtrip/stop.js');
const Stash = require('../server/roadtrip/stash.js');
const Van = require('../server/roadtrip/van.js');
const VanFun = require('../server/roadtrip/vanfun.js');
const { DIFF } = require('../server/roadtrip/diff.js');

const load = () => import('../client/src/roadtrip/rtGuideData.js');

test('คู่มือ: แคมป์ + วัตถุดิบ/อาหาร ตรงกับ server (camp.js · food.js · stash.js)', async () => {
  const G = await load();
  const Camp = require('../server/roadtrip/camp.js'), Food = require('../server/roadtrip/food.js');
  for (const k of ['voteMs', 'cdKm', 'bossGapKm', 'cookMs', 'joinMs', 'playMs', 'fireReach', 'repairHp', 'greatAt', 'sunriseMs', 'afkSecs']) assert.equal(G.RT_CAMP[k], Camp.CAMP[k], k);
  assert.equal(G.RT_CAMP.story.min, Camp.NIGHT.story.min); assert.equal(G.RT_CAMP.sing.min, Camp.NIGHT.sing.min);
  for (const k of ['heal', 'gold', 'greatGold', 'pass', 'great']) assert.equal(G.RT_CAMP.canoe[k], Camp.NIGHT.canoe[k], `canoe ${k}`);
  assert.deepEqual(G.RT_CAMP.fish, Camp.FISH); assert.deepEqual(G.RT_CAMP.chop, Camp.CHOP); assert.deepEqual(G.RT_CAMP.rest, Camp.REST); assert.equal(G.RT_CAMP.fireMax, Camp.FIRE.max);
  assert.deepEqual(G.RT_CAMP.mallow, Camp.MALLOW);
  assert.equal(G.RT_CAMP.story.evade, Camp.NIGHT.story.buff.amt); assert.equal(G.RT_CAMP.story.turns, Camp.NIGHT.story.buff.turns); assert.equal(G.RT_CAMP.story.matchGold, Camp.NIGHT.story.matchGold);
  assert.equal(G.RT_CAMP.stars.gold, Camp.STARS.gold);
  assert.equal(G.RT_CAMP.sing.heal, Camp.NIGHT.sing.heal); assert.equal(G.RT_CAMP.sing.pass, Camp.NIGHT.sing.pass); assert.equal(G.RT_CAMP.sing.great, Camp.NIGHT.sing.great);
  assert.equal(G.RT_FOOD.stack, Food.STACK); assert.equal(G.RT_FOOD.grocer, Food.GROCER_STOCK); assert.equal(G.RT_FOOD.vendor, Food.VENDOR_STOCK); assert.equal(G.RT_FOOD.greatHeal, Food.GREAT_HEAL);
  assert.deepEqual(G.RT_FOOD.feast, { min: Food.FEAST.min, guard: Food.FEAST.buff.amt, turns: Food.FEAST.buff.turns });
  assert.deepEqual(G.RT_FOOD.ing, Object.fromEntries(Object.entries(Food.ING).map(([k, v]) => [k, v.price])));
  const S = await import('../client/src/data/shop.js');
  assert.deepEqual(S.RT_RECIPES.map((r) => [r.id, r.dish, r.need]), Food.RECIPES.map((r) => [r.id, r.dish, r.need]), 'เมนูฝั่ง client ตรง server');
});

test('คู่มือ: เส้นทาง/ขับ/รางวัล/ต่อสู้ ตรงกับ server', async () => {
  const G = await load();
  assert.equal(G.RT_ROUTE.bossKm, Route.BOSS_KM);
  assert.equal(G.RT_ROUTE.regionKm, Route.REGION_KM);
  assert.equal(G.RT_ROUTE.nightKm, Route.NIGHT_KM);
  assert.deepEqual(G.RT_ROUTE.forkKm, Route.FORK_KM);
  const RT = require('../server/roadtrip');
  for (const k of ['fork', 'event']) assert.equal(G.RT_ROUTE.secs[k], RT.SECS[k], k);
  assert.equal(G.RT_DRIVE.fuelPerKm, Drive.FUEL_PER_KM);
  assert.equal(G.RT_DRIVE.emptyKmh, Drive.EMPTY_KMH);
  assert.equal(G.RT_DRIVE.nitroMs, Drive.NITRO_MS);
  assert.equal(G.RT_DRIVE.hzWarnMs, Drive.HZ_WARN_MS);
  assert.equal(G.RT_DRIVE.throttle.up, Drive.THROTTLE.up); // คันเร่ง/เบรกของคนขับ
  assert.equal(G.RT_DRIVE.throttle.down, Drive.THROTTLE.down);
  assert.deepEqual(G.RT_REWARD, Fight.REWARD);
  assert.deepEqual(G.RT_FIGHT.swerve, Fight.SWERVE);
  assert.equal(G.RT_FIGHT.roofFall, Fight.ROOF_FALL);
  assert.equal(G.RT_FIGHT.turretRange, Fight.TURRET_MANUAL_RANGE);
  assert.equal(G.RT_FIGHT.turretBase, Fight.TURRET_BASE);
  assert.equal(G.RT_FIGHT.fallDmg, Fight.FALL_DMG);
});

test('คู่มือ: ความยาก/จุดพัก/คลัง/กิจกรรมในรถ ตรงกับ server', async () => {
  const G = await load();
  assert.deepEqual(G.RT_DIFF, DIFF);
  assert.equal(G.RT_STOP.fuelPerGold, Stop.FUEL_PER_GOLD);
  assert.equal(G.RT_STOP.dogFeeds, Stop.DOG_FEEDS);
  assert.equal(G.RT_STASH.base, Stash.STASH_BASE);
  assert.equal(G.RT_BAG_CAP, Van.BAG_CAP);
  const F = VanFun.FUN;
  assert.deepEqual(G.RT_FUN.dice.antes, F.dice.antes);
  assert.equal(G.RT_FUN.dice.max, F.dice.max);
  assert.equal(G.RT_FUN.jam.lenMs, F.jam.lenMs);
  assert.deepEqual(G.RT_FUN.jam.tiers.map((t) => t.min), F.jam.tiers.map((t) => t.min));
  F.jam.tiers.forEach((t, i) => {
    const ev = t.buffs.find((b) => b.key === 'evade'), mi = t.buffs.find((b) => b.key === 'might');
    assert.equal(G.RT_FUN.jam.tiers[i].evade, ev ? ev.amt : 0);
    assert.equal(G.RT_FUN.jam.tiers[i].might, mi ? mi.amt : 0);
    assert.equal(G.RT_FUN.jam.tiers[i].turns, ev.turns);
  });
  for (const k of ['perLeg', 'max', 'heal', 'armor']) assert.equal(G.RT_FUN.grill[k], F.grill[k], `grill.${k}`);
  for (const k of ['max', 'coin', 'itemPct']) assert.equal(G.RT_FUN.spot[k], F.spot[k], `spot.${k}`);
  for (const k of ['stock', 'heal']) assert.equal(G.RT_FUN.fridge[k], F.fridge[k], `fridge.${k}`);
  for (const k of ['needMs', 'hp', 'cdMs']) assert.equal(G.RT_FUN.repair[k], F.repair[k], `repair.${k}`);
});

test('คู่มือ: สมุดมอน ตรงกับ ROSTER (ค่าฐาน + ความสามารถ) · บอส · ไล่รถทัน · ตัวคูณจำนวนผู้เล่น', async () => {
  const G = await load();
  assert.deepEqual(Object.keys(G.RT_MOBS).sort(), Object.keys(Mobs.ROSTER).sort());
  for (const [type, b] of Object.entries(Mobs.ROSTER)) {
    const c = G.RT_MOBS[type];
    for (const k of ['name', 'hp', 'armor', 'atk', 'mov', 'gold']) assert.equal(c[k], b[k], `${type}.${k}`);
    for (const k of ['fly', 'dash', 'ram', 'thorns', 'slowHit', 'phase', 'boss']) assert.equal(c[k] || 0, b[k] || 0, `${type}.${k}`);
  }
  assert.deepEqual(G.RT_BOSSES, Mobs.BOSSES);
  assert.deepEqual(G.RT_CHASERS, Mobs.CHASERS);
  assert.equal(G.RT_MOB_CAPS.atk, Mobs.ATK_CAP);
  assert.equal(G.RT_MOB_CAPS.count, Mobs.MOB_CAP);
  for (let n = 1; n <= 6; n++) { assert.equal(G.partyMul(n), Mobs.partyMul(n)); assert.equal(G.bossPartyMul(n), Mobs.bossPartyMul(n)); }
  // ทุกตัวในสมุด (ไม่ใช่บอส) อยู่ใน RT_MOB_ORDER
  assert.deepEqual([...G.RT_MOB_ORDER].sort(), Object.keys(Mobs.ROSTER).filter((t) => !Mobs.ROSTER[t].boss).sort());
  // หัวหน้า: ผลจริงของ scale ตรงกับ RT_ELITE
  const rt = { km: 0, diff: 'normal', region: { id: 'plains', loop: 0 } };
  const a = Mobs.scale(rt, Mobs.ROSTER.biker, { heroes: 2 }), e = Mobs.scale(rt, Mobs.ROSTER.biker, { heroes: 2, elite: true });
  assert.equal(e.hp, a.hp * G.RT_ELITE.hp + 2);
  assert.equal(e.atk, a.atk + G.RT_ELITE.atk);
  assert.equal(e.armor, a.armor + G.RT_ELITE.armor);
  assert.equal(e.gold, a.gold + G.RT_ELITE.gold);
});

test('การ์ดมอน: view.js ส่ง summon.side/mobType/rtMob ของมอน Road Trip (ไม่ส่งให้ยูนิตอื่น)', () => {
  const { engine } = require('../server.js');
  const match = require('../server/match.js');
  const view = require('../server/view.js');
  const RT = require('../server/roadtrip');
  const Summon = require('../server/summon.js');
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  engine.players.p0 = { id: 'p0', name: 'P0', position: 1, characterId: 'muimi', alive: true, connected: true, cards: [], statuses: {}, statusAmt: {}, seen: {}, inventory: [], teamId: 'A', teamConfirmed: true };
  engine.setGameMode('roadtrip');
  match.world = 'roadtrip';
  match.rtDiff = 'normal';
  try {
    engine.startMatch();
    Drive.stopTick();
    engine.clearPhaseTimer();
    const rt = match.roadtrip;
    const m = Mobs.spawn(rt, 'yeti', { x: 3, y: 3 }, { elite: true, born: 0, heroes: 1 });
    m.summon.role = 'saboteur';
    const st = view.buildStateFor('p0');
    const v = st.players.find((p) => p.id === m.id);
    assert.ok(v && v.summon);
    assert.equal(v.summon.side, 'rtmob');
    assert.equal(v.summon.mobType, 'yeti');
    assert.equal(v.summon.rtMob.atk, m.summon.atk);
    assert.equal(v.summon.rtMob.mov, Mobs.ROSTER.yeti.mov);
    assert.equal(v.summon.rtMob.role, 'saboteur');
    assert.equal(v.summon.rtMob.elite, true);
    assert.equal(v.summon.rtMob.boss, false);
    assert.equal(v.summon.rtMob.phase, null);
    assert.equal(v.summon.rtMob.gold, m.summon.gold);
    const me = st.players.find((p) => p.id === 'p0');
    assert.ok(!me.summon);
    Summon.remove(m);
  } finally {
    Drive.stopTick(); engine.clearPhaseTimer();
    RT.reset(); match.world = 'earth'; engine.setGameMode('ffa');
    for (const id of Object.keys(engine.players)) delete engine.players[id];
  }
});
