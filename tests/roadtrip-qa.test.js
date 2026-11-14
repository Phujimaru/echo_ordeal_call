// QA Road Trip (2026-11-14) — ข้อบกพร่องที่ QA พบ (แก้แล้ว — แต่ละเทสต์ยืนยันพฤติกรรมที่ถูกต้อง)
process.env.JOURNEY_START_SECONDS = '0';
delete process.env.ECHO_DEV_RT_PHASE; delete process.env.ECHO_DEV_RT_KM; delete process.env.ECHO_DEV_RT_DIFF;
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const match = require('../server/match.js');
const Board = require('../server/board.js');
const timers = require('../server/timers.js');
const endTurn = require('../server/phases/endTurn.js');
const RT = require('../server/roadtrip');
const D = require('../server/roadtrip/drive.js');
const F = require('../server/roadtrip/fight.js');
const S = require('../server/roadtrip/stop.js');
const M = require('../server/roadtrip/mobs.js');
const Maps = require('../server/roadtrip/maps.js');
const Summon = require('../server/summon.js');
const DayNight = require('../server/dayNight.js');

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
const OUT = () => ({ moves: [], attacks: [], misses: [], van: [], charges: [], warns: [], falls: [], shots: [], rams: [] });
const clearMobs = () => { for (const m of M.mobs()) Summon.remove(m); };

test.beforeEach(() => {
  pending = null;
  timers.startPhaseTimer = (secs, fn) => { match.timeLeft = Math.ceil(secs); pending = fn; };
  timers.clearPhaseTimer = () => { pending = null; realClear(); };
});
test.afterEach(() => { Math.random = realRandom; timers.startPhaseTimer = realStart; timers.clearPhaseTimer = realClear; engine.clearPhaseTimer(); D.stopTick(); });
test.after(() => { RT.reset(); match.world = 'earth'; engine.setGameMode('ffa'); for (const id of Object.keys(engine.players)) delete engine.players[id]; });

test('FIX สู้บนรถตู้: มอนที่เพิ่งเกิดไม่ถูกถนนพาร่วงก่อนได้ขยับ · จุดเกิดห่างขอบหลัง ≥ scroll+1', () => {
  setup(1);
  F.begin('onvan');
  fire(); // เทิร์น 1
  clearMobs();
  const m = M.spawn(rt(), 'stray', { x: 0, y: 2 }, { born: match.roundNumber }); // เกิดเทิร์น 1 แบบ spawnWave
  assert.ok(m && m.pos.x === 0);
  assert.ok((Maps.defs[Maps.RT_ONVAN].mobEntries || []).every(([x]) => x >= 2), 'จุดเกิดไม่อยู่ขอบหลัง');
  const keep = M.spawn(rt(), 'giant', { x: 17, y: 1 }, { born: 999 }); // กันชนะเพราะมอนหมด
  Math.random = () => 0.99;
  F.preRound(() => {}); // ต้นเทิร์น 2: ถนนเลื่อนก่อนมอนเดิน
  assert.ok(match.players[m.id] && match.players[m.id].alive, 'มอนยังอยู่ ได้ขยับก่อน');
  assert.ok(m.summon.acted);
  assert.ok(keep);
});

test('FIX บอส: แนวพุ่งหยุดที่รถตู้ (คนหลังรถไม่โดน · บอสไม่ข้ามรถ)', () => {
  setup(1);
  F.begin('boss');
  fire();
  clearMobs();
  const vb = Maps.defs[Maps.RT_ROAD].vanBlock; // x 8–11, y 4–5
  const p = P(0);
  p.pos = { x: 15, y: vb.y0 };
  const boss = M.spawn(rt(), 'devilTruck', { x: 3, y: vb.y0 }, { born: 0 });
  Math.random = () => 0.99; // ไม่หลบ
  const out = OUT();
  M.actOne(rt(), boss, out); // เล็ง — แนวที่ผ่านรถตู้ไม่ถึงคนหลังรถ
  assert.ok(!rt().combat.warn || !rt().combat.warn.tiles.some((t) => t.x >= vb.x0), 'แนวไม่ทะลุรถตู้');
  const hp0 = p.hp + p.armor;
  M.actOne(rt(), boss, OUT());
  assert.equal(p.hp + p.armor, hp0, 'คนหลังรถตู้ไม่โดน');
  const onVanBlock = (q) => q.x >= vb.x0 && q.x <= vb.x1 && q.y >= vb.y0 && q.y <= vb.y1;
  assert.ok(!onVanBlock(boss.pos), `บอสไม่ทับรถ ${boss.pos.x},${boss.pos.y}`); // เดินอ้อมรถเข้าหาผู้เล่นได้ (AI ใหม่ 2026-11-14) แต่ไม่พุ่งทะลุ
});

test('FIX มอนถูกล่อเป้า (p.taunt — โล่ของบานาจ) = ไปหาตัวล่อ ไม่ตีคนอื่น', () => {
  setup(2);
  F.begin('ambush');
  fire();
  clearMobs();
  P(0).pos = { x: 5, y: 8 }; P(0).hp = 1; P(0).armor = 0; // เป้าอ่อน ติดตัว
  P(1).pos = { x: 15, y: 1 }; // ตัวล่อ อยู่ไกล
  const m = M.spawn(rt(), 'stray', { x: 5, y: 7 }, { born: 0 });
  m.taunt = { ids: ['p1'], until: match.roundNumber + 5 };
  Math.random = () => 0.99;
  const out = OUT();
  M.actOne(rt(), m, out);
  assert.ok(!out.attacks.some((a) => a.target === 'p0'), 'ไม่ตีคนที่ไม่ใช่ตัวล่อ');
  assert.equal(out.moves.length, 1, 'เดินไปหาตัวล่อ');
});

test('FIX มอนไม่เล็ง/ไม่เดินหาคนที่อยู่อีกชั้นมิติ (D4C)', () => {
  setup(1);
  F.begin('ambush');
  fire();
  clearMobs();
  const p = P(0);
  p.pos = { x: 5, y: 8 };
  p.dim = 'd4c';
  const m = M.spawn(rt(), 'stray', { x: 5, y: 3 }, { born: 0 });
  Math.random = () => 0.99;
  const out = OUT();
  M.actOne(rt(), m, out);
  assert.ok(!out.attacks.some((a) => a.target === p.id), 'ไม่ตีคนอีกมิติ');
  assert.ok(!M.prey(m).includes(p));
  p.dim = null;
});

test('FIX สตั้นมอน 1 เทิร์น: endTurn ไม่ลดสถานะคุมตัวของ rtMob → มอนเสียตาจริง 1 ครั้ง', () => {
  setup(1);
  F.begin('ambush');
  fire();
  clearMobs();
  P(0).pos = { x: 5, y: 8 };
  const m = M.spawn(rt(), 'stray', { x: 5, y: 6 }, { born: 0 });
  m.statuses.stun = 1; // ผู้เล่นสตั้นมอนในตาตัวเอง
  // จบเทิร์น: ส่วนลดสถานะของ endTurn (ไม่ยกเว้น rtMob)
  timers.startPhaseTimer = () => {}; // ไม่ไปต่อ dealRound
  endTurn.endTurn();
  assert.equal(m.statuses.stun, 1, 'สตั้นยังอยู่หลังจบเทิร์น');
  const out = OUT();
  M.actAll(rt(), out);
  assert.equal(out.attacks.length + out.moves.length, 0, 'มอนเสียตา');
  assert.equal(m.statuses.stun, undefined, 'หมดหลังมอนเสียตา');
});

