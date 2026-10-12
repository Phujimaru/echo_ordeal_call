// โซระ โอโตสุมิ (sora_otosumi) — แปลงร่าง / My-Th Edge / Mouse Separade / เพื่อคุณหนู บนกระดาน (GRID_PLAN §7.7)
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const sora = require('../../characters/sora_otosumi.js');
const attack = require('../../server/phases/attack.js');
const { CHAR_BY_ID } = require('../../characters.js');

const realRandom = Math.random;
const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
// list = [[id, characterId, x, y, teamId?], ...] — แถว y = 5 ของภูมิภาค I เป็นพื้นโล่งทั้งแถว
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
const vit = (p) => (p.hp || 0) + (p.armor || 0);
// เข้าร่าง My-Th แบบไม่ผ่านปุ่ม (เทสต์ส่วนอื่น)
const myth = (p, gun = false) => { p.sora.myth = true; p.sora.gun = gun; };
// ไล่ตัวจับเวลา (จังหวะพักของสกิล / ฉากตี) ให้จบ — ใช้กับ t.mock.timers
const flush = (t, ms = 20000) => { for (let i = 0; i < ms / 100; i++) t.mock.timers.tick(100); };

const saved = {
  triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash,
  notifyTransform: engine.notifyTransform, sfx: engine.sfx, boardFx: engine.boardFx,
};
const calls = { queue: [], fx: [] };
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = (p, key) => calls.queue.push(key);
  engine.skillFlash = () => {};
  engine.notifyTransform = () => {};
  engine.sfx = () => {};
  engine.boardFx = (event, payload) => calls.fx.push({ event, payload });
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.beforeEach(() => { for (const k of Object.keys(calls)) calls[k] = []; });
test.afterEach(() => { Math.random = realRandom; engine.setGameMode('ffa'); engine.setCycleShift(0); engine.clearPhaseTimer(); });

test('ข้อมูล: ระดับง่าย · เดิน 4 ตีประชิด · แปลงร่าง/My-Th Edge 0 แต้ม · Mouse Separade 4 แต้ม แนว 4×1 (สกิลโจมตี)', () => {
  const ch = CHAR_BY_ID.sora_otosumi;
  assert.equal(ch.difficulty, 'easy');
  assert.equal(ch.mov, 4);
  assert.deepEqual(ch.range, [1, 1]);
  assert.equal(ch.basic.cost, 0);
  assert.equal(ch.secondary.cost, 0);
  assert.equal(ch.ultimate.cost, 4);
  assert.deepEqual(ch.basic.area, { kind: 'self' });
  assert.deepEqual(ch.ultimate.area, { kind: 'line', len: 4, width: 1, hostile: true });
  assert.equal(sora.ULT_LEN, ch.ultimate.area.len);
  assert.match(ch.ultimate.desc, /4×1/);
  const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 8, 5]]);
  assert.equal(P.S.sora.myth, false, 'เริ่มเกมร่างโซระ');
  assert.equal(P.S.sora.gun, false, 'อาวุธเริ่มต้นมีด');
});

test('แปลงร่าง: 0 แต้ม · สลับร่าง · เทิร์นละ 1 ครั้ง · ไม่กินโควตา · ล็อกการเดิน · คลิปครั้งแรกที่เข้า My-Th เท่านั้น · รูปตามร่าง', () => {
  const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 8, 5]]);
  engine.setActor('S');
  assert.equal(view('S', 'S').character.basic.img, sora.IMG.toMyth, 'ปุ่มโชว์ร่างที่จะเปลี่ยนไป');
  engine.useSkill('S', 'basic', []);
  assert.equal(P.S.sora.myth, true);
  assert.equal(P.S.skillPoints, 8);
  assert.equal(P.S.skillUsedRound, false, 'ไม่นับเป็นการใช้สกิล');
  assert.equal(engine.action.locked, true, 'ใช้แล้วเดินไม่ได้');
  assert.deepEqual(calls.queue, ['soraTransform']);
  assert.equal(engine.displayImg(P.S), sora.IMG.myth);
  const v = view('S', 'S');
  assert.equal(v.img, sora.IMG.myth);
  assert.equal(v.character.basic.img, sora.IMG.toSora);
  assert.equal(v.skillLocks.basic.locked, true, 'เทิร์นนี้กดแล้ว');
  assert.equal(v.skillLocks.basic.free, true);
  // เทิร์นเดียวกันกดอีกไม่ได้
  engine.useSkill('S', 'basic', []);
  assert.equal(P.S.sora.myth, true);
  // เทิร์นหน้า: คืนร่าง (ไม่มีคลิป) → แปลงอีกครั้ง (ไม่มีคลิปแล้ว)
  engine.setRoundNumber(engine.roundNumber + 1);
  engine.setActor('S');
  engine.useSkill('S', 'basic', []);
  assert.equal(P.S.sora.myth, false);
  assert.equal(engine.displayImg(P.S), P.S.img);
  engine.setRoundNumber(engine.roundNumber + 1);
  engine.setActor('S');
  engine.useSkill('S', 'basic', []);
  assert.equal(P.S.sora.myth, true);
  assert.deepEqual(calls.queue, ['soraTransform'], 'คลิปแปลงร่างครั้งเดียวต่อเกม');
});

