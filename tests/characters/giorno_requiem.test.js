// โจรุโน่ ร่าง Gold Experience Requiem — ธนู / ร่าง 3 เทิร์น / กระสุนแห่งชีวิต / ขอให้ไปสู่ภพภูมิที่ดี / วนตาย / Return to Zero
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../server.js');
const match = require('../../server/match');
const shop = require('../../server/shop');
const timeStop = require('../../server/timeStop');
const gio = require('../../characters/giorno_giovanna.js');

const realRandom = Math.random;
const blank = (id, characterId, position, teamId = null) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId,
});
function setup(list) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, ch], i) => { engine.players[id] = blank(id, ch, i + 1); });
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setJourneyArea(1);
  engine.setCycleShift(0);
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.skillPoints = 8; p.skillUsedRound = false; p.shield = 0; p.hp = 7; p.armor = 3;
    p.statuses = {}; p.statusAmt = {};
  }
  return engine.players;
}
const arrow = (p) => p.inventory.find((it) => it.type === 'giornoArrow');
const vit = (p) => (p.hp || 0) + (p.armor || 0);
// เข้าร่างทันที (ข้ามคลิป/ทอยธนู)
function awaken(p) {
  engine.setActor(p.id);
  p.giorno.requiem = { until: engine.roundNumber + gio.REQ_TURNS - 1, at: 1 };
}

const saved = {
  triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash,
  notifyTransform: engine.notifyTransform, sfx: engine.sfx, boardFx: engine.boardFx,
};
const calls = { fx: [], sfx: [], queue: [] };
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = (p, key) => calls.queue.push(key);
  engine.skillFlash = () => {};
  engine.notifyTransform = () => {};
  engine.sfx = (s) => calls.sfx.push(s);
  engine.boardFx = (event, payload) => calls.fx.push({ event, payload });
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.beforeEach(() => { for (const k of Object.keys(calls)) calls[k] = []; Math.random = () => 0.99; });
test.afterEach(() => { Math.random = realRandom; engine.setCycleShift(0); engine.clearPhaseTimer(); match.cutsceneQueue = []; match.skillBeats = []; match.afterCutscene = []; });

test('ธนู: เริ่มเกมอยู่ในกระเป๋า กินช่อง · ทิ้ง/สละไม่ได้ · ไม่ขึ้นในตัวเลือกชีวิตทดแทน', () => {
  const P = setup([['G', 'giorno_giovanna', 4, 7], ['B', 'dummy', 5, 7]]);
  assert.ok(arrow(P.G));
  engine.setActor('G');
  P.G.hp = 5;
  assert.equal(shop.dropItem('G', arrow(P.G).uid), false);
  assert.deepEqual(gio.skillPub(P.G, 'basic').choices, []);
  engine.useSkill('G', 'basic', [], { form: arrow(P.G).uid });
  assert.ok(arrow(P.G));
  assert.equal(P.G.hp, 5);
});

test('ธนู: ใช้แล้วจบตา · ต้นตาเดินถัดไป 50% แปลงร่าง · ธนูยังอยู่', () => {
  const P = setup([['G', 'giorno_giovanna', 4, 7], ['B', 'dummy', 8, 7]]);
  engine.setActor('G');
  shop.useInventoryItem('G', arrow(P.G).uid);
  engine.clearPhaseTimer();
  assert.ok(P.G.giorno.arrowWait);
  assert.deepEqual(calls.queue, ['gioArrow']);
  assert.notEqual(engine.actorId, 'G');
  Math.random = () => 0.1;
  calls.queue = [];
  engine.setActor('G');
  gio.onActorReady(engine, P.G);
  engine.clearPhaseTimer();
  assert.deepEqual(calls.queue, ['gioSuccess']);
  assert.equal(P.G.giorno.arrowWait, 0);
  assert.ok(gio.reqOn(P.G));
  assert.ok(P.G.statuses.resist > 0);
  assert.ok(arrow(P.G));
});

test('ธนู: 50% ตายทันที', () => {
  const P = setup([['G', 'giorno_giovanna', 4, 7], ['B', 'dummy', 8, 7], ['C', 'dummy', 8, 8]]);
  engine.setActor('G');
  P.G.giorno.arrowWait = 1;
  Math.random = () => 0.9;
  gio.onActorReady(engine, P.G);
  engine.clearPhaseTimer();
  assert.deepEqual(calls.queue, ['gioFail']);
  assert.equal(P.G.alive, false);
  assert.equal(gio.reqOn(P.G), false);
});

