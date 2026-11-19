// ดิเอโก้ แบรนโด (อสูรกายดึกดำบรรพ์) (characters/diego_dino.js · server/possess.js · GRID_PLAN §7.36)
const test = require("node:test");
const assert = require("node:assert");
const { engine } = require("../../server.js");
const match = require("../../server/match");
const dd = require("../../characters/diego_dino");
const cut = require("../../server/cutscene");
const combat = require("../../server/combat");
const shop = require("../../server/shop");
const Duo = require("../../server/duo");
const Possess = require("../../server/possess");
const { CHAR_BY_ID, publicRoster } = require("../../characters.js");

let realQueue, realFlash, realRandom, realPause, realEnginePause;
const clips = [];
test.before(() => {
  realPause = cut.pausePlayingForCutscene;
  cut.pausePlayingForCutscene = () => {};
  realEnginePause = engine.pausePlayingForCutscene;
  engine.pausePlayingForCutscene = () => {};
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
  match.possess = {};
  clips.length = 0;
});

function clear(cx, cy, r = 10) {
  const map = engine.boardMap();
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
    delete map.terrain[`${x},${y}`];
    if (map.special) delete map.special[`${x},${y}`];
  }
}
function setup({ points = 8, mounted = false } = {}) {
  for (const k of Object.keys(engine.players)) delete engine.players[k];
  const mk = (id, characterId) => {
    engine.players[id] = {
      id, name: id, characterId, avatar: 0, ready: true, skillPoints: 0, alive: true, statuses: {}, statusAmt: {},
      cards: [], inventory: [], cutsceneShown: {}, gold: 0, img: "",
    };
    return engine.players[id];
  };
  mk("a", "diego_dino");
  mk("b", "dummy");
  mk("c", "dummy");
  engine.setGameMode("ffa");
  engine.startMatch();
  engine.clearPhaseTimer();
  const p = engine.players.a, t = engine.players.b, u = engine.players.c;
  p.skillPoints = points;
  p.dino.mounted = mounted;
  p.pos = { x: 6, y: 6 };
  t.pos = { x: 8, y: 6 };
  u.pos = { x: 6, y: 12 };
  for (const o of [t, u]) { o.hp = 50; o.armor = 0; o.skillPoints = 5; }
  clear(9, 8, 12);
  engine.setActor("a");
  Math.random = () => 0.99; // ไม่หลบ/ไม่คริ
  return { p, t, u };
}
function runFlow() {
  for (let i = 0; i < 20; i++) {
    const after = match.afterCutscene.splice(0);
    const beats = match.skillBeats.splice(0);
    if (!after.length && !beats.length) return;
    for (const fn of after) combat.withEffectSource(engine.players.a, fn);
    for (const b of beats) combat.withEffectSource(engine.players.a, b.fn);
  }
}
const vit = (o) => o.hp + o.armor;

test("หน้าเลือกตัว: การ์ดเดียว ดิเอโก้ แบรนโด · โหมดอสูรกายดึกดำบรรพ์ = diego_dino · ไม่มีการ์ดแยก", () => {
  const alt = CHAR_BY_ID.diego_alt;
  assert.strictEqual(alt.name, "ดิเอโก้ แบรนโด");
  assert.deepStrictEqual(alt.modes.map((m) => m.name), ["โลกคู่ขนาน", "อสูรกายดึกดำบรรพ์"]);
  assert.strictEqual(alt.modes[1].char, "diego_dino");
  const pub = publicRoster();
  assert.strictEqual(pub.find((c) => c.id === "diego_dino").hidden, true);
  const mode = pub.find((c) => c.id === "diego_alt").modes[1];
  assert.strictEqual(mode.charName, "ดิเอโก้ แบรนโด");
  assert.strictEqual(mode.basic.name, "อย่ามาดูถูกกันนะ");
  assert.strictEqual(mode.img, "/characters/diego_dino/cover.jpg");
  assert.ok(!CHAR_BY_ID.diego_dino.hidden, "ยังขึ้นในสมุดไดอารี่ของ Echo");
});

