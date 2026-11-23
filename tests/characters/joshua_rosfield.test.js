// โจชัว รอสฟิลด์ (characters/joshua_rosfield.js · GRID_PLAN §7.41)
const test = require("node:test");
const assert = require("node:assert");
const { engine } = require("../../server.js");
const match = require("../../server/match");
const jo = require("../../characters/joshua_rosfield");
const Element = require("../../server/element");
const action = require("../../server/phases/action");
const aura = (u, el) => { Element.clearAura(u); u.statuses[{ fire: "elFire", ice: "elIce", water: "elWater", bolt: "elBolt" }[el]] = 2; };

const cut = require("../../server/cutscene");
const combat = require("../../server/combat");
let realQueue, realFlash, realRandom, realPause;
const queued = [];
test.before(() => {
  realPause = cut.pausePlayingForCutscene;
  cut.pausePlayingForCutscene = () => {};
  realQueue = engine.queueCutscene;
  realFlash = engine.skillFlash;
  engine.queueCutscene = (p, key) => { queued.push(key); };
  engine.skillFlash = () => {};
  realRandom = Math.random;
});
test.after(() => { cut.pausePlayingForCutscene = realPause; engine.queueCutscene = realQueue; engine.skillFlash = realFlash; Math.random = realRandom; });
test.afterEach(() => {
  engine.clearPhaseTimer(); Math.random = realRandom; engine.setGameMode("ffa");
  match.cutsceneQueue.length = 0; match.afterCutscene = []; match.skillBeats = []; queued.length = 0;
});
const runAfter = () => { for (const fn of match.afterCutscene.splice(0)) combat.withEffectSource(engine.players.a, fn); };

function clear(cx, cy, r = 9) {
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
  mk("a", "joshua_rosfield");
  mk("b", "dummy");
  mk("c", "dummy");
  engine.setGameMode(mode);
  engine.startMatch();
  engine.clearPhaseTimer();
  const p = engine.players.a, t = engine.players.b, u = engine.players.c;
  p.skillPoints = points;
  p.pos = { x: 6, y: 6 };
  t.pos = { x: 7, y: 6 };
  u.pos = { x: 3, y: 14 };
  for (const o of [t, u]) { o.hp = 50; o.armor = 0; }
  clear(9, 6);
  engine.setActor("a");
  Math.random = () => 0.99; // ไม่หลบ/ไม่คริ
  return { p, t, u };
}
const runBeats = () => { for (const b of match.skillBeats.splice(0)) combat.withEffectSource(engine.players.a, b.fn); };
function nextRound() {
  engine.endTurn(); engine.clearPhaseTimer();
  match.roundNumber++;
  for (const p of Object.values(engine.players)) p.skillUsedRound = false;
  engine.setActor("a");
}

test("ค่าพื้นฐาน: HP 6 / เกราะ 2 · เดิน 4 · ตีระยะ 1–3 · ตีปกติไม่มีธาตุ · พื้นฐานธาตุไฟ", () => {
  const { p } = setup();
  assert.equal(p.hp, 6);
  assert.equal(p.armor, 2);
  assert.equal(engine.maxHpOf(p), 6);
  assert.deepEqual(engine.rangeOf(p), [1, 3]);
  assert.equal(engine.baseMovOf(p), 4);
  assert.equal(jo.attackElement, undefined);
  assert.equal(jo.skillElement(engine, p, "basic"), "fire");
  assert.equal(jo.skillElement(engine, p, "secondary"), null);
});

test("ตีปกติ: ระยะ 3 ตีได้ · ระยะ 4 ไม่ได้ · โดน = ลุกไหม้ 1", () => {
  const { t } = setup();
  t.pos = { x: 10, y: 6 };
  assert.ok(!action.canStrike(engine.players.a, t), "ห่าง 4");
  t.pos = { x: 9, y: 6 };
  assert.ok(action.canStrike(engine.players.a, t), "ห่าง 3");
  engine.attackTarget("a", "b");
  engine.clearPhaseTimer();
  assert.equal(t.hp, 49);
  assert.equal(t.statuses.hburn, 1);
});

