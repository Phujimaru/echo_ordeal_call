// นารุโฮโดะ ริวอิจิ (characters/naruhodo_ryuichi.js · server/court.js · GRID_PLAN §7.38 · สัญญา .claude/plans/naruhodo-contract.md)
process.env.JOURNEY_START_SECONDS = "0";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { engine } = require("../../server.js");
const match = require("../../server/match");
const Court = require("../../server/court");
const Lines = require("../../server/courtLines");
const Ev = require("../../characters/_court_evidence");
const N = require("../../characters/naruhodo_ryuichi");
const Sever = require("../../server/sever");
const Visibility = require("../../server/visibility");

const saved = { queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash, boardFx: engine.boardFx, triggerCutscene: engine.triggerCutscene };
const fx = [];
let realRandom;
test.before(() => {
  engine.queueCutscene = () => {}; engine.triggerCutscene = () => {}; engine.skillFlash = () => {};
  engine.boardFx = (event, payload) => fx.push({ event, payload });
  realRandom = Math.random;
});
test.after(() => { Object.assign(engine, saved); engine.clearPhaseTimer(); for (const k of Object.keys(engine.players)) delete engine.players[k]; });
test.afterEach(() => {
  engine.clearPhaseTimer(); Math.random = realRandom;
  match.court = null; match.holdIt = null; match.skillBeats = []; match.afterCutscene = []; match.cutsceneQueue = []; match.extraTurns = []; match.flowWanted = false;
  while (engine.releaseBeat()) { /* ปล่อยจังหวะเปิดที่ค้าง */ }
  engine.clearPhaseTimer();
  match.skillBeats = [];
  fx.length = 0;
});

function clear(cx, cy, r = 9) {
  const map = engine.boardMap();
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
    delete map.terrain[`${x},${y}`];
    if (map.special) delete map.special[`${x},${y}`];
  }
}
// A = นารุโฮโดะ · B = จำเลย · C/D/E/F = คนอื่น (ประชาชน)
const POLICE = Court.RULES.policeEvidence, BONUS = Court.RULES.bonusAlibi;
test.after(() => { Court.RULES.policeEvidence = POLICE; Court.RULES.bonusAlibi = BONUS; });
// ปิดหลักฐานตำรวจ/ข้อแก้ตัวโบนัสในเทสต์ทั่วไป (เทสต์เฉพาะเปิดเอง) — ตัวเลขจริงตรวจในเทสต์ "ตัวเลขศาล"
function setup({ others = ["muimi"], extra = 0, police = 0, bonus = 0 } = {}) {
  Court.RULES.policeEvidence = police;
  Court.RULES.bonusAlibi = bonus;
  for (const k of Object.keys(engine.players)) delete engine.players[k];
  const mk = (id, characterId, position) => {
    engine.players[id] = {
      id, name: id, characterId, avatar: 0, position, ready: true, connected: true, skillPoints: 0, alive: true, statuses: {}, statusAmt: {},
      cards: [], inventory: [], cutsceneShown: {}, seen: {}, gold: 0, img: "", teamId: null,
    };
    return engine.players[id];
  };
  mk("A", "naruhodo_ryuichi", 1);
  mk("B", others[0], 2);
  const ids = ["C", "D", "E", "F", "G"];
  for (let i = 0; i < extra; i++) mk(ids[i], "muimi", 3 + i);
  engine.setGameMode("ffa");
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.placeOnBoard(1);
  clear(6, 6);
  const A = engine.players.A, B = engine.players.B;
  A.pos = { x: 6, y: 6 }; B.pos = { x: 8, y: 6 };
  for (let i = 0; i < extra; i++) engine.players[ids[i]].pos = { x: 4 + i, y: 9 };
  A.skillPoints = 8;
  B.hp = 10; B.armor = 0;
  match.court = null; match.holdIt = null; match.courtLog = [];
  return { A, B };
}
// ปล่อยจังหวะศาลจนถึงขั้น phase (หรือคดีจบ)
function drive(phase, max = 60) {
  for (let i = 0; i < max; i++) {
    const c = match.court;
    if (!c || c.phase === phase) return c;
    if (!engine.releaseBeat()) return match.court;
  }
  return match.court;
}
// เปิดคดีตรงๆ (ข้ามทอยหลบ) แล้วตั้งคำให้การเอง
function openCourt(A, B, list) {
  engine.setActor("A");
  engine.court.start(A, B);
  engine.pausePlayingForCutscene();
  B.connected = list ? true : false;
  const c = drive("testimony");
  if (list && c && c.phase === "testimony") {
    c.pool = list.map((s, i) => ({ key: `k${i}`, ...s }));
    assert.equal(Court.testimony("B", c.pool.map((s) => ({ key: s.key, alibi: !!s.alibi }))), true);
  }
  return drive("cross");
}
const base5 = (c) => { c.cred.L = 5; c.cred.D = 5; c.warned = { L: 0, D: 0 }; return c; };
const ev = (over) => ({ id: `x${Math.random()}`, round: 2, actorId: "B", actorName: "B", kind: "basic", skill: "ฟัน", targetName: "C", type: "weapon", seenBy: ["A"], ...over });

test("ข้อมูลตัวละคร: ระยะ · ราคา · พิเศษ unique · ทุกสกิลมีพื้นที่", () => {
  const ch = engine.CHAR_BY_ID.naruhodo_ryuichi;
  assert.equal(ch.difficulty, "special");
  assert.equal(ch.unique, true);
  assert.deepEqual(ch.range, [1, 1]);
  assert.equal(ch.mov, 4);
  assert.deepEqual(ch.basic.area, { kind: "self" });
  assert.equal(ch.basic.img, "/characters/naruhodo_ryuichi/skill1.webp");
  assert.equal(ch.secondary.img, "/characters/naruhodo_ryuichi/skill2.webp");
  assert.deepEqual(ch.secondary.area, { kind: "target", range: 4, hostile: true });
  assert.deepEqual(ch.ultimate.area, { kind: "target", range: 5, hostile: true });
  assert.deepEqual([ch.basic.cost, ch.secondary.cost, ch.ultimate.cost], [0, 2, 4]);
});

test("ไอคอนหลักฐาน server = client (evidenceData.js)", () => {
  const src = fs.readFileSync(path.join(__dirname, "../../client/src/court/evidenceData.js"), "utf8").replace(/export\s+/g, "");
  const ctx = {};
  vm.runInNewContext(`${src}\n;this.N = EV_ICON_NAMES; this.P = EV_POOLS; this.I = typeof iconFor === "function" ? iconFor : null;`, ctx);
  assert.deepEqual([...ctx.N], Ev.EV_ICON_NAMES);
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.P)), Ev.EV_POOLS);
  if (ctx.I) for (const seed of ["e1", "e22", "abc"]) for (const t of ["weapon", "foot", "receipt", "witness"]) assert.equal(ctx.I(t, seed), Ev.iconFor(t, seed));
});

test("บันทึกเหตุการณ์: นารุโฮโดะเห็น = หลักฐาน · ไม่มีใครเห็น = ข้อแก้ตัว · ทุกคนจดการเห็น", () => {
  const { A, B } = setup({ extra: 1 });
  const C = engine.players.C;
  C.pos = { x: 9, y: 7 };
  const e = Court.noteAct(B, "basic", "ฟันดาบ", ["C"]);
  assert.ok(e && e.seenBy.includes("A") && e.seenBy.includes("C"));
  const v = Court.liveEvidence(A);
  assert.equal(v.length, 1);
  assert.equal(v[0].actorId, "B");
  assert.equal(v[0].type, "weapon");
  assert.ok(Number.isInteger(v[0].icon) && v[0].name && v[0].desc.includes("ฟันดาบ"));
  assert.equal(B.courtAlibi || 0, 0);
  // นอกระยะ 4 = ข้อแก้ตัว
  B.pos = { x: 14, y: 6 };
  Court.noteAct(B, "secondary", "ยา", []);
  assert.equal(B.courtAlibi, 1);
  Court.noteAct(B, "secondary", "ยา", []); Court.noteAct(B, "secondary", "ยา", []); Court.noteAct(B, "secondary", "ยา", []);
  assert.equal(B.courtAlibi, 3, "ข้อแก้ตัวสูงสุด 3");
  // แฟ้มสูงสุด 5
  B.pos = { x: 8, y: 6 };
  for (let i = 0; i < 7; i++) Court.noteAct(B, "attack", "ตีปกติ", ["A"]);
  assert.equal(Court.liveEvidence(A).length, 5);
  // นารุโฮโดะเองไม่ถูกบันทึก
  assert.equal(Court.noteAct(A, "basic", "เอานี่ไปดู!", ["B"]), null);
});

test("บันทึกเหตุการณ์: ไม่มีนารุโฮโดะในแมตช์ = ไม่จด", () => {
  const { A, B } = setup();
  A.characterId = "muimi";
  assert.equal(Court.noteAct(B, "basic", "x", []), null);
  assert.equal((match.courtLog || []).length, 0);
});

test("ตีปกติของศัตรูถูกจดผ่าน action.strikeTarget", () => {
  const { A, B } = setup();
  B.pos = { x: 7, y: 6 };
  engine.setActor("B");
  engine.attackTarget("B", "A");
  const e = (match.courtLog || []).find((x) => x.actorId === "B" && x.kind === "attack");
  assert.ok(e, "มีเหตุการณ์ตีปกติ");
  assert.ok(Court.liveEvidence(A).some((v) => v.evKey === e.id));
});

