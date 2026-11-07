const test = require("node:test");
const assert = require("node:assert");
const { engine } = require("../../server.js");
const ClockUp = require("../../server/clockUp");
const daisuke = require("../../characters/daisuke");
const yaguruma = require("../../characters/yaguruma");
const kagami = require("../../characters/kagami");
const tsurugi = require("../../characters/tsurugi");

const clips = [];
let realQueue, realFlash, realRandom;
test.before(() => {
  realQueue = engine.queueCutscene;
  realFlash = engine.skillFlash;
  engine.queueCutscene = (p, k) => { clips.push(k); };
  engine.skillFlash = () => {};
  realRandom = Math.random;
});
test.after(() => { engine.queueCutscene = realQueue; engine.skillFlash = realFlash; Math.random = realRandom; });
test.afterEach(() => { engine.clearPhaseTimer(); ClockUp.reset(); Math.random = realRandom; clips.length = 0; });

// a, b, c — ตั้งตัวละครตามต้องการ · ลำดับเดิน a → b → c
function setup(chars = ["daisuke", "dummy", "dummy"]) {
  for (const k of Object.keys(engine.players)) delete engine.players[k];
  const ids = ["a", "b", "c"];
  chars.forEach((characterId, i) => {
    engine.players[ids[i]] = {
      id: ids[i], name: ids[i], characterId, avatar: 0, ready: true, skillPoints: 0, alive: true, statuses: {}, statusAmt: {},
      cards: [], inventory: [], cutsceneShown: {}, gold: 0, img: "",
    };
  });
  engine.startMatch();
  engine.clearPhaseTimer();
  const ps = ids.slice(0, chars.length).map((id) => engine.players[id]);
  ps.forEach((p, i) => { p.pos = { x: 2 + i * 3, y: 2 }; p.hp = 7; p.armor = 3; p.skillPoints = 8; });
  engine.turnOrder.splice(0, engine.turnOrder.length, ...ids.slice(0, chars.length));
  return ps;
}
// แปลงร่าง + CAST OFF (ในตาตัวเอง) แล้วคืนตาให้ a
function rider(p) {
  engine.setActor(p.id);
  engine.useSkill(p.id, "basic", []); // Henshin
  engine.useSkill(p.id, "basic", []); // CAST OFF
  p.skillUsedRound = false;
  clips.length = 0;
}
// ให้ actorIndex ชี้ที่ id (จำลองว่าเป็นตาของคนนั้นในลำดับเดิน)
function turnOf(id) {
  const i = engine.turnOrder.indexOf(id);
  require("../../server/match").actorIndex = i;
  engine.setActor(id);
}

test("Henshin → PUT ON (เดิน 3 เกราะ 5) ⇄ CAST OFF (เดิน 5 เกราะ 3 · โจมตี +1)", () => {
  const [p] = setup(["daisuke", "dummy"]);
  engine.setActor("a");
  assert.equal(daisuke.skillHidden(p, "secondary"), true);
  assert.equal(daisuke.skillPub(p, "basic").name, "Henshin");
  assert.equal(engine.baseMovOf(p), 4);
  engine.useSkill("a", "basic", []);
  assert.deepEqual(clips, [daisuke.CUT.henshin]);
  assert.equal(p.zect.henshin, true);
  assert.equal(engine.baseMovOf(p), 3);
  assert.equal(engine.maxArmorOf(p), 5);
  assert.equal(engine.action.locked, false, "แปลงร่างแล้วยังเดินได้");
  assert.equal(p.skillUsedRound, false, "ไม่นับโควตา");
  p.armor = 5;
  engine.useSkill("a", "basic", []);
  assert.equal(p.zect.castOff, true);
  assert.equal(p.armor, 3, "CAST OFF ตัดเกราะเกิน 3");
  assert.equal(engine.baseMovOf(p), 5);
  assert.equal(daisuke.blocksArmorRegen(p), true);
  assert.equal(daisuke.damageBonus(engine, p, engine.players.b), 1);
});

