// Ice Spike — บัฟเฉพาะสนาม Eos (GRID_PLAN §7.9 "บัฟเฉพาะ Eos" · characters/ice_spike.js · server/ice.js shockWave)
//  LV ตามแต้มรวม · ไถลชนซ้อนดาเมจ + Shock Wave · ติดตัว 3 Shock Wave · หนามทำงาน = Shock Wave · Ice Surge ทั้งสนาม + หนาม Lv3
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const match = require('../../server/match.js');
const Board = require('../../server/board.js');
const Fodlan = require('../../server/fodlan.js');
const action = require('../../server/phases/action.js');
const timers = require('../../server/timers.js');
const S6 = require('../../server/fodlan/stage6.js');
const Ice = require('../../server/ice.js');
const ice = require('../../characters/ice_spike.js');

const realRandom = Math.random;
const realStart = timers.startPhaseTimer;
const saved = { boardFx: engine.boardFx, sfx: engine.sfx, skillFlash: engine.skillFlash, triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene };
const calls = { fx: [] };
const fxEvents = () => calls.fx.filter((f) => f.event === 'iceFx').flatMap((f) => f.payload.events);
const shocks = () => fxEvents().filter((e) => e.kind === 'shock');
const vit = (p) => (p.hp || 0) + (p.armor || 0);
const nextTick = () => new Promise((r) => setImmediate(r));
const K = Board.key;

function setup() {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  ['ice_spike', 'dummy'].forEach((ch, i) => {
    engine.players['p' + i] = {
      id: 'p' + i, name: 'P' + i, position: i + 1, characterId: ch, alive: true, connected: true,
      cards: [], statuses: {}, statusAmt: {}, seen: {}, inventory: [], teamId: 'A', teamConfirmed: true,
    };
  });
  engine.setGameMode('eos');
  match.world = 'eos';
  engine.startMatch();
  engine.clearPhaseTimer();
  match.gameState = 'PLAYING'; match.actorId = null; match.action = null; match.forcedWinnerId = null;
  // ล้างมอนที่ด่านเกิดเอง — เทสต์วางเอง
  for (const [id, u] of Object.entries(match.players)) if (u.summon) delete match.players[id];
  st().iceSpikePeak = 0; st().score = 0;
  const I = match.players.p0, F = match.players.p1;
  I.skillPoints = 8; I.statuses = {}; I.statusAmt = {};
  return { I, F };
}
const st = () => match.fodlan.s.eos;
const ctx = () => Fodlan.makeCtx();
// พื้นโล่งแนวนอนยาว len ช่อง (ไม่มีสิ่งกีดขวาง/คน/ร้านค้า · ช่องพิเศษได้แค่ถนน/ลาน/ทราย) + แถวบน-ล่าง 2 แถวว่างด้วย
function strip(len) {
  // แผนที่ Eos แน่นมาก — เคลียร์ผังพื้นฐานแถบบน (y 2..8) ให้โล่งก่อน (แก้เฉพาะในโปรเซสเทสต์นี้)
  const base = Board.MAPS[match.board.area];
  for (let y = 2; y <= 8; y++) for (let x = 0; x < base.cols; x++) { delete base.terrain[K(x, y)]; delete base.special[K(x, y)]; }
  match.board.iceVer = (match.board.iceVer || 0) + 1;
  if (st()) st().ver = (st().ver || 0) + 1;
  const map = action.boardMap();
  const PLAIN = new Set([undefined, 'fd_eos_road', 'fd_eos_plaza', 'fd_eos_sand']);
  const clear = (x, y) => Board.inBounds(map, x, y) && !map.terrain[K(x, y)] && PLAIN.has(map.special[K(x, y)]) && action.tileFree(x, y, null)
    && !require('../../server/shop.js').shopAt(x, y);
  for (let y = 3; y < map.rows - 3; y++) for (let x = 1; x + len < map.cols - 1; x++) {
    let ok = true;
    for (let dy = -2; dy <= 2 && ok; dy++) for (let i = 0; i < len && ok; i++) ok = clear(x + i, y + dy);
    if (ok) return { x, y };
  }
  throw new Error('ไม่มีพื้นโล่ง');
}
const mob = (x, y, o = {}) => {
  const r = S6.spawnMob(ctx(), st(), 'daemon', { x, y }, { hp: 20, armor: 0, atk: 1, mov: 3, gold: 0, ...o }, { look: 1, tier: 1 });
  r.summon.born = 0;
  return r;
};
const park = (p, x, y) => { p.pos = { x, y }; };

