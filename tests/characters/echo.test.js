// เจ้าหญิง Echo (พิเศษ) — ไดอารี่ความทรงจำ (เปลี่ยนเป็นสกิลของตัวอื่น · คืนร่าง คูลดาวน์ 3) · ราชินีผู้อ่อนโยน
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const echo = require('../../characters/echo.js');
const CHAR_HOOKS = require('../../characters/index');
const view = require('../../server/view.js');
const { CHAR_BY_ID } = require('../../characters.js');

const realRandom = Math.random;
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
  engine.placeOnBoard(1);
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.skillPoints = 8; p.skillUsedRound = false; p.shield = 0;
    p.statuses = {}; p.statusAmt = {};
  }
  return engine.players;
}
const saved = { triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash, boardFx: engine.boardFx };
test.before(() => {
  engine.triggerCutscene = () => {}; engine.queueCutscene = () => {}; engine.skillFlash = () => {}; engine.boardFx = () => {};
});
test.after(() => { Object.assign(engine, saved); Math.random = realRandom; engine.clearPhaseTimer(); });

function actAs(p) {
  engine.setActor(p.id);
}
const pub = (p) => view.buildStateFor(p.id).players.find((q) => q.id === p.id);

test('ค่าพื้นฐาน: พลังชีวิต 7 เกราะ 3 · เดิน 4 ตีประชิด · ไม่มีสกิลรอง/ท่าไม้ตาย', () => {
  const P = setup([['E', 'echo', 1, 5], ['B', 'muimi', 8, 5]]);
  const E = P.E;
  assert.equal(engine.maxHpOf(E), 7);
  assert.equal(engine.maxArmorOf(E), 3);
  assert.equal(engine.baseMovOf(E), 4);
  assert.deepEqual(engine.rangeOf(E), [1, 1]);
  assert.equal(CHAR_BY_ID.echo.secondary, undefined);
  assert.equal(CHAR_BY_ID.echo.ultimate, undefined);
});

test('ไดอารี่: เปลี่ยนเป็นสกิลของตัวที่เลือก · ค่าสถานะ/ภาพยังเป็นของ Echo · ไม่กินโควตา', () => {
  const P = setup([['E', 'echo', 1, 5], ['B', 'muimi', 8, 5]]);
  const E = P.E;
  actAs(E);
  engine.useSkill('E', 'basic', [], { form: 'fern' });
  assert.equal(E.characterId, 'fern');
  assert.equal(E.echoQ.mimic, 'fern');
  assert.equal(E.skillUsedRound, false, 'ไม่นับเป็นการใช้สกิล');
  assert.equal(engine.maxSkillOf(E), 8, 'แต้มสกิลสูงสุดของ Echo ไม่ใช่ Energy 10 ของเฟิร์น');
  assert.equal(engine.maxHpOf(E), 7);
  const me = pub(E);
  assert.equal(me.character.name, CHAR_BY_ID.echo.name);
  assert.equal(me.character.img, CHAR_BY_ID.echo.img);
  assert.equal(me.img, CHAR_BY_ID.echo.img);
  assert.equal(me.character.basic.name, CHAR_BY_ID.fern.basic.name, 'ปุ่มสกิลเป็นของเฟิร์น');
  assert.equal(me.character.passive.name, CHAR_BY_ID.echo.passive.name);
  assert.equal(me.character.passive2.name, CHAR_BY_ID.fern.passive.name);
  assert.ok(me.actions.some((a) => a.key === 'echo:diary'), 'มีปุ่มไดอารี่คืนร่าง');
});

test('ตัวที่ซ้ำไม่ได้และอยู่ในเกมแล้ว เลือกไม่ได้ · ตัวปกติซ้ำได้', () => {
  const P = setup([['E', 'echo', 1, 5], ['B', 'ryougi', 8, 5], ['C', 'muimi', 8, 8]]);
  const E = P.E;
  assert.equal(echo.pickable(engine, E, 'ryougi'), false);
  assert.equal(echo.pickable(engine, E, 'muimi'), true);
  assert.equal(echo.pickable(engine, E, 'kate'), false, 'ระบบคู่เลือกไม่ได้');
  assert.equal(echo.pickable(engine, E, 'echo'), false);
  const book = pub(E).character.basic;
  assert.equal(book.book, true);
  assert.ok(book.choices.find((c) => c.key === 'ryougi').locked);
  assert.ok(!book.choices.find((c) => c.key === 'muimi').locked);
  assert.ok(book.choices.every((c) => c.desc), 'ทุกตัวเลือกมีคำอธิบายตอนชี้');
  actAs(E);
  engine.useSkill('E', 'basic', [], { form: 'ryougi' });
  assert.equal(E.characterId, 'echo', 'กดตัวที่ล็อกไม่ผ่าน');
});

