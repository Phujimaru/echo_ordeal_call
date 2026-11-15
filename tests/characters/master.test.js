// Master (characters/master.js · GRID_PLAN §7.34) + ธาตุใหม่ / ประเภทตัวละคร (server/element.js) + AI ตัวอัญเชิญ (server/unitAi.js)
const test = require("node:test");
const assert = require("node:assert");
const { engine } = require("../../server.js");
const match = require("../../server/match");
const combat = require("../../server/combat");
const cut = require("../../server/cutscene");
const Board = require("../../server/board");
const Element = require("../../server/element");
const UnitAi = require("../../server/unitAi");
const draw = require("../../server/phases/draw");
const action = require("../../server/phases/action");
const M = require("../../characters/master");
const echo = require("../../characters/echo");
const view = require("../../server/view");

let realPause, realQueue, realFlash, realRandom;
test.before(() => {
  realPause = cut.pausePlayingForCutscene; cut.pausePlayingForCutscene = () => {};
  realQueue = engine.queueCutscene; engine.queueCutscene = () => {};
  realFlash = engine.skillFlash; engine.skillFlash = () => {};
  realRandom = Math.random;
  UnitAi.setAiDelay(0);
});
test.after(() => {
  cut.pausePlayingForCutscene = realPause; engine.queueCutscene = realQueue; engine.skillFlash = realFlash; Math.random = realRandom;
  engine.clearPhaseTimer(); for (const id of Object.keys(engine.players)) delete engine.players[id];
});
test.afterEach(() => {
  engine.clearPhaseTimer(); Math.random = realRandom; engine.setGameMode("ffa");
  match.cutsceneQueue.length = 0; match.afterCutscene = []; match.skillBeats = [];
});

const mk = (id, characterId) => (engine.players[id] = {
  id, name: id, characterId, avatar: 0, ready: true, skillPoints: 0, alive: true, statuses: {}, statusAmt: {},
  cards: [], inventory: [], cutsceneShown: {}, gold: 0, img: "",
});
function clearMap() {
  const map = engine.boardMap();
  for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) { delete map.terrain[`${x},${y}`]; if (map.special) delete map.special[`${x},${y}`]; }
}
// Master ลงแล้วที่ (6,6) ตัว 2×2 · ศัตรูตัวประกอบ b c d
function setup({ landed = true } = {}) {
  for (const k of Object.keys(engine.players)) delete engine.players[k];
  mk("m", "master"); mk("b", "dummy"); mk("c", "dummy"); mk("d", "dummy");
  engine.startMatch();
  engine.clearPhaseTimer();
  clearMap();
  const m = engine.players.m, b = engine.players.b, c = engine.players.c, d = engine.players.d;
  if (landed) { m.master.landed = true; m.master.nextSummon = 99; m.boardSize = 2; m.pos = { x: 6, y: 6 }; }
  b.pos = { x: 1, y: 1 }; c.pos = { x: 12, y: 1 }; d.pos = { x: 1, y: 12 };
  for (const o of [b, c, d]) { o.hp = 50; o.armor = 0; }
  match.roundNumber = 4;
  engine.setActor("m");
  Math.random = () => 0.99; // ไม่หลบ/ไม่คริ
  return { m, b, c, d };
}
const runBeats = () => { for (let i = 0; i < 8 && match.skillBeats.length; i++) for (const bt of match.skillBeats.splice(0)) combat.withEffectSource(engine.players.m, bt.fn); };
function nextRound() { match.roundNumber++; for (const p of Object.values(engine.players)) p.skillUsedRound = false; engine.setActor("m"); }
const kill = (src, t) => engine.withEffectSource(src, () => { combat.dealMixed(t, 500); if (t.hp <= 0) combat.instantDeath(t); });

test("ค่าพื้นฐาน: HP 100 · เกราะ 0 · พลังโจมตี 3 · 2×2 · เดิน 9 · ไม่มีแต้ม · Zombie · Echo สวมไม่ได้", () => {
  const { m } = setup();
  assert.equal(m.hp, 100);
  assert.equal(m.armor, 0);
  assert.equal(engine.sizeOf(m), 2);
  assert.equal(engine.baseMovOf(m), 9);
  assert.equal(M.attackBaseOverride(engine, m), 3);
  assert.equal(Element.typeOf(m), "zombie");
  assert.ok(echo.BLOCKED.has("master"));
});

