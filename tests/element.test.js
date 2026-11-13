// ระบบธาตุ + ปฏิกิริยาธาตุ (server/element.js · GRID_PLAN §8.7)
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const Element = require('../server/element.js');
const combat = require('../server/combat.js');
const match = require('../server/match.js');

const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
// แถว y = 7..8 ของภูมิภาค I โล่ง
function setup(list, mode = 'ffa') {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, ch, , , team], i) => { engine.players[id] = blank(id, ch, i + 1, team || null); });
  engine.setGameMode(mode);
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setJourneyArea(1);
  engine.setRoundNumber(4);
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.shield = 0; p.statuses = {}; p.statusAmt = {}; p.hp = 7; p.armor = 3;
  }
  return engine.players;
}
// ต้นตอ src ตีธาตุ el ใส่ t ด้วยดาเมจ n
const hit = (src, t, el, n = 1) => combat.withEffectSource(src, () => Element.withElement(el, () => combat.dealMixed(t, n)));
const saved = { boardFx: engine.boardFx, sfx: engine.sfx };
const fx = [];
test.before(() => { engine.boardFx = (e, p) => fx.push({ e, p }); engine.sfx = () => {}; });
test.after(() => { Object.assign(engine, saved); engine.clearPhaseTimer(); });
test.beforeEach(() => { fx.length = 0; });

test('ธาตุติดคราบ · ธาตุเดิมต่อเวลา · ลมไม่ติดคราบ · ปกติไม่ติด', () => {
  const P = setup([['a', 'muimi', 2, 7], ['b', 'muimi', 4, 7]]);
  hit(P.a, P.b, 'fire');
  assert.equal(Element.auraOf(P.b), 'fire');
  assert.equal(P.b.statuses.elFire, Element.AURA_TURNS);
  P.b.statuses.elFire = 1;
  hit(P.a, P.b, 'fire');
  assert.equal(P.b.statuses.elFire, Element.AURA_TURNS);
  Element.clearAura(P.b);
  hit(P.a, P.b, 'wind');
  assert.equal(Element.auraOf(P.b), null);
  combat.withEffectSource(P.a, () => combat.dealMixed(P.b, 1)); // มุยมิ = ปกติ
  assert.equal(Element.auraOf(P.b), null);
});

test('ไม่ติดคราบเพื่อนร่วมทีม/ตัวเอง', () => {
  const P = setup([['a', 'muimi', 2, 7, 't1'], ['b', 'muimi', 4, 7, 't1'], ['c', 'muimi', 6, 7, 't2']], 'duo');
  Element.apply(P.b, 'fire', P.a);
  Element.apply(P.a, 'fire', P.a);
  assert.equal(Element.auraOf(P.b), null);
  assert.equal(Element.auraOf(P.a), null);
  Element.apply(P.c, 'fire', P.a);
  assert.equal(Element.auraOf(P.c), 'fire');
});

test('ระเหย 🔥💧: ดาเมจเพิ่ม 3 เกราะก่อน · คราบหาย', () => {
  const P = setup([['a', 'muimi', 2, 7], ['b', 'muimi', 4, 7]]);
  hit(P.a, P.b, 'water');
  hit(P.a, P.b, 'fire'); // 1 + 3
  assert.equal(P.b.armor + P.b.hp, 10 - 1 - 1 - 3);
  assert.equal(Element.auraOf(P.b), null);
  assert.ok(fx.some((f) => f.e === 'elemReact' && f.p.key === 'vapor'));
});

test('นำไฟฟ้า ⚡💧: ดาเมจเพิ่ม 2 ทะลุเกราะ', () => {
  const P = setup([['a', 'muimi', 2, 7], ['b', 'muimi', 4, 7]]);
  Element.apply(P.b, 'water', P.a);
  hit(P.a, P.b, 'bolt'); // 1 เกราะ + 2 เลือด
  assert.equal(P.b.armor, 2);
  assert.equal(P.b.hp, 5);
});

test('กัดเซาะ ❄️⚡: ดาเมจเพิ่ม 1 + เกราะแตกหมด', () => {
  const P = setup([['a', 'muimi', 2, 7], ['b', 'muimi', 4, 7]]);
  P.b.armor = 3;
  Element.apply(P.b, 'ice', P.a);
  hit(P.a, P.b, 'bolt');
  assert.equal(P.b.armor, 0);
  assert.equal(P.b.hp, 7);
});

test('เยือกแข็ง ❄️💧: น้ำแข็งกัด 2 เทิร์น + เดินไม่ได้ · ต้นเทิร์นเสีย 1', () => {
  const P = setup([['a', 'muimi', 2, 7], ['b', 'muimi', 4, 7]]);
  Element.apply(P.b, 'water', P.a);
  Element.apply(P.b, 'ice', P.a);
  assert.equal(P.b.statuses.frostbite, Element.FROST_TURNS);
  assert.ok(P.b.statuses.rooted > 0);
  const before = P.b.armor + P.b.hp;
  Element.tickFrost(engine, P.b);
  assert.equal(P.b.armor + P.b.hp, before - 1);
  Element.tickFrost(engine, P.b);
  assert.equal(P.b.statuses.frostbite, undefined);
});

