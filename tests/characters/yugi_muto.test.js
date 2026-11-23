// ยูกิ มุโต้ (yugi_muto) — เครื่องรางพันปี (เด็ค 40 · มือ 5 → สูงสุด 7 · เอ็กโซเดียครบ = ชนะ) / ดรอว์·ทิ้ง / ขอเปิดใช้งาน
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const yugi = require('../../characters/yugi_muto.js');
const match = require('../../server/match.js');
const { CHAR_BY_ID } = require('../../characters.js');

const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
function setup(list, mode = 'ffa') {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, ch, , , team], i) => { engine.players[id] = blank(id, ch, i + 1, team || null); });
  engine.setGameMode(mode);
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setJourneyArea(1);
  engine.setCycleShift(0);
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.skillPoints = 8; p.skillUsedRound = false; p.shield = 0;
    p.statuses = {}; p.statusAmt = {};
  }
  return engine.players;
}
const view = (viewerId, id) => engine.buildStateFor(viewerId).players.find((p) => p.id === id);
const use = (id, tier, form) => { engine.players[id].skillUsedRound = false; engine.useSkill(id, tier, [], { form }); };

const saved = { triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash, sfx: engine.sfx };
const flashes = [];
const clips = [];
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = (p, key) => clips.push(key);
  engine.skillFlash = (f) => flashes.push(f);
  engine.sfx = () => {};
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.beforeEach(() => { flashes.length = 0; clips.length = 0; });
test.afterEach(() => { engine.setGameMode('ffa'); engine.setCycleShift(0); engine.clearPhaseTimer(); match.forcedWinnerId = null; });

test('ข้อมูล: เอาฮา · 1/2 แต้ม · ไม่มีท่าไม้ตาย · ค่าฐาน 10/5', () => {
  const ch = CHAR_BY_ID.yugi_muto;
  assert.equal(ch.difficulty, 'fun');
  assert.equal(ch.basic.cost, 1);
  assert.equal(ch.secondary.cost, 2);
  assert.equal(ch.ultimate, null);
  const { Y } = setup([['Y', 'yugi_muto', 4, 7], ['A', 'dummy', 8, 7]]);
  assert.equal(engine.maxHpOf(Y), 10);
  assert.equal(engine.maxArmorOf(Y), 5);
});

test('เริ่มเกม: เด็ค 40 = เอ็กโซเดีย 5 + ไห 35 · มือ 5 · เด็ค 35', () => {
  const { Y } = setup([['Y', 'yugi_muto', 4, 7], ['A', 'dummy', 8, 7]]);
  assert.equal(Y.yugi.hand.length, 5);
  assert.equal(Y.yugi.deck.length, 35);
  const all = [...Y.yugi.hand, ...Y.yugi.deck];
  assert.equal(all.filter((c) => c === 'greed').length, 35);
  for (const pc of yugi.PIECES) assert.equal(all.filter((c) => c === pc).length, 1);
});

test('มือเริ่มต้นครบ 5 ชิ้นไม่ได้ (สุ่มใหม่)', (t) => {
  // สับรอบแรกด้วย 0.999999 = ไม่สลับเลย → 5 ใบแรกคือเอ็กโซเดีย 5 ชิ้น
  let n = 0;
  const orig = Math.random;
  t.after(() => { Math.random = orig; });
  Math.random = () => (n++ < 39 ? 0.999999 : orig());
  const p = { characterId: 'yugi_muto' };
  yugi.resetCombat(p);
  Math.random = orig;
  assert.equal(yugi.hasExodia(p.yugi.hand), false);
  assert.equal(p.yugi.hand.length + p.yugi.deck.length, 40);
});

test('ดรอว์: +1 ใบ เสีย 1 แต้ม · มือเต็ม 7 ดรอว์ไม่ได้ ไม่เสียแต้ม · ทิ้งที่เลือกกลับเข้าเด็ค', () => {
  const { Y } = setup([['Y', 'yugi_muto', 4, 7], ['A', 'dummy', 8, 7]]);
  Y.yugi.hand = ['greed', 'greed', 'exodia_head']; Y.yugi.deck = ['greed', 'greed', 'greed', 'greed', 'greed'];
  engine.setActor('Y');
  use('Y', 'basic', 'draw');
  assert.equal(Y.yugi.hand.length, 4);
  assert.equal(Y.skillPoints, 7);
  assert.equal(engine.action.locked, true);
  Y.yugi.hand = Array(7).fill('greed');
  use('Y', 'basic', 'draw');
  assert.equal(Y.yugi.hand.length, 7);
  assert.equal(Y.skillPoints, 7);
  Y.yugi.hand[3] = 'exodia_arm_r';
  const deckBefore = Y.yugi.deck.length;
  use('Y', 'basic', 'drop:3');
  assert.equal(Y.yugi.hand.length, 6);
  assert.ok(!Y.yugi.hand.includes('exodia_arm_r'));
  assert.ok(Y.yugi.deck.includes('exodia_arm_r'));
  assert.equal(Y.yugi.deck.length, deckBefore + 1);
  assert.equal(Y.skillPoints, 6);
});