test("ค่าพื้นฐาน: พลังชีวิต 9 · เกราะ 2 · ม้า 5 · เดิน 5 (ขี่ม้า 6) · ตีประชิดธาตุพิษ", () => {
  const { p } = setup({ mounted: true });
  assert.strictEqual(combat.maxHpOf(p), 9);
  assert.strictEqual(combat.maxArmorOf(p), 2);
  assert.strictEqual(p.dino.horseHp, 5);
  assert.strictEqual(engine.baseMovOf(p), 6);
  p.dino.mounted = false;
  assert.strictEqual(engine.baseMovOf(p), 5);
  assert.strictEqual(dd.attackElement(engine, p), "poison");
  // สกิลที่ทำดาเมจ: ฉันจะฆ่าแก + ร่างไดโนเสาร์ทุกช่อง = ธาตุพิษ · สกิลที่ไม่มีดาเมจของร่างคน = ปกติ
  assert.strictEqual(dd.skillElement(engine, p, "ultimate"), "poison");
  assert.strictEqual(dd.skillElement(engine, p, "basic"), null);
  assert.strictEqual(dd.skillElement(engine, p, "secondary"), null);
  p.dino.form = "dino";
  for (const tier of ["basic", "secondary", "ultimate"]) assert.strictEqual(dd.skillElement(engine, p, tier), "poison");
  p.dino.form = "human";
});

test("ตีปกติโดน = ไวรัส +1 · ความบ้าคลั่ง +1 · เต็ม 3 ไม่เพิ่ม", () => {
  const { p, t } = setup();
  t.pos = { x: 7, y: 6 };
  for (let i = 0; i < 4; i++) dd.onStrikeLanded(engine, p, t);
  assert.strictEqual(t.statuses.dinoVirus, 3);
  assert.strictEqual(p.dino.frenzy, 3);
});

test("อย่ามาดูถูกกันนะ: เกราะ −2 → พลังชีวิต +2 · 2 เทิร์นไวรัส +2 ต่อครั้ง · เกราะไม่พอ = เกราะ +1", () => {
  const { p, t } = setup();
  p.armor = 2; p.hp = 5;
  engine.useSkill("a", "basic", []);
  assert.strictEqual(p.armor, 0);
  assert.strictEqual(p.hp, 7);
  assert.strictEqual(p.skillPoints, 5);
  dd.onStrikeLanded(engine, p, t);
  assert.strictEqual(t.statuses.dinoVirus, 2);
  assert.strictEqual(p.dino.frenzy, 2);
  // เกราะไม่ถึง 2
  p.skillUsedRound = false;
  engine.setActor("a");
  p.armor = 1;
  engine.useSkill("a", "basic", []);
  assert.strictEqual(p.armor, 2);
});

test("เข้าร่วมเผ่าพันธุ์: ต้องไวรัส 3 · ล้างไวรัส · ผู้เล่นดิเอโก้คุมตาของเป้า · เป้าสั่งไม่ได้ · ฝ่ายเดียวกับดิเอโก้ · ใช้ไอเทมไม่ได้", () => {
  const { p, t, u } = setup();
  t.statuses.dinoVirus = 2;
  engine.useSkill("a", "secondary", ["b"]);
  assert.strictEqual(p.skillPoints, 8, "ไวรัสไม่ถึง 3 = กดไม่ได้ ไม่เสียแต้ม");
  t.statuses.dinoVirus = 3;
  engine.useSkill("a", "secondary", ["b"]);
  assert.strictEqual(p.skillPoints, 5);
  assert.strictEqual(t.statuses.dinoVirus, 0);
  assert.ok(Possess.entryOf(t));
  // ถึงตาของเป้า
  engine.setActor("b");
  assert.strictEqual(Duo.controlledId("a"), "b");
  assert.notStrictEqual(Duo.controlledId("b"), "b");
  assert.ok(engine.sameTeam(t, p), "เป้าเป็นฝ่ายเดียวกับดิเอโก้");
  assert.ok(!engine.sameTeam(t, u), "ตีเพื่อน/คนอื่นได้");
  t.inventory = [{ uid: "x1", type: "potion" }];
  shop.useInventoryItem("b", "x1", {});
  assert.strictEqual(t.inventory.length, 1, "ใช้ไอเทมไม่ได้");
  // ตาจบ = หมดผล
  dd.afterActorEnd(engine, t);
  assert.ok(!Possess.entryOf(t));
  assert.strictEqual(Duo.controlledId("a"), "a");
  assert.ok(!engine.sameTeam(t, p));
});