test.before(() => {
  engine.boardFx = (event, payload) => calls.fx.push({ event, payload });
  engine.sfx = () => {}; engine.skillFlash = () => {}; engine.triggerCutscene = () => {}; engine.queueCutscene = () => {};
});
test.beforeEach(() => { calls.fx = []; Math.random = () => 0.99; timers.startPhaseTimer = (secs) => { match.timeLeft = Math.ceil(secs); }; });
test.afterEach(() => { Math.random = realRandom; timers.startPhaseTimer = realStart; engine.clearPhaseTimer(); });
test.after(() => {
  Object.assign(engine, saved);
  match.world = 'earth'; match.fodlan = null; match.forcedWinnerId = null; match.eosDiff = undefined; engine.setGameMode('ffa');
  for (const id of Object.keys(engine.players)) delete engine.players[id];
});

test('LV ขึ้นทุก 10% ของเป้าแต้มรวม (เริ่ม LV1 · สูงสุด LV5) · ยาก = เป้า 100 · แต้มถูกหักแล้ว LV ไม่ลด · นอก Eos = ไม่มี LV', () => {
  setup();
  match.eosDiff = 'normal';
  const at = (score) => { st().score = score; return ice.eosLv(); };
  assert.equal(at(0), 1);
  assert.equal(at(4), 1);
  assert.equal(at(5), 2);
  assert.equal(at(10), 3);
  assert.equal(at(15), 4);
  assert.equal(at(20), 5);
  assert.equal(at(50), 5);
  assert.equal(at(3), 5, 'ยึดแต้มสูงสุดที่เคยถึง');
  st().iceSpikePeak = 0;
  match.eosDiff = 'hard';
  assert.equal(at(9), 1);
  assert.equal(at(10), 2);
  assert.equal(at(40), 5);
  match.eosDiff = 'normal';
  st().iceSpikePeak = 0; st().score = 0;
  match.world = 'earth';
  assert.equal(ice.eosLv(), 0, 'นอก Eos');
  match.world = 'eos';
  // ค่าตาม LV
  assert.deepEqual(ice.EOS_STACK.slice(1), [6, 12, 18, 24, 30]);
  assert.deepEqual(ice.EOS_SHOCK_R.slice(1), [2, 2, 3, 3, 5]);
});

test('ติดตัว 2 (Eos): ไถลชนมอน = +1 ต่อช่องซ้อนได้ 6 ที่ LV1 · Shock Wave รอบเป้า 50% ระยะ 2 (เป้าไม่โดน · กระเด็น 1) · เพื่อนไม่โดน', () => {
  const { I, F } = setup();
  st().score = 0;
  const s = strip(14);
  park(I, s.x, s.y);
  for (let i = 1; i <= 8; i++) Ice.layIce(s.x + i, s.y, null);
  const T = mob(s.x + 9, s.y);                 // เป้าที่ถูกชน
  const N = mob(s.x + 10, s.y + 1);            // ห่างเป้า 2 = โดนคลื่น
  const FAR = mob(s.x + 12, s.y + 1);          // ห่างเป้า 3 (สี่เหลี่ยม) = ไม่โดน
  const DIAG = mob(s.x + 11, s.y + 2);         // ทแยง 2×2 = ระยะ 2 แบบสี่เหลี่ยม (แมนฮัตตัน 4) = โดน
  park(F, s.x + 9, s.y + 2);                   // เพื่อน ห่างเป้า 2 = ไม่โดน
  const fv = vit(F);
  engine.setActor('p0');
  assert.equal(engine.moveTo('p0', s.x + 1, s.y, { step: true }), true);
  assert.deepEqual(I.pos, { x: s.x + 8, y: s.y }, 'ไถลสุดแนว');
  assert.equal(T.hp, 20 - 6, 'ไถล 8 ช่อง → ซ้อนสูงสุด 6 (LV1)');
  assert.deepEqual(T.pos, { x: s.x + 10, y: s.y }, 'เป้ากระเด็น 1 ช่อง');
  assert.equal(N.hp, 20 - 3, 'Shock Wave 50% ของ 6');
  assert.equal(FAR.hp, 20, 'นอกระยะ');
  assert.equal(DIAG.hp, 20 - 3, 'คลื่นเป็นสี่เหลี่ยมจัตุรัส — มุมทแยงโดน');
  assert.equal(vit(F), fv, 'เพื่อนไม่โดน');
  const sh = shocks();
  assert.equal(sh.length, 1);
  assert.equal(sh[0].r, 2);
  assert.ok(!sh[0].hits.some((h) => h.id === T.id), 'เป้าที่ถูกชนไม่อยู่ในคลื่น');
  const kinds = fxEvents().map((e) => e.kind);
  assert.ok(kinds.indexOf('hit') < kinds.indexOf('shock') && kinds.indexOf('shock') < kinds.lastIndexOf('knock'), 'ชน → คลื่น → กระเด็น');
});

