// นักบินปริศนา สองโหมด + บานาจ ลิงซ์ (GRID_PLAN §7.5.1) — กล่องของลาพลัส / โล่ดูดซับ / Beam Magnum กระสุน / NT-D / ยูนิคอร์น / โล่บินได้
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const pilot = require('../../characters/sliver_bullet.js');
const action = require('../../server/phases/action.js');
const Board = require('../../server/board.js');

const blank = (id, characterId, position, charMode = null) => ({
  id, name: id, position, characterId, charMode, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId: null,
});
// list = [[id, characterId, x, y, mode?], ...] — ภูมิภาค I (14×14): แถว y = 5 โล่ง · เสาที่ (4,4) (9,4)
function setup(list) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, ch, , , mode], i) => { engine.players[id] = blank(id, ch, i + 1, mode || null); });
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.skillPoints = 12; p.skillUsedRound = false; p.shield = 0;
    p.statuses = {}; p.statusAmt = {};
  }
  return engine.players;
}
const view = (viewerId, id) => engine.buildStateFor(viewerId).players.find((p) => p.id === id);

const saved = {
  triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash,
  notifyTransform: engine.notifyTransform, sfx: engine.sfx, boardFx: engine.boardFx, pausePlayingForCutscene: engine.pausePlayingForCutscene,
};
const calls = { queue: [], sfx: [], fx: [] };
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = (p, key) => calls.queue.push(key);
  engine.skillFlash = () => {};
  engine.notifyTransform = () => {};
  engine.sfx = (sound) => calls.sfx.push(sound);
  engine.boardFx = (event, payload) => calls.fx.push({ event, payload });
  engine.pausePlayingForCutscene = () => {};
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.beforeEach(() => { for (const k of Object.keys(calls)) calls[k] = []; });
test.afterEach(() => { engine.clearPhaseTimer(); });

// ---------- โหมด ----------
test('โหมดผู้กอบกู้เริ่มเป็นบานาจ ลิงซ์: พลังชีวิต 7 · เกราะ 3 · ตีระยะ 1 · ชื่อ/สกิลติดตัวของร่าง · ไม่ล่องหน', () => {
  const P = setup([['S', 'sliver_bullet', 1, 5, 'savior'], ['B', 'dummy', 5, 5], ['C', 'dummy', 9, 5]]);
  assert.equal(P.S.sliver.form, 'banagher');
  assert.equal(engine.maxHpOf(P.S), 7);
  assert.equal(engine.maxArmorOf(P.S), 3);
  assert.equal(P.S.hp, 7);
  assert.deepEqual(action.rangeOf(P.S), [1, 1]);
  assert.equal(action.baseMovOf(P.S), 4);
  assert.equal(pilot.stealthed(P.S), false, 'บานาจไม่มีซุ่มโจมตี');
  const v = view('S', 'S');
  assert.equal(v.character.name, 'บานาจ ลิงซ์');
  assert.equal(v.character.passive.name, 'NT-D ทำงาน');
  assert.equal(v.character.basic.name, 'โล่ดูดซับ');
  assert.equal(v.character.basic.cost, 3);
  assert.equal(v.character.secondary.cost, 2);
  assert.equal(v.character.ultimate.name, 'ยูนิคอร์น!!!!');
});
test('โหมดสายหลับ (ค่าเริ่มต้น) = นักบินเดิม', () => {
  const P = setup([['S', 'sliver_bullet', 1, 5], ['B', 'dummy', 5, 5], ['C', 'dummy', 9, 5]]);
  assert.equal(P.S.sliver.form, 'pilot');
  assert.equal(engine.maxHpOf(P.S), 5);
  assert.equal(view('S', 'S').character.ultimate.name, 'ผมจำเป็นต้องไปต่อ');
});

