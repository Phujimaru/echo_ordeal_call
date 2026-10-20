// ไจโร เซปเปลี่ (gyro_zeppeli) — ลูกเหล็ก / กลับคืนเจ้าของ / วิชาลับไจโร / การหมุนที่สมบูรณ์แบบ / สัดส่วนทองคำ / ม้าวาลคิรี
//  กติกา: GRID_PLAN.md §7.11 (ผู้ใช้ตัดสิน 2026-10-20)
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const gyro = require('../../characters/gyro_zeppeli.js');
const { CHAR_BY_ID } = require('../../characters.js');
const action = require('../../server/phases/action.js');

const realRandom = Math.random;
const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
// list = [[id, characterId, x, y, teamId?], ...] — แถว y = 7 / 8 ของภูมิภาค I โล่งทั้งแถว (จุดฟื้นฟูที่ x = 6, 7 แถว 7)
function setup(list, mode = 'ffa') {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, ch, , , team], i) => { engine.players[id] = blank(id, ch, i + 1, team || null); });
  engine.setGameMode(mode);
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setJourneyArea(1);
  engine.setCycleShift(0);
  engine.setShopPos(null);
  engine.setRoundNumber(2);
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
const fxOf = (kind) => calls.fx.filter((f) => f.event === 'gyroFx' && f.payload.kind === kind).map((f) => f.payload);
const sounds = () => calls.sfx.map((c) => c.s);

const saved = {
  triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash,
  notifyTransform: engine.notifyTransform, sfx: engine.sfx, boardFx: engine.boardFx,
};
const calls = { fx: [], sfx: [] };
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = () => {};
  engine.skillFlash = () => {};
  engine.notifyTransform = () => {};
  engine.sfx = (s, onlyFor, extra) => calls.sfx.push({ s, voice: extra && extra.voice });
  engine.boardFx = (event, payload) => calls.fx.push({ event, payload });
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.beforeEach(() => { for (const k of Object.keys(calls)) calls[k] = []; Math.random = () => 0.99; });
test.afterEach(() => { Math.random = realRandom; engine.setGameMode('ffa'); engine.setCycleShift(0); engine.setShopPos(null); engine.clearPhaseTimer(); });

// ลำดับเดินจริง: ids ตามลำดับ · เดินผ่านไปจนถึงตาของ actorId (คนก่อนหน้า = hasActed)
function orderUpTo(t, ids, actorId) {
  engine.beginOrder();
  engine.turnOrder.splice(0, engine.turnOrder.length, ...ids);
  flush(t, 6600);
  while (engine.actorId !== actorId && engine.actorId) engine.finishActor();
}

test('ข้อมูล: ระดับยาก · พลังชีวิต 6 เกราะ 2 · เดิน 4 ตี [1, 4] · 0 / 4 / 6 แต้ม · วิชาลับแนว 8×1 · เริ่มเกมขี่ม้า ลูก 2 ลูก', () => {
  const ch = CHAR_BY_ID.gyro_zeppeli;
  assert.equal(ch.name, 'ไจโร เซปเปลี่');
  assert.equal(ch.difficulty, 'hard');
  assert.ok(!ch.unique, 'เลือกซ้ำได้');
  assert.equal(ch.mov, 4);
  assert.deepEqual(ch.range, [1, 4]);
  assert.deepEqual([ch.basic.cost, ch.secondary.cost, ch.ultimate.cost], [0, 4, 6]);
  assert.deepEqual(ch.basic.area, { kind: 'self' });
  assert.deepEqual(ch.secondary.area, { kind: 'line', len: 8, width: 1, hostile: true });
  assert.deepEqual(ch.ultimate.area, { kind: 'self' });
  const P = setup([['G', 'gyro_zeppeli', 2, 7], ['B', 'dummy', 9, 7]]);
  assert.deepEqual([P.G.hp, P.G.armor], [6, 2]);
  assert.equal(engine.movOf(P.G), 5, 'ขี่ม้า เดิน 5');
  assert.deepEqual(engine.rangeOf(P.G), [1, 5]);
  const g = view('B', 'G').gyro;
  assert.deepEqual(Object.keys(g).sort(), ['balls', 'empowered', 'golden', 'hand', 'horseCd', 'horseHp', 'mounted', 'ultCd'].sort(), 'สัญญาข้อมูล §7.11');
  assert.deepEqual(g, { balls: [], hand: 2, golden: 0, mounted: true, horseHp: 3, horseCd: 0, empowered: false, ultCd: 0 });
});

