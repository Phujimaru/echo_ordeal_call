// มหาเทพอรชุน (characters/arjuna.js)
const test = require("node:test");
const assert = require("node:assert");
const { engine } = require("../../server.js");
const Board = require("../../server/board");
const A = require("../../characters/arjuna");

function mk(id, characterId, x, y, extra = {}) {
  return {
    id, name: id, characterId, hp: 7, armor: 3, skillPoints: 8, alive: true, cards: [], result: null, pos: { x, y }, position: 1,
    statuses: {}, statusAmt: {}, inventory: [], ...extra,
  };
}
function setup(rest = []) {
  for (const k of Object.keys(engine.players)) delete engine.players[k];
  engine.players.a = mk("a", "arjuna", 0, 0);
  engine.players.b = mk("b", "dummy", 1, 0);
  for (const u of rest) engine.players[u.id] = u;
  engine.startMatch();
  engine.clearPhaseTimer();
  const map = engine.boardMap();
  map.terrain = {}; map.special = map.special || {};
  engine.players.a.pos = { x: 2, y: 2 };
  engine.players.b.pos = { x: 4, y: 2 };
  Object.assign(engine.players.a, { hp: 7, armor: 3, skillPoints: 8 });
  Object.assign(engine.players.b, { hp: 7, armor: 3, skillPoints: 8 });
  engine.setActor("a");
  return { a: engine.players.a, b: engine.players.b };
}
const saved = {};
test.before(() => {
  for (const k of ["triggerCutscene", "queueCutscene", "skillFlash"]) { saved[k] = engine[k]; engine[k] = () => {}; }
});
test.after(() => { for (const k of Object.keys(saved)) engine[k] = saved[k]; });
test.afterEach(() => engine.clearPhaseTimer());

test("ค่าตัวละคร: ตีระยะ 1–2 · พิเศษ · ราคา 4/4/6", () => {
  const { CHAR_BY_ID } = require("../../characters");
  const c = CHAR_BY_ID.arjuna;
  assert.deepStrictEqual(c.range, [1, 2]);
  assert.strictEqual(c.difficulty, "special");
  assert.deepStrictEqual([c.basic.cost, c.secondary.cost, c.ultimate.cost], [4, 4, 6]);
});

test("ตะเกียงวิญญาณ: เยียวยา + จุติ 3 เทิร์น · คูลดาวน์ 3", () => {
  const { a } = setup();
  engine.useSkill("a", "basic", []);
  assert.strictEqual(a.statuses.jutti, 3);
  assert.strictEqual(a.statuses.mend, 3);
  assert.strictEqual(a.skillPoints, 4);
  assert.strictEqual(engine.CHAR_HOOKS.arjuna.canUseSkill(engine, a, "basic", []), false);
  engine.setRoundNumber(engine.roundNumber + 4);
  assert.strictEqual(engine.CHAR_HOOKS.arjuna.canUseSkill(engine, a, "basic", []), true);
});

test("จุติ: ฟื้นพลังชีวิต 1 ล้างดีบัฟทั้งหมด บัฟอยู่ ใช้ครั้งเดียว", () => {
  const { b } = setup();
  b.statuses = { jutti: 2, fragile: 3, weak: 2, guard: 2 };
  b.statusAmt = { fragile: 1, weak: 1, guard: 1 };
  b.hp = 0;
  engine.instantDeath(b);
  assert.strictEqual(b.alive, true);
  assert.strictEqual(b.hp, 1);
  assert.strictEqual(b.statuses.jutti, undefined);
  assert.strictEqual(b.statuses.fragile, undefined);
  assert.strictEqual(b.statuses.weak, undefined);
  assert.strictEqual(b.statuses.guard, 2);
  b.hp = 0;
  engine.instantDeath(b);
  assert.strictEqual(b.alive, false);
});

test("สกิลติดตัว: อรชุนจุติฟื้น = แต้มสกิล +4", () => {
  const { a } = setup();
  a.skillPoints = 1;
  a.statuses = { jutti: 1 };
  engine.instantDeath(a);
  assert.strictEqual(a.alive, true);
  assert.strictEqual(a.skillPoints, 5);
});

