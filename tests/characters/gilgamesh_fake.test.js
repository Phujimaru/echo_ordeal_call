// กิลกาเมช (Fake) (gilgamesh_fake) — EA / Gate of Babylon (ปืนกลสมบัติ) / Enuma Elish / ราชาที่แท้จริง (GRID_PLAN §7.30)
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const gil = require('../../characters/gilgamesh_fake.js');
const { CHAR_BY_ID } = require('../../characters.js');
const action = require('../../server/phases/action.js');
const shop = require('../../server/shop.js');

const realRandom = Math.random;
const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
// แถว y = 6..8 ช่วง x = 2..12 ของภูมิภาค I เป็นพื้นโล่ง (แบบเทสต์เกรย์/กิระ)
function setup(list, mode = 'ffa') {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, ch, , , team], i) => { engine.players[id] = blank(id, ch, i + 1, team || null); });
  engine.setGameMode(mode);
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setJourneyArea(1);
  engine.setCycleShift(0);
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.skillPoints = 8; p.skillUsedRound = false; p.shield = 0;
    p.statuses = {}; p.statusAmt = {};
  }
  return engine.players;
}
const view = (viewerId, id) => engine.buildStateFor(viewerId).players.find((p) => p.id === id);
const vit = (p) => (p.hp || 0) + (p.armor || 0);
const flush = (t, ms = 6000) => { for (let i = 0; i < ms / 100; i++) t.mock.timers.tick(100); };
const items = (n, type = 'cleanse') => Array.from({ length: n }, (_, i) => ({ uid: `it${i}_${type}`, type, price: 3 }));
const nextRound = (t) => {
  engine.endTurn();
  for (let i = 0; i < 300 && engine.gameState !== 'PLAYING'; i++) t.mock.timers.tick(100);
  engine.clearPhaseTimer();
};

