// โหมด Fodlan ด่าน III ชายฝั่งเดอร์ดริว (server/fodlan/stage3.js · map3.js · GRID_PLAN §8.5)
//  เครื่องยิงหิน · ห่าธนู (เตือนก่อน · ธงทัพคุ้มกัน) · มังกรพ่นไฟ · เผาทุ่ง/ไฟลาม · คลื่นซึนามิ (ผลัก/ชน/ล้างของบนพื้น)
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const match = require('../server/match.js');
const Board = require('../server/board.js');
const Fodlan = require('../server/fodlan.js');
const timers = require('../server/timers.js');
const action = require('../server/phases/action.js');
const Stage3 = require('../server/fodlan/stage3.js');

const K = Board.key;
const AREA = Board.FODLAN_AREA + 2;
const realRandom = Math.random;
const realStart = timers.startPhaseTimer;
function fakeTimers() { timers.startPhaseTimer = (secs) => { match.timeLeft = Math.ceil(secs); }; }

// แมตช์ ffa n คน → ย้ายเข้าด่าน III ตรงๆ (wave = เกิดคลื่นซึนามิ) · เทิร์นแรกของด่าน = 7
function setup(n = 3, { wave = false } = {}) {
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
  match.fodlan.stage = 3;
  match.fodlan.weather = wave ? { kind: 'tsunami', left: 3 } : null;
  action.placeOnBoard(AREA);
  match.fodlan.s = { ver: 0, fx: [], fxSeq: 0, weather: match.fodlan.weather };
  match.roundNumber = 6;
  Stage3.enter(Fodlan.makeCtx(), match.fodlan.s);
  for (const p of Object.values(engine.players)) p.pos = null;
  match.shopPos = null;
}
const P = (i) => engine.players['p' + i];
const st = () => match.fodlan.s;
const total = (p) => p.hp + (p.armor || 0);
function place(i, x, y) { P(i).pos = { x, y }; }
function act(i) {
  match.gameState = 'ACTION';
  match.actorId = 'p' + i;
  match.action = { from: { ...P(i).pos }, moved: false, locked: false };
}
// ต้นเทิร์น (roundNumber = เทิร์นที่จบไปแล้ว → preRound ของเทิร์นถัดไป)
function preRoundOf(turn) {
  match.roundNumber = turn - 1;
  match.gameState = 'PLAYING';
  return Fodlan.preRound(() => {});
}
const fxOf = (kind) => (st().fx || []).filter((e) => e.kind === kind);

test.beforeEach(() => { fakeTimers(); });
test.afterEach(() => { Math.random = realRandom; timers.startPhaseTimer = realStart; engine.clearPhaseTimer(); });
test.after(() => {
  match.world = 'earth'; match.fodlan = null; engine.setGameMode('ffa');
  for (const id of Object.keys(engine.players)) delete engine.players[id];
});

test('ผังด่าน III: ทะเลขอบ y=0 · เครื่องยิงหิน 2 · กองไฟ · ที่กั้นไม้ · หญ้าแห้ง · ธงกลางสนาม · ป้ายช่องครบ', () => {
  const m = Board.MAPS[AREA];
  for (let x = 0; x < 14; x++) assert.equal(m.terrain[K(x, 0)], 'fd_sea');
  const kinds = Object.values(m.terrain);
  assert.equal(kinds.filter((k) => k === 'fd_catapult').length, 2);
  assert.ok(kinds.filter((k) => k === 'fd_bonfire').length >= 2);
  assert.ok(kinds.filter((k) => k === 'fd_barricade').length >= 6);
  assert.equal(m.special[K(Stage3.FLAG.x, Stage3.FLAG.y)], 'fd_flag');
  assert.ok(Object.values(m.special).filter((k) => k === 'fd_grass').length >= 12);
  for (const k of ['fd_grass', 'fd_flag', 'fd_fire', 'fd_ash']) {
    const info = Board.TERRAIN_INFO[k];
    assert.ok(info && info.name && info.icon && info.desc, k);
  }
});

