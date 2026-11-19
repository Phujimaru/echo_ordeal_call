// แม็กน่า สวิง (characters/magna.js · server/soulChain.js · GRID_PLAN §7.35)
const test = require("node:test");
const assert = require("node:assert");
const { engine } = require("../../server.js");
const match = require("../../server/match");
const mg = require("../../characters/magna");
const Chain = require("../../server/soulChain");
const cut = require("../../server/cutscene");
const combat = require("../../server/combat");
const shop = require("../../server/shop");
const action = require("../../server/phases/action");

let realQueue, realFlash, realRandom, realPause, realEnginePause;
const clips = [];
test.before(() => {
  realPause = cut.pausePlayingForCutscene;
  cut.pausePlayingForCutscene = () => {};
  realEnginePause = engine.pausePlayingForCutscene;
  engine.pausePlayingForCutscene = () => {}; // ฉากรันเองใน runFlow
  realQueue = engine.queueCutscene;
  realFlash = engine.skillFlash;
  engine.queueCutscene = (p, key) => clips.push(key);
  engine.skillFlash = () => {};
  realRandom = Math.random;
});
test.after(() => { cut.pausePlayingForCutscene = realPause; engine.pausePlayingForCutscene = realEnginePause; engine.queueCutscene = realQueue; engine.skillFlash = realFlash; Math.random = realRandom; });
test.afterEach(() => {
  engine.clearPhaseTimer(); Math.random = realRandom; engine.setGameMode("ffa");
  match.cutsceneQueue.length = 0; match.afterCutscene = []; match.skillBeats = []; match.flowWanted = false;
  clips.length = 0;
});

function clear(cx, cy, r = 10) {
  const map = engine.boardMap();
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
    delete map.terrain[`${x},${y}`];
    if (map.special) delete map.special[`${x},${y}`];
  }
}
function setup({ points = 8, mode = "ffa" } = {}) {
  for (const k of Object.keys(engine.players)) delete engine.players[k];
  const mk = (id, characterId) => {
    engine.players[id] = {
      id, name: id, characterId, avatar: 0, ready: true, skillPoints: 0, alive: true, statuses: {}, statusAmt: {},
      cards: [], inventory: [], cutsceneShown: {}, gold: 0, img: "",
    };
    return engine.players[id];
  };
  mk("a", "magna");
  mk("b", "dummy");
  mk("c", "dummy");
  engine.setGameMode(mode);
  engine.startMatch();
  engine.clearPhaseTimer();
  const p = engine.players.a, t = engine.players.b, u = engine.players.c;
  p.skillPoints = points;
  p.pos = { x: 6, y: 6 };
  t.pos = { x: 8, y: 6 };
  u.pos = { x: 6, y: 9 };
  for (const o of [t, u]) { o.hp = 50; o.armor = 0; }
  clear(9, 7);
  engine.setActor("a");
  Math.random = () => 0.99; // ไม่หลบ/ไม่คริ/ไม่ติดลุกไหม้จากติดตัว
  return { p, t, u };
}
const st = (p) => p.magna;
// เล่นฉากที่คิวไว้จนหมด (ผลหลังคลิป → จังหวะพัก)
function runFlow() {
  for (let i = 0; i < 20; i++) {
    const after = match.afterCutscene.splice(0);
    const beats = match.skillBeats.splice(0);
    if (!after.length && !beats.length) return;
    for (const fn of after) combat.withEffectSource(engine.players.a, fn);
    for (const b of beats) combat.withEffectSource(engine.players.a, b.fn);
  }
}
function nextRound(actor = "a") {
  engine.endTurn(); engine.clearPhaseTimer();
  match.roundNumber++;
  for (const q of Object.values(engine.players)) q.skillUsedRound = false;
  engine.setActor(actor);
}
function chainUp() {
  const env = setup();
  st(env.p).balls = 1;
  engine.useSkill("a", "ultimate", [], { dir: "right" });
  runFlow();
  return env;
}

test("ค่าพื้นฐาน: HP 10 / เกราะ 5 · เดิน 4 · ประชิด · ธาตุไฟทุกการกระทำ", () => {
  const { p } = setup();
  assert.equal(p.hp, 10);
  assert.equal(p.armor, 5);
  assert.deepEqual(engine.rangeOf(p), [1, 1]);
  assert.equal(engine.baseMovOf(p), 4);
  assert.equal(mg.attackElement(engine, p), "fire");
  assert.equal(mg.skillElement(engine, p, "ultimate"), "fire");
});