test("แลกข้อมูล: ต้องมีหลักฐาน · ทิ้ง 1 ชิ้นแลก แต้ม +2 / พลังชีวิต +1 / รอเดี๋ยว!!! −1 · กินโควตา · ล็อกการเดิน · คูลดาวน์ 2 · ตัวเลือกมี desc", () => {
  const { A, B } = setup();
  engine.setActor("A");
  // ไม่มีหลักฐาน = กดไม่ได้
  A.naruhodo.evidence = [];
  assert.equal(N.skillLocks(engine, A).basic.locked, true);
  engine.useSkill("A", "basic", [], { form: "x|sp" });
  assert.equal(A.skillUsedRound, false);
  const v1 = Court.addEvidence(A, ev({ id: "t1" })), v2 = Court.addEvidence(A, ev({ id: "t2" })), v3 = Court.addEvidence(A, ev({ id: "t3" }));
  const pub = engine.buildStateFor("A").players.find((p) => p.id === "A").character.basic;
  assert.equal(pub.choices.length, 9, "หลักฐาน 3 × รางวัล 3");
  for (const o of pub.choices) assert.ok(o.desc && o.evId && o.reward && Number.isInteger(o.evIcon));
  // แต้ม +2
  A.skillPoints = 3;
  engine.useSkill("A", "basic", [], { form: `${v1.id}|sp` });
  assert.equal(A.skillPoints, 5);
  assert.ok(!Court.liveEvidence(A).some((v) => v.id === v1.id), "หลักฐานถูกทิ้ง");
  assert.equal(A.skillUsedRound, true, "กินโควตา");
  assert.equal(engine.action.locked, true, "ล็อกการเดิน");
  assert.equal(N.skillLocks(engine, A).basic.cd, 2);
  assert.ok(fx.some((f) => f.event === "naruhodoScout" && f.payload.kind === "trade" && f.payload.reward === "sp"));
  // พลังชีวิต +1 (เทิร์นถัดไป)
  A.naruhodo.tradeReady = 0; A.skillUsedRound = false; engine.setActor("A");
  A.hp = 5;
  engine.useSkill("A", "basic", [], { form: `${v2.id}|hp` });
  assert.equal(A.hp, 6);
  // รอเดี๋ยว!!! −1 · ไม่มีคูลดาวน์ให้ลด = กดไม่ได้
  A.naruhodo.tradeReady = 0; A.skillUsedRound = false; engine.setActor("A");
  A.naruhodo.holdReady = 0;
  engine.useSkill("A", "basic", [], { form: `${v3.id}|hold` });
  assert.ok(Court.liveEvidence(A).some((v) => v.id === v3.id), "ไม่มีผล = ไม่ใช้");
  A.naruhodo.holdReady = engine.roundNumber + 3;
  engine.useSkill("A", "basic", [], { form: `${v3.id}|hold` });
  assert.equal(A.naruhodo.holdReady, engine.roundNumber + 2);
  assert.equal(Court.liveEvidence(A).length, 0);
  void B;
});
test("สืบสวน: หลักฐาน +1 · เห็นทะลุพุ่ม/ล่องหน · คูลดาวน์ 2", () => {
  const { A, B } = setup();
  Court.noteAct(B, "secondary", "ยาพิษ", []);
  A.naruhodo.evidence = [];
  engine.setActor("A");
  engine.useSkill("A", "secondary", ["B"]);
  assert.equal(Court.liveEvidence(A).length, 1);
  assert.equal(A.naruhodo.scout.targetId, "B");
  assert.ok(Court.scoutSees(A, B));
  // ไม่มีเหตุการณ์ใหม่ = ข้อสังเกต
  A.skillUsedRound = false;
  A.naruhodo.scoutReady = 0;
  engine.setActor("A");
  engine.useSkill("A", "secondary", ["B"]);
  assert.ok(Court.liveEvidence(A).some((v) => v.kind === "note"));
  const locks = N.skillLocks(engine, A);
  assert.equal(locks.secondary.cd, 2);
  const st = engine.buildStateFor("A").players.find((p) => p.id === "A").naruhodo;
  assert.equal(st.scout.targetId, "B");
  assert.ok(st.scout.cds && "ultimate" in st.scout.cds);
  // ระยะ 4
  B.pos = { x: 11, y: 6 };
  A.skillUsedRound = false; A.naruhodo.scoutReady = 0; const sp = A.skillPoints;
  engine.setActor("A");
  engine.useSkill("A", "secondary", ["B"]);
  assert.equal(A.skillPoints, sp);
  // severables ตัดการสืบสวนได้
  const sv = N.severables(engine, A);
  assert.ok(sv.some((s) => s.key === "scout"));
  Sever.cut(engine, A);
  assert.equal(A.naruhodo.scout, null);
});

test("สืบสวน: เห็นเป้าในพุ่มหญ้า (visibility)", () => {
  const { A, B } = setup();
  const orig = Visibility.hiddenFrom;
  B.exposedRound = -1;
  const hook = engine.CHAR_HOOKS.muimi;
  const was = hook.stealthed;
  hook.stealthed = () => true;
  try {
    assert.equal(Visibility.hiddenFrom(A, B), true);
    A.naruhodo.scout = { targetId: "B", until: engine.roundNumber + 1, at: 0 };
    assert.equal(Visibility.hiddenFrom(A, B), false);
  } finally { hook.stealthed = was; assert.equal(Visibility.hiddenFrom, orig); }
});

test("เริ่มการไต่สวน: หลบพ้น = ไม่ขึ้นศาล คูลดาวน์ 2", () => {
  const { A, B } = setup();
  B.statuses.evade = 2; B.statusAmt.evade = 100;
  engine.setActor("A");
  engine.useSkill("A", "ultimate", ["B"]);
  assert.equal(match.court, null);
  assert.equal(N.skillLocks(engine, A).ultimate.cd, 2);
});

test("เริ่มการไต่สวน: ศาลพักเกม → AI ให้การ → ซักค้าน → จบยก → คำตัดสิน → กลับตาเดินนารุโฮโดะ", () => {
  const { A, B } = setup();
  B.connected = false; // จำเลย AI
  Court.noteAct(B, "basic", "ฟันดาบ", ["A"]);
  A.naruhodo.evidence = []; // ไม่มีหลักฐานในมือ = จบยกเฉยๆ ไม่โดนโทษนั่งเฉย
  Math.random = () => 0.99;
  engine.setActor("A");
  engine.useSkill("A", "ultimate", ["B"]);
  Math.random = realRandom;
  const c = match.court;
  assert.ok(c, "มีคดี");
  assert.equal(engine.gameState, "ATTACKING");
  assert.equal(c.phase, "opening");
  assert.ok(c.beat.steps.some((s) => s.k === "gavel"));
  assert.ok(c.beat.steps.filter((s) => s.k === "say").every((s) => typeof s.text === "string" && s.text.length > 0 && !/\{\w+\}/.test(s.text)));
  assert.equal(N.skillMusic(engine, A).music, "naru_bgm_trial");
  const c2 = drive("cross");
  assert.equal(c2.phase, "cross");
  assert.equal(c2.list.length, Court.RULES.statements);
  assert.equal(c2.list.length, 4);
  assert.deepEqual(c2.cred, { L: 6, D: 6 });
  assert.equal(c2.rounds, 3);
  const vB = engine.buildStateFor("B").court, vA = engine.buildStateFor("A").court;
  assert.ok(vB.list.every((s) => "alibi" in s) && vA.list.every((s) => !("alibi" in s)));
  assert.ok(Array.isArray(vA.evidence) && vB.evidence === undefined);
  assert.equal(N.skillMusic(engine, A).music, "naru_bgm_think");
  // จบทุกยกด้วย end
  for (let i = 0; i < Court.RULES.rounds - 1; i++) { assert.equal(Court.act("A", { type: "end" }), true); drive("cross"); }
  assert.equal(Court.act("A", { type: "end" }), true);
  const end = drive("verdict");
  assert.equal(end.phase, "verdict");
  assert.equal(end.verdict.w, "tie");
  drive("none");
  assert.equal(match.court, null);
  assert.equal(engine.gameState, "ACTION");
  assert.equal(engine.actorId, "A");
  assert.equal(B.alive, true);
  assert.equal(N.skillLocks(engine, A).ultimate.cd, 2, "คูลดาวน์นับหลังคดี");
});

test("คำให้การของจำเลย: ตรวจจำนวน/ซ้ำ/ข้อแก้ตัวเฉพาะประโยคโกหก/ห้ามเกินที่มี/ส่งซ้ำไม่ได้", () => {
  const { A, B } = setup();
  engine.setActor("A");
  engine.court.start(A, B);
  engine.pausePlayingForCutscene();
  const c = drive("testimony");
  c.pool = [{ key: "a", kind: "lie", text: "1", k: { turn: 1 } }, { key: "b", kind: "truth", text: "2" }, { key: "c", kind: "lie", text: "3", k: { turn: 2 } },
    { key: "d", kind: "truth", text: "4" }, { key: "f", kind: "lie", text: "6", k: { turn: 3 } }];
  B.courtAlibi = 1;
  c.bonusAlibi = 0;
  assert.equal(Court.minLiesOf(c.pool), 2);
  assert.equal(Court.statementsOf(c.pool), 4);
  assert.equal(Court.testimony("A", [{ key: "a" }, { key: "b" }, { key: "c" }, { key: "d" }]), false, "ทนายส่งไม่ได้");
  assert.equal(Court.testimony("B", [{ key: "a" }, { key: "b" }, { key: "c" }]), false, "ไม่ครบ 4");
  assert.equal(Court.testimony("B", [{ key: "a" }, { key: "a" }, { key: "c" }, { key: "d" }]), false, "ซ้ำ");
  assert.equal(Court.testimony("B", [{ key: "a" }, { key: "c" }, { key: "f" }, { key: "d" }]), false, "ปลอม 3 ไม่ได้ (ต้องพอดี 2)");
  assert.equal(Court.testimony("B", [{ key: "a" }, { key: "b", alibi: true }, { key: "c" }, { key: "d" }]), false, "ข้อแก้ตัวบนเรื่องจริง");
  assert.equal(Court.testimony("B", [{ key: "a", alibi: true }, { key: "b" }, { key: "c", alibi: true }, { key: "d" }]), false, "เกินที่มี");
  assert.equal(Court.testimony("B", [{ key: "a", alibi: true }, { key: "b" }, { key: "c" }, { key: "d" }]), true);
  assert.equal(Court.testimony("B", [{ key: "a" }, { key: "b" }, { key: "c" }, { key: "d" }]), false, "ส่งซ้ำไม่ได้");
});