test("Clock Up ในตาตัวเอง: 2 แต้ม · เดิน 7 · ตีครบ 2 = Clock Over · ช่วงจบ → ตาถัดไป", () => {
  const [p, t] = setup(["daisuke", "dummy"]);
  rider(p);
  turnOf("a");
  p.skillPoints = 2;
  engine.useSkill("a", "secondary", []);
  assert.equal(p.skillPoints, 0);
  const m = engine.clockUp.memberOf(p);
  assert.ok(m, "เริ่มช่วง Clock Up");
  assert.equal(m.max, 2);
  assert.equal(engine.movOf(p), 7);
  assert.equal(engine.action.locked, false);
  assert.equal(daisuke.ownEvade(p), 25, "Zect หลบ 25%");
  assert.equal(engine.timeLeft, 1, "นาฬิกาเดินทีละวิ");
  // ตีครั้งแรก: ยังไม่จบ · เดินใหม่ได้
  Math.random = () => 0.99;
  t.pos = { x: 3, y: 2 };
  assert.equal(engine.attackTarget("a", "b"), true);
  engine.clearPhaseTimer();
  engine.finishActor = engine.finishActor; // ไม่ได้ใช้
  // ฉากตีจบ → done ของ strikeTarget (ตัวจับเวลาเฟส) — เรียกตรง
  require("../../server/phases/attack");
  // จำลองฉากจบ: เรียก onExpire ที่ตั้งไว้ไม่ได้ (ล้างแล้ว) → ใช้ afterStrike ของระบบโดยตรง
  assert.equal(ClockUp.afterStrike(p), true);
  assert.equal(m.hits, 1);
  assert.equal(engine.action.locked, false, "ตีแล้วเดินใหม่ได้");
  assert.equal(ClockUp.afterStrike(p), false, "ตีครบ 2");
  engine.setGameState("ACTION");
  engine.finishActor();
  assert.equal(engine.clockUp.active(), null, "ทุกคนจบ = ช่วงจบ");
  assert.notEqual(engine.actorId, "a", "จบตาแล้ว");
  assert.equal(p.zect.clockReady, engine.roundNumber + 3, "คูลดาวน์ 2 เทิร์น");
});

test("แทรกตาคนอื่น: เสียตาเทิร์นนี้ (ยังไม่เดิน) · จบแล้วเจ้าของตาเดินต่อ", () => {
  const [d, p] = setup(["dummy", "yaguruma"]);
  rider(p);
  turnOf("a");
  engine.action.moved = false;
  assert.ok(yaguruma.zectState(engine, p).canClock);
  assert.equal(yaguruma.charAction(engine, p, "zect:clock"), true);
  assert.equal(p.skillPoints, 6);
  assert.equal(engine.actorId, "b", "ตาพิเศษของคนแทรก");
  assert.ok(engine.clockUp.memberOf(p));
  assert.equal(p.clockSkipRound, engine.roundNumber, "เสียตาเดินเทิร์นนี้");
  // รอ = จบ → กลับตาของ a
  engine.clearPhaseTimer();
  engine.setGameState("ACTION");
  engine.waitAction("b");
  assert.equal(engine.clockUp.active(), null);
  assert.equal(engine.actorId, "a", "เจ้าของตาเดินต่อ");
  void d;
});

test("แทรกหลังเดินไปแล้ว = ไม่เสียตา · แทรกตาพิเศษ/หยุดเวลาไม่ได้", () => {
  const [p] = setup(["yaguruma", "dummy"]);
  rider(p);
  turnOf("b");
  require("../../server/match").actorIndex = 1; // a เดินไปแล้ว
  assert.equal(engine.hasActed("a"), true);
  engine.action.extra = "dioInterrupt";
  assert.equal(yaguruma.zectState(engine, p).canClock, false, "ตาพิเศษ (หยุดเวลา) แทรกไม่ได้");
  engine.action.extra = null;
  assert.equal(yaguruma.charAction(engine, p, "zect:clock"), true);
  assert.equal(p.clockSkipRound, undefined, "เดินไปแล้ว ไม่เสียตา");
});

test("เข้าร่วม + ชนกัน: QTE กดรัว ผู้ชนะตี · แยกห่าง 2 ช่อง", async () => {
  const [a, b] = setup(["daisuke", "tsurugi"]);
  rider(a); rider(b);
  turnOf("a");
  engine.useSkill("a", "secondary", []);
  assert.equal(tsurugi.charAction(engine, b, "zect:clock"), true, "เข้าร่วม");
  assert.ok(engine.clockUp.memberOf(b));
  assert.equal(engine.actorId, "a");
  // b ส่งคำสั่ง = ได้ถือตา
  assert.equal(ClockUp.claim("b"), true);
  assert.equal(engine.actorId, "b");
  assert.equal(engine.movOf(b), 7);
  ClockUp.claim("a");
  a.pos = { x: 4, y: 4 }; b.pos = { x: 5, y: 4 };
  engine.action.from = { ...a.pos };
  assert.equal(engine.attackTarget("a", "b"), true);
  const d = engine.clockUp.active().duel;
  assert.ok(d, "ชนกัน = QTE");
  assert.equal(engine.clockUp.active().duel.open, false, "เสียงกระแทกก่อน หน้าต่างกดรัวยังไม่ขึ้น");
  engine.clockUp.mash("b");
  assert.equal(d.counts.b, 0, "ยังไม่เปิด = ไม่นับ");
  await new Promise((r) => setTimeout(r, 750));
  assert.equal(d.open, true);
  for (let i = 0; i < 5; i++) engine.clockUp.mash("b");
  engine.clockUp.mash("a");
  assert.equal(d.counts.b, 5);
});

