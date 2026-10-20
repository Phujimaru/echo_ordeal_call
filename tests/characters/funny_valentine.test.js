// ฟันนี่ วาเลนไทน์ (funny_valentine) — หลบสายตา / ปืนแห่งสันติภาพ / ธงชาติแห่งสันติภาพ 4 แบบ / สันติภาพและความยุติธรรม
//  กติกา: GRID_PLAN.md §7.13 · ระบบกลาง server/dimension.js (ชั้นมิติ) + server/summon.js (ยูนิตที่ถูกเรียก) + ฮุค afterActorEnd
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const val = require('../../characters/funny_valentine.js');
const { CHAR_BY_ID } = require('../../characters.js');
const { gameOver } = require('../../server/phases/endTurn.js');

const realRandom = Math.random;
const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
// list = [[id, characterId, x, y], ...] — ภูมิภาค I (แถว 7/8 โล่ง · สิ่งกีดขวาง (3,3) (4,4) (4,9) (3,10))
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
const fxOf = (kind) => calls.fx.filter((f) => f.event === 'valentineFx' && f.payload.kind === kind).map((f) => f.payload);
const ult = (id, form, targets = [], extra = {}) => engine.useSkill(id, 'ultimate', targets, { form, ...extra });
const doubles = () => Object.values(engine.players).filter((p) => p.summon && p.summon.kind === 'double' && p.alive);
const clones = (id) => Object.values(engine.players).filter((p) => p.summon && p.summon.kind === 'clone' && p.alive && p.summon.ownerId === id);

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
  engine.sfx = (s) => calls.sfx.push(s);
  engine.boardFx = (event, payload) => calls.fx.push({ event, payload });
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.beforeEach(() => { for (const k of Object.keys(calls)) calls[k] = []; Math.random = () => 0.99; });
test.afterEach(() => { Math.random = realRandom; engine.setGameMode('ffa'); engine.setCycleShift(0); engine.setShopPos(null); engine.clearPhaseTimer(); });

test('ข้อมูล: พิเศษ · unique · พลังชีวิต 7 เกราะ 3 · เดิน 4 · ตี [1, 2] · ไอคอนสกิล · ทุกตัวเลือกมี desc · สัญญาข้อมูล §7.13', () => {
  const ch = CHAR_BY_ID.funny_valentine;
  assert.equal(ch.difficulty, 'special');
  assert.equal(ch.unique, true);
  assert.deepEqual([ch.mov, ch.range], [4, [1, 2]]);
  assert.equal(ch.img, '/characters/funny_valentine/valentine.webp');
  assert.deepEqual([ch.basic.img, ch.secondary.img, ch.ultimate.img], ['/characters/funny_valentine/funny_skill1.webp', '/characters/funny_valentine/funny_skill2.jpg', '/characters/funny_valentine/funny_skill3.webp']);
  assert.deepEqual(ch.secondary.area, { kind: 'line', len: 5, width: 1, hostile: true });
  const P = setup([['V', 'funny_valentine', 2, 7], ['B', 'dummy', 9, 7]]);
  assert.deepEqual([P.V.hp, P.V.armor, engine.movOf(P.V)], [7, 3, 4]);
  const me = view('V', 'V');
  assert.deepEqual(Object.keys(me.valentine).sort(), ['ammo', 'ammoMax', 'parallel', 'reloadCd', 'ultCd', 'veil', 'veilCd'].sort());
  assert.deepEqual(me.valentine.ultCd, { parallel: 0, selves: 0, know: 0, justice: 0 });
  assert.equal(view('B', 'V').valentine.ammo, 3, 'ทุกคนเห็น');
  assert.deepEqual(me.character.secondary.choices.map((c) => c.key), ['s1', 's2', 's3']);
  assert.deepEqual(me.character.ultimate.choices.map((c) => [c.key, c.cost]), [['parallel', 6], ['selves', 6], ['know', 4], ['justice', 4]]);
  for (const c of [...me.character.secondary.choices, ...me.character.ultimate.choices]) assert.ok(c.desc && !/\d+\.\d+\.\d+/.test(c.desc), `${c.key} มี desc (ไม่มีเลขแพตช์)`);
  assert.ok(Array.isArray(me.character.ultimate.choices.find((c) => c.key === 'know').area.cells));
  assert.deepEqual(engine.buildStateFor('B').board.valentine, { flags: [] });
  assert.equal(me.dim, null);
  assert.equal(me.summon, null);
});