const saved = {
  triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash,
  notifyTransform: engine.notifyTransform, sfx: engine.sfx, boardFx: engine.boardFx,
};
const calls = { fx: [], sfx: [], flash: [], queue: [], trig: [] };
test.before(() => {
  engine.triggerCutscene = (p, key) => calls.trig.push(key);
  engine.queueCutscene = (p, key) => calls.queue.push(key);
  engine.skillFlash = (f) => calls.flash.push(f);
  engine.notifyTransform = () => {};
  engine.sfx = (s) => calls.sfx.push(s);
  engine.boardFx = (event, payload) => calls.fx.push({ event, payload });
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.beforeEach(() => { for (const k of Object.keys(calls)) calls[k] = []; });
test.afterEach(() => { Math.random = realRandom; engine.setGameMode('ffa'); engine.setCycleShift(0); engine.clearPhaseTimer(); });
const gilFx = (kind) => calls.fx.filter((f) => f.event === 'gilFx' && f.payload.kind === kind).map((f) => f.payload);

test('ข้อมูล: มหันตภัย · unique · ชาย · 0/0/0 แต้ม · Enuma Elish แนว 14×5 · HP 8 · เริ่ม 100 เหรียญ · กระเป๋า 50', () => {
  const ch = CHAR_BY_ID.gilgamesh_fake;
  assert.equal(ch.difficulty, 'calamity');
  assert.equal(ch.unique, true);
  assert.equal(ch.gender, 'm');
  assert.deepEqual([ch.basic.cost, ch.secondary.cost, ch.ultimate.cost], [0, 0, 0]);
  assert.deepEqual(ch.ultimate.area, { kind: 'line', len: 14, width: 5, hostile: true });
  const P = setup([['G', 'gilgamesh_fake', 3, 7], ['B', 'dummy', 8, 7]]);
  assert.equal(P.G.hp, 8);
  assert.equal(P.G.gold, 100);
  assert.equal(engine.goldCapOf(P.G), 999);
  assert.equal(engine.goldCapOf(P.B), 100);
  assert.equal(view('G', 'G').bagSlots, 50);
  assert.equal(view('G', 'B').bagSlots, 5);
  P.G.inventory = items(49);
  assert.equal(engine.bagFull(P.G), false);
  P.G.inventory = items(50);
  assert.equal(engine.bagFull(P.G), true);
});

test('สลับดาบ EA: ฟรี ไม่กินโควตา ยังเดินได้ · เทิร์นละครั้ง · ครั้งแรกคลิป EAเอ๋ย', () => {
  const P = setup([['G', 'gilgamesh_fake', 3, 7], ['B', 'dummy', 8, 7]]);
  engine.setActor('G');
  engine.useSkill('G', 'basic', [], { form: 'bare' });
  assert.equal(P.G.gil.ea, false, 'มือเปล่าอยู่แล้ว = กดไม่ได้');
  engine.useSkill('G', 'basic', [], { form: 'ea' });
  assert.equal(P.G.gil.ea, true);
  assert.deepEqual(calls.trig, ['gilEaDraw']);
  assert.equal(P.G.skillUsedRound, false, 'ไม่กินโควตา');
  assert.equal(engine.action.locked, false, 'ยังเดินได้');
  engine.useSkill('G', 'basic', [], { form: 'bare' });
  assert.equal(P.G.gil.ea, true, 'เทิร์นละครั้ง');
  assert.deepEqual(view('G', 'G').range, [1, 2]);
  assert.equal(view('G', 'G').strikeRing, true);
});

test('ตีด้วย EA: รอบตัว 8 ช่อง (ทแยงได้ · ห่าง 2 ตรงไม่ได้) · ดาเมจ 3 ทุกคน · ผลักออก · พายุเริ่ม · ตีครั้งแรกคลิป EAกู่ร่อง', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['G', 'gilgamesh_fake', 6, 7], ['A', 'dummy', 7, 7], ['B', 'dummy', 5, 6], ['C', 'dummy', 8, 7], ['D', 'dummy', 6, 8]]);
  P.G.gil.ea = true;
  for (const id of ['A', 'B', 'C', 'D']) { P[id].hp = 10; P[id].armor = 0; }
  Math.random = () => 0.99;
  assert.equal(action.canStrike(P.G, P.B), true, 'ทแยง');
  assert.equal(action.canStrike(P.G, P.C), false, 'ห่าง 2 แนวตรง');
  engine.setActor('G');
  assert.equal(gil.preAttackClip(engine, P.G), 'gilEaRoar', 'ตี EA ครั้งแรก = คลิป');
  assert.equal(gil.preAttackClip(engine, P.G), null, 'ครั้งเดียวต่อเกม');
  engine.attackTarget('G', 'B');
  assert.equal(P.B.hp, 7, 'ดาเมจ 3');
  assert.equal(P.A.hp, 7);
  assert.equal(P.D.hp, 7);
  assert.equal(P.C.hp, 10, 'นอกวง');
  flush(t, 5000);
  assert.deepEqual(P.B.pos, { x: 4, y: 5 }, 'ผลักทแยงออก');
  assert.deepEqual(P.D.pos, { x: 6, y: 9 });
  assert.equal(P.A.pos.x, 7, 'ชน C = ไม่ขยับ');
  assert.equal(P.G.gil.storm, true);
  assert.ok(P.G.gil.warns.length >= 4);
});

test('พายุ: จบเทิร์นสายฟ้าแดงผ่าช่องที่เล็ง ดาเมจ 2 · ย้ายหนี = รอด · เก็บ EA = พายุหยุด', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['G', 'gilgamesh_fake', 3, 7], ['A', 'dummy', 9, 7], ['B', 'dummy', 11, 8]]);
  P.A.hp = 10; P.A.armor = 0; P.B.hp = 10; P.B.armor = 0;
  P.G.gil.ea = true; P.G.gil.storm = true;
  P.G.gil.warns = [{ id: 'A', x: 9, y: 7 }, { id: 'B', x: 11, y: 8 }];
  P.B.pos = { x: 12, y: 8 };
  Math.random = () => 0.99;
  engine.endTurn();
  assert.equal(P.A.hp, 8);
  assert.equal(P.B.hp, 10, 'หนีออกจากช่อง');
  assert.equal(gilFx('bolts').length, 1);
  assert.ok(P.G.gil.warns.some((w) => w.id === 'B' && w.x === 12), 'เล็งใหม่');
  flush(t, 30000);
  engine.clearPhaseTimer();
  engine.setActor('G');
  P.G.gil.swapRound = -1;
  engine.useSkill('G', 'basic', [], { form: 'bare' });
  assert.equal(P.G.gil.storm, false);
  assert.deepEqual(P.G.gil.warns, []);
});

