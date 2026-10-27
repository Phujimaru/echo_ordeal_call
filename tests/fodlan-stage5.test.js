// โหมด Fodlan ด่าน V หลุมศพศักดิ์สิทธิ์ (server/fodlan/stage5.js · map5.js · GRID_PLAN §8.5)
//  ชีพจรเทพ (บัลลังก์ผู้ให้กำเนิด) · ศิลาตรา (+1 พลังโจมตี → ครบ 3 จบเทิร์นคลั่งเป็นอสูร) · แสงเขียวเรือง (ทุก 3 เทิร์น / ออร่าทุกเทิร์น)
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const match = require('../server/match.js');
const Board = require('../server/board.js');
const Fodlan = require('../server/fodlan.js');
const combat = require('../server/combat.js');
const timers = require('../server/timers.js');

const realRandom = Math.random;
const noWx = () => 0.99; // จบเทิร์นในเทสต์: ไม่สุ่มสภาพอากาศใหม่ (สุ่มทุกเทิร์นจนกว่าจะเกิด — server/fodlan.js onEndTurn)
const realStart = timers.startPhaseTimer;
const AREA = Board.FODLAN_AREA + 4;

function setup(n = 2) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  for (let i = 0; i < n; i++) {
    engine.players['p' + i] = {
      id: 'p' + i, name: 'P' + i, position: i + 1, characterId: 'dummy', alive: true, connected: true,
      cards: [], statuses: {}, statusAmt: {}, seen: {}, inventory: [],
    };
  }
  engine.setGameMode('ffa');
  match.world = 'fodlan';
  Math.random = () => 0.99;
  engine.startMatch();
  Math.random = realRandom;
  engine.clearPhaseTimer();
}
// ไปด่าน V (สุ่ม 0.99 = ด่าน 5 · weather = สภาพอากาศของการมาเยือน)
function toTomb(weather = false) {
  match.legStart = 1;
  match.roundNumber = 6;
  let n = 0;
  const seq = [0.99, weather ? 0.1 : 0.99];
  Fodlan.maybeAdvance(() => {}, () => seq[n++]);
  assert.equal(Fodlan.stageNow(), 5);
  assert.equal(match.board.area, AREA);
}
const P = (i) => match.players['p' + i];
function place(p, x, y) { p.pos = { x, y }; }
function actor(p) { match.gameState = 'ACTION'; match.actorId = p.id; match.action = { locked: false, canto: false }; }

test.beforeEach(() => { timers.startPhaseTimer = (secs) => { match.timeLeft = Math.ceil(secs); }; });
test.afterEach(() => { Math.random = realRandom; timers.startPhaseTimer = realStart; engine.clearPhaseTimer(); });
test.after(() => {
  match.world = 'earth'; match.fodlan = null; engine.setGameMode('ffa');
  for (const id of Object.keys(engine.players)) delete engine.players[id];
});

test('ผัง: บัลลังก์ผู้ให้กำเนิด 2 ช่องที่ขอบไกล · แท่นศิลาตรา 4 แท่น · บัลลังก์หิน/เสาเป็นสิ่งกีดขวาง', () => {
  const m = Board.MAPS[AREA];
  const of = (kind) => Object.entries(m.special).filter(([, k]) => k === kind).map(([k]) => k).sort();
  assert.deepEqual(of('fd_holythrone'), ['6,1', '7,1']);
  assert.equal(of('fd_crestpad').length, 4);
  assert.ok(Object.values(m.terrain).every((k) => k === 'fd_throne' || k === 'fd_tombpillar'));
  assert.equal(Object.values(m.terrain).filter((k) => k === 'fd_throne').length, 10);
  assert.ok(Board.TERRAIN_INFO.fd_holythrone && Board.TERRAIN_INFO.fd_crestpad);
});

test('ชีพจรเทพ: จบตาบนบัลลังก์ = ได้ครั้งเดียวต่อแมตช์ · ตายครั้งถัดไปฟื้นด้วยพลังชีวิต 1 · ครั้งที่สองตายจริง', () => {
  setup(2);
  toTomb();
  const a = P(0);
  place(a, 6, 1);
  Fodlan.onUnitEnd(a);
  assert.equal(match.fodlan.tomb.pulse.p0, 'ready');
  assert.ok(Fodlan.playerInfo(a).badges.some((b) => b.key === 'pulse' && b.icon === '✨'));
  assert.ok(Fodlan.publicInfo().board.fx.some((e) => e.kind === 'throne'));
  // ตายครั้งแรก = ฟื้น 1
  a.hp = 0; a.armor = 0;
  combat.instantDeath(a);
  assert.equal(a.alive, true);
  assert.equal(a.hp, 1);
  assert.equal(match.fodlan.tomb.pulse.p0, 'used');
  assert.ok(Fodlan.publicInfo().board.fx.some((e) => e.kind === 'revive' && e.id === 'p0'));
  // นั่งซ้ำไม่ได้อีก
  Fodlan.onUnitEnd(a);
  assert.equal(match.fodlan.tomb.pulse.p0, 'used');
  assert.equal(Fodlan.playerInfo(a), undefined);
  a.hp = 0;
  combat.instantDeath(a);
  assert.equal(a.alive, false);
  // คนที่ไม่ได้จบตาบนบัลลังก์ไม่ได้
  const b = P(1);
  place(b, 6, 2);
  Fodlan.onUnitEnd(b);
  assert.equal(match.fodlan.tomb.pulse.p1, undefined);
});

