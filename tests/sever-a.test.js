// ตัดผลสกิล (server/sever.js — รากฐานจิตของเรียวกิ) — ฮุค severables ชุด A:
//  muimi · oberon_summer · sliver_bullet · sora_otosumi · echo · raido_hikaru · ice_spike · kate/emiliko · kira
//  เปิดผล → sever.latest คืนอันล่าสุด → sever.cut ปิดผล + สกิลนั้นอยู่ในสภาพหลังหมดเวลาตามปกติ · ไม่มีผล = null
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const match = require('../server/match.js');
const CHAR_HOOKS = require('../characters/index.js');

const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
// list = [[id, characterId, x, y], ...] — แถว y = 5 ของภูมิภาค I เป็นพื้นโล่ง · ['K~duo', null, x, y] = ตำแหน่งเอมิลิโกะ
function setup(list) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.filter(([, ch]) => ch).forEach(([id, ch], i) => { engine.players[id] = blank(id, ch, i + 1); });
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setJourneyArea(1);
  engine.setCycleShift(0);
  engine.setShopPos(null);
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.skillPoints = 8; p.skillUsedRound = false; p.shield = 0;
    p.statuses = {}; p.statusAmt = {};
  }
  return engine.players;
}
const cast = (p, tier, targets = [], opts = {}) => CHAR_HOOKS[p.characterId].applyInstantSkill(engine, p, tier, targets, opts);
const latestKey = (p) => { const e = engine.sever.latest(engine, p); return e ? e.key : null; };

const saved = {
  triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash,
  notifyTransform: engine.notifyTransform, sfx: engine.sfx, boardFx: engine.boardFx,
  deferAfterCutscene: engine.deferAfterCutscene, skillBeat: engine.skillBeat,
};
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = () => {};
  engine.skillFlash = () => {};
  engine.notifyTransform = () => {};
  engine.sfx = () => {};
  engine.boardFx = () => {};
  engine.deferAfterCutscene = (fn) => fn();
  engine.skillBeat = (s, fn) => fn();
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.afterEach(() => {
  engine.clearPhaseTimer();
  match.cutsceneQueue.length = 0; match.afterCutscene = []; match.skillBeats = [];
});

test('ทุกโมดูลชุด A: ฮุคถูกเรียกกับตัวละครอื่น = ไม่มีอะไรให้ตัด', () => {
  const P = setup([['A', 'muimi', 1, 5], ['B', 'dummy', 8, 5]]);
  P.A.statuses.muimiTower = 2;
  for (const id of ['muimi', 'oberon_summer', 'sliver_bullet', 'sora_otosumi', 'echo', 'raido_hikaru', 'ice_spike', 'kate', 'emiliko', 'kira']) {
    assert.equal(typeof CHAR_HOOKS[id].severables, 'function', id);
    assert.deepEqual(CHAR_HOOKS[id].severables(engine, P.B), [], `${id} กับ dummy`);
  }
});

test('มุยมิ: ดาบเก่าๆ → ดาบสะบั้น (ล่าสุดก่อน) · ตัดดาบสะบั้น = ล็อกท่าไม้ตายเหมือนหมดเวลา', () => {
  const P = setup([['M', 'muimi', 1, 5], ['B', 'dummy', 8, 5]]);
  const M = P.M, hook = CHAR_HOOKS.muimi;
  assert.equal(engine.sever.latest(engine, M), null, 'ยังไม่มีผล');
  cast(M, 'secondary');
  assert.equal(latestKey(M), 'muimiRusty');
  cast(M, 'ultimate', [], { dir: 'right' });
  assert.equal(M.statuses.muimiTower, hook.TOWER_TURNS);
  assert.equal(latestKey(M), 'muimiTower', 'ดาบสะบั้นได้มาทีหลัง');
  assert.deepEqual(engine.sever.cut(engine, M), { key: 'muimiTower', label: 'ดาบสะบั้น' });
  assert.ok(!M.statuses.muimiTower);
  assert.equal(M.muimiUltLock, engine.roundNumber + hook.ULT_COOLDOWN_TURNS, 'ท่าไม้ตายเข้าคูลดาวน์ (ล็อกเดียวกับหมดเวลา)');
  M.statuses.muimiRusty = 0; // ดูเฉพาะล็อก (ระหว่างดาบเก่าๆ ท่าไม้ตายกดไม่ได้อยู่แล้ว)
  assert.equal(hook.canUseSkill(engine, M, 'ultimate'), false);
  M.statuses.muimiRusty = hook.RUSTY_TURNS;
  assert.equal(M.statuses.resist, hook.RESIST_TURNS, 'ต้านสถานะเป็นบัฟกลาง ไม่ถูกตัดพร้อมกัน');
  assert.equal(latestKey(M), 'muimiRusty');
  engine.sever.cut(engine, M);
  assert.ok(!M.statuses.muimiRusty);
  assert.equal(engine.sever.cut(engine, M), null, 'ไม่เหลืออะไรให้ตัด');
});