test("ท่าไม้ตาย: Shooting แนว 5 คนแรก · Sting ล้างต้าน+พิษ · Kick ชาร์จ 3 · Slash 2 ครั้ง", () => {
  Math.random = () => 0.99;
  // Shooting
  let [p, t, u] = setup(["daisuke", "dummy", "dummy"]);
  rider(p); turnOf("a");
  t.pos = { x: 4, y: 2 }; u.pos = { x: 5, y: 2 };
  engine.useSkill("a", "ultimate", [], { dir: "right" });
  assert.equal(t.armor, 0, "ล้างเกราะ 1 แล้วโจมตี 1+1+1 = 3 (เกราะ 2 ที่เหลือรับ)");
  assert.equal(u.hp, 7, "โดนแค่คนแรก");
  assert.ok(p.zect.ultReady > engine.roundNumber);
  // Sting
  [p, t] = setup(["yaguruma", "dummy"]);
  rider(p); turnOf("a");
  t.pos = { x: 3, y: 2 };
  t.statuses.resist = 2;
  engine.useSkill("a", "ultimate", ["b"]);
  assert.equal(t.statuses.resist, undefined);
  assert.ok(t.statuses.poison > 0 && t.statuses.decay > 0);
  // Kick
  [p, t] = setup(["kagami", "dummy"]);
  rider(p); turnOf("a");
  for (let i = 0; i < 3; i++) { engine.useSkill("a", "ultimate", []); }
  assert.equal(p.zect.kickArmed, true);
  assert.equal(p.skillPoints, 8 - 5);
  assert.equal(engine.action.locked, false, "ชาร์จแล้วยังเดินได้");
  assert.equal(kagami.damageBonus(engine, p, t), 2);
  kagami.onStrikeResolved(engine, p, t, { dodge: false });
  assert.equal(p.zect.kickArmed, false);
  assert.equal(kagami.preAttackClip(engine, p), kagami.CUT.kickFinal);
  // Slash
  [p, t] = setup(["tsurugi", "dummy"]);
  rider(p); turnOf("a");
  t.pos = { x: 3, y: 2 }; t.armor = 0;
  engine.useSkill("a", "ultimate", ["b"]);
  assert.equal(t.hp, 5, "ครั้งแรก: โจมตีปกติ (1 + CAST OFF 1)");
  assert.equal(tsurugi.skillPub(p, "ultimate").name, "Rider Slash 2");
  assert.equal(engine.action.locked, false, "ฟันแล้วเดินต่อได้");
  engine.useSkill("a", "ultimate", ["b"]);
  assert.equal(t.hp, 4);
  assert.ok(t.statuses.poison > 0);
  assert.ok(p.zect.ultReady > engine.roundNumber);
});

test("หมดเวลา: นับเฉพาะ ACTION · สมาชิกที่ไม่ได้ถือตาหมดเวลา = Clock Over", () => {
  const [a, b] = setup(["daisuke", "tsurugi"]);
  rider(a); rider(b);
  turnOf("a");
  engine.useSkill("a", "secondary", []);
  tsurugi.charAction(engine, b, "zect:clock");
  const mb = engine.clockUp.memberOf(b);
  mb.left = 1;
  engine.setGameState("ACTION");
  ClockUp.tick();
  assert.equal(mb.over, true);
  assert.equal(engine.clockUp.memberOf(a).over, false);
});

test("ชนกันจริง (ตัวจับเวลา): ผู้ชนะตี 1 ครั้งนับเป็นการตี · แยกห่าง 2 ช่อง · ตากลับคนพุ่งชน", async () => {
  Math.random = () => 0.99;
  const [a, b] = setup(["daisuke", "tsurugi"]);
  rider(a); rider(b);
  turnOf("a");
  engine.useSkill("a", "secondary", []);
  tsurugi.charAction(engine, b, "zect:clock");
  a.pos = { x: 6, y: 5 }; b.pos = { x: 7, y: 5 };
  engine.action.from = { ...a.pos };
  b.armor = 0;
  engine.attackTarget("a", "b");
  await new Promise((r) => setTimeout(r, 750));
  for (let i = 0; i < 3; i++) engine.clockUp.mash("a");
  await new Promise((r) => setTimeout(r, 3300));
  assert.equal(engine.lastAttack && engine.lastAttack.targetName, "b", "ผู้ชนะ (a) ตี b");
  await new Promise((r) => setTimeout(r, 6000));
  assert.ok(b.hp < 7, "b เสียหาย");
  assert.equal(engine.clockUp.memberOf(a).hits, 1, "นับเป็นการตีของผู้ชนะ");
  assert.equal(Math.abs(a.pos.x - b.pos.x), 5, "แยกห่างฝั่งละ 2 ช่อง");
  assert.equal(engine.actorId, "a");
  assert.equal(engine.gameState, "ACTION");
});

