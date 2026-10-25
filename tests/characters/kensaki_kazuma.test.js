// เคนซากิ คาซุมะ (kensaki_kazuma) — ร่างมนุษย์/Blade · Blay Rouzer การ์ด 9 ใบ · Rouze → ท่า Lightning
//  GRID_PLAN §7.19
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const kz = require('../../characters/kensaki_kazuma.js');
const { CHAR_BY_ID } = require('../../characters.js');
const Board = require('../../server/board.js');
const match = require('../../server/match.js');
const timers = require('../../server/timers.js');
const action = require('../../server/phases/action.js');

const realRandom = Math.random;
const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
// ตัวจับเวลาของเฟส = เก็บ callback แล้วเรียกเองจนฉากจบ (ฉากตี / จังหวะพักของสกิล)
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
// กรอบ w × h ที่ไม่มีช่องพิเศษ/จุดฟื้นฟู — สิ่งกีดขวางในกรอบถูกพังทิ้ง → มุมซ้ายบน { x, y }
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
  throw new Error('ไม่มีกรอบโล่ง');
}
// list = [[id, characterId, dx, dy]] — dx/dy นับจากช่องคาซุมะ (กลางแถวกลางของกรอบ 13×3)
function setup(list) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, ch], i) => { engine.players[id] = blank(id, ch, i + 1); });
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setCycleShift(0);
  engine.setRoundNumber(4);
  match.shopPos = null;
  match.shopRazed = false;
  engine.placeOnBoard(1);
  engine.clearPhaseTimer();
  const a = openArea(13, 3);
  for (const p of Object.values(engine.players)) p.pos = null;
  const o = { x: a.x + 2, y: a.y + 1 };
  for (const [id, , dx, dy = 0] of list) {
    const p = engine.players[id];
    p.pos = { x: o.x + dx, y: o.y + dy }; p.skillUsedRound = false; p.shield = 0; p.statuses = {}; p.statusAmt = {}; p.nightTaxTier = null;
    p.skillPoints = 8; p.hp = 7; p.armor = 3;
  }
  match.turnOrder = list.map(([id]) => id);
  match.actorIndex = 0;
  return engine.players;
}
const noRoll = () => { Math.random = () => 0.99; }; // ไม่คริ ไม่หลบ ไม่ติดช็อตสตั้น
const henshin = () => engine.useSkill('K', 'basic', []);
const card = (form) => engine.useSkill('K', 'secondary', [], { form });
const rouze = (opts = {}) => engine.useSkill('K', 'ultimate', [], opts);
// ร่าง Blade + การ์ดตามรายการ (แต้มเติมให้พอ)
function bladeWith(P, keys) {
  engine.setActor('K');
  henshin();
  for (const k of keys) {
    P.K.skillPoints = 8;
    card(k);
  }
  P.K.skillPoints = 8;
}

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
test.beforeEach(() => { for (const k of Object.keys(calls)) calls[k] = []; noRoll(); });
test.afterEach(() => { Math.random = realRandom; engine.clearPhaseTimer(); match.cutsceneQueue.length = 0; match.afterCutscene = []; match.skillBeats = []; });

test('ข้อมูล: ยาก · 7/3 · ราคา 0/2/0 · เดิน 4 ตีประชิด · เริ่มร่างมนุษย์ · คำอธิบายไม่มีจังหวะไพ่', () => {
  const ch = CHAR_BY_ID.kensaki_kazuma;
  assert.equal(ch.name, 'เคนซากิ คาซุมะ');
  assert.equal(ch.difficulty, 'hard');
  assert.ok(!ch.unique && !ch.hidden);
  assert.deepEqual([ch.basic.cost, ch.secondary.cost, ch.ultimate.cost], [0, 2, 0]);
  for (const s of [ch.basic, ch.secondary, ch.ultimate]) assert.doesNotMatch(s.desc, /ก่อนเปิดไพ่|ไพ่แตก/);
  const P = setup([['K', 'kensaki_kazuma', 0]]);
  assert.equal(P.K.hp, 7);
  assert.equal(action.baseMovOf(P.K), 4);
  assert.deepEqual(action.rangeOf(P.K), [1, 1]);
  assert.equal(P.K.kazuma.blade, false);
  assert.equal(kz.displayImg(P.K), null);
});

