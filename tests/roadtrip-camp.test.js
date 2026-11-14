// Road Trip: กล่องรถจริง · จุดพักไม่จำกัดเวลา · แคมป์ (โหวต/คูลดาวน์/บอส) · วัตถุดิบ/ทำอาหาร/กิน · นอนเต็นท์ · กิจกรรมกลางคืน · ซ่อมรถ
//  ผู้ใช้สั่ง 2026-11-14 (GRID_PLAN §8.8 · GAME_SYSTEM §56 · server/roadtrip/camp.js · food.js · stash.js)
process.env.JOURNEY_START_SECONDS = '0';
delete process.env.ECHO_DEV_RT_PHASE; delete process.env.ECHO_DEV_RT_KM; delete process.env.ECHO_DEV_RT_DIFF; delete process.env.ECHO_DEV_RT_STOP_SECS;
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const match = require('../server/match.js');
const timers = require('../server/timers.js');
const shop = require('../server/shop.js');
const RT = require('../server/roadtrip');
const D = require('../server/roadtrip/drive.js');
const F = require('../server/roadtrip/fight.js');
const S = require('../server/roadtrip/stop.js');
const C = require('../server/roadtrip/camp.js');
const Food = require('../server/roadtrip/food.js');
const ST = require('../server/roadtrip/stash.js');
const Maps = require('../server/roadtrip/maps.js');
const combat = require('../server/combat.js');

const realRandom = Math.random;
const realStart = timers.startPhaseTimer;
const realClear = timers.clearPhaseTimer;
let pending = null;
const fire = () => { const f = pending; pending = null; if (f) f(); };

function setup(n = 2, diff = 'normal') {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  for (let i = 0; i < n; i++) {
    engine.players['p' + i] = {
      id: 'p' + i, name: 'P' + i, position: i + 1, characterId: 'muimi', alive: true, connected: true,
      cards: [], statuses: {}, statusAmt: {}, seen: {}, inventory: [], teamId: 'A', teamConfirmed: true,
    };
  }
  engine.setGameMode('roadtrip');
  match.world = 'roadtrip';
  match.rtDiff = diff;
  engine.startMatch();
  D.stopTick();
}
const P = (i) => match.players['p' + i];
const rt = () => match.roadtrip;
const def = () => Maps.defs[match.board.area];
const propOf = (kind) => def().props.find((o) => o.kind === kind);
const ing = (type, qty = 1) => ({ uid: `t_${type}_${Math.random()}`, type, qty, price: 1 });
function campNow(n = 2) {
  setup(n);
  Math.random = () => 0; // พ่อค้าเร่มา
  S.enter('camp');
  Math.random = realRandom;
}
// วางตัวติดกองไฟ (ช่องว่างรอบกองไฟ)
function atFire(i) {
  const f = propOf('campfire');
  const spots = [[f.x0, f.y1 + 1], [f.x1, f.y1 + 1], [f.x0 - 1, f.y0], [f.x1 + 1, f.y0], [f.x0, f.y0 - 1]];
  const [x, y] = spots[i];
  P(i).pos = { x, y };
}

test.beforeEach(() => {
  pending = null;
  timers.startPhaseTimer = (secs, fn) => { match.timeLeft = Math.ceil(secs); pending = fn; };
  timers.clearPhaseTimer = () => { pending = null; realClear(); };
});
test.afterEach(() => { Math.random = realRandom; timers.startPhaseTimer = realStart; timers.clearPhaseTimer = realClear; engine.clearPhaseTimer(); D.stopTick(); C.stop(); });
test.after(() => {
  RT.reset(); match.world = 'earth'; engine.setGameMode('ffa');
  for (const id of Object.keys(engine.players)) delete engine.players[id];
});

// ---------------------------------------------------------------- A) กล่องรถจริง
test('กล่องรถ: ช่วงขับต้องยืนบน/ติดกล่อง (vanProps.stash) · ชั้นหลังคาไม่ได้ · กดกล่องไกล = เดินไปแล้ว fx vanProp', async () => {
  setup(2);
  const [sx, sy] = Maps.defs[Maps.RT_ONVAN].vanProps.stash;
  P(0).inventory = [{ uid: 'a1', type: 'armor', value: 1, price: 3 }];
  rt().vanPos.p0 = { x: 12, y: 4, roof: false };
  assert.equal(RT.command('p0', 'stash', { op: 'put', uid: 'a1' }), false, 'ไกลกล่อง = ใช้ไม่ได้');
  rt().vanPos.p0 = { x: sx, y: sy, roof: true };
  assert.equal(RT.command('p0', 'stash', { op: 'put', uid: 'a1' }), false, 'บนหลังคา = ไม่ได้');
  rt().vanPos.p0 = { x: sx + 1, y: sy, roof: false };
  assert.equal(RT.command('p0', 'stash', { op: 'put', uid: 'a1' }), true, 'ติดกล่อง = ได้');
  // กดกล่องจากไกล → server เดินไปแล้วใช้ตอนถึง
  rt().vanPos.p1 = { x: 12, y: 4, roof: false };
  rt().vanBusy = {};
  assert.equal(RT.command('p1', 'vanProp', { prop: 'stash' }), true);
  await new Promise((r) => setTimeout(r, 1200));
  assert.ok(rt().fx.some((f) => f.k === 'vanProp' && f.prop === 'stash' && f.id === 'p1'), 'ถึงกล่อง = fx vanProp ของคนกด');
  assert.equal(ST.near(P(1)), true);
});

