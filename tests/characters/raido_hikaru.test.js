// ไรโด ฮิคารุ (raido_hikaru) — UltraLive 6 ร่าง / Ultraman Ginga / Ginga Cross Shoot ⇄ Strium Ray / Strium Brace
//  สเปกที่ผู้ใช้ตัดสิน: .claude/plans/raido-hikaru-handoff.md
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const hk = require('../../characters/raido_hikaru.js');
const Board = require('../../server/board.js');
const { CHAR_BY_ID } = require('../../characters.js');
const { TRANSFORMS } = require('../../server/constants.js');

const realRandom = Math.random;
const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
// list = [[id, characterId, x, y, teamId?], ...] — ภูมิภาค I: แถว y = 2, 5, 8, 13 โล่งทั้งแถว
function setup(list, mode = 'ffa') {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, ch, , , team], i) => { engine.players[id] = blank(id, ch, i + 1, team || null); });
  engine.setGameMode(mode);
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setJourneyArea(1);
  engine.placeOnBoard(1);
  engine.setCycleShift(0);
  engine.setRoundNumber(1);
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.skillPoints = 8; p.skillUsedRound = false; p.shield = 0;
    p.statuses = {}; p.statusAmt = {};
  }
  return engine.players;
}
const view = (viewerId, id) => engine.buildStateFor(viewerId).players.find((p) => p.id === id);
const vit = (p) => (p.hp || 0) + (p.armor || 0);
const form = (id, key) => engine.useSkill(id, 'basic', [], { form: key });
// จบเทิร์นแบบไม่ผ่านฉาก/การเดินทาง: ลดเทิร์นสถานะ (เหมือน endTurn) → ฮุคจบเทิร์น → ขึ้นเทิร์นใหม่ (ล้างค่าแสดงผลรอบ)
function passTurn() {
  for (const p of Object.values(engine.players)) {
    for (const k of Object.keys(p.statuses)) {
      if (k === 'hburn' || k === 'hbleed') continue;
      p.statuses[k]--;
      if (p.statuses[k] <= 0) { delete p.statuses[k]; delete p.statusAmt[k]; }
    }
    p.armor = Math.min(p.armor, engine.maxArmorOf(p));
  }
  hk.onEndTurn(engine);
  engine.setRoundNumber(engine.roundNumber + 1);
  for (const p of Object.values(engine.players)) {
    p.dmgHp = 0; p.dmgArmor = 0; p.wasAttacked = false; p.skillUsedRound = false;
    hk.onRoundStartTick(engine, p);
  }
}
const flush = (t, ms = 30000) => { for (let i = 0; i < ms / 100; i++) t.mock.timers.tick(100); };

