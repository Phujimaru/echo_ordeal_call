// โซระ โอโตสุมิ (sora_otosumi) — แปลงร่าง / My-Th Edge / Mouse Separade / เพื่อคุณหนู บนกระดาน (GRID_PLAN §7.7)
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const sora = require('../../characters/sora_otosumi.js');
const attack = require('../../server/phases/attack.js');
const match = require('../../server/match.js');
const Ice = require('../../server/ice.js');
const Zero = require('../../server/zeroTime.js');
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

test('ข้อมูล: ระดับง่าย · เดิน 4 ตีประชิด · แปลงร่าง/My-Th Edge 0 แต้ม · Mouse Separade 6 แต้ม แนว 4×1 (สกิลโจมตี)', () => {
  const ch = CHAR_BY_ID.sora_otosumi;
  assert.equal(ch.difficulty, 'easy');
  assert.equal(ch.mov, 4);
  assert.deepEqual(ch.range, [1, 1]);
  assert.equal(ch.basic.cost, 0);
  assert.equal(ch.secondary.cost, 0);
  assert.equal(ch.ultimate.cost, 6);
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
  assert.equal(v.character.basic.img, sora.IMG.fire, 'ร่าง My-Th: ปุ่มเป็นตัวเลือก Fire Frame / คืนร่าง');
  assert.deepEqual(v.character.basic.choices.map((c) => c.key), ['fire', 'sora']);
  assert.ok(v.character.basic.choices.every((c) => c.desc && c.locked), 'ทุกตัวเลือกมีคำอธิบาย · เทิร์นนี้แปลงแล้ว = ล็อก');
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
  assert.equal(mid - vit(P.B), 1 + sora.KNIFE_BONUS);
  assert.equal(engine.lastAttack.byHitFx, 'mythSlash');
  assert.equal(engine.lastAttack.byAttackSound, 'sora_hit_knife');
  assert.ok(engine.lastAttack.skills.some((s) => /มีด \+1/.test(s.name)));
  assert.equal(engine.attackPowerAgainst(P.S, P.B), 2, 'หน้าต่างคาดการณ์เห็น +1');
});

test('คริติคอล 20% เฉพาะร่าง My-Th (ตีปกติ) · หน้าต่างคาดการณ์ 20% · ร่างโซระ 0%', () => {
  const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 2, 5]]);
  assert.equal(attack.estimateCritOf(P.S, P.B), 0);
  myth(P.S);
  assert.equal(attack.estimateCritOf(P.S, P.B), sora.CRIT_PCT);
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

test('ปืน: ระยะตี 1–3 · ลำแสงสีฟ้ายาว 3 · เสียงปืน · ตีโดน = ดึงเป้าเข้าประชิดหลังฉากตี · ฐาน 1 ไม่มีโบนัสมีด', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 4, 5], ['C', 'dummy', 5, 5]]);
  myth(P.S, true);
  Math.random = () => 0.99; // ไม่คริ
  assert.deepEqual(view('S', 'S').range, sora.GUN_RANGE);
  assert.equal(engine.attackPowerAgainst(P.S, P.B), 1, 'หน้าต่างคาดการณ์ = 1');
  engine.setActor('S');
  engine.action.locked = true;
  assert.equal(engine.attackTarget('S', 'C'), false, 'ห่าง 4');
  assert.equal(engine.attackTarget('S', 'B'), true, 'ห่าง 3');
  assert.equal(engine.lastAttack.byBeam, 3);
  assert.equal(engine.lastAttack.byBeamTone, 'blue');
  assert.equal(engine.lastAttack.byAttackSound, 'sora_hit_gun');
  assert.equal(engine.lastAttack.byHitFx, null);
  assert.equal(engine.lastAttack.crit, false);
  assert.deepEqual(P.B.pos, { x: 4, y: 5 }, 'ระหว่างฉากตียังไม่ขยับ');
  assert.equal(vit(P.B), 9, 'ปืนไม่มีโบนัสมีด');
  flush(t, 6000);
  assert.deepEqual(P.B.pos, { x: 2, y: 5 }, 'ดึงมาช่องติดตัว');
});

