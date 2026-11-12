const test = require("node:test");
const assert = require("node:assert");
const { engine } = require("../../server.js");
const kiri = require("../../characters/emiya_kiritsugu");
const Board = require("../../server/board");

const clips = [];
let realQueue, realFlash, realPause, realRandom;
test.before(() => {
  realQueue = engine.queueCutscene;
  realFlash = engine.skillFlash;
  realPause = engine.pausePlayingForCutscene;
  engine.queueCutscene = (p, k) => { clips.push(k); };
  engine.skillFlash = () => {};
  realRandom = Math.random;
});
test.after(() => { engine.queueCutscene = realQueue; engine.skillFlash = realFlash; engine.pausePlayingForCutscene = realPause; Math.random = realRandom; });
test.afterEach(() => { engine.clearPhaseTimer(); Math.random = realRandom; clips.length = 0; require("../../server/clockUp").reset(); engine.setGameMode("ffa"); });

// พื้นโล่งรอบ (cx, cy) ในรัศมี 4 — กันเทสต์แกว่งตามแผนที่สุ่ม
function clear(cx, cy) {
  const map = engine.boardMap();
  for (let y = cy - 4; y <= cy + 4; y++) for (let x = cx - 4; x <= cx + 4; x++) {
    delete map.terrain[`${x},${y}`];
    if (map.special) delete map.special[`${x},${y}`];
  }
}
function setup({ points = 8 } = {}) {
  for (const k of Object.keys(engine.players)) delete engine.players[k];
  const mk = (id, characterId) => {
    engine.players[id] = {
      id, name: id, characterId, avatar: 0, ready: true, skillPoints: 0, alive: true, statuses: {}, statusAmt: {},
      cards: [], inventory: [], cutsceneShown: {}, gold: 0, img: "",
    };
    return engine.players[id];
  };
  mk("a", "emiya_kiritsugu");
  mk("b", "dummy");
  mk("c", "dummy");
  engine.startMatch();
  engine.clearPhaseTimer();
  const p = engine.players.a, t = engine.players.b, u = engine.players.c;
  p.skillPoints = points;
  p.pos = { x: 5, y: 5 };
  t.pos = { x: 6, y: 5 };
  u.pos = { x: 9, y: 9 };
  t.hp = 7; t.armor = 0; u.hp = 7; u.armor = 0;
  clear(5, 5);
  engine.setActor("a");
  return { p, t, u };
}
const use = (tier, form, extra = {}) => engine.useSkill("a", tier, extra.targets || [], { form, ...extra });

test("ค่าพื้นฐาน: พลังชีวิต 7 · เกราะ 3 · เดิน 4 · ตีปกติปืนกลระยะ 1–3", () => {
  const { p } = setup();
  assert.deepEqual(engine.rangeOf(p), [1, 3]);
  assert.equal(engine.maxHpOf(p), 7);
  assert.equal(p.hp, 7);
  assert.equal(engine.baseMovOf(p), 4);
  assert.equal(kiri.attackStyle(p), "kiriSmg");
  assert.equal(kiri.attackSound(p), "kiri_smg");
  assert.equal(kiri.critPct(p), 50);
});

test("ระเบิดควัน: 2 แต้ม · รูป + ทับช่อง → special smoke ซ่อนตัว · ยังเดินได้ · หาย 2 เทิร์น", () => {
  const { p } = setup();
  use("basic", "smoke", { tile: { x: 6, y: 6 } });
  assert.equal(p.skillPoints, 6);
  assert.equal(engine.action.locked, false, "ใช้แล้วยังเดินได้");
  const map = engine.boardMap();
  for (const [x, y] of [[6, 6], [7, 6], [5, 6], [6, 7], [6, 5]]) assert.equal(map.special[`${x},${y}`], "smoke", `${x},${y}`);
  assert.equal(Board.TERRAIN_INFO.smoke.bush, true);
  engine.endTurn(); engine.clearPhaseTimer();
  assert.equal(engine.boardMap().special["6,6"], "smoke");
  engine.endTurn(); engine.clearPhaseTimer();
  assert.notEqual(engine.boardMap().special["6,6"], "smoke");
});

