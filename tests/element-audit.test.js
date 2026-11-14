// ตรวจตารางธาตุรายตัวละคร (GRID_PLAN §8.7.1) กับโค้ดจริง — ทุกการกระทำที่มีธาตุต้องให้ธาตุถูก · ตัวปกติต้องไม่มีธาตุ
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const Element = require('../server/element.js');
const combat = require('../server/combat.js');
const CHAR_HOOKS = require('../characters/index.js');
const { CHAR_BY_ID } = require('../characters.js');

const blank = (id, characterId, position) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId: null,
});
function setup(attackerChar) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  engine.players.a = blank('a', attackerChar, 1);
  engine.players.t = blank('t', 'muimi', 2);
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.setJourneyArea(1);
  engine.setRoundNumber(4);
  const P = engine.players;
  P.a.pos = { x: 4, y: 7 }; P.t.pos = { x: 5, y: 7 };
  for (const p of [P.a, P.t]) { p.statuses = {}; p.statusAmt = {}; p.shield = 0; p.hp = 7; p.armor = 3; }
  return P;
}
const saved = { boardFx: engine.boardFx, sfx: engine.sfx };
test.before(() => { engine.boardFx = () => {}; engine.sfx = () => {}; });
test.after(() => { Object.assign(engine, saved); engine.clearPhaseTimer(); });

// ตีปกติจริง (doAttack — ท่อ strike เดียวกับบนกระดาน) แล้วดูคราบบนเป้า
function strikeAura(P) {
  const real = Math.random; Math.random = () => 0.99;
  try { engine.doAttack('a', 't'); } finally { Math.random = real; }
  return Element.auraOf(P.t);
}

test('ตีปกติที่มีธาตุตามร่าง/อาวุธ/การ์ด ให้ธาตุถูกผ่านท่อ strike จริง', () => {
  const cases = [
    ['sora_otosumi', (p) => { Object.assign(p.sora, { myth: true, fire: true }); }, 'fire'],
    ['raido_hikaru', (p) => { p.hikaru.form = 'thunder'; }, 'bolt'],
    ['raido_hikaru', (p) => { p.hikaru.form = 'pandon'; }, 'fire'],
    ['celine', (p) => { p.celine.weapon = 'fire'; }, 'fire'],
    ['celine', (p) => { p.celine.weapon = 'thunder'; }, 'bolt'],
    ['kensaki_kazuma', (p) => { p.kazuma.blade = true; p.kazuma.armed = { kind: 'cards', cards: { blizzard: 1 }, round: engine.roundNumber, at: 1 }; }, 'ice'],
    ['kensaki_kazuma', (p) => { p.kazuma.blade = true; p.kazuma.armed = { kind: 'blast', cards: {}, round: engine.roundNumber, at: 1 }; }, 'bolt'],
    ['kagami', (p) => { p.zect.kickArmed = true; }, 'bolt'],
    ['kusakabe_shinra', () => {}, 'fire'], // ตีปกติไฟเสมอ (GRID_PLAN §7.32)
  ];
  for (const [ch, prep, want] of cases) {
    const P = setup(ch);
    CHAR_HOOKS[ch].resetCombat && CHAR_HOOKS[ch].resetCombat(P.a);
    if (ch === 'kagami') P.a.zect = P.a.zect || {};
    if (ch === 'raido_hikaru') P.a.hikaru = P.a.hikaru || {};
    if (ch === 'kensaki_kazuma') P.a.kazuma = P.a.kazuma || {};
    if (ch === 'celine') P.a.celine = P.a.celine || {};
    if (ch === 'sora_otosumi') P.a.sora = P.a.sora || {};
    prep(P.a);
    assert.equal(Element.attackElementOf(P.a), want, `${ch} ฮุคธาตุ`);
    assert.equal(strikeAura(P), want, `${ch} ตีจริงแล้วเป้าติดคราบ ${want}`);
  }
});