test("ยื่นหลักฐาน: ตรง (จำเลย −2) · ผิด/เรื่องจริง (ทนาย −1) · ชนข้อแก้ตัว (เผา + ทนาย −2) · ยกละ 2 ครั้ง", () => {
  const { A, B } = setup();
  B.courtAlibi = 2;
  const list = [
    { kind: "lie", text: "ฉันไม่ได้ใช้ ฟัน", k: { skill: "ฟัน" } },
    { kind: "truth", text: "ฉันใช้ ฟัน" },
    { kind: "lie", text: "เทิร์น 2 ฉันไม่ได้ทำอะไรเลย", k: { turn: 2 }, alibi: true },
    { kind: "truth", text: "ฉันรักสันติภาพ" },
  ];
  const c = base5(openCourt(A, B, list));
  c.bonusAlibi = 0;
  assert.equal(c.presentLeft, 2);
  const add = (o) => Court.addEvidence(A, ev(o));
  // เรื่องจริง
  const e1 = add({ skill: "อื่น", round: 9 });
  Court.act("A", { type: "present", idx: 1, evId: e1.id }); drive("cross");
  assert.equal(c.cred.L, 4);
  assert.equal(c.list[1].presentTried, true);
  assert.equal(Court.act("A", { type: "present", idx: 1, evId: e1.id }), false, "ประโยคเดิมยื่นซ้ำไม่ได้");
  // ข้อแก้ตัว
  const e2 = add({ skill: "บาง", round: 2 });
  Court.act("A", { type: "present", idx: 2, evId: e2.id }); drive("cross");
  assert.equal(c.cred.L, 2, "ชนข้อแก้ตัว −2");
  assert.equal(c.list[2].alibi, false);
  assert.equal(B.courtAlibi, 1, "แปะ 📍 = ใช้ไปตั้งแต่ให้การ (2 → 1) ชนแล้วไม่หักซ้ำ");
  assert.ok(!Court.liveEvidence(A).some((v) => v.id === e2.id), "หลักฐานถูกเผา");
  assert.equal(c.presentLeft, 0);
  // ยกนี้ยื่นครบ 2 ครั้งแล้ว
  const e3 = add({ skill: "ฟัน", round: 5 });
  assert.equal(Court.act("A", { type: "present", idx: 0, evId: e3.id }), false, "ยื่นเกินโควตา");
  assert.equal(engine.buildStateFor("A").court.presentLeft, 0);
  c.presentLeft = 1;
  Court.act("A", { type: "present", idx: 0, evId: e3.id }); drive("cross");
  assert.equal(c.cred.D, 3);
  assert.equal(c.list[0].done, true);
  assert.equal(N.skillMusic(engine, A).music, "naru_bgm_trouble");
});

test("presentResult ครบทุกแบบ (พยานทะลุข้อแก้ตัว · ใบเสร็จ +1 · รอยเท้า reveal)", () => {
  const lie = { kind: "lie", k: { turn: 3 }, alibi: true };
  assert.equal(Court.presentResult(lie, ev({ round: 3, type: "witness" }), "B").kind, "pierce");
  assert.equal(Court.presentResult(lie, ev({ round: 3, type: "witness" }), "B").dD, 2);
  assert.equal(Court.presentResult(lie, ev({ round: 3 }), "B").kind, "alibi");
  const plain = { kind: "lie", k: { turn: 3 } };
  const r1 = Court.presentResult(plain, ev({ round: 3, type: "receipt" }), "B");
  assert.equal(r1.kind, "hit"); assert.equal(r1.dD, 2); assert.equal(r1.healL, 1);
  assert.equal(Court.presentResult(plain, ev({ round: 3, type: "foot" }), "B").reveal, true);
  assert.equal(Court.presentResult(plain, ev({ round: 3, type: "witness" }), "B").dD, 2);
  assert.equal(Court.presentResult(plain, ev({ round: 3, type: "weapon" }), "B").dD, 2);
  assert.equal(Court.presentResult({ kind: "truth" }, ev(), "B").dL, 1);
  assert.equal(Court.presentResult(lie, ev({ round: 3 }), "B").dL, 2);
  assert.equal(Court.presentResult(plain, ev({ round: 3, actorId: "C" }), "B").kind, "wrong", "หลักฐานของคนอื่นไม่จับ");
  assert.equal(Court.presentResult({ kind: "truth" }, ev(), "B").kind, "irrelevant");
});

test("เดี๋ยวก่อน!: เจอ 📍 = เห็นข้อแก้ตัว (ไม่แตก) · ไม่มี 📍 = ผู้พิพากษาบอกเรื่องของประโยค · 1 ครั้งต่อยก · พยานทะลุ 📍", () => {
  const { A, B } = setup();
  B.courtAlibi = 1;
  const e = Court.noteAct(B, "ultimate", "ระเบิด", ["C"]);
  A.naruhodo.evidence = [];
  const c = base5(openCourt(A, B, [
    { form: "denySkill", kind: "lie", text: "ท่าไม้ตาย? ไม่เคย", k: { skill: "ระเบิด" }, evKey: e.id, alibi: true },
    { form: "idleTurn", kind: "lie", text: "x", k: { turn: 99 } },
    { form: "denyTarget", kind: "truth", text: "y", k: { target: "ฟ้าใส" } },
    { kind: "truth", text: "z" },
  ]));
  c.bonusAlibi = 0;
  assert.equal(Court.act("A", { type: "press", idx: 0 }), true);
  drive("cross");
  assert.equal(c.list[0].alibi, true, "ข้อแก้ตัวไม่แตก");
  assert.equal(c.list[0].alibiShown, true, "ทนายเห็น 📍");
  assert.equal(B.courtAlibi, 0, "แปะแล้ว = ใช้ไปแล้ว");
  assert.equal(engine.buildStateFor("A").court.list[0].alibiShown, true);
  assert.equal(Court.act("A", { type: "press", idx: 1 }), false, "เกินโควตา");
  // พยานทะลุ 📍 = จำเลย −2 และข้อแก้ตัวถูกใช้
  const w = Court.addEvidence(A, e);
  Court.act("A", { type: "present", idx: 0, evId: w.id }); drive("cross");
  assert.equal(c.cred.D, 3);
  assert.equal(B.courtAlibi, 0);
  // คำใบ้: ประโยคจริงกับโกหกได้บรรทัดแบบเดียวกัน (บอกแค่เรื่อง)
  c.pressLeft = 2;
  Court.act("A", { type: "press", idx: 1 });
  const hint1 = match.court.beat.steps.filter((x) => x.k === "say" && x.who === "J").map((x) => x.text).join(" ");
  drive("cross");
  Court.act("A", { type: "press", idx: 2 });
  const hint2 = match.court.beat.steps.filter((x) => x.k === "say" && x.who === "J").map((x) => x.text).join(" ");
  drive("cross");
  assert.ok(hint1.includes("เทิร์น 99"), hint1);
  assert.ok(hint2.includes("ฟ้าใส"), hint2);
  assert.equal(c.cred.D, 3, "กดดันคำปฏิเสธ/โกหก = ไม่มีผล");
});

test("ฝ่ายค้านคัดค้าน: หลักฐานจับได้ = ปัดตก (ไม่เสีย) · หลักฐานผิด = ฝ่ายจำเลย −1 · 1 ครั้งต่อยก · AI 45%", () => {
  const { A, B } = setup({ extra: 1 });
  const c = base5(openCourt(A, B, [{ kind: "lie", text: "a", k: { skill: "ฟัน" } }, { kind: "lie", text: "b", k: { turn: 50 } }, { kind: "truth", text: "c" }, { kind: "truth", text: "d" }]));
  c.counselIds = ["C"]; c.galleryIds = [];
  c.presentLeft = 9;
  const good = Court.addEvidence(A, ev({ skill: "ฟัน", round: 9 }));
  Court.act("A", { type: "present", idx: 0, evId: good.id });
  assert.equal(drive("objectWindow").phase, "objectWindow");
  assert.equal(Court.object("B"), false, "จำเลยไม่ใช่ฝ่ายค้าน");
  assert.equal(Court.object("C"), true);
  drive("cross");
  assert.equal(c.cred.D, 5);
  assert.ok(Court.liveEvidence(A).some((v) => v.id === good.id), "หลักฐานยังอยู่");
  assert.equal(c.list[0].presentTried, true);
  assert.equal(c.counselLeft, 0);
  // ยกนี้คัดค้านหมดแล้ว = ไม่มีช่วงคัดค้าน
  const bad = Court.addEvidence(A, ev({ skill: "อื่น", round: 9 }));
  Court.act("A", { type: "present", idx: 1, evId: bad.id });
  assert.equal(drive("cross").phase, "cross");
  assert.equal(c.cred.L, 4);
  // คัดค้านมั่ว
  c.counselLeft = 1;
  c.list[2].presentTried = false;
  const bad2 = Court.addEvidence(A, ev({ skill: "อื่น2", round: 9 }));
  Court.act("A", { type: "present", idx: 2, evId: bad2.id });
  drive("objectWindow"); Court.object("C"); drive("cross");
  assert.equal(c.cred.D, 4);
  assert.equal(c.cred.L, 4);
});