test("Delay Arrival: เทิร์น 1–2 ไม่อยู่บนกระดาน · ต้นเทิร์น 3 ลงจุดว่าง 2×2 + ผลักทุกคนออก 1 ช่อง · ไม่จั่วไพ่ · เดินท้ายสุด", () => {
  for (const k of Object.keys(engine.players)) delete engine.players[k];
  mk("m", "master"); mk("b", "dummy"); mk("c", "dummy");
  engine.startMatch(); engine.clearPhaseTimer();
  const m = engine.players.m;
  assert.equal(m.pos, null);
  match.roundNumber = 1; draw.dealRound(); engine.clearPhaseTimer();
  assert.equal(m.pos, null, "เทิร์น 2 ยังไม่ลง");
  assert.deepEqual(m.cards, []);
  assert.equal(m.locked, true);
  const before = { b: { ...engine.players.b.pos }, c: { ...engine.players.c.pos } };
  draw.dealRound(); engine.clearPhaseTimer();
  assert.equal(match.roundNumber, 3);
  assert.ok(m.pos, "ลงแล้ว");
  for (const id of ["b", "c"]) {
    const u = engine.players[id];
    const near = (q) => Math.abs(q.x - (m.pos.x + 0.5)) + Math.abs(q.y - (m.pos.y + 0.5));
    assert.ok(near(u.pos) >= near(before[id]) || (u.pos.x === before[id].x && u.pos.y === before[id].y), `${id} ไม่ถูกดึงเข้าหา`);
  }
  // ลำดับเดิน: Master ท้ายสุดแม้คนอื่นไพ่แตก
  engine.players.b.cards = [{ value: 10 }, { value: 10 }, { value: 9 }];
  const order = action.turnOrderOf([m, engine.players.b, engine.players.c]);
  assert.equal(order[order.length - 1], "m");
});

test("Twin Sword Slam: หนามระเบิดกรอบ 3×3 ไล่ 3 ทิศ (ตรง 3 · เฉียง 2+2) ดาเมจ 3 + พิษร้าย + คราบพิษ · คูลดาวน์ 2", () => {
  const { m, b, c, d } = setup();
  b.pos = { x: 3, y: 7 };  // ทางตรง ช่องที่ 3 แถวล่างของตัว
  c.pos = { x: 4, y: 4 };  // เฉียงขึ้นช่องที่ 2
  d.pos = { x: 0, y: 0 };  // กรอบเฉียงกรอบที่ 2
  const tiles = Board.lineTiles(engine.boardMap(), 6, 6, "left", 3, 1, 2, 0, false, 2).map((t) => `${t.x},${t.y}`).sort();
  assert.deepEqual(tiles, ["3,6", "3,7", "4,4", "4,6", "4,7", "4,9", "5,5", "5,6", "5,7", "5,8"].sort());
  engine.useSkill("m", "basic", [], { dir: "left" });
  runBeats();
  assert.equal(b.hp, 47);
  assert.equal(c.hp, 47);
  assert.equal(d.hp, 47, "ไกลสุดแฉกยังโดน");
  assert.equal(b.statuses.poison, 1);
  assert.equal(Element.auraOf(b), "poison");
  nextRound();
  assert.equal(M.skillLocks(engine, m).basic.locked, true, "คูลดาวน์");
  nextRound();
  assert.equal(M.skillLocks(engine, m).basic.locked, false);
});

test("พิษร้ายจากตีหลายครั้งซ้อนได้สูงสุด 3 เทิร์น", () => {
  const { m, b } = setup();
  for (let i = 0; i < 5; i++) M.curseHit(engine, m, b);
  assert.equal(b.statuses.poison, 3);
});

test("Knockdown Slash: กว้าง 4 ยาวสุดแผนที่ ดาเมจ 4 + ผลักถอย 1 · ลมบนคราบพิษ = กระจายพิษ", () => {
  const { m, b, c } = setup();
  b.pos = { x: 2, y: 6 }; c.pos = { x: 1, y: 5 };
  b.statuses.poison = 2; b.statuses.elPoison = 2;
  engine.useSkill("m", "secondary", [], { dir: "left" });
  runBeats();
  assert.equal(b.hp, 46);
  assert.deepEqual(b.pos, { x: 1, y: 6 });
  assert.ok((c.statuses.poison || 0) >= 2, "กระจายพิษไปศัตรูในกรอบ 5×5");
});

test("Smite: ศัตรูทุกคนเสียหาย 2 + ช็อต 3 เทิร์น · หลบได้ทีละคน", () => {
  const { b, c, d } = setup();
  let n = 0;
  Math.random = () => (n++ === 0 ? 0 : 0.99);
  b.statuses.evade = 1; b.statusAmt.evade = 50;
  engine.useSkill("m", "ultimate", [], {});
  runBeats();
  assert.equal(b.hp, 50, "b หลบพ้น");
  assert.equal(c.hp, 48);
  assert.equal(d.hp, 48);
  assert.equal(c.statuses.shock, 3);
});

