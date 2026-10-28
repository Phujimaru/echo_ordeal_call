// ขบวนการจอมราชันคิงโอเจอร์ (gira / yanma / himeno / rita / kaguragi _ohger) — แกนดาบ / Ohger Finish / จอมราชัน (GRID_PLAN §7.22)
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const { CHAR_BY_ID } = require('../../characters.js');
const Ohger = require('../../characters/_ohger.js');
const MOD = {
  gira_ohger: require('../../characters/gira_ohger.js'),
  yanma_ohger: require('../../characters/yanma_ohger.js'),
  himeno_ohger: require('../../characters/himeno_ohger.js'),
  rita_ohger: require('../../characters/rita_ohger.js'),
  kaguragi_ohger: require('../../characters/kaguragi_ohger.js'),
};
const IDS = Object.keys(MOD);

const realRandom = Math.random;
const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
// ภูมิภาค I: แถว y = 5, 7, 8 โล่งทั้งแถว (x 0–13) · แถว 6 มีหินที่ x 2 / 11
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
const vit = (p) => (p.hp || 0) + (p.armor || 0);
const flush = (t, ms = 6000) => { for (let i = 0; i < ms / 100; i++) t.mock.timers.tick(100); };
const press = (p, key) => MOD[p.characterId].charAction(engine, p, `ohger:${key}`);
// ขั้นแรกสีตัวเอง → ลูป 2→3→4→5→1
function transform(p) {
  const own = MOD[p.characterId].OWN;
  press(p, `b${own}`);
  for (const n of Ohger.SEQ) press(p, `b${n}`);
}
const charge = (p) => { press(p, 'trigger'); for (let i = 0; i < 3; i++) press(p, `b${MOD[p.characterId].OWN}`); };

const saved = {
  triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash,
  notifyTransform: engine.notifyTransform, sfx: engine.sfx, boardFx: engine.boardFx,
};
const calls = { fx: [], sfx: [], flash: [], queue: [] };
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = (p, key) => calls.queue.push(key);
  engine.skillFlash = (f) => calls.flash.push(f);
  engine.notifyTransform = () => {};
  engine.sfx = (s) => calls.sfx.push(s);
  engine.boardFx = (event, payload) => calls.fx.push({ event, payload });
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.beforeEach(() => { for (const k of Object.keys(calls)) calls[k] = []; });
test.afterEach(() => { Math.random = realRandom; engine.setGameMode('ffa'); engine.setCycleShift(0); engine.clearPhaseTimer(); });

test('ข้อมูล: 5 ตัว ระดับง่าย · เดิน 4 ตีประชิด · 0 / 4 แต้ม · ไม่มีท่าไม้ตาย · พื้นที่ Finish ตามร่าง', () => {
  const want = {
    gira_ohger: { len: 4, width: 4 }, yanma_ohger: { len: 6, width: 1 }, himeno_ohger: { len: 4, width: 5 },
    rita_ohger: { len: 5, width: 1 }, kaguragi_ohger: { len: 5, width: 1 },
  };
  IDS.forEach((id, i) => {
    const ch = CHAR_BY_ID[id];
    assert.equal(ch.difficulty, 'easy', id);
    assert.equal(ch.mov, 4);
    assert.deepEqual(ch.range, [1, 1]);
    assert.equal(ch.basic.cost, 0);
    assert.equal(ch.secondary.cost, 4);
    assert.equal(ch.ultimate, null);
    assert.deepEqual(ch.secondary.area, { kind: 'line', ...want[id], hostile: true });
    assert.deepEqual(MOD[id].AREA, ch.secondary.area, 'โมดูลกับข้อมูลตรงกัน');
    assert.equal(MOD[id].OWN, i + 1, 'ปุ่มสี 1 แดง … 5 ดำ');
  });
  assert.notEqual(CHAR_BY_ID.gira_ohger.id, 'kira', 'กิระคนละตัวกับราชาแมลงอวกาศ');
});

test('แนว 4×4 (ความกว้างคู่): เยื้องไปทางลบของแกนขวาง −2…+1', () => {
  const P = setup([['G', 'gira_ohger', 2, 7], ['B', 'dummy', 12, 12]]);
  const tiles = engine.areaTiles(P.G, MOD.gira_ohger.AREA, 'right');
  assert.equal(tiles.length, 16);
  const ys = [...new Set(tiles.map((t) => t.y))].sort((a, b) => a - b);
  assert.deepEqual(ys, [5, 6, 7, 8]);
  assert.deepEqual([...new Set(tiles.map((t) => t.x))].sort((a, b) => a - b), [3, 4, 5, 6]);
});