test('FIX กลางคืนบังคับ (Wake Up ของโอโตยะ) มาก่อนกลางวัน/กลางคืนของ Road Trip', () => {
  setup(1);
  rt().night = false;
  match.forcedNight = { from: 1, until: 999 };
  assert.equal(DayNight.forcedNightAt(match.roundNumber + 1), true);
  assert.equal(DayNight.isNightRound(match.roundNumber + 1), true);
  match.forcedNight = null;
});

test('FIX จุดพัก: คูลดาวน์กิจกรรมแยกรายคน', () => {
  setup(2);
  S.enter('gas');
  const claw = (Maps.defs[rt().stop.area].props || []).find((o) => o.kind === 'claw' && o.spot);
  if (!claw) return; // แผนที่นี้ไม่มีตู้คีบ
  P(0).gold = 20; P(1).gold = 20;
  Math.random = () => 0.99;
  assert.equal(S.act(P(0), claw.id), true);
  assert.equal(S.act(P(1), claw.id), true, 'คนที่สองเล่นต่อได้ทันที');
  assert.equal(S.act(P(0), claw.id), false, 'คนแรกใช้ซ้ำไม่ได้');
  assert.ok(RT.publicInfo('p0').stop.acts[claw.id].used);
});

// QA รอบ 2 (2026-11-14 · scripts/rt-sim.js หลายเครื่อง): จุดพักไม่มีตาเดิน — ของที่ผูกกับ action.canAct ต้องใช้ได้ทุกคนพร้อมกัน
test('FIX จุดพัก: ให้/แลก/ทิ้งของ ได้นอกตาเดิน (ทุกคนพร้อมกัน) · ช่วงขับทิ้งได้ · ไม่ติดกันให้ไม่ได้', () => {
  const shop = require('../server/shop.js');
  setup(2);
  S.enter('gas');
  assert.equal(match.gameState, 'ROADTRIP');
  const a = P(0), b = P(1);
  a.pos = { x: 10, y: 13 }; b.pos = { x: 11, y: 13 };
  if (!S.reachOf(a).size) return;
  a.inventory = [{ uid: 'a1', type: 'armor', value: 2 }, { uid: 'a2', type: 'rtFish' }];
  b.inventory = [{ uid: 'b1', type: 'cleanse' }];
  assert.equal(shop.giveItem('p0', 'a1', 'p1'), true, 'ให้ของเพื่อนที่ยืนติดกัน');
  assert.ok(b.inventory.some((it) => it.uid === 'a1'));
  assert.equal(shop.swapItem('p1', 'b1', 'p0', 'a2'), true, 'แลกของ');
  assert.ok(a.inventory.some((it) => it.uid === 'b1') && b.inventory.some((it) => it.uid === 'a2'));
  assert.equal(shop.dropItem('p0', 'b1'), true, 'ทิ้งของ');
  assert.equal(a.inventory.length, 0);
  b.pos = { x: 14, y: 13 };
  assert.equal(shop.giveItem('p1', 'a1', 'p0'), false, 'ไม่ได้ยืนติดกัน');
  S.leave();
  assert.equal(rt().phase, 'drive');
  assert.equal(shop.dropItem('p1', 'a1'), true, 'ช่วงขับทิ้งได้');
  assert.equal(shop.giveItem('p1', 'a2', 'p0'), false, 'ช่วงขับ (ไม่มีตำแหน่ง/ไม่ใช่จุดพัก) ให้ไม่ได้');
});

test('FIX วิทยุ: คิว YouTube รับรูปแบบที่ client ส่ง ({ id, list, start }) — เดิมเพลงที่เข้าคิวหายเงียบ', () => {
  setup(1);
  const q = [{ id: 'dQw4w9WgXcQ', list: null, start: 12 }, { id: null, list: 'PL1234567890abc', start: 0 }, { id: 'bad', list: null }, 'aaaaaaaaaaa', { id: 'x"><script' }];
  assert.equal(RT.command('p0', 'radio', { src: 'yt', yt: { id: 'bbbbbbbbbbb', queue: q } }), true);
  const got = RT.publicInfo('p0').radio.yt.queue;
  assert.deepEqual(got, [{ id: 'dQw4w9WgXcQ', list: null, start: 12 }, { id: null, list: 'PL1234567890abc', start: 0 }, { id: 'aaaaaaaaaaa', list: null, start: 0 }]);
  // ข้ามเพลง (radio.js next): หัวคิวกลายเป็นเพลงที่เล่น
  const [h, ...rest] = got;
  assert.equal(RT.command('p0', 'radio', { src: 'yt', yt: { id: h.id, list: h.list, start: h.start, queue: rest } }), true);
  assert.equal(rt().radio.yt.id, 'dQw4w9WgXcQ');
  assert.equal(rt().radio.yt.queue.length, 2);
});

test('FIX มอน Road Trip (rtmob) ไม่ซ่อนในพุ่ม/ม่านควัน — แบบมอน Eos (visibility.hiddenFrom)', () => {
  const Vis = require('../server/visibility.js');
  setup(1);
  F.begin('ambush');
  fire();
  clearMobs();
  const m = M.spawn(rt(), 'stray', { x: 2, y: 2 }, { born: 0 });
  P(0).pos = { x: 15, y: 9 };
  match.board.smoke = { '2,2': 3 }; // ม่านควัน (คริซุงุ) = ซ่อนตัวแบบพุ่ม
  try {
    assert.equal(Vis.inBush(m), true, 'ยืนในม่านควัน');
    assert.equal(Vis.hiddenFrom(P(0), m), false, 'ผู้เล่นยังเห็นมอน');
  } finally { delete match.board.smoke; }
});

// QA รอบ 3 (2026-11-14 · จำลองการต่อสู้จนจบจริงหลายร้อยครั้ง): บอสโดนัทฆ่าคน = server ล้ม · ประตูท้ายตอนดักทาง · สมดุลบอสเล่นคนเดียว
test('FIX บอสแม็กซ์: โดนัทฉลองแชมป์ฆ่าผู้เล่น (pos = null) ไม่ทำให้ตามอนพัง', () => {
  setup(2);
  F.begin('boss');
  fire();
  clearMobs();
  const a = P(0), b = P(1);
  a.pos = { x: 5, y: 3 }; a.hp = 1; a.armor = 0;
  b.pos = { x: 15, y: 9 };
  const boss = M.spawn(rt(), 'devilTruck', { x: 5, y: 2 }, { born: 0 });
  const map = require('../server/phases/action.js').boardMap();
  rt().combat.warn = { by: boss.id, move: 'celebrate', dir: null, tiles: M.moveTiles(map, null, boss, 'celebrate', [1, 0]) };
  Math.random = () => 0.99; // ไม่หลบ
  assert.doesNotThrow(() => M.actOne(rt(), boss, OUT()));
  assert.equal(a.alive, false, 'โดนโดนัทล้ม');
});

test('FIX ประตูท้าย: ดักทาง/บอส (รถจอด) มีปุ่มเมื่อยืนช่องหลังรถในตาตัวเอง', () => {
  setup(1);
  F.begin('ambush');
  fire();
  const p = P(0), d = Maps.defs[Maps.RT_ROAD];
  p.pos = { x: d.rearTiles[0][0], y: d.rearTiles[0][1] };
  match.gameState = 'ACTION'; match.actorId = 'p0'; match.action = { locked: false, moved: false, from: { ...p.pos } };
  assert.ok(F.actionsOf().p0.includes('rear')); // ช่องหลังรถติดรถตู้ = มีป้อมปืนด้วย
  assert.equal(F.toggleRear(p), true);
  assert.equal(rt().van.rearOpen, true);
  p.pos = { x: 15, y: 9 };
  assert.ok(!(F.actionsOf().p0 || []).includes('rear'), 'ไม่ได้ยืนหลังรถ = ไม่มีปุ่ม');
});

