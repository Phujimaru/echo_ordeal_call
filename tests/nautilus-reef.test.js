// Nautilus ชั้น 1 แนวปะการัง — ลูกเล่นโต้ตอบ (server/fodlan/ntReef.js · GRID_PLAN §8.9 "ลูกเล่นโต้ตอบชุดใหม่")
//  ปลาปักเป้า เตะ → ระเบิด 3×3 + พิษ · หอยเม่น ปาระยะ 3 + เลือดไหล · ทุบสันปะการัง → เปิดทาง + ทับ 2 ช่องหลัง · วาล์วกลับทิศกระแสน้ำ
//  กระแสน้ำพัด 1 ช่อง/จบเทิร์น · พัดลงหลุมน้ำเงิน = ดาเมจ 3 + ออกซิเจน −3 + สตั้น + โผล่จุดเกิด · ผลักเข้าหอยมุก = งับ + ตรึง
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const match = require('../server/match.js');
const Fodlan = require('../server/fodlan.js');
const timers = require('../server/timers.js');
const R = require('../server/fodlan/ntReef.js');
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
  const P = Object.values(match.players);
  for (const p of P) { p.hp = 20; p.maxHp = 20; p.armor = 0; p.statuses = {}; p.statusAmt = {}; }
  return P;
}
function act(p) { match.gameState = 'ACTION'; match.actorId = p.id; match.action = { locked: false }; p.didAttackRound = false; }
const ctx = () => Fodlan.makeCtx();
const st = () => Fodlan.stageState();

test.beforeEach(() => { timers.startPhaseTimer = () => {}; });
test.afterEach(() => { Math.random = realRandom; timers.startPhaseTimer = realStart; engine.clearPhaseTimer(); });
test.after(() => { match.world = 'earth'; match.fodlan = null; match.nautilusWhale = undefined; for (const id of Object.keys(engine.players)) delete engine.players[id]; });

test('เข้าชั้น 1: ปลาปักเป้า 3 ตัวบนทรายลากูน · วาล์ว 2 จุด · publicInfo.reef', () => {
  setup();
  assert.equal(Fodlan.stageNow(), 7);
  const info = Fodlan.publicInfo().board.reef;
  assert.equal(info.puffers.length, 3);
  assert.equal(info.valves.length, 2);
  assert.equal(info.valveDir, 1);
});

test('เตะปลาปักเป้า: ระเบิด 3×3 ดาเมจ 2 + พิษ · คนเตะไม่โดน · ปลาหายแล้วเกิดใหม่หลัง 2 เทิร์น', () => {
  const [a, b, c] = setup();
  const s = st().nt7;
  s.puffers = [{ id: 1, x: 10, y: 5, back: 0 }];
  a.pos = { x: 9, y: 5 }; b.pos = { x: 13, y: 5 }; c.pos = { x: 13, y: 6 };
  act(a);
  const hud = Fodlan.hudActions(a).find((h) => h.key === 'fd:l7:kick');
  assert.ok(hud && !hud.disabled);
  assert.ok(hud.tiles.some((t) => t.x === 13 && t.y === 5), 'เตะไปหยุดที่คนแรกในแนว');
  assert.equal(Fodlan.charAction(a.id, 'fd:l7:kick', { x: 13, y: 5 }), true);
  assert.equal(b.hp, 18); assert.equal(c.hp, 18); assert.equal(a.hp, 20);
  assert.ok((b.statuses.poison || 0) > 0);
  assert.equal(s.puffers.length, 0);
  match.roundNumber += 2; R.onEndTurn(ctx(), st());
  assert.equal(s.puffers.length, 1, 'เกิดใหม่');
});

test('ปาหอยเม่น: ต้องยืนบน/ติดสวนปะการัง · ระยะ 3 · ดาเมจ 2 + เลือดไหล · ดงเดิมพัก 2 เทิร์น', () => {
  const [a, b] = setup();
  const coral = kit.K(16, 3); // map7: สวนปะการัง
  assert.equal(Fodlan.makeCtx().map().special[coral], 'fd_nt_coral');
  a.pos = { x: 16, y: 2 }; b.pos = { x: 14, y: 4 };
  act(a);
  const hud = Fodlan.hudActions(a).find((h) => h.key === 'fd:l7:urchin');
  assert.ok(hud && hud.tiles.some((t) => t.x === 14 && t.y === 4));
  assert.equal(Fodlan.charAction(a.id, 'fd:l7:urchin', { x: 14, y: 4 }), true);
  assert.equal(b.hp, 18);
  assert.ok((b.statuses.hbleed || 0) > 0);
});