test('ปืน: คริติคอล 20% ทำให้ตี 1 กลายเป็น 2 — การ์ดฉากตีบอก crit ให้ client ขึ้นป้าย', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 3, 5]]);
  myth(P.S, true);
  Math.random = () => 0.1;
  engine.setActor('S');
  engine.attackTarget('S', 'B');
  assert.equal(vit(P.B), 8);
  assert.equal(engine.lastAttack.dmg, 2);
  assert.equal(engine.lastAttack.crit, true);
  flush(t, 6000);
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
  assert.equal(P.S.skillPoints, 2);
  assert.equal(P.S.skillUsedRound, true);
  assert.equal(engine.gameState, 'ATTACKING', 'พักตาเดินให้กระดานเล่นวงล้อ + พุ่ง');
  assert.deepEqual(engine.buildStateFor('S').dash.path, [{ x: 1, y: 5 }, { x: 2, y: 5 }]);
  assert.equal(engine.buildStateFor('S').dash.wheel, true);
  assert.deepEqual(engine.buildStateFor('S').dash.dir, { x: 1, y: 0 }, 'ทิศที่เลือกให้ client หันวงล้อ');
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
  P.S.skillUsedRound = false; P.S.sora.ultReady = 0; P.S.skillPoints = 8;
  engine.useSkill('S', 'ultimate', [], { dir: 'right' });
  flush(t, 6000);
  assert.deepEqual(calls.queue, ['soraHit']);
  assert.deepEqual(P.S.pos, { x: 4, y: 5 }, 'ชน C (B ไปอยู่หลังแล้ว)');
  assert.deepEqual(P.C.pos, { x: 3, y: 5 });
});

test('Mouse Separade: คูลดาวน์ 2 เทิร์น — กดเทิร์น N ได้อีกเทิร์น N+3 (ไม่เสียแต้มตอนติดคูลดาวน์)', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 12, 12]]);
  myth(P.S);
  engine.setRoundNumber(2);
  engine.setActor('S');
  engine.useSkill('S', 'ultimate', [], { dir: 'right' });
  flush(t, 6000);
  assert.equal(P.S.skillPoints, 2);
  assert.equal(view('S', 'S').skillLocks.ultimate.cd, sora.ULT_CD);
  for (const [round, cd] of [[3, 2], [4, 1]]) {
    engine.setRoundNumber(round);
    P.S.skillUsedRound = false; P.S.skillPoints = 8;
    engine.setActor('S');
    assert.equal(view('S', 'S').skillLocks.ultimate.cd, cd);
    engine.useSkill('S', 'ultimate', [], { dir: 'left' });
    assert.equal(P.S.skillPoints, 8, `เทิร์น ${round} ยังติดคูลดาวน์`);
  }
  engine.setRoundNumber(5);
  P.S.skillUsedRound = false;
  engine.setActor('S');
  assert.equal(view('S', 'S').skillLocks.ultimate.cd, 0);
  engine.useSkill('S', 'ultimate', [], { dir: 'left' });
  flush(t, 6000);
  assert.equal(P.S.skillPoints, 2, 'เทิร์น N+3 กดได้');
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

test('Mouse Separade: ฆ่าได้ (เราไปยืนช่องเป้า ไม่มีการโยน)', (t) => {
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
});