test("จุติ: ฟื้นได้แม้ตายแบบ absolute", () => {
  const { b } = setup();
  b.statuses = { jutti: 1 };
  engine.instantDeath(b, "absolute");
  assert.strictEqual(b.alive, true);
  assert.strictEqual(b.hp, 1);
});

test("สกิลรอง: ตีปกติ +1 + ชนิดดีบัฟ · สแต็กซ้ำไม่นับ · เพดานตีปกติ 4", () => {
  const { a, b } = setup();
  const H = engine.CHAR_HOOKS.arjuna;
  assert.strictEqual(H.damageBonus(engine, a, b), 0);
  engine.useSkill("a", "secondary", []);
  assert.strictEqual(a.statuses.arjunaPurge, 5);
  assert.strictEqual(H.damageBonus(engine, a, b), 1);
  b.statuses.fragile = 3; b.statusAmt.fragile = 2; b.statuses.weak = 1;
  assert.strictEqual(H.damageBonus(engine, a, b), 3);
  assert.strictEqual(H.damageCap(engine, a, "strike"), 4);
  assert.strictEqual(engine.attackPowerAgainst(a, Object.assign(b, { statuses: { fragile: 1, weak: 1, stun: 1, nodraw: 1, noskill: 1 } })), 4);
});

test("สกิลติดตัว: ตีปกติโดนศัตรูที่มีดีบัฟ = แต้ม +1 · ไม่มีดีบัฟ = ไม่ได้", () => {
  const { a, b } = setup();
  a.skillPoints = 1;
  assert.deepStrictEqual(engine.CHAR_HOOKS.arjuna.onStrikeLanded(engine, a, b), []);
  assert.strictEqual(a.skillPoints, 1);
  b.statuses.weak = 2;
  engine.CHAR_HOOKS.arjuna.onStrikeLanded(engine, a, b);
  assert.strictEqual(a.skillPoints, 2);
});

test("ตีปกติ: ห่าง 1 = ระเบิดลงเสมอ · ห่าง 2 = สุ่มระเบิด/ธนู · เสียงและเวลาตามท่า", () => {
  const { a } = setup();
  const H = engine.CHAR_HOOKS.arjuna, real = Math.random;
  Math.random = () => 0.1;
  assert.strictEqual(H.attackStyle(a, 1), "arjunaBomb");
  assert.strictEqual(H.attackStyle(a, 2), "arjunaArrow");
  assert.strictEqual(H.attackSound(a), "arj_arrow");
  Math.random = () => 0.9;
  assert.strictEqual(H.attackStyle(a, 2), "arjunaBomb");
  Math.random = real;
  assert.strictEqual(H.attackSound(a), "arj_bomb");
  assert.ok(H.attackFxExtra(a) > 0);
});

test("สกิลมีเสียง · ท่าไม้ตายเงียบ (ใช้เสียงในวีดีโอ)", () => {
  const { a } = setup();
  const H = engine.CHAR_HOOKS.arjuna;
  assert.strictEqual(H.skillSound(a, "basic"), "arj_lamp");
  assert.strictEqual(H.skillSound(a, "secondary"), "arj_purge");
  assert.strictEqual(H.skillSound(a, "ultimate"), null);
});

test("แถบ: กว้าง 4 ยาวสุดแผนที่ · ชิดขอบยังกว้างครบ", () => {
  const map = { cols: 16, rows: 12 };
  const h = Board.bandTiles(map, 5, 0, "h", 4);
  assert.strictEqual(h.length, 16 * 4);
  assert.deepStrictEqual([...new Set(h.map((t) => t.y))].sort((p, q) => p - q), [0, 1, 2, 3]);
  const v = Board.bandTiles(map, 15, 3, "v", 4);
  assert.strictEqual(v.length, 12 * 4);
  assert.deepStrictEqual([...new Set(v.map((t) => t.x))].sort((p, q) => p - q), [12, 13, 14, 15]);
});

function ultFlow(a, tile, orient) {
  const beats = [];
  const real = engine.skillBeat;
  engine.skillBeat = (s, fn) => beats.push({ s, fn });
  const ok = engine.CHAR_HOOKS.arjuna.applyInstantSkill;
  const ids = Board.unitsOnTiles(engine.boardUnits(), Board.bandTiles(engine.boardMap(), tile.x, tile.y, orient, 4)).map((u) => u.id);
  ok(engine, a, "ultimate", ids, { tile, orient });
  for (let i = 0; i < beats.length; i++) beats[i].fn();
  engine.skillBeat = real;
  return beats;
}