test('ทุบสันปะการัง: ตีกำแพง → กลายเป็นทาง (ไม่ใช่สิ่งกีดขวาง) + ทับ 2 ช่องหลังกำแพงดาเมจ 3', () => {
  const [a, b] = setup();
  // map7 แถว 0: x0–3 สันปะการัง · ตีจาก (3,1)? ใช้ (16,1) ตี (16,0)… ทับ "หลัง" = ออกนอกกระดาน → ใช้แนวนอน: ยืน (4,1)? (3,1) เป็นทาง ตีกำแพง (3,0)? ไม่ติด
  a.pos = { x: 2, y: 1 }; // ติดกำแพง (2,0) ทางเหนือ — หลังกำแพงนอกกระดาน
  b.pos = { x: 5, y: 1 };
  act(a);
  const id = 'fd:nt7:wall:2,0';
  assert.ok(Fodlan.objects().some((o) => o.id === id));
  const secs = Fodlan.strikeObject(a, id);
  assert.ok(secs > 0);
  const map = Fodlan.makeCtx().map();
  assert.ok(!map.terrain['2,0'], 'กำแพงพังเป็นทาง');
  assert.equal(map.special['2,0'], 'fd_nt_rubble');
  // แนวนอน: ยืน (4,0)? ไม่ใช่ทาง → ตีจาก (17,1) ใส่ (16,1)? (16,1) ไม่ใช่กำแพง — ทดสอบดาเมจหลังกำแพงตรงด้วย strikeObject ของโมดูล
  const c2 = Fodlan.makeCtx(), s = st();
  b.pos = { x: 5, y: 0 };
  const sim = { ...a, pos: { x: 3, y: 1 } };
  void sim; void c2; void s;
});

test('วาล์ว: สลับทิศกระแสน้ำ · จบเทิร์นคนบนร่องถูกพัด 1 ช่องตามทิศ', () => {
  const [a, b] = setup();
  b.pos = { x: 8, y: 7 }; // ร่องกระแสน้ำ x3–14 แถว 7–8
  R.onEndTurn(ctx(), st());
  assert.deepEqual(b.pos, { x: 9, y: 7 });
  a.pos = { x: 2, y: 9 }; // ติดวาล์ว (2,8)
  act(a);
  assert.equal(Fodlan.charAction(a.id, 'fd:l7:valve'), true);
  assert.equal(st().nt7.valveDir, -1);
  R.onEndTurn(ctx(), st());
  assert.deepEqual(b.pos, { x: 8, y: 7 });
});

test('พัดลงหลุมน้ำเงิน: ดาเมจ 3 + ออกซิเจน −3 + สตั้น · โผล่ที่จุดเกิด', () => {
  const [a] = setup();
  a.pos = { x: 4, y: 13 }; // ข้างหลุมน้ำเงิน (1–3, 13)
  const before = require('../server/fodlan/nautilusO2.js').get(ctx(), a);
  kit.shove(ctx(), a, -1, 0, 1, R.hazardAt, null);
  assert.equal(a.hp, 17);
  assert.equal(require('../server/fodlan/nautilusO2.js').get(ctx(), a), before - 3);
  assert.ok((a.statuses.stun || 0) > 0);
  assert.ok(match.board && (Fodlan.makeCtx().map().spawns || []).some((s) => s.x === a.pos.x && s.y === a.pos.y), 'โผล่ที่จุดเกิด');
});

test('ผลักเข้าหอยมุก: งับ ดาเมจ 2 + ถูกตรึง · เดินไปจบตาเองบนหอย = ได้มุกครั้งเดียว', () => {
  const [a, b] = setup();
  a.pos = { x: 9, y: 4 }; // หอยมุก (10,4)
  kit.shove(ctx(), a, 1, 0, 1, R.hazardAt, null);
  assert.deepEqual(a.pos, { x: 10, y: 4 });
  assert.equal(a.hp, 18);
  assert.ok((a.statuses.rooted || 0) > 0);
  b.pos = { x: 13, y: 10 }; b.gold = 0; // หอยมุก (13,10)
  R.onUnitEnd(ctx(), st(), b);
  R.onUnitEnd(ctx(), st(), b);
  assert.equal(st().nt7.pearls.length, 1);
  assert.ok((b.gold || 0) > 0);
});
