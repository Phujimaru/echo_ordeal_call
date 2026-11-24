// ไอเซ็น มาโคโตะ (characters/aizen_makoto.js · GRID_PLAN §7.44) + ธาตุหิน (ตกผลึก — server/element.js) + AI ตัวใหญ่ 3×3 (server/unitAi.js)
const test = require("node:test");
const assert = require("node:assert");
const { engine } = require("../../server.js");
const match = require("../../server/match");
const combat = require("../../server/combat");
const cut = require("../../server/cutscene");
const Element = require("../../server/element");
const UnitAi = require("../../server/unitAi");
const view = require("../../server/view");
const A = require("../../characters/aizen_makoto");

let realPause, realQueue, realFlash, realRandom;
const queued = [];
test.before(() => {
  realPause = cut.pausePlayingForCutscene; cut.pausePlayingForCutscene = () => {};
  realQueue = engine.queueCutscene; engine.queueCutscene = (p, key) => { queued.push(key); };
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
  queued.length = 0;
});

const mk = (id, characterId) => (engine.players[id] = {
  id, name: id, characterId, avatar: 0, ready: true, skillPoints: 0, alive: true, statuses: {}, statusAmt: {},
  cards: [], inventory: [], cutsceneShown: {}, gold: 0, img: "",
});
function clearMap() {
  const map = engine.boardMap();
  for (let y = 0; y < 30; y++) for (let x = 0; x < 30; x++) { delete map.terrain[`${x},${y}`]; if (map.special) delete map.special[`${x},${y}`]; }
}
function setup() {
  for (const k of Object.keys(engine.players)) delete engine.players[k];
  mk("a", "aizen_makoto"); mk("b", "dummy"); mk("c", "dummy");
  engine.startMatch();
  engine.clearPhaseTimer();
  clearMap();
  const a = engine.players.a, b = engine.players.b, c = engine.players.c;
  a.pos = { x: 1, y: 1 }; b.pos = { x: 12, y: 12 }; c.pos = { x: 12, y: 1 };
  for (const o of [b, c]) { o.hp = 30; o.armor = 0; }
  a.skillPoints = 8;
  match.roundNumber = 3;
  engine.setActor("a");
  Math.random = () => 0.5;
  return { a, b, c };
}
const kaijuOf = (kind) => engine.summon.ofOwner("a").find((u) => u.summon.aizenKaiju === kind) || null;
function nextRound() { match.roundNumber++; for (const p of Object.values(engine.players)) p.skillUsedRound = false; engine.setActor("a"); }
const summon = (kind) => engine.useSkill("a", "basic", [], { form: kind });

test("ค่าพื้นฐาน: พลังชีวิต 7 · เกราะ 3 · เดิน 4 · ตีประชิด 1 · ระดับง่าย", () => {
  const { a } = setup();
  assert.equal(a.hp, 7);
  assert.equal(a.armor, 3);
  assert.equal(engine.baseMovOf(a), 4);
  assert.deepEqual(engine.rangeOf(a), [1, 1]);
  assert.equal(require("../../characters").CHAR_BY_ID.aizen_makoto.difficulty, "easy");
});

test("จงมาออกมา: เกิดสุ่ม 3×3 · AI ฝ่ายเดียวกัน · คลิปทุกครั้ง · ได้ 2 ตัว · ตัวเดิมซ้ำไม่ได้", () => {
  const { a } = setup();
  summon("redking");
  const rk = kaijuOf("redking");
  assert.ok(rk && rk.pos, "เร็ดคิงเกิดบนแผนที่");
  assert.equal(engine.sizeOf(rk), 3);
  assert.equal(rk.hp, 5); assert.equal(rk.armor, 5);
  assert.equal(engine.baseMovOf(rk), 4);
  assert.ok(rk.summon.ai);
  assert.ok(engine.sameTeam(a, rk), "ไม่ตีเจ้าของ");
  assert.deepEqual(queued, ["aizen_redking"]);
  assert.equal(a.skillPoints, 8, "0 แต้ม");
  nextRound();
  summon("grigio");
  assert.ok(kaijuOf("grigio"));
  nextRound();
  summon("guebasser");
  assert.equal(kaijuOf("guebasser"), null, "บนสนามได้ 2 ตัว");
  assert.equal(engine.summon.ofOwner("a").length, 2);
});