test('ชีพจรเทพค้างข้ามด่าน: ได้ในหลุมศพ ไปด่านอื่นแล้วยังกันตายได้ · กลับมาหลุมศพนั่งใหม่ไม่ได้', () => {
  setup(2);
  toTomb();
  const a = P(0);
  place(a, 7, 1);
  Fodlan.onUnitEnd(a);
  match.legStart = 7; match.roundNumber = 12;
  Fodlan.maybeAdvance(() => {}, () => 0); // ด่าน 2
  assert.equal(Fodlan.stageNow(), 2);
  a.hp = 0;
  combat.instantDeath(a);
  assert.equal(a.alive, true);
  assert.equal(a.hp, 1);
  match.fodlan.stage = 1;
  toTomb();
  place(a, 6, 1);
  Fodlan.onUnitEnd(a);
  assert.equal(match.fodlan.tomb.pulse.p0, 'used');
});

test('ศิลาตรา: เข้าด่าน = 2 ก้อนบนแท่น · ปุ่มหยิบเมื่อยืนบน/ติดกัน · ถือ = พลังโจมตี +1 · ถือได้คนละก้อน', () => {
  setup(2);
  toTomb();
  const st = Fodlan.stageState();
  const pads = new Set(['5,5', '8,5', '5,9', '8,9']);
  assert.equal(st.stones.length, 2);
  for (const s of st.stones) assert.ok(pads.has(`${s.x},${s.y}`));
  st.stones = [{ id: 'c1', x: 5, y: 5 }, { id: 'c2', x: 8, y: 5 }];
  const a = P(0);
  place(a, 5, 7);
  assert.deepEqual(Fodlan.hudActions(a), [], 'ห่าง 2 ช่อง = ไม่มีปุ่ม');
  place(a, 5, 6);
  actor(a);
  const btn = Fodlan.hudActions(a).find((x) => x.key === 'fd:crest');
  assert.ok(btn && btn.icon === '💎' && btn.name === 'หยิบศิลาตรา' && !btn.disabled);
  assert.equal(Fodlan.atkBonus(a), 0);
  assert.equal(Fodlan.charAction('p0', 'fd:crest', null), true);
  assert.equal(Fodlan.atkBonus(a), 1);
  assert.equal(match.action.locked, false, 'หยิบไม่ใช้การตี');
  assert.equal(a.didAttackRound || false, false);
  assert.deepEqual(st.stones.map((s) => s.id), ['c2']);
  assert.ok(Fodlan.playerInfo(a).badges.some((b) => b.key === 'crest' && b.label === '0/3'));
  // ถืออยู่แล้วหยิบอีกไม่ได้
  place(a, 7, 5);
  assert.deepEqual(Fodlan.hudActions(a), []);
  assert.equal(Fodlan.charAction('p0', 'fd:crest', { x: 8, y: 5 }), false);
  // ไม่ใช่ตาของตัวเอง = ปุ่มกดไม่ได้
  const b = P(1);
  place(b, 8, 6);
  assert.equal(Fodlan.hudActions(b)[0].disabled, true);
  assert.equal(Fodlan.charAction('p1', 'fd:crest', null), false);
});