test('ไม่มี form / ตำแหน่งเกินมือ / นอกตาเดิน = กดไม่ได้ ไม่เสียแต้ม', () => {
  const { Y } = setup([['Y', 'yugi_muto', 4, 7], ['A', 'dummy', 8, 7]]);
  engine.setActor('A');
  use('Y', 'basic', 'draw');
  assert.equal(Y.skillPoints, 8);
  engine.setActor('Y');
  use('Y', 'basic', undefined);
  use('Y', 'basic', 'drop:9');
  use('Y', 'secondary', 'play:9');
  assert.equal(Y.skillPoints, 8);
});

test('ขอเปิดใช้งาน ไหจอมละโมบ: ดรอว์ 2 · ไหกลับเข้าเด็ค · มือ 7 ใช้ไม่ได้', () => {
  const { Y } = setup([['Y', 'yugi_muto', 4, 7], ['A', 'dummy', 8, 7]]);
  engine.setActor('Y');
  Y.yugi.hand = ['greed', 'exodia_head']; Y.yugi.deck = ['greed', 'greed', 'greed'];
  use('Y', 'secondary', 'play:0');
  assert.deepEqual(Y.yugi.hand, ['exodia_head', 'greed', 'greed']);
  assert.equal(Y.yugi.deck.length, 2);
  assert.equal(Y.skillPoints, 6);
  Y.yugi.hand = Array(7).fill('greed');
  use('Y', 'secondary', 'play:0');
  assert.equal(Y.yugi.hand.length, 7);
  assert.equal(Y.skillPoints, 6);
});

test('ขอเปิดใช้งาน ชิ้นส่วนเอ็กโซเดีย: หลบการตีปกติแน่นอน 1 ครั้ง · ซ้อนไม่ได้ · ครั้งถัดไปโดนตามปกติ', () => {
  const { Y } = setup([['Y', 'yugi_muto', 4, 7], ['A', 'dummy', 5, 7]]);
  engine.setActor('Y');
  Y.yugi.hand = ['exodia_leg_l', 'greed'];
  use('Y', 'secondary', 'play:0');
  assert.ok(Y.yugi.guard);
  assert.ok(Y.yugi.deck.includes('exodia_leg_l'));
  Y.yugi.hand.push('exodia_arm_l');
  const sp = Y.skillPoints;
  use('Y', 'secondary', `play:${Y.yugi.hand.indexOf('exodia_arm_l')}`);
  assert.equal(Y.skillPoints, sp);
  const hp = Y.hp + Y.armor;
  engine.setActor('A');
  engine.attackTarget('A', 'Y');
  engine.clearPhaseTimer();
  assert.equal(Y.hp + Y.armor, hp);
  assert.equal(Y.yugi.guard, null);
  const orig = Math.random; Math.random = () => 0.99;
  try { engine.setActor('A'); engine.attackTarget('A', 'Y'); } finally { Math.random = orig; }
  engine.clearPhaseTimer();
  assert.ok(Y.hp + Y.armor < hp);
});

test('ป้องกันหมดอายุเมื่อถึงตาเดินถัดไปของยูกิในเทิร์นหน้า', () => {
  const { Y } = setup([['Y', 'yugi_muto', 4, 7], ['A', 'dummy', 8, 7]]);
  engine.setActor('Y');
  Y.yugi.hand = ['exodia_head'];
  use('Y', 'secondary', 'play:0');
  assert.ok(Y.yugi.guard);
  yugi.onActorStart(engine, Y);
  assert.ok(Y.yugi.guard, 'เทิร์นเดียวกันยังอยู่');
  engine.setRoundNumber(engine.roundNumber + 1);
  yugi.onActorStart(engine, Y);
  assert.equal(Y.yugi.guard, null);
});