test('ติดตัว 2 (Eos): LV สูงขึ้น = ซ้อนได้มากขึ้น คลื่นแรงขึ้น (50/50/75/75/100% ปัดลง) ระยะกว้างขึ้น · ไถลสั้นปัดลงได้ 0 = ไม่มีคลื่น', () => {
  const { I } = setup();
  st().score = 40; // LV5: ซ้อน 30 · ระยะ 5
  const s = strip(14);
  park(I, s.x, s.y);
  for (let i = 1; i <= 8; i++) Ice.layIce(s.x + i, s.y, null);
  const T = mob(s.x + 9, s.y, { hp: 40 });
  const N = mob(s.x + 9, s.y - 2);
  const M = mob(s.x + 12, s.y + 2); // ห่าง 5
  engine.setActor('p0');
  engine.moveTo('p0', s.x + 1, s.y, { step: true });
  assert.equal(T.hp, 40 - 8, 'ไถล 8 ช่อง = 8 (ไม่ติดเพดาน 30)');
  assert.equal(N.hp, 20 - 8, 'LV5 = 100% ของที่ซ้อนทับ');
  assert.equal(M.hp, 20 - 8, 'ระยะ 5 ที่ LV5');
  // ไถล 1 ช่อง → ดาเมจ 1 · คลื่น 1
  const { I: I2 } = setup();
  calls.fx = [];
  st().score = 0;
  const s2 = strip(6);
  park(I2, s2.x, s2.y);
  Ice.layIce(s2.x + 1, s2.y, null);
  const T2 = mob(s2.x + 2, s2.y), N2 = mob(s2.x + 2, s2.y + 1);
  engine.setActor('p0');
  engine.moveTo('p0', s2.x + 1, s2.y, { step: true });
  assert.equal(T2.hp, 19);
  assert.equal(N2.hp, 20, '50% ของ 1 ปัดลง = 0');
  assert.equal(shocks().length, 0, 'คลื่น 0 = ไม่เกิด');
});

test('ติดตัว 2 (Eos LV.2+): ไถลทะลุศัตรูทุกตัวในแนวจนสุดทาง — ทุกตัวที่ผ่านโดนชน (ช่องที่ไถลมาถึง) + คลื่น ไม่กระเด็น · ตัวขวางปลายทางกระเด็น 1 · LV3 คลื่น 75%', () => {
  const { I, F } = setup();
  st().score = 10; // LV3: ซ้อน 18 · คลื่น 75% · ระยะ 3
  assert.equal(ice.eosLv(), 3);
  const s = strip(12);
  park(I, s.x, s.y);
  for (let i = 1; i <= 8; i++) Ice.layIce(s.x + i, s.y, null);
  const A = mob(s.x + 3, s.y);  // ผ่านเมื่อไถลมาแล้ว 2 ช่อง (ช่องแรก s.x+1, s.x+2)
  const B = mob(s.x + 6, s.y);  // ผ่านเมื่อไถลมาแล้ว 5 ช่อง
  const E = mob(s.x + 9, s.y);  // ขวางปลายแนว
  park(F, s.x + 4, s.y + 3);
  const fv = vit(F);
  engine.setActor('p0');
  assert.equal(engine.moveTo('p0', s.x + 1, s.y, { step: true }), true);
  assert.deepEqual(I.pos, { x: s.x + 8, y: s.y }, 'ไถลทะลุจนสุดแนว');
  assert.deepEqual(A.pos, { x: s.x + 3, y: s.y }, 'ตัวที่ผ่านไม่กระเด็น');
  assert.deepEqual(B.pos, { x: s.x + 6, y: s.y });
  assert.deepEqual(E.pos, { x: s.x + 10, y: s.y }, 'ตัวขวางปลายทางกระเด็น 1');
  // ดาเมจชน: A 2 · B 5 · E 8 · คลื่น 75% ปัดลง: รอบ A 1 · รอบ B 3 · รอบ E 6 (ระยะ 3 — ตัวที่ถูกชนไม่โดนคลื่นของตัวเอง)
  // A โดนคลื่นของ B (ห่าง 3) · B โดนคลื่นของ A และของ E · E โดนคลื่นของ B (ก่อนถูกชน)
  assert.equal(A.hp, 20 - 2 - 3, 'ชน 2 + คลื่นของ B');
  assert.equal(B.hp, 20 - 5 - 1 - 6, 'ชน 5 + คลื่นของ A + คลื่นของ E');
  assert.equal(E.hp, 20 - 3 - 8, 'คลื่นของ B (ห่าง 3) + ชน 8');
  assert.equal(vit(F), fv, 'เพื่อนไม่โดน');
  assert.equal(fxEvents().filter((e) => e.kind === 'hit').length, 3);
  assert.equal(match.gameState, 'ATTACKING', 'ไถลชน = จบตา');
  // LV1 ไม่ทะลุ
  const { I: I2 } = setup();
  st().score = 0;
  const s2 = strip(10);
  park(I2, s2.x, s2.y);
  for (let i = 1; i <= 6; i++) Ice.layIce(s2.x + i, s2.y, null);
  const A2 = mob(s2.x + 3, s2.y);
  engine.setActor('p0');
  engine.moveTo('p0', s2.x + 1, s2.y, { step: true });
  assert.deepEqual(I2.pos, { x: s2.x + 2, y: s2.y }, 'LV1 หยุดหน้าตัวแรก');
  assert.deepEqual(A2.pos, { x: s2.x + 6, y: s2.y }, 'ถูกชนกระเด็นลงน้ำแข็ง = ไถลต่อสุดแนว');
});