const saved = {
  triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash,
  notifyTransform: engine.notifyTransform, sfx: engine.sfx, boardFx: engine.boardFx,
};
const calls = { cut: [], fx: [] };
test.before(() => {
  engine.triggerCutscene = (p, key) => calls.cut.push(key);
  engine.queueCutscene = () => {};
  engine.skillFlash = () => {};
  engine.notifyTransform = () => {};
  engine.sfx = () => {};
  engine.boardFx = (event, payload) => calls.fx.push({ event, payload });
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.beforeEach(() => { for (const k of Object.keys(calls)) calls[k] = []; });
test.afterEach(() => { Math.random = realRandom; engine.setGameMode('ffa'); engine.setCycleShift(0); engine.clearPhaseTimer(); });

test('ข้อมูล: ระดับกลาง · เลือด 7 เกราะ 3 · เดิน 4 ตีประชิด · UltraLive 0 · Ginga 4 · Cross Shoot 4 แนว 5×1 · คลิปลงทะเบียนครบ', () => {
  const ch = CHAR_BY_ID.raido_hikaru;
  assert.equal(ch.difficulty, 'medium');
  assert.equal(ch.mov, 4);
  assert.deepEqual(ch.range, [1, 1]);
  assert.equal(ch.basic.cost, 0);
  assert.equal(ch.secondary.cost, 4);
  assert.equal(ch.ultimate.cost, 4);
  assert.deepEqual(ch.ultimate.area, { kind: 'line', len: 5, width: 1, hostile: true });
  for (const key of [...Object.values(hk.FORMS).map((f) => f.cut), ...Object.values(hk.CUT)]) {
    assert.ok(TRANSFORMS[key] && TRANSFORMS[key].video, `คลิป ${key}`);
  }
  const P = setup([['H', 'raido_hikaru', 1, 5], ['B', 'dummy', 8, 5]]);
  assert.equal(P.H.hp, 7);
  assert.equal(P.H.armor, 3);
  assert.equal(P.H.hikaru.form, null);
  const v = view('H', 'H');
  assert.equal(v.hikaru.forms.length, 7, '6 ร่าง + คืนร่าง');
  assert.equal(v.hikaru.forms[6].key, hk.NORMAL);
  assert.equal(v.hikaru.forms[6].locked, true, 'ร่างปกติอยู่แล้ว คืนร่างไม่ได้');
  assert.equal(v.lane, false);
});

test('UltraLive: เลือกร่าง 0 แต้ม · ไม่กินโควตา · ล็อกการเดิน · เทิร์นละ 1 ครั้ง · คลิปครั้งแรกของแต่ละร่าง · คืนร่าง · ร่างผิด/ร่างเดิมกดไม่ได้', () => {
  const P = setup([['H', 'raido_hikaru', 1, 5], ['B', 'dummy', 8, 5]]);
  engine.setActor('H');
  form('H', 'nope');
  assert.equal(P.H.hikaru.form, null, 'ร่างที่ไม่มี = ไม่เกิดอะไร');
  assert.equal(engine.action.locked, false, 'กดไม่ผ่าน = ยังเดินได้');
  form('H', 'thunder');
  assert.equal(P.H.hikaru.form, 'thunder');
  assert.equal(P.H.skillPoints, 8);
  assert.equal(P.H.skillUsedRound, false);
  assert.equal(engine.action.locked, true);
  assert.deepEqual(calls.cut, ['hkThunder']);
  assert.equal(engine.displayImg(P.H), hk.FORMS.thunder.img);
  form('H', 'kemur');
  assert.equal(P.H.hikaru.form, 'thunder', 'เทิร์นละ 1 ครั้ง');
  assert.equal(view('H', 'H').skillLocks.basic.locked, true);
  passTurn();
  engine.setActor('H');
  form('H', 'thunder');
  assert.equal(P.H.hikaru.formRound, 1, 'ร่างเดิมกดไม่ได้');
  form('H', hk.NORMAL);
  assert.equal(P.H.hikaru.form, null);
  assert.equal(engine.displayImg(P.H), P.H.img);
  passTurn();
  engine.setActor('H');
  form('H', hk.NORMAL);
  assert.equal(P.H.hikaru.formRound, 2, 'ร่างปกติอยู่แล้ว คืนร่างไม่ได้');
  P.H.skillUsedRound = true;
  form('H', 'pandon');
  assert.equal(P.H.hikaru.form, 'pandon', 'ใช้โควตาไปแล้วก็ยังเปลี่ยนร่างได้');
});

test('ทุกร่าง: เกราะสูงสุด +2 · เข้าร่างฟื้นเกราะ 2 (รอ 5 เทิร์นถึงฟื้นอีก) · คืนร่างตัดเกราะเกินเพดาน', () => {
  const P = setup([['H', 'raido_hikaru', 1, 5], ['B', 'dummy', 8, 5]]);
  P.H.armor = 1;
  engine.setActor('H');
  form('H', 'doragory');
  assert.equal(engine.maxArmorOf(P.H), 5);
  assert.equal(P.H.armor, 3, 'ฟื้นเกราะ 2');
  assert.equal(view('H', 'H').hikaru.armorCd, 5);
  passTurn();
  engine.setActor('H');
  form('H', 'pandon');
  assert.equal(P.H.armor, 3, 'ยังไม่ครบ 5 เทิร์น = ไม่ฟื้นเกราะ');
  P.H.armor = 5;
  passTurn();
  engine.setActor('H');
  form('H', hk.NORMAL);
  assert.equal(P.H.armor, 3, 'คืนร่าง = ตัดเกราะส่วนเกิน');
  assert.equal(engine.maxArmorOf(P.H), 3);
  engine.setRoundNumber(6);
  engine.setActor('H');
  P.H.armor = 1;
  form('H', 'thunder');
  assert.equal(P.H.armor, 3, 'ครบ 5 เทิร์น ฟื้นได้อีก');
});

test('ทุกร่าง: เกราะลดเท่าไร ฟื้นพลังชีวิตเท่านั้น (ทุกแบบที่ทำเกราะลด) · ร่างปกติไม่ฟื้น', () => {
  const P = setup([['H', 'raido_hikaru', 1, 5], ['B', 'dummy', 8, 5]]);
  P.H.hp = 3;
  engine.dealMixed(P.H, 2);
  assert.equal(P.H.armor, 1);
  assert.equal(P.H.hp, 3, 'ร่างปกติไม่ฟื้น');
  engine.setActor('H');
  form('H', 'kemur');
  const armor = P.H.armor;
  engine.dealMixed(P.H, 2);
  assert.equal(P.H.armor, armor - 2);
  assert.equal(P.H.hp, 5, 'เกราะลด 2 = ฟื้น 2');
  engine.dealArmorOnly(P.H, 1);
  assert.equal(P.H.hp, 6);
  engine.dealDirect(P.H, 1);
  assert.equal(P.H.hp, 5, 'ดาเมจทะลุเกราะ (เกราะไม่ลด) ไม่ฟื้น');
});

test('แบล็คคิง: ตีปกติแนวตรง 1×3 โดนทุกศัตรูในแนว · เป้านอกแนว (เฉียง) ตีไม่ได้ · ไม่โดนเพื่อนร่วมทีม', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  Math.random = () => 0.99;
  let P = setup([['H', 'raido_hikaru', 1, 5], ['B', 'dummy', 2, 5], ['C', 'dummy', 4, 5], ['D', 'dummy', 5, 5], ['E', 'dummy', 2, 6]]);
  P.H.hikaru.form = 'blackking';
  assert.deepEqual(engine.rangeOf(P.H), [1, 3]);
  engine.setActor('H');
  assert.equal(view('H', 'H').lane, true);
  assert.equal(engine.attackTarget('H', 'E'), false, 'เฉียง = นอกแนว');
  assert.equal(engine.attackTarget('H', 'C'), true, 'ห่าง 3 ในแนว');
  assert.equal(vit(P.B), 9, 'คนหน้าในแนวโดนด้วย');
  assert.equal(vit(P.C), 9);
  assert.equal(vit(P.D), 10, 'เกินระยะ 3 ไม่โดน');
  assert.equal(vit(P.E), 10);
  assert.deepEqual(engine.lastAttack.extra.map((e) => e.targetId), ['B']);
  assert.equal(engine.lastAttack.byLane.length, 3);
  assert.equal(engine.lastAttack.byStyle, 'hkBlack');
  flush(t, 8000);
  // โหมดทีม: เพื่อนในแนวไม่โดน
  P = setup([['H', 'raido_hikaru', 1, 5, 'A'], ['F', 'dummy', 2, 5, 'A'], ['C', 'dummy', 3, 5, 'B'], ['G', 'dummy', 12, 12, 'B']], 'duo');
  P.H.hikaru.form = 'blackking';
  engine.setActor('H');
  assert.equal(engine.attackTarget('H', 'C'), true);
  assert.equal(vit(P.F), 10);
  assert.equal(vit(P.C), 9);
  flush(t, 8000);
});

test('ทันเดอร์/เคมู/แพนด้อน/ดอรากอรี่: ตีปกติติดช็อต · พิษร้าย · ลุกไหม้ 1 · เลือดไหล 1 · แพนด้อนระยะ 3 แมนฮัตตัน · ต้านสถานะกันได้', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  Math.random = () => 0.99;
  // สถานะที่ติด (อ่านก่อนจบตา — จบเทิร์นลดไป 1 = ช็อต/พิษมีผลเต็ม 1 เทิร์นถัดไป)
  const hitWith = (key, bx, by) => {
    const P = setup([['H', 'raido_hikaru', 1, 5], ['B', 'dummy', bx, by]]);
    P.H.hikaru.form = key;
    engine.setActor('H');
    assert.equal(engine.attackTarget('H', 'B'), true, key);
    const out = { ...P.B.statuses, style: engine.lastAttack.byStyle };
    flush(t, 8000);
    return out;
  };
  let S = hitWith('thunder', 2, 5);
  assert.equal(S.shock, 2);
  assert.equal(S.style, 'hkThunder');
  S = hitWith('kemur', 2, 5);
  assert.equal(S.poison, 2);
  S = hitWith('pandon', 2, 7);
  assert.equal(S.hburn, 1, 'ห่าง 3 (เฉียง) ตีได้');
  S = hitWith('doragory', 2, 5);
  assert.equal(S.hbleed, 1);
  const P = setup([['H', 'raido_hikaru', 1, 5], ['B', 'dummy', 2, 5]]);
  P.H.hikaru.form = 'thunder';
  P.B.statuses.resist = 2;
  engine.setActor('H');
  engine.attackTarget('H', 'B');
  assert.equal(P.B.statuses.shock, undefined);
  flush(t, 8000);
});