test("Fire Ball: 1 แต้ม · เก็บได้ 3 · ลูกที่ 4 กดไม่ได้และไม่เสียแต้ม", () => {
  const { p } = setup();
  for (let i = 0; i < 3; i++) { engine.useSkill("a", "basic", []); p.skillUsedRound = false; }
  assert.equal(st(p).balls, 3);
  assert.equal(p.skillPoints, 5);
  engine.useSkill("a", "basic", []);
  assert.equal(st(p).balls, 3);
  assert.equal(p.skillPoints, 5);
  assert.equal(engine.action.locked, true);
});

test("Baseball bat: 2 ลูก = 4 แต้ม · โดนศัตรูคนแรกในแนว ลูกละ 1 · คนหลังไม่โดน · OverHeat +1 ต่อการโจมตี", () => {
  const { p, t, u } = setup();
  u.pos = { x: 9, y: 6 };
  st(p).balls = 2;
  engine.useSkill("a", "secondary", [], { dir: "right", form: "b2" });
  assert.equal(p.skillPoints, 4);
  assert.equal(st(p).balls, 0);
  runFlow();
  assert.equal(t.hp, 48);
  assert.equal(u.hp, 50);
  assert.equal(st(p).heat, 1);
});

test("Baseball bat: ลูกไม่พอ = กดไม่ได้ ไม่เสียแต้ม · ศัตรูนอกแนว 4 ไม่โดน · คูลดาวน์ 3", () => {
  const { p, t } = setup();
  st(p).balls = 1;
  engine.useSkill("a", "secondary", [], { dir: "right", form: "b2" });
  assert.equal(p.skillPoints, 8);
  t.pos = { x: 11, y: 6 }; // ห่าง 5
  engine.useSkill("a", "secondary", [], { dir: "right", form: "b1" });
  runFlow();
  assert.equal(p.skillPoints, 6);
  assert.equal(t.hp, 50);
  assert.equal(st(p).batReady, match.roundNumber + 3);
});

test("OverHeat: 3+ ระยะตี [1, 2] · ไม่สร้างความเสียหายทั้งเทิร์น −1 · 8 = ความเสียหายที่ได้รับ −1", () => {
  const { p } = setup();
  st(p).heat = 3;
  assert.deepEqual(engine.rangeOf(p), [1, 2]);
  // ตีเทิร์นนี้ → จบเทิร์นนี้ + เทิร์นถัดไปยังไม่ลด · ไม่ตีครบเทิร์นเต็ม → ลด 1 ทุกเทิร์น
  st(p).dealtRound = match.roundNumber;
  nextRound();
  assert.equal(st(p).heat, 3);
  nextRound();
  assert.equal(st(p).heat, 3);
  nextRound();
  assert.equal(st(p).heat, 2);
  assert.deepEqual(engine.rangeOf(p), [1, 1]);
  st(p).heat = 8;
  const hp = p.hp, ar = p.armor;
  combat.withEffectSource(engine.players.b, () => engine.dealMixed(p, 2));
  assert.equal((hp + ar) - (p.hp + p.armor), 1);
});

test("OverHeat 5+: สร้างความเสียหายมีโอกาส 20% ลุกไหม้ · ลบสกิลติดตัว = ไม่เพิ่ม ไม่ลุกไหม้", () => {
  const { p, t } = setup();
  st(p).heat = 5;
  st(p).balls = 1;
  Math.random = () => 0.1; // < 20%
  engine.useSkill("a", "secondary", [], { dir: "right", form: "b1" });
  runFlow();
  assert.ok((t.statuses.hburn || 0) >= 1);
  assert.equal(st(p).heat, 6);
  // ลบสกิลติดตัว
  const env = setup();
  st(env.p).heat = 5; st(env.p).balls = 1;
  env.p.statuses.noPassive = 2;
  Math.random = () => 0.1;
  engine.useSkill("a", "secondary", [], { dir: "right", form: "b1" });
  runFlow();
  assert.equal(env.t.statuses.hburn || 0, 0);
  assert.equal(st(env.p).heat, 5);
  assert.deepEqual(engine.rangeOf(env.p), [1, 1]);
});