test('ร่างโซระ: My-Th Edge กับ Mouse Separade กดไม่ได้ (ปุ่มเทา) · แปลงร่างหลังใช้สกิลอื่นได้', () => {
  const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 3, 5]]);
  engine.setActor('S');
  engine.useSkill('S', 'secondary', []);
  assert.equal(P.S.sora.gun, false);
  engine.useSkill('S', 'ultimate', [], { dir: 'right' });
  assert.equal(P.S.skillPoints, 8, 'ไม่เสียแต้ม');
  const locks = view('S', 'S').skillLocks;
  assert.equal(locks.secondary.locked, true);
  assert.equal(locks.ultimate.locked, true);
  P.S.skillUsedRound = true;
  engine.useSkill('S', 'basic', []);
  assert.equal(P.S.sora.myth, true, 'ใช้โควตาไปแล้วก็ยังแปลงร่างได้');
});

test('My-Th Edge: สลับมีด ⇄ ปืน เทิร์นละ 1 ครั้ง · ไม่กินโควตา · เสียงตามอาวุธใหม่ · อาวุธค้างตอนคืนร่าง · ชื่อปุ่ม = อาวุธที่จะเปลี่ยนไป', () => {
  const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 8, 5]]);
  myth(P.S);
  engine.setActor('S');
  assert.equal(view('S', 'S').character.secondary.name, 'My-Th Edge (ปืน)');
  engine.useSkill('S', 'secondary', []);
  assert.equal(P.S.sora.gun, true);
  assert.equal(P.S.skillUsedRound, false);
  assert.equal(sora.skillSound(P.S, 'secondary'), 'sora_skill2_gun');
  assert.equal(view('S', 'S').character.secondary.name, 'My-Th Edge (มีด)');
  engine.useSkill('S', 'secondary', []);
  assert.equal(P.S.sora.gun, true, 'เทิร์นละครั้ง');
  // คืนร่างแล้วกลับมา = ยังถือปืน
  engine.useSkill('S', 'basic', []);
  assert.equal(P.S.sora.myth, false);
  engine.setRoundNumber(engine.roundNumber + 1);
  engine.setActor('S');
  engine.useSkill('S', 'basic', []);
  assert.equal(P.S.sora.gun, true);
  engine.useSkill('S', 'secondary', []);
  assert.equal(P.S.sora.gun, false);
  assert.equal(sora.skillSound(P.S, 'secondary'), 'sora_skill2_knife');
});

test('มีด: ตีปกติ +1 · ฉากตีรอยฟันสีฟ้า + เสียงมีด · ร่างโซระไม่มีโบนัส', () => {
  const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 2, 5]]);
  Math.random = () => 0.99; // ไม่คริ
  const before = vit(P.B);
  engine.doAttack('S', 'B');
  assert.equal(before - vit(P.B), 1, 'ร่างโซระ = พลังโจมตีพื้นฐาน');
  assert.equal(engine.lastAttack.byHitFx, null);
  myth(P.S);
  const mid = vit(P.B);
  engine.doAttack('S', 'B');
  assert.equal(mid - vit(P.B), 2);
  assert.equal(engine.lastAttack.byHitFx, 'mythSlash');
  assert.equal(engine.lastAttack.byAttackSound, 'sora_hit_knife');
  assert.ok(engine.lastAttack.skills.some((s) => /มีด \+1/.test(s.name)));
  assert.equal(engine.attackPowerAgainst(P.S, P.B), 2, 'หน้าต่างคาดการณ์เห็น +1');
});

