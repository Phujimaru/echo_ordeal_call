// Nautilus ชั้น 3 ปล่องภูเขาไฟใต้ทะเล — ลูกเล่นโต้ตอบ (server/fodlan/ntVents.js · GRID_PLAN §8.9 "ลูกเล่นโต้ตอบชุดใหม่")
//  บิดหัวปล่อง แนว 4 ดาเมจ 3 + ลุกไหม้ · อุดปล่อง → ต้นเทิร์นถัดไประเบิด 3×3 ดาเมจ 4 · กลิ้งหินลาวา ทับทั้งแนว ดาเมจ 3 + ลุกไหม้ · ปล่องแรงดัน ดีดไปตกข้างศัตรู ดาเมจ 2 + ผลัก
//  ปล่องพ่นเป็นจังหวะ (เตือนก่อน) · รอยแยกลาวา ลุกไหม้ · ผลักลงลาวา/ปล่อง/หลุมยุบ · ความมืด (ระยะเดิน + ทีม + แสงลาวา) · ภูเขาไฟปะทุ · แผ่นดินไหว (พื้นแตกไม่ตัดทาง)
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const match = require('../server/match.js');
const Fodlan = require('../server/fodlan.js');
const timers = require('../server/timers.js');
const V = require('../server/fodlan/ntVents.js');
const kit = require('../server/fodlan/ntKit.js');
const M9 = require('../server/fodlan/map9.js');
const O2 = require('../server/fodlan/nautilusO2.js');

const realRandom = Math.random;
const realStart = timers.startPhaseTimer;
function setup(n = 3) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  for (let i = 0; i < n; i++) engine.players['p' + i] = { id: 'p' + i, name: 'P' + i, position: i + 1, characterId: 'dummy', alive: true, connected: true, cards: [], statuses: {}, statusAmt: {}, seen: {}, inventory: [] };
  engine.setGameMode('ffa');
  match.world = 'nautilus';
  match.nautilusWhale = false;
  process.env.ECHO_DEV_START_ROUND = '13'; // เทิร์น 13 = ชั้น 3 (ด่าน 9)
  Math.random = () => 0.99; // ไม่หลบ (เทสต์ดาเมจตรงตัว)
  engine.startMatch();
  delete process.env.ECHO_DEV_START_ROUND;
  engine.clearPhaseTimer();
  const P = Object.values(match.players);
  for (const p of P) { p.hp = 20; p.maxHp = 20; p.armor = 0; p.statuses = {}; p.statusAmt = {}; p.pos = null; }
  // วางทุกคนไว้มุมห่างๆ ก่อน (เทสต์ย้ายเอง)
  P.forEach((p, i) => { p.pos = { x: 2 + i, y: 15 }; });
  return P;
}
function act(p) { match.gameState = 'ACTION'; match.actorId = p.id; match.action = { locked: false }; p.didAttackRound = false; }
const ctx = () => Fodlan.makeCtx();
const st = () => Fodlan.stageState();
const s9 = () => st().nt9;
const burn = (p) => p.statuses.hburn || 0;

test.beforeEach(() => { timers.startPhaseTimer = () => {}; });
test.afterEach(() => { Math.random = realRandom; timers.startPhaseTimer = realStart; engine.clearPhaseTimer(); });
test.after(() => { match.world = 'earth'; match.fodlan = null; match.nautilusWhale = undefined; for (const id of Object.keys(engine.players)) delete engine.players[id]; });

