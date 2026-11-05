const test = require("node:test");
const assert = require("node:assert");
const { engine } = require("../../server.js");
const inui = require("../../characters/inui_takumi");

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
test.afterEach(() => { engine.clearPhaseTimer(); Math.random = realRandom; clips.length = 0; });

function setup({ points = 8 } = {}) {
  for (const k of Object.keys(engine.players)) delete engine.players[k];
  const mk = (id, characterId, x, y) => {
    engine.players[id] = {
      id, name: id, characterId, avatar: 0, ready: true, skillPoints: 0, alive: true, statuses: {}, statusAmt: {},
      cards: [], inventory: [], cutsceneShown: {}, gold: 0, img: "",
    };
    return engine.players[id];
  };
  mk("a", "inui_takumi");
  mk("b", "dummy");
  engine.startMatch();
  engine.clearPhaseTimer();
  const p = engine.players.a, t = engine.players.b;
  p.skillPoints = points;
  p.pos = { x: 2, y: 2 };
  t.pos = { x: 3, y: 2 };
  t.hp = 7; t.armor = 3;
  engine.setActor("a");
  return { p, t };
}
const dial = (form) => engine.useSkill("a", "basic", [], { form });
const bag = (form) => engine.useSkill("a", "secondary", [], { form });
function opened() {
  const r = setup();
  engine.useSkill("a", "basic", []);
  r.p.skillUsedRound = false;
  engine.setActor("a");
  clips.length = 0;
  return r;
}
function faiz() { const r = opened(); dial("555"); engine.setActor("a"); clips.length = 0; return r; }
function axel() {
  const r = faiz();
  bag("axel");
  engine.setActor("a");
  clips.length = 0;
  return r;
}

test("เปิดกระเป๋า: เล่นคลิป · ช่องรอง/ท่าไม้ตายซ่อนจนเปิด", () => {
  const { p } = setup();
  const h = inui;
  assert.equal(h.skillHidden(p, "secondary"), true);
  assert.equal(h.skillPub(p, "basic").name, "กระเป๋า SmartBrain");
  dial("555"); // ยังไม่เปิดกระเป๋า
  assert.equal(p.inui.faiz, false);
  engine.useSkill("a", "basic", []);
  assert.deepEqual(clips, [inui.CUT.open]);
  assert.equal(p.inui.opened, true);
  assert.equal(h.skillHidden(p, "secondary"), false);
  assert.equal(h.skillHidden(p, "ultimate"), true);
  assert.equal(p.skillUsedRound, false, "ฟรีไม่กินโควตา");
  assert.equal(engine.action.locked, true, "ใช้สกิลแล้วเดินไม่ได้");
});

test("555: คลิปครั้งแรกเท่านั้น · วางสายคืนร่าง + ถอดของ", () => {
  const { p } = faiz();
  assert.equal(p.inui.faiz, true);
  bag("knuckle");
  assert.equal(p.inui.knuckle, true);
  dial("hangup");
  assert.equal(p.inui.faiz, false);
  assert.equal(p.inui.knuckle, false);
  clips.length = 0;
  dial("555");
  assert.equal(p.inui.faiz, true);
  assert.deepEqual(clips, [], "ครั้งที่ 2 ไม่มีวีดีโอ");
});

test("ปืน: ค้างโหมด หักตอนยิง · 106 ใช้ 2 นัด คริ 50 · 279 เติม 4 แต้ม", () => {
  const { p, t } = opened();
  t.pos = { x: 5, y: 2 };
  dial("106");
  assert.deepEqual(inui.range(p), [1, 3]);
  assert.equal(inui.critPct(p), 50);
  assert.equal(p.inui.ammo, 4, "ยังไม่ยิงไม่หัก");
  Math.random = () => 0.99;
  assert.ok(engine.attackTarget("a", "b"));
  engine.clearPhaseTimer();
  assert.equal(p.inui.ammo, 2);
  p.inui.ammo = 1;
  assert.equal(inui.critPct(p), 0, "กระสุนไม่พอ 106");
  assert.deepEqual(inui.range(p), [1, 1]);
  engine.setActor("a");
  p.skillPoints = 4;
  dial("279");
  assert.equal(p.inui.ammo, 4);
  assert.equal(p.skillPoints, 0);
  assert.equal(p.skillUsedRound, true, "279 กินโควตา");
});