test('สวมเกราะราชัน: สีตัวเองถูกบังคับ · ลูป 2→3→4→5→1 · ไม่กินโควตา · ล็อกการเดิน · คลิปครั้งแรกต่อเกม', () => {
  const P = setup([['G', 'gira_ohger', 2, 7], ['B', 'dummy', 12, 12]]);
  engine.setActor('G');
  const g = MOD.gira_ohger;
  assert.equal(engine.buildStateFor('G').players.find((p) => p.id === 'G').ohger.next, 1, 'ไฟกระพริบสีตัวเอง');
  assert.equal(press(P.G, 'b2'), false, 'ขั้นแรกกดสีอื่นไม่ติด');
  assert.equal(P.G.ohger.phase, null);
  press(P.G, 'b1');
  assert.equal(P.G.ohger.phase, 'loop');
  assert.ok(calls.sfx.includes('ohger_call_1'));
  press(P.G, 'b2');
  assert.ok(calls.sfx.includes('ohger_press_2'), 'กดในลูป = เสียงกดต่อเนื่อง');
  P.G.ohger.idx = 0;
  assert.equal(engine.useSkill('G', 'basic', []), undefined);
  assert.equal(P.G.ohger.armored, false, 'กด useSkill ตรงๆ ข้ามลำดับไม่ได้');
  for (const n of Ohger.SEQ) press(P.G, `b${n}`);
  assert.equal(P.G.ohger.armored, true);
  assert.equal(P.G.skillPoints, 8);
  assert.equal(P.G.skillUsedRound, false, 'ไม่นับเป็นการใช้สกิล');
  assert.equal(engine.action.locked, true);
  assert.deepEqual(calls.queue, [g.CUT.transform]);
  assert.equal(g.skillSound(P.G, 'basic'), null, 'ครั้งแรกเป็นคลิป');
  assert.ok(!calls.sfx.includes('ohger_complete'), 'ครั้งแรกไม่มีเสียงเอฟเฟกต์ซ้อนคลิป');
  assert.equal(engine.buildStateFor('G').players.find((p) => p.id === 'G').character.name, 'คุวากาตะ โอเจอร์');
  assert.equal(g.displayImg(P.G), g.IMG.armor);
});

test('กดผิดในลูป = จบตาเดินทันที (ไม่แปลงร่าง)', () => {
  const P = setup([['G', 'yanma_ohger', 2, 7], ['B', 'dummy', 12, 12]]);
  engine.setActor('G');
  press(P.G, 'b2');
  press(P.G, 'b2');
  press(P.G, 'b4'); // ต้องเป็น 3
  assert.equal(P.G.ohger.armored, false);
  assert.equal(P.G.ohger.phase, null);
  assert.notEqual(engine.actorId, 'G', 'ตาเดินจบ');
});

test('คืนร่าง: เทิร์นที่แปลงกดไม่ได้ · เทิร์นถัดไปได้ (ไม่ใช้แต้ม) · แปลงใหม่ = เสียงปิดท้ายแทนคลิป · แปลงได้ 1 ครั้งต่อเทิร์น', () => {
  const P = setup([['G', 'gira_ohger', 2, 7], ['B', 'dummy', 12, 12]]);
  const g = MOD.gira_ohger;
  engine.setActor('G');
  transform(P.G);
  assert.equal(g.hudActions(engine, P.G)[0].disabled, true);
  assert.equal(press(P.G, 'revert'), false);
  engine.setRoundNumber(engine.roundNumber + 1);
  engine.setActor('G');
  assert.equal(press(P.G, 'revert'), true);
  assert.equal(P.G.ohger.armored, false);
  assert.equal(P.G.skillPoints, 8);
  calls.queue = [];
  transform(P.G);
  assert.equal(P.G.ohger.armored, true, 'คืนร่างแล้วแปลงใหม่ในเทิร์นเดียวกันได้ (ยังไม่ได้แปลงเทิร์นนี้)');
  assert.deepEqual(calls.queue, [], 'คลิปเล่นครั้งเดียวต่อเกม');
  assert.equal(g.skillSound(P.G, 'basic'), 'ohger_tf_done_1');
  assert.ok(calls.sfx.includes('ohger_complete'), 'ครั้งที่ 2: เสียงแปลงร่างสำเร็จ แล้วต่อด้วยชื่อร่าง');
  engine.setRoundNumber(engine.roundNumber + 1);
  engine.setActor('G');
  press(P.G, 'revert');
  engine.setActor('G');
  press(P.G, 'b1');
  assert.equal(P.G.ohger.phase, 'loop', 'เทิร์นใหม่แปลงได้');
});