test('กล่องรถที่จุดพัก: ต้องยืนติดรถตู้ที่จอด · กดรถ (rt:act van) = เดินไปติดรถ + fx stash · วัตถุดิบซ้อนกองในกล่อง', () => {
  setup(1);
  Math.random = () => 0; S.enter('gas'); Math.random = realRandom;
  const p = P(0), b = def().vanBlock;
  p.pos = { x: def().spawns[0][0], y: def().spawns[0][1] };
  p.inventory = [ing('ingRice', 3), ing('ingRice', 4)];
  // ยืนไกลรถ (มุมซ้ายบนที่ว่าง)
  p.pos = { x: 7, y: 4 };
  assert.equal(RT.command('p0', 'stash', { op: 'put', uid: p.inventory[0].uid }), false, 'ไกลรถ = ใช้ไม่ได้');
  assert.equal(RT.command('p0', 'act', { id: 'van' }), true);
  assert.equal(Math.max(b.x0 - p.pos.x, 0, p.pos.x - b.x1) + Math.max(b.y0 - p.pos.y, 0, p.pos.y - b.y1), 1, 'เดินไปติดรถ');
  assert.ok(rt().fx.some((f) => f.k === 'stash' && f.pid === 'p0'));
  assert.equal(RT.command('p0', 'stash', { op: 'put', uid: p.inventory[0].uid }), true);
  assert.equal(RT.command('p0', 'stash', { op: 'put', uid: p.inventory[0].uid }), true);
  assert.equal(rt().stash.length, 2, '3 + 4 = กอง 5 + 2');
  assert.equal(Food.countIn(rt().stash, 'ingRice'), 7);
  assert.equal(rt().stash[0].qty, 5);
  // หยิบกองคืน
  assert.equal(RT.command('p0', 'stash', { op: 'take', uid: rt().stash[1].uid }), true);
  assert.equal(Food.countIn(p.inventory, 'ingRice'), 2);
});

// ---------------------------------------------------------------- B) จุดพักไม่จำกัดเวลา
test('จุดพักไม่จำกัดเวลา: ไม่มีตัวจับเวลา · ทุกคนที่มีชีวิต+ต่ออยู่กดพร้อม = ออก · คนหลุด/ล้มไม่ต้องรอ · ทุกคนหลุด = กันค้าง', () => {
  setup(3);
  S.enter('gas');
  assert.equal(pending, null, 'ไม่ตั้งเวลา');
  assert.equal(rt().endsAt, null);
  assert.equal(RT.publicInfo('p0').endsAt, null);
  RT.command('p0', 'ready', {});
  assert.equal(rt().phase, 'stop');
  P(2).alive = false; // ล้ม (ไม่ต้องรอ)
  RT.command('p1', 'ready', {});
  assert.equal(rt().phase, 'drive', 'คนที่ยังอยู่พร้อมครบ = ออก');
  // โมเต็ล + หลุด
  setup(2);
  S.enter('motel');
  assert.equal(pending, null);
  RT.command('p0', 'ready', {});
  P(1).connected = false;
  RT.presenceChanged();
  assert.equal(rt().phase, 'drive', 'คนหลุดไม่ต้องรอ');
  // ทุกคนหลุด = ตัวจับเวลากันค้าง → กลับมา = ยกเลิก → หลุดอีก → หมดเวลา = ออก
  setup(1);
  S.enter('gas');
  P(0).connected = false;
  RT.presenceChanged();
  assert.ok(pending, 'กันค้างเมื่อไม่เหลือใคร');
  assert.equal(match.timeLeft, C.CAMP.afkSecs);
  P(0).connected = true;
  RT.presenceChanged();
  assert.equal(pending, null, 'กลับมา = ยกเลิก');
  assert.equal(rt().phase, 'stop');
  P(0).connected = false;
  RT.presenceChanged();
  fire();
  assert.equal(rt().phase, 'drive');
});