test("เรียกกลับ: ไม่ใช้โควตาสกิล · คูลดาวน์ 10 เทิร์น · ตายก็คูลดาวน์ 10 แยกกัน", () => {
  const { a, b } = setup();
  summon("redking");
  assert.ok(a.skillUsedRound, "เรียกใช้โควตา");
  summon("redking"); // เรียกกลับ (ไม่นับโควตา)
  assert.equal(kaijuOf("redking"), null);
  assert.equal(a.aizen.ready.redking, 3 + A.CD);
  nextRound();
  summon("redking");
  assert.equal(kaijuOf("redking"), null, "ยังคูลดาวน์");
  summon("grigio");
  const g = kaijuOf("grigio");
  engine.withEffectSource(b, () => { combat.dealMixed(g, 50); if (g.hp <= 0) combat.instantDeath(g); });
  assert.equal(g.alive, false);
  assert.equal(a.aizen.ready.grigio, match.roundNumber + A.CD);
  match.roundNumber = 3 + A.CD;
  for (const p of Object.values(engine.players)) p.skillUsedRound = false;
  engine.setActor("a");
  summon("redking");
  assert.ok(kaijuOf("redking"), "ครบ 10 เทิร์นเรียกได้อีก");
});

test("AI ไคจู 3×3: เล็งศัตรูใกล้สุด · เดินเข้าไปตีในกรอบ 3×3 ของเร็ดคิง (ธาตุหิน)", () => {
  const { b, c } = setup();
  summon("redking");
  const rk = kaijuOf("redking");
  rk.pos = { x: 4, y: 8 }; b.pos = { x: 9, y: 9 }; c.pos = { x: 20, y: 1 };
  const plan = UnitAi.planTurn(rk);
  assert.equal(plan.targetId, "b");
  assert.ok(plan.to, "เดินเข้าหา");
  rk.pos = plan.to;
  assert.ok(require("../../server/phases/action").canStrike(rk, b), "ตีถึงจากช่องที่วางแผน");
  assert.equal(Element.attackElementOf(rk), "rock");
});

test("ธาตุหิน: ไม่ติดคราบ · เจอคราบใดก็ได้ = ตกผลึก (คราบหาย · ไม่มีดาเมจ · ถูกตรึง 1 เทิร์น)", () => {
  const { a, b } = setup();
  Element.apply(b, "rock", a);
  assert.equal(Element.auraOf(b), null);
  assert.ok(!(b.statuses.rooted > 0));
  Element.apply(b, "fire", a);
  assert.equal(Element.auraOf(b), "fire");
  const hp = b.hp;
  const r = Element.apply(b, "rock", a);
  assert.equal(r.key, "crystal");
  assert.equal(Element.auraOf(b), null);
  assert.equal(b.hp, hp);
  assert.ok(b.statuses.rooted > 0, "ถูกตรึง");
});

test("กริจิโอ โบน: ตี 1 กรวย 4 + ลุกไหม้ 2 · ไฟ", () => {
  const { b } = setup();
  summon("grigio");
  const g = kaijuOf("grigio");
  g.pos = { x: 4, y: 4 }; b.pos = { x: 8, y: 5 }; b.armor = 0;
  engine.setActor(g.id);
  const hp = b.hp;
  assert.ok(engine.attackTarget(g.id, "b"));
  engine.clearPhaseTimer();
  assert.equal(hp - b.hp, 1);
  assert.equal(b.statuses.hburn, 2);
  assert.equal(Element.auraOf(b), "fire");
});

test("เกลบาสซ่า: ตี 2 กรอบ 4×3 · ผลักถอยจนสุดกรอบ · ชนสิ่งกีดขวาง = +1", () => {
  const { b, c } = setup();
  summon("guebasser");
  const gb = kaijuOf("guebasser");
  gb.pos = { x: 4, y: 4 }; b.pos = { x: 7, y: 5 }; c.pos = { x: 20, y: 20 };
  engine.setActor(gb.id);
  assert.ok(engine.attackTarget(gb.id, "b"));
  engine.clearPhaseTimer();
  assert.equal(b.hp, 28, "ตี 2");
  // ผลหลังฉากตี (afterBoardAttack) — เรียกตรงๆ จากตำแหน่งเดิม
  b.pos = { x: 7, y: 5 };
  gb.aizenKnock = ["b"];
  const after = A.afterAttack(engine, gb, b);
  after();
  assert.deepEqual(b.pos, { x: 10, y: 5 }, "ถอยจนแถวสุดท้ายของกรอบ (ลึก 4)");
  // ชน: สิ่งกีดขวางขวางทาง → +1
  b.pos = { x: 7, y: 5 };
  engine.boardMap().terrain["9,5"] = "rock";
  gb.aizenKnock = ["b"];
  const hp = b.hp;
  A.afterAttack(engine, gb, b)();
  assert.deepEqual(b.pos, { x: 8, y: 5 });
  assert.equal(hp - b.hp, 1);
});

