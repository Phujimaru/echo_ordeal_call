// Nautilus ชั้น 5 ร่องลึกก้นสมุทร — ความมืด + ลูกเล่นโต้ตอบ (server/fodlan/ntAbyss.js · map11.js · GRID_PLAN §8.9 "ลูกเล่นโต้ตอบชุดใหม่")
//  มืดสนิท: เห็นแค่ในแสง + ช่องติดตัว · แพลงก์ตอนเรือง (จบตาบนดง = ทุกคนเห็น) · ไฟล่อปลาตกเบ็ด ปาใส่ = งับ 3 + ลากลงร่อง · แสงล่อปลอม เข้าใกล้ = งับ 2
//  พลุแสง ตาพร่า + ส่องสว่าง · ทุบแพลงก์ตอน = หมอกมืด ตีจากในมืด +1 · ทุบสะพาน = ร่วงลงร่อง 3 + โผล่จุดเกิด · บ่อน้ำเกลือ = พิษ · ความมืดบีบจากขอบ
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const match = require('../server/match.js');
const Fodlan = require('../server/fodlan.js');
const timers = require('../server/timers.js');
const Board = require('../server/board.js');
const A = require('../server/fodlan/ntAbyss.js');
const MAP = require('../server/fodlan/map11.js');
const kit = require('../server/fodlan/ntKit.js');

const realRandom = Math.random;
const realStart = timers.startPhaseTimer;
function setup() {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  for (let i = 0; i < 3; i++) engine.players['p' + i] = { id: 'p' + i, name: 'P' + i, position: i + 1, characterId: 'dummy', alive: true, connected: true, cards: [], statuses: {}, statusAmt: {}, seen: {}, inventory: [] };
  engine.setGameMode('ffa');
  match.world = 'nautilus';
  match.nautilusWhale = false;
  Math.random = () => 0.99; // ไม่หลบ (เทสต์ดาเมจตรงตัว)
  engine.startMatch();
  engine.clearPhaseTimer();
  // ดิ่งลงชั้น 5 (ด่าน 11)
  match.legStart = 1; match.fodlan.stage = 10; match.roundNumber = 24;
  assert.equal(Fodlan.maybeAdvance(() => {}, () => 0), true);
  assert.equal(Fodlan.stageNow(), 11);
  match.journeyScene = null;
  const P = Object.values(match.players);
  for (const p of P) { p.hp = 20; p.maxHp = 20; p.armor = 0; p.statuses = {}; p.statusAmt = {}; p.pos = null; }
  return P;
}
function act(p) { match.gameState = 'ACTION'; match.actorId = p.id; match.action = { locked: false }; p.didAttackRound = false; }
const ctx = () => Fodlan.makeCtx();
const st = () => Fodlan.stageState();
const onSpawn = (p) => (Fodlan.makeCtx().map().spawns || []).some((s) => s.x === p.pos.x && s.y === p.pos.y);

test.beforeEach(() => { timers.startPhaseTimer = () => {}; });
test.afterEach(() => { Math.random = realRandom; timers.startPhaseTimer = realStart; engine.clearPhaseTimer(); });
test.after(() => { match.world = 'earth'; match.fodlan = null; match.nautilusWhale = undefined; for (const id of Object.keys(engine.players)) delete engine.players[id]; });

// ---------- ผัง ----------
function walkable(map, blocked = new Set()) {
  const out = new Set();
  for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) if (!Board.isObstacle(map, x, y) && !blocked.has(`${x},${y}`)) out.add(`${x},${y}`);
  return out;
}
function regions(set) {
  const left = new Set(set), out = [];
  while (left.size) {
    const first = left.values().next().value, q = [first], reg = new Set([first]); left.delete(first);
    while (q.length) {
      const [x, y] = q.pop().split(',').map(Number);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = `${x + dx},${y + dy}`; if (left.has(k)) { left.delete(k); reg.add(k); q.push(k); } }
    }
    out.push(reg);
  }
  return out;
}

