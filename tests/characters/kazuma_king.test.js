// เคนซากิ คาซุมะ — King Form · GRID_PLAN §7.19.1
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const kz = require('../../characters/kensaki_kazuma.js');
const Board = require('../../server/board.js');
const match = require('../../server/match.js');
const timers = require('../../server/timers.js');
const combat = require('../../server/combat.js');

const realRandom = Math.random;
const blank = (id, characterId, position) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId: null,
});
function drain(fn, max = 30) {
  const orig = timers.startPhaseTimer;
  const fires = [];
  timers.startPhaseTimer = (s, cb) => { fires.push(cb); };
  try {
    const actor = match.actorId;
    const r = fn();
    for (let i = 0; i < max && fires.length; i++) {
      if (match.gameState === 'ACTION' || match.gameState === 'GAMEOVER') break;
      if (actor && match.actorId !== actor) break;
      fires.shift()();
    }
    return r;
  } finally { timers.startPhaseTimer = orig; engine.clearPhaseTimer(); }
}
function openArea(w, h) {
  const map = engine.boardMap();
  const plain = (x, y) => Board.inBounds(map, x, y) && !(map.special && map.special[Board.key(x, y)]) && !map.heal.has(Board.key(x, y));
  for (let y = 1; y + h <= map.rows - 1; y++) {
    for (let x = 0; x + w <= map.cols; x++) {
      let ok = true;
      for (let j = 0; j < h && ok; j++) for (let i = 0; i < w && ok; i++) ok = plain(x + i, y + j);
      if (!ok) continue;
      const broken = [];
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (map.terrain[Board.key(x + i, y + j)]) broken.push(Board.key(x + i, y + j));
      match.board.broken = broken;
      match.board.brokenVer = (match.board.brokenVer || 0) + 1;
      return { x, y };
    }
  }
  throw new Error('no open area');
}
function setup() {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  ['K', 'T', 'U'].forEach((id, i) => { engine.players[id] = blank(id, id === 'K' ? 'kensaki_kazuma' : 'dummy', i + 1); });
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setCycleShift(0);
  engine.setRoundNumber(4);
  match.shopPos = null;
  match.shopRazed = false;
  engine.placeOnBoard(1);
  engine.clearPhaseTimer();
  const o = openArea(13, 3);
  const K = engine.players.K, T = engine.players.T, U = engine.players.U;
  for (const [p, dx] of [[K, 2], [T, 5], [U, 12]]) {
    p.pos = { x: o.x + dx, y: o.y + 1 }; p.skillUsedRound = false; p.shield = 0; p.statuses = {}; p.statusAmt = {}; p.nightTaxTier = null;
    p.hp = 7; p.armor = 3;
  }
  K.skillPoints = 50;
  match.turnOrder = ['K', 'T', 'U'];
  match.actorIndex = 0;
  engine.setActor('K');
  return { K, T, U, o };
}
// แต้มเต็ม · แปลง Blade · อัตราผสานเต็ม · Evolution
function king(P) {
  engine.useSkill('K', 'basic', []);
  P.K.kazuma.fusion = kz.KING.need;
  engine.useSkill('K', 'basic', [], { form: 'evolution' });
  match.afterCutscene = [];
  match.cutsceneQueue.length = 0;
  P.K.skillPoints = 50;
}
const pick = (keys) => { for (const k of keys) { engine.useSkill('K', 'secondary', [], { form: k }); } };
const nextRound = () => { engine.setRoundNumber(engine.roundNumber + 1); engine.setActor('K'); };
function picks(keys) {
  const list = [...keys];
  while (list.length) { pick(list.splice(0, 5)); if (list.length) nextRound(); }
}

let calls;
test.before(() => {
  calls = { cut: [], sfx: [] };
  engine.queueCutscene = (p, k) => { calls.cut.push(k); };
  engine.triggerCutscene = (p, k) => { calls.cut.push(k); };
  engine.skillFlash = () => {};
  const sfx = engine.sfx; engine.sfx = (k) => { calls.sfx.push(k); return sfx && undefined; };
  engine.boardFx = () => {};
});
test.beforeEach(() => { calls.cut.length = 0; calls.sfx.length = 0; Math.random = () => 0.99; });
test.afterEach(() => { Math.random = realRandom; engine.clearPhaseTimer(); match.cutsceneQueue.length = 0; match.afterCutscene = []; match.skillBeats = []; });