test('ตีปกติ: ใช้ลูก 1 ลูก ลูกตกช่องที่เป้าถูกผลักไป · ส่ง throw · ตีโดนผลักเป้า 1 ช่องหลังฉากตี · เสียงพากย์ตอนตี/โดนตี', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['G', 'gyro_zeppeli', 2, 7], ['B', 'gyro_zeppeli', 7, 8], ['C', 'dummy', 12, 2]]);
  P.B.pos = { x: 5, y: 7 };
  orderUpTo(t, ['G', 'C', 'B'], 'G');
  calls.sfx = [];
  const b0 = vit(P.B) + P.B.gyro.horseHp;
  assert.equal(engine.attackTarget('G', 'B'), true, 'ห่าง 3 ตีได้');
  assert.deepEqual(P.G.gyro.balls.map((b) => [b.x, b.y]), [[6, 7]], 'ลูกตกช่องที่เป้าจะถูกผลักไป');
  assert.equal(gyro.hand(P.G), 1);
  assert.equal(vit(P.B) + P.B.gyro.horseHp, b0 - 1);
  const th = fxOf('throw')[0];
  assert.equal(th.id, 'G');
  assert.ok(th.color);
  assert.deepEqual([th.from, th.to, th.land, th.hit, th.counter, th.empowered], [{ x: 2, y: 7 }, { x: 5, y: 7 }, { x: 6, y: 7 }, true, false, false]);
  assert.ok(sounds().includes('gyro_throw') && sounds().includes('gyro_spin'));
  assert.equal(sounds().filter((s) => s === 'gyro_spin').length, 1, 'ลูกหมุนเล่นครั้งเดียว');
  assert.ok(calls.sfx.some((c) => c.voice === 'G' && gyro.VOICE.strike.includes(c.s)), 'เสียงพากย์ไจโรตี');
  assert.ok(calls.sfx.some((c) => c.voice === 'B' && gyro.VOICE.struck.includes(c.s)), 'เสียงพากย์ไจโรโดนตี');
  assert.equal(engine.buildStateFor('G').attack.byAttackSound, 'gyro_hit');
  assert.deepEqual(P.B.pos, { x: 5, y: 7 }, 'ยังไม่ผลักระหว่างฉากตี');
  flush(t, 3200);
  assert.deepEqual(P.B.pos, { x: 6, y: 7 }, 'ผลักออกจากไจโร 1 ช่อง');
  assert.deepEqual(P.G.gyro.balls.map((b) => [b.x, b.y]), [[6, 7]], 'ลูกอยู่ช่องเดียวกับเป้าหลังผลัก');
  assert.equal(engine.actorId, 'C', 'จบตา');
  // เรียกคืนแล้วโดนเป้าที่ยืนบนลูก (ผู้ใช้สั่ง 2026-10-20)
  const b1 = vit(P.B) + P.B.gyro.horseHp;
  engine.setActor('G');
  engine.useSkill('G', 'basic', []);
  assert.equal(vit(P.B) + P.B.gyro.horseHp, b1 - 1, 'เรียกคืน = เป้าบนช่องลูกโดน 1');
  flush(t, 1000);
});

test('ตีปกติ: ระยะ 5 ตอนขี่ม้า (4 ตอนไม่ขี่) · ไม่มีลูกในมือ = ตีไม่ได้', () => {
  const P = setup([['G', 'gyro_zeppeli', 2, 7], ['B', 'dummy', 7, 7], ['C', 'dummy', 8, 8]]);
  engine.setActor('G');
  assert.equal(action.canStrike(P.G, P.B), true, 'ห่าง 5');
  assert.equal(action.canStrike(P.G, P.C), false, 'ห่าง 7');
  P.G.gyro.mounted = false;
  assert.equal(action.canStrike(P.G, P.B), false, 'ไม่ขี่ = ระยะ 4');
  P.G.gyro.mounted = true;
  P.G.gyro.balls = [{ x: 9, y: 9, seq: 1 }, { x: 9, y: 10, seq: 2 }];
  assert.deepEqual(engine.rangeOf(P.G), [1, 0]);
  assert.equal(engine.attackTarget('G', 'B'), false);
  assert.ok(engine.buildStateFor('G').players.find((p) => p.id === 'G').range[1] < 1);
});