test('คืนร่าง: ตัดผลค้าง · กลับ Echo · คูลดาวน์ 3 เทิร์น', () => {
  const P = setup([['E', 'echo', 1, 5], ['B', 'muimi', 8, 5]]);
  const E = P.E;
  actAs(E);
  engine.useSkill('E', 'basic', [], { form: 'sora_otosumi' });
  assert.equal(E.characterId, 'sora_otosumi');
  // แปลงร่าง My-Th (ผลค้าง) แล้วคืนร่าง = ร่างถูกตัด
  engine.useSkill('E', 'basic', [], {});
  assert.equal(E.sora.myth, true, 'แปลงร่าง My-Th ได้ตามสกิลของโซระ');
  assert.ok(CHAR_HOOKS.echo.queenAction(engine, E, 'echo:diary'));
  assert.equal(E.characterId, 'echo');
  assert.equal(E.echoQ.mimic, null);
  assert.equal(E.sora.myth, false, 'ร่าง My-Th ถูกตัดตอนคืนร่าง');
  const cd = pub(E).skillLocks.basic.cd;
  assert.equal(cd, echo.REVERT_CD);
  engine.useSkill('E', 'basic', [], { form: 'muimi' });
  assert.equal(E.characterId, 'echo', 'ยังติดคูลดาวน์');
  engine.setRoundNumber(engine.roundNumber + echo.REVERT_CD);
  E.skillUsedRound = false;
  engine.useSkill('E', 'basic', [], { form: 'muimi' });
  assert.equal(E.characterId, 'muimi');
});

test('ราชินีผู้อ่อนโยน: ต้นเทิร์นสุ่ม แต้มสกิล/เหรียญ/พลังชีวิต +1 (ทั้งตอนสวมร่าง)', () => {
  const P = setup([['E', 'echo', 1, 5], ['B', 'muimi', 8, 5]]);
  const E = P.E;
  E.skillPoints = 2; E.gold = 0; E.hp = 3;
  Math.random = () => 0.01; CHAR_HOOKS.echo.onRoundStartTick(engine, E); Math.random = realRandom;
  assert.equal(E.skillPoints, 3);
  Math.random = () => 0.5; CHAR_HOOKS.echo.onRoundStartTick(engine, E); Math.random = realRandom;
  assert.equal(E.gold, 1);
  Math.random = () => 0.9; CHAR_HOOKS.echo.onRoundStartTick(engine, E); Math.random = realRandom;
  assert.equal(E.hp, 4);
  actAs(E);
  engine.useSkill('E', 'basic', [], { form: 'muimi' });
  Math.random = () => 0.9; CHAR_HOOKS.echo.onRoundStartTick(engine, E); Math.random = realRandom;
  assert.equal(E.hp, 5, 'ยังทำงานตอนสวมร่าง');
});

test('เริ่มแมตช์ใหม่ = กลับร่าง Echo · สถิติจบเกมนับเป็น Echo', () => {
  const P = setup([['E', 'echo', 1, 5], ['B', 'muimi', 8, 5]]);
  const E = P.E;
  actAs(E);
  engine.useSkill('E', 'basic', [], { form: 'gyro_zeppeli' });
  assert.equal(E.characterId, 'gyro_zeppeli');
  assert.equal(CHAR_HOOKS.echo.statId(E), 'echo');
  engine.startMatch();
  engine.clearPhaseTimer();
  assert.equal(E.characterId, 'echo');
  assert.equal(E.echoQ.mimic, null);
});

test('ตัดผลสกิล (เรียวกิ): ตัดผลของร่างที่สวมก่อน แล้วครั้งถัดไปคืนร่าง + คูลดาวน์', () => {
  const P = setup([['E', 'echo', 1, 5], ['B', 'muimi', 8, 5]]);
  const E = P.E;
  actAs(E);
  engine.useSkill('E', 'basic', [], { form: 'sora_otosumi' });
  engine.useSkill('E', 'basic', [], {});
  assert.equal(E.sora.myth, true);
  const r1 = engine.sever.cut(engine, E);
  assert.equal(r1.key, 'soraMyth');
  assert.equal(E.characterId, 'sora_otosumi', 'ยังสวมร่างอยู่');
  const r2 = engine.sever.cut(engine, E);
  assert.equal(r2.key, 'echoDiary');
  assert.equal(E.characterId, 'echo');
  assert.equal(engine.sever.latest(engine, E), null);
  assert.ok(E.echoQ.readyAt > engine.roundNumber);
});

// ---------- สกิลติดตัวของร่างที่สวมต้องติดมาด้วย (ผู้ใช้ย้ำ 2026-11-10) — ทดสอบผ่านจุดที่ engine เรียกจริง ----------
const attackPhase = require('../../server/phases/attack.js');
const shop = require('../../server/shop.js');
const combat = require('../../server/combat.js');

