// Nautilus ชั้น 2 ซากเรือรบ — ลูกเล่นโต้ตอบ + สภาพอากาศ (server/fodlan/ntWreck.js · GRID_PLAN §8.9 "ลูกเล่นโต้ตอบชุดใหม่")
//  ปืนใหญ่ยิงแนว 3 + กระเด็น · ถังดินปืน 3×3 ลามต่อ · กว้านโซ่สมอ ฟาดแถว 2 + ลาก 3 · ตัดเชือกรอก ลัง 2×2 ดาเมจ 4 · ปิดประตูกั้นน้ำ = น้ำท่วม O2 −2 จนพังประตู
//  เหยื่อปลาไหลมอเรย์ 2 + เลือดไหล · หีบสมบัติ/หีบกัด · ตัวเรือถล่ม (เตือนก่อน · ไม่ตัดทาง) · ฉากมืด · ฝูงฉลาม · กระแสตะกอนถล่ม · ทุกช่องเดินได้ต่อถึงกัน
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const match = require('../server/match.js');
const Board = require('../server/board.js');
const Fodlan = require('../server/fodlan.js');
const timers = require('../server/timers.js');
const W = require('../server/fodlan/ntWreck.js');
const kit = require('../server/fodlan/ntKit.js');
const O2 = require('../server/fodlan/nautilusO2.js');

const realRandom = Math.random;
const realStart = timers.startPhaseTimer;
function setup(n = 3) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  for (let i = 0; i < n; i++) engine.players['p' + i] = { id: 'p' + i, name: 'P' + i, position: i + 1, characterId: 'dummy', alive: true, connected: true, cards: [], statuses: {}, statusAmt: {}, seen: {}, inventory: [] };
  engine.setGameMode('ffa');
  match.world = 'nautilus';
  match.nautilusWhale = false;
  Math.random = () => 0.99; // ไม่หลบ (เทสต์ดาเมจตรงตัว)
  engine.startMatch();
  engine.clearPhaseTimer();
  match.legStart = 1;
  match.roundNumber = 6;
  Fodlan.maybeAdvance(() => {}, () => 0.99); // ดิ่งลงชั้น 2
  engine.clearPhaseTimer();
  match.roundNumber = 7;
  const P = Object.values(match.players);
  for (const p of P) { p.hp = 20; p.maxHp = 20; p.armor = 0; p.statuses = {}; p.statusAmt = {}; p.pos = null; }
  // วางทุกคนไว้มุมที่ไม่เกี่ยว (ห่างทุกลูกเล่น)
  P.forEach((p, i) => { p.pos = { x: i, y: 15 }; });
  return P;
}
function act(p) { match.gameState = 'ACTION'; match.actorId = p.id; match.action = { locked: false }; p.didAttackRound = false; }
const ctx = () => Fodlan.makeCtx();
const st = () => Fodlan.stageState();
const fxOf = (kind) => (st().fx || []).filter((e) => e.kind === kind);
const hud = (p, key) => Fodlan.hudActions(p).find((h) => h.key === key);

test.beforeEach(() => { timers.startPhaseTimer = () => {}; });
test.afterEach(() => { Math.random = realRandom; timers.startPhaseTimer = realStart; engine.clearPhaseTimer(); });
test.after(() => { match.world = 'earth'; match.fodlan = null; match.nautilusWhale = undefined; for (const id of Object.keys(engine.players)) delete engine.players[id]; });