test('ผัง: 20×16 · จุดเกิด 7 · ท่าจอดว่าง · ทุกช่องเดินได้ถึงกัน (รวมตอนหินลาวาอยู่ครบ)', () => {
  setup();
  assert.equal(Fodlan.stageNow(), 9);
  const m = M9.map, D = M9.DOCK;
  assert.equal(m.cols, 20); assert.equal(m.rows, 16);
  assert.equal(m.spawns.length, 7);
  assert.deepEqual(m.shopSpots, []);
  const all = [...Object.values(m.terrain).flat(), ...Object.values(m.special).flat(), ...m.heal, ...m.spawns];
  for (const [x, y] of all) assert.ok(!(x >= D.x && x < D.x + D.w && y >= D.y && y < D.y + D.h), `ท่าจอดว่าง (${x},${y})`);
  assert.ok(M9.TERRAIN.fd_nt_whale);
  const map = ctx().map(), Board = ctx().Board;
  for (const r of V.ROCK_SPOTS) assert.equal(map.terrain[kit.K(r.x, r.y)], 'fd_nt_lavarock', 'หินลาวาเป็นสิ่งกีดขวาง');
  const walk = [];
  for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) if (!Board.isObstacle(map, x, y)) walk.push(kit.K(x, y));
  const set = new Set(walk), seen = new Set([walk[0]]), q = [walk[0]];
  while (q.length) { const [x, y] = q.pop().split(',').map(Number); for (const [dx, dy] of kit.DIRS) { const k = kit.K(x + dx, y + dy); if (set.has(k) && !seen.has(k)) { seen.add(k); q.push(k); } } }
  assert.equal(seen.size, set.size, `ช่องที่ไปไม่ถึง: ${walk.filter((k) => !seen.has(k)).join(' ')}`);
  assert.equal(V.VENTS.length, 6);
  assert.equal(V.PVENTS.length, 4);
});

test('บิดหัวปล่อง: น้ำเดือดแนว 4 ทะลุทุกคน ดาเมจ 3 + ลุกไหม้ · คนบิดไม่โดน · ปล่องพัก', () => {
  const [a, b, c] = setup();
  // ปล่อง (4,8): แนวขวา (5,8)…(8,8)? (7,8) = ลาวา → หยุด · ใช้แนวลง (4,9)…(4,12)
  a.pos = { x: 3, y: 8 }; b.pos = { x: 4, y: 10 }; c.pos = { x: 4, y: 12 };
  act(a);
  const hud = Fodlan.hudActions(a).find((h) => h.key === 'fd:l9:jet');
  assert.ok(hud && !hud.disabled);
  assert.ok(hud.tiles.some((t) => t.x === 4 && t.y === 12));
  assert.equal(Fodlan.charAction(a.id, 'fd:l9:jet', { x: 4, y: 11 }), true);
  assert.equal(b.hp, 17); assert.equal(c.hp, 17); assert.equal(a.hp, 20);
  assert.ok(burn(b) > 0 && burn(c) > 0);
  act(a);
  assert.ok(Fodlan.hudActions(a).find((h) => h.key === 'fd:l9:jet').disabled, 'ปล่องพัก');
});

test('อุดปล่อง: เตือน 3×3 ทันที → ต้นเทิร์นถัดไประเบิด ดาเมจ 4', () => {
  const [a, b] = setup();
  a.pos = { x: 13, y: 7 }; b.pos = { x: 15, y: 8 }; // ปล่อง (14,7)
  act(a);
  assert.equal(Fodlan.charAction(a.id, 'fd:l9:plug'), true);
  const warn = Fodlan.publicInfo().board.warn.filter((w) => w.kind === 'plug');
  assert.equal(warn.length, 8);
  assert.equal(b.hp, 20);
  const secs = V.preRound(ctx(), st());
  assert.ok(secs > 0);
  assert.equal(b.hp, 16);
  assert.equal(a.hp, 16, 'คนอุดยืนในวงก็โดน');
  assert.ok(!s9().vents.find((v) => v.x === 14 && v.y === 7).plug);
});

test('กลิ้งหินลาวา: กลิ้งออกจากตัวทับทุกคนในแนว ดาเมจ 3 + ลุกไหม้ · หินหาย แล้วกลับที่เดิมหลัง 3 เทิร์น', () => {
  const [a, b, c] = setup();
  // หิน (6,3): ยืน (6,2) ผลักลงใต้ → (6,4)…(6,9)
  a.pos = { x: 6, y: 2 }; b.pos = { x: 6, y: 5 }; c.pos = { x: 6, y: 8 };
  act(a);
  const hud = Fodlan.hudActions(a).find((h) => h.key === 'fd:l9:roll');
  assert.ok(hud && !hud.disabled);
  assert.equal(Fodlan.charAction(a.id, 'fd:l9:roll', { x: 6, y: 4 }), true);
  assert.equal(b.hp, 17); assert.equal(c.hp, 17);
  assert.ok(burn(b) > 0);
  assert.ok(!ctx().map().terrain['6,3'], 'หินกลิ้งออกไปแล้ว');
  match.roundNumber += 3; V.onEndTurn(ctx(), st());
  assert.equal(ctx().map().terrain['6,3'], 'fd_nt_lavarock', 'หินกลับมา');
});