test('ร่าง: พลังโจมตี +1 · คริ 70% · เดิน 6 · 0 แต้ม · สกิลติดตัว 2 ปิด · อยู่ 3 เทิร์น แล้วคูลดาวน์ธนู 5', () => {
  const P = setup([['G', 'giorno_giovanna', 4, 7], ['B', 'dummy', 8, 7]]);
  awaken(P.G);
  assert.equal(gio.critPct(P.G), 70);
  assert.equal(gio.mov(P.G), 6);
  assert.equal(gio.damageBonus(engine, P.G), 1);
  assert.equal(gio.skillCost(P.G, 'basic', 1, {}), 0);
  assert.equal(gio.skillCost(P.G, 'secondary', 2, { form: 'reflect' }), 0);
  assert.equal(gio.skillCost(P.G, 'ultimate', 4, {}), 0);
  P.G.hp = 2;
  Math.random = () => 0;
  assert.equal(gio.fixedStrikeDamage(engine, P.G, P.B, {}), null);
  assert.equal(gio.skillMusic(engine, P.G).music, 'gio_requiem');
  assert.equal(gio.characterPub(engine, P.G).name, 'Gold Experience Requiem');
  assert.equal(gio.displayImg(P.G), gio.IMG.re.cover);
  const start = engine.roundNumber;
  gio.onEndTurn(engine);
  assert.ok(gio.reqOn(P.G));
  engine.setRoundNumber(start + 2);
  gio.onEndTurn(engine);
  assert.equal(gio.reqOn(P.G), false);
  const r = engine.roundNumber;
  assert.equal(gio.canUseCharItem(engine, P.G, arrow(P.G)), false);
  engine.setRoundNumber(r + 5);
  assert.equal(gio.canUseCharItem(engine, P.G, arrow(P.G)), false);
  engine.setRoundNumber(r + 6);
  assert.equal(gio.canUseCharItem(engine, P.G, arrow(P.G)), true);
});

test('กระสุนแห่งชีวิต: สละไอเทม · แนว 7×1 ทะลุ · ความเสียหาย 1 + พิษ · เลือดเต็มก็ยิงได้ · โควตาร่วม 2 ครั้ง', () => {
  const P = setup([['G', 'giorno_giovanna', 3, 7], ['B', 'dummy', 5, 7], ['C', 'dummy', 6, 7]]);
  awaken(P.G);
  P.G.inventory.push({ uid: 'a', type: 'armor', value: 1 }, { uid: 'b', type: 'armor', value: 1 }, { uid: 'c', type: 'armor', value: 1 });
  const b0 = vit(P.B), c0 = vit(P.C);
  engine.useSkill('G', 'basic', [], { form: 'shot:a', dir: 'right' });
  engine.clearPhaseTimer();
  assert.equal(vit(P.B), b0 - 1);
  assert.equal(vit(P.C), c0 - 1);
  assert.ok(P.B.statuses.poison > 0);
  assert.ok(!P.G.inventory.some((it) => it.uid === 'a'));
  assert.deepEqual(calls.queue, ['gioShot']);
  engine.useSkill('G', 'basic', [], { form: 'shot:b', dir: 'right' });
  engine.clearPhaseTimer();
  engine.useSkill('G', 'basic', [], { form: 'shot:c', dir: 'right' });
  engine.clearPhaseTimer();
  assert.ok(P.G.inventory.some((it) => it.uid === 'c'), 'ครั้งที่ 3 ไม่ทำงาน');
  assert.deepEqual(calls.queue, ['gioShot', 'gioShot'], 'คลิปทุกครั้ง');
});

test('ร่าง: จงกำเนิดใหม่ไม่มีคลิป แม้ยังไม่เคยเล่น', () => {
  const P = setup([['G', 'giorno_giovanna', 4, 7], ['B', 'dummy', 5, 7]]);
  awaken(P.G);
  const sp = P.G.skillPoints;
  engine.useSkill('G', 'secondary', ['G'], { form: 'tree' });
  engine.clearPhaseTimer();
  assert.deepEqual(calls.queue, []);
  assert.equal(P.G.skillPoints, sp);
  assert.ok(gio.treeOn(engine, P.G));
});