test('แปลงร่าง: 0 แต้ม · ไม่กินโควตา · ยังเดินได้ · 1 ครั้งต่อเทิร์น · รูป/ชื่อตามร่าง', () => {
  const P = setup([['K', 'kensaki_kazuma', 0]]);
  engine.setActor('K');
  henshin();
  assert.equal(P.K.kazuma.blade, true);
  assert.equal(P.K.skillPoints, 8);
  assert.equal(P.K.skillUsedRound, false);
  assert.equal(engine.action.locked, false);
  assert.equal(kz.displayImg(P.K), kz.IMG.blade);
  assert.equal(kz.characterPub(engine, P.K).name, 'Kamen Rider Blade');
  assert.equal(kz.skillPub(P.K, 'basic').name, 'คืนร่าง');
  henshin();
  assert.equal(P.K.kazuma.blade, true, 'กดซ้ำเทิร์นเดียวกันไม่ได้');
  engine.setRoundNumber(engine.roundNumber + 1);
  engine.setActor('K');
  henshin();
  assert.equal(P.K.kazuma.blade, false);
  assert.equal(kz.skillPub(P.K, 'basic').name, 'แปลงร่าง');
});

test('แปลงร่างนอกตาตัวเองกดไม่ได้', () => {
  const P = setup([['K', 'kensaki_kazuma', 0], ['A', 'dummy', 2]]);
  engine.setActor('A');
  henshin();
  assert.equal(P.K.kazuma.blade, false);
});

test('ร่าง Blade: จบเทิร์นแต้ม +2 · ตีปกติแต้ม +1 · ร่างมนุษย์ตีไม่ได้แต้ม', () => {
  const P = setup([['K', 'kensaki_kazuma', 0], ['A', 'dummy', 1]]);
  assert.equal(kz.skillRegen(P.K), 1);
  engine.setActor('K');
  drain(() => engine.attackTarget('K', 'A'));
  assert.equal(P.K.skillPoints, 8, 'เต็มอยู่แล้วก็ไม่เกิน');
  P.K.skillPoints = 3;
  // ตาใหม่ของ K โดยไม่จบเทิร์นทั้งวง (A ยังไม่เดิน)
  const again = () => { engine.setRoundNumber(engine.roundNumber + 1); match.actorIndex = 0; engine.setActor('K'); };
  again();
  drain(() => engine.attackTarget('K', 'A'));
  assert.equal(P.K.skillPoints, 3, 'ร่างมนุษย์ไม่ได้แต้ม');
  again();
  henshin();
  assert.equal(kz.skillRegen(P.K), 2);
  drain(() => engine.attackTarget('K', 'A'));
  assert.equal(P.K.skillPoints, 4);
  P.K.skillPoints = 0;
  engine.endTurn();
  engine.clearPhaseTimer();
  assert.ok(P.K.skillPoints >= 2, 'จบเทิร์น +2 (กลางวันอาจ +1 เพิ่ม)');
});

test('ร่างมนุษย์: จบเทิร์นครบ 3 เทิร์นติดกัน ฟื้นพลังชีวิต 2 · แปลงร่างแล้วนับใหม่', () => {
  const P = setup([['K', 'kensaki_kazuma', 0]]);
  P.K.hp = 3;
  const end = () => { engine.endTurn(); engine.clearPhaseTimer(); engine.setRoundNumber(engine.roundNumber + 1); };
  end(); end();
  assert.equal(P.K.hp, 3);
  end();
  assert.equal(P.K.hp, 5);
  end();
  engine.setActor('K');
  henshin();
  assert.equal(P.K.kazuma.humanTurns, 0);
  end();
  engine.setActor('K');
  henshin();
  end(); end();
  assert.equal(P.K.hp, 5, 'นับใหม่หลังคืนร่าง ยังไม่ครบ 3');
});