test('ตีปกติ: หลบพ้น = ลูกตกช่องเป้า ไม่ผลัก · ผลักชนสิ่งกีดขวาง = ไม่ขยับ ไม่เสียเพิ่ม', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['G', 'gyro_zeppeli', 7, 2], ['B', 'dummy', 7, 4], ['C', 'dummy', 12, 12]]);
  P.B.pos = { x: 9, y: 2 }; // ด้านหลัง (10, 3)? — ผลักไปทางขวา (10, 2) ว่าง
  engine.applyEvade(P.B, 100);
  orderUpTo(t, ['G', 'C', 'B'], 'G');
  const b0 = vit(P.B);
  engine.attackTarget('G', 'B');
  assert.equal(fxOf('throw')[0].hit, false);
  assert.deepEqual(P.G.gyro.balls.map((b) => [b.x, b.y]), [[9, 2]]);
  flush(t, 3200);
  assert.deepEqual(P.B.pos, { x: 9, y: 2 }, 'หลบพ้น = ไม่ผลัก');
  assert.equal(vit(P.B), b0);
  // ผลักชน: เป้าติดสิ่งกีดขวางด้านหลัง (11, 1 = #) — G (12, 3)? ใช้แนวตั้ง: G (8, 3) ตี B (8, 2) ด้านบน (8, 1) = #
  const Q = setup([['G', 'gyro_zeppeli', 8, 4], ['B', 'dummy', 8, 2], ['C', 'dummy', 12, 12]]);
  orderUpTo(t, ['G', 'C', 'B'], 'G');
  const q0 = vit(Q.B);
  engine.attackTarget('G', 'B');
  flush(t, 3200);
  assert.deepEqual(Q.B.pos, { x: 8, y: 2 }, 'ชนสิ่งกีดขวาง = ไม่ขยับ');
  assert.deepEqual(Q.G.gyro.balls.map((b) => [b.x, b.y]), [[8, 2]], 'ผลักไม่ได้ = ลูกตกช่องเป้า');
  assert.equal(vit(Q.B), q0 - 1, 'ไม่เสียเพิ่ม');
});

test('ตีสวน: เป้าสวนได้ก่อนถูกผลัก (นับระยะที่ช่องเดิม) — ไจโรถอยตามปกติ แล้วเป้าถูกผลัก', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['G', 'gyro_zeppeli', 4, 8], ['B', 'dummy', 5, 8], ['C', 'dummy', 12, 12]]);
  P.B.counterBack = true;
  orderUpTo(t, ['G', 'C', 'B'], 'G');
  engine.attackTarget('G', 'B');
  const card = engine.buildStateFor('G').attack;
  assert.ok(card.counter, 'สวนได้');
  assert.deepEqual(card.push.to, { x: 3, y: 8 }, 'ไจโรถอยปกติ');
  flush(t, 6000);
  assert.deepEqual(P.B.pos, { x: 6, y: 8 }, 'เป้าถูกผลักหลังฉากสวน');
  assert.deepEqual(P.G.gyro.balls.map((b) => [b.x, b.y]), [[6, 8]], 'ลูกอยู่ช่องที่เป้าถูกผลักไป');
});

test('กลับคืนเจ้าของ: 0 แต้ม · ลูกเก่าสุด · เส้นแตะทุกช่อง (ทแยง) ศัตรูบนเส้น −1 · ฟื้น 1 เทิร์นละ ≤ 2 · ไม่ล็อกเดิน ไม่กินโควตา', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['G', 'gyro_zeppeli', 2, 7], ['B', 'dummy', 4, 5], ['C', 'dummy', 3, 6], ['D', 'dummy', 5, 6]]);
  P.G.gyro.balls = [{ x: 9, y: 2, seq: 2 }, { x: 5, y: 4, seq: 1 }];
  P.G.hp = 2;
  engine.setActor('G');
  const v0 = { B: vit(P.B), C: vit(P.C), D: vit(P.D) };
  engine.useSkill('G', 'basic', []);
  assert.equal(P.G.skillPoints, 8);
  assert.deepEqual(P.G.gyro.balls.map((b) => b.seq), [2], 'ลูกเก่าสุด (seq 1) กลับก่อน');
  assert.deepEqual([vit(P.B), vit(P.C), vit(P.D)], [v0.B - 1, v0.C - 1, v0.D], 'ช่องข้างมุมที่เส้นแตะโดนด้วย · นอกเส้นไม่โดน');
  assert.equal(P.G.hp, 3);
  const r = fxOf('recall')[0];
  assert.deepEqual(r.from, { x: 5, y: 4 });
  assert.deepEqual(r.to, { x: 2, y: 7 });
  assert.deepEqual(r.path, gyro.touchLine({ x: 5, y: 4 }, { x: 2, y: 7 }));
  assert.deepEqual(r.hits.sort(), ['B', 'C']);
  assert.ok(sounds().includes('gyro_recall'));
  assert.ok(calls.sfx.some((c) => c.voice === 'G' && c.s === 'gyro_v_skill1'));
  flush(t, 1000);
  assert.equal(engine.gameState, 'ACTION', 'กลับเข้าตาเดิน');
  assert.equal(engine.action.locked, false, 'ไม่ล็อกการเดิน');
  assert.equal(P.G.skillUsedRound, false, 'ไม่กินโควตา');
  engine.useSkill('G', 'basic', []);
  flush(t, 1000);
  assert.equal(P.G.hp, 4);
  assert.equal(gyro.hand(P.G), 2);
  // เทิร์นละไม่เกิน 2
  P.G.gyro.balls = [{ x: 2, y: 9, seq: 9 }];
  engine.useSkill('G', 'basic', []);
  flush(t, 1000);
  assert.equal(P.G.hp, 4, 'ฟื้นครบ 2 แล้ว');
  // ไม่มีลูกบนพื้น = กดไม่ได้
  calls.fx = [];
  engine.useSkill('G', 'basic', []);
  assert.equal(fxOf('recall').length, 0);
  assert.equal(view('G', 'G').skillLocks.basic.locked, true);
  // ใช้โควตาแล้วยังกดได้
  P.G.skillUsedRound = true;
  P.G.gyro.balls = [{ x: 2, y: 9, seq: 10 }];
  engine.useSkill('G', 'basic', []);
  assert.equal(gyro.hand(P.G), 2);
  flush(t, 1000);
});