test("Deathmatch: 6 แต้ม + บอลไฟ · ไม่มีศัตรูในแนว/ไม่มีบอลไฟ = กดไม่ได้ · โดน = คลิป → โซ่ + แต้มกองกลาง", () => {
  const { p, t } = setup();
  engine.useSkill("a", "ultimate", [], { dir: "right" }); // ไม่มีบอลไฟ
  assert.equal(p.skillPoints, 8);
  st(p).balls = 1;
  engine.useSkill("a", "ultimate", [], { dir: "up" }); // ไม่มีศัตรู
  assert.equal(p.skillPoints, 8);
  t.skillPoints = 5;
  engine.useSkill("a", "ultimate", [], { dir: "right" });
  assert.equal(st(p).balls, 0);
  runFlow();
  assert.deepEqual(clips, ["magnaDeathmatch"]);
  assert.ok(Chain.linked(p) && Chain.partnerOf(p) === t);
  assert.equal(p.skillPoints, 7); // (8 − 6) + 5 = 7
  assert.equal(t.skillPoints, 7);
  t.skillPoints -= 3;
  assert.equal(p.skillPoints, 4);
});

test("Deathmatch: หลบพ้น = ไม่มีโซ่ · คูลดาวน์นับเลย", () => {
  const { p, t } = setup();
  st(p).balls = 1;
  t.statuses.evade = 2; t.statusAmt.evade = 100;
  engine.useSkill("a", "ultimate", [], { dir: "right" });
  runFlow();
  assert.equal(Chain.linked(p), false);
  assert.equal(st(p).ultReady, match.roundNumber + 5);
});

test("โซ่: ตี/เล็งได้แค่คู่โซ่ · คนนอกทำผลใส่ไม่ได้ · สายจูง 4 ช่อง · ปุ่มเปลี่ยน", () => {
  const { p, t, u } = setup();
  st(p).balls = 1;
  engine.useSkill("a", "ultimate", [], { dir: "right" });
  runFlow();
  // คนนอกโซ่ (u) ทำดาเมจ/ดีบัฟ/บัฟใส่ t ไม่ได้ · t ทำใส่ u ไม่ได้
  combat.withEffectSource(u, () => engine.dealMixed(t, 3));
  assert.equal(t.hp, 50);
  combat.withEffectSource(u, () => engine.applyBurn(t, 2));
  assert.equal(t.statuses.hburn || 0, 0);
  combat.withEffectSource(t, () => engine.dealMixed(u, 3));
  assert.equal(u.hp, 50);
  assert.equal(action.canStrike(t, u), false);
  u.pos = { x: 7, y: 6 };
  assert.equal(action.canStrike(p, u), false);
  assert.equal(action.canStrike(p, t), false); // ห่าง 2 · ระยะ [1, 1]
  u.pos = { x: 5, y: 7 };
  t.pos = { x: 7, y: 6 };
  assert.equal(action.canStrike(p, t), true);
  // คู่โซ่ทำดาเมจใส่กันได้
  combat.withEffectSource(p, () => engine.dealMixed(t, 2));
  assert.equal(t.hp, 48);
  // สายจูง: t เดินห่าง p เกิน 4 ไม่ได้
  engine.setActor("b");
  engine.moveTo("b", 10, 7);
  assert.deepEqual(t.pos, { x: 7, y: 6 });
  engine.moveTo("b", 9, 7);
  assert.deepEqual(t.pos, { x: 9, y: 7 });
  // ปุ่มของแม็กน่าเปลี่ยน
  engine.setActor("a");
  const s = engine.buildStateFor("a").players.find((x) => x.id === "a");
  assert.equal(s.character.basic.name, "Fire Knuckle");
  assert.equal(s.character.secondary.name, "Fire Boost");
  assert.equal(s.character.ultimate.name, "Soul Chain Finisher");
  assert.deepEqual(s.soulChain, { with: "b", by: "a" });
});

test("โซ่: ถูกผลักไกลกว่า 4 ช่องจากคู่โซ่ = หยุดที่ขอบโซ่", () => {
  const { p, t } = chainUp();
  t.pos = { x: 8, y: 6 };
  const ctx = engine.ice.begin();
  engine.ice.pushUnit(t, { x: 1, y: 0 }, ctx, 6);
  engine.ice.flush(ctx);
  assert.deepEqual(t.pos, { x: 10, y: 6 });
  assert.ok(p);
});

test("โซ่: สกิลเคลื่อนที่ / ปุ่มพุ่ง / ไอเทมช่วงจั่ว ใช้ไม่ได้", () => {
  const { t } = chainUp();
  t.characterId = "ryougi";
  assert.equal(Chain.skillBlocked(t, "ultimate", {}), true);
  t.characterId = "celine";
  assert.equal(Chain.skillBlocked(t, "basic", { form: "swap" }), true);
  assert.equal(Chain.skillBlocked(t, "basic", { form: "heal" }), false);
  t.characterId = "sliver_bullet";
  assert.equal(Chain.actionBlocked(t, "dash"), true);
  t.characterId = "dummy";
  match.gameState = "PLAYING";
  t.locked = false;
  t.statuses.fortune = 0;
  t.inventory = [{ uid: "f1", type: "fortune" }];
  shop.useDrawItem("b", "f1");
  assert.equal(t.inventory.length, 1);
  assert.equal(t.statuses.fortune || 0, 0);
});