test('คริติคอล 20% เฉพาะร่าง My-Th (ตีปกติ) · หน้าต่างคาดการณ์ 20% · ร่างโซระ 0%', () => {
  const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 2, 5]]);
  assert.equal(attack.estimateCritOf(P.S, P.B), 0);
  myth(P.S);
  assert.equal(attack.estimateCritOf(P.S, P.B), 20);
  Math.random = () => 0.19;
  const before = vit(P.B);
  engine.doAttack('S', 'B');
  assert.equal(before - vit(P.B), 4, '(1 + มีด 1) × 2');
  assert.ok(engine.lastAttack.skills.some((s) => /คริติคอล ×2 \(20%\)/.test(s.name)));
  Math.random = () => 0.2;
  const mid = vit(P.B);
  engine.doAttack('S', 'B');
  assert.equal(mid - vit(P.B), 2, 'ทอยเกิน 20% = ไม่คริ');
});

test('ปืน: ระยะตี 1–2 · ลำแสงสีฟ้ายาว 2 · เสียงปืน · ตีโดน = ดึงเป้าเข้าประชิดหลังฉากตี', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 3, 5], ['C', 'dummy', 4, 5]]);
  myth(P.S, true);
  Math.random = () => 0.99;
  assert.deepEqual(view('S', 'S').range, [1, 2]);
  engine.setActor('S');
  engine.action.locked = true;
  assert.equal(engine.attackTarget('S', 'C'), false, 'ห่าง 3');
  assert.equal(engine.attackTarget('S', 'B'), true, 'ห่าง 2');
  assert.equal(engine.lastAttack.byBeam, 2);
  assert.equal(engine.lastAttack.byBeamTone, 'blue');
  assert.equal(engine.lastAttack.byAttackSound, 'sora_hit_gun');
  assert.equal(engine.lastAttack.byHitFx, null);
  assert.deepEqual(P.B.pos, { x: 3, y: 5 }, 'ระหว่างฉากตียังไม่ขยับ');
  assert.equal(vit(P.B), 9, 'ปืนไม่มีโบนัสมีด');
  flush(t, 6000);
  assert.deepEqual(P.B.pos, { x: 2, y: 5 }, 'ดึงมาช่องติดตัว');
});

test('ปืน: เป้าเฉียงดึงมาช่องติดตัวที่ว่าง · ช่องไม่ว่าง = ไม่ดึง · หลบพ้น/ตาย/ตัวใหญ่ = ไม่ดึง', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  Math.random = () => 0.99;
  // เฉียง: เป้า (2,6) จาก (1,5) — ช่องติดตัว (2,5) และ (1,6) ห่างเป้า 1 ทั้งคู่ · (2,5) มีคน = ไป (1,6)
  let P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 2, 6], ['C', 'dummy', 2, 5]]);
  myth(P.S, true);
  engine.setActor('S');
  engine.attackTarget('S', 'B');
  flush(t, 6000);
  assert.deepEqual(P.B.pos, { x: 1, y: 6 });
  // แนวตรง ช่องกลางมีคน = ไม่ดึง
  P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 3, 5], ['C', 'dummy', 2, 5]]);
  myth(P.S, true);
  engine.setActor('S');
  engine.action.locked = true;
  engine.attackTarget('S', 'B');
  flush(t, 6000);
  assert.deepEqual(P.B.pos, { x: 3, y: 5 });
  // หลบพ้น = ไม่ดึง
  P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 3, 5]]);
  myth(P.S, true);
  P.B.statuses.evade = 1; P.B.statusAmt.evade = 100;
  engine.setActor('S');
  engine.action.locked = true;
  engine.attackTarget('S', 'B');
  assert.equal(engine.lastAttack.dodge, true);
  flush(t, 6000);
  assert.deepEqual(P.B.pos, { x: 3, y: 5 });
  // ตัวใหญ่ = ไม่ดึง
  P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 3, 5]]);
  myth(P.S, true);
  P.B.boardSize = 2;
  engine.setActor('S');
  engine.action.locked = true;
  engine.attackTarget('S', 'B');
  flush(t, 6000);
  assert.deepEqual(P.B.pos, { x: 3, y: 5 });
});

