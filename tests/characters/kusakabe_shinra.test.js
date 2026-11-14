// คุซาคาเบะ ชินระ (characters/kusakabe_shinra.js · GRID_PLAN §7.32)
const test = require("node:test");
const assert = require("node:assert");
const { engine } = require("../../server.js");
const match = require("../../server/match");
const sh = require("../../characters/kusakabe_shinra");

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

function clear(cx, cy, r = 7) {
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
  mk("a", "kusakabe_shinra");
  mk("b", "dummy");
  mk("c", "dummy");
  engine.setGameMode(mode);
  engine.startMatch();
  engine.clearPhaseTimer();
  const p = engine.players.a, t = engine.players.b, u = engine.players.c;
  p.skillPoints = points;
  p.pos = { x: 6, y: 6 };
  t.pos = { x: 7, y: 6 };
  u.pos = { x: 12, y: 12 };
  for (const o of [t, u]) { o.hp = 9; o.armor = 0; }
  clear(6, 6);
  engine.setActor("a");
  Math.random = () => 0.99; // ไม่หลบ/ไม่คริ
  return { p, t, u };
}
const use = (tier, form, extra = {}) => engine.useSkill("a", tier, extra.targets || [], { form, ...extra });
const runBeats = () => { for (const b of match.skillBeats.splice(0)) combat.withEffectSource(engine.players.a, b.fn); };
const ember = (p) => p.shinra.ember;
function nextRound() {
  engine.endTurn(); engine.clearPhaseTimer();
  match.roundNumber++;
  for (const p of Object.values(engine.players)) p.skillUsedRound = false;
  for (const p of Object.values(engine.players)) if (p.alive) sh.onRoundStartTick(engine, p);
}

test("ค่าพื้นฐาน: 7/3 (+โบนัสกลาง) · เดิน 4 · ประชิด · เปลวเพลงเริ่ม 5/5 · ตีปกติธาตุไฟ", () => {
  const { p } = setup();
  assert.deepEqual(engine.rangeOf(p), [1, 1]);
  assert.equal(engine.baseMovOf(p), 4);
  assert.equal(ember(p), 5);
  assert.equal(sh.attackElement(engine, p), "fire");
  assert.equal(sh.attackStyle(p), "shinraKick");
});

test("ตีปกติ: ใช้เปลวเพลง 1 + ติดลุกไหม้ 1 · เปลวเพลง 0 ยังตีได้แต่ไม่ติดลุกไหม้", () => {
  const { p, t } = setup();
  engine.attackTarget("a", "b");
  engine.clearPhaseTimer();
  assert.equal(ember(p), 4);
  assert.equal(t.statuses.hburn, 1);
  // เปลวเพลงหมด
  delete t.statuses.hburn;
  p.shinra.ember = 0;
  engine.setActor("a");
  engine.attackTarget("a", "b");
  engine.clearPhaseTimer();
  assert.equal(ember(p), 0);
  assert.ok(!t.statuses.hburn, "ไม่มีเปลวเพลง = ไม่ติดลุกไหม้");
});

test("ฟื้นเปลวเพลง +1 ต่อเทิร์น ไม่เกิน 5 · ลุกไหม้บนตัวเองฟื้นพลังชีวิต", () => {
  const { p } = setup();
  p.shinra.ember = 3;
  p.hp = 4;
  p.statuses.hburn = 2;
  nextRound();
  assert.equal(ember(p), 4);
  const { tickBurn } = require("../../characters/_universal_status");
  tickBurn(engine, p);
  assert.equal(p.hp, 5, "ลุกไหม้ = ฟื้น +1");
  assert.equal(p.statuses.hburn, 1);
  p.shinra.ember = 5;
  nextRound();
  assert.equal(ember(p), 5);
});

test("ลบสกิลติดตัว: ไม่ฟื้นเปลวเพลง · ตีปกติไม่ใช้/ไม่ติดลุกไหม้ · ลุกไหม้ทำดาเมจ", () => {
  const { p, t } = setup();
  p.statuses.noPassive = 2;
  assert.equal(sh.hburnHeals(p), false);
  engine.attackTarget("a", "b");
  engine.clearPhaseTimer();
  assert.equal(ember(p), 5);
  assert.ok(!t.statuses.hburn);
});

test("ฉันนี่แหละฮีโร่: จ่ายแต้ม 3 หรือเปลวเพลง 2 · ระยะเดิน +2 อยู่ 3 เทิร์น · ใช้สกิลหลังเดินแล้วยังเดินต่อได้", () => {
  const { p } = setup();
  engine.moveTo("a", 6, 8); // เดิน 2
  use("basic", "ember");
  assert.equal(ember(p), 3);
  assert.equal(p.skillPoints, 8, "จ่ายด้วยเปลวเพลง = ไม่เสียแต้ม");
  assert.equal(engine.baseMovOf(p), 6);
  assert.equal(engine.action.locked, false, "ไม่หยุดเดิน");
  assert.deepEqual(engine.action.from, { x: 6, y: 8 }, "เดินต่อจากช่องที่ยืน");
  // ระยะที่เหลือ = (4 + 2) − 2 = 4
  assert.equal(engine.movOf(p), 4);
  engine.moveTo("a", 6, 12);
  assert.deepEqual(p.pos, { x: 6, y: 12 });
  // 3 เทิร์น
  nextRound(); assert.equal(engine.baseMovOf(p), 6);
  nextRound(); assert.equal(engine.baseMovOf(p), 6);
  nextRound(); assert.equal(engine.baseMovOf(p), 4);
});

