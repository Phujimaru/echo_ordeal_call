// อาร์มสตรอง (characters/armstrong.js · GRID_PLAN §7.39)
const test = require("node:test");
const assert = require("node:assert");
const { engine } = require("../../server.js");
const match = require("../../server/match");
const arm = require("../../characters/armstrong");
const cut = require("../../server/cutscene");
const combat = require("../../server/combat");

let realQueue, realTrigger, realFlash, realRandom, realPause, realEnginePause;
const clips = [];
test.before(() => {
  realPause = cut.pausePlayingForCutscene;
  cut.pausePlayingForCutscene = () => {};
  realEnginePause = engine.pausePlayingForCutscene;
  engine.pausePlayingForCutscene = () => {};
  realQueue = engine.queueCutscene;
  realTrigger = engine.triggerCutscene;
  realFlash = engine.skillFlash;
  engine.queueCutscene = (p, key) => clips.push(key);
  engine.triggerCutscene = (p, key) => clips.push(key);
  engine.skillFlash = () => {};
  realRandom = Math.random;
});
test.after(() => {
  cut.pausePlayingForCutscene = realPause; engine.pausePlayingForCutscene = realEnginePause;
  engine.queueCutscene = realQueue; engine.triggerCutscene = realTrigger; engine.skillFlash = realFlash; Math.random = realRandom;
});
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
  mk("a", "armstrong");
  mk("b", "dummy");
  mk("c", "dummy");
  engine.setGameMode(mode);
  engine.startMatch();
  engine.clearPhaseTimer();
  const p = engine.players.a, t = engine.players.b, u = engine.players.c;
  p.skillPoints = points;
  p.pos = { x: 2, y: 6 };
  t.pos = { x: 5, y: 6 };
  u.pos = { x: 2, y: 8 };
  for (const o of [t, u]) { o.hp = 50; o.armor = 0; }
  clear(7, 7, 8);
  engine.setActor("a");
  Math.random = () => 0.99; // ไม่หลบ/ไม่คริ
  return { p, t, u };
}
const st = (p) => p.armstrong;
// เล่นฉากที่คิวไว้จนหมด (ผลหลังคลิป → จังหวะพัก) ในนามคนที่กำลังเดิน
function runFlow(onStep) {
  for (let i = 0; i < 40; i++) {
    const after = match.afterCutscene.splice(0);
    const beats = match.skillBeats.splice(0);
    if (!after.length && !beats.length) return;
    const actor = engine.players[engine.actorId];
    for (const fn of after) { combat.withEffectSource(actor, fn); if (onStep) onStep(); }
    for (const b of beats) { combat.withEffectSource(actor, b.fn); if (onStep) onStep(); }
  }
}
// b ทำให้เป้าเสียหาย n ในตาเดินของ b
function hitBy(attackerId, target, n) {
  engine.setActor(attackerId);
  combat.withEffectSource(engine.players[attackerId], () => engine.dealMixed(target, n, false));
}
function nano(p) {
  engine.useSkill("a", "secondary", []);
  assert.equal(st(p).nano, true);
}

test("ค่าพื้นฐาน: HP 10 / เกราะ 5 · เดิน 4 · ประชิด", () => {
  const { p } = setup();
  assert.equal(p.hp, 10);
  assert.equal(p.armor, 5);
  assert.deepEqual(engine.rangeOf(p), [1, 1]);
  assert.equal(engine.baseMovOf(p), 4);
});

test("Nanomachines: เปิด/ปิดได้ 1 ครั้งต่อเทิร์น · ไม่กินโควตา · เกราะสูงสุด +3 · พลังโจมตี +1 · คลิปครั้งแรก", () => {
  const { p, t } = setup();
  nano(p);
  assert.ok(clips.includes(arm.CUT.nano));
  assert.equal(p.skillUsedRound, false);
  assert.equal(engine.maxArmorOf(p), 8);
  assert.equal(arm.damageBonus(engine, p, t), 1);
  engine.useSkill("a", "secondary", []); // กดซ้ำเทิร์นเดียวกันไม่ได้
  assert.equal(st(p).nano, true);
  match.roundNumber++;
  engine.setActor("a");
  engine.useSkill("a", "secondary", []);
  assert.equal(st(p).nano, false);
  assert.equal(engine.maxArmorOf(p), 5);
  assert.equal(arm.damageBonus(engine, p, t), 0);
});

test("Nanomachines: ต้นเทิร์นเสียแต้ม 1 + เกราะ +1 · แต้มไม่พอ = ปิดเอง ตัดเกราะเกิน", () => {
  const { p } = setup({ points: 1 });
  nano(p);
  arm.onRoundStartTick(engine, p);
  assert.equal(p.skillPoints, 0);
  assert.equal(p.armor, 6);
  arm.onRoundStartTick(engine, p);
  assert.equal(st(p).nano, false);
  assert.equal(p.armor, 5);
});