// ผลของท่าพุ่งลงทันที (ข้ามตัวจับเวลาฉาก)
function ult() {
  const beat = engine.skillBeat;
  engine.skillBeat = (sec, fn) => fn();
  try { engine.useSkill('G', 'ultimate', [], { dir: 'right' }); } finally { engine.skillBeat = beat; }
  engine.clearPhaseTimer();
}
test('ขอให้ไปสู่ภพภูมิที่ดี: พุ่งชนคนแรก → คลิป → ความเสียหาย 5 · คูลดาวน์ 3', () => {
  const P = setup([['G', 'giorno_giovanna', 3, 7], ['B', 'dummy', 6, 7]]);
  awaken(P.G);
  const b0 = vit(P.B);
  ult();
  assert.deepEqual(P.G.pos, { x: 5, y: 7 });
  assert.deepEqual(calls.queue, ['gioReUlt']);
  assert.equal(vit(P.B), b0 - 5);
  assert.equal(gio.canUseSkill(engine, P.G, 'ultimate', [], {}), false);
  engine.setRoundNumber(engine.roundNumber + 4);
  assert.equal(gio.canUseSkill(engine, P.G, 'ultimate', [], {}), true);
});

test('วนตาย: ตายจากท่า → ต้นเทิร์นฟื้นเลือด 1 → ถึงตาตาย + แต้ม/เหรียญ · โจรุโน่ตาย = จบวน', () => {
  const P = setup([['G', 'giorno_giovanna', 3, 7], ['B', 'dummy', 5, 7], ['C', 'dummy', 8, 7]]);
  awaken(P.G);
  P.B.hp = 1; P.B.armor = 0;
  ult();
  assert.equal(P.B.alive, false);
  P.B.pos = null;
  engine.setActor('G');
  gio.onOrderBegin(engine);
  assert.equal(P.B.alive, true);
  assert.equal(P.B.hp, 1);
  assert.equal(P.B.armor, 0);
  assert.ok(P.B.pos);
  assert.ok(gio.inLoop(engine, P.B));
  const sp = P.G.skillPoints = 3, gold = P.G.gold = 2;
  gio.onUnitActorStart(engine, P.B);
  assert.equal(P.B.alive, false);
  assert.equal(P.G.skillPoints, sp + 1);
  assert.equal(P.G.gold, gold + 1);
  gio.onOrderBegin(engine);
  assert.equal(P.B.alive, true);
  // คนอื่นฆ่าระหว่างรอ = ได้รางวัลเหมือนกัน
  engine.instantDeath(P.B);
  assert.equal(P.G.skillPoints, sp + 2);
  gio.onOrderBegin(engine);
  engine.instantDeath(P.G, true);
  assert.equal(P.B.alive, false, 'คนที่ฟื้นอยู่ตายตาม');
  P.G.alive = false;
  gio.onOrderBegin(engine);
  assert.equal(P.B.alive, false, 'ไม่ฟื้นอีก');
});

test('Return to Zero: ตีโจรุโน่ 50% = ไม่เสียหาย · ผู้ตีกลับช่องต้นตา · ตาเริ่มใหม่ · แต้มคืนตามต้นตา', () => {
  const P = setup([['G', 'giorno_giovanna', 5, 7], ['B', 'dummy', 3, 7]]);
  P.G.giorno.requiem = { until: engine.roundNumber + 2, at: 1 };
  engine.setActor('B');
  timeStop.mark(45);
  engine.moveTo('B', 4, 7);
  P.B.skillPoints = 2; // แต้มที่ใช้ไปแล้วในตานี้
  const g0 = vit(P.G);
  Math.random = () => 0.1;
  engine.attackTarget('B', 'G');
  assert.equal(vit(P.G), g0);
  assert.deepEqual(P.B.pos, { x: 3, y: 7 });
  assert.equal(P.B.skillPoints, 8);
  assert.equal(engine.actorId, 'B');
  assert.equal(engine.action.moved, false);
  assert.deepEqual(calls.queue, ['gioRewind']);
  engine.clearPhaseTimer();
});