test("ประชาชน: เลือกฝ่ายตอนเปิดศาล (เปลี่ยนได้ 1) · เชียร์/โห่/ปาระหว่างซักค้าน ±1 ต่อยก · ปาเกิน 3 = ไล่ · พยานระหว่างซักค้าน · รางวัล", () => {
  const { A, B } = setup({ extra: 5 });
  for (const id of ["C", "D", "E", "F", "G"]) engine.players[id].pos = { x: 3, y: 2 + ["C", "D", "E", "F", "G"].indexOf(id) };
  const C = engine.players.C;
  C.pos = { x: 9, y: 7 };
  const seen = Court.noteAct(B, "basic", "ฟัน", ["A"]);
  assert.ok(seen.seenBy.includes("C"));
  A.naruhodo.evidence = [];
  engine.setActor("A");
  engine.court.start(A, B);
  engine.pausePlayingForCutscene();
  B.connected = true;
  let c = drive("sides");
  assert.equal(c.phase, "sides");
  assert.equal(Court.side("A", "L"), false, "ทนายไม่ใช่ประชาชน");
  assert.equal(Court.side("C", "L"), true);
  assert.equal(Court.side("C", "D"), true, "เปลี่ยนได้ 1 ครั้ง");
  assert.equal(Court.side("C", "L"), false, "เปลี่ยนเกิน");
  assert.equal(engine.buildStateFor("C").court.sideChangeLeft, 0);
  Court.side("D", "L"); Court.side("E", "L"); Court.side("F", "L");
  Court.side("G", "D"); // ครบทุกคน = ไปต่อทันที
  c = drive("testimony");
  c.pool = [{ key: "a", kind: "lie", text: "a", form: "denySkill", k: { skill: "ฟัน" } }, { key: "b", kind: "lie", text: "b", k: { turn: 77 } }, { key: "x", kind: "truth", text: "x" }, { key: "y", kind: "truth", text: "y" }];
  Court.testimony("B", c.pool.map((x) => ({ key: x.key })));
  c = drive("cross");
  base5(c);
  // ฝ่ายทนายโห่ + ปาใส่จำเลย → โห่/ปาใช้ช่องเดียวกัน = จำเลย −1 ครั้งเดียวต่อยก
  assert.equal(Court.gallery("D", { e: "boo" }), true);
  assert.equal(Court.gallery("D", { e: "cheer" }), false, "ยกละครั้งต่อคน");
  Court.gallery("E", { e: "throw" }); Court.gallery("F", { e: "throw" });
  assert.equal(c.cred.D, 4, "โห่/ปาได้ผลครั้งเดียว");
  Court.gallery("G", { e: "cheer" }); // ฝ่ายจำเลยเชียร์ +1 (ช่องเชียร์แยกกัน)
  assert.equal(c.cred.D, 5);
  c.cred.L = 4;
  assert.ok(engine.buildStateFor("A").court.feed.length >= 3);
  // พยานระหว่างซักค้าน: C เปลี่ยนไปฝ่ายจำเลยแล้ว = ช่วยทนายไม่ได้ · ช่วยจำเลยได้
  assert.equal(Court.gallery("C", { e: "witnessL", evKey: seen.id }), false);
  const alibi0 = B.courtAlibi || 0;
  assert.equal(Court.gallery("C", { e: "witnessD" }), true);
  drive("cross");
  assert.equal(B.courtAlibi, alibi0 + 1);
  assert.equal(Court.gallery("C", { e: "witnessD" }), false, "ครั้งเดียวต่อคดี");
  // ปาเกิน 3 ครั้งในยก = ไล่คนปาล่าสุด (ยกถัดไป)
  c.rx = {}; c.throws = 3;
  Court.gallery("E", { e: "throw" });
  assert.ok(c.outIds.includes("E"));
  // คำตัดสินมีความผิด: ฝ่ายทนายที่มีส่วนร่วม +1 HP · พยานฝ่ายชนะ +2 เหรียญ
  for (const id of ["D", "F"]) engine.players[id].hp = 5;
  c.cred.D = 2;
  const w = Court.addEvidence(A, ev({ skill: "ฟัน" }));
  Court.act("A", { type: "present", idx: c.list.findIndex((x) => x.text === "a"), evId: w.id });
  const v = drive("verdict");
  assert.equal(v.verdict.w, "guilty");
  assert.ok(v.verdict.rewards.some((r) => r.id === "D") && v.verdict.rewards.some((r) => r.id === "F"));
  assert.ok(!v.verdict.rewards.some((r) => r.id === "C" || r.id === "G"), "ฝ่ายแพ้ไม่ได้");
  // เปลี่ยนฝ่าย = สละรางวัล (C เปลี่ยนจาก L ไป D)
  drive("none");
  assert.equal(engine.players.D.hp, 6);
});
test("มีความผิด: จำเลย −9 ลดเกราะก่อน (ไม่ใช่ตายทันที) · ทนายฟื้นเท่าความน่าเชื่อถือที่เหลือ · คลิปฉากจบไม่มีเสียงตะโกนก่อน", () => {
  const { A, B } = setup();
  B.hp = 10; B.armor = 3;
  A.hp = 3;
  const c = openCourt(A, B, [{ kind: "lie", text: "a", k: { skill: "ฟัน" } }, { kind: "truth", text: "b" }, { kind: "truth", text: "c" }]);
  c.cred.D = 2; c.cred.L = 4;
  const w = Court.addEvidence(A, ev({ skill: "ฟัน" }));
  Court.act("A", { type: "present", idx: 0, evId: w.id });
  const pre = match.court.beat.steps;
  assert.ok(!pre.some((x) => x.k === "shout" || x.k === "say" || x.k === "present"), "ยื่นหลักฐานชี้ขาด = ไม่มีเสียงตะโกนนำ");
  engine.releaseBeat();
  const steps = match.court.beat.steps;
  const clip = steps.findIndex((x) => x.k === "clip");
  assert.ok(clip >= 0, "มีคลิปฉากจบ");
  assert.ok(!steps.slice(0, clip).some((x) => x.k === "shout" || x.k === "say" || x.k === "present"), "ไม่มีเสียงก่อนคลิป");
  assert.equal(N.skillMusic(engine, A), null, "เงียบเพลงระหว่างคลิป");
  const v = drive("verdict");
  assert.equal(v.verdict.w, "guilty");
  assert.equal(v.verdict.defendantDmg, 9);
  assert.equal(v.verdict.lawyerHeal, 4);
  assert.equal(N.skillMusic(engine, A).music, "naru_bgm_victory");
  drive("none");
  assert.equal(B.alive, true, "เลือดพอ = ไม่ตาย");
  assert.equal(B.armor, 0);
  assert.equal(B.hp, 4);
  assert.equal(A.hp, 7);
});
test("มีความผิด: −9 ฆ่าได้ตามปกติ (ทนายเป็นผู้สังหาร) · จุติของอรชุนยังกันได้", () => {
  const { A, B } = setup();
  B.hp = 5; B.armor = 0;
  B.statuses.jutti = 1;
  const c = openCourt(A, B, [{ kind: "lie", text: "a", k: { skill: "ฟัน" } }, { kind: "truth", text: "b" }, { kind: "truth", text: "c" }]);
  c.cred.D = 2;
  const w = Court.addEvidence(A, ev({ skill: "ฟัน" }));
  Court.act("A", { type: "present", idx: 0, evId: w.id });
  drive("verdict"); drive("none");
  assert.equal(B.alive, true, "จุติฟื้น");
  assert.equal(B.statuses.jutti, undefined, "จุติถูกใช้");
});
test("ไม่มีความผิด: ทนาย −5 (เกราะก่อน) + สตั้น 1 · ตานี้ทำอะไรต่อไม่ได้", () => {
  const { A, B } = setup();
  A.hp = 10; A.armor = 2;
  const c = openCourt(A, B, [{ kind: "truth", text: "a" }, { kind: "truth", text: "b" }, { kind: "truth", text: "c" }]);
  c.cred.L = 1;
  const w = Court.addEvidence(A, ev({}));
  Court.act("A", { type: "present", idx: 0, evId: w.id });
  const v = drive("verdict");
  assert.equal(v.verdict.w, "free");
  assert.equal(v.verdict.lawyerDmg, 5);
  drive("none");
  assert.equal(A.armor, 0);
  assert.equal(A.hp, 7);
  assert.equal(A.statuses.stun, 1);
  assert.equal(engine.action.noSkill, true);
  assert.equal(engine.action.locked, true);
});

test("ทนายหลุดกลางคดี = ยุติ ไม่มีผล · คดีซ้อนไม่ได้", () => {
  const { A, B } = setup();
  openCourt(A, B, [{ kind: "truth", text: "a" }, { kind: "truth", text: "b" }, { kind: "truth", text: "c" }]);
  assert.equal(engine.court.start(A, B), false, "คดีซ้อน");
  A.connected = false;
  Court.act("A", { type: "end" });
  drive("none");
  assert.equal(match.court, null);
  assert.equal(B.alive, true);
});

test("ผู้ช่วยทนายยื่นสิ่งที่ตัวเองเห็น (lend) 1 ครั้งต่อคดี", () => {
  const { A, B } = setup({ extra: 1 });
  const C = engine.players.C;
  C.pos = { x: 9, y: 7 };
  const e = Court.noteAct(B, "basic", "ฟัน", ["A"]);
  A.naruhodo.evidence = [];
  const c = openCourt(A, B, [{ kind: "truth", text: "a" }, { kind: "truth", text: "b" }, { kind: "truth", text: "c" }]);
  c.coIds = ["C"]; c.galleryIds = [];
  assert.equal(Court.act("C", { type: "lend", evKey: e.id }), true);
  drive("cross");
  assert.ok(Court.liveEvidence(A).some((v) => v.evKey === e.id));
  assert.equal(Court.act("C", { type: "lend", evKey: e.id }), false);
});

test("บทพูด: ทุกกองมีหลายแบบ · เติมช่องครบ · ไม่ยาวเกิน", () => {
  for (const [k, pool] of Object.entries(Lines.POOLS)) {
    assert.ok(pool.length >= 1, k);
    for (const t of pool) assert.ok(Lines.fill(t, { L: "นารุโฮโดะ", D: "ดิโอ", C: "เซลิน", G: "ยูนะ", skill: "The World", target: "เซลิน", turn: 3, ev: "มีด", round: 1 }).length <= 70, `${k}: ${t}`);
  }
  const pool = Court.statementPool([ev({ id: "q1", kind: "basic", skill: "Throwing knife", targetName: "เซลิน", round: 3 }), ev({ id: "q2", kind: "move", skill: "เดิน", targetName: null, round: 4, type: "foot" })], []);
  assert.ok(pool.some((s) => s.kind === "lie" && s.k.skill === "Throwing knife"));
  assert.ok(pool.some((s) => s.kind === "lie" && s.k.target === "เซลิน"));
  assert.ok(pool.some((s) => s.kind === "lie" && s.k.turn === 4));
  assert.ok(pool.some((s) => s.kind === "truth"));
});

// ---------- รอเดี๋ยว!!! ----------
function holdSetup() {
  const { A, B } = setup();
  B.pos = { x: 9, y: 6 };
  engine.setActor("B");
  engine.setActionClock(40);
  return { A, B };
}
test("รอเดี๋ยว!!!: แทรกตา → เก็บหลักฐาน → กลับตาเดิม · คูลดาวน์ 3 · ตาหน้าเดินไม่ได้", () => {
  const { A, B } = holdSetup();
  Court.noteAct(B, "basic", "ฟัน", ["A"]);
  A.naruhodo.evidence = [];
  assert.equal(Court.canHold(A), true);
  assert.equal(engine.buildStateFor("B").players.find((p) => p.id === "A").naruhodo.holdReady, true);
  assert.equal(Court.holdIt("A"), true);
  assert.equal(match.holdIt.phase, "flash");
  assert.equal(engine.actorId, "A");
  engine.releaseBeat();
  assert.equal(match.holdIt.phase, "choose");
  assert.equal(engine.gameState, "ACTION");
  assert.ok(engine.timeLeft <= 25 && engine.timeLeft > 15, "ตาแทรก 25 วิ");
  // ทำอย่างอื่นไม่ได้ระหว่างตาแทรก
  assert.equal(engine.canAct(A), false);
  const sp = A.skillPoints;
  engine.useSkill("A", "basic", [], { dir: "right" });
  assert.equal(A.skillPoints, sp);
  assert.equal(Court.holdItAct("A", { kind: "gather" }), true);
  assert.equal(Court.liveEvidence(A).length, 1);
  assert.equal(Court.holdItAct("A", { kind: "gather" }), false, "เลือกได้อย่างเดียว");
  engine.releaseBeat();
  assert.equal(match.holdIt, null);
  assert.equal(engine.actorId, "B");
  assert.equal(engine.gameState, "ACTION");
  assert.equal(N.naruhodoState(engine, A, true).holdCd, 3);
  assert.equal(Court.canHold(A), false);
  // ตาหน้าเดินไม่ได้
  engine.setActor("A");
  N.onActorReady(engine, A);
  assert.equal(engine.action.locked, true);
  assert.equal(A.naruhodo.noMoveNext, false);
});