test('ระยะ/ตาเดิน: นอกตาตัวเองกดไม่ได้ · ตีปกติประชิด = มีด · ห่าง 2 = ปืน · สกิลติดตัว +1 ครั้งเดียวต่อการโจมตี', () => {
  const P = setup([['V', 'funny_valentine', 2, 7], ['B', 'dummy', 4, 7], ['C', 'dummy', 12, 2]]);
  engine.useSkill('V', 'secondary', [], { form: 's1', dir: 'right' });
  assert.equal(P.V.valentine.ammo, 3, 'ไม่ใช่ตาของตัวเอง = ไม่ทำงาน');
  P.V.skillPoints = 2;
  engine.setActor('V');
  assert.ok(engine.attackTarget('V', 'B'));
  assert.equal(engine.lastAttack.byStyle, 'valGun');
  assert.equal(engine.lastAttack.byAttackSound, 'val_gun');
  assert.equal(P.V.skillPoints, 3, 'ตีโดน +1');
  assert.equal(fxOf('gain').length, 1);
  engine.clearPhaseTimer();
  P.B.pos = { x: 3, y: 7 };
  engine.setActor('V');
  assert.ok(engine.attackTarget('V', 'B'));
  assert.equal(engine.lastAttack.byStyle, 'valKnife');
  assert.equal(P.V.skillPoints, 4, 'การโจมตีครั้งใหม่ = +1 อีก');
  engine.clearPhaseTimer();
  // ดาเมจไม่ลงจริง (โล่) = ไม่ได้แต้ม
  P.B.shield = 5;
  engine.setActor('V');
  assert.ok(engine.attackTarget('V', 'B'));
  assert.equal(P.V.skillPoints, 4, 'โล่กันหมด = ไม่ได้');
});

test('ปืนแห่งสันติภาพ: ยิง 3 นัดทิศเดียวกัน โดนศัตรูคนแรกทุกนัด · +1 ครั้งเดียว · กินโควตา + ล็อกการเดิน · หมด = รีโหลด 5 เทิร์น', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['V', 'funny_valentine', 2, 7], ['B', 'dummy', 4, 7], ['C', 'dummy', 6, 7]]);
  P.V.skillPoints = 0;
  engine.setActor('V');
  engine.useSkill('V', 'secondary', [], { form: 's3', dir: 'right' });
  assert.equal(vit(P.B), 10 - 3, 'B โดน 3 นัด');
  assert.equal(vit(P.C), 10, 'C ด้านหลังไม่โดน');
  assert.equal(P.V.skillPoints, 1, 'ยิงหลายนัดในการกดครั้งเดียว = +1');
  assert.equal(P.V.valentine.ammo, 0);
  assert.equal(P.V.valentine.reloadRound, 2 + 5);
  assert.equal(P.V.skillUsedRound, true, 'กินโควตา');
  assert.equal(engine.action.locked, true, 'ยิงแล้วเดินไม่ได้');
  const shots = fxOf('shots')[0];
  assert.equal(shots.shots.length, 3);
  assert.ok(shots.shots.every((s) => s.hitId === 'B' && !s.miss));
  assert.equal(engine.gameState, 'ATTACKING', 'พักฉากยิง');
  flush(t, 1200);
  assert.equal(engine.gameState, 'ACTION', 'กลับเข้าตา (ตีปกติต่อได้)');
  assert.equal(view('V', 'V').skillLocks.secondary.locked, true);
  assert.equal(view('V', 'V').valentine.reloadCd, 5);
  engine.setRoundNumber(7);
  val.onRoundStartTick(engine, P.V);
  assert.equal(P.V.valentine.ammo, 3, 'ต้นเทิร์น N+5 เต็ม 3');
  assert.equal(fxOf('reload').length, 1);
});