test('มนุษย์ดาวเคมู: ไม่ถูกโจมตี/ไม่เสียหาย 2 เทิร์นติด → ล่องหน 1 เทิร์น · ดาเมจก่อนเข้าร่างไม่นับ · โดนแล้วนับใหม่ · ตีแล้วปรากฏตัว', () => {
  const P = setup([['H', 'raido_hikaru', 1, 5], ['B', 'dummy', 8, 5]]);
  P.H.wasAttacked = true; P.H.dmgArmor = 1; // โดนก่อนเข้าร่างในเทิร์นนี้
  engine.setActor('H');
  form('H', 'kemur');
  passTurn();
  assert.equal(P.H.hikaru.kemurCalm, 1, 'เทิร์นที่เข้าร่างนับได้');
  // เทิร์น 2 โดนตี = นับใหม่
  P.H.wasAttacked = true;
  passTurn();
  assert.equal(P.H.hikaru.kemurCalm, 0);
  passTurn();
  assert.equal(P.H.hikaru.hidden, false);
  passTurn();
  assert.equal(P.H.hikaru.hidden, true, '2 เทิร์นติด = ล่องหนเทิร์นหน้า');
  assert.equal(view('B', 'H').pos, null, 'ศัตรูมองไม่เห็น');
  engine.setActor('B');
  assert.equal(engine.attackTarget('B', 'H'), false);
  passTurn();
  assert.equal(P.H.hikaru.hidden, false, 'ล่องหนแค่ 1 เทิร์น');
  // ล่องหนแล้วตีออกไป = ปรากฏตัว
  P.H.hikaru.hidden = true;
  engine.setActor('H');
  P.B.pos = { x: P.H.pos.x + engine.sizeOf(P.H), y: P.H.pos.y }; // ติดขอบขวาของตัว (ร่างเคมูตัว 3×3)
  engine.attackTarget('H', 'B');
  assert.equal(P.H.hikaru.hidden, false);
  engine.clearPhaseTimer();
});