test('Mouse Separade: ชนศัตรูคนแรก → คลิปชน → ดาเมจ 3 (เกราะก่อน) + สลับที่ · คลิปท่าไม้ตายครั้งแรกเท่านั้น · ไม่จบตา', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 3, 5], ['C', 'dummy', 4, 5], ['D', 'dummy', 12, 12]]);
  myth(P.S);
  P.B.armor = 1; P.B.hp = 7;
  Math.random = () => 0.99;
  engine.setActor('S');
  engine.useSkill('S', 'ultimate', [], { dir: 'right' });
  assert.equal(P.S.skillPoints, 4);
  assert.equal(P.S.skillUsedRound, true);
  assert.equal(engine.gameState, 'ATTACKING', 'พักตาเดินให้กระดานเล่นวงล้อ + พุ่ง');
  assert.deepEqual(engine.buildStateFor('S').dash.path, [{ x: 1, y: 5 }, { x: 2, y: 5 }]);
  assert.equal(engine.buildStateFor('S').dash.wheel, true);
  assert.deepEqual(P.S.pos, { x: 1, y: 5 }, 'ตำแหน่งจริงยังไม่ขยับ');
  flush(t, 6000);
  assert.deepEqual(calls.queue, ['soraUlt', 'soraHit']);
  assert.equal(P.B.armor, 0);
  assert.equal(P.B.hp, 5, 'เกราะ 1 + เลือด 2');
  assert.equal(vit(P.C), 10, 'คนที่สองไม่โดน');
  assert.deepEqual(P.S.pos, { x: 3, y: 5 }, 'เราไปยืนช่องเป้า');
  assert.deepEqual(P.B.pos, { x: 1, y: 5 }, 'เป้าไปช่องที่เราออกตัว');
  const dash = engine.buildStateFor('S').dash;
  assert.deepEqual(dash.boom, { x: 3, y: 5 });
  assert.deepEqual(dash.path, [{ x: 2, y: 5 }, { x: 3, y: 5 }], 'ต่อจากช่องที่ค้างภาพไว้ระหว่างคลิปชน');
  assert.deepEqual(dash.swap, { id: 'B', from: { x: 3, y: 5 }, to: { x: 1, y: 5 } });
  assert.equal(engine.gameState, 'ACTION', 'กลับมาตาเดินต่อ');
  assert.equal(engine.actorId, 'S');
  // ครั้งที่สอง: ไม่มีคลิปท่าไม้ตาย แต่คลิปชนยังเล่น
  calls.queue = [];
  P.S.skillUsedRound = false;
  engine.useSkill('S', 'ultimate', [], { dir: 'right' });
  flush(t, 6000);
  assert.deepEqual(calls.queue, ['soraHit']);
  assert.deepEqual(P.S.pos, { x: 4, y: 5 }, 'ชน C (B ไปอยู่หลังแล้ว)');
  assert.deepEqual(P.C.pos, { x: 3, y: 5 });
});

test('Mouse Separade: หลบพ้น = ทะลุไปชนคนถัดไป · เพื่อนร่วมทีม = ทะลุ · ไม่ชนใคร = หยุดสุดแนว (ช่องไม่ว่างถอยมา)', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  Math.random = () => 0.5;
  let P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 2, 5], ['C', 'dummy', 4, 5]]);
  myth(P.S);
  P.B.statuses.evade = 1; P.B.statusAmt.evade = 100;
  engine.setActor('S');
  engine.useSkill('S', 'ultimate', [], { dir: 'right' });
  flush(t, 6000);
  assert.equal(vit(P.B), 10);
  assert.equal(vit(P.C), 7);
  assert.deepEqual(P.S.pos, { x: 4, y: 5 });
  assert.deepEqual(P.C.pos, { x: 1, y: 5 });
  assert.deepEqual(P.B.pos, { x: 2, y: 5 });
  // โหมดทีม: เพื่อนยืนปลายแนว = ทะลุ ไม่โดน · หยุดช่องว่างก่อนหน้า
  P = setup([['S', 'sora_otosumi', 1, 5, 't1'], ['A', 'dummy', 5, 5, 't1'], ['B', 'dummy', 12, 12, 't2'], ['C', 'dummy', 12, 1, 't2']], 'duo');
  myth(P.S);
  engine.setActor('S');
  calls.queue = [];
  engine.useSkill('S', 'ultimate', [], { dir: 'right' });
  flush(t, 6000);
  assert.equal(vit(P.A), 10);
  assert.deepEqual(P.S.pos, { x: 4, y: 5 });
  assert.deepEqual(calls.queue, ['soraUlt'], 'ไม่ชน = ไม่มีคลิปชน');
  // ไม่มีใคร = สุดแนว 4 ช่อง
  P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 12, 12]]);
  myth(P.S);
  engine.setActor('S');
  engine.useSkill('S', 'ultimate', [], { dir: 'right' });
  flush(t, 6000);
  assert.deepEqual(P.S.pos, { x: 5, y: 5 });
});