test("1 สกิลต่อตา (เฟส 1)", () => {
  const { b } = setup();
  b.pos = { x: 4, y: 6 };
  engine.useSkill("m", "basic", [], { dir: "left" });
  runBeats();
  const hp = b.hp;
  engine.useSkill("m", "ultimate", [], {});
  runBeats();
  assert.equal(b.hp, hp);
});

test("ฟื้น: ดาเมจถึงตาย = เลือด 1 + สตั้น · ตายไม่ได้จนฟื้น · ต้นเทิร์นหน้า +25 → Holy · ตายอีก = ตายจริง", () => {
  const { m, b } = setup();
  kill(b, m);
  assert.equal(m.alive, true);
  assert.equal(m.hp, 1);
  assert.equal(m.statuses.stun, 1);
  kill(b, m);
  combat.instantDeath(m, true);
  assert.equal(m.alive, true, "ระหว่างรอตายไม่ได้แม้ถูกบังคับ");
  draw.dealRound(); engine.clearPhaseTimer();
  assert.equal(m.hp, 26);
  assert.equal(m.master.phase, 2);
  assert.equal(Element.typeOf(m), "holy");
  kill(b, m);
  assert.equal(m.alive, false);
});

test("A fking boss!!: คนอื่นฮีลไม่ได้ · ฮีลตัวเองได้", () => {
  const { m, b } = setup();
  m.hp = 50;
  assert.equal(engine.withEffectSource(b, () => combat.healHp(m, 5)), 0);
  assert.equal(engine.withEffectSource(m, () => combat.healHp(m, 5)), 5);
});

test("หมวด Boss: เลือก Master แล้วตัว Boss เลือกไม่ได้", () => {
  setup();
  assert.ok(view.takenUniqueChars().includes("master"));
});

test("เฟส 2: ตีปกติ 2 ครั้ง · สกิล 2 ครั้งต่อตา · Twin Sword 2 ครั้งก่อนคูลดาวน์ · ครั้งที่ 3 ใหญ่ + สตั้น · อ่อนแอ/เปราะบาง Lv2", () => {
  const { m, b } = setup();
  m.master.phase = 2; m.master.revived = true;
  b.pos = { x: 4, y: 6 };
  assert.equal(M.extraStrike(engine, m), true);
  assert.equal(M.extraStrike(engine, m), false);
  engine.useSkill("m", "basic", [], { dir: "left" }); runBeats();
  engine.useSkill("m", "basic", [], { dir: "left" }); runBeats();
  assert.equal(b.hp, 43, "3 + (3 + เปราะบาง Lv1)");
  assert.equal(b.statusAmt.weak, 2);
  assert.equal(b.statusAmt.fragile, 2);
  assert.equal(M.skillLocks(engine, m).basic.locked, true, "กด 2 ครั้งแล้วติดคูลดาวน์");
  nextRound(); nextRound();
  assert.equal(M.slamArea(m).big, true, "ครั้งที่ 3 = คลื่นใหญ่");
  engine.useSkill("m", "basic", [], { dir: "left" }); runBeats();
  assert.ok((b.statuses.stun || 0) >= 2);
});

test("ตัวอัญเชิญ: Undead 2 + Raider 1 รอบตัว · AI เดินหลังผู้เล่น · Raider ยิงกรอบ 5×5 · Undead ฟื้นครั้งเดียว · เพดาน 10", () => {
  const { m, b } = setup();
  const made = M.summonWave(engine, m);
  assert.deepEqual(made.map((u) => u.summon.masterKind), ["undead", "undead", "raider"]);
  for (const u of made) { assert.ok(u.summon.ai); assert.ok(engine.sameTeam(m, u)); }
  assert.deepEqual(UnitAi.order(), made.map((u) => u.id));
  const raider = made[2];
  raider.pos = { x: 10, y: 10 }; b.pos = { x: 12, y: 12 };
  assert.equal(engine.players.master_summon, undefined);
  const plan = UnitAi.planTurn(raider);
  assert.equal(plan.targetId, "b");
  const und = made[0];
  kill(b, und);
  assert.equal(und.alive, true); assert.equal(und.hp, 1);
  kill(b, und);
  assert.equal(und.alive, true, "ระหว่างรอฟื้นตายไม่ได้");
  match.roundNumber++;
  M.onRoundStartTick(engine, und);
  assert.equal(und.hp, 2);
  kill(b, und);
  assert.equal(und.alive, false);
  for (let i = 0; i < 5; i++) M.summonWave(engine, m);
  assert.ok(engine.summon.ofOwner("m").length <= 10);
});