test('โอเบรอน: ม่าน/ความฝันที่ใส่ตัวเองตัดได้ · ความฝันที่ถูกตัด = ไม่สตั้น · ใส่คนอื่น = ไม่ใช่ผลของเป้า', () => {
  const P = setup([['O', 'oberon_summer', 1, 5], ['B', 'dummy', 3, 5]]);
  const O = P.O, hook = CHAR_HOOKS.oberon_summer;
  assert.equal(engine.sever.latest(engine, O), null);
  cast(O, 'basic', ['O', 'B']);
  assert.equal(hook.atkBonus(O), hook.VEIL_ATK);
  assert.equal(latestKey(O), 'obsVeil');
  assert.equal(engine.sever.latest(engine, P.B), null, 'dummy ได้ม่านจากโอเบรอน ไม่ใช่ผลสกิลของตัวเอง');
  cast(O, 'ultimate', ['O']);
  assert.equal(latestKey(O), 'obsDream', 'ความฝันได้มาทีหลัง');
  const ready = O.obsUltReady;
  assert.equal(engine.sever.cut(engine, O).label, 'จุดจบของความฝัน');
  assert.ok(!O.statuses.obsDream);
  assert.equal(O.obsUltReady, ready, 'คูลดาวน์เดินต่อตามปกติ');
  hook.onEndTurn(engine);
  assert.ok(!O.statuses.stun, 'ความฝันถูกตัดก่อนจบ = สตั้นไม่ลง');
  assert.equal(latestKey(O), 'obsVeil');
  engine.sever.cut(engine, O);
  assert.ok(!O.statuses.obsVeil);
  assert.equal(hook.atkBonus(O), 0);
  assert.equal(P.B.statuses.obsVeil > 0, true, 'ม่านของ dummy ยังอยู่');
  assert.equal(engine.sever.latest(engine, O), null);
});

test('นักบินปริศนา: ล่องหนตัดได้ → ปรากฏตัว 2 เทิร์นแบบถูกพบ', () => {
  const P = setup([['S', 'sliver_bullet', 1, 5], ['B', 'dummy', 8, 5], ['C', 'dummy', 10, 5]]);
  const S = P.S;
  CHAR_HOOKS.sliver_bullet.refresh(engine);
  assert.equal(S.sliver.hidden, true, 'ผู้เล่น 3 คน = ล่องหน');
  assert.equal(latestKey(S), 'sliverStealth');
  engine.sever.cut(engine, S);
  assert.equal(S.sliver.hidden, false);
  assert.equal(S.sliver.revealUntil, engine.roundNumber + 1, 'ปรากฏเทิร์นนี้ + เทิร์นหน้า');
  assert.equal(engine.sever.latest(engine, S), null);
});

test('โซระ: ร่าง My-Th ตัด → กลับร่างโซระ เทิร์นนี้แปลงร่างอีกไม่ได้', () => {
  const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 8, 5]]);
  const S = P.S, hook = CHAR_HOOKS.sora_otosumi;
  assert.equal(engine.sever.latest(engine, S), null, 'ร่างโซระ = ไม่มีผล');
  cast(S, 'basic');
  assert.equal(S.sora.myth, true);
  assert.equal(latestKey(S), 'soraMyth');
  engine.sever.cut(engine, S);
  assert.equal(S.sora.myth, false);
  assert.equal(hook.canUseSkill(engine, S, 'basic'), false, 'แปลงร่างเทิร์นละ 1 ครั้ง');
  assert.equal(engine.sever.latest(engine, S), null);
});