test('Ohger Finish: ต้องสวมเกราะ · ไก → ดึง 3 ครั้ง → stand by เดินไม่ได้ · กดไกซ้ำยกเลิก เดินได้อีก ไม่เสียแต้ม', () => {
  const P = setup([['G', 'gira_ohger', 2, 7], ['B', 'dummy', 12, 12]]);
  engine.setActor('G');
  assert.equal(press(P.G, 'trigger'), false, 'ร่างมนุษย์ใช้ไม่ได้');
  transform(P.G);
  engine.setActor('G'); // ตาเดินใหม่ (ยังไม่ได้เดิน)
  press(P.G, 'trigger');
  assert.equal(P.G.ohger.phase, 'charge');
  assert.ok(calls.sfx.includes('ohger_trigger'));
  press(P.G, 'b1'); press(P.G, 'b1');
  assert.equal(engine.movOf(P.G), 4, 'ก่อนดึงครั้งที่ 3 ยังเดินได้');
  press(P.G, 'b1');
  assert.equal(P.G.ohger.phase, 'standby');
  assert.deepEqual(calls.sfx.filter((s) => s.startsWith('ohger_pull_')), ['ohger_pull_1_1', 'ohger_pull_1_2', 'ohger_pull_1_3']);
  assert.equal(engine.movOf(P.G), 0, 'stand by = เดินไม่ได้');
  press(P.G, 'trigger');
  assert.equal(P.G.ohger.phase, null);
  assert.equal(engine.movOf(P.G), 4, 'ยกเลิกแล้วเดินได้');
  assert.equal(P.G.skillPoints, 8);
  assert.equal(engine.useSkill('G', 'secondary', [], { dir: 'right' }), undefined);
  assert.equal(P.G.skillPoints, 8, 'ไม่ได้อยู่ stand by = ปล่อยท่าไม่ได้');
});

test('Ohger Finish: ดึงผิดสี = เสีย 4 แต้มฟรี ไม่ออกท่า · เทิร์นนั้นใช้อีกไม่ได้ · แต้มไม่พอกดไกไม่ได้', () => {
  const P = setup([['G', 'himeno_ohger', 2, 7], ['B', 'dummy', 12, 12]]);
  engine.setActor('G');
  transform(P.G);
  press(P.G, 'trigger');
  press(P.G, 'b3');
  press(P.G, 'b1');
  assert.equal(P.G.skillPoints, 4);
  assert.equal(P.G.ohger.phase, null);
  assert.equal(press(P.G, 'trigger'), false, 'เทิร์นนี้หมดสิทธิ์');
  engine.setRoundNumber(engine.roundNumber + 1);
  engine.setActor('G');
  P.G.skillPoints = 3;
  assert.equal(press(P.G, 'trigger'), false, 'แต้มไม่พอ');
});

test('คุวากาตะ: 4×4 ศัตรูทุกคนเสียหาย 4 (เกราะก่อน) · ไม่โดนเพื่อน · นอกแนวไม่โดน · กินโควตา 4 แต้ม', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['G', 'gira_ohger', 2, 7, 't1'], ['A', 'dummy', 3, 5, 't2'], ['C', 'dummy', 6, 8, 't2'], ['F', 'dummy', 4, 7, 't1'], ['X', 'dummy', 7, 7, 't2']], 'duo');
  P.A.armor = 3; P.C.armor = 1;
  engine.setActor('G');
  transform(P.G);
  charge(P.G);
  const a0 = vit(P.A), c0 = vit(P.C), f0 = vit(P.F), x0 = vit(P.X);
  engine.useSkill('G', 'secondary', [], { dir: 'right' });
  assert.equal(P.G.skillPoints, 4);
  assert.equal(P.G.skillUsedRound, true);
  assert.ok(!calls.sfx.includes('ohger_finish_boom'), 'ระเบิดท้ายส่งหลังป้ายสกิล');
  flush(t);
  assert.ok(calls.sfx.includes('ohger_finish_boom'));
  assert.ok(!calls.sfx.includes('ohger_atk_1'), 'Finish ไม่ใช้เสียงตีปกติ');
  assert.equal(vit(P.A), a0 - 4);
  assert.equal(P.A.armor, 0, 'เกราะรับก่อน');
  assert.equal(vit(P.C), c0 - 4);
  assert.equal(vit(P.F), f0);
  assert.equal(vit(P.X), x0);
  assert.equal(P.G.ohger.phase, null);
});

