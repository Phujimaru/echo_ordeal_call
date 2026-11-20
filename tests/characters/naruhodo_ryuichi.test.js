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
function setup({ others = ["muimi"], extra = 0 } = {}) {
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
const ev = (over) => ({ id: `x${Math.random()}`, round: 2, actorId: "B", actorName: "B", kind: "basic", skill: "ฟัน", targetName: "C", type: "weapon", seenBy: ["A"], ...over });

test("ข้อมูลตัวละคร: ระยะ · ราคา · พิเศษ unique · ทุกสกิลมีพื้นที่", () => {
  const ch = engine.CHAR_BY_ID.naruhodo_ryuichi;
  assert.equal(ch.difficulty, "special");
  assert.equal(ch.unique, true);
  assert.deepEqual(ch.range, [1, 1]);
  assert.equal(ch.mov, 4);
  assert.deepEqual(ch.basic.area, { kind: "line", len: 3, width: 1, hostile: true });
  assert.deepEqual(ch.secondary.area, { kind: "target", range: 4, hostile: true });
  assert.deepEqual(ch.ultimate.area, { kind: "target", range: 5, hostile: true });
  assert.deepEqual([ch.basic.cost, ch.secondary.cost, ch.ultimate.cost], [1, 2, 6]);
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

test("เอานี่ไปดู!: แนว 3 ดาเมจ 1 · มีหลักฐาน = 3 และใช้หลักฐาน", () => {
  const { A, B } = setup();
  Math.random = () => 0.99;
  engine.setActor("A");
  engine.useSkill("A", "basic", [], { dir: "right" });
  assert.equal(B.hp, 9);
  assert.ok(fx.some((f) => f.event === "naruhodoPoint"));
  Court.noteAct(B, "basic", "ฟัน", ["A"]);
  A.skillUsedRound = false; A.skillPoints = 8;
  engine.setActor("A");
  engine.useSkill("A", "basic", [], { dir: "right" });
  assert.equal(B.hp, 6);
  assert.equal(Court.liveEvidence(A).length, 0, "หลักฐานถูกใช้");
  // นอกแนว 3 = กดไม่ได้
  B.pos = { x: 10, y: 6 };
  A.skillUsedRound = false; const sp = A.skillPoints;
  engine.setActor("A");
  engine.useSkill("A", "basic", [], { dir: "right" });
  assert.equal(A.skillPoints, sp);
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

test("เริ่มการไต่สวน: หลบพ้น = ไม่ขึ้นศาล คูลดาวน์ 5", () => {
  const { A, B } = setup();
  B.statuses.evade = 2; B.statusAmt.evade = 100;
  engine.setActor("A");
  engine.useSkill("A", "ultimate", ["B"]);
  assert.equal(match.court, null);
  assert.equal(N.skillLocks(engine, A).ultimate.cd, 5);
});

test("เริ่มการไต่สวน: ศาลพักเกม → AI ให้การ → ซักค้าน → จบยก → คำตัดสิน → กลับตาเดินนารุโฮโดะ", () => {
  const { A, B } = setup();
  B.connected = false; // จำเลย AI
  Court.noteAct(B, "basic", "ฟันดาบ", ["A"]);
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
  assert.equal(c2.list.length, 3);
  const vB = engine.buildStateFor("B").court, vA = engine.buildStateFor("A").court;
  assert.ok(vB.list.every((s) => "alibi" in s) && vA.list.every((s) => !("alibi" in s)));
  assert.ok(Array.isArray(vA.evidence) && vB.evidence === undefined);
  assert.equal(N.skillMusic(engine, A).music, "naru_bgm_think");
  // จบทุกยกด้วย end
  for (let i = 0; i < 2; i++) { assert.equal(Court.act("A", { type: "end" }), true); drive("cross"); }
  assert.equal(Court.act("A", { type: "end" }), true);
  const end = drive("verdict");
  assert.equal(end.phase, "verdict");
  assert.equal(end.verdict.w, "tie");
  drive("none");
  assert.equal(match.court, null);
  assert.equal(engine.gameState, "ACTION");
  assert.equal(engine.actorId, "A");
  assert.equal(B.alive, true);
  assert.equal(N.skillLocks(engine, A).ultimate.cd, 5, "คูลดาวน์นับหลังคดี");
});

test("คำให้การของจำเลย: ตรวจจำนวน/ซ้ำ/ข้อแก้ตัวเฉพาะประโยคโกหก/ห้ามเกินที่มี/ส่งซ้ำไม่ได้", () => {
  const { A, B } = setup();
  engine.setActor("A");
  engine.court.start(A, B);
  engine.pausePlayingForCutscene();
  const c = drive("testimony");
  c.pool = [{ key: "a", kind: "lie", text: "1", k: { turn: 1 } }, { key: "b", kind: "truth", text: "2" }, { key: "c", kind: "lie", text: "3", k: { turn: 2 } }];
  B.courtAlibi = 1;
  assert.equal(Court.testimony("A", [{ key: "a" }, { key: "b" }, { key: "c" }]), false, "ทนายส่งไม่ได้");
  assert.equal(Court.testimony("B", [{ key: "a" }, { key: "b" }]), false, "ไม่ครบ");
  assert.equal(Court.testimony("B", [{ key: "a" }, { key: "a" }, { key: "c" }]), false, "ซ้ำ");
  assert.equal(Court.testimony("B", [{ key: "a" }, { key: "b", alibi: true }, { key: "c" }]), false, "ข้อแก้ตัวบนเรื่องจริง");
  assert.equal(Court.testimony("B", [{ key: "a", alibi: true }, { key: "b" }, { key: "c", alibi: true }]), false, "เกินที่มี");
  assert.equal(Court.testimony("B", [{ key: "a", alibi: true }, { key: "b" }, { key: "c" }]), true);
  assert.equal(Court.testimony("B", [{ key: "a" }, { key: "b" }, { key: "c" }]), false, "ส่งซ้ำไม่ได้");
});

test("ยื่นหลักฐาน: ตรง (อาวุธ −3) · ผิด/เรื่องจริง (ทนาย −1) · ข้อแก้ตัว (เผา + ทนาย −1) · พยานทะลุ (−2) · ใบเสร็จฟื้นทนาย · รอยเท้าเปิดข้อแก้ตัว", () => {
  const { A, B } = setup();
  B.courtAlibi = 2;
  const list = [
    { kind: "lie", text: "ฉันไม่ได้ใช้ ฟัน", k: { skill: "ฟัน" } },
    { kind: "truth", text: "ฉันใช้ ฟัน" },
    { kind: "lie", text: "เทิร์น 2 ฉันไม่ได้ทำอะไรเลย", k: { turn: 2 }, alibi: true },
  ];
  const c = openCourt(A, B, list);
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
  assert.equal(c.cred.L, 3);
  assert.equal(c.list[2].alibi, false);
  assert.equal(B.courtAlibi, 1, "ข้อแก้ตัวถูกใช้");
  assert.ok(!Court.liveEvidence(A).some((v) => v.id === e2.id), "หลักฐานถูกเผา");
  // ตรง (อาวุธ)
  const e3 = add({ skill: "ฟัน", round: 5 });
  Court.act("A", { type: "present", idx: 0, evId: e3.id }); drive("cross");
  assert.equal(c.cred.D, 2);
  assert.equal(c.list[0].done, true);
  assert.equal(N.skillMusic(engine, A).music, "naru_bgm_cornered");
  // ผิด
  const e4 = add({ skill: "ไม่เกี่ยว", round: 7 });
  Court.act("A", { type: "present", idx: 2, evId: e4.id }); drive("cross");
  assert.equal(c.cred.L, 2);
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
  assert.equal(Court.presentResult(plain, ev({ round: 3, type: "witness" }), "B").dD, 4);
  assert.equal(Court.presentResult(plain, ev({ round: 3, actorId: "C" }), "B").kind, "wrong", "หลักฐานของคนอื่นไม่จับ");
  assert.equal(Court.presentResult({ kind: "truth" }, ev(), "B").kind, "irrelevant");
});

test("เดี๋ยวก่อน!: ข้อแก้ตัวแตก + ได้หลักฐานจากเหตุการณ์ · ไม่มีข้อแก้ตัว = ไม่มีผล · 1 ครั้งต่อยก", () => {
  const { A, B } = setup();
  B.courtAlibi = 1;
  const e = Court.noteAct(B, "ultimate", "ระเบิด", ["C"]);
  A.naruhodo.evidence = [];
  const c = openCourt(A, B, [
    { kind: "lie", text: "ท่าไม้ตาย? ไม่เคย", k: { skill: "ระเบิด" }, evKey: e.id, alibi: true },
    { kind: "lie", text: "x", k: { turn: 99 } },
    { kind: "truth", text: "y" },
  ]);
  c.list[0].evKey = e.id;
  assert.equal(Court.act("A", { type: "press", idx: 0 }), true);
  drive("cross");
  assert.equal(c.list[0].alibi, false);
  assert.equal(B.courtAlibi, 0);
  assert.ok(Court.liveEvidence(A).some((v) => v.evKey === e.id), "ได้หลักฐาน");
  assert.equal(Court.act("A", { type: "press", idx: 1 }), false, "เกินโควตา");
  // ยื่นพยานใส่ประโยคที่ข้อแก้ตัวแตกแล้ว = จำเลย −4
  const w = Court.liveEvidence(A).find((v) => v.evKey === e.id);
  Court.act("A", { type: "present", idx: 0, evId: w.id }); drive("cross");
  assert.equal(c.cred.D, 1);
  assert.equal(N.skillMusic(engine, A).music, "naru_bgm_pursuit");
});

test("ฝ่ายค้านคัดค้าน: หลักฐานจับได้ = ปัดตก (ไม่เสีย) · หลักฐานผิด = ฝ่ายจำเลย −1 · 1 ครั้งต่อยก · AI 45%", () => {
  const { A, B } = setup({ extra: 1 });
  const c = openCourt(A, B, [{ kind: "lie", text: "a", k: { skill: "ฟัน" } }, { kind: "lie", text: "b", k: { turn: 50 } }, { kind: "truth", text: "c" }]);
  c.counselIds = ["C"]; c.galleryIds = [];
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

test("ประชาชน: เชียร์/โห่ (ไม่เกิน ±2) · ปาเกิน 3 = เงียบ! ไล่ออก · พยานช่วยทนาย/ช่วยจำเลย · รางวัล", () => {
  const { A, B } = setup({ extra: 5 });
  for (const id of ["C", "D", "E", "F", "G"]) engine.players[id].pos = { x: 3, y: 2 + ["C", "D", "E", "F", "G"].indexOf(id) };
  const C = engine.players.C;
  C.pos = { x: 9, y: 7 };
  const seen = Court.noteAct(B, "basic", "ฟัน", ["A"]);
  assert.ok(seen.seenBy.includes("C"));
  A.naruhodo.evidence = [];
  const c = openCourt(A, B, [{ kind: "lie", text: "a", k: { skill: "ฟัน" } }, { kind: "truth", text: "b" }, { kind: "truth", text: "c" }]);
  assert.deepEqual([...c.galleryIds].sort(), ["C", "D", "E", "F", "G"]);
  assert.ok(engine.buildStateFor("C").court.sightings.some((s) => s.key === seen.id));
  Court.act("A", { type: "end" });
  assert.equal(drive("gallery").phase, "gallery");
  assert.equal(Court.gallery("A", { e: "cheer", side: "L" }), false, "ทนายไม่ใช่ประชาชน");
  assert.equal(Court.gallery("C", { e: "witnessL", evKey: seen.id }), true);
  assert.equal(Court.gallery("C", { e: "cheer", side: "L" }), false, "1 ครั้งต่อยก");
  Court.gallery("D", { e: "throw", side: "D" });
  Court.gallery("E", { e: "throw", side: "D" });
  Court.gallery("F", { e: "throw", side: "D" });
  Court.gallery("G", { e: "throw", side: "L" });
  drive("cross");
  assert.equal(c.cred.D, 3, "รวมไม่เกิน −2");
  assert.equal(c.cred.L, 4);
  assert.ok(c.outIds.length === 1, "ไล่คนปาล่าสุด");
  assert.ok(Court.liveEvidence(A).some((v) => v.evKey === seen.id), "พยานให้หลักฐาน");
  assert.equal(c.round, 2);
  // ยก 2: ยื่นหลักฐานจากพยาน → จำเลย 0 = มีความผิด · พยานฝ่ายชนะ +1 HP +2 เหรียญ
  const st = c.list.findIndex((s) => s.kind === "lie");
  if (st >= 0) {
    const w = Court.liveEvidence(A).find((v) => v.evKey === seen.id);
    C.hp = 5; C.gold = 0;
    Court.act("A", { type: "present", idx: st, evId: w.id });
    const v = drive("verdict");
    assert.equal(v.verdict.w, "guilty");
    assert.ok(v.verdict.rewards.some((r) => r.id === "C" && r.gold === 2));
    drive("none");
    assert.equal(B.alive, false);
    assert.equal(C.hp, 6);
    assert.equal(C.gold, 2);
  }
});

test("มีความผิด: ตายแน่นอน ทะลุจุติของอรชุน · ทนายเป็นผู้สังหาร · คลิปฉากจบ (ไม่มีเสียงตะโกนก่อน)", () => {
  const { A, B } = setup();
  B.statuses.jutti = 1;
  const c = openCourt(A, B, [{ kind: "lie", text: "a", k: { skill: "ฟัน" } }, { kind: "truth", text: "b" }, { kind: "truth", text: "c" }]);
  c.cred.D = 3;
  const w = Court.addEvidence(A, ev({ skill: "ฟัน" }));
  Court.act("A", { type: "present", idx: 0, evId: w.id });
  const pre = match.court.beat.steps;
  assert.ok(!pre.some((s) => s.k === "shout" || s.k === "say" || s.k === "present"), "ยื่นหลักฐานชี้ขาด = ไม่มีเสียงตะโกนนำ");
  engine.releaseBeat();
  const b = match.court;
  const steps = b.beat.steps;
  const clip = steps.findIndex((s) => s.k === "clip");
  assert.ok(clip >= 0, "มีคลิปฉากจบ");
  assert.ok(!steps.slice(0, clip).some((s) => s.k === "shout" || s.k === "say" || s.k === "present"), "ไม่มีเสียงก่อนคลิป");
  assert.equal(N.skillMusic(engine, A), null, "เงียบเพลงระหว่างคลิป");
  const v = drive("verdict");
  assert.equal(v.verdict.w, "guilty");
  assert.equal(N.skillMusic(engine, A).music, "naru_bgm_victory");
  drive("none");
  assert.equal(B.alive, false);
  assert.equal(engine.players.B.statuses.jutti, 1, "จุติไม่ถูกใช้");
});

test("มีความผิด: ทะลุอมตะของยูกิ มาโคโตะ", () => {
  const { A, B } = setup({ others: ["yuki_makoto"] });
  const c = openCourt(A, B, [{ kind: "lie", text: "a", k: { skill: "ฟัน" } }, { kind: "truth", text: "b" }, { kind: "truth", text: "c" }]);
  c.cred.D = 1;
  const w = Court.addEvidence(A, ev({ skill: "ฟัน" }));
  Court.act("A", { type: "present", idx: 0, evId: w.id });
  drive("verdict"); drive("none");
  assert.equal(B.alive, false);
});

test("ไม่มีความผิด: ทนาย −5 (เกราะก่อน) + สตั้น 2 · ตานี้ทำอะไรต่อไม่ได้", () => {
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
  assert.equal(A.statuses.stun, 2);
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
  assert.ok(engine.timeLeft <= 15);
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
  assert.ok(c.pool.some((s) => s.text.includes("ไม้ถูพื้น")) || c.pool.some((s) => s.text.includes("แส้")), "คำให้การจากเหตุการณ์ของทั้งคู่");
  // เจ้าของส่งคำให้การแทนคู่ได้
  const picks = c.pool.slice().sort((a, b) => (a.kind === "lie" ? 0 : 1) - (b.kind === "lie" ? 0 : 1)).slice(0, 3).map((s) => ({ key: s.key }));
  assert.equal(Court.testimony("B", picks), true);
  const cc = drive("cross");
  // หลักฐานจากตัวไหนของคู่ก็จับได้
  const idx = cc.list.findIndex((s) => s.kind === "lie");
  assert.ok(idx >= 0);
  {
    cc.cred.D = 1;
    const st = cc.list[idx];
    const evid = Court.addEvidence(A, { id: "dz", round: st.k.turn != null ? st.k.turn : 2, actorId: "B", actorName: Court.who(M), kind: "basic", skill: st.k.skill || "ไม้ถูพื้น", targetName: st.k.target || null, type: "weapon" });
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
  Court.act("A", { type: "end" });
  drive("gallery"); grab();
  assert.equal(Court.gallery("C", { e: "witnessL", evKey: e.id }), true);
  assert.equal(Court.gallery("D", { e: "cheer", side: "L" }), true);
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