test("ฉันจะฆ่าแก: คลิป · ศัตรูคนแรก −1 + ตรึง · ตีปกติใส่ = 3 + พิษร้าย 2 + เลือดไหล 1 + คลิป · ขี่ม้าใช้ไม่ได้ · ยังเดินได้", () => {
  const { p, t } = setup({ mounted: true });
  engine.useSkill("a", "ultimate", [], { dir: "right" });
  assert.strictEqual(p.skillPoints, 8, "ขี่ม้า = กดไม่ได้");
  p.dino.mounted = false;
  engine.useSkill("a", "ultimate", [], { dir: "right" });
  assert.strictEqual(p.skillPoints, 2);
  assert.deepStrictEqual(clips, [dd.CUT.swarm]);
  assert.ok(!engine.action.locked, "ใช้แล้วยังเดินได้");
  runFlow();
  assert.strictEqual(t.hp, 49);
  assert.ok(t.statuses.rooted > 0);
  assert.ok(t.dinoMark);
  assert.strictEqual(dd.damageBonus(engine, p, t), 2);
  // ตีปกติ
  engine.moveTo("a", 7, 6);
  engine.attackTarget("a", "b");
  engine.clearPhaseTimer();
  assert.strictEqual(t.hp, 46, "ดาเมจ 3");
  assert.ok(t.statuses.poison > 0, "พิษร้าย");
  assert.strictEqual(t.statuses.hbleed, 1, "เลือดไหล");
  assert.ok(!t.dinoMark && !(t.statuses.rooted > 0), "ปลดตรึง");
  assert.ok(JSON.stringify([match.cutsceneQueue, match.cutsceneInfo || null]).includes(dd.VIDEO.swarmHit), "คลิปตีใส่คนที่ถูกตรึง");
  assert.strictEqual(p.dino.swarmReady, engine.roundNumber + 3);
});

test("การกลายพันธุ์: ต้องความบ้าคลั่ง 2 · เกราะสูงสุด +6 · เกราะ +3 · ต้นตาเดินหัก 1 · หมด = คืนร่าง · เกราะลด = พลังชีวิต +1", () => {
  const { p } = setup();
  p.armor = 0;
  p.dino.frenzy = 1;
  assert.strictEqual(dd.charAction(engine, p, "mutate"), false);
  p.dino.frenzy = 2;
  assert.strictEqual(dd.charAction(engine, p, "mutate"), true);
  assert.strictEqual(p.dino.form, "dino");
  assert.ok(clips.includes(dd.CUT.transform));
  assert.strictEqual(combat.maxArmorOf(p), 8);
  assert.strictEqual(p.armor, 3);
  assert.strictEqual(engine.baseMovOf(p), 6);
  assert.strictEqual(dd.charAction(engine, p, "mutate"), false, "เทิร์นละครั้ง");
  assert.strictEqual(dd.charAction(engine, p, "horse"), false, "ขี่ม้าไม่ได้");
  assert.ok(dd.noItems(p));
  // เกราะลด = พลังชีวิต +1
  p.hp = 5;
  combat.loseArmor(p);
  assert.strictEqual(p.armor, 2);
  assert.strictEqual(p.hp, 6);
  // ต้นตาเดิน
  dd.onActorStart(engine, p);
  assert.strictEqual(p.dino.frenzy, 1);
  dd.onActorStart(engine, p);
  assert.strictEqual(p.dino.frenzy, 0);
  p.armor = 8;
  dd.onActorStart(engine, p);
  assert.strictEqual(p.dino.form, "human");
  assert.strictEqual(p.armor, 2, "เกราะเกินเพดานหาย");
});