test('อัตราผสาน: เลือกการ์ดครบ 5 ใบถึงจะ Evolution ได้ · ปุ่มขึ้นบน HUD · ครั้งเดียวต่อเกม', () => {
  const P = setup();
  engine.useSkill('K', 'basic', []);
  assert.deepEqual(kz.hudActions(engine, P.K), []);
  engine.useSkill('K', 'basic', [], { form: 'evolution' });
  assert.equal(P.K.kazuma.king, false, 'เกจไม่เต็มยังเข้าร่างไม่ได้');
  P.K.kazuma.fusion = kz.KING.need - 1;
  pick(['slash']);
  assert.equal(P.K.kazuma.fusion, kz.KING.need);
  assert.equal(kz.hudActions(engine, P.K)[0].key, 'kazumaEvolution');
  P.K.hp = 2;
  P.K.armor = 1;
  engine.useSkill('K', 'basic', [], { form: 'evolution' });
  assert.equal(P.K.kazuma.king, true);
  assert.equal(P.K.hp, kz.maxHp(P.K), 'ฟื้นพลังชีวิตเต็ม');
  assert.equal(P.K.armor, 1, 'เกราะส่วนต่างไม่ฟื้น');
  assert.equal(kz.maxArmor(P.K), kz.ARMOR + 3, 'เพดานเกราะเพิ่ม');
  assert.ok(calls.cut.includes('kazumaKing'));
  assert.equal(kz.mov(P.K), 3);
  assert.equal(kz.characterPub(engine, P.K).name, 'เบลด ร่างคิง');
  assert.equal(kz.skillMusic(engine, P.K).music, 'kazuma_king');
  assert.deepEqual(kz.hudActions(engine, P.K), [], 'ใช้แล้วปุ่มหาย');
  assert.equal(engine.useSkill('K', 'basic', []), undefined);
  assert.equal(P.K.kazuma.blade, true, 'ร่าง King คืนร่างเองไม่ได้');
});

test('การ์ดร่าง King: 16 ใบ · ใบละ 1 แต้ม · 5 ใบต่อเทิร์น · ไม่จำกัดชนิด · ทุกใบมีคำอธิบาย', () => {
  const P = setup();
  king(P);
  const c = kz.skillPub(P.K, 'secondary').choices;
  assert.equal(c.length, 16);
  for (const x of c) { assert.equal(x.cost, 1); assert.ok(x.desc.length > 5); }
  const sp = P.K.skillPoints;
  pick(['jack', 'queen', 'fire', 'tornado', 'blizzard', 'ace']);
  assert.equal(P.K.kazuma.hand.length, 5, 'ใบที่ 6 ไม่ได้');
  assert.equal(P.K.skillPoints, sp - 5);
});

test('การ์ดของร่าง King เลือกในร่าง Blade ไม่ได้', () => {
  const P = setup();
  engine.useSkill('K', 'basic', []);
  pick(['jack']);
  assert.equal(P.K.kazuma.hand.length, 0);
  assert.equal(kz.skillPub(P.K, 'secondary').choices.length, 9);
});

test('Straight Flush: คลิปตอนกด · ไม่มีเสียงตัดหน้า · ตีครั้งถัดไป ×2 · พลังโจมตีร่าง King 2 → 4', () => {
  const P = setup();
  king(P);
  picks(['slash', 'beat', 'tackle', 'kick', 'thunder']);
  assert.equal(P.K.kazuma.combo, 'straight');
  assert.ok(calls.sfx.includes('kazuma_lightning_straight'));
  calls.sfx.length = 0;
  engine.useSkill('K', 'ultimate', []);
  assert.ok(calls.cut.includes('kazumaStraight'));
  assert.deepEqual(calls.sfx.filter((k) => k === kz.SFX.pass), []);
  assert.equal(kz.strikeMult(P.K), 2);
  assert.equal(kz.damageCap(engine, P.K, 'strike'), 6);
  assert.equal(kz.critPct(P.K), 0, 'ไม่มี ♠K = ไม่คริ');
  assert.equal(engine.attackPowerAgainst(P.K, P.T), 4);
});