test('วิชาลับไจโร: 4 แต้ม + ทองคำ 5 · ศัตรูในแนว 8×1 −1 ไป −1 กลับ · ดึงเข้าหา 4 ช่อง (คนใกล้ก่อน · ติดหยุด) · ไม่เสียลูก', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['G', 'gyro_zeppeli', 2, 8], ['B', 'dummy', 6, 8], ['C', 'dummy', 9, 8], ['D', 'dummy', 6, 7], ['E', 'dummy', 11, 8]]);
  engine.setActor('G');
  // ทองคำไม่พอ = ไม่มีอะไรเกิด ไม่เสียแต้ม
  engine.useSkill('G', 'secondary', [], { dir: 'right' });
  assert.equal(P.G.skillPoints, 8);
  assert.equal(view('G', 'G').skillLocks.secondary.locked, true);
  P.G.gyro.golden = 7;
  const v0 = { B: vit(P.B), C: vit(P.C), D: vit(P.D), E: vit(P.E) };
  engine.useSkill('G', 'secondary', [], { dir: 'right' });
  assert.equal(P.G.skillPoints, 4);
  assert.equal(P.G.gyro.golden, 2);
  assert.deepEqual([vit(P.B), vit(P.C)], [v0.B, v0.C], 'ยังไม่ลงตอนกด — ลงตามจังหวะลูก');
  assert.equal(engine.gameState, 'ATTACKING', 'พักฉากเล่นเอฟเฟกต์');
  t.mock.timers.tick(400); // ลูกขาไปผ่าน B (ใกล้) แล้ว ยังไม่ถึง C
  assert.deepEqual([vit(P.B), vit(P.C)], [v0.B - 1, v0.C], 'ขาไปผ่าน B ก่อน');
  t.mock.timers.tick(500); // ขาไปผ่าน C แล้ว ยังไม่วกกลับถึงใคร
  assert.deepEqual([vit(P.B), vit(P.C)], [v0.B - 1, v0.C - 1], 'ขาไปโดนครบ');
  flush(t, 1500); // ตัวจับเวลาจำลองเลื่อนจังหวะที่ตั้งระหว่าง tick ไปรอบถัดไป — รอให้ฉากจบ
  assert.deepEqual([vit(P.B), vit(P.C), vit(P.D), vit(P.E)], [v0.B - 2, v0.C - 2, v0.D, v0.E], 'ขากลับอีกครั้ง · แนว x = 3..10 · นอกแนวไม่โดน');
  const sh = fxOf('secretHit');
  assert.deepEqual(sh.map((h) => [h.targetId, h.leg, h.dmg]), [['B', 'out', 1], ['C', 'out', 1], ['C', 'back', 1], ['B', 'back', 1]], 'เลขขึ้นทีละครั้ง: ไปใกล้→ไกล · กลับไกล→ใกล้');
  assert.deepEqual(sh[0].at, { x: 6, y: 8 }, 'ขึ้นที่ช่องเดิมก่อนถูกดึง');
  assert.deepEqual(P.B.pos, { x: 3, y: 8 }, 'ใกล้สุด: ดึงจนติดไจโร (3 ช่อง)');
  assert.deepEqual(P.C.pos, { x: 5, y: 8 }, 'ดึง 4 ช่อง');
  assert.equal(gyro.hand(P.G), 2, 'ไม่เสียลูก');
  const s = fxOf('secret')[0];
  assert.deepEqual([s.from, s.dir, s.len], [{ x: 2, y: 8 }, 'right', 8]);
  assert.equal(s.tiles.length, 8);
  assert.deepEqual(s.hits.sort(), ['B', 'C']);
  assert.deepEqual(s.pulls, [{ id: 'B', from: { x: 6, y: 8 }, to: { x: 3, y: 8 } }, { id: 'C', from: { x: 9, y: 8 }, to: { x: 5, y: 8 } }]);
  assert.ok(sounds().includes('gyro_secret'));
  assert.ok(calls.sfx.some((c) => c.voice === 'G' && c.s === 'gyro_v_skill2'));
  assert.ok(sounds().includes('gyro_secret_return'), 'เสียงขากลับ');
  assert.equal(engine.gameState, 'ACTION', 'จบฉากแล้วกลับเข้าตาเดิน');
  assert.equal(engine.action.locked, true, 'ใช้สกิลแล้วเดินไม่ได้');
});