test('ศิลาตรา: ถือครบ 3 จบเทิร์น = อสูร (พลังชีวิต +5 · เลือดสูงสุด +5 · ใช้สกิลไม่ได้ เติมทุกเทิร์น) · ยังพลังโจมตี +1', () => {
  setup(2);
  toTomb();
  const st = Fodlan.stageState();
  st.stones = [{ id: 'c1', x: 5, y: 5 }];
  const a = P(0);
  place(a, 5, 5);
  actor(a);
  assert.equal(Fodlan.charAction('p0', 'fd:crest', null), true);
  const base = combat.maxHpOf(a);
  a.hp = 4;
  Fodlan.onEndTurn(noWx);
  Fodlan.onEndTurn(noWx);
  assert.equal(a.hp, 4);
  assert.equal(match.fodlan.tomb.carry.p0.turns, 2);
  assert.ok(!(a.statuses.noskill > 0));
  Fodlan.onEndTurn(noWx);
  assert.equal(a.hp, 9);
  assert.equal(combat.maxHpOf(a), base + 5);
  assert.ok(a.statuses.noskill > 0);
  assert.equal(Fodlan.atkBonus(a), 1);
  assert.ok(Fodlan.playerInfo(a).badges.some((b) => b.key === 'beast' && b.icon === '👹'));
  assert.ok(Fodlan.publicInfo().board.fx.some((e) => e.kind === 'beast' && e.id === 'p0'));
  // สถานะหมดอายุตามลูปจบเทิร์น → เติมใหม่ · เลือดไม่เพิ่มซ้ำ
  delete a.statuses.noskill;
  Fodlan.onEndTurn(noWx);
  assert.ok(a.statuses.noskill > 0);
  assert.equal(a.hp, 9);
  // ฟื้นเลือดได้ถึงเพดานใหม่
  a.hp = base + 4;
  combat.healHp(a, 3);
  assert.equal(a.hp, base + 5);
});

test('ศิลาตรา: คนถือตาย = ศิลาร่วงที่ช่องที่ตาย (หยิบใหม่ได้) · ร่างอสูรจบ', () => {
  setup(2);
  toTomb();
  const st = Fodlan.stageState();
  st.stones = [{ id: 'c1', x: 8, y: 9 }];
  const a = P(0);
  place(a, 9, 9);
  actor(a);
  assert.equal(Fodlan.charAction('p0', 'fd:crest', null), true);
  assert.equal(st.stones.length, 0);
  place(a, 9, 8); // เดินต่อหลังหยิบ
  a.hp = 0; a.armor = 0;
  combat.instantDeath(a);
  assert.equal(a.alive, false);
  assert.equal(match.fodlan.tomb.carry.p0, undefined);
  assert.deepEqual(st.stones.map((s) => [s.x, s.y]), [[9, 8]]);
  assert.ok(Fodlan.publicInfo().board.fx.some((e) => e.kind === 'crest_drop'));
  const b = P(1);
  place(b, 9, 7);
  actor(b);
  assert.equal(Fodlan.charAction('p1', 'fd:crest', null), true);
  assert.equal(Fodlan.atkBonus(b), 1);
  // ตายแบบ force (ไม่ผ่าน preventDeath) — จบเทิร์นกวาดแล้วศิลาร่วงที่ช่องล่าสุด
  combat.instantDeath(b, true);
  Fodlan.onEndTurn(noWx);
  assert.deepEqual(st.stones.map((s) => [s.x, s.y]), [[9, 7]]);
});

test('แสงเขียวเรือง: ทุก 3 เทิร์นของการมาเยือน คนบนแท่นศิลาตราแต้มสกิล +1 (คนนอกแท่นไม่ได้)', () => {
  setup(2);
  toTomb();
  const st = Fodlan.stageState();
  const a = P(0), b = P(1);
  place(a, 5, 9); place(b, 6, 9);
  a.skillPoints = 0; b.skillPoints = 0;
  const gained = [];
  for (let k = 1; k <= 6; k++) {
    match.roundNumber = st.enter + k - 1; // เทิร์นที่ k ของการมาเยือน
    const before = a.skillPoints;
    const paused = Fodlan.preRound(() => {});
    gained.push(a.skillPoints - before);
    assert.equal(paused, k % 3 === 0, `เทิร์น ${k}`);
  }
  assert.deepEqual(gained, [0, 0, 1, 0, 0, 1]);
  assert.equal(b.skillPoints, 0);
  assert.ok(Fodlan.publicInfo().board.fx.some((e) => e.kind === 'glow' && e.ids.includes('p0')));
});

test('สภาพอากาศออร่า (ด่าน V): แสงเขียวเรืองทุกเทิร์นระหว่างออร่า แล้วกลับเป็นทุก 3 เทิร์น', () => {
  setup(2);
  toTomb(true);
  assert.deepEqual(Fodlan.weatherNow(), { kind: 'aura', left: 3 });
  const st = Fodlan.stageState();
  const a = P(0);
  place(a, 8, 5);
  a.skillPoints = 0;
  const gained = [];
  for (let k = 1; k <= 5; k++) {
    match.roundNumber = st.enter + k - 1;
    const before = a.skillPoints;
    Fodlan.preRound(() => {});
    gained.push(a.skillPoints - before);
    Fodlan.onEndTurn(noWx); // ออร่านับเวลาลง
  }
  assert.deepEqual(gained, [1, 1, 1, 0, 0]);
  assert.ok(Fodlan.publicInfo().board.fx.some((e) => e.kind === 'glow' && e.aura));
});