test('ทำลาย (Eos): LV1 เทิร์นละ 2 · LV.2 ขึ้นไป เทิร์นละ 4', () => {
  const { I } = setup();
  st().score = 0;
  const s = strip(8);
  park(I, s.x, s.y);
  for (let i = 1; i <= 6; i++) Ice.layIce(s.x + i, s.y + 2, 'p0');
  engine.setActor('p0');
  const btn = () => ice.hudActions(engine, I)[0];
  assert.equal(btn().name, 'ทำลาย 2/2');
  st().score = 10;
  assert.equal(btn().name, 'ทำลาย 4/4');
  for (let i = 1; i <= 4; i++) assert.equal(ice.charAction(engine, I, ice.BREAK_KEY, { tile: { x: s.x + i, y: s.y + 2 } }), true, `ครั้งที่ ${i}`);
  assert.equal(ice.charAction(engine, I, ice.BREAK_KEY, { tile: { x: s.x + 5, y: s.y + 2 } }), false, 'ครั้งที่ 5 ไม่ได้');
  assert.equal(btn().name, 'ทำลาย 0/4');
  match.world = 'earth';
  try { assert.equal(ice.breakLimit(), 2, 'นอก Eos = 2'); } finally { match.world = 'eos'; }
});

test('ติดตัว 3 (Eos): ดาเมจสะสมครบ 3 = Shock Wave 3 หน่วยรอบตัว ระยะตาม LV · ผลัก 2 + เชื่องช้า 1 · หลบได้ · เพื่อนไม่โดน', async () => {
  const { I, F } = setup();
  st().score = 0;
  const s = strip(14);
  park(I, s.x + 6, s.y);
  const A = mob(s.x + 7, s.y);       // ประชิด → ผลักไป +x 2 ช่อง
  const B = mob(s.x + 6, s.y + 2);   // ห่าง 2 (ไม่ใช่ 8 ช่องรอบตัวแบบเดิม — ยังโดน)
  const C = mob(s.x + 3, s.y);       // ห่าง 3 = ไม่โดนที่ LV1
  park(F, s.x + 5, s.y);
  const fv = vit(F);
  match.gameState = 'ACTION';
  engine.dealMixed(I, 3, false);
  await nextTick();
  assert.equal(A.hp, 17);
  assert.deepEqual(A.pos, { x: s.x + 9, y: s.y }, 'ผลัก 2 ช่อง');
  assert.equal(B.hp, 17);
  assert.deepEqual(B.pos, { x: s.x + 6, y: s.y + 4 });
  assert.ok(A.statuses.slow > 0 && B.statuses.slow > 0, 'เชื่องช้า');
  assert.equal(C.hp, 20, 'นอกระยะ 2');
  assert.equal(vit(F), fv);
  assert.deepEqual(F.pos, { x: s.x + 5, y: s.y }, 'เพื่อนไม่ถูกผลัก');
  assert.ok(fxEvents().some((e) => e.kind === 'burst'));
  assert.equal(shocks().length, 1);
  // หลบหลีก 100% = ไม่โดนทั้งดาเมจและผลัก
  calls.fx = [];
  A.statuses.evade = 2; A.statusAmt = { evade: 100 };
  Math.random = () => 0;
  const at = { ...A.pos };
  park(I, A.pos.x - 1, A.pos.y);
  engine.dealMixed(I, 3, false);
  await nextTick();
  assert.equal(A.hp, 17, 'หลบพ้น');
  assert.deepEqual(A.pos, at);
  assert.ok(shocks()[0].hits.some((h) => h.id === A.id && h.dodge));
});

