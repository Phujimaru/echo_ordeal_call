// โรลันด์ (Black Silence) — GRID_PLAN §7.25 · characters/roland.js
const test = require("node:test");
const assert = require("node:assert");
const { engine } = require("../../server.js");
const roland = require("../../characters/roland");

const R = "r", E = "e";
const real = {};
const realRandom = Math.random;
let queue = [];
const runBeats = () => { while (queue.length) queue.shift()(); };

function player(id, characterId) {
  return { id, name: id, avatar: 0, color: "#fff", characterId, hp: 7, armor: 3, skillPoints: 0, alive: true, shield: 0, cards: [], statuses: {}, statusAmt: {}, inventory: [], gold: 0 };
}
function setup(far) {
  for (const k of Object.keys(engine.players)) delete engine.players[k];
  engine.players[R] = player(R, "roland");
  engine.players[E] = player(E, "dummy");
  engine.startMatch();
  engine.clearPhaseTimer();
  queue = [];
  const r = engine.players[R], e = engine.players[E];
  r.pos = { x: 4, y: 4 };
  e.pos = far ? { x: 4 + far, y: 4 } : { x: 5, y: 4 };
  r.statuses = {}; e.statuses = {}; r.statusAmt = {}; e.statusAmt = {};
  r.skillPoints = 5;
  r.hp = 6; r.armor = 4;
  e.hp = 7; e.armor = 3;
  engine.boardMap().terrain = {};
  engine.setActor(R);
  return { r, e, s: r.roland };
}
const give = (s, k) => { s.seq += 1; const uid = `t${s.seq}`; s.hand = [{ uid, k }]; return uid; };
function use(k, s, targets, opts = {}) {
  engine.useSkill(R, "basic", targets, { form: give(s, k), ...opts });
  runBeats();
}

test.before(() => {
  for (const k of ["triggerCutscene", "queueCutscene", "skillBeat", "deferAfterCutscene"]) real[k] = engine[k];
  engine.skillBeat = (sec, fn) => queue.push(fn);
  engine.deferAfterCutscene = (fn) => queue.push(fn);
  engine.queueCutscene = () => {};
  engine.triggerCutscene = () => {};
});
test.after(() => { Object.assign(engine, real); engine.clearPhaseTimer(); });
test.afterEach(() => { engine.clearPhaseTimer(); Math.random = realRandom; });

test("ค่าพื้นฐานและการ์ดเริ่มเกม", () => {
  const { r } = setup();
  assert.strictEqual(engine.maxHpOf(r), 6);
  assert.strictEqual(engine.maxArmorOf(r), 4);
  assert.strictEqual(engine.maxSkillOf(r), 5);
  r.roland.started = false; r.roland.hand = [];
  roland.onRoundStartTick(engine, r);
  assert.strictEqual(r.roland.hand.length, 3);
});

test("จั่วเลือกแบบที่ยังไม่ได้ใช้ก่อน และการ์ดค้างข้ามเทิร์น", () => {
  const { r, s } = setup();
  s.started = true; s.hand = [];
  s.used = roland.CARD_KEYS.filter((k) => k !== "mook");
  roland.onRoundStartTick(engine, r);
  assert.deepStrictEqual(s.hand.map((c) => c.k), ["mook"]);
  roland.onEndTurn(engine);
  assert.strictEqual(s.hand.length, 1);
});

test("BS Page ใช้ได้ 2 ครั้งต่อเทิร์น ไม่กินโควตา และได้ Furioso charge เฉพาะแบบใหม่", () => {
  const { r, e, s } = setup();
  use("ranga", s, [E]);
  use("ranga", s, [E]);
  assert.strictEqual(s.used.length, 1);
  assert.strictEqual(s.pages, 2);
  assert.ok(!r.skillUsedRound);
  const before = e.armor + e.hp;
  use("zelkova", s, [E]);
  assert.strictEqual(e.armor + e.hp, before, "ครั้งที่สามต้องไม่ทำงาน");
});