// ---------------------------------------------------------------- C) โหวตแคมป์
test('โหวตแคมป์: ช่วงขับเท่านั้น · เสียงข้างมาก (เสมอ = ไม่) · หมดเวลานับคนที่ไม่โหวต = ไม่ · ผ่าน = แคมป์ไม่จำกัดเวลา', () => {
  setup(2);
  assert.equal(rt().phase, 'drive');
  assert.equal(RT.publicInfo('p0').camp.block, null);
  assert.equal(RT.command('p0', 'camp', { a: 'start' }), true);
  assert.equal(RT.command('p1', 'camp', { a: 'start' }), false, 'มีโหวตอยู่แล้ว');
  assert.equal(RT.publicInfo('p0').camp.vote.votes.p0, true);
  assert.equal(RT.command('p1', 'camp', { a: 'vote', yes: false }), true);
  assert.equal(rt().campVote, null, 'โหวตครบ = ตัดสินทันที');
  assert.equal(rt().phase, 'drive', '1:1 เสมอ = ไม่ผ่าน');
  assert.equal(rt().lastCampKm, null, 'ไม่ผ่าน = ไม่นับคูลดาวน์');
  // 3 คน: 2 ใช่ = ผ่าน
  setup(3);
  RT.command('p0', 'camp', { a: 'start' });
  RT.command('p1', 'camp', { a: 'vote', yes: true });
  assert.equal(rt().phase, 'drive', 'ยังรอคนที่ 3');
  RT.command('p2', 'camp', { a: 'vote', yes: false });
  assert.equal(rt().phase, 'stop');
  assert.equal(rt().stop.kind, 'camp');
  assert.equal(match.board.area, Maps.RT_CAMP);
  assert.equal(pending, null, 'แคมป์ไม่จำกัดเวลา');
  assert.equal(RT.publicInfo('p0').night, true, 'แคมป์ = กลางคืน');
  // หมดเวลา: 1 ใช่ จาก 3 = ไม่ผ่าน
  setup(3);
  RT.command('p0', 'camp', { a: 'start' });
  C.tick(Date.now() + C.CAMP.voteMs + 50);
  assert.equal(rt().campVote, null);
  assert.equal(rt().phase, 'drive');
  // คนตาย/หลุดไม่นับ
  setup(3);
  P(2).connected = false;
  RT.command('p0', 'camp', { a: 'start' });
  RT.command('p1', 'camp', { a: 'vote', yes: true });
  assert.equal(rt().phase, 'stop', '2/2 ของคนที่ต่ออยู่');
});

test('แคมป์คูลดาวน์ 40 กม. · ห้ามใกล้บอส ≤ 10 กม. · ทางแยกเปิดระหว่างโหวต = ยกเลิก · ไม่ใช่ช่วงขับ = กดไม่ได้', () => {
  setup(1);
  rt().km = 12;
  assert.equal(RT.command('p0', 'camp', { a: 'start' }), true);
  assert.equal(rt().stop.kind, 'camp', 'คนเดียวโหวตใช่ = ผ่าน');
  RT.command('p0', 'ready', {});
  assert.equal(rt().phase, 'drive');
  rt().km = 30;
  assert.equal(C.blockOf(rt()), 'cd');
  assert.equal(C.kmLeft(rt()), 22);
  assert.equal(RT.command('p0', 'camp', { a: 'start' }), false);
  rt().km = 53; rt().nextBossKm = 60;
  assert.equal(C.blockOf(rt()), 'boss', 'ห่างบอส 7 กม.');
  assert.equal(RT.command('p0', 'camp', { a: 'start' }), false);
  rt().km = 55; rt().nextBossKm = 100;
  assert.equal(C.blockOf(rt()), null);
  // ทางแยกเปิดระหว่างโหวต (2 คน ยังโหวตไม่ครบ)
  setup(2);
  RT.command('p0', 'camp', { a: 'start' });
  D.openFork();
  assert.equal(rt().campVote, null, 'ออกจากช่วงขับ = ยกเลิกโหวต');
  assert.equal(RT.command('p1', 'camp', { a: 'start' }), false, 'ทางแยกเปิดโหวตไม่ได้');
  assert.equal(RT.command('p1', 'camp', { a: 'vote', yes: true }), false);
});