test('ปล่องแรงดัน: ดีดไปตกข้างศัตรู ทุกคนรอบจุดตก ดาเมจ 2 + ผลักออก · ผลักลงลาวาได้', () => {
  const [a, b, c] = setup();
  // ปล่องแรงดัน (16,8) → ศัตรูที่ (13,9)? ใช้ (12,7): ข้างลาวา (11,7)? (11,7) = รอยแยก · ลาวา (10,7)
  a.pos = { x: 16, y: 8 };
  b.pos = { x: 12, y: 9 }; c.pos = { x: 18, y: 8 };
  act(a);
  const hud = Fodlan.hudActions(a).find((h) => h.key === 'fd:l9:launch');
  assert.ok(hud && !hud.disabled);
  assert.ok(hud.tiles.some((t) => t.x === 12 && t.y === 9));
  assert.equal(Fodlan.charAction(a.id, 'fd:l9:launch', { x: 12, y: 9 }), true);
  assert.notDeepEqual(a.pos, { x: 16, y: 8 }, 'ตัวเองลอยไปตก');
  assert.ok(Math.abs(a.pos.x - 12) <= 1 && Math.abs(a.pos.y - 9) <= 1);
  assert.equal(b.hp, 18);
  assert.equal(c.hp, 20, 'คนไกลไม่โดน');
  // ผลักลงลาวา: ยืนข้างทะเลสาบลาวา (11,8)=รอยแยก ผลักไปทางตะวันตก (10,8)=ลาวา
  c.pos = { x: 11, y: 8 }; c.hp = 20; c.statuses = {};
  kit.shove(ctx(), c, -1, 0, 1, V.hazardAt, null);
  assert.deepEqual(c.pos, { x: 11, y: 8 }, 'ไม่จมหาย — ลวกแล้วเด้งกลับ');
  assert.equal(c.hp, 17);
  assert.equal(burn(c), 2);
});

test('ผลักชนปล่อง = ลวก 2 + ลุกไหม้ · ผลักลงหลุมยุบ = ดาเมจ 3 + ออกซิเจน −2 + สตั้น + โผล่จุดเกิด', () => {
  const [a, b] = setup();
  a.pos = { x: 3, y: 8 }; // ปล่อง (4,8) ทางตะวันออก
  kit.shove(ctx(), a, 1, 0, 1, V.hazardAt, null);
  assert.equal(a.hp, 18); assert.ok(burn(a) > 0);
  b.pos = { x: 13, y: 12 }; // หลุมยุบ (14,12)
  const o0 = O2.get(ctx(), b);
  kit.shove(ctx(), b, 1, 0, 1, V.hazardAt, null);
  assert.equal(b.hp, 17);
  assert.equal(O2.get(ctx(), b), o0 - 2);
  assert.ok((b.statuses.stun || 0) > 0);
  assert.ok(M9.map.spawns.some(([x, y]) => x === b.pos.x && y === b.pos.y));
});

test('ปล่องพ่นเป็นจังหวะ: เข้าชั้นแล้วเตือน 2 ปล่อง · ต้นเทิร์นแรกยังไม่พ่น · ต้นเทิร์นถัดไปพ่น วงรอบปล่อง ดาเมจ 1 + ลุกไหม้ · เตือนชุดใหม่', () => {
  const [a] = setup();
  const s = s9();
  assert.equal(s.ventWarn.ids.length, 2);
  const v = s.vents.find((q) => q.id === s.ventWarn.ids[0]);
  const spot = kit.area(ctx(), v.x, v.y, 1).find((t) => !(t.x === v.x && t.y === v.y) && !ctx().Board.isObstacle(ctx().map(), t.x, t.y));
  a.pos = { ...spot };
  assert.ok(Fodlan.publicInfo().board.warn.some((w) => w.kind === 'vent' && w.x === spot.x && w.y === spot.y), 'ช่องเตือน');
  match.roundNumber = s.ventWarn.for - 2; // ต้นเทิร์นก่อนถึงกำหนด
  st().preRoundDone = 0;
  V.preRound(ctx(), st());
  assert.equal(a.hp, 20);
  match.roundNumber += 1;
  V.preRound(ctx(), st());
  assert.equal(a.hp, 19); assert.ok(burn(a) > 0);
  assert.ok(s.ventWarn && !s.ventWarn.ids.includes(v.id), 'ชุดถัดไปเป็นปล่องอื่น');
});