test('สมดุล QA: บอสตัวแรก เล่นคนเดียว (ปกติ) เลือด ≤ 14 เกราะ ≤ 2 พลังโจมตี ≤ 2 · ทีมใหญ่ยังถึกตามจำนวนคน · ลูกน้องบอสไม่เพิ่มทุกคน', () => {
  const st = (diff, heroes, tier = 0, type = 'devilTruck') => M.scale({ km: 50, diff, region: { loop: 0 } }, M.ROSTER[type], { heroes, tier });
  for (const type of M.BOSSES) {
    const s = st('normal', 1, 0, type);
    assert.ok(s.hp <= 15 && s.armor <= 2 && s.atk <= 2, `${type} ${JSON.stringify(s)}`);
  }
  assert.ok(st('easy', 1).atk < st('normal', 1).atk || st('easy', 1).atk === 1);
  assert.ok(st('normal', 6).hp >= st('normal', 1).hp * 4);
  assert.ok(st('normal', 4).atk > st('normal', 1).atk);
  const ws = (heroes) => M.waveSize({ km: 150, diff: 'normal', region: { loop: 0 } }, 'boss', heroes);
  assert.equal(ws(1), 1);
  assert.ok(ws(4) <= 2 && ws(6) <= 3);
});

// QA จุดพัก รอบ 3 (2026-11-14 · เล่นจริง 2 เครื่องในเบราว์เซอร์ + socket) — ปั๊ม/โมเต็ลเดินอิสระ
const enterGas = (area) => { process.env.ECHO_DEV_RT_AREA = String(area); try { S.enter('gas'); } finally { delete process.env.ECHO_DEV_RT_AREA; } };
const propOf = (kind, extra = () => true) => (Maps.defs[rt().stop.area].props || []).find((o) => o.kind === kind && o.spot && extra(o));
const fxSince = (n) => rt().fx.slice(n);

test('FIX จุดพัก: ชิงช้าสวรรค์ไม่ไหลไปกิจกรรมอื่น (จ่ายครั้งเดียวทั้งทีม · คนที่สองไม่เสียเงิน)', () => {
  setup(2);
  enterGas(72);
  const f = propOf('ferris');
  P(0).gold = 10; P(1).gold = 10;
  assert.equal(S.act(P(0), f.id), true);
  assert.equal(P(0).gold, 9);
  assert.equal(rt().reveal, true, 'เห็นทางแยกข้างหน้า');
  const n = rt().fx.length;
  assert.equal(S.act(P(1), f.id), false, 'ทีมเห็นแล้ว = ไม่ต้องขึ้นซ้ำ');
  assert.equal(P(1).gold, 10, 'ไม่เสียเงิน');
  assert.ok(fxSince(n).some((e) => e.k === 'actFail' && e.id === 'p1' && e.why === 'used'));
});

test('FIX จุดพัก: กิจกรรมที่ทำไม่ได้ = fx actFail พร้อมเหตุผล (เงินไม่พอ / เต็มแล้ว / ใช้แล้ว) · ไม่เสียอะไร', () => {
  setup(1);
  enterGas(72);
  const a = P(0), pump = propOf('pump'), claw = propOf('claw');
  a.gold = 0;
  let n = rt().fx.length;
  assert.equal(S.act(a, claw.id), false);
  assert.ok(fxSince(n).some((e) => e.k === 'actFail' && e.why === 'gold'), 'เงินไม่พอ');
  assert.ok(!(rt().stop.used.p0 || {})[claw.id], 'ไม่นับว่าเล่นแล้ว');
  a.gold = 10; rt().van.fuel = rt().van.fuelMax;
  n = rt().fx.length;
  assert.equal(S.act(a, pump.id), false);
  assert.ok(fxSince(n).some((e) => e.k === 'actFail' && e.why === 'full'), 'ถังเต็ม');
  assert.equal(a.gold, 10);
  Math.random = () => 0.99;
  assert.equal(S.act(a, claw.id), true);
  rt().stop.cd = {}; // พ้นคูลดาวน์ 1.5 วิ
  n = rt().fx.length;
  assert.equal(S.act(a, claw.id), false);
  assert.ok(fxSince(n).some((e) => e.k === 'actFail' && e.why === 'used'), 'เล่นไปแล้ว');
});

test('FIX จุดพัก: fx act บอกผลจริง (เหรียญที่เปลี่ยน · บัฟที่ได้) ให้ client ลอยป้าย', () => {
  setup(1);
  enterGas(72);
  const a = P(0);
  a.gold = 10;
  const n = rt().fx.length;
  assert.equal(S.act(a, propOf('arcade').id), true);
  const e = fxSince(n).find((x) => x.k === 'act');
  assert.equal(e.dg, -1);
  assert.deepEqual(e.buffs.map((b) => [b.key, b.amt, b.name]), [['might', 1, 'เสริมพลัง']]);
});

test('FIX อู่: กดตัวอาคาร = เปิดหน้าอู่เฉยๆ ไม่หักเงินซ่อม · ซ่อมด้วย rt:upg { key: "repair" } (ยืนใกล้อู่) · ราคาซ่อมอยู่ใน state', () => {
  setup(1);
  enterGas(72);
  const a = P(0), g = propOf('garage');
  a.gold = 50; rt().van.hp = 10;
  let n = rt().fx.length;
  assert.equal(S.act(a, g.id), true);
  assert.equal(a.gold, 50, 'ไม่หักเงิน');
  assert.equal(rt().van.hp, 10);
  assert.equal(fxSince(n).filter((e) => e.k === 'garage' && e.pid === 'p0').length, 1, 'เปิดหน้าอู่ครั้งเดียว (เดิมซ้ำ 2)');
  assert.equal(RT.publicInfo('p0').van.prices.repair, 4, 'ค่าซ่อมเต็ม 10 HP = 4 เหรียญ (ปกติ 3 HP/เหรียญ)');
  n = rt().fx.length;
  assert.equal(RT.command('p0', 'upg', { key: 'repair' }), true);
  assert.equal(rt().van.hp, rt().van.hpMax);
  assert.equal(a.gold, 46);
  assert.ok(fxSince(n).some((e) => e.k === 'act' && e.kind === 'garage' && e.dg === -4));
  assert.equal(RT.publicInfo('p0').van.prices.repair, null, 'รถเต็ม');
  assert.equal(RT.command('p0', 'upg', { key: 'repair' }), false, 'เต็มแล้วซ่อมไม่ได้');
  rt().van.hp = 10;
  a.pos = { x: 0, y: 13 };
  assert.equal(RT.command('p0', 'upg', { key: 'repair' }), false, 'ไกลอู่ซ่อมไม่ได้');
});