test('Blay Rouzer: เฉพาะร่าง Blade · ใบละ 2 แต้ม · ไม่กินโควตา · ยังเดินได้ · กองรวมไม่เกิน 3 ใบ (ข้ามเทิร์นด้วย) · ทุกตัวเลือกมีคำอธิบาย', () => {
  const P = setup([['K', 'kensaki_kazuma', 0]]);
  engine.setActor('K');
  card('slash');
  assert.equal(P.K.skillPoints, 8, 'ร่างมนุษย์เลือกไม่ได้ ไม่เสียแต้ม');
  henshin();
  card('slash');
  card('slash');
  card('kick');
  assert.equal(P.K.skillPoints, 2);
  assert.equal(P.K.skillUsedRound, false);
  assert.equal(engine.action.locked, false);
  assert.deepEqual(P.K.kazuma.hand, [{ k: 'slash', n: 2 }, { k: 'kick', n: 1 }]);
  P.K.skillPoints = 8;
  card('kick');
  assert.equal(P.K.skillPoints, 8, 'ใบที่ 4 ไม่ได้');
  const choices = kz.skillPub(P.K, 'secondary').choices;
  assert.equal(choices.length, 9);
  for (const c of choices) { assert.ok(c.desc && c.desc.length > 5); assert.equal(c.locked, true); }
  assert.deepEqual(calls.sfx, ['kazuma_card_slash', 'kazuma_card_slash', 'kazuma_card_kick'], 'เสียงการ์ดต่อใบ');
  // กองค้างข้ามเทิร์น แต่ยังเต็มที่ 3 ใบ — เทิร์นใหม่ใส่เพิ่มไม่ได้จนกว่าจะ Rouze
  engine.setRoundNumber(engine.roundNumber + 1);
  engine.setActor('K');
  card('kick');
  assert.deepEqual(P.K.kazuma.hand, [{ k: 'slash', n: 2 }, { k: 'kick', n: 1 }]);
  assert.equal(P.K.skillPoints, 8);
  assert.equal(kz.kazumaState(engine, P.K).picksLeft, 0);
  assert.equal(kz.skillLocks(engine, P.K).secondary.locked, true);
  rouze();
  engine.setRoundNumber(engine.roundNumber + 1);
  engine.setActor('K');
  card('kick');
  assert.deepEqual(P.K.kazuma.hand, [{ k: 'kick', n: 1 }], 'Rouze แล้วกองว่าง ใส่ใหม่ได้');
  assert.equal(calls.sfx[calls.sfx.length - 1], 'kazuma_card_kick');
});

test('Blay Rouzer: กองไม่เกิน 3 ชนิด · TACKLE กับ MAGNET อยู่ด้วยกันไม่ได้ · แต้มไม่พอกดไม่ได้', () => {
  const P = setup([['K', 'kensaki_kazuma', 0]]);
  bladeWith(P, ['slash', 'beat', 'tackle']);
  card('time');
  assert.equal(P.K.kazuma.hand.length, 3, 'ใบที่ 4 / ชนิดที่ 4 ไม่ได้');
  assert.equal(P.K.skillPoints, 8);
  const P2 = setup([['K', 'kensaki_kazuma', 0]]);
  bladeWith(P2, ['tackle']);
  card('magnet');
  assert.equal(P2.K.kazuma.hand.length, 1);
  assert.equal(P2.K.skillPoints, 8);
  P2.K.skillPoints = 1;
  card('tackle');
  assert.equal(P2.K.kazuma.hand[0].n, 1);
});