test('รอยแยกลาวา: จบตาบนรอยแยก = ลุกไหม้ 1', () => {
  const [a] = setup();
  a.pos = { x: 9, y: 13 }; // รอยแยกใต้
  V.onUnitEnd(ctx(), st(), a);
  assert.equal(burn(a), 1);
});

test('ความมืด: เห็นแค่ระยะเดิน + เพื่อนร่วมทีม + แสงลาวา · ศัตรูในที่มืดถูกซ่อน · ตีแล้วโผล่', () => {
  const [a, b, c] = setup();
  match.gameState = 'PLAYING';
  a.pos = { x: 1, y: 15 }; // มุมลาดเถ้า มืด
  b.pos = { x: 17, y: 4 }; // ทุ่งปล่องควันดำไกล (ไม่ใช่ช่องสว่าง)
  c.pos = { x: 9, y: 10 }; // ข้างทะเลสาบลาวา = สว่าง
  const vis = new Set(V.vision(ctx(), st(), a));
  assert.ok(vis.has('1,15'));
  assert.ok(!vis.has('17,4'));
  assert.ok(vis.has('9,10'), 'แสงลาวา');
  assert.equal(V.hides(ctx(), st(), a, b), true);
  assert.equal(V.hides(ctx(), st(), a, c), false);
  b.exposedRound = match.roundNumber;
  assert.equal(V.hides(ctx(), st(), a, b), false, 'ตีแล้วโผล่จนจบเทิร์น');
});

test('ภูเขาไฟใต้ทะเลปะทุ: เตือนหินร้อน → ตก ดาเมจ 2 + ลุกไหม้ · ชุดเตือนถัดไป = ทุกปล่อง', () => {
  const [a] = setup();
  Fodlan.startWeather('nt_eruption');
  const s = s9();
  assert.ok(s.rockWarn && s.rockWarn.tiles.length >= 3);
  a.pos = { ...s.rockWarn.tiles[0] };
  assert.ok(Fodlan.publicInfo().board.warn.some((w) => w.kind === 'hotrock'));
  match.roundNumber += 1;
  V.preRound(ctx(), st());
  assert.ok(a.hp <= 18, `โดนหินร้อน (hp ${a.hp})`);
  assert.ok(burn(a) > 0);
  assert.ok(s.ventWarn.all, 'ปล่องพ่นพร้อมกัน');
  assert.equal(Fodlan.publicInfo().board.vents.eruption, true);
});

test('แผ่นดินไหว: หินหล่นจุดเตือน ดาเมจ 2 · พื้นแตกเป็นหลุม (คนบนนั้นตก) · ไม่ตัดทางเดิน · สูงสุด 8 จุด', () => {
  const [a, b] = setup();
  Fodlan.startWeather('nt_quake');
  const s = s9();
  s.ventWarn = null; s.pulse = 0;
  assert.ok(s.quakeWarn && s.quakeWarn.tiles.length === 3);
  assert.ok(s.crackWarn && s.crackWarn.tiles.length === 2);
  a.pos = { ...s.quakeWarn.tiles[0] };
  b.pos = { ...s.crackWarn.tiles[0] };
  match.roundNumber += 1;
  V.preRound(ctx(), st());
  assert.equal(a.hp, 18);
  assert.equal(b.hp, 17, 'ตกรอยแยก');
  assert.equal(s.cracks.length, 2);
  assert.equal(ctx().map().terrain[s.cracks[0]], 'fd_nt_crack');
  for (let i = 0; i < 6; i++) { match.roundNumber += 1; V.preRound(ctx(), st()); }
  assert.ok(s.cracks.length <= 8);
  const map = ctx().map(), Board = ctx().Board;
  const walk = [];
  for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) if (!Board.isObstacle(map, x, y)) walk.push(kit.K(x, y));
  const set = new Set(walk), seen = new Set([walk[0]]), q = [walk[0]];
  while (q.length) { const [x, y] = q.pop().split(',').map(Number); for (const [dx, dy] of kit.DIRS) { const k = kit.K(x + dx, y + dy); if (set.has(k) && !seen.has(k)) { seen.add(k); q.push(k); } } }
  assert.equal(seen.size, set.size, 'ทางเดินยังถึงกันหมด');
});