test('Echo: ราชินีตัด → ขยายร่างคงอยู่ คูลดาวน์มหึมาเดินต่อ · พลังโจมตีของ Overwrite ตัดได้', () => {
  const P = setup([['E', 'echo', 1, 5], ['B', 'dummy', 8, 5]]);
  const E = P.E, hook = CHAR_HOOKS.echo;
  assert.equal(engine.sever.latest(engine, E), null);
  cast(E, 'basic');
  assert.equal(E.statuses.echoQueen, hook.QUEEN_TURNS);
  assert.equal(latestKey(E), 'echoQueen');
  engine.sever.cut(engine, E);
  assert.ok(!E.statuses.echoQueen);
  assert.equal(E.echo.stacks, 1, 'ขยายร่างที่ได้แล้วอยู่ต่อ');
  assert.equal(hook.canUseSkill(engine, E, 'basic'), false, 'มหึมายังติดคูลดาวน์');
  hook.onRoundStartTick(engine, E);
  assert.equal(E.echo.stacks, 1, 'ไม่ได้ขยายร่างต้นเทิร์นอีก');
  E.echo.stacks = 4;
  cast(E, 'secondary');
  assert.equal(E.statusAmt.echoOverwrite, 2);
  const bonus = hook.damageBonus(engine, E);
  assert.equal(latestKey(E), 'echoOverwrite');
  engine.sever.cut(engine, E);
  assert.ok(!E.statuses.echoOverwrite);
  assert.equal(hook.damageBonus(engine, E), bonus - 2);
  assert.equal(engine.sever.latest(engine, E), null);
});

test('ไรโด: ร่าง UltraLive ตัด → คืนร่าง + ร่างนั้นคูลดาวน์ · กิงกะตัด → จบ + คูลดาวน์กิงกะ · ตัว 1×1', () => {
  const P = setup([['H', 'raido_hikaru', 1, 5], ['B', 'dummy', 8, 5]]);
  const H = P.H, hook = CHAR_HOOKS.raido_hikaru;
  const r = engine.roundNumber;
  assert.equal(engine.sever.latest(engine, H), null);
  cast(H, 'basic', [], { form: 'tiga' });
  assert.equal(H.hikaru.form, 'tiga');
  assert.equal(engine.sizeOf(H), hook.GINGA_SIZE);
  assert.equal(engine.sever.latest(engine, H).label, 'Ultraman Tiga');
  engine.sever.cut(engine, H);
  assert.equal(H.hikaru.form, null);
  assert.ok(!H.statuses.hikaruForm);
  assert.ok(!H.statuses.accurate, 'แม่นยำของ Tiga คืน');
  assert.equal(H.hikaru.formReady.tiga, r + 1 + hook.FORM_CD, 'ร่างนั้นคูลดาวน์');
  assert.equal(engine.sizeOf(H), 1);
  H.hikaru.formRound = 0;
  cast(H, 'secondary');
  assert.equal(H.hikaru.ginga, true);
  assert.equal(engine.sizeOf(H), hook.GINGA_SIZE);
  assert.equal(latestKey(H), 'hikaruGinga');
  engine.sever.cut(engine, H);
  assert.equal(H.hikaru.ginga, false);
  assert.ok(!H.statuses.hikaruGinga);
  assert.equal(H.hikaru.gingaReady, r + 1 + hook.GINGA_CD, 'กิงกะคูลดาวน์');
  assert.equal(engine.sizeOf(H), 1);
  assert.equal(engine.sever.latest(engine, H), null);
});