test("รอเดี๋ยว!!!: คัดค้าน! → ผู้ถูกแทรกใช้สกิล/ตีไม่ได้จนจบตา", () => {
  const { A, B } = holdSetup();
  Court.noteAct(B, "basic", "ฟัน", ["A"]);
  const v = Court.liveEvidence(A)[0];
  Court.holdIt("A"); engine.releaseBeat();
  assert.equal(Court.holdItAct("A", { kind: "object", evId: "nope" }), false);
  assert.equal(Court.holdItAct("A", { kind: "object", evId: v.id }), true);
  engine.releaseBeat();
  assert.equal(engine.actorId, "B");
  assert.equal(engine.action.noSkill, true);
  assert.equal(engine.action.noStrike, true);
  assert.equal(B.statuses.naruhodoObjected, 1);
  assert.equal(Court.liveEvidence(A).length, 0);
  B.pos = { x: 7, y: 6 };
  assert.equal(engine.attackTarget("B", "A"), false);
  assert.equal(A.hp, 10);
  // severables ตัดคำคัดค้านได้
  assert.ok(N.severables(engine, A).some((s) => s.key === "objection"));
});

test("รอเดี๋ยว!!!: ผู้ถูกแทรกสวนด้วยข้อแก้ตัว → คัดค้านล้ม หลักฐานเสีย เกราะ −2", () => {
  const { A, B } = holdSetup();
  Court.noteAct(B, "basic", "ฟัน", ["A"]);
  B.courtAlibi = 1;
  A.armor = 5;
  const v = Court.liveEvidence(A)[0];
  Court.holdIt("A"); engine.releaseBeat();
  Court.holdItAct("A", { kind: "object", evId: v.id });
  assert.equal(match.holdIt.phase, "alibi");
  assert.equal(engine.buildStateFor("B").holdIt.canAlibi, true);
  assert.equal(Court.holdItAlibi("C"), false);
  assert.equal(Court.holdItAlibi("B"), true);
  assert.equal(B.courtAlibi, 0);
  assert.equal(A.armor, 3);
  assert.equal(match.holdIt.result.ok, false);
  engine.releaseBeat();
  assert.equal(engine.actorId, "B");
  assert.ok(!engine.action.noSkill);
  assert.equal(Court.liveEvidence(A).length, 0);
});

test("รอเดี๋ยว!!!: เดิน 2 ช่อง (เดินปกติ · เกินไม่ได้)", () => {
  const { A } = holdSetup();
  Court.holdIt("A"); engine.releaseBeat();
  assert.equal(Court.holdItAct("A", { kind: "move", tile: { x: 6, y: 9 } }), false, "3 ช่อง");
  assert.equal(Court.holdItAct("A", { kind: "move", tile: { x: 6, y: 8 } }), true);
  assert.deepEqual(A.pos, { x: 6, y: 8 });
  engine.releaseBeat();
  assert.equal(engine.actorId, "B");
});

test("รอเดี๋ยว!!!: ห้ามเมื่อ ลบสกิลติดตัว / ไกลเกิน 4 / ตาตัวเอง / ศัตรูเป็นเพื่อน / มีคดี / สตั้น", () => {
  const { A, B } = holdSetup();
  A.statuses.noPassive = 2;
  assert.equal(Court.canHold(A), false);
  delete A.statuses.noPassive;
  B.pos = { x: 11, y: 6 };
  assert.equal(Court.canHold(A), false);
  B.pos = { x: 9, y: 6 };
  A.statuses.stun = 1;
  assert.equal(Court.canHold(A), false);
  delete A.statuses.stun;
  match.court = { id: 99 };
  assert.equal(Court.canHold(A), false);
  match.court = null;
  engine.setActor("A");
  assert.equal(Court.canHold(A), false);
});

test("Echo สวมร่างนารุโฮโดะ: ฮุคทำงานกับ characterId", () => {
  const { A } = setup();
  assert.equal(Court.isNaru(A), true);
  assert.ok(Array.isArray(N.severables(engine, A)));
});

test("บทพูด: ในคดีเดียวกันไม่ซ้ำบรรทัดเดิมจนกว่ากองจะหมด · ตัดชื่อผู้พูดหน้าบรรทัด", () => {
  const used = [];
  const n = Lines.POOLS.wrongJudge.length;
  const got = new Set();
  for (let i = 0; i < n; i++) got.add(Lines.pick("wrongJudge", { ev: "มีด" }, used));
  assert.equal(got.size, n);
  assert.ok(Lines.pick("wrongJudge", { ev: "มีด" }, used), "หมดกองแล้ววนใหม่");
  assert.ok(Lines.POOLS.galleryCheer.every((t) => !t.startsWith("{G}")));
  const total = Object.values(Lines.POOLS).reduce((a, p) => a + p.length, 0);
  assert.ok(total >= 350, `บทพูดรวม ${total}`);
});

test("จำเลยระบบคู่ (เคท & เอมิลิโกะ): ขึ้นศาลด้วยกัน · หลักฐาน/คำให้การรวมกัน · มีความผิด = ตายทั้งคู่", () => {
  const { A, B } = setup({ others: ["kate"] });
  const M = Object.values(engine.players).find((p) => p.duoOf === "B");
  assert.ok(M, "มีตัวที่สอง");
  M.pos = { x: 8, y: 7 }; M.alive = true; M.hp = 10;
  // เหตุการณ์ของตัวที่สอง = ผูกกับฝ่ายเดียวกัน (เจ้าของ) · ชื่อเหตุการณ์ = ชื่อตัวที่ลงมือ
  const e1 = Court.noteAct(M, "basic", "ไม้ถูพื้น", ["A"]);
  const e2 = Court.noteAct(B, "secondary", "แส้", ["A"]);
  assert.equal(e1.actorId, "B");
  assert.equal(e1.actorName, Court.who(M));
  assert.equal(e2.actorId, "B");
  // เป้าคือตัวที่สอง → ทั้งคู่ขึ้นแท่น ตัวที่ถูกเลือกก่อน
  B.connected = true;
  engine.setActor("A");
  engine.court.start(A, M);
  engine.pausePlayingForCutscene();
  const c0 = match.court;
  assert.deepEqual(c0.defendantUnits.map((u) => u.id), [M.id, "B"]);
  assert.equal(c0.defendantId, M.id);
  assert.ok(c0.names.D.includes(" & "));
  assert.ok(!c0.counselIds.includes("B") && !c0.galleryIds.includes("B"));
  assert.deepEqual(engine.buildStateFor("B").court.defendantUnits.map((u) => u.id), [M.id, "B"]);
  const c = drive("testimony");
  assert.ok(c.pool.some((s) => s.evKey === e1.id || s.evKey === e2.id), "คำให้การจากเหตุการณ์ของทั้งคู่");
  const all = Court.statementPool(match.courtLog.filter((e) => e.actorId === "B"), []);
  assert.ok(all.some((s) => s.evKey === e1.id) && all.some((s) => s.evKey === e2.id), "รวมเหตุการณ์ทั้งสองตัว");
  // เจ้าของส่งคำให้การแทนคู่ได้
  const need = Court.minLiesOf(c.pool), n = Court.statementsOf(c.pool);
  assert.ok(need >= 1);
  const lies = c.pool.filter((s) => s.kind === "lie"), truths = c.pool.filter((s) => s.kind === "truth");
  const picks = [...lies.slice(0, need), ...truths.slice(0, n - need)].map((s) => ({ key: s.key }));
  assert.equal(Court.testimony("B", picks), true);
  const cc = drive("cross");
  // หลักฐานจากตัวไหนของคู่ก็จับได้
  const idx = cc.list.findIndex((s) => s.kind === "lie");
  assert.ok(idx >= 0);
  {
    cc.cred.D = 1;
    for (const u of [B, M]) { u.hp = 5; u.armor = 0; } // −9 ฆ่าได้ทั้งคู่
    const st = cc.list[idx];
    const real = match.courtLog.find((e) => e.id === st.evKey);
    const evid = Court.addEvidence(A, real) || Court.liveEvidence(A).find((v) => v.evKey === real.id);
    Court.act("A", { type: "present", idx, evId: evid.id });
    const v = drive("verdict");
    assert.equal(v.verdict.w, "guilty");
    drive("none");
    assert.equal(B.alive, false);
    assert.equal(M.alive, false);
  }
});

test("ขั้นฉาก: say ทุกอันมี name · ผู้ช่วย/พยาน/ประชาชน/ฝ่ายค้าน (T/G/C) มี id · testify ไม่มี beat และรอ 1.5 + 2.5×n วิ", () => {
  const { A, B } = setup({ extra: 2 });
  const C = engine.players.C, D = engine.players.D;
  C.pos = { x: 9, y: 7 };
  const e = Court.noteAct(B, "basic", "ฟัน", ["A"]);
  A.naruhodo.evidence = [];
  engine.setActor("A");
  engine.court.start(A, B);
  engine.pausePlayingForCutscene();
  B.connected = false;
  const beats = [];
  const grab = () => { const c = match.court; if (c && c.beat && !beats.includes(c.beat)) beats.push(c.beat); };
  grab();
  let sawTestify = false;
  for (let i = 0; i < 20 && match.court && match.court.phase !== "cross"; i++) {
    if (match.court.phase === "testify") {
      sawTestify = true;
      assert.equal(match.court.beat, null);
      const left = match.court.deadline - Date.now();
      assert.ok(Math.abs(left - (1500 + 2500 * match.court.list.length)) < 300, `testify ${left}`);
    }
    engine.releaseBeat(); grab();
  }
  assert.ok(sawTestify);
  // ประชาชนเลือกฝ่ายตอนเปิดศาลไปแล้ว (ช่วง sides ถูกปล่อยในลูปบน = ยังไม่มีฝ่าย) — เลือกตอนนี้แล้วทำระหว่างซักค้าน
  assert.equal(Court.side("C", "L"), true);
  assert.equal(Court.side("D", "L"), true);
  assert.equal(Court.gallery("D", { e: "cheer" }), true); // ค้างไว้ขึ้นต้นจังหวะถัดไป
  assert.equal(Court.gallery("C", { e: "witnessL", evKey: e.id }), true); // พยานระหว่างซักค้าน
  grab();
  for (let i = 0; i < 6 && match.court && match.court.phase !== "cross"; i++) { engine.releaseBeat(); grab(); }
  const says = beats.flatMap((b) => b.steps).filter((s) => s.k === "say");
  assert.ok(says.length > 5);
  for (const s of says) assert.ok(typeof s.name === "string" && s.name.length > 0, JSON.stringify(s));
  for (const s of says.filter((x) => ["T", "G", "C"].includes(x.who))) assert.ok(s.id, `ไม่มี id: ${JSON.stringify(s)}`);
  assert.ok(says.some((s) => s.who === "T" && s.id === "C"), "พยานพูดพร้อม id");
  assert.ok(says.some((s) => s.who === "G" && s.id === "D"), "ประชาชนพูดพร้อม id");
});

