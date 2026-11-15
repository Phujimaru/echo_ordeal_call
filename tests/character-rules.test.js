// กฎของผู้ใช้ที่ตัวละคร "ทุกตัว" ต้องผ่าน — วนจาก CHARACTERS อัตโนมัติ ตัวใหม่ถูกเช็กทันทีโดยไม่ต้องเขียนเทสต์เพิ่ม
//  · ข้อมูลครบ (ชื่อ/เพศ/ระยะ/สกิล) · มีโมดูลฮุคจริง
//  · ผลค้างต้องตัดได้ (ฮุค severables — ตัดผลสกิลของผู้นำตระกูลเรียวกิ server/sever.js)
//  · สกิลหลายตัวเลือก: ทุกตัวเลือกมีคำอธิบายตอนชี้ (desc — กฎผู้ใช้ 2026-10-19)
//  · สกิลหลบได้ทุกท่า เว้นผู้ใช้ติด "แม่นยำ" (กฎผู้ใช้ 2026-11-05) — ลองกดทุกช่องใส่เป้าที่หลบหลีก 100%
//  · ไฟล์ภาพ/วีดีโอที่อ้างใน characters.js มีอยู่จริง (สื่ออยู่ใน .gitignore — ใช้โฟลเดอร์ของ checkout หลักถ้า worktree ไม่มี)
process.env.JOURNEY_START_SECONDS = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { engine } = require('../server.js');
const { CHARACTERS } = require('../characters.js');
const HOOKS = require('../characters/index.js');

const playable = CHARACTERS.filter((c) => !c.hidden);
const TIERS = ['basic', 'secondary', 'ultimate'];
// ชนิดพื้นที่ที่ server/phases/action.js (resolveArea / areaTiles) รู้จัก
const AREA_KINDS = new Set(['self', 'field', 'tile', 'target', 'aoe', 'line']);

// ไม่ต้องมี severables: Echo ไม่มีผลค้างของตัวเอง (สวมร่างแล้วใช้ฮุคของร่างนั้น) · เรียวกิเป็นคนตัดเอง
const NO_SEVERABLES = new Set(['echo', 'ryougi']);
// ท่าที่ยังทะลุหลบหลีก — ออกแบบไว้ก่อนกฎ 2026-11-05 · รอผู้ใช้ตัดสิน (ห้ามเพิ่มรายการใหม่เอง)
const DODGE_PENDING = new Set(['sliver_bullet.secondary', 'sliver_bullet.ultimate', 'diego_alt.secondary']);

const blank = (id, characterId, position) => ({
  id, name: id, position, characterId, alive: true, connected: true, cards: [], statuses: {}, statusAmt: {},
  seen: {}, cutsceneShown: {}, inventory: [], teamId: null,
});
function duel(charId) {
  for (const id of Object.keys(engine.players)) delete engine.players[id];
  engine.players.A = blank('A', charId, 1);
  engine.players.B = blank('B', 'muimi', 2);
  engine.setGameMode('ffa');
  engine.startMatch();
  engine.clearPhaseTimer();
  engine.placeOnBoard(1);
  const A = engine.players.A, B = engine.players.B;
  A.pos = { x: 5, y: 5 }; B.pos = { x: 6, y: 5 };
  return { A, B };
}
const saved = { triggerCutscene: engine.triggerCutscene, queueCutscene: engine.queueCutscene, skillFlash: engine.skillFlash, boardFx: engine.boardFx };
test.before(() => { engine.triggerCutscene = () => {}; engine.queueCutscene = () => {}; engine.skillFlash = () => {}; engine.boardFx = () => {}; });
test.after(() => { Object.assign(engine, saved); engine.clearPhaseTimer(); for (const id of Object.keys(engine.players)) delete engine.players[id]; });

test('ทะเบียน: id ไม่ซ้ำ · ทุกตัวมีโมดูลฮุค · ไม่มีฮุคกำพร้า', () => {
  const ids = CHARACTERS.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, 'id ซ้ำ');
  for (const id of ids) assert.ok(HOOKS[id], `${id} ไม่มีโมดูลใน characters/index.js`);
  for (const id of Object.keys(HOOKS)) if (id !== 'kishinami_hakuno') assert.ok(ids.includes(id), `ฮุค ${id} ไม่มีใน characters.js`);
});

