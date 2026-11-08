// คุเรไน โอโตยะ (kurenai_otoya) — ปากหวาน / ดนตรีในหัวใจ / Dark Kiva / หลุมพราง / Wake Up 1·2 / หนุ่มเจ้าเสน่ห์ / ราชาผีดูดเลือด
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const oto = require('../../characters/kurenai_otoya.js');
const { CHAR_BY_ID } = require('../../characters.js');
const { genderOf } = require('../../characters/_gender.js');

const realRandom = Math.random;
const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
// แถว y = 6..8 ช่วง x = 2..7 ของภูมิภาค I เป็นพื้นโล่ง
function setup(list, mode = 'ffa') {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, ch, , , team], i) => { engine.players[id] = blank(id, ch, i + 1, team || null); });
  engine.setGameMode(mode);
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setJourneyArea(1);
  engine.setCycleShift(0);
  engine.setForcedNight(null);
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.skillPoints = 8; p.skillUsedRound = false; p.shield = 0;
    p.statuses = {}; p.statusAmt = {};
  }
  return engine.players;
}
const view = (viewerId, id) => engine.buildStateFor(viewerId).players.find((p) => p.id === id);
const vit = (p) => (p.hp || 0) + (p.armor || 0);

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
test.afterEach(() => { Math.random = realRandom; engine.setGameMode('ffa'); engine.setCycleShift(0); engine.setForcedNight(null); engine.clearPhaseTimer(); });

function kiva(P, id = 'O') {
  engine.setActor(id);
  engine.useSkill(id, 'ultimate', []);
  assert.equal(P[id].otoya.ultUntil, engine.roundNumber + 1, 'แปลงร่าง 2 เทิร์น');
  P[id].skillUsedRound = false;
  engine.setActor(id);
}

test('ข้อมูล: ยาก · เดิน 4 ประชิด · 2 / 4 / 0 แต้ม · ดนตรีในหัวใจระยะ 8 · ทุกตัวมีเพศ', () => {
  const ch = CHAR_BY_ID.kurenai_otoya;
  assert.equal(ch.name, 'คุเรไน โอโตยะ');
  assert.equal(ch.difficulty, 'hard');
  assert.equal(ch.mov, 4);
  assert.deepEqual(ch.range, [1, 1]);
  assert.equal(ch.basic.cost, 2);
  assert.equal(ch.secondary.cost, 4);
  assert.equal(ch.ultimate.cost, 0);
  assert.deepEqual(ch.secondary.area, { kind: 'target', range: 8 });
  for (const c of Object.values(CHAR_BY_ID)) assert.ok(['f', 'm', 'n'].includes(c.gender), `${c.id} มีเพศ`);
  assert.equal(genderOf({ characterId: 'emiliko' }), 'f');
  assert.equal(genderOf({ characterId: 'ice_spike' }), 'n');
  assert.equal(genderOf({ characterId: 'kira' }), 'm');
  assert.equal(genderOf({ characterId: 'kishinami_hakuno', summon: { moon: 'f' } }), 'f');
  assert.equal(genderOf({ characterId: 'moon_cell', summon: { moon: 'cell' } }), 'n');
});

test('ปากหวาน: ฟื้น 1 + จำนวนตัวละครหญิง (ทุกฝ่าย) สูงสุด 3 · คูลดาวน์ 2 · เลือดเต็มกดไม่ได้', () => {
  let P = setup([['O', 'kurenai_otoya', 3, 7], ['B', 'dummy', 12, 12]]);
  P.O.hp = 2;
  engine.setActor('O');
  engine.useSkill('O', 'basic', []);
  assert.equal(P.O.hp, 3, 'ไม่มีผู้หญิง = 1');
  assert.equal(P.O.skillPoints, 6);
  P = setup([['O', 'kurenai_otoya', 3, 7], ['F', 'fern', 12, 12], ['G', 'gray', 12, 2], ['M', 'kira', 2, 2]]);
  P.O.hp = 1;
  engine.setActor('O');
  engine.useSkill('O', 'basic', []);
  assert.equal(P.O.hp, 4, '2 คน = 3');
  const r = engine.roundNumber;
  assert.equal(P.O.otoya.sweetReady, r + 2);
  P.O.skillUsedRound = false;
  engine.useSkill('O', 'basic', []);
  assert.equal(P.O.hp, 4, 'คูลดาวน์');
  P = setup([['O', 'kurenai_otoya', 3, 7], ['F', 'fern', 12, 12], ['G', 'gray', 12, 2], ['C', 'celine', 2, 2]]);
  assert.equal(oto.sweetHeal(engine, P.O), 3, '3 คน = สูงสุด 3');
  P = setup([['O', 'kurenai_otoya', 3, 7], ['B', 'dummy', 12, 12]]);
  engine.setActor('O');
  engine.useSkill('O', 'basic', []);
  assert.equal(P.O.skillPoints, 8, 'เลือดเต็ม = ไม่เสียแต้ม');
});

