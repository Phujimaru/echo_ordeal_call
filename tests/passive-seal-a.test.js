// ลบสกิลติดตัว (noPassive — server/passiveSeal.js) กลุ่ม a:
//  มุยมิ · โอเบรอน ฤดูร้อน · นักบินปริศนา · Echo · โซระ · ไรโด · เคท & เอมิลิโกะ · กิระ · ยูนะ
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const H = require('../characters/index');
const Soot = require('../server/soot.js');

const realRandom = Math.random;
const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
// list = [[id, characterId, x, y, teamId?], ...] · เอมิลิโกะของเคท = ['K~duo', null, x, y]
function setup(list, mode = 'ffa') {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.filter(([, ch]) => ch).forEach(([id, ch, , , team], i) => { engine.players[id] = blank(id, ch, i + 1, team || null); });
  engine.setGameMode(mode);
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setJourneyArea(1);
  engine.setCycleShift(0);
  engine.setShopPos(null);
  engine.setRoundNumber(1);
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.skillPoints = 8; p.skillUsedRound = false; p.shield = 0;
    p.statuses = {}; p.statusAmt = {};
  }
  return engine.players;
}
const seal = (p) => { p.statuses.noPassive = 2; };
const unseal = (p) => { delete p.statuses.noPassive; };
const view = (viewerId, id) => engine.buildStateFor(viewerId).players.find((p) => p.id === id);
const vit = (p) => (p.hp || 0) + (p.armor || 0);
function kill(p) { p.hp = 0; engine.instantDeath(p); if (!p.alive) p.pos = null; }

const saved = {
  triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash,
  notifyTransform: engine.notifyTransform, sfx: engine.sfx, boardFx: engine.boardFx,
};
test.before(() => {
  engine.triggerCutscene = () => {}; engine.queueCutscene = () => {}; engine.skillFlash = () => {};
  engine.notifyTransform = () => {}; engine.sfx = () => {}; engine.boardFx = () => {};
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; engine.clearPhaseTimer(); });
test.afterEach(() => { Math.random = realRandom; engine.setGameMode('ffa'); engine.setCycleShift(0); engine.clearPhaseTimer(); });

test('มุยมิ ใจที่ไม่ยอมแพ้: ติดลบสกิลติดตัว = ตีปกติระหว่างดาบสะบั้นไม่ยืดเวลา (ฟื้นพลังชีวิตยังได้)', () => {
  const P = setup([['M', 'muimi', 3, 5], ['B', 'dummy', 9, 5]]);
  const m = P.M;
  m.statuses.muimiTower = 2; m.hp = 2;
  seal(m);
  const r = H.muimi.onAttackLanded(engine, m);
  assert.equal(m.statuses.muimiTower, 2, 'ไม่ยืด');
  assert.equal(r.extended, false);
  assert.equal(m.hp, 4, 'ฟื้นของท่าไม้ตายยังได้');
  unseal(m);
  H.muimi.onAttackLanded(engine, m);
  assert.equal(m.statuses.muimiTower, 3, 'ไม่ติด = ยืด +1');
});

test('โอเบรอน หน้าไหว้หลังหลอก: ติดลบสกิลติดตัว = จบเทิร์นไม่ได้แต้ม/เหรียญ', () => {
  const P = setup([['O', 'oberon_summer', 3, 5], ['B', 'dummy', 9, 5]]);
  const o = P.O;
  o.skillPoints = 3; o.gold = 0; o.wasAttacked = false;
  seal(o);
  H.oberon_summer.onEndTurn(engine);
  assert.equal(o.skillPoints, 3);
  assert.equal(o.gold, 0);
  unseal(o);
  H.oberon_summer.onEndTurn(engine);
  assert.equal(o.skillPoints, 4);
  assert.equal(o.gold, 1);
});

test('นักบินปริศนา ซุ่มโจมตี: ติดลบสกิลติดตัว = ศัตรูมองเห็นทันที · ต้นเทิร์นไม่ล่องหน · หมดแล้วกลับมาล่องหน', () => {
  const P = setup([['S', 'sliver_bullet', 5, 5], ['B', 'dummy', 7, 5], ['C', 'dummy', 9, 5]]);
  const s = P.S;
  assert.equal(s.sliver.hidden, true);
  assert.equal(view('B', 'S').pos, null);
  seal(s);
  assert.deepEqual(view('B', 'S').pos, { x: 5, y: 5 }, 'มองเห็นทันที');
  H.sliver_bullet.refresh(engine);
  assert.equal(s.sliver.hidden, false, 'ต้นเทิร์นไม่ล่องหน');
  unseal(s);
  H.sliver_bullet.refresh(engine);
  assert.equal(s.sliver.hidden, true, 'หมดสถานะ = ล่องหนอีกครั้ง');
});