test("ฉันนี่แหละฮีโร่: จ่ายแต้ม 3 · เปลวเพลงไม่พอ = กดตัวเลือกเปลวเพลงไม่ได้", () => {
  const { p } = setup();
  p.shinra.ember = 1;
  use("basic", "ember");
  assert.ok(!p.skillUsedRound);
  assert.ok(!sh.heroOn(p));
  use("basic", "sp");
  assert.equal(p.skillPoints, 5);
  assert.ok(sh.heroOn(p));
});

test("ไม่มีฮีโร่ = ใช้สกิลแล้วหยุดเดินตามปกติ", () => {
  const { p } = setup();
  use("secondary", "sp");
  assert.equal(engine.action.locked, true);
  assert.equal(p.skillPoints, 4);
});

test("อุ้งเท้าปีศาจ: รอบตัว 3×3 รวมแนวทแยง · เสียหาย 2 · เพื่อนร่วมทีมไม่โดน · ธาตุไฟ", () => {
  const { p, t, u } = setup();
  u.pos = { x: 7, y: 7 }; // ทแยง
  use("secondary", "ember");
  assert.equal(ember(p), 2);
  runBeats();
  assert.equal(t.hp, 7);
  assert.equal(u.hp, 7);
  assert.ok(t.statuses.elFire > 0, "ติดคราบไฟ");
});

test("อุ้งเท้าปีศาจ: โหมดทีม เพื่อนร่วมทีมไม่โดน", () => {
  const { p, t, u } = setup({ mode: "duo" });
  p.teamId = "x"; t.teamId = "x"; u.teamId = "y";
  u.pos = { x: 5, y: 5 };
  use("secondary", "sp");
  runBeats();
  assert.equal(t.hp, 9);
  assert.equal(u.hp, 7);
});

test("อุ่นเครื่องพอแล้ว: 6 แต้ม · ลุกไหม้ตัวเอง 5 (ข้ามต้านสถานะ) · เปลวเพลงสูงสุด 8 ฟื้น +2 · ตีปกติลุกไหม้ 2 · หมดแล้วตัดเหลือ 5", () => {
  const { p, t } = setup();
  p.statuses.resist = 2;
  use("ultimate", "warm");
  assert.equal(p.skillPoints, 2);
  assert.equal(p.statuses.hburn, 5);
  assert.equal(ember(p), 5, "ไม่เติมตอนกด");
  nextRound(); assert.equal(ember(p), 7);
  nextRound(); assert.equal(ember(p), 8);
  engine.setActor("a");
  engine.attackTarget("a", "b");
  engine.clearPhaseTimer();
  assert.equal(t.statuses.hburn, 2);
  assert.equal(sh.attackStyle(p), "shinraKickBlaze");
  p.shinra.ember = 8;
  nextRound(); nextRound(); nextRound();
  assert.ok(!sh.warmOn(p));
  assert.ok(ember(p) <= 5, "หมดเวลา = ตัดเหลือ 5");
});

test("ลาทัม: ต้องมีไอเทม · 3 แต้ม + 4 เปลวเพลง · สละไอเทม · พุ่งไปโผล่ปลายแนว · ดาเมจ = ราคา · ล้างต้านสถานะแล้วติดลุกไหม้ 2 · แม่นยำ 2 เทิร์น", () => {
  const { p, t, u } = setup();
  u.pos = { x: 9, y: 6 };
  t.statuses.resist = 2;
  use("ultimate", "latom:nope", { dir: "right" });
  assert.equal(p.skillPoints, 8, "ไม่มีไอเทม = กดไม่ได้");
  p.inventory.push({ uid: "i1", type: "armor", value: 1, price: 3 });
  use("ultimate", "latom:i1", { dir: "right" });
  assert.equal(p.skillPoints, 5);
  assert.equal(ember(p), 1);
  assert.equal(p.inventory.length, 0);
  assert.ok(p.statuses.accurate > 0);
  assert.deepEqual(p.pos, { x: 12, y: 6 }, "โผล่ปลายแนว 6 ช่อง");
  runBeats();
  console.log("DBG", t.hp, t.armor, sh.warmOn(p), p.skillPoints, JSON.stringify(t.statuses), match.lastLog.slice(-6));
  assert.equal(t.hp, 6);
  assert.equal(u.hp, 6);
  assert.ok(!t.statuses.resist, "ต้านสถานะถูกล้าง");
  assert.equal(t.statuses.hburn, 2);
  // คูลดาวน์ 2 เทิร์น
  p.inventory.push({ uid: "i2", type: "armor", value: 1, price: 3 });
  p.shinra.ember = 8;
  nextRound(); engine.setActor("a");
  use("ultimate", "latom:i2", { dir: "left" });
  assert.equal(p.inventory.length, 1, "ติดคูลดาวน์");
});