test("ทิ้งหลักฐานเอง (ผู้ใช้ 2026-11-20): ทิ้งได้นอกคดี · ระหว่างคดี/ตาแทรกทิ้งไม่ได้ · คนอื่นทิ้งแทนไม่ได้", () => {
  setup();
  const a = engine.players.A;
  const s = Court.st(a);
  const ev = { id: "x1", round: 1, actorId: "B", actorName: "B", kind: "basic", skill: "ท่า", targetName: "A", type: "weapon" };
  const ev2 = { ...ev, id: "x2" };
  const v1 = Court.addEvidence(a, ev), v2 = Court.addEvidence(a, ev2);
  assert.equal(s.evidence.length, 2);
  assert.equal(Court.discardEvidence("B", v1.id), false); // ไม่ใช่นารุโฮโดะ
  match.court = { phase: "cross" };
  assert.equal(Court.discardEvidence("A", v1.id), false); // ระหว่างคดี
  match.court = null; match.holdIt = { lawyerId: "A" };
  assert.equal(Court.discardEvidence("A", v1.id), false); // ระหว่างตาแทรก
  match.holdIt = null;
  assert.equal(Court.discardEvidence("A", v1.id), true);
  assert.deepEqual(s.evidence.map((e) => e.id), [v2.id]);
  assert.equal(Court.discardEvidence("A", "nope"), false);
});

test("ปักหมุดหลักฐาน 📌: แฟ้มเต็มแล้วตัดชิ้นเก่าสุดที่ไม่ได้ปัก · ปักครบ 5 = ไม่รับชิ้นใหม่ · ระหว่างคดีปักไม่ได้", () => {
  setup();
  const a = engine.players.A;
  const s = Court.st(a);
  const mk = (n) => ({ id: "p" + n, round: 1, actorId: "B", actorName: "B", kind: "basic", skill: "ท่า" + n, targetName: "A", type: "weapon" });
  const v = [1, 2, 3, 4, 5].map((n) => Court.addEvidence(a, mk(n)));
  assert.equal(Court.pinEvidence("A", v[0].id), true);
  assert.equal(s.evidence[0].pinned, true);
  Court.addEvidence(a, mk(6)); // เต็ม → ตัด p2 (เก่าสุดที่ไม่ได้ปัก) ไม่ใช่ p1
  assert.deepEqual(s.evidence.map((e) => e.evKey), ["p1", "p3", "p4", "p5", "p6"]);
  for (const e of s.evidence) if (!e.pinned) Court.pinEvidence("A", e.id);
  assert.equal(Court.addEvidence(a, mk(7)), null); // ปักครบ = ไม่รับ
  assert.equal(s.evidence.length, 5);
  match.court = { phase: "cross" };
  assert.equal(Court.pinEvidence("A", s.evidence[0].id), false);
  match.court = null;
  assert.equal(Court.pinEvidence("B", s.evidence[0].id), false);
});

test("คำให้การ 4 ประโยค = ปลอม 2 จริง 2 พอดี · กองมีไม่พอปรับตามที่มี · กดเดี๋ยวก่อน! ใส่ข้อความยอมรับที่จริง = สารภาพ −1", () => {
  const { A, B } = setup();
  const P = (L, T) => [...Array.from({ length: L }, (_, i) => ({ kind: "lie" })), ...Array.from({ length: T }, () => ({ kind: "truth" }))];
  assert.equal(Court.minLiesOf(P(5, 5)), 2);
  assert.equal(Court.minLiesOf(P(1, 5)), 1, "โกหกมีแค่ 1");
  assert.equal(Court.minLiesOf(P(0, 6)), 0, "ไม่มีโกหก");
  assert.equal(Court.minLiesOf(P(5, 1)), 3, "จริงมีแค่ 1 → ปลอม 3");
  assert.equal(Court.minLiesOf(P(1, 1)), 1);
  assert.equal(Court.statementsOf(P(1, 1)), 2);
  engine.setActor("A");
  engine.court.start(A, B);
  engine.pausePlayingForCutscene();
  let c = drive("testimony");
  c.pool = [
    { key: "a", kind: "lie", text: "1", k: { turn: 1 } }, { key: "b", kind: "truth", text: "2" },
    { key: "c", kind: "lie", text: "3", k: { turn: 2 } }, { key: "d", kind: "truth", text: "4" }, { key: "e", kind: "truth", pos: true, text: "5" },
  ];
  assert.equal(Court.testimony("B", [{ key: "a" }, { key: "b" }, { key: "d" }, { key: "e" }]), false, "ปลอมแค่ 1");
  assert.equal(Court.testimony("B", [{ key: "a" }, { key: "c" }, { key: "d" }, { key: "e" }]), true);
  c = drive("cross");
  assert.equal(c.list.filter((s) => s.kind === "lie").length, 2);
  assert.equal(c.list.filter((s) => s.kind === "truth").length, 2);
  const ti = c.list.findIndex((s) => s.kind === "truth" && s.pos);
  const before = c.cred.D;
  Court.act("A", { type: "press", idx: ti });
  c = drive("cross") || match.court;
  assert.equal(c.cred.D, before - 1, "สารภาพ −1");
  assert.equal(c.list[ti].done, true);
});

test("จำเลย AI เลือกปลอม/จริงพอดี", () => {
  const pool = [...Array.from({ length: 5 }, (_, i) => ({ key: `l${i}`, kind: "lie" })), ...Array.from({ length: 5 }, (_, i) => ({ key: `t${i}`, kind: "truth" }))];
  for (let i = 0; i < 20; i++) {
    const out = Court.aiTestimony(pool, 2);
    assert.equal(out.length, 4);
    assert.equal(out.filter((x) => x.key.startsWith("l")).length, 2);
  }
});

// ---------- คำให้การแบบมีชั้นเชิง (ผู้ใช้ 2026-11-20) ----------
function richLog() {
  const { A, B } = setup({ extra: 2 });
  const C = engine.players.C, D = engine.players.D;
  const nB = Court.who(B), nC = "เซลิน", nD = "ดิโอ"; void C; void D;
  const mk = (id, round, kind, skill, targetName, actorId = "B", actorName = nB) =>
    ({ id, round, actorId, actorName, kind, skill, targetName, type: kind === "move" ? "foot" : kind === "ultimate" ? "witness" : "weapon", seenBy: [] });
  match.courtLog = [
    mk("h1", 1, "basic", "C hits B", nB, "C", nC),
    mk("e1", 2, "basic", "ฟัน", nC), mk("e2", 3, "attack", "ตีปกติ", nD), mk("e3", 3, "move", "เดิน", null), mk("e4", 5, "secondary", "ยาพิษ", nC),
  ];
  engine.setRoundNumber(6);
  return { A, B, C, D, nB, nC, nD, events: match.courtLog.filter((e) => e.actorId === "B") };
}
const info = (r) => ({ skills: ["ฟัน", "ยาพิษ", "ระเบิดใหญ่", "ตีปกติ"], roster: [r.nC, r.nD, Court.who(r.A)], round: 6, hitBy: { [r.nC]: 1 } });

test("คำให้การ: ทุกรูปแบบมีทั้งจริงและโกหก · ถ้อยคำจากกองเดียวกัน", () => {
  const r = richLog();
  const seen = {};
  for (let i = 0; i < 40; i++) for (const s of Court.statementPool(r.events, [], info(r))) (seen[s.form] ||= new Set()).add(s.kind);
  for (const f of ["denySkill", "denyTarget", "onlyTarget", "onlySkill", "idleTurn", "stillSince", "defended"]) assert.deepEqual([...seen[f]].sort(), ["lie", "truth"], f);
  assert.ok(seen.firstVictim.has("truth"));
  // ข้อความไม่บอกใบ้: กองถ้อยคำเดียวต่อรูปแบบ (ไม่มีกอง lie/truth แยก)
  for (const k of Object.keys(Lines.STATEMENTS)) assert.ok(!/Lie$|Truth$|^truth/.test(k), `กองแยกจริง/โกหก: ${k}`);
});

test("คำให้การ: โกหกทุกประโยคมีเหตุการณ์จริงหักล้างได้ · เรื่องจริงไม่มีหลักฐานไหนหักล้าง", () => {
  const r = richLog();
  for (let i = 0; i < 30; i++) {
    const pool = Court.statementPool(r.events, [], info(r));
    for (const s of pool) {
      const hits = r.events.filter((e) => Court.contradicts(s, e, "B"));
      if (s.kind === "lie") {
        assert.ok(hits.length >= 1, `โกหกที่จับไม่ได้: ${s.form} ${s.text}`);
        assert.ok(hits.some((e) => e.id === s.evKey), `evKey ไม่หักล้าง: ${s.text}`);
      } else assert.equal(hits.length, 0, `เรื่องจริงถูกหักล้าง: ${s.form} ${s.text}`);
    }
  }
});

