// ลบสกิลติดตัว (noPassive · server/passiveSeal.js) — กลุ่ม c:
//  เคนซากิ คาซุมะ · ทราฟาก้า ลอว์ · ยูกิ มาโคโตะ · คิงโอเจอร์ 5 ตัว · รถบรรทุกเก่า · โจรุโน่ · อรชุน
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');

const H = (id) => engine.CHAR_HOOKS[id];
const blank = (id, characterId, position) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId: null, skillPoints: 0, gold: 0, img: '', ready: true, avatar: 0,
});
// list = [[id, characterId, x, y], ...]
function setup(list) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  list.forEach(([id, ch], i) => { engine.players[id] = blank(id, ch, i + 1); });
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  for (const [id, , x, y] of list) {
    const p = engine.players[id];
    p.pos = { x, y }; p.skillPoints = 0; p.shield = 0; p.statuses = {}; p.statusAmt = {};
    p.hp = engine.maxHpOf(p); p.armor = 3;
  }
  return engine.players;
}
const seal = (p) => { p.statuses.noPassive = 2; };

const realRandom = Math.random;
const saved = {
  triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash,
  sfx: engine.sfx, boardFx: engine.boardFx,
};
test.before(() => {
  engine.triggerCutscene = () => {};
  engine.queueCutscene = () => {};
  engine.skillFlash = () => {};
  engine.sfx = () => {};
  engine.boardFx = () => {};
});
test.after(() => { Object.assign(engine, saved); for (const id of Object.keys(engine.players)) delete engine.players[id]; });
test.afterEach(() => { Math.random = realRandom; engine.clearPhaseTimer(); });

// ---------- อรชุน ----------
test('อรชุน: ความสมบูรณ์แบบ — เพดาน/แต้มจากเป้าติดดีบัฟ/จุติ +4 ปิดเมื่อติด noPassive', () => {
  const P = setup([['A', 'arjuna', 2, 2], ['B', 'dummy', 3, 2]]);
  const h = H('arjuna');
  P.B.statuses.fragile = 2;
  // ไม่ติด
  assert.equal(h.damageCap(engine, P.A, 'strike'), 4);
  h.onStrikeLanded(engine, P.A, P.B);
  assert.equal(P.A.skillPoints, 1);
  // ติด
  seal(P.A);
  assert.equal(h.damageCap(engine, P.A, 'strike'), null);
  assert.deepEqual(h.onStrikeLanded(engine, P.A, P.B), []);
  assert.equal(P.A.skillPoints, 1);
  // ฮุค onJutti ตอนยังติด = ไม่ได้แต้ม +4
  h.onJutti(engine, P.A);
  assert.equal(P.A.skillPoints, 1);
  // ตายจริง: จุติล้างดีบัฟทั้งหมด (รวม noPassive) ก่อนเรียก onJutti → ได้ +4 ตามปกติ
  P.A.statuses.jutti = 1;
  P.A.hp = 0;
  engine.instantDeath(P.A);
  assert.equal(P.A.alive, true);
  assert.equal(P.A.statuses.noPassive, undefined);
  assert.equal(P.A.skillPoints, 5);
});

test('อรชุน: จุติฟื้นตอนไม่ติด = แต้ม +4', () => {
  const P = setup([['A', 'arjuna', 2, 2], ['B', 'dummy', 4, 2]]);
  P.A.statuses.jutti = 1;
  P.A.hp = 0;
  engine.instantDeath(P.A);
  assert.equal(P.A.alive, true);
  assert.equal(P.A.skillPoints, 4);
});

// ---------- ยูกิ ----------
test('ยูกิ: มิตรภาพ — ติด noPassive ตายได้ · ไม่ติดฟื้นทันที', () => {
  const P = setup([['Y', 'yuki_makoto', 2, 2], ['B', 'dummy', 5, 2]]);
  P.Y.hp = 0;
  engine.instantDeath(P.Y);
  assert.equal(P.Y.alive, true);
  assert.equal(P.Y.hp, 3);
  seal(P.Y);
  P.Y.hp = 0;
  engine.instantDeath(P.Y);
  assert.equal(P.Y.alive, false);
});