test('เมตตาจากราชา: ยิง N นัด สุ่มศัตรูในกรอบ · 1 ดาเมจ/นัด · ไอเทมหาย · ความมั่งคั่ง +1/นัด · คุกเข่า 3 นัด · ไม่โดนเพื่อน · ยังเดินได้', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['G', 'gilgamesh_fake', 6, 7, 't1'], ['B', 'dummy', 8, 7, 't2'], ['F', 'dummy', 5, 7, 't1'], ['Z', 'dummy', 12, 2, 't2']], 'duo');
  P.B.hp = 20; P.B.armor = 0;
  const f0 = vit(P.F), z0 = vit(P.Z);
  P.G.inventory = [...items(5), { uid: 'bat', type: 'battery', charge: 0 }];
  P.G.gil.gateShown = true;
  Math.random = () => 0.1; // < CENTER_PCT = ทุกนัดตกตรงตัวเป้า
  engine.setActor('G');
  engine.useSkill('G', 'secondary', [], { form: 'n5' });
  flush(t, 12000);
  assert.equal(P.B.hp, 17, 'โดนได้ไม่เกิน 3 นัดต่อชุด');
  assert.equal(vit(P.F), f0, 'เพื่อนไม่โดน');
  assert.equal(vit(P.Z), z0, 'นอกกรอบ 5×5');
  assert.equal(P.G.inventory.length, 3, 'ยิงไป 3 ชิ้น ศัตรูครบเพดาน = หยุด ของที่เหลืออยู่ในคลัง');
  assert.ok(P.G.inventory.some((it) => it.type === 'battery'), 'ของพิเศษไม่ยิง');
  assert.equal(P.G.gil.wealth, 3, '+1 ต่อนัดที่โดน');
  assert.ok((P.B.statuses.stun || 0) > 0, 'คุกเข่า');
  assert.equal(gilFx('shot').length, 3);
  assert.equal(P.G.gil.weapons.length, 3, 'อาวุธปักค้าง');
  assert.equal(engine.action.locked, false, 'ยังเดินได้');
  assert.equal(engine.action.noStrike, true, 'ตีปกติไม่ได้ในตานั้น');
  assert.equal(engine.gameState, 'ACTION');
});

test('เมตตาจากราชา: เป้าตายกลางชุด = สุ่มคนอื่นต่อ · ไม่เหลือศัตรู = หยุด ของที่เหลืออยู่ในคลัง · ถือ EA ใช้ไม่ได้', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['G', 'gilgamesh_fake', 6, 7], ['B', 'dummy', 8, 7]]);
  P.B.hp = 1; P.B.armor = 1;
  P.G.inventory = items(8);
  P.G.gil.gateShown = true;
  Math.random = () => 0.1;
  P.G.gil.ea = true;
  engine.setActor('G');
  engine.useSkill('G', 'secondary', [], { form: 'n8' });
  assert.equal(P.G.inventory.length, 8, 'ถือ EA = ใช้ไม่ได้');
  P.G.gil.ea = false;
  engine.useSkill('G', 'secondary', [], { form: 'n8' });
  flush(t, 12000);
  assert.equal(P.B.alive, false);
  assert.equal(P.G.inventory.length, 6, 'ยิงแค่ 2 นัดจนเป้าตาย');
  assert.equal(P.G.gil.wealth, 2);
});