test('Ultraman Tiga: พลังโจมตี +1 · แม่นยำ · 3 เทิร์นแล้วคืนร่างเอง · คูลดาวน์ 5 เทิร์นหลังร่างจบ · ออกก่อนเวลาก็เริ่มคูลดาวน์', () => {
  const P = setup([['H', 'raido_hikaru', 1, 5], ['B', 'dummy', 2, 5]]);
  engine.setActor('H');
  form('H', 'tiga');
  assert.equal(P.H.statuses.hikaruTiga, 3);
  assert.ok(engine.accurateActive(P.H));
  assert.equal(engine.attackPowerAgainst(P.H, P.B), 2);
  passTurn(); passTurn();
  assert.equal(P.H.hikaru.form, 'tiga');
  passTurn();
  assert.equal(P.H.hikaru.form, null, 'ครบ 3 เทิร์น คืนร่างเอง');
  assert.equal(P.H.statuses.accurate, undefined, 'ถอดแม่นยำ');
  assert.equal(engine.maxArmorOf(P.H), 3);
  const r = engine.roundNumber;
  assert.equal(view('H', 'H').hikaru.tigaCd, 5);
  engine.setActor('H');
  form('H', 'tiga');
  assert.equal(P.H.hikaru.form, null, 'ติดคูลดาวน์');
  engine.setRoundNumber(r + 5);
  engine.setActor('H');
  P.H.statuses.accurate = 5; // แม่นยำจากที่อื่นก่อนเข้าร่าง
  form('H', 'tiga');
  assert.equal(P.H.hikaru.form, 'tiga', 'ครบ 5 เทิร์นเรียกได้');
  assert.equal(P.H.statuses.accurate, 5);
  // ออกก่อนเวลา (เปลี่ยนร่าง) = คูลดาวน์เริ่มเลย · แม่นยำที่มีอยู่ก่อนเข้าร่างคงไว้
  passTurn();
  engine.setActor('H');
  form('H', 'thunder');
  assert.equal(P.H.statuses.hikaruTiga, undefined);
  assert.equal(P.H.statuses.accurate, 4, 'แม่นยำเดิมยังเหลือ');
  assert.equal(view('H', 'H').hikaru.tigaCd, 6);
});