test("Nanomachines: เกราะเสีย 1 = ฟื้นพลังชีวิต 1 · ลบสกิลติดตัว = ไม่ฟื้น", () => {
  const { p } = setup();
  nano(p);
  p.hp = 5; p.armor = 3;
  engine.withEffectSource(null, () => engine.dealMixed(p, 2));
  assert.equal(p.armor, 1);
  assert.equal(p.hp, 7);
  p.statuses.noPassive = 2;
  engine.withEffectSource(null, () => engine.dealMixed(p, 1));
  assert.equal(p.hp, 7);
});

test("ขอสักหมัดเถอะ (สวนกลับ): ยังรับดาเมจ แล้วพุ่งไปต่อยผู้โจมตี 3 + ผลัก 5 · ทำงานครั้งเดียว", () => {
  const { p, t } = setup();
  engine.useSkill("a", "basic", []);
  assert.ok(st(p).stance);
  assert.equal(p.skillPoints, 5);
  engine.useSkill("a", "basic", []); // ค้างอยู่ = กดซ้ำไม่ได้
  assert.equal(p.skillPoints, 5);
  hitBy("b", p, 2);
  assert.equal(p.armor, 3);
  runFlow();
  assert.deepEqual(clips.filter((k) => k.startsWith("armCounter")), [arm.CUT.counterRun, arm.CUT.counter]);
  assert.equal(t.hp, 47);
  assert.deepEqual(p.pos, { x: 4, y: 6 }); // ช่องติดผู้โจมตีฝั่งที่ใกล้สุด
  assert.deepEqual(t.pos, { x: 10, y: 6 }); // ผลัก 5
  assert.equal(st(p).stance, null);
  hitBy("b", p, 1);
  runFlow();
  assert.equal(t.hp, 47);
});

test("ขอสักหมัดเถอะ (ช่วยเหลือ): กันการโจมตีใส่คนในระยะ 4 ทั้งก้อน แล้วสวน", () => {
  const { p, t, u } = setup();
  engine.useSkill("a", "basic", []);
  hitBy("b", u, 4);
  combat.withEffectSource(t, () => engine.dealMixed(u, 4, false)); // ในการกระทำเดียวกัน = กันต่อ
  assert.equal(u.hp, 50);
  runFlow();
  assert.equal(t.hp, 47);
  assert.equal(st(p).stance, null);
});

test("ขอสักหมัดเถอะ (ช่วยเหลือ): นอกระยะ 4 / ผลสถานะ ไม่ทำงาน · หมดใน 2 เทิร์น", () => {
  const { p, u } = setup();
  engine.useSkill("a", "basic", []);
  u.pos = { x: 2, y: 11 };
  hitBy("b", u, 2);
  assert.equal(u.hp, 48);
  u.pos = { x: 2, y: 8 };
  u._statusDamage = true;
  hitBy("b", u, 1);
  u._statusDamage = false;
  assert.equal(u.hp, 47);
  assert.ok(st(p).stance);
  arm.onEndTurn(engine);
  assert.ok(st(p).stance);
  match.roundNumber++;
  arm.onEndTurn(engine);
  assert.equal(st(p).stance, null);
});

test("ยืนวัดกันบลูกผู้ชาย: พักดาเมจ → ผู้โจมตีกดรัว → 10 ครั้ง +1 (สูงสุด 3 · ไม่เกินเกราะ) → คลิปเข้า/ไม่เข้า", () => {
  const { p } = setup();
  nano(p);
  p.armor = 8;
  hitBy("b", p, 3);
  assert.equal(p.armor, 8); // ยังไม่ลง
  let mashed = false;
  runFlow(() => {
    const w = st(p).qte;
    if (w && !mashed) {
      mashed = true;
      assert.equal(w.by, "b");
      assert.equal(arm.qteView(engine).kind, "guard");
      for (let i = 0; i < 25; i++) arm.mash(engine, "b");
      assert.equal(arm.mash(engine, "a"), false); // อาร์มสตรองกดแทนไม่ได้
    }
  });
  assert.ok(mashed);
  assert.equal(p.armor, 3); // 3 + 2
  assert.equal(p.hp, 10);
  assert.ok(clips.includes(arm.CUT.guardStart) && clips.includes(arm.CUT.guardMash) && clips.includes(arm.CUT.guardBlock));
});

test("ยืนวัดกันบลูกผู้ชาย: ทะลุเกราะ = คลิปต่อยเข้า · ต่ำกว่า 5 เกราะ / ยูนิต AI = ไม่มี QTE", () => {
  const { p, t } = setup();
  nano(p);
  p.armor = 5; p.hp = 10;
  hitBy("b", p, 4);
  runFlow(() => { const w = st(p).qte; if (w && w.count === 0) for (let i = 0; i < 40; i++) arm.mash(engine, "b"); });
  assert.ok(clips.includes(arm.CUT.guardHit));
  assert.equal(p.armor, 0);
  assert.ok(p.hp < 10);
  clips.length = 0;
  p.armor = 4;
  hitBy("b", p, 1);
  assert.equal(p.armor, 3);
  runFlow();
  assert.equal(clips.length, 0);
  p.armor = 8;
  t.summon = { side: "mob" };
  hitBy("b", p, 1);
  delete t.summon;
  assert.equal(p.armor, 7);
});

