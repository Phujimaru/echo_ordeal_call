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
  // มอนจบตาติดตัว Master แต่เป้าที่เลือก (คนเลือดน้อยหลัง Master) ไปไม่ถึง = ตี Master (ผู้ใช้ 2026-11-16 "มาติดตัวแต่ไม่ตี")
  for (const u of made) { u.alive = false; u.pos = null; }
  mon.alive = false; mon.pos = null;
  m.pos = { x: 13, y: 13 }; a.pos = { x: 16, y: 13 }; a.hp = 1; a.armor = 0;
  const mob2 = S6.spawnMob(ctx, st, "daemon", { x: 12, y: 13 }, { hp: 9, armor: 0, atk: 2, mov: 1, gold: 2 }, { look: 1, tier: 1 });
  mob2.summon.born = 0; mob2.statuses.rooted = 1; // ขยับไม่ได้ — เป้าเลือดน้อยอยู่หลัง Master ไปไม่ถึง
  const mh = m.hp + (m.armor || 0);
  S6.actMonsters(ctx, st);
  assert.ok(m.hp + (m.armor || 0) < mh || a.hp < 1, "มอนที่ติดตัวต้องตี");
  if (a.hp >= 1) assert.ok(m.hp + (m.armor || 0) < mh, "ตี Master ที่ติดตัว");
  mob2.alive = false; mob2.pos = null; a.hp = 30;
  // ไม่ติดกติกากันรุม: มอน 4 ตัวรอบตัว Master ตีได้ทุกตัว (ผู้เล่นปกติโดนได้ 2 ตัว)
  m.pos = { x: 13, y: 13 }; m.hp = 25; a.pos = { x: 25, y: 25 }; a.hp = 30; // ตัว 1×1 (patch 1) · เลือดเต็ม 25 กันล้มก่อนนับ
  const ring = [[12, 13], [14, 13], [13, 12], [13, 14]].map(([x, y]) => { const r = S6.spawnMob(ctx, st, "daemon", { x, y }, { hp: 9, armor: 0, atk: 2, mov: 4, gold: 2 }, { look: 1, tier: 1 }); r.summon.born = 0; r.statuses.rooted = 1; return r; });
  const mh4 = m.hp + (m.armor || 0);
  S6.actMonsters(ctx, st);
  assert.equal(mh4 - (m.hp + (m.armor || 0)), 8, "มอน 4 ตัว × 2 = 8");
  for (const r of ring) { r.alive = false; r.pos = null; }
  // ลูกน้องอยู่ใกล้มอน = มอนสู้ลูกน้องก่อน ไม่เดินผ่านไปหาผู้เล่นที่แยกกลุ่ม (ผู้ใช้ 2026-11-16 "เดินผ่านไปตีคนอื่น")
  m.pos = { x: 25, y: 25 }; a.pos = { x: 13, y: 9 }; a.hp = 2; a.armor = 0; // ผู้เล่นเลือดน้อย = มอนปกติเลือกฆ่าก่อน
  const g = M.summonWave(engine, m)[0] || Object.values(match.players).find((u) => u.summon && u.summon.ai && u.alive);
  g.pos = { x: 13, y: 15 }; g.hp = 5; g.armor = 0;
  const mob3 = S6.spawnMob(ctx, st, "daemon", { x: 13, y: 12 }, { hp: 9, armor: 0, atk: 2, mov: 4, gold: 2 }, { look: 1, tier: 1 });
  mob3.summon.born = 0;
  const ga = a.hp, gh = g.hp;
  S6.actMonsters(ctx, st);
  assert.ok(g.hp < gh, "มอนตีลูกน้อง");
  assert.equal(a.hp, ga, "ไม่เดินผ่านไปตีผู้เล่น");
  mob3.alive = false; mob3.pos = null;
  // ตาย → ฟื้นเฟส 2
  engine.withEffectSource(mon, () => { combat.dealMixed(m, 9999); if (m.hp <= 0) combat.instantDeath(m); });
  match.roundNumber = 6; combat.broadcastHook("onRoundDealt", engine);
  match.roundNumber = 7; combat.broadcastHook("onRoundDealt", engine);
  assert.ok(m.alive && m.master.phase === 2 && m.hp > 0, "ฟื้นเฟส 2 ใน Eos");
});