test("เพื่อปกป้องทุกคน: 2 แต้ม · กรวย 4 ศัตรูเสียหาย 1 + ลุกไหม้ 2 + คราบไฟ · คูลดาวน์ถึงเทิร์น N+2", () => {
  const { p, t, u } = setup();
  u.pos = { x: 9, y: 8 }; // แถว 3 ห่างแนวกลาง 2 = ในกรวย
  engine.useSkill("a", "basic", [], { dir: "right" });
  assert.equal(p.skillPoints, 6);
  assert.ok(engine.action.locked);
  runBeats();
  assert.equal(t.hp, 49);
  assert.equal(u.hp, 49);
  assert.equal(t.statuses.hburn, 2);
  assert.equal(u.statuses.hburn, 2);
  assert.equal(Element.auraOf(t), "fire");
  const r = match.roundNumber;
  assert.ok(!jo.canUseSkill(engine, p, "basic", []), "เทิร์นเดิม");
  nextRound();
  assert.ok(!jo.canUseSkill(engine, p, "basic", []), "เทิร์น N+1 ยังติดคูลดาวน์");
  nextRound();
  assert.equal(match.roundNumber, r + 2);
  assert.ok(jo.canUseSkill(engine, p, "basic", []), "เทิร์น N+2 กดได้");
});

test("เพื่อปกป้องทุกคน: เพื่อนร่วมทีมไม่โดน · นอกกรวยไม่โดน", () => {
  const { t, u } = setup({ mode: "duo" });
  const p = engine.players.a;
  p.teamId = "x"; u.teamId = "x"; t.teamId = "y";
  u.pos = { x: 8, y: 6 };
  t.pos = { x: 8, y: 8 }; // แถว 2 ห่าง 2 = นอกกรวย
  engine.useSkill("a", "basic", [], { dir: "right" });
  runBeats();
  assert.equal(u.hp, 50);
  assert.equal(t.hp, 50);
  assert.ok(!u.statuses.hburn);
});

test("พรของนกเพลิง: แต้ม = ฟื้น · ระยะ 3 · เกินระยะกดไม่ได้และไม่เสียแต้ม · สูงสุด 3 (ร่างนกเพลิง 4)", () => {
  const { p, t } = setup();
  t.hp = 4;
  t.pos = { x: 9, y: 6 };
  engine.useSkill("a", "secondary", ["b"], { form: "3" });
  assert.equal(t.hp, 7);
  assert.equal(p.skillPoints, 5);
  nextRound(); nextRound();
  t.pos = { x: 10, y: 6 };
  const before = p.skillPoints;
  engine.useSkill("a", "secondary", ["b"], { form: "1" });
  assert.equal(t.hp, 7, "ห่าง 4 = นอกระยะ");
  assert.equal(p.skillPoints, before, "ไม่เสียแต้ม");
  assert.ok(!jo.canUseSkill(engine, p, "secondary", [], { form: "4" }), "ปกติ 4 ไม่ได้");
  p.statuses.joshuaPhoenix = 3;
  assert.ok(jo.canUseSkill(engine, p, "secondary", [], { form: "4" }), "ร่างนกเพลิง 4 ได้");
  assert.equal(jo.skillPub(p, "secondary").choices.length, 4);
  delete p.statuses.joshuaPhoenix;
  p.hp = 2;
  engine.useSkill("a", "secondary", ["a"], { form: "2" });
  assert.equal(p.hp, 4, "ใช้กับตัวเองได้");
});

test("สวมร่างนกเพลิง: 4 แต้ม · ไม่กินโควตา (กดสกิลอื่นต่อได้) · 3 เทิร์น · กรวยเสียหาย 2", () => {
  const { p, t } = setup();
  engine.useSkill("a", "ultimate", []);
  assert.equal(p.skillPoints, 4);
  assert.ok(jo.phoenixOn(p));
  engine.useSkill("a", "basic", [], { dir: "right" });
  assert.equal(p.skillPoints, 2, "กดพื้นฐานต่อได้");
  runBeats();
  assert.equal(t.hp, 48);
  engine.useSkill("a", "secondary", ["a"], { form: "1" });
  assert.equal(p.skillPoints, 2, "ครั้งที่ 3 ไม่ได้ (โควตาหมด)");
  nextRound(); assert.ok(jo.phoenixOn(p));
  nextRound(); assert.ok(jo.phoenixOn(p));
  nextRound(); assert.ok(!jo.phoenixOn(p), "หมดหลัง 3 เทิร์น");
});

