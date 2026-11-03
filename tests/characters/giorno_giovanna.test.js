// โจรุโน่ โจวาน่า (giorno_giovanna) — ชีวิตทดแทน / ต้นตอแห่งชีวิต (สะท้อน) / จงกำเนิดใหม่ (ต้นไม้หลบ · ตรึง) / Muda / ตีเพื่อน = ฮีล / เศษเดนมนุษย์
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const gio = require('../../characters/giorno_giovanna.js');
const { CHAR_BY_ID } = require('../../characters.js');

const realRandom = Math.random;
const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
// list = [[id, characterId, x, y, teamId?], ...] — แถว y = 6..8 ช่วง x = 3..6 ของภูมิภาค I เป็นพื้นโล่ง
function setup(list, mode = 'ffa') {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, ch, , , team], i) => { engine.players[id] = blank(id, ch, i + 1, team || null); });
  engine.setGameMode(mode);
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setJourneyArea(1);
  engine.setCycleShift(0);
  for (const [id, , x, y, team] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.skillPoints = 8; p.skillUsedRound = false; p.shield = 0;
    p.statuses = {}; p.statusAmt = {};
    if (team) p.teamId = team;
  }
  return engine.players;
}
const view = (viewerId, id) => engine.buildStateFor(viewerId).players.find((p) => p.id === id);
const vit = (p) => (p.hp || 0) + (p.armor || 0);
const item = (uid, type = 'armor') => ({ uid, type, value: 1 });