test("ประเภท: Zombie ไฟ ×2 / พิษ ×0.5 ไม่ติดพิษร้าย · Holy มืด ×2.5 ไม่ติดอ่อนแอ · Metal น้ำแข็ง ×0.75 (ปัดขึ้น)", () => {
  const { m, b } = setup();
  m.hp = 100;
  engine.withEffectSource(b, () => Element.withElement("fire", () => combat.dealMixed(m, 3)));
  assert.equal(m.hp, 94);
  engine.withEffectSource(b, () => Element.withElement("poison", () => combat.dealMixed(m, 3)));
  assert.equal(m.hp, 92);
  assert.equal(require("../../characters/_universal_status").applyPoison(m, 2), false);
  m.master.phase = 2;
  engine.withEffectSource(b, () => Element.withElement("dark", () => combat.dealMixed(m, 2)));
  assert.equal(m.hp, 87);
  assert.equal(engine.withEffectSource(b, () => engine.applyDebuff(m, "weak", 1, 2)), false);
  const r = M.summonWave(engine, m)[2]; // Holy Crusader
  r.summon.utype = "metal"; r.hp = 10;
  engine.withEffectSource(b, () => Element.withElement("ice", () => combat.dealMixed(r, 2)));
  assert.equal(r.hp, 8);
});

test("ปฏิกิริยาใหม่: แสงจ้า (ตาบอด + ลบสกิลติดตัว 3) กันซ้ำ 5 เทิร์น · หลุมดำดูด/ระเบิด · หมอกพิษ · กระตุ้น ×2", () => {
  const { m, b, c, d } = setup();
  b.pos = { x: 10, y: 10 };
  engine.withEffectSource(m, () => { Element.apply(b, "light", m); Element.apply(b, "light", m); });
  assert.equal(b.statuses.blind, 3);
  assert.equal(b.statuses.noPassive, 3);
  delete b.statuses.blind;
  engine.withEffectSource(m, () => { Element.apply(b, "light", m); Element.apply(b, "light", m); });
  assert.ok(!b.statuses.blind, "กันแสงจ้าซ้ำ 5 เทิร์น");
  // หลุมดำ
  c.pos = { x: 3, y: 12 }; d.pos = { x: 1, y: 12 };
  engine.withEffectSource(m, () => { Element.apply(c, "light", m); Element.apply(c, "dark", m); });
  assert.equal((match.elemFields || []).filter((f) => f.kind === "hole").length, 1);
  Element.tickFields();
  assert.deepEqual(d.pos, { x: 2, y: 12 }, "ถูกดูดเข้า 1 ช่อง");
  assert.equal(d.hp, 49);
  assert.equal(c.hp, 48, "คนกลาง −2");
  Element.tickFields(); Element.tickFields();
  assert.equal((match.elemFields || []).length, 0, "ครบ 3 เทิร์นแล้วระเบิด");
  // กระตุ้น: ดาเมจต่อเทิร์น ×2
  d.hp = 20; d.statuses = {}; d.statuses.poison = 2;
  engine.withEffectSource(m, () => { Element.apply(d, "poison", m); Element.apply(d, "bolt", m); });
  assert.equal(d.statuses.stirred, 3);
  require("../../characters/_universal_status").tickPoison(engine, d);
  assert.equal(d.hp, 18);
  // หมอกพิษ
  b.pos = { x: 14, y: 3 }; b.statuses = {}; b.hp = 20;
  engine.withEffectSource(m, () => { Element.apply(b, "poison", m); Element.apply(b, "fire", m); });
  assert.equal(b.statuses.blind, 1);
  Element.tickFields();
  assert.equal(b.hp, 19);
});

test("เปลี่ยนแผนที่: ตัวอัญเชิญที่รอดตามไปเกิดรอบตัว Master (เลือด/สถานะเดิม) · ตัวที่ตายแล้วไม่กลับมา", () => {
  const { m, b } = setup();
  const made = M.summonWave(engine, m);
  made[0].hp = 3; made[0].statuses.poison = 2;
  kill(b, made[1]); kill(b, made[1]); // Undead ตัวที่ 2: ล้ม (รอฟื้น) — ยังมีชีวิต
  made[2].alive = false; // Raider ตายไปแล้ว
  engine.placeOnBoard(2);
  const left = engine.summon.ofOwner("m");
  assert.deepEqual(left.map((u) => u.id).sort(), [made[0].id, made[1].id].sort());
  for (const u of left) {
    assert.ok(u.pos, "ได้ที่ยืนบนแผนที่ใหม่");
    const near = Math.max(Math.abs(u.pos.x - m.pos.x), Math.abs(u.pos.y - m.pos.y));
    assert.ok(near <= 7, "เกิดรอบตัว Master");
  }
  assert.equal(made[0].hp, 3);
  assert.equal(made[0].statuses.poison, 2);
  assert.ok(!engine.players[made[2].id], "ตัวที่ตายถูกลบ");
});