test('ปืน: นัดที่เป้าตายแล้วไปโดนคนถัดไป · กระสุนไม่พอ/ทิศผิด = กดไม่ได้ไม่เสียอะไร · หลบได้', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['V', 'funny_valentine', 2, 7], ['B', 'dummy', 4, 7], ['C', 'dummy', 6, 7], ['D', 'dummy', 12, 2]]);
  P.B.hp = 1; P.B.armor = 0;
  engine.setActor('V');
  engine.useSkill('V', 'secondary', [], { form: 's3', dir: 'right' });
  assert.equal(P.B.alive, false);
  assert.equal(vit(P.C), 10 - 2, 'นัดที่ 2–3 ไป C');
  flush(t, 1200);
  // กระสุนไม่พอ
  P.V.valentine.ammo = 1; P.V.skillUsedRound = false;
  engine.setActor('V');
  engine.useSkill('V', 'secondary', [], { form: 's2', dir: 'right' });
  assert.equal(P.V.valentine.ammo, 1, 's2 ตอนเหลือ 1 นัด = ไม่ทำงาน');
  engine.useSkill('V', 'secondary', [], { form: 's1' });
  assert.equal(P.V.valentine.ammo, 1, 'ไม่เลือกทิศ = ไม่ทำงาน');
  assert.equal(P.V.skillUsedRound, false);
  // หลบหลีก 100%
  P.C.statuses.evade = 1; P.C.statusAmt.evade = 100;
  const before = vit(P.C);
  engine.useSkill('V', 'secondary', [], { form: 's1', dir: 'right' });
  assert.equal(vit(P.C), before, 'หลบพ้น');
  assert.equal(fxOf('shots').pop().shots[0].miss, true);
});

test('หลบสายตา: 4 แต้ม · ธงชาติ · ศัตรูมองไม่เห็น/แตะไม่ได้ · เดินทะลุสิ่งกีดขวาง (กดก่อนเดินยังเดินได้) · ใช้ปืน/ท่าไม้ตายอื่นไม่ได้ · ออก 0 แต้ม ช่องว่างใกล้สุด · คูลดาวน์ 3', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['V', 'funny_valentine', 3, 2], ['B', 'dummy', 3, 1], ['C', 'dummy', 12, 2]]);
  engine.setActor('V');
  engine.useSkill('V', 'basic', []);
  assert.equal(P.V.skillPoints, 4);
  assert.ok(P.V.dim && P.V.dim.startsWith('veil:'));
  assert.equal(engine.action.locked, false, 'กดก่อนเดิน = ยังเดินได้');
  assert.deepEqual(engine.buildStateFor('B').board.valentine.flags, [{ x: 3, y: 2, ownerId: 'V' }]);
  assert.equal(view('B', 'V').pos, null, 'ศัตรูเห็นแค่ธง');
  assert.ok(fxOf('veilIn').length === 1);
  flush(t, 1500);
  assert.ok(engine.moveTo('V', 3, 3), 'ยืนบนสิ่งกีดขวางได้ (เดินทะลุ)');
  assert.deepEqual(P.V.pos, { x: 3, y: 3 });
  assert.ok(engine.moveTo('V', 3, 5), 'ทะลุสิ่งกีดขวาง');
  // แตะไม่ได้ / ทำอะไรใครไม่ได้
  const v0 = vit(P.V);
  engine.withEffectSource(P.B, () => engine.dealMixed(P.V, 3, false));
  assert.equal(vit(P.V), v0, 'ไม่โดนอะไรเลย');
  assert.equal(engine.applyDebuff(P.V, 'weak', 1, 2), false);
  engine.useSkill('V', 'secondary', [], { form: 's1', dir: 'up' });
  assert.equal(P.V.valentine.ammo, 3, 'ปืนใช้ไม่ได้ในมิติ');
  ult('V', 'selves');
  assert.equal(clones('V').length, 0, 'ท่าไม้ตายอื่นใช้ไม่ได้');
  const me = view('V', 'V');
  assert.equal(me.skillLocks.secondary.locked, true);
  assert.ok(me.character.ultimate.choices.filter((c) => c.key !== 'justice').every((c) => c.locked));
  assert.equal(me.character.ultimate.choices.find((c) => c.key === 'justice').locked, false);
  assert.deepEqual([me.character.basic.cost, me.character.basic.active], [0, true]);
  assert.equal(me.skillLocks.basic.free, true);
  // ออก: กลับไปยืนช่อง (3,3) ไม่ได้ → ช่องว่างใกล้สุด (ย้ายตัวกลับไปยืนบนสิ่งกีดขวางก่อน)
  P.V.pos = { x: 3, y: 3 };
  P.V.skillUsedRound = true; // ใช้โควตาไปแล้วก็ยังกดออกได้
  engine.useSkill('V', 'basic', []);
  assert.equal(P.V.dim, null);
  assert.equal(P.V.skillPoints, 4, 'ออก 0 แต้ม');
  assert.notDeepEqual(P.V.pos, { x: 3, y: 3 });
  assert.equal(engine.tileFree(P.V.pos.x, P.V.pos.y, 'V'), true);
  assert.equal(fxOf('veilOut')[0].from.x, 3);
  assert.deepEqual(engine.buildStateFor('B').board.valentine.flags, []);
  assert.equal(P.V.valentine.veilReady, 2 + 3);
  flush(t, 1500);
  P.V.skillUsedRound = false;
  engine.useSkill('V', 'basic', []);
  assert.equal(P.V.dim, null, 'คูลดาวน์ — กดไม่ได้ ไม่เสียแต้ม');
  assert.equal(P.V.skillPoints, 4);
  assert.equal(view('V', 'V').valentine.veilCd, 3);
});