test('ผัง 20×16: 7 จุดเกิด · ท่าจอดเรือว่าง · ทุกช่องเดินได้ต่อกันหมด (มีเรือจอด/สะพานพังทั้งสอง ก็ยังต่อกันผ่านกระดูกสันหลัง)', () => {
  assert.ok(MAP.ROWS.length === 16 && MAP.ROWS.every((r) => r.length === 20));
  assert.equal(MAP.map.spawns.length, 7);
  assert.deepEqual(MAP.map.shopSpots, []);
  const D = MAP.DOCK;
  for (let y = D.y; y < D.y + D.h; y++) for (let x = D.x; x < D.x + D.w; x++) assert.equal(MAP.ROWS[y][x], 'N', `ท่าจอด ${x},${y} ว่าง`);
  assert.ok(MAP.TERRAIN.fd_nt_whale, 'มีชื่อช่องลำตัวทาลัสซา');
  const map = Board.buildMap ? Board.buildMap({ ...MAP.map, area: 50 }) : null;
  const m = map || { cols: 20, rows: 16, terrain: Object.fromEntries(Object.entries(MAP.map.terrain).flatMap(([k, l]) => l.map(([x, y]) => [`${x},${y}`, k]))), special: Object.fromEntries(Object.entries(MAP.map.special).flatMap(([k, l]) => l.map(([x, y]) => [`${x},${y}`, k]))) };
  const dock = new Set(); for (let y = D.y; y < D.y + D.h; y++) for (let x = D.x; x < D.x + D.w; x++) dock.add(`${x},${y}`);
  assert.equal(regions(walkable(m)).length, 1, 'ต่อกันหมด');
  assert.equal(regions(walkable(m, dock)).length, 1, 'เรือจอดแล้วยังต่อกัน');
  const bridges = new Set(A.BRIDGES.flat().map((t) => `${t.x},${t.y}`));
  assert.equal(regions(walkable(m, new Set([...dock, ...bridges]))).length, 1, 'สะพานพังทั้งสองยังข้ามทางสันหลังได้');
  const spine = new Set((MAP.map.special.fd_nt_spine || []).filter(([, y]) => y >= 6 && y <= 8).map(([x, y]) => `${x},${y}`));
  assert.equal(regions(walkable(m, new Set([...dock, ...bridges, ...spine]))).length, 2, 'ร่องลึกผ่ากระดานจริง (ไม่มีทางอ้อม)');
  for (const l of A.LURES) { assert.equal(MAP.ROWS[l.lair.y][l.lair.x], 'X', 'ปลาตกเบ็ดซุ่มในร่อง'); assert.equal(MAP.ROWS[l.y][l.x], '.', 'แสงล่อห้อยเหนือช่องเดินได้'); }
});

test('เข้าชั้น 5: ไฟล่อ 3 · ดงแพลงก์ตอน · ยานสำรวจ 2 · สะพาน 2 · ความมืด (เห็นแค่ช่องติดตัว + แหล่งแสง)', () => {
  const [a, b] = setup();
  a.pos = { x: 4, y: 9 }; b.pos = { x: 15, y: 11 };
  const info = Fodlan.publicInfo().board.abyss;
  assert.equal(info.lures.length, 3);
  assert.ok(info.lures.every((l) => l.on));
  assert.equal(info.probes.length, 2);
  assert.equal(info.bridges.length, 2);
  assert.ok(info.patches.length >= 4);
  const vis = new Set(Fodlan.vision(a));
  assert.ok(vis.has('4,9') && vis.has('5,10'), 'ช่องติดตัว');
  assert.ok(!vis.has('4,12') && !vis.has('15,11'), 'ไกลออกไปมืด');
  assert.ok(vis.has('3,2') && vis.has('9,10'), 'ดงแพลงก์ตอน + แสงล่อ (8,9) ทุกคนเห็น');
  assert.ok(vis.has('6,1'), 'ไฟตัวเรือ');
  assert.equal(Fodlan.hides(a, b), true, 'ศัตรูในความมืดมองไม่เห็น');
});