test('ผังชั้น 2: ทุกช่องเดินได้ต่อถึงกัน · 7 จุดเกิด · ท่าจอดว่าง · ประตู/ลัง/ถัง/กว้าน/รูปลาไหลอยู่ตรงผัง', () => {
  const M = Board.MAPS[Board.NAUTILUS_AREA + 1];
  const seen = new Set([Board.key(M.spawns[0].x, M.spawns[0].y)]), q = [M.spawns[0]];
  while (q.length) {
    const c = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = c.x + dx, y = c.y + dy, k = Board.key(x, y);
      if (seen.has(k) || Board.isObstacle(M, x, y)) continue;
      seen.add(k); q.push({ x, y });
    }
  }
  let free = 0;
  for (let y = 0; y < M.rows; y++) for (let x = 0; x < M.cols; x++) if (!Board.isObstacle(M, x, y)) free++;
  assert.equal(seen.size, free);
  assert.equal(M.spawns.length, 7);
  for (const r of W.ROOMS) for (const d of r.doors) assert.equal(M.special[Board.key(d.x, d.y)], 'fd_nt_door');
  for (const c of W.CRANES) { assert.equal(M.terrain[Board.key(c.post.x, c.post.y)], 'fd_nt_crane'); for (const t of c.area) assert.ok(!Board.isObstacle(M, t.x, t.y), 'ใต้ลังเดินได้'); }
  assert.equal(W.KEGS.length, 7);
  assert.equal(W.LAIRS.length, 4);
  assert.equal(M.terrain[Board.key(W.WINCH.x, W.WINCH.y)], 'fd_nt_winch');
  // ทุกห้องเรือเข้าได้ (ห้องอากาศในห้อง)
  for (const h of M.heal) assert.ok(seen.has(h));
});

test('ปืนใหญ่: ยิงทะลุช่องปืนของตัวเรือ · ทุกคนในแนวดาเมจ 3 + กระเด็น 1 · บรรจุใหม่ 2 เทิร์น', () => {
  const [a, b, c] = setup();
  // ปืน (17,10) ในห้องท้ายเรือ: ยืน (16,10) · ยิงขึ้นเหนือ ทะลุผนัง (17,9) → (17,8) (17,7) …
  a.pos = { x: 16, y: 10 }; b.pos = { x: 17, y: 7 }; c.pos = { x: 17, y: 5 };
  act(a);
  const h = hud(a, 'fd:l8:cannon');
  assert.ok(h && !h.disabled && h.tiles.some((t) => t.x === 17 && t.y === 7));
  assert.equal(Fodlan.charAction(a.id, 'fd:l8:cannon', { x: 17, y: 7 }), true);
  assert.equal(b.hp, 17); assert.equal(c.hp, 17);
  assert.deepEqual(b.pos, { x: 17, y: 6 }); assert.deepEqual(c.pos, { x: 17, y: 4 });
  assert.equal(fxOf('nt8_cannon').length, 1);
  act(a);
  assert.ok(!(hud(a, 'fd:l8:cannon').tiles.some((t) => t.x === 17 && t.y === 7)), 'ปืนนี้กำลังบรรจุ');
  match.roundNumber += 2;
  assert.ok(hud(a, 'fd:l8:cannon').tiles.some((t) => t.x === 17 && t.y === 7));
});

test('ถังดินปืน: ตีแล้วระเบิด 3×3 ดาเมจ 3 ลามถังข้างๆ · คนตีไม่โดน · ถังหายจากกระดาน', () => {
  const [a, b, c] = setup();
  // กลุ่มถัง (12,5) (13,5) (13,6): ตี (12,5) → ลาม (13,5) → ลาม (13,6)
  a.pos = { x: 11, y: 5 }; b.pos = { x: 14, y: 7 }; c.pos = { x: 12, y: 6 };
  act(a);
  assert.ok(Fodlan.objects().some((o) => o.id === 'fd:nt8:keg:12,5'));
  assert.ok(Fodlan.strikeObject(a, 'fd:nt8:keg:12,5') > 0);
  assert.equal(a.hp, 20);
  assert.equal(c.hp, 17, 'โดนครั้งเดียวแม้อยู่ในวงหลายถัง');
  assert.equal(b.hp, 17, 'ถัง (13,6) ลามมาถึง (14,7)');
  const e = fxOf('nt8_keg')[0];
  assert.equal(e.chain.length, 3);
  const map = ctx().map();
  assert.ok(!map.terrain['12,5'] && !map.terrain['13,5'] && !map.terrain['13,6']);
});

test('ผลักคนชนถังดินปืน = ถังระเบิด', () => {
  const [a, b] = setup();
  b.pos = { x: 11, y: 13 - 1 }; // (11,12) ใต้ถัง (11,13)
  kit.shove(ctx(), b, 0, 1, 1, W.hazardAt, a);
  assert.deepEqual(b.pos, { x: 11, y: 12 });
  assert.equal(b.hp, 17);
  assert.equal(fxOf('nt8_keg')[0].chain.length, 2, '(10,13) ลามด้วย');
});