// ---------- กล่องของลาพลัส ----------
test('กล่องของลาพลัส: ตก 2×2 · ศัตรูที่ทับถูกผลักออก −2 · เรียกซ้ำไม่ได้ระหว่างกล่องอยู่ · สวมเมื่อยืนติด = บานาจถาวร', () => {
  const P = setup([['S', 'sliver_bullet', 1, 5], ['B', 'dummy', 6, 5], ['C', 'dummy', 12, 12]]);
  P.S.hp = 3; P.S.armor = 0;
  engine.setActor('S');
  const area = view('S', 'S').character.ultimate.area;
  assert.equal(area.place, 'list');
  assert.ok(area.tiles.some((t) => t.x === 5 && t.y === 5), 'มุม (5,5) วางได้ (มีคนยืนได้)');
  assert.ok(!area.tiles.some((t) => t.x === 0 && t.y === 4), 'ทับนักบินเองไม่ได้');
  const before = P.B.hp + P.B.armor;
  engine.useSkill('S', 'ultimate', [], { tile: { x: 5, y: 5 } });
  const box = Object.values(engine.players).find((u) => pilot.isBox(u));
  assert.ok(box, 'กล่องเกิด');
  assert.deepEqual(box.pos, { x: 5, y: 5 });
  assert.equal(box.boardSize, 2);
  assert.equal(box.hp, 2); assert.equal(box.armor, 1);
  assert.ok(!Board.covers(Board.boxOf(box), P.B.pos.x, P.B.pos.y), 'ศัตรูถูกผลักออกจากกล่อง');
  assert.equal(before - (P.B.hp + P.B.armor), 2);
  assert.equal(P.S.skillPoints, 6);
  // เรียกซ้ำไม่ได้ (กล่องยังอยู่)
  P.S.skillUsedRound = false;
  engine.useSkill('S', 'ultimate', [], { tile: { x: 10, y: 9 } });
  assert.equal(P.S.skillPoints, 6);
  // ยังไม่ติดกล่อง = สวมไม่ได้
  const wearBtn = () => view('S', 'S').actions.find((a) => a.key === 'wear');
  assert.equal(wearBtn().disabled, true);
  pilot.charAction(engine, P.S, 'wear');
  assert.equal(P.S.sliver.form, 'pilot');
  // ยืนติดกล่อง → สวม
  P.S.pos = { x: 4, y: 5 };
  assert.equal(wearBtn().disabled, false);
  pilot.charAction(engine, P.S, 'wear');
  assert.equal(P.S.sliver.form, 'banagher');
  assert.equal(engine.maxHpOf(P.S), 7);
  assert.equal(P.S.hp, 5, 'ฟื้น 2 (ไม่เต็ม)');
  assert.equal(P.S.armor, 2, 'ฟื้นเกราะ 2');
  assert.ok(!box.alive, 'กล่องหายเมื่อสวม');
  assert.ok(calls.queue.includes(pilot.CUT.wear), 'คลิปสวมกล่อง');
});
test('กล่องพังแล้วเรียกใหม่ได้ · นักบินตาย = กล่องหาย · เพลงกล่องเล่นระหว่างกล่องอยู่บนสนาม', () => {
  const P = setup([['S', 'sliver_bullet', 1, 5], ['B', 'dummy', 12, 12], ['C', 'dummy', 12, 0]]);
  engine.setActor('S');
  engine.useSkill('S', 'ultimate', [], { tile: { x: 5, y: 7 } });
  let box = Object.values(engine.players).find((u) => pilot.isBox(u) && u.alive);
  assert.equal(pilot.skillMusic(engine, P.S).music, pilot.BOX_MUSIC);
  engine.instantDeath(box);
  assert.equal(pilot.skillMusic(engine, P.S), null);
  P.S.skillUsedRound = false;
  engine.useSkill('S', 'ultimate', [], { tile: { x: 8, y: 7 } });
  box = Object.values(engine.players).find((u) => pilot.isBox(u) && u.alive);
  assert.ok(box, 'เรียกใหม่ได้หลังกล่องพัง');
  engine.instantDeath(P.S);
  assert.ok(!box.alive, 'นักบินตาย = กล่องหาย');
});