// ---------------------------------------------------------------- D) วัตถุดิบ / แผง / ทำอาหาร
test('แผงวัตถุดิบในปั๊มทุกแบบ (แยกจากมินิมาร์ท) · ขาย 6 ชนิด ชนิดละ 3 · ซ้อนกองละ 5 ในกระเป๋า · กดแผง = fx shop', () => {
  for (const area of Maps.RT_GAS) {
    setup(1);
    process.env.ECHO_DEV_RT_AREA = String(area);
    S.enter('gas');
    delete process.env.ECHO_DEV_RT_AREA;
    const g = propOf('grocer');
    assert.ok(g && g.spot, `ปั๊ม ${area} มีแผงวัตถุดิบ`);
    const s = match.shops.find((o) => o.kind === 'rtfood');
    assert.ok(s, 'เปิดร้านแผงวัตถุดิบ');
    assert.deepEqual(s.items.map((it) => it.type).sort(), Object.keys(Food.ING).sort());
    assert.ok(s.items.every((it) => it.stock === Food.GROCER_STOCK));
    assert.ok(!s.items.some((it) => it.type === 'rtRevive' || it.type === 'rtFish'), 'ไม่ปนของมินิมาร์ท');
    assert.equal(RT.command('p0', 'act', { id: g.id }), true);
    assert.equal(rt().fx[rt().fx.length - 1].k, 'shop');
    assert.equal(rt().fx[rt().fx.length - 1].shopId, s.id);
  }
  // ซื้อซ้อนกอง: กระเป๋าเต็มแต่มีกองเดิม = ซื้อได้
  const p = P(0), s = match.shops.find((o) => o.kind === 'rtfood');
  p.gold = 99;
  p.inventory = [ing('ingRice', 1), { uid: 'x1', type: 'armor', value: 2 }, { uid: 'x2', type: 'armor', value: 2 }, { uid: 'x3', type: 'armor', value: 2 }, { uid: 'x4', type: 'armor', value: 2 }];
  assert.equal(shop.bagFull(p), true);
  const rice = s.items.find((it) => it.type === 'ingRice');
  shop.buyShopItem('p0', s.id, rice.id);
  assert.equal(Food.countIn(p.inventory, 'ingRice'), 2, 'ซ้อนกองเดิม');
  assert.equal(p.inventory.length, 5);
  const egg = s.items.find((it) => it.type === 'ingEgg');
  const g0 = p.gold;
  shop.buyShopItem('p0', s.id, egg.id);
  assert.equal(p.gold, g0, 'ชนิดใหม่ + กระเป๋าเต็ม = ซื้อไม่ได้');
  assert.equal(shop.shopItemName({ type: 'ingFish' }), 'ปลาสด');
  assert.equal(shop.shopItemName({ type: 'dishHotpot' }), 'หม้อไฟรวมมิตร');
});

test('ทำอาหาร: ต้องใกล้กองไฟ · ใช้วัตถุดิบกระเป๋าก่อนแล้วกล่องรถ · ไม่พอ = ทำไม่ได้ · สุก 4 วิ → จานเข้ากระเป๋า (เต็ม = กล่องรถ) · ทีละจาน', () => {
  campNow(2);
  const p = P(0);
  p.inventory = [ing('ingRice', 1)];
  rt().stash = [ing('ingEgg', 2), ing('ingVeg', 1)];
  p.pos = { x: 1, y: 15 };
  assert.equal(RT.command('p0', 'camp', { a: 'cook', recipe: 'friedrice' }), false, 'ไกลกองไฟ');
  atFire(0);
  assert.equal(RT.command('p0', 'camp', { a: 'cook', recipe: 'steak' }), false, 'ไม่มีเนื้อ');
  assert.equal(RT.command('p0', 'camp', { a: 'cook', recipe: 'nope' }), false);
  assert.equal(RT.command('p0', 'camp', { a: 'cook', recipe: 'friedrice' }), true);
  assert.equal(Food.countIn(p.inventory, 'ingRice'), 0);
  assert.equal(Food.countIn(rt().stash, 'ingEgg'), 1, 'ไข่จากกล่องรถ');
  assert.equal(Food.countIn(rt().stash, 'ingVeg'), 0);
  assert.equal(RT.command('p0', 'camp', { a: 'cook', recipe: 'omelet' }), false, 'ทีละจาน');
  C.tick(Date.now() + 1000);
  assert.ok(!p.inventory.some((it) => it.type === 'dishFriedRice'), 'ยังไม่สุก');
  C.tick(Date.now() + C.CAMP.cookMs + 50);
  assert.ok(p.inventory.some((it) => it.type === 'dishFriedRice'), 'สุกแล้วเข้ากระเป๋า');
  assert.ok(rt().fx.some((f) => f.k === 'cookDone' && f.id === 'p0'));
  // กระเป๋าเต็ม = จานไปกล่องรถ
  p.inventory = [ing('ingRice', 1), ing('ingEgg', 1), { uid: 'f1', type: 'armor', value: 2 }, { uid: 'f2', type: 'armor', value: 2 }, { uid: 'f3', type: 'armor', value: 2 }];
  assert.equal(RT.command('p0', 'camp', { a: 'cook', recipe: 'omelet' }), true);
  // วัตถุดิบหมด 2 ช่อง → กระเป๋าว่าง 2 ช่อง — เติมให้เต็มก่อนสุก
  p.inventory.push({ uid: 'f4', type: 'armor', value: 2 }, { uid: 'f5', type: 'armor', value: 2 });
  C.tick(Date.now() + C.CAMP.cookMs + 50);
  assert.ok(rt().stash.some((it) => it.type === 'dishOmelet'), 'กระเป๋าเต็ม = กล่องรถ');
  // ออกจากแคมป์ระหว่างทำ = เสิร์ฟเลย
  p.inventory = [ing('ingMeat', 1), ing('ingSpice', 1)];
  RT.command('p0', 'camp', { a: 'cook', recipe: 'steak' });
  RT.command('p0', 'ready', {}); RT.command('p1', 'ready', {});
  assert.equal(rt().phase, 'drive');
  assert.ok(p.inventory.some((it) => it.type === 'dishSteak'), 'ออกก่อนสุก = ได้จาน');
});