test('Ultraman Ginga: 4 แต้ม · ร่างปกติเท่านั้น · ตัว 3×3 เดิน 3 · ตีปกติ +1 ทั้งด้าน 1×3 · 5 เทิร์นแล้วหดกลับ · คูลดาวน์ 3 · UltraLive ใช้ไม่ได้ระหว่างกิงกะ', () => {
  const P = setup([['H', 'raido_hikaru', 1, 8], ['B', 'dummy', 12, 2]]);
  engine.setActor('H');
  form('H', 'thunder');
  engine.useSkill('H', 'secondary', []);
  assert.equal(P.H.hikaru.ginga, false, 'อยู่ร่าง UltraLive ใช้ไม่ได้');
  assert.equal(P.H.skillPoints, 8);
  passTurn();
  engine.setActor('H');
  form('H', hk.NORMAL);
  engine.useSkill('H', 'secondary', []);
  assert.equal(P.H.hikaru.ginga, true);
  assert.equal(P.H.skillPoints, 4);
  assert.deepEqual(calls.cut.slice(-1), ['hkGinga']);
  assert.equal(engine.sizeOf(P.H), 3);
  assert.equal(engine.baseMovOf(P.H), 3);
  assert.equal(engine.displayImg(P.H), hk.IMG.ginga);
  assert.ok(calls.fx.some((f) => f.event === 'growFx'));
  const v = view('H', 'H');
  assert.equal(v.lane, 'face');
  assert.equal(v.skillLocks.basic.locked, true);
  assert.equal(v.skillLocks.ultimate.locked, false);
  passTurn();
  engine.setActor('H');
  form('H', 'kemur');
  assert.equal(P.H.hikaru.form, null, 'กิงกะใช้ UltraLive ไม่ได้');
  const B = P.B;
  B.pos = { x: P.H.pos.x + 3, y: P.H.pos.y + 1 };
  assert.equal(engine.attackPowerAgainst(P.H, B), 2);
  passTurn(); passTurn(); passTurn();
  assert.equal(P.H.hikaru.ginga, true, 'ยังอยู่ 5 เทิร์น');
  passTurn();
  assert.equal(P.H.hikaru.ginga, false);
  assert.equal(engine.sizeOf(P.H), 1);
  assert.equal(view('H', 'H').hikaru.gingaCd, 3);
  engine.setActor('H');
  P.H.skillPoints = 8;
  engine.useSkill('H', 'secondary', []);
  assert.equal(P.H.hikaru.ginga, false, 'ติดคูลดาวน์');
  engine.setRoundNumber(engine.roundNumber + 3);
  engine.setActor('H');
  engine.useSkill('H', 'secondary', []);
  assert.equal(P.H.hikaru.ginga, true);
});