// ---------- โล่ดูดซับ ----------
test('โล่ดูดซับ: ดาเมจเป็น 0 + ฟื้นสูงสุด 3 · หมดผลต้นตาเดินถัดไป · คูลดาวน์ 3 เทิร์น · คลิปครั้งแรกที่ถูกโจมตี', () => {
  const P = setup([['S', 'sliver_bullet', 1, 5, 'savior'], ['B', 'dummy', 2, 5], ['C', 'dummy', 9, 5]]);
  P.S.hp = 2;
  engine.setActor('S');
  engine.useSkill('S', 'basic', []);
  assert.ok(P.S.sliver.absorb);
  assert.equal(calls.queue.length, 0, 'กดเฉยๆ ยังไม่มีคลิป');
  engine.withEffectSource(P.B, () => engine.dealMixed(P.S, 2));
  assert.equal(P.S.armor, 3, 'เกราะไม่ลด');
  assert.equal(P.S.hp, 4, 'ฟื้นตามดาเมจ');
  assert.deepEqual(calls.queue, [pilot.CUT.absorb]);
  engine.withEffectSource(P.B, () => engine.dealDirect(P.S, 5));
  assert.equal(P.S.hp, 5, 'ฟื้นรวมไม่เกิน 3');
  engine.withEffectSource(P.B, () => engine.dealMixed(P.S, 1));
  assert.equal(calls.queue.length, 1, 'คลิปครั้งเดียวต่อเกม');
  pilot.onActorStart(engine, P.S);
  assert.equal(P.S.sliver.absorb, null);
  assert.equal(pilot.canUseSkill(engine, P.S, 'basic'), false, 'คูลดาวน์');
  engine.setRoundNumber(engine.roundNumber + 3);
  assert.equal(pilot.canUseSkill(engine, P.S, 'basic'), true);
});

// ---------- Beam Magnum ของบานาจ ----------
test('Beam Magnum (บานาจ): 2 แต้ม · ศัตรูทุกคนในแนว −3 · พังสิ่งกีดขวาง · กระสุนลด · ต้องรีโหลดเทิร์นถัดไป', () => {
  const P = setup([['S', 'sliver_bullet', 4, 7, 'savior'], ['B', 'dummy', 4, 6], ['C', 'dummy', 4, 2]]);
  P.B.armor = 0; P.B.hp = 7; P.C.armor = 0; P.C.hp = 7;
  engine.setActor('S');
  engine.useSkill('S', 'secondary', [], { dir: 'up' });
  assert.equal(P.S.skillPoints, 10);
  assert.equal(P.B.hp, 4); assert.equal(P.C.hp, 4);
  assert.equal(engine.boardMap().terrain['4,4'], undefined, 'เสาในแนวพัง');
  assert.equal(P.S.sliver.ammo, 4);
  assert.equal(P.S.sliver.reloadNeed, true);
  assert.ok(calls.queue.includes(pilot.CUT.bBeam), 'คลิปยิงปกติ (ครั้งแรก)');
  assert.ok(calls.sfx.includes('sliver_shot'), 'เสียง Beam Magnum เดิม');
  // เทิร์นเดียวกัน: ยิง/รีโหลดไม่ได้
  P.S.skillUsedRound = false;
  assert.equal(pilot.canUseSkill(engine, P.S, 'secondary'), false);
  pilot.charAction(engine, P.S, 'reload');
  assert.equal(P.S.sliver.reloadNeed, true);
  // เทิร์นถัดไป: รีโหลด (คลิปครั้งแรก · ครั้งต่อไปเสียงรีโหลดของนักบิน)
  engine.setRoundNumber(engine.roundNumber + 1);
  engine.setActor('S');
  pilot.charAction(engine, P.S, 'reload');
  assert.equal(P.S.sliver.reloadNeed, false);
  assert.ok(calls.queue.includes(pilot.CUT.bReload));
  assert.equal(pilot.canUseSkill(engine, P.S, 'secondary'), true);
  // กระสุนหมด = ยิงไม่ได้
  P.S.sliver.ammo = 0;
  assert.equal(pilot.canUseSkill(engine, P.S, 'secondary'), false);
});