test('ปะทุ 🔥❄️: เป้า +3 · ศัตรูรอบตัว 8 ช่องโดน 1 · เพื่อนไม่โดน', () => {
  const P = setup([['a', 'muimi', 2, 7, 't1'], ['b', 'muimi', 5, 7, 't2'], ['c', 'muimi', 6, 8, 't2'], ['d', 'muimi', 4, 8, 't1'], ['e', 'muimi', 8, 7, 't2']], 'duo');
  Element.apply(P.b, 'ice', P.a);
  hit(P.a, P.b, 'fire');
  assert.equal(P.b.armor + P.b.hp, 10 - 1 - 3);
  assert.equal(P.c.armor + P.c.hp, 9); // ทแยงติดกัน
  assert.equal(P.d.armor + P.d.hp, 10); // เพื่อนของผู้ตี
  assert.equal(P.e.armor + P.e.hp, 10); // ไกลเกิน
});

test('ระเบิด 🔥⚡: เป้า +2 · รอบตัว 2 + ผลักออก 1', () => {
  const P = setup([['a', 'muimi', 2, 7], ['b', 'muimi', 5, 7], ['c', 'muimi', 6, 7]]);
  Element.apply(P.b, 'bolt', P.a);
  hit(P.a, P.b, 'fire');
  assert.equal(P.b.armor + P.b.hp, 10 - 1 - 2);
  assert.equal(P.c.armor + P.c.hp, 8);
  assert.deepEqual(P.c.pos, { x: 7, y: 7 });
});

test('พัดพา: คราบบนเป้ากระจายไปศัตรูรอบตัว (ติดอย่างเดียว) · หลายธาตุลงตามลำดับ 🔥→❄️→⚡→💧', () => {
  const P = setup([['a', 'muimi', 1, 7], ['g', 'muimi', 4, 7], ['h', 'muimi', 5, 7], ['i', 'muimi', 6, 7]]);
  Element.apply(P.g, 'fire', P.a);
  Element.apply(P.h, 'water', P.a);
  Element.apply(P.i, 'ice', P.a);
  const hp = (u) => u.armor + u.hp;
  // ระเบิดลมโดนทั้งสามคน (ตัวอย่างที่ผู้ใช้เลือก)
  Element.windBurst([P.g, P.h, P.i], P.a);
  assert.equal(hp(P.h), 10 - 3, 'h 💧 โดน 🔥 = ระเหย');
  assert.equal(Element.auraOf(P.h), 'ice', 'แล้ว ❄️ จาก i ติดคราบ');
  assert.equal(hp(P.g), 10 - 3, 'g 🔥 โดน 💧 = ระเหย');
  assert.equal(P.i.statuses.frostbite, Element.FROST_TURNS, 'i ❄️ โดน 💧 = เยือกแข็ง');
});

test('ลมตีเป้าที่มีคราบ = พัดพาไปคนข้างๆ · คนที่ไม่มีคราบได้คราบ ไม่มีดาเมจ', () => {
  const P = setup([['a', 'muimi', 1, 7], ['b', 'muimi', 4, 7], ['c', 'muimi', 5, 7]]);
  Element.apply(P.b, 'bolt', P.a);
  hit(P.a, P.b, 'wind');
  assert.equal(Element.auraOf(P.b), null);
  assert.equal(Element.auraOf(P.c), 'bolt');
  assert.equal(P.c.armor + P.c.hp, 10);
});

test('ตีปกติใช้ฮุค attackElement · ดาเมจของปฏิกิริยาไม่ต่อลูกโซ่', () => {
  const P = setup([['a', 'muimi', 2, 7], ['b', 'muimi', 4, 7]]);
  Element.apply(P.b, 'water', P.a);
  Element.withElement('fire', () => combat.withEffectSource(P.a, () => Element.apply(P.b, 'fire', P.a)));
  assert.equal(Element.auraOf(P.b), null);
  assert.equal(match.elemCtx, undefined);
});

test('ระเบิดธาตุ: ระยะเดินปกติ · วง 3×3 · ไม่มีดาเมจ · ไม่โดนเพื่อน · จุดปฏิกิริยาได้ · ระเบิดลม = พัดพา', () => {
  const shop = require('../server/shop.js');
  const action = require('../server/phases/action.js');
  const P = setup([['a', 'muimi', 2, 7, 't1'], ['b', 'muimi', 5, 7, 't2'], ['c', 'muimi', 6, 8, 't2'], ['d', 'muimi', 5, 8, 't1']], 'duo');
  const real = Math.random; Math.random = () => 0.99;
  try {
    const mov = action.baseMovOf(P.a);
    assert.equal(shop.throwElemBomb(P.a, { x: 2 + mov + 1, y: 7 }, 'fire'), false, 'ไกลเกินระยะเดิน');
    assert.equal(shop.throwElemBomb(P.a, { x: 5, y: 7 }, 'water'), true);
    assert.equal(Element.auraOf(P.b), 'water');
    assert.equal(Element.auraOf(P.c), 'water');
    assert.equal(Element.auraOf(P.d), null, 'เพื่อนไม่โดน');
    assert.equal(P.b.armor + P.b.hp, 10, 'ไม่มีดาเมจ');
    shop.throwElemBomb(P.a, { x: 5, y: 7 }, 'fire'); // ระเหย
    assert.equal(P.b.armor + P.b.hp, 7);
    Element.apply(P.b, 'bolt', P.a);
    shop.throwElemBomb(P.a, { x: 4, y: 6 }, 'wind'); // b โดน → พัด ⚡ ไป c
    assert.equal(Element.auraOf(P.c), 'bolt');
  } finally { Math.random = real; }
});
