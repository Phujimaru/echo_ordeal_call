// ลบสกิลติดตัว (noPassive · server/passiveSeal.js) — กลุ่ม d: โรลันด์ · ดิโอ · อินุอิ · โอโตยะ · กิลกาเมช (Fake) · เฟรดดี้ · คริซุงุ
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const roland = require('../characters/roland.js');
const dio = require('../characters/dio_brando.js');
const inui = require('../characters/inui_takumi.js');
const otoya = require('../characters/kurenai_otoya.js');
const gil = require('../characters/gilgamesh_fake.js');
const fz = require('../characters/freddy_fazbear.js');
const kiri = require('../characters/emiya_kiritsugu.js');

const realRandom = Math.random;
const blank = (id, characterId, position) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId: null, skillPoints: 0, gold: 0,
});
function setup(list) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, ch], i) => { engine.players[id] = blank(id, ch, i + 1); });
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setJourneyArea(1);
  engine.setCycleShift(0);
  engine.setRoundNumber(1);
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.shield = 0; p.statuses = {}; p.statusAmt = {}; p.skillPoints = 0;
  }
  return engine.players;
}
const seal = (p) => { p.statuses.noPassive = 2; };
const unseal = (p) => { delete p.statuses.noPassive; };
const by = (src, fn) => { let r; engine.withEffectSource(src, () => { r = fn(); }); return r; };

const saved = { triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash, sfx: engine.sfx, boardFx: engine.boardFx, boardFxTo: engine.boardFxTo };
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = () => {};
  engine.skillFlash = () => {};
  engine.sfx = () => {};
  engine.boardFx = () => {};
  engine.boardFxTo = () => {};
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.beforeEach(() => { Math.random = () => 0.99; });
test.afterEach(() => { Math.random = realRandom; engine.setGameMode('ffa'); engine.setCycleShift(0); engine.setRoundNumber(1); engine.clearPhaseTimer(); });

// ---------- โรลันด์ — Black Silence ----------
test('โรลันด์: ติดลบสกิลติดตัว = สร้างความเสียหายไม่นับ Emotion · ไม่จั่วต้นเทิร์น · ไอเทมเติมแต้มได้', () => {
  const P = setup([['R', 'roland', 4, 7], ['D', 'dummy', 5, 7]]);
  const s = P.R.roland;
  s.started = true; s.hand = [];
  seal(P.R);
  for (let i = 0; i < 4; i++) roland.onStrikeResolved(engine, P.R, P.D, { dmg: 1 }, {});
  assert.equal(s.hits, 0);
  assert.equal(s.emotion, 0);
  roland.onRoundStartTick(engine, P.R);
  assert.equal(s.hand.length, 0, 'ไม่จั่ว 1 ใบต้นเทิร์น');
  s.bonusDraw = 1;
  roland.onRoundStartTick(engine, P.R);
  assert.equal(s.hand.length, 1, 'จั่วเพิ่มจากการ์ดยังได้');
  assert.equal(roland.blocksSkillGain(P.R, 'item'), false);

  unseal(P.R);
  s.hand = [];
  for (let i = 0; i < 4; i++) roland.onStrikeResolved(engine, P.R, P.D, { dmg: 1 }, {});
  assert.equal(s.emotion, 1);
  roland.onRoundStartTick(engine, P.R);
  assert.equal(s.hand.length, 1);
  assert.equal(roland.blocksSkillGain(P.R, 'item'), true);
});

test('โรลันด์: ติดลบสกิลติดตัว = ใช้การ์ดแบบใหม่ไม่เพิ่ม Furioso charge', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] });
  const P = setup([['R', 'roland', 4, 7], ['D', 'dummy', 5, 7]]);
  const s = P.R.roland;
  s.hand = [{ uid: 'x1', k: 'zelkova' }, { uid: 'x2', k: 'ranga' }];
  seal(P.R);
  roland.applyInstantSkill(engine, P.R, 'basic', ['D'], { form: 'x1' });
  assert.equal(s.used.length, 0);
  unseal(P.R);
  roland.applyInstantSkill(engine, P.R, 'basic', ['D'], { form: 'x2' });
  assert.deepEqual(s.used, ['ranga']);
  for (let i = 0; i < 50; i++) t.mock.timers.tick(100);
});

// ---------- ดิโอ — Vampire / Last Stand ----------
test('ดิโอ: ติดลบสกิลติดตัว = ไม่ดูดเลือด/ไม่ได้ BloodStack · Time Meter ไม่เพิ่ม · ไม่มีผลกลางวัน · ผลขั้น BloodStack ไม่ทำงาน', () => {
  const P = setup([['O', 'dio_brando', 4, 7], ['D', 'dummy', 5, 7]]);
  const s = P.O.dio;
  P.O.hp = 5;
  seal(P.O);
  dio.onStrikeResolved(engine, P.O, P.D, { dmg: 1 }, {});
  assert.equal(s.blood, 0);
  assert.equal(P.O.hp, 5);
  dio.afterStrike(engine, P.O);
  assert.equal(s.meter, 0);
  assert.equal(dio.adjustIncomingDamage(engine, P.O, 2), 2, 'กลางวันไม่ +1');
  s.blood = 6;
  assert.equal(dio.dioState(engine, P.O).meterMax, 6, 'BloodStack 6 ไม่ขยาย Time Meter');

  unseal(P.O);
  assert.equal(dio.dioState(engine, P.O).meterMax, 8);
  s.blood = 0;
  dio.onStrikeResolved(engine, P.O, P.D, { dmg: 1 }, {});
  assert.equal(s.blood, 1);
  assert.equal(P.O.hp, 6);
  dio.afterStrike(engine, P.O);
  assert.equal(s.meter, 1);
  assert.equal(dio.adjustIncomingDamage(engine, P.O, 2), 3);
});