test('ทอมโบ: แนว 6 ขาไป 2 + ขากลับ 2 · คนที่รอดถูกรวมไว้กลางแนว (ช่องที่ 3) · กลับมายืนที่เดิม', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['G', 'yanma_ohger', 1, 7], ['A', 'dummy', 2, 7], ['C', 'dummy', 7, 7], ['B', 'dummy', 12, 12]]);
  P.A.hp = 7; P.A.armor = 3; P.C.hp = 7; P.C.armor = 3;
  engine.setActor('G');
  transform(P.G);
  charge(P.G);
  engine.useSkill('G', 'secondary', [], { dir: 'right' });
  flush(t);
  assert.equal(vit(P.A), 6);
  assert.equal(vit(P.C), 6);
  assert.deepEqual(P.G.pos, { x: 1, y: 7 });
  const at = [P.A.pos, P.C.pos].map((q) => `${q.x},${q.y}`).sort();
  assert.ok(at.includes('4,7'), `คนหนึ่งอยู่ช่องกลาง ${at}`);
  assert.ok([P.A.pos, P.C.pos].every((q) => Math.abs(q.x - 4) + Math.abs(q.y - 7) <= 1), 'อีกคนอยู่ติดช่องกลาง');
});

test('คามาคิริ: 4×5 ขอบ 4 · ถัดเข้ามา 3 + พิษร้าย · กลาง 2 + พิษร้าย 2 · ถูกดึงเข้าแถวกลาง', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['G', 'himeno_ohger', 2, 7], ['E', 'dummy', 3, 5], ['S', 'dummy', 4, 8], ['M', 'dummy', 5, 7], ['B', 'dummy', 12, 12]]);
  for (const id of ['E', 'S', 'M']) { P[id].hp = 7; P[id].armor = 3; }
  engine.setActor('G');
  transform(P.G);
  charge(P.G);
  engine.useSkill('G', 'secondary', [], { dir: 'right' });
  flush(t);
  assert.equal(vit(P.E), 6, 'ขอบ −4');
  assert.equal(vit(P.S), 7, 'ถัดเข้ามา −3');
  assert.equal(vit(P.M), 8, 'กลาง −2');
  assert.ok((P.S.statuses.poison || 0) >= 1);
  assert.ok((P.M.statuses.poison || 0) >= 2);
  assert.ok(!(P.E.statuses.poison > 0), 'ขอบไม่ติดพิษ');
  assert.equal(P.E.pos.y, 7, 'ถูกดึงเข้าแถวกลาง');
  assert.equal(P.S.pos.y, 7);
});

test('พาพิยอง: พุ่งหยุดหน้าศัตรูคนแรก แล้วฟัน 3 + เปราะบาง · ไม่มีเป้า = พุ่ง 4 ช่อง', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['G', 'rita_ohger', 1, 7], ['A', 'dummy', 5, 7], ['C', 'dummy', 6, 7], ['B', 'dummy', 12, 12]]);
  P.A.hp = 7; P.A.armor = 3;
  engine.setActor('G');
  transform(P.G);
  charge(P.G);
  const c0 = vit(P.C);
  engine.useSkill('G', 'secondary', [], { dir: 'right' });
  assert.deepEqual(P.G.pos, { x: 4, y: 7 });
  flush(t);
  assert.equal(vit(P.A), 7);
  assert.equal(vit(P.C), c0, 'โดนแค่คนแรก');
  assert.ok((P.A.statuses.fragile || 0) >= 2);

  const Q = setup([['G', 'rita_ohger', 1, 8], ['B', 'dummy', 12, 12]]);
  engine.setActor('G');
  transform(Q.G);
  charge(Q.G);
  engine.useSkill('G', 'secondary', [], { dir: 'right' });
  assert.deepEqual(Q.G.pos, { x: 5, y: 8 });
});

test('ฮาจิ: เข็ม 5×1 ทุกคนในแนว 2 + ไร้ทางเยียวยา + พิษร้าย · ถอยหลัง 2 ช่อง (ชนของ = หยุด)', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['G', 'kaguragi_ohger', 5, 7], ['A', 'dummy', 7, 7], ['C', 'dummy', 10, 7], ['W', 'dummy', 3, 7]]);
  P.A.hp = 7; P.A.armor = 3; P.C.hp = 7; P.C.armor = 3;
  engine.setActor('G');
  transform(P.G);
  charge(P.G);
  engine.useSkill('G', 'secondary', [], { dir: 'right' });
  flush(t);
  assert.equal(vit(P.A), 8);
  assert.equal(vit(P.C), 8);
  assert.ok(P.A.statuses.nohealing > 0);
  assert.ok(P.A.statuses.poison > 0);
  assert.deepEqual(P.G.pos, { x: 4, y: 7 }, 'ถอยได้ 1 ช่อง ชนคนที่ x 3 แล้วหยุด');
});