test('Ice Spike: ทุกดาเมจที่ Ice Spike เป็นต้นตอ = น้ำแข็ง (ไม่ต้องครอบเอง) · Roland A Kiss = น้ำแข็ง', () => {
  let P = setup('ice_spike');
  combat.withEffectSource(P.a, () => combat.dealMixed(P.t, 1));
  assert.equal(Element.auraOf(P.t), 'ice');
  P = setup('roland');
  CHAR_HOOKS.roland.resetCombat(P.a);
  P.a.roland.ego = 'kiss'; P.a.statuses.rolandKiss = 2;
  combat.withEffectSource(P.a, () => combat.dealMixed(P.t, 1));
  assert.equal(Element.auraOf(P.t), 'ice');
});

test('เอมิลิโกะ: แจกันใส่น้ำ = น้ำ · ไม้ถูพื้นตีปกติ = ปกติ', () => {
  const hooks = CHAR_HOOKS.emiliko;
  const P = setup('muimi');
  const emi = { ...P.a, characterId: 'emiliko' };
  const orig = hooks.attackElement;
  assert.equal(typeof orig, 'function');
  // st() ของคู่อยู่ที่เจ้าของ (Duo.ownerOf) — ตัวเดี่ยว = ตัวเอง
  emi.shadow = { weapon: 'vase' };
  assert.equal(hooks.attackElement(engine, emi), 'water');
  emi.shadow = { weapon: 'mop' };
  assert.equal(hooks.attackElement(engine, emi), null);
});

test('ตัวละครที่ตารางบอกว่าปกติทั้งตัว: ตีปกติไม่มีธาตุ', () => {
  const plain = ['muimi', 'oberon_summer', 'sliver_bullet', 'kira', 'gyro_zeppeli', 'dio_brando', 'funny_valentine', 'fern', 'ryougi',
    'emiya_shirou', 'yuki_makoto', 'old_truck', 'giorno_giovanna', 'kurenai_otoya', 'freddy_fazbear', 'gray', 'yuna', 'arjuna',
    'emiya_kiritsugu', 'inui_takumi', 'trafalgar_law', 'diego_alt', 'gilgamesh_fake', 'gira_ohger', 'yanma_ohger', 'himeno_ohger',
    'rita_ohger', 'kaguragi_ohger', 'daisuke', 'yaguruma', 'tsurugi'];
  for (const ch of plain) {
    if (!CHAR_BY_ID[ch]) continue;
    const P = setup(ch);
    assert.equal(Element.attackElementOf(P.a), null, `${ch} ตีปกติต้องเป็นปกติ`);
  }
});

test('ทุกตัวละครที่เล่นได้อยู่ในตาราง (ไม่มีตัวที่ตกหล่น)', () => {
  const covered = new Set(['ice_spike', 'sora_otosumi', 'raido_hikaru', 'kate', 'emiliko', 'celine', 'diego_alt', 'kensaki_kazuma', 'trafalgar_law',
    'kagami', 'gilgamesh_fake', 'roland', 'echo', 'muimi', 'oberon_summer', 'sliver_bullet', 'kira', 'gyro_zeppeli', 'dio_brando', 'funny_valentine',
    'fern', 'ryougi', 'emiya_shirou', 'yuki_makoto', 'old_truck', 'giorno_giovanna', 'kurenai_otoya', 'freddy_fazbear', 'gray', 'yuna', 'arjuna',
    'emiya_kiritsugu', 'inui_takumi', 'gira_ohger', 'yanma_ohger', 'himeno_ohger', 'rita_ohger', 'kaguragi_ohger', 'daisuke', 'yaguruma', 'tsurugi', 'kusakabe_shinra']);
  const playable = Object.values(CHAR_BY_ID).filter((c) => !c.hidden && !c.summonOnly && !c.npc).map((c) => c.id);
  const missing = playable.filter((id) => !covered.has(id));
  assert.deepEqual(missing, [], `ตัวที่ยังไม่อยู่ในตารางธาตุ: ${missing.join(', ')}`);
});

test('ของที่ไม่ใช่การตี: กำแพงน้ำแข็งเซลินให้คราบน้ำแข็งกับศัตรูที่ถูกผลัก · ฟ้าผ่า Fodlan เป็นสายฟ้า', () => {
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '../characters/celine.js'), 'utf8');
  assert.match(src, /elementApply\(u, "ice", p\)/);
  const f1 = require('node:fs').readFileSync(require('node:path').join(__dirname, '../server/fodlan/stage1.js'), 'utf8');
  assert.match(f1, /withElement\("bolt"/);
});