test("ใส่อุปกรณ์ปิดโหมดปืน · กดรหัสใหม่ได้ · ท่าตีตามอุปกรณ์", () => {
  const { p } = faiz();
  assert.equal(inui.attackStyle(p), "faizFist");
  dial("106");
  assert.equal(inui.attackStyle(p), "faizBurst");
  assert.equal(inui.attackBeam, undefined, "ไม่ใช้ลำแสงกลาง");
  bag("knuckle");
  assert.equal(p.inui.gun, null);
  assert.deepEqual(inui.range(p), [1, 1]);
  assert.equal(inui.attackStyle(p), "faizKnuckle");
  bag("pointer");
  assert.equal(inui.attackStyle(p), "faizPoint");
  dial("103");
  assert.equal(inui.attackStyle(p), "faizShot");
  bag("axel");
  assert.equal(p.inui.gun, null, "axel_watch ก็ปิดปืน");
});

test("สกิลติดตัว: ไม่สวมของตีโดนได้แต้ม 1 ทั้งมนุษย์และ Faiz · สวมของไม่ได้", () => {
  Math.random = () => 0.99;
  const { p } = setup({ points: 0 });
  assert.ok(engine.attackTarget("a", "b"));
  engine.clearPhaseTimer();
  assert.equal(p.skillPoints, 1);
  const r = faiz();
  r.p.skillPoints = 0;
  engine.attackTarget("a", "b");
  engine.clearPhaseTimer();
  assert.equal(r.p.skillPoints, 1);
  const g = faiz();
  bag("knuckle");
  engine.setActor("a");
  g.p.skillPoints = 0;
  g.t.hp = 7; g.t.armor = 0;
  engine.attackTarget("a", "b");
  engine.clearPhaseTimer();
  assert.equal(g.p.skillPoints, 0);
  assert.equal(g.t.hp, 5, "Knuckle พลังโจมตี +1");
});

test("ฟื้นเลือด: ร่างมนุษย์ครบ 2 เทิร์น +2 · แปลงร่างนับใหม่", () => {
  const { p } = setup();
  p.hp = 2;
  const end = () => inui.onEndTurn(engine);
  end(); assert.equal(p.hp, 2);
  end(); assert.equal(p.hp, 4);
  end();
  p.inui.faiz = true;
  end(); assert.equal(p.hp, 4);
  p.inui.faiz = false;
  end(); assert.equal(p.hp, 4);
  end(); assert.equal(p.hp, 6);
});

test("อุปกรณ์: ต้องแปลงร่าง · สวมอันใหม่ถอดอันเก่า · Pointer แม่นยำ · กดซ้ำถอด", () => {
  const { p } = opened();
  bag("knuckle");
  assert.equal(p.inui.knuckle, false, "ร่างมนุษย์ใส่ไม่ได้");
  dial("555");
  engine.setActor("a");
  bag("knuckle");
  bag("pointer");
  assert.equal(p.inui.knuckle, false);
  assert.equal(p.inui.pointer, true);
  assert.equal(inui.auraAccurate(p), true);
  bag("pointer");
  assert.equal(p.inui.pointer, false);
  assert.equal(p.skillUsedRound, false);
});