test("ท่าไม้ตาย: เปราะบางก่อน → ดาเมจ 3+1 · แถบเป็นช่องพัง · ผลักออกข้างที่ใกล้กว่า · เพื่อนไม่เสียหาย", () => {
  const c = mk("c", "dummy", 8, 8);
  const { a, b } = setup([c]);
  c.pos = { x: 6, y: 4 }; Object.assign(c, { hp: 7, armor: 3 });
  const realSame = engine.sameTeam;
  engine.sameTeam = (p, t) => (p.id === "a" && t.id === "c") || realSame(p, t);
  a.pos = { x: 0, y: 11 };
  b.pos = { x: 4, y: 3 };
  const beats = ultFlow(a, { x: 3, y: 4 }, "h"); // แถบ y 3–6
  engine.sameTeam = realSame;
  assert.deepStrictEqual(beats.slice(0, 4).map((x) => x.s.toFixed(2)), ["9.53", "2.97", "4.90", "2.80"]);
  assert.strictEqual(b.armor + b.hp, 10 - 4); // 3 + เปราะบาง 1
  assert.strictEqual(c.armor + c.hp, 10);
  assert.ok(b.pos.y < 3, "b ใกล้ขอบบน = ไปบน");
  assert.ok(c.pos.y > 6 || c.pos.y < 3);
  const m = engine.boardMap();
  assert.strictEqual(m.terrain[`3,4`] === "chasm" || (engine.layeredChasm && engine.layeredChasm("3,4")), true);
});

test("ท่าไม้ตาย: กดผ่าน useSkill ได้ทั้งแมพ ไม่ผูกที่ยืน · ไม่เลือกช่อง = ไม่เสียแต้ม", () => {
  const { a } = setup();
  a.skillPoints = 6;
  a.pos = { x: 0, y: 0 };
  engine.useSkill("a", "ultimate", [], {});
  assert.strictEqual(a.skillPoints, 6);
  engine.useSkill("a", "ultimate", [], { tile: { x: 10, y: 10 }, orient: "v" });
  assert.strictEqual(a.skillPoints, 0);
  assert.ok(engine.arjunaUltOn());
  engine.setArjunaUlt(null);
});

test("เสียงพากย์: สุ่มไม่ซ้ำจนครบชุด · ชุดใหม่ไม่ขึ้นต้นด้วยประโยคเดิม", () => {
  const { a } = setup();
  const Voice = require("../../server/voice");
  const real = engine.sfx;
  const said = [];
  engine.sfx = (k) => said.push(k);
  for (let i = 0; i < 24; i++) Voice.play(a, "strike");
  engine.sfx = real;
  assert.strictEqual(new Set(said.slice(0, 12)).size, 12);
  for (let i = 1; i < said.length; i++) assert.notStrictEqual(said[i], said[i - 1]);
});

test("ท่าไม้ตาย: เพดาน 6 · โบนัสชนิดดีบัฟ", () => {
  const { a, b } = setup();
  a.statuses.arjunaPurge = 3;
  b.pos = { x: 4, y: 3 };
  a.pos = { x: 0, y: 11 };
  b.armor = 0; b.hp = 7;
  for (const k of ["weak", "stun", "nodraw", "noskill", "decay"]) b.statuses[k] = 3;
  ultFlow(a, { x: 3, y: 4 }, "h");
  assert.strictEqual(b.hp, 1); // 3 + 6 ชนิด + เปราะบาง 1 = 10 → เพดาน 6
});

test("ป้ายฉากตีเป็นข้อความ (object = client พังจอขาว)", () => {
  const { a, b } = setup();
  const H = engine.CHAR_HOOKS.arjuna;
  a.statuses.arjunaPurge = 3;
  b.statuses.weak = 2;
  for (const n of [...H.attackFxNames(a), ...H.onStrikeLanded(engine, a, b)]) assert.strictEqual(typeof n, "string");
});
