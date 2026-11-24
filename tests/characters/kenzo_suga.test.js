const test = require("node:test");
const assert = require("node:assert");
const { engine } = require("../../server.js");
const kenzo = require("../../characters/kenzo_suga");

const clips = [];
const sounds = [];
let realQueue, realFlash, realRandom, realSfx;
test.before(() => {
  realQueue = engine.queueCutscene;
  realFlash = engine.skillFlash;
  realSfx = engine.sfx;
  engine.queueCutscene = (p, k) => { clips.push(k); };
  engine.skillFlash = () => {};
  engine.sfx = (k) => { sounds.push(k); };
  realRandom = Math.random;
});
test.after(() => { engine.queueCutscene = realQueue; engine.skillFlash = realFlash; engine.sfx = realSfx; Math.random = realRandom; });
test.afterEach(() => { engine.clearPhaseTimer(); Math.random = realRandom; clips.length = 0; sounds.length = 0; });

function setup({ points = 8, dist = 3 } = {}) {
  for (const k of Object.keys(engine.players)) delete engine.players[k];
  const mk = (id, characterId) => {
    engine.players[id] = {
      id, name: id, characterId, avatar: 0, ready: true, skillPoints: 0, alive: true, statuses: {}, statusAmt: {},
      cards: [], inventory: [], cutsceneShown: {}, gold: 0, img: "",
    };
    return engine.players[id];
  };
  mk("a", "kenzo_suga");
  mk("b", "dummy");
  engine.startMatch();
  engine.clearPhaseTimer();
  const p = engine.players.a, t = engine.players.b;
  p.skillPoints = points;
  p.pos = { x: 2, y: 2 };
  t.pos = { x: 2 + dist, y: 2 };
  t.hp = 10; t.armor = 0;
  engine.setActor("a");
  return { p, t };
}
const gun = (form) => engine.useSkill("a", "basic", [], { form });
function rider(opts) { const r = setup(opts); gun("henshin"); engine.setActor("a"); clips.length = 0; sounds.length = 0; return r; }

test("ค่าตั้งต้น: เลือด 10 เกราะ 5 · ระยะ 1–3 · มีแค่ปุ่ม Bake Magnum", () => {
  const { p } = setup();
  assert.equal(engine.maxHpOf(p), 10);
  assert.equal(p.armor, 5);
  const me = engine.buildStateFor("a").players.find((x) => x.id === "a");
  assert.ok(me.character.basic);
  assert.equal(me.character.secondary, null);
  assert.equal(me.character.ultimate, null);
  assert.deepEqual(me.kenzo, { rider: false, henshinShown: false });
});

test("แปลงร่าง: คลิปครั้งแรกเท่านั้น ไม่มีเสียงทับคลิป · ฟรี ไม่กินโควตา · คืนร่างได้", () => {
  const { p } = setup({ points: 3 });
  gun("henshin");
  assert.deepEqual(clips, [kenzo.CUT.henshin]);
  assert.deepEqual(sounds, [], "ครั้งแรกมีคลิป — ไม่มีเสียงซ้อน");
  assert.equal(p.kenzo.rider, true);
  assert.equal(p.skillPoints, 3);
  assert.ok(!p.skillUsedRound);
  assert.equal(engine.action.locked, true, "ใช้สกิลแล้วเดินไม่ได้ (กฎกลาง)");
  engine.setActor("a");
  gun("henshin"); // แปลงซ้ำไม่ได้
  gun("revert");
  assert.equal(p.kenzo.rider, false);
  assert.ok(sounds.includes("bake_eject"));
  engine.setActor("a");
  clips.length = 0; sounds.length = 0;
  gun("henshin");
  assert.deepEqual(clips, [], "ครั้งที่สองไม่มีคลิป");
  assert.deepEqual(sounds, ["bake_henshin"]);
  assert.equal(p.kenzo.rider, true);
});

test("ตีปกติระยะ 3 ได้ · ระยะ 4 ไม่ได้", () => {
  setup({ dist: 3 });
  assert.ok(engine.attackTarget("a", "b"));
  engine.clearPhaseTimer();
  setup({ dist: 4 });
  assert.ok(!engine.attackTarget("a", "b"));
});

test("ร่างมนุษย์ตีโดน: ไม่ติดการกัดกิน/ผุพัง", () => {
  Math.random = () => 0;
  const { t } = setup();
  t.statuses = {};
  engine.attackTarget("a", "b");
  engine.clearPhaseTimer();
  assert.equal(t.statuses.kenzoCorrode || 0, 0);
  assert.equal(t.statuses.decay || 0, 0);
});