test("โซ่: ลดความเสียหายใส่กันได้ไม่ต่ำกว่า 1 · หลายฮิตในการโจมตีเดียว = รวมแล้วลด 1", () => {
  const { p } = chainUp();
  st(p).heat = 8;
  const total = () => p.hp + p.armor;
  let before = total();
  match.cmdSeq = (match.cmdSeq || 0) + 1;
  combat.withEffectSource(engine.players.b, () => engine.dealMixed(p, 1));
  assert.equal(before - total(), 1);
  before = total();
  match.cmdSeq++;
  combat.withEffectSource(engine.players.b, () => { engine.dealMixed(p, 1); engine.dealMixed(p, 1); engine.dealMixed(p, 1); });
  assert.equal(before - total(), 2);
  before = total();
  match.cmdSeq++;
  combat.withEffectSource(engine.players.b, () => engine.dealMixed(p, 3));
  assert.equal(before - total(), 2);
});

test("โซ่: ครบ 5 เทิร์นขาด · แบ่งแต้มครึ่ง (เศษให้แม็กน่า) · คูลดาวน์ 5 นับหลังโซ่หาย · ปุ่มกลับ", () => {
  const { p, t } = chainUp();
  p.skillPoints = 5;
  const start = match.roundNumber;
  for (let i = 0; i < 4; i++) { nextRound(); assert.ok(Chain.linked(p), `เทิร์น ${i + 1}`); }
  nextRound();
  assert.equal(Chain.linked(p), false);
  assert.ok(p.skillPoints - t.skillPoints >= 0 && p.skillPoints - t.skillPoints <= 1, `${p.skillPoints}/${t.skillPoints}`);
  const mine = p.skillPoints;
  t.skillPoints = 0;
  assert.equal(p.skillPoints, mine);
  assert.equal(st(p).ultReady, start + 5 + 5);
  const s = engine.buildStateFor("a").players.find((x) => x.id === "a");
  assert.equal(s.character.ultimate.name, "Soul Chain Deathmatch");
});

test("โซ่: มีคนตาย = โซ่ขาด", () => {
  const { p, t } = chainUp();
  t.hp = 1; t.armor = 0;
  combat.withEffectSource(p, () => engine.dealMixed(t, 1));
  engine.instantDeath(t);
  assert.equal(Chain.linked(p), false);
  assert.equal(st(p).chainWith, null);
});

test("Fire Knuckle: 2 แต้ม · ไม่กินโควตา · ยังเดินได้ · ตีปกติติดลุกไหม้ 4 เทิร์น · คูลดาวน์ 5", () => {
  const { p, t } = chainUp();
  p.skillUsedRound = false;
  engine.setActor("a");
  p.skillPoints = 8;
  engine.useSkill("a", "basic", []);
  assert.equal(p.skillPoints, 6);
  assert.equal(p.skillUsedRound, false);
  assert.equal(engine.action.locked, false);
  assert.equal(st(p).knuckleReady, match.roundNumber + 5);
  t.pos = { x: 7, y: 6 };
  const labels = mg.onStrikeLanded(engine, p, t);
  assert.deepEqual(labels, ["Fire Knuckle"]);
  assert.equal(t.statuses.hburn, 1);
});

test("Fire Boost: 4 แต้ม · ตีเพิ่ม 1 ครั้งต่อตาเดิน 2 เทิร์น · หลบหลีก 35%", () => {
  const { p } = chainUp();
  p.skillUsedRound = false;
  engine.setActor("a");
  p.skillPoints = 8;
  engine.useSkill("a", "secondary", []);
  assert.equal(p.skillPoints, 4);
  assert.equal(engine.action.locked, false);
  assert.equal(mg.ownEvade(p), 35);
  assert.equal(mg.extraStrike(engine, p), true);
  assert.equal(mg.extraStrike(engine, p), false);
  nextRound();
  assert.equal(mg.extraStrike(engine, p), true);
  nextRound();
  assert.equal(mg.extraStrike(engine, p), false);
  assert.equal(mg.ownEvade(p), 0);
});