test('วิชาลับไจโร: ไม่มีลูกในมือ = กดไม่ได้ · พวกเดียวกันในแนวไม่โดน/ไม่ถูกดึง', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['G', 'gyro_zeppeli', 2, 8, 't1'], ['F', 'dummy', 5, 8, 't1'], ['B', 'dummy', 8, 8, 't2'], ['H', 'dummy', 12, 2, 't2']], 'duo');
  P.G.gyro.golden = 30;
  P.G.gyro.balls = [{ x: 0, y: 0, seq: 1 }, { x: 0, y: 1, seq: 2 }];
  engine.setActor('G');
  engine.useSkill('G', 'secondary', [], { dir: 'right' });
  assert.equal(P.G.skillPoints, 8, 'ไม่มีลูกในมือ');
  P.G.gyro.balls = [{ x: 0, y: 0, seq: 1 }];
  const f0 = vit(P.F);
  engine.useSkill('G', 'secondary', [], { dir: 'right' });
  assert.equal(vit(P.F), f0);
  assert.deepEqual(P.F.pos, { x: 5, y: 8 });
  assert.deepEqual(P.B.pos, { x: 6, y: 8 }, 'ดึงมาติดเพื่อนที่ขวางอยู่');
  flush(t, 2000);
});

test('การหมุนที่สมบูรณ์แบบ: 6 แต้ม + ทองคำ 20 · ลูก 2 + ขี่ม้า · เสริมตีครั้งถัดไป → กระเด็นถึงขอบ ดาเมจ ≤ 6 · ถูกตรึง 2 · คูลดาวน์ 3', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['G', 'gyro_zeppeli', 2, 8], ['B', 'dummy', 5, 8], ['C', 'dummy', 12, 2]]);
  P.G.gyro.golden = 25;
  orderUpTo(t, ['G', 'C', 'B'], 'G');
  calls.sfx = [];
  engine.useSkill('G', 'ultimate', []);
  assert.equal(P.G.skillPoints, 2);
  assert.equal(P.G.gyro.golden, 5);
  assert.equal(P.G.gyro.empowered, true);
  assert.deepEqual(fxOf('golden')[0].at, { x: 2, y: 8 });
  assert.ok(sounds().includes('gyro_golden_charge'));
  assert.ok(calls.sfx.some((c) => c.voice === 'G' && gyro.VOICE.ultimate.includes(c.s)), 'สุ่ม skill3 / voice2_skill3');
  flush(t, 1500);
  assert.equal(engine.gameState, 'ACTION');
  assert.equal(view('B', 'G').gyro.ultCd, 3);
  assert.equal(view('B', 'G').gyro.empowered, true);
  const b0 = vit(P.B);
  engine.attackTarget('G', 'B');
  assert.equal(vit(P.B), b0, 'ลูกแตะยังไม่เสีย — ดาเมจลงตอนชนขอบ');
  assert.equal(engine.buildStateFor('G').attack.byAttackSound, 'gyro_breaker');
  assert.equal(engine.buildStateFor('G').attack.byDeferDmg, true, 'ไม่ขึ้นเลขดาเมจตอนลูกแตะ');
  assert.equal(fxOf('throw')[0].empowered, true);
  assert.equal(P.G.gyro.empowered, false, 'ใช้แล้วหมด');
  flush(t, 3100);
  assert.deepEqual(P.B.pos, { x: 13, y: 8 }, 'ถึงขอบสนาม');
  const br = fxOf('breaker')[0];
  assert.deepEqual([br.targetId, br.from, br.to, br.dist, br.dmg], ['B', { x: 5, y: 8 }, { x: 13, y: 8 }, 8, 6]);
  assert.equal(br.path.length, 8);
  assert.ok(sounds().includes('gyro_fly'));
  assert.equal(engine.gameState, 'ATTACKING', 'พักฉากตามระยะกระเด็น');
  assert.equal(vit(P.B), b0, 'ระหว่างกระเด็นยังไม่เสีย');
  flush(t, 1800);
  assert.equal(vit(P.B), b0 - 6, 'ชนขอบ: กระเด็น 8 ช่อง → ดาเมจสูงสุด 6');
  assert.equal(P.B.statuses.rooted, 2, 'ยังไม่เดิน = 2 เทิร์น');
  assert.equal(engine.actorId, 'C');
});