test('เครื่องยิงหิน: ติดเครื่อง = ปุ่ม · ระยะ 8 จากเครื่อง · ลูกไฟ 3×3 เสียหาย 2 + ลุกไหม้ 1 · จุดหญ้า · ไม่โดนตัวเอง · ใช้แทนการตี · คูลดาวน์ 2 เทิร์น', () => {
  setup(3);
  match.roundNumber = 7;
  place(0, 1, 7); // ใต้เครื่องยิงหิน (1,6)
  place(1, 5, 8);
  place(2, 6, 9);
  act(0);
  const btn = Fodlan.hudActions(P(0)).find((a) => a.key === 'fd:catapult');
  assert.ok(btn && !btn.disabled);
  assert.equal(btn.name, 'เครื่องยิงหิน');
  const keys = new Set(btn.tiles.map((t) => K(t.x, t.y)));
  assert.ok(keys.has(K(9, 6)), 'ห่าง 8 ช่อง = ยิงได้');
  assert.ok(!keys.has(K(10, 6)), 'ห่าง 9 ช่อง = ไกลเกิน');
  assert.equal(Fodlan.charAction('p0', 'fd:catapult', { x: 10, y: 6 }), false, 'นอกระยะ');
  const b1 = total(P(1)), b2 = total(P(2)), b0 = total(P(0));
  assert.equal(Fodlan.charAction('p0', 'fd:catapult', { x: 5, y: 8 }), true);
  assert.equal(total(P(1)), b1 - 2);
  assert.equal(total(P(2)), b2 - 2);
  assert.equal(P(1).statuses.hburn, 1);
  assert.equal(P(2).statuses.hburn, 1);
  assert.equal(total(P(0)), b0);
  assert.ok(st().fire[K(4, 9)] && st().fire[K(5, 9)], 'หญ้าแห้งใน 3×3 ติดไฟ');
  assert.equal(match.gameState, 'ATTACKING', 'ใช้การตีของตานี้ → ฉาก แล้วจบตา');
  assert.ok(P(0).didAttackRound);
  assert.equal(fxOf('catapult').length, 1);
  // คูลดาวน์: เทิร์นถัดไปยังยิงไม่ได้ · อีก 2 เทิร์นยิงได้
  match.roundNumber = 8; act(0);
  let b = Fodlan.hudActions(P(0)).find((a) => a.key === 'fd:catapult');
  assert.ok(b.disabled);
  assert.equal(b.cd, 1);
  assert.equal(Fodlan.charAction('p0', 'fd:catapult', { x: 5, y: 8 }), false);
  match.roundNumber = 9; act(0);
  b = Fodlan.hudActions(P(0)).find((a) => a.key === 'fd:catapult');
  assert.ok(!b.disabled);
  // ไม่ได้ติดเครื่อง = ไม่มีปุ่ม
  place(0, 4, 7); act(0);
  assert.ok(!Fodlan.hudActions(P(0)).some((a) => a.key === 'fd:catapult'));
});

test('ห่าธนู: เตือนแดงก่อน 1 เทิร์น (3 + ⌊คน/2⌋ ช่อง) → ต้นเทิร์นถัดไปเสียหาย 1 · ฝ่ายที่ยึดธงไม่โดน', () => {
  setup(3);
  place(0, 3, 3); place(1, 8, 2); place(2, Stage3.FLAG.x, Stage3.FLAG.y);
  preRoundOf(7);
  assert.equal(st().arrows.at, 8);
  assert.equal(st().arrows.tiles.length, 3 + Math.floor(3 / 2));
  const warn = Fodlan.publicInfo().board.warn.filter((w) => w.kind === 'arrow');
  assert.equal(warn.length, st().arrows.tiles.length, 'ช่องเป้ากะพริบแดงทั้งหมด');
  // p2 จบตาบนธง = ยึดธง
  Fodlan.onUnitEnd(P(2));
  assert.equal(st().flag.holder, 'p2');
  assert.ok(Fodlan.playerInfo(P(2)).badges.some((x) => x.key === 'flag'));
  // บังคับเป้าให้โดน p0 กับ p2
  st().arrows.tiles = [{ x: 3, y: 3 }, { x: Stage3.FLAG.x, y: Stage3.FLAG.y }];
  const b0 = total(P(0)), b1 = total(P(1)), b2 = total(P(2));
  assert.equal(preRoundOf(8), true, 'มีห่าธนูลง = พักให้เล่นฉาก');
  assert.equal(total(P(0)), b0 - 1);
  assert.equal(total(P(1)), b1, 'ไม่ได้ยืนบนช่องเป้า');
  assert.equal(total(P(2)), b2, 'คนยึดธงไม่โดน');
  const e = fxOf('arrows').pop();
  assert.deepEqual(e.hits, ['p0']);
  assert.deepEqual(e.spared, ['p2']);
});