test('เมตตาจากราชา: ครั้งแรกของเกม = คลิป gate_of_babylon ก่อนยิง · กรอบ 14 = ทั้งแผนที่ · ไม่มีทั้งคลัง', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['G', 'gilgamesh_fake', 2, 7], ['B', 'dummy', 12, 2]]);
  P.B.hp = 30; P.B.armor = 0;
  P.G.inventory = items(20);
  const pub = view('G', 'G').character.secondary.choices;
  assert.equal(pub.length, 14, '1–14 (ไม่มีทั้งคลัง)');
  assert.equal(pub[pub.length - 1].key, 'n14');
  const z = gil.zoneOf(engine, P.G, 14);
  assert.deepEqual([z.x0, z.y0, z.side], [0, 0, 14]);
  Math.random = () => 0.1;
  engine.setActor('G');
  engine.useSkill('G', 'secondary', [], { form: 'all' });
  assert.deepEqual(calls.queue, [], 'ทั้งคลังถอดแล้ว');
  engine.useSkill('G', 'secondary', [], { form: 'n14' });
  assert.deepEqual(calls.queue, ['gilGate']);
  flush(t, 40000);
  assert.equal(P.B.hp, 27, 'เพดาน 3 นัด');
  assert.equal(P.G.gil.wealth, 3);
});

test('มือเปล่า: ถูกตี 30% ไอเทมโผล่มากันทั้งก้อน แล้วพัง + โซ่เอนคิดูตรึงผู้โจมตี · ไม่มีไอเทม = ไม่กัน', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['G', 'gilgamesh_fake', 6, 7], ['B', 'dummy', 7, 7]]);
  P.G.inventory = items(2);
  const before = vit(P.G);
  Math.random = () => 0.1;
  engine.setActor('B');
  engine.attackTarget('B', 'G');
  flush(t, 8000);
  assert.equal(vit(P.G), before, 'กันได้');
  assert.equal(P.G.inventory.length, 1, 'ไอเทมพัง');
  assert.ok((P.B.statuses.rooted || 0) > 0, 'ถูกตรึง');
  assert.equal(gilFx('block').length, 1);
});

test('Enuma Elish: ความมั่งคั่ง 20 + ถือ EA · ยิงต้นตาเดินถัดไป · ศัตรูในแนวตายแน่นอน · แม่นยำ · ระหว่างรอเก็บดาบไม่ได้', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['G', 'gilgamesh_fake', 3, 7, 't1'], ['B', 'dummy', 9, 8, 't2'], ['F', 'dummy', 8, 7, 't1'], ['D', 'dummy', 9, 2, 't2']], 'duo');
  engine.setActor('G');
  engine.useSkill('G', 'ultimate', [], { dir: 'right' });
  assert.equal(P.G.gil.charge, null, 'ไม่ถือ EA');
  P.G.gil.ea = true;
  P.G.gil.wealth = 19;
  engine.useSkill('G', 'ultimate', [], { dir: 'right' });
  assert.equal(P.G.gil.charge, null, 'ความมั่งคั่งไม่พอ');
  P.G.gil.wealth = 25;
  engine.useSkill('G', 'ultimate', [], { dir: 'right' });
  assert.ok(P.G.gil.charge);
  assert.equal(P.G.gil.wealth, 5, 'ใช้ 20');
  assert.deepEqual(calls.trig, ['gilEnuma']);
  P.G.gil.swapRound = -1;
  engine.useSkill('G', 'basic', [], { form: 'bare' });
  assert.equal(P.G.gil.ea, true, 'เก็บดาบไม่ได้ระหว่างรอ');
  assert.equal(P.B.alive, true);
  const r = engine.roundNumber;
  P.G.gil.charge.fire = r;
  gil.onActorReady(engine, P.G);
  flush(t, 3000);
  assert.equal(P.B.alive, true, 'เสียงพูด + เว้นจังหวะก่อน (3.25 วิ)');
  flush(t, 12000);
  assert.equal(P.B.alive, false, 'ในแนวกว้าง 5');
  assert.equal(P.F.alive, true, 'เพื่อน');
  assert.equal(P.D.alive, true, 'นอกแนว');
  assert.ok((P.G.statuses.accurate || 0) > 0, 'แม่นยำ');
  assert.equal(P.G.gil.charge, null);
  assert.equal(engine.boardMap().terrain['9,8'], 'chasm', 'พื้นในแนวแตกหายไป');
  assert.equal(engine.boardMap().terrain['9,2'] === 'chasm', false);
});