// ---------- รถบรรทุกเก่า ----------
test('รถบรรทุก: ไพร์ม — ฟื้นเลือด 30% / คริ +25% ปิดเมื่อติด noPassive', () => {
  const P = setup([['T', 'old_truck', 2, 2], ['B', 'dummy', 3, 2]]);
  const h = H('old_truck');
  P.T.oldTruck.form = 'prime';
  Math.random = () => 0;
  // ไม่ติด
  P.T.hp = 3;
  h.onStrikeResolved(engine, P.T, P.B, { dodge: false, skills: [] });
  assert.equal(P.T.hp, 4);
  h.onItemUsed(engine, P.T);
  assert.equal(h.critPct(P.T), 25);
  // ติด: คริที่ได้ไว้ไม่ออกฤทธิ์ · ไม่ฟื้น · ใช้ไอเทมไม่ได้คริใหม่
  seal(P.T);
  assert.equal(h.critPct(P.T), 0);
  h.onStrikeResolved(engine, P.T, P.B, { dodge: false, skills: [] });
  assert.equal(P.T.hp, 4);
  P.T.oldTruck.crit = false;
  h.onItemUsed(engine, P.T);
  assert.equal(P.T.oldTruck.crit, false);
  // ร่าง/พลังโจมตีของออพติมัส (ร่างที่กดแปลง) ไม่กระทบ
  assert.equal(h.damageBonus(engine, P.T, P.B, {}), 1);
});

// ---------- คิงโอเจอร์ ----------
test('คิงโอเจอร์: จอมราชัน — ร่างมนุษย์ฟื้น 2 / สวมเกราะ +1 ปิดเมื่อติด noPassive', () => {
  const P = setup([['G', 'gira_ohger', 2, 2], ['B', 'dummy', 3, 2]]);
  const h = H('gira_ohger');
  P.G.hp = 3;
  h.onEndTurn(engine);
  assert.equal(P.G.hp, 5);
  seal(P.G);
  h.onEndTurn(engine);
  assert.equal(P.G.hp, 5);
  P.G.ohger.armored = true;
  assert.equal(h.damageBonus(engine, P.G, P.B, {}), 0);
  delete P.G.statuses.noPassive;
  assert.equal(h.damageBonus(engine, P.G, P.B, {}), 1);
});

test('คิงโอเจอร์: ความสามารถเฉพาะร่าง ปิดเมื่อติด noPassive', () => {
  const P = setup([
    ['G', 'gira_ohger', 2, 2], ['Y', 'yanma_ohger', 2, 4], ['H', 'himeno_ohger', 2, 6],
    ['R', 'rita_ohger', 6, 2], ['K', 'kaguragi_ohger', 6, 6], ['B', 'dummy', 3, 2],
  ]);
  for (const id of ['G', 'Y', 'H', 'R', 'K']) P[id].ohger.armored = true;
  Math.random = () => 0;
  // ทอมโบ: ตีซ้ำ
  seal(P.Y);
  assert.equal(H('yanma_ohger').extraStrike(engine, P.Y), false);
  delete P.Y.statuses.noPassive;
  assert.equal(H('yanma_ohger').extraStrike(engine, P.Y), true);
  // พาพิยอง: ตรึง
  seal(P.R);
  assert.deepEqual(H('rita_ohger').onStrikeLanded(engine, P.R, P.B), []);
  assert.ok(!(P.B.statuses.rooted > 0));
  delete P.R.statuses.noPassive;
  assert.deepEqual(H('rita_ohger').onStrikeLanded(engine, P.R, P.B), ['ถูกตรึง']);
  // คามาคิริ: ดูดเลือด
  seal(P.H);
  H('himeno_ohger').beforeStrikeHit(engine, P.H, P.B);
  assert.equal(P.H.ohger.preHp.B, undefined);
  delete P.H.statuses.noPassive;
  H('himeno_ohger').beforeStrikeHit(engine, P.H, P.B);
  assert.equal(P.H.ohger.preHp.B, P.B.hp);
  // ฮาจิ: ถอย
  seal(P.K);
  H('kaguragi_ohger').onAttacked(engine, P.K, P.B, 'strike');
  assert.equal(P.K.ohger.flee, null);
  delete P.K.statuses.noPassive;
  P.K.ohger.fleeSeq = -1;
  H('kaguragi_ohger').onAttacked(engine, P.K, P.B, 'strike');
  assert.ok(P.K.ohger.flee);
  // คุวากาตะ: คลื่นดาบไปข้างหลัง
  P.G.ohger.lastDir = 'right';
  seal(P.G);
  assert.equal(H('gira_ohger').afterBoardAttack(engine, P.G), null);
  delete P.G.statuses.noPassive;
  P.G.ohger.lastDir = 'right';
  assert.equal(typeof H('gira_ohger').afterBoardAttack(engine, P.G), 'function');
});