test('หลบสายตา: กดหลังเดิน = เดินต่อไม่ได้ · ศัตรูตีไม่ได้ · อยู่ได้ 3 เทิร์น แต้มสกิล +1 ต่อเทิร์น แล้วโผล่เอง', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['V', 'funny_valentine', 2, 7], ['B', 'dummy', 4, 7]]);
  engine.setActor('V');
  assert.ok(engine.moveTo('V', 3, 7));
  engine.useSkill('V', 'basic', []);
  assert.equal(engine.action.locked, true, 'เดินแล้วค่อยกด = ล็อกการเดิน');
  flush(t, 1500);
  engine.setActor('B');
  assert.equal(engine.attackTarget('B', 'V'), false, 'มองไม่เห็น/คนละชั้น = ตีไม่ได้');
  P.V.skillPoints = 0;
  for (const r of [2, 3]) { engine.setRoundNumber(r); val.onEndTurn(engine); assert.ok(P.V.valentine.veil, `ยังอยู่จบเทิร์น ${r}`); }
  engine.setRoundNumber(4);
  val.onEndTurn(engine);
  assert.equal(P.V.valentine.veil, null, 'จบเทิร์นที่ 3 โผล่');
  assert.equal(P.V.dim, null);
  assert.equal(P.V.skillPoints, 3, '+1 ต่อเทิร์นในมิติ');
  assert.equal(P.V.valentine.veilReady, 7);
});