test("คำให้การ: หักล้างที่ \"เรื่อง\" เทิร์นไหนก็ได้ · ป้ายผิดจับได้ด้วยหลักฐานที่ถูกเท่านั้น · เทิร์นต้องตรงเฉพาะรูปแบบเทิร์น", () => {
  const e = (o) => ({ actorId: "B", kind: "basic", round: 2, skill: "ฟัน", targetName: "C", ...o });
  // ปฏิเสธท่า/เป้า: เทิร์นไหนก็จับได้
  assert.equal(Court.contradicts({ form: "denySkill", kind: "lie", k: { skill: "ฟัน" } }, e({ round: 9 }), "B"), true);
  assert.equal(Court.contradicts({ form: "denyTarget", kind: "lie", k: { target: "C" } }, e({ round: 1, skill: "อื่น" }), "B"), true);
  // ท่านี้โดนแค่ D (จริงๆ โดน C) ← หลักฐาน ฟัน ใส่ C เทิร์นไหนก็ได้
  const ot = { form: "onlyTarget", kind: "lie", k: { skill: "ฟัน", claim: "D" } };
  assert.equal(Court.contradicts(ot, e({ round: 7 }), "B"), true);
  assert.equal(Court.contradicts(ot, e({ skill: "อื่น" }), "B"), false, "ท่าอื่น");
  assert.equal(Court.contradicts(ot, e({ targetName: "D" }), "B"), false, "ตรงกับที่อ้าง");
  assert.equal(Court.contradicts(ot, e({ actorId: "C" }), "B"), false, "หลักฐานของคนอื่น");
  // ใส่ C มีแค่ ยาพิษ (จริงๆ ใช้ ฟัน ด้วย) ← หลักฐาน ฟัน ใส่ C
  const os = { form: "onlySkill", kind: "lie", k: { target: "C", claim: "ยาพิษ" } };
  assert.equal(Court.contradicts(os, e({ round: 4 }), "B"), true);
  assert.equal(Court.contradicts(os, e({ skill: "ยาพิษ" }), "B"), false);
  assert.equal(Court.contradicts(os, e({ targetName: "D" }), "B"), false);
  // รูปแบบเทิร์นยังต้องตรงเทิร์น
  assert.equal(Court.contradicts({ form: "idleTurn", kind: "lie", k: { turn: 2 } }, e({ round: 3 }), "B"), false);
  assert.equal(Court.contradicts({ form: "idleTurn", kind: "lie", k: { turn: 2 } }, e({}), "B"), true);
  assert.equal(Court.contradicts({ ...ot, kind: "truth" }, e({}), "B"), false, "เรื่องจริงไม่มีวันถูกหักล้าง");
});

test("คำให้การ: โกหกปกติหักล้างได้ด้วยของฝั่งทนาย · ที่เหลือเป็นคำโกหกลับ (blind) · เลือกได้ไม่เกิน 1", () => {
  const r = richLog();
  for (let i = 0; i < 30; i++) {
    const contest = new Set(["e2"]); // ฝั่งทนายมีแค่ ตีปกติ ใส่ ดิโอ เทิร์น 3
    const pool = Court.statementPool(r.events, [], { ...info(r), contest });
    for (const s of pool.filter((x) => x.kind === "lie")) {
      const hits = r.events.filter((e) => Court.contradicts(s, e, "B"));
      assert.ok(hits.some((e) => e.id === s.evKey), `evKey ต้องหักล้าง: ${s.text}`);
      if (s.blind) assert.ok(!hits.some((e) => contest.has(e.id)), `blind แต่ฝั่งทนายหักล้างได้: ${s.text}`);
      else assert.ok(hits.some((e) => contest.has(e.id)), `ปกติแต่ฝั่งทนายหักล้างไม่ได้: ${s.text}`);
    }
    const bal = Court.balancePool(pool);
    assert.ok(bal.filter((x) => x.blind).length <= Court.RULES.blindPool);
  }
  const none = Court.statementPool(r.events, [], { ...info(r), contest: new Set() });
  assert.ok(none.filter((x) => x.kind === "lie").every((x) => x.blind), "ฝั่งทนายไม่มีอะไร = โกหกได้แค่แบบลับ");
  const bal = Court.balancePool(none);
  assert.equal(Court.minLiesOf(bal), 1, "คำโกหกลับนับได้แค่ 1");
});

test("คำโกหกลับ: จำเลยเลือกได้ไม่เกิน 1 · จำเลยเห็น 🌫 ทนายไม่เห็น · พยาน/ผู้ช่วยนำหลักฐานมาแล้วยื่นถูกได้", () => {
  const { A, B } = setup({ extra: 1 });
  engine.setActor("A");
  engine.court.start(A, B);
  engine.pausePlayingForCutscene();
  let c = drive("testimony");
  c.pool = [
    { key: "a", kind: "lie", text: "1", form: "denySkill", k: { skill: "ฟัน" } },
    { key: "b", kind: "lie", blind: true, text: "2", form: "denySkill", k: { skill: "ยาพิษ" } },
    { key: "c", kind: "lie", blind: true, text: "3", form: "denySkill", k: { skill: "ระเบิด" } },
    { key: "d", kind: "truth", text: "4" }, { key: "e", kind: "truth", text: "5" },
  ];
  assert.equal(Court.minLiesOf(c.pool), 2);
  assert.equal(Court.testimony("B", [{ key: "b" }, { key: "c" }, { key: "d" }, { key: "e" }]), false, "ลับ 2 ประโยคไม่ได้");
  assert.equal(engine.buildStateFor("B").court.pool.find((x) => x.key === "b").blind, true);
  assert.equal(Court.testimony("B", [{ key: "a" }, { key: "b" }, { key: "d" }, { key: "e" }]), true);
  c = drive("cross");
  const bi = c.list.findIndex((x) => x.blind);
  assert.ok(!("blind" in engine.buildStateFor("A").court.list[bi]), "ทนายไม่เห็น blind");
  assert.equal(engine.buildStateFor("B").court.list[bi].blind, true);
  // ผู้ช่วยทนายเห็นเหตุการณ์นั้น → ยื่นเข้าแฟ้ม → ยื่นถูก
  const C = engine.players.C;
  c.coIds = ["C"]; c.galleryIds = [];
  const e = { id: "bz", round: 2, actorId: "B", actorName: "B", kind: "secondary", skill: "ยาพิษ", targetName: null, type: "receipt", seenBy: ["C"] };
  match.courtLog.push(e);
  void C;
  assert.equal(Court.act("C", { type: "lend", evKey: "bz" }), true);
  drive("cross");
  const v = Court.liveEvidence(A).find((x) => x.evKey === "bz");
  const d0 = c.cred.D;
  Court.act("A", { type: "present", idx: bi, evId: v.id }); drive("cross");
  assert.equal(c.cred.D, d0 - 2);
});

test("ยื่นหลักฐานไม่ขัด: ผู้พิพากษาบอกเหตุผลจากรายละเอียดที่เทียบ", () => {
  const e = (o) => ({ actorId: "B", actorName: "บี", kind: "basic", round: 2, skill: "ฟัน", targetName: "ฟ้าใส", ...o });
  assert.deepEqual(Court.whyNot({ form: "denyTarget", k: { target: "เซลิน" } }, e({}), "B"), ["whyTarget", { evTarget: "ฟ้าใส", target: "เซลิน" }]);
  assert.equal(Court.whyNot({ form: "denySkill", k: { skill: "X" } }, e({}), "B")[0], "whySkill");
  assert.equal(Court.whyNot({ form: "idleTurn", k: { turn: 5 } }, e({}), "B")[0], "whyTurn");
  assert.equal(Court.whyNot({ form: "stillSince", k: { from: 1 } }, e({}), "B")[0], "whyNotFoot");
  assert.equal(Court.whyNot({ form: "denySkill", k: { skill: "ฟัน" } }, e({ actorId: "C", actorName: "ซี" }), "B")[0], "whyOther");
  const txt = Lines.fill(Lines.POOLS.whyTarget[0], { evTarget: "ฟ้าใส", target: "เซลิน" });
  assert.ok(txt.includes("ฟ้าใส") && txt.includes("เซลิน"));
  // ในศาลจริง: บรรทัดผู้พิพากษาหลังยื่นผิดมาจากกอง why*
  const { A, B } = setup();
  const c = openCourt(A, B, [{ form: "denyTarget", kind: "lie", text: "a", k: { target: "เซลิน" } }, { form: "generic", kind: "truth", text: "b" }, { form: "generic", kind: "truth", text: "c" }]);
  const w = Court.addEvidence(A, ev({ targetName: "ฟ้าใส", skill: "ฟัน" }));
  Court.act("A", { type: "present", idx: 0, evId: w.id });
  engine.releaseBeat();
  const says = match.court.beat.steps.filter((x) => x.k === "say" && x.who === "J").map((x) => x.text);
  assert.ok(says.some((t) => t.includes("ฟ้าใส") && t.includes("เซลิน")), says.join(" | "));
});

test("กดดัน: สารภาพเฉพาะข้อความยอมรับที่จริง · คำปฏิเสธที่จริง/คำโกหก = ยืนยันคำเดิม ไม่มีผล", () => {
  const { A, B } = setup();
  const c = openCourt(A, B, [
    { form: "denyTarget", kind: "truth", pos: false, text: "ไม่เคยแตะ X", k: { target: "X" } },
    { form: "onlyTarget", kind: "truth", pos: true, text: "ฟัน โดนแค่ C", k: { skill: "ฟัน", claim: "C" } },
    { form: "idleTurn", kind: "lie", pos: false, text: "เทิร์น 3 ว่าง", k: { turn: 3 } },
  ]);
  c.pressLeft = 3;
  const d0 = c.cred.D;
  Court.act("A", { type: "press", idx: 0 }); drive("cross");
  assert.equal(c.cred.D, d0, "ปฏิเสธที่จริง = ไม่มีผล");
  assert.equal(c.list[0].done, false);
  Court.act("A", { type: "press", idx: 2 }); drive("cross");
  assert.equal(c.cred.D, d0, "โกหก = ไม่มีผล");
  Court.act("A", { type: "press", idx: 1 }); drive("cross");
  assert.equal(c.cred.D, d0 - 1, "ยอมรับที่จริง = สารภาพ −1");
  assert.equal(c.list[1].done, true);
});

test("คำให้การ: กอง ≤ 10 · โกหก ≥ 3 และจริง ≥ 2 เมื่อบันทึกพอ (เลือกปลอม 2 จริง 2 ได้)", () => {
  const r = richLog();
  r.A.skillPoints = 8;
  for (const e of r.events) Court.addEvidence(r.A, e); // ฝั่งทนายมีหลักฐานครบ
  engine.setActor("A");
  engine.court.start(r.A, r.B);
  engine.pausePlayingForCutscene();
  r.B.connected = true;
  const c = drive("testimony");
  assert.ok(c.pool.length <= 10 && c.pool.length >= 4);
  assert.ok(c.pool.filter((s) => s.kind === "lie").length >= 3);
  assert.ok(c.pool.filter((s) => s.kind === "truth").length >= 2);
  assert.equal(engine.buildStateFor("B").court.minLies, 2);
  assert.equal(engine.buildStateFor("B").court.nStatements, 4);
  assert.ok(engine.buildStateFor("A").court.pool === null, "ทนายไม่เห็นกอง");
  assert.ok(engine.buildStateFor("B").court.pool.every((s) => s.kind === "lie" || s.kind === "truth"), "จำเลยเห็น kind");
});