test('Mouse Separade: ฆ่าได้ (เราไปยืนช่องเป้า ไม่มีการโยน) · ชนตัวใหญ่ = ดาเมจแล้วหยุดหน้าตัว ไม่สลับที่', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  Math.random = () => 0.99;
  let P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 3, 5], ['C', 'dummy', 12, 12]]);
  myth(P.S);
  P.B.hp = 2; P.B.armor = 0;
  engine.setActor('S');
  engine.useSkill('S', 'ultimate', [], { dir: 'right' });
  flush(t, 6000);
  assert.equal(P.B.alive, false);
  assert.equal(P.B.pos, null);
  assert.deepEqual(P.S.pos, { x: 3, y: 5 });
  assert.equal(engine.buildStateFor('S').dash.swap, null);
  P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 3, 4], ['C', 'dummy', 12, 12]]);
  myth(P.S);
  P.B.boardSize = 2; // (3,4)–(4,5)
  engine.setActor('S');
  engine.useSkill('S', 'ultimate', [], { dir: 'right' });
  flush(t, 6000);
  assert.equal(vit(P.B), 7);
  assert.deepEqual(P.B.pos, { x: 3, y: 4 });
  assert.deepEqual(P.S.pos, { x: 2, y: 5 });
});

test('Mouse Separade: พังสิ่งกีดขวางที่พุ่งผ่าน · ไม่เลือกทิศ = กดไม่ได้ (ไม่เสียแต้ม)', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  // หาสิ่งกีดขวางที่มีช่องว่าง 2 ช่องทางซ้ายบนภูมิภาค I
  let P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 12, 12]]);
  const map = engine.boardMap();
  const free = (x, y) => x >= 0 && !map.terrain[`${x},${y}`];
  const rock = Object.keys(map.terrain).map((k) => k.split(',').map(Number))
    .find(([x, y]) => map.terrain[`${x},${y}`] !== 'seal' && free(x - 1, y) && free(x - 2, y) && !(x - 2 === 12 && y === 12));
  assert.ok(rock, 'มีสิ่งกีดขวางให้ทดสอบ');
  const [rx, ry] = rock;
  P = setup([['S', 'sora_otosumi', rx - 2, ry], ['B', 'dummy', 12, 12]]);
  myth(P.S);
  engine.setActor('S');
  engine.useSkill('S', 'ultimate', []);
  assert.equal(P.S.skillPoints, 8);
  engine.useSkill('S', 'ultimate', [], { dir: 'right' });
  flush(t, 6000);
  assert.equal(engine.boardMap().terrain[`${rx},${ry}`], undefined, 'สิ่งกีดขวางพัง');
  assert.ok(calls.fx.some((f) => f.event === 'smashFx'));
  assert.ok(P.S.pos.x > rx - 2, 'พุ่งออกไป');
});

test('เพื่อคุณหนู: ร่างโซระครบ 3 เทิร์น ฟื้น 2 · แปลงร่างแล้วนับใหม่ · เทิร์นที่คืนร่างไม่นับ · ร่าง My-Th ไม่ฟื้น', () => {
  const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 8, 5]]);
  P.S.hp = 2;
  const tick = () => { sora.onEndTurn(engine); engine.setRoundNumber(engine.roundNumber + 1); };
  tick(); tick();
  assert.equal(P.S.hp, 2);
  assert.equal(view('S', 'S').sora.calm, 2);
  tick();
  assert.equal(P.S.hp, 4);
  assert.equal(P.S.sora.calm, 0);
  // นับไป 2 แล้วแปลงร่าง = เริ่มใหม่
  tick(); tick();
  engine.setActor('S');
  engine.useSkill('S', 'basic', []);
  tick(); tick(); tick();
  assert.equal(P.S.hp, 4, 'ร่าง My-Th ไม่ฟื้น');
  engine.setActor('S');
  engine.useSkill('S', 'basic', []); // คืนร่าง (เทิร์นนี้ไม่นับ)
  tick();
  assert.equal(P.S.sora.calm, 0);
  tick(); tick(); tick();
  assert.equal(P.S.hp, 6);
});