test("โยนได้เฉพาะรอบตัว 8 ช่อง · ไกลกว่านั้นไม่เสียแต้ม", () => {
  const { p } = setup();
  use("basic", "smoke", { tile: { x: 7, y: 5 } });
  assert.equal(p.skillPoints, 8);
  use("basic", "mine", { tile: { x: 4, y: 4 } }); // ทแยงได้
  assert.equal(p.skillPoints, 6);
});

test("กับดักระเบิด: ช่องศัตรูวางไม่ได้ · 3 อัน อันเก่าสุดหาย · ศัตรูเหยียบ = 3 หลบได้", () => {
  const { p, u } = setup({ points: 20 });
  const lay = (x, y) => { p.kiri.arsenalUses = 0; engine.setActor("a"); use("basic", "mine", { tile: { x, y } }); };
  lay(6, 5); // มีศัตรูยืน
  assert.equal(p.kiri.mines.length, 0);
  lay(4, 4); lay(4, 5); lay(4, 6); lay(5, 4);
  assert.equal(p.kiri.mines.length, 3);
  assert.ok(!p.kiri.mines.some((m) => m.x === 4 && m.y === 4), "อันแรกหาย");
  // สนาม Eos ไม่จำกัด (ทดสอบผ่านฮุคตรง — Fodlan ปิดอยู่จึงจำลองด้วยการเติมเอง)
  const pub = kiri.boardPublic(engine);
  assert.equal(pub.kiritsugu.mines.length, 3, "ทุกคนเห็น");
  // ศัตรูเหยียบ = ระเบิด 3×3: คนเหยียบ + ศัตรูในวงโดน · ตัวเองไม่โดน
  Math.random = () => 0.99;
  u.pos = { x: 3, y: 3 };
  const t = engine.players.b;
  t.pos = { x: 3, y: 6 }; t.hp = 7; t.armor = 0; // ห่างจากกับดัก (4,5) แนวทแยง = ในวง 3×3
  p.armor = 0;
  engine.setActor("c");
  engine.moveTo("c", 3, 5); // ผ่าน (3,4) → (3,5) ไม่มีกับดัก
  engine.moveTo("c", 4, 5);
  assert.deepEqual(u.pos, { x: 4, y: 5 }, "เหยียบช่องแรกที่มีกับดัก หยุดตรงนั้น");
  assert.equal(u.hp, 4);
  assert.equal(t.hp, 4, "ศัตรูในวง 3×3 โดนด้วย");
  assert.equal(p.hp, 7, "เจ้าของกับดักไม่โดน (ยืน 5,5 อยู่ในวง)");
  assert.equal(p.kiri.mines.length, 2);
});

test("ผ่าพันแผล: เกราะ +2 ไม่เกินเพดาน · เกราะเต็มกดไม่ได้", () => {
  const { p } = setup();
  p.armor = 0;
  use("basic", "bandage");
  assert.equal(p.armor, 2);
  p.skillUsedRound = false;
  p.armor = engine.maxArmorOf(p);
  const sp = p.skillPoints;
  use("basic", "bandage");
  assert.equal(p.skillPoints, sp);
});

test("Time Alter Double: ความจุ −1 · Clock Up 2 ครั้ง · เดิน 7 · คลิป · ไม่มีคริ · คูลดาวน์ 1", () => {
  const { p } = setup();
  p.armor = 0;
  use("secondary", "double");
  assert.equal(p.skillPoints, 6);
  assert.equal(engine.maxHpOf(p), 6);
  assert.equal(p.hp, 6);
  assert.deepEqual(clips, [kiri.CUT.double]);
  const m = engine.clockUp.memberOf(p);
  assert.equal(m.kind, "alter");
  assert.equal(m.max, 2);
  assert.equal(engine.clockUp.active().music, "kiri_alter");
  assert.equal(engine.baseMovOf(p), 7);
  assert.equal(kiri.critPct(p), 0, "เวทย์ตะกั่วไม่ติดใน Time Alter");
  assert.equal(p.skillUsedRound, false, "ไม่กินโควตา");
  // ใช้สกิลนับเป็น 1 ครั้ง · ครั้งที่ 2 = จบ
  assert.equal(kiri.endsTurn(engine, p, "basic"), false);
  use("basic", "bandage");
  assert.equal(m.hits, 1);
  assert.equal(kiri.endsTurn(engine, p, "basic"), true);
  assert.equal(kiri.skillLocks(engine, p).secondary.locked, true);
  kiri.onClockDone(engine, p);
  p.kiri.alter = null;
  require("../../server/clockUp").reset();
  assert.equal(kiri.skillLocks(engine, p).secondary.cd, 2);
});