// ---------- ชนตัวใหญ่ (ผู้ใช้สั่ง 2026-10-19): ดาเมจ +1 · ผลักถอย 2 ช่อง · ติดของ = ชน -1 ----------
//  ภูมิภาค I: แถว y = 7, 8 โล่งทั้งแถว · สิ่งกีดขวาง (4,9)
const iceEvents = () => calls.fx.filter((f) => f.event === 'iceFx').flatMap((f) => f.payload.events);
function bigCharge(t, list, size, dir, prep) {
  if (!t.soraTimers) { t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] }); t.soraTimers = true; } // เรียกซ้ำในเทสต์เดียวกันได้
  calls.fx = [];
  Math.random = () => 0.99;
  const P = setup(list);
  myth(P.S);
  P.B.boardSize = size;
  if (prep) prep(P);
  engine.setActor('S');
  engine.useSkill('S', 'ultimate', [], { dir });
  flush(t, 12000);
  return P;
}
test(`Mouse Separade: ชนตัวใหญ่ 3×3 = ดาเมจ ${sora.ULT_DMG + sora.BIG_BONUS} · หยุดหน้าตัว ไม่สลับที่ · ผลักถอย ${sora.BIG_PUSH} ช่อง`, (t) => {
  const P = bigCharge(t, [['S', 'sora_otosumi', 1, 7], ['B', 'dummy', 3, 6], ['C', 'dummy', 12, 12]], 3, 'right'); // (3,6)–(5,8)
  assert.equal(vit(P.B), 10 - 4);
  assert.deepEqual(P.S.pos, { x: 2, y: 7 }, 'หยุดหน้าตัว');
  assert.deepEqual(P.B.pos, { x: 5, y: 6 }, 'ถอย 2 ช่องตามทิศพุ่ง');
  assert.equal(engine.buildStateFor('S').dash.swap, null);
  const ev = iceEvents();
  assert.deepEqual(ev, [{ kind: 'knock', id: 'B', from: { x: 3, y: 6 }, to: { x: 5, y: 6 } }]);
  assert.equal(engine.gameState, 'ACTION');
});
test('Mouse Separade: ตัวใหญ่ถอยไปติดสิ่งกีดขวาง = หยุดตรงนั้น + ชน -1', (t) => {
  const P = bigCharge(t, [['S', 'sora_otosumi', 5, 5], ['B', 'dummy', 4, 6], ['C', 'dummy', 12, 12]], 2, 'down'); // (4,6)–(5,7)
  assert.equal(vit(P.B), 10 - 4 - sora.CRASH_DMG);
  assert.deepEqual(P.B.pos, { x: 4, y: 7 }, 'ถอยได้ 1 ช่อง — ช่องถัดไปมีสิ่งกีดขวาง (4,9)');
  const ev = iceEvents();
  assert.deepEqual(ev.map((e) => e.kind), ['knock', 'knock', 'crash']);
  assert.equal(ev[1].collide, true);
  assert.deepEqual(ev[2], { kind: 'crash', id: 'B', x: 4, y: 7, dmg: 1, kill: false });
});
test('Mouse Separade: ตัวใหญ่ถอยไปติดคน = ชน -1 (คนที่ขวางไม่โดน) · ติดขอบกระดาน = ชน -1 ฆ่าได้', (t) => {
  let P = bigCharge(t, [['S', 'sora_otosumi', 1, 8], ['B', 'dummy', 3, 7], ['C', 'dummy', 6, 7]], 2, 'right');
  assert.deepEqual(P.B.pos, { x: 4, y: 7 });
  assert.equal(vit(P.B), 10 - 5);
  assert.equal(vit(P.C), 10, 'คนที่ขวางไม่เสียเลือด');
  P = bigCharge(t, [['S', 'sora_otosumi', 10, 8], ['B', 'dummy', 12, 7], ['C', 'dummy', 1, 1]], 2, 'right', (Q) => { Q.B.hp = 5; Q.B.armor = 0; });
  assert.equal(P.B.alive, false, 'ดาเมจ 4 เหลือ 1 → ชนขอบ -1 ตกรอบ');
  assert.equal(P.B.pos, null);
  assert.deepEqual(P.S.pos, { x: 11, y: 8 });
  const ev = iceEvents();
  assert.deepEqual(ev.map((e) => e.kind), ['knock', 'crash'], 'ไม่ขยับเลย = ชนอย่างเดียว');
  assert.equal(ev[1].kill, true);
});