test('จงปลาบปลื้ม: ศัตรูในแนว 4×3 + ตัวเองไปกระดานคู่ขนาน · ตัวเหมือนเกิดห่าง 2 · คนละชั้นทำอะไรกันไม่ได้ · ขวางเฉพาะชั้นเดียวกัน', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['V', 'funny_valentine', 2, 7], ['B', 'dummy', 4, 7], ['C', 'dummy', 10, 7]]);
  engine.setActor('V');
  ult('V', 'parallel', [], { dir: 'up' });
  assert.equal(P.V.skillPoints, 8, 'ไม่มีศัตรูในแนว = กดไม่ได้ ไม่เสียแต้ม');
  ult('V', 'parallel', [], { dir: 'right' });
  assert.equal(P.V.skillPoints, 2);
  const dim = P.V.valentine.parallel;
  assert.ok(dim && dim.startsWith('par:V:'));
  assert.deepEqual([P.V.dim, P.B.dim, P.C.dim], [dim, dim, null]);
  const [d] = doubles();
  assert.ok(d, 'ตัวเหมือนของ B');
  assert.equal(d.dim, dim);
  assert.equal(Math.abs(d.pos.x - 4) + Math.abs(d.pos.y - 7), 2, 'เกิดห่างเป้า 1 ช่องเว้นว่าง');
  assert.deepEqual([d.hp, d.armor, engine.baseMovOf(d)], [3, 2, 5]);
  const dv = view('C', d.id);
  assert.deepEqual([dv.summon.kind, dv.summon.targetId, dv.name, dv.dim], ['double', 'B', 'B', dim]);
  assert.equal(view('C', 'B').dim, dim);
  assert.equal(fxOf('parallelIn').length, 1);
  assert.equal(fxOf('doubleSpawn')[0].targetId, 'B');
  assert.equal(engine.gameState, 'ATTACKING');
  flush(t, 3000);
  // คนละชั้น: เล็ง/ตี/ดาเมจ ไม่ถึง · ช่องของคนคนละชั้นไม่ขวาง
  P.C.pos = { x: 5, y: 7 };
  engine.setActor('C');
  assert.equal(engine.attackTarget('C', 'B'), false);
  const b0 = vit(P.B);
  engine.withEffectSource(P.C, () => engine.dealMixed(P.B, 2, false));
  assert.equal(vit(P.B), b0, 'ตาข่ายกันเหนียว: ต้นตอคนละชั้น');
  assert.equal(engine.tileFree(4, 7, 'C'), true, 'B ไม่ขวาง C');
  assert.equal(engine.tileFree(4, 7, 'V'), false, 'B ขวางวาเลนไทน์ (ชั้นเดียวกัน)');
  assert.equal(engine.buildStateFor('C').forecast.B, undefined, 'ไม่มีคาดการณ์ข้ามชั้น');
  // ชั้นเดียวกันตีกันได้อิสระ
  engine.setActor('B');
  P.B.pos = { x: 3, y: 7 };
  assert.ok(engine.attackTarget('B', 'V'));
  engine.clearPhaseTimer();
  // เปิดได้ทีละมิติ
  engine.setActor('V');
  P.V.skillPoints = 8; P.V.skillUsedRound = false; P.V.valentine.ultReady.parallel = 0;
  ult('V', 'parallel', [], { dir: 'right' });
  assert.equal(P.V.skillPoints, 8, 'มิติเดิมยังเปิด = กดไม่ได้');
});

test('จงปลาบปลื้ม: จบตาเดินของเป้า = ตัวเหมือนวิ่งเข้าหา ชน −4 (เกราะก่อน) · +1 แต้ม · กลับกระดานหลัก · ตัวสุดท้าย = มิติปิด', () => {
  const P = setup([['V', 'funny_valentine', 2, 7], ['B', 'dummy', 4, 7], ['C', 'dummy', 12, 2]]);
  engine.setActor('V');
  ult('V', 'parallel', [], { dir: 'right' });
  engine.clearPhaseTimer();
  P.V.skillPoints = 0;
  const [d] = doubles();
  engine.setActor('B');
  engine.finishActor();
  assert.equal(vit(P.B), 10 - 4);
  assert.equal(P.B.armor, 0, 'เกราะก่อน');
  assert.equal(d.alive, false, 'ชนแล้วสลาย');
  assert.deepEqual([P.B.dim, P.V.dim, P.V.valentine.parallel], [null, null, null]);
  assert.equal(P.V.skillPoints, 1, 'ตัวเหมือนชน = +1');
  assert.equal(fxOf('doubleRun').length, 1);
  assert.equal(fxOf('menger')[0].dmg, 4);
  assert.deepEqual(fxOf('dimOut')[0].ids.sort(), ['B', 'V']);
  assert.equal(engine.gameState, 'ATTACKING', 'ค้างฉากวิ่ง + ชน');
  assert.equal(view('C', d.id), undefined, 'ระเบียนที่สลายไม่ส่ง');
});