test("ลาทัม: สิ่งกีดขวางหยุดแนว · ช่องปลายมีคน = ลงช่องว่างก่อนหน้า", () => {
  const { p, t, u } = setup();
  engine.boardMap().terrain["10,6"] = "rock";
  u.pos = { x: 9, y: 6 };
  p.inventory.push({ uid: "i1", type: "armor", value: 1, price: 3 });
  use("ultimate", "latom:i1", { dir: "right" });
  assert.deepEqual(p.pos, { x: 8, y: 6 });
  runBeats();
  assert.equal(t.hp, 6);
  assert.equal(u.hp, 6);
});

test("ลาทัม: PVP เพดาน 5 · PVE ไม่จำกัด", () => {
  let { p, t } = setup();
  p.inventory.push({ uid: "i1", type: "lifeCrystal", price: 15 });
  use("ultimate", "latom:i1", { dir: "right" });
  runBeats();
  assert.equal(t.hp, 4);
  ({ p, t } = setup({ mode: "eos" }));
  t.hp = 30;
  p.inventory.push({ uid: "i1", type: "lifeCrystal", price: 15 });
  use("ultimate", "latom:i1", { dir: "right" });
  runBeats();
  assert.equal(t.hp, 15);
});

test("ลาทัม เกิดปฏิกิริยา → มอดไหม้จากภายใน 2 เทิร์น: ตีปกติระเบิดลุกไหม้เป็นดาเมจ (PVP ≤ 4) แล้วลบที่ระเบิด", () => {
  const { p, t } = setup();
  t.statuses.elIce = 2; // คราบน้ำแข็ง → ไฟ = ปะทุ
  p.inventory.push({ uid: "i1", type: "armor", value: 1, price: 3 });
  use("ultimate", "latom:i1", { dir: "right" });
  runBeats();
  assert.ok(sh.smolderOn(p), "ได้มอดไหม้จากภายใน");
  // กลับไปประชิดแล้วตี
  t.hp = 20; t.armor = 0;
  t.statuses.hburn = 6;
  delete t.statuses.elFire; delete t.statuses.elIce;
  t.pos = { x: 11, y: 6 };
  engine.setActor("a");
  engine.attackTarget("a", "b");
  engine.clearPhaseTimer();
  assert.equal(t.hp, 20 - 1 - 4, "ตีปกติ 1 + ระเบิด 4");
  assert.equal(t.statuses.hburn, 2 + 1, "ค้าง 2 + ลุกไหม้ใหม่ 1");
  nextRound(); nextRound();
  assert.ok(!sh.smolderOn(p));
});

test("ไม่เกิดปฏิกิริยา = ไม่มีมอดไหม้จากภายใน", () => {
  const { p } = setup();
  p.inventory.push({ uid: "i1", type: "armor", value: 1, price: 3 });
  use("ultimate", "latom:i1", { dir: "right" });
  runBeats();
  assert.ok(!sh.smolderOn(p));
});

test("ตัดผลสกิล (severables): ฮีโร่ / อุ่นเครื่อง / มอดไหม้", () => {
  const { p } = setup();
  use("basic", "sp");
  const list = sh.severables(engine, p);
  assert.deepEqual(list.map((x) => x.key), ["hero"]);
  list[0].cancel();
  assert.ok(!sh.heroOn(p));
});

test("ปุ่มตัวเลือก: พื้นฐาน/รอง 2 แบบ · ท่าไม้ตาย = อุ่นเครื่อง + ลาทัมตามไอเทม", () => {
  const { p } = setup();
  p.inventory.push({ uid: "i1", type: "armor", value: 1, price: 3 }, { uid: "i2", type: "cleanse", price: 3 });
  assert.deepEqual(sh.skillPub(p, "basic").choices.map((c) => c.key), ["sp", "ember"]);
  assert.deepEqual(sh.skillPub(p, "ultimate").choices.map((c) => c.key), ["warm", "latom:i1", "latom:i2"]);
  for (const t of ["basic", "secondary", "ultimate"]) for (const c of sh.skillPub(p, t).choices) assert.ok(c.desc, `${t} ${c.key} มี desc`);
});

test("อุ่นเครื่องพอแล้วเสริมสกิล: ฮีโร่ระยะเดิน +3 ใช้ 1 เปลวเพลง · อุ้งเท้าปีศาจเสียหาย 3 + ลุกไหม้ 1 · เพลง inferno", () => {
  const { p, t } = setup({ points: 12 });
  p.skillPoints = 12;
  use("ultimate", "warm");
  assert.deepEqual(sh.skillMusic(engine, p).music, "shinra_inferno");
  nextRound(); engine.setActor("a");
  const before = ember(p);
  use("basic", "ember");
  assert.equal(ember(p), before - 1);
  assert.equal(engine.baseMovOf(p), 7);
  nextRound(); engine.setActor("a");
  delete t.statuses.hburn;
  use("secondary", "sp");
  runBeats();
  assert.equal(t.hp, 6);
  assert.equal(t.statuses.hburn, 1);
});