// ---------- NT-D ----------
test('NT-D ทำงาน: เปิด/ปิดเทิร์นละครั้ง · เดิน +1 · พลังโจมตี +1 · หัก 1 แต้มจบเทิร์น (ไม่พอ = ปิด) · คลิปเปิดครั้งแรก/ครั้งต่อไป', () => {
  const P = setup([['S', 'sliver_bullet', 1, 5, 'savior'], ['B', 'dummy', 9, 5], ['C', 'dummy', 12, 12]]);
  engine.setActor('S');
  pilot.charAction(engine, P.S, 'ntd');
  assert.equal(P.S.sliver.ntd, true);
  assert.equal(action.baseMovOf(P.S), 5);
  assert.equal(pilot.damageBonus(engine, P.S), 1);
  assert.deepEqual(calls.queue, [pilot.CUT.ntd]);
  pilot.charAction(engine, P.S, 'ntd');
  assert.equal(P.S.sliver.ntd, true, 'กดซ้ำเทิร์นเดียวกันไม่ได้');
  P.S.skillPoints = 3;
  pilot.onEndTurn(engine);
  assert.equal(P.S.skillPoints, 2);
  engine.setRoundNumber(engine.roundNumber + 1);
  engine.setActor('S');
  pilot.charAction(engine, P.S, 'ntd');
  assert.equal(P.S.sliver.ntd, false, 'ปิด');
  engine.setRoundNumber(engine.roundNumber + 1);
  engine.setActor('S');
  pilot.charAction(engine, P.S, 'ntd');
  assert.deepEqual(calls.queue, [pilot.CUT.ntd, pilot.CUT.ntdShot], 'เปิดครั้งต่อไป = ntdShot');
  P.S.skillPoints = 0;
  pilot.onEndTurn(engine);
  assert.equal(P.S.sliver.ntd, false, 'แต้มไม่พอ = ปิดเอง');
});
test('พุ่ง (NT-D): 2 ช่องทิศเดียว เทิร์นละครั้ง · หยุดก่อนคน · เดินต่อได้เต็มระยะ', () => {
  const P = setup([['S', 'sliver_bullet', 1, 5, 'savior'], ['B', 'dummy', 4, 5], ['C', 'dummy', 12, 12]]);
  engine.setActor('S');
  pilot.charAction(engine, P.S, 'ntd');
  const dash = () => view('S', 'S').actions.find((a) => a.key === 'dash');
  assert.ok(dash().tiles.some((t) => t.x === 3 && t.y === 5));
  assert.ok(!dash().tiles.some((t) => t.x === 4 && t.y === 5), 'ช่องที่มีคนไปไม่ได้');
  pilot.charAction(engine, P.S, 'dash', { tile: { x: 3, y: 5 } });
  assert.deepEqual(P.S.pos, { x: 3, y: 5 });
  assert.deepEqual(engine.action.from, { x: 3, y: 5 });
  assert.equal(dash().disabled, true, 'เทิร์นละครั้ง');
  assert.equal(engine.moveTo('S', 5, 8), true, 'เดินต่อ 5 ช่องได้');
});