test('แพลงก์ตอน: จบตาบนดง = ตัวเรือง 2 เทิร์น → ทุกคนเห็น · ตัวเองเห็นรอบตัวระยะ 2', () => {
  const [a, b] = setup();
  a.pos = { x: 3, y: 2 }; b.pos = { x: 15, y: 11 };
  b.pos = { x: 12, y: 13 };
  assert.equal(Fodlan.hides(b, a), false, 'ยืนในดงที่เรือง = อยู่ในแสง');
  a.pos = { x: 3, y: 2 };
  Fodlan.onUnitEnd(a);
  a.pos = { x: 5, y: 10 }; // เดินออกจากแสง ยังเรืองอยู่
  assert.equal(Fodlan.hides(b, a), false, 'ตัวเรือง ทุกคนเห็น');
  assert.ok(new Set(Fodlan.vision(a)).has('7,12'), 'เห็นรอบตัวระยะ 2');
  Fodlan.onEndTurn(() => 1); match.roundNumber += 1;
  assert.equal(Fodlan.hides(b, a), false, 'เทิร์นที่ 2 ยังเรือง');
  Fodlan.onEndTurn(() => 1); match.roundNumber += 1;
  assert.equal(Fodlan.hides(b, a), true, 'หมดแล้วกลับเข้าความมืด');
});

test('ปาไฟล่อ: ยืนติดแสงล่อ → ศัตรูที่เห็นในระยะ 4 โดนปลาตกเบ็ดงับ 3 + ลากลงร่องข้างตัว (ตก 3 + สตั้น + โผล่จุดเกิด) · ไฟล่อหายไป 3 เทิร์น', () => {
  const [a, b] = setup();
  a.pos = { x: 1, y: 4 }; // ติดแสงล่อ (1,5)
  b.pos = { x: 2, y: 6 }; // ริมร่อง (1,6) · ในแสงล่อ (เห็นได้)
  act(a);
  const hud = Fodlan.hudActions(a).find((h) => h.key === 'fd:l11:lure');
  assert.ok(hud && !hud.disabled);
  assert.ok(hud.tiles.some((t) => t.x === 2 && t.y === 6));
  assert.equal(Fodlan.charAction(a.id, 'fd:l11:lure', { x: 2, y: 6 }), true);
  assert.equal(b.hp, 14, 'งับ 3 + ตกร่อง 3');
  assert.ok((b.statuses.stun || 0) > 0);
  assert.ok(onSpawn(b), 'โผล่ที่จุดเกิด');
  const l = st().nt11.lures.find((q) => q.id === 1);
  assert.equal(l.back, match.roundNumber + A.N.LURE_BACK);
  const fx = st().fx.find((e) => e.kind === 'nt_angler');
  assert.ok(fx && fx.hit && fx.drag && fx.drag.fell);
});

test('ปาไฟล่อ: เป้าในที่โล่ง = งับ 3 + ไฟล่อติดตัว (เรือง ทุกคนเห็น) · ศัตรูในความมืดเลือกไม่ได้', () => {
  const [a, b, c] = setup();
  a.pos = { x: 1, y: 4 };
  b.pos = { x: 4, y: 3 }; // ไกลจากร่อง/หลุมเกิน 2 ทุกทิศ? (4,4)…(4,5) ไม่ใช่ร่อง
  c.pos = { x: 15, y: 13 };
  // b อยู่ในแสงดงแพลงก์ตอน (3,3) → เห็น
  act(a);
  const hud = Fodlan.hudActions(a).find((h) => h.key === 'fd:l11:lure');
  assert.ok(hud.tiles.some((t) => t.x === 4 && t.y === 3));
  assert.ok(!hud.tiles.some((t) => t.x === 15 && t.y === 13));
  assert.equal(Fodlan.charAction(a.id, 'fd:l11:lure', { x: 15, y: 13 }), false, 'ไกล/มืด = ไม่ได้');
  assert.equal(Fodlan.charAction(a.id, 'fd:l11:lure', { x: 4, y: 3 }), true);
  assert.equal(b.hp, 17);
  assert.deepEqual(b.pos, { x: 4, y: 3 }, 'ไม่มีร่องใกล้ = ไม่ลาก');
  assert.ok(Fodlan.publicInfo().board.abyss.glow.some((g) => g.id === b.id), 'ไฟล่อติดตัว');
});