test('เพลง: ชาร์จ Enuma Elish = bite down · พายุ = STRANGEFAKE', () => {
  const P = setup([['G', 'gilgamesh_fake', 3, 7], ['B', 'dummy', 8, 7]]);
  P.G.gil.storm = true; P.G.gil.ea = true; P.G.gil.stormAt = 5;
  assert.equal(engine.buildStateFor('B').skillMusic, 'gil_strange_fake');
  P.G.gil.charge = { dir: 'right', fire: 9, at: 9 };
  assert.equal(engine.buildStateFor('B').skillMusic, 'gil_bite_down');
});

test('ราชาที่แท้จริง: ร้านรีสต็อกทุก 2 เทิร์น · Gate of Babylon ซื้อจากระยะไกลไม่ล็อกการเดิน', () => {
  const P = setup([['G', 'gilgamesh_fake', 3, 7], ['B', 'dummy', 8, 7]]);
  engine.openShopAt('apoth', 12, 12);
  const s = engine.shopById('apoth');
  const it = s.items[0];
  engine.setActor('G');
  engine.buyShopItem('G', 'apoth', it.id);
  assert.equal(P.G.inventory.length, 1, 'ซื้อจากไกลได้');
  assert.equal(engine.action.locked, false);
  engine.setActor('B');
  engine.buyShopItem('B', 'apoth', s.items[1].id);
  assert.equal(P.B.inventory.length, 0, 'คนอื่นต้องยืนติดร้าน');
  const ids = s.items.map((x) => x.id).join();
  engine.setRoundNumber(5);
  P.G.gil.restockRound = 3;
  gil.onRoundStartTick(engine, P.G);
  assert.notEqual(engine.shopById('apoth').items.map((x) => x.id).join(), ids, 'ของใหม่');
  assert.equal(P.G.gil.restockRound, 5);
  assert.equal(shop.bagSlotsOf(P.G), 50);
});

test('อาวุธที่ปักค้าง: ต้นเทิร์นถัดไปสลายเป็นละอองทอง', () => {
  const P = setup([['G', 'gilgamesh_fake', 3, 7], ['B', 'dummy', 8, 7]]);
  P.G.gil.weapons = [{ x: 8, y: 7, k: 1, w: 0 }];
  gil.onRoundStartTick(engine, P.G);
  assert.deepEqual(P.G.gil.weapons, []);
  assert.equal(gilFx('dissolve').length, 1);
});

test('เมตตาจากราชา: กระจาย — นัดที่ไม่ตกตรงตัว เฉไปช่องรอบตัวเป้า ว่าง = ปักพื้นเปล่า (ไอเทมหาย · ความมั่งคั่ง +1)', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['G', 'gilgamesh_fake', 6, 7], ['B', 'dummy', 7, 7]]);
  P.B.hp = 20; P.B.armor = 0;
  P.G.inventory = items(3);
  P.G.gil.gateShown = true;
  Math.random = () => 0.99; // เฉ → ช่องรอบตัวเป้าที่ว่าง (ไม่ใช่ช่องของกิล)
  engine.setActor('G');
  engine.useSkill('G', 'secondary', [], { form: 'n3' });
  flush(t, 10000);
  assert.equal(P.B.hp, 20, 'ไม่โดน');
  assert.equal(P.G.inventory.length, 0);
  assert.equal(P.G.gil.wealth, 0, 'ไม่โดน = ไม่ได้ความมั่งคั่ง');
  const shots = gilFx('shot');
  assert.equal(shots.length, 3);
  assert.ok(shots.every((s) => !s.hit && Math.abs(s.land.x - 7) <= 1 && Math.abs(s.land.y - 7) <= 1), 'ตกรอบตัวเป้า');
});