test('FIX อู่: หน้าอู่เด้งเฉพาะตอนเพิ่งเดินมาติดอู่ (เดินเลียบอู่ไม่เด้งซ้ำทุกก้าว)', () => {
  setup(1);
  enterGas(72);
  const a = P(0), g = propOf('garage');
  S.walk(a, g.spot[0], g.spot[1]);
  const n = rt().fx.length;
  const side = [[g.spot[0] + 1, g.spot[1]], [g.spot[0] - 1, g.spot[1]]].find(([x, y]) => S.reachOf(a).get(Board.key(x, y)) && y === g.y1 + 1);
  assert.ok(side, 'มีช่องเลียบอู่');
  assert.equal(S.walk(a, side[0], side[1]), true);
  assert.ok(!fxSince(n).some((e) => e.k === 'garage'), 'ไม่เด้งซ้ำ');
});

test('FIX ตลาดนัดปั๊ม: แผงอาหารกดได้จริง (ของกิน +2 พลังชีวิต · น้ำ +1 เกราะ · เต็ม = ไม่เสียเงิน)', () => {
  const combat = require('../server/combat.js');
  setup(1);
  enterGas(74);
  const a = P(0);
  a.gold = 10;
  const food = propOf('stall', (o) => o.style !== 'drinks'), drink = propOf('stall', (o) => o.style === 'drinks');
  a.hp = combat.maxHpOf(a);
  assert.equal(S.act(a, food.id), false, 'เลือดเต็ม');
  assert.equal(a.gold, 10);
  a.hp = 3;
  assert.equal(S.act(a, food.id), true);
  assert.equal(a.hp, 5); assert.equal(a.gold, 9);
  a.armor = 0;
  assert.equal(S.act(a, drink.id), true);
  assert.equal(a.armor, 1); assert.equal(a.gold, 8);
});

test('FIX โมเต็ล: ห้องพักล้างสถานะผิดปกติด้วย (เข้าโมเต็ลเลือดเต็มอยู่แล้ว — เดิมห้องพักไม่มีประโยชน์)', () => {
  setup(1);
  S.enter('motel');
  const a = P(0), room = propOf('motel', (o) => o.style !== 'office');
  assert.equal(S.act(a, room.id), false, 'ไม่มีอะไรให้ฟื้น = ไม่นับว่าใช้');
  a.statuses.poison = 2; a.statuses.slow = 1;
  assert.equal(S.act(a, room.id), true);
  assert.ok(!a.statuses.poison && !a.statuses.slow);
  const pool = propOf('pool');
  assert.ok(RT.publicInfo('p0').stop.acts[pool.id], 'สระมีกิจกรรม (เดิมกดได้แต่ไม่มีอะไรเกิด)');
  assert.equal(S.act(a, pool.id), true);
  assert.ok(rt().buffs.p0.some((b) => b.key === 'evade'));
});

test('FIX จุดพัก: ยาล้างสถานะ (rt:use) ลดสถานะที่เลือก 1 ขั้นแบบตอนสู้ (เดิมล้างหมดทุกอย่าง)', () => {
  setup(1);
  enterGas(72);
  const a = P(0);
  a.statuses.poison = 2; a.statuses.slow = 1;
  a.inventory = [{ uid: 'c1', type: 'cleanse' }];
  assert.equal(RT.command('p0', 'use', { uid: 'c1', status: 'poison' }), true);
  assert.equal(a.statuses.poison, 1);
  assert.equal(a.statuses.slow, 1);
  assert.equal(a.inventory.length, 0);
});

test('FIX ร้านจุดพัก: ไม่มีเวลานับเทิร์น (หน้าร้านเคยขึ้น "เหลือ 6 เทิร์น")', () => {
  const shop = require('../server/shop.js');
  setup(1);
  enterGas(72);
  const s = shop.publicShops().find((x) => x.kind === 'rtmart');
  assert.ok(s && s.building);
  assert.equal(s.turnsLeft, 0);
});

test('FIX จุดพัก: วัตถุทุกชิ้นที่มีช่องยืน (spot) กดเล่นได้จริง — ไม่มีของที่กดแล้วเงียบ (แผงตลาดนัด/สระ)', () => {
  for (const area of [...Maps.RT_GAS, Maps.RT_MOTEL]) {
    for (const o of Maps.defs[area].props) if (o.spot && !o.walk) assert.ok(S.ACT_KINDS.has(o.kind), `${area} ${o.id} (${o.kind}) มี spot แต่ไม่มีกิจกรรม`);
  }
});

test('FIX ภาพไม่วาร์ป: ถนนเลื่อน/รถชน/ป้อมปืนอัตโนมัติ/หมาลูกทีม อยู่ในลำดับฉาก mobTurn.seq', () => {
  setup(1);
  rt().van.upg.turret = 2;
  rt().dog.on = true;
  F.begin('onvan');
  fire();
  clearMobs();
  const m = M.spawn(rt(), 'stray', { x: 4, y: 2 }, { born: 0 });
  m.summon.acted = true;
  const ram = M.spawn(rt(), 'giant', { x: 14, y: 5 }, { born: 0 }); // หน้ารถ: ถนนเลื่อนพาเข้าหน้ารถ = ถูกชน
  ram.summon.acted = true;
  Math.random = () => 0.99;
  match.roundNumber += 1; // เทิร์น 2 (ถนนเริ่มเลื่อน)
  F.preRound(() => {});
  const turn = [...rt().fx].reverse().find((f) => f.k === 'mobTurn');
  assert.ok(turn && Array.isArray(turn.seq));
  const kinds = new Set(turn.seq.map((e) => e.k));
  assert.ok(kinds.has('scroll'), 'ถนนเลื่อน');
  assert.ok(turn.seq.find((e) => e.k === 'scroll').list.some((s) => s.id === m.id), 'มอนไถลถอยหลังแบบมีภาพ');
  assert.ok(kinds.has('ram'), 'รถชนมอนหน้ารถ');
  assert.ok(kinds.has('turretShot'), 'ป้อมปืนยิงอัตโนมัติ');
  const dog = Object.values(match.players).find((p) => p.summon && p.summon.rtDog);
  if (dog) assert.ok(turn.seq.some((e) => e.id === dog.id), 'หมาลูกทีมเดิน/กัดในลำดับฉาก');
});

test('บัฟสู้บนรถตู้ 2026-11-14: รอด 3 + กม./100 (≤ 5) · หลังคาร่วง 15% · ตัวล่าข้างรถที่ยังตีใครไม่ถึงกระโดดขึ้นรถ', () => {
  setup(1);
  rt().km = 0;
  F.begin('onvan');
  fire();
  assert.equal(rt().combat.rounds, 3);
  assert.equal(F.ROOF_FALL, 0.15);
  clearMobs();
  const p = P(0);
  p.pos = { x: 12, y: 5 }; // กลางรถ (ไม่ติดขอบ)
  const m = M.spawn(rt(), 'stray', { x: 10, y: 3 }, { born: 0 }); // ติดข้างรถ (แถวบน) ยังตีใครไม่ถึง
  m.summon.role = 'hunter';
  Math.random = () => 0.99;
  const out = OUT();
  assert.equal(M.boardVan(rt(), m, M.prey(m), out), true);
  assert.ok(out.seq.some((e) => e.k === 'mobMove' && e.id === m.id), 'กระโดดมีภาพ (ไม่วาร์ป)');
  const van = new Set(Maps.defs[Maps.RT_ONVAN].vanTiles.map(([x, y]) => x + ',' + y));
  assert.ok(van.has(m.pos.x + ',' + m.pos.y), `ขึ้นรถ ${m.pos.x},${m.pos.y}`);
  rt().km = 500;
  F.begin('onvan');
  fire();
  assert.equal(rt().combat.rounds, 5);
});