test('แสงล่อปลอม: จบตาติดแสงล่อ = โดนงับ 2 · ปลาหลบ 2 เทิร์น', () => {
  const [, b] = setup();
  b.pos = { x: 9, y: 9 }; // ติดแสงล่อ (8,9)
  Fodlan.onUnitEnd(b);
  assert.equal(b.hp, 18);
  const l = st().nt11.lures.find((q) => q.id === 2);
  assert.equal(l.back, match.roundNumber + A.N.SNAP_BACK);
  Fodlan.onUnitEnd(b);
  assert.equal(b.hp, 18, 'ไฟล่อดับ ไม่งับซ้ำ');
});

test('พลุแสง: ยืนติดยานสำรวจ → ยิงไกล 5 · วง 3×3 ตาบอด 1 เทิร์น · ส่องสว่างรัศมี 2 ทุกคนเห็น 2 เทิร์น · ยานพัก 3 เทิร์น', () => {
  const [a, b, c] = setup();
  a.pos = { x: 14, y: 4 }; // ติดยาน (14,3)
  b.pos = { x: 11, y: 5 }; c.pos = { x: 3, y: 14 };
  act(a);
  const hud = Fodlan.hudActions(a).find((h) => h.key === 'fd:l11:flare');
  assert.ok(hud && !hud.disabled);
  assert.equal(Fodlan.hides(c, b), true);
  assert.equal(Fodlan.charAction(a.id, 'fd:l11:flare', { x: 12, y: 5 }), true);
  assert.ok((b.statuses.blind || 0) > 0, 'ตาพร่า');
  assert.equal(Fodlan.hides(c, b), false, 'ในแสงพลุ ทุกคนเห็น');
  assert.ok(new Set(Fodlan.vision(c)).has('14,7'), 'รัศมี 2');
  act(a);
  assert.ok(Fodlan.hudActions(a).find((h) => h.key === 'fd:l11:flare').disabled, 'ยานพัก');
  Fodlan.onEndTurn(() => 1); match.roundNumber += 1;
  assert.equal(Fodlan.hides(c, b), false, 'เทิร์นที่ 2 ยังสว่าง');
  Fodlan.onEndTurn(() => 1); match.roundNumber += 1;
  assert.equal(Fodlan.hides(c, b), true, 'พลุดับ');
});

test('ทุบแพลงก์ตอน: ดงดับ + หมอกมืด 3 เทิร์น · ตีจากในมืดพลังโจมตี +1 · คนเรืองในหมอกดับ', () => {
  const [a, b] = setup();
  a.pos = { x: 4, y: 3 }; // ติดดง (3,3)
  b.pos = { x: 2, y: 2 };
  st().nt11.glow[b.id] = match.roundNumber + 1;
  act(a);
  assert.equal(Fodlan.atkBonus(a), 0);
  assert.ok(Fodlan.hudActions(a).some((h) => h.key === 'fd:l11:smash'));
  assert.equal(Fodlan.charAction(a.id, 'fd:l11:smash'), true);
  const info = Fodlan.publicInfo().board.abyss;
  const nw = info.patches.find((p) => p.tiles.some((t) => t.x === 3 && t.y === 2));
  assert.equal(nw.lit, false);
  assert.ok(info.ink.length === 1 && info.ink[0].tiles.includes('4,3'));
  assert.equal(Fodlan.atkBonus(a), 1, 'ตีจากความมืด +1');
  assert.ok(!info.glow.some((g) => g.id === b.id), 'แสงตัว b ดับ');
  assert.ok(!new Set(Fodlan.vision(b)).has('5,2'), 'ดงดับ ไม่ส่องแล้ว');
  for (let i = 0; i < A.N.INK_TURNS; i++) { Fodlan.onEndTurn(() => 1); match.roundNumber += 1; }
  assert.equal(Fodlan.atkBonus(a), 0, 'หมอกจาง');
  assert.ok(Fodlan.publicInfo().board.abyss.patches.find((p) => p.i === nw.i).lit, 'ดงเรืองใหม่');
});