test("ห้ามสกิล: BS Page ยังใช้ได้ แต่ Emotion skill ไม่ได้", () => {
  const { r, e, s } = setup();
  r.statuses.noskill = 1;
  use("zelkova", s, [E]);
  assert.strictEqual(e.armor, 2);
  s.emotion = 5;
  engine.useSkill(R, "secondary", [], { form: "urging" });
  assert.strictEqual(s.ego, null);
});

test("BS Page เปิดดูมือได้แม้ไม่มีเป้าในระยะ", () => {
  const { r, s } = setup(4);
  give(s, "allas");
  assert.strictEqual(roland.skillPub(r, "basic").browse, true);
});

test("นอกระยะกดไม่ได้และไม่เสียแต้ม", () => {
  const { r, s } = setup(2);
  use("allas", s, [E]);
  assert.strictEqual(r.skillPoints, 5);
  assert.strictEqual(s.hand.length, 1);
});

test("Allas: ราคา 2 · อ่อนแอ", () => {
  const { r, e, s } = setup();
  use("allas", s, [E]);
  assert.strictEqual(r.skillPoints, 3);
  assert.ok((e.statuses.weak || 0) > 0);
});

test("Zelkova: ดาเมจ 1 ครั้งเดียว + จั่วเพิ่มเทิร์นหน้า", () => {
  const { r, e, s } = setup();
  use("zelkova", s, [E]);
  assert.strictEqual(e.armor, 2);
  s.started = true;
  s.hand = [];
  roland.onRoundStartTick(engine, r);
  assert.strictEqual(s.hand.length, 2);
});

test("Mook: แนว 2×1 · ทะลุเกราะ 1 + แต้มสกิล 3 · ต้นเทิร์นถัดไปจั่วเพิ่ม", () => {
  const { r, e, s } = setup(2);
  r.skillPoints = 2;
  use("mook", s, [], { dir: "right" });
  assert.strictEqual(e.armor, 2);
  assert.strictEqual(e.hp, 6);
  assert.strictEqual(r.skillPoints, 3);
  assert.strictEqual(s.bonusDraw, 1);
});

test("Mook / Old Boys: ไม่เลือกทิศ หรือไม่มีศัตรูในแนว กดไม่ได้ ไม่เสียแต้ม", () => {
  const { r, s } = setup();
  use("mook", s, [E]);
  assert.strictEqual(r.skillPoints, 5);
  use("oldboys", s, [], { dir: "left" });
  assert.strictEqual(r.skillPoints, 5);
  assert.strictEqual(s.pages, 0);
});

test("Mook: โดนทุกคนในแนว ได้แต้มสกิลครั้งเดียว", () => {
  const { r, e, s } = setup();
  const f = engine.players.f = player("f", "dummy");
  f.pos = { x: 6, y: 4 }; f.statuses = {}; f.statusAmt = {}; f.hp = 7; f.armor = 3;
  r.skillPoints = 2;
  use("mook", s, [], { dir: "right" });
  delete engine.players.f;
  assert.strictEqual(e.armor + e.hp, 8);
  assert.strictEqual(f.armor + f.hp, 8);
  assert.strictEqual(r.skillPoints, 3);
});

test("Old Boys: แนว 2×1 · เกราะ +1 · จั่วเพิ่ม · เทิร์นหน้าสร้างความเสียหายได้แต้มสกิล +2 ครั้งเดียว", () => {
  const { r, s } = setup();
  r.armor = 3;
  use("oldboys", s, [], { dir: "right" });
  assert.strictEqual(r.armor, 4);
  assert.strictEqual(s.bonusDraw, 1);
  r.skillPoints = 0;
  engine.setRoundNumber(engine.roundNumber + 1);
  use("ranga", s, [E]);
  assert.strictEqual(r.skillPoints, 2);
  use("ranga", s, [E]);
  assert.strictEqual(r.skillPoints, 2);
});