test('Return to Zero: ย้อนซ้ำหลายครั้ง เอฟเฟกต์กระดานขึ้นทุกครั้ง (ไม่ถูกพักค้าง)', () => {
  const P = setup([['G', 'giorno_giovanna', 4, 7], ['B', 'dummy', 3, 7]]);
  P.G.giorno.requiem = { until: engine.roundNumber + 2, at: 1 };
  engine.setActor('B');
  timeStop.mark(45);
  Math.random = () => 0.1;
  const beat = engine.skillBeat;
  engine.skillBeat = (sec, fn) => fn();
  try {
    for (let i = 1; i <= 3; i++) {
      engine.attackTarget('B', 'G');
      assert.equal(match.hitFxHold, null);
      assert.equal(engine.actorId, 'B');
      assert.equal(calls.queue.filter((k) => k === 'gioRewind').length, i, 'คลิปทุกครั้ง');
      assert.equal(calls.fx.filter((f) => f.payload && f.payload.kind === 'rewind').length, i, 'เอฟเฟกต์ทุกครั้ง');
      engine.clearPhaseTimer();
      match.gameState = 'ACTION';
    }
  } finally { engine.skillBeat = beat; }
});

test('Return to Zero: ชนะการหยุดเวลา — ดิเอโก้โดนย้อนระหว่างหยุดเวลา = เวลาเดินต่อ · ไม่เสียหาย · ตั้งรับตัวอื่นยังไม่ทำงานตอนหยุดเวลา', () => {
  const P = setup([['G', 'giorno_giovanna', 4, 7], ['D', 'diego_alt', 3, 7]]);
  P.G.giorno.requiem = { until: engine.roundNumber + 2, at: 1 };
  engine.setActor('D');
  timeStop.mark(45);
  engine.timeStop.freeze('D');
  P.D.diego.stopping = true;
  const g0 = vit(P.G);
  Math.random = () => 0.1;
  const combat = require('../../server/combat'); // ตาหยุดเวลาตีปกติไม่ได้ — โจมตีด้วยสกิล/ปืน
  timeStop.guard(() => combat.withEffectSource(P.D, () => combat.dealMixed(P.G, 2)));
  assert.equal(engine.timeStop.frozen(), null, 'เวลาเดินต่อ');
  assert.equal(P.D.diego.stopping, false);
  assert.equal(vit(P.G), g0);
  assert.equal(engine.actorId, 'D');
  assert.deepEqual(calls.queue, ['gioRewind']);
  engine.clearPhaseTimer();
});

test('Return to Zero: ตัวละครหยุดเวลาตัวอื่น (ระบบกลาง) — หยุดเวลากลางตาด้วย freeze ก็ย้อนได้ เวลาเดินต่อ', () => {
  const P = setup([['G', 'giorno_giovanna', 4, 7], ['F', 'dummy', 3, 7]]);
  P.G.giorno.requiem = { until: engine.roundNumber + 2, at: 1 };
  const combat = require('../../server/combat');
  engine.setActor('F');
  timeStop.mark(45);
  engine.timeStop.freeze('F');
  Math.random = () => 0.1;
  const g0 = vit(P.G);
  timeStop.guard(() => combat.withEffectSource(P.F, () => combat.dealMixed(P.G, 2)));
  assert.equal(engine.timeStop.frozen(), null);
  assert.equal(vit(P.G), g0);
  engine.clearPhaseTimer();
});

test('Return to Zero: จุดย้อนจดหลังเริ่มหยุดเวลา = เวลาเดินต่อเอง + ฮุค onFreezeBroken ล้างสถานะดิเอโก้', () => {
  const P = setup([['G', 'giorno_giovanna', 4, 7], ['D', 'diego_alt', 3, 7]]);
  P.G.giorno.requiem = { until: engine.roundNumber + 2, at: 1 };
  const combat = require('../../server/combat');
  engine.setActor('D');
  engine.timeStop.freeze('D');
  P.D.diego.stopping = true;
  timeStop.mark(45);
  Math.random = () => 0.1;
  timeStop.guard(() => combat.withEffectSource(P.D, () => combat.dealMixed(P.G, 2)));
  assert.equal(engine.timeStop.frozen(), null);
  assert.equal(P.D.diego.stopping, false);
  assert.deepEqual(calls.queue, ['gioRewind']);
  engine.clearPhaseTimer();
});