// ---------- ยูนิคอร์น / โล่บินได้ ----------
test('ยูนิคอร์น!!!!: NT-D ฟรี · Beam 4 แต้มไม่ใช้กระสุน · โล่บินได้ 3 อัน · 5 เทิร์นแล้วโล่หาย + คูลดาวน์', () => {
  const P = setup([['S', 'sliver_bullet', 6, 5, 'savior'], ['B', 'dummy', 12, 12], ['C', 'dummy', 0, 13]]);
  engine.setActor('S');
  engine.useSkill('S', 'ultimate', []);
  assert.ok(P.S.sliver.unicorn);
  assert.equal(P.S.skillPoints, 6);
  assert.ok(calls.queue.includes(pilot.CUT.unicorn));
  assert.equal(pilot.skillMusic(engine, P.S).music, pilot.MUSIC);
  const funnels = engine.summon.ofOwner('S', 'funnel');
  assert.equal(funnels.length, 3);
  assert.equal(funnels[0].hp, 1); assert.equal(funnels[0].armor, 1);
  assert.equal(action.flies(funnels[0]), true);
  assert.deepEqual(action.rangeOf(funnels[0]), [1, 0], 'ตีปกติไม่ได้');
  assert.equal(action.baseMovOf(P.S), 5, 'NT-D ฟรี: เดิน +1');
  assert.equal(pilot.skillCost(P.S, 'secondary', 2), 4);
  P.S.skillUsedRound = false;
  engine.useSkill('S', 'secondary', [], { dir: 'down' });
  assert.equal(P.S.sliver.ammo, 5, 'ไม่ใช้กระสุน');
  assert.equal(P.S.sliver.reloadNeed, false, 'ไม่ต้องรีโหลด');
  // กระสุนหมดแล้วยังยิงได้ระหว่างยูนิคอร์น — ปุ่มไม่มีแถบกระสุน (client ไม่เทาปุ่ม) · ไม่ล็อก
  P.S.sliver.ammo = 0;
  P.S.skillUsedRound = false;
  P.S.skillPoints = 8;
  const sec = view('S', 'S');
  assert.equal(sec.character.secondary.ammo, null, 'ไม่มีแถบกระสุนระหว่างยูนิคอร์น');
  assert.equal(sec.skillLocks.secondary.locked, false);
  const sp = P.S.skillPoints;
  engine.useSkill('S', 'secondary', [], { dir: 'up' });
  assert.equal(P.S.skillPoints, sp - 4, 'กระสุนหมดก็ยิงได้');
  // ครบ 5 เทิร์น
  engine.setRoundNumber(P.S.sliver.unicorn.until);
  pilot.onEndTurn(engine);
  assert.equal(P.S.sliver.unicorn, null);
  assert.equal(engine.summon.ofOwner('S', 'funnel').length, 0, 'โล่หาย');
  assert.equal(pilot.canUseSkill(engine, P.S, 'ultimate'), false, 'คูลดาวน์');
  engine.setRoundNumber(engine.roundNumber + 6);
  assert.equal(pilot.canUseSkill(engine, P.S, 'ultimate'), true);
});
test('โล่บินได้: เดินทะลุสิ่งกีดขวาง/ซ้อนช่องได้ภายในระยะเดินของบานาจ · ไม่ขวางทางคนอื่น', () => {
  const P = setup([['S', 'sliver_bullet', 4, 5, 'savior'], ['B', 'dummy', 12, 12], ['C', 'dummy', 0, 13]]);
  engine.setActor('S');
  engine.useSkill('S', 'ultimate', []);
  const f = engine.summon.ofOwner('S', 'funnel')[0];
  f.pos = { x: 4, y: 3 };
  engine.setActor(f.id);
  assert.equal(engine.moveTo(f.id, 4, 4), true, 'บินขึ้นไปบนเสาได้');
  assert.equal(engine.moveTo(f.id, 4, 5), true, 'ซ้อนช่องเดียวกับบานาจได้');
  assert.equal(engine.moveTo(f.id, 4, 11), false, 'ออกนอกสายจูง (ระยะ 5) ไม่ได้');
  // บานาจเดินผ่านช่องที่มีโล่ได้ (ไม่ขวาง)
  f.pos = { x: 5, y: 5 };
  engine.setActor('S');
  assert.equal(engine.moveTo('S', 6, 5), true);
});
test('โล่ผู้พิทักษ์: 2 แต้มของบานาจ · ศัตรูในระยะ 2 เล็งได้เฉพาะโล่ (ตีปกติ + สกิลเป้าเดียว) · โล่ละครั้งต่อเทิร์น', () => {
  const P = setup([['S', 'sliver_bullet', 1, 5, 'savior'], ['B', 'dummy', 6, 5], ['C', 'dummy', 12, 12]]);
  engine.setActor('S');
  engine.useSkill('S', 'ultimate', []);
  const [f, f2] = engine.summon.ofOwner('S', 'funnel');
  f.pos = { x: 6, y: 6 };
  P.S.pos = { x: 6, y: 4 };
  engine.setActor(f.id);
  const sp = P.S.skillPoints;
  assert.equal(view('S', f.id).actions[0].key, 'guard');
  pilot.charAction(engine, f, 'guard');
  assert.equal(P.S.skillPoints, sp - 2);
  assert.ok(engine.tauntOf(P.B) && engine.tauntOf(P.B).has(f.id));
  assert.equal(action.canStrike(P.B, P.S), false, 'ตีบานาจไม่ได้');
  assert.equal(action.canStrike(P.B, f), true, 'ตีโล่ได้');
  assert.equal(action.resolveArea(P.B, { kind: 'target', range: 3 }, ['S']), null, 'สกิลเป้าเดียวเล็งบานาจไม่ได้');
  assert.deepEqual(view('B', 'B').taunt, [f.id]);
  assert.ok(calls.queue.includes(pilot.CUT.guard), 'ล่อติด = คลิป (ครั้งแรก)');
  pilot.charAction(engine, f, 'guard');
  assert.equal(P.S.skillPoints, sp - 2, 'โล่เดิมกดซ้ำเทิร์นเดียวกันไม่ได้');
  // โล่ตาย = ไม่ถูกล่อแล้ว
  engine.instantDeath(f);
  assert.equal(engine.tauntOf(P.B), null);
  assert.equal(action.canStrike(P.B, P.S), true);
  assert.ok(f2.alive);
});