// ---------- โจรุโน่ ----------
test('โจรุโน่: Gold Experience คริ 50% / ตีเพื่อน · เศษเดนมนุษย์ ปิดเมื่อติด noPassive', () => {
  const P = setup([['G', 'giorno_giovanna', 2, 2], ['B', 'dummy', 3, 2]]);
  const h = H('giorno_giovanna');
  assert.equal(h.critPct(P.G), 50);
  assert.equal(h.strikesAllies(P.G), true);
  seal(P.G);
  assert.equal(h.critPct(P.G), 0);
  assert.equal(h.strikesAllies(P.G), false);
  assert.equal(h.allyHealOn(engine, P.G), null);
  // Muda ที่ค้างอยู่ (ท่าไม้ตาย) ยังตีเพื่อนได้
  P.G.giorno.muda = true;
  assert.equal(h.strikesAllies(P.G), true);
  P.G.giorno.muda = false;
  // เศษเดนมนุษย์อย่างแกน่ะ…
  Math.random = () => 0;
  P.G.hp = 2;
  assert.equal(h.fixedStrikeDamage(engine, P.G, P.B, {}), null);
  delete P.G.statuses.noPassive;
  assert.equal(h.fixedStrikeDamage(engine, P.G, P.B, {}), 5);
});

test('โจรุโน่ Requiem: นี่แหละ คือ Requiem (พลังโจมตี/ย้อน) ปิดเมื่อติด noPassive · ระยะเดินร่างคงเดิม', () => {
  const P = setup([['G', 'giorno_giovanna', 2, 2], ['B', 'dummy', 3, 2]]);
  const h = H('giorno_giovanna');
  P.G.giorno.requiem = { until: engine.roundNumber + 2, at: 1 };
  assert.equal(h.damageBonus(engine, P.G), 1);
  assert.equal(h.counterArmed(engine, P.G), true);
  assert.equal(h.critPct(P.G), 70);
  seal(P.G);
  assert.equal(h.damageBonus(engine, P.G), 0);
  assert.equal(h.counterArmed(engine, P.G), false);
  assert.equal(h.critPct(P.G), 0);
  assert.equal(h.mov(P.G), 6);
});

// ---------- คาซุมะ ----------
test('คาซุมะ: ช่างหัวมันสิ — คริ 50% / Blade ตีได้แต้ม ปิดเมื่อติด noPassive', () => {
  const P = setup([['K', 'kensaki_kazuma', 2, 2], ['B', 'dummy', 3, 2]]);
  const h = H('kensaki_kazuma');
  P.K.kazuma.blade = true;
  assert.equal(h.critPct(P.K), 50);
  h.afterStrike(engine, P.K);
  assert.equal(P.K.skillPoints, 1);
  seal(P.K);
  assert.equal(h.critPct(P.K), 0);
  h.afterStrike(engine, P.K);
  assert.equal(P.K.skillPoints, 1);
});

// ---------- ลอว์ ----------
test('ลอว์: ศัลแพทย์แห่งความตาย ปิดเมื่อติด noPassive · ท่าไม้ตายที่รอตียังตีประชิดได้', () => {
  const P = setup([['L', 'trafalgar_law', 4, 4], ['B', 'dummy', 5, 4]]);
  const h = H('trafalgar_law');
  P.L.law.room = { size: 9, x0: 0, y0: 0, x1: 8, y1: 8, cx: 4, cy: 4, seq: 1, at: 1 };
  // ไม่ติด
  assert.ok(h.range(P.L)[1] > 1);
  assert.equal(h.strikeAllows(P.L, P.B), true);
  assert.equal(h.extraStrike(engine, P.L), true);
  assert.equal(h.skillRegen(P.L), 2);
  assert.equal(h.claimsCorpse(P.L, P.B), true);
  h.onStrikeLanded(engine, P.L, P.B);
  assert.deepEqual(P.L.law.marks, ['B']);
  P.L.law.marks = [];
  // ติด
  seal(P.L);
  assert.deepEqual(h.range(P.L), [1, 0]);
  assert.equal(h.strikeAllows(P.L, P.B), false);
  assert.equal(h.strikeZone(P.L), null);
  assert.equal(h.extraStrike(engine, P.L), false);
  assert.equal(h.skillRegen(P.L), 1);
  assert.equal(h.claimsCorpse(P.L, P.B), false);
  assert.deepEqual(h.cutTiles(engine, P.L), []);
  assert.deepEqual(h.shockTargets(engine, P.L), []);
  h.onStrikeLanded(engine, P.L, P.B);
  assert.deepEqual(P.L.law.marks, []);
  // ท่าไม้ตายที่รอตี: ตีประชิดได้
  P.L.law.armed = { kind: 'gamma', round: engine.roundNumber, at: 1 };
  assert.deepEqual(h.range(P.L), [1, 1]);
  assert.equal(h.strikeAllows(P.L, P.B), true);
});