test('กิงกะ: ตีแค่ช่องติดตัว · โดนศัตรูทุกคนที่ติดด้านที่ตี (1×3) · ห่าง 2 ช่องตีไม่ได้', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  Math.random = () => 0.99;
  const P = setup([['H', 'raido_hikaru', 1, 8], ['B', 'dummy', 12, 1], ['C', 'dummy', 12, 2], ['D', 'dummy', 12, 3], ['E', 'dummy', 13, 13]]);
  engine.setActor('H');
  engine.useSkill('H', 'secondary', []);
  assert.equal(engine.sizeOf(P.H), 3);
  assert.deepEqual(engine.rangeOf(P.H), [1, 1]);
  const box = { ...P.H.pos };
  P.B.pos = { x: box.x + 3, y: box.y };     // ติดด้านขวา แถวบน
  P.C.pos = { x: box.x + 3, y: box.y + 2 }; // ติดด้านขวา แถวล่าง
  P.D.pos = { x: box.x + 4, y: box.y + 1 }; // ห่าง 2 ช่อง
  P.E.pos = { x: box.x + 1, y: box.y + 3 }; // ติดด้านล่าง (คนละด้าน)
  engine.setActor('H');
  engine.action.locked = true;
  assert.equal(engine.attackTarget('H', 'D'), false, 'ห่าง 2 ช่องตีไม่ได้');
  assert.equal(engine.attackTarget('H', 'B'), true);
  assert.equal(vit(P.B), 8, 'กิงกะ +1');
  assert.equal(vit(P.C), 8, 'ติดด้านเดียวกันโดนด้วย');
  assert.equal(vit(P.D), 10);
  assert.equal(vit(P.E), 10, 'คนละด้านไม่โดน');
  assert.equal(engine.lastAttack.byStyle, 'hkGinga');
  assert.equal(engine.lastAttack.byLane.length, 3);
  flush(t, 8000);
});

test('ร่าง UltraLive ตัว 3×3 (เดิน 3 · เดินพังสิ่งกีดขวาง) · เปลี่ยนร่างต่อร่างขนาดเดิม · คืนร่าง / Tiga หมดเวลา = กลับ 1×1', () => {
  const P = setup([['H', 'raido_hikaru', 1, 8], ['B', 'dummy', 12, 1]]);
  engine.setActor('H');
  form('H', 'pandon');
  assert.equal(engine.sizeOf(P.H), 3);
  assert.equal(engine.baseMovOf(P.H), 3);
  assert.equal(view('H', 'H').smash, true);
  passTurn();
  engine.setActor('H');
  form('H', 'tiga');
  assert.equal(engine.sizeOf(P.H), 3, 'เปลี่ยนร่างต่อร่าง');
  passTurn(); passTurn(); passTurn();
  assert.equal(P.H.hikaru.form, null);
  assert.equal(engine.sizeOf(P.H), 1, 'Tiga หมดเวลา = ตัวเล็ก');
  assert.equal(engine.baseMovOf(P.H), 4);
  engine.setActor('H');
  form('H', 'doragory');
  assert.equal(engine.sizeOf(P.H), 3);
  passTurn();
  engine.setActor('H');
  form('H', hk.NORMAL);
  assert.equal(engine.sizeOf(P.H), 1, 'คืนร่าง = ตัวเล็ก');
});

test('Ginga Cross Shoot: ร่างกิงกะเท่านั้น · แนว 5×1 จากกลางด้านหน้าตัว · ดาเมจ 2 หลบไม่ได้ + ลุกไหม้ 2 · ไม่โดนเพื่อน · ลำแสงก่อนดาเมจ', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  let P = setup([['H', 'raido_hikaru', 1, 5], ['B', 'dummy', 3, 5]]);
  engine.setActor('H');
  engine.useSkill('H', 'ultimate', [], { dir: 'right' });
  assert.equal(P.H.skillPoints, 8, 'ร่างปกติใช้ไม่ได้');
  P = setup([['H', 'raido_hikaru', 0, 7, 'A'], ['B', 'dummy', 5, 8, 'B'], ['C', 'dummy', 7, 8, 'B'], ['F', 'dummy', 4, 8, 'A'], ['G', 'dummy', 9, 8, 'B']], 'duo');
  P.H.hikaru.ginga = true; P.H.statuses.hikaruGinga = 3; P.H.boardSize = 3;
  P.B.statuses.evade = 1; P.B.statusAmt.evade = 100;
  engine.setActor('H');
  engine.useSkill('H', 'ultimate', [], { dir: 'right' });
  assert.equal(P.H.skillPoints, 4);
  assert.deepEqual(calls.cut, ['hkCross']);
  const beam = calls.fx.find((f) => f.event === 'hikaruBeam');
  assert.ok(beam, 'ลำแสงบนกระดาน');
  assert.equal(beam.payload.kind, 'cross');
  assert.deepEqual(beam.payload.tiles.map((c) => c.x), [3, 4, 5, 6, 7]);
  assert.ok(beam.payload.tiles.every((c) => c.y === 8), 'กลางด้านหน้าตัว');
  assert.equal(vit(P.B), 10, 'ดาเมจลงหลังลำแสงวิ่งถึง');
  flush(t, 5000);
  assert.equal(vit(P.B), 8, 'หลบไม่ได้');
  assert.equal(P.B.statuses.hburn, 2);
  assert.equal(vit(P.C), 8);
  assert.equal(vit(P.F), 10, 'ไม่โดนเพื่อน');
  assert.equal(vit(P.G), 10, 'เกินแนว 5 ไม่โดน');
  assert.equal(engine.gameState, 'ACTION', 'ไม่จบตา');
});