test('ดิโอ: ติดลบสกิลติดตัว = ไม่มี Last Stand (สิทธิ์ยังอยู่)', () => {
  const P = setup([['O', 'dio_brando', 4, 7], ['D', 'dummy', 5, 7]]);
  seal(P.O);
  P.O.hp = 0;
  assert.equal(by(P.D, () => dio.preventDeath(engine, P.O)), false);
  assert.equal(P.O.dio.lastUsed, false);
});

// ---------- อินุอิ — ฉันก็เป็นมนุษย์ ----------
test('อินุอิ: ติดลบสกิลติดตัว = ตีโดนไม่ได้แต้มสกิล · ไม่นับเทิร์นร่างมนุษย์', () => {
  const P = setup([['I', 'inui_takumi', 4, 7], ['D', 'dummy', 5, 7]]);
  P.I.hp = 3;
  seal(P.I);
  inui.onStrikeResolved(engine, P.I, P.D, { dmg: 1, dodge: false }, {});
  assert.equal(P.I.skillPoints, 0);
  inui.onEndTurn(engine); inui.onEndTurn(engine);
  assert.equal(P.I.hp, 3);
  assert.equal(P.I.inui.humanTurns, 0);

  unseal(P.I);
  inui.onStrikeResolved(engine, P.I, P.D, { dmg: 1, dodge: false }, {});
  assert.equal(P.I.skillPoints, 1);
  inui.onEndTurn(engine); inui.onEndTurn(engine);
  assert.equal(P.I.hp, 5);
});

// ---------- โอโตยะ — หนุ่มเจ้าเสน่ห์ / ราชาผีดูดเลือด ----------
test('โอโตยะ: ติดลบสกิลติดตัว = ไม่มีหนุ่มเจ้าเสน่ห์ (Dark Kiva +2 ยังอยู่) · เลือดไหลบนตัวเป็นปกติ', () => {
  const P = setup([['K', 'kurenai_otoya', 4, 7], ['D', 'dummy', 5, 7]]);
  seal(P.K);
  assert.equal(otoya.damageBonus(engine, P.K, P.D, {}), 0);
  assert.equal(otoya.hbleedHeals(P.K), false);
  assert.equal(otoya.hbleedHarmless(P.K), false);
  P.K.otoya.ultUntil = engine.roundNumber + 1;
  assert.equal(otoya.damageBonus(engine, P.K, P.D, {}), otoya.ULT_ATK);
  unseal(P.K);
  P.K.otoya.ultUntil = 0;
  assert.equal(otoya.damageBonus(engine, P.K, P.D, {}), otoya.CHARM_OTHER);
  assert.equal(otoya.hbleedHeals(P.K), true);
});

test('โอโตยะ: ติดลบสกิลติดตัว = ราชาผีดูดเลือดไม่ทำงาน (ไม่ติดเลือดไหล · กลางคืนไม่ลด · จ่ายพลังชีวิตถึงตายได้)', () => {
  const P = setup([['K', 'kurenai_otoya', 4, 7], ['D', 'dummy', 5, 7]]);
  P.K.otoya.ultUntil = engine.roundNumber + 1;
  seal(P.K);
  otoya.onStrikeLanded(engine, P.K, P.D);
  assert.ok(!(P.D.statuses.hbleed > 0) && !(P.D.statuses.bleed > 0), 'ไม่ติดเลือดไหล');
  engine.setRoundNumber(4);
  P.K.otoya.ultUntil = engine.roundNumber + 1;
  assert.equal(engine.isNightRound(engine.worldRound), true);
  assert.equal(otoya.adjustIncomingDamage(engine, P.K, 2), 2);
  unseal(P.K);
  assert.equal(otoya.adjustIncomingDamage(engine, P.K, 2), 1);
  otoya.onStrikeLanded(engine, P.K, P.D);
  assert.ok(Object.keys(P.D.statuses).length > 0, 'ไม่ติด = เป้าติดเลือดไหล');

  P.K.hp = 1;
  seal(P.K);
  otoya.applyInstantSkill(engine, P.K, 'basic', [], {});
  assert.equal(P.K.alive, false, 'หลุมพรางเสียพลังชีวิตจนตาย');
});