test('จอมราชัน: ร่างมนุษย์จบเทิร์นฟื้นพลังชีวิต 2 · สวมเกราะไม่ฟื้น · สวมเกราะพลังโจมตีตีปกติ +1', () => {
  const P = setup([['G', 'gira_ohger', 2, 7], ['H', 'yanma_ohger', 6, 8], ['B', 'dummy', 12, 12]]);
  P.G.hp = 3; P.H.hp = 3;
  engine.setActor('H');
  transform(P.H);
  MOD.gira_ohger.onEndTurn(engine);
  MOD.yanma_ohger.onEndTurn(engine);
  assert.equal(P.G.hp, 5);
  assert.equal(P.H.hp, 3);
  assert.equal(MOD.yanma_ohger.damageBonus(engine, P.H, P.B, {}), 1);
  assert.equal(MOD.gira_ohger.damageBonus(engine, P.G, P.B, {}), 0);
  assert.equal(MOD.yanma_ohger.attackSound(P.H), 'ohger_atk_2', 'ตีปกติร่างเกราะ = เสียงตามสี');
  assert.equal(MOD.gira_ohger.attackSound(P.G), undefined, 'ร่างมนุษย์ = เสียงกลาง');
});

test('ความสามารถเฉพาะร่าง: ทอมโบตีซ้ำ 25% (ครั้งเดียวต่อตา) · พาพิยองตรึง 20% · ฮาจิถอยหลังตาผู้โจมตีจบ + เดิน +2 เทิร์นหน้า', () => {
  const P = setup([['T', 'yanma_ohger', 2, 7], ['R', 'rita_ohger', 6, 8], ['K', 'kaguragi_ohger', 9, 5], ['E', 'dummy', 8, 5]]);
  for (const id of ['T', 'R', 'K']) { engine.setActor(id); transform(P[id]); }
  Math.random = () => 0.1;
  engine.setActor('T');
  assert.equal(MOD.yanma_ohger.extraStrike(engine, P.T), true);
  assert.equal(MOD.yanma_ohger.extraStrike(engine, P.T), false, 'ครั้งเดียวต่อตาเดิน');
  assert.deepEqual(MOD.rita_ohger.onStrikeLanded(engine, P.R, P.E), ['ถูกตรึง']);
  assert.ok(P.E.statuses.rooted > 0);
  engine.setActor('E');
  MOD.kaguragi_ohger.onAttacked(engine, P.K, P.E, 'strike');
  MOD.kaguragi_ohger.afterActorEnd(engine);
  assert.deepEqual(P.K.pos, { x: 11, y: 5 }, 'ถอยห่างผู้โจมตี 2 ช่อง');
  assert.equal(P.K.ohger.movRound, engine.roundNumber + 1);
  P.K._ohgerRound = engine.roundNumber + 1;
  assert.equal(engine.baseMovOf(P.K), 6);
  Math.random = () => 0.9;
  assert.equal(MOD.yanma_ohger.extraStrike(engine, P.T), false);
});

test('ตัดผลสกิล: ร่างสวมเกราะกลับร่างมนุษย์ · ชาร์จ Finish ถูกยกเลิก', () => {
  const P = setup([['G', 'gira_ohger', 2, 7], ['B', 'dummy', 12, 12]]);
  engine.setActor('G');
  transform(P.G);
  press(P.G, 'trigger');
  const list = MOD.gira_ohger.severables(engine, P.G);
  assert.deepEqual(list.map((x) => x.label), ['คุวากาตะ โอเจอร์', 'Ohger Finish']);
  list[1].cancel();
  assert.equal(P.G.ohger.phase, null);
  list[0].cancel();
  assert.equal(P.G.ohger.armored, false);
});

test('Ohger Finish หลบได้: หลบหลีก 100% = ไม่เสียหาย ไม่ติดสถานะ ไม่ถูกดึง', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['G', 'himeno_ohger', 2, 7], ['S', 'dummy', 4, 8], ['B', 'dummy', 12, 12]]);
  engine.setActor('G');
  transform(P.G);
  charge(P.G);
  P.S.statuses.evade = 1; P.S.statusAmt.evade = 100;
  const s0 = vit(P.S);
  engine.useSkill('G', 'secondary', [], { dir: 'right' });
  flush(t);
  assert.equal(vit(P.S), s0);
  assert.ok(!(P.S.statuses.poison > 0));
  assert.deepEqual(P.S.pos, { x: 4, y: 8 });
});