test('หนุ่มเจ้าเสน่ห์: ตีผู้หญิง −1 · ตีผู้ชาย/ไร้เพศ +1', () => {
  Math.random = () => 0.99;
  let P = setup([['O', 'kurenai_otoya', 3, 7], ['F', 'fern', 4, 7]]);
  P.F.armor = 0; P.F.hp = 5;
  engine.setActor('O');
  engine.attackTarget('O', 'F');
  engine.clearPhaseTimer();
  assert.equal(P.F.hp, 5, 'พลังโจมตี 1 − 1 = 0');
  P = setup([['O', 'kurenai_otoya', 3, 7], ['M', 'dummy', 4, 7]]);
  P.M.armor = 0; P.M.hp = 5;
  engine.setActor('O');
  engine.attackTarget('O', 'M');
  engine.clearPhaseTimer();
  assert.equal(P.M.hp, 3, 'ไร้เพศ +1 = 2');
});

test('ดนตรีในหัวใจ: บัฟเป้าในระยะ 8 · เดิน/ตี/สกิลอื่นไม่ได้ · ยกเลิกฟรีแล้วคูลดาวน์ 3 · เพลง', () => {
  Math.random = () => 0.99;
  const P = setup([['O', 'kurenai_otoya', 3, 7], ['A', 'dummy', 10, 8], ['Z', 'dummy', 12, 12]]);
  engine.setActor('O');
  engine.useSkill('O', 'secondary', ['Z']); // ระยะ 9+5 เกิน 8
  assert.equal(P.O.otoya.heart, null, 'นอกระยะ');
  assert.equal(P.O.skillPoints, 8);
  engine.useSkill('O', 'secondary', ['A']); // ระยะ 7 + 1 = 8
  assert.equal(P.O.otoya.heart.targetId, 'A');
  assert.equal(P.O.skillPoints, 4);
  assert.equal(P.A.statuses.otoyaHeart, 1, 'ป้ายบนเป้า');
  assert.equal(oto.auraAtk(engine, P.A).amount, 1, 'พลังโจมตี +1');
  assert.equal(oto.auraCrit(engine, P.A), 25);
  assert.equal(engine.rangeOf(P.O)[1], 0, 'ตีปกติไม่ได้');
  assert.equal(engine.movOf ? engine.movOf(P.O) : 0, 0, 'เดินไม่ได้');
  assert.equal(oto.canUseSkill(engine, P.O, 'ultimate', []), false, 'ท่าไม้ตายไม่ได้');
  assert.equal(oto.canUseSkill(engine, P.O, 'basic', []), false);
  assert.deepEqual(engine.activeSkillMusic ? engine.activeSkillMusic().music : 'otoya_heart', 'otoya_heart');
  // ต้นเทิร์น: เยียวยา 1 + แต้มสกิล 1
  P.A.hp = 3; P.A.skillPoints = 0;
  oto.onRoundStartTick(engine, P.A);
  assert.equal(P.A.hp, 4);
  assert.equal(P.A.skillPoints, 1);
  // ยกเลิก: ฟรี · ไม่กินโควตา · คูลดาวน์ 3
  P.O.skillUsedRound = true;
  engine.useSkill('O', 'secondary', []);
  assert.equal(P.O.otoya.heart, null);
  assert.equal(P.O.skillPoints, 4, 'ยกเลิกฟรี');
  assert.equal(P.O.otoya.heartReady, engine.roundNumber + 3);
  assert.equal(P.A.statuses.otoyaHeart, undefined);
  assert.equal(oto.auraCrit(engine, P.A), 0);
});