test('กินอาหาร: ทุกเมนูมีผลจริง · กินได้นอกการต่อสู้ (ขับ/จุดพัก) · ตอนสู้ไม่ได้ · กินที่กองไฟด้วยกัน ≥ 2 = อิ่มด้วยกัน', () => {
  assert.equal(Food.RECIPES.length, 8);
  for (const r of Food.RECIPES) {
    const n = Object.values(r.need).reduce((a, b) => a + b, 0);
    assert.ok(n >= 2 && n <= 3, `${r.id} ใช้ 2–3 อย่าง`);
  }
  setup(2);
  const p = P(0), q = P(1), max = combat.maxHpOf(p);
  const eat = (type, extra = {}) => { const it = { uid: `d_${type}_${Math.random()}`, type }; p.inventory = [it]; return RT.command('p0', 'use', { uid: it.uid, ...extra }); };
  // ช่วงขับกินได้
  p.hp = 1;
  assert.equal(eat('dishOmelet'), true);
  assert.equal(p.hp, Math.min(max, 4));
  p.hp = 1; p.armor = 0;
  eat('dishFriedRice');
  assert.equal(p.hp, Math.min(max, 5)); assert.equal(p.armor, 1);
  eat('dishSteak');
  assert.ok(rt().buffs.p0.some((b) => b.key === 'might' && b.amt === 1 && b.turns === 2));
  eat('dishFish');
  assert.ok(rt().buffs.p0.some((b) => b.key === 'evade' && b.amt === 25));
  p.statuses.poison = 2;
  eat('dishTomYum');
  assert.equal(p.statuses.poison, undefined, 'ต้มยำล้างสถานะ');
  p.armor = 0;
  eat('dishSalad');
  assert.equal(p.armor, Math.min(2, combat.maxArmorOf(p)));
  assert.ok(rt().buffs.p0.some((b) => b.key === 'guard'));
  rt().van.hp = 5;
  eat('dishLunch');
  assert.equal(rt().van.hp, 9, 'ข้าวกล่องช่าง = รถ +4');
  q.hp = 1; p.hp = 1;
  eat('dishHotpot');
  assert.equal(q.hp, 3, 'หม้อไฟ = ทั้งทีม +2'); assert.equal(p.hp, 3);
  // ตอนสู้กินไม่ได้
  F.begin('ambush'); fire();
  assert.equal(eat('dishOmelet'), false);
  assert.equal(p.inventory.length, 1, 'ไม่เสียของ');
  // อิ่มด้วยกันที่กองไฟ
  campNow(2);
  atFire(0); atFire(1);
  const give = (i, type) => { const it = { uid: `e_${i}_${type}`, type }; P(i).inventory = [it]; return it.uid; };
  RT.command('p0', 'use', { uid: give(0, 'dishOmelet') });
  assert.ok(!(rt().buffs.p0 || []).some((b) => b.name === 'อิ่มด้วยกัน'), 'คนเดียวยังไม่ได้');
  RT.command('p1', 'use', { uid: give(1, 'dishSalad') });
  assert.ok(rt().buffs.p0.some((b) => b.name === 'อิ่มด้วยกัน'));
  assert.ok(rt().buffs.p1.some((b) => b.name === 'อิ่มด้วยกัน'));
  RT.command('p1', 'use', { uid: give(1, 'dishOmelet') });
  assert.equal(rt().buffs.p1.filter((b) => b.name === 'อิ่มด้วยกัน').length, 1, 'คนละครั้ง');
});

// ---------------------------------------------------------------- C) กิจกรรมแคมป์
// วางตัว i ที่ช่อง spot ของวัตถุ (kind, style)
function at(i, kind, style) { const o = def().props.find((x) => x.kind === kind && (!style || x.style === style)); P(i).pos = { x: o.spot[0], y: o.spot[1] }; return o; }
const fxOf = (k, pid) => rt().fx.filter((f) => f.k === k && (pid == null || f.pid === pid || f.id === pid));