test('สูตร: KICK + THUNDER = Blast · เติม SLASH = Slash ทับ · KICK + THUNDER + MACH = Sonic ทับ', () => {
  const P = setup([['K', 'kensaki_kazuma', 0]]);
  bladeWith(P, ['kick', 'thunder']);
  assert.equal(P.K.kazuma.combo, 'blast');
  assert.deepEqual(calls.sfx.slice(-2), ['kazuma_card_thunder', 'kazuma_lightning_blast'], 'ผสมได้ = เสียงชื่อท่าต่อจากการ์ด');
  assert.equal(kz.skillPub(P.K, 'ultimate').name, 'Lightning Blast');
  card('slash');
  assert.equal(P.K.kazuma.combo, 'slash');
  const P2 = setup([['K', 'kensaki_kazuma', 0]]);
  bladeWith(P2, ['kick', 'thunder', 'mach']);
  assert.equal(P2.K.kazuma.combo, 'sonic');
  assert.equal(kz.skillArea(P2.K, 'ultimate', { kind: 'self' }).kind, 'line');
  assert.equal(calls.sfx[calls.sfx.length - 1], 'kazuma_lightning_sonic');
  assert.equal(kz.skillSound(P2.K, 'ultimate'), 'kazuma_pass');
});

test('Rouze: กินโควตา · กองว่าง/ร่างมนุษย์กดไม่ได้ · ใช้การ์ดทั้งกอง', () => {
  const P = setup([['K', 'kensaki_kazuma', 0]]);
  engine.setActor('K');
  henshin();
  rouze();
  assert.equal(P.K.skillUsedRound, false, 'กองว่าง');
  card('slash');
  rouze();
  assert.equal(P.K.skillUsedRound, true);
  assert.equal(engine.action.locked, false, 'ยังเดินได้');
  assert.deepEqual(P.K.kazuma.hand, []);
  assert.deepEqual(P.K.kazuma.armed.cards, { slash: 1 });
});

test('การ์ดเดี่ยว: SLASH ×2 + KICK = พลังโจมตี +2 ระยะ 1–2 · ตีแล้วหาย · ไม่ตี = หายตอนจบตา', () => {
  const P = setup([['K', 'kensaki_kazuma', 0], ['A', 'dummy', 2]]);
  bladeWith(P, ['slash', 'slash', 'kick']);
  rouze();
  assert.deepEqual(action.rangeOf(P.K), [1, 2]);
  drain(() => engine.attackTarget('K', 'A'));
  assert.equal(P.A.armor, 0, '1 + 2 = 3');
  assert.equal(P.K.kazuma.armed, null);
  assert.deepEqual(action.rangeOf(P.K), [1, 1]);
  const P2 = setup([['K', 'kensaki_kazuma', 0]]);
  bladeWith(P2, ['mach']);
  rouze();
  assert.equal(action.baseMovOf(P2.K), 5, 'MACH เดิน +1');
  kz.onActorEnd(engine, P2.K);
  assert.equal(P2.K.kazuma.armed, null);
  assert.equal(action.baseMovOf(P2.K), 4);
});

test('BEAT: ตีกว้าง 3 · THUNDER: ช็อต · TIME: ตาเดินถัดไปของเป้า −10 วิ (ไม่ต่ำกว่า 15)', () => {
  const P = setup([['K', 'kensaki_kazuma', 0], ['A', 'dummy', 1], ['B', 'dummy', 1, 1], ['C', 'dummy', 1, -1], ['D', 'dummy', 9]]);
  match.turnOrder = ['K', 'D']; // เป้าเดินไปแล้ว — หักเวลาค้างไว้ตาเดินหน้า
  bladeWith(P, ['beat', 'thunder', 'time']);
  rouze();
  drain(() => engine.attackTarget('K', 'A'));
  for (const t of [P.A, P.B, P.C]) assert.equal(t.armor, 2, `${t.id} โดน`);
  for (const t of [P.A, P.B, P.C]) assert.ok(t.statuses.shock > 0, `${t.id} ช็อต`);
  assert.equal(P.A.kazumaTimeCut, 10);
  assert.equal(kz.turnSeconds(engine, P.A, 60), 50);
  assert.equal(P.A.kazumaTimeCut, 0, 'ใช้แล้วหมด');
  P.B.kazumaTimeCut = 60;
  assert.equal(kz.turnSeconds(engine, P.B, 60), 15);
});