test('จงปลาบปลื้ม: ทำลายตัวเหมือน = เป้ากลับโดยไม่เสียหาย · เป้าถูกข้ามตา = ตัวเหมือนรอ · ตัวเหมือนไม่นับเป็นผู้รอด', () => {
  const P = setup([['V', 'funny_valentine', 2, 7], ['B', 'dummy', 4, 7], ['C', 'dummy', 4, 8]]);
  engine.setActor('V');
  ult('V', 'parallel', [], { dir: 'right' });
  engine.clearPhaseTimer();
  assert.equal(doubles().length, 2);
  const dB = doubles().find((d) => d.summon.targetId === 'B');
  const dC = doubles().find((d) => d.summon.targetId === 'C');
  const pos0 = { ...dC.pos };
  // C ไม่ได้จบตา (สตั้น — ไม่มี finishActor) = ตัวเหมือนอยู่ที่เดิม
  assert.deepEqual(dC.pos, pos0);
  const b0 = vit(P.B);
  engine.withEffectSource(P.V, () => { engine.dealMixed(dB, 5, false); if (dB.hp <= 0) engine.instantDeath(dB); });
  assert.equal(dB.alive, false);
  assert.equal(vit(P.B), b0, 'ไม่เสียเลือด');
  assert.equal(P.B.dim, null, 'B กลับกระดานหลัก');
  assert.ok(P.V.dim, 'ยังมีตัวเหมือนของ C = มิติยังเปิด');
  assert.equal(fxOf('doubleBreak').length, 1);
  // ตัวเหมือนไม่นับเป็นผู้รอด: เหลือ V + ตัวเหมือนของ C → C ตาย = จบเกม
  P.B.alive = false; P.B.pos = null;
  assert.equal(gameOver(), false);
  engine.setGameState('ACTION');
  engine.withEffectSource(P.V, () => engine.instantDeath(P.C));
  assert.equal(dC.alive, false, 'เป้าตาย = ตัวเหมือนหาย');
  assert.equal(P.V.dim, null, 'มิติปิด');
  assert.equal(gameOver(), true);
});

test('รู้จักตัวเองอย่างแท้จริง: กรอบ 3×3 ติดตัว 4 ทิศ (นอกกรอบกดไม่ได้) · ตัวเหมือนบนกระดานหลัก · ชน 2 ทะลุเกราะ', () => {
  const P = setup([['V', 'funny_valentine', 2, 7], ['B', 'dummy', 4, 9], ['C', 'dummy', 12, 2]]);
  P.B.pos = { x: 0, y: 9 }; // (−2, 2) — แนวทแยง ไม่อยู่ในกรอบ
  engine.setActor('V');
  ult('V', 'know', ['B']);
  assert.equal(P.V.skillPoints, 8, 'นอกกรอบ = ไม่ทำงาน ไม่เสียแต้ม');
  P.B.pos = { x: 5, y: 7 }; // (3, 0) — ขอบกรอบขวา
  ult('V', 'know', ['B']);
  assert.equal(P.V.skillPoints, 4);
  const [d] = doubles();
  assert.equal(d.dim, null);
  assert.equal(d.summon.targetId, 'B');
  engine.clearPhaseTimer();
  engine.setActor('B');
  engine.finishActor();
  assert.equal(P.B.armor, 3, 'ทะลุเกราะ');
  assert.equal(P.B.hp, 7 - 2);
  assert.equal(d.alive, false);
  assert.equal(P.V.valentine.ultReady.know, 2 + 3);
  const choice = view('V', 'V').character.ultimate.choices.find((c) => c.key === 'know');
  assert.deepEqual([choice.locked, choice.left], [true, 3], 'คูลดาวน์ = locked + left');
  assert.equal(view('V', 'V').character.ultimate.choices.find((c) => c.key === 'justice').locked, false, 'คูลดาวน์แยกกัน');
});

