// นกหวีดอัญเชิญมนต์อสูรเทพ (server/whistle.js — ช่องพิเศษที่ 6 ของกระเป๋า · ผู้ใช้ส่งสเปก 2026-11-03)
//  แผนที่ภูมิภาค I (14×14)
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../server.js');
const match = require('../server/match.js');
const Board = require('../server/board.js');
const Whistle = require('../server/whistle.js');

test.beforeEach(() => {
  for (const k of Object.keys(engine.players)) delete engine.players[k];
  engine.setShopPos(null);
  engine.setGameState('PLAYING');
  engine.setRoundNumber(5);
  match.board = { area: 1 };
  match.turnOrder = [];
  match.actorIndex = 0;
  match.gameMode = 'ffa';
  delete process.env.ECHO_DEV_WHISTLE;
});
test.afterEach(() => { engine.clearPhaseTimer(); match.cutsceneQueue.length = 0; match.afterCutscene.length = 0; match.skillBeats.length = 0; });

let uid = 0;
function mk(pos, over = {}) {
  const id = `w${++uid}`;
  const p = Object.assign({
    id, name: id, alive: true, characterId: 'dummy', hp: 7, armor: 2, skillPoints: 0,
    gold: 0, inventory: [], cards: [], locked: false, statuses: {}, statusAmt: {}, cutsceneShown: {}, seen: {},
    dmgHp: 0, dmgArmor: 0, whistleReady: 0, pos: pos ? { ...pos } : null,
  }, over);
  engine.players[id] = p;
  return p;
}
const MAP = () => Board.mapOf(1);
function freeSpot(near) {
  const m = MAP();
  for (let r = 0; r < 14; r++) for (let y = near.y - r; y <= near.y + r; y++) for (let x = near.x - r; x <= near.x + r; x++) {
    if (Board.inBounds(m, x, y) && !m.terrain[Board.key(x, y)] && !(m.special && m.special[Board.key(x, y)])
      && !Object.values(engine.players).some((p) => p.pos && p.pos.x === x && p.pos.y === y)) return { x, y };
  }
  return null;
}

test('โอกาสติด: ปกติ 20% · ต่ำกว่าครึ่ง 70% · เหลือ 1 = 100% (คิดจากเลือดสูงสุดของตัวนั้น)', () => {
  const p = mk(null, { hp: 7 });
  assert.equal(Whistle.chanceOf(p), 20);
  p.hp = 4; assert.equal(Whistle.chanceOf(p), 20, '4/7 ยังไม่ต่ำกว่าครึ่ง');
  p.hp = 3; assert.equal(Whistle.chanceOf(p), 70);
  p.hp = 1; assert.equal(Whistle.chanceOf(p), 100);
});

test('เป่าไม่ติด: เสียพลังชีวิต 1 ไม่สนเกราะ · เดินไม่ได้แล้ว · คูลดาวน์ 1 เทิร์น', (t) => {
  const p = mk(freeSpot({ x: 3, y: 3 }), { hp: 7, armor: 2 });
  engine.setActor(p.id);
  t.mock.method(Math, 'random', () => 0.99);
  assert.equal(Whistle.blow(p.id), true);
  assert.equal(p.hp, 6);
  assert.equal(p.armor, 2);
  assert.equal(match.action.locked, true);
  assert.equal(Whistle.cooldownLeft(p), 2, 'เทิร์นหน้าเป่าไม่ได้');
  assert.equal(Whistle.canBlow(p), false);
  engine.setRoundNumber(7);
  engine.setActor(p.id);
  assert.equal(Whistle.canBlow(p), true);
});

test('เป่าติด: คูลดาวน์ 10 เทิร์น · คลิปเต็มจอทุกครั้ง · เป่าได้เฉพาะตาตัวเอง', () => {
  process.env.ECHO_DEV_WHISTLE = 'tsunami';
  const p = mk(freeSpot({ x: 3, y: 3 }));
  assert.equal(Whistle.blow(p.id), false, 'ไม่ใช่ตาตัวเอง');
  engine.setActor(p.id);
  assert.equal(Whistle.blow(p.id), true);
  assert.equal(Whistle.cooldownLeft(p), 11);
  assert.equal(engine.gameState, 'CUTSCENE');
  assert.equal(match.cutsceneInfo && match.cutsceneInfo.title, 'TSUNAMI');
  p.cutsceneShown.divineTsunami = true; // เคยเห็นแล้วก็ยังเล่นเต็มจอ
  engine.clearPhaseTimer(); match.cutsceneQueue.length = 0; match.afterCutscene.length = 0;
  p.whistleReady = 0; engine.setActor(p.id);
  assert.equal(Whistle.blow(p.id), true);
  assert.equal(engine.gameState, 'CUTSCENE');
});