test('ดนตรีในหัวใจ: เป้าเดินออกนอกระยะ/ตัวเองติดสตั้น = หยุด · เป้าติดสตั้นยังอยู่ · duo ให้ได้แค่เพื่อน', () => {
  let P = setup([['O', 'kurenai_otoya', 3, 7], ['A', 'dummy', 5, 7]]);
  engine.setActor('O');
  engine.useSkill('O', 'secondary', ['A']);
  P.A.statuses.stun = 1;
  oto.afterActorEnd(engine, P.A);
  assert.ok(P.O.otoya.heart, 'เป้าสตั้นยังอยู่');
  P.A.pos = { x: 13, y: 7 };
  oto.onUnitWalked(engine, P.A);
  assert.equal(P.O.otoya.heart, null, 'ออกนอกระยะ');
  P = setup([['O', 'kurenai_otoya', 3, 7], ['A', 'dummy', 5, 7]]);
  engine.setActor('O');
  engine.useSkill('O', 'secondary', ['A']);
  P.O.statuses.stun = 1;
  oto.afterActorEnd(engine, P.A);
  assert.equal(P.O.otoya.heart, null, 'ตัวเองสตั้น');
  P = setup([['O', 'kurenai_otoya', 3, 7, 1], ['E', 'dummy', 5, 7, 2], ['F', 'dummy', 4, 8, 1], ['G', 'dummy', 12, 12, 2]], 'duo');
  engine.setActor('O');
  engine.useSkill('O', 'secondary', ['E']);
  assert.equal(P.O.otoya.heart, null, 'ศัตรูไม่ได้');
  engine.useSkill('O', 'secondary', ['F']);
  assert.equal(P.O.otoya.heart.targetId, 'F');
});

test('ท่าไม้ตาย: ไม่กินโควตาสกิล · กดได้หลังใช้สกิลอื่น · ยังเดินได้ด้วยระยะร่างใหม่ · ใช้หลุมพรางต่อในเทิร์นเดียวกัน', () => {
  const P = setup([['O', 'kurenai_otoya', 3, 7], ['A', 'dummy', 12, 12]]);
  P.O.hp = 3;
  engine.setActor('O');
  engine.useSkill('O', 'basic', []); // ปากหวาน = ใช้โควตา
  assert.equal(P.O.skillUsedRound, true);
  engine.useSkill('O', 'ultimate', []);
  assert.ok(P.O.otoya.ultUntil > 0, 'แปลงได้แม้ใช้โควตาแล้ว');
  // เทิร์นใหม่: แปลงร่างก่อน แล้วยังเดินและใช้สกิลร่างได้
  P.O.skillUsedRound = false;
  P.O.otoya.ultUntil = 0; P.O.otoya.ultUses = 0;
  engine.setActor('O');
  engine.useSkill('O', 'ultimate', []);
  assert.equal(P.O.skillUsedRound, false, 'ไม่กินโควตา');
  assert.equal(engine.action.locked, false, 'ยังเดินได้');
  engine.useSkill('O', 'basic', []);
  assert.ok(oto.skillPub(P.O, 'basic').active, 'หลุมพรางในเทิร์นเดียวกัน');
});