test("พื้นที่: Twin Sword กรอบ 3×3 ยาวสุดแผนที่ 3 ทิศ (ครั้งที่ 3 กรอบ 5×5) · Knockdown กว้าง 4 ยาวสุดแผนที่ทั้งสองเฟส", () => {
  const { m } = setup();
  assert.deepEqual(M.slamArea(m).boxes, [99, 99, 3]);
  const map = engine.boardMap();
  const at = (b) => new Set(Board.lineTiles(map, 10, 6, "left", 99, 1, 2, 0, false, -1, 0, b).map((t) => `${t.x},${t.y}`));
  const small = at([99, 99, 3]);
  // ตรง: แถว 5–7 ไล่ถึงขอบซ้าย (x 0)
  for (let x = 0; x <= 9; x++) for (const y of [5, 6, 7]) assert.ok(small.has(`${x},${y}`), `ตรง ${x},${y}`);
  // เฉียงลงกรอบที่ 1 (x 7–9 · y 8–10) · กรอบที่ 3 (x 1–3 · y 14+ หลุดกระดาน 14 แถว) · เฉียงขึ้นกรอบที่ 1 (y 2–4)
  for (const k of ["7,8", "9,10", "7,2", "9,4", "4,11", "6,13"]) assert.ok(small.has(k), k);
  m.master.phase = 2; m.master.slamPress = 2;
  assert.deepEqual([M.slamArea(m).boxes, M.slamArea(m).big], [[99, 99, 5], true]);
  const big = at([99, 99, 5]);
  // 5×5: ตรง แถว 4–8 ถึงขอบ · เฉียงกรอบที่ 1 x 5–9 เยื้อง 5 (y 9–13 / y 0–… )
  for (let x = 0; x <= 9; x++) for (const y of [4, 5, 6, 7, 8]) assert.ok(big.has(`${x},${y}`), `ใหญ่ ${x},${y}`);
  for (const k of ["5,9", "9,13", "5,3", "9,0"]) assert.ok(big.has(k), k);
  const rows = (pad) => new Set(Board.lineTiles(engine.boardMap(), 6, 6, "left", 16, 1, 2, 0, false, 0, pad).map((t) => t.y));
  m.master.phase = 1;
  assert.equal(M.knockArea(m).pad, 1);
  assert.deepEqual([...rows(1)].sort(), [5, 6, 7, 8]);
  m.master.phase = 2;
  assert.equal(M.knockArea(m).pad, 1, "หลังฟื้นกว้าง 4 เหมือนเดิม");
  assert.ok(M.knockArea(m).len >= 26, "ยาวสุดแผนที่");
});

test("ฟื้นเป็นเฟส 2: +25 แม้ติดไร้ทางเยียวยา / เลือดไหล / ผกผัน", () => {
  const { m, b } = setup();
  kill(b, m);
  m.statuses.nohealing = 3; m.statuses.hbleed = 2; m.statuses.invert = 2;
  draw.dealRound(); engine.clearPhaseTimer();
  assert.equal(m.master.phase, 2);
  assert.equal(m.hp, 26);
});

test("ตีปกติ: กวาดแถวหน้าตัวกว้าง 4 โดนทุกคนในแถว · เป้าห่าง 2 ช่องตรงหน้า (นอกแถว) ตีไม่ได้", () => {
  const { m, b, c, d } = setup();
  const A = action;
  // Master (6,6) 2×2 · แถวหน้าซ้าย = x 5, y 5–8
  b.pos = { x: 5, y: 5 }; c.pos = { x: 5, y: 8 }; d.pos = { x: 4, y: 6 };
  match.gameState = "ACTION"; match.actorId = "m"; match.action = { locked: false, moved: true, canto: false, from: { ...m.pos } }; m.didAttackRound = false;
  assert.equal(A.canStrike(m, d), false, "ห่าง 2 ตรงหน้า = นอกแถว");
  assert.ok(A.canStrike(m, b));
  const hb = b.hp, hc = c.hp;
  assert.ok(A.attackTarget("m", "b"));
  runBeats();
  assert.ok(b.hp < hb && c.hp < hc, "โดนทั้งแถว");
});