test('Mouse Separade: เป้าตกรอบระหว่างคลิปชน = หยุดที่ปลายทางพุ่ง (ช่องหน้าเป้า) · ไม่มีดาเมจ/สลับที่', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  Math.random = () => 0.99;
  const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 4, 5], ['C', 'dummy', 12, 12]]);
  myth(P.S);
  // คลิปชนเริ่ม → เป้าหายไประหว่างคลิป (ตกรอบจากอย่างอื่น)
  engine.queueCutscene = (p, key) => { calls.queue.push(key); if (key === 'soraHit') { P.B.alive = false; P.B.pos = null; } };
  try {
    engine.setActor('S');
    engine.useSkill('S', 'ultimate', [], { dir: 'right' });
    flush(t, 6000);
  } finally { engine.queueCutscene = (p, key) => calls.queue.push(key); }
  assert.deepEqual(P.S.pos, { x: 3, y: 5 });
  const dash = engine.buildStateFor('S').dash;
  assert.deepEqual(dash.path, [{ x: 3, y: 5 }]);
  assert.equal(dash.swap, undefined);
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

test('เพื่อคุณหนู: ร่างโซระครบ 2 เทิร์น ฟื้น 2 · แปลงร่างแล้วนับใหม่ · เทิร์นที่คืนร่างไม่นับ · ร่าง My-Th ไม่ฟื้น', () => {
  const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 8, 5]]);
  P.S.hp = 2;
  const tick = () => { sora.onEndTurn(engine); engine.setRoundNumber(engine.roundNumber + 1); };
  tick();
  assert.equal(P.S.hp, 2);
  assert.equal(view('S', 'S').sora.calm, 1);
  assert.equal(view('S', 'S').sora.calmMax, sora.REGEN_TURNS);
  tick();
  assert.equal(P.S.hp, 4);
  assert.equal(P.S.sora.calm, 0);
  // นับไป 1 แล้วแปลงร่าง = เริ่มใหม่
  tick();
  engine.setActor('S');
  engine.useSkill('S', 'basic', []);
  tick(); tick(); tick();
  assert.equal(P.S.hp, 4, 'ร่าง My-Th ไม่ฟื้น');
  engine.setActor('S');
  engine.useSkill('S', 'basic', []); // คืนร่าง (เทิร์นนี้ไม่นับ)
  tick();
  assert.equal(P.S.sora.calm, 0);
  tick();
  assert.equal(P.S.hp, 4);
  tick();
  assert.equal(P.S.hp, 6);
  // เลือดเต็ม = ไม่บันทึก "+0" (ตัวนับยังรีเซ็ตตามรอบ)
  P.S.hp = engine.maxHpOf(P.S);
  const at = match.lastLog.length;
  tick(); tick();
  assert.equal(P.S.sora.calm, 0);
  assert.ok(!match.lastLog.slice(at).some((l) => /เพื่อคุณหนู/.test(l)));
});

// ---------- ผลของสกิลโจมตีพื้นที่: เฉพาะช่องที่พุ่งผ่านจริงจนถึงจุดชน (ผู้ใช้ตัดสิน) ----------
const spikeLog = (from) => match.lastLog.slice(from).filter((l) => /หนามน้ำแข็งด้วยสกิล/.test(l));

for (const gun of [false, true]) {
  test(`Mouse Separade (${gun ? 'ปืน' : 'มีด'}): หนามที่พุ่งผ่านโดน ${sora.ULT_DMG} พอดี · หนามหลังจุดชนไม่โดน`, (t) => {
    t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
    Math.random = () => 0.99;
    const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 4, 5], ['C', 'dummy', 12, 12]]);
    myth(P.S, gun);
    Ice.placeSpike(2, 5, 'C', 3);
    Ice.placeSpike(5, 5, 'C', 3);
    const behind = { ...Ice.spikeAt(5, 5) };
    const at = match.lastLog.length;
    engine.setActor('S');
    engine.useSkill('S', 'ultimate', [], { dir: 'right' });
    assert.deepEqual(spikeLog(at), [], 'ยังไม่ลงก่อนกระดานเล่นพุ่ง');
    flush(t, 6000);
    assert.deepEqual(spikeLog(at), [`S โจมตีหนามน้ำแข็งด้วยสกิล -${sora.ULT_DMG}`]);
    assert.equal(Ice.spikeAt(2, 5), null, 'หนามที่พุ่งผ่านพัง');
    assert.deepEqual(Ice.spikeAt(5, 5), behind, 'หนามหลังเป้าไม่โดน');
    assert.equal(vit(P.B), 10 - sora.ULT_DMG);
  });
}