test("เริ่มบทเรียน: สิงไคจู (2 แต้ม · ไม่จำกัดระยะ) → ใช้ร่างไคจู · ร่างไอเซ็นฟื้น 1/เทิร์น · กดอีกครั้งลง (0 · ไม่ใช้โควตา)", () => {
  const { a } = setup();
  summon("redking");
  const rk = kaijuOf("redking");
  const at = { ...rk.pos };
  rk.hp = 4;
  a.hp = 5;
  nextRound();
  engine.useSkill("a", "secondary", [], { form: "redking" });
  assert.equal(a.skillPoints, 6);
  assert.ok(a.aizen.ride);
  assert.deepEqual(a.pos, at);
  assert.equal(engine.sizeOf(a), 3);
  assert.equal(a.hp, 4); assert.equal(a.armor, 5);
  assert.equal(combat.maxHpOf(a), 5);
  assert.equal(kaijuOf("redking"), null, "ตัวไคจู AI หายไประหว่างสิง");
  assert.deepEqual(engine.rangeOf(a), [1, 3]);
  assert.equal(Element.attackElementOf(a), "rock");
  // ร่างไอเซ็นฟื้น 1 ต่อเทิร์น
  A.onRoundStartTick(engine, a);
  assert.equal(a.aizen.ride.bodyHp, 6);
  // ลงจากร่าง: 0 แต้ม · ไม่ใช้โควตา (โควตาเทิร์นนี้ใช้ไปแล้ว)
  assert.ok(a.skillUsedRound);
  engine.useSkill("a", "secondary", [], {});
  assert.equal(a.aizen.ride, null);
  assert.equal(a.skillPoints, 6);
  assert.equal(a.hp, 6); assert.equal(engine.sizeOf(a), 1);
  const back = kaijuOf("redking");
  assert.ok(back && back.alive);
  assert.deepEqual(back.pos, at);
  assert.equal(back.hp, 4);
  assert.ok(a.pos && !(a.pos.x >= at.x && a.pos.x < at.x + 3 && a.pos.y >= at.y && a.pos.y < at.y + 3), "ไอเซ็นยืนนอกตัวไคจู");
});

test("ร่างไคจูล้ม: ไอเซ็นหลุดออกมาด้วยพลังชีวิตเดิม · ไคจูคูลดาวน์ 10", () => {
  const { a, b } = setup();
  summon("grigio");
  nextRound();
  a.hp = 6;
  engine.useSkill("a", "secondary", [], { form: "grigio" });
  engine.withEffectSource(b, () => { combat.dealMixed(a, 50); if (a.hp <= 0) combat.instantDeath(a); });
  assert.equal(a.alive, true);
  assert.equal(a.aizen.ride, null);
  assert.equal(a.hp, 6);
  assert.equal(engine.sizeOf(a), 1);
  assert.equal(a.aizen.ready.grigio, match.roundNumber + A.CD);
  assert.equal(kaijuOf("grigio"), null);
});

test("ติดตัว: ตีปกติที่โดน −1 · ศัตรูทำให้เสียหายด้วยสกิล = แต้ม +1 (ครั้งเดียวต่อการกด) · ลบสกิลติดตัวปิดได้", () => {
  const { a, b } = setup();
  a.armor = 0; a.hp = 7; a.skillPoints = 0;
  b.pos = { x: 2, y: 1 };
  engine.setActor("b");
  engine.attackTarget("b", "a");
  engine.clearPhaseTimer();
  assert.equal(a.hp, 7, "ตี 1 − 1 = 0");
  match.cmdSeq = (match.cmdSeq || 0) + 1;
  engine.setGameState("ACTION");
  engine.withEffectSource(b, () => { combat.dealMixed(a, 1); combat.dealMixed(a, 1); });
  assert.equal(a.skillPoints, 1, "การกดเดียว = +1");
  a.statuses.noPassive = 2;
  match.cmdSeq++;
  engine.withEffectSource(b, () => combat.dealMixed(a, 1));
  assert.equal(a.skillPoints, 1);
});

const runDeferred = (a) => { for (const fn of match.afterCutscene.splice(0)) engine.withEffectSource(a, fn); };
function toOrb() {
  const ctx = setup();
  nextRound();
  engine.useSkill("a", "ultimate", []);
  nextRound();
  ctx.a.skillPoints = 8;
  return ctx;
}