test("ร่างไดโนเสาร์ว๊ากกก: ทุกคนในแนว −2 + ผลัก 2 · ชนสิ่งกีดขวาง +1 · ดิเอโก้พุ่งตาม", () => {
  const { p, t } = setup();
  p.dino.form = "dino";
  t.pos = { x: 8, y: 6 };
  engine.boardMap().terrain["10,6"] = "rock";
  engine.useSkill("a", "basic", [], { dir: "right" });
  runFlow();
  assert.strictEqual(p.skillPoints, 6);
  assert.deepStrictEqual(t.pos, { x: 9, y: 6 }, "ผลักได้ 1 ช่องแล้วชนหิน");
  assert.strictEqual(t.hp, 47, "−2 แล้วชน −1");
  assert.ok(t.statuses.dinoVirus === 1);
  assert.deepStrictEqual(p.pos, { x: 8, y: 6 }, "พุ่งไปช่องว่างไกลสุดก่อนเป้า");
  delete engine.boardMap().terrain["10,6"];
});

test("ร่างไดโนเสาร์อ๊ากกก: หยุดที่ศัตรูคนแรก −3 + ดูดแต้ม 2 · แต้มขาด = ดาเมจเพิ่ม · คลิป", () => {
  const { p, t } = setup({ points: 3 });
  p.dino.form = "dino";
  t.pos = { x: 9, y: 6 };
  t.skillPoints = 1;
  engine.useSkill("a", "secondary", [], { dir: "right" });
  runFlow();
  assert.ok(clips.includes(dd.CUT.leap));
  assert.deepStrictEqual(p.pos, { x: 8, y: 6 });
  assert.strictEqual(t.hp, 46, "−3 −1 (ขาดแต้ม 1)");
  assert.strictEqual(t.skillPoints, 0);
  assert.strictEqual(p.skillPoints, 1);
});

test("ร่างไดโนเสาร์ย่ำกระหม่อม: ลงช่องว่างในระยะเดิน · ข้าวหลามตัดรัศมี 4 −3 + ตรึง + ดูดแต้ม · คูลดาวน์ 3", () => {
  const { p, t, u } = setup();
  p.dino.form = "dino";
  t.pos = { x: 12, y: 6 };
  u.pos = { x: 15, y: 6 };
  // นอกระยะเดิน = กดไม่ได้
  engine.useSkill("a", "ultimate", [], { tile: { x: 6, y: 13 } });
  assert.strictEqual(p.skillPoints, 8);
  engine.useSkill("a", "ultimate", [], { tile: { x: 10, y: 6 } });
  assert.strictEqual(p.skillPoints, 4);
  runFlow();
  assert.strictEqual(p.skillPoints, 4 + 2, "ดูดมา 2");
  assert.ok(clips.includes(dd.CUT.stomp));
  assert.deepStrictEqual(p.pos, { x: 10, y: 6 });
  assert.strictEqual(t.hp, 47);
  assert.ok(t.statuses.rooted > 0);
  assert.strictEqual(u.hp, 50, "ห่าง 5 ไม่โดน");
  assert.ok(t.statuses.elPoison > 0, "ย่ำกระหม่อมเป็นธาตุพิษ (ติดคราบพิษ)");
  assert.strictEqual(p.dino.stompReady, engine.roundNumber + 3);
});

test("ไวรัสไม่ได้เพิ่ม 3 เทิร์น = ลด 1", () => {
  const { p, t } = setup();
  dd.onStrikeLanded(engine, p, t);
  dd.onStrikeLanded(engine, p, t);
  const r0 = engine.roundNumber;
  for (let i = 0; i < 2; i++) { dd.onEndTurn(engine); match.roundNumber++; }
  assert.strictEqual(t.statuses.dinoVirus, 2);
  dd.onEndTurn(engine);
  assert.strictEqual(t.statuses.dinoVirus, 1);
  match.roundNumber = r0;
});