test('ป้อมปืนมือตอนรถจอด (ดักทาง/อีลิท/บอส — ผู้ใช้ตัดสิน 2026-11-14): ยืนติดรถตู้ ยิงได้ตาละครั้ง · 2 + ขั้น · ระยะ 5 จากขอบรถ · หลบได้', () => {
  for (const kind of ['ambush', 'boss']) {
    setup(1);
    F.begin(kind);
    fire();
    clearMobs();
    const p = P(0), vb = Maps.defs[Maps.RT_ROAD].vanBlock;
    const turn = () => { match.gameState = 'ACTION'; match.actorId = 'p0'; match.action = { locked: false, moved: false, from: { ...p.pos } }; };
    p.pos = { x: 15, y: 9 }; turn(); // ไม่ติดรถ
    const tg = M.spawn(rt(), 'giant', { x: vb.x1 + 4, y: vb.y0 }, { born: 99 }); // ห่างขอบรถ 4
    const far = M.spawn(rt(), 'giant', { x: 0, y: 9 }, { born: 99 });
    assert.ok(!(F.actionsOf().p0 || []).includes('turret'), `${kind}: ไม่ติดรถ = ไม่มีปุ่ม`);
    assert.equal(RT.command('p0', 'turret', { x: tg.pos.x, y: tg.pos.y }), false);
    p.pos = { x: vb.x0 + 1, y: vb.y1 + 1 }; turn(); // ติดรถด้านล่าง
    assert.ok(F.actionsOf().p0.includes('turret'), `${kind}: ติดรถ = มีปุ่ม`);
    Math.random = () => 0.99;
    assert.equal(RT.command('p0', 'turret', { x: far.pos.x, y: far.pos.y }), false, 'ไกลเกิน 5');
    const h0 = tg.hp + tg.armor;
    assert.equal(RT.command('p0', 'turret', { x: tg.pos.x, y: tg.pos.y }), true);
    assert.equal(h0 - (tg.hp + tg.armor), 2, 'ขั้น 0 = 2');
    assert.equal(RT.command('p0', 'turret', { x: tg.pos.x, y: tg.pos.y }), false, 'ตาละครั้ง');
    assert.ok(!(F.actionsOf().p0 || []).includes('turret'));
    assert.ok(rt().fx.some((f) => f.k === 'turretShot' && f.id === 'p0'));
    assert.equal(RT.publicInfo('p0').combat.turretRange, 5);
  }
});

// QA จุดพัก รอบ 4 (2026-11-14 · ผู้ใช้แจ้ง): ระบบคู่คุมตัวที่สองนอกตาเดิน · หน้าต่างส่วนตัวไม่เด้งให้ทุกคน
test('FIX ระบบคู่ที่จุดพัก: เอมิลิโกะเดิน/เล่นกิจกรรม/เปิดอู่/อัปเกรด/ซื้อของ/ใช้ไอเทมได้ด้วย unitId (เฉพาะตัวของตัวเอง)', () => {
  const shop = require('../server/shop.js');
  const combat = require('../server/combat.js');
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  engine.players.p0 = { id: 'p0', name: 'K', position: 1, characterId: 'kate', alive: true, connected: true, cards: [], statuses: {}, statusAmt: {}, seen: {}, inventory: [], teamId: 'A', teamConfirmed: true };
  engine.players.p1 = { id: 'p1', name: 'M', position: 2, characterId: 'muimi', alive: true, connected: true, cards: [], statuses: {}, statusAmt: {}, seen: {}, inventory: [], teamId: 'A', teamConfirmed: true };
  engine.setGameMode('roadtrip'); match.world = 'roadtrip'; match.rtDiff = 'normal';
  engine.startMatch(); D.stopTick();
  enterGas(72);
  const kate = P(0), emi = match.players['p0~duo'];
  assert.ok(emi && emi.pos, 'เอมิลิโกะอยู่บนกระดานจุดพัก');
  const k0 = { ...kate.pos };
  const reach = [...S.reachOf(emi).values()].find((n) => n.x !== emi.pos.x || n.y !== emi.pos.y);
  assert.equal(RT.command('p0', 'walk', { x: reach.x, y: reach.y, unitId: 'p0~duo' }), true, 'เอมิลิโกะเดิน');
  assert.deepEqual(emi.pos, { x: reach.x, y: reach.y });
  assert.deepEqual(kate.pos, k0, 'เคทอยู่ที่เดิม');
  assert.equal(RT.command('p1', 'walk', { x: k0.x, y: k0.y + 0, unitId: 'p0~duo' }), false, 'คุมตัวของคนอื่นไม่ได้');
  // กิจกรรม + อู่ (fx ใส่ id ตัวที่ทำ)
  kate.gold = 30;
  let n = rt().fx.length;
  assert.equal(RT.command('p0', 'act', { id: propOf('arcade').id, unitId: 'p0~duo' }), true);
  assert.ok(fxSince(n).some((e) => e.k === 'act' && e.id === 'p0~duo'));
  assert.ok(rt().buffs['p0~duo'].length, 'บัฟสู้ครั้งหน้าเป็นของเอมิลิโกะ');
  n = rt().fx.length;
  assert.equal(RT.command('p0', 'act', { id: propOf('garage').id, unitId: 'p0~duo' }), true);
  assert.ok(fxSince(n).some((e) => e.k === 'garage' && e.pid === 'p0~duo'));
  kate.pos = { x: 0, y: 13 }; // เคทไกลอู่ — เอมิลิโกะยืนติด
  assert.equal(RT.command('p0', 'upg', { key: 'body' }), false, 'เคทไกลอู่');
  assert.equal(RT.command('p0', 'upg', { key: 'body', unitId: 'p0~duo' }), true, 'เอมิลิโกะยืนติดอู่ อัปเกรดได้');
  // ร้าน: เอมิลิโกะยืนติดมินิมาร์ท เคทอยู่ไกล
  const mart = propOf('mart');
  assert.equal(RT.command('p0', 'act', { id: mart.id, unitId: 'p0~duo' }), true);
  const s = shop.publicShops().find((x) => x.kind === 'rtmart');
  const it = s.items.find((x) => x.type === 'rtFish');
  shop.buyShopItem('p0', s.id, it.id);
  assert.ok(kate.inventory.some((x) => x.type === 'rtFish'), 'ซื้อได้ (กระเป๋าใช้ร่วม)');
  // ไอเทม: ปลาย่างเข้าตัวเอมิลิโกะ
  emi.hp = 1;
  const uid = kate.inventory.find((x) => x.type === 'rtFish').uid;
  assert.equal(RT.command('p0', 'use', { uid, unitId: 'p0~duo' }), true);
  assert.equal(emi.hp, Math.min(combat.maxHpOf(emi), 4));
});

test('FIX หน้าอู่/หน้าร้านเด้งเฉพาะเครื่องที่กด (client roadtrip/rtMine.js — รวมตัวที่สองของระบบคู่)', async () => {
  const { rtOwnIds, rtMyPopups } = await import('../client/src/roadtrip/rtMine.js');
  const players = [{ id: 'a' }, { id: 'b' }, { id: 'b~duo', duoOf: 'b' }];
  const fx = [{ k: 'garage', key: 1, pid: 'a' }, { k: 'shop', key: 2, pid: 'a', shopId: 'rtmart' }, { k: 'garage', key: 3, pid: 'b~duo' }, { k: 'walk', key: 4, id: 'b' }];
  const seenB = new Set();
  assert.deepEqual(rtMyPopups(fx, rtOwnIds(players, 'b'), seenB), [{ k: 'garage' }], 'B เห็นแค่อู่ที่ตัวที่สองของตัวเองเปิด');
  assert.deepEqual(rtMyPopups(fx, rtOwnIds(players, 'b'), seenB), [], 'ไม่เด้งซ้ำ');
  assert.deepEqual(rtMyPopups(fx, rtOwnIds(players, 'a'), new Set()), [{ k: 'garage' }, { k: 'shop', shopId: 'rtmart' }]);
  assert.deepEqual(rtMyPopups([{ k: 'garage', key: 9 }], rtOwnIds(players, 'a'), new Set()), [], 'ไม่มี pid = ไม่เด้งให้ใคร');
});