test("Wheels: โดนในแนว 2×1 · คนใกล้สุดสตั้น · เกราะ +1", () => {
  const { r, e, s } = setup();
  r.armor = 2;
  use("wheels", s, [], { dir: "right" });
  assert.strictEqual(e.armor, 2);
  assert.ok((e.statuses.stun || 0) > 0);
  assert.strictEqual(r.armor, 3);
});

test("Crystal: พุ่งถึงเป้าปลายระยะ ไม่ผลัก · หลบ 1 ครั้ง · สวนกลับรัศมี 3", () => {
  const { r, e, s } = setup(3);
  use("crystal", s, [], { dir: "right" });
  assert.deepStrictEqual(r.pos, { x: 6, y: 4 });
  assert.strictEqual(e.armor, 1);
  assert.deepStrictEqual(e.pos, { x: 7, y: 4 });
  assert.ok(roland.dodgeSure(engine, r));
  assert.ok(roland.grantedDodge(engine, r));
  assert.ok(!roland.grantedDodge(engine, r));
  assert.ok(roland.counters(r, null));
  assert.ok(roland.counterAnyRange(engine, r, { pos: { x: 6, y: 7 } }));
  assert.ok(!roland.counterAnyRange(engine, r, { pos: { x: 6, y: 8 } }));
});

test("Crystal: ชนเพื่อน/ไม่มีเป้าในแนว กดไม่ได้", () => {
  const { r, s } = setup(5);
  use("crystal", s, [], { dir: "right" });
  assert.strictEqual(r.skillPoints, 5);
});

test("Atelier Logic: ดาเมจ 2 ระยะ 3 · ประชิดผลัก 1 ช่อง", () => {
  let c = setup(3);
  use("logic", c.s, [E]);
  assert.strictEqual(c.e.armor, 1);
  assert.strictEqual(c.e.pos.x, 7);
  c = setup();
  use("logic", c.s, [E]);
  assert.strictEqual(c.e.pos.x, 6);
});

test("Durandal: ดาเมจ 1 สองครั้ง · ไม่มีเสริมพลัง", () => {
  const { r, e, s } = setup();
  use("durandal", s, [E]);
  assert.strictEqual(e.armor, 1);
  roland.onRoundStartTick(engine, r);
  assert.ok(!r.statuses.might);
});

test("สร้างความเสียหายครบ 4 ครั้ง: Emotion +1 + แต้มสกิล +1 + พลังชีวิต +1 · นับทีละฮิต · ดาเมจ 0 ไม่นับ", () => {
  const { r, e, s } = setup();
  r.skillPoints = 4; r.hp = 3;
  roland.onStrikeResolved(engine, r, e, { dmg: 0 }, {});
  assert.strictEqual(s.hits, 0);
  use("durandal", s, [E]);
  assert.strictEqual(s.hits, 2);
  s.pages = 0; e.armor = 3;
  use("durandal", s, [E]);
  assert.strictEqual(s.emotion, 1);
  assert.strictEqual(s.hits, 0);
  assert.strictEqual(r.skillPoints, 1);
  assert.strictEqual(r.hp, 4);
});

test("ตีสวนที่สร้างความเสียหายนับเข้า Black Silence", () => {
  const { r, e, s } = setup();
  roland.onStrikeResolved(engine, r, e, { dmg: 1 }, { counter: true });
  assert.strictEqual(s.hits, 1);
});

test("ไอเทมเติมแต้มสกิลไม่ได้", () => {
  const { r } = setup();
  r.skillPoints = 0;
  engine.addSkill(r, 2, "item");
  assert.strictEqual(r.skillPoints, 0);
});

test("Emotion skill: หัก Emotion · บัฟ 3 เทิร์น · คูลดาวน์รวม", () => {
  const { r, s } = setup();
  s.emotion = 3;
  engine.useSkill(R, "secondary", [], { form: "urging" });
  assert.strictEqual(s.emotion, 2);
  assert.strictEqual(engine.maxHpOf(r), 7);
  assert.strictEqual(r.statuses.rolandUrging, 3);
  r.skillUsedRound = false;
  engine.useSkill(R, "secondary", [], { form: "lies" });
  assert.strictEqual(s.ego, "urging");
  r.statuses.rolandUrging = 0;
  r.hp = 7;
  roland.onEndTurn(engine);
  assert.strictEqual(s.ego, null);
  assert.strictEqual(r.hp, 6);
});