test('♠K: อัตราคริ 20% ต่อใบ ไม่บวกกับ 50%', () => {
  const P = setup();
  king(P);
  pick(['king', 'king']);
  assert.equal(kz.critPct(P.K), 50, 'ยังไม่ Rouze = มือเปล่า');
  engine.useSkill('K', 'ultimate', []);
  assert.equal(kz.critPct(P.K), 40);
});

test('การ์ดเดี่ยว: FIRE ลุกไหม้ · BLIZZARD เชื่องช้า · FUSION แต้ม · ABSORB เกราะ · TORNADO หลบหลีก', () => {
  const P = setup();
  king(P);
  P.T.pos = { x: P.K.pos.x + 1, y: P.K.pos.y };
  P.K.armor = 2;
  pick(['fire', 'blizzard', 'jack', 'queen', 'tornado']);
  engine.useSkill('K', 'ultimate', []);
  P.K.skillPoints = 1;
  const sp = 1;
  drain(() => engine.attackTarget('K', 'T'));
  assert.ok((P.T.statuses.hburn || 0) > 0);
  assert.ok((P.T.statuses.slow || 0) > 0 || P.T.iceSlow);
  assert.ok(P.K.skillPoints >= sp + 1);
  assert.equal(P.K.armor, 3);
  assert.ok((P.K.statuses.evade || 0) > 0);
});

test('ฟื้นแต้มสกิลจบเทิร์น: ร่าง Blade 2 · ร่าง King 3', () => {
  const P = setup();
  engine.useSkill('K', 'basic', []);
  assert.equal(kz.skillRegen(P.K), 2);
  P.K.kazuma.fusion = kz.KING.need;
  engine.useSkill('K', 'basic', [], { form: 'evolution' });
  assert.equal(kz.skillRegen(P.K), 3);
});

test('CHANGE: ล้างดีบัฟตัวเองทันทีตอน Rouze ไม่ต้องตีโดน · ไม่ค้างไปถึงการตี', () => {
  const P = setup();
  king(P);
  P.K.statuses.hburn = 3;
  P.K.statuses.weak = 3;
  P.K.statusAt = { hburn: 1, weak: 2 };
  pick(['ace']);
  assert.equal(P.K.statuses.weak, 3, 'เลือกการ์ดเฉยๆ ยังไม่ล้าง');
  engine.useSkill('K', 'ultimate', []);
  assert.equal(P.K.statuses.weak, undefined, 'ล้างอันที่โดนล่าสุด');
  assert.equal(P.K.statuses.hburn, 3, 'ล้าง 1 อย่างต่อใบ');
  assert.equal(P.K.kazuma.armed, null);
});

test('CHANGE เสริม Lightning Sonic: ล้างก่อนพุ่ง แม้ไม่โดนใคร', () => {
  const P = setup();
  king(P);
  P.K.statuses.weak = 3;
  P.K.statusAt = { weak: 1 };
  picks(['kick', 'thunder', 'mach', 'ace']);
  assert.equal(P.K.kazuma.combo, 'sonic');
  engine.useSkill('K', 'ultimate', [], { dir: 'right' });
  assert.equal(P.K.statuses.weak, undefined);
});

test('Royal Straight Flush: CHANGE ในสูตรไม่ล้างดีบัฟ', () => {
  const P = setup();
  king(P);
  P.K.statuses.weak = 3;
  P.K.statusAt = { weak: 1 };
  picks(['time', 'jack', 'queen', 'king', 'ace']);
  assert.equal(P.K.kazuma.combo, 'royal');
  engine.useSkill('K', 'ultimate', [], { dir: 'right' });
  assert.equal(P.K.statuses.weak, 3);
});