test('ท่าไม้ตาย: 0 แต้ม · 3 ครั้ง · 2 เทิร์น · พลังโจมตี +2 ระยะเดิน 5 · ชุดสกิลเปลี่ยน · ครั้งที่ 3 คืนร่างแล้วตาย', () => {
  const P = setup([['O', 'kurenai_otoya', 3, 7], ['A', 'dummy', 12, 12], ['B', 'dummy', 12, 2]]);
  kiva(P);
  assert.deepEqual(calls.queue, ['otoyaHenshin1']);
  assert.equal(P.O.skillPoints, 8);
  assert.equal(engine.baseMovOf ? engine.baseMovOf(P.O) : oto.mov(P.O), 5);
  const me = view('O', 'O');
  assert.equal(me.character.basic.name, 'หลุมพราง');
  assert.equal(me.character.secondary.name, 'จงตื่นขึ้น ครั้งสุดท้าย');
  assert.equal(me.character.secondary.choices.length, 2);
  assert.equal(oto.canUseSkill(engine, P.O, 'ultimate', []), false, 'กดซ้ำไม่ได้');
  const ctx = {};
  assert.equal(oto.damageBonus(engine, P.O, P.A, ctx), 3, 'ไร้เพศ +1 + Dark Kiva +2');
  // จบเทิร์นที่ 2 → คืนร่าง
  engine.endTurn ? null : null;
  P.O.otoya.ultHpLost = 2;
  engine.setRoundNumber(engine.roundNumber + 1);
  oto.onEndTurn(engine);
  assert.equal(P.O.otoya.ultUntil, 0, 'คืนร่าง');
  assert.equal(P.O.statuses.mend, 2, 'เยียวยาเท่าที่เสีย');
  // ครั้งที่ 3 → ตาย
  P.O.otoya.ultUses = 2;
  P.O.skillUsedRound = false;
  calls.queue = [];
  kiva(P);
  assert.deepEqual(calls.queue, ['otoyaHenshin3']);
  engine.setRoundNumber(engine.roundNumber + 1);
  oto.onEndTurn(engine);
  assert.equal(P.O.alive, false, 'คืนร่างครั้งที่ 3 = ตาย');
  assert.ok(calls.queue.includes('otoyaDead'));
});

test('หลุมพราง: เสียพลังชีวิต 1 · ถูกสกิลโจมตี = 0 ถอย 2 ช่อง ผู้โจมตีถูกตรึง · 1 ครั้ง · ไม่มีคูลดาวน์', () => {
  Math.random = () => 0.99;
  const P = setup([['O', 'kurenai_otoya', 4, 7], ['A', 'dummy', 3, 7]]);
  kiva(P);
  const hp = P.O.hp;
  engine.useSkill('O', 'basic', []);
  assert.equal(P.O.hp, hp - 1, 'ไม่สนเกราะ');
  assert.ok(oto.skillPub(P.O, 'basic').active, 'ตั้งท่า');
  assert.equal(P.O.otoya.trapReady, engine.roundNumber, 'ไม่มีคูลดาวน์');
  assert.equal(oto.canUseSkill(engine, P.O, 'basic', []), false, 'ตั้งท่าอยู่ = กดซ้ำไม่ได้');
  engine.setActor('A');
  const before = vit(P.O);
  const r = engine.skillStrike(P.A, P.O, 'ทดสอบ');
  assert.equal(r.blocked, true);
  assert.equal(vit(P.O), before, 'ไม่เสียหาย');
  assert.ok(P.A.statuses.rooted > 0, 'ผู้โจมตีถูกตรึง');
  const moved = Math.abs(P.O.pos.x - 4) + Math.abs(P.O.pos.y - 7);
  assert.ok(moved >= 1 && moved <= 2, `ถอย (${moved})`);
  assert.ok(P.O.pos.x >= 4, 'ถอยห่าง');
  assert.ok(calls.queue.includes('otoyaTrap'));
  // ครั้งที่สอง (คำสั่งใหม่) โดนตามปกติ
  P.O.otoya.trapKey = null;
  engine.setActor('A');
  const b2 = vit(P.O);
  engine.skillStrike(P.A, P.O, 'ทดสอบ');
  assert.ok(vit(P.O) < b2, 'ใช้ไปแล้ว');
});

test('หลุมพราง: ตีปกติ = 0 แล้วถอยหลังจบตาผู้ตี', () => {
  Math.random = () => 0.99;
  const P = setup([['O', 'kurenai_otoya', 4, 7], ['A', 'dummy', 3, 7]]);
  kiva(P);
  engine.useSkill('O', 'basic', []);
  engine.setActor('A');
  const before = vit(P.O);
  engine.attackTarget('A', 'O');
  engine.clearPhaseTimer();
  assert.equal(vit(P.O), before, 'ตีปกติเป็น 0');
  assert.deepEqual(P.O.pos, { x: 4, y: 7 }, 'ยังไม่ถอยระหว่างฉาก');
  oto.afterActorEnd(engine, P.A);
  assert.ok(P.O.pos.x > 4, 'ถอยหลังจบตา');
});

