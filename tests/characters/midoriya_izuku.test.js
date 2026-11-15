// มิโดริยะ อิซึคุ (characters/midoriya_izuku.js · GRID_PLAN §7.33)
const test = require("node:test");
const assert = require("node:assert");
const { engine } = require("../../server.js");
const match = require("../../server/match");
const mi = require("../../characters/midoriya_izuku");
const Board = require("../../server/board");

const cut = require("../../server/cutscene");
const combat = require("../../server/combat");
let realQueue, realFlash, realRandom, realPause;
test.before(() => {
  realPause = cut.pausePlayingForCutscene;
  cut.pausePlayingForCutscene = () => {}; // จังหวะพัก (skillBeat) ค้างใน match.skillBeats ให้เทสต์รันเอง
  realQueue = engine.queueCutscene;
  realFlash = engine.skillFlash;
  engine.queueCutscene = () => {};
  engine.skillFlash = () => {};
  realRandom = Math.random;
});
test.after(() => { cut.pausePlayingForCutscene = realPause; engine.queueCutscene = realQueue; engine.skillFlash = realFlash; Math.random = realRandom; });
test.afterEach(() => {
  engine.clearPhaseTimer(); Math.random = realRandom; engine.setGameMode("ffa");
  match.cutsceneQueue.length = 0; match.afterCutscene = []; match.skillBeats = [];
});

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
  mk("a", "midoriya_izuku");
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
const smash = (form, dir = "right") => engine.useSkill("a", "basic", [], { form, dir });
const runBeats = () => { for (const b of match.skillBeats.splice(0)) combat.withEffectSource(engine.players.a, b.fn); };
function nextRound() {
  engine.endTurn(); engine.clearPhaseTimer();
  match.roundNumber++;
  for (const p of Object.values(engine.players)) p.skillUsedRound = false;
  engine.setActor("a");
}

test("ค่าพื้นฐาน: HP 10 / เกราะ 5 · เดิน 4 · ประชิด · ไม่มีท่าไม้ตาย · ตีปกตินอก Full Cowl ไม่มีธาตุ", () => {
  const { p } = setup();
  assert.equal(p.hp, 10);
  assert.equal(p.armor, 5);
  assert.deepEqual(engine.rangeOf(p), [1, 1]);
  assert.equal(engine.baseMovOf(p), 4);
  assert.equal(mi.attackElement(engine, p), null);
  assert.equal(mi.skillElement(engine, p, "basic"), "wind");
});

test("กรวย: แถว i กว้าง 2i−1 จากช่องติดตัว", () => {
  const map = engine.boardMap();
  const tiles = Board.lineTiles(map, 6, 6, "right", 3, 1, 1, 0, true).map((t) => `${t.x},${t.y}`).sort();
  assert.deepEqual(tiles, ["7,6", "8,5", "8,6", "8,7", "9,4", "9,5", "9,6", "9,7", "9,8"].sort());
});

test("Smash: ไม่ใช้แต้ม · ทุกคนในกรวยเสียหาย 5 (+บัฟพลังโจมตี) · ผลักไปสุดระยะ 5 · ตัวเองเสียหาย 5 (เกราะก่อน)", () => {
  const { p, t, u } = setup();
  u.pos = { x: 9, y: 7 };
  engine.applyBuff(p, "might", 1, 3); // บัฟพลังโจมตี: ทุกคนที่โดนได้
  smash("smash");
  assert.equal(p.skillPoints, 8);
  runBeats();
  assert.equal(t.hp, 44, "5 + บัฟ 1");
  assert.equal(u.hp, 44, "ทุกคนในแนวโดนเต็ม");
  assert.deepEqual(t.pos, { x: 11, y: 6 }, "ผลักไปแถว 5");
  assert.deepEqual(u.pos, { x: 11, y: 7 });
  assert.equal(p.armor, 0);
  assert.equal(p.hp, 10);
  assert.ok(engine.action.locked, "ใช้สกิลแล้วเดินไม่ได้");
});

test("กรวยนอกขอบไม่โดน · เพื่อนร่วมทีมไม่โดน/ไม่ถูกผลัก", () => {
  const { t, u } = setup({ mode: "duo" });
  const p = engine.players.a;
  p.teamId = "x"; u.teamId = "x"; t.teamId = "y";
  u.pos = { x: 8, y: 6 };
  t.pos = { x: 8, y: 8 }; // แถว 2 ห่างแนวกลาง 2 = นอกกรวย
  smash("detroit");
  runBeats();
  assert.equal(u.hp, 50);
  assert.deepEqual(u.pos, { x: 8, y: 6 });
  assert.equal(t.hp, 50);
});