test("ท่าไม้ตาย: เก็บไคจู (+ คูลดาวน์) · ออร์บ ดาร์ก 5 เทิร์น · พลังชีวิต +3 เกราะ +2 ฟื้นเต็ม · 3×3 · เดิน 5 · คลิปครั้งแรกของแมตช์", () => {
  const { a } = setup();
  summon("redking");
  nextRound();
  summon("guebasser");
  nextRound();
  engine.useSkill("a", "secondary", [], { form: "guebasser" });
  nextRound();
  a.hp = 3;
  engine.useSkill("a", "ultimate", []);
  assert.equal(engine.summon.ofOwner("a").length, 0);
  assert.equal(a.aizen.ride, null);
  assert.equal(a.aizen.ready.redking, match.roundNumber + A.CD);
  assert.equal(a.aizen.ready.guebasser, match.roundNumber + A.CD);
  assert.equal(a.hp, 10); assert.equal(a.armor, 5);
  assert.equal(engine.sizeOf(a), 3);
  assert.equal(engine.baseMovOf(a), 5);
  assert.equal(Element.attackElementOf(a), "dark");
  assert.deepEqual(queued.filter((k) => k === "aizen_orb_dark"), ["aizen_orb_dark"]);
  const me = view.buildStateFor("a").players.find((p) => p.id === "a");
  assert.equal(me.character.basic.name, "Dark Slash");
  assert.equal(me.character.ultimate.name, "Dark Origium Ray");
  assert.equal(me.character.passive.name, "อุลตร้าแมนที่แท้จริง");
  assert.equal(me.aizen.standee, A.IMG.orb);
  // หมดเวลา: คืนร่าง ตัดส่วนเกิน
  for (let i = 0; i < A.ORB_TURNS; i++) A.onEndTurn(engine);
  assert.equal(a.aizen.orb, null);
  assert.equal(engine.sizeOf(a), 1);
  assert.equal(a.hp, 7); assert.equal(a.armor, 3);
  // แปลงครั้งที่ 2 ไม่มีคลิป
  nextRound(); a.skillPoints = 8;
  engine.useSkill("a", "ultimate", []);
  assert.equal(queued.filter((k) => k === "aizen_orb_dark").length, 1);
});

test("ออร์บ ดาร์ก: ตีปกติกวาด 3 ช่องหน้าตัว (ทุกคนในแถว) · แต้มสกิล +1 ต่อเทิร์น", () => {
  const { a, b, c } = toOrb();
  a.pos = { x: 5, y: 5 };
  b.pos = { x: 5, y: 4 }; c.pos = { x: 7, y: 4 };
  b.armor = 0; c.armor = 0;
  assert.ok(engine.attackTarget("a", "b"));
  engine.clearPhaseTimer();
  assert.equal(b.hp, 29); assert.equal(c.hp, 29, "โดนทั้งแถว");
  a.skillPoints = 3;
  A.onRoundStartTick(engine, a);
  assert.equal(a.skillPoints, 4);
});

test("Dark Slash: 2 แต้ม · คลื่น 6×3 ดาเมจ 2 · ผลักถอยสุดระยะ · ชน +1 · คูลดาวน์ 2 · คลิปทุกครั้ง", () => {
  const { a, b, c } = toOrb();
  a.pos = { x: 5, y: 10 };
  b.pos = { x: 6, y: 8 }; c.pos = { x: 20, y: 20 };
  b.armor = 0;
  queued.length = 0;
  engine.useSkill("a", "basic", [], { dir: "up" });
  assert.equal(a.skillPoints, 6);
  assert.deepEqual(queued, ["aizen_orb_slash"]);
  runDeferred(a);
  assert.equal(b.hp, 28);
  assert.deepEqual(b.pos, { x: 6, y: 4 }, "ถอยจนแถวสุดท้าย (ลึก 6)");
  assert.equal(Element.auraOf(b), "dark");
  nextRound(); a.skillPoints = 8;
  engine.useSkill("a", "basic", [], { dir: "up" });
  assert.equal(a.skillPoints, 8, "คูลดาวน์ 2");
  nextRound(); a.skillPoints = 8;
  engine.boardMap().terrain["6,5"] = "rock";
  b.pos = { x: 6, y: 8 };
  queued.length = 0;
  engine.useSkill("a", "basic", [], { dir: "up" });
  assert.deepEqual(queued, ["aizen_orb_slash"], "คลิปทุกครั้ง");
  runDeferred(a);
  assert.deepEqual(b.pos, { x: 6, y: 6 });
  assert.equal(b.hp, 28 - 2 - 1, "ชน +1");
});