// ---------- กิลกาเมช (Fake) — ราชาที่แท้จริง / Gate of Babylon ----------
test('กิลกาเมช: ติดลบสกิลติดตัว = เพดานเหรียญ/กระเป๋าปกติ · ซื้อระยะไกลไม่ได้ · ไม่สั่งรีสต็อก', () => {
  const P = setup([['G', 'gilgamesh_fake', 4, 7]]);
  let restocks = 0;
  const realRestock = engine.restockShops;
  engine.restockShops = () => { restocks++; return true; };
  try {
    P.G.gil.restockRound = 1;
    engine.setRoundNumber(3);
    seal(P.G);
    assert.equal(gil.goldCap(P.G), null);
    assert.equal(gil.bagSlots(P.G), null);
    assert.equal(gil.remoteShop(P.G), false);
    gil.onRoundStartTick(engine, P.G);
    assert.equal(restocks, 0);
    unseal(P.G);
    assert.equal(gil.goldCap(P.G), gil.GOLD_CAP);
    assert.equal(gil.bagSlots(P.G), gil.BAG);
    assert.equal(gil.remoteShop(P.G), true);
    gil.onRoundStartTick(engine, P.G);
    assert.equal(restocks, 1);
  } finally { engine.restockShops = realRestock; }
});

// ---------- เฟรดดี้ — ปี 1987 / ร้านพิซซ่ายามค่ำคืน ----------
test('เฟรดดี้: ติดลบสกิลติดตัว = กลางวันไม่ล่องหน/แตะได้ · ไม่มีประตู · ไม่วาป/เดินต่อ · ฆ่าไม่ฟื้น · ไม่มีเพลง', () => {
  const P = setup([['F', 'freddy_fazbear', 4, 7], ['D', 'dummy', 5, 7]]);
  seal(P.F);
  assert.equal(fz.stealthed(P.F), false);
  assert.equal(fz.untouchable(engine, P.F), false);
  assert.equal(fz.interceptStrike(engine, P.F, P.D), null);
  assert.equal(fz.nearView(engine, ['D']), false);
  const from = { ...P.F.pos };
  fz.afterStrike(engine, P.F);
  assert.deepEqual(P.F.pos, from, 'ไม่วาป');
  P.F.hp = 3;
  fz.onKill(engine, P.F, P.D);
  assert.equal(P.F.hp, 3);
  assert.equal(engine.movOf(P.F), 4, 'ระยะเดิน = ค่าพื้นฐาน คงไว้');
  engine.setRoundNumber(4);
  fz.afterStrike(engine, P.F);
  assert.equal(fz.cantoMov(engine, P.F), 0);

  unseal(P.F);
  engine.setRoundNumber(1);
  assert.equal(fz.stealthed(P.F), true);
  assert.equal(fz.untouchable(engine, P.F), true);
  fz.onKill(engine, P.F, P.D);
  assert.equal(P.F.hp, 5);
});

test('เฟรดดี้: ติดลบสกิลติดตัวใน PVE = พลังโจมตี 3 (ไม่ใช่ 6) · คริ 0', () => {
  const P = setup([['F', 'freddy_fazbear', 4, 7], ['D', 'dummy', 5, 7]]);
  engine.setGameMode('moon');
  seal(P.F);
  assert.equal(fz.attackBaseOverride(engine, P.F, P.D), fz.ATK.night);
  assert.equal(fz.critPct(P.F), 0);
  unseal(P.F);
  assert.equal(fz.attackBaseOverride(engine, P.F, P.D), fz.ATK.pve);
  assert.equal(fz.critPct(P.F), fz.PVE_CRIT);
});

// ---------- คริซุงุ — เวทย์ตะกั่ว / อดีนาลีน / การเอาตัวรอดขั้นสุดยอด ----------
test('คริซุงุ: ติดลบสกิลติดตัว = ไม่มีคริ 50% · ความเสียหายลงทันที · ไม่มีการเอาตัวรอด', () => {
  const P = setup([['K', 'emiya_kiritsugu', 4, 7], ['D', 'dummy', 5, 7]]);
  seal(P.K);
  assert.equal(kiri.critPct(P.K), 0);
  assert.equal(by(P.D, () => kiri.adjustIncomingDamage(engine, P.K, 2)), 2);
  assert.equal(P.K.kiri.pending.length, 0);
  Math.random = () => 0;
  P.K.kiri.preHit = { hp: 3, armor: 0, shield: 0, tempHp: 0, seq: engine.cmdSeq, round: engine.roundNumber };
  assert.equal(kiri.preventDeath(engine, P.K), false);
  assert.equal(P.K.kiri.lastUsed, false, 'สิทธิ์ยังอยู่');

  unseal(P.K);
  assert.equal(kiri.critPct(P.K), 50);
  assert.equal(by(P.D, () => kiri.adjustIncomingDamage(engine, P.K, 2)), 0);
  assert.equal(P.K.kiri.pending.length, 1);
  P.K.kiri.preHit = { hp: 3, armor: 0, shield: 0, tempHp: 0, seq: engine.cmdSeq, round: engine.roundNumber };
  assert.equal(kiri.preventDeath(engine, P.K), true);
});