test("Detroit Smash: กรวย 6 ทุกคน 5 · ตัวเอง 6", () => {
  const { p, t, u } = setup();
  u.pos = { x: 11, y: 4 }; // แถว 5 ห่าง 2
  smash("detroit");
  runBeats();
  assert.equal(t.hp, 45);
  assert.equal(u.hp, 45);
  assert.deepEqual(u.pos, { x: 12, y: 4 }, "ผลักไปแถว 6");
  assert.equal(p.armor, 0);
  assert.equal(p.hp, 9);
});

test("Delaware Smash: แนว 7×3 ทุกคน 3 · ตัวเอง 3 · ชนหินหยุด", () => {
  const { p, t, u } = setup();
  u.pos = { x: 10, y: 5 };
  engine.boardMap().terrain["12,5"] = "rock";
  smash("delaware");
  runBeats();
  assert.equal(t.hp, 47);
  assert.equal(u.hp, 47);
  assert.deepEqual(t.pos, { x: 13, y: 6 });
  assert.deepEqual(u.pos, { x: 11, y: 5 }, "ชนหิน = หยุด");
  assert.equal(p.armor, 2);
});

test("Smash (ปาของ): ต้องมีไอเทม (เลือกเอง) · สละไอเทม · แนว 7×1 เสียหาย 3 · ตัวเอง 2 · ไม่มีไอเทมท่าอื่นยังใช้ได้", () => {
  let { p, t } = setup();
  smash("throw:nope");
  assert.equal(match.skillBeats.length, 0, "ไม่มีไอเทม = กดไม่ได้");
  const pub = mi.skillPub(p, "basic");
  const th = pub.choices.find((c) => c.key.startsWith("throw:"));
  assert.ok(th.locked);
  assert.ok(pub.choices.filter((c) => !c.key.startsWith("throw:")).every((c) => !c.locked), "ท่าอื่นไม่ล็อก");
  smash("smash");
  runBeats();
  assert.equal(t.hp, 45, "ไม่มีไอเทมก็ใช้ Smash ได้");
  ({ p, t } = setup());
  p.inventory.push({ uid: "i1", type: "armor", value: 1, price: 3 }, { uid: "i2", type: "potion", price: 2 });
  assert.equal(mi.skillPub(p, "basic").choices.filter((c) => c.key.startsWith("throw:")).length, 2);
  smash("throw:i2");
  assert.deepEqual(p.inventory.map((i) => i.uid), ["i1"]);
  runBeats();
  assert.equal(t.hp, 47);
  assert.deepEqual(t.pos, { x: 13, y: 6 });
  assert.equal(p.armor, 3);
});

test("1,000,000%: ทุกคน 10 · ตัวเอง 14 (เลือดเต็มรอด) · เลือดไม่พอ = ตาย", () => {
  let { p, t, u } = setup();
  u.pos = { x: 12, y: 3 }; // แถว 6
  smash("million");
  runBeats();
  assert.equal(t.hp, 40);
  assert.equal(u.hp, 40);
  assert.deepEqual(u.pos, { x: 13, y: 3 });
  assert.ok(p.alive);
  assert.equal(p.hp, 1);
  ({ p, t } = setup());
  p.hp = 2; p.armor = 0;
  smash("smash");
  runBeats();
  assert.equal(t.hp, 45, "ผลลงก่อน");
  assert.ok(!p.alive, "ตายหลังใช้");
});

test("PVE: 1,000,000% 60 ทะลุเกราะ · Delaware 10 · ดาเมจเข้าตัวเองเท่าเดิม", () => {
  let { p, t, u } = setup({ mode: "eos" });
  u.pos = { x: 9, y: 6 };
  for (const o of [t, u]) { o.hp = 80; o.armor = 5; }
  smash("million");
  runBeats();
  assert.equal(t.hp, 20);
  assert.equal(t.armor, 5, "ทะลุเกราะ");
  assert.equal(u.hp, 20, "ทุกคนโดน 60");
  assert.equal(p.hp, 1);
  ({ p, t } = setup({ mode: "eos" }));
  smash("delaware");
  runBeats();
  assert.equal(t.hp, 40);
  assert.equal(p.armor, 2);
});