test('ติดตัวติดมา: โซระ ร่าง My-Th คริติคอล 20% · ทราฟาก้า ลอว์ พลังโจมตี 0', () => {
  const P = setup([['E', 'echo', 1, 5], ['B', 'muimi', 2, 5]]);
  const E = P.E;
  actAs(E);
  engine.useSkill('E', 'basic', [], { form: 'sora_otosumi' });
  engine.useSkill('E', 'basic', [], {}); // แปลงร่าง My-Th
  assert.equal(E.sora.myth, true);
  assert.ok(attackPhase.estimateCritOf(E, P.B) >= 20, 'คริ 20% ของร่าง My-Th');
  echo.revert(engine, E);
  E.echoQ.readyAt = 0; E.skillUsedRound = false;
  engine.useSkill('E', 'basic', [], { form: 'trafalgar_law' });
  assert.equal(engine.attackPowerAgainst(E, P.B), 0, 'ลอว์: พลังโจมตี 0');
});

test('ติดตัวติดมา: ยูกิ มาโคโตะ มิตรภาพ (ไม่ตาย) · กิลกาเมช กระเป๋า 50 ช่อง · เฟิร์น Energy ไม่ฟื้นเอง', () => {
  const P = setup([['E', 'echo', 1, 5], ['B', 'muimi', 8, 5]]);
  const E = P.E;
  actAs(E);
  engine.useSkill('E', 'basic', [], { form: 'yuki_makoto' });
  engine.withEffectSource(P.B, () => { E.hp = 0; engine.instantDeath(E); });
  assert.equal(E.alive, true, 'มิตรภาพ: ไม่ตาย');
  echo.revert(engine, E);
  E.echoQ.readyAt = 0; E.skillUsedRound = false;
  engine.useSkill('E', 'basic', [], { form: 'gilgamesh_fake' });
  assert.equal(shop.bagSlotsOf(E), 50, 'Gate of Babylon: กระเป๋า 50');
  echo.revert(engine, E);
  assert.equal(shop.bagSlotsOf(E), 5, 'คืนร่าง = กระเป๋ากลับ 5');
  E.echoQ.readyAt = 0; E.skillUsedRound = false;
  engine.useSkill('E', 'basic', [], { form: 'fern' });
  E.skillPoints = 2;
  combat.addSkill(E, 1);
  assert.equal(E.skillPoints, 2, 'เฟิร์น: แต้มไม่ฟื้นจากทางอื่น');
});

// ---------- ช่องโกงจาก resetCombat ของร่างที่สวม (ตรวจบัค 2026-11-10) ----------
test('สวมร่างไม่ได้ของฟรี: เฟิร์นไม่เติมแต้มเต็ม · กิลกาเมชไม่แจก 100 เหรียญ', () => {
  const P = setup([['E', 'echo', 1, 5], ['B', 'muimi', 8, 5]]);
  const E = P.E;
  actAs(E);
  E.skillPoints = 1; E.gold = 3;
  engine.useSkill('E', 'basic', [], { form: 'fern' });
  assert.equal(E.skillPoints, 1, 'Energy เต็มของเฟิร์นไม่ติดมา');
  echo.revert(engine, E); E.echoQ.readyAt = 0; E.skillUsedRound = false;
  engine.useSkill('E', 'basic', [], { form: 'gilgamesh_fake' });
  assert.equal(E.gold, 3, 'เหรียญเริ่มเกมของกิลกาเมชไม่ติดมา');
});

test('สวมร่างไม่ล้างผลจากคนอื่น: นกจาบ/ความฝันของโอเบรอน · TIME ของคาซุมะ · สถานะ', () => {
  const P = setup([['E', 'echo', 1, 5], ['B', 'muimi', 8, 5]]);
  const E = P.E;
  actAs(E);
  E.obsLarkStack = 2; E.obsDreamQueue = [5]; E.kazumaTimeCut = 10; E.statuses.poison = 2;
  engine.useSkill('E', 'basic', [], { form: 'oberon_summer' });
  assert.equal(E.obsLarkStack, 2);
  assert.deepEqual(E.obsDreamQueue, [5]);
  echo.revert(engine, E); E.echoQ.readyAt = 0; E.skillUsedRound = false;
  engine.useSkill('E', 'basic', [], { form: 'kensaki_kazuma' });
  assert.equal(E.kazumaTimeCut, 10);
  assert.equal(E.statuses.poison, 2);
});

test('ธนูของโจรุโน่: ได้ครั้งเดียวต่อเกม · คืนร่างแล้วหาย (ถ้ายังไม่ใช้)', () => {
  const P = setup([['E', 'echo', 1, 5], ['B', 'muimi', 8, 5]]);
  const E = P.E;
  actAs(E);
  const arrows = () => E.inventory.filter((it) => it.type === 'giornoArrow').length;
  engine.useSkill('E', 'basic', [], { form: 'giorno_giovanna' });
  assert.equal(arrows(), 1);
  echo.revert(engine, E);
  assert.equal(arrows(), 0, 'คืนร่าง = ธนูหาย');
  E.echoQ.readyAt = 0; E.skillUsedRound = false;
  engine.useSkill('E', 'basic', [], { form: 'giorno_giovanna' });
  assert.equal(arrows(), 0, 'สวมซ้ำไม่ได้ธนูอีก');
});
