// Master เล่นได้ใน Eos PVE (ผู้ใช้ 2026-11-16): ลงจากฟ้า · สกิลโดนมอน ไม่โดนเพื่อน · อัญเชิญ · ฟื้นเฟส 2
const test = require("node:test");
const assert = require("node:assert/strict");
const { engine } = require("../../server.js");
const match = require("../../server/match.js");
const Fodlan = require("../../server/fodlan.js");
const S6 = require("../../server/fodlan/stage6.js");
const timers = require("../../server/timers.js");
const cut = require("../../server/cutscene");
const combat = require("../../server/combat");
const draw = require("../../server/phases/draw");
const UnitAi = require("../../server/unitAi");
const M = require("../../characters/master");

const realStart = timers.startPhaseTimer, realRandom = Math.random, realPause = cut.pausePlayingForCutscene, realQ = engine.queueCutscene, realFlash = engine.skillFlash;
test.before(() => { timers.startPhaseTimer = (s) => { match.timeLeft = Math.ceil(s); }; cut.pausePlayingForCutscene = () => {}; engine.queueCutscene = () => {}; engine.skillFlash = () => {}; UnitAi.setAiDelay(0); });
test.after(() => {
  timers.startPhaseTimer = realStart; Math.random = realRandom; cut.pausePlayingForCutscene = realPause; engine.queueCutscene = realQ; engine.skillFlash = realFlash;
  engine.clearPhaseTimer(); match.world = "earth"; match.fodlan = null; engine.setGameMode("ffa");
  for (const id of Object.keys(engine.players)) delete engine.players[id];
});

test("Master ใน Eos PVE: ลงจากฟ้า · Slam/Knockdown โดนมอนไม่โดนเพื่อน · อัญเชิญ · ฟื้นเฟส 2", () => {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  const mk = (id, characterId, position) => (engine.players[id] = { id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {}, seen: {}, inventory: [], teamId: "A", teamConfirmed: true });
  mk("m", "master", 1); mk("a", "dummy", 2);
  engine.setGameMode("eos"); match.world = "eos";
  engine.startMatch(); engine.clearPhaseTimer();
  const m = engine.players.m || match.players.m, a = match.players.a;
  assert.ok(Fodlan.isEos());
  assert.equal(m.pos, null, "ยังไม่ลง");
  m.master.spawnAt = { x: 13, y: 13 };
  for (let r = 1; r <= 3; r++) { match.roundNumber = r; combat.broadcastHook("onRoundDealt", engine); }
  assert.ok(m.master.landed && m.pos, "ลงจากฟ้าใน Eos");
  // ย้ายไปที่โล่ง: Master (13,13) · เพื่อนข้างหลัง · มอนข้างหน้า
  m.pos = { x: 13, y: 13 }; a.pos = { x: 16, y: 13 }; a.hp = 30; a.armor = 0;
  const ctx = Fodlan.makeCtx(), st = match.fodlan.s.eos;
  const mob = S6.spawnMob(ctx, st, "goblin", { x: 11, y: 13 }, { hp: 40, armor: 0, atk: 1, mov: 4, gold: 2 }, { look: 1, tier: 1 }) || S6.spawnMob(ctx, st, Object.keys(S6.MOBS || {})[0], { x: 11, y: 13 }, { hp: 40, armor: 0, atk: 1, mov: 4, gold: 2 }, { look: 1, tier: 1 });
  assert.ok(mob, "เกิดมอน");
  if (mob.summon) mob.summon.born = 0;
  const mon = engine.players[mob.id] || mob;
  Math.random = () => 0.99;
  match.roundNumber = 4; engine.setActor("m");
  const hp0 = mon.hp + (mon.armor || 0), a0 = a.hp;
  engine.useSkill("m", "basic", [], { dir: "left" });
  for (let i = 0; i < 8 && match.skillBeats.length; i++) for (const bt of match.skillBeats.splice(0)) combat.withEffectSource(m, bt.fn);
  assert.ok(mon.hp + (mon.armor || 0) < hp0, "Slam โดนมอน");
  assert.equal(a.hp, a0, "ไม่โดนเพื่อน");
  // อัญเชิญ: ทีมเดียวกับ Master
  const made = M.summonWave(engine, m);
  assert.ok(made.length > 0);
  for (const u of made) assert.ok(engine.sameTeam(u, m) && engine.sameTeam(u, a), "ตัวอัญเชิญเป็นพวกผู้เล่น");
  // ตัวอัญเชิญเล็ง/ตีมอน Eos (ผู้ใช้ 2026-11-16)
  const u0 = made[0];
  const plan = UnitAi.planTurn(u0);
  assert.equal(plan.targetId, mon.id, "ตัวอัญเชิญเล็งมอน");
  const mhp = mon.hp + (mon.armor || 0);
  if (plan.to) u0.pos = { ...plan.to };
  match.gameState = "ACTION"; match.actorId = u0.id; match.action = { locked: false, moved: true, canto: false, from: { ...u0.pos } }; u0.didAttackRound = false;
  assert.ok(require("../../server/phases/action").attackTarget(u0.id, mon.id), "ตีมอนได้");
  assert.ok(mon.hp + (mon.armor || 0) < mhp, "มอนเสียเลือด");
  match.gameState = "PLAYING"; match.actorId = null; match.action = null;
  // ตาย → ฟื้นเฟส 2
  engine.withEffectSource(mon, () => { combat.dealMixed(m, 9999); if (m.hp <= 0) combat.instantDeath(m); });
  match.roundNumber = 6; combat.broadcastHook("onRoundDealt", engine);
  match.roundNumber = 7; combat.broadcastHook("onRoundDealt", engine);
  assert.ok(m.alive && m.master.phase === 2 && m.hp > 0, "ฟื้นเฟส 2 ใน Eos");
});