test('บานาจ NT-D ทำงาน: ติดลบสกิลติดตัว = ไม่มีพลังโจมตี/เดิน +1 ไม่หักแต้ม · New Type Paradise (ท่าไม้ตาย) ยังทำงาน', () => {
  const P = setup([['S', 'sliver_bullet', 5, 5], ['B', 'dummy', 9, 5]]);
  const s = P.S, sb = H.sliver_bullet;
  s.sliver.form = 'banagher'; s.sliver.hidden = false; s.sliver.ntd = true;
  const base = sb.mov(s) - 1;
  seal(s);
  assert.equal(sb.damageBonus(engine, s), 0);
  assert.equal(sb.mov(s), base);
  s.skillPoints = 3;
  sb.onEndTurn(engine);
  assert.equal(s.skillPoints, 3, 'ไม่หักแต้ม');
  assert.equal(s.sliver.ntd, true, 'สถานะปุ่มค้างไว้');
  s.sliver.unicorn = { until: 99, sever: 0, at: 0 };
  assert.equal(sb.damageBonus(engine, s), 1, 'ยูนิคอร์นยังได้ผล');
  s.sliver.unicorn = null;
  unseal(s);
  assert.equal(sb.damageBonus(engine, s), 1);
  assert.equal(sb.mov(s), base + 1);
});

test('Echo ราชินีผู้อ่อนโยน: ติดลบสกิลติดตัว = ต้นเทิร์นไม่ได้อะไร', () => {
  const P = setup([['E', 'echo', 1, 5], ['B', 'muimi', 8, 5]]);
  const e = P.E;
  e.skillPoints = 2; e.gold = 0; e.hp = 3;
  seal(e);
  for (const r of [0.01, 0.5, 0.9]) { Math.random = () => r; H.echo.onRoundStartTick(engine, e); }
  Math.random = realRandom;
  assert.deepEqual([e.skillPoints, e.gold, e.hp], [2, 0, 3]);
  unseal(e);
  Math.random = () => 0.9; H.echo.onRoundStartTick(engine, e); Math.random = realRandom;
  assert.equal(e.hp, 4);
});

test('Echo สวมร่างกิระ + ติดลบสกิลติดตัว: ทั้งราชินีผู้อ่อนโยนและออร่าหมอกดำแดงของร่างที่สวมไม่ทำงาน', () => {
  const P = setup([['E', 'echo', 4, 5], ['B', 'dummy', 5, 5]]);
  const e = P.E;
  engine.setActor('E');
  engine.useSkill('E', 'basic', [], { form: 'kira' });
  assert.equal(e.characterId, 'kira');
  e.kira.king = true;
  e.hp = 3; e.skillPoints = 2; e.gold = 0;
  const before = vit(P.B);
  seal(e);
  for (const r of [0.01, 0.5, 0.9]) { Math.random = () => r; H.echo.onRoundStartTick(engine, e); }
  Math.random = realRandom;
  H.kira.onEndTurn(engine);
  assert.deepEqual([e.skillPoints, e.gold, e.hp], [2, 0, 3], 'ราชินีไม่ทำงาน');
  assert.equal(vit(P.B), before, 'ออร่าไม่ทำงาน');
  assert.equal(H.kira.attackLane(e), false, 'ไม่มีคลื่นแนวตรง');
  unseal(e);
  H.kira.onEndTurn(engine);
  assert.equal(vit(P.B), before - 1, 'ไม่ติด = ออร่าทำงาน');
});

test('โซระ เพื่อคุณหนู: ติดลบสกิลติดตัว = ร่างโซระไม่นับ/ไม่ฟื้น · My-Th ไม่มีคริ 20%', () => {
  const P = setup([['S', 'sora_otosumi', 3, 5], ['B', 'dummy', 9, 5]]);
  const s = P.S, so = H.sora_otosumi;
  s.hp = 2;
  seal(s);
  so.onEndTurn(engine); so.onEndTurn(engine);
  assert.equal(s.sora.calm, 0);
  assert.equal(s.hp, 2);
  s.sora.myth = true;
  assert.equal(so.critPct(s), 0);
  unseal(s);
  assert.equal(so.critPct(s), 20);
  s.sora.myth = false;
  so.onEndTurn(engine);
  assert.equal(s.sora.calm, 1);
});