test("ร่างไรเดอร์ตีโดน: การกัดกินสะสม · ผุพัง 30% · พลังโจมตีของเป้าลด", () => {
  Math.random = () => 0.99; // หลบไม่ได้ · ไม่ติดผุพัง · ไม่ได้ยิงซ้ำ
  const { t } = rider();
  t.hp = 10;
  engine.attackTarget("a", "b");
  engine.clearPhaseTimer();
  assert.equal(t.statuses.kenzoCorrode, 1);
  assert.equal(t.statuses.decay || 0, 0);
  assert.equal(t.hp, 9);
  engine.setActor("a");
  Math.random = () => 0.1; // < 30% ผุพัง · แต่ dummy หลบ 0% อยู่แล้ว
  engine.attackTarget("a", "b");
  engine.clearPhaseTimer();
  assert.equal(t.statuses.kenzoCorrode, 2);
  assert.equal(t.statuses.decay, 2);
  // พลังโจมตีของเป้า 1 − 2 → 0
  assert.equal(engine.attackPowerAgainst(t, engine.players.a), 0);
});

test("การกัดกิน: ต้านได้ · ล้างแล้วหายทั้งก้อน · ไม่ลดเทิร์นเอง", () => {
  Math.random = () => 0.99;
  const { t } = rider();
  t.statuses.resist = 2;
  engine.attackTarget("a", "b");
  engine.clearPhaseTimer();
  assert.equal(t.statuses.kenzoCorrode || 0, 0, "ต้านได้");
  delete t.statuses.resist;
  t.statuses.kenzoCorrode = 3;
  engine.endTurn();
  engine.clearPhaseTimer();
  assert.equal(t.statuses.kenzoCorrode, 3, "ไม่ลดตอนจบเทิร์น");
  require("../../characters/_universal_status").cleanseDebuffs(t);
  assert.equal(t.statuses.kenzoCorrode || 0, 0);
});

test("ลบสกิลติดตัว: ไม่ติดการกัดกิน", () => {
  Math.random = () => 0.99;
  const { p, t } = rider();
  p.statuses.noPassive = 2;
  engine.attackTarget("a", "b");
  engine.clearPhaseTimer();
  assert.equal(t.statuses.kenzoCorrode || 0, 0);
});

test("ร่างไรเดอร์ 30% ได้ตีอีกครั้ง (ไม่จบตา) · ไม่ติด = จบตา", () => {
  Math.random = () => 0.1;
  rider();
  engine.attackTarget("a", "b");
  engine.clearPhaseTimer();
  assert.equal(engine.actorId, "a", "ยังเป็นตาของเค็นโซ");
  assert.equal(kenzo.extraStrike(engine, engine.players.a), true);
  Math.random = () => 0.99;
  assert.equal(kenzo.extraStrike(engine, engine.players.a), false);
  const r = setup();
  Math.random = () => 0.1;
  assert.equal(kenzo.extraStrike(engine, r.p), false, "ร่างมนุษย์ไม่ได้ตีซ้ำ");
});

test("ต้นเทิร์น: ไรเดอร์เสียเลือด 1 ทะลุเกราะ · มนุษย์ใช้แต้ม 1 ฟื้น 1 · ไม่มีแต้มไม่ฟื้น", () => {
  const { p } = rider();
  p.hp = 5; p.armor = 5;
  kenzo.onRoundStartTick(engine, p);
  assert.equal(p.hp, 4);
  assert.equal(p.armor, 5);
  gun("revert");
  p.skillPoints = 1;
  kenzo.onRoundStartTick(engine, p);
  assert.equal(p.hp, 5);
  assert.equal(p.skillPoints, 0);
  kenzo.onRoundStartTick(engine, p);
  assert.equal(p.hp, 5, "ไม่มีแต้ม = ไม่ฟื้น");
  p.hp = 10; p.skillPoints = 2;
  kenzo.onRoundStartTick(engine, p);
  assert.equal(p.skillPoints, 2, "เลือดเต็มไม่เสียแต้ม");
});

test("ไรเดอร์เลือด 1 ต้นเทิร์น = ตาย", () => {
  const { p } = rider();
  p.hp = 1;
  kenzo.onRoundStartTick(engine, p);
  assert.equal(p.alive, false);
});

test("ร่างมนุษย์แต้มสกิลไม่ฟื้น · ร่างไรเดอร์ฟื้นตามปกติ", () => {
  const { p } = setup({ points: 2 });
  engine.addSkill(p, 1);
  assert.equal(p.skillPoints, 2);
  gun("henshin");
  engine.addSkill(p, 1);
  assert.equal(p.skillPoints, 3);
});

test("severables: ตัดการแปลงร่าง = คืนร่าง", () => {
  const { p } = rider();
  const list = kenzo.severables(engine, p);
  assert.equal(list.length, 1);
  list[0].cancel();
  assert.equal(p.kenzo.rider, false);
});