test('จุดแคมป์ = แผงของตัวเอง: กองไฟ/ครัว = ทำอาหาร · ขอน = เรื่องเล่า · ที่ปิ้ง · กล้อง · ฟืน · แม่แรง · ท่าเรือ (fx camp spot)', () => {
  campNow(1);
  const want = { campfire: 'cook', kitchen: 'cook', storylog: 'logs', mallow: 'mallow', ledge: 'scope', woodpile: 'chop' };
  for (const [kind, spot] of Object.entries(want)) {
    rt().stop.cd = {};
    assert.equal(RT.command('p0', 'act', { id: propOf(kind).id }), true, kind);
    assert.equal(rt().fx[rt().fx.length - 1].k, 'camp');
    assert.equal(rt().fx[rt().fx.length - 1].spot, spot, kind);
  }
  rt().van.hp = rt().van.hpMax - 5;
  RT.command('p0', 'act', { id: propOf('jack').id });
  assert.equal(rt().fx[rt().fx.length - 1].spot, 'repair');
  const fishLake = def().props.find((o) => o.kind === 'lake' && o.style === 'fish');
  RT.command('p0', 'act', { id: fishLake.id });
  assert.equal(rt().fx[rt().fx.length - 1].spot, 'fish');
  assert.ok(rt().stop.camp.stars.p0, 'กล้อง = ได้โจทย์ดูดาว');
});

test('นอนเต็นท์: เลือด/เกราะเต็ม + ล้างสถานะ คนละครั้ง · ทุกคนนอนครบ = ฟ้าสางแล้วออกเดินทาง · แม่แรง = มินิเกมซ่อม +1..+3 คนละครั้ง', () => {
  campNow(2);
  const p = P(0), tents = def().props.filter((o) => o.kind === 'tent');
  assert.ok(tents.length >= 2);
  rt().van.hp = rt().van.hpMax - 10;
  at(0, 'jack');
  assert.equal(RT.command('p0', 'camp', { a: 'repair', score: 1 }), true);
  assert.equal(rt().van.hp, rt().van.hpMax - 7, 'คะแนนเต็ม +3');
  assert.equal(RT.command('p0', 'camp', { a: 'repair', score: 1 }), false, 'คนละครั้ง');
  P(1).pos = { x: 1, y: 15 };
  assert.equal(RT.command('p1', 'camp', { a: 'repair', score: 1 }), false, 'ต้องยืนติดแม่แรง');
  at(1, 'jack');
  assert.equal(RT.command('p1', 'camp', { a: 'repair', score: 0 }), true);
  assert.equal(rt().van.hp, rt().van.hpMax - 6, 'คะแนน 0 = +1');
  p.hp = 1; p.armor = 0; p.statuses.poison = 3;
  assert.equal(RT.command('p0', 'act', { id: tents[0].id }), true);
  assert.equal(p.hp, combat.maxHpOf(p));
  assert.equal(p.armor, combat.maxArmorOf(p));
  assert.equal(p.statuses.poison, undefined);
  rt().stop.cd = {};
  assert.equal(RT.command('p0', 'act', { id: tents[1].id }), false, 'นอนแล้ว');
  assert.equal(rt().stop.camp.sunriseAt, 0);
  assert.equal(RT.command('p1', 'act', { id: tents[1].id }), true);
  assert.ok(rt().stop.camp.sunriseAt > 0, 'นอนครบ = ฟ้าสาง');
  assert.ok(fxOf('sunrise').length);
  C.tick(Date.now() + C.CAMP.sunriseMs + 50);
  assert.equal(rt().phase, 'drive', 'ฟ้าสางแล้วออกเดินทาง');
  campNow(1);
  assert.equal(RT.command('p0', 'act', { id: 'van' }), true);
  assert.equal(ST.near(P(0)), true, 'กล่องรถ = ยืนติดรถ');
});

test('ขอนเล่าเรื่อง: เรื่องผี/ร้องเพลง (กลุ่ม ≥ 2 · ทีละวง) · ต้องยืนที่ขอน · คนเดียวไม่เสียสิทธิ์ · เรื่องผีโหวต = ขนลุก + ตรงเสียงข้างมาก +1 · ร้องเพลงเฉลี่ยผ่าน', () => {
  campNow(3);
  at(0, 'storylog'); at(1, 'storylog'); P(2).pos = { x: 1, y: 15 };
  assert.equal(RT.command('p0', 'camp', { a: 'night', key: 'story' }), true);
  assert.equal(RT.command('p2', 'camp', { a: 'night', key: 'story' }), false, 'ไกลขอน');
  assert.equal(RT.command('p1', 'camp', { a: 'night', key: 'sing' }), false, 'ขอนมีวงอื่นอยู่');
  C.tick(Date.now() + C.CAMP.joinMs + 50);
  assert.equal(rt().stop.camp.acts.story, undefined, 'คนเดียว = ยกเลิก');
  assert.equal(rt().stop.camp.done.story, undefined);
  P(0).hp = 1; P(1).hp = 1;
  RT.command('p0', 'camp', { a: 'night', key: 'sing' }); RT.command('p1', 'camp', { a: 'night', key: 'sing' });
  C.tick(Date.now() + C.CAMP.joinMs + 50);
  assert.equal(rt().stop.camp.acts.sing.stage, 'play');
  RT.command('p0', 'camp', { a: 'play', key: 'sing', score: 0.9 }); RT.command('p1', 'camp', { a: 'play', key: 'sing', score: 0.8 });
  assert.equal(P(0).hp, 2);
  assert.ok(rt().buffs.p1.some((b) => b.key === 'might' && b.turns === 2));
  const s0 = P(0).gold;
  RT.command('p0', 'camp', { a: 'night', key: 'story' }); RT.command('p1', 'camp', { a: 'night', key: 'story' });
  C.tick(Date.now() + C.CAMP.joinMs + 50);
  RT.command('p0', 'camp', { a: 'play', pick: 2 });
  C.tick(Date.now() + C.CAMP.joinMs + C.CAMP.playMs + 100);
  assert.ok(rt().buffs.p0.some((b) => b.name === 'ขนลุก'));
  assert.ok(!(rt().buffs.p1 || []).some((b) => b.name === 'ขนลุก'), 'ไม่โหวต = ไม่ได้');
  assert.equal(P(0).gold, s0 + 1);
  assert.deepEqual(Object.keys(RT.publicInfo('p0').stop.camp.done).sort(), ['sing', 'story']);
});