test('แด่ตัวฉันทุกคน: ร่างแยก 3 ตัวติดตัว · จบตาทันทีแล้วคุมทีละตัว 20 วิ · แต้มร่วม · ตีดาเมจ 1 +1 แต้ม · ใช้สกิลไม่ได้', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['V', 'funny_valentine', 2, 7], ['B', 'dummy', 2, 9], ['C', 'dummy', 12, 2]]);
  engine.setActor('V');
  ult('V', 'selves');
  assert.equal(P.V.skillPoints, 2);
  const cs = clones('V');
  assert.equal(cs.length, 3);
  for (const c of cs) assert.equal(Math.abs(c.pos.x - 2) + Math.abs(c.pos.y - 7), 1, 'ติดตัว');
  assert.deepEqual([cs[0].hp, cs[0].armor, engine.baseMovOf(cs[0]), engine.rangeOf(cs[0])], [1, 1, 4, [1, 2]]);
  assert.equal(fxOf('clones')[0].spawns.length, 3);
  flush(t, 1500);
  assert.equal(engine.actorId, cs[0].id, 'ตัวจริงจบตา → ร่างแยกตัวแรก');
  assert.equal(engine.timeLeft, 20);
  const st = engine.buildStateFor('V');
  assert.deepEqual([st.controlId, st.duo.ownerId], [cs[0].id, 'V']);
  const cv = st.players.find((p) => p.id === cs[0].id);
  assert.deepEqual([cv.duoOf, cv.summon.kind, cv.character.name], ['V', 'clone', CHAR_BY_ID.funny_valentine.name]);
  assert.ok(['basic', 'secondary', 'ultimate'].every((k) => cv.skillLocks[k].locked));
  assert.equal(st.players.filter((p) => !p.duoOf).length, 3, 'ไม่นับในรายชื่อผู้เล่น');
  // แต้มใช้ร่วม
  cs[0].skillPoints += 1;
  assert.equal(P.V.skillPoints, 3);
  engine.useSkill(cs[0].id, 'secondary', [], { form: 's1', dir: 'down' });
  assert.equal(P.V.valentine.ammo, 3, 'ร่างแยกใช้สกิลไม่ได้');
  // ตีปกติระยะ 2 ดาเมจ 1 → +1 แต้ม
  const near = cs.find((c) => Math.abs(c.pos.x - 2) + Math.abs(c.pos.y - 9) <= 2);
  if (near !== cs[0]) { const tmp = cs[0].pos; cs[0].pos = near.pos; near.pos = tmp; }
  P.B.shield = 0;
  const b0 = vit(P.B);
  assert.ok(engine.attackTarget(cs[0].id, 'B'));
  assert.equal(b0 - vit(P.B), 1);
  assert.equal(P.V.skillPoints, 4, 'ร่างแยกตีโดน = +1');
  engine.clearPhaseTimer();
  engine.finishActor();
  assert.equal(engine.actorId, cs[1].id, 'ตีแล้ว = ตัวถัดไป');
  engine.waitAction(cs[1].id);
  assert.equal(engine.actorId, cs[2].id);
});

test('ร่างแยก: เทิร์นถัดไปตัวจริงเดินก่อนแล้วร่างแยก · หมดเวลาจบเทิร์นถัดไป · ตัวจริงตาย = หายหมด · ไม่นับเป็นผู้รอด', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['V', 'funny_valentine', 2, 7], ['B', 'dummy', 10, 7]]);
  engine.setActor('V');
  ult('V', 'selves');
  engine.clearPhaseTimer();
  const cs = clones('V');
  assert.equal(cs[0].summon.until, 3, 'อยู่ถึงจบเทิร์นถัดไป');
  // เทิร์นถัดไป: ลำดับ V → B
  engine.setRoundNumber(3);
  engine.beginOrder();
  engine.turnOrder.splice(0, engine.turnOrder.length, 'V', 'B');
  flush(t, 6600);
  assert.equal(engine.actorId, 'V', 'ตัวจริงก่อน');
  assert.equal(engine.timeLeft > 20, true);
  engine.waitAction('V');
  assert.equal(engine.actorId, cs[0].id);
  engine.waitAction(cs[0].id); engine.waitAction(cs[1].id); engine.waitAction(cs[2].id);
  assert.equal(engine.actorId, 'B', 'ร่างแยกครบ → คนถัดไป');
  engine.clearPhaseTimer();
  val.onEndTurn(engine);
  assert.equal(clones('V').length, 0, 'หมดเวลา');
  assert.equal(fxOf('cloneFade').length, 1);
  // ตัวจริงตาย = ร่างแยกหาย · ไม่นับเป็นผู้รอด
  engine.setActor('V');
  P.V.skillPoints = 8; P.V.skillUsedRound = false; P.V.valentine.ultReady.selves = 0;
  ult('V', 'selves');
  engine.clearPhaseTimer();
  assert.equal(clones('V').length, 3);
  engine.withEffectSource(P.B, () => engine.instantDeath(P.V));
  assert.equal(clones('V').length, 0);
  assert.equal(gameOver(), true, 'เหลือ B คนเดียว');
});