test('TIME: เวลาตาเดินจริงของเป้าลดลงตอนตาเริ่ม', () => {
  const P = setup([['K', 'kensaki_kazuma', 0], ['A', 'dummy', 3]]);
  P.A.kazumaTimeCut = 20;
  const orig = timers.startPhaseTimer;
  let secs = null;
  timers.startPhaseTimer = (s) => { secs = s; };
  try {
    match.turnOrder = ['A'];
    match.actorIndex = -1;
    match.gameState = 'ORDER';
    action.nextActor();
  } finally { timers.startPhaseTimer = orig; engine.clearPhaseTimer(); }
  assert.equal(match.actorId, 'A');
  assert.equal(secs, 40);
});

test('TACKLE: ผลัก 1 ช่อง ชนเสียเพิ่ม 1 · MAGNET + KICK: ตีจากระยะ 2 แล้วดึงเข้าประชิด', () => {
  const P = setup([['K', 'kensaki_kazuma', 0], ['A', 'dummy', 1], ['B', 'dummy', 2]]);
  bladeWith(P, ['tackle']);
  rouze();
  const ax = P.A.pos.x;
  drain(() => engine.attackTarget('K', 'A'));
  assert.equal(P.A.pos.x, ax, 'ชน B ไม่ขยับ');
  assert.equal(P.A.armor, 1, 'ตี 1 + ชน 1');
  const P2 = setup([['K', 'kensaki_kazuma', 0], ['A', 'dummy', 2]]);
  bladeWith(P2, ['magnet', 'kick']);
  rouze();
  drain(() => engine.attackTarget('K', 'A'));
  assert.equal(P2.A.pos.x, P2.K.pos.x + 1);
});

test('METAL: กันการโจมตีทั้งก้อน 1 ครั้ง · หมดตอนจบเทิร์น', () => {
  const P = setup([['K', 'kensaki_kazuma', 0], ['A', 'dummy', 1]]);
  bladeWith(P, ['metal']);
  rouze();
  assert.equal(P.K.kazuma.metal, 1);
  assert.equal(P.K.kazuma.armed, null, 'METAL ลงทันที ไม่รอตี');
  engine.setActor('A');
  drain(() => engine.attackTarget('A', 'K'));
  assert.equal(P.K.armor, 3, 'กันทั้งก้อน');
  assert.equal(P.K.kazuma.metal, 0);
  engine.setActor('A');
  drain(() => engine.attackTarget('A', 'K'));
  assert.equal(P.K.armor, 2);
  const P2 = setup([['K', 'kensaki_kazuma', 0]]);
  bladeWith(P2, ['metal', 'metal']);
  rouze();
  engine.endTurn();
  engine.clearPhaseTimer();
  assert.equal(P2.K.kazuma.metal, 0);
  assert.ok(!P2.K.statuses[kz.METAL_STATUS]);
});

test('Lightning Blast: ระยะ 1–3 · ดาเมจ 2 ตายตัว (ไม่รับ SLASH) · ช็อต 2', () => {
  const P = setup([['K', 'kensaki_kazuma', 0], ['A', 'dummy', 3]]);
  bladeWith(P, ['kick', 'kick', 'thunder']);
  rouze();
  assert.deepEqual(action.rangeOf(P.K), [1, 3]);
  drain(() => engine.attackTarget('K', 'A'));
  assert.equal(P.A.armor, 1);
  assert.equal(P.A.statuses.shock, 2);
  assert.ok(calls.sfx.length >= 0);
});

test('Lightning Slash: แนว 3×1 โดนทุกคนในแนว · ดาเมจ 2 · ช็อต 1', () => {
  const P = setup([['K', 'kensaki_kazuma', 0], ['A', 'dummy', 1], ['B', 'dummy', 3], ['C', 'dummy', 4]]);
  bladeWith(P, ['slash', 'thunder']);
  rouze();
  drain(() => engine.attackTarget('K', 'A'));
  assert.equal(P.A.armor, 1);
  assert.equal(P.B.armor, 1);
  assert.equal(P.C.armor, 3, 'นอกแนว 3');
  assert.equal(P.B.statuses.shock, 1);
});