test('ครบ 5 ชิ้นบนมือหลังดรอว์ = ชนะเกมทันที', () => {
  const { Y } = setup([['Y', 'yugi_muto', 4, 7], ['A', 'dummy', 8, 7]]);
  engine.setActor('Y');
  Y.yugi.hand = ['exodia_head', 'exodia_arm_r', 'exodia_arm_l', 'exodia_leg_r'];
  Y.yugi.deck = ['exodia_leg_l', 'greed'];
  use('Y', 'basic', 'draw');
  assert.deepEqual(clips, ['yugiExodia'], 'คลิป exodia_boost');
  assert.equal(match.forcedWinnerId, 'Y', 'คลิปจบ (เทสต์: คิวว่าง = ผลหลังคลิปลงทันที) → ชนะ');
  assert.equal(engine.gameState, 'GAMEOVER');
});

test('เพลง destiny: ชิ้นส่วนบนมือ 4 ชิ้นขึ้นไป · ลดเหลือ 3 = หยุด', () => {
  const { Y } = setup([['Y', 'yugi_muto', 4, 7], ['A', 'dummy', 8, 7]]);
  Y.yugi.hand = ['exodia_head', 'exodia_arm_r', 'exodia_arm_l', 'greed'];
  assert.equal(yugi.skillMusic(engine, Y), null);
  Y.yugi.hand.push('exodia_leg_r');
  const m = yugi.skillMusic(engine, Y);
  assert.equal(m.music, 'yugi_destiny');
  assert.equal(yugi.skillMusic(engine, Y).at, m.at, 'at คงเดิมระหว่างถือครบ 4');
  assert.equal(engine.buildStateFor('A').skillMusic, 'yugi_destiny', 'ทุกคนได้ยิน');
  Y.yugi.hand.shift();
  assert.equal(yugi.skillMusic(engine, Y), null);
});

test('ครบจากไหจอมละโมบก็ชนะ · ติดลบสกิลติดตัว = ยังไม่ชนะ', (t) => {
  const orig = Math.random;
  t.after(() => { Math.random = orig; });
  const { Y } = setup([['Y', 'yugi_muto', 4, 7], ['A', 'dummy', 8, 7]]);
  engine.setActor('Y');
  Y.statuses.noPassive = 2;
  Math.random = () => 0.999; // ไหที่ใช้แล้วแทรกท้ายเด็ค
  Y.yugi.hand = ['greed', 'exodia_head', 'exodia_arm_r', 'exodia_arm_l'];
  Y.yugi.deck = ['exodia_leg_r', 'exodia_leg_l', 'greed'];
  use('Y', 'secondary', 'play:0');
  assert.equal(yugi.hasExodia(Y.yugi.hand), true);
  assert.equal(match.forcedWinnerId, null);
  delete Y.statuses.noPassive;
  Y.yugi.hand = ['greed', 'exodia_head', 'exodia_arm_r', 'exodia_arm_l'];
  Y.yugi.deck = ['exodia_leg_r', 'exodia_leg_l', 'greed'];
  use('Y', 'secondary', 'play:0');
  assert.equal(match.forcedWinnerId, 'Y');
});

test('มือเป็นความลับ: เจ้าตัวเห็นการ์ด+ตัวเลือก · คนอื่นเห็นแค่จำนวน', () => {
  setup([['Y', 'yugi_muto', 4, 7], ['A', 'dummy', 8, 7]]);
  const mine = view('Y', 'Y');
  assert.equal(mine.yugi.hand.length, 5);
  assert.equal(mine.yugi.deck, 35);
  assert.equal(mine.character.basic.choices.length, 6);
  assert.equal(mine.character.secondary.choices.length, 5);
  for (const c of [...mine.character.basic.choices, ...mine.character.secondary.choices]) assert.ok(c.desc);
  const other = view('A', 'Y');
  assert.deepEqual(other.yugi, { count: 5 });
  assert.equal(other.character.basic.choices, undefined);
  assert.equal(other.character.secondary.choices, undefined);
});

test('ตัดผล (severables): ป้องกันถูกตัดได้', () => {
  const { Y } = setup([['Y', 'yugi_muto', 4, 7], ['A', 'dummy', 8, 7]]);
  engine.setActor('Y');
  Y.yugi.hand = ['exodia_head'];
  use('Y', 'secondary', 'play:0');
  const list = yugi.severables(engine, Y);
  assert.equal(list.length, 1);
  list[0].cancel();
  assert.equal(Y.yugi.guard, null);
});