test("ร่างนกเพลิง: ปฏิกิริยาที่โจชัวทำ → ติดคราบไฟต่อ · ไม่มีร่าง = คราบหาย", () => {
  const { p, t } = setup();
  aura(t, "water");
  engine.useSkill("a", "basic", [], { dir: "right" });
  runBeats();
  assert.equal(Element.auraOf(t), null, "ระเหยแล้วคราบหาย");
  nextRound(); nextRound();
  p.statuses.joshuaPhoenix = 3;
  aura(t, "ice");
  engine.useSkill("a", "basic", [], { dir: "right" });
  runBeats();
  assert.equal(Element.auraOf(t), "fire", "ปะทุแล้วติดไฟต่อ");
});

test("ร่างนกเพลิง: ศัตรูโจมตีใส่ = ผู้โจมตีลุกไหม้ 1 (ครั้งเดียวต่อการโจมตี)", () => {
  const { p, t } = setup();
  p.statuses.joshuaPhoenix = 3;
  p.hp = 6; p.armor = 2;
  engine.setActor("b");
  engine.attackTarget("b", "a");
  engine.clearPhaseTimer();
  assert.equal(t.statuses.hburn, 1);
});

test("ลูกชายคนเล็ก: ลุกไหม้บนตัวเอง = ฟื้น · ปฏิกิริยาไฟบนตัวเอง = ฟื้น 2 · ลบสกิลติดตัว = ปิด", () => {
  const { p, t } = setup();
  p.hp = 3;
  engine.applyBurn(p, 2);
  const Status = require("../../characters/_universal_status");
  Status.tickBurn(engine, p);
  assert.equal(p.hp, 4, "ลุกไหม้ฟื้น 1");
  // ระเหยบนตัวโจชัว: เสียหาย 3 (เกราะ 2 ก่อน) แล้วฟื้น 2
  p.hp = 5; p.armor = 2;
  aura(p, "water");
  combat.withEffectSource(t, () => Element.apply(p, "fire", t));
  assert.equal(p.armor, 0);
  assert.equal(p.hp, 6, "5 − 1 + 2 (เพดาน 6)");
  // ลบสกิลติดตัว
  p.statuses.noPassive = 2;
  p.hp = 3; p.armor = 0;
  Status.tickBurn(engine, p);
  assert.equal(p.hp, 2, "ลุกไหม้กลับมาเสียหาย");
});

test("สวมร่างนกเพลิง: คลิปทุกครั้ง → หลังคลิป ศัตรูในระยะเดิน 4 ลุกไหม้ 2 + คราบไฟ · นอกระยะ/เพื่อนไม่โดน", () => {
  const { p, t, u } = setup({ mode: "duo" });
  const v = engine.players.c;
  p.teamId = "x"; t.teamId = "y"; v.teamId = "x";
  t.pos = { x: 9, y: 7 }; // ห่าง 4
  v.pos = { x: 6, y: 8 }; // เพื่อน ห่าง 2
  engine.useSkill("a", "ultimate", []);
  assert.deepEqual(queued, ["joshuaPhoenix"]);
  runAfter();
  assert.equal(t.statuses.hburn, 2);
  assert.equal(Element.auraOf(t), "fire");
  assert.ok(!v.statuses.hburn);
  // นอกระยะ
  for (const o of [t]) { o.statuses = {}; o.statusAmt = {}; }
  delete p.statuses.joshuaPhoenix;
  nextRound(); nextRound();
  t.pos = { x: 10, y: 7 }; // ห่าง 5
  engine.useSkill("a", "ultimate", []);
  runAfter();
  assert.ok(!t.statuses.hburn);
  assert.ok(u);
});

test("ตัดผลสกิล (severables): ร่างนกเพลิงหมดทันที", () => {
  const { p } = setup();
  engine.useSkill("a", "ultimate", []);
  const sv = jo.severables(engine, p);
  assert.equal(sv.length, 1);
  sv[0].cancel();
  assert.ok(!jo.phoenixOn(p));
  assert.deepEqual(jo.severables(engine, p), []);
});
