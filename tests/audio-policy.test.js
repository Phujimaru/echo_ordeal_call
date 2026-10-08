const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const policy = vm.createContext({});
vm.runInContext(fs.readFileSync(require.resolve('../client/src/audioPolicy.js'), 'utf8').replace(/^export /gm, ''), policy);
const night = { gameState: 'PLAYING', cycle: 'night' };

test('music follows cutscene -> skill -> day/night priority', () => {
  const skill = { ...night, skillMusic: 'dummy', skillMusicSeq: 5 };
  assert.equal(policy.musicForState(night).name, 'new_night');
  assert.equal(policy.musicForState(skill).name, 'dummy');
  assert.equal(policy.musicForState(skill).seq, 5);
  const cutscene = { ...skill, gameState: 'CUTSCENE', cutscene: { id: 1, video: 'skill.mp4' } };
  assert.equal(policy.musicForState(cutscene).name, null);
  assert.equal(policy.musicForState(cutscene, { lowQ: true }).name, 'dummy');
});

test('voice announcements and mandatory clips stay silent in low quality; private clips do not silence outsiders', () => {
  for (const cs of [{ announce: true, voice: 'ex_k' }, { kind: 'overloadForce' }]) {
    assert.equal(policy.musicForState({ ...night, gameState: 'CUTSCENE', cutscene: cs }, { lowQ: true }).name, null);
  }
  assert.equal(policy.musicForState({ ...night, gameState: 'CUTSCENE', cutscene: null }).name, 'new_night');
});

test('attack phase music restarts per attack; lobby screens keep lobby music', () => {
  const atk = policy.musicForState({ ...night, gameState: 'ATTACK' }, { attackSeq: 3 });
  assert.equal(atk.name, 'battle_phase');
  assert.equal(atk.seq, 3);
  assert.equal(policy.musicForState({ ...night, gameState: 'ATTACKING', skillMusic: 'dummy' }).name, 'dummy');
  assert.equal(policy.musicForState({ gameState: 'PLAYING', cycle: 'day' }).name, 'new_morning');
  assert.equal(policy.musicForState(null).name, 'lobby5');
  assert.equal(policy.musicForState({ ...night, gameState: 'LOBBY', skillMusic: 'muimi' }).name, 'lobby5');
  assert.equal(policy.musicForState({ gameState: 'TEAM_MODE' }).name, 'lobby5');
  // ฉากเปิดตัวแมตช์ยังเป็นเพลงห้องรอ จนเข้าด่าน
  assert.equal(policy.musicForState({ gameState: 'CUTSCENE', journey: { area: 1, scene: { active: true, seq: 1 } } }, { intro: true }).name, 'lobby5');
});

test('round sound survives intermediate cutscenes and broadcasts; attack sound follows every attack ID', () => {
  const track = policy.createPhaseSoundTracker();
  const state = { roundNumber: 1 };
  track({ ...state, gameState: 'PLAYING' });
  assert.equal(track({ ...state, gameState: 'CUTSCENE' }).roundEnded, false);
  assert.equal(track({ ...state, gameState: 'SUMMARY' }).roundEnded, true);
  assert.equal(track({ ...state, gameState: 'SUMMARY' }).roundEnded, false);
  assert.equal(track({ ...state, gameState: 'ATTACKING', attack: { id: 1 } }).attack, true);
  assert.equal(track({ ...state, gameState: 'ATTACKING', attack: { id: 1 } }).attack, false);
  assert.equal(track({ ...state, gameState: 'ATTACKING', attack: { id: 2 } }).attack, true);
  track({ gameState: 'LOBBY' });
  track({ ...state, gameState: 'PLAYING' });
  assert.equal(track({ ...state, gameState: 'SUMMARY' }).roundEnded, true);
});

test('การเดินทาง: เพลงประจำภูมิภาคแยกกลางวัน/กลางคืน · ฉากเปลี่ยนภูมิภาคเล่นเพลงภูมิภาคใหม่ (ไม่มีเพลงแผนที่) · ช่วงโจมตียังเป็นเพลงโจมตี', () => {
  const j = (area, night, scene = null) => ({ gameState: 'PLAYING', cycle: night ? 'night' : 'day', journey: { area, night, scene } });
  assert.equal(policy.musicForState(j(3, false)).name, 'journey_3_day');
  assert.equal(policy.musicForState(j(7, true)).name, 'journey_7_night');
  const travel = { ...j(2, false, { seq: 4, active: true, mode: 'advance' }), gameState: 'CUTSCENE', cutscene: null };
  assert.deepEqual({ ...policy.musicForState(travel, { cycleSeq: 3 }) }, { name: 'journey_2_day', seq: 3 });
  for (const area of [1, 4, 7]) assert.notEqual(policy.musicForState({ ...j(area, true, { seq: 9, active: true, mode: 'advance' }), gameState: 'CUTSCENE', cutscene: null }).name, 'journey_map');
  assert.equal(policy.musicForState({ ...j(2, false), gameState: 'ATTACK' }).name, 'battle_phase');
  assert.equal(policy.musicForState({ ...j(2, false, { seq: 4, active: false }) }).name, 'journey_2_day');
});

// ทุกเฟสระหว่างแมตช์ (ฉากคัตซีน/สรุป/โจมตี) นับว่าอยู่ในแมตช์ — ตำแหน่งเพลงด่านไม่ถูกรีเซ็ต
test('เฟสระหว่างแมตช์นับว่าอยู่ในแมตช์ · ห้องรอ/จบเกมไม่นับ', async () => {
  const { isMatchPhase } = await import('../client/src/audioPolicy.js');
  for (const ph of ['CUTSCENE', 'PLAYING', 'SUMMARY', 'ATTACK', 'ATTACKING', 'TRANSITION']) assert.equal(isMatchPhase(ph), true, ph);
  for (const ph of ['LOBBY', 'TEAM_MODE', 'GAMEOVER', undefined]) assert.equal(isMatchPhase(ph), false, String(ph));
});