test('เรือแคนู 2 คน: กดทะเลสาบขวา = เข้าคิวเรือ · ครบ 2 = เริ่มพาย · เฉลี่ย ≥ 0.8 = +2 เหรียญ + พลังชีวิต +1 · คนที่ 3 ขึ้นไม่ได้', () => {
  campNow(3);
  const canoe = def().props.find((o) => o.kind === 'lake' && o.style === 'canoe');
  assert.equal(RT.command('p0', 'act', { id: canoe.id }), true);
  assert.equal(rt().stop.camp.acts.canoe.stage, 'join');
  P(1).pos = { x: canoe.spot[0], y: canoe.spot[1] };
  assert.equal(RT.command('p1', 'camp', { a: 'night', key: 'canoe' }), true);
  assert.equal(rt().stop.camp.acts.canoe.stage, 'play', 'เต็มเรือ = เริ่มเลย');
  P(2).pos = { x: canoe.spot[0], y: canoe.spot[1] };
  assert.equal(RT.command('p2', 'camp', { a: 'night', key: 'canoe' }), false, 'เรือ 2 ที่');
  const g0 = P(0).gold;
  P(0).hp = 1;
  RT.command('p0', 'camp', { a: 'play', key: 'canoe', score: 0.9 }); RT.command('p1', 'camp', { a: 'play', key: 'canoe', score: 0.85 });
  assert.equal(P(0).gold, g0 + 2); assert.equal(P(0).hp, 2);
  assert.equal(rt().stop.camp.done.canoe, true);
});

test('ตกปลาที่ท่าเรือ (คนละ 3 ครั้ง · ดี = ปลาสด 2 · พอได้ = 1) · ผ่าฟืน = ไฟกองใหญ่ (สูงสุด 3) → ออกจากแคมป์ทุกคนได้บัฟตามขั้น · ดูดาวที่กล้อง (ถูก +2)', () => {
  campNow(2);
  at(0, 'lake', 'fish');
  P(0).inventory = [];
  assert.equal(RT.command('p0', 'camp', { a: 'fish', score: 0.9 }), true);
  assert.equal(Food.countIn(P(0).inventory, 'ingFish'), 2);
  RT.command('p0', 'camp', { a: 'fish', score: 0.5 });
  RT.command('p0', 'camp', { a: 'fish', score: 0.1 });
  assert.equal(Food.countIn(P(0).inventory, 'ingFish'), 3);
  assert.equal(RT.command('p0', 'camp', { a: 'fish', score: 1 }), false, 'ครบ 3 ครั้ง');
  P(1).pos = { x: 1, y: 15 };
  assert.equal(RT.command('p1', 'camp', { a: 'fish', score: 1 }), false, 'ต้องอยู่ริมน้ำ');
  // ฟืน
  at(0, 'woodpile'); at(1, 'woodpile');
  RT.command('p0', 'camp', { a: 'chop', score: 0.9 });
  RT.command('p0', 'camp', { a: 'chop', score: 0.2 });
  assert.equal(RT.command('p0', 'camp', { a: 'chop', score: 0.9 }), false, 'คนละ 2 ครั้ง');
  RT.command('p1', 'camp', { a: 'chop', score: 0.7 });
  assert.equal(rt().stop.camp.fire, 2);
  // ดูดาว
  at(0, 'ledge');
  RT.command('p0', 'act', { id: propOf('ledge').id });
  const q = rt().stop.camp.stars.p0, g = P(0).gold;
  assert.equal(RT.command('p0', 'camp', { a: 'stars', pick: q.answer }), true);
  assert.equal(P(0).gold, g + 2);
  assert.equal(RT.command('p0', 'camp', { a: 'stars', pick: q.answer }), false, 'คนละครั้ง');
  // ออกจากแคมป์ = บัฟไฟ 2 ขั้น
  RT.command('p0', 'ready', {}); RT.command('p1', 'ready', {});
  assert.equal(rt().phase, 'drive');
  assert.equal(rt().buffs.p1.filter((b) => b.name === 'ไฟอุ่นใจ').length, 2);
});