test("Square Accel: ความจุ −2 · 4 ครั้ง · ความจุต่ำสุด 1 แล้วยังใช้ได้เสียแค่แต้ม", () => {
  const { p } = setup({ points: 30 });
  use("secondary", "square");
  assert.equal(engine.maxHpOf(p), 5);
  assert.equal(engine.clockUp.memberOf(p).max, 4);
  p.kiri.hpLost = 6;
  p.kiri.alter = null; p.kiri.alterReady = 0;
  require("../../server/clockUp").reset();
  engine.setActor("a");
  const sp = p.skillPoints;
  use("secondary", "square");
  assert.equal(engine.maxHpOf(p), 1);
  assert.equal(p.skillPoints, sp - 2);
});

test("Time Alter นอกตา: ปุ่ม 2 แบบ แทรกตาคนอื่น · คลิปตอนตาพิเศษเริ่ม", () => {
  const { p } = setup();
  engine.setActor("b");
  const st = kiri.kiritsuguState(engine, p);
  assert.equal(st.canAlter, true);
  assert.equal(kiri.charAction(engine, p, "kiri:square"), true);
  assert.equal(p.skillPoints, 6);
  assert.equal(engine.maxHpOf(p), 5);
  assert.equal(p.kiri.alter.kind, "square");
});

test("Eos: Time Alter พลังโจมตี +2 · คริยังติด", () => {
  const { p } = setup();
  use("secondary", "double");
  const Fodlan = require("../../server/fodlan");
  const real = Fodlan.isEos;
  Fodlan.isEos = () => true;
  try {
    assert.equal(kiri.damageBonus(engine, p), 2);
    assert.equal(kiri.critPct(p), 50);
  } finally { Fodlan.isEos = real; }
  assert.equal(kiri.damageBonus(engine, p), 0);
});

test("Thompson Contender: เริ่มเกมพร้อมยิง 0 แต้ม · โดนคนแรก · ดีบัฟ 3 อย่าง · ต้องเติม 4 แต้ม · 3 นัดต่อเกม", () => {
  const { p, t, u } = setup({ points: 20 });
  u.pos = { x: 8, y: 5 };
  Math.random = () => 0.99;
  engine.useSkill("a", "ultimate", [], { dir: "right" });
  assert.equal(p.skillPoints, 20, "ยิงไม่ใช้แต้ม");
  assert.deepEqual(clips, [kiri.CUT.shoot, kiri.CUT.hit], "คลิปยิง → คลิปโดนต่อทันที");
  assert.equal(t.hp, 6, "ตามพลังโจมตี 1");
  assert.equal(u.hp, 7, "โดนแค่คนแรก");
  for (const k of ["noskill", "manaSeal", "decay"]) assert.ok(t.statuses[k] >= 3, k);
  assert.equal(p.kiri.loaded, false);
  assert.equal(p.kiri.shots, 2);
  assert.equal(kiri.skillPub(p, "ultimate").name, "เติมกระสุน");
  // เติมกระสุน: 4 แต้ม ไม่กินโควตา
  engine.setActor("a");
  engine.useSkill("a", "ultimate", []);
  assert.equal(p.skillPoints, 16);
  assert.equal(p.kiri.loaded, true);
  // นัดที่สอง: คลิปโดนเล่นครั้งเดียวต่อเกม
  clips.length = 0; t.hp = 7; p.skillUsedRound = false; // นัดใหม่ = เทิร์นใหม่ (ยิงกินโควตา)
  engine.setActor("a");
  engine.useSkill("a", "ultimate", [], { dir: "right" });
  assert.deepEqual(clips, [kiri.CUT.shoot]);
  assert.equal(t.hp, 6);
  p.kiri.shots = 0;
  assert.equal(kiri.skillLocks(engine, p).ultimate.locked, true);
});