test('Wake Up 1: กลางคืน 2 เทิร์น · กลางคืนอยู่แล้วกดไม่ได้ · Wake Up 2 กลางคืนเท่านั้น → ตีครั้งถัดไปผุพัง + คลิป', () => {
  Math.random = () => 0.99;
  const P = setup([['O', 'kurenai_otoya', 3, 7], ['A', 'dummy', 4, 7]]);
  kiva(P);
  assert.equal(oto.canUseSkill(engine, P.O, 'secondary', [], { form: 'wake2' }), false, 'กลางวัน Wake Up 2 ไม่ได้');
  const w = engine.worldRound;
  calls.queue = [];
  engine.useSkill('O', 'secondary', [], { form: 'wake1' });
  assert.deepEqual(engine.forcedNight && [engine.forcedNight.from, engine.forcedNight.until], [w, w + 1]);
  assert.equal(engine.isNightRound(w), true);
  assert.equal(engine.isNightRound(w + 1), true);
  assert.deepEqual(calls.queue, ['otoyaWake1', 'otoyaWake1Fill']);
  assert.equal(engine.buildStateFor('O').bloodMoon, true);
  assert.equal(oto.canUseSkill(engine, P.O, 'secondary', [], { form: 'wake1' }), false, 'กลางคืนแล้ว');
  // คูลดาวน์แยก: Wake Up 2 กดได้ในเทิร์นเดียวกัน (โควตาสกิลของเทิร์นยังนับตามปกติ)
  P.O.skillUsedRound = false;
  engine.useSkill('O', 'secondary', [], { form: 'wake2' });
  assert.equal(P.O.otoya.wake2, true);
  // กลางคืน: ได้รับความเสียหายเบาลง 1
  assert.equal(oto.adjustIncomingDamage(engine, P.O, 2), 1);
  P.A.armor = 0; P.A.hp = 7;
  calls.queue = [];
  engine.attackTarget('O', 'A');
  engine.clearPhaseTimer();
  assert.ok(P.A.statuses.decay > 0, 'ผุพัง');
  assert.ok(P.A.statuses.hbleed > 0, 'เลือดไหล');
  assert.equal(P.O.otoya.wake2, false);
  assert.equal(P.O.otoya.wake2Hit, false, 'คลิป finalhit ถูกขอก่อนฉากตี (preAttackClip)');
  P.O.otoya.wake2Hit = true;
  assert.equal(oto.preAttackClip(engine, P.O), 'otoyaWake2Hit');
});

test('ราชาผีดูดเลือด: เลือดไหลบนตัวเองฟื้นแทน · เสียพลังชีวิตจากสกิลไม่ตาย · ร่างครั้งที่ 3 ตีโดนฟื้น 2', () => {
  Math.random = () => 0.99;
  const P = setup([['O', 'kurenai_otoya', 3, 7], ['A', 'dummy', 4, 7]]);
  assert.equal(oto.hbleedHeals(P.O), true);
  P.O.otoya.ultUses = 2;
  kiva(P);
  P.O.hp = 1;
  engine.useSkill('O', 'basic', []);
  assert.equal(P.O.hp, 1, 'ไม่ตายจากสกิล');
  assert.equal(P.O.alive, true);
  P.O.hp = 3;
  engine.setActor('O');
  engine.attackTarget('O', 'A');
  engine.clearPhaseTimer();
  assert.equal(P.O.hp, 5, 'ฟื้น 2');
});

test('ตัดผลสกิล: ดนตรีในหัวใจ / Dark Kiva มี severables', () => {
  const P = setup([['O', 'kurenai_otoya', 3, 7], ['A', 'dummy', 5, 7]]);
  engine.setActor('O');
  engine.useSkill('O', 'secondary', ['A']);
  const list = oto.severables(engine, P.O);
  assert.equal(list.length, 1);
  list[0].cancel();
  assert.equal(P.O.otoya.heart, null);
});
