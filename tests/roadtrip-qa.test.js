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
