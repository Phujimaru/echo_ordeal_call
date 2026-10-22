// ตัดผลสกิลที่ทำงานอยู่ (server/sever.js — รากฐานจิตของเรียวกิ · GRID_PLAN §7.17) — ฮุค severables ชุด B:
//  ยูนะ · เกรย์ · ไจโร · ดิเอโก้ · เฟิร์น · วาเลนไทน์ · เซลิน · ทาคุโตะ
//  เปิดผล → latest คืนอันนั้น → cut ปิดผลแบบหมดเวลาเอง (คูลดาวน์ตามปกติ) · ไม่มีอะไรทำงาน = null
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const CH = require('../characters/index.js');
const match = require('../server/match.js');
const timers = require('../server/timers.js');

const realRandom = Math.random;
const blank = (id, characterId, position) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId: null,
});
// list = [[id, characterId, x, y], ...] — ภูมิภาค I (แถว 7/8 โล่ง)
function setup(list) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, ch], i) => { engine.players[id] = blank(id, ch, i + 1); });
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setJourneyArea(1);
  engine.setCycleShift(0);
  engine.setShopPos(null);
  engine.setRoundNumber(4);
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.skillPoints = 8; p.skillUsedRound = false; p.shield = 0;
    p.statuses = {}; p.statusAmt = {};
  }
  return engine.players;
}
// ตัวจับเวลาของเฟส = เก็บ callback แล้วเรียกเองจนฉากจบ (แบบ tests/characters/ryougi.test.js)
function drain(fn, max = 20) {
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
const apply = (p, tier, targets = [], opts = {}) => CH[p.characterId].applyInstantSkill(engine, p, tier, targets, opts);
const latestKey = (p) => { const e = engine.sever.latest(engine, p); return e ? e.key : null; };
const vit = (p) => (p.hp || 0) + (p.armor || 0);

const saved = {
  triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash,
  notifyTransform: engine.notifyTransform, sfx: engine.sfx, boardFx: engine.boardFx, boardFxTo: engine.boardFxTo,
};
const calls = { fx: [] };
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = () => {};
  engine.skillFlash = () => {};
  engine.notifyTransform = () => {};
  engine.sfx = () => {};
  engine.boardFx = (event, payload) => calls.fx.push({ event, payload });
  engine.boardFxTo = (ids, event, payload) => calls.fx.push({ event, payload });
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.beforeEach(() => { calls.fx = []; Math.random = () => 0.99; });
test.afterEach(() => {
  Math.random = realRandom;
  engine.clearPhaseTimer();
  match.cutsceneQueue.length = 0; match.afterCutscene = []; match.skillBeats = [];
});

test('ไม่มีผลสกิลทำงาน = null ทุกตัว (ฮุคถามได้กับทุกคน · คนอื่น = [])', () => {
  const ids = ['yuna', 'gray', 'gyro_zeppeli', 'diego_alt', 'fern', 'funny_valentine', 'celine', 'takuto'];
  const P = setup(ids.map((ch, i) => [`p${i}`, ch, (i % 4) * 3 + 1, 7 + Math.floor(i / 4)]));
  for (const p of Object.values(P)) {
    assert.equal(engine.sever.latest(engine, p), null, p.characterId);
    assert.equal(engine.sever.cut(engine, p), null, p.characterId);
  }
  for (const ch of ids) assert.deepEqual(CH[ch].severables(engine, P.p0.characterId === ch ? P.p1 : P.p0), [], `${ch} กับคนอื่น`);
});

test('ยูนะ: เพลง → เงาของเสียง (รอ) → ร้อนแรงดังไฟ · ตัดอันล่าสุดทีละอย่าง · ไอดอลกลับร่าง + คูลดาวน์แบบหมดเวลาเทิร์นนี้', () => {
  const P = setup([['Y', 'yuna', 2, 7], ['B', 'dummy', 9, 7]]);
  const Y = P.Y, s = Y.yuna;
  apply(Y, 'secondary', [], { form: 'delete' });
  assert.equal(latestKey(Y), 'song');
  s.blessUsed = true;
  apply(Y, 'basic');
  assert.equal(latestKey(Y), 'vanish', 'เงาของเสียงที่รอเทิร์นหน้า');
  assert.deepEqual(engine.sever.cut(engine, Y), { key: 'vanish', label: 'เงาของเสียง' });
  assert.equal(s.vanishRound, 0);
  assert.ok(CH.yuna.canRide(engine, Y), 'ไม่มีเงาค้าง = ขี่ได้');
  assert.equal(latestKey(Y), 'song');
  assert.deepEqual(engine.sever.cut(engine, Y), { key: 'song', label: 'Delete' });
  assert.equal(s.song, 'rest');
  assert.equal(CH.yuna.songOn(engine, Y), null);
  // ร้อนแรงดังไฟ
  apply(Y, 'ultimate');
  assert.ok(CH.yuna.ultOn(engine, Y));
  assert.deepEqual(engine.sever.cut(engine, Y), { key: 'idol', label: 'ร้อนแรงดังไฟ' });
  assert.ok(!CH.yuna.ultOn(engine, Y), 'กลับร่างทันที');
  assert.equal(CH.yuna.characterPub(engine, Y), null);
  assert.equal(CH.yuna.skillMusic(engine, Y), null, 'เพลงไอดอลหยุด');
  // หมดเวลาเองจบเทิร์น U → กดได้อีก U + 1 + 3 · ตัดเทิร์น R = เหมือนหมดเวลาเทิร์น R
  assert.equal(s.ultReady, engine.roundNumber + 1 + CH.yuna.ULT_CD);
  assert.equal(CH.yuna.yunaState(engine, Y).idol, 0);
  assert.ok(!CH.yuna.canUseSkill(engine, Y, 'ultimate'), 'ติดคูลดาวน์');
  assert.ok(calls.fx.some((f) => f.event === 'yunaFx' && f.payload.kind === 'idolEnd'));
  assert.equal(engine.sever.latest(engine, Y), null);
});

test('เกรย์: จงบ้าคลั่ง + รองโกมิเนียตที่ชาร์จ · ตัดชาร์จ = สลาย ไม่ยิง คูลดาวน์นับจากเทิร์นนี้ · แล้วตัดจงบ้าคลั่ง', () => {
  const P = setup([['G', 'gray', 2, 7], ['B', 'dummy', 9, 7]]);
  const G = P.G, s = G.gray, r = engine.roundNumber;
  apply(G, 'secondary');
  assert.equal(latestKey(G), 'frenzy');
  apply(G, 'ultimate', [], { dir: 'right' });
  assert.ok(s.charge);
  assert.deepEqual(engine.sever.cut(engine, G), { key: 'charge', label: 'รองโกมิเนียต' });
  assert.equal(s.charge, null);
  assert.equal(s.ultReady, r + CH.gray.ULT_CD);
  assert.equal(CH.gray.skillMusic(engine, G), null);
  assert.equal(CH.gray.mov(G), null, 'เดินได้อีก');
  assert.equal(CH.gray.grayState(engine, G).charge, null, 'แนวลำแสงหาย');
  assert.deepEqual(engine.sever.cut(engine, G), { key: 'frenzy', label: 'จงบ้าคลั่ง' });
  assert.equal(s.frenzy, 0);
  assert.equal(CH.gray.critPct(G), 0);
  assert.equal(s.graveReady, r + CH.gray.GRAVE_CD, 'คูลดาวน์ Grave นับจากตอนกดอยู่แล้ว');
  assert.equal(engine.sever.latest(engine, G), null);
});

test('ไจโร: การหมุนที่สมบูรณ์แบบที่เสริมค้าง → ตัด = เสริมหมด (คูลดาวน์นับจากตอนกด)', () => {
  const P = setup([['J', 'gyro_zeppeli', 2, 7], ['B', 'dummy', 9, 7]]);
  const J = P.J, s = J.gyro;
  s.golden = 30;
  apply(J, 'ultimate');
  assert.ok(s.empowered);
  assert.deepEqual(engine.sever.cut(engine, J), { key: 'empowered', label: 'การหมุนที่สมบูรณ์แบบ' });
  assert.equal(s.empowered, false);
  assert.equal(s.ultReadyRound, engine.roundNumber + CH.gyro_zeppeli.ULT_CD);
  assert.equal(engine.sever.latest(engine, J), null);
});

test('ดิเอโก้: เดอะเวิลด์ที่ตั้งรับ → ตีของเรียวกิที่มีรากฐานจิต = ตัดก่อนดาเมจ · ไม่หยุดเวลา · ดาเมจลงตามปกติ', () => {
  const P = setup([['D', 'diego_alt', 3, 8], ['R', 'ryougi', 2, 8]]);
  const D = P.D, s = D.diego;
  s.cunning = 6; s.mounted = false; // ไม่มีม้ารับดาเมจ
  engine.setActor('D');
  engine.useSkill('D', 'ultimate', []);
  match.skillBeats = [];
  assert.ok(CH.diego_alt.counterArmed(engine, D));
  assert.equal(latestKey(D), 'world');
  engine.setActor('R');
  P.R.statuses.ryougiMind = 3;
  const before = vit(D);
  drain(() => engine.attackTarget('R', 'D'));
  assert.equal(s.armedRound, 0, 'ตั้งรับถูกตัด');
  assert.ok(!CH.diego_alt.counterArmed(engine, D));
  assert.ok(!s.stopping, 'ไม่เข้าตาหยุดเวลา');
  assert.ok(!(match.extraTurns || []).length, 'ไม่มีตาพิเศษค้าง');
  assert.ok(!match.timeFreeze);
  assert.ok(vit(D) < before, 'ดาเมจของการตีครั้งนั้นลงจริง');
  assert.ok(calls.fx.some((f) => f.event === 'ryougiFx' && f.payload.kind === 'sever' && f.payload.severed === 'เดอะเวิลด์'));
  assert.equal(s.worldReady, engine.roundNumber + CH.diego_alt.WORLD.cd, 'คูลดาวน์นับจากตอนกด');
  // จบเทิร์น: ไม่โดนตีแต่ถูกตัดแล้ว = ไม่มีตาหยุดเวลาต้นเทิร์นหน้า
  CH.diego_alt.onEndTurn(engine);
  assert.equal(s.pendingNormal, false);
});

test('ดิเอโก้: ไม่มีรากฐานจิต = เดอะเวิลด์ทำงานตามเดิม (ตัดการตี → ตาหยุดเวลา)', () => {
  const P = setup([['D', 'diego_alt', 3, 8], ['R', 'ryougi', 2, 8]]);
  const D = P.D, s = D.diego;
  s.cunning = 6; s.mounted = false;
  engine.setActor('D');
  engine.useSkill('D', 'ultimate', []);
  match.skillBeats = [];
  engine.setActor('R');
  const before = vit(D);
  try {
    drain(() => engine.attackTarget('R', 'D'));
    assert.equal(vit(D), before, 'ไม่มีรากฐานจิต = การตีถูกตัด');
    assert.equal(engine.actorId, 'D', 'ตาหยุดเวลาแทรก');
    assert.ok(D.diego.stopping, 'ย้อนสถานะแล้ว (p.diego เป็นอ็อบเจกต์ใหม่) · เข้าตาหยุดเวลา');
  } finally { match.timeFreeze = null; match.extraTurns = []; D.diego.stopping = false; }
});

test('ดิเอโก้: ตาหยุดเวลาที่รอต้นเทิร์นหน้า (ไม่โดนตี) ก็ตัดได้', () => {
  const P = setup([['D', 'diego_alt', 3, 8], ['R', 'ryougi', 2, 8]]);
  const D = P.D, s = D.diego;
  s.pendingNormal = true; s.worldSever = engine.severStamp();
  assert.equal(latestKey(D), 'worldNext');
  engine.sever.cut(engine, D);
  assert.equal(s.pendingNormal, false);
  CH.diego_alt.onOrderBegin(engine);
  assert.ok(!(match.extraTurns || []).some((e) => e.id === 'D' && e.kind === 'normal'));
});

test('เฟิร์น: เพิ่มระยะ → ซ่อนเร้นมานา · ตัดซ่อนเร้น = ออกแบบกดยกเลิก (ไม่สตั้น · คูลดาวน์ 4) · แล้วเพิ่มระยะ · ร่ายต่อเนื่อง', () => {
  const P = setup([['F', 'fern', 2, 7], ['B', 'dummy', 9, 7]]);
  const F = P.F, s = F.fern, r = engine.roundNumber;
  s.concealReady = 0;
  apply(F, 'secondary');
  assert.equal(latestKey(F), 'boost');
  apply(F, 'ultimate');
  assert.ok(s.conceal);
  assert.deepEqual(engine.sever.cut(engine, F), { key: 'conceal', label: 'ซ่อนเร้นมานา' });
  assert.equal(s.conceal, null);
  assert.equal(s.concealReady, r + CH.fern.CONCEAL_CD);
  assert.equal(s.stunPending, false, 'ไม่สตั้น');
  assert.ok(!CH.fern.stealthed(F));
  assert.deepEqual(engine.sever.cut(engine, F), { key: 'boost', label: 'เพิ่มระยะ' });
  assert.equal(s.boost, false);
  assert.equal(CH.fern.range(F), null, 'ระยะตีกลับปกติ');
  assert.equal(s.boostReady, r + CH.fern.BOOST_CD);
  apply(F, 'basic');
  assert.equal(latestKey(F), 'cast');
  engine.sever.cut(engine, F);
  assert.equal(s.extra, 0);
  assert.equal(engine.sever.latest(engine, F), null);
});

test('วาเลนไทน์: หลบสายตา / ร่างแยก / ตัวเหมือน / กระดานคู่ขนาน — ตัดอันล่าสุด', () => {
  const P = setup([['V', 'funny_valentine', 2, 7], ['B', 'dummy', 4, 7]]);
  const V = P.V, s = V.valentine, r = engine.roundNumber;
  const alive = (kind) => Object.values(engine.players).filter((u) => u.summon && u.alive && u.summon.kind === kind);
  // หลบสายตา
  apply(V, 'basic');
  assert.ok(s.veil && V.dim);
  assert.deepEqual(engine.sever.cut(engine, V), { key: 'veil', label: 'หลบสายตา' });
  assert.equal(s.veil, null);
  assert.equal(V.dim, null);
  assert.equal(s.veilReady, r + CH.funny_valentine.VEIL.cd);
  // ร่างแยก
  apply(V, 'ultimate', [], { form: 'selves' });
  assert.equal(alive('clone').length, 3);
  assert.equal(latestKey(V), 'selves');
  engine.sever.cut(engine, V);
  assert.equal(alive('clone').length, 0);
  // ตัวเหมือนของรู้จักตัวเองฯ
  apply(V, 'ultimate', ['B'], { form: 'know' });
  assert.equal(alive('double').length, 1);
  assert.match(latestKey(V), /^know:/);
  engine.sever.cut(engine, V);
  assert.equal(alive('double').length, 0);
  // กระดานคู่ขนาน
  apply(V, 'ultimate', ['B'], { form: 'parallel', dir: 'right' });
  assert.ok(s.parallel && P.B.dim && V.dim);
  assert.equal(alive('double').length, 1);
  assert.deepEqual(engine.sever.cut(engine, V), { key: 'parallel', label: 'จงปลาบปลื้ม' });
  assert.equal(s.parallel, null);
  assert.equal(P.B.dim, null);
  assert.equal(V.dim, null);
  assert.equal(alive('double').length, 0);
  assert.equal(engine.sever.latest(engine, V), null);
  assert.equal(s.ultReady.parallel, r + CH.funny_valentine.ULT_CD, 'คูลดาวน์นับจากตอนกดอยู่แล้ว');
});

test('เซลิน: ราชาดอกไม้ → ตัด = หมดทันที · คูลดาวน์ 3 นับหลังบัฟหมด (เทิร์นนี้ + 4)', () => {
  const P = setup([['C', 'celine', 2, 7], ['B', 'dummy', 9, 7]]);
  const C = P.C, r = engine.roundNumber;
  apply(C, 'ultimate');
  assert.ok(CH.celine.kingOn(C));
  assert.equal(C.celine.ultReady, r + CH.celine.ULT_CD);
  assert.deepEqual(engine.sever.cut(engine, C), { key: 'king', label: 'ราชาดอกไม้' });
  assert.ok(!CH.celine.kingOn(C));
  assert.ok(!CH.celine.flowerWalk(C));
  assert.equal(C.celine.ultReady, r + 4);
  assert.equal(CH.celine.celineState(engine, C).ultCd, 4);
  assert.equal(engine.sever.latest(engine, C), null);
});

test('ทาคุโตะ (ปิดใช้งาน): ดาบแต่ละเล่ม · ดาบแห่งการพิพากษาแยกกลับ 2 เล่ม', () => {
  const P = setup([['T', 'takuto', 2, 7], ['B', 'dummy', 9, 7]]);
  const T = P.T, s = T.takuto;
  s.form = 'tauburn';
  apply(T, 'basic', [], { form: 'emerald' });
  apply(T, 'basic', [], { form: 'sapphire' });
  assert.equal(latestKey(T), 'sapphire');
  // รวมร่าง (ช่วงมิติพังทลาย) — จำลองสถานะ
  s.judgment = true; s.sever.judgment = engine.severStamp();
  assert.deepEqual(engine.sever.cut(engine, T), { key: 'judgment', label: 'ดาบแห่งการพิพากษา' });
  assert.equal(s.judgment, false);
  assert.ok(T.statuses[CH.takuto.EMERALD] && T.statuses[CH.takuto.SAPPHIRE], 'ดาบยังอยู่ทั้ง 2 เล่ม');
  assert.deepEqual(engine.sever.cut(engine, T), { key: 'sapphire', label: 'ดาบแซฟไฟร์' });
  assert.ok(!T.statuses[CH.takuto.SAPPHIRE]);
  assert.ok(T.statuses[CH.takuto.EMERALD]);
  assert.equal(latestKey(T), 'emerald');
  engine.sever.cut(engine, T);
  assert.equal(engine.sever.latest(engine, T), null);
});