test("Exceed Charge: 4 แต้ม เดินได้ +2 ตีลง 4 + ตรึง + คลิปท่า · ไม่ตีหายตอนจบตา", () => {
  const { p, t } = faiz();
  bag("pointer");
  engine.setActor("a");
  assert.equal(engine.action.locked, false);
  p.skillPoints = 4;
  clips.length = 0;
  t.armor = 0;
  dial("exceed");
  assert.equal(p.skillPoints, 0);
  assert.equal(engine.action.locked, false, "Exceed ไม่ล็อกการเดิน");
  assert.equal(engine.baseMovOf(p), 6);
  assert.equal(inui.skillMusic(engine, p).music, "inui_exceed_wait");
  assert.deepEqual(clips, [inui.CUT.pointerEx]);
  engine.attackTarget("a", "b");
  assert.equal(engine.gameState, "CUTSCENE", "คลิปท่าเล่นก่อนฉากตี");
  engine.clearPhaseTimer();
  assert.equal(t.hp, 3);
  assert.ok(t.statuses.rooted > 0);
  assert.equal(p.inui.exceed, null);
});

test("วีดีโอเล่นครั้งเดียวต่อเกม: อุปกรณ์ · Exceed เริ่ม · axel · Start Up · Time Out", () => {
  const { p } = faiz();
  bag("knuckle"); bag("knuckle");
  assert.deepEqual(clips, [inui.CUT.knuckle], "ใส่ซ้ำไม่มีคลิป");
  clips.length = 0;
  bag("knuckle");
  engine.setActor("a");
  p.skillPoints = 8;
  dial("exceed");
  assert.deepEqual(clips, [inui.CUT.knuckle ? inui.CUT.knuckleEx : ""]);
  inui.onActorEnd(engine, p);
  p.skillUsedRound = false;
  engine.setActor("a");
  clips.length = 0;
  p.skillPoints = 8;
  dial("exceed");
  assert.deepEqual(clips, [], "Exceed รอบสอง ไม่มีคลิปเริ่ม");
  inui.onActorEnd(engine, p);
  // ตีโดน/คริ เล่นทุกครั้ง
  p.inui.exceedClip = "knuckle";
  assert.equal(inui.preAttackClip(engine, p, {}), inui.CUT.knuckleHit);
  p.inui.exceedClip = "knuckle";
  assert.equal(inui.preAttackClip(engine, p, {}), inui.CUT.knuckleHit);
  // Start Up รอบสอง: ไม่มีคลิป นับ 10 วิทันที
  p.inui.axelCd = 0;
  p.skillUsedRound = false;
  engine.setActor("a");
  bag("axel");
  engine.setActor("a");
  clips.length = 0;
  p.skillPoints = 8;
  p.cutsceneShown[inui.CUT.startUp] = true;
  engine.useSkill("a", "ultimate", []);
  assert.deepEqual(clips, []);
  assert.equal(p.inui.startUp.started, true);
  assert.equal(engine.timeLeft, 10);
  engine.clearPhaseTimer();
  p.cutsceneShown[inui.CUT.timeOut] = true;
  inui.actorOutro(engine, p);
  assert.deepEqual(clips, [], "Time Out รอบสอง ใช้เสียงแทน");
  assert.equal(p.inui.axel, false);
});

test("Exceed Charge: ใช้ไม่ได้ถ้าไม่แปลงร่าง/ไม่สวมของ ไม่เสียแต้ม", () => {
  const { p } = faiz();
  p.skillPoints = 8;
  dial("exceed");
  assert.equal(p.skillPoints, 8);
  assert.equal(p.inui.exceed, null);
});

test("Axel: คริ 25 · 5 เทิร์นหมดเอง คลิปไม่ได้ใช้ คูลดาวน์ 3", () => {
  const { p } = axel();
  assert.equal(inui.critPct(p), 25);
  assert.equal(inui.skillHidden(p, "ultimate"), false);
  for (let i = 0; i < 4; i++) inui.onEndTurn(engine);
  assert.equal(p.inui.axel, true);
  inui.onEndTurn(engine);
  assert.equal(p.inui.axel, false);
  assert.equal(p.inui.faiz, true);
  assert.ok(clips.includes(inui.CUT.timeOutIdle));
  bag("axel");
  assert.equal(p.inui.axel, false, "ติดคูลดาวน์");
  for (let i = 0; i < 3; i++) { assert.ok(p.inui.axelCd > 0); inui.onEndTurn(engine); }
  bag("axel");
  assert.equal(p.inui.axel, true);
});