test('FIX คนขับไม่หลุดที่นั่ง: กลับมาขับหลังปั๊ม/สู้ = นับไม่ขยับใหม่ · rt:alive ต่อเวลา · AFK 20 วิ ยังหลุด', () => {
  setup(2);
  RT.command('p0', 'seat', { seat: 'driver' });
  assert.equal(rt().van.driverId, 'p0');
  rt().driverActAt = Date.now() - 120000; // ค้างจากก่อนเข้าปั๊ม
  S.enter('gas');
  RT.toDrive ? RT.toDrive() : require('../server/roadtrip').toDrive();
  D.step(250, Date.now() + 250);
  assert.equal(rt().van.driverId, 'p0', 'กลับมาขับแล้วไม่หลุดทันที');
  rt().driverActAt = Date.now() - 15000;
  assert.equal(RT.command('p0', 'alive', {}), false); // ไม่ broadcast
  D.step(250, Date.now() + 10000);
  assert.equal(rt().van.driverId, 'p0', 'ส่ง alive = ยังขับอยู่');
  rt().driverActAt = Date.now() - 25000;
  D.step(250, Date.now() + 250);
  assert.equal(rt().van.driverId, null, 'AFK เกิน 20 วิ = ที่นั่งว่าง');
});

test('กิจกรรมบนรถตอนขับ: ของทุกชิ้น (25 รวมกล่องรถ) ใช้ได้จริง · สถานะเปลี่ยน · fx vanProp · ช่องอยู่ในรถ/ดาดฟ้า', () => {
  const VW = require('../server/roadtrip/vanwalk.js');
  setup(1);
  const d = Maps.defs[Maps.RT_ONVAN];
  const inside = new Set(d.vanTiles.map(([x, y]) => `${x},${y}`)), roof = new Set(d.roofTiles.map(([x, y]) => `${x},${y}`));
  const keys = Object.keys(d.vanProps);
  assert.equal(keys.length, 25);
  for (const key of keys) {
    const [x, y, r] = d.vanProps[key];
    assert.ok((r ? roof : inside).has(`${x},${y}`), `${key} อยู่บนช่องที่ยืนได้`);
    rt().vanBusy = {};
    rt().vanPos.p0 = { x, y, roof: !!r };
    const before = JSON.stringify(rt().vanProps[key].state);
    const k0 = Math.max(0, ...rt().fx.map((f) => f.key || 0));
    assert.equal(RT.command('p0', 'vanProp', { prop: key }), true, `${key} กดได้`);
    const after = JSON.stringify(rt().vanProps[key].state);
    assert.notEqual(after, before, `${key} สถานะเปลี่ยน`);
    assert.ok(rt().fx.some((f) => f.key > k0 && f.k === 'vanProp' && f.prop === key), `${key} มี fx`);
    assert.ok(VW.PROP_KIND[key]);
  }
  // ผิดชั้น = ใช้ไม่ได้ทันที (เดินไปเองแล้วค่อยใช้)
  rt().vanBusy = {};
  rt().vanPos.p0 = { x: 12, y: 5, roof: true };
  RT.command('p0', 'vanProp', { prop: 'fridge' });
  assert.notEqual(rt().vanPos.p0.roof, true, 'เดินลงไปหาตู้เย็น');
});

// ---------------------------------------------------------------- กิจกรรมกับเพื่อนในรถ (server/roadtrip/vanfun.js · 2026-11-14)
const VF = require('../server/roadtrip/vanfun.js');
const fun = () => rt().fun;
function vanSetup(n = 2) {
  setup(n);
  VF.stopTick();
  rt().vanBusy = {}; rt().vanPend = {};
  rt().van.driverId = null;
  for (let i = 0; i < n; i++) { P(i).gold = 10; P(i).hp = 10; P(i).armor = 0; }
}
const place = (i, x, y, roof = false) => { rt().vanPos['p' + i] = { x, y, roof }; rt().vanBusy = {}; };
const funCmd = (i, o) => { const r = RT.command('p' + i, 'fun', o); VF.stopTick(); return r; };
function seq(vals, fn) { let k = 0; Math.random = () => vals[k++ % vals.length]; try { return fn(); } finally { Math.random = realRandom; } }

test('วงเต๋า: เปิดวง/เข้าร่วม/ทอย — แต้มสูงสุดกินกอง · เสมอแบ่ง · เงินรวมเท่าเดิม · คนขับ/คนตาย/เงินไม่พอเข้าไม่ได้', () => {
  vanSetup(3);
  place(0, 10, 5); place(1, 9, 5); place(2, 10, 6);
  assert.equal(funCmd(0, { a: 'dice', ante: 5 }), false, 'เดิมพันนอกตาราง');
  assert.equal(funCmd(0, { a: 'dice', ante: 2 }), true);
  assert.equal(P(0).gold, 8);
  assert.equal(funCmd(0, { a: 'dice', ante: 2 }), false, 'เปิดซ้อนไม่ได้');
  assert.equal(funCmd(1, { a: 'diceJoin' }), true);
  assert.equal(funCmd(1, { a: 'diceJoin' }), false, 'เข้าซ้ำไม่ได้');
  rt().van.driverId = 'p2';
  assert.equal(funCmd(2, { a: 'diceJoin' }), false, 'คนขับเข้าไม่ได้');
  rt().van.driverId = null;
  P(2).alive = false;
  assert.equal(funCmd(2, { a: 'diceJoin' }), false, 'คนตายเข้าไม่ได้');
  P(2).alive = true; P(2).gold = 1;
  assert.equal(funCmd(2, { a: 'diceJoin' }), false, 'เงินไม่พอ');
  assert.equal(fun().dice.pot, 4);
  const total0 = P(0).gold + P(1).gold + 4;
  seq([0.99, 0.99, 0, 0], () => VF.tick(Date.now() + 9000));
  const r = fun().dice.result;
  assert.deepEqual(r.win, ['p0']);
  assert.equal(P(0).gold, 12); assert.equal(P(1).gold, 8);
  assert.equal(P(0).gold + P(1).gold, total0, 'เงินไม่งอก/ไม่หาย');
  assert.equal(r.gain.p0, 2); assert.equal(r.gain.p1, -2);
  assert.ok(rt().fx.some((f) => f.k === 'fun' && f.f === 'diceRoll'));
  VF.tick(r.until + 1);
  assert.equal(fun().dice, null, 'ผลโชว์ครบแล้วล้างวง');
  // เสมอ = แบ่งกอง
  P(0).gold = 10; P(1).gold = 10;
  funCmd(0, { a: 'dice', ante: 3 }); funCmd(1, { a: 'diceJoin' });
  seq([0.5], () => VF.tick(Date.now() + 9000));
  assert.deepEqual(fun().dice.result.win.sort(), ['p0', 'p1']);
  assert.equal(P(0).gold, 10); assert.equal(P(1).gold, 10);
});