test("Rider Shooting ระหว่าง Clock Up = เสริมตีปกติประชิด · ล้างเกราะ 1 +1 · คลิปตอนตี · ไม่นับเป็นการตีตอนกด", () => {
  const [p, t] = setup(["daisuke", "dummy"]);
  rider(p); turnOf("a");
  engine.useSkill("a", "secondary", []);
  engine.useSkill("a", "ultimate", []);
  assert.equal(p.zect.armed, "shooting");
  assert.equal(engine.clockUp.memberOf(p).hits, 0);
  assert.equal(engine.action.locked, false, "กดแล้วยังเดินได้");
  assert.deepEqual(daisuke.skillArea(p, "ultimate", null), { kind: "self" });
  assert.equal(daisuke.damageBonus(engine, p, t), 2);
  t.armor = 3;
  assert.deepEqual(daisuke.beforeStrikeHit(engine, p, t), ["ล้างเกราะ 1"]);
  assert.equal(t.armor, 2);
  daisuke.onStrikeResolved(engine, p, t, { dodge: false });
  assert.equal(p.zect.armed, null);
  assert.equal(daisuke.preAttackClip(engine, p), daisuke.CUT.rider);
});

test("ท่าไม้ตายใน Clock Up = บัฟตีปกติทุกท่า (ไม่เลือกช่อง): Sting พิษ+ผุพัง · Slash ฟันสอง+พิษ", () => {
  Math.random = () => 0.99;
  // Sting
  let [p, t] = setup(["yaguruma", "dummy"]);
  rider(p); turnOf("a");
  engine.useSkill("a", "secondary", []);
  assert.deepEqual(yaguruma.skillArea(p, "ultimate", null), { kind: "self" });
  engine.useSkill("a", "ultimate", []); // กดได้แม้ไม่มีใครในระยะ
  assert.equal(p.zect.armed, "sting");
  assert.equal(engine.clockUp.memberOf(p).hits, 0);
  assert.equal(engine.action.locked, false);
  assert.equal(yaguruma.skillPub(p, "ultimate").name, "Rider Sting ✓");
  t.statuses.resist = 2;
  assert.deepEqual(yaguruma.beforeStrikeHit(engine, p, t), ["ล้างต้านสถานะ"]);
  assert.equal(yaguruma.damageBonus(engine, p, t), 2);
  yaguruma.onStrikeLanded(engine, p, t);
  assert.ok(t.statuses.poison > 0 && t.statuses.decay > 0);
  yaguruma.onStrikeResolved(engine, p, t, { dodge: false });
  assert.equal(yaguruma.preAttackClip(engine, p), yaguruma.CUT.rider);
  // Slash
  [p, t] = setup(["tsurugi", "dummy"]);
  rider(p); turnOf("a");
  engine.useSkill("a", "secondary", []);
  engine.useSkill("a", "ultimate", []);
  assert.equal(p.zect.armed, "slash");
  assert.equal(p.zect.slash, false, "ไม่มีฟันที่สองแยก");
  t.armor = 0; t.hp = 7;
  tsurugi.onStrikeResolved(engine, p, t, { dodge: false });
  assert.equal(t.hp, 6, "ฟันที่สอง 1");
  assert.ok(t.statuses.poison > 0);
  assert.equal(tsurugi.preAttackClip(engine, p), tsurugi.CUT.slashFinal);
});

test("เดินไปติดไรเดอร์ใน Clock Up = ชนกันทันที (ไม่ต้องกดโจมตี) · เดินต่อจากช่องที่ยืน", async () => {
  const [a, b] = setup(["daisuke", "tsurugi"]);
  rider(a); rider(b);
  turnOf("a");
  engine.useSkill("a", "secondary", []);
  tsurugi.charAction(engine, b, "zect:clock");
  a.pos = { x: 2, y: 5 }; b.pos = { x: 9, y: 5 };
  engine.action.from = { ...a.pos };
  assert.equal(engine.moveTo("a", 4, 5), true);
  assert.equal(engine.moveTo("a", 6, 5), true, "เดินต่อจากช่องที่ยืน");
  assert.equal(engine.action.from.x, 4);
  assert.equal(engine.clockUp.active().duel, null);
  assert.equal(engine.moveTo("a", 8, 5), true);
  const d = engine.clockUp.active().duel;
  assert.ok(d, "ชนกันทันที");
  assert.equal(d.a, "a");
  assert.equal(engine.gameState, "ATTACKING");
  assert.equal(d.open, false);
  await new Promise((r) => setTimeout(r, 1000));
  assert.equal(d.open, true, "เดินถึง → เสียงกระแทก → หน้าต่างกดรัว");
  engine.clearPhaseTimer();
});