// ---------- สนาม Eos (PVE): เมตตาจากราชากลับไปแบบก่อนปรับสมดุล 2026-11-09 + ยิงแม่น (ผู้ใช้ 2026-11-11) ----------
test('Eos: ทั้งคลังกลับมา · ยิงจนหมดคลัง ตรงตัวทุกนัด หลบไม่ได้ · ไม่มีเพดานต่อคน · ความมั่งคั่ง +1 ทุกนัด · ตีปกติต่อได้', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['G', 'gilgamesh_fake', 2, 7], ['B', 'dummy', 12, 2]]);
  engine.setGameMode('eos');
  P.B.hp = 30; P.B.armor = 0;
  P.B.statuses.evade = 9; P.B.statusAmt.evade = 100; // หลบ 100% — ยังโดนทุกนัด
  P.G.inventory = [...items(20), { uid: 'bat', type: 'battery', charge: 0 }];
  P.G.gil.gateShown = true;
  const pub = view('G', 'G').character.secondary.choices;
  assert.equal(pub.length, 15, '1–14 + ทั้งคลัง');
  assert.equal(pub[pub.length - 1].key, 'all');
  assert.match(pub[0].desc, /หลบไม่ได้/);
  Math.random = () => 0.99; // โหมดปกติ = เฉทุกนัด · Eos ต้องตรงตัว
  engine.setActor('G');
  engine.useSkill('G', 'secondary', [], { form: 'all' });
  flush(t, 40000);
  assert.equal(P.B.hp, 10, 'ทั้งคลัง 20 นัด โดนครบ');
  assert.equal(P.G.inventory.length, 1, 'ยิงหมดคลัง เหลือของพิเศษ');
  assert.equal(P.G.inventory[0].type, 'battery');
  assert.equal(P.G.gil.wealth, 20, '+1 ทุกนัด');
  const shots = gilFx('shot');
  assert.equal(shots.length, 20);
  assert.ok(shots.every((s) => s.hit && s.tid === 'B' && s.to.x === 12 && s.to.y === 2), 'ตรงตัวทุกนัด');
  assert.ok(!engine.action.noStrike, 'ตีปกติต่อได้');
});

test('Eos: ×N ก็ตรงตัว + ความมั่งคั่งทุกนัด · โหมดอื่น (ffa) ยังเฉ/หลบได้/ไม่มีทั้งคลัง/ตีไม่ได้', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  let P = setup([['G', 'gilgamesh_fake', 6, 7], ['B', 'dummy', 7, 7]]);
  engine.setGameMode('eos');
  P.B.hp = 20; P.B.armor = 0;
  P.G.inventory = items(5);
  P.G.gil.gateShown = true;
  Math.random = () => 0.99;
  engine.setActor('G');
  engine.useSkill('G', 'secondary', [], { form: 'n5' });
  flush(t, 12000);
  assert.equal(P.B.hp, 15, '5 นัด ไม่ติดเพดาน 3');
  assert.equal(P.G.gil.wealth, 5);
  assert.ok(!engine.action.noStrike);

  for (const k of Object.keys(calls)) calls[k] = [];
  P = setup([['G', 'gilgamesh_fake', 6, 7], ['B', 'dummy', 7, 7]]);
  P.B.hp = 20; P.B.armor = 0;
  P.B.statuses.evade = 9; P.B.statusAmt.evade = 100;
  P.G.inventory = items(20);
  P.G.gil.gateShown = true;
  const pub = view('G', 'G').character.secondary.choices;
  assert.equal(pub.length, 14, 'ไม่มีทั้งคลังนอก Eos');
  Math.random = () => 0.1; // ตกตรงตัว — แต่หลบ 100%
  engine.setActor('G');
  engine.useSkill('G', 'secondary', [], { form: 'all' });
  assert.equal(P.G.inventory.length, 20, 'ทั้งคลังใช้ไม่ได้นอก Eos');
  engine.useSkill('G', 'secondary', [], { form: 'n5' });
  flush(t, 12000);
  assert.equal(P.B.hp, 20, 'หลบได้นอก Eos');
  assert.equal(P.G.gil.wealth, 0, 'หลบ = ไม่ได้ความมั่งคั่ง');
  assert.equal(engine.action.noStrike, true, 'ตีปกติไม่ได้นอก Eos');
});