test('Four Card: พุ่ง · ดิบ 2 ลดเกราะก่อน ไม่สนคุ้มครอง · ติดสถานะครบ · คลิปตอนโดน', () => {
  const P = setup();
  king(P);
  picks(['thunder', 'tornado', 'fire', 'blizzard', 'king']);
  assert.equal(P.K.kazuma.combo, 'four');
  assert.deepEqual(kz.skillArea(P.K, 'ultimate', {}), { kind: 'line', len: 5, width: 1, hostile: true });
  P.T.statuses.guard = 1; P.T.statusAmt.guard = 5;
  const before = P.T.armor;
  const r = () => {
    engine.useSkill('K', 'ultimate', [], { dir: 'right' });
    while (match.afterCutscene.length) match.afterCutscene.shift()();
  };
  drain(r);
  assert.ok(calls.cut.includes('kazumaFour'));
  assert.equal(P.T.armor, before - 2);
  assert.ok((P.T.statuses.hburn || 0) > 0);
  assert.ok((P.T.statuses.hbleed || 0) > 0);
});

test('Royal Straight Flush: พื้นที่ 4×3 · หลบได้ · ดาเมจ 6 · กลับร่าง Blade ไม่สตั้น', () => {
  const P = setup();
  king(P);
  picks(['time', 'jack', 'queen', 'king', 'ace']);
  assert.equal(P.K.kazuma.combo, 'royal');
  assert.deepEqual(kz.skillArea(P.K, 'ultimate', {}), { kind: 'line', len: 4, width: 3, hostile: true });
  const r = () => {
    engine.useSkill('K', 'ultimate', [], { dir: 'right' });
    while (match.afterCutscene.length) match.afterCutscene.shift()();
  };
  drain(r);
  assert.ok(calls.cut.includes('kazumaRoyal'));
  assert.equal(P.T.hp + P.T.armor, 4);
  assert.equal(P.K.kazuma.king, false);
  assert.equal(P.K.kazuma.blade, true);
  assert.ok(!(P.K.statuses.stun > 0));
  assert.equal(P.K.armor <= 3, true);
});

test('Royal Straight Flush หลบได้: ทุกคนหลบ = ไม่มีคลิป ไม่เสียเลือด', () => {
  const P = setup();
  king(P);
  picks(['time', 'jack', 'queen', 'king', 'ace']);
  P.T.statuses.evade = 1; P.T.statusAmt.evade = 100;
  Math.random = () => 0;
  drain(() => engine.useSkill('K', 'ultimate', [], { dir: 'right' }));
  assert.ok(!calls.cut.includes('kazumaRoyal'));
  assert.equal(P.T.hp + P.T.armor, 10);
  assert.equal(P.K.kazuma.king, false);
});

test('ครบ 5 เทิร์น: คลิปคืนร่าง · ร่างมนุษย์ · ฟื้น 2 · สตั้นตัวเอง · การ์ดเฉพาะร่างหาย', () => {
  const P = setup();
  king(P);
  pick(['jack', 'slash']);
  P.K.hp = 3;
  for (let i = 0; i < 4; i++) kz.onEndTurn(engine);
  assert.equal(P.K.kazuma.king, true);
  kz.onEndTurn(engine);
  assert.equal(P.K.kazuma.king, false);
  assert.equal(P.K.kazuma.blade, false);
  assert.equal(P.K.hp, 5);
  assert.ok(P.K.statuses.stun > 0);
  assert.ok(calls.cut.includes('kazumaDeform'));
  assert.deepEqual(P.K.kazuma.hand.map((c) => c.k), ['slash']);
  assert.ok(P.K.armor <= 3);
});

test('ตัดผลสกิล: King Form → กลับร่าง Blade', () => {
  const P = setup();
  king(P);
  const list = kz.severables(engine, P.K);
  const k = list.find((x) => x.key === 'king');
  assert.ok(k);
  assert.ok(!list.some((x) => x.key === 'blade'));
  k.cancel();
  assert.equal(P.K.kazuma.king, false);
  assert.equal(P.K.kazuma.blade, true);
});

test('Lightning ในร่าง King เพดาน +1', () => {
  const P = setup();
  king(P);
  pick(['kick', 'thunder', 'slash', 'slash', 'slash']);
  nextRound();
  pick(['slash']);
  assert.ok(['blast', 'slash'].includes(P.K.kazuma.combo));
  engine.useSkill('K', 'ultimate', []);
  assert.ok(kz.fixedStrikeDamage(engine, P.K) <= 5);
  assert.equal(combat.damageCapOf(P.K, 'strike'), Infinity);
});
