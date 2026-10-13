// เพลงแบบ intro → loop (MUSIC_SEQUENCES) + เพลงเด่น (FEATURED_MUSIC) ใน client/src/audio.js — เพลงม่านแดงของเคท (kate_storm)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function harness() {
  const instances = [];
  class Events {
    constructor() { this.listeners = new Map(); }
    addEventListener(name, fn) {
      if (!this.listeners.has(name)) this.listeners.set(name, new Set());
      this.listeners.get(name).add(fn);
    }
    removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn); }
    emit(name) { for (const fn of this.listeners.get(name) || []) fn(); }
  }
  class Audio extends Events {
    constructor(src) { super(); this.src = src; this.paused = true; this.currentTime = 0; this.duration = NaN; instances.push(this); }
    play() { this.paused = false; this.emit('playing'); return Promise.resolve(); }
    pause() { this.paused = true; this.emit('pause'); }
  }
  const window = new Events();
  const context = vm.createContext({ Audio, window, setTimeout, clearTimeout, localStorage: { getItem: () => '1', setItem() {} } });
  const source = fs.readFileSync(require.resolve('../client/src/audio.js'), 'utf8').replace(/^export /gm, '');
  vm.runInContext(source, context);
  return { api: context, instances };
}
const playing = (list) => list.filter((a) => !a.paused);

test('kate_storm plays the intro once, then the loop; a new seq restarts the intro', () => {
  const { api, instances } = harness();
  api.playMusic('kate_storm', 1);
  const intro = instances.find((a) => a.src.includes('kate_theme_intro'));
  const loop = instances.find((a) => a.src.includes('kate_theme_loop'));
  assert.ok(intro && loop);
  assert.equal(intro.paused, false);
  assert.equal(intro.loop, false);
  assert.equal(loop.loop, true);
  assert.equal(loop.paused, true);
  intro.currentTime = 200; intro.emit('ended');
  assert.equal(loop.paused, false);
  assert.equal(loop.currentTime, 0);
  // state ซ้ำ (seq เดิม) ไม่เริ่มใหม่
  loop.currentTime = 30;
  api.playMusic('kate_storm', 1);
  assert.equal(loop.paused, false);
  assert.equal(loop.currentTime, 30);
  // ร่ายใหม่ = เริ่ม intro จากต้น · loop หยุด
  api.playMusic('kate_storm', 2);
  assert.equal(loop.paused, true);
  assert.equal(intro.paused, false);
  assert.equal(intro.currentTime, 0);
  // เพลงเปลี่ยน = เหลือเพลงเดียว
  api.playMusic('new_morning');
  assert.equal(playing(instances).length, 1);
  assert.ok(playing(instances)[0].src.includes('day_4.0'));
});

test('kate_storm is featured: full music volume, not ducked by loop sfx, other effects ducked until it ends', () => {
  const { api, instances } = harness();
  const plain = api.playSfx('attack').volume;
  api.playMusic('kate_storm', 1);
  const intro = instances.find((a) => a.src.includes('kate_theme_intro'));
  assert.ok(intro.volume > 0.99, `intro volume ${intro.volume}`);
  api.startLoopSfx('attack');
  assert.ok(intro.volume > 0.99, 'loop sfx must not duck the storm theme');
  api.stopLoopSfx();
  const ducked = api.playSfx('attack').volume;
  assert.ok(Math.abs(ducked - plain * 0.55) < 1e-9, `${ducked} vs ${plain}`);
  assert.equal(api.playSfx('action_button').volume, 0.55, 'clicks stay unducked');
  const cast = api.playSfx('attack', { gain: 0.5 }).volume;
  assert.ok(Math.abs(cast - plain * 0.55 * 0.5) < 1e-9);
  api.playMusic('new_morning');
  assert.equal(api.playSfx('attack').volume, plain);
});