test('วงเต๋าคนเดียว = เจ้ามือ (ชนะได้ 2 เท่า) · เข้าสู้กลางวง = คืนเงินกองทุกคน', () => {
  vanSetup(2);
  place(0, 10, 5); place(1, 9, 5);
  funCmd(0, { a: 'dice', ante: 3 });
  seq([0.99, 0.99, 0, 0], () => VF.tick(Date.now() + 9000));
  assert.ok(fun().dice.result.house);
  assert.equal(P(0).gold, 13, 'ชนะเจ้ามือ +3');
  VF.tick(Date.now() + 60000);
  P(0).gold = 10; P(1).gold = 10;
  funCmd(0, { a: 'dice', ante: 2 }); funCmd(1, { a: 'diceJoin' });
  assert.equal(P(0).gold + P(1).gold, 16);
  F.begin('ambush');
  assert.equal(fun().dice, null);
  assert.equal(P(0).gold, 10); assert.equal(P(1).gold, 10, 'คืนเงินกองครบ');
  assert.equal(funCmd(0, { a: 'dice', ante: 1 }), false, 'ตอนสู้เปิดวงไม่ได้');
});

test('วงดนตรี: เริ่มที่กีตาร์ · ทุกคน (ไม่ใช่คนขับ) เข้าร่วม · กดตรงจังหวะ = บัฟทีมสู้ครั้งหน้า · ช่วงละครั้ง', () => {
  vanSetup(3);
  place(0, 7, 4); place(1, 12, 5, true); place(2, 13, 6);
  rt().van.driverId = 'p2';
  assert.equal(funCmd(2, { a: 'jam' }), false, 'คนขับเริ่มไม่ได้');
  assert.equal(funCmd(0, { a: 'jam' }), true);
  const j = fun().jam;
  assert.ok(j.chart.length >= 12, 'มีโน้ตพอ');
  assert.deepEqual(VF.chartOf(j.seed), j.chart, 'โน้ตจากเมล็ด (ทุกเครื่องตรงกัน)');
  assert.equal(funCmd(1, { a: 'jamJoin' }), true, 'อยู่บนหลังคาก็เล่นได้');
  assert.equal(funCmd(2, { a: 'jamJoin' }), false, 'คนขับเล่นไม่ได้');
  assert.equal(RT.publicInfo('p0').fun.jamUsed, true);
  for (let i = 0; i < j.chart.length; i++) {
    j.startAt = Date.now() - j.chart[i][0];
    RT.command('p0', 'fun', { a: 'jamHit', i, off: 10 });
    RT.command('p1', 'fun', { a: 'jamHit', i, off: 100 });
  }
  j.startAt = Date.now() - j.chart[0][0];
  RT.command('p0', 'fun', { a: 'jamHit', i: 0, off: 0 }); // กดซ้ำไม่นับ
  RT.command('p1', 'fun', { a: 'jamHit', i: 1, off: 400 }); // ห่างจังหวะเกิน = ไม่นับ
  VF.stopTick();
  const pi = RT.publicInfo('p0').fun.jam;
  assert.equal(pi.ids.p0, j.chart.length, 'เป๊ะทุกโน้ต');
  assert.ok(Math.abs(pi.ids.p1 - j.chart.length * 0.6) < 0.2, 'ดี = 0.6');
  VF.tick(j.endAt + 1);
  const res = fun().jam.result;
  assert.equal(res.tier, 3, `คะแนน ${res.score}`);
  assert.ok(rt().buffs.team.some((b) => b.key === 'might' && b.amt === 1));
  assert.ok(rt().buffs.team.some((b) => b.key === 'evade'));
  VF.tick(res.until + 1);
  assert.equal(fun().jam, null);
  assert.equal(funCmd(0, { a: 'jam' }), false, 'ช่วงขับเดียวกันเล่นซ้ำไม่ได้');
  RT.toDrive(); D.stopTick(); VF.stopTick();
  assert.equal(funCmd(0, { a: 'jam' }), true, 'ช่วงขับใหม่เล่นได้อีก');
  VF.tick(fun().jam.endAt + 1);
  assert.equal(fun().jam.result.tier, 0, 'ไม่กดเลย = ไม่มีบัฟ');
  assert.ok(rt().buffs.team.length >= 2);
  F.begin('ambush');
  assert.deepEqual(rt().buffs, {}, 'สู้แล้วใช้บัฟ');
});

test('ปิ้งย่างบนหลังคา: พลิก/เสิร์ฟตรงจังหวะ = ที่ตามจำนวนคน (+เป๊ะ) · รับคนละที่ ฟื้นเลือด/เกราะ · ปล่อยไหม้ = ไม่ได้อะไร · ช่วงละ 2 ครั้ง', () => {
  vanSetup(3);
  place(0, 11, 4, true); place(1, 9, 4, true); place(2, 10, 5);
  assert.equal(funCmd(0, { a: 'grill' }), true);
  assert.equal(rt().vanProps.grill.state, 'on');
  assert.equal(funCmd(1, { a: 'grillJoin' }), true);
  assert.equal(funCmd(1, { a: 'grillFlip' }), false, 'คนย่างเท่านั้นที่พลิก');
  const g = fun().grill;
  const mid = (VF.FUN.grill.win[0] + VF.FUN.grill.win[1]) / 2;
  g.t0 = Date.now() - mid * g.len;
  assert.equal(funCmd(0, { a: 'grillFlip' }), true);
  assert.equal(g.stage, 1); assert.equal(g.marks[0], 'perfect');
  g.t0 = Date.now() - 0.65 * g.len;
  assert.equal(funCmd(0, { a: 'grillFlip' }), true);
  assert.equal(g.state, 'served');
  assert.equal(g.portions, 3, '2 คน + เป๊ะ 1');
  P(0).hp = 3;
  assert.equal(funCmd(0, { a: 'grillTake' }), true);
  assert.equal(P(0).hp, 3 + VF.FUN.grill.heal);
  assert.equal(funCmd(0, { a: 'grillTake' }), false, 'คนละที่');
  const combat = require('../server/combat.js');
  P(1).hp = combat.maxHpOf(P(1)); P(1).armor = 0;
  assert.equal(funCmd(1, { a: 'grillTake' }), true);
  assert.equal(P(1).armor, 1, 'เลือดเต็ม = เกราะ +1');
  assert.equal(g.portions, 1);
  VF.tick(g.until + 1);
  assert.equal(fun().grill, null);
  assert.equal(funCmd(0, { a: 'grill' }), true);
  const g2 = fun().grill;
  VF.tick(g2.t0 + g2.len + 500);
  assert.equal(g2.state, 'burnt'); assert.equal(g2.portions, 0);
  assert.equal(rt().vanProps.grill.state, 'off');
  VF.tick(g2.until + 1);
  assert.equal(funCmd(0, { a: 'grill' }), false, 'ช่วงละ 2 ครั้ง');
  RT.toDrive(); D.stopTick(); VF.stopTick();
  funCmd(0, { a: 'grill' });
  const g3 = fun().grill;
  g3.t0 = Date.now() - 0.1 * g3.len; funCmd(0, { a: 'grillFlip' });
  assert.equal(g3.marks[0], 'raw');
  g3.t0 = Date.now() - 0.62 * g3.len; funCmd(0, { a: 'grillFlip' });
  assert.equal(g3.state, 'burnt', 'คนเดียว −1 = ไม่เหลือ');
});