test('Strium Brace: จบเทิร์นในกิงกะกลางวันครบ 10 = สโตเรี่ยมทันที (กลางคืน/ห่วงเวลาไม่นับ) · กิงกะครั้งต่อไปเป็นสโตเรี่ยม · +2 และติดลุกไหม้', () => {
  const P = setup([['H', 'raido_hikaru', 1, 8], ['B', 'dummy', 12, 2]]);
  const s = P.H.hikaru;
  s.ginga = true; P.H.statuses.hikaruGinga = 99; P.H.boardSize = 3;
  engine.setRoundNumber(4); // กลางคืน (เทิร์น 4–6)
  hk.onEndTurn(engine);
  assert.equal(s.brace, 0, 'กลางคืนไม่นับ');
  engine.setRoundNumber(1);
  for (let i = 0; i < 9; i++) hk.onEndTurn(engine);
  assert.equal(s.brace, 9);
  assert.equal(s.strium, false);
  hk.onEndTurn(engine);
  assert.equal(s.strium, true);
  assert.ok(calls.cut.includes('hkStrium'), 'คลิปสโตเรี่ยม');
  assert.equal(engine.displayImg(P.H), hk.IMG.strium);
  P.B.pos = { x: P.H.pos.x + 3, y: P.H.pos.y + 1 };
  assert.equal(engine.attackPowerAgainst(P.H, P.B), 3, 'กิงกะ +1 + สโตเรี่ยม +1');
  assert.deepEqual(hk.onStrikeLanded(engine, P.H, P.B), ['กิงกะสโตเรี่ยม — ลุกไหม้ +1']);
  const v = view('H', 'H');
  assert.equal(v.character.ultimate.name, 'Strium Ray');
  assert.equal(v.character.ultimate.cost, 6);
  assert.deepEqual(v.character.ultimate.area, { kind: 'line', len: 5, width: 3, hostile: true });
  assert.equal(v.character.secondary.img, hk.IMG.skill2Strium);
  // หมดกิงกะ → กดใหม่ = สโตเรี่ยมเลย
  s.ginga = false; delete P.H.statuses.hikaruGinga; P.H.boardSize = 1;
  engine.setActor('H');
  engine.useSkill('H', 'secondary', []);
  assert.ok(hk.striumOn(P.H));
  assert.deepEqual(calls.cut.slice(-1), ['hkStrium']);
});