test("Thompson หลบได้ = ไม่มีคลิปโดน ไม่มีดีบัฟ", () => {
  const { t } = setup();
  t.statuses.evade = 1; t.statusAmt.evade = 100;
  engine.useSkill("a", "ultimate", [], { dir: "right" });
  assert.deepEqual(clips, [kiri.CUT.shoot]);
  assert.equal(t.hp, 7);
  assert.ok(!(t.statuses.noskill > 0));
});

test("Double Accel: รีโหลด + ยิง = 2 action พอดี · คลิปแบบ Time Alter", () => {
  const { p, t } = setup({ points: 20 });
  p.kiri.loaded = false;
  use("secondary", "double");
  clips.length = 0;
  Math.random = () => 0.99;
  engine.useSkill("a", "ultimate", []);
  assert.deepEqual(clips, [kiri.CUT.alterReload]);
  assert.equal(engine.clockUp.memberOf(p).hits, 1);
  assert.equal(kiri.endsTurn(engine, p, "ultimate"), true, "ยิงครั้งนี้ = ครั้งสุดท้าย");
  clips.length = 0;
  engine.useSkill("a", "ultimate", [], { dir: "right" });
  assert.deepEqual(clips, [kiri.CUT.alterShoot]);
  assert.equal(t.hp, 6);
  // รีโหลดใน Time Alter รอบสอง: ไม่มีคลิปแล้ว
  require("../../server/clockUp").reset(); p.kiri.alter = null; p.kiri.alterReady = 0;
  engine.setActor("a");
  use("secondary", "double");
  clips.length = 0;
  engine.useSkill("a", "ultimate", []);
  assert.deepEqual(clips, []);
  assert.equal(p.kiri.loaded, true);
});

test("Eos Thompson: ทุกตัวในแนว · 50% สังหาร · ไม่สังหาร/บอส = พลังโจมตี +5", () => {
  const { t, u } = setup();
  u.pos = { x: 8, y: 5 }; u.hp = 30;
  u.summon = { trait: "boss" };
  const Fodlan = require("../../server/fodlan");
  const real = Fodlan.isEos;
  Fodlan.isEos = () => true;
  Math.random = () => 0.3; // ไม่หลบ (พื้นโล่ง) · ทอยสังหาร 50% ผ่าน · บอสทอยคริผ่าน
  try {
    engine.useSkill("a", "ultimate", [], { dir: "right" });
  } finally { Fodlan.isEos = real; delete u.summon; }
  assert.equal(t.alive, false, "สังหาร");
  assert.equal(u.alive, true, "บอสไม่โดนสังหาร");
  assert.equal(u.hp, 18, "บอส: (พลังโจมตี 1 + 5) × คริ 2 = 12");
});

test("อดีนาลีน: ความเสียหายจากศัตรูลงอีก 2 เทิร์น · แต่ละเทิร์นแยกกัน", () => {
  const { p, t } = setup();
  p.armor = 0;
  engine.withEffectSource(t, () => engine.dealMixed(p, 2, true));
  assert.equal(p.hp, 7);
  assert.equal(p.kiri.pending.length, 1);
  const r = engine.roundNumber;
  engine.setRoundNumber(r + 1);
  engine.withEffectSource(t, () => engine.dealMixed(p, 1, true));
  kiri.onRoundStartTick(engine, p);
  assert.equal(p.hp, 7, "ยังไม่ถึง");
  engine.setRoundNumber(r + 2);
  kiri.onRoundStartTick(engine, p);
  assert.equal(p.hp, 5, "ของเทิร์นแรกลง");
  engine.setRoundNumber(r + 3);
  kiri.onRoundStartTick(engine, p);
  assert.equal(p.hp, 4, "ของเทิร์นที่สองลงแยก");
  // ไม่มีต้นตอ (ผลสนาม) = ลงทันที
  engine.withEffectSource(null, () => engine.dealMixed(p, 1, false));
  assert.equal(p.hp, 3);
});