test(`Mouse Separade: ผนึกมิโกะที่หยุดหน้าผนึกโดน ${sora.ULT_DMG} (มีดไม่บวก) · ผนึกหลังจุดชนไม่โดน`, (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const ultLocked = Zero.ultLocked;
  Zero.ultLocked = () => false; // ห่วงเวลาซีโร่ล็อกท่าไม้ตาย — ปลดเพื่อทดสอบช่องที่ลงผนึก
  try {
    Math.random = () => 0.99;
    const run = (enemyAt) => {
      const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 4, 5], ['C', 'dummy', 12, 12]]);
      Zero.enter(); engine.clearPhaseTimer(); match.zeroScene.active = false;
      P.S.pos = { x: 3, y: 0 }; P.C.pos = { x: 12, y: 12 };
      P.B.pos = enemyAt || { x: 10, y: 10 };
      myth(P.S);
      engine.setActor('S');
      engine.useSkill('S', 'ultimate', [], { dir: 'left' });
      flush(t, 6000);
      const s = match.zero.seals[0];
      return { P, vit: s.hp + s.armor };
    };
    const full = Zero.SEAL_HP + Zero.SEAL_ARMOR;
    let r = run(null);
    assert.equal(r.vit, full - sora.ULT_DMG, 'ชนผนึก (ช่องที่หยุด)');
    assert.deepEqual(r.P.S.pos, { x: 1, y: 0 }, 'หยุดหน้าผนึก');
    r = run({ x: 1, y: 0 });
    assert.equal(r.vit, full, 'ชนเป้าก่อนถึงผนึก = ผนึกไม่โดน');
    assert.equal(vit(r.P.B), 10 - sora.ULT_DMG);
  } finally {
    Zero.ultLocked = ultLocked;
  }
});

test('Mouse Separade: คนล่องหนหลังจุดชนไม่ปรากฏตัว · คนล่องหนที่ถูกชนปรากฏตัว', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  Math.random = () => 0.99;
  let P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 3, 5], ['V', 'sliver_bullet', 5, 5], ['C', 'dummy', 12, 12]]);
  assert.equal(P.V.sliver.hidden, true, 'เริ่มเกมล่องหน');
  myth(P.S);
  engine.setActor('S');
  engine.useSkill('S', 'ultimate', [], { dir: 'right' });
  flush(t, 6000);
  assert.equal(vit(P.B), 10 - sora.ULT_DMG);
  assert.equal(P.V.sliver.hidden, true, 'อยู่หลังจุดชน = ไม่โดน');
  P = setup([['S', 'sora_otosumi', 1, 5], ['V', 'sliver_bullet', 3, 5], ['B', 'dummy', 12, 1], ['C', 'dummy', 12, 12]]);
  myth(P.S);
  engine.setActor('S');
  engine.useSkill('S', 'ultimate', [], { dir: 'right' });
  flush(t, 6000);
  assert.equal(P.V.sliver.hidden, false, 'ถูกชน = ปรากฏตัว');
});

test('Mouse Separade: บันทึกดาเมจนับส่วนที่โล่รับด้วย (ไม่ขึ้น -0)', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  Math.random = () => 0.99;
  const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 3, 5], ['C', 'dummy', 12, 12]]);
  myth(P.S);
  P.B.shield = 2;
  const at = match.lastLog.length;
  engine.setActor('S');
  engine.useSkill('S', 'ultimate', [], { dir: 'right' });
  flush(t, 6000);
  assert.equal(P.B.shield, 0);
  assert.ok(match.lastLog.slice(at).includes(`💥 Mouse Separade → B -${sora.ULT_DMG} (ลดเกราะก่อน)`));
});