test('Return to Zero: ความตายที่ค้างจากหยุดเวลาไม่ทอยซ้ำตอนเวลาเดินต่อ', () => {
  const P = setup([['G', 'giorno_giovanna', 4, 7], ['D', 'diego_alt', 3, 7], ['C', 'dummy', 8, 8]]);
  P.G.giorno.requiem = { until: engine.roundNumber + 2, at: 1 };
  const combat = require('../../server/combat');
  engine.setActor('D');
  timeStop.mark(45);
  engine.timeStop.freeze('D');
  P.G.hp = 1; P.G.armor = 0;
  Math.random = () => 0.9; // การโจมตีไม่ติดย้อน
  timeStop.guard(() => combat.withEffectSource(P.D, () => combat.dealMixed(P.G, 3)));
  assert.ok(P.G.alive, 'ค้างไว้');
  Math.random = () => 0.1; // ถ้าทอยซ้ำจะติด
  engine.timeStop.unfreeze();
  assert.equal(P.G.alive, false);
  assert.deepEqual(calls.queue, []);
  engine.clearPhaseTimer();
});

test('Return to Zero: ศัตรูกดท่าไม้ตาย = ย้อนทันทีแม้อยู่ไกล · ผลท่าไม่ลง · แต้มคืน', () => {
  const P = setup([['G', 'giorno_giovanna', 8, 7], ['B', 'muimi', 3, 7]]);
  P.G.giorno.requiem = { until: engine.roundNumber + 2, at: 1 };
  P.G.pos = { x: 6, y: 8 };
  P.B.pos = { x: 3, y: 7 };
  engine.setActor('B');
  timeStop.mark(45);
  Math.random = () => 0.99;
  const sp = P.B.skillPoints;
  const g0 = vit(P.G);
  engine.useSkill('B', 'ultimate', [], { dir: 'left' });
  assert.deepEqual(calls.queue, ['gioRewind']);
  assert.equal(P.B.skillPoints, sp, 'แต้มคืน');
  assert.equal(vit(P.G), g0);
  assert.equal(engine.actorId, 'B');
  assert.equal(P.B.skillUsedRound, false, 'เริ่มตาใหม่');
  engine.clearPhaseTimer();
});

test('Return to Zero: ไม่อยู่ร่าง Requiem = กดท่าไม้ตายไม่ย้อน', () => {
  const P = setup([['G', 'giorno_giovanna', 8, 7], ['B', 'muimi', 3, 7]]);
  engine.setActor('B');
  timeStop.mark(45);
  engine.useSkill('B', 'ultimate', [], { dir: 'left' });
  assert.ok(!calls.queue.includes('gioRewind'));
  engine.clearPhaseTimer();
});

test('Return to Zero: ปืน GUTS 100% (ทอยไม่ติดก็ย้อน) · ผลกระสุนไม่ลง · กระสุนคืน', () => {
  const P = setup([['G', 'giorno_giovanna', 4, 7], ['B', 'dummy', 2, 7]]);
  P.G.giorno.requiem = { until: engine.roundNumber + 2, at: 1 };
  P.B.inventory = [{ uid: 'gun', type: 'gutsGun' }, { uid: 'am', type: 'gutsAmmo', ammo: 'thunder' }];
  engine.setActor('B');
  timeStop.mark(45);
  Math.random = () => 0.99;
  const combat = require('../../server/combat');
  timeStop.guard(() => {
    P.B.inventory.pop(); // กระสุนหลุดจากกระเป๋าตอนยิง
    combat.withEffectSource(P.B, () => shop.applyGutsBullet(P.B, { ammo: 'thunder' }, P.G));
  });
  assert.equal(P.B.inventory.length, 2);
  assert.ok(!(P.G.statuses.chaa > 0));
  assert.deepEqual(calls.queue, ['gioRewind']);
  assert.equal(engine.actorId, 'B');
  engine.clearPhaseTimer();
});

test('Return to Zero: นกหวีดเป่าติด 100% · ผลมนต์ไม่ลง · คูลดาวน์นกหวีดคืน', () => {
  const P = setup([['G', 'giorno_giovanna', 4, 7], ['B', 'dummy', 2, 7]]);
  P.G.giorno.requiem = { until: engine.roundNumber + 2, at: 1 };
  engine.setActor('B');
  timeStop.mark(45);
  Math.random = () => 0.99;
  const ready0 = P.B.whistleReady;
  const combat = require('../../server/combat');
  const whistle = require('../../server/whistle');
  assert.equal(typeof whistle.cast, 'function');
  timeStop.guard(() => {
    P.B.whistleReady = engine.roundNumber + 5; // เป่าติดแล้วตั้งคูลดาวน์
    combat.withEffectSource(P.B, () => whistle.cast(P.B, 'judgmentBolt', 1));
  });
  assert.ok(!(P.G.statuses.stun > 0));
  assert.deepEqual(calls.queue, ['gioRewind']);
  assert.equal(P.B.whistleReady, ready0);
  engine.clearPhaseTimer();
});