test('Cross Winds: ผลักศัตรูออกห่างจนสุดทาง + ถูกตรึง · เพื่อนร่วมทีมไม่โดน', () => {
  const p = mk(freeSpot({ x: 7, y: 7 }));
  const foe = mk(freeSpot({ x: p.pos.x + 1, y: p.pos.y }));
  const mate = mk(freeSpot({ x: p.pos.x - 1, y: p.pos.y }));
  t_team(p, mate);
  engine.setActor(p.id);
  const before = { ...foe.pos }, mateAt = { ...mate.pos };
  engine.withEffectSource(p, () => Whistle.cast(p, 'crossWinds', 1));
  assert.ok(Math.abs(foe.pos.x - p.pos.x) > Math.abs(before.x - p.pos.x), 'ถูกผลักออกไป');
  assert.ok(foe.statuses.rooted > 0);
  assert.deepEqual(mate.pos, mateAt);
  assert.ok(!mate.statuses.rooted);
});
function t_team(...ps) {
  // โหมดทีม: ใส่ teamId เดียวกัน + เปิดโหมดทีม
  for (const q of ps) q.teamId = 'A';
  match.gameMode = 'duo';
}

test('Tsunami: รวบศัตรูเข้ากลาง + พื้นเปียกทั่วแผนที่', () => {
  match.gameMode = 'ffa';
  const p = mk(freeSpot({ x: 1, y: 1 }));
  const foe = mk(freeSpot({ x: 12, y: 12 }));
  engine.setActor(p.id);
  const d0 = (foe.pos.x - 6.5) ** 2 + (foe.pos.y - 6.5) ** 2;
  engine.withEffectSource(p, () => Whistle.cast(p, 'tsunami', 1));
  assert.ok((foe.pos.x - 6.5) ** 2 + (foe.pos.y - 6.5) ** 2 < d0);
  assert.ok(Object.keys(match.board.wet || {}).length > 20);
});

test('Diamond Dust: ศัตรูเชื่องช้า 3 เทิร์น · ธารน้ำแข็งถาวรไม่ละลาย', () => {
  match.gameMode = 'ffa';
  const p = mk(freeSpot({ x: 3, y: 3 }));
  const foe = mk(freeSpot({ x: 9, y: 9 }));
  engine.setActor(p.id);
  engine.withEffectSource(p, () => Whistle.cast(p, 'diamondDust', 1));
  assert.ok(foe.statuses.slow >= 3);
  assert.ok(!p.statuses.slow);
  const n = Object.keys(match.board.ice).length;
  assert.ok(n > 20);
  for (let i = 0; i < 10; i++) require('../server/ice.js').onEndTurn();
  assert.equal(Object.keys(match.board.ice).length, n);
});

test('Judgment Bolt: ศัตรูสตั้น · พื้นไฟ = ลุกไหม้ 2 ตอนจบตา (ผู้เป่าไม่โดน)', () => {
  match.gameMode = 'ffa';
  const p = mk(freeSpot({ x: 3, y: 3 }));
  const foe = mk(freeSpot({ x: 9, y: 9 }));
  engine.setActor(p.id);
  engine.withEffectSource(p, () => Whistle.cast(p, 'judgmentBolt', 1));
  assert.ok(foe.statuses.stun >= 1);
  assert.ok(!p.statuses.stun);
  const k = Object.keys(match.board.flame)[0];
  const [x, y] = k.split(',').map(Number);
  assert.equal(engine.boardMap().special[k], 'flame');
  foe.pos = { x, y }; p.pos = null;
  assert.ok(Whistle.flameEnd(foe, { x, y }));
  assert.equal(foe.statuses.hburn > 0 || (foe.statusAmt.hburn || 0) > 0, true);
  assert.equal(Whistle.flameEnd(p, { x, y }), null);
});