test("Fervent Beats: พลังโจมตี +3 ใช้กับการ์ด · อมตะ · หมดลงตาย", () => {
  const { r, e, s } = setup();
  s.emotion = 5;
  engine.useSkill(R, "secondary", [], { form: "fervent" });
  assert.strictEqual(s.emotion, 0);
  use("ranga", s, [E]);
  assert.strictEqual(e.armor + e.hp, 10 - 4);
  r.hp = 0;
  engine.instantDeath(r);
  assert.ok(r.alive);
  assert.strictEqual(r.hp, 1);
  r.statuses.rolandFervent = 0;
  roland.onEndTurn(engine);
  assert.ok(!r.alive);
});

test("Scars: ลดดาเมจ 1 · ติด 20% = 0", () => {
  const { r, s } = setup();
  s.ego = "scars"; r.statuses.rolandScars = 3;
  Math.random = () => 0.5;
  assert.strictEqual(roland.adjustIncomingDamage(engine, r, 3, true), 2);
  Math.random = () => 0.1;
  assert.strictEqual(roland.adjustIncomingDamage(engine, r, 3, true), 0);
});

test("A Kiss: เศษน้ำแข็งครบ 5 สตั้น + ดาเมจ 1", () => {
  const { r, e, s } = setup();
  s.ego = "kiss"; r.statuses.rolandKiss = 3;
  e.statuses[roland.SHARD] = 4;
  use("ranga", s, [E]);
  assert.ok(!e.statuses[roland.SHARD]);
  assert.ok((e.statuses.stun || 0) > 0);
  assert.strictEqual(e.armor, 1);
});

test("Lies: ราคาการ์ดสุ่ม 0–4", () => {
  const { r, s } = setup();
  s.emotion = 2;
  Math.random = () => 0;
  engine.useSkill(R, "secondary", [], { form: "lies" });
  r.skillPoints = 0;
  use("wheels", s, [], { dir: "right" });
  assert.strictEqual(s.pages, 1);
});

test("Furioso: ต้องครบ 9 แบบ · ดาเมจ 4 · เลือดไหล 2 · เปราะบาง · นับใหม่", () => {
  const { r, e, s } = setup(3);
  engine.useSkill(R, "ultimate", [], { dir: "right" });
  assert.strictEqual(r.skillPoints, 5);
  s.used = [...roland.CARD_KEYS];
  engine.useSkill(R, "ultimate", [], { dir: "right" });
  runBeats();
  assert.strictEqual(r.skillPoints, 2);
  assert.deepStrictEqual(r.pos, { x: 6, y: 4 });
  assert.strictEqual(e.armor + e.hp, 10 - 4);
  assert.strictEqual(e.statuses.hbleed, 2);
  assert.ok((e.statuses.fragile || 0) > 0);
  assert.strictEqual(s.used.length, 0);
});

test("Furioso คูลดาวน์ 4 เทิร์น", () => {
  const { r, s } = setup(3);
  s.used = [...roland.CARD_KEYS];
  engine.useSkill(R, "ultimate", [], { dir: "right" });
  runBeats();
  const round = engine.roundNumber;
  const again = () => { r.pos = { x: 4, y: 4 }; engine.players[E].pos = { x: 7, y: 4 }; r.skillPoints = 5; r.skillUsedRound = false; s.used = [...roland.CARD_KEYS]; engine.useSkill(R, "ultimate", [], { dir: "right" }); runBeats(); };
  engine.setRoundNumber(round + 3);
  again();
  assert.strictEqual(s.used.length, 9);
  engine.setRoundNumber(round + 4);
  again();
  assert.strictEqual(s.used.length, 0);
});