test('Return to Zero: ทุกอย่างในตานั้นคืนหมด — เหรียญ/ไอเทม/แต้ม/ท่าไม้ตาย/คูลดาวน์นกหวีด', () => {
  const P = setup([['G', 'giorno_giovanna', 4, 7], ['B', 'dummy', 3, 7]]);
  P.G.giorno.requiem = { until: engine.roundNumber + 2, at: 1 };
  P.B.gold = 9; P.B.inventory = [{ uid: 'x', type: 'armor', value: 1 }];
  engine.setActor('B');
  timeStop.mark(45);
  P.B.gold = 4; P.B.inventory = []; P.B.ultRound = engine.roundNumber;
  Math.random = () => 0.9; // 100% จากท่าไม้ตาย ไม่ใช่การทอย
  const g0 = vit(P.G);
  engine.attackTarget('B', 'G');
  assert.equal(vit(P.G), g0);
  assert.equal(P.B.gold, 9);
  assert.deepEqual(P.B.inventory.map((it) => it.uid), ['x']);
  assert.equal(P.B.skillPoints, 8);
  assert.notEqual(P.B.ultRound, engine.roundNumber);
  engine.clearPhaseTimer();
});

test('Return to Zero: ตีพลัง 0 ก็ย้อน · ทอยก่อนหลบ · ตาย/ท่าพื้นที่นับต่อคำสั่งเดียว', () => {
  const P = setup([['G', 'giorno_giovanna', 4, 7], ['B', 'dummy', 3, 7]]);
  P.G.giorno.requiem = { until: engine.roundNumber + 2, at: 1 };
  engine.setActor('B');
  timeStop.mark(45);
  Math.random = () => 0.1;
  const combat = require('../../server/combat');
  assert.throws(() => combat.withEffectSource(P.B, () => combat.notifyAttacked(P.G, P.B, 'strike')), (e) => e.timeStopInterrupt);
  P.G.giorno.rollSeq = null;
  match.tsSnap = null;
  engine.clearPhaseTimer();
});

test('Return to Zero: ทอยไม่ติด = ตีลงปกติ · ใช้ท่าไม้ตายในตานั้น = 100%', () => {
  const P = setup([['G', 'giorno_giovanna', 4, 7], ['B', 'dummy', 3, 7]]);
  P.G.giorno.requiem = { until: engine.roundNumber + 2, at: 1 };
  P.G.armor = 3;
  engine.setActor('B');
  Math.random = () => 0.9;
  assert.equal(gio.counterFires(engine, P.G, P.B), false);
  P.G.giorno.rollSeq = null;
  P.B.ultRound = engine.roundNumber;
  assert.equal(gio.counterFires(engine, P.G, P.B), true);
  P.G.giorno.rollSeq = null;
  P.B.ultRound = 0;
  P.B.summon = { kind: 'x', moon: 'm' };
  Math.random = () => 0;
  assert.equal(gio.counterFires(engine, P.G, P.B), false, 'ฮาคุโนะไม่ย้อน');
  P.B.summon = { kind: 'clone', controlled: true, side: 'B' };
  P.G.giorno.rollSeq = null;
  assert.equal(gio.counterFires(engine, P.G, P.B), true, 'ร่างแยกที่ผู้เล่นคุมย้อน');
  delete P.B.summon;
});

test('ตัดผลสกิล: ธนูที่รอผล / ร่าง / วนตาย อยู่ใน severables', () => {
  const P = setup([['G', 'giorno_giovanna', 4, 7], ['B', 'dummy', 5, 7]]);
  awaken(P.G);
  P.G.giorno.arrowWait = 2;
  P.G.giorno.loop.B = { x: 5, y: 7 };
  const keys = gio.severables(engine, P.G).map((o) => o.key);
  for (const k of ['gioArrow', 'gioRequiem', 'gioLoop']) assert.ok(keys.includes(k), k);
  gio.severables(engine, P.G).find((o) => o.key === 'gioRequiem').cancel();
  assert.equal(gio.reqOn(P.G), false);
  assert.ok(P.G.giorno.arrowReady > engine.roundNumber);
});