test('กว้านโซ่สมอ: เลือกแถวที่มีคน · ฟาดทั้งแถว ดาเมจ 2 + ลากเข้าหาเสาสมอ 3 ช่อง · พัก 2 เทิร์น', () => {
  const [a, b, c] = setup();
  a.pos = { x: 14, y: 4 }; // ติดกว้าน (15,4)
  b.pos = { x: 9, y: 2 }; c.pos = { x: 19, y: 2 };
  act(a);
  const h = hud(a, 'fd:l8:winch');
  assert.ok(h && !h.disabled && h.tiles.some((t) => t.y === 2) && !h.tiles.some((t) => t.y === 3), 'แถวที่มีคน (+ แถวที่โซ่ชนถังดินปืน)');
  assert.equal(Fodlan.charAction(a.id, 'fd:l8:winch', { x: 9, y: 2 }), true);
  assert.equal(b.hp, 18); assert.equal(c.hp, 18);
  assert.deepEqual(b.pos, { x: 12, y: 2 });
  assert.deepEqual(c.pos, { x: 16, y: 2 });
  act(a);
  assert.ok(hud(a, 'fd:l8:winch').disabled, 'พัก');
});

test('ตัดเชือกรอก: ลังหล่นทับ 2×2 ดาเมจ 4 · กลายเป็นกองลัง (เดิน 2 ก้าว) · ครั้งเดียว', () => {
  const [a, b, c] = setup();
  a.pos = { x: 9, y: 3 }; b.pos = { x: 8, y: 4 }; c.pos = { x: 9, y: 5 };
  act(a);
  assert.ok(Fodlan.strikeObject(a, 'fd:nt8:rope:1') > 0);
  assert.equal(b.hp, 16); assert.equal(c.hp, 16); assert.equal(a.hp, 20);
  assert.equal(ctx().map().special['8,4'], 'fd_nt_cargo');
  assert.ok(!Fodlan.objects().some((o) => o.id === 'fd:nt8:rope:1'));
});

test('ปิดประตูกั้นน้ำ: ปิดทุกประตูของห้อง · คนในห้องออกซิเจน −2 ทุกจบเทิร์น · ห้องอากาศใช้ไม่ได้ · ตีประตูพัง = เปิด', () => {
  const [a, b] = setup();
  a.pos = { x: 8, y: 5 }; // ติดประตู (7,5) ของห้องหัวเรือ
  b.pos = { x: 4, y: 5 };
  act(a);
  const h = hud(a, 'fd:l8:door');
  assert.ok(h && !h.disabled);
  assert.equal(Fodlan.charAction(a.id, 'fd:l8:door'), true);
  let map = ctx().map();
  assert.equal(map.terrain['7,5'], 'fd_nt_doorshut'); assert.equal(map.terrain['5,7'], 'fd_nt_doorshut');
  assert.ok(!map.heal.has('3,5'), 'ห้องอากาศในห้องที่ท่วมใช้ไม่ได้');
  const before = O2.get(ctx(), b);
  W.onEndTurn(ctx(), st());
  assert.equal(O2.get(ctx(), b), before - 2);
  // พังประตูจากในห้อง
  b.pos = { x: 6, y: 5 };
  act(b);
  assert.ok(Fodlan.objects().some((o) => o.id === 'fd:nt8:door:7,5'));
  assert.ok(Fodlan.strikeObject(b, 'fd:nt8:door:7,5') > 0);
  map = ctx().map();
  assert.ok(!map.terrain['7,5'] && !map.terrain['5,7']);
  assert.ok(map.heal.has('3,5'));
  const now = O2.get(ctx(), b);
  W.onEndTurn(ctx(), st());
  assert.equal(O2.get(ctx(), b), now, 'ไม่ท่วมแล้ว');
  // ปิดซ้ำได้หลังพัก 2 เทิร์น
  act(a);
  assert.ok(hud(a, 'fd:l8:door').disabled);
  match.roundNumber += 2;
  assert.ok(!hud(a, 'fd:l8:door').disabled);
  // คนยืนขวางประตู = ปิดไม่ได้
  b.pos = { x: 7, y: 5 };
  assert.ok(hud(a, 'fd:l8:door').disabled);
});