test('ห่าธนู: ธงคุ้มกันเพื่อนร่วมทีมของคนยึดด้วย (duo)', () => {
  setup(3);
  match.gameMode = 'duo';
  P(1).teamId = 'A'; P(2).teamId = 'A'; P(0).teamId = 'B';
  place(0, 3, 3); place(1, 8, 2); place(2, Stage3.FLAG.x, Stage3.FLAG.y);
  Fodlan.onUnitEnd(P(2));
  st().arrows = { at: 8, tiles: [{ x: 3, y: 3 }, { x: 8, y: 2 }] };
  const b0 = total(P(0)), b1 = total(P(1));
  preRoundOf(8);
  assert.equal(total(P(0)), b0 - 1);
  assert.equal(total(P(1)), b1, 'เพื่อนร่วมทีมของคนยึดธงไม่โดน');
  match.gameMode = 'ffa';
});

test('มังกร: เตือนก่อน 1 เทิร์น (เทิร์นที่ 3 ของด่าน) · แนวกว้าง 4 ยาวสุดแผนที่ · เสียหาย 2 + ลุกไหม้ 1 · จุดหญ้าแห้งและน้ำมันดิเอโก้', () => {
  setup(3);
  place(0, 13, 7); place(1, 0, 7); place(2, 6, 13);
  preRoundOf(7);
  assert.equal(st().dragon, null, 'เทิร์น 1 ของด่านยังไม่เตือน');
  preRoundOf(8);
  assert.ok(st().dragon && st().dragon.at === 9, 'เทิร์น 2 เตือนว่าเทิร์น 3 มังกรพ่นไฟ');
  assert.equal(fxOf('dragonWarn').length, 1);
  // บังคับแนว: แถว 5–8 (ทั้งแผนที่ 14 คอลัมน์)
  st().dragon = { at: 9, axis: 'row', from: 5 };
  const band = Stage3._bandTiles(Fodlan.makeCtx(), st().dragon);
  assert.equal(band.length, 4 * 14);
  const warn = Fodlan.publicInfo().board.warn.filter((w) => w.kind === 'dragon');
  assert.equal(warn.length, 56);
  // น้ำมันดิเอโก้: แอ่งที่แตะแนวไฟลุกทั้งแอ่ง (ยื่นออกนอกแนวที่ (6,9))
  match.board.diego = { oil: { [K(6, 8)]: { owner: 'x' }, [K(6, 9)]: { owner: 'x' }, [K(0, 12)]: { owner: 'x' } }, fire: {}, ash: {} };
  st().arrows = null;
  const b0 = total(P(0)), b1 = total(P(1)), b2 = total(P(2));
  preRoundOf(9);
  assert.equal(total(P(0)), b0 - 2);
  assert.equal(total(P(1)), b1 - 2);
  assert.equal(P(0).statuses.hburn, 1);
  assert.equal(total(P(2)), b2, 'นอกแนวไฟ');
  for (const k of [K(3, 5), K(4, 6), K(10, 6), K(8, 6)]) assert.ok(st().fire[k], `หญ้า ${k} ติดไฟ`);
  assert.ok(!st().fire[K(4, 9)], 'หญ้านอกแนวยังไม่ติด');
  const L = match.board.diego;
  assert.ok(L.fire[K(6, 8)] && L.fire[K(6, 9)], 'น้ำมันทั้งแอ่งลุก');
  assert.ok(!L.oil[K(6, 8)] && L.oil[K(0, 12)], 'แอ่งที่ไม่แตะแนวไม่ติด');
  assert.equal(L.fire[K(6, 8)].owner, null);
  // ไฟลุกในแผนที่ = ช่อง fd_fire
  assert.equal(action.boardMap().special[K(3, 5)], 'fd_fire');
  const e = fxOf('dragon').pop();
  assert.equal(e.width, 4);
  assert.deepEqual(e.hits.sort(), ['p0', 'p1']);
});