test('ผู้ส่องทาง: เห็นกล่องข้างทางคนเดียว · ปักหมุด = คนขับเห็นเลน · เข้าเลนทัน = ทุกคนได้เหรียญ · พลาด = ไม่ได้', () => {
  vanSetup(2);
  place(0, 12, 5, true); place(1, 13, 6);
  rt().van.driverId = 'p1';
  assert.equal(funCmd(1, { a: 'spot' }), false, 'คนขับส่องไม่ได้');
  assert.equal(funCmd(0, { a: 'spot' }), true);
  assert.deepEqual(RT.publicInfo('p0').fun.spot, ['p0']);
  VF.tick(Date.now() + VF.FUN.spot.firstMs + 10);
  assert.equal(fun().loot.length, 1);
  const l = fun().loot[0];
  assert.equal(RT.publicInfo('p0').fun.loot.length, 1, 'ผู้ส่องเห็น');
  assert.equal(RT.publicInfo('p0').fun.loot[0].hidden, false);
  assert.equal(RT.publicInfo('p1').fun.loot.length, 0, 'คนอื่นไม่เห็น');
  assert.equal(funCmd(1, { a: 'mark', id: l.id }), false, 'ไม่ใช่ผู้ส่อง');
  assert.equal(funCmd(0, { a: 'mark', id: l.id }), true);
  const seen = RT.publicInfo('p1').fun.loot;
  assert.equal(seen.length, 1); assert.equal(seen[0].hidden, true, 'เห็นแต่หมุดเลน'); assert.equal(seen[0].lane, l.lane); assert.equal(seen[0].kind, null);
  rt().van.lane = l.lane;
  l.kind = 'coin';
  const g0 = P(0).gold, g1 = P(1).gold;
  VF.tick(l.at + 1);
  assert.equal(P(0).gold, g0 + VF.FUN.spot.coin); assert.equal(P(1).gold, g1 + VF.FUN.spot.coin);
  assert.equal(fun().loot.length, 0);
  fun().lootNextAt = 0;
  VF.tick(Date.now());
  const l2 = fun().loot[0];
  rt().van.lane = l2.lane === 1 ? 0 : 1;
  VF.tick(l2.at + 1);
  assert.equal(P(0).gold, g0 + VF.FUN.spot.coin, 'พลาดไม่ได้อะไร');
  assert.ok(rt().fx.some((f) => f.f === 'lootMiss'));
  place(0, 7, 6, true);
  VF.tick(Date.now());
  assert.deepEqual(fun().spot, {}, 'เดินออกจากกล้อง = เลิกส่อง');
});

test('ตู้เย็น: ของมีจำกัด ฟื้นเลือด/ล้างสถานะ · เติมที่ปั๊ม · กล่องเครื่องมือ: ซ่อมรถ (สองคนเร็วขึ้น) + พัก · คนขับซ่อมไม่ได้ · จุดพักยกเลิกทุกวง', () => {
  vanSetup(2);
  place(0, 8, 5); place(1, 10, 6);
  const combat = require('../server/combat.js');
  P(0).hp = combat.maxHpOf(P(0));
  assert.equal(funCmd(0, { a: 'drink' }), false, 'เลือดเต็มไม่มีสถานะ = ไม่ดื่ม');
  P(0).hp = 3;
  assert.equal(funCmd(0, { a: 'drink' }), true);
  assert.equal(P(0).hp, 3 + VF.FUN.fridge.heal);
  assert.equal(fun().fridge, VF.FUN.fridge.stock - 1);
  P(0).hp = combat.maxHpOf(P(0)); P(0).statuses = { stun: 1 };
  if (require('../server/shop.js').cleansableOf(P(0)).length) {
    assert.equal(funCmd(0, { a: 'drink' }), true);
    assert.equal(P(0).statuses.stun, undefined, 'ล้างสถานะ');
  }
  fun().fridge = 0; P(0).hp = 2;
  assert.equal(funCmd(0, { a: 'drink' }), false, 'หมดตู้');
  rt().van.hp = rt().van.hpMax - 3;
  place(0, 9, 5);
  rt().van.driverId = 'p1';
  assert.equal(funCmd(1, { a: 'repair' }), false, 'คนขับซ่อมไม่ได้');
  rt().van.driverId = null;
  assert.equal(funCmd(0, { a: 'repair' }), true);
  assert.equal(funCmd(1, { a: 'repair' }), true);
  const hp0 = rt().van.hp;
  VF.tick(Date.now() + 2600);
  assert.equal(rt().van.hp, hp0 + 1, 'สองคน 2.5 วิ');
  assert.equal(fun().repair, null);
  assert.equal(funCmd(0, { a: 'repair' }), false, 'พัก');
  fun().repairCd = {};
  funCmd(0, { a: 'repair' });
  VF.tick(Date.now() + 2600);
  assert.equal(rt().van.hp, hp0 + 1, 'คนเดียวยังไม่ครบ');
  place(0, 12, 4);
  VF.tick(Date.now() + 3000);
  assert.equal(fun().repair, null, 'เดินออก = เลิกซ่อม');
  assert.equal(rt().van.hp, hp0 + 1);
  place(0, 12, 5, true);
  assert.equal(funCmd(0, { a: 'spot' }), true);
  place(1, 7, 4); assert.equal(funCmd(1, { a: 'jam' }), true);
  S.enter('gas');
  assert.equal(fun().fridge, VF.FUN.fridge.stock);
  assert.equal(fun().jam, null); assert.deepEqual(fun().spot, {});
  assert.equal(funCmd(0, { a: 'drink' }), false, 'จุดพักใช้ไม่ได้');
});

test('กล่องเก็บของกลางของรถ: เก็บ/หยิบได้ทุกคนในทีม · ช่วงเดินทางเท่านั้น · ความจุตามอัปเกรด · ของผูกตัวเก็บไม่ได้', () => {
  const ST = require('../server/roadtrip/stash.js');
  setup(2);
  P(0).inventory = [{ uid: 'a1', type: 'armor', value: 1, price: 3 }, { uid: 'b1', type: 'kebread' }];
  P(1).inventory = [];
  const [sx, sy] = Maps.defs[Maps.RT_ONVAN].vanProps.stash;
  rt().vanPos.p0 = { x: sx, y: sy, roof: false }; rt().vanPos.p1 = { x: sx, y: sy - 1, roof: false }; // ยืนที่กล่อง (ผู้ใช้สั่ง 2026-11-14)
  assert.equal(RT.command('p0', 'stash', { op: 'put', uid: 'a1' }), true);
  assert.equal(P(0).inventory.length, 1);
  assert.equal(RT.publicInfo('p1').van.stash.items.length, 1);
  assert.equal(RT.command('p0', 'stash', { op: 'put', uid: 'b1' }), false, 'ของผูกตัว');
  assert.equal(RT.command('p1', 'stash', { op: 'take', uid: 'a1' }), true, 'เพื่อนหยิบได้');
  assert.equal(P(1).inventory[0].type, 'armor');
  assert.equal(rt().stash.length, 0);
  assert.equal(ST.cap(rt()), ST.STASH_BASE);
  rt().van.upg.storage = 2;
  assert.equal(ST.cap(rt()), ST.STASH_BASE + 2 * require('../server/roadtrip/van.js').statOf(rt().van, 'storage'));
  F.begin('ambush');
  assert.equal(RT.command('p1', 'stash', { op: 'put', uid: P(1).inventory[0].uid }), false, 'ตอนสู้ใช้ไม่ได้');
});