test('เหยื่อปลาไหลมอเรย์: ปาใส่คนใกล้รูปลาไหล · งับ 2 + เลือดไหล · รูนั้นพัก 2 เทิร์น', () => {
  const [a, b] = setup();
  // รูปลาไหล (7,6) · ผู้ปายืน (10,7) · เป้า (9,6) ห่างรู 2
  a.pos = { x: 10, y: 7 }; b.pos = { x: 9, y: 6 };
  act(a);
  const h = hud(a, 'fd:l8:bait');
  assert.ok(h && !h.disabled && h.tiles.some((t) => t.x === 9 && t.y === 6));
  assert.equal(Fodlan.charAction(a.id, 'fd:l8:bait', { x: 9, y: 6 }), true);
  assert.equal(b.hp, 18);
  assert.ok((b.statuses.hbleed || 0) > 0);
  assert.equal(fxOf('nt8_eel')[0].lair.x, 7);
  act(a);
  const h2 = hud(a, 'fd:l8:bait');
  assert.ok(!h2 || !h2.tiles.some((t) => t.x === 9 && t.y === 6), 'รูนี้พัก');
});

test('หีบสมบัติ: จบตาบนหีบ = เปิดครั้งเดียว (เหรียญ) · หีบกัด = ดาเมจ 2 + ตรึง', () => {
  const [a, b] = setup();
  a.pos = { x: 14, y: 6 }; a.gold = 0;
  W.onUnitEnd(ctx(), st(), a); W.onUnitEnd(ctx(), st(), a);
  assert.equal(a.gold, 3);
  assert.equal(st().nt8.chests.length, 1);
  Math.random = () => 0.1;
  b.pos = { x: 4, y: 9 };
  W.onUnitEnd(ctx(), st(), b);
  assert.equal(b.hp, 18);
  assert.ok((b.statuses.rooted || 0) > 0);
});

test('ตัวเรือถล่ม: เทิร์นที่ 2 ของชั้นเตือนช่วงผนัง → ต้นเทิร์นถัดไปเป็นสิ่งกีดขวาง · คนบนช่องโดน 3 แล้วถูกดันออก · ทางเดินยังต่อถึงกัน', () => {
  const [a] = setup();
  match.roundNumber = 7; // ต้นเทิร์น 8 = เทิร์นที่ 2 ของชั้น
  W.preRound(ctx(), st());
  const c = st().nt8.collapse;
  assert.ok(c && c.tiles.length >= 2 && c.for === 9);
  assert.ok(Fodlan.publicInfo().board.warn.some((w) => w.kind === 'collapse'));
  a.pos = { ...c.tiles[0] };
  match.roundNumber = 8;
  const secs = W.preRound(ctx(), st());
  assert.ok(secs > 0);
  const map = ctx().map();
  for (const t of c.tiles) assert.equal(map.terrain[kit.K(t.x, t.y)], 'fd_nt_collapse');
  assert.equal(a.hp, 17);
  assert.ok(!c.tiles.some((t) => t.x === a.pos.x && t.y === a.pos.y), 'ถูกดันออก');
  // ต่อถึงกันทั้งกระดาน
  const open = (x, y) => kit.inB(map, x, y) && !map.terrain[kit.K(x, y)];
  let total = 0, s0 = null;
  for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) if (open(x, y)) { total++; s0 = s0 || { x, y }; }
  const seen = new Set([kit.K(s0.x, s0.y)]), q = [s0];
  while (q.length) { const p = q.shift(); for (const [dx, dy] of kit.DIRS) { const x = p.x + dx, y = p.y + dy; if (open(x, y) && !seen.has(kit.K(x, y))) { seen.add(kit.K(x, y)); q.push({ x, y }); } } }
  assert.equal(seen.size, total);
});