test('ไรโด: ติดลบสกิลติดตัว = Strium Brace ไม่นับ · เกราะลดไม่ฟื้นพลังชีวิต · เคมูไม่ล่องหน', () => {
  const P = setup([['H', 'raido_hikaru', 1, 8], ['B', 'dummy', 12, 2]]);
  const h = P.H, hk = H.raido_hikaru, s = h.hikaru;
  s.ginga = true; h.statuses.hikaruGinga = 99; h.boardSize = 3;
  seal(h);
  hk.onEndTurn(engine);
  assert.equal(s.brace, 0);
  unseal(h);
  hk.onEndTurn(engine);
  assert.equal(s.brace, 1);
  s.ginga = false; delete h.statuses.hikaruGinga; h.boardSize = 1;
  s.form = 'thunder'; h.statuses.hikaruForm = 3; h.hp = 2;
  seal(h);
  hk.onArmorLost(engine, h);
  assert.equal(h.hp, 2);
  unseal(h);
  hk.onArmorLost(engine, h);
  assert.equal(h.hp, 3);
  s.form = 'kemur'; s.hidden = true;
  seal(h);
  assert.equal(hk.stealthed(h), false);
  unseal(h);
  assert.equal(hk.stealthed(h), true);
});

test('เคท & เอมิลิโกะ: ติดลบสกิลติดตัว = ไม่เดินเพิ่มในม่าน · ไม่มืดบอดจากม่าน · เอมิลิโกะไม่เดินต่อ · ฟื้นแต้ม 1', () => {
  const E = 'K~duo';
  const P = setup([['K', 'kate', 4, 4], [E, null, 4, 3], ['B', 'dummy', 5, 4], ['C', 'dummy', 12, 12]]);
  const k = P.K, emi = P[E], ke = H.kate;
  const storm = Soot.cast(k, engine.tileArea({ kind: 'tile', square: 8 }, { x: 5, y: 5 }));
  storm.left = 2;
  assert.equal(ke.mov(k), 6);
  assert.equal(H.emiliko.cantoMov(engine, emi), 2);
  assert.equal(ke.skillRegen(k), 2);
  seal(k); seal(emi);
  assert.equal(ke.mov(k), null, 'เดินปกติ');
  assert.equal(H.emiliko.cantoMov(engine, emi), 0);
  assert.equal(ke.skillRegen(k), 1);
  k.skillPoints = 3;
  ke.onEndTurn(engine);
  assert.equal(k.skillPoints, 3, 'ไม่ได้แต้มในม่าน');
  engine.doAttack('K', 'B');
  assert.equal(P.B.statuses.shadowMask || 0, 0, 'ไม่มืดบอด');
});

test('กิระ บดขยี้ส่วนเกิน: ติดลบสกิลติดตัว = ร่างราชาตีประชิด ไม่มีออร่า · ร่างกิระไม่นับ/ไม่ฟื้น', () => {
  const P = setup([['K', 'kira', 4, 5], ['B', 'dummy', 5, 5]]);
  const k = P.K, ki = H.kira;
  k.kira.king = true;
  seal(k);
  assert.equal(ki.range(k), null);
  assert.equal(ki.attackLane(k), false);
  const before = vit(P.B);
  ki.onEndTurn(engine);
  assert.equal(vit(P.B), before);
  k.kira.king = false; k.kira.switchRound = 0; k.hp = 2;
  ki.onEndTurn(engine); ki.onEndTurn(engine);
  assert.equal(k.kira.calm, 0);
  assert.equal(k.hp, 2);
  unseal(k);
  ki.onEndTurn(engine);
  assert.equal(k.kira.calm, 1);
  k.kira.king = true;
  assert.deepEqual(ki.range(k), ki.KING_RANGE);
  assert.equal(ki.attackLane(k), true);
});

test('ยูนะ เสียงอันไพเราะ: ติดลบสกิลติดตัว = ขอขี่ไม่ได้ · คนตายระหว่างนั้นไม่ทิ้งศพ (ศพเดิมยังอยู่) · ตายไม่ฟื้นเอง', () => {
  const P = setup([['Y', 'yuna', 3, 7], ['A', 'dummy', 5, 7], ['B', 'dummy', 6, 8], ['C', 'dummy', 9, 9]]);
  const y = P.Y;
  assert.equal(H.yuna.canRide(engine, y), true);
  kill(P.A);
  assert.deepEqual(P.A.corpse, { x: 5, y: 7 });
  seal(y);
  assert.equal(H.yuna.canRide(engine, y), false);
  kill(P.B);
  assert.equal(P.B.corpse || null, null, 'ไม่ทิ้งศพ');
  assert.deepEqual(P.A.corpse, { x: 5, y: 7 }, 'ศพเดิมยังอยู่');
  assert.equal(engine.corpseKept(P.A), true);
  kill(y);
  assert.equal(y.alive, false, 'ไม่ฟื้นตัวเอง');
  assert.equal(y.yuna.blessUsed, false);
});

test('ยูนะ (คุม): ไม่ติดสถานะ = ตายแล้วคำอวยพรสุดท้ายฟื้นตัวเอง', () => {
  const P = setup([['Y', 'yuna', 3, 7], ['A', 'dummy', 5, 7], ['B', 'dummy', 6, 8]]);
  kill(P.Y);
  assert.equal(P.Y.alive, true);
  assert.equal(P.Y.yuna.blessUsed, true);
});