const saved = {
  triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash,
  notifyTransform: engine.notifyTransform, sfx: engine.sfx, boardFx: engine.boardFx,
};
const calls = { fx: [], sfx: [], flash: [], queue: [], clips: [], flashSound: [] };
const origClip = gio.preAttackClip, origSound = gio.skillSound;
test.before(() => {
  gio.skillSound = function (...a) { const r = origSound.apply(this, a); calls.flashSound.push(r); return r; }; // เสียงบนป้ายสกิล
  gio.preAttackClip = function (...a) { const r = origClip.apply(this, a); if (r) calls.clips.push(r); return r; }; // คลิปก่อนฉากตี (คิวผ่าน cutscene ตรงๆ)
  engine.triggerCutscene = () => {};
  engine.queueCutscene = (p, key) => calls.queue.push(key);
  engine.skillFlash = (f) => calls.flash.push(f);
  engine.notifyTransform = () => {};
  engine.sfx = (s) => calls.sfx.push(s);
  engine.boardFx = (event, payload) => calls.fx.push({ event, payload });
});
test.after(() => { gio.preAttackClip = origClip; gio.skillSound = origSound; Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.beforeEach(() => { for (const k of Object.keys(calls)) calls[k] = []; Math.random = () => 0.99; });
test.afterEach(() => { Math.random = realRandom; engine.setGameMode('ffa'); engine.setCycleShift(0); engine.clearPhaseTimer(); });

test('ข้อมูล: ปานกลาง · เดิน 4 ตีประชิด · 1 / 2–3 / 4 แต้ม · สกิลติดตัว 2 ช่อง', () => {
  const ch = CHAR_BY_ID.giorno_giovanna;
  assert.equal(ch.name, 'โจรุโน่ โจวาน่า');
  assert.equal(ch.difficulty, 'medium');
  assert.equal(ch.mov, 4);
  assert.deepEqual(ch.range, [1, 1]);
  assert.equal(ch.basic.cost, 1);
  assert.equal(ch.ultimate.cost, 4);
  assert.ok(ch.passive && ch.passive2);
});

test('ชีวิตทดแทน: สละไอเทมที่เลือก ฟื้นพลังชีวิต 1 · 2 ครั้งต่อเทิร์น · ไม่กินโควตา · เลือดเต็มกดไม่ได้', () => {
  const P = setup([['G', 'giorno_giovanna', 4, 7], ['B', 'dummy', 12, 12]]);
  P.G.hp = 3;
  P.G.inventory = [item('a'), item('b'), item('c')];
  engine.setActor('G');
  const choices = view('G', 'G').character.basic.choices;
  assert.deepEqual(choices.map((c) => c.key), ['a', 'b', 'c']);
  assert.ok(choices.every((c) => c.item && c.desc), 'ทุกตัวเลือกมีไอเทม + คำอธิบาย');
  engine.useSkill('G', 'basic', [], { form: 'b' });
  assert.equal(P.G.hp, 4);
  assert.equal(P.G.skillPoints, 7);
  assert.deepEqual(P.G.inventory.map((i) => i.uid), ['a', 'c']);
  assert.ok(!P.G.skillUsedRound, 'ไม่กินโควตาสกิล');
  engine.useSkill('G', 'basic', [], { form: 'nope' });
  assert.equal(P.G.hp, 4, 'ไอเทมที่ไม่มีอยู่ = กดไม่ได้ ไม่เสียแต้ม');
  assert.equal(P.G.skillPoints, 7);
  engine.useSkill('G', 'basic', [], { form: 'a' });
  assert.equal(P.G.hp, 5);
  engine.useSkill('G', 'basic', [], { form: 'c' });
  assert.equal(P.G.hp, 5, 'ครั้งที่ 3 ในเทิร์นเดียว = ไม่ได้');
  assert.equal(P.G.inventory.length, 1);
  assert.equal(view('G', 'G').skillLocks.basic.locked, true);
  // เทิร์นใหม่ + เลือดเต็ม
  engine.setRoundNumber(engine.roundNumber + 1);
  engine.setActor('G');
  P.G.hp = engine.maxHpOf(P.G);
  engine.useSkill('G', 'basic', [], { form: 'c' });
  assert.equal(P.G.inventory.length, 1, 'เลือดเต็มกดไม่ได้');
});

test('ต้นตอแห่งชีวิต: ศัตรูตีโดน = ไม่เสียหาย สะท้อนกลับ · 1 ครั้ง · คูลดาวน์ 2 เทิร์น', () => {
  const P = setup([['G', 'giorno_giovanna', 4, 7], ['B', 'dummy', 5, 7]]);
  const round = engine.roundNumber;
  engine.setActor('G');
  engine.useSkill('G', 'secondary', [], { form: 'reflect' });
  assert.equal(P.G.skillPoints, 5, '3 แต้ม');
  assert.ok(view('B', 'G').giorno.reflect, 'ทุกคนเห็นวงสะท้อน');
  P.B.statusAmt.might = 2; P.B.statuses.might = 1; // ตีแรง 3
  engine.setActor('B');
  const g0 = vit(P.G), b0 = vit(P.B);
  engine.attackTarget('B', 'G');
  engine.clearPhaseTimer();
  assert.equal(vit(P.G), g0, 'โจรุโน่ไม่เสียหาย');
  assert.equal(vit(P.B), b0 - 3, 'ผู้ตีโดนสะท้อน 3');
  const card = engine.buildStateFor('G').attack;
  assert.equal(card.dmg, 0, 'ฉากตีขึ้น 0');
  assert.ok(card.skills.some((s) => /ต้นตอแห่งชีวิต — สะท้อน 3/.test(s.name)));
  // ครั้งที่ 2 (คำสั่งใหม่) = โดนตามปกติ
  engine.setActor('B');
  engine.attackTarget('B', 'G');
  engine.clearPhaseTimer();
  assert.equal(vit(P.G), g0 - 3, 'ใช้ไปแล้ว — ครั้งถัดไปโดนจริง');
  // คูลดาวน์: กดเทิร์น R → ได้อีกเทิร์น R + 3
  engine.setRoundNumber(round + 2);
  engine.setActor('G');
  const ch = view('G', 'G').character.secondary.choices.find((c) => c.key === 'reflect');
  assert.equal(ch.cd, 1);
  engine.setRoundNumber(round + 3);
  engine.setActor('G');
  P.G.skillUsedRound = false;
  engine.useSkill('G', 'secondary', [], { form: 'reflect' });
  assert.ok(gio.reflectOn(engine, P.G), 'ครบคูลดาวน์ใช้ได้อีก');
  engine.setRoundNumber(round);
});

test('ต้นตอแห่งชีวิต: ดีบัฟจากการโจมตีครั้งนั้นติดผู้โจมตีแทน · สังหารทันทีไม่สะท้อน · ดาเมจไม่มีต้นตอ = กันไว้ไม่เสียผล', () => {
  const P = setup([['G', 'giorno_giovanna', 4, 7], ['B', 'dummy', 5, 7]]);
  engine.setActor('G');
  engine.useSkill('G', 'secondary', [], { form: 'reflect' });
  // ไม่มีต้นตอ (ลุกไหม้/พื้น) → กันไว้ ผลยังอยู่
  const g0 = vit(P.G);
  engine.withEffectSource(null, () => engine.dealMixed(P.G, 2));
  assert.equal(vit(P.G), g0);
  assert.ok(gio.reflectOn(engine, P.G));
  // ดีบัฟจากศัตรู → ติดศัตรูเอง
  engine.setActor('B');
  engine.withEffectSource(P.B, () => {
    assert.equal(engine.applyBleed(P.G, 2), 0);
    assert.equal(engine.applyDebuff(P.G, 'weak', 1, 2), false);
  });
  assert.equal(P.G.statuses.hbleed || 0, 0);
  assert.equal(P.B.statuses.hbleed, 2);
  assert.equal(P.B.statuses.weak, 2);
});

test('จงกำเนิดใหม่ (ตัวเอง): ลอยบนต้นไม้ หลบได้แน่นอน 1 ครั้ง · เดินไม่ได้ · คลิปครั้งแรกไม่มีเสียงเอฟเฟกต์', () => {
  const P = setup([['G', 'giorno_giovanna', 4, 7], ['B', 'dummy', 5, 7]]);
  engine.setActor('G');
  engine.useSkill('G', 'secondary', ['G'], { form: 'tree' });
  assert.equal(P.G.skillPoints, 6, '2 แต้ม');
  assert.deepEqual(calls.queue, ['gioTree']);
  assert.deepEqual(calls.flashSound, [null], 'คลิปขึ้น = ป้ายสกิลไม่มีเสียงเอฟเฟกต์');
  assert.ok(view('B', 'G').giorno.tree);
  assert.equal(engine.movOf(P.G), 0, 'ลอยอยู่ เดินไม่ได้');
  engine.setActor('B');
  const g0 = vit(P.G);
  engine.attackTarget('B', 'G');
  engine.clearPhaseTimer();
  assert.equal(vit(P.G), g0, 'หลบพ้น');
  assert.equal(engine.buildStateFor('G').attack.dodge, true);
  engine.setActor('B');
  engine.attackTarget('B', 'G');
  engine.clearPhaseTimer();
  assert.equal(vit(P.G), g0 - 1, 'หลบได้ครั้งเดียว');
});

test('จงกำเนิดใหม่ (ศัตรู): ถูกตรึง คลุมตาเดินถัดไป · ระยะเท่าระยะเดิน · ใช้ครั้งที่ 2 ไม่มีคลิป = มีเสียง', () => {
  const P = setup([['G', 'giorno_giovanna', 4, 7], ['B', 'dummy', 6, 8], ['C', 'dummy', 12, 12]]);
  engine.setActor('G');
  engine.useSkill('G', 'secondary', ['C'], { form: 'tree' });
  assert.equal(P.G.skillPoints, 8, 'นอกระยะเดิน = ไม่เสียแต้ม');
  engine.useSkill('G', 'secondary', ['B'], { form: 'tree' });
  assert.equal(P.B.statuses.rooted, 1, 'B ยังไม่ได้เดินในเทิร์นนี้ = 1 เทิร์น');
  assert.equal(engine.movOf(P.B), 0);
  P.G.cutsceneShown.gioTree = true;
  P.G.giorno.treeReady = 0;
  P.G.skillUsedRound = false;
  calls.queue = [];
  engine.useSkill('G', 'secondary', ['G'], { form: 'tree' });
  assert.deepEqual(calls.queue, [], 'คลิปเล่นครั้งเดียว');
  assert.equal(calls.flashSound.at(-1), 'gio_tree', 'ไม่มีคลิป = เสียงเอฟเฟกต์');
});

test('Muda!!!!!!!: ศัตรู ฮีล 3 → ล้างดีบัฟ → เปราะบาง + สตั้น → แล้วจึงเสียหาย (เปราะบางนับด้วย) · คลิปทุกครั้ง', () => {
  const P = setup([['G', 'giorno_giovanna', 4, 7], ['B', 'dummy', 5, 7]]);
  P.B.hp = 3; P.B.armor = 0;
  engine.applyDebuff(P.B, 'weak', 1, 3);
  engine.setActor('G');
  engine.useSkill('G', 'ultimate', []);
  assert.equal(P.G.skillPoints, 4);
  assert.equal(P.G.giorno.muda, true);
  assert.equal(view('G', 'G').skillLocks.ultimate.locked, true);
  engine.attackTarget('G', 'B');
  engine.clearPhaseTimer();
  // 3 + 3 = 6 → ตี 1 + เปราะบาง 1 = 2 → 4
  assert.equal(P.B.hp, 4);
  assert.equal(P.B.statuses.weak || 0, 0, 'ล้างดีบัฟ');
  assert.equal(P.B.statuses.fragile, 2);
  assert.ok(P.B.statuses.stun >= 1);
  assert.equal(P.G.giorno.muda, false, 'ใช้แล้วหมด');
  assert.deepEqual(calls.clips, ['gioMuda']);
});

test('Gold Experience: คริ 30% เฉพาะตีที่ไม่ได้เสริม Muda · ตีเพื่อน = ฮีล 1 (Muda = ฮีล 3 + ล้างดีบัฟ ไม่สตั้น)', () => {
  const P = setup([['G', 'giorno_giovanna', 4, 7, 'A'], ['F', 'dummy', 5, 7, 'A'], ['E', 'dummy', 12, 12, 'B']], 'duo');
  assert.equal(gio.critPct(P.G), 30);
  P.G.giorno.muda = true;
  assert.equal(gio.critPct(P.G), 0);
  P.G.giorno.muda = false;
  P.F.hp = 3;
  engine.setActor('G');
  assert.equal(view('G', 'G').allyStrike, true);
  assert.equal(engine.buildStateFor('G').forecast.F.heal, 1);
  engine.attackTarget('G', 'F');
  engine.clearPhaseTimer();
  assert.equal(P.F.hp, 4, 'ฮีล 1');
  // Muda ใส่เพื่อน
  engine.setRoundNumber(engine.roundNumber + 1);
  engine.setActor('G');
  engine.applyDebuff(P.F, 'weak', 1, 3);
  P.F.statuses.weak = 3;
  P.G.giorno.muda = true;
  engine.attackTarget('G', 'F');
  engine.clearPhaseTimer();
  assert.equal(P.F.hp, 7, 'ฮีล 3');
  assert.equal(P.F.statuses.weak || 0, 0);
  assert.equal(P.F.statuses.stun || 0, 0, 'เพื่อนไม่สตั้น');
  assert.equal(P.F.statuses.fragile || 0, 0);
  assert.ok(calls.queue.includes('gioMuda'));
});

test('เศษเดนมนุษย์อย่างแกน่ะ…: เลือด ≤ 3 + ทอยติด = ความเสียหาย 5 ไม่คริ · 1 ครั้งต่อเกม · คลิป', () => {
  const P = setup([['G', 'giorno_giovanna', 4, 7], ['B', 'dummy', 5, 7]]);
  P.G.hp = 3;
  P.B.hp = 7; P.B.armor = 3;
  Math.random = () => 0.1;
  engine.setActor('G');
  engine.attackTarget('G', 'B');
  engine.clearPhaseTimer();
  assert.equal(vit(P.B), 10 - 5);
  assert.equal(P.G.giorno.rageUsed, true);
  assert.deepEqual(calls.clips, ['gioPassive2']);
  // ครั้งที่สอง: ไม่ติดอีก (คริ 30% ติดแทนเพราะ random 0.1)
  calls.clips = [];
  engine.setActor('G');
  const b0 = vit(P.B);
  engine.attackTarget('G', 'B');
  engine.clearPhaseTimer();
  assert.equal(vit(P.B), b0 - 2, 'คริ ×2');
  assert.deepEqual(calls.clips, ['gioCrit']);
});

test('ตัดผลสกิล: ต้นตอแห่งชีวิต / Muda / ต้นไม้ที่ให้คนอื่น อยู่ใน severables', () => {
  const P = setup([['G', 'giorno_giovanna', 4, 7], ['B', 'dummy', 5, 7]]);
  engine.setActor('G');
  engine.useSkill('G', 'secondary', [], { form: 'reflect' });
  P.G.giorno.muda = true;
  const keys = gio.severables(engine, P.G).map((x) => x.key);
  assert.deepEqual(keys.sort(), ['gioMuda', 'gioReflect']);
  for (const x of gio.severables(engine, P.G)) x.cancel();
  assert.equal(gio.reflectOn(engine, P.G), false);
  assert.equal(P.G.giorno.muda, false);
});