test("ข้อแก้ตัวโบนัสต้นคดี: นับรวมในศาล ใช้ก่อน · ไม่ติดตัวหลังคดี", () => {
  const { A, B } = setup({ bonus: 2 });
  B.courtAlibi = 1;
  engine.setActor("A");
  engine.court.start(A, B);
  engine.pausePlayingForCutscene();
  const c = match.court;
  assert.equal(c.bonusAlibi, Court.RULES.bonusAlibi);
  assert.equal(Court.alibiTotal(c), 1 + Court.RULES.bonusAlibi);
  assert.ok(c.beat.steps.some((x) => x.k === "say" && Lines.POOLS.openAlibiBonus.includes(x.text)), "จำเลยอวดข้อแก้ตัวตอนเปิดศาล");
  Court.abort("test");
  assert.equal(B.courtAlibi, 1, "โบนัสไม่ติดตัว");
});

test("แปะ 📍 = ใช้ข้อแก้ตัวทันที · ทั้งยกไม่คัดค้าน (มีหลักฐาน) = ทนาย −1", () => {
  const { A, B } = setup();
  B.courtAlibi = 2;
  Court.addEvidence(A, ev({ skill: "ฟัน" }));
  const c = base5(openCourt(A, B, [
    { kind: "lie", text: "a", k: { skill: "ฟัน" }, alibi: true }, { kind: "lie", text: "b", k: { turn: 50 } },
    { kind: "truth", text: "c" }, { kind: "truth", text: "d" },
  ]));
  assert.equal(B.courtAlibi, 1, "แปะ 1 = ใช้ 1");
  Court.act("A", { type: "end" });
  const b = drive("beat");
  assert.ok(b.beat.steps.some((x) => x.k === "say" && Lines.POOLS.idleJudge.includes(x.text)), "ผู้พิพากษาตำหนิ");
  drive("cross");
  assert.equal(c.cred.L, 4, "นั่งเฉยทั้งยก −1");
  assert.equal(c.round, 2);
});

test("หลักฐานจากตำรวจตอนเปิดศาล (เรื่องที่ฝั่งทนายไม่เห็นก่อน) · ขอให้ศาลเรียกพยาน ยกละครั้ง", () => {
  const { A, B } = setup({ police: 2 });
  B.pos = { x: 14, y: 6 }; // ไกล = ไม่มีใครเห็น
  const e1 = Court.noteAct(B, "basic", "ฟัน", ["C"]);
  const e2 = Court.noteAct(B, "secondary", "ยาพิษ", []);
  const e3 = Court.noteAct(B, "ultimate", "ระเบิด", []);
  B.pos = { x: 8, y: 6 };
  A.naruhodo.evidence = [];
  engine.setActor("A");
  engine.court.start(A, B);
  engine.pausePlayingForCutscene();
  const police = Court.liveEvidence(A).filter((v) => v.source === "police");
  assert.equal(police.length, 2);
  assert.ok(police.every((v) => [e1.id, e2.id, e3.id].includes(v.evKey)));
  assert.ok(police[0].desc.startsWith("รายงานตำรวจ"));
  assert.ok(match.court.beat.steps.some((x) => x.k === "present"));
  B.connected = true;
  let c = drive("testimony");
  c.pool = [
    { key: "a", kind: "lie", form: "denySkill", text: "a", k: { skill: "ระเบิด" } }, { key: "b", kind: "lie", form: "idleTurn", text: "b", k: { turn: 99 } },
    { key: "x", kind: "truth", form: "denySkill", text: "x", k: { skill: "ไม่มีท่านี้" } }, { key: "y", kind: "truth", text: "y" },
  ];
  Court.testimony("B", c.pool.map((x) => ({ key: x.key })));
  c = drive("cross");
  const ia = c.list.findIndex((x) => x.text === "a"), ix = c.list.findIndex((x) => x.text === "x");
  assert.equal(c.summonLeft, 1);
  // ไม่มีบันทึกเรื่องนี้ = ผู้พิพากษาบอกว่าไม่มี
  const n0 = Court.liveEvidence(A).length;
  assert.equal(Court.act("A", { type: "summon", idx: ix }), true);
  const said = match.court.beat.steps.filter((x) => x.k === "say" && x.who === "J").map((x) => x.text).join(" ");
  assert.ok(Lines.POOLS.summonNone.some((t) => said.includes(Lines.fill(t, { subject: "ท่า ไม่มีท่านี้" }))), said);
  drive("cross");
  assert.equal(Court.liveEvidence(A).length, n0);
  assert.equal(Court.act("A", { type: "summon", idx: ia }), false, "ยกละครั้ง");
  // ยกหน้า: เรียกพยานเรื่องท่าที่ยังไม่มีในแฟ้ม = ได้หลักฐาน
  A.naruhodo.evidence = A.naruhodo.evidence.filter((v) => v.evKey !== e3.id);
  c.summonLeft = 1;
  Court.act("A", { type: "summon", idx: ia }); drive("cross");
  const got = Court.liveEvidence(A).find((v) => v.evKey === e3.id);
  assert.ok(got && got.source === "summon");
});

test("ตัวเลขศาล (2026-11-21): ความน่าเชื่อถือ 6 · 3 ยก · 4 ประโยค · ยื่นยกละ 2 · โบนัส 📍 2 · ตำรวจ 2 · เรียกพยาน 1 · เวลา · เห็นกับตา 6/4", () => {
  const R = Court.RULES;
  assert.deepEqual([R.cred, R.rounds, R.statements, R.presentPer, BONUS, POLICE, R.summonPer], [6, 3, 4, 2, 2, 2, 1]);
  assert.deepEqual([R.guiltyDmg, R.freeDmg, R.freeStun, R.ultCd], [9, 5, 1, 2]);
  assert.deepEqual(R.sec, { testimony: 75, cross: 120, object: 8, gallery: 20, sides: 15 });
  assert.deepEqual([Court.HOLD.secs, Court.HOLD.alibi], [25, 8]);
  assert.deepEqual([R.naruSight, R.sightRange], [6, 4]);
});

test("เห็นกับตา: นารุโฮโดะเห็นได้ 6 ช่อง · ผู้เล่นอื่น 4 ช่อง (ผู้ช่วย/พยาน)", () => {
  const { A, B } = setup({ extra: 1 });
  const C = engine.players.C;
  A.pos = { x: 2, y: 6 }; B.pos = { x: 8, y: 6 }; C.pos = { x: 13, y: 6 }; // A ห่าง 6 · C ห่าง 5
  const e = Court.noteAct(B, "basic", "ฟัน", []);
  assert.ok(e.seenBy.includes("A"), "นารุโฮโดะห่าง 6 เห็น");
  assert.ok(!e.seenBy.includes("C"), "คนอื่นห่าง 5 ไม่เห็น");
  assert.equal(Court.liveEvidence(A).length, 1);
  A.pos = { x: 1, y: 6 }; // ห่าง 7
  Court.noteAct(B, "basic", "ฟัน2", []);
  assert.equal(Court.liveEvidence(A).length, 1);
});

test("ประชาชน: เชียร์ได้ผล +1 ครั้งเดียวต่อฝ่ายต่อยก · เปลี่ยนฝ่าย = สละรางวัล", () => {
  const { A, B } = setup({ extra: 3 });
  engine.setActor("A");
  engine.court.start(A, B);
  engine.pausePlayingForCutscene();
  B.connected = true;
  drive("sides");
  Court.side("C", "D"); Court.side("D", "L"); Court.side("E", "L");
  Court.side("C", "L"); // C ย้ายมาฝ่ายทนาย = สละรางวัล
  let c = drive("testimony");
  c.pool = [{ key: "a", kind: "lie", text: "a", form: "denySkill", k: { skill: "ฟัน" } }, { key: "b", kind: "lie", text: "b", k: { turn: 77 } }, { key: "x", kind: "truth", text: "x" }, { key: "y", kind: "truth", text: "y" }];
  Court.testimony("B", c.pool.map((x) => ({ key: x.key })));
  c = drive("cross");
  c.cred.L = 3;
  Court.gallery("C", { e: "cheer" }); Court.gallery("D", { e: "cheer" }); Court.gallery("E", { e: "cheer" });
  assert.equal(c.cred.L, 4, "เชียร์ 3 คน = +1 ครั้งเดียว");
  c.cred.D = 2;
  const w = Court.addEvidence(A, ev({ skill: "ฟัน" }));
  Court.act("A", { type: "present", idx: c.list.findIndex((x) => x.text === "a"), evId: w.id });
  const v = drive("verdict");
  assert.equal(v.verdict.w, "guilty");
  assert.ok(v.verdict.rewards.some((r) => r.id === "D") && v.verdict.rewards.some((r) => r.id === "E"));
  assert.ok(!v.verdict.rewards.some((r) => r.id === "C"), "เปลี่ยนฝ่ายแล้วไม่ได้รางวัล");
});

test("ประชาชน: โห่/ปาดันความน่าเชื่อถือต่ำกว่า 3 ไม่ได้ (ผลอื่นยังได้) · ผู้พิพากษาบอกว่าไม่ฟังเสียงโห่", () => {
  const { A, B } = setup({ extra: 1 });
  engine.setActor("A");
  engine.court.start(A, B);
  engine.pausePlayingForCutscene();
  B.connected = true;
  drive("sides");
  Court.side("C", "L");
  let c = drive("testimony");
  c.pool = [{ key: "a", kind: "lie", text: "a", form: "denySkill", k: { skill: "ฟัน" } }, { key: "b", kind: "lie", text: "b", k: { turn: 77 } }, { key: "x", kind: "truth", text: "x" }, { key: "y", kind: "truth", text: "y" }];
  Court.testimony("B", c.pool.map((x) => ({ key: x.key })));
  c = drive("cross");
  c.cred.D = 3;
  assert.equal(Court.gallery("C", { e: "boo" }), true, "กดได้ (โชว์ปฏิกิริยา)");
  assert.equal(c.cred.D, 3, "ไม่ต่ำกว่า 3");
  Court.act("A", { type: "summon", idx: 0 }); // จังหวะถัดไปขึ้นต้นด้วยฉากประชาชน
  const says = match.court.beat.steps.filter((x) => x.k === "say" && x.who === "J").map((x) => x.text);
  assert.ok(says.some((t) => Lines.POOLS.galleryFloorJudge.includes(t)), says.join(" | "));
  // หลักฐานยังดันต่ำกว่า 3 ได้
  c = drive("cross");
  c.cred.D = 3;
  const w = Court.addEvidence(A, ev({ skill: "ฟัน" }));
  const ia = c.list.findIndex((x) => x.kind === "lie" && x.k && x.k.skill === "ฟัน");
  if (ia >= 0) { Court.act("A", { type: "present", idx: ia, evId: w.id }); drive("cross"); assert.equal(c.cred.D, 1); }
});