test("Finisher: ต้อง OverHeat 8 · กดแล้ว OverHeat 0 · โซ่ไม่หายเมื่อครบเวลา", () => {
  const { p } = chainUp();
  p.skillUsedRound = false;
  engine.setActor("a");
  p.skillPoints = 8;
  st(p).heat = 7;
  engine.useSkill("a", "ultimate", []);
  assert.equal(p.skillPoints, 8);
  st(p).heat = 8;
  engine.useSkill("a", "ultimate", []);
  assert.equal(p.skillPoints, 3);
  assert.equal(st(p).heat, 0);
  assert.ok(st(p).fin);
  st(p).chainEnd = match.roundNumber + 1;
  engine.endTurn(); engine.clearPhaseTimer();
  assert.ok(Chain.linked(p));
});

test("Finisher แบบ 1: คู่โซ่ทำให้เสียหาย = ยกเลิก → คลิป → เสียหาย 3 → ติดตัว = ผลัก 5 · โซ่ขาด", () => {
  const { p, t } = chainUp();
  st(p).fin = { armed: match.roundNumber, at: 1, firing: false };
  t.pos = { x: 7, y: 6 };
  const hp = p.hp + p.armor;
  combat.withEffectSource(t, () => engine.dealMixed(p, 4));
  assert.equal(p.hp + p.armor, hp);
  assert.ok(clips.includes("magnaFinisher"));
  runFlow();
  assert.equal(t.hp, 47);
  assert.equal(Chain.linked(p), false);
  assert.deepEqual(t.pos, { x: 12, y: 6 });
});

test("Finisher แบบ 2: ต้นตาเดินถัดไป → ดึงมาติดตัว → เสียหาย 3 → ผลัก 5 → ฟื้นตามลุกไหม้", () => {
  const { p, t, u } = chainUp();
  u.pos = { x: 2, y: 2 };
  t.pos = { x: 6, y: 9 }; // ห่าง 3 (ใต้)
  nextRound();
  st(p).fin = { armed: match.roundNumber - 1, at: 1, firing: false }; // กดเทิร์นที่แล้ว
  t.statuses.hburn = 3;
  p.hp = 5;
  mg.onActorReady(engine, p);
  assert.ok(clips.includes("magnaFinisher"));
  runFlow();
  assert.equal(t.hp, 47);
  assert.equal(p.hp, 7);
  assert.equal(Chain.linked(p), false);
  assert.deepEqual(t.pos, { x: 6, y: 12 }); // ดึงมาที่ (6,7) แล้วผลักลง 5
});

test("ตัดผล (severables): โซ่ / Knuckle / Boost ตัดได้", () => {
  const { p } = chainUp();
  const list = mg.severables(engine, p);
  assert.ok(list.some((x) => x.key === "chain"));
  list.find((x) => x.key === "chain").cancel();
  assert.equal(Chain.linked(p), false);
});

test("โซ่กับตัวที่สองของระบบคู่: กองแต้มติดที่เจ้าของ · ตัวคู่ยังอ่านแต้มเดียวกัน · ปลดแล้วกลับเป็นค่าปกติ", () => {
  const { p } = setup();
  const own = engine.players.b;
  own.skillPoints = 3;
  const mate = { id: "b2", name: "b2", characterId: "dummy", duoOf: "b", alive: true, statuses: {}, statusAmt: {}, pos: { x: 7, y: 6 } };
  Object.defineProperty(mate, "skillPoints", { enumerable: true, configurable: true, get: () => engine.players.b.skillPoints, set: (v) => { engine.players.b.skillPoints = v; } });
  engine.players.b2 = mate;
  p.skillPoints = 2;
  Chain.link(p, mate, 1);
  assert.equal(mate.skillPoints, 5);
  assert.equal(own.skillPoints, 5);
  mate.skillPoints = 1;
  assert.equal(p.skillPoints, 1);
  Chain.unlink(p);
  assert.equal(Object.getOwnPropertyDescriptor(own, "skillPoints").get, undefined);
  assert.equal(own.skillPoints + p.skillPoints, 1);
  delete engine.players.b2;
});

test("โซ่: เปลี่ยนพื้นที่ (แผนที่ใหม่) = คู่โซ่ถูกดึงมาติดตัวแม็กน่า", () => {
  const { p, t } = chainUp();
  assert.ok(Chain.linked(p));
  engine.placeOnBoard(match.board.area);
  assert.ok(p.pos && t.pos);
  const d = Math.abs(p.pos.x - t.pos.x) + Math.abs(p.pos.y - t.pos.y);
  assert.ok(d <= Chain.LEASH, `ระยะ ${d}`);
  assert.ok(Chain.linked(p));
});