test('การหมุนที่สมบูรณ์แบบ: ทิศ 8 ทาง · พังสิ่งกีดขวาง · ข้ามสิ่งที่พังไม่ได้ (ร้านค้า) · ดันคนขวางออกข้าง ศัตรู −1 · เป้าที่เดินแล้วตรึงถึงเทิร์นหน้า', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  // แถว 9: สิ่งกีดขวางที่ (4, 9) และ (9, 9)
  const P = setup([['G', 'gyro_zeppeli', 0, 9], ['B', 'dummy', 2, 9], ['C', 'dummy', 6, 9], ['D', 'dummy', 12, 2]]);
  engine.setShopPos({ x: 11, y: 9 });
  P.G.gyro.empowered = true;
  orderUpTo(t, ['B', 'G', 'D'], 'G');
  const c0 = vit(P.C);
  engine.attackTarget('G', 'B');
  flush(t, 6000); // ฉากตี + ระเบิดตอนลูกแตะ + กระเด็น 11 ช่อง แล้วดาเมจลงตอนชนขอบ
  const br = fxOf('breaker')[0];
  assert.deepEqual(br.smashed.map((s) => [s.x, s.y]).sort(), [[4, 9], [9, 9]], 'พังสิ่งกีดขวางตามทาง');
  assert.deepEqual(br.jumps, [{ x: 11, y: 9 }], 'ข้ามร้านค้า');
  assert.deepEqual(P.B.pos, { x: 13, y: 9 });
  assert.equal(br.dmg, 6);
  assert.equal(br.shoves.length, 1);
  assert.equal(br.shoves[0].id, 'C');
  assert.equal(Math.abs(P.C.pos.y - 9), 1, 'ดันออกข้าง');
  assert.equal(P.C.pos.x, 6);
  assert.equal(vit(P.C), c0 - 1, 'ศัตรูที่ถูกดัน −1');
  assert.equal(P.B.statuses.rooted, 3, 'เดินไปแล้วเทิร์นนี้ = นับเทิร์นหน้า');
  // ทิศทแยง: เส้นจากไจโรไปเป้าใกล้ 45° = กระเด็นทแยง
  assert.deepEqual(gyro.dir8({ x: 0, y: 0 }, { x: 3, y: 2 }), { x: 1, y: 1 });
  assert.deepEqual(gyro.dir8({ x: 0, y: 0 }, { x: 3, y: 1 }), { x: 1, y: 0 });
});