test('Ice Spike: Ice Surge ตัด → หมดทันที คูลดาวน์เดินต่อ (ฟื้นพลังไม่ถูกตัดพร้อมกัน)', () => {
  const P = setup([['I', 'ice_spike', 1, 5], ['B', 'dummy', 8, 5]]);
  const I = P.I, hook = CHAR_HOOKS.ice_spike;
  assert.equal(engine.sever.latest(engine, I), null);
  cast(I, 'ultimate');
  assert.equal(hook.surging(I), true);
  assert.equal(latestKey(I), 'iceSurge');
  engine.sever.cut(engine, I);
  assert.equal(hook.surging(I), false);
  assert.equal(I.iceUltReady, engine.roundNumber + hook.ULT_COOLDOWN);
  assert.ok(I.statuses.spRegen > 0);
  assert.equal(engine.sever.latest(engine, I), null);
});

test('เคท & เอมิลิโกะ: ม่านแดง / ดาบเขม่าในมือ ตัดแยกรายตัว', () => {
  const P = setup([['K', 'kate', 1, 5], ['K~duo', null, 2, 5], ['B', 'dummy', 12, 12]]);
  const K = P.K, E = P['K~duo'];
  assert.equal(E.characterId, 'emiliko');
  assert.equal(engine.sever.latest(engine, K), null);
  assert.equal(engine.sever.latest(engine, E), null);
  cast(K, 'secondary', [], { form: 'hold' });
  assert.equal(latestKey(K), 'kateSword');
  cast(K, 'ultimate', [], { tile: { x: 5, y: 5 } });
  assert.equal(engine.soot.storms().filter((s) => s.owner === 'K').length, 1);
  assert.equal(engine.sever.latest(engine, K).label, 'ระบำเขม่า', 'ม่านได้มาทีหลัง');
  assert.equal(engine.sever.latest(engine, E), null, 'ม่านเป็นผลสกิลของเคท');
  engine.sever.cut(engine, K);
  assert.equal(engine.soot.storms().filter((s) => s.owner === 'K').length, 0, 'ม่านหาย');
  assert.equal(latestKey(K), 'kateSword');
  engine.sever.cut(engine, K);
  assert.equal(K.shadow.sword, null, 'เก็บดาบ — ชักใหม่ได้');
  assert.equal(engine.sever.latest(engine, K), null);
  // ส่งดาบให้เอมิลิโกะ แล้วเอมิลิโกะเลือกถือ
  cast(K, 'secondary', ['K~duo'], { form: 'give' });
  assert.equal(engine.sever.latest(engine, E), null, 'มีดาบแต่ยังถือไม้ถูพื้น');
  cast(E, 'secondary', [], { form: 'sword' });
  assert.equal(latestKey(E), 'emiSword');
  assert.equal(engine.sever.latest(engine, K), null);
  engine.sever.cut(engine, E);
  assert.equal(K.shadow.weapon, 'mop', 'กลับไปถืออาวุธก่อนหน้า');
  assert.equal(K.shadow.sword, null);
  assert.equal(engine.sever.latest(engine, E), null);
});

test('กิระ: อัฐิราชาตัด → ไม่ฟื้นจากตาย ครั้งที่ใช้นับตามเดิม · ร่างราชาตัด → กลับร่างกิระ', () => {
  const P = setup([['K', 'kira', 4, 7], ['B', 'dummy', 12, 12]]);
  const K = P.K, hook = CHAR_HOOKS.kira;
  assert.equal(engine.sever.latest(engine, K), null);
  cast(K, 'basic');
  assert.equal(K.kira.king, true);
  cast(K, 'ultimate');
  assert.equal(latestKey(K), 'kiraUlt', 'อัฐิราชาได้มาทีหลัง');
  engine.sever.cut(engine, K);
  assert.equal(hook.preventDeath(engine, K), false, 'ตายแล้วไม่ฟื้น');
  assert.equal(hook.damageBonus(engine, K, P.B, {}), 0);
  assert.equal(K.kira.ultUses, 1);
  assert.equal(latestKey(K), 'kiraKing');
  engine.sever.cut(engine, K);
  assert.equal(K.kira.king, false);
  assert.equal(K.kira.switchRound, engine.roundNumber);
  assert.equal(engine.sever.latest(engine, K), null);
});