for (const c of playable) {
  test(`ข้อมูล ${c.id}: ชื่อ · เพศ · ระยะ · สกิล`, () => {
    assert.ok(c.name, 'ไม่มีชื่อ');
    assert.ok(['f', 'm', 'n'].includes(c.gender), `gender "${c.gender}" (characters/_gender.js)`);
    assert.ok(Number.isFinite(c.mov) && c.mov >= 0, 'mov');
    // [1, 0] = ตีปกติไม่ได้โดยตั้งใจ (Ice Spike · ลอว์นอก Room)
    const noStrike = Array.isArray(c.range) && c.range[0] === 1 && c.range[1] === 0;
    assert.ok(Array.isArray(c.range) && c.range.length === 2 && (noStrike || c.range[0] <= c.range[1]), 'range [min, max]');
    for (const t of TIERS) {
      const s = c[t];
      if (!s) continue;
      assert.ok(s.name, `${t}.name`);
      assert.ok(Number.isFinite(s.cost) && s.cost >= 0, `${t}.cost`);
      if (s.area) assert.ok(AREA_KINDS.has(s.area.kind), `${t}.area.kind "${s.area.kind}" ไม่รู้จัก — เพิ่มใน AREA_KINDS ถ้าเป็นชนิดใหม่จริง`);
    }
  });

  test(`ฮุค ${c.id}: severables (ตัดผลสกิลได้)`, () => {
    const hook = HOOKS[c.id];
    if (NO_SEVERABLES.has(c.id)) return;
    assert.equal(typeof hook.severables, 'function', `${c.id} ต้องมีฮุค severables (server/sever.js)`);
    const { A } = duel(c.id);
    const list = hook.severables(engine, A);
    assert.ok(list == null || Array.isArray(list), 'severables ต้องคืน array');
    engine.clearPhaseTimer();
  });

  test(`ปุ่มหลายตัวเลือก ${c.id}: ทุกตัวเลือกมี desc`, () => {
    duel(c.id);
    const me = engine.buildStateFor('A').players.find((p) => p.id === 'A');
    const ch = me && me.character;
    for (const t of TIERS) {
      const s = ch && ch[t];
      if (!s || !Array.isArray(s.choices)) continue;
      for (const o of s.choices) {
        assert.ok(o && o.name, `${t}: ตัวเลือกไม่มีชื่อ`);
        assert.ok(typeof o.desc === 'string' && o.desc.trim(), `${t} → ${o.name}: ไม่มี desc ตอนชี้`);
      }
    }
    engine.clearPhaseTimer();
  });

  test(`หลบได้ ${c.id}: ทุกสกิลไม่ทะลุหลบหลีก 100%`, () => {
    const origErr = console.error;
    console.error = () => {};
    try {
      for (const t of TIERS) {
        if (!c[t] || DODGE_PENDING.has(`${c.id}.${t}`)) continue;
        const { A, B } = duel(c.id);
        A.skillPoints = 12;
        B.statuses = { evade: 9 }; B.statusAmt = { evade: 100 };
        const hp = B.hp, armor = B.armor;
        engine.setActor('A');
        try { engine.useSkill('A', t, ['B'], { dir: 'right', tile: { x: 6, y: 5 } }); } catch { /* ท่าที่ต้องเลือกค่าอื่น — เช็กแค่ว่าไม่ทะลุหลบ */ }
        assert.ok(B.alive && B.hp >= hp && B.armor >= armor, `${c.id}.${t} ทำดาเมจทะลุหลบหลีก 100% (hp ${hp}→${B.hp} เกราะ ${armor}→${B.armor})`);
        engine.clearPhaseTimer();
      }
    } finally { console.error = origErr; engine.clearPhaseTimer(); }
  });
}

// โฟลเดอร์สื่อ: worktree ไม่มี client/public/characters (gitignore) → ใช้ของ checkout หลัก
function publicRoot() {
  const local = path.join(__dirname, '..', 'client', 'public');
  if (fs.existsSync(path.join(local, 'characters'))) return local;
  try {
    const common = execSync('git rev-parse --git-common-dir', { cwd: __dirname, encoding: 'utf8' }).trim();
    const main = path.join(path.resolve(__dirname, common), '..', 'client', 'public');
    if (fs.existsSync(path.join(main, 'characters'))) return main;
  } catch { /* ไม่ใช่ git checkout */ }
  return null;
}
test('ไฟล์สื่อที่ characters.js อ้างถึงมีอยู่จริง', (t) => {
  const root = publicRoot();
  if (!root) { t.skip('ไม่มีโฟลเดอร์สื่อตัวละครในเครื่องนี้'); return; }
  const missing = [];
  const walk = (o, where) => {
    if (typeof o === 'string') {
      if (/^\/characters\/.+\.(webp|png|jpe?g|gif|mp4|webm|mp3|ogg)$/i.test(o) && !fs.existsSync(path.join(root, o))) missing.push(`${where}: ${o}`);
      return;
    }
    if (o && typeof o === 'object') for (const k of Object.keys(o)) walk(o[k], where);
  };
  for (const c of playable) walk(c, c.id);
  assert.deepEqual(missing, []);
});