test('การหมุนที่สมบูรณ์แบบ: ร้านค้าที่ขอบ = ลงช่องก่อนหน้า · ไม่ได้ตีในตาเดินนั้น = เสริมหมด ไม่คืนแต้ม/ทองคำ · กดไม่ได้เมื่อขาดเงื่อนไข', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['G', 'gyro_zeppeli', 2, 8], ['B', 'dummy', 5, 8], ['C', 'dummy', 12, 2]]);
  engine.setShopPos({ x: 13, y: 8 });
  const plan = gyro.planFlight(engine, P.B, { x: 1, y: 0 });
  assert.deepEqual(plan.to, { x: 12, y: 8 });
  assert.deepEqual(plan.jumps, [{ x: 13, y: 8 }]);
  engine.setShopPos(null);
  engine.setActor('G');
  P.G.gyro.golden = 20;
  P.G.gyro.balls = [{ x: 0, y: 0, seq: 1 }];
  engine.useSkill('G', 'ultimate', []);
  assert.equal(P.G.skillPoints, 8, 'ลูกไม่ครบ 2');
  P.G.gyro.balls = [];
  P.G.gyro.mounted = false;
  engine.useSkill('G', 'ultimate', []);
  assert.equal(P.G.skillPoints, 8, 'ไม่ขี่ม้า');
  P.G.gyro.mounted = true;
  P.G.gyro.golden = 19;
  engine.useSkill('G', 'ultimate', []);
  assert.equal(P.G.skillPoints, 8, 'ทองคำไม่พอ');
  assert.equal(view('G', 'G').skillLocks.ultimate.locked, true);
  P.G.gyro.golden = 20;
  engine.useSkill('G', 'ultimate', []);
  flush(t, 1500);
  assert.equal(P.G.gyro.empowered, true);
  assert.deepEqual([P.G.skillPoints, P.G.gyro.golden], [2, 0]);
  engine.finishActor();
  assert.equal(P.G.gyro.empowered, false, 'จบตาเดินโดยไม่ตี = หมด');
  assert.equal(P.G.gyro.golden, 0, 'ไม่คืนทองคำ');
  engine.setRoundNumber(4);
  P.G.skillPoints = 8; P.G.skillUsedRound = false; P.G.gyro.golden = 20;
  engine.setActor('G');
  engine.useSkill('G', 'ultimate', []);
  assert.equal(P.G.skillPoints, 8, 'คูลดาวน์ 3 เทิร์นนับจากตอนกด (กดเทิร์น 2 → ได้อีกเทิร์น 5)');
  engine.setRoundNumber(5);
  engine.useSkill('G', 'ultimate', []);
  assert.equal(P.G.skillPoints, 2);
  flush(t, 1500);
});

test('การหมุนทองคำ: ขี่ม้าเดิน = + ช่วงเดินตรงยาวสุดของตา · ย้อนเดินคืน · ไม่ขี่ไม่ได้ · สูงสุด 30', (t) => {
  const P = setup([['G', 'gyro_zeppeli', 2, 7], ['B', 'dummy', 12, 12]]);
  P.G.gyro.golden = 3;
  engine.setActor('G');
  gyro.onActorStart(engine, P.G);
  assert.equal(engine.moveTo('G', 7, 7), true, 'ขี่ม้าเดิน 5');
  assert.equal(P.G.gyro.golden, 8);
  assert.deepEqual(fxOf('goldenTick')[0], { kind: 'goldenTick', id: 'G', color: fxOf('goldenTick')[0].color, at: { x: 7, y: 7 }, gain: 5 });
  assert.ok(sounds().includes('gyro_golden_tick'));
  engine.undoMove('G');
  assert.equal(P.G.gyro.golden, 3, 'ย้อนเดิน = คืน');
  engine.moveTo('G', 4, 9);
  assert.equal(P.G.gyro.golden, 3 + gyro.longestRun(engine.action.trail));
  assert.equal(gyro.longestRun([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }]), 2);
  engine.undoMove('G');
  // ทีละก้าว (คีย์บอร์ด)
  engine.moveTo('G', 3, 7, { step: true });
  engine.moveTo('G', 4, 7, { step: true });
  assert.equal(P.G.gyro.golden, 5);
  engine.undoMove('G');
  P.G.gyro.mounted = false;
  engine.moveTo('G', 6, 7);
  assert.equal(P.G.gyro.golden, 3, 'ไม่ขี่ม้า = ไม่ได้');
  engine.undoMove('G');
  P.G.gyro.mounted = true;
  P.G.gyro.golden = 28;
  engine.moveTo('G', 7, 7);
  assert.equal(P.G.gyro.golden, 30, 'สูงสุด 30');
});