test('หนาม (Eos): ไถล / ถูกผลัก / พุ่งชน / เหยียบ เข้าหนามของ Ice Spike = Shock Wave รอบหนาม ดาเมจเท่า Lv · ผู้ชนไม่โดนซ้ำ', () => {
  const { I } = setup();
  st().score = 0;
  const s = strip(14);
  park(I, s.x, s.y - 2);
  // ถูกผลัก: หนาม Lv2
  Ice.placeSpike(s.x + 4, s.y, 'p0', 2);
  const H = mob(s.x + 3, s.y), N = mob(s.x + 5, s.y + 1);
  let c = Ice.begin();
  Ice.pushUnit(H, { x: 1, y: 0 }, c);
  Ice.flush(c);
  assert.equal(H.hp, 20 - 2, 'ผู้ชนเสียเท่า Lv (แบบเดิม) — ไม่โดนคลื่นซ้ำ');
  assert.equal(N.hp, 20 - 2, 'คลื่นเท่า Lv2');
  assert.equal(shocks().length, 1);
  // ไถลชนหนาม Lv3
  calls.fx = [];
  Ice.placeSpike(s.x + 10, s.y, 'p0', 3);
  Ice.layIce(s.x + 8, s.y, null); Ice.layIce(s.x + 9, s.y, null);
  const S = mob(s.x + 8, s.y), N3 = mob(s.x + 11, s.y + 1);
  c = Ice.begin();
  Ice.resolveEntry(S, { x: 1, y: 0 }, c);
  Ice.flush(c);
  assert.equal(S.hp, 17);
  assert.equal(N3.hp, 17, 'คลื่นเท่า Lv3');
  // พุ่งชน (dashBump) หนาม Lv1
  calls.fx = [];
  Ice.placeSpike(s.x + 1, s.y + 2, 'p0', 1);
  const D = mob(s.x, s.y + 2), N1 = mob(s.x + 2, s.y + 2);
  assert.equal(Ice.dashBump(D, { x: 1, y: 0 }), true);
  assert.equal(D.hp, 19);
  assert.equal(N1.hp, 19);
  // เหยียบ (trampleSpikes) หนาม Lv2 — ผู้เหยียบเสีย Lv − 1 · คลื่นเท่า Lv
  calls.fx = [];
  Ice.placeSpike(s.x + 7, s.y + 2, 'p0', 2);
  const W = mob(s.x + 6, s.y + 2), NW = mob(s.x + 8, s.y + 1);
  c = Ice.begin();
  Ice.trampleSpikes(W, [K(s.x + 7, s.y + 2)], c);
  Ice.flush(c);
  assert.equal(W.hp, 19);
  assert.equal(NW.hp, 18);
  assert.equal(shocks().length, 1);
  // หนามของคนที่ไม่ใช่ Ice Spike (เจ้าของ null) = ไม่มีคลื่น
  calls.fx = [];
  Ice.placeSpike(s.x + 12, s.y + 2, null, 1);
  const X = mob(s.x + 11, s.y + 2);
  Ice.dashBump(X, { x: 1, y: 0 });
  assert.equal(shocks().length, 0);
  void I;
});

test('หนาม (Eos): Ice Spike ไถลชนหนามตัวเอง = แต้มสกิล +2 ไม่เสียหาย ไม่เชื่องช้า + Shock Wave ตาม Lv', () => {
  const { I } = setup();
  st().score = 0;
  const s = strip(10);
  park(I, s.x, s.y);
  Ice.layIce(s.x + 1, s.y, null); Ice.layIce(s.x + 2, s.y, null);
  Ice.placeSpike(s.x + 3, s.y, 'p0', 2);
  const N = mob(s.x + 4, s.y);
  I.skillPoints = 1;
  const v = vit(I);
  engine.setActor('p0');
  engine.moveTo('p0', s.x + 1, s.y, { step: true });
  assert.deepEqual(I.pos, { x: s.x + 2, y: s.y });
  assert.equal(I.skillPoints, 1 + 2 + 1, 'ชนหนามตัวเอง +2 · ไถล 2 ช่อง +1');
  assert.equal(vit(I), v);
  assert.equal(I.statuses.slow, undefined);
  assert.equal(N.hp, 18, 'คลื่นเท่า Lv2');
});