test("ลบสกิลติดตัว: ไม่ติดไวรัส · กดกลายพันธุ์ไม่ได้", () => {
  const { p, t } = setup();
  p.statuses.noPassive = 2;
  dd.onStrikeLanded(engine, p, t);
  assert.ok(!(t.statuses.dinoVirus > 0));
  p.dino.frenzy = 5;
  assert.strictEqual(dd.charAction(engine, p, "mutate"), false);
});

test("เข้าร่วมเผ่าพันธุ์ใส่ตัวคู่ (เอมิลิโกะ): ช่วงของเอมิลิโกะในตาของคู่ = ดิเอโก้คุม · เจ้าของ (เคท) สั่งไม่ได้ · สลับตัวหนีไม่ได้ · ช่วงของเคทเจ้าของคุมตามปกติ", () => {
  const { resolveRound } = require("../../server.js");
  for (const k of Object.keys(engine.players)) delete engine.players[k];
  const mk = (id, characterId) => (engine.players[id] = { id, name: id, characterId, avatar: 0, ready: true, skillPoints: 0, alive: true, statuses: {}, statusAmt: {}, cards: [], inventory: [], cutsceneShown: {}, gold: 0, img: "" });
  mk("a", "diego_dino"); mk("k", "kate"); mk("c", "dummy");
  engine.setGameMode("ffa");
  engine.startMatch(); engine.clearPhaseTimer();
  const a = engine.players.a, k = engine.players.k, emi = engine.players[k.duoWith];
  assert.ok(emi, "มีเอมิลิโกะ");
  a.dino.mounted = false;
  a.cards = [{ value: 10, suit: "H" }]; k.cards = [{ value: 5, suit: "S" }]; engine.players.c.cards = [{ value: 2, suit: "S" }];
  resolveRound(); engine.clearPhaseTimer();
  for (let i = 0; i < 3 && engine.actorId !== "a"; i++) { engine.finishActor(); engine.clearPhaseTimer(); }
  assert.strictEqual(engine.actorId, "a");
  clear(8, 8, 8);
  a.pos = { x: 6, y: 6 }; k.pos = { x: 9, y: 6 }; emi.pos = { x: 9, y: 8 };
  a.skillPoints = 8;
  emi.statuses.dinoVirus = 3;
  engine.useSkill("a", "secondary", [emi.id]);
  assert.strictEqual(a.skillPoints, 5);
  assert.ok(Possess.entryOf(emi));
  // ตาของคู่: ช่วงเคท = เจ้าของคุม
  for (let i = 0; i < 3 && engine.actorId !== "k" && engine.actorId !== emi.id; i++) { engine.finishActor(); engine.clearPhaseTimer(); }
  if (engine.actorId === "k") {
    assert.strictEqual(Duo.controlledId("k"), "k");
    assert.strictEqual(Duo.controlledId("a"), "a");
    engine.finishActor(); engine.clearPhaseTimer();
  }
  // ช่วงเอมิลิโกะ = ดิเอโก้คุม
  assert.strictEqual(engine.actorId, emi.id);
  assert.strictEqual(Duo.controlledId("a"), emi.id);
  assert.ok(Duo.controlledId("k").startsWith(Possess.LOCKED_PREFIX), "เจ้าของสั่งไม่ได้");
  assert.ok(engine.sameTeam(emi, a));
  assert.ok(!engine.sameTeam(emi, k), "ตีเคทได้");
  assert.strictEqual(Duo.canSwitchTo(k), false, "สลับตัวหนีไม่ได้");
  // เอมิลิโกะเดินต่อหลังจบตาได้ (canto) — ยังเป็นช่วงของเอมิลิโกะ ดิเอโก้คุมต่อ
  for (let i = 0; i < 3 && engine.actorId === emi.id; i++) { engine.finishActor(); engine.clearPhaseTimer(); if (engine.actorId === emi.id) assert.strictEqual(Duo.controlledId("a"), emi.id); }
  assert.ok(!Possess.entryOf(emi), "จบช่วงของเอมิลิโกะ = หมดผล");
  engine.clearPhaseTimer();
});