test('เผาทุ่ง: หยิบไฟจากกองไฟ → จุดหญ้าแห้งที่ติดตัว · ไฟลาม 1 ช่อง/เทิร์น · ลุก 3 เทิร์นแล้วเป็นเถ้า · จบตาบนไฟ = เสียหาย 1 + ลุกไหม้ 1', () => {
  setup(2);
  match.roundNumber = 7;
  place(0, 5, 5); // ติดกองไฟ (5,4) และหญ้า (4,5) (5,6)
  act(0);
  let hud = Fodlan.hudActions(P(0));
  assert.ok(hud.some((a) => a.key === 'fd:takefire' && a.name === 'หยิบไฟ' && !a.disabled));
  assert.ok(!hud.some((a) => a.key === 'fd:lightfire'), 'ยังไม่ถือไฟ');
  assert.equal(Fodlan.charAction('p0', 'fd:takefire', null), true);
  assert.ok(st().carry.p0);
  assert.ok(match.action.locked, 'หยิบไฟ = ล็อกการเดิน');
  assert.ok(Fodlan.playerInfo(P(0)).badges.some((x) => x.key === 'carry'));
  hud = Fodlan.hudActions(P(0));
  const light = hud.find((a) => a.key === 'fd:lightfire');
  assert.ok(light && light.name === 'จุดไฟ');
  const lt = new Set(light.tiles.map((t) => K(t.x, t.y)));
  assert.ok(lt.has(K(4, 5)) && lt.has(K(5, 6)));
  assert.equal(Fodlan.charAction('p0', 'fd:lightfire', { x: 9, y: 9 }), false, 'ไม่ติดตัว');
  assert.equal(Fodlan.charAction('p0', 'fd:lightfire', { x: 4, y: 5 }), true);
  assert.equal(st().fire[K(4, 5)], 3);
  assert.ok(!st().carry.p0, 'ใช้ไฟแล้ว');
  // จบเทิร์น 7: ลามไปช่องติดกัน (3,5) (4,6) — ไม่ลามข้ามช่องที่ไม่ใช่หญ้า
  Fodlan.onEndTurn();
  assert.equal(st().fire[K(4, 5)], 2);
  assert.equal(st().fire[K(3, 5)], 3);
  assert.equal(st().fire[K(4, 6)], 3);
  assert.ok(!st().fire[K(3, 6)], 'ห่าง 2 ช่อง = ยังไม่ลาม');
  Fodlan.onEndTurn();
  assert.equal(st().fire[K(4, 5)], 1);
  assert.ok(st().fire[K(3, 6)] && st().fire[K(5, 6)]);
  Fodlan.onEndTurn();
  assert.ok(!st().fire[K(4, 5)] && st().ash[K(4, 5)], 'ลุกครบ 3 เทิร์น = เถ้า');
  assert.equal(action.boardMap().special[K(4, 5)], 'fd_ash');
  assert.ok(!st().fire[K(4, 5)]);
  // เถ้าไม่ติดไฟซ้ำ
  Fodlan.onEndTurn();
  assert.ok(!st().fire[K(4, 5)]);
  // จบตาบนช่องที่ลุก
  st().fire[K(9, 9)] = 3;
  place(1, 9, 9);
  const b1 = total(P(1));
  Fodlan.onUnitEnd(P(1));
  assert.equal(total(P(1)), b1 - 1);
  assert.equal(P(1).statuses.hburn, 1);
});

test('ยึดธง: จบตาบนธง = ยึด · คนอื่นมายึดแทนได้ · publicInfo ส่งคนยึด', () => {
  setup(2);
  place(0, Stage3.FLAG.x, Stage3.FLAG.y);
  Fodlan.onUnitEnd(P(0));
  assert.equal(Fodlan.publicInfo().board.flag.holder, 'p0');
  P(0).pos = { x: 3, y: 3 };
  place(1, Stage3.FLAG.x, Stage3.FLAG.y);
  Fodlan.onUnitEnd(P(1));
  assert.equal(st().flag.holder, 'p1');
  assert.equal(Fodlan.playerInfo(P(0)), undefined, 'เสียธงแล้วไม่มีป้าย');
});