// ---------- Fire Frame (ผู้ใช้สั่ง 2026-10-25) ----------
const fire = (p, gun = false) => { myth(p, gun); p.sora.fire = true; };

test('Fire Frame: ร่าง My-Th เลือก Fire Frame = เข้าร่างไฟ (0 แต้ม · คลิปครั้งแรกต่อเกม) · คืนร่างเลือกได้ · ร่างไฟกดแปลงร่าง = คืนร่างโซระ', () => {
  const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 8, 5]]);
  myth(P.S);
  engine.setActor('S');
  assert.equal(view('S', 'S').character.basic.choices.some((c) => c.locked), false, 'เทิร์นนี้ยังไม่แปลง = กดได้');
  engine.useSkill('S', 'basic', [], { form: 'fire' });
  assert.equal(P.S.sora.myth, true);
  assert.equal(P.S.sora.fire, true);
  assert.equal(P.S.skillPoints, 8);
  assert.equal(P.S.skillUsedRound, false, 'ไม่นับเป็นการใช้สกิล');
  assert.deepEqual(calls.queue, ['soraFire']);
  const v = view('S', 'S');
  assert.equal(v.sora.fire, true);
  assert.equal(v.character.basic.choices, undefined, 'ร่างไฟ = ปุ่มคืนร่างธรรมดา');
  assert.equal(v.character.basic.img, sora.IMG.toSora);
  // เทิร์นเดียวกันกดอีกไม่ได้
  engine.useSkill('S', 'basic', []);
  assert.equal(P.S.sora.fire, true);
  // เทิร์นหน้า: ร่างไฟกด = กลับร่างโซระ
  engine.setRoundNumber(engine.roundNumber + 1);
  engine.setActor('S');
  engine.useSkill('S', 'basic', []);
  assert.equal(P.S.sora.myth, false);
  assert.equal(P.S.sora.fire, false);
  // เข้าไฟอีกครั้ง = ไม่มีคลิปแล้ว · ตัวเลือกคืนร่างจาก My-Th ยังกลับร่างโซระ
  P.S.sora.myth = true;
  engine.setRoundNumber(engine.roundNumber + 1);
  engine.setActor('S');
  engine.useSkill('S', 'basic', [], { form: 'fire' });
  assert.deepEqual(calls.queue, ['soraFire'], 'คลิป Fire Frame ครั้งเดียวต่อเกม');
  P.S.sora.fire = false;
  engine.setRoundNumber(engine.roundNumber + 1);
  engine.setActor('S');
  engine.useSkill('S', 'basic', [], { form: 'sora' });
  assert.equal(P.S.sora.myth, false);
});

test('Fire Frame: ตีปกติ (มีด/ปืน) ติดลุกไหม้ 1 · ป้ายใต้ฉากตี · ต้านสถานะกันได้ · ร่าง My-Th ปกติไม่ติด', () => {
  const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 2, 5]]);
  Math.random = () => 0.99;
  myth(P.S);
  engine.doAttack('S', 'B');
  assert.equal(P.B.statuses.hburn, undefined, 'My-Th ปกติไม่ติดลุกไหม้');
  fire(P.S);
  const before = vit(P.B);
  engine.doAttack('S', 'B');
  assert.equal(before - vit(P.B), 1 + sora.KNIFE_BONUS, 'มีดยังบวกตามเดิม');
  assert.equal(P.B.statuses.hburn, sora.FIRE_BURN);
  assert.ok(engine.lastAttack.skills.some((s) => /ลุกไหม้ 1/.test(s.name)));
  fire(P.S, true);
  engine.doAttack('S', 'B');
  assert.equal(P.B.statuses.hburn, 2, 'ปืนก็ติด (สะสม)');
  P.B.statuses = { resist: 2 };
  engine.doAttack('S', 'B');
  assert.equal(P.B.statuses.hburn, undefined, 'ต้านสถานะกันได้');
});