test('Strium Ray: 6 แต้ม · แนว 5×3 · ดาเมจ 2 + ลุกไหม้ 3 · ผลักไปสุดปลายลำแสงในคอลัมน์ตัวเอง · ขวาง = หยุดก่อน · ตัวใหญ่ไม่ถูกผลัก', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  // ฮิคารุ 3×3 ที่ (0,6) → หน้าด้านขวาคือ x = 3, ลำแสง x 3..7 แถว 6..8 (ปลาย x = 7)
  const P = setup([['H', 'raido_hikaru', 0, 6], ['B', 'dummy', 3, 7], ['C', 'dummy', 4, 8], ['D', 'dummy', 6, 8], ['E', 'dummy', 4, 6]]);
  P.H.hikaru.ginga = true; P.H.hikaru.strium = true; P.H.statuses.hikaruGinga = 3; P.H.boardSize = 3;
  P.E.boardSize = 2; P.E.pos = { x: 4, y: 5 };
  engine.setActor('H');
  engine.useSkill('H', 'ultimate', [], { dir: 'right' });
  assert.equal(P.H.skillPoints, 2);
  assert.deepEqual(calls.cut, ['hkStriumRay']);
  flush(t, 6000);
  assert.equal(vit(P.B), 8);
  assert.equal(P.B.statuses.hburn, 3);
  assert.deepEqual(P.B.pos, { x: 7, y: 7 }, 'ผลักไปสุดปลาย');
  assert.deepEqual(P.D.pos, { x: 7, y: 8 }, 'คนไกลสุดผลักก่อน');
  assert.deepEqual(P.C.pos, { x: 6, y: 8 }, 'ขวางอยู่ = หยุดก่อนถึง');
  assert.deepEqual(P.E.pos, { x: 4, y: 5 }, 'ตัวใหญ่ไม่ถูกผลัก');
  assert.ok(calls.fx.some((f) => f.event === 'hikaruPush'));
  assert.equal(engine.gameState, 'ACTION');
});

test('เสียงตีปกติ: ตามร่าง / กิงกะ / สโตเรี่ยม · ร่างปกติใช้เสียงกลาง (การ์ดฉากตี byAttackSound)', () => {
  const P = setup([['H', 'raido_hikaru', 1, 5], ['B', 'dummy', 8, 5]]);
  assert.equal(hk.attackSound(P.H), undefined);
  for (const key of hk.FORM_KEYS) { P.H.hikaru.form = key; assert.equal(hk.attackSound(P.H), hk.FORMS[key].sfx); }
  P.H.hikaru.form = null; P.H.hikaru.ginga = true;
  assert.equal(hk.attackSound(P.H), 'hk_ginga');
  P.H.hikaru.strium = true;
  assert.equal(hk.attackSound(P.H), 'hk_strium');
});

test('กระดาน (ฟังก์ชันล้วน): lineTiles ตัวใหญ่ออกจากกลางด้านหน้า · laneOf หาแนวที่เป้าอยู่ (ตัวใหญ่ = ทุกแถวที่ตัวกิน)', () => {
  const map = Board.mapOf(1);
  assert.deepEqual(Board.lineTiles(map, 2, 2, 'up', 2, 1, 3), [{ x: 3, y: 1 }, { x: 3, y: 0 }]);
  assert.deepEqual(Board.lineTiles(map, 2, 2, 'right', 1, 3, 3).map((c) => `${c.x},${c.y}`), ['5,2', '5,3', '5,4']);
  assert.deepEqual(Board.lineTiles(map, 2, 5, 'left', 2, 1), [{ x: 1, y: 5 }, { x: 0, y: 5 }], 'ตัวเล็กเหมือนเดิม');
  const lane = Board.laneOf(map, 2, 2, 3, [1, 3], { x: 7, y: 2, size: 1 });
  assert.equal(lane.dir, 'right');
  assert.deepEqual(lane.tiles.map((c) => c.x), [5, 6, 7]);
  assert.equal(Board.laneOf(map, 2, 2, 3, [1, 3], { x: 8, y: 2, size: 1 }), null, 'เกินระยะ');
  assert.equal(Board.laneOf(map, 2, 5, 1, [1, 3], { x: 3, y: 6, size: 1 }), null, 'เฉียงไม่อยู่ในแนว');
});

test('จบเทิร์นจริง (engine.endTurn): ฮุคต่อสายแล้ว — Tiga ครบเวลาคืนร่างเอง', () => {
  const P = setup([['H', 'raido_hikaru', 1, 5], ['B', 'dummy', 8, 5]]);
  Math.random = () => 0.99;
  engine.setActor('H');
  form('H', 'tiga');
  P.H.statuses.hikaruTiga = 1;
  engine.endTurn();
  engine.clearPhaseTimer();
  assert.equal(P.H.hikaru.form, null);
});