test('ความยุติธรรมไม่มีวันตาย: สุ่มพลังชีวิต 2–4 · เกราะ 1–3 · แต้ม 2–5 (หลังหักราคา) · ล้างสถานะทั้งหมด · ใช้ในมิติได้', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['V', 'funny_valentine', 2, 7], ['B', 'dummy', 10, 7]]);
  P.V.statuses = { weak: 2, might: 2, stun: 1 }; P.V.statusAmt = { weak: 1, might: 1 }; P.V.tempHp = 2; P.V.shield = 1;
  engine.setActor('V');
  Math.random = () => 0;
  ult('V', 'justice');
  assert.deepEqual([P.V.hp, P.V.armor, P.V.skillPoints], [2, 1, 2]);
  assert.deepEqual(P.V.statuses, {});
  assert.deepEqual([P.V.tempHp, P.V.shield], [0, 0]);
  assert.equal(fxOf('justice').length, 1);
  flush(t, 2000);
  // สูงสุด + ใช้ในมิติหลบสายตาได้
  P.V.skillPoints = 8; P.V.skillUsedRound = false; P.V.valentine.ultReady.justice = 0;
  engine.useSkill('V', 'basic', []);
  flush(t, 1500);
  P.V.skillUsedRound = false;
  Math.random = () => 0.999;
  ult('V', 'justice');
  assert.deepEqual([P.V.hp, P.V.armor, P.V.skillPoints], [4, 3, 5]);
});

test('เปลี่ยนแผนที่: ทุกคนกลับกระดานหลัก · ยูนิตที่ถูกเรียกหาย · หลบสายตาที่ค้าง = ออก', () => {
  const P = setup([['V', 'funny_valentine', 2, 7], ['B', 'dummy', 4, 7]]);
  engine.setActor('V');
  ult('V', 'parallel', [], { dir: 'right' });
  engine.clearPhaseTimer();
  assert.equal(doubles().length, 1);
  engine.placeOnBoard(2);
  assert.equal(Object.values(engine.players).filter((p) => p.summon).length, 0);
  assert.deepEqual([P.V.dim, P.B.dim, P.V.valentine.parallel], [null, null, null]);
});

test('เสียงพากย์: เข้ามิติ val_v_veil (ออกไม่พูด veil แต่พูด dojaan) · ท่าไม้ตายตามตัวเลือก · ร่างแยกเงียบ', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['V', 'funny_valentine', 2, 7], ['B', 'dummy', 10, 7]]);
  engine.setActor('V');
  engine.useSkill('V', 'basic', []);
  assert.ok(calls.sfx.includes('val_v_veil'));
  flush(t, 1500);
  calls.sfx = [];
  engine.useSkill('V', 'basic', []);
  assert.ok(!calls.sfx.includes('val_v_veil'), 'กดออกไม่พูดประโยคเข้ามิติ');
  assert.ok(calls.sfx.includes('val_v_dojaan2'));
  flush(t, 1500);
  calls.sfx = [];
  P.V.skillUsedRound = false;
  ult('V', 'justice');
  assert.ok(calls.sfx.includes('val_v_justice'));
  flush(t, 2000);
  P.V.skillPoints = 8; P.V.skillUsedRound = false;
  ult('V', 'selves');
  assert.ok(calls.sfx.includes('val_v_selves2'));
  assert.equal(val.voiceLines(clones('V')[0]), null, 'ร่างแยกไม่มีเสียงพากย์');
});