test('เสียงการ์ด + เหตุการณ์อนิเมชัน (fx) ของแต่ละการกระทำ · ชนะ = ป้ายเอ็กโซเดียพร้อมเสียง', () => {
  const { Y } = setup([['Y', 'yugi_muto', 4, 7], ['A', 'dummy', 8, 7]]);
  engine.setActor('Y');
  Y.yugi.hand = ['greed', 'exodia_head', 'greed']; Y.yugi.deck = ['greed', 'greed', 'greed', 'greed'];
  const sound = () => { const k = Y.yugi.sound; return k; };
  use('Y', 'basic', 'draw');
  assert.equal(Y.yugi.fx.kind, 'draw'); assert.equal(Y.yugi.fx.drew, 1);
  assert.equal(sound(), null, 'useSkill อ่านเสียงไปแล้ว (skillSound)');
  const seq = Y.yugi.fx.seq;
  use('Y', 'basic', 'drop:2');
  assert.deepEqual([Y.yugi.fx.kind, Y.yugi.fx.i, Y.yugi.fx.card], ['drop', 2, 'greed']);
  assert.ok(Y.yugi.fx.seq > seq);
  use('Y', 'secondary', 'play:0');
  assert.deepEqual([Y.yugi.fx.kind, Y.yugi.fx.card, Y.yugi.fx.drew], ['play', 'greed', 2]);
  // เสียงที่ส่งกับป้ายสกิล
  Y.yugi.sound = null;
  yugi.applyInstantSkill(engine, Y, 'basic', [], { form: 'draw' });
  assert.equal(yugi.skillSound(Y), 'yugi_draw');
  Y.yugi.hand = ['exodia_arm_r']; Y.yugi.guard = null;
  yugi.applyInstantSkill(engine, Y, 'secondary', [], { form: 'play:0' });
  assert.equal(yugi.skillSound(Y), 'yugi_guard');
  // ดรอว์ใบที่ครบ 5 ชิ้น: ไม่มีเสียงการ์ด/ป้ายสกิลตัดหน้าคลิป (กฎ: เสียงห้ามซ้อนวีดีโอ)
  Y.yugi.hand = ['exodia_head', 'exodia_arm_r', 'exodia_arm_l', 'exodia_leg_r']; Y.yugi.deck = ['exodia_leg_l'];
  yugi.applyInstantSkill(engine, Y, 'basic', [], { form: 'draw' });
  assert.equal(yugi.skillSound(Y), null);
  assert.equal(yugi.silentFlash(Y), true);
  assert.deepEqual(clips, ['yugiExodia']);
});

test('สกิลการ์ด 5 ครั้งต่อเทิร์น (รวมทุกแบบ) · ไม่กิน/ไม่ติดโควตาสกิลปกติ · เทิร์นใหม่ได้ครบ', () => {
  const { Y } = setup([['Y', 'yugi_muto', 4, 7], ['A', 'dummy', 8, 7]]);
  engine.setActor('Y');
  Y.skillPoints = 8; Y.skillUsedRound = true; // ใช้สกิลอื่นกินโควตาไปแล้วก็ยังใช้การ์ดได้
  Y.yugi.hand = ['greed']; Y.yugi.deck = Array(20).fill('greed');
  for (let k = 0; k < 4; k++) engine.useSkill('Y', 'basic', [], { form: 'draw' });
  engine.useSkill('Y', 'basic', [], { form: 'drop:0' });
  assert.equal(Y.yugi.hand.length, 4);
  assert.equal(Y.skillPoints, 3);
  assert.equal(view('Y', 'Y').yugi.uses, 0);
  engine.useSkill('Y', 'basic', [], { form: 'draw' });
  engine.useSkill('Y', 'secondary', [], { form: 'play:0' });
  assert.equal(Y.yugi.hand.length, 4, 'ครั้งที่ 6 ใช้ไม่ได้');
  assert.equal(Y.skillPoints, 3, 'ไม่เสียแต้ม');
  const pub = view('Y', 'Y');
  assert.ok(pub.character.basic.choices.every((c) => c.locked && c.free));
  engine.setRoundNumber(engine.roundNumber + 1);
  engine.setActor('Y');
  engine.useSkill('Y', 'basic', [], { form: 'draw' });
  assert.equal(Y.yugi.hand.length, 5, 'เทิร์นใหม่ใช้ได้อีก');
  assert.equal(view('Y', 'Y').yugi.uses, 4);
});