test('มาร์ชเมลโล่ (ที่ปิ้ง): ทอง = +2 +1 เหรียญ · ไหม้ 0 · คนละครั้ง · คนข้าวดี = อร่อยพิเศษ +1 · เปลญวน/ลูบหมา = ฮีลคนละครั้ง', () => {
  campNow(2);
  at(0, 'mallow'); at(1, 'mallow');
  P(0).hp = 1; P(1).hp = 1;
  const g = P(0).gold;
  assert.equal(RT.command('p0', 'camp', { a: 'mallow', score: 0.9 }), true);
  assert.equal(P(0).hp, 3); assert.equal(P(0).gold, g + 1);
  assert.equal(RT.command('p0', 'camp', { a: 'mallow', score: 0.9 }), false);
  RT.command('p1', 'camp', { a: 'mallow', score: 0 });
  assert.equal(rt().stop.camp.mallow.p1, 'burnt');
  at(0, 'kitchen');
  P(0).inventory = [ing('ingRice', 1), ing('ingEgg', 1)];
  assert.equal(RT.command('p0', 'camp', { a: 'cook', recipe: 'omelet' }), true, 'ครัวกลางแจ้งก็ทำอาหารได้');
  RT.command('p0', 'camp', { a: 'stir', score: 0.95 });
  C.tick(Date.now() + C.CAMP.cookMs + 50);
  const dish = P(0).inventory.find((it) => it.type === 'dishOmelet');
  assert.ok(dish && dish.great);
  P(0).hp = 1;
  RT.command('p0', 'use', { uid: dish.uid });
  assert.equal(P(0).hp, Math.min(combat.maxHpOf(P(0)), 1 + 3 + Food.GREAT_HEAL));
  P(1).hp = 1;
  assert.equal(RT.command('p1', 'act', { id: propOf('hammock').id }), true);
  assert.equal(P(1).hp, 1 + C.REST.hammockHeal);
  rt().stop.cd = {};
  assert.equal(RT.command('p1', 'act', { id: propOf('hammock').id }), false, 'คนละครั้ง');
  assert.equal(RT.command('p1', 'act', { id: propOf('campdog').id }), true);
  assert.equal(P(1).hp, 1 + C.REST.hammockHeal + C.REST.petHeal);
});

test('ตลาดนัดกลางคืน: รถฟู้ดทรัค (อาหารพร้อมกิน) · แผงวัตถุดิบ · แผงของแคมป์ — ร้านคืออาคาร 2×2 ขึ้นไป · กดแผง = fx shop · แคมป์ไม่มีอู่', () => {
  campNow(1);
  const kinds = match.shops.map((s) => s.kind).sort();
  assert.deepEqual(kinds, ['rtcart', 'rtsnack', 'rtsupply']);
  const snack = match.shops.find((s) => s.kind === 'rtsnack');
  assert.ok(snack.items.every((it) => Food.isDish(it.type)));
  const ingS = match.shops.find((s) => s.kind === 'rtcart');
  assert.deepEqual(ingS.items.map((it) => it.type).sort(), Object.keys(Food.ING).sort());
  for (const o of def().props.filter((x) => ['foodtruck', 'mstall'].includes(x.kind))) {
    assert.ok(o.x1 - o.x0 >= 1 && o.y1 - o.y0 >= 1, `${o.id} 2×2`);
    rt().stop.cd = {};
    assert.equal(RT.command('p0', 'act', { id: o.id }), true);
    assert.equal(rt().fx[rt().fx.length - 1].k, 'shop');
  }
  assert.equal(RT.command('p0', 'upg', { key: 'body' }), false, 'แคมป์ไม่มีอู่');
});

test('ผังแคมป์ + ปั๊มผ่านตัวตรวจ (ทางเดินโล่ง · ร้าน/แผง ≥ 2×2) · ทุกจุดกิจกรรมแคมป์มี spot ที่เดินถึง', () => {
  assert.deepEqual(Maps.validate(), []);
  const d = Maps.defs[Maps.RT_CAMP];
  for (const k of ['campfire', 'kitchen', 'storylog', 'mallow', 'ledge', 'woodpile', 'hammock', 'campdog', 'tent', 'jack', 'lake', 'foodtruck', 'mstall']) assert.ok(d.props.some((o) => o.kind === k && o.spot), k);
  assert.ok(d.vanBlock && d.vanOpen);
});