test('ทุบสะพานหิน: ยืนริมร่องติดสะพาน → พังทั้งเส้นเป็นร่อง · คนบนสะพานร่วง 3 + สตั้น + โผล่จุดเกิด', () => {
  const [a, b] = setup();
  a.pos = { x: 3, y: 6 }; b.pos = { x: 3, y: 8 };
  act(a);
  assert.ok(Fodlan.hudActions(a).some((h) => h.key === 'fd:l11:bridge'));
  assert.equal(Fodlan.charAction(a.id, 'fd:l11:bridge'), true);
  assert.equal(b.hp, 17);
  assert.ok((b.statuses.stun || 0) > 0 && onSpawn(b));
  const map = Fodlan.makeCtx().map();
  assert.equal(map.terrain['3,7'], 'fd_nt_chasm');
  assert.equal(map.terrain['3,8'], 'fd_nt_chasm');
  act(a);
  assert.ok(!Fodlan.hudActions(a).some((h) => h.key === 'fd:l11:bridge'), 'พังแล้ว');
});

test('ผลักลงร่อง/หลุมดิ่ง: ดาเมจ 3 + สตั้น + โผล่จุดเกิด (hazardAt)', () => {
  const [a] = setup();
  a.pos = { x: 6, y: 13 };
  kit.shove(ctx(), a, 0, -1, 1, A.hazardAt, null); // หลุมดิ่ง (6,12)
  assert.equal(a.hp, 17);
  assert.ok((a.statuses.stun || 0) > 0 && onSpawn(a));
});

test('บ่อน้ำเกลือ: เดิน 2 ก้าว · จบตาในบ่อ = พิษ', () => {
  const [a] = setup();
  a.pos = { x: 2, y: 11 };
  assert.equal(Board.moveCost(Fodlan.makeCtx().map(), 2, 11), 2);
  Fodlan.onUnitEnd(a);
  assert.ok((a.statuses.poison || 0) > 0);
});

test('ความมืดบีบ: เตือนวงถัดไป · จบเทิร์นในเขตมืดนอกแสง = ดาเมจ 2 · กินเข้ามา 2 → 3 → 4 · แสง/ไฟตัวเรือ/ตัวเรือง = ปลอดภัย · สงบแล้วหาย', () => {
  const [a, b, c] = setup();
  a.pos = { x: 0, y: 9 };   // ขอบ นอกแสง
  b.pos = { x: 10, y: 9 };  // กลาง
  c.pos = { x: 6, y: 1 };   // ข้างเรือ (ไฟตัวเรือ)
  Fodlan.startWeather('nt_dark');
  const warn = Fodlan.publicInfo().board.warn || [];
  assert.ok(warn.some((w) => w.x === 0 && w.y === 9 && w.kind === 'nt_dark'));
  assert.ok(!warn.some((w) => w.x === 6 && w.y === 1), 'ในแสงไม่เตือน');
  Fodlan.onEndTurn(() => 1); match.roundNumber += 1;
  assert.equal(a.hp, 18); assert.equal(b.hp, 20); assert.equal(c.hp, 20);
  assert.equal(st().nt11.zone.depth, 2);
  a.pos = { x: 2, y: 9 }; // ระยะขอบ 2 → วงที่ 3 กลืน
  Fodlan.onEndTurn(() => 1); match.roundNumber += 1;
  assert.equal(a.hp, 16);
  a.pos = { x: 3, y: 2 }; // ในดงแพลงก์ตอน = ในแสง
  Fodlan.onEndTurn(() => 1); match.roundNumber += 1;
  assert.equal(a.hp, 16);
  assert.equal(Fodlan.publicInfo().board.abyss.zone, null, 'ครบ 3 เทิร์นสงบ');
});

test('ร่องหายใจ: ทุก 4 เทิร์นดงแพลงก์ตอนบาน ส่องไกล 2 ช่อง (เทิร์นอื่น 1 ช่อง) · ประกาศตอนจบเทิร์นก่อนหน้า', () => {
  const [a] = setup();
  a.pos = { x: 15, y: 12 };
  match.roundNumber = 27;
  assert.ok(!new Set(Fodlan.vision(a)).has('3,5'), 'ปกติดง NW ส่อง 1 ช่อง');
  Fodlan.onEndTurn(() => 1);
  assert.ok(st().fx.some((e) => e.kind === 'nt_bloom'));
  match.roundNumber = 28;
  assert.equal(Fodlan.publicInfo().board.abyss.bloom, true);
  assert.ok(new Set(Fodlan.vision(a)).has('3,5'), 'บาน = ส่อง 2 ช่อง');
});