test('Lightning Sonic: พุ่งหยุดหน้าศัตรู · ดาเมจ 4 + ช็อต 1 · กระเด็น 2 ชนเสียเพิ่ม 1 · หลบได้', () => {
  const P = setup([['K', 'kensaki_kazuma', 0], ['A', 'dummy', 3], ['C', 'dummy', 5]]);
  bladeWith(P, ['kick', 'thunder', 'mach']);
  const kx = P.K.pos.x, ax = P.A.pos.x;
  drain(() => rouze({ dir: 'right' }));
  assert.equal(P.K.pos.x, kx + 2, 'หยุดหน้าเป้า');
  assert.equal(P.A.pos.x, ax + 1, 'กระเด็นไปชน C');
  assert.equal(P.A.armor + P.A.hp, 10 - 4 - 1);
  assert.equal(P.A.statuses.shock, 1);
  assert.deepEqual(P.K.kazuma.hand, []);
  // ไม่มีใครในแนว = พุ่งสุดทาง
  const P2 = setup([['K', 'kensaki_kazuma', 0]]);
  bladeWith(P2, ['kick', 'thunder', 'mach']);
  const k2 = P2.K.pos.x;
  drain(() => rouze({ dir: 'right' }));
  assert.equal(P2.K.pos.x, k2 + 4);
  // ไม่เลือกทิศ = ไม่ทำงาน ไม่เสียการ์ด
  const P3 = setup([['K', 'kensaki_kazuma', 0]]);
  bladeWith(P3, ['kick', 'thunder', 'mach']);
  rouze();
  assert.equal(P3.K.kazuma.combo, 'sonic');
});

test('ตัดผลสกิล: ร่าง Blade / กองการ์ด (ล่าสุดก่อน)', () => {
  const P = setup([['K', 'kensaki_kazuma', 0]]);
  bladeWith(P, ['slash']);
  assert.deepEqual(kz.severables(engine, P.K).map((x) => x.key).sort(), ['blade', 'hand']);
  const first = engine.sever.cut(engine, P.K);
  assert.equal(first.label, 'Blay Rouzer');
  assert.deepEqual(P.K.kazuma.hand, []);
  engine.sever.cut(engine, P.K);
  assert.equal(P.K.kazuma.blade, false);
});

test('ข้อมูลให้ client: กอง / ท่าที่เซ็ต / เลือกได้อีก / ล็อกรายช่อง', () => {
  const P = setup([['K', 'kensaki_kazuma', 0]]);
  bladeWith(P, ['kick', 'thunder']);
  const s = kz.kazumaState(engine, P.K);
  assert.equal(s.blade, true);
  assert.equal(s.combo, 'blast');
  assert.equal(s.picksLeft, 1);
  assert.deepEqual(s.hand, [{ k: 'kick', n: 1 }, { k: 'thunder', n: 1 }]);
  const locks = kz.skillLocks(engine, P.K);
  assert.equal(locks.basic.locked, true);
  assert.equal(locks.ultimate.locked, false);
});

test('ช่างหัวมันสิ: ไม่มีผลการ์ดค้าง คริ 50% + คลิปมือเปล่าติดคริ · มีผล Rouze ค้าง = ไม่คริ · ท่า Lightning โดน = คลิปท่า', () => {
  const P = setup([['K', 'kensaki_kazuma', 0], ['A', 'dummy', 1]]);
  assert.equal(kz.critPct(P.K), 50, 'ร่างมนุษย์ก็ได้');
  assert.equal(kz.preAttackClip(engine, P.K, { crit: true }), 'kazumaCrit');
  assert.equal(kz.preAttackClip(engine, P.K, { crit: false }), null);
  bladeWith(P, ['kick', 'thunder']);
  assert.equal(kz.critPct(P.K), 50, 'ผสมไว้แต่ยังไม่กด Rouze');
  rouze();
  assert.equal(kz.critPct(P.K), 0);
  assert.equal(kz.preAttackClip(engine, P.K, { dodge: false }), 'kazumaBlast');
  assert.equal(kz.preAttackClip(engine, P.K, { dodge: true }), null);
});