test('ม้าวาลคิรี: เลือด 3 รับก่อนเกราะ · ทะลุเกราะ = ทะลุม้า · ม้าตาย = ลงม้า เรียกไม่ได้ 3 เทิร์น แล้วกลับมาเต็ม 3', () => {
  const P = setup([['G', 'gyro_zeppeli', 2, 7], ['B', 'dummy', 12, 12]]);
  engine.dealMixed(P.G, 2);
  assert.deepEqual([P.G.gyro.horseHp, P.G.armor, P.G.hp], [1, 2, 6]);
  engine.dealDirect(P.G, 1);
  assert.deepEqual([P.G.gyro.horseHp, P.G.hp], [1, 5], 'ทะลุเกราะไม่โดนม้า');
  engine.dealMixed(P.G, 2);
  assert.deepEqual([P.G.gyro.horseHp, P.G.armor], [0, 1]);
  assert.equal(P.G.gyro.mounted, false);
  assert.equal(fxOf('horse').at(-1).mode, 'die');
  assert.equal(engine.movOf(P.G), 4);
  assert.deepEqual(engine.rangeOf(P.G), [1, 4]);
  assert.equal(view('B', 'G').gyro.horseCd, 3);
  engine.setActor('G');
  assert.equal(gyro.charAction(engine, P.G, 'horse'), false, 'ยังเรียกไม่ได้');
  assert.equal(view('G', 'G').actions[0].disabled, true);
  engine.setRoundNumber(4);
  assert.equal(view('B', 'G').gyro.horseCd, 1);
  engine.setRoundNumber(5);
  assert.equal(gyro.charAction(engine, P.G, 'horse'), true);
  assert.deepEqual([P.G.gyro.mounted, P.G.gyro.horseHp], [true, 3]);
});

test('ปุ่มขึ้น/ลงม้า: ตาเดินของตัวเองเท่านั้น · ไม่ล็อกการเดิน · ระยะเดินปรับทันที · เลือดม้าเท่าที่เหลือ · เห็นเฉพาะเจ้าตัว', () => {
  const P = setup([['G', 'gyro_zeppeli', 2, 7], ['B', 'dummy', 12, 12]]);
  assert.equal(gyro.charAction(engine, P.G, 'horse'), false, 'นอกตา');
  engine.setActor('G');
  assert.deepEqual(view('G', 'G').actions, [{ key: 'horse', icon: '🐎', name: 'ลงม้า', on: true, cd: 0, disabled: false }]);
  assert.equal(view('B', 'G').actions, undefined, 'คนอื่นไม่เห็นปุ่ม');
  P.G.gyro.horseHp = 2;
  assert.equal(gyro.charAction(engine, P.G, 'horse'), true);
  assert.equal(P.G.gyro.mounted, false);
  assert.equal(engine.movOf(P.G), 4);
  assert.equal(engine.action.locked, false);
  assert.equal(P.G.skillUsedRound, false);
  assert.equal(fxOf('horse').at(-1).mode, 'dismount');
  engine.dealMixed(P.G, 1);
  assert.equal(P.G.gyro.horseHp, 2, 'ไม่ขี่ = ม้าไม่รับดาเมจ');
  assert.equal(P.G.armor, 1);
  gyro.charAction(engine, P.G, 'horse');
  assert.deepEqual([P.G.gyro.mounted, P.G.gyro.horseHp], [true, 2]);
  assert.equal(engine.moveTo('G', 7, 7), true, 'ขึ้นม้ากลางตา = เดินได้ 5 ทันที');
});

test('เปลี่ยนภูมิภาค = ลูกกลับมือ · ตาย = ลูกบนพื้นหาย · ฟื้นจากตาย = มีลูก 2', () => {
  const P = setup([['G', 'gyro_zeppeli', 2, 7], ['B', 'dummy', 12, 12]]);
  P.G.gyro.balls = [{ x: 5, y: 5, seq: 1 }, { x: 6, y: 5, seq: 2 }];
  P.G.gyro.golden = 9;
  engine.placeOnBoard(1);
  assert.deepEqual(P.G.gyro.balls, []);
  assert.equal(P.G.gyro.golden, 9, 'ทองคำไม่หาย');
  P.G.gyro.balls = [{ x: 5, y: 5, seq: 3 }];
  P.G.hp = 0; P.G.armor = 0;
  engine.instantDeath(P.G);
  assert.equal(P.G.alive, false);
  assert.deepEqual(P.G.gyro.balls, []);
  P.G.alive = true; P.G.hp = 3;
  assert.equal(gyro.hand(P.G), 2);
});

test('เสียงพากย์: ถึงตาเดินของไจโร = สุ่ม start_1 / start_2 ทุกครั้ง', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['G', 'gyro_zeppeli', 2, 7], ['B', 'dummy', 12, 12]]);
  assert.ok(P.G);
  orderUpTo(t, ['B', 'G'], 'G');
  const v = calls.sfx.filter((c) => c.voice === 'G');
  assert.equal(v.length, 1);
  assert.ok(gyro.VOICE.turn.includes(v[0].s));
  Math.random = () => 0;
  calls.sfx = [];
  orderUpTo(t, ['G', 'B'], 'G');
  assert.equal(calls.sfx.find((c) => c.voice === 'G').s, 'gyro_v_start_1');
});