test("Start Up: 6 แต้ม · ตี 3 ครั้ง เติมเดิน 7 · บวกคริ/พลังโจมตี · จบแล้วคลิป Time Out", () => {
  const { p, t } = axel();
  bag("knuckle"); // ถอด Axel? ไม่ — ทดสอบก่อนเข้า Start Up
  assert.equal(p.inui.axel, false, "สวมอุปกรณ์ทับ = ถอด Axel");
  p.inui.axel = true; p.inui.axelCd = 0; p.inui.knuckle = false; p.inui.lastGear = null; p.inui.axelLeft = 5;
  engine.setActor("a");
  p.skillPoints = 6;
  engine.useSkill("a", "ultimate", []);
  assert.equal(p.skillPoints, 0);
  assert.equal(engine.action.locked, false);
  assert.equal(engine.baseMovOf(p), 7);
  assert.equal(inui.critPct(p), 50);
  assert.equal(inui.skillMusic(engine, p), null, "เพลงยังไม่ขึ้นระหว่างคลิป");
  assert.equal(inui.clockSeconds(engine, p, 40), 10);
  assert.equal(inui.skillMusic(engine, p).music, "inui_axel");
  assert.equal(inui.clockSeconds(engine, p, 6), 6);
  // ใส่ของใน Start Up: ไม่มีคลิป ไม่ล็อกเดิน ใส่พร้อมกันได้
  clips.length = 0;
  bag("knuckle"); bag("pointer");
  assert.equal(p.inui.knuckle && p.inui.pointer, true);
  assert.deepEqual(clips, []);
  assert.equal(engine.action.locked, false);
  // ตีครั้งที่ 1 ติดคริ = คลิปตามอุปกรณ์ล่าสุด
  Math.random = () => 0;
  t.hp = 7; t.armor = 0;
  assert.equal(inui.preAttackClip(engine, p, { crit: true }), inui.CUT.axelPointer);
  p.inui.lastGear = "knuckle";
  assert.equal(inui.preAttackClip(engine, p, { crit: true }), inui.CUT.axelCrit);
  assert.equal(inui.preAttackClip(engine, p, { crit: false }), null);
  // จบตา (ทุกทาง) = คลิป Time Out กลับร่าง Faiz ถอดของ
  assert.equal(inui.extraStrike(engine, p), true);
  assert.equal(engine.action.locked, false);
  assert.equal(inui.extraStrike(engine, p), true);
  assert.equal(inui.extraStrike(engine, p), false);
  clips.length = 0;
  inui.actorOutro(engine, p);
  assert.deepEqual(clips, [inui.CUT.timeOut]);
  assert.equal(p.inui.startUp, null);
  assert.equal(p.inui.axel, false);
  assert.equal(p.inui.knuckle, false);
  assert.equal(p.inui.faiz, true);
  assert.equal(p.inui.axelCd, 4);
  clips.length = 0;
  inui.actorOutro(engine, p);
  assert.deepEqual(clips, [], "คิวครั้งเดียว");
});

test("Start Up: ตีโดนพร้อมอุปกรณ์ = ลุกไหม้ + ถูกตรึง · ป้ายสถานะตัดได้ทุกผล", () => {
  const { p, t } = axel();
  p.inui.startUp = { left: 3, started: true, at: 1 };
  p.inui.axel = true; p.inui.knuckle = true; p.inui.pointer = true;
  const names = inui.onStrikeLanded(engine, p, t);
  assert.equal(names.length, 2);
  assert.ok(t.statuses.rooted > 0);
  const keys = inui.severables(engine, p).map((x) => x.key);
  assert.ok(keys.includes("startUp") && keys.includes("gear") && keys.includes("faiz"));
  for (const x of inui.severables(engine, p)) x.cancel();
  assert.equal(p.inui.faiz, false);
  assert.equal(p.inui.startUp, null);
});