test('คลื่นซึนามิ: เทิร์น 1 เตือน · ต้นเทิร์น 2 และ 3 พัด · ผลักจากทะเลไปจนสุดทาง · เสียหาย 2 · ชนสิ่งกีดขวาง +1 · ล้างของบนพื้น', () => {
  setup(3, { wave: true });
  place(0, 6, 2);   // คอลัมน์ 6 ไม่มีสิ่งกีดขวาง → ไปสุดขอบ (6,13)
  place(1, 3, 3);   // คอลัมน์ 3: ที่กั้น (3,8) → หยุด (3,7) + ชน
  place(2, 13, 3);  // คอลัมน์ 13 → ขอบล่าง (13,13)
  assert.equal(preRoundOf(7), false, 'เทิร์น 1 แค่เตือน');
  assert.equal(st().wave.at, 8);
  assert.equal(fxOf('waveWarn').length, 1);
  const warn = Fodlan.publicInfo().board.warn.filter((w) => w.kind === 'wave');
  assert.equal(warn.length, 14, 'แถวริมหาดทุกคอลัมน์');
  // ของบนพื้นที่ต้องถูกล้าง
  st().fire[K(9, 9)] = 2;
  st().carry.p0 = true;
  match.board.diego = { oil: { [K(5, 5)]: { owner: 'x' } }, fire: { [K(6, 6)]: { owner: 'x', until: 99 } }, ash: { [K(7, 7)]: 1 } };
  match.board.flora = { [K(2, 3)]: { owner: 'x', left: 3, made: false } };
  match.board.wet = { [K(8, 3)]: true };
  st().arrows = null;
  const b0 = total(P(0)), b1 = total(P(1)), b2 = total(P(2));
  assert.equal(preRoundOf(8), true);
  assert.deepEqual(P(0).pos, { x: 6, y: 13 });
  assert.deepEqual(P(1).pos, { x: 3, y: 7 });
  assert.deepEqual(P(2).pos, { x: 13, y: 13 });
  assert.equal(total(P(0)), b0 - 2, 'ไปสุดขอบ = 2');
  assert.equal(total(P(1)), b1 - 3, 'ชนที่กั้น = 2 + 1');
  assert.equal(total(P(2)), b2 - 2);
  const e = fxOf('wave').pop();
  assert.ok(e.moves.find((m) => m.id === 'p1').crash);
  assert.ok(!e.moves.find((m) => m.id === 'p0').crash);
  // ล้างของบนพื้น
  assert.ok(!st().fire[K(9, 9)] && st().ash[K(9, 9)], 'ไฟของด่าน → เถ้า');
  assert.ok(!st().carry.p0, 'ไฟที่ถือดับ');
  const L = match.board.diego;
  assert.equal(Object.keys(L.oil).length + Object.keys(L.fire).length + Object.keys(L.ash).length, 0, 'น้ำมัน/กองไฟดิเอโก้');
  assert.equal(Object.keys(match.board.flora).length, 0, 'พุ่มดอกไม้เซลิน');
  assert.equal(Object.keys(match.board.wet).length, 0, 'พื้นเปียกเอมิลิโกะ');
  // เตือนอีกรอบ → ต้นเทิร์น 3 พัดครั้งที่ 2 (คนที่อยู่ติดขอบแล้วเสียแค่ 2 · ชิดที่กั้นอยู่แล้ว = ชนอีก)
  assert.equal(st().wave.at, 9);
  st().arrows = null;
  st().dragon = null; // เทิร์น 3 ของด่าน = มังกรด้วย — ตัดออกให้วัดแค่คลื่น
  const c0 = total(P(0)), c1 = total(P(1));
  preRoundOf(9);
  assert.equal(total(P(0)), c0 - 2);
  assert.equal(total(P(1)), c1 - 3);
  assert.equal(st().wave, null, 'พัดครบ 2 ครั้ง');
  st().arrows = null;
  preRoundOf(10);
  assert.equal(fxOf('wave').length, 2);
});

test('คลื่นซึนามิ: คนข้างหลังไปหยุดชิดคนข้างหน้า (ไม่เสียเพิ่มจากการชนคน)', () => {
  setup(2, { wave: true });
  place(0, 6, 12);
  place(1, 6, 4);
  st().wave = { at: 8 };
  const b1 = total(P(1));
  preRoundOf(8);
  assert.deepEqual(P(0).pos, { x: 6, y: 13 });
  assert.deepEqual(P(1).pos, { x: 6, y: 12 });
  assert.equal(total(P(1)), b1 - 2);
});