test("PVE: Smash 12 · ตัวเอง 2 · คูลดาวน์ 1 เทิร์น", () => {
  const { p, t } = setup({ mode: "eos" });
  clear(9, 6);
  smash("smash");
  runBeats();
  assert.equal(t.hp, 38);
  assert.equal(p.armor, 3, "ตัวเอง 2");
  nextRound();
  t.pos = { x: 7, y: 6 };
  smash("smash");
  assert.equal(match.skillBeats.length, 1, "คูลดาวน์ 1 = ใช้ได้เทิร์นถัดไป");
});

test("PVE: Detroit 22 ทะลุเกราะ · ผลักไปชนก่อนสุดระยะ = เพิ่ม 6 · ไม่ชน = ไม่เพิ่ม", () => {
  const { p, t, u } = setup({ mode: "eos" });
  clear(9, 6);
  engine.boardMap().terrain["10,6"] = "rock";
  u.pos = { x: 9, y: 5 }; // แถว 3 · ผลักถึงแถว 6 ไม่ชน
  t.armor = 4;
  smash("detroit");
  runBeats();
  assert.equal(t.hp, 22, "22 + ชน 6");
  assert.equal(t.armor, 4, "ทะลุเกราะ");
  assert.deepEqual(t.pos, { x: 9, y: 6 }, "ชนหินหยุด");
  assert.equal(u.hp, 28, "ไม่ชน = 22");
  assert.deepEqual(u.pos, { x: 12, y: 5 });
  assert.equal(p.armor, 0);
  assert.equal(p.hp, 9, "ตัวเอง 6");
});

test("PVE: ระหว่าง Full Cowl ทุก Smash +4 · เกมปกติไม่เพิ่ม", () => {
  let { p, t } = setup({ mode: "eos" });
  engine.useSkill("a", "secondary", []);
  assert.equal(mi.powerOf(p, mi.FORMS.smash), 16);
  assert.equal(mi.powerOf(p, mi.FORMS.million), 64);
  nextRound();
  p.pos = { x: 6, y: 6 }; t.pos = { x: 7, y: 6 };
  smash("smash");
  runBeats();
  assert.equal(t.hp, 34);
  ({ p } = setup());
  engine.useSkill("a", "secondary", []);
  assert.equal(mi.powerOf(p, mi.FORMS.smash), 5);
});


test("คูลดาวน์แยกแบบละ 2 เทิร์น · 1 สกิลต่อเทิร์น", () => {
  const { t } = setup();
  smash("smash");
  runBeats();
  smash("detroit");
  assert.equal(match.skillBeats.length, 0, "โควตา 1 สกิลต่อเทิร์น");
  nextRound();
  t.pos = { x: 7, y: 6 };
  smash("smash");
  assert.equal(match.skillBeats.length, 0, "Smash ติดคูลดาวน์");
  smash("detroit");
  assert.equal(match.skillBeats.length, 1, "แบบอื่นใช้ได้");
  runBeats();
  nextRound();
  smash("smash");
  assert.equal(match.skillBeats.length, 1, "ครบ 2 เทิร์น Smash ใช้ได้อีก");
});

test("Full Cowl: 6 แต้ม · ล้างดีบัฟ 2 อันล่าสุด · ต้านสถานะ 3 · ดาเมจเข้าตัวเอง −2 · เยียวยา 2/เทิร์น · 5 เทิร์น · คูลดาวน์ 3 หลังหมด", () => {
  const { p } = setup();
  engine.applyDebuff(p, "weak", 1, 3);
  engine.applyDebuff(p, "slow", null, 3);
  engine.applyDebuff(p, "blind", null, 3);
  engine.useSkill("a", "secondary", []);
  assert.equal(p.skillPoints, 2);
  assert.ok(p.statuses.resist > 0);
  assert.ok(mi.cowlOn(p));
  assert.equal(mi.recoilOf(p, mi.FORMS.smash), 3);
  assert.equal(mi.recoilOf(p, mi.FORMS.throw), 0);
  assert.equal(p.statuses.mend, 5);
  // เยียวยา ×2
  p.hp = 4;
  engine.tickMend(engine, p);
  assert.equal(p.hp, 6);
  for (let i = 0; i < 4; i++) nextRound();
  assert.ok(mi.cowlOn(p), "ยังอยู่เทิร์นที่ 5");
  nextRound();
  assert.ok(!mi.cowlOn(p), "หมดหลัง 5 เทิร์น");
  p.skillPoints = 8;
  engine.useSkill("a", "secondary", []);
  assert.equal(p.skillPoints, 8, "คูลดาวน์");
  nextRound(); nextRound(); nextRound();
  engine.useSkill("a", "secondary", []);
  assert.equal(p.skillPoints, 2, "ครบ 3 เทิร์นหลังหมดผล");
});