test("การเอาตัวรอดขั้นสุดยอด: ความเสียหายถึงตาย 50% กันได้ + Double Accel ฟรีตาเดินถัดไป · 1 ครั้งต่อเกม", () => {
  const { p, t } = setup();
  p.armor = 0; p.hp = 2;
  engine.withEffectSource(t, () => engine.dealMixed(p, 5, true));
  const r = engine.roundNumber;
  engine.setRoundNumber(r + 2);
  Math.random = () => 0.99; // ทอยไม่ผ่าน → ตาย แต่ไม่เสียสิทธิ์
  p.kiri.pending.push({ round: r + 2, n: 1, kind: "mixed", src: "b" });
  p.hp = 2;
  p.kiri.pending = [{ round: r + 2, n: 5, kind: "mixed", src: "b" }];
  Math.random = () => 0.1;
  kiri.onRoundStartTick(engine, p);
  assert.equal(p.alive, true);
  assert.equal(p.hp, 2);
  assert.equal(p.kiri.lastUsed, true);
  assert.equal(p.kiri.freeAccel, true);
  engine.setActor("a");
  kiri.onActorReady(engine, p);
  assert.equal(p.kiri.alter.kind, "double");
  assert.equal(p.kiri.alter.free, true);
  assert.equal(engine.maxHpOf(p), 7, "ฟรี ไม่ลดความจุ");
  assert.equal(engine.clockUp.memberOf(p).max, 2);
});

test("การเอาตัวรอด: ทอยไม่ผ่านไม่เสียสิทธิ์", () => {
  const { p } = setup();
  p.armor = 0; p.hp = 1;
  Math.random = () => 0.99;
  engine.withEffectSource(null, () => engine.dealMixed(p, 3, false));
  assert.ok(p.hp <= 0);
  assert.equal(p.kiri.lastUsed, false);
});

test("ตาย/เปลี่ยนแผนที่ = กับดักหาย · มีฮุค severables", () => {
  const { p } = setup();
  use("basic", "mine", { tile: { x: 4, y: 4 } });
  assert.equal(p.kiri.mines.length, 1);
  kiri.onBoardPlaced(engine);
  assert.equal(p.kiri.mines.length, 0);
  assert.deepEqual(kiri.severables(engine, p), []);
  p.kiri.freeAccel = true;
  const sv = kiri.severables(engine, p);
  assert.equal(sv.length, 1);
  sv[0].cancel();
  assert.equal(p.kiri.freeAccel, false);
});

test("ปืนกล: ตีได้ไกล 3 ช่อง · 4 ช่องไม่ได้", () => {
  const { p, t } = setup();
  Math.random = () => 0.99; // ไม่หลบ ไม่คริ
  t.pos = { x: 8, y: 5 };
  t.hp = 7; t.armor = 0;
  engine.attackTarget("a", "b");
  engine.clearPhaseTimer();
  assert.equal(t.hp, 6);
  assert.equal(p.hp, 7, "ตีปกติไม่มีตีสวน (GRID_PLAN §6)");
  engine.setActor("a");
  t.pos = { x: 9, y: 5 };
  engine.attackTarget("a", "b");
  engine.clearPhaseTimer();
  assert.equal(t.hp, 6, "เกินระยะ");
});