test("ไปคุยกับรากมะม่วง: ประชิด · กดรัว 10 วิ · 20 ครั้ง = 1 (สูงสุด 5) · คูลดาวน์ 3", () => {
  const { p, t } = setup();
  engine.useSkill("a", "ultimate", ["b"]); // ห่าง 3 = นอกระยะ
  assert.equal(p.skillPoints, 8);
  t.pos = { x: 3, y: 6 };
  t.armor = 2;
  engine.useSkill("a", "ultimate", ["b"]);
  assert.equal(p.skillPoints, 2);
  if (st(p).qte) for (let i = 0; i < 57; i++) arm.mash(engine, "a"); // 20 ครั้ง = 1 → 2 // useSkill รันผลหลังคลิปแรกทันที (คลิปถูก stub)
  runFlow(() => { const w = st(p).qte; if (w && w.count === 0) { for (let i = 0; i < 57; i++) arm.mash(engine, "a"); } });
  // 57 ครั้ง = 2 (25 ครั้งต่อ 1)
  assert.deepEqual(clips.filter((k) => k.startsWith("armUlt")), [arm.CUT.ultStart, arm.CUT.ultMash, arm.CUT.ultEnd]);
  assert.equal(t.armor, 0);
  assert.equal(t.hp, 50);
  assert.equal(arm.skillLocks(engine, p).ultimate.cd, 3);
});

test("ไปคุยกับรากมะม่วง: หลบได้ = ไม่มีคลิป ไม่มีดาเมจ", () => {
  const { t } = setup();
  t.pos = { x: 3, y: 6 };
  t.statuses.evade = 1; t.statusAmt = { evade: 100 };
  engine.useSkill("a", "ultimate", ["b"]);
  runFlow();
  assert.equal(clips.length, 0);
  assert.equal(t.hp, 50);
});

test("ขอทำลายปอดแปบ: ปุ่ม HUD แต้ม +2 · ไม่นับสกิล · คูลดาวน์ 2 · ลบสกิลติดตัว = ไม่มีปุ่ม", () => {
  const { p } = setup({ points: 2 });
  assert.equal(arm.hudActions(engine, p)[0].key, "armSmoke");
  arm.charAction(engine, p, "armSmoke");
  assert.equal(p.skillPoints, 4);
  assert.ok(clips.includes(arm.CUT.smoke));
  arm.charAction(engine, p, "armSmoke");
  assert.equal(p.skillPoints, 4);
  assert.equal(arm.hudActions(engine, p)[0].cd, 2);
  p.statuses.noPassive = 2;
  assert.equal(arm.hudActions(engine, p), undefined);
});

test("ตัดผลสกิล (severables): ท่าสวน + นาโน", () => {
  const { p } = setup();
  engine.useSkill("a", "basic", []);
  nano(p);
  const sev = arm.severables(engine, p);
  assert.deepEqual(sev.map((s) => s.key).sort(), ["nano", "stance"]);
  for (const s of sev) s.cancel();
  assert.equal(st(p).stance, null);
  assert.equal(st(p).nano, false);
});

test("ไปคุยกับรากมะม่วง: กด 200 ครั้ง ได้สูงสุด 5", () => {
  const { p, t } = setup();
  t.pos = { x: 3, y: 6 };
  engine.useSkill("a", "ultimate", ["b"]);
  if (st(p).qte) for (let i = 0; i < 200; i++) arm.mash(engine, "a");
  runFlow();
  assert.equal(t.hp, 45);
  assert.equal(arm.qteView(engine), null);
});

test("ขอสักหมัดเถอะ: ท่าเดียวมีทั้งสองแบบ — ป้องกันเพื่อนทำงานก่อน = ท่าหาย (ไม่สวนซ้ำตอนตัวเองโดน)", () => {
  const { p, t, u } = setup();
  engine.useSkill("a", "basic", []);
  hitBy("b", u, 3);
  assert.equal(u.hp, 50);
  runFlow();
  assert.equal(t.hp, 47);
  assert.equal(st(p).stance, null);
  hitBy("b", p, 1);
  runFlow();
  assert.equal(t.hp, 47);
});

test("ยืนวัดกันบลูกผู้ชาย: โบนัสกดรัวสูงสุด 3 แม้เกราะมากกว่า", () => {
  const { p } = setup();
  nano(p);
  p.armor = 8; p.hp = 10;
  hitBy("b", p, 1);
  runFlow(() => { const w = st(p).qte; if (w && w.count === 0) { assert.equal(w.cap, 3); for (let i = 0; i < 100; i++) arm.mash(engine, "b"); } });
  assert.equal(p.armor, 4); // 1 + 3
});