test("Full Cowl ล้างดีบัฟ 2 อันที่โดนล่าสุด", () => {
  const { p } = setup();
  engine.applyDebuff(p, "weak", 1, 3);
  engine.applyDebuff(p, "fragile", 1, 3);
  engine.applyDebuff(p, "discord", null, 3);
  const before = Object.keys(p.statuses).filter((k) => ["weak", "fragile", "discord"].includes(k));
  assert.equal(before.length, 3);
  engine.useSkill("a", "secondary", []);
  const left = ["weak", "fragile", "discord"].filter((k) => p.statuses[k] > 0);
  assert.ok(left.length <= 1);
  if (left.length === 1) assert.equal(left[0], "weak", "อันเก่าสุดค้าง");
});

test("Full Cowl PVE: ดาเมจเข้าตัวเอง −3", () => {
  const { p } = setup({ mode: "eos" });
  engine.useSkill("a", "secondary", []);
  assert.equal(mi.recoilOf(p, mi.FORMS.smash), 0, "Smash PVE 2 − 3");
  assert.equal(mi.recoilOf(p, mi.FORMS.detroit), 3);
  assert.equal(mi.recoilOf(p, mi.FORMS.million), 11);
});

test("One for All: ระหว่าง Full Cowl ตีปกติ/Smash เป็นลม แล้วติดคราบไฟฟ้า · นอก Full Cowl Smash ไม่ติดไฟฟ้า", () => {
  let { p, t } = setup();
  smash("smash");
  runBeats();
  assert.ok(!(t.statuses.elBolt > 0), "ลมไม่ติดคราบ");
  ({ p, t } = setup());
  engine.useSkill("a", "secondary", []);
  assert.equal(mi.attackElement(engine, p), "wind");
  assert.equal(mi.attackStyle(p), "midoriyaPunchCowl");
  engine.attackTarget("a", "b");
  engine.clearPhaseTimer();
  assert.ok(t.statuses.elBolt > 0, "ตีปกติ: ไฟฟ้าตาม");
  nextRound();
  const u = engine.players.c;
  u.pos = { x: 7, y: 6 };
  smash("smash");
  runBeats();
  assert.ok(u.statuses.elBolt > 0, "Smash: ไฟฟ้าตาม");
});

test("ลบสกิลติดตัว: เยียวยาไม่คูณ · ไม่ติดไฟฟ้าตาม", () => {
  const { p, t } = setup();
  engine.useSkill("a", "secondary", []);
  p.statuses.noPassive = 2;
  p.hp = 4;
  engine.tickMend(engine, p);
  assert.equal(p.hp, 5);
  engine.attackTarget("a", "b");
  engine.clearPhaseTimer();
  assert.ok(!(t.statuses.elBolt > 0));
});

test("ตัดผลสกิล (severables): Full Cowl → เข้าคูลดาวน์", () => {
  const { p } = setup();
  engine.useSkill("a", "secondary", []);
  const list = mi.severables(engine, p);
  assert.equal(list.length, 1);
  list[0].cancel();
  assert.ok(!mi.cowlOn(p));
  assert.equal(mi.midoriyaState(engine, p).cowlCd, 3);
  assert.deepEqual(mi.severables(engine, p), []);
});

test("ปุ่ม: 5 แบบ ทุกตัวเลือกมี desc · สกิลพื้นฐานฟรีแม้แต้ม 0", () => {
  const { p, t } = setup({ points: 0 });
  const pub = mi.skillPub(p, "basic");
  assert.deepEqual(pub.choices.map((c) => c.key), ["smash", "throw:none", "detroit", "delaware", "million"]);
  assert.ok(pub.choices.every((c) => c.desc));
  smash("smash");
  runBeats();
  assert.equal(t.hp, 45);
  assert.equal(p.skillPoints, 0);
});

test("นอกตาตัวเอง/ไม่ได้เลือกทิศ = กดไม่ได้ ไม่เสียอะไร", () => {
  const { p } = setup();
  engine.useSkill("a", "basic", [], { form: "smash" });
  assert.equal(match.skillBeats.length, 0);
  engine.setActor("b");
  smash("smash");
  assert.equal(match.skillBeats.length, 0);
  assert.equal(p.armor, 5);
});