test('ฉากมืดลง: เทิร์นที่ 1–2 ของชั้นสว่าง · เทิร์นที่ 3 = 0.5 · เทิร์นที่ 4 ขึ้นไปมืดสนิท', () => {
  setup();
  match.roundNumber = 8; assert.equal(Fodlan.publicInfo().board.wreck.dark, 0);
  match.roundNumber = 9; assert.equal(Fodlan.publicInfo().board.wreck.dark, 0.5);
  match.roundNumber = 10; assert.equal(Fodlan.publicInfo().board.wreck.dark, 1);
});

test('ฝูงฉลาม: ต้นเทิร์นล็อกคนเลือดน้อยสุด (นอกห้องเรือ) เตือน 3×3 → จบเทิร์นกัดทุกคนในวง 2 + เลือดไหล · หนีออกได้', () => {
  const [a, b, c] = setup();
  st().wxDone = false;
  Fodlan.startWeather('nt_sharks');
  a.hp = 5; a.pos = { x: 9, y: 13 }; b.pos = { x: 10, y: 12 }; c.pos = { x: 4, y: 5 };
  c.hp = 1; // อยู่ในห้องหัวเรือ = ฉลามไม่เข้า
  W.preRound(ctx(), st());
  assert.equal(st().nt8.sharks.id, a.id);
  assert.ok(Fodlan.publicInfo().board.warn.some((w) => w.kind === 'shark'));
  W.onEndTurn(ctx(), st());
  assert.equal(a.hp, 3); assert.equal(b.hp, 18);
  assert.ok((a.statuses.hbleed || 0) > 0);
  // เทิร์นถัดไป: หนีออกจากวง = รอด
  W.preRound(ctx(), st());
  a.pos = { x: 15, y: 15 };
  const hp = a.hp;
  W.onEndTurn(ctx(), st());
  assert.equal(a.hp, hp);
});

test('กระแสตะกอนถล่ม: เตือนแถบลึก 3 จากขอบ → ดาเมจ 2 + ดันเข้าใน 2 · ทิ้งเนินตะกอน (เดิน 2 ก้าว) · กวาด 3 แถบ', () => {
  const [a] = setup();
  st().wxDone = false;
  Math.random = () => 0.99; // สุ่มขอบ = ตะวันตก
  Fodlan.startWeather('nt_silt');
  const sl = st().nt8.silt;
  assert.equal(sl.edge, 'w'); assert.equal(sl.for, 9);
  a.pos = { x: 1, y: 9 };
  match.roundNumber = 7; assert.equal(W.preRound(ctx(), st()), 0, 'ยังไม่ถึงเวลา');
  Math.random = () => 0; // เนินทุกช่องที่ทำได้ (ไม่มีหลบหลีก/ช่องกำบัง = โดนเสมอ)
  match.roundNumber = 8;
  assert.ok(W.preRound(ctx(), st()) > 0);
  assert.equal(a.hp, 18);
  assert.deepEqual(a.pos, { x: 3, y: 9 });
  assert.ok(st().nt8.mounds.length > 0);
  const k = st().nt8.mounds[0];
  assert.equal(ctx().map().special[k], 'fd_nt_mound');
  assert.equal(Board.TERRAIN_INFO.fd_nt_mound.cost, 2);
  assert.equal(st().nt8.silt.step, 1, 'แถบถัดไปเตือนต่อ');
  assert.ok(st().nt8.silt.tiles.every((t) => t.x >= 3 && t.x <= 5));
});

test('ไม่มีลูกเล่นของชั้นอื่นปน: ปุ่ม fd:l8 เฉพาะชั้น 2 · publicInfo.wreck ครบ', () => {
  const [a] = setup();
  const info = Fodlan.publicInfo().board.wreck;
  assert.equal(info.kegs.length, 7);
  assert.equal(info.cannons.length, 4);
  assert.equal(info.cranes.length, 3);
  assert.equal(info.rooms.length, 2);
  assert.equal(info.eels.length, 4);
  a.pos = { x: 0, y: 15 }; act(a);
  assert.ok(!Fodlan.hudActions(a).some((h) => h.key.startsWith('fd:l8:')));
});