test('Ice Surge (Eos): Shock Wave 2 หน่วยทั้งสนาม · หนามที่สร้างระหว่าง Ice Surge = Lv3 ทันที (1 แต้ม · ทั้งสนาม) · ปุ่มแสดงค่าของ Eos', () => {
  const { I, F } = setup();
  st().score = 0;
  const s = strip(8);
  park(I, s.x, s.y);
  const map = action.boardMap();
  // มอนไกลสุดมุมแผนที่ก็โดน
  let far = null;
  for (let y = map.rows - 1; y >= 0 && !far; y--) for (let x = map.cols - 1; x >= 0 && !far; x--) {
    if (!map.terrain[K(x, y)] && action.tileFree(x, y, null)) far = { x, y };
  }
  const A = mob(s.x + 3, s.y), Z = mob(far.x, far.y);
  park(F, s.x + 1, s.y + 1);
  const fv = vit(F);
  engine.setActor('p0');
  engine.useSkill('p0', 'ultimate', []);
  engine.clearPhaseTimer();
  match.gameState = 'ACTION'; // ฉากท่าไม้ตายเล่นจบ (ตัวจับเวลาถูกแทนในเทสต์)
  assert.equal(I.skillPoints, 4);
  assert.equal(A.hp, 18);
  assert.equal(Z.hp, 18, 'ทั้งสนาม');
  assert.equal(vit(F), fv, 'เพื่อนไม่โดน');
  assert.ok(I.statuses.iceSurge > 0);
  const before = I.skillPoints;
  engine.useSkill('p0', 'secondary', [], { tile: { x: s.x + 5, y: s.y + 2 } });
  assert.equal(action.boardMap().terrain[K(s.x + 5, s.y + 2)], 'icespike3', 'Lv3 ทันที');
  assert.equal(I.skillPoints, before - 1);
  const pub = engine.buildStateFor('p0').players.find((p) => p.id === 'p0');
  assert.match(pub.character.ultimate.desc, /Shock Wave ทั้งสนาม/);
  assert.match(pub.character.passive2.name, /Lv\.1/);
  assert.match(pub.character.passive2.desc, /ซ้อนทับสูงสุด 6/);
  assert.match(pub.character.secondary.desc, /Shock Wave/);
  st().score = 40;
  const pub5 = engine.buildStateFor('p0').players.find((p) => p.id === 'p0');
  assert.match(pub5.character.passive2.desc, /ซ้อนทับสูงสุด 30/);
  assert.match(pub5.character.passive3.desc, /รอบ 5 ช่อง/);
  assert.deepEqual(pub5.iceLv, { lv: 5, max: 5, stack: 30, pct: 100, r: 5, pierce: true }, 'ป้าย LV บน HUD');
  assert.equal(engine.buildStateFor('p0').players.find((p) => p.id === 'p1').iceLv, undefined, 'ตัวอื่นไม่มีป้าย');
});

test('นอก Eos: ไม่มี Shock Wave · Ice Surge ไม่มีคลื่น หนามระหว่าง Ice Surge = Lv1 · คำอธิบายปุ่มเดิม', () => {
  const { I } = setup();
  const s = strip(8);
  park(I, s.x, s.y);
  const A = mob(s.x + 3, s.y);
  match.world = 'earth';
  try {
    assert.equal(ice.burstSpec(engine, I), null);
    assert.equal(ice.characterPub(engine, I), null);
    assert.equal(ice.skillPub(I, 'ultimate'), null);
    engine.setActor('p0');
    ice.applyInstantSkill(engine, I, 'ultimate', [], {});
    assert.equal(shocks().length, 0);
    assert.equal(A.hp, 20);
    ice.applyInstantSkill(engine, I, 'secondary', [], { tile: { x: s.x + 5, y: s.y + 2 } });
    assert.equal(action.boardMap().terrain[K(s.x + 5, s.y + 2)], 'icespike1');
  } finally { match.world = 'eos'; }
});