test('Fire Frame: Mouse Separade ชนแล้วติดลุกไหม้ 1 · คลิปเปิดไฟครั้งแรกต่อเกม (แยกจากคลิปปกติ) · คลิปชนไฟทุกครั้ง · กระดานได้ธงไฟ', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 3, 5], ['D', 'dummy', 12, 12]]);
  fire(P.S);
  Math.random = () => 0.99;
  engine.setActor('S');
  engine.useSkill('S', 'ultimate', [], { dir: 'right' });
  assert.equal(engine.buildStateFor('S').dash.fire, true, 'วงล้อสีไฟ');
  flush(t, 6000);
  assert.deepEqual(calls.queue, ['soraFireUlt', 'soraFireHit']);
  assert.equal(vit(P.B), 10 - sora.ULT_DMG);
  assert.equal(P.B.statuses.hburn, sora.FIRE_BURN);
  assert.equal(engine.buildStateFor('S').dash.fire, true, 'ระเบิดสีไฟ');
  // ครั้งที่สอง: ไม่มีคลิปเปิด แต่คลิปชนไฟยังเล่น
  calls.queue = [];
  P.S.skillUsedRound = false; P.S.sora.ultReady = 0; P.S.skillPoints = 8;
  engine.useSkill('S', 'ultimate', [], { dir: 'left' });
  flush(t, 6000);
  assert.deepEqual(calls.queue, ['soraFireHit']);
  assert.equal(P.B.statuses.hburn, 2);
  // ร่าง My-Th ปกติยังได้คลิปปกติของตัวเอง (ยังไม่เคยเล่น)
  calls.queue = [];
  P.S.sora.fire = false;
  P.S.skillUsedRound = false; P.S.sora.ultReady = 0; P.S.skillPoints = 8;
  engine.useSkill('S', 'ultimate', [], { dir: 'right' });
  flush(t, 6000);
  assert.deepEqual(calls.queue, ['soraUlt', 'soraHit']);
  assert.equal(P.B.statuses.hburn, 2, 'ร่างปกติไม่ติดเพิ่ม');
});

test('Fire Frame: จบเทิร์นเสียแต้มสกิล 1 · แต้มไม่พอ = กลับร่าง My-Th (อาวุธค้าง) · ไม่ฟื้นเพื่อคุณหนู', () => {
  const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 8, 5]]);
  fire(P.S, true);
  P.S.skillPoints = 1;
  sora.onEndTurn(engine);
  assert.equal(P.S.skillPoints, 0);
  assert.equal(P.S.sora.fire, true);
  sora.onEndTurn(engine);
  assert.equal(P.S.sora.fire, false, 'แต้มหมด = ไฟดับ');
  assert.equal(P.S.sora.myth, true, 'ยังเป็น My-Th');
  assert.equal(P.S.sora.gun, true);
  assert.equal(P.S.skillPoints, 0);
  P.S.skillPoints = 3;
  sora.onEndTurn(engine);
  assert.equal(P.S.skillPoints, 3, 'My-Th ปกติไม่เสียแต้ม');
});

test('Fire Frame: ตัดผลสกิล (severables) — ตัด Fire Frame ก่อน (เหลือ My-Th) แล้วค่อยตัด My-Th', () => {
  const P = setup([['S', 'sora_otosumi', 1, 5], ['B', 'dummy', 8, 5]]);
  engine.setActor('S');
  engine.useSkill('S', 'basic', []);
  engine.setRoundNumber(engine.roundNumber + 1);
  engine.setActor('S');
  engine.useSkill('S', 'basic', [], { form: 'fire' });
  const list = sora.severables(engine, P.S);
  assert.deepEqual(list.map((x) => x.key), ['soraMyth', 'soraFire']);
  const latest = list.reduce((a, b) => (b.at > a.at ? b : a));
  assert.equal(latest.key, 'soraFire');
  latest.cancel();
  assert.equal(P.S.sora.fire, false);
  assert.equal(P.S.sora.myth, true);
  sora.severables(engine, P.S)[0].cancel();
  assert.equal(P.S.sora.myth, false);
});