test("Orb Calibur: 0 แต้ม ไม่ใช้โควตา · ธาตุร่างเปลี่ยนตีปกติ/พื้นฐาน/ติดตัว (มืด ฟื้นเลือดแทนเกราะ · ไฟ เหรียญ +1 · หิน เกราะ +1)", () => {
  const { a, b } = toOrb();
  a.pos = { x: 5, y: 10 }; b.pos = { x: 20, y: 20 };
  engine.useSkill("a", "basic", [], { dir: "up" });
  runDeferred(a);
  assert.ok(a.skillUsedRound);
  engine.useSkill("a", "secondary", [], { form: "fire" });
  assert.equal(a.aizen.orb.el, "fire");
  assert.equal(a.skillPoints, 6);
  assert.equal(Element.attackElementOf(a), "fire");
  const me = view.buildStateFor("a").players.find((p) => p.id === "a");
  assert.equal(me.character.basic.name, "Inferno");
  const g = a.gold || 0;
  A.onRoundStartTick(engine, a);
  assert.equal(a.gold, g + 1);
  engine.useSkill("a", "secondary", [], { form: "rock" });
  a.armor = 2;
  A.onRoundStartTick(engine, a);
  assert.equal(a.armor, 3);
  engine.useSkill("a", "secondary", [], { form: "dark" });
  a.hp = 5; a.armor = 3;
  engine.withEffectSource(b, () => combat.dealMixed(a, 2));
  assert.equal(a.armor, 1);
  assert.equal(a.hp, 7, "เกราะเสีย 2 = ฟื้น 2");
});

test("Dark Origium Ray: 4 แต้ม · 7×3 ดาเมจ 4 ทุกคนในแนว · ไฟ → มืด → หิน (ปิดท้ายตกผลึก = ถูกตรึง) · คูลดาวน์ 3 · คลิปทุกครั้ง", () => {
  const { a, b, c } = toOrb();
  a.pos = { x: 5, y: 10 };
  b.pos = { x: 5, y: 7 }; c.pos = { x: 7, y: 4 };
  b.armor = 0; c.armor = 0;
  b.statuses.elWater = 2; // คราบน้ำ → ไฟเจอ = ระเหย
  queued.length = 0;
  engine.useSkill("a", "ultimate", [], { dir: "up" });
  assert.equal(a.skillPoints, 4);
  assert.deepEqual(queued, ["aizen_orb_ray"]);
  runDeferred(a);
  assert.equal(c.hp, 26);
  assert.ok(b.hp <= 23, "ระเหย +3");
  for (const t of [b, c]) { assert.ok(t.statuses.rooted > 0, `${t.id} ถูกตรึง`); assert.equal(Element.auraOf(t), null); }
  nextRound(); a.skillPoints = 8;
  engine.useSkill("a", "ultimate", [], { dir: "up" });
  assert.equal(a.skillPoints, 8, "คูลดาวน์ 3");
});

test("เปลี่ยนแผนที่: ไคจูที่รอดตามไปเกิดสุ่มบนแผนที่ใหม่ (เลือดเดิม)", () => {
  const { a } = setup();
  summon("redking");
  const rk = kaijuOf("redking");
  rk.hp = 2;
  engine.placeOnBoard(2);
  const left = kaijuOf("redking");
  assert.ok(left && left.pos);
  assert.equal(left.hp, 2);
  assert.equal(engine.sizeOf(left), 3);
  assert.equal(a.aizen.ride, null);
});

test("ตัดผล (severables): ลงจากร่าง · คืนร่างออร์บ · เก็บไคจู", () => {
  const { a } = setup();
  summon("redking");
  nextRound();
  summon("grigio");
  nextRound();
  engine.useSkill("a", "secondary", [], { form: "redking" });
  const list = A.severables(engine, a);
  assert.deepEqual(list.map((x) => x.key).sort(), ["aizenKaiju_grigio", "aizenRide"].sort());
  for (const s of list) s.cancel();
  assert.equal(a.aizen.ride, null);
  assert.equal(engine.sizeOf(a), 1);
  assert.equal(kaijuOf("grigio"), null);
});

test("คลิปทุกตัวลงทะเบียนในตารางคัตซีน · Dark Slash/Ray เล่นทุกครั้ง ที่เหลือครั้งแรกของแมตช์ · รูปประจำตัวตามร่าง", () => {
  const T = require("../../server/constants").TRANSFORMS;
  for (const key of Object.values(A.CUT)) assert.ok(T[key] && T[key].video, `คัตซีน ${key}`);
  assert.deepEqual([...A.EVERY_CLIP].sort(), ["ray", "slash"]);
  const { a } = toOrb();
  assert.equal(view.displayImg(a), A.IMG.orbCover);
});