test("การเอาตัวรอด: อดีนาลีนลงหลายก้อนในเทิร์นเดียว ก้อนที่ถึงตาย = ความเสียหาย 0 (คืนค่าก่อนโดน)", () => {
  const { p } = setup();
  p.hp = 4; p.armor = 0;
  const r = engine.roundNumber;
  p.kiri.pending = [{ round: r, n: 3, kind: "mixed", src: "b" }, { round: r, n: 3, kind: "mixed", src: "b" }];
  Math.random = () => 0.1;
  kiri.onRoundStartTick(engine, p);
  assert.equal(p.alive, true);
  assert.equal(p.hp, 1, "ก้อนแรกลง · ก้อนที่สองถึงตาย = ไม่ได้รับ");
  assert.equal(p.kiri.lastUsed, true);
  // ใช้สิทธิ์แล้ว: ครั้งต่อไปตายจริง
  p.kiri.pending = [{ round: r, n: 3, kind: "mixed", src: "b" }];
  kiri.onRoundStartTick(engine, p);
  assert.equal(p.alive, false);
});

test("การเอาตัวรอด: ทอยไม่ผ่าน = ตาย · ไม่เสียสิทธิ์ถ้ายังไม่เคยผ่าน", () => {
  const { p } = setup();
  p.hp = 2; p.armor = 0;
  const r = engine.roundNumber;
  p.kiri.pending = [{ round: r, n: 5, kind: "mixed", src: "b" }];
  Math.random = () => 0.99;
  kiri.onRoundStartTick(engine, p);
  assert.equal(p.alive, false);
  assert.equal(p.kiri.lastUsed, false);
});

test("คลังแสง: 2 ครั้งต่อเทิร์น ไม่กินโควตาสกิล · ครั้งที่ 3 ไม่เสียแต้ม · เทิร์นใหม่นับใหม่ · Eos ไม่จำกัด", () => {
  const { p } = setup({ points: 20 });
  p.armor = 0;
  use("basic", "bandage");
  use("basic", "smoke", { tile: { x: 4, y: 5 } });
  assert.equal(p.skillPoints, 16);
  assert.equal(p.skillUsedRound, false, "ไม่นับโควตา");
  use("basic", "bandage");
  assert.equal(p.skillPoints, 16, "ครั้งที่ 3 ใช้ไม่ได้");
  assert.equal(kiri.skillLocks(engine, p).basic.locked, true);
  engine.setRoundNumber(engine.roundNumber + 1);
  engine.setActor("a");
  p.armor = 0;
  use("basic", "bandage");
  assert.equal(p.skillPoints, 14, "เทิร์นใหม่นับใหม่");
  const Fodlan = require("../../server/fodlan");
  const real = Fodlan.isEos;
  Fodlan.isEos = () => true;
  try {
    for (let i = 0; i < 3; i++) { p.armor = 0; use("basic", "bandage"); }
    assert.equal(p.skillPoints, 8, "Eos ไม่จำกัด");
  } finally { Fodlan.isEos = real; }
});

test("Eos Thompson: ทอยสังหารไม่ผ่าน = ความเสียหาย พลังโจมตี +5 + ดีบัฟ", () => {
  const { t } = setup();
  t.hp = 20; t.armor = 0;
  const Fodlan = require("../../server/fodlan");
  const real = Fodlan.isEos;
  Fodlan.isEos = () => true;
  Math.random = () => 0.99; // ไม่หลบ · ทอยสังหารไม่ผ่าน · ไม่คริ
  try { engine.useSkill("a", "ultimate", [], { dir: "right" }); } finally { Fodlan.isEos = real; }
  assert.equal(t.alive, true);
  assert.equal(t.hp, 14, "1 + 5 = 6");
  assert.ok(t.statuses.noskill > 0);
});

test("Eos Thompson: ไม่สังหาร + ติดคริ = (พลังโจมตี + 5) × 2", () => {
  const { p, t } = setup();
  t.hp = 30; t.armor = 0;
  const Fodlan = require("../../server/fodlan");
  const real = Fodlan.isEos;
  Fodlan.isEos = () => true;
  const rolls = [0.99, 0.1]; // ทอยสังหาร (ไม่ผ่าน) → ทอยคริ (ผ่าน) · ทอยอื่น (หลบ) = 0.99
  Math.random = () => (rolls.length ? rolls.shift() : 0.99);
  try { engine.useSkill("a", "ultimate", [], { dir: "right" }); } finally { Fodlan.isEos = real; }
  assert.equal(t.hp, 18, "(1 + 5) × 2 = 12");
  void p;
});
